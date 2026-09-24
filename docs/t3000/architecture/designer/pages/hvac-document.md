# The HVAC document, panel by panel

Document kind `hvac-schematic`, engine `hvac` (`src/lib/t3-hvac`). Hosted by
`documents/hvac/HvacDocument.tsx`; items are (1) what exists today, (2) what the Designer does with it,
(3) what must change. Facts are line-accurate.

Today's composition is one 222-line component: `HvacDesignerPage.tsx:189-222` →
`TopToolbar` → [ `ToolsPanel` | `HvacDrawingArea` + `EditorStatusBar` ] + `T3ContextMenu`.

---

## 1. `TopToolbar` — `MOVED` into `layout.top.content`

**Structure correction:** it is **one 60 px flex row** (`:66-93`, `height:'60px'` at `:72`,
`backgroundColor:'#f5f5f5'` at `:69`, `borderBottom:'1px solid #e1e1e1'` at `:73`), not two rows. The only
two-row element is the 115 px `leftSection` (`:133`, `:142`) that sits above the tools panel and holds
`T3 Hvac` · collapse button · `v1.0` · back button (`:338-358`).

| Group | Buttons | Engine calls |
|---|---|---|
| 1 Selection (`:362-379`) | Select, Lock, Select All, Unlock | `toolOpt.SelectAct`, `LibLockAct(false)`, `SelectAllObjects()`, `LibUnlockAct(false)` |
| 2 Clipboard (`:384-409`) | Cut, Copy, Duplicate, Paste, Delete, **Insert** | `CutAct/CopyAct`, `DuplicateAct`, `PasteAct`, `DeleteAct(evt)`; **`handleInsert:330-332` is an empty no-op** |
| 3 History & Save (`:414-431`) | Undo, **Save**, Redo, Clear | `UndoAct`, `SaveAct()` (`:239`), `RedoAct`, `ClearAct()` |
| 4 Transform (`:436-503`) | Rotate (4), Align (6), Flip (2), Make same (3) | `RotateAct`, `ShapeAlignAct(type)`, `ShapeFlip*Act`, `MakeSameSizeAct` |
| 5 Arrange (`:510-525`) | Group, Bring to Front, Ungroup, Send to Back | `GroupAct`, `ShapeBringToFrontAct`, `UnGroupAct`, `ShapeSendToBackAct` |
| 6 Library (`:532-539`) | Add to Library, Load Library | `AddToLibraryAct()`, `LoadLibraryAct()` |
| 7 View & Zoom (`:545-598`) | Background (4 colours), Rulers, Grid, zoom −/input/+, Reset Zoom | `LibSetBackgroundColorAct(color)`; `dc.showRulers = !dc.showRulers; UpdateRulerVisibility(); DataOpt.SaveToLocalStorage()` (`:203-211`); same for grid (`:212-220`); `SetZoomLevel(pct)` / `ResetScaleAct` |

**Poller:** `setInterval(…, 300)` (`:192-200`) reads `T3Gv.docUtil.GetZoomFactor()` (a **ratio**) into
`zoomValue` via `getZoomPct` (`:184`), and `T3Gv.docUtil.docConfig.showRulers/showGrid`. Note the unit trap:
`GetZoomFactor()` is a ratio (`DocUtil.ts:907`) while `SetZoomLevel()` takes a **percent**
(`DocUtil.ts:2519`).

### Changes

| Mark | Change |
|---|---|
| `MOD` | Accept a `title`/`compact` prop so the shell owns the back button and the panel toggles; keep the drawing groups and the 300 ms poll untouched |
| `MOD` | Replace the literals (`#f5f5f5`, `#e1e1e1`, `#c1c1c1`, `#323130`, `#ccc`) with `tokens.*` |
| `MOD` | Replace `document.getElementById('svg-area')` in `ToolsPanel.tsx:45-47` (see §2) |
| `FIX-OPPORTUNITY` | **Insert** is a silent no-op (`:330-332`, `:405`) — either implement or disable it |
| `FIX-OPPORTUNITY` | The poller runs forever; the shell's single `useEnginePoll` (paused when `document.hidden`) should replace it |
| P5 | Its undo/redo/save/zoom controls become commands in the shared command bus; the rest stays |

## 2. `ToolsPanel` — `MOVED` into the **left** region (1 tab, 115 px)

* **Categories** come from `toolsCategories` (`@/lib/t3-hvac` barrel → `Data/T3Data.ts:1802-1810`):
  `Basic · General · Pipe · NewDuct · Duct · Room · Metrics`. Initial open set `['Basic','General','Pipe','Duct','Room','Metrics','User']`
  (`:242`) — `'NewDuct'` is closed by default and `'User'` has **no `AccordionItem`**, so the "User / + /
  Coming soon" branches (`:305-322`) are unreachable today.
