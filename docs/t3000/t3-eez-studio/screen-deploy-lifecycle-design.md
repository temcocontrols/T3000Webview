# Screen deploy lifecycle

**Applies to:** specification — the transaction endpoints, the three-tier storage model and the
revision model below are not implemented. Shipped behaviour is in
[device-interface-deployment-via-bacnet-design.md](device-interface-deployment-via-bacnet-design.md).

This document covers the part of the screen feature that sits *between* the exporter and the
renderer: how a screen set travels from Design Studio to a T3 controller, how the device guarantees
that a failed, interrupted or corrupt deploy can never leave the panel without a working UI, how
storage limits are handled, and how the different screen *versions* are tracked and reset.

It deliberately does **not** repeat:

| Topic | Covered by |
|---|---|
| Screen JSON payload format (envelope, widgets, style, align, events) | [phase2-device-renderer-design.md](phase2-device-renderer-design.md) §3, [lvgl-eez-project-json-format.md](lvgl-eez-project-json-format.md) |
| The JSON → LVGL renderer itself (`dynui.c`, widgets, style, assets) | [phase2-device-renderer-design.md](phase2-device-renderer-design.md) §4, [phase2-firmware-implementation-guide.md](phase2-firmware-implementation-guide.md) |
| The REST surface as built today | [device-interface-deployment-via-bacnet-design.md](device-interface-deployment-via-bacnet-design.md) §1–§4 |
| Editor UI and preview | [manual/03-editing-screens.md](manual/03-editing-screens.md), [manual/05-preview-and-deploy.md](manual/05-preview-and-deploy.md) |

Read those first. This document assumes the renderer exists as designed there, including decision
**D2 (parallel, with auto-fallback)**: the compiled screens stay flashed, and the panel falls back to
them on any failure.

---

## 1. What exists today (verified)

Everything below was read from the current trees; line numbers are for this snapshot.

### 1.1 Device (T3-programmable-controller-on-ESP32)

| Capability | State | Evidence |
|---|---|---|
| Storage layer | present | `components/temco_dynamic_display/src/screen_flash_store.c` |
| Mount SPIFFS `screen_data` | present | `screen_flash_store.c:295-315`, called from `screen_store_init()` `:331-348` |
| Per-screen files `/spiffs/screens/<name>.json` | present | `:353-359`, `:398-400` |
| Per-image files `/spiffs/images/<name>.json` | present | `:471-490` |
| Compiled-in defaults (13 screens, images) | present | `DEFAULT_SCREENS[]` `:119-135`, `DEFAULT_IMAGES[]` `:137-163` |
| Seeding on first boot | present, but only if file missing/zero-length | `seed_default_screens_if_empty()` `:259-290` |
| Atomic file replacement | **absent** — unlinks the old file, then writes the final path | `write_file_replace()` `:181-249`, unlink at `:207-216` |
| Checksum / hash of stored files | **absent** | — |
| Commit record / transaction | **absent** | — |
| Version or revision counter | **absent** | — |
| Quota preflight | partial — free-space check before write only | `:194-205` (`SPIFFS_WRITE_OVERHEAD` = 1024) |
| Out-of-space handling | partial — short write aborts and removes the file | `:218-249` |
| Factory reset of screens | present — format + reseed | `screen_store_reset_to_defaults()` `:564-606` |
| REST deploy endpoints | present | `dynamic_display_api.c:929-943` |
| Request body limit | 512 KiB | `read_body_dynamic()` `:61-105`, limit `:71-75` |
| Boot-time JSON validation | **absent** | `:898-905` only checks that the mount succeeded |
| JSON → LVGL renderer | **absent** (Phase 2 work) | renderer is designed in `phase2-device-renderer-design.md`; today the panel runs compiled `ui_init()` (`main/LCD_Driver/lv_UserPeram.c:226-236` only *observes* the active screen) |

### 1.2 Front end (T3000Webview)

| Capability | State | Evidence |
|---|---|---|
| Export `.eez-project` → device JSON | present | `src/lib/t3-eez-studio/project-editor/build/firmware-export.ts` |
| Full deploy | present — one `PUT` for all screens | `device-rest-client.ts:451-468` |
| Image deploy | present — `POST /images/push`, images pushed **before** screens | `device-rest-client.ts:532-562`, order `:423-459` |
| Incremental deploy (diff by content hash) | present | `deployService.ts:269-288`, `:313-357` |
| Manifest baseline | present | `deploy-manifest.ts`, `deployService.ts:153` (`MANIFEST_HASH_VERSION = 2`) |
| Progress reporting | present, front-side only | `deployService.ts:190-211` |
| Reset to defaults | present | `device-rest-client.ts:706-728`, UI `DesignHubPage.tsx:509-519` |
| Pre-deploy schema validation | **absent** | only bitmap sanity checks `device-rest-client.ts:493-510` |
| Capacity preflight | **absent** | — |
| Device render-state read-back | **absent** (planned as F3) | `phase2-device-renderer-design.md` §6.2 |
| Retry / resume | partial — a failed deploy is simply retried in full next time | `deployService.ts:517-529` |
| Mock device | present, seeded from the firmware's compiled defaults | `api/src/eez_studio/bacnet_api_mock.rs:21-29`, `:151-224` |

### 1.3 The six gaps this document closes

| Gap | Consequence today |
|---|---|
| G1 no atomic replace | a power cut during `write_file_replace()` leaves **no** file for that screen (the old one was unlinked first) |
| G2 no verification | a truncated or syntactically broken payload is stored happily; the failure only appears at next render |
| G3 no commit semantics | a multi-screen deploy that fails halfway leaves a **mixed** UI (some screens new, some old) with no record of it |
| G4 no version | the device cannot tell the front end which set it is running; the front end cannot detect a stale device |
| G5 no capacity protocol | the front end discovers "no room" one failed screen at a time, after uploading megabytes |
| G6 no repair | a corrupt **non-empty** file is never re-seeded (`:265-278` only checks existence and size), so the panel stays broken until a manual reset |

