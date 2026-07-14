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

// ── Styles ───────────────────────────────────────────────────────────

const useStyles = makeStyles({
    btnGroup: {
        display: "flex",
        gap: "4px",
        "& .fluent-toolbar-btn": {
            minWidth: "28px",
            height: "28px",
            padding: "2px",
            borderRadius: tokens.borderRadiusSmall,
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

    return (
        <Button
            className="fluent-toolbar-btn"
            appearance={selected ? "primary" : "subtle"}
            icon={resolved}
            title={title}
            onClick={onClick}
            disabled={!enabled}
            size="small"
            style={style}
        />
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
