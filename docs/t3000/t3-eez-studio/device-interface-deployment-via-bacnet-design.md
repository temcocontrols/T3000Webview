# Device REST API — reference

The HTTP contract between the T3000 host and a T3 controller for screen and image transfer. Every
endpoint, its payload, its status codes and its limits.

**Applies to:** the paths marked *shipped* exist in firmware
`components/temco_dynamic_display/src/dynamic_display_api.c` and in the client at
`src/lib/t3-eez-studio/project-editor/build/device-rest-client.ts`. Paths marked *specified* are
defined here and in [screen-deploy-lifecycle-design.md](screen-deploy-lifecycle-design.md) but are
not implemented.

**Not covered here:** the JSON document shape ([../bacnet-api/screen-json.md](../bacnet-api/screen-json.md)),
deploy guarantees ([screen-deploy-lifecycle-design.md](screen-deploy-lifecycle-design.md)), the
client's orchestration ([phase2-host-implementation-guide.md](phase2-host-implementation-guide.md)).

The filename still contains `bacnet` for link stability. The transport is HTTP.

---

## 1. Transport

```text
Browser ──▶ /api/device-rest/<device-ip>/api/eez-device/<path>
        ──▶ T3000 backend proxy  (api/src/eez_studio/mod.rs → proxy_device_rest)
        ──▶ ESP32 esp_http_server, port 80
        ──▶ SPIFFS partition screen_data → /spiffs/screens/<name>.json
```

The device sends no CORS headers, so the browser cannot call it directly; every request goes through
the host proxy.

| Piece | Location |
|---|---|
| Base URL builder | `device-rest-client.ts` → `restUrl()` |
| Proxy handler | `api/src/eez_studio/mod.rs` → `proxy_device_rest` |
| Device server | `components/temco_dynamic_display/src/dynamic_display_api.c` (port 80) |
| Storage | `screen_data` SPIFFS partition, `/spiffs/screens/`, `/spiffs/images/` |

Timeouts: **10 s** reachability, **30 s** ordinary request, **120 s** deploy
(`DEPLOY_TIMEOUT_MS`). `connect(ip, panelId, serialNumber)` probes `GET /device/info` and returns
`{ mode: "rest", deviceIp }` or an error.

There is no authentication and no TLS. Any host on the LAN can write screens to the device.

BACnet is not a Design Studio path. The firmware does implement BACnet private-data transfer
(`READ_JSON_SCREEN` 86, `READ_JSON_ITEM` 87, `WRITE_JSON_SCREEN` 186, `WRITE_JSON_ITEM` 187),
driven by T3000.exe for its own tooling, writing to a different store
(`group_data_new.new_item` in the `GRP_POINT` page). The two paths carry the same screen JSON.
See [../bacnet-api/README.md](../bacnet-api/README.md).

## 2. Endpoint index

All paths are under `/api/eez-device`.

| Method | Path | Status | Purpose |
|---|---|---|---|
| `GET` | `/device/info` | shipped | screen list and counts |
| `GET` | `/screens` | shipped | all screens |
| `GET` | `/screens/<name>` | shipped | one screen |
| `PUT` | `/screens` | shipped | write all screens in one request |
| `PUT` | `/screens/<name>` | shipped | write one screen |
| `PATCH` | `/screens/<name>` | shipped | dot-path delta on one screen |
| `DELETE` | `/screens/<name>` | **specified** | remove one screen |
| `POST` | `/images/push` | shipped | upload one image |
| `GET` | `/images/pull/<name>` | shipped | download one image |
| `DELETE` | `/images/<name>` | shipped | remove one image |
| `POST` | `/reset-defaults` | shipped | format `screen_data` and re-seed the compiled defaults |
| `POST` | `/set-default-screens`, `/load-default-screens` | shipped | aliases of the above |
| `POST` | `/deploy/begin` | **specified** | open a deploy transaction |
| `PUT` | `/deploy/<id>/file` | **specified** | stage one file |
| `POST` | `/deploy/<id>/commit` | **specified** | validate everything and activate |
| `POST` | `/deploy/<id>/abort` | **specified** | discard the transaction |
| `GET` | `/deploy/<id>` | **specified** | transaction status, for resume |
| `GET` | `/storage/capacity` | **specified** | free space, slot state, per-file cap |
| `GET` | `/device/status` | **specified** | active tier, revision, `build_ok`, `last_error` |

Legacy aliases exist on the device and are unused by the client: `POST /screens/push[/:panelId]`,
`POST /screens/pull[/:panelId]`.

## 3. Endpoint detail

### `GET /device/info`

```json
{ "serial_number": 0, "firmware_version": "1.0.0", "lvgl_version": "9.1.0",
  "screen_count": 13, "screens": { "screen1": "start_up_screen", "screen2": "home_screen" } }
```

`screens` is an **object keyed `screen1..N`**, not an array. `serial_number`, `firmware_version` and
`lvgl_version` are hard-coded literals in firmware — they are not read from the device.

### `GET /screens`, `GET /screens/<name>`

`GET /screens` returns every stored screen. `GET /screens/<name>` returns one, either wrapped as
`{ "<name>": { … } }` or as the parsed document itself; the firmware accepts and emits both.

`404` when the named screen does not exist.

### `PUT /screens`

Write all screens in one request.

