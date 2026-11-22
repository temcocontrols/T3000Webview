# Device renderer — specification

**Applies to:** specification — not implemented. The panel currently draws the compiled UI
(`ui_init()`); no code reads screen JSON for display yet. Storage and transport are shipped
and described in [device-interface-deployment-via-bacnet-design.md](device-interface-deployment-via-bacnet-design.md).

> **Status:** design, approved for review. No firmware or front-end code has been written yet.
>
> **Goal of Phase 2:** close the loop.
>
> ```
> device boots → display REST API up → editor pulls JSON → renders in browser
>   → user edits → Deploy to Device → device re-renders the new JSON on the LCD
> ```
>
> Phase 1 (done) moved the JSON in both directions. Phase 2 makes the last arrow real:
> **the panel draws the JSON it received.**

| Decision | Value |
|---|---|
| Renderer scope | **Literal rendering only** — no expression evaluation, no data binding in this phase |
| Relation to compiled UI | **Parallel** — dynamic screen if a valid JSON screen exists, compiled SquareLine screen otherwise (never brick the panel) |
| Storage | Partition table of the **main app** (`temco_partitions.csv`): `screen_data` SPIFFS 1 MB @ `0x780000` |
| Delivery | HTTP REST (`/api/eez-device/*`) — unchanged |
| Firmware owner | T3 hardware team. This document is the hand-over spec. |

Non-goals for Phase 2: expression engine (`text_type: "expression"`, `value_type`, `checked_type`),
EEZ Flow actions beyond the two the exporter can emit, `user_widget`, animations beyond
`screen_change` transitions, and rendering of the *editor* (`.eez-project`) format — the device
only ever sees the device-native format described in §3.

> **Companion documents.** This file defines *what* the renderer must accept. The *where and how*
> live in [phase2-firmware-implementation-guide.md](phase2-firmware-implementation-guide.md)
> (device: file-by-file changes with reference code) and
> [phase2-host-implementation-guide.md](phase2-host-implementation-guide.md) (front end: the
> compatibility check, import tolerance, status read-back, contract tests). If you are new to the
> firmware repository, read
> [firmware-developer-onboarding.md](firmware-developer-onboarding.md) first.

---

## 1. The loop, actor by actor

| # | Step | Actor | Exists today | After Phase 2 |
|---|---|---|---|---|
| 1 | Boot → `lv_init()` → display driver | `main/LCD_Driver/lcd_task.c` | yes | unchanged |
| 2 | Mount `screen_data`, seed defaults | `components/temco_dynamic_display` | yes, but **after** the UI starts | moved **before** the first render (§4.4) |
| 3 | Start REST API on port 80 | `dynamic_display_api_start()` | yes, on `IP_EVENT_STA_GOT_IP` | unchanged |
| 4 | Build the UI from JSON | — | **missing** | **new: `dynui` module** (§4) |
| 5 | Editor pulls screens | `device-import.ts` | yes | unchanged |
| 6 | Editor renders them | LVGL WASM in browser | yes | unchanged |
| 7 | User edits, Deploy | `deployService.ts` | yes | + optional compatibility check (§6.3) |
| 8 | Device applies and re-renders | — | **missing** | **new: rebuild queue** (§4.7) |

---

## 2. Confirmed decisions and their consequences

**D1 — Literal only.** Every `obj_text` is rendered as a literal string. A value whose
`text_type` is `"expression"` is rendered as its raw source text and logged once per screen.
Consequence: dynamic values (temperature, setpoint) do **not** update from device data in this
phase; they still come from the compiled UI. A project that relies on expressions renders, but
looks static. The pre-deploy check in [phase2-host-implementation-guide.md](phase2-host-implementation-guide.md) warns about it before the deploy.

**D2 — Parallel, with auto-fallback.** The compiled screens stay compiled and stay flashed. At
boot the renderer *tries* the JSON; on any failure it falls back to `ui_init()`. On a bad deploy
the panel keeps the previous screen instead of going blank.

