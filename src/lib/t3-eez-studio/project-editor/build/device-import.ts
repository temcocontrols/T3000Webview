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
import { generateAllParameterGrids } from "./generate-parameter-grid";

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
    // Panel names are not guaranteed unique across devices — append the device
    // serial number (SN) so importing two same-named panels doesn't collide on
    // the same project folder/file (e.g. "MyPanel_SN123456").
    const projectName = `${device.name}_SN${device.serialNumber}`;
    const projectDir = opts.projectDir || `project/${projectName}`;
    const stagingDir = `${projectDir}/device-import`;
    const log = onLog;

    // Use the REAL device IP from the caller's device record (design hub list,
    // EEZ home device list, or the stored project binding). No mock override.
    log(`Importing from ${device.name}`);
    log(`  → IP: ${device.ip || "(no IP on record)"}  SN: ${device.serialNumber}`);
    log(`  → Project: ${projectDir}`);

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
    log(`✔ Step 1 — Connected via ${conn.mode.toUpperCase()}${device.ip ? ` (${device.ip})` : ""}`);

    // Step 2 — device summary (screen names, counts, sizes)
    log("=> Step 2 — Fetching device info...");
    const info = await client.getDeviceInfo();
    log(
        `✔ Step 2 — ${info.screen_count} screens, ${info.image_count} images, ` +
            `${info.screen_size.width}x${info.screen_size.height}`
    );

    // Step 3 — load each screen individually (order = device info's screens
    // list as-is; the device is responsible for reporting the correct order).
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
    log("✔ Step 4 — Project built");

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
        log(`✔ Step 4.5 — Images ready (${loadedImageCount}/${project.bitmaps.length})`);
    }

    // Step 4.6 — generate default parameter grids (INPUT/OUTPUT/VARIABLE) from
    // the DB. The firmware keeps ONE parameters screen whose table is rebuilt
    // per type (main-menu Inputs/Outputs/Variables), so we fill three stacked
    // panels — each with its own columns + default data — and wire the buttons.
    log("=> Step 4.6 — Generating parameter grids (input/output/variable)...");
    let gridCells = 0;
    try {
        const [inResp, outResp, varResp] = await Promise.all([
            fetch(`/api/t3_device/devices/${device.serialNumber}/input-points`),
            fetch(`/api/t3_device/devices/${device.serialNumber}/output-points`),
            fetch(`/api/t3_device/devices/${device.serialNumber}/variable-points`),
        ]);
        const [inData, outData, varData] = await Promise.all([
            inResp.ok ? inResp.json() : null,
            outResp.ok ? outResp.json() : null,
            varResp.ok ? varResp.json() : null,
        ]);
        const res = generateAllParameterGrids(project as any, {
            inputPoints: (inData && inData.input_points) || [],
            outputPoints: (outData && outData.output_points) || [],
            variablePoints: (varData && varData.variable_points) || [],
        });
        gridCells = res.added;
        log(
            `  → ${(inData?.input_points || []).length} inputs, ` +
                `${(outData?.output_points || []).length} outputs, ` +
                `${(varData?.variable_points || []).length} variables → ` +
                `${gridCells} grid cells across [${res.panels.join(", ")}]`
        );
    } catch (err) {
        console.error("[device-import] parameter grid generation failed:", err);
        log("  → grid generation skipped (no point data)");
    }
    log(`✔ Step 4.6 — Parameter grids ready (${gridCells} cells)`);

    // Step 5 — save the .eez-project
    // When a caller passes an explicit projectDir, name the file after the
    // folder (keeps folder/file consistent); otherwise use the SN-qualified name.
    const projectFileName = opts.projectDir
        ? projectDir.split("/").filter(Boolean).pop() || projectName
        : projectName;
    const projectPath = `${projectDir}/${projectFileName}.eez-project`;
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

export type ImportLogStepStatus = "done" | "active" | "error";

export interface ImportLogStep {
    num: string;
    text: string;
    status: ImportLogStepStatus;
    /** Detail lines logged while this step was in progress (e.g. screen list). */
    details: string[];
}

export interface ResolvedImportLog {
    steps: ImportLogStep[];
    /** Lines logged before the first step (e.g. "Importing from …", IP/SN). */
    header: string[];
}

/**
 * Resolve the flat marker log (=> / ✔ / X / → lines) into a per-step summary.
 * Each numbered step collapses to ONE row whose status flips from `active` to
 * `done`/`error` when its completion line arrives, and the `→` / plain lines
 * logged while a step is in progress are attached as nested details under it.
 * Lines logged before the first step go into `header`.
 */
export function resolveImportLog(log: string[]): ResolvedImportLog {
    const steps: ImportLogStep[] = [];
    const header: string[] = [];
    let current = -1; // index of the step that detail lines attach to
    const stepNum = (t: string) => (t.match(/Step (\d+(?:\.\d+)?)/) || [])[1] || "";
    const findActive = (num: string) => steps.findIndex(s => s.num === num && s.status === "active");
    for (const line of log) {
        let m = /^=>\s*(.+)/.exec(line);
        if (m) {
            steps.push({ num: stepNum(m[1]), text: m[1], status: "active", details: [] });
            current = steps.length - 1;
            continue;
        }
        m = /^✔\s*(.+)/.exec(line);
        if (m) {
            const num = stepNum(m[1]);
            const idx = findActive(num);
            if (idx >= 0) {
                steps[idx] = { ...steps[idx], text: m[1], status: "done" };
            } else {
                steps.push({ num, text: m[1], status: "done", details: [] });
            }
            current = idx >= 0 ? idx : steps.length - 1;
            continue;
        }
        m = /^X\s*(.+)/.exec(line);
        if (m) {
            const num = stepNum(m[1]);
            const idx = findActive(num);
            if (idx >= 0) {
                steps[idx] = { ...steps[idx], text: m[1], status: "error" };
            } else {
                steps.push({ num, text: m[1], status: "error", details: [] });
            }
            current = idx >= 0 ? idx : steps.length - 1;
            continue;
        }
        m = /^→\s*(.+)/.exec(line);
        const detail = m ? m[1] : line;
        if (!detail.trim()) continue;
        if (current >= 0) {
            steps[current].details.push(detail);
        } else {
            header.push(detail);
        }
    }
    return { steps, header };
}
