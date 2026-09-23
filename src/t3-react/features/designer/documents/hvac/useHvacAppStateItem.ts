/**
 * Designer — the app-layer ("appStateV2") twin of the current HVAC selection.
 *
 * The properties panel edits two different objects for the same shape:
 *   - the engine object (`ObjectUtil.GetObjectPtr`) — geometry and paint (`useHvacSelection.ts`);
 *   - the app-layer item (`appStateV2.items[activeItemIndex]`) — `type`, the `settings` bag and the
 *     linked T3000 `t3Entry`.
 *
 * The legacy Vue panel (`ObjectConfigNew.vue`) edits *this* one (`item.settings.t3EntryDisplayField`,
 * `item.t3Entry.control`, ...), so the React panel must read the same item to offer the same controls
 * and to hand the very same object to the engine calls (`Hvac.IdxPageReact.T3UpdateEntryField`).
 *
 * `activeItemIndex` is maintained by the engine on create/select. The item is only trusted when its
 * `uniqueId` matches the selected engine object — a stale index would otherwise let the panel write a
 * different widget's T3000 entry.
 */
import { useState } from "react";
import SelectUtil from "@/lib/t3-hvac/Opt/Opt/SelectUtil";
import ObjectUtil from "@/lib/t3-hvac/Opt/Data/ObjectUtil";
import { appStateV2 } from "@/lib/t3-hvac/Data/T3Data";
import { useEnginePoll } from "../../hooks/useEnginePoll";

export interface HvacAppStateItem {
    /**
     * The **live** app-layer object (`appStateV2.items[i]`).
     *
     * Kept because the engine calls take this exact object, not a copy:
     * `Hvac.IdxPageReact.T3UpdateEntryField(field, item)` reads `item.t3Entry[field]` and pushes it to the
     * device, `IdxUtils.refreshObjectStatus(item)` rewrites `item.active`, and `item.settings.*` is the bag
     * the current object renderer reads back.
     */
    raw: any;
    /** Widget kind as the app layer names it (`Rect`, `Value`, `Icon`, `Gauge`, ...). */
    type: string;
    /**
     * **Snapshot** of the per-widget settings bag — also the home of `t3EntryDisplayField`.
     *
     * A snapshot, not the live object: the poll compares successive values by JSON, and comparing a live object
     * with itself is always equal. With the live bag returned here, no settings change ever re-rendered the
     * panel — choosing a display field wrote to the item but the control kept showing the previous choice. Write
     * through `raw.settings` instead.
     */
    settings: Record<string, any>;
    /** **Snapshot** of the linked T3000 entry (live values), or `null` while unlinked. */
    t3Entry: Record<string, any> | null;
}

/** Plain copy so two polls can be compared by value (`structuredClone`, with a shallow fallback). */
function snapshot<T>(value: T): T {
    try {
        return JSON.parse(JSON.stringify(value)) as T;
    } catch {
        return value;
    }
}

function readItem(): HvacAppStateItem | null {
    try {
        const state: any = (appStateV2 as any)?.value;
        const index = state?.activeItemIndex;
        if (typeof index !== "number" || index < 0) {
            return null;
        }

        const item = state?.items?.[index];
        if (!item) {
            return null;
        }

        const targetId = SelectUtil.GetTargetSelect();
        const object: any = targetId >= 0 ? ObjectUtil.GetObjectPtr(targetId, false) : null;
        const objectUid = object?.uniqueId;
        if (objectUid !== undefined && item.uniqueId !== undefined && objectUid !== item.uniqueId) {
            return null;
        }

        return {
            raw: item,
            type: String(item.type ?? ""),
            settings: snapshot(item.settings ?? {}),
            t3Entry: item.t3Entry ? snapshot(item.t3Entry) : null
        };
    } catch {
        return null;
    }
}

/**
 * Value comparison — only meaningful because `readItem` returns **snapshots**. With live references both sides
 * of each `JSON.stringify` would be the same object, the function would always answer "unchanged", and the panel
 * would freeze on its first sample.
 */
function isSameItem(a: HvacAppStateItem | null, b: HvacAppStateItem | null): boolean {
    if (a === b) {
        return true;
    }
    if (!a || !b || a.type !== b.type) {
        return false;
    }
    return (
        JSON.stringify(a.settings) === JSON.stringify(b.settings) &&
        JSON.stringify(a.t3Entry) === JSON.stringify(b.t3Entry)
    );
}

/** Polls the app-layer item behind the current selection. `null` when there is nothing to edit. */
export function useHvacAppStateItem(enabled = true, intervalMs = 250): HvacAppStateItem | null {
    const [item, setItem] = useState<HvacAppStateItem | null>(null);

    useEnginePoll(
        () => {
            const next = readItem();
            setItem((previous) => (isSameItem(previous, next) ? previous : next));
        },
        intervalMs,
        enabled
    );

    return item;
}
