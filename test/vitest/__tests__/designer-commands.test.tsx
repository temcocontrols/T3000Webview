/**
 * Designer — the shared command bus and the viewport commands (P5).
 *
 * The bar itself is one thin renderer; the behaviour worth pinning is here: that a document's commands
 * replace each other by id, that unregistering one batch cannot remove a newer command, that the bar's
 * order is fixed, and that the zoom ladder behaves at both ends — the parts a "unified toolbar" breaks
 * silently.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { Command, ViewportAdapter } from "../../../src/t3-react/features/designer/DocumentAdapter";
import {
    COMMAND_BAR_ORDER,
    commandBus,
    createCommandBus
} from "../../../src/t3-react/features/designer/commands/CommandBus";
import {
    ZOOM_LADDER,
    nextZoom,
    viewportCommands
} from "../../../src/t3-react/features/designer/commands/viewportCommands";
import { ShellCommandBar } from "../../../src/t3-react/features/designer/components/ShellCommandBar";

/** Fluent's `Tooltip`/`Button` use `useLayoutEffect`, which cannot run during static rendering. */
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
    if (String(args[0] ?? "").includes("useLayoutEffect does nothing on the server")) {
        return;
    }
    originalConsoleError(...args);
};

function command(id: string, extra: Partial<Command> = {}): Command {
    return { id, title: id, enabled: () => true, run: () => undefined, ...extra };
}

/**
 * A recorder standing in for an engine.
 *
 * `capabilities` mirrors the adapters: HVAC *has* rulers/grid getters (which may answer `undefined`
 * until the engine is up), LVGL has no such property at all — the difference the command set must see.
 */
function fakeViewport(
    overrides: Partial<ViewportAdapter> = {},
    capabilities: { rulers?: boolean; grid?: boolean } = { rulers: true, grid: true }
) {
    const calls: string[] = [];
    let zoom = 1;
    let rulers = { h: false, v: false };
    let grid = { visible: false, snap: false };
    let rulersReady = true;

    const viewport: ViewportAdapter = {
        getZoom: () => zoom,
        setZoom: (next) => {
            zoom = next;
            calls.push(`setZoom:${next}`);
        },
        zoomToFit: () => calls.push("zoomToFit"),
        panBy: () => calls.push("panBy"),
        ...overrides
    };

    if (capabilities.rulers) {
        Object.defineProperty(viewport, "rulers", {
            get: () =>
                rulersReady
                    ? {
                          ...rulers,
                          set: (h: boolean, v: boolean) => {
                              rulers = { h, v };
                              calls.push(`rulers:${h}`);
                          }
                      }
                    : undefined
        });
    }

    if (capabilities.grid) {
        Object.defineProperty(viewport, "grid", {
            get: () => ({
                ...grid,
                set: (visible: boolean, snap: boolean) => {
                    grid = { visible, snap };
                    calls.push(`grid:${visible}`);
                }
            })
        });
    }

    return {
        viewport,
        calls,
        zoomNow: () => zoom,
        setRulersReady: (ready: boolean) => {
            rulersReady = ready;
        }
    };
}

describe("createCommandBus", () => {
    it("registers, reads back and lists commands", () => {
        const bus = createCommandBus();
        const stop = bus.register([command("save"), command("zoomIn")]);

        expect(bus.get("save")?.title).toBe("save");
        expect(bus.all().map((c) => c.id)).toEqual(["save", "zoomIn"]);

        stop();
        expect(bus.all()).toEqual([]);
        expect(bus.get("save")).toBeUndefined();
    });

    it("lets a later registration win, and an older stop() not remove it", () => {
        const bus = createCommandBus();
        const first = command("save", { title: "first" });
        const second = command("save", { title: "second" });

        const stopFirst = bus.register([first]);
        const stopSecond = bus.register([second]);
        expect(bus.get("save")?.title).toBe("second");

        stopFirst();
        expect(bus.get("save")?.title).toBe("second");

        stopSecond();
        expect(bus.get("save")).toBeUndefined();
    });

    it("notifies subscribers on every change", () => {
        const bus = createCommandBus();
        const seen = vi.fn();
        const unsubscribe = bus.subscribe(seen);

        const stop = bus.register([command("save")]);
        stop();

        expect(seen).toHaveBeenCalledTimes(2);
        unsubscribe();
    });

    it("bumps the revision, so useSyncExternalStore sees a new snapshot", () => {
        const bus = createCommandBus();
        const before = bus.revision();
        bus.register([command("save")]);
        expect(bus.revision()).toBeGreaterThan(before);
    });
});

describe("COMMAND_BAR_ORDER", () => {
    it("puts undo/redo first and keeps the zoom group together", () => {
        expect(COMMAND_BAR_ORDER.slice(0, 3)).toEqual(["undo", "redo", "save"]);
        expect(COMMAND_BAR_ORDER.indexOf("zoomOut")).toBeLessThan(COMMAND_BAR_ORDER.indexOf("zoomFit"));
        expect(COMMAND_BAR_ORDER.indexOf("zoomFit")).toBeLessThan(COMMAND_BAR_ORDER.indexOf("zoomIn"));
    });
});

describe("nextZoom", () => {
    it("steps to the next ladder stop", () => {
        expect(nextZoom(1, 1)).toBe(1.25);
        expect(nextZoom(1, -1)).toBe(0.75);
    });

    it("clamps at both ends", () => {
        expect(nextZoom(ZOOM_LADDER[0], -1)).toBe(ZOOM_LADDER[0]);
        expect(nextZoom(ZOOM_LADDER[ZOOM_LADDER.length - 1], 1)).toBe(ZOOM_LADDER[ZOOM_LADDER.length - 1]);
    });

    it("recovers the neighbouring stop from an off-ladder value", () => {
        expect(nextZoom(1.2, 1)).toBe(1.25);
        expect(nextZoom(1.2, -1)).toBe(1);
    });
});

