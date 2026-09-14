import { describe, expect, it } from "vitest";
import {
    SvgSink,
    createSvgRoot,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-sink";
import type { RenderOutput } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-sink";
import { renderScene } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-renderer";
import { loadFixture } from "../lvgl-svg/fixture-loader";

const DIMS = { w: 100, h: 100 };

function makeSink(dims = DIMS) {
    const svg = createSvgRoot(dims);
    document.body.appendChild(svg);
    return { svg, sink: new SvgSink(svg, dims) };
}

function output(overrides: Partial<RenderOutput> = {}): RenderOutput {
    return {
        roots: [
            {
                key: "o1",
                tag: "g",
                attrs: { "data-ptr": 1, "data-type": "panel", "data-objid": "p1" },
                children: [
                    {
                        key: "p1-MAIN-bg",
                        tag: "rect",
                        attrs: { x: 0, y: 0, width: 10, height: 10, fill: "#ff0000" },
                    },
                ],
            },
        ],
        defs: [],
        ...overrides,
    };
}

describe("SvgSink — skeleton", () => {
    it("creates defs first, then content, and keeps the overlay last", () => {
        const { svg } = makeSink();
        const order = Array.from(svg.children).map(child => child.id);
        expect(order).toEqual(["defs", "content", "overlay"]);
        expect(svg.getAttribute("viewBox")).toBe("0 0 100 100");
        expect(svg.getAttribute("class")).toBe("lvgl-svg");
    });

    it("reuses existing groups when they are supplied", () => {
        const svg = createSvgRoot(DIMS);
        const content = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );
        content.id = "content";
        svg.appendChild(content);
        const sink = new SvgSink(svg, DIMS, { contentGroup: content });
        expect(sink.contentGroup).toBe(content);
        expect(sink.overlayGroup).not.toBe(content);
    });

    it("always re-asserts the overlay as the last child", () => {
        const { svg, sink } = makeSink();
        // Something else (e.g. a dev overlay) gets appended after the overlay group.
        const stray = document.createElementNS("http://www.w3.org/2000/svg", "g");
        stray.id = "stray";
        svg.appendChild(stray);
        sink.update(output());
        expect(svg.lastElementChild!.id).toBe("overlay");
    });
});

