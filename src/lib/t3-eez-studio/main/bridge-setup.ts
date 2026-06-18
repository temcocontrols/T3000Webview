/**
 * Electron main-process implementation of BridgeAPI.
 * Provides native Electron/Node.js backing when running as an Electron app.
 */
import fs from "fs";
import path from "path";
import { dialog, BrowserWindow } from "electron";
import { setBridgeAPI, BridgeAPI } from "eez-studio-shared/bridge";

function getUserDataPath(subPath: string): string {
    const { app } = require("electron");
    return path.join(app.getPath("userData"), subPath);
}

function getAppVersion(): string {
    const { app } = require("electron");
    return app.getVersion();
}

function isDev(): boolean {
    return (
        /[\\/]node_modules[\\/]electron[\\/]/.test(process.execPath) ||
        process.env.EEZ_STUDIO_CLI_MODE === "1"
    );
}

function getMainWindow(): BrowserWindow | null {
    const windows = BrowserWindow.getAllWindows();
    return windows.length > 0 ? windows[0] : null;
}

const electronBridge: BridgeAPI = {
    async readFile(filePath: string): Promise<ArrayBuffer> {
        const buffer = await fs.promises.readFile(filePath);
        return buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
        ) as ArrayBuffer;
    },

    async writeFile(filePath: string, data: ArrayBuffer): Promise<void> {
        const dir = path.dirname(filePath);
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(filePath, Buffer.from(data));
    },

    async readTextFile(filePath: string): Promise<string> {
        return fs.promises.readFile(filePath, "utf-8");
    },

    async writeTextFile(filePath: string, data: string): Promise<void> {
        const dir = path.dirname(filePath);
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(filePath, data, "utf-8");
    },

    async makeFolder(folderPath: string): Promise<void> {
        await fs.promises.mkdir(folderPath, { recursive: true });
    },

    async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    },

    async deleteFile(filePath: string): Promise<void> {
        try {
            const stat = await fs.promises.lstat(filePath);
            if (stat.isDirectory()) {
                await fs.promises.rm(filePath, { recursive: true });
            } else {
                await fs.promises.unlink(filePath);
            }
        } catch {
            // file doesn't exist, ignore
        }
    },

    async listFiles(dirPath: string): Promise<string[]> {
        return fs.promises.readdir(dirPath);
    },

    async getFileSize(filePath: string): Promise<number> {
        const stat = await fs.promises.stat(filePath);
        return stat.size;
    },

    async isDirectory(dirPath: string): Promise<boolean> {
        try {
            const stat = await fs.promises.stat(dirPath);
            return stat.isDirectory();
        } catch {
            return false;
        }
    },

    async showOpenDialog(options): Promise<string[]> {
        const win = getMainWindow()!;
        const result = await dialog.showOpenDialog(win, options as any);
        return result.filePaths;
    },

    async showSaveDialog(options): Promise<string | undefined> {
        const win = getMainWindow()!;
        const result = await dialog.showSaveDialog(win, options as any);
        return result.filePath;
    },

    async showMessageBox(options): Promise<{ response: number }> {
        const win = getMainWindow()!;
        const result = await dialog.showMessageBox(win, options as any);
        return { response: result.response };
    },

    getUserDataPath,
    getAppVersion,
    isDev,

    async openProject(filePath: string): Promise<any> {
        const text = await fs.promises.readFile(filePath, "utf-8");
        return JSON.parse(text);
    },

    async saveProject(filePath: string, data: any): Promise<void> {
        const dir = path.dirname(filePath);
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(
            filePath,
            JSON.stringify(data, null, 2),
            "utf-8"
        );
    },

    async buildProject(
        filePath: string,
        onMessage: (message: string) => void
    ): Promise<void> {
        const { spawn } = require("child_process");
        return new Promise((resolve, reject) => {
            const proc = spawn(
                process.execPath,
                [path.join(__dirname, "..", ".."), "--build-project", filePath],
                { cwd: path.dirname(filePath) }
            );
            proc.stdout.on("data", (data: Buffer) => {
                onMessage(data.toString());
            });
            proc.stderr.on("data", (data: Buffer) => {
                onMessage(data.toString());
            });
            proc.on("close", (code: number) => {
                if (code === 0) resolve();
                else reject(new Error(`Build exited with code ${code}`));
            });
            proc.on("error", reject);
        });
    }
};

export function initElectronBridge(): void {
    setBridgeAPI(electronBridge);
}
