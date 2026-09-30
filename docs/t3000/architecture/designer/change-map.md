# Designer — full change map

Every file this feature adds or touches, per phase. "NO CHANGE (by design)" lists the files a reader
might *expect* to change and which are deliberately left alone.

Legend: **NEW** = create · **MOD** = modify · **DEL** = delete.

---

## P1 — `DesignerShell` + HVAC document (new route, additive)

P1 introduces `kinds.ts`, `DocumentAdapter.ts`, `registry.ts`, `statusPublisher.ts`, `DesignerShell.tsx`,
`RegionPanel.tsx`, `RegionPanelHead.tsx` (the tab strip lives in the region head), `ShellTopBar.tsx`,
`ShellStatusBar.tsx`, `ShellBottomDock.tsx`, `ShellSplitter.tsx`, `hooks/useDesignerLayoutStore.ts`,
`hooks/useEnginePoll.ts`, `hooks/useAreaResize.ts`, `hooks/useViewportWidth.ts`,
`pages/DesignerPage.tsx`, `documents/hvac/{HvacDocument,HvacPropertiesPanel,useHvacSelection,hvacAreaIds}.tsx|ts`,
`test/vitest/__tests__/designer-shell.test.tsx`, the `App.tsx` route, the `menuConfig.ts` designer branch and
two `vitest.config.mjs` aliases. It changes nothing in `lib/t3-hvac`, adds no redirects and does no EEZ work.

### New files

| File | Purpose |
|---|---|
| `src/t3-react/features/designer/index.ts` | barrel (public API of the feature) |
| `src/t3-react/features/designer/kinds.ts` | `DocumentKind` union + registry (see `interfaces.md` §2) |
| `src/t3-react/features/designer/DocumentAdapter.ts` | the contracts: `DocumentAdapter`, `ShellLayout`, `RegionSpec`, `PanelTab`, `CommandRegistry`, `ViewportAdapter`, `MountContext`, `StatusPublisher` |
| `src/t3-react/features/designer/pages/DesignerPage.tsx` | the route element: resolves `:kind`/`:id`, lazy-loads the adapter, renders `<DesignerShell>` |
| `src/t3-react/features/designer/components/DesignerShell.tsx` | the five slots + dock, Fluent `makeStyles`/`tokens`, region layout, splitters, collapse |
| `src/t3-react/features/designer/components/RegionPanel.tsx` | a region: tab strip + active tab content + optional secondary column + footer |
| `src/t3-react/features/designer/components/ShellSplitter.tsx` | 4 px draggable splitter (recipe from `MainLayout.tsx:56-63`, math `:142-172`) |
| `src/t3-react/features/designer/components/ShellStatusBar.tsx` | status slot: wraps the existing `EditorStatusBar` + shell items |
| `src/t3-react/features/designer/components/ShellBottomDock.tsx` | collapsible bottom dock (tab strip + height drag) |
| `src/t3-react/features/designer/components/ShellTopBar.tsx` | back button, title, panel toggles, adapter toolbar slot |
| `src/t3-react/features/designer/hooks/useDesignerLayoutStore.ts` | region widths / collapsed flags, persisted to `localStorage["t3.designer.layout"]` |
| `src/t3-react/features/designer/hooks/useEnginePoll.ts` | single shared poller per document (default 250 ms, paused when the tab is hidden) |
| `src/t3-react/features/designer/hooks/useAreaResize.ts` | `ResizeObserver` on the content host → debounced callback |
| `src/t3-react/features/designer/documents/hvac/HvacDocument.tsx` | the HVAC `DocumentAdapter` (mount, layout, commands) |
| `src/t3-react/features/designer/documents/hvac/HvacPropertiesPanel.tsx` | **new** right-panel content: read-only engine inspector (P1) → editable (P1b) |
| `src/t3-react/features/designer/documents/hvac/useHvacSelection.ts` | poll `SelectUtil.GetTargetSelect()` + `ObjectUtil.GetObjectPtr(T3Gv.opt.selectObjsBlockId,false).Data` → view model |
| `src/t3-react/features/designer/documents/hvac/hvacViewport.ts` | `ViewportAdapter` over `T3Gv.docUtil` / `docConfig` (see `interfaces.md` §4.1). Its capability is decided by *property presence*, because the getters answer `undefined` before the engine is up |

### Modified files

