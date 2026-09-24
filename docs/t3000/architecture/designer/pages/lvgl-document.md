# The LVGL document, panel by panel

Document kinds `lvgl-9-5` / `lvgl-flow-9-5`, engine `eez` (`src/lib/t3-eez-studio`, ~280k lines).
Hosted by `documents/lvgl/LvglDocument.tsx` (P2). The design principle is **D8**: the EEZ
`LayoutModels` tree stays headless and authoritative; the shell *projects* it and renders the panels.

```
PE = project-editor/project/ui/ProjectEditor.tsx   (factory :109-296, onRenderTab :298-455)
LM = project-editor/store/layout-models.tsx        (tab JSON :62-186, borders :264-337, rootEditor :403-500)
```

---

## 1. Where the panels live today (the map that must be projected)

`rootEditor` (`LM:403-500`, **version 129**) is a 3-column row:

| Column | Weight | Contents |
|---|---|---|
| left | 32.4 | nested row → tabset **0.8** = `pages` \| `widgets` \| `actions`; tabset **1.7** = `componentsPalette`; sibling tabset (no id) = `flow-structure` ("Widgets Structure") — created by `enableTab` at `project.tsx:2208-2213` |
| middle | 47.6 | tabset `id="EDITORS"` (`LM:471-478`), `enableDeleteWhenEmpty:false`, children `[]` — editors are added at runtime by `EditorsStore.openEditor` |
| right | 20 | tabset `id="PROPERTIES"` → `propertiesPanel` (`LM:479-490`) |

**`borders`** (`LM:264-337`) — this is what my earlier docs got wrong:

| Border | Size | Tabs, in order |
|---|---|---|
| top | — | **empty** (`:266-270`) |
| **right** | **240** (`:276`) | `styles` (`:278`) · `fonts` (`:279`) · `bitmaps` (`:280`) · `themes` (`:281`) · `lvgl-groups` (`:282`) · `BREAKPOINTS_PALETTE` (`:283`) · `VARIABLES` (`:284`) |
| bottom | — | `CHECKS` · `OUTPUT` · `SEARCH` · `REFERENCES` (`:289-323`) |
| **left** | **240** (`:326`) | `texts` (`:328`) · `scpi` (`:329`) · `instrument-commands` (`:330`) · `iext` (`:331`) · `changes` (`:332`) |

Two runtime additions that change the picture:

* **`COMPONENTS_PALETTE` is added next to `PROPERTIES`** — i.e. on the **right**
  (`project.tsx:2215-2221`, gate `settingsController.showComponentsPaletteInProjectEditor`), *not* in the
  left column as its name suggests.
* `BREAKPOINTS_PALETTE` is added next to `COMPONENTS_PALETTE` when `flowSupport` (`:2208-2213`).

`enableTabs()` (`project.tsx:2034-2222`) gates what exists for an LVGL project:
`styles` ✅ (mandatory), `lvgl-groups` ✅ (mandatory), `themes` ✅ (always), `changes` ✅ (not optional),
`fonts`/`bitmaps`/`texts`/`scpi`/`instrument-commands`/`iext` **only if the project file has them**,
`BREAKPOINTS_PALETTE` iff `settings.general.flowSupport`,
`COMPONENTS_PALETTE` per user setting. `enableTab` only adds-if-absent and needs its anchor tab to exist
(`:2050-2062`), otherwise the add is silently skipped.

## 2. The shell projection (what P2 must implement)

| Shell region | Projected from | Tabs (LVGL, typical file) |
|---|---|---|
| **left** | rootEditor left column **+** `borders.left` | column (**strip**): Pages · Widgets · Actions · Components Palette, then the *Widgets Structure* second column; border (**rail**): Texts · Scpi · Instrument commands · Extensions · Changes (*Variables* when a local scope exists) |
| **canvas** | the `EDITORS` tabset | the **active editor only** (see §4) |
| **right** | `EDITORS`'s sibling (Properties) **+** `borders.right` | column (**strip**): Properties; border (**rail**): Styles · Fonts · Bitmaps · Themes · LVGL Groups · Breakpoints · Variables |
| **bottom** | `borders.bottom` | Checks · Output · Search · References (collapsed) |
| **top** | `ProjectEditorView`'s `<Toolbar/>` (`PE:86`) + the backend status bar | |

