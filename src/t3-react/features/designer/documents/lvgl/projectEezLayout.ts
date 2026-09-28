/**
 * Designer / LVGL — projects EEZ's FlexLayout **model** into the shell's regions.
 *
 * This is the core of P2 (D8: *keep the model, drop its rendering*). EEZ describes its workbench as a
 * FlexLayout model tree — borders plus a root row of tabsets (`project-editor/store/layout-models.tsx`)
 * — and ~40 call sites switch panels with `layoutModels.selectTab(model, TAB_ID)`. The unified shell
 * renders those panels itself, so it needs to know **which tabs exist, in which region, and which one
 * is selected** — nothing more. The model keeps working untouched; only the drawing is replaced.
 *
 * The P2.0 spike proved the model is fully usable without being rendered (`tabs`, `actualTabsetID`,
 * `openEditor`, `activateEditor`, `refresh` all read/write the model only), so this module can be pure
 * — no React, no mobx, no DOM — and is therefore unit-testable against fixture JSON
 * (`test/vitest/__tests__/designer-lvgl-projection.test.ts`).
 *
 * ## How the areas are classified
 *
 * Borders are explicit (`left`/`right`/`bottom` by location). The root row's children are `[ <left columns>,
 * <canvas tabset>, <right columns> ]` — in **every** root model EEZ ships, which is the one shape the layout
 * keeps constant while everything else about it changes (measured: the left border is empty, the left area is a
 * row of two stacked tabsets, and *Widgets Structure* is a top-level sibling). So the canvas tabset is what
 * splits the row, and each child is classified by **where it sits against it**:
 *
 * | child | side |
 * |---|---|
 * | the canvas tabset — `EDITORS`, `RUNTIME-EDITORS`, or the full simulator's *Preview* | **canvas** |
 * | before it | **left** |
 * | after it | **right** |
 *
 * The canvas is identified by its declared id first (the runtime model's tabset is empty until EEZ adds the
 * runtime's editor tab to it, so its *contents* cannot be used at the moment of the switch), then by the
 * component it holds. When no canvas tabset can be identified at all — a hand-made model — the old
 * content rule takes over (`PROPERTIES` → right, anything else → left).
 *
 * ## The model is not one model
 *
 * `layoutModels.root` is a computed that EEZ swaps per mode (`store/layout-models.tsx:226-234`):
 * `rootEditor` while editing, `rootRuntime` for Run/Debug (*Active Flows* · *Watch* on the left,
 * *Queue* · *Logs* on the right, and no *Properties* anywhere), `rootDockerSimulator` for Full Sim (the
 * *Preview* is the canvas and the right column is *Build Logs* over *Preview Logs*). Projecting whichever
 * model is the root *now* is what makes the shell follow the mode; a projection memoised on the project
 * store alone kept drawing the editor's panels after **Run** was pressed.
 *
 * ## How the structure survives
 *
 * A side's children are *columns*, and a column that is a row of tabsets is a **stack**. Both are reported:
 *
 * - `sections` — the body is a stack (measured: *Pages | User Widgets | User Actions* above *Components
 *   Palette*, weights 0.8 / 1.7);
 * - `secondary` — the side has a second column (measured: *Widgets Structure*, weight 13.97 against the
 *   body's 18.43).
 *
 * Flattening all of that into one tab list is what made the left panel's bottom area disappear, so the flat
 * `panels` list is now only the *union* (kept for the shell's flat path, for the placeholder, and for tests).
 */
import * as FlexLayout from "flexlayout-react";

import type { EezEditorMode } from "project-editor/activeProject";

/** One panel the shell can render in a region. */
export interface ProjectedPanel {
    /** FlexLayout tab id — also the key `layoutModels.selectTab(model, id)` expects. */
    id: string;
    /** The tab's label, as EEZ shows it (badges are added by the caller). */
    name: string;
    /** The registry key: `getPanelComponent(component, ctx)`. */
    component: string;
}

