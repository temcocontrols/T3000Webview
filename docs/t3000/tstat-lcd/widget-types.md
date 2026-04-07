# Widget Types

All widget types available for LCD page definitions. Each maps to an LVGL equivalent on the device firmware.

## Widget Type Reference

### `large_text` — Big Number Display

Used for prominent temperature readings. Spans multiple grid rows.

```json
{
  "type": "large_text",
  "field": "temp",
  "row": 1,
  "col": 0,
  "colSpan": 17,
  "rowSpan": 3,
  "fontSize": "72px",
  "suffix": "°C",
  "align": "center"
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `field` | string | Yes | Data field to display (e.g., `temp`, `stp`) |
| `row` | number | Yes | Grid row (0-based) |
| `col` | number | No | Grid column (0-based), default 0 |
| `colSpan` | number | No | Number of columns to span, default 17 (full width) |
| `rowSpan` | number | No | Number of rows to span, default 2 |
| `fontSize` | string | No | CSS font size, default "72px" |
| `suffix` | string | No | Text after value (e.g., "°C", "%") |
| `align` | string | No | "center", "left", "right" |

**LVGL equivalent:** `lv_label` with large font

---

### `label_value` — Label + Value Row

The most common widget. Shows a label on the left and a value in a rounded box on the right. Used for editable settings rows.

```json
{
  "type": "label_value",
  "id": "stp",
  "label": "STP",
  "field": "stp",
  "register": 345,
  "row": 3,
  "editable": true,
  "options": [10, 15, 20, 25, 30],
  "maxValue": 35,
  "minValue": 5,
  "suffix": "°C"
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique widget identifier |
| `label` | string | Yes | Left-side text label |
| `field` | string | Yes | Data field for the value |
| `register` | number | No | Modbus register number for sync |
| `row` | number | Yes | Grid row |
| `editable` | boolean | No | Can user change this value? Default false |
| `options` | array | No | Allowed values (cycle through with ▲/▼) |
| `maxValue` | number | No | Max for numeric increment |
| `minValue` | number | No | Min for numeric increment |
| `suffix` | string | No | Unit suffix |
| `navigateTo` | string | No | Page ID to navigate to when selected |

**LVGL equivalent:** `lv_obj` container with `lv_label` (label) + `lv_label` (value in box)

---

### `edit_value` — Standalone Editable Value

A large editable number in a rounded box. Used on dedicated edit pages (e.g., Setpoint page).

```json
{
  "type": "edit_value",
  "field": "stp",
  "register": 345,
  "row": 2,
  "fontSize": "36px",
  "editable": true,
  "minValue": 5.0,
  "maxValue": 35.0,
  "step": 0.5
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `field` | string | Yes | Data field |
| `register` | number | No | Modbus register |
| `row` | number | Yes | Grid row |
| `fontSize` | string | No | Default "36px" |
| `editable` | boolean | No | Default true |
| `minValue` | number | No | Minimum allowed |
| `maxValue` | number | No | Maximum allowed |
| `step` | number | No | Increment step (e.g., 0.5 for temperature) |

**LVGL equivalent:** `lv_label` with `lv_obj` border/background

---

### `header` — Page Title

Large centered text at the top of a page.

```json
{
  "type": "header",
  "text": "Communication\nSettings",
  "row": 1,
  "fontSize": "24px"
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `text` | string | Yes | Title text (supports `\n` for line breaks) |
| `row` | number | No | Starting grid row, default 1 |
| `fontSize` | string | No | Default "24px" |

**LVGL equivalent:** `lv_label` centered

---

### `text` — Static or Data-Bound Text

General-purpose text element. Can be static ("Inside") or data-bound (IP address).

```json
{
  "type": "text",
  "text": "Inside",
  "row": 4,
  "col": 8,
  "fontSize": "18px"
}
```

Or data-bound:

```json
{
  "type": "text",
  "field": "ip",
  "row": 6,
  "col": 0,
  "fontSize": "18px"
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `text` | string | No | Static text (use this OR `field`, not both) |
| `field` | string | No | Data field for dynamic text |
| `row` | number | Yes | Grid row |
| `col` | number | No | Grid column, default 0 |
| `fontSize` | string | No | Default matches page style |
| `suffix` | string | No | Appended to value (e.g., "%") |
| `color` | string | No | Text color override |

**LVGL equivalent:** `lv_label`

---

### `icon` — Single Icon

Displays a named icon at a grid position.

```json
{
  "type": "icon",
  "icon": "house",
  "row": 4,
  "col": 1,
  "size": "32px"
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `icon` | string | Yes | Icon name (see Icon Library below) |
| `row` | number | Yes | Grid row |
| `col` | number | Yes | Grid column |
| `size` | string | No | Icon size, default "32px" |
| `opacity` | number | No | 0.0 to 1.0, for dimmed/active states |

**Available icons:** `house`, `moon`, `snowflake`, `fan`, `wifi`, `sun`, `leaf`, `thermometer`

**LVGL equivalent:** `lv_img` or custom bitmap

---

### `icon_bar` — Row of Navigation Icons

A horizontal row of icons at the bottom of the page, used for page navigation.

```json
{
  "type": "icon_bar",
  "row": 9,
  "icons": [
    { "icon": "moon", "pageId": "schedule" },
    { "icon": "house", "pageId": "main" },
    { "icon": "snowflake", "pageId": "inside" },
    { "icon": "fan", "pageId": "fan_control" }
  ]
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `row` | number | Yes | Grid row |
| `icons` | array | Yes | Array of icon objects |
| `icons[].icon` | string | Yes | Icon name |
| `icons[].pageId` | string | No | Page to navigate to when selected |

**LVGL equivalent:** Row of `lv_img` buttons

---

### `wifi_icon` — WiFi Signal Indicator

Special widget for WiFi signal strength, always top-right.

```json
{
  "type": "wifi_icon",
  "row": 0,
  "col": 16
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `row` | number | No | Default 0 |
| `col` | number | No | Default 16 (far right) |

**LVGL equivalent:** `lv_img` with signal strength variants

---

### `divider` — Horizontal Line

A separator line spanning the full width.

```json
{
  "type": "divider",
  "row": 3,
  "color": "#ffffff",
  "opacity": 0.3
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `row` | number | Yes | Grid row to place the line |
| `color` | string | No | Line color, default "#ffffff" |
| `opacity` | number | No | Default 0.3 |

**LVGL equivalent:** `lv_line`

---

### `footer_hint` — Hint Text

Small text at the bottom showing button hints.

```json
{
  "type": "footer_hint",
  "text": "+  Edit  -",
  "row": 8
}
```

**LVGL equivalent:** `lv_label` at bottom area

---

### `footer_nav` — Navigation Text

Navigation hints at the very bottom.

```json
{
  "type": "footer_nav",
  "text": "< Back   Next >",
  "row": 9
}
```

**LVGL equivalent:** `lv_label` at bottom area

---

## Widget Type Summary

| Type | Purpose | Editable | LVGL |
|---|---|---|---|
| `large_text` | Big temperature/number display | No | `lv_label` |
| `label_value` | Settings row (label + value) | Yes | `lv_obj` + `lv_label` × 2 |
| `edit_value` | Standalone editable number | Yes | `lv_label` + `lv_obj` |
| `header` | Page title | No | `lv_label` |
| `text` | Static or dynamic text | No | `lv_label` |
| `icon` | Single icon | No | `lv_img` |
| `icon_bar` | Navigation icon row | No | `lv_img` × N |
| `wifi_icon` | WiFi signal | No | `lv_img` |
| `divider` | Horizontal line | No | `lv_line` |
| `footer_hint` | Button hints | No | `lv_label` |
| `footer_nav` | Navigation hints | No | `lv_label` |
