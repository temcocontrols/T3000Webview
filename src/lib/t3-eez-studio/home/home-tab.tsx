import React from "react";
import { action, observable, makeObservable, autorun } from "mobx";
import { observer } from "mobx-react";

import { NavItem } from "./fluent-home";
import {
    FolderOpenRegular,
    AddRegular,
    DocumentBulletListRegular,
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
const HOME_TAB_EXAMPLES_ICON = <DocumentBulletListRegular />;
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
                        {/* Home-tab navigation (OPEN/CREATE/EXAMPLES/EXTENSIONS/
                            SETTINGS) hidden for now — migrated to the design hub
                            (2026-08-25). */}
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
                        {/* Home-tab body (OPEN/CREATE/EXAMPLES/EXTENSIONS/SETTINGS)
                            hidden for now — migrated to the design hub (2026-08-25).
                            After "Create & Open" the project editor opens directly. */}
                    </div>
                </div>
            );
        }
    }
);
