import path from "path";
import fs from "fs";
import { clipboard, ipcRenderer } from "electron";
import { Menu, MenuItem } from "@electron/remote";
import React, { useEffect, useState } from "react";
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
    Popover,
    PopoverTrigger,
    PopoverSurface,
} from "@fluentui/react-components";
import {
    FolderOpenRegular,
    SearchRegular,
    ArrowSortDownRegular,
    ArrowSortUpRegular,
    ArrowDownloadRegular,
    ArrowClockwiseRegular,
    ArrowSyncRegular,
    PlugDisconnectedRegular,
    DismissRegular,
    HistoryRegular,
    PlayRegular,
    EditRegular,
    CopyRegular,
    DeleteRegular,
    InfoRegular,
} from "@fluentui/react-icons";

import { stringCompare } from "eez-studio-shared/string";
import { settingsController } from "home/settings";
import type { IMruItem } from "main/settings";
import { getProjectIcon } from "home/helper";
import { ProjectStore, loadProject } from "project-editor/store";
import { ProjectEditorTab, tabs } from "home/tabs-store";
import { initProjectEditor } from "project-editor/project-editor-bootstrap";
import type { LoadAllResponse } from "project-editor/build/device-rest-client";

////////////////////////////////////////////////////////////////////////////////
// Styles (Fluent tokens)
////////////////////////////////////////////////////////////////////////////////

