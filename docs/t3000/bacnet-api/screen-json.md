# Screen JSON — format reference

The document the controller stores for one screen, and the document the exporter produces. This page
is the normative definition of that format; where other pages need the shape they link here.

**Applies to:** shipped code — the device stores and serves exactly this shape
(`components/temco_dynamic_display/src/screen_flash_store.c`, `DefaultScreens/*.json`).

**Not covered here:** the `.eez-project` editor source format
([../t3-eez-studio/lvgl-eez-project-json-format.md](../t3-eez-studio/lvgl-eez-project-json-format.md)),
the transport ([device-interface-deployment-via-bacnet-design.md](../t3-eez-studio/device-interface-deployment-via-bacnet-design.md)),
and rendering algorithms ([../t3-eez-studio/phase2-device-renderer-design.md](../t3-eez-studio/phase2-device-renderer-design.md)).

Transport is HTTP. BACnet carries point data, not screens.

---

## 1. Document shape

```json
{
  "bg_color": "#000000",
  "bitmaps": ["wifisym", "fan_small"],
  "fonts": [["lv_font_montserrat_18", 18]],
  "widgets": { "HomeScreen": { "type": "Widget", "sub_type": "screen", "children": {} } }
}
```

| Key | Type | Required | Meaning |
|---|---|---|---|
| `bg_color` | `"#RRGGBB"` | no | screen background |
| `bitmaps` | `string[]` | no | names of the images this screen references; each resolves to `/spiffs/images/<name>.json` |
| `fonts` | `[name, size][]` | no | **tuple array, not objects**. Consumers accept both spellings |
| `widgets` | `{ <RootKey>: widget }` | yes | exactly one entry: the screen root, `sub_type: "screen"` |

A `schema` integer has been proposed as an envelope field so a device can reject a document produced
by a newer exporter. It is **not implemented**; documents in the field carry no `schema` key.

## 2. Root widget key

The root key is the screen name in PascalCase (`home_screen` → `HomeScreen`), produced by
`nativeKey()`, with one override: `wireguard_screen` → `WireGuardScreen`.

Consumers must not depend on the key's value — render whatever key is present.

## 3. Widget object — common fields

Every node, root and child alike, carries all six of these:

| Field | Type | Meaning |
|---|---|---|
| `type` | `"Widget"` | constant |
| `sub_type` | string | widget kind, §6 |
| `x_pos`, `y_pos` | int, may be negative | position, or **offset from `align`**, §5 |
| `width`, `height` | int | pixels; **`0` ⇒ `LV_SIZE_CONTENT`** |
| `obj_text` | string | text content (label, checkbox, textarea, occasionally button) |
| `text_type` | `"literal"` \| `"expression"` | see §12 — the renderer specification treats both as literal text |

## 4. Optional fields

| Field | Type | Meaning |
|---|---|---|
| `align` | string | anchors the widget; absent ⇒ absolute `x_pos`/`y_pos` |
| `style` | object | §7 |
| `children` | `{ <name>: widget }` | nested widgets, keyed by widget name |
| `events` | `{ <TRIGGER>: { actions: […] } }` | §8 |
| `hidden` | `true` | start hidden |
| `disabled` | `true` | start disabled |
| `clickable` | `false` | not clickable |
| `flex_flow`, `flex_main`, `flex_cross`, `flex_track` | string | **top-level**, lifted out of `style` by the exporter |

`flex_*` is load-bearing: `schedule_screen` lays out its 8 rows with flex rather than `align`. A
consumer that ignores it collapses every row onto the last one.

Widget **names** are the `children` keys. They are unique within a screen, and a `flag_modify`
action targets them by name.

## 5. `align` vocabulary and semantics

| JSON | LVGL 9 |
|---|---|
| `center` | `LV_ALIGN_CENTER` |
| `top_left`, `top_mid`, `top_right` | `LV_ALIGN_TOP_LEFT`, `LV_ALIGN_TOP_MID`, `LV_ALIGN_TOP_RIGHT` |
| `bottom_left`, `bottom_mid`, `bottom_right` | `LV_ALIGN_BOTTOM_LEFT`, `LV_ALIGN_BOTTOM_MID`, `LV_ALIGN_BOTTOM_RIGHT` |
| `left_mid`, `right_mid` | `LV_ALIGN_LEFT_MID`, `LV_ALIGN_RIGHT_MID` |

