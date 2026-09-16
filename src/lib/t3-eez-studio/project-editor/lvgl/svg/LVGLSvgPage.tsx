/**
 * LVGL 9 SVG renderer — React host (P3).
 *
 * ADDITIVE: new file. Mirrors `lvgl/Page.tsx` (same props, same lifecycle, same visual
 * decorations) so it is a drop-in alternative selected by the feature flag.
 *
 * Shape matters: `LVGLPage` is an `observer` class component with `static contextType =
 * ProjectContext` that reads observables in `render()` and branches on `this.context.runtime`.
 * A thin function component would silently lose all three, so this mirrors that structure.
 *
 * The DOM contract is in docs/t3000/architecture/lvgl-svg/rendering.md §3: `<defs>`, `#content` and
 * `#overlay` are created and owned imperatively by `SvgSink` (not by JSX), so React never fights the
 * patcher over children it did not render.
 */

import React from "react";
import { autorun } from "mobx";
import { observer } from "mobx-react";

import { ProjectContext } from "project-editor/project/context";
import type { Page } from "project-editor/features/page/page";
import type { IFlowContext } from "project-editor/flow/flow-interfaces";
import { getId } from "project-editor/core/object";
import { settingsController } from "home/settings";
import { ProjectEditor } from "project-editor/project-editor-interface";
import type { LVGLPageRuntime } from "project-editor/lvgl/page-runtime";

import { SceneDump } from "./scene-dump";
import type { SceneDumpWasm, SceneWidgetInfo, SceneWidgetLookup } from "./scene-dump";
import type { Scene, SceneObject } from "./scene";
import type { SceneRect } from "./scene";
import { hiddenSubtree } from "./scene";
import { SvgSink } from "./svg-sink";
import { createSvgContext } from "./svg-context";
import { hitTestElement, isAdditiveClick, nextSelection, selectionAction } from "./hit-test";
import { renderSelectionOverlay } from "./overlay";
import {
    LVGLSvgNonActivePageViewerRuntime,
    LVGLSvgPageEditorRuntime,
} from "./page-runtime-svg";
import type { SvgPaintFailure, SvgPipeline } from "./page-runtime-svg";
import { SVG_RENDERER_SUPPORTED_VERSION, isSvgDiffEnabled, isSvgStatsEnabled } from "./feature-flag";
import {
    inspectLvglRuntimeArtifacts,
    refreshLvglRuntimeArtifacts,
} from "./runtime-artifacts";
import { installLvglRuntimeCacheGuard } from "./runtime-cache-guard";

/*
 * Installed at module scope, and `page.tsx` imports this module statically, so it is in place before
 * any LVGL surface mounts — including the canvas page, which this file does not control and which
 * aborts on a stale cached artifact just as loudly (see runtime-cache-guard.ts).
 */
installLvglRuntimeCacheGuard();

type SvgRuntime = LVGLSvgPageEditorRuntime | LVGLSvgNonActivePageViewerRuntime;

/** Wait before re-measuring a scene the first verdict called unsettled. */
const HARNESS_SETTLE_RETRY_MS = 300;

/** Hard cap on measurement rounds, so an animating page cannot keep the harness busy forever. */
const MAX_HARNESS_MEASURE_ROUNDS = 6;

/**
 * Hard cap on widget-index rebuilds per LVGL tree.
 *
 * A rebuild can land while the runtime is still assigning `_lvglObj` to the objects it just created,
 * so the index is retried while that keeps changing what it maps. The cap is what stops an animating
 * page from rebuilding on every frame.
 */
const MAX_INDEX_REBUILDS = 6;

/** The part of the editor's view state this surface uses. */
interface EditorViewState {
    /** The editor's own selection calls — the ones the canvas path and the widgets tree make. */
    selectObjects?: (objects: unknown[]) => void;
    deselectAllObjects?: () => void;
    /** Client pixels → page units, so pointer geometry can be compared with scene geometry. */
    transform: {
        scale: number;
        clientToPagePoint(point: { x: number; y: number }): { x: number; y: number };
    };
}

/**
 * `LVGLLabelWidget` → `label`.
 *
 * Only used for `data-type` (debugging and hit-testing); nothing in the renderer branches on it.
 * Obtained by deriving from the class name rather than reaching into per-widget class info, which
 * keeps this component free of widget-specific knowledge.
 */
function subTypeOf(className: string): string {
    return className.replace(/^LVGL/, "").replace(/Widget$/, "").toLowerCase();
}

/**
 * A scene's identity and geometry, for "is this the same frame?" comparisons.
 *
 * Identity plus geometry, deliberately not styling or timing: a paint that only restyles an object is
 * still the same layout, while a tree that has gained, lost or moved an object is a different frame.
 */
function sceneSignature(scene: Scene): string {
    return scene.objects
        .map(
            object =>
                `${object.ptr}:${object.area.x},${object.area.y},${object.area.w},${object.area.h}`
        )
        .join(";");
}

/**
 * A node's box restricted to the clip that hides part of it, or the box itself when nothing is clipped.
 *
 * `getBBox()` is blind to `clip-path`, so a clipped container reports the geometry its clip will hide.
 * Used for the fidelity harness's box rule, where that difference is the difference between a correct
 * row and a 233 px "misplacement".
 */
function clippedBox(box: SceneRect, clip: SceneRect | undefined): SceneRect {
    if (!clip) {
        return box;
    }
    const x = Math.max(box.x, clip.x);
    const y = Math.max(box.y, clip.y);
    return {
        x,
        y,
        w: Math.max(0, Math.min(box.x + box.w, clip.x + clip.w) - x),
        h: Math.max(0, Math.min(box.y + box.h, clip.y + clip.h) - y),
    };
}

