# Firmware Deployment via BACnet — Design

Deploy firmware JSON (per-screen LVGL widget definitions) from EEZ Editor to T3000 hardware devices via BACnet private transfer.

---

## 1. Current State

[`firmware-export.ts`](../../src/lib/t3-eez-studio/project-editor/build/firmware-export.ts) transforms `.eez-project` → per-screen JSON. "Deploy" button writes files to disk — **does not reach hardware**.

The T3000 already pushes graphic data to devices over BACnet. Firmware deploy can reuse the same path:

| What | Where | Does |
|------|-------|------|
| `write_webview_data()` | `BacnetScreen.cpp:164` | Reads zip → 200B chunks → BACnet `WritePrivateData_Blocking` |
| `WEBVIEW_MESSAGE_TYPE` enum | `BacnetWebView.cpp:61` | Actions 0–17 (`SAVE_GRAPHIC_DATA=2`, `GET_WEBVIEW_LIST=17`, etc.) |
| Rust `WebViewMessageType` | `t3_ffi_sync_service.rs:53` | Same actions, Rust side |
| `call_handle_webview_msg()` | `t3_ffi_sync_service.rs:246` | Rust → C++ bridge (FFI) |
| `BacnetWebView_HandleWebViewMsg()` | `BacnetWebView_Exports.cpp:97` | C++ export: receives JSON, dispatches to handler |

**Existing pipe:** `Browser → HTTP → Rust → FFI → C++ → BACnet → Device`

---

## 2. Recommended Approach: Leverage Existing Private Transfer + Add New Message Type

The cleanest path is to extend the existing `WEBVIEW_MESSAGE_TYPE` enum with a new firmware deploy action (18) and reuse the proven BACnet private transfer mechanism — the same 200-byte chunked `WritePrivateData_Blocking` pattern already used by `SAVE_GRAPHIC_DATA` (action 2).

### 2.1. Architecture

```
┌──────────┐  HTTP POST      ┌──────────┐  FFI (DLL export)   ┌──────────┐  BACnet chunks  ┌──────────┐
│ Browser  │ ──────────────→ │  Rust    │ ─────────────────→  │  C++     │ ──────────────→ │  Device  │
│ (EEZ)    │ ←────────────── │  (api/)  │ ←─────────────────  │ (T3000)  │ ←────────────── │ (HW)     │
└──────────┘    JSON         └──────────┘   in-place buffer   └──────────┘  200B blocks    └──────────┘
                                │                                    │
                      call_handle_webview_msg()           WritePrivateData_Blocking()
                      t3_ffi_sync_service.rs:246          WRITE_JSON_SCREEN + WRITE_JSON_ITEM
```

**Why this path?** The T3000 already has `SAVE_GRAPHIC_DATA` (action=2) doing exactly this — receiving graphic JSON from browser, writing to disk, zipping, chunking into 200-byte blocks, and pushing to device via `WritePrivateData_Blocking`. Firmware deploy is the same pattern: we skip the disk step and send firmware JSON directly through the Rust→C++ bridge.

### 2.2. New `WEBVIEW_MESSAGE_TYPE` Enum Extension

Both enums must stay in sync. Add to:

**Rust** — `api/src/t3_device/t3_ffi_sync_service.rs:53`:
```rust
pub enum WebViewMessageType {
    // ... existing 0-17 ...
    DEPLOY_FIRMWARE = 18,  // ← NEW: deploy firmware screen JSON to device
}
```

**C++** — `T3000/BacnetWebView.cpp:61`:
```cpp
enum WEBVIEW_MESSAGE_TYPE {
    // ... existing 0-17 ...
    DEPLOY_FIRMWARE = 18,  // ← NEW
};
```

### 2.3. JSON Message Format (Browser → Rust → C++)

Browser sends to Rust endpoint; Rust wraps with action code and forwards to C++:

