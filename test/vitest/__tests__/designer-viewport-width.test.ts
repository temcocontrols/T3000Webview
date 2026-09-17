/**
 * Designer — responsive viewport width (regression guard).
 *
 * THE BUG THIS PINS. The hook used to throttle its `resize` handler with `requestAnimationFrame`.
 * rAF callbacks do not run in a hidden document, and the panes that host the Designer — VS Code's
 * embedded browser, a backgrounded tab — are routinely hidden while they are resized (measured in the
 * real pane: `document.visibilityState === "hidden"`, `requestAnimationFrame` never fired within
 * 600 ms, `setTimeout` fired normally). The width therefore stayed stale at the old, narrow value,
 * `DesignerShell` kept its responsive rule `hideLeft`/`hideRight` on, and at a wide window the LVGL
 * editor swallowed the whole area with no side panels to be seen — which is exactly the "the EEZ side
 * is a mess" symptom. The panels only came back on the next resize that happened while visible.
 *
 * The first test below fails against the old implementation (rAF stubbed to never call back), the
 * second one covers the resize that happened while the document was hidden.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    COMPACT_WIDTH_PX,
    NARROW_WIDTH_PX,
    subscribeViewportWidth
} from "../../../src/t3-react/features/designer/hooks/useViewportWidth";

let currentWidth = 1280;

/**
 * `innerWidth` is defined once as an accessor over `currentWidth`: re-`defineProperty`-ing per test is
 * fragile (the property may be an own accessor already), and a getter keeps the simulated width
 * readable by every code path, not just the one under test.
 */
beforeEach(() => {
    currentWidth = 1280;
    Object.defineProperty(window, "innerWidth", {
        configurable: true,
        get: () => currentWidth
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

/** Collects every width the subscription reports. */
function collect() {
    const seen: number[] = [];
    const unsubscribe = subscribeViewportWidth((width) => seen.push(width));
    return { seen, unsubscribe, last: () => seen[seen.length - 1] };
}

describe("subscribeViewportWidth", () => {
    it("reports the current width straight away", () => {
        currentWidth = 1234;
        const sub = collect();
        sub.unsubscribe();
        expect(sub.seen).toEqual([1234]);
    });

    it("still updates on resize when requestAnimationFrame never fires (hidden document)", () => {
        // Stub rAF so it never calls back: that is the hidden-document behaviour, and the whole point.
        const raf = vi.fn(() => 1);
        vi.stubGlobal("requestAnimationFrame", raf);

        currentWidth = NARROW_WIDTH_PX - 100;
        const sub = collect();
        expect(sub.last()).toBe(NARROW_WIDTH_PX - 100);

        // The pane is widened while hidden.
        currentWidth = COMPACT_WIDTH_PX + 400;
        window.dispatchEvent(new Event("resize"));

        expect(sub.last()).toBe(COMPACT_WIDTH_PX + 400);
        expect(raf).not.toHaveBeenCalled();
        sub.unsubscribe();
    });

    it("re-reads on visibilitychange, for a resize that happened while hidden", () => {
        const raf = vi.fn(() => 1);
        vi.stubGlobal("requestAnimationFrame", raf);

        currentWidth = NARROW_WIDTH_PX - 100;
        const sub = collect();

        // Resized while hidden, so no usable resize event reached the page.
        currentWidth = 1600;
        document.dispatchEvent(new Event("visibilitychange"));

        expect(sub.last()).toBe(1600);
        sub.unsubscribe();
    });

    it("ignores an unusable measurement instead of hiding the panels", () => {
        // A 0 width would make the responsive rule hide both panels; it must be treated as "unknown".
        currentWidth = 0;
        const sub = collect();
        sub.unsubscribe();
        expect(sub.seen).toEqual([expect.any(Number)]);
        expect(sub.last()).toBeGreaterThan(COMPACT_WIDTH_PX);
    });

    it("stops listening after unsubscribe", () => {
        const sub = collect();
        sub.unsubscribe();

        currentWidth = 1700;
        window.dispatchEvent(new Event("resize"));
        document.dispatchEvent(new Event("visibilitychange"));

        expect(sub.seen).toEqual([1280]);
    });
});
