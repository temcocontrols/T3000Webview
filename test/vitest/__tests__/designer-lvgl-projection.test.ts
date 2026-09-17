/**
 * P2 — `projectEezLayout`: EEZ's FlexLayout model → the shell's regions.
 *
 * This is the piece that decides *where every panel goes*, so it is tested against a fixture that
 * mirrors EEZ's real `LayoutModels.rootEditor` JSON (borders + the nested left column + `EDITORS` +
 * the right tabset, npm `flexlayout-react` builds a plain model from it — no DOM, no mobx).
 *
 * The assertions that matter:
 *  1. every panel in the model appears in exactly one region (nothing is dropped silently);
 *  2. the palettes/structure panes that EEZ stacks in the left column become left-region tabs;
 *  3. the editor tabset is the canvas, and it is **not** treated as a panel;
 *  4. the projection is safe on an empty model (the document renders before a project opens).
 */
import { describe, expect, it } from "vitest";
import * as FlexLayout from "flexlayout-react";

import {
    EDITORS_TABSET_ID,
    PROPERTIES_TAB_ID,
    projectEezLayout,
    projectedPanelIds
} from "../../../src/t3-react/features/designer/documents/lvgl/projectEezLayout";

/** Mirrors `layout-models.tsx`: borders (left/right/bottom) + the root row. */
function fixtureJson() {
    return {
        global: {},
        borders: [
            { type: "border", location: "top", children: [] },
            {
                type: "border",
                location: "right",
                size: 240,
                children: [
                    { type: "tab", id: "styles", name: "Styles", component: "styles", enableClose: false },
                    { type: "tab", id: "fonts", name: "Fonts", component: "fonts", enableClose: false },
                    { type: "tab", id: "bitmaps", name: "Bitmaps", component: "bitmaps", enableClose: false },
                    { type: "tab", id: "themes", name: "Themes", component: "themesSideView", enableClose: false },
                    { type: "tab", id: "lvgl-groups", name: "LVGL Groups", component: "lvgl-groups", enableClose: false },
                    { type: "tab", id: "variables", name: "Variables", component: "variables", enableClose: false }
                ]
            },
            {
                type: "border",
                location: "bottom",
                children: [
                    { type: "tab", id: "CHECKS", name: "Checks", component: "checksMessages", enableClose: false },
                    { type: "tab", id: "OUTPUT", name: "Output", component: "outputMessages", enableClose: false },
                    { type: "tab", id: "SEARCH", name: "Search", component: "search", enableClose: false },
                    { type: "tab", id: "REFERENCES", name: "References", component: "references", enableClose: false }
                ]
            },
            {
                type: "border",
                location: "left",
                size: 240,
                children: [
                    { type: "tab", id: "texts", name: "Texts", component: "texts", enableClose: false },
                    { type: "tab", id: "scpi", name: "Scpi", component: "scpi", enableClose: false },
                    { type: "tab", id: "instrument-commands", name: "Instrument commands", component: "instrument-commands", enableClose: false },
                    { type: "tab", id: "iext", name: "Extensions", component: "extension-definitions", enableClose: false },
                    { type: "tab", id: "changes", name: "Changes", component: "changes", enableClose: false }
                ]
            }
        ],
        layout: {
            type: "row",
            children: [
                {
                    type: "row",
                    weight: 32.4,
                    children: [
                        {
                            type: "row",
                            weight: 1,
                            children: [
                                {
                                    type: "row",
                                    weight: 1.65,
                                    children: [
                                        {
                                            type: "tabset",
                                            weight: 0.8,
                                            enableClose: false,
                                            children: [
                                                { type: "tab", id: "PAGES", name: "Pages", component: "pages", enableClose: false },
                                                { type: "tab", id: "WIDGETS", name: "User Widgets", component: "widgets", enableClose: false },
                                                { type: "tab", id: "ACTIONS", name: "User Actions", component: "actions", enableClose: false }
                                            ]
                                        },
                                        {
                                            type: "tabset",
                                            weight: 1.7,
                                            enableClose: false,
                                            children: [
                                                { type: "tab", id: "COMPONENTS_PALETTE", name: "Components Palette", component: "componentsPalette", enableClose: false }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    type: "tabset",
                                    weight: 1.25,
                                    enableClose: false,
                                    children: [
                                        { type: "tab", name: "Widgets Structure", component: "flow-structure", enableClose: false }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    type: "tabset",
                    weight: 47.6,
                    enableClose: false,
                    id: EDITORS_TABSET_ID,
                    children: [
                        {
                            type: "tab",
                            id: "EDITOR_TAB",
                            name: "start_up_screen",
                            component: "editor",
                            enableClose: false,
                            config: { objectPath: "pages[0]", params: undefined, permanent: false }
                        }
                    ]
                },
                {
                    type: "tabset",
                    weight: 20,
                    enableClose: false,
                    children: [
                        { type: "tab", id: PROPERTIES_TAB_ID, name: "Properties", component: "propertiesPanel", enableClose: false }
                    ]
                }
            ]
        },
        activeTabsetId: EDITORS_TABSET_ID
    };
}

const model = () => FlexLayout.Model.fromJson(fixtureJson());

describe("projectEezLayout", () => {
    it("puts every model panel in exactly one region", () => {
        const projection = projectEezLayout(model());

        const ids = projectedPanelIds(projection);
        // 3 (pages/widgets/actions) + palette + structure + properties + 6 right-border + 4 bottom + 5 left-border
        expect(ids).toHaveLength(3 + 1 + 1 + 1 + 6 + 4 + 5);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("maps the left column tabsets (and the left border) to the left region", () => {
        const projection = projectEezLayout(model());

        // Borders are projected first because that is EEZ's visual order: the left border is the
        // outermost strip and the navigation column sits inside it.
        const ids = projection.left.panels.map((p) => p.id);
        expect(ids).toEqual([
            "texts",
            "scpi",
            "instrument-commands",
            "iext",
            "changes",
            "PAGES",
            "WIDGETS",
            "ACTIONS",
            "COMPONENTS_PALETTE",
            // the structure pane has no id in EEZ's JSON — flexlayout generates one
            projection.left.panels[9].id
        ]);

        const structure = projection.left.panels[9];
        expect(structure.name).toBe("Widgets Structure");
        expect(structure.component).toBe("flow-structure");
        // the first tabset's selection is the region's default
        expect(projection.left.activeTabId).toBe("PAGES");
    });

    it("maps the properties tabset and the right border to the right region", () => {
        const projection = projectEezLayout(model());

        expect(projection.right.panels[0]).toEqual({
            id: PROPERTIES_TAB_ID,
            name: "Properties",
            component: "propertiesPanel"
        });
        expect(projection.right.panels.map((p) => p.id)).toEqual([
            "PROPERTIES",
            "styles",
            "fonts",
            "bitmaps",
            "themes",
            "lvgl-groups",
            "variables"
        ]);
        expect(projection.right.activeTabId).toBe(PROPERTIES_TAB_ID);
    });

    it("maps the bottom dock to the bottom region", () => {
        const projection = projectEezLayout(model());
        expect(projection.bottom.panels.map((p) => p.id)).toEqual([
            "CHECKS",
            "OUTPUT",
            "SEARCH",
            "REFERENCES"
        ]);
    });

    it("reports the editor tabset as the canvas and never as a panel", () => {
        const projection = projectEezLayout(model());

        // The editors tabset is identified by the tab it holds (`component === "editor"`), which is how
        // the live model can be recognised even after flexlayout regenerates an id.
        expect(projection.canvasTabsetId).toBeTruthy();
        expect(typeof projection.canvasTabsetId).toBe("string");
        expect(projectedPanelIds(projection)).not.toContain(projection.canvasTabsetId);
        // the editor tab itself is never projected as a panel either
        expect(projectedPanelIds(projection)).not.toContain("EDITOR_TAB");
    });

    it("is safe on an empty or missing model (the document renders before a project opens)", () => {
        for (const value of [undefined, null, FlexLayout.Model.fromJson({ global: {}, layout: { type: "row", children: [] } } as any)]) {
            const projection = projectEezLayout(value as any);
            expect(projection.left.panels).toEqual([]);
            expect(projection.right.panels).toEqual([]);
            expect(projection.bottom.panels).toEqual([]);
            expect(projection.canvasTabsetId).toBeNull();
        }
    });
});
