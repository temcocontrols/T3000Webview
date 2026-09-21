/**
 * Designer — the shell's top area: **one 60 px band** of tool groups (user decision).
 *
 *   ┌──────────┬───────────┬─────────┬──────────┬─────────┬───────┬────────┬──────────────┐
 *   │ ⌖Select  │ ✂Cut      │ ↶Undo   │ ⟳Rotate  │ ⊞Group  │ ＋Add │ 🖼Backg │ ◧ ◨ ⋯        │
 *   │ 🔒Lock   │ ⧉Copy     │ 💾Save  │ ⊞Align   │ ▲Bring  │ 🗀Load│ ▦Rulers │              │
 *   │ ▤SelectAll│ ＋Dup 📋Paste│ ↷Redo  │ ⇋Flip    │ ⊟Ungroup│       │ ▤Grid   │              │
 *   │ 🔓Unlock │ ⌫Delete   │ ⌫Clear  │ ⤢Same    │ ▼Send   │       │ ⊖Zoom ⊕│              │
 *   └──────────┴───────────┴─────────┴──────────┴─────────┴───────┴────────┴──────────────┘
 *     ╎ full-height 1 px rules ╎   groups: 2 item-rows each (the band's 60 px)        trailing
 *
 * **There is no identity block.** The band used to carry a 160 px panel with the back button, the
 * document's name, its kind and a dirty dot; the user removed it — the app's own menu bar above the
 * band already has Home/Design Hub, and the name is not needed twice (the status bar and the Design Hub
 * card both carry it). So the band is just tools + the shell's trailing controls, and the tools start at
 * the left edge with ~170 px more room than they had.
 *
 * The band is ONE row of **group columns**: a group stacks its items into two rows (that is what the
 * 60 px is for), so a group is about half as wide as a single-row one, and the rule that ends it can run
 * the band's full height — which is exactly how the old `TopToolbar` grouped things. Two rows per group
 * instead of one row per group is also what buys the density: the whole legacy set is ~1239 px of
 * content here, against ~2298 px laid out flat.
 *
 * Four rules:
 *
 *  1. **Labels are never dropped.** Every tool is `icon + label`; a row of bare icons is not readable.
 *  2. **Columns are the unit; folding is the last resort.** Groups are laid out in order and whatever
 *     does not fit lands in the single `⋯` as labelled submenus. Nothing is hidden silently, there is no
 *     `»` and no horizontal scrollbar.
 *  3. **The layout is computed, not left to CSS.** Widths come from an off-screen clone of every group
 *     (`styles.measure`) and `fitGroupCount` is a pure function of them, so a group is never clipped or
 *     split and the row cannot ratchet downwards.
 *  4. **Nothing is drawn twice.** A document that declares the shell's own controls as its groups sets
 *     `TopSpec.shellControls`, and the shell stops drawing its copies.
 *
 * A document contributes **groups of items, never a bar** (`TopSpec.groups`).
 *
 * The clone row is why the fill cannot ratchet to zero: `fitGroupCount` is a *pure function of the
 * measured widths and the zone width*, so growing the window restores groups by itself. The first
 * version measured the groups that were *currently on screen*, so once everything had folded there was
 * nothing left to measure and the tools never came back (verified live: 0 groups at 1400 px after one
 * narrow resize).
 *
 * The app menu bar above the band belongs to the app shell (`layout/MinimalLayout.tsx`), not to the
 * designer, and is deliberately untouched.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
    Button,
    Menu,
    MenuDivider,
    MenuItem,
    MenuList,
    MenuPopover,
    MenuTrigger,
    Tooltip,
    makeStyles,
    tokens
} from "@fluentui/react-components";
import {
    ArrowRedoRegular,
    ArrowUndoRegular,
    MoreHorizontalRegular
} from "@fluentui/react-icons";
import type { HistorySpec, ToolGroupSpec, ToolItemSpec, TopOverflowItem, TopSpec } from "../DocumentAdapter";
import { useEnginePoll } from "../hooks/useEnginePoll";
import { ShellCommandBar } from "./ShellCommandBar";
import { ToolGroupDivider, ToolGroupInline, ToolGroupSubmenu } from "./ShellToolItems";

/** The band's height — the legacy strip's 60 px, because it has to hold two lines of controls. */
export const TOP_ROW_HEIGHT = 60;

