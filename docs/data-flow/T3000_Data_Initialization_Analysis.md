# T3000_Data Initialization Analysis

**Date:** July 25, 2025
**Project:** T3000Webview
**Branch:** feature/new-ui

## Overview

This document provides a comprehensive analysis of how `T3000_Data` is initialized and populated with actual device data in the T3000Webview application. The analysis was conducted to understand why the TimeSeriesModal component was experiencing issues finding devices during initial load.

## Key Finding

**T3000_Data is NOT statically initialized** - it starts with empty arrays and gets dynamically populated from the T3000 server through WebSocket/WebView communication.

## 1. Initial Definition (Empty State)

**File:** `src/lib/T3000/Hvac/Data/T3Data.ts`
**Lines:** 621-626

```typescript
export const T3000_Data = ref({
  panelsData: [],      // Starts empty - populated by HandleGetPanelDataRes
  panelsList: [],      // Starts empty - populated by HandleGetPanelsListRes
  panelsRanges: [],    // Starts empty - populated by HandleGetPanelDataRes
  loadingPanel: null,  // Initially null - tracks current panel being loaded
});
```

## 2. Initialization Trigger Points

### A. WebSocket Connection (External Browser)
**File:** `src/lib/T3000/Hvac/Opt/Socket/WebSocketClient.ts`
**Line:** 76

```typescript
private onOpen(event: Event) {
  // ... connection setup
  this.GetPanelsList();  // 🚀 TRIGGERS THE INITIALIZATION
}
```

### B. Data Server Online Event
**File:** `src/lib/T3000/Hvac/Opt/Socket/WebSocketClient.ts`
**Line:** 855

```typescript
public HandleDataServerOnline(msgData) {
  this.GetPanelsList();  // 🚀 TRIGGERS REFRESH
}
```

### C. Manual Triggers from UI
**File:** `src/pages/HvacDrawer/IndexPage.vue`
**Lines:** 3022-3025

```typescript
// Manual refresh triggers
Hvac.WebClient.GetPanelsList();
Hvac.WsClient.GetPanelsList();
```

## 3. Complete Data Population Flow

### Step 1: Get Panels List
- **Method:** `GetPanelsList()` sends request to T3000 server
- **Message Type:** `GET_PANELS_LIST` (action: 4)

### Step 2: Handle Panels List Response
**File:** `WebSocketClient.ts` - `HandleGetPanelsListRes()`

```typescript
public HandleGetPanelsListRes(msgData) {
  // 🔄 POPULATES panelsList
  T3000_Data.value.panelsList = msgData.data;
  T3000_Data.value.loadingPanel = 0;

  // 🚀 TRIGGERS PANEL DATA LOADING
  const firstPanelId = data[0].panel_number;
  this.GetPanelData(firstPanelId);
}
```

### Step 3: Handle Panel Data Response (Critical Function)
**File:** `WebSocketClient.ts` - `HandleGetPanelDataRes()`

```typescript
public HandleGetPanelDataRes(msgData) {
  // 🔄 POPULATES panelsData (the main device data)
  T3000_Data.value.panelsData = T3000_Data.value.panelsData.filter(
    (item) => item.pid !== msgData.panel_id
  );
  T3000_Data.value.panelsData = T3000_Data.value.panelsData.concat(msgData.data);
  T3000_Data.value.panelsData.sort((a, b) => a.pid - b.pid);

  // 🔄 POPULATES panelsRanges
  T3000_Data.value.panelsRanges = T3000_Data.value.panelsRanges.concat(msgData.ranges);

  // 🔄 SEQUENTIAL LOADING of next panel
  if (more panels to load) {
    T3000_Data.value.loadingPanel++;
    this.GetPanelData(next_panel_id);
  } else {
    T3000_Data.value.loadingPanel = null; // Loading complete
  }
}
```

## 4. Data Update Mechanisms

### Real-time Updates
**File:** `WebSocketClient.ts` - `HandleGetEntriesRes()`