---

## 2. Vocabulary

| Term | Meaning |
|---|---|
| **screen set** | all screen files plus the images they reference, considered as one unit |
| **revision** | monotonically increasing integer, `0` = the compiled seed |
| **slot** | one complete copy of a screen set inside `screen_data` (`A` or `B`) |
| **commit record** | tiny file naming the active slot; the only thing a deploy changes atomically |
| **staged** | written to the inactive slot but not yet committed |
| **LKG** | last-known-good — the slot currently named by the commit record |
| **seed** | the compiled-in default screen set; revision 0; never writable at runtime |
| **applied** | the renderer has actually built the screen since the deploy (as opposed to merely persisted) |

---

## 3. The full flow

### 3.1 End to end

```text
 Design Studio / Design Hub                 Device (ESP32-S3)
 ─────────────────────────                  ──────────────────────────────────────────────
 1  export  .eez-project → screens+images
 2  pre-deploy checks (schema, expressions,
    image references, per-file size)
 3  GET  /api/eez-device/storage/capacity  →   {free, slot_free, reserved, max_file}
 4  refuse locally if the set does not fit
 5  POST /api/eez-device/deploy/begin      →   {deploy_id, slot:"B", revision:n+1}
        (device reserves the slot, writes
         staging marker, returns slot name)
 6  PUT  /api/eez-device/deploy/<id>/file  →   {sha256, size, status}     (×N)
        images first, then screens
        each file: verify → stage → hash
 7  POST /api/eez-device/deploy/<id>/commit→   {ok, revision, slot, active:true,
                                                applied_within_ms | pending}
        device re-validates every staged file,
        optionally trial-builds, writes commit
        record, swaps slots, rebuilds UI
 8  GET  /api/eez-device/device/status     →   {ui_mode, current_screen, revision,
                                                slot, build_ok, last_error}
 9  store result in the deploy manifest
```

`abort` may be called at any point before `commit` and releases the slot. `commit` is the only step
that changes what the panel renders.

### 3.2 Device-side sequence at commit

```text
 POST /deploy/<id>/commit
   │
   ├─ 1  deploy_id matches the active transaction?           no  → 409
   ├─ 2  every staged file present and parses (cJSON)         no  → 422 + list
   ├─ 3  every sha256 matches what was staged                 no  → 422
   ├─ 4  every bitmap named by a screen has an image file     no  → 422 + list
   ├─ 5  capacity after commit above the reserve floor        no  → 507
   ├─ 6  optional: dynui_validate_screen() for each screen    no  → 422 + list
   ├─ 7  write commit record {slot, revision, sha256s}        ← the atomic step
   ├─ 8  fsync; fsync parent directory
   ├─ 9  free the previously active slot (garbage collect)
   ├─ 10 dynui_request_rebuild(start_screen)                  → applied or pending
   └─ 11 200 {ok:true, revision, slot, applied:…}
```

Step 7 is the whole trick: **one small write flips the panel from the old set to the new set**. If
anything before it fails, the old set is still active and the panel is untouched. If power is lost
during it, the record is either the old value or the new one — a 64-byte SPIFFS write either lands
or it does not, and the CRC inside the record makes a torn write detectable.

### 3.3 What the device does with one screen file

```text
 screen_store_stage_file("screens/home_screen", body, len, sha256)
   ├─ parse with cJSON                     fail → 422, nothing written
   ├─ serialise back (canonical)           fail → 422
   ├─ check len ≤ MAX_SCREEN_BYTES         fail → 413
   ├─ check slot free space                fail → 507
   ├─ write to <slot>/screens/.<name>.tmp
   ├─ fwrite chunks, fflush, fsync, ferror
   ├─ verify size on disk == len           fail → unlink, 500
   ├─ rename to <slot>/screens/<name>.json
   └─ record {name, bytes, sha256} in <slot>/index.json (rewritten after every file)
```

The renderer (`dynui.c`, Phase 2) reads `index.json` at boot, then the individual screen files, and
only ever sees complete, parsed-able files.

---

## 4. The invariant: the panel always has a UI

This is the requirement your questions 6 and 9 are both circling. It is met with **three tiers**:

```text
  Tier 0   compiled screens  (ui_init(), inside the application image)
           immutable at runtime, revision 0, "seed 0.0"
              ▲ fallback
  Tier 1   active slot  (A or B) named by the commit record   ← last-known-good
              ▲ fallback
  Tier 2   the other slot                                   ← candidate / previously active
```

Rules:

1. **Tier 0 cannot be damaged by a deploy.** It lives in the flashed application image, not in
   SPIFFS. This is already the Phase 2 decision D2 and is the reason "the panel always works" is
   achievable at all.
2. **A deploy never writes to the active slot.** It stages into the other one, so a failed deploy
   leaves Tier 1 byte-identical.
3. **Only `commit` changes Tier 1**, via one atomic record write.
4. **Every tier is validated before it is used**: parse, hash, and (optionally) a trial LVGL build.
   A tier that fails validation is skipped, with the reason recorded.
5. **Downgrade of a tier is automatic and silent to the user**: the panel may fall from Tier 2 to
   Tier 1 to Tier 0; the front end learns which tier is active from `/device/status`.

Failure walk-through:

| Event | Result on the panel |
|---|---|
| Wi-Fi drops mid-upload | Tier 1 unchanged; staging slot discarded on next boot |
| Power lost mid-upload | same — staging slot discarded, commit record still points at Tier 1 |
| Power lost during `commit` | record is old or new; CRC decides; either way a complete set is active |
| Deploy commits but the renderer cannot build screen X | Tier 1 stays active for every other screen; screen X shows the Tier 0 version; `last_error` set |
| Two consecutive build failures for the boot screen | `dynui_off=1` in NVS → boot straight to Tier 0; recoverable by reset or a good deploy |
| SPIFFS mount fails entirely | Tier 0 (compiled) — this already works today |
| Both slots corrupt | Tier 0 |

