/**
 * deployService.ts — unified "Deploy to Device" pipeline (single source of truth).
 *
 * Used by BOTH the EEZ editor toolbar ("Deploy to Device") and the Design Hub
 * project detail page, so every deploy entry point shares the same logic:
 *   export screens + images → write device-config/ + deploy-manifest.json →
 *   push to the chosen device via direct REST → record deploy log + activity →
 *   bind the project to the chosen device.
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
    images?: { name: string; width: number; height: number; color_format?: number }[];
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

/**
 * Deploy an EEZ/LVGL project to a device: export → device-config + manifest →
 * push → log → bind. Returns a result the drawer can show inline.
 */
export async function deployEezProject(opts: DeployEezOptions): Promise<DeployEezResult> {
    const { hubProject, device } = opts;
    let project = opts.project;
    if (!project) {
        project = await loadProjectFromDisk(opts.filePath);
    }

    const baseFolder = opts.filePath.replace(/[\\/][^\\/]+$/, "");
    const deviceConfigDir = baseFolder + "\\device-config";
    const manifestPath = deviceConfigDir + "\\deploy-manifest.json";

    // 1. Generate device JSON + images (front side).
    const screens = transformToDeviceJson(project);
    const images = deviceClient.extractDeviceImages(project as any);

    // 2. Save device-config/ (backup) + deploy-manifest.json.
    await makeFolder(deviceConfigDir);
    let count = 0;
    for (const [screenName, screenData] of Object.entries(screens)) {
        await writeTextFile(
            deviceConfigDir + "\\" + screenName + ".json",
            JSON.stringify({ [screenName]: screenData }, null, 2)
        );
        count++;
    }
    const imageDir = deviceConfigDir + "\\images";
    if (images.length > 0) {
        await makeFolder(imageDir);
        for (const img of images) {
            await writeTextFile(
                imageDir + "\\" + img.name + ".json",
                JSON.stringify(img, null, 2)
            );
            await fetch(
                `/api/eez-studio/write-file?path=${encodeURIComponent(imageDir + "\\" + img.name + ".png")}`,
                { method: "POST", body: base64ToBytes(img.data_base64) }
            );
        }
    }
    await writeTextFile(
        manifestPath,
        JSON.stringify(
            {
                exportedAt: new Date().toISOString(),
                serialNumber: device.serialNumber,
                panelId: device.panelId,
                screenCount: count,
                imageCount: images.length,
                screens: Object.keys(screens),
                images: images.map((i) => ({
                    name: i.name,
                    width: i.width,
                    height: i.height,
                    color_format: i.color_format,
                })),
            },
            null,
            2
        )
    );

    // 3. Bind the project to the chosen device (disk binding + hub binding).
    try {
        setDeviceBinding(opts.filePath, {
            ip: device.ip || "",
            panelId: device.panelId ?? device.serialNumber,
            serialNumber: device.serialNumber,
            panelName: device.deviceName || hubProject.name,
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

    // 4. Push screens + images to the chosen device (direct REST).
    let pushOk = false;
    let pushMessage = "";
    let deployed = 0;
    let imagesDeployed = 0;
    try {
        const ip = device.ip || getDeviceBinding(opts.filePath)?.ip || "";
        const conn = await deviceClient.connect(
            ip,
            device.panelId ?? device.serialNumber,
            device.serialNumber
        );
        if (conn.error) throw new Error(conn.error);
        const result = await deviceClient.deployAllScreens(project);
        deployed = result?.deployed ?? 0;
        imagesDeployed = result?.imagesDeployed ?? 0;
        pushOk = true;
        pushMessage =
            result?.status === "error"
                ? `Pushed ${deployed}/${count} screens to device`
                : `Pushed ${deployed} screen${deployed === 1 ? "" : "s"} + ${imagesDeployed} image${imagesDeployed === 1 ? "" : "s"} to device`;
    } catch (e: any) {
        pushOk = false;
        pushMessage = `Device push failed: ${e?.message || e}`;
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
                : `${pushMessage} — screens saved locally to device-config`,
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
            : `${pushMessage} — screens saved locally to device-config`,
        screens: Object.keys(screens),
        images: manifestImages,
        screenCount: count,
        imageCount: images.length,
        manifestPath,
        deployed,
    };
}
