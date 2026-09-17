/**
 * P4 — legacy route → unified designer redirects.
 *
 * The mapping is pure (`app/router/legacyRedirects.ts`), so it is pinned here instead of by clicking
 * through the router. The assertions that matter are:
 *
 *  1. the **query survives verbatim** — `?open=`'s value contains `/` and `.` and must not be
 *     re-encoded differently, and the `svg*` flags decide whether the LVGL SVG surface is used;
 *  2. the legacy HVAC path segment is a **document id** in the new route;
 *  3. unrelated paths (including `/t3000/design` and the new route itself) resolve to `undefined`, so
 *     the redirect can never shadow a real page.
 */
import { describe, expect, it } from "vitest";

import {
    LEGACY_DESIGNER_ROUTES,
    legacyRedirectTarget
} from "../../../src/t3-react/app/router/legacyRedirects";

describe("legacy designer redirects", () => {
    it("sends the legacy HVAC route to the HVAC document, with and without an id", () => {
        expect(legacyRedirectTarget("/t3000/hvac-designer", "")).toBe(
            "/t3000/designer/hvac-schematic"
        );
        expect(legacyRedirectTarget("/t3000/hvac-designer/42", "")).toBe(
            "/t3000/designer/hvac-schematic/42"
        );
    });

    it("carries the query over verbatim (it drives open/create and the SVG harness)", () => {
        expect(
            legacyRedirectTarget("/t3000/hvac-designer/42", "?svg=1&iconScale=2")
        ).toBe("/t3000/designer/hvac-schematic/42?svg=1&iconScale=2");

        const open = "?open=project/T3-LB-ESP_SN1028/T3-LB-ESP_SN1028.eez-project";
        expect(legacyRedirectTarget("/t3000/eez", open)).toBe(
            `/t3000/designer/lvgl-9-5${open}`
        );

        expect(legacyRedirectTarget("/t3000/eez", "?svg=1&svgDiff=1")).toBe(
            "/t3000/designer/lvgl-9-5?svg=1&svgDiff=1"
        );

        const create = "?new=LVGL&name=Demo&location=/userData&createDirectory=false";
        expect(legacyRedirectTarget("/t3000/eez", create)).toBe(
            `/t3000/designer/lvgl-9-5${create}`
        );

        expect(legacyRedirectTarget("/t3000/eez", "?examples=1&type=lvgl&folder=_allExamples")).toBe(
            "/t3000/designer/lvgl-9-5?examples=1&type=lvgl&folder=_allExamples"
        );
    });

    it("tolerates a search that arrives without the leading '?'", () => {
        expect(legacyRedirectTarget("/t3000/eez", "svg=1")).toBe(
            "/t3000/designer/lvgl-9-5?svg=1"
        );
    });

    it("round-trips an encoded document id (drawing ids come from the database)", () => {
        const parsed = legacyRedirectTarget("/t3000/hvac-designer/a%2Fb", "");
        expect(parsed).toBe("/t3000/designer/hvac-schematic/a%2Fb");
    });

    it("never matches a path it does not own", () => {
        for (const path of [
            "/t3000/design",
            "/t3000/design/projects/1",
            "/t3000/designer/hvac-schematic",
            "/t3000/designer/lvgl-9-5",
            "/t3000/hvac-designerx",
            "/t3000/eezx",
            "/",
            "/t3000/designer/lcd-ui"
        ]) {
            expect(legacyRedirectTarget(path, ""), path).toBeUndefined();
        }
    });

    it("targets only kinds the shell can actually render", () => {
        // A redirect to an unregistered kind renders the shell's "not available yet" state.
        expect(LEGACY_DESIGNER_ROUTES.map((route) => route.kind)).toEqual([
            "hvac-schematic",
            "lvgl-9-5",
            "lcd-ui"
        ]);
    });

    it("sends the legacy simulator route to the LCD document (P5)", () => {
        expect(legacyRedirectTarget("/t3000/tstat10-simulator", "")).toBe(
            "/t3000/designer/lcd-ui"
        );
    });
});
