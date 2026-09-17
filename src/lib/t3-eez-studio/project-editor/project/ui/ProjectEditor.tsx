import React from "react";
import { observer } from "mobx-react";
import * as FlexLayout from "flexlayout-react";
import { Menu, MenuItem } from "@electron/remote";
import classNames from "classnames";
import { action, computed, makeObservable, runInAction } from "mobx";

import { Toolbar } from "project-editor/project/ui/Toolbar";
import { Icon } from "eez-studio-ui/icon";
import { Loader } from "eez-studio-ui/loader";
import { Button } from "eez-studio-ui/button";
import { IExtension } from "eez-studio-shared/extensions/extension";
import * as notification from "eez-studio-ui/notification";
import { FlexLayoutContainer } from "eez-studio-ui/FlexLayout";

import {
    PageEditor,
    PageTabState
} from "project-editor/features/page/PageEditor";
import { ProjectContext } from "project-editor/project/context";
import { Editor, LayoutModels, Section } from "project-editor/store";
import { getPanelComponent } from "./panelRegistry";
import { ActiveEditorView } from "./ActiveEditorView";
import { isProjectEditorHosted } from "project-editor/hostMode";
import { publishActiveProject } from "project-editor/activeProject";
import { getEditorComponent } from "project-editor/project/ui/EditorComponentFactory";
import {
    downloadAndInstallExtension,
    extensionsManagerStore
} from "home/extensions-manager/extensions-manager";
import { settingsController } from "home/settings";

////////////////////////////////////////////////////////////////////////////////