```typescript
public HandleGetEntriesRes(msgData) {
  // 🔄 UPDATES individual device values in real-time
  msgData.data.forEach((item) => {
    const itemIndex = T3000_Data.value.panelsData.findIndex(
      (ii) => ii.index === item.index && ii.type === item.type && ii.pid === item.pid
    );
    if (itemIndex !== -1) {
      T3000_Data.value.panelsData[itemIndex] = item;
    }
  });
}
```

## 5. Data Structure Details

### panelsData Structure
The `T3000_Data.value.panelsData` array contains device objects with this structure:

```typescript
[
  {
    id: "IN1",             // Device identifier (e.g., IN1, OUT1, OUT2)
    pid: 1,                // Panel ID
    value: 23.5,           // Current analog value
    control: 0,            // Control value (used for digital outputs)
    digital_analog: 1,     // 1=analog, 0=digital
    range: 0,              // Range identifier for analog/digital classification
    label: "Temperature Sensor",
    unit: "°C",
    index: 0,              // Device index in panel
    type: 1,               // Device type (INPUT=1, OUTPUT=0, VARIABLE=2)
    auto_manual: 0,        // Auto/manual mode
    // ... other device properties
  },
  {
    id: "OUT1",
    pid: 1,
    value: 75,
    control: 1,
    digital_analog: 0,
    range: 1,
    // ...
  }
  // ... more devices
]
```

### panelsRanges Structure
Contains range definitions for analog/digital device classification and unit conversion.

## 6. Sequential Loading Process

The system implements **sequential panel loading** to prevent race conditions:

1. **Start:** `loadingPanel = 0` (first panel)
2. **Load:** Request data for current panel
3. **Process:** Update panelsData with received devices
4. **Continue:** If more panels exist, increment `loadingPanel` and request next
5. **Complete:** Set `loadingPanel = null` when all panels loaded

## 7. Key Behavioral Patterns

### Atomic Updates
- Each panel's data is completely replaced (not merged)
- Existing data for a panel is removed before adding new data
- Prevents duplicate entries

### Data Integrity
- Panels are loaded one at a time using `loadingPanel` index
- Global state maintained in sorted order by panel ID
- UI components synchronized with latest data

### Race Condition Prevention
- Sequential loading ensures complete data before moving to next panel
- `loadingPanel` state tracks current progress
- Data readiness can be determined by checking `loadingPanel === null`

## 8. TimeSeriesModal Integration Issues

### Root Cause Analysis
The TimeSeriesModal was experiencing device lookup failures because:

1. **Timing Issue:** Modal opened before T3000_Data was fully populated
2. **Empty State:** Device lookup functions called on empty `panelsData` array
3. **No Readiness Check:** No mechanism to wait for data loading completion

### Solution Implemented
- **T3000DataManager:** Enhanced data management with readiness states
- **waitForDataReady():** Promise-based waiting for data completion
- **DataReadiness States:** NOT_READY, LOADING, READY, ERROR, TIMEOUT

## 9. Message Flow Summary

```
Application Start
      ↓
WebSocket Connection Established
      ↓
GetPanelsList() → T3000 Server
      ↓
HandleGetPanelsListRes() ← Server Response
      ↓
T3000_Data.panelsList populated
      ↓
GetPanelData(panel_0) → T3000 Server
      ↓
HandleGetPanelDataRes() ← Server Response
      ↓
T3000_Data.panelsData updated (panel_0 devices)
      ↓
Sequential loading continues for remaining panels
      ↓
loadingPanel = null (Loading Complete)
      ↓
Real-time updates via HandleGetEntriesRes()
```

## 10. File Locations Reference

### Core Files
- **T3Data.ts:** `src/lib/T3000/Hvac/Data/T3Data.ts` (lines 621-626)
- **WebSocketClient.ts:** `src/lib/T3000/Hvac/Opt/Socket/WebSocketClient.ts`
- **WebViewClient.ts:** `src/lib/T3000/Hvac/Opt/Webview2/WebViewClient.ts`

### Key Functions
- **HandleGetPanelsListRes():** Lines 728-765 (WebSocketClient.ts)
- **HandleGetPanelDataRes():** Lines 610-665 (WebSocketClient.ts)
- **HandleGetEntriesRes():** Lines 770-790 (WebSocketClient.ts)

