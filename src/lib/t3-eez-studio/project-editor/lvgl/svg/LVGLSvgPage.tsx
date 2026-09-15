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
import type { Scene } from "./scene";
import type { SceneRect } from "./scene";
import { SvgSink } from "./svg-sink";
import { createSvgContext } from "./svg-context";
import { hitTestElement, nextSelection, selectionAction } from "./hit-test";
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

    return { lookup, flowObjectIds };
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
        /** Re-draws the overlay when the editor selection changes. */
        private selectionDisposer: (() => void) | undefined;
        /** P5 harness: offscreen copy of the LVGL framebuffer, only when `?svgDiff=1`. */
        private harnessMirror: HTMLCanvasElement | undefined;
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
            this.flowObjectIds = index.flowObjectIds;
            const pipeline: SvgPipeline = {
                sink: this.sink,
                dumper: this.dumper,
                lookup: index.lookup,
                onPainted: (scene, ms) => {
                    // The overlay frames are derived from the resolved LVGL areas, so it must be
                    // redrawn whenever the scene changes (move, resize, page switch).
                    this.scene = scene;
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
            const wanted = new Set(ids);
            const selectedPtrs = new Set<number>();
            for (const [ptr, flowObjectId] of this.flowObjectIds) {
                if (wanted.has(flowObjectId)) {
                    selectedPtrs.add(ptr);
                }
            }
            sink.setOverlay(renderSelectionOverlay(scene.objects, selectedPtrs));
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
         * Run the fidelity comparison and report it.
         *
         * Rows are built from the *scene* (which parts exist and where LVGL put them) crossed with the
         * SVG nodes the renderer produced, so a failure names a widget and a part instead of just
         * "some pixels differ".
         */
        private async runHarness(scene: Scene, patchMs: number): Promise<void> {
            const mirror = this.harnessMirror;
            const svg = this.svgRef.current;
            if (!mirror || !svg || this.harnessRunning) {
                return;
            }
            this.harnessRunning = true;
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
                 * Every descendant's box, per object, for the row exclusions. One pass over the flat
                 * scene: a child is appended to each of its ancestors, so a nested grandchild is
                 * excluded from its parent's row as well as from its grandparent's.
                 */
                const byPtr = new Map(scene.objects.map(object => [object.ptr, object]));
                const descendants = new Map<number, SceneRect[]>();
                for (const object of scene.objects) {
                    let ancestor = object.parentPtr;
                    for (let depth = 0; ancestor != null && depth < 32; depth++) {
                        const list = descendants.get(ancestor);
                        if (list) {
                            list.push(object.area);
                        } else {
                            descendants.set(ancestor, [object.area]);
                        }
                        ancestor = byPtr.get(ancestor)?.parentPtr;
                    }
                }
                const objects = scene.objects.map(object => {
                    const node = svg.querySelector(`[data-ptr="${object.ptr}"]`);
                    const box = (node as SVGGraphicsElement | null)?.getBBox?.();
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
                        nodeRect: box
                            ? { x: box.x, y: box.y, w: box.width, h: box.height }
                            : undefined,
                        tier: tierForObject(tierInput),
                        note: tierNote(tierInput),
                        /*
                         * A container's box contains its children's drawing, so measuring it over the
                         * whole box reports its children's deltas a second time — under every ancestor
                         * (measured: `holiday_calender_screen`'s panel at 22% while the only wrong thing
                         * inside it was the calendar). Subtracting the descendants leaves the
                         * container's own chrome, and each descendant is still measured on its own row.
                         */
                        exclude: descendants.get(object.ptr),
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
                console.warn(
                    `[lvgl-svg] harness failed: ${(error as Error).message}`
                );
            } finally {
                this.harnessRunning = false;
            }
        }

        /**
         * Click-to-select. The SVG surface is the only place where LVGL objects have DOM presence,
         * so this is where a click can actually identify a widget; it then goes through the existing
         * selection actions (`viewState`), which is what keeps undo/redo, the property panel and the
         * widgets tree in sync without any parallel selection model.
         */
        private handlePointerDown = (
            event: React.PointerEvent<SVGSVGElement>
        ): void => {
            const viewState = this.props.flowContext.viewState as unknown as {
                selectedObjects?: Array<{ id: string }>;
                selectObjects?: (objects: unknown[]) => void;
                deselectAllObjects?: () => void;
            };
            if (!viewState?.selectObjects || !viewState.deselectAllObjects) {
                return;
            }

            const hit = hitTestElement(event.target as Element);
            const flowObjectId = hit
                ? this.flowObjectIds.get(hit.ptr ?? -1) ?? hit.objId
                : undefined;
            const current = this.selectedFlowObjectIds();
            const alreadySelected =
                flowObjectId !== undefined && current.indexOf(flowObjectId) !== -1;
            const action = selectionAction(event, alreadySelected);
            const next = nextSelection(action, current, flowObjectId);

            if (next.length === 0) {
                viewState.deselectAllObjects();
            } else {
                const adapters = next
                    .map(id => this.props.flowContext.document.findObjectById(id))
                    .filter(adapter => !!adapter);
                viewState.selectObjects(adapters);
            }
            this.updateOverlay(next);
        };

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
            };
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
