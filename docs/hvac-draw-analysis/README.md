# T3000Webview HVAC Draw Area TypeScript Class Analysis

## Overview
This document provides an analysis of the TypeScript classes under `src/lib/T3000/Hvac` related to the draw area, which is responsible for controlling and rendering SVG files in the T3000Webview project. The analysis covers the class hierarchy, main responsibilities, and suggestions for future extensibility and new features.

---

## 1. Main Structure & Entry Points
- **Hvac.ts**: The main entry point, aggregates and exposes modules for page, UI, device, websocket, and utility operations.
- **Shape/**: Contains all core classes for SVG-based drawing objects (shapes, lines, symbols, containers, etc.).
- **Util/**: Utility classes for SVG, math, logging, and event handling.
- **Page/**: Page-level logic, e.g., `P.Main.ts` for main draw area orchestration.
- **Opt/**: Options, tool logic, and UI helpers for drawing and interaction.

---

## 2. Core Drawing Class Hierarchy
- **S.BaseDrawObject.ts**: The root class for all drawable objects. Handles:
  - Position, size, rotation, and geometric properties
  - Styling (color, line, fill, effects)
  - Object connections, hooks, and relationships
  - Event handling and lifecycle
  - All other shapes, lines, and symbols inherit from this
- **S.BaseShape.ts**: Extends `BaseDrawObject` for geometric shapes. Adds:
  - Shape type, parameters, SVG dimensions
  - Interactive controls (resize, rotate, connect)
  - Shape-specific manipulation and rendering
- **Shape Subclasses**: (Rect, Oval, Polygon, PolyLine, Line, Connector, Symbol, etc.)
  - Each implements SVG rendering and interaction for its geometry
  - Example: `S.Rect.ts` for rectangles, `S.Oval.ts` for ovals, `S.Polygon.ts` for polygons, etc.

---

## 3. Utilities & Supporting Modules
- **Util/**: Math, SVG, and event utilities (e.g., `T3Util.ts`, `Utils1-3.ts`, `T3Svg.js`)
- **Opt/Tool/**: Tool logic for drawing, selection, and manipulation (e.g., `ToolOpt.ts`, `ToolUtil.ts`)
- **Event/**: Event utilities for mouse, keyboard, and custom events
- **Model/**: Geometry, points, rectangles, and style models

---

## 4. Suggestions & Opportunities for New Features
- **Custom Shape Support**: Add new shape subclasses for custom SVG elements (arrows, callouts, etc.)
- **Advanced Grouping**: Enhance `ShapeContainer` and `GroupSymbol` for nested grouping, batch operations, and smart alignment
- **SVG Import/Export**: Improve `SVGImporter` and add SVG export with style preservation
- **Rich Text & Annotation**: Extend text support in shapes for multi-line, rich formatting, and annotation layers
- **Interaction Enhancements**: Add snapping, guides, and smart handles for easier manipulation
- **Performance**: Profile and optimize large SVG scenes (virtualization, selective rendering)
- **Accessibility**: Add ARIA and keyboard navigation for the draw area
- **Undo/Redo**: Integrate a command pattern or state history for robust undo/redo
- **Live Collaboration**: Add hooks for real-time multi-user editing (WebSocket integration)

---

## 5. Next Steps
- Review the class structure for your planned features (custom shapes, new tools, etc.)
- Consider extending `BaseShape` or `BaseDrawObject` for new geometry or interaction types
- Use the utility modules for math, SVG, and event handling to speed up development
- For major new features, consider documenting the API and class responsibilities for future maintainers

---

*This document will be updated as new features are added or the draw area architecture evolves.*