export const ProjectEditorView = observer(
    class ProjectEditorView extends React.Component<{
        showToolbar: boolean;
    }> {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        render() {
            if (!this.context.project || !this.context.project._fullyLoaded) {
                return <div className="EezStudio_ProjectEditorWrapper" />;
            }

            if (
                this.context.project.missingExtensions.length > 0 &&
                !this.context.missingExtensionsResolved
            ) {
                return <MissingExtensions />;
            }

            if (
                this.context.context.type != "project-editor" &&
                !this.context.runtime
            ) {
                return <div className="EezStudio_ProjectEditorWrapper" />;
            }

            return (
                <div className="EezStudio_ProjectEditorWrapper">
                    <div className="EezStudio_ProjectEditor_MainContentWrapper">
                        {/*
                         * Hosted by the Designer shell: the shell renders the toolbar in its own top
                         * bar (P2.6), so drawing it here as well would duplicate every button.
                         */}
                        {/*
                         * Hosted by the Designer shell: the shell renders the toolbar in its own top
                         * bar (P2.6), so drawing it here as well would duplicate every button.
                         */}
                        {!isProjectEditorHosted() && this.props.showToolbar && (
                            <Toolbar />
                        )}
                        <Content />
                    </div>
                </div>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

const Content = observer(
    class Content extends React.Component {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        _prevPageTabState: PageTabState | undefined;

        componentDidMount(): void {
            // Published for the Designer shell, which renders this project's panels in its own regions
            // (it is a different React root and cannot receive the context as a prop).
            publishActiveProject(this.context);

            this.context.editorsStore?.openInitialEditors();
            this.context.editorsStore?.refresh(true);
        }

        componentWillUnmount(): void {
            publishActiveProject(undefined);
        }

        /**
         * The tab layout's panel mapping now lives in `./panelRegistry` so the unified Designer shell
         * can render the same panels outside FlexLayout (P2.3+). Only the `"editor"` branch stays
         * here: it needs the tab node (to find its `Editor` and to register the tab's own
         * `visibility` / `close` listeners), which a shell-projected panel has no equivalent of.
         */
        factory = (node: FlexLayout.TabNode) => {
            const component = node.getComponent();

            return getPanelComponent(
                component,
                this.context,
                (tabId) => {
                    const editor =
                        this.context.editorsStore.tabIdToEditorMap.get(tabId);

                    node.setEventListener("visibility", (p: any) => {
                        this.context.editorsStore.refresh(true);
                    });

                    node.setEventListener("close", (p: any) => {
                        this.context.editorsStore.refresh(true);
                    });

                    if (editor) {
                        let result = getEditorComponent(
                            editor.object,
                            editor.params
                        );
                        if (result) {
                            return <result.EditorComponent editor={editor} />;
                        }
                    }

                    return null;
                },
                node.getId()
            );
        };

        onRenderTab = (
            node: FlexLayout.TabNode,
            renderValues: FlexLayout.ITabRenderValues
        ) => {
            if (
                node.getId() == LayoutModels.CHECKS_TAB_ID ||
                node.getId() == LayoutModels.OUTPUT_TAB_ID
            ) {
                const section = this.context.outputSectionsStore.getSection(
                    node.getId() == LayoutModels.CHECKS_TAB_ID
                        ? Section.CHECKS
                        : Section.OUTPUT
                );

                let icon;
                let numMessages;
                if (section.numErrors > 0) {
                    icon = <Icon icon="material:error" className="error" />;
                    numMessages = section.numErrors;
                } else if (section.numWarnings > 0) {
                    icon = <Icon icon="material:warning" className="warning" />;
                    numMessages = section.numWarnings;
                } else {
                    icon = (
                        <Icon
                            icon="material:check"
                            className="info"
                            style={
                                node.getId() == LayoutModels.OUTPUT_TAB_ID &&
                                this.context.lastSuccessfulBuildRevision ==
                                    this.context.lastRevision
                                    ? {
                                          color: settingsController.isDarkTheme
                                              ? "#27FB2C"
                                              : "#00FF21",
                                          fontWeight: "bold"
                                      }
                                    : undefined
                            }
                        />
                    );
                    numMessages = 0;
                }

                renderValues.leading = section.loading ? (
                    <Loader size={20} />
                ) : (
                    icon
                );

                renderValues.content =
                    section.name + (numMessages > 0 ? ` (${numMessages})` : "");
            } else if (
                node.getId() == LayoutModels.SEARCH_TAB_ID ||
                node.getId() == LayoutModels.REFERENCES_TAB_ID
            ) {
                const section = this.context.outputSectionsStore.getSection(
                    node.getId() == LayoutModels.SEARCH_TAB_ID
                        ? Section.SEARCH
                        : Section.REFERENCES
                );

                renderValues.leading = section.loading ? (
                    <Loader size={20} />
                ) : null;

                renderValues.content =
                    section.name +
                    (section.messages.searchResults.length > 0
                        ? ` (${section.messages.searchResults.length})`
                        : "");
            } else if (node.getId() == LayoutModels.DEBUGGER_LOGS_TAB_ID) {
                if (this.context.runtime && this.context.runtime.error) {
                    renderValues.leading = (
                        <div className="EezStudio_AttentionContainer">
                            <span></span>
                            <div className="EezStudio_AttentionDiv" />
                        </div>
                    );
                }
            } else if (node.getComponent() == "editor") {
                const editor = this.context.editorsStore.tabIdToEditorMap.get(
                    node.getId()
                );
                renderValues.content = (
                    <div
                        className={classNames({
                            "fst-italic": !editor?.permanent
                        })}
                    >
                        {node.getName()}
                    </div>
                );
            }
        };

        onAuxMouseClick = (
            node:
                | FlexLayout.TabNode
                | FlexLayout.TabSetNode
                | FlexLayout.BorderNode,
            event: React.MouseEvent<HTMLElement, MouseEvent>
        ) => {
            if (
                node instanceof FlexLayout.TabNode &&
                node.getComponent() == "editor"
            ) {
                if (event.button == 1) {
                    // delete tab on mouse middle click
                    node.getModel().doAction(
                        FlexLayout.Actions.deleteTab(node.getId())
                    );
                }
            }
        };

        onContextMenu = (
            node:
                | FlexLayout.TabNode
                | FlexLayout.TabSetNode
                | FlexLayout.BorderNode,
            event: React.MouseEvent<HTMLElement, MouseEvent>
        ) => {
            event.preventDefault();
            event.stopPropagation();

            if (
                node instanceof FlexLayout.TabNode &&
                node.getComponent() == "editor"
            ) {
                const editor = this.context.editorsStore.tabIdToEditorMap.get(
                    node.getId()
                );
                if (editor && !editor.permanent) {
                    // open context menu
                    const menu = new Menu();
                    menu.append(
                        new MenuItem({
                            label: "Keep Tab Open",
                            click: () => {
                                runInAction(() => (editor.permanent = true));

                                this.context.editorsStore.tabsModel.doAction(
                                    FlexLayout.Actions.updateNodeAttributes(
                                        node.getId(),
                                        {
                                            config: editor.getConfig()
                                        }
                                    )
                                );
                            }
                        })
                    );
                    menu.popup();
                }
            }
        };

        onModelChange = (
            model: FlexLayout.Model,
            action: FlexLayout.Action
        ) => {
            console.log("[editors] onModelChange action:", action.type, "tabs:", model.getActiveTabset()?.getChildren().length);
            this.context.editorsStore.refresh(false);
        };

        render() {
            if (
                this.context.runtime &&
                !this.context.runtime.isDebuggerActive
            ) {
                const pageTabState = new PageTabState(
                    this.context.runtime.selectedPage,
                    this._prevPageTabState
                        ? this._prevPageTabState.transform
                        : undefined
                );

                if (this.context.projectTypeTraits.isLVGL) {
                    // prevent flickering when changing selected page
                    this._prevPageTabState = pageTabState;
                }

                return (
                    <PageEditor
                        editor={
                            new Editor(
                                this.context,
                                this.context.runtime.selectedPage,
                                undefined,
                                undefined,
                                pageTabState
                            )
                        }
                    ></PageEditor>
                );
            }

            // to make sure onRenderTab is observable
            this.context.editorsStore.editors.forEach(editor => {
                editor.permanent;
            });

            const checksSection = this.context.outputSectionsStore.getSection(
                Section.CHECKS
            );
            checksSection.numErrors;
            checksSection.numWarnings;
            checksSection.loading;

            this.context.lastRevisionStable;
            this.context.lastSuccessfulBuildRevision;

            const sectionOutput = this.context.outputSectionsStore.getSection(
                Section.OUTPUT
            );
            sectionOutput.numErrors;
            sectionOutput.numWarnings;
            sectionOutput.loading;

            const sectionSearch = this.context.outputSectionsStore.getSection(
                Section.SEARCH
            );
            sectionSearch.messages.searchResults.length;
            sectionSearch.loading;

            const sectionReferences =
                this.context.outputSectionsStore.getSection(Section.REFERENCES);
            sectionReferences.messages.searchResults.length;
            sectionReferences.loading;

            this.context.runtime && this.context.runtime.error;

            return (
                <div
                    style={{
                        flexGrow: 1,
                        display: "flex",
                        flexDirection: "row"
                    }}
                >
                    <div
                        style={{
                            position: "relative",
                            flexGrow: 1
                        }}
                    >
                        {isProjectEditorHosted() ? (
                            /*
                             * Hosted by the Designer shell: the shell's regions render the panels
                             * (projected from this very model, see `documents/lvgl/projectEezLayout.ts`),
                             * so drawing the FlexLayout container here would duplicate every panel.
                             * The canvas keeps the active editor, in EEZ's own root, so the flow editor
                             * finds the DOM it expects.
                             */
                            <ActiveEditorView />
                        ) : (
                            <FlexLayoutContainer
                                model={this.context.layoutModels.root}
                                factory={this.factory}
                                onRenderTab={this.onRenderTab}
                                iconFactory={LayoutModels.iconFactory}
                                onAuxMouseClick={this.onAuxMouseClick}
                                onContextMenu={this.onContextMenu}
                                onModelChange={this.onModelChange}
                                font={{
                                    size: "small"
                                }}
                            />
                        )}
                    </div>
                </div>
            );
        }
    }
);

const MissingExtensions = observer(
    class MissingExtensions extends React.Component {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        constructor(props: any) {
            super(props);

            makeObservable(this, {
                installableExtensions: computed
            });
        }

        get installableExtensions() {
            return extensionsManagerStore.extensionsVersionsCatalogBuilder
                .get()
                .filter(extensionsVersions =>
                    this.context.project.missingExtensions.find(
                        missingExtension =>
                            extensionsVersions.versionInFocus.name ==
                            missingExtension.extensionName
                    )
                );
        }

        installExtension = async (extensionToInstall: IExtension) => {
            const progressToastId = notification.info("Updating...", {
                autoClose: false
            });

            await new Promise(resolve => setTimeout(resolve, 500));

            await downloadAndInstallExtension(
                extensionToInstall,
                progressToastId
            );

            if (this.installableExtensions.length == 0) {
                this.context.reloadProject();
            }
        };

        installAll = () => {};

        render() {
            return (
                <div className="EezStudio_ProjectEditor_MissingExtensions">
                    <div className="EezStudio_ProjectEditor_MissingExtensions_Title">
                        <h6>
                            {this.context.project.missingExtensions.length > 1
                                ? "Install missing extensions"
                                : "Install missing extension"}
                            :
                        </h6>
                    </div>
                    <div className="EezStudio_ProjectEditor_MissingExtensions_Body">
                        {this.context.project.missingExtensions.map(
                            extension => {
                                const installableExtension =
                                    this.installableExtensions.find(
                                        installableExtension =>
                                            installableExtension.versionInFocus
                                                .name ===
                                            extension.extensionName
                                    )?.versionInFocus;

                                return (
                                    <div key={extension.extensionName}>
                                        {extension.extensionName}
                                        {installableExtension ? (
                                            <Button
                                                color="primary"
                                                size="small"
                                                onClick={() =>
                                                    this.installExtension(
                                                        installableExtension
                                                    )
                                                }
                                            >
                                                Install
                                            </Button>
                                        ) : (
                                            <div className="unknown-extension">
                                                Unknown extension
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                        )}
                    </div>
                    <div className="EezStudio_ProjectEditor_MissingExtensions_Footer">
                        <Button
                            color="secondary"
                            size="small"
                            onClick={action(() => {
                                this.context.missingExtensionsResolved = true;
                            })}
                        >
                            Edit Project
                        </Button>

                        {this.installableExtensions.length >= 1 && (
                            <Button
                                color="primary"
                                size="small"
                                onClick={this.installAll}
                            >
                                Install All
                            </Button>
                        )}
                    </div>
                </div>
            );
        }
    }
);
