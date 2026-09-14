/**
 * End-to-end chain test on a REAL LVGL dump.
 *
 * `captured-9.5.0.json` is not hand-written: it is produced by the actual WASM build
 * (`scripts/lvgl-svg-dump-smoke.mjs` writes it from `lvglDumpScene`), for a real object tree that
 * was styled through LVGL's own setters. Feeding it through
 *
 *     wire dump → wireToScene → renderScene → SvgSink → DOM
 *
 * is the closest thing to running the editor that does not need a browser, a backend or a project.
 * Regenerate the fixture whenever the C side changes:
 *
 *     node scripts/lvgl-svg-dump-smoke.mjs
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseSceneDump } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/scene-dump";
import { renderScene } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-renderer";
import {
    SvgSink,
    createSvgRoot,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-sink";

function loadCaptured(): string {
    return readFileSync(
        resolve(process.cwd(), "test/vitest/fixtures/lvgl-svg/captured-9.5.0.json"),
        "utf8"
    );
}

describe("captured LVGL 9.5 dump → SVG", () => {
    const wire = JSON.parse(loadCaptured());

    it("is a real dump: the C side produced the expected tree and styling", () => {
        expect(wire.sceneVersion).toBe(1);
        expect(wire.width).toBe(480);
        expect(wire.height).toBe(320);
        expect(wire.objects).toHaveLength(4); // screen + 2 children + the image widget
        // The smoke test set these through lv_obj_set_style_*, so they must round-trip.
        expect(wire.objects[0].parts[0].radius).toBe(12);
        const child = wire.objects[1];
        expect(child.parts[0].borderWidth).toBe(2);
        expect(child.parts[0].shadowWidth).toBe(6);
        expect(child.parts[0].outlineWidth).toBe(1);
        expect(child.area).toEqual({ x: 10, y: 20, w: 100, h: 50 });
    });

    it("does not leak the theme's text defaults into empty parts", () => {
        // Every part inherits a text colour/font from the theme, so the raw wire marks several
        // slots as non-empty. Only parts with something to draw may survive into the Scene.
        const scene = parseSceneDump(loadCaptured())!;
        expect(scene.objects).toHaveLength(4);
        for (const object of scene.objects) {
            for (const part of object.parts) {
                if (part.part === "MAIN") {
                    continue;
                }
                const drawable =
                    (part.bg && (part.bg.color || part.bg.grad)) ||
                    part.bgImage ||
                    (part.border && part.border.width) ||
                    (part.outline && part.outline.width) ||
                    (part.shadow && part.shadow.width) ||
                    (part.arc && part.arc.width) ||
                    (part.line && part.line.width && part.line.points.length >= 4) ||
                    part.img ||
                    (part.text && part.text.str);
                expect(
                    drawable,
                    `${object.ptr}/${part.part} survived with nothing to draw`
                ).toBeTruthy();
            }
            // MAIN is always present.
            expect(object.parts.some(p => p.part === "MAIN")).toBe(true);
        }
    });

    it("maps the captured bytes into the Scene contract", () => {
        const scene = parseSceneDump(loadCaptured())!;
        const [screen, child, child2] = scene.objects;

        // 0xf5f5f5 — the theme background the smoke test read back, as #rrggbb.
        expect(screen.parts[0].bg!.color).toBe("#f5f5f5");
        expect(screen.parts[0].bg!.opacity).toBe(1);
        expect(screen.parts[0].radius).toBe(12);
        // The theme's text colour, resolved by LVGL.
        expect(screen.parts[0].text).toBeUndefined(); // no string from the model here

        expect(child.parentPtr).toBe(screen.ptr);
        expect(child2.parentPtr).toBe(screen.ptr);
        // A parentless screen reports index -1 from LVGL; the Scene falls back to emission order.
        expect(screen.index).toBeGreaterThanOrEqual(0);
        expect(child.index).toBe(0);
        expect(child2.index).toBe(1);
        expect(child.parts.find(p => p.part === "MAIN")!.border!.width).toBe(2);
        expect(child.parts.find(p => p.part === "MAIN")!.border!.side).toBe("FULL");
    });

    it("renders the captured scene into real SVG DOM", () => {
        const scene = parseSceneDump(loadCaptured())!;
        const svg = createSvgRoot({ w: scene.width, h: scene.height });
        document.body.appendChild(svg);
        const sink = new SvgSink(svg, { w: scene.width, h: scene.height });

        sink.update(renderScene(scene));

        // One group per object, keyed by the LVGL pointer. Children are nested inside their
        // parent's group (that is the whole point of the tree), so only the screen is a direct
        // child of #content.
        const rootGroups = Array.from(
            svg.querySelectorAll("#content > g")
        ) as SVGGElement[];
        expect(rootGroups).toHaveLength(1);
        expect(rootGroups[0].getAttribute("data-ptr")).toBe(
            String(scene.objects[0].ptr)
        );
        const allGroups = Array.from(
            svg.querySelectorAll("#content g")
        ) as SVGGElement[];
        expect(allGroups).toHaveLength(scene.objects.length);
        // Every non-root object really is nested inside the screen group, as a sibling, in order.
        const nested = Array.from(rootGroups[0].children).filter(
            element => element.tagName === "g"
        );
        const nonRoot = scene.objects.filter(object => object.parentPtr != null);
        expect(nested.map(element => element.getAttribute("data-ptr"))).toEqual(
            nonRoot.map(object => String(object.ptr))
        );

        // The screen's MAIN background became a rounded rect with the theme colour.
        const screenBg = svg.querySelector(
            `[data-ptr="${scene.objects[0].ptr}"] rect`
        )!;
        expect(screenBg).not.toBeNull();
        expect(screenBg.getAttribute("fill")).toBe("#f5f5f5");
        expect(screenBg.getAttribute("rx")).toBe("12");

        // The styled child produced a bordered, shadowed box.
        const childNode = svg.querySelector(
            `[data-ptr="${scene.objects[1].ptr}"]`
        ) as SVGGElement;
        expect(childNode.querySelector("rect")).not.toBeNull();
        // A shadow is a filter def, referenced from the shape.
        const shadowFilter = svg.querySelector(
            '#defs filter[id^="lvgl-shadow-"]'
        );
        expect(shadowFilter).not.toBeNull();
        expect(shadowFilter!.querySelector("feDropShadow")).not.toBeNull();
        // The border is a stroked shape inside the bounds.
        const strokes = Array.from(childNode.querySelectorAll("rect")).filter(
            element => element.getAttribute("stroke")
        );
        expect(strokes.length).toBeGreaterThan(0);

        sink.teardown();
    });

    it("carries the LVGL 9 clip box, and invents no image geometry without a source", () => {
        // A scrollable object reports the box its children are clipped to; without it the
        // renderer cannot stop children spilling outside a scrolled container.
        expect(wire.objects[0].clip).toBeDefined();
        expect(wire.objects[0].clip.w).toBe(wire.objects[0].area.w);
        expect(wire.objects[0].clip.h).toBe(wire.objects[0].area.h);
        // The image widget was created WITHOUT a source, so no size may be reported for it.
        expect(wire.objects.some(object => object.imgW !== undefined)).toBe(false);
    });

    it("maps a dump clip box onto the object, with the MAIN radius", () => {
        const scene = parseSceneDump(loadCaptured())!;
        const screen = scene.objects[0];
        expect(screen.clip).toBeDefined();
        expect(screen.clip!.w).toBe(screen.area.w);
        // The screen's MAIN part set radius 12 in the smoke test, so the clip is rounded to match.
        expect(screen.clip!.radius).toBe(12);
    });

    it("renders the object clip as a clipPath reference", () => {
        const scene = parseSceneDump(loadCaptured())!;
        const svg = createSvgRoot({ w: 480, h: 320 });
        document.body.appendChild(svg);
        const sink = new SvgSink(svg, { w: 480, h: 320 });
        sink.update(renderScene(scene));

        const screenNode = svg.querySelector(
            `[data-ptr="${scene.objects[0].ptr}"]`
        )!;
        const reference = String(screenNode.getAttribute("clip-path"));
        expect(reference).toMatch(/^url\(#lvgl-clip-/);
        // The referenced def really exists — a bare id would leave clipping silently disabled.
        const id = reference.slice("url(#".length, -1);
        expect(svg.querySelector(`#defs clipPath[id="${id}"]`)).not.toBeNull();
        // Every lv_obj is scrollable in LVGL 9, so clip defs are not unique to the screen.
        expect(
            svg.querySelectorAll('#defs clipPath[id^="lvgl-clip-"]').length
        ).toBeGreaterThan(0);
        sink.teardown();
    });

    it("renders a widget's text from the model on top of the dumped chrome", () => {
        const scene = parseSceneDump(loadCaptured(), ptr =>
            ptr === JSON.parse(loadCaptured()).objects[1].ptr
                ? { objId: "child1", type: "label", text: { str: "Supply Temp" } }
                : undefined
        )!;
        const svg = createSvgRoot({ w: 480, h: 320 });
        document.body.appendChild(svg);
        const sink = new SvgSink(svg, { w: 480, h: 320 });
        sink.update(renderScene(scene));

        const label = svg.querySelector("text")!;
        expect(label).not.toBeNull();
        expect(label.textContent).toBe("Supply Temp");
        // Colour and size came from the LVGL dump, not from the model.
        expect(label.getAttribute("fill")).toBe("#212121");
        expect(Number(label.getAttribute("font-size"))).toBe(16);

        sink.teardown();
    });
});