| File | Change |
|---|---|
| `src/t3-react/app/App.tsx` | add **one** route inside the `MinimalLayout` branch (after `App.tsx:505`): `designer/:kind/:id?` → `DesignerPage` (lazy). Old routes untouched (D10) |
| `src/t3-react/config/menuConfig.ts` | `getMenusForPath` (`:1429-1434`): add a `designer` branch **before** the `design` branch (`:1430`), because `'/t3000/designer'.startsWith('/t3000/design')` is `true` — the Design Hub menus would otherwise win. Use `pathname.startsWith('/t3000/designer/')` or an exact-segment match |
| `src/t3-react/features/hvac-designer/pages/HvacDesignerPage.tsx` | stays as the legacy page (D10). Extract its reusable pieces into the adapter; **do not delete** until P4 |
| `src/t3-react/features/hvac-designer/components/toolbar/TopToolbar.tsx` | accept `title?: ReactNode` and use `tokens.*` instead of the literal `#f5f5f5`/`#e1e1e1` (see `theme-and-css.md`) — **behavioural no-op** |
| `src/t3-react/features/hvac-designer/components/HvacDrawingArea.tsx` | add an optional `ids?: { svgArea; documentArea; hRuler; vRuler; cRuler }` prop, **defaulting to the historical ids** (used by P3) |

### Explicitly NOT changed in P1

| File / area | Why |
|---|---|
| `src/lib/t3-hvac/**` | D7 — P1 must not touch the engine. Container ids stay `#svg-area` etc. |
| `src/lib/t3-eez-studio/**` | untouched until P2 |
| `src/t3-react/app/router/routes.ts` | second route table; only needed when `windowId` navigation is wanted (P4) |
| `src/t3-react/features/hvac-designer/store/designerStore.ts` | the Zustand store; left alone (the engine never reads it) |
| `src/t3-react/layout/Header.tsx`, `MinimalLayout.tsx` | chrome unchanged (new route is also under `MinimalLayout`) |

---

## P1b — HVAC property editing

| File | Change |
|---|---|
| **NEW** `features/designer/documents/hvac/engineMutation.ts` | one funnel `applyHvacMutation(targetId, mutate)`: `ObjectUtil.GetObjectPtr(id, true)` → mutate → `DrawUtil.CompleteOperation([id], false)`. Typed helpers: `setFramePart`, `setRotation`, `setFillColor`, `setStrokeColor`, `setStrokeWidth`, `setFillOpacity`, `setObjectText`. Writable fields verified against the engine (`Frame.*`, `RotationAngle`, `StyleRecord.Fill/Line.Paint`, text via `DataID` → `runtimeText`) |
| **MOD** `features/designer/documents/hvac/HvacPropertiesPanel.tsx` | editable: Identity (read-only) · Geometry (X, Y, Width, Height, Rotation) · Appearance (Fill, Fill opacity, Stroke, Stroke width; line pattern / text colour / font read-only) · Text (Enter to apply) · Raw engine fields. `NumberField` commits on Enter/blur and reverts on Escape; errors are shown inline via an error boundary |
| **MOD** `features/designer/documents/hvac/HvacDocument.tsx` | supplies `layout.history` (`ToolActUtil.Undo/Redo` + `T3Gv.state.GetUndoState()`) so the shell's top bar can show Undo/Redo |
| **MOD** `features/designer/DocumentAdapter.ts`, `components/ShellTopBar.tsx`, `components/DesignerShell.tsx` | new optional `HistorySpec` in `ShellLayout` + polled Undo/Redo buttons in the top bar (absent when a document has no history) |
| **MOD** `src/lib/t3-hvac/Opt/Opt/ToolActUtil.ts` | bug fix: `this.ResetActiveTextEditAfterUndo()` → `TextUtil.ResetActiveTextEditAfterUndo()` (`:127`, `:255`). This one **is** an engine change and is required for undo/redo to run at all |
| **MOD** `test/vitest/__tests__/designer-shell.test.tsx` | +1 case: undo/redo render only when the document exposes a history |

There is no `designer-hvac-mutation.test.ts`: the funnel needs a live engine (`T3Gv.stdObj`), so pure mapping
tests are not possible and the funnel is covered by the browser gate instead.

**The engine cannot give one edit = one undo step.** Its history has no per-operation fidelity: several
states are pushed per operation and the pushed records alias the live `Data` rather than snapshotting it
(`StateBase` hardcodes `IsOpen = false`), so undo needs repeated presses before anything moves. The same
stack is shared by the legacy HVAC page, so the behaviour is identical there.

---

## HVAC right panel — Data section, Link Entry, widget record

