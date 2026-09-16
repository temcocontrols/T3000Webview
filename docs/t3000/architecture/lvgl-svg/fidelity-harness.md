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
| `pixelDiffPct` / `differing` / `compared` | pixels where any channel differs by > `TOL`, and the counts behind the percentage | with `edgePx` it forms the pixel budget (§4c item 6) |
| `maxChannelDelta` | max per-channel difference | catches isolated but severe errors |
| `inkDiffPct` / `referenceInk` / `candidateInk` | share of ink with no counterpart in the other raster within 2 px, luminance cut 110 | the first metric for every row: it separates "drawn a little heavier" from "missing/moved" |
| `edgePx` | ink pixels with a non-ink neighbour | the rasterisation allowance: two rasterisers disagree on a boundary |
| `boxOffsetPx` | how far the SVG node's ink sticks **out** of the dump `area`, clamped to the node's clip | the box rule (T1): placement, not size |
| `bboxIoU` | per-object intersection-over-union of the dump `area` vs the SVG node `getBBox()` | reported severity only — it never decides a verdict (§4c item 2) |
| `nodeCount`, `patchMs` | DOM size and patch cost | performance gate (from `?svgStats=1`) |

`bboxIoU` is the reason the scene dump carries exact `area` values: it makes failures **localisable**
without eyeballing images — but localisation is all it is good for, because the two rectangles it
compares are not the same thing (see §4c item 2).

## 4. Thresholds

| Tier | Widgets (see [primitives doc](./primitives.md)) | Pass |
|---|---|---|
| T1 (style-only, 31 widgets) | label, panel, button, slider, switch, bar, arc, image, … | ink ≤ 25% (≥ 32 ink px), pixels ≤ `max(0.5% × area, 1 × ink boundary)`, ink overhang ≤ 3 px |
| T2 (animated/layered, or carrying text/bitmap) | spinner, animation image, scale, meter, any text | ink ≤ 25% (≥ 32 ink px), pixels ≤ `max(2% × area, 1 × ink boundary)`, no box rule |
| T3 (procedural) | chart, qrcode, colorwheel, lottie, canvas | excluded from the surface, so not measured |
| — | a region with no comparable pixels | `unmeasured`: neither a pass nor a failure |

Rows that LVGL does not paint (hidden sub-screens) are not rows at all: `hiddenSubtree()` decides that
for the renderer and the harness alike, and the harness reports the number it skipped.

Known, accepted deltas are **recorded, not hidden**: font hinting/anti-aliasing, shadow blur, blend modes,
dithering, background tiling.

### 4a. Revision after the first real page sweep (2026-09-15)

The tier is now assigned from **what a row is**, never from the size of its diff — a tier granted
because a diff is large is how a scorecard stops meaning anything. The enforced column here is the
*tier split*; the numbers themselves were revised twice more (§4c is current):

| Tier | Assigned when | Enforced |
|---|---|---|
| T1 | any part is pure vector style (bg, border, arc, line) | the strict pixel budget, plus the box rule |
| T2 | any part carries text or a bitmap | the looser pixel budget, **no box rule** |
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
  `rows[0].source` names the page asked for. (Superseded in §4c item 7: the harness now re-measures
  itself and records `settled`, and the page re-measures the newest scene rather than waiting for
  another *paint* — a static page is painted once and then never again.)

Known open question, deliberately not decided by tuning: **tolerance vs radius**. With the default
tolerance of 8 a correct label still reads 12–26% *with* a 1 px radius; at 30 the same row reads 1.6%
(ink boxes agree within a pixel: canvas `x=193 y=264 94×14` against SVG `x=193 y=264 93×14`). A T2
budget of 2% therefore has no meaning until the tolerance it was measured at is stated. Either raise
the tolerance for T2 (the tier that exists *because* LVGL rasterises the content itself) or raise the
radius — and record the choice here with this data.

**Resolved in §4c**, and not by tuning: the ink mask decides rasterised content (so the per-channel
number stops having to separate "heavier" from "missing"), the tolerance is 30 for T1 and T2 alike, and
the pixel budget is taken on counts with an allowance proportional to the ink boundary.

### 4c. Revision after the third sweep (2026-09-15, last) — the gate now answers the right questions

Four fixes, each from a measurement. The first one is the largest: it halved the number of rows and
removed most of the failures.

