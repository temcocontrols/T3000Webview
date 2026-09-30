/**
 * Designer — middle-area resize notification.
 *
 * The shell tells the document that the area it draws into moved or changed size instead of relying on fixed
 * `setTimeout` refreshes (the legacy HVAC page uses 150 ms / 400 ms timers and a 50 ms timer on panel
 * collapse). The callback is debounced because the engines do their own (partly expensive) relayout.
 */
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function useAreaResize(
    elementRef: RefObject<HTMLElement | null>,
    onResize: (() => void) | undefined,
    debounceMs = 100
) {
    const callbackRef = useRef(onResize);
    callbackRef.current = onResize;

    useEffect(() => {
        const element = elementRef.current;
        if (!element || typeof ResizeObserver === "undefined" || !onResize) {
            return;
        }

        let timer: number | undefined;

        const observer = new ResizeObserver(() => {
            if (timer !== undefined) {
                window.clearTimeout(timer);
            }
            timer = window.setTimeout(() => {
                timer = undefined;
                try {
                    callbackRef.current?.();
                } catch {
                    /* a failed relayout must not break the shell */
                }
            }, debounceMs);
        });

        observer.observe(element);

        return () => {
            if (timer !== undefined) {
                window.clearTimeout(timer);
            }
            observer.disconnect();
        };
    }, [elementRef, onResize, debounceMs]);
}
