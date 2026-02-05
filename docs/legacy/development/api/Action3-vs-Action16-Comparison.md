# Action 3 vs Action 16: Key Differences

## Critical Finding: Different Payload Requirements

### ❌ Initial Mistake
We initially thought Action 16 could update just one field like Action 3, but **this is wrong**.

---

## Action 3: UPDATE_ENTRY (Single Field Update)

### ⚠️ CRITICAL LIMITATION: Only 3 Fields Supported!

Action 3 **ONLY** supports these fields:
- `control` (int)
- `value` (float)
- `auto_manual` (int)

**❌ NOT SUPPORTED:**
- `fullLabel` / `description` - Must use Action 16
- `label` - Must use Action 16
- `range` - Must use Action 16
- `filter` - Must use Action 16
- `calibration_*` - Must use Action 16
- Any other fields - Must use Action 16

### ✅ Payload: Only the changed field (if supported)
```json
{
  "value": 25.5  // Works for value field only
}
```

### C++ Implementation (BacnetWebView.cpp lines ~1695-1760)
```cpp
if (field.compare("control") == 0) {
    m_Input_data.at(entry_index).control = json["value"].asInt();
}
else if (field.compare("value") == 0) {
    m_Input_data.at(entry_index).value = json["value"].asFloat() * 1000;
}
else if (field.compare("auto_manual") == 0) {
    m_Input_data.at(entry_index).auto_manual = json["value"].asInt();
}
```

**Key Point:** C++ reads the current value from `m_Input_data`, updates only the specified field, then writes back.

---

## Action 16: UPDATE_WEBVIEW_LIST (Full Record Update)

### ❌ Payload: ALL fields required (not just one!)
```json
{
  "fullLabel": "New Room Temperature",  // ← Changed field
  "label": "TEMP1",                      // ← Must provide current value
  "value": 25.5,                         // ← Must provide current value
  "range": 3,                            // ← Must provide current value
  "autoManual": 0,                       // ← Must provide current value
  "control": 0,                          // ← Must provide current value
  "filter": 0,                           // ← Must provide current value
  "digitalAnalog": 1,                    // ← Must provide current value
  "calibrationSign": 0,                  // ← Must provide current value
  "calibrationH": 0,                     // ← Must provide current value
  "calibrationL": 0,                     // ← Must provide current value
  "decom": 0                             // ← Must provide current value
}
```

### C++ Implementation (BacnetWebView.cpp lines ~1628-1650)
```cpp
// C++ directly overwrites ALL fields - no read-modify-write!
g_Input_data[temp_panel_id].at(entry_index).control = json["control"].asInt();
g_Input_data[temp_panel_id].at(entry_index).value = json["value"].asFloat() * 1000;
strncpy((char *)g_Input_data[temp_panel_id].at(entry_index).description,
        json["description"].asCString(), STR_IN_DESCRIPTION_LENGTH);
strncpy((char*)g_Input_data[temp_panel_id].at(entry_index).label,
        json["label"].asCString(), STR_IN_LABEL);
g_Input_data[temp_panel_id].at(entry_index).range = json["range"].asInt();
g_Input_data[temp_panel_id].at(entry_index).auto_manual = json["auto_manual"].asInt();
// ... all other fields ...
```

**Key Point:** C++ does **NOT** read current values. It directly assigns whatever JSON values you provide. If you omit a field or pass 0/empty string, that field will be overwritten with that value!

---

## The Problem

### ❌ Wrong Approach (What we did initially)
```typescript
// Only sending the changed field - OTHER FIELDS WILL BE LOST!
const payload = {
  fullLabel: "New Label"  // ← Other fields become 0 or empty!
};
```

### ✅ Correct Approach (What we fixed)
```typescript
// Must send ALL fields with current values + the one changed field
const currentInput = inputs.find(input =>
  input.serialNumber === serialNumber &&
  input.inputIndex === inputIndex
);

const payload = {
  fullLabel: newLabel,                              // ← New value
  label: currentInput.label || '',                  // ← Keep current
  value: parseFloat(currentInput.fValue || '0'),    // ← Keep current
  range: parseInt(currentInput.range || '0'),       // ← Keep current
  autoManual: parseInt(currentInput.autoManual || '0'), // ← Keep current
  control: 0,                                       // ← Default (not in UI)
  filter: parseInt(currentInput.filterField || '0'), // ← Keep current
  digitalAnalog: currentInput.digitalAnalog === '0' ? 0 : 1, // ← Keep current
  calibrationSign: parseInt(currentInput.sign || '0'), // ← Keep current
  calibrationH: 0,                                  // ← Default (not in UI)
  calibrationL: 0,                                  // ← Default (not in UI)
  decom: 0,                                         // ← Default (not in UI)
};
```

