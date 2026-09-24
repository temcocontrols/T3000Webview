/**
 * Designer — the HVAC document's right panel.
 *
 * P1 shipped this read-only; P1b makes it editable through the single mutation funnel
 * (`engineMutation.ts`), which is what guarantees one undo entry per edit (it ends with
 * `DrawUtil.CompleteOperation`, the engine's own "operation finished" call).
 *
 * Field names come from the engine's **verified** property surface:
 *   geometry   → `Frame.{x,y,width,height}`, `RotationAngle`  (there is no Left/Top/Width/Height/Rotation)
 *   appearance → `StyleRecord?.Fill.Paint.Color/.Opacity`, `StyleRecord?.Line.Paint.Color/.Thickness`
 *   text       → `DataID` → `TextObject.runtimeText`
 *   state      → `flags` bits (16 = locked, 268435456 = hidden)
 *
 * Every read is guarded: a `ConnectionLine` simply does not have the same fields as a `Rect`.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
    Badge,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    DialogTrigger,
    Dropdown,
    Input,
    Option,
    Select,
    Slider,
    Spinner,
    makeStyles,
    mergeClasses,
    tokens
} from "@fluentui/react-components";
import { useDeviceTreeStore } from "@/t3-react/features/devices/store/deviceTreeStore";
import { deviceListName, groupDevicesForDropdown } from "@/t3-react/shared/utils/deviceTreeList";
import type { DeviceInfo } from "@/t3-react/shared/types/device";
import { AddRegular, ArrowClockwiseRegular, BuildingRegular, ChevronDownRegular, ChevronUpRegular, CursorRegular, DeleteRegular, DismissRegular, LinkDismissRegular, LinkRegular, SearchRegular, TextAlignCenterRegular, TextAlignLeftRegular, TextAlignRightRegular } from "@fluentui/react-icons";
/* The icon catalogues the legacy panel picked from (`ObjectConfigNew.vue`), shared with the Vue tree. */
import { icons as iconCatalog, switchIcons as switchIconCatalog } from "@common/shared/utils/common";
import pickerStyles from "./HvacLinkEntryPicker.module.css";
import Hvac, { NewTool } from "@/lib/t3-hvac";
import EvtOpt from "@/lib/t3-hvac/Event/EvtOpt";
import IdxUtils from "@/lib/t3-hvac/Opt/Common/IdxUtils";
// Mind the doubled `Opt/`: the engine's SVG helpers live in `Opt/Opt/` (which is why `QuasarUtil`
// imports `../Opt/SvgUtil`). `@/lib/t3-hvac/Opt/SvgUtil` does not exist — importing it kills the
// designer's lazily loaded document chunk with "error loading dynamically imported module".
import SvgUtil from "@/lib/t3-hvac/Opt/Opt/SvgUtil";
import DataOpt from "@/lib/t3-hvac/Opt/Data/DataOpt";
import QuasarUtil from "@/lib/t3-hvac/Opt/Quasar/QuasarUtil";
import { linkT3EntryDialogV2, T3Data } from "@/lib/t3-hvac/Data/T3Data";
import { useEnginePoll } from "../../hooks/useEnginePoll";
import { useHvacSelection } from "./useHvacSelection";
import type { HvacSelectionItem } from "./useHvacSelection";
import { useHvacAppStateItem } from "./useHvacAppStateItem";
import { useLinkEntrySource } from "./useLinkEntrySource";
import { PointRange } from "./PointRange";
import {
    setFillColor,
    setFillOpacity,
    setFramePart,
    setObjectText,
    setRotation,
    setStrokeColor,
    setStrokeWidth
} from "./engineMutation";
import type { HvacMutationResult } from "./engineMutation";

/**
 * ## The look (2026-09-20)
 *
 * An **inspector**, not nested boxes: the sections are flat rows separated by a hairline, each with a 28 px
 * **sticky** header (caret · small-caps name · optional tag) that folds — the previous version drew bordered
 * cards inside a bordered panel, which made three levels of chrome for two levels of content. One **84 px
 * label column** lines every field up; read-only values are plain text (so editable fields stand out) and
 * editable ones are Fluent inputs with a **unit suffix**. `Fill opacity` is a slider that commits once per
 * drag (the engine funnels every commit into one undo entry, so dragging must not commit per pixel), and the
 * engine dump is folded into a quiet collapsed section.
 */
const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        overflow: "auto",
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground1,
        backgroundColor: tokens.colorNeutralBackground1,
        // The same scroller as the tools panel opposite (`ToolsPanel.scroll`), so the two panels of this
        // document cannot drift apart.
        scrollbarWidth: "thin",
        scrollbarColor: `${tokens.colorNeutralStroke1} transparent`,
        "&::-webkit-scrollbar": { width: "8px" },
        "&::-webkit-scrollbar-thumb": {
            backgroundColor: tokens.colorNeutralStroke1,
            borderRadius: "6px",
            border: "2px solid transparent",
            backgroundClip: "content-box"
        }
    },
    section: {
        borderBottom: `1px solid ${tokens.colorNeutralStroke3}`
    },
    sectionHead: {
        position: "sticky",
        top: 0,
        zIndex: 1,
        display: "flex",
        alignItems: "center",
        gap: "5px",
        width: "100%",
        height: "28px",
        padding: "0 8px 0 7px",
        border: "none",
        background: tokens.colorNeutralBackground2,
        color: tokens.colorNeutralForeground2,
        fontFamily: "inherit",
        cursor: "default",
        textAlign: "left",
        transitionProperty: "background-color, color",
        transitionDuration: "0.1s",
        ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover, color: tokens.colorNeutralForeground1 }
    },
    caret: {
        display: "flex",
        flexShrink: 0,
        color: tokens.colorNeutralForeground3,
        transitionProperty: "transform",
        transitionDuration: "0.12s"
    },
    caretClosed: { transform: "rotate(-90deg)" },
    sectionTitle: {
        flex: 1,
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontSize: "11px",
        fontWeight: tokens.fontWeightSemibold,
        letterSpacing: "0.4px",
        textTransform: "uppercase"
    },
    tag: {
        flexShrink: 0,
        padding: "0 5px",
        borderRadius: "999px",
        backgroundColor: tokens.colorNeutralBackground4,
        color: tokens.colorNeutralForeground3,
        fontSize: "9.5px",
        fontWeight: tokens.fontWeightSemibold,
        lineHeight: "15px",
        letterSpacing: "0.3px"
    },
    sectionBody: {
        display: "flex",
        flexDirection: "column",
        gap: "1px",
        padding: "6px 8px 10px"
    },
    row: {
        display: "grid",
        gridTemplateColumns: "84px 1fr",
        gap: "8px",
        alignItems: "center",
        minHeight: "28px"
    },
    label: {
        color: tokens.colorNeutralForeground3,
        fontSize: tokens.fontSizeBase200,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
    },
    value: {
        color: tokens.colorNeutralForeground1,
        fontSize: tokens.fontSizeBase200,
        fontVariantNumeric: "tabular-nums",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
    },
    mono: {
        fontFamily: "Consolas, monospace",
        fontSize: "11px",
        color: tokens.colorNeutralForeground2,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
    },
    unit: { color: tokens.colorNeutralForeground3, fontSize: "11px", lineHeight: "1" },
    input: {
        minWidth: 0,
        width: "100%",
        /*
         * The Data section's dropdowns (Auto/Manual, Value, Display field) sat at Fluent's default 14 px and
         * towered over the 12 px labels. 12 px / 28 px matches the rest of the inspector.
         *
         * A **descendant** selector is safe here — `.input .fui-Dropdown__button` outranks Fluent's own
         * single-class rule regardless of stylesheet order, unlike styling the same element from a class.
         * FDD sizes its dropdowns the same way (`FddPage.module.css`, `.runDropdown`).
         */
        "& .fui-Dropdown__button": {
            minHeight: "28px",
            height: "28px",
            fontSize: "12px"
        }
    },
    colorRow: { display: "flex", alignItems: "center", gap: "8px", minWidth: 0 },
    swatch: {
        width: "22px",
        height: "22px",
        padding: 0,
        flexShrink: 0,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        borderRadius: "3px",
        background: "transparent"
    },
    /* Pulled left so the track lines up with the other rows' controls: Fluent's Slider root reserves space for
     * the thumb's hit area, which pushes the visible track inwards by a few pixels. */
    slider: { display: "flex", alignItems: "center", gap: "4px", minWidth: 0, marginLeft: "-5px" },
    sliderTrack: {
        flex: 1,
        minWidth: 0,
        /* Fluent's Slider root has a min-width of its own. Without resetting it the row's min-content exceeds the
         * panel width, the row overflows, and the right-hand percentage is what gets cut off at the panel edge. */
        "& .fui-Slider": { minWidth: 0 }
    },
    pct: {
        /*
         * Width is deliberately *content-driven*, and the text is right-aligned, so its right edge ends flush with
         * the panel's right edge exactly like every other control in the panel.
         *
         * A fixed width reserve was wrong both ways: right-aligned inside a reserve, the slack landed between the
         * slider and the text (`50%` sat much further from the track than `100%`); left-aligned it removed the slack
         * but pulled the text off the panel's right edge. Hugging the content gives a constant gap (the flex gap on
         * `.slider`) *and* keeps the right edge on the same vertical line. `tabular-nums` means the digits keep a
         * fixed advance width, so the track only ever shifts by one digit width, and only when the value crosses
         * 10%/100%.
         */
        flexShrink: 0,
        textAlign: "right",
        whiteSpace: "nowrap",
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground2,
        fontVariantNumeric: "tabular-nums"
    },
    badges: { display: "flex", gap: "4px", flexWrap: "wrap" },
    /** Multi-selection summary: what is in it, and what the selection disagrees on. */
    picks: { display: "flex", flexWrap: "wrap", gap: "6px", minWidth: 0 },
    pick: {
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        height: "24px",
        padding: "0 8px",
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: "999px",
        backgroundColor: tokens.colorNeutralBackground1,
        fontSize: "11.5px",
        color: tokens.colorNeutralForeground2
    },
    pickMixed: {
        backgroundColor: tokens.colorNeutralBackground2,
        color: tokens.colorNeutralForeground3,
        border: `1px dashed ${tokens.colorNeutralStroke2}`
    },
    empty: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "9px",
        flex: 1,
        padding: "24px 20px",
        textAlign: "center",
        color: tokens.colorNeutralForeground3
    },
    emptyIcon: {
        width: "42px",
        height: "42px",
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tokens.colorNeutralBackground3,
        color: tokens.colorNeutralForeground3
    },
    emptyTitle: {
        color: tokens.colorNeutralForeground2,
        fontWeight: tokens.fontWeightSemibold,
        fontSize: tokens.fontSizeBase200
    },
    emptyHint: { fontSize: "11.5px", maxWidth: "200px" },
    loading: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        flex: 1,
        padding: "40px 20px",
        color: tokens.colorNeutralForeground3
    },
    note: {
        color: tokens.colorNeutralForeground3,
        fontSize: tokens.fontSizeBase100,
        fontStyle: "italic"
    },
    error: {
        color: tokens.colorPaletteRedForeground1,
        fontSize: tokens.fontSizeBase100,
        minHeight: "14px",
        padding: "0 8px"
    },
    raw: {
        fontFamily: "Consolas, monospace",
        fontSize: "10.5px",
        /*
         * Deliberately **no** scroller of its own: the dump wraps and the box grows, so the panel's single
         * scrollbar handles the overflow. An inner bar was the whole problem — it inherited the panel's
         * `scrollbar-width: thin` (a 10 px native bar), and every attempt to make it 6 px with
         * `::-webkit-scrollbar` ran into Chromium's rule that any non-`auto` standard scrollbar value wins and
         * the webkit rules are ignored. `pre-wrap` keeps the JSON's shape while letting long values wrap.
         */
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        margin: 0,
        padding: "8px",
        borderRadius: "4px",
        backgroundColor: tokens.colorNeutralBackground3,
        color: tokens.colorNeutralForeground2
    },

    /* --- Data section (P1): the linked entry card, and the entry picker dialog --- */
    entryCard: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        padding: "6px 8px",
        borderRadius: "4px",
        backgroundColor: tokens.colorNeutralBackground3
    },
    entryTitle: {
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground3
    },
    entryActions: {
        display: "flex",
        gap: "14px",
        marginTop: "2px"
    },
    /**
     * Hyperlink-style action, FDD's `.taggedMore` idiom: brand text, no box, underline on hover. Change and
     * Unlink use this so the Data section reads as one list instead of three different button styles.
     */
    entryLink: {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: 0,
        border: "none",
        backgroundColor: "transparent",
        color: tokens.colorBrandForegroundLink,
        fontFamily: "inherit",
        fontSize: "12px",
        whiteSpace: "nowrap",
        cursor: "pointer",
        ":hover": { textDecoration: "underline", color: tokens.colorBrandForegroundLinkHover },
        ":focus-visible": { outline: `1px solid ${tokens.colorStrokeFocus2}`, outlineOffset: "2px" }
    },
    /**
     * The unlinked state is a **primary button** (Fluent `appearance="primary"`), stretched to the full body
     * width.
     *
     * Full width because this panel is narrow: the first version put a button in the value column of the
     * 84 px row grid and the label wrapped onto two lines. Fluent owns the rest of the styling, so only the
     * layout is declared here — no colour, border or underline of our own to drift from the Fluent theme.
     */
    linkAction: {
        width: "100%",
        whiteSpace: "nowrap"
    },

    /* --- Widget section (P2): alignment buttons and icon pickers --- */
    alignRow: {
        display: "flex",
        gap: "2px"
    },
    iconOption: {
        display: "flex",
        alignItems: "center",
        gap: "6px"
    },
    iconGlyph: {
        fontSize: "14px",
        lineHeight: 1
    },

    /* --- Gauge/Dial settings dialog (P3) --- */
    gaugeGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "8px 16px"
    },
    gaugeWide: { gridColumn: "1 / -1" },
    gaugeLabel: {
        display: "block",
        marginBottom: "4px",
        fontSize: "12px",
        color: tokens.colorNeutralForeground2
    },
    gaugeColorsHead: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        margin: "4px 0 2px"
    },
    gaugeColorRow: {
        display: "flex",
        alignItems: "center",
        gap: "8px"
    },
    gaugeColorOffset: { width: "84px" },
    gaugeColorSwatch: { flexShrink: 0 },

    /* --- Number steppers: a stacked pair on the right edge of every numeric field --- */
    /** Everything after the digits: the unit text and the chevron pair, centred as one row. */
    afterField: {
        display: "flex",
        alignItems: "center",
        gap: "0px"
    },
    steppers: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "0px",
        flexShrink: 0,
        /* Breathing room from whatever precedes it — the `px` / `°` unit, or the digits themselves. */
        marginLeft: "6px"
    },
    stepper: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "18px",
        height: "15px",
        padding: "0px",
        border: "none",
        backgroundColor: "transparent",
        color: tokens.colorNeutralForeground2,
        cursor: "pointer",
        ":hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
            color: tokens.colorNeutralForeground1
        },
        ":disabled": {
            color: tokens.colorNeutralForegroundDisabled,
            backgroundColor: "transparent",
            cursor: "default"
        }
    }
});