**D3 — `screen_data` must exist.** Both partition tables declare `screen_data` at `0x780000`, size `0x100000` (1 MiB): `temco_partitions.csv:20` and the shipped `partition-table.bin` (decoded from the bootloader package). A unit flashed with a table that lacks it cannot mount the filesystem, and every screen endpoint answers 404 or 500.
declares `screen_data @0x780000 size 0x100000`. The `T3_Bootloader` table does not. If a unit is
flashed from the bootloader's table, `esp_vfs_spiffs_register("screen_data")` fails and Phase 2
cannot work — the API would answer 404/500 for every screen. **This must be verified on a real
unit before firmware work starts** (§5).

**D4 — `x_pos`/`y_pos` are offsets when `align` is present.** 373 of the 389 widgets in the
default screens carry `align`; for those, the pair is an offset from the alignment anchor, not an
absolute coordinate (format reference §5). `0` for `width`/`height` means `LV_SIZE_CONTENT`.

**D5 — Images are decoded on the device.** PNG decoding and LVGL filesystem drivers are currently
switched off; enabling the PNG decoder is the smallest change that makes the 22 bitmaps and 26
image widgets appear. Converting to LVGL `.bin` at deploy time is a later optimisation (§4.10).

**D6 — Device JSON is the only input.** The device never parses `.eez-project`. The mapping
`.eez-project → device JSON` is owned by the front end (`firmware-export.ts`) and already exists.

---

## 3. The payload the renderer accepts

The document shape is defined once, in
[../bacnet-api/screen-json.md](../bacnet-api/screen-json.md). The renderer implements that
contract; it does not redefine it. Three consequences matter here:

1. when `align` is present, `x_pos`/`y_pos` are **offsets from the anchor** (`lv_obj_align`), not
   coordinates (`lv_obj_set_pos`);
2. `width` or `height` of `0` means `LV_SIZE_CONTENT`;
3. `flex_flow`, `flex_main`, `flex_cross` and `flex_track` arrive at the widget's top level, not
   inside `style`.

Decision **D1** applies to `text_type: "expression"`: the renderer paints the source text and logs
the widget once per screen.

## 4. Device-side design

### 4.1 Modules

New code lives in the existing component so it is versioned with the API that feeds it:

```
components/temco_dynamic_display/
├── include/
│   ├── dynamic_display_api.h          (existing; + storage_init + status)
│   └── dynui.h                        NEW  public surface for the LCD task
├── src/
│   ├── dynamic_display_api.c          (existing; + enqueue rebuild after save)
│   ├── screen_flash_store.c           (existing; unchanged)
│   ├── dynui.c                        NEW  lifecycle: init / show / rebuild / free
│   ├── dynui_widgets.c                NEW  the widget factory (§4.6.2)
│   ├── dynui_style.c                  NEW  the style applier (§4.6.3)
│   ├── dynui_assets.c                 NEW  font + bitmap registries (§4.6.4)
│   ├── dynui_events.c                 NEW  event + action engine (§4.6.6)
│   └── dynui_internal.h               NEW  shared structs
└── CMakeLists.txt                     (+ new SRCS, + esp_http_server already present)
```

The existing `screen_flash_store` stays the only thing that touches SPIFFS; `dynui` reads through
`screen_store_get_screen()` / `screen_store_get_image()` so there is exactly one storage path.

### 4.2 Public API (`dynui.h`)

```c
/* Called once, early, before the first screen is built. Idempotent. */
esp_err_t dynui_init(void);

/* Build a screen from its JSON. Returns ESP_ERR_NOT_FOUND when the screen has
 * no JSON file, so the caller can fall back to the compiled UI. */
esp_err_t dynui_build_screen(const char *screen_name);

/* Explicit screen switch (used by the screen_change action and by the API). */
esp_err_t dynui_show_screen(const char *screen_name);

/* Thread-safe: may be called from the HTTP task. Queues a rebuild and returns
 * immediately; the render happens in the LCD task. */
esp_err_t dynui_request_rebuild(const char *screen_name);

/* Frees the current dynamic screen (used before falling back to compiled UI). */
void dynui_unload(void);

/* True when a dynamic screen is currently displayed. */
bool dynui_is_active(void);

/* Status snapshot for the REST status endpoint (§4.7.3). */
typedef struct {
    bool     dynamic_active;
    char     current_screen[32];
    uint32_t last_build_ms;
    bool     last_build_ok;
    char     last_error[96];
    uint8_t  images_loaded;
    uint32_t heap_used;
} dynui_status_t;
void dynui_get_status(dynui_status_t *out);
```

