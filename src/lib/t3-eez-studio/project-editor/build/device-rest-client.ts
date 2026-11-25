/**
 * device-rest-client.ts — REST API client for direct device communication.
 *
 * Communicates directly with the ESP32 dynamic-display REST API (the device's
 * BACnet/display API). No T3000 proxy and no BACnet fallback — the browser
 * talks straight to the device at http://<device-ip>/api/eez-device (port 80).
 *
 * ┌──────────┐  REST (direct)    ┌──────────┐
 * │ Browser  │ ────────────────→ │  ESP32   │
 * │ (EEZ)    │ ←──────────────── │  Device  │
 * └──────────┘                   └──────────┘
 *
 * Endpoints: GET/PUT /api/eez-device/screens        (full sync)
 *            GET/PUT /api/eez-device/screens/:name  (single screen)
 *            PATCH /api/eez-device/screens/:name    (delta update)
 *            GET/PUT /api/eez-device/images/*       (bitmaps)
 */

import { transformToDeviceJson, type DeviceScreen } from "./firmware-export";
import { firmwareToProject, type FirmwareScreen } from "./firmware-loader";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

/** A single key-path change for delta (PATCH) updates. */
export interface DeltaChange {
    /** Dot-separated path, e.g. "widgets.temp_label.obj_text" */
    path: string;
    /** New value to merge at that path */
    value: unknown;
}

/** Response from PUT /api/v1/screens (deploy all). */
export interface DeployAllResponse {
    deployed: number;
    failed: number;
    errors?: { screen: number; name: string; message: string }[];
    status: "ok" | "partial" | "error";
    /** Number of images pushed ahead of the screens (0 if project has no bitmaps). */
    imagesDeployed?: number;
    /** Number of images that failed to push (0 if none). */
    imagesFailed?: number;
}

/** Device capacity and free space — `GET /api/eez-device/storage/capacity`. */
export interface DeviceCapacity {
    partition: string;
    total: number;
    used: number;
    free: number;
    /** space the next deploy can use (the inactive slot is wiped when it opens) */
    slot_free: number;
    /** never allocated to a deploy */
    reserved: number;
    /** largest single file accepted */
    max_file: number;
    active_slot: "A" | "B";
    revision: number;
}

/** `GET /api/eez-device/device/status` — what the panel is actually running. */
export interface DeviceStatus {
    ui_mode: "compiled" | "dynamic";
    tier: number;
    slot: "A" | "B";
    revision: number;
    current_screen: string;
    build_ok: boolean;
    last_error: string;
    storage?: { total: number; used: number; free: number; reserved: number };
}

/** `POST /api/eez-device/deploy/begin` */
export interface DeployBeginResponse {
    deploy_id: string;
    slot: "A" | "B";
    revision: number;
    resume_from: string[];
}

/** `PUT /api/eez-device/deploy/<id>/file` */
export interface StagedFileResponse {
    path: string;
    bytes: number;
    sha256: string;
    staged: true;
}

/** `POST /api/eez-device/deploy/<id>/commit` */
export interface DeployCommitResponse {
    ok: boolean;
    revision: number;
    slot: "A" | "B";
    active_slot: "A" | "B";
    applied: boolean;
    screens?: number;
    images?: number;
    error?: string;
    problems?: { path: string; reason: string }[];
}

export type DeployPhase = "capacity" | "begin" | "stage" | "commit" | "verify" | "done";
export interface DeployProgress {
    phase: DeployPhase;
    done: number;
    total: number;
    label: string;
}

/**
 * Device image JSON — same shape the device returns on image pull.
 * Generated at the front side from project bitmaps before deploy.
 */
export interface DeviceImageJson {
    name: string;
    width: number;
    height: number;
    color_format: string;
    png_base64: string;
    data_base64: string;
    image: string;
}

/** Response from PUT /api/v1/screens/:name (deploy single). */
export interface DeployScreenResponse {
    name: string;
    status: "ok" | "error";
    error?: string;
}

/** Response from a PATCH delta update. */
export interface PatchResponse {
    applied: number;
    rejected: number;
    errors?: { path: string; message: string }[];
    status: "ok" | "partial" | "error";
}

