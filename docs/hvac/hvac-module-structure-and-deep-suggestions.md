# HVAC Library: Full Folder/File Analysis, Design Review, and Suggestions

## 1. Folder-by-Folder Analysis & Current Design

### Basic/
- **What:** SVG primitives and low-level shape logic (Rect, Oval, Line, Polygon, Symbol, Text, Layer, Group, etc.).
- **How:** Each file is a class for a basic SVG element, with some shared logic but also duplication.
- **Improvement:**
  - Unify style/effects handling (e.g., a `BasePrimitive` interface).
  - Add a shape registry for dynamic creation.
  - Document all class APIs.

### Data/
- **What:** Constants, global state, type definitions, and data models (T3Data, T3Gv, State, Store, Instance, etc.).
- **How:** Centralizes all data and type logic for the drawing system.
- **Improvement:**
  - Use strict TypeScript types/interfaces everywhere.
  - Document data flow and relationships.
  - Add runtime validation for critical models.

### Doc/
- **What:** Document-level utilities, context menu logic, and UI options.
- **How:** Handles document operations, context menus, and user options.
- **Improvement:**
  - Modularize context menu logic for easier extension.
  - Use declarative menu definitions (JSON or config objects).
  - Document all UI hooks and extension points.

### Event/
- **What:** Mouse, keyboard, and custom event utilities.
- **How:** Centralizes event handling for the draw area.
- **Improvement:**
  - Use a unified event bus or observer pattern for better decoupling.
  - Add event type safety and documentation.

### Model/
- **What:** Geometry, style, and configuration models (Rectangle, Point, PolyList, QuickStyle, Layer, etc.).
- **How:** All shape and style data is modeled here for use by shapes and tools.
- **Improvement:**
  - Add validation and serialization methods to all models.
  - Document relationships and usage examples.

### Opt/
- **What:** Tool, option, and UI helper logic (drawing, selection, manipulation, UI integration, etc.).
- **How:** Highly modular, with subfolders for each tool or option type.
- **Improvement:**
  - Use factory patterns for tool creation.
  - Document extension points for custom tools.
  - Add plugin support for new tools.

### Page/
- **What:** Page-level orchestration (P.Main.ts).
- **How:** Entry point for initializing and managing the draw area.
- **Improvement:**
  - Add hooks for plugin/extension loading at startup.
  - Document the page lifecycle and extension points.

### Shape/
- **What:** All shape and symbol classes (BaseDrawObject, BaseShape, Rect, Oval, Polygon, Line, Connector, Symbol, GroupSymbol, ShapeContainer, SVGImporter, etc.).
- **How:** Implements SVG rendering, manipulation, grouping, and import/export.
- **Improvement:**
  - Ensure all shapes support full serialization/deserialization.
  - Add unit tests for each shape type.
  - Use a shape registry for dynamic instantiation.

### Util/
- **What:** Utility modules for SVG, math, logging, error handling, timers, etc.
- **How:** Used throughout the system for reusable logic and helpers.
- **Improvement:**
  - Centralize logging and error handling.
  - Document all utility APIs.
  - Add more math/geometry helpers as needed.

### Hvac.ts
- **What:** Main entry point, aggregates and exposes modules for use in the app.
- **Improvement:**
  - Document all exports and their intended usage.
  - Add a module registry for dynamic loading.

---

## 2. Suggestions for Modernization & New Features

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

## 3. New Feature Ideas (Based on Hvac Library)
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
