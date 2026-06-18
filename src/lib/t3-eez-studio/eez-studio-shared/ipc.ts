/* eslint-disable */
/**
 * ipc.ts — Browser-compatible replacement for Electron's ipcRenderer
 *
 * This provides the same `on`, `removeListener`, `send` API as Electron's
 * ipcRenderer, but backed by a simple EventEmitter.
 *
 * All files that previously did:
 *   import { ipcRenderer } from "electron";
 * Should now do:
 *   import { ipcRenderer } from "eez-studio-shared/ipc";
 */

type Listener = (...args: any[]) => void;

class IpcRenderer {
    private _listeners = new Map<string, Set<Listener>>();

    on(channel: string, listener: Listener): void {
        let set = this._listeners.get(channel);
        if (!set) {
            set = new Set();
            this._listeners.set(channel, set);
        }
        set.add(listener);
    }

    once(channel: string, listener: Listener): void {
        const wrapper: Listener = (...args: any[]) => {
            this.removeListener(channel, wrapper);
            listener(...args);
        };
        this.on(channel, wrapper);
    }

    removeListener(channel: string, listener: Listener): void {
        const set = this._listeners.get(channel);
        if (set) {
            set.delete(listener);
        }
    }

    removeAllListeners(channel?: string): void {
        if (channel) {
            this._listeners.delete(channel);
        } else {
            this._listeners.clear();
        }
    }

    send(channel: string, ...args: any[]): void {
        // For known setting channels, persist to localStorage
        if (channel === "setIsDarkTheme") {
            localStorage.setItem("eez-is-dark-theme", String(args[0]));
        } else if (channel === "setMRU") {
            localStorage.setItem("eez-mru", JSON.stringify(args[0]));
        } else if (channel === "setShowComponentsPaletteInProjectEditor") {
            localStorage.setItem("eez-show-components-palette", String(args[0]));
        }

        const set = this._listeners.get(channel);
        if (set) {
            for (const listener of set) {
                try {
                    listener({} as any, ...args);
                } catch (err) {
                    console.error(`IPC error on channel "${channel}":`, err);
                }
            }
        }
    }

    sendSync(channel: string): any {
        // Synchronous getters backed by localStorage
        switch (channel) {
            case "getIsDarkTheme":
                return localStorage.getItem("eez-is-dark-theme") === "true";
            case "getMRU":
                try {
                    return JSON.parse(localStorage.getItem("eez-mru") || "[]");
                } catch {
                    return [];
                }
            case "getShowComponentsPaletteInProjectEditor":
                return localStorage.getItem("eez-show-components-palette") !== "false";
            default:
                return undefined;
        }
    }

    invoke(_channel: string, ..._args: any[]): Promise<any> {
        // Not supported in browser; use bridge API instead
        return Promise.reject(
            new Error("ipcRenderer.invoke is not available in browser mode")
        );
    }
}

export const ipcRenderer = new IpcRenderer();
