/**
 * Designer — one region of the shell (left / right / bottom).
 *
 * A region is a *tab container* (D9). Normally its body is a single tab strip: `region.tabs` with
 * `region.activeTabId` selected. With a single tab and `header: "never"` it renders as a bare panel —
 * that is how the HVAC document keeps the exact look of the existing page (no title row above its tools).
 *
 * **A body can also be a stack of tab groups** (`region.sections`). EEZ's left area really is nested — the
 * live model is a row holding *Pages | User Widgets | User Actions* **above** *Components Palette* — and
 * drawing those tabsets as one flat strip is what made the left panel's bottom area disappear. Each
 * section keeps its own strip and its own selection; two or more are separated by a draggable splitter,
 * and the shares come from the model's weights until the user drags one.
 */
import React, { Fragment, useCallback, useMemo, useRef } from "react";
import { makeStyles, tokens } from "@fluentui/react-components";
import type { PanelTab, RegionSectionSpec, RegionSpec } from "../DocumentAdapter";
import { RegionPanelHead } from "./RegionPanelHead";
import { RegionRail } from "./RegionRail";
import { ShellSplitter } from "./ShellSplitter";

const useStyles = makeStyles({
    root: {
        display: "flex",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        backgroundColor: tokens.colorNeutralBackground1
    },
    column: {
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        flex: 1
    },
    secondary: {
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        flexShrink: 0,
        // Same containing-block rule as `body` below: a document may put panel content straight into this
        // column (LCD's page list has no tab strip), and EEZ panels size against their host.
        position: "relative",
        // No border of its own: the shell's splitter draws the hairline against the canvas, and a second rule
        // 1 px away from it reads as a rendering defect. The tint is what separates it from the body.
        backgroundColor: tokens.colorNeutralBackground2
    },
    /** The stack of sections that fills the region body. */
    sections: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden"
    },
    section: {
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
        backgroundColor: tokens.colorNeutralBackground1
    },
    /**
     * The panel host — the shell's stand-in for flexlayout's `.flexlayout__tab`.
     *
     * `position: relative` is **load-bearing**, exactly as it is on `.flexlayout__tab`
     * (`flexlayout-react/style/light.css:204`: `overflow: auto; position: absolute`). Panels written for
     * EEZ assume their tab is the containing block and size themselves against it — `EezStudio_SubNavigation`
     * (`project-editor.less:2860`, the Components Palette) is `position: absolute; width: 100%; height: 100%`.
     * Without a positioned ancestor here that element resolves against the shell's main area and is drawn at the
     * *window's* size: the palette (measured) became 944 x 490 inside a 295 x 221 column and was overlapped by
     * the Widgets Structure column beside it.
     */
    body: {
        position: "relative",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: "auto",
        display: "flex",
        flexDirection: "column"
    },
    /** The panel an open rail tab shows — inside the rail's own column, like a border's content area. */
    railBody: {
        position: "relative",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: "auto",
        display: "flex",
        flexDirection: "column"
    },
    footer: {
        flexShrink: 0,
        borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground2
    }
});

/** The smallest share a section may be dragged to, as a fraction of its pair. */
const MIN_SECTION_SHARE = 0.12;

/**
 * The width the region's **own** column keeps before a fixed side column gives way.
 *
 * A secondary column is a fixed width (`secondary.defaultWidth` — the EEZ structure column is 223 px) and it
 * does not shrink on its own, so on a region narrower than side-column + this the body loses everything: it is
 * the body that carries the head, the collapse/expand chevron and (when expanded) the main column. Measured on
 * the real page, on a 28 px collapsed left region: the body column came out **0 px** wide next to a 223 px
 * Widgets Structure column, so the rail showed an empty sliver of the structure panel and no chevron at all.
 */
const MIN_BODY_WIDTH_PX = 160;

/**
 * One tab group: a strip plus the active tab's content.
 *
 * Its own component so the memo is per group — switching a tab in one section must not re-render the
 * other sections' trees (R17).
 */
const SectionView: React.FC<{
    id: string;
    tabs: PanelTab[];
    activeTabId?: string;
    onSelectTab?: (tabId: string) => void;
    side: "left" | "right";
    collapsible?: boolean;
    onToggleCollapsed?: () => void;
    collapsed?: boolean;
    className?: string;
    style?: React.CSSProperties;
}> = ({ id, tabs, activeTabId, onSelectTab, side, collapsible, onToggleCollapsed, collapsed, className, style }) => {
    const styles = useStyles();
    const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

    const body = useMemo(
        () => activeTab?.content() ?? null,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [id, activeTab?.id, activeTabId]
    );

    return (
        <div className={className} style={style}>
            <RegionPanelHead
                tabs={tabs}
                activeTabId={activeTab?.id ?? ""}
                onSelectTab={onSelectTab ?? (() => undefined)}
                side={side}
                collapsible={collapsible}
                collapsed={collapsed}
                onToggleCollapsed={onToggleCollapsed}
            />
            {!collapsed && <div className={styles.body}>{body}</div>}
        </div>
    );
};

