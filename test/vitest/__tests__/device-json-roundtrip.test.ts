/**
 * Offline deploy-contract test: the 13 screens the firmware ships in its own
 * build (`temco_dynamic_display/DefaultScreens`) must survive
 * firmwareToProject() → transformToDeviceJson() as *drawable* trees.
 *
 * The fixtures are byte copies of the firmware's DefaultScreens. They are the
 * only executable spec of the UI that does not need hardware: the firmware's
 * own auditors (tools/dump_screens.py + tools/audit_render.py) compare rendered
 * geometry and therefore cannot run without a board.
 *
 * What is asserted, per screen:
 *   - the exporter emits exactly one screen object with the expected widget count
 *     (catches widgets silently dropped or invented on the way out)
 *   - widgets that kept their name kept their sub_type
 *   - the exported tree has no dangling references: every `align_to` target and
 *     every action `target` names a widget that exists on that screen
 *
 * What is deliberately NOT asserted:
 *   - geometry. The device file declares authored values while the exporter
 *     emits resolved ones (flex placement, align chains), so x/y/width/height
 *     legitimately differ. Rendered geometry is audit_render.py's job.
 *   - widget names for imported screens. The loader uniquifies identifiers and
 *     the exporter restores them, which is lossy for a few labels
 *     (main_menu `label6` → `Label62`); names stay consistent within the screen,
 *     which the dangling-reference check proves.
 *   - child order. This one matters, because on the device child order is LVGL
 *     z-order (see tools/gen_json_from_c.py: keys are emitted in C creation
 *     order). The loader deliberately pulls `hidden` widgets out and pushes them
 *     last — firmware-loader.ts, "hidden widgets ... must render ON TOP" — so 2
 *     of the 13 screens (home_screen, time) come back in a different order than
 *     the device file. That is intended normalisation for popups, not drift, so
 *     asserting order here would lock in the wrong behaviour.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { firmwareToProject } from "../../../src/lib/t3-eez-studio/project-editor/build/firmware-loader";
import { transformToDeviceJson } from "../../../src/lib/t3-eez-studio/project-editor/build/firmware-export";

/** vitest runs from the project root; `import.meta.url` is not a file URL here. */
const FIXTURES = path.resolve(process.cwd(), "test/vitest/fixtures/defaultScreens");

/**
 * Widgets the exporter must emit per screen, screen root included.
 * A change here means the round-trip gained or lost a widget — re-verify in the
 * EEZ editor before updating the number.
 */
const EXPECTED_WIDGET_COUNTS: Record<string, number> = {
    ddns_screen: 11,
    holiday_calender_screen: 7,
    home_screen: 54,
    main_menu: 28,
    network_config: 33,
    parameters: 8,
    protocols: 21,
    // The device's single `Panel8` becomes the editor's per-entry
    // ScheduleEditPanel1..5, so the count is one lower than the device file.
    schedule_edit_screen: 101,
    schedule_screen: 59,
    start_up_screen: 3,
    time: 34,
    wifi_config: 18,
    wireguard_screen: 17,
};

interface WidgetNode {
    name: string;
    path: string;
    widget: Record<string, any>;
}

/** Flatten a `widgets` map into { name, path, widget } entries, depth first. */
function flatten(widgets: Record<string, any> | undefined, prefix = ""): WidgetNode[] {
    const out: WidgetNode[] = [];
    for (const [name, widget] of Object.entries<any>(widgets || {})) {
        const widgetPath = `${prefix}${name}`;
        out.push({ name, path: widgetPath, widget });
        out.push(...flatten(widget?.children, `${widgetPath}/`));
    }
    return out;
}

/** References that must resolve to a widget on the same screen. */
function danglingReferences(nodes: WidgetNode[]): string[] {
    const names = new Set(nodes.map((n) => n.name));
    const bad: string[] = [];

    for (const { path: p, widget } of nodes) {
        const alignTo = widget.align_to;
        const target = typeof alignTo === "string" ? alignTo : alignTo?.target;
        if (target && !names.has(target)) bad.push(`${p}: align_to -> ${target}`);

        for (const [event, body] of Object.entries<any>(widget.events || {})) {
            for (const action of body?.actions || []) {
                if (action?.action === "screen_change") continue;
                const ref = action?.target;
                if (ref && !names.has(ref)) bad.push(`${p}: ${event} ${action.action} -> ${ref}`);
            }
        }
    }
    return bad;
}

const fixtureFiles = fs
    .readdirSync(FIXTURES)
    .filter((f) => f.endsWith(".json"))
    .sort();

function load(screenName: string) {
    const fixture = JSON.parse(
        fs.readFileSync(path.join(FIXTURES, `${screenName}.json`), "utf8")
    ) as Record<string, any>;
    const project = firmwareToProject([{ name: screenName, json: fixture }], {
        panel_name: "Round-trip fixture",
        serial_number: 1,
    });
    const exported = transformToDeviceJson(project) as Record<string, any>;
    return { fixture, exported };
}

describe("default screen JSON round-trip (load from device → export for device)", () => {
    it("ships all 13 default screens as fixtures", () => {
        expect(fixtureFiles).toHaveLength(13);
        expect(Object.keys(EXPECTED_WIDGET_COUNTS).sort()).toEqual(
            fixtureFiles.map((f) => f.replace(/\.json$/, "")).sort()
        );
    });

    for (const file of fixtureFiles) {
        const screenName = file.replace(/\.json$/, "");

        it(`${screenName} exports drawable`, () => {
            const { fixture, exported } = load(screenName);

            // Exactly one screen, named after the fixture.
            expect(Object.keys(exported)).toEqual([screenName]);
            const screen = exported[screenName];
            expect(screen?.widgets, "exporter produced a screen with no widgets").toBeTruthy();

            const nodes = flatten(screen.widgets);
            expect(
                nodes.length,
                `widget count changed (fixture declares ${flatten(fixture.widgets).length})`
            ).toBe(EXPECTED_WIDGET_COUNTS[screenName]);

            // Every widget the exporter emits has to be something LVGL can draw.
            for (const { path: p, widget } of nodes) {
                expect(typeof widget.sub_type, `${p} has no sub_type`).toBe("string");
            }

            // Widgets that kept their name must have kept their type.
            const fixtureTypes = new Map(
                flatten(fixture.widgets).map((n) => [n.name, n.widget.sub_type])
            );
            for (const { name, path: p, widget } of nodes) {
                const original = fixtureTypes.get(name);
                if (original) {
                    expect(widget.sub_type, `${p} changed sub_type`).toBe(original);
                }
            }

            expect(danglingReferences(nodes), "exported tree has unresolved references").toEqual([]);
        });
    }
});
