# Shape Library Feature: Suggestions & Best Practices

## 1. Core Concepts
- **Shape Library**: Persistent collection of reusable shapes/groups (SVG objects with metadata).
- **User Actions**: Add to library, browse/search, insert onto canvas.

## 2. Implementation Suggestions
### Data Model & Storage
- Serialize shapes/groups (SVG + class data) for storage.
- Store in local storage or backend as JSON: `{ id, name, svgData, preview, tags, createdAt }`.

### UI/UX
- Dedicated panel/modal for browsing (with SVG previews, search/filter, drag/drop or click-to-insert).
- Context menu/toolbar: "Add to Library" (serialize selection), "Insert from Library" (open panel).

### Insertion Logic
- Deserialize SVG/class data, assign new unique IDs, insert at cursor/canvas center.

### Extensibility
- Support grouping, versioning, import/export, and sharing.

## 3. Pitfalls & How to Avoid
- Always generate new IDs on insert.
- Ensure all styles/dependencies are included in serialization.
- Provide UI feedback for all actions.
- Use lazy loading/virtualization for large libraries.

## 4. Example Workflow
1. Select shape(s) → right-click → "Add to Library" (prompt for name/tags, serialize, save)
2. Open Library Panel (browse/search, see previews)
3. Drag/click to insert (deserialize, new IDs, add to canvas)

## 5. Modern Approach
- Use a Vue/React component for the library panel with live SVG previews.
- Centralize library data (store/API).
- Use SVG `<symbol>`/`<use>` for efficient rendering.
- Support favorites/recent items.

## 6. Troubleshooting
- Check serialization/deserialization covers all needed data.
- Ensure UI actions are correctly wired.
- Add debug logging for save/load/insert.
- Test with simple, then complex/grouped shapes.

---

*Review this document before implementing or refactoring the shape library feature. For code samples or architecture diagrams, request further assistance.*
