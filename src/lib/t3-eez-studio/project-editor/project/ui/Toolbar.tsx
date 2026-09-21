import React from "react";
import ReactDOM from "react-dom";
import {
    action,
    computed,
    makeObservable,
    observable,
    runInAction
} from "mobx";
import { observer } from "mobx-react";
import { ArrowResetRegular, ZoomFitRegular } from "@fluentui/react-icons";
import { ButtonAction, IconAction, ButtonGroup, SegmentedAction, ToolbarDensityContext } from "./fluent-toolbar";
import { makeStyles, tokens } from "@fluentui/react-components";
import { BuildConfiguration } from "project-editor/project/project";
import { ProjectContext } from "project-editor/project/context";
import { isProjectEditorHosted } from "project-editor/hostMode";
import { PageTabState } from "project-editor/features/page/PageEditor";
import {
    getChildren,
    getObjectIcon,
    objectToString
} from "project-editor/store";
import { RenderVariableStatus } from "project-editor/features/variable/global-variable-status";
import { FlowTabState } from "project-editor/flow/flow-tab-state";
import { RuntimeType } from "project-editor/project/project-type-traits";
import {
    PROJECT_EDITOR_SCRAPBOOK,
    RUN_ICON
} from "project-editor/ui-components/icons";
import { getEditorComponent } from "./EditorComponentFactory";
import { getId } from "project-editor/core/object";
import type { IObjectVariableValue } from "eez-studio-types";
import { getObjectVariableTypeFromType } from "project-editor/features/variable/value-type";
import {
    isScrapbookItemFilePath,
    showScrapbookManager,
    model as scrapbookModel
} from "project-editor/store/scrapbook";
import { closest } from "eez-studio-shared/dom";
import { Icon } from "./fluent-toolbar";
import { dockerBuildState } from "project-editor/lvgl/docker-build/docker-build-state";
import { getDeviceBinding } from "project-editor/build/device-binding";
import * as notification from "eez-studio-ui/notification";
import { DeployDeviceDrawer } from "../../../../../t3-react/features/design-hub/components/DeployDeviceDrawer";
import { ResetUiDrawer } from "../../../../../t3-react/features/design-hub/components/ResetUiDrawer";

////////////////////////////////////////////////////////////////////////////////