---

## 5. Deploy protocol v2

### 5.1 Design goals

- all-or-nothing across screens **and** images
- crash-safe at every point
- resumable after a dropped connection
- idempotent on retry
- one transaction at a time per device
- no dependence on the device having a clock

### 5.2 Endpoints (additive — the current ones stay)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/eez-device/storage/capacity` | free space, slot free, reserved floor, per-file cap |
| `POST` | `/api/eez-device/deploy/begin` | open a transaction, return `deploy_id`, target slot, target revision |
| `PUT` | `/api/eez-device/deploy/<id>/file?path=screens/<name>` | stage one file (body = JSON text, header `X-Content-SHA256`) |
| `POST` | `/api/eez-device/deploy/<id>/commit` | verify all, flip the commit record, rebuild, answer |
| `POST` | `/api/eez-device/deploy/<id>/abort` | discard the staging slot |
| `GET` | `/api/eez-device/deploy/<id>` | transaction status (for resume: which paths are already staged) |
| `GET` | `/api/eez-device/device/status` | active tier, revision, slot, `build_ok`, `last_error`, timings (already planned as F3) |
| `DELETE` | `/api/eez-device/screens/<name>` | prune a screen (planned as F5) |
| `DELETE` | `/api/eez-device/images/<name>` | prune an unused image |

Existing endpoints keep working unchanged (`PUT /screens`, `PUT /screens/<name>`, `PATCH`,
`POST /images/push`, `POST /reset-defaults`), because a single-screen deploy is still a legitimate
fast path. Internally they are re-implemented on top of the same staging primitives so there is one
code path for correctness.

### 5.3 Request and response semantics

Field-by-field shapes are in the REST reference, section 3. This section fixes the *meaning* of the
fields the client depends on.

| Field | In | Meaning |
|---|---|---|
| `deploy_id` | begin | opaque, unique per device, valid until commit or abort |
| `slot` | begin | the slot that will be written; never the active one |
| `resume_from` | begin | paths already staged for this id; empty for a new transaction |
| `noop` | begin | requested revision and content match the active set; nothing was written |
| `staged` | file | the file is on the inactive slot and its hash matched |
| `applied` | commit | the renderer finished building the start screen inside the request window |
| `applied_within_ms` | commit | how long that build took; advisory |
| `problems[]` | 422 | one entry per rejected path, with `reason` |

Rules not visible in the shapes:

1. `begin` answers `noop: true` instead of opening a transaction when the request carries the revision
   the device already runs and the file count and total bytes match the active index.
2. `commit` is idempotent per `deploy_id`: repeating it after success returns the same revision
   without writing again.
3. `applied` is advisory. A client that needs certainty polls `GET /device/status` until `revision`
   matches.
4. `problems[].reason` is one of `unparseable`, `hash_mismatch`, `missing`, `too_large`,
   `unknown_widget`, `missing_image`.
5. Error codes are the HTTP status codes of the REST reference section 4; the body always carries a
   stable `error` string for programmatic handling.

### 5.4 Layout on the device

```text
/spiffs/
  commit.json          {record:1, slot:"B", revision:3, index_sha256:"…", crc:0x…}
  A/
    index.json         [{name, path, bytes, sha256}, …]  + images[]
    screens/<name>.json
    images/<name>.json
  B/
    index.json
    screens/<name>.json
    images/<name>.json
  staging            ← file created by `begin`, lists the open deploy_id; removed by commit/abort
```

`commit.json` is the single source of truth. Its absence means "no dynamic set" → Tier 0.
The `{record, …, crc}` wrapper means a torn write is rejected and the previous record is used.

### 5.5 Why two slots and not a journal

A journal would be smaller, but on SPIFFS a rename or an unlink is itself a metadata update that
can fail; keeping a complete second copy means the recovery rule is trivial — *use whichever slot
the commit record names, and if the record is unreadable, fall back to the other slot, then to
Tier 0.* No replay logic, no ordering rules, no partially applied state. Given 23.5 MB of unused
flash (§11), the space is cheaper than the complexity.

---

## 6. Validation — who checks what, and when

Valid JSON is necessary but not sufficient. There are four validation points, and each has a
distinct failure handling:

| Point | What is checked | On failure |
|---|---|---|
| **V1 front end, pre-deploy** | schema version, expression usage, unknown `sub_type`, image reference closure, per-file size, total size vs capacity | block the deploy, show findings (extends F2) |
| **V2 device, per file** | parses with cJSON, re-serialises, size within cap, hash of body matches header | `422`, file not staged; the transaction stays open for a retry |
| **V3 device, at commit** | all files present, all hashes match `index.json`, every referenced bitmap has an image, optional trial `dynui_validate_screen()` | `422` with a problem list; **nothing is activated** |
| **V4 device, at boot and at render** | `commit.json` CRC, `index.json` parse, each screen parse on first use | skip that screen → other slot → Tier 0; increment strike counter |

The reason V3 matters: V2 can only prove each file is *individually* well-formed. V3 is the first
point where "the set as a whole is renderable" can be judged, and it is still before anything is
activated.

---

## 7. Front-side work
Yes, the front project needs changes. The existing design already lists F1–F6
(`phase2-device-renderer-design.md` §6.2). This document adds the lifecycle items:

| # | Change | File(s) | Why |
|---|---|---|---|
| **F1** | export contract test (snapshot fixture) | `src/lib/t3-eez-studio/project-editor/build/__tests__` | guard the device contract |
| **F2** | pre-deploy compatibility + schema check | `deployService.ts` (new `checkDeviceCompatibility()`) | blocks deploys the device will reject |
| **F3** | read back `/device/status` after deploy | `design-hub/components/DeployDeviceDrawer.tsx` | turns "did it paint?" into a visible step |
| **F4** | tolerate a missing screen on import | `device-import.ts` | one 404 must not abort a project import |
| **F5** | delete/prune screens and images | `device-rest-client.ts`, deploy UI | 1 MiB of SPIFFS fills up |
| **F6** | doc corrections (`DEVICE_REST_API_DISPLAY.md` shape) | firmware repo doc | the documented "canonical" JSON is not what the device produces |
| **F7** | transactional deploy client: `beginDeploy()`, `stageFile()`, `commitDeploy()`, `abortDeploy()`, `getDeployStatus()` | `device-rest-client.ts` (new section next to `:451-468`) | all-or-nothing |
| **F8** | orchestrator: capacity preflight → begin → stage with progress → commit → verify | `deployService.ts` (replaces the loop at `:357-456`) | one code path, resumable |
| **F9** | capacity panel and revision display | `DesignHubPage.tsx`, `ProjectDetailPage.tsx`, `designHubStore.ts` | users see why a deploy is refused |
| **F10** | "Reset to factory (0.0)" becomes explicit, with confirmation and post-reset read-back | `DesignHubPage.tsx:509-519` | matches the version model in §13 |
| **F11** | send and record `revision` + `schema` in the manifest | `deploy-manifest.ts`, `deployService.ts:153` | enables stale-device detection |
| **F12** | mock device implements the transaction endpoints | `api/src/eez_studio/bacnet_api_mock.rs` | the flow is testable without hardware |

F7/F8 are the only structurally new code; F1–F6, F9–F12 are extensions of things that already exist.

---

## 8. How the device renders what it received
```text
  deploy commit
      └─ dynui_request_rebuild("home_screen")        queue, return immediately
             │
             ▼  next LCD-task iteration
  dynui_build_screen(name)
      ├─ read  <active_slot>/screens/<name>.json  (≤ 512 KiB)
      ├─ cJSON_Parse                              fail → DYNUI_E_PARSE
      ├─ create LVGL objects from `widgets` tree  fail → DYNUI_E_NOWIDGET
      ├─ resolve bitmaps from the image registry  missing → placeholder + warning
      ├─ lv_screen_load_anim(new_screen, …)
      └─ free the JSON text and tree (paint happens from LVGL objects)
```

Key points for the deploy layer:

- the response to `POST /commit` means **"persisted and accepted for rendering"**. `applied: true` is
  only set when the rebuild finished inside the request (a small synchronous rebuild; the design
  allows a short wait, e.g. 800 ms), otherwise the client reads `/device/status`.
- the renderer must **never** see a file that V2 did not verify; that is guaranteed because staging
  only renames a file after the full write succeeded and the hash matched.
- a screen that fails to build does **not** invalidate the deploy: the other screens remain usable,
  and the failed one falls back to its Tier 0 version.

**Important:** until the Phase 2 renderer exists (`dynui.c` etc.), everything above is storage
plumbing with no visible effect — the panel keeps drawing the compiled UI. That is exactly why
decision D2 (parallel with fallback) was made, and it also means the deploy lifecycle can be
built and tested **before** the renderer, with the effect measured through `/device/status` and the
paint only arriving when the renderer lands.

---

## 9. Images and icons
### 9.1 Today

- stored as `/spiffs/images/<name>.json`, one file per image
- content: `{ name, width, height, color_format, png_base64, data_base64 }`
- screens reference them by **name** (`bitmaps[]`, `src`, `img_released`, `img_pressed`)
- uploaded separately, before screens (`device-rest-client.ts:423-459`)
- only `name` and `data_base64` are sent (`:547-562`)
- decoded on the device; requires `CONFIG_LV_USE_LODEPNG=y` and a larger `CONFIG_LV_CACHE_DEF_SIZE`
  (4 KB today — `phase2-device-renderer-design.md` §4.10)

### 9.2 Rules this design adds

| Rule | Reason |
|---|---|
| Images are part of the transaction, staged **before** screens | a screen must never reference an image that is not committed alongside it |
| `bitmaps[]` closure is verified at **commit** (V3) | catches a forgotten icon before it becomes a blank box on the panel |
| A staged image is hashed on the device and compared with the front-end hash | the front end already hashes for diffing; the same value now proves the transfer |
| Per-image cap (proposal: 32 KB base64, i.e. ~24 KB PNG) | a 512 KiB icon would blow the LVGL cache and the transient heap |
| Unused images are prunable (`DELETE /images/<name>`) and are garbage-collected on commit | SPIFFS is small; orphaned icons are the fastest way to fill it |
| Missing image at render time → drawn placeholder + `DYNUI_E_NOASSET`, **not** a failed screen | one bad icon must not cost the whole page |
| Image identity = name; a rename is a delete + add | keeps the reference model simple and greppable |

---

## 10. Corruption and partial deploys
### 10.1 The eight ways a screen set can be damaged

| # | Damage | Detected by | Result |
|---|---|---|---|
| 1 | body truncated in flight | HTTP `Content-Length`, then hash (V2) | `422`, file not staged |
| 2 | body is not JSON | cJSON parse (V2) | `422` |
| 3 | valid JSON, wrong shape | schema + `dynui_validate_screen()` (V1/V3) | `422` at commit, nothing activated |
| 4 | write interrupted by power loss | temp file + rename; `index.json` not updated | orphan temp file removed at boot |
| 5 | power lost during `commit` | `commit.json` CRC and `record` field | old or new record wins; both are complete sets |
| 6 | SPIFFS bit rot / flash fault | hash in `index.json` at boot | affected screen treated as missing → Tier 0 version |
| 7 | file deleted out of band | `index.json` lists it, file absent | same as 6 |
| 8 | a screen references a missing image | V3 closure check at commit; `DYNUI_E_NOASSET` at render | `422` at commit; placeholder at render |