* **Tools** come from `NewTool` (`Data/T3Data.ts:693-…`), grouped by `tool.cat.includes(cat)` (`:248-250`).
  Counts: Basic 6, General 9, Duct 12 (+Temperature shared with Pipe), Pipe 5, NewDuct 8, Room 3, Metrics 4,
  one uncategorised (`Weld`).
* **Activation:** `handleToolClick` (`:257-263`) → `handleToolActivate` (`:40`) sets
  `selectedTool.value` then switches on the name (`:55-119`) calling
  `toolOpt.SelectAct / ToolLineAct('line'|'segLine') / DrawWall / StampShapeFromToolAct(se,2,'Box') /
  StampShapeFromToolAct(se,9,'G_Circle') / StampShapeFromToolAct(se,'textLabel','Text') / LibToolShape(name,true) / ClickSymbolAct`.
  **`Gauge`, `Dial`, `Value`, `Icon`, `Weld` are explicit no-ops** (`:109-111`) — a `FIX-OPPORTUNITY` (either
  wire them or hide them).
* **Layout:** 2-column grid (`:210-215`), 40 px buttons. Accordion overrides at `:193-208`
  (`.fui-AccordionHeader {minHeight:24px;fontSize:11px}`, `.fui-AccordionPanel {padding:0!important;background:#f9f9f9}`).
* **The container-id coupling:** `:44-53` builds a synthetic event from
  `document.getElementById('svg-area')` + `getBoundingClientRect()` to fake a canvas-centre click, falling
  back to `(400, 300)`.

### Changes

| Mark | Change |
|---|---|
| `MOD` | Take the canvas element (or a `canvasRef`) from the shell instead of `getElementById('svg-area')`; this is the one React-side container reference, and P3's per-mount ids make the literal wrong |
| `MOD` | Colours → tokens (`#fafafa` → `colorNeutralBackground2`, `#f9f9f9`, `#e1e1e1`, the 6 px scrollbar skin) |
| `MOD` | `backgroundColor: selected ? 'rgba(0,120,212,0.2)'` (`:297`) → a token-based highlight |
| `FIX-OPPORTUNITY` | The `'User'` category never renders; `NewDuct` never opens by default — decide and make it explicit |
| `UNCHANGED` | Every engine call, the category/tool data source, the 2-column grid, the accordion semantics |

## 3. Canvas — `MOVED` into `HvacCanvas.tsx` inside the shell's canvas slot

DOM (today, `HvacDrawingArea.tsx:74-95`) — this is the contract the engine depends on:

```
div#document-area   (styles.documentArea)          position:relative; 100%x100%; background #f5f5f5
├── div#c-ruler     (styles.rulerCorner)           20x20 at 0,0       #e1e1e1, border-right/bottom #d0d0d0
├── div#h-ruler     (styles.rulerHorizontal)       left:20px; top:0; h:20px
├── div#v-ruler     (styles.rulerVertical)         left:0; top:20px; w:20px
└── div#svg-area    (styles.svgArea)               inset 20px; overflow:auto; background #ffffff;
                                                   border 1px #e1e1e1; user-select:none; tabIndex=0
    └── (empty — the engine creates the <svg>, layers and Hammer bindings in UIUtil.ts:379)
```

`onMouseMove` (`:29-68`) is *React-side* interactive drawing (used only for the "continues object" tools
Duct/Wall/Int_Ext_Wall — `continuesObjectTypes`, `RefConstant.ts:55`): it computes page coords from
`getBoundingClientRect()` + `1 / appState.viewportTransform.scale`, snaps the angle to 5° with Ctrl, and
writes `rotate` / `width` on the active item. Its repaint call is still a `TODO` (`:63-64`).

### Changes

| Mark | Change |
|---|---|
| `MOD` | Extract to `HvacCanvas.tsx` with an `ids` prop; **P1 keeps the literals**, P3 supplies per-mount ids |
| `MOD` | Colours → tokens (`#f5f5f5`, `#e1e1e1`, `#d0d0d0`, `#ffffff`, scrollbar skin) |
| `MOD` | 20 px ruler geometry: keep it (the engine positions its own content against these offsets) |
| `MOD` | Notify resize through the shell's `ResizeObserver` instead of the page's `setTimeout` refreshes |
| `FIX-OPPORTUNITY` | The `TODO` at `:63-64` (no repaint after the size/rotate write) |
| `UNCHANGED` | The engine's own binding (`UIUtil.InitT3GvOpt`), the Hammer gestures, ruler/grid rendering, zoom/pan maths |

### 3.1 The ids the engine requires (found during the P1 build)

The engine resolves eight ids by name. Four are its drawing surfaces (configurable through
`InitializeWorkArea`), but **three are captured directly during init and used as Hammer.js hosts**
(`UIUtil.ts:401-403`):

