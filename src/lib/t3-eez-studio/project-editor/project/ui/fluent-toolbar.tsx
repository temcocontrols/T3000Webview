/**
 * Fluent UI wrapper replacing eez-studio-ui's IconAction and ButtonAction
 * for the project editor toolbar. Same props API, Fluent rendering.
 */
import React from "react";
import { Button, mergeClasses, makeStyles, tokens } from "@fluentui/react-components";
import {
    SaveRegular,
    ArrowUndoRegular,
    ArrowRedoRegular,
    CutRegular,
    CopyRegular,
    ClipboardPasteRegular,
    CheckmarkRegular,
    WrenchRegular,
    CommentRegular,
    EditRegular,
    DesktopRegular,
    ArrowDownloadRegular,
    CheckboxCheckedRegular,
    CheckboxUncheckedRegular,
    ChevronLeftRegular,
    ChevronRightRegular,
    SettingsRegular,
    CodeRegular,
    BookOpenRegular,
    ImageRegular,
    FontIncreaseRegular,
    ColorFillRegular,
    AppGenericRegular,
    DocumentBulletListRegular,
    ZoomInRegular,
    ZoomOutRegular,
} from "@fluentui/react-icons";

// ── material icon name → Fluent icon component ───────────────────────

const MATERIAL_TO_FLUENT: Record<string, React.ReactElement> = {
    "material:save": <SaveRegular />,
    "material:undo": <ArrowUndoRegular />,
    "material:redo": <ArrowRedoRegular />,
    "material:content_cut": <CutRegular />,
    "material:content_copy": <CopyRegular />,
    "material:content_paste": <ClipboardPasteRegular />,
    "material:check": <CheckmarkRegular />,
    "material:build": <WrenchRegular />,
    "material:comment": <CommentRegular />,
    "material:mode_edit": <EditRegular />,
    "material:computer": <DesktopRegular />,
    "material:file_download": <ArrowDownloadRegular />,
    "material:check_box": <CheckboxCheckedRegular />,
    "material:check_box_outline_blank": <CheckboxUncheckedRegular />,
    "material:flip_to_front": (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2 -2V7a2 2 0 0 0 -2 -2H5a2 2 0 0 0 -2 2z"/>
            <path d="M9 12l2 2l4 -4"/>
        </svg>
    ),
    "material:flip_to_back": (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2 -2V7a2 2 0 0 0 -2 -2H5a2 2 0 0 0 -2 2z"/>
        </svg>
    ),
    "material:navigate_before": <ChevronLeftRegular />,
    "material:navigate_next": <ChevronRightRegular />,
    "material:settings": <SettingsRegular />,
    "material:code": <CodeRegular />,
    "material:book_open": <BookOpenRegular />,
    "material:image": <ImageRegular />,
    "material:font_download": <FontIncreaseRegular />,
    "material:format_color_fill": <ColorFillRegular />,
    "material:extension": <AppGenericRegular />,
    "material:playlist_play": <DocumentBulletListRegular />,
    "material:zoom_in": <ZoomInRegular />,
    "material:zoom_out": <ZoomOutRegular />,
};

function resolveIcon(icon: string | React.ReactNode, size?: number): React.ReactElement | undefined {
    if (typeof icon === "string") {
        const fluent = MATERIAL_TO_FLUENT[icon];
        if (fluent) return fluent;
        // Fallback: return nothing, caller will handle
        return undefined;
    }
    if (React.isValidElement(icon)) {
        return icon as React.ReactElement;
    }
    return undefined;
}

// ── short labels ─────────────────────────────────────────────────────

/**
 * A tool's **visible** label, from the tooltip it already has.
 *
 * The designer's top band draws `icon + label` for every item (`ShellToolItems.tsx`), the way the legacy
 * HVAC strip does — a row of bare icons is not readable. EEZ's toolbar was built icon-only (the `title`
 * is the tooltip), so the label is derived from it here rather than at ~20 call sites: the map below holds
 * the short forms, and anything unmapped falls back to its first meaningful word.
 *
 * The tooltip is untouched: the label is a *short* name, the title stays the full sentence.
 */
const SHORT_LABELS: Record<string, string> = {
    "Save": "Save",
    "Save As": "Save as",
    "Save as": "Save as",
    "Undo": "Undo",
    "Redo": "Redo",
    "Cut": "Cut",
    "Copy": "Copy",
    "Paste": "Paste",
    "Delete": "Delete",
    "Duplicate": "Duplicate",
    "Scrapbook": "Scrapbook",
    "Configuration": "Settings",
    "Check": "Check",
    "Build": "Build",
    "Run MicroPython Script": "Script",
    /*
     * The face pair keeps the **noun**: "Front"/"Back" alone reads as navigation ("back"), and the two
     * buttons are a view state — which side of the page is shown (mirrored, with the wiring/anchors overlay
     * on the back) — not two commands. See `PageTabState.frontFace` / `uiStateStore.pageEditorFrontFace`.
     */
    "Show front face": "Front face",
    "Show back face": "Back face",
    "Show timeline": "Timeline",
    "Show component descriptions": "Descriptions"
};

