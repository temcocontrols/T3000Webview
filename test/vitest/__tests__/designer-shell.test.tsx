/**
 * Unified Designer shell 鈥?structural tests.
 *
 * These pin the decisions that are cheap to break and expensive to notice:
 *  1. the designer route must not be swallowed by the Design Hub menu branch (a one-character bug
 *     with a 100 % visible symptom);
 *  2. a document's loading state must NEVER unmount the canvas 鈥?the HVAC engine cannot be
 *     re-initialised and the EEZ app owns a second React root (risks.md R1/R7);
 *  3. a one-tab region with `header: "never"` renders no chrome, which is what keeps the HVAC
 *     document looking like the existing page;
 *  4. the shell must not import an engine.
 *
 * Rendering uses `react-dom/server` on purpose: the repo has no @testing-library dependency, and
 * every assertion here is structural. Effects (engine init) are covered by the manual verification
 * steps in docs/t3000/architecture/designer/verification.md.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import {
    DESIGNER_ROUTE_BASE,
    DOCUMENT_KINDS,
    DOCUMENT_KIND_SPECS,
    designerPath,
    isDocumentKind,
    matchDesignerPath
} from "../../../src/t3-react/features/designer/kinds";
import {
    getKindLayout,
    layoutStore,
    resolveRegionWidth
} from "../../../src/t3-react/features/designer/hooks/useDesignerLayoutStore";
import { DesignerShell } from "../../../src/t3-react/features/designer/components/DesignerShell";
import { RegionPanelHead, regionHeadContent } from "../../../src/t3-react/features/designer/components/RegionPanelHead";
import { RAIL_BAR_WIDTH, RegionRail } from "../../../src/t3-react/features/designer/components/RegionRail";
import {
    MenuEntry,
    ToolGroupInline,
    toolIcon,
    toolTinted
} from "../../../src/t3-react/features/designer/components/ShellToolItems";
import {
    ShellTopBar,
    TOP_ROW_HEIGHT,
    TOOL_LINE_HEIGHT,
    fitGroupCount,
    liveSignature
} from "../../../src/t3-react/features/designer/components/ShellTopBar";
import { DESIGNER_DOCUMENTS } from "../../../src/t3-react/features/designer/registry";
import {
    canvasIdsOf,
    makeAreaIds
} from "../../../src/t3-react/features/designer/documents/hvac/hvacAreaIds";
import { AreaIds } from "../../../src/lib/t3-hvac/Data/Constant/AreaIds";
import { getMenusForKind, getMenusForPath, hvacMenuConfig, designHubMenuConfig } from "../../../src/t3-react/config/menuConfig";
import type {
    DocumentAdapter,
    DocumentRuntime,
    HistorySpec,
    PanelTab,
    RailSpec,
    ShellLayout,
    ToolGroupSpec,
    ToolItemSpec,
    TopSpec
} from "../../../src/t3-react/features/designer/DocumentAdapter";

const adapter: DocumentAdapter = { kind: "hvac-schematic", engine: "hvac" };

/**
 * Fluent's `Tooltip`/`Button` use `useLayoutEffect`, which React legitimately cannot run during
 * `renderToStaticMarkup`. Those warnings are pure noise here and would hide real ones, so they are
 * filtered; anything else still reaches the console.
 */
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
    if (String(args[0] ?? "").includes("useLayoutEffect does nothing on the server")) {
        return;
    }
    originalConsoleError(...args);
};

function makeRuntime(layout: ShellLayout, extra: Partial<DocumentRuntime> = {}): DocumentRuntime {
    return { layout, title: "Test document", ...extra };
}

const CANVAS_MARKER = "canvas-content-marker";
const LOADING_MARKER = "loading-overlay-marker";

function canvasLayout(overrides: Partial<ShellLayout> = {}): ShellLayout {
    return { canvas: { node: <div>{CANVAS_MARKER}</div> }, ...overrides };
}

/* ------------------------------------------------------------------ 1. routing */

describe("designer route parsing", () => {
    it("accepts a kind with and without an id", () => {
        expect(matchDesignerPath(`${DESIGNER_ROUTE_BASE}/hvac-schematic`)).toEqual({ kind: "hvac-schematic" });
        expect(matchDesignerPath(`${DESIGNER_ROUTE_BASE}/hvac-schematic/abc-123`)).toEqual({
            kind: "hvac-schematic",
            id: "abc-123"
        });
    });

    it("decodes a url-encoded id (project paths contain slashes)", () => {
        const id = "project/T3-LB-ESP_SN1028/T3-LB-ESP_SN1028.eez-project";
        const parsed = matchDesignerPath(designerPath("lvgl-9-5", id));
        expect(parsed).toEqual({ kind: "lvgl-9-5", id });
    });

    it("does not match the Design Hub or the legacy routes", () => {
        // The whole point: '/t3000/designer'.startsWith('/t3000/design') is true.
        expect(matchDesignerPath("/t3000/design")).toBeUndefined();
        expect(matchDesignerPath("/t3000/design/projects/1")).toBeUndefined();
        expect(matchDesignerPath("/t3000/hvac-designer")).toBeUndefined();
        expect(matchDesignerPath(DESIGNER_ROUTE_BASE)).toBeUndefined();
        expect(matchDesignerPath(`${DESIGNER_ROUTE_BASE}/not-a-kind`)).toBeUndefined();
    });

    it("keeps the kind registry coherent", () => {
        expect(DOCUMENT_KINDS.length).toBeGreaterThan(0);
        for (const kind of DOCUMENT_KINDS) {
            expect(DOCUMENT_KIND_SPECS[kind].kind).toBe(kind);
            expect(isDocumentKind(kind)).toBe(true);
        }
        expect(isDocumentKind("hvac")).toBe(false);
        expect(isDocumentKind(undefined)).toBe(false);
    });

    it("registers a host for every kind it advertises as available", () => {
        // Availability is what the picker's `disabled` state reads; a kind that says `available: true`
        // without a host is a dead link (P2 added the LVGL document this way).
        for (const kind of DOCUMENT_KINDS) {
            if (DOCUMENT_KIND_SPECS[kind].available) {
                expect(DESIGNER_DOCUMENTS[kind], `${kind} has no host`).toBeDefined();
            }
        }
        expect(DOCUMENT_KIND_SPECS["lvgl-9-5"].available).toBe(true);
        expect(DOCUMENT_KIND_SPECS["hvac-schematic"].available).toBe(true);
        // P5 delivered the LCD document, so every declared kind now has a host.
        expect(DOCUMENT_KIND_SPECS["lcd-ui"].available).toBe(true);
    });
});

