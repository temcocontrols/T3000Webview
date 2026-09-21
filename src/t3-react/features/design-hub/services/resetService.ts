/**
 * resetService.ts — "Reset Device UI" pipeline (single source of truth).
 *
 * One device-side call and then the studio side follows:
 *
 *   1. connect + read the device's UI inventory (screens/images it holds now)
 *   2. POST /api/eez-device/reset-defaults
 *      → the device formats its `screen_data` SPIFFS partition and re-seeds the
 *        screens/images embedded in its own firmware (13 + 22 on the current
 *        build). Nothing is sent from here: the device's build is the source of
 *        truth, which is why a factory reset cannot be expressed as a deploy.
 *   3. read the inventory again (verify)
 *   4. invalidate the local deploy baseline — the manifest now describes a
 *      device state that no longer exists, so the next Deploy must be a FULL
 *      push instead of a diff (see `invalidateDeployManifest`).
 *   5. re-import the device UI into this project (the normal "Load from device"
 *      pipeline, pointed at the project's own folder) so the studio shows the
 *      same factory UI the device now has. This OVERWRITES the project's screens
 *      — that is the point of the feature (both sides reset), and the drawer
 *      warns about it before the button is pressed.
 *   6. record a deploy-log entry with `kind: "reset"`.
 *
 * Steps 3–5 are best-effort: the reset itself is the operation, so a failure to
 * verify, to invalidate or to re-import is reported as a step, never thrown.
 */
import { deviceClient } from "project-editor/build/device-rest-client";
import { importProjectFromDevice } from "project-editor/build/device-import";
import { invalidateDeployManifest } from "project-editor/build/deploy-manifest";
import { designHubService } from "./designHubService";
import type { DeployStepInfo, HubProject } from "../types";
import type { DeployTarget } from "./deployService";

export interface ResetDeviceOptions {
    /** Hub project record (deploy log + activity are recorded against it). */
    hubProject: HubProject;
    /** EEZ project file path, e.g. `project/<folder>/<folder>.eez-project`. */
    filePath?: string;
    /** Device to reset (picked in the drawer, or the currently-bound one). */
    device: DeployTarget;
    /** Live step feed — called as each step completes (progress UI). */
    onStep?: (step: DeployStepInfo) => void;
}

export interface ResetDeviceResult {
    success: boolean;
    message: string;
    /** Screens the device reported it re-seeded. */
    screensRestored?: number;
    /** Device inventory before the reset (what the user loses). */
    beforeScreenCount?: number;
    beforeImageCount?: number;
    /** Device inventory after the reset (what it now has). */
    screenCount?: number;
    imageCount?: number;
    /** True when the studio side was re-imported from the device. */
    imported?: boolean;
    importedScreens?: number;
    importedImages?: number;
    /** True when the deploy baseline was marked stale. */
    manifestInvalidated?: boolean;
    steps?: DeployStepInfo[];
}

/** Folder that holds the project file (`…\device-export\deploy-manifest.json`). */
function baseFolderOf(filePath: string | undefined): string | undefined {
    if (!filePath) {
        return undefined;
    }
    const folder = filePath.replace(/[\\/][^\\/]+$/, "");
    return folder && folder !== filePath ? folder : undefined;
}

/**
 * Reset a device's UI to the firmware's factory defaults, then bring the studio
 * side in line (verify → invalidate baseline → re-import) and record the run.
 */