### UI Components
- **TimeSeriesModal.vue:** `src/components/NewUI/TimeSeriesModal.vue`
- **IndexPage.vue:** `src/pages/HvacDrawer/IndexPage.vue`

## 11. Debugging Tips

### Check Data Loading State
```typescript
// Check if panels list is loaded
console.log('Panels List:', T3000_Data.value.panelsList);

// Check loading progress
console.log('Loading Panel:', T3000_Data.value.loadingPanel);

// Check device data
console.log('Panels Data Count:', T3000_Data.value.panelsData.length);

// Check if loading is complete
const isLoadingComplete = T3000_Data.value.loadingPanel === null;
```

### Verify Device Availability
```typescript
// Find specific device
const device = T3000_Data.value.panelsData.find(d => d.id === 'IN1');
console.log('IN1 Device:', device);

// Check panel devices
const panelDevices = T3000_Data.value.panelsData.filter(d => d.pid === 1);
console.log('Panel 1 devices:', panelDevices.map(d => d.id));
```

### Data Concatenation Issue Analysis

**Issue:** `T3000_Data.value.panelsData` grows beyond expected size (e.g., 328 items becomes 984+ items)

**Root Cause:** Sequential panel loading causes multiple concatenations without proper deduplication

**Investigation Results:**
- Each panel returns ~328 data items
- Multiple panels (e.g., 3 panels) = 328 × 3 = 984 total items
- Filtering by `pid` should prevent duplicates, but may not work if:
  - All panels return data with the same `pid` values
  - The filtering logic has a bug
  - Race conditions occur during sequential loading

### 🚨 CRITICAL: Data Corruption Issue in HandleGetEntriesRes

**Issue:** Detailed monitor configurations being overwritten with simplified versions

**Root Cause:** `HandleGetEntriesRes` in both `WebSocketClient.ts` and `WebViewClient.ts` completely replaces existing entries without preserving critical data

**Affected Files:**
- `src/lib/T3000/Hvac/Opt/Socket/WebSocketClient.ts` - HandleGetEntriesRes method
- `src/lib/T3000/Hvac/Opt/Webview2/WebViewClient.ts` - HandleGetEntriesRes method

**Example Corruption:**
```
BEFORE (Correct):
{
  "id": "MON1", "pid": 3, "type": "MON",
  "input": [...14 items...], "range": [...14 items...],
  "num_inputs": 14, "label": "TRL11111"
}

AFTER (Corrupted):
{
  "id": "MON1", "pid": 3, "type": "MON",
  "label": "", "status": 0
  // Missing: input, range, num_inputs arrays!
}
```

**Technical Details:**
- `HandleGetPanelDataRes` loads correct detailed monitor configs
- Later, `HandleGetEntriesRes` receives simplified updates
- Line 842: `T3000_Data.value.panelsData[itemIndex] = item;` does **complete replacement**
- Result: Critical `input` and `range` arrays are lost!

**Fix Applied:**
- Added data corruption detection in `HandleGetEntriesRes` for both WebSocketClient and WebViewClient
- Prevents replacing detailed monitor configs with simplified versions in both communication channels
- Uses smart field comparison instead of complete object replacement in both clients
- Added comprehensive logging to track all data modifications
- Implemented identical helper methods (`hasComplexDataStructures`, `getDataComplexityInfo`, `getComplexFields`) in both clients

**Smart Field Comparison Algorithm:**
```typescript
// 1. Identify critical/complex fields to protect
const criticalFields = ['input', 'range', 'num_inputs', 'an_inputs'];
const complexFields = this.getComplexFields(existingItem); // Arrays, nested objects, type-specific fields

// 2. Find common fields between existing and new objects
const existingKeys = Object.keys(existingItem);
const newKeys = Object.keys(item);
const commonFields = existingKeys.filter(key => newKeys.includes(key));

// 3. Update only safe common fields
const fieldsToUpdate = commonFields.filter(key => !complexFields.includes(key));
fieldsToUpdate.forEach(field => {
  if (existingItem[field] !== item[field]) {
    existingItem[field] = item[field]; // Safe update
  }
});
```

