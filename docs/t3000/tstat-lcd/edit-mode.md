# LCD Screen Designer

Visual drag-and-drop editor for creating LCD screen layouts from a blank canvas.

## Core Concept

The designer starts with an **empty 320×480 canvas** — a blank LCD screen. A **Widget Toolbox** panel provides categorized widget types that the designer drags onto the canvas. Widgets snap to the 17×10 character grid. The designer adjusts each widget's position, text, font size, alignment, and data bindings. Multiple pages can be created. The final output is exported as `screenDefinition.json` and synced to the device.

This is the primary design tool — not a secondary "edit" mode on top of existing pages. The hardware screens shown in photos (Main, Setpoint, Inside, Comm Settings) are simply **example layouts** that were created using this designer.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌──────────┐   ┌──────────────────────┐   ┌────────────────────┐  │
│  │ TOOLBOX  │   │    LCD CANVAS        │   │  PROPERTIES        │  │
│  │          │   │    320 × 480         │   │                    │  │
│  │ ┌──────┐ │   │  ┌────────────────┐  │   │  Selected: STP row │  │
│  │ │Label │ │   │  │                │  │   │  ┌──────────────┐ │  │
│  │ └──────┘ │   │  │  (blank grid)  │  │   │  │Label: STP    │ │  │
│  │ ┌──────┐ │   │  │                │  │   │  │Font: 24px    │ │  │
│  │ │Text  │ │   │  │   drag here    │  │   │  │Align: left   │ │  │
│  │ └──────┘ │   │  │                │  │   │  │Field: stp    │ │  │
│  │ ┌──────┐ │   │  │                │  │   │  │Register: 345 │ │  │
│  │ │Input │ │   │  │                │  │   │  │Editable: ✓   │ │  │
│  │ └──────┘ │   │  │                │  │   │  └──────────────┘ │  │
│  │ ┌──────┐ │   │  │                │  │   │                    │  │
│  │ │Drop- │ │   │  └────────────────┘  │   │  Page Styles       │  │
│  │ │down  │ │   │                      │   │  ┌──────────────┐ │  │
│  │ └──────┘ │   │  Pages: [+]          │   │  │BG: #003366   │ │  │
│  │ ┌──────┐ │   │  ┌──┬──┬──┬──┐      │   │  │Grid: 17×10   │ │  │
│  │ │Icon  │ │   │  │P1│P2│P3│P4│      │   │  └──────────────┘ │  │
│  │ └──────┘ │   │  └──┴──┴──┴──┘      │   │                    │  │
│  │ ┌──────┐ │   │                      │   │  [Export JSON]     │  │
│  │ │Line  │ │   │                      │   │  [Import JSON]     │  │
│  │ └──────┘ │   │                      │   │  [Sync Device]     │  │
│  └──────────┘   └──────────────────────┘   └────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 3-Panel Layout

| Panel | Position | Purpose |
|---|---|---|
| **Widget Toolbox** | Left | Categorized list of draggable widget types |
| **LCD Canvas** | Center | The 320×480 design surface with grid overlay |
| **Properties Panel** | Right | Edit properties of selected widget + page styles |

## Widget Toolbox

The toolbox provides all available widget types organized by category:

### Display Widgets

| Widget | Icon | Description | Drag Behavior |
|---|---|---|---|
| **Label** | `Aa` | Static text label | Drops at grid position, default "Label" |
| **Text** | `T` | Data-bound text (shows register value) | Drops at grid position, pick data field |
| **Large Text** | `T+` | Big number display (temperature, etc.) | Spans multiple rows, centered |
| **Header** | `H` | Page title text | Drops at top, centered, larger font |

### Input Widgets

| Widget | Icon | Description | Drag Behavior |
|---|---|---|---|
| **Input Row** | `[=]` | Label + editable value pair | Full-width row, label left + value right |
| **Dropdown Row** | `[▼]` | Label + value with dropdown options | Full-width row, configure options list |
| **Edit Value** | `[#]` | Standalone editable number in a box | Centered, large font, with +/- |

### Decorative Widgets

