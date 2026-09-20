/**
 * Designer — viewport commands (P5).
 *
 * One factory, used by both documents: it turns a `ViewportAdapter` (`interfaces.md` §4) into the
 * `zoomOut zoomFit zoomIn zoomReset [toggleRulers] [toggleGrid]` commands the shell's command bar draws.
 * That is what makes the two engines behave identically: the buttons are the same code, only the
 * adapter behind them differs.
 *
 * The ladder is shared on purpose. Each engine used to step differently (HVAC: ±10 percentage points;
 * EEZ: a fixed list of scales), so the same click meant a different zoom depending on the document.
 */
import type { Command, ViewportAdapter } from "../DocumentAdapter";

/** Zoom ladder for both engines; 1 = 100%. */
export const ZOOM_LADDER = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 6, 8, 10, 16];

/** The next ladder stop in `direction`, or the current value when already at the end. */
export function nextZoom(current: number, direction: 1 | -1): number {
    const tolerance = 0.001;

    if (direction === 1) {
        return ZOOM_LADDER.find((step) => step > current + tolerance) ?? ZOOM_LADDER[ZOOM_LADDER.length - 1];
    }

    const lower = ZOOM_LADDER.filter((step) => step < current - tolerance);
    return lower.length ? lower[lower.length - 1] : ZOOM_LADDER[0];
}

const asPercent = (zoom: number): string => `${Math.round(zoom * 100)}%`;

/** The zoom/grid commands for one adapter. Omitted capabilities produce no commands at all. */
export function viewportCommands(viewport: ViewportAdapter): Command[] {
    const commands: Command[] = [
        {
            id: "zoomOut",
            title: "Zoom out",
            enabled: () => viewport.getZoom() > ZOOM_LADDER[0] + 0.001,
            label: () => asPercent(viewport.getZoom()),
            run: () => viewport.setZoom(nextZoom(viewport.getZoom(), -1))
        },
        {
            id: "zoomFit",
            title: "Fit to window",
            enabled: () => true,
            run: () => viewport.zoomToFit()
        },
        {
            id: "zoomIn",
            title: "Zoom in",
            enabled: () => viewport.getZoom() < ZOOM_LADDER[ZOOM_LADDER.length - 1] - 0.001,
            label: () => asPercent(viewport.getZoom()),
            run: () => viewport.setZoom(nextZoom(viewport.getZoom(), 1))
        },
        {
            id: "zoomReset",
            title: "Zoom to 100%",
            enabled: () => Math.abs(viewport.getZoom() - 1) > 0.001,
            run: () => viewport.setZoom(1)
        }
    ];

    /*
     * Capability is decided by the *presence of the property*, never by its value: the adapters answer
     * with getters, and "engine not initialised yet" must not be mistaken for "this engine has no
     * rulers". That mistake is invisible until the engine comes up late — which for HVAC it does, and
     * the toggles simply never appeared (measured: 4 commands instead of 6). State is therefore read at
     * call time and a not-yet-ready engine just disables the button.
     */
    if ("rulers" in viewport) {
        commands.push({
            id: "toggleRulers",
            title: "Rulers",
            enabled: () => !!viewport.rulers,
            checked: () => !!viewport.rulers?.h,
            label: () => (viewport.rulers?.h ? "Rulers on" : "Rulers off"),
            run: () => {
                const rulers = viewport.rulers;
                if (rulers) {
                    const next = !rulers.h;
                    rulers.set(next, next);
                }
            }
        });
    }

    if ("grid" in viewport) {
        commands.push({
            id: "toggleGrid",
            title: "Grid",
            enabled: () => !!viewport.grid,
            checked: () => !!viewport.grid?.visible,
            label: () => (viewport.grid?.visible ? "Grid on" : "Grid off"),
            run: () => {
                const grid = viewport.grid;
                if (grid) {
                    grid.set(!grid.visible, grid.snap);
                }
            }
        });
    }

    return commands;
}
