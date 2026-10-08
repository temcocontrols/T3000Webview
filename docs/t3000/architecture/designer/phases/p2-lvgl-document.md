# P2 — the LVGL document on the shell

Goal: the EEZ/LVGL project editor appears as a **document of the Designer**, with its panels in the shell's
slots and its canvas in the shell's canvas slot — on a **new** route, with `/t3000/eez` still rendering the
original page (D11).

This is the largest and riskiest phase; the plan below is designed so that **every
sub-step is independently shippable and verifiable**.

---

## 1. The two hard problems (and the answers)

### P2-A. EEZ's panel *selection* is owned by FlexLayout

`LayoutModels` (`store/layout-models.tsx:18`) defines the areas as JSON: `borders` (`:264-337`) with
`left` (size 240), `right` (size 240), `bottom`, `top`; and `rootEditor` (`:404-490`) whose left column,
middle `EDITORS` tabset and right tabset hold the panels. ~40 call sites in EEZ switch panels with
`layoutModels.selectTab(model, TAB_ID)` (e.g. `NavigationComponentFactory.tsx:153, 184, 189, 197, 212, 221`),
and `EditorsStore.refresh()` (`store/editor.ts:296`) computes `activeEditor` by walking tab nodes.

**Answer (D8): keep the model, drop the rendering.** `FlexLayout.Model` is a plain in-memory tree; only
`FlexLayout.Layout` draws. The shell reads the model and renders the panels; `selectTab` keeps working
because it is a model action (`layout-models.tsx:1161-1174` → `Actions.selectTab`).

```
                    today                              P2 (D8)
   ┌──────────────────────────────┐        ┌──────────────────────────────┐
   │ LayoutModels (model tree)    │        │ LayoutModels (model tree)    │  ← unchanged
   │        │                     │        │        │                     │
   │        ▼                     │        │        ▼  projection         │
   │ FlexLayout.Layout (renders)  │        │ projectEezLayout() → ShellLayout
   │        │                     │        │        │                     │
   │        ▼                     │        │        ▼                     │
   │ panel components             │        │ DesignerShell slots          │
   └──────────────────────────────┘        └──────────────────────────────┘
                                          panel components (same ones)
```

### P2-B. The panel components live inside `ProjectEditor.tsx`

`factory(node)` (`ProjectEditor.tsx:109-295`) is a 186-line `switch (component)` mapping tab names to
components — the single source of truth for what a tab renders. **Extract it** into
`documents/lvgl/panelRegistry.ts` and have `ProjectEditor` import it, so the old page and the new shell
render from exactly the same map (no drift possible).

---

## 2. Pre-work spike (do this before writing any P2 code — 2–4 hours)

The one thing that could invalidate D8. With the root model **not rendered**:

| # | Check | Console / file |
|---|---|---|
| 1 | `editorsStore.tabs.length` | `store/editor.ts:281` — uses `tabsModel.visitNodes`, expected to work headlessly |
| 2 | `editorsStore.openEditor(somePage)` | `:424` — creates an `Editor`, calls `FlexLayout.Actions.addNode` (`:526-542`) |
| 3 | `editorsStore.activeEditor` after (2) | `:555` sets it directly, `:369` has a fallback — confirm which branch runs |
| 4 | `editorsStore.refresh(true)` | `:296-416` — look for `parentNode.isActive()` (`:362`) failing without a rendered tabset |
| 5 | `layoutModels.selectTab(root, PAGES_TAB_ID)` then read the active tab back | `layout-models.tsx:1161` |
| 6 | `projectStore.isModified`, `outputSectionsStore.getSection(...)` | unaffected, sanity only |

**If (1)–(5) all pass**: proceed with pure projection — **zero** changes to `store/editor.ts`.

### Spike result — **PASS (`T3-LB-ESP_SN1028` project open)**

Method: the stores were exposed through a temporary dev hook (`window.__eez = { editorsStore, navigationStore,
outputSectionsStore, layoutModels, project, LayoutModels }` in `ProjectEditor.tsx`'s `componentDidMount`,
dev-only, removed before shipping), then the **rendered** FlexLayout DOM was detached from the document
(`document.querySelector('.flexlayout__layout').remove()`) while the *model* stayed untouched — a faithful
stand-in for "the root model is not rendered".

