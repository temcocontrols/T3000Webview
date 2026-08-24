/**
 * device-binding.ts — persist which hardware device an imported EEZ project is
 * bound to, so "Deploy to Device" knows the direct-REST target without a picker.
 *
 * Binding is created automatically when a project is imported via
 * "Load from Device" (open-projects-v2.tsx) and read on deploy (Toolbar.tsx).
 * Storage is a simple localStorage map keyed by the project file path.
 */

export interface DeviceBinding {
    /** Device IP — direct REST calls go to http://<ip>/api/eez-device. */
    ip: string;
    /** Panel id (used as the :panelId path param on the device). */
    panelId: number;
    /** Device serial number. */
    serialNumber: number;
    /** User-friendly device name. */
    panelName: string;
    /** When the project was imported/bound. */
    importedAt: string;
}

const STORAGE_KEY = "eezDeviceBindings";

function readMap(): Record<string, DeviceBinding> {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
        return {};
    }
}

/** Get the device a project is bound to (keyed by project file path). */
export function getDeviceBinding(projectPath: string): DeviceBinding | undefined {
    return readMap()[projectPath];
}

/** Bind a project (by file path) to a device. */
export function setDeviceBinding(projectPath: string, binding: DeviceBinding): void {
    const map = readMap();
    map[projectPath] = binding;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
        /* storage unavailable — binding just won't persist */
    }
}

/** Remove a project's device binding. */
export function clearDeviceBinding(projectPath: string): void {
    const map = readMap();
    delete map[projectPath];
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
        /* ignore */
    }
}
