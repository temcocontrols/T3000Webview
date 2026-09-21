/**
 * ResetUiDrawer — "Reset Device UI" (Fluent UI drawer), the sibling of the Deploy drawer.
 *
 * A factory reset is the one device operation a deploy cannot undo, so it gets
 * its own drawer with its own warning instead of a button inside Deploy:
 *
 *   1. pick the device (same grouped list as Deploy) + read what it holds now
 *   2. an amber warning panel that states all three consequences — the device's
 *      UI is lost, the studio side is reset too (the project is re-imported from
 *      the device), and the device rewrites flash
 *   3. one destructive button that asks **inline** ("Reset the UI on …?")
 *   4. the run: steps stream in, the elapsed time ticks
 *   5. after success the service has already verified the device, invalidated the
 *      deploy baseline and re-imported the device UI — the drawer says so and
 *      offers to reopen the project
 *
 * Everything is delegated to `resetService.resetDeviceUi()`; this file is UI only.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
    Button,
    Drawer,
    DrawerBody,
    DrawerHeader,
    DrawerHeaderTitle,
    FluentProvider,
    Spinner,
    webLightTheme,
} from "@fluentui/react-components";
import {
    ArrowClockwiseRegular,
    ArrowResetRegular,
    CheckmarkCircleRegular,
    ChevronDownRegular,
    ChevronRightRegular,
    Desktop20Regular,
    DismissCircleRegular,
    DismissRegular,
    WarningRegular,
} from "@fluentui/react-icons";
import type { DeployStepInfo } from "../types";
import { DeployDevice as DeployDeviceType, DeployTarget, fetchDeployDevices } from "../services/deployService";
import { resetDeviceUi, type ResetDeviceResult } from "../services/resetService";
import type { DeployProjectInfo } from "./DeployDeviceDrawer";
import { deviceClient } from "project-editor/build/device-rest-client";
import styles from "../pages/DesignHubPage.module.css";

interface Props {
    open: boolean;
    onClose: () => void;
    project: DeployProjectInfo;
    /** EEZ project file path; derived from project.folder when omitted. */
    filePath?: string;
    /** Called after a successful reset (host-side refresh). */
    onResetDone?: (result: ResetDeviceResult) => void;
}

/** What the picked device holds right now (read once per selection). */
interface DeviceInventory {
    loading: boolean;
    error?: string;
    screens?: number;
    images?: number;
    lvglVersion?: string;
}

const panelStyle: React.CSSProperties = {
    border: "1px solid #eef1f6",
    borderRadius: 8,
    padding: 10,
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    gap: 6,
};

const stepMark = (status: DeployStepInfo["status"]) => (status === "error" ? "✖" : status === "skipped" ? "—" : "✔");
const stepColor = (status: DeployStepInfo["status"]) =>
    status === "error" ? "#d13438" : status === "skipped" ? "#b8860b" : "#2e9b4f";

