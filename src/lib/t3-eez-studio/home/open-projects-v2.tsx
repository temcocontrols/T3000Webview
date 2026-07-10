import path from "path";
import fs from "fs";
import { clipboard, ipcRenderer } from "electron";
import { Menu, MenuItem } from "@electron/remote";
import React, { useEffect } from "react";
import {
    computed,
    action,
    observable,
    runInAction,
    makeObservable,
    autorun
} from "mobx";
import { observer } from "mobx-react";

// ── Fluent UI v9 ─────────────────────────────────────────────────────
import {
    Button,
    Input,
    Text,
    Badge,
    Spinner,
    Divider,
    makeStyles,
    tokens,
    mergeClasses,
} from "@fluentui/react-components";
import {
    FolderOpenRegular,
    SearchRegular,
    ArrowSortDownRegular,
    ArrowSortUpRegular,
    ArrowDownloadRegular,
    ArrowSyncRegular,
    PlugDisconnectedRegular,
    DismissRegular,
    HistoryRegular,
    PlayRegular,
} from "@fluentui/react-icons";

import { stringCompare } from "eez-studio-shared/string";
import { settingsController } from "home/settings";
import type { IMruItem } from "main/settings";
import { getProjectIcon } from "home/helper";
import { ProjectStore, loadProject } from "project-editor/store";
import { ProjectEditorTab, tabs } from "home/tabs-store";
import { initProjectEditor } from "project-editor/project-editor-bootstrap";

////////////////////////////////////////////////////////////////////////////////
// Styles (Fluent tokens)
////////////////////////////////////////////////////////////////////////////////

