# Designer — interfaces and contracts

Companion to [`design.md`](./design.md) (architecture).
Everything here is a **proposed** API. Nothing exists in code yet.

---

## 1. Vocabulary

| Term | Meaning |
|---|---|
| **document** | one open thing being edited (an HVAC drawing, an LVGL project, an LCD page) |
| **kind** | the document type: `hvac-schematic`, `lvgl-9-5`, `lvgl-flow-9-5`, `lcd-ui` |
| **engine** | the code that owns the document model: `hvac` (`lib/t3-hvac`), `eez` (`lib/t3-eez-studio`), `simulator` |
| **shell** | the layout: five areas + optional dock. Knows nothing about engines |
| **adapter** | per-kind glue: supplies the content of each area, drives its engine |
| **region** | one area of the shell that can hold **tabs** (left, right, bottom) |
| **slot** | one area of the shell (top, left, canvas, right, status, bottom) |

---

## 2. The document kind registry

```ts
// features/designer/kinds.ts
export type DocumentKind =
    | "hvac-schematic"
    | "lvgl-9-5"
    | "lvgl-flow-9-5"
    | "lcd-ui";

export interface DocumentKindSpec {
    kind: DocumentKind;
    engine: "hvac" | "eez" | "simulator";
    /** Window/page title and the shell's default TopBar title. */
    title: string;
    /** Lazy so each engine stays in its own chunk. */
    load: () => Promise<{ default: DocumentAdapter }>;
    /** True when the kind is reachable. */
    available: boolean;
}

export const DOCUMENT_KINDS: Record<DocumentKind, DocumentKindSpec>;
export function isDocumentKind(value: string): value is DocumentKind;
```

The registry is the **single place** that lists document types. It is derived from, and must stay aligned
with, `features/design-hub/drawingTypes.ts` (`openPath`, `engine`, `wizardType` at `drawingTypes.ts:17, 66, 78, 91`).
P4 makes `drawingTypes.ts` point at the registry instead of hard-coding URLs.

---

## 3. `DocumentAdapter`

An adapter is a **plain object of hooks**, created per mounted document. It is intentionally not a class:
React hooks (mobx `observer`, `useState`, `useEffect`) must be usable inside it.

```ts
// features/designer/DocumentAdapter.ts
import type { ReactNode } from "react";

export interface DocumentAdapter {
    kind: DocumentKind;
    engine: "hvac" | "eez" | "simulator";

    /**
     * Called once per mounted document, after the canvas host element exists.
     * Returns a disposer, or nothing.
     *
     * MUST be idempotent-safe: neither engine can be initialised twice
     * (see design.md §6.3), so the shell guarantees this runs exactly once per
     * document and never on a plain re-render.
     */
    mount?(ctx: MountContext): void | (() => void);

    /**
     * The layout. Called on every render; must be cheap and reactive
     * (mobx observer / zustand selectors / useSyncExternalStore).
     */
    useLayout(): ShellLayout;

    /** Commands the shell's own chrome (menu items, shortcuts) may invoke. */
    commands: CommandRegistry;

    /** Optional: lets the shell's own zoom/ruler chrome drive the engine. */
    viewport?: ViewportAdapter;

    /** Optional: for the shell's title/breadcrumb. */
    describe?(ctx: MountContext): { title: string; subtitle?: string; modified?: boolean };
}

export interface MountContext {
    /** The canvas slot element. The ONLY DOM an engine may own. */
    host: HTMLElement;
    /** Route segments. */
    kind: DocumentKind;
    id?: string;
    /** The full query string of the location (hash query included). */
    query: URLSearchParams;
    /** Engine-agnostic status publisher (see §7). */
    status: StatusPublisher;
    /** Navigate within the app. */
    navigate(to: string, options?: { replace?: boolean }): void;
}
```

### 3.1 `ShellLayout` — what the adapter returns