```json
{
    "action": 18,
    "panelId": 5,
    "serialNumber": 12345,
    "screens": [
        {
            "name": "Home",
            "json": "{\"fonts\":[{\"name\":\"regular_16\",\"size\":16}],\"bitmaps\":[\"bg_home\"],\"widgets\":{\"label_temp\":{\"type\":\"Widget\",\"sub_type\":\"label\",\"x_pos\":100,\"y_pos\":50,\"width\":200,\"height\":30,\"obj_text\":\"zones[selected_zone].temperature\",\"text_type\":\"expression\",\"style\":{\"DEFAULT\":{\"text_font\":\"regular_36\"}}}}}"
        }
    ]
}
```

C++ responds:
```json
{
    "action": "DEPLOY_FIRMWARE_RES",
    "deployed": 3,
    "failed": 0,
    "status": true
}
```

### 2.4. C++ Handler (New in `HandleWebViewMsg`)

```cpp
// T3000/BacnetWebView.cpp — inside HandleWebViewMsg()

case WEBVIEW_MESSAGE_TYPE::DEPLOY_FIRMWARE:
{
    int panelId = json["panelId"].asInt();
    UINT serialNumber = json["serialNumber"].asInt();
    const Json::Value& screens = json["screens"];

    // Find BACnet device instance from panel info
    int deviceInstance = 0;
    for (auto& info : g_bacnet_panel_info) {
        if (info.nseiral_number == serialNumber && info.panel_number == panelId) {
            deviceInstance = info.object_instance; break;
        }
    }
    if (!deviceInstance) {
        WrapErrorMessage(builder, tempjson, outmsg, _T("Device not found"));
        break;
    }

    int deployed = 0, failed = 0;
    for (int i = 0; i < screens.size(); i++) {
        std::string jsonStr = screens[i]["json"].asString();
        int ret = write_firmware_raw(deviceInstance, panelId, serialNumber, i, jsonStr);
        (ret >= 0) ? deployed++ : failed++;
    }

    tempjson["action"] = "DEPLOY_FIRMWARE_RES";
    tempjson["deployed"] = deployed;
    tempjson["failed"]   = failed;
    tempjson["status"]   = (failed == 0);
    outmsg = CString(Json::writeString(builder, tempjson).c_str());
    break;
}
```

### 2.5. BACnet Transfer — New `write_firmware_raw()` (Reuses Existing Pattern)

```cpp
// T3000/BacnetScreen.cpp — new function, variant of write_webview_data() line 164
// Same 200-byte chunked pattern, but accepts raw JSON string (no disk I/O)

int write_firmware_raw(int deviceInstance, int panelId,
                        UINT serialNumber, int screenIndex,
                        const std::string& jsonStr)
{
    // 1. Compress JSON in memory
    std::vector<char> compressed = ZipInMemory(jsonStr.data(), jsonStr.size());

    // 2. Verify device firmware supports the feature
    if (GetPrivateDataSaveSPBlocking(deviceInstance, READ_SETTING_COMMAND, 0, 0,
          sizeof(Str_Setting_Info), 1) <= 0) return -1;
    if (g_Device_Basic_Setting[panelId].reg.pro_info.firmware0_rev_main * 10
        + g_Device_Basic_Setting[panelId].reg.pro_info.firmware0_rev_sub < WEBVIEW_JSON_FEATURE)
        return -1;  // firmware too old (pre-v643)

    // 3. Set JSON flash mode flag
    g_Device_Basic_Setting[panelId].reg.webview_json_flash = 2;
    WritePrivateData_Blocking(deviceInstance, WRITE_SETTING_COMMAND, 0, 0, 5,
                               (char*)&g_Device_Basic_Setting[panelId].reg);

    // 4. Write screen metadata (zip size)
    g_json_screen_data[panelId][screenIndex].file_data.zip_size = compressed.size();
    WritePrivateData_Blocking(deviceInstance, WRITE_JSON_SCREEN,
                               screenIndex, screenIndex, 5,
                               (char*)&g_json_screen_data[panelId][screenIndex]);

    // 5. Chunk and write — 200 bytes per block, 2 blocks per BACnet write
    int totalChunks = compressed.size() / 200 + 1;
    for (int i = 0; i < totalChunks; i++) {
        int copySize = (i < totalChunks - 1) ? 200 : (compressed.size() % 200);
        memcpy(&g_json_item_data[panelId][10 * screenIndex + i],
               &compressed[i * 200], copySize);
    }

    for (int g = 0; g < totalChunks; g += BAC_READ_JSON_ITEM_GROUP_NUMBER) {
        int start = screenIndex * 10 + g;
        int end   = min(start + BAC_READ_JSON_ITEM_GROUP_NUMBER - 1, screenIndex * 10 + 9);
        WritePrivateData_Blocking(deviceInstance, WRITE_JSON_ITEM, start, end, 5,
                                   (char*)&g_json_item_data[panelId][start]);
        if (!offline_mode) Sleep(SEND_COMMAND_DELAY_TIME);
    }
    return 0;
}
```