export const ResetUiDrawer: React.FC<Props> = ({ open, onClose, project, filePath, onResetDone }) => {
    const [devices, setDevices] = useState<DeployDeviceType[]>([]);
    const [loadingDevices, setLoadingDevices] = useState(false);
    const [deviceSerial, setDeviceSerial] = useState<number | "">("");
    const [showOffline, setShowOffline] = useState(false);
    const [inventory, setInventory] = useState<DeviceInventory>({ loading: false });
    /** Bumped by the Device panel's *Re-check* to re-read the inventory. */
    const [inventoryTick, setInventoryTick] = useState(0);

    const [confirming, setConfirming] = useState(false);
    const [running, setRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [steps, setSteps] = useState<DeployStepInfo[]>([]);
    const [result, setResult] = useState<ResetDeviceResult | null>(null);

    /** The project file this reset belongs to (hub drawers pass no path). */
    const projectFilePath =
        filePath ?? (project.folder ? `project/${project.folder}/${project.folder}.eez-project` : undefined);

    useEffect(() => {
        if (!open) {
            return;
        }
        setConfirming(false);
        setRunning(false);
        setElapsed(0);
        setSteps([]);
        setResult(null);
        setInventory({ loading: false });
        setLoadingDevices(true);
        setDeviceSerial("");
        fetchDeployDevices()
            .then((list) => {
                setDevices(list);
                if (project.serialNumber && list.some((d) => d.serialNumber === project.serialNumber)) {
                    setDeviceSerial(project.serialNumber);
                }
            })
            .finally(() => setLoadingDevices(false));
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

    const selected = devices.find((d) => d.serialNumber === deviceSerial);

    // Inventory of the picked device — what a reset would erase.
    useEffect(() => {
        if (!open || !selected?.ip) {
            setInventory({ loading: false });
            return;
        }
        let cancelled = false;
        setInventory({ loading: true });
        (async () => {
            try {
                const connection = await deviceClient.connect(selected.ip!, selected.panelId, selected.serialNumber);
                if (connection.error) {
                    throw new Error(connection.error);
                }
                const info = await deviceClient.getDeviceInfo();
                if (!cancelled) {
                    setInventory({
                        loading: false,
                        screens: info.screen_count,
                        images: info.image_count,
                        lvglVersion: info.lvgl_version,
                    });
                }
            } catch (e: any) {
                if (!cancelled) {
                    setInventory({ loading: false, error: e?.message || String(e) });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, selected?.serialNumber, selected?.ip, inventoryTick]);

    // Elapsed-seconds ticker while a reset runs (the device reports no progress).
    useEffect(() => {
        if (!running) {
            return;
        }
        const started = Date.now();
        const timer = window.setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 500);
        return () => window.clearInterval(timer);
    }, [running]);

    const handleReset = async () => {
        if (!selected) {
            return;
        }
        const target: DeployTarget = {
            serialNumber: selected.serialNumber,
            deviceName: selected.name,
            ip: selected.ip,
            panelId: selected.panelId,
            building: selected.building,
        };
        setConfirming(false);
        setRunning(true);
        setSteps([]);
        setResult(null);
        try {
            const res = await resetDeviceUi({
                hubProject: project as any,
                filePath: projectFilePath,
                device: target,
                onStep: (step) => setSteps((prev) => [...prev, step]),
            });
            setResult(res);
            onResetDone?.(res);
        } catch (e: any) {
            setResult({ success: false, message: e?.message || String(e), steps });
        } finally {
            setRunning(false);
        }
    };

    /**
     * One device row.
     *
     * **Full width minus a scrollbar gutter** (user-reported): the list scrolls (16
     * devices, 190 px), so a `100%` row ran under its vertical scrollbar and the active
     * row's border looked clipped. The reserve is on the row rather than on the list,
     * so it holds whether the pane uses a classic scrollbar (which eats layout width)
     * or an overlay one (which does not).
     *
     * The building is left out of the grouped rows because the group header already
     * names it (`showDetail` is for the flat offline list, where nothing else does).
     */
    const deviceRow = (d: DeployDeviceType, selectable: boolean, showDetail = false) => {
        const active = d.serialNumber === deviceSerial;
        return (
            <div
                key={d.serialNumber}
                role="button"
                aria-disabled={!selectable}
                onClick={() => selectable && !running && setDeviceSerial(d.serialNumber)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    width: "calc(100% - 12px)",
                    boxSizing: "border-box",
                    padding: "4px 8px",
                    marginBottom: 2,
                    borderRadius: 6,
                    cursor: selectable ? "pointer" : "default",
                    background: active ? "#e8f2fb" : "transparent",
                    border: active ? "1px solid #0078d4" : "1px solid transparent",
                    opacity: selectable ? 1 : 0.55,
                }}
            >
                <Desktop20Regular style={{ fontSize: 14, flexShrink: 0, color: active ? "#0078d4" : "#7a8699" }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: "#1c2b3a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.name}
                    {showDetail && d.detail ? <span style={{ color: "#7a8699" }}> · {d.detail}</span> : null}
                </span>
                <span style={{ fontSize: 10, color: "#7a8699", flexShrink: 0 }}>SN {d.serialNumber}</span>
                {/*
                 * A dot instead of “● Online”: the picker is narrow, so every pixel
                 * the status word took came out of the device's name.
                 */}
                <span
                    title={d.online ? "Online" : "Offline"}
                    aria-label={d.online ? "Online" : "Offline"}
                    style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: d.online ? "#2e9b4f" : "#c8cfd8",
                    }}
                />
            </div>
        );
    };

    return (
        <FluentProvider theme={webLightTheme}>
            <Drawer open={open} onOpenChange={(_, d) => !d.open && onClose()} position="end" type="overlay" size="medium">
                <DrawerHeader style={{ paddingLeft: 15, paddingTop: 10 }}>
                    <DrawerHeaderTitle
                        style={{ fontSize: 18 }}
                        action={<Button appearance="subtle" icon={<DismissRegular />} onClick={onClose} aria-label="Close" />}
                    >
                        <span style={{ fontSize: 14 }}>Reset Device UI</span>
                    </DrawerHeaderTitle>
                </DrawerHeader>

                <DrawerBody className={styles.thinScrollbar} style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 16px" }}>
                    {/* ── Device ─────────────────────────────────────────────── */}
                    <div style={panelStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#1c2b3a", flex: 1, minWidth: 0 }}>
                                Device
                            </span>
                            <span style={{ fontSize: 11, color: "#7a8699", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {project.name}
                                {/* The folder is only worth showing when it says something new. */}
                                {project.folder && project.folder !== project.name ? ` · ${project.folder}` : ""}
                            </span>
                        </div>

                        {loadingDevices ? (
                            <Spinner size="tiny" label="Loading devices…" />
                        ) : devices.length === 0 ? (
                            <div style={{ fontSize: 12, color: "#7a8699" }}>No devices found.</div>
                        ) : (
                            <div
                                className={styles.thinScrollbar}
                                style={{ maxHeight: 190, overflowY: "auto", scrollbarGutter: "stable" }}
                            >
                                {onlineGroups.map(([building, list]) => (
                                    <div key={building}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: "#7a8699", padding: "4px 8px" }}>
                                            {building}
                                        </div>
                                        {list.map((d) => deviceRow(d, true))}
                                    </div>
                                ))}
                                {offlineList.length > 0 && (
                                    <div>
                                        <div
                                            role="button"
                                            onClick={() => setShowOffline(!showOffline)}
                                            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#7a8699", padding: "6px 8px", cursor: "pointer" }}
                                        >
                                            {showOffline ? <ChevronDownRegular style={{ fontSize: 11 }} /> : <ChevronRightRegular style={{ fontSize: 11 }} />}
                                            Show {offlineList.length} offline
                                        </div>
                                        {showOffline && offlineList.map((d) => deviceRow(d, false, true))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ fontSize: 11, color: inventory.error ? "#c50f1f" : "#7a8699", display: "flex", alignItems: "center", gap: 6 }}>
                            {inventory.loading ? (
                                <Spinner size="extra-tiny" />
                            ) : null}
                            <span style={{ flex: 1, minWidth: 0, lineHeight: 1.5 }}>
                                {inventory.error
                                    ? inventory.error
                                    : selected
                                        ? inventory.screens != null
                                            ? `${inventory.screens} screens · ${inventory.images ?? 0} images${inventory.lvglVersion ? ` · LVGL ${inventory.lvglVersion}` : ""}`
                                            : selected.ip
                                                ? "Reading the device…"
                                                : "This device has no IP address on record."
                                        : "Pick the device you want to reset."}
                            </span>
                            {/*
                             * A failed read is not a dead end — a device that was just
                             * powered on is the normal cause, so offer the re-read.
                             */}
                            {inventory.error && (
                                <Button size="small" appearance="secondary" style={{ fontSize: 11, flexShrink: 0 }} onClick={() => setInventoryTick((t) => t + 1)}>
                                    Re-check
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* ── Warning ────────────────────────────────────────────── */}
                    <div style={{ ...panelStyle, background: "#fff8e6", border: "1px solid #f2d99b" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#8a5a00" }}>
                            <WarningRegular style={{ fontSize: 15 }} />
                            Factory reset
                        </div>
                        <div style={{ fontSize: 12, color: "#6b4a00", lineHeight: 1.65 }}>
                            {selected ? (
                                <>
                                    <b>{selected.name}</b> erases <b>all of its screens and images</b> and restores the UI built into its
                                    firmware{inventory.screens != null ? ` (${inventory.screens} screens · ${inventory.images ?? 0} images today` : ""}
                                    {inventory.screens != null ? ")" : ""}.
                                </>
                            ) : (
                                <>The picked device erases <b>all of its screens and images</b> and restores the UI built into its firmware.</>
                            )}
                            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                                <li>The device's current UI is lost — it cannot be undone on the device.</li>
                                <li>
                                    This PC's project is <b>not deleted</b>, but the studio side is reset too: the device UI is
                                    re-imported automatically afterwards, and that replaces this project's screens with the factory ones.
                                </li>
                                <li>The device rewrites its flash — don't power it off during the reset.</li>
                            </ul>
                        </div>
                    </div>

                    {/* ── Action: inline confirm ─────────────────────────────── */}
                    {!confirming ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Button
                                appearance="primary"
                                icon={<ArrowResetRegular style={{ fontSize: 13 }} />}
                                disabled={!selected || !selected.ip || running || !!inventory.error}
                                onClick={() => setConfirming(true)}
                                style={{ fontSize: 12 }}
                            >
                                Reset Device UI
                            </Button>
                            {selected && (
                                <span style={{ fontSize: 11, color: "#7a8699" }}>
                                    {selected.name} · SN {selected.serialNumber}
                                    {selected.ip ? ` · ${selected.ip}` : ""}
                                </span>
                            )}
                        </div>
                    ) : (
                        /*
                         * The confirm step, as its own little panel: the question on one
                         * line, the two answers under it, so the pair reads as a decision
                         * and not as a row of chips that happens to wrap.
                         */
                        <div
                            style={{
                                border: "1px solid #f2d99b",
                                borderRadius: 8,
                                padding: 10,
                                background: "#fffdf5",
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                            }}
                        >
                            <span style={{ fontSize: 12, color: "#6b4a00" }}>
                                Reset the UI on <b>{selected?.name}</b> (SN {selected?.serialNumber})?
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {/* Solid red = the destructive choice; the quiet one is Cancel. */}
                                <Button
                                    appearance="primary"
                                    icon={<ArrowResetRegular style={{ fontSize: 13 }} />}
                                    disabled={running}
                                    onClick={handleReset}
                                    style={{
                                        fontSize: 12,
                                        backgroundColor: "#c50f1f",
                                        borderColor: "#c50f1f",
                                        color: "#fff",
                                    }}
                                >
                                    Reset now
                                </Button>
                                <Button appearance="secondary" onClick={() => setConfirming(false)} style={{ fontSize: 12 }}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ── Progress / result ─────────────────────────────────── */}
                    {(running || steps.length > 0 || result) && (
                        <div style={{ border: "1px solid #eef1f6", borderRadius: 8, padding: 10, background: "#fff" }}>
                            {running && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                    <Spinner size="extra-tiny" />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1c2b3a" }}>
                                        Restoring the factory UI…
                                    </span>
                                    <span style={{ fontSize: 11, color: "#7a8699", marginLeft: "auto" }}>{elapsed}s</span>
                                </div>
                            )}
                            {result && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                    {result.success ? (
                                        <CheckmarkCircleRegular style={{ fontSize: 16, color: "#2e9b4f" }} />
                                    ) : (
                                        <DismissCircleRegular style={{ fontSize: 16, color: "#d13438" }} />
                                    )}
                                    <span style={{ fontSize: 12, fontWeight: 600, color: result.success ? "#25632d" : "#c50f1f", flex: 1 }}>
                                        {result.message}
                                    </span>
                                    {!result.success && (
                                        <Button size="small" appearance="secondary" onClick={() => setConfirming(true)} disabled={running}>
                                            Retry
                                        </Button>
                                    )}
                                </div>
                            )}
                            {steps.length > 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    {steps.map((s, i) => (
                                        <div key={`${s.id}-${i}`} style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 12, color: s.status === "error" ? "#c50f1f" : "#1c2b3a" }}>
                                            <span style={{ width: 14, textAlign: "center", flexShrink: 0, color: stepColor(s.status) }}>
                                                {stepMark(s.status)}
                                            </span>
                                            <span style={{ flex: 1, minWidth: 0 }}>{s.label}</span>
                                            {s.detail && <span style={{ color: "#7a8699", flexShrink: 0 }}>{s.detail}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── After a successful reset ──────────────────────────── */}
                    {result?.success && (
                        <div style={{ ...panelStyle, background: "#f2f9f3", border: "1px solid #cfe6d3" }}>
                            <div style={{ fontSize: 12, color: "#25632d", lineHeight: 1.6 }}>
                                {result.imported
                                    ? `The device UI was re-imported into this project (${result.importedScreens ?? 0} screens) — reopen the project to see the factory screens. Until you do, the editor still holds the old project in memory, and saving it would overwrite what was just imported.`
                                    : "The device now runs its factory UI. This project was not re-imported."}
                                {result.manifestInvalidated
                                    ? " The deploy baseline was invalidated, so the next Deploy sends every screen."
                                    : ""}
                            </div>
                            {projectFilePath && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <Button
                                        size="small"
                                        appearance="secondary"
                                        icon={<ArrowClockwiseRegular style={{ fontSize: 13 }} />}
                                        onClick={() => window.location.reload()}
                                    >
                                        Reopen project
                                    </Button>
                                    <span style={{ fontSize: 11, color: "#7a8699" }}>reloads the editor with the imported project</span>
                                </div>
                            )}
                        </div>
                    )}
                </DrawerBody>
            </Drawer>
        </FluentProvider>
    );
};