```ts
export interface ShellLayout {
    /** Usually empty; the shell draws its own chrome. */
    top?: TopSpec;

    left?: RegionSpec;
    right?: RegionSpec;

    content: ContentSpec;

    /** Collapsed by default; Checks / Output / Search / References. */
    bottom?: RegionSpec & { defaultCollapsed?: boolean };

    /** Extra status-bar items; the shell always shows the document title + modified flag. */
    status?: ReactNode;
}

export interface TopSpec {
    /** Replaces the shell's default title area. */
    title?: ReactNode;
    /** Toolbar content, right of the title. */
    content?: ReactNode;
    /** Left of the title (back button area is always drawn by the shell). */
    leading?: ReactNode;
}

export type ContentSpec =
    | { node: ReactNode }                       // React content (HVAC, and the EEZ editor)
    | { mount: (host: HTMLElement) => () => void };  // engine owns the DOM (not used yet)
```

### 3.2 `RegionSpec` — a side/bottom panel with tabs

```ts
export interface RegionSpec {
    /** Stable id, used for persistence ("left", "right", "bottom", or per-engine ids). */
    id: string;

    tabs: PanelTab[];
    activeTabId: string;
    onSelectTab(tabId: string): void;

    width?: { default: number; min: number; max: number };   // left/right only, px
    height?: { default: number; min: number; max: number };  // bottom only, px

    /** Shell draws the collapse chevron; adapter may forbid it. */
    collapsible?: boolean;
    collapsed?: boolean;
    onToggleCollapsed?(): void;

    /**
     * The body is a **stack of tab groups** instead of one strip. Needed because the model really nests:
     * the left area is `Pages|User Widgets|User Actions` (weight 0.8) above
     * `Components Palette` (1.7). Each section keeps its own strip and its own selection; two or more are
     * separated by a draggable row splitter whose default comes from `weight`. When present, `tabs` is only
     * the flat union (placeholders and the pre-structure renderer).
     */
    sections?: RegionSectionSpec[];

    /**
     * A second column rendered next to the tabs. `content` is a plain panel (the LCD designer's page list);
     * `tabs` makes it a tab group with its own strip (EEZ's *Widgets Structure* column). Only the left
     * region supports this.
     */
    secondary?: SecondarySpec;

    /** Pinned footer inside the region (e.g. the EEZ page-size / grid row). */
    footer?: ReactNode;
}

export interface RegionSectionSpec {
    /** Stable id — the split and the group's selection are remembered per `(kind, region, section)`. */
    id: string;
    tabs: PanelTab[];
    activeTabId?: string;
    onSelectTab?(tabId: string): void;
    /** The model's relative weight, until the user drags the splitter. */
    weight?: number;
}

export interface PanelTab {
    id: string;
    label: string;
    icon?: ReactNode;
    /** Rendered when this tab is active. */
    content: () => ReactNode;
    /** Live count badge (Checks errors, Search hits). */
    badge?: () => number | undefined;
    /** Disabled with a title, e.g. a tab that only exists for another project type. */
    disabled?: boolean;
    /** Shell shows a close affordance; adapter handles onClose. */
    closable?: boolean;
    onClose?(): void;
    /** Tabs the user may not switch away from silently (unsaved edits). */
    confirmOnClose?: () => boolean | Promise<boolean>;
}

export interface SecondarySpec {
    id: string;
    defaultWidth: number;
    min: number;
    max: number;
    /** Plain content… */
    content?: () => ReactNode;
    /** …or a tab group with its own strip (mutually exclusive with `content`). */
    tabs?: PanelTab[];
    activeTabId?: string;
    onSelectTab?(tabId: string): void;
    /** `start` (outer edge, default) or `end` (facing the canvas). */
    side?: "start" | "end";
    collapsed?: boolean;
    onToggleCollapsed?(): void;
}
```

**Why tabs and not "one component per slot":** see [`design.md`](./design.md) §5. The EEZ workbench's left
area is a tab set in the layout model (`layout-models.tsx:62-186`, `PAGES_TAB` … `COMPONENTS_PALETTE_TAB`),
and its right border holds `STYLES_TAB / FONTS_TAB / BITMAPS_TAB / THEMES_TAB / LVGL_GROUPS_TAB`
(`layout-models.tsx:273-288`). The HVAC side has exactly one tab per region, which is the degenerate case.

### 3.3 `CommandRegistry`

