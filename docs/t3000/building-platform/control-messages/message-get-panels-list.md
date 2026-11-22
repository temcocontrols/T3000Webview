# Message: GET_Panels_List

<!-- USER-GUIDE -->
GET_PANELS_LIST retrieves all online panels (devices) in the network. Use this to discover available devices and their basic information.

**Common Uses:**
- Device discovery
- Refreshing device list
- Checking device online status
- Building device selection menus

<!-- TECHNICAL -->

## Overview

**Message Type:** GET_PANELS_LIST
**File Location:** `BacnetWebView.cpp` line 2503
**Purpose:** List all online panels

## Request Format

```json
{
  "action": "GET_PANELS_LIST",
  "source": 1
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | String | Yes | Must be "GET_PANELS_LIST" |
| `source` | Integer | Yes | Message source: 0=T3000, 1=WebUI |

## Response Format

```json
{
  "action": "GET_PANELS_LIST_RES",
  "data": [
    {
      "panel_number": 0,
      "object_instance": 123456,
      "serial_number": 12345,
      "online_time": 1704672000,
      "pid": 19,
      "panel_name": "Controller 1"
    },
    {
      "panel_number": 1,
      "object_instance": 123457,
      "serial_number": 12346,
      "online_time": 1704672100,
      "pid": 19,
      "panel_name": "Controller 2"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `panel_number` | Integer | Panel ID (0-254) |
| `object_instance` | Integer | BACnet object instance |
| `serial_number` | Integer | Device serial number |
| `online_time` | Integer | Last response time (Unix timestamp) |
| `pid` | Integer | Product ID / panel type |
| `panel_name` | String | Device name |

## Implementation

```cpp
case WEBVIEW_MESSAGE_TYPE::GET_PANELS_LIST:
{
    tempjson["action"] = "GET_PANELS_LIST_RES";

    int send_index = 0;
    for (int i = 0; i < g_bacnet_panel_info.size(); i++)
    {
        int nret = LoadOnlinePanelData(g_bacnet_panel_info.at(i).panel_number);

        if (nret > 0)
        {
            tempjson["data"][send_index]["panel_number"] =
                g_bacnet_panel_info.at(i).panel_number;
            tempjson["data"][send_index]["object_instance"] =
                g_bacnet_panel_info.at(i).object_instance;
            tempjson["data"][send_index]["serial_number"] =
                g_bacnet_panel_info.at(i).nseiral_number;
            tempjson["data"][send_index]["online_time"] =
                g_bacnet_panel_info.at(i).online_time;
            tempjson["data"][send_index]["pid"] =
                g_bacnet_panel_info.at(i).npid;
            tempjson["data"][send_index]["panel_name"] =
                (char*)g_Device_Basic_Setting[...].reg.panel_name;
            send_index++;
        }
    }

    break;
}
```

## Panel Types (PID)

| PID | Device Type |
|-----|-------------|
| 19 | T3-BB |
| 213 | T3-8O |
| 220 | T3-LB |
| 316 | T3-TB |

## Online Status

**online_time values:**
- `0` - Never connected (offline)
- `> 0` - Unix timestamp of last response

**Determining if online:**
```javascript
const isOnline = (panel) => {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - panel.online_time;
  return diff < 300; // Online if responded within 5 minutes
};
```

## Performance

| Scenario | Time |
|----------|------|
| 1-5 panels | < 100ms |
| 10-20 panels | 100-300ms |
| 50+ panels | 300-500ms |

## Usage Example

```typescript
// Request panels list
const response = await fetch('/api/webview/message', {
  method: 'POST',
  body: JSON.stringify({
    action: 'GET_PANELS_LIST',
    source: 1
  })
});

const data = await response.json();

// Filter online panels
const onlinePanels = data.data.filter(panel => {
  const now = Math.floor(Date.now() / 1000);
  return (now - panel.online_time) < 300;
});

// Build device list UI
onlinePanels.forEach(panel => {
  console.log(`${panel.panel_name} (SN: ${panel.serial_number})`);
});
```

## Device-tree refresh (panel list + scan run concurrently)

The left device tree is fed by **two independent sources** that the UI runs at
the same time, then merges by serial number:

```
TreePanel mount
  ├─ fetchDevices()                 → GET /api/t3_device/devices   (DB cache, instant paint)
  ├─ loadDevicesWithSync()          → POST /api/t3000/ffi/call {action:4}   ┐
  │      └─ upsert each panel       → POST/PUT /api/t3_device/devices        │  concurrent
  ├─ scanForDevices({mode:'udp'})   → POST /api/t3_device/devices/scan-refresh ┘
  └─ fetchDevices()                 → authoritative read + tree rebuild after both
```

Toolbar ⟳ uses the same pair but adds `deep: true`:

```
handleRefresh
  ├─ loadDevicesWithSync()                       ┐ concurrent
  └─ scanForDevices({mode:'udp', deep:true})     ┘
        └─ backend: UDP pass merged → response (≈0.7 s) + detached serial/sub-port pass
              └─ GET /api/t3_device/devices/deep-scan polled every 2 s
                    └─ fetchDevices() + "Deep scan finished — N device(s) added"
```

* Page-load cost is `max(panel list, UDP scan)` (~0.7–1.3 s), not their sum; the
  first paint from the DB cache happens in milliseconds.
* The button stops spinning as soon as the LAN devices are in — the ~8 s deep
  pass no longer blocks the UI, it just appends later.
* A cold start (empty DB) shows the spinner, not "No Devices Found", until the
  first passes settle.
* `g_bacnet_panel_info` behind action 4 is filled **only** by the C++ engine's own
  `0x64/0x65` scan, so an empty panel list and an empty scan share one root cause.
  An empty panel list is therefore **normal** on an RS485 install (Tstat10/TSTAT7
  on a COM port): those devices are imported from T3000's building database
  (`ALL_NODE`) instead — see
  [LAN Scanner → T3000 device database](../device-management/lan-scanner.md#t3000-device-database-all_node).
* The panel list may **confirm** a device is online, but it never writes
  `is_online = 0`: only the discovery scan may mark a device offline, because
  the backend debounces that after `OFFLINE_GRACE_SECS` (300 s).
* The 5-minute background timer runs `fetchDevices()` **and** a quiet UDP scan —
  a DB re-read alone cannot change an online status.

## See Also

- [GET_PANEL_DATA](message-get-panel-data.md) - Load specific panel data
- [GET_ENTRIES](message-get-entries.md) - Query available entries
- [Control Messages Index](message-index.md)