| id | Read by | Symptom when missing |
|---|---|---|
| `#main-app` | `UIUtil.ts:401` → `T3Gv.opt.mainAppElement` | **stamping a shape throws** `Cannot read properties of null (reading 'addEventListener')` from `T3Hammer.on`, via `DrawUtil.PreDropOrStamp` |
| `#svg-area` | `UIUtil.ts:402` → `T3Gv.opt.workAreaElement` | same |
| `#document-area` | `UIUtil.ts:403` → `T3Gv.opt.documentElement` | same |
| `#left-panel` | `HvConstant.DocumentAreaModel.LEFT_PANEL_ID` (`HvConstant.ts:35`) | no crash today (`Page/P.Main.ts` is dead code) — kept for fidelity |
| `#work-area` | `HvConstant.DocumentAreaModel.WORK_AREA_ID` (`HvConstant.ts:37`) | no crash today — kept for fidelity |
| `#c-ruler` / `#h-ruler` / `#v-ruler` | ruler setup + scroll sync (`DocUtil.ts:1237-1239`, `IdxPage.ts:311-312`) | rulers do not render / do not sync |

Consequence for the shell: the HVAC document wraps its slots so that all of these exist:
`#main-app` around the whole document, `#left-panel` around the tools content, `#work-area` around the
canvas column, and `#document-area`/rulers inside the canvas. They live in one module
(`documents/hvac/hvacAreaIds.ts`) precisely so P3 can replace them with per-mount ids in a single place.

## 4. Status bar — wired to the existing event contract

Pipeline today (three layers, all polling):

1. **Engine writes module-level `let`s** — `RefConstant.ts:21-23` (`sbName`, `sbX/sbY/sbR/sbB`,
   `sbWidth/sbHeight`) via `setStatusName` (`:34-36`) / `setStatusPos` (`:25-32`). Not refs, not reactive.
   Written by `SelectUtil.ts:208-216` (selection), `DrawUtil.ts:90-95, 1166-1171`,
   `OptUtil.ts:5787-5789` (live drag), `DrawUtil.ts:2441-2442`, and the page itself
   (`HvacDesignerPage.tsx:130-131`).
2. **`useStatusMessage.ts`** polls with `requestAnimationFrame` on a dirty key (`:20-29`) and formats
   `X:… Y:… R:… B:… | W:… H:…` (`:6-15`); its `msg` is a **hard-coded constant** (`:33`).
3. **`EditorStatusBar`** renders name | coords | zoom% | spacer | Saved/Unsaved | message (`:52-79`).

What the user sees:

| Situation | Engine values | Rendered |
|---|---|---|
| No selection | `sbName=''`, all zeros (`SelectUtil.ts:215-216`) | name falls back to **`'Shape'`**; coords blank |
| Single selection | `ShapeType \|\| 'Shape'` + the object's `Frame` (`:211-212`) | `Rect \| X:… Y:… R:… B:… \| W:… H:…` |
| **Multi-selection** | only the **target/first** object (`:194-212`) — the engine has no count concept | identical to single selection |
| Drag in progress | live `x = frame.x + dragDeltaX`, `y = …` (`OptUtil.ts:5781-5789`) | coords update every frame |

### Changes

| Mark | Change |
|---|---|
| `MOD` | The adapter publishes `t3-editor-status` from a poller over the same scalars; today **nothing dispatches that event anywhere** (`emitEditorStatus` has no callers) |
| `MOD` | Author a real `message` (today `'Drawing editor initialized. Select a tool or shape to get started.'`) driven by tool/selection state; add `size`, `zoom`, `saved` |
| `FIX-OPPORTUNITY` | Multi-selection shows no count — the adapter can add "3 shapes selected" without touching the engine |
| `FIX-OPPORTUNITY` | `zoom` never clears once set (`EditorStatusBar.tsx:44`) |
| `UNCHANGED` | The engine's writers; `useStatusMessage` stays for the legacy page |

## 5. `T3ContextMenu` — `UNCHANGED` (rendered by the shell at page level)

* Trigger: `ctxMenuConfig.value` polled every **150 ms** (`:296, 328-359`); set by
  `UIUtil.ShowContextMenu` (`UIUtil.ts:33-35`).
* Item list comes from `CtxMenuUtil.GetContextMenu` (`Doc/CtxMenuUtil.ts:88-…`): Library (Add/Load),
  Background colour (4), Cut/Copy/Paste/Delete/Undo/Redo/Duplicate/Save/Clear, Lock/Lock All/Unlock,
  Select/Select All, Select Shape(s) (6), Flip (2), Make Same (3), Rotate (8), Align (6), Group/Ungroup,
  Bring to Front/Send to Back — ~34 items, dispatched by `HandleMenuClick` (`:1046-1145`).
