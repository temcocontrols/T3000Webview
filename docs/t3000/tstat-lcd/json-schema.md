# JSON Schema — screenDefinition.json

The complete specification for the multi-page LCD screen definition file.

## Top-Level Structure

```json
{
  "device": "tstat11",
  "version": "1.0.0",
  "lcdSize": { "width": 320, "height": 480 },
  "grid": { "cols": 17, "rows": 10 },
  "globalStyles": {
    "bg": "#003366",
    "fontFamily": "'Fira Mono', 'Consolas', 'Menlo', monospace",
    "fontSize": "24px",
    "fontWeight": "700",
    "textColor": "#ffffff"
  },
  "data": {
    "temp": 23.3,
    "stp": 15.5,
    "hum": 45,
    "fan": "AUTO",
    "sys": "AUTO",
    "modbus": 133,
    "baud": 115200,
    "mode": "MODBUS",
    "ip": "168.0.151"
  },
  "pages": [ ... ],
  "navigation": {
    "type": "linear",
    "order": ["main", "setpoint", "inside", "comm_settings"],
    "wrapAround": true
  }
}
```

## Field Descriptions

### Root Object

| Field | Type | Required | Description |
|---|---|---|---|
| `device` | string | Yes | Device model identifier ("tstat10", "tstat11") |
| `version` | string | Yes | Schema version |
| `lcdSize` | object | Yes | LCD pixel dimensions |
| `lcdSize.width` | number | Yes | Always 320 |
| `lcdSize.height` | number | Yes | Always 480 |
| `grid` | object | Yes | Character grid dimensions |
| `grid.cols` | number | Yes | Number of columns (17) |
| `grid.rows` | number | Yes | Number of rows (10) |
| `globalStyles` | object | No | Default styles for all pages |
| `data` | object | Yes | Current device data values |
| `pages` | array | Yes | Array of page definitions |
| `navigation` | object | Yes | How pages are connected |

### `data` Object

Runtime values from the device. Each field can be referenced by widgets via the `field` property.

| Field | Type | Description | Register |
|---|---|---|---|
| `temp` | number | Current temperature (°C) | Read-only sensor |
| `stp` | number | Setpoint temperature (°C) | Read/write |
| `hum` | number | Humidity (%) | Read-only sensor |
| `fan` | string/number | Fan mode | Read/write |
| `sys` | string/number | System mode | Read/write |
| `modbus` | number | Modbus address | Read/write |
| `baud` | number | Baud rate | Read/write |
| `mode` | string | Protocol (MODBUS/BACNET) | Read/write |
| `ip` | string | IP address | Read-only |

### `pages` Array

Each page object:

```json
{
  "id": "main",
  "label": "Home",
  "icon": "house",
  "styles": {
    "bg": "#003366",
    "highlight": "#008080",
    "fontFamily": "'Fira Mono', monospace",
    "fontSize": "24px",
    "fontWeight": "700",
    "textWidthChars": 6,
    "valueBoxWidthChars": 8
  },
  "widgets": [ ... ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique page identifier |
| `label` | string | Yes | Human-readable page name |
| `icon` | string | No | Icon for page in icon bar navigation |
| `styles` | object | No | Page-level style overrides (merges with globalStyles) |
| `styles.bg` | string | No | Background color |
| `styles.highlight` | string | No | Focused row highlight color |
| `styles.fontFamily` | string | No | Font family |
| `styles.fontSize` | string | No | Base font size |
| `styles.fontWeight` | string | No | Font weight |
| `styles.textWidthChars` | number | No | Label column width in characters |
| `styles.valueBoxWidthChars` | number | No | Value box width in characters |
| `widgets` | array | Yes | Array of widget objects on this page |

### `navigation` Object

```json
{
  "type": "linear",
  "order": ["main", "setpoint", "inside", "comm_settings"],
  "wrapAround": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string | Yes | "linear" (cycle through) or "tree" (hierarchical, future) |
| `order` | array | Yes | Page IDs in navigation order |
| `wrapAround` | boolean | No | Wrap from last to first page? Default true |

## Complete Example

```json
{
  "device": "tstat11",
  "version": "1.0.0",
  "lcdSize": { "width": 320, "height": 480 },
  "grid": { "cols": 17, "rows": 10 },
  "globalStyles": {
    "bg": "#003366",
    "fontFamily": "'Fira Mono', 'Consolas', 'Menlo', monospace",
    "fontSize": "24px",
    "fontWeight": "700",
    "textColor": "#ffffff"
  },
  "data": {
    "temp": 23.3,
    "stp": 15.5,
    "hum": 45,
    "fan": "AUTO",
    "sys": "AUTO",
    "modbus": 133,
    "baud": 115200,
    "mode": "MODBUS",
    "ip": "168.0.151"
  },
  "pages": [
    {
      "id": "main",
      "label": "Home",
      "icon": "house",
      "widgets": [
        { "type": "wifi_icon", "row": 0, "col": 16 },
        { "type": "large_text", "field": "temp", "row": 1, "colSpan": 17, "rowSpan": 2, "fontSize": "72px", "suffix": "°C" },
        { "type": "divider", "row": 3 },
        { "type": "label_value", "id": "stp", "label": "STP", "field": "stp", "row": 3, "editable": true, "suffix": "°C" },
        { "type": "label_value", "id": "fan", "label": "FAN", "field": "fan", "row": 4, "editable": true, "options": ["AUTO", -2, -1, 0, 1, 2, 3] },
        { "type": "label_value", "id": "sys", "label": "SYS", "field": "sys", "row": 5, "editable": true, "options": ["AUTO", 0, 1, 2] },
        { "type": "text", "field": "ip", "row": 6, "fontSize": "18px" },
        { "type": "icon_bar", "row": 9, "icons": [
          { "icon": "moon" },
          { "icon": "house", "pageId": "main" },
          { "icon": "snowflake", "pageId": "inside" },
          { "icon": "fan" }
        ]}
      ]
    },
    {
      "id": "setpoint",
      "label": "Setpoint",
      "widgets": [
        { "type": "wifi_icon", "row": 0, "col": 16 },
        { "type": "header", "text": "Setpoint", "row": 1 },
        { "type": "edit_value", "field": "stp", "row": 2, "fontSize": "36px", "editable": true, "minValue": 5.0, "maxValue": 35.0, "step": 0.5 },
        { "type": "icon", "icon": "house", "row": 4, "col": 1 },
        { "type": "text", "text": "Inside", "row": 4, "col": 8 },
        { "type": "large_text", "field": "temp", "row": 5, "rowSpan": 2, "fontSize": "48px", "suffix": "°C" },
        { "type": "text", "text": "HUM", "row": 8, "col": 0 },
        { "type": "text", "field": "hum", "row": 8, "col": 5, "suffix": "%" }
      ]
    },
    {
      "id": "inside",
      "label": "Inside",
      "icon": "house",
      "widgets": [
        { "type": "wifi_icon", "row": 0, "col": 16 },
        { "type": "icon", "icon": "house", "row": 1, "col": 1 },
        { "type": "text", "text": "Inside", "row": 1, "col": 8 },
        { "type": "large_text", "field": "temp", "row": 3, "colSpan": 17, "rowSpan": 2, "fontSize": "72px", "suffix": "°C" },
        { "type": "text", "text": "HUM", "row": 7, "col": 0 },
        { "type": "text", "field": "hum", "row": 7, "col": 5, "suffix": "%" },
        { "type": "icon", "icon": "snowflake", "row": 7, "col": 14, "size": "28px" },
        { "type": "icon", "icon": "fan", "row": 8, "col": 14, "size": "28px" }
      ]
    },
    {
      "id": "comm_settings",
      "label": "Comm Settings",
      "styles": {
        "highlight": "#008080",
        "textWidthChars": 6,
        "valueBoxWidthChars": 8
      },
      "widgets": [
        { "type": "header", "text": "Communication\nSettings", "row": 1 },
        { "type": "label_value", "id": "modbus", "label": "Modbus", "field": "modbus", "register": 6, "row": 4, "editable": true, "maxValue": 247, "minValue": 1 },
        { "type": "label_value", "id": "baud", "label": "Baud", "field": "baud", "register": 7, "row": 5, "editable": true, "options": [1200, 2400, 3600, 4800, 7200, 9600, 19200, 38400, 57600, 76800, 115200, 921600] },
        { "type": "label_value", "id": "mode", "label": "Mode", "field": "mode", "register": 8, "row": 6, "editable": true, "options": ["MODBUS", "BACNET"] },
        { "type": "footer_hint", "text": "+  Edit  -", "row": 8 },
        { "type": "footer_nav", "text": "< Back   Next >", "row": 9 }
      ]
    }
  ],
  "navigation": {
    "type": "linear",
    "order": ["main", "setpoint", "inside", "comm_settings"],
    "wrapAround": true
  }
}
```

## Validation Rules

1. Every page `id` must be unique
2. Every page `id` referenced in `navigation.order` must exist in `pages`
3. Widget `field` values must reference keys in the `data` object
4. Widget `register` values must be valid Modbus register numbers
5. `options` arrays with all numbers should be sorted ascending
6. `row` values must be 0 to `grid.rows - 1`
7. `col` values must be 0 to `grid.cols - 1`
