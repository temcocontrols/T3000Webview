/**
 * Designer — the shared command bus (P5).
 *
 * WHY A BUS AND NOT A CONTEXT. The engines live in *other* React roots (EEZ mounts its own root into
 * `#EezStudio_Content`; the HVAC engine is not React at all), so a React context would not cross the
 * boundary. A module-level store does, and it also keeps the API of `interfaces.md` §3.3 — the adapter
 * registers its commands, the shell renders them.
 *
 * The bus is deliberately tiny: it holds the *current* commands and a revision counter. Enabled/label
 * state is NOT stored here — it is read on every render from the command itself (`enabled()`, `label()`),
 * because those answers live in the engines and change without any React update (the shell already
 * polls for that reason, see `useEnginePoll`).
 */
import { useEffect, useMemo, useSyncExternalStore } from "react";

import type { Command } from "../DocumentAdapter";

export interface CommandBus {
    /** Registers a batch; the returned function unregisters exactly that batch. */
    register(commands: Command[]): () => void;
    get(id: string): Command | undefined;
    all(): Command[];
    subscribe(listener: () => void): () => void;
    /** Monotonic counter, so `useSyncExternalStore` gets a stable snapshot. */
    revision(): number;
}

export function createCommandBus(): CommandBus {
    const commands = new Map<string, Command>();
    const listeners = new Set<() => void>();
    let revision = 0;

    const emit = () => {
        revision++;
        listeners.forEach((listener) => listener());
    };

    return {
        register(batch) {
            batch.forEach((command) => commands.set(command.id, command));
            emit();

            return () => {
                // Only remove what this batch still owns: a later registration of the same id wins.
                batch.forEach((command) => {
                    if (commands.get(command.id) === command) {
                        commands.delete(command.id);
                    }
                });
                emit();
            };
        },
        get: (id) => commands.get(id),
        all: () => [...commands.values()],
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        revision: () => revision
    };
}

/** The application's bus. One shell, one bus — the engines are singletons too. */
export const commandBus = createCommandBus();

/**
 * The order the shell's command bar draws in. Ids that are not registered are skipped, so a document
 * simply does not offer them (that is how LVGL has no rulers/grid — `interfaces.md` §4.2).
 *
 * NOTE: `undo`/`redo` are listed but no document registers them today — the shell's own top-bar buttons
 * (`ShellLayout.history`) are the single undo/redo affordance for both engines, and registering them
 * here as well would draw two identical pairs.
 */
export const COMMAND_BAR_ORDER = [
    "undo",
    "redo",
    "save",
    "zoomOut",
    "zoomFit",
    "zoomIn",
    "zoomReset",
    "toggleRulers",
    "toggleGrid"
] as const;

/** Registers `commands` for as long as the component is mounted. Memoise the array. */
export function useRegisterCommands(commands: Command[]): void {
    useEffect(() => commandBus.register(commands), [commands]);
}

/** The commands the bar should draw right now, in `COMMAND_BAR_ORDER`. */
export function useCommandStrip(): Command[] {
    const revision = useSyncExternalStore(commandBus.subscribe, commandBus.revision, commandBus.revision);

    return useMemo(
        () =>
            COMMAND_BAR_ORDER.map((id) => commandBus.get(id)).filter((command): command is Command => !!command),
        // `revision` is the snapshot: any register/unregister produces a new list.
        [revision]
    );
}
