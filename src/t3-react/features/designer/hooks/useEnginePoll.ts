/**
 * Designer — one shared poller per document.
 *
 * The HVAC engine has no event bus (its status values are plain module-level `let`s and the
 * `RefConstant` "refs" are `{value}` boxes), so panels must poll. This hook centralises that so a
 * document has a single timer, which pauses while the tab is hidden.
 *
 * Existing precedents this replaces: `TopToolbar.tsx:192` (300 ms), `T3ContextMenu.tsx:329` (150 ms),
 * `useStatusMessage.ts:20` (rAF).
 */
import { useEffect, useRef } from "react";

export function useEnginePoll(callback: () => void, intervalMs = 250, enabled = true) {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let cancelled = false;

        /**
         * Deliberately NOT skipped while `document.hidden`.
         *
         * That guard looks like a courtesy to the battery and is a defect everywhere this shell is
         * actually hosted: VS Code's embedded browser reports `hidden` while the pane is on screen, so
         * the poll never ran and *every* polled control stayed in its first-paint state — undo/redo
         * greyed out, zoom, rulers and grid disabled forever (verified live: the same row with the
         * same document, enabled the moment the stale flag was cleared). Background documents are
         * already throttled by the browser, which is the only throttling that matters here.
         */
        const tick = () => {
            if (cancelled) {
                return;
            }
            try {
                callbackRef.current();
            } catch {
                /* polling must never break the shell */
            }
        };

        // First sample immediately so the UI is correct before the first interval elapses.
        tick();
        const intervalId = window.setInterval(tick, intervalMs);
        document.addEventListener("visibilitychange", tick);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            document.removeEventListener("visibilitychange", tick);
        };
    }, [intervalMs, enabled]);
}
