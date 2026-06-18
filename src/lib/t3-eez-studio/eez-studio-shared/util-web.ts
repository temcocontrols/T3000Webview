/* eslint-disable */
/**
 * util-web.ts — Browser-compatible replacement for util-electron.ts
 *
 * Same public API as util-electron.ts, but all implementations go through
 * the BridgeAPI (bridge.ts) instead of Electron / Node.js built-ins.
 *
 * Usage:
 *   In all files that previously did:
 *     import { readTextFile, writeTextFile, ... } from "eez-studio-shared/util-electron";
 *   Now do:
 *     import { readTextFile, writeTextFile, ... } from "eez-studio-shared/util-web";
 */

import { getBridgeAPI, isBridgeInitialized } from "./bridge";

////////////////////////////////////////////////////////////////////////////////

// In the browser, we are always the renderer.
export function isRenderer(): boolean {
    return true;
}

// In the browser, process is always available (bundled), but we aren't in Electron.
// We detect dev mode by checking Electron's execPath, NODE_ENV, or CLI mode flag.
export const isDev: boolean =
    (typeof process !== "undefined" &&
        (/[\\/]node_modules[\\/]electron[\\/]/.test(process.execPath) ||
            process.env?.NODE_ENV === "development")) ||
    process.env?.EEZ_STUDIO_CLI_MODE === "1";

////////////////////////////////////////////////////////////////////////////////
// Path helpers
////////////////////////////////////////////////////////////////////////////////

export function getUserDataPath(relativePath: string): string {
    // During module-init time the bridge may not be set up yet,
    // so use a fallback default path. The hosting app will set
    // the bridge before any actual file I/O happens.
    if (isBridgeInitialized()) {
        return getBridgeAPI().getUserDataPath(relativePath);
    }
    return "/eez-user-data/" + relativePath;
}

export function getHomePath(relativePath: string): string {
    return "/eez-home/" + relativePath;
}

export function localPathToFileUrl(localPath: string): string {
    // In browser context, paths are virtual — return as-is or use a blob URL
    return localPath;
}

////////////////////////////////////////////////////////////////////////////////
// File system
////////////////////////////////////////////////////////////////////////////////

export async function readTextFile(filePath: string): Promise<string> {
    return getBridgeAPI().readTextFile(filePath);
}

export async function writeTextFile(
    filePath: string,
    data: string
): Promise<void> {
    return getBridgeAPI().writeTextFile(filePath, data);
}

export async function readBinaryData(
    filePath: string
): Promise<ArrayBuffer> {
    return getBridgeAPI().readFile(filePath);
}

export async function writeBinaryData(
    filePath: string,
    data: ArrayBuffer | string | Uint8Array
): Promise<void> {
    let buffer: ArrayBuffer;
    if (typeof data === "string") {
        buffer = new TextEncoder().encode(data).buffer;
    } else if (data instanceof Uint8Array) {
        buffer = data.buffer.slice(
            data.byteOffset,
            data.byteOffset + data.byteLength
        );
    } else {
        buffer = data;
    }
    return getBridgeAPI().writeFile(filePath, buffer);
}

export async function makeFolder(folderPath: string): Promise<void> {
    return getBridgeAPI().makeFolder(folderPath);
}

export async function fileExists(filePath: string): Promise<boolean> {
    return getBridgeAPI().fileExists(filePath);
}

export async function deleteFile(filePath: string): Promise<void> {
    return getBridgeAPI().deleteFile(filePath);
}

export async function listFiles(dirPath: string): Promise<string[]> {
    return getBridgeAPI().listFiles(dirPath);
}

////////////////////////////////////////////////////////////////////////////////
// Zip extraction (in browser, delegate to bridge or use JSZip inline)
////////////////////////////////////////////////////////////////////////////////

export async function zipExtract(
    zipFilePath: string,
    destFolderPath: string
): Promise<void> {
    // In browser, we fetch the zip and extract with JSZip
    const data = await getBridgeAPI().readFile(zipFilePath);
    const JSZip = require("jszip");
    const zip = await JSZip.loadAsync(data);

    const promises: Promise<void>[] = [];
    zip.forEach((relativePath: string, file: any) => {
        if (!file.dir) {
            const fullPath = destFolderPath + "/" + relativePath;
            promises.push(
                file.async("arraybuffer").then((buf: ArrayBuffer) =>
                    getBridgeAPI().writeFile(fullPath, buf)
                )
            );
        } else {
            promises.push(
                getBridgeAPI().makeFolder(
                    destFolderPath + "/" + relativePath
                )
            );
        }
    });
    await Promise.all(promises);
}

////////////////////////////////////////////////////////////////////////////////
// Empty file creation
////////////////////////////////////////////////////////////////////////////////

export async function createEmptyFile(filePath: string): Promise<void> {
    await getBridgeAPI().writeFile(filePath, new ArrayBuffer(0));
}

////////////////////////////////////////////////////////////////////////////////
// Source root directory (project source location)
////////////////////////////////////////////////////////////////////////////////

