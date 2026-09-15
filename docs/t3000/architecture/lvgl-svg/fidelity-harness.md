# LVGL SVG Renderer — Fidelity Harness

How the SVG surface is compared against the canvas surface: the method, the metrics, the thresholds, the
scorecard format, and the measured results.

Part of the [document set](./README.md). The metrics (`svg-diff.ts`) are pure and unit-tested; only the
capture of the two surfaces (`svg-diff-harness.ts`) needs a browser.

---

## 1. Goal

Prove, per widget and per part, that the SVG surface matches the canvas surface — and keep an automated,
repeatable answer for "did this change break anything?" The canvas path is the **oracle** because it is the
LVGL WASM output itself.

## 2. Method

```
same page, two surfaces
  ┌─ reference: existing canvas runtime → <canvas> (hidden, same w/h) → getImageData()
  └─ candidate: live <svg> → serialise → Image → offscreen <canvas> → getImageData()
                      │
                      └─ compare → metrics + diff image + per-object/part scorecard
```

Both surfaces are driven by the **same project page** in the same session, so LVGL layout is identical by
construction; only the SVG translation is under test.

## 3. Metrics

| Metric | Definition | Use |
|---|---|---|
| `pixelDiffPct` | % pixels where any channel differs by > `TOL` (default 8) | primary pass/fail |
| `maxChannelDelta` | max per-channel difference | catches isolated but severe errors |
| `bboxIoU` | per-object intersection-over-union of the dump `area` vs the SVG node `getBBox()` | catches layout/transform errors even when colours are close |
| `perPartPct` | `pixelDiffPct` restricted to a part's bounding box | locates the failing part (border vs text vs indicator) |
| `nodeCount`, `patchMs` | DOM size and patch cost | performance gate (from `?svgStats=1`) |

`bboxIoU` is the reason the scene dump carries exact `area` values: it makes failures **localisable**
without eyeballing images.

## 4. Thresholds

| Tier | Widgets (see [primitives doc](./primitives.md)) | Pass |
|---|---|---|
| T1 (style-only, 31 widgets) | label, panel, button, slider, switch, bar, arc, image, … | `pixelDiffPct ≤ 0.5%` and `bboxIoU ≥ 0.99` |
| T2 (animated/layered) | spinner, animation image, scale, meter | `pixelDiffPct ≤ 2%`; AA/phase differences documented |
| T3 (procedural) | chart, qrcode, colorwheel, lottie, canvas | excluded from the surface, so not measured |

Known, accepted deltas are **recorded, not hidden**: font hinting/anti-aliasing, shadow blur, blend modes,
dithering, background tiling.

### 4a. Revision after the first real page sweep (2026-09-15)

The tier is now assigned from **what a row is**, never from the size of its diff — a tier granted
because a diff is large is how a scorecard stops meaning anything:

| Tier | Assigned when | Enforced |
|---|---|---|
| T1 | any part is pure vector style (bg, border, arc, line) | 0.5% and IoU 0.99 |
| T2 | any part carries text or a bitmap | 2%, **IoU not enforced**, compared with a **1 px match radius** |
| T3 | the widget is in `PROCEDURAL_WIDGET_TYPES` (`buttonmatrix`, `calendar`, `chart`, `qrcode`, `colorwheel`, `lottie`, `canvas`, `table`, `scale`) | excluded (decision D2), with the reason in the row's `note` |

Two measurements forced this:

- **The box cannot be gated on rasterised content.** The SVG node's box is the *ink* (`getBBox()` of
  a `<text>`) while the LVGL area is the *layout* box, so correct text rows measure 0.92–0.94 IoU —
  0.95 failed every correct label. A 5–10 px misplacement still drops below 0.9, and a wrong string
  fails on pixels long before that.
