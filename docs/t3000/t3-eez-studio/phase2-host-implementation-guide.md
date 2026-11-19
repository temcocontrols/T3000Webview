# Phase 2 — Host Implementation Guide (T3000 WebView / Design Studio)

> **What this is.** The front-end half of Phase 2: the changes that make the browser side
> *correct and honest* about a device that renders JSON. It does **not** contain a renderer — the
> editor already renders `.eez-project` with the LVGL WASM runtime, and that does not change.
>
> Companion documents: [phase2-device-renderer-design.md](phase2-device-renderer-design.md)
> (contract + rationale) and
> [phase2-firmware-implementation-guide.md](phase2-firmware-implementation-guide.md)
> (the device side).

---

## 0. Scope

| Area | Change needed? |
|---|---|
| `.eez-project` → device JSON export (`firmware-export.ts`) | **No** — already emits the device format, `align` included, flex lifted, only the two supported actions |
| Device JSON → `.eez-project` import (`firmware-loader.ts`) | **No** |
| Browser preview (LVGL WASM) | **No** |
| REST transport / proxy | **No** |
| Deploy pipeline (`deployService.ts`) | **Yes** — add the compatibility check + a verify step |
| Import pipeline (`device-import.ts`) | **Yes** — tolerate a 404 per screen |
| REST client (`device-rest-client.ts`) | **Yes** — add `getDeviceStatus()` |
| Deploy drawer UI | **Yes** — show findings, show device status |
| Tests | **Yes** — export contract snapshot + compat checker unit tests |

Everything below is additive. Nothing removes an existing code path, so a device without the
Phase 2 firmware behaves exactly as today.

---

## 1. F1 — the compatibility checker

### 1.1 New file: `src/lib/t3-eez-studio/project-editor/build/device-compat.ts`

Pure function over the exported device JSON. No I/O, no React — so it is trivially unit-testable
and reusable from the Design Hub, the editor toolbar, and a future CLI.

