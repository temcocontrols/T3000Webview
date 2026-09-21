/**
 * Designer — the shell's status bar.
 *
 * Reuses the app-wide `EditorStatusBar` (`features/design-hub/components/EditorStatusBar.tsx`), which
 * already renders `name | coords | zoom% | Saved/Unsaved | message` and listens to the shared
 * `t3-editor-status` window event, and appends the shell's own items.
 *
 * The collapse chevron for the bottom dock lives here too, because the dock has no room for it.
 */
import React from "react";
import { makeStyles, tokens } from "@fluentui/react-components";
import { EditorStatusBar } from "../../design-hub/components/EditorStatusBar";

const useStyles = makeStyles({
    root: {
        display: "flex",
        alignItems: "stretch",
        flexShrink: 0,
        backgroundColor: tokens.colorNeutralBackground1
    },
    primary: {
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column"
    },
    extra: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "0 12px",
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground2,
        borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
        whiteSpace: "nowrap"
    }
});

export interface ShellStatusBarProps {
    name?: string;
    coords?: string;
    message?: string;
    /** Shell-level chips (document kind, error/warning counts…). */
    extra?: React.ReactNode;
}

export const ShellStatusBar: React.FC<ShellStatusBarProps> = ({ name, coords, message, extra }) => {
    const styles = useStyles();

    return (
        <div className={styles.root}>
            <div className={styles.primary}>
                <EditorStatusBar name={name} coords={coords} message={message} />
            </div>
            {extra ? <div className={styles.extra}>{extra}</div> : null}
        </div>
    );
};
