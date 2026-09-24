# The Designer shell — area-by-area design

Six areas + nine states. This is the `NEW` work of P1 ([`../phases/p1-shell-hvac.md`](../phases/p1-shell-hvac.md));
every later phase plugs into it.

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ TopBar            back · title · [commands] · [panel toggles] · adapter toolbar│  40 px
├──────────────┬────────────────────────────────────────────┬───────────────────┤
│ LeftRegion   │ CanvasHost                                 │ RightRegion       │
│ tabs + body  │ (the ONLY engine DOM)                      │ tabs + body       │
│ 115–260 px   │ flex:1, minWidth:0                         │ 240–280 px        │
│ [secondary]  │                                            │                   │
├──────────────┴────────────────────────────────────────────┴───────────────────┤
│ BottomDock (collapsed by default): Checks · Output · Search · References       │  0–240 px
├───────────────────────────────────────────────────────────────────────────────┤
│ StatusBar         name · coords/size · zoom · Saved/Unsaved · message · counts │  24 px
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. `TopBar` — `NEW` `components/ShellTopBar.tsx`

| Element | Source | Notes |
|---|---|---|
| Back button | shell | → `/t3000/design` (Design Hub). Replaces `onNavigateBack` → `/t3000` in `HvacDesignerPage.tsx:195` |
| Document title | `adapter.describe().title` | HVAC: `designerStore.drawingName` (`designerStore.ts:48`); LVGL: `projectStore.title` (`store/index.ts:555-573`). Never `document.title` — nothing sets it app-wide |
| Modified dot | `describe().modified` | HVAC `T3Gv.opt.header.DocIsDirty` (`HeaderInfo.ts:83`); LVGL `projectStore.isModified` (`store/index.ts:948`) |
| `ShellCommandBar` | command registry | P1–P4: only `undo/redo/save/zoom*` so menus/shortcuts can reach them; P5 renders the whole strip from it |
| Panel toggles | layout store | left / right / bottom; replaces HVAC's single `onToggleLeftPanel` (`HvacDesignerPage.tsx:96, 193-196`) |
| Adapter toolbar | `layout.top.content` | HVAC → `TopToolbar` (60 px); LVGL → EEZ `Toolbar` (40 px) + backend status; LCD → Design/View toggles |

**Sizing:** the bar is 40 px; an adapter toolbar keeps its own height (60/40 px) and is stacked inside the
slot, so the top area is `40 + adapterHeight`.
**Token rule:** `tokens.colorNeutralBackground1/2/3`, `colorNeutralStroke2`, `colorNeutralForeground1/2`,
`colorBrandForeground1` only — no literals (`../theme-and-css.md` §2).
**Do not portal** into `#page-header-actions` (absent under `MinimalLayout`, see
[`app-routes.md`](./app-routes.md) §7).

## 2. `LeftRegion` / `RightRegion` — `NEW` `components/RegionPanel.tsx`

Behaviour matrix:

| Case | Renders |
|---|---|
| **0 tabs** | the region is not rendered at all (and its splitter disappears) |
| **1 tab** | a plain **header** (label + collapse chevron + optional footer) — this is what keeps the HVAC document looking exactly like today |
| **≥2 tabs** | header row **plus** a tab strip; the active tab's content below |
| `secondary` present | a second column (drag-resizable) next to the tab body — used by the LCD document (`PageTabs`) and available to the LVGL palette/structure if option B is chosen |
| `collapsible:false` | no chevron, no toggle from the top bar |
| `badge()` returns a number | a count chip on the tab (Checks/Output/Search/References) |

Content is memoised per `tab.id` so switching tabs does not unmount the others' trees more than necessary
(R17). Widths/collapse/active-tab persist per **document kind** in `localStorage["t3.designer.layout"]`
(Q5). Splitters reuse the repo recipe (`MainLayout.tsx:56-63` style, `:142-172` drag math, including the
`document.body.style.cursor/userSelect` guards at `:246-275`).

**Region assignment per kind** — the authority for what each document puts where:

| Area | `hvac-schematic` | `lvgl-9-5` / `lvgl-flow-9-5` | `lcd-ui` (P5) |
|---|---|---|---|
| TopBar adapter content | `TopToolbar` (60 px, 7 groups) | EEZ `Toolbar` + backend status (40 px) | Design/View `ToggleButton` pair |
| Left | **1 tab**: `ToolsPanel`, 115 px | **tabs**: Pages · Widgets · Actions · Components Palette · Widgets Structure · Texts · Scpi · Instrument commands · Extensions · Changes · Variables, 240 px | **1 tab**: `WidgetToolbox`, 170 px + `secondary` = `PageTabs` 140 px |
| Canvas | HVAC SVG area + 3 rulers + `#document-area` | the active EEZ editor (page SVG surface / font / settings / …) | `DesignCanvas` (design) or bezel+LCD (view) |
| Right | **1 tab**: engine property inspector, 260 px | **tabs**: Properties · Styles · Fonts · Bitmaps · Themes · LVGL Groups · Breakpoints · Variables, 240 px | **1 tab**: `PropertiesPanel`, 240 px |
| Bottom | — | **tabs**: Checks · Output · Search · References, collapsed | — (Debug panel in view mode) |
| StatusBar | name · coords · zoom · Saved/Unsaved · message | page size · zoom · modified · error/warning counts | widget count · grid/coords |

## 3. `CanvasHost` — the one area an engine owns

* Element is created once per document and **never re-keyed** (R1: the HVAC engine cannot be re-initialised;
  R7: the EEZ root is its own React root).
* Resize → `ResizeObserver` → debounced (100 ms) `adapter.onCanvasResize?.()`; HVAC maps it to
  `T3Gv.docUtil.HandleResizeEvent()` (`DocUtil.ts:659`), replacing today's two fixed `setTimeout` refreshes
  (`HvacDesignerPage.tsx:109-121`) and the collapse-triggered one (`:149-160`).
* `position: relative`, `overflow: hidden`, `flex:1`, `minWidth:0`, `minHeight:0`;
  background `tokens.colorNeutralBackground3`.
* HVAC needs its ids to exist **before** `mount()` (`InitializeWorkArea` throws when the selector does not
  resolve — `DocUtil.ts:197-205`): the canvas renders its markup, then the adapter mounts.

## 4. `StatusBar` — `NEW` `ShellStatusBar.tsx` on top of the existing `EditorStatusBar`

**Reuse** `features/design-hub/components/EditorStatusBar.tsx` (24 px). It already renders
`name | coords | zoom% | spacer | Saved/Unsaved | message` and already listens to the shared window event
(`:37-49`).

| Change | Detail |
|---|---|
| `MOD` `useEditorCommands.emitEditorStatus` (`:24-32`) | **nothing dispatches `t3-editor-status` anywhere today** — only its definition, the barrel, and a doc mention. The shell's adapters become the first producers |
| `FIX-OPPORTUNITY` in `EditorStatusBar.tsx` | `zoom` can never be cleared back to `null` by an event (`detail.zoom ?? s.zoom`, `:44`) — once set, the `%` chip is permanent. Fix to `detail.zoom === undefined ? s.zoom : detail.zoom` |
| HVAC publisher | a small adapter poller converts the engine's module-level scalars into events (see [`hvac-document.md`](./hvac-document.md) §4). Today the page passes props from `useStatusMessage()` instead |
| LVGL publisher | page size, zoom, `isModified`, Checks/Output counts |
| Shell items | document kind, and (LVGL) the backend health chip moved from `EezStudioApp.tsx:110-150` |

## 5. `BottomDock` — `NEW` `components/ShellBottomDock.tsx`