```ts
/**
 * device-compat.ts — what the Phase 2 device renderer can and cannot draw.
 *
 * Phase 2 renders literal text only and implements exactly two actions
 * (screen_change, flag_modify). Anything else must be surfaced to the user
 * BEFORE the deploy, not discovered afterwards on a dark panel.
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

/** sub_types the Phase 2 device renderer implements. */
const RENDERABLE = new Set([
    "screen", "panel", "label", "textarea", "button", "imagebutton",
    "image", "switch", "checkbox", "dropdown", "roller",
    "arc", "bar", "slider", "calendar", "keyboard",
]);

/** sub_types the exporter can emit but the renderer cannot draw yet. */
const KNOWN_UNSUPPORTED = new Set(["user_widget"]);

const ACTIONS = new Set(["screen_change", "flag_modify"]);

/** 512 KB is the device's hard request limit (400 for anything larger). */
const SCREEN_SIZE_WARN_BYTES = 400 * 1024;

function walkWidgets(
    widgets: Record<string, any>,
    screen: string,
    out: CompatFinding[]
): void {
    for (const [key, w] of Object.entries(widgets || {})) {
        if (!w || typeof w !== "object") continue;

        const sub = String(w.sub_type ?? "");
        if (KNOWN_UNSUPPORTED.has(sub)) {
            out.push({
                level: "error", screen, widget: key, code: "unsupported-widget",
                message: `"${key}" is a user widget. The device renderer cannot draw it yet.`,
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

        // Actions
        const events = w.events;
        if (events && typeof events === "object") {
            for (const [trigger, body] of Object.entries<any>(events)) {
                const acts = Array.isArray(body?.actions) ? body.actions : [];
                for (const a of acts) {
                    const kind = String(a?.action ?? "");
                    if (kind && !ACTIONS.has(kind)) {
                        out.push({
                            level: "error", screen, widget: key, code: "action",
                            message: `"${key}" ${trigger} runs "${kind}", which the device cannot execute.`,
                        });
                    }
                    if (kind === "flag_modify" && !a?.target) {
                        out.push({
                            level: "warning", screen, widget: key, code: "action-target",
                            message: `"${key}" ${trigger} has a flag_modify with no target.`,
                        });
                    }
                }
            }
        }

        if (w.children) walkWidgets(w.children, screen, out);
    }
}

/**
 * Check every exported screen against what the Phase 2 device can render.
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

        walkWidgets(body.widgets || {}, screen, findings);

        // Referenced-but-missing images (would render blank on the panel).
        const referenced = new Set<string>();
        const collect = (widgets: Record<string, any>) => {
            for (const [key, w] of Object.entries(widgets || {})) {
                if (!w || typeof w !== "object") continue;
                for (const f of ["src", "img_released", "img_pressed", "img_disabled"]) {
                    const v = w[f];
                    if (typeof v === "string" && v) {
                        referenced.add(v);
                        if (!declared.has(v)) {
                            findings.push({
                                level: "warning", screen, widget: key, code: "image-undeclared",
                                message: `"${key}" uses image "${v}" which is not in the screen's bitmaps list.`,
                            });
                        }
                    }
                }
                if (w.children) collect(w.children);
            }
        };
        collect(body.widgets || {});

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
```

### 1.2 Unit tests: `test/vitest/__tests__/device-compat.test.ts`

The repo's vitest suite lives in `test/vitest/__tests__/` and runs with `vitest`.

```ts
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
        expect(r.ok).toBe(true);
        expect(r.findings).toHaveLength(0);
    });

    it("warns on expression text", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen({ T: label({ text_type: "expression", obj_text: "temp*10" }) }),
        });
        expect(r.ok).toBe(true);
        expect(r.findings[0].code).toBe("expression");
        expect(r.findings[0].widget).toBe("T");
    });

    it("errors on a user widget", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen({ U: { type: "Widget", sub_type: "user_widget", widget: "X" } }),
        });
        expect(r.ok).toBe(false);
        expect(r.errors).toBe(1);
    });

    it("errors on an unknown action", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen({
                B: { ...label(), sub_type: "button",
                     events: { CLICKED: { actions: [{ action: "setVariable" }] } } },
            }),
        });
        expect(r.ok).toBe(false);
        expect(r.findings.some((f) => f.code === "action")).toBe(true);
    });

    it("accepts the two supported actions", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen({
                P: { ...label(), sub_type: "panel" },
                B: { ...label(), sub_type: "button",
                     events: { CLICKED: { actions: [
                        { action: "flag_modify", flag: "hidden", mode: "toggle", target: "P" },
                        { action: "screen_change", screen: "menu" },
                     ] } } },
            }),
        });
        expect(r.ok).toBe(true);
        expect(r.findings).toHaveLength(0);
    });

    it("warns when a widget references an undeclared image", () => {
        const r = checkDeviceCompatibility({
            home_screen: screen({ I: { ...label(), sub_type: "image", src: "logo" } }, []),
        });
        expect(r.findings[0].code).toBe("image-undeclared");
    });

    it("never throws on garbage", () => {
        expect(() => checkDeviceCompatibility({} as any)).not.toThrow();
        expect(checkDeviceCompatibility({ x: null } as any).ok).toBe(true);
    });
});
```

Run just this file:

```
npx vitest run test/vitest/__tests__/device-compat.test.ts
```

---

## 2. F2 — wire the check into the deploy pipeline

`src/t3-react/features/design-hub/services/deployService.ts`, immediately **after**
`transformToDeviceJson()` and **before** the diff (so the user is told before anything is pushed):

```ts
import { checkDeviceCompatibility } from "project-editor/build/device-compat";

// … after: const screens = transformToDeviceJson(project);