export const Toolbar = observer(
    class Toolbar extends React.Component {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        get globalVariableStatuses() {
            let globalVariablesStatus: React.ReactNode[] = [];

            for (const variable of this.context.project.allGlobalVariables) {
                const objectVariableType = getObjectVariableTypeFromType(
                    this.context,
                    variable.type
                );
                if (objectVariableType) {
                    let objectVariableValue: IObjectVariableValue | undefined =
                        this.context.dataContext.get(variable.fullName);

                    if (objectVariableValue) {
                        const managedValue = objectVariableType.getValue
                            ? objectVariableType.getValue(objectVariableValue)
                            : undefined;
                        if (managedValue) {
                            objectVariableValue = managedValue;
                        }
                    }

                    globalVariablesStatus.push(
                        <RenderVariableStatus
                            key={variable.fullName}
                            variable={variable}
                            value={objectVariableValue}
                            onClick={async () => {
                                if (objectVariableType.editConstructorParams) {
                                    const constructorParams =
                                        await objectVariableType.editConstructorParams(
                                            variable,
                                            objectVariableValue?.constructorParams ||
                                                objectVariableValue,
                                            true
                                        );
                                    if (constructorParams !== undefined) {
                                        this.context.runtime!.setObjectVariableValue(
                                            variable.fullName,
                                            objectVariableType.createValue(
                                                constructorParams,
                                                true
                                            )
                                        );
                                    }
                                }
                            }}
                        />
                    );
                }
            }

            return globalVariablesStatus;
        }

        render() {
            const showEditorButtons =
                this.context.context.type != "run-tab" &&
                !this.context.project._isDashboardBuild &&
                !(
                    this.context.runtime &&
                    !this.context.runtime.isDebuggerActive
                );

            const showRunEditSwitchControls =
                this.context.context.type != "run-tab" &&
                !this.context.project._isDashboardBuild &&
                this.context.projectTypeTraits.runtimeType != RuntimeType.NONE;

            const globalVariablesStatuses = this.context.runtime
                ? this.globalVariableStatuses
                : [];

            if (
                !showEditorButtons &&
                !showRunEditSwitchControls &&
                globalVariablesStatuses.length == 0
            ) {
                return null;
            }

            return (
                <div className="EezStudio_ProjectEditor_ToolbarNav" style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: isProjectEditorHosted()
                        ? "2px 4px"
                        : `2px ${tokens.spacingHorizontalS}`,
                    /*
                     * No rule under the tools when the shell hosts this toolbar: the band **is** the toolbar
                     * there, and the shell's own edges already separate it from the canvas. The nav's line
                     * drew a second, shorter border under just the EEZ cluster (under Settings ·
                     * Descriptions · Timeline).
                     */
                    borderBottom: isProjectEditorHosted()
                        ? "none"
                        : `1px solid ${tokens.colorNeutralStroke1}`,
                    backgroundColor: tokens.colorNeutralBackground1,
                    minHeight: "40px",
                    gap: tokens.spacingHorizontalXS,
                }}>
                    {showEditorButtons ? <EditorButtons /> : <div />}

                    {showRunEditSwitchControls && !isProjectEditorHosted() ? (
                        <RunEditSwitchControls />
                    ) : (
                        <div />
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {globalVariablesStatuses}
                    </div>
                </div>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

const EditorButtons = observer(
    class EditorButtons extends React.Component {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        constructor(props: any) {
            super(props);

            makeObservable(this, {
                featureItems: computed
            });
        }

        setFrontFace = action((enabled: boolean) => {
            if (this.pageTabState) {
                this.pageTabState.frontFace = enabled;
            }
        });

        get pageTabState() {
            const editorState = this.context.editorsStore.activeEditor?.state;
            if (editorState instanceof PageTabState) {
                return editorState as PageTabState;
            }
            return undefined;
        }

        get flowTabState() {
            const editorState = this.context.editorsStore.activeEditor?.state;
            if (editorState instanceof FlowTabState) {
                return editorState as FlowTabState;
            }
            return undefined;
        }

        get isBuildConfigurationSelectorVisible() {
            return false;
        }

        onSelectedBuildConfigurationChange(event: any) {
            this.context.uiStateStore.setSelectedBuildConfiguration(
                event.target.value
            );
        }

        toggleShowTimeline = action(() => {
            if (this.pageTabState) {
                this.pageTabState.timeline.isEditorActive =
                    !this.pageTabState.timeline.isEditorActive;
            }
        });

        get isShowTimeline() {
            if (this.pageTabState) {
                return this.pageTabState.timeline.isEditorActive;
            }
            return false;
        }

        /**
         * The `−  100%  +  ↺` zoom cluster (user's choice 2026-09-21: the shape they had before, at the new
         * position — right after Paste — plus the **reset** they asked for next).
         *
         * Drawn by `EditorButtons` itself, not by a child component, because the value it shows is
         * `pageTabState.transform.scale` — an observable this observer class already tracks, so the readout
         * and the buttons' enabled state stay live without a second subscription.
         */
        renderZoomControls() {
            const pageTabState = this.pageTabState!;
            const zoom = getPageZoom(this.context, pageTabState);
            const out = nextZoomStop(zoom, -1);
            const into = nextZoomStop(zoom, 1);

            return (
                <ButtonGroup>
                    <IconAction
                        label=""
                        title="Zoom out"
                        icon="material:zoom_out"
                        onClick={() => setPageZoom(this.context, pageTabState, out)}
                        enabled={out !== zoom}
                    />
                    <span
                        style={{
                            minWidth: "38px",
                            textAlign: "center",
                            fontSize: "12px",
                            fontVariantNumeric: "tabular-nums",
                            alignSelf: "center"
                        }}
                    >
                        {Math.round(zoom * 100)}%
                    </span>
                    <IconAction
                        label=""
                        title="Zoom in"
                        icon="material:zoom_in"
                        onClick={() => setPageZoom(this.context, pageTabState, into)}
                        enabled={into !== zoom}
                    />
                    {/*
                     * **Reset** — back to 100%, scale only (the pan is left alone, exactly like the shell's
                     * old `zoomReset`; *Fit to window*, which also re-centres, is not here — say the word and
                     * it becomes a fourth button or an item in the page zoom dropdown).
                     *
                     * Its glyph is Fluent's `ZoomFitRegular` — a magnifier with arrows, i.e. the third member
                     * of the `−` / `+` zoom family. The first attempt was `ArrowResetRegular`, a generic
                     * circular arrow that said nothing about *zoom* (user: *"change a icon for reset zoom"*).
                     * Fluent ships no "100 %" / "1:1" glyph; if this one is not right either, the alternatives
                     * are `ArrowClockwiseRegular`, `FullScreenMaximizeRegular`, or dropping the icon for a small
                     * `1:1` text button.
                     *
                     * Disabled at 100%: the old `View ▾` entry was too (`|zoom − 1| > 0.001`), and a button
                     * that looks live but does nothing is worse than a greyed one.
                     */}
                    <IconAction
                        label=""
                        title="Reset zoom to 100%"
                        icon={<ZoomFitRegular />}
                        onClick={() => setPageZoom(this.context, pageTabState, 1)}
                        enabled={Math.abs(zoom - 1) > 0.001}
                    />
                </ButtonGroup>
            );
        }

        get featureItems() {
            if (this.context.runtime) {
                return undefined;
            }

            let featureItems = getChildren(this.context.project).filter(
                object =>
                    getObjectIcon(object) &&
                    getEditorComponent(object, undefined) &&
                    !(
                        object == this.context.project.userPages ||
                        object == this.context.project.userWidgets ||
                        object == this.context.project.actions ||
                        object == this.context.project.variables ||
                        object == this.context.project.styles ||
                        object == this.context.project.lvglStyles ||
                        object == this.context.project.fonts ||
                        object == this.context.project.bitmaps ||
                        object == this.context.project.texts ||
                        object == this.context.project.scpi ||
                        object == this.context.project.extensionDefinitions ||
                        object == this.context.project.changes
                    )
            );

            // push Settings to the end
            if (featureItems) {
                const settingsIndex = featureItems.findIndex(
                    item => item == this.context.project.settings
                );
                if (settingsIndex != -1) {
                    featureItems.splice(settingsIndex, 1);
                    featureItems.push(this.context.project.settings);
                }
            }

            return featureItems;
        }

        render() {
            let configurations =
                this.context.project.settings.build.configurations.map(
                    (item: BuildConfiguration) => {
                        return (
                            <option key={item.name} value={item.name}>
                                {objectToString(item)}
                            </option>
                        );
                    }
                );

            return (
                <div
                    className="EezStudio_ProjectEditor_ToolbarNav_EditorButtons"
                    /* The band's row is 4 px apart, not 8: the nine gaps are 36 px of the 64 px the tool row
                       has to yield for the document's mode cluster to fit (see `ToolbarDensityContext`). */
                    style={isProjectEditorHosted() ? { gap: "4px" } : undefined}
                >
                    <ToolbarDensityContext.Provider
                        value={isProjectEditorHosted()}
                    >
                    {!this.context.runtime && (
                        <ButtonGroup>
                            <IconAction
                                title="Save"
                                icon="material:save"
                                onClick={() => this.context.save()}
                                enabled={this.context.isModified}
                            />
                        </ButtonGroup>
                    )}

                    {!this.context.runtime && (
                        <>
                            <ButtonGroup>
                                <IconAction
                                    title={
                                        this.context.undoManager.canUndo
                                            ? `Undo "${this.context.undoManager.undoDescription}"`
                                            : ""
                                    }
                                    icon="material:undo"
                                    onClick={() =>
                                        this.context.undoManager.undo()
                                    }
                                    enabled={this.context.undoManager.canUndo}
                                />
                                <IconAction
                                    title={
                                        this.context.undoManager.canRedo
                                            ? `Redo "${this.context.undoManager.redoDescription}"`
                                            : ""
                                    }
                                    icon="material:redo"
                                    onClick={() =>
                                        this.context.undoManager.redo()
                                    }
                                    enabled={this.context.undoManager.canRedo}
                                />
                            </ButtonGroup>

                            <ButtonGroup>
                                {false && (
                                    <IconAction
                                        title="Cut"
                                        icon="material:content_cut"
                                        iconSize={22}
                                        onClick={this.context.cut}
                                        enabled={this.context.canCut}
                                    />
                                )}
                                <IconAction
                                    title="Copy"
                                    icon="material:content_copy"
                                    iconSize={22}
                                    onClick={this.context.copy}
                                    enabled={this.context.canCopy}
                                />
                                <IconAction
                                    title="Paste"
                                    icon="material:content_paste"
                                    iconSize={22}
                                    onClick={this.context.paste}
                                    enabled={this.context.canPaste}
                                />
                            </ButtonGroup>

                            {/*
                              * The zoom control — `−  100%  +`, right after Paste.
                              *
                              * The place is the user's (2026-09-21: *"for zoom, i think u need place it after
                              * paste"*); the shape is the cluster they had before, in the shell's trailing
                              * area: one click per step and the value always readable. The origin drew this
                              * row's zoom at its **end**, after the feature items.
                              *
                              * The steps are the same stops the dropdown lists and the keyboard walks
                              * (`Ctrl+−` / `Ctrl+=` / `Ctrl+0`), so the two can never disagree — and the
                              * dropdown itself is still there for the legacy page (see the end of this row).
                              */}
                            {this.pageTabState ? this.renderZoomControls() : null}

                            <ButtonGroup>
                                {/*
                                  * Hidden in the unified Designer shell (2026-09-21).
                                  *
                                  * The Scrapbook is a **reuse library across projects**: a snippet store at
                                  * `userData/scrapbooks/Default.eez-scrapbook` (SQLite via the backend), where
                                  * objects are dropped in from the navigator and pasted out — with their
                                  * dependencies — into another project. Useful when juggling several projects,
                                  * niche otherwise, and it cost ~90 px of the band's already crowded left row.
                                  *
                                  * Kept rather than removed: View → Scrapbook still calls
                                  * `showScrapbookManager()`, so the manager (floating by default) stays
                                  * reachable and this one condition brings the button back.
                                  */}
                                {!isProjectEditorHosted() && (
                                    <IconAction
                                        title="Scrapbook"
                                        icon={PROJECT_EDITOR_SCRAPBOOK}
                                        iconSize={24}
                                        onClick={() => showScrapbookManager()}
                                        selected={scrapbookModel.isVisible}
                                    />
                                )}
                            </ButtonGroup>
                        </>
                    )}

                    {!this.context.runtime &&
                        this.isBuildConfigurationSelectorVisible && (
                            <div style={{ display: "flex" }}>
                                <select
                                    title="Configuration"
                                    id="btn-toolbar-configuration"
                                    className="form-select"
                                    value={
                                        this.context.uiStateStore
                                            .selectedBuildConfiguration
                                    }
                                    onChange={this.onSelectedBuildConfigurationChange.bind(
                                        this
                                    )}
                                >
                                    {configurations}
                                </select>
                            </div>
                        )}

                    {!this.context.runtime && (
                        <ButtonGroup>
                            {!this.context.projectTypeTraits.isDashboard && (
                                <IconAction
                                    title="Check"
                                    icon="material:check"
                                    onClick={() => this.context.check()}
                                    enabled={this.context.project._fullyLoaded}
                                />
                            )}
                            {!(
                                this.context.filePath &&
                                isScrapbookItemFilePath(this.context.filePath)
                            ) && (
                                <IconAction
                                    title="Build"
                                    icon="material:build"
                                    onClick={() => this.context.build()}
                                    enabled={this.context.project._fullyLoaded}
                                />
                            )}
                        </ButtonGroup>
                    )}

                    {this.context.projectTypeTraits.isResource &&
                        this.context.project.micropython && (
                            <ButtonGroup>
                                <IconAction
                                    title="Run MicroPython Script"
                                    icon={RUN_ICON}
                                    iconSize={28}
                                    onClick={() =>
                                        this.context.project.micropython.runScript()
                                    }
                                    enabled={this.context.project._fullyLoaded}
                                />
                            </ButtonGroup>
                        )}

                    {this.context.projectTypeTraits.hasFlowSupport && (
                        <>
                            {this.pageTabState && (
                                <>
                                    {/*
                                      * The page's face is ONE state with two choices, so it is one control:
                                     * stacked segments, the active one brand-tinted, the full wording kept
                                     * ("Front face" / "Back face" — "Front"/"Back" alone read as navigation).
                                      * Stacking uses the group's second row instead of widening it.
                                      */}
                                    <SegmentedAction
                                        segments={[
                                            {
                                                id: "front",
                                                label: "Front face",
                                                icon: "material:flip_to_front",
                                                selected: this.pageTabState.frontFace,
                                                title:
                                                    "Front face — plain view; the navigator lists widgets only",
                                                onClick: () => this.setFrontFace(true)
                                            },
                                            {
                                                id: "back",
                                                label: "Back face",
                                                icon: "material:flip_to_back",
                                                selected: !this.pageTabState.frontFace,
                                                title:
                                                    "Back face — mirrored view; the navigator also lists connections and groups",
                                                onClick: () => this.setFrontFace(false)
                                            }
                                        ]}
                                    />

                                    {!this.flowTabState?.flowState && (
                                        <ButtonGroup>
                                            <IconAction
                                                title="Show the page animation timeline — keyframes per widget over time; a flow can read the position (Flow.pageTimelinePosition) and, while the timeline is open, the runtime scrubs the page to the needle"
                                                label="Timeline"
                                                icon={
                                                    <svg viewBox="0 0 551 372">
                                                        <path d="M42.4631 336.4972H204.996v-42.4224h-65.4195v-60.132h65.4195v-42.4495H0l.0008 145.005zm-.0045-102.5747H99.046v60.132H42.4586zm233.9184-42.4632v42.4405h61.8929v60.132h-61.893v42.4405h61.352l42.4247.009h171.5298v-145.013zM442.0555 294.007h-61.893v-60.132h61.893zm67.1986 0h-24.74v-60.132h24.74z" />
                                                        <path d="M348.4318 42.4321c0-10.8489-4.1291-21.7155-12.4228-30.0003C327.7332 4.138 316.8667.009 306.0177.009L176.8741 0c-10.849 0-21.7243 4.129-30.0185 12.4227-8.2757 8.2937-12.7264 19.1555-12.4227 30.0004v53.5542l85.791 54.0862v221.6388h42.4495V150.0637l85.7751-54.0861.009-53.5362z" />
                                                    </svg>
                                                }
                                                iconSize={24}
                                                onClick={() =>
                                                    this.toggleShowTimeline()
                                                }
                                                selected={this.isShowTimeline}
                                            />
                                        </ButtonGroup>
                                    )}
                                </>
                            )}

                            {(this.flowTabState ||
                                (this.pageTabState &&
                                    !this.pageTabState.frontFace)) && (
                                <ButtonGroup>
                                    <IconAction
                                        title="Show the comment text written on flow components and on their connection lines — the wiring view, i.e. the flow editor and the page's back face"
                                        label="Descriptions"
                                        icon="material:comment"
                                        iconSize={20}
                                        onClick={action(
                                            () =>
                                                (this.context.uiStateStore.showComponentDescriptions =
                                                    !this.context.uiStateStore
                                                        .showComponentDescriptions)
                                        )}
                                        selected={
                                            this.context.uiStateStore
                                                .showComponentDescriptions
                                        }
                                    />
                                </ButtonGroup>
                            )}
                        </>
                    )}

                    {!this.context.runtime &&
                        this.context.project.texts?.languages.length > 0 && (
                            <ButtonGroup>
                                <SelectLanguage />
                            </ButtonGroup>
                        )}

                    {this.featureItems && (
                        <ButtonGroup>
                            {this.featureItems.map(featureItem => {
                                const title = objectToString(featureItem);

                                let icon = getObjectIcon(featureItem);

                                const editorComponent = getEditorComponent(
                                    featureItem,
                                    undefined
                                )!;

                                const onClick = action(() => {
                                    if (editorComponent) {
                                        this.context.editorsStore.openEditor(
                                            editorComponent.object,
                                            editorComponent.subObject
                                        );
                                    }
                                });

                                const isActive =
                                    editorComponent &&
                                    this.context.editorsStore.activeEditor &&
                                    this.context.editorsStore.getEditorByObject(
                                        editorComponent.object
                                    ) == this.context.editorsStore.activeEditor;

                                return (
                                    <IconAction
                                        key={getId(featureItem)}
                                        title={title}
                                        icon={icon}
                                        onClick={onClick}
                                        enabled={!isActive}
                                    />
                                );
                            })}
                        </ButtonGroup>
                    )}

                    {/*
                      * The **dropdown** zoom — the origin's widget, kept for the legacy page (it offers a
                      * typed value, the presets and *Global zoom*). The hosted Designer shell draws the
                      * `− 100% +` cluster above, after Paste, and switches its own off
                      * (`shellControls.viewport: false` in `LvglDocument`), so no page ever shows both.
                      */}
                    {this.pageTabState && !isProjectEditorHosted() && (
                        <PageZoomButton pageTabState={this.pageTabState} />
                    )}
                    </ToolbarDensityContext.Provider>
                </div>
            );
        }
    }
);

const SelectLanguage = observer(
    class SelectLanguage extends React.Component {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        render() {
            return (
                <select
                    className="form-select"
                    value={
                        this.context.uiStateStore.selectedLanguage.languageID
                    }
                    onChange={action(
                        (event: React.ChangeEvent<HTMLSelectElement>) =>
                            (this.context.uiStateStore.selectedLanguageID =
                                event.currentTarget.value)
                    )}
                    style={{ width: "fit-content" }}
                >
                    {this.context.project.texts.languages.map(language => (
                        <option
                            key={language.languageID}
                            value={language.languageID}
                        >
                            {language.languageID}
                        </option>
                    ))}
                </select>
            );
        }
    }
);

/**
 * The zoom stops — the list EEZ's dropdown offers (`Zoom to 10 % … 1600 %`).
 *
 * One source for every way in: the `−` / `+` buttons step it, the dropdown lists it, and the keyboard walks
 * the shell's own ladder (`Ctrl+−` / `Ctrl+=` / `Ctrl+0`). Sharing the list is what keeps a step from landing
 * between two stops no menu can show.
 */
const ZOOM_STOPS = [10, 25, 50, 75, 100, 150, 200, 400, 800, 1600];

/** The next stop from `zoom` in `direction`, clamped at both ends. */
function nextZoomStop(zoom: number, direction: 1 | -1): number {
    const percent = zoom * 100;

    if (direction > 0) {
        const next = ZOOM_STOPS.find(stop => stop > percent + 0.5);
        return (next ?? ZOOM_STOPS[ZOOM_STOPS.length - 1]) / 100;
    }

    const lower = ZOOM_STOPS.filter(stop => stop < percent - 0.5);
    return (lower.length ? lower[lower.length - 1] : ZOOM_STOPS[0]) / 100;
}

/**
 * The zoom EEZ keeps, in two places: a **global** value (`uiStateStore.globalFlowZoom` + `flowZoom`) that
 * applies to every page, and the active page tab's own `transform.scale`.
 *
 * One implementation for both entry points — the `− 100% +` cluster and `PageZoomButton`'s dropdown.
 */
function getPageZoom(
    projectStore: React.ContextType<typeof ProjectContext>,
    pageTabState: PageTabState
): number {
    return projectStore.uiStateStore.globalFlowZoom
        ? projectStore.uiStateStore.flowZoom
        : pageTabState.transform.scale;
}

function setPageZoom(
    projectStore: React.ContextType<typeof ProjectContext>,
    pageTabState: PageTabState,
    zoom: number
): void {
    runInAction(() => {
        projectStore.uiStateStore.flowZoom = zoom;
    });

    if (!projectStore.uiStateStore.globalFlowZoom) {
        /*
         * A **clone**, replacing the observable: the page editor reads `transform`, so mutating `scale` in
         * place would leave the canvas at the old zoom.
         */
        const newTransform = pageTabState.transform.clone();
        newTransform.scale = zoom;
        runInAction(() => {
            pageTabState.transform = newTransform;
        });
    }
}

const PageZoomButton = observer(    class PageZoomButton extends React.Component<{
        pageTabState: PageTabState;
    }> {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        buttonRef = React.createRef<HTMLButtonElement>();

        dropDownRef = React.createRef<HTMLDivElement>();

        dropDownOpen: boolean | undefined = false;
        dropDownLeft = 0;
        dropDownTop = 0;
        dropDownWidth = 0;

        zoomInput: string | undefined;

        constructor(props: any) {
            super(props);

            makeObservable(this, {
                dropDownOpen: observable,
                dropDownLeft: observable,
                dropDownTop: observable,
                dropDownWidth: observable,
                zoomInput: observable
            });
        }

        get zoom() {
            return getPageZoom(this.context, this.props.pageTabState);
        }

        set zoom(value: number) {
            setPageZoom(this.context, this.props.pageTabState, value);
        }

        get globalZoom() {
            return this.context.uiStateStore.globalFlowZoom;
        }

        set globalZoom(value: boolean) {
            runInAction(() => {
                if (value) {
                    this.context.uiStateStore.flowZoom = this.zoom;
                } else {
                    for (const page of this.context.project.pages) {
                        if (page == this.props.pageTabState.flow) {
                            const newTransform =
                                this.props.pageTabState.transform.clone();
                            newTransform.scale = this.zoom;
                            runInAction(() => {
                                this.props.pageTabState.transform =
                                    newTransform;
                            });
                        } else {
                            let uiState =
                                this.context.uiStateStore.getObjectUIState(
                                    page,
                                    "flow-state"
                                );

                            if (!uiState) {
                                uiState = {};
                            }

                            uiState.transform = {
                                translate: uiState.transform?.translate,
                                scale: this.zoom
                            };

                            runInAction(() => {
                                this.context.uiStateStore.updateObjectUIState(
                                    page,
                                    "flow-state",
                                    uiState
                                );
                            });
                        }
                    }
                }

                this.context.uiStateStore.globalFlowZoom = value;
            });
        }

        setDropDownOpen = action((open: boolean) => {
            if (this.dropDownOpen === false) {
                document.removeEventListener(
                    "pointerdown",
                    this.onDocumentPointerDown,
                    true
                );
            }

            this.dropDownOpen = open;

            if (this.dropDownOpen) {
                document.addEventListener(
                    "pointerdown",
                    this.onDocumentPointerDown,
                    true
                );
            }
        });

        openDropdown = action(() => {
            const buttonEl = this.buttonRef.current;
            if (!buttonEl) {
                return;
            }

            const dropDownEl = this.dropDownRef.current;
            if (!dropDownEl) {
                return;
            }

            this.setDropDownOpen(!this.dropDownOpen);

            if (this.dropDownOpen) {
                const rectInputGroup =
                    buttonEl.parentElement!.getBoundingClientRect();

                this.dropDownLeft = rectInputGroup.left;
                this.dropDownTop = rectInputGroup.bottom;
                this.dropDownWidth = rectInputGroup.width;

                if (
                    this.dropDownLeft + this.dropDownWidth >
                    window.innerWidth
                ) {
                    this.dropDownLeft = window.innerWidth - this.dropDownWidth;
                }

                const DROP_DOWN_HEIGHT = 270;
                if (
                    this.dropDownTop + DROP_DOWN_HEIGHT + 20 >
                    window.innerHeight
                ) {
                    this.dropDownTop =
                        window.innerHeight - (DROP_DOWN_HEIGHT + 20);
                }
            }
        });

        onDocumentPointerDown = action((event: MouseEvent) => {
            if (this.dropDownOpen) {
                if (
                    !closest(
                        event.target,
                        el =>
                            this.buttonRef.current == el ||
                            this.dropDownRef.current == el
                    )
                ) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.setDropDownOpen(false);
                }
            }
        });

        render() {
            const portal = ReactDOM.createPortal(
                <div
                    ref={this.dropDownRef}
                    className="dropdown-menu dropdown-menu-end EezStudio_PageZoomButton_DropdownContent shadow rounded"
                    style={{
                        display: this.dropDownOpen ? "block" : "none",
                        left: this.dropDownLeft,
                        top: this.dropDownTop,
                        width: this.dropDownWidth
                    }}
                >
                    <ul>
                        <div className="EezStudio_PageZoomButton_DropdownContent_ZoomInput">
                            <input
                                type="text"
                                className="form-control"
                                value={
                                    this.zoomInput ??
                                    `${Math.round(this.zoom * 100)}%`
                                }
                                onChange={action(event => {
                                    this.zoomInput = event.target.value;
                                })}
                                onKeyDown={event => {
                                    if (event.key === "Enter") {
                                        let value = parseInt(
                                            this.zoomInput!.replace("%", "")
                                        );
                                        if (value) {
                                            if (value < 5) value = 5;
                                            else if (value > 1600) value = 1600;

                                            this.zoom = value / 100;
                                        }
                                        this.zoomInput = undefined;
                                        this.setDropDownOpen(false);
                                    }
                                }}
                            />
                        </div>
                        <hr className="dropdown-divider" />
                        {ZOOM_STOPS.map(
                            stop => (
                                <li
                                    key={stop}
                                    className="EezStudio_PageZoomButton_DropdownContent_MenuItem"
                                    onClick={() => {
                                        this.zoom = stop / 100;
                                        this.setDropDownOpen(false);
                                    }}
                                >
                                    Zoom to {stop}%
                                </li>
                            )
                        )}
                        <hr className="dropdown-divider" />
                        <li
                            className="EezStudio_PageZoomButton_DropdownContent_Checkmark"
                            onClick={() => {
                                this.globalZoom = !this.globalZoom;
                                this.setDropDownOpen(false);
                            }}
                        >
                            {this.globalZoom ? (
                                <Icon icon="material:check_box" size={20} />
                            ) : (
                                <Icon
                                    icon="material:check_box_outline_blank"
                                    size={20}
                                />
                            )}
                            <span style={{ paddingLeft: 2 }}>Global zoom</span>
                        </li>
                    </ul>
                </div>,
                document.body
            );

            return (
                <div style={{ display: "flex" }}>
                    <button
                        ref={this.buttonRef}
                        className="dropdown-toggle EezStudio_PageZoomButton"
                        type="button"
                        onClick={this.openDropdown}
                        style={{
                            border: "1px solid #d1d1d1",
                            background: "transparent",
                            padding: "2px 8px",
                            cursor: "pointer",
                            fontSize: "13px",
                        }}
                    >
                        {Math.round(this.zoom * 100)}%
                    </button>
                    {portal}
                </div>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

export const RunEditSwitchControls = observer(
    class RunEditSwitchControls extends React.Component<{
        /**
         * Drawn on its own, in the Designer shell's band (`TopSpec.modeBar`) rather than inside this
         * toolbar's nav.
         *
         * Two consequences: the cluster decides its own visibility (the nav used to), and it is drawn as a
         * **two-line group** — modes on the first line, the two long-running ones on the second — so the
         * five buttons fit the band's right end without eating the tool groups.
         */
        standalone?: boolean;
    }> {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        state: { deployOpen: boolean; resetOpen: boolean } = {
            deployOpen: false,
            resetOpen: false
        };

        get deployProjectInfo() {
            const projectStore = this.context;
            const filePath = projectStore.filePath;
            const baseFolder = filePath ? filePath.replace(/[\\/][^\\/]+$/, "") : "";
            const folder = baseFolder.split(/[\\/]/).pop() || baseFolder;
            const binding = filePath ? getDeviceBinding(filePath) : undefined;
            const project = projectStore.project;
            return {
                id: `eez:${folder}`,
                name: project.name || folder,
                engine: "eez" as const,
                folder,
                serialNumber: binding?.serialNumber,
                status: binding ? ("bound" as const) : ("local" as const),
                lvglVersion: project.settings?.general?.lvglVersion,
                pages: project.userPages?.length,
            };
        }

        get showFullSimulatorButton() {
            const projectStore = this.context;
            return (
                projectStore.projectTypeTraits.isLVGL &&
                projectStore.project.settings.build.useDockerDesktop
            );
        }

        get isFullSimulatorMode() {
            return this.context.layoutModels.isDockerSimulatorMode;
        }

        get isFullSimulatorBuilding() {
            const previewStore = dockerBuildState.getProjectState(
                this.context.filePath
            );
            return previewStore.state === "building";
        }

        handleDeploy = async () => {
            const projectStore = this.context;
            if (!projectStore.filePath) {
                notification.error("Save the project first before deploying.");
                return;
            }
            // Persist the current project to disk first, then let the shared
            // deploy pipeline export from the SAVED file (raw JSON). Deploying
            // from the in-memory EEZ Document model objects made every widget
            // except the background panel disappear (tiny/broken device-export).
            try {
                await projectStore.doSave();
            } catch (e) {
                console.error("Save before deploy failed", e);
            }
            // Open the shared Deploy-to-Device drawer: pick a device, deploy
            // (real push), and view deploy logs — same logic as Design Hub.
            this.setState({ deployOpen: true });
        };

        /**
         * Reset Device UI — restore the firmware's factory UI on the device.
         *
         * Saving first is not about the reset itself (the device re-seeds from its
         * own firmware and nothing is sent) but about the studio side: the drawer
         * re-imports the device UI into this project afterwards, which REWRITES the
         * project file — so unsaved edits are written out before that can happen.
         */
        handleResetUi = async () => {
            const projectStore = this.context;
            if (!projectStore.filePath) {
                notification.error("Save the project first before resetting the device UI.");
                return;
            }
            try {
                await projectStore.doSave();
            } catch (e) {
                console.error("Save before device UI reset failed", e);
            }
            this.setState({ resetOpen: true });
        };

        render() {
            /*
             * Standalone, the cluster owns its visibility. Deliberately looser than the nav's rule: the
             * shell's band is the **only** way out of Run / Debug / Full Sim, so it has to survive a
             * run-tab context — a project with no runtime at all is the one case with no modes to switch.
             */
            if (
                this.props.standalone &&
                this.context.projectTypeTraits.runtimeType == RuntimeType.NONE
            ) {
                return null;
            }

            /*
             * **One row** (user request 2026-09-21: *"for the edit run debug, full sim, deploy, no need to use
             * 2 rows, just one row, but need align right"*).
             *
             * Standalone — in the Designer shell's band — the cluster is a *row*, so the two JSX groups below
             * simply end up side by side: Edit · Run · Debug · Full Sim · Deploy on one line, and the shell
             * pins the whole thing to the band's right end (`ShellTopBar.styles.mode` sits outside the tools
             * zone, after the trailing controls and their 1 px rule). Inside EEZ's own nav (the legacy page)
             * the two lines stay: there the cluster shares a 40 px row with the rest of the toolbar, which is
             * the constraint they were invented for.
             *
             * The glyphs shrink to 16 px in the single row rather than the two-line 30 px, and the labels drop to
             * 12 px with 5 px of side padding (`minWidth: 0` releases Fluent's 64 px floor). Five labelled
             * buttons at the default metrics need 395 px (measured); the compact form is 369 px, and the tool
             * row beside it gives back another 66 px of its own (`ToolbarDensityContext`) — together that is
             * what keeps the band's total inside a 1400 px pane: 968 px of tools + 371 px of modes + 31 px of
             * gap = 1370 px, against the 1392 px the band has, measured with every button of both rows whole.
             */
            const iconSize = this.props.standalone ? 16 : 30;
            /** The single row has to fit beside the document's toolbar — see the comment above. */
            const modeButtonStyle = this.props.standalone
                ? {
                      padding: "2px 5px",
                      fontSize: "12px",
                      minHeight: "26px",
                      minWidth: 0,
                      columnGap: "4px"
                  }
                : undefined;
            return (
                <div
                    className="EezStudio_ProjectEditor_ToolbarNav_RunEditSwitchControls"
                    style={
                        this.props.standalone
                            ? {
                                  display: "flex",
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                  gap: "4px"
                              }
                            : { display: "flex", flexDirection: "column", gap: "2px" }
                    }
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <ButtonAction
                        text="Edit"
                        title="Enter edit mode (Shift+F5)"
                        icon="material:mode_edit"
                        iconSize={iconSize}
                        style={modeButtonStyle}
                        onClick={this.context.onSetEditorMode}
                        selected={
                            !this.context.runtime && !this.isFullSimulatorMode
                        }
                    />

                    <ButtonAction
                        text="Run"
                        title="Enter run mode (F5)"
                        icon={RUN_ICON}
                        iconSize={iconSize}
                        style={modeButtonStyle}
                        onClick={this.context.onSetRuntimeMode}
                        selected={
                            this.context.runtime &&
                            !this.context.runtime.isDebuggerActive &&
                            !this.isFullSimulatorMode
                        }
                    />

                    <ButtonAction
                        text="Debug"
                        title="Enter debug mode (Ctrl+F5)"
                        icon={
                            <svg viewBox="0 0 64 64" fill="currentColor">
                                <g transform="translate(-1,-1)">
                                    <path
                                        id="path2"
                                        d="m64 32h-3c-0.5-13.4-10.8-24.9-24.1-26.7-1-0.2-1.9-0.2-2.9-0.3v-3c0-0.6-0.4-1-1-1s-1 0.4-1 1v3c-6.5 0.2-12.7 2.7-17.6 7.1-5.7 5.1-9.1 12.3-9.4 19.9h-3c-0.6 0-1 0.4-1 1s0.4 1 1 1h3c0.5 13.4 10.8 24.9 24.1 26.7 1 0.1 1.9 0.2 2.9 0.2v3c0 0.6 0.4 1 1 1s1-0.4 1-1v-3c6.5-0.2 12.7-2.7 17.6-7.1 5.7-5.1 9.1-12.3 9.4-19.9h3c0.6 0 1-0.4 1-1s-0.4-0.9-1-0.9zm-13.7 20.4c-4.5 4-10.3 6.3-16.3 6.6v-3c0-0.6-0.4-1-1-1s-1 0.4-1 1v3c-0.9 0-1.7-0.1-2.6-0.2-12.4-1.7-21.9-12.3-22.4-24.8h3c0.6 0 1-0.4 1-1s-0.4-1-1-1h-3c0.3-7.1 3.4-13.7 8.7-18.4 4.6-4.1 10.3-6.3 16.3-6.5v2.9c0 0.6 0.4 1 1 1s1-0.4 1-1v-3c0.9 0 1.8 0.1 2.6 0.2 12.4 1.8 21.9 12.4 22.4 24.8h-3c-0.6 0-1 0.4-1 1s0.4 1 1 1h3c-0.3 7.1-3.4 13.7-8.7 18.4z"
                                    />
                                    <g>
                                        <g transform="matrix(1.237 0 0 1.2197 -7.8175 -7.1947)">
                                            <g>
                                                <g transform="matrix(.92683 0 0 .92683 2.4138 2.3964)">
                                                    <path d="m27.4 18.3c1.2 0 2.4 0.5 3.2 1.4-2 0.9-3.2 3-3.3 5.1-0.1 2.6 1.7 4.9 5.7 4.9 4.1 0 5.7-2 5.7-4.6 0-2.4-1.3-4.6-3.3-5.5 0.9-0.9 2-1.4 3.2-1.4 0.5 0 0.9-0.4 0.9-0.9s-0.4-0.9-0.9-0.9c-2.1 0-3.9 1-5.2 2.7h-0.8c-1.2-1.7-3.1-2.7-5.2-2.7-0.5 0-0.9 0.4-0.9 0.9 0 0.6 0.4 1 0.9 1z" />
                                                    <path d="m47.9 45.4c0.3 0.4 0.1 1-0.3 1.3s-1 0.1-1.3-0.3l-1.8-3h-2.9c-1.3 2.7-3.3 4.8-5.8 5.7l-2.8-13.2-2.9 13.1c-2.5-0.9-4.6-3-5.8-5.7h-2.9l-1.8 3c-0.3 0.4-0.8 0.6-1.3 0.3-0.4-0.3-0.6-0.8-0.3-1.3l2.1-3.4c0.2-0.3 0.5-0.5 0.8-0.5h2.7c-0.4-1.2-0.6-2.6-0.6-4 0-0.4 0-0.9 0.1-1.3h-1.7l-1.8 3c-0.3 0.4-0.8 0.6-1.3 0.3s-0.6-0.8-0.3-1.3l2.1-3.5c0.2-0.3 0.5-0.4 0.8-0.4h2.5c0.5-2.3 1.6-4.3 3.1-5.9 1.5 2.4 3.7 3.1 6.5 3.1 2.7 0 5.2-0.7 6.6-3 1.4 1.5 2.5 3.5 3 5.8h2.5c0.3 0 0.6 0.2 0.8 0.4l2.1 3.5c0.3 0.4 0.1 1-0.3 1.3s-1 0.1-1.3-0.3l-1.8-3h-1.7c0 0.4 0.1 0.9 0.1 1.3 0 1.4-0.2 2.7-0.6 4h2.7c0.3 0 0.6 0.2 0.8 0.5z" />
                                                </g>
                                            </g>
                                        </g>
                                    </g>
                                </g>
                            </svg>
                        }
                        iconSize={iconSize}
                        style={modeButtonStyle}
                        onClick={this.context.onSetDebuggerMode}
                        selected={
                            this.context.runtime &&
                            this.context.runtime.isDebuggerActive &&
                            !this.isFullSimulatorMode
                        }
                        attention={
                            !!(
                                this.context.runtime &&
                                this.context.runtime.error
                            )
                        }
                    />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {this.showFullSimulatorButton && (
                            <ButtonAction
                                text="Full Sim"
                                title="Run in Full Simulator (F7)"
                                icon="material:computer"
                                iconSize={iconSize}
                                style={modeButtonStyle}
                                onClick={this.context.onSetFullSimulatorMode}
                                selected={this.isFullSimulatorMode}
                                loader={this.isFullSimulatorBuilding}
                            />
                        )}

                        <ButtonAction
                            text="Deploy"
                            title="Deploy to Device — export device JSON files to device-export\\ folder"
                            icon="material:file_download"
                            iconSize={iconSize}
                            style={modeButtonStyle}
                            onClick={this.handleDeploy}
                        />

                        {/*
                         * Factory reset — labelled like its siblings (Edit · Run · Debug · Full Sim ·
                         * Deploy): *Reset UI*, with the full name in the tooltip. The destructive step
                         * itself is behind the drawer's own warning panel + inline confirm.
                         */}
                        <ButtonAction
                            text="Reset UI"
                            title="Reset Device UI — restore the firmware's factory UI on the device"
                            icon={<ArrowResetRegular />}
                            iconSize={iconSize}
                            style={modeButtonStyle}
                            onClick={this.handleResetUi}
                        />
                    </div>

                    {this.state.deployOpen && (
                        <DeployDeviceDrawer
                            open={this.state.deployOpen}
                            onClose={() => this.setState({ deployOpen: false })}
                            project={this.deployProjectInfo}
                            filePath={this.context.filePath}
                            // Defensive auto-save: persist the live project again
                            // right before the push (shown as the first log step).
                            onSaveProject={() => (this.context as any).doSave()}
                            onOpenReset={() =>
                                this.setState({ deployOpen: false, resetOpen: true })
                            }
                        />
                    )}

                    {this.state.resetOpen && (
                        <ResetUiDrawer
                            open={this.state.resetOpen}
                            onClose={() => this.setState({ resetOpen: false })}
                            project={this.deployProjectInfo}
                            filePath={this.context.filePath}
                        />
                    )}
                </div>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////
