/**
 * Designer — the LVGL/EEZ `ViewportAdapter` (`interfaces.md` §4.2).
 *
 * The LVGL surface has no zoom of its own: zoom lives on the *editor*, and EEZ keeps it in two places
 * (`PageZoomButton`, `project-editor/project/ui/Toolbar.tsx:603-620`):
 *
 *  - a **global** zoom (`uiStateStore.globalFlowZoom` + `flowZoom`) that applies to every page, and
 *  - the active page tab's **own** transform (`pageTabState.transform.scale`).
 *
 * The adapter mirrors that logic exactly — including replacing `transform` with a clone rather than
 * mutating it, which is what makes EEZ's canvas re-render (`transform` is a mobx observable).
 *
 * `rulers`/`grid` stay `undefined`: LVGL has neither, and the shell then draws no such buttons
 * (`interfaces.md` §4.2).
 */
import { runInAction } from "mobx";

import { getActiveProject } from "project-editor/activeProject";
import type { ViewportAdapter } from "../../DocumentAdapter";

/** The active page tab's state, when it is a page (it has a transform; other editors do not). */
function pageTabState(): { transform?: { scale: number; clone(): unknown } } | undefined {
    const state = getActiveProject()?.editorsStore?.activeEditor?.state as
        | { transform?: { scale: number; clone(): unknown } }
        | undefined;

    return state && typeof state.transform?.scale === "number" ? state : undefined;
}

function uiState(): { globalFlowZoom?: boolean; flowZoom?: number } | undefined {
    return getActiveProject()?.uiStateStore as
        | { globalFlowZoom?: boolean; flowZoom?: number }
        | undefined;
}

export const eezViewport: ViewportAdapter = {
    getZoom() {
        const ui = uiState();
        if (ui?.globalFlowZoom) {
            return typeof ui.flowZoom === "number" ? ui.flowZoom : 1;
        }
        return pageTabState()?.transform?.scale ?? 1;
    },

    setZoom(zoom) {
        const ui = uiState();

        // EEZ keeps the global value in sync even in per-page mode (`PageZoomButton.zoom` setter).
        if (ui) {
            runInAction(() => {
                ui.flowZoom = zoom;
            });
        }

        const state = pageTabState();
        if (state?.transform && !ui?.globalFlowZoom) {
            const next = state.transform.clone() as { scale: number };
            next.scale = zoom;
            runInAction(() => {
                state.transform = next as never;
            });
        }
    },

    zoomToFit() {
        // The page surface is a fixed-size canvas (`viewBox="0 0 w h"`), so "fit" is 100% with no offset.
        this.setZoom(1);
        const state = pageTabState();
        const translate = (state?.transform as { translate?: { x: number; y: number }; translateBy?: (p: { x: number; y: number }) => void }) ?? undefined;
        if (translate?.translate && translate.translateBy) {
            translate.translateBy({ x: -translate.translate.x, y: -translate.translate.y });
        }
    },

    panBy(dx, dy) {
        const transform = pageTabState()?.transform as
            | { translateBy?: (point: { x: number; y: number }) => void }
            | undefined;
        transform?.translateBy?.({ x: dx, y: dy });
    }
};
