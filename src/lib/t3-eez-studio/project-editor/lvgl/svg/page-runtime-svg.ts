/**
 * LVGL 9 SVG renderer — runtime subclasses (P3).
 *
 * ADDITIVE: new file. `lvgl/page-runtime.ts` is **not** modified — the base classes are extended.
 *
 * Subclassing is the safe seam because existing code tests identity with `instanceof` against
 * these classes, and a subclass satisfies every check:
 *   - `lvgl/widget-common.tsx:70`  `runtime instanceof ProjectEditor.LVGLPageEditorRuntimeClass`
 *   - `widgets/Keyboard.tsx:234`   `code.pageRuntime instanceof LVGLPageViewerRuntime`
 *   - the base class itself: `page-runtime.ts:554` (`this instanceof LVGLPageViewerRuntime`) and
 *     `:587` (`this instanceof LVGLNonActivePageViewerRuntime`)
 *
 * The subclasses own exactly one thing: turning a frame into SVG (dump → render → patch). The base
 * still boots WASM, builds the widget tree and drives the requestAnimationFrame loop, which is what
 * keeps layout truth identical to the canvas path.
 *
 * IMPORTANT: this module imports the app's runtime classes, so it must be reached through the
 * `project-editor/...` alias (present in the app build, absent from the stock vitest config). The
 * pure renderer in `svg-renderer.ts` has no such dependency and is unit-tested separately.
 */

import {
    LVGLNonActivePageViewerRuntime,
    LVGLPageEditorRuntime,
} from "project-editor/lvgl/page-runtime";
import type { Page } from "project-editor/features/page/page";
import type { IFlowContext } from "project-editor/flow/flow-interfaces";
import type { Scene } from "./scene";
import { SceneDump, parseSceneDump } from "./scene-dump";
import type { SceneWidgetLookup } from "./scene-dump";
import { renderScene } from "./svg-renderer";
import type { SvgSink } from "./svg-sink";
import { isSceneUnchanged, shouldDumpScene } from "./paint-policy";

/** Everything needed to turn one frame into SVG. */
export interface SvgPipeline {
    sink: SvgSink;
    dumper: SceneDump;
    lookup: SceneWidgetLookup;
    /** Development hook (`?svgStats=1`): called after each patch with the scene and the cost. */
    onPainted?: (scene: Scene, ms: number) => void;
    /**
     * Called when a paint attempt could not produce a scene. The caller decides what to show, but
     * it must be told: an empty design surface is otherwise indistinguishable from an empty page.
     * `paintable` distinguishes "the runtime is not ready yet" from "this will never work".
     */
    onPaintFailed?: (info: SvgPaintFailure) => void;
}

export interface SvgPaintFailure {
    reason: "no-root" | "no-module" | "not-booted" | "no-dump" | "bad-payload";
    /** True when the condition can resolve on its own (boot races). */
    transient: boolean;
    /** Consecutive failed attempts, so callers can debounce before showing anything. */
    attempts: number;
}

/**
 * The paint pipeline shared by both runtime flavours.
 *
 * Design mode only changes when the model changes, while the base runtime blits every animation
 * frame, so the scene is dumped+patched only when dirty or on the first frame after mount / page
 * switch.
 */
class SvgPaintPipeline {
    private pipeline: SvgPipeline | undefined;
    private dirty = true;
    private needsPaint = true;
    /** Consecutive failed attempts; reset by any successful paint. */
    private failures = 0;
    /** When the last polled dump happened — `undefined` until the first paint. */
    private lastPollAt: number | undefined;
    /** The exact bytes last painted, so an unchanged scene never touches the DOM. */
    private lastDumpText: string | undefined;

    constructor(private readonly getRootPtr: () => number | undefined) {}

    attach(pipeline: SvgPipeline | undefined): void {
        this.pipeline = pipeline;
        this.dirty = true;
        this.failures = 0;
        this.lastDumpText = undefined;
        this.lastPollAt = undefined;
    }

    /** The widget model may have changed: repaint on the next frame. */
    markDirty(): void {
        this.dirty = true;
    }