```ts
export interface Command {
    id: string;
    title: string;
    /** Also drives enabled/disabled in the toolbar. */
    enabled(): boolean;
    /** For the menu label: "Undo Changed (Left, Top)". */
    label?(): string;
    /** Toggle state for on/off commands (rulers, grid) — added in P5; the bar renders `aria-pressed`. */
    checked?(): boolean;
    run(): void | Promise<void>;
}

export interface CommandRegistry {
    get(id: CommandId): Command | undefined;
    all(): Command[];
}

export type CommandId =
    | "undo" | "redo" | "save"
    | "zoomIn" | "zoomOut" | "zoomFit" | "zoomReset"
    | "toggleRulers" | "toggleGrid"
    | "delete" | "selectAll";
```

P1–P4: each engine keeps its own toolbar; the registry only exposes `undo/redo/save/zoom*` so the shell's
menu bar and keyboard shortcuts can reach them. P5 renders a single unified toolbar **from** the registry.

---

## 4. `ViewportAdapter`

```ts
export interface ViewportAdapter {
    getZoom(): number;                  // 1 = 100%
    setZoom(zoom: number): void;
    zoomToFit(): void;
    panBy(dx: number, dy: number): void;
    rulers?: {
        h: boolean; v: boolean;
        set(h: boolean, v: boolean): void;
    };
    grid?: {
        visible: boolean;
        snap: boolean;
        set(visible: boolean, snap: boolean): void;
    };
}
```

### 4.1 HVAC implementation (all APIs already exist)

| Adapter member | Existing engine call |
|---|---|
| `getZoom()` | `T3Gv.docUtil.GetZoomFactor()` — `DocUtil.ts:907` |
| `setZoom(z)` | `T3Gv.docUtil.SetZoomFactor(z)` — `DocUtil.ts:841` |
| `zoomToFit()` | `T3Gv.docUtil.UpdateWorkArea()`, which calls `svgDoc.CalcWorkArea()` + `ApplyDocumentTransform(true)` — `DocUtil.ts:555-558` |
| `panBy` | `$('#svg-area').scrollLeft/scrollTop` via `T3Gv.docUtil.AdjustScroll(h, v)` — `DocUtil.ts:622` |
| `rulers` | `docConfig.showRulers` + `UpdateRulerVisibility()` — `DocUtil.ts:1193` |
| `grid` | `docConfig.showGrid` + `UpdateGridVisibility()` — `DocUtil.ts:1566`; `docConfig.enableSnap` + `SnapToGrid()` — `DocUtil.ts:1831` |

### 4.2 LVGL implementation

The SVG surface has **no** zoom API of its own. Zoom/pan live on the *editor*: `viewState.transform`
(`flow/editor/transform.ts:19`, applied as a CSS transform on `.eez-canvas` in `flow/editor/editor.tsx:930-938`).

```ts
getZoom()            => viewState.transform.scale
setZoom(z)           => viewState.transform.scale = z          // observably reactive
zoomToFit()          => viewState.resetTransform()             // editor.tsx:813 uses this
panBy(dx, dy)        => viewState.transform._translate += (dx, dy)
```

`Transform` uses mobx observables (`transform.ts:20-22`), so writes are picked up by the canvas. The
surface's own geometry is fixed (`viewBox="0 0 w h"`, `LVGLSvgPage.tsx:1225-1227`), which is why the
overlay needs no projection (`overlay.ts:9-11`).

---

## 5. Engine seams in scope

The rule from D7: **host the engines, do not restructure them.** These are the exact seams the design uses.

### 5.1 HVAC (`src/lib/t3-hvac`)