When `align` is present, `x_pos`/`y_pos` are **offsets from that anchor**, not coordinates. 373 of
the 389 widgets in the default screens carry `align`.

```json
"Label2": { "align": "center", "x_pos": 0, "y_pos": 110, "width": 0, "height": 0,
            "obj_text": "Initialising . . .", "sub_type": "label", "text_type": "literal" }
```

```c
lv_obj_t *l = lv_label_create(root);
lv_label_set_text(l, "Initialising . . .");
lv_obj_set_width(l, LV_SIZE_CONTENT);
lv_obj_set_height(l, LV_SIZE_CONTENT);
lv_obj_align(l, LV_ALIGN_CENTER, 0, 110);      /* not lv_obj_set_pos(l, 0, 110) */
```

## 6. Widget kinds (`sub_type`)

Counts are from the 13 default screens.

| `sub_type` | count | LVGL constructor | Type-specific fields |
|---|---:|---|---|
| `screen` | 13 | `lv_obj_create(NULL)` | — root; `bg_color` comes from the envelope |
| `label` | 119 | `lv_label_create` | `long_mode`, `recolor` |
| `textarea` | 89 | `lv_textarea_create` | `placeholder`, `one_line` |
| `panel` | 63 | `lv_obj_create` | — container for `children` |
| `button` | 45 | `lv_button_create` | `inner_align`, `checked`, `checked_type` |
| `imagebutton` | 17 | `lv_imagebutton_create` | `img_released`, `img_pressed`, `img_disabled` |
| `switch` | 11 | `lv_switch_create` | `checked`, `checked_type` |
| `dropdown` | 9 | `lv_dropdown_create` | `options[]`, `selected` |
| `image` | 9 | `lv_image_create` | `src`, `rotation`, `pivot_x`, `pivot_y` |
| `keyboard` | 5 | `lv_keyboard_create` | — the target textarea is not in the payload |
| `checkbox` | 4 | `lv_checkbox_create` | text is in `obj_text` |
| `arc` | 2 | `lv_arc_create` | `min`, `max`, `value`, `rotation`, `bg_start_angle`, `bg_end_angle`, `mode` |
| `calendar` | 2 | `lv_calendar_create` | `today_year`, `today_month`, `today_day`, `header` |
| `roller` | 1 | `lv_roller_create` | `options[]`, `selected` |

Emittable but not present in the defaults: `bar` and `slider` (`lv_bar_create` /
`lv_slider_create`, with `min`/`max`/`value`), and `user_widget`, which a device cannot resolve —
log a warning and render nothing.

## 7. Style object

A style is keyed by **part**, then by **state**:

```json
"style": {
  "MAIN":      { "DEFAULT": { "bg_color": "#3B62C1", "radius": 50, "pad_left": 2 },
                 "CHECKED": { "bg_color": "#00AA00" } },
  "INDICATOR": { "DEFAULT": {} },
  "KNOB":      { "DEFAULT": {} },
  "SCROLLBAR": { "DEFAULT": {} },
  "ITEMS":     { "DEFAULT": {} },
  "SELECTED":  { "DEFAULT": {} }
}
```

| JSON part | LVGL part | JSON state | LVGL state |
|---|---|---|---|
| `MAIN` | `LV_PART_MAIN` | `DEFAULT` | `LV_STATE_DEFAULT` |
| `INDICATOR` | `LV_PART_INDICATOR` | `CHECKED` | `LV_STATE_CHECKED` |
| `KNOB` | `LV_PART_KNOB` | `FOCUSED` | `LV_STATE_FOCUSED` |
| `SCROLLBAR` | `LV_PART_SCROLLBAR` | `DISABLED` | `LV_STATE_DISABLED` |
| `ITEMS` | `LV_PART_ITEMS` | | |
| `SELECTED` | `LV_PART_SELECTED` | | |

