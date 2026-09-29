/**
 * Designer — public surface of the feature.
 *
 * The shell and the contracts are exported for reuse (and tests); document adapters stay behind the
 * lazy registry so an unused engine never enters the initial bundle.
 */
export { DesignerPage } from "./pages/DesignerPage";
export { DesignerShell } from "./components/DesignerShell";
export { statusPublisher, createStatusPublisher, EDITOR_STATUS_EVENT } from "./statusPublisher";
export { layoutStore, useKindLayout } from "./hooks/useDesignerLayoutStore";
export { DESIGNER_DOCUMENTS } from "./registry";
export type { DocumentHostProps, DocumentEntry } from "./registry";
export type {
    CanvasSpec,
    Command,
    CommandId,
    CommandRegistry,
    DocumentAdapter,
    DocumentRuntime,
    EditorStatus,
    MountContext,
    PanelTab,
    RegionSpec,
    SecondarySpec,
    ShellLayout,
    StatusPublisher,
    TopSpec,
    ViewportAdapter
} from "./DocumentAdapter";
export {
    DOCUMENT_KINDS,
    DOCUMENT_KIND_SPECS,
    DESIGNER_ROUTE_BASE,
    designerPath,
    isDocumentKind,
    matchDesignerPath
} from "./kinds";
export type { DesignerPathInfo, DocumentKind, DocumentKindSpec, EngineId } from "./kinds";
