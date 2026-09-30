# P3 — HVAC host mode: the container comes from the shell

Goal: the HVAC engine takes **all five containers from the shell** instead of four hard-coded ids, with no
behaviour change. Prerequisite: P1 (the shell exists). Independent of P2.

Files: [`../change-map.md`](../change-map.md) §P3.

---

## 1. Why this is a bounded job

The seam already exists and is already parameterised:

```ts
// lib/t3-hvac/Doc/DocUtil.ts:51-57 (the intended contract)
new DocUtil().InitializeWorkArea({
    workAreaId, svgAreaId, hRulerAreaId, vRulerAreaId, cRulerAreaId
});
```

…but the only production caller passes **one** of the five:

```ts
// lib/t3-hvac/Opt/UI/UIUtil.ts:374-376
const workAreaConfig = { svgAreaId: T3Gv.opt.svgDocId, documentWidth: width,
                         documentHeight: height, documentDPI: 100 };
T3Gv.docUtil.InitializeWorkArea(workAreaConfig, isReInitialize);
```

so `workAreaId`, `hRulerAreaId`, `vRulerAreaId`, `cRulerAreaId` always fall back to their defaults
(`DocUtil.ts:190-194`), and `#svg-area` itself comes from a literal at `OptUtil.ts:394`. Everything else is
**14 read sites** that bypass the config entirely.

## 2. Design

### 2.1 Config plumbing

```ts
// lib/t3-hvac/Opt/Opt/OptUtil.ts
public svgDocId: string;                       // :97 — keep the field (15+ call sites read it)

// :394 — replace the literal with an injected value, default unchanged
this.svgDocId = areaIds?.svgArea ?? '#svg-area';
```

`areaIds` arrives through the existing init chain (`T3Opt.Initialize` → `OptUtil.Initialize` → `UIUtil.InitSvgDocument`),
i.e. one optional parameter threaded through three existing signatures. Defaults = today's literals, so
**every existing caller keeps working unchanged**.

```ts
// lib/t3-hvac/Opt/UI/UIUtil.ts:374-376
const workAreaConfig = {
    svgAreaId:    T3Gv.opt.svgDocId,
    workAreaId:   T3Gv.opt.workAreaId,          // NEW — defaults to '#document-area'
    hRulerAreaId: T3Gv.opt.hRulerAreaId,        // NEW — '#h-ruler'
    vRulerAreaId: T3Gv.opt.vRulerAreaId,        // NEW — '#v-ruler'
    cRulerAreaId: T3Gv.opt.cRulerAreaId,        // NEW — '#c-ruler'
    documentWidth: width, documentHeight: height, documentDPI: 100
};
```

### 2.2 Accessors instead of literals

Add to `DocUtil` (additive, ~15 lines) so the 14 sites have one obvious replacement:

```ts
/** '#svg-area' style selector, ready for $() / querySelector(). */
areaSelector(area: "work" | "svg" | "hRuler" | "vRuler" | "cRuler"): string
/** The element, or null. */
areaElement(area: ...): HTMLElement | null
```

Both the shell and the engine can then use them; nothing else in the engine changes.

> Note on selector shape: `InitializeWorkArea` validates with `document.querySelector(this.svgAreaId)` and
> **throws** if it is falsy (`DocUtil.ts:197-205`), and `B.Document`'s constructor prepends `#` only for
> strings that start with neither `#` nor `.` (`Basic/B.Document.ts:104-106`). So the shell must pass **`#`-prefixed
> selectors**, and the adapter must render the canvas **before** `mount()` runs (P1's `canvasHostRef` already
> guarantees this).

### 2.3 The 14 sites

