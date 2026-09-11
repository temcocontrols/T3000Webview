# Design Studio (Tstat11) API — Endpoints

Two independent paths carry the same screen JSON to and from a T3 controller:

- **HTTP REST** — served by the firmware on port 80; this is what Design Studio and the web
  tools call (sections 4–5 below: endpoints and an example).
- **BACnet private transfer** — firmware-side commands driven by T3000's own tooling, **not used
  by the web tools** (sections 1–3 below: command IDs, payload slots, configuration flag).

They are separate APIs — there is no one-command-per-endpoint mapping between them.

---

## 1. BACnet private transfer — command IDs

> Scope: this path is driven by T3000's own tooling, not by Design Studio / EEZ Studio — the web
> tools use the [HTTP REST API](#4-http-rest-the-path-the-tools-use) instead.

Defined in the `CommandRequest` enum (`temco_bacnet/private/ud_str.h`, duplicated in
`main/ud_str.h` — both in the ESP32 firmware):

| Command | Value | Direction | Purpose |
|---|---|---|---|
| `READ_JSON_SCREEN` | **86** | Device → requester | Read screen slots |
| `READ_JSON_ITEM` | **87** | Device → requester | Read item slots |
| `WRITE_JSON_SCREEN` | **186** | Requester → device | Write screen slots |
| `WRITE_JSON_ITEM` | **187** | Requester → device | Write item slots |

Read/write are paired: read ≤ 100, write > 100.

---

## 2. BACnet private transfer — where the payload lands

Both write commands copy their payload into a union member of the group element structure:

```c
typedef struct {
    Str_t3_screen_Json screen[MAX_GRPS];          // MAX_GRPS = 16, 50 bytes each  =  800
    Str_item_Json      item[MAX_ELEMENTS_NEW];    // MAX_ELEMENTS_NEW = 80, 200 B each = 16 000
} Str_json_item;

typedef union {
    Str_grp_element   old_item[MAX_ELEMENTS];     // legacy layout
    Str_json_item     new_item;                   // JSON layout
} Str_grp_element_new;
```

- The global instance is `group_data_new` (`main/user_data.h`), zeroed at boot in
  `init_panel()`.
- It is persisted as one flash page: `save_point_info()` in `main/flash.c` writes
  `sizeof(Str_grp_element_new)` under `GRP_POINT`.
- The handler is in `temco_bacnet/private/ptransfer.c`:

```c
case WRITE_JSON_SCREEN:
    ptr = &group_data_new.new_item.screen[point_start_instance];   // guarded by MAX_GRPS
    break;
case WRITE_JSON_ITEM:
    ptr = &group_data_new.new_item.item[point_start_instance];     // guarded by MAX_ELEMENTS_NEW
    break;
```

The payload is then copied generically:

```
total_length == entitysize * (point_end_instance - point_start_instance + 1) + header_len
header_len   == USER_DATA_HEADER_LEN == 7
memcpy(ptr, &Temp_CS.value[header_len], total_length - header_len);
```

So a write is a *chunked memory copy into a fixed slot array*: the requester supplies the
element size, the slice start/end, and the bytes.

### Limits worth knowing

| Item | Value |
|---|---|
| Screen slots | 16 × 50 bytes = 800 bytes |
| Item slots | 80 × 200 bytes = 16 000 bytes |
| Header | 7 bytes, skipped by the copy |
| Compression | **none** — payloads are plain JSON/text |
| Bounds check | the code checks the slot index range, but **not** `entitysize` against the slot size |

---

## 3. BACnet private transfer — configuration flag

`webview_json_flash` (NVS key `FLASH_JASON`, `main/user_data.h`) selects the layout
convention:

| Value | Meaning |
|---|---|
| `1` | Legacy graphics |
| `2` | JSON layout |

The flag is used to **skip** the legacy graphic updates (`ptransfer.c`,
`temco_bacnet/private/bac_control.c`, `main/tcp_server.c`). It does not route anything into the
JSON slots on its own.

The JSON slots live in the same group element page (`GRP_POINT`) as the rest of the device's
panel data, so they persist across a reboot.

---

## 4. HTTP REST (the path the tools use)

The device exposes HTTP REST (`components/temco_dynamic_display`, `esp_http_server` on
**port 80**). Design Studio and the web tools call this exclusively, through the T3000 proxy:

```
Browser → /api/device-rest/<device-ip>/api/eez-device/<endpoint>
        → T3000 backend (proxy_device_rest) → ESP32
```

| Method & endpoint | Purpose |
|---|---|
| `GET /api/eez-device/device/info` | Screen summary — names + counts |
| `GET /api/eez-device/screens` | Read all screens |
| `GET /api/eez-device/screens/:name` | Read one screen |
| `PUT /api/eez-device/screens` — body `{ "screens": [ { "name", "json" } ] }` | Write all screens |
| `PUT /api/eez-device/screens/:name` — body `{ "json": { … } }` | Write one screen |
| `PATCH /api/eez-device/screens/:name` — body `{ "changes": [ { "path", "value" } ] }` | Delta update |
| `POST /api/eez-device/images/push` — body `{ "name", "data_base64" }` | Push an image |
| `GET /api/eez-device/images/pull/:name` | Read an image |

BACnet-style aliases also exist on the device (`POST /api/eez-device/screens/push/:panelId`,
`POST …/screens/pull/:panelId`) but the client does not use them.

**REST storage:** SPIFFS partition `screen_data` (1 MB) — `/spiffs/screens/<name>.json` and
`/spiffs/images/<name>.json`; images are stored as the raw request body (base64 inside JSON),
not as decoded pixels. 13 screens and 22 images are seeded from `DefaultScreens/` /
`DefaultImages/` on first boot.

Request bodies are capped at **512 KB** (returns `400` when exceeded).

---

## 5. Reading a screen over REST — example

```http
GET /api/device-rest/192.168.1.50/api/eez-device/device/info
```

```json
{
  "panel_name": "T3-ESP32",
  "serial_number": 0,
  "screen_size": { "width": 480, "height": 320 },
  "screen_count": 13,
  "screens": { "screen1": "start_up_screen", "screen2": "home_screen", "screen3": "main_menu" },
  "image_count": 22,
  "lvgl_version": "9.1.0",
  "color_format": "RGB565"
}
```

Then fetch a screen and write it back:

```http
GET /api/device-rest/192.168.1.50/api/eez-device/screens/home_screen
```

```json
{ "name": "home_screen", "json": { "bg_color": "#000000", "bitmaps": [], "fonts": [], "widgets": { } } }
```

```http
PUT /api/device-rest/192.168.1.50/api/eez-device/screens/home_screen
Content-Type: application/json

{ "json": { "bg_color": "#000000", "bitmaps": [], "fonts": [], "widgets": { } } }
```

> `screens` in `device/info` is an **object** keyed `screen1..N`, not an array — the numeric
> suffix is the authoritative order. `serial_number`, `firmware_version` and `lvgl_version` are
> hard-coded literals on the device.

---

## 6. See also

- [screen-json.md](screen-json.md) — the JSON document format.
- [README.md](README.md) — overview and the screen-slot table.
