/**
 * LVGL 9 SVG renderer — feature flag.
 *
 * ADDITIVE: new file.
 *
 * Default: **ON for the supported LVGL version** (P6). The version gate lives at the call site
 * (`features/page/page.tsx`), which only reaches this flag when
 * `lvglVersion === SVG_RENDERER_SUPPORTED_VERSION`, so no other version is affected. Rollback is one
 * override away, and both controls are read on every render:
 *
 *   1. URL  `?svg=0` / `&svg=0`   — per-session opt-out
 *   2. localStorage["t3.lvgl.svgRenderer"] = "0"
 *   3. default: ON (9.5 only)
 *
 * Deliberately NOT a project setting: `.eez-project` is shared with the device/firmware
 * tooling, and keeping the choice out of the project file means the same project can be
 * opened with or without the SVG surface (and A/B'd on one machine).
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
    // P6: on by default for the supported version — the caller has already checked the version.
    return readStoredOverride() ?? true;
}

/**
 * Development switch for the fidelity harness (`?svgDiff=1`, or `=all` for every fixture).
 *
 * Kept separate from the renderer flag so the harness can be run on demand without changing which
 * surface is displayed — and so it is never on by accident in a normal session.
 */
export function isSvgDiffEnabled(search?: string): boolean {
    if (typeof window === "undefined") {
        return false;
    }
    const text = search ?? currentQueryText();
    return /[?&]svgDiff=(1|all)(?![0-9])/.test(text);
}

/** Development switch for the paint statistics (`?svgStats=1`): dump ms, patch ms, node count. */
export function isSvgStatsEnabled(search?: string): boolean {
    if (typeof window === "undefined") {
        return false;
    }
    const text = search ?? currentQueryText();
    return /[?&]svgStats=1(?![0-9])/.test(text);
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