/**
 * Field text for a number. `NaN` never reaches the field: a value the engine cannot supply (a missing frame part,
 * a widget setting the document never wrote) reads as an empty field, which is the honest answer, and not the
 * literal string `NaN` that a `Number(undefined)` coercion used to print.
 */
const formatNumber = (value: number | undefined, digits = 2): string =>
    typeof value === "number" && Number.isFinite(value) ? String(Number(value.toFixed(digits))) : "";

/**
 * A read-only field row.
 *
 * `showEmpty` keeps the row — label plus a blank value — instead of dropping it. The row is part of the panel's
 * shape and its content is not, so a linked entry that carries nothing for a field must still read as that field.
 */
const ReadRow: React.FC<{ label: string; value?: string | number | null; showEmpty?: boolean }> = ({
    label,
    value,
    showEmpty
}) => {
    const styles = useStyles();
    if (value === undefined || value === null || value === "") {
        if (!showEmpty) {
            return null;
        }
        return (
            <div className={styles.row}>
                <span className={styles.label}>{label}</span>
                <span className={styles.value} />
            </div>
        );
    }
    return (
        <div className={styles.row}>
            <span className={styles.label}>{label}</span>
            <span className={styles.value} title={String(value)}>
                {value}
            </span>
        </div>
    );
};

const Section: React.FC<{
    title: string;
    /** A short right-hand chip: `Read only`, `Endpoints`, `3 objects`… */
    tag?: string;
    defaultOpen?: boolean;
    /** Inline overrides for the body box — the Data section uses it to widen the vertical gap. */
    bodyStyle?: React.CSSProperties;
    children: React.ReactNode;
}> = ({ title, tag, defaultOpen = true, bodyStyle, children }) => {
    const styles = useStyles();
    const [open, setOpen] = React.useState(defaultOpen);

    return (
        <section className={styles.section}>
            <button
                type="button"
                className={styles.sectionHead}
                aria-expanded={open}
                title={title}
                onClick={() => setOpen((previous) => !previous)}
            >
                <span className={mergeClasses(styles.caret, open ? "" : styles.caretClosed)}>
                    <ChevronDownRegular fontSize={12} />
                </span>
                <span className={styles.sectionTitle}>{title}</span>
                {tag ? <span className={styles.tag}>{tag}</span> : null}
            </button>
            {open ? (
                <div className={styles.sectionBody} style={bodyStyle}>
                    {children}
                </div>
            ) : null}
        </section>
    );
};

/**
 * A numeric field that keeps a local draft while typing and commits on Enter or blur.
 * The displayed value otherwise follows the polled engine state, so a successful edit is reflected
 * immediately and a rejected one snaps back.
 */
/**
 * Keep a keystroke inside the field the user is typing in.
 *
 * The engine's global keyboard handler ends in `event.preventDefault()` for every key it has a command for
 * (`KeyboardOpt.HandleKeyDown`, `KeyboardOpt.ts:195`) - Backspace deletes the selection, the arrows move it -
 * and it does not check whether the keystroke came from a text field. With the caret in one of these boxes the
 * browser's own edit is therefore cancelled and the key looks dead. Measured on this panel: typing `Fan` into the
 * picker's search box works, Backspace and ArrowLeft leave both the value and the caret untouched, and the
 * `preventDefault` stack points at that line.
 *
 * `stopPropagation`, **not** `preventDefault`: React dispatches this handler at the root container (or at the
 * dialog's portal root), which sits deeper in the bubble path than the engine's document/window listener - so the
 * event never reaches it - while the browser's default edit still runs and React still receives the separate
 * `input` event that `onChange` is wired to.
 */
const keepKeysInField = (event: React.KeyboardEvent<HTMLElement>): void => {
    event.stopPropagation();
};

const NumberField: React.FC<{
    label: string;
    value: number | undefined;
    digits?: number;
    /** Drawn inside the field, muted — `px`, `°`. */
    unit?: string;
    disabled?: boolean;
    onCommit: (value: number) => HvacMutationResult;
    onError: (message: string | undefined) => void;
}> = ({ label, value, digits = 2, unit, disabled, onCommit, onError }) => {
    const styles = useStyles();
    const formatted = formatNumber(value, digits);
    const [draft, setDraft] = useState(formatted);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        if (!editing) {
            setDraft(formatted);
        }
    }, [formatted, editing]);

    const commit = () => {
        setEditing(false);
        const parsed = Number(draft);
        if (draft.trim() === "" || !Number.isFinite(parsed)) {
            setDraft(formatted);
            return;
        }
        if (parsed === value) {
            return;
        }
        const result = onCommit(parsed);
        onError(result.ok ? undefined : `Could not apply ${label.toLowerCase()} (${result.reason})`);
    };

    /**
     * One click of a stepper = one commit = one undo entry (the engine funnels every commit into
     * `CompleteOperation`). Deliberately **no** click-and-hold repeat: it would write on every tick and bury the
     * undo history. Shift multiplies the step by ten.
     *
     * The base is the draft while the user is typing, so clicking a chevron with `250` on screen steps from 250
     * and not from the last polled value.
     */
    const stepBy = (direction: 1 | -1, multiplier = 1) => {
        const base = editing ? Number(draft) : value;
        if (base === undefined || !Number.isFinite(base)) {
            return;
        }
        const next = Number((base + direction * multiplier).toFixed(digits));
        if (next === value) {
            return;
        }
        setEditing(false);
        const result = onCommit(next);
        onError(result.ok ? undefined : `Could not apply ${label.toLowerCase()} (${result.reason})`);
    };

    return (
        <div className={styles.row}>
            <span className={styles.label}>{label}</span>
            <Input
                className={styles.input}
                size="small"
                appearance="outline"
                value={draft}
                disabled={disabled}
                contentAfter={
                    /*
                     * One explicit flex row for everything after the digits.
                     *
                     * Fluent wraps `contentAfter` in a span of its own, so the unit and the steppers would
                     * otherwise be **inline siblings in a block wrapper** — the `px` then sits on a text
                     * baseline (aligned with the bottom of the steppers' 30 px box) instead of centred in the
                     * field. Making the wrapper's content a flex row with `alignItems: center` centres it
                     * against the chevrons, whatever Fluent does around it.
                     */
                    <span className={styles.afterField}>
                        {unit ? <span className={styles.unit}>{unit}</span> : null}
                        <span className={styles.steppers}>
                            <button
                                type="button"
                                className={styles.stepper}
                                aria-label={`Increase ${label}`}
                                title={`Increase ${label} (Shift: +10)`}
                                disabled={disabled || value === undefined}
                                /* Keeps focus in the input, so no blur-commit races the click. */
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={(event) => stepBy(1, event.shiftKey ? 10 : 1)}
                            >
                                <ChevronUpRegular fontSize={12} />
                            </button>
                            <button
                                type="button"
                                className={styles.stepper}
                                aria-label={`Decrease ${label}`}
                                title={`Decrease ${label} (Shift: -10)`}
                                disabled={disabled || value === undefined}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={(event) => stepBy(-1, event.shiftKey ? 10 : 1)}
                            >
                                <ChevronDownRegular fontSize={12} />
                            </button>
                        </span>
                    </span>
                }
                aria-label={label}
                onFocus={() => setEditing(true)}
                onChange={(_, data) => {
                    setEditing(true);
                    setDraft(data.value);
                }}
                onBlur={commit}
                onKeyDown={(event) => {
                    keepKeysInField(event);
                    /* Keyboard equivalent of the chevrons, same code path and same one-commit-per-press rule. */
                    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
                        event.preventDefault();
                        stepBy(event.key === "ArrowUp" ? 1 : -1, event.shiftKey ? 10 : 1);
                        return;
                    }
                    if (event.key === "Enter") {
                        commit();
                        (event.target as HTMLInputElement).blur();
                    }
                    if (event.key === "Escape") {
                        setEditing(false);
                        setDraft(formatted);
                    }
                }}
            />
        </div>
    );
};

/**
 * The engine's 0–1 opacity as a slider.
 *
 * The commit is the point of this component: `onChange` fires on every pixel of a drag, and each commit goes
 * through the engine's single mutation funnel — one undo entry per call. So the drag updates **local** state
 * only, and the pointer release (or a key release, or a blur) commits once.
 */
const SliderField: React.FC<{
    label: string;
    value: number | undefined;
    disabled?: boolean;
    onCommit: (value: number) => HvacMutationResult;
    onError: (message: string | undefined) => void;
}> = ({ label, value, disabled, onCommit, onError }) => {
    const styles = useStyles();
    const [draft, setDraft] = useState<number | undefined>(undefined);
    const shown = draft ?? value ?? 0;

    const commit = () => {
        if (draft === undefined) {
            return;
        }
        const next = draft;
        setDraft(undefined);
        if (next === value) {
            return;
        }
        const result = onCommit(next);
        onError(result.ok ? undefined : `Could not apply ${label.toLowerCase()} (${result.reason})`);
    };

    return (
        <div className={styles.row}>
            <span className={styles.label}>{label}</span>
            <span className={styles.slider} onPointerUp={commit} onKeyUp={commit} onBlur={commit}>
                <span className={styles.sliderTrack}>
                    <Slider
                        min={0}
                        max={1}
                        step={0.05}
                        value={shown}
                        disabled={disabled}
                        aria-label={label}
                        onChange={(_, data) => setDraft(data.value)}
                    />
                </span>
                <span className={styles.pct}>{Math.round(shown * 100)}%</span>
            </span>
        </div>
    );
};

