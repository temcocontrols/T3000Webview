/**
 * LVGL 9 SVG renderer — stale-runtime recovery (P3 hardening).
 *
 * ADDITIVE: new file. No existing loader is modified.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Emscripten glue JavaScript is always fetched fresh (`fetch(jsUrl, { cache: "no-store" })` in
 * `lvgl-versions.ts`, then imported from a blob URL), but the **`.wasm` binary is fetched by the
 * glue from a plain URL** and therefore goes through the normal HTTP cache.
 *
 * That URL is served without `Cache-Control` and without `ETag` — only `Last-Modified`:
 *
 *     Content-Type: application/wasm
 *     Last-Modified: <deploy time>
 *
 * With no explicit freshness and an available `Last-Modified`, RFC 9111 §4.2.2 lets a browser store
 * the response and treat it as fresh for a heuristic fraction of its age, and it will not
 * revalidate. For an artifact that is weeks old that window is days-to-weeks, so a browser can keep
 * running an **old `.wasm` next to a fresh glue** indefinitely. If that old binary predates
 * `lvglDumpScene`, the SVG surface mounts and then silently draws nothing: `_lvglDumpScene` is
 * missing, so `SceneDump.isAvailable()` is false forever. This was observed as a completely empty
 * `<g id="content">` in Firefox while the same URL rendered in a browser whose cache had been
 * refreshed.
 *
 * THE FIX
 * -------
 * `fetch(url, { cache: "reload" })` — bypass the cache for this request and **replace the stored
 * entry with what the network returned**. After that a plain reload (no Ctrl+Shift+R needed) picks
 * up the current artifact.
 *
 * We deliberately do NOT auto-reload the page: the editor can hold unsaved in-memory project edits,
 * so reloading is the user's decision. We refresh the cache and say so, visibly.
 */

/** Where the LVGL runtime artifacts are served from (`lvgl-versions.ts` builds the same URL). */
const ARTIFACT_BASE = "/eez-studio-wasm/wasm/lvgl";

/** sessionStorage latch so a recovery attempt happens at most once per tab per version. */
const REFRESH_LATCH_PREFIX = "t3.lvgl.svgRuntimeRefreshed.";

export interface LvglRuntimeArtifactUrls {
    js: string;
    wasm: string;
}

/** The two artifact URLs for a version, e.g. 9.5.0 → `/eez-studio-wasm/wasm/lvgl/9.5.0/...`. */
export function lvglRuntimeArtifactUrls(version: string): LvglRuntimeArtifactUrls {
    const file = `${ARTIFACT_BASE}/${version}/lvgl_runtime_v${version}`;
    return { js: `${file}.js`, wasm: `${file}.wasm` };
}

export type RefreshOutcome =
    /** Cache entries were replaced with current bytes; a normal reload is enough now. */
    | "refreshed"
    /** A previous attempt this session already refreshed them (do not repeat, do not nag). */
    | "already-refreshed"
    /** The refresh could not be performed (offline, blocked, no fetch). */
    | "failed";

/**
 * Re-fetch the runtime artifacts with the cache bypassed, so the HTTP cache entry for them is
 * replaced with the current build.
 *
 * Latched per session because the failure loops: every frame reports the same stale runtime, and we
 * do not want a 2.2 MB request per frame.
 */
export async function refreshLvglRuntimeArtifacts(
    version: string
): Promise<RefreshOutcome> {
    if (typeof fetch !== "function") {
        return "failed";
    }

    const latchKey = REFRESH_LATCH_PREFIX + version;
    try {
        if (sessionStorage.getItem(latchKey) === "1") {
            return "already-refreshed";
        }
        // Latch first: a concurrent caller must not start a second refresh.
        sessionStorage.setItem(latchKey, "1");
    } catch {
        // Private mode / storage disabled: fall through and just try the refresh.
    }

    const { js, wasm } = lvglRuntimeArtifactUrls(version);
    let ok = false;
    for (const url of [wasm, js]) {
        try {
            const response = await fetch(url, { cache: "reload" });
            if (response.ok) {
                ok = true;
            }
            // The body is not needed — the point is the cache entry. Drain it so the connection is
            // released promptly rather than staying in flight during editor work.
            try {
                await response.arrayBuffer();
            } catch {
                // ignore
            }
        } catch {
            // Try the next artifact.
        }
    }
    return ok ? "refreshed" : "failed";
}

