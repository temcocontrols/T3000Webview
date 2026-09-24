/**
 * Designer — the LVGL (EEZ Studio) document on the unified shell.
 *
 * ADDITIVE BY DESIGN (D11): `/t3000/eez` keeps rendering the original `EezStudioApp`; this document is
 * only reachable through `/t3000/designer/lvgl-9-5/:id?` and `/t3000/designer/lvgl-flow-9-5/:id?`.
 *
 * ## P2.1 — host the whole workbench in the canvas slot
 *
 * The EEZ app is its own React root: `home/main.tsx:183-194` looks up `#EezStudio_Content` and calls
 * `createRoot(...)` on it. `EezStudioApp` owns that element plus everything around it — the backend
 * health handshake, the `?open=` / `?new=` / `?examples=` hand-off and the `eez-studio-action` → IPC
 * bridge. All of that is reused **unchanged**: the canvas slot renders `<EezStudioApp />`, so
 * `#EezStudio_Content` ends up inside `DesignerShell`'s canvas host and nothing else has to move.
 *
 * That is deliberate: P2.1 exists to prove the *hosting* works (route, project open, WASM, SVG surface,
 * hand-off) before any panel is taken out of FlexLayout's hands.
 *
 * ## P2.2–P2.5 — the shell owns the panels, EEZ owns the editor
 *
 * EEZ describes its workbench as a FlexLayout **model** and ~40 call sites switch panels with
 * `layoutModels.selectTab(model, id)`. D8 keeps that model and drops its *rendering*:
 *
 *   - `projectEezLayout(model)` (pure, unit-tested) says which tabs live in which region;
 *   - `getPanelComponent(component, ctx)` (the extracted registry) renders exactly the panel EEZ would;
 *   - the panels are rendered **by the shell**, wrapped in `<ProjectContext.Provider value={projectStore}>`
 *     — the context's value *is* the `ProjectStore` (`React.Context<ProjectStore>`,
 *     `home/tabs-store.tsx:457`), which is what makes rendering EEZ panels from another React root work;
 *   - the active project comes from `activeProject.ts`, published by `ProjectEditorView` on mount;
 *   - EEZ itself switches to `hostMode` (`project-editor/hostMode.ts`), where `ProjectEditor.Content`
 *     renders only the **active editor** instead of its FlexLayout container. The canvas slot keeps
 *     `<EezStudioApp />`, so the flow editor still finds the DOM it expects and nothing is drawn twice.
 *
 * Deliberately NOT in this step (tracked in the phase doc): the theme bridge (P2.7), scoping EEZ's global
 * CSS (P2.8), and mirroring tab selections that EEZ code performs on its own (the shell's tab strips are the
 * source of truth for now). P2.6 moved the EEZ **toolbar** into the shell's top bar; the backend health bar
 * stays where it is on purpose — it hides itself 3 s after a successful handshake, so it never competes with
 * the shell's own status bar.
 *
 * ## Boot: the shell keeps its shape
 *
 * Nothing can be projected before a project is open, and the boot is not instant (backend health check →
 * dynamic import of `home/main` → project fetch → publish). Returning an empty layout for that window made
 * the shell collapse to a title bar plus an empty area — reported as *"the editor, the left panel and the
 * panel beside it are gone"*. The regions are therefore drawn as placeholders while `projectStore` is
 * null, at the same sizes as the real ones and **silently** — the sizes are what the edit needs, and the
 * shell already shows the one `Loading…`. The canvas keeps `<EezStudioApp />`, so the boot progress is
 * still visible (and it is where the backend/project state is reported — see `placeholderRegion`).
 *
 * Rules inherited from the shell (same as the HVAC document):
 *  - the canvas element is memoised and never re-keyed — `home/main.tsx` mounts a root into it, and a
 *    remount would leave the previous root attached to a detached node;
 *  - the document is mounted once (`registry.ts` + the shell's single-mount guarantee, R7).
 */
import React, { useEffect, useMemo, useSyncExternalStore, useLayoutEffect } from "react";

import { EezStudioApp } from "@/t3-react/app/EezStudioApp";
import { ProjectContext } from "project-editor/project/context";
import { getPanelComponent } from "project-editor/project/ui/panelRegistry";
import { RunEditSwitchControls, Toolbar } from "project-editor/project/ui/Toolbar";
import { ProjectToolbarView } from "project-editor/project/ui/ProjectToolbarView";
import { EditorTabsView } from "project-editor/project/ui/EditorTabsView";
import { OutputSectionIcon, OutputSectionCount } from "project-editor/project/ui/OutputSectionTabStatus";
import { Section } from "project-editor/store/output-sections";
import { setProjectEditorHosted } from "project-editor/hostMode";
import {
    getActiveEditorMode,
    getActiveLayoutModel,
    getActivePageEditor,
    getActiveProject,
    getLayoutSelection,
    getPageStatus,
    subscribeActiveEditorMode,
    subscribeActiveLayoutModel,
    subscribeActivePageEditor,
    subscribeActiveProject,
    subscribeLayoutSelection,
    subscribePageStatus
} from "project-editor/activeProject";

