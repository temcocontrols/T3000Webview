/**
 * Designer — the contracts between the shell and a document adapter.
 *
 * The shell knows nothing about any engine; an adapter supplies the content of every area.
 * See `docs/t3000/architecture/designer/interfaces.md` for the full specification.
 */
import type { ReactElement, ReactNode } from "react";
import type { DocumentKind, EngineId } from "./kinds";

/* ------------------------------------------------------------------ regions */

export interface PanelTab {
    id: string;
    label: string;
    icon?: ReactNode;
    /** Rendered when this tab is active. */
    content: () => ReactNode;
    /** Live count shown as a chip (Checks errors, search hits…). Evaluated during the shell's render. */
    badge?: () => number | undefined;
    /**
     * …or a **self-updating element** for the same slot, when the number can change while the shell does not
     * re-render — the shell only re-renders when its layout changes, and the dock is usually *closed* while a
     * check or a build runs. The element observes its own source (EEZ's `OutputSectionIcon` /
     * `OutputSectionCount`), so it cannot go stale.
     */
    badgeElement?: ReactNode;
    disabled?: boolean;
    /** Show a close affordance; the adapter handles `onClose`. */
    closable?: boolean;
    onClose?: () => void;
    /**
     * Force/forbid the panel header for a single-tab region.
     * `auto` (default) renders a header only when the region has more than one tab.
     */
    header?: "auto" | "always" | "never";
}

/** A second column rendered next to a region's tab body (e.g. a page list next to a toolbox). */
export interface SecondarySpec {
    id: string;
    /** Plain content — a single panel, as the LCD designer's page list. */
    content?: () => ReactNode;
    /**
     * …or a tab group, drawn with its own strip exactly like a section. EEZ's left area has a second full
     * column (the live model's *Widgets Structure*), which the old page showed with its own tabset strip.
     */
    tabs?: PanelTab[];
    activeTabId?: string;
    onSelectTab?: (tabId: string) => void;
    defaultWidth: number;
    min: number;
    max: number;
    /**
     * Which side of the region body to draw it on. `start` (default) is the outer edge, `end` is the edge
     * facing the middle area — the LCD designer needs `end` to keep its Toolbox · Pages · Canvas order.
     */
    side?: "start" | "end";
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
}

/**
 * One tab group inside a region body.
 *
 * A region's body is normally a single tab strip (`RegionSpec.tabs`). EEZ's left area is **nested**: the live
 * model (measured) is a row holding `[ Pages | User Widgets | User Actions ]` *above* `[ Components Palette ]`,
 * with a second column beside it. Drawing all of that as one strip is what made the left panel's bottom area
 * disappear, so a region may instead carry `sections`.
 */
export interface RegionSectionSpec {
    /** Stable id: the section's active tab and its share of the body are remembered per section. */
    id: string;
    tabs: PanelTab[];
    activeTabId?: string;
    onSelectTab?: (tabId: string) => void;
    /**
     * The model's relative weight for this group (FlexLayout `weight`). The shell turns the weights into
     * fractions of the body and remembers the user's own split afterwards; it never has to measure the body
     * to lay the default out.
     */
    weight?: number;
}

/**
 * A **vertical tab bar** pinned to a region's outer edge — the old page's *border*.
 *
 * FlexLayout draws a border as a bar of rotated tabs along the window edge whose selected tab opens a column
 * beside it, and both sides of the LVGL document have one (Styles · Fonts · Bitmaps · Themes · Groups ·
 * Breakpoints · Variables on the right, Texts · Scpi · Instrument commands · Extensions · Changes on the
 * left). Re-drawing that as a horizontal strip is what squeezed eight tabs into one 260 px panel, so the
 * shape is part of the contract: the shell draws the bar, the document owns the selection.
 *
 * `activeTabId === undefined` is the bar's *collapsed* state — the origin's default, and a click on the
 * already open tab returns to it.
 */
export interface RailSpec {
    tabs: PanelTab[];
    /** The open tab, or `undefined` while the rail column is closed. */
    activeTabId?: string;
    /** Click: select the tab, or close the rail when it is already the open one. */
    onSelectTab: (tabId: string) => void;
    /** Width of the column the open tab renders in (the border's `size` in the model: 240 px). */
    width: number;
    /** The region edge the bar is pinned to — the window edge, not the middle area's side. */
    side: "left" | "right";
    /** Accessible name for the bar (`"Right panels"`). */
    label: string;
}

