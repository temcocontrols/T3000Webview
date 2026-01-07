# Message 5: GET_PANEL_RANGE_INFO

<!-- USER-GUIDE -->
The GET_PANEL_RANGE_INFO message retrieves panel capability and range information. This message helps determine what features a panel supports.

**Note:** This message is currently not implemented in the C++ backend.

<!-- TECHNICAL -->

## Overview

**Action:** `GET_PANEL_RANGE_INFO` (5)
**Direction:** Frontend → Backend
**Location:** Not implemented
**Purpose:** Query panel capabilities and supported ranges
**Status:** ⚠️ Not implemented

## Expected Request Format

**JSON Structure:**
```json
{
  "action": "GET_PANEL_RANGE_INFO",
  "panelId": 0
}
```

## Expected Response Format

**JSON Structure:**
```json
{
  "action": "GET_PANEL_RANGE_INFO_RES",
  "panelId": 0,
  "data": {
    "inputCount": 64,
    "outputCount": 64,
    "variableCount": 64,
    "programCount": 16,
    "pidCount": 16,
    "scheduleCount": 32,
    "holidayCount": 32,
    "monitorCount": 12,
    "graphicCount": 20
  }
}
```

## Implementation Status

This message type is defined in the WEBVIEW_MESSAGE_TYPE enum but does not have a corresponding case handler in BacnetWebView.cpp HandleWebViewMsg function.

**To implement:**
1. Add case handler for GET_PANEL_RANGE_INFO
2. Read panel configuration from g_Device_Basic_Setting
3. Return count limits for each entry type

## Workaround

Until implemented, use hardcoded constants:

```typescript
const PANEL_RANGES = {
  inputs: 64,
  outputs: 64,
  variables: 64,
  programs: 16,
  controllers: 16,
  schedules: 32,
  holidays: 32,
  monitors: 12,
  graphics: 20
};
```

## See Also

- [Platform Overview](../overview.md) - Architecture
- [Data Structures](../data-structures.md) - Entry type constants
