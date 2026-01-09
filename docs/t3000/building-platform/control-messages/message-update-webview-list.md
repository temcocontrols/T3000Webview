# Message: UPDATE_WEBVIEW_LIST

<!-- USER-GUIDE -->
UPDATE_WEBVIEW_LIST writes values to device entries in bulk. Use this to update multiple inputs, outputs, variables, or other entry types in a single operation.

**Common Uses:**
- Updating output values
- Setting multiple setpoints
- Batch configuration changes
- Program control (start/stop)

<!-- TECHNICAL -->

## Overview

**Message Type:** UPDATE_WEBVIEW_LIST
**File Location:** `BacnetWebView.cpp` line 1957
**Purpose:** Write multiple entry values to device

## Request Format

```json
{
  "action": 16,
  "source": 1,
  "panelId": 0,
  "serialNumber": 12345,
  "entryType": 2,
  "objectinstance": 123456,
  "data": [
    {
      "index": 0,
      "value": 500
    },
    {
      "index": 1,
      "value": 750
    }
  ]
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | Integer | ✅ | Must be 16 |
| `source` | Integer | ✅ | Message source: 0=T3000, 1=WebUI |
| `panelId` | Integer | ✅ | Panel number (0-254) |
| `serialNumber` | Integer | ✅ | Device serial number |
| `entryType` | Integer | ✅ | Type of entry to update |
| `objectinstance` | Integer | ✅ | BACnet object instance |
| `data` | Array | ✅ | Array of updates (index + values) |

### Update Data Fields

Varies by entry type. Common fields:

| Field | Type | Description |
|-------|------|-------------|
| `index` | Integer | Entry index to update |
| `value` | Number | New value |
| `auto_manual` | Integer | 0=Auto, 1=Manual |
| `range` | Integer | Unit/range selection |

## Response Format

```json
{
  "action": "UPDATE_WEBVIEW_LIST_RES",
  "data": {
    "status": true,
    "updated_count": 2,
    "failed_indices": []
  }
}
```

## Supported Entry Types

| Type | Value | Writable Fields |
|------|-------|----------------|
| BAC_OUT | 2 | value, auto_manual, range |
| BAC_VAR | 3 | value, auto_manual |
| BAC_PRG | 6 | on_off, auto_manual |
| BAC_PID | 11 | setpoint, auto_manual, proportional, reset, rate |

## Implementation

### Write Process

1. **Parse updates** - Extract index and field changes
2. **Validate range** - Check indices are valid
3. **Update global array** - Modify cached data
4. **Write to device** - Send BACnet write command
5. **Verify write** - Confirm success
6. **Update cache file** - Persist changes

### Code Pattern

```cpp
case WEBVIEW_MESSAGE_TYPE::UPDATE_WEBVIEW_LIST:
{
    int entry_type = json.get("entryType", Json::nullValue).asInt();
    Json::Value data = json["data"];

    for (int i = 0; i < data.size(); i++)
    {
        int index = data[i].get("index", -1).asInt();

        switch (entry_type)
        {
            case BAC_OUT:
                // Update output value
                if (data[i].isMember("value"))
                {
                    int value = data[i]["value"].asInt();
                    g_Output_data[panel_id].at(index).value = value;
                    WriteOutputValue(objectinstance, index, value);
                }
                break;
            // ... other types ...
        }
    }

    break;
}
```

## Error Handling

**Invalid Index:**
```json
{
  "action": "ERROR_RES",
  "error": {
    "code": -2,
    "message": "Invalid index",
    "details": "Index 70 exceeds max count 64 for outputs"
  }
}
```

**Write Timeout:**
```json
{
  "action": "ERROR_RES",
  "error": {
    "code": -4,
    "message": "Write failed",
    "details": "Device did not acknowledge write for output 5"
  }
}
```

## Performance

| Operation | Time |
|-----------|------|
| Single value | 100-300ms |
| 2-5 values | 200-500ms |
| 10+ values | 500ms-2s |

## Usage Examples

### Example 1: Update Single Output

```json
{
  "action": 18,
  "panelId": 0,
  "serialNumber": 12345,
  "entryType": 2,
  "objectinstance": 123456,
  "data": [
    {
      "index": 0,
      "value": 500,
      "auto_manual": 0
    }
  ]
}
```

### Example 2: Update Multiple Variables

```json
{
  "action": 18,
  "panelId": 0,
  "serialNumber": 12345,
  "entryType": 3,
  "objectinstance": 123456,
  "data": [
    { "index": 0, "value": 720 },
    { "index": 1, "value": 680 },
    { "index": 2, "value": 750 }
  ]
}
```

### Example 3: Start/Stop Programs

```json
{
  "action": 18,
  "panelId": 0,
  "serialNumber": 12345,
  "entryType": 6,
  "objectinstance": 123456,
  "data": [
    { "index": 0, "on_off": 1 },
    { "index": 1, "on_off": 0 }
  ]
}
```

## See Also

- [UPDATE_ENTRY](message-update-entry.md) - Update single field
- [GET_WEBVIEW_LIST](message-17.md) - Read values
- [Control Messages Index](message-index.md)
