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

export const DESIGNER_DOCUMENTS: Partial<Record<DocumentKind, DocumentEntry>> = {
    "hvac-schematic": {
        Host: React.lazy(() =>
            import("./documents/hvac/HvacDocument").then((m) => ({ default: m.HvacDocumentHost }))
        )
    },
    "lvgl-9-5": {
        Host: React.lazy(() =>
            import("./documents/lvgl/LvglDocument").then((m) => ({
                default: m.LVGL_DOCUMENT_HOSTS["lvgl-9-5"]
            }))
        )
    },
    "lvgl-flow-9-5": {
        Host: React.lazy(() =>
            import("./documents/lvgl/LvglDocument").then((m) => ({
                default: m.LVGL_DOCUMENT_HOSTS["lvgl-flow-9-5"]
            }))
        )
    },
    "lcd-ui": {
        Host: React.lazy(() =>
            import("./documents/lcd/LcdDocument").then((m) => ({ default: m.LcdDocumentHost }))
        )
    }
};
