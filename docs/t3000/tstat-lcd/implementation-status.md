# Implementation Status

Current build status, what's done, what's next, and the recommended build order.

## Status Overview

### Built and Working

| Component | Location | Status |
|---|---|---|
| LCD container (320×480) | `LcdContainer.tsx` | ✅ Done |
| Thermostat bezel + 4 buttons | `ThermostatBezel.tsx` | ✅ Done |
| Main Display page | `ThermostatDisplay.tsx` | ✅ Done (hardcoded, not JSON-driven) |
| Comm Settings page (JSON-driven) | `NetworkSettingsMenu.tsx` | ✅ Done |
| Comm Settings JSON | `menuNetworkSettings.json` | ✅ Done |
| Keyboard navigation (▲/▼/◄/►) | `useKeyboardNavigation.ts` | ✅ Done |
| Simulator state management | `useSimulatorState.ts` | ✅ Done |
| Debug panel (Grid/Coords/Redbox) | `DebugPanel.tsx` | ✅ Done |
| Debug overlays on LCD | `NetworkSettingsMenu.tsx` | ✅ Done |
| Auto-tester (simulated keypad) | `Tstat10SimulatorPage.tsx` | ✅ Done |
| Temperature drift simulation | `useSimulatorState.ts` | ✅ Done |
| Basic Export JSON | `Tstat10SimulatorPage.tsx` | ✅ Done (exports menuRows + data) |
| CSS modules (lcd, simulator) | `styles/` | ✅ Done |
| Mobile layout scaffolding | CSS + DebugPanel mobile mode | ✅ Basic |
| WebView2 bridge (updateUI) | `useSimulatorState.ts` | ✅ Done |
| 3-panel desktop layout | `Tstat10SimulatorPage.tsx` | ✅ Done |

### Stub / Partial

| Component | Status | Notes |
|---|---|---|
| Sync Device button | ⚠️ Stub | Button exists, no handler |
| Edit Mode button | ⚠️ Stub | Toggles state, no behavior |
| Right panel (Register Browser) | ⚠️ Empty | Placeholder div |

### Not Built

| Component | Priority | Notes |
|---|---|---|
| **LCD Screen Designer (blank canvas + toolbox)** | 🔴 High | Core feature — drag widgets onto empty canvas |
| Widget Toolbox panel | 🔴 High | Categorized widget types: label, text, input, dropdown, icon, etc. |
| Grid snap & alignment | 🔴 High | 17×10 grid, snap-to-cell, alignment guides |
| Properties Panel | 🔴 High | Edit widget position, font, alignment, data binding |
| Generic `LcdPageRenderer` | 🔴 High | Renders any page from JSON (used in both design & view mode) |
| Page management (add/remove/tabs) | 🔴 High | Multiple pages, tab navigation |
| `screenDefinition.json` (multi-page) | 🔴 High | Full export format with all pages and widgets |
| JSON import (load & preview) | 🟡 Medium | Load existing definition into designer |
| Undo/Redo | 🟡 Medium | History stack for design actions |
| Template library | 🟡 Medium | Pre-built page templates as starting points |
| Phone app rendering | 🟠 Future | Same JSON, mobile layout |
| BLE auto-connect | 🟠 Future | Phone ↔ device communication |
| Sync to device (Modbus) | 🟠 Future | Phase 2 from original spec |

## Recommended Build Order

### Sprint 1: LCD Screen Designer (Core)

```
Step 1.1: Build LcdPageRenderer
          - Generic renderer for any page from JSON
          - Handles all widget types (label, text, input, icon, etc.)
          - Absolute positioning on 320×480 canvas
          - Grid-aware coordinate mapping

Step 1.2: Build Widget Toolbox panel
          - Categorized widget list (Display, Input, Decorative, Footer)
          - Each widget type has icon and label
          - Draggable from toolbox to canvas

Step 1.3: Build Canvas with grid snap
          - 320×480 design surface with 17×10 grid overlay
          - Drag-and-drop from toolbox
          - Widget snaps to nearest grid cell on drop
          - Visual snap indicators and alignment guides
          - Click widget to select (blue outline + handles)
          - Drag selected widget to reposition

Step 1.4: Build Properties Panel
          - Shows editable properties of selected widget
          - Common: position, span, font size, alignment, color
          - Type-specific: label text, data field, register, options
          - Page-level: background color, highlight, default font
```

**Outcome:** Working drag-and-drop LCD designer. Can create screens from blank canvas.

### Sprint 2: Multi-Page & Export

```
Step 2.1: Page management
          - Page tabs below canvas
          - [+] to add new blank page
          - Right-click to rename/delete/duplicate
          - Drag tabs to reorder

Step 2.2: JSON export
          - Export complete screenDefinition.json
          - All pages, all widgets, styles, data bindings

Step 2.3: JSON import
          - Load existing JSON → renders all pages in designer
          - Can continue editing

Step 2.4: Templates (optional)
          - Pre-built layouts (Main Display, Settings, etc.)
          - Based on hardware photos as starting examples
```

**Outcome:** Full design workflow — create, edit, export, import, multi-page.

### Sprint 3: View Mode & Navigation

