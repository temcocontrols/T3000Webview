# Message: GET_PANEL_DATA

<!-- USER-GUIDE -->
GET_PANEL_DATA loads all cached data for a specific panel. This is the fastest way to get a complete snapshot of a device's current state without querying the device directly.

**Common Uses:**
- Initial panel view load
- Refreshing entire panel data
- Offline data access

<!-- TECHNICAL -->

## Overview

**Message Type:** GET_PANEL_DATA
**File Location:** `BacnetWebView.cpp` line 893
**Purpose:** Load all cached panel data from local storage

## Request Format

```json
{
  "action": "GET_PANEL_DATA",
  "source": 1,
  "panelId": 0
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | String | ✅ | Must be "GET_PANEL_DATA" |
| `source` | Integer | ✅ | Message source: 0=T3000, 1=WebUI |
| `panelId` | Integer | ✅ | Panel number (0-254) |

## Response Format

```json
{
  "action": "GET_PANEL_DATA_RES",
  "data": {
    "panel_info": {
      "panel_number": 0,
      "serial_number": 12345,
      "object_instance": 123456,
      "panel_name": "Controller 1",
      "panel_type": 19,
      "online_time": 1704672000
    },
    "inputs": [...],
    "outputs": [...],
    "variables": [...],
    "programs": [...],
    "controllers": [...],
    "monitors": [...],
    "schedules": [...],
    "holidays": [...]
  }
}
```

## Implementation

### Code Location

```cpp
case WEBVIEW_MESSAGE_TYPE::GET_PANEL_DATA:
{
    tempjson["action"] = "GET_PANEL_DATA_RES";
    int npanel_id = json.get("panelId", Json::nullValue).asInt();

    if (npanel_id == 0)
        npanel_id = bac_gloab_panel;

    int nret = LoadOnlinePanelData(npanel_id);

    if (nret < 0)
    {
        CString temp_message;
        temp_message.Format(_T("No cached data found for panel %d"), npanel_id);
        WrapErrorMessage(builder, tempjson, outmsg, temp_message);
        break;
    }

    // Populate all data arrays...
    break;
}
```

### Data Loading

1. **Check cache** - Reads from `DatabaseBak/` folder
2. **Load file** - Deserializes saved panel data
3. **Populate arrays** - Fills global arrays (g_Input_data, g_Output_data, etc.)
4. **Build JSON** - Creates response with all data

## Performance

| Scenario | Time |
|----------|------|
| Cache hit | < 100ms |
| No cache | Returns error immediately |
| Large panel (all data) | 100-500ms |

## Error Handling

**Cache Miss:**
```json
{
  "action": "ERROR_RES",
  "error": {
    "code": -3,
    "message": "No cached data found for panel 0"
  }
}
```

## Use Cases

### Initial Load
Load all data when opening panel view for the first time.

### Offline Access
Access cached data when device is offline or unreachable.

### Quick Refresh
Get current cached state without network delay.

## See Also

- [GET_WEBVIEW_LIST](message-17.md) - Read fresh data from device
- [Control Messages Index](message-index.md)
