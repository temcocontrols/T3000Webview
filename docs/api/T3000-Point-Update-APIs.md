# T3000 Point Update API Documentation

## Overview

This document describes the RESTful API endpoints for updating Input, Output, and Variable point data in T3000 devices using the **UPDATE_WEBVIEW_LIST (Action 16)** and **UPDATE_ENTRY (Action 3)** FFI actions.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Frontend                                │
│  InputsPage.tsx / OutputsPage.tsx / VariablesPage.tsx          │
│                         ↓ HTTP PUT                              │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Rust Backend API                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ input_update_routes.rs                                  │   │
│  │ output_update_routes.rs                                 │   │
│  │ variable_update_routes.rs                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         ↓ FFI Call                              │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                   T3000.exe (C++ MFC)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ BacnetWebView_HandleWebViewMsg(action, buffer, size)   │   │
│  │   ↓                                                     │   │
│  │   case 16: UPDATE_WEBVIEW_LIST (Full record update)    │   │
│  │   case 3:  UPDATE_ENTRY (Single field update)          │   │
│  │   ↓                                                     │   │
│  │   WritePrivateData_Blocking() → Device hardware        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Base URL
```
http://localhost:3004/api/t3-device
```

---

## 1. INPUT POINT APIs

### 1.1 Update Single Input Field
**Endpoint:** `PUT /api/t3-device/inputs/:serial/:index/field/:fieldName`

**Description:** Updates a single field of an input point using UPDATE_ENTRY action (Action 3)

**Path Parameters:**
- `serial` (integer) - Device serial number (e.g., 237219)
- `index` (integer) - Input point index (0-63)
- `fieldName` (string) - Field name to update: `value`, `control`, `auto_manual`

**Request Body:**
```json
{
  "value": 25.5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Field 'value' updated successfully",
  "data": {
    "serialNumber": 237219,
    "inputIndex": 5,
    "field": "value",
    "newValue": 25.5
  }
}
```

**Example cURL:**
```bash
curl -X PUT http://localhost:3004/api/t3-device/inputs/237219/5/field/value \
  -H "Content-Type: application/json" \
  -d '{"value": 25.5}'
```

**Example TypeScript:**
```typescript
const response = await fetch(
  `/api/t3-device/inputs/${serialNumber}/${index}/field/value`,
  {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: 25.5 })
  }
);
const result = await response.json();
```

---

### 1.2 Update Full Input Record
**Endpoint:** `PUT /api/t3-device/inputs/:serial/:index`

**Description:** Updates multiple fields of an input point using UPDATE_WEBVIEW_LIST action (Action 16)

**Path Parameters:**
- `serial` (integer) - Device serial number
- `index` (integer) - Input point index (0-63)

**Request Body (all fields optional):**
```json
{
  "fullLabel": "Room Temperature Sensor",
  "label": "TEMP1",
  "value": 25.5,
  "range": 3,
  "autoManual": 0,
  "control": 1,
  "filter": 5,
  "digitalAnalog": 0,
  "calibrationSign": 0,
  "calibrationH": 0,
  "calibrationL": 0,
  "decom": 0
}
```

**Field Descriptions:**
- `fullLabel` (string, max 32 chars) - Full descriptive label
- `label` (string, max 9 chars) - Short label
- `value` (float) - Current value (will be multiplied by 1000 internally)
- `range` (integer) - Range type (0-N, see range table)
- `autoManual` (integer) - Auto(0) or Manual(1) mode
- `control` (integer) - Control setting
- `filter` (integer) - Filter value (0-31)
- `digitalAnalog` (integer) - Digital(0) or Analog(1)
- `calibrationSign` (integer) - Calibration sign
- `calibrationH` (integer) - High calibration value
- `calibrationL` (integer) - Low calibration value
- `decom` (integer) - Decommission flag

