/**
 * Designer / LVGL — "is a project on its way?" (the loading-placeholder label).
 *
 * The label is only cosmetic, but getting it wrong is exactly what the reported bug looked like: while
 * the workspace boots, a slow `?open=` boot and a designer opened with nothing to open both have no
 * `ProjectStore`, so both used to render a bare title bar. The two cases must stay distinguishable, and
 * the create case must mirror `EezStudioApp`'s own rule (`new`/`examples=1` **and** `name`+`location`).
 */
import { describe, expect, it } from "vitest";
import { expectsProject, queryOf } from "../../../src/t3-react/features/designer/documents/lvgl/projectQuery";

describe("queryOf", () => {
    it("returns the query inside a hash route", () => {
        expect(queryOf("#/t3000/designer/lvgl-9-5?open=project/a/b.eez-project")).toBe(
            "open=project/a/b.eez-project"
        );
    });

    it("returns the plain query when the route is not hashed", () => {
        expect(queryOf("/t3000/eez?open=project/a/b.eez-project")).toBe("open=project/a/b.eez-project");
    });

    it("returns empty for a route without a query", () => {
        expect(queryOf("#/t3000/designer/lvgl-9-5")).toBe("");
        expect(queryOf("")).toBe("");
    });
});

describe("expectsProject", () => {
    it("is true for ?open= (the designer/hub hand-off)", () => {
        expect(
            expectsProject("#/t3000/designer/lvgl-9-5?open=project/T3-LB-ESP_SN1028/T3-LB-ESP_SN1028.eez-project")
        ).toBe(true);
    });

    it("is true for ?examples=1 with name+location", () => {
        expect(expectsProject("#/t3000/eez?examples=1&name=Demo&location=project")).toBe(true);
    });

    it("is true for ?new= with name+location", () => {
        expect(expectsProject("#/t3000/eez?new=lvgl&name=Demo&location=project")).toBe(true);
    });

    it("is false for a bare designer route (nothing to open)", () => {
        expect(expectsProject("#/t3000/designer/lvgl-9-5")).toBe(false);
        expect(expectsProject("#/t3000/designer/hvac-schematic/12")).toBe(false);
        expect(expectsProject("")).toBe(false);
    });

    it("is false for a create request missing name/location (EezStudioApp parity)", () => {
        expect(expectsProject("#/t3000/eez?new=lvgl")).toBe(false);
        expect(expectsProject("#/t3000/eez?new=lvgl&name=Demo")).toBe(false);
    });

    it("does not confuse unrelated params with a project hand-off", () => {
        expect(expectsProject("#/t3000/designer/lvgl-9-5?svg=1&svgDiff=1")).toBe(false);
    });
});