    paint(): void {
        const pipeline = this.pipeline;
        if (!pipeline) {
            return;
        }
        const now = Date.now();
        if (!shouldDumpScene({
            dirty: this.dirty,
            needsPaint: this.needsPaint,
            now,
            lastPollAt: this.lastPollAt,
        })) {
            return;
        }
        this.needsPaint = false;
        this.dirty = false;
        this.lastPollAt = now;

        try {
            // The LVGL screen pointer lives on the page and exists once WASM has booted — the same
            // moment the base class starts blitting.
            const rootPtr = this.getRootPtr();
            if (!rootPtr) {
                this.report(pipeline, "no-root", true);
                return;
            }
            // Why it failed is only diagnosable before the dump is attempted: a missing export and
            // a malformed payload are different problems with different remedies.
            const diagnosis = pipeline.dumper.diagnose();
            if (diagnosis !== "ok") {
                this.report(
                    pipeline,
                    diagnosis,
                    diagnosis === "no-module" || diagnosis === "not-booted"
                );
                return;
            }
            // One dump per paint: the text is compared against the last painted one, and parsed only
            // when it actually differs.
            const dumpText = pipeline.dumper.dump(rootPtr);
            const scene = dumpText
                ? parseSceneDump(dumpText, pipeline.lookup)
                : undefined;
            if (!dumpText || !scene) {
                // Dump unavailable (runtime built without it, or a malformed payload). Leave what is
                // on screen rather than clearing it, and retry on the next dirty frame.
                this.report(pipeline, "bad-payload", false);
                return;
            }
            if (isSceneUnchanged(this.lastDumpText, dumpText)) {
                // Polled, nothing moved: no DOM work at all.
                this.failures = 0;
                return;
            }
            const started = Date.now();
            pipeline.sink.update(renderScene(scene));
            pipeline.sink.clearNotice();
            this.lastDumpText = dumpText;
            this.failures = 0;
            if (pipeline.onPainted) {
                pipeline.onPainted(scene, Date.now() - started);
            }
        } catch {
            // Runs inside the base `tick`'s try block, whose catch is silent, so a failure must not
            // escape here; retry on the next frame instead.
            this.report(pipeline, "bad-payload", false);
        }
    }

    /** Remember that the frame could not be painted and ask for another try next frame. */
    private report(
        pipeline: SvgPipeline,
        reason: SvgPaintFailure["reason"],
        transient: boolean
    ): void {
        this.needsPaint = true;
        this.failures += 1;
        if (pipeline.onPaintFailed) {
            pipeline.onPaintFailed({ reason, transient, attempts: this.failures });
        }
    }
}

function lvglRootPtr(page: Page): number | undefined {
    return (page as unknown as { _lvglObj?: number })._lvglObj;
}

/** Design-time editor runtime that paints the scene as SVG instead of blitting pixels. */
export class LVGLSvgPageEditorRuntime extends LVGLPageEditorRuntime {
    private readonly svgPaint = new SvgPaintPipeline(() => lvglRootPtr(this.page));

    constructor(
        page: Page,
        ctx: CanvasRenderingContext2D,
        flowContext: IFlowContext
    ) {
        super(page, ctx, flowContext);
    }

    attachSvgPipeline(pipeline: SvgPipeline | undefined): void {
        this.svgPaint.attach(pipeline);
    }

    markDirty(): void {
        this.svgPaint.markDirty();
    }

    /** Called by the proxy context when the base runtime completes a frame. */
    paintScene(): void {
        this.svgPaint.paint();
    }
}

/** Non-active page of the same project (rendered off to the side, never focused). */
export class LVGLSvgNonActivePageViewerRuntime extends LVGLNonActivePageViewerRuntime {
    private readonly svgPaint = new SvgPaintPipeline(() => lvglRootPtr(this.page));

    constructor(
        page: Page,
        displayWidth: number,
        displayHeight: number,
        ctx: CanvasRenderingContext2D
    ) {
        super(page, displayWidth, displayHeight, ctx);
    }

    attachSvgPipeline(pipeline: SvgPipeline | undefined): void {
        this.svgPaint.attach(pipeline);
    }

    markDirty(): void {
        this.svgPaint.markDirty();
    }

    paintScene(): void {
        this.svgPaint.paint();
    }
}