const useStyles = makeStyles({
    root: {
        display: "flex",
        gap: tokens.spacingHorizontalXL,
        height: "100%",
        padding: tokens.spacingHorizontalL,
    },
    leftColumn: {
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
        paddingRight: tokens.spacingHorizontalXL,
    },
    rightColumn: {
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
    },
    columnHeader: {
        marginBottom: tokens.spacingVerticalL,
    },
    columnTitle: {
        marginBottom: tokens.spacingVerticalXXS,
    },
    columnDesc: {
        color: tokens.colorNeutralForeground3,
    },
    // ── Search + Sort bar ──
    toolbar: {
        display: "flex",
        gap: tokens.spacingHorizontalS,
        alignItems: "center",
        marginBottom: tokens.spacingVerticalM,
    },
    searchInput: {
        flex: 1,
    },
    // ── Project list ──
    projectList: {
        flex: 1,
        overflowY: "auto",
        marginBottom: tokens.spacingVerticalM,
    },
    projectItem: {
        display: "flex",
        gap: tokens.spacingHorizontalM,
        alignItems: "center",
        padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
        borderRadius: tokens.borderRadiusMedium,
        cursor: "pointer",
        transition: "background-color 0.15s",
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
        },
    },
    projectItemSelected: {
        backgroundColor: tokens.colorNeutralBackground1Selected,
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground1Selected,
        },
    },
    projectIcon: {
        width: "48px",
        height: "48px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: tokens.borderRadiusMedium,
        backgroundColor: tokens.colorNeutralBackground2,
        overflow: "hidden",
        "& img": {
            width: "100%",
            height: "100%",
            objectFit: "contain",
        },
    },
    projectMeta: {
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: "2px",
    },
    projectName: {
        display: "flex",
        gap: tokens.spacingHorizontalXS,
        alignItems: "baseline",
    },
    projectFolder: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    // ── Footer ──
    footer: {
        padding: `${tokens.spacingVerticalM} 0`,
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
    },
    footerButton: {
        width: "100%",
    },
    projectInfo: {
        padding: tokens.spacingVerticalM,
        borderRadius: tokens.borderRadiusMedium,
        backgroundColor: tokens.colorNeutralBackground2,
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXXS,
    },
    // ── Device panel ──
    devicePanel: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
    },
    devicePanelHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: tokens.spacingVerticalS,
    },
    deviceCount: {
        color: tokens.colorNeutralForeground3,
    },
    noDevices: {
        color: tokens.colorNeutralForeground3,
        fontStyle: "italic",
        padding: tokens.spacingVerticalL,
    },
    deviceList: {
        flex: 1,
        overflowY: "auto",
        marginBottom: tokens.spacingVerticalM,
    },
    deviceItem: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
        padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
        borderRadius: tokens.borderRadiusMedium,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        marginBottom: tokens.spacingVerticalS,
        cursor: "pointer",
        transition: "border-color 0.15s, background-color 0.15s",
        "&:hover": {
            borderColor: tokens.colorBrandStroke1,
        },
    },
    deviceItemSelected: {
        borderColor: tokens.colorBrandStroke1,
        backgroundColor: tokens.colorBrandBackground,
    },
    deviceName: {
        fontWeight: "600",
    },
    deviceInfo: {
        color: tokens.colorNeutralForeground3,
    },
    importBtn: {
        marginTop: "auto",
        width: "100%",
    },
    // ── Import drawer ──
    importDrawer: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        borderRadius: tokens.borderRadiusMedium,
        overflow: "hidden",
    },
    drawerHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    drawerLog: {
        flex: 1,
        overflowY: "auto",
        padding: tokens.spacingHorizontalM,
        fontFamily: "monospace",
        fontSize: "12px",
        lineHeight: "1.6",
    },
    logLine: {
        whiteSpace: "pre-wrap",
    },
    // ── History ──
    historySection: {
        marginTop: tokens.spacingVerticalL,
    },
    historyItem: {
        cursor: "pointer",
        padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
        borderRadius: tokens.borderRadiusSmall,
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
        },
    },
});

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

            // Step 0 — Create project skeleton
            const projectDir = `project/${device.panel_name}`;
            const stagingDir = `${projectDir}/device-import`;
            this.appendLog("⏳ Step 0 — Creating project folder...");
            await fetch(`/api/files/mkdir?path=${encodeURIComponent(stagingDir)}`, { method: "POST" });
            this.appendLog("✅ Step 0 — Project folder ready");

            // Step 1 — Connect via REST (primary) or BACnet (fallback)
            const { DeviceRestClient } = await import("project-editor/build/device-rest-client");
            const client = new DeviceRestClient();
            const conn = await client.connect(
                device.panel_ipaddress,
                device.panel_id,
                device.panel_serial_number
            );
            this.appendLog(`✅ Step 1 — Connected via ${conn.mode.toUpperCase()}`);
            if (conn.error) {
                throw new Error(conn.error);
            }

            // Step 2 — Fetch all screens in one call
            this.appendLog("⏳ Step 2 — Fetching screens...");
            const result = await client.loadAllScreens();
            const stagingScreens: { name: string; json: any }[] = [];

            for (const screen of result.screens) {
                const screenPath = `${stagingDir}/${screen.name}.json`;
                await fetch(
                    `/api/files/write?path=${encodeURIComponent(screenPath)}`,
                    { method: "PUT", body: JSON.stringify(screen.json) }
                );
                stagingScreens.push(screen);
                const kb = Math.round(JSON.stringify(screen.json).length / 1024);
                this.appendLog(`   ${screen.name} — ${kb}KB ✓`);
            }
            this.appendLog(`✅ Step 2 — Fetched ${stagingScreens.length} screens`);

            // Step 3 — Build .eez-project
            this.appendLog("⏳ Step 3 — Building project...");
            const { firmwareToProject } = await import(
                "project-editor/build/firmware-loader"
            );
            const project = firmwareToProject(stagingScreens, {
                panel_name: device.panel_name,
                serial_number: device.panel_serial_number,
            });

            // Step 4 — Save to disk
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
                if (!paths.includes(projectPath)) {
                    paths.push(projectPath);
                    localStorage.setItem("importedProjectPaths", JSON.stringify(paths));
                }
            } catch {}

            // Step 5 — Open in editor
            this.appendLog("⏳ Step 5 — Opening editor...");
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
// Components
////////////////////////////////////////////////////////////////////////////////

// ── Project List Item ─────────────────────────────────────────────────