/** Response from GET /api/v1/screens (load all). */
export interface LoadAllResponse {
    screens: FirmwareScreen[];
    meta?: {
        panel_name?: string;
        serial_number?: number;
        firmware_version?: string;
    };
}

/** Response from GET /api/v1/device/info (summary). */
export interface DeviceInfoResponse {
    panel_name: string;
    serial_number: number;
    screen_size: { width: number; height: number };
    screen_count: number;
    /** Screen names in device load order (normalized — see normalizeInfoScreens). */
    screens: string[];
    image_count: number;
    font_count: number;
    firmware_version: string;
    lvgl_version: string;
    dark_theme: boolean;
    color_format: string;
    /** Bitmap names present on the device (newer firmware). */
    images?: string[];
    /** Font names present on the device (newer firmware). */
    fonts?: string[];
}

/** Response from POST /api/eez-device/reset-defaults (factory reset). */
export interface ResetDefaultsResponse {
    status: "ok" | "error";
    /** Screens the device re-seeded from its own embedded defaults. */
    screens_restored?: number;
    message?: string;
}

/** Connection mode determined at connect time. */
export type ConnectionMode = "rest" | "bacnet";

/** Result of attempting to connect to a device. */
export interface ConnectionResult {
    mode: ConnectionMode;
    deviceIp?: string;
    panelId?: number;
    serialNumber?: number;
    error?: string;
}

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

/**
 * Toggle: true = use the Rust mock at /api/eez-device (same-origin, no hardware),
 *         false = real ESP32 dynamic-display REST API (direct HTTP to the device).
 * NOTE: there is no UI toggle — flip this constant manually for mock testing.
 */
const USE_MOCK = false;

/** Mock device base (served by the Rust backend — mirrors the real device API). */
const MOCK_BASE = "/api/eez-device";

/** Real ESP32 dynamic-display REST API (device port 80, base path /api/eez-device). */
const REST_BASE = "/api/eez-device";
// Reachability probe timeout. Do NOT make this tiny: the probe goes through the
// local proxy → Rust backend → the WiFi ESP32, which measured ~2.8s round trip
// for a healthy device (a 2s cap made it look "unreachable" while Postman, with
// no cap, worked). 10s still fails fast enough for a genuinely dead device.
const REACHABILITY_TIMEOUT_MS = 10000;
const REQUEST_TIMEOUT_MS = 30000;
/** Longer budget for deploy/push ops — the device writes screens/images to
 *  flash, and a FULL deploy of every screen over WiFi can take well over the
 *  30s general timeout (surfaced earlier as a proxy "socket hang up"). */
const DEPLOY_TIMEOUT_MS = 120000;

/**
 * Resolve the REST base URL depending on mock/real mode.
 *
 * In real mode the URL is routed through the local T3000 server proxy
 * (`/api/device-rest/<ip>/...`), which forwards to the device server-side.
 * The device sends no CORS headers, so a direct browser→device fetch is
 * blocked; proxying through our own origin avoids that entirely.
 */
function restUrl(path: string, deviceIp?: string): string {
    if (USE_MOCK) {
        return `${MOCK_BASE}/${path}`;
    }
    return `/api/device-rest/${deviceIp}${REST_BASE}/${path}`;
}

/** Decode a base64 string into raw bytes (browser-safe). */
export function base64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
}

/**
 * Parse PNG width/height from a base64-encoded PNG by reading the IHDR chunk
 * (mirrors `png_dimensions_from_base64` in the Rust mock).
 */
function pngDimensionsFromBase64(b64: string): { width: number; height: number } {
    try {
        const bytes = base64ToBytes(b64);
        // 8-byte PNG signature + IHDR: len(4) "IHDR"(4) width(4) height(4)
        if (
            bytes.length >= 24 &&
            bytes[0] === 0x89 && bytes[1] === 0x50 &&
            bytes[2] === 0x4e && bytes[3] === 0x47
        ) {
            const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
            return { width: dv.getUint32(16), height: dv.getUint32(20) };
        }
    } catch {
        /* not a valid PNG — caller falls back to 0x0 */
    }
    return { width: 0, height: 0 };
}

