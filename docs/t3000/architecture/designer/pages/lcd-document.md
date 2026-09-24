# The LCD/simulator document, area by area (P5)

> **Status: delivered in its simplest useful form.** `documents/lcd/LcdDocument.tsx` hosts the existing
> `Tstat10SimulatorPage` in the shell's canvas slot and gives it the `#page-header-actions` target inside the
> shell's top bar — so the page's **Design ⇄ View toggle renders for the first time** (under `MinimalLayout`
> the portal target did not exist, `:41` below). `/t3000/tstat10-simulator` redirects to
> `/t3000/designer/lcd-ui`.
>
> Measured: `#/t3000/tstat10-simulator` → `#/t3000/designer/lcd-ui`, the designer top bar renders, the toggle is
> present and both modes work (Design: “Widget Toolbox … Label … Header …”; View: “22.4 °C SET 22.00 FAN AUTO /
> Tstat10 Debug …”), no console errors.
>
> Still open from the plan below: the page's three panels are **inside** the canvas (the page owns its layout),
> rather than projected into the shell's regions with `PageTabs` on `RegionSpec.secondary`, and the
> `lcdCommands.ts` shortcuts are not wired to the shell's command bus (which does not exist yet either).

Document kind `lcd-ui`, engine `simulator` — wrapping `features/tstat10-simulator/**` (3.0k lines) as a
Designer document. It is the easiest of the three because it is already a Fluent-`tokens` 3-panel designer.
Source: `pages/Tstat10SimulatorPage.tsx` (`export const Tstat10SimulatorPage: React.FC` at `:180`).

---

## 1. Today's structure — two layouts in one component, switched by mode

`useDesignerState()` (`hooks/useDesignerState.ts:14, 68`) → `mode: 'design' | 'view'`, `setMode`.
The page early-returns one of two trees (`:336` design, `:390` view).

**Design mode — 4 columns, all fixed widths except the canvas:**

| Area | Component | Width / style |
|---|---|---|
| Toolbox | `WidgetToolbox` | `170px`, `flexShrink:0`, `borderRight: 1px colorNeutralStroke2` (`WidgetToolbox.tsx:11-21`) |
| Pages | `PageTabs … vertical` | `140px`, `flexShrink:0`, same border (`PageTabs.tsx:20-30`) |
| Canvas | inline div + `DesignCanvas` | `flex:1; minWidth:0` (`:45`), container `designCenter` = `display:flex; flexDirection:column; alignItems:center; padding:12px; gap:8px; overflowY:auto` (`:45-54`) |
| Properties | `PropertiesPanel` | `240px`, `flexShrink:0`, `borderLeft: 1px colorNeutralStroke2` (`PropertiesPanel.tsx:15-25`) |

**View mode — 3 columns:** left = the bezel + LCD (auto-sized, `flexShrink:0`, `:64`), middle = a fixed
`300px` debug/output panel with borders on both sides (`:73`), right = ops/status, `flex:1; overflowY:auto`
(`:121`). Both side sections use the same "card" recipe (`opsSection :84`, `rpSection :131`):
`padding:10px 12px; border:1px solid colorNeutralStroke2; borderRadius:8px; backgroundColor:colorNeutralBackground2`.

**Canvas auto-scaling precedent:** a `ResizeObserver` on the container computes
`Math.min(h/BEZEL_H, w/BEZEL_W, 1)` clamped to `>= 0.3` (`:190-201`).

**Scroll skin:** `styles/simulator.module.css:4` `.thinScroll`, applied as
`` `${styles.root} ${simStyles.thinScroll}` `` (`WidgetToolbox.tsx:105`); `ToolsPanel.tsx:178` inlines
`scrollbarWidth:'thin'` instead. Two conventions for one thing.

## 2. What the Designer changes

