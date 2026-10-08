# P1 — `DesignerShell` + the HVAC document on it

Goal: a real shell component and the existing HVAC editor running inside it, **on a new route**, with the
old route untouched (D10). Behaviour must be indistinguishable from today.

Files: see [`../change-map.md`](../change-map.md) §P1.

---

## 1. Existing implementation (host source)

`features/hvac-designer/pages/HvacDesignerPage.tsx` — 222 lines, one component, no context provider:

```
#main-app                     (styles.mainApp: flex column, height 100%)
  #main-panel                 (styles.mainPanel)
    <TopToolbar onToggleLeftPanel onNavigateBack />        ← 60 px, polls T3Gv every 300 ms
    .mainArea                 (styles.mainArea: flex row, flex 1)
      #left-panel  115px      (styles.leftPanel: #e1e1e1 border, #fafafa bg)   <ToolsPanel/>
      #work-area              (styles.drawingArea: #f5f5f5)
        <HvacDrawingArea />   → #document-area > #c-ruler, #h-ruler, #v-ruler, #svg-area
        <EditorStatusBar name coords message />
    <T3ContextMenu />
```

Mount effect (`:99-147`): clear the three containers' children (`:101-103`) → `Hvac.UI.Initialize(null)`
(`:105`) → `Hvac.IdxPageReact.initQuasar(null)` (`:106`) → `initPageReact()` (`:107`) → `refreshLayout()` at
+150 ms and +400 ms (`:109-121`) → seed the status bar at +500 ms (`:124-137`); cleanup clears the autosave
interval and calls `clearIdx()` (`:140-146`). A second effect re-lays out on the collapse flag (`:149-160`).
The drawing is loaded/created by `useDrawing()` (`:162-170`).

**What P1 must preserve exactly:** the DOM ids the engine reads (`#svg-area`, `#document-area`, `#h-ruler`,
`#v-ruler`, `#c-ruler`, `#main-app`, `#left-panel`, `#work-area`), the mount order, and "the canvas element
is mounted once".

## 2. Target for P1

```
DesignerPage (route element)
  └── DesignerShell                       ← new, Fluent tokens, 5 slots
        TopBar      ← adapter.TopBar()      = <TopToolbar/> + shell panel toggles
        LeftRegion  ← adapter.LeftPanel()   = <ToolsPanel/>           (115 px, resizable, collapsible)
        CanvasHost  ← adapter.Canvas()      = <HvacCanvas/>           (#document-area + rulers + #svg-area)
        RightRegion ← adapter.RightPanel()  = <HvacPropertiesPanel/>  (new, read-only in P1; 260 px)
        StatusBar   ← adapter.StatusBar()   = <EditorStatusBar/> + shell items
        BottomDock  — none for HVAC
```

## 3. Steps

### S1 — the contracts

Create `features/designer/kinds.ts`, `DocumentAdapter.ts` exactly as in [`../interfaces.md`](../interfaces.md).
No engine imports in either file — add an ESLint-free guard instead: a unit test that reads the file
sources and asserts they contain no `t3-hvac` / `t3-eez-studio` import (see S9).

### S2 — the shell

`components/DesignerShell.tsx`:

```tsx
export const DesignerShell: React.FC<{ adapter: DocumentAdapter; mount: MountContext }> = ({ adapter, mount }) => {
    const s = useStyles();
    const layout = adapter.useLayout();          // reactive
    const store  = useDesignerLayoutStore(adapter.kind);
    return (
        <div className={s.root}>
            <ShellTopBar
                layout={layout.top}
                title={adapter.describe?.(mount).title}
                onToggleLeft={() => store.toggle("left")}
                onToggleRight={() => store.toggle("right")}
                onToggleBottom={() => store.toggle("bottom")}
            />
            <div className={s.body}>
                {layout.left && !store.collapsed("left") && (
                    <>
                        <RegionPanel region={layout.left} side="left" width={store.width("left", layout.left)} />
                        <ShellSplitter onDelta={dx => store.resize("left", -dx)} />
                    </>
                )}
                <div className={s.canvas} ref={canvasHostRef}>{layout.canvas.node}</div>
                {layout.right && !store.collapsed("right") && (
                    <>
                        <ShellSplitter onDelta={dx => store.resize("right", dx)} />
                        <RegionPanel region={layout.right} side="right" width={store.width("right", layout.right)} />
                    </>
                )}
            </div>
            {layout.bottom && <ShellBottomDock region={layout.bottom} settings={store.bottom()} />}
            <ShellStatusBar extra={layout.status} />
        </div>
    );
};
```