export function shortLabelOf(title: string | undefined): string | undefined {
    if (!title) {
        return undefined;
    }

    const mapped = SHORT_LABELS[title];
    if (mapped) {
        return mapped;
    }

    // Fallback: drop the verb the icon already implies and the parenthetical shortcut, then keep one word.
    const stripped = title.replace(/\s*\([^)]*\)\s*$/, "").replace(/^(Show|Toggle|Run|Enter|Open|New|Add)\s+/i, "");
    const word = stripped.split(/[\s/:]+/)[0];
    if (word.length < 2) {
        return undefined;
    }

    return word.length > 12 ? `${word.slice(0, 11)}…` : word;
}

// ── density (the designer band) ──────────────────────────────────────

/**
 * Whether the buttons below are drawn inside the designer shell's **60 px band**.
 *
 * The band shares its width with the document's own mode cluster (Edit · Run · Debug · Full Sim · Deploy),
 * and the zone the tool row lives in is `overflow: hidden` — so every pixel the row does not need is a
 * pixel the row's last button (*Settings*) stops being clipped by. The band already draws one line of
 * 26 px controls, so the tight form keeps the label and the height and takes the *horizontal* slack only:
 * 4 px of side padding instead of 6, 4 px between a glyph and its label instead of 8, and a 24 px floor
 * instead of 28 for the glyph-only buttons (undo/redo/zoom).
 *
 * Measured on the leading row (Save · undo/redo · Copy · Paste · zoom · Check · Build · Front/Back face ·
 * Timeline · Descriptions · Settings) at a 1400 px pane: 1046 px → 980 px, against the 982 px the tools
 * zone can give — which is what makes the single-row mode cluster fit without clipping *Settings*.
 */
export const ToolbarDensityContext = React.createContext(false);

/** The band's button metrics — see `ToolbarDensityContext`. */
const DENSE_ACTION_STYLE: React.CSSProperties = {
    padding: "2px 4px",
    columnGap: "4px",
    minWidth: "24px"
};

// ── Styles ───────────────────────────────────────────────────────────

const useStyles = makeStyles({
    btnGroup: {
        display: "flex",
        gap: "4px",
        "& .fluent-toolbar-btn": {
            // Labels are the point (`shortLabelOf`), so the button grows with its text — only the height is
            // pinned, to the band's 28 px item row.
            minWidth: "28px",
            height: "28px",
            padding: "2px 6px",
            borderRadius: tokens.borderRadiusSmall,
            whiteSpace: "nowrap",
            fontSize: "12px"
        },
    },
});

// ── IconAction replacement ───────────────────────────────────────────