The complete property set measured across all 13 screens — 37 properties:

| Group | Properties | LVGL setter |
|---|---|---|
| background | `bg_color`, `bg_opa`, `radius`, `bg_grad_color`, `bg_grad_dir`, `bg_grad_stop`, `bg_main_stop`, `bg_start_angle`, `bg_end_angle` | `lv_style_set_bg_*`, `lv_style_set_radius` |
| border | `border_color`, `border_opa`, `border_width`, `border_side` | `lv_style_set_border_*` |
| outline | `outline_color`, `outline_opa`, `outline_width`, `outline_pad` | `lv_style_set_outline_*` |
| shadow | `shadow_color`, `shadow_opa`, `shadow_width`, `shadow_spread`, `shadow_offset_x`, `shadow_offset_y` | `lv_style_set_shadow_*` |
| text | `text_font`, `text_color`, `text_opa`, `text_align`, `text_letter_space`, `text_line_space`, `text_decor` | `lv_style_set_text_*` |
| padding | `pad_all`, `pad_left`, `pad_top`, `pad_right`, `pad_bottom` | `lv_style_set_pad_*` |
| arc | `arc_color`, `arc_opa`, `arc_width` | `lv_style_set_arc_*` |
| misc | `opa`, `rotation`, `scroll_dir`, `long_mode`, `min`, `max`, `value`, `placeholder` | object property setters, not style setters |

Value encodings:

| Property family | Encoding |
|---|---|
| colours | `"#RRGGBB"` → `lv_color_hex(0xRRGGBB)` |
| opacities | `0..255` |
| `border_side` | `"full"` / `"none"` → `LV_BORDER_SIDE_FULL` / `LV_BORDER_SIDE_NONE` |
| `bg_grad_dir` | `"ver"` / `"hor"` / `"none"` |
| `text_align` | `"left"` / `"center"` / `"right"` |
| `text_font` | font name, resolved through the font registry |
| `flex_flow` | e.g. `"column"`, `"row_wrap"` → `LV_FLEX_FLOW_*` |

Recommended implementation: one `lv_style_t` per (part, state) pair actually present, built with
`lv_style_init()` + setters, attached with `lv_obj_add_style(obj, &style, part | state)`, and kept
alive for the lifetime of the screen.

## 8. Events and actions

```json
"events": { "CLICKED": { "actions": [ { "action": "flag_modify", "flag": "hidden",
                                        "mode": "toggle", "target": "FanModePanel" } ] } }
```

| Trigger | LVGL event | Occurrences in defaults |
|---|---|---:|
| `CLICKED` | `LV_EVENT_CLICKED` | 127 |
| `SCREEN_LOADED` | `LV_EVENT_SCREEN_LOADED` | 13, root only |
| `VALUE_CHANGED` | `LV_EVENT_VALUE_CHANGED` | 0 |
| `READY`, `FOCUSED`, `ALL` | `LV_EVENT_READY`, `LV_EVENT_FOCUSED`, `LV_EVENT_ALL` | 0 |

Only two actions reach the device; the exporter emits `null` for every other action type:

| Action | Fields | Effect |
|---|---|---|
| `screen_change` | `screen`, `anim`, `speed`, `delay` | navigate to another screen; `delay` is in ms before the transition starts |
| `flag_modify` | `target`, `flag`, `mode` | change a flag on a widget **in the same screen**; `flag` supports `hidden`, `mode` is `add`/`remove`/`toggle` |

`anim` values seen in the defaults: `FADE_IN`. Map the LVGL 9 set (`FADE_ON`, `MOVE_LEFT`,
`MOVE_RIGHT`, `MOVE_TOP`, `MOVE_BOTTOM`, `OVER_LEFT`, …) and fall back to `FADE_ON`.

Actions in one event run in array order.

## 9. Image references

Images are referenced **by name only**. The bytes live in a separate record,
`/spiffs/images/<name>.json`.