Rules that must hold in the implementation:

1. **The canvas host element is stable.** `canvasHostRef` is set once; nothing in the shell may key it on
   panel state, theme, or layout. Panel toggles change widths only.
2. **`adapter.mount(ctx)` runs exactly once** per document id:

```tsx
const mounted = useRef<string | undefined>(undefined);
useEffect(() => {
    if (mounted.current === documentKey) return;      // strict-mode / re-render guard
    mounted.current = documentKey;
    const dispose = adapter.mount?.(mount);
    return () => { dispose?.(); mounted.current = undefined; };
}, [documentKey]);
```

3. **Resize is a notification, not a re-mount:**

```tsx
useCanvasResize(canvasHostRef, () => adapter.onCanvasResize?.(), 100);
// HVAC: () => T3Gv.docUtil.HandleResizeEvent()   (already debounced internally)
```

`ShellSplitter` reuses the repo recipe (`layout/MainLayout.tsx:56-63` for the style, `:142-172` for the
drag math, including the `document.body.style.cursor/userSelect` guards at `:246-275`).

`RegionPanel` renders the tab strip + `activeTab.content()`. With one tab it renders a **header**, not a
tab strip (so the HVAC left panel looks like today). With ≥2 tabs it renders the strip. `PanelTab.content()`
results are memoised by `tab.id` so a tab switch does not remount the other panels' React trees more than
necessary.

### S3 — the layout store

`hooks/useDesignerLayoutStore.ts` — Zustand slice persisted to
`localStorage["t3.designer.layout"]`:

```ts
type KindLayout = {
    left?:  { width: number; collapsed: boolean };
    right?: { width: number; collapsed: boolean };
    bottom?:{ height: number; collapsed: boolean; activeTabId?: string };
    activeTabs?: Record<string, string>;   // regionId -> tabId
};
```

Defaults come from the adapter's `RegionSpec.width.default` (HVAC left = **115**, right = **260**; LVGL
left = 240, right = 240 — matching the FlexLayout border sizes at `layout-models.tsx:276, 326`).

### S4 — the HVAC adapter

`documents/hvac/HvacDocument.tsx`:

```tsx
export const hvacAdapter: DocumentAdapter = {
    kind: "hvac-schematic",
    engine: "hvac",

    mount({ host, id, navigate }) {
        // 1. resolve the drawing (DB by id, else new)            ← from useDrawing()
        // 2. Hvac.UI.Initialize(null)                            ← exactly as today
        // 3. Hvac.IdxPageReact.initQuasar(null); initPageReact()
        // 4. NO fixed setTimeout refreshes — the ResizeObserver covers it,
        //    plus one rAF after the element has layout
        return () => { Hvac.IdxPageReact.clearAutoSaveInterval(); Hvac.IdxPageReact.clearIdx(); };
    },

    useLayout() { /* returns ShellLayout built from the components below */ },
    commands: hvacCommands,
    viewport: hvacViewport,                    // interfaces.md §4.1
    describe: () => ({ title: drawingName, modified: T3Gv.opt.header.DocIsDirty })
};
```

Deviations from today, each with a reason:

| Today | P1 | Why |
|---|---|---|
| `document.getElementById('svg-area').replaceChildren()` before init (`:101-103`) | same, kept | the engine expects empty containers; keep it verbatim |
| `refreshLayout()` at +150 ms and +400 ms (`:109-121`) | one `requestAnimationFrame` after mount + `ResizeObserver` | the fixed delays are a race workaround; the observer is deterministic. **If the drawing is mis-centred in the first frame, keep a single +150 ms retry** |
| re-layout on `isLeftPanelCollapsed` via `setTimeout(…, 50)` (`:149-160`) | handled by the ResizeObserver on the canvas host | the canvas width changes → observer fires → `HandleResizeEvent()` |

`documents/hvac/HvacCanvas.tsx` — the markup from `HvacDrawingArea.tsx:70-88` with an `ids` prop defaulted
to today's values (P3 passes real ones). Keep the `data-*` attributes, the CSS module classes, the
`onMouseMove` handler and the `tabIndex={0}` untouched.

