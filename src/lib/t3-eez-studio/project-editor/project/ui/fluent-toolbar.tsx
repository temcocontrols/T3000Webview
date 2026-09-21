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
    "Show front face": "Front",
    "Show back face": "Back",
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
    icon,
    onClick,
    enabled = true,
    selected = false,
    style,
}) => {
    const resolved = resolveIcon(icon);
    const label = shortLabelOf(title);

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
            style={{ padding: "2px 8px", minHeight: "26px", fontWeight: 400, fontSize: "13px" }}
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
