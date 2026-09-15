import { describe, expect, it, vi } from "vitest";
import {
    NEVER_DRAWN_PART_NAMES,
    PART_PAINT_ORDER,
    SceneDump,
    WIRE_PART_NAMES,
    borderSideName,
    imageAlignName,
    parseSceneDump,
    wireToScene,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/scene-dump";
import type {
    SceneDumpWasm,
    WireScene,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/scene-dump";
import { createSvgContext, isSvgContext } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-context";
import { renderScene } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-renderer";
import {
    SVG_RENDERER_STORAGE_KEY,
    SVG_RENDERER_SUPPORTED_VERSION,
    isSvgRendererEnabled,
    parseSvgOverride,
    setSvgRendererEnabled,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/feature-flag";

// ---------------------------------------------------------------------------------------
// a fake Emscripten module: a tiny heap plus the two-call size protocol
// ---------------------------------------------------------------------------------------

function createFakeWasm(payload: (root: number) => string | undefined) {
    const heap = new Uint8Array(1 << 20);
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let next = 16;
    const allocations: number[] = [];
    const frees: number[] = [];

    const wasm: SceneDumpWasm & { allocations: number[]; frees: number[] } = {
        allocations,
        frees,
        _malloc(size: number) {
            const ptr = next;
            next += size;
            allocations.push(size);
            return ptr;
        },
        _free(ptr: number) {
            frees.push(ptr);
        },
        _lvglDumpScene(root: number, out: number, outLen: number) {
            const text = payload(root);
            if (text === undefined) {
                return -1;
            }
            const bytes = encoder.encode(text);
            if (outLen < bytes.length + 1) {
                return -(bytes.length + 1);
            }
            heap.set(bytes, out);
            heap[out + bytes.length] = 0;
            return bytes.length;
        },
        _lvglCountObjects: () => 7,
        UTF8ToString(ptr: number) {
            let end = ptr;
            while (heap[end] !== 0) {
                end++;
            }
            return decoder.decode(heap.subarray(ptr, end));
        },
    };
    return wasm;
}

describe("scene-dump — the binding", () => {
    it("is unavailable until the runtime exposes the dump", () => {
        const dumper = new SceneDump(() => undefined);
        expect(dumper.isAvailable()).toBe(false);
        expect(dumper.dump(1)).toBeUndefined();
        // countObjects reports "no counter" rather than throwing.
        expect(dumper.countObjects(1)).toBe(-1);
        expect(() => dumper.dispose()).not.toThrow();
    });

    it("resolves the WASM module lazily (it only exists after mount)", () => {
        let wasm: SceneDumpWasm | undefined;
        const dumper = new SceneDump(() => wasm);
        expect(dumper.isAvailable()).toBe(false);

        wasm = createFakeWasm(() => '{"ok":true}');
        expect(dumper.isAvailable()).toBe(true);
        expect(dumper.dump(1)).toBe('{"ok":true}');
    });

    it("returns the dumped JSON and reuses one scratch buffer", () => {
        const wasm = createFakeWasm(() => '{"sceneVersion":1}');
        const dumper = new SceneDump(() => wasm);
        expect(dumper.dump(1)).toBe('{"sceneVersion":1}');
        expect(dumper.dump(1)).toBe('{"sceneVersion":1}');
        // Allocated once, never per frame.
        expect(wasm.allocations).toHaveLength(1);
    });

    it("grows and frees the buffer when the payload does not fit", () => {
        const big = "x".repeat(9000);
        const wasm = createFakeWasm(() => `{"pad":"${big}"}`);
        const dumper = new SceneDump(() => wasm);
        const result = dumper.dump(1);
        expect(result).toContain(big);
        // First allocation is the initial scratch, second is the grown one, and the old one is freed.
        expect(wasm.allocations.length).toBe(2);
        expect(wasm.allocations[1]).toBeGreaterThan(wasm.allocations[0]);
        expect(wasm.frees).toHaveLength(1);
    });

    it("gives up instead of looping when the dump keeps reporting the same size", () => {
        const wasm = createFakeWasm(() => "y".repeat(100));
        // Always claim the buffer is too small, whatever its size.
        wasm._lvglDumpScene = () => -3;
        const dumper = new SceneDump(() => wasm);
        expect(dumper.dump(1)).toBeUndefined();
    });

    it("releases the scratch buffer on dispose and tolerates a second call", () => {
        const wasm = createFakeWasm(() => "{}");
        const dumper = new SceneDump(() => wasm);
        dumper.dump(1);
        dumper.dispose();
        expect(wasm.frees).toHaveLength(1);
        expect(() => dumper.dispose()).not.toThrow();
        // A later dump simply reallocates.
        expect(dumper.dump(1)).toBe("{}");
    });

    it("diagnoses a missing module and an unbooted module as transient", () => {
        const dumper = new SceneDump(() => undefined);
        expect(dumper.diagnose()).toBe("no-module");

        // A module created but with its wasm exports not assigned yet.
        const unbooted = { _lvglDumpScene: undefined } as unknown as SceneDumpWasm;
        const dumper2 = new SceneDump(() => unbooted);
        expect(dumper2.diagnose()).toBe("not-booted");
    });

    it("diagnoses a booted module without the dump as a stale artifact", () => {
        // This is the Firefox symptom: the module is alive (its other wasm exports exist) but
        // lvglDumpScene is absent, which no boot ordering can explain — only an old .wasm.
        const stale = {
            _malloc: () => 1,
            _free: () => undefined,
            _lvglDumpScene: undefined,
        } as unknown as SceneDumpWasm;
        const dumper = new SceneDump(() => stale);
        expect(dumper.diagnose()).toBe("no-dump");
        expect(dumper.isAvailable()).toBe(false);
    });

    it("reports ok once the dump and its buffer helpers are present", () => {
        const wasm = createFakeWasm(() => "{}");
        expect(new SceneDump(() => wasm).diagnose()).toBe("ok");
    });
});

/** Depth-first search for the first node with a tag (local to this file). */
function findTag(nodes: any[], tag: string): any {
    for (const node of nodes ?? []) {
        if (node.tag === tag) {
            return node;
        }
        const found = findTag(node.children, tag);
        if (found) {
            return found;
        }
    }
    return undefined;
}

// ---------------------------------------------------------------------------------------
// wire → Scene
// ---------------------------------------------------------------------------------------

const WIRE: WireScene = {
    sceneVersion: 1,
    width: 480,
    height: 320,
    rootPtr: 100,
    objects: [
        {
            ptr: 100,
            parentPtr: 0,
            index: 0,
            area: { x: 0, y: 0, w: 480, h: 320 },
            parts: [
                {
                    p: 0,
                    bgColor: 0x112233,
                    bgOpa: 255,
                    radius: 6,
                    textColor: 0xff0000,
                    textOpa: 255,
                    fontSize: 18,
                },
            ],
        },
        {
            ptr: 200,
            parentPtr: 100,
            index: 0,
            area: { x: 10, y: 20, w: 100, h: 40 },
            hidden: true,
            scroll: { x: 0, y: 5 },
            parts: [
                { p: 0, bgColor: 0x000000, bgOpa: 128 },
                { p: 5, bgColor: 0xff9800, bgOpa: 255 },
                { p: 1, bgColor: 0x556677, bgOpa: 160 },
                {
                    p: 2,
                    bgColor: 0x00ff00,
                    bgOpa: 255,
                    borderWidth: 2,
                    borderColor: 0xffffff,
                    borderOpa: 255,
                    borderSide: 0x0a,
                },
                {
                    p: 7,
                    opa: 128,
                    arcWidth: 4,
                    arcColor: 0x4fc3f7,
                    arcOpa: 255,
                    arcRounded: 1,
                },
            ],
        },
    ],
};

/**
 * A textarea whose own text is empty. LVGL draws the placeholder instead, in the
 * TEXTAREA_PLACEHOLDER part's style, so both part slots carry a text colour (the theme resolves a
 * text colour for MAIN as well: a label's is white, the placeholder's is grey).
 */
const TEXTAREA_WIRE: WireScene = {
    sceneVersion: 1,
    width: 480,
    height: 320,
    rootPtr: 300,
    objects: [
        {
            ptr: 300,
            parentPtr: 0,
            index: 0,
            area: { x: 136, y: 35, w: 241, h: 123 },
            parts: [
                {
                    p: 0,
                    borderWidth: 2,
                    borderColor: 0x2f3237,
                    borderOpa: 255,
                    textColor: 0xffffff,
                    textOpa: 255,
                    fontSize: 52,
                },
                { p: 7, textColor: 0x616161, textOpa: 255, fontSize: 52 },
            ],
        },
    ],
};

describe("scene-dump — wire mapping", () => {
    it("maps part slots to LVGL 9 part names (slot 7 is the textarea placeholder)", () => {
        expect(WIRE_PART_NAMES[0]).toBe("MAIN");
        expect(WIRE_PART_NAMES[7]).toBe("TEXTAREA_PLACEHOLDER");
        expect(Object.values(WIRE_PART_NAMES)).not.toContain("TICKS");
        expect(Object.values(WIRE_PART_NAMES)).toHaveLength(8);
    });

    it("converts colours, opacities and enums into the Scene contract", () => {
        const scene = wireToScene(WIRE);
        const root = scene.objects[0];
        expect(root.bgColor).toBeUndefined();
        expect(root.parts[0].bg!.color).toBe("#112233");
        expect(root.parts[0].bg!.opacity).toBe(1);
        expect(root.parts[0].radius).toBe(6);
        // A MAIN radius is lifted to the object.
        expect(root.radius).toBe(6);
        expect(root.parts[0].opacity).toBeUndefined();

        const child = scene.objects[1];
        expect(child.parts.find(p => p.part === "MAIN")!.bg!.opacity).toBeCloseTo(
            128 / 255,
            5
        );
    });

    it("turns the border side bitmask into names", () => {
        // TOP|RIGHT = 0x0a
        const child = wireToScene(WIRE).objects[1];
        expect(child.parts.find(p => p.part === "INDICATOR")!.border!.side).toBe(
            "TOP|RIGHT"
        );
        expect(borderSideName(0)).toBe("NONE");
        expect(borderSideName(0x0f)).toBe("FULL");
        // INTERNAL alone means "separators between cells", which is still a distinct value — the
        // renderer is what decides not to draw an outer frame for it.
        expect(borderSideName(0x10)).toBe("INTERNAL");
        expect(borderSideName(0x1f)).toBe("FULL|INTERNAL");
        expect(borderSideName(0x01)).toBe("BOTTOM");
        expect(borderSideName(0x04)).toBe("LEFT");
    });

    it("orders parts by LVGL paint order, not by wire slot", () => {
        // The wire arrives as MAIN, ITEMS, SCROLLBAR, INDICATOR, TEXTAREA_PLACEHOLDER and must be
        // emitted as MAIN, INDICATOR, TEXTAREA_PLACEHOLDER, SCROLLBAR: TEXTAREA_PLACEHOLDER arrives
        // last but is painted before the scrollbar, so the order cannot come from the wire.
        // ITEMS is absent because a part LVGL never draws from an object's box is dropped.
        const child = wireToScene(WIRE).objects[1];
        expect(child.parts.map(p => p.part)).toEqual([
            "MAIN",
            "INDICATOR",
            "TEXTAREA_PLACEHOLDER",
            "SCROLLBAR",
        ]);
        expect(PART_PAINT_ORDER[PART_PAINT_ORDER.length - 1]).toBe("SCROLLBAR");
    });

    it("drops the parts LVGL never draws from an object's box", () => {
        // The theme styles these on every object (SELECTED with a solid background), but only the
        // widget that owns them can place them. A part with no area would otherwise be rendered as
        // the object's whole box: a phantom shape over the widget.
        const child = wireToScene({
            ...WIRE,
            objects: [
                WIRE.objects[0],
                {
                    ...WIRE.objects[1],
                    parts: [
                        ...WIRE.objects[1].parts,
                        { p: 4, bgColor: 0x2196f3, bgOpa: 255 },
                        { p: 6, bgColor: 0x2196f3, bgOpa: 255 },
                    ],
                },
            ],
        }).objects[1];
        expect(child.parts.map(p => p.part)).toEqual([
            "MAIN",
            "INDICATOR",
            "TEXTAREA_PLACEHOLDER",
            "SCROLLBAR",
        ]);
        expect(NEVER_DRAWN_PART_NAMES).toEqual(["SELECTED", "ITEMS", "CURSOR"]);
    });

    it("marks hidden objects and forwards scroll", () => {
        const child = wireToScene(WIRE).objects[1];
        expect(child.hidden).toBe(true);
        expect(child.scroll).toEqual({ x: 0, y: 5 });
    });

    it("treats parentPtr 0 as 'no parent'", () => {
        const scene = wireToScene(WIRE);
        expect(scene.objects[0].parentPtr).toBeUndefined();
        expect(scene.objects[1].parentPtr).toBe(100);
    });

    it("takes the text string from the model and styling from the dump", () => {
        const scene = wireToScene(WIRE, ptr =>
            ptr === 100 ? { objId: "label1", type: "label", text: { str: "Hello" } } : undefined
        );
        const text = scene.objects[0].parts[0].text!;
        expect(text.str).toBe("Hello");
        // colour came from the LVGL dump
        expect(text.color).toBe("#ff0000");
        // 18 is the LVGL font's LINE HEIGHT: the nominal size is 16 and the baseline 15
        // (line_height - base_line, read from lv_font_montserrat_16).
        expect(text.size).toBe(16);
        expect(text.baseline).toBe(15);
        expect(text.opacity).toBe(1);
        expect(scene.objects[0].objId).toBe("label1");
        expect(scene.objects[0].type).toBe("label");
    });

    it("lets the widget model override the dumped text styling", () => {
        const scene = wireToScene(WIRE, ptr =>
            ptr === 100
                ? { type: "label", text: { str: "Hi", size: 32, color: "#0000ff" } }
                : undefined
        );
        const text = scene.objects[0].parts[0].text!;
        expect(text.size).toBe(32);
        expect(text.color).toBe("#0000ff");
    });

    it("drops the text entirely when the widget has none", () => {
        const scene = wireToScene(WIRE);
        expect(scene.objects[0].parts[0].text).toBeUndefined();
    });

    it("draws an empty textarea's placeholder in the placeholder part's style", () => {
        /*
         * LVGL draws the placeholder (part TEXTAREA_PLACEHOLDER) whenever a textarea's text is
         * empty, and the dump cannot see the string — so without this merge an empty textarea
         * renders as nothing at all. The colour is deliberately NOT MAIN's: the theme's placeholder
         * grey resolves through slot 7 only.
         */
        const scene = wireToScene(TEXTAREA_WIRE, ptr =>
            ptr === 300 ? { type: "textarea", placeholder: "88.8" } : undefined
        );
        const placeholder = scene.objects[0].parts.find(
            part => part.part === "TEXTAREA_PLACEHOLDER"
        )!;
        expect(placeholder.text!.str).toBe("88.8");
        expect(placeholder.text!.color).toBe("#616161");
        // line_height 52 is Montserrat 48, whose ascent (baseline) is 43.
        expect(placeholder.text!.size).toBe(48);
        expect(placeholder.text!.baseline).toBe(43);
        expect(placeholder.text!.opacity).toBe(1);
        // MAIN stays text-free: the placeholder is not the object's own text.
        expect(scene.objects[0].parts.find(part => part.part === "MAIN")!.text).toBeUndefined();

        const node = findTag(renderScene(scene).roots, "text");
        expect(node).toBeDefined();
        expect(node.attrs["fill"]).toBe("#616161");
        expect(JSON.stringify(node)).toContain("88.8");
    });

    it("leaves a textarea's MAIN text-free (its internal label draws it)", () => {
        // LVGL draws a textarea's text through `ta->label = lv_label_create(obj)`, which the dump
        // emits as its own object with the content box the text belongs in. Drawing the model's
        // string on the textarea as well painted every value twice.
        const scene = wireToScene(TEXTAREA_WIRE, ptr =>
            ptr === 300
                ? { type: "textarea", text: { str: "72.5" }, placeholder: "88.8" }
                : undefined
        );
        const parts = scene.objects[0].parts;
        expect(parts.find(part => part.part === "MAIN")!.text).toBeUndefined();
        // A textarea's model text can be stale (the Flow writes it at run time), so its placeholder
        // is drawn from the model until the runtime reports otherwise.
        expect(parts.find(part => part.part === "TEXTAREA_PLACEHOLDER")!.text!.str).toBe("88.8");
    });

    it("invents no placeholder for a widget that has none", () => {
        const scene = wireToScene(TEXTAREA_WIRE, ptr =>
            ptr === 300 ? { type: "textarea" } : undefined
        );
        expect(scene.objects[0].parts.some(part => part.part === "TEXTAREA_PLACEHOLDER")).toBe(
            false
        );
    });

    it("prefers the live string from the dump over the model's", () => {
        // The Flow runtime writes label text at run time, so the model only holds the design-time
        // value; the dump's string is what the canvas actually draws.
        const scene = wireToScene(
            { ...WIRE, objects: [{ ...WIRE.objects[0], liveText: "72.5", liveTextPart: 0 }, WIRE.objects[1]] },
            ptr => (ptr === 100 ? { type: "label", text: { str: "0.0" } } : undefined)
        );
        const text = scene.objects[0].parts[0].text!;
        expect(text.str).toBe("72.5");
        // Styling still comes from the dump.
        expect(text.color).toBe("#ff0000");
        expect(text.size).toBe(16);
    });

    it("fills the placeholder part from the live text", () => {
        const scene = wireToScene(
            { ...TEXTAREA_WIRE, objects: [{ ...TEXTAREA_WIRE.objects[0], liveText: "SetPoint", liveTextPart: 7 }] },
            ptr => (ptr === 300 ? { type: "textarea" } : undefined)
        );
        const placeholder = scene.objects[0].parts.find(
            part => part.part === "TEXTAREA_PLACEHOLDER"
        )!;
        expect(placeholder.text!.str).toBe("SetPoint");
        expect(placeholder.text!.color).toBe("#616161");
        expect(scene.objects[0].parts.find(part => part.part === "MAIN")!.text).toBeUndefined();
    });

    it("falls back to the model for a live string holding a symbol glyph", () => {
        // LVGL's LV_SYMBOL_* glyphs live in a private-use range the SVG has no font for, so the
        // model's string (which the editor resolves to an icon) is kept instead.
        const scene = wireToScene(
            { ...WIRE, objects: [{ ...WIRE.objects[0], liveText: "\uF2B5 fan", liveTextPart: 0 }, WIRE.objects[1]] },
            ptr => (ptr === 100 ? { type: "label", text: { str: "Fan" } } : undefined)
        );
        expect(scene.objects[0].parts[0].text!.str).toBe("Fan");
    });

    it("carries the content box LVGL draws text in", () => {
        // The theme pads widgets even when the model declares no padding, so text drawn at the
        // object's box lands several pixels off (measured: 11 px high, 10 px left).
        const scene = wireToScene({
            ...WIRE,
            objects: [
                { ...WIRE.objects[0], textArea: { x: 5, y: 7, w: 40, h: 20 } },
                WIRE.objects[1],
            ],
        });
        expect(scene.objects[0].textArea).toEqual({ x: 5, y: 7, w: 40, h: 20 });
        // Absent means "not padded": the object's own box is its text box.
        expect(scene.objects[1].textArea).toBeUndefined();
    });

    it("draws text in the content box, on LVGL's baseline", () => {
        const scene = wireToScene(
            {
                ...WIRE,
                objects: [
                    { ...WIRE.objects[0], textArea: { x: 10, y: 12, w: 60, h: 30 } },
                    WIRE.objects[1],
                ],
            },
            ptr => (ptr === 100 ? { type: "label", text: { str: "Hi" } } : undefined)
        );
        const node = findTag(renderScene(scene).roots, "text");
        expect(node).toBeDefined();
        expect(node.attrs["font-size"]).toBe(16);
        const tspan = node.children[0];
        expect(tspan.attrs["x"]).toBe(10);
        expect(tspan.attrs["y"]).toBe(12 + 15);
    });

    it("carries a widget-model image source into the MAIN part", () => {
        // Image sources live only in the widget model (the dump deliberately never emits them),
        // so without this merge no <image> element is ever produced.
        const scene = wireToScene(WIRE, ptr =>
            ptr === 100
                ? {
                      type: "image",
                      img: { srcId: "data:image/png;base64,iVBORw0KGgo=", opacity: 0.5 },
                  }
                : undefined
        );
        const img = scene.objects[0].parts[0].img!;
        expect(img.srcId).toBe("data:image/png;base64,iVBORw0KGgo=");
        expect(img.opacity).toBe(0.5);
        // And it survives into the renderer as a real <image>.
        const out = renderScene(scene);
        const node = findTag(out.roots, "image");
        expect(node).toBeDefined();
        expect(node.attrs["href"]).toBe("data:image/png;base64,iVBORw0KGgo=");
    });

    it("filters parts the widget does not declare", () => {
        const scene = wireToScene(WIRE, ptr =>
            ptr === 200 ? { type: "slider", parts: ["MAIN", "INDICATOR"] } : undefined
        );
        expect(scene.objects[1].parts.map(p => p.part)).toEqual([
            "MAIN",
            "INDICATOR",
        ]);
    });

    it("wraps a part-level opa as a layer opacity", () => {
        const placeholder = wireToScene(WIRE).objects[1].parts.find(
            p => p.part === "TEXTAREA_PLACEHOLDER"
        )!;
        expect(placeholder.opacity).toBeCloseTo(128 / 255, 5);
    });

    it("reports a usable type for objects the widget tree does not know", () => {
        // LVGL-internal objects (e.g. a tabview's burrowed tab bar) have no widget entry, but the
        // Scene contract requires a non-empty type.
        const scene = wireToScene(WIRE);
        expect(scene.objects[1].type).toBe("object");
    });

    it("maps the arc sweep emitted for arc widgets", () => {
        // Without the angles the renderer can only draw a full circle, which turned every gauge into
        // a ring. 0 is a real angle here, so it must survive the mapping.
        const wire: WireScene = JSON.parse(JSON.stringify(WIRE));
        wire.objects[1].parts = [
            { p: 0, bgColor: 0x112233, bgOpa: 255 },
            { p: 2, arcWidth: 7, arcColor: 0x62b7ff, arcOpa: 255, arcStart: 0, arcEnd: 144 },
        ];
        const child = wireToScene(wire).objects[1];
        const indicator = child.parts.find(part => part.part === "INDICATOR")!;
        expect(indicator.arc!.start).toBe(0);
        expect(indicator.arc!.end).toBe(144);
        expect(indicator.arc!.width).toBe(7);
    });

    it("keeps a full-circle default when no sweep is emitted", () => {
        // Non-arc widgets that reuse arc styling (a spinner indicator) carry no angles.
        const wire: WireScene = JSON.parse(JSON.stringify(WIRE));
        wire.objects[1].parts = [
            { p: 0, bgColor: 0x112233, bgOpa: 255 },
            { p: 2, arcWidth: 4, arcColor: 0x4fc3f7, arcOpa: 255 },
        ];
        const child = wireToScene(wire).objects[1];
        const indicator = child.parts.find(part => part.part === "INDICATOR")!;
        expect(indicator.arc!.start).toBe(0);
        expect(indicator.arc!.end).toBe(3600);
    });

    it("maps an arc's MAIN part as the track, over its own sweep", () => {
        // An arc widget splits across two parts: MAIN is the track (LVGL draws it between
        // bg_angle_start/end, which for a default themed arc is 270 degrees, not a full ring) and
        // INDICATOR is the value sweep. A track part must not also become a value arc, or the track
        // would be painted twice: once in the track colour and once in the value colour.
        const wire: WireScene = JSON.parse(JSON.stringify(WIRE));
        wire.objects[1].parts = [
            { p: 0, arcWidth: 12, arcColor: 0x263238, arcOpa: 255, arcBgStart: 1350, arcBgEnd: 4050 },
            { p: 2, arcWidth: 12, arcColor: 0x4fc3f7, arcOpa: 255, arcStart: 1350, arcEnd: 2025 },
        ];
        const child = wireToScene(wire).objects[1];
        const main = child.parts.find(part => part.part === "MAIN")!;
        expect(main.arc!.start).toBeUndefined();
        expect(main.arc!.end).toBeUndefined();
        expect(main.arc!.color).toBeUndefined();
        expect(main.arc!.bgColor).toBe("#263238");
        expect(main.arc!.bgStart).toBe(1350);
        expect(main.arc!.bgEnd).toBe(4050);
        expect(main.arc!.bgWidth).toBe(12);

        const indicator = child.parts.find(part => part.part === "INDICATOR")!;
        expect(indicator.arc!.start).toBe(1350);
        expect(indicator.arc!.end).toBe(2025);
        expect(indicator.arc!.bgColor).toBeUndefined();
    });

    it("carries a part-level area when the part is not the object's box", () => {
        // A scrollbar is a thin strip; without this it was painted as a filled box the size of the
        // object (the source of the phantom shapes).
        const wire: WireScene = JSON.parse(JSON.stringify(WIRE));
        wire.objects[0].parts = [
            { p: 0, bgColor: 0x15171a, bgOpa: 255 },
            {
                p: 1,
                bgColor: 0x616161,
                bgOpa: 102,
                radius: 32767,
                area: { x: 470, y: 4, w: 6, h: 312 },
            },
        ];
        const screen = wireToScene(wire).objects[0];
        const scrollbar = screen.parts.find(part => part.part === "SCROLLBAR")!;
        expect(scrollbar.area).toEqual({ x: 470, y: 4, w: 6, h: 312 });
        // The object's own box is untouched by a part area.
        expect(screen.area).toEqual({ x: 0, y: 0, w: 480, h: 320 });
    });

    it("parseSceneDump rejects unusable payloads instead of throwing", () => {
        expect(parseSceneDump("not json")).toBeUndefined();
        expect(parseSceneDump('{"sceneVersion":99,"objects":[]}')).toBeUndefined();
        expect(parseSceneDump('{"sceneVersion":1}')).toBeUndefined();
        expect(parseSceneDump(JSON.stringify(WIRE))!.objects).toHaveLength(2);
    });
});

// ---------------------------------------------------------------------------------------
// clip boxes and image geometry (the two fields added for drawing fidelity)
// ---------------------------------------------------------------------------------------

const GEOMETRY_WIRE: WireScene = {
    sceneVersion: 1,
    width: 200,
    height: 200,
    rootPtr: 1,
    objects: [
        {
            ptr: 1,
            parentPtr: 0,
            index: -1,
            area: { x: 0, y: 0, w: 200, h: 200 },
            clip: { x: 8, y: 8, w: 184, h: 184 },
            parts: [{ p: 0, bgColor: 0xffffff, bgOpa: 255, radius: 10 }],
        },
        {
            ptr: 2,
            parentPtr: 1,
            index: 0,
            area: { x: 10, y: 10, w: 60, h: 40 },
            imgW: 40,
            imgH: 30,
            imgAlign: 2,
            parts: [{ p: 0 }],
        },
    ],
};

describe("scene-dump — clip and image geometry", () => {
    it("maps LV_IMAGE_ALIGN as an explicit table, not by alphabetical order", () => {
        expect(imageAlignName(0)).toBe("CENTER"); // DEFAULT behaves as CENTER
        expect(imageAlignName(1)).toBe("TOP_LEFT");
        expect(imageAlignName(2)).toBe("TOP_MID");
        expect(imageAlignName(3)).toBe("TOP_RIGHT");
        expect(imageAlignName(4)).toBe("BOTTOM_LEFT");
        expect(imageAlignName(5)).toBe("BOTTOM_MID");
        expect(imageAlignName(6)).toBe("BOTTOM_RIGHT");
        expect(imageAlignName(7)).toBe("LEFT_MID");
        expect(imageAlignName(8)).toBe("RIGHT_MID");
        expect(imageAlignName(9)).toBe("CENTER");
        expect(imageAlignName(11)).toBe("STRETCH");
        expect(imageAlignName(12)).toBe("TILE");
        expect(imageAlignName(13)).toBe("CONTAIN");
        // 10 is LV_IMAGE_ALIGN_AUTO_TRANSFORM, an internal marker with no public name.
        expect(imageAlignName(10)).toBeUndefined();
        expect(imageAlignName(undefined)).toBeUndefined();
    });

    it("takes the clip box from the dump and rounds it with the MAIN radius", () => {
        const scene = wireToScene(GEOMETRY_WIRE);
        expect(scene.objects[0].clip).toEqual({
            x: 8,
            y: 8,
            w: 184,
            h: 184,
            radius: 10,
        });
        // An object with no clip stays unclipped.
        expect(scene.objects[1].clip).toBeUndefined();
    });

    it("lets the widget model supply a clip when the dump has none", () => {
        const scene = wireToScene(GEOMETRY_WIRE, ptr =>
            ptr === 2 ? { clip: { x: 2, y: 2, w: 20, h: 20, radius: 4 } } : undefined
        );
        expect(scene.objects[1].clip).toEqual({ x: 2, y: 2, w: 20, h: 20, radius: 4 });
    });

    it("carries the dumped natural size and alignment onto the image", () => {
        // The source lives in the model, the geometry in LVGL — the two must be merged.
        const scene = wireToScene(GEOMETRY_WIRE, ptr =>
            ptr === 2
                ? { type: "image", img: { srcId: "data:image/png;base64,AAAA" } }
                : undefined
        );
        const img = scene.objects[1].parts[0].img!;
        expect(img.srcId).toBe("data:image/png;base64,AAAA");
        expect(img.naturalWidth).toBe(40);
        expect(img.naturalHeight).toBe(30);
        expect(img.align).toBe("TOP_MID");
        // And the renderer places it by that geometry rather than filling the box.
        const node = findTag(renderScene(scene).roots, "image");
        expect(node.attrs.width).toBe(40);
        expect(node.attrs.x).toBe(20); // 10 + (60 - 40) / 2, horizontally centred
        expect(node.attrs.y).toBe(10); // TOP, so hard against the top
    });

    it("invents no geometry when the dump reports none", () => {
        const wire: WireScene = JSON.parse(JSON.stringify(GEOMETRY_WIRE));
        wire.objects[1].imgW = 0;
        wire.objects[1].imgH = 0;
        const scene = wireToScene(wire, ptr =>
            ptr === 2 ? { type: "image", img: { srcId: "data:image/png;base64,AAAA" } } : undefined
        );
        const img = scene.objects[1].parts[0].img!;
        expect(img.naturalWidth).toBeUndefined();
        expect(img.naturalHeight).toBeUndefined();
        // The renderer then falls back to filling the widget box.
        const node = findTag(renderScene(scene).roots, "image");
        expect(node.attrs.width).toBe(60);
        expect(node.attrs.height).toBe(40);
    });

    it("prefers the dumped alignment over the model's", () => {
        const scene = wireToScene(GEOMETRY_WIRE, ptr =>
            ptr === 2
                ? {
                      type: "image",
                      img: { srcId: "data:image/png;base64,AAAA", align: "BOTTOM_RIGHT" },
                  }
                : undefined
        );
        expect(scene.objects[1].parts[0].img!.align).toBe("TOP_MID"); // dump 2 wins over the model
    });
});

// ---------------------------------------------------------------------------------------
// the proxy 2-D context
// ---------------------------------------------------------------------------------------

describe("svg-context — the frame hook", () => {
    it("triggers a frame on putImageData and discards the pixels", () => {
        const onFrame = vi.fn();
        const ctx = createSvgContext({ onFrame });
        ctx.putImageData({} as ImageData, 0, 0);
        expect(onFrame).toHaveBeenCalledTimes(1);
    });

    it("treats fillRect and clearRect as 'clear the surface'", () => {
        const onFrame = vi.fn();
        const onClearPage = vi.fn();
        const ctx = createSvgContext({ onFrame, onClearPage });

        // The page-switch clear in the base runtime.
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, 480, 320);
        // The error/empty-state clear.
        ctx.clearRect(0, 0, 480, 320);

        expect(onClearPage).toHaveBeenCalledTimes(2);
        expect(onFrame).not.toHaveBeenCalled();
    });

    it("accepts arbitrary property writes (the base class writes bookkeeping fields)", () => {
        const ctx = createSvgContext({ onFrame: () => undefined });
        expect(() => {
            (ctx as unknown as Record<string, unknown>).ctxPage = { some: "page" };
        }).not.toThrow();
        expect(vi.isMockFunction(ctx.putImageData)).toBe(false);
    });

    it("degrades an unknown member to a harmless no-op and reports it once", () => {
        const onUnexpectedMember = vi.fn();
        const ctx = createSvgContext({
            onFrame: () => undefined,
            onUnexpectedMember,
        });
        const unknown = ctx as unknown as {
            drawFutureThing: (a: number) => void;
            anotherThing: number;
        };

        // Never crashes, whatever the base class does in future.
        expect(() => unknown.drawFutureThing(1)).not.toThrow();
        expect(() => unknown.drawFutureThing(2)).not.toThrow();
        expect(onUnexpectedMember).toHaveBeenCalledTimes(1);
        expect(onUnexpectedMember).toHaveBeenCalledWith("drawFutureThing", "get");
    });

    it("is not thenable, so an awaiting caller is never confused", () => {
        const ctx = createSvgContext({ onFrame: () => undefined }) as unknown as {
            then?: unknown;
        };
        expect(ctx.then).toBeUndefined();
    });

    it("identifies itself", () => {
        const ctx = createSvgContext({ onFrame: () => undefined });
        expect(isSvgContext(ctx)).toBe(true);
        expect(isSvgContext({})).toBe(false);
        expect(isSvgContext(null)).toBe(false);
    });
});

// ---------------------------------------------------------------------------------------
// the feature flag
//
// This app is a HashRouter, so the EEZ route carries its query INSIDE the hash
// (`#/t3000/eez?svg=1`) while `window.location.search` is empty. Reading only `search` silently
// ignored the flag for every URL written the way the app writes its own links — which is exactly
// what happened in the browser before this was fixed.
// ---------------------------------------------------------------------------------------

describe("feature flag — URL forms", () => {
    it("accepts the query in either position, and tolerates a hand-typed separator", () => {
        expect(parseSvgOverride("?svg=1")).toBe(true);
        expect(parseSvgOverride("?a=1&svg=1")).toBe(true);
        expect(parseSvgOverride("?svg=0")).toBe(false);
        // HashRouter form: what the app's own links look like.
        expect(parseSvgOverride("#/t3000/eez?svg=1")).toBe(true);
        // A hand-typed "&svg=1" glued to the path is not a real query, but accepting it costs
        // nothing and saves a confusing no-op.
        expect(parseSvgOverride("#/t3000/eez&svg=1")).toBe(true);
    });

    it("does not mistake a longer value for the flag", () => {
        expect(parseSvgOverride("?svg=10")).toBeUndefined();
        expect(parseSvgOverride("?svg=")).toBeUndefined();
        expect(parseSvgOverride("?other=1")).toBeUndefined();
        expect(parseSvgOverride("")).toBeUndefined();
        expect(parseSvgOverride("#/t3000/eez")).toBeUndefined();
    });

    it("lets the URL override beat stored state", () => {
        window.localStorage.setItem(SVG_RENDERER_STORAGE_KEY, "1");
        try {
            expect(isSvgRendererEnabled("?svg=0")).toBe(false);
            expect(isSvgRendererEnabled("?svg=1")).toBe(true);
        } finally {
            window.localStorage.removeItem(SVG_RENDERER_STORAGE_KEY);
        }
    });

    it("defaults to ON for the supported version when nothing is set (P6)", () => {
        window.localStorage.removeItem(SVG_RENDERER_STORAGE_KEY);
        expect(isSvgRendererEnabled("")).toBe(true);
        expect(isSvgRendererEnabled("#/t3000/eez")).toBe(true);
    });

    it("still lets an explicit opt-out win over the default", () => {
        // Rollback levers, both of which must keep working now that the default is ON.
        window.localStorage.removeItem(SVG_RENDERER_STORAGE_KEY);
        expect(isSvgRendererEnabled("?svg=0")).toBe(false);
        expect(isSvgRendererEnabled("#/t3000/eez&svg=0")).toBe(false);

        window.localStorage.setItem(SVG_RENDERER_STORAGE_KEY, "0");
        try {
            expect(isSvgRendererEnabled("")).toBe(false);
            expect(isSvgRendererEnabled("#/t3000/eez")).toBe(false);
            // ...and the URL can still force it back on.
            expect(isSvgRendererEnabled("?svg=1")).toBe(true);
        } finally {
            window.localStorage.removeItem(SVG_RENDERER_STORAGE_KEY);
        }
    });

    it("honours stored state when the URL says nothing", () => {
        setSvgRendererEnabled(false);
        try {
            expect(isSvgRendererEnabled("")).toBe(false);
        } finally {
            setSvgRendererEnabled(undefined);
        }
        // Unset again: back to the default, which is ON.
        expect(isSvgRendererEnabled("")).toBe(true);
    });

    it("only targets 9.5", () => {
        expect(SVG_RENDERER_SUPPORTED_VERSION).toBe("9.5.0");
    });
});