export interface RegionSpec {
    /** Stable id, also the persistence key inside a document kind ("left", "right", "bottom"). */
    id: string;
    tabs: PanelTab[];
    activeTabId: string;
    onSelectTab: (tabId: string) => void;
    /** Left/right only. */
    width?: { default: number; min: number; max: number };
    /** Bottom only. */
    height?: { default: number; min: number; max: number };
    collapsible?: boolean;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
    /**
     * "Bring this region into view" — a counter that changes when the **engine** asks for one of its panels
     * (`projectEezLayout` for LVGL: EEZ's `selectTab`, i.e. Check → *Checks*, a failed Build → *Output*, a
     * search → *Search References*).
     *
     * A *change* of this number is a request, not a state: the shell opens the region for it even when the
     * user had collapsed it, because a click on Build/Check that draws nothing is read as a dead button. The
     * document must not bump it for the user's own clicks in the region's strip (those already carry the
     * shell's own open/close decision), otherwise the dock could never be closed again.
     */
    revealRevision?: number;
    secondary?: SecondarySpec;
    /** A vertical tab bar on the region's outer edge — see `RailSpec`. */
    rail?: RailSpec;
    footer?: ReactNode;
    /**
     * The body is a **stack of tab groups** instead of `tabs`. Used when the model really has several
     * tabsets in one area (EEZ's left column); each section keeps its own selection, and the sections =
     * two or more are separated by a draggable splitter. When present, `tabs`/`activeTabId` are ignored
     * for the body (they may still be supplied as the flat list, and are what the placeholder uses).
     */
    sections?: RegionSectionSpec[];
}

/**
 * A small inline field inside a tool group — the legacy `View & Zoom` group's editable `[100] %` box.
 *
 * A field is a *value*, not an action, so it has no `onSelect`. Folded into `⋯` it becomes an
 * informational entry instead of vanishing, because losing the ability to read the zoom would be a
 * silent loss.
 */
export interface ToolFieldSpec {
    /** The value to draw, sampled like `disabled`/`checked` (the shell polls it). */
    value: () => string;
    /** A typed value, committed on Enter or blur. Omit for a read-only readout. */
    commit?: (raw: string) => void;
    /** Drawn after the input (`%`). */
    suffix?: string;
    ariaLabel: string;
}

/**
 * One tool of the top area, **as data**.
 *
 * The single top row shows `icon + label` for every item, so the row can be too narrow for all of
 * them; the shell then folds whole groups into its `⋯` menu. That fold is only possible if a tool is
 * described rather than drawn: the same spec renders as an inline button and as a menu entry.
 */
export interface ToolItemSpec {
    id: string;
    label: string;
    /**
     * The icon element — a `ReactElement`, not the wider `ReactNode`: Fluent's `MenuItem` icon slot
     * only accepts elements (`WithSlotShorthandValue<…>`), so `ReactNode` made every folded group in
     * `ShellToolItems` fail the type check. Every tool in this designer draws a Fluent icon anyway.
     */
    icon?: ReactElement;
    /**
     * The icon to draw **while the item is on**, in place of `icon`.
     *
     * The legacy strip showed "rulers are on" this way (`RulerFilled` instead of `RulerRegular`) rather
     * than by tinting the button — see `tone`.
     */
    checkedIcon?: ReactElement;
    /**
     * How an on item shows it:
     *  · `"mode"` (default) — brand-tinted, for a tool the user *armed* (a stamp/lock mode);
     *  · `"state"` — a view state such as rulers or grid: `checkedIcon` instead of the icon and **no**
     *    background, because a permanently tinted block reads as "selected", not as "on", and makes
     *    those two buttons look like a different kind of control from every other tool.
     */
    tone?: "mode" | "state";
    /** Leaf action. Omit when the item opens a submenu (`children`). */
    onSelect?: () => void;
    /** Child actions: drawn as a dropdown inline, as a nested submenu when folded. */
    children?: ToolItemSpec[];
    /**
     * Disabled — a boolean, or a **getter** when the state lives in an engine (undo with an empty
     * stack, zoom at a limit). The shell samples getters on its poll and re-renders only when one of
     * them flips, so such an item greys out the same way the shell's own buttons do.
     */
    disabled?: boolean | (() => boolean);
    /**
     * Toggle state (a stamp/lock mode) — a boolean, or a getter sampled the same way. Brand-tinted
     * inline, check-marked in a menu; declaring it at all is what makes an item a toggle.
     */
    checked?: boolean | (() => boolean);
    /** Draw a 1px divider above this item, inside its group. */
    separatorBefore?: boolean;
    /**
     * An inline field (the legacy zoom box). An item with a field draws the field instead of a button,
     * and needs no `onSelect`.
     */
    field?: ToolFieldSpec;
}

