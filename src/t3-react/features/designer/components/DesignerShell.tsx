/**
 * Designer — the shell.
 *
 * The ONLY layout component of the feature: five slots (top / left / canvas / right / status) plus an
 * optional bottom dock. It never imports an engine; everything comes from the `DocumentRuntime` the
 * document host computes.
 *
 * Two rules in here are load-bearing (see docs/t3000/architecture/designer/risks.md R1/R7):
 *  1. the canvas host element is mounted once per document and never re-keyed — the HVAC engine cannot
 *     be re-initialised and the EEZ app owns a second React root;
 *  2. a document's loading/error state is drawn as an OVERLAY over the canvas, never by replacing the
 *     canvas subtree, so an engine always finds its DOM.
 */
import React, { useCallback, useMemo, useRef } from "react";
import { makeStyles, tokens } from "@fluentui/react-components";
import type { DocumentAdapter, DocumentRuntime, RegionSpec } from "../DocumentAdapter";
import { useCanvasResize } from "../hooks/useCanvasResize";
import {
    layoutStore,
    resolveRegionHeight,
    resolveRegionWidth,
    resolveSecondaryWidth,
    useKindLayout
} from "../hooks/useDesignerLayoutStore";
import {
    COMPACT_WIDTH_PX,
    NARROW_WIDTH_PX,
    useViewportHeight,
    useViewportWidth
} from "../hooks/useViewportWidth";
import { useDesignerShortcuts } from "../hooks/useDesignerShortcuts";
import { RegionPanel } from "./RegionPanel";
import { ShellBottomDock } from "./ShellBottomDock";
import { ShellSplitter } from "./ShellSplitter";
import { ShellStatusBar } from "./ShellStatusBar";
import { ShellTopBar } from "./ShellTopBar";

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        backgroundColor: tokens.colorNeutralBackground1
    },
    body: {
        display: "flex",
        flex: 1,
        minHeight: 0,
        overflow: "hidden"
    },
    middleWrap: {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden"
    },
    /**
     * The middle area's DOM host.
     *
     * `position: relative` is load-bearing: EEZ's `#EezStudio_Content` is `position: absolute`
     * (`app.less:129`) and resolves against this element.
     */
    middleHost: {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        backgroundColor: tokens.colorNeutralBackground3
    },
    /**
     * A document's canvas strip (editor tabs) — a sibling of the canvas host, so the host is never re-keyed.
     * Its height is the document's business; this only pins it and lets it stretch across the middle column.
     */
    canvasStrip: {
        flexShrink: 0,
        minWidth: 0,
        minHeight: 0
    },
    overlay: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tokens.colorNeutralBackground1,
        zIndex: 2
    },
    errorBox: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "24px",
        maxWidth: "420px",
        textAlign: "center"
    }
});

/** Minimum width the canvas keeps, whatever the panels ask for. */
const CANVAS_MIN_WIDTH_PX = 240;

/** Minimum height the canvas keeps when the bottom dock is resized. */
const CANVAS_MIN_HEIGHT_PX = 160;

/** Two 4 px splitters. */
const SPLITTER_TOTAL_PX = 8;

/**
 * What a collapsed region costs: the rail with its one chevron. A region is always rendered — at worst as this
 * — so the control that reopens it is never gone (see the responsive block below).
 */
const RAIL_WIDTH_PX = 28;

export interface DesignerShellProps {
    adapter: DocumentAdapter;
    runtime: DocumentRuntime;
    /**
     * What the middle area contains when the document publishes no canvas.
     *
     * `DesignerLayout` (the route-level layout) passes the router's `<Outlet/>` here, so the document
     * renders *inside* the shell instead of building the shell around itself.
     */
    children?: React.ReactNode;
    /** Notified (debounced) when the canvas area changes size; the document re-lays out. */
    onCanvasResize?: () => void;
}

