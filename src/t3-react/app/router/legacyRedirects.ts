/**
 * Designer — P4 legacy route consolidation.
 *
 * P1–P3 kept the old routes alive on purpose (D10): because the unified shell was *additive*, nothing
 * could regress. P4 is the step that closes them — the old URLs stay supported, but they now **redirect**
 * to the document kind that replaced them, so there is exactly one editor implementation per kind.
 *
 * Two rules this module exists to enforce (both were bugs on the first attempt in other projects):
 *
 *  1. **The query survives verbatim.** `?open=` (which project to open), `?new=`/`?examples=` (the create
 *     hand-off), `?svg=1`/`?svgDiff=1` (the LVGL SVG surface + diff harness) and `?name=`/`location=`
 *     are all read from `location.search` under `HashRouter`. Rewriting or dropping them breaks the
 *     hand-off silently — the page simply opens nothing.
 *  2. **The legacy HVAC path segment is a document id, not a sub-route.** `/t3000/hvac-designer/123`
 *     means "open drawing 123" (`HvacDesignerPage.tsx:93,168`), which is `/t3000/designer/hvac-schematic/123`.
 *
 * Pure module: no React, no router import — the mapping is unit-testable and the router component that
 * consumes it stays three lines long.
 */
import { designerPath, type DocumentKind } from "@/t3-react/features/designer/kinds";

export interface LegacyDesignerRoute {
    /** The legacy pathname prefix. */
    from: string;
    /** The document kind that now owns it. */
    kind: DocumentKind;
    /** True when a trailing path segment is the document id. */
    idInPath: boolean;
}

export const LEGACY_DESIGNER_ROUTES: LegacyDesignerRoute[] = [
    { from: "/t3000/hvac-designer", kind: "hvac-schematic", idInPath: true },
    // `/t3000/eez` served both LVGL and LVGL-with-Flow projects; the project itself decides whether flow
    // is available, so the plain LVGL kind is the correct landing spot (the flow kind exists for projects
    // created as flow from the Design Hub).
    { from: "/t3000/eez", kind: "lvgl-9-5", idInPath: false },
    // P5 — the LCD/simulator page becomes the `lcd-ui` document.
    { from: "/t3000/tstat10-simulator", kind: "lcd-ui", idInPath: false }
];

/**
 * Resolves a legacy pathname to its unified-designer equivalent.
 * Returns `undefined` when the path is not a legacy designer route.
 *
 * @param pathname the router's pathname (no query)
 * @param search   the router's search **including** the leading `?`, or `""`
 */
export function legacyRedirectTarget(pathname: string, search: string): string | undefined {
    for (const route of LEGACY_DESIGNER_ROUTES) {
        if (pathname !== route.from && !pathname.startsWith(`${route.from}/`)) {
            continue;
        }

        let id: string | undefined;
        if (route.idInPath) {
            const rest = pathname.slice(route.from.length).replace(/^\/+/, "");
            id = rest ? decodeURIComponent(rest) : undefined;
        }

        return withSearch(designerPath(route.kind, id), search);
    }

    return undefined;
}

/** Keeps the query byte-for-byte (including `?` handling and empty search). */
function withSearch(pathname: string, search: string): string {
    if (!search) {
        return pathname;
    }
    return search.startsWith("?") ? `${pathname}${search}` : `${pathname}?${search}`;
}