| Seam | Signature / place | Used for |
|---|---|---|
| Work area config | `DocUtil.InitializeWorkArea({ workAreaId, svgAreaId, hRulerAreaId, vRulerAreaId, cRulerAreaId, layers?, documentWidth?, documentHeight?, documentDPI? }, isReInitialize?)` — `DocUtil.ts:182, 190-194` | P3: the container comes from the shell |
| Container selector | `OptUtil.svgDocId` = `'#svg-area'` — set at `OptUtil.ts:394`, passed as the **only** option at `UIUtil.ts:374-376` | P3: becomes configuration-driven |
| Init | `Hvac.UI.Initialize(null)` (= `new T3Opt().Initialize`, `Doc/T3Opt.ts:88`) — `Hvac.ts:37` | P1: once per document mount |
| Init (React helper) | `Hvac.IdxPageReact.initQuasar(null)` + `initPageReact()` — `IdxPageReact.ts` | P1: once per document mount |
| Teardown | `IdxPageReact.clearAutoSaveInterval()` + `clearIdx()` — `IdxPage.ts:696-700, 439-446` | P1: on unmount (best effort) |
| Selection (read) | `SelectUtil.GetTargetSelect()` — `SelectUtil.ts:225`; `ObjectUtil.GetObjectPtr(T3Gv.opt.selectObjsBlockId, false).Data` — `ObjectUtil.ts:21` | P1: right panel. **Property surface is verified** (there is no `Width`/`Height`/`Left`/`Top`/`Rotation`/`Text`; use `Frame.*`, `RotationAngle`, `StyleRecord?.Fill.Paint.Color`, `StyleRecord?.Line.Paint.Color/.Thickness`, `flags` bits, `DataID`→`TextObject.runtimeText`) — full table in [`pages/hvac-document.md`](./pages/hvac-document.md) §6.1 |
| Status seed | `RefConstant` `setStatusName`/`setStatusPos` — `RefConstant.ts:25-36`, written by `SelectUtil.ts:211-216` | P1: status bar |
| Resize | `DocUtil.HandleResizeEvent()` (100 ms debounce) — `DocUtil.ts:659` | P1: replaces the two `setTimeout` refreshes |
| Document size | `DocUtil.GetDocumentSize()` / `ResizeDocument(w, h)` — `DocUtil.ts:758, 731` | status bar |
| Modified flag | `T3Gv.opt.header.DocIsDirty` — `HeaderInfo.ts:83`, written `UIUtil.ts:244` | status bar |

**There is no selection/document event bus** in `t3-hvac` (verified: no emitter, no `T3Gv.Evt`; the
`RefConstant` "refs" are plain `{value}` boxes — `RefConstant.ts:4`). Panels therefore **poll**, exactly
like the existing code does (`TopToolbar.tsx:192` 300 ms, `T3ContextMenu.tsx:329` 150 ms,
`useStatusMessage.ts:16-23` rAF). P1 uses one shared `useEnginePoll(intervalMs)` hook so there is a single
timer per document, and P1b optionally adds a notification hook around the two mutation funnels
(`SelectUtil.SelectObjects` `:115`, `SelectUtil.SetTargetSelect` `:251`) to replace polling for selection.

### 5.2 EEZ / LVGL (`src/lib/t3-eez-studio`)

| Seam | Signature / place | Used for |
|---|---|---|
| Layout model (headless) | `LayoutModels` — `store/layout-models.tsx:18`; `borders` `:264`, `rootEditor` `:404` | D8: source of truth for panel selection |
| Tab select | `LayoutModels.selectTab(model, tabId)` — `layout-models.tsx:1161` → `Actions.selectTab` `:1174` | shell `onSelectTab` |
| Layout reset | `LayoutModels.reset()` — `:1185` | "Reset panels" command |
| Borders (project visibility) | `project.enableTabs()` — `project.tsx:2034`, driven by `Project#enableTabs` | which tabs exist for this project type |
| Editors | `EditorsStore` — `store/editor.ts:157`; `activeEditor` `:161`; `openEditor` `:424`; `refresh` `:296`; `tabs` `:281` | canvas content |
| Editor component | `getEditorComponent(object, params)` — `project/ui/EditorComponentFactory.tsx:32` | canvas content |
| Panel component | `factory(node)` in `ProjectEditor.tsx:109-295` | all region tabs — **extract into a shared module** (P2) |
| Left-tree → editor | `NavigationStore.showObjects(...)` — `store/navigation.ts:440-474` | unchanged |
| Save / modified | `projectStore.isModified` — `store/index.ts:948`; `save()` `:791` | status bar, commands |
| Checks / Output / Search / References | `outputSectionsStore.getSection(Section.X)` — `store/output-sections.tsx` | bottom dock tabs + badges |
| UI state | `uiStateStore` — `store/ui-state.ts:291` (save) / `:160` (load), file `<project>-ui-state` | layout persistence decision (see below) |
| QR/query hand-off | `EezStudioApp.tsx:203-403` (`?open`, `?new`, `?examples`, `?folder`, `?type`, `?name`, `?location`, `?createDirectory`) | P2/P4: moves into the LVGL adapter |

