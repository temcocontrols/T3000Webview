import path from "path";
import fs from "fs";
import { clipboard, ipcRenderer } from "electron";
import { Menu, MenuItem } from "@electron/remote";
import React from "react";
import {
    computed,
    action,
    observable,
    runInAction,
    makeObservable,
    autorun
} from "mobx";
import { observer } from "mobx-react";

import { ButtonAction, IconAction } from "eez-studio-ui/action";

import { stringCompare } from "eez-studio-shared/string";

import { IListNode, List, ListContainer, ListItem } from "eez-studio-ui/list";
import { settingsController } from "home/settings";
import type { IMruItem } from "main/settings";
import { SearchInput } from "eez-studio-ui/search-input";
import { getProjectIcon } from "home/helper";
import { ProjectStore, loadProject } from "project-editor/store";
import { ProjectEditorTab, tabs } from "home/tabs-store";
import { initProjectEditor } from "project-editor/project-editor-bootstrap";
import { HOME_TAB_OPEN_ICON } from "project-editor/ui-components/icons";
import "./open-projects-v2.css";

////////////////////////////////////////////////////////////////////////////////

const SORT_ALPHA_ICON = (
    <svg
        viewBox="0 0 24 24"
        strokeWidth="2"
        stroke="currentColor"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
        <path d="M15 10v-5c0 -1.38 .62 -2 2 -2s2 .62 2 2v5m0 -3h-4"></path>
        <path d="M19 21h-4l4 -7h-4"></path>
        <path d="M4 15l3 3l3 -3"></path>
        <path d="M7 6v12"></path>
    </svg>
);

const SORT_RECENT_ICON = (
    <svg
        viewBox="0 0 24 24"
        strokeWidth="2"
        stroke="currentColor"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
        <line x1="4" y1="6" x2="13" y2="6"></line>
        <line x1="4" y1="12" x2="11" y2="12"></line>
        <line x1="4" y1="18" x2="11" y2="18"></line>
        <polyline points="15 15 18 18 21 15"></polyline>
        <line x1="18" y1="6" x2="18" y2="18"></line>
    </svg>
);

////////////////////////////////////////////////////////////////////////////////

interface ProjectInfo {
    baseName: string;
    dirName: string;
    hasFlowSupport: boolean;
}

// ── Device Import types ──────────────────────────────────────────────

interface DeviceInfo {
    panel_id: number;
    panel_name: string;
    panel_serial_number: number;
    panel_ipaddress: string;
}

interface ImportHistoryEntry {
    deviceName: string;
    serialNumber: number;
    screenCount: number;
    timestamp: string;
    log: string[];
}

////////////////////////////////////////////////////////////////////////////////

class OpenProjectsStore {
    selectedMruItem: IMruItem | undefined;
    selectedProjectInfo: ProjectInfo | undefined;
    searchText: string = "";
    sortAlphabetically: boolean = false;

    constructor() {
        this.sortAlphabetically =
            localStorage.getItem("homeTabProjectsSort") == "alphabetically"
                ? true
                : false;

        makeObservable(this, {
            selectedMruItem: observable,
            selectedProjectInfo: observable,
            searchText: observable,
            sortAlphabetically: observable,
            mru: computed,
            mruAlpha: computed,
            allMruItems: computed,
            toggleSort: action,
            onSearchChange: action,
            removeFromList: action
        });

        autorun(async () => {
            const mruItem = this.selectedMruItem;

            if (mruItem) {
                const isProject = mruItem.filePath.endsWith(".eez-project");

                let extension = isProject ? ".eez-project" : ".eez-dashboard";

                const baseName = path.basename(mruItem.filePath, extension);

                const dirName = path.dirname(mruItem.filePath);

                runInAction(() => {
                    this.selectedProjectInfo = {
                        baseName,
                        dirName,
                        hasFlowSupport: mruItem.hasFlowSupport
                    };
                });

                try {
                    const jsonStr = await fs.promises.readFile(
                        mruItem.filePath,
                        "utf8"
                    );

                    await initProjectEditor(tabs, ProjectEditorTab);
                    const projectStore = ProjectStore.create({
                        type: "read-only"
                    });
                    const project = loadProject(projectStore, jsonStr, false);
                    projectStore.setProject(project, "");

                    runInAction(() => {
                        if (this.selectedProjectInfo) {
                            this.selectedProjectInfo.hasFlowSupport =
                                projectStore.projectTypeTraits.hasFlowSupport;
                        }
                    });
                } catch (err) {
                    console.error(err);
                }
            } else {
                runInAction(() => {
                    this.selectedProjectInfo = undefined;
                });
            }
        });
    }