/** One line inside the band; two of these are what the band's height holds — inside each group. */
export const TOOL_LINE_HEIGHT = 30;

/** Width of one group divider (1 px rule + 2 × 3 px margin) — the line maths counts it. */
const GROUP_DIVIDER_PX = 7;

/** Measurement not taken yet: an empty width list must never be read as “nothing fits”. */
const NO_WIDTHS: number[] = [];

/**
 * How many leading groups fit into `available` px — the whole layout rule, as a pure function.
 *
 * Pure is the point: the answer is a function of the *measured* widths and the zone width, never of
 * what is currently rendered, so it can be recomputed at any moment and cannot ratchet downwards the
 * way a “fold one more” correction does.
 *
 * Groups are atomic and the fill is greedy, so the answer is stable: the first group that does not fit
 * ends the row. `0` is a valid answer — with no room for even one group, `⋯` carries every tool.
 */
export function fitGroupCount(
    widths: readonly number[],
    available: number,
    dividerBeforeFirst = false
): number {
    let used = 0;
    let count = 0;

    for (let index = 0; index < widths.length; index += 1) {
        const divider = index > 0 || dividerBeforeFirst ? GROUP_DIVIDER_PX : 0;
        const next = used + divider + widths[index];
        if (next > available) {
            break;
        }
        used = next;
        count += 1;
    }

    return count;
}

const NO_GROUPS: never[] = [];

/** True when any item (or any of its children) declares engine-owned state the shell must sample. */
function itemsHaveLiveState(items: readonly ToolItemSpec[]): boolean {
    return items.some(
        (item) =>
            typeof item.disabled === "function" ||
            typeof item.checked === "function" ||
            !!item.field ||
            (item.children ? itemsHaveLiveState(item.children) : false)
    );
}

/**
 * Every declared live value of every group, as one string.
 *
 * A document's tools may carry engine-owned state — `disabled: () => …`, `checked: () => …` — which
 * React cannot observe (the same reason undo/redo is polled). This is the cheap comparison that makes
 * those items behave like the shell's own: the band re-renders **only when one of the values flips**,
 * so an Undo button with an empty stack is grey and a Rulers button shows a checkmark, at one poll per
 * 300 ms and no re-render in between.
 */