export interface ProjectedRegion {
    /** Every panel of the region, in model order — the flat superset of `sections`/`secondary`. */
    panels: ProjectedPanel[];
    /**
     * The selected tab of the region's **first** group, or undefined when the region has none. Kept for the
     * flat case and for callers that only need "what should open first".
     */
    activeTabId?: string;
    /**
     * The region body as a **stack of tab groups**, when the model's body really is one (EEZ's left column:
     * *Pages | User Widgets | User Actions* above *Components Palette*). Absent when the body is a single
     * tabset — every region of the HVAC/LCD documents and the right/bottom regions of LVGL stay flat.
     */
    sections?: ProjectedSection[];
    /** The region's **second column** — a sibling area of the same root row (LVGL's *Widgets Structure*). */
    secondary?: ProjectedSection;
    /**
     * The region's **own column** — the body, without its border. A region with a border needs this: the flat
     * `panels` list is the union of both, and drawing that union in one strip is exactly what put eight
     * right-side tabs (Properties + the border's seven) into a 260 px panel.
     */
    body?: ProjectedSection;
    /**
     * The side's **border** — the old page drew these as a vertical tab bar on the window edge (LVGL's right
     * border holds Styles · Fonts · Bitmaps · Themes · Groups · Breakpoints · Variables, its left border Texts ·
     * Scpi · Instrument commands · Extensions · Changes). A border keeps its selection on itself, so
     * `activeTabId` is `undefined` while the border is closed — that is flexlayout's own collapsed state, and
     * clicking the selected tab toggles it.
     */
    border?: ProjectedSection;
    /** Root-row weight of the body column (same scale as `secondaryWeight`), when there is a second column. */
    bodyWeight?: number;
    /** Root-row weight of the second column. The document sizes the column from the two weights. */
    secondaryWeight?: number;
}

/** One tab group inside a region. */
export interface ProjectedSection {
    /** Stable id — the tabset's declared id when it has one, else flexlayout's generated one. */
    id: string;
    panels: ProjectedPanel[];
    activeTabId?: string;
    /** The tabset's own weight (its siblings' scale): the region's vertical split for a stack. */
    weight?: number;
}

/** A region's group list before it is turned into sections/secondary. */
interface Group {
    id: string;
    panels: ProjectedPanel[];
    activeTabId?: string;
    weight?: number;
    /** A row of tabsets (a vertical stack) rather than a single tabset. */
    stacked?: Group[];
}

/**
 * A **stable** id for a group.
 *
 * flexlayout regenerates tabset ids when it parses a model (and a tab EEZ declared without an `id` gets one
 * too), so `#<uuid>` is useless as a key: the remembered split and the per-group selection would be lost on
 * every reload. The tabs' *components* are stable, so they are what the id falls back to.
 */
function groupId(node: FlexLayout.Node, panels: ProjectedPanel[], fallback: string): string {
    const declared = tabsetJsonId(node as FlexLayout.TabSetNode);
    if (declared) {
        return declared;
    }

    const fromComponents = panels.map((panel) => panel.component || panel.id).join("+");
    return fromComponents || node.getId() || fallback;
}

/** `Group` for one tabset. */
function groupOfTabset(tabset: FlexLayout.TabSetNode, fallbackId: string): Group {
    const panels = collectPanels(tabset);
    return {
        id: groupId(tabset, panels, fallbackId),
        panels,
        activeTabId: firstSelectedTabId(tabset),
        weight: (tabset as any).getWeight?.() ?? undefined
    };
}

/** `Group` for a row whose children are all tabsets: one *column* that stacks them. */
function groupOfStack(row: FlexLayout.RowNode, tabsets: FlexLayout.TabSetNode[]): Group {
    const panels = tabsets.flatMap((tabset) => collectPanels(tabset));
    return {
        id: groupId(row, panels, row.getId()),
        panels,
        activeTabId: firstSelectedTabId(row),
        weight: (row as any).getWeight?.() ?? undefined,
        stacked: tabsets.map((tabset, index) => groupOfTabset(tabset, `${row.getId()}:${index}`))
    };
}

/**
 * The **columns** of one side, in model order.
 *
 * FlexLayout alternates the split orientation with nesting depth (the root row is horizontal), which is why
 * EEZ wraps its left area in extra rows to get two side-by-side columns inside a vertical area. Rather than
 * hard-code depths, the walk looks through a single-child wrapper row and decides from what a row *contains*:
 *
 * - all children tabsets → the row is one column that **stacks** them (the nested left column);
 * - otherwise → the children are the columns of this side.
 *
 * The template (`layout-models.tsx`) and the *live* model are different shapes — the template is
 * `row → row → [row[tabset,tabset], tabset]`, the live model is `[row[tabset,tabset], tabset]` — and both
 * walk to the same two columns, which is the point of classifying by content.
 */