interface IconActionProps {
    title?: string;
    /**
     * The visible label, when the tooltip is not a good *name* for the button.
     *
     * Defaults to `shortLabelOf(title)` — the map plus its first-word fallback. Set it when the tooltip is a
     * full explanation (`"Show the comment text written on flow components…"`), so the label stays short and
     * the hover text can actually explain what the tool does.
     */
    label?: string;
    icon: string | React.ReactNode;
    iconSize?: number;
    onClick: (event: React.MouseEvent) => void;
    enabled?: boolean;
    selected?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

export const IconAction: React.FC<IconActionProps> = ({
    title,
    label: labelProp,
    icon,
    onClick,
    enabled = true,
    selected = false,
    style,
}) => {
    const resolved = resolveIcon(icon);
    const label = labelProp ?? shortLabelOf(title);
    const dense = React.useContext(ToolbarDensityContext);

    return (
        <Button
            className="fluent-toolbar-btn"
            appearance={selected ? "primary" : "subtle"}
            icon={resolved}
            title={title}
            onClick={onClick}
            disabled={!enabled}
            size="small"
            style={{
                padding: "2px 6px",
                minHeight: "26px",
                fontWeight: 400,
                fontSize: "12px",
                whiteSpace: "nowrap",
                ...(dense ? DENSE_ACTION_STYLE : null),
                ...style
            }}
        >
            {label}
        </Button>
    );
};

// ── ButtonAction replacement ─────────────────────────────────────────

interface ButtonActionProps {
    text: string;
    title?: string;
    icon?: React.ReactNode;
    iconSize?: number;
    onClick: () => void;
    enabled?: boolean;
    selected?: boolean;
    attention?: boolean;
    loader?: boolean;
    className?: string;
    /**
     * Extra styling for this one button.
     *
     * The band's **single-row** mode cluster needs it: five labelled buttons at the default `2px 8px` /
     * 13 px / 20 px icon measure ~395 px together, which leaves the document's toolbar clipped
     * (`ShellTopBar.styles.tools` is `overflow: hidden`) — the compact form drops that to ~285 px.
     */
    style?: React.CSSProperties;
}

export const ButtonAction: React.FC<ButtonActionProps> = ({
    text,
    title,
    icon,
    iconSize,
    onClick,
    enabled = true,
    selected = false,
    attention = false,
    loader = false,
    style
}) => {
    const resolvedIcon = icon
        ? typeof icon === "string"
            ? resolveIcon(icon, iconSize) ?? undefined
            : (React.isValidElement(icon) ? icon as React.ReactElement : undefined)
        : undefined;

    const iconEl = resolvedIcon
        ? React.cloneElement(resolvedIcon, {
              style: { fontSize: iconSize ?? 20, ...(resolvedIcon.props as any).style }
          } as any)
        : undefined;

    let appearance: "primary" | "subtle" | "outline" = "subtle";
    if (selected) {
        appearance = "primary";
    } else if (attention) {
        appearance = "outline";
    }

    return (
        <Button
            appearance={appearance}
            icon={iconEl}
            title={title}
            onClick={onClick}
            disabled={!enabled}
            disabledFocusable={loader}
            size="small"
            style={{ padding: "2px 8px", minHeight: "26px", fontWeight: 400, fontSize: "13px", ...style }}
        >
            {loader ? (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span className="spinner-border spinner-border-sm" role="status" style={{ width: "12px", height: "12px" }} />
                    {text}
                </span>
            ) : (
                text
            )}
        </Button>
    );
};

// ── Icon replacement (for inline icons) ──────────────────────────────

interface IconProps {
    icon: string | React.ReactNode;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({ icon, size, style }) => {
    const resolved = resolveIcon(icon);
    if (!resolved) return null;
    return React.cloneElement(resolved, { style: { fontSize: size, ...style } } as any);
};

// ── Button group wrapper ─────────────────────────────────────────────

export const ButtonGroup: React.FC<{ children: React.ReactNode; role?: string }> = ({ children }) => {
    const styles = useStyles();
    return <div className={styles.btnGroup}>{children}</div>;
};

// ── Segmented action ─────────────────────────────────────────────────

/**
 * One control for a **state with mutually exclusive choices** — the page's *front face* / *back face*.
 *
 * Drawn as the two buttons it replaces, with two differences: the box is one control, so it reads as a
 * choice rather than two commands ("Back" beside "Front" otherwise reads as navigation), and the **active**
 * segment carries the brand colour, so the current side is visible without hovering.
 *
 * The chrome is a **bottom line on the chosen segment only** (user decision 2026-09-21): no box, no track,
 * no fill — the unselected choice is plain text, and the current one carries a 2 px brand line under it, the
 * region heads' active-tab treatment. The line is a *transparent* 2 px border on every segment rather than
 * only on the selected one, which keeps the two content boxes identical and stops the row shifting when the
 * choice changes.
 */
export interface SegmentSpec {
    id: string;
    label: string;
    icon?: string | React.ReactNode;
    selected: boolean;
    title?: string;
    onClick: () => void;
}

const useSegmentStyles = makeStyles({
    box: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "2px",
        flexShrink: 0
    },
    segment: {
        display: "flex",
        alignItems: "center",
        gap: "5px",
        height: "26px",
        padding: "0 10px",
        border: "none",
        borderRadius: 0,
        background: "transparent",
        color: tokens.colorNeutralForeground2,
        font: "inherit",
        fontSize: "12px",
        whiteSpace: "nowrap",
        cursor: "pointer",
        /** Painted only by `segmentSelected`; transparent here so both choices keep the same content box. */
        borderBottom: "2px solid transparent",
        ":hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
            color: tokens.colorNeutralForeground1
        }
    },
    /** The chosen one: brand text on a 2 px brand line. Nothing at all for the other. */
    segmentSelected: {
        color: tokens.colorBrandForeground2,
        fontWeight: tokens.fontWeightSemibold,
        borderBottom: `2px solid ${tokens.colorBrandForeground1}`,
        ":hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
            color: tokens.colorBrandForeground2
        }
    },
    /** The band's tighter segment — `ToolbarDensityContext`. */
    segmentDense: {
        padding: "0 7px",
        gap: "4px"
    }
});

export const SegmentedAction: React.FC<{ segments: SegmentSpec[] }> = ({ segments }) => {
    const styles = useSegmentStyles();
    const dense = React.useContext(ToolbarDensityContext);

    return (
        <div className={styles.box} role="radiogroup">
            {segments.map(segment => (
                <button
                    key={segment.id}
                    type="button"
                    role="radio"
                    aria-checked={segment.selected}
                    title={segment.title}
                    className={mergeClasses(
                        styles.segment,
                        dense && styles.segmentDense,
                        segment.selected && styles.segmentSelected
                    )}
                    onClick={segment.onClick}
                >
                    {segment.icon ? <Icon icon={segment.icon} size={16} /> : null}
                    {segment.label}
                </button>
            ))}
        </div>
    );
};
