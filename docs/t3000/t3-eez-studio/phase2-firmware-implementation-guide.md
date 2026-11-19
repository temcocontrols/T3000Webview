# Phase 2 — Firmware Implementation Guide (T3-programmable-controller-on-ESP32)

> **What this is.** The step-by-step change list for
> `temcocontrols/T3-programmable-controller-on-ESP32` that makes the panel **draw the JSON it
> received**. Read [phase2-device-renderer-design.md](phase2-device-renderer-design.md) first —
> that file defines *what* the renderer must accept; this one defines *where the code goes*.
>
> **Status of the code in this document.** It is a reference implementation written against
> LVGL 9.5 and ESP-IDF 5.5.3 (the versions this firmware pins). It is deliberately complete, but
> it is **not** compiled or flashed by the author of these docs. Treat each step as "write this,
> build it, run the step's acceptance check before continuing".

---

## 0. Gate checks — do these before writing a line of code

| # | Check | Command / where | Stop if |
|---|---|---|---|
| G1 | `screen_data` partition really is flashed | `idf.py partition-table` and read the table | there is no `screen_data` line, or it is not at `0x780000` — the renderer has no storage ([design §D3](phase2-device-renderer-design.md)) |
| G2 | Current firmware size, as a baseline | `idf.py size` → record `factory` free space | free space < ~80 KB (lodepng + renderer) |
| G3 | PSRAM alive and free at boot | boot log from `print_all_ram_usage()` in `lcd_task.c` | PSRAM free < 1.5 MB |
| G4 | LVGL heap headroom | same log (`HEAP free`) | < 150 KB after `ui_init()` |
| G5 | Target is the Tstat11 (S3) build | `Modbus.mini_type == MINI_TSTAT11` path in `app_main.c:4843` | you are building for MINI_TSTAT10 — that path uses `Menu.c`, not LVGL |

Record G2–G4 somewhere permanent; every later step compares against them.

---

## 1. Change map

| File | Change | Kind |
|---|---|---|
| `sdkconfig` (and `sdkconfig.defaults` if you keep one) | `CONFIG_LV_USE_LODEPNG=y`, `CONFIG_LV_CACHE_DEF_SIZE` raised | edit |
| `components/temco_dynamic_display/CMakeLists.txt` | add 5 `SRCS`; add `mbedtls` to `REQUIRES` | edit |
| `components/temco_dynamic_display/include/dynui.h` | **new** public API | new |
| `components/temco_dynamic_display/include/dynamic_display_api.h` | add `dynamic_display_storage_init()`, `dynamic_display_status_get()` | edit |
| `components/temco_dynamic_display/src/dynui_internal.h` | **new** shared types | new |
| `components/temco_dynamic_display/src/dynui.c` | **new** lifecycle, queue, screen registry | new |
| `components/temco_dynamic_display/src/dynui_widgets.c` | **new** widget factory | new |
| `components/temco_dynamic_display/src/dynui_style.c` | **new** style applier | new |
| `components/temco_dynamic_display/src/dynui_assets.c` | **new** font + image registries | new |
| `components/temco_dynamic_display/src/dynui_events.c` | **new** events + 2 actions | new |
| `components/temco_dynamic_display/src/dynamic_display_api.c` | rebuild hook after save; `/device/status` route; storage init delegates to `screen_store_init()` | edit |
| `main/LCD_Driver/lcd_task.c` | theme init, dynamic-first boot, `dynui_process_queue()` in the loop | edit |
| `main/app_main.c` | **none** (storage init happens inside `Lcd_Task`, see §12.4) | — |
| `main/TemcoScreen/*` | **none** — compiled screens stay as the fallback | — |
| `T3_Bootloader` | **none** — but its partition table must not be the one flashed (G1) | — |

---

## 2. Step 1 — build configuration

### 2.1 Enable the PNG decoder

`sdkconfig` currently has:

```
# CONFIG_LV_USE_LODEPNG is not set
# CONFIG_LV_USE_LIBPNG is not set
# CONFIG_LV_CACHE_DEF_SIZE is not set   (defaults to 4 KB)
```

Set:

```
CONFIG_LV_USE_LODEPNG=y
CONFIG_LV_CACHE_DEF_SIZE=192
```

`192` KB covers the largest decoded bitmap in a screen plus headroom. Raise it if step 8
(images) proves short — the value is per-image cache, not a total budget.

> Do **not** enable `CONFIG_LV_USE_FS_*`. The renderer hands images to LVGL from RAM
> (`LV_IMAGE_FORMAT_RAW`), so LVGL never opens a file itself.

### 2.2 Why no `idf.py menuconfig` for the widgets

`ARC`, `BAR`, `BUTTON`, `CALENDAR`, `CHART`, `CHECKBOX`, `DROPDOWN`, `IMAGE`, `IMAGEBUTTON`,
`KEYBOARD`, `LABEL`, `LIST`, `MENU`, `ROLLER`, `SLIDER`, `SPAN`, `SPINBOX`, `SWITCH`, `TABLE`,
`TABVIEW`, `TEXTAREA`, `WIN` are **already enabled**. Verified; nothing to do.

### 2.3 Fonts

`lv_font_montserrat_{10,16,18,30,36,40}` are already on. `Arial80` is a hand-generated font in
`main/TemcoScreen/ui_font_Arial80.c` — the renderer references it `extern`, no new config needed.

**Acceptance for step 1:** `idf.py build` succeeds, `idf.py size` shows the new free space
(expect a decrease of roughly 20–40 KB for lodepng).

---

## 3. Step 2 — component build file

`components/temco_dynamic_display/CMakeLists.txt`, `SRCS` and `REQUIRES` blocks only:

```cmake
idf_component_register(
    SRCS
        "src/dynamic_display_api.c"
        "src/screen_flash_store.c"
        "src/dynui.c"
        "src/dynui_widgets.c"
        "src/dynui_style.c"
        "src/dynui_assets.c"
        "src/dynui_events.c"
    INCLUDE_DIRS
        "include"
    PRIV_INCLUDE_DIRS
        "src"
    REQUIRES
        esp_http_server
        spiffs
        json
        nvs_flash
        mbedtls          # base64 decode for stored images
        lvgl             # needed by dynui_*
    EMBED_TXTFILES
        # … unchanged …
)
```

`lvgl` must be listed because `dynui_*` calls into it. `main` already has
`temco_dynamic_display` in its `REQUIRES` (`main/CMakeLists.txt:114`), so `#include "dynui.h"`
works from `lcd_task.c` with no further change.

**Acceptance:** empty `dynui_*.c` files with only `#include "dynui_internal.h"` compile.

---

## 4. Step 3 — public headers

### 4.1 New: `include/dynui.h`

```c
#ifndef DYNUI_H
#define DYNUI_H

#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

/* Set up registries + LVGL theme. Call once from the LCD task, before the
 * first dynui_build_screen(). Idempotent. */
esp_err_t dynui_init(void);

/* Build `screen_name` from /spiffs/screens/<screen_name>.json and make it the
 * visible screen. Must be called from the LCD task.
 *  ESP_OK            built and shown
 *  ESP_ERR_NOT_FOUND no JSON for that screen  -> caller may fall back
 *  ESP_FAIL          parse/build error        -> old screen left intact */
esp_err_t dynui_build_screen(const char *screen_name);

/* Rebuild `screen_name` if and only if it is the screen currently shown.
 * Safe to call from the HTTP task (queues work, returns immediately). */
esp_err_t dynui_request_rebuild(const char *screen_name);

void dynui_unload(void);
bool dynui_is_active(void);
const char *dynui_current_screen(void);

typedef struct {
    bool     dynamic_active;
    char     current_screen[32];
    uint32_t last_build_ms;
    bool     last_build_ok;
    char     last_error[96];
    uint8_t  images_loaded;
    uint32_t heap_free;
} dynui_status_t;

void dynui_get_status(dynui_status_t *out);

/* Drain the rebuild queue. Call once per LCD-task iteration, right after
 * lv_timer_handler(). */
void dynui_process_queue(void);

#ifdef __cplusplus
}
#endif

#endif /* DYNUI_H */
```

### 4.2 Edit: `include/dynamic_display_api.h`

```c
/**
 * @brief Mount the screen_data SPIFFS partition and seed defaults.
 *
 * Idempotent — the API server calls this too. Call it early (LCD task / boot)
 * so the renderer can read screens before the network is up.
 */
esp_err_t dynamic_display_storage_init(void);

/** Fill `out` with the renderer status snapshot (see dynui.h). */
esp_err_t dynamic_display_status_get(void *out /* dynui_status_t* */);
```