### S4a — findings from the build

Three findings, all now encoded in the code and in the tests:

1. **The engine needs three extra ids** — `#main-app`, `#left-panel`, `#work-area` — captured directly at
   init (`UIUtil.ts:401-403`) and used as Hammer hosts. Rendering only the drawing surfaces produces a
   *silent* `Cannot read properties of null (reading 'addEventListener')` the moment a user stamps a
   shape. See [`../pages/hvac-document.md`](../pages/hvac-document.md) §3.1; the ids now live in
   `documents/hvac/hvacAreaIds.ts` with a unit test on the contract.
2. **The load effect must depend only on the document id.** `useDrawing`'s callbacks are `useCallback`s
   over the whole zustand store, so their identity changes on every store write — depending on them makes
   `createNew()` retrigger the effect and React throws *"Maximum update depth exceeded"*. This is exactly
   why `HvacDesignerPage.tsx:170` uses `[graphicId]` alone.
3. **A fixed-width shell must be responsive.** Two 115/260 px panels plus splitters exceed a narrow
   viewport (the VS Code embedded browser is ~320 px), which starves the canvas to 0 px and the engine
   then computes `NaN` for the zoom/scale. The shell therefore *effectively* collapses regions below
   900 px / 640 px of viewport width without touching the user's stored layout, and clamps panel drags so
   the canvas always keeps 240 px.

Also verified by A/B (legacy vs shell, same viewport): identical svg node count (25), layer count (17),
document size, zoom, and an identical tools panel (7 accordions); and three route round-trips leave exactly
one `#svg-area`, one `#document-area` and one `<svg>` child (no duplicate engine state).

### S5 — the shell top bar

The shell draws: back-to-Hub button, document title, spacer, panel toggles, then `layout.top.content`
(the existing `TopToolbar`). `TopToolbar` gains an optional `title` slot and keeps its own
`onToggleLeftPanel`/`onNavigateBack` props for the legacy page — the shell passes its own toggles, so the
toolbar's own button is hidden when rendered inside the shell (`compact` prop). Keep the 60 px bar height.

### S6 — the HVAC right panel, read-only

There is **no** right panel today and `PropertiesPanel.tsx` is dead code that reads the wrong store (R10).
So P1 writes a new one:

```
documents/hvac/useHvacSelection.ts
    useEnginePoll(250) → {
        kind: "none" | "single" | "multi",
        objects: [{                                   // ALL fields below are verified engine paths
            uid, blockId, layer,                      // UniqueID / BlockID / Layer
            kindLabel,                                // ShapeType ?? uniType ?? (StartPoint ? 'Line' : 'Shape')
            constructorName,                          // Raw view only
            frame: { x, y, width, height },           // Frame.x/.y/.width/.height
            rotation,                                 // RotationAngle   (there is NO `Rotation`)
            start, end,                               // StartPoint/EndPoint  (line/connector classes)
            fillColor, fillOpacity,                   // StyleRecord?.Fill.Paint.Color / .Opacity
            strokeColor, strokeWidth, linePattern,    // StyleRecord?.Line.Paint.Color / .Thickness / .LinePattern
            textColor, fontName, fontSize,            // StyleRecord?.Text.Paint.Color / .FontName / .FontSize
            locked, hidden,                           // flags & 16 / flags & 268435456
            text                                      // DataID → ObjectUtil.GetObjectPtr → TextObject.runtimeText
        }],
        raw: string                                   // for the Raw accordion
    }
```

Read path (verified APIs):

```ts
const target = SelectUtil.GetTargetSelect();                                  // SelectUtil.ts:225
const block  = ObjectUtil.GetObjectPtr(T3Gv.opt.selectObjsBlockId, false);    // ObjectUtil.ts:21
const sel: number[] = block?.Data ?? [];                                      // pattern used at SelectUtil.ts:81, 759-763
```

**Hard rules from the engine's real object model** (full table in
[`../pages/hvac-document.md`](../pages/hvac-document.md) §6.1):

- `Width`, `Height`, `Left`, `Top`, `Rotation`, `ClassName`, `Text`, `TextValue`, `StyleRecord.fillColor`
  **do not exist** — geometry is `Frame.{x,y,width,height}` and rotation is `RotationAngle`.
