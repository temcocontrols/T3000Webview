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
import { DESIGNER_DOCUMENTS } from "../../../src/t3-react/features/designer/registry";
import {
    canvasIdsOf,
    makeAreaIds
} from "../../../src/t3-react/features/designer/documents/hvac/hvacAreaIds";
import { AreaIds } from "../../../src/lib/t3-hvac/Data/Constant/AreaIds";
import { getMenusForKind, getMenusForPath, hvacMenuConfig, designHubMenuConfig } from "../../../src/t3-react/config/menuConfig";
import type { DocumentAdapter, DocumentRuntime, ShellLayout } from "../../../src/t3-react/features/designer/DocumentAdapter";

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
        expect(getMenusForPath(`${DESIGNER_ROUTE_BASE}/hvac-schematic`)).toBe(hvacMenuConfig);
        expect(getMenusForPath(`${DESIGNER_ROUTE_BASE}/hvac-schematic/123`)).toBe(hvacMenuConfig);
        expect(getMenusForPath("/t3000/designer/lvgl-9-5")).not.toBe(designHubMenuConfig);
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
    it("renders the canvas content and the document title", () => {
        const markup = renderToStaticMarkup(
            <DesignerShell adapter={adapter} runtime={makeRuntime(canvasLayout())} />
        );
        expect(markup).toContain(CANVAS_MARKER);
        expect(markup).toContain("Test document");
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
