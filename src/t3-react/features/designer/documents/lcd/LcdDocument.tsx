/**
 * Designer — the LCD/simulator document (`lcd-ui`), the last of the three engines.
 *
 * ADDITIVE BY DESIGN: `/t3000/tstat10-simulator` redirects here (same pattern as P4) and the original
 * page component is reused **unchanged**.
 *
 * ## Why this is the cheap one
 *
 * `Tstat10SimulatorPage` is already a Fluent-`tokens` three-panel designer (Toolbox · Canvas ·
 * Properties, plus a View mode with the bezel and the debug panel). There is no engine to drive: it is
 * pure React state (`useDesignerState`, `useSimulatorState`). So the whole page goes in the canvas slot
 * exactly as it is, and the shell supplies the chrome around it.
 *
 * ## The bug this fixes
 *
 * The page renders its **Design ⇄ View** toggle through
 * `createPortal(..., document.getElementById("page-header-actions"))` (`Tstat10SimulatorPage.tsx:298`).
 * That element only exists under `MainLayout` (`layout/PageHeader.tsx:198`), but the legacy route is
 * mounted under `MinimalLayout` (`app/App.tsx:478`) — so the toggle is `null` and **never renders
 * today**. The shell now provides the target inside its own top bar, which is where the control belongs.
 *
 * Ordering matters for that portal: the page reads `document.getElementById` *during render*, so on the
 * very first commit the target would not be in the DOM yet. The canvas therefore mounts one commit later
 * (`ready` below) — the shell's middle-area host itself is stable, only the page's first render is deferred.
 */
import React, { useEffect, useMemo, useState, useSyncExternalStore, useLayoutEffect } from "react";
import { Spinner } from "@fluentui/react-components";

import { Tstat10SimulatorPage } from "@/t3-react/features/tstat10-simulator/pages/Tstat10SimulatorPage";
import { setLcdPageHosted } from "@/t3-react/features/tstat10-simulator/hostMode";
import { LCD_SLOTS, noteLcdSlotsChanged } from "@/t3-react/features/tstat10-simulator/hostedSlots";
import {
    getLcdMode,
    subscribeLcdMode
} from "@/t3-react/features/tstat10-simulator/modePublisher";

import type { DocumentAdapter, DocumentRuntime, RegionSpec, ShellLayout } from "../../DocumentAdapter";
import type { DocumentHostProps } from "../../registry";
import {
    designerDocumentKey,
    publishDesignerDocument,
    releaseDesignerDocument,
    useDesignerFrameReady
} from "../../documentSlot";
import type { DesignerDocumentEntry } from "../../documentSlot";
import { DOCUMENT_KIND_SPECS } from "../../kinds";

const LCD_ADAPTER: DocumentAdapter = { kind: "lcd-ui", engine: "simulator" };

/** Route identity of this document; the layout matches its published entry against it. */
const LCD_DOCUMENT_KEY = designerDocumentKey("lcd-ui");

/**
 * Where a portalled panel lands. The page resolves these during render, so the shell has to have
 * committed its regions first — and because a portal holds on to the *element*, the slots announce when
 * they mount/unmount so the page can re-resolve after a Design ⇄ View switch.
 */
const Slot: React.FC<{ slot: keyof typeof LCD_SLOTS }> = ({ slot }) => {
    useEffect(() => {
        noteLcdSlotsChanged();
        return () => noteLcdSlotsChanged();
    }, []);

    return (
        <div
            id={LCD_SLOTS[slot]}
            style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}
        />
    );
};

export const LcdDocumentHost: React.FC<DocumentHostProps> = ({ navigate }) => {
    /*
     * The page resolves its portal targets (`#page-header-actions`, the region slots) with
     * `document.getElementById` **during render**, so it may only mount once the layout has committed
     * the areas for this document — hence the frame-ready handshake plus one extra commit.
     */
    const frameReady = useDesignerFrameReady(LCD_DOCUMENT_KEY);
    const [ready, setReady] = useState(false);
    useEffect(() => {
        if (frameReady) {
            setReady(true);
        }
    }, [frameReady]);

    // The page must stop drawing its own panels before it mounts, otherwise each one would exist twice.
    useEffect(() => {
        setLcdPageHosted(true);
        return () => setLcdPageHosted(false);
    }, []);

    // Design mode = the designer's regions; View mode = the simulator layout filling the canvas, exactly
    // as the page draws it today.
    const mode = useSyncExternalStore(subscribeLcdMode, getLcdMode, getLcdMode);

    const layout = useMemo<ShellLayout>(() => {
        const designMode = mode === "design";

        const left: RegionSpec | undefined = designMode
            ? {
                  id: "left",
                  tabs: [{ id: "widgets", label: "Widgets", header: "never", content: () => <Slot slot="toolbox" /> }],
                  activeTabId: "widgets",
                  onSelectTab: () => undefined,
                  // `RegionSpec.width` is the width of the WHOLE region, so it has to cover the toolbox and
                  // the page list beside it (170 + 140 = 310) — otherwise the secondary column eats the
                  // body's share (measured: a 170 region left the toolbox 30 px).
                  width: { default: 310, min: 260, max: 420 },
                  collapsible: true,
                  // The page list sits between the toolbox and the canvas, i.e. on the `end` side.
                  secondary: {
                      id: "pages",
                      content: () => <Slot slot="pages" />,
                      defaultWidth: 140,
                      min: 120,
                      max: 240,
                      side: "end"
                  }
              }
            : undefined;

        const right: RegionSpec | undefined = designMode
            ? {
                  id: "right",
                  tabs: [
                      { id: "properties", label: "Properties", header: "never", content: () => <Slot slot="properties" /> }
                  ],
                  activeTabId: "properties",
                  onSelectTab: () => undefined,
                  width: { default: 240, min: 200, max: 340 },
                  collapsible: true
              }
            : undefined;

        return {
            top: {
                /*
                 * The portal target the simulator page looks up. Rendering it in the shell's tools row
                 * puts the page's own Design/View toggle there (and, before the shell existed, nowhere
                 * at all).
                 */
                tools: (
                    <div
                        id="page-header-actions"
                        style={{ display: "flex", alignItems: "center", gap: "8px" }}
                    />
                )
            },
            left,
            right
        };
    }, [mode]);

    const runtime: DocumentRuntime = useMemo(
        () => ({
            layout,
            title: DOCUMENT_KIND_SPECS["lcd-ui"].title
        }),
        [layout]
    );

    // Publish the document to the layout (stable entry: the layout re-renders this host otherwise).
    const entry = useMemo<DesignerDocumentEntry>(
        () => ({ key: LCD_DOCUMENT_KEY, adapter: LCD_ADAPTER, runtime }),
        [runtime]
    );

    useLayoutEffect(() => {
        publishDesignerDocument(entry);
    }, [entry]);

    // Teardown only — clearing the slot on every entry change would remount the whole frame.
    useLayoutEffect(() => () => releaseDesignerDocument(LCD_DOCUMENT_KEY), []);

    return ready ? <Tstat10SimulatorPage /> : <Spinner label="Loading LCD designer..." />;
};
