# Design Hub — Developer & User Guide

The **Design Hub** (`/t3000/design`) is the unified center for all T3000 HVAC drawing
engines (HVAC Designer, EEZ Studio, Tstat10 Simulator). It aggregates projects, libraries,
templates, device bindings, revision history and hub tooling behind a single dashboard.

---

## 1. Access & Routes

| Route | What it is |
|---|---|
| `#/t3000/design` | Design Hub dashboard |
| `#/t3000/design/projects/:id` | Project detail page (preview, stats, snapshots, compare, manage) |
| `#/t3000/hvac-designer` / `:graphicId?` | HVAC drawing editor (SVG engine) |
| `#/t3000/eez` | EEZ Studio (full-page project editor) |
| `#/t3000/tstat10-simulator` | Thermostat LCD designer + simulator |

All routes live under the **MinimalLayout** (top menu bar only). Editor pages
(`hvac-designer`, `eez`, `tstat10-simulator`) additionally get a **contextual editor
menu bar** (`Design | File | Edit | View | Draw | Arrange | Tools | Help`).

Keyboard shortcut: **Ctrl+K** opens the hub **command palette**.

---

## 2. Feature Summary

### Dashboard
- **Hero** — New Drawing, Import SVG/DXF, Docs
- **Device context bar** — selected device, live stats (drawings/bound/deployed/shared), Graphics/Sync/Shared actions
- **Hub stats strip** — drawings, favorites, snapshots, events, bound, shared + per-engine breakdown
- **Create by Type** — pluggable type registry rendered as tiles
- **Templates** — ready-made starter canvases ("New from template")
- **Folders** — organize drawings into groups; filter bar
- **Projects** — unified grid/list across engines:
  - tabs (All / HVAC / EEZ / LCD-Sim / Shared / Device)
  - search, sort (updated / name / created), favorites pinned to top
  - grid ↔ list view
  - selection mode + batch actions (Export / Delete)
- **Shared Libraries** — symbol sets / templates / parts, add + cloud-sync
- **Recent & History** — recently opened + activity timeline
- **Hub Tools** — Backup (download `.json`) / Restore (import)

### Project Detail page
- Large live preview, full metadata, **statistics** (shapes/layers/bound points/complexity/size)
- Folder assignment, device bind, deploy, share, rename, duplicate, delete
- **Revision snapshots** — capture / list / restore / delete
- **Compare** — side-by-side diff of any snapshot vs the current drawing

### Editor integration
- `EditorStatusBar` — unified bottom status bar (device, coords, zoom, saved state)
- Snapshot auto-capture when a drawing is saved (dirty → clean transition)
- Command bus (`t3-editor-command`) drives File/Edit/View/Draw/Arrange/Tools/Help items
- SVG (Inkscape) import via `svgSource` → `T3Gv.opt.ImportSvgSymbol`

---

## 3. Architecture

```
src/t3-react/features/design-hub/
├── types.ts                    # shared types (DrawingType, HubProject, folders, snapshots, stats)
├── drawingTypes.ts             # type registry + user custom types (localStorage)
├── templates.ts                # drawing templates
├── icons.tsx                   # icon resolver
├── services/
│   ├── designHubService.ts     # metadata layer (localStorage + backend sync)
│   └── shapePreview.ts         # drawing → SVG preview renderer
├── store/designHubStore.ts     # zustand store
├── hooks/useEditorCommands.ts  # command bus + status emitter
├── components/                 # Hero, DeviceContextBar, HubStats, TypeTiles, Templates,
│                               # FoldersBar, ProjectsGrid, ProjectCard, SharedLibraries,
│                               # ActivityPanel, DrawingPreview, CompareDrawings,
│                               # CommandPalette, EditorStatusBar, DesignMenuBar,
│                               # BindDeviceDialog, NewTypeDialog, ImportDialog
└── pages/
    ├── DesignHubPage.tsx       # dashboard
    └── ProjectDetailPage.tsx   # project detail
```