Collapsed by default; height drag; the tab strip carries badges. HVAC registers none (so the dock is absent
and the canvas keeps the full height). LVGL registers the four EEZ sections, whose content components are
`Messages section={outputSectionsStore.getSection(Section.X)}` and `SearchPanel` / `ReferencesPanel`.
`FIX-OPPORTUNITY`: `Messages.ensureSelectionVisible()` calls `scrollIntoView` on every update
(`ui-components/Output.tsx:118-136`) — inside a dock it can scroll ancestor containers, so the dock body must
be its own scroll container.

## 6. States — all nine

| State | Where it shows | Spec |
|---|---|---|
| **Loading (route)** | `DesignerPage` Suspense fallback | keep the existing pattern (`Spinner` + "Loading …", `App.tsx:492-503` style) |
| **Loading (document)** | inside the canvas slot | adapter-supplied; HVAC `useDrawing().isLoading` spinner (`HvacDesignerPage.tsx:173-179`), LVGL: backend + project open |
| **Error (document)** | canvas slot, full-area | adapter-supplied error + Retry + "Back to Design Hub"; HVAC error page (`:181-187`), LVGL backend-unreachable panel (`EezStudioApp.tsx:425-483`) |
| **Unknown kind** | whole page | **`NEW` and required**: the app has no catch-all route (`App.tsx:620` is a comment), so the shell renders the valid kinds as links + a Hub link (R6) |
| **Unknown document id** | canvas slot | "This drawing/project no longer exists" + back link |
| **Panel empty** | region body | adapter supplies (`No selection`, `Multiple objects selected`, `No page selected`, empty tree) |
| **No selection** | right region + status | HVAC: name falls back to `'Shape'` and coords go blank (`EditorStatusBar.tsx:65`, `useStatusMessage.ts:7-10`); LVGL: "Nothing selected" (`PropertiesPanel.tsx:102-120`) |
| **Multi-selection** | right region | HVAC: today the engine reports only the *target* object (`SelectUtil.ts:194-212` — no count anywhere). The new inspector adds a count + shared-fields-only view. LVGL: already "Multiple objects selected" |
| **Unsaved changes** | status bar | chip only; no navigation guard (Q6) |
| **Engine loading/failed (LVGL WASM)** | canvas slot | `SvgPaintFailure` reasons are already surfaced by the SVG surface (`page-runtime-svg.ts`); the shell just gives it a box |

## 7. Dialogs the shell owns

| Dialog | Trigger | Note |
|---|---|---|
| Reset panels | top-bar overflow menu | widths/collapse/active tabs back to defaults; for LVGL also calls `LayoutModels.reset()` (`layout-models.tsx:1185`) |
| About / shortcut help | top-bar overflow | optional |

Everything else (New drawing, Import, Templates, Create LVGL, Examples) stays in the Design Hub —
see [`design-hub.md`](./design-hub.md). Q3 default: the Designer does not own creation dialogs.

## 8. What changes in P1 vs today, in one list

| # | Change | Risk |
|---|---|---|
| 1 | `NEW` six shell components + layout store + 2 hooks | low |
| 2 | `MOVED` the layout styles out of `HvacDesignerPage.tsx` (`mainApp/mainPanel/mainArea/leftPanel/drawingArea`, `:27-83`) into the shell, literals → tokens | low |
| 3 | `MOD` canvas layout: `ResizeObserver` replaces the two `setTimeout` refreshes and the collapse-triggered one | medium — verify the first-frame centring; keep one `rAF` retry, and a +150 ms retry only if needed |
| 4 | `MOD` mount-once guard + stable canvas element | high if wrong (R1) — covered by a dedicated unit test |
| 5 | `NEW` right region for HVAC (the fourth area does not exist today) | medium — the engine has no event bus (R9), so it polls; see [`hvac-document.md`](./hvac-document.md) §6 |
| 6 | `MOD` status bar becomes event-driven | low; fix the `zoom` sticky bug at the same time |
| 7 | `MOD` menu set resolved by document kind, branch ordered before `/t3000/design` | low but 100 % visible if missed (R4) |
| 8 | `NEW` unknown-kind / unknown-id states | low |
| 9 | `NEW` `designer-shell.test.ts` (incl. the no-engine-import guard) | — |