```json
{ "screens": [ { "name": "home_screen", "json": { "bg_color": "#000000", "widgets": {} } } ] }
```

```json
{ "deployed": 13, "failed": 0, "status": "ok", "errors": null }
```

`status` is `ok` when `failed == 0`, otherwise `partial`. A malformed request returns `400`
`"Invalid JSON payload"`; entries missing `name` or `json` count as failed. There is no
all-or-nothing behaviour: files that succeeded stay written.

### `PUT /screens/<name>`

```json
{ "json": { "bg_color": "#000000", "widgets": {} } }
```

`200` → `{ "name": "<name>", "status": "ok", "error": null }`.
`500` `"Failed to save screen to flash"` when the write fails (space, I/O).

### `PATCH /screens/<name>`

```json
{ "changes": [ { "path": "widgets.HomeScreen.children.Label1.obj_text", "value": "Kitchen" } ] }
```

`400` on malformed patch JSON, `404` when the target path does not exist, `500`
`"Corrupted stored screen JSON"` when the stored document cannot be parsed.

### `POST /images/push`

```json
{ "name": "fan_small", "data_base64": "iVBORw0KGgo…" }
```

The body is stored **as text** — the device does not decode pixels at write time. Size is bounded
only by the request limit.

### `GET /images/pull/<name>`, `DELETE /images/<name>`

Return the stored record, or remove it. `404` when absent.

### `POST /reset-defaults`

Formats the `screen_data` partition, re-seeds the compiled default screens and images, and clears
the renderer's disabled flag. Response `{ "ok": true }`. This is the factory reset described in
[screen-deploy-lifecycle-design.md §13](screen-deploy-lifecycle-design.md).

### Deploy transaction — `specified`

Defined in full in [screen-deploy-lifecycle-design.md §5](screen-deploy-lifecycle-design.md). The
contracts, for reference:

```text
POST /deploy/begin           { schema, revision, files, bytes, start_screen }
                          →  { deploy_id, slot, revision, resume_from[] }
                            | 409 deploy_in_progress | 507 no_space | 422 schema_unsupported

PUT  /deploy/<id>/file?path=screens/<name>
                          →  { path, bytes, sha256, staged: true }
                            | 422 invalid_json | 413 file_too_large | 507 no_space

POST /deploy/<id>/commit  →  { ok, revision, slot, applied, applied_within_ms, screens, images }
                            | 422 validation_failed { problems[] }
                            | 507 no_space_after_commit

POST /deploy/<id>/abort   →  { ok }
GET  /deploy/<id>         →  { staged[], remaining[], slot, revision }
```

### `GET /storage/capacity` — `specified`

```json
{ "partition": "screen_data", "total": 1048576, "used": 486400, "free": 562176,
  "slot_free": 562176, "reserved": 65536, "max_file": 262144,
  "slots": { "A": { "revision": 2, "bytes": 486400 }, "B": { "revision": 0, "bytes": 0 } } }
```

### `GET /device/status` — `specified`

```json
{ "ui_mode": "dynamic", "tier": 1, "slot": "B", "revision": 3,
  "current_screen": "home_screen", "build_ok": true, "last_error": "",
  "applied_at_ms": 17442, "images_loaded": 9, "heap_used": 421888 }
```

`ui_mode` is `dynamic` when a committed screen set is rendering and `compiled` when the firmware is
drawing its built-in UI. `tier` is `0` (compiled seed), `1` (active slot) or `2` (candidate).

## 4. Status codes

| Code | Meaning in this API |
|---|---|
| `200` | accepted and persisted |
| `400` | request body is not JSON, or missing a required key |
| `404` | named screen, image or transaction does not exist |
| `409` | a deploy transaction is already open |
| `413` | single file exceeds `max_file` (specified) |
| `422` | JSON valid but rejected by validation (specified) |
| `500` | storage write failed |
| `507` | insufficient space (specified) |

A `200` means **persisted**, not **painted**. Nothing on the panel reads the file until a renderer
exists; the authoritative "is it on screen" signal is `GET /device/status`.

## 5. Limits

| Limit | Value | Behaviour on breach |
|---|---|---|
| request body | 512 KiB | `400` (not `413`) — the limit is enforced before parsing in `read_body_dynamic()` |
| single file | `max_file`, proposed 256 KiB | `413` (specified) |
| screens + images together | 1 MiB partition, ~934 KB usable | `500` today; `507` specified |
| concurrent deploys | 1 | `409` (specified) |
| open transaction | 1 per device | second `begin` → `409` |

## 6. Known gaps in the shipped API

| Gap | Consequence |
|---|---|
| no `DELETE /screens/<name>` | a screen removed in Studio stays on the device for ever and the partition fills |
| no transactional deploy | a failure mid-deploy leaves a mixed screen set, and nothing records that it happened |
| no capacity endpoint | the client discovers "no room" only after uploading |
| no `device/status` | the client cannot distinguish "stored" from "rendered" |
| `PUT /screens` partial semantics | `status: "partial"` is the only warning; the client must inspect `errors` |
| images stored undecoded | decode cost is paid on every render, and image size is unbounded in practice |

Each is addressed by the specified endpoints above; see
[screen-deploy-lifecycle-design.md](screen-deploy-lifecycle-design.md) for the guarantees they
provide and [phase2-host-implementation-guide.md](phase2-host-implementation-guide.md) for the client
changes.