// ═══════════════════════════════════════════════════════════════════
// DeviceRestClient
// ═══════════════════════════════════════════════════════════════════

/**
 * Normalize the `screens` field of /device/info. Older firmware reports a plain
 * string[] (the array order IS the sequence); newer firmware reports an OBJECT
 * map whose KEYS carry the sequence explicitly:
 *   { "screen1": "start_up_screen", "screen2": "home_screen", ... }
 * Both become an ordered string[] in device load order. For the map form the
 * numeric suffix is the AUTHORITATIVE order (screen1 → 1 … screen13 → 13),
 * regardless of the JSON key insertion order — so `screen10` always sorts after
 * `screen9` (not after `screen1` as a plain lexicographic sort would). Keys that
 * are not of the screen<N> form are kept after the numbered ones, in their
 * original insertion order (stable sort).
 */
function normalizeInfoScreens(screens: any): string[] {
    if (Array.isArray(screens)) {
        // Legacy firmware: the array order is the device sequence — trust it.
        return screens.filter((s): s is string => typeof s === "string");
    }
    if (screens && typeof screens === "object") {
        const entries = Object.entries(screens).map(([key, value]) => ({
            // The numeric part of "screen<N>" is the sequence index.
            index: /^screen(\d+)$/i.exec(key)?.[1] !== undefined ? Number(/^screen(\d+)$/i.exec(key)![1]) : null,
            value,
        }));
        entries.sort((a, b) => {
            const ia = a.index ?? Number.MAX_SAFE_INTEGER;
            const ib = b.index ?? Number.MAX_SAFE_INTEGER;
            if (ia !== ib) return ia - ib;
            return 0; // stable → keeps insertion order for unnumbered keys
        });
        return entries
            .map((e) => e.value)
            .filter((v): v is string => typeof v === "string");
    }
    return [];
}

/** Coerce an optional JSON array of names into string[]. */
function toStringArray(value: any): string[] | undefined {
    return Array.isArray(value) ? value.filter((s): s is string => typeof s === "string") : undefined;
}

export class DeviceRestClient {
    private mode: ConnectionMode = "rest";
    private deviceIp: string = "";
    private panelId: number = 0;
    private serialNumber: number = 0;

    /** Panel ID used for device image/screen pull path (set by connect()). */
    get devicePanelId(): number {
        return this.panelId;
    }

    /** Device serial number (set by connect()). */
    get deviceSerialNumber(): number {
        return this.serialNumber;
    }

    // ── Connection & Reachability ─────────────────────────────────

    /**
     * Probe a device IP to determine if the REST API is reachable.
     * Returns the connection mode to use.
     *
     * @param deviceIp  IP address of the ESP32 device
     * @param panelId   Optional panel ID (used in image pull path)
     * @param serialNumber Optional serial number (recorded in deploy manifest)
     */
    async connect(
        deviceIp: string,
        panelId?: number,
        serialNumber?: number
    ): Promise<ConnectionResult> {
        this.deviceIp = deviceIp;
        this.panelId = panelId ?? 0;
        this.serialNumber = serialNumber ?? 0;

        // Direct REST is the only transport — no BACnet fallback.
        const reachable = await this.isReachable(deviceIp);
        if (reachable) {
            this.mode = "rest";
            return { mode: "rest", deviceIp };
        }

        // ── BACnet fallback removed — direct REST only ──────────────────────
        // if (this.panelId && this.serialNumber) {
        //     this.mode = "bacnet";
        //     return { mode: "bacnet", panelId: this.panelId, serialNumber: this.serialNumber };
        // }

        return {
            mode: "rest",
            error:
                `Device "${deviceIp}" is unreachable via its REST API ` +
                `(${restUrl("device/info", deviceIp)})`,
        };
    }

