/**
 * EEZ panel registry — one place that maps a FlexLayout `component` name to the React node that renders it.
 *
 * WHY THIS FILE EXISTS
 *
 * `ProjectEditor.factory` used to be the only place with that mapping. The unified Designer shell
 * (P2.3+) has to render the **same** panels, but inside its own regions instead of FlexLayout tabs, so
 * the mapping was moved here and both callers use it. Without this, the two renderers would drift
 * silently: a panel added to the tab layout would simply be missing from the shell.
 *
 * The signature is deliberately FlexLayout-free: the shell has no `TabNode` to hand over. The one
 * branch that genuinely needs the node — `"editor"` — is expressed as a callback, and the *tab*
 * listeners that branch used to register (`visibility` / `close`) stay with the caller, because only a
 * rendered FlexLayout tab can emit them.
 *
 * Behaviour is byte-for-byte the same mapping as before the extraction; see the `designer` phase docs
 * (`docs/t3000/architecture/designer/phases/p2-lvgl-document.md` §P2.0).
 */
import React from "react";

import { Messages } from "project-editor/ui-components/Output";
import { ProjectContext } from "project-editor/project/context";
import { Section } from "project-editor/store";
import { PropertiesPanel } from "./PropertiesPanel";
import { ComponentsPalette } from "project-editor/flow/editor/ComponentsPalette";
import { BreakpointsPanel } from "project-editor/flow/debugger/BreakpointsPanel";
import { ThemesSideView } from "project-editor/features/style/theme";
import { QueuePanel } from "project-editor/flow/debugger/QueuePanel";
import { WatchPanel } from "project-editor/flow/debugger/WatchPanel";
import { ActiveFlowsPanel } from "project-editor/flow/debugger/ActiveFlowsPanel";
import { LogsPanel } from "project-editor/flow/debugger/LogsPanel";
import { ListNavigation } from "project-editor/ui-components/ListNavigation";
import { VariablesTab } from "project-editor/features/variable/VariablesNavigation";
import { StylesTab } from "project-editor/features/style/StylesNavigation";
import { FontsTab } from "project-editor/features/font/FontsNavigation";
import { BitmapsTab } from "project-editor/features/bitmap/BitmapsNavigation";
import { TextsTab } from "project-editor/features/texts/navigation";
import { ScpiTab } from "project-editor/features/scpi/ScpiNavigation";
import { InstrumentCommandsList } from "project-editor/features/instrument-commands/InstrumentCommandsNavigation";
import { ExtensionDefinitionsTab } from "project-editor/features/extension-definitions/extension-definitions";
import { ChangesTab } from "project-editor/features/changes/navigation";
import { SearchPanel } from "project-editor/project/ui/SearchPanel";
import { ReferencesPanel } from "project-editor/project/ui/ReferencesPanel";
import { LVGLGroupsTab } from "project-editor/lvgl/groups";
import { DockerSimulatorPreviewPanel } from "project-editor/lvgl/docker-build/DockerSimulatorPreviewPanel";
import { DockerSimulatorLogsPanel } from "project-editor/lvgl/docker-build/DockerSimulatorLogsPanel";
import { PreviewLogsPanel } from "project-editor/lvgl/docker-build/PreviewLogsPanel";
import { PageStructure } from "project-editor/features/page/PagesNavigation";

/** Everything a panel needs from the project context (same type `ProjectEditor` receives). */
export type PanelRegistryContext = React.ContextType<typeof ProjectContext>;

/**
 * Renders the panel registered for `component`.
 *
 * @param component   the FlexLayout tab's `component` name (or a name the shell projects itself)
 * @param ctx         the project context (`useContext(ProjectContext)` for function components)
 * @param editorPanel renders the `"editor"` branch, which needs the tab id to find its `Editor`
 * @param tabId       the FlexLayout tab id, passed through to `editorPanel`
 * @returns the panel, or `null` for a name nothing is registered for
 */
export function getPanelComponent(
    component: string | undefined,
    ctx: PanelRegistryContext,
    editorPanel?: (tabId: string) => React.ReactNode,
    tabId?: string
): React.ReactNode {
    if (component === "pages") {
        return (
            <ListNavigation
                id="pages"
                navigationObject={ctx.project.userPages}
                selectedObject={ctx.navigationStore.selectedUserPageObject}
                editable={!ctx.runtime}
            />
        );
    }

    if (component === "widgets") {
        return (
            <ListNavigation
                id="widgets"
                navigationObject={ctx.project.userWidgets}
                selectedObject={ctx.navigationStore.selectedUserWidgetObject}
                editable={!ctx.runtime}
            />
        );
    }

    if (component === "actions") {
        return (
            <ListNavigation
                id="actions"
                navigationObject={ctx.project.actions}
                selectedObject={ctx.navigationStore.selectedActionObject}
                editable={!ctx.runtime}
            />
        );
    }

    if (component === "flow-structure") {
        return <PageStructure />;
    }

    if (component === "variables") {
        return <VariablesTab />;
    }

    if (component === "styles") {
        return <StylesTab />;
    }

    if (component === "fonts") {
        return <FontsTab />;
    }

    if (component === "bitmaps") {
        return <BitmapsTab />;
    }

    if (component === "changes") {
        return <ChangesTab />;
    }

    if (component === "texts") {
        return <TextsTab />;
    }

    if (component === "scpi") {
        return <ScpiTab />;
    }

    if (component === "instrument-commands") {
        return <InstrumentCommandsList />;
    }

    if (component === "extension-definitions") {
        return <ExtensionDefinitionsTab />;
    }

    if (ctx.runtime) {
        if (component === "queue") {
            return <QueuePanel runtime={ctx.runtime} />;
        }

        if (component === "watch") {
            return <WatchPanel runtime={ctx.runtime} />;
        }

        if (component === "active-flows") {
            return <ActiveFlowsPanel runtime={ctx.runtime} />;
        }

        if (component === "logs") {
            return <LogsPanel runtime={ctx.runtime} />;
        }
    }

    if (component === "propertiesPanel") {
        return <PropertiesPanel />;
    }

    if (component === "componentsPalette") {
        return <ComponentsPalette />;
    }

    if (component === "breakpointsPanel") {
        return <BreakpointsPanel />;
    }

    if (component === "themesSideView") {
        return <ThemesSideView />;
    }

    if (component === "checksMessages") {
        return <Messages section={ctx.outputSectionsStore.getSection(Section.CHECKS)} />;
    }

    if (component === "outputMessages") {
        return <Messages section={ctx.outputSectionsStore.getSection(Section.OUTPUT)} />;
    }

    if (component === "search") {
        return <SearchPanel />;
    }

    if (component === "references") {
        return <ReferencesPanel />;
    }

    if (component === "editor") {
        return editorPanel ? editorPanel(tabId ?? "") : null;
    }

    if (component === "lvgl-groups") {
        return <LVGLGroupsTab />;
    }

    if (component === "dockerSimulatorPreview") {
        return <DockerSimulatorPreviewPanel />;
    }

    if (component === "dockerSimulatorLogs") {
        return <DockerSimulatorLogsPanel />;
    }

    if (component === "dockerSimulatorPreviewLogs") {
        return <PreviewLogsPanel />;
    }

    return null;
}
