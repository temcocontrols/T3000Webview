/**
 * Designer — the LCD document's hosting plumbing (P5).
 *
 * Two small contracts make the LCD designer's panels live in the shell's regions while the *page* keeps
 * owning their state and rendering them:
 *
 *  1. the shell draws a region's `secondary` column on the side the document asks for — the LCD needs it
 *     on the `end` so its Toolbox · Pages · Canvas order survives (`start` is the historical default);
 *  2. the slots announce mount/unmount, because a portal targets an element: after a Design ⇄ View switch
 *     the shell re-creates the slots and the page must re-resolve them. Without the counter the page list
 *     came back empty (measured: 0 list items instead of 7).
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { DesignerShell } from "../../../src/t3-react/features/designer/components/DesignerShell";
import type { DocumentAdapter, DocumentRuntime, ShellLayout } from "../../../src/t3-react/features/designer/DocumentAdapter";
import {
    LCD_SLOTS,
    getLcdSlotsVersion,
    noteLcdSlotsChanged,
    subscribeLcdSlots
} from "../../../src/t3-react/features/tstat10-simulator/hostedSlots";
import {
    getLcdMode,
    publishLcdMode,
    subscribeLcdMode
} from "../../../src/t3-react/features/tstat10-simulator/modePublisher";

const adapter: DocumentAdapter = { kind: "lcd-ui", engine: "simulator" };

function runtimeWith(layout: ShellLayout): DocumentRuntime {
    return { layout, title: "LCD" };
}

/** A left region with a body and a secondary column on the requested side. */
function layoutWithSecondary(side?: "start" | "end"): ShellLayout {
    return {
        canvas: { node: <div>canvas-marker</div> },
        left: {
            id: "left",
            tabs: [{ id: "widgets", label: "Widgets", header: "never", content: () => <div>body-marker</div> }],
            activeTabId: "widgets",
            onSelectTab: () => undefined,
            width: { default: 310, min: 260, max: 420 },
            collapsible: false,
            secondary: {
                id: "pages",
                content: () => <div>secondary-marker</div>,
                defaultWidth: 140,
                min: 120,
                max: 240,
                side
            }
        }
    };
}

describe("secondary column side", () => {
    it("puts it after the body for `end` (the LCD order: Toolbox · Pages · Canvas)", () => {
        const markup = renderToStaticMarkup(
            <DesignerShell adapter={adapter} runtime={runtimeWith(layoutWithSecondary("end"))} />
        );
        expect(markup.indexOf("body-marker")).toBeLessThan(markup.indexOf("secondary-marker"));
    });

    it("puts it before the body for `start`, and that stays the default", () => {
        for (const side of ["start", undefined] as const) {
            const markup = renderToStaticMarkup(
                <DesignerShell adapter={adapter} runtime={runtimeWith(layoutWithSecondary(side))} />
            );
            expect(markup.indexOf("secondary-marker")).toBeLessThan(markup.indexOf("body-marker"));
        }
    });
});

describe("lcd mode publisher", () => {
    it("starts in design mode", () => {
        expect(getLcdMode()).toBe("design");
    });

    it("notifies subscribers on a change, and not on a repeat", () => {
        const seen = vi.fn();
        const unsubscribe = subscribeLcdMode(seen);

        publishLcdMode("view");
        expect(getLcdMode()).toBe("view");
        expect(seen).toHaveBeenCalledTimes(1);

        publishLcdMode("view");
        expect(seen).toHaveBeenCalledTimes(1);

        publishLcdMode("design");
        expect(seen).toHaveBeenCalledTimes(2);

        unsubscribe();
        publishLcdMode("view");
        expect(seen).toHaveBeenCalledTimes(2);

        publishLcdMode("design");
    });
});

describe("lcd slots", () => {
    it("bumps its version whenever the shell's slots change", () => {
        const before = getLcdSlotsVersion();
        const seen = vi.fn();
        const unsubscribe = subscribeLcdSlots(seen);

        noteLcdSlotsChanged();
        expect(getLcdSlotsVersion()).toBe(before + 1);
        expect(seen).toHaveBeenCalledTimes(1);

        unsubscribe();
        noteLcdSlotsChanged();
        expect(seen).toHaveBeenCalledTimes(1);
        expect(getLcdSlotsVersion()).toBe(before + 2);
    });

    it("names the three slots the page portals into", () => {
        expect(Object.values(LCD_SLOTS)).toEqual(["lcd-slot-toolbox", "lcd-slot-pages", "lcd-slot-properties"]);
    });
});
