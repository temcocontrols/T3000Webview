/**
 * Designer — the top area's tool items.
 *
 * The same `ToolItemSpec` is drawn twice in two different situations, and that is the whole point of
 * describing tools as data (`DocumentAdapter.ts`):
 *
 *   · **inline** — a button with `icon + label` in the top area's single row;
 *   · **folded** — a menu entry in the `⋯` overflow, when the row cannot fit that group.
 *
 * So this module owns both renderings, and the shell only decides *how many* groups are inline. A tool
 * that opens a submenu (HVAC's `Rotate`, `Align`, …) becomes a dropdown inline and a nested submenu
 * when folded, which keeps its children reachable without ever putting a second row in the page.
 */
import React, { useEffect, useRef } from "react";
import {
    Menu,
    MenuItem,
    MenuItemCheckbox,
    MenuList,
    MenuPopover,
    MenuTrigger,
    Tooltip,
    makeStyles,
    tokens
} from "@fluentui/react-components";
import { ChevronDownRegular } from "@fluentui/react-icons";
import type { ToolGroupSpec, ToolItemSpec } from "../DocumentAdapter";

const useStyles = makeStyles({
    /**
     * One group, shaped the way the legacy strip drew it: a **column of up to two item-rows**.
     *
     * The two rows are why a group is about half as wide as a single-row one, which is what lets the
     * whole legacy set sit in one band — and why the 1 px rule that ends the group can run the band's
     * full height, exactly like the old bar's dividers.
     */
    group: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "2px",
        flexShrink: 0,
        height: "100%"
    },
    /** One item-row inside a group. */
    row: {
        display: "flex",
        alignItems: "center",
        gap: "2px"
    },
    item: {
        display: "flex",
        alignItems: "center",
        gap: "5px",
        height: "28px",
        padding: "0 6px",
        border: "none",
        borderRadius: "4px",
        backgroundColor: "transparent",
        color: tokens.colorNeutralForeground2,
        fontSize: tokens.fontSizeBase200,
        whiteSpace: "nowrap",
        cursor: "pointer",
        ":hover:not(:disabled)": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
            color: tokens.colorNeutralForeground1
        },
        ":active:not(:disabled)": {
            backgroundColor: tokens.colorNeutralBackground1Pressed
        },
        ":disabled": {
            color: tokens.colorNeutralForegroundDisabled,
            cursor: "default"
        }
    },
    /** A toggled tool (a "stamp" mode) — the only place the brand colour is used in this row. */
    checked: {
        backgroundColor: tokens.colorBrandBackground2,
        color: tokens.colorBrandForeground2,
        ":hover:not(:disabled)": {
            backgroundColor: tokens.colorBrandBackground2Hover,
            color: tokens.colorBrandForeground2
        }
    },
    caret: {
        fontSize: "10px",
        marginLeft: "-2px"
    },
    /**
     * The rule between two groups: the band's **full height** (`alignSelf: stretch`, the legacy
     * `divider`) rather than the 16 px tick a single-line row used.
     */
    divider: {
        width: "1px",
        alignSelf: "stretch",
        flexShrink: 0,
        margin: "0 3px",
        backgroundColor: tokens.colorNeutralStroke1
    },
    /** The legacy zoom box: a small centred number field with its unit after it. */
    field: {
        display: "inline-flex",
        alignItems: "center",
        gap: "2px",
        padding: "0 2px"
    },
    fieldInput: {
        width: "46px",
        height: "22px",
        padding: "0 2px",
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        borderRadius: "2px",
        backgroundColor: tokens.colorNeutralBackground1,
        color: tokens.colorNeutralForeground1,
        fontSize: "11px",
        textAlign: "center",
        outline: "none",
        ":focus": {
            border: `1px solid ${tokens.colorBrandStroke1}`
        }
    },
    fieldSuffix: {
        fontSize: "11px",
        color: tokens.colorNeutralForeground3
    }
});

