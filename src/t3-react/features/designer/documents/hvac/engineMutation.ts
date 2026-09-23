/**
 * Designer — the single funnel for HVAC document mutations (P1b).
 *
 * Everything a panel writes goes through here, because the engine needs three things in a specific
 * order and any missed step is invisible until the user notices a missing undo or a stale canvas:
 *
 *   1. `ObjectUtil.GetObjectPtr(id, true)` — the **preserved** block. Cloning a copy aside is what the
 *      engine itself does before it changes an object (`SelectUtil.ts:209`), and it is the only safe
 *      handle to mutate.
 *   2. the mutation.
 *   3. `DrawUtil.CompleteOperation([id], false)` — the engine's canonical "operation finished" call:
 *      repaints (`SvgUtil.RenderDirtySVGObjects`), re-selects, refreshes links/hops and marks the
 *      document dirty, which is what makes the edit persist (`DrawUtil.ts:2351`).
 *
 * ## Undo fidelity (measured, not assumed)
 *
 * A panel edit is recorded in the engine's history exactly like an engine-native edit, but this port's
 * undo stack does **not** give one-history-step-per-operation fidelity: `StateBase` hardcodes
 * `IsOpen = false`, so every `PreserveBlock`/`GetObjectPtr(id, true)` and every `CompleteOperation`
 * pushes its own state, and the pushed records alias the live `Data` (they are not snapshots). Measured
 * with the dev probe: a single edit leaves the pointer 3–4 states above the state that actually holds
 * the old value, so undo needs several presses before anything moves.
 *
 * This is **pre-existing engine behaviour** (the same stack is shared by the legacy HVAC page), not
 * something this funnel introduces — see `docs/t3000/architecture/designer/verification.md`
 * § "Known engine issues: undo fidelity" for the repro and the root cause. Deliberately NOT worked
 * around here: post-operation surgery on `T3Gv.state.states` was tried and reverted, because the
 * engine pushes further states from deferred work right after `CompleteOperation`.
 */
import ObjectUtil from "@/lib/t3-hvac/Opt/Data/ObjectUtil";
import DrawUtil from "@/lib/t3-hvac/Opt/Opt/DrawUtil";
import OptCMUtil from "@/lib/t3-hvac/Opt/Opt/OptCMUtil";
import DSConstant from "@/lib/t3-hvac/Opt/DS/DSConstant";

export interface HvacMutationResult {
    ok: boolean;
    reason?: string;
}

/**
 * Mutates one engine object and commits it as a single, undoable operation.
 *
 * `options.moved` marks the object as moved, exactly as the engine's own geometry
 * operations do - `ToolActUtil.RotateShapes` / `MakeSameSize` / `FlipShapes` all call
 * `OptCMUtil.SetLinkFlag(id, DSConstant.LinkFlags.Move)` before dirtying the object.
 * That flag is what makes hooked objects (ducts, connectors, lines attached to the
 * shape) follow the change; style-only edits do not need it, so it stays opt-in.
 */
