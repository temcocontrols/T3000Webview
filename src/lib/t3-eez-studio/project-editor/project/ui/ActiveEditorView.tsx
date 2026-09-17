/**
 * EEZ project editor — the active editor, on its own.
 *
 * `ProjectEditor.factory` resolves the `component === "editor"` tab through
 * `getEditorComponent(editor.object, editor.params)` and renders the resulting component. In hosted
 * mode (the Designer shell) there is no FlexLayout tab to ask for, and the shell keeps the canvas for
 * exactly this view — so the resolution lives here and both callers use it.
 *
 * `observer` matters: the editor changes when the user picks a page in the (shell-rendered) tree, and
 * that happens through `editorsStore.openEditor`.
 */
import React from "react";
import { observer } from "mobx-react";

import { ProjectContext } from "project-editor/project/context";
import { getEditorComponent } from "project-editor/project/ui/EditorComponentFactory";

export const ActiveEditorView = observer(
    class ActiveEditorView extends React.Component {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        render() {
            const editor = this.context.editorsStore.activeEditor;
            if (!editor) {
                return null;
            }

            const result = getEditorComponent(editor.object, editor.params);
            if (!result) {
                return null;
            }

            return <result.EditorComponent editor={editor} />;
        }
    }
);