export interface RegionPanelProps {
    region: RegionSpec;
    side: "left" | "right";
    /** Resolved width (left/right) or height (bottom) in px. */
    size: number;
    /** True when the region is collapsed; renders the head as a slim icon rail. */
    collapsed?: boolean;
    /**
     * Collapse/expand this region. Supplied by the **shell** (it owns the layout store), because a document's
     * spec describes its panels, not where they are remembered. `region.onToggleCollapsed` wins when a
     * document wants to handle it itself.
     */
    onToggleCollapsed?: () => void;
    /** True for the bottom dock, which lays out horizontally and uses `size` as a height. */
    horizontal?: boolean;
    /** Resolved shares of the region body for `region.sections`, top to bottom. */
    sectionFractions?: number[];
    /** Called with the new shares after a splitter drag; the shell remembers them. */
    onSectionFractionsChange?: (fractions: number[]) => void;
    /**
     * Width (px) of `region.secondary` — the region's second column.
     *
     * The origin's left area is **two panels** with a divider between them (Components Palette | Widgets
     * Structure), so this is a size the user drags, not a fixed number from the model.
     */
    secondaryWidth?: number;
    /** Called with the new width after the divider is dragged; the shell remembers it. */
    onSecondaryWidthChange?: (width: number) => void;
}

/** The single-strip body, memoised per tab id so a tab switch does not rebuild the other trees (R17). */
const SingleBody: React.FC<{ region: RegionSpec }> = ({ region }) => {
    const styles = useStyles();
    const activeTab = region.tabs.find((tab) => tab.id === region.activeTabId) ?? region.tabs[0];

    const body = useMemo(
        () => activeTab?.content() ?? null,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [activeTab?.id, region.activeTabId]
    );

    return <div className={styles.body}>{body}</div>;
};