* Rendering: a plain `position:fixed` div (`:396-417`, `zIndex:9999`) with hover fly-out submenus
  (`:255-292`, `zIndex:10001`) and a Quasar→Fluent icon map (`:103-160`). It does **not** use Fluent `Menu`.
* Positioning: `useLayoutEffect` (`:315-326`) flips against `getBoundingClientRect()` vs `innerWidth/Height`.

**Shell consequence:** it renders at page level (a sibling of the shell, like today at
`HvacDesignerPage.tsx:219`) so it can overlay any region. Its `z-index` must sit above the shell but below
Fluent popovers (the app forces `.fui-MenuPopover { z-index: 10000 }` — `MinimalLayout.tsx:14-18`).
`FIX-OPPORTUNITY`: its submenus are hand-rolled; migrating to Fluent `Menu` would fix keyboard access —
explicitly **not** in scope (out of the change budget).

## 6. The right region — `NEW` engine-backed inspector

**Design-time starting point.** The fourth area did not exist: `components/panels/PropertiesPanel.tsx` is dead code
(imported nowhere) and it edits `designerStore.updateShape` (`:72, 86, 102, 124, 138, 154, 172`) — a Zustand
model the engine never reads (`R10`). Its view-model (`types/shape.types.ts:21-146`) is entirely detached
from engine objects (`transform.x`, `style.fillColor`, `deviceLink`, …).

**Shipped.** `documents/hvac/HvacPropertiesPanel.tsx` is the fourth area, rendered in `layout.right`, reading and
writing the engine directly: §6.2 for the shipped layout, §6.3 for the `Data` section, §6.4 for the Link Entry
picker and its data source, §6.5 for the app-layer record a widget needs.

### 6.1 The real engine property surface (definitive)

**There is no `Frame` class.** `Frame` is a *property* of type `Rectangle` (`S.BaseDrawObject.ts:88`, ctor
`:219`; `Model/Rectangle.ts:20-28` → `{x, y, width, height, firstconnector_x, h, hdist, v, vdist}`).

Hierarchy: `BaseDrawObject` (`S.BaseDrawObject.ts:86`) → `BaseShape` (`S.BaseShape.ts:89`) →
`Rect/RRect/Oval/Polygon/ForeignObject`, `BaseSymbol` (`S.BaseSymbol.ts:49`) → `GroupSymbol/BitmapSymbol/SvgSymbol/D3Symbol`,
`ShapeContainer extends Rect` (`S.ShapeContainer.ts:60`). Separately `BaseLine` (`S.BaseLine.ts:77`) →
`Line/PolyLine/SegmentedLine/ArcLine/FreehandLine`, and `Connector` (`S.Connector.ts:75`).

| Read safely | Declared at | Notes |
|---|---|---|
| `Frame.x / .y / .width / .height` | `S.BaseDrawObject.ts:88` | universal — this is the geometry |
| `RotationAngle` | `:99` | **there is no `Rotation`** |
| `ShapeType` | `S.BaseShape.ts:91` | **shapes only** — `'Rect'`, `'RRect'`, `'Oval'`, `'Polygon'`, symbol types (`OptConstant.ts:78-89`) |
| `uniType` | `S.BaseDrawObject.ts:212` | `''` unless set (`'Rect'`/`'Oval'`/`'RRect'`) |
| `StartPoint` / `EndPoint` | `:196, 199` (re-declared `S.Line.ts:64-65`, `S.Connector.ts:77,93`) | **the reliable geometry for line/connector classes** |
| `StyleRecord?.Fill.Paint.Color` | `Model/FillData.ts:44` → `Model/PaintData.ts:41` | fill colour |
| `StyleRecord?.Fill.Paint.Opacity` | `PaintData.ts:49` | opacity |
| `StyleRecord?.Line.Paint.Color` | `Model/LineData.ts:45` → `PaintData.ts:41` | stroke colour |
| `StyleRecord?.Line.Thickness` | `LineData.ts:48` | stroke width |
| `StyleRecord?.Line.LinePattern` | `LineData.ts:49` | dash |
| `StyleRecord?.Text.Paint.Color` / `.FontName` / `.FontSize` | `Model/TextFmtData.ts:44-56` | text style |
| `Locked` | `flags & 16` (`NvConstant.ts:293`) | bit test on `S.BaseDrawObject.ts:108` |
| `Hidden` | `flags & 268435456` (`NvConstant.ts:307`) | |
| `Layer`, `UniqueID`, `BlockID` | `:123, 107, 203` | |
| Text content | `shape.DataID` (`:128`) → `ObjectUtil.GetObjectPtr(DataID,false)` → `TextObject.runtimeText` (`Model/TextObject.ts:33`) | there is **no** `Text`/`TextValue` property |
| Group children | `ShapesInGroup` (`:172`) | groups only |