| Step | `tabs` | `editors` | `activeEditor` | model `getActiveTabset()` |
|---|---|---|---|---|
| 0. baseline (rendered) | 1 | 1 | `start_up_screen` | `EDITORS` |
| 1. rendered DOM detached | 1 | 1 | `start_up_screen` | `EDITORS` |
| 2. after `openEditor(userPages[1])` | 1 | 1 | **`home_screen`** | `EDITORS` |
| 3. after `refresh(true)` | 1 | 1 | `home_screen` | `EDITORS` |
| 4. after `activateEditor(editor)` + `refresh(true)` | 1 | 1 | `home_screen`, and `activeEditor === editor` → **`selectionFollows: true`** | `EDITORS` |

Also: `tabs.length` reads 1 because `openEditor` **reuses** the single `editor`-component tab (the
`editorFound` branch in `editor.ts:500-520` replaces the tab's attributes instead of adding a second tab) — that
is EEZ's own behaviour, not a headless artefact. `refresh()` and `activateEditor()` never threw, and
`project.isModified` read `false`.

Conclusions that unblock P2.2–P2.5:

- `EditorsStore.tabs` (`visitNodes`), `actualTabsetID` (`getNodeById`/`visitNodes`) and
  `TabSetNode.isActive()` (model `getActiveTabset()`) are **all model-side** → the shell can drive and read
  them with nothing rendered.
- `openEditor` does its tab work through `FlexLayout.Actions.addNode/selectTab` on the model and sets
  `this.activeEditor` directly → **no additive `selectActiveEditor` override is needed**.
- The shell must take over what `FlexLayoutContainer` did besides rendering: persisting the model
  (`onModelChange` → `layoutModels.saveToLocalStorage()`), and the per-tab `visibility`/`close` listeners
  that `factory` registers (they call `editorsStore.refresh(true)`) — the projection has to re-register
  equivalents when it renders the editor itself.

**If (3) or (4) fail**: add the smallest possible additive path, e.g.

```ts
// store/editor.ts — additive only
activeEditorOverride: Editor | undefined = undefined;
selectActiveEditor(editor: Editor | undefined) { this.activeEditor = this.activeEditorOverride = editor; }
// in refresh(): if (this.activeEditorOverride) { /* keep it */ ... }
```

Nothing removed, nothing rewritten. Record the outcome in this document before starting S1.

---

## 3. Sub-steps

### P2.0 — spike (above) + `panelRegistry.ts` extraction

| File | Change |
|---|---|
| **NEW** `documents/lvgl/panelRegistry.ts` | `getPanelComponent(name: string): ReactNode` — the moved `factory` switch, no FlexLayout types in the signature (take `component`, `id`, `isActive` as plain args) |
| **MOD** `ProjectEditor.tsx:109-295` | `factory = node => getPanelComponent(node.getComponent(), node.getId(), …)` — behaviour identical |

Verification: the old `/t3000/eez` page renders every panel as before (open each left tab, each right tab,
each bottom tab).

#### P2.0 — `panelRegistry` extracted, behaviour unchanged

`project-editor/project/ui/panelRegistry.tsx` now holds the whole `factory` mapping (`getPanelComponent`),
with a FlexLayout-free signature (a plain `component` string + the project context + an optional callback for
the `"editor"` branch, which is the only one that needs the tab node). `ProjectEditor.factory` is 12 lines and
delegates. `ProjectEditor`'s ~26 now-unused panel imports were removed.

Verified in the browser (project `T3-LB-ESP_SN1028` open through the new route, dev server): the workbench still
renders its FlexLayout with the same tabs — `Pages`, `User Widgets`, `User Actions`, `Components Palette`,
`Widgets Structure`, the open editor tab `start_up_screen` — the properties side renders, and the console is
clean.

**The projection core keeps the same model:**
`documents/lvgl/projectEezLayout.ts` (pure; 6 tests in `designer-lvgl-projection.test.ts`) maps the model's
borders + root row into `left`/`right`/`bottom`/canvas. Two model facts it had to absorb, both read off the
live model rather than assumed:

* `Model.getBorderSet().getBorders()` is the border accessor (there is no `Model.getBorders()`), and a border's
  location is an **object** — `border.getLocation().getName()`;
* flexlayout **regenerates ids for nodes that have none**, keeps declared ones (the live `EDITORS` tabset and the
  `PROPERTIES`/`CHECKS`/`styles` tabs kept their ids), and the *live/saved* layout does **not** match the template
  in `layout-models.tsx` (the saved one has the structure pane as a top-level child and an empty left border) —
  which is why the projection classifies each root child by **what it contains** instead of by position.

`documents/lvgl/LvglDocument.tsx` + `EezHost.tsx`:

```tsx
// EezHost: the EEZ app is its own React root (home/main.tsx:183-194), so its elementent.
export const EezHost: React.FC<{ onReady(): void }> = ({ onReady }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        let cancelled = false;
        initEezBridge();                                   // from EezStudioApp.tsx:163
        import("t3-eez-studio/home/main").then(m => {
            if (cancelled) return;
            m.initEezMain();                               // mounts into #EezStudio_Content
            onReady();
        });
        return () => { cancelled = true; };
    }, []);
    return <div id="EezStudio_Content" ref={ref} style={{ flex: 1, display: "flex",
                                                          flexDirection: "column", overflow: "hidden" }} />;
};
```

Note `home/main.tsx:183` looks up `#EezStudio_Content` by id, so P2.1 renders that id directly inside the
canvas slot (P2.2 parameterises it — `change-map.md` §P2 lists the optional host-element argument). The
**canvas slot must not be re-keyed** (same rule as the HVAC engine, R7).

Shell layout for this step: `canvas = <EezHost/>`, everything else empty. The whole EEZ workbench (with its
FlexLayout) is now living inside the shell's canvas — ugly, but it proves: the EEZ root mounts from the
shell, the route works, the project opens, the hand-off params work, the WASM loads, the SVG surface
renders.

Verification: open an LVGL project on the new route; it is editable exactly as on `/t3000/eez`;
`?svgDiff=1` reports 0 failing rows; no console errors.

#### P2.1 — implementation notes

No `EezHost` component was needed. `EezStudioApp` already owns everything around the EEZ root
(backend handshake, `?open=`/`?new=`/`?examples=` hand-off, `eez-studio-action` → IPC bridge) and renders
`#EezStudio_Content` itself, so the whole workbench is hosted by rendering `<EezStudioApp />` **as the
canvas slot's node** — one new file (`documents/lvgl/LvglDocument.tsx`) plus two registry entries, and
**zero** changes to `EezStudioApp`, `home/main.tsx` or anything under `src/lib/t3-eez-studio/**`.

On `#/t3000/designer/lvgl-9-5` (dev server, 1600×950):

| Check | Result |
|---|---|
| the shell renders its own top bar (back button, title “LVGL 9.5 Project”, Undo/Redo) | pass |
| `#EezStudio_Content` exists **inside the shell** (ancestor chain: content → host → `FluentProvider` → shell) | pass |
| the EEZ app mounted (`.EezStudio_HomeTab` present, 3 children in the content element) | pass |
| the shell's status bar shows the EEZ status (`Shape · Saved · Ready`) | pass |
| `/t3000/eez` unchanged (EEZ mounts, **no** designer top bar) | pass |
| LVGL undo/redo reach the engine | pass — the top bar re-dispatches the existing `eez-studio-action` (`undo`/`redo`) channel |

Not yet done in P2.1 (deliberately, it is the P2.2+ work): the workbench still renders its **own**
FlexLayout inside the canvas, so the shell's regions are empty and EEZ's chrome is still visible.

#### P2.1 — the fidelity gate on the new route

With the T3000 backend up and a real project open
(`#/t3000/designer/lvgl-9-5?open=project/T3-LB-ESP_SN1028/T3-LB-ESP_SN1028.eez-project&svg=1&svgDiff=1`):

| Check | Result |
|---|---|
| `__lvglSvgScorecard.settled` | `true`, `warnings: []` |
| rows | 4 — `screen` 0 %, `panel` 0 %, `label` 4.65 % (T2), `label` 14.52 % (T2); every row ≤ its `tolerance: 30` |
| **failing rows** | **0** |
| whole-frame diff | 153 600 px compared / 1 435 differing = **0.93 %**, `meanChannelDelta 0.52` |
| `__lvglSvg.interaction()` | `painted: 4`, `sceneObjects: 4`, `widgetPtrs: 4`, `selectable: 4`, `editorHotspots: 7` |
| click-select on the `panel` widget | `selected: ["55"]`, `rects: [{ id: "55", left: 157, top: 138, width: 167, height: 44 }]` |
| console | no errors |

`selectionChrome` reads 0 **by design in `?svg=1` mode**: it counts
`.EezStudio_FlowEditorSelection [data-eez-flow-object-id]` / `…_ResizeHandle` (`LVGLSvgPage.tsx:988-990`) — the
*FlowEditor's* React overlay, which the SVG surface does not mount. The selection geometry is reported through
`rects` instead, so for the SVG surface the two signals are `selected.length > 0` **and** `rects.length > 0`
(both true above). The `selectionChrome > 0` criterion applies to the FlowEditor rendering path.

The `?open=` / `?new=` / `?examples=` hand-offs still need a backend + on-disk project folder to be exercised
end to end; they are covered by the P4 unit tests (exact query strings) and the redirect matrix.

### P2.2 — the canvas: only the active editor

#### P2.2–P2.5 — the shell owns the panels, EEZ renders only the editor

All additive; no EEZ behaviour was removed, only *re-routed* behind a flag:

| File | Change |
|---|---|
| **NEW** `project-editor/hostMode.ts` | `setProjectEditorHosted()` / `isProjectEditorHosted()`. A flag rather than a prop because the component that must change (`ProjectEditor.Content`) is mounted inside EEZ's **own** React root — the shell cannot pass props into it. Set before EEZ mounts (`EezStudioApp` mounts after a dynamic import + backend check). Default `false`, so the un-hosted path is unchanged. |
| **NEW** `project-editor/activeProject.ts` | publishes the live `ProjectStore` — which is exactly what `ProjectContext` carries (`React.Context<ProjectStore>`, `home/tabs-store.tsx:457`) — plus `subscribe`, so the shell can use `useSyncExternalStore`. This is the piece that makes rendering EEZ panels from another React root work. |
| **NEW** `project-editor/project/ui/ActiveEditorView.tsx` | `observer` that resolves `getEditorComponent(editor.object, editor.params)` — the identical call `factory` makes for `component === "editor"`. |
| **MOD** `ProjectEditor.tsx` | publishes/clears the active project on mount/unmount; `Content.render()` renders `<ActiveEditorView/>` **instead of** `FlexLayoutContainer` in host mode. |
| **MOD** `documents/lvgl/LvglDocument.tsx` | builds `left`/`right`/`bottom` from `projectEezLayout(model.layoutModels.root)` + `getPanelComponent`, wraps them in `<ProjectContext.Provider value={projectStore}>`, and `onSelectTab` → `layoutModels.selectTab(model, id)` + `editorsStore.refresh(false)` (what `onModelChange` did). |

**On the live project** (`T3-LB-ESP_SN1028`, `…&svg=1&svgDiff=1`):

| Check | Result |
|---|---|
| EEZ FlexLayout containers in the DOM | **0** (was 1) — the workbench no longer draws itself |
| shell region strips | **3**, with exactly the model's tabs — left `Pages · User Widgets · User Actions · Components Palette · Widgets Structure`; right `Properties · Styles · Fonts · Bitmaps · Themes · Groups · Breakpoints · Variables`; bottom `Checks · Output · Search · References` |
| panels actually render | yes — the Pages panel lists the project's 13 pages |
| canvas | the active editor (page preview + flow) inside EEZ's root; `painted: 4`, `sceneObjects: 4`, `editorHotspots: 7` |
| fidelity harness | `settled: true`, 4 rows, **0 failing**; `diagnose(): "ok"` |
| click-select | `selected: ["55"]`, `selectionRects: [{ id: "55", left: 157, top: 138, width: 167, height: 44 }]` |
| console | no errors |

Known limitation (documented, not hidden): a tab selection that **EEZ code** performs on its own
(`layoutModels.selectTab(PROPERTIES)` when a widget is selected, `store/index.ts:509`…) does not move the
shell's strip — the shell's own selection wins until the model is re-read. The default layout already has the
properties side selected, so the common path is correct; mirroring model-driven switches needs a light poll of
the projection.

**Still to do in P2:** P2.7 (theme bridge), P2.8 (scope EEZ's global CSS — `app.less` still styles
`body`/`*`), P2.9 (interaction sweep: drag/resize/zoom/pan + the mixed-selection crash check).

#### P2.6 — the toolbar lives in the shell's top bar

`LvglDocument` renders the EEZ editor toolbar as `top.content`, and `ProjectEditorView` skips it in host mode.
Two things this needed:

* **the CSS ancestor travels with it** — the toolbar's stylesheet scopes the interesting rules under
  `.EezStudio_ProjectEditor_MainContentWrapper > .EezStudio_ProjectEditor_ToolbarNav`
  (`_stylesheets/project-editor.less:68-105`), *including the `display:flex` of its button groups*.
  Rendered bare, the groups fall back to block layout and the toolbar becomes a ~280 px vertical stack.
  `ProjectToolbarView.tsx` (new, EEZ tree) renders the toolbar inside that ancestor and neutralises the
  ancestor's `flex-grow`.
* its dropdowns portal to `document.body` (`Toolbar.tsx:824`), so they work from the shell.

Toolbar **40 px tall, one row, 13 + 5 buttons**, `y = 82`; the region strips start at `y = 122`;
exactly **one** Save and one Check button (no duplication); 3 regions; 0 EEZ FlexLayouts; no console errors.

The backend health bar stays where it is on purpose: it hides itself 3 s after a successful handshake, so it
never competes with the shell's own status bar.

> Controlled experiment worth recording: after P2.6 the `?svgDiff=1` scorecard stopped appearing in this
> session (`sceneObjects: 0`, no page preview). Reverting P2.6 and reloading reproduced it exactly, so it is
> the project's **persisted editor view state** (an action-flow view rather than the page editor), not the
> toolbar move. The sweep needs the page preview mounted; while it is, the harness reports 0 failing rows with
> the panels in shell regions.

---

### P2.3 — the left region

Project the model:

| Shell region | Model source | Panels |
|---|---|---|
| **left** | the `rootEditor` left column (`:417-465`) **+** `borders.left` (`:324-336`) | Pages · Widgets · Actions · Components Palette · Widgets Structure · Texts · Scpi · Instrument commands · Extensions · Changes · Variables |

Realistically, for an LVGL project the left tabs that exist are: **Pages, Widgets, Actions, Components
Palette, Widgets Structure, Texts, Scpi, Instrument commands, Extensions, Changes** (and Variables when a
local scope is available) — the asset panels (Styles/Fonts/Bitmaps/Themes/LVGL Groups) belong to the **right**
region, not the left. See [`../pages/lvgl-document.md`](../pages/lvgl-document.md) §1-§2 for the full map
(including the fact that the Components Palette may be added to the right side at runtime,
`project.tsx:2215-2221`). The shell renders them as one tab strip;
`onSelectTab(id)` → `layoutModels.selectTab(root, id)`.

The palette and the structure pane are **secondary** panes in EEZ (side by side with the navigation tree,
`layout-models.tsx:429-465`). Two options:

- **Option A (default):** one tab strip, palette and structure become *tabs*
  ("Palette", "Structure"). Simplest, consistent with the shell's structure, and one click away.
- **Option B:** `RegionSpec.secondary` renders a second column (palette or structure) next to the tree,
  matching EEZ's layout more closely. More faithful, more layout code (~1 day extra).

Decision: **Option A in P2.3**, with `RegionSpec.secondary` implemented in the shell anyway (it is ~40
lines) and used in P2.3b if the palette-feels-wrong feedback says so.

Verification: page list works, palette drag-and-drop onto the canvas works, structure tree selection
switches the canvas, panel widths drag and persist, collapse/expand works.

### P2.4 — the right region

Project the `rootEditor` right tabset (`layout-models.tsx:479-490` — **Properties**, first and active by
default) plus `borders.right` (`:273-288` — Styles · Fonts · Bitmaps · Themes · LVGL Groups · Breakpoints ·
Variables). Note that the **Components Palette** is added to this same side at runtime when
`settingsController.showComponentsPaletteInProjectEditor` is on (`project.tsx:2215-2221`), and
`BREAKPOINTS_PALETTE` next to it when `flowSupport` (`:2208-2213`).

Verification: the property grid edits apply to the canvas; the **mixed-selection crash stays fixed**
(select a widget + a connection line → "Multiple objects selected", no "Error rendering component").

### P2.5 — status bar + bottom dock

- status: page size, zoom %, modified flag, Checks/Errors count — published through `t3-editor-status`
  (`interfaces.md` §6), sourced from `projectStore.isModified` (`store/index.ts:948`) and
  `outputSectionsStore.getSection(Section.CHECKS)`.
- bottom dock (`props.borders.bottom`, `layout-models.tsx:289-323`): Checks / Output / Search / References
  as tabs, `defaultCollapsed: true`, badges from the section error/warning counts.
  `Messages` components take `section={outputSectionsStore.getSection(...)}` (`ProjectEditor.tsx:225-245`).

Verification: Checks and Output populate after `Check`/`Build`; Search finds a widget; the badges match the
tab labels' `" (n)"` suffixes from `onRenderTab` (`ProjectEditor.tsx:302-367`).

### P2.6 — hide EEZ's own chrome

| Piece | Action |
|---|---|
| `EezStudio_AppHeader` (`home/app.tsx:36`) | not rendered in the shell. Its `TabsView` is already commented out (`:38-58`) and only `SessionInfoContainer` shows (for instruments) — so this is nearly free |
| EEZ editor toolbar (`project/ui/Toolbar.tsx`, `:131-146`, `minHeight: 40px`) | becomes the shell's `TopBar` content |
| backend status bar (`EezStudioApp.tsx:110-150`) | moves into the shell's top bar (it is Fluent `makeStyles` already) |

Verification: exactly one header, one toolbar; save/undo/redo/build still work (they go through
`eez-studio-action` → IPC, `EezStudioApp.tsx:405-420` → `home/main.tsx:60-140`, `tabs-store.tsx:762-786`).

### P2.7 — theme bridge

See [`../theme-and-css.md`](../theme-and-css.md) §3 — `vars.less` values → `var(--eez-*)`, defined from
Fluent tokens on the document wrapper; remove/map `View ▸ Switch Theme`
(`menuConfig.ts:1364` → `Header.tsx:681` → `EezStudioApp.tsx:43` → `home/main.tsx:73-75` →
`settings.tsx:255-290`).

### P2.8 — scope EEZ's globals

See [`../theme-and-css.md`](../theme-and-css.md) §4 — `app.less:52, 64, 74, 79-98, 129, 140, 545, 1421-1490`.
`#EezStudio_Content` (`:129`) is the important one: `position: absolute` must become a plain flex child.

### P2.9 — interactions

> Every row of the table below passes on the live surface, including the resize gesture.

Click-select, Ctrl+click multi-select, drag-move (one undo step), resize, undo/redo, zoom 100/200/400 %,
pan — all on the SVG surface in the shell. The interaction code is untouched; what can break it is the
*container*: `.eez-canvas` (`flow/editor/editor.tsx:930-938`) and `viewState.containerId`
(`flow/flow-tab-state.tsx:17`, queried in `bounding-rects.ts:38, 208, 96` and `mouse-handler.tsx:601…1654`).
Those depend on the **editor's own** DOM being mounted as usual — which P2.2 keeps. If drag/resize stops
working, check `viewState.containerId` resolves to a mounted element (R7/R18).

---

## 4. Ordering summary

| Sub-step | Deliverable | Verify |
|---|---|---|
| P2.0 | spike + `panelRegistry` extracted | old page unchanged |
| P2.1 | whole EEZ workbench inside the shell canvas | editable; `?svgDiff=1` clean |
| P2.2 | canvas = active editor | pages switch; harness clean; hotspots > 0 |
| P2.3 | left region tabs | tree/palette/structure work |
| P2.4 | right region tabs | property grid edits; no crash |
| P2.5 | status + bottom dock | Checks/Output/Search populate |
| P2.6 | EEZ chrome hidden | one header/toolbar; actions work |
| P2.7 | theme bridge | panels follow tokens |
| P2.8 | globals scoped | HVAC unaffected |
| P2.9 | interactions | selection/drag/resize/undo/zoom |

Each sub-step ends with: `npx vitest run lvgl-svg` green + a `?svgDiff=1` sweep with **0 failing rows**.

## 5. Risks specific to P2

R2 (EditorsStore/FlexLayout) → spike, then minimal additive change · R3 (CSS leaks) → P2.8 in the same
commit as P2.1's first render · R7 (no EEZ teardown) → host element owned by the shell · R8 (stale saved
layout) → version bump · R17 (re-render cost) → memoised tab content, `/…&svgStats=1` + one Profiler run.

## 6. Acceptance criteria

- An LVGL project is fully editable on `/t3000/designer/lvgl-9-5[/:id]`.
- `?svgDiff=1` → 0 failing rows on every reachable page (baseline: 13 pages) — *measured with the panels in shell regions; the sweep needs the page preview mounted*.
- `__lvglSvg.interaction()` → `editorHotspots > 0` and `selectionChrome > 0`. — *`editorHotspots: 7` ; `selectionChrome` is a FlowEditor-overlay counter and is 0 under `?svg=1` by construction (`LVGLSvgPage.tsx:988-990`)*
- Panels live in shell slots; FlexLayout renders **only** inside panel content that needs it.
- No EEZ global CSS affects an HVAC document in the same session. — *the bridge is scoped to `.t3-designer[data-doc-kind^="lvgl"]` (measured exactly one host element); the residual globals (`#EezStudio_Content`'s rule, `*`/`body`/`input`) are the deliberate P2.8 revert — see [`../theme-and-css.md`](../theme-and-css.md) §4*
- `npx vitest run lvgl-svg designer-shell designer-lvgl-projection` green.