/**
 * The inline field an item may carry (the legacy `[100] %`).
 *
 * Uncontrolled on purpose: the shell re-renders it from the engine on every poll, and a controlled
 * input would fight the user's typing. The value is therefore pushed in only while the field does not
 * have focus — type freely, and the display resyncs the moment you leave it.
 */
const InlineField: React.FC<{ item: ToolItemSpec }> = ({ item }) => {
    const styles = useStyles();
    const field = item.field!;
    const inputRef = useRef<HTMLInputElement>(null);
    const value = field.value();

    useEffect(() => {
        const input = inputRef.current;
        if (input && document.activeElement !== input) {
            input.value = value;
        }
    }, [value]);

    return (
        <span className={styles.field} data-tool-field={item.id}>
            <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                className={styles.fieldInput}
                defaultValue={value}
                aria-label={field.ariaLabel}
                readOnly={!field.commit}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.currentTarget.blur();
                    }
                }}
                onBlur={(event) => field.commit?.(event.currentTarget.value)}
            />
            {field.suffix ? <span className={styles.fieldSuffix}>{field.suffix}</span> : null}
        </span>
    );
};

const Divider: React.FC = () => {
    const styles = useStyles();
    return <span className={styles.divider} aria-hidden="true" />;
};

/**
 * The `value` a checked item reports when it is on.
 *
 * Fluent keeps check state on the **menu**, not on the item: `MenuItemCheckbox` takes only `name` and
 * `value` and reads its checkmark from the parent's `checkedValues` (`Record<name, value[]>`). Every
 * `Menu` in this module therefore has to be told which of its items are on.
 */
export const CHECKED_VALUE = "on";

/** Items may declare engine-owned state as getters; these resolve them at render time. */
export function toolDisabled(item: ToolItemSpec): boolean {
    return typeof item.disabled === "function" ? item.disabled() : !!item.disabled;
}

export function toolChecked(item: ToolItemSpec): boolean {
    return typeof item.checked === "function" ? !!item.checked() : !!item.checked;
}

/** Declaring `checked` at all is what makes an item a toggle, whatever form it takes. */
export function toolIsToggle(item: ToolItemSpec): boolean {
    return item.checked !== undefined;
}

/** The icon to draw for the item's current state: the `checkedIcon` while it is on. */
export function toolIcon(item: ToolItemSpec): React.ReactElement | undefined {
    return toolChecked(item) && item.checkedIcon ? item.checkedIcon : item.icon;
}

/**
 * True when the item should be **tinted** as "on".
 *
 * Only an armed *mode* is tinted. A view state (rulers, grid) is not: it swaps its icon instead, so it
 * keeps looking like every other tool in the row — the legacy strip's own treatment of the two.
 */
export function toolTinted(item: ToolItemSpec): boolean {
    return toolChecked(item) && item.tone !== "state";
}

/** The `checkedValues` map for one level of items — nested levels live in their own `Menu`. */
export function checkedValuesOf(items: ToolItemSpec[]): Record<string, string[]> {
    const values: Record<string, string[]> = {};

    for (const item of items) {
        if (toolIsToggle(item)) {
            values[item.id] = toolChecked(item) ? [CHECKED_VALUE] : [];
        }
    }
    return values;
}

/* ------------------------------------------------------------------ inline */

const InlineItem: React.FC<{ item: ToolItemSpec }> = ({ item }) => {
    const styles = useStyles();

    if (item.field) {
        return <InlineField item={item} />;
    }

    if (item.children?.length) {
        return (
            <Menu checkedValues={checkedValuesOf(item.children)}>
                <MenuTrigger disableButtonEnhancement>
                    <button
                        type="button"
                        className={styles.item}
                        disabled={toolDisabled(item)}
                        aria-label={item.label}
                        title={item.label}
                    >
                        {toolIcon(item)}
                        <span>{item.label}</span>
                        <ChevronDownRegular className={styles.caret} />
                    </button>
                </MenuTrigger>
                <MenuPopover>
                    <MenuList>
                        {item.children.map((child) => (
                            <MenuEntry key={child.id} item={child} />
                        ))}
                    </MenuList>
                </MenuPopover>
            </Menu>
        );
    }

    return (
        <Tooltip content={item.label} relationship="description">
            <button
                type="button"
                className={`${styles.item}${toolTinted(item) ? ` ${styles.checked}` : ""}`}
                disabled={toolDisabled(item)}
                aria-label={item.label}
                aria-pressed={toolIsToggle(item) ? toolChecked(item) : undefined}
                onClick={item.onSelect}
            >
                {toolIcon(item)}
                <span>{item.label}</span>
            </button>
        </Tooltip>
    );
};