**Layout persistence after D8.** `uiState.layoutModel` still round-trips, because the model is kept. The
shell persists only its own extras (region widths, collapsed flags) under a new key
`localStorage["t3.designer.layout"]`, namespaced per kind. FlexLayout's own saved layout keeps working for
the *inner* models (`fonts`, `bitmaps`, `styles`, `themes`, `lvglGroups`, `scpi`, `texts`, `scrapbook`) which
are untouched.

**FlexLayout rendering.** `FlexLayout.Layout` (`eez-studio-ui/FlexLayout.tsx:21-37`) is no longer rendered
for the *root* model (`rootEditor` / `rootEditorForIEXT`): the shell draws those areas. Inner models keep
`FlexLayout.Layout`, so `FontEditor.tsx:616`, `BitmapsNavigation.tsx:87`, `StylesNavigation.tsx:85`,
`theme.tsx:304`, `texts/navigation.tsx:331`, `lvgl/groups.tsx:469` and the rest are unaffected.

---

## 6. The status contract

The shell's status bar consumes the **existing** cross-engine contract rather than inventing one:

```ts
window.dispatchEvent(new CustomEvent("t3-editor-status", { detail: status }));
// producer precedent: features/design-hub/hooks/useEditorCommands.tsx:31
// consumer:           features/design-hub/components/EditorStatusBar.tsx:44-45
// documented:         docs/t3000/design-hub/README.md:134
```

```ts
export interface StatusPublisher {
    set(partial: EditorStatus): void;
    clear(): void;
}
export interface EditorStatus {
    name?: string;
    coords?: string;        // "x, y"
    size?: string;          // "w × h"
    zoom?: string;          // "100%"
    message?: string;
    saved?: boolean;        // drives the Saved/Unsaved chip
    errors?: number;
    warnings?: number;
}
```

P1 reuses `EditorStatusBar` (`features/design-hub/components/EditorStatusBar.tsx:18`) as-is in the shell's
status slot, and the HVAC adapter publishes through it (the engine itself keeps writing its process-wide
`RefConstant` scalars; a small poller in the adapter converts them into events).

---

## 7. Shell → engine: what the shell is allowed to do

| Allowed | Not allowed |
|---|---|
| Render the adapter's React nodes anywhere in its slots | Import `t3-hvac` / `t3-eez-studio` from the shell |
| Resize the canvas host and tell the adapter (debounced) | Measure or mutate engine internals |
| Draw panel chrome, tabs, splitters, status, dock | Reach into engine DOM outside the canvas host |
| Call adapter commands (undo/save/zoom…) | Own engine state, or keep a second copy of it |
| Persist region widths / collapsed flags | Persist engine document state |

## 8. Lifecycle contract

```
mount:   route resolves kind ──▶ lazy import adapter ──▶ shell renders slots
         ──▶ content host ref set ──▶ adapter.mount({host,…})   (exactly once)
         ──▶ engine opens/creates the document

render:  adapter.useLayout() re-runs on engine/model change ──▶ shell re-renders slots
         (shell never re-mounts the content host on a re-render — keyed by document id)

resize:  ResizeObserver on the content host ──▶ adapter.onAreaResize?() (debounced 100 ms)
         HVAC → docUtil.UpdateWorkArea();  LVGL → nothing (CSS transform scales)

navigate away:
         shell unmounts slots ──▶ adapter disposer (unsubscribe, clear timers)
         ──▶ engine teardown (best effort) ──▶ next document mounts fresh
```

**No suspend/resume**, no keep-alive, no tabs (D3). A document's state lives where it already lives: the
drawing record in the DB / `DataOpt` for HVAC, the project file + `projectStore` for LVGL.
