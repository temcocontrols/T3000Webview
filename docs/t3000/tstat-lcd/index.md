# Tstat LCD System — Documentation Index

This folder contains the complete technical documentation for the Tstat10/Tstat11 LCD UI system: a visual drag-and-drop screen designer that outputs JSON, rendered identically on browser, device, and phone.

## Design Approach

**Start with a blank 320×480 canvas.** Drag widgets from a toolbox (label, text, input, dropdown, icon, divider, etc.) onto the canvas. Snap to the 17×10 character grid. Adjust position, font, alignment, and data bindings. Export as JSON. Sync to device.

## Documents

| Document | Description |
|---|---|
| [System Overview](system-overview.md) | End-to-end architecture, data flow, and integration points |
| [LCD Screen Designer](edit-mode.md) | **Core document** — blank canvas, widget toolbox, grid snap, properties panel, drag-and-drop design flow |
| [Widget Types](widget-types.md) | LVGL-style widget type reference (label, text, input, dropdown, icon, etc.) |
| [JSON Schema](json-schema.md) | The `screenDefinition.json` format specification |
| [Implementation Status](implementation-status.md) | What's built, what's pending, build order |

## Key Specs

- **LCD Resolution:** 320 × 480 px (fixed)
- **Character Grid:** 17 columns × 10 rows
- **Font:** Bold monospace (Fira Mono / Consolas)
- **Background:** Temco Blue (#003366)
- **Devices:** Tstat10 (white unit), Tstat11 (32M dev board)
- **Transport:** JSON → Modbus register writes (no firmware flash)

## Related Code

- Simulator: `src/t3-react/features/tstat10-simulator/`
- HVAC Draw Tool: `src/lib/t3-hvac/`
- Original prototype: `D:\1025\github\temcocontrols\Tstat10_Simulator\`
