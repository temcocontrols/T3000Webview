/**
 * device-compat.ts — what the device renderer can and cannot draw.
 *
 * The device renders the exported JSON literally: it builds the widget tree from
 * `sub_type`, draws literal text only, and executes exactly three actions
 * (`screen_change`, `flag_modify`, `call`). Anything else must be surfaced to
 * the user BEFORE the deploy, not discovered afterwards on a dark panel.
 *
 * Pure functions over the exported device JSON: no I/O, no React, so this is
 * reusable from the Design Hub, the editor toolbar and a CLI, and is trivially
 * unit-testable (see test/vitest/__tests__/device-compat.test.ts).
 */

export type CompatLevel = "error" | "warning";

export interface CompatFinding {
    level: CompatLevel;
    screen: string;
    /** Widget key inside the screen, when the finding is widget-scoped. */
    widget?: string;
    /** Stable code, e.g. "expression", "unsupported-widget", "image-missing". */
    code: string;
    message: string;
}

export interface CompatReport {
    findings: CompatFinding[];
    errors: number;
    warnings: number;
    /** True when the deploy may proceed (warnings only). */
    ok: boolean;
}

/**
 * sub_types the device renderer maps to a real LVGL widget
 * (main/TemcoScreen/ui_json_render.c, create_widget()).
 */
const RENDERABLE = new Set([
    "screen", "panel", "label", "textarea", "button", "imagebutton",
    "image", "switch", "checkbox", "dropdown", "roller",
    "arc", "calendar", "keyboard",
]);

/**
 * sub_types the exporter emits but the renderer has no branch for: they fall
 * through to a bare `lv_obj`, so the panel shows an empty container where the
 * editor shows a control.
 */
const KNOWN_UNSUPPORTED: Record<string, string> = {
    bar: "a bar is drawn as an empty container",
    slider: "a slider is drawn as an empty container",
    user_widget: "a user widget cannot be drawn yet",
};

/** Actions the renderer executes; anything else is dropped silently. */
const ACTIONS = new Set(["screen_change", "flag_modify", "call"]);

/** 512 KB is the device's hard request limit (400 for anything larger). */
const SCREEN_SIZE_WARN_BYTES = 400 * 1024;

const SIZE_FIELDS = ["src", "img_released", "img_pressed", "img_disabled"];

function walkWidgets(
    widgets: Record<string, any>,
    screen: string,
    out: CompatFinding[]
): void {
    for (const [key, w] of Object.entries(widgets || {})) {
        if (!w || typeof w !== "object") continue;

        const sub = String(w.sub_type ?? "");
        if (KNOWN_UNSUPPORTED[sub]) {
            out.push({
                level: "error", screen, widget: key, code: "unsupported-widget",
                message: `"${key}" is a ${sub.replace("_", " ")} — ${KNOWN_UNSUPPORTED[sub]}.`,
            });
        } else if (sub && !RENDERABLE.has(sub)) {
            out.push({
                level: "error", screen, widget: key, code: "unknown-widget",
                message: `"${key}" has sub_type "${sub}", which is not implemented on the device.`,
            });
        }

        // Literal-only rendering: expressions are drawn as their raw source text.
        if (w.text_type === "expression") {
            out.push({
                level: "warning", screen, widget: key, code: "expression",
                message: `"${key}" uses a text expression — the device will show the raw expression, not the value.`,
            });
        }
        for (const f of ["value_type", "value_left_type", "checked_type"]) {
            if (w[f] === "expression") {
                out.push({
                    level: "warning", screen, widget: key, code: "expression",
                    message: `"${key}" uses a data-bound ${f.replace("_type", "")} — it will not update on the device.`,
                });
            }
        }

        if (sub === "imagebutton" && !w.img_released) {
            out.push({
                level: "warning", screen, widget: key, code: "image-button-empty",
                message: `"${key}" is an image button with no image.`,
            });
        }

        const events = w.events;
        if (events && typeof events === "object") {
            for (const [trigger, body] of Object.entries<any>(events)) {
                const acts = Array.isArray(body?.actions) ? body.actions : [];
                for (const a of acts) {
                    const kind = String(a?.action ?? "");
                    if (!kind) continue;
                    if (!ACTIONS.has(kind)) {
                        out.push({
                            level: "error", screen, widget: key, code: "action",
                            message: `"${key}" ${trigger} runs "${kind}", which the device cannot execute.`,
                        });
                    } else if (kind === "call") {
                        out.push({
                            level: "warning", screen, widget: key, code: "action-call",
                            message: `"${key}" ${trigger} calls "${a?.function ?? "?"}", which only runs if the firmware ships that handler.`,
                        });
                    } else if (kind === "flag_modify" && !a?.target) {
                        out.push({
                            level: "warning", screen, widget: key, code: "action-target",
                            message: `"${key}" ${trigger} has a flag_modify with no target.`,
                        });
                    } else if (kind === "screen_change" && !a?.screen) {
                        out.push({
                            level: "warning", screen, widget: key, code: "action-target",
                            message: `"${key}" ${trigger} has a screen_change with no target screen.`,
                        });
                    }
                }
            }
        }

        if (w.children) walkWidgets(w.children, screen, out);
    }
}

function collectImages(widgets: Record<string, any>, into: Set<string>): void {
    for (const w of Object.values(widgets || {})) {
        if (!w || typeof w !== "object") continue;
        for (const f of SIZE_FIELDS) {
            const v = (w as any)[f];
            if (typeof v === "string" && v) into.add(v);
        }
        if ((w as any).children) collectImages((w as any).children, into);
    }
}

/**
 * Check every exported screen against what the device renderer can draw.
 * Defensive: malformed input yields no findings rather than throwing.
 */
export function checkDeviceCompatibility(
    screens: Record<string, any>
): CompatReport {
    const findings: CompatFinding[] = [];

    for (const [screen, body] of Object.entries(screens || {})) {
        if (!body || typeof body !== "object") continue;

        const declared = new Set(
            (Array.isArray(body.bitmaps) ? body.bitmaps : []).map(String)
        );
        const widgets = body.widgets || {};

        walkWidgets(widgets, screen, findings);

        // Referenced-but-undeclared images (they would render blank on the panel).
        const referenced = new Set<string>();
        collectImages(widgets, referenced);
        for (const image of referenced) {
            if (!declared.has(image)) {
                findings.push({
                    level: "warning", screen, code: "image-undeclared",
                    message: `Screen "${screen}" uses image "${image}", which is not in its bitmaps list.`,
                });
            }
        }

        const bytes = JSON.stringify(body).length;
        if (bytes > SCREEN_SIZE_WARN_BYTES) {
            findings.push({
                level: "warning", screen, code: "screen-too-large",
                message: `Screen "${screen}" is ${Math.round(bytes / 1024)} KB; the device limit is 512 KB per request.`,
            });
        }
    }

    const errors = findings.filter((f) => f.level === "error").length;
    return { findings, errors, warnings: findings.length - errors, ok: errors === 0 };
}

/** One line per finding, for logs and the deploy drawer's error text. */
export function formatCompatFindings(findings: CompatFinding[]): string {
    return findings
        .map((f) => `${f.screen}${f.widget ? `/${f.widget}` : ""}: ${f.message}`)
        .join(" · ");
}
