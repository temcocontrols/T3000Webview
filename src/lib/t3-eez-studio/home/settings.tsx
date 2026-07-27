import fs from "fs";
import { ipcRenderer, shell, clipboard } from "electron";
import { dialog, getCurrentWindow } from "@electron/remote";
import { confirm } from "eez-studio-ui/dialog-electron";
import path from "path";
import React from "react";
import {
    observable,
    computed,
    action,
    runInAction,
    toJS,
    makeObservable,
    reaction
} from "mobx";
import { observer } from "mobx-react";
import classNames from "classnames";
import * as FlexLayout from "flexlayout-react";

import { app, createEmptyFile } from "eez-studio-shared/util-electron";
import { stringCompare } from "eez-studio-shared/string";
import {
    initInstrumentDatabase,
    InstrumentDatabase,
    instrumentDatabases
} from "eez-studio-shared/db";
import {
    LOCALES,
    getLocale,
    setLocale,
    DATE_FORMATS,
    getDateFormat,
    setDateFormat,
    TIME_FORMATS,
    getTimeFormat,
    setTimeFormat
} from "eez-studio-shared/i10n";
import { formatBytes } from "eez-studio-shared/formatBytes";

import { showDialog, Dialog } from "eez-studio-ui/dialog";
import { Loader } from "eez-studio-ui/loader";
import {
    AbsoluteFileInputProperty,
    BooleanProperty,
    InputProperty,
    PropertyList,
    SelectProperty,
    StaticProperty
} from "eez-studio-ui/properties";
import * as notification from "eez-studio-ui/notification";
import {
    Body,
    Header,
    ToolbarHeader,
    VerticalHeaderWithBody
} from "eez-studio-ui/header-with-body";

import dbVacuum from "db-services/vacuum";
import { getMoment } from "eez-studio-shared/util";
import type { IMruItem } from "main/settings";
import { IconBtn } from "./fluent-home";
import { AddRegular, FolderOpenRegular, DeleteRegular } from "@fluentui/react-icons";
import { makeStyles, tokens, Text, Switch } from "@fluentui/react-components";
import { FlexLayoutContainer } from "eez-studio-ui/FlexLayout";
import { homeLayoutModels } from "./home-layout-models";

////////////////////////////////////////////////////////////////////////////////

export const COMPACT_DATABASE_MESSAGE =
    "It is recommended to compact the database every 30 days.";

////////////////////////////////////////////////////////////////////////////////

const getIsDarkTheme = function () {
    return ipcRenderer.sendSync("getIsDarkTheme");
};

const setIsDarkTheme = function (value: boolean) {
    ipcRenderer.send("setIsDarkTheme", value);
};

////////////////////////////////////////////////////////////////////////////////

const getMRU: () => IMruItem[] = function () {
    return ipcRenderer.sendSync("getMRU");
};

const setMRU = function (value: IMruItem[]) {
    ipcRenderer.send("setMRU", toJS(value));
};

ipcRenderer.on("mru-changed", async (_sender: any, mru: IMruItem[]) => {
    function isMruChanged(mru1: IMruItem[], mru2: IMruItem[]) {
        if (!!mru1 != !!mru2) {
            return true;
        }

        if (mru1.length != mru2.length) {
            return true;
        }
        for (let i = 0; i < mru1.length; i++) {
            if (
                mru1[i].filePath != mru2[i].filePath ||
                mru1[i].projectType != mru2[i].projectType
            ) {
                return true;
            }
        }
        return false;
    }

    if (isMruChanged(mru, settingsController.mru)) {
        runInAction(() => (settingsController.mru = mru));
    }
});

////////////////////////////////////////////////////////////////////////////////

const getShowComponentsPaletteInProjectEditor = function () {
    return ipcRenderer.sendSync("getShowComponentsPaletteInProjectEditor");
};

const setShowComponentsPaletteInProjectEditor = function (value: boolean) {
    ipcRenderer.send("setShowComponentsPaletteInProjectEditor", value);
};

////////////////////////////////////////////////////////////////////////////////

class SettingsController {

    activetLocale = getLocale();
    activeDateFormat = getDateFormat();
    activeTimeFormat = getTimeFormat();

    selectedDatabase: InstrumentDatabase | undefined;

    locale: string = getLocale();
    dateFormat: string = getDateFormat();
    timeFormat: string = getTimeFormat();
    isDarkTheme: boolean = (() => {
        // Load from localStorage (falls back to Electron IPC)
        const stored = window.localStorage.getItem("eez-dark-theme");
        if (stored !== null) return stored === "1";
        return getIsDarkTheme();
    })();
    mru: IMruItem[] = getMRU();

