/**
 * deployService.ts — unified "Deploy to Device" pipeline (single source of truth).
 *
 * Used by BOTH the EEZ editor toolbar ("Deploy to Device") and the Design Hub
 * project detail page, so every deploy entry point shares the same logic:
 *   export screens + images → write device-export/ backup → auto-diff against
 *   the last successful deploy-manifest.json → push ONLY the changed screens /
 *   images via direct REST → refresh the manifest → record log + activity →
 *   bind the project to the chosen device.
 *
 * Deploy is incremental and automatic — no manual selection. Every screen and
 * image is hashed and compared with the previous manifest; only the changed
 * PNG(s)/screen(s) are pushed (single-screen PUT / image push). First deploy or
 * "everything changed" falls back to one full deployAllScreens() call. The
 * manifest (which stores the hashes) is only refreshed after a fully
 * successful push so a failed deploy is retried next time.
 *
 * The EEZ/LVGL push is the canonical "deploy to device" for EEZ projects
 * everywhere. Non-EEZ projects (e.g. HVAC) keep their own refresh executor,
 * which hosts pass in via `onDeploy` (see DeployDeviceDrawer).
 */
import { transformToDeviceJson } from "project-editor/build/firmware-export";
import { base64ToBytes, deviceClient } from "project-editor/build/device-rest-client";
import { getDeviceBinding, setDeviceBinding } from "project-editor/build/device-binding";
import { writeTextFile } from "project-editor/build/build";
import { makeFolder } from "eez-studio-shared/util-electron";
import { designHubService } from "./designHubService";
import type { HubProject } from "../types";

/** A deployable device (from the device tree API + connectivity fields). */
export interface DeployDevice {
    serialNumber: number;
    name: string;
    detail: string;
    building: string;
    online: boolean;
    /** REST IP (used to push screens). */
    ip?: string;
    /** Panel id (used to push screens). Falls back to panelNumber/serial. */
    panelId?: number;
}

/** Resolved deploy target (the picked device). */
export interface DeployTarget {
    serialNumber: number;
    deviceName?: string;
    ip?: string;
    panelId?: number;
    building?: string;
    floor?: string;
    room?: string;
}

export interface DeployEezOptions {
    /** Hub project record (used for deploy logs + binding + activity). */
    hubProject: HubProject;
    /** In-memory EEZ project object (editor). Omit to load from disk via filePath. */
    project?: any;
    /** EEZ project file path, e.g. project/<folder>/<folder>.eez-project. */
    filePath: string;
    /** Device to deploy to (picked in the drawer, or the currently-bound one). */
    device: DeployTarget;
}

export interface DeployEezResult {
    success: boolean;
    message: string;
    screens?: string[];
    images?: { name: string; width: number; height: number; color_format?: number | string }[];
    screenCount?: number;
    imageCount?: number;
    manifestPath?: string;
    deployed?: number;
}