/**
 * A group of tools. `id` identifies it; `label` titles its submenu when the row has to fold it, so it
 * must read as a heading ("Clipboard", "Transform", …).
 */
export interface ToolGroupSpec {
    id: string;
    label: string;
    items: ToolItemSpec[];
}

/**
 * An entry of the top area's overflow menu (`⋯` at the end of the row).
 *
 * Documents use it for commands that are not part of a tool group (a destructive "Clear", a
 * background-colour choice) and for anything that must never take space in the row.
 */
export interface TopOverflowItem {
    id: string;
    label: string;
    onSelect: () => void;
    disabled?: boolean;
    /** Draw a separator above this entry (use it to keep a destructive command apart). */
    separatorBefore?: boolean;
}

export interface TopSpec {
    /**
     * The document's tools as **foldable groups** — the preferred form.
     *
     * Every item is drawn `icon + label`; groups are separated by a 1px divider; groups that do not fit
     * fold into `⋯` as submenus, so nothing is ever hidden silently and the row never wraps.
     */
    groups?: ToolGroupSpec[];
    /**
     * Tools as one opaque node, for an engine that renders its own toolbar (EEZ's `Toolbar`) or for a
     * portal target (the LCD page's Design/View toggle). It occupies the flexible part of the row and
     * cannot fold — use `groups` when the tools are the document's own commands.
     */
    tools?: ReactNode;
    /** @deprecated Alias of `tools`, kept so a document can be migrated one bar at a time. */
    content?: ReactNode;
    /** Extra entries of the overflow menu, drawn after the shell's own. */
    overflow?: TopOverflowItem[];
    /**
     * A cluster **pinned to the band's right end** — the document's mode switch (LVGL: *Edit · Run · Debug ·
     * Full Sim · Deploy*).
     *
     * Unlike `groups` it is never folded into `⋯` and never measured: it is the way out of Run / Debug /
     * Full Sim, so it has to be there whatever the window is. The shell owns the slot (position, the 1 px
     * rule before it, that it sits after the trailing controls) — the document owns the buttons, because
     * their state (selected mode, a build in progress, the runtime's error) lives in the engine.
     */
    modeBar?: ReactNode;
    /**
     * Which of the shell's own clusters the trailing area still draws.
     *
     * A document that declares these controls as its **own tool groups** (HVAC's `History & Save` and
     * `View & Zoom`, mirroring the legacy strip) switches the shell's copies off, so a command exists
     * exactly once. Omitted means "both" — the default for a document that has no such groups.
     */
    shellControls?: {
        /** The undo/redo buttons. `ShellLayout.history` still drives the keyboard either way. */
        history?: boolean;
        /** The command strip (save, zoom, rulers, grid) and its `View` menu. */
        viewport?: boolean;
    };
}

/**
 * Undo/redo as seen by the shell. Optional: documents whose engine has no history simply omit it.
 *
 * The *state* of the stack lives in the engine (which React cannot observe), so the shell polls
 * `canUndo()`/`canRedo()` — the same reason every other engine value is polled (`useEnginePoll`).
 */
export interface HistorySpec {
    canUndo?: () => boolean;
    canRedo?: () => boolean;
    undo: () => void;
    redo: () => void;
}

export type ContentSpec = { node: ReactNode } | { mount: (host: HTMLElement) => () => void };