/** Test seam: forget the once-per-session latch. */
export function resetRuntimeRefreshLatch(version: string): void {
    try {
        sessionStorage.removeItem(REFRESH_LATCH_PREFIX + version);
        sessionStorage.removeItem(VERIFIED_LATCH_PREFIX + version);
    } catch {
        // ignore
    }
}

// ---------------------------------------------------------------------------------------
// pre-flight artifact inspection
// ---------------------------------------------------------------------------------------

/**
 * The wasm export the SVG surface depends on.
 *
 * A wasm module's export names are stored as plain ASCII in its binary, so their presence can be
 * checked directly on the downloaded bytes — no toolchain, no parsing.
 */
const REQUIRED_EXPORT = "lvglDumpScene";

/** Positive latches only: a verified-good tab skips re-downloading the artifacts on later mounts. */
const VERIFIED_LATCH_PREFIX = "t3.lvgl.svgRuntimeVerified.";

export type RuntimeArtifactStatus =
    /** The bytes the runtime will load contain the scene dump. */
    | "ok"
    /** Verified earlier this session, so nothing was downloaded. */
    | "already-verified"
    /** The server itself is serving an `.wasm` without the dump export. */
    | "stale-server"
    /** The server has a good build, but the browser cache still hands out an older `.wasm`. */
    | "stale-cache"
    /** Could not verify (offline, blocked, no fetch). Callers should proceed as before. */
    | "unavailable";

/** True when the wasm binary exports `name` (export names are stored as ASCII in the binary). */
export function hasWasmExportName(bytes: Uint8Array, name: string): boolean {
    return new TextDecoder("latin1").decode(bytes).indexOf(name) !== -1;
}

async function fetchBytes(
    url: string,
    cache?: RequestCache
): Promise<Uint8Array | undefined> {
    try {
        const response = await fetch(url, cache ? { cache } : undefined);
        if (!response.ok) {
            return undefined;
        }
        return new Uint8Array(await response.arrayBuffer());
    } catch {
        return undefined;
    }
}

/**
 * Answer one question before the runtime boots: **will the binary it loads actually have the scene
 * dump?**
 *
 * This exists because the failure it prevents is fatal and *unreportable* from inside the app. When
 * the glue JavaScript is current but the `.wasm` is an older cached copy, Emscripten's own
 * `assignWasmExports` asserts and aborts the module:
 *
 *     Aborted(Assertion failed: missing Wasm export: lvglDumpScene)
 *
 * `mount()` returns nothing, so that abort arrives as an uncaught promise rejection in the glue's
 * loader — it cannot be caught, and it takes the whole design surface down before any of our
 * diagnostics can run. Inspecting the bytes first lets us explain it instead.
 *
 * The order matters:
 *
 * 1. `cache: "reload"` — forces a network fetch *and* replaces the stored entry with current bytes.
 * 2. a plain `fetch` — reads back what the runtime's own loader will actually get.
 *
 * Only if both contain the export do we call it good. If (1) is good but (2) is not, the cache is
 * refusing to update, which needs a hard reload rather than a rebuild.
 */
export async function inspectLvglRuntimeArtifacts(
    version: string
): Promise<RuntimeArtifactStatus> {
    if (typeof fetch !== "function") {
        return "unavailable";
    }

    const verifiedKey = VERIFIED_LATCH_PREFIX + version;
    try {
        if (sessionStorage.getItem(verifiedKey) === "1") {
            return "already-verified";
        }
    } catch {
        // Private mode / storage disabled: verify every time.
    }

    const { wasm } = lvglRuntimeArtifactUrls(version);

    // (1) What the server actually has now — and this refreshes the cache entry as a side effect.
    const fromNetwork = await fetchBytes(wasm, "reload");
    if (!fromNetwork) {
        return "unavailable";
    }
    if (!hasWasmExportName(fromNetwork, REQUIRED_EXPORT)) {
        return "stale-server";
    }

    // (2) What the runtime's loader will receive, cache included.
    const asLoaded = await fetchBytes(wasm);
    if (asLoaded && !hasWasmExportName(asLoaded, REQUIRED_EXPORT)) {
        return "stale-cache";
    }

    try {
        sessionStorage.setItem(verifiedKey, "1");
    } catch {
        // ignore
    }
    return "ok";
}