Follow-on to P1b, same folder. The panel's `Data` section, the entry picker behind `Change`, and the app-layer
record a freshly drawn widget needs. Detail: [`pages/hvac-document.md`](./pages/hvac-document.md) §6.2–6.5.

### New files

| File | Purpose |
|---|---|
| `documents/hvac/LinkEntryApi.ts` | the picker's **REST** source (not `T3000_Data.panelsData`): `devices/:serial/{input,output,variable}-points` + `devices/:serial/table/{PROGRAMS,SCHEDULES,HOLIDAYS,GRAPHICS,MONITORDATA}`; `toEntry` maps a row into the entry shape the engine's link path consumes (`serial, pid, index, id, type, description, label, value, control, auto_manual, digital_analog, range, status, units`); 30 s cache + in-flight dedupe per serial; `refreshDevice` = `POST …/refresh` → `POST …/save-refreshed` with the `items` the first call returned |
| `documents/hvac/useLinkEntrySource.ts` | React side of that client: `bySerial` map → `entries`, plus `loading`/`error`; `ensure(devices)` (idempotent, 4 devices per chunk), `refresh(device)`, `reload(devices)` |
| `documents/hvac/useHvacAppStateItem.ts` | the app-layer twin of the selection (`appStateV2.items[activeItemIndex]`) the panel edits: `raw` (live — the object the engine calls take) plus `settings`/`t3Entry` **snapshots**, so a settings change repaints (a live bag compared with itself never did) |
| `documents/hvac/useHvacAutoRecord.ts` | registers the app-layer record for a widget shape whose placement skipped the engine's completion step; no-op for non-widget tools and for shapes that already have a record |
| `documents/hvac/hvacToolGroups.tsx` | the left region's tool groups as React items (categories/tools from `toolsCategories` / `NewTool`) |
| `documents/hvac/HvacLinkEntryPicker.module.css` | picker styles: layout height `min(60vh, 520px)`, 8-column grid (Point, Full Label, Label, Type, **Units**, **Range**, Value, Device), device rail, pinned current-link card |

### Modified files