| Widget | Icon | Description | Drag Behavior |
|---|---|---|---|
| **Icon** | `☆` | Single icon (house, wifi, fan, etc.) | Pick from icon palette |
| **Icon Bar** | `☆☆☆` | Row of navigation icons | Full-width, pick icons |
| **Divider** | `—` | Horizontal separator line | Full-width at grid row |
| **WiFi Icon** | `≋` | WiFi signal indicator | Fixed top-right corner |

### Footer Widgets

| Widget | Icon | Description | Drag Behavior |
|---|---|---|---|
| **Hint Text** | `...` | Button hint text ("+  Edit  -") | Bottom area |
| **Nav Text** | `◄►` | Navigation hint ("< Back  Next >") | Bottom area |

## Grid Snapping & Alignment

### Character Grid

The canvas is divided into a **17 column × 10 row** character grid:

```
   Col: 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16
Row 0: ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
Row 1: ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
Row 2: ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
  ...
Row 9: └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘
```

- **Cell size:** ~18.8px wide × 48px tall
- All widgets snap to grid cell boundaries when placed
- Widgets can span multiple cells (colSpan, rowSpan)

### Snap Behavior

| Action | Behavior |
|---|---|
| **Drag from toolbox** | Widget follows cursor, shows ghost position snapped to nearest grid cell |
| **Drop on canvas** | Widget snaps to the grid cell under the cursor |
| **Drag to reposition** | Widget moves between grid cells, snapping on release |
| **Resize** | Widgets resize in grid-cell increments (colSpan/rowSpan) |

### Alignment Aids

| Feature | Description |
|---|---|
| **Grid overlay** | Visible grid lines showing all 17×10 cells |
| **Snap indicators** | Blue highlight showing which cell the widget will snap to |
| **Alignment guides** | Lines appear when widget aligns with edges of other widgets |
| **Center markers** | Guides for horizontal/vertical centering |
| **Overlap warning** | Red highlight if dropping on an occupied cell |

## Properties Panel

When a widget is selected on the canvas, the Properties Panel shows its editable properties:

### Common Properties (all widgets)

| Property | Control | Description |
|---|---|---|
| **Position** | Row / Col inputs | Grid row and column (with nudge arrows) |
| **Span** | ColSpan / RowSpan | How many cells the widget covers |
| **Font Size** | Dropdown | 12px, 14px, 18px, 24px, 36px, 48px, 72px |
| **Font Weight** | Toggle | Normal / Bold |
| **Text Align** | Buttons | Left / Center / Right |
| **Color** | Color picker | Text color |
| **Delete** | Button | Remove this widget |

### Label / Text Properties

| Property | Control | Description |
|---|---|---|
| **Text** | Text input | The static text to display |
| **Field** | Dropdown | Data field to bind (for dynamic text) |
| **Suffix** | Text input | Unit text after value ("°C", "%") |

### Input Row / Dropdown Properties

| Property | Control | Description |
|---|---|---|
| **Label** | Text input | Left-side label text |
| **Field** | Dropdown | Data field to bind |
| **Register** | Number input | Modbus register number |
| **Editable** | Checkbox | Can the user change this value at runtime |
| **Options** | Tag input | List of allowed values (for dropdown) |
| **Min / Max** | Number inputs | Range for numeric values |
| **Step** | Number input | Increment step (e.g., 0.5) |

### Icon Properties

| Property | Control | Description |
|---|---|---|
| **Icon** | Icon picker palette | Choose from available icons |
| **Size** | Dropdown | 24px, 28px, 32px, 48px |
| **Opacity** | Slider | 0.0 to 1.0 |

### Page-Level Properties (shown when no widget selected)

| Property | Control | Description |
|---|---|---|
| **Page ID** | Text input | Unique identifier |
| **Page Label** | Text input | Display name |
| **Background** | Color picker | Page background color |
| **Highlight** | Color picker | Focused widget color |
| **Default Font** | Dropdown | Base font for all widgets |

## Design Flow

### Creating a New Screen from Scratch

