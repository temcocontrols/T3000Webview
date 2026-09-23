/**
 * Designer — the app-layer record for a newly drawn shape, created the way the legacy flow created it.
 *
 * The engine registers that record in its **completion** step, not when the shape is added:
 *
 * | how the shape was placed | completion | registration |
 * |---|---|---|
 * | stamped (Box, G_Rectangle, Oval, G_Circle, Text, arrows) | `DrawUtil.MouseStampObjectDone` | `QuasarUtil.AddCurrentObjectToAppState()` (`DrawUtil.ts:588`) |
 * | dropped (library tools: Fan, coils, pumps, valves, Wall, Icon, …) | `DrawUtil.DragDropObjectDone` | `QuasarUtil.AddCurrentObjectToAppState()` (`DrawUtil.ts:1386`) |
 *
 * `ToolsPanel` dispatches exactly those two ways (`toolOpt.StampShapeFromToolAct` vs `toolOpt.LibToolShape`,
 * which is a symbol drag). If a tool is placed **without** that completion running — the library tools, when
 * the palette click is used instead of a drop — the shape lands with no record at all. The record is where the
 * T3000 link lives (`item.t3Entry`) and what the properties panel reads its Data and Widget sections from, so
 * the panel has nothing to show for such a shape and the old panel would have shown nothing either.
 *
 * Rather than asking the user to repair it by hand, this hook finishes the job the completion would have done:
 * the first time a shape without a record is selected, it is registered through the engine's own call, and the
 * app-layer index is re-pointed at it. Nothing is invented — same call, same order, no document edit.
 *
 * Two deliberate limits:
 *   - only **widget tools** (a `uniType` present in the engine's `NewTool` catalogue) are registered, so a
 *     drawing-only shape that a document never meant to be a widget does not silently gain one;
 *   - a shape that already has a record is never registered twice (`GetItemFromAPSV2` is the engine's own
 *     lookup); the index is only re-pointed when it points somewhere else.
 */
import SelectUtil from "@/lib/t3-hvac/Opt/Opt/SelectUtil";
import ObjectUtil from "@/lib/t3-hvac/Opt/Data/ObjectUtil";
import QuasarUtil from "@/lib/t3-hvac/Opt/Quasar/QuasarUtil";
import { appStateV2 } from "@/lib/t3-hvac/Data/T3Data";
import { NewTool } from "@/lib/t3-hvac";
import { useEnginePoll } from "../../hooks/useEnginePoll";

/** `uniType` as the engine's catalogue names the tool (`Fan`, `Gauge`, `Value`, …). */
function isWidgetTool(uniType: unknown): boolean {
    if (typeof uniType !== "string" || uniType.length === 0) {
        return false;
    }
    return (NewTool as any[])?.some((tool) => tool?.name === uniType) === true;
}

/** 250 ms: the same cadence as the panel's own selection poll, so the record lands with the first panel read. */
export function useHvacAutoRecord(enabled = true, intervalMs = 250): void {
    useEnginePoll(
        () => {
            try {
                const targetId = SelectUtil.GetTargetSelect();
                if (targetId < 0) {
                    return;
                }
                const object: any = ObjectUtil.GetObjectPtr(targetId, false);
                const uniqueId = object?.uniqueId;
                if (typeof uniqueId !== "string" || uniqueId.length === 0) {
                    return;
                }

                if (!QuasarUtil.GetItemFromAPSV2(uniqueId)) {
                    if (!isWidgetTool(object.uniType)) {
                        return;
                    }
                    QuasarUtil.AddCurrentObjectToAppState();
                    /*
                     * `AddCurrentObjectToAppState` itself indexes the new record through
                     * `SetAppStateV2SelectIndex(tool)`, whose lookup compares an item's `uniqueId` — a shape UUID
                     * (`S.BaseDrawObject.ts:322`) — against the **tool name**, so the index lands on -1 and the
                     * panel would still see no item. Point it at the shape instead, as the engine does on every
                     * selection change (`EvtUtil.ts:601`).
                     */
                    QuasarUtil.SetAppStateV2SelectIndex(null);
                    return;
                }

                /* The record exists: only make sure the panel is pointed at *this* shape's item. */
                const state: any = (appStateV2 as any)?.value;
                const index = state?.activeItemIndex;
                const pointed = typeof index === "number" && index >= 0 ? state?.items?.[index] : null;
                if (pointed?.uniqueId !== uniqueId) {
                    QuasarUtil.SetAppStateV2SelectIndex(null);
                }
            } catch {
                /* A repair pass must never break the editor. */
            }
        },
        intervalMs,
        enabled
    );
}