/**
 * One group, inline: its items as up to two rows, the first half above the second — the legacy strip's
 * reading order (`Select · Lock` / `Select All · Unlock`), not a column-major one.
 *
 * `data-tool-group` is the hook the shell measures and lays out on.
 */
export const ToolGroupInline: React.FC<{ group: ToolGroupSpec; groupRef?: (el: HTMLDivElement | null) => void }> = ({
    group,
    groupRef
}) => {
    const styles = useStyles();
    const half = Math.ceil(group.items.length / 2);
    const rows = [group.items.slice(0, half), group.items.slice(half)];

    return (
        <div className={styles.group} data-tool-group={group.id} ref={groupRef}>
            {rows.map((items, rowIndex) =>
                items.length === 0 ? null : (
                    <div className={styles.row} key={rowIndex} data-tool-row={rowIndex}>
                        {items.map((item, index) => (
                            <React.Fragment key={item.id}>
                                {item.separatorBefore && index > 0 ? <Divider /> : null}
                                <InlineItem item={item} />
                            </React.Fragment>
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

/** The rule between two groups — drawn by the shell, which knows the order. */
export const ToolGroupDivider: React.FC = () => <Divider />;

/* ------------------------------------------------------------------ folded (menu) */

/**
 * One tool as a menu entry. A submenu parent renders as a nested `Menu`, so a folded group keeps its
 * internal structure instead of being flattened into an ambiguous list.
 */
export const MenuEntry: React.FC<{ item: ToolItemSpec }> = ({ item }) => {
    if (item.field) {
        // A field cannot be a menu entry, but its value must not vanish with the group: read it here.
        return (
            <MenuItem disabled icon={item.icon}>
                {`${item.label}: ${item.field.value()}${item.field.suffix ?? ""}`}
            </MenuItem>
        );
    }

    if (item.children?.length) {
        return (
            <Menu checkedValues={checkedValuesOf(item.children)}>
                <MenuTrigger disableButtonEnhancement>
                    <MenuItem icon={item.icon} disabled={toolDisabled(item)}>
                        {item.label}
                    </MenuItem>
                </MenuTrigger>
                <MenuPopover>
                    <MenuList>
                        {item.children.map((child) => (
                            <MenuEntry key={child.id} item={child} />
                        ))}
                    </MenuList>
                </MenuPopover>
            </Menu>
        );
    }

    if (toolIsToggle(item)) {
        return (
            <MenuItemCheckbox
                icon={toolIcon(item)}
                name={item.id}
                value={CHECKED_VALUE}
                disabled={toolDisabled(item)}
                onClick={item.onSelect}
            >
                {item.label}
            </MenuItemCheckbox>
        );
    }

    return (
        <MenuItem icon={item.icon} disabled={toolDisabled(item)} onClick={item.onSelect}>
            {item.label}
        </MenuItem>
    );
};

/** A whole group as a submenu — how a group that does not fit the row is still reachable. */
export const ToolGroupSubmenu: React.FC<{ group: ToolGroupSpec }> = ({ group }) => (
    <Menu checkedValues={checkedValuesOf(group.items)}>
        <MenuTrigger disableButtonEnhancement>
            <MenuItem>{group.label}</MenuItem>
        </MenuTrigger>
        <MenuPopover>
            <MenuList>
                {group.items.map((item) => (
                    <MenuEntry key={item.id} item={item} />
                ))}
            </MenuList>
        </MenuPopover>
    </Menu>
);