| Field | Used by | Meaning |
|---|---|---|
| `bitmaps[]` (envelope) | screen | every image the screen references |
| `src` | `image` | image name |
| `img_released`, `img_pressed`, `img_disabled` | `imagebutton` | image names per state |

An image record:

```json
{ "name": "fan_small", "width": 35, "height": 35, "color_format": "ARGB8888",
  "png_base64": "…", "data_base64": "…" }
```

Storage and transfer rules are in
[screen-deploy-lifecycle-design.md](../t3-eez-studio/screen-deploy-lifecycle-design.md) §9.

## 10. Worked examples

**Image button with two actions** — the real `FanButton` from `home_screen`:

```json
"FanButton": {
  "type": "Widget", "sub_type": "imagebutton",
  "align": "center", "x_pos": -200, "y_pos": 130, "width": 35, "height": 35,
  "obj_text": "", "text_type": "literal",
  "img_released": "fan_small", "img_pressed": "fan_small",
  "events": {
    "CLICKED": { "actions": [
      { "action": "flag_modify", "flag": "hidden", "mode": "toggle", "target": "FanModePanel" },
      { "action": "flag_modify", "flag": "hidden", "mode": "add",    "target": "SysModePanel" }
    ] }
  }
}
```

**Image with a style** — `MenuDot` from `main_menu`:

```json
"MenuDot": {
  "type": "Widget", "sub_type": "image",
  "align": "bottom_mid", "height": 19,
  "obj_text": "", "text_type": "literal",
  "src": "displayscreendotformenuscreen_gray",
  "style": { "MAIN": { "DEFAULT": { "opa": 150 } } }
}
```

**Timed navigation** — the 3-second splash from `start_up_screen`:

```json
"events": { "SCREEN_LOADED": { "actions": [
  { "action": "screen_change", "screen": "home_screen",
    "anim": "FADE_IN", "delay": 3000, "speed": 1000 } ] } }
```

## 11. Limits and sizes

| Limit | Value | Source |
|---|---|---|
| HTTP request body | 512 KiB | `dynamic_display_api.c:71-75` |
| smallest default screen | 762 B (`start_up_screen`) | `DefaultScreens/` |
| largest default screen | 153 KB | `DefaultScreens/` |
| partition holding all screens and images | 1 MiB (`screen_data` @ `0x780000`) | `temco_partitions.csv:20` |

Everything is plain, uncompressed JSON. A document above the body limit is refused by the device
before parsing.

## 12. What the document does not contain

| Absent | Consequence |
|---|---|
| evaluated expressions — `text_type: "expression"` carries source text | a value bound to device data renders as its raw expression text |
| font files or bitmap bytes | they are separate `/spiffs/images/<name>.json` records |
| a schema version | no way for a device to reject a document from a newer exporter |
| resolvable `user_widget` targets | a device cannot render them |

## 13. Files on disk and round-trip

Screens are one file each: `/spiffs/screens/<name>.json`. The 13 canonical screen names and their
root keys are listed in [../t3-eez-studio/README.md](../t3-eez-studio/README.md). Either spelling is
accepted on the wire; the firmware normalises them.

An imported project keeps exactly what the device returned:

```text
project/<name>_SN<serial>/
├── <name>_SN<serial>.eez-project
└── device-import/
    ├── start_up_screen.json
    ├── home_screen.json
    ├── …
    └── imgs/fan_small.png
```

A deploy writes the other direction into `device-export/`: one minified JSON per screen, plus
`images/` and `deploy-manifest.json`.

```text
device JSON ──(import: firmwareToProject)──▶ .eez-project ──(editor)──▶ .eez-project
                                                                            │
                                        device JSON ◀──(transformToDeviceJson)┘
```

The exporter emits exactly this schema, so an unedited import re-exports to an equivalent document.
That equivalence is what lets the deploy pipeline diff content and skip unchanged screens — see
[import-from-device-design.md](../t3-eez-studio/import-from-device-design.md) and
[screen-deploy-lifecycle-design.md](../t3-eez-studio/screen-deploy-lifecycle-design.md).