```
1. Click [+ New Page] → blank 320×480 canvas appears
2. Grid overlay visible (17×10 cells)
3. Drag "Header" from toolbox → drop at row 1 → type "Communication\nSettings"
4. Drag "Input Row" → drop at row 4 → set label="Modbus", field="modbus", register=6
5. Drag "Input Row" → drop at row 5 → set label="Baud", field="baud", options=[9600,115200,...]
6. Drag "Input Row" → drop at row 6 → set label="Mode", field="mode", options=["MODBUS","BACNET"]
7. Drag "Hint Text" → drop at row 8 → type "+  Edit  -"
8. Drag "Nav Text" → drop at row 9 → type "< Back   Next >"
9. Adjust fonts, alignment, colors in Properties Panel
10. Click [Export JSON] → downloads screenDefinition.json
11. Click [Sync Device] → pushes to hardware
```

### Recreating the Main Display from Photos

```
1. [+ New Page] → blank canvas
2. Drag "WiFi Icon" → auto-places at row 0, col 16
3. Drag "Large Text" → row 1, bind field="temp", suffix="°C", fontSize=72px
4. Drag "Divider" → row 3
5. Drag "Input Row" → row 3, label="STP", field="stp", editable=true
6. Drag "Input Row" → row 4, label="FAN", field="fan", options=["AUTO",-2,-1,0,1,2,3]
7. Drag "Input Row" → row 5, label="SYS", field="sys", options=["AUTO",0,1,2]
8. Drag "Text" → row 6, bind field="ip", fontSize=18px
9. Drag "Icon Bar" → row 9, pick icons: moon, house, snowflake, fan
10. Done — preview matches the hardware photo
```

### Editing an Existing Layout

```
1. Click [Import JSON] → load existing screenDefinition.json
2. All pages appear with widgets rendered on canvas
3. Click any widget → selected (blue outline, handles appear)
4. Drag to reposition → snaps to new grid cell
5. Edit properties in right panel
6. Add new widgets from toolbox
7. Delete unwanted widgets (select → Delete or ×)
8. Export updated JSON
```

## Page Management

### Page Tabs

Below the canvas, page tabs show all pages:

```
  ┌──────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐ ┌───┐
  │ Main │ │ Setpoint │ │ Inside │ │ Comm Settings │ │ + │
  └──────┘ └──────────┘ └────────┘ └──────────────┘ └───┘
    ↑ active
```

| Action | Behavior |
|---|---|
| Click tab | Switch to that page |
| [+] button | Add new blank page |
| Right-click tab | Rename, duplicate, delete, reorder |
| Drag tab | Reorder pages (changes navigation order) |

### Templates (Optional)

For convenience, the designer can start from templates instead of a blank canvas:

| Template | Pre-built Widgets |
|---|---|
| **Blank** | Empty canvas (default) |
| **Main Display** | Large temp + rows + icon bar |
| **Settings Page** | Header + input rows + footer |
| **Info Display** | Icons + read-only text |

Templates are just pre-made JSON that gets loaded — the designer can modify everything.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| Delete / Backspace | Delete selected widget |
| Ctrl+C | Copy selected widget |
| Ctrl+V | Paste widget |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+S | Export JSON |
| Arrow keys | Nudge selected widget by 1 grid cell |
| Ctrl+A | Select all widgets |
| Escape | Deselect |

## Data Model

```typescript
interface DesignerState {
  definition: ScreenDefinition;     // The full multi-page JSON
  activePageId: string;             // Currently viewed page
  selectedWidgetId: string | null;  // Currently selected widget for editing
  isDirty: boolean;                 // Unsaved changes
  clipboard: Widget | null;         // Copy/paste buffer
  history: ScreenDefinition[];      // Undo stack
  historyIndex: number;             // Current position in undo stack
  gridVisible: boolean;             // Show/hide grid overlay
  snapEnabled: boolean;             // Grid snap on/off
}
```

## View Mode vs Design Mode

| Aspect | Design Mode | View Mode |
|---|---|---|
| **Purpose** | Create & edit layouts | Test & preview the end-user experience |
| **Canvas** | Shows grid, snap guides, selection handles | Clean LCD rendering (no guides) |
| **Click** | Selects widget for editing | Simulates button press |
| **Arrow keys** | Nudge selected widget | Navigate pages / edit values |
| **Toolbox** | Visible (left panel) | Hidden (debug panel shows instead) |
| **Properties** | Visible (right panel) | Hidden (or shows register browser) |
| **Who uses it** | Engineer / Designer | Tester / End user |
