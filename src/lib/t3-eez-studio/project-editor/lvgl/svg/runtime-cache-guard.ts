/**
 * LVGL 9 SVG renderer — runtime artifact cache guard.
 *
 * ADDITIVE: new file. Nothing existing is modified.
 *
 * WHY THIS IS NEEDED
 * ------------------
 * The LVGL WebAssembly artifacts are served with **no `Cache-Control` and no `ETag`** — only
 * `Last-Modified`:
 *
 *     Content-Type: application/wasm
 *     Last-Modified: <deploy time>
 *
 * With no explicit freshness and a `Last-Modified` present, RFC 9111 §4.2.2 lets a browser treat the
 * response as fresh for a heuristic fraction of its age and skip revalidation. The Emscripten glue
 * JavaScript is always fetched fresh (`cache: "no-store"`, then imported from a blob URL), so a
 * browser can end up running a **fresh glue against an old binary**.
 *
 * That combination is fatal and loud:
 *
 *     Aborted(Assertion failed: missing Wasm export: lvglDumpScene)
 *       assignWasmExports -> receiveInstance -> createWasm -> runWasmModule
 *
 * and it hits **every** LVGL surface — the canvas page (`lvgl/Page.tsx`) as well as the SVG page —
 * because both boot the same runtime. It also cannot be caught: `mount()` returns `undefined`, so the
 * abort arrives as an uncaught promise rejection inside the glue's loader.
 *
 * WHAT THIS DOES
 * --------------
 * Rewrites requests for `/wasm/lvgl/<version>/lvgl_runtime_v<version>.{js,wasm}` to carry a
 * **per-tab stamp** query parameter. A fresh cache key cannot hold an old entry, so the runtime
 * always receives the bytes the server has right now — for the canvas path too, without editing it.
 *
 * The server ignores the unknown query parameter, so the response is the same file.
 *
 * Cost: within one tab the artifact is fetched once under the stamped key and reused after that
 * (the stamp is stable for the tab). A new tab or a reload in a new session picks a new stamp, which
 * is what makes a stale cache impossible to inherit. That is deliberately the only behaviour change,
 * and it is a cache-key change, not a content change.
 *
 * This is a workaround for a server-side omission: adding `Cache-Control: no-cache` (or an `ETag`)
 * to those responses would make this guard unnecessary.
 */

/** sessionStorage key holding the stamp; one value per tab. */
const STAMP_KEY = "t3.lvgl.runtimeStamp";

/** Marker so the guard cannot be installed twice (e.g. two module instances in dev). */
const INSTALLED_KEY = "__lvglRuntimeCacheGuardInstalled";

/** Query parameter appended to artifact URLs. */
const STAMP_PARAM = "lvglrt";

/** Matches `/wasm/lvgl/<version>/lvgl_runtime_v<version>.{js,wasm}` (also with a base path). */
const ARTIFACT_PATTERN =
    /\/wasm\/lvgl\/[\w.-]+\/lvgl_runtime_v[\w.-]+\.(?:js|wasm)(?=$|[?#])/;

function readStamp(): string {
    try {
        const existing = sessionStorage.getItem(STAMP_KEY);
        if (existing) {
            return existing;
        }
        const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem(STAMP_KEY, stamp);
        return stamp;
    } catch {
        // Private mode / storage disabled: fall back to a per-load stamp, which is still fresh.
        return Date.now().toString(36);
    }
}

/**
 * Add the stamp to an LVGL runtime artifact URL. Returns `undefined` for anything else, so the
 * guard only ever touches requests it is responsible for.
 */
export function stampArtifactUrl(url: string, stamp: string): string | undefined {
    if (!ARTIFACT_PATTERN.test(url) || url.indexOf(`${STAMP_PARAM}=`) !== -1) {
        return undefined;
    }
    const separator = url.indexOf("?") === -1 ? "?" : "&";
    return `${url}${separator}${STAMP_PARAM}=${stamp}`;
}

/**
 * Install the guard. Idempotent, and a no-op where the globals do not exist (SSR, tests).
 *
 * Call this as early as possible — before any LVGL runtime mounts.
 */
export function installLvglRuntimeCacheGuard(): void {
    const globalObject = globalThis as unknown as Record<string, unknown> & {
        fetch?: typeof fetch;
        XMLHttpRequest?: typeof XMLHttpRequest;
    };

    if (globalObject[INSTALLED_KEY]) {
        return;
    }
    globalObject[INSTALLED_KEY] = true;

    const stamp = readStamp();

    // --- fetch -------------------------------------------------------------------------------
    const originalFetch = globalObject.fetch;
    if (typeof originalFetch === "function") {
        const patchedFetch = function (
            input: RequestInfo | URL,
            init?: RequestInit
        ): Promise<Response> {
            const url =
                typeof input === "string"
                    ? input
                    : input instanceof URL
                      ? input.href
                      : (input as Request).url;
            const stamped = stampArtifactUrl(url, stamp);
            if (stamped) {
                // A Request carries its own URL, so rebuild it; a string/URL just needs the init.
                const nextInput =
                    typeof input === "string" || input instanceof URL
                        ? stamped
                        : new Request(stamped, input as Request);
                return originalFetch.call(globalObject, nextInput, init);
            }
            return originalFetch.call(globalObject, input, init);
        };
        globalObject.fetch = patchedFetch as typeof fetch;
    }

    // --- XMLHttpRequest ----------------------------------------------------------------------
    // Emscripten's binary loader falls back to XHR when `fetch` streaming is unavailable, and XHR
    // has no "bypass the cache" option — the URL is the only lever.
    const XHR = globalObject.XMLHttpRequest;
    if (typeof XHR === "function" && XHR.prototype && XHR.prototype.open) {
        const originalOpen = XHR.prototype.open;
        XHR.prototype.open = function (
            this: XMLHttpRequest,
            method: string,
            url: string | URL,
            ...rest: unknown[]
        ) {
            const asString = typeof url === "string" ? url : url?.href;
            const stamped = asString
                ? stampArtifactUrl(asString, stamp)
                : undefined;
            return (originalOpen as (...args: unknown[]) => void).call(
                this,
                method,
                stamped ?? url,
                ...rest
            );
        } as typeof XHR.prototype.open;
    }
}