const ProjectListItem: React.FC<{
    mruItem: IMruItem;
    isSelected: boolean;
    onClick: () => void;
    onDoubleClick: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}> = observer(({ mruItem, isSelected, onClick, onDoubleClick, onContextMenu }) => {
    const styles = useStyles();

    const isProject = mruItem.filePath.endsWith(".eez-project");
    const extension = isProject ? ".eez-project" : ".eez-dashboard";
    const baseName = path.basename(mruItem.filePath, extension);

    const importedPaths: string[] = JSON.parse(
        localStorage.getItem("importedProjectPaths") || "[]"
    );
    const isImported = importedPaths.includes(mruItem.filePath);

    return (
        <div
            className={mergeClasses(
                styles.projectItem,
                isSelected && styles.projectItemSelected
            )}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
        >
            <div className={styles.projectIcon}>
                {getProjectIcon(
                    mruItem.filePath,
                    mruItem.projectType,
                    48,
                    mruItem.hasFlowSupport
                )}
            </div>
            <div className={styles.projectMeta}>
                <div className={styles.projectName}>
                    <Text weight="semibold">{baseName}</Text>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                        {extension}
                    </Text>
                </div>
                <Text size={200} className={styles.projectFolder} style={{ color: tokens.colorNeutralForeground3 }}>
                    {path.dirname(mruItem.filePath)}
                </Text>
                {isImported && (
                    <Badge
                        appearance="tint"
                        icon={<PlugDisconnectedRegular />}
                        size="small"
                    >
                        Imported
                    </Badge>
                )}
            </div>
        </div>
    );
});

// ── Left Column: Recent Projects ──────────────────────────────────────

