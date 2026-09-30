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
 *  - the drawing area is memoised, so panel toggles / state changes never remount it;
 *  - loading and error states are drawn as an overlay INSIDE the shell, so the engine always finds
 *    its DOM (the legacy page early-returns and unmounts the drawing area instead);
 *  - the fixed 150 ms / 400 ms / 50 ms relayout timers are kept (they get the first frame right) but
 *    are now complemented by a ResizeObserver-driven notification from the shell.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Text } from "@fluentui/react-components";
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
import { DesignerLoading } from "../../components/DesignerLoading";
import { designerLoadingLabel } from "../../kinds";
import { HvacPropertiesPanel } from "./HvacPropertiesPanel";
import { hvacToolGroups } from "./hvacToolGroups";
import { useHvacAutoRecord } from "./useHvacAutoRecord";
import { useHtmlFocusGuard } from "./useHtmlFocusGuard";
import { hvacViewport } from "./hvacViewport";
import { hvacHistoryCommands } from "./hvacCommands";
/*
 * Side-effect import: hands the canvas the point pages' range vocabulary (state words, units) so a widget's
 * label names a state exactly as its own properties panel does. Kept as an import rather than a call so it can
 * never be lost by a later refactor of the init effect. See the module for why the engine needs to be told.
 */
import "./bindingVocabulary";
import { viewportCommands } from "../../commands/viewportCommands";import { useRegisterCommands } from "../../commands/CommandBus";
import { drawingAreaIdsOf, makeAreaIds } from "./hvacAreaIds";
import type { HvacAreaIdMap } from "./hvacAreaIds";
import { AreaIds } from "@/lib/t3-hvac/Data/Constant/AreaIds";
import DataOpt from "@/lib/t3-hvac/Opt/Data/DataOpt";
import { captureCurrentDocument, hasLocalDrawing, prepareEngineDocument, recordDocument } from "@t3-react/features/hvac-designer/services/drawingService";
import type { EngineDocumentSource } from "@t3-react/features/hvac-designer/services/drawingService";
import type { DrawingLoadResult } from "@t3-react/features/hvac-designer/hooks/useDrawing";
import { resolveHvacDocumentId, resolveHvacDocumentName, resolveHvacDocumentSerial } from "./hvacDocumentId";

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
 * How long the designer waits for a record that only exists on disk before starting the engine anyway.
 *
 * The engine must start: with `T3Gv.opt` undefined the whole band is dead (and used to throw). A local
 * service that is down does not fail fast — it stalls — so the wait needs a deadline, not just a `catch`.
 */
const RECORD_LOAD_GRACE_MS = 3000;

/* ------------------------------------------------------------------ record mirror */

/**
 * The open drawing's **record** follows the engine's saves.
 *
 * The engine owns the document and persists it to its own storage; a drawing record (design hub: localStorage
 * index + disk mirror) has to carry that document or the drawing cannot be reopened. Rather than chasing
 * every save entry point (band Save, `Ctrl+S`, the properties panel's four `SaveAct` calls, delete), the
 * engine announces persistence once — `DataOpt.SaveAppStateV2()` is the funnel for all of them — and this
 * mirrors the live document into the record of whichever drawing is open.
 *
 * Debounced, because a single user action can persist more than once, and off unless the canvas is known to
 * be the drawing it would be filed under — see `openDocumentSource`.
 */
let documentPersistTimer: number | undefined;

/**
 * The drawing the running document belongs to — the id and the name the route asked for.
 *
 * Held here rather than read from the store: this is exactly what `prepareEngineDocument` was given, so the
 * mirror cannot file a document under a different drawing than the one the engine was prepared with.
 */
let openDocumentId: string | undefined;
let openDocumentName: string | undefined;
let openDocumentSerial: number | undefined;

/**
 * How the running document was prepared (see `prepareEngineDocument` and `EngineDocumentSource`).
 *
 * `unknown` means the running document does **not** stand for the stored drawing: mirroring then would replace
 * a real drawing with an empty one, so the mirror stays off for that session.
 */