function columnsOf(node: FlexLayout.Node | undefined): Group[] {
    if (!node) {
        return [];
    }

    if (node instanceof FlexLayout.TabSetNode) {
        return [groupOfTabset(node, node.getId())];
    }

    const children = node instanceof FlexLayout.RowNode ? (node.getChildren() as FlexLayout.Node[]) : [];
    if (children.length === 1 && children[0] instanceof FlexLayout.RowNode) {
        // A wrapper row that exists only to give its child the right split orientation — look through it.
        return columnsOf(children[0]);
    }

    const tabsets = children.filter((child): child is FlexLayout.TabSetNode => child instanceof FlexLayout.TabSetNode);
    if (children.length > 0 && tabsets.length === children.length) {
        return [groupOfStack(node as FlexLayout.RowNode, tabsets)];
    }

    return children.flatMap((child) => columnOfNode(child));
}

/** One column from a node that is not itself a column container. */
function columnOfNode(node: FlexLayout.Node): Group[] {
    if (node instanceof FlexLayout.TabSetNode) {
        return [groupOfTabset(node, node.getId())];
    }

    const children = node instanceof FlexLayout.RowNode ? (node.getChildren() as FlexLayout.Node[]) : [];
    const tabsets = children.filter((child): child is FlexLayout.TabSetNode => child instanceof FlexLayout.TabSetNode);
    if (children.length > 0 && tabsets.length === children.length) {
        return [groupOfStack(node as FlexLayout.RowNode, tabsets)];
    }

    return children.flatMap((child) => columnOfNode(child));
}

/**
 * `Group` for a border. FlexLayout wraps a border's `children` in one tabset, so a border is a single group
 * with its own strip — that is how EEZ draws it, outside the root row.
 */
function groupOfBorder(border: FlexLayout.Node, location: string): Group {
    return {
        id: `border:${location}`,
        panels: collectPanels(border),
        activeTabId: selectedBorderTabId(border)
    };
}

/**
 * The id of a **border's** selected tab, or `undefined` while the border is closed.
 *
 * A border keeps the selection on *itself* — `getSelected()` is an index into its children and `-1` means
 * closed — which is why `firstSelectedTabId` cannot answer for it: a border has no child tabset to ask.
 */
function selectedBorderTabId(border: FlexLayout.Node): string | undefined {
    if (!(border instanceof FlexLayout.BorderNode)) {
        return undefined;
    }

    const index = border.getSelected();
    const children = border.getChildren();
    const selected = index >= 0 ? children[index] : undefined;
    return selected instanceof FlexLayout.TabNode ? selected.getId() : undefined;
}

/**
 * Turns one side's areas into the shell's region shape.
 *
 * `columns` are the root row's children for that side, in model order (they run from the canvas outwards on
 * the right, and from the window edge inwards on the left). `border` is that side's border, which FlexLayout
 * draws *around* the root row — a separate strip in the old page, which the shell has no third column for, so
 * its tabs join the flat strip in the position the old page drew them (`first` on the left, `last` on the
 * right).
 *
 * The **body** is therefore the first *column*, not the border: that is what keeps EEZ's *Properties* tabset
 * (the right side's only column) the region's default tab, as it always was.
 *
 * Nothing is dropped — the flat `panels` list is always the union of every area, so a shape the shell cannot
 * draw keeps its tabs visible.
 */