    get mruAlpha() {
        const mru = [...settingsController.mru];
        mru.sort((mruItem1, mruItem2) => {
            const baseName1 = path.basename(mruItem1.filePath);
            const baseName2 = path.basename(mruItem2.filePath);
            return stringCompare(baseName1, baseName2);
        });
        return mru;
    }

    get mru() {
        return this.sortAlphabetically ? this.mruAlpha : settingsController.mru;
    }

    get allMruItems() {
        return openProjectsStore.mru
            .filter(
                mruItem =>
                    mruItem.filePath
                        .toLowerCase()
                        .indexOf(
                            openProjectsStore.searchText.trim().toLowerCase()
                        ) != -1
            )
            .map(mruItem => ({
                id: mruItem.filePath,
                data: mruItem,
                selected: mruItem == openProjectsStore.selectedMruItem
            }));
    }

    toggleSort = () => {
        this.sortAlphabetically = !this.sortAlphabetically;

        localStorage.setItem(
            "homeTabProjectsSort",
            this.sortAlphabetically ? "alphabetically" : "most-recent"
        );
    };

    onSearchChange = (event: any) => {
        this.searchText = $(event.target).val() as string;
        if (this.allMruItems.length > 0) {
            this.selectedMruItem = this.allMruItems[0].data;
        }
    };

    editProject = () => {
        if (this.selectedMruItem) {
            ipcRenderer.send("open-file", this.selectedMruItem!.filePath);
        }
    };

    runProject = () => {
        if (this.selectedMruItem && this.selectedMruItem.hasFlowSupport) {
            ipcRenderer.send("open-file", this.selectedMruItem!.filePath, true);
        }
    };

    copyProjectPath = () => {
        if (this.selectedMruItem) {
            clipboard.writeText(this.selectedMruItem.filePath);
        }
    };

    removeFromList = () => {
        if (openProjectsStore.selectedMruItem) {
            settingsController.removeItemFromMRU(
                openProjectsStore.selectedMruItem
            );

            openProjectsStore.selectedMruItem = undefined;
        }
    };
}

const openProjectsStore = new OpenProjectsStore();

////////////////////////////////////////////////////////////////////////////////
// Device Import Store
////////////////////////////////////////////////////////////////////////////////

class DeviceImportStore {
    devices: DeviceInfo[] = [];
    selectedDeviceId: number | null = null;
    importing: boolean = false;
    importLog: string[] = [];
    history: ImportHistoryEntry[] = [];
    showDrawer: boolean = false;

    constructor() {
        makeObservable(this, {
            devices: observable,
            selectedDeviceId: observable,
            importing: observable,
            importLog: observable,
            history: observable,
            showDrawer: observable,
        });
        this.loadHistory();
    }

    loadHistory() {
        try {
            this.history = JSON.parse(
                localStorage.getItem("deviceImportHistory") || "[]"
            );
        } catch {
            this.history = [];
        }
    }

    saveHistory() {
        localStorage.setItem("deviceImportHistory", JSON.stringify(this.history));
    }

    async fetchDevices() {
        try {
            const resp = await fetch("/api/devices");
            const json = await resp.json();
            runInAction(() => {
                this.devices = json.data || json.devices || [];
            });
        } catch {
            runInAction(() => {
                this.devices = [];
            });
        }
    }

    appendLog(msg: string) {
        runInAction(() => {
            this.importLog.push(msg);
        });
    }