describe("menu resolution", () => {
    it("resolves designer routes to the document-kind menus, not the Design Hub menus", () => {
        /*
         * A **copy** of the kind's menu set, not the shared const: the shell appends its panel commands
         * to that copy's View menu (`panelMenu.ts`), and `hvacMenuConfig` is also what the legacy
         * `/t3000/hvac-designer` page renders — which has no designer panels.
         */
        const hvacMenus = getMenusForPath(`${DESIGNER_ROUTE_BASE}/hvac-schematic`);
        expect(hvacMenus).not.toBe(hvacMenuConfig);
        expect(hvacMenus.map((menu) => menu.id)).toEqual(hvacMenuConfig.map((menu) => menu.id));
        expect(getMenusForPath(`${DESIGNER_ROUTE_BASE}/hvac-schematic/123`)).not.toBe(designHubMenuConfig);
        expect(getMenusForPath("/t3000/designer/lvgl-9-5")).not.toBe(designHubMenuConfig);
    });

    it("hangs the designer's panel commands on the kind's View menu — on a copy", () => {
        const viewIds = (menus: { label?: string; children?: { id: string }[] }[]) => {
            const view = menus.find((menu) => (menu.label ?? "").toLowerCase() === "view");
            return (view?.children ?? []).map((child) => child.id);
        };

        // Every kind the shell can open gets them, whatever its menu set looks like…
        for (const kind of ["hvac-schematic", "lcd-ui", "lvgl-9-5", "lvgl-flow-9-5"]) {
            expect(viewIds(getMenusForKind(kind)), kind).toContain("designer-panels-toggle");
            expect(viewIds(getMenusForKind(kind)), kind).toContain("designer-panels-reset");
        }

        // …while the shared configs stay exactly as the legacy pages need them.
        expect(viewIds(hvacMenuConfig)).not.toContain("designer-panels-toggle");
        expect(getMenusForPath("/t3000/hvac-designer/42")).toBe(hvacMenuConfig);
    });

    it("still resolves the Design Hub and the legacy routes exactly as before", () => {
        expect(getMenusForPath("/t3000/design")).toBe(designHubMenuConfig);
        expect(getMenusForPath("/t3000/design/projects/1")).toBe(designHubMenuConfig);
        expect(getMenusForPath("/t3000/hvac-designer/42")).toBe(hvacMenuConfig);
    });

    it("maps every document kind to a menu set", () => {
        for (const kind of DOCUMENT_KINDS) {
            expect(Array.isArray(getMenusForKind(kind))).toBe(true);
            expect(getMenusForKind(kind).length).toBeGreaterThan(0);
        }
    });
});

/* ------------------------------------------------------------------ 2. layout memory */

