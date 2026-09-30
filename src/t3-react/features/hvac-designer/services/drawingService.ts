/**
 * Drawing Service
 * Handles saving and loading drawings.
 *
 * Primary: Uses the t3-hvac library's built-in DataOpt (localStorage) for persistence.
 * The library stores app state via DataOpt.SaveAppStateV2() / LoadAppStateV2().
 * We supplement with a localStorage index for drawing metadata.
 *
 * Future: REST API when backend is implemented.
 */

import { Drawing, DrawingMetadata, ExportOptions, ImportOptions } from '../types/drawing.types';
import { Shape } from '../types/shape.types';
import { Layer } from '../types/drawing.types';
import Hvac from '@/lib/t3-hvac';
import DataOpt from '@/lib/t3-hvac/Opt/Data/DataOpt';
import { AreaIds } from '@/lib/t3-hvac/Data/Constant/AreaIds';

const LOCAL_STORAGE_KEY = 't3-hvac-drawings';

/* ── the engine's document ──
 *
 * The canvas belongs to the engine, so a drawing's content is the engine's document, not the React
 * store's shape list. These three calls are the whole bridge:
 *   capture → the record follows every engine save
 *   seed    → the engine restores the record's document on its next initialise
 *   clear   → "new drawing" starts from an empty canvas instead of the previous document
 * All three are best-effort: a drawing must still open when the engine is not loaded yet.
 */

export function captureCurrentDocument(): unknown | undefined {
  try {
    return (DataOpt as any)?.CaptureDocument?.() ?? undefined;
  } catch {
    return undefined;
  }
}

export function seedDrawingDocument(payload: unknown): boolean {
  try {
    return payload ? (DataOpt as any)?.SeedDocument?.(payload) === true : false;
  } catch {
    return false;
  }
}

export function clearDrawingDocument(): void {
  try {
    (DataOpt as any)?.ClearDocument?.();
  } catch {
    /* best effort */
  }
}

/** Attaches the engine's current document to a record about to be written. */
function withCurrentDocument(drawing: Drawing): Drawing {
  const document = captureCurrentDocument();
  return document ? { ...drawing, document } : drawing;
}

/* ── synchronous preparation ──
 *
 * The engine restores its document while it initialises, so the record's document has to be in the engine's
 * own storage *before* that — and the engine must never wait on the network to start (a hanging request used
 * to leave `T3Gv.opt` undefined for as long as it hung, and the tool palette threw on every click). Hence:
 * a **synchronous** read of the local index is what prepares the engine, and the async `loadDrawing` only
 * feeds the React store / caches a disk-only record for the next time.
 */

/** The record as this browser has it right now, or `null` when it is not stored locally. */
export function peekLocalDrawing(id: string): Drawing | null {
  try {
    return getLocalDrawings()[id] ?? null;
  } catch {
    return null;
  }
}

/** Whether this browser already holds the record (i.e. no fetch is needed to know its document). */
export function hasLocalDrawing(id: string): boolean {
  return peekLocalDrawing(id) !== null;
}

/**
 * What the running document stands for — i.e. how far the engine's document can be trusted.
 *
 * | value | meaning | mirror |
 * |---|---|---|
 * | `record` | seeded from the drawing's record — the canvas *is* that drawing | on |
 * | `fresh` | the record was looked for and does not exist — a new drawing under a known id | on |
 * | `unknown` | the record could not be read — the canvas is **not** known to be the stored drawing | **off** |
 * | `empty` | no id at all — there is nothing to save it as | **off** |
 *
 * `fresh` cannot be decided here: only the asynchronous lookup can tell "the store has no such drawing" (a
 * 404, so creating it is safe) from "the store could not be reached" (never overwrite what we could not
 * read). The caller therefore starts from `unknown` and upgrades it when its lookup answered *missing*.
 */
export type EngineDocumentSource = 'record' | 'fresh' | 'unknown' | 'empty';

/** Why a record lookup did not produce a drawing. */
export type RecordFailureReason = 'missing' | 'unavailable';

/**
 * A record lookup that did not produce a drawing.
 *
 * `reason` is the distinction a caller has to act on — see `EngineDocumentSource`.
 */
export class DrawingRecordError extends Error {
  readonly code = 'T3_DRAWING_RECORD';

  constructor(readonly id: string, readonly reason: RecordFailureReason, detail?: string) {
    super(
      reason === 'missing'
        ? `Drawing not found: ${id}`
        : `Drawing record unavailable: ${id}${detail ? ` (${detail})` : ''}`
    );
    this.name = 'DrawingRecordError';
  }
}

/** The `reason` of a record failure, or `null` for any other error. */
export function recordFailureReason(error: unknown): RecordFailureReason | null {
  if (error instanceof DrawingRecordError) {
    return error.reason;
  }

  /*
   * Tolerate a second instance of this module (Vite dev serves the edited copy as `?t=…`, so `instanceof`
   * does not hold across the two) — the code/reason pair is the stable signal.
   */
  const candidate = error as { code?: unknown; reason?: unknown } | undefined;
  const reason = candidate?.reason;
  return candidate?.code === 'T3_DRAWING_RECORD' && (reason === 'missing' || reason === 'unavailable')
    ? reason
    : null;
}