describe("SvgSink — patching", () => {
    it("applies a frame to the DOM", () => {
        const { svg, sink } = makeSink();
        sink.update(output());
        const group = svg.querySelector('[data-ptr="1"]')!;
        expect(group).not.toBeNull();
        expect(group.getAttribute("data-objid")).toBe("p1");
        const rect = svg.querySelector("rect")!;
        expect(rect.getAttribute("fill")).toBe("#ff0000");
        expect(rect.getAttribute("width")).toBe("10");
    });

    it("reuses elements between frames instead of rebuilding", () => {
        const { svg, sink } = makeSink();
        sink.update(output());
        const firstGroup = svg.querySelector('[data-ptr="1"]')!;
        const firstRect = svg.querySelector("rect")!;

        const next = output();
        next.roots[0].children![0].attrs = {
            x: 0,
            y: 0,
            width: 42,
            height: 10,
            fill: "#00ff00",
        };
        sink.update(next);

        expect(svg.querySelector('[data-ptr="1"]')).toBe(firstGroup);
        expect(svg.querySelector("rect")).toBe(firstRect);
        expect(firstRect.getAttribute("width")).toBe("42");
        expect(firstRect.getAttribute("fill")).toBe("#00ff00");
    });

    it("removes attributes that disappear and nodes that are no longer emitted", () => {
        const { svg, sink } = makeSink();
        sink.update(output());
        const rect = svg.querySelector("rect")!;
        expect(rect.getAttribute("fill")).toBe("#ff0000");

        const next = output();
        next.roots[0].children![0].attrs = { x: 0, y: 0, width: 10, height: 10 };
        sink.update(next);
        expect(rect.getAttribute("fill")).toBeNull();

        sink.update({ roots: [], defs: [] });
        expect(svg.querySelector("rect")).toBeNull();
        expect(svg.querySelector('[data-ptr="1"]')).toBeNull();
    });

    it("keeps a stable node identity when only tags are reconciled in order", () => {
        const { sink, svg } = makeSink();
        sink.update(output());
        const next = output();
        next.roots[0].children = [
            {
                key: "p1-MAIN-bg",
                tag: "rect",
                attrs: { x: 0, y: 0, width: 10, height: 10, fill: "#123456" },
            },
            {
                key: "p1-MAIN-text",
                tag: "text",
                attrs: { x: 1, y: 1 },
                text: "hello",
            },
        ];
        sink.update(next);
        expect(svg.querySelectorAll("rect")).toHaveLength(1);
        expect(svg.querySelector("text")!.textContent).toBe("hello");
        // Second frame with the same content must not duplicate anything.
        sink.update(next);
        expect(svg.querySelectorAll("text")).toHaveLength(1);
    });

    it("replaces an element whose tag changed under the same key", () => {
        const { svg, sink } = makeSink();
        sink.update(output());
        const next = output();
        next.roots[0].children![0].tag = "circle";
        sink.update(next);
        expect(svg.querySelectorAll("rect")).toHaveLength(0);
        expect(svg.querySelectorAll("circle")).toHaveLength(1);
    });

    it("applies style declarations through the style attribute", () => {
        const { svg, sink } = makeSink();
        const next = output();
        next.roots[0].children![0].style = { "mix-blend-mode": "multiply" };
        sink.update(next);
        expect(svg.querySelector("rect")!.getAttribute("style")).toBe(
            "mix-blend-mode:multiply"
        );
    });

    it("ignores undefined attribute values rather than writing them out", () => {
        const { svg, sink } = makeSink();
        const next = output();
        next.roots[0].children![0].attrs = {
            x: 0,
            fill: "#000000",
            rx: undefined,
        };
        sink.update(next);
        expect(svg.querySelector("rect")!.hasAttribute("rx")).toBe(false);
    });
});

describe("SvgSink — failure notice", () => {
    it("shows a notice inside the overlay, not the content", () => {
        const { svg, sink } = makeSink();
        sink.showNotice("Something failed");
        const notice = svg.querySelector("#notice")!;
        expect(notice).not.toBeNull();
        expect(notice.parentElement!.id).toBe("overlay");
        expect(notice.textContent).toBe("Something failed");
    });

    it("renders one line per newline and reuses the nodes when rewritten", () => {
        const { svg, sink } = makeSink();
        sink.showNotice("Line one\nLine two");
        expect(svg.querySelectorAll("#notice text")).toHaveLength(2);

        const firstNodes = Array.from(svg.querySelectorAll("#notice text"));
        sink.showNotice("Only one now");
        expect(svg.querySelectorAll("#notice text")).toHaveLength(1);
        expect(svg.querySelector("#notice text")).toBe(firstNodes[0]);
        expect(svg.querySelector("#notice text")!.textContent).toBe("Only one now");
    });

    it("clears the notice on request and on teardown", () => {
        const { svg, sink } = makeSink();
        sink.showNotice("boom");
        sink.clearNotice();
        expect(svg.querySelector("#notice")).toBeNull();

        sink.showNotice("boom again");
        sink.teardown();
        expect(svg.querySelector("#notice")).toBeNull();
    });

    it("survives a scene patch, so a repaint cannot erase the explanation", () => {
        const { svg, sink } = makeSink();
        sink.showNotice("still waiting");
        sink.update(output());
        expect(svg.querySelector("#notice")).not.toBeNull();
        expect(svg.querySelector('[data-ptr="1"]')).not.toBeNull();
    });

    it("is a no-op once disposed", () => {
        const { svg, sink } = makeSink();
        sink.teardown();
        sink.showNotice("too late");
        expect(svg.querySelector("#notice")).toBeNull();
    });
});