function regionFromGroups(
    columns: Group[],
    border: Group | undefined,
    borderPosition: "first" | "last"
): ProjectedRegion {
    const present = columns.filter((group) => group.panels.length > 0);
    const borderPanels = border?.panels ?? [];
    const columnPanels = present.flatMap((group) => group.panels);
    const flat: ProjectedRegion = {
        panels: borderPosition === "first" ? [...borderPanels, ...columnPanels] : [...columnPanels, ...borderPanels],
        activeTabId: present[0]?.activeTabId ?? border?.activeTabId
    };

    /*
     * The border, drawn **separately** from the columns: the old page put it in a vertical tab bar on the
     * window edge while the columns kept their own strips — merging them is what squeezed eight right-side
     * tabs into one 260 px strip (measured: 471 px of tabs in 228 px, five of them unreachable).
     * The flat list above still carries every panel, so a region the shell cannot draw loses nothing.
     */
    const borderSection: ProjectedSection | undefined = border
        ? { id: border.id, panels: border.panels, activeTabId: border.activeTabId }
        : undefined;

    if (present.length === 0) {
        return flat;
    }

    const [body, ...rest] = present;
    const bodyGroups = body.stacked ?? [body];

    // The column as a whole. `sections` (below) only exists for a stack of two or more, so the single-group
    // case has to report the body here or the shell falls back to the flat union.
    const bodySection: ProjectedSection = {
        id: body.id,
        panels: body.panels,
        activeTabId: body.activeTabId,
        weight: body.weight
    };

    // One column, one group: the historical shape, untouched (HVAC, LCD).
    if (present.length === 1 && bodyGroups.length === 1) {
        return {
            ...flat,
            body: bodySection,
            ...(borderSection ? { border: borderSection } : {})
        };
    }

    // Sections are keys the shell remembers a split by, so two groups with the same fallback id (two
    // "Changes" tabs, say) must not collide.
    const usedIds = new Set<string>();
    const uniqueId = (base: string): string => {
        let id = base;
        let suffix = 2;
        while (usedIds.has(id)) {
            id = `${base}#${suffix++}`;
        }
        usedIds.add(id);
        return id;
    };

    const sections: ProjectedSection[] = bodyGroups.map((group) => ({
        id: uniqueId(group.id),
        panels: group.panels,
        activeTabId: group.activeTabId,
        weight: group.weight
    }));

    const second = rest[0];
    const secondary: ProjectedSection | undefined = second
        ? {
              id: uniqueId(second.id),
              panels: [
                  ...second.panels,
                  // A third (or later) column has nowhere of its own to go — the shell draws two columns
                  // per region. Its tabs join the second column instead of disappearing.
                  ...rest.slice(1).flatMap((extra) => extra.panels)
              ],
              activeTabId: second.activeTabId,
              weight: second.weight
          }
        : undefined;

    // `sections` only when the body really is a stack: a single group is drawn by the flat path, and the
    // shell keeps every existing document on that path.
    return {
        ...flat,
        body: bodySection,
        ...(sections.length > 1 ? { sections } : {}),
        ...(secondary ? { secondary } : {}),
        ...(secondary ? { bodyWeight: body.weight, secondaryWeight: secondary.weight } : {}),
        ...(borderSection ? { border: borderSection } : {})
    };
}

export interface EezLayoutProjection {
    left: ProjectedRegion;
    right: ProjectedRegion;
    bottom: ProjectedRegion;
    /** The tabset the editor tabs are added to — its **runtime** id (flexlayout regenerates ids on
     *  parse; `EDITORS_TABSET_ID` is only the declared one, see `tabsetJsonId`). */
    canvasTabsetId: string | null;
}

/**
 * The tabset ids EEZ declares for the tabset its **editor tabs** go into — one per root model
 * (`LayoutModels.EDITOR_MODE_EDITORS_TABSET_ID` / `RUNTIME_MODE_EDITORS_TABSET_ID`).
 *
 * Both matter: Run/Debug switch `layoutModels.root` to `rootRuntime`, whose editor tabset is
 * `RUNTIME-EDITORS` — and that tabset is empty until EEZ adds the runtime's editor tab to it, so the id
 * is the only reliable way to recognise the canvas at the moment of the switch.
 */
export const EDITORS_TABSET_ID = "EDITORS";
export const RUNTIME_EDITORS_TABSET_ID = "RUNTIME-EDITORS";
const CANVAS_TABSET_IDS = [EDITORS_TABSET_ID, RUNTIME_EDITORS_TABSET_ID];

/**
 * The component the **full simulator** model puts in the canvas: its *Preview* tab (`rootDockerSimulator`),
 * which is a panel rather than an editor — the preview *is* the canvas in that mode.
 */
const CANVAS_PANEL_COMPONENTS = ["editor", "dockerSimulatorPreview"];

/** The tab that means "this side is the properties side" (mirrors `LayoutModels.PROPERTIES_TAB_ID`). */
export const PROPERTIES_TAB_ID = "PROPERTIES";

const EMPTY_REGION = (): ProjectedRegion => ({ panels: [] });

/**
 * The JSON id a tabset was **declared** with, or `undefined` when flexlayout made one up.
 *
 * flexlayout **regenerates tabset ids** when it parses a model (`Model.fromJson`) and, measured, writes the
 * generated `#<uuid>` into the node's `_attributes.id` as well — so the declared id cannot be told from the
 * generated one by looking at `_attributes` alone. The `#` prefix is the difference (`EDITORS` comes back as
 * `EDITORS`, an undeclared tabset as `#70b94563-…`), and only the declared form is stable across loads.
 *
 * (EEZ's own `EditorsStore.actualTabsetID`, `store/editor.ts:167-190`, works around the same behaviour.)
 */