import type {
    DocumentAdapter,
    DocumentRuntime,
    PanelTab,
    RailSpec,
    RegionSpec,
    ShellLayout
} from "../../DocumentAdapter";
import type { DocumentHostProps } from "../../registry";
import { RAIL_BAR_WIDTH } from "../../components/RegionRail";
import * as FlexLayout from "flexlayout-react";
import {
    designerDocumentKey,
    publishDesignerDocument,
    releaseDesignerDocument
} from "../../documentSlot";
import type { DesignerDocumentEntry } from "../../documentSlot";
import { statusPublisher } from "../../statusPublisher";
import { DOCUMENT_KIND_SPECS } from "../../kinds";

/** Route identity of this document; the layout matches its published entry against it. */
const LVGL_DOCUMENT_KEY = designerDocumentKey("lvgl-9-5");
import {
    projectEezLayout,
    stripPanels,
    eezRegionPlan,
    type ProjectedPanel,
    type ProjectedRegion
} from "./projectEezLayout";
import { eezViewport } from "./eezViewport";
import { viewportCommands } from "../../commands/viewportCommands";
import { useRegisterCommands } from "../../commands/CommandBus";

// P2.7 — scoped `--eez-*` custom properties (Fluent tokens) for the EEZ stylesheets. Side-effect import:
// the file only declares properties under the shell's `data-doc-kind="lvgl*"` host.
import "./lvgl-theme-bridge.css";

const LVGL_ADAPTER: DocumentAdapter = { kind: "lvgl-9-5", engine: "eez", viewport: eezViewport };

/**
 * Region sizes, shared by the loading placeholders and the loaded layout so the two cannot drift.
 * (`RegionSpec.height` for the bottom: the shell reads `height` there, not `width`.)
 *
 * The left region holds the **Components Palette** and, beside it, the *Widgets Structure* column, sized from the
 * model's sibling weights (18.43 : 13.97 — see `secondaryWidth`), so the palette's default is also the structure
 * column's parent number: 245 px here gives ~186 px there, i.e. a **431 px** region instead of 518 (user request:
 * the old 295 px palette took 40 % of a 1280 px window and left the canvas 408 px). The weights, not these pixels,
 * are the origin's own values — the old 295 px was simply the weight applied to a 1600 px window.
 */
const LEFT_WIDTH = { default: 245, min: 180, max: 360 };
/*
 * The right column's own width: the origin gives it weight **20** against the root row's 32.4 / 47.6, i.e.
 * 320 px of a 1600 px window. The old 260 px was the HVAC inspector's size, and it is what forced the rail's
 * tabs into the body's strip in the first place.
 */
const RIGHT_WIDTH = { default: 320, min: 240, max: 560 };
const BOTTOM_HEIGHT = { default: 220, min: 120, max: 460 };

/**
 * The border's own thickness — `layout-models.tsx:276` (`size: 240` for the right border, `:326` for the
 * left). Used for the column an open rail tab renders in.
 */
const RAIL_CONTENT_WIDTH = 240;

/**
 * Fallback width for the left region's second column, when the model gave no comparable weights. Keeps the
 * model's ratio against `LEFT_WIDTH.default` (13.97 / 18.43 = 0.758), so the two cannot disagree.
 */
const LEFT_SECONDARY_WIDTH = { default: 186, min: 140, max: 320 };

/**
 * The neutral tab name each placeholder region carries.
 *
 * The vocabulary the other documents already use for the same three areas (HVAC ships *Tools* and
 * *Properties*, the LCD one *Widgets* and *Properties*), so the strip does not read as a third kind of
 * panel that is later replaced by something else.
 */
const PLACEHOLDER_LABELS: Record<"left" | "right" | "bottom", string> = {
    left: "Tools",
    right: "Properties",
    bottom: "Panels"
};

/**
 * A region that exists before its content does.
 *
 * Before the project is open the projection is empty, so the shell had **no regions at all** and
 * collapsed to a title bar plus an empty area for the whole boot (measured ~5 s of a ~9 s load) — which
 * looks exactly like the editor and both panels having vanished. Rendering the regions up front keeps
 * the shell's shape stable, and the held size is the entire point: the real panels land in exactly these
 * boxes.
 *
 * The placeholder is **silent** (user decision, 2026-09-24): the body draws nothing and the tab carries a
 * neutral name. It used to print its state twice per region — tab strip **and** body, five texts in all
 * (`Loading project…`, or `No project open` from the URL) — while the shell beside it was already showing
 * its one `Loading…`, which made a single wait read as several. What the wait *is* stays visible in the
 * middle area, where `EezStudioApp` draws the backend state ("Establishing connection to T3000
 * services…"), including the cases that never finish.
 *
 * One tab is kept rather than none: it is what gives the region its strip, and the strip is part of the
 * shape the loaded layout has to match.
 */