const useStyles = makeStyles({
    root: {
        display: "flex",
        gap: tokens.spacingHorizontalXL,
        height: "100%",
        width: "100%",
        padding: tokens.spacingHorizontalL,
    },
    leftColumn: {
        flex: 0.45,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
        paddingRight: tokens.spacingHorizontalXL,
    },
    rightColumn: {
        flex: 0.55,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
    },
    columnHeader: {
        marginBottom: tokens.spacingVerticalL,
    },
    columnTitle: {
        marginBottom: "8px",
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
        scrollbarWidth: "thin",
        scrollbarColor: "#c1c1c1 transparent",
        "&::-webkit-scrollbar": { width: "6px" },
        "&::-webkit-scrollbar-thumb": { background: "#c1c1c1", borderRadius: "3px" },
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
    // ── Master-detail split inside left column ──
    leftColumnContent: {
        flex: 1,
        minHeight: 0,
        display: "flex",
        gap: 0,
    },
    leftColumnList: {
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        transition: "flex 0.2s",
    },
    leftColumnListNarrow: {
        flex: 1,
    },
    projectDetailPanel: {
        width: "220px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderLeft: `1px solid ${tokens.colorNeutralStroke1}`,
        paddingLeft: tokens.spacingHorizontalL,
        marginLeft: tokens.spacingHorizontalL,
    },
    projectDetailIcon: {
        width: "40px",
        height: "40px",
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
    projectDetailName: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        minWidth: 0,
        overflow: "hidden",
    },
    projectDetailActions: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalM,
        marginTop: tokens.spacingVerticalXL,
    },
    projectDetailAction: {
        display: "flex",
        gap: tokens.spacingHorizontalM,
        alignItems: "center",
        padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
        borderRadius: tokens.borderRadiusMedium,
        cursor: "pointer",
        transition: "background-color 0.15s",
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
        },
    },
    // ── Footer ──
    footer: {
        paddingTop: "4px",
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
        width: "100%",
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
        gap: tokens.spacingHorizontalM,
        padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
        borderRadius: tokens.borderRadiusMedium,
        cursor: "pointer",
        transition: "background-color 0.15s",
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
        },
    },
    deviceItemSelected: {
        backgroundColor: tokens.colorNeutralBackground1Selected,
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground1Selected,
        },
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
    removeDialogOpen: boolean = false;

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
            removeDialogOpen: observable,
            mru: computed,
            mruAlpha: computed,
            allMruItems: computed,
            toggleSort: action,
            onSearchChange: action,
            removeFromList: action,
            confirmRemove: action,
            cancelRemove: action
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
                    const projectJs = JSON.parse(jsonStr);
                    if (!projectJs || !projectJs.settings) {
                        // Corrupted or non-EEZ file — skip detail loading
                        return;
                    }
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
        // Open confirmation dialog instead of immediately removing
        if (openProjectsStore.selectedMruItem) {
            runInAction(() => {
                this.removeDialogOpen = true;
            });
        }
    };

    confirmRemove = async () => {
        const item = this.selectedMruItem;
        if (!item) return;

        // Clear selection IMMEDIATELY so no observer re-reads the deleted file
        runInAction(() => {
            this.removeDialogOpen = false;
            this.selectedMruItem = undefined;
            this.selectedProjectInfo = undefined;
        });

        // Remove from MRU list before deleting disk to prevent stale reads
        settingsController.removeItemFromMRU(item);

        // Delete the project folder from disk via backend
        const projectDir = path.dirname(item.filePath);
        try {
            await fetch(
                `/api/eez-studio/delete-recursive?path=${encodeURIComponent(projectDir)}`,
                { method: "DELETE" }
            );
        } catch (err) {
            console.error("Failed to delete project folder:", err);
        }
    };

    cancelRemove = () => {
        runInAction(() => {
            this.removeDialogOpen = false;
        });
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
            const apiBase = typeof window !== "undefined"
                ? `${window.location.protocol}//${window.location.hostname}:9103`
                : "http://localhost:9103";
            const resp = await fetch(`${apiBase}/api/t3_device/devices`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = await resp.json();
            const rawDevices: any[] = json.devices || [];
            runInAction(() => {
                this.devices = rawDevices
                    .filter((d: any) => {
                        const sn = d.serialNumber ?? d.SerialNumber ?? d.panel_serial_number;
                        return Number.isFinite(sn);
                    })
                    .map((d: any) => ({
                        panel_id: d.panelId ?? d.PanelId ?? d.panel_id ?? d.serialNumber ?? 0,
                        panel_name: d.nameShowOnTree ?? d.showLabelName ?? d.panel_name ?? "Unknown",
                        panel_serial_number: d.serialNumber ?? d.SerialNumber ?? d.panel_serial_number ?? 0,
                        panel_ipaddress: d.ipAddress ?? d.IP_Address ?? d.pcIpAddress ?? d.PC_IP_Address ?? d.panel_ipaddress ?? "",
                    }))
                    // Hide unknown devices — same logic as t3-react deviceTreeStore
                    .filter((d: any) =>
                        d.panel_name && d.panel_name !== "Unknown" && d.panel_name !== "(Unknown)"
                    );
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

    // ── Load screens via DeviceRestClient (mock or real, controlled by USE_MOCK constant) ──

    async startImport() {
        if (this.selectedDeviceId == null) return;
        const device = this.devices.find(d => d.panel_serial_number === this.selectedDeviceId);
        if (!device) return;

        runInAction(() => {
            this.importing = true;
            this.importLog = [];
            this.showDrawer = true;
        });

        try {
            this.appendLog(`📋 Importing from ${device.panel_name}`);
            this.appendLog(`   IP: ${device.panel_ipaddress || "(mock)"}  SN: ${device.panel_serial_number}`);

            // Step 0 — Create project skeleton
            const projectDir = `project/${device.panel_name}`;
            const stagingDir = `${projectDir}/device-import`;
            this.appendLog("⏳ Step 0 — Creating project folder...");
            await fetch(`/api/eez-studio/make-folder`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: stagingDir }),
            });
            this.appendLog("✅ Step 0 — Project folder ready");

            // Step 1 — Connect via DeviceRestClient (handles mock/real internally)
            this.appendLog("⏳ Step 1 — Connecting to device...");
            const { DeviceRestClient } = await import("project-editor/build/device-rest-client");
            const client = new DeviceRestClient();
            const conn = await client.connect(
                device.panel_ipaddress || "mock",
                device.panel_id,
                device.panel_serial_number
            );
            this.appendLog(`✅ Step 1 — Connected via ${conn.mode.toUpperCase()}`);

            // Step 2 — Get device summary (screen names, counts, etc.)
            this.appendLog("⏳ Step 2 — Fetching device info...");
            const info = await client.getDeviceInfo();
            this.appendLog(`✅ Step 2 — ${info.screen_count} screens, ${info.image_count} images, ${info.screen_size.width}x${info.screen_size.height}`);

            // Step 3 — Load each screen individually by name
            this.appendLog(`⏳ Step 3 — Loading ${info.screen_count} screens...`);
            const stagingScreens: { name: string; json: any }[] = [];

            for (const screenName of info.screens) {
                const screen = await client.loadScreen(screenName);
                const screenPath = `${stagingDir}/${screenName}.json`;
                await fetch(
                    `/api/eez-studio/write-file?path=${encodeURIComponent(screenPath)}`,
                    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(screen.json) }
                );
                stagingScreens.push(screen);
                const kb = Math.round(JSON.stringify(screen.json).length / 1024);
                this.appendLog(`   ${screen.name} — ${kb}KB ✓`);
            }
            this.appendLog(`✅ Step 3 — Loaded ${stagingScreens.length} screens`);

            // Step 4 — Build .eez-project
            this.appendLog("⏳ Step 4 — Building project...");
            const { firmwareToProject } = await import(
                "project-editor/build/firmware-loader"
            );
            const project = firmwareToProject(stagingScreens, {
                panel_name: device.panel_name,
                serial_number: device.panel_serial_number,
            }, {
                displaySize: { width: info.screen_size.width, height: info.screen_size.height },
                lvglVersion: info.lvgl_version,
                darkTheme: info.dark_theme,
                colorFormat: info.color_format,
            });

            // Step 5 — Save to disk
            const projectPath = `project/${device.panel_name}/${device.panel_name}.eez-project`;
            const jsonStr = JSON.stringify(project, null, 2);
            const saveResp = await fetch(
                `/api/eez-studio/write-text-file?path=${encodeURIComponent(projectPath)}`,
                { method: "POST", body: jsonStr }
            );
            if (!saveResp.ok) throw new Error("Failed to save project");
            this.appendLog(`✅ Step 5 — Project saved`);

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

            // Step 6 — Add to MRU and open in editor
            this.appendLog("⏳ Step 6 — Opening editor...");

            // Add to MRU so it appears in the recent projects list
            const mruEntry: IMruItem = {
                filePath: projectPath,
                projectType: "LVGL",
                hasFlowSupport: true,
            } as IMruItem;
            settingsController.mru.unshift(mruEntry);

            const readResp = await fetch(
                `/api/eez-studio/read-text-file?path=${encodeURIComponent(projectPath)}`
            );
            const projectText = await readResp.text();
            const projectJson = JSON.parse(projectText);

            await initProjectEditor(tabs, ProjectEditorTab);
            const store = ProjectStore.create({ type: "read-only" });
            const loaded = loadProject(store, JSON.stringify(projectJson), false);
            store.setProject(loaded, projectPath);

            // Open the project as a new editor tab
            const tab = tabs.addProjectTab(projectPath);
            if (tab) {
                tab.makeActive();
            }

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
                    <Text weight="semibold" style={{ fontSize: "13px" }}>{baseName}</Text>
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
                        style={{ fontSize: "10px", padding: "0 6px", height: "18px", gap: "2px" ,width:"90px"}}
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Text weight="semibold" style={{ fontSize: "13px" }}>
                            Recent Projects
                        </Text>
                        <Text size={200} className={styles.columnDesc}>
                            Open, edit, or run existing projects from disk.
                        </Text>
                    </div>
                    <Button
                        appearance="primary"
                        icon={<FolderOpenRegular />}
                        style={{ justifyContent: "flex-start", fontWeight: 400, color: "#fff", fontSize: "12px" }}
                        onClick={() => ipcRenderer.send("open-project")}
                    >
                        Open Project
                    </Button>
                </div>
            </div>

            {/* Search + Sort */}
            <style>{`.open-projects-search input::placeholder { font-size: 12px; }`}</style>
            <div className={styles.toolbar}>
                <Input
                    className={`open-projects-search ${styles.searchInput}`}
                    contentBefore={<SearchRegular fontSize={16} />}
                    placeholder="Search projects..."
                    size="small"
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

            {/* Master-detail body */}
            <div className={styles.leftColumnContent}>
                {/* Project list */}
                <div
                    className={mergeClasses(
                        styles.leftColumnList,
                        openProjectsStore.selectedProjectInfo && styles.leftColumnListNarrow
                    )}
                >
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
                </div>

                {/* Detail panel */}
                {openProjectsStore.selectedProjectInfo && (
                    <div className={styles.projectDetailPanel}>
                        <div style={{ display: "flex", gap: tokens.spacingHorizontalM, alignItems: "center" }}>
                            <div className={styles.projectDetailIcon}>
                                {getProjectIcon(
                                    openProjectsStore.selectedMruItem!.filePath,
                                    openProjectsStore.selectedMruItem!.projectType,
                                    40,
                                    openProjectsStore.selectedMruItem!.hasFlowSupport
                                )}
                            </div>
                            <div className={styles.projectDetailName}>
                                <Text weight="semibold" style={{ fontSize: "13px" }}>
                                    {openProjectsStore.selectedProjectInfo.baseName}
                                </Text>
                                <Text size={200} style={{ color: tokens.colorNeutralForeground3, wordBreak: "break-all" }}>
                                    {openProjectsStore.selectedMruItem!.filePath}
                                </Text>
                            </div>
                        </div>

                        <div className={styles.projectDetailActions}>
                            <Button
                                appearance="primary"
                                icon={<EditRegular fontSize={18} />}
                                onClick={openProjectsStore.editProject}
                                style={{ justifyContent: "flex-start", fontWeight: 400, color: "#fff", fontSize: "12px" }}
                            >
                                Edit Project
                            </Button>
                            <Button
                                icon={<CopyRegular fontSize={18} />}
                                onClick={openProjectsStore.copyProjectPath}
                                style={{
                                    justifyContent: "flex-start",
                                    fontWeight: 400,
                                    color: "#fff",
                                    fontSize: "12px",
                                    backgroundColor: "#6c757d",
                                    borderColor: "#5a6268",
                                }}
                            >
                                Copy Project Path
                            </Button>
                            {openProjectsStore.selectedProjectInfo.hasFlowSupport && (
                                <Button
                                    icon={<PlayRegular fontSize={18} />}
                                    onClick={openProjectsStore.runProject}
                                    style={{
                                        justifyContent: "flex-start",
                                        fontWeight: 400,
                                        color: "#fff",
                                        fontSize: "12px",
                                        backgroundColor: "#6c757d",
                                        borderColor: "#5a6268",
                                    }}
                                >
                                    Run Project
                                </Button>
                            )}
                            <Popover
                                open={openProjectsStore.removeDialogOpen}
                                onOpenChange={(_, data) => {
                                    if (!data.open) openProjectsStore.cancelRemove();
                                }}
                            >
                                <PopoverTrigger disableButtonEnhancement>
                                    <Button
                                        appearance="secondary"
                                        icon={<DeleteRegular fontSize={18} />}
                                        onClick={openProjectsStore.removeFromList}
                                        style={{
                                            justifyContent: "flex-start",
                                            fontWeight: 400,
                                            color: "#fff",
                                            fontSize: "12px",
                                            backgroundColor: "#d32f2f",
                                            borderColor: "#d32f2f",
                                        }}
                                    >
                                        Remove From List
                                    </Button>
                                </PopoverTrigger>
                                <PopoverSurface style={{ maxWidth: "260px", padding: 16, background: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", borderRadius: 8, border: "1px solid #e0e0e0" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        <Text weight="semibold" size={300}>Remove project?</Text>
                                        <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
                                            This will also permanently delete the project folder from disk.
                                        </Text>
                                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                            <Button size="small" appearance="outline" onClick={openProjectsStore.cancelRemove}>
                                                Cancel
                                            </Button>
                                            <Button
                                                size="small"
                                                appearance="primary"
                                                style={{ backgroundColor: "#d32f2f", color: "#fff" }}
                                                onClick={openProjectsStore.confirmRemove}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverSurface>
                            </Popover>
                        </div>
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
            </div>

            {deviceImportStore.devices.length === 0 ? (
                <div style={{ padding: "0", display: "flex", flexDirection: "column", alignItems: "stretch", gap: tokens.spacingVerticalM, width: "100%", flex: 1 }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 10px",
                        borderRadius: "4px",
                        background: "#f3f9fd",
                        width: "100%",
                    }}>
                        <InfoRegular style={{ fontSize: "13px", color: "#0f6cbd", flexShrink: 0 }} />
                        <Text size={200} style={{ fontSize: "12px", color: "#323130", lineHeight: 1.25 }}>
                            No devices found. Check backend connection.
                        </Text>
                    </div>
                    <Button
                        appearance="primary"
                        icon={<ArrowClockwiseRegular />}
                        onClick={() => deviceImportStore.fetchDevices()}
                        style={{ fontWeight: 400, fontSize: "13px", width: "100%" }}
                    >
                        Scan for Devices
                    </Button>
                    <div style={{
                        marginTop: tokens.spacingVerticalM,
                        display: "flex",
                        flexDirection: "column",
                        gap: tokens.spacingVerticalS,
                    }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: tokens.spacingHorizontalS }}>
                            <Text size={200} style={{ color: tokens.colorBrandForeground1, fontWeight: 600, minWidth: "20px" }}>1.</Text>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
                                Connect T3000 controller to the network
                            </Text>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: tokens.spacingHorizontalS }}>
                            <Text size={200} style={{ color: tokens.colorBrandForeground1, fontWeight: 600, minWidth: "20px" }}>2.</Text>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
                                Click <b>Scan for Devices</b> to discover controllers
                            </Text>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: tokens.spacingHorizontalS }}>
                            <Text size={200} style={{ color: tokens.colorBrandForeground1, fontWeight: 600, minWidth: "20px" }}>3.</Text>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
                                Select a device and click <b>Import from Device</b>
                            </Text>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.deviceList}>
                    {deviceImportStore.devices.map(d => (
                        <div
                            key={d.panel_serial_number}
                            className={mergeClasses(
                                styles.deviceItem,
                                deviceImportStore.selectedDeviceId === d.panel_serial_number && styles.deviceItemSelected
                            )}
                            onClick={() =>
                                runInAction(() => {
                                    deviceImportStore.selectedDeviceId = d.panel_serial_number;
                                })
                            }
                        >
                            <input
                                type="radio"
                                name="device"
                                value={d.panel_serial_number}
                                checked={deviceImportStore.selectedDeviceId === d.panel_serial_number}
                                onChange={() =>
                                    runInAction(() => {
                                        deviceImportStore.selectedDeviceId = d.panel_serial_number;
                                    })
                                }
                                style={{ accentColor: tokens.colorBrandStroke1 }}
                            />
                            <div>
                                <Text className={styles.deviceName} style={{ fontSize: "13px" }}>{d.panel_name}</Text>
                                <br />
                                <Text size={200} className={styles.deviceInfo}>
                                    {d.panel_ipaddress} · SN: {d.panel_serial_number}
                                </Text>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

// ── Import Progress Panel ─────────────────────────────────────────────

const DeviceImportPanel: React.FC = observer(() => {
    const styles = useStyles();
    const [parsedSteps, setParsedSteps] = useState<{ label: string; status: "pending" | "active" | "done" | "error" }[]>([]);

    useEffect(() => {
        const steps: { label: string; status: "pending" | "active" | "done" | "error" }[] = [];
        let currentStatus: "done" | "error" = "done";
        let hasActive = false;
        const doneSteps = new Set<string>();

        for (const line of deviceImportStore.importLog) {
            const doneMatch = line.match(/^✅\s*(.+)/);
            const activeMatch = line.match(/^⏳\s*(.+)/);
            const errorMatch = line.match(/^❌\s*(.+)/);

            if (doneMatch) {
                const label = doneMatch[1].replace(/^Step \d+\s*[—–-]\s*/, "").trim();
                if (!doneSteps.has(label)) {
                    doneSteps.add(label);
                    steps.push({ label, status: "done" });
                }
            } else if (activeMatch && !hasActive) {
                const label = activeMatch[1].replace(/^Step \d+\s*[—–-]\s*/, "").trim();
                if (!doneSteps.has(label)) {
                    steps.push({ label, status: "active" });
                    hasActive = true;
                }
            } else if (errorMatch) {
                currentStatus = "error";
            }
        }

        if (currentStatus === "error" && steps.length > 0) {
            steps[steps.length - 1] = { ...steps[steps.length - 1], status: "error" };
        }

        setParsedSteps(steps);
    }, [deviceImportStore.importLog.length]);

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: tokens.spacingVerticalM }}>
                <Text weight="semibold" style={{ fontSize: "13px" }}>
                    {deviceImportStore.importing ? "Importing..." : deviceImportStore.importLog.some(l => l.includes("❌")) ? "Import Failed" : "Import Complete"}
                </Text>
                {!deviceImportStore.importing && (
                    <Button
                        appearance="transparent"
                        icon={<DismissRegular />}
                        onClick={() => runInAction(() => { deviceImportStore.showDrawer = false; })}
                    />
                )}
            </div>

            {/* Steps */}
            <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "thin" }}>
                {parsedSteps.map((step, i) => (
                    <div key={i} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: tokens.spacingHorizontalM,
                        padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
                        borderRadius: tokens.borderRadiusMedium,
                        marginBottom: tokens.spacingVerticalXXS,
                    }}>
                        {/* Status icon */}
                        <div style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontSize: "12px",
                            fontWeight: 600,
                            ...(step.status === "done" ? { background: "#107c10", color: "#fff" } :
                                step.status === "active" ? { background: "#0f6cbd", color: "#fff" } :
                                step.status === "error" ? { background: "#d32f2f", color: "#fff" } :
                                { background: tokens.colorNeutralBackground2, color: tokens.colorNeutralForeground3 })
                        }}>
                            {step.status === "done" ? "✓" :
                             step.status === "active" ? <Spinner size="tiny" style={{ width: "14px", height: "14px" }} /> :
                             step.status === "error" ? "✕" :
                             i + 1}
                        </div>
                        <Text size={200} style={{
                            color: step.status === "done" ? tokens.colorNeutralForeground1 :
                                   step.status === "active" ? tokens.colorBrandForeground1 :
                                   step.status === "error" ? "#d32f2f" :
                                   tokens.colorNeutralForeground3,
                            fontWeight: step.status === "active" ? 600 : 400,
                        }}>
                            {step.label}
                        </Text>
                    </div>
                ))}
            </div>

            {/* Detail log */}
            <details style={{ marginTop: tokens.spacingVerticalM }}>
                <summary style={{ fontSize: "12px", color: tokens.colorNeutralForeground3, cursor: "pointer" }}>
                    Detail Log
                </summary>
                <div style={{
                    maxHeight: "120px",
                    overflowY: "auto",
                    marginTop: tokens.spacingVerticalS,
                    fontFamily: "monospace",
                    fontSize: "11px",
                    lineHeight: 1.6,
                    color: tokens.colorNeutralForeground2,
                    padding: tokens.spacingVerticalXS,
                    background: tokens.colorNeutralBackground2,
                    borderRadius: tokens.borderRadiusSmall,
                    scrollbarWidth: "thin",
                }}>
                    {deviceImportStore.importLog.map((line, i) => (
                        <div key={i} style={{ whiteSpace: "pre-wrap" }}>{line}</div>
                    ))}
                </div>
            </details>
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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Text weight="semibold" style={{ fontSize: "13px", whiteSpace: "nowrap" }}>
                                Load from Device
                            </Text>
                            <Text size={200} className={styles.columnDesc} style={{ whiteSpace: "nowrap" }}>
                                Import screens from a T3000 hardware controller.
                            </Text>
                        </div>
                        <Button
                            appearance="primary"
                            icon={deviceImportStore.importing ? undefined : <ArrowDownloadRegular />}
                            disabled={deviceImportStore.selectedDeviceId == null || deviceImportStore.importing}
                            onClick={() => deviceImportStore.startImport()}
                            style={{ justifyContent: "flex-start", fontWeight: 400, fontSize: "12px", color: "#fff", flexShrink: 0 }}
                        >
                            {deviceImportStore.importing ? "Importing..." : "Import from Device"}
                        </Button>
                    </div>
                </div>

                <div style={{ flex: 1, minHeight: 0, display: "flex", gap: tokens.spacingHorizontalL }}>
                    {/* Device list — always visible */}
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <DeviceListPanel />
                    </div>

                    {/* Import progress — side panel when importing */}
                    {deviceImportStore.showDrawer && (
                        <div style={{
                            width: "320px",
                            flexShrink: 0,
                            display: "flex",
                            flexDirection: "column",
                            borderLeft: `1px solid ${tokens.colorNeutralStroke1}`,
                            paddingLeft: tokens.spacingHorizontalM,
                        }}>
                            <DeviceImportPanel />
                        </div>
                    )}

                    {/* Import History */}
                    {deviceImportStore.history.length > 0 && (
                        <div style={{
                            width: "220px",
                            flexShrink: 0,
                            display: "flex",
                            flexDirection: "column",
                            borderLeft: `1px solid ${tokens.colorNeutralStroke1}`,
                            paddingLeft: tokens.spacingHorizontalM,
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXS, marginBottom: tokens.spacingVerticalS }}>
                                <HistoryRegular />
                                <Text weight="semibold" size={200}>History</Text>
                            </div>
                            <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "thin" }}>
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
