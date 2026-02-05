# Message: UPDATE_ENTRY

<!-- USER-GUIDE -->
UPDATE_ENTRY updates a single field of a specific entry. This is the fastest way to change one value without sending a full entry update.

**Common Uses:**
- Quick value changes
- Toggle on/off states
- Single setpoint adjustments
- Manual/auto mode switches

<!-- TECHNICAL -->

## Overview

**Message Type:** UPDATE_ENTRY
**File Location:** `BacnetWebView.cpp` line 2167
**Purpose:** Update single entry field

## Request Format

```json
{
  "action": "UPDATE_ENTRY",
  "source": 1,
  "panelId": 0,
  "serialNumber": 12345,
  "entryType": 2,
  "index": 5,
  "field": "value",
  "value": 500,
  "objectinstance": 123456
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | String | ✅ | Must be "UPDATE_ENTRY" |
| `source` | Integer | ✅ | Message source: 0=T3000, 1=WebUI |
| `panelId` | Integer | ✅ | Panel number (0-254) |
| `serialNumber` | Integer | ✅ | Device serial number |
| `entryType` | Integer | ✅ | Type of entry |
| `index` | Integer | ✅ | Entry index |
| `field` | String | ✅ | Field name to update |
| `value` | Any | ✅ | New value |
| `objectinstance` | Integer | ✅ | BACnet object instance |

## Response Format

```json
{
  "action": "UPDATE_ENTRY_RES",
  "data": {
    "status": true
  }
}
```

## Updatable Fields by Type

### Outputs (BAC_OUT)
- `value` - Output value (0-1000)
- `auto_manual` - 0=Auto, 1=Manual
- `range` - Unit selection

### Variables (BAC_VAR)
- `value` - Variable value
- `auto_manual` - 0=Auto, 1=Manual

### Programs (BAC_PRG)
- `on_off` - 0=Off, 1=On
- `auto_manual` - 0=Auto, 1=Manual

### Controllers (BAC_PID)
- `setpoint` - Setpoint value
- `auto_manual` - 0=Auto, 1=Manual
- `action` - 0=Direct, 1=Reverse
- `proportional` - P gain
- `reset` - I gain
- `rate` - D gain

## Implementation

```cpp
case WEBVIEW_MESSAGE_TYPE::UPDATE_ENTRY:
{
    int entry_type = json.get("entryType", -1).asInt();
    int index = json.get("index", -1).asInt();
    std::string field = json.get("field", "").asString();

    switch (entry_type)
    {
        case BAC_OUT:
            if (field == "value")
            {
                int value = json.get("value", 0).asInt();
                g_Output_data[panel_id].at(index).value = value;
                WriteOutputValue(objectinstance, index, value);
            }
            break;
        // ... other types ...
    }

    tempjson["action"] = "UPDATE_ENTRY_RES";
    tempjson["data"]["status"] = true;
    break;
}
```

## Performance

| Operation | Time |
|-----------|------|
| Value update | 100-200ms |
| Mode change | 100-200ms |
| PID parameter | 150-300ms |

## Usage Examples

### Example 1: Change Output Value

```json
{
  "action": "UPDATE_ENTRY",
  "panelId": 0,
  "serialNumber": 12345,
  "entryType": 2,
  "index": 0,
  "field": "value",
  "value": 750,
  "objectinstance": 123456
}
```

### Example 2: Toggle Program

```json
{
  "action": "UPDATE_ENTRY",
  "panelId": 0,
  "serialNumber": 12345,
  "entryType": 6,
  "index": 3,
  "field": "on_off",
  "value": 1,
  "objectinstance": 123456
}
```

### Example 3: Change PID Setpoint

```json
{
  "action": "UPDATE_ENTRY",
  "panelId": 0,
  "serialNumber": 12345,
  "entryType": 11,
  "index": 0,
  "field": "setpoint",
  "value": 720,
  "objectinstance": 123456
}
```

## Error Handling

```json
{
  "action": "ERROR_RES",
  "error": {
    "code": -2,
    "message": "Invalid field",
    "details": "Field 'xyz' is not writable for entry type 2"
  }
}
```

## See Also

- [UPDATE_WEBVIEW_LIST](message-update-webview-list.md) - Bulk updates
- [GET_WEBVIEW_LIST](message-17.md) - Read values
