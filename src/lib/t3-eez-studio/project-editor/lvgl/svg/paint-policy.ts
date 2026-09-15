/**
 * LVGL 9 SVG renderer — when to dump and patch (P4).
 *
 * ADDITIVE: new file, and **pure**, so the repaint policy can be unit-tested without a runtime.
 *
 * WHY THIS EXISTS
 * ---------------
 * The base runtime only blits when something changed, and the SVG pipeline cannot see *what* changed:
 * the proxy context just gets "a frame happened". The first version of the pipeline therefore painted
 * once and then stopped, which meant an edit in the property panel did not reach the surface until the
 * page was reopened — a correctness bug, not a performance detail.
 *
 * Two independent signals are needed:
 *
 * 1. **Explicit dirt** — `markDirty()` from an editor action that already knows the model changed.
 * 2. **Polling** — a throttled re-dump, because nothing tells us that a widget property changed. The
 *    frame callback is the only heartbeat available, and it fires far more often than a design surface
 *    needs to re-serialise its scene.
 *
 * Polling alone would re-patch the DOM several times a second for nothing, so the dumped text is
 * compared with the previous one and the DOM is only touched when it actually differs — an unchanged
 * scene costs one dump and a string compare, no DOM writes.
 */

/** How often a non-dirty frame may trigger a re-dump. */
export const POLL_INTERVAL_MS = 250;

export interface PaintDecisionInput {
    /** Set by `markDirty()` (an editor action that knows the model changed). */
    dirty: boolean;
    /** Set when the previous attempt could not paint (runtime not ready yet). */
    needsPaint: boolean;
    /** Current time in ms. */
    now: number;
    /** When the last polled dump happened; `undefined` when nothing has been painted yet. */
    lastPollAt: number | undefined;
    pollIntervalMs?: number;
}

/**
 * Should this frame dump the scene?
 *
 * `true` for explicit dirt, for pending retries, and for the first frame ever (nothing painted yet);
 * otherwise only once per poll interval, which is what turns "the frame loop is idle" into "edits
 * still appear".
 */
export function shouldDumpScene(input: PaintDecisionInput): boolean {
    if (input.dirty || input.needsPaint) {
        return true;
    }
    if (input.lastPollAt === undefined) {
        return true;
    }
    const interval = input.pollIntervalMs ?? POLL_INTERVAL_MS;
    return input.now - input.lastPollAt >= interval;
}

/**
 * Is the freshly dumped scene identical to the painted one?
 *
 * Only used to skip the DOM patch. The dump is a compact JSON string, so comparing it is far cheaper
 * than walking the tree, and it keeps an idle surface from touching the DOM at all.
 */
export function isSceneUnchanged(
    previousDump: string | undefined,
    nextDump: string | undefined
): boolean {
    return previousDump !== undefined && previousDump === nextDump;
}