export function applyHvacMutation(
    targetId: number,
    mutate: (object: any) => void,
    options?: { moved?: boolean }
): HvacMutationResult {
    if (!Number.isFinite(targetId) || targetId < 0) {
        return { ok: false, reason: "no-selection" };
    }

    try {
        const object = ObjectUtil.GetObjectPtr(targetId, true) as any;
        if (!object) {
            return { ok: false, reason: "object-not-found" };
        }

        mutate(object);

        if (options?.moved) {
            OptCMUtil.SetLinkFlag(targetId, DSConstant.LinkFlags.Move);
        }

        // Mark the object dirty before completing the operation.
        //
        // `CompleteOperation` repaints through `SvgUtil.RenderDirtySVGObjects()`, and that
        // call is wrapped in `if (T3Gv.opt.dirtyList.length !== 0)` - with an empty dirty
        // list it does nothing at all. So without this line the edit reaches the model but
        // never the canvas: the shape keeps its old geometry, while the selection handles
        // are rebuilt unconditionally from `RotationAngle` (`SvgUtil.ts:89`), which is what
        // made a rotation look like it "only rotated the select layer".
        //
        // The engine's own `ToolActUtil.RotateShapes()` marks every object dirty for the
        // same reason, and for a repaint `SvgUtil.AddSVGObject` then applies the rotation
        // about the frame centre (`SvgUtil.ts:266`).
        ObjectUtil.AddToDirtyList(targetId);

        // Repaint + record the operation.
        DrawUtil.CompleteOperation([targetId], false);
        return { ok: true };
    } catch (error) {
        console.error("[Designer] HVAC mutation failed:", error);
        return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
}

/* --------------------------------------------------------------- typed helpers */

/** `Frame.{x,y,width,height}` — the engine's real geometry (there is no `Left`/`Width` property). */
export function setFramePart(
    targetId: number,
    part: "x" | "y" | "width" | "height",
    value: number
): HvacMutationResult {
    if (!Number.isFinite(value)) {
        return { ok: false, reason: "not-a-number" };
    }
    return applyHvacMutation(
        targetId,
        (object) => {
            if (!object.Frame) {
                object.Frame = { x: 0, y: 0, width: 0, height: 0 };
            }
            // Guard against degenerate geometry the renderer cannot draw.
            object.Frame[part] = part === "width" || part === "height" ? Math.max(1, value) : value;
        },
        { moved: true }
    );
}

export function setRotation(targetId: number, degrees: number): HvacMutationResult {
    if (!Number.isFinite(degrees)) {
        return { ok: false, reason: "not-a-number" };
    }
    return applyHvacMutation(
        targetId,
        (object) => {
            object.RotationAngle = ((degrees % 360) + 360) % 360;

            // After a rotation the engine recomputes the shape's derived geometry -
            // `ToolActUtil.RotateShapes` calls `shape.UpdateFrame(shape.Frame)` for exactly
            // this reason, so the stored Frame stays consistent with the drawn angle.
            // Line-like classes have no UpdateFrame (they rotate via their points instead).
            if (typeof object.UpdateFrame === "function") {
                object.UpdateFrame(object.Frame);
            }
        },
        { moved: true }
    );
}

/** `StyleRecord.Fill.Paint.Color` — not `StyleRecord.fillColor` (which does not exist). */
export function setFillColor(targetId: number, color: string): HvacMutationResult {
    return applyHvacMutation(targetId, (object) => {
        const style = object.StyleRecord;
        if (!style?.Fill?.Paint) {
            throw new Error("no fill style");
        }
        style.Fill.Paint.Color = color;
    });
}

/** `StyleRecord.Line.Paint.Color`. */
export function setStrokeColor(targetId: number, color: string): HvacMutationResult {
    return applyHvacMutation(targetId, (object) => {
        const style = object.StyleRecord;
        if (!style?.Line?.Paint) {
            throw new Error("no line style");
        }
        style.Line.Paint.Color = color;
    });
}

/** `StyleRecord.Line.Thickness`. */
export function setStrokeWidth(targetId: number, width: number): HvacMutationResult {
    if (!Number.isFinite(width)) {
        return { ok: false, reason: "not-a-number" };
    }
    return applyHvacMutation(targetId, (object) => {
        const style = object.StyleRecord;
        if (!style?.Line) {
            throw new Error("no line style");
        }
        style.Line.Thickness = Math.max(0, width);
    });
}

/** `StyleRecord.Fill.Paint.Opacity` (0…1). */
export function setFillOpacity(targetId: number, opacity: number): HvacMutationResult {
    if (!Number.isFinite(opacity)) {
        return { ok: false, reason: "not-a-number" };
    }
    return applyHvacMutation(targetId, (object) => {
        const style = object.StyleRecord;
        if (!style?.Fill?.Paint) {
            throw new Error("no fill style");
        }
        style.Fill.Paint.Opacity = Math.min(1, Math.max(0, opacity));
    });
}

/** Text content lives in a separate block reached through `DataID`, not on the object. */
export function setObjectText(targetId: number, text: string): HvacMutationResult {
    const source = ObjectUtil.GetObjectPtr(targetId, false) as any;
    const dataId = source?.DataID;
    if (typeof dataId !== "number" || dataId < 0) {
        return { ok: false, reason: "no-text-block" };
    }
    return applyHvacMutation(targetId, () => {
        const textObject = ObjectUtil.GetObjectPtr(dataId, true) as any;
        if (!textObject) {
            throw new Error("text block not found");
        }
        textObject.runtimeText = text;
    });
}
