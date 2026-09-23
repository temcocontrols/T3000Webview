/**
 * Designer — the HVAC document on the unified shell.
 *
 * ADDITIVE BY DESIGN: this file does not change any existing page. `/t3000/hvac-designer` keeps
 * rendering the original `HvacDesignerPage`; this document is only reachable through the new
 * `/t3000/designer/hvac-schematic/:id?` route.
 *
 * Differences from the legacy page, all deliberate:
 *  - the engine is initialised exactly ONCE per mount, guarded against React StrictMode's double
 *    effect invoke (`main.tsx:17` enables StrictMode) — the HVAC engine cannot be re-initialised;
 *  - the canvas element is memoised, so panel toggles / state changes never remount it;
 *  - loading and error states are drawn as an overlay INSIDE the shell, so the engine always finds
 *    its DOM (the legacy page early-returns and unmounts the drawing area instead);
 *  - the fixed 150 ms / 400 ms / 50 ms relayout timers are kept (they get the first frame right) but
 *    are now complemented by a ResizeObserver-driven notification from the shell.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Spinner, Text } from "@fluentui/react-components";
import Hvac from "@/lib/t3-hvac";
import T3Gv from "@/lib/t3-hvac/Data/T3Gv";
import SelectUtil from "@/lib/t3-hvac/Opt/Opt/SelectUtil";
import ObjectUtil from "@/lib/t3-hvac/Opt/Data/ObjectUtil";
import ToolActUtil from "@/lib/t3-hvac/Opt/Opt/ToolActUtil";
import { setStatusName, setStatusPos } from "@/lib/t3-hvac/Data/Constant/RefConstant";

import { ToolsPanel } from "@t3-react/features/hvac-designer/components/toolbar/ToolsPanel";
import { HvacDrawingArea } from "@t3-react/features/hvac-designer/components/HvacDrawingArea";
import { T3ContextMenu } from "@t3-react/features/hvac-designer/components/T3ContextMenu";
import { useDrawing } from "@t3-react/features/hvac-designer/hooks/useDrawing";
import { useStatusMessage } from "@t3-react/features/hvac-designer/hooks/useStatusMessage";
import { useHvacDesignerStore } from "@t3-react/features/hvac-designer/store/designerStore";

import type { DocumentAdapter, DocumentRuntime, MountContext, ShellLayout } from "../../DocumentAdapter";
import type { DocumentHostProps } from "../../registry";
import {
    designerDocumentKey,
    publishDesignerDocument,
    releaseDesignerDocument,
    useDesignerFrameReady
} from "../../documentSlot";
import type { DesignerDocumentEntry } from "../../documentSlot";
import { useEnginePoll } from "../../hooks/useEnginePoll";
import { statusPublisher } from "../../statusPublisher";
import { HvacPropertiesPanel } from "./HvacPropertiesPanel";
import { hvacToolGroups } from "./hvacToolGroups";
import { useHvacAutoRecord } from "./useHvacAutoRecord";
import { hvacViewport } from "./hvacViewport";
import { hvacHistoryCommands } from "./hvacCommands";
import { viewportCommands } from "../../commands/viewportCommands";
import { useRegisterCommands } from "../../commands/CommandBus";
import { canvasIdsOf, makeAreaIds } from "./hvacAreaIds";
import type { HvacAreaIdMap } from "./hvacAreaIds";
import { AreaIds } from "@/lib/t3-hvac/Data/Constant/AreaIds";

export const HVAC_DOCUMENT_KIND = "hvac-schematic" as const;

const fillHeight: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    width: "100%",
    overflow: "hidden"
};

let areaIdSequence = 0;

/**
 * This document OWNS the engine's container-id table while it is mounted.
 *
 * The ids are set in a **layout** effect, which React runs before passive effects — i.e. before the
 * engine initialises and before any runtime lookup (tools panel, thumbnail capture, menu actions).
 * Unmounting restores the historical ids, so the legacy page always finds its own containers.
 */