export const DesignerShell: React.FC<DesignerShellProps> = ({
    adapter,
    runtime,
    children,
    onCanvasResize
}) => {
    const styles = useStyles();
    const layout = runtime.layout;
    const kind = adapter.kind;
    const layoutState = useKindLayout(kind);

    const middleHostRef = useRef<HTMLDivElement>(null);
    useCanvasResize(middleHostRef, onCanvasResize);

    const viewportWidth = useViewportWidth();
    const viewportHeight = useViewportHeight();

    // The shell owns undo/redo/save/zoom as keyboard shortcuts, claimed in the capture phase so the
    // engines' own bindings cannot also act on the same press — see `hooks/useDesignerShortcuts.ts`.
    useDesignerShortcuts(layout);

    const leftSpec = layout.left;
    const rightSpec = layout.right;
    const bottomSpec = layout.bottom;

    const leftCollapsed = layoutState.left?.collapsed ?? leftSpec?.collapsed ?? false;
    const rightCollapsed = layoutState.right?.collapsed ?? rightSpec?.collapsed ?? false;
    const bottomCollapsed =
        layoutState.bottom?.collapsed ?? bottomSpec?.collapsed ?? bottomSpec?.defaultCollapsed ?? true;

    const leftWidth = resolveRegionWidth(layoutState, "left", leftSpec?.width);
    const rightWidth = resolveRegionWidth(layoutState, "right", rightSpec?.width);
    const bottomHeight = resolveRegionHeight(layoutState, bottomSpec?.height);

    // Responsive: on a narrow viewport the panels would starve the canvas (they are fixed-width by design), so
    // they are *effectively collapsed* — but they are **never omitted**. A region that disappears takes its
    // chevron with it, and then a panel the user collapsed can never be reopened: measured at a 520 px pane,
    // both panels were simply absent, which is exactly the report "when they have been collapsed, they cannot be
    // expanded". The rail is 28 px, so leaving it there costs almost nothing and always keeps the way back.
    const needs = CANVAS_MIN_WIDTH_PX + SPLITTER_TOTAL_PX;
    const hideRight = viewportWidth < COMPACT_WIDTH_PX || viewportWidth - leftWidth - rightWidth < needs;
    const hideLeft =
        viewportWidth < NARROW_WIDTH_PX ||
        viewportWidth - (hideRight ? 0 : rightWidth) - leftWidth < needs;

    /*
     * An **explicit** expand beats the rule: a click is a better judge than a width threshold, and without this
     * the chevron would look dead at a narrow width (the region would snap straight back to its rail).
     */
    const leftByUser = layoutState.left?.expandedByUser === true;
    const rightByUser = layoutState.right?.expandedByUser === true;
    const forceCollapseLeft = hideLeft && !leftByUser;
    const forceCollapseRight = hideRight && !rightByUser;

    // A region the rule would hide but the user expanded opens at a width that still leaves the canvas its
    // minimum — never at its remembered size, which is what the rule is about in the first place.
    const rightTaken = forceCollapseRight ? RAIL_WIDTH_PX : rightWidth;
    const leftTaken = forceCollapseLeft ? RAIL_WIDTH_PX : leftWidth;
    const fitLeft = Math.max(leftSpec?.width?.min ?? 0, viewportWidth - rightTaken - needs);
    const fitRight = Math.max(rightSpec?.width?.min ?? 0, viewportWidth - leftTaken - needs);

    const showLeft = !!leftSpec;
    const showRight = !!rightSpec;

    /*
     * Collapsed **for any reason** — the user's own chevron or the width rule — is a 28 px rail. The two terms
     * must stay together: sizing a region from the rule alone left a hand-collapsed panel at its full width
     * while drawing only its rail's head, i.e. 518 x 705 px of empty panel (measured on the live page).
     */
    const leftRail = leftCollapsed || forceCollapseLeft;
    const rightRail = rightCollapsed || forceCollapseRight;
    const leftSize = leftRail
        ? RAIL_WIDTH_PX
        : leftByUser && hideLeft
          ? Math.min(leftWidth, fitLeft)
          : leftWidth;
    const rightSize = rightRail
        ? RAIL_WIDTH_PX
        : rightByUser && hideRight
          ? Math.min(rightWidth, fitRight)
          : rightWidth;

    // Width at the moment a drag starts — the splitter reports total delta from that point.
    const dragOriginRef = useRef<{ side: "left" | "right" | "bottom"; size: number } | null>(null);

    const handleLeftDragStart = useCallback(() => {
        dragOriginRef.current = { side: "left", size: leftWidth };
    }, [leftWidth]);

    const handleRightDragStart = useCallback(() => {
        dragOriginRef.current = { side: "right", size: rightWidth };
    }, [rightWidth]);

    const handleLeftDrag = useCallback(
        (delta: number) => {
            const origin = dragOriginRef.current;
            const spec = leftSpec?.width;
            if (!origin || origin.side !== "left" || !spec) {
                return;
            }
            const requested = origin.size + delta;
            const available = Math.max(
                spec.min,
                viewportWidth - rightTaken - CANVAS_MIN_WIDTH_PX - SPLITTER_TOTAL_PX
            );
            const next = Math.min(spec.max, available, Math.max(spec.min, requested));
            layoutStore.setRegionSize(kind, "left", next, spec.default);
        },
        [kind, leftSpec?.width, viewportWidth, rightTaken]
    );

    const handleRightDrag = useCallback(
        (delta: number) => {
            const origin = dragOriginRef.current;
            const spec = rightSpec?.width;
            if (!origin || origin.side !== "right" || !spec) {
                return;
            }
            // Dragging the right splitter to the right makes the panel narrower.
            const requested = origin.size - delta;
            const available = Math.max(
                spec.min,
                viewportWidth - leftTaken - CANVAS_MIN_WIDTH_PX - SPLITTER_TOTAL_PX
            );
            const next = Math.min(spec.max, available, Math.max(spec.min, requested));
            layoutStore.setRegionSize(kind, "right", next, spec.default);
        },
        [kind, rightSpec?.width, viewportWidth, leftTaken]
    );

    const handleBottomDragStart = useCallback(() => {
        dragOriginRef.current = { side: "bottom", size: bottomHeight };
    }, [bottomHeight]);

    const handleBottomDrag = useCallback(
        (delta: number) => {
            const origin = dragOriginRef.current;
            const spec = bottomSpec?.height;
            if (!origin || origin.side !== "bottom" || !spec) {
                return;
            }
            // Dragging the handle upwards makes the dock taller.
            const requested = origin.size - delta;
            const available = Math.max(spec.min, viewportHeight - CANVAS_MIN_HEIGHT_PX - SPLITTER_TOTAL_PX);
            const next = Math.min(spec.max, available, Math.max(spec.min, requested));
            layoutStore.setBottomHeight(kind, next);
        },
        [kind, bottomSpec?.height, viewportHeight]
    );

    /**
     * The middle area's content: the document's own canvas when it publishes one, otherwise the
     * router's outlet (the route-level layout case) — never both. The host element around it is made
     * once and never re-keyed, so an engine that mounts a root into it is never remounted.
     */
    const canvasNode =
        layout.canvas && "node" in layout.canvas ? layout.canvas.node : children ?? null;

    /**
     * The dock's region, with its tab selection wrapped.
     *
     * Choosing a tab is a request to **see** it, and the dock is collapsed by default (its strip stays
     * visible so it can be reopened) — without this, a click on *Checks* / *Output* / *Search References*
     * switched the panel behind a collapsed bar and the panel appeared not to open at all.
     *
     * Clicking the tab that is **already** selected does the opposite, and that is the origin's rule, not a
     * convenience: for a FlexLayout *border* a `SELECT_TAB` on the selected tab sets `selected = -1`
     * (`flexlayout-react/lib/model/Model.js:283-291`), i.e. the border closes. Forcing the dock open on every
     * click is what removed the only way to hide it once a tab had been chosen.
     */
    const bottomRegion = useMemo(
        () =>
            bottomSpec
                ? {
                      ...bottomSpec,
                      onSelectTab: (tabId: string) => {
                          const closing = !bottomCollapsed && tabId === bottomSpec.activeTabId;
                          bottomSpec.onSelectTab(tabId);
                          layoutStore.setCollapsed(kind, "bottom", closing);
                      }
                  }
                : undefined,
        [bottomSpec, bottomCollapsed, kind]
    );

    const leftToggle = useMemo(
        () =>
            leftSpec
                ? {
                      present: true,
                      collapsed: leftRail,
                      toggle: () => layoutStore.toggleCollapsed(kind, "left")
                  }
                : undefined,
        [leftSpec, leftRail, kind]
    );
    const rightToggle = useMemo(
        () =>
            rightSpec
                ? {
                      present: true,
                      collapsed: rightRail,
                      toggle: () => layoutStore.toggleCollapsed(kind, "right")
                  }
                : undefined,
        [rightSpec, rightRail, kind]
    );

    /*
     * The panels own their visibility (user decision): the band draws no panel controls, and each panel's
     * head carries the chevron — which the shell has to *wire*, because the layout store is the shell's.
     * Without this the chevron is drawn and inert, and a collapsed panel can never be reopened.
     */

    /**
     * A region whose body is a **stack of tab groups** (EEZ's left column) remembers the user's split, per
     * section, in the same per-kind store as the region sizes. The model's weights are the default — the
     * panel falls back to them when nothing is stored — so no measurement is needed to lay it out.
     */
    const sectionState = (regionId: "left" | "right", spec: RegionSpec | undefined) => {
        const ids = spec?.sections?.map((section) => section.id) ?? [];
        if (ids.length === 0) {
            return {};
        }

        const stored = ids.map((id) => layoutState.sections?.[`${regionId}:${id}`]);
        return {
            sectionFractions: stored.every((value) => typeof value === "number")
                ? (stored as number[])
                : undefined,
            onSectionFractionsChange: (next: number[]) =>
                layoutStore.setSectionFractions(kind, regionId, ids, next)
        };
    };

    /**
     * The region's **second column** (EEZ's Widgets Structure beside the Components Palette), which the user
     * drags like any other divider. Remembered per region, in the same per-kind store as the region sizes.
     */
    const secondaryState = (regionId: "left" | "right", spec: RegionSpec | undefined) => {
        const secondary = spec?.secondary;
        if (!secondary) {
            return {};
        }

        return {
            secondaryWidth: resolveSecondaryWidth(layoutState, regionId, secondary),
            onSecondaryWidthChange: (width: number) => layoutStore.setSecondaryWidth(kind, regionId, width)
        };
    };

    return (
        <div
            /*
             * Two stable hooks for document-scoped CSS, which Emotion's hashed class cannot provide:
             * `t3-designer` marks the shell, `data-doc-kind` says which document is open — that is how
             * `documents/lvgl/lvgl-theme-bridge.css` scopes its `--eez-*` custom properties (P2.7) and
             * how EEZ's global rules can be scoped later (P2.8).
             */
            className={`${styles.root} t3-designer`}
            data-doc-kind={adapter.kind}
            /*
             * The document can claim the frame root's id: the HVAC engine takes a Hammer gesture
             * surface on `#main-app` and that surface is the whole editor, not just the drawing area.
             */
            id={layout.frameRootId}
        >
            <ShellTopBar top={layout.top} history={layout.history} />

            <div className={styles.body}>
                {showLeft ? (
                    <>
                        <RegionPanel
                            region={leftSpec}
                            side="left"
                            size={leftSize}
                            collapsed={leftRail}
                            onToggleCollapsed={leftToggle?.toggle}
                            {...sectionState("left", leftSpec)}
                            {...secondaryState("left", leftSpec)}
                        />
                        <ShellSplitter orientation="vertical" onDragStart={handleLeftDragStart} onDrag={handleLeftDrag} />
                    </>
                ) : null}

                <div className={styles.middleWrap}>
                    {layout.canvasTabs ? (
                        <div className={styles.canvasStrip} data-shell-canvas-tabs="true">
                            {layout.canvasTabs}
                        </div>
                    ) : null}
                    <div className={styles.middleHost} ref={middleHostRef}>
                        {canvasNode}
                    </div>
                    {runtime.error ? (
                        <div className={styles.overlay}>
                            <div className={styles.errorBox}>{runtime.error}</div>
                        </div>
                    ) : runtime.loading ? (
                        <div className={styles.overlay}>{runtime.loading}</div>
                    ) : null}
                </div>

                {showRight ? (
                    <>
                        <ShellSplitter orientation="vertical" onDragStart={handleRightDragStart} onDrag={handleRightDrag} />
                        <RegionPanel
                            region={rightSpec}
                            side="right"
                            size={rightSize}
                            collapsed={rightRail}
                            onToggleCollapsed={rightToggle?.toggle}
                            {...sectionState("right", rightSpec)}
                            {...secondaryState("right", rightSpec)}
                        />
                    </>
                ) : null}
            </div>

            {bottomRegion ? (
                <>
                    {/* The dock's resize handle — the one area that had none before the redesign. */}
                    {!bottomCollapsed ? (
                        <ShellSplitter
                            orientation="horizontal"
                            title="Resize panel"
                            onDragStart={handleBottomDragStart}
                            onDrag={handleBottomDrag}
                        />
                    ) : null}
                    <ShellBottomDock
                        region={bottomRegion}
                        collapsed={bottomCollapsed}
                        onToggleCollapsed={() => layoutStore.toggleCollapsed(kind, "bottom")}
                        height={bottomHeight}
                    />
                </>
            ) : null}

            <ShellStatusBar
                name={runtime.status?.name}
                coords={runtime.status?.coords}
                message={runtime.status?.message}
                extra={layout.statusExtra}
            />
        </div>
    );
};