describe("viewportCommands", () => {
    it("offers the zoom group and nothing else when the adapter has no rulers/grid (LVGL)", () => {
        const { viewport } = fakeViewport({}, { rulers: false, grid: false });
        expect(viewportCommands(viewport).map((c) => c.id)).toEqual([
            "zoomOut",
            "zoomFit",
            "zoomIn",
            "zoomReset"
        ]);
    });

    it("adds rulers and grid when the adapter declares them (HVAC)", () => {
        const { viewport } = fakeViewport();
        expect(viewportCommands(viewport).map((c) => c.id)).toEqual([
            "zoomOut",
            "zoomFit",
            "zoomIn",
            "zoomReset",
            "toggleRulers",
            "toggleGrid"
        ]);
    });

    it("keeps the toggles while the engine is not ready, disabled instead of missing", () => {
        // The HVAC engine answers `undefined` from its getters until it has initialised; treating that
        // as "no rulers" dropped the buttons for the whole session (they are built once, memoised).
        const fake = fakeViewport();
        fake.setRulersReady(false);
        const byId = new Map(viewportCommands(fake.viewport).map((c) => [c.id, c]));

        const rulers = byId.get("toggleRulers")!;
        expect(rulers).toBeDefined();
        expect(rulers.enabled()).toBe(false);
        expect(rulers.checked()).toBe(false);

        // …and become usable as soon as the engine is there.
        fake.setRulersReady(true);
        expect(rulers.enabled()).toBe(true);
        rulers.run();
        expect(rulers.checked()).toBe(true);
    });

    it("drives the adapter: in/out step the ladder, reset returns to 100%", () => {
        const { viewport, zoomNow, calls } = fakeViewport();
        const byId = new Map(viewportCommands(viewport).map((c) => [c.id, c]));

        byId.get("zoomIn")!.run();
        expect(zoomNow()).toBe(1.25);

        byId.get("zoomOut")!.run();
        byId.get("zoomOut")!.run();
        expect(zoomNow()).toBe(0.75);

        byId.get("zoomReset")!.run();
        expect(zoomNow()).toBe(1);

        byId.get("zoomFit")!.run();
        expect(calls).toContain("zoomToFit");
    });

    it("disables zoom in/out at the ends of the ladder", () => {
        const { viewport } = fakeViewport();
        const byId = new Map(viewportCommands(viewport).map((c) => [c.id, c]));

        viewport.setZoom(ZOOM_LADDER[ZOOM_LADDER.length - 1]);
        expect(byId.get("zoomIn")!.enabled()).toBe(false);

        viewport.setZoom(ZOOM_LADDER[0]);
        expect(byId.get("zoomOut")!.enabled()).toBe(false);
    });

    it("reports the current zoom as the label and the toggle state as checked", () => {
        const { viewport } = fakeViewport();
        const byId = new Map(viewportCommands(viewport).map((c) => [c.id, c]));

        viewport.setZoom(2);
        expect(byId.get("zoomIn")!.label!()).toBe("200%");
        expect(byId.get("zoomReset")!.enabled()).toBe(true);

        expect(byId.get("toggleRulers")!.checked!()).toBe(false);
        byId.get("toggleRulers")!.run();
        expect(byId.get("toggleRulers")!.checked!()).toBe(true);
        expect(byId.get("toggleRulers")!.label!()).toBe("Rulers on");
    });
});

describe("ShellCommandBar", () => {
    it("renders nothing while no document has registered commands", () => {
        const markup = renderToStaticMarkup(<ShellCommandBar />);
        expect(markup).toBe("");
    });

    it("draws the spatial commands as buttons, in bar order, with their sampled state", () => {
        const stop = commandBus.register([
            command("zoomIn", { label: () => "100%" }),
            command("save"),
            command("zoomOut", { enabled: () => false, label: () => "100%" })
        ]);

        const markup = renderToStaticMarkup(<ShellCommandBar />);
        stop();

        expect(markup).toContain('aria-label="Document commands"');
        // Order is the bar's, not the registration order.
        expect(markup.indexOf('data-command="save"')).toBeLessThan(markup.indexOf('data-command="zoomOut"'));
        expect(markup.indexOf('data-command="zoomOut"')).toBeLessThan(markup.indexOf('data-command="zoomIn"'));
        // The readout between `−` and `+` is the sampled label of the zoom command.
        expect(markup).toContain('data-shell-zoom-readout="true"');
        expect(markup).toContain("100%");
    });

    it("folds the occasional commands into one labelled View menu instead of more icons", () => {
        const stop = commandBus.register([
            command("toggleGrid", { checked: () => true }),
            command("zoomFit", { title: "Fit to window" }),
            command("zoomReset", { title: "Zoom to 100%" }),
            command("toggleRulers", { title: "Rulers", checked: () => false }),
            command("zoomIn"),
            command("save")
        ]);

        const markup = renderToStaticMarkup(<ShellCommandBar />);
        stop();

        /*
         * The row keeps three buttons and one labelled trigger. Rulers/grid/fit/reset used to be four
         * more icon-only buttons, which is what squeezed the document's name to `Un…` in a 40 px row.
         */
        expect(markup).toContain('data-shell-view="true"');
        expect(markup).toContain("View");
        expect(markup).not.toContain('data-command="zoomFit"');
        expect(markup).not.toContain('data-command="zoomReset"');
        expect(markup).not.toContain('data-command="toggleRulers"');
        expect(markup).not.toContain('data-command="toggleGrid"');
    });
});
