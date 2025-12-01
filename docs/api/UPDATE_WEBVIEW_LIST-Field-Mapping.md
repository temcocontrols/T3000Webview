# UPDATE_WEBVIEW_LIST (Action 16) - Field Mapping Comparison

## C++ Expected Fields vs Our Payload

### Required by C++ (BacnetWebView.cpp lines 1635-1647)

```cpp
// C++ reads these fields from JSON:
g_Input_data[temp_panel_id].at(entry_index).control = json["control"].asInt();
g_Input_data[temp_panel_id].at(entry_index).value = json["value"].asFloat() * 1000;  // ⚠️ Multiplied by 1000!
strncpy((char *)g_Input_data[temp_panel_id].at(entry_index).description, json["description"].asCString(), STR_IN_DESCRIPTION_LENGTH);
strncpy((char*)g_Input_data[temp_panel_id].at(entry_index).label, json["label"].asCString(), STR_IN_LABEL);
g_Input_data[temp_panel_id].at(entry_index).range = json["range"].asInt();
g_Input_data[temp_panel_id].at(entry_index).auto_manual = json["auto_manual"].asInt();
g_Input_data[temp_panel_id].at(entry_index).filter = json["filter"].asInt();
g_Input_data[temp_panel_id].at(entry_index).control = json["control"].asInt();  // ⚠️ Set twice!
g_Input_data[temp_panel_id].at(entry_index).digital_analog = json["digital_analog"].asInt();
g_Input_data[temp_panel_id].at(entry_index).calibration_sign = json["calibration_sign"].asInt();
g_Input_data[temp_panel_id].at(entry_index).calibration_h = json["calibration_h"].asInt();
g_Input_data[temp_panel_id].at(entry_index).calibration_l = json["calibration_l"].asInt();
g_Input_data[temp_panel_id].at(entry_index).decom = json["decom"].asInt();
```

### C++ Field Mapping Table

| C++ Field Name | JSON Key Expected | Type | Notes |
|----------------|------------------|------|-------|
| `control` | `"control"` | int | Set twice in C++ (probably a bug) |
| `value` | `"value"` | float | ⚠️ **Multiplied by 1000 in C++!** |
| `description` | `"description"` | string | Full label (long name) |
| `label` | `"label"` | string | Short label |
| `range` | `"range"` | int | Range type |
| `auto_manual` | `"auto_manual"` | int | Auto/Manual mode |
| `filter` | `"filter"` | int | Filter value |
| `digital_analog` | `"digital_analog"` | int | 0=Digital, 1=Analog |
| `calibration_sign` | `"calibration_sign"` | int | Calibration sign |
| `calibration_h` | `"calibration_h"` | int | Calibration high |
| `calibration_l` | `"calibration_l"` | int | Calibration low |
| `decom` | `"decom"` | int | Decom value |

---

## Our Rust API Payload (input_update_routes.rs)

```rust
let input_json = json!({
    "action": 16,                                      // ✅ Correct
    "panelId": panel_id,                               // ✅ Correct
    "serialNumber": serial,                            // ✅ Correct
    "entryType": BAC_IN,  // 1 = INPUT                 // ✅ Correct
    "entryIndex": index,                               // ✅ Correct
    "control": payload.control.unwrap_or(0),           // ✅ Matches "control"
    "value": payload.value.unwrap_or(0.0),             // ✅ Matches "value"
    "description": payload.full_label.unwrap_or_default(), // ✅ Matches "description"
    "label": payload.label.unwrap_or_default(),        // ✅ Matches "label"
    "range": payload.range.unwrap_or(0),               // ✅ Matches "range"
    "auto_manual": payload.auto_manual.unwrap_or(0),   // ✅ Matches "auto_manual"
    "filter": payload.filter.unwrap_or(0),             // ✅ Matches "filter"
    "digital_analog": payload.digital_analog.unwrap_or(0), // ✅ Matches "digital_analog"
    "calibration_sign": payload.calibration_sign.unwrap_or(0), // ✅ Matches "calibration_sign"
    "calibration_h": payload.calibration_h.unwrap_or(0),   // ✅ Matches "calibration_h"
    "calibration_l": payload.calibration_l.unwrap_or(0),   // ✅ Matches "calibration_l"
    "decom": payload.decom.unwrap_or(0),               // ✅ Matches "decom"
});
```