> The `void*` keeps `dynamic_display_api.h` free of an LVGL/LCD dependency; the API `.c` casts
> to `dynui_status_t*`. If you prefer strict typing, include `dynui.h` here — it has no LVGL
> headers, so either is fine.

**Acceptance:** `idf.py build` succeeds with the new prototypes declared (implementations land
in steps 4–9).

---

## 5. Step 4 — `src/dynui_internal.h`

```c
#ifndef DYNUI_INTERNAL_H
#define DYNUI_INTERNAL_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "cJSON.h"
#include "lvgl.h"
#include "dynui.h"

#define DYNUI_KEY_MAX     40
#define DYNUI_NAME_MAX    32
#define DYNUI_WARN_MAX    48      /* distinct unknown-prop warnings */

typedef struct dynui_node {
    char              key[DYNUI_KEY_MAX];
    lv_obj_t         *obj;
    struct dynui_node *next;
} dynui_node_t;

typedef struct {
    char            name[DYNUI_NAME_MAX];
    uint8_t        *png;          /* owned; NULL when the image is missing */
    size_t          png_len;
    lv_image_dsc_t  dsc;
    bool            ok;
} dynui_image_t;

typedef struct dynui_screen {
    char            name[DYNUI_NAME_MAX];
    lv_obj_t       *root;
    dynui_node_t   *nodes;
    lv_style_t     *styles;
    size_t          style_count;
    dynui_image_t  *images;
    size_t          image_count;
    cJSON          *json;          /* kept only while the build runs */
} dynui_screen_t;

/* ---- dynui.c ---- */
void        dynui_theme_init(void);
dynui_node_t *dynui_node_add(dynui_screen_t *s, const char *key, lv_obj_t *obj);
lv_obj_t   *dynui_node_find(dynui_screen_t *s, const char *key);
bool        dynui_warn_once(const char *tag, const char *what);

/* ---- dynui_widgets.c ---- */
lv_obj_t *dynui_create_widget(dynui_screen_t *scr, lv_obj_t *parent,
                              const char *key, const cJSON *w);
void      dynui_apply_base(lv_obj_t *obj, const cJSON *w);

/* ---- dynui_style.c ---- */
void dynui_apply_style(dynui_screen_t *scr, lv_obj_t *obj, const cJSON *style);
bool dynui_apply_flex(lv_obj_t *obj, const cJSON *w);

/* ---- dynui_assets.c ---- */
const lv_font_t *dynui_font(const char *name);
esp_err_t        dynui_load_images(dynui_screen_t *scr, const cJSON *bitmaps);
const lv_image_dsc_t *dynui_image(dynui_screen_t *scr, const char *name);

/* ---- dynui_events.c ---- */
void dynui_attach_events(dynui_screen_t *scr, lv_obj_t *obj, const cJSON *events);

#endif /* DYNUI_INTERNAL_H */
```

---

## 6. Step 5 — `src/dynui.c` (lifecycle, queue, theme)

```c
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "esp_heap_caps.h"

#include "dynui_internal.h"
#include "screen_flash_store.h"

static const char *TAG = "dynui";

typedef enum { MSG_REBUILD, MSG_SHOW, MSG_UNLOAD } msg_kind_t;
typedef struct { msg_kind_t kind; char screen[DYNUI_NAME_MAX]; } dynui_msg_t;

static dynui_screen_t   *s_screen;
static QueueHandle_t     s_queue;
static SemaphoreHandle_t s_lock;
static dynui_status_t    s_status;
static uint32_t          s_generation;
static char              s_warned[DYNUI_WARN_MAX][24];
static size_t            s_warned_count;
static bool              s_inited;

/* ------------------------------------------------------------------ theme */

void dynui_theme_init(void)
{
    /* ui_init() normally does this; when the dynamic renderer replaces it we
     * must set the same theme or widgets fall back to "no theme" styling. */
    lv_display_t *disp = lv_display_get_default();
    if (!disp) return;
    lv_theme_t *theme = lv_theme_default_init(disp,
                                              lv_palette_main(LV_PALETTE_BLUE),
                                              lv_palette_main(LV_PALETTE_RED),
                                              true, LV_FONT_DEFAULT);
    lv_display_set_theme(disp, theme);
}

/* ------------------------------------------------------------- warn-once */

bool dynui_warn_once(const char *tag, const char *what)
{
    char key[24];
    snprintf(key, sizeof(key), "%.20s", what ? what : "?");
    for (size_t i = 0; i < s_warned_count; i++)
        if (strcmp(s_warned[i], key) == 0) return false;
    if (s_warned_count < DYNUI_WARN_MAX)
        strncpy(s_warned[s_warned_count++], key, sizeof(s_warned[0]) - 1);
    ESP_LOGW(TAG, "%s: unsupported '%s' (further occurrences suppressed)", tag, key);
    return true;
}

/* ------------------------------------------------------------ node table */

dynui_node_t *dynui_node_add(dynui_screen_t *s, const char *key, lv_obj_t *obj)
{
    if (!s || !key || !obj || !key[0]) return NULL;
    dynui_node_t *n = calloc(1, sizeof(*n));
    if (!n) return NULL;
    strncpy(n->key, key, sizeof(n->key) - 1);
    n->obj = obj;
    n->next = s->nodes;
    s->nodes = n;
    return n;
}

lv_obj_t *dynui_node_find(dynui_screen_t *s, const char *key)
{
    for (dynui_node_t *n = s ? s->nodes : NULL; n; n = n->next)
        if (strcmp(n->key, key) == 0) return n->obj;
    return NULL;
}

/* --------------------------------------------------------------- lifecycle */

static void screen_free(dynui_screen_t *s)
{
    if (!s) return;
    if (s->root) lv_obj_delete(s->root);          /* children go with it */
    for (size_t i = 0; i < s->style_count; i++) lv_style_reset(&s->styles[i]);
    free(s->styles);
    for (size_t i = 0; i < s->image_count; i++) free(s->images[i].png);
    free(s->images);
    dynui_node_t *n = s->nodes;
    while (n) { dynui_node_t *nx = n->next; free(n); n = nx; }
    if (s->json) cJSON_Delete(s->json);
    free(s);
}

esp_err_t dynui_init(void)
{
    if (s_inited) return ESP_OK;
    if (!s_queue) s_queue = xQueueCreate(4, sizeof(dynui_msg_t));
    if (!s_lock)  s_lock  = xSemaphoreCreateMutex();
    if (!s_queue || !s_lock) return ESP_ERR_NO_MEM;
    dynui_theme_init();
    memset(&s_status, 0, sizeof(s_status));
    s_inited = true;
    ESP_LOGI(TAG, "initialised");
    return ESP_OK;
}

static void status_publish(dynui_screen_t *s, bool ok, const char *err, uint32_t ms)
{
    if (!s_lock) return;
    xSemaphoreTake(s_lock, portMAX_DELAY);
    s_status.dynamic_active = (s != NULL);
    s_status.last_build_ok  = ok;
    s_status.last_build_ms  = ms;
    s_status.heap_free      = (uint32_t)esp_get_free_heap_size();
    snprintf(s_status.current_screen, sizeof(s_status.current_screen), "%s",
             s ? s->name : "");
    snprintf(s_status.last_error, sizeof(s_status.last_error), "%s", err ? err : "");
    s_status.images_loaded  = s ? (uint8_t)s->image_count : 0;
    xSemaphoreGive(s_lock);
}

esp_err_t dynui_build_screen(const char *name)
{
    if (!s_inited || !name || !name[0]) return ESP_ERR_INVALID_ARG;
    if (!screen_store_is_ready()) return ESP_ERR_INVALID_STATE;

    char *raw = NULL; size_t len = 0;
    if (screen_store_get_screen(name, &raw, &len) != ESP_OK || !raw) {
        status_publish(s_screen, false, "no json", 0);
        return ESP_ERR_NOT_FOUND;
    }

    int64_t t0 = esp_timer_get_time();
    dynui_screen_t *scr = calloc(1, sizeof(*scr));
    if (!scr) { free(raw); return ESP_ERR_NO_MEM; }
    strncpy(scr->name, name, sizeof(scr->name) - 1);

    scr->json = cJSON_Parse(raw);
    free(raw);
    if (!scr->json) { free(scr); status_publish(s_screen, false, "parse", 0); return ESP_FAIL; }

    /* 1 — bitmaps first: widgets reference them while being created */
    dynui_load_images(scr, cJSON_GetObjectItem(scr->json, "bitmaps"));

    /* 2 — root widget (the single key in "widgets") */
    const cJSON *widgets = cJSON_GetObjectItem(scr->json, "widgets");
    const cJSON *rootw   = widgets ? widgets->child : NULL;
    if (!rootw) { screen_free(scr); status_publish(s_screen, false, "no widgets", 0); return ESP_FAIL; }

    scr->root = dynui_create_widget(scr, NULL, rootw->string, rootw);
    if (!scr->root) { screen_free(scr); status_publish(s_screen, false, "root failed", 0); return ESP_FAIL; }

    /* 3 — background colour from the envelope */
    const cJSON *bg = cJSON_GetObjectItem(scr->json, "bg_color");
    if (cJSON_IsString(bg)) {
        unsigned r = 0, g = 0, b = 0;
        if (sscanf(bg->valuestring, "#%2x%2x%2x", &r, &g, &b) == 3) {
            lv_obj_set_style_bg_color(scr->root, lv_color_make(r, g, b), LV_PART_MAIN);
            lv_obj_set_style_bg_opa(scr->root, LV_OPA_COVER, LV_PART_MAIN);
        }
    }
    lv_obj_remove_flag(scr->root, LV_OBJ_FLAG_SCROLLABLE);

    /* 4 — events on the root (SCREEN_LOADED) */
    dynui_attach_events(scr, scr->root, cJSON_GetObjectItem(rootw, "events"));

    /* 5 — swap: build fully, then show, then free the previous screen */
    dynui_screen_t *old = s_screen;
    s_screen = scr;
    if (old && old->root) lv_obj_delete(old->root);
    if (old) { old->root = NULL; screen_free(old); }

    lv_screen_load(scr->root);

    uint32_t ms = (uint32_t)((esp_timer_get_time() - t0) / 1000);
    status_publish(scr, true, NULL, ms);
    ESP_LOGI(TAG, "built '%s' in %u ms (%u images)", scr->name,
             (unsigned)ms, (unsigned)scr->image_count);
    return ESP_OK;
}

esp_err_t dynui_request_rebuild(const char *name)
{
    if (!s_queue || !name || !name[0]) return ESP_ERR_INVALID_ARG;
    dynui_msg_t m = { .kind = MSG_REBUILD };
    strncpy(m.screen, name, sizeof(m.screen) - 1);
    if (xQueueSend(s_queue, &m, 0) != pdTRUE)
        ESP_LOGW(TAG, "queue full, dropping rebuild of '%s'", name);
    return ESP_OK;
}

void dynui_process_queue(void)
{
    dynui_msg_t m;
    if (!s_queue || xQueueReceive(s_queue, &m, 0) != pdTRUE) return;

    switch (m.kind) {
    case MSG_REBUILD:
        /* Only rebuild when the deployed screen is the one on display. */
        if (s_screen && strcmp(s_screen->name, m.screen) == 0)
            dynui_build_screen(m.screen);
        break;
    case MSG_SHOW:
        dynui_build_screen(m.screen);
        break;
    case MSG_UNLOAD:
        dynui_unload();
        break;
    }
}

void dynui_unload(void)
{
    dynui_screen_t *old = s_screen;
    s_screen = NULL;
    screen_free(old);
    status_publish(NULL, true, NULL, 0);
}

bool dynui_is_active(void)   { return s_screen != NULL; }
const char *dynui_current_screen(void) { return s_screen ? s_screen->name : ""; }

void dynui_get_status(dynui_status_t *out)
{
    if (!out) return;
    if (!s_lock) { memset(out, 0, sizeof(*out)); return; }
    xSemaphoreTake(s_lock, portMAX_DELAY);
    *out = s_status;
    xSemaphoreGive(s_lock);
}
```