1. **Objects LVGL does not paint are not measured.** The dump walks the whole object tree, hidden
   sub-screens included, so a page carries up to twice the objects it shows (`parameters`: 543 objects
   of which **438 hidden**; `time`: 48 of which 21; `home_screen`: 56 of which 31). A hidden object has
   no SVG node *by design*, so those rows compared a box against pixels that belong to the visible
   page — `time`'s `panel/MAIN 15.04%` and `button/MAIN 19.52%`, with no node and therefore no box
   either. Cross-checked against the runtime: `lv_obj_is_visible` reports **27 of 48 objects visible
   and the renderer emitted a node for exactly those 27 and no other**, so the predicate is exact.
   `hiddenSubtree()` in `scene.ts` is now the single rule both the renderer and the harness use, and
   the harness reports the number it skipped as a warning (`describeSkippedObjects`).
2. **The box rule is an overhang test, not an IoU.** Every row that failed *only* on `bboxIoU ≥ 0.99`
   had a pixel diff of 0.00–0.22% inside its own box, because the two rectangles are legitimately
   different: a panel's border is drawn *inside* its box (`15,0 450x40` vs `16,2 448x37`, IoU 0.921),
   a text run cannot fill a line box (`98,78 194x16` vs `98,77.4 189.3x16.8`, IoU 0.930), and a
   container is not filled by its children (`0,0 480x320` vs the children's union, IoU 0.613).
   `boxOffsetPx` (how far the node's ink sticks **out**, `BOX_SLACK_PX = 2`) catches what a
   misplacement actually looks like; `bboxIoU` stays on the row as reported severity.
3. **T1 is compared at tolerance 30, like T2.** Every T1 shape with a curved edge is anti-aliased by
   the browser and rasterised hard by LVGL, so a soft 9–30 ring differs along its boundary — measured
   with the exclusions in place: `wifi_config` switch 50x25 96 px differing 7.68% → **0.00%**;
   `time` button 100x30 2.20% → **0.19%**; `schedule_screen` panel 460x30 6.65% → **0.00%**;
   `parameters` panel 480x280 0.91% → 0.00%. Substance survives: `home_screen` checkbox 220x20
   (glyphs) 31.45% → 27.80%, arc 210x210 (band geometry) 7.42% → 3.92%. The **budget** is unchanged
   (0.5%), so nothing about geometry, colour or placement became acceptable — only anti-aliasing
   stopped being charged as infidelity.
4. **Rasterised content is judged on an ink mask** (`compareInk`), and the tolerance-vs-radius
   question above is **resolved by the metric rather than by tuning**: a per-channel comparison cannot
   separate "the glyph is here, drawn a little heavier" from "the glyph is missing". Measured on
   `start_up_screen`'s "Initialising . . .": a correct row reads **17.7%** at a 1 px ink radius and
   **6.35%** at 2 px, while the same row with its SVG node removed reads **100%** either way. The
   harness therefore compares ink at a 2 px radius and the ink budget is `inkDiffPct ≤ 25%` — a 4×
   margin for correct text, and it still fails anything missing, moved or duplicated.
   `TIER_TOLERANCE.T1 = TIER_TOLERANCE.T2 = 30` for the per-channel number that remains as severity.
5. **The ink mask decides every row, and needs enough ink to mean anything.** T1 needs it as much as
   T2 does, for the mirror-image reason: ink the renderer draws where LVGL draws none. Measured on
   `schedule_screen`, six buttons read **0.30% of pixels** — under any per-channel budget — while their
   ink masks disagreed on **100%**. But below `MIN_INK_PX = 32` the metric measures the luminance
   threshold rather than ink: with one or two ink pixels, a single pixel crossing `INK_THRESHOLD` reads
   as 100%. Measured across the thirteen pages, every failing row under that floor held 1–22 ink pixels
   (`panel inkPx=6 px=14/13919`, `button inkPx=1 px=2/657`, `textarea inkPx=2 px=2/774`) while every row
   where the metric did real work held 300–1248. Those small rows are judged on pixels, which is the
   stricter metric at that size (a missing 3x3 knob = 9 px of a 1000 px box = 0.9% against 0.5%).
6. **The pixel budget is taken on counts, with an allowance proportional to the ink boundary.**
   `allowed = max(budget% × comparedPx, edgeAllowancePx × edgePx)` with `edgeAllowancePx = 1` and
   `edgePx` = ink-boundary pixels (`countInkEdges`). A budget that is a fraction of the *area* cannot
   describe a stroke: measured, a correct 2 px gauge ring over radius 104 has **675 differing pixels**
   (1.53% of a 210×210 box — over any area-proportional budget) with an ink boundary of **723**, every
   differing pixel on one of the ring's two edges, and ink masks that agree to **0.0%**. One pixel of
   allowance per boundary pixel is the geometric statement "two rasterisers disagree on the boundary";
   the area term still applies to a filled shape.
7. **A row with nothing comparable is `unmeasured`, not a pass.** The root screen's region is entirely
   covered by its children's exclusion boxes, so it has no comparable pixels; the verdict type now
   carries that as its own state and the summary counts it separately, so the denominator stays honest.
8. **`settled` is earned by re-measuring, not by waiting for another paint.** The flag means "the runtime's
   tree still matches the scene the SVG was built from **and** the same scene has now been measured
   twice". Both halves are needed: a single paint can be complete and still early (measured on
   `home_screen`, the first paint after a switch held 4 objects at 11.59%, against 25 objects at 4.99%),
   and the previous "was this the same as the last paint?" test never converged on a static page — the
   app repaints only when something changes, so the first paint was compared against the paint before it
   (a different page) and no third paint ever arrived. The page now loops: measure the newest scene, and
   if the verdict is unsettled wait 300 ms and measure again, up to 6 rounds. Measured after the change:
   every page reports `settled: true` with its full row count and its true whole-surface delta.

9. **The harness must not touch LVGL from inside a paint.** The pipeline calls back into JavaScript from
   *inside* the runtime's paint call (the canvas context is a JS proxy), so everything the harness did
   synchronously ran with a live wasm frame underneath it — and `measureScene` invalidates the screen and
   calls `lv_refr_now`, i.e. it rendered from inside a render. Measured while dragging a widget with
   `?svgDiff=1`: `Aborted(native code called abort())`, followed by "the LVGL scene dump returned an
   unusable payload" and a blank surface. The same drag with the harness off was clean
   (`diagnose: "ok"`, no notice). `runHarness` now yields one event-loop turn
   (`await new Promise(r => setTimeout(r, 0))`) before touching LVGL, which puts it after the frame:
   re-measured, the drag leaves `diagnose: "ok"`, no notice, and a settled scorecard.

10. **A button matrix and a calendar stopped being "procedural" — they are rendered and measured.** Both
   were on the `PROCEDURAL_WIDGET_TYPES` exclusion list, which was honest while their content was invisible:
   a calendar's day grid IS a button matrix (`lv_calendar` holds `calendar->btnm`), and its cells are drawn
   by the widget from a map it builds at run time. The dump now emits them (`svgEmitButtonMatrix()`) and the
   renderer draws them, so both are gated like any other widget. Measured on `holiday_calender_screen`:
   the calendar's row compares 2624 px of its own ring with **0 differing**, the day grid's row (the inner
   button matrix, 4800 px of ink union) differs on 139 px, and the page reports **no failing rows** where it
   previously excluded the whole widget. The page's whole-surface number stayed high (~66%, mean channel
   delta 8) before and after: that is NOT the calendar — the calendar's card is translucent (`bgOpa` 100/255)
   and the surface paints no page background at all (`Scene.bgColor` is undefined, see the ledger), so a
   whole-display tone difference shows through it. Same-page, same-change: the rows pass, the whole-surface
   delta keeps its known cause.

