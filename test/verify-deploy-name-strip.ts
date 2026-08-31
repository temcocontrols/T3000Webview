/**
 * Quick verification for the deploy suffix-strip fix.
 * Runs transformToDeviceJson against a sample project with import-uniquified
 * identifiers (back_button, back_button_2, home_label) and checks that the
 * device JSON restores the original widget names.
 */
import { transformToDeviceJson } from "../src/lib/t3-eez-studio/project-editor/build/firmware-export";

const sampleProject: any = {
    fonts: [],
    bitmaps: [],
    userPages: [
        {
            name: "home_screen",
            components: [
                {
                    objID: "imp_home_screen_0_x1",
                    type: "LVGLButtonWidget",
                    identifier: "back_button",
                    left: 0, top: 0, width: 80, height: 40,
                    localStyles: {},
                    children: [],
                },
                {
                    objID: "imp_home_screen_1_x1",
                    type: "LVGLLabelWidget",
                    identifier: "home_label",
                    left: 0, top: 0, width: 40, height: 20,
                    localStyles: {},
                    children: [],
                },
                // A nested child whose identifier was uniquified (back_button_2)
                {
                    objID: "imp_home_screen_2_x1",
                    type: "LVGLPanelWidget",
                    identifier: "menu_panel",
                    left: 0, top: 0, width: 200, height: 100,
                    localStyles: {},
                    children: [
                        {
                            objID: "imp_home_screen_3_x1",
                            type: "LVGLButtonWidget",
                            identifier: "back_button_2",
                            left: 0, top: 0, width: 40, height: 20,
                            localStyles: {},
                            children: [],
                        },
                    ],
                },
            ],
            connectionLines: [],
        },
        {
            name: "settings_screen",
            components: [
                {
                    objID: "imp_settings_screen_0_x1",
                    type: "LVGLButtonWidget",
                    identifier: "back_button_3",
                    left: 0, top: 0, width: 80, height: 40,
                    localStyles: {},
                    children: [],
                },
            ],
            connectionLines: [],
        },
    ],
};

const out = transformToDeviceJson(sampleProject);

console.log("home_screen widgets keys:", Object.keys(out.home_screen.widgets));
console.log("home_screen menu_panel children keys:", Object.keys(out.home_screen.widgets.menu_panel.children));
console.log("settings_screen widgets keys:", Object.keys(out.settings_screen.widgets));

const all = [
    ...Object.keys(out.home_screen.widgets),
    ...Object.keys(out.settings_screen.widgets),
];
const expected = ["back_button", "home_label", "menu_panel", "back_button", "back_button"];
const bad = all.filter((k) => /_\d+$/.test(k));
console.log("leftover suffixed keys:", bad.length ? bad : "none ✓");

const ok =
    bad.length === 0 &&
    Object.keys(out.home_screen.widgets).includes("back_button") &&
    Object.keys(out.home_screen.widgets.menu_panel.children).includes("back_button") &&
    Object.keys(out.settings_screen.widgets).includes("back_button");

console.log(ok ? "PASS ✓" : "FAIL ✗");
process.exit(ok ? 0 : 1);