**Undefined, must be null-guarded / not assumed:**

| Symbol | Reality |
|---|---|
| `Width`, `Height`, `Left`, `Top`, `Rotation`, `ClassName` | **do not exist on any draw object** |
| `ShapeType` on `Line`/`PolyLine`/`SegmentedLine`/`ArcLine`/`FreehandLine`/`Connector`/`PolyLineContainer` | **`undefined`** — this is why `SelectUtil.ts:211` and `OptUtil.ts:5788` write `obj.ShapeType \|\| 'Shape'` |
| `StyleRecord` itself | **`null`** unless the config supplied one (`S.BaseDrawObject.ts:232`) |
| `StyleRecord.fillColor` / `.strokeColor` | do not exist — they are `Fill.Paint.Color` / `Line.Paint.Color` |
| `Type` | identical for every object (`StoredObjectType.BaseDrawObject`) — useless as a discriminator |

### 6.2 Panel design

```
Identity    kind        = ShapeType ?? uniType || (StartPoint ? 'Line' : 'Shape')   // never undefined
            name        = ShapeType ?? uniType ?? 'Shape'      // matches the engine's status text
            className   = obj.constructor.name                  // for the Raw view only
Geometry    X / Y / W / H          ← Frame.x/.y/.width/.height          (read-only in P1)
            Rotation               ← RotationAngle
            (line classes) Start/End ← StartPoint/EndPoint instead of W/H
Appearance  Fill / Opacity         ← StyleRecord?.Fill.Paint.Color / .Opacity
            Stroke / Width / Dash  ← StyleRecord?.Line.Paint.Color / .Thickness / .LinePattern
            Text colour/size       ← StyleRecord?.Text.Paint.Color / .FontSize
State       Locked / Hidden        ← flags bits; Layer; UniqueID
Text        ← DataID → TextObject.runtimeText
Raw         a collapsible JSON view of the safe subset (debug aid)
```

* **P1: read-only.** Values formatted exactly like the status bar so the two agree.
* **P1b: editing** through a single funnel (`engineMutation.ts`) after the undo API is proven (`R11`).
  The candidate surface to verify is `T3Gv.opt`'s action/undo manager plus `ToolActUtil` /
  `OptCMUtil` and a repaint via `RenderDirtySVGObjects` — **not** assumed in this design.
* **Multi-selection:** count + shared fields only; per-object differences shown as "—".
* Every read goes through `optional chaining` + defaults; a React error boundary wraps the panel (a mixed
  widget+line selection already crashed a panel once — see `verification.md` §4/P2).
* The polling hook is shared (`useEnginePoll`, 250 ms, paused when the tab is hidden) because the engine has
  **no event bus** (`R9`).

### 6.2.1 The shipped layout

Sections, top to bottom, and what each reads:

| Section | Tag | Content | Read / write |
|---|---|---|---|
| `Data` (unlinked) | `Unlinked` | link prompt + the picker | `appStateV2.items[activeItemIndex]` |
| `Data` (linked) | `Linked` | entry card, `Change` / `Unlink`, the rows of §6.3 | same |
| `Widget` | the widget kind | the per-widget settings bag, described by the tool definition (`NewTool[type].settings` — the panel hard-codes no per-widget fields) | `item.settings` |
| `Geometry` | `Endpoints` for line classes | X / Y / Width / Height / Rotation (lines: Start / End instead of Width / Height) | `Frame.*`, `RotationAngle` |
| `Appearance` | — | Fill, Fill opacity, Stroke, Stroke width (line pattern / text colour / font read-only) | `StyleRecord.Fill/Line/Text` |
| `Text` | — | the text content, Enter applies, Escape reverts | `DataID` → `TextObject.runtimeText` |
| `Identity` | `Read only` | kind, name, constructor name | `ShapeType ?? uniType` |
| `Raw (engine fields)` | collapsed | the safe subset as JSON (debug aid) | — |

Rules the shipped panel keeps:

* every write goes through one funnel — `engineMutation.ts` `applyHvacMutation(targetId, mutate)`:
  `ObjectUtil.GetObjectPtr(id, true)` → mutate → `DrawUtil.CompleteOperation([id], false)`;
* `NumberField` / `TextField` commit on Enter or blur and revert on Escape; a failing write is reported inline
  (React error boundary);
* a multi-selection renders a `Selection` section (count + shared fields, per-object differences blank) instead of
  the per-object sections;
* reads are null-guarded and formatted like the status bar; the shared `useEnginePoll` is the only poller;
* **nothing in the panel is disabled** — the fields exist to be written, and a write the device refuses comes back
  as the section's own error text.

