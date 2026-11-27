/**
 * DeployDeviceDrawer — single reusable "Deploy to Device" UI (Fluent UI drawer).
 *
 * Shown by BOTH the EEZ editor toolbar and the Design Hub project detail page,
 * so every deploy entry point uses the same UI + logic:
 *   - top: project info + status badge
 *   - middle: device picker (grouped by building, online first, offline collapsible)
 *   - deploy button + inline progress/result
 *   - bottom: deploy log history (designHubService.listDeployLogs)
 *
 * Deploy execution is delegated to deployService.deployEezProject() for EEZ/LVGL
 * projects; hosts can pass an `onDeploy` fallback for non-EEZ types (e.g. HVAC).
 *
 * The log below is this drawer's own — a factory reset written by the sibling
 * *Reset Device UI* drawer also lands here (tagged `RESET`), because it is device
 * history the deploy drawer is the place to read.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
    Button,
    Drawer,
    DrawerBody,
    DrawerHeader,
    DrawerHeaderTitle,
    FluentProvider,
    webLightTheme,
    Spinner,
    Tooltip,
} from "@fluentui/react-components";
import {
    DismissRegular,
    RocketRegular,
    CheckmarkCircleRegular,
    DismissCircleRegular,
    Desktop20Regular,
    ChevronDownRegular,
    ChevronRightRegular,
    WarningRegular,
    ArrowResetRegular,
} from "@fluentui/react-icons";
import type { DeployLogEntry, DeployStepInfo } from "../types";
import type { CompatReport } from "project-editor/build/device-compat";
import { designHubService } from "../services/designHubService";
import {
    DeployDevice as DeployDeviceType,
    DeployTarget,
    deployEezProject,
    fetchDeployDevices,
    readPanelUiMode,
    setPanelUiMode,
} from "../services/deployService";
import type { UiMode, UiModeState } from "../services/deployService";
import styles from "../pages/DesignHubPage.module.css";

/** Minimal project shape the drawer needs (HubProject is compatible). */
export interface DeployProjectInfo {
    id: string;
    name: string;
    engine: "eez" | "hvac" | "simulator" | "hub";
    folder?: string;
    serialNumber?: number;
    lvglVersion?: string;
    pages?: number;
    widgets?: number;
    fileSize?: number;
    status?: string;
    building?: string;
    floor?: string;
    room?: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    project: DeployProjectInfo;
    /** In-memory EEZ project (editor); service loads from disk when omitted. */
    eezProject?: any;
    /** EEZ project file path; for the hub it's derived from project.folder. */
    filePath?: string;
    /** Fallback executor for non-EEZ project engines (e.g. HVAC refresh). */
    onDeploy?: (device: DeployTarget) => Promise<{ success: boolean; message: string }>;
    /** Called after a deploy attempt finishes (for host-side refresh). */
    onDeployed?: (result: { success: boolean; message: string }) => void;
    /** Persist the in-memory EEZ project to disk before pushing (editor path).
     *  Runs as the first, logged deploy step. */
    onSaveProject?: () => Promise<void>;
    /** Host hook for the "Reset Device UI" link (opens the sibling drawer). */
    onOpenReset?: () => void;
}

const statusBadge = (status?: string) => {
    if (status === "deployed") {
        return (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#25632d", background: "#e9f4ea", borderRadius: 999, padding: "3px 10px" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2e9b4f" }} /> Deployed
            </span>
        );
    }
    if (status === "bound") {
        return (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#0f5fa8", background: "#e8f2fb", borderRadius: 999, padding: "3px 10px" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0078d4" }} /> Bound
            </span>
        );
    }
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#6b7f94", background: "#eef1f6", borderRadius: 999, padding: "3px 10px" }}>
            Not deployed
        </span>
    );
};

/** The panel's tri-state UI switch, in the order the drawer shows it. */
const UI_MODES = ["auto", "json", "compiled"] as const;

const UI_MODE_HINT: Record<(typeof UI_MODES)[number], string> = {
    auto: "Compiled UI until a screen set is deployed, then draw the deployed screens.",
    json: "Always draw the deployed screens.",
    compiled: "Ignore the deployed screens and keep the built-in design.",
};