function placeholderRegion(
    id: "left" | "right" | "bottom",
    size: { default: number; min: number; max: number }
): RegionSpec {
    const tabId = `${id}-placeholder`;
    return {
        id,
        tabs: [{ id: tabId, label: PLACEHOLDER_LABELS[id], content: () => null }],
        activeTabId: tabId,
        onSelectTab: () => undefined,
        ...(id === "bottom" ? { height: size } : { width: size }),
        collapsible: true
    };
}

/**
 * `eez-studio-action` is the app's existing "menu → embedded EEZ Studio" channel: the header dispatches
 * it (`Header.tsx` `handleEezAction`) and `EezStudioApp` maps the detail to an IPC channel
 * (`EEZ_ACTION_TO_IPC`). Re-dispatching keeps a single source of truth for the mapping.
 */
function dispatchEezAction(action: "undo" | "redo"): void {
    window.dispatchEvent(new CustomEvent<string>("eez-studio-action", { detail: action }));
}

interface LvglDocumentProps extends DocumentHostProps {
    mode: "lvgl" | "flow";
}

/**
 * The dock panel a model component is, for the tabs that carry a **status** — the glyph and the count EEZ's
 * own tab bar drew for them (`OutputSectionTabStatus`).
 *
 * Keyed by component rather than by tab id, because the component is what the model declares and what the
 * projection reports (`"checksMessages"` · `"outputMessages"` · `"search"` · `"references"
 * (`layout-models.tsx:289-318`). Only applied to the **bottom** region: those components are the dock's.
 */
const DOCK_SECTION_BY_COMPONENT: Record<string, Section> = {
    checksMessages: Section.CHECKS,
    outputMessages: Section.OUTPUT,
    search: Section.SEARCH,
    references: Section.REFERENCES
};

/** The panels of a group, in model order, rendered through the extracted registry. */
function panelTabs(panels: ProjectedPanel[], projectStore: any, dock = false): PanelTab[] {
    return panels.map((panel) => {
        const section = dock ? DOCK_SECTION_BY_COMPONENT[panel.component] : undefined;

        return {
            id: panel.id,
            label: panel.name,
            /*
             * The dock's tabs carry the origin's **live** status (a spinner while checking, then a check /
             * warning / error glyph, a failed build turning *Output* red). Supplied as elements because the
             * shell only re-renders when its layout changes while the dock is usually closed as a run goes
             * by — see `OutputSectionTabStatus`.
             */
            ...(section !== undefined
                ? {
                      icon: <OutputSectionIcon sectionId={section} />,
                      badgeElement: <OutputSectionCount sectionId={section} />
                  }
                : {}),
            /*
             * Wrapped here, per panel, rather than around the whole frame: a frame-level wrapper would
             * appear only once a project is open, and changing the element type *above* the shell makes
             * React rebuild the entire designer — including the EEZ app that just booted.
             */
            content: () => (
                <ProjectContext.Provider value={projectStore}>{getPanelComponent(panel.component, projectStore)}</ProjectContext.Provider>
            )
        };
    });
}

/**
 * The active tab of one group: whatever the user picked (as long as it still exists), otherwise the model's
 * own selection for that tabset, otherwise the first panel.
 */
function resolveGroupActiveTab(
    panels: ProjectedPanel[],
    modelActive: string | undefined,
    chosen: string | undefined
): string {
    const ids = panels.map((panel) => panel.id);
    if (chosen && ids.includes(chosen)) {
        return chosen;
    }
    if (modelActive && ids.includes(modelActive)) {
        return modelActive;
    }
    return ids[0] ?? "";
}

/**
 * The left region's second column, sized from the model's sibling weights (13.97 : 18.43 measured) so the
 * two columns keep the proportion the old page had, at whatever the first column's current width is.
 */
function secondaryWidth(region: ProjectedRegion): number {
    const body = region.bodyWeight;
    const second = region.secondaryWeight;
    if (!body || !second || body <= 0) {
        return LEFT_SECONDARY_WIDTH.default;
    }
    return Math.round(LEFT_WIDTH.default * (second / body));
}

/**
 * A region spec from the projection.
 *
 * The projection may report the region's body as a **stack of tab groups** and/or a **second column** (EEZ's
 * left area). Both are rendered by the shell region itself — `sections` for the stack, `secondary` for the
 * column — and the selection of each group is remembered separately, keyed `region:section`.
 */
