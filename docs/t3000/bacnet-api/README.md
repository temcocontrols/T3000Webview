# Design Studio (Tstat11) API — Overview

How Design Studio (Tstat11) talks to a T3 controller, and how the controller stores its
touchscreen definition as JSON — the reference for the API and the data behind it.

- **HTTP REST** — the path Design Studio / EEZ Studio use: the device serves it on port 80, and
  the T3000 host proxies it for the browser.
- **BACnet private transfer** — the T3000 (C++/BACnet) path: screens as JSON over BACnet
  Private Data commands.

Both use the **same screen JSON document**. The format is documented in
[screen-json.md](screen-json.md); the commands are in [commands.md](commands.md).

> **Full device-side detail:** every endpoint, payload, status code and limit is specified in
> [DEVICE_REST_API_DISPLAY.md — firmware display REST API](https://github.com/temcocontrols/T3-programmable-controller-on-ESP32/blob/DynamicUI_Tstat11/components/temco_dynamic_display/DEVICE_REST_API_DISPLAY.md)
> (firmware repository). This section is the companion summary — start here, and follow that
> link when you need the exact contract.

---

## 1. The screen model

A controller's UI is a set of **screens**, named by a fixed, canonical list of 13 slots:

| Canonical name | Widget root name |
|---|---|
| `start_up_screen` | `StartUpScreen` |
| `home_screen` | `HomeScreen` |
| `main_menu` | `MainMenu` |
| `network_config` | `NetworkConfig` |
| `parameters` | `Parameters` |
| `protocols` | `Protocols` |
| `schedule_edit_screen` | `ScheduleEditScreen` |
| `schedule_screen` | `ScheduleScreen` |
| `time` | `Time` |
| `wifi_config` | `WifiConfig` |
| `holiday_calender_screen` | `HolidayCalenderScreen` |
| `wireguard_screen` | `WireGuardScreen` |
| `ddns_screen` | `DdnsScreen` |

Both names are accepted on the wire; the firmware normalises them (`HomeScreen` →
`home_screen`), case-insensitively, with or without a `.json` suffix.

Each screen is one JSON document:

```json
{
  "bg_color": "#000000",
  "bitmaps": ["wifisym", "rightarrow", "fan_small"],
  "fonts": [["lv_font_montserrat_18", 18], ["Arial80", 80]],
  "widgets": { "<RootWidgetName>": { "...widget tree..." } }
}
```

Images are **separate assets**, referenced by name from `bitmaps` and from a widget's `src` /
`img_pressed` / `img_released`.

---

## 2. The two transports

| | **BACnet private transfer** | **HTTP REST** |
|---|---|---|
| Where | `temco_bacnet/private/ptransfer.c` | `components/temco_dynamic_display` |
| Endpoint / command | `READ_JSON_SCREEN` 86, `READ_JSON_ITEM` 87, `WRITE_JSON_SCREEN` 186, `WRITE_JSON_ITEM` 187 | `GET/PUT /api/eez-device/screens…` |
| Storage | `group_data_new.new_item` in the `GRP_POINT` flash page | SPIFFS partition `screen_data` (`/spiffs/screens/<name>.json`) |
| Chunk size | 50 bytes per screen slot, 200 bytes per item slot | one HTTP request (512 KB cap) |
| Used by | T3000 (C++ / T3000.exe) | Design Studio, EEZ Studio, the tools in this repo |

> **Which path to use.** Design Studio and EEZ Studio use the REST path: deploy a project and
> its screens land in SPIFFS, ready to be read back. The BACnet path carries the same JSON for
> T3000's own tooling. For the device-side picture see
> [../t3-eez-studio/device-firmware-lvgl-architecture.md](../t3-eez-studio/device-firmware-lvgl-architecture.md).

---

## 3. Minimal demo

A real `start_up_screen.json` (from an imported `T3-LB-ESP_SN1028` project) — a black screen
with two labels that, 3 seconds after loading, fades to `home_screen`:

```json
{
  "bg_color": "#000000",
  "bitmaps": [],
  "fonts": [["lv_font_montserrat_40", 40]],
  "widgets": {
    "StartUpScreen": {
      "type": "Widget",
      "sub_type": "screen",
      "obj_text": "",
      "text_type": "literal",
      "x_pos": 0,
      "y_pos": 0,
      "width": 0,
      "height": 0,
      "children": {
        "Label1": {
          "type": "Widget",
          "sub_type": "label",
          "align": "center",
          "obj_text": "Tstat - 11",
          "text_type": "literal",
          "style": { "MAIN": { "DEFAULT": { "text_font": "lv_font_montserrat_40" } } }
        },
        "Label2": {
          "type": "Widget",
          "sub_type": "label",
          "align": "center",
          "y_pos": 110,
          "obj_text": "Initialising . . .",
          "text_type": "literal",
          "scroll_dir": "RIGHT"
        }
      },
      "events": {
        "SCREEN_LOADED": {
          "actions": [
            { "action": "screen_change", "screen": "home_screen",
              "anim": "FADE_IN", "delay": 3000, "speed": 1000 }
          ]
        }
      }
    }
  }
}
```

Because every widget has an **`align`** or a **`x_pos`/`y_pos`**, and `width`/`height` of `0`
means "size to content", this document is the complete definition of that screen — no C code
involved.

---

## 4. Next

- [commands.md](commands.md) — the BACnet commands, the data structures, and the REST
  equivalents.
- [screen-json.md](screen-json.md) — the full JSON reference, with worked widgets, events and
  actions from a real controller.