function useDocumentAreaIds(): HvacAreaIdMap {
    const [ids] = useState(() => makeAreaIds(`d${++areaIdSequence}`));

    useLayoutEffect(() => {
        AreaIds.set(ids);
        return () => AreaIds.reset();
    }, [ids]);

    return ids;
}

/* ------------------------------------------------------------------ engine lifecycle */

/**
 * The engine's lifecycle.
 *
 * `ready` is the frame-ready handshake with `DesignerLayout`: the areas (and the frame root that
 * carries `#main-app`) are committed one pass after this document mounts, and the engine stores
 * `T3Gv.opt.mainAppElement` during init (`UIUtil.InitT3GvOpt`) — initialising before the id exists
 * would leave the Hammer gesture surface null for the whole session.
 */
function useHvacEngine(ids: HvacAreaIdMap, ready: boolean): { refreshLayout: () => void } {
    const initializedRef = useRef(false);
    const aliveRef = useRef(true);

    const refreshLayout = useCallback(() => {
        try {
            const svgDoc = T3Gv?.docUtil?.svgDoc;
            if (svgDoc && svgDoc.docInfo) {
                svgDoc.CalcWorkArea();
                svgDoc.ApplyDocumentTransform();
                if (T3Gv.docUtil) {
                    T3Gv.docUtil.HandleResizeEvent();
                }
            }
        } catch {
            /* relayout is best effort */
        }
    }, []);

    // Teardown lives in its own effect so the init below can be deferred without deferring this.
    useEffect(() => {
        aliveRef.current = true;

        return () => {
            aliveRef.current = false;
            // Deferred so React StrictMode's mount → cleanup → mount cycle does not tear the engine
            // down right after initialising it.
            window.setTimeout(() => {
                if (aliveRef.current) {
                    return;
                }
                try {
                    Hvac.IdxPageReact.clearAutoSaveInterval();
                    Hvac.IdxPageReact.clearIdx();
                    // The engine registered its window listeners for this document (see
                    // `IdxPageReact.initWindowListener`) — release them with the document.
                    Hvac.IdxPageReact.destroyWindowListener();
                } catch {
                    /* teardown is best effort */
                }
            }, 0);
        };
    }, []);

    useEffect(() => {
        if (!ready || initializedRef.current) {
            return;
        }
        initializedRef.current = true;

        try {
            document.getElementById(ids.svgArea)?.replaceChildren();
            document.getElementById(ids.hRuler)?.replaceChildren();
            document.getElementById(ids.vRuler)?.replaceChildren();

            Hvac.UI.Initialize(null);
            Hvac.IdxPageReact.initQuasar(null);
            Hvac.IdxPageReact.initPageReact();

            // Same first-frame nudges the legacy page uses, now that the canvas is guaranteed to
            // be mounted (the overlay approach never unmounts it).
            requestAnimationFrame(refreshLayout);
            window.setTimeout(refreshLayout, 150);
            window.setTimeout(refreshLayout, 400);

            // Seed the status bar with the engine's default selection, as the legacy page does.
            window.setTimeout(() => {
                try {
                    const selectionId = SelectUtil.GetTargetSelect();
                    if (selectionId >= 0) {
                        const object = ObjectUtil.GetObjectPtr(selectionId, false) as any;
                        if (object?.Frame) {
                            const frame = object.Frame;
                            setStatusName(object.ShapeType || "Shape");
                            setStatusPos(
                                frame.x,
                                frame.y,
                                frame.x + frame.width,
                                frame.y + frame.height,
                                frame.width,
                                frame.height
                            );
                        }
                    }
                } catch {
                    /* status seeding is cosmetic */
                }
            }, 500);
        } catch (error) {
            console.error("[Designer] HVAC engine init failed:", error);
        }
    }, [ready, refreshLayout, ids]);

    return { refreshLayout };
}

/* ------------------------------------------------------------------ runtime */

