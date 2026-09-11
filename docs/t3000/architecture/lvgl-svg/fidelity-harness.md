# LVGL SVG Renderer — Fidelity Harness Design

Part of the [design set](./README.md). Status: **design, no code yet**.
Additive-only: new `svg/svg-diff.ts` + new fixtures; no existing test or component is modified.

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
| T3 (procedural) | chart, qrcode, colorwheel, lottie, canvas | excluded until decision D2 |

Known, accepted deltas are **recorded, not hidden**: font hinting/anti-aliasing, shadow blur, blend modes,
dithering, background tiling.

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
| chart | MAIN | dashboard | 14.8% | 190 | 0.981 | excluded | D2 |

This table is the P5 gate artefact and the living record of known deltas.

## 7. Invocation

| Mode | How |
|---|---|
| Dev, single page | `?svg=1&svgDiff=1` → harness runs after the first paint and on demand |
| Dev, all fixtures | `?svg=1&svgDiff=all` → iterate fixtures, emit the full scorecard |
| Dev, perf | `?svg=1&svgStats=1` → dump ms, patch ms, node count per change |
| CI | **not** initially: jsdom has no WASM/canvas. Optional later phase: a Playwright runner that loads the app and calls the same harness (additive, no app changes) |

## 8. Why this is trustworthy

- Reference and candidate come from the **same LVGL run** — no re-layout, no second layout engine.
- Both layout and style come from LVGL (dump), so a failure is by definition a **translation** bug in the
  SVG layer, i.e. fixable in new code only.
- Failures are localised to widget+part, so regressions can be triaged without reading images.

## 9. Harness acceptance (P5)

- [ ] All T1 widgets pass on all five fixtures
- [ ] T2 deltas measured and listed with a note
- [ ] T3 widgets listed as excluded, pending D2
- [ ] Scorecard committed as the fidelity record for the branch
- [ ] Re-running the harness after ≥ 10 editor actions leaves the scorecard unchanged (no state leaks)