// 1b. Phase 2 compatibility check — errors block, warnings do not.
const compat = checkDeviceCompatibility(screens);
if (compat.findings.length > 0) {
    const errorText = compat.findings
        .filter((f) => f.level === "error")
        .map((f) => `${f.screen}${f.widget ? `/${f.widget}` : ""}: ${f.message}`)
        .join(" · ");
    emitStep(
        "compat",
        compat.ok ? "Compatibility check passed with warnings" : "Compatibility check failed",
        `${compat.errors} error(s), ${compat.warnings} warning(s)`,
        compat.ok ? "done" : "error",
        compat.ok ? undefined : errorText
    );
}
if (!compat.ok) {
    return {
        success: false,
        message: `${compat.errors} item(s) cannot be rendered by the device. Fix them or remove them before deploying.`,
        steps,
        screens: screenNames,
        screenCount: screenNames.length,
        imageCount: images.length,
    };
}
```

`DeployEezResult` needs no change — `success`, `message` and `steps` already carry everything the
drawer shows. Optionally add the raw report for the UI:

```ts
export interface DeployEezResult {
    // …
    /** Phase 2 compatibility findings (warnings even when the deploy proceeds). */
    compatibility?: CompatReport;
}
```

and return `compatibility: compat`.

### Why "errors block" is the right default

An unsupported widget is not a cosmetic problem: `dynui` logs a warning and draws *nothing* for
it, so the panel would show a gap that exists nowhere in the editor preview. Blocking is honest;
a warning-then-deploy flow would train users to ignore the message.

---

## 3. F3 — show findings and device status in the deploy drawer

### 3.1 Findings panel

`src/t3-react/features/design-hub/components/DeployDeviceDrawer.tsx` — after the existing step
list is rendered, add a collapsible block. Keep the existing styling conventions in that file
(inline styles, Fluent UI icons):

```tsx
{result?.compatibility && result.compatibility.findings.length > 0 && (
    <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            {result.compatibility.errors > 0
                ? `${result.compatibility.errors} item(s) cannot render on this device`
                : `${result.compatibility.warnings} warning(s)`}
        </div>
        {result.compatibility.findings.slice(0, 20).map((f, i) => (
            <div key={i} style={{ fontSize: 12, display: "flex", gap: 6, padding: "2px 0" }}>
                <span style={{ color: f.level === "error" ? "#c50f1f" : "#9a6700", minWidth: 16 }}>
                    {f.level === "error" ? "✖" : "▲"}
                </span>
                <span>
                    <strong>{f.screen}</strong>
                    {f.widget ? ` · ${f.widget}` : ""} — {f.message}
                </span>
            </div>
        ))}
        {result.compatibility.findings.length > 20 && (
            <div style={{ fontSize: 12, opacity: 0.7 }}>
                … and {result.compatibility.findings.length - 20} more
            </div>
        )}
    </div>
)}
```

### 3.2 "Verify on device" step

After a successful push, ask the panel what it actually did. Add to
`device-rest-client.ts` (§4) and call it at the end of the push block:

```ts
try {
    const st = await deviceClient.getDeviceStatus();
    emitStep(
        "verify",
        st.build_ok ? "Device reports the design is live" : "Device reports a render error",
        `mode=${st.ui_mode} screen=${st.current_screen} ${st.last_build_ms}ms` +
            (st.last_error ? ` error=${st.last_error}` : ""),
        st.build_ok ? "done" : "error",
        st.build_ok ? undefined : st.last_error
    );
} catch {
    // Older firmware has no /device/status — not a deploy failure.
    emitStep("verify", "Device status not available", "firmware without /device/status", "skipped");
}
```

This is the single most useful addition for support: it converts "the panel doesn't show my
design" into a concrete `ui_mode` / `last_error` string.

---

## 4. F4 — REST client additions

`src/lib/t3-eez-studio/project-editor/build/device-rest-client.ts`

### 4.1 `getDeviceStatus()`

```ts
/** Renderer / UI state reported by the device (Phase 2 firmware). */
export interface DeviceStatus {
    ui_mode: "dynamic" | "compiled" | string;
    current_screen: string;
    last_build_ms: number;
    build_ok: boolean;
    last_error?: string;
    images_loaded?: number;
    heap_free?: number;
}