/**
 * Puts the right document in the engine's storage for `id`, synchronously. Called immediately before the
 * engine initialises.
 *
 * A record that has no `document` (written before this existed, or an empty new drawing) **clears** the
 * engine's storage: "no document" means an empty canvas, never the previous drawing that happens to still
 * be in this browser.
 *
 * Returns three of the four `EngineDocumentSource` values; `fresh` is the caller's to decide, because it
 * needs the answer of the asynchronous record lookup — see that type.
 */
export function prepareEngineDocument(id: string | undefined): EngineDocumentSource {
  if (!id) {
    // No identity at all: there is nothing this document could be saved as, so it must not inherit the
    // previous drawing either.
    clearDrawingDocument();
    return 'empty';
  }

  const record = peekLocalDrawing(id);
  if (!record) {
    // Not readable here: start clean rather than show whatever the engine still holds, and report it so the
    // caller does not mirror this (empty) canvas back over the stored drawing.
    clearDrawingDocument();
    return 'unknown';
  }

  const document = (record as { document?: unknown }).document;
  if (document) {
    seedDrawingDocument(document);
    return 'record';
  }

  clearDrawingDocument();
  return 'empty';
}

/**
 * How long a record request may take before the caller stops waiting for it.
 *
 * A local service that is down (or answered through the system proxy) does not fail fast — it hangs. The
 * 502 the proxy returns is a valid response, but a *stalled* connection is not, so the request needs a
 * deadline of its own rather than leaving `isSaving`/`isLoading` true forever.
 */
const RECORD_FETCH_TIMEOUT_MS = 4000;

async function fetchWithTimeout(input: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), RECORD_FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

// ── localStorage helpers ──

function getLocalDrawings(): Record<string, Drawing> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalDrawings(drawings: Record<string, Drawing>): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(drawings));
}

// ── Disk persistence (best-effort, kept local to this service) ──────────────
// Mirrors each drawing to `<T3Web>/t3-hvac/<id>/<id>.json` so the folder can
// later be the source for the Design Hub list. localStorage stays the source of
// truth; these fail silently when the backend isn't available.