export function sourceRootDir(): string {
    // In the browser, the "source root" is the virtual file system root
    // managed by the Rust backend.
    return "/eez-projects";
}

////////////////////////////////////////////////////////////////////////////////
// Additional file operations used by extensions
////////////////////////////////////////////////////////////////////////////////

export async function copyFile(
    sourcePath: string,
    destPath: string
): Promise<void> {
    const data = await getBridgeAPI().readFile(sourcePath);
    await getBridgeAPI().writeFile(destPath, data);
}

export async function readJsObjectFromFile(
    filePath: string
): Promise<any> {
    const text = await getBridgeAPI().readTextFile(filePath);
    if (!text || text.trim().length === 0) return {};
    try {
        return JSON.parse(text);
    } catch (err) {
        console.error("Failed to parse JSON from file:", filePath, err);
        return {};
    }
}

export async function removeFolder(folderPath: string): Promise<void> {
    // Recursive delete — list files and delete each
    try {
        const files = await getBridgeAPI().listFiles(folderPath);
        for (const file of files) {
            await getBridgeAPI().deleteFile(folderPath + "/" + file);
        }
    } catch (_) {
        // Folder might not exist
    }
    try {
        await getBridgeAPI().deleteFile(folderPath);
    } catch (_) {
        // Folder might not exist
    }
}

export async function renameFile(
    oldPath: string,
    newPath: string
): Promise<void> {
    const data = await getBridgeAPI().readFile(oldPath);
    await getBridgeAPI().writeFile(newPath, data);
    await getBridgeAPI().deleteFile(oldPath);
}

export async function readFolder(
    folderPath: string
): Promise<string[]> {
    return getBridgeAPI().listFiles(folderPath);
}

////////////////////////////////////////////////////////////////////////////////
// Binary file I/O (aliases for readBinaryData / writeBinaryData)
////////////////////////////////////////////////////////////////////////////////

export async function readBinaryFile(
    filePath: string
): Promise<Uint8Array> {
    const data = await getBridgeAPI().readFile(filePath);
    return new Uint8Array(data);
}

////////////////////////////////////////////////////////////////////////////////
// Directory copy
////////////////////////////////////////////////////////////////////////////////

