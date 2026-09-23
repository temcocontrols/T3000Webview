/**
 * Designer — the HVAC `ViewportAdapter` (`interfaces.md` §4.1).
 *
 * Every call here already exists in the engine; the adapter is only a naming seam, which is why it can
 * be a module-level constant (the engine is a singleton too — no per-mount state to capture). The calls
 * are the ones the legacy `TopToolbar` uses (`features/hvac-designer/components/toolbar/TopToolbar.tsx`),
 * so the shell's controls do exactly what the old toolbar's did.
 *
 * `rulers`/`grid` are *getters*: the interface wants a snapshot, and the engine's values change without
 * React noticing, so a stored object would report the state from mount time forever.
 */
import T3Gv from "@/lib/t3-hvac/Data/T3Gv";
import DataOpt from "@/lib/t3-hvac/Opt/Data/DataOpt";
import type { ViewportAdapter } from "../../DocumentAdapter";

export const hvacViewport: ViewportAdapter = {
    getZoom() {
        // `GetZoomFactor()` is a ratio (1 = 100%); `SetZoomLevel()` takes a percentage.
        const zoom = T3Gv.docUtil?.GetZoomFactor?.();
        return Number.isFinite(zoom) ? (zoom as number) : 1;
    },

    setZoom(zoom) {
        T3Gv.docUtil?.SetZoomLevel?.(Math.round(zoom * 100));
    },

    zoomToFit() {
        // The legacy toolbar's "fit": recompute the work area from the current container size.
        T3Gv.docUtil?.UpdateWorkArea?.();
    },

    panBy(dx, dy) {
        T3Gv.docUtil?.AdjustScroll?.(dx, dy);
    },

    get rulers() {
        const docConfig = T3Gv.docUtil?.docConfig;
        if (!docConfig) {
            return undefined;
        }
        return {
            h: !!docConfig.showRulers,
            v: !!docConfig.showRulers,
            set(h: boolean) {
                docConfig.showRulers = h;
                T3Gv.docUtil?.UpdateRulerVisibility?.();
                DataOpt.SaveToLocalStorage?.();
            }
        };
    },

    get grid() {
        const docConfig = T3Gv.docUtil?.docConfig;
        if (!docConfig) {
            return undefined;
        }
        return {
            visible: !!docConfig.showGrid,
            snap: !!docConfig.enableSnap,
            set(visible: boolean, snap: boolean) {
                docConfig.showGrid = visible;
                T3Gv.docUtil?.UpdateGridVisibility?.();
                docConfig.enableSnap = snap;
                DataOpt.SaveToLocalStorage?.();
            }
        };
    }
};
