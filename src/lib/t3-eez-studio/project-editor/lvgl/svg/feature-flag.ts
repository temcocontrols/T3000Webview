/**
 * LVGL 9 SVG renderer — feature flag.
 *
 * ADDITIVE: new file. Defaults to OFF, so with no override the editor behaves exactly as it
 * does today (the canvas path).
 *
 * Deliberately NOT a project setting: `.eez-project` is shared with the device/firmware
 * tooling, and keeping the choice out of the project file means the same project can be
 * opened with or without the SVG surface (and A/B'd on one machine).
 *
 * Precedence (first match wins):
 *   1. URL  ?svg=1 / ?svg=0     — per-session override, read from location.search.
 *      Under HashRouter the query lives in location.search, not location.hash
 *      (see EezStudioApp.tsx, which parses create params the same way).
 *   2. localStorage["t3.lvgl.svgRenderer"] = "1" | "0"
 *   3. default: OFF
 *
 * Only LVGL 9.5 is supported by the SVG surface; other versions always stay on canvas.
 */

export const SVG_RENDERER_STORAGE_KEY = "t3.lvgl.svgRenderer";

/** The only LVGL version the SVG surface currently targets. */
export const SVG_RENDERER_SUPPORTED_VERSION = "9.5.0";

/**
 * Read an explicit `svg=1` / `svg=0` from a query-ish string.
 *
 * Tolerant about the separator on purpose: this app is a HashRouter, so the EEZ route is
 * `#/t3000/eez?svg=1` (query in the hash, `window.location.search` empty) and people also hand-type
 * `#/t3000/eez&svg=1`. Both are accepted; `svg=10` is not a match.
 */
export function parseSvgOverride(text: string): boolean | undefined {
    const match = /[?&]svg=([01])(?![0-9])/.exec(text);
    if (!match) {
        return undefined;
    }
    return match[1] === "1";
}

/**
 * The text to scan for the override: the real query string, plus the hash.
 *
 * The hash matters: React Router keeps route queries inside it (`#/t3000/eez?svg=1`), where
 * `window.location.search` is empty. Reading only `search` silently ignores the flag for every URL
 * written the way this app writes its own links.
 */
function currentQueryText(): string {
    if (typeof window === "undefined") {
        return "";
    }
    const search = window.location?.search ?? "";
    if (parseSvgOverride(search) !== undefined) {
        return search;
    }
    return search + (window.location?.hash ?? "");
}

function readStoredOverride(): boolean | undefined {
    try {
        const value = window.localStorage.getItem(SVG_RENDERER_STORAGE_KEY);
        if (value === "1") {
            return true;
        }
        if (value === "0") {
            return false;
        }
    } catch {
        // Private mode / storage disabled — fall through to the default.
    }
    return undefined;
}

/**
 * Is the SVG surface enabled for this session?
 *
 * `search` is injectable so tests (and the EEZ shell, which may hold the query elsewhere)
 * can supply it explicitly.
 */
export function isSvgRendererEnabled(search?: string): boolean {
    if (typeof window === "undefined") {
        return false;
    }
    const fromUrl = parseSvgOverride(search ?? currentQueryText());
    if (fromUrl !== undefined) {
        return fromUrl;
    }
    return readStoredOverride() ?? false;
}

/** Persist an explicit choice (dev/testing convenience; the URL override still wins). */
export function setSvgRendererEnabled(enabled: boolean | undefined): void {
    try {
        if (enabled === undefined) {
            window.localStorage.removeItem(SVG_RENDERER_STORAGE_KEY);
        } else {
            window.localStorage.setItem(
                SVG_RENDERER_STORAGE_KEY,
                enabled ? "1" : "0"
            );
        }
    } catch {
        // Storage unavailable — the URL override remains the only control.
    }
}
