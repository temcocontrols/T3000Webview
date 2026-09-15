/**
 * Smoke test for the LVGL scene dump (`lvglDumpScene`) used by the SVG renderer.
 *
 * Loads the freshly built v9.5 WASM runtime in Node, initialises LVGL, builds a small object
 * tree, and asserts the dump is valid Scene JSON with the expected tree, geometry and buffer
 * protocol. This is the end-to-end proof for P1's C side without needing the browser.
 *
 *   node scripts/lvgl-svg-dump-smoke.mjs [buildDir]
 *
 * Default buildDir is the sibling studio-wasm-libs checkout (see build-lvgl-95.bat).
 */

import { createRequire } from "node:module";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

const buildDir =
    process.argv[2] ??
    "C:/QN/temcocontrols/studio-wasm-libs/lvgl-runtime/v9.5.0/build";
const gluePath = path.join(buildDir, "lvgl_runtime_v9.5.0.js");
const wasmPath = path.join(buildDir, "lvgl_runtime_v9.5.0.wasm");

if (!existsSync(gluePath) || !existsSync(wasmPath)) {
    console.error(`Build artifacts not found in ${buildDir}`);
    console.error(`Run build-lvgl-95.bat first.`);
    process.exit(2);
}

// pre.js's locateFile consults this before touching `document`.
globalThis.__lvglWasmUrl = wasmPath;