| File | Line | Today | Becomes |
|---|---|---|---|
| `Event/EvtUtil.ts` | 63 | `$('#svg-area').off('.t3000-evt')` | `$(T3Gv.docUtil.svgAreaId).off('.t3000-evt')` |
| | 104 | `document.getElementById('svg-area')` | `T3Gv.docUtil.areaElement('svg')` |
| | 264 | `const svgArea = $('#svg-area')` | `$(T3Gv.docUtil.svgAreaId)` |
| | 306 | `const svgArea = $('#svg-area')` (+ `:307 .offset()`) | same |
| | 1051 | `const svgArea = $('#svg-area')` | same |
| | 1188 | `const svgArea = $('#svg-area')` | same |
| `Event/EvtOpt.ts` | 1161 | `$("#document-area").on('pointerdown', …)` | `$(T3Gv.docUtil.workAreaId).on(…)` |
| `Opt/Opt/OptUtil.ts` | 394 | `this.svgDocId = '#svg-area'` | injected (§2.1) |
| `Opt/Opt/TextUtil.ts` | 1081 | `new Hammer(document.getElementById('svg-area'))` | `new Hammer(T3Gv.docUtil.areaElement('svg')!)` |
| `Opt/UI/UIUtil.ts` | 401 | `document.getElementById('main-app')` | keep (not an engine container) or parameterise — **decision: keep**, it is only used as a Hammer host |
| | 402-403 | `getElementById('svg-area' / 'document-area')` | `docUtil.areaElement('svg' / 'work')` |
| `Util/T3Hammer.ts` | 523 | `document.getElementById('svg-area')` | `T3Gv.docUtil.areaElement('svg')` |
| `Opt/Common/IdxPage.ts` | 311-312 | `querySelector('.v-ruler' / '.h-ruler')` | `$(T3Gv.docUtil.vRulerAreaId)` / `hRulerAreaId` |

Unchanged on purpose: `Doc/T3Opt.ts:159-162` (commented out), `Page/P.Main.ts:7-17` (dead code — no caller
in `src/`), `IdxUtils.ts:32-34` and `AppRuntime.ts` (Vue Moveable/Selecto DOM, not the React path),
`T3Clipboard.ts` (document-level clipboard proxies).

### 2.4 The shell side

`documents/hvac/HvacDocument.tsx` generates per-mount ids:

```ts
const uid = useMemo(() => `d${++docCounter}`, [documentId]);
const ids = { svgArea: `#svg-area-${uid}`, workArea: `#document-area-${uid}`,
              hRuler: `#h-ruler-${uid}`, vRuler: `#v-ruler-${uid}`, cRuler: `#c-ruler-${uid}` };
```

and `HvacCanvas.tsx` renders those ids. Benefits: two documents can never collide, and P1's comparator
(old ids vs new ids) becomes an explicit signal.

`handleResize` → `T3Gv.docUtil.HandleResizeEvent()` (already 100 ms-debounced, `DocUtil.ts:659-674`).

## 3. Verification

1. The comparator passes with the **new** ids.
2. `grep -rn "getElementById('svg-area')\|getElementById(\"svg-area\")\|$('#svg-area')\|#document-area" src/lib/t3-hvac`
   → only `DocUtil.ts` defaults and `OptUtil.ts`'s default.
3. Zoom, pan, rulers, grid, snap, tool strip, save/load, undo/redo — verified as in P1.
4. Collapsing the left panel re-lays out the drawing (now via the container, not the id).
5. Open the legacy page `/t3000/hvac-designer/<id>` (which passes **no** ids) → still works, proving the
   defaults are intact.

## 4. Risks

| Risk | Mitigation |
|---|---|
| `InitializeWorkArea` **throws** when the selector does not resolve (`DocUtil.ts:197-205`) | the adapter asserts the canvas elements exist before `mount()`; ids are per-mount so a stale id cannot resolve to the wrong element |
| jQuery objects cached across a re-init | `$(...)` is re-evaluated at each use; the 6 `EvtUtil` sites are inside functions, not module scope — verified |
| `Hammer` instances bound to the old element | `UIUtil.InitT3GvOpt` already disposes the previous Hammers (`:406-414`); with per-mount elements make sure the dispose path still runs |
| Two documents in one page (not a goal) | per-mount ids make it *possible*, but `T3Gv` is a singleton — do not attempt it (D4) |

## 5. Acceptance criteria


- All five containers come from configuration; defaults unchanged.
- The grep gate in §3.2 is clean.
- Old page and new page both work. — *after P4 both URLs land on the same document, re-checked in this pass (settled undo ring, drawing rendering, 7 objects)*
- Geometry comparison identical to P1's build.
