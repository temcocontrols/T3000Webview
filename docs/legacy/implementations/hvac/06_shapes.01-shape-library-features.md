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

## Deep Dive: Shape Library Implementation

### 1. Data Model & Storage
### Deep Dive
- **Shape Representation:**
  - Use a robust interface or TypeScript type for library items, e.g.:
    ```ts
    interface ShapeLibraryItem {
      id: string;
      name: string;
      tags: string[];
      description?: string;
      svgMarkup: string;
      classData: any; // Serialized class instance
      preview: string; // SVG or base64 PNG
      createdAt: string;
      updatedAt?: string;
      author?: string;
      version?: string;
    }
    ```
  - Store all properties needed to fully reconstruct and display the shape.
- **Storage Options:**
  - For browser-only: IndexedDB is preferred for large libraries (async, structured data), LocalStorage for small/simple use.
  - For team/shared: REST API or WebSocket backend, with authentication and access control.
  - Always support import/export for backup and sharing.
### Suggestions
- Use UUIDs for IDs to avoid collisions.
- Store a lightweight preview for fast UI rendering.
- Consider a migration/versioning system for future changes to the data model.

### 2. Serialization & Deserialization
### Deep Dive
- **Serialization:**
  - Implement `toJSON()` or a custom method on all shape classes.
  - Recursively serialize children for groups.
  - Include all style, symbol, and dependency references.
- **Deserialization:**
  - Use a factory or static method to reconstruct class instances from JSON.
  - Always assign new IDs on insert to avoid reference bugs.
  - Restore all relationships (parent/child, connectors, etc.).
### Suggestions
- Add a `version` field to serialized data for compatibility.
- Write unit tests for serialization/deserialization of all shape types and groups.
- Log errors and provide user feedback if deserialization fails.

### 3. UI/UX: Library Panel & Actions
### Deep Dive
- **Panel:**
  - Use a virtualized grid/list for performance with large libraries.
  - Render SVG previews directly for crispness and speed.
  - Allow search by name, tag, or type; support sorting and filtering.
- **Actions:**
  - Add, insert, remove, favorite, and edit metadata.
  - Drag-and-drop for insertion is intuitive; also support click-to-insert.
- **Feedback:**
  - Use toasts/snackbars for all actions (success, error, etc.).
### Suggestions
- Make the panel resizable and dockable for power users.
- Allow multi-select for batch operations.
- Provide a preview/inspect mode for detailed info before inserting.

### 4. Insertion Logic
### Deep Dive
- **Deserialization:**
  - On insert, always create a new instance (never reference the original object).
  - Place at cursor, canvas center, or prompt for position.
- **Undo/Redo:**
  - Use a command pattern or transaction system for undoable actions.
- **Batch Insert:**
  - Allow inserting multiple items at once (e.g., for grouped symbols or templates).
### Suggestions
- After insert, auto-select the new shape(s) for immediate manipulation.
- Snap to grid or guides if enabled.
- Log all insert actions for analytics or debugging.

### 5. Extensibility
### Deep Dive
- **Grouping:**
  - Store group structure as a tree (parent/child relationships).
  - Allow nested groups and ungrouping.
- **Versioning:**
  - Track a history of changes for each library item (could be as simple as an array of versions).
- **Import/Export:**
  - Validate imported data for schema and security.
  - Support drag-and-drop import of files.
- **Sharing:**
  - Generate shareable links or QR codes for cloud-based libraries.
### Suggestions
- Allow users to clone and modify library items (forking).
- Add permissions for shared/team libraries (read/write/admin).

### 6. Pitfalls & How to Avoid
### Deep Dive
- **ID Collisions:**
  - Use a robust UUID generator (not just timestamps).
- **Style/Dependency Loss:**
  - Bundle all referenced gradients, patterns, and symbols.
  - On insert, check for missing dependencies and inject them if needed.
- **UI Feedback:**
  - Always show clear error messages and recovery options.
- **Performance:**
  - Use virtualization and cache previews for large libraries.
### Suggestions
- Regularly test with large and complex libraries.
- Provide a "library health check" tool to find missing dependencies or broken items.

### 7. Example Workflow (Expanded)
### Deep Dive
- **Add to Library:**
  - Serialize selection, prompt for metadata, generate preview, save.
- **Browse Library:**
  - Virtualized grid/list, search/filter, preview, batch actions.
- **Insert from Library:**
  - Deserialize, assign new IDs, check dependencies, insert, select, undoable.
- **Export/Import:**
  - Validate, merge or replace, handle conflicts.
### Suggestions
- Allow users to tag and categorize items for easier browsing.
- Provide onboarding/tutorial for new users.

### 8. Modern Approaches & Advanced Features
### Deep Dive
- **Componentization:**
  - Use a dedicated, possibly lazy-loaded, component for the library panel.
  - Support plugin architecture for custom item renderers or actions.
- **SVG `<symbol>`/`<use>`:**
  - Store common shapes as `<symbol>` in a hidden SVG defs block.
  - Use `<use>` for efficient rendering and memory use.
- **Collaboration:**
  - Real-time sync, conflict resolution, and change tracking for team libraries.
- **Analytics:**
  - Track usage, popularity, and errors for continuous improvement.
- **Accessibility:**
  - Full keyboard navigation, ARIA roles, and screen reader support.
### Suggestions
- Consider open-sourcing the library system for community contributions.
- Integrate with cloud storage providers for backup and sync.

---

*Review this document before implementing or refactoring the shape library feature. For code samples or architecture diagrams, request further assistance.*