    async startImport() {
        if (!this.selectedDeviceId) return;
        const device = this.devices.find(d => d.panel_id === this.selectedDeviceId);
        if (!device) return;

        runInAction(() => {
            this.importing = true;
            this.importLog = [];
            this.showDrawer = true;
        });

        try {
            this.appendLog(`📋 Importing from ${device.panel_name}`);
            this.appendLog(`   IP: ${device.panel_ipaddress}  SN: ${device.panel_serial_number}`);

            // Step 0 — Create project skeleton (design Step 3)
            const projectDir = `project/${device.panel_name}`;
            const stagingDir = `${projectDir}/device-import`;
            this.appendLog("⏳ Step 0 — Creating project folder...");
            await fetch(`/api/files/mkdir?path=${encodeURIComponent(stagingDir)}`, { method: "POST" });
            this.appendLog("✅ Step 0 — Project folder ready");

            // Step 1 — Connect (design Step 3 continued)
            this.appendLog("✅ Step 1 — Connected to device");

            // Step 2 — Fetch screens one-by-one (design Step 4)
            // Each screen saved to device-import/ immediately — safe if connection drops.
            // Re-import rebuilds from cache, no re-fetch needed.
            // TODO: Needs C++ READ_FIRMWARE (action=19) in HandleWebViewMsg()
            //       and Rust POST /api/devices/:id/read-firmware calling call_handle_webview_msg(19, &mut buffer)
            //       See docs/t3000/t3-eez-studio/device-interface-deployment-via-bacnet-design.md
            this.appendLog("⏳ Step 2 — Fetching screens...");
            const stagingScreens: { name: string; json: any }[] = [];
            let screenIndex = 0;
            while (true) {
                const resp = await fetch(
                    `/api/devices/${device.panel_id}/read-firmware`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ screenIndex }),
                    }
                );
                if (resp.status === 404) break; // no more screens
                if (!resp.ok) throw new Error(`Failed to fetch screen ${screenIndex}`);
                const result = await resp.json();
                const screen = result.screen;
                if (!screen) break;
                // Save to staging immediately — safe if connection drops later
                const screenPath = `${stagingDir}/${screen.name}.json`;
                await fetch(
                    `/api/files/write?path=${encodeURIComponent(screenPath)}`,
                    { method: "PUT", body: JSON.stringify(screen.json) }
                );
                stagingScreens.push(screen);
                const kb = Math.round(JSON.stringify(screen.json).length / 1024);
                this.appendLog(`   ${screen.name} — ${kb}KB ✓`);
                screenIndex++;
            }
            this.appendLog(`✅ Step 2 — Fetched ${stagingScreens.length} screens`);

            // Step 3 — Build .eez-project (design Step 5)
            this.appendLog("⏳ Step 3 — Building project...");
            const { firmwareToProject } = await import(
                "project-editor/build/firmware-loader"
            );
            const project = firmwareToProject(stagingScreens, {
                panel_name: device.panel_name,
                serial_number: device.panel_serial_number,
            });

            // Step 4 — Save to disk (design Step 5 continued)
            const projectPath = `project/${device.panel_name}/${device.panel_name}.eez-project`;
            const jsonStr = JSON.stringify(project, null, 2);
            const saveResp = await fetch(
                `/api/files/write?path=${encodeURIComponent(projectPath)}`,
                { method: "PUT", body: jsonStr }
            );
            if (!saveResp.ok) throw new Error("Failed to save project");
            this.appendLog(`✅ Step 4 — Project saved`);

            // Track imported project for badge display
            try {
                const paths: string[] = JSON.parse(
                    localStorage.getItem("importedProjectPaths") || "[]"
                );
                const fullPath = `${projectPath}`;
                if (!paths.includes(fullPath)) {
                    paths.push(fullPath);
                    localStorage.setItem("importedProjectPaths", JSON.stringify(paths));
                }
            } catch {}

            // Step 5 — Open in editor (design Step 6)
            this.appendLog("⏳ Step 5 — Opening editor...");
            // Add to MRU
            settingsController.addItemToMRU(projectPath, { projectType: "LVGL", hasFlowSupport: true });

            const readResp = await fetch(
                `/api/files/read?path=${encodeURIComponent(projectPath)}`
            );
            const projectJson = await readResp.json();

            await initProjectEditor(tabs, ProjectEditorTab);
            const store = ProjectStore.create({ type: "read-only" });
            const loaded = loadProject(store, JSON.stringify(projectJson), false);
            store.setProject(loaded, projectPath);
            tabs.openTab(ProjectEditorTab, { store });

            this.appendLog("✅ Done — Project opened");

            // Save history
            const entry: ImportHistoryEntry = {
                deviceName: device.panel_name,
                serialNumber: device.panel_serial_number,
                screenCount: stagingScreens.length,
                timestamp: new Date().toISOString(),
                log: this.importLog.slice(),
            };
            runInAction(() => {
                this.history.unshift(entry);
                this.history = this.history.slice(0, 20);
            });
            this.saveHistory();
        } catch (err: any) {
            this.appendLog(`❌ Failed: ${err.message || err}`);
        } finally {
            runInAction(() => {
                this.importing = false;
            });
        }
    }
}