Also fixed in this round, in the renderer rather than the gate: **SVG collapses whitespace**, which
silently undid LVGL's way of aligning a label inside its box (`"Gateway              :"` came out
78.3 px wide instead of 130; the IP editor's separator run `"    .    .    "` 17.09 px instead of 209,
IoU 0.081, ink 100%). `<text>` now carries `xml:space="preserve"` and `white-space: pre`, because a
space is drawing geometry: LVGL advances the pen by a real space width.

The console summary names the metric a failure was taken on (`decidingMetric`), because printing
`pixelDiffPct` for every failure is misleading once three other numbers can decide it.

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

| Widget | Part | Source | tol | pixelDiffPct | diffPx | allowPx | edgePx | ink% | inkPx | maxΔ | bboxIoU | box+ | Verdict | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| slider | INDICATOR | indicators | 30 | 0.12% | 21/19600 | 98 | 98 | n/a | n/a | 9 | 1.000 | 0px | pass | |
| label | MAIN | home_screen | 30 | 4.65% | 377/1620 | 377 | 782 | 10.6 | 782 | 190 | 0.880 | 1.0px | fail | |
| chart | MAIN | dashboard | 8 | 14.80% | n/a | n/a | n/a | n/a | n/a | 190 | n/a | n/a | excluded | D2 |

