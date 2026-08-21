/**
 * device-rest-client.ts — REST API client for direct device communication.
 *
 * Communicates with the ESP32-hosted REST API (primary path) with automatic
 * BACnet fallback through T3000 when the device is unreachable via HTTP.
 *
 * ┌──────────┐  REST (primary)    ┌──────────┐
 * │ Browser  │ ─────────────────→ │  ESP32   │
 * │ (EEZ)    │ ←───────────────── │  Device  │
 * └──────────┘                    └──────────┘
 *      │                                │
 *      └── BACnet fallback ──→ T3000 ──→ Device
 *
 * Endpoints: GET/PUT /api/v1/screens   (full sync)
 *            GET/PUT /api/v1/screens/:name  (single screen)
 *            PATCH /api/v1/screens/:name    (delta update)
 *            PATCH /api/v1/screens/:name/widgets/:id  (widget delta)
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
    screens: string[];
    image_count: number;
    font_count: number;
    firmware_version: string;
    lvgl_version: string;
    dark_theme: boolean;
    color_format: string;
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

/** Toggle: true = use Rust mock at localhost:9103, false = real ESP32 */
const USE_MOCK = true;

/** Mock device base (hits Rust backend at localhost:9103) */
const MOCK_BASE = "/api/eez-device";

/** Real ESP32 REST API */
const REST_BASE = "/api/v1";
const REST_PORT = 8000;
const REACHABILITY_TIMEOUT_MS = 2000;
const REQUEST_TIMEOUT_MS = 30000;