export function useHvacDocumentRuntime(ctx: MountContext, ids: HvacAreaIdMap): DocumentRuntime {
    const { loadDrawing, createNew, isLoading, error } = useDrawing();
    const { name, coords, msg } = useStatusMessage();
    const drawingName = useHvacDesignerStore((state) => state.drawingName);

    // The engine needs the frame to be committed before it can resolve #main-app.
    const ready = useDesignerFrameReady(designerDocumentKey(HVAC_DOCUMENT_KIND, ctx.id));
    const { refreshLayout } = useHvacEngine(ids, ready);

    /*
     * Finish the engine's app-layer registration for a shape that landed without it (the library tools placed by
     * a palette click skip `DrawUtil`'s completion). Without this the properties panel has no record to read its
     * Data and Widget sections from — the legacy flow never needed a manual step because that completion did it.
     */
    useHvacAutoRecord(ready);

    // Load or create the drawing — identical semantics to the legacy page (including the
    // "discard unsaved changes?" confirmation inside `createNew`).
    //
    // NOTE: the dependency array is ONLY the document id, exactly like `HvacDesignerPage.tsx:170`.
    // `useDrawing`'s callbacks are `useCallback`s over the whole zustand store, so their identity
    // changes whenever the store changes — depending on them here makes `createNew()`/`loadDrawing()`
    // retrigger the effect and loop until React throws "Maximum update depth exceeded".
    const documentId = ctx.id;
    const loadOrCreateOnceRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (loadOrCreateOnceRef.current === documentId) {
            return;
        }
        loadOrCreateOnceRef.current = documentId;

        if (documentId) {
            loadDrawing(documentId).catch((loadError) => {
                console.error("[Designer] Failed to load drawing:", loadError);
            });
        } else {
            createNew();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentId]);

    // Publish zoom + save state through the app-wide status contract (name/coords/message are passed
    // as props by the shell, exactly as the legacy page does).
    useEnginePoll(() => {
        const rawZoom = T3Gv?.docUtil?.GetZoomFactor?.();
        const zoom = Math.round((Number.isFinite(rawZoom) ? (rawZoom as number) : 1) * 100);
        const dirty = !!(T3Gv?.opt?.header as any)?.DocIsDirty;
        statusPublisher.set({
            zoom: Number.isFinite(zoom) ? zoom : undefined,
            saved: !dirty
        });
    }, 500);

    const canvas = useMemo(
        () => (
            <div id={ids.workAreaColumn} style={fillHeight}>
                <HvacDrawingArea ids={canvasIdsOf(ids)} />
            </div>
        ),
        [ids]
    );

    // P5 — the band's own `View & Zoom` group owns zoom / rulers / grid through the adapter, so those
    // commands are registered for the **keyboard** (Ctrl+S, Ctrl+0, Ctrl+±) while `shellControls` below
    // stops the shell from drawing a second copy of them.
    useRegisterCommands(useMemo(() => [...hvacHistoryCommands(), ...viewportCommands(hvacViewport)], []));

    const layout = useMemo<ShellLayout>(() => {
        return {
            top: {
                /*
                 * The legacy strip's seven groups (`hvacToolGroups.tsx`), described as data so the band
                 * can measure them, put them on two lines, and fold whatever still does not fit into its
                 * `⋯` menu — instead of clipping them or scrolling the row.
                 */
                groups: hvacToolGroups(),
                /*
                 * `History & Save` and `View & Zoom` are groups again, so the shell's own copies of
                 * those controls would be a second Undo, a second zoom — this switches them off. The
                 * overflow menu keeps only what has no group: the panel layout actions the shell adds.
                 */
                shellControls: { history: false, viewport: false },
                overflow: []
            },
            left: {
                id: "left",
                tabs: [
                    {
                        id: "tools",
                        label: "Tools",
                        /*
                         * `header: "always"` — the panel names itself, exactly as *Properties* does on the right.
                         * It used to opt out (`"never"`) to keep the legacy look, but the pair then read as two
                         * different kinds of panel: one titled, one with a bare group header at the top.
                         */
                        header: "always",
                        content: () => (
                            <div id={ids.leftPanel} style={fillHeight}>
                                <ToolsPanel />
                            </div>
                        )
                    }
                ],
                activeTabId: "tools",
                onSelectTab: () => undefined,
                /*
                 * 105 px, not the legacy palette's 115: the tiles are **icon-only**, so the only thing that
                 * needs the width is the group head's name row — and *NewDuct* is what sets the floor (53 px of
                 * text; with the head trimmed to `gap 3` / `padding 3` and a 12 px count chip, 105 leaves ~4 px
                 * of slack). The user chose this default; it stays draggable to 260.
                 */
                width: { default: 105, min: 90, max: 260 },
                collapsible: true
            },
            frameRootId: ids.mainApp,
            history: {
                canUndo: () => !!T3Gv?.state?.GetUndoState?.().undo,
                canRedo: () => !!T3Gv?.state?.GetUndoState?.().redo,
                undo: () => {
                    ToolActUtil.Undo();
                },
                redo: () => {
                    ToolActUtil.Redo();
                }
            },
            right: {
                id: "right",
                tabs: [
                    {
                        id: "properties",
                        label: "Properties",
                        header: "always",
                        content: () => <HvacPropertiesPanel />
                    }
                ],
                activeTabId: "properties",
                onSelectTab: () => undefined,
                /*
                 * 250 px: the inspector's row is a fixed 84 px label column plus the value, so it wants less
                 * room than the 260 it started on. `max` stays 420 — the sections grow when expanded.
                 */
                width: { default: 250, min: 200, max: 420 },
                collapsible: true
            }
        };
    }, [canvas, ctx, ids]);

    return useMemo<DocumentRuntime>(
        () => ({
            layout,
            title: drawingName || "HVAC Drawing",
            subtitle: documentId ? undefined : "Unsaved new drawing",
            modified: false,
            status: { name, coords, message: msg },
            loading: isLoading ? <Spinner label="Loading drawing..." /> : undefined,
            error: error ? (
                <>
                    <Text size={400} weight="semibold">
                        Failed to load drawing
                    </Text>
                    <Text>{error}</Text>
                    <Text size={200} onClick={() => ctx.navigate("/t3000/design")} style={{ cursor: "pointer" }}>
                        Back to Design Hub
                    </Text>
                </>
            ) : undefined
        }),
        // The object identity is the publish signal: it must change only when something the layout
        // draws changes, never merely because this component re-rendered.
        [layout, drawingName, documentId, name, coords, msg, isLoading, error, ctx]
    );
}