function regionSpec(
    id: "left" | "right" | "bottom",
    region: ProjectedRegion,
    projectStore: any,
    chosen: Record<string, string | undefined>,
    onSelectTab: (regionKey: string, tabId: string) => void,
    onSelectRailTab: (tabId: string) => void,
    size: { default: number; min: number; max: number },
    pageEditorActive: boolean,
    revealRevision: number | undefined
): RegionSpec {
    /*
     * The body is the region's **own column**, never the flat union: `region.panels` also carries the border's
     * tabs (they are one list for callers that cannot draw a rail), and showing those in the strip is what
     * made the right panel hold eight tabs in 228 px.
     */
    const bodyPanels = stripPanels(region);
    const activeTabId = resolveGroupActiveTab(bodyPanels, region.activeTabId, chosen[id]);

    const sections = region.sections?.map((section) => ({
        id: section.id,
        tabs: panelTabs(section.panels, projectStore),
        activeTabId: resolveGroupActiveTab(
            section.panels,
            section.activeTabId,
            chosen[`${id}:${section.id}`]
        ),
        onSelectTab: (tabId: string) => onSelectTab(`${id}:${section.id}`, tabId),
        weight: section.weight
    }));

    /*
     * The second column is *Widgets Structure* (`flow-structure` → `PageStructure`), which draws the
     * **active page's** widget tree — and nothing at all when the active editor is not a page. EEZ answers
     * that case with `EezStudio_PageStructure_NoPageSelected`, a flat `@panelHeaderColor` block: measured
     * live with the Settings editor open, the column was 186 × 673 px of dead grey next to the palette.
     * The shell drops the column with the page editor (see `getActivePageEditor`) — the same rule that
     * already drops a region with no panels, and it hands the freed width back to the canvas.
     *
     * Only a column whose panels are *all* page-structure is dropped, so a second column holding anything
     * else (a future one, or an EEZ build that adds tabs to it) keeps its tabs.
     */
    const second = region.secondary;
    const secondIsPageStructure =
        !!second && second.panels.length > 0 && second.panels.every((panel) => panel.component === "flow-structure");
    const secondary = second && (!secondIsPageStructure || pageEditorActive)
        ? {
              id: second.id,
              tabs: panelTabs(second.panels, projectStore),
              activeTabId: resolveGroupActiveTab(
                  second.panels,
                  second.activeTabId,
                  chosen[`${id}:${second.id}`]
              ),
              onSelectTab: (tabId: string) => onSelectTab(`${id}:${second.id}`, tabId),
              defaultWidth: secondaryWidth(region),
              min: LEFT_SECONDARY_WIDTH.min,
              max: LEFT_SECONDARY_WIDTH.max,
              // The old page drew this column *inside* the left area, i.e. towards the canvas.
              side: "end" as const
          }
        : undefined;

    /*
     * The **rail**: the side's border, drawn the way the old page drew it — a rotated tab bar on the window
     * edge whose selected tab opens a 240 px column beside it. Its selection is the *model's* (flexlayout
     * toggles a border when the selected tab is clicked again), so there is no shell-side state to keep in
     * sync; `activeTabId === undefined` is simply the model saying the border is closed.
     *
     * A border with **no tabs** gets no rail: `enableTabOnBorder` gates the left border's five tabs on what
     * the project actually has (`Project.enableTabs`, `project.tsx:2081+`), and this project has none of
     * them — an empty 26 px bar would be a strip of nothing down the window edge.
     */
    const rail: RailSpec | undefined =
        region.border && region.border.panels.length > 0
            ? {
                  tabs: panelTabs(region.border.panels, projectStore),
                  activeTabId: region.border.activeTabId,
                  onSelectTab: onSelectRailTab,
                  width: RAIL_CONTENT_WIDTH,
                  side: id === "left" ? "left" : "right",
                  label: id === "left" ? "Left panels" : "Right panels"
              }
            : undefined;

    /*
     * `RegionSpec.width` is the width of the WHOLE region, not of its body — a secondary column and an open
     * rail therefore eat the body's share (measured when the LCD document got one: a 170 px region left the
     * toolbox 30 px). The region is widened by their widths instead, which is also what makes the parts add
     * up to the model's own proportions.
     */
    const railWidth = rail ? RAIL_BAR_WIDTH + (rail.activeTabId ? RAIL_CONTENT_WIDTH : 0) : 0;
    const extraWidth = (secondary ? secondary.defaultWidth : 0) + railWidth;
    const regionSize =
        id === "bottom" || extraWidth === 0
            ? size
            : {
                  default: size.default + extraWidth,
                  min: size.min + extraWidth,
                  max: size.max + extraWidth
              };

    return {
        id,
        tabs: panelTabs(bodyPanels, projectStore, id === "bottom"),
        activeTabId,
        onSelectTab: (tabId: string) => onSelectTab(id, tabId),
        // The bottom region is sized by `height`, left/right by `width` — passing `width` for the
        // bottom made the declared default/min/max dead config (the dock fell back to 180 px).
        ...(id === "bottom" ? { height: regionSize } : { width: regionSize }),
        // Bottom only: EEZ's own "show this panel" requests (Check · Build · Search) — see
        // `RegionSpec.revealRevision` and `project-editor/activeProject.ts`.
        ...(id === "bottom" ? { revealRevision } : {}),
        collapsible: true,
        ...(sections && sections.length > 1 ? { sections } : {}),
        ...(secondary ? { secondary } : {}),
        ...(rail ? { rail } : {})
    };
}

