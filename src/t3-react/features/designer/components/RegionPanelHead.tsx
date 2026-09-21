/**
 * Designer — a region's panel head.
 *
 * One row, no stacking, and what it draws is decided by `regionHeadContent` (pure, unit-tested):
 *  - more than one tab  → a tab strip;
 *  - a single tab       → the tab's label (unless the tab opts out with `header: "never"`);
 *  - a single tab that opts out → nothing at all, which is what keeps the LCD document looking exactly like
 *    the legacy page (its toolbox draws its own title inside the body);
 *  - **collapsed** → the chevron and nothing else, whatever the tabs are: the region is a 28 px rail there,
 *    and drawing a title in it pushed the chevron out of the region's visible area (see `regionHeadContent`).
 *
 * ## The look (2026-09-20)
 *
 * A 32 px chrome bar on `colorNeutralBackground2`, and the tabs are **full height**: the active one is a white
 * slab that sits flush on the bar's bottom hairline with a 2 px brand indicator, so it reads as connected to
 * the panel body below it — one glance answers "which panel is open", which a thin underline could not. Idle
 * tabs are transparent with a rounded hover, the active label goes semibold, and a single-tab region shows a
 * quiet uppercase section title instead of a shouting one. Every value is a Fluent token, so the dark theme
 * follows for free.
 */
import React from "react";
import { makeStyles, mergeClasses, tokens, Tooltip } from "@fluentui/react-components";
import { ChevronDownRegular, ChevronLeftRegular, ChevronRightRegular, ChevronUpRegular, DismissRegular } from "@fluentui/react-icons";
import type { PanelTab } from "../DocumentAdapter";

/** The chrome bar's height — the rail's labels and the tool groups are aligned against the same rhythm. */
export const REGION_HEAD_HEIGHT = 32;

const useStyles = makeStyles({
    head: {
        display: "flex",
        alignItems: "stretch",
        flexShrink: 0,
        gap: "2px",
        minHeight: `${REGION_HEAD_HEIGHT}px`,
        padding: "0 4px",
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground2,
        overflow: "hidden"
    },
    /**
     * The head of a **collapsed** region, or of a panel that opted out of its header: a rail with the chevron
     * and nothing else — no bar, no rule, no title.
     */
    headBare: {
        minHeight: "24px",
        padding: 0,
        borderBottom: "none",
        backgroundColor: "transparent"
    },
    tabs: {
        display: "flex",
        alignItems: "stretch",
        flex: 1,
        minWidth: 0,
        overflowX: "auto",
        overscrollBehaviorX: "contain",
        // A scrollbar in a 32 px bar is noise; the strip scrolls by wheel/drag instead.
        scrollbarWidth: "none",
        "::-webkit-scrollbar": { display: "none" }
    },
    tab: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexShrink: 0,
        padding: "0 10px",
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground2,
        cursor: "default",
        whiteSpace: "nowrap",
        border: "none",
        background: "transparent",
        borderRadius: "4px 4px 0 0",
        transitionProperty: "background-color, color",
        transitionDuration: "0.1s",
        ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover },
        ":active": { backgroundColor: tokens.colorNeutralBackground1Pressed }
    },
    /** The open panel: the body's own surface, pulled up to the bar, with the brand indicator to date it. */
    tabActive: {
        color: tokens.colorNeutralForeground1,
        fontWeight: tokens.fontWeightSemibold,
        backgroundColor: tokens.colorNeutralBackground1,
        boxShadow: `inset 0 -2px 0 ${tokens.colorBrandForeground1}`
    },
    disabled: {
        color: tokens.colorNeutralForegroundDisabled,
        ":hover": { backgroundColor: "transparent" }
    },
    /** A single-tab region's title: a section label, not a button — quiet, small, spaced. */
    label: {
        alignSelf: "center",
        padding: "0 6px",
        fontSize: "11px",
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground2,
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
    },
    badge: {
        alignSelf: "center",
        fontSize: "10px",
        fontWeight: tokens.fontWeightSemibold,
        lineHeight: "16px",
        minWidth: "16px",
        textAlign: "center",
        borderRadius: "999px",
        padding: "0 6px",
        backgroundColor: tokens.colorNeutralBackground4,
        color: tokens.colorNeutralForeground2
    },
    close: {
        display: "flex",
        alignItems: "center",
        border: "none",
        background: "transparent",
        cursor: "default",
        color: tokens.colorNeutralForeground3,
        padding: "0 2px",
        borderRadius: "4px",
        ":hover": { color: tokens.colorNeutralForeground1, backgroundColor: tokens.colorNeutralBackground1Hover }
    },
    spacer: { flex: 1 },
    /** An icon button, not a bare glyph: 24 px, rounded, hover-filled. */
    chevron: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        width: "24px",
        height: "24px",
        flexShrink: 0,
        border: "none",
        background: "transparent",
        cursor: "default",
        borderRadius: "4px",
        color: tokens.colorNeutralForeground2,
        ":hover": { color: tokens.colorNeutralForeground1, backgroundColor: tokens.colorNeutralBackground1Hover }
    }
});

