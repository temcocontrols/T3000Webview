/**
 * EEZ project editor — the active editor, on its own.
 *
 * `ProjectEditor.factory` resolves the `component === "editor"` tab through
 * `getEditorComponent(editor.object, editor.params)` and renders the resulting component. In hosted
 * mode (the Designer shell) there is no FlexLayout tab to ask for, and the shell keeps the canvas for
 * exactly this view — so the resolution lives here and both callers use it.
 *
 * **The canvas is not always an editor**: the full-simulator root model puts the *Preview* there
 * (`rootDockerSimulator`, `store/layout-models.tsx`), and that tab is a **panel**, not an editor. EEZ's own
 * un-hosted path drew it through the FlexLayout factory; hosted, nobody would — the shell keeps the canvas
 * for this view and draws the side panels itself, so the preview has to be resolved here as well. The
 * lookup is by tab **id** (`LayoutModels.DOCKER_SIMULATOR_PREVIEW_TAB_ID`), not by name or position, so it
 * cannot be confused with an editor tabset.
 *
 * `observer` matters: the editor changes when the user picks a page in the (shell-rendered) tree, and
 * that happens through `editorsStore.openEditor`; the mode changes through `layoutModels.root`.
 */
import React from "react";
import { observer } from "mobx-react";
import * as FlexLayout from "flexlayout-react";

import { ProjectContext } from "project-editor/project/context";
import { getEditorComponent } from "project-editor/project/ui/EditorComponentFactory";
import { getPanelComponent } from "project-editor/project/ui/panelRegistry";
import { LayoutModels } from "project-editor/store/layout-models";

/** The panel the full-simulator model shows in the canvas, or null in every other mode. */
function canvasPanel(context: React.ContextType<typeof ProjectContext>) {
    if (!context.layoutModels?.isDockerSimulatorMode) {
        return null;
    }

    const tab = context.layoutModels.root?.getNodeById(LayoutModels.DOCKER_SIMULATOR_PREVIEW_TAB_ID);
    if (!(tab instanceof FlexLayout.TabNode)) {
        return null;
    }

    return getPanelComponent(String(tab.getComponent() ?? ""), context) ?? null;
}

export const ActiveEditorView = observer(
    class ActiveEditorView extends React.Component {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        render() {
            const panel = canvasPanel(this.context);
            if (panel) {
                return panel;
            }

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
