/**
 * DesignerLayout — the designer's own **main layout** (route-level).
 *
 * It sits *inside* `MinimalLayout`, so the 32 px app menu bar above it is untouched and stays where it
 * is: that bar belongs to the app, not to the designer.
 *
 * Below the menu bar this layout owns the whole page as four areas plus two optional ones:
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ TOP AREA      identity + view (32 px) · tools (36 px)            │
 *   ├──────────┬──────────────────────────────────────┬──────────────┤
 *   │ LEFT     │ MIDDLE  ← the document renders here  │ RIGHT        │
 *   ├──────────┴──────────────────────────────────────┴──────────────┤
 *   │ BOTTOM AREA (optional dock)                                     │
 *   ├─────────────────────────────────────────────────────────────────┤
 *   │ STATUS AREA (24 px strip)                                       │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * The areas exist **before** any document does, which is the point: opening an LCD after an HVAC swaps
 * the *contents* of the areas, never the page's shape. Documents cannot add a bar of their own — they
 * publish a `LayoutSpec` through `documentSlot` and the layout draws it.
 *
 * Two ordering rules are load-bearing here:
 *
 *  1. The document's runtime is read from the slot and matched against the **route key**, so a
 *     document that is being replaced can never leave its panels on screen for a paint.
 *  2. `setDesignerFrameReady` is a *layout* effect: it runs after the areas are in the DOM and before
 *     the browser paints, which is exactly when a document may start resolving engine containers and
 *     portal targets that live in those areas (`useDesignerFrameReady`).
 */
import React, { useLayoutEffect, useMemo } from "react";
import { Outlet, useParams } from "react-router-dom";

import { DesignerShell } from "../features/designer/components/DesignerShell";
import { DESIGNER_DOCUMENTS } from "../features/designer/registry";
import { DOCUMENT_KIND_SPECS, isDocumentKind } from "../features/designer/kinds";
import type { DocumentAdapter, DocumentRuntime } from "../features/designer/DocumentAdapter";
import {
    designerDocumentKey,
    setDesignerFrameReady,
    useDesignerDocument
} from "../features/designer/documentSlot";
import type { DesignerDocumentEntry } from "../features/designer/documentSlot";

export const DesignerLayout: React.FC = () => {
    const params = useParams<{ kind?: string; id?: string }>();

    const kindParam = params.kind;
    const id = params.id;
    const kind = isDocumentKind(kindParam) ? kindParam : undefined;

    /** A kind with a registered host gets the frame; anything else is the document's own business. */
    const framed = !!kind && !!DESIGNER_DOCUMENTS[kind];
    const key = kind ? designerDocumentKey(kind, id) : "";

    const published = useDesignerDocument();
    const active: DesignerDocumentEntry | null = published && published.key === key ? published : null;

    // The handshake back to the document: "the areas for your key are committed, you may touch DOM".
    useLayoutEffect(() => {
        setDesignerFrameReady(active ? key : null);
        return () => setDesignerFrameReady(null);
    }, [active, key]);

    /**
     * While no document has published yet (a lazy chunk still loading, a project still booting) the
     * frame is drawn *empty but present*, so the page never collapses into a bare bar and the areas
     * keep their sizes.
     */
    const placeholder = useMemo<DocumentRuntime>(
        () => ({
            layout: {},
            title: kind ? DOCUMENT_KIND_SPECS[kind].title : "Designer"
        }),
        [kind]
    );

    const placeholderAdapter = useMemo<DocumentAdapter | null>(
        () => (kind ? { kind, engine: DOCUMENT_KIND_SPECS[kind].engine } : null),
        [kind]
    );

    if (!framed) {
        /*
         * An unknown or unimplemented kind: `DesignerPage` renders the explanation, and it must get the
         * whole page — framing it inside a middle area would dress a "not a document type" message up
         * as a document.
         */
        return <Outlet />;
    }

    const runtime = active?.runtime ?? placeholder;
    const adapter = active?.adapter ?? (placeholderAdapter as DocumentAdapter);

    /*
     * The frame's element type must not depend on the slot, or React would unmount and rebuild the
     * whole designer — engine included — the moment a document publishes its layout. A document that
     * needs context above the panels (LVGL's `ProjectContext`) provides it *inside* its own specs
     * (`top.tools`, each region tab's content) instead of wrapping the frame.
     */
    return (
        <DesignerShell
            adapter={adapter}
            runtime={runtime}
        >
            <Outlet />
        </DesignerShell>
    );
};