export function liveSignature(groups: readonly ToolGroupSpec[]): string {
    let signature = "";

    const walk = (items: readonly ToolItemSpec[]) => {
        for (const item of items) {
            if (typeof item.disabled === "function") {
                signature += item.disabled() ? "1" : "0";
            }
            if (typeof item.checked === "function") {
                signature += item.checked() ? "1" : "0";
            }
            // A field's value is live too: the zoom box has to follow a zoom taken anywhere else.
            if (item.field) {
                signature += `${item.field.value()}|`;
            }
            if (item.children) {
                walk(item.children);
            }
        }
    };

    for (const group of groups) {
        walk(group.items);
    }

    return signature;
}

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        backgroundColor: tokens.colorNeutralBackground1
    },
    /**
     * THE BAND — one row, 60 px, which is two 30 px lines of room. Also the positioning context for the
     * off-screen clone row.
     */
    bar: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        height: `${TOP_ROW_HEIGHT}px`,
        padding: "0 8px",
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground2,
        overflow: "hidden",
        position: "relative"
    },
    /**
     * Every group, laid out once more off-screen, so the line fill is computed from real widths at any
     * moment — including while the band shows only some of them. `visibility: hidden` keeps the layout
     * (a `display: none` row measures 0) and `absolute` keeps it out of the band's flow; the band's
     * `overflow: hidden` clips it.
     */
    measure: {
        position: "absolute",
        top: 0,
        left: 0,
        display: "flex",
        alignItems: "center",
        height: `${TOP_ROW_HEIGHT}px`,
        visibility: "hidden",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        overflow: "hidden"
    },
    /**
     * The document's tools: ONE row of group columns. Each group stacks its items into two rows, so the
     * band's 60 px is spent inside the groups — which is what makes a full-height rule between them
     * meaningful, exactly as in the legacy strip.
     */
    tools: {
        display: "flex",
        alignItems: "center",
        flex: 1,
        minWidth: 0,
        height: "100%",
        overflow: "hidden"
    },
    /** A document's own cluster (`top.tools`, LVGL/LCD) — one child of the tool row. */
    leading: {
        display: "flex",
        alignItems: "center",
        height: "100%",
        flexShrink: 0
    },
    trailing: {
        display: "flex",
        alignItems: "center",
        gap: "2px",
        flexShrink: 0
    },
    cluster: {
        display: "flex",
        alignItems: "center",
        gap: "2px",
        flexShrink: 0
    },
    /**
     * The document's **mode cluster**, pinned to the band's right end (`TopSpec.modeBar`).
     *
     * Outside the tools zone on purpose: the zone's `flex: 1` means its width is whatever the siblings
     * leave, so the cluster is subtracted from the tool groups' budget without the fold maths knowing
     * anything about it (and it can never be folded away — it is the way out of Run / Debug / Full Sim).
     *
     * It has **no rule of its own** in front of it (user request 2026-09-21: *"u can remove the vertical
     * indicator before the edit button"*): the band's own groups already carry full-height rules, and a
     * line in front of *Edit* read as if it belonged to the mode group rather than closing the tools.
     */
    mode: {
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        height: "100%",
        paddingLeft: "4px",
        paddingRight: "2px"
    },
    /** The single overflow trigger; the same menu that holds the folded tool groups. */
    more: {
        marginLeft: "2px"
    }
});

export interface ShellTopBarProps {
    top: TopSpec | undefined;
    /** Document history, when the adapter provides one. */
    history?: HistorySpec;
}

