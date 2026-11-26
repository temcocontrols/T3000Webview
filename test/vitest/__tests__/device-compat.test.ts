import { describe, it, expect } from "vitest";
import { checkDeviceCompatibility } from "../../../src/lib/t3-eez-studio/project-editor/build/device-compat";

const label = (extra: Record<string, any> = {}) => ({
    type: "Widget", sub_type: "label", x_pos: 0, y_pos: 0,
    width: 0, height: 0, obj_text: "hi", text_type: "literal", ...extra,
});

const screen = (children: Record<string, any>, bitmaps: string[] = []) => ({
    bg_color: "#000000", bitmaps, fonts: [],
    widgets: { HomeScreen: { type: "Widget", sub_type: "screen", children } },
});

describe("checkDeviceCompatibility", () => {
    it("accepts a plain literal screen", () => {
        const r = checkDeviceCompatibility({ home_screen: screen({ L1: label() }) });
        expect(r.findings).toHaveLength(0);
        expect(r.ok).toBe(true);
    });

    it("accepts the widget types the renderer implements", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen({
                P: { type: "Widget", sub_type: "panel", children: { L: label() } },
                B: { type: "Widget", sub_type: "button" },
                I: { type: "Widget", sub_type: "image" },
                IB: { type: "Widget", sub_type: "imagebutton", img_released: "backsmallarrow" },
                T: { type: "Widget", sub_type: "textarea" },
                S: { type: "Widget", sub_type: "switch" },
                C: { type: "Widget", sub_type: "checkbox" },
                D: { type: "Widget", sub_type: "dropdown" },
                R: { type: "Widget", sub_type: "roller" },
                A: { type: "Widget", sub_type: "arc" },
                CA: { type: "Widget", sub_type: "calendar" },
                K: { type: "Widget", sub_type: "keyboard" },
            }, ["backsmallarrow"]),
        });
        expect(r.findings).toEqual([]);
    });

    it("errors on a bar, a slider and a user widget", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen({
                BAR: { type: "Widget", sub_type: "bar" },
                SLD: { type: "Widget", sub_type: "slider" },
                U: { type: "Widget", sub_type: "user_widget", widget: "X" },
            }),
        });
        expect(r.ok).toBe(false);
        expect(r.errors).toBe(3);
        expect(r.findings.map((f) => f.widget)).toEqual(["BAR", "SLD", "U"]);
    });

    it("errors on an unknown sub_type", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen({ Q: { type: "Widget", sub_type: "spinner" } }),
        });
        expect(r.findings[0].code).toBe("unknown-widget");
        expect(r.ok).toBe(false);
    });

    it("warns on expression text without blocking", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen({ T: label({ text_type: "expression", obj_text: "temp*10" }) }),
        });
        expect(r.ok).toBe(true);
        expect(r.errors).toBe(0);
        expect(r.findings[0].code).toBe("expression");
        expect(r.findings[0].widget).toBe("T");
    });

    it("warns on data-bound value and checked fields", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen({
                A: { type: "Widget", sub_type: "arc", value_type: "expression" },
                C: { type: "Widget", sub_type: "checkbox", checked_type: "expression" },
            }),
        });
        expect(r.warnings).toBe(2);
        expect(r.ok).toBe(true);
    });

    it("warns on an image button with no image", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen({ IB: { type: "Widget", sub_type: "imagebutton" } }),
        });
        expect(r.findings[0].code).toBe("image-button-empty");
        expect(r.ok).toBe(true);
    });

    it("errors on an action the device cannot execute", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen({
                B: {
                    ...label(), sub_type: "button",
                    events: { CLICKED: { actions: [{ action: "setVariable" }] } },
                },
            }),
        });
        expect(r.ok).toBe(false);
        expect(r.findings[0].code).toBe("action");
    });

    it("accepts screen_change and flag_modify, warns on call", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen({
                B: {
                    ...label(), sub_type: "button",
                    events: {
                        CLICKED: {
                            actions: [
                                { action: "screen_change", screen: "home_screen" },
                                { action: "flag_modify", target: "Panel2", flag: "hidden", mode: "add" },
                                { action: "call", function: "UpdateWifiConfig" },
                            ],
                        },
                    },
                },
            }),
        });
        expect(r.ok).toBe(true);
        expect(r.findings.map((f) => f.code)).toEqual(["action-call"]);
    });

    it("warns on actions with no target", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen({
                B: {
                    ...label(), sub_type: "button",
                    events: {
                        CLICKED: {
                            actions: [
                                { action: "flag_modify", flag: "hidden" },
                                { action: "screen_change" },
                            ],
                        },
                    },
                },
            }),
        });
        expect(r.ok).toBe(true);
        expect(r.findings.map((f) => f.code)).toEqual(["action-target", "action-target"]);
    });

    it("warns about images that are not declared in the screen bitmaps", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen({ I: { type: "Widget", sub_type: "image", src: "snowflake_30" } }, []),
        });
        expect(r.findings.map((f) => f.code)).toEqual(["image-undeclared"]);
        expect(r.ok).toBe(true);
    });

    it("does not warn about declared images", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen(
                { I: { type: "Widget", sub_type: "image", src: "snowflake_30" } },
                ["snowflake_30"]
            ),
        });
        expect(r.findings).toEqual([]);
    });

    it("warns when a screen is larger than the comfortable request size", () => {
        const big = label({ obj_text: "x".repeat(420 * 1024) });
        const r = checkDeviceCompatibility({ home_screen: screen({ L: big }) });
        expect(r.findings.map((f) => f.code)).toEqual(["screen-too-large"]);
        expect(r.ok).toBe(true);
    });

    it("survives malformed input", () => {
        expect(checkDeviceCompatibility({} as any).ok).toBe(true);
        expect(checkDeviceCompatibility({ a: null, b: "x" } as any).ok).toBe(true);
        expect(
            checkDeviceCompatibility({ a: { widgets: { W: { sub_type: null } } } } as any).ok
        ).toBe(true);
    });
});