describe("layout store", () => {
    it("resolves region widths from the spec default and clamps to min/max", () => {
        const spec = { default: 115, min: 90, max: 260 };
        expect(resolveRegionWidth(getKindLayout("test-kind"), "left", spec)).toBe(115);

        layoutStore.setRegionSize("test-kind", "left", 10);
        expect(resolveRegionWidth(getKindLayout("test-kind"), "left", spec)).toBe(90);

        layoutStore.setRegionSize("test-kind", "left", 9999);
        expect(resolveRegionWidth(getKindLayout("test-kind"), "left", spec)).toBe(260);

        layoutStore.resetKind("test-kind");
        expect(resolveRegionWidth(getKindLayout("test-kind"), "left", spec)).toBe(115);
    });

    it("follows a new spec default unless the size was chosen", () => {
        /*
         * The reason `specDefault` exists: shipping a smaller default (HVAC's tools panel went 115 → 105) has
         * to reach anyone whose remembered width is *that old default*, while a width somebody dragged must
         * never be overwritten.
         */
        const spec = { default: 105, min: 90, max: 260 };
        const untouched = { activeTabs: {}, left: { width: 115, specDefault: 115 } };
        const dragged = { activeTabs: {}, left: { width: 180, specDefault: 115 } };

        expect(resolveRegionWidth(untouched, "left", spec)).toBe(105);
        expect(resolveRegionWidth(dragged, "left", spec)).toBe(180);

        // An entry from before the field existed is treated as chosen — the user keeps what they see.
        expect(resolveRegionWidth({ activeTabs: {}, left: { width: 115 } }, "left", spec)).toBe(115);
    });

    it("remembers the spec default it was written against", () => {
        const spec = { default: 105, min: 90, max: 260 };
        layoutStore.resetKind("test-kind-3");
        layoutStore.setRegionSize("test-kind-3", "left", 150, spec.default);

        expect(getKindLayout("test-kind-3").left).toEqual({ width: 150, specDefault: 105 });
        expect(resolveRegionWidth(getKindLayout("test-kind-3"), "left", spec)).toBe(150);
        // …and a document that changes its default leaves that chosen width alone.
        expect(resolveRegionWidth(getKindLayout("test-kind-3"), "left", { ...spec, default: 96 })).toBe(150);

        layoutStore.resetKind("test-kind-3");
    });

    it("remembers collapsed state per kind", () => {
        layoutStore.resetKind("test-kind-2");
        expect(getKindLayout("test-kind-2").right?.collapsed).toBeUndefined();

        layoutStore.toggleCollapsed("test-kind-2", "right");
        expect(getKindLayout("test-kind-2").right?.collapsed).toBe(true);

        layoutStore.toggleCollapsed("test-kind-2", "right");
        expect(getKindLayout("test-kind-2").right?.collapsed).toBe(false);

        layoutStore.resetKind("test-kind-2");
    });
});

/* ------------------------------------------------------------------ 3. shell structure */