/**
 * Build the LVGL pointer → widget-model index for the scene enrichment.
 *
 * The runtime already holds `widget._lvglObj` for every widget it created, so identity, type, name
 * and the label string need no cooperation from the C side. Widgets LVGL creates internally (for
 * example a tabview's burrowed tab bar) simply have no entry and are still rendered.
 *
 * The index is built **lazily on first lookup**, not when the component is constructed: widget
 * `_lvglObj` pointers are only assigned while the runtime mounts and creates the LVGL objects, so
 * an index built at construction time is empty. If the first build yields nothing, one retry
 * happens — enough to cover "looked up before mount finished" without rebuilding on every miss
 * (LVGL-internal objects legitimately have no widget).
 */
interface WidgetIndex {
    lookup: SceneWidgetLookup;
    /** LVGL pointer → flow object id, filled in by the same pass. */
    flowObjectIds: Map<number, string>;
    /**
     * Throw the cached index away and re-read every widget's `_lvglObj`.
     *
     * The editor re-creates the LVGL page whenever the model changes (a drag, a property edit), and
     * LVGL hands out *new* pointers for the re-created objects — so the index cannot be patched, its
     * keys are gone. Everything that maps a pointer to a widget depends on this: without the rebuild
     * the selection frame stops being drawn and a click stops selecting, silently, after the first
     * edit. Measured: one trusted drag moved the screen pointer from 4552104 to 4557240 and left all
     * four objects unmapped.
     */
    refresh: () => void;
}

function buildWidgetLookup(page: Page, project: unknown): WidgetIndex {
    let index: Map<number, SceneWidgetInfo> | undefined;
    /**
     * LVGL pointer → flow object id. The editor's selection works in terms of `getId(object)`, not
     * the widget's user-visible `objID`, so the SVG surface needs this to select what was clicked.
     */
    const flowObjectIds = new Map<number, string>();
    /** widget `image` is an ASSET NAME (e.g. "wifisym"); this maps it to the bitmap data URI. */
    const imageData = new Map<string, string>();

    const resolveImageData = (name: string): string | undefined => {
        if (!name) {
            return undefined;
        }
        if (imageData.size === 0) {
            // Same asset map the runtime uses in `preloadImages()`
            // (`project._assets.maps.name.getAllObjectsOfType("bitmaps")`).
            const maps = (project as any)?._assets?.maps?.name;
            const bitmaps: unknown[] =
                typeof maps?.getAllObjectsOfType === "function"
                    ? maps.getAllObjectsOfType("bitmaps")
                    : [];
            for (const entry of bitmaps) {
                const record = entry as { name?: string; object?: { image?: unknown } };
                const data = record?.object?.image;
                if (record?.name && typeof data === "string" && data.length > 0) {
                    imageData.set(record.name, data);
                }
            }
        }
        return imageData.get(name);
    };

    const build = (): Map<number, SceneWidgetInfo> => {
        const map = new Map<number, SceneWidgetInfo>();
        const widgets =
            (page as unknown as { _lvglWidgets?: unknown[] })._lvglWidgets ?? [];

        for (const widget of widgets) {
            const record = widget as {
                _lvglObj?: number;
                objID?: string;
                name?: string;
                type?: string;
                hidden?: boolean;
                text?: unknown;
                placeholder?: unknown;
                image?: unknown;
                imageReleased?: unknown;
            };
            const ptr = record._lvglObj;
            if (!ptr) {
                continue;
            }
            const flowObjectId = getId(widget as never);
            if (flowObjectId) {
                flowObjectIds.set(ptr, flowObjectId);
            }
            const info: SceneWidgetInfo = {};
            if (record.objID) {
                info.objId = record.objID;
            }
            if (typeof record.type === "string") {
                info.type = subTypeOf(record.type);
            }
            if (record.name) {
                info.name = record.name;
            }
            if (record.hidden) {
                info.hidden = true;
            }
            // Labels (and the label children buttons are built from) expose `.text`. Font/colour
            // come from the LVGL dump; anything more specific is left to the fidelity work in P5.
            if (typeof record.text === "string" && record.text.length > 0) {
                info.text = { str: record.text };
            }
            /*
             * A textarea's placeholder string. LVGL draws it, in place of the text, whenever the
             * textarea's text is empty — and only the widget model knows the string, so without
             * this every empty textarea rendered as nothing (see `wireToScene`).
             */
            if (typeof record.placeholder === "string" && record.placeholder.length > 0) {
                info.placeholder = record.placeholder;
            }
            /*
             * Image sources. `LVGLImageWidget` carries `image`; `LVGLImgbuttonWidget` carries one
             * per state and "released" is the design-time default. Both are ASSET NAMES, so they
             * must be resolved to the bitmap's data URI before they can be an <image href>.
             * Without this, images silently never appeared — no <image> element was ever emitted.
             */
            const typeName = typeof record.type === "string" ? record.type : "";
            if (typeName.indexOf("Image") !== -1 || typeName.indexOf("Imgbutton") !== -1) {
                const raw =
                    (typeof record.image === "string" && record.image) ||
                    (typeof record.imageReleased === "string" && record.imageReleased) ||
                    "";
                const data = raw ? resolveImageData(raw) : undefined;
                if (data) {
                    info.img = { srcId: data };
                }
            }
            map.set(ptr, info);
        }
        return map;
    };

    const lookup: SceneWidgetLookup = ptr => {
        if (!index) {
            index = build();
        }
        let found = index.get(ptr);
        if (!found && index.size === 0) {
            index = build();
            found = index.get(ptr);
        }
        return found;
    };

    const refresh = (): void => {
        flowObjectIds.clear();
        index = build();
    };

    return { lookup, flowObjectIds, refresh };
}

