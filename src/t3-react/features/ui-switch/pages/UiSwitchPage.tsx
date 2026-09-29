/**
 * T3000 — the view switcher (route `#/t3000/ui-switch`).
 *
 * Shown **before** the user has a view: the startup redirect in `index.html` sends the classic root (`#/`)
 * here when there is no remembered choice, and the two menus (*Help ▸ Switch View*) will point at it later,
 * so the explanation of how to switch back lives in exactly one place.
 *
 * ## Why it is an explicit React route
 *
 *  - it is mounted by the **React** app, so it is Fluent-styled like the rest of the new UI (`#/t3000/…` is
 *    what makes `src/shared/routes.ts` report `react` — the classic Vue app needs no page at all);
 *  - it is registered **outside** `MainLayout`/`MinimalLayout`: no menu bar, no device tree, no panels. It
 *    has to render before there is a "current device", and a menu bar there would offer navigation into a
 *    view the user has not chosen yet.
 *
 * Choosing sets the preference (only when *Don't ask me again* is ticked) and reloads into that view — see
 * `src/shared/uiFlavor.ts`, which owns the storage contract and the reload rule.
 *
 * ## The two cards are written on the same three axes
 *
 * What you get · what you have to do · how it changes over time. The bullet lists are therefore a direct
 * comparison, line for line: *relearn* vs *nothing to set up*, and *stable* vs *growing*. Each bullet carries
 * one distinct fact — an earlier draft repeated the intro sentence in the first bullet and used two bullets
 * for one idea, which read as padding.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
    Badge,
    Body1,
    Body1Strong,
    Button,
    Caption1,
    Checkbox,
    makeStyles,
    Title2,
    tokens
} from "@fluentui/react-components";
import { ArrowRightRegular, DesktopRegular, SparkleRegular } from "@fluentui/react-icons";

import {
    CLASSIC_VIEW_HASH,
    NEW_VIEW_HASH,
    clearUiFlavor,
    gotoFlavor,
    markChoiceMadeThisSession,
    readUiFlavor,
    viewBaseUrl,
    writeUiFlavor,
    type UiFlavor
} from "../../../../shared/uiFlavor";

/**
 * Full-window layout: a header band, the two choices filling the middle, and a footer bar.
 *
 * The background is layered brand tints over the neutral base (radial glows top-left / top-right plus a
 * vertical fall-off) — three gradients, no image asset, and it scales with the window in both themes.
 */