**Response:**
```json
{
  "success": true,
  "message": "Input point updated successfully",
  "data": {
    "serialNumber": 237219,
    "inputIndex": 5,
    "updatedFields": ["fullLabel", "label", "value", "range"],
    "timestamp": "2025-11-18T10:30:00Z"
  }
}
```

**Example cURL:**
```bash
curl -X PUT http://localhost:3004/api/t3-device/inputs/237219/5 \
  -H "Content-Type: application/json" \
  -d '{
    "fullLabel": "Room Temp",
    "value": 25.5,
    "range": 3
  }'
```

---

## 2. OUTPUT POINT APIs

### 2.1 Update Single Output Field
**Endpoint:** `PUT /api/t3-device/outputs/:serial/:index/field/:fieldName`

**Description:** Updates a single field of an output point using UPDATE_ENTRY action (Action 3)

**Path Parameters:**
- `serial` (integer) - Device serial number
- `index` (integer) - Output point index (0-63)
- `fieldName` (string) - Field name: `value`, `control`, `auto_manual`

**Request Body:**
```json
{
  "value": 50.0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Field 'value' updated successfully",
  "data": {
    "serialNumber": 237219,
    "outputIndex": 10,
    "field": "value",
    "newValue": 50.0
  }
}
```

---

### 2.2 Update Full Output Record
**Endpoint:** `PUT /api/t3-device/outputs/:serial/:index`

**Description:** Updates multiple fields of an output point using UPDATE_WEBVIEW_LIST action (Action 16)

**Request Body (all fields optional):**
```json
{
  "fullLabel": "Cooling Valve",
  "label": "COOL1",
  "value": 50.0,
  "range": 5,
  "autoManual": 0,
  "control": 1,
  "digitalAnalog": 1,
  "decom": 0,
  "lowVoltage": 0.0,
  "highVoltage": 10.0
}
```

**Additional Fields (vs Input):**
- `lowVoltage` (float) - Low voltage setpoint
- `highVoltage` (float) - High voltage setpoint

**Response:** Same structure as Input full update

---

## 3. VARIABLE POINT APIs

### 3.1 Update Single Variable Field
**Endpoint:** `PUT /api/t3-device/variables/:serial/:index/field/:fieldName`

**Description:** Updates a single field of a variable point using UPDATE_ENTRY action (Action 3)

**Path Parameters:**
- `serial` (integer) - Device serial number
- `index` (integer) - Variable point index (0-63)
- `fieldName` (string) - Field name: `value`, `control`, `auto_manual`

**Request Body:**
```json
{
  "value": 100.0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Field 'value' updated successfully",
  "data": {
    "serialNumber": 237219,
    "variableIndex": 15,
    "field": "value",
    "newValue": 100.0
  }
}
```

---

### 3.2 Update Full Variable Record
**Endpoint:** `PUT /api/t3-device/variables/:serial/:index`

**Description:** Updates multiple fields of a variable point using UPDATE_WEBVIEW_LIST action (Action 16)

**Request Body (all fields optional):**
```json
{
  "fullLabel": "Calculated Setpoint",
  "label": "CALC1",
  "value": 100.0,
  "range": 8,
  "autoManual": 0,
  "control": 1,
  "digitalAnalog": 0,
  "decom": 0
}
```

**Response:** Same structure as Input full update

---

## Error Responses

### 404 Not Found
```json
{
  "error": "Device with serial number 123456 not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to update field: MFC application not initialized"
}
```

### Common Error Messages:
- `"Device with serial number {serial} not found"` - Device doesn't exist in database
- `"MFC application not initialized"` - T3000.exe not ready (retry after delay)
- `"Write data timeout"` - Communication timeout with device
- `"Panel is invalid"` - Invalid panel_id
- `"Index is invalid"` - Point index out of range (0-63)

---

## Entry Type Constants

Used internally by the API:

```rust
const BAC_OUT: i32 = 0;  // Outputs
const BAC_IN: i32 = 1;   // Inputs
const BAC_VAR: i32 = 2;  // Variables
```

