# Unified Designer — one editor, per-document-type content

This is the **architecture** document: the decisions and their rationale. The rest of the design set is indexed in
[`README.md`](./README.md): contracts ([`interfaces.md`](./interfaces.md)), the file-by-file change map
([`change-map.md`](./change-map.md)), theme/CSS ([`theme-and-css.md`](./theme-and-css.md)) and the
page-by-page design ([`pages/`](./pages/)). Related:
[`../lvgl-svg/`](../lvgl-svg/) (the SVG surface the LVGL document renders with),
[`../../design-hub/README.md`](../../design-hub/README.md) (the hub that opens documents).

---

## 1. Decisions

### 1a. Fixed decisions

| # | Decision | Consequence |
|---|---|---|
| D1 | **One editor**, not two that look alike | a single route, a single shell component, one set of areas |
| D2 | Same **structure** everywhere: top / left / canvas / right / status. Content comes from the document type | the shell knows nothing about engines; a `DocumentAdapter` per type supplies the content |
| D3 | **No document tabs.** One document is open at a time | no tab strip, no suspend/resume machinery; navigating replaces the document |
| D4 | **No split view** (never two documents side by side) | the app-singleton engines stay singletons — no engine-instance refactor |
| D5 | Theme authority is **T3000 Fluent tokens**; Fluent UI is the one UI library for the chrome | the shell and every slot use `tokens.*`; EEZ's own theme switch is removed from the shell menu |
| D6 | Route: **`/t3000/designer/:kind/:id?`**, the two old routes redirect | Design Hub links, deep links and the wizard hand-offs keep working |
| D7 | Engines are **hosted, never merged** | `lib/t3-hvac` (127k lines) and `t3-eez-studio` (280k lines) keep their document models |

### 1b. Values chosen by the design (reasoning in [`README.md`](./README.md) §1b)

| # | Decision |
|---|---|
| D8 | **Keep FlexLayout's model, drop FlexLayout's rendering.** The EEZ workbench's `LayoutModels` tree stays the source of truth for *which panel is selected*; the shell renders those panels. `selectTab` is a model action called from ~40 EEZ sites, and `EditorsStore.refresh()` derives `activeEditor` from the model — so this change keeps all of that intact |
| D9 | **Regions are tab containers**, not single components: `{ tabs, activeTabId, onSelectTab }`. An EEZ side area really is a tab set, so a one-component-per-area shell could not host it |
| D10 | **The new route is additive from P1.** `/t3000/designer/...` exists next to the old routes while P1–P3 are built; **P4** turns the old ones into redirects. This is what makes the project zero-risk until P4 and allows the same document to be compared in both shells |
| D11 | P2 renders the LVGL document under the new route **in parallel** with `/t3000/eez` (same reason as D10, and it keeps the fidelity harness usable on both) |
| D12 | The HVAC right panel ships **read-only** in P1; editing arrives in P1b with a verified undo path |

The enabling fact for D1/D2 is that **both middles are SVG documents**: the HVAC engine renders into an
SVG area it already resolves from configuration, and the LVGL page is now the SVG surface
(`project-editor/lvgl/svg/`, 7.9k lines) instead of a canvas.

## 2. Current state

Both routes are children of the same `MinimalLayout` in `src/t3-react/app/App.tsx`
(`hvac-designer/:graphicId?` `:491-503`, `tstat10-simulator` `:504-510`, `eez` `:547-559`), so they already
share the T3000 menu bar — `MinimalLayout` contributes a ~32 px menu bar and hands `flex: 1` to the page
(`layout/MinimalLayout.tsx:37, 69`), which is why every page here sizes with `height: '100%'`, never
`calc(100vh - Xpx)`. Commands are already bridged: HVAC menus call `lib/t3-hvac` (`hvacAct` → `toolOpt.*`),
EEZ menus dispatch `eez-studio-action` → IPC (`layout/Header.tsx:866-870` → `app/EezStudioApp.tsx:405-420`).

Two traps in that frame:

- **Menu sets are chosen by path prefix** (`config/menuConfig.ts:1429-1434`), and
  `'/t3000/designer'.startsWith('/t3000/design')` is `true` — a new `/t3000/designer/...` route would
  silently receive the **Design Hub** menus unless its branch is inserted first.