**A side is two things, and they are drawn as two** (2026-09-19). The **column** is the region body, with its
normal top tab strip; the **border** is a *rail* — a bar of rotated tabs pinned to the window edge, whose
selected tab opens a 240 px column beside it (`size: 240`, `LM:276,326`; the bar itself is flexlayout's
measured `borderBarSize`, 26 px in the shell). Projected as `ProjectedRegion.body` and `ProjectedRegion.border`
(`panels` stays the union, `stripPanels()` is what the strip may show). Merging the two into one strip is a
measured defect, not a style choice: the right side needed 471 px of tabs and had 228 px, so five of its eight
tabs were unreachable, and the left border's five were not drawn at all. Clicking a rail tab uses
`Actions.selectTab` directly, because flexlayout **toggles** a border there (`Model.js`, `BorderNode` branch)
while EEZ's own `layoutModels.selectTab` deliberately skips an already-selected tab. A border with no tabs
draws no bar — `enableTabOnBorder` gates the left border on what the project has, and most projects have none.

Projection rules:

1. Walk the model; map each tab node's `component` through `panelRegistry.getPanelComponent(component, id)`.
2. `activeTabId` reads the model's selected node; `onSelectTab(id)` → `layoutModels.selectTab(root, id)`
   (`LM:1161-1176`). **`selectTab` is a silent no-op if the node is absent**, so an "unknown id" never throws.
3. Nodes with no `id` (the `flow-structure` inline JSON, `LM:457-465`) cannot be addressed by `selectTab` —
   the shell must key them by component name (`flow-structure`) and select the parent tabset's node directly.
4. Widths: left 240 / right 240 to match `LM:276, 326`; user drags persist per kind.
5. `reset panels` → `LayoutModels.reset()` (`LM:1185-1190`).

### The root model is not one model (2026-09-20)

`layoutModels.root` is a **computed**, swapped per mode (`LM:226-234`) — but the model alone does **not** say what
the shell must draw, because `ProjectEditor.Content` returns the runtime page *instead of* the workbench
(`PE:312-331`) when the runtime is on without the debugger. The mode is the real signal, so
`activeProject.ts` publishes it (`none` · `edit` · `run` · `debug` · `full-sim`) and
`projectEezLayout.eezRegionPlan(mode, model)` decides:

| mode | LLM: the rule | panels (shell regions) | canvas |
|---|---|---|---|
| **Edit** | `rootEditor` | Pages·Widgets·Actions above Components Palette + Widgets Structure (rail = Texts…Changes) | the active editor |
| **Run** | runtime on, **no** debugger | **none** — `Content` returns the runtime page before it looks at the model | the running screen, full area |
| **Debug** | runtime on, debugger active | `rootRuntime`: Pages·Widgets·Actions ／ Active Flows ／ Watch · Queue·Breakpoints ／ Logs | the active editor (the runtime page) |
| **Full Sim** | `rootDockerSimulator` | left **none** · right Build Logs ／ Preview Logs | the model's *Preview* panel |
| *(no project)* | — | placeholders, labelled from the URL | `EezStudioApp`'s boot state |

Consequences the projection had to absorb:

- **The canvas is identified by id, not by contents.** The runtime model's editor tabset is declared empty and
  EEZ fills it *after* the switch, so at the moment the shell re-projects it holds no `editor` tab — an empty
  `RUNTIME-EDITORS` would be read as another side column. In Full Sim the canvas is not an editor tabset at all:
  it holds the `dockerSimulatorPreview` **panel**.
