/**
 * Runtime artifact cache guard tests.
 *
 * The guard exists because a stale cached `.wasm` next to a fresh glue makes Emscripten abort with
 * "missing Wasm export", on every LVGL surface, uncatchably. These tests pin the two things that make
 * it work and keep it safe: it only rewrites LVGL runtime artifact URLs, and it rewrites them to a
 * key that cannot be holding an old entry.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
    installLvglRuntimeCacheGuard,
    stampArtifactUrl,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/runtime-cache-guard";

const WASM =
    "/eez-studio-wasm/wasm/lvgl/9.5.0/lvgl_runtime_v9.5.0.wasm";
const GLUE = "/eez-studio-wasm/wasm/lvgl/9.5.0/lvgl_runtime_v9.5.0.js";

afterEach(() => {
    vi.unstubAllGlobals();
    delete (globalThis as any).__lvglRuntimeCacheGuardInstalled;
});

describe("cache guard — URL rewriting", () => {
    it("stamps the runtime artifacts", () => {
        expect(stampArtifactUrl(WASM, "abc")).toBe(`${WASM}?lvglrt=abc`);
        expect(stampArtifactUrl(GLUE, "abc")).toBe(`${GLUE}?lvglrt=abc`);
    });

    it("keeps an existing query string intact", () => {
        expect(stampArtifactUrl(`${WASM}?foo=1`, "abc")).toBe(
            `${WASM}?foo=1&lvglrt=abc`
        );
    });

    it("is idempotent, so a request cannot be stamped twice", () => {
        const once = stampArtifactUrl(WASM, "abc")!;
        expect(stampArtifactUrl(once, "abc")).toBeUndefined();
    });

    it("leaves every other URL alone", () => {
        // Other versions, other files, and lookalikes must all pass through untouched.
        expect(stampArtifactUrl("/api/eez-studio/read-text-file?path=x", "abc")).toBeUndefined();
        expect(stampArtifactUrl("/wasm/lvgl/9.5.0/something_else.wasm", "abc")).toBeUndefined();
        expect(stampArtifactUrl("/other/lvgl_runtime_v9.5.0.wasm", "abc")).toBeUndefined();
        expect(stampArtifactUrl("https://example.com/index.js", "abc")).toBeUndefined();
    });
});

describe("cache guard — installation", () => {
    it("rewrites the fetch of a runtime artifact and leaves other fetches alone", async () => {
        const calls: Array<{ url: string; init?: RequestInit }> = [];
        const fakeFetch = vi.fn(async (input: any, init?: RequestInit) => {
            calls.push({ url: String(input?.url ?? input), init });
            return { ok: true, status: 200 } as unknown as Response;
        });
        vi.stubGlobal("fetch", fakeFetch);

        installLvglRuntimeCacheGuard();
        await fetch(WASM);
        await fetch("/api/eez-studio/health");

        expect(calls[0].url).toMatch(
            /^\/eez-studio-wasm\/wasm\/lvgl\/9\.5\.0\/lvgl_runtime_v9\.5\.0\.wasm\?lvglrt=.+$/
        );
        expect(calls[1].url).toBe("/api/eez-studio/health");
    });

    it("gives the whole tab one stamp, so the artifact is fetched once under that key", async () => {
        const urls: string[] = [];
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: any) => {
                urls.push(String(input?.url ?? input));
                return { ok: true, status: 200 } as unknown as Response;
            })
        );

        installLvglRuntimeCacheGuard();
        await fetch(WASM);
        await fetch(WASM);

        expect(urls[0]).toBe(urls[1]);
    });

    it("preserves a Request object's other properties", async () => {
        let seen: Request | undefined;
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: any) => {
                seen = input as Request;
                return { ok: true, status: 200 } as unknown as Response;
            })
        );

        installLvglRuntimeCacheGuard();
        const request = new Request(`http://localhost${WASM}`, {
            headers: { "x-test": "1" },
        });
        await fetch(request);

        expect(seen).toBeInstanceOf(Request);
        expect(seen!.url).toContain("lvglrt=");
        expect(seen!.headers.get("x-test")).toBe("1");
    });

    it("stamps XMLHttpRequest, the glue's fallback loader", () => {
        const opened: string[] = [];
        class FakeXHR {
            open(method: string, url: string) {
                opened.push(url);
            }
        }
        vi.stubGlobal("XMLHttpRequest", FakeXHR as unknown as typeof XMLHttpRequest);

        installLvglRuntimeCacheGuard();
        const xhr = new (globalThis as any).XMLHttpRequest();
        xhr.open("GET", WASM);
        xhr.open("GET", "/api/eez-studio/health");

        expect(opened[0]).toMatch(/\?lvglrt=.+$/);
        expect(opened[1]).toBe("/api/eez-studio/health");
    });

    it("installs only once", () => {
        const fakeFetch = vi.fn(async () => ({ ok: true, status: 200 }) as unknown as Response);
        vi.stubGlobal("fetch", fakeFetch);

        installLvglRuntimeCacheGuard();
        const afterFirst = globalThis.fetch;
        installLvglRuntimeCacheGuard();
        expect(globalThis.fetch).toBe(afterFirst);
    });

    it("does nothing when there is no fetch to patch", () => {
        const globalObject = globalThis as any;
        const original = globalObject.fetch;
        delete globalObject.fetch;
        try {
            expect(() => installLvglRuntimeCacheGuard()).not.toThrow();
        } finally {
            globalObject.fetch = original;
        }
    });
});