### 6.3 The `Data` section (the T3000 link)

`item.t3Entry` is the link. `useHvacAppStateItem.ts` supplies it: `raw` is the live app-layer object the engine
calls take (`Hvac.IdxPageReact.T3UpdateEntryField(field, item)` reads `item.t3Entry[field]`), while `settings` and
`t3Entry` are **snapshots** so a change repaints the panel.

Rows — all **always rendered**, blank when the entry carries nothing (a row that disappears moves everything
under it):

| Row | Source | Notes |
|---|---|---|
| entry card | `type`, `pid`, `id` | `INPUT · 1-IN2` |
| `Full Label` | `t3Entry.description` | the device's `description` field (the full label) |
| `Label` | `t3Entry.label` | the short label |
| `Auto/Manual` | `t3Entry.auto_manual` | 0 = Auto, 1 = Manual |
| `Value` | by kind, below | exactly one row |
| `Display field` | `item.settings.t3EntryDisplayField` | what the shape itself shows on the canvas |
| `Status` / `Output` | `t3Entry.status` / `.output` | program and schedule entries only |

The `Value` control follows the **grid's** reading of a point (`InputsPage` / `OutputsPage` / `VariablesPage`: the
`signalType` column types a row `digitalAnalog === '0'` ⇒ *Digital*, anything else ⇒ *Analog*, and the range is
consulted only for names and units, through `PointRange` — the class of §6.3.1, which reads the same tables the
grids do):

| Entry | Control | Writes | Component |
|---|---|---|---|
| a **multi-state** range (101+) on a digital point | the range's options (`option.status === 1`, names sanitised) | `value` | `SelectRow` |
| a **digital** point whose range names a pair (1-100) | the range's own two words (`Close`/`Open`) | `control` | `SelectRow` |
| every other point — analog, or a digital one whose range was never written (`0`/`255`) | number input: the grids' reading (`fValue / 1000`, `-6500.80`), unit from `PointRange.unit` (`Deg.C`, `Amps`) | `value` | `NumberField` |

A state list needs a range that **names** the states. Device 1028 is the case that proves it: every one of its 64
inputs reports `digitalAnalog "0"` with `rangeField "0"` — its own page draws such a point with `Type Digital`,
`Range Unused` and a **numeric** `Value`, and an Off/On list there would offer two words the device never wrote.
The three traps, all measured on that device through `:9103/api/t3_device/devices/1028/{input,output,variable}-points`
(64 rows each):

- a **live reading** cannot stand in for the type. Those inputs report `control "255"` (the 0xFF fill); a rule
  keyed on `control` being 0/1 turned all 64 into number inputs while the grid calls them *Digital*.
- `range > 100` **alone** is not an MSV test. All 64 outputs and variables report `digitalAnalog "255"`,
  `rangeField "255"` — not a range id, the fill of a field the DB never wrote — and reading it as a multi-state id
  drew an empty dropdown where the grid says *Analog*.
- a **digital** point with no range is still not a switch. Offering Off/On for it was the last version's mistake:
  with no range there is nothing to choose between, so it reads and writes as a number like its page shows.

Both numbers are **engineering units**: the device stores `fValue` ×1000, and the engine's write path divides by
1000 again (`IdxPage.T3UpdateEntryField`, `|v| >= 1000`), so the field shows `value / 1000` — the same number the
picker grid and the point page print, fill markers included — and commits it **×1000**, which makes the device
receive exactly what was typed.

#### 6.3.1 `PointRange` — one vocabulary, the pages'

`documents/hvac/PointRange.ts` is the only thing the designer asks about a linked point's range. It reads the
**point pages'** tables (`features/<kind>/data/rangeData.ts`) and answers:

| method | for | answers |
|---|---|---|
| `isDigital` | the control | `digital_analog === 0` — the grids' own rule |
| `rangeId` / `option` | the control | the range id, or nothing when the field is `0`/`255` (the device's "never written" fills) |
| `signalType` | the picker's *Type* cell | `Digital` / `Analog`, the entry's kind for anything else |
| `unitSymbol` | the picker's *Units* cell | `0/1` for digital, the unit symbol otherwise, blank when the range names none |
| `label` | the picker's *Range* cell | `"Normal/Alarm"`, `"MSV 1"`, `"Unused"` for `0`, `"Unknown"` for an unknown id |
| `states` | the `Value` dropdown | the two words a digital point's states are called, split out of that label |
| `isMsv` | the `Value` dropdown | a multi-state range (101 and up) |
| `unit` | the `Value` number field | the analog unit, and **no** placeholder — the inspector's variant of `unitSymbol` |

The engine has its own reader — `IdxUtils.getEntryRange` / `getUnitText` over the legacy `T3Data.ranges` table —
and the canvas still uses it, so **nothing there changed**. It is simply a different vocabulary, which is why the
panel and the grid used to disagree: range 11 is `Low/High` on the page, while the engine holds
`on: "Low", off: "High", direct: true` — the pair comes out swapped — and its units are symbols (`°C`) against
the tables' (`Deg.C`).

Checked row by row against the pages' own `getRangeLabel` / `getUnitSymbol` over the 192 real points of device
1028 (`:9103`): *Type* and *Range* agree on all 192, *Units* agrees on all 128 input/variable rows. The
**Outputs** page is the one place that does not agree with itself — its *Units* cell calls `getRangeLabel`
(`OutputsPage.tsx:1097`), so it prints the range name twice, where *Range* also has it; the picker keeps a
proper unit column instead of copying that.

Device text is cut at the first fill character — `U+FFFD` (what jsoncpp substitutes for an invalid byte),
`0x00FF`, or the CP936 private-use range `U+E000–U+F8FF` — by `sanitizeDeviceText`; the copy handed to the engine
is sanitised field-by-field (`sanitizeEntryText`) so the canvas text is clean too.

### 6.4 Link Entry — the picker and its data source

Source: **REST**, not `T3000_Data.panelsData`. The websocket still fills `panelsData` for every other consumer and
no websocket class was changed; the picker simply stopped being one of its readers.

| Kind | Endpoint | Shape |
|---|---|---|
| INPUT / OUTPUT / VARIABLE | `GET /api/t3_device/devices/{serial}/input-points` (`…/output-points`, `…/variable-points`) | `{ count, "<kind>_points": [ camelCase rows ] }` |
| PROGRAM / SCHEDULE / HOLIDAY / SCREEN / MONITOR | `GET /api/t3_device/devices/{serial}/table/{PROGRAMS\|SCHEDULES\|HOLIDAYS\|GRAPHICS\|MONITORDATA}` | `{ data: [ raw column names ], message }` |

Table names are the whitelist in `api/src/t3_device/routes.rs:106`. Row → entry mapping (`LinkEntryApi.toEntry`;
one normalised lookup per field covers camelCase and raw column names alike):

| Row field | Entry field | Notes |
|---|---|---|
| `inputId` … | `id` | `PRG` / `SCH` / `HOL` / `SCR` / `MON` + `index + 1` when the row has none |
| `inputIndex` (0-based) | `index` | the C++ convention |
| `fullLabel` | `description` | |
| `label` | `label` | |
| `fValue` | `value` | |
| `control` | `control` | |
| `autoManual` | `auto_manual` | |
| `digitalAnalog` | `digital_analog` | |
| `rangeField` | `range` | |
| `units` | `units` | |
| — | `serial` | the device the row came from |
| — | `pid` | panel number; `1` when the engine has no panel list |

**Identity is `serial`, not the panel number.** The panel list arrives over the websocket, and without it every
device's panel number is `1` and every device's points start at `IN1` — keying rows by `pid-id-index` produced
duplicate React keys (`1-IN1-0` twice, measured). The grid's row key and `entryKey` (selection and current-link
matching) both carry the serial; `entryKey` leaves it empty for a link saved before that change, which is why such
a link still shows in the pinned card but no longer highlights its grid row until it is re-picked.

**Refresh** = the device pages' own two-step (`LinkEntryApi.refreshDevice`):

1. `POST /api/t3_device/{inputs\|outputs\|variables}/:serial/refresh`, body `{ "index": n }` or `{}` →
   `{ success, message, items, count, timestamp }` — the rows the device answered with (action 17). **Nothing is
   stored by this call.**
2. `POST …/save-refreshed` with `{ items }` → writes those rows into the local DB.

Posting `{}` to the second call fails deserialization (`SaveRefreshedDataRequest { items: Vec<Value> }`), and an
empty `items` means the device gave nothing — the server's own message is what the panel then shows. Only the
three point kinds have a device endpoint; program / schedule / holiday / screen / monitor rows are whatever the
periodic sync has stored. Measured on this install: `refresh` for serial 1028 answers *"Protocol settings not found
for serial 1028"*, so that path needs the host to hold the device's protocol settings.

Measured data facts (2026-09-23/24):

| Device | Fact |
|---|---|
| 1028 (T3-LB-ESP) | 64 / 64 / 64 point rows → **192 entries**, **0** fill characters; no point row carries a real `rangeField` (`0` on the inputs, `255` on the outputs and variables), so all 192 resolve to the **number input** — the state list needs a range that names states |
| 212375 (VAV controller) | real type data: `IN1 VAV-01-01 Space Temp` → `digitalAnalog: 1`, `control: 1`, `rangeField: 8`, `units: 8`, `fValue: -40000` |

Picker behaviour (one dialog; `Change` reopens it with `current`):

