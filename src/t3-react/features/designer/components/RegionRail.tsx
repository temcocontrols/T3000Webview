/**
 * Designer — a region's **rail**: the vertical tab bar the old page drew as a FlexLayout *border*.
 *
 * The origin puts a rotated tab bar on the window edge (Styles · Fonts · Bitmaps · Themes · Groups ·
 * Breakpoints · Variables on the right, Texts · Scpi · … on the left) and opens the selected panel in a
 * column beside it, leaving the region's own column — and its normal top tab strip — untouched. That is the
 * shape the user asked for after the shell had merged all of it into one horizontal strip: measured, the
 * eight right-side tabs needed 471 px and had 228 px, so five of them were unreachable.
 *
 * Two things this component owns, both copied from the origin rather than invented:
 *
 * * the labels are **rotated** (`writing-mode: vertical-rl`), reading downwards on the right edge and
 *   upwards on the left — `flexlayout-react/style/light.css:388-399` rotates the container +90° for the
 *   right border and −90° for the left, which is the same thing;
 * * a click on the **already open** tab closes the column. FlexLayout's `SELECT_TAB` handler does exactly
 *   that for a border (`flexlayout-react/lib/model/Model.js`), so the model and the bar cannot disagree.
 *
 * No `Tooltip`: a tooltip is a portal, and a portal cannot be rendered by `renderToStaticMarkup` — the band's
 * tests already pay for that lesson. The label is visible, and the button carries `aria-label` + `title`.
 */
import React from "react";
import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import type { RailSpec } from "../DocumentAdapter";

/** Thickness of the bar itself — FlexLayout's measured `borderBarSize` for a rotated strip. */
export const RAIL_BAR_WIDTH = 26;

const useStyles = makeStyles({
    /** The bar plus the open column, at the region's outer edge. */
    rail: {
        display: "flex",
        flexShrink: 0,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden"
    },
    railRight: {
        flexDirection: "row"
    },
    railLeft: {
        flexDirection: "row-reverse"
    },
    bar: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        flexShrink: 0,
        width: `${RAIL_BAR_WIDTH}px`,
        gap: "2px",
        padding: "6px 0",
        overflow: "hidden auto",
        scrollbarWidth: "none",
        "::-webkit-scrollbar": { display: "none" },
        backgroundColor: tokens.colorNeutralBackground2
    },
    /** The rule faces the body, never the window edge. */
    barRight: {
        borderLeft: `1px solid ${tokens.colorNeutralStroke2}`
    },
    barLeft: {
        borderRight: `1px solid ${tokens.colorNeutralStroke2}`
    },
    tab: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "4px",
        flexShrink: 0,
        padding: "8px 0",
        border: "none",
        background: "transparent",
        color: tokens.colorNeutralForeground2,
        fontSize: "11px",
        letterSpacing: "0.5px",
        cursor: "default",
        whiteSpace: "nowrap",
        borderRadius: "4px",
        transitionProperty: "background-color, color",
        transitionDuration: "0.1s",
        ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover }
    },
    /** The open panel's rail tab: brand tint + brand label, so the bar names what is open. */
    active: {
        color: tokens.colorBrandForeground1,
        fontWeight: tokens.fontWeightSemibold,
        backgroundColor: tokens.colorBrandBackground2
    },
    disabled: {
        color: tokens.colorNeutralForegroundDisabled,
        ":hover": { backgroundColor: "transparent" }
    },
    markerRight: { boxShadow: `inset -2px 0 0 ${tokens.colorBrandForeground1}` },
    markerLeft: { boxShadow: `inset 2px 0 0 ${tokens.colorBrandForeground1}` },
    /** The open tab's column. No head of its own: the bar *is* the switcher, as in the origin. */
    content: {
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        backgroundColor: tokens.colorNeutralBackground1
    },
    contentRight: {
        borderLeft: `1px solid ${tokens.colorNeutralStroke2}`
    },
    contentLeft: {
        borderRight: `1px solid ${tokens.colorNeutralStroke2}`
    },
    body: {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: "auto",
        display: "flex",
        flexDirection: "column"
    }
});

export interface RegionRailProps {
    rail: RailSpec;
    /** The panel the open tab renders — resolved by the caller (it owns the panel registry). */
    children?: React.ReactNode;
}

/**
 * The rotation, in **inline style** rather than a class: it is a hard requirement of the look (a reader has to
 * be able to tell a border from a strip at a glance), and inline style is what a static-markup test can see.
 * A left bar reads upwards, which is flexlayout's `rotate(-90deg)` for `border_left`.
 */
export function railLabelStyle(side: "left" | "right"): React.CSSProperties {
    return side === "left"
        ? { writingMode: "vertical-rl", transform: "rotate(180deg)" }
        : { writingMode: "vertical-rl" };
}

export const RegionRail: React.FC<RegionRailProps> = ({ rail, children }) => {
    const styles = useStyles();
    const left = rail.side === "left";
    const open = rail.tabs.find((tab) => tab.id === rail.activeTabId);

    // A bar with nothing in it is a strip of nothing down the window edge (`enableTabOnBorder` gates the
    // left border's five tabs on what the project has, and most projects have none of them).
    if (rail.tabs.length === 0) {
        return null;
    }

    return (
        <div
            className={mergeClasses(styles.rail, left ? styles.railLeft : styles.railRight)}
            data-shell-rail={rail.side}
        >
            <div
                role="tablist"
                aria-orientation="vertical"
                aria-label={rail.label}
                className={mergeClasses(styles.bar, left ? styles.barLeft : styles.barRight)}
                data-shell-rail-bar="true"
            >
                {rail.tabs.map((tab) => {
                    const active = tab.id === rail.activeTabId;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            aria-expanded={active}
                            disabled={tab.disabled}
                            title={tab.label}
                            aria-label={tab.label}
                            onClick={() => rail.onSelectTab(tab.id)}
                            style={railLabelStyle(rail.side)}
                            className={mergeClasses(
                                styles.tab,
                                active ? styles.active : "",
                                active ? (left ? styles.markerLeft : styles.markerRight) : "",
                                tab.disabled ? styles.disabled : ""
                            )}
                            data-rail-tab={tab.id}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {open ? (
                <div
                    className={mergeClasses(styles.content, left ? styles.contentLeft : styles.contentRight)}
                    style={{ width: rail.width }}
                    data-shell-rail-content={open.id}
                >
                    {children}
                </div>
            ) : null}
        </div>
    );
};
