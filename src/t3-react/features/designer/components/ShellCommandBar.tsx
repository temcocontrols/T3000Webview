/**
 * Designer — the shell's command bar (P5).
 *
 * Draws the commands registered on the bus, in `COMMAND_BAR_ORDER`. A document that registers nothing
 * gets no bar, which is how the shell stays honest about capabilities it does not have: LVGL has no
 * rulers or grid, so its adapter reports none and no such buttons appear (`interfaces.md` §4.2).
 *
 * The strip is split by *frequency*, not by capability:
 *
 *   · **inline** (`save`, `zoomOut`, `zoomIn`) — spatial or repeated actions, kept as buttons with the
 *     current zoom as a readout between the two zoom steps (the legacy strip's `− 100% +`);
 *   · **`View ▾`** — everything occasional (`zoomFit`, `zoomReset`, `toggleRulers`, `toggleGrid`),
 *     as *labelled* menu entries with their check state.
 *
 * Both halves read the same commands. The reason for the split: eleven icon-only buttons in a 40 px row
 * left the document's name — the only thing that identifies what you are editing — truncated to `Un…`.
 *
 * Enabled/label/checked are read from the commands on every poll because they live in the engines,
 * which React cannot observe — the same reason the shell polls undo/redo (`useEnginePoll`). The state is
 * sampled, so a settled bar causes no re-render.
 */
import React, { useState } from "react";
import {
    Button,
    Menu,
    MenuItem,
    MenuItemCheckbox,
    MenuList,
    MenuPopover,
    MenuTrigger,
    makeStyles,
    tokens,
    Tooltip
} from "@fluentui/react-components";
import {
    ArrowResetRegular,
    ChevronDownRegular,
    GridRegular,
    ResizeImageRegular,
    RulerRegular,
    SaveRegular,
    ZoomInRegular,
    ZoomOutRegular
} from "@fluentui/react-icons";

import type { Command } from "../DocumentAdapter";
import { useCommandStrip } from "../commands/CommandBus";
import { useEnginePoll } from "../hooks/useEnginePoll";
import { CHECKED_VALUE } from "./ShellToolItems";

const useStyles = makeStyles({
    root: {
        display: "flex",
        alignItems: "center",
        gap: "2px",
        paddingLeft: "4px"
        /* Separators are drawn per button so the bar never renders an empty group. */
    },
    separator: {
        width: "1px",
        height: "16px",
        margin: "0 4px",
        backgroundColor: tokens.colorNeutralStroke2
    },
    /** The current zoom, between `−` and `+`: an icon pair with no readout is a guess. */
    zoom: {
        minWidth: "36px",
        textAlign: "center",
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap"
    },
    /** The one labelled button in the cluster, so the occasional commands are not a hidden icon. */
    view: {
        display: "flex",
        alignItems: "center",
        gap: "2px",
        height: "28px",
        padding: "0 6px",
        border: "none",
        borderRadius: "4px",
        backgroundColor: "transparent",
        color: tokens.colorNeutralForeground2,
        fontSize: tokens.fontSizeBase200,
        whiteSpace: "nowrap",
        cursor: "pointer",
        ":hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
            color: tokens.colorNeutralForeground1
        }
    },
    caret: {
        fontSize: "10px",
        marginLeft: "-2px"
    }
});

/** Commands drawn as buttons in the row. Everything else goes into the `View` menu. */
const INLINE_COMMANDS = new Set(["save", "zoomOut", "zoomIn"]);

/** A break goes before the zoom group, so the strip reads `save │ − 100% + │ View ▾`. */
const GROUP_STARTS = new Set(["zoomOut"]);

/** The icon for a command id; unknown ids simply get none. */
const ICONS: Record<string, React.ReactElement> = {
    save: <SaveRegular />,
    zoomOut: <ZoomOutRegular />,
    zoomFit: <ResizeImageRegular />,
    zoomIn: <ZoomInRegular />,
    zoomReset: <ArrowResetRegular />,
    toggleRulers: <RulerRegular />,
    toggleGrid: <GridRegular />
};

interface CommandState {
    id: string;
    enabled: boolean;
    label?: string;
    checked?: boolean;
}