### 10.2 The two-strike rule

A screen that fails to build twice in a row is quarantined:

```text
 build fails for screen X
   ├─ strike[X] += 1  (NVS key dynui_bad_<name>)
   ├─ if strike[X] >= 2  →  mark X as quarantined in NVS
   │                        render X from Tier 0 for the rest of this boot
   │                        report X in /device/status.last_error and in the screen list as {state:"quarantined"}
   └─ a successful deploy of X clears strike[X] and the quarantine flag
```

If the **boot screen itself** is quarantined, or the renderer fails twice before painting anything,
`dynui_off=1` is set and the device boots straight to Tier 0 (already designed in §4.8 of the
renderer doc). It is cleared by `POST /reset-defaults` or by a successful commit.

### 10.3 Boot-time repair

Today a corrupt but non-empty file is never repaired, because seeding only tests existence and size
(`screen_flash_store.c:265-278`). This design replaces the seeding rule with:

```text
 for each default screen D:
     if D missing in the active slot                → copy from the compiled seed
     else if hash(D) != hash in index.json          → quarantine, copy from the compiled seed
     else if cJSON parse of D fails                 → quarantine, copy from the compiled seed
```

So a default screen can always be restored **from the compiled image**, without a format and
without a network connection. Only screens that are *not* part of the compiled set (user-created
pages) can be lost, and they are recoverable from the front end's manifest.

---

## 11. Storage, capacity and out-of-space
### 11.1 The partition must grow

Today: `screen_data` = 1 MiB at `0x780000` (`temco_partitions.csv:20`). The compiled default set is
expected to seed to roughly 0.47 MB (`phase2-device-renderer-design.md`, acceptance step D1), and two
full slots would need ~0.95 MB — leaving nothing for user pages, extra images or staging overhead
(SPIFFS also loses usable space to its page structure: the device already reports `total=934 KB` for
a 1 MiB partition).

Proposal: **enlarge `screen_data` to 2 MiB**:

```text
 screen_data, data, spiffs, 0x780000, 0x200000      # 0x780000 .. 0x980000
```

Nothing follows it in either partition table (`temco_partitions.csv` says "used till 0x880000";
total flash is 32 MiB), so this is a pure gain of 23.5 MB → 22.5 MB unused. Cost: one
`partition-table.bin` reflash plus the first boot after it, which re-formats `screen_data` and
re-seeds.

Budget with 2 MiB:

| Item | Bytes |
|---|---:|
| Slot A (13 screens + 22 images) | ~486,000 |
| Slot B (same) | ~486,000 |
| `index.json` × 2 + `commit.json` | ~8,000 |
| **Free for user pages / new icons** | **~1,070,000** |
| Reserved floor (never allocated to a deploy) | 65,536 |

### 11.2 Capacity protocol

`GET /api/eez-device/storage/capacity`

```json
{ "partition": "screen_data", "total": 2088960, "used": 486400, "free": 1602560,
  "slot_free": 802560, "reserved": 65536, "max_file": 262144,
  "slots": { "A": { "revision": 2, "bytes": 486400 }, "B": { "revision": 0, "bytes": 0 } } }
```

Rules:

1. the front end computes the size of the set **before** uploading and refuses locally, with the
   numbers, if `slot_free - reserved` is not enough (this is F9's capacity panel);
2. the device enforces the same rule at `begin` (`507`) and again at commit, because the header can
   lie or another client may have raced;
3. `begin` reserves the slot, so two concurrent deploys cannot both believe they fit (`409`);
4. a deploy may never consume the reserved floor — it exists so the device can always write
   `commit.json`, `index.json` and the boot-log recovery files;
5. `max_file` (proposal 256 KiB) is below the 512 KiB HTTP body limit, so a single huge screen is
   rejected early with `413` rather than failing mid-write.

### 11.3 When it still runs out

| Situation | Behaviour |
|---|---|
| set does not fit | `507` at `begin` with `required`/`available`; nothing uploaded |
| runs out mid-staging | the failing file returns `507`; the transaction stays open, the client may prune and retry, or `abort` |
| `commit` would cross the floor | `507 no_space_after_commit`; nothing activated |
| orphans accumulate | `commit` garbage-collects images not referenced by any committed screen |
| SPIFFS fragmentation makes a small file fail | `write_file_atomic()` retries after unlinking its own temp files; then returns `ESP_ERR_NO_MEM` → `507` with a hint to `reset-defaults` |

---

## 12. Feedback to the front end
Three levels, each answering a different question:

| Level | Mechanism | Question it answers |
|---|---|---|
| per file | response of `PUT /deploy/<id>/file` | did this screen transfer intact? |
| per deploy | response of `POST /commit` | did the set as a whole become active? |
| per device state | `GET /device/status` | is the panel actually drawing it, and what is it drawing? |

The front end must treat these as distinct: a `200` on commit is **persisted**, not **painted**
(the renderer doc's §4.7.2 rule). The deploy drawer therefore shows:

```text
 Deployed to 10.0.0.37    revision 3   slot B
 ✓ 22 images         ✓ 13 screens      ✓ committed
 ⏳ verifying        →  GET /device/status
 ✓ dynamic, home_screen, build_ok   412 ms
```

and on failure:

```text
 ✗ commit rejected — nothing was changed on the device
   • images/fan_on: missing
   • screens/main_menu: unparseable
   The device is still running revision 2 (slot A).
```

`last_error` strings come from the renderer's error taxonomy (`DYNUI_E_*`), so support can read the
status endpoint and know the tier and the reason without a serial cable.

---

## 13. Versions, the seed, and factory reset
### 13.1 Model

| Concept | Where it lives | Mutable? |
|---|---|---|
| **Seed 0.0** | compiled into the application image (`ui_init()` + `DefaultScreens/*.json` embedded) | no |
| **Revision N ≥ 1** | active slot + `commit.json` | yes, by deploy |
| **Front-end version string** (e.g. `2.4.1`) | sent with `begin`, stored in `commit.json`, displayed by Studio | metadata only |

The device's `revision` is an integer counter, not the marketing version string. It exists to
answer "is the device newer or older than what I have in the browser" and to order deploys; the
human-readable string travels alongside it.

Rules:

1. `revision` in `begin` must be **greater** than the device's current revision, unless the request
   carries `"force": true` (explicit downgrade in the UI).
2. `reset-defaults` sets the device back to **revision 0** and removes both slots — i.e. it *is*
   the factory reset to seed 0.0, not a special case.
3. Seed 0.0 is never stored in SPIFFS, so it can never be corrupted, deleted or filled with user
   content. This is what makes "there is always something to fall back to" true by construction.
4. Because the seed is compiled, **upgrading the application firmware updates the seed too**. A
   device at revision 0 therefore reflects the firmware it is running — worth stating in the UI:
   *"Factory screens (0.0) — from firmware fc13533"*.

### 13.2 What happens to 1.0 → 2.0 → 3.0

```text
 revision 1  active slot A   revision 2  active slot B   revision 3  active slot A
 ───────────  ─────────────  ───────────  ─────────────  ───────────  ─────────────
 deploy 1  → stage B, commit → A=1        (B holds 1)
 deploy 2  → stage A, commit → B=2        (A holds 1 until commit, then overwritten)
 deploy 3  → stage B, commit → A=3
```

So the device always keeps **the active set plus the previous one** on disk — that is the LKG
safety net — and the slot that is two revisions old is recycled. Nothing accumulates, so 3.0 cannot
be blocked by 1.0 or 2.0 still being present.

### 13.3 Factory reset semantics

`POST /api/eez-device/reset-defaults` (exists today, `dynamic_display_api.c:855-881`):

1. abort any open transaction;
2. write `commit.json` with `revision: 0, slot: null` (the atomic step);
3. format the `screen_data` partition and re-mount;
4. re-seed the compiled defaults into slot A and write `index.json`;
5. clear `dynui_off` and all strike counters;
6. rebuild the UI;
7. answer `{ ok: true, revision: 0, tier: 1 }`.

The front end's "Reset to factory" should require a typed confirmation, then read `/device/status`
and show `revision 0` — that is the visible proof the device really went back to the seed.

---

## 14. The remaining situations
| # | Situation | Device behaviour | Front-end behaviour |
|---|---|---|---|
| S1 | Wi-Fi drops mid-upload | staging slot discarded at next boot; LKG untouched | resume via `GET /deploy/<id>`, which lists what is already staged |
| S2 | Power lost mid-upload | same as S1 | same |
| S3 | Power lost during `commit` | record CRC decides old-or-new; both sets complete | on reconnect, compare `revision` from `/device/status` |
| S4 | Two Studio tabs deploy at once | second `begin` → `409` with the open `deploy_id` | show "another deploy is in progress", offer to take over |
| S5 | Same deploy clicked twice | second `begin` sees identical `revision` + hash → `200` with `noop: true` | show "device already at revision 3" |
| S6 | Explicit downgrade to an older set | allowed only with `force: true` | confirmation dialog |
| S7 | Deploy older **schema** than the device supports | `422 schema_unsupported` | tell the user to update Studio |
| S8 | Device has no clock | revisions are monotonic integers; timestamps are optional and never compared | never rely on device time |
| S9 | Watchdog during a long parse | parsing happens on the dynamic-display task with WDT feeding at file boundaries; a screen exceeding the parse budget is rejected at V3 | per-file cap prevents it |
| S10 | Heap exhaustion during a build | `DYNUI_E_MEM`; screen falls back to Tier 0; no reboot | report `last_error`, suggest fewer widgets |
| S11 | Image decode failure | placeholder drawn, `DYNUI_E_NOASSET` | banner in the deploy result |
| S12 | Screen references a deleted image | prevented by V3 closure check | blocked before upload |
| S13 | User deletes a screen in Studio | not deployed unless pruning is requested (F5) | "removed pages are not pruned" warning until F5 |
| S14 | Device is a different model/revision | `/device/info` model + `schema` gate | show the model, refuse a mismatched project |
| S15 | Brownout mid-deploy (this board really does it — see the firmware troubleshooting doc) | same guarantees as power loss; every write is temp+rename and the commit record is one small write | resume or redeploy |
| S16 | Flash wear from frequent deploys | deploys write whole files; the commit record is 64 bytes. Optionally skip commit if the index hash is unchanged | debounce repeated identical deploys |
| S17 | Someone edits SPIFFS by other means (future serial console) | hash mismatch detected at boot → repair from seed | none |
| S18 | Firmware downgrade below the renderer version | renderer reports `schema` support; deploy refuses incompatible sets | show firmware version and required schema |

---

## 15. Test plan
Fault injection is the point of this section: every guarantee in §4 gets a test that breaks it on
purpose.

| # | Test | How | Pass criterion |
|---|---|---|---|
| L1 | Atomic single-file write | write a 400 KiB screen, cut power at 50 % (bench relay or `esp_restart` injected at the write hook) | old file still intact; no zero-length file; boot log shows the orphan temp removed |
| L2 | Corrupt file repair | truncate `screens/home_screen.json` to 100 bytes, reboot | screen repaired from the compiled seed; panel shows home; log names the repair |
| L3 | Commit atomicity | call `commit` with power cut after `index.json` but before `commit.json` | device boots the **old** revision; staging slot discarded |
| L4 | Validation blocks activation | stage a set with `sub_type: "nonsense"` | `422` with the screen named; `revision` unchanged; panel unchanged |
| L5 | Missing image closure | deploy a screen referencing `fan_on` without the image | `422` at commit listing `images/fan_on` |
| L6 | Capacity preflight | deploy a set larger than `slot_free - reserved` | `507` at `begin`; **zero** bytes written |
| L7 | Mid-staging overflow | fill the slot, then stage more | `507` on the failing file; `abort` restores `free` |
| L8 | Resume | kill the HTTP client after 5 of 16 files, reconnect | `GET /deploy/<id>` lists 5 staged; re-staging them is idempotent; commit succeeds |
| L9 | Concurrent deploy | two clients call `begin` | second gets `409` |
| L10 | Duplicate deploy | run the same deploy twice | second is `noop`; no revision bump |
| L11 | Tier fallback | after L4, rename `commit.json` | boot lands on Tier 0, panel usable |
| L12 | Two-strike quarantine | deploy a screen whose build always fails | after two builds it is quarantined; other screens fine; status lists it |
| L13 | Factory reset | `POST /reset-defaults` with a partially staged deploy open | transaction aborted, revision 0, seed re-seeded, `dynui_off` cleared |
| L14 | Downgrade | deploy revision 2 to a device at 3 | refused; with `force` accepted and revision becomes 4 (monotonic, not 2) |
| L15 | Rollback of the previously good set | after a successful 3, deploy a broken 4 | revert = redeploy 3's content; device must accept it as revision 5 |
| L16 | Long soak | 50 deploys in a row, checking `free` and `revision` each time | `free` returns to a stable value (no leak), no orphan growth |
| L17 | Images | deploy with a renamed icon | closure check passes, old icon garbage-collected, panel shows the new one |
| L18 | Render read-back | deploy one label change | `/device/status` shows `applied: true`, `current_screen` correct within 1 s |

L1, L3 and L11 should be run on real hardware — they are the three that decide whether the
"always working" claim is real.

---

## 16. Layer dependency

Each layer is independently verifiable, and requires only the layers above it:

| Phase | Scope | Testable without the renderer? |
|---|---|---|
| **L-1** | partition table: `screen_data` → 2 MiB | yes (boot log shows the new `total`) |
| **L0** | `write_file_atomic()` (temp + rename), `index.json`, boot-time repair | yes (L1, L2) |
| **L1** | `commit.json`, two slots, begin/stage/commit/abort endpoints | yes (L3–L10, L16) |
| **L2** | capacity endpoint, reserved floor, per-file caps, garbage collection | yes (L6, L7, L17) |
| **L3** | revision, `/device/status` (storage half), reset semantics | yes (L13, L14) |
| **L4** | front-end transaction client + orchestrator + capacity panel | yes, against the mock (F7–F9) |
| **L5** | renderer integration: `dynui_validate_screen()`, `dynui_request_rebuild()`, applied/pending | no — needs Phase 2 D8/D9 |
| **L6** | two-strike quarantine, `dynui_off` | no — needs the renderer |

Everything through L4 is measurable through the REST surface and the boot log alone, which is a
useful property: the storage and protocol work can ship and be soak-tested before the renderer
exists.

---

## 17. Where the code changes

### 17.1 Firmware — `T3-programmable-controller-on-ESP32`

| File | Change |
|---|---|
| `temco_partitions.csv:20` | `screen_data` 0x100000 → 0x200000 |
| `components/temco_dynamic_display/src/screen_flash_store.c` | `write_file_replace()` `:181-249` → `write_file_atomic()` (temp + rename + dir sync); add `screen_store_begin/stage/commit/abort`, `screen_store_capacity()`, `commit_record_read/write()`, `index_read/write()`, `repair_from_seed()`; replace `seed_default_screens_if_empty()` `:259-290`; extend `screen_store_reset_to_defaults()` `:564-606` |
| `components/temco_dynamic_display/src/screen_flash_store.h:13-57` | new API declarations |
| `components/temco_dynamic_display/src/dynamic_display_api.c` | new handlers (`deploy/begin|file|commit|abort`, `storage/capacity`, `device/status`, `DELETE /screens/*`, `DELETE /images/*`), route table `:929-943`, schema gate at `:461-471`, error codes replacing bare 500s at `:568-603` |
| `components/temco_dynamic_display/src/dynui.c` (Phase 2) | `dynui_validate_screen()`, `dynui_request_rebuild()` returning a result, `dynui_status_t`, strike counters |
| `components/temco_dynamic_display/DEVICE_REST_API_DISPLAY.md` | document the transaction endpoints (and apply the §6.5 correction from the renderer doc) |
| `main/nvs_keys.h` (or equivalent) | `dynui_off`, `dynui_bad_<name>`, `dynui_revision` |

### 17.2 Front end — `T3000Webview`

| File | Change |
|---|---|
| `src/lib/t3-eez-studio/project-editor/build/device-rest-client.ts:451-468` | add `beginDeploy/stageFile/commitDeploy/abortDeploy/getDeployStatus/getCapacity/getDeviceStatus/deleteScreen` |
| `src/t3-react/features/design-hub/services/deployService.ts:357-456` | replace the per-file loop with the transaction orchestrator; preflight capacity; resume |
| `src/t3-react/features/design-hub/services/deployService.ts:153` | `MANIFEST_HASH_VERSION` → 3, add `revision` and `schema` |
| `src/t3-react/features/design-hub/store/designHubStore.ts:326-368` | record revision/slot/tier and surface them |
| `src/t3-react/features/design-hub/pages/DesignHubPage.tsx:200-254,509-519` | capacity panel, revision display, factory-reset confirmation |
| `src/t3-react/features/design-hub/components/DeployDeviceDrawer.tsx` | four-stage progress + `/device/status` verification step |
| `api/src/eez_studio/bacnet_api_mock.rs:347-418` | implement the transaction endpoints in the mock so the flow is testable without hardware |
| `api/src/eez_studio/mod.rs:1618-1671` | route additions for the mock |

---

## 18. Open decisions

| # | Question | Options | Recommendation |
|---|---|---|---|
| Q1 | Enlarge `screen_data` to 2 MiB? | 2 MiB / 3 MiB / keep 1 MiB and single-slot | **2 MiB** — two slots are the whole safety story; 1 MiB cannot hold them |
| Q2 | Single-file cap | 128 KiB / 256 KiB / 512 KiB | **256 KiB** — the largest default screen is reported at 153 KB |
| Q3 | Reserved floor | 32 / 64 / 128 KiB | **64 KiB** |
| Q4 | Synchronous rebuild on single-screen deploy? | wait up to 800 ms for `applied:true`, or always answer `pending` | **wait up to 800 ms** — most screens build in ~400 ms |
| Q5 | Downgrade policy | refuse / `force` flag / always allow | **`force` flag with UI confirmation** |
| Q6 | Prune removed screens automatically on a full deploy? | never / only with an explicit toggle | **explicit toggle**, default off until F5 ships |
| Q7 | Keep the old single-file `PUT /screens/<name>` fast path? | yes / deprecate | **yes** — it is what the editor's per-screen save uses |
| Q8 | Do we want image de-duplication by hash? | no / yes (saves flash, complicates names) | **no** for now; revisit if images dominate usage |

---

## 19. Risks

| Risk | Mitigation |
|---|---|
| The 0.47 MB seed estimate is wrong and two slots do not fit even at 2 MiB | measure first (§16, L-1); the capacity endpoint reports the real numbers; the partition can go to 3 MiB |
| SPIFFS `rename()` is not atomic across a power cut on this flash | the commit record, not the rename, is the atomic step; a broken staged slot is discarded at boot |
| Enlarging the partition invalidates existing devices' screen data | it is re-formatted and re-seeded on first boot by design; the compiled seed survives |
| Renderer latency makes `applied:true` unreliable | the client falls back to polling `/device/status`; the field is advisory |
| Two-slot logic doubles the code paths through the store | one staging implementation serves both the transaction API and the single-screen fast path |
| Front-end and device schema drift | F1 snapshot test + the `schema` field in the envelope + V1/V2 checks |

---

## 20. Implementation status

What is on disk as of this revision. Layers are the ones defined in §16.

### 20.1 Landed

| Layer | Where | State |
|---|---|---|
| L-1 partition | `temco_partitions.csv` in **both** firmware repos (`screen_data` 1 MiB → 2 MiB at `0x780000`) | done, both projects rebuilt |
| L1 store | `screen_flash_store.c`: atomic `write_file_replace()` (write `.tmp` → fsync → unlink → rename), `file_looks_complete()`, `recover_pending_writes_in()`, slot-aware `screens_dir()` / `images_dir()` | done |
| L2 transactions | `screen_transaction.c` / `.h`: two slots, `commit.json` (CRC-guarded), `deploy.json` marker, per-slot `index.json` with SHA-256, `begin` / `stage` / `commit` / `abort` / `reset_to_seed` | done |
| L3 REST | `screen_deploy_api.c` / `.h`: `GET /storage/capacity`, `GET /device/status`, `POST /deploy/begin`, `PUT /deploy/<id>/file`, `POST /deploy/<id>/commit\|abort`, `GET /deploy/<id>`; handler budget raised to 32 | done |
| L4 front end | `device-rest-client.ts`: `getCapacity()`, `getStatus()`, `beginDeploy()`, `stageFile()`, `commitDeploy()`, `abortDeploy()`, `deployTransactional()`; `deployService.ts`: `tryTransactionalDeploy()` used first, per-file push kept as the fallback for older firmware | done |
| Mock | `bacnet_api_mock.rs` + `mod.rs` routes: all seven endpoints, with the same validation the device applies at commit | done |

Guarantees now enforced on the device:

- an interrupted deploy never changes what the panel shows — the previous slot keeps serving until `write_commit()` succeeds;
- a commit with **no screens** is rejected (`screens/* : empty`), so an empty set can never become active;
- a commit whose indexed files are missing or unparseable is rejected with a per-file `problems[]` list;
- a screen that names a bitmap which was not staged is rejected (`images/<name> : missing`);
- a failed `reset_to_seed()` leaves the device on the previous revision;
- a missing or corrupt `commit.json` at boot adopts a slot that still has a non-empty index instead of wiping both;
- `abort` only discards the staging area of the transaction it names, so a stale abort from a second client cannot wipe a newer deploy;
- `slot_free` in `/storage/capacity` counts the space the wipe reclaims, so a 2 MiB partition can hold a full set in each slot.

### 20.2 Deliberate deviations

| Item | Design (§) | As built | Why |
|---|---|---|---|
| `applied` | true once the screen is on the panel (§5.3) | always `false` | there is no dynamic renderer yet; `false` is the honest answer until L5/L6 |
| `noop` outcome | unchanged set is a no-op commit (§5.3) | not implemented | the front end skips the deploy when the manifest says nothing changed |
| `GET /deploy/<id>` | full staged-file list for resume (§5.3) | `{deploy_id, active_slot, revision}` | resume is not wired yet; a retry re-stages the whole set |
| Legacy `PUT /screens/<name>` | routed through the transaction (§5.3) | still writes straight into the active slot | the editor's per-screen save path is unchanged (Q7); it is not apply-then-crash-safe |
| Downgrade `force` flag | Q5 | `begin` rejects `revision <= current` with 409 | the flag can be added without breaking the wire format |

### 20.3 Not started

- L5/L6: the device-side renderer and `applied` reporting (§8).
- The capacity / revision display in `DesignHubPage.tsx`, `DeployDeviceDrawer.tsx`, `designHubStore.ts` — `deployEezProject()` already returns `revision` for it.
- The end-to-end test suite of §15 (the two PowerShell scripts exercise the HTTP surface only).