/** Resolve the REST base URL depending on mock/real mode */
function restUrl(path: string, deviceIp?: string): string {
    if (USE_MOCK) {
        return `${MOCK_BASE}/${path}`;
    }
    return `http://${deviceIp}:${REST_PORT}${REST_BASE}/${path}`;
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

export class DeviceRestClient {
    private mode: ConnectionMode = "rest";
    private deviceIp: string = "";
    private panelId: number = 0;
    private serialNumber: number = 0;

    /** Panel ID used for BACnet image/screen push (set by connect()). */
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
     * @param panelId   Optional panel ID for BACnet fallback
     * @param serialNumber Optional serial number for BACnet fallback
     */
    async connect(
        deviceIp: string,
        panelId?: number,
        serialNumber?: number
    ): Promise<ConnectionResult> {
        this.deviceIp = deviceIp;
        this.panelId = panelId ?? 0;
        this.serialNumber = serialNumber ?? 0;

        // Try REST API first
        const reachable = await this.isReachable(deviceIp);
        if (reachable) {
            this.mode = "rest";
            return { mode: "rest", deviceIp };
        }

        // Fall back to BACnet through T3000
        if (this.panelId && this.serialNumber) {
            this.mode = "bacnet";
            return { mode: "bacnet", panelId: this.panelId, serialNumber: this.serialNumber };
        }

        return { mode: "bacnet", error: "Device unreachable via REST and no BACnet credentials provided" };
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
            const response = await fetch(
                `http://${deviceIp}:${REST_PORT}${REST_BASE}/screens`,
                { method: "HEAD", signal: controller.signal }
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
        if (this.mode === "rest") {
            const response = await fetch(
                restUrl("device/info", this.deviceIp),
                { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
            );
            if (!response.ok) {
                throw new Error(`Device returned ${response.status}`);
            }
            return response.json();
        }
        // BACnet fallback: load all screens and derive summary
        const all = await this.bacnetLoadAll();
        return {
            panel_name: all.meta?.panel_name ?? "Unknown",
            serial_number: all.meta?.serial_number ?? 0,
            screen_size: { width: 480, height: 320 },
            screen_count: all.screens.length,
            screens: all.screens.map(s => s.name),
            image_count: 0,
            font_count: 0,
            firmware_version: all.meta?.firmware_version ?? "0.0.0",
            lvgl_version: "9.5.0",
            dark_theme: true,
            color_format: "RGB",
        };
    }

    // ── Full Sync: Load All ───────────────────────────────────────

    /**
     * Load ALL screens from the device.
     * REST path: GET /api/v1/screens
     * BACnet path: POST /api/eez-device/screens/pull/:id (T3000)
     */
    async loadAllScreens(): Promise<LoadAllResponse> {
        if (this.mode === "rest") {
            return this.restLoadAll();
        }
        return this.bacnetLoadAll();
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

    private async bacnetLoadAll(): Promise<LoadAllResponse> {
        const response = await fetch(
            `/api/eez-device/screens/pull/${this.panelId}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serial_number: this.serialNumber }),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            }
        );
        if (!response.ok) {
            throw new Error(`T3000 returned ${response.status}`);
        }
        return response.json();
    }

    // ── Full Sync: Deploy All ─────────────────────────────────────

    /**
     * Deploy ALL screens AND their images to the device.
     *
     * Step 1 — Generate image JSON at the front side: extract the PNG payload
     *          from each project bitmap (data URL) into the device image format
     *          {name,width,height,color_format,png_base64,data_base64,image}.
     * Step 2 — Push images FIRST (the device must have them before any screen
     *          references them by name).
     *          BACnet:  POST /api/eez-device/images/push/:panelId
     *          REST:    PUT /api/v1/images/:name
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

        const result =
            this.mode === "rest"
                ? await this.restDeployAll(screens)
                : await this.bacnetDeployAll(screens);

        return { ...result, imagesDeployed, imagesFailed };
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
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            }
        );
        if (!response.ok) {
            throw new Error(`Device returned ${response.status}`);
        }
        return response.json();
    }

    private async bacnetDeployAll(
        screens: { name: string; json: DeviceScreen }[]
    ): Promise<DeployAllResponse> {
        const response = await fetch(
            `/api/eez-device/screens/push/${this.panelId}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serial_number: this.serialNumber,
                    screens,
                }),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            }
        );
        if (!response.ok) {
            throw new Error(`T3000 returned ${response.status}`);
        }
        return response.json();
    }

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
     * BACnet/mock: POST /api/eez-device/images/push/:panelId  body {name,data_base64}
     * REST (real): PUT /api/v1/images/:name                    body = PNG binary
     */
    async pushImages(images: DeviceImageJson[]): Promise<{ deployed: number; failed: number }> {
        let deployed = 0;
        let failed = 0;
        for (const img of images) {
            try {
                if (this.mode === "rest") {
                    await this.restPushImage(img);
                } else {
                    await this.bacnetPushImage(img);
                }
                deployed++;
            } catch {
                failed++;
            }
        }
        return { deployed, failed };
    }

    private async restPushImage(img: DeviceImageJson): Promise<void> {
        const response = await fetch(
            restUrl(`images/${encodeURIComponent(img.name)}`, this.deviceIp),
            {
                method: "PUT",
                headers: { "Content-Type": "image/png" },
                body: base64ToBytes(img.data_base64),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            }
        );
        if (!response.ok) {
            throw new Error(`Device returned ${response.status}`);
        }
    }

    private async bacnetPushImage(img: DeviceImageJson): Promise<void> {
        const response = await fetch(
            `/api/eez-device/images/push/${this.panelId}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: img.name, data_base64: img.data_base64 }),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            }
        );
        if (!response.ok) {
            throw new Error(`T3000 returned ${response.status}`);
        }
    }

    // ── Single Screen ─────────────────────────────────────────────

    /** Load a single screen by name. */
    async loadScreen(name: string): Promise<FirmwareScreen> {
        if (this.mode !== "rest") {
            // Load all via BACnet, then filter
            const all = await this.bacnetLoadAll();
            const screen = all.screens.find((s) => s.name === name);
            if (!screen) throw new Error(`Screen "${name}" not found on device`);
            return screen;
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
        if (this.mode !== "rest") {
            return this.bacnetDeployAll([{ name, json }]).then((r) => ({
                name,
                status: r.failed === 0 ? "ok" : "error",
                error: r.errors?.[0]?.message,
            }));
        }

        const response = await fetch(
            restUrl(`screens/${encodeURIComponent(name)}`, this.deviceIp),
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ json }),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
     * REST: PATCH /api/v1/screens/:name
     * BACnet: not supported (falls back to full deploy of affected screen)
     */
    async patchScreen(name: string, changes: DeltaChange[]): Promise<PatchResponse> {
        if (this.mode !== "rest") {
            // BACnet doesn't support delta — caller should use deployScreen instead
            throw new Error("Delta updates require REST API. Use deployScreen() for BACnet.");
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
            throw new Error("Delta updates require REST API.");
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