async function saveDrawingToDisk(id: string, drawing: unknown): Promise<void> {
  try {
    await fetchWithTimeout(`/api/design-hub/hvac-drawings/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: typeof drawing === 'string' ? drawing : JSON.stringify(drawing),
    });
  } catch { /* backend unavailable — localStorage remains primary */ }
}

async function deleteDrawingFromDisk(id: string): Promise<void> {
  try {
    await fetchWithTimeout(`/api/design-hub/hvac-drawings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch { /* backend unavailable — localStorage remains primary */ }
}

/**
 * Save a drawing.
 * Writes to both the library's appStateV2 persistence and our local index.
 */
export async function saveDrawing(drawing: Drawing): Promise<{ success: boolean; id: string }> {
  // Persist via library
  try { Hvac.IdxPage?.save?.(); } catch { /* library save may not be bound */ }

  const drawings = getLocalDrawings();
  const id = drawing.id || `drawing-${Date.now()}`;
  drawings[id] = withCurrentDocument({ ...drawing, id, updatedAt: new Date().toISOString() });
  saveLocalDrawings(drawings);

  // Best-effort disk mirror under <T3Web>/t3-hvac/<id>/<id>.json.
  // localStorage stays primary.
  await saveDrawingToDisk(id, drawings[id]);

  return { success: true, id };
}

/**
 * Save an existing drawing — an **explicit** save (band Save, `Ctrl+S`, the properties panel).
 *
 * Upserts: the drawing's identity comes from the route (`hvacDocumentId.ts`), so the first explicit save of a
 * drawing created from the Hub has nowhere else to land. The automatic path does not use this function — the
 * engine's saves are mirrored by `recordDocument`, which is the one that knows the running document is this
 * drawing.
 */
export async function updateDrawing(id: string, drawing: Partial<Drawing>): Promise<{ success: boolean }> {
  const drawings = getLocalDrawings();
  drawings[id] = withCurrentDocument({
    ...(drawings[id] ?? createEmptyRecord(id)),
    ...drawing,
    id,
    updatedAt: new Date().toISOString(),
  });
  saveLocalDrawings(drawings);
  // Best-effort disk mirror.
  await saveDrawingToDisk(id, drawings[id]);
  return { success: true };
}

/**
 * A record for a drawing this browser has never stored.
 *
 * `shapes`/`layers` are the React store's lists and *are* read back when a drawing is opened
 * (`useDrawing.loadDrawing` → `store.loadDrawing`), so they are `[]` rather than absent: the engine's document
 * is the content, and `undefined` here would break the store's own reads.
 */
function createEmptyRecord(id: string): Drawing {
  const now = new Date().toISOString();
  return {
    id,
    name: 'Untitled Drawing',
    width: 0,
    height: 0,
    backgroundColor: '#ffffff',
    shapes: [],
    layers: [],
    symbols: [],
    createdAt: now,
    updatedAt: now,
    version: 1,
  } as Drawing;
}

/**
 * Writes the engine's document into a drawing's record, **creating** the record on the drawing's first save.
 *
 * Called only by the designer's mirror (`documents/hvac/HvacDocument.persistOpenDocument`), the one place that
 * knows the running document *is* that drawing. `updateDrawing` above keeps its different job (an explicit
 * save); this is the other half of the pair — the Hub's *Create & Open* opens a drawing that does not exist
 * yet, so its first autosave has to create the record or the work is lost on reload.
 *
 * The record's `name`/`serialNumber` come from the route the drawing was opened with, so it shows up in the
 * Hub's list under the name and device the user picked.
 */
export function recordDocument(
  id: string,
  document: unknown,
  options?: { name?: string; serialNumber?: number }
): void {
  try {
    const drawings = getLocalDrawings();
    const existing = drawings[id];
    const record: Drawing = {
      ...(existing ?? createEmptyRecord(id)),
      id,
      // An existing name wins: the user may have renamed the drawing since it was created.
      name: existing?.name && existing.name !== 'Untitled Drawing' ? existing.name : options?.name || existing?.name || id,
      document,
      updatedAt: new Date().toISOString(),
    } as Drawing;

    if (options?.serialNumber !== undefined) {
      record.serialNumber = options.serialNumber;
    }

    drawings[id] = record;
    saveLocalDrawings(drawings);

    // Best-effort disk mirror — the same one an explicit save writes.
    void saveDrawingToDisk(id, record);
  } catch {
    /* the mirror must never break the editor */
  }
}

/**
 * Load a drawing by ID.
 */
export async function loadDrawing(id: string): Promise<Drawing> {
  const drawings = getLocalDrawings();
  if (drawings[id]) return drawings[id];

  // Try disk (backend) — the drawing may exist on disk but not in this browser.
  let answer: Response | undefined;
  try {
    answer = await fetchWithTimeout(`/api/design-hub/hvac-drawings/${encodeURIComponent(id)}`);
    if (answer.ok) {
      const drawing = (await answer.json()) as Drawing;
      /*
       * Cache it in the local index: that index is what `updateDrawing` writes back to, so a record that
       * existed only on disk could otherwise never be saved from this browser.
       */
      drawings[id] = drawing;
      saveLocalDrawings(drawings);
      return drawing;
    }
  } catch { /* no answer — reported as `unavailable` below */ }

  /*
   * Only a 404 says "there is no such drawing". Anything else (a 5xx, a dead proxy, a stalled request) means
   * the store could not answer, and the caller must not treat a canvas it invented as the stored drawing.
   */
  if (answer?.status === 404) {
    throw new DrawingRecordError(id, 'missing');
  }

  throw new DrawingRecordError(id, 'unavailable', answer ? `HTTP ${answer.status}` : 'no response');
}

/**
 * Delete a drawing.
 */
export async function deleteDrawing(id: string): Promise<{ success: boolean }> {
  const drawings = getLocalDrawings();
  delete drawings[id];
  saveLocalDrawings(drawings);
  // Best-effort disk delete.
  await deleteDrawingFromDisk(id);
  return { success: true };
}

/**
 * List all drawings (for picker/browser).
 */
export async function listDrawings(): Promise<DrawingMetadata[]> {
  const drawings = getLocalDrawings();
  return Object.values(drawings).map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    version: d.version,
  }));
}

/**
 * List drawings for a specific graphic.
 */
export async function listDrawingsByGraphic(graphicId: string): Promise<DrawingMetadata[]> {
  const all = await listDrawings();
  return all.filter((d: any) => d.graphicId === graphicId);
}

/**
 * Export drawing to a specific format.
 */
export async function exportDrawing(
  drawing: Drawing,
  options: ExportOptions
): Promise<Blob | string> {
  switch (options.format) {
    case 'json':
      return JSON.stringify(drawing, null, 2);
    case 'svg': {
      const svgEl = document.querySelector(`${AreaIds.selector('svgArea')} svg`);
      return svgEl?.outerHTML || `<svg xmlns="http://www.w3.org/2000/svg"></svg>`;
    }
    default:
      throw new Error(`Export format not yet supported: ${options.format}`);
  }
}

/**
 * Import drawing from a file.
 */
export async function importDrawing(
  file: File,
  _options: ImportOptions
): Promise<{ shapes: Shape[]; layers: Layer[] }> {
  const text = await file.text();
  const data = JSON.parse(text);
  return {
    shapes: data.shapes || [],
    layers: data.layers || [],
  };
}

/**
 * Create a thumbnail from a drawing.
 */
export async function createThumbnail(
  drawing: Drawing,
  maxWidth = 200,
  maxHeight = 150
): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const scale = Math.min(maxWidth / drawing.width, maxHeight / drawing.height);
  canvas.width = drawing.width * scale;
  canvas.height = drawing.height * scale;

  ctx.fillStyle = drawing.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // TODO: Render svg.js shapes into canvas for thumbnail

  return canvas.toDataURL('image/png', 0.8);
}
