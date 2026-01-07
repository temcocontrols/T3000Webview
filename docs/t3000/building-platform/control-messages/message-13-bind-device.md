# Message 13: BIND_DEVICE

<!-- USER-GUIDE -->
The BIND_DEVICE message associates a device with a panel. This message is currently not implemented in the C++ backend.

**Note:** This message is defined but not yet implemented.

<!-- TECHNICAL -->

## Overview

**Action:** `BIND_DEVICE` (13)
**Direction:** Frontend → Backend
**Location:** Not implemented
**Purpose:** Bind device to panel
**Status:** ⚠️ Not implemented

## Expected Request Format

**JSON Structure:**
```json
{
  "action": "BIND_DEVICE",
  "panelId": 0,
  "deviceId": 5,
  "serialNumber": 237219
}
```

## Expected Response Format

**JSON Structure:**
```json
{
  "action": "BIND_DEVICE_RES",
  "status": "success",
  "panelId": 0,
  "deviceId": 5
}
```

## Implementation Status

This message type is defined in the WEBVIEW_MESSAGE_TYPE enum but does not have a corresponding case handler in BacnetWebView.cpp HandleWebViewMsg function.

**Expected functionality:**
- Associate device with panel
- Update device binding tables
- Notify frontend of binding status

## Workaround

Device binding is currently handled through T3000's native UI. Use the tree view to associate devices with panels.

## See Also

- [GET_SELECTED_DEVICE_INFO](message-12-get-selected-device-info.md) - Get current device
- [GET_PANELS_LIST](message-get-panels-list.md) - List available panels