/**
 * What a region head draws — the rule, as a pure function (the render below only maps it to elements).
 *
 * A **collapsed** region is a 28 px icon rail and can show nothing but the chevron: `"chevron-only"` is
 * therefore independent of the tab count and of the `header` opt-out. Measured defect when it was not: the
 * title was drawn too, which pushed the 24 px chevron to x 20 … 44 in a 28 px column, so the region's
 * `overflow: hidden` cut three quarters of it away and the panel could be collapsed but never brought back.
 */
export type RegionHeadContent =
    /** Nothing at all — an open panel that opted out of its header (`PanelTab.header: "never"`). */
    | "none"
    /** A collapsed region: the chevron alone. */
    | "chevron-only"
    /** One tab, so a title. */
    | "title"
    /** Several tabs, so the strip. */
    | "tabs";

export function regionHeadContent(
    tabCount: number,
    header: PanelTab["header"],
    collapsed: boolean,
    /**
     * A **bar** keeps its strip while closed — the bottom dock, and the origin's closed FlexLayout border,
     * which still draws its tab bar (that is how a closed dock is reopened by clicking a tab). A left/right
     * rail cannot: 28 px holds the chevron and nothing else.
     */
    keepTabsWhenCollapsed = false
): RegionHeadContent {
    if (collapsed && !keepTabsWhenCollapsed) {
        return "chevron-only";
    }

    if (tabCount === 0) {
        return collapsed ? "chevron-only" : "none";
    }

    if (tabCount === 1 && header === "never" && !collapsed) {
        return "none";
    }

    return tabCount > 1 ? "tabs" : "title";
}

export interface RegionPanelHeadProps {
    tabs: PanelTab[];
    activeTabId: string;
    onSelectTab: (tabId: string) => void;
    /**
     * Side of the shell the region sits on — decides the collapse chevron direction. `"bottom"` is the
     * bottom dock: there the chevron points down to collapse and up to expand, not sideways.
     */
    side: "left" | "right" | "bottom";
    collapsible?: boolean;
    /**
     * True while the region is collapsed to its icon rail. The head is still drawn then, and the chevron
     * flips to point **outwards** — a panel that can only be collapsed, never reopened, is a trap.
     */
    collapsed?: boolean;
    /** The bottom dock: keep the tab strip while closed, so a closed dock is reopenable by its own tabs. */
    keepTabsWhenCollapsed?: boolean;
    onToggleCollapsed?: () => void;
}

export const RegionPanelHead: React.FC<RegionPanelHeadProps> = ({
    tabs,
    activeTabId,
    onSelectTab,
    side,
    collapsible,
    collapsed,
    keepTabsWhenCollapsed,
    onToggleCollapsed
}) => {
    const styles = useStyles();
    const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
    const content = regionHeadContent(tabs.length, activeTab?.header, !!collapsed, keepTabsWhenCollapsed);

    if (content === "none") {
        return null;
    }

    /** The collapsed head is the rail: bare chrome, chevron only. */
    const rail = content === "chevron-only";

    return (
        <div className={rail ? mergeClasses(styles.head, styles.headBare) : styles.head}>
            {rail ? (
                <span className={styles.spacer} />
            ) : content === "tabs" ? (
                <div className={styles.tabs} role="tablist">
                    {tabs.map((tab) => {
                        const badge = tab.badge?.();
                        const active = tab.id === activeTabId;
                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={active}
                                title={tab.label}
                                disabled={tab.disabled}
                                onClick={() => !tab.disabled && onSelectTab(tab.id)}
                                className={mergeClasses(
                                    styles.tab,
                                    active ? styles.tabActive : "",
                                    tab.disabled ? styles.disabled : ""
                                )}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                                {badge ? <span className={styles.badge}>{badge}</span> : null}
                                {tab.closable ? (
                                    <span
                                        role="button"
                                        aria-label={`Close ${tab.label}`}
                                        className={styles.close}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            tab.onClose?.();
                                        }}
                                    >
                                        <DismissRegular style={{ fontSize: 12 }} />
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            ) : (
                <>
                    <span className={styles.label}>{activeTab?.label}</span>
                    {activeTab?.badge?.() ? <span className={styles.badge}>{activeTab.badge()}</span> : null}
                    <span className={styles.spacer} />
                </>
            )}

            {collapsible ? (
                <Tooltip content={collapsed ? "Expand panel" : "Collapse panel"} relationship="label">
                    <button
                        type="button"
                        aria-label={collapsed ? "Expand panel" : "Collapse panel"}
                        aria-expanded={!collapsed}
                        className={styles.chevron}
                        onClick={onToggleCollapsed}
                    >
                        {/* Expanded points inwards (collapse); collapsed points back out (expand). */}
                        {side === "bottom" ? (
                            collapsed ? (
                                <ChevronUpRegular style={{ fontSize: 14 }} />
                            ) : (
                                <ChevronDownRegular style={{ fontSize: 14 }} />
                            )
                        ) : side === "left" ? (
                            collapsed ? (
                                <ChevronRightRegular style={{ fontSize: 14 }} />
                            ) : (
                                <ChevronLeftRegular style={{ fontSize: 14 }} />
                            )
                        ) : collapsed ? (
                            <ChevronLeftRegular style={{ fontSize: 14 }} />
                        ) : (
                            <ChevronRightRegular style={{ fontSize: 14 }} />
                        )}
                    </button>
                </Tooltip>
            ) : null}
        </div>
    );
};