export interface ShellLayout {
    top?: TopSpec;
    left?: RegionSpec;
    right?: RegionSpec;
    /**
     * Content for the **middle area**, for a document that renders its own node into it.
     *
     * Optional: when the areas are owned by `DesignerLayout`, the document itself is rendered into the
     * middle area by the router (`DesignerShell.children`) and no content node is published at all —
     * which is what all three shipped documents do.
     */
    content?: ContentSpec;
    /**
     * A strip **above** the content — the editor tabs of an engine that keeps several editors open (EEZ:
     * one chip per open page/flow editor, with its close button).
     *
     * The document owns the node *and* its chrome (including its height), because the tabs and their state
     * live in the engine's store; the shell only puts it in the middle column, above the content host — never
     * around it, since that host is mounted once and never re-keyed. Rendered as-is: a node that has nothing
     * to show returns `null` and costs no space.
     */
    contentTabs?: ReactNode;
    bottom?: RegionSpec & { defaultCollapsed?: boolean };
    /**
     * The id the frame's root element should carry.
     *
     * The HVAC engine takes a Hammer gesture surface on `#main-app` (`DrawUtil.PreDragDropOrStamp`)
     * and that surface has to be the whole editor, not just the drawing area — so the id travels to the
     * frame root instead of the document drawing its own wrapper around the shell.
     */
    frameRootId?: string;
    /** Enables the shell's undo/redo buttons in the top bar. */
    history?: HistorySpec;
    /** Extra status-bar chips drawn after the shared editor status bar. */
    statusExtra?: ReactNode;
}

/* ------------------------------------------------------------------ commands */

export type CommandId =
    | "undo"
    | "redo"
    | "save"
    | "zoomIn"
    | "zoomOut"
    | "zoomFit"
    | "zoomReset"
    | "toggleRulers"
    | "toggleGrid"
    | "delete"
    | "selectAll";

export interface Command {
    id: CommandId | string;
    title: string;
    enabled(): boolean;
    label?(): string;
    /** Toggle state, for commands that switch something on/off (rulers, grid). */
    checked?(): boolean;
    run(): void | Promise<void>;
}

export interface CommandRegistry {
    get(id: CommandId | string): Command | undefined;
    all(): Command[];
}

export interface ViewportAdapter {
    /** 1 = 100%. */
    getZoom(): number;
    setZoom(zoom: number): void;
    zoomToFit(): void;
    panBy(dx: number, dy: number): void;
    rulers?: { h: boolean; v: boolean; set(h: boolean, v: boolean): void };
    grid?: { visible: boolean; snap: boolean; set(visible: boolean, snap: boolean): void };
}

/* --------------------------------------------------------------- mount/render */

export interface EditorStatus {
    name?: string;
    coords?: string;
    size?: string;
    /**
     * Percentage, e.g. 100 — `EditorStatusBar` renders `Math.round(zoom)%`.
     *
     * `null` **clears** the chip: the bar's listener keeps its own value only while this field is
     * `undefined`. A document with no zoom of its own — the EEZ/LVGL one, whose toolbar already carries the
     * `− 100 % + ↺` cluster — publishes `null`, so the percentage of the document before it cannot linger in
     * the shared bar.
     */
    zoom?: number | null;
    message?: string;
    saved?: boolean;
    errors?: number;
    warnings?: number;
}

/** Publishes into the app-wide `t3-editor-status` window event (consumed by `EditorStatusBar`). */
export interface StatusPublisher {
    set(partial: EditorStatus): void;
    clear(): void;
}

export interface MountContext {
    kind: DocumentKind;
    /** Optional document id from the route (`/t3000/designer/<kind>/<id?>`). */
    id?: string;
    query: URLSearchParams;
    status: StatusPublisher;
    navigate: (to: string, options?: { replace?: boolean }) => void;
}

/**
 * What a document runtime hands the shell on every render.
 * Returned by a plain React hook (`useHvacDocumentRuntime`), so the shell stays reactive without
 * calling hooks through an object.
 */
export interface DocumentRuntime {
    layout: ShellLayout;
    title: string;
    subtitle?: string;
    modified?: boolean;
    /** Values for the shared status bar (name / coords / message). */
    status?: EditorStatus;
    /** Rendered over the content slot while the document loads (it stays mounted!). */
    loading?: ReactNode;
    /** Rendered over the content slot when the document failed to load. */
    error?: ReactNode;
    /**
     * Called (debounced) when the **drawing area moved or changed size** — a side panel collapsed or expanded,
     * the dock opened, the window resized.
     *
     * A document whose engine owns the drawing surface re-lays out here: the surface has to fit the new area
     * (otherwise the tail of it, scrollbar included, is clipped away and unreachable) and the numbers the
     * engine converts clicks with have to be re-read *afterwards*, or every click is off by the panel's width.
     *
     * Documents that do not own such a surface leave it unset.
     */
    onAreaResize?: () => void;
}

export interface DocumentAdapter {
    kind: DocumentKind;
    engine: EngineId;
    /** Optional: for engines that own their DOM directly. HVAC/LVGL use React content instead. */
    commands?: CommandRegistry;
    viewport?: ViewportAdapter;
}