const ColorField: React.FC<{
    label: string;
    value: string | undefined;
    onCommit: (value: string) => HvacMutationResult;
    onError: (message: string | undefined) => void;
}> = ({ label, value, onCommit, onError }) => {
    const styles = useStyles();
    if (!value) {
        return <ReadRow label={label} value={undefined} />;
    }
    return (
        <div className={styles.row}>
            <span className={styles.label}>{label}</span>
            <span className={styles.colorRow}>
                <input
                    className={styles.swatch}
                    type="color"
                    value={value}
                    title={value}
                    aria-label={label}
                    onChange={(event) => {
                        const result = onCommit(event.target.value);
                        onError(result.ok ? undefined : `Could not apply ${label.toLowerCase()} (${result.reason})`);
                    }}
                />
                <span className={styles.mono}>{value}</span>
            </span>
        </div>
    );
};

const TextField: React.FC<{
    value: string | undefined;
    onCommit: (value: string) => HvacMutationResult;
    onError: (message: string | undefined) => void;
}> = ({ value, onCommit, onError }) => {
    const styles = useStyles();
    const [draft, setDraft] = useState(value ?? "");

    useEffect(() => {
        setDraft(value ?? "");
    }, [value]);

    const commit = () => {
        if (draft === value) {
            return;
        }
        const result = onCommit(draft);
        onError(result.ok ? undefined : `Could not apply text (${result.reason})`);
    };

    return (
        <div className={styles.row}>
            <span className={styles.label}>Content</span>
            <Input
                className={styles.input}
                size="small"
                appearance="outline"
                value={draft}
                aria-label="Content"
                onChange={(_, data) => setDraft(data.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                    keepKeysInField(event);
                    if (event.key === "Enter") {
                        commit();
                        (event.target as HTMLInputElement).blur();
                    }
                    if (event.key === "Escape") {
                        setDraft(value ?? "");
                    }
                }}
            />
        </div>
    );
};

const ON_OFF_OPTIONS = [
    { label: "OFF", value: 0 },
    { label: "ON", value: 1 }
];

/**
 * A device string as this panel can safely show it.
 *
 * The device's fixed-width fields are 0xFF-filled for anything it never wrote, and jsoncpp substitutes U+FFFD for
 * those bytes **inside T3000.exe**, before the JSON leaves C++ (`Json-cpp/dist/jsoncpp.cpp:4249`). By the time a
 * description reaches the browser it can read `Room Temp\uFFFD\uFFFD`, and no consumer can recover the original
 * bytes: the fill is indistinguishable from text. Cut at the first such character instead — everything from it on
 * is fill, not text. CP936 turns 0xFF into the U+F8F5 private-use area on its way through the C++ grids, so those
 * are cut too, as is a literal 0xFF, whichever form arrives.
 */
const sanitizeDeviceText = (value: unknown): string => {
    if (value === undefined || value === null) {
        return "";
    }
    const text = String(value);
    for (let index = 0; index < text.length; index += 1) {
        const code = text.charCodeAt(index);
        if (code === 0xfffd || code === 0x00ff || (code >= 0xe000 && code <= 0xf8ff)) {
            return text.slice(0, index).trim();
        }
    }
    return text.trim();
};

/**
 * `sanitizeDeviceText` over a whole entry, for the copy that gets linked.
 *
 * The widget's own renderer draws `description`/`label`/range names straight from the linked entry, so the fill has
 * to be gone *there* as well — otherwise the panel shows clean text while the shape on the canvas still reads
 * `\uFFFD\uFFFD\uFFFD`. Numbers and ids pass through untouched (only strings are rewritten), and any string is safe
 * to cut: everything from the first fill character on is fill, never text.
 */
const sanitizeEntryText = <T,>(value: T): T => {
    if (typeof value === "string") {
        return sanitizeDeviceText(value) as unknown as T;
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeEntryText(item)) as unknown as T;
    }
    if (value && typeof value === "object") {
        const copy: Record<string, unknown> = {};
        Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
            copy[key] = sanitizeEntryText(item);
        });
        return copy as unknown as T;
    }
    return value;
};

/**
 * Identity of an entry across the two objects that describe it.
 *
 * The entry a widget is linked to is the engine's snapshot (`t3Entry`), a row in the picker's grid is one of the
 * API's entries — different objects for the same point, so `===` never matches and the linked row could not be
 * shown again. The **serial** is what makes it a point rather than a number: without the engine's panel list
 * every device's panel number is `1` and every device's points start at `IN1`, so `pid` + kind + index alone
 * collides across devices (and produced duplicate React keys).
 */
const entryKey = (entry: Record<string, any> | null | undefined): string =>
    entry
        ? `${entry.serial ?? ""}|${entry.pid ?? ""}|${entry.type ?? ""}|${entry.index ?? ""}|${entry.id ?? ""}`
        : "";

/**
 * Entry label in the picker.
 *
 * Delegates to the engine's own formatter (`AppRuntime.entryLabel` — *create a label for an entry with
 * optional prefix*), which is the same text the legacy Vue dialog showed, so an entry reads identically in
 * both apps. The fallback only exists for the unlikely case of the engine being unavailable. Either way the
 * text goes through `sanitizeDeviceText`, so a description the device never wrote does not arrive here with the
 * `?` characters jsoncpp left behind.
 */
const entryLabel = (entry: Record<string, any> | null | undefined): string => {
    if (!entry) {
        return "";
    }
    /* The engine's prefix (`<id> - `) is only added when there is text after it, so a description that was nothing
     * but fill leaves a dangling `id -` — trimmed off here. */
    const tidy = (text: string): string => sanitizeDeviceText(text).replace(/[\s\-·|]+$/, "");
    try {
        const label = (Hvac as any)?.AppRuntime?.entryLabel?.(entry);
        return tidy(typeof label === "string" && label ? label : entry.description ?? entry.label ?? entry.id ?? "");
    } catch {
        return tidy(entry.description ?? entry.label ?? entry.id ?? "");
    }
};

/**
 * What the picker's Value column shows — the **same reading the point grids show**, formatted the same way: the
 * device's `fValue` (it stores the value ×1000) as a fixed 2-decimal number, blank when the row carries none.
 * Measured against `InputsPage`: `fValue -6500800` renders `-6500.80` on both sides, `-1` renders `-0.00`.
 *
 * The state **words** are deliberately not here. `Off` / `Open` are what the `Data` section's Value *dropdown*
 * offers (it writes `control`); a grid cell is a reading, and this grid sits next to that dropdown — printing
 * the words in both places is what made a temperature-shaped `-6500.80` look like a switch.
 */
const entryValueText = (entry: Record<string, any> | null | undefined): string => {
    if (!entry) {
        return "";
    }
    const raw = entry.value;
    /*
     * Blank only when the field is missing — **not** when it is `0`: the grids print `0.00` for a row whose
     * `fValue` is `"0"` (their cell tests the string, and `"0"` is truthy), and `-0.00` for `-1`. Matching that
     * means treating every present number as a reading, which is also the honest reading: `0` *is* a value.
     */
    if (raw === undefined || raw === null || raw === "") {
        return "";
    }
    const value = Number(raw);
    return Number.isFinite(value) ? (value / 1000).toFixed(2) : "";
};

/** A device as the engine's panel list holds it: panel number, owning serial, panel name. */
interface EngineDevice {
    pid: number;
    serial: number;
    name: string;
}

/** Pseudo-device that lists the points of every device at once. */
const ALL_DEVICES_KEY = "__all_devices__";

/**
 * Plain text weight for controls.
 *
 * Fluent draws every button label **semibold** (`fontWeightSemibold`) and the dialog title as a 20 px
 * semibold heading, which reads as shouting inside a dense tool panel. Both are toned down here — the title
 * to 16 px at normal weight, the buttons to Fluent's `fontWeightRegular` (400).
 *
 * Declared **inline on the element**, not as a Griffel class: Fluent styles those same root elements from its
 * own classes, so which one wins would depend on stylesheet insertion order. Inline always wins.
 */
const PLAIN_WEIGHT: React.CSSProperties = { fontWeight: "400" };

/**
 * The Link Entry dialog's Cancel / Save: the normal button box (`size="medium"`, 32 px) with a **12 px** label
 * instead of Fluent's 14 px, at plain weight rather than the platform's semibold button default.
 */
const DIALOG_ACTION_STYLE: React.CSSProperties = { fontWeight: "400", fontSize: "12px" };

/**
 * Sections whose rows need air (Data, Geometry) get a wider vertical gap than `sectionBody`'s 1 px, which makes
 * a stack of fields read as a single blob.
 *
 * Inline, not a Griffel class: a class here would race `sectionBody`'s `gap` (equal specificity, so stylesheet
 * insertion order would decide). Inline always wins.
 */
const LOOSE_BODY_GAP: React.CSSProperties = { gap: "8px" };
/* FDD's dialog does exactly this: `DialogTitle style={{ fontSize: 14 }}`. 14 px is the app's own dialog-title
 * size, so the picker matches every other dialog in the app instead of shouting at 20 px. */
const DIALOG_TITLE_STYLE: React.CSSProperties = { fontSize: "14px", fontWeight: "400" };

/**
 * The picker's own title, at weight 600.
 *
 * `DIALOG_TITLE_STYLE` is the app's plain (400) dialog heading, shared with the Gauge-settings dialog — hence a
 * separate style rather than a change to that one: only *Link Entry*, the dialog that binds a widget to a device
 * point, is asked to stand out.
 */
const LINK_ENTRY_TITLE_STYLE: React.CSSProperties = { fontSize: "14px", fontWeight: "600" };

/** A labelled Fluent dropdown, laid out like every other inspector row (84 px label column). */
const SelectRow: React.FC<{
    label: string;
    value?: string | number | null;
    options: { label: string; value: string | number }[];
    disabled?: boolean;
    onSelect: (value: string) => void;
}> = ({ label, value, options, disabled, onSelect }) => {
    const styles = useStyles();
    const text = value === undefined || value === null ? undefined : String(value);
    const selected = options.find((option) => String(option.value) === text);

    return (
        <div className={styles.row}>
            <span className={styles.label}>{label}</span>
            <Dropdown
                className={styles.input}
                disabled={disabled}
                /*
                 * A value the option list cannot contain is shown as an em dash instead of the raw code, and no
                 * option is reported as chosen — so picking one still writes the real value. The usual culprits
                 * are `255` (`0xFF`, the device's "not set") in Auto/Manual and `-1` in `control`/`value` on an
                 * entry the device has never initialised.
                 */
                selectedOptions={selected ? [String(selected.value)] : []}
                value={selected?.label ?? "—"}
                onOptionSelect={(_, data) => onSelect(String(data.optionValue))}
            >
                {options.map((option) => (
                    <Option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                    </Option>
                ))}
            </Dropdown>
        </div>
    );
};

/**
 * The entry picker — a Fluent `Dialog` (portalled to `document.body`).
 *
 * The legacy picker was a Quasar dialog declared by the Vue page (`IndexPage2.vue`), which is not mounted in
 * this React designer: flipping `linkT3EntryDialogV2.value.active` would change state nothing draws. This is
 * that same flow rebuilt on Fluent, with three things the legacy dialog got wrong or lacked:
 *
 * - it reads **`T3000_Data.value.panelsData`** live. The legacy `selectPanelOptions` ref was built from the
 *   *initial* (empty) array while the socket loader **reassigns** `panelsData`, so that ref goes stale and the
 *   old list could stay empty even after the panels had arrived;
 * - **Reload** (`Hvac.AppRuntime.reloadPanelsData()`, the engine's own GET_PANELS_LIST) plus a live
 *   "loading panel n of m" line, instead of a list that is silently empty until the device answers;
 * - selection is explicit — click a row, then **Save** — so a stray click cannot bind the widget to the
 *   wrong entry (the legacy dialog did the same; click-to-commit was my regression). Double-click still
 *   commits immediately for speed.
 */