Every column is there because a verdict cannot be checked without it: `tol` (a budget is meaningless
without it), the counts the allowance was taken on, `edgePx` (the boundary term), `ink%`/`inkPx` (the
first metric, and whether it had enough ink to decide), `box+` (the overhang) and `bboxIoU` as reported
severity.


## 6a. Live sweep result (2026-09-15)

Per page, on the dev server, read from a settled scorecard. The `rows`/`excluded`/`not visible` columns
and the worst rows are measured with item 1 of §4c in place; the `fails` column is that same read, i.e.
**before** the box rule and the T1 tolerance of items 2–3, which is what the per-row numbers below the
table say about those rows.

| Page | whole | rows | pass | fail | excluded (T3/D2) | unmeasured | not visible | remaining failures |
|---|---|---|---|---|---|---|---|---|
| start_up_screen | 0.93% | 4 | 2 | **0** | 0 | 2 | 0 | — |
| home_screen | 4.99% | 25 | 11 | 4 | 6 | 4 | 31 | label 377/1620 px, textarea 186/2800 px, button 8 px (maxΔ 129, ink 100%) |
| main_menu | 5.69% | 29 | 24 | 1 | 0 | 4 | 0 | label ink 74% of 636 px |
| network_config | 3.78% | 45 | 27 | 3 | 13 | 2 | 1 | 3 IP-separator labels, 84 px each (space advance) |
| parameters | 5.77% | 105 | 78 | **0** | 1 | 26 | 438 | — |
| protocols | 4.63% | 23 | 17 | **0** | 4 | 2 | 4 | — |
| schedule_edit_screen | 11.67% | 151 | 73 | 1 | 57 | 20 | 13 | table panel 262/28440 px |
| schedule_screen | 7.72% | 67 | 64 | **0** | 1 | 2 | 1 | — |
| time | 6.84% | 27 | 25 | **0** | 0 | 2 | 21 | — |
| wifi_config | 2.35% | 18 | 14 | **0** | 2 | 2 | 5 | — |
| holiday_calender_screen | 78.98% | 12 | 3 | **0** | 7 | 2 | 0 | — (the whole-surface number is the D2 calendar, not a gate) |
| wireguard_screen | 3.08% | 21 | 16 | **0** | 3 | 2 | 0 | — |
| ddns_screen | 2.95% | 12 | 10 | **0** | 0 | 2 | 0 | — |

Eleven of thirteen pages have no failing row at all, and the nine rows that do fail are traceable to a
named cause rather than to an aggregate:

| Row | Measurement | Why it is a real failure |
|---|---|---|
| `home_screen` label | 377 of 1620 px, ink 10.6% of 782 px | a text row whose ink is in the right place but whose coverage differs far beyond the boundary allowance — the largest single contributor to that page's 4.99% |
| `home_screen` textarea | 186 of 2800 px, ink 14.1% | same class, thicker: an unresolved text/geometry delta |
| `home_screen` button | 8 of 1329 px, maxΔ 129, **ink 100% of 3 px** | the renderer paints something bright where the canvas paints nothing; the ink floor keeps the mask from deciding it, and the pixel budget flags it |
| `main_menu` label | ink **74%** of 636 px | a text run whose ink largely has no counterpart: displaced or missing glyphs |
| 3 × `network_config` label | 84 of 3344 px each, maxΔ 255 | the IP separator run: LVGL advances a space by an integer pixel count from its own font data, the browser by the TTF's fractional advance, so 15 spaces drift 1-2 px and the dots land off |
| `schedule_edit_screen` panel | 262 of 28440 px, ink 0% of 472 px | the schedule table's own chrome, 0.9% of a 480x220 box |

Row counts fell by roughly half against the second sweep (`parameters` 543 → 105, `time` 48 → 27) purely
by not measuring hidden objects, and the failure counts of the worst pages went to zero with the rules of
§4c: `schedule_screen` 43 → 0, `network_config` 12 → 3, `parameters` 331 → 0, `schedule_edit_screen`
31 → 1. The per-class measurements behind that are in §4c items 1–7, each with the row that motivated it.

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

