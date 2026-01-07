# Control Messages Index

<!-- USER-GUIDE -->
Control messages are how the web interface communicates with the T3000 platform. Each message performs a specific operation like reading device data, updating values, or managing graphics.

**Quick Reference:** Jump to any message documentation below.

<!-- TECHNICAL -->

## All Control Messages

| Message | Type | Purpose | Common Use |
|---------|------|---------|------------|
| [GET_PANEL_DATA](message-get-panel-data.md) | Data Retrieval | Load all cached data for a panel | Initial panel view load |
| [GET_INITIAL_DATA](message-get-initial-data.md) | Graphics | Load graphics screen data | Opening graphics editor |
| [LOAD_GRAPHIC_ENTRY](message-load-graphic-entry.md) | Graphics | Load specific graphic entry | Graphics screen display |
| [SAVE_GRAPHIC_DATA](message-save-graphic-data.md) | Graphics | Save graphics screen changes | Saving graphics edits |
| [GET_WEBVIEW_LIST](message-17.md) | Data Retrieval | Read specific entry type with range | Loading inputs, outputs, programs, etc. |
| [UPDATE_WEBVIEW_LIST](message-update-webview-list.md) | Data Update | Write values to device entries | Updating setpoints, outputs, variables |
| [UPDATE_ENTRY](message-update-entry.md) | Data Update | Update single entry field | Quick field update |
| [GET_PANELS_LIST](message-get-panels-list.md) | Discovery | Get all online panels | Device list refresh |
| [GET_ENTRIES](message-get-entries.md) | Data Retrieval | Get multiple specific entries | Batch data retrieval |

## Messages by Category

### Data Retrieval Messages

**Purpose:** Reading device data and configuration

- **[GET_PANEL_DATA](message-get-panel-data.md)** - Load all cached panel data
- **[GET_WEBVIEW_LIST](message-17.md)** - Read specific entry types (inputs, outputs, programs, etc.)
- **[GET_ENTRIES](message-get-entries.md)** - Read multiple specific entries by index

**Typical Flow:**
1. Frontend requests data via Rust API
2. C++ checks cache first
3. If cache miss, reads from device via BACnet
4. Returns JSON response

### Data Update Messages

**Purpose:** Writing values and configurations to devices

- **[UPDATE_WEBVIEW_LIST](message-update-webview-list.md)** - Update multiple entries in bulk
- **[UPDATE_ENTRY](message-update-entry.md)** - Update single entry field

**Typical Flow:**
1. Frontend sends new values
2. C++ validates data
3. Writes to device via BACnet
4. Updates local cache
5. Returns success/failure

### Graphics Messages

**Purpose:** Managing graphics screens

- **[GET_INITIAL_DATA](message-get-initial-data.md)** - Initial graphics screen load
- **[LOAD_GRAPHIC_ENTRY](message-load-graphic-entry.md)** - Load specific graphics entry
- **[SAVE_GRAPHIC_DATA](message-save-graphic-data.md)** - Save graphics changes

**Graphics Storage:**
- Stored as ZIP files in `DatabaseImages/` folder
- Contains PNG images and metadata
- Linked to device panel and entry index

### Discovery Messages

**Purpose:** Finding devices and panels

- **[GET_PANELS_LIST](message-get-panels-list.md)** - List all online panels
- **[GET_ENTRIES](message-get-entries.md)** - Query available entries

## Message Format

### Request Structure

```json
{
  "action": 17,  // Message type number
  "source": 1,   // Source: 0=T3000, 1=WebUI
  "panelId": 0,
  "serialNumber": 12345,
  // ... message-specific parameters ...
}
```

### Response Structure

```json
{
  "action": "MESSAGE_TYPE_RES",  // Response action name
  "data": {
    // ... response data ...
  }
}
```

### Error Response

```json
{
  "action": "ERROR_RES",
  "error": {
    "code": -1,
    "message": "Error description",
    "details": "Additional context"
  }
}
```

## Implementation Location

**File:** `T3000-Source/T3000/BacnetWebView.cpp`

**Main Handler Function:**
```cpp
void CBacnetWebView::HandleWebViewMsg(const CString& receivedMessage)
{
    // Parse JSON
    Json::Value json;
    // ...

    int action = json.get("action", Json::nullValue).asInt();

    switch (action)
    {
        case WEBVIEW_MESSAGE_TYPE::GET_PANEL_DATA:
            // Handle message...
            break;
        case WEBVIEW_MESSAGE_TYPE::GET_WEBVIEW_LIST:
            // Handle message...
            break;
        // ... more cases ...
    }
}
```

## Entry Types Reference

Used with GET_WEBVIEW_LIST and UPDATE_WEBVIEW_LIST:

| Type | Value | Name | Max Count | Description |
|------|-------|------|-----------|-------------|
| BAC_IN | 1 | Inputs | 64 | Analog/digital inputs |
| BAC_OUT | 2 | Outputs | 64 | Analog/digital outputs |
| BAC_VAR | 3 | Variables | 64 | User variables |
| BAC_PRG | 6 | Programs | 16 | Control programs |
| BAC_TL | 10 | Trendlogs/Monitors | 12 | Data logging |
| BAC_PID | 11 | Controllers | 16 | PID control loops |
| BAC_SCH | 12 | Schedules | 32 | Weekly schedules |
| BAC_HOL | 13 | Holidays | 32 | Annual holidays |
| BAC_GRP | 23 | Graphics | 50 | Graphics screens |
| BAC_ALM | 9 | Alarms | 64 | Alarm points |

## Common Parameters

### panelId
- Type: Integer
- Range: 0-254
- Description: Device panel number in network

### serialNumber
- Type: Integer (unsigned)
- Range: 0-4294967295
- Description: Device unique serial number

### objectinstance
- Type: Integer
- Range: 0-4194303
- Description: BACnet object instance ID

### entryType
- Type: Integer
- Range: 1-23
- Description: Type of entry (see Entry Types table)

### entryIndexStart / entryIndexEnd
- Type: Integer
- Range: 0 to (maxCount - 1)
- Description: Range of entries to read/write

## Response Times

Typical response times:

- **Cached data:** < 50ms
- **Fresh read (1-10 items):** 200-500ms
- **Fresh read (full range):** 1-5 seconds
- **Bulk update:** 500ms-3 seconds

## Error Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| -1 | Read timeout | Device offline or not responding |
| -2 | Invalid parameter | Out of range index or invalid type |
| -3 | Cache miss | No cached data available |
| -4 | Write failed | Device rejected write command |
| -5 | Object mismatch | Wrong device responded |

## See Also

- [Platform Overview →](../overview.md)
- [BACnet Commands →](../bacnet-commands.md)
- [Data Structures →](../data-structures.md)
