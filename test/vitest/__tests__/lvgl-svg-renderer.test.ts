import { describe, expect, it } from "vitest";
import { renderScene } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-renderer";
import type {
    DrawNode,
    RenderOutput,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-sink";
import { parseScene } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/scene";
import type { Scene } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/scene";
import { loadFixture } from "../lvgl-svg/fixture-loader";

function flat(nodes: DrawNode[] | undefined, into: DrawNode[] = []): DrawNode[] {
    for (const node of nodes ?? []) {
        into.push(node);
        flat(node.children, into);
    }
    return into;
}

function byKey(out: RenderOutput, key: string): DrawNode | undefined {
    return flat(out.roots).find(node => node.key === key);
}

function requireNode(out: RenderOutput, key: string): DrawNode {
    const node = byKey(out, key);
    expect(node, `expected a node with key "${key}"`).toBeDefined();
    return node!;
}

function defsWithPrefix(out: RenderOutput, prefix: string) {
    return out.defs.filter(def => def.id.startsWith(`lvgl-${prefix}-`));
}

function attr(node: DrawNode, name: string): unknown {
    return node.attrs ? node.attrs[name] : undefined;
}

describe("renderer — boxes (radius, border sides, outline, shadow, gradient)", () => {
    const scene = loadFixture("boxes");
    const out = renderScene(scene);

    it("emits one root group per root object and skips hidden subtrees", () => {
        expect(out.roots).toHaveLength(1);
        expect(out.roots[0].key).toBe("o1");
        expect(byKey(out, "o5")).toBeUndefined();
        // Children nest inside their parent rather than in the root list. The screen's own
        // parts come first (a parent paints before its children), then the child objects.
        const rootChildren = out.roots[0].children!.map(n => n.key);
        expect(rootChildren).toEqual(["p1-MAIN-bg", "o2", "o3", "o4"]);
    });

    it("uses <rect rx> for a uniform radius and a <path> for per-corner radii", () => {
        const uniform = requireNode(out, "p2-MAIN-bg");
        expect(uniform.tag).toBe("rect");
        expect(attr(uniform, "rx")).toBe(12);

        const perCorner = requireNode(out, "p3-MAIN-bg");
        expect(perCorner.tag).toBe("path");
        expect(String(attr(perCorner, "d"))).toContain("A16 16");
        // tl and br are rounded, tr and bl are square → no arc for those corners.
        expect(String(attr(perCorner, "d")).match(/A16 16/g)).toHaveLength(2);
    });

    it("maps a background gradient to a gradient def and references it", () => {
        const bg = requireNode(out, "p2-MAIN-bg");
        expect(String(attr(bg, "fill"))).toMatch(/^url\(#lvgl-lingrad-/);
        // A gradient carries its own stop-opacity, so fill-opacity must not double-apply it.
        expect(attr(bg, "fill-opacity")).toBeUndefined();

        const gradients = defsWithPrefix(out, "lingrad");
        expect(gradients).toHaveLength(1);
        expect(gradients[0].tag).toBe("linearGradient");
        expect(gradients[0].children).toHaveLength(2);
        expect(gradients[0].children![1].attrs!["stop-color"]).toBe("#445566");
    });

    it("ramps from the BACKGROUND colour to the gradient colour, carrying bg_opa on both stops", () => {
        /*
         * LVGL draws `bg_color` -> `bg_grad_color` between `bg_main_stop` and `bg_grad_stop`
         * (`lv_obj_init_draw_rect_dsc()` fills exactly those two stops). Emitting a fade of
         * `bg_grad_color` from transparent instead drops the start colour — measurably: 74% of a
         * gradient-filled button's box differed from the canvas.
         */
        const stops = defsWithPrefix(out, "lingrad")[0].children!;
        // The fixture's MAIN bg is #223344 at 0.9 opacity with grad #445566 at stop 160.
        expect(stops[0].attrs!["stop-color"]).toBe("#223344");
        expect(stops[0].attrs!["offset"]).toBe(0);
        expect(stops[0].attrs!["stop-opacity"]).toBeCloseTo(0.9, 5);
        expect(stops[1].attrs!["offset"]).toBeCloseTo(160 / 255, 5);
        expect(stops[1].attrs!["stop-opacity"]).toBeCloseTo(0.9, 5);
    });

    it("is consistent: the non-gradients in the fixture still use flat fill-opacity", () => {
        const ghostBg = requireNode(out, "p4-MAIN-bg");
        expect(attr(ghostBg, "fill")).toBe("#aa0000");
        expect(attr(ghostBg, "fill-opacity")).toBe(0.75);
    });

    it("attaches a shadow filter to the background shape it sits behind", () => {
        const bg = requireNode(out, "p2-MAIN-bg");
        expect(String(attr(bg, "filter"))).toMatch(/^url\(#lvgl-shadow-/);
        const filters = defsWithPrefix(out, "shadow");
        expect(filters).toHaveLength(1);
        expect(filters[0].children![0].tag).toBe("feDropShadow");
        expect(filters[0].children![0].attrs!["flood-opacity"]).toBe(0.5);
    });

    it("draws a full border as the same shape type, inset inside the bounds", () => {
        const border = requireNode(out, "p2-MAIN-border");
        expect(border.tag).toBe("rect");
        expect(attr(border, "fill")).toBe("none");
        expect(attr(border, "stroke-width")).toBe(2);
        // LVGL borders are drawn inside: the box shrinks by half the stroke width per edge.
        expect(attr(border, "x")).toBe(21);
        expect(attr(border, "width")).toBe(198);
    });

    it("draws a partial border as one path segment per selected side", () => {
        const border = requireNode(out, "p3-MAIN-border");
        expect(border.tag).toBe("path");
        const d = String(attr(border, "d"));
        expect(d.match(/M/g)).toHaveLength(2); // TOP|LEFT
        expect(d).toContain("H");
        expect(d).toContain("V");
    });

    it("draws the outline outside the border box", () => {
        const outline = requireNode(out, "p2-MAIN-outline");
        expect(attr(outline, "fill")).toBe("none");
        expect(attr(outline, "stroke")).toBe("#ff8800");
        // area 20,20,200,120 expanded by pad 3 then inset by half of width 1 → x 16.5, w 207
        expect(attr(outline, "x")).toBe(16.5);
        expect(attr(outline, "width")).toBe(207);
    });

    it("keeps object opacity on the object group, not on each part", () => {
        const ghost = byKey(out, "o4")!;
        expect(attr(ghost, "opacity")).toBe(0.5);
        expect(requireNode(out, "p4-MAIN-bg").attrs!.opacity).toBeUndefined();
    });

    it("always labels groups so hit-testing can map back to the model", () => {
        const panel = byKey(out, "o2")!;
        expect(attr(panel, "data-ptr")).toBe(2);
        expect(attr(panel, "data-objid")).toBe("panel1");
        expect(attr(panel, "data-type")).toBe("panel");
    });
});

describe("renderer — indicators (parts, states, arcs)", () => {
    const out = renderScene(loadFixture("indicators"));

    it("emits one group per part, in LVGL paint order", () => {
        const keys = byKey(out, "o2")!.children!.map(n => n.key);
        // Order follows LVGL: MAIN → INDICATOR → KNOB, each followed by its own border.
        expect(keys).toEqual([
            "p2-MAIN-bg",
            "p2-INDICATOR-bg",
            "p2-KNOB-bg",
            "p2-KNOB-border",
        ]);
    });

    it("honours a part-level area override", () => {
        const indicator = requireNode(out, "p2-INDICATOR-bg");
        expect(attr(indicator, "x")).toBe(20);
        expect(attr(indicator, "width")).toBe(120);
        // The object was 200 wide; the part is 120, so the override really was applied.
        expect(attr(indicator, "width")).not.toBe(attr(requireNode(out, "p2-MAIN-bg"), "width"));
    });

    it("renders an arc as a track plus a value path with round caps", () => {
        const track = requireNode(out, "p6-MAIN-arc-track");
        const value = requireNode(out, "p6-MAIN-arc-value");
        expect(track.tag).toBe("path");
        expect(value.tag).toBe("path");
        expect(attr(track, "stroke")).toBe("#263238");
        expect(attr(value, "stroke")).toBe("#4fc3f7");
        expect(attr(value, "stroke-linecap")).toBe("round");
        expect(attr(value, "stroke-width")).toBe(12);
        // 1350 → 4050 (tenths of a degree) is a 270° sweep → large-arc-flag = 1.
        // sweep-flag 1: LVGL's angle grows clockwise on screen (`y = cy + sin(a)·r`), the same
        // direction as SVG's positive-angle sweep.
        expect(String(attr(value, "d"))).toContain("A");
        expect(String(attr(value, "d"))).toContain(" 1 1 ");
    });

    it("renders a partial arc without the large-arc flag", () => {
        const value = requireNode(out, "p8-INDICATOR-arc-value");
        expect(String(attr(value, "d"))).toContain(" 0 1 ");
    });

    it("draws a track-only arc part as its own sweep, not a full ring", () => {
        // An arc widget's MAIN part is the track, and LVGL draws it between bg_angle_start/end — a
        // default themed arc is a 270 degree track. Drawing it as a full circle was the bug, and a
        // track part must not emit a value arc either.
        const scene = parseScene({
            sceneVersion: 1,
            width: 100,
            height: 100,
            rootPtr: 1,
            objects: [
                {
                    ptr: 1,
                    index: 0,
                    type: "object",
                    area: { x: 0, y: 0, w: 100, h: 100 },
                    parts: [
                        {
                            part: "MAIN",
                            state: "default",
                            arc: { bgColor: "#263238", bgWidth: 12, bgStart: 1350, bgEnd: 4050 },
                        },
                    ],
                },
            ],
        });
        const nodes = flat(renderScene(scene).roots);
        expect(nodes.some(node => node.key.endsWith("-value"))).toBe(false);
        const track = nodes.find(node => node.key.endsWith("-track"));
        expect(track).toBeTruthy();
        expect(String(attr(track!, "d"))).toContain(" 1 1 ");
    });

    it("renders a textarea placeholder, cursor and scrollbar as separate parts", () => {
        const placeholder = requireNode(out, "p9-TEXTAREA_PLACEHOLDER-text");
        expect(placeholder.children![0].text).toBe("Enter a value");
        expect(requireNode(out, "p9-CURSOR-bg").tag).toBe("rect");
        expect(attr(requireNode(out, "p9-SCROLLBAR-bg"), "rx")).toBe(2);
    });

    it("never emits a TICKS part", () => {
        const keys = flat(out.roots).map(n => n.key);
        expect(keys.some(key => key.includes("TICKS"))).toBe(false);
    });

    it("draws a symbol background image as a vector glyph, not as an <image>", () => {
        /*
         * A checked checkbox's tick is `bg_image_src = LV_SYMBOL_OK` — a FontAwesome codepoint, not
         * a bitmap. It is drawn in the part's own text colour and font size (lv_obj_draw.c), which
         * is what the wire's text styling on that part is for.
         */
        const scene = parseScene({
            sceneVersion: 1,
            width: 100,
            height: 100,
            rootPtr: 1,
            objects: [
                {
                    ptr: 1,
                    index: 0,
                    type: "checkbox",
                    area: { x: 0, y: 0, w: 100, h: 100 },
                    parts: [
                        {
                            part: "INDICATOR",
                            state: "default",
                            area: { x: 0, y: 0, w: 22, h: 22 },
                            bgImage: { srcId: "", symbol: "\uF00C" },
                            text: { str: "", color: "#ffffff", size: 18 },
                        },
                    ],
                },
            ],
        });
        const nodes = flat(renderScene(scene).roots);
        const tick = nodes.find(node => node.key === "p1-INDICATOR-bgimg")!;
        expect(tick.tag).toBe("path");
        expect(attr(tick, "stroke")).toBe("#ffffff");
        expect(attr(tick, "stroke-linecap")).toBe("round");
        // Traced in a 0..1 box and scaled to the part (22x22), so the tick fills the marker.
        expect(attr(tick, "d")).toBe("M 3.96,11.44 L 9.24,16.72 L 18.04,5.72");
        expect(attr(tick, "stroke-width")).toBeCloseTo(2.88, 2);
        expect(nodes.some(node => node.tag === "image")).toBe(false);
    });

    it("falls back to the codepoint for a symbol it has not traced", () => {
        const scene = parseScene({
            sceneVersion: 1,
            width: 100,
            height: 100,
            rootPtr: 1,
            objects: [
                {
                    ptr: 1,
                    index: 0,
                    type: "checkbox",
                    area: { x: 0, y: 0, w: 100, h: 100 },
                    parts: [
                        {
                            part: "INDICATOR",
                            state: "default",
                            bgImage: { srcId: "", symbol: "\uF0C8" },
                        },
                    ],
                },
            ],
        });
        const nodes = flat(renderScene(scene).roots);
        const symbol = nodes.find(node => node.key === "p1-INDICATOR-bgimg")!;
        expect(symbol.tag).toBe("text");
        expect(symbol.children![0].text).toBe("\uF0C8");
    });
});

describe("renderer — text", () => {
    const out = renderScene(loadFixture("text"));

    it("anchors by alignment", () => {
        expect(attr(requireNode(out, "p2-MAIN-text"), "text-anchor")).toBe("middle");
        expect(attr(requireNode(out, "p7-MAIN-text"), "text-anchor")).toBe("end");
        // BOTTOM_RIGHT anchors to the area's right edge.
        expect(attr(requireNode(out, "p7-MAIN-text"), "x")).toBe(220);
    });

    it("moves only the horizontal axis for the runtime's textAlign", () => {
        /*
         * LVGL's `text_align` cannot move a line box vertically: `lv_draw_label` puts the first
         * line's baseline at `box.y + base_line` whatever the alignment is. So a centred string must
         * stay at the box's top — centring both axes (which is what `align` means when a caller uses
         * it for a layout name like BOTTOM_RIGHT) would sink every centred label by half the box.
         */
        const withAlign = (text: Record<string, unknown>) =>
            parseScene({
                sceneVersion: 1,
                width: 100,
                height: 100,
                rootPtr: 1,
                objects: [
                    {
                        ptr: 1,
                        index: 0,
                        type: "label",
                        area: { x: 0, y: 0, w: 100, h: 40 },
                        parts: [
                            {
                                part: "MAIN",
                                state: "default",
                                text: { str: "Hi", size: 16, baseline: 13, ...text },
                            },
                        ],
                    },
                ],
            });
        const node = (text: Record<string, unknown>) =>
            flat(renderScene(withAlign(text)).roots).find(n => n.key === "p1-MAIN-text")!;

        const left = node({});
        const centre = node({ textAlign: "CENTER" });
        const right = node({ textAlign: "RIGHT" });

        expect(attr(centre, "text-anchor")).toBe("middle");
        expect(attr(centre, "x")).toBe(50);
        expect(attr(right, "text-anchor")).toBe("end");
        expect(attr(right, "x")).toBe(100);
        // AUTO is the base direction's leading edge, i.e. the same place LEFT draws.
        expect(attr(node({ textAlign: "AUTO" }), "x")).toBe(attr(left, "x"));

        // The baseline never moves: 0 + baseline 13.
        for (const candidate of [left, centre, right]) {
            expect(candidate.children![0].attrs!.y).toBe(13);
        }
        // `align` still drives both axes, as the earlier fixtures expect.
        expect(attr(node({ align: "CENTER" }), "x")).toBe(50);
        expect(node({ align: "CENTER" }).children![0].attrs!.y).toBe((40 - 16) / 2 + 13);
    });

    it("lays out explicit newlines with line spacing", () => {
        const text = requireNode(out, "p3-MAIN-text");
        const tspans = text.children!;
        expect(tspans).toHaveLength(3);
        const ys = tspans.map(t => Number(t.attrs!.y));
        expect(ys[0]).toBeCloseTo(92.8, 3); // area.y 80 + ascent (16 * 0.8)
        expect(ys[1] - ys[0]).toBeCloseTo(20, 3); // size 16 + lineSpace 4
        expect(tspans.map(t => t.text)).toEqual([
            "Line one",
            "Line two",
            "Line three",
        ]);
    });

    it("applies letter spacing and decor", () => {
        expect(attr(requireNode(out, "p2-MAIN-text"), "letter-spacing")).toBe(1);
        expect(requireNode(out, "p4-MAIN-text").style!["text-decoration"]).toBe(
            "underline"
        );
    });

    it("clips overflowing text with a clipPath def", () => {
        const text = requireNode(out, "p5-MAIN-text");
        expect(String(attr(text, "clip-path"))).toMatch(/^url\(#lvgl-textclip-/);
        expect(defsWithPrefix(out, "textclip")).toHaveLength(1);
        expect(defsWithPrefix(out, "textclip")[0].tag).toBe("clipPath");
    });

    it("defaults a missing font size to 14", () => {
        expect(attr(requireNode(out, "p6-MAIN-text"), "font-size")).toBe(14);
    });

    it("maps LVGL built-in fonts to web families", () => {
        expect(attr(requireNode(out, "p2-MAIN-text"), "font-family")).toBe(
            "Montserrat, 'LVGL Symbols', sans-serif"
        );
    });

    it("offers the symbol font as a per-character fallback", () => {
        /*
         * `LV_SYMBOL_*` are FontAwesome codepoints in the private use area, and Montserrat has no
         * glyph there — so without this family the browser draws nothing at all for them, which is
         * how a calendar's month arrows and every icon-only button came out blank.
         *
         * It is a FALLBACK, listed after the text face: fonts resolve per character, so ordinary
         * letters never reach it and their rendering is unchanged.
         */
        const family = String(attr(requireNode(out, "p2-MAIN-text"), "font-family"));
        expect(family.indexOf("Montserrat")).toBeLessThan(
            family.indexOf("LVGL Symbols")
        );
    });
});

describe("renderer — button matrix cells", () => {
    /*
     * A button matrix draws its own content: a rect and a text per cell of its map, with the
     * ITEMS-part style of that cell's own state. A calendar's day grid is one, so before the cells
     * were emitted and rendered, an entire calendar was an empty card in the SVG.
     */
    const scene = parseScene({
        sceneVersion: 1,
        width: 200,
        height: 120,
        rootPtr: 1,
        objects: [
            {
                ptr: 1,
                index: 0,
                type: "object",
                area: { x: 0, y: 0, w: 200, h: 120 },
                parts: [
                    { part: "MAIN", state: "default", bg: { color: "#101010", opacity: 1 } },
                ],
                buttonMatrix: {
                    cells: [
                        {
                            area: { x: 10, y: 20, w: 40, h: 24 },
                            textArea: { x: 22, y: 23, w: 16, h: 17 },
                            text: "Su",
                            state: 1,
                        },
                        {
                            area: { x: 55, y: 20, w: 40, h: 24 },
                            textArea: { x: 70, y: 23, w: 6, h: 17 },
                            text: "1",
                            state: 0,
                        },
                        // A cell with no text: the box is drawn, nothing else.
                        { area: { x: 100, y: 20, w: 40, h: 24 }, state: 0 },
                    ],
                    styles: [
                        {
                            state: 0,
                            style: {
                                bg: { color: "#202020", opacity: 1 },
                                radius: 4,
                                text: {
                                    str: "",
                                    color: "#fafafa",
                                    size: 14,
                                    baseline: 13,
                                    textAlign: "CENTER",
                                },
                            },
                        },
                        {
                            state: 1,
                            style: {
                                bg: { color: "#404040", opacity: 1 },
                                text: { str: "", color: "#808080", size: 14, baseline: 13 },
                            },
                        },
                    ],
                },
            },
        ],
    });
    const out = renderScene(scene);

    it("paints each cell's box in that cell's own state's style", () => {
        expect(attr(requireNode(out, "p1-ITEMS-cell0-bg"), "fill")).toBe("#404040");
        expect(attr(requireNode(out, "p1-ITEMS-cell1-bg"), "fill")).toBe("#202020");
        // The cell box, not the object box: a cell drawn at the object's box would cover the widget.
        const cell = requireNode(out, "p1-ITEMS-cell1-bg");
        expect(attr(cell, "x")).toBe(55);
        expect(attr(cell, "width")).toBe(40);
        expect(attr(cell, "rx")).toBe(4);
    });

    it("places a cell's text in the box LVGL centred it in", () => {
        /*
         * LVGL centres a cell's text itself: it measures the string and shifts it into the middle of
         * the button, then draws it in that measured box. The dump emits the box, so the renderer
         * does not centre anything — it draws in the box it was given, and the string lands where the
         * canvas has it. The two halves are visible here: an AUTO style puts the text at the box's
         * leading edge, a CENTER style at its middle, and both are the middle of the BUTTON because
         * the box is already the text's own size.
         */
        const disabled = requireNode(out, "p1-ITEMS-cell0-text");
        // The run is carried by a tspan (so explicit newlines can be laid out one per line).
        expect(disabled.children![0].text).toBe("Su");
        expect(attr(disabled, "x")).toBe(22); // the emitted text box's leading edge
        expect(attr(disabled, "font-size")).toBe(14);
        expect(attr(disabled, "fill")).toBe("#808080");

        const centred = requireNode(out, "p1-ITEMS-cell1-text");
        expect(attr(centred, "x")).toBe(73); // 70 + 6 / 2 of a CENTER-styled cell
        expect(attr(centred, "text-anchor")).toBe("middle");
        expect(centred.children![0].text).toBe("1");
    });

    it("draws no text for a cell that carries none", () => {
        expect(byKey(out, "p1-ITEMS-cell2-text")).toBeUndefined();
        expect(byKey(out, "p1-ITEMS-cell2-bg")).toBeDefined();
    });

    it("paints the object's own parts before its cells, as LVGL does", () => {
        const keys = out.roots[0].children!.map(n => n.key);
        expect(keys.indexOf("p1-MAIN-bg")).toBeLessThan(keys.indexOf("p1-ITEMS-cell0-bg"));
    });

    it("falls back to the default state's style for an unlisted state", () => {
        // The dump emits a style for every state a cell uses, so this is a safety net rather than a
        // normal case: an unknown state must still be drawn as a button, not dropped.
        const fallback = styleForStateProbe();
        expect(fallback).toBe("#202020");
    });
});

/** Renders a cell whose state has no style block and reports the fill it was given. */
function styleForStateProbe(): unknown {
    const scene = parseScene({
        sceneVersion: 1,
        width: 50,
        height: 50,
        rootPtr: 1,
        objects: [
            {
                ptr: 1,
                index: 0,
                type: "object",
                area: { x: 0, y: 0, w: 50, h: 50 },
                parts: [{ part: "MAIN", state: "default" }],
                buttonMatrix: {
                    cells: [{ area: { x: 0, y: 0, w: 10, h: 10 }, state: 999 }],
                    styles: [{ state: 0, style: { bg: { color: "#202020", opacity: 1 } } }],
                },
            },
        ],
    });
    return attr(requireNode(renderScene(scene), "p1-ITEMS-cell0-bg"), "fill");
}

describe("renderer — media", () => {
    const out = renderScene(loadFixture("media"));

    it("emits a plain image straight from the data URI", () => {
        const img = requireNode(out, "p2-MAIN-img");
        expect(img.tag).toBe("image");
        expect(String(attr(img, "href"))).toMatch(/^data:image\/png;base64,/);
        expect(attr(img, "preserveAspectRatio")).toBe("xMidYMid meet");
        expect(attr(img, "opacity")).toBe(1);
    });

    it("wraps a rotated/zoomed image in a pivot transform group", () => {
        const wrapper = requireNode(out, "p3-MAIN-img");
        expect(wrapper.tag).toBe("g");
        const transform = String(attr(wrapper, "transform"));
        expect(transform).toContain("translate(152 52)");
        expect(transform).toContain("rotate(45)"); // 450 tenths of a degree
        expect(transform).toContain("scale(2)"); // zoom 512 / 256
        expect(transform).toContain("translate(-152 -52)");
        expect(wrapper.children![0].tag).toBe("image");
    });

    it("recolors through a filter def", () => {
        const img = requireNode(out, "p4-MAIN-img");
        expect(String(attr(img, "filter"))).toMatch(/^url\(#lvgl-recolor-/);
        const filters = defsWithPrefix(out, "recolor");
        expect(filters).toHaveLength(1);
        expect(filters[0].children!.map(c => c.tag)).toEqual([
            "feFlood",
            "feComposite",
        ]);
        expect(filters[0].children![0].attrs!["flood-color"]).toBe("#ff0000");
    });

    it("fills a tiled background image from a <pattern> def", () => {
        const bgImage = requireNode(out, "p5-MAIN-bgimg");
        expect(bgImage.tag).toBe("rect");
        expect(String(attr(bgImage, "fill"))).toMatch(/^url\(#lvgl-pattern-/);
        const patterns = defsWithPrefix(out, "pattern");
        expect(patterns).toHaveLength(1);
        expect(patterns[0].children![0].tag).toBe("image");
    });

    it("draws bg then bgImage, and picks a radial def for RADIAL_CENTER", () => {
        const keys = byKey(out, "o6")!.children!.map(n => n.key);
        expect(keys).toEqual(["p6-MAIN-bg", "p6-MAIN-bgimg"]);
        expect(String(attr(requireNode(out, "p6-MAIN-bg"), "fill"))).toMatch(
            /^url\(#lvgl-rgrad-/
        );
    });
});

describe("renderer — dashboard (nesting, clip, scroll)", () => {
    const out = renderScene(loadFixture("dashboard"));

    it("nests grandchildren into their parent chain", () => {
        const o8 = byKey(out, "o8")!;
        const o9 = o8.children!.find(n => n.key === "o9")!;
        expect(o9).toBeDefined();
        expect(o9.children!.some(n => n.key === "o10")).toBe(true);
    });

    it("applies a scroll offset as a group transform", () => {
        const footer = byKey(out, "o13")!;
        // -0 stringifies as "0", so a zero axis reads as 0 in the transform list.
        expect(String(attr(footer, "transform"))).toBe("translate(0 -12)");
    });

    it("applies object clipping via a clipPath def", () => {
        const footer = byKey(out, "o13")!;
        expect(String(attr(footer, "clip-path"))).toMatch(/^url\(#lvgl-clip-/);
        expect(defsWithPrefix(out, "clip")).toHaveLength(1);
    });
});

describe("renderer — kitchen sink (every widget)", () => {
    const out = renderScene(loadFixture("kitchen-sink"));
    const widgetNodes = flat(out.roots).filter(
        node => node.tag === "g" && node.key.startsWith("o1") && node.key !== "o1"
    );

    it("renders every widget group with at least one drawable", () => {
        expect(out.roots).toHaveLength(1);
        // 40 widgets (ptr 100..139) all parented to the screen.
        expect(widgetNodes).toHaveLength(40);
        for (const widget of widgetNodes) {
            expect(
                (widget.children ?? []).length,
                `${widget.key} produced no drawable`
            ).toBeGreaterThan(0);
        }
    });

    it("covers the full part vocabulary including TEXTAREA_PLACEHOLDER", () => {
        const keys = flat(out.roots).map(node => node.key);
        for (const part of [
            "MAIN",
            "SCROLLBAR",
            "INDICATOR",
            "KNOB",
            "SELECTED",
            "ITEMS",
            "CURSOR",
            "TEXTAREA_PLACEHOLDER",
        ]) {
            expect(
                keys.some(key => key.endsWith(`-${part}-bg`) || key.endsWith(`-${part}-text`)),
                `no node rendered for part ${part}`
            ).toBe(true);
        }
    });
});

describe("renderer — draw order", () => {
    const base: Scene = {
        sceneVersion: 1,
        width: 100,
        height: 100,
        rootPtr: 1,
        objects: [
            {
                ptr: 1,
                index: 0,
                type: "panel",
                objId: "p",
                area: { x: 0, y: 0, w: 100, h: 100 },
                parts: [
                    {
                        part: "MAIN",
                        bg: { color: "#111111" },
                        border: { color: "#ffffff", width: 1 },
                        outline: { color: "#ff0000", width: 1 },
                        text: { str: "hi", size: 14 },
                    },
                ],
            },
        ],
    };

    it("draws shadow → bg → border → outline → content", () => {
        const out = renderScene(base);
        const keys = out.roots[0].children!.map(n => n.key);
        expect(keys).toEqual([
            "p1-MAIN-bg",
            "p1-MAIN-border",
            "p1-MAIN-outline",
            "p1-MAIN-text",
        ]);
    });

    it("moves the border after content when post is set (BORDER_POST)", () => {
        const scene: Scene = JSON.parse(JSON.stringify(base));
        scene.objects[0].parts[0].border!.post = true;
        const keys = renderScene(scene).roots[0].children!.map(n => n.key);
        expect(keys).toEqual([
            "p1-MAIN-bg",
            "p1-MAIN-outline",
            "p1-MAIN-text",
            "p1-MAIN-border",
        ]);
    });

    it("still draws a background when no colour is given but a shadow is", () => {
        const scene: Scene = JSON.parse(JSON.stringify(base));
        delete scene.objects[0].parts[0].bg;
        scene.objects[0].parts[0].shadow = {
            color: "#000000",
            width: 4,
            ofsX: 1,
            ofsY: 1,
        };
        const out = renderScene(scene);
        expect(out.roots[0].children!.map(n => n.key)).toContain("p1-MAIN-shadow");
    });
});

describe("renderer — border sides and part opacity", () => {
    function withBorder(side: string, extra: Record<string, unknown> = {}): Scene {
        return parseScene({
            sceneVersion: 1,
            width: 100,
            height: 100,
            rootPtr: 1,
            objects: [
                {
                    ptr: 1,
                    index: 0,
                    type: "panel",
                    area: { x: 0, y: 0, w: 100, h: 100 },
                    parts: [
                        {
                            part: "MAIN",
                            bg: { color: "#111111" },
                            border: { color: "#ffffff", width: 1, side },
                            ...extra,
                        },
                    ],
                },
            ],
        });
    }

    it("draws no outer border for INTERNAL alone", () => {
        // INTERNAL means separators between cells; this renderer does not emit those, and it must
        // not fall back to drawing a full frame.
        const keys = renderScene(withBorder("INTERNAL")).roots[0].children!.map(n => n.key);
        expect(keys).toEqual(["p1-MAIN-bg"]);
    });

    it("still draws the frame for FULL|INTERNAL", () => {
        const border = renderScene(withBorder("FULL|INTERNAL")).roots[0].children!.find(
            n => n.key === "p1-MAIN-border"
        )!;
        expect(border).toBeDefined();
        expect(border.tag).toBe("rect");
    });

    it("wraps a part with LAYER opacity in a group, multiplying everything inside", () => {
        const scene = parseScene({
            sceneVersion: 1,
            width: 100,
            height: 100,
            rootPtr: 1,
            objects: [
                {
                    ptr: 1,
                    index: 0,
                    type: "panel",
                    area: { x: 0, y: 0, w: 100, h: 100 },
                    parts: [
                        {
                            part: "MAIN",
                            opacity: 0.5,
                            bg: { color: "#111111" },
                            text: { str: "hi", size: 12 },
                        },
                    ],
                },
            ],
        });
        const children = renderScene(scene).roots[0].children!;
        expect(children).toHaveLength(1);
        const layer = children[0];
        expect(layer.key).toBe("p1-MAIN-layer");
        expect(layer.tag).toBe("g");
        expect(layer.attrs!.opacity).toBe(0.5);
        // bg + text are inside the layer, so the opacity applies to both.
        expect(layer.children!.map(n => n.key)).toEqual([
            "p1-MAIN-bg",
            "p1-MAIN-text",
        ]);
    });

    it("leaves a fully opaque part unwrapped", () => {
        const out = renderScene(withBorder("FULL", { opacity: 1 }));
        expect(out.roots[0].children!.map(n => n.key)).toEqual([
            "p1-MAIN-bg",
            "p1-MAIN-border",
        ]);
    });
});

describe("renderer — image sizing, alignment and clipping", () => {
    const AREA = { x: 100, y: 50, w: 100, h: 60 };

    function withImage(
        img: Record<string, unknown>,
        area: Record<string, number> = AREA
    ): Scene {
        return parseScene({
            sceneVersion: 1,
            width: 400,
            height: 300,
            rootPtr: 1,
            objects: [
                {
                    ptr: 1,
                    index: 0,
                    type: "image",
                    area,
                    parts: [
                        {
                            part: "MAIN",
                            img: {
                                srcId: "data:image/png;base64,AAAA",
                                naturalWidth: 40,
                                naturalHeight: 20,
                                ...img,
                            },
                        },
                    ],
                },
            ],
        });
    }

    /** The <image> element inside the scene, bare or wrapped. */
    function imgNode(scene: Scene): DrawNode {
        const found = flat(renderScene(scene).roots).find(n => n.tag === "image");
        expect(found, "expected an <image> element").toBeDefined();
        return found!;
    }


    it("draws the bitmap at its natural size, centred by default", () => {
        const img = imgNode(withImage({}));
        expect(attr(img, "width")).toBe(40);
        expect(attr(img, "height")).toBe(20);
        expect(attr(img, "x")).toBe(130); // 100 + (100 - 40) / 2
        expect(attr(img, "y")).toBe(70); // 50 + (60 - 20) / 2
        // The box is authoritative — never letterbox the bitmap inside itself.
        expect(attr(img, "preserveAspectRatio")).toBe("none");
    });

    it("centres ONLY the axis the alignment names", () => {
        // TOP_MID: horizontally centred, but hard against the top — not vertically centred.
        const topMid = imgNode(withImage({ align: "TOP_MID" }));
        expect(attr(topMid, "x")).toBe(130);
        expect(attr(topMid, "y")).toBe(50);

        // LEFT_MID: vertically centred, but hard against the left — not horizontally centred.
        const leftMid = imgNode(withImage({ align: "LEFT_MID" }));
        expect(attr(leftMid, "x")).toBe(100);
        expect(attr(leftMid, "y")).toBe(70);

        // BOTTOM_RIGHT: neither axis centred.
        const bottomRight = imgNode(withImage({ align: "BOTTOM_RIGHT" }));
        expect(attr(bottomRight, "x")).toBe(160); // 100 + 100 - 40
        expect(attr(bottomRight, "y")).toBe(90); // 50 + 60 - 20
    });

    it("applies the image scale to the natural size once, not twice", () => {
        const scene = withImage({ zoom: 512 }); // 2×
        const img = imgNode(scene);
        expect(attr(img, "width")).toBe(80);
        expect(attr(img, "height")).toBe(40);
        expect(attr(img, "x")).toBe(110); // 100 + (100 - 80) / 2
        // There is no transform group, so the scale cannot be applied a second time.
        const wrappers = flat(renderScene(scene).roots).filter(n => n.tag === "g");
        expect(wrappers.some(n => String(attr(n, "transform")).includes("scale("))).toBe(
            false
        );
    });

    it("stretches to the widget box for STRETCH, ignoring the source size", () => {
        const scene = withImage({ align: "STRETCH" });
        const img = imgNode(scene);
        expect(attr(img, "x")).toBe(100);
        expect(attr(img, "y")).toBe(50);
        expect(attr(img, "width")).toBe(100);
        expect(attr(img, "height")).toBe(60);
        // `none` is what makes it actually stretch rather than letterbox.
        expect(attr(img, "preserveAspectRatio")).toBe("none");
    });

    it("still rotates about the pivot without scaling when the size is known", () => {
        const scene = withImage({ rotation: 450, zoom: 512 });
        const out = renderScene(scene);
        const wrapper = flat(out.roots).find(
            n => n.tag === "g" && String(attr(n, "transform")).includes("rotate(")
        )!;
        expect(wrapper).toBeDefined();
        const transform = String(attr(wrapper, "transform"));
        expect(transform).toContain("rotate(45)");
        expect(transform).not.toContain("scale("); // zoom already lives in width/height
        expect(transform).toContain("translate(150 80)"); // area centre
    });

    it("clips a bitmap larger than its widget", () => {
        // 200×120 natural size inside a 100×60 widget, centred → spills 50px on every side.
        const scene = withImage({ naturalWidth: 200, naturalHeight: 120 });
        const clip = flat(renderScene(scene).roots).find(
            n => String(attr(n, "clip-path")).startsWith("url(#lvgl-imgclip-")
        )!;
        expect(clip).toBeDefined();
        expect(clip.tag).toBe("g");
        const clipId = String(attr(clip, "clip-path"));
        expect(clipId).toMatch(/^url\(#lvgl-imgclip-/);
        // It clips to the widget box, so the bitmap cannot paint over its neighbours.
        const defs = defsWithPrefix(renderScene(scene), "imgclip");
        expect(defs).toHaveLength(1);
        expect(defs[0].tag).toBe("clipPath");
        const rect = defs[0].children![0];
        expect(rect.tag).toBe("rect");
        expect(rect.attrs!.x).toBe(100);
        expect(rect.attrs!.width).toBe(100);
    });

    it("does not add a clip when the bitmap already fits", () => {
        const keys = flat(renderScene(withImage({})).roots).map(n => n.key);
        expect(keys).not.toContain("p1-MAIN-img-clip");
        expect(keys).toContain("p1-MAIN-img");
    });

    it("keeps the legacy behaviour when the source size is unknown", () => {
        const scene = withImage({ naturalWidth: undefined, naturalHeight: undefined });
        const img = imgNode(scene);
        expect(attr(img, "x")).toBe(100);
        expect(attr(img, "width")).toBe(100);
        expect(attr(img, "preserveAspectRatio")).toBe("xMidYMid meet");
    });
});

describe("renderer — object clipping", () => {
    function withClip(clip: Record<string, unknown> | undefined): Scene {
        return parseScene({
            sceneVersion: 1,
            width: 200,
            height: 200,
            rootPtr: 1,
            objects: [
                {
                    ptr: 1,
                    index: 0,
                    type: "panel",
                    area: { x: 0, y: 0, w: 200, h: 200 },
                    clip,
                    parts: [{ part: "MAIN", bg: { color: "#ffffff" } }],
                },
            ],
        });
    }

    it("references a clipPath when the object declares a clip", () => {
        const out = renderScene(
            withClip({ x: 4, y: 4, w: 192, h: 192, radius: 8 })
        );
        const group = out.roots[0];
        expect(String(attr(group, "clip-path"))).toMatch(/^url\(#lvgl-clip-/);
        const defs = defsWithPrefix(out, "clip");
        expect(defs).toHaveLength(1);
        expect(defs[0].tag).toBe("clipPath");
        // A rounded container clips to a rounded rect.
        expect(defs[0].children![0].attrs!.rx).toBe(8);
    });

    it("shares one clip def between objects that clip to the same box", () => {
        const scene = parseScene({
            sceneVersion: 1,
            width: 200,
            height: 200,
            rootPtr: 1,
            objects: [
                {
                    ptr: 1,
                    index: 0,
                    type: "panel",
                    area: { x: 0, y: 0, w: 200, h: 200 },
                    clip: { x: 0, y: 0, w: 100, h: 100 },
                    parts: [{ part: "MAIN", bg: { color: "#ffffff" } }],
                },
                {
                    ptr: 2,
                    parentPtr: 1,
                    index: 0,
                    type: "panel",
                    area: { x: 0, y: 0, w: 100, h: 100 },
                    clip: { x: 0, y: 0, w: 100, h: 100 },
                    parts: [{ part: "MAIN", bg: { color: "#eeeeee" } }],
                },
            ],
        });
        const out = renderScene(scene);
        expect(defsWithPrefix(out, "clip")).toHaveLength(1);
        // Per-object keys survive even though both point at the same def.
        expect(byKey(out, "o1")!.key).toBe("o1");
        expect(byKey(out, "o2")!.key).toBe("o2");
        expect(String(attr(byKey(out, "o2")!, "clip-path"))).toBe(
            String(attr(byKey(out, "o1")!, "clip-path"))
        );
    });

    it("draws an unclipped object without any clip reference", () => {
        expect(attr(renderScene(withClip(undefined)).roots[0], "clip-path")).toBeUndefined();
    });
});

describe("renderer — def ids are stable across frames", () => {
    it("produces identical ids for identical content", () => {
        const scene = loadFixture("boxes");
        const first = renderScene(scene).defs.map(def => def.id);
        const second = renderScene(scene).defs.map(def => def.id);
        expect(second).toEqual(first);
        expect(new Set(first).size).toBe(first.length);
    });

    it("drops a def when nothing references it any more", () => {
        const withShadow = renderScene(loadFixture("boxes"));
        expect(defsWithPrefix(withShadow, "shadow").length).toBeGreaterThan(0);

        const scene = parseScene({
            sceneVersion: 1,
            width: 10,
            height: 10,
            rootPtr: 1,
            objects: [
                {
                    ptr: 1,
                    index: 0,
                    type: "panel",
                    area: { x: 0, y: 0, w: 10, h: 10 },
                    parts: [{ part: "MAIN", bg: { color: "#000000" } }],
                },
            ],
        });
        expect(renderScene(scene).defs).toHaveLength(0);
    });
});