---

## FFI Action Types

### Action 3: UPDATE_ENTRY
- **Purpose:** Update single field
- **Performance:** Fast, lightweight
- **Use Case:** Quick value changes during editing
- **Fields Supported:** `value`, `control`, `auto_manual`

**JSON Format:**
```json
{
  "action": 3,
  "panelId": 1,
  "entryIndex": 5,
  "entryType": 1,
  "field": "value",
  "value": 25.5
}
```

### Action 16: UPDATE_WEBVIEW_LIST
- **Purpose:** Update full record with multiple fields
- **Performance:** Comprehensive, validates serial number
- **Use Case:** Save button with all modified fields
- **Fields Supported:** All point structure fields

**JSON Format:**
```json
{
  "action": 16,
  "panelId": 1,
  "serialNumber": 237219,
  "entryType": 1,
  "entryIndex": 5,
  "control": 1,
  "value": 25.5,
  "description": "Room Temperature",
  "label": "TEMP1",
  "range": 3,
  "auto_manual": 0,
  "filter": 5,
  "digital_analog": 0,
  "calibration_sign": 0,
  "calibration_h": 0,
  "calibration_l": 0,
  "decom": 0
}
```

---

## Implementation Details

### Backend Files Created:
```
api/src/t3_device/
├── input_update_routes.rs      # Input point update endpoints
├── output_update_routes.rs     # Output point update endpoints
├── variable_update_routes.rs   # Variable point update endpoints
└── mod.rs                       # Module declarations
```

### Changes to Existing Files:
1. **api/src/t3_device/t3_ffi_sync_service.rs**
   - Added `UPDATE_WEBVIEW_LIST = 16` to `WebViewMessageType` enum

2. **api/src/t3_device/routes.rs**
   - Imported new route modules
   - Merged routes into main router

3. **api/src/t3_device/mod.rs**
   - Declared new route modules

---

## Frontend Integration Example

### React Component Update (InputsPage.tsx)

```typescript
const handleEditSave = async () => {
  if (!editingCell || !selectedDevice) return;

  setIsSaving(true);

  try {
    // Option 1: Single field update (faster)
    const response = await fetch(
      `/api/t3-device/inputs/${selectedDevice.serialNumber}/${editingCell.inputIndex}/field/${editingCell.field}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: editValue })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();

    if (result.success) {
      // Update local state
      setInputs(prevInputs =>
        prevInputs.map(input =>
          input.serialNumber === selectedDevice.serialNumber &&
          input.inputIndex === editingCell.inputIndex
            ? { ...input, [editingCell.field]: editValue }
            : input
        )
      );

      setEditingCell(null);
      console.log('✅ Field updated:', result.data);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('❌ Failed to update:', error);
    alert(`Update failed: ${error.message}`);
  } finally {
    setIsSaving(false);
  }
};
```

---

## Testing

### Manual Testing with cURL

**Test Input Update:**
```bash
# Single field
curl -X PUT http://localhost:3004/api/t3-device/inputs/237219/5/field/value \
  -H "Content-Type: application/json" \
  -d '{"value": 25.5}'

# Full record
curl -X PUT http://localhost:3004/api/t3-device/inputs/237219/5 \
  -H "Content-Type: application/json" \
  -d '{
    "fullLabel": "Test Sensor",
    "value": 25.5,
    "range": 3
  }'
```

**Test Output Update:**
```bash
curl -X PUT http://localhost:3004/api/t3-device/outputs/237219/10/field/value \
  -H "Content-Type: application/json" \
  -d '{"value": 50.0}'
```

**Test Variable Update:**
```bash
curl -X PUT http://localhost:3004/api/t3-device/variables/237219/15/field/value \
  -H "Content-Type: application/json" \
  -d '{"value": 100.0}'