describe("DesignerShell", () => {
    it("renders the canvas content, and does not put the document title in the band", () => {
        const markup = renderToStaticMarkup(
            <DesignerShell adapter={adapter} runtime={makeRuntime(canvasLayout())} />
        );

        expect(markup).toContain(CANVAS_MARKER);
        /*
         * The band's identity block was removed on request (the app menu bar already navigates, and the
         * name is in the status bar and on the Design Hub card) — so the document's own title must NOT
         * reappear there. `runtime.title` stays part of the contract for anything else that wants it.
         */
        expect(markup).not.toContain("Test document");
    });

    it("keeps the canvas mounted while the document loads (overlay, never replacement)", () => {
        const markup = renderToStaticMarkup(
            <DesignerShell
                adapter={adapter}
                runtime={makeRuntime(canvasLayout(), { loading: <div>{LOADING_MARKER}</div> })}
            />
        );
        expect(markup).toContain(LOADING_MARKER);
        // The regression that matters: R1/R7 鈥?an engine must always find its DOM.
        expect(markup).toContain(CANVAS_MARKER);
    });

    it("keeps the canvas mounted when the document fails to load", () => {
        const markup = renderToStaticMarkup(
            <DesignerShell
                adapter={adapter}
                runtime={makeRuntime(canvasLayout(), { error: <div>failed</div> })}
            />
        );
        expect(markup).toContain("failed");
        expect(markup).toContain(CANVAS_MARKER);
    });

    it("renders no panel chrome for a single tab that opts out of a header", () => {
        const layout = canvasLayout({
            left: {
                id: "left",
                tabs: [{ id: "tools", label: "Tools", header: "never", content: () => <div>tools-body</div> }],
                activeTabId: "tools",
                onSelectTab: () => undefined,
                width: { default: 115, min: 90, max: 260 },
                collapsible: false
            }
        });
        const markup = renderToStaticMarkup(<DesignerShell adapter={adapter} runtime={makeRuntime(layout)} />);
        expect(markup).toContain("tools-body");
        expect(markup).not.toContain('role="tablist"');
    });

    it("renders a tab strip when a region has several tabs, and marks the active one", () => {
        const layout = canvasLayout({
            right: {
                id: "right",
                tabs: [
                    { id: "properties", label: "Properties", content: () => <div>props-body</div> },
                    { id: "styles", label: "Styles", content: () => <div>styles-body</div> }
                ],
                activeTabId: "properties",
                onSelectTab: () => undefined,
                width: { default: 240, min: 200, max: 420 }
            }
        });
        const markup = renderToStaticMarkup(<DesignerShell adapter={adapter} runtime={makeRuntime(layout)} />);
        expect(markup).toContain('role="tablist"');
        expect(markup).toContain("Properties");
        expect(markup).toContain("Styles");
        // Only the active tab's content is rendered.
        expect(markup).toContain("props-body");
        expect(markup).not.toContain("styles-body");
    });

    it("renders a region body as a stack of sections, one strip each, split by a draggable divider", () => {
        const layout = canvasLayout({
            left: {
                id: "left",
                // The flat list is still what a placeholder/flat renderer would show; the body uses `sections`.
                tabs: [
                    { id: "pages", label: "Pages", content: () => <div>pages-body</div> },
                    { id: "palette", label: "Components Palette", content: () => <div>palette-body</div> }
                ],
                activeTabId: "pages",
                onSelectTab: () => undefined,
                width: { default: 295, min: 200, max: 520 },
                collapsible: false,
                sections: [
                    {
                        id: "left-top",
                        tabs: [{ id: "pages", label: "Pages", content: () => <div>pages-body</div> }],
                        activeTabId: "pages",
                        onSelectTab: () => undefined,
                        weight: 0.8
                    },
                    {
                        id: "left-bottom",
                        tabs: [
                            {
                                id: "palette",
                                label: "Components Palette",
                                content: () => <div>palette-body</div>
                            }
                        ],
                        activeTabId: "palette",
                        onSelectTab: () => undefined,
                        weight: 1.7
                    }
                ]
            }
        });

        const markup = renderToStaticMarkup(<DesignerShell adapter={adapter} runtime={makeRuntime(layout)} />);

        // Both groups are drawn — that is the whole point (they used to collapse into one strip, which is how
        // the left panel's bottom area disappeared).
        expect(markup).toContain("pages-body");
        expect(markup).toContain("palette-body");
        // Each group has its own head: a one-tab group shows the tab's label (no strip), so both labels are
        // present — a flat strip would have shown the *other* tab's label instead.
        expect(markup).toContain("Components Palette");
        // The weights become the two groups' flex shares (0.8 : 1.7) — compared numerically, since the
        // quotient is a float.
        const shares = [...markup.matchAll(/flex:([\d.]+) 1 0px/g)].map((match) => Number(match[1]));
        expect(shares).toHaveLength(2);
        expect(shares[0]).toBeCloseTo(0.8 / 2.5, 3);
        expect(shares[1]).toBeCloseTo(1.7 / 2.5, 3);
        // …and the divider between them is the *row* splitter (its `row-resize` cursor lives in a CSS class,
        // so the splitter is identified by the title it is given).
        expect(markup).toContain('title="Resize left-top / left-bottom"');
        expect([...markup.matchAll(/title="Resize /g)]).toHaveLength(1);
    });

    it("renders a second column beside the body, with its own strip", () => {
        const layout = canvasLayout({
            left: {
                id: "left",
                tabs: [{ id: "pages", label: "Pages", content: () => <div>pages-body</div> }],
                activeTabId: "pages",
                onSelectTab: () => undefined,
                width: { default: 295, min: 200, max: 520 },
                collapsible: false,
                secondary: {
                    id: "structure",
                    tabs: [
                        {
                            id: "structure",
                            label: "Widgets Structure",
                            content: () => <div>structure-body</div>
                        }
                    ],
                    activeTabId: "structure",
                    onSelectTab: () => undefined,
                    defaultWidth: 224,
                    min: 150,
                    max: 420,
                    side: "end" as const
                }
            }
        });

        const markup = renderToStaticMarkup(<DesignerShell adapter={adapter} runtime={makeRuntime(layout)} />);

        expect(markup).toContain("pages-body");
        expect(markup).toContain("Widgets Structure");
        expect(markup).toContain("structure-body");
        // `side: "end"` = the column faces the canvas, i.e. it is drawn after the body.
        expect(markup.indexOf("pages-body")).toBeLessThan(markup.indexOf("structure-body"));
    });

    it("renders the bottom dock collapsed by default, without its body", () => {
        const layout = canvasLayout({
            bottom: {
                id: "bottom",
                tabs: [{ id: "checks", label: "Checks", content: () => <div>checks-body</div> }],
                activeTabId: "checks",
                onSelectTab: () => undefined,
                defaultCollapsed: true
            }
        });
        const markup = renderToStaticMarkup(<DesignerShell adapter={adapter} runtime={makeRuntime(layout)} />);
        expect(markup).toContain("Checks");
        expect(markup).not.toContain("checks-body");
    });

    it("renders extra status chips", () => {
        const layout = canvasLayout({ statusExtra: <span>extra-chip</span> });
        const markup = renderToStaticMarkup(<DesignerShell adapter={adapter} runtime={makeRuntime(layout)} />);
        expect(markup).toContain("extra-chip");
    });

    it("marks the shell host for document-scoped CSS", () => {
        // The LVGL theme bridge (`documents/lvgl/lvgl-theme-bridge.css`) scopes its `--eez-*` custom
        // properties to `.t3-designer[data-doc-kind^="lvgl"]`, and Emotion hashes `styles.root`, so these
        // two attributes are the only stable hooks. Removing either silently un-themes the EEZ workbench.
        const markup = renderToStaticMarkup(
            <DesignerShell adapter={adapter} runtime={makeRuntime(canvasLayout())} />
        );
        expect(markup).toContain("t3-designer");
        expect(markup).toContain('data-doc-kind="hvac-schematic"');
    });

    it("shows undo/redo only when the document exposes a history", () => {
        const plain = renderToStaticMarkup(<DesignerShell adapter={adapter} runtime={makeRuntime(canvasLayout())} />);
        expect(plain).not.toContain('aria-label="Undo"');
        expect(plain).not.toContain('aria-label="Redo"');

        const withHistory = renderToStaticMarkup(
            <DesignerShell
                adapter={adapter}
                runtime={makeRuntime(
                    canvasLayout({ history: { undo: () => undefined, redo: () => undefined } })
                )}
            />
        );
        expect(withHistory).toContain('aria-label="Undo"');
        expect(withHistory).toContain('aria-label="Redo"');
        // `canUndo`/`canRedo` are polled, so until the first sample the buttons stay disabled.
        expect(withHistory).toContain("disabled");
    });
});

/* ------------------------------------------------------------------ 4. layering guard */

describe("HVAC engine DOM contract", () => {
    it("keeps the ids the engine reads with getElementById during init", () => {
        // Without these, Hammer binds to null and stamping a shape throws in T3Hammer.on.
        expect(AreaIds.get("mainApp")).toBe("main-app");
        expect(AreaIds.get("svgArea")).toBe("svg-area");
        expect(AreaIds.get("workArea")).toBe("document-area");
        expect(AreaIds.get("leftPanel")).toBe("left-panel");
        expect(AreaIds.get("workAreaColumn")).toBe("work-area");
    });

    it("builds selector-prefixed ids", () => {
        expect(AreaIds.selector("svgArea")).toBe("#svg-area");
        expect(AreaIds.selector("hRuler")).toBe("#h-ruler");
    });

    it("gives each mounted document its own container ids", () => {
        const first = makeAreaIds("d1");
        const second = makeAreaIds("d2");
        expect(first.svgArea).toBe("svg-area-d1");
        expect(second.svgArea).toBe("svg-area-d2");
        expect(first.svgArea).not.toBe(second.svgArea);
        // every key must be unique per document, not just the svg area
        const firstValues = Object.values(first);
        expect(firstValues).toHaveLength(8);
        expect(firstValues.some((value) => Object.values(second).includes(value))).toBe(false);
        expect(canvasIdsOf(first)).toEqual({
            documentArea: "document-area-d1",
            svgArea: "svg-area-d1",
            hRuler: "h-ruler-d1",
            vRuler: "v-ruler-d1",
            cRuler: "c-ruler-d1"
        });
    });

    it("restores the historical ids when a document unmounts", () => {
        AreaIds.set(makeAreaIds("d99"));
        expect(AreaIds.selector("svgArea")).toBe("#svg-area-d99");
        AreaIds.reset();
        expect(AreaIds.selector("svgArea")).toBe("#svg-area");
    });
});

describe("shell layering", () => {
    const designerRoot = join(process.cwd(), "src/t3-react/features/designer");

    const walk = (dir: string, out: string[] = []): string[] => {
        for (const entry of readdirSync(dir)) {
            const full = join(dir, entry);
            if (statSync(full).isDirectory()) {
                walk(full, out);
            } else if (/\.tsx?$/.test(entry)) {
                out.push(full);
            }
        }
        return out;
    };

    it("never imports an engine outside documents/", () => {
        const offenders = walk(designerRoot)
            .filter((file) => !file.includes(`${join("designer", "documents")}`))
            .filter((file) => {
                const source = readFileSync(file, "utf8");
                return /from\s+["']@?\/?lib\/t3-hvac|from\s+["']@\/lib\/t3-hvac|t3-eez-studio/.test(source);
            })
            .map((file) => file.replace(process.cwd(), ""));

        expect(offenders).toEqual([]);
    });

    it("keeps the kinds module pure (no React, no engine)", () => {
        const source = readFileSync(join(designerRoot, "kinds.ts"), "utf8");
        expect(source).not.toMatch(/from\s+["']react["']/);
        expect(source).not.toMatch(/t3-hvac|t3-eez-studio/);
    });
});

/**
 * The top band's group row.
 *
 * This is where a regression is invisible in every other test and obvious to the user: the band shows
 * the document's tools, or it shows an empty strip with a `⋯` that nobody knows to open. Two rules, both
 * of them pure functions of a width, so they can be pinned exactly:
 *
 *  1. how many leading group **columns** fit (each group is two item-rows tall, so a column is about half
 *     the width of the same group laid out flat, and the 1 px rule between groups counts too), and
 *  2. that the answer is derived from widths measured **off-screen**, not from the groups that happen
 *     to be on screen — the old rule measured what it had rendered, so once everything had folded
 *     there was nothing left to measure and the band never recovered.
 */
describe("Shell top bar — the group columns", () => {
    const group = (id: string, items = 0): ToolGroupSpec => ({
        id,
        label: id,
        items: Array.from({ length: items }, (_, index) => ({
            id: `${id}-${index}`,
            label: `${id} ${index}`
        }))
    });

    /*
     * The structural assertions below render **item-less** groups on purpose: a tool item is wrapped
     * in a Fluent `Tooltip`, and `renderToStaticMarkup` throws on its portal. What is under test here
     * is the band's shape (a clone row, a title, a kind label) — the line arithmetic itself is the pure
     * function exercised above, where no rendering is involved at all.
     */
    const shapes: TopSpec = { groups: [group("selection"), group("clipboard")] };

    it("fits as many leading groups as the row can hold", () => {
        const widths = [144, 186, 114, 165, 176, 104, 302];

        expect(fitGroupCount(widths, 0)).toBe(0);
        expect(fitGroupCount(widths, 143)).toBe(0);
        expect(fitGroupCount(widths, 144)).toBe(1);
        // The 1px rule plus its 3px margins must fit too, so 144 + 186 is not enough.
        expect(fitGroupCount(widths, 330)).toBe(1);
        expect(fitGroupCount(widths, 337)).toBe(2);
        // …and it stops at the first group that does not fit, rather than skipping it.
        expect(fitGroupCount(widths, 337 + 7 + 113)).toBe(2);
        expect(fitGroupCount(widths, 337 + 7 + 114)).toBe(3);
        expect(fitGroupCount(widths, 100_000)).toBe(widths.length);
    });

    it("counts the rule that precedes a document cluster (LVGL/LCD render their own node)", () => {
        expect(fitGroupCount([100], 100)).toBe(1);
        expect(fitGroupCount([100], 106, true)).toBe(0);
        expect(fitGroupCount([100], 107, true)).toBe(1);
    });

    it("is one band exactly two item-rows tall", () => {
        // The columns spend the band's height: two rows of items per group, 60 px in total.
        expect(TOP_ROW_HEIGHT).toBe(TOOL_LINE_HEIGHT * 2);
    });

    it("lays out every group off-screen so the fill can be recomputed at any width", () => {
        const markup = renderToStaticMarkup(<ShellTopBar top={shapes} />);

        // The clone row is present, hidden, and carries both groups…
        expect(markup).toContain('data-shell-measure="true"');
        expect(markup).toContain('aria-hidden="true"');
        // …once inline and once in the clone: the widths must not depend on how many are shown.
        expect((markup.match(/data-tool-group=/g) ?? []).length).toBe(4);
        // One row, no second row.
        expect(markup).not.toContain('data-shell-row="tools"');
    });

    it("has no identity block — no title, kind or back button in the band", () => {
        /*
         * The band used to carry a 160 px panel with the document's name, its kind and a back button.
         * It was removed on request: the app menu bar above already navigates (Home / Design Hub), and
         * the name is shown by the status bar and the Design Hub card. Keeping it here would also be the
         * only thing standing between the tools and ~170 px of row.
         */
        const markup = renderToStaticMarkup(<ShellTopBar top={{}} />);

        expect(markup).not.toContain('data-shell-title="true"');
        expect(markup).not.toContain('data-shell-kind="true"');
        expect(markup).not.toContain('data-shell-modified="true"');
        expect(markup).not.toContain("Back to Design Hub");
    });
});

/**
 * The top area is **one 60 px band of group columns** (user decision): the document's groups from the
 * left edge, the shell's own controls pinned right. The band's height is the feature — each group spends
 * it on a second row of items, which is what lets the whole legacy set fit and lets the rule between
 * groups run full height.
 */
describe("Shell top bar — one band", () => {
    const bare: ToolGroupSpec[] = [{ id: "selection", label: "Selection", items: [] }];

    it("runs the tools first, then the shell's own controls", () => {
        const markup = renderToStaticMarkup(
            <ShellTopBar
                top={{ groups: bare, overflow: [{ id: "doc-item", label: "Document item" }] }}
            />
        );

        const measure = markup.indexOf('data-shell-measure="true"');
        const tools = markup.indexOf('data-shell-tools="true"');
        const more = markup.indexOf('data-shell-overflow="true"');

        // The clone row hangs off the band itself, before anything visible.
        expect(measure).toBeGreaterThan(-1);
        expect(measure).toBeLessThan(tools);
        expect(tools).toBeLessThan(more);
        expect(markup).not.toContain('data-shell-row="tools"');
    });

    it("carries no panel toggles — the panels own their own visibility", () => {
        /*
         * Hiding a panel is not an editing tool, and the band is the document's row: the legacy strip
         * never had such a button. Each panel's head carries its chevron in both states, and the two
         * aggregate commands live in the app's View menu.
         */
        const markup = renderToStaticMarkup(<ShellTopBar top={{ groups: bare }} />);

        expect(markup).not.toContain('aria-label="Toggle left panel"');
        expect(markup).not.toContain('aria-label="Toggle right panel"');
        expect(markup).not.toContain('aria-label="Toggle bottom panel"');
    });

    it("draws no `⋯` when it would be empty, and one as soon as there is something in it", () => {
        // Nothing folded and no document overflow → nothing more to show, so nothing to trigger.
        const empty = renderToStaticMarkup(<ShellTopBar top={{}} />);
        expect(empty).not.toContain("data-tool-group=");
        expect(empty).not.toContain('data-shell-overflow="true"');

        const withOverflow = renderToStaticMarkup(
            <ShellTopBar top={{ overflow: [{ id: "doc-item", label: "Document item" }] }} />
        );
        expect(withOverflow).toContain('data-shell-overflow="true"');
    });
});

/**
 * The shell's own clusters are a **fallback**, not a given: a document that mirrors those controls as
 * its own tool groups (HVAC's `History & Save` and `View & Zoom`) switches them off, so a command is
 * drawn once. `ShellLayout.history` stays either way — that is what `Ctrl+Z` reads.
 */
describe("Shell top bar — shellControls", () => {
    const history: HistorySpec = {
        canUndo: () => true,
        canRedo: () => true,
        undo: () => undefined,
        redo: () => undefined
    };

    it("draws no undo/redo and no command strip when the document owns them", () => {
        const markup = renderToStaticMarkup(
            <ShellTopBar
                top={{ shellControls: { history: false, viewport: false } }}
                history={history}
            />
        );

        expect(markup).not.toContain('aria-label="Undo"');
        expect(markup).not.toContain('aria-label="Document commands"');
        // `⋯` is not a consolation prize any more: no groups and no document overflow means it would be
        // an empty menu, so it is not drawn at all.
        expect(markup).not.toContain('data-shell-overflow="true"');
    });

    it("draws them when the document does not say otherwise", () => {
        const markup = renderToStaticMarkup(<ShellTopBar top={{}} history={history} />);

        expect(markup).toContain('aria-label="Undo"');
    });

    it("signs the declared live values, so a flip is the only thing that redraws the band", () => {
        let on = false;
        const groups: ToolGroupSpec[] = [
            {
                id: "history",
                label: "History & Save",
                items: [{ id: "undo", label: "Undo", disabled: () => !on, checked: () => on }]
            }
        ];

        // Disabled and unchecked first, then enabled and checked: two different signatures.
        expect(liveSignature(groups)).toBe("10");
        on = true;
        expect(liveSignature(groups)).toBe("01");
        // …and it ignores items whose state is a plain boolean.
        expect(liveSignature([{ id: "g", label: "g", items: [{ id: "i", label: "i", disabled: true }] }])).toBe("");
    });
});

/**
 * Two things the band must get right about *state*, both learned from the legacy strip:
 *
 *  · a view state (rulers, grid, zoom) is not an armed mode — it shows itself by swapping its icon, not
 *    by tinting the button, so it keeps looking like every other tool in the row;
 *  · the zoom box is a **value**, not an action: it is an editable field inline, and when its group is
 *    folded it becomes an informational entry rather than disappearing.
 */
describe("Shell tool items — state", () => {
    const toggle: ToolItemSpec = {
        id: "toggleRulers",
        label: "Rulers",
        icon: <span data-icon="regular" />,
        checkedIcon: <span data-icon="filled" />,
        tone: "state",
        checked: () => true
    };

    it("shows a state toggle with its checked icon and no brand tint", () => {
        /*
         * Asserted through the resolvers, not through markup: a leaf item is wrapped in a Fluent
         * `Tooltip`, whose portal throws in `renderToStaticMarkup` (same reason the band's own render
         * tests use item-less groups). These two functions *are* the presentation rule.
         */
        expect(toolIcon(toggle).props["data-icon"]).toBe("filled");
        expect(toolTinted(toggle)).toBe(false);
    });

    it("still tints an armed mode (the reason the checked style exists)", () => {
        const mode: ToolItemSpec = { id: "stamp", label: "Stamp", checked: true, icon: <span /> };

        expect(toolTinted(mode)).toBe(true);
        expect(toolIcon(mode)).toBe(mode.icon);
    });

    it("draws an editable field inline, and reports its value when folded", () => {
        let committed: string | undefined;
        const field: ToolItemSpec = {
            id: "zoom",
            label: "Zoom",
            field: {
                ariaLabel: "Zoom percentage",
                suffix: "%",
                value: () => "100",
                commit: (raw) => {
                    committed = raw;
                }
            }
        };

        const inline = renderToStaticMarkup(
            <ToolGroupInline group={{ id: "view", label: "View & Zoom", items: [field] }} />
        );

        expect(inline).toContain('data-tool-field="zoom"');
        expect(inline).toContain('value="100"');
        expect(inline).toContain('aria-label="Zoom percentage"');
        expect(inline).toContain("%");
        expect(committed).toBeUndefined();

        // Folded, the group cannot host an input — but the value must not vanish with it.
        const folded = renderToStaticMarkup(<MenuEntry item={field} />);
        expect(folded).toContain("Zoom: 100%");
    });
});

/**
 * The **rail** — the old page's *border*: a vertical bar of rotated tabs on the window edge whose selected
 * tab opens a column beside it. It exists because the origin has one on both sides of the LVGL document, and
 * because the flat strip that replaced it could not hold the right side's eight tabs (measured: 471 px of
 * tabs in a 228 px strip, five of them unreachable).
 */
describe("Region rail — the old page's border", () => {
    const tabs: PanelTab[] = [
        { id: "styles", label: "Styles", content: () => <div data-panel="styles" /> },
        { id: "fonts", label: "Fonts", content: () => <div data-panel="fonts" /> }
    ];

    const rail = (overrides: Partial<RailSpec> = {}): RailSpec => ({
        tabs,
        onSelectTab: () => undefined,
        width: 240,
        side: "right",
        label: "Right panels",
        ...overrides
    });

    it("draws a vertical bar of tabs, with the labels rotated outwards", () => {
        const markup = renderToStaticMarkup(<RegionRail rail={rail()} />);

        expect(markup).toContain('data-shell-rail="right"');
        expect(markup).toContain('aria-orientation="vertical"');
        expect(markup).toContain('aria-label="Right panels"');
        expect(markup).toContain("writing-mode:vertical-rl");
        // The right bar reads downwards, the left one upwards (flexlayout's ±90°).
        expect(markup).not.toContain("rotate(180deg)");
        expect(renderToStaticMarkup(<RegionRail rail={rail({ side: "left" })} />)).toContain(
            "rotate(180deg)"
        );
        // Both tabs are buttons and neither is selected while the border is closed.
        expect((markup.match(/data-rail-tab=/g) ?? []).length).toBe(2);
        expect(markup).not.toContain('aria-selected="true"');
    });

    it("opens the selected tab's panel in a column of the model's own width", () => {
        const closed = renderToStaticMarkup(<RegionRail rail={rail()} />);
        expect(closed).not.toContain("data-shell-rail-content");

        const open = renderToStaticMarkup(
            <RegionRail rail={rail({ activeTabId: "styles" })}>
                <div data-panel="styles" />
            </RegionRail>
        );
        expect(open).toContain('data-shell-rail-content="styles"');
        expect(open).toContain("width:240px");
        expect(open).toContain('data-panel="styles"');
        expect(open).toContain('aria-selected="true"');

        // The bar is a fixed, thin strip in both states — that is the width the region has to account for.
        expect(RAIL_BAR_WIDTH).toBeLessThan(40);
    });

    it("draws nothing at all when the side's border has no tabs", () => {
        // `enableTabOnBorder` gates the left border's five tabs on what the project has; most projects have
        // none of them, and a 26 px bar of nothing down the window edge is worse than no bar.
        expect(renderToStaticMarkup(<RegionRail rail={rail({ tabs: [] })} />)).toBe("");
    });
});

/**
 * With the band's panel toggles gone, **the panel is the only place that can hide or show itself** — so
 * its head has to be drawn while collapsed too, and its chevron has to point back outwards. A panel that
 * can be collapsed but not re-opened from itself is a trap.
 */
describe("Panel head — the panel owns its toggle", () => {
    const tabs: PanelTab[] = [{ id: "tools", label: "Tools", content: () => <span />, header: "always" }];

    const head = (side: "left" | "right", collapsed: boolean) =>
        renderToStaticMarkup(
            <RegionPanelHead
                tabs={tabs}
                activeTabId="tools"
                onSelectTab={() => undefined}
                side={side}
                collapsible
                collapsed={collapsed}
                onToggleCollapsed={() => undefined}
            />
        );

    it("doubles as the collapse and the expand control", () => {
        const expanded = head("left", false);
        expect(expanded).toContain('aria-label="Collapse panel"');
        expect(expanded).toContain('aria-expanded="true"');
        expect(expanded).not.toContain('aria-label="Expand panel"');

        const collapsed = head("left", true);
        expect(collapsed).toContain('aria-label="Expand panel"');
        expect(collapsed).toContain('aria-expanded="false"');
        expect(collapsed).not.toContain('aria-label="Collapse panel"');
    });

    it("keeps the chevron pointing inwards while open, outwards while closed", () => {
        /*
         * Fluent mints a class per rule, so the direction is asserted through the icon geometry: the two
         * states of one side must differ, and the left/right sides must mirror each other. `d` is what
         * `-ltr` mirrored SVG paths change.
         */
        const pathOf = (markup: string) => markup.match(/<path d="([^"]+)"/)?.[1];

        const leftOpen = pathOf(head("left", false));
        const leftShut = pathOf(head("left", true));
        const rightOpen = pathOf(head("right", false));

        expect(leftOpen).toBeDefined();
        expect(leftShut).not.toBe(leftOpen);
        expect(rightOpen).not.toBe(leftOpen);
    });

    it("draws nothing at all for a panel that opted out of its header", () => {
        const bare: PanelTab[] = [{ id: "tools", label: "Tools", header: "never", content: () => <span /> }];
        const expanded = renderToStaticMarkup(
            <RegionPanelHead
                tabs={bare}
                activeTabId="tools"
                onSelectTab={() => undefined}
                side="left"
                collapsible
                collapsed={false}
                onToggleCollapsed={() => undefined}
            />
        );

        expect(expanded).toBe("");

        const collapsed = renderToStaticMarkup(
            <RegionPanelHead
                tabs={bare}
                activeTabId="tools"
                onSelectTab={() => undefined}
                side="left"
                collapsible
                collapsed
                onToggleCollapsed={() => undefined}
            />
        );

        // While collapsed it is a 28 px rail, so the chevron must be there — and must stay inside it.
        expect(collapsed).toContain('aria-label="Expand panel"');
        expect(collapsed).not.toContain("Tools");
    });

    it("gives a collapsed region its chevron and nothing else, whatever the tab count", () => {
        /*
         * Measured defect: a collapsed region drew its **title** as well, which pushed the 24 px chevron to
         * x 20 … 44 in a 28 px column. The region's `overflow: hidden` then cut three quarters of it away, so
         * the panel could be collapsed but never brought back — the user's "no expand icon to change back".
         */
        expect(regionHeadContent(1, "always", true)).toBe("chevron-only");
        expect(regionHeadContent(1, "never", true)).toBe("chevron-only");
        expect(regionHeadContent(4, undefined, true)).toBe("chevron-only");

        expect(regionHeadContent(1, "always", false)).toBe("title");
        expect(regionHeadContent(4, undefined, false)).toBe("tabs");
        expect(regionHeadContent(1, "never", false)).toBe("none");
    });

    it("keeps a closed bar's tab strip, so a closed dock can be reopened by its tabs", () => {
        /*
         * The bottom dock is a *bar*: the origin's closed FlexLayout border still draws its tab bar, which is
         * how a closed Checks · Output · Search · References dock is reopened by clicking one. A left/right
         * rail cannot (28 px is the chevron and nothing else), and the dock keeps its chevron either way.
         */
        expect(regionHeadContent(4, undefined, true, true)).toBe("tabs");
        expect(regionHeadContent(1, "never", true, true)).toBe("title");
        expect(regionHeadContent(0, undefined, true, true)).toBe("chevron-only");
        // The rail is unchanged.
        expect(regionHeadContent(4, undefined, true)).toBe("chevron-only");
    });
});