/** GET /api/eez-device/device/status (additive — 404 on older firmware). */
async getDeviceStatus(): Promise<DeviceStatus> {
    const response = await fetch(
        restUrl("device/status", this.deviceIp),
        { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
    );
    if (!response.ok) throw new Error(`Device returned ${response.status}`);
    return response.json();
}
```

### 4.2 Tolerant single-screen load

The importer needs to distinguish "this screen is absent" from "the device is broken":

```ts
/** Load a screen, returning null when the device has no JSON for it (404). */
async loadScreenOrNull(name: string): Promise<FirmwareScreen | null> {
    try {
        return await this.loadScreen(name);
    } catch (e: any) {
        if (/\b404\b/.test(String(e?.message ?? ""))) return null;
        throw e;
    }
}
```

`loadScreen()` stays as it is — other callers may still want the throw.

### 4.3 Import: tolerate missing screens

`src/lib/t3-eez-studio/project-editor/build/device-import.ts`, replace the body of the Step 3
loop:

```ts
const stagingScreens: { name: string; json: any }[] = [];
const missing: string[] = [];

for (let i = 0; i < info.screens.length; i++) {
    const screenName = info.screens[i];
    const screen = await client.loadScreenOrNull(screenName);
    if (!screen) {
        missing.push(screenName);
        log(`  → screen${i + 1}: ${screenName} — missing on device (skipped)`);
        continue;
    }
    const screenPath = `${stagingDir}/${screenName}.json`;
    await fetch(`/api/eez-studio/write-file?path=${encodeURIComponent(screenPath)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(screen.json),
    });
    stagingScreens.push(screen);
    const kb = Math.round(JSON.stringify(screen.json).length / 1024);
    log(`  → screen${i + 1}: ${screen.name} — ${kb}KB`);
}

if (stagingScreens.length === 0) {
    throw new Error("No screens could be read from the device.");
}
log(
    `✔ Step 3 — Loaded ${stagingScreens.length} screens` +
        (missing.length ? ` (${missing.length} missing: ${missing.join(", ")})` : "")
);
```

`resolveImportLog()` already parses these lines (`→` / `✔`), so the dialog needs no change.

> Guard note: `info.screens` comes from `device/info`, which currently lists all 13 canonical
> slots whether or not the file exists. Once the firmware reports only existing screens, this
> tolerance simply never triggers — it costs nothing to keep.

---

## 5. F5 — export contract snapshot test

The single guard rail that protects the device from front-end drift. It fails the moment
`firmware-export.ts` stops emitting something the renderer depends on.

`test/vitest/__tests__/firmware-export.contract.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { transformToDeviceJson } from "../../../src/lib/t3-eez-studio/project-editor/build/firmware-export";

/** Minimal .eez-project exercising the contract points the renderer relies on. */
const project = {
    settings: { general: { displayWidth: 480, displayHeight: 320, darkTheme: true } },
    fonts: [], bitmaps: [],
    userPages: [{
        name: "home_screen",
        components: [
            {
                objID: "screen1", type: "LVGLScreenWidget", children: [
                    {
                        objID: "l1", type: "LVGLLabelWidget", identifier: "TempLabel",
                        left: 0, top: 110, width: 0, height: 0,
                        text: "22.5", textType: "literal",
                        localStyles: { definition: {
                            MAIN: { DEFAULT: { align: "center",
                                               text_font: "lv_font_montserrat_40" } },
                        } },
                    },
                ],
            },
        ],
        connectionLines: [],
    }],
};

describe("firmware export contract", () => {
    const out = transformToDeviceJson(project as any);
    const scr = out["home_screen"];
    const root = scr.widgets["HomeScreen"];

    it("keeps the screen envelope", () => {
        expect(scr).toHaveProperty("bg_color");
        expect(Array.isArray(scr.fonts)).toBe(true);
        expect(Array.isArray(scr.bitmaps)).toBe(true);
        expect(root.sub_type).toBe("screen");
    });

    it("emits the 8 base fields on every widget", () => {
        const w = root.children["TempLabel"];
        for (const k of ["type", "sub_type", "x_pos", "y_pos", "width", "height", "obj_text", "text_type"]) {
            expect(w, `missing ${k}`).toHaveProperty(k);
        }
    });

    it("lifts align out of style (offset semantics)", () => {
        const w = root.children["TempLabel"];
        expect(w.align).toBe("center");
        expect(w.x_pos).toBe(0);
        expect(w.y_pos).toBe(110);
        expect(w.style?.MAIN?.DEFAULT?.align).toBeUndefined();
    });

    it("keeps zero size (renderer maps 0 to LV_SIZE_CONTENT)", () => {
        const w = root.children["TempLabel"];
        expect(w.width).toBe(0);
        expect(w.height).toBe(0);
    });

    it("does not emit unsupported actions", () => {
        // mapNativeAction() returns null for setVariable etc.; nothing must leak.
        const json = JSON.stringify(out);
        expect(json).not.toContain('"action":"setVariable"');
    });
});
```

Run:

```
npx vitest run test/vitest/__tests__/firmware-export.contract.test.ts test/vitest/__tests__/device-compat.test.ts
```

If a future editor change intentionally alters the device format, this test is the place that
documents the decision — update it *and* the firmware guide together.

---

## 6. F6 — documentation corrections to keep in sync

The following are already fixed in this repository's docs; keep them consistent when the
firmware changes:

| Claim | Where it lives now |
|---|---|
| Widget shape is `type:"Widget" / sub_type / x_pos / y_pos / obj_text` (not `type:"label" / x / y / text`) | [phase2-device-renderer-design.md §3](phase2-device-renderer-design.md) |
| `device/info.screens` is an **object** keyed `screen1..N` | `device-rest-client.ts#normalizeInfoScreens` handles both |
| Request bodies are capped at 512 KB → 400 | [design §4.10](phase2-device-renderer-design.md) |
| A deploy response means *persisted*, not *painted* | [device-interface-deployment-via-bacnet-design.md](device-interface-deployment-via-bacnet-design.md) |
| There is no `DELETE /screens/:name` yet | same doc, "Limits and gaps" |

The firmware repo's `DEVICE_REST_API_DISPLAY.md` still shows the wrong "canonical" JSON; the
replacement text is Appendix C of the design document.

---

## 7. Order of work

| Step | Deliverable | Verify with |
|---|---|---|
| H1 | `device-compat.ts` | `npx vitest run …/device-compat.test.ts` |
| H2 | export contract test | `npx vitest run …/firmware-export.contract.test.ts` |
| H3 | `getDeviceStatus()` + `loadScreenOrNull()` | type-check + manual `curl` on a Phase 2 board |
| H4 | import 404 tolerance | import from a board with one screen file deleted |
| H5 | compat check inside `deployEezProject()` | deploy a project with an expression → see the warning |
| H6 | drawer findings panel + verify step | deploy to a Phase 2 board → "Device reports the design is live" |

H1/H2 are pure and can land before any firmware exists. H3–H6 degrade gracefully on today's
firmware (no `/device/status` → `skipped` step; no 404s → tolerance never fires).

### Commands

```
# unit tests for the two new files
npx vitest run test/vitest/__tests__/device-compat.test.ts test/vitest/__tests__/firmware-export.contract.test.ts

# type check
npx tsc --noEmit -p tsconfig.json

# dev server, for the deploy drawer
quasar dev
```

---

## 8. What this guide deliberately does not do

- **No renderer in the browser.** The WASM runtime already previews `.eez-project`; making it
  preview the *device* JSON would duplicate the firmware renderer and immediately drift.
- **No image re-encoding.** PNG bytes are pushed as-is; the device decodes them. Converting to
  LVGL `.bin` in the browser is a later optimisation that changes the device contract, so it
  belongs with a firmware change, not here.
- **No screen deletion.** The device has no `DELETE /screens/:name`; adding client support before
  the endpoint exists would silently do nothing.