### ✅ All Fields Match Correctly!

---

## Frontend Payload (InputsPage.tsx)

### Frontend JSON Key Naming (camelCase)
```typescript
const payload = {
    fullLabel: newLabel,           // → Rust converts to "description"
    label: currentInput.label,     // → Rust uses as "label"
    value: parseFloat(value),      // → Rust uses as "value"
    range: parseInt(range),        // → Rust uses as "range"
    autoManual: parseInt(autoMan), // → Rust converts to "auto_manual"
    control: 0,                    // → Rust uses as "control"
    filter: parseInt(filter),      // → Rust uses as "filter"
    digitalAnalog: 0 or 1,         // → Rust converts to "digital_analog"
    calibrationSign: parseInt(),   // → Rust converts to "calibration_sign"
    calibrationH: 0,               // → Rust converts to "calibration_h"
    calibrationL: 0,               // → Rust converts to "calibration_l"
    decom: 0,                      // → Rust uses as "decom"
};
```

### Rust Struct Definition
```rust
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]  // ← Converts camelCase to snake_case
pub struct UpdateInputFullRequest {
    pub full_label: Option<String>,      // fullLabel → full_label → "description"
    pub label: Option<String>,           // label → label
    pub value: Option<f32>,              // value → value
    pub range: Option<i32>,              // range → range
    pub auto_manual: Option<i32>,        // autoManual → auto_manual
    pub control: Option<i32>,            // control → control
    pub filter: Option<i32>,             // filter → filter
    pub digital_analog: Option<i32>,     // digitalAnalog → digital_analog
    pub calibration_sign: Option<i32>,   // calibrationSign → calibration_sign
    pub calibration_h: Option<i32>,      // calibrationH → calibration_h
    pub calibration_l: Option<i32>,      // calibrationL → calibration_l
    pub decom: Option<i32>,              // decom → decom
}
```

---

## Complete Data Flow

```
Frontend (TypeScript)          Rust API                    C++
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{                          →   UpdateInputFullRequest  →   JSON to C++
  fullLabel: "Room Temp"       .full_label             →   "description"
  label: "TEMP1"               .label                  →   "label"
  value: 25.5                  .value                  →   "value" * 1000
  range: 3                     .range                  →   "range"
  autoManual: 0                .auto_manual            →   "auto_manual"
  control: 0                   .control                →   "control"
  filter: 5                    .filter                 →   "filter"
  digitalAnalog: 1             .digital_analog         →   "digital_analog"
  calibrationSign: 0           .calibration_sign       →   "calibration_sign"
  calibrationH: 0              .calibration_h          →   "calibration_h"
  calibrationL: 0              .calibration_l          →   "calibration_l"
  decom: 0                     .decom                  →   "decom"
}
```

---

## Field Comparison Summary

| Frontend Field | Rust Struct Field | JSON to C++ | C++ Field | Match Status |
|----------------|------------------|-------------|-----------|--------------|
| `fullLabel` | `full_label` | `"description"` | `description` | ✅ Correct |
| `label` | `label` | `"label"` | `label` | ✅ Correct |
| `value` | `value` | `"value"` | `value` | ✅ Correct |
| `range` | `range` | `"range"` | `range` | ✅ Correct |
| `autoManual` | `auto_manual` | `"auto_manual"` | `auto_manual` | ✅ Correct |
| `control` | `control` | `"control"` | `control` | ✅ Correct |
| `filter` | `filter` | `"filter"` | `filter` | ✅ Correct |
| `digitalAnalog` | `digital_analog` | `"digital_analog"` | `digital_analog` | ✅ Correct |
| `calibrationSign` | `calibration_sign` | `"calibration_sign"` | `calibration_sign` | ✅ Correct |
| `calibrationH` | `calibration_h` | `"calibration_h"` | `calibration_h` | ✅ Correct |
| `calibrationL` | `calibration_l` | `"calibration_l"` | `calibration_l` | ✅ Correct |
| `decom` | `decom` | `"decom"` | `decom` | ✅ Correct |