- **An exact pixel comparison cannot judge glyphs.** LVGL paints a glyph from its own hinted bitmap,
  the browser from an outline, so a stroke lands half a pixel over: correct 14–18 px labels differ on
  25–74% of their pixels exactly. A 1 px match radius (candidate ink accepted when the reference holds
  matching ink within one pixel, clamped to the row's region) brings those to 15–30% while a missing
  or displaced string still fails. `maxChannelDelta`/`meanChannelDelta` stay exact, so severity is
  never softened.

### 4b. Revision after the second sweep (2026-09-15, later)

Three more rules, each from a measurement that showed a **false failure** — a row failing for pixels
that belong to something else:

1. **T3 is inherited.** A procedural widget's children are ordinary `object`s drawn from its private
   state (a calendar's day cells), so a descendant of a T3 row is T3 itself (`insideProcedural`).
   Without it one out-of-scope calendar produced ~10 failures on `holiday_calender_screen`.
2. **A row is measured on its own pixels.** A container's box contains everything its children draw,
   so measuring a container over its whole box reports its children's deltas again — once per
   ancestor. The row carries `exclude` (its descendants' boxes, filled in by the page from the flat
   scene) and `diffImages` skips those pixels for both the comparison *and* the match-radius
   neighbourhood, so a container can neither absorb nor re-report its child's ink. Measured effect:
   `holiday_calender_screen`'s panel reported 79% while the only wrong thing inside it was the
   (excluded) calendar.
3. **A row that draws nothing is not a row.** An object whose parts all come back empty draws nothing
   of its own — its box is covered by the widget that owns it (measured: a textarea's internal label,
   `object<textarea`, sits inside the textarea that paints the placeholder). Such a row is recorded as
   T3 with a note (`drawsNothing`, decided by `partHasDrawing()` on the merged Scene, not by the DOM)
   instead of failing on its owner's pixels.

And two measurement bugs in the harness itself:

- **The candidate raster was filled white.** The app's pages are dark, so every transparent pixel of
  every row differed by a full 255 channels and each percentage was inflated (whole-surface
  `schedule_screen` read 8.02% against 5.04% for the same frame). The raster is now filled with the
  reference's own backdrop colour (`backdropOf()` reads the reference's top-left pixel). This is
  right where the page is uniform and still approximate where a panel of another colour covers a
  row's box; the proper fix is for the surface to paint the page background it does not currently
  draw at all (`Scene.bgColor` is `undefined` — the dump emits no scene-level colour).
- **The scorecard often holds a transitional frame.** The harness runs on *every* paint, so reading
  `__lvglSvgScorecard` right after a page switch can catch a 4-row, 65%-different frame. A trustworthy
  read polls until `rows.length`, `rows[0].source` and `whole.pixelDiffPct` stop changing and
  `rows[0].source` names the page asked for.

Known open question, deliberately not decided by tuning: **tolerance vs radius**. With the default
tolerance of 8 a correct label still reads 12–26% *with* a 1 px radius; at 30 the same row reads 1.6%
(ink boxes agree within a pixel: canvas `x=193 y=264 94×14` against SVG `x=193 y=264 93×14`). A T2
budget of 2% therefore has no meaning until the tolerance it was measured at is stated. Either raise
the tolerance for T2 (the tier that exists *because* LVGL rasterises the content itself) or raise the
radius — and record the choice here with this data.

## 5. Fixtures

New, additive, under a dev fixtures folder:

| Fixture | Covers |
|---|---|
| `text.json` | fonts, sizes, letter/line spacing, alignment, overflow, decor |
| `boxes.json` | radius, border sides, outline, shadow, gradients, opacity |
| `indicators.json` | slider/switch/checkbox/bar/arc across default/pressed/checked states |
| `media.json` | images at scale/rotation/recolour/opacity |
| `dashboard.json` | 20+ nested objects, mixed parts — the realistic stress case |
| `kitchen-sink.json` | every T1 widget in every declared part — note `LVGLStylesEditorRuntime` (`page-runtime.ts:1777-1869`) already builds exactly this: a synthetic page holding every registered widget, a ready-made source for the fixture |

The first five double as the hand-written inputs for `svg-renderer.ts` unit tests (no WASM needed — see
[scene contract](./scene-contract.md)).

## 6. Scorecard output

A markdown table printed to the console **and** downloadable from the dev panel:

| Widget | Part | Fixture | pixelDiffPct | maxΔ | bboxIoU | Verdict | Note |
|---|---|---|---|---|---|---|---|
| slider | INDICATOR | indicators | 0.12% | 9 | 1.000 | pass | |
| slider | KNOB | indicators | 0.41% | 12 | 0.997 | pass | AA edge |
| chart | MAIN | dashboard | 14.8% | 190 | 0.981 | excluded | procedural draw |

This table is the gate artefact and the record of accepted deltas.

## 7. Invocation

| Mode | How |
|---|---|
| Single page | `?svgDiff=1` — the harness runs after each paint and publishes its result on `globalThis.__lvglSvgScorecard` |
| `=all` form | `?svgDiff=all` is recognised for iterating fixtures |
| Perf | `?svgStats=1` — dump ms, patch ms, node count per change |
| CI | not used: jsdom has no WASM or canvas. A runner would load the app (e.g. Playwright) and call the same harness |

## 8. Why this is trustworthy

- Reference and candidate come from the **same LVGL run** — no re-layout, no second layout engine.
- Both layout and style come from LVGL (dump), so a failure is by definition a **translation** bug in the
  SVG layer, i.e. fixable in new code only.
- Failures are localised to widget+part, so regressions can be triaged without reading images.

## 9. Harness requirements

- Reference pixels come from the same LVGL run that produced the SVG (no second runtime, no re-layout).
- The comparison is reproducible from a frozen fixture where one exists, and from a dev run otherwise.
- Per-row results are localised to a widget and a part, so a regression can be triaged without reading an
  image.
- T3 widgets are reported as `excluded` rather than failed.
- Warming up the surface must not change the scorecard: rerunning after editor actions yields the same
  numbers for an unchanged page.
- Known, accepted deltas are recorded in the scorecard note column rather than suppressed.

## 10. Measured result: background discrepancy (unresolved)

`?svgDiff=1` on an imported T3-LB controller project, page `start_up_screen`, surface 480×320:

| Widget | Part | Source | pixelDiffPct | maxΔ | bboxIoU | Verdict |
|---|---|---|---|---|---|---|
| screen | MAIN | start_up_screen | 85.63% | 255 | 1.000 | fail |
| panel | MAIN | start_up_screen | 85.63% | 255 | 1.000 | fail |
| label | MAIN | start_up_screen | 95.09% | 255 | 0.834 | fail |
| label | MAIN | start_up_screen | 97.27% | 255 | 0.900 | fail |

Whole surface: 85.63% of pixels differ, mean channel delta 26.5, max 255.

Geometrically the two surfaces agree — `bboxIoU` is 1.000 for the screen and panel, and 0.83–0.90 for the
labels, which is the expected text-metric difference. The pixel failure is dominated by a single
condition: **the SVG paints a screen background where the LVGL framebuffer is black.**

Measurements:

| Measurement | Value |
|---|---|
| Reference (mirrored framebuffer) average colour | `3,3,3,255` — near black, fully opaque |
| SVG average colour | `36,36,36,255` |
| Screen background painted by the SVG | `#272727` (`39,39,39`) |
| Reference pixels brighter than 10/255 | 5084 of 153600 (3.3%) |
| Real canvas, same measurement | 5084 of 153600, identical samples — the reference is faithful |
| C emitter (`svg_scene_dump.cpp:120`) | `svgWColorIf` drops a colour when `opa == 0`, so a fully transparent paint emits neither `bgColor` nor `bgOpa` |

A background is therefore painted by exactly one of the two surfaces. The possible causes are opposites:

1. **The SVG paints a background LVGL does not.** The screen's `bgOpa` resolves non-zero in the dump while
   LVGL draws nothing (a transparent screen over the display's black clear colour).
2. **The canvas renders without its theme.** The LVGL styles are correct (`#272727`) but the framebuffer is
   cleared black, in which case the dump is right and the canvas is wrong.

Discriminating test: read the screen's `MAIN` part from `dumper.dump(rootPtr)` and check whether
`bgColor`/`bgOpa` are present, then repeat on a light-theme page — a black canvas there also indicates
case 2.

Until this is resolved, the per-widget percentages above are dominated by this one difference and do not
measure widget-level fidelity. This is the intended reading of the `bboxIoU` column: the boxes agree and
the pixels do not, so the fault is in a fill or a binding rather than in layout.

## 11. Capture details

- The reference comes from the *same* LVGL run: the proxy context normally discards the `ImageData` it is
  handed; with the harness enabled it mirrors that frame into an offscreen canvas. No second runtime and no
  second layout pass is involved.
- A serialised SVG cannot load external images, so `serializeSvg` records that as a warning instead of
  silently comparing against empty pixels.
- The surface is rasterised with an explicit size and a white backdrop: a detached clone has no layout, and
  transparent areas would otherwise compare against an unset canvas.
- Per-object rows restrict the pixel comparison to that object's `area`, which is what localises a failure
  to a widget and a part.

