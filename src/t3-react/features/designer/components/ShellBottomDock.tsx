/**
 * Designer — the optional bottom dock (Checks / Output / Search / References for an LVGL document).
 *
 * Collapsed by default; the tab strip stays visible while collapsed so the dock can be reopened.
 * The body is its own scroll container on purpose: several EEZ panels call `scrollIntoView` on every
 * update (`ui-components/Output.tsx:118-136`), which would otherwise scroll an ancestor.
 */
import React, { useMemo } from "react";
import { makeStyles, tokens } from "@fluentui/react-components";
import type { RegionSpec } from "../DocumentAdapter";
import { RegionPanelHead } from "./RegionPanelHead";

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        minHeight: 0,
        borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground1,
        overflow: "hidden"
    },
    head: {
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        borderTop: "none"
    },
    body: {
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        borderTop: `1px solid ${tokens.colorNeutralStroke2}`
    }
});

export interface ShellBottomDockProps {
    region: RegionSpec;
    collapsed: boolean;
    onToggleCollapsed: () => void;
    /** Height in px when expanded (ignored while collapsed). */
    height: number;
}

export const ShellBottomDock: React.FC<ShellBottomDockProps> = ({
    region,
    collapsed,
    onToggleCollapsed,
    height
}) => {
    const styles = useStyles();
    /*
     * The dock lays out horizontally and EEZ's bottom border is always a single tabset, so a nested
     * `sections` stack is not a shape this region draws. If a model ever nests one here, show its first
     * group rather than an empty band.
     */
    const tabs = region.tabs.length > 0 ? region.tabs : region.sections?.[0]?.tabs ?? [];
    const activeTab = tabs.find((tab) => tab.id === region.activeTabId) ?? tabs[0];
    const body = useMemo(
        () => (collapsed ? null : activeTab?.content() ?? null),
        [activeTab?.id, region.activeTabId, collapsed] // eslint-disable-line react-hooks/exhaustive-deps
    );

    return (
        <div className={styles.root} style={{ height: collapsed ? undefined : height }}>
            <div className={styles.head}>
                <RegionPanelHead
                    tabs={tabs}
                    activeTabId={activeTab?.id ?? ""}
                    onSelectTab={region.onSelectTab}
                    side="bottom"
                    /*
                     * The dock **is** collapsible, so the head carries the chevron: the strip alone was the
                     * only way back before, which left no way out — clicking a tab opened the dock (the
                     * model selects it) and nothing could close it again.
                     */
                    collapsible
                    collapsed={collapsed}
                    keepTabsWhenCollapsed
                    onToggleCollapsed={onToggleCollapsed}
                />
            </div>
            {!collapsed ? <div className={styles.body}>{body}</div> : null}
        </div>
    );
};