---

## When to Use Each Action

### Use Action 3 (UPDATE_ENTRY) when:
- ✅ Updating **ONLY** `control`, `value`, or `auto_manual` fields
- ✅ Inline editing of value or auto/manual toggle
- ✅ Quick numeric value updates
- ⚠️ **LIMITED: Only 3 fields supported!**

**Pros:**
- Simple payload
- Safe (won't overwrite other fields)
- Faster (less data transfer)

**Cons:**
- Can only update one field at a time
- Need multiple calls for multiple field changes

---

### Use Action 16 (UPDATE_WEBVIEW_LIST) when:
- ✅ Updating **multiple fields** at once (e.g., save button with many changes)
- ✅ You have all current field values available
- ✅ Bulk update scenario
- ⚠️ **Be careful: Must provide ALL fields!**

**Pros:**
- Can update multiple fields atomically
- Single API call for complex updates
- Validates serial number

**Cons:**
- ⚠️ **Dangerous:** Will overwrite all fields with provided values
- Requires fetching current data first
- More complex payload

---

## Frontend Implementation Pattern

### Pattern 1: Action 3 (Recommended for single field edits)
```typescript
const updateSingleField = async (
  serialNumber: number,
  inputIndex: string,
  fieldName: string,
  newValue: any
) => {
  const response = await fetch(
    `/api/t3-device/inputs/${serialNumber}/${inputIndex}/field/${fieldName}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newValue })  // ← Simple!
    }
  );
  return response.json();
};
```

### Pattern 2: Action 16 (Use only when updating multiple fields)
```typescript
const updateMultipleFields = async (
  serialNumber: number,
  inputIndex: string,
  currentInput: InputPoint,
  changes: Partial<InputPoint>
) => {
  // Merge current values with changes
  const payload = {
    fullLabel: changes.fullLabel ?? currentInput.fullLabel ?? '',
    label: changes.label ?? currentInput.label ?? '',
    value: changes.value ?? parseFloat(currentInput.fValue || '0'),
    range: changes.range ?? parseInt(currentInput.range || '0'),
    autoManual: changes.autoManual ?? parseInt(currentInput.autoManual || '0'),
    // ... ALL other fields must be provided!
  };

  const response = await fetch(
    `/api/t3-device/inputs/${serialNumber}/${inputIndex}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)  // ← Complex but complete!
    }
  );
  return response.json();
};
```

---

## Backend Consideration

### Should we fix the Rust backend?

**Option A: Keep current behavior (match C++ exactly)**
- ✅ Maintains compatibility with C++ code
- ❌ Frontend must provide all fields

**Option B: Add read-modify-write to Rust (easier for frontend)**
```rust
// Read current data first
let current_input = fetch_input_from_device(panel_id, index).await?;

// Merge with provided fields
let input_json = json!({
    "action": 16,
    "fullLabel": payload.full_label.unwrap_or(current_input.description),
    "label": payload.label.unwrap_or(current_input.label),
    "value": payload.value.unwrap_or(current_input.value),
    // ... merge all fields
});
```

**Recommendation:** Keep Option A for now to match C++ behavior exactly. Frontend should handle this complexity.

---

## Testing Checklist

- [ ] **Action 3 test:** Update only `fullLabel`, verify other fields unchanged
- [ ] **Action 16 test (correct):** Update `fullLabel` with all fields, verify success
- [ ] **Action 16 test (wrong):** Update only `fullLabel` without other fields, verify data corruption
- [ ] **Comparison test:** Both actions should produce same result when properly used

---

## Summary

| Aspect | Action 3 (UPDATE_ENTRY) | Action 16 (UPDATE_WEBVIEW_LIST) |
|--------|------------------------|--------------------------------|
| **Purpose** | Single field update | Full record update |
| **Supported Fields** | ⚠️ **Only 3:** control, value, auto_manual | ✅ All 12+ fields |
| **Payload** | `{ "value": newValue }` | All 12+ fields required |
| **C++ Behavior** | Read-modify-write | Direct overwrite |
| **Safety** | ✅ Safe | ⚠️ Dangerous if misused |
| **Use Case** | Value/control updates only | Label, range, and all updates |
| **Recommended** | ✅ For value/control only | ✅ For fullLabel, label, range, etc. |

**The key insight:** Action 16 is **not a superset** of Action 3. It's a different operation with different semantics!