### 4.3 Data structures

```c
/* One widget key → LVGL object, for "flag_modify" targets. */
typedef struct dynui_node {
    char             key[40];
    lv_obj_t        *obj;
    struct dynui_node *next;
} dynui_node_t;

/* One resolved bitmap. Kept alive for the lifetime of the screen because
 * lv_imagebutton stores the pointer. */
typedef struct {
    char            name[32];
    lv_image_dsc_t  dsc;      /* cf = LV_COLOR_FORMAT_RAW, data = PNG bytes */
    uint8_t        *png;      /* owned, PSRAM */
    size_t          png_len;
} dynui_image_t;

/* Everything owned by one built screen. */
typedef struct {
    char            name[32];
    lv_obj_t       *root;
    dynui_node_t   *nodes;        /* widget key → obj */
    lv_style_t     *styles;       /* array, applied to objects */
    size_t          style_count;
    dynui_image_t  *images;
    size_t          image_count;
    uint32_t        built_ms;
} dynui_screen_t;

/* Rebuild request, passed over a queue. */
typedef enum { DYNU_REBUILD, DYNU_SHOW, DYNU_UNLOAD } dynui_msg_kind_t;
typedef struct { dynui_msg_kind_t kind; char screen[32]; uint32_t generation; } dynui_msg_t;
```

`generation` coalesces bursts: if a deploy writes three screens, only the newest request for the
visible screen is rendered.

### 4.4 Boot sequence (what changes)

```
Lcd_Task                                  (main/LCD_Driver/lcd_task.c)
 ├─ lv_init()
 ├─ LCD_RegesterlvglDriver()
 ├─ delay 2 s
 ├─ dynamic_display_storage_init()        ← NEW: mount + seed screen_data
 ├─ lv_Init_UserParameters()              (data-point handles only — no LVGL)
 ├─ dynui_init()                          ← NEW: queue, mutex, **LVGL theme**
 ├─ if (dynui_build_screen("home_screen") != ESP_OK)
 │      ui_init();                        ← compiled fallback (D2)
 └─ loop:
      lv_timer_handler();
      if (!dynui_is_active()) lv_Lcd_UpdateData();   ← compiled screens only
      dynui_process_queue();                        ← NEW: apply deploys
```

Why storage first: today `screen_store_init()` runs inside `dynamic_display_task`, which only
starts after the Wi-Fi STA gets an IP — that is *after* the UI is on screen. Mounting before the
first render removes that ordering dependency and means the first render already has JSON.

Why inside `Lcd_Task` and not `app_main`: `LCD_Init()` + `xTaskCreate(Lcd_Task, …)` is the only
Tstat11-specific block (`app_main.c:4843`). Seeding 476 KB there would also delay BACnet, Modbus
and Wi-Fi start-up. `screen_store_init()` is idempotent, so the API server's later call is a no-op.

**Three integration facts that are easy to get wrong** (verified in the current firmware):

| Fact | Consequence |
|---|---|
| `ui_init()` does **two** things: creates the 12 compiled screens **and** calls `lv_theme_default_init()` + `lv_display_set_theme()` | skipping `ui_init()` leaves LVGL with **no theme** → widgets render unstyled. The renderer must set the same theme itself (`dynui_theme_init()`). |
| `lv_Lcd_UpdateData()` guards every access with `UI_OBJ_READY(obj)` = `(obj != NULL && lv_obj_is_valid(obj))` | it is **safe** to run with no compiled screens; no need to stub it out. |
| `lv_Init_UserParameters()` only calls `put_io_buf(...)` to build data-point handles | it touches no LVGL object → must still be called in dynamic mode. |

Seeding writes 476 KB of defaults on a blank partition (13 screens + 22 images); it must happen
before the first render, and the boot splash must tolerate the extra ~1–2 s.

### 4.5 Threading model

| Task | May call LVGL? |
|---|---|
| `Lcd_Task` (priority `tskIDLE_PRIORITY+1`) | **yes — only here** |
| `httpd` task (inside `dynamic_display_task`) | **no** — only `dynui_request_rebuild()` |
| everything else | no |