```
Step 3.1: View Mode toggle
          - Switch from Designer → View Mode
          - Hides toolbox & properties, shows clean LCD
          - Arrow key navigation between pages
          - ▲/▼ to change values at runtime

Step 3.2: Simulator integration
          - Bezel + buttons work in View Mode
          - Debug panel available in View Mode
          - Temperature drift, auto-tester still work

Step 3.3: Existing screens as JSON
          - Convert hardcoded Main Display to JSON
          - Convert Comm Settings to new format
          - Create Setpoint and Inside pages from photos
```

**Outcome:** Can design screens AND test them as if on real hardware.

### Sprint 4: Device Sync

```
Step 4.1: Define wire protocol
          - JSON → chunked format for Modbus writes
          - Define register block for screen data

Step 4.2: Implement Sync Device
          - Connect to device via T3000/transport layer
          - Send screen definition
          - Receive confirmation

Step 4.3: Receive device data
          - Poll registers for live values
          - Update simulator display
```

**Outcome:** Browser ↔ device two-way sync.

### Sprint 5: Phone App

```
Step 5.1: Mobile rendering
          - Same LcdPageRenderer in responsive layout
          - Touch gestures = button presses

Step 5.2: BLE connection
          - Auto-connect to strongest RSSI
          - Device discovery UI

Step 5.3: Data refresh loop
          - Periodic "get data" commands
          - Value update rendering
```

**Outcome:** Phone app mirrors the device LCD.

## File Structure (Current)

```
src/t3-react/features/tstat10-simulator/
├── components/
│   ├── DebugPanel.tsx          ← Debug toggles and readout
│   ├── LcdContainer.tsx        ← 320×480 wrapper
│   ├── NetworkSettingsMenu.tsx  ← Comm Settings page renderer
│   ├── ThermostatBezel.tsx      ← Bezel + 4 buttons
│   └── ThermostatDisplay.tsx    ← Main display (hardcoded)
├── data/
│   └── menuNetworkSettings.json ← Single page definition
├── hooks/
│   ├── useKeyboardNavigation.ts ← Arrow key handling
│   └── useSimulatorState.ts     ← State management
├── pages/
│   └── Tstat10SimulatorPage.tsx ← 3-panel layout
└── styles/
    ├── lcd.module.css           ← LCD styles
    └── simulator.module.css     ← Simulator layout styles
```

## File Structure (After Sprint 1 — LCD Designer)

```
src/t3-react/features/tstat10-simulator/
├── components/
│   ├── DebugPanel.tsx
│   ├── LcdContainer.tsx
│   ├── LcdPageRenderer.tsx      ← NEW: Generic page renderer (design + view)
│   ├── ThermostatBezel.tsx
│   ├── designer/                ← NEW: LCD Screen Designer
│   │   ├── DesignerCanvas.tsx   ← 320×480 canvas with grid + drag-drop
│   │   ├── WidgetToolbox.tsx    ← Left panel: categorized widget types
│   │   ├── PropertiesPanel.tsx  ← Right panel: widget & page properties
│   │   ├── PageTabs.tsx         ← Bottom tabs: page management
│   │   ├── GridOverlay.tsx      ← 17×10 grid with snap indicators
│   │   └── useDesignerState.ts  ← Designer state management
│   ├── widgets/                 ← NEW: Individual widget renderers
│   │   ├── LargeTextWidget.tsx
│   │   ├── LabelValueWidget.tsx
│   │   ├── EditValueWidget.tsx
│   │   ├── HeaderWidget.tsx
│   │   ├── TextWidget.tsx
│   │   ├── IconWidget.tsx
│   │   ├── IconBarWidget.tsx
│   │   ├── DividerWidget.tsx
│   │   └── FooterWidget.tsx
│   ├── NetworkSettingsMenu.tsx  ← KEEP for backward compat
│   └── ThermostatDisplay.tsx    ← KEEP for backward compat
├── data/
│   ├── menuNetworkSettings.json ← KEEP for backward compat
│   └── screenDefinition.json    ← NEW: Multi-page definition
├── hooks/
│   ├── useKeyboardNavigation.ts
│   └── useSimulatorState.ts     ← UPDATED: multi-page support
├── pages/
│   └── Tstat10SimulatorPage.tsx ← UPDATED: uses LcdPageRenderer
└── styles/
    ├── lcd.module.css
    └── simulator.module.css
```

## Open Questions (Needs User Confirmation)

### Pages
- [ ] Are there more pages beyond the 4 confirmed? (Schedule, Alarm, PID?)
- [ ] What are the exact FAN mode options?
- [ ] What are the exact SYS mode options?

### Navigation
- [ ] How does the user leave a page with focusable rows? (Long press? Wrap past last row?)
- [ ] Do bottom icons on Main page navigate to specific pages?

### Edit Mode
- [ ] Is Edit Mode for engineers only, or end-users too?
- [ ] Should edited layouts be stored on the device?

### Registers
- [ ] Exact register numbers for temp, stp, hum, fan, sys?
- [ ] Register block for storing screen definitions on device?

### Phone
- [ ] Native app or WebView?
- [ ] BLE service UUID?
- [ ] Command format for "get data"?
