/**
 * device-import.ts — shared "Load from Device" pipeline.
 *
 * The EEZ home page (`open-projects-v2.tsx` → `startImport`) and the Design Hub
 * LVGL dialog (`LvglCreateDialog.tsx` → `runImport`) used to duplicate this
 * step-by-step flow. This single function is the one place that does:
 *
 *   connect → device/info → load screens → write staging → build project
 *   → pull images → save project → bind device
 *
 * Callers supply a `DeviceRestClient` + device info + a log callback, then
 * handle their own UI afterwards (recent-projects MRU, editor tab, navigation,
 * import history, ...).
 */

import { DeviceRestClient } from "./device-rest-client";
import { firmwareToProject } from "./firmware-loader";
import { setDeviceBinding } from "./device-binding";

export interface DeviceImportInfo {
    name: string;
    ip: string;
    serialNumber: number;
    panelId: number;
}

export interface DeviceImportOptions {
    client: DeviceRestClient;
    device: DeviceImportInfo;
    /** Folder to write into, e.g. "project/MyPanel" (defaults to `project/${name}`). */
    projectDir?: string;
    /** Progress log callback (receives => / ✔ / X lines). */
    onLog?: (msg: string) => void;
}

export interface DeviceImportResult {
    project: ReturnType<typeof firmwareToProject>;
    projectPath: string;
    screenCount: number;
    loadedImageCount: number;
}

async function makeFolder(path: string) {
    await fetch(`/api/eez-studio/make-folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
    });
}

export async function importProjectFromDevice(
    opts: DeviceImportOptions
): Promise<DeviceImportResult> {
    const { client, device, onLog = () => {} } = opts;
    const projectDir = opts.projectDir || `project/${device.name}`;
    const stagingDir = `${projectDir}/device-import`;
    const log = onLog;

    log(`Importing from ${device.name}`);
    log(`  → IP: ${device.ip || "(mock)"}  SN: ${device.serialNumber}`);

    // Step 0 — create project folder skeleton
    log("=> Step 0 — Creating project folder...");
    await makeFolder(stagingDir);
    log("✔ Step 0 — Project folder ready");

    // Step 1 — connect via direct REST (through the T3000 proxy)
    log("=> Step 1 — Connecting to device...");
    const conn = await client.connect(device.ip, device.panelId, device.serialNumber);
    if (conn.error) {
        throw new Error(
            `Cannot reach device${device.ip ? ` at ${device.ip}` : " (no IP on record)"}: ${conn.error}`
        );
    }
    log(`✔ Step 1 — Connected via ${conn.mode.toUpperCase()}${device.ip ? ` (${device.ip})` : " (mock)"}`);

    // Step 2 — device summary (screen names, counts, sizes)
    log("=> Step 2 — Fetching device info...");
    const info = await client.getDeviceInfo();
    log(
        `✔ Step 2 — ${info.screen_count} screens, ${info.image_count} images, ` +
            `${info.screen_size.width}x${info.screen_size.height}`
    );

    // Step 3 — load each screen individually
    log(`=> Step 3 — Loading ${info.screen_count} screens...`);
    const stagingScreens: { name: string; json: any }[] = [];
    for (const screenName of info.screens) {
        const screen = await client.loadScreen(screenName);
        const screenPath = `${stagingDir}/${screenName}.json`;
        await fetch(`/api/eez-studio/write-file?path=${encodeURIComponent(screenPath)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(screen.json),
        });
        stagingScreens.push(screen);
        const kb = Math.round(JSON.stringify(screen.json).length / 1024);
        log(`  → ${screen.name} — ${kb}KB`);
    }
    log(`✔ Step 3 — Loaded ${stagingScreens.length} screens`);

    // Step 4 — build the .eez-project
    log("=> Step 4 — Building project...");
    const project = firmwareToProject(
        stagingScreens,
        {
            panel_name: device.name,
            serial_number: device.serialNumber,
            ip_address: device.ip,
            panel_id: device.panelId,
        },
        {
            displaySize: { width: info.screen_size.width, height: info.screen_size.height },
            lvglVersion: info.lvgl_version,
            darkTheme: info.dark_theme,
            colorFormat: info.color_format,
        }
    );

    // Step 4.5 — pull + embed bitmap images
    let loadedImageCount = 0;
    if (project.bitmaps?.length) {
        const imgDir = `${stagingDir}/imgs`;
        await makeFolder(imgDir);
        log(`=> Step 4.5 — Extracting ${project.bitmaps.length} images...`);
        for (const bmp of project.bitmaps) {
            if (!bmp.name) continue;
            try {
                const data = await client.pullImage(bmp.name);
                if (data?.data_base64) {
                    const imgPath = `${imgDir}/${bmp.name}.png`;
                    const binaryStr = atob(data.data_base64);
                    const pngBytes = new Uint8Array(binaryStr.length);
                    for (let i = 0; i < binaryStr.length; i++) {
                        pngBytes[i] = binaryStr.charCodeAt(i);
                    }
                    await fetch(`/api/eez-studio/write-file?path=${encodeURIComponent(imgPath)}`, {
                        method: "POST",
                        body: pngBytes,
                    });
                    bmp.image = `data:image/png;base64,${data.data_base64}`;
                    loadedImageCount++;
                }
            } catch {
                /* skip images not present on the device */
            }
        }
        log(`  → ${loadedImageCount}/${project.bitmaps.length} images saved to ${imgDir}`);
    }

    // Step 5 — save the .eez-project
    const projectPath = `${projectDir}/${device.name}.eez-project`;
    log("=> Step 5 — Saving project...");
    const saveResp = await fetch(`/api/eez-studio/write-text-file?path=${encodeURIComponent(projectPath)}`, {
        method: "POST",
        body: JSON.stringify(project, null, 2),
    });
    if (!saveResp.ok) throw new Error("Failed to save project");
    log("✔ Step 5 — Project saved");

    // Bind project → source device (used by "Deploy to Device")
    try {
        setDeviceBinding(projectPath, {
            ip: device.ip,
            panelId: device.panelId,
            serialNumber: device.serialNumber,
            panelName: device.name,
            importedAt: new Date().toISOString(),
        });
    } catch (err) {
        console.error("[device-import] device binding failed:", err);
    }

    return { project, projectPath, screenCount: stagingScreens.length, loadedImageCount };
}
