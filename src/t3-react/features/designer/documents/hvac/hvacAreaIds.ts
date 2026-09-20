/**
 * Designer — per-document container ids for the HVAC engine.
 *
 * The engine reads its containers from `AreaIds` (`src/lib/t3-hvac/Data/Constant/AreaIds.ts`, pure, no
 * imports). Each mounted document *owns* that table: it sets its ids in a layout effect — before the
 * engine initialises — and the legacy page resets it to the historical values. That way two documents
 * can never share a container id, and neither document depends on mount ordering.
 *
 * This module is deliberately pure (type-only import) so it can be unit-tested without loading the engine.
 */
import type { HvacAreaKey } from "@/lib/t3-hvac/Data/Constant/AreaIds";

export type HvacAreaIdMap = Record<HvacAreaKey, string>;

/** Builds the id set for one mounted document, e.g. suffix `"d1"` → `svg-area-d1`. */
export function makeAreaIds(suffix: string): HvacAreaIdMap {
    return {
        mainApp: `main-app-${suffix}`,
        leftPanel: `left-panel-${suffix}`,
        workAreaColumn: `work-area-${suffix}`,
        svgArea: `svg-area-${suffix}`,
        workArea: `document-area-${suffix}`,
        hRuler: `h-ruler-${suffix}`,
        vRuler: `v-ruler-${suffix}`,
        cRuler: `c-ruler-${suffix}`
    };
}

/** The subset the canvas markup needs. */
export interface HvacCanvasIds {
    documentArea: string;
    svgArea: string;
    hRuler: string;
    vRuler: string;
    cRuler: string;
}

export function canvasIdsOf(ids: HvacAreaIdMap): HvacCanvasIds {
    return {
        documentArea: ids.workArea,
        svgArea: ids.svgArea,
        hRuler: ids.hRuler,
        vRuler: ids.vRuler,
        cRuler: ids.cRuler
    };
}

/** The historical ids — identical to `DEFAULT_AREA_IDS` in the engine. */
export const LEGACY_CANVAS_IDS: HvacCanvasIds = {
    documentArea: "document-area",
    svgArea: "svg-area",
    hRuler: "h-ruler",
    vRuler: "v-ruler",
    cRuler: "c-ruler"
};