- **There are two hand-maintained route tables**: `App.tsx` (which renders) and `app/router/routes.ts`
  (metadata + `windowId`, used by `layout/Header.tsx:108, 814`). `App.tsx` never imports `routes.ts`, and
  `routes.ts` has already drifted (no `/t3000/eez`, no `/t3000/design`). Both must change together (P4).

What each page builds inside that frame:

| Area | `#/t3000/hvac-designer` | `#/t3000/eez` |
|---|---|---|
| Top | `TopToolbar` (`features/hvac-designer/components/toolbar/`), 60 px, polls `T3Gv` every 300 ms | backend status bar (`EezStudioApp.tsx:110-150`) + `EezStudio_AppHeader` (`home/app.tsx:36`) + EEZ toolbar (`project/ui/Toolbar.tsx:131-146`, 40 px) |
| Left | `ToolsPanel`, fixed 115 px, `#fafafa`/`#e1e1e1` literals | `borders.left` 240 px (Texts/Scpi/Instrument-commands/Changes — `layout-models.tsx:324-336`) **and** the `rootEditor` left column (Pages/Widgets/Actions + Components Palette + Widgets Structure — `:417-465`) |
| Canvas | `HvacDrawingArea` = rulers (`#c-ruler`, `#h-ruler`, `#v-ruler`) + `#svg-area`, inside `#work-area`/`#document-area` | the `EDITORS` tabset (`layout-models.tsx:471-478`); for an LVGL page, `LVGLSvgPage` |
| Right | `PropertiesPanel.tsx` exists but is **imported nowhere**, and it reads the Zustand store rather than the engine | `borders.right` 240 px (Styles/Fonts/Bitmaps/Themes/LVGL-Groups/Breakpoints/Variables — `layout-models.tsx:273-288`) **plus** the `rootEditor` right tabset (Properties — `:479-490`) |
| Bottom | `EditorStatusBar` (24 px, fed by the `t3-editor-status` window event) | `borders.bottom`: Checks / Output / Search / References (`layout-models.tsx:289-323`) |

Sizes: `lib/t3-hvac` 127k lines, `lib/t3-eez-studio` 280k, EEZ stylesheets 9.3k — versus the pieces to
unify: hvac-designer shell 3.3k, `tstat10-simulator` 3.0k, `t3-react/layout` 1.8k. The full design set
writes ~2.7k new lines and changes ~1.7k across ~55 files (`README.md` §4).