- `ShapeType` exists **only on `BaseShape`** (`S.BaseShape.ts:91`): it is `undefined` for every line/connector
  class — the same reason the engine's own status writes `obj.ShapeType || 'Shape'` (`SelectUtil.ts:211`).
- `StyleRecord` is **`null`** unless the config supplied one (`S.BaseDrawObject.ts:232`) — always optional-chain.
- For line/connector classes prefer `StartPoint`/`EndPoint` over `Frame`.

UI: Fluent `Card` sections — Identity / Geometry / Appearance / State / Text / Raw — read-only `Field`s in
P1, with a "Not editable yet" note. Empty state: "No selection". Multi-select: count + shared fields only
(the engine itself reports only the *target* object — `SelectUtil.ts:194-212` — so the count is computed here).
Every property read goes through a defensive accessor, and a **React error boundary** wraps the panel so a
future engine object class cannot take the whole shell down (a class of bug seen before — see
`interfaces.md` §5.1 and the mixed-selection crash analysis).

### S7 — status bar

Reuse `features/design-hub/components/EditorStatusBar.tsx:18` (24 px, `name · coords · zoom · Saved/Unsaved ·
message`), fed by the **existing** contract: the adapter publishes `t3-editor-status` events from the
polled engine state (`interfaces.md` §6). The engine's own `RefConstant` scalars stay untouched
(`useStatusMessage.ts` keeps working for the legacy page).

### S8 — route + menu

- `App.tsx`: one entry inside the `MinimalLayout` branch:

```tsx
<Route path="designer/:kind/:id?" element={<Suspense fallback={…}><DesignerPage/></Suspense>} />
```

- `menuConfig.ts:1429-1434`: insert **before** the `design` check:

```ts
if (pathname === "/t3000/designer" || pathname.startsWith("/t3000/designer/"))
    return designerMenuConfig;                 // P1: hvacMenuConfig for kind=hvac-schematic
if (pathname.startsWith("/t3000/design")) return designHubMenuConfig;
```

In P1 `designerMenuConfig` delegates to `hvacMenuConfig` when the document kind is `hvac-schematic` (the
kind is derived from the path). P2 generalises it to `getMenusForKind(kind)`.

### S9 — tests

`test/vitest/__tests__/designer-shell.test.ts`:

1. renders all five slots for a fake adapter; asserts `mount` called exactly once across re-renders
   (**including a simulated StrictMode double-invoke** — pass the same `documentKey` twice; the second must
   not call `mount`);
2. canvas host element identity is stable when a region collapses/expands and when a tab switches;
3. `RegionPanel` renders a header for one tab and a strip for two; `onSelectTab` fires with the right id;
4. `ShellSplitter` clamps to `min`/`max`;
5. layout store persists and restores widths per kind;
6. **no-engine-import guard**: read the source of every file under `features/designer/` *except*
   `documents/**` and assert none of them imports `t3-hvac` or `t3-eez-studio`.

## 4. Verification

Run the comparison on three drawings:
one empty, one with text + shapes (to exercise rulers/fonts), one large (to exercise scroll + zoom).

## 5. Risks specific to P1

| Risk | Mitigation |
|---|---|
| R1 — engine re-init / duplicate handlers | mount-once guard + stable canvas element + the 10× round-trip check |
| R4 — menu prefix collision | explicit test in `designer-shell.test.ts` for `getMenusForPath("/t3000/designer/hvac-schematic")` |
| R9 — no event bus | one poller, 250 ms, paused when `document.hidden` |
| The shell's canvas is narrower than today's (left 115 + right 260 vs left 115 only) → the drawing's initial centring differs | Expected and allowed. Record `area` in the comparator (verification §3.3) and confirm the drawing re-centres correctly on resize and on collapse/expand. If the user wants the exact old geometry, the right panel starts collapsed by default for HVAC — **default: collapsed = false**, because a right panel is the point of the exercise |

## 6. Acceptance criteria

- `/t3000/designer/hvac-schematic[/:id]` renders the drawing, editable exactly as today.
- The comparison script matches (drawing region pixel-identical).
- Right panel shows the selection; never crashes on any object class.
- `npx vitest run designer-shell lvgl-svg` green; `tsc` clean for touched files.
- No new console errors; handler round-trip clean after repeated navigation (the handler churn is analysed rather than swept 10 times).
