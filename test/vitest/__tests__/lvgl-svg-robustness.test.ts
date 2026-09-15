/**
 * Renderer robustness — the P3 hardening list.
 *
 * The other suites check that the renderer draws the right THING. This one checks that it comes back
 * at all when the input is weird: a widget type the model does not know, an enum name that is in no
 * table, radii larger than their box, an arc whose inset swallows its radius, control characters and
 * emoji in a string, a 200-line label, a zero-size bitmap, 1200 objects, a 1x1 display, a blank page,
 * a twenty-deep user-widget tree — and that two renders of one scene are identical, i.e. that nothing
 * carries over between frames.
 *
 * Why it matters more than it looks: one exception inside a paint takes the whole surface down (the
 * sink catches it and shows a notice, but the user sees a dead editor), and a hidden cross-frame
 * dependency turns "the colour is wrong on page 3" into an unreproducible bug.
 */

import { describe, expect, it } from "vitest";
import { renderScene } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-renderer";
import { parseScene } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/scene";
import type { Scene } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/scene";
import type { DrawNode } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-sink";
import { loadFixture } from "../lvgl-svg/fixture-loader";

function flat(nodes: DrawNode[] | undefined, into: DrawNode[] = []): DrawNode[] {
    for (const node of nodes ?? []) {
        into.push(node);
        flat(node.children, into);
    }
    return into;
}

function attr(node: DrawNode, name: string): unknown {
    return node.attrs ? node.attrs[name] : undefined;
}

/** A scene with one object whose MAIN part carries whatever the caller passes. */
function sceneWithPart(
    part: Record<string, unknown>,
    area = { x: 0, y: 0, w: 100, h: 100 }
): Scene {
    return parseScene({
        sceneVersion: 1,
        width: 100,
        height: 100,
        rootPtr: 1,
        objects: [{ ptr: 1, index: 0, type: "panel", area, parts: [{ part: "MAIN", ...part }] }],
    });
}

