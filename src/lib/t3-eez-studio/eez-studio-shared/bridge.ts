/**
 * Bridge API — decouples EEZ Studio from the platform-specific backend.
 *
 * In Electron, the bridge is implemented via IPC. In the browser (T3000Webview),
 * the bridge is implemented via REST calls to a Rust backend (or mock fallback).
 *
 * This module defines the interface and provides getter/setter so the host app
 * can inject its implementation before EEZ Studio boots.
 */

export interface BridgeAPI {
    // File system
    readFile(path: string): Promise<ArrayBuffer>;
    writeFile(path: string, data: Uint8Array): Promise<void>;
    readTextFile(path: string): Promise<string>;
    writeTextFile(path: string, data: string): Promise<void>;
    makeFolder(path: string): Promise<void>;
    fileExists(path: string): Promise<boolean>;
    deleteFile(path: string): Promise<void>;
    listFiles(path: string): Promise<string[]>;
    getFileSize(path: string): Promise<number>;
    isDirectory(path: string): Promise<boolean>;

    // Dialogs
    showOpenDialog(options?: {
        title?: string;
        defaultPath?: string;
        filters?: { name: string; extensions: string[] }[];
        properties?: Array<"openFile" | "openDirectory" | "multiSelections">;
    }): Promise<{ filePaths: string[]; canceled: boolean } | string[]>;

    showSaveDialog(options?: {
        title?: string;
        defaultPath?: string;
        filters?: { name: string; extensions: string[] }[];
    }): Promise<{ filePath?: string; canceled: boolean } | string | undefined>;

    showMessageBox(options?: {
        type?: "none" | "info" | "error" | "question" | "warning";
        title?: string;
        message: string;
        detail?: string;
        buttons?: string[];
        defaultId?: number;
        cancelId?: number;
    }): Promise<{ response: number }>;

    // App info
    getUserDataPath(subPath: string): string;
    getAppVersion(): string;
    isDev(): boolean;

    // Project
    openProject(filePath: string): Promise<any>;
    saveProject(filePath: string, data: any): Promise<void>;
    buildProject(filePath: string, callback?: (progress: any) => void): Promise<void>;

    // Network
    proxyFetch(url: string): Promise<string>;
}

let _bridgeAPI: BridgeAPI | null = null;

export function setBridgeAPI(bridge: BridgeAPI): void {
    _bridgeAPI = bridge;
}

export function getBridgeAPI(): BridgeAPI | null {
    return _bridgeAPI;
}