Constants from `T3000/global_define.h`:
- `WEBVIEW_JSON_FEATURE = 643` — minimum firmware version  
- `BAC_READ_JSON_ITEM_GROUP_NUMBER = 2` — chunks per BACnet write  
- `SEND_COMMAND_DELAY_TIME` — ~50ms backoff between writes  
- Each screen uses 10 slots (screen × 10 to screen × 10 + 9)

### 2.6. Rust Route (New)

```rust
// NEW FILE: api/src/t3_device/firmware_deploy_routes.rs

use axum::{extract::{Path, State}, http::StatusCode, response::Json, routing::post, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use crate::app_state::T3AppState;
use crate::t3_device::t3_ffi_sync_service::{call_handle_webview_msg, WebViewMessageType};

pub fn create_firmware_deploy_routes() -> Router {
    Router::new()
        .route("/api/devices/:id/deploy-firmware", post(deploy_firmware))
}

#[derive(Deserialize)]
struct DeployFirmwareRequest {
    serial_number: i32,
    screens: Vec<FirmwareScreen>,
}

#[derive(Deserialize)]
struct FirmwareScreen {
    name: String,
    json: Value,  // the full screen JSON from firmware-export.ts
}

async fn deploy_firmware(
    State(_state): State<T3AppState>,
    Path(device_id): Path<i32>,
    Json(payload): Json<DeployFirmwareRequest>,
) -> Result<Json<Value>, StatusCode> {
    // Wrap with action code, matching C++ WEBVIEW_MESSAGE_TYPE::DEPLOY_FIRMWARE = 18
    let json_str = serde_json::to_string(&json!({
        "action": WebViewMessageType::DEPLOY_FIRMWARE as i32,
        "panelId": device_id,
        "serialNumber": payload.serial_number,
        "screens": payload.screens.iter().map(|s| json!({
            "name": s.name,
            "json": s.json.to_string()
        })).collect::<Vec<_>>(),
    })).unwrap();

    // Reuse the same 65536-byte buffer pattern as all other FFI calls
    let mut buffer = vec![0u8; 65536];
    buffer[..json_str.len()].copy_from_slice(json_str.as_bytes());

    match call_handle_webview_msg(WebViewMessageType::DEPLOY_FIRMWARE as i32, &mut buffer) {
        Ok(0) => {
            let response: Value = serde_json::from_slice(&buffer)
                .unwrap_or(json!({"status": "ok"}));
            Ok(Json(response))
        }
        _ => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}
```

Register in `api/src/t3_device/routes.rs`:
```rust
use crate::t3_device::firmware_deploy_routes::create_firmware_deploy_routes;
// inside the Router builder:
.merge(create_firmware_deploy_routes())
```

### 2.7. Browser Side (Wire Deploy Button)