/** Fetch the deployable device list (same source as the Design Hub dialog). */
export async function fetchDeployDevices(): Promise<DeployDevice[]> {
    try {
        const host = window.location.hostname || "localhost";
        const resp = await fetch(`http://${host}:9103/api/t3_device/devices`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const raw: any[] = json.devices || [];
        return raw
            .map((d: any) => ({
                serialNumber: d.serialNumber ?? d.SerialNumber ?? d.panel_serial_number ?? 0,
                name: d.nameShowOnTree ?? d.showLabelName ?? d.panel_name ?? "Device",
                detail: [
                    d.buildingName ?? d.Building_Name,
                    d.floorName ?? d.Floor_Name,
                    d.roomName ?? d.Room_Name,
                ]
                    .filter(Boolean)
                    .join(" · "),
                building:
                    d.mainBuildingName ??
                    d.MainBuilding_Name ??
                    d.buildingName ??
                    d.Building_Name ??
                    "Unassigned",
                online: d.isOnline === true || d.isOnline === 1,
                ip: d.ipAddress ?? d.ip ?? undefined,
                panelId: d.panelId ?? d.panel_id ?? d.panelNumber ?? undefined,
            }))
            .filter(
                (d: any) =>
                    Number.isFinite(d.serialNumber) &&
                    d.name &&
                    d.name !== "Unknown" &&
                    d.name !== "(Unknown)"
            );
    } catch {
        return [];
    }
}

async function loadProjectFromDisk(filePath: string): Promise<any> {
    const r = await fetch(
        `/api/eez-studio/read-text-file?path=${encodeURIComponent(filePath)}`
    );
    if (!r.ok) throw new Error(`Cannot read ${filePath}`);
    return JSON.parse(await r.text());
}

/** Read the previous deploy manifest (the last SUCCESSFUL deploy baseline). */
async function readPreviousManifest(manifestPath: string): Promise<any | null> {
    try {
        const r = await fetch(
            `/api/eez-studio/read-text-file?path=${encodeURIComponent(manifestPath)}`
        );
        if (!r.ok) return null;
        const text = await r.text();
        const parsed = text ? JSON.parse(text) : null;
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
}

/** Deterministic content signature (length + FNV-1a) used to diff deploys.
 *  Only used to decide whether a screen/image actually changed since the last
 *  successful deploy — not a cryptographic hash. */
function contentSignature(text: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = (h * 0x01000193) >>> 0;
    }
    return `${text.length}:${h.toString(16)}`;
}

/**
 * Deploy an EEZ/LVGL project to a device: export → device-export + manifest →
 * push → log → bind. Returns a result the drawer can show inline.
 */
export async function deployEezProject(opts: DeployEezOptions): Promise<DeployEezResult> {
    const { hubProject, device } = opts;
    // Deploy ALWAYS exports from the saved project FILE on disk.
    // transformToDeviceJson reads raw JSON — feeding it an in-memory EEZ
    // Document (model objects) made every widget except the background panel
    // disappear (tiny/broken device-export files). The EEZ editor Toolbar
    // saves the project before opening the Deploy drawer, so the file is up to
    // date (unsaved edits included).
    let project: any;
    try {
        project = await loadProjectFromDisk(opts.filePath);
    } catch (e) {
        // Last resort: use whatever the caller handed us.
        project = opts.project;
    }
    if (!project) {
        throw new Error(`Cannot load project for deploy: ${opts.filePath}`);
    }

    // ── Diagnostics: what did we actually load from disk? ──
    console.log("[deploy] filePath =", opts.filePath);
    console.log(
        "[deploy] project loaded: userPages =",
        (project?.userPages || []).length,
        ", fonts =",
        (project?.fonts || []).length,
        ", bitmaps =",
        (project?.bitmaps || []).length
    );
    for (const pg of project?.userPages || []) {
        console.log(
            `[deploy] page "${pg?.name}": components=${(pg?.components || []).length} lines=${(pg?.connectionLines || []).length}`
        );
    }

    const baseFolder = opts.filePath.replace(/[\\/][^\\/]+$/, "");
    const deviceExportDir = baseFolder + "\\device-export";
    const manifestPath = deviceExportDir + "\\deploy-manifest.json";

    // 1. Generate device JSON + images (front side) from the on-disk project.
    const screens = transformToDeviceJson(project);
    const screenEntries = Object.entries(screens);
    const screenNames = screenEntries.map(([name]) => name);
    const images = deviceClient.extractDeviceImages(project as any);

    // ── Diagnostics: what did transformToDeviceJson produce per screen? ──
    const screenEntriesTyped = screenEntries as [string, any][];
    const perScreenTiny = screenEntriesTyped.every(
        ([, s]) => Object.keys(s?.widgets || {}).length <= 1
    );
    for (const [name, s] of screenEntriesTyped) {
        const keys = Object.keys(s?.widgets || {});
        console.log(
            `[deploy] screen "${name}": widgets=${keys.length} bytes=${JSON.stringify(s).length} first=${keys.slice(0, 6).join(",")}`
        );
    }
    if (perScreenTiny) {
        // Every screen came out with just a background → dump what the on-disk
        // page components look like so we can see what is being dropped.
        for (const pg of project?.userPages || []) {
            const comps = pg?.components || [];
            console.log(
                `[deploy][diag] page "${pg?.name}": components=${comps.length} types=${comps
                    .slice(0, 15)
                    .map(
                        (c: any) =>
                            (c && c.type) || c?.constructor?.name || "?"
                    )
                    .join(", ")}`
            );
        }
    }

    // Content signatures used to detect what actually changed since the last
    // successful deploy (the deploy-manifest.json baseline).
    const screenSignatures: Record<string, string> = {};
    for (const [name, screenData] of screenEntries) {
        screenSignatures[name] = contentSignature(JSON.stringify(screenData));
    }
    const imageSignatures: Record<string, string> = {};
    for (const img of images) {
        imageSignatures[img.name] = contentSignature(img.data_base64);
    }

    // 2. Save device-export/ as a full local backup (all screens + images).
    await makeFolder(deviceExportDir);
    const count = screenEntries.length;
    for (const [screenName, screenData] of screenEntries) {
        await writeTextFile(
            deviceExportDir + "\\" + screenName + ".json",
            JSON.stringify({ [screenName]: screenData }, null, 2)
        );
    }
    const imageDir = deviceExportDir + "\\images";
    if (images.length > 0) {
        await makeFolder(imageDir);
        for (const img of images) {
            await writeTextFile(
                imageDir + "\\" + img.name + ".json",
                JSON.stringify(img, null, 2)
            );
            await fetch(
                `/api/eez-studio/write-file?path=${encodeURIComponent(imageDir + "\\" + img.name + ".png")}`,
                { method: "POST", body: base64ToBytes(img.data_base64) as unknown as BodyInit }
            );
        }
    }

    // Diff against the last SUCCESSFUL deploy (manifest baseline). New/edited
    // screens and images are the ONLY things pushed — no manual selection.
    const previous = await readPreviousManifest(manifestPath);
    const prevScreenHashes: Record<string, string> =
        previous?.screenHashes && typeof previous.screenHashes === "object"
            ? previous.screenHashes
            : {};
    const prevImageHashes: Record<string, string> =
        previous?.imageHashes && typeof previous.imageHashes === "object"
            ? previous.imageHashes
            : {};
    const changedScreens = screenEntries
        .filter(([name]) => prevScreenHashes[name] !== screenSignatures[name])
        .map(([name]) => name);
    const changedImages = images.filter(
        (img) => prevImageHashes[img.name] !== imageSignatures[img.name]
    );
    const hasChanges = changedScreens.length > 0 || changedImages.length > 0;
    // No baseline yet (first deploy) or every screen changed → push everything.
    const needsFullDeploy =
        !previous || changedScreens.length === screenEntries.length;

    // 3. Bind the project to the chosen device (disk binding + hub binding).
    try {
        setDeviceBinding(opts.filePath, {
            ip: device.ip || "",
            panelId: device.panelId ?? device.serialNumber,
            serialNumber: device.serialNumber,
            panelName: device.deviceName || hubProject.name,
            importedAt: new Date().toISOString(),
        });
    } catch {
        /* binding file is best-effort */
    }
    try {
        designHubService.saveProjectBinding(hubProject.id, {
            serialNumber: device.serialNumber,
            building: device.building,
            floor: device.floor,
            room: device.room,
        });
    } catch {
        /* hub binding is best-effort */
    }

    // 4. Push ONLY what changed to the chosen device (direct REST). This runs
    //    automatically on every "Deploy to Device" — no user selection needed.
    let pushOk = false;
    let pushMessage = "";
    let deployed = 0;
    let imagesDeployed = 0;
    const deployedScreens: string[] = [];

    if (!hasChanges) {
        // Nothing differs from the last successful deploy.
        pushOk = true;
        pushMessage = "No changes to deploy — device is already up to date";
    } else {
        try {
            const ip = device.ip || getDeviceBinding(opts.filePath)?.ip || "";
            const conn = await deviceClient.connect(
                ip,
                device.panelId ?? device.serialNumber,
                device.serialNumber
            );
            if (conn.error) throw new Error(conn.error);

            if (needsFullDeploy) {
                // First deploy, or everything changed → one full push
                // (images first, then all screens).
                const result = await deviceClient.deployAllScreens(project);
                deployed = result?.deployed ?? 0;
                imagesDeployed = result?.imagesDeployed ?? 0;
                const status = result?.status ?? "ok";
                pushOk = status === "ok";
                pushMessage =
                    status === "ok"
                        ? `Pushed ${deployed} screen${deployed === 1 ? "" : "s"} + ${imagesDeployed} image${imagesDeployed === 1 ? "" : "s"} to device`
                        : `Pushed ${deployed}/${count} screens (${status})`;
            } else {
                // Incremental: push the changed images first (screens may
                // reference them), then only the changed screens.
                if (changedImages.length > 0) {
                    const imgRes = await deviceClient.pushImages(changedImages);
                    imagesDeployed = imgRes.deployed;
                    if (imgRes.failed > 0) {
                        throw new Error(
                            `${imgRes.failed} image${imgRes.failed === 1 ? "" : "s"} failed to upload`
                        );
                    }
                }
                const failed: string[] = [];
                for (const name of changedScreens) {
                    try {
                        await deviceClient.deployScreen(name, screens[name]);
                        deployed++;
                        deployedScreens.push(name);
                    } catch (e: any) {
                        failed.push(name);
                    }
                }
                pushOk = failed.length === 0;
                pushMessage = pushOk
                    ? changedScreens.length > 0
                        ? `Deployed ${deployed} changed screen${deployed === 1 ? "" : "s"} + ${imagesDeployed} changed image${imagesDeployed === 1 ? "" : "s"}`
                        : `Updated ${imagesDeployed} changed image${imagesDeployed === 1 ? "" : "s"}`
                    : `Failed ${failed.length}/${changedScreens.length} screens: ${failed.join(", ")}`;
            }
        } catch (e: any) {
            pushOk = false;
            pushMessage = `Device push failed: ${e?.message || e}`;
        }
    }

    // The deploy manifest doubles as the change-detection baseline, so it is
    // only refreshed once the push fully succeeded — otherwise the next deploy
    // retries the same changes.
    if (hasChanges && pushOk) {
        await writeTextFile(
            manifestPath,
            JSON.stringify(
                {
                    exportedAt: new Date().toISOString(),
                    serialNumber: device.serialNumber,
                    panelId: device.panelId,
                    screenCount: count,
                    imageCount: images.length,
                    screens: screenNames,
                    images: images.map((i) => ({
                        name: i.name,
                        width: i.width,
                        height: i.height,
                        color_format: i.color_format,
                    })),
                    screenHashes: screenSignatures,
                    imageHashes: imageSignatures,
                },
                null,
                2
            )
        );
    }

    // 5. Record deploy log + activity.
    const manifestImages = images.map((i) => ({
        name: i.name,
        width: i.width,
        height: i.height,
        color_format: i.color_format,
    }));
    try {
        designHubService.recordDeployLog(hubProject.id, {
            id: `dep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toISOString(),
            serialNumber: device.serialNumber,
            deviceName: device.deviceName,
            status: pushOk ? "success" : "warning",
            message: pushOk
                ? pushMessage
                : `${pushMessage} — screens saved locally to device-export`,
            screenCount: count,
            imageCount: images.length,
            screens: Object.keys(screens),
            images: manifestImages,
            manifestPath,
        });
    } catch {
        /* log is best-effort */
    }
    try {
        if (pushOk) {
            designHubService.markDeployed(hubProject.id);
        } else {
            designHubService.recordActivity("deployed", `Deploy failed for "${hubProject.name}"`, {
                detail: `SN ${device.serialNumber} — ${pushMessage}`,
                projectId: hubProject.id,
            });
        }
    } catch {
        /* activity is best-effort */
    }

    return {
        success: pushOk,
        message: pushOk
            ? pushMessage
            : `${pushMessage} — screens saved locally to device-export`,
        screens: Object.keys(screens),
        images: manifestImages,
        screenCount: count,
        imageCount: images.length,
        manifestPath,
        deployed,
    };
}