**Enhanced Protection Features:**
1. **Monitor-Specific Protection:** Prevents loss of `input`, `range`, `num_inputs` arrays
2. **General Complexity Detection:** Protects any arrays and nested objects
3. **Type-Specific Rules:** Different protection rules for MON, GRP, SCH, PID types
4. **Smart Field Comparison:** Only updates fields that exist in both objects
5. **Comprehensive Logging:** Tracks field updates, protection actions, complexity analysis

**Prevention Logic:**
```typescript
const existingIsDetailedMonitor = existingItem.type === 'MON' &&
  (Array.isArray(existingItem.input) || Array.isArray(existingItem.range) || existingItem.num_inputs > 0);
const newIsSimplifiedMonitor = item.type === 'MON' &&
  !Array.isArray(item.input) && !Array.isArray(item.range) && !item.num_inputs;

if (existingIsDetailedMonitor && newIsSimplifiedMonitor) {
  // Only update safe fields, preserve critical arrays
  ['status', 'value', 'label', 'description'].forEach(field => {
    if (item.hasOwnProperty(field)) existingItem[field] = item[field];
  });
}
```**Detailed Logging Added:** (See HandleGetPanelDataRes in WebSocketClient.ts)
```typescript
LogUtil.Debug('= ws: HandleGetPanelDataRes / received panel_id:', msgData?.panel_id);
LogUtil.Debug('= ws: HandleGetPanelDataRes / received data length:', msgData?.data?.length || 0);
LogUtil.Debug('= ws: HandleGetPanelDataRes / BEFORE - panelsData length:', T3000_Data.value.panelsData.length);
LogUtil.Debug('= ws: HandleGetPanelDataRes / filtering out items with pid:', msgData.panel_id, 'found:', itemsToRemove.length);
LogUtil.Debug('= ws: HandleGetPanelDataRes / AFTER filter - panelsData length:', afterFilterLength, 'removed:', beforeFilterLength - afterFilterLength);
LogUtil.Debug('= ws: HandleGetPanelDataRes / AFTER concat - panelsData length:', finalLength, 'expected:', afterFilterLength + newDataLength);
LogUtil.Debug('= ws: HandleGetPanelDataRes / PID distribution after concat:', pidCounts);
LogUtil.Debug('= ws: HandleGetPanelDataRes / WARNING: Found items with same PID after filtering!', duplicatePids);
```

**What to Look For in Logs:**
1. **Same Data Across Panels:** If different panels return the same 328 items with identical `pid` values
2. **Filter Effectiveness:** "found: 0 items to remove" on 2nd, 3rd panel means filtering isn't working
3. **PID Distribution:** Should show unique counts per panel, not duplicates
4. **Warning Messages:** Alerts when duplicate PIDs are found after filtering

**Expected vs Actual Behavior:**
```
Expected: Panel 1 (328 items, pid=1) + Panel 2 (328 items, pid=2) = 656 unique items
Actual: Panel 1 (328 items) + Panel 2 (328 items, same pid=1) = 656 items (328 duplicates)
```

**Solution Approaches:**
1. **Verify PID Logic:** Ensure different panels return data with different `pid` values
2. **Enhanced Filtering:** Use compound keys (pid + index + type) instead of just `pid`
3. **Deduplication:** Add explicit deduplication logic after concatenation
4. **Race Condition Prevention:** Ensure sequential loading completes before next panel loads

## 12. Conclusion

Understanding this initialization flow is crucial for:

1. **Component Timing:** Ensuring components wait for data before attempting device lookups
2. **Error Handling:** Providing appropriate feedback during loading states
3. **Performance:** Avoiding unnecessary API calls or re-renders
4. **Debugging:** Identifying where in the flow issues might occur

The T3000_Data system is designed to be reactive and reliable, but requires proper handling of the asynchronous loading process.

---

**Analysis conducted by:** GitHub Copilot
**Review status:** Complete
**Last updated:** July 25, 2025