const checks = [];
function check(name, condition, detail) {
    checks.push({ name, ok: !!condition, detail });
    console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? "  鈥?" + detail : ""}`);
}

const factory = require(gluePath);
const Module = factory();

function waitForRuntime(module, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
        const started = Date.now();
        const timer = setInterval(() => {
            const ready =
                typeof module._lvglDumpScene === "function" &&
                typeof module._lv_init === "function" &&
                module.calledRun !== false;
            if (ready) {
                clearInterval(timer);
                resolve();
            } else if (Date.now() - started > timeoutMs) {
                clearInterval(timer);
                reject(new Error("timed out waiting for the WASM runtime"));
            }
        }, 50);
    });
}

/** Dump a subtree, returning the parsed JSON (uses the two-call size protocol). */
function dump(rootPtr) {
    // 1. null buffer must be rejected
    const nullResult = Module._lvglDumpScene(rootPtr, 0, 0);
    if (nullResult !== -1) {
        throw new Error(`expected -1 for a null buffer, got ${nullResult}`);
    }

    // 2. an undersized buffer must report -(requiredSize + 1)
    const probe = Module._malloc(8);
    const probeResult = Module._lvglDumpScene(rootPtr, probe, 8);
    Module._free(probe);
    if (probeResult >= 0) {
        throw new Error("expected a negative required-size result");
    }
    const required = -probeResult;

    // 3. the real call
    const ptr = Module._malloc(required + 1);
    const written = Module._lvglDumpScene(rootPtr, ptr, required + 1);
    const text = Module.UTF8ToString(ptr);
    Module._free(ptr);
    if (written < 0) {
        throw new Error(`dump failed with ${written}`);
    }
    if (written !== text.length) {
        throw new Error(
            `byte count ${written} does not match the decoded length ${text.length}`
        );
    }
    return { text, json: JSON.parse(text), written };
}

try {
    await waitForRuntime(Module);

    check(
        "new functions are exported",
        typeof Module._lvglDumpScene === "function" &&
            typeof Module._lvglCountObjects === "function"
    );

    // An empty tree must still produce a well-formed envelope.
    const empty = dump(0);
    check(
        "empty dump is valid Scene JSON",
        empty.json.sceneVersion === 1 && Array.isArray(empty.json.objects),
        empty.text
    );

    // A real LVGL tree: display -> screen -> child.
    Module._lv_init();
    const display = Module._lv_display_create(480, 320);
    const screenPtr = Module._lvglCreateScreen(0, 0, 0, 0, 480, 320);
    const childPtr = Module._lvglCreateScreen(screenPtr, 1, 10, 20, 100, 50);
    const child2Ptr = Module._lvglCreateScreen(screenPtr, 2, 120, 20, 60, 50);
    // A real image widget: exercises the `lv_obj_check_type(obj, &lv_image_class)` path.
    const imgPtr =
        typeof Module._lv_image_create === "function"
            ? Module._lv_image_create(screenPtr)
            : 0;
    const expectedObjects = imgPtr ? 4 : 3;

    // Style through the exported named setters (plain integers 鈥?no struct ABI involved), so the
    // captured dump below contains real LVGL-resolved style values rather than theme defaults only.
    // Each setter is guarded individually: not every style has an exported setter.
    const styled = [];
    const applyStyle = (name, fn) => {
        if (typeof Module[`_lv_obj_set_style_${name}`] === "function") {
            fn(Module[`_lv_obj_set_style_${name}`]);
            styled.push(name);
        }
    };
    applyStyle("radius", set => {
        set(screenPtr, 12, 0);
        set(childPtr, 8, 0);
    });
    applyStyle("border_width", set => set(childPtr, 2, 0));
    applyStyle("shadow_width", set => set(childPtr, 6, 0));
    applyStyle("outline_width", set => set(childPtr, 1, 0));
    check("styled the tree via the named setters", styled.length > 0, styled.join(", "));

    check("display created", !!display, `ptr=${display}`);
    check("screen + children created", !!screenPtr && !!childPtr && !!child2Ptr);

    const counted = Module._lvglCountObjects(screenPtr);
    check(
        "lvglCountObjects walks the tree",
        counted === expectedObjects,
        `count=${counted}`
    );

    /*
     * Arc angles are emitted in TENTHS of a degree, the unit the scene contract uses, while LVGL's
     * getters report whole degrees (lv_arc_set_angles(obj, 0, 90) reads back as 0 and 90). Reading
     * them raw turned a 144 degree gauge sweep into 14.4 degrees and a full-circle background sweep
     * (0..360) into 36 degrees, which is how the arcs disappeared from the home page.
     */
    if (typeof Module._lv_arc_create === "function") {
        const arcPtr = Module._lv_arc_create(screenPtr);
        Module._lv_obj_set_size(arcPtr, 100, 100);
        /*
         * `lv_obj_set_size` only records the size; the coords (which the ring is computed from) are
         * only produced by a layout pass. Without this the arc is 0x0 and every geometric assertion
         * below passes for the wrong reason.
         */
        if (typeof Module._lv_obj_update_layout === "function") {
            Module._lv_obj_update_layout(arcPtr);
        }
        Module._lv_arc_set_angles(arcPtr, 0, 90);
        Module._lv_arc_set_bg_angles(arcPtr, 0, 360);
        const arc = dump(arcPtr).json.objects[0];
        const indicator = arc.parts.find(part => part.p === 2);
        const main = arc.parts.find(part => part.p === 0);
        check(
            "an arc sweep is emitted in tenths of a degree",
            !!indicator && indicator.arcStart === 0 && indicator.arcEnd === 900,
            `arcStart=${indicator && indicator.arcStart} arcEnd=${indicator && indicator.arcEnd}`
        );
        check(
            "an arc background sweep is emitted in tenths of a degree",
            !!main && main.arcBgStart === 0 && main.arcBgEnd === 3600,
            `arcBgStart=${main && main.arcBgStart} arcBgEnd=${main && main.arcBgEnd}`
        );
        /*
         * The ring: lv_arc.c insets the box by the MAIN pads before taking half its size, so the
         * renderer cannot derive the centre and radius from the area. Without these the whole gauge
         * was drawn on a circle a few pixels outside the canvas's (measured on home_screen: track at
         * 104-105 against 111.5, 9.27% of the row's pixels differing at a tolerance of 8).
         */
        check(
            "an arc reports the ring it is drawn on",
            !!main &&
                typeof main.arcCx === "number" &&
                typeof main.arcCy === "number" &&
                main.arcR > 0,
            main ? `c=(${main.arcCx},${main.arcCy}) r=${main.arcR}` : "no MAIN part"
        );
        check(
            "the arc's indicator reports how far inside the ring it is drawn",
            !!indicator && typeof indicator.arcInset === "number" && indicator.arcInset >= 0,
            indicator ? `arcInset=${indicator.arcInset}` : "no INDICATOR part"
        );
        check(
            "the arc's centre lies inside its own box",
            !!main &&
                main.arcCx >= arc.area.x &&
                main.arcCx <= arc.area.x + arc.area.w &&
                main.arcCy >= arc.area.y &&
                main.arcCy <= arc.area.y + arc.area.h,
            main ? `c=(${main.arcCx},${main.arcCy}) in ${JSON.stringify(arc.area)}` : "no MAIN part"
        );
        if (typeof Module._lv_obj_delete === "function") {
            Module._lv_obj_delete(arcPtr);
        }
    }

    const { text, json } = dump(screenPtr);
    check(
        "resolution comes from the display",
        json.width === 480 && json.height === 320,
        `${json.width}x${json.height}`
    );
    check("rootPtr is the requested object", json.rootPtr === screenPtr);
    check(
        "tree contains every object",
        json.objects.length === expectedObjects,
        `n=${json.objects.length}`
    );

    const root = json.objects.find(o => o.ptr === screenPtr);
    const child = json.objects.find(o => o.ptr === childPtr);
    const child2 = json.objects.find(o => o.ptr === child2Ptr);
    check("screen is a root (parentPtr 0)", root && root.parentPtr === 0);
    check("children link to their parent", child && child2 && child.parentPtr === screenPtr && child2.parentPtr === screenPtr);
    check(
        "index is the sibling z-order (0 then 1)",
        child && child2 && child.index === 0 && child2.index === 1,
        `child=${child?.index} child2=${child2?.index}`
    );
    check(
        "siblings are emitted in ascending index order",
        json.objects.indexOf(child) < json.objects.indexOf(child2)
    );
    check(
        "parents precede children in the flat array",
        json.objects.indexOf(root) < json.objects.indexOf(child)
    );
    check(
        "child geometry matches lv_obj_set_pos/size",
        child && child.area.x === 10 && child.area.y === 20 && child.area.w === 100 && child.area.h === 50,
        child ? JSON.stringify(child.area) : "no child"
    );

    // parts: MAIN is always first and the theme supplies a background, so the style reads work.
    check(
        "MAIN part is emitted first",
        root && root.parts.length > 0 && root.parts[0].p === 0
    );
    check(
        "theme background is read as 0xRRGGBB + opacity",
        root && typeof root.parts[0].bgColor === "number" && typeof root.parts[0].bgOpa === "number",
        root ? `bgColor=0x${(root.parts[0].bgColor ?? 0).toString(16)} bgOpa=${root.parts[0].bgOpa}` : ""
    );
    check(
        "the radius set above is read back",
        root && root.parts[0].radius === 12,
        root ? `radius=${root.parts[0].radius}` : ""
    );
    check(
        "the styled child reports border + shadow + outline",
        child &&
            !!child.parts[0].borderWidth &&
            !!child.parts[0].shadowWidth &&
            !!child.parts[0].outlineWidth,
        child
            ? `border=${child.parts[0].borderWidth} shadow=${child.parts[0].shadowWidth} outline=${child.parts[0].outlineWidth}`
            : ""
    );

    /*
     * Clipping: LVGL clips a parent's children to the PARENT'S OWN BOX (lv_refr.c intersects the
     * parent layer with obj->coords unless the object has LV_OBJ_FLAG_OVERFLOW_VISIBLE), so the dump
     * only has to say whether the object clips at all — the box is the area it already emits.
     */
    check(
        "an object with children reports that it clips them",
        !!root && root.clipChildren === true,
        root ? `clipChildren=${root.clipChildren}` : "none"
    );
    check(
        "an object with no children reports no clip",
        !child || child.clipChildren === undefined,
        child ? `clipChildren=${child.clipChildren}` : "none"
    );

    // Image geometry (new): an image with no source must NOT invent a size.
    const imageObject = json.objects.find(o => o.ptr === imgPtr);
    check(
        "an image object with no source emits no image geometry",
        !imgPtr || (imageObject && imageObject.imgW === undefined && imageObject.imgH === undefined),
        imgPtr ? JSON.stringify({ imgW: imageObject && imageObject.imgW, imgH: imageObject && imageObject.imgH }) : "no image object"
    );
    check(
        "only known part slots are emitted (0..7, no TICKS)",
        root && root.parts.every(p => [0, 1, 2, 3, 4, 5, 6, 7].includes(p.p)),
        root ? `slots=${root.parts.map(p => p.p).join(",")}` : ""
    );
    check(
        "text style is emitted with the part",
        root && root.parts[0].textColor !== undefined && root.parts[0].fontSize !== undefined,
        root ? `textColor=0x${(root.parts[0].textColor ?? 0).toString(16)} fontSize=${root.parts[0].fontSize}` : ""
    );

    // Persist the real dump as a regression fixture. A captured wire payload is a stronger contract
    // test than a hand-written one, because only the C side can produce it. `test/vitest/__tests__/
    // lvgl-svg-captured.test.ts` then feeds it through the TS renderer chain.
    const fixturePath = path.resolve(
        "test/vitest/fixtures/lvgl-svg/captured-9.5.0.json"
    );
    writeFileSync(fixturePath, text + "\n", "utf8");
    check(
        "captured the dump as a fixture",
        existsSync(fixturePath),
        `${path.basename(fixturePath)} (${text.length} bytes)`
    );
} catch (error) {
    check("harness completed", false, String(error && error.message ? error.message : error));
}

const failed = checks.filter(c => !c.ok);
console.log(
    `\n${checks.length - failed.length}/${checks.length} checks passed`
);
process.exit(failed.length === 0 ? 0 : 1);
