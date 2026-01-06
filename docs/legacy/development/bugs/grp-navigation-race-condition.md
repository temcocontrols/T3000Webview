# GRP Navigation Auto-Save Race Condition

## **Bug Summary**
Auto-save was saving data to the wrong location during GRP (Group) navigation due to a race condition between `grpSwitch` array updates and `appState` loading.

## **Problem Description**

### **Symptoms**
- User edits data on Item 1 (Panel A, ViewItem 5)
- User clicks GRP switch to navigate to Item 2 (Panel B, ViewItem 10)
- Auto-save triggers before Item 2 data loads
- Item 1's data gets saved to Item 2's location
- **Result**: Data corruption - Item 1 data overwrites Item 2 data

### **Root Cause**
The issue stems from different update timings between two critical components:

1. **`grpSwitch` Array (LocalStorage)**:
   - Updates **immediately** when user clicks GRP navigation
   - Represents navigation **intent/history**, not current content
   - Functions: `SaveGrpSwitch()`, `LoadGrpSwitch()`, `RemoveLatestGrpSwitch()`

2. **`appState` Content**:
   - Updates **asynchronously** from T3000 server response
   - Contains the **actual graphic data** being displayed
   - Updated via: `HandleLoadGraphicEntryRes()`, `HandleGetInitialDataRes()`

### **Race Condition Timeline**
```
1. User on Item 1 (Panel A, ViewItem 5) - appState contains Item 1 data
2. User clicks GRP → Item 2 (Panel B, ViewItem 10)
3. SaveGrpSwitch() immediately adds {panelId: B, entryIndex: 10} to array
4. LoadGraphicEntry message sent to T3000
5. ⚠️  Auto-save triggers (15s interval)
6. LoadGrpSwitch() returns {panelId: B, entryIndex: 10}
7. ❌ Item 1 data saved to Panel B, ViewItem 10 (WRONG!)
8. T3000 responds with Item 2 data
9. appState updated with Item 2 data (TOO LATE)
```

## **Technical Details**

### **GrpSwitch Array Structure**
```typescript
// localStorage key: 't3.grpswitch'
// Array structure (stack-based):
[
  {panelId: 1, entryIndex: 5},   // First navigation
  {panelId: 2, entryIndex: 10}   // Latest navigation (LoadGrpSwitch returns this)
]
```

### **Key Functions**
- **`SaveGrpSwitch()`**: Pushes new entry to array (immediate)
- **`LoadGrpSwitch()`**: Returns latest array entry or null
- **`RemoveLatestGrpSwitch()`**: Pops latest entry (for back navigation)
- **`ClearGrpSwitch()`**: Removes localStorage key (page reload)

### **Auto-Save Logic (Original)**
```typescript
// PROBLEMATIC CODE
saveToT3000() {
  const grpSwitch = DataOpt.LoadGrpSwitch(); // Gets latest navigation target

  if (grpSwitch?.panelId && grpSwitch?.entryIndex !== undefined) {
    panelId = grpSwitch.panelId;      // Panel B
    graphicId = grpSwitch.entryIndex + 1;  // ViewItem 10
    // ❌ Saves Item 1 data to Item 2 location!
  }
}
```

## **Solution Implemented**

### **Conservative Approach: Block Saves During Navigation**
The solution prevents all saves (auto and manual) when `grpSwitch` entries exist, ensuring saves only occur when state is consistent.

```typescript
saveToT3000(isAutoSave = false) {
  const grpSwitch = DataOpt.LoadGrpSwitch();

  // Check if currently loading data
  const loadingInitialData = globalMsg.value.find((msg) => msg.msgType === "get_initial_data");
  const loadingGraphicEntry = globalMsg.value.find((msg) => msg.msgType === "load_graphic_entry");

  if (loadingInitialData || loadingGraphicEntry) {
    LogUtil.Debug('Currently loading data, skip save to prevent race condition');
    return;
  }

  // Block all saves during GRP navigation
  if (grpSwitch) {
    if (isAutoSave) {
      LogUtil.Debug('Auto-save skipped during GRP navigation');
    } else {
      LogUtil.Debug('Manual save skipped during GRP navigation to prevent race condition');
    }
    return;
  }

  // Safe to save - no navigation in progress
  // Save to current device location only
}
```

### **Safe Save Logic**
```typescript
// Built-in Edge
Hvac.WebClient.SaveGraphicData(null, null, data); // Uses current device

// WebSocket
const currentDevice = Hvac.DeviceOpt.getCurrentDevice();
Hvac.WsClient.SaveGraphic(currentDevice.deviceId, currentDevice.graphic, data);
```

## **Solution Benefits**

✅ **Eliminates Race Condition**: No saves during uncertain state
✅ **Data Integrity**: Only saves when appState and location are consistent
✅ **Simple Logic**: Clear rule - grpSwitch exists = no saves
✅ **Auto-Recovery**: Saves resume once navigation completes
✅ **Backwards Compatible**: No changes to existing data structures

## **Behavior After Fix**

### **Normal Operation**
- grpSwitch: `null` → Saves proceed normally

### **During GRP Navigation**
- grpSwitch: `{panelId: B, entryIndex: 10}` → All saves blocked

### **After Navigation Completes**
- grpSwitch: `null` (cleared by response handler) → Saves resume

### **Page Reload**
- `clearGrpSwitch()` called in `initPage()` → grpSwitch cleared → Normal operation

## **Test Scenarios**

| Scenario | grpSwitch State | Save Behavior | Expected Result |
|----------|----------------|---------------|-----------------|
| Normal editing | `null` | ✅ Proceeds | Saves to current device |
| User clicks GRP | `{panelId: 2, entryIndex: 5}` | ❌ Blocked | No save corruption |
| Navigation complete | `null` | ✅ Resumes | Saves to current device |
| Page reload | `null` (cleared) | ✅ Normal | Clean state |

## **Files Modified**

### **Core Fix**
- `src/lib/T3000/Hvac/Opt/Common/IdxPage.ts`
  - Modified `saveToT3000()` method
  - Added `isAutoSave` parameter to `save()` method
  - Updated auto-save interval call

### **Debug Logging**
- Added comprehensive logging to trace save decisions
- Logs show which path is taken (auto-save, manual save, blocked, etc.)

## **Alternative Solutions Considered**

### **1. Metadata Tracking (Rejected)**
- Add `_sourceMetadata` to `appState` to track origin
- **Problem**: Not always available, adds complexity

### **2. Timing Delays (Rejected)**
- Delay auto-save after GRP navigation
- **Problem**: Unreliable timing, doesn't solve root cause

### **3. Smart grpSwitch Validation (Rejected)**
- Try to validate if grpSwitch matches current appState
- **Problem**: No reliable way to determine correlation

## **Prevention Guidelines**

1. **Never use navigation state for data operations**
   - grpSwitch represents intent, not current content
   - Always validate state consistency before operations

2. **Implement loading state checks**
   - Check `globalMsg` for active loading operations
   - Skip operations during uncertain states

3. **Prefer conservative approaches**
   - Block operations during transitions
   - Resume once state is stable

## **Related Components**

- **DataOpt.ts**: grpSwitch array management
- **WebViewClient.ts**: Built-in edge message handling
- **WebSocketClient.ts**: External browser message handling
- **IndexPage.vue**: GRP navigation UI triggers

## **Resolution Status**
✅ **RESOLVED** - Conservative blocking approach implemented and tested

---
*Created: January 2025*
*Last Updated: January 2025*
*Severity: High (Data Corruption)*
*Status: Fixed*
