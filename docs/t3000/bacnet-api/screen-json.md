# Screen JSON — Format Reference

The JSON document a T3 controller stores for each screen. Every example below is taken from a
real import (`T3-LB-ESP_SN1028`).

---

## 1. Document shape

```json
{
  "bg_color": "#000000",
  "bitmaps": ["wifisym", "fan_small"],
  "fonts": [["lv_font_montserrat_18", 18]],
  "widgets": { "<RootWidgetName>": { … } }
}
```

| Key | Type | Meaning |
|---|---|---|
| `bg_color` | string | Screen background colour, `#RRGGBB` |
| `bitmaps` | string[] | Names of the images this screen uses |
| `fonts` | `[name, size][]` | Fonts this screen uses, e.g. `["Arial80", 80]` |
| `widgets` | object | **One** entry: the screen's root widget, keyed by the screen name |

---

## 2. Widget object

Every node — the root and every child — is a widget with the same shape:

```json
{
  "type": "Widget",
  "sub_type": "label",
  "align": "center",
  "x_pos": 0,
  "y_pos": 110,
  "width": 0,
  "height": 0,
  "obj_text": "Initialising . . .",
  "text_type": "literal",
  "style": { "MAIN": { "DEFAULT": { "text_font": "lv_font_montserrat_40" } } },
  "children": { },
  "events": { }
}
```