**Notes**

- `screen_free()` deletes the LVGL object tree **before** freeing the style arrays and image
  descriptors — `lv_imagebutton` holds raw pointers into `scr->images`, so the objects must go
  first.
- The build is transactional: nothing is shown until the new tree is complete, so a bad deploy
  leaves the previous screen on the glass.
- `lv_obj_delete` is the LVGL 9 name (`lv_obj_del` is gone).

**Acceptance for step 5 (with steps 6–7 stubbed to handle only `screen`/`label`):**
`start_up_screen` renders its two labels in the right places; the log shows
`built 'start_up_screen' in <n> ms`.

---

## 7. Step 6 — `src/dynui_widgets.c`

```c
#include <string.h>
#include <stdlib.h>
#include "esp_log.h"
#include "dynui_internal.h"

static const char *TAG = "dynui.w";

static lv_align_t map_align(const char *a)
{
    if (!a) return LV_ALIGN_DEFAULT;
    if (!strcmp(a, "center"))       return LV_ALIGN_CENTER;
    if (!strcmp(a, "top_left"))     return LV_ALIGN_TOP_LEFT;
    if (!strcmp(a, "top_mid"))      return LV_ALIGN_TOP_MID;
    if (!strcmp(a, "top_right"))    return LV_ALIGN_TOP_RIGHT;
    if (!strcmp(a, "bottom_left"))  return LV_ALIGN_BOTTOM_LEFT;
    if (!strcmp(a, "bottom_mid"))   return LV_ALIGN_BOTTOM_MID;
    if (!strcmp(a, "bottom_right")) return LV_ALIGN_BOTTOM_RIGHT;
    if (!strcmp(a, "left_mid"))     return LV_ALIGN_LEFT_MID;
    if (!strcmp(a, "right_mid"))    return LV_ALIGN_RIGHT_MID;
    return LV_ALIGN_DEFAULT;
}

static lv_label_long_mode_t map_long_mode(const char *s)
{
    if (!s) return LV_LABEL_LONG_WRAP;
    if (!strcmp(s, "dot"))             return LV_LABEL_LONG_DOT;
    if (!strcmp(s, "scroll"))          return LV_LABEL_LONG_SCROLL;
    if (!strcmp(s, "scroll_circular")) return LV_LABEL_LONG_SCROLL_CIRCULAR;
    if (!strcmp(s, "clip"))            return LV_LABEL_LONG_CLIP;
    return LV_LABEL_LONG_WRAP;
}

/* Returns the created object; also sets size/pos/align. */
void dynui_apply_base(lv_obj_t *obj, const cJSON *w)
{
    const cJSON *jw = cJSON_GetObjectItem(w, "width");
    const cJSON *jh = cJSON_GetObjectItem(w, "height");
    int32_t wd = jw ? jw->valueint : 0;
    int32_t ht = jh ? jh->valueint : 0;

    lv_obj_set_size(obj, wd > 0 ? wd : LV_SIZE_CONTENT,
                         ht > 0 ? ht : LV_SIZE_CONTENT);

    const cJSON *ja = cJSON_GetObjectItem(w, "align");
    const cJSON *jx = cJSON_GetObjectItem(w, "x_pos");
    const cJSON *jy = cJSON_GetObjectItem(w, "y_pos");
    int32_t x = jx ? jx->valueint : 0;
    int32_t y = jy ? jy->valueint : 0;

    if (cJSON_IsString(ja)) lv_obj_align(obj, map_align(ja->valuestring), x, y);
    else                    lv_obj_set_pos(obj, x, y);
}

static void set_text(lv_obj_t *obj, const cJSON *w)
{
    const cJSON *jt = cJSON_GetObjectItem(w, "obj_text");
    const cJSON *ty = cJSON_GetObjectItem(w, "text_type");
    if (!cJSON_IsString(jt)) return;
    if (cJSON_IsString(ty) && !strcmp(ty->valuestring, "expression"))
        dynui_warn_once("text_type", "expression");
    lv_label_set_text(obj, jt->valuestring);
}

static void make_image_button(dynui_screen_t *scr, lv_obj_t *obj, const cJSON *w)
{
    const cJSON *rel = cJSON_GetObjectItem(w, "img_released");
    const cJSON *prs = cJSON_GetObjectItem(w, "img_pressed");
    const cJSON *dis = cJSON_GetObjectItem(w, "img_disabled");

    const lv_image_dsc_t *r = dynui_image(scr, cJSON_IsString(rel) ? rel->valuestring : NULL);
    const lv_image_dsc_t *p = dynui_image(scr, cJSON_IsString(prs) ? prs->valuestring : NULL);
    const lv_image_dsc_t *d = dynui_image(scr, cJSON_IsString(dis) ? dis->valuestring : NULL);
    if (!p) p = r;

    lv_imagebutton_set_src(obj, LV_IMAGEBUTTON_STATE_RELEASED, r, NULL, NULL);
    lv_imagebutton_set_src(obj, LV_IMAGEBUTTON_STATE_PRESSED,  p, NULL, NULL);
    lv_imagebutton_set_src(obj, LV_IMAGEBUTTON_STATE_DISABLED, d ? d : r, NULL, NULL);
}

/* Apply the type-specific fields. Returns the object that should receive
 * children (usually `obj`). */
static lv_obj_t *apply_type(dynui_screen_t *scr, lv_obj_t *obj,
                            const char *sub, const cJSON *w)
{
    const cJSON *j;

    if (!strcmp(sub, "label")) {
        set_text(obj, w);
        if ((j = cJSON_GetObjectItem(w, "long_mode")))
            lv_label_set_long_mode(obj, map_long_mode(j->valuestring));
        if (cJSON_GetObjectItem(w, "recolor")) lv_label_set_recolor(obj, true);
    }
    else if (!strcmp(sub, "textarea")) {
        if ((j = cJSON_GetObjectItem(w, "placeholder")))
            lv_textarea_set_placeholder_text(obj, j->valuestring);
        if (cJSON_GetObjectItem(w, "one_line"))
            lv_textarea_set_one_line(obj, true);
    }
    else if (!strcmp(sub, "button")) {
        /* obj_text is rare on buttons; children labels carry the caption */
        set_text(obj, w);
    }
    else if (!strcmp(sub, "imagebutton")) {
        make_image_button(scr, obj, w);
    }
    else if (!strcmp(sub, "image")) {
        const cJSON *src = cJSON_GetObjectItem(w, "src");
        const lv_image_dsc_t *d = dynui_image(scr, cJSON_IsString(src) ? src->valuestring : NULL);
        if (d) lv_image_set_src(obj, d);
        else if (cJSON_IsString(src)) ESP_LOGW(TAG, "image '%s' missing", src->valuestring);
        if ((j = cJSON_GetObjectItem(w, "rotation")))
            lv_image_set_rotation(obj, lv_img_angle_to_rotation(j->valueint));
    }
    else if (!strcmp(sub, "switch")) {
        if (cJSON_GetObjectItem(w, "checked"))
            lv_obj_add_state(obj, LV_STATE_CHECKED);
    }
    else if (!strcmp(sub, "checkbox")) {
        set_text(obj, w);
    }
    else if (!strcmp(sub, "dropdown") || !strcmp(sub, "roller")) {
        const cJSON *opts = cJSON_GetObjectItem(w, "options");
        if (cJSON_IsArray(opts)) {
            char buf[512]; size_t off = 0; buf[0] = '\0';
            const cJSON *o;
            cJSON_ArrayForEach(o, opts) {
                if (!cJSON_IsString(o)) continue;
                int n = snprintf(buf + off, sizeof(buf) - off, "%s%s",
                                 off ? "\n" : "", o->valuestring);
                if (n < 0 || (size_t)n >= sizeof(buf) - off) break;
                off += (size_t)n;
            }
            if (buf[0]) {
                if (!strcmp(sub, "dropdown")) lv_dropdown_set_options(obj, buf);
                else                          lv_roller_set_options(obj, buf, LV_ROLLER_MODE_NORMAL);
            }
        }
        if ((j = cJSON_GetObjectItem(w, "selected"))) {
            if (!strcmp(sub, "dropdown")) lv_dropdown_set_selected(obj, (uint32_t)j->valueint);
            else                          lv_roller_set_selected(obj, (uint32_t)j->valueint, LV_ANIM_OFF);
        }
    }
    else if (!strcmp(sub, "arc") || !strcmp(sub, "bar") || !strcmp(sub, "slider")) {
        const cJSON *jmin = cJSON_GetObjectItem(w, "min");
        const cJSON *jmax = cJSON_GetObjectItem(w, "max");
        const cJSON *jval = cJSON_GetObjectItem(w, "value");
        int32_t mn = jmin ? jmin->valueint : 0;
        int32_t mx = jmax ? jmax->valueint : 100;
        int32_t vl = jval ? jval->valueint : 0;
        if (!strcmp(sub, "arc")) {
            lv_arc_set_range(obj, mn, mx);
            lv_arc_set_value(obj, vl);
            if ((j = cJSON_GetObjectItem(w, "bg_start_angle"))) {
                int32_t a1 = j->valueint;
                const cJSON *e = cJSON_GetObjectItem(w, "bg_end_angle");
                lv_arc_set_bg_angles(obj, (uint32_t)a1, (uint32_t)(e ? e->valueint : 360));
            }
            if ((j = cJSON_GetObjectItem(w, "rotation")))
                lv_arc_set_rotation(obj, (uint32_t)j->valueint);
        } else if (!strcmp(sub, "bar")) {
            lv_bar_set_range(obj, mn, mx);
            lv_bar_set_value(obj, vl, LV_ANIM_OFF);
        } else {
            lv_slider_set_range(obj, mn, mx);
            lv_slider_set_value(obj, vl, LV_ANIM_OFF);
        }
    }
    else if (!strcmp(sub, "calendar")) {
        const cJSON *yy = cJSON_GetObjectItem(w, "today_year");
        const cJSON *mm = cJSON_GetObjectItem(w, "today_month");
        const cJSON *dd = cJSON_GetObjectItem(w, "today_day");
        if (yy && mm && dd)
            lv_calendar_set_today_date(obj, (uint32_t)yy->valueint,
                                            (uint32_t)mm->valueint,
                                            (uint32_t)dd->valueint);
        if (cJSON_GetObjectItem(w, "header"))
            lv_calendar_add_header_arrow(obj);
    }
    /* keyboard: no fields; binding happens after children (see below) */
    /* user_widget: not supported in phase 2 */
    return obj;
}

lv_obj_t *dynui_create_widget(dynui_screen_t *scr, lv_obj_t *parent,
                              const char *key, const cJSON *w)
{
    const cJSON *jsub = cJSON_GetObjectItem(w, "sub_type");
    if (!cJSON_IsString(jsub)) { dynui_warn_once("widget", "no sub_type"); return NULL; }
    const char *sub = jsub->valuestring;

    lv_obj_t *obj = NULL;
    if      (!strcmp(sub, "screen"))      obj = lv_obj_create(NULL);
    else if (!strcmp(sub, "panel"))       obj = lv_obj_create(parent);
    else if (!strcmp(sub, "label"))       obj = lv_label_create(parent);
    else if (!strcmp(sub, "textarea"))    obj = lv_textarea_create(parent);
    else if (!strcmp(sub, "button"))      obj = lv_button_create(parent);
    else if (!strcmp(sub, "imagebutton")) obj = lv_imagebutton_create(parent);
    else if (!strcmp(sub, "image"))       obj = lv_image_create(parent);
    else if (!strcmp(sub, "switch"))      obj = lv_switch_create(parent);
    else if (!strcmp(sub, "checkbox"))    obj = lv_checkbox_create(parent);
    else if (!strcmp(sub, "dropdown"))    obj = lv_dropdown_create(parent);
    else if (!strcmp(sub, "roller"))      obj = lv_roller_create(parent);
    else if (!strcmp(sub, "arc"))         obj = lv_arc_create(parent);
    else if (!strcmp(sub, "bar"))         obj = lv_bar_create(parent);
    else if (!strcmp(sub, "slider"))      obj = lv_slider_create(parent);
    else if (!strcmp(sub, "calendar"))    obj = lv_calendar_create(parent);
    else if (!strcmp(sub, "keyboard"))    obj = lv_keyboard_create(parent);
    else { dynui_warn_once("sub_type", sub); return NULL; }

    dynui_apply_base(obj, w);                                   /* size, align */
    dynui_apply_style(scr, obj, cJSON_GetObjectItem(w, "style"));
    if (!dynui_apply_flex(obj, w)) { /* no flex: nothing to do */ }

    if (cJSON_GetObjectItem(w, "hidden"))   lv_obj_add_flag(obj, LV_OBJ_FLAG_HIDDEN);
    if (cJSON_GetObjectItem(w, "disabled")) lv_obj_add_state(obj, LV_STATE_DISABLED);
    if (cJSON_IsFalse(cJSON_GetObjectItem(w, "clickable")))
        lv_obj_remove_flag(obj, LV_OBJ_FLAG_CLICKABLE);

    apply_type(scr, obj, sub, w);
    dynui_node_add(scr, key, obj);

    /* children */
    lv_obj_t *first_textarea = NULL;
    const cJSON *kids = cJSON_GetObjectItem(w, "children");
    if (kids) {
        const cJSON *c;
        cJSON_ArrayForEach(c, kids) {
            lv_obj_t *child = dynui_create_widget(scr, obj, c->string, c);
            if (child && !first_textarea) {
                const cJSON *cs = cJSON_GetObjectItem(c, "sub_type");
                if (cJSON_IsString(cs) && !strcmp(cs->valuestring, "textarea"))
                    first_textarea = child;
            }
        }
    }
    if (!strcmp(sub, "keyboard")) {
        /* heuristics: bind to a textarea child, else the last textarea in
         * the node table (document order), else leave unbound */
        lv_obj_t *ta = first_textarea;
        if (!ta) {
            for (dynui_node_t *n = scr->nodes; n; n = n->next) {
                if (lv_obj_check_type(n->obj, &lv_textarea_class)) { ta = n->obj; break; }
            }
        }
        if (ta) lv_keyboard_set_textarea(obj, ta);
        else    ESP_LOGW(TAG, "keyboard '%s' has no textarea target", key);
    }

    dynui_attach_events(scr, obj, cJSON_GetObjectItem(w, "events"));
    return obj;
}
```

