/**
 * Designer route links — every link the app builds must use `designerPath`.
 *
 * The redirects (`app/router/legacyRedirects.ts`) exist so *old bookmarks* keep working; they are not a
 * navigation layer. A legacy literal in a link site still "works" (via the redirect), which is exactly why
 * this needs a test instead of a code review: the failure mode is a silent extra hop plus a route that no
 * longer matches the URL the menus and breadcrumbs resolved.
 *
 * The two directions must not drift — a hub card and a bookmark for the same drawing have to land on the
 * same document.
 */
import { describe, expect, it } from "vitest";

import { designerPath, isDocumentKind } from "../../../src/t3-react/features/designer/kinds";
import { legacyRedirectTarget } from "../../../src/t3-react/app/router/legacyRedirects";
import { DRAWING_TYPES } from "../../../src/t3-react/features/design-hub/drawingTypes";

const DESIGNER_BASE = "/t3000/designer/";

describe("designer route links", () => {
    it("builds exactly what the legacy redirect would have produced", () => {
        expect(designerPath("hvac-schematic")).toBe(legacyRedirectTarget("/t3000/hvac-designer", ""));
        expect(designerPath("hvac-schematic", "42")).toBe(
            legacyRedirectTarget("/t3000/hvac-designer/42", "")
        );
        expect(designerPath("lvgl-9-5")).toBe(legacyRedirectTarget("/t3000/eez", ""));
        expect(designerPath("lcd-ui")).toBe(legacyRedirectTarget("/t3000/tstat10-simulator", ""));
    });

    it("keeps a link's query byte-for-byte, exactly like the redirect does", () => {
        for (const search of [
            "?open=project/T3-LB-ESP_SN1028/T3-LB-ESP_SN1028.eez-project",
            "?new=LVGL&name=Demo&location=/userData&createDirectory=false",
            "?svg=1&svgDiff=1",
            "?examples=1&type=lvgl&folder=_allExamples"
        ]) {
            expect(`${designerPath("lvgl-9-5")}${search}`, search).toBe(
                legacyRedirectTarget("/t3000/eez", search)
            );
        }
    });

    it("gives every drawing type a designer openPath on a registered kind", () => {
        expect(DRAWING_TYPES.length).toBeGreaterThan(0);
        for (const type of DRAWING_TYPES) {
            expect(type.openPath, `${type.id} openPath`).toMatch(/^\/t3000\/designer\/[a-z0-9-]+$/);

            const kind = type.openPath.slice(DESIGNER_BASE.length);
            // A type pointing at an unregistered kind lands on the shell's "not available yet" state.
            expect(isDocumentKind(kind), `${type.id} → ${kind}`).toBe(true);
        }
    });

    it("routes the LVGL types to their own kinds (flow edits get the Flow panel)", () => {
        const byId = (id: string) => DRAWING_TYPES.find((t) => t.id === id)?.openPath;

        expect(byId("hvac-schematic")).toBe(designerPath("hvac-schematic"));
        expect(byId("lcd-ui")).toBe(designerPath("lcd-ui"));
        expect(byId("lvgl-9-5")).toBe(designerPath("lvgl-9-5"));
        // The legacy `/t3000/eez` URL could not express this — it had to fall back to plain LVGL.
        expect(byId("lvgl-flow-9-5")).toBe(designerPath("lvgl-flow-9-5"));
    });

    it("encodes ids in links the same way the redirect parses them", () => {
        expect(designerPath("hvac-schematic", "a/b")).toBe("/t3000/designer/hvac-schematic/a%2Fb");
        expect(legacyRedirectTarget("/t3000/hvac-designer/a%2Fb", "")).toBe(
            designerPath("hvac-schematic", "a/b")
        );
    });
});