    pythonUseCustomPath: boolean = false;
    pythonCustomPath: string = "";

    useLocalTemplates: boolean = false;
    localTemplatesPath: string = "";

    _showComponentsPaletteInProjectEditor: boolean =
        getShowComponentsPaletteInProjectEditor();

    constructor() {
        this.pythonUseCustomPath =
            window.localStorage.getItem("pythonUseCustomPath") == "1"
                ? true
                : false;
        this.pythonCustomPath =
            window.localStorage.getItem("pythonCustomPath") ?? "";

        this.useLocalTemplates =
            window.localStorage.getItem("useLocalTemplates") == "1"
                ? true
                : false;
        this.localTemplatesPath =
            window.localStorage.getItem("localTemplatesPath") ?? "";

        this.selectedDatabase = instrumentDatabases.activeDatabase;

        makeObservable(this, {
            selectedDatabase: observable,
            locale: observable,
            dateFormat: observable,
            timeFormat: observable,
            isDarkTheme: observable,
            mru: observable,
            restartRequired: computed,
            onLocaleChange: action.bound,
            onDateFormatChanged: action.bound,
            onTimeFormatChanged: action.bound,
            switchTheme: action.bound,
            removeItemFromMRU: action,
            pythonUseCustomPath: observable,
            pythonCustomPath: observable,
            useLocalTemplates: observable,
            localTemplatesPath: observable
        });

        this.onThemeSwitched();

        reaction(
            () => ({
                setCustomPath: this.pythonUseCustomPath,
                customPythonPath: this.pythonCustomPath
            }),
            ({ setCustomPath, customPythonPath }) => {
                window.localStorage.setItem(
                    "pythonUseCustomPath",
                    setCustomPath ? "1" : "0"
                );
                window.localStorage.setItem(
                    "pythonCustomPath",
                    customPythonPath
                );
            }
        );

        reaction(
            () => ({
                useLocalTemplates: this.useLocalTemplates,
                localTemplatesPath: this.localTemplatesPath
            }),
            ({ useLocalTemplates, localTemplatesPath }) => {
                window.localStorage.setItem(
                    "useLocalTemplates",
                    useLocalTemplates ? "1" : "0"
                );
                window.localStorage.setItem(
                    "localTemplatesPath",
                    localTemplatesPath
                );
            }
        );
    }

    get restartRequired() {
        return (
            instrumentDatabases.activeDatabase?.filePath !==
            instrumentDatabases.activeDatabasePath ||
            this.locale !== this.activetLocale ||
            this.dateFormat !== this.activeDateFormat ||
            this.timeFormat !== this.activeTimeFormat
        );
    }

    onLocaleChange(value: string) {
        this.locale = value;
        setLocale(value);
    }

    onDateFormatChanged(value: string) {
        this.dateFormat = value;
        setDateFormat(value);
    }

    onTimeFormatChanged(value: string) {
        this.timeFormat = value;
        setTimeFormat(value);
    }

    switchTheme(value: boolean) {
        this.isDarkTheme = value;
        setIsDarkTheme(value);
        this.onThemeSwitched();
    }

    onThemeSwitched() {
        const content = document.getElementById(
            "EezStudio_Content"
        ) as HTMLDivElement;
        if (!content) return;

        const html = document.documentElement;

        // Toggle flexlayout dark CSS dynamically
        const flexDarkId = "flexlayout-dark-css";
        if (this.isDarkTheme) {
            html.setAttribute("data-bs-theme", "dark");
            html.classList.add("theme-dark");
            if (!document.getElementById(flexDarkId)) {
                const link = document.createElement("link");
                link.id = flexDarkId;
                link.rel = "stylesheet";
                link.href = "node_modules/flexlayout-react/style/dark.css";
                document.head.appendChild(link);
            }
        } else {
            html.setAttribute("data-bs-theme", "light");
            html.classList.remove("theme-dark");
            const darkLink = document.getElementById(flexDarkId);
            if (darkLink) darkLink.remove();
        }

        // Persist to localStorage so it survives refresh
        window.localStorage.setItem("eez-dark-theme", this.isDarkTheme ? "1" : "0");
    }

    removeItemFromMRU(mruItem: IMruItem) {
        // Use findIndex by filePath instead of indexOf (reference equality).
        // When mru-changed fires, the array is replaced with new objects from
        // JSON.parse(localStorage), so reference comparison (===) can fail.
        const i = this.mru.findIndex(
            (item: IMruItem) => item.filePath === mruItem.filePath
        );
        if (i != -1) {
            this.mru.splice(i, 1);
            setMRU(this.mru);
        }
    }