| File | Change |
|---|---|
| `documents/hvac/HvacPropertiesPanel.tsx` | `Data` section (entry card + `Change`/`Unlink`; `Full Label` / `Label` / `Auto/Manual` / one `Value` row / `Display field`, all always rendered and blank when the entry has nothing; the `Value` control and its state words come from **`documents/hvac/PointRange.ts`** — the pages' own tables: `digital_analog === 0` ⇒ MSV list or the range's two words, anything else ⇒ number input with the range's unit) + the `Link Entry` dialog (grouped device rail, 8-column grid, pinned current link, keyboard passthrough, 500-row cap) + device-text sanitising |
| `documents/hvac/PointRange.ts` | the designer's single reader of a linked point's range, in the point pages' vocabulary (`features/<kind>/data/rangeData.ts`): `isDigital`, `rangeId` (`0`/`255` = unset), `label`, `states`, `isMsv`, `unit`. The engine's legacy reader (`IdxUtils.getEntryRange` / `T3Data.ranges`, `direct` pairs, symbol units) is untouched and still drives the canvas |
| `documents/hvac/HvacDocument.tsx` | calls `useHvacAutoRecord(ready)` in its runtime hook |
| `documents/hvac/LinkEntryApi.ts` | refresh contract corrected: `save-refreshed` requires `{ items: [...] }`, so the rows read by `refresh` are posted back (posting `{}` fails deserialization) |

---

## P2 — the LVGL document on the shell (new route, additive)

### P2.1 — the LVGL document host

| File | Change |
|---|---|
| **NEW** `src/t3-react/features/designer/documents/lvgl/LvglDocument.tsx` | the LVGL `DocumentAdapter`: canvas slot = `<EezStudioApp />` (memoised, never re-keyed), `layout.history` via the existing `eez-studio-action` undo/redo channel, title from the kind spec |
| **MOD** `src/t3-react/features/designer/registry.ts` | registers `lvgl-9-5` + `lvgl-flow-9-5` (lazy) |
| **MOD** `src/t3-react/features/designer/kinds.ts` | `available: true` for both LVGL kinds |
| **MOD** `test/vitest/__tests__/designer-shell.test.tsx` | +1 case: every kind with `available: true` must have a host |

**No engine file is involved.** `EezStudioApp` already renders `#EezStudio_Content` and owns the backend
handshake, the `?open=`/`?new=`/`?examples=` hand-off and the action→IPC bridge, so hosting the workbench
needs no separate host component and no change to `home/main.tsx`.

### P2.2 – P2.9 — the shell owns the panels

| File | Change |
|---|---|
| **NEW** `project-editor/hostMode.ts` | the flag that stops EEZ drawing its own workbench |
| **NEW** `project-editor/activeProject.ts` | publishes the live `ProjectStore` (= the `ProjectContext` value) to the shell |
| **NEW** `project-editor/project/ui/ActiveEditorView.tsx` | the active editor, resolved exactly as `factory` did |
| **MOD** `ProjectEditor.tsx` | publishes the project; `Content` renders `<ActiveEditorView/>` instead of `FlexLayoutContainer` in host mode |
| **MOD** `documents/lvgl/LvglDocument.tsx` | shell regions from the projection + registry, wrapped in the project context |

| File | Purpose |
|---|---|
| `src/t3-react/features/designer/documents/lvgl/projectEezLayout.ts` | **the core of P2**: projects the headless `LayoutModels` tree (borders + root rows/tabsets) into `ShellLayout` (`RegionSpec`s) — for whichever root model is current (editor · runtime · full simulator). Pure, 16 tests in `designer-lvgl-projection.test.ts` |
| `src/lib/t3-eez-studio/project-editor/project/ui/panelRegistry.tsx` | **NEW** (moved from `ProjectEditor.tsx:109-295`, not rewritten): `getPanelComponent(component, ctx, editorPanel?, tabId?)` — one source of truth for the old page and the shell. Lives in the EEZ tree (not `documents/lvgl/`) so the engine never has to import the app |
| `src/t3-react/features/designer/documents/lvgl/eezViewport.ts` | `ViewportAdapter` over the active page tab's `transform` / `uiStateStore.flowZoom` (`interfaces.md` §4.2, mirroring `Toolbar.tsx:603-620`) |
| `src/t3-react/features/designer/documents/lvgl/eezCommands.ts` | `undo/redo/save/checks/output` mapped to `projectStore.save()` (`store/index.ts:791`), `undoManager`, `projectStore.check()`/`build()` (`:806`/`:815`) |
| `src/t3-react/features/designer/documents/lvgl/lvgl-theme-bridge.css` | scoped `--eez-*` custom properties sourced from Fluent tokens (see `theme-and-css.md`), together with the `t3-designer` / `data-doc-kind` host hooks in `DesignerShell` |
| `test/vitest/__tests__/designer-lvgl-projection.test.ts` | pure tests for `projectEezLayout` against fixture layout JSON (no mobx/DOM needed) |

### Modified files

| File | Change |
|---|---|
| `src/lib/t3-eez-studio/project-editor/store/editor.ts` | `EditorsStore.refresh()` (`:296`) derived `activeEditor` from `TabSetNode.isActive()`, which fails with the root model unrendered; it now derives it from the tab set's active tab |
| `src/lib/t3-eez-studio/project-editor/project/ui/ProjectEditor.tsx` | `factory` delegates to `panelRegistry.getPanelComponent` (12 lines, was 186). `FlexLayoutContainer` (`:543-558`) stays for the legacy page; the shell does not use it |
| `src/lib/t3-eez-studio/eez-studio-ui/_stylesheets/app.less` | **scope the globals**: `*` (`:52`), `body` (`:64`), `body, .btn, …` (`:74`), `input…` (`:79,83,89,94,98`), `#EezStudio_Content` absolute positioning (`:129`), `#EezStudio_Content > div:first-child` (`:140`), `*:focus` (`:545`), `.flexlayout__*` overrides (`:1421-1490`) |
| `src/lib/t3-eez-studio/eez-studio-ui/_stylesheets/vars.less` | the 23 colour variables read `var(--eez-*, <literal>)`; nothing changes without the bridge (see `theme-and-css.md` §3) |
| `src/t3-react/app/App.tsx` | registers the `lvgl-*` kinds (the route itself is added in P1) |
| `src/t3-react/config/menuConfig.ts` | the shell selects menus **by document kind**: `getMenusForKind(kind)`, with `getMenusForPath` as a thin wrapper |

### Explicitly NOT changed in P2

| Area | Why |
|---|---|
| `store/layout-models.tsx` | D8 — the model stays; only its *rendering* moves |
| `project-editor/features/**` panel components | reused as-is through `panelRegistry` |
| Inner FlexLayout models (`fonts`, `bitmaps`, `styles`, `themes`, `lvglGroups`, `scpi`, `texts`) | still rendered by their own `FlexLayout.Layout` inside the canvas |
| `project-editor/lvgl/svg/**` | the SVG surface is untouched — it is the canvas content |

---

## P3 — HVAC host mode (container from the shell)

The container ids are owned by a leaf module `src/lib/t3-hvac/Data/Constant/AreaIds.ts` (single source of
truth, re-exported through `T3Gv.areaSelector` / `areaElement` so no engine file needs a new import), and each
mounted document installs its own id set (`makeAreaIds`) instead of the historical literals. `IdxPage.ts` /
`T3Hammer.ts` use `AreaIds` directly because they do not import `T3Gv` at all (that was a `ReferenceError` trap).

| File | Change |
|---|---|
| `src/lib/t3-hvac/Opt/UI/UIUtil.ts` | `:374-376` — pass **all five** ids into `InitializeWorkArea` (today only `svgAreaId`); `:401-403` — resolve `mainAppElement` / `workAreaElement` / `documentElement` from `T3Gv.docUtil.*` instead of literals |
| `src/lib/t3-hvac/Opt/Opt/OptUtil.ts` | `:394` — `this.svgDocId = '#svg-area'` becomes configuration-driven (default unchanged) |
| `src/lib/t3-hvac/Event/EvtUtil.ts` | `:63`, `:104`, `:264`, `:306`, `:1051`, `:1188` — `$('#svg-area')` / `getElementById('svg-area')` → `T3Gv.docUtil.svgAreaId` |
| `src/lib/t3-hvac/Event/EvtOpt.ts` | `:1161` — `$("#document-area")` → `T3Gv.docUtil.workAreaId` |
| `src/lib/t3-hvac/Opt/Opt/TextUtil.ts` | `:1081` — `new Hammer(document.getElementById('svg-area'))` → resolve from `T3Gv.docUtil.svgAreaId` |
| `src/lib/t3-hvac/Util/T3Hammer.ts` | `:523` — same |
| `src/lib/t3-hvac/Opt/Common/IdxPage.ts` | `:311-312` — `.v-ruler` / `.h-ruler` selectors → `docUtil.vRulerAreaId` / `hRulerAreaId` |
| `src/t3-react/features/designer/documents/hvac/HvacDocument.tsx` | generate per-mount ids (e.g. `svg-area-<docId>`) and pass them; wire `useAreaResize` instead of the fixed `setTimeout` refreshes |
| `src/t3-react/features/designer/documents/hvac/HvacCanvas.tsx` | **NEW**: the HVAC canvas markup with the ids taken from the adapter (extracted from `HvacDrawingArea.tsx`) |

Total: **14 hard-coded container references in 7 engine files** (6 + 1 in `EvtUtil`) plus the two
config sites and the React markup. `Doc/T3Opt.ts:159-162` is commented-out code — no change.
`Page/P.Main.ts` (`:7-17`) is **dead code** (no caller) — no change, but note it.

### Explicitly NOT changed in P3

| Area | Why |
|---|---|
| `UIUtil.GetScreenDimensions()` (`:879-887`) | window-based, feeds the *initial* document size. A container-based size would change behaviour; out of scope (the window-based sizing is kept) |
| `IdxUtils.ts:32-34`, `AppRuntime.ts` (10 sites) | Vue/Moveable/Selecto DOM, not used by the React path |
| `T3Clipboard.ts` ids (`#_IEclipboardDiv`, …) | clipboard proxies, document-level by design |

---

## P4 — route consolidation

| File | Change |
|---|---|
| `src/t3-react/app/App.tsx` | `/t3000/hvac-designer/:graphicId?` (`:491-503`) and `t3000/eez` (`:547-559`) become redirect components that rebuild the target path **and carry the query across**; `tstat10-simulator` (`:504-510`) in P5. Add a **catch-all** under `/t3000` (there is none today — `App.tsx:621` is a comment) |
| `src/t3-react/app/router/routes.ts` | update `:327` and add the `designer` entry; keep `windowId` semantics for `Header.tsx:814`. Add the missing `/t3000/eez`-equivalent entry so the two tables stop drifting |
| `src/t3-react/features/design-hub/drawingTypes.ts` | `:17, 66, 78, 91` — `openPath` values become the new routes (registry-driven) |
| `src/t3-react/features/design-hub/services/designHubService.ts` | `:97, 365, 487, 516, 595, 657` — `/t3000/hvac-designer/${id}` → `/t3000/designer/hvac-schematic/${id}` |
| `src/t3-react/features/design-hub/services/projectCatalog.ts` | `:75` (`/t3000/eez?open=…` → `/t3000/designer/lvgl-9-5?open=…`), `:95` |
| `src/t3-react/features/design-hub/components/DesignMenuBar.tsx` | `:114` `goNew` → new route |
| `src/t3-react/features/design-hub/components/NewTypeDialog.tsx` | `:39, 49, 70, 113` — default/placeholder path |
| `src/t3-react/features/design-hub/components/LvglCreateDialog.tsx` | `:189`, `:273` |
| `src/t3-react/features/design-hub/components/EezExampleCreateDialog.tsx` | `:100` |
| `src/t3-react/features/design-hub/components/NewDrawingDialog.tsx` | `:141` — resolves through `openPath`, so it follows the registry (no code change if the registry is updated) |
| `src/t3-react/layout/Header.tsx` | `:583` `navigate('/t3000/eez')` → new route (or route by kind) |
| `src/lib/t3-eez-studio/home/settings.tsx` | `:371` — `window.location.href = "/#/t3000/eez"` is a **cold full page load**; must be updated (the redirect would work, but it would cost a double load) |
| `src/t3-react/config/menuConfig.ts` | remove the EEZ **Switch Theme** item (`:1364`) or map it onto the T3000 theme (D5); keep the rest |
| `docs/t3000/design-hub/README.md` | `:15-17, 20, 106` — route table |
| `docs/t3000/t3-eez-studio/manual/01-overview.md` `:70`, `06-reference-and-faq.md` `:46-48` | user manual route table |
| `docs/t3000/architecture/lvgl-svg/architecture.md` `:20`, `editor-integration.md` `:51` | stale line refs + route |
| `test/vitest/__tests__/lvgl-svg-wire.test.ts` | `:1245-1369` pins literal `#/t3000/eez…` strings — they keep passing (the flag reader is location-based), but rename them for clarity and add the new-route equivalents |

---

## P5 — shared command bus, viewport controls, LCD document

| File | Change |
|---|---|
| **NEW** `features/designer/commands/CommandBus.tsx` | the bus (`register`/`get`/`all`/`subscribe`/`revision`) + `useRegisterCommands`/`useCommandStrip`. Module-level, not a context: EEZ's panels live in another React root |
| **NEW** `features/designer/commands/viewportCommands.ts` | one factory turning a `ViewportAdapter` into `zoomOut/zoomFit/zoomIn/zoomReset` + `toggleRulers`/`toggleGrid` — the code that makes both engines behave identically |
| **NEW** `features/designer/components/ShellCommandBar.tsx` | one strip rendered from the bus (`COMMAND_BAR_ORDER`); enabled/label/checked polled, since they live in the engines |
| **MOD** the two adapters | their bespoke toolbars are reduced to engine-specific extras |
| **NEW** `features/designer/documents/lcd/LcdDocument.tsx` | wraps `features/tstat10-simulator` as `kind: lcd-ui` |
| **MOD** `src/t3-react/app/App.tsx` | `/t3000/tstat10-simulator` redirects; `lcd-ui` registered |
| **MOD** `src/t3-react/app/router/routes.ts` | `:305-311` retargeted (keeping `windowId: 17`) |
| **MOD** `src/t3-mobile/layout/SideNavContent.tsx` | `:155` path → `designerPath('lcd-ui')` |
| **DEL** `src/t3-react/layout/PageHeader.tsx` `:137, 140` | two unreachable entries. Both paths render under `MinimalLayout`, which uses `ShellTopBar` and never `PageHeader`, so the entries were dead; the designer routes need none |

---

## Link sites and listener leaks

| File | Change |
|---|---|
| **NEW** `test/vitest/__tests__/designer-route-links.test.ts` | 5 cases pinning `designerPath(kind, id)` against `legacyRedirectTarget` (the two directions must not drift), the query byte-for-byte, every `DRAWING_TYPES.openPath` on a registered kind, the LVGL/flow split, and id encoding |
| `features/design-hub/drawingTypes.ts` | the 4 live `openPath` values are `designerPath(...)`; the **LVGL + Flow** type targets `lvgl-flow-9-5`, so the kind decides whether the Flow panel mounts, mirroring `hasFlowSupport`; the commented hidden types keep their historical literals |
| `features/design-hub/services/designHubService.ts` | 6 HVAC paths → `designerPath('hvac-schematic', id)` |
| `features/design-hub/services/projectCatalog.ts` | `?open=` + HVAC paths → `designerPath(...)`; the hand-written `encodeURIComponent` is now redundant and dropped |
| `features/design-hub/components/{DesignMenuBar,NewTypeDialog,LvglCreateDialog,EezExampleCreateDialog}.tsx` | 9 navigation targets → `designerPath(...)`; `LvglCreateDialog` derives `lvglKind` from the drawing type; three doc comments updated to the new hand-off URLs |
| `layout/Header.tsx`, `t3-mobile/layout/SideNavContent.tsx` | EEZ menu entry + mobile Tstat10 entry → `designerPath(...)` |
| `layout/PageHeader.tsx` | 2 unreachable legacy breadcrumb entries deleted, with a comment saying why the designer routes need none |
| `lib/t3-eez-studio/home/settings.tsx` | the cold full-page reload target → `/#/t3000/designer/lvgl-9-5` (same landing document as the redirect picked, one bounce less) |
| `lib/t3-hvac/Opt/Common/IdxPageReact.ts` | **leak fix**: `initWindowListener()` keeps its pair on the singleton engine, drops the previous pair before re-adding, and gains `destroyWindowListener()` |
| `features/designer/documents/hvac/HvacDocument.tsx` | teardown calls `destroyWindowListener()` |
| `app/EezStudioApp.tsx` | **leak fix**: holds a ref to `#EezStudio_Content` (captured while it is still mounted) and unmounts EEZ's own React root on teardown |
| `lib/t3-eez-studio/home/main.tsx` | **leak fix**: `eez-open-project` is bound once per page instead of once per mount |
| `features/designer/documents/lvgl/lvgl-theme-bridge.css` | the P2.8 comment now carries the measured A/B table **and** the bridge proof (Fluent token → `--eez-border` → a real EEZ border) |
| `test/vitest/__tests__/lvgl-svg-wire.test.ts` | the SVG flag also pins the unified URL form (`#/t3000/designer/lvgl-9-5?svg=1`) |

**Known engine-internal follow-up, not fixed:** EEZ's editor core keeps one `document` `keydown` handler alive
per remount (`(event) => { if (scrapbookModel.focused) … }`). The shell disposes the workspace's tab listeners
(`disposeTabListeners`) and unmounts EEZ's React root, which is the shell's boundary; the handler for the
*current* instance is the editor's own lifecycle and remains.

---

## Leaks and hardening

| File | Change |
|---|---|
| `src/css/app.css` | `body:not(:has(#EezStudio_Content))` re-asserts the app's own body font/size/background/colour, so EEZ's bootstrap + `app.less` (injected once for the SPA) stop leaking onto other documents |
| `src/lib/t3-eez-studio/home/tabs-store.tsx` | new `disposeTabListeners()` — sets `active = false` (inside `runInAction`) on every tab, which is the switch that releases their `document`/ipc listeners |
| `src/t3-react/app/EezStudioApp.tsx` | teardown now defers one tick, unmounts EEZ's own React root (`_eezRoot`, captured while mounted) and calls `disposeTabListeners()`; the create hand-off also consults the new guard before its first attempt, and surfaces a refusal through EEZ's notification surface instead of a silent no-op |
| **NEW** `src/t3-react/app/designerCreateGuard.ts` | the "is this folder ours to delete?" rule (`folderNameOf`, `targetExists`, `retryPlan`) — pure, unit-tested |
| **NEW** `test/vitest/__tests__/designer-create-guard.test.ts` | 5 cases: path/case normalisation, missing/empty lists, no retry+no cleanup for a pre-existing folder, unchanged retry behaviour otherwise |
| `src/lib/t3-hvac/Opt/Common/IdxPageReact.ts` | window-listener pair kept on the singleton + `destroyWindowListener()` |
| `src/lib/t3-hvac/Opt/Common/AppRuntime.ts` | `selecto.value?.setSelectedTargets(…)` at all 5 call sites — `selecto.value` is null whenever the host mounts no Selecto instance, and the unguarded form threw `can't access property "setSelectedTargets", …value is null`. The Vue engine (`src/lib/vue/T3000/Hvac/Opt/Common/IdxPage2.ts`) had the same five unguarded calls and is fixed in place with `SelectoErrorHandler.safeCall(selecto.value, …)` — the two trees are edited independently, and no file under `src/t3-vue/**` imports from `src/lib/t3-hvac/**` |

`delete_recursive` is `fs::remove_dir_all` with no staging: the create flow's delete-on-retry path removes before
it recreates, so `designerCreateGuard.ts` (above) owns the "is this folder ours to delete?" decision.

---

## Text entry

Port of the origin implementation (`Hvac-lib-v1.0/T3000/smart-draw/{app-t1,app}/`). Design and contracts:
`pages/hvac-document.md` §*Text entry*.

| File | Change |
|---|---|
| `src/lib/t3-hvac/Data/Constant/AreaIds.ts` | new export `TEXT_ENTRY_PROXY_ID` (`T3TouchProxy`) — the id `T3Clipboard` already queries |
| `src/lib/t3-hvac/Data/Constant/T3Constant.ts` | `DocContext.HTMLFocusControl` declared (read by `LMEvtUtil.LMMoveClick` and `S.BaseShape`) |
| `src/lib/t3-hvac/Opt/Opt/OptUtil.ts` | `SetVirtualKeyboardLifter` implemented (was an empty body); new `GetWorkAreaTextInputProxy()`; new field `theVirtualKeyboardLifterElementFrame`; `VirtualKeyboardLifter` caches the frame, resets it on deactivate, and no-ops when no proxy is rendered |
| `src/lib/t3-hvac/Opt/Tool/ToolUtil.ts` | `StampOrDragDropNewShape` blurs `HTMLFocusControl` when a tool is armed |
| `src/t3-react/features/hvac-designer/components/HvacDrawingArea.tsx` | renders `#T3TouchProxy` in `#document-area` — not inside `#svg-area`, which `HvacDocument` clears with `replaceChildren()` |
| **NEW** `src/t3-react/features/designer/documents/hvac/useHtmlFocusGuard.ts` | writes `CanTypeInWorkArea` / `HTMLFocusControl` from `focusin` / `focusout` |
| `src/t3-react/features/designer/documents/hvac/HvacDocument.tsx` | mounts `useHtmlFocusGuard()` |

Not ported: `MobileTextDialogTrigger` and the `m-mobiletext` modal (Android path), and `SetSelectionTool`'s
tool-highlight body (`ToolUtil.SetSelectionTool` remains a stub, so the Text tool does not highlight as armed).

---

## Text editing: line breaks and clipboard

| File | Change |
|---|---|
| `src/lib/t3-hvac/Opt/Keyboard/KeyboardOpt.ts` | `HandleKeyDown` returns for Ctrl+C/X/V instead of entering the command loop (origin `SDUI.MainController.HandleKeyDown` is an if/else; the command loop is its `else`) |
| `src/t3-react/features/hvac-designer/components/HvacDrawingArea.tsx` | proxy element is `<textarea rows=1>`; declares `#_crossTabClipboardDiv` / `#_IEclipboardDiv` / `#_clipboardInput`, which `T3Clipboard.Init` requires before it installs its listeners |
| `src/lib/t3-hvac/Opt/Opt/OptUtil.ts` | `TextCallback` → `keyend`: Enter returns `false` while `TextFlags.FormCR` is set, so the break reaches the editor through the field's `input` event |
| `src/lib/t3-hvac/Opt/Tool/ToolUtil.ts` | `StampCallback` sets `CRFlag` on a new text label (`SetShapeProperties({ CRFlag: true })`) — no other caller sets `FormCR` |
| `src/lib/t3-hvac/Shape/S.BaseDrawObject.ts` | `SetShapeProperties`' `ClickFlag` / `PositionFlag` are optional (a `CRFlag`-only update is valid) |
| `src/lib/t3-hvac/Opt/Clipboard/T3Clipboard.ts` | `PasteFromSystemEvent` falls back to `ToolActUtil.PasteObjects()` when the browser is not pasting into a field — a shape copy exists only in `header.ClipboardBuffer`. `DoCutCopy`'s async-clipboard steps are best-effort: the `clipboard-write` probe is guarded (`try`/`catch` plus a swallowed rejection — the descriptor is invalid in Gecko and WebKit) and `navigator.clipboard.write()` carries a `.catch` that reports through `LogUtil.Debug`, since Chromium refuses the write while the document is unfocused |
| `src/t3-react/features/designer/documents/hvac/useHtmlFocusGuard.ts` | engine-owned ids (`#T3TouchProxy`, the clipboard helpers) do not close the typing gate |

Open: an unprevented native `cut` / `copy` diverges, because `B.Text.Edit.HandleTextEntryFieldUpdate`'s diff
fallback is a stub (`diffResult = false`, whose `pos` is then read). That diff is the prerequisite for handing the
clipboard back to the browser.
