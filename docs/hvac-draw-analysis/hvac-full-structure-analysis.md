# Full Analysis: T3000Webview HVAC Library

## 1. Folder-by-Folder Overview

### Basic/
- **Purpose:** Low-level SVG element and shape primitives (Rect, Oval, Line, Polygon, Symbol, Text, Layer, Group, etc.).
- **Design:** Each file represents a basic SVG element or utility for shape construction and manipulation.
- **Improvement:** Consider unifying style/effects handling and providing a base interface for all primitives.

### Data/
- **Purpose:** Constants, global state, type definitions, and data models (T3Data, T3Gv, State, Store, Instance, etc.).
- **Design:** Centralizes all data and type logic for the drawing system.
- **Improvement:** Use strict TypeScript types/interfaces for all models; document data flow between modules.

### Doc/
- **Purpose:** Document-level utilities, context menu logic, and UI options.
- **Design:** Handles document operations, context menus, and user options.
- **Improvement:** Modularize context menu logic for easier extension; document all UI hooks.

### Event/
- **Purpose:** Mouse, keyboard, and custom event utilities.
- **Design:** Centralizes event handling for the draw area.
- **Improvement:** Use a unified event bus or observer pattern for better decoupling.

### Model/
- **Purpose:** Geometry, style, and configuration models (Rectangle, Point, PolyList, QuickStyle, Layer, etc.).
- **Design:** All shape and style data is modeled here for use by shapes and tools.
- **Improvement:** Add validation and serialization methods to all models; document relationships.

### Opt/
- **Purpose:** Tool, option, and UI helper logic (drawing, selection, manipulation, UI integration, etc.).
- **Design:** Highly modular, with subfolders for each tool or option type.
- **Improvement:** Use factory patterns for tool creation; document extension points for custom tools.

### Page/
- **Purpose:** Page-level orchestration (P.Main.ts).
- **Design:** Entry point for initializing and managing the draw area.
- **Improvement:** Add hooks for plugin/extension loading at startup.

### Shape/
- **Purpose:** All shape and symbol classes (BaseDrawObject, BaseShape, Rect, Oval, Polygon, Line, Connector, Symbol, GroupSymbol, ShapeContainer, SVGImporter, etc.).
- **Design:** Implements SVG rendering, manipulation, grouping, and import/export.
- **Improvement:** Ensure all shapes support full serialization/deserialization; add unit tests for each shape type.

### Util/
- **Purpose:** Utility modules for SVG, math, logging, error handling, timers, etc.
- **Design:** Used throughout the system for reusable logic and helpers.
- **Improvement:** Centralize logging and error handling; document all utility APIs.

### Hvac.ts
- **Purpose:** Main entry point, aggregates and exposes modules for use in the app.
- **Improvement:** Document all exports and their intended usage.

---

## 2. Current Design Review
- **Strengths:**
  - Highly modular, extensible, and TypeScript-based.
  - Clear separation of shape, tool, event, and data logic.
  - Good use of base classes and utility modules.
- **Weaknesses:**
  - Some duplication in shape/tool logic across folders.
  - Serialization/deserialization logic may not be consistent across all shapes/tools.
  - Context menu and UI logic could be more modular and declarative.
  - Documentation and type safety could be improved in some areas.

---

## 3. Suggestions & Improvements
- **Unify Serialization:**
  - All shapes, groups, and tools should implement a common serialization interface.
  - Add versioning to all serialized data for future compatibility.
- **Centralize State:**
  - Use a single store (Vuex/Pinia or similar) for selection, undo/redo, and library state.
- **Plugin/Extension Support:**
  - Add hooks for loading custom shapes, tools, or UI panels at runtime.
- **UI/UX:**
  - Refactor context menu and toolbar logic for easier extension and customization.
  - Add a property inspector panel for selected shapes/tools.
- **Testing:**
  - Add unit and integration tests for all shape, tool, and event modules.
- **Performance:**
  - Profile SVG rendering and optimize for large/complex scenes.
- **Documentation:**
  - Add architecture diagrams, class hierarchies, and API docs for all modules.

---

## 4. New Feature Ideas (Based on Hvac Library)
- **Shape Library:**
  - See shape-library-feature-suggestions.md for a full design.
- **Custom Tool Plugins:**
  - Allow users to add new drawing tools via plugins.
- **Live Collaboration:**
  - Real-time multi-user editing with conflict resolution.
- **Advanced Grouping:**
  - Nested groups, batch operations, and smart alignment tools.
- **Rich Text & Annotation:**
  - Multi-line, rich formatting, and annotation overlays for shapes.
- **SVG Import/Export:**
  - Full support for SVG import/export with style preservation.
- **Undo/Redo:**
  - Robust, command-pattern-based undo/redo for all actions.
- **Accessibility:**
  - ARIA roles, keyboard navigation, and screen reader support.

---

*For a deeper dive into any module, or for code samples and diagrams, request further assistance!*
