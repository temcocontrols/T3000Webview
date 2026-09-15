/**
 * Paint-policy tests.
 *
 * These pin the fix for a real bug: the pipeline used to paint once and then wait for an explicit
 * `markDirty()`, which nothing called — so a property-panel edit never reached the surface. The policy
 * has to keep two promises at once: edits appear, and an idle surface does no DOM work.
 */

import { describe, expect, it } from "vitest";
import {
    POLL_INTERVAL_MS,
    isSceneUnchanged,
    shouldDumpScene,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/paint-policy";

describe("paint policy — when to dump", () => {
    it("dumps immediately when the model is explicitly dirty", () => {
        expect(
            shouldDumpScene({
                dirty: true,
                needsPaint: false,
                now: 1000,
                lastPollAt: 999,
            })
        ).toBe(true);
    });

    it("dumps immediately when the previous attempt could not paint", () => {
        expect(
            shouldDumpScene({
                dirty: false,
                needsPaint: true,
                now: 1000,
                lastPollAt: 999,
            })
        ).toBe(true);
    });

    it("polls while idle so an edit that nobody announced still appears", () => {
        // This is the behaviour that fixes property-panel edits: nothing calls markDirty for them,
        // so the frame callback alone has to trigger a re-dump at a bounded rate.
        expect(
            shouldDumpScene({
                dirty: false,
                needsPaint: false,
                now: 1000 + POLL_INTERVAL_MS,
                lastPollAt: 1000,
            })
        ).toBe(true);
    });

    it("does not poll before the interval has elapsed", () => {
        expect(
            shouldDumpScene({
                dirty: false,
                needsPaint: false,
                now: 1000 + POLL_INTERVAL_MS - 1,
                lastPollAt: 1000,
            })
        ).toBe(false);
    });

    it("accepts a custom interval", () => {
        expect(
            shouldDumpScene({
                dirty: false,
                needsPaint: false,
                now: 1000,
                lastPollAt: 990,
                pollIntervalMs: 5,
            })
        ).toBe(true);
        expect(
            shouldDumpScene({
                dirty: false,
                needsPaint: false,
                now: 1000,
                lastPollAt: 990,
                pollIntervalMs: 50,
            })
        ).toBe(false);
    });

    it("polls on the first frame, when nothing has been painted yet", () => {
        expect(
            shouldDumpScene({
                dirty: false,
                needsPaint: false,
                now: 0,
                lastPollAt: undefined,
            })
        ).toBe(true);
        // ...even much later in the session, so "never polled" is explicit rather than implied by
        // an epoch timestamp.
        expect(
            shouldDumpScene({
                dirty: false,
                needsPaint: false,
                now: 1_700_000_000_000,
                lastPollAt: undefined,
            })
        ).toBe(true);
    });
});

describe("paint policy — when to touch the DOM", () => {
    it("treats identical dumps as unchanged, so polling is free", () => {
        expect(isSceneUnchanged('{"a":1}', '{"a":1}')).toBe(true);
    });

    it("treats a differing dump as changed", () => {
        expect(isSceneUnchanged('{"a":1}', '{"a":2}')).toBe(false);
    });

    it("always patches the first scene, even if it is the empty one", () => {
        expect(isSceneUnchanged(undefined, "{}")).toBe(false);
        expect(isSceneUnchanged(undefined, undefined)).toBe(false);
    });
});
