/**
 * Designer — document kinds
 *
 * PURE MODULE: no React, no engine imports, no side effects. It is safe to import from anywhere
 * (including `config/menuConfig.ts`) without pulling the engines into the bundle.
 */

/** Every document type the unified Designer can open. */
export type DocumentKind =
    | "hvac-schematic"
    | "lvgl-9-5"
    | "lvgl-flow-9-5"
    | "lcd-ui";

/** The code that owns the document model. */
export type EngineId = "hvac" | "eez" | "simulator";

export interface DocumentKindSpec {
    kind: DocumentKind;
    engine: EngineId;
    /** Human label, used when no document is open yet and by the "unknown document" state. */
    title: string;
    /** Two-to-five character label for the top area's kind chip ("HVAC", "LVGL", "LCD"). */
    short: string;
    /** False while a kind is registered but not implemented yet (P2/P5). */
    available: boolean;
}

export const DESIGNER_ROUTE_BASE = "/t3000/designer";

/**
 * The single place that lists document types.
 * `available` flips to true as each phase lands (P1: hvac-schematic, P2: lvgl-*, P5: lcd-ui).
 */
export const DOCUMENT_KIND_SPECS: Record<DocumentKind, DocumentKindSpec> = {
    "hvac-schematic": {
        kind: "hvac-schematic",
        engine: "hvac",
        title: "HVAC Drawing",
        short: "HVAC",
        available: true
    },
    "lvgl-9-5": { kind: "lvgl-9-5", engine: "eez", title: "LVGL 9.5 Project", short: "LVGL", available: true },
    "lvgl-flow-9-5": {
        kind: "lvgl-flow-9-5",
        engine: "eez",
        title: "LVGL 9.5 Project (Flow)",
        short: "LVGL",
        available: true
    },
    "lcd-ui": { kind: "lcd-ui", engine: "simulator", title: "LCD Screen", short: "LCD", available: true }
};

export const DOCUMENT_KINDS = Object.keys(DOCUMENT_KIND_SPECS) as DocumentKind[];

export function isDocumentKind(value: string | undefined): value is DocumentKind {
    return !!value && Object.prototype.hasOwnProperty.call(DOCUMENT_KIND_SPECS, value);
}

/**
 * The wording every designer loading state uses for a kind — the route's fallback, a document's own data
 * wait — so the sentence never changes mid-boot: `Loading HVAC Drawing…`, `Loading LVGL 9.5 Project…`.
 *
 * Built from the spec's `title` rather than written out per document, so a renamed title (or a new kind)
 * cannot leave the same load saying two different things.
 */
export function designerLoadingLabel(kind: DocumentKind): string {
    return `Loading ${DOCUMENT_KIND_SPECS[kind].title}…`;
}

export interface DesignerPathInfo {
    kind: DocumentKind;
    /** Optional document id (drawing id / project path). */
    id?: string;
}

/**
 * Parses a `/t3000/designer/<kind>/<id?>` pathname.
 *
 * NOTE: `'/t3000/designer'.startsWith('/t3000/design')` is true, so the caller that resolves menu
 * sets must check the designer prefix BEFORE the Design Hub prefix. `matchDesignerPath` is exported
 * for exactly that purpose (see `config/menuConfig.ts`).
 */
export function matchDesignerPath(pathname: string): DesignerPathInfo | undefined {
    if (pathname !== DESIGNER_ROUTE_BASE && !pathname.startsWith(`${DESIGNER_ROUTE_BASE}/`)) {
        return undefined;
    }

    const rest = pathname.slice(DESIGNER_ROUTE_BASE.length).replace(/^\/+/, "");
    if (!rest) {
        return undefined;
    }

    const [kindSegment, ...idSegments] = rest.split("/");
    if (!isDocumentKind(kindSegment)) {
        return undefined;
    }

    const id = idSegments.length ? decodeURIComponent(idSegments.join("/")) : undefined;
    return { kind: kindSegment, id };
}

/** Builds a canonical designer path (used by links and tests). */
export function designerPath(kind: DocumentKind, id?: string): string {
    return id ? `${DESIGNER_ROUTE_BASE}/${kind}/${encodeURIComponent(id)}` : `${DESIGNER_ROUTE_BASE}/${kind}`;
}