* device rail = the app's device store ∪ the engine's panel list, grouped, each row showing how many entries are
  loaded for it (`–` when none); `All devices` is the default scope and stays selectable;
| grid columns `Point \| Full Label \| Label \| Type \| Units \| Range \| Value \| Device`, capped at 500 rows, filtered by the
  search box against the entry's own label (`AppRuntime.entryLabel`). *Type*, *Units* and *Range* are the point
  grids' own cells through `PointRange` (§6.3.1), and *Value* is their reading: `fValue / 1000` at two decimals
  (`-6500.80`, `-0.00`, `0.00`), blank only when the field is missing — checked against `InputsPage`'s cell on all
  192 rows of device 1028, 192/192 identical. The state **words** (`Off`/`Open`) stay in the `Data` section's
  Value *dropdown*, which is the control that writes `control` — printing them in the grid too is what made
  `-6500.80` read as a switch;
* a pinned *Current link* card above the search box shows the entry the shape is bound to, with `Unlink`;
* click selects, double-click commits, `Save` commits, `Cancel` / close resets scope and search;
* the engine owns a document-level keydown handler that cancels editing keys (`KeyboardOpt.ts:195` calls
  `preventDefault()` for any key it has a command for, with no target check), so the search box and the panel's
  number fields call `keepKeysInField` (`stopPropagation`) — without it Backspace and the arrow keys never reached
  the field;
* `Reload`: with one device in scope → `refreshDevice` for that serial; on `All devices` → re-read what the API
  already holds for every device in the list.

### 6.5 The app-layer record for a drawn shape

`item.t3Entry` — where the link lives — belongs to the **app-layer** record (`appStateV2.items[i]`), and the engine
creates that record in its placement *completion*, not when the shape is added:
`DrawUtil.MouseStampObjectDone` (`DrawUtil.ts:588`) for stamped shapes and `DrawUtil.DragDropObjectDone`
(`:1386`) for dropped library symbols both call `QuasarUtil.AddCurrentObjectToAppState()`.

A library tool placed by palette click skips that completion, so the shape lands with no record and the panel has
nothing to show (the legacy panel showed nothing either — the shape had to be repaired by hand).
`useHvacAutoRecord(enabled)` closes that gap through the engine's own call: every 250 ms, if the selected object
has no `GetItemFromAPSV2(uniqueId)` record and its `uniType` is in the `NewTool` catalogue, it calls
`AddCurrentObjectToAppState()` and then `SetAppStateV2SelectIndex(null)`. The index has to be re-pointed because
`AddCurrentObjectToAppState` indexes by *tool name* while an item's `uniqueId` is a shape UUID
(`S.BaseDrawObject.ts:322`), which lands on `-1`. An existing record is never re-registered; the index is only
re-pointed when it addresses a different shape.

## 7. What the React layer owns (and what it must stop pretending to own)

`store/designerStore.ts` (`create<…>()(devtools(immer(…), {name:'hvac-designer-store'}))`, `:160-479`) is a
49-field Zustand model. Consumers outside the store:

| Field | Read by |
|---|---|
| `viewport` | `useDrawing.ts:47-59, 117-129` |
| `shapes`, `selectedShapeIds` | `PropertiesPanel.tsx:16, 18` (dead) |
| `activeTool` | `HvacDrawingArea.tsx:18`, `ToolsPanel.tsx` (set) |
| `layers`, `symbolLibrary` | `useDrawing.ts:51-52, 121-122` |
| `drawingId/Name`, `isDirty` | `useDrawing.ts:44-45, 62-64, 92-93, 114-115, 143, 192` |
| everything else (`clipboard`, `history`, `toolOptions`, `isDrawing`, `toolOptions`, all layer/symbol actions, `undo/redo`, `groupShapes`, `ungroupShape` (stubs), …) | **unused** |

`services/drawingService.ts` is the real persistence path: localStorage `t3-hvac-drawings` (`:17`) mirrored
best-effort to `PUT /api/design-hub/hvac-drawings/{id}` (`:39-55`), record shape `Drawing`
(`types/drawing.types.ts:11-38`), ids `drawing-${Date.now()}` (`:66`).

| Mark | Change |
|---|---|
| `UNCHANGED` | `designerStore` (out of scope — see `../risks.md` §4). Do **not** wire it to the engine in this project |
| `MOD` | `createThumbnail` (`:179-198`) draws **no shapes** (`// TODO: Render svg.js shapes…` at `:193`) — a `FIX-OPPORTUNITY`: capture the real `#svg-area svg` (the shell has a stable reference) instead of an empty canvas |
| `MOD` | The shell's `describe().title` should read `drawingName` from `useDrawing`, keeping the two in sync as today (`HvacDesignerPage.tsx:93`) |