**Points that will bite you if skipped**

| Point | Why |
|---|---|
| `size` before `align` | `LV_SIZE_CONTENT` changes the object's own box; aligning first then resizing leaves it off-centre |
| `0 ⇒ LV_SIZE_CONTENT` | 373 of 389 default widgets rely on it |
| children created **after** the parent is styled | a child inherits nothing from the parent's later style, but the parent's flex layout must exist before children are added |
| `lv_imagebutton` pointers | `dynui_image()` returns a pointer owned by the screen; never a temporary |
| `dynui_warn_once` | a single screen can contain 100+ unsupported props; the log must stay readable |

---

## 8. Step 7 — `src/dynui_style.c`

```c
#include <string.h>
#include <stdlib.h>
#include "esp_log.h"
#include "dynui_internal.h"

static const char *TAG = "dynui.s";

static lv_style_selector_t map_part(const char *p)
{
    if (!strcmp(p, "INDICATOR")) return LV_PART_INDICATOR;
    if (!strcmp(p, "KNOB"))      return LV_PART_KNOB;
    if (!strcmp(p, "SCROLLBAR")) return LV_PART_SCROLLBAR;
    if (!strcmp(p, "ITEMS"))     return LV_PART_ITEMS;
    if (!strcmp(p, "SELECTED"))  return LV_PART_SELECTED;
    return LV_PART_MAIN;
}

static lv_state_t map_state(const char *s)
{
    if (!strcmp(s, "CHECKED"))  return LV_STATE_CHECKED;
    if (!strcmp(s, "FOCUSED"))  return LV_STATE_FOCUSED;
    if (!strcmp(s, "DISABLED")) return LV_STATE_DISABLED;
    return LV_STATE_DEFAULT;
}

static bool color_of(const cJSON *v, lv_color_t *out)
{
    unsigned r, g, b;
    if (!cJSON_IsString(v)) return false;
    if (sscanf(v->valuestring, "#%2x%2x%2x", &r, &g, &b) != 3) return false;
    *out = lv_color_make((uint8_t)r, (uint8_t)g, (uint8_t)b);
    return true;
}

/* One property → one style. Unknown properties warn once and are skipped. */
static void set_prop(lv_style_t *st, const char *name, const cJSON *v)
{
    lv_color_t c;

    if      (!strcmp(name, "bg_color")   && color_of(v, &c)) lv_style_set_bg_color(st, c);
    else if (!strcmp(name, "bg_opa"))                        lv_style_set_bg_opa(st, (lv_opa_t)v->valueint);
    else if (!strcmp(name, "radius"))                        lv_style_set_radius(st, (int32_t)v->valueint);
    else if (!strcmp(name, "bg_grad_color") && color_of(v, &c)) lv_style_set_bg_grad_color(st, c);
    else if (!strcmp(name, "bg_grad_dir")) {
        int32_t d = !strcmp(v->valuestring, "ver") ? LV_GRAD_DIR_VER
                  : !strcmp(v->valuestring, "hor") ? LV_GRAD_DIR_HOR : LV_GRAD_DIR_NONE;
        lv_style_set_bg_grad_dir(st, (lv_grad_dir_t)d);
    }
    else if (!strcmp(name, "bg_grad_stop"))                  lv_style_set_bg_grad_stop(st, (int32_t)v->valueint);
    else if (!strcmp(name, "bg_main_stop"))                  lv_style_set_bg_main_stop(st, (int32_t)v->valueint);
    else if (!strcmp(name, "border_color") && color_of(v, &c)) lv_style_set_border_color(st, c);
    else if (!strcmp(name, "border_opa"))                    lv_style_set_border_opa(st, (lv_opa_t)v->valueint);
    else if (!strcmp(name, "border_width"))                  lv_style_set_border_width(st, (int32_t)v->valueint);
    else if (!strcmp(name, "border_side")) {
        int32_t s = !strcmp(v->valuestring, "none") ? LV_BORDER_SIDE_NONE
                  : !strcmp(v->valuestring, "top")    ? LV_BORDER_SIDE_TOP
                  : !strcmp(v->valuestring, "bottom") ? LV_BORDER_SIDE_BOTTOM
                  : !strcmp(v->valuestring, "left")   ? LV_BORDER_SIDE_LEFT
                  : !strcmp(v->valuestring, "right")  ? LV_BORDER_SIDE_RIGHT
                  : LV_BORDER_SIDE_FULL;
        lv_style_set_border_side(st, (lv_border_side_t)s);
    }
    else if (!strcmp(name, "outline_color") && color_of(v, &c)) lv_style_set_outline_color(st, c);
    else if (!strcmp(name, "outline_opa"))                   lv_style_set_outline_opa(st, (lv_opa_t)v->valueint);
    else if (!strcmp(name, "outline_width"))                 lv_style_set_outline_width(st, (int32_t)v->valueint);
    else if (!strcmp(name, "outline_pad"))                   lv_style_set_outline_pad(st, (int32_t)v->valueint);
    else if (!strcmp(name, "shadow_color") && color_of(v, &c)) lv_style_set_shadow_color(st, c);
    else if (!strcmp(name, "shadow_opa"))                    lv_style_set_shadow_opa(st, (lv_opa_t)v->valueint);
    else if (!strcmp(name, "shadow_width"))                  lv_style_set_shadow_width(st, (int32_t)v->valueint);
    else if (!strcmp(name, "shadow_spread"))                 lv_style_set_shadow_spread(st, (int32_t)v->valueint);
    else if (!strcmp(name, "shadow_offset_x"))               lv_style_set_shadow_offset_x(st, (int32_t)v->valueint);
    else if (!strcmp(name, "shadow_offset_y"))               lv_style_set_shadow_offset_y(st, (int32_t)v->valueint);
    else if (!strcmp(name, "text_font")) {
        const lv_font_t *f = dynui_font(v->valuestring);
        if (f) lv_style_set_text_font(st, f);
    }
    else if (!strcmp(name, "text_color") && color_of(v, &c)) lv_style_set_text_color(st, c);
    else if (!strcmp(name, "text_opa"))                      lv_style_set_text_opa(st, (lv_opa_t)v->valueint);
    else if (!strcmp(name, "text_align")) {
        int32_t a = !strcmp(v->valuestring, "left")  ? LV_TEXT_ALIGN_LEFT
                  : !strcmp(v->valuestring, "right") ? LV_TEXT_ALIGN_RIGHT
                  : LV_TEXT_ALIGN_CENTER;
        lv_style_set_text_align(st, (lv_text_align_t)a);
    }
    else if (!strcmp(name, "text_letter_space"))             lv_style_set_text_letter_space(st, (int32_t)v->valueint);
    else if (!strcmp(name, "text_line_space"))               lv_style_set_text_line_space(st, (int32_t)v->valueint);
    else if (!strcmp(name, "text_decor")) {
        int32_t d = !strcmp(v->valuestring, "underline")     ? LV_TEXT_DECOR_UNDERLINE
                  : !strcmp(v->valuestring, "strikethrough") ? LV_TEXT_DECOR_STRIKETHROUGH
                  : LV_TEXT_DECOR_NONE;
        lv_style_set_text_decor(st, (lv_text_decor_t)d);
    }
    else if (!strcmp(name, "pad_all"))                       lv_style_set_pad_all(st, (int32_t)v->valueint);
    else if (!strcmp(name, "pad_left"))                      lv_style_set_pad_left(st, (int32_t)v->valueint);
    else if (!strcmp(name, "pad_right"))                     lv_style_set_pad_right(st, (int32_t)v->valueint);
    else if (!strcmp(name, "pad_top"))                       lv_style_set_pad_top(st, (int32_t)v->valueint);
    else if (!strcmp(name, "pad_bottom"))                    lv_style_set_pad_bottom(st, (int32_t)v->valueint);
    else if (!strcmp(name, "arc_color") && color_of(v, &c))  lv_style_set_arc_color(st, c);
    else if (!strcmp(name, "arc_opa"))                       lv_style_set_arc_opa(st, (lv_opa_t)v->valueint);
    else if (!strcmp(name, "arc_width"))                     lv_style_set_arc_width(st, (int32_t)v->valueint);
    else if (!strcmp(name, "opa"))                           lv_style_set_opa(st, (lv_opa_t)v->valueint);
    else dynui_warn_once("style", name);
}

void dynui_apply_style(dynui_screen_t *scr, lv_obj_t *obj, const cJSON *style)
{
    if (!style || !scr || !obj) return;

    const cJSON *part;
    cJSON_ArrayForEach(part, style) {
        lv_style_selector_t sel_part = map_part(part->string);
        const cJSON *state;
        cJSON_ArrayForEach(state, part) {
            lv_state_t sel_state = map_state(state->string);

            lv_style_t *st = realloc(scr->styles, (scr->style_count + 1) * sizeof(*st));
            if (!st) return;
            scr->styles = st;
            lv_style_t *cur = &scr->styles[scr->style_count];
            lv_style_init(cur);
            scr->style_count++;

            const cJSON *prop;
            cJSON_ArrayForEach(prop, state) set_prop(cur, prop->string, prop);

            lv_obj_add_style(obj, cur, sel_part | sel_state);
        }
    }
}
```

