# Unified Designer — design set

The designer is one editor at `/t3000/designer/...` serving four document kinds — HVAC schematic, LVGL 9-5,
LVGL flow 9-5 and the LCD simulator. [`change-map.md`](./change-map.md) lists the files behind each part.

The goal: **one editor** (`/t3000/designer/...`) used for every design document type. Same five areas for
all of them (top / left / canvas / right / status, plus an optional bottom dock); the *content* of each
area comes from the document type. Fluent UI + T3000 tokens are the theme for the chrome.

Read in this order:

| # | Document | What it answers |
|---|---|---|
| 1 | [`README.md`](./README.md) (this file) | decisions, parts of the feature, map of the doc set |
| 2 | [`design.md`](./design.md) | current state, target architecture, choices and why |
| 3 | [`interfaces.md`](./interfaces.md) | the contracts: `DocumentAdapter`, region/tab specs, commands, viewport, status |
| 4 | [`change-map.md`](./change-map.md) | **every file** added / modified / left alone, per phase |
| 5 | [`theme-and-css.md`](./theme-and-css.md) | token usage, the EEZ→Fluent variable bridge, CSS scoping |

And the **page-by-page** design, which answers "what exactly changes on each screen":

| # | Document | Covers |
|---|---|---|
| 6 | [`pages/README.md`](./pages/README.md) | index + the three cross-cutting findings |
| 7 | [`pages/app-routes.md`](./pages/app-routes.md) | all **43 routes** with an impact verdict, the chrome each layout gives, portals, the 30 entry points |
| 8 | [`pages/designer-shell-areas.md`](./pages/designer-shell-areas.md) | the shell's 6 areas + 9 states, area by area |
| 9 | [`pages/hvac-document.md`](./pages/hvac-document.md) | 7 HVAC panels + the **verified** engine property surface + the inspector (§6.2), its Data section (§6.3) and the Link Entry data source (§6.4) |
| 10 | [`pages/lvgl-document.md`](./pages/lvgl-document.md) | all **30 EEZ panels** + 11 editor types + the hazard list |
| 11 | [`pages/lcd-document.md`](./pages/lcd-document.md) | the simulator document (P5) |
| 12 | [`pages/design-hub.md`](./pages/design-hub.md) | the Hub pages and its 11 dialogs — where every designer URL comes from |

---

## 1. Decisions

### 1a. Fixed decisions

| # | Decision |
|---|---|
| D1 | **One editor**, not two that look alike — a single route, a single shell component, one set of areas |
| D2 | Same **structure** everywhere: top / left / canvas / right / status. Content per document type |
| D3 | **No document tabs.** One document is open at a time |
| D4 | **No split view** — never two documents side by side |
| D5 | Theme authority is **T3000 Fluent tokens**; Fluent UI is the one library for the chrome |
| D6 | New route **`/t3000/designer/:kind/:id?`**; the old routes redirect and keep every link working |
| D7 | Engines are **hosted, never merged** — `lib/t3-hvac` (127k lines) and `t3-eez-studio` (280k lines) keep their document models |

### 1b. Values chosen by this design

| # | Decision | Why |
|---|---|---|
| **D8** | **Keep FlexLayout's *model*, drop FlexLayout's *rendering*.** The EEZ workbench keeps `LayoutModels` (a headless JSON/model tree) as the source of truth for *which panel is selected*; the shell renders those panels. | `LayoutModels.selectTab(model, tabId)` (`store/layout-models.tsx:1161`) is called from ~40 places in EEZ, and `EditorsStore.refresh()` (`store/editor.ts:296`) derives `activeEditor` by walking FlexLayout tab nodes. Rendering the shell ourselves while keeping the model means **none** of that code changes. Replacing the model would be a 40-site rewrite. |
| **D9** | **Regions are tab containers, not single components.** A side panel is `{ tabs, activeTabId, onSelectTab }`. | An EEZ side really is a tab set — and **not** the obvious one: the left area is the `rootEditor` left column (Pages · Widgets · Actions · Components Palette · Widgets Structure) *plus* the left border (Texts · Scpi · Instrument commands · Extensions · Changes), and the right area is the `rootEditor` right tabset (Properties) *plus* the right border (Styles · Fonts · Bitmaps · Themes · LVGL Groups · Breakpoints · Variables). A one-component-per-area shell could not host that. Full map: [`pages/lvgl-document.md`](./pages/lvgl-document.md) §1-2 |
| **D10** | **The new route is additive from P1.** `/t3000/designer/...` exists next to the old routes while P1–P3 are built; **P4** turns the old ones into redirects. | The same document can be rendered by both shells while P1-P3 are built, which is how "behaviour unchanged" is verified. Nothing breaks mid-project. |
| **D11** | **P2 renders the LVGL document under the new route in parallel**, not by rewriting `/t3000/eez`. | Same reason as D10, and it keeps the fidelity harness usable on both. |
| **D12** | HVAC's right-hand inspector starts **read-only** (P1), editing arrives in P1b with a verified undo path. | The existing `PropertiesPanel` writes to a Zustand store the engine never reads (`store/designerStore.ts` vs `T3Gv.stdObj`). Making it *edit* the document needs engine mutation + undo + repaint, which must be verified against the real APIs — a separate, well-scoped step. |

## 2. Parts of the feature

The parts are independent: the shell is generic, and a document contributes only its adapter.

| Part | What it adds |
|---|---|
| **P0** | this document set |
| **P1** | `DesignerShell` + the HVAC document on a new route; the old route keeps rendering the legacy page |
| **P1b** | HVAC property editing through one mutation funnel (`engineMutation.ts`) + Undo/Redo in the shell's top bar |
| **P2** | the LVGL document: its panels are projected out of the headless `LayoutModels` tree, plus the theme bridge and its CSS scoping |
| **P3** | HVAC container ids supplied by the shell instead of hard-coded literals |
| **P4** | route consolidation — the old designer URLs become redirects |
| **P5** | shared command bus + viewport controls, LCD panels in shell regions, shell keyboard shortcuts |

Two constraints that shape the parts:

- **The HVAC engine's history has no per-operation fidelity.** Several states are pushed per operation and the
  pushed records alias the live `Data` (`StateBase` hardcodes `IsOpen = false`), so undo can need repeated
  presses before anything moves. The legacy page behaves identically.
- **The LVGL document is the only one with an automated regression net** (`?svgDiff=1` plus the `lvgl-svg`
  vitest suites). The HVAC gate is the A/B comparator in [`design.md`](./design.md) §11.

## 3. The shape, in one screen

```
/t3000/designer/:kind/:id?                 one route, one document
         │
         ├── DesignerShell                 ── the ONLY layout component (Fluent tokens)
         │      TopBar      │ LeftRegion (tabs) │ CanvasHost │ RightRegion (tabs) │ StatusBar
         │                                                        BottomDock (tabs, collapsed)
         │
         └── useDocument(kind, id)         → a DocumentAdapter
                 hvac-schematic   engine: hvac       (P1)
                 lvgl-9-5         engine: eez        (P2)
                 lvgl-flow-9-5    engine: eez        (P2)
                 lcd-ui           engine: simulator  (P5)
```

The shell knows no engine. The adapter knows one engine. See [`interfaces.md`](./interfaces.md).

The two engines are 407k lines; this is a shell around them, not a rewrite (D7).
