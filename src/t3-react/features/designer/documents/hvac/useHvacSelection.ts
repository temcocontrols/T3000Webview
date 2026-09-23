/**
 * Designer — read the HVAC engine's current selection.
 *
 * The engine has NO event bus (its status values are module-level `let`s and `RefConstant` "refs" are
 * plain `{value}` boxes), so this polls — like every existing consumer does
 * (`TopToolbar.tsx:192`, `T3ContextMenu.tsx:329`, `useStatusMessage.ts:20`).
 *
 * The property surface below is the *verified* one. Notably absent from the engine:
 * `Width`/`Height`/`Left`/`Top`/`Rotation`/`ClassName`/`Text`/`fillColor`/`strokeColor`, and
 * `ShapeType` does not exist on line/connector classes (that is why the engine's own status writes
 * `obj.ShapeType || 'Shape'` — `SelectUtil.ts:211`).
 */
import { useState } from "react";
import T3Gv from "@/lib/t3-hvac/Data/T3Gv";
import SelectUtil from "@/lib/t3-hvac/Opt/Opt/SelectUtil";
import ObjectUtil from "@/lib/t3-hvac/Opt/Data/ObjectUtil";
import NvConstant from "@/lib/t3-hvac/Data/Constant/NvConstant";
import { useEnginePoll } from "../../hooks/useEnginePoll";

export interface HvacSelectionItem {
    id: number;
    /** `ShapeType ?? uniType ?? ("Line" for line-like classes) ?? "Shape"` */
    label: string;
    /** Constructor name — shown only in the raw/debug view. */
    className: string;
    frame?: { x: number; y: number; width: number; height: number };
    rotation?: number;
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWidth?: number;
    linePattern?: number;
    textColor?: string;
    fontSize?: number;
    fontName?: string;
    locked?: boolean;
    hidden?: boolean;
    layer?: number;
    uniqueId?: number;
    text?: string;
}

export interface HvacSelection {
    kind: "none" | "single" | "multi";
    /** The engine's "target" object id (`-1` when nothing is selected). */
    targetId: number;
    items: HvacSelectionItem[];
}

const EMPTY: HvacSelection = { kind: "none", targetId: -1, items: [] };

const num = (value: unknown): number | undefined =>
    typeof value === "number" && Number.isFinite(value) ? value : undefined;

const str = (value: unknown): string | undefined =>
    typeof value === "string" && value.length > 0 ? value : undefined;

/** Reads the text content through `DataID` → `TextObject.runtimeText`. */
function readText(object: any): string | undefined {
    const dataId = num(object?.DataID);
    if (dataId === undefined || dataId < 0) {
        return undefined;
    }
    const textObject = ObjectUtil.GetObjectPtr(dataId, false) as any;
    return str(textObject?.runtimeText);
}

function mapObject(id: number): HvacSelectionItem | undefined {
    const object = ObjectUtil.GetObjectPtr(id, false) as any;
    if (!object) {
        return undefined;
    }

    const frame = object.Frame;
    const style = object.StyleRecord ?? undefined;
    const fill = style?.Fill?.Paint;
    const line = style?.Line;
    const text = style?.Text;
    const hasStart = num(object.StartPoint?.x) !== undefined || num(object.StartPoint?.y) !== undefined;

    const flags = num(object.flags) ?? 0;
    const locked = (flags & NvConstant.ObjFlags.Lock) !== 0;
    const hidden = (flags & NvConstant.ObjFlags.NotVisible) !== 0;

    const label = str(object.ShapeType) ?? str(object.uniType) ?? (hasStart ? "Line" : "Shape");

    return {
        id,
        label: label || "Shape",
        className: object.constructor?.name ?? "Object",
        frame:
            frame && num(frame.width) !== undefined
                ? {
                      x: num(frame.x) ?? 0,
                      y: num(frame.y) ?? 0,
                      width: num(frame.width) ?? 0,
                      height: num(frame.height) ?? 0
                  }
                : undefined,
        rotation: num(object.RotationAngle),
        start: hasStart ? { x: num(object.StartPoint?.x) ?? 0, y: num(object.StartPoint?.y) ?? 0 } : undefined,
        end: num(object.EndPoint?.x) !== undefined ? { x: num(object.EndPoint.x) ?? 0, y: num(object.EndPoint.y) ?? 0 } : undefined,
        fillColor: str(fill?.Color),
        fillOpacity: num(fill?.Opacity),
        strokeColor: str(line?.Paint?.Color),
        strokeWidth: num(line?.Thickness),
        linePattern: num(line?.LinePattern),
        textColor: str(text?.Paint?.Color),
        fontSize: num(text?.FontSize),
        fontName: str(text?.FontName),
        locked,
        hidden,
        layer: num(object.Layer),
        uniqueId: num(object.UniqueID),
        text: readText(object)
    };
}

function readSelection(): HvacSelection {
    try {
        const targetId = SelectUtil.GetTargetSelect();
        const selectionIds = ObjectUtil.GetObjectPtr(T3Gv.opt.selectObjsBlockId, false) as unknown as
            | number[]
            | null;

        const ids = Array.isArray(selectionIds) ? selectionIds.filter((id) => typeof id === "number") : [];
        const effectiveIds = ids.length > 0 ? ids : targetId >= 0 ? [targetId] : [];

        const items = effectiveIds
            .map((id) => mapObject(id))
            .filter((item): item is HvacSelectionItem => !!item);

        if (items.length === 0) {
            return { kind: "none", targetId: -1, items: [] };
        }
        return { kind: items.length === 1 ? "single" : "multi", targetId, items };
    } catch {
        return EMPTY;
    }
}

/** Polls the engine selection. `intervalMs` mirrors the cadence the engine's own UI uses. */
export function useHvacSelection(enabled = true, intervalMs = 250): HvacSelection {
    const [selection, setSelection] = useState<HvacSelection>(EMPTY);

    useEnginePoll(() => {
        const next = readSelection();
        setSelection((previous) => (isSame(previous, next) ? previous : next));
    }, intervalMs, enabled);

    return selection;
}

/** Cheap change detection so the panel does not re-render on every poll tick. */
function isSame(a: HvacSelection, b: HvacSelection): boolean {
    if (a.kind !== b.kind || a.targetId !== b.targetId || a.items.length !== b.items.length) {
        return false;
    }
    for (let index = 0; index < a.items.length; index += 1) {
        const left = a.items[index];
        const right = b.items[index];
        if (left.id !== right.id || left.label !== right.label) {
            return false;
        }
        if (JSON.stringify(left) !== JSON.stringify(right)) {
            return false;
        }
    }
    return true;
}
