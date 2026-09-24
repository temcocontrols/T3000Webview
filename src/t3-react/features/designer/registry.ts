/**
 * Designer — which host component renders which document kind.
 *
 * Additive by design: a kind only appears here once its adapter lands, and each host is a lazy
 * import so an unused engine never enters the initial bundle.
 */
import React from "react";
import type { DocumentKind } from "./kinds";

export interface DocumentHostProps {
    kind: DocumentKind;
    /** Optional id from the route (`/t3000/designer/<kind>/<id?>`). */
    id?: string;
    query: URLSearchParams;
    navigate: (to: string, options?: { replace?: boolean }) => void;
}

export interface DocumentEntry {
    Host: React.ComponentType<DocumentHostProps>;
}

/**
 * The dynamic import of each kind's host **module**, named once.
 *
 * `DESIGNER_DOCUMENTS` below renders it and `preloadDocument` starts it — sharing one function per kind
 * is what keeps the preloader from ever fetching a different module than the one React will mount.
 */
const HVAC_HOST = () => import("./documents/hvac/HvacDocument");
const LVGL_HOST = () => import("./documents/lvgl/LvglDocument");
const LCD_HOST = () => import("./documents/lcd/LcdDocument");

const HOST_MODULES: Partial<Record<DocumentKind, () => Promise<unknown>>> = {
    "hvac-schematic": HVAC_HOST,
    "lvgl-9-5": LVGL_HOST,
    "lvgl-flow-9-5": LVGL_HOST,
    "lcd-ui": LCD_HOST
};

export const DESIGNER_DOCUMENTS: Partial<Record<DocumentKind, DocumentEntry>> = {
    "hvac-schematic": {
        Host: React.lazy(() => HVAC_HOST().then((m) => ({ default: m.HvacDocumentHost })))
    },
    "lvgl-9-5": {
        Host: React.lazy(() =>
            LVGL_HOST().then((m) => ({
                default: m.LVGL_DOCUMENT_HOSTS["lvgl-9-5"]
            }))
        )
    },
    "lvgl-flow-9-5": {
        Host: React.lazy(() =>
            LVGL_HOST().then((m) => ({
                default: m.LVGL_DOCUMENT_HOSTS["lvgl-flow-9-5"]
            }))
        )
    },
    "lcd-ui": {
        Host: React.lazy(() => LCD_HOST().then((m) => ({ default: m.LcdDocumentHost })))
    }
};

/**
 * Start fetching a kind's host module *before* anything renders it.
 *
 * Called by `DesignerLayout` as soon as the route matches, so the host chunk (for HVAC: the host module
 * **and** the whole `@/lib/t3-hvac` engine behind it) travels while the route element's own chunk is
 * still in flight. Without it the two imports are strictly sequential — the host import cannot even
 * begin until `DesignerPage` has been evaluated — and that second window was, on its own, the longest
 * thing the user saw (`Loading document…`, measured at ~1.4 s warm and ~35 s under throttling).
 *
 * Failure is swallowed on purpose: this is an optimisation, not a load. React's own `lazy` will import
 * the same module again and report the real error through the document's error boundary.
 */
export function preloadDocument(kind: DocumentKind): void {
    const load = HOST_MODULES[kind];
    if (!load) {
        return;
    }

    void load().catch(() => {
        /* a real failure belongs to the render path, not to the preload */
    });
}