const useStyles = makeStyles({
    root: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        backgroundColor: tokens.colorNeutralBackground2,
        backgroundImage:
            "radial-gradient(1100px 520px at 10% -12%, rgba(15,108,189,0.18), rgba(15,108,189,0) 62%)," +
            "radial-gradient(900px 460px at 104% -8%, rgba(0,153,188,0.16), rgba(0,153,188,0) 58%)," +
            `linear-gradient(180deg, ${tokens.colorNeutralBackground1} 0%, ${tokens.colorNeutralBackground2} 100%)`
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 28px",
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`
    },
    wordmark: {
        color: tokens.colorBrandForeground1,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase"
    },
    headerNote: {
        color: tokens.colorNeutralForeground3
    },
    headerBadge: {
        marginLeft: "auto"
    },
    /**
     * Top-aligned, not centred: the block is short, so centring it in a tall window opened a large empty gap
     * above the heading (reported). The padding here is the whole gap from the header band.
     */
    main: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        padding: "0 28px 32px"
    },
    /**
     * The page's type scale, reduced one notch per kind (user request). Kept as explicit px so the ratio
     * between the kinds is visible in one place: 22 heading · 13 body · 11 details.
     *
     * The vertical rhythm is set per block instead of by one `gap`, because each distance is its own
     * decision: **56 px** from the header band to the heading, **20 px** from the intro to the inventory,
     * **22 px** from the inventory to the decision itself.
     */
    heading: {
        display: "block",
        marginTop: "56px",
        fontSize: "22px",
        lineHeight: "28px"
    },
    lead: {
        display: "block",
        marginTop: "6px",
        maxWidth: "980px",
        color: tokens.colorNeutralForeground2,
        fontSize: "13px",
        lineHeight: "18px"
    },
    options: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "stretch",
        gap: "20px",
        marginTop: "22px"
    },
    /**
     * A **panel**, not a button: the call to action inside it is a real `Button` (one control, keyboard
     * reachable, no nested interactives), and the panel itself is clickable as a convenience.
     */
    panel: {
        flex: "1 1 420px",
        minWidth: "300px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "18px 20px",
        boxSizing: "border-box",
        borderRadius: "10px",
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        backgroundColor: tokens.colorNeutralBackground1,
        boxShadow: tokens.shadow4,
        cursor: "pointer",
        transitionProperty: "box-shadow, border",
        transitionDuration: "120ms",
        ":hover": {
            border: `1px solid ${tokens.colorBrandStroke1}`,
            boxShadow: tokens.shadow16
        },
        ":focus-within": {
            border: `1px solid ${tokens.colorBrandStroke1}`
        }
    },
    /** The recommended side: a resting brand border and a brand wash behind the title. */
    panelNew: {
        border: `1px solid ${tokens.colorBrandStroke1}`,
        backgroundImage: `linear-gradient(180deg, ${tokens.colorBrandBackground2} 0%, ${tokens.colorNeutralBackground1} 46%)`
    },
    panelHead: {
        display: "flex",
        alignItems: "center",
        gap: "10px"
    },
    /** The icon sits in its own rounded tile so the two cards have a real header, not a stray glyph. */
    panelIcon: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: "0",
        width: "28px",
        height: "28px",
        borderRadius: "8px",
        backgroundColor: tokens.colorBrandBackground2,
        color: tokens.colorBrandForeground1,
        fontSize: "16px"
    },
    /** The Classic tile stays neutral, so the brand-tinted tile on the New View carries the recommendation. */
    panelIconMuted: {
        backgroundColor: tokens.colorNeutralBackground3,
        color: tokens.colorNeutralForeground2
    },
    /** 13 px, the reduced body size for the cards' copy and their bullet lists. */
    panelBody: {
        /** Reserved for two lines so both cards' bullet lists start at the same height (one intro wraps, one doesn't). */
        minHeight: "36px",
        color: tokens.colorNeutralForeground2,
        fontSize: "13px",
        lineHeight: "18px"
    },
    panelList: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        margin: "0",
        paddingLeft: "18px",
        color: tokens.colorNeutralForeground2,
        fontSize: "13px",
        lineHeight: "18px"
    },
    /**
     * The card's footer: a hairline rule, then the URL on the left and the auto-width button on the right.
     * (A full-width button was reported as too heavy — it made the card look like one big control.)
     */
    panelFoot: {
        marginTop: "auto",
        paddingTop: "12px",
        borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        /** In a narrow window the route and the button stack instead of squeezing each other. */
        flexWrap: "wrap"
    },
    /**
     * The inventory block: no container and no side rule any more — the full-height bar was reported as
     * noise, so the grouping now comes from the brand tick on the title plus the spacing. Dropping the old
     * 14 px indent also put the chips on the same left edge as the heading and the cards.
     */
    builtSection: {
        display: "block",
        marginTop: "20px"
    },
    /** The title row: a short brand tick then the caption, so the label reads as a label. */
    builtHeader: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "8px"
    },
    /** The 14 × 3 px brand tick that replaced the full-height left rule. */
    builtMark: {
        flexShrink: "0",
        width: "14px",
        height: "3px",
        borderRadius: "999px",
        backgroundColor: tokens.colorBrandBackground
    },
    /** Caption above the two chip rows. */
    builtTitle: {
        color: tokens.colorNeutralForeground3,
        fontSize: "11px",
        lineHeight: "16px",
        fontWeight: 600,
        letterSpacing: "0.02em"
    },
    /** One row of chips; two of these make the whole summary. */
    builtRow: {
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "6px",
        padding: "2px 0"
    },
    chip: {
        padding: "1px 7px",
        borderRadius: "999px",
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground1,
        color: tokens.colorNeutralForeground2,
        fontSize: "11px",
        lineHeight: "16px"
    },
    /**
     * The trailing "and more" chip: dashed and muted, so it does not read as one more feature. It repeats the
     * base chip declarations instead of overriding them — Griffel rejects the `borderStyle` shorthand, and the
     * emit order between two `makeStyles` entries is not something to rely on for an override.
     */
    chipMore: {
        padding: "1px 7px",
        borderRadius: "999px",
        border: `1px dashed ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground1,
        color: tokens.colorNeutralForeground3,
        fontSize: "11px",
        lineHeight: "16px"
    },
    /**
     * The decision buttons: auto width, same height, radius and label weight in both panels so the two
     * options read as equals — the difference is the appearance, not the weight of the control.
     * The label is regular weight (not the usual semibold) so it does not shout next to the 13 px copy.
     */
    panelButton: {
        flexShrink: "0",
        minHeight: "36px",
        borderRadius: tokens.borderRadiusLarge,
        fontWeight: tokens.fontWeightRegular,
        fontSize: "13px"
    },
    /**
     * Shrinks first (the button keeps its width); the long URL truncates instead of wrapping the row.
     * The card prints the **route only** — the full address is already spelled out in the footer, and the
     * long form got cut off before the part that matters (`#/` vs `#/t3000/`) in a narrow window.
     */
    panelAddress: {
        minWidth: "0",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        color: tokens.colorNeutralForegroundDisabled,
        fontFamily: "Consolas, 'Courier New', monospace",
        fontSize: "11px",
        lineHeight: "16px"
    },
    footer: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "16px",
        padding: "10px 28px",
        borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground1
    },
    footnote: {
        color: tokens.colorNeutralForeground3,
        fontSize: "11px",
        lineHeight: "16px"
    },
    remember: {
        fontSize: "13px"
    },
    addresses: {
        marginLeft: "auto",
        color: tokens.colorNeutralForegroundDisabled,
        fontFamily: "Consolas, 'Courier New', monospace",
        fontSize: "11px",
        lineHeight: "16px"
    }
});