const deviceImportStore = new DeviceImportStore();

////////////////////////////////////////////////////////////////////////////////

export const Projects = observer(
    class Projects extends React.Component {
        constructor(props: any) {
            super(props);
            deviceImportStore.fetchDevices();
        }

        onContextMenu = (node: IListNode<IMruItem>) => {
            runInAction(() => (openProjectsStore.selectedMruItem = node.data));

            const menu = new Menu();

            menu.append(
                new MenuItem({
                    label: "Edit Project",
                    click: openProjectsStore.editProject
                })
            );

            if (node.data.hasFlowSupport) {
                menu.append(
                    new MenuItem({
                        label: "Run Project",
                        click: openProjectsStore.runProject
                    })
                );
            }

            menu.append(
                new MenuItem({
                    label: "Copy Project Path",
                    click: openProjectsStore.copyProjectPath
                })
            );

            menu.append(
                new MenuItem({
                    label: "Remove From List",
                    click: openProjectsStore.removeFromList
                })
            );

            menu.popup();
        };

        render() {
            return (
                <div className="EezStudio_HomeTab_Projects_V2">
                    {/* ── Left Column: Recent Projects ── */}
                    <div className="v2-left-column">
                        <div className="v2-column-header">
                            <h3>📂 Recent Projects</h3>
                            <p className="v2-column-desc">
                                Open, edit, or run existing projects from disk.
                            </p>
                        </div>

                        <div className="EezStudio_HomeTab_Projects_Header">
                            <div style={{ width: 28, height: 28 }}></div>
                            <SearchInput
                                searchText={openProjectsStore.searchText}
                                onClear={action(() => {
                                    openProjectsStore.searchText = "";
                                })}
                                onChange={openProjectsStore.onSearchChange}
                                onKeyDown={openProjectsStore.onSearchChange}
                            />
                            <IconAction
                                icon={
                                    openProjectsStore.sortAlphabetically
                                        ? SORT_ALPHA_ICON
                                        : SORT_RECENT_ICON
                                }
                                title={
                                    openProjectsStore.sortAlphabetically
                                        ? "Sort alphabetically"
                                        : "Show most recent first"
                                }
                                onClick={openProjectsStore.toggleSort}
                            />
                        </div>
                        <div className="EezStudio_HomeTab_Projects_Body">
                            <div className="EezStudio_HomeTab_Projects_Space"></div>
                            <div className="EezStudio_HomeTab_Projects_Actions">
                                <ButtonAction
                                    className="btn-primary"
                                    text={"Open Project"}
                                    title="Open a local EEZ Studio Project"
                                    icon={HOME_TAB_OPEN_ICON}
                                    onClick={() => {
                                        ipcRenderer.send("open-project");
                                    }}
                                />
                            </div>
                            <ListContainer tabIndex={0}>
                                <List
                                    nodes={openProjectsStore.allMruItems}
                                    renderNode={(node: IListNode<IMruItem>) => {
                                        let mruItem = node.data;

                                        const isProject =
                                            mruItem.filePath.endsWith(
                                                ".eez-project"
                                            );

                                        let extension = isProject
                                            ? ".eez-project"
                                            : ".eez-dashboard";

                                        const baseName = path.basename(
                                            mruItem.filePath,
                                            extension
                                        );

                                        const importedPaths: string[] = JSON.parse(
                                            localStorage.getItem("importedProjectPaths") || "[]"
                                        );
                                        const isImported = importedPaths.includes(mruItem.filePath);

                                        return (
                                            <ListItem
                                                leftIcon={getProjectIcon(
                                                    mruItem.filePath,
                                                    mruItem.projectType,
                                                    48,
                                                    mruItem.hasFlowSupport
                                                )}
                                                leftIconSize={48}
                                                label={
                                                    <div
                                                        className="EezStudio_HomeTab_ProjectItem"
                                                        title={mruItem.filePath}
                                                    >
                                                        <div className="project-name">
                                                            <span className="fw-bolder">
                                                                {baseName}
                                                            </span>
                                                            <span>{extension}</span>
                                                        </div>
                                                        <div className="project-folder">
                                                            {path.dirname(
                                                                mruItem.filePath
                                                            )}
                                                        </div>
                                                        {isImported && (
                                                            <div className="v2-import-badge">
                                                                🔌 Imported from device
                                                            </div>
                                                        )}
                                                    </div>
                                                }
                                            />
                                        );
                                    }}
                                    selectNode={(node: IListNode<IMruItem>) => {
                                        runInAction(
                                            () =>
                                                (openProjectsStore.selectedMruItem =
                                                    node.data)
                                        );
                                    }}
                                    onContextMenu={this.onContextMenu}
                                    onDoubleClick={openProjectsStore.editProject}
                                ></List>
                            </ListContainer>
                            <ProjectInfo />
                        </div>
                    </div>

                    {/* ── Right Column: Load from Device ── */}
                    <div className="v2-right-column">
                        <div className="v2-column-header">
                            <h3>🔌 Load from Device</h3>
                            <p className="v2-column-desc">
                                Import screens from a T3000 hardware controller.
                            </p>
                        </div>

                        {deviceImportStore.showDrawer ? (
                            <DeviceImportDrawer />
                        ) : (
                            <DeviceListPanel />
                        )}

                        {/* ── Import History ── */}
                        {deviceImportStore.history.length > 0 && (
                            <div className="v2-import-history">
                                <hr />
                                <h4>📋 History</h4>
                                {deviceImportStore.history.map((entry, i) => (
                                    <div
                                        key={i}
                                        className="v2-history-item"
                                        onClick={() => {
                                            runInAction(() => {
                                                deviceImportStore.importLog = entry.log;
                                                deviceImportStore.showDrawer = true;
                                            });
                                        }}
                                        style={{ cursor: "pointer" }}
                                    >
                                        {entry.deviceName} · {entry.screenCount} screens ·{" "}
                                        {new Date(entry.timestamp).toLocaleDateString()}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
    }
);

// ── Device List Panel ─────────────────────────────────────────────────

const DeviceListPanel = observer(() => (
    <div className="v2-device-panel">
        {deviceImportStore.devices.length === 0 ? (
            <p className="v2-no-devices">No devices found. Check backend connection.</p>
        ) : (
            <div className="v2-device-list">
                {deviceImportStore.devices.map(d => (
                    <label
                        key={d.panel_id}
                        className={`v2-device-item ${
                            deviceImportStore.selectedDeviceId === d.panel_id
                                ? "selected"
                                : ""
                        }`}
                    >
                        <input
                            type="radio"
                            name="device"
                            value={d.panel_id}
                            checked={deviceImportStore.selectedDeviceId === d.panel_id}
                            onChange={() =>
                                runInAction(() => {
                                    deviceImportStore.selectedDeviceId = d.panel_id;
                                })
                            }
                        />
                        <span className="v2-device-name">{d.panel_name}</span>
                        <span className="v2-device-info">
                            {d.panel_ipaddress} &middot; SN: {d.panel_serial_number}
                        </span>
                    </label>
                ))}
            </div>
        )}
        <button
            className="btn btn-primary v2-import-btn"
            disabled={!deviceImportStore.selectedDeviceId || deviceImportStore.importing}
            onClick={() => deviceImportStore.startImport()}
        >
            {deviceImportStore.importing ? "Importing..." : "Import from Device"}
        </button>
    </div>
));

// ── Import Drawer ─────────────────────────────────────────────────────

const DeviceImportDrawer = observer(() => (
    <div className="v2-import-drawer">
        <div className="v2-drawer-header">
            <h4>📋 Import Log</h4>
            <button
                className="v2-drawer-close"
                onClick={() =>
                    runInAction(() => {
                        deviceImportStore.showDrawer = false;
                    })
                }
            >
                ✕
            </button>
        </div>
        <div className="v2-drawer-log">
            {deviceImportStore.importLog.map((line, i) => (
                <div key={i} className="v2-log-line">
                    {line}
                </div>
            ))}
        </div>
    </div>
));

// ── Project Info (unchanged from original) ───────────────────────────

export const ProjectInfo = observer(
    class ProjectInfo extends React.Component {
        render() {
            let info = openProjectsStore.selectedProjectInfo;
            if (!info) {
                return null;
            }

            return (
                <div className="EezStudio_HomeTab_Project_Info">
                    <div>
                        <span className="fw-bolder">{info.baseName}</span>
                    </div>
                    <div>{info.dirName}</div>
                    {info.hasFlowSupport && (
                        <div>
                            <button
                                className="btn btn-success"
                                onClick={openProjectsStore.runProject}
                            >
                                Run Project
                            </button>
                        </div>
                    )}
                </div>
            );
        }
    }
);