> `realloc` on `scr->styles` moves the array — **never** keep a `lv_style_t*` across calls. If you
> prefer, size the array up-front with a count pass; behaviour is identical.

### Flex

```c
bool dynui_apply_flex(lv_obj_t *obj, const cJSON *w)
{
    const cJSON *flow = cJSON_GetObjectItem(w, "flex_flow");
    if (!cJSON_IsString(flow)) return false;

    lv_flex_flow_t f = LV_FLEX_FLOW_ROW;
    const char *s = flow->valuestring;
    if      (!strcmp(s, "column"))              f = LV_FLEX_FLOW_COLUMN;
    else if (!strcmp(s, "row_wrap"))            f = LV_FLEX_FLOW_ROW_WRAP;
    else if (!strcmp(s, "column_wrap"))         f = LV_FLEX_FLOW_COLUMN_WRAP;
    else if (!strcmp(s, "row_reverse"))         f = LV_FLEX_FLOW_ROW_REVERSE;
    else if (!strcmp(s, "column_reverse"))      f = LV_FLEX_FLOW_COLUMN_REVERSE;
    else if (!strcmp(s, "row_wrap_reverse"))    f = LV_FLEX_FLOW_ROW_WRAP_REVERSE;
    else if (!strcmp(s, "column_wrap_reverse")) f = LV_FLEX_FLOW_COLUMN_WRAP_REVERSE;
    lv_obj_set_flex_flow(obj, f);

    const cJSON *jm = cJSON_GetObjectItem(w, "flex_main");
    const cJSON *jc = cJSON_GetObjectItem(w, "flex_cross");
    const cJSON *jt = cJSON_GetObjectItem(w, "flex_track");

    lv_flex_align_t m = LV_FLEX_ALIGN_START, c2 = LV_FLEX_ALIGN_START, t = LV_FLEX_ALIGN_START;
    if (cJSON_IsString(jm)) {
        if (!strcmp(jm->valuestring,"end")) m = LV_FLEX_ALIGN_END;
        else if (!strcmp(jm->valuestring,"center")) m = LV_FLEX_ALIGN_CENTER;
        else if (!strcmp(jm->valuestring,"space_between")) m = LV_FLEX_ALIGN_SPACE_BETWEEN;
        else if (!strcmp(jm->valuestring,"space_around"))  m = LV_FLEX_ALIGN_SPACE_AROUND;
        else if (!strcmp(jm->valuestring,"space_evenly"))  m = LV_FLEX_ALIGN_SPACE_EVENLY;
    }
    if (cJSON_IsString(jc)) {
        if (!strcmp(jc->valuestring,"end")) c2 = LV_FLEX_ALIGN_END;
        else if (!strcmp(jc->valuestring,"center")) c2 = LV_FLEX_ALIGN_CENTER;
        else if (!strcmp(jc->valuestring,"space_between")) c2 = LV_FLEX_ALIGN_SPACE_BETWEEN;
        else if (!strcmp(jc->valuestring,"space_around"))  c2 = LV_FLEX_ALIGN_SPACE_AROUND;
        else if (!strcmp(jc->valuestring,"space_evenly"))  c2 = LV_FLEX_ALIGN_SPACE_EVENLY;
    }
    if (cJSON_IsString(jt)) {
        if (!strcmp(jt->valuestring,"end")) t = LV_FLEX_ALIGN_END;
        else if (!strcmp(jt->valuestring,"center")) t = LV_FLEX_ALIGN_CENTER;
        else if (!strcmp(jt->valuestring,"space_between")) t = LV_FLEX_ALIGN_SPACE_BETWEEN;
        else if (!strcmp(jt->valuestring,"space_around"))  t = LV_FLEX_ALIGN_SPACE_AROUND;
        else if (!strcmp(jt->valuestring,"space_evenly"))  t = LV_FLEX_ALIGN_SPACE_EVENLY;
    }
    lv_obj_set_flex_align(obj, m, c2, t);
    return true;
}
```