    /**
     * Quick probe: is the device's REST API alive?
     * Uses a short timeout so the UI doesn't hang on unreachable devices.
     */
    async isReachable(deviceIp: string): Promise<boolean> {
        if (USE_MOCK) return true; // mock always reachable
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS);
            // GET the lightweight device-info endpoint via the local proxy. The
            // device returns 405 for HEAD and direct fetches are CORS-blocked,
            // so a proxied GET is the reliable probe.
            const response = await fetch(
                `/api/device-rest/${deviceIp}${REST_BASE}/device/info`,
                { method: "GET", signal: controller.signal }
            );
            clearTimeout(timer);
            return response.ok;
        } catch {
            return false;
        }
    }

    get connectionMode(): ConnectionMode {
        return this.mode;
    }

    // ── Device Info (Summary) ────────────────────────────────────

    /**
     * Get lightweight device metadata before fetching screens.
     * REST path: GET /api/v1/device/info
     */
    async getDeviceInfo(): Promise<DeviceInfoResponse> {
        // Direct REST only — BACnet fallback removed.
        if (this.mode !== "rest") {
            throw new Error("Device not connected via REST API");
        }

        const response = await fetch(
            restUrl("device/info", this.deviceIp),
            { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
        );
        if (!response.ok) {
            throw new Error(`Device returned ${response.status}`);
        }
        const json = (await response.json()) as any;
        return {
            panel_name: json.panel_name ?? "",
            serial_number: json.serial_number ?? 0,
            screen_size: json.screen_size ?? { width: 0, height: 0 },
            screen_count: json.screen_count ?? 0,
            // screens may arrive as a string[] (legacy) or an object map
            // {screen1:name,...} — normalize to an ordered name[].
            screens: normalizeInfoScreens(json.screens),
            image_count: json.image_count ?? 0,
            font_count: json.font_count ?? 0,
            firmware_version: json.firmware_version ?? "",
            lvgl_version: json.lvgl_version ?? "",
            dark_theme: json.dark_theme ?? false,
            color_format: json.color_format ?? "",
            images: toStringArray(json.images),
            fonts: toStringArray(json.fonts),
        };
    }

    // ── Full Sync: Load All ───────────────────────────────────────

    /**
     * Load ALL screens from the device.
     * REST path: GET http://<ip>/api/eez-device/screens
     */
    async loadAllScreens(): Promise<LoadAllResponse> {
        // Direct REST only — BACnet fallback removed.
        if (this.mode !== "rest") {
            throw new Error("Device not connected via REST API");
        }
        return this.restLoadAll();
    }

    private async restLoadAll(): Promise<LoadAllResponse> {
        const response = await fetch(
            restUrl("screens", this.deviceIp),
            { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
        );
        if (!response.ok) {
            throw new Error(`Device returned ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }

    // ── BACnet fallback removed — direct REST only ─────────────────────────
    // private async bacnetLoadAll(): Promise<LoadAllResponse> {
    //     const response = await fetch(
    //         `/api/eez-device/screens/pull/${this.panelId}`,
    //         {
    //             method: "POST",
    //             headers: { "Content-Type": "application/json" },
    //             body: JSON.stringify({ serial_number: this.serialNumber }),
    //             signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    //         }
    //     );
    //     if (!response.ok) {
    //         throw new Error(`T3000 returned ${response.status}`);
    //     }
    //     return response.json();
    // }

    // ── Full Sync: Deploy All ─────────────────────────────────────

    /**
     * Deploy ALL screens AND their images to the device.
     *
     * Step 1 — Generate image JSON at the front side: extract the PNG payload
     *          from each project bitmap (data URL) into the device image format
     *          {name,width,height,color_format,png_base64,data_base64,image}.
     * Step 2 — Push images FIRST (the device must have them before any screen
     *          references them by name).
     *          REST:    POST http://<ip>/api/eez-device/images/push
     * Step 3 — Push screens (existing transform + deploy).
     *
     * @param projectJson  The raw .eez-project JSON (parsed object)
     */
    async deployAllScreens(projectJson: Record<string, unknown>): Promise<DeployAllResponse> {
        // Step 1 — generate images at the front side
        const images = this.extractDeviceImages(projectJson);

        // Step 2 — push images first (best-effort; screen push still proceeds)
        let imagesDeployed = 0;
        let imagesFailed = 0;
        if (images.length > 0) {
            const imgResult = await this.pushImages(images);
            imagesDeployed = imgResult.deployed;
            imagesFailed = imgResult.failed;
        }

        // Step 3 — transform + push screens
        const deviceScreens = transformToDeviceJson(projectJson as any);
        const screens = Object.entries(deviceScreens).map(([name, screen]) => ({
            name,
            json: screen,
        }));

        // Direct REST only — BACnet fallback removed.
        const result = await this.restDeployAll(screens);

        return { ...result, imagesDeployed, imagesFailed };
    }

    // ── Transactional deploy (screen deploy lifecycle v2) ──────────────
    //
    // All-or-nothing deployment: capacity preflight, then begin → stage every
    // file → commit. A failure before commit leaves the previous screen set
    // active on the device. Contract:
    // docs/t3000/t3-eez-studio/device-interface-deployment-via-bacnet-design.md

    /** Free space and slot state, used as the pre-deploy gate. */
    async getCapacity(): Promise<DeviceCapacity> {
        const response = await fetch(restUrl("storage/capacity", this.deviceIp), {
            signal: AbortSignal.timeout(DEPLOY_TIMEOUT_MS),
        });
        if (!response.ok) {
            throw new Error(`Device returned ${response.status} for capacity`);
        }
        return response.json();
    }

    /** What the device is actually running: slot, revision, build state. */
    async getStatus(): Promise<DeviceStatus> {
        const response = await fetch(restUrl("device/status", this.deviceIp), {
            signal: AbortSignal.timeout(DEPLOY_TIMEOUT_MS),
        });
        if (!response.ok) {
            throw new Error(`Device returned ${response.status} for status`);
        }
        return response.json();
    }

    /** Opens a deploy transaction and reserves the inactive slot. */
    async beginDeploy(
        revision: number,
        startScreen: string,
        totals: { files: number; bytes: number }
    ): Promise<DeployBeginResponse> {
        const response = await fetch(restUrl("deploy/begin", this.deviceIp), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                schema: 1,
                revision,
                start_screen: startScreen,
                files: totals.files,
                bytes: totals.bytes,
            }),
            signal: AbortSignal.timeout(DEPLOY_TIMEOUT_MS),
        });
        if (!response.ok) {
            const detail = await response.text().catch(() => "");
            throw new Error(`begin failed: ${response.status} ${detail}`.trim());
        }
        return response.json();
    }

    /** Stages one file into the inactive slot. `relPath` is `screens/<name>` or `images/<name>`. */
    async stageFile(
        deployId: string,
        relPath: string,
        body: string
    ): Promise<StagedFileResponse> {
        const query = encodeURIComponent(relPath);
        const response = await fetch(
            restUrl(`deploy/${deployId}/file?path=${query}`, this.deviceIp),
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body,
                signal: AbortSignal.timeout(DEPLOY_TIMEOUT_MS),
            }
        );
        if (!response.ok) {
            const detail = await response.text().catch(() => "");
            throw new Error(`stage ${relPath} failed: ${response.status} ${detail}`.trim());
        }
        return response.json();
    }

    /** Validates the staged set and activates it with one record write. */
    async commitDeploy(deployId: string): Promise<DeployCommitResponse> {
        const response = await fetch(restUrl(`deploy/${deployId}/commit`, this.deviceIp), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
            signal: AbortSignal.timeout(DEPLOY_TIMEOUT_MS),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            const problems = payload?.problems
                ?.map((p: { path: string; reason: string }) => `${p.path}: ${p.reason}`)
                .join("; ");
            throw new Error(
                `commit rejected${problems ? ` (${problems})` : ""}: ${response.status}`
            );
        }
        return payload as DeployCommitResponse;
    }

    /** Discards the inactive slot. Best effort — never masks the original error. */
    async abortDeploy(deployId: string): Promise<void> {
        try {
            await fetch(restUrl(`deploy/${deployId}/abort`, this.deviceIp), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
                signal: AbortSignal.timeout(DEPLOY_TIMEOUT_MS),
            });
        } catch {
            /* the slot is discarded on the next begin anyway */
        }
    }

    /**
     * All-or-nothing deploy of a whole project.
     *
     * Throws if the set does not fit, if any file is rejected, or if commit
     * fails; in every failure case the previously active screen set is
     * untouched. Returns the commit response, which carries the new revision.
     */
    async deployTransactional(
        projectJson: Record<string, unknown>,
        revision: number,
        startScreen: string,
        onProgress?: (p: DeployProgress) => void
    ): Promise<DeployCommitResponse> {
        const images = this.extractDeviceImages(projectJson);
        const deviceScreens = transformToDeviceJson(projectJson as any);
        const screens = Object.entries(deviceScreens);

        const imageBodies = images.map((img) => ({
            path: `images/${img.name}`,
            body: JSON.stringify({ name: img.name, data_base64: img.data_base64 }),
        }));
        const screenBodies = screens.map(([name, screen]) => ({
            path: `screens/${name}`,
            body: JSON.stringify(screen),
        }));
        const all = [...imageBodies, ...screenBodies];
        const totalBytes = all.reduce((n, f) => n + f.body.length, 0);

        /* The device stores each file as <area>/<name>.json and accepts only
           [A-Za-z0-9_-], so fail before opening a transaction rather than
           half-way through one. */
        const nameRe = /^[A-Za-z0-9_-]{1,60}$/;
        const badNames = all
            .filter((f) => !nameRe.test(f.path.replace(/^(screens|images)\//, "")))
            .map((f) => f.path);
        if (badNames.length > 0) {
            throw new Error(
                `These names cannot be stored on the device (use letters, digits, "_" or "-", ` +
                    `max 60): ${badNames.join(", ")}`
            );
        }

        onProgress?.({ phase: "capacity", done: 0, total: all.length, label: "checking space" });
        const cap = await this.getCapacity();
        const usable = cap.slot_free - cap.reserved;
        if (totalBytes > usable) {
            throw new Error(
                `Screen set needs ${totalBytes} B but the device has ${usable} B usable ` +
                    `(free ${cap.free}, reserved ${cap.reserved})`
            );
        }

        onProgress?.({
            phase: "begin",
            done: 0,
            total: all.length,
            label: `opening transaction for revision ${revision}`,
        });
        const begin = await this.beginDeploy(revision, startScreen, {
            files: all.length,
            bytes: totalBytes,
        });

        try {
            let done = 0;
            for (const file of all) {
                await this.stageFile(begin.deploy_id, file.path, file.body);
                done++;
                onProgress?.({ phase: "stage", done, total: all.length, label: file.path });
            }

            onProgress?.({
                phase: "commit",
                done,
                total: all.length,
                label: "validating and activating",
            });
            const commit = await this.commitDeploy(begin.deploy_id);

            /* 200 means persisted; the panel paints on the next LCD iteration.
               `applied` is advisory and false until the renderer exists. */
            onProgress?.({
                phase: "verify",
                done,
                total: all.length,
                label: `device now reports revision ${commit.revision}`,
            });
            onProgress?.({ phase: "done", done, total: all.length, label: "deployed" });
            return commit;
        } catch (err) {
            await this.abortDeploy(begin.deploy_id);
            throw err;
        }
    }

    private async restDeployAll(
        screens: { name: string; json: DeviceScreen }[]
    ): Promise<DeployAllResponse> {
        const response = await fetch(
            restUrl("screens", this.deviceIp),
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ screens }),
                signal: AbortSignal.timeout(DEPLOY_TIMEOUT_MS),
            }
        );
        if (!response.ok) {
            throw new Error(`Device returned ${response.status}`);
        }
        return response.json();
    }

    // ── BACnet fallback removed — direct REST only ─────────────────────────
    // private async bacnetDeployAll(
    //     screens: { name: string; json: DeviceScreen }[]
    // ): Promise<DeployAllResponse> {
    //     const response = await fetch(
    //         `/api/eez-device/screens/push/${this.panelId}`,
    //         {
    //             method: "POST",
    //             headers: { "Content-Type": "application/json" },
    //             body: JSON.stringify({
    //                 serial_number: this.serialNumber,
    //                 screens,
    //             }),
    //             signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    //         }
    //     );
    //     if (!response.ok) {
    //         throw new Error(`T3000 returned ${response.status}`);
    //     }
    //     return response.json();
    // }

    // ── Image Generation & Push ───────────────────────────────────

    /**
     * Generate device image JSON from the project's bitmap list.
     *
     * Each project bitmap is `{ name, image: "data:image/png;base64,..." }`.
     * Produces the same shape the device returns on image pull, so the screen
     * JSON (which references bitmaps by name) resolves on the device.
     */
    extractDeviceImages(projectJson: Record<string, unknown>): DeviceImageJson[] {
        const bitmaps = (projectJson.bitmaps as any[]) || [];
        const images: DeviceImageJson[] = [];
        for (const bmp of bitmaps) {
            const name: string | undefined = bmp?.name;
            const image: unknown = bmp?.image;
            if (!name || typeof image !== "string" || !image) continue;

            const m = image.match(/^data:image\/(png|jpeg|jpg|gif|bmp);base64,(.+)$/);
            if (!m) continue; // file-path bitmaps can't be read in-browser — skip

            const dataBase64 = m[2].trim();
            const { width, height } = pngDimensionsFromBase64(dataBase64);
            const colorFormat =
                (projectJson as any).settings?.general?.colorFormat || "NATIVE_WITH_ALPHA";

            images.push({
                name,
                width,
                height,
                color_format: colorFormat,
                png_base64: dataBase64,
                data_base64: dataBase64,
                image: `data:image/${m[1]};base64,${dataBase64}`,
            });
        }
        return images;
    }

    /**
     * Push generated image JSON to the device.
     * REST: POST http://<ip>/api/eez-device/images/push  body {name,data_base64}
     * (device API is single-device — no panelId segment needed)
     */
    async pushImages(images: DeviceImageJson[]): Promise<{ deployed: number; failed: number }> {
        let deployed = 0;
        let failed = 0;
        for (const img of images) {
            try {
                // Direct REST only — BACnet fallback removed.
                await this.restPushImage(img);
                deployed++;
            } catch {
                failed++;
            }
        }
        return { deployed, failed };
    }

    private async restPushImage(img: DeviceImageJson): Promise<void> {
        // Device image API: POST /api/eez-device/images/push  body {name, data_base64}
        const response = await fetch(
            restUrl(`images/push`, this.deviceIp),
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: img.name, data_base64: img.data_base64 }),
                signal: AbortSignal.timeout(DEPLOY_TIMEOUT_MS),
            }
        );
        if (!response.ok) {
            throw new Error(`Device returned ${response.status}`);
        }
    }

    // ── BACnet fallback removed — direct REST only ─────────────────────────
    // private async bacnetPushImage(img: DeviceImageJson): Promise<void> {
    //     const response = await fetch(
    //         `/api/eez-device/images/push/${this.panelId}`,
    //         {
    //             method: "POST",
    //             headers: { "Content-Type": "application/json" },
    //             body: JSON.stringify({ name: img.name, data_base64: img.data_base64 }),
    //             signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    //         }
    //     );
    //     if (!response.ok) {
    //         throw new Error(`T3000 returned ${response.status}`);
    //     }
    // }

    /**
     * Pull a stored image (bitmap) from the device by name.
     * REST: GET http://<ip>/api/eez-device/images/pull/:name
     * (device API is single-device — no panelId segment needed)
     */
    async pullImage(name: string): Promise<{ name?: string; data_base64?: string }> {
        if (this.mode !== "rest") {
            throw new Error("Device not connected via REST API");
        }
        const response = await fetch(
            restUrl(`images/pull/${encodeURIComponent(name)}`, this.deviceIp),
            { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
        );
        if (!response.ok) {
            throw new Error(`Device returned ${response.status}`);
        }
        return response.json();
    }

    // ── Single Screen ─────────────────────────────────────────────

    /** Load a single screen by name. */
    async loadScreen(name: string): Promise<FirmwareScreen> {
        // Direct REST only — BACnet fallback removed.
        if (this.mode !== "rest") {
            throw new Error("Device not connected via REST API");
        }

        const response = await fetch(
            restUrl(`screens/${encodeURIComponent(name)}`, this.deviceIp),
            { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
        );
        if (!response.ok) {
            throw new Error(`Device returned ${response.status}`);
        }
        return response.json();
    }

    /** Deploy a single screen by name. */
    async deployScreen(name: string, json: DeviceScreen): Promise<DeployScreenResponse> {
        // Direct REST only — BACnet fallback removed.
        if (this.mode !== "rest") {
            throw new Error("Device not connected via REST API");
        }

        const response = await fetch(
            restUrl(`screens/${encodeURIComponent(name)}`, this.deviceIp),
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ json }),
                signal: AbortSignal.timeout(DEPLOY_TIMEOUT_MS),
            }
        );
        if (!response.ok) {
            throw new Error(`Device returned ${response.status}`);
        }
        return response.json();
    }

    // ── Delta Updates (PATCH) ────────────────────────────────────

    /**
     * Send a delta (PATCH) update — only changed key paths.
     * REST: PATCH http://<ip>/api/eez-device/screens/:name
     * (direct REST only — no BACnet delta)
     */
    async patchScreen(name: string, changes: DeltaChange[]): Promise<PatchResponse> {
        if (this.mode !== "rest") {
            // Delta updates require the device REST API (direct REST is the only transport).
            throw new Error("Device not connected via REST API");
        }

        const response = await fetch(
            restUrl(`screens/${encodeURIComponent(name)}`, this.deviceIp),
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ changes }),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            }
        );
        if (!response.ok) {
            throw new Error(`Device returned ${response.status}`);
        }
        return response.json();
    }

    /**
     * Send a delta update for a single widget.
     * REST: PATCH /api/v1/screens/:name/widgets/:id
     */
    async patchWidget(
        screenName: string,
        widgetId: string,
        changes: DeltaChange[]
    ): Promise<PatchResponse> {
        if (this.mode !== "rest") {
            throw new Error("Device not connected via REST API");
        }

        const response = await fetch(
            restUrl(`screens/${encodeURIComponent(screenName)}/widgets/${encodeURIComponent(widgetId)}`, this.deviceIp),
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ changes }),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            }
        );
        if (!response.ok) {
            throw new Error(`Device returned ${response.status}`);
        }
        return response.json();
    }

    // ── Factory reset ────────────────────────────────────────────

    /**
     * Restore the device's UI to the firmware's **factory defaults**.
     *
     * REST: `POST http://<ip>/api/eez-device/reset-defaults`
     *
     * No body and nothing to select: the device formats its `screen_data` SPIFFS
     * partition and re-seeds the screens/images embedded in its own build
     * (`temco_dynamic_display/DefaultScreens` + `DefaultImages`). The request
     * therefore destroys every user-deployed screen and image on that device —
     * the studio side is untouched, and the way back is a normal deploy.
     *
     * Formatting flash plus 35 file writes takes seconds, so this uses the
     * deploy budget, not the general request timeout. Sibling URIs
     * (`set-default-screens`, `load-default-screens`) do the same thing.
     */
    async resetToDefaults(): Promise<ResetDefaultsResponse> {
        if (this.mode !== "rest") {
            throw new Error("Device not connected via REST API");
        }

        const response = await fetch(restUrl("reset-defaults", this.deviceIp), {
            method: "POST",
            signal: AbortSignal.timeout(DEPLOY_TIMEOUT_MS),
        });
        // The device answers JSON on success/failure, but the local proxy answers
        // a 502 with its own JSON — read the body first so neither message is lost.
        const text = await response.text();
        let parsed: any = null;
        try {
            parsed = text ? JSON.parse(text) : null;
        } catch {
            parsed = null;
        }
        if (!response.ok || parsed?.status === "error") {
            throw new Error(
                parsed?.message ||
                    (response.ok ? "Device reported a reset failure" : `Device returned ${response.status}`)
            );
        }
        return (parsed ?? { status: "ok" }) as ResetDefaultsResponse;
    }

    // ── Utility ───────────────────────────────────────────────────

    /**
     * Convert loaded firmware screens into a .eez-project object
     * (reusing firmware-loader.ts).
     */
    screensToProject(screens: FirmwareScreen[]): Record<string, unknown> {
        return firmwareToProject(screens, {
            panel_name: `Device ${this.deviceIp}`,
            serial_number: this.serialNumber,
        }) as unknown as Record<string, unknown>;
    }
}

// ═══════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════

/** Shared client instance for the EEZ Editor. Call `connect()` before use. */
export const deviceClient = new DeviceRestClient();