| Field | Notes |
|---|---|
| `type` | Always `"Widget"` |
| `sub_type` | What kind of widget — see [Widget kinds](#widget-kinds-sub-type) below |
| `align` | `center`, `top_mid`, `bottom_mid`, `left_mid`, `right_mid` — positioning on the parent |
| `x_pos` / `y_pos` | Offset from the alignment (or absolute position) |
| `width` / `height` | Pixels; **`0` means "size to content"** |
| `obj_text` | Text for labels/buttons |
| `text_type` | `literal` (fixed) or `expression` (built from variables) |
| `style` | Named/inline styles — see [Styles](#3-styles) |
| `children` | Nested widgets, keyed by widget name |
| `events` | Event handlers — see [Events and actions](#6-events-and-actions) |

### Widget kinds (`sub_type`)

Observed on a real controller: `screen`, `panel`, `label`, `button`, `imagebutton`, `image`,
`switch`, `checkbox`, `dropdown`, `roller`, `textarea`, `keyboard`, `calendar`, `arc`.

`bar` and `slider` are also supported by the exporter.

Widget **names** are the keys in `children`, and must be unique within a screen — the same
name is what a `flag_modify` action targets.

---

## 3. Styles

A style is keyed by **part**, then by **state**:

```json
"style": { "MAIN": { "DEFAULT": { "bg_color": "#3C3C3C", "bg_opa": 255, "radius": 100 } } }
```

Parts seen in use: `MAIN`, `INDICATOR`, `ITEMS`, `KNOB`, `SCROLLBAR`, `SELECTED`.
`DEFAULT` is the default state (other states follow LVGL, e.g. pressed/checked).

Style properties used by real screens, grouped:

| Group | Properties |
|---|---|
| Geometry | `pad_all`, `pad_top`, `pad_bottom`, `pad_left`, `pad_right`, `radius`, `rotation` |
| Background | `bg_color`, `bg_opa`, `bg_grad_color`, `bg_grad_dir`, `bg_grad_stop`, `bg_main_stop`, `bg_start_angle`, `bg_end_angle` |
| Border / outline | `border_color`, `border_opa`, `border_width`, `border_side`, `outline_color`, `outline_opa`, `outline_width`, `outline_pad` |
| Shadow | `shadow_color`, `shadow_opa`, `shadow_width`, `shadow_spread`, `shadow_offset_x`, `shadow_offset_y` |
| Text | `text_color`, `text_opa`, `text_font`, `text_align`, `text_decor`, `text_letter_space`, `text_line_space` |
| Arc | `arc_color`, `arc_opa`, `arc_width` |
| Layout | `flex_flow`, `flex_main`, `flex_cross`, `flex_track`, `opa` |
| Misc | `scroll_dir`, `long_mode`, `min`, `max`, `value`, `placeholder`, `today_day`, `today_month`, `today_year` |

---

## 4. Worked example — an image button with two actions

This is the real `FanButton` from `home_screen.json`: a 35 × 35 image button that toggles one
panel's visibility and shows another.

```json
"FanButton": {
  "type": "Widget",
  "sub_type": "imagebutton",
  "align": "center",
  "x_pos": -200,
  "y_pos": 130,
  "width": 35,
  "height": 35,
  "obj_text": "",
  "text_type": "literal",
  "img_released": "fan_small",
  "img_pressed": "fan_small",
  "events": {
    "CLICKED": {
      "actions": [
        { "action": "flag_modify", "flag": "hidden", "mode": "toggle", "target": "FanModePanel" },
        { "action": "flag_modify", "flag": "hidden", "mode": "add",    "target": "SysModePanel" }
      ]
    }
  }
}
```

Notes:

- `img_released` / `img_pressed` name **bitmaps** declared in the screen's `bitmaps` array.
- The two actions run in order on one click.
- `mode` is `toggle` or `add` (with `add`, targeting a panel means "show it").

---

## 5. Worked example — an image with a style

A small dot indicator from `main_menu.json`:

```json
"MenuDot": {
  "type": "Widget",
  "sub_type": "image",
  "align": "bottom_mid",
  "height": 19,
  "obj_text": "",
  "text_type": "literal",
  "src": "displayscreendotformenuscreen_gray",
  "style": { "MAIN": { "DEFAULT": { "opa": 150 } } }
}
```

An `image` uses `src`; an `imagebutton` uses `img_released` / `img_pressed`.

---

## 6. Events and actions

**Event names** used by real screens:

| Event | Fires when |
|---|---|
| `CLICKED` | The widget is tapped |
| `VALUE_CHANGED` | A switch / slider / dropdown / roller changed |
| `SCREEN_LOADED` | The screen finished loading |
| `READY` | The widget is ready |
| `FOCUSED` | The widget gained focus |
| `ALL` | Catch-all |

**Actions** used by real screens:

| Action | Fields | Meaning |
|---|---|---|
| `screen_change` | `screen`, `anim`, `delay`, `speed` | Navigate to another screen |
| `flag_modify` | `target`, `flag`, `mode` | Change a widget flag (e.g. `hidden`) |

`screen_change` example — from `start_up_screen.json`, a 3-second splash that fades into the
home screen:

```json
"events": {
  "SCREEN_LOADED": {
    "actions": [
      { "action": "screen_change", "screen": "home_screen",
        "anim": "FADE_IN", "delay": 3000, "speed": 1000 }
    ]
  }
}
```

---

## 7. Naming and files on disk

Screen **root widget names** and their canonical **file names** are fixed — see **The screen
model** in [README.md](README.md). On the wire either spelling is accepted; the firmware
normalises them.

An imported project keeps what the device returned:

```
project/<name>_SN<serial>/
  ├── <name>_SN<serial>.eez-project
  └── device-import/
      ├── start_up_screen.json          ← one file per screen, exactly as received
      ├── home_screen.json
      ├── …
      └── imgs/                         ← bitmaps referenced by the screens
          ├── fan_small.png
          └── …
```

A deploy writes the opposite direction into `device-export/` (one minified JSON per screen,
plus `images/` and `deploy-manifest.json`).

> **Sizes.** Real screens range from ~0.7 KB (`start_up_screen`, 762 B) to ~45 KB
> (`schedule_edit_screen`, 44 817 B). Everything is plain uncompressed JSON.

---

## 8. Round-trip

```
device JSON  ──(Import from Device / firmwareToProject)──▶  .eez-project  ──(editor)──▶  .eez-project
                                                                                             │
                                                       device JSON  ◀──(transformToDeviceJson)┘
```

The exporter emits exactly this schema, so an unedited import re-exports to an equivalent
document — which is why the deploy pipeline can diff the two and skip unchanged screens. See
[../t3-eez-studio/import-from-device-design.md](../t3-eez-studio/import-from-device-design.md)
and
[../t3-eez-studio/device-interface-deployment-via-bacnet-design.md](../t3-eez-studio/device-interface-deployment-via-bacnet-design.md).

---

## 9. See also

- [commands.md](commands.md) — how a document gets to and from the device.
- [README.md](README.md) — overview and the 13 canonical screen names.