let openDocumentSource: EngineDocumentSource = 'unknown';

function prepareOpenDocument(
    id: string | undefined,
    name: string | undefined,
    serial: number | undefined,
    lookup: DrawingLoadResult | null
): void {
    openDocumentId = id;
    openDocumentName = name;
    openDocumentSerial = serial;
    openDocumentSource = prepareEngineDocument(id);

    /*
     * `prepareEngineDocument` can only see the local index, so with no record there it says `unknown` — the
     * safe assumption for a document it did not seed. The record lookup settles it: a *missing* answer means
     * the drawing does not exist yet, so this empty canvas **is** that new drawing and its saves belong in its
     * record (`fresh`). An *unavailable* answer stays `unknown`: the stored drawing was never seen, so nothing
     * of ours may be written over it.
     */
    if (openDocumentSource === 'unknown' && lookup === 'missing') {
        openDocumentSource = 'fresh';
    }
}

function persistOpenDocument(): void {
    if (documentPersistTimer) {
        window.clearTimeout(documentPersistTimer);
    }

    documentPersistTimer = window.setTimeout(() => {
        documentPersistTimer = undefined;
        try {
            if (openDocumentSource !== 'record' && openDocumentSource !== 'fresh') {
                return;
            }
            if (!openDocumentId) {
                return;
            }
            const document = captureCurrentDocument();
            if (!document) {
                return;
            }
            // Creates the record on the drawing's first save — see `recordDocument`.
            recordDocument(openDocumentId, document, {
                name: openDocumentName,
                serialNumber: openDocumentSerial
            });
        } catch {
            /* mirroring must never break the editor */
        }
    }, 400);
}

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
function useHvacEngine(
    ids: HvacAreaIdMap,
    ready: boolean,
    prepareDocument?: () => void
): { refreshLayout: () => void } {
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

    /*
     * Re-lay out the drawing area after the shell moved or resized it (a panel collapsed/expanded, the dock
     * toggled, the window resized) — published to the shell as `onAreaResize`.
     *
     * `DocUtil.UpdateWorkArea` is the engine's own answer to "the area is now this big": it sizes and positions
     * the svg area inside the available rect, then re-reads the work area, re-clamps the scroll and re-applies
     * the document transform. Two things it must do for the panels to behave:
     *
     *   · the element must **fit** the area. Measured 2026-09-29: with the right panel open the middle host
     *     clips the svg area, and since the element owns the scrollbar, the right-hand end of the drawing —
     *     including the scrollbar itself — became unreachable. Only a resize fixes that;
     *   · the numbers the engine converts clicks with must be re-read *after* that resize, which
     *     `UpdateWorkArea` does (`CalcWorkArea` runs after the CSS is applied). Measured before this wiring:
     *     collapsing the left panel moved the area 189.9 → 112.8 while `dispX` stayed 189.9 four seconds later,
     *     so every click was off by the panel's width.
     *
     * What it deliberately does NOT do is touch the document extent (`docWidth/docHeight`) — that is not the
     * user's to change, and changing it on a panel toggle is what made a placed shape land away from the
     * cursor. The drawing keeps its coordinates and its zoom; only the surface is re-fitted.
     */
    const relayoutArea = useCallback(() => {
        try {
            T3Gv?.docUtil?.UpdateWorkArea?.();
        } catch {
            /* a failed relayout must not break the editor */
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
                    // This document is going away: the next one arms its own mirror.
                    DataOpt.documentPersistHook = null;

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

            /*
             * Seed the engine's storage **before** it initialises: `Initialize` restores the document from
             * those keys, so a document prepared afterwards would only show on the next load. This is
             * synchronous on purpose — the record lives in localStorage, and the engine must never wait on
             * the network to start (a stalled request used to leave `T3Gv.opt` undefined and every tool
             * click threw).
             */
            prepareDocument?.();

            Hvac.UI.Initialize(null);
            Hvac.IdxPageReact.initQuasar(null);
            Hvac.IdxPageReact.initPageReact();

            /*
             * From here on every save the engine makes belongs to the drawing that was prepared above —
             * mirror it back into that drawing's record (`persistOpenDocument` skips the mirror when the
             * record could not be read, so an empty document can never overwrite a stored drawing).
             */
            DataOpt.documentPersistHook = persistOpenDocument;

            // Same first-frame nudges the legacy page uses, now that the drawing area is guaranteed to
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
    }, [ready, refreshLayout, ids, prepareDocument]);

    return { refreshLayout, relayoutArea };
}

/* ------------------------------------------------------------------ runtime */

export function useHvacDocumentRuntime(ctx: MountContext, ids: HvacAreaIdMap): DocumentRuntime {
    const { loadDrawing, createNew, isLoading, error } = useDrawing();
    const { name, coords, msg } = useStatusMessage();
    const drawingName = useHvacDesignerStore((state) => state.drawingName);

    // The engine needs the frame to be committed before it can resolve #main-app.
    const frameReady = useDesignerFrameReady(designerDocumentKey(HVAC_DOCUMENT_KIND, ctx.id));

    /*
     * WHICH DRAWING THIS IS. The path segment when the route carries one, otherwise the device/graphic the
     * Hub's *Create & Open* navigates with (`hvacDocumentId.ts` explains why that pair has to become an id).
     * Everything below — the wait, the engine's storage, the record the save is mirrored into — must use this
     * id, and not `ctx.id`, or a drawing opened from the Hub would have no identity at all.
     *
     * `designerDocumentKey` above deliberately keeps `ctx.id`: that key names the *route slot* the shell
     * publishes, and the shell computes it from the route's own params (`DesignerLayout.tsx:54`).
     */
    const documentId = useMemo(() => resolveHvacDocumentId(ctx.id, ctx.query), [ctx.id, ctx.query]);
    const documentName = useMemo(() => resolveHvacDocumentName(ctx.query), [ctx.query]);
    const documentSerial = useMemo(() => resolveHvacDocumentSerial(ctx.query), [ctx.query]);

    /*
     * …and it must not start before the drawing's document is known. That is decided from localStorage
     * (`prepareEngineDocument`, run synchronously just before the engine initialises):
     *   · the record is in this browser       → no wait at all;
     *   · the record only exists on disk      → wait for `loadDrawing`, which fetches and caches it …
     *   · … but never longer than the grace   → a stalled request must not leave the engine unstarted.
     */
    const hasLocalRecord = useMemo(() => (documentId ? hasLocalDrawing(documentId) : false), [documentId]);
    const [recordRequestSettled, setRecordRequestSettled] = useState(false);
    const waitingForRecord = Boolean(documentId) && !hasLocalRecord && !recordRequestSettled;
    const engineReady = frameReady && !waitingForRecord;

    /*
     * How that lookup ended — the one fact `prepareEngineDocument` cannot have, and the reason it can tell
     * "no record exists yet" apart from "the record could not be read" only here (see `prepareOpenDocument`).
     */
    const recordLookupRef = useRef<DrawingLoadResult | null>(null);

    const prepareDocument = useCallback(
        () => prepareOpenDocument(documentId, documentName, documentSerial, recordLookupRef.current),
        [documentId, documentName, documentSerial]
    );
    const { relayoutArea } = useHvacEngine(ids, engineReady, prepareDocument);

    /*
     * Finish the engine's app-layer registration for a shape that landed without it (the library tools placed by
     * a palette click skip `DrawUtil`'s completion). Without this the properties panel has no record to read its
     * Data and Widget sections from — the legacy flow never needed a manual step because that completion did it.
     */
    useHvacAutoRecord(engineReady);

    // Load or create the drawing — identical semantics to the legacy page (including the
    // "discard unsaved changes?" confirmation inside `createNew`).
    //
    // NOTE: the dependency array is ONLY the document id, exactly like `HvacDesignerPage.tsx:170`.
    // `useDrawing`'s callbacks are `useCallback`s over the whole zustand store, so their identity
    // changes whenever the store changes — depending on them here makes `createNew()`/`loadDrawing()`
    // retrigger the effect and loop until React throws "Maximum update depth exceeded".
    const loadOrCreateOnceRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (loadOrCreateOnceRef.current === documentId) {
            return;
        }
        loadOrCreateOnceRef.current = documentId;

        /*
         * This fills the React store (name, shape list, dirty flag) and caches a record that only existed on
         * disk — which is what makes the engine's *synchronous* prepare above find it, here or on the next
         * open. The engine is started by the effect above, not by this promise, except while
         * `waitingForRecord` is true — and that wait has the grace timer below as its ceiling.
         *
         * `allowMissing` is what makes a drawing that does not exist yet a normal first open instead of an
         * error screen. Its outcome is recorded because only this lookup can tell "no record exists" from
         * "the record could not be read", and `prepareOpenDocument` needs that to decide whether the canvas
         * may be mirrored into the record (see `EngineDocumentSource`).
         */
        const prepare = async (): Promise<DrawingLoadResult> => {
            if (!documentId) {
                createNew();
                return 'missing';
            }

            const result = await loadDrawing(documentId, { allowMissing: true });

            if (result !== 'loaded') {
                /*
                 * No record in this browser (and, when the store answered, none on disk either): the drawing
                 * is new — but its **identity** is the route's, so give the store that name and device now.
                 * The canvas keeps the id it will be saved under, and the header stops calling a drawing the
                 * user created "Unsaved new drawing".
                 */
                const store = useHvacDesignerStore.getState();
                store.loadDrawing(documentId, [], []);
                if (documentName) {
                    store.setDrawingName(documentName);
                }
            }

            return result;
        };

        const recordGraceTimer = window.setTimeout(() => {
            setRecordRequestSettled(true);
        }, RECORD_LOAD_GRACE_MS);

        prepare()
            .then((result) => {
                recordLookupRef.current = result;
            })
            .catch((loadError) => {
                console.error("[Designer] Failed to load drawing:", loadError);
            })
            .finally(() => {
                window.clearTimeout(recordGraceTimer);
                setRecordRequestSettled(true);
            });
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

    const drawingArea = useMemo(
        () => (
            <div id={ids.workAreaColumn} style={fillHeight}>
                <HvacDrawingArea ids={drawingAreaIdsOf(ids)} />
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
    }, [drawingArea, ctx, ids]);

    return useMemo<DocumentRuntime>(
        () => ({
            layout,
            title: drawingName || "HVAC Drawing",
            subtitle: documentId ? undefined : "Unsaved new drawing",
            modified: false,
            status: { name, coords, message: msg },
            // The shell draws this in its overlay — the same node and the same wording the route fallback
            // uses, so the wait for the drawing looks like a continuation of the wait for the chunk.
            loading: isLoading ? <DesignerLoading label={designerLoadingLabel(HVAC_DOCUMENT_KIND)} /> : undefined,
            // Panels moving the drawing area must not leave the surface clipped or the mapping stale.
            onAreaResize: relayoutArea,
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
        [layout, drawingName, documentId, name, coords, msg, isLoading, error, ctx, relayoutArea]
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
     * Close the engine's typing gate while any shell input owns the keyboard (origin parity —
     * `SDUI.MainController.AcceptHTMLText`). Without it, a text object left in edit mode also consumed
     * whatever was typed into the Properties panel, and that text landed in the drawing.
     */
    useHtmlFocusGuard();

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
                <HvacDrawingArea ids={drawingAreaIdsOf(ids)} />
            </div>
            {/* Right-click context menu — watches `ctxMenuConfig` from the core library. */}
            <T3ContextMenu />
        </>
    );
};