const EntryPickerDialog: React.FC<{
    open: boolean;
    onPick: (entry: Record<string, any>) => void;
    onClose: () => void;
    /** The entry this widget is linked to right now — reopening through *Change* has to show it again. */
    current?: Record<string, any> | null;
    /** Offered at the end of the current-link card: clears the link (`DataSection.unlinkEntry`). */
    onUnlink?: () => void;
}> = ({ open, onPick, onClose, current = null, onUnlink }) => {
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<Record<string, any> | null>(null);
    const [engineDevices, setEngineDevices] = useState<EngineDevice[]>([]);
    const [deviceKey, setDeviceKey] = useState<string | null>(null);
    const { devices: appDevices, deviceStatuses, fetchDevices } = useDeviceTreeStore();

    /*
     * The points come from the app's **REST API** (`LinkEntryApi` / `useLinkEntrySource`), not from the
     * websocket's `T3000_Data.panelsData` — the socket carries one panel's everything (schedules, holidays and
     * programs included, which is why a small controller read "320 points") and its strings are jsoncpp's U+FFFD
     * for the device's 0xFF-filled fields. The websocket is untouched and keeps feeding every other page; it is
     * simply no longer this dialog's source, which is also why the picker now works with the socket down.
     */
    const source = useLinkEntrySource(open);
    const panels = source.entries;
    const loading = source.loading;

    /* Only the engine's panel list is still sampled — it supplies the panel number (`pid`) that joins a device to
     * its entries. The app's device store supplies the names, online state and building grouping. */
    useEnginePoll(
        () => {
            const deviceItems: any[] = (T3Data as any)?.deviceList?.value?.[0]?.children ?? [];
            const nextDevices: EngineDevice[] = deviceItems.map((device) => ({
                pid: Number(device?.id ?? 0),
                serial: Number(device?.data?.serial_number ?? 0),
                name: String(device?.label ?? "")
            }));
            setEngineDevices((previous) =>
                JSON.stringify(previous) === JSON.stringify(nextDevices) ? previous : nextDevices
            );
        },
        300,
        open
    );

    /* The API answers with the linkable kinds only, so the list needs no filtering any more. */
    const linkablePanels = panels;

    /**
     * The two device sources the home page's left tree uses, joined: the app's device list supplies the real
     * names, online state and building grouping, the engine's panel list supplies the panel number the engine's
     * link path writes to. `points` is how many loaded entries belong to that device — keyed by **serial**, the
     * only identity that exists without a websocket connection, so a device with nothing loaded reads `–`.
     */
    const deviceGroups = useMemo(() => {
        const pointsBySerial = new Map<number, number>();
        linkablePanels.forEach((entry) => {
            const serial = Number(entry.serial ?? 0);
            pointsBySerial.set(serial, (pointsBySerial.get(serial) ?? 0) + 1);
        });

        const panelBySerial = new Map<number, EngineDevice>();
        const panelByName = new Map<string, EngineDevice>();
        engineDevices.forEach((device) => {
            if (device.serial) {
                panelBySerial.set(device.serial, device);
            }
            const name = device.name.trim().toLowerCase();
            if (name && !panelByName.has(name)) {
                panelByName.set(name, device);
            }
        });

        const addressable = appDevices.filter(
            (device: DeviceInfo) => Number(device.parentSerialNumber ?? device.noteParentSerialNumber ?? 0) === 0
        );

        /* Serial first (the real key), then the panel name, then the degenerate case of one device and one
         * panel — the panels list carries `serial_number`, but it is not always filled in. */
        const panelFor = (serial: number, name: string): EngineDevice | undefined =>
            panelBySerial.get(serial) ??
            panelByName.get(name.trim().toLowerCase()) ??
            (engineDevices.length === 1 && addressable.length === 1 ? engineDevices[0] : undefined);

        const appSerials = new Set(addressable.map((device: DeviceInfo) => Number(device.serialNumber)));

        const groups = groupDevicesForDropdown(addressable, deviceStatuses).map((group) => ({
            label: group.label,
            rows: group.devices.map((device: DeviceInfo) => {
                const serial = Number(device.serialNumber);
                const name = deviceListName(device);
                const panel = panelFor(serial, name);
                return {
                    key: String(serial),
                    pid: panel ? panel.pid : null,
                    name,
                    online: deviceStatuses.get(serial) === "online" || !!device.isOnline,
                    points: pointsBySerial.get(serial) ?? 0
                };
            })
        }));

        /* Panels the engine knows but the device store does not — without them the list would look like it only
         * holds one device. Online state is unknown (`null`) rather than guessed. */
        const engineOnly = engineDevices
            .filter((device) => device.serial && !appSerials.has(device.serial))
            .map((device) => ({
                key: String(device.serial),
                pid: device.pid,
                name: device.name || `Panel ${device.pid}`,
                online: null,
                points: pointsBySerial.get(device.serial) ?? 0
            }));
        if (engineOnly.length > 0) {
            groups.push({ label: "Other panels", rows: engineOnly });
        }

        if (groups.length > 0) {
            return groups;
        }

        /* The app's device store is populated by the home page and may still be empty on this route, so fall
         * back to the engine's own panel list. Online state is then unknown (`null`) rather than guessed. */
        return engineDevices.length > 0
            ? [
                {
                    label: "Devices",
                    rows: engineDevices.map((device) => ({
                        key: String(device.serial || device.pid),
                        pid: device.pid,
                        name: device.name || `Panel ${device.pid}`,
                        online: null,
                        points: pointsBySerial.get(device.serial) ?? 0
                    }))
                }
            ]
            : [];
    }, [appDevices, deviceStatuses, engineDevices, linkablePanels]);

    const rows = useMemo(() => deviceGroups.flatMap((group) => group.rows), [deviceGroups]);

    /*
     * The picked key wins — **including** "All devices", which is not one of `rows`. The earlier test
     * (`rows.some(row => row.key === deviceKey)`) rejected that key and the ternary fell through to the first
     * device with points, so clicking *All devices* snapped straight back to a device and looked dead.
     *
     * **All devices is the default too**: the dialog opens listing everything the drawing can link and only
     * narrows to a device when one is picked (the old default was the first device that happened to have points).
     */
    const activeKey =
        deviceKey === ALL_DEVICES_KEY || rows.some((row) => row.key === deviceKey)
            ? deviceKey
            : ALL_DEVICES_KEY;
    const activeRow = rows.find((row) => row.key === activeKey) ?? null;

    /** Device serial → device name, for the grid's Device column. */
    const deviceNameBySerial = useMemo(() => {
        const bySerial = new Map<number, string>();
        deviceGroups.forEach((group) =>
            group.rows.forEach((row) => {
                const serial = Number(row.key);
                if (Number.isFinite(serial) && serial > 0) {
                    bySerial.set(serial, row.name);
                }
            })
        );
        return bySerial;
    }, [deviceGroups]);

    /*
     * What the picker wants loaded: *All devices* ⇒ every device in the list, one device selected ⇒ just that one.
     * `ensure` skips what is already in state or in flight, so this is safe on every scope change — it is also
     * what makes the dialog work on open, without the user having to click a device first.
     */
    const devicePairs = useMemo(
        () => rows.map((row) => ({ serial: Number(row.key), pid: row.pid })),
        [rows]
    );
    const deviceSignature = devicePairs.map((pair) => `${pair.serial}:${pair.pid ?? ""}`).join(",");

    useEffect(() => {
        if (!open) {
            return;
        }
        const wanted =
            activeKey === ALL_DEVICES_KEY
                ? devicePairs
                : devicePairs.filter((pair) => String(pair.serial) === activeKey);
        if (wanted.length > 0) {
            source.ensure(wanted);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, activeKey, deviceSignature]);

    /* "All devices" spans every loaded device; a device row narrows to its own serial. */
    const points = useMemo(() => {
        const mine =
            activeKey === ALL_DEVICES_KEY
                ? linkablePanels
                : linkablePanels.filter((entry) => String(entry.serial ?? "") === activeKey);
        const needle = query.trim().toLowerCase();
        const matched = needle
            ? mine.filter((entry) => entryLabel(entry).toLowerCase().includes(needle))
            : mine;
        return matched.slice(0, 500);
    }, [linkablePanels, activeRow, activeKey, query]);

    /*
     * Reopening the picker — *Change* on an already linked widget — has to show what is linked: the current entry
     * is preselected, and it is rendered as a pinned section at the top of the grid (see below) so it is visible
     * without scrolling, whatever the scope or the search is.
     */
    const currentKey = current ? entryKey(current) : null;
    const selectedKey = selected ? entryKey(selected) : null;

    useEffect(() => {
        setSelected(open ? current : null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    /*
     * The list under the pinned section keeps the linked entry out of it, so the same point never shows twice.
     */
    const listPoints = useMemo(
        () => (currentKey ? points.filter((entry) => entryKey(entry) !== currentKey) : points),
        [points, currentKey]
    );

    const close = () => {
        setSelected(null);
        setQuery("");
        /* `deviceKey` resets too: a fresh dialog opens on *All devices* rather than the device picked last time. */
        setDeviceKey(null);
        onClose();
    };

    const commit = (entry: Record<string, any>) => {
        setSelected(null);
        setQuery("");
        onPick(entry);
    };

    /**
     * One device selected: read that device into the local DB (`POST /{inputs|outputs|variables}/:serial/refresh`
     * then `save-refreshed` — what the device pages' own Refresh does) and show it again. *All devices*: re-read
     * what the API already holds for every device in the list, with no device round-trip for the whole bank.
     */
    const reload = () => {
        const pair = devicePairs.find((candidate) => String(candidate.serial) === activeKey);
        if (activeKey !== ALL_DEVICES_KEY && pair) {
            void source.refresh(pair);
            return;
        }
        source.reload(devicePairs);
    };

    /* The full device list. The store is filled by the home page, so on this route it can still be empty — and
     * the engine's panel list only knows the panels of the drawing's own device. Both are requested here. */
    useEffect(() => {
        if (!open || appDevices.length > 0) {
            return;
        }
        void fetchDevices().catch(() => undefined);
    }, [open, appDevices.length, fetchDevices]);

    return (
        <Dialog
            open={open}
            onOpenChange={(_, data) => {
                if (!data.open) {
                    close();
                }
            }}
        >
            {/* Wider than FDD's 640 px form dialog — it holds a device column plus the point table, and the names
             * are long. 1080 px also keeps Point | Type | Value | Device on one comfortable line. */}
            <DialogSurface style={{ maxWidth: "1080px", width: "min(1080px, 96vw)" }}>
                <DialogBody>
                    {/* Fluent's own close affordance lives in the title's `action` slot, not in a hand-rolled
                     * button — `DialogTrigger action="close"` routes through `onOpenChange` above, so the reset
                     * in `close()` runs here exactly as it does for Cancel / Save. */}
                    <DialogTitle
                        style={LINK_ENTRY_TITLE_STYLE}
                        action={
                            <DialogTrigger action="close">
                                <Button
                                    appearance="subtle"
                                    aria-label="Close"
                                    title="Close"
                                    icon={<DismissRegular />}
                                />
                            </DialogTrigger>
                        }
                    >
                        Link Entry
                    </DialogTitle>
                    <DialogContent>
                        <div className={pickerStyles.layout}>
                            <div className={pickerStyles.body}>
                                {/* Left pane: devices only — no toolbar, so the whole column is the list. */}
                                <aside className={pickerStyles.devicesPane}>
                                    {/* All of them at once — the list's default row. */}
                                    <button
                                        type="button"
                                        aria-pressed={activeKey === ALL_DEVICES_KEY}
                                        className={mergeClasses(
                                            pickerStyles.deviceRow,
                                            pickerStyles.deviceRowAll,
                                            activeKey === ALL_DEVICES_KEY
                                                ? pickerStyles.deviceRowActive
                                                : undefined
                                        )}
                                        onClick={() => setDeviceKey(ALL_DEVICES_KEY)}
                                    >
                                        <span className={pickerStyles.allLabel}>All devices</span>
                                        <span className={pickerStyles.deviceMeta}>{linkablePanels.length}</span>
                                    </button>

                                    {deviceGroups.map((group) => (
                                        <React.Fragment key={group.label}>
                                            {/* Only worth a header when there is more than one group — otherwise
                                             * it just repeats the pane title. */}
                                            {deviceGroups.length > 1 ? (
                                                <span className={pickerStyles.groupHead}>
                                                    <BuildingRegular fontSize={13} />
                                                    {group.label}
                                                </span>
                                            ) : null}
                                            {group.rows.map((row) => (
                                                <button
                                                    key={row.key}
                                                    type="button"
                                                    aria-pressed={row.key === activeKey}
                                                    className={mergeClasses(
                                                        pickerStyles.deviceRow,
                                                        row.key === activeKey
                                                            ? pickerStyles.deviceRowActive
                                                            : undefined
                                                    )}
                                                    onClick={() => setDeviceKey(row.key)}
                                                >
                                                    {row.online === null ? null : (
                                                        <span
                                                            className={mergeClasses(
                                                                pickerStyles.dot,
                                                                row.online
                                                                    ? pickerStyles.dotOnline
                                                                    : pickerStyles.dotOffline
                                                            )}
                                                            title={row.online ? "Online" : "Offline"}
                                                        />
                                                    )}
                                                    <span className={pickerStyles.deviceName}>{row.name}</span>
                                                    <span className={pickerStyles.deviceMeta}>
                                                        {row.points > 0 ? row.points : "–"}
                                                    </span>
                                                </button>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                    {rows.length === 0 ? (
                                        <span className={pickerStyles.hint}>No devices reported yet.</span>
                                    ) : null}
                                </aside>

                                <section className={pickerStyles.pointsPane}>
                                    {current ? (
                                        /*
                                         * The widget's current link, first thing in the pane: **above the search box**, as
                                         * its own card rather than a row of the table below. This is a status about the
                                         * widget ("bound to that point"), and the linked point can sit anywhere in a table of
                                         * hundreds, so it is read here instead of hunted for. Clicking it selects that
                                         * entry, so Save re-commits it.
                                         */
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            aria-pressed={selectedKey === currentKey}
                                            className={mergeClasses(
                                                pickerStyles.currentCard,
                                                selectedKey === currentKey
                                                    ? pickerStyles.currentCardSelected
                                                    : undefined
                                            )}
                                            onClick={() => setSelected(current)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" || event.key === " ") {
                                                    event.preventDefault();
                                                    setSelected(current);
                                                }
                                            }}
                                            onDoubleClick={() => commit(current)}
                                        >
                                            <span className={pickerStyles.currentHead}>Current link</span>
                                            <span className={pickerStyles.currentTitle}>{entryLabel(current)}</span>
                                            <span className={pickerStyles.currentMeta}>
                                                {[
                                                    current.type,
                                                    current.id,
                                                    entryValueText(current) ? `value ${entryValueText(current)}` : null,
                                                    deviceNameBySerial.get(Number(current.serial ?? 0)) ??
                                                        (current.pid === undefined || current.pid === null
                                                            ? null
                                                            : `Panel ${current.pid}`)
                                                ]
                                                    .filter(Boolean)
                                                    .join(" \u00b7 ")}
                                            </span>
                                            {onUnlink ? (
                                                /* The card's own click selects the entry; unlinking must not. */
                                                <button
                                                    type="button"
                                                    className={pickerStyles.currentUnlink}
                                                    title="Remove the link to this entry"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onUnlink();
                                                        close();
                                                    }}
                                                >
                                                    <LinkDismissRegular fontSize={14} />
                                                    Unlink
                                                </button>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    {/* Search and Reload belong to the list they act on. */}
                                    <div className={pickerStyles.toolbar}>
                                        <Input
                                            className={pickerStyles.searchBox}
                                            contentBefore={<SearchRegular />}
                                            placeholder="Search points…"
                                            value={query}
                                            onKeyDown={keepKeysInField}
                                            onChange={(_, data) => setQuery(data.value)}
                                        />
                                        <button
                                            type="button"
                                            className={pickerStyles.linkButton}
                                            title="Reload the panels data from the device"
                                            onClick={reload}
                                        >
                                            <ArrowClockwiseRegular fontSize={14} />
                                            Reload
                                        </button>
                                        <span className={pickerStyles.count}>
                                            {points.length} point{points.length === 1 ? "" : "s"}
                                        </span>
                                    </div>

                                    {loading || source.error ? (
                                        <div className={pickerStyles.progress}>
                                            {source.error ? null : <Spinner size="extra-tiny" />}
                                            <span>{source.error ?? "Reading the device's points…"}</span>
                                        </div>
                                    ) : null}

                                    {/*
                                     * The widget's current link, as its own section **above** the grid — not a row inside
                                     * it. The linked point can sit anywhere in a table of hundreds (VAR100 …), so it is
                                     * kept in view instead of left to be scrolled to, and it is the one row that still
                                     * shows when the entry's own panel has not streamed in yet.
                                     */}
                                    <div className={pickerStyles.gridWrap}>
                                        {points.length === 0 ? (
                                            <div className={pickerStyles.emptyState}>
                                                {loading
                                                    ? "Reading the points…"
                                                    : panels.length === 0
                                                        ? "No points stored for this device yet — press Reload to read it from the device."
                                                        : query.trim()
                                                            ? "No point matches this search."
                                                            : "This device has no point of the kinds this picker lists."}
                                            </div>
                                        ) : (
                                            <>
                                                <div className={pickerStyles.gridHeader}>
                                                    <span>Point</span>
                                                    <span>Full Label</span>
                                                    <span>Label</span>
                                                    <span>Type</span>
                                                    <span>Units</span>
                                                    <span>Range</span>
                                                    <span>Value</span>
                                                    <span>Device</span>
                                                </div>
                                                {listPoints.map((entry, index) => {
                                                    const isSelected = selectedKey === entryKey(entry);
                                                    return (
                                                        <div
                                                            /* The serial belongs in the key: two devices both have an
                                                             * `IN1` on panel 1, and without the engine's panel list they
                                                             * are otherwise indistinguishable (`1-IN1-0` twice). */
                                                            key={`${entry.serial ?? ""}-${entry.pid}-${entry.id}-${entry.index ?? index}`}
                                                            role="row"
                                                            aria-selected={isSelected}
                                                            className={mergeClasses(
                                                                pickerStyles.gridRow,
                                                                isSelected
                                                                    ? pickerStyles.gridRowSelected
                                                                    : undefined
                                                            )}
                                                            onClick={() => setSelected(entry)}
                                                            onDoubleClick={() => commit(entry)}
                                                        >
                                                            <span className={pickerStyles.cellName}>
                                                                {entryLabel(entry)}
                                                            </span>
                                                            {/* The device's own two name fields: `description` is the full
                                                             * label, `label` the short one (the same pairing the device pages
                                                             * show). A field nobody wrote is left blank — no placeholder. */}
                                                            <span className={pickerStyles.cellName}>
                                                                {sanitizeDeviceText(entry.description)}
                                                            </span>
                                                            <span className={pickerStyles.cellName}>
                                                                {sanitizeDeviceText(entry.label)}
                                                            </span>
                                                            {/* Type, Units and Range are the three cells the point
                                                             * grids show beside a value, and all three come from
                                                             * `PointRange`, i.e. from the same tables and with the same
                                                             * wording (`Digital`, `0/1`, `Unused`, `Normal/Alarm`). */}
                                                            <span className={pickerStyles.monoCell}>
                                                                {PointRange.signalType(entry)}
                                                            </span>
                                                            <span className={pickerStyles.monoCell}>
                                                                {PointRange.unitSymbol(entry)}
                                                            </span>
                                                            <span className={pickerStyles.rangeCell}>
                                                                {PointRange.label(entry)}
                                                            </span>
                                                            <span className={pickerStyles.valueCell}>
                                                                {entryValueText(entry)}
                                                            </span>
                                                            <span className={pickerStyles.deviceCell}>
                                                                {deviceNameBySerial.get(Number(entry.serial ?? 0)) ??
                                                                    (entry.pid === undefined || entry.pid === null
                                                                        ? "—"
                                                                        : `Panel ${entry.pid}`)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </DialogContent>
                    <DialogActions>
                        {/* Normal button box, plain weight, 12 px label (`DIALOG_ACTION_STYLE`). */}
                        <Button appearance="secondary" size="medium" style={DIALOG_ACTION_STYLE} onClick={close}>
                            Cancel
                        </Button>
                        <Button
                            appearance="primary"
                            size="medium"
                            style={DIALOG_ACTION_STYLE}
                            disabled={!selected}
                            onClick={() => {
                                if (selected) {
                                    commit(selected);
                                }
                            }}
                        >
                            Save
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};

/**
 * ## Data (P1) — the T3000 side of a widget
 *
 * Mirrors the legacy `ObjectConfigNew.vue` entry block field for field, condition for condition, and —
 * critically — call for call, so a widget stamped here is bound exactly like one stamped by the old panel:
 *
 * | action | engine path |
 * | --- | --- |
 * | link | `QuasarUtil.LinkT3EntrySaveV2()` — default display field, icon per entry type, `refreshObjectStatus`, `SaveAppStateV2`, `RenderAllSVGObjects` |
 * | entry field | write the value on the app item, then `Hvac.IdxPageReact.T3UpdateEntryField(field, item)` (reads `item.t3Entry[field]` and pushes UPDATE_ENTRY) + `SaveAct()` |
 * | display field | `Hvac.IdxPageReact.save(false, true)` + `SaveAct()` |
 * | unlink | clear `t3Entry`, `refreshObjectStatus` + `SaveAppStateV2` + `RenderAllSVGObjects` (the tail of the link path; the legacy panel could only re-link) |
 *
 * The controls appear only once an entry is linked and, as in the legacy panel, anything that writes the entry
 * to the device is disabled while the entry is in Auto (`auto_manual === 0`) — Auto is the device's own logic.
 */
const DataSection: React.FC<{ onError: (message: string | undefined) => void }> = ({ onError }) => {
    const styles = useStyles();
    const appItem = useHvacAppStateItem();
    const [pickerOpen, setPickerOpen] = useState(false);

    /*
     * No app-layer record *yet*.
     *
     * The record holds the T3000 link and the widget settings, so this section has nothing to read without it.
     * The document finishes the engine's own registration for shapes that land without one (`useHvacAutoRecord`,
     * the step `DrawUtil.MouseStampObjectDone` / `DragDropObjectDone` would have run), so this is a transient
     * state that resolves a poll later - the section comes back on its own, which is why it stays out here
     * instead of offering a repair button.
     */
    if (!appItem) {
        return null;
    }

    const entry = appItem.t3Entry;
    const page: any = (Hvac as any)?.IdxPageReact ?? (Hvac as any)?.IdxPage;

    const run = (what: string, action: () => void) => {
        try {
            onError(undefined);
            action();
        } catch (error) {
            onError(`${what} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    /**
     * Legacy order, verbatim: mutate the app item → push to the device → re-render the drawing.
     *
     * The write targets **`appItem.raw`**, never the `entry` in scope: that one is the poll's snapshot (which is
     * what makes the panel notice changes), and `T3UpdateEntryField` reads the value back off the live object.
     */
    const commitEntryField = (field: string, value: number) =>
        run(`Updating ${field}`, () => {
            const live = appItem.raw?.t3Entry;
            if (!live) {
                return;
            }
            live[field] = value;
            page?.T3UpdateEntryField?.(field, appItem.raw);
            IdxUtils.refreshObjectStatus(appItem.raw);
            SvgUtil.RenderAllSVGObjects();
            EvtOpt.toolOpt.SaveAct();
        });

    const commitDisplayField = (value: string) =>
        run("Updating the display field", () => {
            appItem.raw.settings = appItem.raw.settings ?? {};
            appItem.raw.settings.t3EntryDisplayField = value;
            page?.save?.(false, true);
            SvgUtil.RenderAllSVGObjects();
            EvtOpt.toolOpt.SaveAct();
        });

    const linkEntry = (chosen: Record<string, any>) =>
        run("Linking the entry", () => {
            setPickerOpen(false);
            /*
             * A shallow copy, because the engine's save path may rewrite `data.value` (`/1000`); copying keeps
             * the shared `selectPanelOptions` list pristine while storing exactly what the close dialog held — with
             * the device's 0xFF fill stripped from every string, so the widget's own renderer and every reader of
             * this entry work with real text instead of jsoncpp's U+FFFD run.
             */
            linkT3EntryDialogV2.value.data = sanitizeEntryText({ ...chosen });
            QuasarUtil.LinkT3EntrySaveV2();
        });

    const unlinkEntry = () =>
        run("Unlinking the entry", () => {
            appItem.raw.t3Entry = null;
            IdxUtils.refreshObjectStatus(appItem.raw);
            DataOpt.SaveAppStateV2();
            SvgUtil.RenderAllSVGObjects();
            EvtOpt.toolOpt.SaveAct();
        });

    if (!entry) {
        return (
            <Section title="Data" tag="Unlinked" bodyStyle={LOOSE_BODY_GAP}>
                <Button
                    appearance="primary"
                    size="small"
                    style={PLAIN_WEIGHT}
                    className={styles.linkAction}
                    onClick={() => setPickerOpen(true)}
                >
                    Link with an entry
                </Button>
                <span className={styles.note}>
                    A linked entry supplies the widget's live value and its display text.
                </span>
                <EntryPickerDialog
                    open={pickerOpen}
                    onPick={linkEntry}
                    onClose={() => setPickerOpen(false)}
                    current={null}
                />
            </Section>
        );
    }

    /* Never disables the fields — the Value row exists to be written, and greying it out while the point is in AUTO
     * (what the legacy panel did) left no way to change it at all. A write the device refuses reports as the panel's
     * own error message instead. Kept as a named flag so the rows below read uniformly. */
    const autoDisabled = false;
    /*
     * The engine's own range reader — kept **only** for a multi-state point's state names. They come from the
     * device's MSV rows over the socket, so no table in this app can name them; everything else about a range
     * (its name, a digital pair's two words, an analog unit) is answered by `PointRange`, which reads the same
     * tables the point grids do. The engine's `T3Data.ranges` spells several of those ranges the other way
     * round (`direct`) and uses symbol units, which is why the panel and the grid used to disagree.
     */
    const deviceRange = IdxUtils.getEntryRange(entry) as any;
    /* A program/schedule/holiday reports its own rows (`Status`, `Output`) instead of a point's `Value`. */
    const isPointEntry = entry.type === "INPUT" || entry.type === "OUTPUT" || entry.type === "VARIABLE";
    /*
     * Which control the Value row gets, and what its states are called, is asked of `PointRange` — the class that
     * reads the **point pages'** own tables (`features/<kind>/data/rangeData.ts`). See the class for why the
     * engine's `T3Data.ranges` must not answer this (`direct` pairs come out swapped, units are symbols).
     */
    const isDigitalEntry = PointRange.isDigital(entry);
    /* `0` and `255` (0xFF) are the device's "field never written" fills, not range ids. */
    const rangeUnset = PointRange.rangeId(entry) === undefined;
    const isMsv = isPointEntry && PointRange.isMsv(entry);
    /*
     * A list of states needs a range that **names** them. Without one there is nothing to choose from: every input
     * of device 1028 is `digitalAnalog "0"` with `rangeField "0"`, and its own page shows such a point with
     * `Type Digital`, `Range Unused` and a numeric `Value` — an Off/On list there was a choice of two words the
     * device never wrote.
     */
    const isSwitch = isPointEntry && isDigitalEntry && !isMsv && !rangeUnset;
    /*
     * Everything else that is a point reads and writes as a **number**: the analog point, and the digital one whose
     * range was never written. Both write `value` (a digital point's `control` is a 0/1 command, which is the state
     * list's job).
     */
    const isNumberValue = isPointEntry && !isSwitch && !isMsv;
    /* The two words a digital point's states are called, from its range's own name (`Close/Open`). */
    const states = PointRange.states(entry);
    /*
     * The state a digital point is showing, read straight off the entry (`control` is the command field;
     * `value` is the fallback for a record that reports only one of them) and **not** coerced to 0/1: a value
     * the OFF/ON list cannot contain is drawn as an em dash by `SelectRow` instead of being shown as OFF.
     */
    const controlValue = entry.control ?? entry.value;
    /*
     * The reading, in the units the point grids print: the device stores `fValue` ×1000 (`fValue -6500800` is
     * `-6500.80` on its page) and `InputsPage`'s Value cell divides by 1000 for **every** row — including the
     * `-6523.10` marker a point carries before anything was configured, which is what that page prints for it too.
     * So the field shows a number whenever the entry has one: an empty box is the one thing that page never shows.
     */
    const valueReading = (() => {
        const raw = entry.value;
        if (raw === undefined || raw === null || raw === "") {
            return undefined;
        }
        const value = Number(raw);
        return Number.isFinite(value) ? value / 1000 : undefined;
    })();

    /* The device's two name fields, cleaned once: `description` is the full label, `label` the short one. */
    const fullLabelText = sanitizeDeviceText(entry.description);
    const labelText = sanitizeDeviceText(entry.label);

    const displayFieldOptions: { label: string; value: string }[] = [
        { label: "None", value: "none" },
        { label: "ID", value: "id" }
    ];
    if (entry.label !== undefined) {
        displayFieldOptions.push({ label: "Label", value: "label" });
    }
    if (entry.description !== undefined) {
        displayFieldOptions.push({ label: "Description", value: "description" });
    }
    if (entry.value !== undefined) {
        displayFieldOptions.push({
            label: "Value",
            value: entry.digital_analog === 1 ? "value" : "control"
        });
    }

    return (
        <Section title="Data" tag="Linked" bodyStyle={LOOSE_BODY_GAP}>
            <div className={styles.entryCard}>
                <span className={styles.entryTitle}>
                    {entry.type} · {entry.pid}-{entry.id}
                </span>
            </div>
            <div className={styles.entryActions}>
                <button
                    type="button"
                    className={styles.entryLink}
                    title="Change the linked entry"
                    onClick={() => setPickerOpen(true)}
                >
                    <LinkRegular fontSize={14} />
                    Change
                </button>
                <button
                    type="button"
                    className={styles.entryLink}
                    title="Remove the link to this entry"
                    onClick={unlinkEntry}
                >
                    <DismissRegular fontSize={14} />
                    Unlink
                </button>
            </div>

            {/* The device's own two name fields, in the same rows as every other field. The rows always exist and
             * stay blank when the device never wrote the field — a row that disappears moves everything under it. */}
            <ReadRow label="Full Label" value={fullLabelText} showEmpty />
            <ReadRow label="Label" value={labelText} showEmpty />

            {entry.auto_manual !== undefined ? (
                <SelectRow
                    label="Auto/Manual"
                    value={entry.auto_manual}
                    options={[
                        { label: "Auto", value: 0 },
                        { label: "Manual", value: 1 }
                    ]}
                    onSelect={(value) => commitEntryField("auto_manual", Number(value))}
                />
            ) : (
                <ReadRow label="Auto/Manual" showEmpty />
            )}

            {/* Exactly one Value row, always, with the control the entry's own type and range call for: the
             * number input for an analog point, OFF/ON for a point that declares a digital range, a list for a
             * multi-state range, and a blank row for a kind that has no value to edit. The row keeps its place
             * either way.
             *
             * Nothing in this section is disabled — the fields exist to be written. The legacy panel greyed the
             * value out while the point was in AUTO, which left no way to change it at all; a write the device
             * refuses now shows up as the panel's own error message instead. */}
            {isSwitch ? (
                <SelectRow
                    label="Value"
                    value={controlValue}
                    options={[
                        { label: states.zero, value: 0 },
                        { label: states.one, value: 1 }
                    ]}
                    onSelect={(value) => commitEntryField("control", Number(value))}
                />
            ) : isMsv ? (
                <SelectRow
                    label="Value"
                    value={entry.value}
                    disabled={autoDisabled}
                    options={((deviceRange?.options ?? []) as any[])
                        .filter((option) => option.status === 1)
                        .map((option) => ({
                            label: sanitizeDeviceText(option.name) || String(option.value),
                            value: option.value
                        }))}
                    onSelect={(value) => commitEntryField("value", Number(value))}
                />
            ) : entry.type === "HOLIDAY" ? (
                <SelectRow
                    label="Value"
                    value={entry.value}
                    options={ON_OFF_OPTIONS}
                    onSelect={(value) => commitEntryField("value", Number(value))}
                />
            ) : isNumberValue ? (
                <NumberField
                    label="Value"
                    value={valueReading}
                    unit={PointRange.unit(entry) || undefined}
                    onCommit={(value) => {
                        /*
                         * The engine's write path divides by 1000 when the magnitude reaches 1000
                         * (`IdxPage.T3UpdateEntryField`), so the field's number is stored **×1000** and the device
                         * receives exactly what was typed (`72.5` ⇒ `72500` ⇒ sent `72.5`; `0` stays `0`). The
                         * reading above is unscaled the same way, so what the user sees and what the point keeps
                         * are the same number.
                         */
                        commitEntryField("value", Math.round(value * 1000));
                        return { ok: true };
                    }}
                    onError={onError}
                />
            ) : (
                <ReadRow label="Value" showEmpty />
            )}

            {!isMsv && entry.type === "PROGRAM" ? (
                <SelectRow
                    label="Status"
                    value={entry.status}
                    options={ON_OFF_OPTIONS}
                    onSelect={(value) => commitEntryField("status", Number(value))}
                />
            ) : null}

            {!isMsv && entry.type === "SCHEDULE" ? (
                <SelectRow
                    label="Output"
                    value={entry.output}
                    options={ON_OFF_OPTIONS}
                    onSelect={(value) => commitEntryField("output", Number(value))}
                />
            ) : null}

            <SelectRow
                label="Display field"
                value={appItem.settings?.t3EntryDisplayField ?? "none"}
                options={displayFieldOptions}
                onSelect={commitDisplayField}
            />

            <EntryPickerDialog
                open={pickerOpen}
                onPick={linkEntry}
                onClose={() => setPickerOpen(false)}
                /* *Change* on a linked widget: hand the picker the entry it is bound to now. */
                current={entry}
                onUnlink={unlinkEntry}
            />
        </Section>
    );
};

/* ── P2: the widget's own settings, described by the tool definition ── */

/**
 * One entry of `NewTool[type].settings` — e.g. `{ label: "Justify", type: "justifyContent" }`.
 *
 * The panel does not hard-code per-widget fields: the tool definitions already describe them, and this is the
 * React equivalent of the legacy `v-for="(setting, key) in settings"` loop in `ObjectConfigNew.vue`.
 */
interface ToolSetting {
    label?: string;
    type?: string;
    value?: unknown;
}

/** Settings the legacy panel pulls out of the schema loop and shows as plain "General" fields. */
const MAIN_SETTING_KEYS = ["title", "titleColor", "bgColor", "fontSize"];

/** A colour setting is a `#rrggbb` string or, in some tool definitions, `{ label, value }`. */
const colorText = (value: unknown): string => {
    if (typeof value === "string") {
        return value;
    }
    if (value && typeof value === "object" && typeof (value as any).value === "string") {
        return (value as any).value;
    }
    return "";
};

const JUSTIFY_OPTIONS = [
    { value: "flex-start", icon: <TextAlignLeftRegular fontSize={14} /> },
    { value: "center", icon: <TextAlignCenterRegular fontSize={14} /> },
    { value: "flex-end", icon: <TextAlignRightRegular fontSize={14} /> }
];

const TEXT_ALIGN_OPTIONS = [
    { value: "left", icon: <TextAlignLeftRegular fontSize={14} /> },
    { value: "center", icon: <TextAlignCenterRegular fontSize={14} /> },
    { value: "right", icon: <TextAlignRightRegular fontSize={14} /> }
];

/** Icon-picker options. Values are either a Font Awesome class (`fa-solid fa-…`) or a Material ligature. */
const toIconOptions = (catalogue: any[], glyphOf: (item: any) => string) =>
    (catalogue ?? []).map((item) => {
        const glyph = glyphOf(item);
        const isFontAwesome = glyph.includes("fa");
        return {
            label: String(item?.label ?? item?.value ?? glyph),
            value: String(item?.value ?? ""),
            glyphClass: isFontAwesome ? glyph : "material-icons",
            glyphText: isFontAwesome ? "" : glyph
        };
    });

const ICON_OPTIONS = toIconOptions(iconCatalog as any[], (item) => String(item?.value ?? ""));
const SWITCH_ICON_OPTIONS = toIconOptions(switchIconCatalog as any[], (item) => String(item?.icon?.off ?? ""));

/** A three-way choice drawn as icon buttons — the legacy `q-btn-group` of align buttons. */
const AlignRow: React.FC<{
    label: string;
    value: string | undefined;
    options: { value: string; icon: React.ReactNode }[];
    onSelect: (value: string) => void;
}> = ({ label, value, options, onSelect }) => {
    const styles = useStyles();
    return (
        <div className={styles.row}>
            <span className={styles.label}>{label}</span>
            <span className={styles.alignRow}>
                {options.map((option) => (
                    <Button
                        key={option.value}
                        size="small"
                        style={PLAIN_WEIGHT}
                        appearance={option.value === value ? "secondary" : "subtle"}
                        aria-pressed={option.value === value}
                        title={option.value}
                        icon={option.icon}
                        onClick={() => onSelect(option.value)}
                    />
                ))}
            </span>
        </div>
    );
};

/** Single-line text setting that commits on blur / Enter (the panel's usual draft-then-commit rule). */
const SettingTextBox: React.FC<{
    label: string;
    value: string;
    onCommit: (value: string) => void;
}> = ({ label, value, onCommit }) => {
    const styles = useStyles();
    const [draft, setDraft] = useState(value);

    useEffect(() => {
        setDraft(value);
    }, [value]);

    return (
        <div className={styles.row}>
            <span className={styles.label}>{label}</span>
            <Input
                className={styles.input}
                size="small"
                appearance="outline"
                value={draft}
                aria-label={label}
                onChange={(_, data) => setDraft(data.value)}
                onBlur={() => {
                    if (draft !== value) {
                        onCommit(draft);
                    }
                }}
                onKeyDown={(event) => {
                    keepKeysInField(event);
                    if (event.key === "Enter") {
                        (event.target as HTMLInputElement).blur();
                    }
                    if (event.key === "Escape") {
                        setDraft(value);
                    }
                }}
            />
        </div>
    );
};

/** Dropdown of icon choices, with the glyph drawn beside the label. */
const IconSelectRow: React.FC<{
    label: string;
    value: string | undefined;
    options: { label: string; value: string; glyphClass: string; glyphText: string }[];
    onSelect: (value: string) => void;
}> = ({ label, value, options, onSelect }) => {
    const styles = useStyles();
    const selected = options.find((option) => option.value === value);

    return (
        <div className={styles.row}>
            <span className={styles.label}>{label}</span>
            <Dropdown
                className={styles.input}
                selectedOptions={selected ? [selected.value] : []}
                value={selected?.label ?? "—"}
                onOptionSelect={(_, data) => onSelect(String(data.optionValue))}
            >
                {options.map((option) => (
                    <Option key={option.value} value={option.value}>
                        <span className={styles.iconOption}>
                            {option.glyphText || option.glyphClass ? (
                                <i className={option.glyphClass} style={{ fontSize: "14px", lineHeight: 1 }}>
                                    {option.glyphText}
                                </i>
                            ) : null}
                            {option.label}
                        </span>
                    </Option>
                ))}
            </Dropdown>
        </div>
    );
};

/**
 * ## Gauge / Dial settings (P3)
 *
 * The legacy `GaugeSettingsDialog.vue`, rebuilt on Fluent: chart type, min/max, thickness (Gauge only), ticks,
 * minor ticks and the colour gradient (`offset`/`color` pairs, add & remove).
 *
 * Two behaviours are copied deliberately: **opening** clones the item so Cancel is a pure discard, and **saving**
 * replaces the item's type and settings. The legacy engine call `AppRuntime.gaugeSettingsSave` did the replace
 * through Vue reactivity; in React the panel writes the live item and then asks the engine to redraw.
 */
interface GaugeColor {
    offset: number;
    color: string;
}

interface GaugeDraft {
    type: string;
    settings: {
        min: number;
        max: number;
        thickness?: number;
        ticks?: number;
        minorTicks?: number;
        colors: GaugeColor[];
    };
}

const asNumber = (value: unknown, fallback = 0): number =>
    typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? fallback) || fallback;

const gaugeDraft = (item: Record<string, any> | null | undefined): GaugeDraft => {
    const settings = item?.settings ?? {};
    const colors = Array.isArray(settings.colors) ? settings.colors : [];
    return {
        type: String(item?.type ?? "Gauge"),
        settings: {
            min: asNumber(settings.min, 0),
            max: asNumber(settings.max, 100),
            thickness: settings.thickness === undefined ? undefined : asNumber(settings.thickness, 0),
            ticks: settings.ticks === undefined ? undefined : asNumber(settings.ticks, 0),
            minorTicks: settings.minorTicks === undefined ? undefined : asNumber(settings.minorTicks, 0),
            colors: colors.map((color: any) => ({
                offset: asNumber(color?.offset, 0),
                color: String(color?.color ?? "#000000")
            }))
        }
    };
};

const GaugeSettingsDialog: React.FC<{
    open: boolean;
    item: Record<string, any>;
    onClose: () => void;
    onSave: (draft: GaugeDraft) => void;
}> = ({ open, item, onClose, onSave }) => {
    const styles = useStyles();
    const [draft, setDraft] = useState<GaugeDraft>(() => gaugeDraft(item));

    useEffect(() => {
        if (open) {
            setDraft(gaugeDraft(item));
        }
    }, [open, item]);

    const patchSettings = (patch: Partial<GaugeDraft["settings"]>) =>
        setDraft((previous) => ({ ...previous, settings: { ...previous.settings, ...patch } }));

    return (
        <Dialog
            open={open}
            onOpenChange={(_, data) => {
                if (!data.open) {
                    onClose();
                }
            }}
        >
            <DialogSurface style={{ maxWidth: "600px", width: "min(600px, 94vw)" }}>
                <DialogBody>
                    <DialogTitle
                        style={DIALOG_TITLE_STYLE}
                        action={
                            <DialogTrigger action="close">
                                <Button
                                    appearance="subtle"
                                    aria-label="Close"
                                    title="Close"
                                    icon={<DismissRegular />}
                                />
                            </DialogTrigger>
                        }
                    >
                        {draft.type} settings
                    </DialogTitle>
                    <DialogContent>
                        <div className={styles.gaugeGrid}>
                            <div className={styles.gaugeWide}>
                                <span className={styles.gaugeLabel}>Chart type</span>
                                <Select
                                    value={draft.type}
                                    onChange={(_, data) => setDraft((p) => ({ ...p, type: data.value }))}
                                >
                                    <option value="Gauge">Gauge</option>
                                    <option value="Dial">Dial</option>
                                </Select>
                            </div>

                            <div>
                                <span className={styles.gaugeLabel}>Min</span>
                                <Input
                                    type="number"
                                    onKeyDown={keepKeysInField}
                                    value={String(draft.settings.min)}
                                    onChange={(_, data) => patchSettings({ min: asNumber(data.value, 0) })}
                                />
                            </div>
                            <div>
                                <span className={styles.gaugeLabel}>Max</span>
                                <Input
                                    type="number"
                                    onKeyDown={keepKeysInField}
                                    value={String(draft.settings.max)}
                                    onChange={(_, data) => patchSettings({ max: asNumber(data.value, 0) })}
                                />
                            </div>

                            {/* Thickness is a Gauge-only field, exactly as in the legacy dialog. */}
                            {draft.type === "Gauge" ? (
                                <div>
                                    <span className={styles.gaugeLabel}>Thickness ( px )</span>
                                    <Input
                                        type="number"
                                        onKeyDown={keepKeysInField}
                                        value={String(draft.settings.thickness ?? 0)}
                                        onChange={(_, data) =>
                                            patchSettings({ thickness: asNumber(data.value, 0) })
                                        }
                                    />
                                </div>
                            ) : null}
                            <div>
                                <span className={styles.gaugeLabel}>Ticks</span>
                                <Input
                                    type="number"
                                    onKeyDown={keepKeysInField}
                                    value={String(draft.settings.ticks ?? 0)}
                                    onChange={(_, data) => patchSettings({ ticks: asNumber(data.value, 0) })}
                                />
                            </div>
                            <div>
                                <span className={styles.gaugeLabel}>Minor ticks</span>
                                <Input
                                    type="number"
                                    onKeyDown={keepKeysInField}
                                    value={String(draft.settings.minorTicks ?? 0)}
                                    onChange={(_, data) => patchSettings({ minorTicks: asNumber(data.value, 0) })}
                                />
                            </div>

                            <div className={styles.gaugeWide}>
                                <div className={styles.gaugeColorsHead}>
                                    <span className={styles.gaugeLabel}>{draft.type} colours</span>
                                    <Button
                                        size="small"
                                        style={PLAIN_WEIGHT}
                                        icon={<AddRegular />}
                                        title="Add a colour stop"
                                        onClick={() =>
                                            setDraft((previous) => ({
                                                ...previous,
                                                settings: {
                                                    ...previous.settings,
                                                    colors: [
                                                        ...previous.settings.colors,
                                                        { offset: 100, color: "#000000" }
                                                    ]
                                                }
                                            }))
                                        }
                                    />
                                </div>
                                {draft.settings.colors.map((stop, index) => (
                                    <div key={index} className={styles.gaugeColorRow}>
                                        <Input
                                            className={styles.gaugeColorOffset}
                                            type="number"
                                            aria-label="Offset"
                                            onKeyDown={keepKeysInField}
                                            value={String(stop.offset)}
                                            onChange={(_, data) =>
                                                setDraft((previous) => ({
                                                    ...previous,
                                                    settings: {
                                                        ...previous.settings,
                                                        colors: previous.settings.colors.map((item, at) =>
                                                            at === index
                                                                ? { ...item, offset: asNumber(data.value, 0) }
                                                                : item
                                                        )
                                                    }
                                                }))
                                            }
                                        />
                                        <input
                                            className={mergeClasses(styles.swatch, styles.gaugeColorSwatch)}
                                            type="color"
                                            aria-label="Colour"
                                            value={stop.color}
                                            onChange={(event) => {
                                                const color = event.target.value;
                                                setDraft((previous) => ({
                                                    ...previous,
                                                    settings: {
                                                        ...previous.settings,
                                                        colors: previous.settings.colors.map((item, at) =>
                                                            at === index ? { ...item, color } : item
                                                        )
                                                    }
                                                }));
                                            }}
                                        />
                                        <Button
                                            appearance="subtle"
                                            size="small"
                                            icon={<DeleteRegular />}
                                            title="Remove this colour stop"
                                            onClick={() =>
                                                setDraft((previous) => ({
                                                    ...previous,
                                                    settings: {
                                                        ...previous.settings,
                                                        colors: previous.settings.colors.filter(
                                                            (_, at) => at !== index
                                                        )
                                                    }
                                                }))
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="secondary" style={PLAIN_WEIGHT} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button appearance="primary" style={PLAIN_WEIGHT} onClick={() => onSave(draft)}>
                            Save
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};

/**
 * ## Widget (P2)
 *
 * Everything the *tool* says a widget of this kind can be configured with: the title, its colour, the
 * background colour, the font size and then every entry of the tool's own `settings` schema, dispatched on
 * `setting.type` — the same eight kinds the legacy panel handled (`justifyContent`, `textAlign`, `color`,
 * `text`, `number`, `icon`, `iconSwitch`, `boolean`).
 *
 * Writes are legacy `TraceSettingChange`, call for call: the value goes onto the app item **and** into
 * `QuasarUtil.UpdateSvgElementSettings`, which is what pushes it into the selected object's draw settings so
 * the canvas redraws, then `SaveAct()` commits.
 */
const WidgetSection: React.FC<{ onError: (message: string | undefined) => void }> = ({ onError }) => {
    const styles = useStyles();
    const appItem = useHvacAppStateItem();
    /* Hooks stay above the early return: the gauge dialog is only mounted for Gauge/Dial, but its state hook
     * must be called on every render of this component. */
    const [gaugeOpen, setGaugeOpen] = useState(false);

    if (!appItem) {
        return null;
    }

    const settings: Record<string, any> = appItem.settings ?? {};
    const entry = appItem.t3Entry;

    const schema: Record<string, ToolSetting> = (() => {
        try {
            const tool = (NewTool as any[])?.find((item) => item?.name === appItem.type);
            return (tool?.settings ?? {}) as Record<string, ToolSetting>;
        } catch {
            return {};
        }
    })();

    const run = (what: string, action: () => void) => {
        try {
            onError(undefined);
            action();
        } catch (error) {
            onError(`${what} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const writeSetting = (key: string, value: unknown) =>
        run(`Updating ${key}`, () => {
            appItem.raw.settings = appItem.raw.settings ?? {};
            appItem.raw.settings[key] = value;
            QuasarUtil.UpdateSvgElementSettings(key, value);
            EvtOpt.toolOpt.SaveAct();
        });

    /* An `active` toggle is the device's business once the entry drives it in auto, or when it exposes a
     * `decom` field — the legacy disable rule, including its tooltip. */
    const lockedByEntry = (key: string) =>
        key === "active" && !!entry && (entry.auto_manual === 0 || entry.digital_analog === 1);
    const lockedByDecom = !!entry && entry.decom !== undefined;

    /** Gauge and Dial carry a whole sub-dialog of their own (legacy: the `Settings` button). */
    const isGauge = appItem.type === "Gauge" || appItem.type === "Dial";

    /**
     * Legacy `gaugeSettingsSave`: the item's `type` and settings are replaced wholesale, then the engine is told
     * to redraw. The legacy path (`appStateV2.items[index] = item`) relied on Vue reactivity to re-render.
     */
    const saveGauge = (draft: GaugeDraft) =>
        run("Saving the gauge settings", () => {
            const live = appItem.raw;
            const patch = Object.fromEntries(
                Object.entries(draft.settings).filter(([, value]) => value !== undefined)
            );
            live.type = draft.type;
            live.settings = { ...(live.settings ?? {}), ...patch };
            if (live.id !== undefined) {
                (Hvac as any)?.AppRuntime?.gaugeSettingsSave?.(live);
            }
            SvgUtil.RenderAllSVGObjects();
            EvtOpt.toolOpt.SaveAct();
        });

    const schemaRows = Object.entries(schema).filter(([key]) => !MAIN_SETTING_KEYS.includes(key));

    return (
        <Section title="Widget" tag={appItem.type || undefined}>
            {isGauge ? (
                <div className={styles.row}>
                    <span className={styles.label} />
                    <Button
                        appearance="primary"
                        size="small"
                        style={PLAIN_WEIGHT}
                        title="Gauge and dial range, ticks and colours"
                        onClick={() => setGaugeOpen(true)}
                    >
                        Settings…
                    </Button>
                </div>
            ) : null}
            {settings.fontSize !== undefined ? (
                <NumberField
                    label="Font size"
                    value={Number(settings.fontSize)}
                    digits={0}
                    onCommit={(value) => {
                        writeSetting("fontSize", value);
                        return { ok: true };
                    }}
                    onError={onError}
                />
            ) : null}

            {settings.title !== undefined ? (
                <SettingTextBox
                    label="Title"
                    value={String(settings.title ?? "")}
                    onCommit={(value) => writeSetting("title", value)}
                />
            ) : null}

            {settings.titleColor !== undefined ? (
                <ColorField
                    label="Title colour"
                    value={colorText(settings.titleColor)}
                    onCommit={(value) => {
                        writeSetting("titleColor", value);
                        return { ok: true };
                    }}
                    onError={onError}
                />
            ) : null}

            {settings.bgColor !== undefined ? (
                <ColorField
                    label="Background"
                    value={colorText(settings.bgColor)}
                    onCommit={(value) => {
                        writeSetting("bgColor", value);
                        return { ok: true };
                    }}
                    onError={onError}
                />
            ) : null}

            {schemaRows.map(([key, setting]) => {
                const type = setting.type;
                const value = settings[key];
                const label = setting.label ?? key;

                if (type === "justifyContent") {
                    return (
                        <AlignRow
                            key={key}
                            label={label}
                            value={value}
                            options={JUSTIFY_OPTIONS}
                            onSelect={(next) => writeSetting(key, next)}
                        />
                    );
                }

                if (type === "textAlign") {
                    return (
                        <AlignRow
                            key={key}
                            label={label}
                            value={value}
                            options={TEXT_ALIGN_OPTIONS}
                            onSelect={(next) => writeSetting(key, next)}
                        />
                    );
                }

                if (type === "color") {
                    return (
                        <ColorField
                            key={key}
                            label={label}
                            value={colorText(value)}
                            onCommit={(next) => {
                                writeSetting(key, next);
                                return { ok: true };
                            }}
                            onError={onError}
                        />
                    );
                }

                if (type === "text") {
                    return (
                        <SettingTextBox
                            key={key}
                            label={label}
                            value={value === undefined || value === null ? "" : String(value)}
                            onCommit={(next) => writeSetting(key, next)}
                        />
                    );
                }

                if (type === "number") {
                    /*
                     * A setting the document never wrote falls back to the **schema default**, and never to
                     * `Number(undefined)`. That coercion put the literal `NaN` in the field for a Gauge/Dial whose
                     * range was never saved; the widget template says min 0 / max 100 / ticks 10 / minorTicks 5 /
                     * thickness 30, and the engine's renderer draws the widget with exactly those numbers, so the
                     * panel has to show the same ones. The P3 dialog keeps its own `undefined`-means-unsaved rule
                     * for what it *writes back*, which this read-only fallback does not change.
                     */
                    const numberValue =
                        typeof value === "number" && Number.isFinite(value)
                            ? value
                            : typeof setting.value === "number"
                              ? setting.value
                              : undefined;
                    return (
                        <NumberField
                            key={key}
                            label={label}
                            value={numberValue}
                            onCommit={(next) => {
                                writeSetting(key, next);
                                return { ok: true };
                            }}
                            onError={onError}
                        />
                    );
                }

                if (type === "icon") {
                    return (
                        <IconSelectRow
                            key={key}
                            label={label}
                            value={value}
                            options={ICON_OPTIONS}
                            onSelect={(next) => writeSetting(key, next)}
                        />
                    );
                }

                if (type === "iconSwitch") {
                    return (
                        <IconSelectRow
                            key={key}
                            label={label}
                            value={value}
                            options={SWITCH_ICON_OPTIONS}
                            onSelect={(next) => writeSetting(key, next)}
                        />
                    );
                }

                if (type === "boolean") {
                    const disabled = lockedByEntry(key) || lockedByDecom;
                    return (
                        <div
                            key={key}
                            className={styles.row}
                            title={
                                lockedByEntry(key)
                                    ? "Manual changes are not possible as the linked entry is set to auto mode."
                                    : undefined
                            }
                        >
                            <span className={styles.label}>{label}</span>
                            <Checkbox
                                checked={!!value}
                                disabled={disabled}
                                label={value ? "On" : "Off"}
                                onChange={(_, data) => writeSetting(key, data.checked)}
                            />
                        </div>
                    );
                }

                return null;
            })}

            {schemaRows.length === 0 ? (
                <span className={styles.note}>This widget type has no extra settings.</span>
            ) : null}

            {isGauge ? (
                <GaugeSettingsDialog
                    open={gaugeOpen}
                    item={appItem.raw}
                    onClose={() => setGaugeOpen(false)}
                    onSave={(draft) => {
                        saveGauge(draft);
                        setGaugeOpen(false);
                    }}
                />
            ) : null}
        </Section>
    );
};

const ItemEditor: React.FC<{ item: HvacSelectionItem; onError: (message: string | undefined) => void }> = ({
    item,
    onError
}) => {
    const styles = useStyles();
    const isLine = !!item.start;
    const id = item.id;

    return (
        <>
            <DataSection onError={onError} />

            <Section title="Geometry" tag={isLine ? "Endpoints" : undefined} bodyStyle={LOOSE_BODY_GAP}>
                {isLine ? (
                    <>
                        <ReadRow
                            label="Start"
                            value={item.start && `${formatNumber(item.start.x)}, ${formatNumber(item.start.y)}`}
                        />
                        <ReadRow
                            label="End"
                            value={item.end && `${formatNumber(item.end.x)}, ${formatNumber(item.end.y)}`}
                        />
                        <NumberField
                            label="Rotation"
                            value={item.rotation}
                            unit="°"
                            onCommit={(v) => setRotation(id, v)}
                            onError={onError}
                        />
                        <span className={styles.note}>Line endpoints are edited by dragging.</span>
                    </>
                ) : (
                    <>
                        <NumberField label="X" value={item.frame?.x} unit="px" onCommit={(v) => setFramePart(id, "x", v)} onError={onError} />
                        <NumberField label="Y" value={item.frame?.y} unit="px" onCommit={(v) => setFramePart(id, "y", v)} onError={onError} />
                        <NumberField
                            label="Width"
                            value={item.frame?.width}
                            unit="px"
                            onCommit={(v) => setFramePart(id, "width", v)}
                            onError={onError}
                        />
                        <NumberField
                            label="Height"
                            value={item.frame?.height}
                            unit="px"
                            onCommit={(v) => setFramePart(id, "height", v)}
                            onError={onError}
                        />
                        <NumberField
                            label="Rotation"
                            value={item.rotation}
                            unit="°"
                            onCommit={(v) => setRotation(id, v)}
                            onError={onError}
                        />
                    </>
                )}
            </Section>

            <WidgetSection onError={onError} />

            <Section title="Appearance">
                <ColorField label="Fill" value={item.fillColor} onCommit={(v) => setFillColor(id, v)} onError={onError} />
                <SliderField
                    label="Fill opacity"
                    value={item.fillOpacity}
                    disabled={item.fillColor === undefined}
                    onCommit={(v) => setFillOpacity(id, v)}
                    onError={onError}
                />
                <ColorField label="Stroke" value={item.strokeColor} onCommit={(v) => setStrokeColor(id, v)} onError={onError} />
                <NumberField
                    label="Stroke width"
                    value={item.strokeWidth}
                    disabled={item.strokeColor === undefined}
                    digits={1}
                    unit="px"
                    onCommit={(v) => setStrokeWidth(id, v)}
                    onError={onError}
                />
                <ReadRow label="Line pattern" value={item.linePattern} />
                <ReadRow label="Text colour" value={item.textColor} />
                <ReadRow label="Font" value={item.fontName} />
                <ReadRow label="Font size" value={formatNumber(item.fontSize, 1)} />
            </Section>

            {item.text !== undefined ? (
                <Section title="Text">
                    <TextField value={item.text} onCommit={(v) => setObjectText(id, v)} onError={onError} />
                    <span className={styles.note}>Enter to apply · Esc to revert</span>
                </Section>
            ) : null}

            {/*
             * Read-only facts about the object, deliberately kept next to the engine dump: both are diagnostics,
             * while everything above is what you actually edit.
             */}
            <Section title="Identity" tag="Read only">
                <ReadRow label="Type" value={item.label} />
                <ReadRow label="Class" value={item.className} />
                <ReadRow label="Object id" value={id} />
                <ReadRow label="Unique id" value={item.uniqueId} />
                <ReadRow label="Layer" value={item.layer} />
                {(item.locked || item.hidden) && (
                    <div className={styles.badges}>
                        {item.locked ? (
                            <Badge appearance="tint" color="warning">
                                Locked
                            </Badge>
                        ) : null}
                        {item.hidden ? (
                            <Badge appearance="tint" color="informative">
                                Hidden
                            </Badge>
                        ) : null}
                    </div>
                )}
            </Section>

            <Section title="Raw (engine fields)" defaultOpen={false}>
                <pre className={styles.raw}>{JSON.stringify(item, null, 2)}</pre>
            </Section>
        </>
    );
};

/** An unexpected object class must never take the shell down. */
class PanelErrorBoundary extends React.Component<{ children: React.ReactNode }, { message?: string }> {
    state: { message?: string } = {};

    static getDerivedStateFromError(error: unknown) {
        return { message: error instanceof Error ? error.message : String(error) };
    }

    render() {
        if (this.state.message) {
            return (
                <div style={{ padding: 12, fontSize: 11, color: tokens.colorPaletteRedForeground1 }}>
                    Properties unavailable for this selection ({this.state.message})
                </div>
            );
        }
        return this.props.children;
    }
}

export const HvacPropertiesPanel: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
    const styles = useStyles();
    const selection = useHvacSelection(enabled);
    const [error, setError] = useState<string | undefined>(undefined);

    if (!enabled) {
        return (
            <div className={styles.loading}>
                <Spinner size="tiny" />
                <span>Waiting for the editor…</span>
            </div>
        );
    }

    if (selection.kind === "none") {
        return (
            <div className={styles.empty}>
                <span className={styles.emptyIcon}>
                    <CursorRegular fontSize={20} />
                </span>
                <span className={styles.emptyTitle}>No selection</span>
                <span className={styles.emptyHint}>
                    Select a shape on the canvas to inspect and edit its properties.
                </span>
            </div>
        );
    }

    const primary = selection.items[0];

    /* What the selection is made of, and where it disagrees with itself — a mixed value cannot be shown as
     * one number, so it is named instead of silently taken from the first object. */
    const byType = new Map<string, number>();
    selection.items.forEach((entry) => byType.set(entry.label ?? entry.className, (byType.get(entry.label ?? entry.className) ?? 0) + 1));
    const fillDiffers = new Set(selection.items.map((entry) => entry.fillColor ?? "")).size > 1;

    return (
        <PanelErrorBoundary>
            <div className={styles.root}>
                {selection.kind === "multi" ? (
                    <Section title="Selection" tag={`${selection.items.length} objects`}>
                        <div className={mergeClasses(styles.row)} style={{ alignItems: "start" }}>
                            <span className={styles.label} style={{ paddingTop: 4 }}>
                                Contains
                            </span>
                            <span className={styles.picks}>
                                {[...byType.entries()].map(([label, count]) => (
                                    <span key={label} className={styles.pick}>
                                        {count} × {label}
                                    </span>
                                ))}
                            </span>
                        </div>
                        {fillDiffers ? (
                            <div className={styles.row}>
                                <span className={styles.label}>Fill</span>
                                <span className={mergeClasses(styles.pick, styles.pickMixed)}>differs</span>
                            </div>
                        ) : null}
                        <span className={styles.note}>Only the first selected object is edited.</span>
                    </Section>
                ) : null}

                <ItemEditor item={primary} onError={setError} />

                <span className={styles.error}>{error ?? ""}</span>
                <span className={styles.note} style={{ padding: "0 8px 10px" }}>
                    Every edit is a single undo step (Ctrl+Z).
                </span>
            </div>
        </PanelErrorBoundary>
    );
};
