import { describe, expect, it } from "vitest";
import {
    SCENE_PART_NAMES,
    SCENE_VERSION,
    SceneParseError,
    alphaOf,
    degreesOf,
    isScenePartName,
    parseScene,
    walkScene,
    zoomOf,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/scene";
import { FIXTURES, loadFixture } from "../lvgl-svg/fixture-loader";

describe("scene contract — parsing", () => {
    it("accepts every fixture", () => {
        for (const name of FIXTURES) {
            const scene = loadFixture(name);
            expect(scene.sceneVersion).toBe(SCENE_VERSION);
            expect(scene.objects.length).toBeGreaterThan(0);
        }
    });

    it("defaults an absent opacity to fully opaque, not transparent", () => {
        // LVGL's default opa is LV_OPA_COVER. Reading absence as 0 would erase every shape
        // that simply did not set BG_OPA, so this is load-bearing behaviour.
        expect(alphaOf(undefined)).toBe(1);
        expect(alphaOf(0)).toBe(0);
        expect(alphaOf(0.5)).toBe(0.5);
        expect(alphaOf(2)).toBe(1);
        expect(alphaOf(-1)).toBe(0);
    });

    it("converts LVGL units", () => {
        expect(zoomOf(undefined)).toBe(1);
        expect(zoomOf(256)).toBe(1);
        expect(zoomOf(512)).toBe(2);
        expect(degreesOf(450)).toBe(45);
        expect(degreesOf(undefined)).toBe(0);
    });

    it("knows the LVGL 9 part vocabulary and rejects TICKS", () => {
        for (const part of SCENE_PART_NAMES) {
            expect(isScenePartName(part)).toBe(true);
        }
        // TICKS exists only in LVGL_PARTS_8. Accepting it would silently draw nothing on 9.5.
        expect(isScenePartName("TICKS")).toBe(false);
        expect(SCENE_PART_NAMES).not.toContain("TICKS");
        expect(() =>
            parseScene({
                sceneVersion: 1,
                width: 10,
                height: 10,
                rootPtr: 1,
                objects: [
                    {
                        ptr: 1,
                        index: 0,
                        type: "meter",
                        area: { x: 0, y: 0, w: 10, h: 10 },
                        parts: [{ part: "TICKS" }],
                    },
                ],
            })
        ).toThrow(/unknown part "TICKS"/);
    });

    it("refuses an unknown sceneVersion instead of guessing", () => {
        expect(() =>
            parseScene({
                sceneVersion: 2,
                width: 10,
                height: 10,
                rootPtr: 1,
                objects: [],
            })
        ).toThrow(SceneParseError);
        expect(() =>
            parseScene({ sceneVersion: 2, width: 1, height: 1, rootPtr: 1, objects: [] })
        ).toThrow(/unsupported sceneVersion 2/);
    });

    it("rejects malformed input", () => {
        expect(() => parseScene("{not json")).toThrow(/not valid JSON/);
        expect(() =>
            parseScene({ sceneVersion: 1, width: 1, height: 1, rootPtr: 1, objects: [{}] })
        ).toThrow(/"type" must be a non-empty string/);
        expect(() =>
            parseScene({
                sceneVersion: 1,
                width: 1,
                height: 1,
                rootPtr: 1,
                objects: [
                    { ptr: 1, index: 0, type: "label", area: { x: 0, y: 0, w: 1 }, parts: [] },
                ],
            })
        ).toThrow(/must be a finite number/);
        expect(() =>
            parseScene({ sceneVersion: 1, width: 1, height: 1, rootPtr: 1 })
        ).toThrow(/"objects" must be an array/);
    });

    it("carries a part-level radius (LVGL styles radius per part)", () => {
        const scene = parseScene({
            sceneVersion: 1,
            width: 10,
            height: 10,
            rootPtr: 1,
            objects: [
                {
                    ptr: 1,
                    index: 0,
                    type: "slider",
                    area: { x: 0, y: 0, w: 10, h: 10 },
                    radius: 2,
                    parts: [{ part: "MAIN" }, { part: "KNOB", radius: 8 }],
                },
            ],
        });
        expect(scene.objects[0].radius).toBe(2);
        expect(scene.objects[0].parts[1].radius).toBe(8);
    });
});

describe("scene contract — traversal order", () => {
    it("yields parents before children, depth-first, matching paint order", () => {
        const scene = loadFixture("dashboard");
        const order = Array.from(walkScene(scene)).map(e => e.object.ptr);
        const depth = new Map(
            Array.from(walkScene(scene)).map(e => [e.object.ptr, e.depth])
        );
        expect(order[0]).toBe(scene.rootPtr);
        for (const object of scene.objects) {
            if (object.parentPtr == null) {
                continue;
            }
            // Every child is emitted after its parent, and one level deeper.
            expect(order.indexOf(object.ptr)).toBeGreaterThan(
                order.indexOf(object.parentPtr)
            );
            expect(depth.get(object.ptr)).toBe(depth.get(object.parentPtr)! + 1);
        }
    });
});