function sameState(a: CommandState[], b: CommandState[]): boolean {
    return (
        a.length === b.length &&
        a.every((entry, index) => {
            const other = b[index];
            return (
                entry.id === other.id &&
                entry.enabled === other.enabled &&
                entry.label === other.label &&
                entry.checked === other.checked
            );
        })
    );
}

function sample(commands: Command[]): CommandState[] {
    return commands.map((command) => ({
        id: command.id,
        enabled: command.enabled(),
        label: command.label?.(),
        checked: command.checked?.()
    }));
}

export const ShellCommandBar: React.FC = () => {
    const styles = useStyles();
    const commands = useCommandStrip();
    const [states, setStates] = useState<CommandState[]>(() => sample(commands));

    useEnginePoll(
        () => {
            const next = sample(commands);
            setStates((previous) => (sameState(previous, next) ? previous : next));
        },
        300,
        commands.length > 0
    );

    if (commands.length === 0) {
        return null;
    }

    const stateOf = (id: string): CommandState =>
        states.find((entry) => entry.id === id) ?? { id, enabled: false };

    const inline = commands.filter((command) => INLINE_COMMANDS.has(command.id));
    const occasional = commands.filter((command) => !INLINE_COMMANDS.has(command.id));
    /** The zoom readout, taken from the same command that zooms — one source, no second poll. */
    const zoomLabel = stateOf("zoomOut").label;
    /** The menu's check state, sampled from the engines (`CHECKED_VALUE`). The engine owns the state,
     *  so the checkmark can never disagree with the rulers that are actually drawn — the poll samples
     *  `checked()` and the menu mirrors it. */
    const checkedValues: Record<string, string[]> = {};
    for (const command of occasional) {
        if (command.checked) {
            checkedValues[command.id] = stateOf(command.id).checked ? [CHECKED_VALUE] : [];
        }
    }

    return (
        <div className={styles.root} role="toolbar" aria-label="Document commands">
            {inline.map((command) => {
                const state = stateOf(command.id);
                const title = state.label ? `${command.title} — ${state.label}` : command.title;

                return (
                    <React.Fragment key={command.id}>
                        {GROUP_STARTS.has(command.id) ? (
                            <span className={styles.separator} aria-hidden="true" />
                        ) : null}
                        <Tooltip content={title} relationship="label">
                            <Button
                                appearance="subtle"
                                size="small"
                                icon={ICONS[command.id]}
                                disabled={!state.enabled}
                                aria-label={command.title}
                                data-command={command.id}
                                onClick={() => {
                                    void command.run();
                                }}
                            />
                        </Tooltip>
                        {command.id === "zoomOut" && zoomLabel ? (
                            <span className={styles.zoom} data-shell-zoom-readout="true">
                                {zoomLabel}
                            </span>
                        ) : null}
                    </React.Fragment>
                );
            })}

            {occasional.length > 0 ? (
                <Menu checkedValues={checkedValues}>
                    <MenuTrigger disableButtonEnhancement>
                        <button
                            type="button"
                            className={styles.view}
                            aria-label="View options"
                            data-shell-view="true"
                        >
                            View
                            <ChevronDownRegular className={styles.caret} />
                        </button>
                    </MenuTrigger>
                    <MenuPopover>
                        <MenuList>
                            {occasional.map((command) => {
                                const state = stateOf(command.id);

                                if (command.checked) {
                                    return (
                                        <MenuItemCheckbox
                                            key={command.id}
                                            name={command.id}
                                            value={CHECKED_VALUE}
                                            disabled={!state.enabled}
                                            onClick={() => {
                                                void command.run();
                                            }}
                                        >
                                            {/* `MenuItemCheckbox` rejects unknown props, so the hook is on the label. */}
                                            <span data-command={command.id}>{command.title}</span>
                                        </MenuItemCheckbox>
                                    );
                                }

                                return (
                                    <MenuItem
                                        key={command.id}
                                        icon={ICONS[command.id]}
                                        data-command={command.id}
                                        disabled={!state.enabled}
                                        onClick={() => {
                                            void command.run();
                                        }}
                                    >
                                        {command.title}
                                    </MenuItem>
                                );
                            })}
                        </MenuList>
                    </MenuPopover>
                </Menu>
            ) : null}
        </div>
    );
};
