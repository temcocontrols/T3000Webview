import React from "react";
import { action, observable, makeObservable, autorun } from "mobx";
import { observer } from "mobx-react";

import { NavItem } from "./fluent-home";
import {
    FolderOpenRegular,
    AddRegular,
    PlayRegular,
    MusicNote2Regular,
    PuzzlePieceRegular,
    SettingsRegular,
} from "@fluentui/react-icons";

import { Settings } from "home/settings";
import {
    NewProjectWizard,
    wizardModelTemplates,
    wizardModelExamples
} from "project-editor/project/ui/Wizard";
import {
    ExtensionsManager,
    extensionsManagerStore
} from "./extensions-manager/extensions-manager";
import { Projects } from "home/open-projects-v2";
import { Instruments, defaultInstrumentsStore } from "home/instruments";
import { instrumentDatabases } from "eez-studio-shared/db";

const HOME_TAB_OPEN_ICON = <FolderOpenRegular />;
const HOME_TAB_CREATE_ICON = <AddRegular />;
const HOME_TAB_EXAMPLES_ICON = <PlayRegular />;
const HOME_TAB_INSTRUMENTS_ICON = <MusicNote2Regular />;
const HOME_TAB_EXTENSIONS_ICON = <PuzzlePieceRegular />;
const HOME_TAB_SETTINGS_ICON = <SettingsRegular />;

////////////////////////////////////////////////////////////////////////////////

const SAVED_OPTIONS_VERSION = 1;

class HomeTabStore {
    activeTab:
        | "open"
        | "create"
        | "examples"
        | "run"
        | "instruments"
        | "extensions"
        | "settings" = "open";

    constructor() {
        this.loadOptions();

        makeObservable(this, {
            activeTab: observable
        });

        autorun(() => this.saveOptions());
    }

    loadOptions() {
        const optionsJSON = window.localStorage.getItem("home-tab-options");
        if (optionsJSON) {
            try {
                const options = JSON.parse(optionsJSON);
                if (options.version == SAVED_OPTIONS_VERSION) {
                    this.activeTab = options.activeTab;
                }
            } catch (err) {
                console.error(err);
            }
        }
    }

    saveOptions() {
        window.localStorage.setItem(
            "home-tab-options",
            JSON.stringify({
                version: SAVED_OPTIONS_VERSION,
                activeTab: this.activeTab
            })
        );
    }
}

export const homeTabStore = new HomeTabStore();

////////////////////////////////////////////////////////////////////////////////

export const Home = observer(
    class Home extends React.Component {
        render() {
            return (
                <div className="EezStudio_HomeTab">
                    <div className="EezStudio_HomeTab_Header">
                        <div className="EezStudio_HomeTab_Navigation">
                            <NavItem
                                icon={HOME_TAB_OPEN_ICON}
                                label="Open"
                                title="Open a local project or select one from the recent list"
                                selected={homeTabStore.activeTab == "open"}
                                onClick={action(() => { homeTabStore.activeTab = "open"; })}
                            />
                            <NavItem
                                icon={HOME_TAB_CREATE_ICON}
                                label="Create"
                                title="Create a new project"
                                selected={homeTabStore.activeTab == "create"}
                                onClick={action(() => { homeTabStore.activeTab = "create"; })}
                            />
                            <NavItem
                                icon={HOME_TAB_EXAMPLES_ICON}
                                label="Examples"
                                title="Example projects ready to run or edit"
                                selected={homeTabStore.activeTab == "examples"}
                                onClick={action(() => { homeTabStore.activeTab = "examples"; })}
                            />
                            {/* Instruments not relevant for T3000 */}
                            {/*
                            <NavItem
                                icon={HOME_TAB_INSTRUMENTS_ICON}
                                label="Instruments"
                                title="Instruments manager"
                                selected={homeTabStore.activeTab == "instruments"}
                                onClick={action(() => { homeTabStore.activeTab = "instruments"; })}
                            />
                            */}
                            <NavItem
                                icon={HOME_TAB_EXTENSIONS_ICON}
                                label="Extensions"
                                title="Extensions manager"
                                selected={homeTabStore.activeTab == "extensions"}
                                onClick={action(() => { homeTabStore.activeTab = "extensions"; })}
                            />
                            <NavItem
                                icon={HOME_TAB_SETTINGS_ICON}
                                label="Settings"
                                title="Global user settings"
                                selected={homeTabStore.activeTab == "settings"}
                                onClick={action(() => { homeTabStore.activeTab = "settings"; })}
                            />
                        </div>
                        {/*
                        <div className="EezStudio_HomeTab_Tabs">
                            {tabs.allTabs
                                .filter(
                                    tab => tab.instance.category == "common"
                                )
                                .map(tab => (
                                    <TabButton
                                        key={tab.instance.id}
                                        tab={tab}
                                    />
                                ))}
                                </div>*/}
                    </div>

                    <div className="EezStudio_HomeTab_Body">
                        {homeTabStore.activeTab == "open" && <Projects />}
                        {homeTabStore.activeTab == "create" && (
                            <NewProjectWizard
                                wizardModel={wizardModelTemplates}
                                modalDialog={observable.box<any>()}
                            />
                        )}
                        {homeTabStore.activeTab == "examples" && (
                            <NewProjectWizard
                                wizardModel={wizardModelExamples}
                                modalDialog={observable.box<any>()}
                            />
                        )}
                        {/*
                        homeTabStore.activeTab == "run" && (
                            <div style={{ margin: "auto" }}></div>
                        )
                        */}
                        {/* Instruments not relevant for T3000
                        {homeTabStore.activeTab == "instruments" && (
                            <Instruments
                                instrumentsStore={defaultInstrumentsStore}
                                size="M"
                            />
                        )}
                        */}
                        {homeTabStore.activeTab == "extensions" && (
                            <ExtensionsManager />
                        )}
                        {homeTabStore.activeTab == "settings" && <Settings />}
                    </div>
                </div>
            );
        }
    }
);