/** The empty projection, as one stable object — a fresh literal per render would break the memos. */
const NO_PROJECTION = {
    left: { panels: [] },
    right: { panels: [] },
    bottom: { panels: [] },
    canvasTabsetId: null
} as const;

const LvglDocument: React.FC<LvglDocumentProps> = ({ mode }) => {
    // EEZ must stop drawing its own workbench *before* it mounts (it mounts after a dynamic import plus
    // the backend health check, so this effect is comfortably early). See `hostMode.ts`.
    useEffect(() => {
        setProjectEditorHosted(true);
        return () => setProjectEditorHosted(false);
    }, []);

    const projectStore = useSyncExternalStore(subscribeActiveProject, getActiveProject, getActiveProject);

    /**
     * EEZ's **current root model** (edit · run/debug · full simulator). Its identity changes when the mode
     * changes, and it is what the panels are projected from — without it, Run/Debug/Full Sim kept showing the
     * editor's panels while EEZ had already switched. See `project-editor/activeProject.ts`.
     */
    const layoutModel = useSyncExternalStore(
        subscribeActiveLayoutModel,
        getActiveLayoutModel,
        getActiveLayoutModel
    );

    /**
     * What EEZ draws in its content area — `edit` · `run` · `debug` · `full-sim` · `none`. The model alone
     * cannot answer this: in **Run** the runtime page is drawn *instead of* the workbench, so there are no
     * panels to mirror. See `project-editor/activeProject.ts`.
     */
    const editorMode = useSyncExternalStore(
        subscribeActiveEditorMode,
        getActiveEditorMode,
        getActiveEditorMode
    );
    /**
     * Is the **active editor a page**? The left region's second column (*Widgets Structure*) only has
     * something to show for a page editor — for the Settings editor (or a flow editor) EEZ paints it as a
     * flat, empty block. See `regionSpec` below and `activeProject.ts`.
     */
    const pageEditorActive = useSyncExternalStore(
        subscribeActivePageEditor,
        getActivePageEditor,
        getActivePageEditor
    );

    /**
     * The last panel selection: EEZ's own requests (*Check* → *Checks*, a failed Build → *Output*, a search →
     * *Search References*, navigation) **and** the shell's side-strip clicks, which select through the same
     * `LayoutModels.selectTab`. `revision` is what makes the projection below recompute — a selection mutates
     * the flexlayout model in place, so its identity never changes and the projection would stay stale — and
     * `tabId` decides whether it was a *dock* panel, the only kind allowed to reveal the dock (see
     * `bottomReveal`).
     */
    const selection = useSyncExternalStore(
        subscribeLayoutSelection,
        getLayoutSelection,
        getLayoutSelection
    );
    // P5 — zoom lives on the EEZ editor's own transform (`PageZoomButton`), which the shell now drives
    // through the adapter. LVGL has no rulers/grid, so `viewportCommands` offers none and no such
    // buttons are drawn (`interfaces.md` §4.2).
    useRegisterCommands(useMemo(() => viewportCommands(eezViewport), []));

    const [chosen, setChosen] = React.useState<Record<string, string | undefined>>({});

    /*
     * An EEZ-made selection must also win over the tab **we** remember for a region: `chosen` is our own
     * click memory and `resolveGroupActiveTab` prefers it, so a user who had once picked *Checks* by hand
     * would still be shown *Checks* after a failed Build selected *Output* in the model.
     *
     * Dropping every entry is safe: our own clicks always move the model too (only the bottom dock's
     * strip click is a raw action — and that one deliberately does **not** bump the revision), so the
     * model resolves to the same tab we had remembered.
     */
    React.useEffect(() => {
        setChosen((previous) => (Object.keys(previous).length > 0 ? {} : previous));
    }, [selection.revision]);
    /**
     * Bumped when a **rail** tab is clicked. A border's selection lives on the model, so the model changing
     * is not something this component can observe — the click has to say so. (A tab in a strip needs no such
     * thing: `chosen` already re-renders for it.)
     */
    const [railTick, setRailTick] = React.useState(0);

    // The model is the source of truth for *which* panels exist, **and which model that is**: EEZ swaps the
    // root when the mode changes (edit → Run/Debug → Full Sim). The *mode* decides whether those panels are
    // drawn at all — Run draws the runtime page instead of the workbench — see `eezRegionPlan` below.
    // The projection is memoised on the model's identity because `projectEezLayout` returns fresh objects:
    // recomputing it per render would change `layout` per render, and a changing `layout` is a publish (the
    // layout would then re-render this host). `railTick` is the deliberate exception — an explicit rail click,
    // so one recompute per click.
    const projection = useMemo(
        () =>
            layoutModel
                ? projectEezLayout(layoutModel)
                : (NO_PROJECTION as unknown as ReturnType<typeof projectEezLayout>),
        [layoutModel, railTick, selection.revision]
    );

    /*
     * "Reveal the dock" — and only for a **dock panel**.
     * Every selection publishes its tab id, and the shell's side strips (User Widgets, User Actions …) go
     * through the same `LayoutModels.selectTab` as Check/Build do. Wired straight to the revision, clicking
     * a left-region tab popped the dock open too (user-reported). Classifying by *where the tab lives* keeps
     * the two apart without needing to know who called: a tab that is not in the dock's own strip is dropped
     * (it still bumps `revision`, so the projection stays in sync), and our own dock-strip click never fires
     * at all — it uses the raw model action, because a border toggles.
     *
     * `undefined` (no dock tab, or a *change back* to nothing) is deliberately not a reveal: the shell opens
     * the dock on a change to a defined value only.
     */
    const bottomTabIds = projection.bottom.panels.map((panel) => panel.id);
    const bottomReveal =
        selection.tabId && bottomTabIds.includes(selection.tabId)
            ? selection.revision
            : undefined;
    const selectTab = (regionId: string, tabId: string): void => {
        setChosen((previous) => ({ ...previous, [regionId]: tabId }));

        if (layoutModel) {
            if (regionId === "bottom") {
                /*
                 * The bottom area is a flexlayout **border**, and a border *toggles*: `SELECT_TAB` on the
                 * tab that is already selected sets `selected = -1`, i.e. it closes — the same rule the rail
                 * is built on. `layoutModels.selectTab` skips when the tab is already selected, so going
                 * through it left the model holding a selection the shell could no longer close (and the
                 * shell's own collapsed flag had to argue with the model). With the raw action, the model
                 * *is* the dock's open/closed state, and the origin's toggle comes for free.
                 */
                layoutModel.doAction(FlexLayout.Actions.selectTab(tabId));
            } else {
                // Ask the model too: EEZ's own code reacts to the selection, and `selectTab` is a no-op
                // when the tab is already the selected one.
                projectStore?.layoutModels?.selectTab(layoutModel, tabId);
            }
            projectStore?.editorsStore?.refresh(false);
        }
    };

    /**
     * A rail tab click — the origin's border behaviour, taken from the model rather than re-implemented:
     * flexlayout's `SELECT_TAB` sets the border's selection and **clears** it when the tab is already the
     * selected one (`Model.js`, the `BorderNode` branch), which is how a border opens and closes.
     *
     * Deliberately not `layoutModels.selectTab`: that helper skips the action when the tab is already
     * selected (`layout-models.tsx:1161`), so re-clicking could never close the column.
     */
    const selectRailTab = (tabId: string): void => {
        if (!layoutModel) {
            return;
        }

        layoutModel.doAction(FlexLayout.Actions.selectTab(tabId));
        setRailTick((tick) => tick + 1);
    };

    const layout = useMemo<ShellLayout>(() => {
        const plan = eezRegionPlan(editorMode, layoutModel);

        // `!projectStore` is the same state as `"placeholders"` (the plan answers for a model, not a store);
        // testing it here keeps the store's type narrowed for everything below.
        if (plan === "placeholders" || !projectStore) {
            /*
             * Nothing to mirror yet: `EezStudioApp` renders the backend state in the middle area, and the
             * three regions hold their sizes (silently) so the shell never collapses — see
             * `placeholderRegion` for why they carry no text.
             */
            return {
                left: placeholderRegion("left", LEFT_WIDTH),
                right: placeholderRegion("right", RIGHT_WIDTH),
                bottom: { ...placeholderRegion("bottom", BOTTOM_HEIGHT), defaultCollapsed: true }
            };
        }

        /*
         * The toolbar is the **first** thing to render in every mode that has a project, because it is the only
         * way out of Run: EEZ's own toolbar carries the Edit · Run · Debug · Full Sim switch (and hides the
         * editor-only buttons while running, `Toolbar.tsx:107-119`).
         */
        const top: ShellLayout["top"] = {
            /*
             * P2.6 — the EEZ editor toolbar (Save · Check · Build · zoom · run/debug · deploy) is a
             * row of *items* in the shell's tools row, and `ProjectEditorView` skips it in host
             * mode. `ProjectToolbarView` keeps the CSS ancestor the toolbar's stylesheet expects
             * (`_stylesheets/project-editor.less:68-105`), without which it stacks vertically and
             * eats ~280 px; its dropdowns portal to `document.body` (`Toolbar.tsx:824`).
             */
            tools: (
                <ProjectContext.Provider value={projectStore}>
                    <ProjectToolbarView />
                </ProjectContext.Provider>
            ),
            /*
             * The mode switch — **Edit · Run · Debug · Full Sim · Deploy** — pinned to the band's right end
             * (user decision 2026-09-20), in its own two-line cluster.
             *
             * EEZ still owns the buttons: their state (which mode is selected, a full-sim build in progress,
             * the runtime's error, the deploy drawer) lives in the engine, and re-expressing it as shell tool
             * items would lose `attention`/`loader` and the drawer. So `Toolbar`'s nav stops drawing the
             * cluster while hosted (`isProjectEditorHosted()`, the same flag the page controls use) and this
             * exports it here; the shell only decides *where* it sits and guarantees it cannot be folded.
             */
            modeBar: (
                <ProjectContext.Provider value={projectStore}>
                    <RunEditSwitchControls standalone />
                </ProjectContext.Provider>
            ),
            /*
             * The shell draws **no** copies of these, because this document's own toolbar already has them:
             * EEZ's `ProjectToolbarView` (the cluster above) carries Save · **Undo · Redo** · Copy · Paste ·
             * **zoom** · Check · Build, and drawing the shell's clusters too put two undo arrows and two redo
             * arrows in one band (user-reported: *"it has duplicate icon, undo, redo"*).
             *
             * `viewport` is off as well, because the zoom control **moved into that toolbar, right after
             * Paste** (user request: *"for zoom, i think u need place it after paste"*) — it is EEZ's own
             * `PageZoomButton`, driving the same `pageTabState.transform`, so there is one zoom control and it
             * is inside the row it belongs to. `ShellLayout.history` stays set: `useDesignerShortcuts` reads it
             * for Ctrl+Z / Ctrl+Y, and dropping it would silently kill keyboard undo.
             */
            shellControls: { history: false, viewport: false }
        };

        const history: ShellLayout["history"] = {
            // EEZ does not expose undo availability to the shell, so the buttons stay enabled;
            // P2.5 refines this from the project store.
            undo: () => dispatchEezAction("undo"),
            redo: () => dispatchEezAction("redo")
        };

        /*
         * The canvas **tab strip**: one chip per open editor (page, flow, style …) with its close button —
         * EEZ's own canvas chrome, which the origin got from flexlayout's tab bar over the `EDITORS` tabset
         * (`EditorsStore.refresh` adds a tab per editor). Hosted, the shell draws only the *active* editor,
         * so the bar had to be re-expressed; EEZ keeps the data and the behaviour, the shell only places it
         * above the canvas host. It renders nothing when no editor is open (Run, Full Sim).
         */
        const canvasTabs = (
            <ProjectContext.Provider value={projectStore}>
                <EditorTabsView />
            </ProjectContext.Provider>
        );

        if (plan === "canvas-only") {
            /*
             * **Run** (`runtime && !isDebuggerActive`): the origin returns the runtime page *before* it looks
             * at the layout model (`ProjectEditor.tsx:312-331`), so the workbench is not drawn at all — the
             * running screen owns the whole area. Panels here would be the *debugger's* layout, which is not
             * what Run means.
             */
            return { top, canvasTabs, history };
        }

        /*
         * A region exists only while the current model has panels for it. Full Sim, for instance, has **no
         * left columns at all** (`rootDockerSimulator`: the Preview is the canvas, the right column is the two
         * log panels), and an empty region would still cost its width and draw a head with nothing in it.
         */
        return {
            top,
            canvasTabs,
            ...(projection.left.panels.length > 0
                ? {
                      left: regionSpec(
                          "left",
                          projection.left,
                          projectStore,
                          chosen,
                          selectTab,
                          selectRailTab,
                          LEFT_WIDTH,
                          pageEditorActive,
                          bottomReveal
                      )
                  }
                : {}),
            ...(projection.right.panels.length > 0
                ? {
                      right: regionSpec(
                          "right",
                          projection.right,
                          projectStore,
                          chosen,
                          selectTab,
                          selectRailTab,
                          RIGHT_WIDTH,
                          pageEditorActive,
                          bottomReveal
                      )
                  }
                : {}),
            ...(projection.bottom.panels.length > 0
                ? {
                      bottom: {
                          ...regionSpec(
                              "bottom",
                              projection.bottom,
                              projectStore,
                              chosen,
                              selectTab,
                              selectRailTab,
                              BOTTOM_HEIGHT,
                              pageEditorActive,
                              bottomReveal
                          ),
                          /*
                           * The dock's open state is the **model's**, not ours. A flexlayout border keeps its
                           * selection on the border (`selected`, default -1 = closed), which is why
                           * `projection.bottom.activeTabId` is `undefined` while it is closed and defined as
                           * soon as anything selects one of its tabs — a click on *Checks* / *Output* / *Search
                           * References*, or EEZ's own `selectTab` when a build or a search starts. Hard-coding
                           * `defaultCollapsed: true` is what made those clicks appear to do nothing.
                           */
                          collapsed: !projection.bottom.activeTabId
                      }
                  }
                : {}),
            history
        };
        // `selectTab`/`selectRailTab` close over the model; the projection is memoised on the model
        // identity (i.e. also on the mode) plus an explicit rail click. `pageEditorActive` is a raw
        // published snapshot (a boolean), so it is a stable dependency — and it is what hides/shows the
        // left *Widgets Structure* column when the active editor changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectStore, layoutModel, editorMode, projection, chosen, pageEditorActive]);

    const runtime: DocumentRuntime = useMemo(
        () => ({
            layout,
            title: DOCUMENT_KIND_SPECS[mode === "flow" ? "lvgl-flow-9-5" : "lvgl-9-5"].title
        }),
        [layout, mode]
    );

    /*
     * Publishing must NOT clear the slot on every entry change. Clearing it flips the layout between
     * "document" and "no document", i.e. between two different element trees, and React answers that
     * by unmounting and remounting the frame — with the EEZ app inside it, which then boots again and
     * publishes again (observed: the frame rebuilt every ~1.5 s, forever).
     */
    const entry = useMemo<DesignerDocumentEntry>(
        () => ({
            key: LVGL_DOCUMENT_KEY,
            adapter: LVGL_ADAPTER,
            runtime
        }),
        [runtime]
    );

    useLayoutEffect(() => {
        publishDesignerDocument(entry);
    }, [entry]);

    // Teardown only — and only if the slot still holds *this* document's entry.
    useLayoutEffect(() => () => releaseDesignerDocument(LVGL_DOCUMENT_KEY), []);

    /*
     * The document's own status line: the active page, its size, and the project's real dirty flag.
     *
     * Published through the shared `statusPublisher` — the window event `EditorStatusBar` listens to — and
     * **not** through `runtime.status`: the runtime is a `documentSlot.drivesTheSame()` dependency, so routing
     * a per-keystroke dirty flag through it would re-publish the whole entry on every edit, while a window
     * event only re-renders the bar.
     *
     * `zoom: null` deliberately clears the chip: this document has no zoom of its own (EEZ's toolbar already
     * carries the `− 100 % + ↺` cluster), and without it the percentage the previous document published would
     * stay on screen.
     */
    useEffect(() => {
        const push = () => {
            const { name, width, height, modified } = getPageStatus();

            statusPublisher.set({
                name,
                coords: name && width > 0 && height > 0 ? `${Math.round(width)} × ${Math.round(height)}` : "",
                zoom: null,
                saved: !modified,
                message: "Ready"
            });
        };

        push();
        const unsubscribe = subscribePageStatus(push);

        return () => {
            unsubscribe();
            /*
             * The window event can only merge, so the values have to be cleared explicitly when this document
             * goes away: the bar's listener falls through on `undefined` only, and an empty string does clear.
             * Without this, the next kind that publishes no status of its own would show this page's name.
             */
            statusPublisher.set({ name: "", coords: "", zoom: null, saved: true, message: "Ready" });
        };
    }, []);

    // Mounted once and never re-keyed: `home/main.tsx` mounts a React root into this DOM (`#EezStudio_Content`)
    // and the flow editor measures it.
    return <EezStudioApp />;
};

/* ------------------------------------------------------------------ hosts */

const LvglHost: React.FC<DocumentHostProps> = (props) => <LvglDocument {...props} mode="lvgl" />;
const LvglFlowHost: React.FC<DocumentHostProps> = (props) => <LvglDocument {...props} mode="flow" />;

export const LVGL_DOCUMENT_HOSTS = {
    "lvgl-9-5": LvglHost,
    "lvgl-flow-9-5": LvglFlowHost
};