/* ------------------------------------------------------------------ host */

const HVAC_ADAPTER: DocumentAdapter = { kind: HVAC_DOCUMENT_KIND, engine: "hvac", viewport: hvacViewport };

export const HvacDocumentHost: React.FC<DocumentHostProps> = ({ id, query, navigate }) => {
    const ctx = useMemo<MountContext>(
        () => ({
            kind: HVAC_DOCUMENT_KIND,
            id,
            query,
            status: statusPublisher,
            navigate
        }),
        [id, query, navigate]
    );

    const ids = useDocumentAreaIds();
    const runtime = useHvacDocumentRuntime(ctx, ids);

    /*
     * Publish this document to `DesignerLayout`, which owns the areas. The layout re-renders the
     * middle area when the slot changes, so the entry has to be stable across this host's own
     * re-renders (`useHvacDocumentRuntime` returns a memoised object) — otherwise publishing would
     * re-render the host, which would publish again.
     */
    const entry = useMemo<DesignerDocumentEntry>(
        () => ({ key: designerDocumentKey(HVAC_DOCUMENT_KIND, id), adapter: HVAC_ADAPTER, runtime }),
        [id, runtime]
    );

    useLayoutEffect(() => {
        publishDesignerDocument(entry);
    }, [entry]);

    // Teardown only — clearing the slot on every entry change would remount the whole frame.
    useLayoutEffect(() => () => releaseDesignerDocument(designerDocumentKey(HVAC_DOCUMENT_KIND, id)), [id]);

    return (
        <>
            <div id={ids.workAreaColumn} style={fillHeight}>
                <HvacDrawingArea ids={canvasIdsOf(ids)} />
            </div>
            {/* Right-click context menu — watches `ctxMenuConfig` from the core library. */}
            <T3ContextMenu />
        </>
    );
};