export async function copyDir(
    srcPath: string,
    destPath: string
): Promise<void> {
    await getBridgeAPI().makeFolder(destPath);
    const files = await getBridgeAPI().listFiles(srcPath);
    for (const file of files) {
        const srcFile = srcPath + "/" + file;
        const destFile = destPath + "/" + file;
        const isDir = await getBridgeAPI().isDirectory(srcFile);
        if (isDir) {
            await copyDir(srcFile, destFile);
        } else {
            const data = await getBridgeAPI().readFile(srcFile);
            await getBridgeAPI().writeFile(destFile, data);
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// Path utilities (browser-safe, no Node.js 'path' dependency)
////////////////////////////////////////////////////////////////////////////////

export function getFileName(filePath: string): string {
    const parts = filePath.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1] || "";
}

export function getFileNameWithoutExtension(filePath: string): string {
    const fileName = getFileName(filePath);
    const i = fileName.lastIndexOf(".");
    if (i === -1) {
        return fileName;
    }
    return fileName.substring(0, i);
}

export function getFolderName(filePath: string): string {
    const lastSep = Math.max(
        filePath.lastIndexOf("/"),
        filePath.lastIndexOf("\\")
    );
    if (lastSep === -1) return ".";
    return filePath.substring(0, lastSep) || "/";
}

export function getFileNameExtension(
    filePath: string
): string | undefined {
    const fileName = getFileName(filePath);
    const i = fileName.lastIndexOf(".");
    if (i === -1) {
        return undefined;
    }
    return fileName.substring(i + 1);
}

export function getValidFileNameFromFileName(fileName: string): string {
    let validFileName = "";

    for (let i = 0; i < fileName.length; i++) {
        const codePoint = fileName.codePointAt(i);
        if (
            !codePoint ||
            codePoint < 32 ||
            codePoint === 127 ||
            codePoint > 255 ||
            '"*+,/:;<=>?\\[]|'.indexOf(fileName[i]) !== -1
        ) {
            validFileName += "_";
        } else {
            validFileName += fileName[i];
        }
    }

    return validFileName;
}

export function getShortFileName(filePath: string): string {
    const fileNameWithoutExtension = getFileNameWithoutExtension(filePath)
        .replace(/[^\w]/g, "")
        .substring(0, 8)
        .toUpperCase();
    const extension = getFileNameExtension(filePath);

    if (extension === undefined) {
        return fileNameWithoutExtension;
    }

    return (
        fileNameWithoutExtension +
        "." +
        extension.substring(0, 3).toUpperCase()
    );
}

export function isValidFileName(
    fileName: string,
    shortFileName: boolean
): boolean {
    if (shortFileName) {
        if (!fileName.match(/^[\w\-.]+$/)) {
            return false;
        }

        const fileNameWithoutExtension = getFileNameWithoutExtension(fileName);
        if (fileNameWithoutExtension.length > 8) {
            return false;
        }

        const extension = getFileNameExtension(fileName);
        if (extension !== undefined && extension.length > 3) {
            return false;
        }

        return true;
    } else {
        return fileName === getValidFileNameFromFileName(fileName);
    }
}

export function isValidPath(
    checkPath: string,
    shortFileName: boolean
): boolean {
    let normalizedPath = checkPath;
    if (
        normalizedPath[0] >= "0" &&
        normalizedPath[0] <= "9" &&
        normalizedPath[1] == ":"
    ) {
        normalizedPath = normalizedPath.slice(2);
    }

    const parts = normalizedPath.replace(/\\/g, "/").split("/");
    if (parts[0] === "") {
        parts.shift();
    }
    return !parts.find(part => !isValidFileName(part, shortFileName));
}

////////////////////////////////////////////////////////////////////////////////
// JSON file helpers
////////////////////////////////////////////////////////////////////////////////

export async function writeJsObjectToFile(
    filePath: string,
    jsObject: any
): Promise<void> {
    return getBridgeAPI().writeTextFile(
        filePath,
        JSON.stringify(jsObject, undefined, 4)
    );
}

////////////////////////////////////////////////////////////////////////////////
// Temporary paths
////////////////////////////////////////////////////////////////////////////////

export async function getTempFilePath(options?: any): Promise<string> {
    const id = Math.random().toString(36).substring(2, 10);
    const ext = options?.ext || options?.extension || "";
    return "/eez-temp/" + id + (ext ? "." + ext : "");
}

export async function getTempDirPath(
    options?: any
): Promise<[string, () => void]> {
    const id = Math.random().toString(36).substring(2, 10);
    const dirPath = "/eez-temp/" + id;
    await getBridgeAPI().makeFolder(dirPath);
    const cleanup = async () => {
        try {
            await removeFolder(dirPath);
        } catch (_) {
            // ignore
        }
    };
    return [dirPath, cleanup];
}

////////////////////////////////////////////////////////////////////////////////
// File size
////////////////////////////////////////////////////////////////////////////////

export async function getFileSizeInBytes(
    filePath: string
): Promise<number> {
    return getBridgeAPI().getFileSize(filePath);
}

////////////////////////////////////////////////////////////////////////////////
// CSV helpers (bridge-based)
////////////////////////////////////////////////////////////////////////////////

interface ICsvColumnDefinition {
    id: string;
    digits: number;
}

export async function readCsvFile(
    filePath: string,
    columnDefinitions: ICsvColumnDefinition[]
): Promise<any> {
    const data = await getBridgeAPI().readTextFile(filePath);

    const result: any = {};
    columnDefinitions.forEach(
        columnDefinition => (result[columnDefinition.id] = [] as number[])
    );

    const rows = data.split("\n");

    for (let row of rows) {
        row = row.trim();
        if (!row) {
            continue;
        }

        const columns = row.split(",");

        if (columns.length !== columnDefinitions.length) {
            return undefined;
        }

        for (let i = 0; i < columns.length; i++) {
            const value = columns[i];
            if (value !== "=") {
                const numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    return undefined;
                }
                result[columnDefinitions[i].id].push(numValue);
            }
        }
    }

    return result;
}

export function makeCsvData(
    data: any,
    columnDefinitions: ICsvColumnDefinition[]
): string {
    const rows: string[] = [];

    let n = data[columnDefinitions[0].id].length;
    for (let i = 1; i < columnDefinitions.length; i++) {
        n = Math.max(n, data[columnDefinitions[i].id].length);
    }

    for (let i = 0; i < n; i++) {
        const row: string[] = [];
        for (let j = 0; j < columnDefinitions.length; j++) {
            const columnDefinition = columnDefinitions[j];
            if (i < data[columnDefinition.id].length) {
                const value = data[columnDefinition.id][i];
                row.push(
                    typeof value === "number"
                        ? value.toFixed(columnDefinition.digits)
                        : String(value)
                );
            } else {
                row.push("=");
            }
        }
        rows.push(row.join(","));
    }

    return rows.join("\n");
}

export async function writeCsvFile(
    filePath: string,
    data: any,
    columnDefinitions: ICsvColumnDefinition[]
): Promise<void> {
    await getBridgeAPI().writeTextFile(
        filePath,
        makeCsvData(data, columnDefinitions)
    );
}

////////////////////////////////////////////////////////////////////////////////
// Remove file (alias for deleteFile)
////////////////////////////////////////////////////////////////////////////////

export async function removeFile(filePath: string): Promise<void> {
    return getBridgeAPI().deleteFile(filePath);
}

////////////////////////////////////////////////////////////////////////////////
// Network / cache helpers
////////////////////////////////////////////////////////////////////////////////

export async function fetchUrlOrReadFromCache(
    url: string,
    resultType: "json" | "buffer"
): Promise<any> {
    const response = await fetch(url, { cache: "reload" });
    if (resultType == "json") {
        return await response.json();
    } else {
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    }
}