/** Plain-language version of what the panel is doing with the deployed screens. */
function uiModeNote(state: UiModeState | null, hasDevice: boolean, online: boolean): string {
    if (!hasDevice) return "Pick a device to read its UI mode.";
    if (!online) return "This device is offline — connect it to read or change its UI mode.";
    if (!state) return "";
    if (state.mode_failed) {
        return "auto wanted the deployed screens but could not serve them — the panel fell back to the compiled UI.";
    }
    if (state.mode === "auto") {
        return state.ui_mode === "json"
            ? "auto · a screen set is deployed, so the panel is drawing it."
            : "auto · no usable screen set yet, so the panel is on the compiled UI.";
    }
    if (state.mode === "compiled") {
        return "Compiled · the deployed screens are ignored.";
    }
    return "JSON · the panel draws the deployed screens only.";
}

function timeAgo(iso: string): string {
    try {
        const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
        if (s < 60) return `${s}s ago`;
        if (s < 3600) return `${Math.floor(s / 60)}m ago`;
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
        return `${Math.floor(s / 86400)}d ago`;
    } catch {
        return "";
    }
}

const DeployLogRow: React.FC<{
    log: DeployLogEntry;
    open: boolean;
    onToggle: () => void;
}> = ({ log, open, onToggle }) => {
    const hasDetail =
        (log.screens && log.screens.length > 0) ||
        (log.images && log.images.length > 0) ||
        (log.steps && log.steps.length > 0);
    return (
        <div style={{ borderRadius: 8, marginBottom: 6, background: "#fff" }}>
            <div
                onClick={onToggle}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer", userSelect: "none" }}
            >
                {log.status === "success" ? (
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2e9b4f", flexShrink: 0 }} />
                ) : log.status === "error" ? (
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#d13438", flexShrink: 0 }} />
                ) : (
                    <WarningRegular style={{ fontSize: 13, color: "#b8860b", flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 12, color: "#1c2b3a", fontWeight: 600, flexShrink: 0 }}>{timeAgo(log.timestamp)}</span>
                {/* A factory reset shares the log with deploys — mark it, or the
                    row reads as a deploy that returned no screens. */}
                {log.kind === "reset" && (
                    <span
                        style={{
                            fontSize: 10,
                            fontWeight: 700,
                            flexShrink: 0,
                            color: "#8a5a00",
                            background: "#fff4d6",
                            borderRadius: 3,
                            padding: "1px 4px",
                        }}
                    >
                        RESET
                    </span>
                )}
                <span style={{ fontSize: 12, color: "#4a5a6c", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.deviceName ? `${log.deviceName} (SN ${log.serialNumber})` : log.serialNumber ? `SN ${log.serialNumber}` : ""}
                    {" — "}
                    {log.message}
                </span>
                {hasDetail &&
                    (open ? (
                        <ChevronDownRegular style={{ fontSize: 12, flexShrink: 0 }} />
                    ) : (
                        <ChevronRightRegular style={{ fontSize: 12, flexShrink: 0 }} />
                    ))}
            </div>
            {open && hasDetail && (
                <div style={{ borderTop: "1px solid #eef1f6", padding: "8px 12px", background: "#f8fafc", fontSize: 12, color: "#4a5a6c", lineHeight: 1.6 }}>
                    {log.steps && log.steps.length > 0 && (
                        <div style={{ marginBottom: 6 }}>
                            <div style={{ fontWeight: 600, color: "#1c2b3a", marginBottom: 4 }}>Steps</div>
                            {log.steps.map((s) => (
                                <div key={s.id} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                                    <span style={{ color: s.status === "error" ? "#d13438" : s.status === "skipped" ? "#b8860b" : "#2e9b4f" }}>
                                        {s.status === "error" ? "✖" : s.status === "skipped" ? "—" : "✔"}
                                    </span>
                                    <span>{s.label}</span>
                                    {s.detail && <span style={{ color: "#7a8699" }}>· {s.detail}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                    {log.screens && log.screens.length > 0 && (
                        <div style={{ marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: "#1c2b3a" }}>Screens ({log.screens.length}): </span>
                            {log.screens.join(", ")}
                        </div>
                    )}
                    {log.images && log.images.length > 0 && (
                        <div>
                            <span style={{ fontWeight: 600, color: "#1c2b3a" }}>Images ({log.images.length}): </span>
                            {log.images.map((img) => `${img.name} (${img.width}×${img.height})`).join(", ")}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const DeployDeviceDrawer: React.FC<Props> = ({
    open,
    onClose,
    project,
    eezProject,
    filePath,
    onDeploy,
    onDeployed,
    onSaveProject,
    onOpenReset,
}) => {
    const [devices, setDevices] = useState<DeployDeviceType[]>([]);
    const [loadingDevices, setLoadingDevices] = useState(false);
    const [deviceSerial, setDeviceSerial] = useState<number | "">("");
    const [deploying, setDeploying] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        message: string;
        compatibility?: CompatReport;
    } | null>(null);
    const [logs, setLogs] = useState<DeployLogEntry[]>([]);
    const [expandedLog, setExpandedLog] = useState<number | null>(0);
    const [showOffline, setShowOffline] = useState(false);
    const [steps, setSteps] = useState<DeployStepInfo[]>([]);
    /** Tri-state UI mode of the picked device (auto | json | compiled). */
    const [uiMode, setUiMode] = useState<UiModeState | null>(null);
    const [uiModeBusy, setUiModeBusy] = useState(false);
    const [uiModeError, setUiModeError] = useState<string | null>(null);

    const reloadLogs = () => {
        setLogs(designHubService.listDeployLogs(project.id));
        setExpandedLog(0);
    };

    useEffect(() => {
        if (open) {
            setResult(null);
            setDeploying(false);
            setSteps([]);
            setLoadingDevices(true);
            setDeviceSerial("");
            fetchDeployDevices()
                .then((list) => {
                    setDevices(list);
                    if (project.serialNumber && list.some((d) => d.serialNumber === project.serialNumber)) {
                        setDeviceSerial(project.serialNumber!);
                    }
                })
                .finally(() => setLoadingDevices(false));
            reloadLogs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, project.id, project.serialNumber]);

    const { onlineGroups, offlineList } = useMemo(() => {
        const online = devices.filter((d) => d.online);
        const offline = devices.filter((d) => !d.online);
        const map = new Map<string, DeployDeviceType[]>();
        for (const d of online) {
            const b = d.building || "Unassigned";
            if (!map.has(b)) map.set(b, []);
            map.get(b)!.push(d);
        }
        for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
        const groups = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        offline.sort((a, b) => a.name.localeCompare(b.name));
        return { onlineGroups: groups, offlineList: offline };
    }, [devices]);

    const selectedDevice = useMemo(
        () => devices.find((d) => d.serialNumber === deviceSerial) ?? null,
        [devices, deviceSerial]
    );

    // Read the panel's UI mode when the picked device changes. A failure here is
    // not a deploy failure — older firmware has no /ui-mode at all.
    useEffect(() => {
        setUiMode(null);
        setUiModeError(null);
        if (!open || !selectedDevice?.ip || !selectedDevice.online) return;
        let cancelled = false;
        setUiModeBusy(true);
        readPanelUiMode({
            serialNumber: selectedDevice.serialNumber,
            ip: selectedDevice.ip,
            panelId: selectedDevice.panelId,
        })
            .then((state) => {
                if (!cancelled) setUiMode(state);
            })
            .catch((e: any) => {
                if (!cancelled) setUiModeError(e?.message || String(e));
            })
            .finally(() => {
                if (!cancelled) setUiModeBusy(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open, selectedDevice]);

    const handleUiMode = async (mode: UiMode) => {
        if (!selectedDevice?.ip || !selectedDevice.online || uiModeBusy) return;
        setUiModeBusy(true);
        setUiModeError(null);
        try {
            const next = await setPanelUiMode(
                {
                    serialNumber: selectedDevice.serialNumber,
                    ip: selectedDevice.ip,
                    panelId: selectedDevice.panelId,
                },
                mode
            );
            setUiMode(next);
        } catch (e: any) {
            setUiModeError(e?.message || String(e));
        } finally {
            setUiModeBusy(false);
        }
    };

    const handleDeploy = async () => {
        if (!deviceSerial) {
            setResult({ success: false, message: "Select a device first." });
            return;
        }
        const dev = devices.find((d) => d.serialNumber === deviceSerial);
        if (!dev) return;
        setSteps([]);
        const target: DeployTarget = {
            serialNumber: dev.serialNumber,
            deviceName: dev.name,
            ip: dev.ip,
            panelId: dev.panelId,
            building: dev.building,
        };
        setDeploying(true);
        setResult(null);
        try {
            let res: { success: boolean; message: string; compatibility?: CompatReport };
            if (project.engine === "eez") {
                const path =
                    filePath ??
                    (project.folder ? `project/${project.folder}/${project.folder}.eez-project` : "");
                if (!path) {
                    res = { success: false, message: "Cannot resolve the EEZ project path." };
                } else {
                    res = await deployEezProject({
                        hubProject: project as any,
                        project: eezProject,
                        filePath: path,
                        device: target,
                        save: onSaveProject,
                        onStep: (s) => setSteps((prev) => [...prev, s]),
                    });
                }
            } else if (onDeploy) {
                res = await onDeploy(target);
            } else {
                res = { success: false, message: "Deploy is not supported for this project type." };
            }
            setResult(res);
            reloadLogs();
            onDeployed?.(res);
            // A successful deploy can flip `auto` from the compiled UI to the
            // deployed screens, so re-read the mode instead of showing stale state.
            if (res.success && dev.ip && dev.online) {
                readPanelUiMode({ serialNumber: dev.serialNumber, ip: dev.ip, panelId: dev.panelId })
                    .then(setUiMode)
                    .catch(() => undefined);
            }
        } catch (e: any) {
            setResult({ success: false, message: e?.message || String(e) });
        } finally {
            setDeploying(false);
        }
    };

    return (
        <FluentProvider theme={webLightTheme}>
            <Drawer open={open} onOpenChange={(_, d) => !d.open && onClose()} position="end" type="overlay" size="medium">
                <DrawerHeader style={{ paddingLeft: 15, paddingTop: 10 }}>
                    <DrawerHeaderTitle
                        style={{ fontSize: 18 }}
                        action={
                            <Button appearance="subtle" icon={<DismissRegular />} onClick={onClose} aria-label="Close" />
                        }
                    >
                        <span style={{ fontSize: 14 }}>Deploy to Device</span>
                    </DrawerHeaderTitle>
                </DrawerHeader>
                <DrawerBody className={styles.thinScrollbar} style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 16px" }}>
                    {/* Project info */}
                    <div style={{ border: "1px solid #eef1f6", borderRadius: 8, padding: 10, background: "#f8fafc", display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#1c2b3a", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {project.name}
                            </span>
                            {statusBadge(project.status)}
                        </div>
                        <div style={{ fontSize: 11, color: "#7a8699", display: "flex", flexWrap: "wrap", gap: 4, lineHeight: 1.5 }}>
                            <span>Engine: {project.engine}</span>
                            {project.lvglVersion && <span>· LVGL {project.lvglVersion}</span>}
                            {project.pages != null && <span>· {project.pages} pages</span>}
                            {project.fileSize != null && <span>· {Math.round(project.fileSize / 1024)} KB</span>}
                            {project.folder && <span>· {project.folder}</span>}
                        </div>
                    </div>

                    {/* Device picker */}
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#1c2b3a", marginBottom: 6 }}>
                            Select device
                            {project.serialNumber && (
                                <span style={{ fontWeight: 400, color: "#7a8699", marginLeft: 6 }}>
                                    (currently bound: SN {project.serialNumber})
                                </span>
                            )}
                        </div>
                        {loadingDevices ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#7a8699", fontSize: 12, padding: 8 }}>
                                <Spinner size="tiny" /> Loading devices…
                            </div>
                        ) : devices.length === 0 ? (
                            <div style={{ color: "#8b97a8", fontSize: 12, padding: 8 }}>No devices found.</div>
                        ) : (
                            <div className={styles.thinScrollbar} style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #eef1f6", borderRadius: 8 }}>
                                {onlineGroups.map(([building, list]) => (
                                    <div key={building}>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: "#7a8699", textTransform: "uppercase", padding: "8px 10px 2px", letterSpacing: 0.4 }}>
                                            {building}
                                        </div>
                                        {list.map((d) => (
                                            <div
                                                key={d.serialNumber}
                                                onClick={() => setDeviceSerial(d.serialNumber)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") setDeviceSerial(d.serialNumber);
                                                }}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    padding: "7px 10px",
                                                    cursor: "pointer",
                                                    background: deviceSerial === d.serialNumber ? "#e8f2fb" : "transparent",
                                                }}
                                            >
                                                <Desktop20Regular style={{ fontSize: 15, color: "#0078d4", flexShrink: 0 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 12, color: "#1c2b3a", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                                                    <div style={{ fontSize: 10, color: "#7a8699" }}>
                                                        SN {d.serialNumber}
                                                        {d.ip ? ` · ${d.ip}` : ""}
                                                    </div>
                                                </div>
                                                {deviceSerial === d.serialNumber && <CheckmarkCircleRegular style={{ color: "#0078d4", flexShrink: 0 }} />}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                                {offlineList.length > 0 && (
                                    <div>
                                        <div
                                            onClick={() => setShowOffline((v) => !v)}
                                            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#7a8699", padding: "8px 10px", cursor: "pointer", userSelect: "none" }}
                                        >
                                            {showOffline ? <ChevronDownRegular style={{ fontSize: 12 }} /> : <ChevronRightRegular style={{ fontSize: 12 }} />}
                                            Show {offlineList.length} offline
                                        </div>
                                        {showOffline &&
                                            offlineList.map((d) => (
                                                <div
                                                    key={d.serialNumber}
                                                    onClick={() => setDeviceSerial(d.serialNumber)}
                                                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", cursor: "pointer", opacity: 0.75, background: deviceSerial === d.serialNumber ? "#e8f2fb" : "transparent" }}
                                                >
                                                    <Desktop20Regular style={{ fontSize: 15, color: "#9aa5b1", flexShrink: 0 }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: 12, color: "#1c2b3a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                                                        <div style={{ fontSize: 10, color: "#7a8699" }}>SN {d.serialNumber} · offline</div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Deploy button + result */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <Button
                            appearance="primary"
                            icon={<RocketRegular style={{ fontSize: 14 }} />}
                            onClick={handleDeploy}
                            disabled={deploying || !deviceSerial}
                            style={{ fontWeight: 500, alignSelf: "flex-start", fontSize: 12 }}
                        >
                            {deploying ? "Deploying…" : "Start deployment"}
                        </Button>
                        {deploying && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#4a5a6c" }}>
                                <Spinner size="tiny" /> Exporting screens, pushing to device…
                            </div>
                        )}
                        {result && (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 8,
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    padding: "8px 10px",
                                    borderRadius: 8,
                                    background: result.success ? "#e9f4ea" : "#fdeeee",
                                    color: result.success ? "#25632d" : "#c50f1f",
                                }}
                            >
                                {result.success ? (
                                    <CheckmarkCircleRegular style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }} />
                                ) : (
                                    <DismissCircleRegular style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }} />
                                )}
                                <span>{result.message}</span>
                            </div>
                        )}
                    </div>

                    {/* Live deployment steps (each step that was done, in order) */}
                    {(steps.length > 0 || deploying) && (
                        <div style={{ border: "1px solid #eef1f6", borderRadius: 8, padding: "8px 10px", background: "#fff" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#1c2b3a" }}>Deployment steps</span>
                                {deploying && <Spinner size="tiny" />}
                                <span style={{ fontSize: 10, color: "#7a8699", flex: 1, textAlign: "right" }}>
                                    {steps.length} step{steps.length === 1 ? "" : "s"}
                                </span>
                            </div>
                            <div className={styles.thinScrollbar} style={{ maxHeight: 190, overflowY: "auto" }}>
                                {steps.length === 0 ? (
                                    <div style={{ fontSize: 12, color: "#7a8699", padding: "2px 0" }}>Starting…</div>
                                ) : (
                                    steps.map((s, i) => (
                                        <div
                                            key={`${s.id}-${i}`}
                                            style={{
                                                display: "flex",
                                                alignItems: "baseline",
                                                gap: 6,
                                                padding: "2px 0",
                                                fontSize: 12,
                                                color: s.status === "error" ? "#c50f1f" : "#1c2b3a",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    flexShrink: 0,
                                                    width: 14,
                                                    textAlign: "center",
                                                    color:
                                                        s.status === "error"
                                                            ? "#d13438"
                                                            : s.status === "skipped"
                                                                ? "#b8860b"
                                                                : "#2e9b4f",
                                                }}
                                            >
                                                {s.status === "error" ? "✖" : s.status === "skipped" ? "—" : "✔"}
                                            </span>
                                            <span style={{ flex: 1, minWidth: 0 }}>{s.label}</span>
                                            {s.detail && <span style={{ color: "#7a8699", flexShrink: 0 }}>{s.detail}</span>}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Panel UI mode — decides whether the deployed screens are
                        painted at all. `auto` stays on the compiled UI until a
                        screen set is deployed, which is the usual reason a
                        successful deploy looks like it did nothing. */}
                    <div style={{ border: "1px solid #eef1f6", borderRadius: 8, padding: "8px 10px", background: "#fff" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#1c2b3a" }}>Panel UI mode</span>
                            {uiModeBusy && <Spinner size="tiny" />}
                            <span style={{ fontSize: 10, color: "#7a8699", flex: 1, textAlign: "right" }}>
                                {uiMode ? `running ${uiMode.ui_mode}` : uiModeError ? "unavailable" : "—"}
                            </span>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                            {UI_MODES.map((m) => {
                                const active = uiMode?.mode === m;
                                const disabled = !selectedDevice?.ip || !selectedDevice.online || uiModeBusy;
                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => handleUiMode(m)}
                                        title={UI_MODE_HINT[m]}
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            padding: "4px 12px",
                                            borderRadius: 999,
                                            cursor: disabled ? "default" : "pointer",
                                            border: `1px solid ${active ? "#0078d4" : "#d7dde6"}`,
                                            background: active ? "#e8f2fb" : "#fff",
                                            color: active ? "#0f5fa8" : "#4a5a6c",
                                            opacity: disabled ? 0.6 : 1,
                                        }}
                                    >
                                        {m}
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{ fontSize: 11, color: "#7a8699", marginTop: 6, lineHeight: 1.45 }}>
                            {uiModeNote(uiMode, !!selectedDevice, !!selectedDevice?.online)}
                        </div>
                        {uiModeError && (
                            <div style={{ fontSize: 11, color: "#c50f1f", marginTop: 4, lineHeight: 1.45 }}>
                                {uiModeError}
                            </div>
                        )}
                    </div>

                    {/* What the device cannot draw — errors block the deploy, warnings do not */}
                    {result?.compatibility && result.compatibility.findings.length > 0 && (
                        <div style={{ border: "1px solid #eef1f6", borderRadius: 8, padding: "8px 10px", background: "#fff" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#1c2b3a" }}>
                                {result.compatibility.errors > 0
                                    ? `${result.compatibility.errors} item(s) cannot render on this device`
                                    : `${result.compatibility.warnings} warning(s)`}
                            </div>
                            <div className={styles.thinScrollbar} style={{ maxHeight: 150, overflowY: "auto" }}>
                                {result.compatibility.findings.slice(0, 20).map((f, i) => (
                                    <div key={`${f.code}-${i}`} style={{ fontSize: 12, display: "flex", gap: 6, padding: "2px 0" }}>
                                        <span style={{ color: f.level === "error" ? "#c50f1f" : "#9a6700", flexShrink: 0, width: 12 }}>
                                            {f.level === "error" ? "✖" : "▲"}
                                        </span>
                                        <span style={{ minWidth: 0 }}>
                                            <strong>{f.screen}</strong>
                                            {f.widget ? ` · ${f.widget}` : ""} — {f.message}
                                        </span>
                                    </div>
                                ))}
                                {result.compatibility.findings.length > 20 && (
                                    <div style={{ fontSize: 12, color: "#7a8699" }}>
                                        … and {result.compatibility.findings.length - 20} more
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Deploy log */}
                    <div style={{ borderTop: "1px solid #eef1f6", paddingTop: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#1c2b3a" }}>Deploy Log</span>
                            {logs.length > 0 && (
                                <Tooltip content="Latest deploy first" relationship="label">
                                    <span style={{ fontSize: 10, color: "#7a8699" }}>{logs.length} entries</span>
                                </Tooltip>
                            )}
                        </div>
                        {logs.length === 0 ? (
                            <div style={{ color: "#8b97a8", fontSize: 12, padding: 4 }}>No deploys yet.</div>
                        ) : (
                            logs.slice(0, 5).map((log, i) => (
                                <DeployLogRow
                                    key={log.id}
                                    log={log}
                                    open={expandedLog === i}
                                    onToggle={() => setExpandedLog(expandedLog === i ? null : i)}
                                />
                            ))
                        )}
                    </div>

                    {/*
                     * Cross-link to the sibling *Reset Device UI* drawer: a factory reset
                     * is the one thing a deploy cannot undo, so it lives next to it.
                     */}
                    {onOpenReset && (
                        <div style={{ borderTop: "1px solid #eef1f6", paddingTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, color: "#7a8699", flex: 1 }}>
                                Need to start over with the device's factory UI?
                            </span>
                            <Button
                                size="small"
                                appearance="subtle"
                                icon={<ArrowResetRegular style={{ fontSize: 13 }} />}
                                onClick={onOpenReset}
                                style={{ fontSize: 12 }}
                            >
                                Reset Device UI
                            </Button>
                        </div>
                    )}
                </DrawerBody>
            </Drawer>
        </FluentProvider>
    );
};

export default DeployDeviceDrawer;