function tabsetJsonId(tabset: FlexLayout.TabSetNode): string | undefined {
    const attributes = (tabset as any)._attributes;
    const id = attributes && typeof attributes.id === "string" ? attributes.id : undefined;
    return id && !id.startsWith("#") ? id : undefined;
}

/** True when the tabset shows the canvas — the editor tabs, or the full simulator's preview. */
function isCanvasTabset(node: FlexLayout.Node): boolean {
    if (!(node instanceof FlexLayout.TabSetNode)) {
        return false;
    }

    const declared = tabsetJsonId(node);
    if (declared && CANVAS_TABSET_IDS.includes(declared)) {
        return true;
    }

    // Fallback for a model whose `_attributes` were rebuilt (e.g. one saved after the ids changed):
    // the tabset that already holds an editor (or the preview) is the canvas.
    return node
        .getChildren()
        .some(
            (child) =>
                child instanceof FlexLayout.TabNode &&
                CANVAS_PANEL_COMPONENTS.includes(String(child.getComponent() ?? ""))
        );
}

/** Collects every tab of a subtree (row, tabset or border), in model order. */
function collectPanels(node: FlexLayout.Node | undefined): ProjectedPanel[] {
    const panels: ProjectedPanel[] = [];
    if (!node) {
        return panels;
    }

    const visit = (current: FlexLayout.Node): void => {
        if (current instanceof FlexLayout.TabNode) {
            panels.push({
                id: current.getId(),
                name: current.getName(),
                component: String(current.getComponent() ?? "")
            });
            return;
        }

        // Rows, tabsets and borders all expose `getChildren()`; a tab never does.
        const children = (current as any).getChildren?.() ?? [];
        for (const child of children as FlexLayout.Node[]) {
            visit(child);
        }
    };

    visit(node);
    return panels;
}

/**
 * The id of the selected tab of the first tabset inside `node`, if there is one.
 * Borders have no selection of their own (they track it on the `BorderSet`), so they answer `undefined`
 * and the shell falls back to the region's first panel.
 */
function firstSelectedTabId(node: FlexLayout.Node | undefined): string | undefined {
    if (!node) {
        return undefined;
    }

    if (node instanceof FlexLayout.TabSetNode) {
        const selected = node.getSelectedNode();
        return selected ? selected.getId() : undefined;
    }

    if (node instanceof FlexLayout.RowNode) {
        for (const child of node.getChildren()) {
            const id = firstSelectedTabId(child);
            if (id) {
                return id;
            }
        }
    }

    return undefined;
}

/** True when the subtree holds a node (tabset) or a tab with this id. */
function containsNodeId(node: FlexLayout.Node | undefined, id: string): boolean {
    if (!node) {
        return false;
    }

    if (node.getId() === id) {
        return true;
    }

    if (node instanceof FlexLayout.RowNode || node instanceof FlexLayout.TabSetNode) {
        return node.getChildren().some((child) => containsNodeId(child, id));
    }

    return false;
}

/**
 * Projects the model into the shell's four content areas.
 *
 * Safe on a missing/empty model (returns empty regions) so the document can render before the EEZ app
 * has opened a project.
 */
