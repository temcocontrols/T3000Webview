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
    RUNTIME_EDITORS_TABSET_ID,
    eezRegionPlan,
    projectEezLayout,
    projectedPanelIds,
    stripPanels
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

    it("reports a side's border apart from its own column", () => {
        /*
         * The regression this exists for: the shell drew `region.panels` — the **union** — in one strip, so
         * the right panel held eight tabs (Properties + the border's seven) in a 228 px strip and five of
         * them could not be reached. The old page draws the border as its own rotated bar on the window edge,
         * which is what `border` + `stripPanels` reproduce.
         */
        const projection = projectEezLayout(model());

        expect(stripPanels(projection.right).map((p) => p.id)).toEqual([PROPERTIES_TAB_ID]);
        expect(projection.right.border?.panels.map((p) => p.id)).toEqual([
            "styles",
            "fonts",
            "bitmaps",
            "themes",
            "lvgl-groups",
            "variables"
        ]);
        // Nothing is dropped: the flat list still holds the union (the shell keeps it for the flat path).
        expect(projection.right.panels).toHaveLength(7);

        // The left side mirrors it: the navigation column in the strip, the border's five tabs in the bar.
        expect(projection.left.border?.panels.map((p) => p.id)).toEqual([
            "texts",
            "scpi",
            "instrument-commands",
            "iext",
            "changes"
        ]);
        expect(stripPanels(projection.left).map((p) => p.id)).toEqual([
            "PAGES",
            "WIDGETS",
            "ACTIONS",
            "COMPONENTS_PALETTE"
        ]);
        // …and the structure pane stays where it was: a second column, not part of the strip.
        expect(projection.left.secondary?.panels.map((p) => p.name)).toEqual(["Widgets Structure"]);

        // The bottom dock has no rail: its border *is* the dock's own strip.
        expect(projection.bottom.border).toBeUndefined();
    });

    it("reads a border's own selection, which is how the bar opens and closes", () => {
        const layout = model();
        const right = () => projectEezLayout(layout).right.border;

        // A border starts closed — no selection, so no column beside the bar.
        expect(right()?.activeTabId).toBeUndefined();

        // `SELECT_TAB` is the action flexlayout applies to a border, and it **toggles** (`Model.js`: the
        // `BorderNode` branch clears the selection when the tab is already the selected one).
        layout.doAction(FlexLayout.Actions.selectTab("styles"));
        expect(right()?.activeTabId).toBe("styles");

        layout.doAction(FlexLayout.Actions.selectTab("styles"));
        expect(right()?.activeTabId).toBeUndefined();
    });

    /**
     * The left area is **three areas**, not one tab list: `Pages|User Widgets|User Actions` stacked above
     * `Components Palette`, with `Widgets Structure` in a column beside them. Drawing all of that as a single
     * strip is what made the left panel's bottom area and its second column disappear, so the structure is
     * pinned here — for the template and for the *live* model, which is a different nesting shape.
     */
    it("keeps the left area's stack: sections in model order, with the model's weights", () => {
        const projection = projectEezLayout(model());

        expect(projection.left.sections?.map((section) => section.panels.map((p) => p.id))).toEqual([
            ["PAGES", "WIDGETS", "ACTIONS"],
            ["COMPONENTS_PALETTE"]
        ]);
        // The weights are what the shell splits the body by until the user drags the splitter.
        expect(projection.left.sections?.map((section) => section.weight)).toEqual([0.8, 1.7]);
        // Each group keeps its own selection.
        expect(projection.left.sections?.[0].activeTabId).toBe("PAGES");
        expect(projection.left.sections?.[1].activeTabId).toBe("COMPONENTS_PALETTE");
    });

    it("keeps the left area's second column as the region's secondary", () => {
        const projection = projectEezLayout(model());

        expect(projection.left.secondary?.panels.map((p) => p.name)).toEqual(["Widgets Structure"]);
        expect(projection.left.secondary?.panels[0].component).toBe("flow-structure");
        // The two columns' weights share one scale, and flexlayout *normalises* sibling weights — so what the
        // document really uses is their ratio (here the template's 1.65 : 1.25, the live model's 18.43 : 13.97
        // gives the same number).
        const ratio = projection.left.secondaryWeight! / projection.left.bodyWeight!;
        expect(ratio).toBeCloseTo(1.25 / 1.65, 3);
    });

    it("flattens a single-tabset side exactly as before (no sections, no secondary)", () => {
        const projection = projectEezLayout(model());

        expect(projection.right.sections).toBeUndefined();
        expect(projection.right.secondary).toBeUndefined();
        expect(projection.bottom.sections).toBeUndefined();
        expect(projection.bottom.secondary).toBeUndefined();
    });

    it("reads the live model's shape (a bare row of tabsets) the same way as the template's", () => {
        // Measured on the running app: the left border is empty, the left area is a row of two tabsets and
        // `Widgets Structure` is a top-level sibling — no wrapper rows at all.
        const liveShaped = FlexLayout.Model.fromJson({
            global: {},
            borders: [
                { type: "border", location: "top", children: [] },
                { type: "border", location: "right", size: 240, children: [] },
                { type: "border", location: "bottom", children: [] },
                { type: "border", location: "left", size: 240, children: [] }
            ],
            layout: {
                type: "row",
                children: [
                    {
                        type: "row",
                        weight: 18.43,
                        children: [
                            {
                                type: "tabset",
                                weight: 0.8,
                                enableClose: false,
                                children: [{ type: "tab", id: "PAGES", name: "Pages", component: "pages" }]
                            },
                            {
                                type: "tabset",
                                weight: 1.7,
                                enableClose: false,
                                children: [
                                    {
                                        type: "tab",
                                        id: "COMPONENTS_PALETTE",
                                        name: "Components Palette",
                                        component: "componentsPalette"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        type: "tabset",
                        weight: 13.97,
                        enableClose: false,
                        children: [
                            { type: "tab", id: "structure", name: "Widgets Structure", component: "flow-structure" }
                        ]
                    },
                    {
                        type: "tabset",
                        weight: 47.6,
                        id: EDITORS_TABSET_ID,
                        enableClose: false,
                        children: [
                            { type: "tab", id: "EDITOR_TAB", name: "start_up_screen", component: "editor" }
                        ]
                    },
                    {
                        type: "tabset",
                        weight: 20,
                        enableClose: false,
                        children: [
                            { type: "tab", id: PROPERTIES_TAB_ID, name: "Properties", component: "propertiesPanel" }
                        ]
                    }
                ]
            }
        } as any);

        const projection = projectEezLayout(liveShaped);

        expect(projection.left.sections?.map((section) => section.panels.map((p) => p.id))).toEqual([
            ["PAGES"],
            ["COMPONENTS_PALETTE"]
        ]);
        expect(projection.left.secondary?.panels.map((p) => p.id)).toEqual(["structure"]);
        // The columns' own weights (18.43 : 13.97, live) are what the document turns into widths — the same
        // ratio as the template's 1.65 : 1.25, which is why both nesting shapes size the panels identically.
        expect(projection.left.bodyWeight).toBeCloseTo(18.43, 2);
        expect(projection.left.secondaryWeight).toBeCloseTo(13.97, 2);
        // The *flat* list is still the union of every area, in draw order.
        expect(projection.left.panels.map((p) => p.id)).toEqual([
            "PAGES",
            "COMPONENTS_PALETTE",
            "structure"
        ]);
        expect(projection.right.panels.map((p) => p.id)).toEqual([PROPERTIES_TAB_ID]);
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

    /**
     * EEZ swaps `layoutModels.root` per mode (`store/layout-models.tsx:226-234`): `rootEditor`, then
     * `rootRuntime` for Run/Debug, then `rootDockerSimulator` for Full Sim. The shell projects whichever
     * model is the root *now*, so the two other models have to be read correctly — they have no
     * *Properties* tab at all, which is why the sides are classified by position against the canvas.
     */
    describe("the other two root models", () => {
        /** `rootRuntime` — Run/Debug, verbatim from `layout-models.tsx`. */
        const runtimeModel = () =>
            FlexLayout.Model.fromJson({
                global: {},
                layout: {
                    type: "row",
                    children: [
                        {
                            type: "row",
                            weight: 0,
                            width: 320,
                            children: [
                                {
                                    type: "tabset",
                                    weight: 1,
                                    children: [
                                        { type: "tab", id: "PAGES", name: "Pages", component: "pages" },
                                        { type: "tab", id: "WIDGETS", name: "User Widgets", component: "widgets" },
                                        { type: "tab", id: "ACTIONS", name: "User Actions", component: "actions" }
                                    ]
                                },
                                {
                                    type: "tabset",
                                    weight: 1,
                                    children: [
                                        { type: "tab", name: "Active Flows", component: "active-flows" }
                                    ]
                                },
                                {
                                    type: "tabset",
                                    weight: 2,
                                    children: [{ type: "tab", name: "Watch", component: "watch" }]
                                }
                            ]
                        },
                        {
                            type: "tabset",
                            weight: 1,
                            id: RUNTIME_EDITORS_TABSET_ID,
                            enableClose: false,
                            enableDeleteWhenEmpty: false,
                            children: []
                        },
                        {
                            type: "row",
                            weight: 0,
                            width: 320,
                            children: [
                                {
                                    type: "tabset",
                                    weight: 1,
                                    children: [
                                        { type: "tab", id: "QUEUE", name: "Queue", component: "queue" },
                                        { type: "tab", id: "BREAKPOINTS", name: "Breakpoints", component: "breakpoints" }
                                    ]
                                },
                                {
                                    type: "tabset",
                                    weight: 2,
                                    children: [
                                        { type: "tab", id: "DEBUGGER-LOGS", name: "Logs", component: "logs" }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            } as any);

        it("puts the runtime's right-hand column on the right, though it holds no Properties tab", () => {
            const projection = projectEezLayout(runtimeModel());

            // By *component*: EEZ leaves several of these tabs without an id, so flexlayout generates one.
            expect(projection.left.panels.map((p) => p.component)).toEqual([
                "pages",
                "widgets",
                "actions",
                "active-flows",
                "watch"
            ]);
            expect(projection.right.panels.map((p) => p.component)).toEqual([
                "queue",
                "breakpoints",
                "logs"
            ]);
            // The right column stacks its two tabsets (flexlayout alternates the split with depth).
            expect(projection.right.sections?.map((section) => section.panels.map((p) => p.component))).toEqual([
                ["queue", "breakpoints"],
                ["logs"]
            ]);
            // No borders in this model: no rail, no bottom dock.
            expect(projection.left.border).toBeUndefined();
            expect(projection.right.border).toBeUndefined();
            expect(projection.bottom.panels).toEqual([]);
        });

        it("recognises the runtime canvas tabset while it is still empty", () => {
            const projection = projectEezLayout(runtimeModel());

            /*
             * The tabset EEZ adds the runtime's editor tab to is declared empty, and the switch to Run mode
             * projects the model *before* EEZ fills it — so the id is the only signal there is. Identifying it
             * by contents instead sent the runtime's Page/Widgets tree into no region at all and the right-hand
             * column to the left.
             */
            expect(projection.canvasTabsetId).toBe(RUNTIME_EDITORS_TABSET_ID);
            expect(projectedPanelIds(projection)).not.toContain(RUNTIME_EDITORS_TABSET_ID);
        });

        /** `rootDockerSimulator` — Full Sim: the preview is the canvas, the logs are the right column. */
        const dockerSimulatorModel = () =>
            FlexLayout.Model.fromJson({
                global: {},
                layout: {
                    type: "row",
                    children: [
                        {
                            type: "tabset",
                            weight: 70,
                            enableTabStrip: true,
                            children: [
                                {
                                    type: "tab",
                                    id: "DOCKER_SIMULATOR_PREVIEW",
                                    name: "Preview",
                                    component: "dockerSimulatorPreview"
                                }
                            ]
                        },
                        {
                            type: "row",
                            weight: 30,
                            children: [
                                {
                                    type: "tabset",
                                    weight: 50,
                                    children: [
                                        {
                                            type: "tab",
                                            id: "DOCKER_SIMULATOR_LOGS",
                                            name: "Build Logs",
                                            component: "dockerSimulatorLogs"
                                        }
                                    ]
                                },
                                {
                                    type: "tabset",
                                    weight: 50,
                                    children: [
                                        {
                                            type: "tab",
                                            id: "PREVIEW-LOGS",
                                            name: "Preview Logs",
                                            component: "dockerSimulatorPreviewLogs"
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            } as any);

        it("leaves Full Sim with no left region at all, and the preview as the canvas", () => {
            // One instance for both: flexlayout generates a fresh id per parse, so a second `fromJson` would
            // answer with a different tabset id.
            const model = dockerSimulatorModel();
            const projection = projectEezLayout(model);

            // The document drops a region whose projection is empty, so this is "no left panel" — not an
            // empty one taking 295 px of the window.
            expect(projection.left.panels).toEqual([]);
            expect(projection.right.panels.map((p) => p.component)).toEqual([
                "dockerSimulatorLogs",
                "dockerSimulatorPreviewLogs"
            ]);

            // The preview is a *panel* tabset, not the editor tabset, and it is the canvas.
            expect(projection.canvasTabsetId).toBe(model.getRoot().getChildren()[0].getId());
            expect(projectedPanelIds(projection)).not.toContain("DOCKER_SIMULATOR_PREVIEW");
        });

        it("falls back to the Properties rule for a model whose canvas cannot be identified", () => {
            // A hand-made model: no editor tabset anywhere, so only the contents can say which side is which.
            const handMade = FlexLayout.Model.fromJson({
                global: {},
                layout: {
                    type: "row",
                    children: [
                        {
                            type: "tabset",
                            children: [{ type: "tab", id: "PAGES", name: "Pages", component: "pages" }]
                        },
                        {
                            type: "tabset",
                            children: [
                                { type: "tab", id: PROPERTIES_TAB_ID, name: "Properties", component: "propertiesPanel" }
                            ]
                        }
                    ]
                }
            } as any);

            const projection = projectEezLayout(handMade);

            expect(projection.canvasTabsetId).toBeNull();
            expect(projection.left.panels.map((p) => p.id)).toEqual(["PAGES"]);
            expect(projection.right.panels.map((p) => p.id)).toEqual([PROPERTIES_TAB_ID]);
        });
    });

    describe("the region plan for each mode", () => {
        /*
         * Straight from the origin: `ProjectEditor.Content` returns the runtime page **before** it looks at the
         * layout model when the runtime is on without the debugger, so Run draws the page alone. Mirrored as
         * "the panels of the model", Run showed the *debugger's* layout (Active Flows · Watch | Queue · Logs) —
         * which is what the user reported as "still showing left and right panels".
         */
        it("gives Run the whole area, even though a model exists", () => {
            expect(eezRegionPlan("run", model())).toBe("canvas-only");
        });

        it("projects the panels for edit, debug and the full simulator", () => {
            expect(eezRegionPlan("edit", model())).toBe("projected");
            expect(eezRegionPlan("debug", model())).toBe("projected");
            expect(eezRegionPlan("full-sim", model())).toBe("projected");
        });

        it("falls back to placeholders when there is no model to mirror", () => {
            // Dropping the regions there is what left an *empty* window with no way back, so "unknown" must
            // never mean "no panels".
            expect(eezRegionPlan("none", undefined)).toBe("placeholders");
            expect(eezRegionPlan("edit", undefined)).toBe("placeholders");
            expect(eezRegionPlan("full-sim", null)).toBe("placeholders");
        });
    });
});