- Queue: `xQueueCreate(4, sizeof(dynui_msg_t))`, drained by `Lcd_Task` after `lv_timer_handler()`.
- A `dynui_process_queue()` iteration does at most one build (bounded work per frame).
- `dynui_is_active()` / `dynui_get_status()` take a short mutex; they are read by the HTTP task
  and must never block on a build.
- Rationale and the same rule are already stated in the deployment design:
  *"Screen updates are queued; the LVGL task applies them on the next render cycle."*
  ([device-interface-deployment-via-bacnet-design.md §6.7](device-interface-deployment-via-bacnet-design.md))

### 4.6 Build pipeline

`dynui_build_screen(name)` runs six stages. Any failure aborts the build **without touching the
currently displayed screen** (D2).

#### 4.6.1 Load and parse

```c
char *raw = NULL; size_t len = 0;
if (screen_store_get_screen(name, &raw, &len) != ESP_OK) return ESP_ERR_NOT_FOUND;
cJSON *root_obj = cJSON_Parse(raw);
free(raw);                                  /* free the text as soon as the tree exists */
```

Peak memory for the largest screen (`schedule_edit_screen.json`, 153 KB): ~153 KB text + cJSON
tree (roughly 3–4× the text) ≈ 0.6 MB, transient, in PSRAM. The tree is `cJSON_Delete()`d once the
screen is built — the renderer keeps LVGL objects, not JSON.

#### 4.6.2 Screen root and widget factory

```c
typedef lv_obj_t *(*dynui_ctor_t)(lv_obj_t *parent);

lv_obj_t *dynui_create_widget(lv_obj_t *parent, const char *key, const cJSON *w,
                              dynui_screen_t *scr);
```

Order inside `dynui_create_widget` — this order is required by LVGL:

1. Resolve `sub_type`; unknown ⇒ warn once, return `NULL` (children still skipped).
2. Create the object with the correct constructor (format reference §6). For `screen`: `lv_obj_create(NULL)` and
   paint `bg_color`.
3. Apply the 8 base fields (size before position — `LV_SIZE_CONTENT` can change the anchor result).
4. Apply `style` (§4.6.3).
5. Apply `flex_*` if present: `lv_obj_set_flex_flow()` then `lv_obj_set_flex_align()`.
6. Apply `hidden` / `disabled` / `clickable`.
7. Apply type-specific fields (format reference §6).
8. Register `key → obj` in `scr->nodes` (needed by `flag_modify`).
9. Recurse into `children` **after** the parent is fully styled.

`imagebutton` special case (LVGL 9): the widget does not copy sources, it stores pointers, so the
`dynui_image_t.dsc` entries must live as long as the screen. `lv_imagebutton_set_src(obj,
LV_IMAGEBUTTON_STATE_RELEASED, left, mid, right)` requires *three* sources — pass `&dsc` for
left/middle/right (the JSON has a single image per state, not a sliced 3-part button), or `NULL`
for a state the JSON omits. The exporter always fills `img_pressed` (falling back to
`img_released`) and only fills `img_disabled` when the project sets it.

#### 4.6.3 Style applier

```c
void dynui_apply_style(lv_obj_t *obj, const cJSON *style, dynui_screen_t *scr);
```

- Iterate the 6 parts × 4 states actually present.
- Allocate one `lv_style_t` per pair, `lv_style_init()`, run a table-driven `switch` over the 37
  properties (format reference §7), then `lv_obj_add_style(obj, st, part | state)`.
- Unknown property ⇒ `ESP_LOGW` once per name (not once per widget — a 389-widget screen would
  otherwise flood the log).
- Fonts: `text_font` is a *name*; resolve through the font registry; unknown ⇒
  `lv_font_get_default()` + warn.

#### 4.6.4 Asset registries

**Fonts.** Build a static table; no dynamic loading is needed because all fonts are compiled in:

| JSON name | `lv_font_t*` | Availability |
|---|---|---|
| `lv_font_montserrat_10/16/18/30/36/40` | `&lv_font_montserrat_*` | **already enabled** in sdkconfig |
| `Arial80` | `&ui_font_Arial80` | compiled in `main/TemcoScreen/ui_font_Arial80.c` — declare `extern const lv_font_t ui_font_Arial80;` |

**Bitmaps.** For each name in the screen's `bitmaps[]`:

1. `screen_store_get_image(name, &json_text, &len)` → the stored record is
   `{ "name", "width", "height", "color_format", "png_base64": "…", … }`.
2. `cJSON_Parse` → take `png_base64`.
3. `mbedtls_base64_decode()` (already in ESP-IDF) → raw PNG bytes into PSRAM.
4. Fill an `lv_image_dsc_t`:

```c
dsc.header.w = width;  dsc.header.h = height;
dsc.header.cf = LV_COLOR_FORMAT_RAW;   /* tells LVGL "this is an encoded file" */
dsc.header.magic = LV_IMAGE_HEADER_MAGIC;
dsc.data = png_bytes;  dsc.data_size = png_len;
```

5. `lv_image_set_src(obj, &dsc)` (image) or `lv_imagebutton_set_src(...)` (imagebutton).

Missing image ⇒ render the widget without a source and log the name. A screen must never fail to
render because one icon is absent.

#### 4.6.5 `keyboard`

The payload has no textarea reference. Rule: bind the keyboard to the **last textarea created
before it in the same parent subtree**; if none exists, create it unbound and log. This matches
how the seeded screens are built (keyboard follows its textarea in document order).

#### 4.6.6 Events and actions

```c
void dynui_attach_events(lv_obj_t *obj, const cJSON *events, dynui_screen_t *scr);
```

The callback context must outlive the event:

```c
typedef struct {
    dynui_screen_t *screen;
    cJSON          *actions;   /* deep copy owned by the screen, freed on unload */
} dynui_event_ctx_t;
```

`screen_change` resolves the target through the **screen registry** (the 13 canonical names from
`k_screen_slots` in `dynamic_display_api.c`), loads it via `dynui_show_screen()`, and applies
`anim/speed/delay` through `lv_screen_load_anim()`. `delay` (3000 ms on the start-up screen) is
the animation start delay — LVGL's own parameter, no timer needed.

### 4.7 Deploy → visible change

#### 4.7.1 Device path

```
PUT /api/eez-device/screens/<name>
  ├─ screen_store_save_screen()          (unchanged: unlink, write, fsync)
  ├─ remove_alias_screen_files()          (unchanged)
  ├─ dynui_request_rebuild(<name>)        ← NEW: queue, return immediately
  └─ 200 { "name": ..., "status": "ok" } (unchanged shape)
```

`PATCH /screens/:name` and `POST /reset-defaults` call the same hook (`reset-defaults` requests a
rebuild of the current screen, because the files were just replaced).

#### 4.7.2 Guarantee to the client

The HTTP response means **"persisted and accepted for rendering"**, not "pixels are updated".
Rendering completes on the next LCD-task iteration (typically well under a second). The front end
must not poll for pixel state; if it wants proof it may read the status endpoint.

#### 4.7.3 Recommended status endpoint (additive)

`GET /api/eez-device/device/status` → the `dynui_status_t` snapshot:

```json
{ "ui_mode": "dynamic", "current_screen": "home_screen", "last_build_ms": 412,
  "build_ok": true, "last_error": "", "images_loaded": 9, "heap_used": 421888 }
```

Additive only — clients that do not know it are unaffected. It is the cheapest way for the front
end (and for support) to answer "did the panel actually take my deploy?".

### 4.8 Fallback and self-healing

| Situation | Behaviour |
|---|---|
| No JSON for the start screen | `ui_init()` (compiled screens) |
| JSON parse error | keep current screen, set `last_error`, fall back to compiled on boot |
| Two consecutive build failures | set an NVS flag `dynui_off=1`; boot straight to compiled UI (recoverable via `POST /reset-defaults`) |
| Deploy of a broken screen | old screen stays on the display; API returns 200 because the file was stored — this is why the status endpoint matters |
| `POST /reset-defaults` | defaults are re-seeded, NVS flag cleared, current screen rebuilt |

This is what "parallel" buys: **a bad deploy can never leave the panel without a UI.**

### 4.9 Memory budget

| Item | Size | Where |
|---|---|---|
| Display framebuffer (existing) | 480 × 320 × 2 = **307,200 B** | PSRAM |
| Screen JSON text (largest) | 153 KB | PSRAM, transient |
| cJSON tree (largest) | ≈ 450–600 KB | PSRAM, transient |
| LVGL object tree (389 widgets) | ≈ 60–90 KB | LVGL heap |
| Image cache | must be raised (see §4.10) | LVGL heap |
| Per-screen images (9 on home) | PNG bytes ≈ 40 KB + decoded on demand | PSRAM |

