import { describe, it, expect } from "vitest";
import { transformToDeviceJson } from "../../../src/lib/t3-eez-studio/project-editor/build/firmware-export";

/**
 * Contract snapshot for the device renderer.
 *
 * The renderer (main/TemcoScreen/ui_json_render.c in the firmware repo) reads
 * exactly these fields, so this test is the guard rail that fails the moment the
 * exporter stops emitting one of them. If the device format intentionally
 * changes, update this test AND docs/t3000/t3-eez-studio/phase2-device-renderer-design.md.
 */

/** Minimal .eez-project exercising the contract points the renderer relies on. */
const project = {
    settings: { general: { displayWidth: 480, displayHeight: 320, darkTheme: true } },
    fonts: [],
    bitmaps: [],
    userPages: [
        {
            name: "home_screen",
            components: [
                {
                    objID: "screen1",
                    type: "LVGLScreenWidget",
                    children: [
                        {
                            objID: "l1",
                            type: "LVGLLabelWidget",
                            identifier: "TempLabel",
                            left: 0,
                            top: 110,
                            width: 0,
                            height: 0,
                            text: "22.5",
                            textType: "literal",
                            localStyles: {
                                definition: {
                                    MAIN: {
                                        DEFAULT: {
                                            align: "center",
                                            text_font: "lv_font_montserrat_40",
                                        },
                                    },
                                },
                            },
                        },
                    ],
                },
            ],
            connectionLines: [],
        },
    ],
};

describe("firmware export contract", () => {
    const out = transformToDeviceJson(project as any);

    it("keeps the screen envelope", () => {
        const scr = out["home_screen"];
        expect(scr).toBeDefined();
        expect(scr).toHaveProperty("bg_color");
        expect(Array.isArray(scr.fonts)).toBe(true);
        expect(Array.isArray(scr.bitmaps)).toBe(true);

        const root: any = Object.values(scr.widgets)[0];
        expect(root.sub_type).toBe("screen");
    });

    it("emits the 8 base fields on every widget", () => {
        const root: any = Object.values(out["home_screen"].widgets)[0];
        const w = root.children["TempLabel"];
        expect(w).toBeDefined();
        for (const k of [
            "type", "sub_type", "x_pos", "y_pos", "width", "height", "obj_text", "text_type",
        ]) {
            expect(w, `missing ${k}`).toHaveProperty(k);
        }
        expect(w.type).toBe("Widget");
        expect(w.sub_type).toBe("label");
        expect(w.obj_text).toBe("22.5");
        expect(w.text_type).toBe("literal");
    });

    it("lifts align out of style and keeps the offset semantics", () => {
        const root: any = Object.values(out["home_screen"].widgets)[0];
        const w = root.children["TempLabel"];
        expect(w.align).toBe("center");
        expect(w.x_pos).toBe(0);
        expect(w.y_pos).toBe(110);
        expect(w.style?.MAIN?.DEFAULT?.align).toBeUndefined();
    });

    it("keeps zero size, which the renderer maps to LV_SIZE_CONTENT", () => {
        const root: any = Object.values(out["home_screen"].widgets)[0];
        const w = root.children["TempLabel"];
        expect(w.width).toBe(0);
        expect(w.height).toBe(0);
    });

    it("does not emit actions the device cannot execute", () => {
        const json = JSON.stringify(out);
        expect(json).not.toContain('"action":"setVariable"');
        for (const m of json.matchAll(/"action":"([^"]+)"/g)) {
            expect(["screen_change", "flag_modify", "call"]).toContain(m[1]);
        }
    });
});
