/**
 * Designer — the HVAC document's non-editing commands: history and the viewport.
 *
 * These are the controls the legacy strip kept **inside** the tool row, as group 3 (`History & Save`)
 * and the tail of group 7 (`View & Zoom`). The designer first parked them in the shell's trailing
 * cluster — one copy per command, for every document kind — but the band now mirrors the legacy layout,
 * so the document declares them again and the shell's copies are switched off for HVAC
 * (`TopSpec.shellControls`). Nothing appears twice and nothing is re-implemented:
 *
 *  · the viewport commands are the *same objects* the shell's command strip draws
 *    (`viewportCommands(hvacViewport)`), so zoom/rulers/grid have one implementation;
 *  · the history commands mirror the legacy `TopToolbar`'s handlers (`SaveAct`, `UndoAct`, `RedoAct`,
 *    `ClearAct`) — the same engine entry points, with the same synthetic event.
 *
 * `ShellLayout.history` stays on the HVAC layout even though the buttons moved: that is what
 * `useDesignerShortcuts` reads for `Ctrl+Z` / `Ctrl+Y`, and the shell still needs it to decide whether
 * the key is claimed at all.
 */
import React from "react";
import {
    ArrowRedoRegular,
    ArrowResetRegular,
    ArrowUndoRegular,
    EraserRegular,
    GridFilled,
    GridRegular,
    ResizeImageRegular,
    RulerFilled,
    RulerRegular,
    SaveRegular,
    ZoomInRegular,
    ZoomOutRegular
} from "@fluentui/react-icons";
import T3Gv from "@/lib/t3-hvac/Data/T3Gv";
import EvtOpt from "@/lib/t3-hvac/Event/EvtOpt";
import type { Command, ToolItemSpec } from "../../DocumentAdapter";
import { hvacViewport } from "./hvacViewport";

const toolOpt = EvtOpt.toolOpt;

/** The engine's `ToolOpt` methods take a DOM event; a click from the band has none. */
const noopEvent = { preventDefault: () => {}, stopPropagation: () => {} } as any;

/** An engine call must never take the document down with it. */
function guard(action: () => void): () => void {
    return () => {
        try {
            action();
        } catch (error) {
            console.error("[Designer] HVAC command failed:", error);
        }
    };
}

/** The icon for a command id; a command with no icon still renders, as a label-only item. */
const ICONS: Record<string, React.ReactElement> = {
    undo: <ArrowUndoRegular />,
    save: <SaveRegular />,
    redo: <ArrowRedoRegular />,
    clear: <EraserRegular />,
    zoomOut: <ZoomOutRegular />,
    zoomIn: <ZoomInRegular />,
    zoomFit: <ResizeImageRegular />,
    zoomReset: <ArrowResetRegular />,
    resetScale: <ArrowResetRegular />,
    toggleRulers: <RulerRegular />,
    toggleGrid: <GridRegular />
};

/**
 * The icon shown while a toggle is **on** — the legacy strip's own signal (`RulerFilled`).
 *
 * Deliberately the only signal: these two are view *state*, so they keep the plain look of every other
 * tool instead of the brand tint an armed mode gets (`tone: "state"`).
 */
const CHECKED_ICONS: Record<string, React.ReactElement> = {
    toggleRulers: <RulerFilled />,
    toggleGrid: <GridFilled />
};

/**
 * `Undo · Save · Redo · Clear` — the legacy strip's group 3.
 *
 * `enabled()` reads the engine's undo stack, so the band greys Undo/Redo exactly when the shell's own
 * buttons used to (the band samples getters; see `ShellTopBar`'s live signature).
 */
export function hvacHistoryCommands(): Command[] {
    return [
        {
            id: "undo",
            title: "Undo",
            enabled: () => !!T3Gv?.state?.GetUndoState?.().undo,
            run: guard(() => toolOpt.UndoAct(noopEvent))
        },
        {
            id: "save",
            title: "Save",
            enabled: () => true,
            run: guard(() => toolOpt.SaveAct())
        },
        {
            id: "redo",
            title: "Redo",
            enabled: () => !!T3Gv?.state?.GetUndoState?.().redo,
            run: guard(() => toolOpt.RedoAct(noopEvent))
        },
        {
            id: "clear",
            title: "Clear",
            // The legacy `Clear`: it clears immediately, with no confirmation step.
            enabled: () => true,
            run: guard(() => toolOpt.ClearAct())
        }
    ];
}

/**
 * A bus command as a tool item — same id, same label, same action.
 *
 * `enabled()`/`checked()` become the item's **live** state (`ToolItemSpec.disabled`/`checked` accept
 * getters), which is what lets a group item behave like the shell button it replaced: greyed out, and
 * check-marked when it is a toggle.
 */
export function commandAsToolItem(command: Command): ToolItemSpec {
    return {
        id: command.id,
        label: command.title,
        icon: ICONS[command.id],
        // A command that toggles something is view state, not an armed mode: filled icon, no tint.
        ...(command.checked
            ? {
                  checked: () => !!command.checked?.(),
                  checkedIcon: CHECKED_ICONS[command.id],
                  tone: "state" as const
              }
            : {}),
        disabled: () => !command.enabled(),
        onSelect: () => {
            void command.run();
        }
    };
}

/**
 * The given commands, in the given order, as tool items.
 *
 * Order matters and belongs to the caller: the legacy `View & Zoom` group read
 * `Background · Rulers · Grid · zoom · Reset`, which is not the command bus's own order.
 */
export function commandItems(commands: readonly Command[], ids: readonly string[]): ToolItemSpec[] {
    const byId = new Map(commands.map((command) => [command.id, command]));
    return ids
        .map((id) => byId.get(id))
        .filter((command): command is Command => Boolean(command))
        .map(commandAsToolItem);
}

/**
 * The legacy group 7's `Reset Zoom`.
 *
 * Not the shell's `zoomReset` (which is `setZoom(1)`): the legacy button called `ResetScaleAct`, which
 * also closes any open edit and puts the engine's reference zoom scale back to its configured default —
 * a different action, which is why it has an id of its own.
 */
export function hvacResetZoomCommand(): Command {
    return {
        id: "resetScale",
        title: "Reset Zoom",
        enabled: () => true,
        run: guard(() => toolOpt.ResetScaleAct(noopEvent))
    };
}

/**
 * The legacy group 7's editable zoom box (`− [100] % +`), which `viewportCommands` cannot express: a
 * command is an action, and this is a *value* the user reads and types into.
 *
 * `value()` is a getter, so the box follows a zoom taken anywhere else (the shell's keyboard shortcuts,
 * a Fit) on the band's own poll; `commit()` runs on Enter or blur, and ignores anything that is not a
 * positive number rather than clamping a typo into a zoom level the user did not ask for.
 */
export function hvacZoomField(): ToolItemSpec {
    return {
        id: "zoom",
        label: "Zoom",
        icon: <ZoomInRegular />,
        field: {
            ariaLabel: "Zoom percentage",
            suffix: "%",
            value: () => `${Math.round(hvacViewport.getZoom() * 100)}`,
            commit: (raw) => {
                const percent = Number.parseFloat(raw);
                if (Number.isFinite(percent) && percent > 0) {
                    hvacViewport.setZoom(percent / 100);
                }
            }
        }
    };
}