---

## Important Notes

### ⚠️ Value Field Special Handling

C++ multiplies the value by 1000:
```cpp
g_Input_data[temp_panel_id].at(entry_index).value = json["value"].asFloat() * 1000;
```

**This means:**
- Frontend sends: `25.5` (degrees)
- C++ receives: `25.5`
- C++ stores: `25500` (value * 1000)

**Why?** The device stores values as integers with implicit decimal places for precision.

### ✅ All Required Metadata Fields Present

```rust
"action": 16,           // ✅ Identifies UPDATE_WEBVIEW_LIST
"panelId": panel_id,    // ✅ Required for device lookup
"serialNumber": serial, // ✅ Used for validation
"entryType": BAC_IN,    // ✅ 1 = Input, 0 = Output, 2 = Variable
"entryIndex": index,    // ✅ Which point to update (0-based)
```

---

## Validation

### ✅ Frontend → Rust: Correct
- TypeScript camelCase → Rust snake_case via `#[serde(rename_all = "camelCase")]`
- All fields properly mapped

### ✅ Rust → C++: Correct
- Rust uses exact JSON keys expected by C++
- `full_label` → `"description"` (correct mapping)
- `auto_manual` → `"auto_manual"` (correct underscore format)
- All 12 fields present

### ✅ C++ Processing: Correct
- All fields are read from JSON
- Fields are assigned to global data structure
- Data is written to device via `WritePrivateData_Blocking()`

---

## Test Payload Example

### Frontend Call:
```typescript
PUT /api/t3-device/inputs/237219/5
Content-Type: application/json

{
  "fullLabel": "Room Temperature Sensor",
  "label": "TEMP1",
  "value": 25.5,
  "range": 3,
  "autoManual": 0,
  "control": 0,
  "filter": 5,
  "digitalAnalog": 1,
  "calibrationSign": 0,
  "calibrationH": 0,
  "calibrationL": 0,
  "decom": 0
}
```

### Rust Receives:
```rust
UpdateInputFullRequest {
    full_label: Some("Room Temperature Sensor"),
    label: Some("TEMP1"),
    value: Some(25.5),
    range: Some(3),
    auto_manual: Some(0),
    control: Some(0),
    filter: Some(5),
    digital_analog: Some(1),
    calibration_sign: Some(0),
    calibration_h: Some(0),
    calibration_l: Some(0),
    decom: Some(0)
}
```

### Rust Sends to C++:
```json
{
  "action": 16,
  "panelId": 1,
  "serialNumber": 237219,
  "entryType": 1,
  "entryIndex": 5,
  "control": 0,
  "value": 25.5,
  "description": "Room Temperature Sensor",
  "label": "TEMP1",
  "range": 3,
  "auto_manual": 0,
  "filter": 5,
  "digital_analog": 1,
  "calibration_sign": 0,
  "calibration_h": 0,
  "calibration_l": 0,
  "decom": 0
}
```

### C++ Processes:
```cpp
g_Input_data[1].at(5).control = 0;
g_Input_data[1].at(5).value = 25500;  // 25.5 * 1000
strcpy(g_Input_data[1].at(5).description, "Room Temperature Sensor");
strcpy(g_Input_data[1].at(5).label, "TEMP1");
g_Input_data[1].at(5).range = 3;
g_Input_data[1].at(5).auto_manual = 0;
g_Input_data[1].at(5).filter = 5;
g_Input_data[1].at(5).digital_analog = 1;
g_Input_data[1].at(5).calibration_sign = 0;
g_Input_data[1].at(5).calibration_h = 0;
g_Input_data[1].at(5).calibration_l = 0;
g_Input_data[1].at(5).decom = 0;
```

---

## Conclusion

✅ **All fields are correctly mapped through the entire chain:**
- Frontend camelCase → Rust snake_case → C++ underscore format
- Field count: **12 data fields + 5 metadata fields** = 17 total
- All C++ expected fields are present
- No missing fields
- No extra fields

**The implementation is CORRECT and ready for testing!**
