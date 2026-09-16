/**
 * LVGL 9 SVG renderer — proxy 2-D context (P3).
 *
 * ADDITIVE: new file. `lvgl/page-runtime.ts` is NOT modified.
 *
 * Why this is a complete hook: the page editor runtime's entire canvas surface is three calls —
 *     ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, w, h)   // page switch clear   (:982-983)
 *     ctx.putImageData(imgData, 0, 0)                        // the frame          (:1018)
 *     ctx.clearRect(0, 0, w, h)                              // error/empty state  (:1030)
 * so handing the runtime this object instead of a real `getContext("2d")` intercepts the frame
 * without overriding a single method and without touching the base class.
 *
 * Two properties matter:
 *   - `putImageData` is the frame boundary. The ImageData itself is discarded: the caller dumps
 *     the LVGL scene instead, so the pixels are replaced, not consumed.
 *   - The object must accept arbitrary property writes (`set` must succeed). The base class
 *     writes bookkeeping fields onto it (e.g. `ctxPage`), and a frozen or throwing proxy would
 *     break the inherited code path.
 *
 * Anything the base class does not currently call is answered with a harmless no-op rather than
 * crashing, and reported through `onUnexpectedMember` so a future change to the base class is
 * visible instead of silent.
 */

export interface SvgContextHooks {
    /** A frame was produced: dump the scene and patch the SVG. */
    onFrame: () => void;
    /** The base class blanked the surface (page switch / error) — clear the SVG content. */
    onClearPage?: () => void;
    /** Development hook: called once per distinct member the base class touches unexpectedly. */
    onUnexpectedMember?: (member: string, kind: "get" | "set") => void;
    /**
     * Optional development-only target for the frames the base runtime blits.
     *
     * The proxy deliberately throws the `ImageData` away — the SVG surface does not need pixels. But
     * those pixels *are* the LVGL framebuffer, i.e. the exact oracle the fidelity harness needs, and
     * capturing them here costs nothing extra: one `putImageData` per frame into an offscreen canvas
     * that nothing displays. This is how P5 gets a reference from the *same* LVGL run rather than
     * mounting a second runtime.
     */
    mirror?: HTMLCanvasElement;
}

/** Members the runtime is known to use — handled explicitly, never reported as unexpected. */
const KNOWN_MEMBERS = [
    "putImageData",
    "fillRect",
    "clearRect",
    "fillStyle",
    "strokeStyle",
    "canvas",
    "save",
    "restore",
];

export function createSvgContext(
    hooks: SvgContextHooks
): CanvasRenderingContext2D {
    const reported = new Set<string>();
    const mirrorContext = hooks.mirror
        ? hooks.mirror.getContext("2d")
        : undefined;

    const report = (member: string, kind: "get" | "set") => {
        const labelled = `${kind}:${member}`;
        if (reported.has(labelled)) {
            return;
        }
        reported.add(labelled);
        hooks.onUnexpectedMember?.(member, kind);
    };

    const target: Record<string | symbol, unknown> = {
        /** Marker so a caller can tell a synthetic context from a real one. */
        __lvglSvgContext: true,
        // The frame boundary. The SVG surface does not use the pixels, but a mirror (when present)
        // keeps them as the harness's reference image.
        putImageData: (imageData: ImageData, x = 0, y = 0) => {
            if (mirrorContext && imageData) {
                mirrorContext.putImageData(imageData, x, y);
            }
            hooks.onFrame();
        },
        // Both of these mean "this page is going away / could not be rendered".
        fillRect: () => {
            hooks.onClearPage?.();
        },
        clearRect: () => {
            hooks.onClearPage?.();
        },
        fillStyle: "#000000",
        strokeStyle: "#000000",
        canvas: undefined,
        save: () => undefined,
        restore: () => undefined,
    };

    return new Proxy(target, {
        get(object, property) {
            if (property in object) {
                return object[property];
            }
            // Never appear thenable to an awaiting caller.
            if (property === "then" || typeof property === "symbol") {
                return undefined;
            }
            report(String(property), "get");
            // Returns a callable so `ctx.someFutureCall(...)` is a no-op instead of a TypeError.
            return () => undefined;
        },
        set(object, property, value) {
            if (typeof property === "symbol") {
                return true;
            }
            const name = String(property);
            if (KNOWN_MEMBERS.indexOf(name) === -1) {
                report(name, "set");
            }
            object[name] = value;
            return true;
        },
        has() {
            return true;
        },
    }) as unknown as CanvasRenderingContext2D;
}

/** True when a context was produced by `createSvgContext` (used to keep the flag honest). */
export function isSvgContext(value: unknown): boolean {
    return (
        !!value &&
        typeof value === "object" &&
        (value as { __lvglSvgContext?: boolean }).__lvglSvgContext === true
    );
}