describe("renderer robustness — odd input", () => {
    it("never throws on values LVGL can produce but the renderer has not seen", () => {
        const cases: Array<Record<string, unknown>> = [
            { type: "TotallyUnknownWidget", bg: { color: "#123456" } },
            { bg: { color: "#123456" }, border: { color: "#fff", width: 2, side: "SIDEWAYS" } },
            { bg: { color: "#123456" }, radius: { tl: -5, tr: 1e6, br: 12, bl: 3 } },
            { bg: { color: "#123456" }, radius: 1e9 },
            { arc: { width: 7, color: "#62b7ff", start: 900, end: 900, inset: 200 } },
            { arc: { width: 7, bgColor: "#263238", bgStart: 0, bgEnd: 3600, radius: 0 } },
            { bgImage: { srcId: "" } },
            { bgImage: { srcId: "", symbol: "\uF0FF" } },
            { text: { str: "\u0000\u0007 hello \u{1F600}\n\n\nsecond", size: 16 } },
            { text: { str: Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n") } },
            { text: { str: "", size: 0 } },
            { line: { points: [] } },
            { line: { points: [1, 2] } },
            { img: { srcId: "data:image/png;base64,AAAA", zoom: 0, rotation: 1e6 } },
        ];
        for (const part of cases) {
            const scene = sceneWithPart(part);
            expect(() => renderScene(scene), JSON.stringify(part).slice(0, 70)).not.toThrow();
            expect(renderScene(scene).roots).toHaveLength(1);
        }
    });

    it("clamps an arc whose inset swallows its radius instead of emitting a negative one", () => {
        const scene = sceneWithPart({
            arc: {
                width: 10,
                color: "#62b7ff",
                start: 0,
                end: 900,
                centerX: 50,
                centerY: 50,
                radius: 20,
                inset: 200,
            },
        });
        const value = flat(renderScene(scene).roots).find(node => node.key.endsWith("-arc-value"))!;
        expect(String(attr(value, "d"))).toContain("A0 0");
    });

    it("draws a scene at whatever size the display has", () => {
        for (const [w, h] of [
            [240, 240],
            [800, 480],
            [1, 1],
        ]) {
            const scene = parseScene({
                sceneVersion: 1,
                width: w,
                height: h,
                rootPtr: 1,
                objects: [
                    {
                        ptr: 1,
                        index: 0,
                        type: "screen",
                        area: { x: 0, y: 0, w, h },
                        parts: [
                            {
                                part: "MAIN",
                                bg: { color: "#101010" },
                                radius: Math.min(w, h) / 2,
                            },
                        ],
                    },
                    {
                        ptr: 2,
                        index: 0,
                        parentPtr: 1,
                        type: "label",
                        area: { x: w - 1, y: h - 1, w: 1, h: 1 },
                        parts: [{ part: "MAIN", text: { str: "x", size: 8 } }],
                    },
                ],
            });
            const out = renderScene(scene);
            const bg = flat(out.roots).find(node => node.key === "p1-MAIN-bg")!;
            expect(attr(bg, "width")).toBe(w);
            expect(attr(bg, "height")).toBe(h);
            // The child keeps the coordinates it was given, even at the far corner.
            const child = out.roots[0].children!.find(node => node.key === "o2")!;
            expect(child.children![0].attrs!.x).toBe(w - 1);
        }
    });

    it("renders a blank page as one empty group and no defs", () => {
        const blank = parseScene({
            sceneVersion: 1,
            width: 480,
            height: 320,
            rootPtr: 7,
            objects: [
                {
                    ptr: 7,
                    index: 0,
                    type: "screen",
                    area: { x: 0, y: 0, w: 480, h: 320 },
                    parts: [{ part: "MAIN" }],
                },
            ],
        });
        const out = renderScene(blank);
        expect(out.roots).toHaveLength(1);
        expect(out.roots[0].children).toHaveLength(0);
        expect(out.defs).toHaveLength(0);
    });

    it("renders a deeply nested tree (a user-widget page is just a page)", () => {
        // Nothing in the renderer branches on the page kind, so depth is the only thing to exercise.
        const objects: Record<string, unknown>[] = [];
        for (let i = 0; i < 20; i++) {
            objects.push({
                ptr: 10 + i,
                index: 0,
                parentPtr: i === 0 ? undefined : 9 + i,
                type: i % 2 ? "panel" : "container",
                area: { x: i, y: i, w: 100 - i, h: 100 - i },
                parts: [
                    {
                        part: "MAIN",
                        bg: { color: "#202020" },
                        border: { color: "#404040", width: 1 },
                    },
                ],
            });
        }
        const scene = parseScene({
            sceneVersion: 1,
            width: 100,
            height: 100,
            rootPtr: 10,
            objects,
        });
        let depth = 0;
        let node: DrawNode | undefined = renderScene(scene).roots[0];
        while (node) {
            depth += 1;
            node = (node.children ?? []).find(child => child.key.startsWith("o"));
        }
        expect(depth).toBe(20);
    });
});

describe("renderer robustness — no state between frames", () => {
    it("is a pure function of its input: the same scene renders identically twice", () => {
        const scene = loadFixture("kitchen-sink");
        expect(JSON.stringify(renderScene(scene))).toBe(JSON.stringify(renderScene(scene)));
    });

    it("does not carry a theme from one scene to the next", () => {
        const dark = sceneWithPart({
            bg: { color: "#000000" },
            text: { str: "hi", size: 12, color: "#ffffff" },
        });
        const light = sceneWithPart({
            bg: { color: "#ffffff" },
            text: { str: "hi", size: 12, color: "#111111" },
        });
        const darkFirst = flat(renderScene(dark).roots);
        const lightThen = flat(renderScene(light).roots);
        const darkAgain = flat(renderScene(dark).roots);

        expect(lightThen.find(node => node.tag === "text")!.attrs!.fill).toBe("#111111");
        expect(lightThen.find(node => node.key === "p1-MAIN-bg")!.attrs!.fill).toBe("#ffffff");
        // Rendering the light scene in between changed nothing about the dark one.
        expect(JSON.stringify(darkAgain)).toBe(JSON.stringify(darkFirst));
    });

    it("reuses part keys across scenes without leaking attributes from the first", () => {
        // The sink patches by key, so a scene that reuses a key with different content must produce a
        // complete node, not a delta on top of the previous frame's node.
        const first = renderScene(sceneWithPart({ bg: { color: "#ff0000" }, radius: 8 }));
        const second = renderScene(sceneWithPart({ bg: { color: "#00ff00" } }));
        const key = "p1-MAIN-bg";
        const before = flat(first.roots).find(node => node.key === key)!;
        const after = flat(second.roots).find(node => node.key === key)!;
        expect(attr(before, "fill")).toBe("#ff0000");
        expect(attr(before, "rx")).toBe(8);
        expect(attr(after, "fill")).toBe("#00ff00");
        // The new node simply does not have the old radius — nothing to inherit.
        expect(attr(after, "rx")).toBeUndefined();
    });
});

describe("renderer robustness — scale", () => {
    it("renders 1200 objects without falling off a cliff", () => {
        // The editor's biggest page is a few hundred objects, but a pathological page must still be
        // linear-ish. The bound is deliberately generous (machines vary) — the point is to catch an
        // accidental O(n^2) in the renderer or its def collector.
        const objects: Record<string, unknown>[] = [
            {
                ptr: 1,
                index: 0,
                type: "screen",
                area: { x: 0, y: 0, w: 480, h: 320 },
                parts: [{ part: "MAIN", bg: { color: "#101010" } }],
            },
        ];
        for (let i = 0; i < 1200; i++) {
            objects.push({
                ptr: 100 + i,
                index: i,
                parentPtr: 1,
                type: "label",
                area: { x: i % 100, y: Math.floor(i / 100), w: 40, h: 14 },
                parts: [
                    {
                        part: "MAIN",
                        bg: { color: "#222222" },
                        radius: (i % 4) + 1,
                        text: { str: `#${i}`, size: 12, color: "#eeeeee" },
                    },
                ],
            });
        }
        const scene = parseScene({
            sceneVersion: 1,
            width: 480,
            height: 320,
            rootPtr: 1,
            objects,
        });
        const started = Date.now();
        const out = renderScene(scene);
        const elapsed = Date.now() - started;
        expect(out.roots[0].children!.length).toBe(1201);
        expect(elapsed).toBeLessThan(4000);
    });
});
