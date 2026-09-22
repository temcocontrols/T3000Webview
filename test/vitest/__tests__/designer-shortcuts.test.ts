/**
 * Designer — shell keyboard shortcuts (P5).
 *
 * These pin the *ownership rule*, which is the whole point of the feature: the shell only takes a key it
 * can actually carry out, and everything else must reach the engines' own bindings untouched. Getting
 * this wrong means a press acts twice (the shell's action plus HVAC's `window.onkeydown`) or an engine
 * shortcut silently dies.
 *
 * The mapping is pure (`resolveShortcut`), so there is no DOM to stand up — a `KeyboardEvent` shape and a
 * stub bus are enough.
 */
import { describe, expect, it, vi } from "vitest";

import type { HistorySpec } from "../../../src/t3-react/features/designer/DocumentAdapter";
import { createCommandBus } from "../../../src/t3-react/features/designer/commands/CommandBus";
import {
    resolveShortcut,
    type ShortcutKeyEvent
} from "../../../src/t3-react/features/designer/hooks/useDesignerShortcuts";

function key(keyName: string, options: Partial<ShortcutKeyEvent> = {}): ShortcutKeyEvent {
    return {
        key: keyName,
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        defaultPrevented: false,
        ...options
    };
}

function history(canUndo = true, canRedo = false): { spec: HistorySpec; undo: any; redo: any } {
    const undo = vi.fn();
    const redo = vi.fn();
    return { spec: { canUndo: () => canUndo, canRedo: () => canRedo, undo, redo }, undo, redo };
}

describe("designer shell shortcuts", () => {
    it("runs the document's own undo/redo for Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y", () => {
        const { spec, undo, redo } = history(true, true);
        const bus = createCommandBus();

        resolveShortcut({ event: key("z"), history: spec, bus })?.();
        resolveShortcut({ event: key("Z", { shiftKey: true }), history: spec, bus })?.();
        resolveShortcut({ event: key("y"), history: spec, bus })?.();

        expect(undo).toHaveBeenCalledTimes(1);
        expect(redo).toHaveBeenCalledTimes(2);
    });

    it("leaves Ctrl+Z alone when the document has nothing to undo", () => {
        const { spec, undo } = history(false, false);
        const bus = createCommandBus();

        expect(resolveShortcut({ event: key("z"), history: spec, bus })).toBeUndefined();
        expect(undo).not.toHaveBeenCalled();
    });

    it("leaves Ctrl+Z alone for a document with no history at all", () => {
        expect(resolveShortcut({ event: key("z"), bus: createCommandBus() })).toBeUndefined();
    });

    it("runs the bus command behind Ctrl+S and the zoom keys", () => {
        const bus = createCommandBus();
        const run = vi.fn();
        const ids = ["save", "zoomIn", "zoomOut", "zoomReset"];

        ids.forEach((id) => bus.register([{ id, title: id, enabled: () => true, run }]));

        resolveShortcut({ event: key("s"), bus })?.();
        resolveShortcut({ event: key("="), bus })?.();
        resolveShortcut({ event: key("-"), bus })?.();
        resolveShortcut({ event: key("0"), bus })?.();

        expect(run).toHaveBeenCalledTimes(4);
    });

    it("leaves a key alone when its command is disabled or absent", () => {
        const bus = createCommandBus();
        const run = vi.fn();
        bus.register([{ id: "zoomReset", title: "zoomReset", enabled: () => false, run }]);

        expect(resolveShortcut({ event: key("0"), bus })).toBeUndefined();
        // No `save` command on the bus: HVAC's own Ctrl+S must therefore survive.
        expect(resolveShortcut({ event: key("s"), bus })).toBeUndefined();
        expect(run).not.toHaveBeenCalled();
    });

    it("never claims a key while typing in a field", () => {
        const { spec, undo } = history();
        const bus = createCommandBus();
        const input = { tagName: "INPUT" } as unknown as EventTarget;
        const area = { tagName: "TEXTAREA" } as unknown as EventTarget;
        const editable = { tagName: "DIV", isContentEditable: true } as unknown as EventTarget;

        for (const target of [input, area, editable]) {
            expect(resolveShortcut({ event: key("z"), target, history: spec, bus })).toBeUndefined();
        }

        // The engines' remaining shortcuts (HVAC's Ctrl+B redo, arrows, …) are not ours either.
        expect(resolveShortcut({ event: key("b"), history: spec, bus })).toBeUndefined();
        expect(resolveShortcut({ event: key("z", { ctrlKey: false }) , history: spec, bus })).toBeUndefined();
        expect(resolveShortcut({ event: key("z", { altKey: true }), history: spec, bus })).toBeUndefined();
        expect(resolveShortcut({ event: key("z", { defaultPrevented: true }), history: spec, bus })).toBeUndefined();
        expect(undo).not.toHaveBeenCalled();
    });
});