**Acceptance:** `home_screen` matches the compiled version (background, rounded gradient buttons,
hidden panels). Photograph both; if they differ, fix here before continuing.

---

## 9. Step 8 — `src/dynui_assets.c`

```c
#include <string.h>
#include <stdlib.h>
#include "esp_log.h"
#include "esp_heap_caps.h"
#include "mbedtls/base64.h"
#include "dynui_internal.h"
#include "screen_flash_store.h"

static const char *TAG = "dynui.a";

/* The compiled Arial80 font lives in main/TemcoScreen/ui_font_Arial80.c */
extern const lv_font_t ui_font_Arial80;

typedef struct { const char *name; const lv_font_t *font; } font_entry_t;

static const font_entry_t s_fonts[] = {
    { "Arial80",                  &ui_font_Arial80 },
    { "lv_font_montserrat_10",    &lv_font_montserrat_10 },
    { "lv_font_montserrat_16",    &lv_font_montserrat_16 },
    { "lv_font_montserrat_18",    &lv_font_montserrat_18 },
    { "lv_font_montserrat_30",    &lv_font_montserrat_30 },
    { "lv_font_montserrat_36",    &lv_font_montserrat_36 },
    { "lv_font_montserrat_40",    &lv_font_montserrat_40 },
};

const lv_font_t *dynui_font(const char *name)
{
    if (!name) return NULL;
    for (size_t i = 0; i < sizeof(s_fonts)/sizeof(s_fonts[0]); i++)
        if (!strcmp(s_fonts[i].name, name)) return s_fonts[i].font;
    dynui_warn_once("font", name);
    return NULL;
}

static bool base64_to_png(const char *b64, uint8_t **out, size_t *out_len)
{
    size_t slen = strlen(b64);
    size_t cap  = slen / 4 * 3 + 4;
    uint8_t *buf = heap_caps_malloc(cap, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    if (!buf) buf = malloc(cap);
    if (!buf) return false;

    size_t olen = 0;
    if (mbedtls_base64_decode(buf, cap, &olen, (const unsigned char *)b64, slen) != 0) {
        free(buf);
        return false;
    }
    *out = buf; *out_len = olen;
    return true;
}

esp_err_t dynui_load_images(dynui_screen_t *scr, const cJSON *bitmaps)
{
    if (!scr || !cJSON_IsArray(bitmaps)) return ESP_OK;

    size_t n = (size_t)cJSON_GetArraySize(bitmaps);
    if (!n) return ESP_OK;

    scr->images = calloc(n, sizeof(*scr->images));
    if (!scr->images) return ESP_ERR_NO_MEM;

    const cJSON *it;
    cJSON_ArrayForEach(it, bitmaps) {
        if (!cJSON_IsString(it)) continue;
        dynui_image_t *im = &scr->images[scr->image_count];
        strncpy(im->name, it->valuestring, sizeof(im->name) - 1);

        char *json = NULL; size_t len = 0;
        if (screen_store_get_image(im->name, &json, &len) != ESP_OK || !json) {
            ESP_LOGW(TAG, "bitmap '%s' not found on flash", im->name);
            scr->image_count++;        /* keep the slot, mark not ok */
            continue;
        }

        cJSON *root = cJSON_Parse(json);
        free(json);
        const cJSON *b64 = root ? cJSON_GetObjectItem(root, "png_base64") : NULL;
        const cJSON *jw  = root ? cJSON_GetObjectItem(root, "width") : NULL;
        const cJSON *jh  = root ? cJSON_GetObjectItem(root, "height") : NULL;

        if (cJSON_IsString(b64) && base64_to_png(b64->valuestring, &im->png, &im->png_len)) {
            im->dsc.header.magic  = LV_IMAGE_HEADER_MAGIC;
            im->dsc.header.cf     = LV_COLOR_FORMAT_RAW;   /* "encoded file" */
            im->dsc.header.w      = jw ? jw->valueint : 0;
            im->dsc.header.h      = jh ? jh->valueint : 0;
            im->dsc.data          = im->png;
            im->dsc.data_size     = (uint32_t)im->png_len;
            im->ok = true;
        } else {
            ESP_LOGW(TAG, "bitmap '%s' could not be decoded", im->name);
        }
        if (root) cJSON_Delete(root);
        scr->image_count++;
    }
    return ESP_OK;
}

const lv_image_dsc_t *dynui_image(dynui_screen_t *scr, const char *name)
{
    if (!scr || !name) return NULL;
    for (size_t i = 0; i < scr->image_count; i++)
        if (scr->images[i].ok && !strcmp(scr->images[i].name, name))
            return &scr->images[i].dsc;
    return NULL;
}
```