export async function resetDeviceUi(opts: ResetDeviceOptions): Promise<ResetDeviceResult> {
    const { hubProject, device } = opts;
    const steps: DeployStepInfo[] = [];
    const emit = (
        id: string,
        label: string,
        detail?: string,
        status: DeployStepInfo["status"] = "done",
        error?: string
    ) => {
        const info: DeployStepInfo = { id, label, detail, status, error };
        steps.push(info);
        opts.onStep?.(info);
    };

    const baseFolder = baseFolderOf(opts.filePath);
    const manifestPath = baseFolder ? baseFolder + "\\device-export\\deploy-manifest.json" : undefined;

    const finish = (
        success: boolean,
        message: string,
        extra: Partial<ResetDeviceResult> = {}
    ): ResetDeviceResult => {
        const result: ResetDeviceResult = { success, message, steps, ...extra };
        try {
            designHubService.recordDeployLog(hubProject.id, {
                id: `rst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                timestamp: new Date().toISOString(),
                kind: "reset",
                serialNumber: device.serialNumber,
                deviceName: device.deviceName,
                status: success ? "success" : "error",
                message,
                screenCount: result.screenCount,
                imageCount: result.imageCount,
                manifestPath,
                steps,
            });
        } catch {
            /* log is best-effort */
        }
        return result;
    };

    if (!device.ip) {
        emit("target", "Resolve device address", undefined, "error", "No IP address on record");
        return finish(false, "This device has no IP address on record — reset it from the device's own page.");
    }

    // 1. Connect + inventory (what the device holds now).
    let beforeScreenCount: number | undefined;
    let beforeImageCount: number | undefined;
    try {
        const connection = await deviceClient.connect(device.ip, device.panelId, device.serialNumber);
        if (connection.error) {
            throw new Error(connection.error);
        }
        emit("connect", "Connected to the device", `${device.deviceName || "device"} · ${device.ip}`);
        const info = await deviceClient.getDeviceInfo();
        beforeScreenCount = info.screen_count;
        beforeImageCount = info.image_count;
        emit(
            "inventory",
            "Read the device's UI inventory",
            `${info.screen_count} screens · ${info.image_count} images${info.lvgl_version ? ` · LVGL ${info.lvgl_version}` : ""}`
        );
    } catch (e: any) {
        const message = e?.message || String(e);
        emit("connect", "Connect to the device", undefined, "error", message);
        return finish(false, `Device unreachable: ${message}`);
    }

    // 2. The reset itself — the one destructive call.
    let screensRestored: number | undefined;
    try {
        const response = await deviceClient.resetToDefaults();
        screensRestored = response.screens_restored;
        emit(
            "reset",
            "Restored the firmware's factory UI",
            `${response.screens_restored ?? "?"} screens re-seeded on the device`
        );
    } catch (e: any) {
        const message = e?.message || String(e);
        emit("reset", "Restore the firmware's factory UI", undefined, "error", message);
        return finish(false, `Reset failed: ${message}`);
    }

    // 3. Verify (best-effort).
    let screenCount: number | undefined;
    let imageCount: number | undefined;
    try {
        const after = await deviceClient.getDeviceInfo();
        screenCount = after.screen_count;
        imageCount = after.image_count;
        emit("verify", "Verified the device's UI", `${after.screen_count} screens · ${after.image_count} images`);
    } catch (e: any) {
        emit("verify", "Verify the device's UI", undefined, "skipped", e?.message || String(e));
    }

    // 4. Baseline — the manifest describes a device state that is gone.
    let manifestInvalidated = false;
    if (manifestPath) {
        try {
            await invalidateDeployManifest(manifestPath, "device UI reset to factory defaults");
            manifestInvalidated = true;
            emit("baseline", "Invalidated the deploy baseline", "next deploy is a full push");
        } catch (e: any) {
            emit("baseline", "Invalidate the deploy baseline", undefined, "skipped", e?.message || String(e));
        }
    } else {
        emit("baseline", "Invalidate the deploy baseline", "no project file on record", "skipped");
    }

    // 5. Studio side — re-import the device UI into this project (overwrites its
    //    screens; the drawer warns about that before the reset is started).
    let imported = false;
    let importedScreens: number | undefined;
    let importedImages: number | undefined;
    if (baseFolder) {
        let importStep = 0;
        try {
            const result = await importProjectFromDevice({
                client: deviceClient,
                device: {
                    name: device.deviceName || `Device ${device.ip}`,
                    ip: device.ip,
                    serialNumber: device.serialNumber,
                    panelId: device.panelId ?? device.serialNumber,
                },
                // The project's OWN folder + file name (device-import.ts names the
                // file after the folder) so the reset rewrites this project, not a
                // new "…_SN…" sibling.
                projectDir: baseFolder.replace(/\\/g, "/"),
                onLog: (line) => {
                    // Forward the import's own step markers (✔ …) as steps.
                    if (line.startsWith("✔")) {
                        importStep += 1;
                        emit(`import:${importStep}`, line.replace(/^✔\s*/, ""));
                    }
                },
            });
            imported = true;
            importedScreens = result.screenCount;
            importedImages = result.loadedImageCount;
            emit(
                "import",
                "Re-imported the device UI into this project",
                `${result.screenCount} screens + ${result.loadedImageCount} images`
            );
        } catch (e: any) {
            emit("import", "Re-import the device UI", undefined, "error", e?.message || String(e));
        }
    } else {
        emit("import", "Re-import the device UI", "no project file on record", "skipped");
    }

    const deviceLabel = `${device.deviceName || "device"}${device.serialNumber ? ` (SN ${device.serialNumber})` : ""}`;
    const message = imported
        ? `Factory UI restored on ${deviceLabel} — ${screensRestored ?? screenCount ?? "?"} screens; this project was re-imported from the device`
        : `Factory UI restored on ${deviceLabel} — ${screensRestored ?? screenCount ?? "?"} screens`;

    return finish(true, message, {
        screensRestored,
        beforeScreenCount,
        beforeImageCount,
        screenCount,
        imageCount,
        imported,
        importedScreens,
        importedImages,
        manifestInvalidated,
    });
}