### Data model & storage (localStorage-first)
| Key | Purpose |
|---|---|
| `t3-hvac-drawings` | HVAC drawings (the editor's own index) |
| `t3-design-hub` | Hub metadata: activity, recent, libraries, projects, favorites, folders, projectFolders, snapshots |
| `t3-design-hub-custom-types` | User-registered drawing types |

`designHubService` reads HVAC drawings from `t3-hvac-drawings`, tracks hub state in
`t3-design-hub`, and can **sync the whole hub to the backend** via
`POST/GET /api/design-hub` (Rust endpoint in `api/src/design_hub.rs`, JSON snapshot at
`Database/design-hub.json`). When the backend is unavailable it reports "backend offline —
kept local" and continues fully functional.

### Real project list (Project Catalog)
The dashboard **project history** is driven by the real created projects, not seeds:

- **EEZ / LVGL** projects live on disk at `<data_root>/project/<name>/<name>.eez-project`
  (`data_root` = `<cwd>/T3Web/t3-eez`) and are listed via `GET /api/eez-studio/projects`.
- **HVAC** drawings stay localStorage-primary, with a best-effort disk mirror under
  `<T3Web>/t3-hvac/<id>/<id>.json` (`GET/PUT/DELETE /api/design-hub/hvac-drawings`).
- **Simulator** has no real project storage yet → hidden.

The unified loader lives in `src/t3-react/features/design-hub/services/projectCatalog.ts`
(`loadRealProjects`), consumed by `designHubStore`. Opening an EEZ card deep-links to
`/t3000/eez?open=project/<name>/<name>.eez-project` (handled in `EezStudioApp`).
Deleting an EEZ card removes the folder on disk (`/api/eez-studio/delete-recursive`).

### The Drawing Type Registry (extensibility)
A type is a plain config entry:

```ts
{
  id: 'my-type',
  name: 'My Type',
  engine: 'hvac' | 'eez' | 'simulator' | 'symbols',
  openPath: '/t3000/...',
  importFormats: ['svg', 'json'],
  deviceAware: boolean,
  accent: '#color',
  icon: 'Flow',
  template?: { width; height; backgroundColor }
}
```

- **Built-in types** live in `drawingTypes.ts`.
- **Users can register new types** at runtime via the **New Type** tile → stored in
  `t3-design-hub-custom-types` and merged via `getAllDrawingTypes()`.
- **Templates** are defined in `templates.ts`; add one and it appears in the gallery.

### Extension points
- **Command bus**: `window.dispatchEvent(new CustomEvent('t3-editor-command', { detail: { command } }))`
  — engines subscribe via `useEditorCommands(cb)`.
- **Status bar**: `emitEditorStatus({ name, coords, message, zoom, saved })` → `t3-editor-status` event.
- **Save snapshots**: `designHubService.saveSnapshot(projectId, name?)`.
- **Import event**: `t3-design-import` opens the Import dialog.

---

## 4. Device Integration

- **Bind** — `BindDeviceDialog` picks a device + building/floor/room; persisted on the drawing.
- **Deploy** — pulls device graphics via `PanelDataRefreshService` (Action 17 `GET_WEBVIEW_LIST`)
  and records a deployment activity event. Deploy opens Bind first if no device is bound.
- The device context bar scopes drawings by the selected device.

---

## 5. Sharing & Cloud Sync

- **Share** a project (Synced status) or **sync a library to cloud** (source → `cloud`).
- **Hub Sync** button posts the whole hub to the backend (`/api/design-hub`).
- Cloud/team sharing via the T3 User Library API is a future extension of the same endpoint.

---

## 6. Backup & Restore

`Hub Tools → Backup` downloads a single `.json` containing all HVAC drawings, hub metadata
(favorites/folders/snapshots/libraries/projects), and custom types.
`Restore` merges that file back in (existing drawings/types are never overwritten).

---

## 7. FAQ / Notes

- **Where is the backend?** `api/src/design_hub.rs` — needs an API rebuild/restart to activate.
- **How do I add a new drawing engine?** Register a type (tile or config), point `openPath`
  at its route; the dashboard, libraries and history pick it up automatically.
- **Why do card previews differ from the editor?** Previews render a simplified SVG
  interpretation of stored shapes; the editor is the authoritative renderer.
- **Dev server** is slow to cold-start (heavy Vue/ant-design-vue deps) — be patient, and avoid
  hammering it with parallel module requests (can trigger Vite 504s).