export const RegionPanel: React.FC<RegionPanelProps> = ({
    region,
    side,
    size,
    horizontal,
    collapsed,
    onToggleCollapsed,
    sectionFractions,
    onSectionFractionsChange,
    secondaryWidth: secondaryWidthChosen,
    onSecondaryWidthChange
}) => {
    const styles = useStyles();
    const sections = region.sections;
    /** The shell's handler unless the document supplied its own. */
    const toggleCollapsed = region.onToggleCollapsed ?? onToggleCollapsed;
    const stackRef = useRef<HTMLDivElement>(null);
    /**
     * The split as it was when the drag started, plus the body height. `ShellSplitter` reports the *total*
     * delta from the drag start on every pointermove, so the arithmetic has to start from a snapshot —
     * applying it to the live fractions compounds the delta (measured: a 60 px drag moved the divider 269 px).
     */
    const dragStateRef = useRef<{ height: number; fractions: number[] } | null>(null);
    /** The second column's width when its divider drag started — deltas are reported from there. */
    const secondaryDragRef = useRef<number | null>(null);

    // The model's weights become fractions; equal shares when the model gave none. The user's own split
    // (`sectionFractions`) wins once it exists.
    const fractions = useMemo(() => {
        const count = sections?.length ?? 0;
        if (count === 0) {
            return [];
        }

        if (sectionFractions && sectionFractions.length === count) {
            return sectionFractions;
        }

        const weights = sections!.map((section) =>
            section.weight && section.weight > 0 ? section.weight : 1
        );
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        return weights.map((weight) => weight / total);
    }, [sections, sectionFractions]);

    const onSplitterDrag = useCallback(
        (index: number, deltaPx: number) => {
            const start = dragStateRef.current;
            if (!start || !start.height || !sections || sections.length < 2) {
                return;
            }

            // Only the two groups either side of the handle move, and their total stays constant.
            const [before, after] = [start.fractions[index], start.fractions[index + 1]];
            const pairSum = before + after;
            const min = MIN_SECTION_SHARE * pairSum;
            const moved = Math.min(Math.max(before + deltaPx / start.height, min), pairSum - min);

            const next = [...start.fractions];
            next[index] = moved;
            next[index + 1] = pairSum - moved;
            onSectionFractionsChange?.(next);
        },
        [sections, onSectionFractionsChange]
    );

    const secondary = region.secondary;
    /** `side: "end"` puts the second column between the body and the canvas. */
    const secondaryAtEnd = secondary?.side === "end";
    /**
     * What the column actually gets.
     *
     * The chosen width (dragged, or the model's default) inside the document's min/max, and then capped so the
     * region's own column keeps `MIN_BODY_WIDTH_PX`. The cap is why a narrow region no longer spends itself on a
     * fixed side column — and why a collapsed 28 px rail shows its chevron instead of a column's edge.
     */
    const secondarySize =
        !secondary || secondary.collapsed || collapsed || horizontal
            ? 0
            : Math.min(
                  Math.min(
                      secondary.max,
                      Math.max(secondary.min, secondaryWidthChosen ?? secondary.defaultWidth)
                  ),
                  Math.max(0, size - MIN_BODY_WIDTH_PX)
              );

    const secondaryNode =
        secondary && secondarySize > 0 ? (
            <div className={styles.secondary} style={{ width: secondarySize, flex: "0 0 auto" }}>
                {secondary.tabs && secondary.tabs.length > 0 ? (
                    <SectionView
                        id={secondary.id}
                        className={styles.section}
                        style={{ flex: 1 }}
                        tabs={secondary.tabs}
                        activeTabId={secondary.activeTabId}
                        onSelectTab={secondary.onSelectTab}
                        side={side}
                    />
                ) : (
                    secondary.content?.() ?? null
                )}
            </div>
        ) : null;

    /**
     * The divider between the two panels.
     *
     * The origin has one — EEZ's left area is the Components Palette beside the Widgets Structure, and both are
     * resizable — so the column cannot simply be a fixed width. It is drawn whenever the column is on screen
     * (not only while it has width) so a column dragged to nothing can be dragged back.
     */
    const secondaryDivider =
        secondary && !secondary.collapsed && !collapsed && !horizontal ? (
            <ShellSplitter
                orientation="vertical"
                title={`Resize ${region.id} / ${secondary.id}`}
                onDragStart={() => {
                    secondaryDragRef.current = secondarySize || secondary.defaultWidth;
                }}
                onDrag={(delta) => {
                    const start = secondaryDragRef.current;
                    if (start == null) {
                        return;
                    }
                    // Dragging towards the canvas widens the body, so the column shrinks when it sits at the end.
                    const wanted = start + (secondaryAtEnd ? -delta : delta);
                    onSecondaryWidthChange?.(
                        Math.round(Math.min(secondary.max, Math.max(secondary.min, wanted)))
                    );
                }}
            />
        ) : null;

    /*
     * The rail, on the region's **outer** edge: the origin's border bar is drawn on the window edge, so a
     * left region's rail comes before everything and a right region's after — never between the body and
     * the canvas. The open tab's panel renders in the rail's own column (no strip of its own: the bar is the
     * switcher), which is what keeps the region's normal top strip down to its own column's tabs.
     */
    const rail = region.rail;
    const railActive = rail?.tabs.find((tab) => tab.id === rail.activeTabId);
    const railNode =
        rail && !collapsed ? (
            <RegionRail rail={rail}>
                {railActive ? <div className={styles.railBody}>{railActive.content()}</div> : null}
            </RegionRail>
        ) : null;

    return (
        <div
            className={styles.root}
            style={
                horizontal
                    ? { height: size, flex: `0 0 ${size}px`, flexDirection: "column" as const }
                    : { width: size, flex: `0 0 ${size}px` }
            }
        >
            {side === "left" ? railNode : null}

            {secondaryAtEnd ? null : secondaryNode}
            {secondaryAtEnd ? null : secondaryDivider}

            <div className={styles.column}>
                {sections && sections.length > 0 ? (
                    <div className={styles.sections} ref={stackRef}>
                        {sections.map((section: RegionSectionSpec, index) => (
                            <Fragment key={section.id}>
                                {index > 0 ? (
                                    <ShellSplitter
                                        orientation="horizontal"
                                        title={`Resize ${sections[index - 1].id} / ${section.id}`}
                                        onDragStart={() => {
                                            dragStateRef.current = {
                                                height: stackRef.current?.clientHeight ?? 0,
                                                fractions: [...fractions]
                                            };
                                        }}
                                        onDrag={(delta) => onSplitterDrag(index - 1, delta)}
                                    />
                                ) : null}
                                <SectionView
                                    id={section.id}
                                    className={styles.section}
                                    style={{ flex: `${fractions[index]} 1 0px` }}
                                    tabs={section.tabs}
                                    activeTabId={section.activeTabId}
                                    onSelectTab={section.onSelectTab}
                                    side={side}
                                    collapsed={collapsed}
                                    // The region's collapse toggle rides on the first group's strip: with a
                                    // stack there is no separate region header to hang it on.
                                    collapsible={index === 0 ? region.collapsible : undefined}
                                    onToggleCollapsed={index === 0 ? toggleCollapsed : undefined}
                                />
                            </Fragment>
                        ))}
                    </div>
                ) : (
                    <>
                        <RegionPanelHead
                            tabs={region.tabs}
                            activeTabId={region.activeTabId ?? region.tabs[0]?.id ?? ""}
                            onSelectTab={region.onSelectTab}
                            side={side}
                            collapsible={region.collapsible}
                            collapsed={collapsed}
                            onToggleCollapsed={toggleCollapsed}
                        />
                        {!collapsed && <SingleBody region={region} />}
                    </>
                )}
                {region.footer ? <div className={styles.footer}>{region.footer}</div> : null}
            </div>

            {secondaryAtEnd ? secondaryDivider : null}
            {secondaryAtEnd ? secondaryNode : null}

            {side === "right" ? railNode : null}
        </div>
    );
};