const RecentProjectsColumn: React.FC = observer(() => {
    const styles = useStyles();

    const onContextMenu = (node: { data: IMruItem }) => {
        runInAction(() => (openProjectsStore.selectedMruItem = node.data));

        const menu = new Menu();
        menu.append(new MenuItem({
            label: "Edit Project",
            click: openProjectsStore.editProject
        }));
        if (node.data.hasFlowSupport) {
            menu.append(new MenuItem({
                label: "Run Project",
                click: openProjectsStore.runProject
            }));
        }
        menu.append(new MenuItem({
            label: "Copy Project Path",
            click: openProjectsStore.copyProjectPath
        }));
        menu.append(new MenuItem({
            label: "Remove From List",
            click: openProjectsStore.removeFromList
        }));
        menu.popup();
    };

    return (
        <div className={styles.leftColumn}>
            <div className={styles.columnHeader}>
                <Text size={500} weight="semibold" className={styles.columnTitle}>
                    Recent Projects
                </Text>
                <Text size={200} className={styles.columnDesc}>
                    Open, edit, or run existing projects from disk.
                </Text>
            </div>

            {/* Search + Sort */}
            <div className={styles.toolbar}>
                <Input
                    className={styles.searchInput}
                    contentBefore={<SearchRegular />}
                    placeholder="Search projects..."
                    value={openProjectsStore.searchText}
                    onChange={(e) => {
                        runInAction(() => {
                            openProjectsStore.searchText = e.target.value;
                        });
                    }}
                />
                <Button
                    appearance="transparent"
                    icon={openProjectsStore.sortAlphabetically ? <ArrowSortDownRegular /> : <ArrowSortUpRegular />}
                    title={openProjectsStore.sortAlphabetically
                        ? "Sort alphabetically"
                        : "Show most recent first"}
                    onClick={openProjectsStore.toggleSort}
                />
            </div>

            {/* Project list */}
            <div className={styles.projectList}>
                {openProjectsStore.allMruItems.map(node => (
                    <ProjectListItem
                        key={node.id}
                        mruItem={node.data}
                        isSelected={node.selected}
                        onClick={() =>
                            runInAction(() => {
                                openProjectsStore.selectedMruItem = node.data;
                            })
                        }
                        onDoubleClick={openProjectsStore.editProject}
                        onContextMenu={() => onContextMenu(node)}
                    />
                ))}
                {openProjectsStore.allMruItems.length === 0 && (
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3, padding: tokens.spacingVerticalL }}>
                        {openProjectsStore.searchText
                            ? "No matching projects."
                            : "No recent projects."}
                    </Text>
                )}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
                <Button
                    appearance="primary"
                    icon={<FolderOpenRegular />}
                    className={styles.footerButton}
                    onClick={() => ipcRenderer.send("open-project")}
                >
                    Open Project
                </Button>
                {openProjectsStore.selectedProjectInfo && (
                    <div className={styles.projectInfo}>
                        <Text weight="semibold">
                            {openProjectsStore.selectedProjectInfo.baseName}
                        </Text>
                        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                            {openProjectsStore.selectedProjectInfo.dirName}
                        </Text>
                        {openProjectsStore.selectedProjectInfo.hasFlowSupport && (
                            <Button
                                appearance="primary"
                                icon={<PlayRegular />}
                                size="small"
                                onClick={openProjectsStore.runProject}
                            >
                                Run Project
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

// ── Device List Panel ─────────────────────────────────────────────────

const DeviceListPanel: React.FC = observer(() => {
    const styles = useStyles();

    return (
        <div className={styles.devicePanel}>
            <div className={styles.devicePanelHeader}>
                <Text size={200} className={styles.deviceCount}>
                    {deviceImportStore.devices.length > 0
                        ? `${deviceImportStore.devices.length} device${deviceImportStore.devices.length !== 1 ? "s" : ""} found`
                        : ""}
                </Text>
                <Button
                    appearance="transparent"
                    icon={<ArrowSyncRegular />}
                    title="Refresh device list"
                    onClick={() => deviceImportStore.fetchDevices()}
                />
            </div>

            {deviceImportStore.devices.length === 0 ? (
                <Text size={200} className={styles.noDevices}>
                    No devices found. Check backend connection.
                </Text>
            ) : (
                <div className={styles.deviceList}>
                    {deviceImportStore.devices.map(d => (
                        <div
                            key={d.panel_id}
                            className={mergeClasses(
                                styles.deviceItem,
                                deviceImportStore.selectedDeviceId === d.panel_id && styles.deviceItemSelected
                            )}
                            onClick={() =>
                                runInAction(() => {
                                    deviceImportStore.selectedDeviceId = d.panel_id;
                                })
                            }
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
                                style={{ accentColor: tokens.colorBrandStroke1 }}
                            />
                            <div>
                                <Text className={styles.deviceName}>{d.panel_name}</Text>
                                <br />
                                <Text size={200} className={styles.deviceInfo}>
                                    {d.panel_ipaddress} · SN: {d.panel_serial_number}
                                </Text>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Button
                appearance="primary"
                icon={deviceImportStore.importing ? <Spinner size="tiny" /> : <ArrowDownloadRegular />}
                className={styles.importBtn}
                disabled={!deviceImportStore.selectedDeviceId || deviceImportStore.importing}
                onClick={() => deviceImportStore.startImport()}
            >
                {deviceImportStore.importing ? "Importing..." : "Import from Device"}
            </Button>
        </div>
    );
});

// ── Import Drawer ─────────────────────────────────────────────────────

const DeviceImportDrawer: React.FC = observer(() => {
    const styles = useStyles();

    return (
        <div className={styles.importDrawer}>
            <div className={styles.drawerHeader}>
                <Text weight="semibold">Import Log</Text>
                <Button
                    appearance="transparent"
                    icon={<DismissRegular />}
                    onClick={() =>
                        runInAction(() => {
                            deviceImportStore.showDrawer = false;
                        })
                    }
                />
            </div>
            <div className={styles.drawerLog}>
                {deviceImportStore.importLog.map((line, i) => (
                    <div key={i} className={styles.logLine}>
                        {line}
                    </div>
                ))}
            </div>
        </div>
    );
});

// ── Main Page ─────────────────────────────────────────────────────────

export const Projects: React.FC = observer(() => {
    const styles = useStyles();

    useEffect(() => {
        deviceImportStore.fetchDevices();
    }, []);

    return (
        <div className={styles.root}>
            <RecentProjectsColumn />
            <div className={styles.rightColumn}>
                <div className={styles.columnHeader}>
                    <Text size={500} weight="semibold" className={styles.columnTitle}>
                        Load from Device
                    </Text>
                    <Text size={200} className={styles.columnDesc}>
                        Import screens from a T3000 hardware controller.
                    </Text>
                </div>

                {deviceImportStore.showDrawer ? (
                    <DeviceImportDrawer />
                ) : (
                    <DeviceListPanel />
                )}

                {/* Import History */}
                {deviceImportStore.history.length > 0 && (
                    <div className={styles.historySection}>
                        <Divider />
                        <div style={{ display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXS, margin: `${tokens.spacingVerticalS} 0` }}>
                            <HistoryRegular />
                            <Text weight="semibold" size={200}>History</Text>
                        </div>
                        {deviceImportStore.history.map((entry, i) => (
                            <div
                                key={i}
                                className={styles.historyItem}
                                onClick={() => {
                                    runInAction(() => {
                                        deviceImportStore.importLog = entry.log;
                                        deviceImportStore.showDrawer = true;
                                    });
                                }}
                            >
                                <Text size={200}>
                                    {entry.deviceName} · {entry.screenCount} screens ·{" "}
                                    {new Date(entry.timestamp).toLocaleDateString()}
                                </Text>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});