    addDatabase(filePath: string, isActive: boolean) {
        instrumentDatabases.addDatabase(filePath, isActive);

        runInAction(() => {
            this.selectedDatabase = instrumentDatabases.databases.find(
                database => database.filePath == filePath
            );
        });
    }

    createNewDatabase = () => {
        console.log("[settings] createNewDatabase: opening save dialog...");
        ipcRenderer.once("database-file-created", async (event: any, data: { filePath: string; name: string }) => {
            console.log("[settings] database-file-created received:", data);
            const filePath = data?.filePath;
            if (!filePath) { console.log("[settings] no filePath"); return; }
            console.log("[settings] initInstrumentDatabase:", filePath);
            try {
                await initInstrumentDatabase(filePath);
                console.log("[settings] initInstrumentDatabase OK");
            } catch (err) {
                console.error("[settings] initInstrumentDatabase failed:", err);
            }
            console.log("[settings] adding database:", filePath);
            this.addDatabase(filePath, true);
            window.localStorage.setItem("lastDatabaseSavePath", path.dirname(filePath));
            console.log("[settings] done");
        });
        ipcRenderer.send("create-database-file");
    };

    openDatabase = () => {
        console.log("[settings] openDatabase: opening file picker...");
        ipcRenderer.once("database-file-selected", (event: any, data: { filePath: string; name: string }) => {
            console.log("[settings] database-file-selected received:", data);
            const filePath = data?.filePath;
            if (!filePath) { console.log("[settings] no filePath"); return; }
            console.log("[settings] adding database:", filePath);
            this.addDatabase(filePath, true);
            window.localStorage.setItem("lastDatabaseOpenPath", path.dirname(filePath));
            console.log("[settings] done");
        });
        ipcRenderer.send("open-database-file");
    };

    askForRestart = () => {
        if (
            instrumentDatabases.activeDatabase &&
            instrumentDatabases.activeDatabase.filePath !=
            instrumentDatabases.activeDatabasePath
        ) {
            confirm(
                "Do you want to restart the application?",
                "Restart is required to finish activation of new database.",
                this.restart
            );
        }
    };

    restart = () => {
        // Electron reload (legacy):
        // app.relaunch();
        // app.exit();

        // Browser mode: reload the EEZ Studio page
        console.log("[settings] Restart clicked, redirecting to /#/t3000/eez");
        window.location.href = "/#/t3000/eez";
    };

    setAsActiveDatabase = action(() => {
        if (this.selectedDatabase) {
            instrumentDatabases.setAsActiveDatabase(this.selectedDatabase);

            this.askForRestart();
        }
    });

    deleteDatabase = () => {
        if (this.selectedDatabase) {
            instrumentDatabases.removeDatabase(this.selectedDatabase);
        }
    };

    showDatabasePathInFolder = () => {
        if (this.selectedDatabase) {
            shell.showItemInFolder(this.selectedDatabase.filePath);
        }
    };

    compactDatabase = () => {
        if (!this.selectedDatabase) {
            return;
        }
        showDialog(<CompactDatabaseDialog database={this.selectedDatabase} />);
    };

    get showComponentsPaletteInProjectEditor() {
        return this._showComponentsPaletteInProjectEditor;
    }

    set showComponentsPaletteInProjectEditor(value: boolean) {
        this._showComponentsPaletteInProjectEditor = value;
        setShowComponentsPaletteInProjectEditor(value);
    }
}

export const settingsController = new SettingsController();

////////////////////////////////////////////////////////////////////////////////