/**
 * Not a feature — a promise about the ones that are not listed. Keeping it in a named constant lets the
 * chip be styled as "there is more" rather than as another item from the inventory. Declared before the
 * list below, which reads it while the module loads.
 */
const MORE_CHIP = "…and more";

/**
 * The New View's headline pages, as **two rows** — a summary, not an inventory. Listing all ~27 routes made
 * the section read like a release note and buried the question the page exists to ask; the trailing
 * "and more" chip keeps the list honest without enumerating everything.
 *
 * Source of truth for the full set is the route table in `src/t3-react/app/App.tsx`.
 */
const NEW_VIEW_HIGHLIGHTS: string[][] = [
    [
        "Dashboard",
        "Inputs",
        "Outputs",
        "Variables",
        "Programs",
        "Schedules",
        "Alarms",
        "Trend Logs",
        "Graphics"
    ],
    [
        "Design Hub",
        "Designer — HVAC / LVGL / LCD",
        "FDD",
        "Haystack",
        "AI assistant",
        "Settings",
        "Documentation",
        MORE_CHIP
    ]
];

export const UiSwitchPage: React.FC = () => {
    const styles = useStyles();

    /**
     * Ticked by default: the boss's flow is *download → install → run*, so the common case must be the
     * frictionless one. Unticking it re-asks on the next launch (never twice in one session).
     */
    const [remember, setRemember] = useState(true);

    /**
     * The remembered choice, read once — used only to mark the current view. Reaching this page from
     * *Help ▸ Switch View* is the usual case, and then one panel is already "where you are".
     */
    const [current] = useState<UiFlavor | null>(() => readUiFlavor());

    /**
     * Give the tab a title that matches the task. This is the first screen a fresh install shows, and
     * "T3000 Building Automation System" says nothing about what it is waiting for. Restored on unmount, but
     * only while the title is still ours, so it cannot clobber one another page has set in the meantime.
     */
    useEffect(() => {
        const pageTitle = "Choose your view — T3000";
        const previous = document.title;
        document.title = pageTitle;
        return () => {
            if (document.title === pageTitle) {
                document.title = previous;
            }
        };
    }, []);

    const choose = useCallback(
        (flavor: UiFlavor) => {
            if (remember) {
                writeUiFlavor(flavor);
            } else {
                clearUiFlavor();
            }
            markChoiceMadeThisSession();
            gotoFlavor(flavor);
        },
        [remember]
    );

    const base = viewBaseUrl();

    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <span className={styles.wordmark}>T3000</span>
                <Caption1 className={styles.headerNote}>Building Automation System</Caption1>
                <Badge className={styles.headerBadge} appearance="tint" color="brand" size="small">
                    New View preview
                </Badge>
            </header>

            <main className={styles.main}>
                <div>
                    <Title2 className={styles.heading} block>
                        Choose your view
                    </Title2>
                    <Body1 className={styles.lead} block>
                        Both views control the same T3000 system — the same devices, points, programs and
                        drawings. You can switch at any time, and nothing is lost.
                    </Body1>
                </div>

                {/*
                 * A summary of what is already in the New View — two rows, no labels. Without it the page asks
                 * a question the user has no basis to answer ("classic or new?" means nothing until you can
                 * see what the new one contains); with the full route list it stopped being a chooser.
                 */}
                <section className={styles.builtSection} aria-label="What is inside the New View">
                    <div className={styles.builtHeader}>
                        <span className={styles.builtMark} aria-hidden="true" />
                        <Caption1 className={styles.builtTitle}>Already built in the New View</Caption1>
                    </div>
                    {NEW_VIEW_HIGHLIGHTS.map((row, rowIndex) => (
                        <div className={styles.builtRow} key={rowIndex}>
                            {row.map((item) => (
                                <span className={item === MORE_CHIP ? styles.chipMore : styles.chip} key={item}>
                                    {item}
                                </span>
                            ))}
                        </div>
                    ))}
                </section>

                <div className={styles.options} role="group" aria-label="Choose your view">
                    {/*
                     * Classic — the whole card is clickable as a convenience, but the real control is the
                     * `Button` inside it. The card itself is therefore a plain labelled group (not a button):
                     * no nested interactives, and assistive tech still gets "Classic View" plus its state.
                     */}
                    <div
                        className={styles.panel}
                        onClick={() => choose("classic")}
                        role="group"
                        aria-label="Classic View"
                        aria-current={current === "classic" ? "true" : undefined}
                    >
                        <div className={styles.panelHead}>
                            <span className={`${styles.panelIcon} ${styles.panelIconMuted}`}>
                                <DesktopRegular />
                            </span>
                            <Body1Strong>Classic View</Body1Strong>
                            {current === "classic" ? (
                                <Badge appearance="outline" color="informative" size="small">
                                    Current
                                </Badge>
                            ) : null}
                        </div>
                        <Body1 className={styles.panelBody}>
                            The T3000 interface you already use — unchanged.
                        </Body1>
                        {/* Same three axes as the New View card below — see the note there. */}
                        <ul className={styles.panelList}>
                            <li>Every page, menu and shortcut as you know it</li>
                            <li>Nothing to relearn</li>
                            <li>Stable — no preview features mixed in</li>
                        </ul>
                        <div className={styles.panelFoot}>
                            <Caption1 className={styles.panelAddress}>{CLASSIC_VIEW_HASH}</Caption1>
                            <Button
                                className={styles.panelButton}
                                /* No `size="large"`: the label drops to 13 px, regular weight, like the rest of
                                   the copy form, while `minHeight` above keeps the control substantial. */
                                appearance="secondary"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    choose("classic");
                                }}
                            >
                                Open Classic View
                            </Button>
                        </div>
                    </div>

                    {/* New — the recommended side while it is in preview. */}
                    <div
                        className={`${styles.panel} ${styles.panelNew}`}
                        onClick={() => choose("new")}
                        role="group"
                        aria-label="New View"
                        aria-current={current === "new" ? "true" : undefined}
                    >
                        <div className={styles.panelHead}>
                            <span className={styles.panelIcon}>
                                <SparkleRegular />
                            </span>
                            <Body1Strong>New View</Body1Strong>
                            <Badge appearance="tint" color="brand" size="small">
                                Preview
                            </Badge>
                            {current === "new" ? (
                                <Badge appearance="outline" color="informative" size="small">
                                    Current
                                </Badge>
                            ) : null}
                        </div>
                        <Body1 className={styles.panelBody}>
                            A modern interface for the same T3000 system.
                        </Body1>
                        {/* Same three axes as the Classic View card — see the module doc above. */}
                        <ul className={styles.panelList}>
                            <li>The pages listed above, rebuilt</li>
                            <li>Your devices and data — nothing to set up</li>
                            <li>Growing — more pages with each release</li>
                        </ul>
                        <div className={styles.panelFoot}>
                            <Caption1 className={styles.panelAddress}>{NEW_VIEW_HASH}</Caption1>
                            <Button
                                className={styles.panelButton}
                                appearance="primary"
                                icon={<ArrowRightRegular />}
                                iconPosition="after"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    choose("new");
                                }}
                            >
                                Try New View
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            <footer className={styles.footer}>
                <Checkbox
                    className={styles.remember}
                    checked={remember}
                    onChange={(_, data) => setRemember(!!data.checked)}
                    /* Inline on the label itself: Fluent's own `fui-Checkbox__label` rule (14 px) beats a class
                       on the root, and the label is the only part of the control that carries text. */
                    label={<span style={{ fontSize: "13px" }}>Don't ask me again</span>}
                />
                <Caption1 className={styles.footnote}>
                    You can change this later from <strong>Help ▸ Switch View</strong>.
                </Caption1>
                {base ? (
                    <Caption1 className={styles.addresses}>
                        Classic {base}
                        {CLASSIC_VIEW_HASH} · New {base}
                        {NEW_VIEW_HASH}
                    </Caption1>
                ) : null}
            </footer>
        </div>
    );
};

export default UiSwitchPage;
