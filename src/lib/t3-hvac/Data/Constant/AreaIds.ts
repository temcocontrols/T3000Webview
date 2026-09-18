/**
 * HVAC engine — DOM container ids.
 *
 * The engine looks up eight elements by id. Four of them have always been "configurable" in theory
 * (`InitializeWorkArea` accepts `workAreaId`, `svgAreaId`, `hRulerAreaId`, `vRulerAreaId`,
 * `cRulerAreaId`), but the only production caller ever passed `svgAreaId`, and a further set of call
 * sites ignored the config entirely and used the literal `'svg-area'` / `'#document-area'`.
 *
 * This module is the single source of truth. Defaults reproduce the historical ids **exactly**, so
 * every existing caller keeps behaving identically; `AreaIds.set()` lets a host (the unified Designer
 * shell) supply per-mount ids instead.
 *
 * Call it through `T3Gv.areaSelector()` / `T3Gv.areaElement()` so no engine file needs a new import.
 */

export type HvacAreaKey =
    /** Wraps the whole document. Captured as a Hammer host (`UIUtil.InitT3GvOpt`). */
    | "mainApp"
    /** Wraps the left panel. */
    | "leftPanel"
    /** Wraps the canvas column. */
    | "workAreaColumn"
    /** The scrollable SVG surface the engine draws into (Hammer host). */
    | "svgArea"
    /** The drawing/document area (Hammer host). */
    | "workArea"
    /** The three rulers. */
    | "hRuler"
    | "vRuler"
    | "cRuler";

/** Historical ids — changing these changes behaviour for every existing caller. */
export const DEFAULT_AREA_IDS: Record<HvacAreaKey, string> = {
    mainApp: "main-app",
    leftPanel: "left-panel",
    workAreaColumn: "work-area",
    svgArea: "svg-area",
    workArea: "document-area",
    hRuler: "h-ruler",
    vRuler: "v-ruler",
    cRuler: "c-ruler"
};

let current: Record<HvacAreaKey, string> = { ...DEFAULT_AREA_IDS };

export const AreaIds = {
    /** Bare id, e.g. `svg-area`. */
    get(area: HvacAreaKey): string {
        return current[area];
    },

    /** `#`-prefixed id, ready for jQuery / `querySelector`. */
    selector(area: HvacAreaKey): string {
        return `#${current[area]}`;
    },

    /** The element, or null when the host has not rendered it (or there is no DOM). */
    element(area: HvacAreaKey): HTMLElement | null {
        if (typeof document === "undefined") {
            return null;
        }
        return document.querySelector<HTMLElement>(`#${current[area]}`);
    },

    /** Override one or more ids. Partial overrides keep the remaining defaults. */
    set(partial: Partial<Record<HvacAreaKey, string>>): void {
        current = { ...current, ...partial };
    },

    /** Back to the historical ids. */
    reset(): void {
        current = { ...DEFAULT_AREA_IDS };
    },

    all(): Record<HvacAreaKey, string> {
        return { ...current };
    }
};