export function projectEezLayout(
    model: FlexLayout.Model | null | undefined
): EezLayoutProjection {
    const projection: EezLayoutProjection = {
        left: EMPTY_REGION(),
        right: EMPTY_REGION(),
        bottom: EMPTY_REGION(),
        canvasTabsetId: null
    };

    if (!model) {
        return projection;
    }

    // ── borders first: EEZ renders these around the root row, and their location is explicit.
    // (`Model.getBorderSet().getBorders()`, and a border's location is an object: `.getName()`.)
    const borderGroups: Record<string, Group | undefined> = {};
    for (const border of model.getBorderSet().getBorders()) {
        const location = border.getLocation().getName();
        borderGroups[location] = groupOfBorder(border, location);
    }

    // ── the canvas first: it is what splits the root row into the two sides, and every root model EEZ
    // ships is `[ <left columns>, <canvas tabset>, <right columns> ]` — measured for the editor model
    // (left area · EDITORS · properties) and for the two others (Run/Debug: left columns · RUNTIME-EDITORS ·
    // Queue+Logs; Full Sim: Preview · the two log columns).
    const root = model.getRoot();
    const children = root.getChildren();
    const canvasIndex = children.findIndex((child) => isCanvasTabset(child));

    // ── classify each top-level child by its **position** against the canvas, and expand it into the
    // *columns* of its side (the root row is horizontal, so its children sit side by side).
    // The content rule is only the fallback, for a model whose canvas tabset cannot be identified: the
    // runtime and full-simulator models hold no *Properties* tab at all, so that rule alone sent their
    // right-hand columns to the left region.
    const leftColumns: Group[] = [];
    const rightColumns: Group[] = [];

    children.forEach((child, index) => {
        if (index === canvasIndex) {
            projection.canvasTabsetId = child.getId();
            return;
        }

        const columns = columnsOf(child);
        if (columns.every((column) => column.panels.length === 0)) {
            return;
        }

        const onTheRight = canvasIndex >= 0 ? index > canvasIndex : containsNodeId(child, PROPERTIES_TAB_ID);
        (onTheRight ? rightColumns : leftColumns).push(...columns);
    });

    // The left border is drawn at the window edge (before the columns); the right one sits outside them.
    projection.left = regionFromGroups(leftColumns, borderGroups["left"], "first");
    projection.right = regionFromGroups(rightColumns, borderGroups["right"], "last");
    projection.bottom = regionFromGroups([], borderGroups["bottom"], "first");

    // ── duplicates: same id in two regions would collide as React keys.
    const seen = new Map<string, number>();
    for (const region of [projection.left, projection.right, projection.bottom]) {
        for (const panel of region.panels) {
            seen.set(panel.id, (seen.get(panel.id) ?? 0) + 1);
        }
    }

    // A valid model cannot contain the same tab id twice (flexlayout's `Model.fromJson` and `addNode`
    // both reject it), so a duplicate here would mean EEZ moved a tab without removing it — worth a
    // loud warning rather than a React key collision.
    for (const [id, count] of seen) {
        if (count > 1) {
            console.warn(`[designer] LVGL panel "${id}" is projected ${count} times`);
        }
    }

    return projection;
}

/** Flat list of every projected panel id (used by tests and the document's tab lookup). */
export function projectedPanelIds(projection: EezLayoutProjection): string[] {
    return [
        ...projection.left.panels,
        ...projection.right.panels,
        ...projection.bottom.panels
    ].map((panel) => panel.id);
}

/**
 * What the shell draws around the canvas, for the mode EEZ is in.
 *
 * Taken from the origin (`ProjectEditor.Content`), not invented: when the runtime is on **without** the
 * debugger it returns the runtime page *before* it looks at the layout model (`ProjectEditor.tsx:312-331`), so
 * Run draws **the page alone** — no side panels, no bottom dock, only the toolbar above it. The debugger is the
 * one that uses a workbench at all (`rootRuntime`: *Active Flows · Watch* | *Queue · Logs*), and Full Sim uses
 * `rootDockerSimulator` (Preview as the canvas, the log column on the right).
 *
 * Mirrored naively — panels always projected from the model — Run mode showed the *debugger* layout, which is
 * what the user reported.
 */
export type EezRegionPlan =
    /** No project (or no model yet): labelled placeholders, so the shell keeps its shape while it boots. */
    | "placeholders"
    /** The runtime page owns the whole area: **no** left/right/bottom regions at all. */
    | "canvas-only"
    /** The panels of the model the mode selects. */
    | "projected";

export function eezRegionPlan(mode: EezEditorMode, model: unknown): EezRegionPlan {
    if (mode === "run") {
        return "canvas-only";
    }

    // A missing model is not "no panels": it is a state the shell cannot describe yet, and dropping the
    // regions there leaves an empty window with no way back. The placeholders are recoverable.
    return model ? "projected" : "placeholders";
}

/**
 * The panels a region's **own top strip** shows: its column's, never its border's.
 *
 * `region.panels` is the union (it also carries the border's tabs, for callers that cannot draw a rail).
 * Feeding that union to the strip is precisely what put eight right-side tabs into a 228 px strip — measured,
 * 471 px of tabs with five of them unreachable — so the split is a function, not a convention.
 */
export function stripPanels(region: ProjectedRegion): ProjectedPanel[] {
    return region.body ? region.body.panels : region.panels;
}
