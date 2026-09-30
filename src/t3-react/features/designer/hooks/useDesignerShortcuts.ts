/**
 * Designer — the shell's keyboard shortcuts (P5).
 *
 * WHAT THE SHELL OWNS. Three groups, each one mapped onto something the shell already renders, so the
 * key and the click do the same thing:
 *
 * | keys | driven through | the shell's visible affordance |
 * |---|---|---|
 * | `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y` | `ShellLayout.history` | the top bar's Undo/Redo buttons |
 * | `Ctrl+S` | command bus `save` | the command bar |
 * | `Ctrl+0`, `Ctrl+-`, `Ctrl+=` | bus `zoomReset` / `zoomOut` / `zoomIn` | the zoom strip |
 *
 * WHY THE CAPTURE PHASE. Both engines bind their own keys at window level — HVAC through
 * `window.onkeydown = KeyboardOpt.OnKeyDown` (`Ctrl+Z` undo, `Ctrl+B` redo, `Ctrl+S` save), the EEZ
 * editor through its own ctrl-key handling. A bubbling listener would run *in addition* to those, so one
 * press would act twice. Listening in the capture phase and calling `stopPropagation()` stops a claimed
 * key before it reaches them (`window.onkeydown` is a bubble-phase listener on the same node).
 *
 * THE RULE THAT KEEPS THIS ADDITIVE: a key is claimed **only when this shell can carry it out**. No
 * handler, or `enabled()` answering false, and the event is passed through untouched, so the engine's own
 * binding keeps working exactly as it did. That is what leaves HVAC's `Ctrl+S` alone (its document
 * registers no `save` command), HVAC's `Ctrl+B` redo alone, and every other engine shortcut alone.
 *
 * Editable targets (`input`, `textarea`, `select`, `contenteditable`) are never claimed: there `Ctrl+Z`
 * means "undo my typing" and belongs to the browser and to EEZ's inline editors.
 *
 * The decision itself is a pure function (`resolveShortcut`) so it can be tested without rendering — the
 * repo has no DOM-testing library, and the effect below is only three lines of plumbing.
 */
import { useEffect } from "react";

import type { Command, HistorySpec, ShellLayout } from "../DocumentAdapter";
import { commandBus, type CommandBus } from "../commands/CommandBus";

/** The parts of a `KeyboardEvent` the mapping looks at. */
export interface ShortcutKeyEvent {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    defaultPrevented: boolean;
}

/** Ctrl everywhere, Cmd on macOS — the engines only know Ctrl, so accepting either is a superset. */
function isPrimaryModifier(event: ShortcutKeyEvent): boolean {
    return event.ctrlKey || event.metaKey;
}

function isEditableTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    if (!element || typeof element.tagName !== "string") return false;

    const tag = element.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || element.isContentEditable === true;
}

export interface ShortcutContext {
    event: ShortcutKeyEvent;
    /** What the event was aimed at; an editable element means "not ours". */
    target?: EventTarget | null;
    history?: HistorySpec;
    bus: CommandBus;
}

/**
 * What this key press should do: a function to run, or `undefined` to leave the event completely alone
 * (the engine's own binding then handles it, exactly as before this hook existed).
 */
export function resolveShortcut({ event, target, history, bus }: ShortcutContext): (() => void) | undefined {
    if (event.defaultPrevented || event.altKey || !isPrimaryModifier(event)) return undefined;
    if (isEditableTarget(target ?? null)) return undefined;

    // A document without `history` has nothing to offer here — leave the key to the engine.
    const undo = history && (history.canUndo ? history.canUndo() : true) ? history.undo : undefined;
    const redo = history && (history.canRedo ? history.canRedo() : true) ? history.redo : undefined;

    const command = (id: string): (() => void) | undefined => {
        const found: Command | undefined = bus.get(id);
        return found && found.enabled() ? () => void found.run() : undefined;
    };

    const { key } = event;
    if (key === "z" || key === "Z") return event.shiftKey ? redo : undo;
    if (key === "y" || key === "Y") return redo;
    if (key === "s" || key === "S") return command("save");
    if (key === "0") return command("zoomReset");
    if (key === "-" || key === "_") return command("zoomOut");
    if (key === "=" || key === "+") return command("zoomIn");

    return undefined;
}

export interface DesignerShortcutOptions {
    /** The bus to read the document's commands from; the app-wide one by default. */
    bus?: CommandBus;
    /** `false` leaves the keyboard entirely to the documents. */
    enabled?: boolean;
}

export function useDesignerShortcuts(
    layout: ShellLayout,
    options: DesignerShortcutOptions = {}
): void {
    const { bus = commandBus, enabled = true } = options;

    useEffect(() => {
        if (!enabled) return;

        const { history } = layout;

        // A document without `history` has nothing to offer undo/redo — leave the key to the engine.
        const undo = history && (history.canUndo ? history.canUndo() : true) ? history.undo : undefined;
        const redo = history && (history.canRedo ? history.canRedo() : true) ? history.redo : undefined;

        const command = (id: string): (() => void) | undefined => {
            const found: Command | undefined = bus.get(id);
            return found && found.enabled() ? () => void found.run() : undefined;
        };

        const onKeyDown = (event: KeyboardEvent) => {
            const claim = resolveShortcut({ event, target: event.target, history: layout.history, bus });

            // Not ours (or nothing to do): the event continues to the engine's own binding.
            if (!claim) return;

            event.preventDefault();
            event.stopPropagation();
            claim();
        };

        window.addEventListener("keydown", onKeyDown, true);
        return () => window.removeEventListener("keydown", onKeyDown, true);
    }, [layout, bus, enabled]);
}