Two things must be measured on the real board, not assumed: **free PSRAM** at first render, and
the **LVGL heap** headroom when the largest screen is built. The compiled UI already allocates
thousands of objects, so the heap is probably sufficient — but "probably" is not a design input.
Add a `print_all_ram_usage()` call before and after the first dynamic build (the function already
exists in `lcd_task.c`).

### 4.10 Configuration changes required

| sdkconfig | Now | Required | Why |
|---|---|---|---|
| `CONFIG_LV_USE_LODEPNG` | **not set** | `y` | decode the stored PNG bytes |
| `CONFIG_LV_CACHE_DEF_SIZE` | `4` (KB) | ≥ decoded size of the largest image + margin (e.g. `192`) | image cache is 4 KB — far too small for a 34×29 icon set, let alone a background |
| `CONFIG_LV_USE_FS_*` | all `off` | unchanged (keep off) | images are handed to LVGL as memory, not as paths |
| `CONFIG_LV_FONT_MONTSERRAT_*` | all needed sizes on | unchanged | ✅ |
| LVGL widgets (`ARC`, `CALENDAR`, `KEYBOARD`, `IMAGEBUTTON`, `DROPDOWN`, `ROLLER`, `CHECKBOX`, `TEXTAREA`, …) | all `y` | unchanged | ✅ verified |

Flash cost of lodepng is a few tens of KB in a 6 MB `factory` partition — acceptable, but must be
confirmed against the current image size (Appendix D, step 0).

Later optimisation (not Phase 2): convert PNG → LVGL `.bin` at deploy time so the device can keep
the decoder off (`# CONFIG_LV_BIN_DECODER_RAM_LOAD`).

### 4.11 Error taxonomy for logs

| Code | Meaning | Operator action |
|---|---|---|
| `DYNUI_E_STORAGE` | `screen_data` not mounted | check partition table (D3) |
| `DYNUI_E_NOTFOUND` | no JSON for that screen | deploy, or `reset-defaults` |
| `DYNUI_E_PARSE` | invalid JSON | re-deploy the screen |
| `DYNUI_E_MEM` | allocation failed | reduce screen size; check PSRAM |
| `DYNUI_E_NOWIDGET` | all widgets rejected | check `sub_type` spelling |

---

## 5. Open questions

**Risks**

| # | Risk | Mitigation |
|---|---|---|
| 1 | `screen_data` partition absent on shipped units | D3 verification before coding; `DYNUI_E_STORAGE` surfaces it immediately |
| 2 | LVGL heap cannot hold a 389-widget screen | measure at D2/D4; if short, raise heap or build lazily (create children on first show) |
| 3 | PSRAM insufficient for JSON + tree + images | build the largest screen first (D4) as the worst case; free the tree immediately |
| 4 | Visual drift vs. compiled UI | checkpoint photo after D3; keep the compiled UI as the reference |
| 5 | `imagebutton` dangling pointers after unload | images owned by the screen handle; free order: children → styles → images |
| 6 | Log flood from unknown style props | warn once per property name |
| 7 | `write_file_replace()` unlinks first, so a concurrent `GET` can 404 briefly | acceptable; document in the API doc; the renderer only reads after the write returns |

**Open questions for the hardware owner**

| # | Question | Blocks |
|---|---|---|
| Q1 | Which partition table is on production units — `factory 6 MB @0x20000` + `screen_data @0x780000`, or the bootloader's `factory 1 MB @0x10000` + `ota_0 2 MB @0x110000`? | everything |
| Q2 | Exact PSRAM size and free PSRAM at first render | memory budget |
| Q3 | Free flash in `factory` after adding the PNG decoder | flash budget |
| Q4 | Is `ui_font_Arial80` linkable from a component (it lives in `main/TemcoScreen/`)? | fonts |
| Q5 | May the dynamic renderer replace `ui_init()` for one screen at a time during development (per-screen override), or only whole-UI? | rollout order |
| Q6 | Watchdog configuration during a long build | stability |

---