const CompactDatabaseDialog = observer(
    class CompactDatabaseDialog extends React.Component<{
        database: InstrumentDatabase;
    }> {
        sizeBefore: number;
        sizeAfter: number | undefined;
        sizeReduced: number | undefined;

        constructor(props: any) {
            super(props);

            makeObservable(this, {
                sizeBefore: observable,
                sizeAfter: observable,
                sizeReduced: observable
            });

            this.sizeBefore = fs.statSync(this.props.database.filePath).size;
        }

        async componentDidMount() {
            try {
                await dbVacuum();

                runInAction(() => {
                    this.props.database.timeOfLastDatabaseCompactOperation =
                        Date.now();
                });

                runInAction(() => {
                    var fs = require("fs");

                    this.sizeAfter = fs.statSync(
                        this.props.database.filePath
                    ).size;

                    this.props.database.databaseSize = this.sizeAfter!;

                    this.sizeReduced =
                        (100 * (this.sizeBefore - this.sizeAfter!)) /
                        this.sizeBefore;
                    if (this.sizeReduced < 1) {
                        this.sizeReduced =
                            Math.round(100 * this.sizeReduced) / 100;
                    } else if (this.sizeReduced < 10) {
                        this.sizeReduced =
                            Math.round(10 * this.sizeReduced) / 10;
                    } else {
                        this.sizeReduced = Math.round(this.sizeReduced);
                    }
                });
            } catch (err) {
                notification.error(err);
            }
        }

        render() {
            return (
                <Dialog
                    open={true}
                    title="Compacting Database"
                    size="small"
                    cancelButtonText="Close"
                    cancelDisabled={this.sizeAfter === undefined}
                >
                    <table className="EezStudio_CompactDatabaseDialogTable">
                        <tbody>
                            <tr>
                                <td>Size before</td>
                                <td>{formatBytes(this.sizeBefore)}</td>
                            </tr>
                            <tr>
                                <td>Size after</td>
                                <td>
                                    {this.sizeAfter !== undefined ? (
                                        formatBytes(this.sizeAfter)
                                    ) : (
                                        <Loader style={{ margin: 0 }} />
                                    )}
                                </td>
                            </tr>
                            {this.sizeReduced !== undefined && (
                                <tr>
                                    <td>Size reduced by </td>
                                    <td>
                                        {formatBytes(
                                            this.sizeBefore - this.sizeAfter!
                                        )}{" "}
                                        or {this.sizeReduced}%
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </Dialog>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

const DatabaseListItem = observer(
    class DbPathListItem extends React.Component<{
        database: InstrumentDatabase;
        isSelected: boolean;
        onSelect: () => void;
    }> {
        render() {
            const { database, isSelected, onSelect } = this.props;

            const className = classNames({
                selected: isSelected
            });

            return (
                <tr className={className} onClick={onSelect}>
                    <td
                        style={{
                            fontWeight: database.isActive ? "bold" : "normal"
                        }}
                    >
                        {database.isActive ? "[ACTIVE] " : ""}
                        {path.parse(database.filePath).name}
                    </td>
                </tr>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

const SelectedDatabaseDetails = observer(
    class SelectedDatabaseDetails extends React.Component {
        render() {
            const selectedDatabase = settingsController.selectedDatabase;
            if (!selectedDatabase) {
                return null;
            }

            return (
                <div className="EezStudio_Settings_Database_Details">
                    {!selectedDatabase.isActive && (
                        <div>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={settingsController.setAsActiveDatabase}
                            >
                                Set as Active
                            </button>
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor="EezStudio_ProjectEditorScrapbook_ItemDetails_Description"
                            className="form-label"
                        >
                            Description:
                        </label>
                        <textarea
                            className="form-control"
                            id="EezStudio_ProjectEditorScrapbook_ItemDetails_Description"
                            rows={3}
                            value={selectedDatabase.description}
                            onChange={action(event => {
                                selectedDatabase.description =
                                    event.target.value;
                            })}
                            onBlur={() => selectedDatabase.storeDescription()}
                        ></textarea>
                    </div>

                    <div>
                        <label className="form-label">Path:</label>
                        <div>{selectedDatabase.filePath}</div>

                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={
                                settingsController.showDatabasePathInFolder
                            }
                            style={{ marginTop: "5px" }}
                        >
                            Show in Folder
                        </button>

                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() =>
                                clipboard.writeText(selectedDatabase.filePath)
                            }
                            style={{ marginTop: "5px", marginLeft: "5px" }}
                        >
                            Copy Path to Clipboard
                        </button>
                    </div>

                    <div
                        className={classNames("EezStudio_DatabaseCompactDiv", {
                            databaseCompactIsAdvisable:
                                selectedDatabase.isCompactDatabaseAdvisable
                        })}
                    >
                        <div>
                            Database size is{" "}
                            {formatBytes(selectedDatabase.databaseSize)}.
                        </div>
                        <div>
                            Database compacted{" "}
                            {getMoment()(
                                selectedDatabase.timeOfLastDatabaseCompactOperation
                            ).fromNow()}
                            .
                        </div>
                        {selectedDatabase.isCompactDatabaseAdvisable && (
                            <div>{COMPACT_DATABASE_MESSAGE}</div>
                        )}
                        <div className="btn-group me-2">
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={settingsController.compactDatabase}
                            >
                                Compact Database
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

const DatatabaseList = observer(
    class DatatabaseList extends React.Component {
        ref = React.createRef<HTMLDivElement>();

        componentDidMount() {
            this.ensureSelectedVisible();
        }

        componentDidUpdate() {
            this.ensureSelectedVisible();
        }

        ensureSelectedVisible() {
            const selected = this.ref.current?.querySelector(".selected");
            if (selected) {
                selected.scrollIntoView({ block: "nearest" });
            }
        }

        render() {
            return (
                <VerticalHeaderWithBody className="EezStudio_Settings_Databases_List" style={{ scrollbarWidth: "thin", scrollbarColor: "#c1c1c1 transparent" }}>
                    <ToolbarHeader>
                        <IconBtn
                            icon={<AddRegular />}
                            title="Create a new database"
                            onClick={settingsController.createNewDatabase}
                        />
                        <IconBtn
                            icon={<FolderOpenRegular />}
                            title="Open an existing database"
                            onClick={settingsController.openDatabase}
                        />
                        <IconBtn
                            icon={<DeleteRegular />}
                            title={
                                !settingsController.selectedDatabase
                                    ? "Delete a database (select a non-active database first)"
                                    : settingsController.selectedDatabase.isActive
                                    ? "Cannot delete the active database"
                                    : "Delete a database"
                            }
                            onClick={settingsController.deleteDatabase}
                            disabled={
                                settingsController.selectedDatabase &&
                                !settingsController.selectedDatabase.isActive
                                    ? false
                                    : true
                            }
                        />
                    </ToolbarHeader>
                    <Body>
                        <div
                            className="EezStudio_Settings_Databases_List_Body"
                            ref={this.ref}
                            style={{ scrollbarWidth: "thin", scrollbarColor: "#c1c1c1 transparent" }}
                        >
                            <table>
                                <tbody>
                                    {instrumentDatabases.databases.map(
                                        database => (
                                            <DatabaseListItem
                                                key={database.filePath}
                                                database={database}
                                                isSelected={
                                                    database.filePath ==
                                                    settingsController
                                                        .selectedDatabase
                                                        ?.filePath
                                                }
                                                onSelect={action(
                                                    action(() => {
                                                        settingsController.selectedDatabase =
                                                            database;
                                                    })
                                                )}
                                            />
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Body>
                </VerticalHeaderWithBody>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

const Databases = observer(
    class Databases extends React.Component {
        componentDidMount() {
            const style = document.createElement("style");
            style.id = "db-thin-scrollbar";
            style.textContent = ".EezStudio_Settings_Databases .flexlayout__tab{scrollbar-width:thin!important;scrollbar-color:#c1c1c1 transparent!important}";
            if (!document.getElementById("db-thin-scrollbar")) {
                document.head.appendChild(style);
            }
        }

        factory(node: FlexLayout.TabNode) {
            var component = node.getComponent();

            if (component === "list") {
                return <DatatabaseList />;
            }

            if (component === "details") {
                return <SelectedDatabaseDetails />;
            }

            return null;
        }

        render() {
            return (
                <div className="EezStudio_Settings_Databases" style={{ width: "100%", height: "100%", border: "none" }}>
                    <FlexLayoutContainer
                        model={homeLayoutModels.databaseSettings}
                        factory={this.factory}
                    />
                </div>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

const PythonSettings = observer(
    class PythonSettings extends React.Component {
        constructor(props: any) {
            super(props);

            // Try the Rust backend API first (browser mode uses this).
            // If unavailable, fall back to Electron's python-shell.
            this.detectPython();

            makeObservable(this, {
                pythonPath: observable,
                pythonPathError: observable
            });
        }

        pythonPath: string = "";
        pythonPathError: boolean = false;

        async detectPython() {
            // Try the Rust backend API first (browser mode).
            try {
                const resp = await fetch("/api/eez-studio/detect-python");
                if (resp.ok) {
                    const data = await resp.json();
                    runInAction(() => {
                        if (data.path) {
                            this.pythonPath = data.path;
                            this.pythonPathError = false;
                        } else {
                            this.pythonPathError = true;
                        }
                    });
                    return;
                }
                // API responded but not OK — set error and stop (don't fall through)
                console.warn("[PythonSettings] detect-python API returned status:", resp.status);
                runInAction(() => { this.pythonPathError = true; });
                return;
            } catch (err) {
                // Fetch failed — API not running (Electron mode), fall back to python-shell
                console.log("[PythonSettings] detect-python API unavailable, trying python-shell");
            }

            // Electron fallback: use python-shell
            try {
                const { PythonShell } =
                    require("python-shell") as typeof import("python-shell");

                PythonShell.runString(
                    "import sys;print(sys.executable)",
                    undefined,
                    action((err: any, output: string[]) => {
                        if (err) {
                            console.log("[PythonSettings] python-shell error:", err);
                            this.pythonPathError = true;
                        } else if (!output) {
                            this.pythonPathError = true;
                        } else {
                            this.pythonPath = output[0];
                        }
                    })
                );
            } catch {
                this.pythonPathError = true;
            }
        }

        render() {
            return (
                <div style={{ fontSize: "12px" }}>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "70px 120px 1fr",
                        gap: "6px 12px",
                        alignItems: "center",
                    }}>
                        {/* Row 1: "Python" section label */}
                        <div style={{ fontWeight: 600, color: "#323130" }}>Python</div>
                        <div style={{ color: "#605e5c" }}>Default path</div>
                        <div style={{
                            padding: "2px 8px",
                            background: "#faf9f8",
                            border: "1px solid #edebe9",
                            borderRadius: "2px",
                            lineHeight: "22px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}>
                            {this.pythonPathError
                                ? "Python not found"
                                : this.pythonPath || "—"}
                        </div>

                        {/* Row 2: Set custom path */}
                        <div />{/* empty cell under Python */}
                        <div style={{ color: "#605e5c" }}>Set custom path</div>
                        <div className="form-check form-switch" style={{ minHeight: "auto", marginBottom: 0, paddingLeft: 0 }}>
                            <input
                                type="checkbox"
                                className="form-check-input"
                                style={{ marginLeft: 0 }}
                                checked={settingsController.pythonUseCustomPath}
                                onChange={e => {
                                    settingsController.pythonUseCustomPath = e.target.checked;
                                }}
                            />
                        </div>

                        {/* Row 3: Custom Python path */}
                        {settingsController.pythonUseCustomPath && (
                            <>
                                <div />{/* empty cell under Python */}
                                <div style={{ color: "#605e5c" }}>Custom Python path</div>
                                <div className="input-group" style={{ height: "28px" }}>
                                    <input
                                        type="text"
                                        className="form-control"
                                        style={{ height: "28px", fontSize: "12px", padding: "2px 8px" }}
                                        value={settingsController.pythonCustomPath}
                                        onChange={e => {
                                            settingsController.pythonCustomPath = e.target.value;
                                        }}
                                    />
                                    <button
                                        className="btn btn-secondary"
                                        type="button"
                                        style={{ height: "28px", fontSize: "12px", padding: "2px 8px" }}
                                        onClick={async () => {
                                            // Try native file picker via Rust API (browser mode).
                                            // Fall back to Electron dialog if API unavailable.
                                            try {
                                                const resp = await fetch("/api/eez-studio/pick-open-file", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        title: "Select Python Executable",
                                                        filters: [{ name: "Executable", extensions: ["exe", "*"] }],
                                                    }),
                                                });
                                                if (resp.ok) {
                                                    const data = await resp.json();
                                                    if (data.file_path) {
                                                        settingsController.pythonCustomPath = data.file_path;
                                                        return;
                                                    }
                                                }
                                            } catch {
                                                // API not available — fall back to Electron dialog
                                            }
                                            const result = await dialog.showOpenDialog(getCurrentWindow(), {
                                                properties: ["openFile"],
                                                filters: [{ name: "All Files", extensions: ["*"] }],
                                            });
                                            if (result.filePaths && result.filePaths[0]) {
                                                settingsController.pythonCustomPath = result.filePaths[0];
                                            }
                                        }}
                                    >
                                        &hellip;
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

class AbsoluteDirectoryInputProperty extends React.Component<
    {
        name?: string;
        value: string;
        onChange: (value: string) => void;
    },
    {}
> {
    onSelect = async () => {
        // Try native directory picker via Rust API (browser mode).
        try {
            const resp = await fetch("/api/eez-studio/pick-directory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "Select Directory" }),
            });
            if (resp.ok) {
                const data = await resp.json();
                if (data.file_path) {
                    this.props.onChange(data.file_path);
                    return;
                }
            }
        } catch {
            // API not available — fall back to Electron dialog
        }

        const result = await dialog.showOpenDialog(getCurrentWindow(), {
            properties: ["openDirectory"]
        });

        if (result.filePaths && result.filePaths[0]) {
            this.props.onChange(result.filePaths[0]);
        }
    };

    render() {
        return (
            <InputProperty
                name={this.props.name}
                value={this.props.value}
                onChange={this.props.onChange}
                type="text"
                inputGroupButton={
                    <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={this.onSelect}
                    >
                        &hellip;
                    </button>
                }
            />
        );
    }
}

const EEZ_PROJECT_TEMPLATES_REPO_URL =
    "https://github.com/eez-open/eez-project-templates";

const TemplateSettings = observer(
    class TemplateSettings extends React.Component {
        render() {
            return (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "120px 160px 1fr",
                    gap: "6px 12px",
                    alignItems: "center",
                    fontSize: "12px",
                }}>
                    {/* Row 1: Project Templates label */}
                    <div style={{ fontWeight: 600, color: "#323130" }}>Project Templates</div>
                    <div style={{ color: "#605e5c" }}>Use local templates</div>
                    <div className="form-check form-switch" style={{ minHeight: "auto", marginBottom: 0, paddingLeft: 0 }}>
                        <input
                            type="checkbox"
                            className="form-check-input"
                            style={{ marginLeft: 0 }}
                            checked={settingsController.useLocalTemplates}
                            onChange={e => {
                                settingsController.useLocalTemplates = e.target.checked;
                            }}
                        />
                    </div>

                    {/* Row 2: Local templates path */}
                    {settingsController.useLocalTemplates && (
                        <>
                            <div />{/* empty under section label */}
                            <div style={{ color: "#605e5c" }}>Local templates path</div>
                            <div className="input-group" style={{ height: "28px" }}>
                                <input
                                    type="text"
                                    className="form-control"
                                    style={{ height: "28px", fontSize: "12px", padding: "2px 8px" }}
                                    value={settingsController.localTemplatesPath}
                                    onChange={e => {
                                        settingsController.localTemplatesPath = e.target.value;
                                    }}
                                />
                                <button
                                    className="btn btn-secondary"
                                    type="button"
                                    style={{ height: "28px", fontSize: "12px", padding: "2px 8px" }}
                                    onClick={async () => {
                                        try {
                                            const resp = await fetch("/api/eez-studio/pick-directory", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ title: "Select Templates Directory" }),
                                            });
                                            if (resp.ok) {
                                                const data = await resp.json();
                                                if (data.file_path) {
                                                    settingsController.localTemplatesPath = data.file_path;
                                                    return;
                                                }
                                            }
                                        } catch {
                                            // API not available — fall back to Electron dialog
                                        }
                                        const result = await dialog.showOpenDialog(getCurrentWindow(), {
                                            properties: ["openDirectory"],
                                        });
                                        if (result.filePaths && result.filePaths[0]) {
                                            settingsController.localTemplatesPath = result.filePaths[0];
                                        }
                                    }}
                                >
                                    &hellip;
                                </button>
                            </div>
                        </>
                    )}

                    {/* Row 3: Repository URL */}
                    {settingsController.useLocalTemplates && (
                        <>
                            <div />{/* empty under section label */}
                            <div style={{ color: "#605e5c" }}>Repository</div>
                            <div style={{
                                padding: "2px 8px",
                                background: "#faf9f8",
                                border: "1px solid #edebe9",
                                borderRadius: "2px",
                                lineHeight: "22px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}>
                                {EEZ_PROJECT_TEMPLATES_REPO_URL}
                            </div>
                        </>
                    )}
                </div>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

const SettingsSectionHeader = ({
    title
}: {
    title: string;
}) => (
    <tr className="EezStudio_SettingsSectionHeader">
        <td colSpan={2}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                    width: "3px",
                    height: "14px",
                    borderRadius: "2px",
                    backgroundColor: "#0f6cbd",
                }} />
                <h5 style={{ margin: 0 }}>{title}</h5>
            </div>
        </td>
    </tr>
);

////////////////////////////////////////////////////////////////////////////////

const cardStyle: React.CSSProperties = {
    border: "1px solid #edebe9",
    borderRadius: "4px",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
};

const cardTitleStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 600,
    color: "#323130",
    padding: "0 12px",
    borderBottom: "1px solid #edebe9",
    backgroundColor: "#f5f5f5",
    minHeight: "32px",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
};

const cardBodyStyle: React.CSSProperties = {
    padding: "8px 12px",
    flex: 1,
    minHeight: 0,
    overflow: "auto",
    scrollbarWidth: "thin",
    scrollbarColor: "#c1c1c1 transparent",
    fontSize: "12px",
};

export const Settings = observer(
    class Settings extends React.Component {
        render() {
            return (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gridTemplateRows: "1fr 0.6fr",
                    gap: "8px 12px",
                    padding: "12px",
                    flex: 1,
                    minHeight: 0,
                }}>
                    {/* Row 1 Col 1: Databases */}
                    <div style={{ ...cardStyle, minHeight: 0 }}>
                        <div style={{ ...cardTitleStyle, gap: "8px", paddingLeft: "12px" }}>
                            <div style={{ width: "3px", height: "14px", borderRadius: "2px", backgroundColor: "#0f6cbd", flexShrink: 0 }} />
                            Databases
                        </div>
                        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                            <Databases />
                        </div>
                    </div>

                    {/* Row 1 Col 2: External Tools */}
                    <div style={{ ...cardStyle, minHeight: 0 }}>
                        <div style={{ ...cardTitleStyle, gap: "8px", paddingLeft: "12px" }}>
                            <div style={{ width: "3px", height: "14px", borderRadius: "2px", backgroundColor: "#0f6cbd", flexShrink: 0 }} />
                            External Tools
                        </div>
                        <div style={{ ...cardBodyStyle }}>
                            <PythonSettings />
                        </div>
                    </div>

                        {/* Project Editor */}
                        <div style={{ ...cardStyle, minHeight: 0 }}>
                            <div style={{ ...cardTitleStyle, gap: "8px", paddingLeft: "12px" }}>
                                <div style={{ width: "3px", height: "14px", borderRadius: "2px", backgroundColor: "#0f6cbd", flexShrink: 0 }} />
                                Project Editor
                            </div>
                            <div style={{ ...cardBodyStyle }}>
                                <TemplateSettings />
                            </div>
                        </div>

                        {/* Localization + Appearance */}
                        <div style={{ display: "flex", gap: "12px", minHeight: 0 }}>
                            <div style={{ ...cardStyle, flex: 1, minHeight: 0 }}>
                                <div style={{ ...cardTitleStyle, gap: "8px", paddingLeft: "12px" }}>
                                    <div style={{ width: "3px", height: "14px", borderRadius: "2px", backgroundColor: "#0f6cbd", flexShrink: 0 }} />
                                    Localization
                                </div>
                            <div style={{ ...cardBodyStyle, fontSize: "12px" }}>
                            <PropertyList>
                                <SelectProperty
                                    name="Locale"
                                    value={settingsController.locale}
                                    onChange={settingsController.onLocaleChange}
                                >
                                    {Object.keys(LOCALES).slice().sort((a, b) =>
                                        stringCompare((LOCALES as any)[a], (LOCALES as any)[b])
                                    ).map(locale => (
                                        <option key={locale} value={locale}>
                                            {(LOCALES as any)[locale]}
                                        </option>
                                    ))}
                                </SelectProperty>
                                <SelectProperty
                                    name="Date format"
                                    value={settingsController.dateFormat}
                                    onChange={settingsController.onDateFormatChanged}
                                >
                                    {DATE_FORMATS.map(dateFormat => {
                                        const safeLocale = typeof settingsController.locale === "string"
                                            ? settingsController.locale : "en";
                                        return (
                                            <option key={dateFormat.format} value={dateFormat.format}>
                                                {getMoment()(new Date()).locale(safeLocale).format(dateFormat.format)}
                                            </option>
                                        );
                                    })}
                                </SelectProperty>
                                <SelectProperty
                                    name="Time format"
                                    value={settingsController.timeFormat}
                                    onChange={settingsController.onTimeFormatChanged}
                                >
                                    {TIME_FORMATS.map(timeFormat => (
                                        <option key={timeFormat.format} value={timeFormat.format}>
                                            {getMoment()(new Date()).locale(settingsController.locale || "en").format(timeFormat.format)}
                                        </option>
                                    ))}
                                </SelectProperty>
                            </PropertyList>
                            </div>
                        </div>

                        {/* Appearance + Restart */}
                        <div style={{ ...cardStyle, minHeight: 0 }}>
                            <div style={{ ...cardTitleStyle, gap: "8px", paddingLeft: "12px" }}>
                                <div style={{ width: "3px", height: "14px", borderRadius: "2px", backgroundColor: "#0f6cbd", flexShrink: 0 }} />
                                Appearance
                            </div>
                            <div style={cardBodyStyle}>
                            <PropertyList>
                                <BooleanProperty
                                    name="Dark theme"
                                    value={settingsController.isDarkTheme}
                                    onChange={settingsController.switchTheme}
                                    checkboxStyleSwitch={true}
                                />
                            </PropertyList>
                            <div style={{
                                borderTop: `1px solid var(--fluent-colorNeutralStroke1, #d1d1d1)`,
                                paddingTop: "12px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                            }}>
                                <button
                                    className="btn btn-primary"
                                >
                                    Restart
                                </button>
                            </div>
                            </div>
                        </div>
                        </div>
                </div>
            );
        }
    }
);
