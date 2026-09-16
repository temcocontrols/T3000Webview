/**
 * LVGL 9 SVG renderer — module barrel.
 *
 * ADDITIVE: new file. Import from "project-editor/lvgl/svg" from app code; the test suite
 * imports the individual modules by relative path (vitest has no `project-editor` alias).
 *
 * P2 scope (this folder today): the pure scene contract, the renderer and the DOM sink.
 * P1 adds `scene-dump.ts`; P3 adds `svg-context.ts`, `page-runtime-svg.ts` and
 * `LVGLSvgPage.tsx`.
 */

export {
    SCENE_VERSION,
    SCENE_PART_NAMES,
    SceneParseError,
    alphaOf,
    degreesOf,
    isScenePartName,
    parseScene,
    walkScene,
    zoomOf,
} from "./scene";

export type {
    Scene,
    SceneArc,
    SceneBg,
    SceneBgImage,
    SceneBorder,
    SceneClip,
    SceneColorFilter,
    SceneGradient,
    SceneImage,
    SceneLine,
    SceneObject,
    SceneOutline,
    ScenePart,
    ScenePartName,
    ScenePartState,
    SceneRadius,
    SceneRect,
    SceneScroll,
    SceneShadow,
    SceneText,
    SceneTransform,
} from "./scene";

export { hiddenSubtree } from "./scene";

export { renderScene } from "./svg-renderer";

export { SvgSink, createSvgRoot } from "./svg-sink";

export type {
    DefNode,
    DefTag,
    DrawAttrs,
    DrawNode,
    DrawTag,
    RenderOutput,
    SvgSinkOptions,
} from "./svg-sink";

export {
    WIRE_PART_NAMES,
    PART_PAINT_ORDER,
    SceneDump,
    borderSideName,
    imageAlignName,
    parseSceneDump,
    wireToScene,
} from "./scene-dump";

export type {
    SceneDumpWasm,
    SceneWidgetInfo,
    SceneWidgetLookup,
    WireScene,
} from "./scene-dump";

export { createSvgContext, isSvgContext } from "./svg-context";

export type { SvgContextHooks } from "./svg-context";

export {
    LVGLSvgNonActivePageViewerRuntime,
    LVGLSvgPageEditorRuntime,
} from "./page-runtime-svg";

export type { SvgPipeline, SvgPaintFailure } from "./page-runtime-svg";

export {
    hitTestElement,
    isAdditiveClick,
    nextSelection,
    selectionAction,
} from "./hit-test";

export type {
    PointerHit,
    PointerModifiers,
    SelectionAction,
} from "./hit-test";

export { renderSelectionOverlay } from "./overlay";
export type { SelectionOverlayStyle } from "./overlay";

export { POLL_INTERVAL_MS, isSceneUnchanged, shouldDumpScene } from "./paint-policy";

export {
    hasWasmExportName,
    inspectLvglRuntimeArtifacts,
    lvglRuntimeArtifactUrls,
    refreshLvglRuntimeArtifacts,
} from "./runtime-artifacts";

export { installLvglRuntimeCacheGuard, stampArtifactUrl } from "./runtime-cache-guard";

export { LVGLSvgPage } from "./LVGLSvgPage";

export {
    SVG_RENDERER_STORAGE_KEY,
    SVG_RENDERER_SUPPORTED_VERSION,
    isSvgDiffEnabled,
    isSvgRendererEnabled,
    isSvgStatsEnabled,
    parseSvgOverride,
    setSvgRendererEnabled,
} from "./feature-flag";

export {
    BOX_SLACK_PX,
    INK_THRESHOLD,
    MIN_INK_PX,
    TIER_THRESHOLDS,
    TIER_TOLERANCE,
    boxOffsetPx,
    compareInk,
    countInkEdges,
    diffImages,
    pixelAllowancePx,
    rectIoU,
    rowFromDiff,
    scorecardToMarkdown,
    summariseScorecard,
    tierForObject,
    toleranceForTier,
    verdictFor,
} from "./svg-diff";

export type { DiffResult, InkEdges, InkMaskResult, RgbaImage, ScorecardRow, Verdict } from "./svg-diff";

export {
    captureCanvas,
    captureSvg,
    decidingMetric,
    describeHarnessResult,
    describeSkippedObjects,
    runFidelityHarness,
} from "./svg-diff-harness";

export type { HarnessInput, HarnessResult } from "./svg-diff-harness";
