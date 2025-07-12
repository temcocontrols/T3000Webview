# HVAC Module Structure & Suggestions

## 1. Directory and File Overview

### Basic/
- Core geometric and SVG element classes (e.g., B.Rect, B.Oval, B.Line, B.Polygon, B.Symbol, B.Text, B.Layer, B.Group, B.Image, B.ShapeContainer, etc.)
- Handles low-level SVG element creation, style, and effects.

### Data/
- Constants, global state, data models, and type definitions (T3Data, T3Gv, State/Store, Instance, etc.)
- Used for application-wide data, state management, and type safety.

### Doc/
- Document utilities and options (DocUtil, T3Opt, CtxMenuUtil)
- Handles document-level operations, context menus, and UI options.

### Event/
- Event utilities and handlers (EvtUtil, MouseUtil, EvtOpt)
- Centralizes mouse, keyboard, and custom event logic for the draw area.

### Model/
- Geometry, style, and configuration models (Rectangle, Point, PolyList, QuickStyle, Layer, DynamicGuides, etc.)
- Used for shape data, layout, and rendering logic.

### Opt/
- Options, tools, and UI helpers (ToolOpt, ToolUtil, UIUtil, ShapeUtil, Polygon, Clipboard, User, Wall, Webview2, etc.)
- Contains tool logic for drawing, selection, manipulation, and UI integration.

### Page/
- Page-level orchestration (P.Main.ts)
- Entry point for initializing and managing the draw area.

### Shape/
- All shape and symbol classes (S.BaseDrawObject, S.BaseShape, S.Rect, S.Oval, S.Polygon, S.Line, S.Connector, S.Symbol, S.GroupSymbol, S.ShapeContainer, S.SVGImporter, etc.)
- Implements SVG rendering, manipulation, and grouping.

### Util/
- Utility modules for SVG, math, logging, error handling, timers, etc. (T3Util, Utils1-3, T3Svg, LogUtil, ErrorHandler)
- Used throughout the system for reusable logic and helpers.

### Hvac.ts
- Main entry point, aggregates and exposes modules for use in the app.

---

## 2. Suggestions for Better Design

### A. Architecture
- **Separation of Concerns:**
  - Keep geometry, rendering, event handling, and data models in separate modules.
  - Use clear interfaces/types for shape, group, and tool objects.
- **Extensibility:**
  - All shapes should inherit from a common base (as you do with BaseDrawObject/BaseShape).
  - Use factory patterns for shape/tool creation to support plugins or custom extensions.
- **State Management:**
  - Centralize state (selection, undo/redo, library, etc.) in a store (Vuex/Pinia or similar).
  - Use events or observers for cross-module communication.

### B. Shape Library & Serialization
- **Robust Serialization:**
  - Ensure all shape, group, and style data can be fully serialized/deserialized (for save/load, library, undo/redo).
  - Version your serialization format for future compatibility.
- **Library Integration:**
  - Treat the shape library as a first-class module, with its own data model, UI, and API.
  - Support import/export, sharing, and metadata for library items.

### C. UI/UX
- **Componentization:**
  - Use dedicated components for the library panel, toolbars, context menus, and property editors.
  - Support drag-and-drop, batch actions, and keyboard shortcuts for power users.
- **Performance:**
  - Use virtualization for large lists (shapes, library items, history).
  - Optimize SVG rendering for large/complex scenes (selective rendering, caching).

### D. Testing & Documentation
- **Unit & Integration Tests:**
  - Test serialization, deserialization, and all shape operations.
  - Test event handling and undo/redo logic.
- **Documentation:**
  - Document all core classes, extension points, and data models.
  - Maintain architecture diagrams and API docs for maintainability.

---

## 3. Review of Current Tech Article

- The current documentation covers the high-level structure and feature suggestions well.
- For better design:
  - Add more diagrams (class hierarchy, module relationships, data flow).
  - Document extension points for custom shapes/tools.
  - Provide code samples for serialization, deserialization, and library integration.
  - Add a section on performance/scalability for large projects.
  - Include a migration/versioning strategy for future-proofing.

---

*This analysis provides a foundation for refactoring, extending, or onboarding new developers to the HVAC SVG drawing system. For deeper dives into any module or code samples, request further assistance!*
