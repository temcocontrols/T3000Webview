/**
 * EEZ project editor — the canvas **tab strip**: one chip per open editor.
 *
 * The origin's canvas is a FlexLayout *tabset*, so flexlayout drew a tab bar at the top of the middle area:
 * a chip per open editor (page, flow, style …) with its icon, its title and a close button, the selected one
 * highlighted. Hosted, the shell draws the canvas from `ActiveEditorView` — the *active* editor only — so
 * nothing drew that bar: there was no way to see what is open, switch between editors, or close one.
 *
 * The data is the store's (`editorsStore.editors` / `activeEditor`), which is what `refresh()` maintains and
 * what `openEditor` selects in the model — the selection the shell follows in host mode
 * (`store/editor.ts:376`). Activating a chip is therefore `Editor.makeActive()` **plus a `refresh`**: see
 * `activateEditor` below. Closing a chip is `closeEditor()`.
 *
 * ## Why the click has to refresh
 *
 * `Editor.makeActive()` → `EditorsStore.activateEditor()` only does the flexlayout model action
 * (`Actions.selectTab`) — it never writes `activeEditor`. In the origin that was enough, because the model
 * action re-rendered flexlayout, the tab became *visible*, and the tab node's own `visibility` listener ran
 * `refresh(true)` (`ProjectEditor.tsx:119-127`). Hosted there is no FlexLayout, so no listener ever fires: the
 * model selection moved while `activeEditor` stayed put — the canvas kept showing the *previous* editor.
 * (`refresh`'s own host block, `store/editor.ts:361-376`, is the other half of this: it reads the selection
 * the shell has no other way to observe.)
 *
 * `refresh(true)` is the visibility listener's own argument, so a chip click behaves exactly like clicking a
 * flexlayout tab did — including `navigationStore.showObjects`, which highlights the object in the left tree.
 *
 * Permanent editors (`Editor.permanent`, e.g. the project's flow) have no close button, exactly as they had
 * none in flexlayout (`tabEnableClose` aside, EEZ marks them permanent).
 */
import React from "react";
import { observer } from "mobx-react";
import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { DismissRegular } from "@fluentui/react-icons";

import { ProjectContext } from "project-editor/project/context";
import { getObjectIcon } from "project-editor/store";
import { Icon } from "project-editor/project/ui/fluent-toolbar";

/** The strip's height — the region heads' 32 px, so the middle area's chrome lines up with theirs. */
const STRIP_HEIGHT = 32;

const useStyles = makeStyles({
    root: {
        display: "flex",
        alignItems: "stretch",
        height: `${STRIP_HEIGHT}px`,
        flexShrink: 0,
        minWidth: 0,
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "thin",
        backgroundColor: tokens.colorNeutralBackground2,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        paddingLeft: "4px"
    },
    chip: {
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        gap: "2px",
        paddingRight: "4px",
        color: tokens.colorNeutralForeground2,
        ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover }
    },
    /** The selected editor: the white slab + brand underline the region heads use for their active tab. */
    chipActive: {
        backgroundColor: tokens.colorNeutralBackground1,
        color: tokens.colorNeutralForeground1,
        boxShadow: `inset 0 -2px 0 ${tokens.colorBrandForeground1}`,
        ":hover": { backgroundColor: tokens.colorNeutralBackground1 }
    },
    open: {
        display: "flex",
        alignItems: "center",
        gap: "5px",
        height: "100%",
        maxWidth: "220px",
        padding: "0 2px 0 8px",
        border: "none",
        background: "transparent",
        color: "inherit",
        font: "inherit",
        fontSize: tokens.fontSizeBase200,
        whiteSpace: "nowrap",
        cursor: "pointer"
    },
    label: {
        overflow: "hidden",
        textOverflow: "ellipsis"
    },
    close: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        width: "18px",
        height: "18px",
        border: "none",
        borderRadius: "3px",
        background: "transparent",
        color: tokens.colorNeutralForeground3,
        cursor: "pointer",
        ":hover": {
            backgroundColor: tokens.colorNeutralBackground1Pressed,
            color: tokens.colorNeutralForeground1
        }
    }
});

export const EditorTabsView: React.FC = observer(() => {
    const projectStore = React.useContext(ProjectContext);
    const styles = useStyles();

    const editorsStore = projectStore?.editorsStore;
    const editors = editorsStore?.editors;

    if (!editors || editors.length === 0) {
        /* Nothing open ⇒ no strip at all, so the canvas keeps the whole area (Run, Full Sim). */
        return null;
    }

    return (
        <div className={styles.root} data-eez-editor-tabs="true">
            {editors.map((editor) => {
                const active = editor === editorsStore!.activeEditor;
                const icon = getObjectIcon(editor.object);

                return (
                    <div
                        key={editor.tabId ?? editor.title}
                        className={active ? mergeClasses(styles.chip, styles.chipActive) : styles.chip}
                    >
                        <button
                            type="button"
                            className={styles.open}
                            title={editor.title}
                            onClick={() => {
                                editor.makeActive();
                                /*
                                 * Host mode has no flexlayout `visibility` listener to do this for us
                                 * (see the header comment), so the canvas would keep the old editor.
                                 */
                                editorsStore!.refresh(true);
                            }}
                        >
                            {icon ? <Icon icon={icon} size={16} /> : null}
                            <span className={styles.label}>{editor.title}</span>
                        </button>

                        {!editor.permanent ? (
                            <button
                                type="button"
                                className={styles.close}
                                aria-label={`Close ${editor.title}`}
                                title={`Close ${editor.title}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    editorsStore!.closeEditor(editor);
                                }}
                            >
                                <DismissRegular style={{ fontSize: 12 }} />
                            </button>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
});