- **A side is decided by position, not by contents.** The old rule (“holds `PROPERTIES` → right”) only works in
  the editor model; neither the runtime nor the full-simulator model has a Properties tab, so their right-hand
  columns (*Queue*/*Logs*, *Build Logs*/*Preview Logs*) landed in the left region. The root row is
  `[ <left columns>, <canvas tabset>, <right columns> ]` in all three models, so the canvas is what splits it;
  the content rule is the fallback for a model whose canvas cannot be identified (and is still unit-tested).
- **A missing model is never “no panels”.** The regions are dropped only when a mode's projection is genuinely
  empty (Full Sim's left side); when there is nothing to project yet the plan says *placeholders*, because
  dropping them there leaves an empty window with no way back.
- **The toolbar stays in every mode** — EEZ's own toolbar carries Edit · Run · Debug · Full Sim, so it is the
  only way out of Run. In Full Sim the canvas draws the *Preview panel*: `ActiveEditorView` resolves that tab
  through `getPanelComponent` when `isDockerSimulatorMode` is on, because hosted mode has no FlexLayout factory
  to do it.

## 3. All 30 factory panels

Legend: **aE** = needs `editorsStore.activeEditor`; **FL** = renders its own `FlexLayout.Layout`;
**hazard** = something that breaks outside a normal FlexLayout box.

| # | `component` (`tabId`) | File | Renders | aE | FL | hazard / notes | change |
|---|---|---|---|---|---|---|---|
| 1 | `pages` (`"PAGES"`) | `ui-components/ListNavigation.tsx` | title row (sort, search, add/delete) + `Tree` | – | – | `Tree` measures rows + `scrollIntoView` (`Tree.tsx:382-600, 83, 316`) → needs a real box; `onFocus` sets `navigationStore.selectedPanel` (`:330-336`) | `MOVED` to the left region; keep |
| 2 | `widgets` (`"WIDGETS"`) | same | same | – | – | as #1 | same |
| 3 | `actions` (`"ACTIONS"`) | same | same | – | – | clicking opens `ActionEditor` (only if `flowSupport`) | same |
| 4 | `flow-structure` (no id) | `features/page/PagesNavigation.tsx` (`PageStructure:56`) | toolbar (38 px) + widget `Tree` | **YES** (`:82-104`) | – | renders `<div className="EezStudio_PageStructure_NoPageSelected">` (`:438`) unless `activeEditor.object instanceof PageClass` | `MOVED`; **the hard `activeEditor` dependency is the #1 argument for the P2.0 spike** |
| 5 | `variables` (`"VARIABLES"`) | `features/variable/VariablesNavigation.tsx` | `SubNavigation` pills (Global/Local/Structs/Enums) + list | partial (`:31`, Local only) | – | "Local" pill disappears when no page/action editor is active (`:65-82`) | `MOVED` |
| 6 | `styles` (`"styles"`) | `features/style/StylesNavigation.tsx` | switch → `LVGLStylesNavigation` (`lvgl/style.tsx:749`) for LVGL | – | **YES** (`layoutModels.lvglStyles`, `lvgl/style.tsx:781`; 75/25, preview draws to a **canvas**) | nested FlexLayout inside a panel | `MOVED`; both models keep rendering |
| 7 | `fonts` (`"fonts"`) | `features/font/FontsNavigation.tsx` | single `ListNavigation` | – | – | For LVGL, clicking a font opens **nothing** unless `params.forceOpenEditor` (`EditorComponentFactory.tsx:52-54`) | `MOVED`; document the dead click |
| 8 | `bitmaps` (`"bitmaps"`) | `features/bitmap/BitmapsNavigation.tsx` | nested 75/25: list + `BitmapEditor` | – | **YES** (`layoutModels.bitmaps`, `:87`) | file drag-and-drop onto the list (`:63-79`) | `MOVED` |
| 9 | `changes` (`"changes"`) | `features/changes/navigation.tsx` | toolbar (Refresh, Compare) + revisions `List` | – | – | **uses `@electron/remote` `dialog`/`getCurrentWindow`** (`:1`) | `MOVED`; Web build must degrade (check what it does today) |
| 10 | `texts` (`"texts"`) | `features/texts/navigation.tsx` | nested 3 tabsets: statistics / resources / languages | – | **YES** (`layoutModels.texts`, `:331`) | XLIFF import/export via Electron file APIs | `MOVED` |
| 11 | `scpi` (`"scpi"`) | `features/scpi/ScpiNavigation.tsx` | nested: subsystems/enums + commands | – | **YES** (`layoutModels.scpi`, `:52`) | `NavigationComponentFactory.tsx:378-409` selects **inner** tabs — those calls stay inner | `MOVED` |
| 12 | `instrument-commands` (`"instrument-commands"`) | `features/instrument-commands/InstrumentCommandsNavigation.tsx` | single `ListNavigation` + refresh | – | – | opens an **absolutely-positioned `<iframe>`** editor (`:88-95`) | `MOVED`; the iframe needs a positioned ancestor in the canvas slot |
| 13 | `extension-definitions` (`"iext"`) | `features/extension-definitions/extension-definitions.tsx` | single `ListNavigation` | – | – | **not wrapped in `observer()`** (`:33`) → most likely panel to go stale in a new shell | `MOVED`; **`MOD`: add `observer`** or ensure the shell re-renders it on project change |
| 14 | `propertiesPanel` (`"PROPERTIES"`) | `project/ui/PropertiesPanel.tsx` | header (icon + title) + `PropertyGrid`(s) | indirect (`navigationStore.propertyGridObjects` falls back to `activeEditor`, `store/navigation.ts:505-520`) | – | imperative scroll restore via `bodyRef.scrollTop` (`:63-84`); `PropertyGrid` popovers use `getBoundingClientRect` + `window.inner*` | `MOVED` to the right region, first tab |
| 15 | `componentsPalette` (`"COMPONENTS_PALETTE"`) | `flow/editor/ComponentsPalette.tsx` | sub-tabs Widgets/Actions + draggable items | **YES** (`:245-252` forces "actions" when an Action is active) | – | HTML5 drag + a **global** `DragAndDropManager`; the drop target is the flow editor canvas | `MOVED`; drag-and-drop must be re-verified across regions |
| 16 | `breakpointsPanel` (`"BREAKPOINTS_PALETTE"`) | `flow/debugger/BreakpointsPanel.tsx` | `Panel` with 3 buttons + list | – | – | present in **both** the editor root and the runtime model → the same component can mount twice | `MOVED` |
| 17 | `themesSideView` (`"themes"`) | `features/style/theme.tsx` | nested: themes list + colour list | – | **YES** (`layoutModels.themes`, `:304`) | can display a **different** project's themes (master project) → `readOnly` | `MOVED` |
| 18 | `checksMessages` (`"CHECKS"`) | `ui-components/Output.tsx` (`Messages:94`) | `Tree` of messages | – | – | **`scrollIntoView` on every update** (`:118-136`) can scroll ancestors; tab label/icon/badge come from `onRenderTab` (`PE:302-348`) | `MOVED` to the bottom dock |
| 19 | `outputMessages` (`"OUTPUT"`) | same | same | – | – | same | same |
| 20 | `search` (`"SEARCH"`) | `project/ui/SearchPanel.tsx` | local toolbar (pattern, case, whole word, prev/next, replace) + `Messages` | – | – | label becomes `section.name (n)` via `onRenderTab` (`PE:361-378`) | `MOVED` to the dock |
| 21 | `references` (`"REFERENCES"`) | `project/ui/ReferencesPanel.tsx` | toolbar + `Messages` | – | – | `findAllReferences()` also does `selectTab(root, REFERENCES_TAB_ID)` (`store/index.ts:509-512`) → in the shell this must **open the dock**, not a FlexLayout tab | `MOVED` + **`MOD`**: map that `selectTab` to the shell's dock-open command |
| 22 | `editor` (dynamic) | `EditorComponentFactory.tsx:32` | see §4 | **is** the concept | per editor | `PE:253-277` installs `node.setEventListener("visibility"\|"close", …)` **during render** — the shell must re-provide those hooks | `MOVED` to the canvas |
| 23 | `lvgl-groups` (`"lvgl-groups"`) | `lvgl/groups.tsx` | nested 50/50: groups list + widgets-in-group | partial (`:382, 396, 425`) | **YES** (`layoutModels.lvglGroups`, `:469`) | the widgets tab returns `null` unless a Page editor with `FlowTabState` is active (`:428-431`); `CodeEditor.resize()` manual measure (`:70-78`) | `MOVED` |
| 24 | `queue` (runtime) | `flow/debugger/QueuePanel.tsx` | debugger panel + tree | – | – | runtime-only (`context.runtime`), no id in the model | `UNCHANGED` (runtime mode is not a Designer document) |
| 25 | `watch` (runtime) | `flow/debugger/WatchPanel.tsx` | panel + expression table | **YES** (`:687`) | – | runtime-only | `UNCHANGED` (P5 option) |
| 26 | `active-flows` (runtime) | `flow/debugger/ActiveFlowsPanel.tsx` | panel + flows tree | – | – | hard-coded input id `EezStudio_DebuggerPanel_ActiveFlows_ShowFinishedFlows` (`:64,74`) → duplicate DOM id if mounted twice | `UNCHANGED` |
| 27 | `logs` (runtime, `"DEBUGGER_LOGS"`) | `flow/debugger/LogsPanel.tsx` | filter + `AutoSizer`+`FixedSizeList` | – | – | **`AutoSizer` needs a parent with a definite height** (`:112-140`) | `UNCHANGED` |
| 28-30 | `dockerSimulatorPreview` / `…Logs` / `…PreviewLogs` | `lvgl/docker-build/*` | iframe preview + log panes | – | – | preview **registers a global `window` `message` listener** (`:20-33`) and sets `iframe.src` imperatively; logs `scrollIntoView` per update (`:24`); preview-logs writes `scrollTop` per update (`:19-26`) | `UNCHANGED` unless a Docker document kind is added |

## 4. The `editor` key — what can appear in the canvas

Resolution: `editorsStore.tabIdToEditorMap.get(node.getId())` (`PE:254`) →
`getEditorComponent(editor.object, editor.params)` (`EditorComponentFactory.tsx:34-105`), in branch order:
`Action` → `Font` (LVGL only with `forceOpenEditor`) → `project.micropython` → `Page` →
SCPI → instrument commands → `project.shortcuts` → `project.settings` → `project.readme` →
`project.changes` → *undefined* (the tab renders nothing).

| Editor | File | Own FlexLayout | Notes for the shell |
|---|---|---|---|
| `PageEditor` (the main one) | `features/page/PageEditor.tsx:21` | **no** — but renders a vertical `Splitter` (`FlowEditor` + `PageTimelineEditor`) when the timeline is active (`:28-39`) | the LVGL canvas/SVG surface comes from `features/page/page.tsx:930-950` |
| `ActionEditor` | `features/action/ActionEditor.tsx:20` | no | only with `flowSupport` |
| `FontEditor` | `features/font/FontEditor.tsx:55` | **YES** — `layoutModels.fonts` (`:615-618`) | reached only via `params.forceOpenEditor` for LVGL |
| `MicroPythonEditor` | `features/micropython/micropython.tsx:23` | no | |
| `ScpiHelpPreview` / `InstrumentCommandHelpPreview` | `features/scpi/ScpiNavigation.tsx:151`, `features/instrument-commands/…:66` | no | **absolutely-positioned iframes** → need a positioned canvas slot |
| `ShortcutsEditor` | `features/shortcuts/project-shortcuts.tsx:48` | no | table + optional `CodeEditor` |
| `SettingsEditor` | `project/ui/SettingsNavigation.tsx:205` | **YES, per render** — builds `FlexLayout.Model.fromJson` every render (`:210-243`) | `FIX-OPPORTUNITY`/risk: model churn on each render |
| `ReadmeEditor` | `features/readme/navigation.tsx:18` | no | jQuery HTML rewriting in `componentDidUpdate` |
| `ChangesEditor` | `features/changes/editor.tsx:75` | no | embeds `flow-viewer.tsx`, which uses a **`ResizeObserver`** (`:279-355`) — breaks if the container is 0-sized |

**There is no editor** for style / theme / colour / bitmap / text resource / language / variable / structure /
enum / extension definition / LVGL group: selecting those shows the **Properties panel only**. Their "editor"
is the corresponding panel (#6, #7, #8, #10, #17, #23).

## 5. Cross-cutting hazards the shell must absorb

| Hazard | Where | Consequence if ignored | Handling |
|---|---|---|---|
| Perpetual `rAF` measuring loop | `flow/editor/editor.tsx:290-310, 388-402` (`updateClientRect` vs `getBoundingClientRect`) | scrollbar maths wrong if the container later changes size/position (e.g. docking the bottom panel) | keep the canvas element stable; verify after dock open/close |
| `ResizeObserver` | `features/page/PageTimeline.tsx:320-354`, `features/changes/flow-viewer.tsx:279-355` | collapses on a `display:none`/0-size container | never hide the canvas with `display:none`; collapse means *unmount the panels*, not the canvas |
| `AutoSizer` | `LogsPanel.tsx:112-140` | list renders 0 px tall | ensure a definite height in the dock |
| `scrollIntoView` on update | `Output.tsx:118-136` (Checks/Output/Search/References), `DockerSimulatorLogsPanel.tsx:24`, `Tree.tsx:83,316`, `PropertyGrid/index.tsx:61`, `font/Glyphs.tsx:81` | scrolls ancestor containers (can scroll the whole shell) | the dock body and panel bodies must be their own scroll containers (`overflow:auto`) |
| Imperative scroll writes | `PropertiesPanel.tsx:63-84`, `PreviewLogsPanel.tsx:19-26` | same | as above |
| Global `window` listener | `DockerSimulatorPreviewPanel.tsx:20-33` | double-ingest if two instances mount | one instance only |
| Duplicate DOM ids | `ActiveFlowsPanel.tsx:64,74`; **all FlowEditor containers keyed by `viewState.containerId` guid** (`flow/flow-tab-state.tsx:17`; queried in `bounding-rects.ts:38,208,96` and `mouse-handler.tsx:601…1654`) | **duplicating the same `FlowTabState` in two places breaks all drag math** — the strongest argument for D3 (one document, one editor instance at a time) | never render the same editor twice |
| Tab chrome owned by FlexLayout | `onRenderTab` (`PE:298-455`): labels, icons, `(n)` badges, loader, attention dot, italic non-permanent titles, middle-click close, `@electron/remote` context menu | losing it loses badges/close behaviour | the shell's `PanelTab` must re-provide: `label`, `icon`, `badge()`, `closable`, `onClose` (§`../interfaces.md` §3.2) |
| `selectTab` assumptions | 27 call sites (see §6) | silent no-op today, but a *missing* tab means the UI cannot reveal itself | map `selectTab(root, CHECKS/OUTPUT/REFERENCES/PROPERTIES/…)` onto the shell's "open this region/tab" command |
| Not an observer | `extension-definitions.tsx:33` | stale panel | `MOD`: wrap in `observer()` |
| Electron APIs | `changes/navigation.tsx`, `changes/editor.tsx`, `Output.tsx`, `PE:436-455`, dialogs | web-build behaviour for those panels | verify what they do in the web build today; do not regress |

## 6. `selectTab` call sites the shell must honour

All from `store/navigation.ts:104-150`, `super(…)`, and `project/ui/NavigationComponentFactory.tsx`
⇒ map these to shell commands:

| Target tab | Sites |
|---|---|
| `PROPERTIES_TAB_ID` | `NavigationComponentFactory.tsx:104-150` autorun (auto-open/close the border), `store/index.ts:1315-1318` |
| `VARIABLES_TAB_ID` | `NavigationComponentFactory.tsx:153, 197, 266, 286, 348` |
| `USER_WIDGETS_TAB_ID` / `PAGES_TAB_ID` / `ACTIONS_TAB_ID` | `:184, 189, 212` |
| `BITMAPS_TAB_ID` / `FONTS_TAB_ID` / `STYLES_TAB_ID` / `SCPI_TAB_ID` / `EXTENSION_DEFINITIONS_TAB_ID` | `:221, 239, 257, 248, 230` |
| inner `scpi` / `texts` tabs | `:378, 391, 406, 459, 469` (target the *inner* models — unchanged) |
| `REFERENCES_TAB_ID` | `store/index.ts:509-512` (`findAllReferences`) |
| `CHECKS_TAB_ID` / `OUTPUT_TAB_ID` | `store/index.ts:810-813` (`check`), `:828-831` (failed build), `:850-853` (`buildExtensions`) |
| `DEBUGGER_TAB_ID` | `store/index.ts:1352-1355` (no matching node → already a no-op), `flow/runtime/runtime.ts:248`, `wasm-runtime.tsx:211` |
| editor tab activation | `store/editor.ts:599-602`, `flow/editor/editor.tsx:658`, `viewer.tsx:301`, `Toolbar.tsx:504` |

## 7. Panels that depend on `activeEditor` (the P2.0 spike list)

Hard: `flow-structure` (`PagesNavigation.tsx:82`), `componentsPalette` (`:245`), `watch` (`:687`),
`lvgl-groups` partially (`groups.tsx:382, 396, 425`).
Partial: `variables` (`:31`), `propertiesPanel` (indirect via `navigationStore.propertyGridObjects`,
`store/navigation.ts:505-520`).
Non-panel consumers: `Toolbar.tsx:181,189,513-516`, `timeline.tsx:2551`, `runtime.ts:521`,
`store/index.ts:1277`, `paste-with-dependencies.tsx:821,1294`, `WidgetsPalette`/widgets index `:133`.

`EditorsStore.refresh()` derives `activeEditor` from tab nodes and requires `parentNode.isActive()` **or**
`!this.activeEditor` (`store/editor.ts:358-367`), while `openEditor` sets `activeEditor` directly (`:555`).
That is exactly what the spike must confirm with the root model **unrendered**
(`../phases/p2-lvgl-document.md` §2).

## 8. What must change in EEZ, in one list

| Mark | File | Change |
|---|---|---|
| `MOVED` | `ProjectEditor.tsx:109-295` | extract `factory` → `panelRegistry.ts`; `ProjectEditor` imports it |
| `MOD` | `store/editor.ts` | **only if the spike fails**: additive `selectActiveEditor(editor)` / override path; nothing removed |
| `MOD` | `ProjectEditor.tsx:253-277, 298-455` | re-provide the tab-chrome behaviours (`onRenderTab` badges/labels/close) on the shell's `PanelTab` |
| `MOD` | `store/index.ts:509, 810, 828, 850, 1352` + `NavigationComponentFactory.tsx` | `selectTab(root, …)` → also notify the shell to open the matching region/tab |
| `MOD` | `features/extension-definitions/extension-definitions.tsx:33` | add `observer()` |
| `MOD` | `project-editor/store/layout-models.tsx:404` | bump `version: 129 → 130` if the root model changes at all (discards stale saved layouts, `LM:15-21`) |
| `MOD` | `eez-studio-ui/_stylesheets/app.less` | scope the globals (`../theme-and-css.md` §4) |
| `MOD` | `eez-studio-ui/_stylesheets/vars.less` | point ~33 variables at `var(--eez-*)` (`../theme-and-css.md` §3) |
| `MOD` | `home/main.tsx:183` | optional mount-element argument (default unchanged) |
| `UNCHANGED` | `store/layout-models.tsx` otherwise, all panel components, all inner FlexLayout models, `project-editor/lvgl/svg/**` | D8 |