**Acceptance:** the wifi icon, fan icons and arrows appear on `home_screen`; the log has no
`could not be decoded`.

If an image renders as garbage, raise `CONFIG_LV_CACHE_DEF_SIZE` — LVGL decodes the PNG on
demand into that cache, and a too-small cache re-decodes (slow) or fails (blank).

---

## 10. Step 9 — `src/dynui_events.c`

```c
#include <string.h>
#include <stdlib.h>
#include "esp_log.h"
#include "dynui_internal.h"

static const char *TAG = "dynui.e";

typedef struct {
    dynui_screen_t *screen;
    char            kind[16];     /* "screen_change" | "flag_modify" */
    char            screen_to[32];
    char            target[40];
    char            mode[8];
    uint32_t        speed;
    uint32_t        delay;
    char            anim[16];
} dynui_action_t;

typedef struct {
    dynui_screen_t *screen;
    dynui_action_t *acts;
    size_t          count;
} dynui_event_ctx_t;

static lv_screen_load_anim_t map_anim(const char *a)
{
    if (!a) return LV_SCREEN_LOAD_ANIM_FADE_ON;
    if (!strcmp(a, "MOVE_LEFT"))   return LV_SCREEN_LOAD_ANIM_MOVE_LEFT;
    if (!strcmp(a, "MOVE_RIGHT"))  return LV_SCREEN_LOAD_ANIM_MOVE_RIGHT;
    if (!strcmp(a, "MOVE_TOP"))    return LV_SCREEN_LOAD_ANIM_MOVE_TOP;
    if (!strcmp(a, "MOVE_BOTTOM")) return LV_SCREEN_LOAD_ANIM_MOVE_BOTTOM;
    if (!strcmp(a, "OVER_LEFT"))   return LV_SCREEN_LOAD_ANIM_OVER_LEFT;
    if (!strcmp(a, "OVER_RIGHT"))  return LV_SCREEN_LOAD_ANIM_OVER_RIGHT;
    if (!strcmp(a, "OVER_TOP"))    return LV_SCREEN_LOAD_ANIM_OVER_TOP;
    if (!strcmp(a, "OVER_BOTTOM")) return LV_SCREEN_LOAD_ANIM_OVER_BOTTOM;
    if (!strcmp(a, "NONE"))        return LV_SCREEN_LOAD_ANIM_NONE;
    return LV_SCREEN_LOAD_ANIM_FADE_ON;
}

static void run_actions(dynui_event_ctx_t *ctx)
{
    for (size_t i = 0; i < ctx->count; i++) {
        dynui_action_t *a = &ctx->acts[i];

        if (!strcmp(a->kind, "screen_change")) {
            if (a->screen_to[0])
                lv_screen_load_anim(NULL, map_anim(a->anim), a->speed, a->delay, false);
            continue;
        }

        if (!strcmp(a->kind, "flag_modify")) {
            lv_obj_t *t = dynui_node_find(ctx->screen, a->target);
            if (!t) { ESP_LOGW(TAG, "flag_modify target '%s' not found", a->target); continue; }

            if (!strcmp(a->mode, "add"))         lv_obj_add_flag(t, LV_OBJ_FLAG_HIDDEN);
            else if (!strcmp(a->mode, "remove")) lv_obj_remove_flag(t, LV_OBJ_FLAG_HIDDEN);
            else if (lv_obj_has_flag(t, LV_OBJ_FLAG_HIDDEN))
                                                 lv_obj_remove_flag(t, LV_OBJ_FLAG_HIDDEN);
            else                                 lv_obj_add_flag(t, LV_OBJ_FLAG_HIDDEN);
        }
    }
}

static void on_event(lv_event_t *e)
{
    dynui_event_ctx_t *ctx = lv_event_get_user_data(e);
    if (ctx) run_actions(ctx);
}

void dynui_attach_events(dynui_screen_t *scr, lv_obj_t *obj, const cJSON *events)
{
    if (!scr || !obj || !events) return;

    const cJSON *trig;
    cJSON_ArrayForEach(trig, events) {
        const char *name = trig->string;
        if (strcmp(name, "CLICKED") && strcmp(name, "SCREEN_LOADED")) {
            dynui_warn_once("event", name);
            continue;
        }

        const cJSON *arr = cJSON_GetObjectItem(trig, "actions");
        if (!cJSON_IsArray(arr) || !cJSON_GetArraySize(arr)) continue;

        dynui_event_ctx_t *ctx = calloc(1, sizeof(*ctx));
        if (!ctx) return;
        ctx->screen = scr;
        ctx->count  = (size_t)cJSON_GetArraySize(arr);
        ctx->acts   = calloc(ctx->count, sizeof(*ctx->acts));
        if (!ctx->acts) { free(ctx); return; }

        size_t i = 0;
        const cJSON *a;
        cJSON_ArrayForEach(a, arr) {
            dynui_action_t *d = &ctx->acts[i++];
            const cJSON *v;
            if ((v = cJSON_GetObjectItem(a, "action")) && cJSON_IsString(v))
                strncpy(d->kind, v->valuestring, sizeof(d->kind) - 1);
            if ((v = cJSON_GetObjectItem(a, "screen")) && cJSON_IsString(v))
                strncpy(d->screen_to, v->valuestring, sizeof(d->screen_to) - 1);
            if ((v = cJSON_GetObjectItem(a, "target")) && cJSON_IsString(v))
                strncpy(d->target, v->valuestring, sizeof(d->target) - 1);
            if ((v = cJSON_GetObjectItem(a, "mode")) && cJSON_IsString(v))
                strncpy(d->mode, v->valuestring, sizeof(d->mode) - 1);
            if ((v = cJSON_GetObjectItem(a, "anim")) && cJSON_IsString(v))
                strncpy(d->anim, v->valuestring, sizeof(d->anim) - 1);
            if ((v = cJSON_GetObjectItem(a, "speed"))) d->speed = (uint32_t)v->valueint;
            if ((v = cJSON_GetObjectItem(a, "delay"))) d->delay = (uint32_t)v->valueint;
        }

        lv_event_code_t code = !strcmp(name, "CLICKED") ? LV_EVENT_CLICKED
                                                        : LV_EVENT_SCREEN_LOADED;
        lv_obj_add_event_cb(obj, on_event, code, ctx);
    }
}
```

**Two things to finish yourself**

1. `screen_change` must **build the target screen before loading it**. `dynui_build_screen()`
   already calls `lv_screen_load()` on the new root, so the simplest correct implementation is:

   ```c
   /* instead of lv_screen_load_anim(NULL, …) */
   if (dynui_build_screen(a->screen_to) == ESP_OK) {
       /* animation is optional in v1; add lv_screen_load_anim() here once the
          target screen object is available before the switch */
   }
   ```

   Doing the animated switch properly needs `dynui_build_screen()` split into "build" and
   "show" halves — that is the natural refactor for step D7b, and it keeps the very first
   implementation (instant switch) usable.

2. `dynui_event_ctx_t` is **never freed** — it lives as long as the screen. Add it to
   `dynui_screen_t` (a list) and free the list in `screen_free()`; otherwise every rebuild leaks
   a small allocation per event.

**Acceptance:** tapping `FanButton` on `home_screen` toggles `FanModePanel`; the start-up screen
navigates to `home_screen` after 3 s.

---

## 11. Step 10 — API integration (`dynamic_display_api.c`)

### 11.1 Storage init

```c
esp_err_t dynamic_display_storage_init(void)
{
    return screen_store_init();      /* already idempotent */
}
```

