/**
 * Stale-runtime recovery tests.
 *
 * These cover the pure/observable contract only: the URL shape, the once-per-session latch, and that
 * a refresh is requested with the cache bypassed. The end-to-end symptom it fixes (an old cached
 * `.wasm` next to a fresh glue JS, producing an empty `#content`) can only be reproduced in a
 * browser, so it is documented in `runtime-artifacts.ts`.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
    hasWasmExportName,
    inspectLvglRuntimeArtifacts,
    lvglRuntimeArtifactUrls,
    refreshLvglRuntimeArtifacts,
    resetRuntimeRefreshLatch,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/runtime-artifacts";

const VERSION = "9.5.0";

let fetchMock: ReturnType<typeof vi.fn>;

function installFetch(ok = true) {
    fetchMock = vi.fn(async () => ({
        ok,
        status: ok ? 200 : 404,
        arrayBuffer: async () => new ArrayBuffer(0),
    }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

afterEach(() => {
    vi.unstubAllGlobals();
    resetRuntimeRefreshLatch(VERSION);
});

describe("runtime artifacts — URLs", () => {
    it("matches the path the app loads the runtime from", () => {
        const urls = lvglRuntimeArtifactUrls(VERSION);
        expect(urls.js).toBe(
            "/eez-studio-wasm/wasm/lvgl/9.5.0/lvgl_runtime_v9.5.0.js"
        );
        expect(urls.wasm).toBe(
            "/eez-studio-wasm/wasm/lvgl/9.5.0/lvgl_runtime_v9.5.0.wasm"
        );
    });
});

describe("runtime artifacts — refresh", () => {
    it("fetches the wasm with the cache bypassed", async () => {
        const mock = installFetch();
        const outcome = await refreshLvglRuntimeArtifacts(VERSION);

        expect(outcome).toBe("refreshed");
        const wasmCall = mock.mock.calls.find(call =>
            String(call[0]).endsWith(".wasm")
        );
        expect(wasmCall).toBeDefined();
        // `reload` replaces the cached entry — that is what makes a plain F5 work afterwards.
        expect(wasmCall![1]).toMatchObject({ cache: "reload" });
    });

    it("refreshes the glue too, and reports success if either request works", async () => {
        const mock = installFetch();
        await refreshLvglRuntimeArtifacts(VERSION);
        const urls = mock.mock.calls.map(call => String(call[0]));
        expect(urls.some(url => url.endsWith(".js"))).toBe(true);
        expect(urls.some(url => url.endsWith(".wasm"))).toBe(true);
    });

    it("only ever refreshes once per session, so a per-frame failure cannot flood the network", async () => {
        const mock = installFetch();
        expect(await refreshLvglRuntimeArtifacts(VERSION)).toBe("refreshed");
        const callsAfterFirst = mock.mock.calls.length;
        expect(callsAfterFirst).toBeGreaterThan(0);

        expect(await refreshLvglRuntimeArtifacts(VERSION)).toBe(
            "already-refreshed"
        );
        expect(await refreshLvglRuntimeArtifacts(VERSION)).toBe(
            "already-refreshed"
        );
        expect(mock.mock.calls.length).toBe(callsAfterFirst);
    });

    it("reports failure rather than throwing when the network is unavailable", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new Error("offline");
            })
        );
        expect(await refreshLvglRuntimeArtifacts(VERSION)).toBe("failed");
    });

    it("treats a non-ok response as failure", async () => {
        installFetch(false);
        expect(await refreshLvglRuntimeArtifacts(VERSION)).toBe("failed");
    });
});

// ---------------------------------------------------------------------------------------
// pre-flight inspection — what the runtime is about to load
// ---------------------------------------------------------------------------------------

/** Minimal wasm-ish byte string: export names are stored as ASCII in the binary. */
function wasmBytes(withDump: boolean): Uint8Array {
    const body = withDump
        ? "\x00asm\x01\x00\x00\x00malloclvglDumpSceneinit"
        : "\x00asm\x01\x00\x00\x00mallocinit";
    return new TextEncoder().encode(body);
}

/**
 * Install a fetch whose *cached* view (default cache mode) differs from its network view
 * (`cache: "reload"`), which is exactly the stale-cache situation.
 */
function installSplitFetch(network: Uint8Array, cached: Uint8Array) {
    const mock = vi.fn(async (_url: string, init?: { cache?: string }) => {
        const bytes = init?.cache === "reload" ? network : cached;
        return {
            ok: true,
            status: 200,
            arrayBuffer: async () =>
                bytes.buffer.slice(
                    bytes.byteOffset,
                    bytes.byteOffset + bytes.byteLength
                ),
        };
    });
    vi.stubGlobal("fetch", mock);
    return mock;
}

describe("runtime artifacts — wasm export name scan", () => {
    it("finds an export name in the binary and reports its absence", () => {
        expect(hasWasmExportName(wasmBytes(true), "lvglDumpScene")).toBe(true);
        expect(hasWasmExportName(wasmBytes(false), "lvglDumpScene")).toBe(false);
        // Not fooled by a different export.
        expect(hasWasmExportName(wasmBytes(true), "lvglCountObjects")).toBe(false);
    });
});

describe("runtime artifacts — pre-flight inspection", () => {
    it("passes when both the network and the cached copy have the dump", async () => {
        installSplitFetch(wasmBytes(true), wasmBytes(true));
        expect(await inspectLvglRuntimeArtifacts(VERSION)).toBe("ok");
    });

    it("verifies only once per session, so later mounts do not re-download", async () => {
        const mock = installSplitFetch(wasmBytes(true), wasmBytes(true));
        expect(await inspectLvglRuntimeArtifacts(VERSION)).toBe("ok");
        const calls = mock.mock.calls.length;
        expect(calls).toBe(2); // network + cache read
        expect(await inspectLvglRuntimeArtifacts(VERSION)).toBe("already-verified");
        expect(mock.mock.calls.length).toBe(calls);
    });

    it("blames the server when the freshly served binary lacks the dump", async () => {
        installSplitFetch(wasmBytes(false), wasmBytes(false));
        expect(await inspectLvglRuntimeArtifacts(VERSION)).toBe("stale-server");
    });

    it("blames the cache when the network is current but the cached copy is not", async () => {
        // This is the reported Firefox failure: fresh glue + old cached .wasm -> the glue asserts
        // "missing Wasm export: lvglDumpScene" and aborts before anything can be reported.
        installSplitFetch(wasmBytes(true), wasmBytes(false));
        expect(await inspectLvglRuntimeArtifacts(VERSION)).toBe("stale-cache");
    });

    it("does not latch a bad result, so the retry after a reload re-checks", async () => {
        installSplitFetch(wasmBytes(true), wasmBytes(false));
        expect(await inspectLvglRuntimeArtifacts(VERSION)).toBe("stale-cache");
        // Fresh session state, now with a good cache: must be able to recover.
        installSplitFetch(wasmBytes(true), wasmBytes(true));
        expect(await inspectLvglRuntimeArtifacts(VERSION)).toBe("ok");
    });

    it("says it cannot tell rather than blocking the surface when offline", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new Error("offline");
            })
        );
        expect(await inspectLvglRuntimeArtifacts(VERSION)).toBe("unavailable");
    });
});
