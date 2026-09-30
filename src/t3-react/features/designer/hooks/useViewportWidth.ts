/**
 * Designer — viewport width, for responsive panel behaviour.
 *
 * A shell with two fixed-width side panels can starve the middle area on a narrow window (the VS Code
 * embedded browser, a small laptop, a split-screen editor). The shell uses this to *effectively*
 * collapse regions without touching the user's persisted layout: widen the window again and the panels
 * come back exactly as the user left them.
 *
 * Consequence to keep in mind: while the measurement is stale or unknown, `DesignerShell` hides the
 * panels — so this hook must never be the reason a panel disappears. See `subscribeViewportWidth` for
 * the hidden-document trap that made exactly that happen.
 */
import { useEffect, useState } from "react";

/** Below this the middle area alone is shown. */
export const NARROW_WIDTH_PX = 640;
/** Below this the right region is hidden unless there is room for the middle area + left region. */
export const COMPACT_WIDTH_PX = 900;

/** Width assumed when there is no window to measure, or when the measurement is unusable. */
const ASSUMED_WIDTH_PX = 1280;

function readViewportWidth(): number {
    if (typeof window === "undefined") {
        return ASSUMED_WIDTH_PX;
    }
    const width = window.innerWidth;
    // A non-positive width is a measurement, not a window: treat it as "unknown" and assume there is
    // room. The responsive rule below *hides* panels, so a bogus 0 would make the whole designer look
    // like it had lost its panels while the pane was simply not measurable yet.
    return Number.isFinite(width) && width > 0 ? width : ASSUMED_WIDTH_PX;
}

/**
 * Subscribe to viewport-width changes; returns the unsubscribe function.
 *
 * Deliberately NOT throttled through `requestAnimationFrame`. rAF callbacks do not run in a hidden
 * document, and the panes that host this shell — VS Code's embedded browser, a backgrounded tab — are
 * routinely hidden while they are resized. Throttling there means the width stays stale for the rest
 * of the session, so the responsive rule keeps hiding the side panels even after the pane is wide
 * again: the editor swallows the whole area and only a manual resize brings the panels back.
 * `resize` is already coalesced by the browser, so assigning directly is cheap; `visibilitychange`
 * covers the resize that happened while the document was hidden and produced no usable event.
 */
export function subscribeViewportWidth(onChange: (width: number) => void): () => void {
    const read = () => onChange(readViewportWidth());

    window.addEventListener("resize", read);
    document.addEventListener("visibilitychange", read);
    read();

    return () => {
        window.removeEventListener("resize", read);
        document.removeEventListener("visibilitychange", read);
    };
}

export function useViewportWidth(): number {
    const [width, setWidth] = useState(readViewportWidth);

    useEffect(() => subscribeViewportWidth(setWidth), []);

    return width;
}

/* ------------------------------------------------------------------ height */

/** Height assumed when there is no window to measure. */
const ASSUMED_HEIGHT_PX = 800;

function readViewportHeight(): number {
    if (typeof window === "undefined") {
        return ASSUMED_HEIGHT_PX;
    }
    const height = window.innerHeight;
    return Number.isFinite(height) && height > 0 ? height : ASSUMED_HEIGHT_PX;
}

/** Same trap, same treatment as `subscribeViewportWidth`: no rAF, and re-read on visibility change. */
export function subscribeViewportHeight(onChange: (height: number) => void): () => void {
    const read = () => onChange(readViewportHeight());

    window.addEventListener("resize", read);
    document.addEventListener("visibilitychange", read);
    read();

    return () => {
        window.removeEventListener("resize", read);
        document.removeEventListener("visibilitychange", read);
    };
}

/**
 * Viewport height, used to clamp the bottom dock's drag so the middle area keeps a usable height —
 * the vertical twin of the width clamp the left/right splitters already apply.
 */
export function useViewportHeight(): number {
    const [height, setHeight] = useState(readViewportHeight);

    useEffect(() => subscribeViewportHeight(setHeight), []);

    return height;
}