### 11.2 Rebuild hook

Add `#include "dynui.h"` and, in the three places that mutate storage:

```c
/* screens_put_all_handler(), per successfully stored screen: */
if (screen_store_save_screen(canonical, json_str, strlen(json_str)) == ESP_OK) {
    remove_alias_screen_files(canonical);
    dynui_request_rebuild(canonical);        /* NEW */
    deployed++;
}

/* single_screen_put_handler(): */
if (err == ESP_OK) {
    remove_alias_screen_files(name);
    dynui_request_rebuild(name);             /* NEW */
}

/* screen_patch_handler(), after the patched JSON is written back: */
dynui_request_rebuild(name);                 /* NEW */
```

### 11.3 Status endpoint

```c
static esp_err_t status_handler(httpd_req_t *req)
{
    dynui_status_t st;
    dynui_get_status(&st);

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "ui_mode", st.dynamic_active ? "dynamic" : "compiled");
    cJSON_AddStringToObject(root, "current_screen", st.current_screen);
    cJSON_AddNumberToObject(root, "last_build_ms", st.last_build_ms);
    cJSON_AddBoolToObject(root, "build_ok", st.last_build_ok);
    cJSON_AddStringToObject(root, "last_error", st.last_error);
    cJSON_AddNumberToObject(root, "images_loaded", st.images_loaded);
    cJSON_AddNumberToObject(root, "heap_free", st.heap_free);

    char *out = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);
    esp_err_t r = send_json_str(req, out ? out : "{}");
    if (out) free(out);
    return r;
}
```

Register it **before** the catch-all `OPTIONS` entry:

```c
{.uri = "/api/eez-device/device/status", .method = HTTP_GET, .handler = status_handler},
```

`config.max_uri_handlers` is 20 and 18 are used — one more fits. Adding many more means raising it.

**Acceptance:** `curl http://<ip>/api/eez-device/device/status` returns `"ui_mode":"dynamic"`.

---

## 12. Step 11 — LCD task integration (`main/LCD_Driver/lcd_task.c`)

This is the riskiest edit; everything above is inert until it lands.

### 12.1 What `ui_init()` really does for you

```c
void ui_init(void) {
    lv_disp_t *dispp = lv_display_get_default();
    lv_theme_t *theme = lv_theme_default_init(dispp, lv_palette_main(LV_PALETTE_BLUE),
                                              lv_palette_main(LV_PALETTE_RED),
                                              true, LV_FONT_DEFAULT);
    lv_disp_set_theme(dispp, theme);
    ui_StartUpScreen_screen_init();
    …
}
```

Two side effects: it **sets the default theme**, and it creates 12 screens. If you skip it, the
theme is unset and widgets look unstyled. `dynui_theme_init()` (§6) performs the same two theme
calls — that is why it exists.

### 12.2 What is safe to skip

| Call | Verdict |
|---|---|
| `ui_init()` | safe to skip **once the theme is set**; keep it as the fallback path |
| `lv_Init_UserParameters()` | **always call it** — it only builds data-point handles (`put_io_buf`), touches no LVGL object |
| `lv_Lcd_UpdateData()` | safe with no compiled screens: every update is guarded by `UI_OBJ_READY(obj)` = `(obj != NULL && lv_obj_is_valid(obj))` |
| `MenuTask` | irrelevant — it is only created for `MINI_TSTAT10`, not the S3 Tstat11 |

### 12.3 The edit

```c
#include "dynui.h"
#include "dynamic_display_api.h"

void Lcd_Task(void *pvParameters)
{
    print_all_ram_usage();
    lv_init();
    LCD_RegesterlvglDriver();
    vTaskDelay(pdMS_TO_TICKS(2000));

    /* Mount storage + seed defaults BEFORE the first render. */
    if (dynamic_display_storage_init() != ESP_OK)
        ESP_LOGE("LcdTask", "screen_data unavailable - dynamic UI disabled");

    lv_Init_UserParameters();          /* data-point handles, no LVGL */

    bool dynamic_ok = false;
    if (dynui_init() == ESP_OK)
        dynamic_ok = (dynui_build_screen("home_screen") == ESP_OK);

    if (!dynamic_ok) {
        ESP_LOGW("LcdTask", "falling back to compiled UI");
        ui_init();                     /* sets theme + creates the 12 screens */
    }

    while (1) {
        lv_timer_handler();
        if (!dynui_is_active())
            lv_Lcd_UpdateData();       /* compiled screens only */
        dynui_process_queue();         /* NEW: apply deploys */
        vTaskDelay(pdMS_TO_TICKS(LCD_TASK_DELAY_MS));
    }
}
```

### 12.4 Why not in `app_main.c`

`LCD_Init()` + `xTaskCreate(Lcd_Task, …)` is the only Tstat11-specific block
(`app_main.c:4843-4847`). Mounting SPIFFS there would also work, but it would delay *all* other
start-up tasks (BACnet, Modbus, Wi-Fi) behind a 476 KB flash seed on first boot. Doing it inside
the LCD task keeps the boot order unchanged.

### 12.5 Stack

`Lcd_Task` is created with `4096 * 4` bytes. Building a 389-widget screen adds recursion depth
(`dynui_create_widget` nests) and cJSON parsing. Measure `uxTaskGetStackHighWaterMark(NULL)` after
a build; if the margin is under ~1 KB, raise the create call to `4096 * 5`. **Do not skip this
check** — an overflowing LCD task presents as a random panic mid-render.

**Acceptance:** panel boots to `home_screen` **from JSON**, and
`curl …/device/status` says `"ui_mode":"dynamic"`.

---

## 13. Step 12 — build, flash, verify

```
idf.py build
idf.py -p <COM> flash monitor
```

Expected boot log:

```
dynui: initialised
SPIFFS after seed: used=… free=… total=…
dynui: built 'home_screen' in 380 ms (9 images)
LcdTask: LVGL Loop Start..
```

Then, from the PC:

```bash
IP=<panel-ip>
curl -s http://$IP/api/eez-device/device/status
curl -s -X PUT http://$IP/api/eez-device/screens/home_screen \
     -H 'Content-Type: application/json' --data-binary @home_screen.json
```

Expected: `dynui: built 'home_screen' in … ms` appears **without a reboot**, and the panel
repaints.

### Step-by-step validation matrix

| Step | Command / action | Pass |
|---|---|---|
| D1 | boot | `SPIFFS after seed` logged before any `built` line |
| D2 | boot | start-up or home screen drawn from JSON; labels positioned correctly |
| D3 | boot + photo | `home_screen` matches the previous compiled build |
| D4 | boot + tap through menu | every screen opens |
| D5 | boot | temperature uses Arial80 |
| D6 | boot | icons visible |
| D7 | tap FanButton | panels toggle |
| D8 | deploy from the browser | panel repaints, no reboot |
| D9 | corrupt a screen file, reboot | compiled UI appears, panel usable |

---

## 14. Debug playbook

| Symptom | Most likely cause | Fix |
|---|---|---|
| Everything 404 | `screen_data` partition missing (G1) | align the partition table with `temco_partitions.csv` |
| Panel blank, no crash | dynamic built but root has no size/children | check `sub_type: "screen"` root and that `width/height` 0 is handled as `LV_SIZE_CONTENT` |
| Widgets piled at top-left | `align` ignored | `lv_obj_align()` not `lv_obj_set_pos()` |
| Everything unstyled (no colours) | theme not set (skipped `ui_init` **and** `dynui_theme_init`) | call `dynui_theme_init()` |
| Images blank, PNG warning | lodepng off, or cache too small | §2.1 |
| Panel shows old design after deploy | rebuild not queued, or the deployed name ≠ current screen | §11.2 + `dynui_request_rebuild` logs |
| Crash on screen switch | children freed before images/styles | free order in `screen_free()` |
| Crash after a few screens | stack (12.5) or LVGL heap | raise stack; measure heap |
| Rows overlap on the schedule screen | `flex_*` ignored | §8 flex |
| Keyboard shows, typing does nothing | no textarea target | §7 keyboard binding |

---

## 15. Rollback

| Trigger | Action |
|---|---|
| Panel unusable after flash | re-flash the previous app image; `screen_data` is untouched, so the old JSON is still there |
| Dynamic UI crashes on a specific screen | rename that screen's JSON (`POST /reset-defaults` re-seeds defaults) and reboot → compiled fallback |
| Want dynamic UI off without a re-flash | set NVS `dynui_off=1` (the §4.8 flag) → boot goes straight to `ui_init()` |

Because this phase is **parallel**, the compiled screens remain the safety net: nothing in this
guide removes them.