Why the two engines can share one shell at all — the four things they already agree on: **both canvases are
SVG**, **both have a selection model** (`SelectUtil`/`T3Gv.stdObj` vs `viewState.selectedObjects`), **both
expose their container** (`InitializeWorkArea({ svgAreaId, … })` vs a plain mount element), and **both have
a status source** (the engine's `RefConstant` scalars vs the shared `t3-editor-status` event).

### 2a. What already exists and can be reused

1. **A working precedent for the shell**: `tstat10-simulator` is a Fluent-`tokens` 3-panel designer
   (Toolbox | Canvas | Properties) with design/view modes — the same shape, with the chosen library.
2. **EEZ's panels are standalone components.** `ProjectEditor.tsx:109-295` maps a tab name to a component
   and passes **no layout props**: `propertiesPanel → <PropertiesPanel/>`,
   `pages → <PagesNavigation …/>`, `flow-structure → <PageStructure/>`,
   `componentsPalette → <ComponentsPalette/>`, `checksMessages`, `outputMessages`, `search`,
   `references`. FlexLayout is only a docking manager there — **but** which panel is *selected* is driven by
   FlexLayout model actions from ~40 EEZ call sites, so the model is kept (D8) and only the
   rendering is replaced. The `factory` switch is extracted into `documents/lvgl/panelRegistry.ts` so the old page and
   the shell render from one map.
3. **EEZ already has the "which editor is active" concept**: `EditorsStore`
   (`project-editor/store/editor.ts:157`) with `tabs` (`:281`, walks the model via `visitNodes`),
   `activeEditor` (`:161`), `openEditor(object)` (`:424`), `refresh()` (`:296`), `tabIdToEditorMap` (`:158`).
   With D3 the store is kept and **only the active editor** renders in the canvas slot. The left tree already
   drives it (`store/navigation.ts:450-466` → `editorsStore.openEditor`), and the canvas uses the same
   `getEditorComponent(object, params)` the tabset uses (`EditorComponentFactory.tsx:32`).
   **Caveat:** `refresh()` derives `activeEditor` from tab-node activation, which assumes a rendered tabset. The
   shell resolves this by deriving it from the tab set's active tab instead (`pages/lvgl-document.md` §7).
4. **The HVAC canvas is already container-configurable**: `DocUtil.InitializeWorkArea({ workAreaId,
   svgAreaId, hRulerAreaId, vRulerAreaId, cRulerAreaId })` (`lib/t3-hvac/Doc/DocUtil.ts:51-56, 190-193`)
   accepts arbitrary selectors, and the document lives in `docUtil.svgDoc`. Only **14 legacy references in
   7 files** hard-code the ids — see §7 and [`change-map.md`](./change-map.md) §P3.
5. **A document-type registry exists**: `features/design-hub/drawingTypes.ts` (`engine: 'hvac' | 'eez' |
   'simulator'`, `openPath`) — the `kind` of the new route comes from there.

## 3. Target architecture

```
/t3000/designer/:kind/:id?          one route, one document
        │
        ├── DesignerShell            ← the ONLY layout component (Fluent tokens)
        │     ├── TopBar             shell chrome + adapter.TopBar()
        │     ├── LeftPanel          adapter.LeftPanel()
        │     ├── Canvas             adapter.Canvas()          ← the only area an engine owns DOM in
        │     ├── RightPanel         adapter.RightPanel()
        │     └── StatusBar          adapter.StatusBar()
        │
        └── useDocument(kind, id)    → resolves a DocumentAdapter
                                        kind = hvac-schematic | lcd-ui | lvgl-9-5 | lvgl-flow-9-5
```

The contracts — `DocumentAdapter`, `ShellLayout`, `RegionSpec`, `PanelTab`, `CommandRegistry`,
`ViewportAdapter`, `MountContext`, `StatusPublisher` — are specified with real signatures and the engine
seams they bind to in **[`interfaces.md`](./interfaces.md)**. Shape, in one glance:

```ts
interface DocumentAdapter {
    kind: DocumentKind;  engine: "hvac" | "eez" | "simulator";
    mount?(ctx: MountContext): void | (() => void);   // once per document
    useLayout(): ShellLayout;                          // reactive; top/left/canvas/right/bottom/status
    commands: CommandRegistry;                         // undo/redo/save/zoom* with enabled state
    viewport?: ViewportAdapter;                        // zoom/pan/rulers/grid
    describe?(ctx): { title: string; modified?: boolean };
}
// ShellLayout.left/right/bottom are RegionSpecs: { tabs: PanelTab[], activeTabId, onSelectTab, width, … }
```

Rules that keep this small:

- The shell never imports an engine. Adapters live next to their engine
  (`features/designer/documents/hvac/HvacDocument.tsx`, `…/lvgl/LvglDocument.tsx`,
  `…/lcd/LcdDocument.tsx`).
- **One adapter mounted at a time** (D3/D4). No tab strip, no keep-alive, no per-document background state.
- The adapter may fall back to *hosting* an existing layout inside the canvas slot (P2 does exactly that
  for EEZ first: the whole EEZ workbench inside the canvas), then peel panels out one by one. Each peel is
  independently shippable.

## 4. Route and navigation scheme

| Kind | Route | Old route (redirect after P4) |
|---|---|---|
| `hvac-schematic` | `/t3000/designer/hvac-schematic/:graphicId?` | `/t3000/hvac-designer/:graphicId?` |
| `lvgl-9-5` | `/t3000/designer/lvgl-9-5/:id?` (`?open=` also accepted) | `/t3000/eez?open=…` |
| `lvgl-flow-9-5` | `/t3000/designer/lvgl-flow-9-5/:id?` | `/t3000/eez?type=…` |
| `lcd-ui` | `/t3000/designer/lcd-ui` (P5) | `/t3000/tstat10-simulator` |

Sequencing (D10/D11): **P1 and P2 add the new routes and leave the old pages exactly as they are**; **P4**
turns the old routes into `<Navigate>` redirects that copy `location.search` verbatim. That ordering is what
makes P1–P3 zero-risk (rollback = use the old URL) and lets the same document be compared side by side in
both shells.

Why the query string must be copied byte-for-byte: `svg`, `svg=0`, `svgDiff=1|all`, `svgStats=1` are read
from `window.location.search + hash` (`svg/feature-flag.ts:28-113`), and the LVGL runtime cache guard keys
its per-tab download stamp off the URL (`runtime-cache-guard.ts:47-70`). A dropped parameter silently
disables the fidelity harness or forces a WASM re-download.

The three traps above are the whole risk of this step: the menu prefix collision, the second hand-maintained
route table, and the missing catch-all. The exhaustive list of call sites is
[`change-map.md`](./change-map.md) §P4.

## 5. Region content per document type

Every side region is a **tab container** (D9). With one tab it renders as a plain titled panel (so the HVAC
document looks exactly as in the existing page); with several it renders a tab strip.

| Area | `hvac-schematic` (`engine: hvac`) | `lvgl-9-5` / `lvgl-flow-9-5` (`engine: eez`) |
|---|---|---|
| TopBar | HVAC tool strip: select, line, duct, wall, rect, resize, text… (the existing `TopToolbar`) | EEZ editor toolbar: save, undo/redo, page picker, add widget, align, run/preview (`Toolbar.tsx`, trimmed to the shared command set) |
| Left (tabs) | **one tab** — `ToolsPanel` | **Pages · Widgets · Actions · Components Palette · Widgets Structure** (the `rootEditor` left column, `layout-models.tsx:417-465`) **+ Texts · Scpi · Instrument commands · Extensions · Changes** (the left border, `:324-336`) — plus Variables when a local scope exists. Palette and structure may instead use `RegionSpec.secondary` (P2.3, option B) |
| Canvas | `#svg-area` + the three rulers, sized by the shell's canvas slot | the LVGL SVG surface for the **active editor** (`EditorsStore.activeEditor` → `getEditorComponent`), rendered inside the EEZ editor's own container (`.eez-canvas`, `flow/editor/editor.tsx:930-938`) |
| Right (tabs) | **one tab** — properties for the current selection (new; the engine's `selectObjsBlockId` + `SelectUtil.GetTargetSelect()`, read-only in P1, editable in P1b — see [`pages/hvac-document.md`](./pages/hvac-document.md) §6) | **Properties** (the `rootEditor` right tabset, `layout-models.tsx:479-490`) **+ Styles · Fonts · Bitmaps · Themes · LVGL Groups · Breakpoints · Variables** (the right border, `:273-288`); the **Components Palette** is added *here* at runtime when the user setting is on (`project.tsx:2215-2221`) |
| StatusBar | `EditorStatusBar`: name, cursor position, size, zoom, grid state | page size, zoom, modified flag, Checks/Errors count |
| BottomDock | — (none) | **Checks · Output · Search · References** (`borders.bottom`, `layout-models.tsx:289-323`), collapsed by default, with count badges |

Same structure, different content: choosing an LVGL project shows the LVGL left panel, choosing HVAC shows the
HVAC left panel.

For the LVGL document the tabs are **not hand-written in the adapter**: they are *projected* from the
headless `LayoutModels` tree (`documents/lvgl/projectEezLayout.ts`), so EEZ's own code keeps deciding which
panels exist for a given project type (`project.enableTabs()`, `project.tsx:2034`) and which one is selected.

## 6. Theme and CSS (Fluent tokens are the source of truth)

Full plan, tables and the scoping list: **[`theme-and-css.md`](./theme-and-css.md)**. The essentials:

- **Chrome**: the shell, panel headers, tab strips, splitters, toolbars and status bar use Fluent
  `makeStyles` + `tokens.*` only — no literal colours. The HVAC page's `#f5f5f5` / `#fafafa` / `#e1e1e1` /
  `#ffffff` become `tokens.colorNeutralBackground1/2/3` and `tokens.colorNeutralStroke2`.
- **EEZ inside the shell**: `vars.less` is **LESS**, i.e. compile-time, so a runtime theme cannot reach it
  as-is. The bridge is one line per variable: point `@borderColor` at `var(--eez-border-color)` (LESS passes
  the value through verbatim) and define the `--eez-*` properties on the document wrapper from Fluent
  tokens. ~33 of the 88 variables are bridged; the rest are semantic (data colours, drag affordances,
  shadows) or used in LESS functions and stay literal. Result: the panels follow the shell theme with **no**
  rule rewritten in 9.3k lines of `.less`.
- **Scope EEZ's globals** in the same commit as the first shell render: `* { user-select: none }`
  (`app.less:52`), `body { overflow: hidden; font-size: .8rem }` (`:64`), the element-level `input…` rules
  (`:79-98`), `*:focus` (`:545`), the `.flexlayout__*` overrides (`:1421-1490`) — and `#EezStudio_Content`
  (`:129`), which is `position: absolute` and therefore incompatible with living inside a flex slot.
- **One theme switch**: the T3000 one. `View ▸ Switch Theme` (`menuConfig.ts:1364`) is removed or mapped;
  EEZ's `onThemeSwitched()` (`home/settings.tsx:260-290`) stops mutating `html[data-bs-theme]` /
  `html.theme-dark`.
- **Known gap, out of scope**: dark mode is not wired anywhere — `App.tsx:204` hardcodes light,
  `t3000Theme` (`app/config/theme.ts:38`) is never passed to `FluentProvider`, and `ThemeSelector` is
  commented out (`Header.tsx:1006`). The bridge is written against Fluent tokens, so it becomes correct
  automatically the day dark mode lands.
- **The boundary**: Fluent for the chrome; EEZ keeps its internal widgets inside its panels. Rewriting
  EEZ's UI kit is explicitly out of scope.

## 7. Canvas and viewport

Both engines draw SVG, so the *container* can be shared and adapted:

| Shared by the shell | Kept by each engine |
|---|---|
| The canvas host element, its size and clipping | The document model and its rendering |
| Zoom / pan / fit controls and their enabled state | The viewport maths (`ViewportAdapter`) |
| Rulers region and grid toggles (visual chrome) | Ruler rendering and snapping |
| Selection highlight vocabulary in the status bar | Selection model and hit-testing |
| Cursor/status text | The status values themselves |

`ViewportAdapter` (one per engine, small):

```ts
interface ViewportAdapter {
    getZoom(): number;                  // 1 = 100%
    setZoom(zoom: number): void;
    zoomToFit(): void;
    panBy(dx: number, dy: number): void;
    rulers?: { h: boolean; v: boolean; set(h: boolean, v: boolean): void };
    grid?:   { visible: boolean; snap: boolean; set(visible: boolean, snap: boolean): void };
}
```

(Authoritative copy: [`interfaces.md`](./interfaces.md) §4, with the HVAC and LVGL mappings.)

- **HVAC**: everything exists already (`docUtil.SetZoomFactor`, `ApplyDocumentTransform`,
  `UpdateRulerVisibility`, `UpdateGrid`, `SnapToGrid`) — the adapter is a thin facade, and the 14
  hard-coded container references (§2a.4 list) become `T3Gv.docUtil.*`.
- **EEZ / LVGL**: the page editor has its own zoom/pan in the flow view state; the adapter exposes it. The
  image resampling trap (canvas switched to `image-rendering: pixelated` above 2×) does not apply to the
  SVG surface, which stays crisp — one of the reasons this direction was chosen.

## 8. Lifecycle and state (no tabs makes this simple)

| | HVAC document | LVGL document |
|---|---|---|
| Engine init | `Hvac.UI.Initialize(null)` + `Hvac.IdxPageReact.initQuasar(null)` + `initPageReact()` on canvas mount (`HvacDesignerPage.tsx:105-107`) | `initEezMain()` — a **separate React root** on `#EezStudio_Content` (`home/main.tsx:183-194`) |
| **Idempotency** | **NOT safe to call twice.** `T3Opt.Initialize` destroys `T3Gv.state`/`stdObj` (`DataOpt.ts:472-477`), creates new `docUtil`/`opt` (`T3Opt.ts:100-101`), and `InitializeWorkArea` re-binds `$(window)` handlers with **no unbind** (`DocUtil.ts:225,230,240`); `IdxPageReact.initWindowListener()` adds anonymous listeners per call (`IdxPageReact.ts:58-66`) | `initEezMain()` unmounts the previous root and re-creates it (`main.tsx:185-188`); there is **no teardown**, so navigating away leaves the root attached to a detached node until the next mount |
| Open a document | `useDrawing(graphicId)`: DB → engine; else `createNew()` | `?open=` / `:id` → `openProject(path)` (`tabs-store.tsx`), with the same 150× retry loop (`EezStudioApp.tsx:229-263`) |
| Switch document (navigate) | unmount canvas → next document initialises | same EEZ app; `openProject` for the new path |
| Unsaved changes | engine autosave + `DataOpt.SaveToLocalStorage`; `T3Gv.opt.header.DocIsDirty` (`HeaderInfo.ts:83`) | `projectStore.isModified` (`store/index.ts:948`) |

Because D3 removes tabs, **no suspend/resume contract is needed**: navigating away unmounts the view and
the document's state lives where it already lives (drawing record / project store).

The idempotency column is the one real lifecycle constraint, and it drives a hard shell rule:
**the canvas host is mounted exactly once per document** — never keyed on panel state, theme, or layout, and
guarded against React StrictMode's double effect invoke. The canvas
resizes are communicated to the engine as notifications (`docUtil.HandleResizeEvent()`, already debounced
100 ms — `DocUtil.ts:659`), never as remounts. An "unsaved changes" guard, if added, is a small P4 item, not an architectural one.

## 9. Explicitly out of scope

- Merging the two document models, or rewriting either engine.
- Making the engines non-singleton (D4 removes the need).
- Replacing EEZ's internal UI kit with Fluent.
- Keeping FlexLayout as the shell's layout manager (its panels are reused; the docking manager is not).
- Multiple documents at once, document tabs, or split view.

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| The EEZ app is a second React root mounted into a fixed id (`#EezStudio_Content`, `home/main.tsx:183`) | P2 keeps that element as the canvas host (the shell renders it), then parameterises the id if a second mount point is ever needed |
| EEZ's global CSS (`*`, `body`, bootstrap) affects the HVAC document | scope it under the EEZ wrapper in the same phase that introduces the shell (P2) |
| The HVAC engine reads container ids in 14 places | convert them to `T3Gv.docUtil.*` first (P3) — mechanical, no behaviour change, verified against the existing designer |
| Behaviour drift while peeling EEZ panels out of FlexLayout | peel one panel at a time, each with a verification step; the fidelity harness (`?svgDiff=1`) and the interaction tests are the regression net for the canvas |
| Losing FlexLayout features (drag-dock, saved layouts, "Reset Layout") | accepted with D2's fixed structure; replace with panel show/hide toggles and a "reset panels" command |
| A route change remounts EEZ and re-creates the LVGL runtime | already the case; keep-alive is added only if the switch cost is a visible problem |

## 11. Verification strategy (per phase)

The HVAC engine has **no** automated tests, so its gate is the A/B comparator described in 1 and 3 below;
everything else is covered by the vitest suites named last. In short:

1. **Shell (P1)**: the same drawing on the old and the new route must produce identical `shapeCount`,
   `layers`, `docSize`, `zoom` and bounding boxes, and a pixel-identical drawing region; the shell's own
   chrome may differ.
2. **LVGL document (P2)**: `?svgDiff=1` reports **0 failing rows** on all reachable pages (baseline: 13
   pages, 0 failing rows), `globalThis.__lvglSvg.interaction()` reports `editorHotspots > 0` and
   `selectionChrome > 0` (drag/resize/undo are dead if either is 0), and the mixed-selection properties
   crash (widget + connection line) stays fixed.
3. **HVAC host mode (P3)**: the comparator again, with container ids supplied by the shell, plus a grep
   gate proving no `#svg-area` / `#document-area` literal is left outside `DocUtil`.
4. **Route consolidation (P4)**: the 9-row redirect matrix, the Design Hub link paths, the wizard and
   example create hand-offs, and menu sets following the **document kind**.
5. **Always**: `npx vitest run lvgl-svg` green, `node test/unit/lvgl-svg-dump-smoke.mjs` green,
   `npx tsc -p tsconfig.json --noEmit --ignoreDeprecations 5.0` clean for touched files (the flag is
   required: `tsconfig.json:11` says `"6.0"` while the installed compiler is 5.9.2).

## 12. Open questions

Each has a default, so nothing blocks:

1. **Left-panel default tab** for an LVGL document → **Pages**.
2. **Second editor replaces the canvas** instead of opening a tab (D3) → **accepted**.
3. **Where "New drawing" lives** → **stays in the Design Hub**; `File ▸ New…` links there.