export const LVGLSvgPage = observer(
    class LVGLSvgPage extends React.Component<{
        page: Page;
        flowContext: IFlowContext;
    }> {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        private svgRef = React.createRef<SVGSVGElement>();
        private runtime: SvgRuntime | undefined;
        private sink: SvgSink | undefined;
        private dumper: SceneDump | undefined;
        /** The last painted scene — the exact areas the selection overlay draws around. */
        private scene: Scene | undefined;
        /** LVGL pointer → flow object id, filled by the widget index. */
        private flowObjectIds = new Map<number, string>();
        /** The same index, kept so it can be rebuilt when the runtime re-creates its objects. */
        private widgetIndex: WidgetIndex | undefined;
        /** Scene root the widget index was built against; a different root means new pointers. */
        private indexRootPtr: number | undefined;
        /** How many scene objects the index currently maps, and how often it has been rebuilt. */
        private indexCoverage = 0;
        private indexRebuilds = 0;
        /** Re-draws the overlay when the editor selection changes. */
        private selectionDisposer: (() => void) | undefined;
        /** P5 harness: offscreen copy of the LVGL framebuffer, only when `?svgDiff=1`. */
        private harnessMirror: HTMLCanvasElement | undefined;
        /** Scene signature of the previous harness run, for `harnessSceneSettled()`. */
        private lastHarnessSceneSignature: string | undefined;
        /** P5 harness: guards against overlapping runs (rasterisation is async). */
        private harnessRunning = false;
        /** First failure time, so a boot race is not reported as a broken surface. */
        private failureStartedAt = 0;
        /** Reasons already explained in the console, so a per-frame failure logs once. */
        private readonly reportedReasons = new Set<string>();
        /** The stale-runtime refresh runs at most once per mounted surface. */
        private staleRuntimeRecoveryStarted = false;

        createPageRuntime() {
            const { page, flowContext } = this.props;
            const svg = this.svgRef.current;
            if (!svg) {
                return;
            }

            const width = this.displayWidth();
            const height = this.displayHeight();

            this.sink = new SvgSink(svg, { w: width, h: height });
            // The WASM module only exists once the base runtime has booted it, so resolution is
            // deferred: before that, isAvailable() is false and dump() returns undefined.
            this.dumper = new SceneDump(() => this.wasmModule());

            const ctx = createSvgContext({
                onFrame: () => this.runtime?.paintScene(),
                onClearPage: () => this.sink?.clearPage(),
                // The fidelity harness needs the pixels the base runtime blits; capturing them here
                // gives it the LVGL framebuffer from the same run (see `svg-diff-harness.ts`).
                mirror: this.createHarnessMirror(width, height),
                onUnexpectedMember: member => {
                    // Surfaces a future base-class canvas call instead of hiding it.
                    console.debug(
                        `[lvgl-svg] unexpected canvas member "${member}" (ignored)`
                    );
                },
            });

            this.runtime = this.context.runtime
                ? new LVGLSvgNonActivePageViewerRuntime(
                      page,
                      width,
                      height,
                      ctx
                  )
                : new LVGLSvgPageEditorRuntime(page, ctx, flowContext);

            const index = buildWidgetLookup(page, this.context.project);
            this.widgetIndex = index;
            // A fresh runtime means fresh LVGL objects, so the index has nothing cached yet.
            this.indexRootPtr = undefined;
            this.indexCoverage = 0;
            this.indexRebuilds = 0;
            this.flowObjectIds = index.flowObjectIds;
            const pipeline: SvgPipeline = {
                sink: this.sink,
                dumper: this.dumper,
                lookup: index.lookup,
                onPainted: (scene, ms) => {
                    // The overlay frames are derived from the resolved LVGL areas, so it must be
                    // redrawn whenever the scene changes (move, resize, page switch).
                    this.scene = scene;
                    this.syncWidgetIndex(scene);
                    this.updateOverlay();
                    if (this.harnessMirror) {
                        void this.runHarness(scene, ms);
                    }
                },
                onPaintFailed: info => this.handlePaintFailure(info),
            };
            this.runtime.attachSvgPipeline(pipeline);
            this.observeSelection();
            void this.mountWhenArtifactsAreUsable();
            this.exposeDevHandle();
        }

        /**
         * Rebuild the pointer → widget index when the runtime re-created its LVGL objects, and until it
         * stops changing what it maps.
         *
         * The editor tears the page down and builds it again on every model change, so the whole tree —
         * including the screen — gets new pointers, and the rebuild is triggered by that new root. One
         * rebuild is not always enough: the runtime assigns `_lvglObj` as it creates the widgets, so a
         * rebuild that lands mid-assignment maps only part of the scene. Measured, a resize left two of
         * four objects unmapped, and nothing would ever have triggered another rebuild — the tree is
         * stable afterwards, so the surface would have silently stopped selecting them.
         *
         * Coverage (how many of the scene's objects the index maps) is therefore the second signal: as
         * long as a paint shows a different number, another rebuild is attempted, capped so an
         * animating page cannot rebuild forever.
         */
        private syncWidgetIndex(scene: Scene): void {
            const rootChanged = this.indexRootPtr !== scene.rootPtr;
            if (rootChanged) {
                this.indexRootPtr = scene.rootPtr;
                this.indexCoverage = 0;
                this.indexRebuilds = 0;
            }

            const coverage = scene.objects.reduce(
                (count, object) => count + (this.flowObjectIds.has(object.ptr) ? 1 : 0),
                0
            );
            const changed = coverage !== this.indexCoverage;
            this.indexCoverage = coverage;

            if ((!rootChanged && !changed) || this.indexRebuilds >= MAX_INDEX_REBUILDS) {
                return;
            }
            this.indexRebuilds++;
            this.widgetIndex?.refresh();
            // Measured after the rebuild, so the next paint compares like with like.
            this.indexCoverage = scene.objects.reduce(
                (count, object) => count + (this.flowObjectIds.has(object.ptr) ? 1 : 0),
                0
            );
        }

        /**
         * Re-draw the overlay when the editor selection changes.
         *
         * Deliberately an `autorun` rather than a read in `render()`: `componentDidUpdate` unmounts
         * and remounts the whole runtime (mirroring `lvgl/Page.tsx`), so making the component
         * re-render on every selection change would tear down and rebuild the LVGL runtime — far too
         * expensive for a drawing update.
         */
        private observeSelection(): void {
            this.selectionDisposer?.();
            this.selectionDisposer = autorun(() => {
                // Touch the observable so this autorun re-runs whenever the selection changes.
                const ids = this.selectedFlowObjectIds();
                this.updateOverlay(ids);
            });
        }

        /** Flow object ids of the current editor selection (what `data-objid`/`getId` agree on). */
        private selectedFlowObjectIds(): string[] {
            const selected =
                (this.props.flowContext.viewState as unknown as {
                    selectedObjects?: Array<{ id: string }>;
                })?.selectedObjects ?? [];
            return selected.map(adapter => adapter.id);
        }

        /** Map flow object ids back to LVGL pointers so the overlay can frame them. */
        private updateOverlay(ids: string[] = this.selectedFlowObjectIds()): void {
            const sink = this.sink;
            const scene = this.scene;
            if (!sink || !scene) {
                return;
            }
            sink.setOverlay(renderSelectionOverlay(scene.objects, this.ptrsFor(ids)));
        }

        /**
         * LVGL pointers of the given flow object ids.
         *
         * The widget index built from the page model is the source, so this and the `data-objid`
         * attributes in the DOM always agree on which object is which.
         */
        private ptrsFor(ids: string[] = this.selectedFlowObjectIds()): Set<number> {
            const wanted = new Set(ids);
            const ptrs = new Set<number>();
            for (const [ptr, flowObjectId] of this.flowObjectIds) {
                if (wanted.has(flowObjectId)) {
                    ptrs.add(ptr);
                }
            }
            return ptrs;
        }

        /**
         * Is the frame under measurement a complete, current frame?
         *
         * Two conditions, because one is not enough:
         *
         * 1. The runtime's tree still matches the scene the SVG was built from (re-dumped now). If the
         *    page is still being built, the tree has already moved on and the measurement describes a
         *    frame that never existed on screen.
         * 2. The same scene has now been measured twice. A single paint can be complete and *still*
         *    early: measured live on `home_screen`, the first paint after a switch held 4 objects and a
         *    whole-surface delta of 11.59%, against 25 objects and 4.99% once the page finished.
         *
         * A false verdict is answered by re-measuring (`runHarness`), not by polling: the app repaints
         * only when something changes, so waiting for a second paint on a static page waits forever —
         * measured, `settled` stayed false indefinitely while the scorecard sat unchanged.
         */
        private harnessSceneSettled(scene: Scene): boolean {
            const signature = sceneSignature(scene);
            const current = this.dumper?.dumpScene(scene.rootPtr);
            const matchesRuntime = current !== undefined && sceneSignature(current) === signature;
            const measuredBefore = this.lastHarnessSceneSignature === signature;
            this.lastHarnessSceneSignature = signature;
            return matchesRuntime && measuredBefore;
        }

        /**
         * Measure the newest scene, re-measuring it while the verdict says it is not settled.
         *
         * Two details matter here, both measured:
         *
         * - The loop re-reads `this.scene` every round, so a scene that changed while the SVG was being
         *   rasterised (about a second) is measured as it stands rather than reported as somebody else's
         *   frame.
         * - A paint that happens while this is busy needs no queueing: the next round measures whatever
         *   `this.scene` holds by then. Waiting for another *paint* instead (the first version of the
         *   settled flag) never converged, because a static page is painted once and then never again.
         *
         * The round count is capped, so an animating page cannot keep the harness busy indefinitely.
         */
        private async runHarness(_scene: Scene, patchMs: number): Promise<void> {
            if (this.harnessRunning) {
                return;
            }
            this.harnessRunning = true;
            try {
                /*
                 * Leave the frame before touching LVGL.
                 *
                 * The pipeline calls back into JavaScript from *inside* the runtime's paint call (the
                 * canvas context is a JS proxy), so everything `runHarness` does synchronously runs with
                 * a live wasm frame underneath it. Dumping the scene there is already questionable, but
                 * `measureScene` also invalidates the screen and calls `lv_refr_now` — a full render
                 * inside a render. Measured: moving a widget with `?svgDiff=1` aborted the runtime
                 * (`Aborted(native code called abort())`, then "the LVGL scene dump returned an unusable
                 * payload"), while the same drag with the harness off was clean (`diagnose: "ok"`, no
                 * notice). One turn of the event loop is all it takes to be outside that stack, and the
                 * frame being measured is already painted by then.
                 */
                await new Promise(resolve => window.setTimeout(resolve, 0));

                for (let round = 0; round < MAX_HARNESS_MEASURE_ROUNDS; round++) {
                    const target = this.scene;
                    if (!target) {
                        break;
                    }
                    const settled = this.harnessSceneSettled(target);
                    await this.measureScene(target, patchMs, settled);
                    if (settled) {
                        break;
                    }
                    await new Promise(resolve =>
                        window.setTimeout(resolve, HARNESS_SETTLE_RETRY_MS)
                    );
                }
            } finally {
                this.harnessRunning = false;
            }
        }

        /**
         * Make the reference canvas hold a complete frame.
         *
         * LVGL renders incrementally, so the harness cannot assume the pixels it captures cover the
         * whole screen; invalidating the active screen and refreshing synchronously is what turns
         * "whatever has been redrawn so far" into a full frame.
         */
        private forceFullReferenceFrame(): void {
            const lvgl = this.wasmModule() as unknown as
                | Record<string, ((...args: unknown[]) => unknown) | undefined>
                | undefined;
            const invalidate = lvgl?._lv_obj_invalidate;
            const screenActive = lvgl?._lv_screen_active;
            const refrNow = lvgl?._lv_refr_now;
            const displayDefault = lvgl?._lv_display_get_default;
            if (
                typeof invalidate !== "function" ||
                typeof screenActive !== "function" ||
                typeof refrNow !== "function" ||
                typeof displayDefault !== "function"
            ) {
                return; // an older runtime without the refresh hooks: leave the frame as it is
            }
            const screen = screenActive();
            if (screen) {
                invalidate(screen);
            }
            refrNow(displayDefault());
        }

        /**
         * Create the harness's reference target, but only when explicitly asked for (`?svgDiff=1`).
         *
         * Never attached to the document: nothing displays it, it exists purely to receive the frames
         * the base runtime blits, so the scorecard can compare the SVG against the actual LVGL pixels
         * produced by the *same* run — no second runtime, no second layout pass.
         */
        private createHarnessMirror(
            width: number,
            height: number
        ): HTMLCanvasElement | undefined {
            if (!isSvgDiffEnabled()) {
                return undefined;
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            this.harnessMirror = canvas;
            return canvas;
        }

        /**
         * Run the fidelity comparison for one scene and report it.
         *
         * Rows are built from the *scene* (which parts exist and where LVGL put them) crossed with the
         * SVG nodes the renderer produced, so a failure names a widget and a part instead of just
         * "some pixels differ".
         */
        private async measureScene(
            scene: Scene,
            patchMs: number,
            settled: boolean
        ): Promise<void> {
            const mirror = this.harnessMirror;
            const svg = this.svgRef.current;
            if (!mirror || !svg) {
                return;
            }
            try {
                /*
                 * Paint the whole screen into the reference canvas first.
                 *
                 * LVGL blits only the areas it invalidated, so a mirror that has just been created
                 * stays black wherever nothing has been redrawn yet — and the scorecard then compared
                 * the SVG against a mostly-empty frame: every object reported a 40-96% pixel delta
                 * while its box matched (bboxIoU 0.85-1.0). Invalidating the screen and refreshing
                 * now makes the reference a complete frame, which is what the comparison assumes.
                 */
                this.forceFullReferenceFrame();
                const { runFidelityHarness, describeHarnessResult } = await import(
                    "./svg-diff-harness"
                );
                const { tierForObject, tierNote, isProceduralType } = await import("./svg-diff");
                const { partHasDrawing: hasDrawing } = await import("./scene-dump");
                const { hiddenSubtree } = await import("./scene");
                /*
                 * Objects LVGL does not paint are not measured.
                 *
                 * The dump walks the whole object tree, hidden sub-screens included, so a page can
                 * carry twice as many objects as it shows. A hidden object has no SVG node by design,
                 * which left the harness comparing its box against the visible page's pixels: measured
                 * `time` `panel/MAIN 15.04%` and `button/MAIN 19.52%`, both with no node and therefore
                 * no box either. The predicate is the renderer's own, so the two cannot disagree.
                 */
                const notVisible = hiddenSubtree(scene.objects);
                const measured = scene.objects.filter(object => !notVisible.has(object.ptr));
                /*
                 * Objects drawn from a procedural ancestor's private state are excluded with it.
                 * `scene.objects` is flat and parents precede children, so one pass suffices.
                 */
                const procedural = new Set<number>();
                for (const object of scene.objects) {
                    const insideAncestor =
                        object.parentPtr != null && procedural.has(object.parentPtr);
                    if (insideAncestor || isProceduralType(object.type)) {
                        procedural.add(object.ptr);
                    }
                }
                /*
                 * Every box inside this object that belongs to ANOTHER object, for the row exclusions.
                 *
                 * Two cases, one rule: a container's box contains everything its children draw, so
                 * measuring the container over its whole box reports its children's deltas a second
                 * time (measured: holiday_calender_screen's panel at 79% while the only wrong thing
                 * inside was the calendar); and an unrelated widget can sit on top — home_screen's
                 * gauges have their numeric labels as SIBLINGS, not children, so the glyph
                 * anti-aliasing of "11" was being charged to the arc's row (6-9% of a 230x230 box that
                 * is otherwise pixel-aligned). Subtracting every contained box attributes each pixel to
                 * the object that drew it, and each of those objects still has its own row.
                 *
                 * Overlapping-but-not-contained siblings are the one case this cannot separate; they
                 * remain shared between their two rows.
                 */
                const excludes = new Map<number, SceneRect[]>();
                for (const object of measured) {
                    const list: SceneRect[] = [];
                    for (const other of measured) {
                        if (other === object) {
                            continue;
                        }
                        const a = object.area;
                        const b = other.area;
                        if (
                            b.x >= a.x &&
                            b.y >= a.y &&
                            b.x + b.w <= a.x + a.w &&
                            b.y + b.h <= a.y + a.h
                        ) {
                            list.push(b);
                        }
                    }
                    if (list.length > 0) {
                        excludes.set(object.ptr, list);
                    }
                }
                const objects = measured.map(object => {
                    const node = svg.querySelector(`[data-ptr="${object.ptr}"]`);
                    const box = (node as SVGGraphicsElement | null)?.getBBox?.();
                    /*
                     * The node's box is clamped to its own clip.
                     *
                     * `getBBox()` reports the geometry a clip-path will hide, so a container whose
                     * children are clipped measured as if its drawing escaped the widget: the root
                     * screen reported a 65-233 px overhang on four pages, and 8 px on every schedule
                     * table panel, while its own pixels matched exactly (0-281 of 18300). The clip is
                     * the object's own box for a child-clipping object, so clamping makes the box rule
                     * measure what is actually painted.
                     */
                    const nodeRect = box
                        ? clippedBox(
                              { x: box.x, y: box.y, w: box.width, h: box.height },
                              object.clip
                          )
                        : undefined;
                    /*
                     * Tier from what the object IS — procedural widget (or a descendant of one),
                     * rasterised content, or pure vector style — never from the size of the diff: a
                     * tier assigned because a diff is large is how a scorecard stops meaning anything.
                     */
                    const tierInput = {
                        type: object.type,
                        carriesTextOrImage: object.parts.some(
                            part => !!(part.text?.str || part.img)
                        ),
                        insideProcedural:
                            object.parentPtr != null && procedural.has(object.parentPtr),
                    };
                    return {
                        widget: object.type,
                        part: "MAIN",
                        area: object.area,
                        nodeRect,
                        tier: tierForObject(tierInput),
                        note: tierNote(tierInput),
                        /*
                         * A row is measured on the pixels ITS object drew — see `excludes`.
                         */
                        exclude: excludes.get(object.ptr),
                        /*
                         * An object with nothing drawable of its own is not measurable: a textarea's
                         * internal label sits inside the textarea that paints the placeholder, so its
                         * "diff" is that widget's. Detected from the scene, not from the DOM: a part
                         * that carries no paint is exactly what the renderer leaves out.
                         */
                        drawsNothing: !object.parts.some(hasDrawing),
                    };
                });
                const result = await runFidelityHarness({
                    svg,
                    canvas: mirror,
                    width: scene.width,
                    height: scene.height,
                    source: this.props.page.name ?? "page",
                    settled,
                    notVisible: notVisible.size,
                    objects,
                });
                console.log(describeHarnessResult(result));
                for (const warning of result.warnings) {
                    console.warn(`[lvgl-svg] harness: ${warning}`);
                }
                if (isSvgStatsEnabled()) {
                    console.log(
                        `[lvgl-svg] stats: objects=${scene.objects.length} nodes=${this.sink?.nodeCount} patchMs=${patchMs} dumpMs=included`
                    );
                }
                // Exposed for the dev panel / Playwright: the scorecard artefact.
                (globalThis as any).__lvglSvgScorecard = result;
            } catch (error) {
                console.warn(`[lvgl-svg] harness failed: ${(error as Error).message}`);
            }
        }

        /**
         * Click-to-select.
         *
         * The SVG surface is the only place where LVGL objects have DOM presence, so this is where a
         * click can identify a widget; the click then goes through the editor's own selection actions
         * (`viewState.selectObjects`/`deselectAllObjects`), which is what keeps undo/redo, the property
         * panel and the widgets tree in sync without a second selection model here.
         *
         * Selection is the *only* pointer behaviour this surface implements. Drag-move, drag-resize,
         * the marquee band, snap lines, zoom/pan and the undo entries they create belong to the
         * editor's shared interaction layer, whose hotspots (`EezStudio_ComponentEnclosure` per widget,
         * plus `EezStudio_FlowEditorSelection`) are laid over this surface exactly as they are over the
         * canvas. Measured on a live page: dragging a switch here wrote `left/top` 196,48 → 221,60 into
         * the model with one `Changed (Left, Top)` undo step, and the property panel followed — see
         * `docs/t3000/architecture/lvgl-svg/editor-integration.md` §7.
         */
        private handlePointerDown = (
            event: React.PointerEvent<SVGSVGElement>
        ): void => {
            if (event.button !== 0) {
                // Middle/alt drag is panning, which the editor's canvas owns around this surface.
                return;
            }
            if (!this.flowViewState().selectObjects) {
                return;
            }

            /*
             * The DOM hit wins when there is one: the pointer landed on something the user can see, and
             * the renderer's `pointer-events` policy has already decided what is clickable. The
             * geometric fallback (topmost object whose box contains the point, in paint order) covers
             * the parts that carry no fill, where the browser hit test finds nothing inside the
             * widget's own box.
             */
            const hit = hitTestElement(event.target as Element);
            const ptr = this.widgetPtrAtPoint(this.pagePoint(event), hit?.ptr);
            const flowObjectId =
                ptr != null
                    ? this.flowObjectIds.get(ptr) ??
                      this.scene?.objects.find(object => object.ptr === ptr)?.objId
                    : undefined;

            const current = this.selectedFlowObjectIds();
            const alreadySelected =
                flowObjectId !== undefined && current.indexOf(flowObjectId) !== -1;
            this.select(
                nextSelection(
                    selectionAction(event, alreadySelected),
                    current,
                    flowObjectId
                )
            );
        };

        private flowViewState(): EditorViewState {
            return this.props.flowContext.viewState as unknown as EditorViewState;
        }

        private pagePoint(event: React.PointerEvent<SVGSVGElement>): {
            x: number;
            y: number;
        } {
            const transform = this.flowViewState().transform;
            return transform.clientToPagePoint({ x: event.clientX, y: event.clientY });
        }

        /** Objects a click may select: painted (not inside a hidden subtree), and owned by a widget. */
        private selectableObjects(): SceneObject[] {
            const scene = this.scene;
            if (!scene) {
                return [];
            }
            const hidden = hiddenSubtree(scene.objects);
            return scene.objects.filter(
                object => !hidden.has(object.ptr) && this.flowObjectIds.has(object.ptr)
            );
        }

        /**
         * The widget under a page point — the fallback for parts with no fill of their own.
         *
         * Topmost object whose box contains the point, in paint order, so the answer matches what the
         * user sees rather than which element the browser happened to hit. Only addressable objects
         * (painted, owned by a widget) take part, so a click can never select something invisible.
         */
        private widgetPtrAtPoint(
            point: { x: number; y: number },
            domPtr: number | undefined
        ): number | undefined {
            if (domPtr != null && this.flowObjectIds.has(domPtr)) {
                return domPtr;
            }
            const candidates = this.selectableObjects().filter(
                object =>
                    point.x >= object.area.x &&
                    point.x <= object.area.x + object.area.w &&
                    point.y >= object.area.y &&
                    point.y <= object.area.y + object.area.h
            );
            return candidates.length > 0 ? candidates[candidates.length - 1].ptr : undefined;
        }

        /** Apply a selection through the editor, then redraw the overlay. */
        private select(ids: string[]): void {
            const viewState = this.flowViewState();
            if (ids.length === 0) {
                viewState.deselectAllObjects?.();
            } else {
                const adapters = ids
                    .map(id => this.props.flowContext.document.findObjectById(id))
                    .filter(adapter => !!adapter);
                viewState.selectObjects?.(adapters);
            }
            this.updateOverlay(ids);
        }

        /**
         * Boot the runtime only once the artifacts it is about to load are known to be current.
         *
         * A `.wasm` older than the glue JavaScript makes Emscripten's `assignWasmExports` assert and
         * abort the module, and because `mount()` returns nothing that abort reaches the console as an
         * uncaught promise rejection — it cannot be caught, and it happens *before* any of the runtime
         * diagnostics below can report anything. So this is checked up front, on the bytes.
         */
        private async mountWhenArtifactsAreUsable(): Promise<void> {
            const runtime = this.runtime;
            if (!runtime) {
                return;
            }

            const status = await inspectLvglRuntimeArtifacts(
                SVG_RENDERER_SUPPORTED_VERSION
            );

            // The page may have been switched while the artifacts were being checked.
            if (this.runtime !== runtime) {
                return;
            }

            if (status === "stale-server" || status === "stale-cache") {
                // Mounting would abort inside the glue. Explain the real cause instead, and leave
                // the surface empty rather than half-initialised.
                this.reportUnusableArtifacts(status);
                return;
            }

            runtime.mount();
            this.scheduleRuntimeCheck();
        }

        /** The artifacts cannot work: say why, in the terms of whoever can fix it. */
        private reportUnusableArtifacts(
            status: "stale-server" | "stale-cache"
        ): void {
            const version = SVG_RENDERER_SUPPORTED_VERSION;
            const detail =
                status === "stale-server"
                    ? [
                          `LVGL SVG surface: the served lvgl_runtime_v${version}.wasm has no scene dump.`,
                          "The deployed 9.5 runtime is older than this editor build.",
                      ]
                    : [
                          `LVGL SVG surface: the cached lvgl_runtime_v${version}.wasm has no scene dump.`,
                          "Hard-reload the page (Ctrl+Shift+R) to pick up the current build.",
                      ];
            console.error(`[lvgl-svg] ${detail[0]} (${status})`);
            this.sink?.showNotice(detail.join("\n"));
        }

        /**
         * Dev-only inspection handle (`globalThis.__lvglSvg`).
         *
         * A blank surface is indistinguishable from an empty page from the outside, and the fidelity
         * harness (P5) needs the sink and the dumper anyway, so this is the smallest way to make both
         * reachable from the console. Not present in production builds.
         */
        private exposeDevHandle(): void {
            if (!import.meta.env?.DEV) {
                return;
            }
            (globalThis as any).__lvglSvg = {
                sink: this.sink,
                dumper: this.dumper,
                runtime: this.runtime,
                wasm: () => this.wasmModule(),
                diagnose: () => this.dumper?.diagnose(),
                /** The P5 harness reference (offscreen LVGL framebuffer), when it exists. */
                mirror: () => this.harnessMirror,
                /** Force the stale-runtime path (verifies the notice without a stale cache). */
                reportStale: () => void this.handleStaleRuntime(),
                /**
                 * What a click would act on right now: the selection, the LVGL objects behind it and
                 * the model rectangles the editor draws its own chrome from. There is no way to see any
                 * of this from the outside — a click that selects the wrong widget looks exactly like
                 * one that selects the right one until something unexpected is dragged.
                 */
                interaction: () => {
                    const ids = this.selectedFlowObjectIds();
                    return {
                        selected: ids,
                        selectedPtrs: [...this.ptrsFor(ids)],
                        /** How much of the scene a click can actually address. */
                        widgetPtrs: this.flowObjectIds.size,
                        selectable: this.selectableObjects().length,
                        sceneObjects: this.scene ? this.scene.objects.length : 0,
                        /**
                         * Objects the dump says LVGL does not paint, and the tree root the dump came
                         * from. Both are inputs to the harness (`notVisible`), so a page that measures
                         * nothing can be told apart from one whose objects are all hidden.
                         */
                        hiddenPtrs: this.scene ? [...hiddenSubtree(this.scene.objects)] : [],
                        rootPtr: this.scene?.rootPtr ?? null,
                        painted: this.sink
                            ? this.sink.contentGroup.querySelectorAll("[data-ptr]").length
                            : 0,
                        /**
                         * What the editor's shared layer is laid over this surface with: its own
                         * hotpots (one per widget) and selection chrome. Empty means the pointer
                         * gestures on this surface are the editor's alone and nothing else is here.
                         */
                        editorHotspots: document.querySelectorAll(
                            ".EezStudio_ComponentEnclosure"
                        ).length,
                        selectionChrome: document.querySelectorAll(
                            '.EezStudio_FlowEditorSelection [data-eez-flow-object-id], .EezStudio_FlowEditorSelection_ResizeHandle'
                        ).length,
                        rects: ids
                            .map(id => this.rectOf(id))
                            .filter((rect): rect is { id: string; left: number; top: number; width: number; height: number } => !!rect),
                    };
                },
            };
        }

        /** The editor's model rectangle for a flow object id, if it has one. */
        private rectOf(id: string): {
            id: string;
            left: number;
            top: number;
            width: number;
            height: number;
        } | undefined {
            const adapter = this.props.flowContext.document.findObjectById(id) as
                | { rect?: { left: number; top: number; width: number; height: number } }
                | undefined;
            const rect = adapter?.rect;
            return rect ? { id, ...rect } : undefined;
        }

        /**
         * A failed paint must never be silent: a blank surface looks like an empty page.
         *
         * Boot races (`no-root`, `no-module`, `not-booted`) are waited out — the base runtime is
         * still initialising WASM — while `no-dump` is acted on immediately, because a booted module
         * without `lvglDumpScene` can only mean a stale cached `.wasm` (see `runtime-artifacts.ts`).
         */
        private handlePaintFailure(info: SvgPaintFailure): void {
            if (info.attempts <= 1) {
                this.failureStartedAt = Date.now();
            }

            if (info.reason === "no-dump") {
                void this.handleStaleRuntime();
                return;
            }

            const elapsed = Date.now() - this.failureStartedAt;
            if (info.transient) {
                // Normally resolves within a frame or two; only complain if it really drags on.
                if (elapsed > 2000) {
                    this.notifyOnce(
                        "boot",
                        "Waiting for the LVGL runtime to start…"
                    );
                }
                return;
            }

            this.notifyOnce(
                info.reason,
                "The LVGL scene dump returned an unusable payload (see the console)."
            );
        }

        /** Show a message in the overlay and log the cause once. */
        private notifyOnce(key: string, message: string): void {
            if (!this.reportedReasons.has(key)) {
                this.reportedReasons.add(key);
                console.warn(`[lvgl-svg] ${message}`);
            }
            this.sink?.showNotice(message);
        }

        /**
         * The loaded 9.5 WASM has no scene dump, so the SVG surface cannot paint.
         *
         * The glue JavaScript is always fetched with `cache: "no-store"` but the `.wasm` binary is
         * fetched from a plain URL that is served without `Cache-Control`/`ETag`, so a browser may
         * keep using an old binary indefinitely (heuristic freshness). Re-fetch the artifacts with
         * the cache bypassed so the stored entry is replaced, and tell the user to reload — the
         * reload is left to them because the editor may hold unsaved edits.
         */
        private async handleStaleRuntime(): Promise<void> {
            const version = SVG_RENDERER_SUPPORTED_VERSION;
            if (this.staleRuntimeRecoveryStarted) {
                // Recovery already ran for this tab. Keep the instruction on screen instead of
                // going quiet, so a page switch cannot land on a blank surface with no explanation.
                this.sink?.showNotice(
                    [
                        `LVGL SVG surface: cached ${version} WebAssembly is out of date.`,
                        "Hard-reload the page (Ctrl+Shift+R) to pick up the current build.",
                    ].join("\n")
                );
                return;
            }
            this.staleRuntimeRecoveryStarted = true;
            this.notifyOnce(
                "no-dump",
                `LVGL SVG surface: the loaded ${version} runtime has no scene dump ` +
                    `(stale cached WebAssembly). Refreshing it now.`
            );
            this.sink?.showNotice(
                [
                    `LVGL SVG surface: cached ${version} WebAssembly is out of date.`,
                    "Refreshing it — a page reload will then render with SVG.",
                ].join("\n")
            );

            const outcome = await refreshLvglRuntimeArtifacts(version);
            if (outcome === "already-refreshed") {
                this.sink?.showNotice(
                    [
                        `LVGL SVG surface: cached ${version} WebAssembly is still out of date.`,
                        "Hard-reload the page (Ctrl+Shift+R) to pick up the current build.",
                    ].join("\n")
                );
            } else if (outcome === "failed") {
                this.sink?.showNotice(
                    [
                        `LVGL SVG surface: could not refresh the ${version} WebAssembly.`,
                        "Hard-reload the page (Ctrl+Shift+R) to pick up the current build.",
                    ].join("\n")
                );
            } else {
                this.sink?.showNotice(
                    [
                        `LVGL SVG surface: refreshed the cached ${version} WebAssembly.`,
                        "Reload the page (F5) to render with SVG.",
                    ].join("\n")
                );
            }
        }

        /**
         * Deterministic safety net. The frame loop is the primary detector, but it is idle-driven in
         * design mode: if it stops after the first failed frame, the check below still runs.
         */
        private scheduleRuntimeCheck(): void {
            const dumper = this.dumper;
            if (!dumper) {
                return;
            }
            window.setTimeout(() => {
                // Ignore the result if the surface was remounted (page switch) meanwhile.
                if (this.dumper !== dumper) {
                    return;
                }
                if (dumper.diagnose() === "no-dump") {
                    void this.handleStaleRuntime();
                }
            }, 2500);
        }

        componentDidMount() {
            this.createPageRuntime();
        }

        componentDidUpdate() {
            // Mirrors lvgl/Page.tsx exactly, so page switches behave identically.
            if (this.runtime) {
                this.runtime.unmount();
                this.runtime = undefined;
            }
            this.sink?.teardown();
            this.sink = undefined;
            this.createPageRuntime();
        }

        componentWillUnmount() {
            setTimeout(() => {
                this.selectionDisposer?.();
                this.selectionDisposer = undefined;
                this.runtime?.unmount();
                this.sink?.teardown();
                this.dumper?.dispose();
                this.sink = undefined;
                this.dumper = undefined;
                this.runtime = undefined;
                this.scene = undefined;
            });
        }

        private wasmModule(): SceneDumpWasm | undefined {
            const wasm = (this.runtime as unknown as { wasm?: unknown })?.wasm;
            return wasm as SceneDumpWasm | undefined;
        }

        private displayWidth(): number {
            const width = this.props.page.width;
            return typeof width === "number" && !isNaN(width) && width >= 1 ? width : 1;
        }

        private displayHeight(): number {
            const height = this.props.page.height;
            return typeof height === "number" && !isNaN(height) && height >= 1
                ? height
                : 1;
        }

        render() {
            // Read the same observables the canvas component reads, so this component reacts to
            // them exactly as the canvas surface did.
            this.context.project.settings.general.lvglVersion;
            this.context.project.settings.general.darkTheme;

            const width = this.displayWidth();
            const height = this.displayHeight();
            const page = ProjectEditor.getPage(
                this.props.flowContext.document.flow.object
            );

            // `this.context` is the ProjectStore itself; the display settings live on the
            // flowContext's projectStore (same source the canvas component reads).
            const general = this.props.flowContext.projectStore.project.settings.general;

            // The canvas viewport decorations, re-expressed as CSS on the <svg>.
            const style: React.CSSProperties = {
                imageRendering:
                    this.props.flowContext.viewState.transform.scale > 2
                        ? "pixelated"
                        : "auto",
            };

            if (
                !(page && page.isUsedAsUserWidget) &&
                (general.circularDisplay || general.displayBorderRadius != 0)
            ) {
                style.borderRadius = general.circularDisplay
                    ? Math.min(width, height)
                    : general.displayBorderRadius;
                style.border = `1px solid ${
                    settingsController.isDarkTheme ? "#444" : "#eee"
                }`;
                style.transform = "translate(-1px, -1px)";
            }

            return (
                <svg
                    ref={this.svgRef}
                    className="lvgl-svg"
                    width={width}
                    height={height}
                    viewBox={`0 0 ${width} ${height}`}
                    style={style}
                    onPointerDown={this.handlePointerDown}
                />
            );
        }
    }
);
