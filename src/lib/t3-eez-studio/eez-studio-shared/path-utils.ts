/* eslint-disable */
/**
 * path-utils.ts — Browser-safe path manipulation (replaces Node.js 'path')
 *
 * Provides the subset of path operations used by EEZ Studio's build system.
 */

export function basename(filePath: string, ext?: string): string {
    let name = filePath.replace(/^.*[\\/]/, "");
    if (ext && name.endsWith(ext)) {
        name = name.slice(0, -ext.length);
    }
    return name;
}

export function dirname(filePath: string): string {
    const lastSep = Math.max(
        filePath.lastIndexOf("/"),
        filePath.lastIndexOf("\\")
    );
    if (lastSep === -1) return ".";
    return filePath.substring(0, lastSep) || "/";
}

export function extname(filePath: string): string {
    const base = basename(filePath);
    const dotIndex = base.lastIndexOf(".");
    if (dotIndex <= 0) return "";
    return base.substring(dotIndex);
}

export function join(...segments: string[]): string {
    let result = "";
    for (const seg of segments) {
        if (!seg) continue;
        if (!result || result.endsWith("/")) {
            result += seg.replace(/^[\\/]+/, "");
        } else {
            result += "/" + seg.replace(/^[\\/]+/, "");
        }
    }
    return result;
}

export function relative(from: string, to: string): string {
    // Simple implementation — assumes both paths share a common root
    const fromParts = from.replace(/\\/g, "/").replace(/\/+$/, "").split("/");
    const toParts = to.replace(/\\/g, "/").replace(/\/+$/, "").split("/");

    let i = 0;
    while (
        i < fromParts.length &&
        i < toParts.length &&
        fromParts[i] === toParts[i]
    ) {
        i++;
    }

    const upCount = fromParts.length - i;
    const ups = Array(upCount).fill("..");
    const downs = toParts.slice(i);

    return [...ups, ...downs].join("/");
}

export function resolve(...segments: string[]): string {
    return join(...segments);
}

export const sep = "/";