```

### Expected Behavior:
1. API validates serial number exists in database
2. API finds panel_id associated with serial number
3. API calls C++ FFI function with appropriate action
4. C++ writes data to device hardware
5. API returns success/error response
6. Frontend updates local state on success

---

## C++ Implementation Status

### ✅ Implemented (Action 16 - UPDATE_WEBVIEW_LIST):
- **INPUT** (BAC_IN = 1): Fully implemented in BacnetWebView.cpp line ~1607

### ⚠️ To Be Implemented:
- **OUTPUT** (BAC_OUT = 0): Needs implementation in C++ (currently has empty case)
- **VARIABLE** (BAC_VAR = 2): Needs implementation in C++ (currently has empty case)

**C++ Implementation Template:**
```cpp
case BAC_OUT:
{
    // Copy from INPUT implementation pattern
    g_Output_data[temp_panel_id].at(entry_index).control = json["control"].asInt();
    g_Output_data[temp_panel_id].at(entry_index).value = json["value"].asFloat() * 1000;
    // ... copy all fields ...

    int ret_results = WritePrivateData_Blocking(
        temp_objectinstance,
        WRITEOUTPUT_T3000,
        entry_index,
        entry_index,
        4,
        (char*)&g_Output_data[temp_panel_id].at(entry_index)
    );
    break;
}
```

---

## Performance Considerations

### Single Field Update (Action 3):
- **Latency:** ~50-100ms (device communication)
- **Best for:** Real-time value changes
- **Network:** Small payload (~100 bytes)

### Full Record Update (Action 16):
- **Latency:** ~100-200ms (more data to write)
- **Best for:** Batch field updates, save operations
- **Network:** Larger payload (~500 bytes)

### Recommendations:
- Use **Action 3** for inline editing (value field only)
- Use **Action 16** for save button (all modified fields)
- Debounce rapid successive calls (wait 300ms between edits)
- Show loading state during API calls
- Handle errors gracefully with user feedback

---

## Security Considerations

1. **Authentication:** Add JWT/session validation (not implemented yet)
2. **Authorization:** Verify user has permission to modify device
3. **Rate Limiting:** Prevent excessive API calls
4. **Input Validation:** Validate field ranges and data types
5. **Audit Logging:** Log all device modifications with user/timestamp

---

## Future Enhancements

### Batch Update API:
```
PUT /api/t3-device/inputs/:serial/batch
```

**Request:**
```json
{
  "updates": [
    { "index": 5, "value": 25.5 },
    { "index": 6, "value": 22.0 },
    { "index": 7, "fullLabel": "New Label", "value": 30.0 }
  ]
}
```

### Optimistic Updates:
- Update frontend immediately
- Rollback on API failure
- Show sync status indicator

### WebSocket Notifications:
- Broadcast updates to all connected clients
- Real-time synchronization across users

---

## Troubleshooting

### Issue: "MFC application not initialized"
**Solution:** Wait 10 seconds after T3000.exe startup, then retry

### Issue: "Device with serial number X not found"
**Solution:** Verify device exists in database, run sync if needed

### Issue: "Write data timeout"
**Solution:** Check device network connection, verify device is online

### Issue: Field not updating in UI
**Solution:** Check browser console for API errors, verify state update logic

---

## References

- **C++ Source:** `T3000-Source/T3000/BacnetWebView.cpp` (lines 1607-1689, 1689-2017)
- **Rust Backend:** `api/src/t3_device/*_update_routes.rs`
- **Frontend:** `src/t3-react/features/inputs/pages/InputsPage.tsx`
- **FFI Service:** `api/src/t3_device/t3_ffi_sync_service.rs`

---

## Version History

- **v1.0.0** (2025-11-18) - Initial implementation
  - Added INPUT update endpoints (single field + full record)
  - Added OUTPUT update endpoints (single field + full record)
  - Added VARIABLE update endpoints (single field + full record)
  - Integrated UPDATE_WEBVIEW_LIST (Action 16) FFI support
  - Created comprehensive API documentation

---

## Contact

For questions or issues, please contact the T3000 development team.
