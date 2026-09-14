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

export type { SvgPipeline } from "./page-runtime-svg";

export { LVGLSvgPage } from "./LVGLSvgPage";

export {
    SVG_RENDERER_STORAGE_KEY,
    SVG_RENDERER_SUPPORTED_VERSION,
    isSvgRendererEnabled,
    parseSvgOverride,
    setSvgRendererEnabled,
} from "./feature-flag";
