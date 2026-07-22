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

const REST_BASE = "/api/v1";
const REST_PORT = 8000; // ESP32 device REST API port
const REACHABILITY_TIMEOUT_MS = 2000; // short timeout for probing
const REQUEST_TIMEOUT_MS = 30000; // normal request timeout

// ═══════════════════════════════════════════════════════════════════
// DeviceRestClient
// ═══════════════════════════════════════════════════════════════════

export class DeviceRestClient {
    private mode: ConnectionMode = "rest";
    private deviceIp: string = "";
    private panelId: number = 0;
    private serialNumber: number = 0;

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

    // ── Full Sync: Load All ───────────────────────────────────────

    /**
     * Load ALL screens from the device.
     * REST path: GET /api/v1/screens
     * BACnet path: POST /api/eez/screens/pull/:id (T3000)
     */
    async loadAllScreens(): Promise<LoadAllResponse> {
        if (this.mode === "rest") {
            return this.restLoadAll();
        }
        return this.bacnetLoadAll();
    }

    private async restLoadAll(): Promise<LoadAllResponse> {
        const response = await fetch(
            `http://${this.deviceIp}:${REST_PORT}${REST_BASE}/screens`,
            { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
        );
        if (!response.ok) {
            throw new Error(`Device returned ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }

    private async bacnetLoadAll(): Promise<LoadAllResponse> {
        const response = await fetch(
            `/api/eez/screens/pull/${this.panelId}`,
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
     * Deploy ALL screens to the device.
     * REST path: PUT /api/v1/screens
     * BACnet path: POST /api/eez/screens/push/:id (T3000 mock)
     *
     * @param projectJson  The raw .eez-project JSON (parsed object)
     */
    async deployAllScreens(projectJson: Record<string, unknown>): Promise<DeployAllResponse> {
        const deviceScreens = transformToDeviceJson(projectJson as any);
        const screens = Object.entries(deviceScreens).map(([name, screen]) => ({
            name,
            json: screen,
        }));

        if (this.mode === "rest") {
            return this.restDeployAll(screens);
        }
        return this.bacnetDeployAll(screens);
    }

    private async restDeployAll(
        screens: { name: string; json: DeviceScreen }[]
    ): Promise<DeployAllResponse> {
        const response = await fetch(
            `http://${this.deviceIp}:${REST_PORT}${REST_BASE}/screens`,
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
            `/api/eez/screens/push/${this.panelId}`,
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
            `http://${this.deviceIp}:${REST_PORT}${REST_BASE}/screens/${encodeURIComponent(name)}`,
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
            `http://${this.deviceIp}:${REST_PORT}${REST_BASE}/screens/${encodeURIComponent(name)}`,
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
            `http://${this.deviceIp}:${REST_PORT}${REST_BASE}/screens/${encodeURIComponent(name)}`,
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
            `http://${this.deviceIp}:${REST_PORT}${REST_BASE}/screens/${encodeURIComponent(screenName)}/widgets/${encodeURIComponent(widgetId)}`,
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