| Today | In the Designer | Mark |
|---|---|---|
| Fixed 170 + 140 + 240 px inside the page | left region `170px` + `RegionSpec.secondary` `140px` (`PageTabs`), right region `240px` | `MOVED` |
| Two hard-coded layouts switched in `render()` | one shell + `useLayout()` returning region content per mode | `MOD` |
| Design/View `ToggleButton` pair portalled into `#page-header-actions` (`:298-302`), rendered at `:330`, `:339`, `:400` | rendered in `top.content` — **this also fixes a live defect**: under `MinimalLayout` the portal target is `null` (`PageHeader` exists only in `MainLayout`), so the toggle does not render at all today (`pages/app-routes.md` §7) | `MOD` + `FIX-OPPORTUNITY` |
| Page-local `useDesignerState` mode | same hook; the shell adds commands `view.toggleMode` so the menu bar / shortcut can flip it | `MOD` (small) |
| `DesignCanvas` fills `flex:1` inside the page | canvas slot; keep `alignItems:center` + `overflowY:auto` in the adapter's canvas wrapper so the auto-scale maths (`:190-201`) still sees a real box | `MOD` |
| `DebugPanel` (`components/DebugPanel.tsx:14`, with a `mobileRoot` variant `:97`) | stays as the document's bottom dock (or `secondary`), collapsed by default | `MOVED` |
| `PageTabs.canvasFooter` (`PageTabs.tsx:96` — grid/coords checkboxes + widget count) | becomes the left region's `footer` (or the status bar items) | `MOVED` |

## 3. Region assignment

| Area | Content |
|---|---|
| TopBar | back · title (`LcdPageRenderer`/page name) · mode toggle (Design ⇄ View) · panel toggles |
| Left (`170px` + secondary `140px`) | `WidgetToolbox` (draggable, `dataTransfer.setData('widgetType', type)` at `WidgetToolbox.tsx:95`) · secondary: `PageTabs vertical` + footer |
| Canvas | design: `DesignCanvas`; view: bezel + LCD |
| Right (`240px`) | design: `PropertiesPanel` (240 px, `section` label + `row` grid); view: the ops/status cards (`:121-…`) |
| Bottom (collapsed) | `DebugPanel` (toggles + live readouts) in view mode |
| StatusBar | page/widget counts, grid + coords (from `PageTabs.canvasFooter`), Saved/Unsaved |

## 4. Files

| Mark | File | Change |
|---|---|---|
| `NEW` | `features/designer/documents/lcd/LcdDocument.tsx` | the adapter (mount = no-op; the page is pure React state) |
| `NEW` | `.../lcd/LcdCanvas.tsx` | `DesignCanvas`/bezel wrapper with the observer intact |
| `NEW` | `.../lcd/lcdCommands.ts` | `view.toggleMode`, page add/delete, undo if available |
| `MOVED` | `features/tstat10-simulator/components/{WidgetToolbox,PageTabs,PropertiesPanel,DebugPanel}.tsx` | unmoved files, imported by the adapter; only their *position* changes (region props instead of page layout) |
| `MOD` | `pages/Tstat10SimulatorPage.tsx` | becomes a thin wrapper that renders the shell with `lcdAdapter` (or is retired and only kept for the legacy route) |
| `MOD` | `App.tsx:505-511`, `routes.ts:305-311` (keep `windowId: 17`), `t3-mobile/layout/SideNavContent.tsx:155` | `/t3000/tstat10-simulator` → redirect to `/t3000/designer/lcd-ui`; register `lcd-ui` |
| `UNCHANGED` | `LcdPageRenderer.tsx` (the renderer + `LcdWidget`/`PageDefinition`/`PageStyles` types), `store`/`hooks` | the document model |

## 5. Verification

Behavioural parity with today's `/t3000/tstat10-simulator`: create/edit a page in both, compare the rendered
LCD (pixel-compare the bezel area), verify drag from the toolbox, property edits, page add/delete, the
auto-scale at several window sizes (including below the `0.3` clamp), and that the mode toggle is now
**visible** (it is not today).