export const ShellTopBar: React.FC<ShellTopBarProps> = ({ top, history }) => {
    const styles = useStyles();

    // The undo stack lives in the engine, which React cannot observe — sample it on the shared poll.
    // Starts disabled so the first paint never advertises a step that may not exist.
    const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
    useEnginePoll(
        () => {
            if (!history) {
                return;
            }
            const next = {
                canUndo: history.canUndo ? history.canUndo() : true,
                canRedo: history.canRedo ? history.canRedo() : true
            };
            setHistoryState((prev) =>
                prev.canUndo === next.canUndo && prev.canRedo === next.canRedo ? prev : next
            );
        },
        250,
        !!history
    );

    /* --------------------------------------------------------- columns & folding */

    const groups = top?.groups ?? (NO_GROUPS as TopSpec["groups"] & never[]);
    const groupsRef = useRef(groups);
    groupsRef.current = groups;

    const zoneRef = useRef<HTMLDivElement>(null);
    /** A document's own cluster (LVGL/LCD `top.tools`), which sits before the first group. */
    const leadingRef = useRef<HTMLDivElement | null>(null);
    /** Refs into the off-screen clone row, one per group — the only source of group widths. */
    const measureRefs = useRef<Array<HTMLDivElement | null>>([]);
    const widthsRef = useRef<number[]>(NO_WIDTHS);
    const leadingWidthRef = useRef(0);
    /** Leading groups that fit the row; everything past this lives in `⋯`. */
    const [visibleGroups, setVisibleGroups] = useState<number>(groups?.length ?? 0);
    /**
     * Sampled engine-owned state of the document's tools — kept purely to force the re-render that
     * makes a live `disabled`/`checked` item repaint. The value is a signature, not the state itself.
     */
    const [liveState, setLiveState] = useState(() => liveSignature(groups));
    const hasLiveState = useMemo(
        () => groups.some((group) => itemsHaveLiveState(group.items)),
        [groups]
    );

    /** True when the row starts with the document's own cluster rather than with a group. */
    const dividerBeforeFirst = !!(top?.tools || top?.content);

    const measure = useCallback(() => {
        const widths = measureRefs.current.map((element) => element?.offsetWidth ?? 0);
        if (widths.length !== (groupsRef.current?.length ?? 0)) {
            return;
        }
        /**
         * All-zero means “the band has not been laid out yet” (a hidden pane, a 0-width host), which is
         * not a measurement. Keeping the previous numbers is the honest answer: no information, no
         * decision — and it means a pane that is resized while hidden cannot empty the band.
         */
        if (widths.every((width) => width === 0)) {
            return;
        }
        widthsRef.current = widths;
        leadingWidthRef.current = leadingRef.current?.offsetWidth ?? 0;
    }, []);

    /** Recompute the row. Reads only measured widths + the zone, so it is safe to call any time. */
    const fit = useCallback(() => {
        const zone = zoneRef.current;
        if (!zone || zone.clientWidth <= 0 || widthsRef.current.length === 0) {
            return;
        }
        const leadingWidth = leadingWidthRef.current;
        const next = fitGroupCount(widthsRef.current, zone.clientWidth - leadingWidth, leadingWidth > 0);
        setVisibleGroups((previous) => (previous === next ? previous : next));
    }, []);

    /*
     * Measure and fill in every layout pass, before the browser paints. Because the widths come from
     * the clone row rather than from the groups currently on screen, this is a *pure recomputation*: it
     * converges in one pass and a wider window restores groups immediately. The old version had to
     * render every group to measure it, then fold one more if the row still overflowed — which
     * overwrote the computed count with `previous - 1` and ratcheted the row down to zero groups.
     */
    useLayoutEffect(() => {
        measure();
        fit();
    });

    // A zone resize the observer can see (the band's own clusters growing/shrinking). The resizes it
    // cannot see — a hidden document — still arrive as `resize`/`visibilitychange` re-renders via the
    // app's own listeners, and the layout pass above refits on every render.
    useEffect(() => {
        const zone = zoneRef.current;
        if (!zone || typeof ResizeObserver === "undefined") {
            return;
        }
        const observer = new ResizeObserver(() => fit());
        observer.observe(zone);
        return () => observer.disconnect();
    }, [fit]);

    // The document's own live values (see `liveSignature`) — no re-render unless one of them flips.
    useEnginePoll(
        () => {
            const next = liveSignature(groupsRef.current ?? []);
            setLiveState((previous) => (previous === next ? previous : next));
        },
        300,
        hasLiveState
    );

    // Web fonts change the width of every label: re-measure once they have arrived.
    useEffect(() => {
        const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
        let alive = true;
        void fonts?.ready?.then?.(() => {
            if (alive) {
                measure();
                fit();
            }
        });
        return () => {
            alive = false;
        };
    }, [measure, fit, groups?.length]);

    const foldedGroups = (groups ?? []).slice(visibleGroups);

    /* -------------------------------------------------------------- overflow */

    const documentItems = top?.overflow ?? [];
    /**
     * A document that mirrors the shell's controls as its own tool groups (HVAC's `History & Save` and
     * `View & Zoom`) switches the shell's copies off, so a command exists exactly once. `history` is
     * still honoured for the keyboard — only the buttons go away.
     */
    const showHistory = !!history && top?.shellControls?.history !== false;
    const showViewportControls = top?.shellControls?.viewport !== false;
    /**
     * The overflow menu holds the **document's** own overflow and whatever did not fit the row — nothing
     * else. The shell's panel commands live in the app's View menu (`panelMenu.ts`), which is why this
     * menu can simply not exist when there is nothing more to show.
     */
    const hasOverflow = documentItems.length > 0 || foldedGroups.length > 0;

    const overflowMenu = (
        <Menu>
            <MenuTrigger disableButtonEnhancement>
                <Button
                    appearance="subtle"
                    size="small"
                    icon={<MoreHorizontalRegular />}
                    aria-label="More actions"
                    title="More actions"
                    className={styles.more}
                    data-shell-overflow="true"
                />
            </MenuTrigger>
            <MenuPopover>
                <MenuList>
                    {documentItems.map((item) => (
                        <React.Fragment key={item.id}>
                            {item.separatorBefore ? <MenuDivider /> : null}
                            <MenuItem disabled={item.disabled} onClick={item.onSelect}>
                                {item.label}
                            </MenuItem>
                        </React.Fragment>
                    ))}

                    {documentItems.length > 0 && foldedGroups.length > 0 ? <MenuDivider /> : null}
                    {foldedGroups.map((group) => (
                        <ToolGroupSubmenu key={group.id} group={group} />
                    ))}
                </MenuList>
            </MenuPopover>
        </Menu>
    );

    /**
     * The document's groups for the row — `fitGroupCount` decided how many lead it. Every group but the
     * first gets a full-height 1 px rule before it, which is what separates them the way the legacy
     * strip did.
     */

    /* -------------------------------------------------------------- render */

    return (
        <div className={styles.root} data-shell-row="top">
            <div className={styles.bar} data-shell-live={liveState}>
                {groups.length > 0 ? (
                    /*
                     * Every group, off-screen. This is what makes the row independent of what the band is
                     * currently showing — the alternative (measuring the groups that happen to be
                     * rendered) has no answer once they have all been folded, which is how the band used
                     * to end up permanently empty after a narrow→wide resize.
                     */
                    <div className={styles.measure} aria-hidden="true" data-shell-measure="true">
                        {groups.map((group, index) => (
                            <React.Fragment key={group.id}>
                                {index > 0 || dividerBeforeFirst ? <ToolGroupDivider /> : null}
                                <ToolGroupInline
                                    group={group}
                                    groupRef={(element) => {
                                        measureRefs.current[index] = element;
                                    }}
                                />
                            </React.Fragment>
                        ))}
                    </div>
                ) : null}

                {/**
                  * The tools, filling the band: one row of group columns. `flex: 1` + `min-width: 0`
                  * means the zone's width is the leftover space and does not depend on what it holds —
                  * which is what lets the fill be a pure comparison against the measured widths.
                  */}
                <div className={styles.tools} ref={zoneRef} data-shell-tools="true">
                    {top?.tools || top?.content ? (
                        <div className={styles.leading} ref={leadingRef} data-shell-leading="true">
                            {top.tools ?? top.content}
                        </div>
                    ) : null}

                    {(groups ?? []).slice(0, visibleGroups).map((group, index) => (
                        <React.Fragment key={group.id}>
                            {index > 0 || dividerBeforeFirst ? <ToolGroupDivider /> : null}
                            <ToolGroupInline group={group} />
                        </React.Fragment>
                    ))}
                </div>

                <div className={styles.trailing}>
                    {showHistory ? (
                        <div className={styles.cluster}>
                            <Tooltip content="Undo (Ctrl+Z)" relationship="label">
                                <Button
                                    appearance="subtle"
                                    size="small"
                                    aria-label="Undo"
                                    icon={<ArrowUndoRegular />}
                                    disabled={!historyState.canUndo}
                                    onClick={history.undo}
                                />
                            </Tooltip>
                            <Tooltip content="Redo (Ctrl+Y)" relationship="label">
                                <Button
                                    appearance="subtle"
                                    size="small"
                                    aria-label="Redo"
                                    icon={<ArrowRedoRegular />}
                                    disabled={!historyState.canRedo}
                                    onClick={history.redo}
                                />
                            </Tooltip>
                        </div>
                    ) : null}

                    {/*
                     * Save / zoom / rulers / grid, registered by the document on the command bus —
                     * unless the document draws them as its own tool groups (`shellControls.viewport`).
                     */}
                    {showViewportControls ? <ShellCommandBar /> : null}

                    {/* The document's own overflow, and only when there is something to fold. */}
                    {hasOverflow ? overflowMenu : null}
                </div>

                {/*
                 * The mode cluster, if the document has one — rightmost, after the shell's trailing
                 * controls, and never folded (see `TopSpec.modeBar`). No dividing rule: the band's own
                 * groups are ruled, the cluster is not a group (see `styles.mode`).
                 */}
                {top?.modeBar ? (
                    <div className={styles.mode} data-shell-mode="true">
                        {top.modeBar}
                    </div>
                ) : null}
            </div>
        </div>
    );
};