describe("SvgSink — defs", () => {
    it("creates and reuses defs by id", () => {
        const { svg, sink } = makeSink();
        const defs: RenderOutput["defs"] = [
            {
                id: "lvgl-lingrad-1",
                tag: "linearGradient",
                attrs: { x1: 0, y1: 0, x2: 0, y2: 1 },
                children: [
                    { id: "lvgl-lingrad-1-a", tag: "stop", attrs: { offset: 0 } },
                    {
                        id: "lvgl-lingrad-1-b",
                        tag: "stop",
                        attrs: { offset: 1, "stop-color": "#ff0000" },
                    },
                ],
            },
        ];
        sink.update({ roots: [], defs });
        const gradient = svg.querySelector("#lvgl-lingrad-1")!;
        expect(gradient.tagName).toBe("linearGradient");
        expect(gradient.querySelectorAll("stop")).toHaveLength(2);

        sink.update({ roots: [], defs });
        expect(svg.querySelectorAll("#lvgl-lingrad-1")).toHaveLength(1);
        expect(svg.querySelector("#lvgl-lingrad-1")).toBe(gradient);
    });

    it("prunes defs that are no longer referenced", () => {
        const { svg, sink } = makeSink();
        sink.update({
            roots: [],
            defs: [{ id: "lvgl-shadow-1", tag: "filter" }],
        });
        expect(svg.querySelector("#lvgl-shadow-1")).not.toBeNull();
        sink.update({ roots: [], defs: [] });
        expect(svg.querySelector("#lvgl-shadow-1")).toBeNull();
    });
});

describe("SvgSink — lifecycle", () => {
    it("clearPage keeps defs and the overlay", () => {
        const { svg, sink } = makeSink();
        sink.update({
            roots: output().roots,
            defs: [{ id: "lvgl-clip-1", tag: "clipPath" }],
        });
        sink.clearPage();
        expect(svg.querySelector('[data-ptr="1"]')).toBeNull();
        expect(svg.querySelector("#lvgl-clip-1")).not.toBeNull();
        expect(svg.querySelector("#overlay")).not.toBeNull();
        // A later frame can repopulate the content group.
        sink.update(output());
        expect(svg.querySelector('[data-ptr="1"]')).not.toBeNull();
    });

    it("teardown is idempotent and drops content", () => {
        const { svg, sink } = makeSink();
        sink.update(output());
        sink.teardown();
        expect(svg.querySelector('[data-ptr="1"]')).toBeNull();
        expect(() => sink.teardown()).not.toThrow();
        // Updates after teardown are ignored rather than throwing.
        expect(() => sink.update(output())).not.toThrow();
        expect(svg.querySelector('[data-ptr="1"]')).toBeNull();
    });
});

describe("SvgSink — real fixtures end to end", () => {
    for (const name of ["boxes", "indicators", "text", "media", "dashboard"]) {
        it(`renders ${name} into the DOM`, () => {
            const { svg, sink } = makeSink({ w: 480, h: 320 });
            sink.update(renderScene(loadFixture(name)));
            expect(sink.nodeCount).toBeGreaterThan(1);
            // Every object group carries the identity attributes hit-testing relies on.
            const groups = svg.querySelectorAll("#content > g");
            expect(groups.length).toBeGreaterThan(0);
            for (const group of Array.from(groups)) {
                expect(group.getAttribute("data-ptr")).toBeTruthy();
                expect(group.getAttribute("data-type")).toBeTruthy();
            }
        });
    }

    it("renders the whole widget kitchen sink without errors", () => {
        const { sink } = makeSink({ w: 480, h: 320 });
        const out = renderScene(loadFixture("kitchen-sink"));
        sink.update(out);
        expect(sink.nodeCount).toBeGreaterThan(40);
        // Re-applying the same scene must be a no-op in element count terms.
        const before = sink.nodeCount;
        sink.update(out);
        expect(sink.nodeCount).toBe(before);
    });
});