```typescript
// In Toolbar.tsx — the "Deploy to Device" button handler
// Firmware JSON already generated by firmware-export.ts → transformToDeviceJson()

async function handleDeploy(deviceId: number, serialNumber: number) {
    const project = parseProject();  // parse .eez-project
    const deviceScreens = transformToDeviceJson(project);  // existing function
    const screens = Object.entries(deviceScreens).map(([name, screen]) => ({
        name,
        json: screen  // full DeviceScreen object
    }));

    const response = await fetch(`/api/devices/${deviceId}/deploy-firmware`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial_number: serialNumber, screens })
    });

    const result = await response.json();
    showNotification(`Deployed: ${result.deployed}, Failed: ${result.failed}`);
}
```

---

## 3. Why This Approach (Not Others)

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **BACnet/WS (REST)** | Standard, JSON-native | Requires HTTP server on device, complex TLS | ❌ Overkill for embedded |
| **BACnet ObjectFile** | Standard BACnet object | File size limits, complex state machine | ❌ Poor fit for ~30KB JSON |
| **BACnet/SC (WebSocket)** | Modern transport | Requires hub, new stack, certificate mgmt | ❌ Major refactor |
| **Extend existing private transfer** | Already works, proven, devs know it | Non-standard, needs new message type (18) | ✅ Fastest, lowest risk |

---

## 4. Implementation Plan

```
Phase 1: C++ Layer (T3000_Building_Automation_System/T3000/)
  ├── BacnetWebView.cpp    — add DEPLOY_FIRMWARE = 18 to enum + case handler
  ├── BacnetScreen.cpp     — add write_firmware_raw() function
  └── BacnetScreen.h       — declare write_firmware_raw()

Phase 2: Rust Layer (api/src/t3_device/)
  ├── t3_ffi_sync_service.rs      — add DEPLOY_FIRMWARE = 18 to enum
  ├── firmware_deploy_routes.rs   — NEW: POST /api/devices/:id/deploy-firmware
  └── routes.rs                   — register create_firmware_deploy_routes()

Phase 3: Browser Layer (src/lib/t3-eez-studio/)
  ├── firmware-export.ts   — already done (transformToDeviceJson exists)
  └── Toolbar.tsx          — wire "Deploy" button to POST /api/devices/:id/deploy-firmware

Phase 4: Device Firmware (T3000 hardware)
  ├── Receive chunks → reassemble → decompress → store to flash
  └── Parse JSON → create LVGL widgets → render UI on boot
```

---

## 5. Data Flow Summary

```
Step 1: User clicks "Deploy" in EEZ Editor
   ↓  firmware-export.ts transforms .eez-project → per-screen JSON

Step 2: Browser POSTs to Rust
   ↓  POST /api/devices/5/deploy-firmware
   ↓  Body: { serial_number: 12345, screens: [{name:"Home", json:{...}}, ...] }

Step 3: Rust wraps + calls FFI
   ↓  Adds "action": 18 (DEPLOY_FIRMWARE)
   ↓  call_handle_webview_msg(18, json_buffer) → BacnetWebView_HandleWebViewMsg(18, msg, 65536)

Step 4: C++ dispatches
   ↓  HandleWebViewMsg → case DEPLOY_FIRMWARE
   ↓  Validates panelId/serialNumber → finds deviceInstance

Step 5: C++ transfers to device via BACnet
   ↓  write_firmware_raw(deviceInstance, panelId, serial#, screenIdx, jsonStr)
   ↓  Compress → chunk 200B blocks → WritePrivateData_Blocking(WRITE_JSON_ITEM)

Step 6: Device receives and stores
   ↓  Reassemble chunks → decompress → flash: /screens/Home.json
   ↓  On reload: parse JSON → create LVGL widgets → render UI
```

---

## 6. Data Size & Transfer Time

| Metric | Value |
|--------|-------|
| Per-screen JSON (uncompressed) | ~30 KB |
| After ZIP compression (~50%) | ~15 KB |
| 200-byte chunks per screen | ~75 chunks |
| BACnet writes per screen (2 chunks/group) | ~38 writes |
| Time per write (with `SEND_COMMAND_DELAY_TIME`) | ~50 ms |
| **Per screen over BACnet MSTP** | **~2 seconds** |
| **3 screens total** | **~6 seconds** |

---

