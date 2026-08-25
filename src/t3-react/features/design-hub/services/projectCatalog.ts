/**
 * Project Catalog — unified loader for the Design Hub dashboard.
 *
 * Each drawing engine persists projects DIFFERENTLY, so each is a "source"
 * behind a common interface:
 *
 *   - EEZ / LVGL : saved by the Rust backend under `<data_root>/project/<name>/`
 *                  (listed via `GET /api/eez-studio/projects`).
 *   - HVAC       : primary = localStorage (`t3-hvac-drawings`, UNCHANGED);
 *                  a disk mirror under `<T3Web>/t3-hvac/<id>/<id>.json` is
 *                  written on save (best-effort via `/api/design-hub`), and
 *                  listing from it is gated behind `HVAC_LIST_FROM_DISK`.
 *   - Simulator  : no real project storage yet → excluded.
 *
 * The dashboard's "recent / project history" is driven by `loadRealProjects()`,
 * i.e. the REAL created projects on disk (not fake seeds).
 */

import type { HubProject } from '../types';
import { getDrawingType } from '../drawingTypes';

export interface EezProjectEntry {
  folder: string;
  name: string;
  file_path: string;
  lvgl_version: string | null;
  size: number;
  modified: number;
}

export interface HvacDrawingEntry {
  id: string;
  name: string;
  updated_at: number;
  size: number;
}

const EEZ_PROJECTS_URL = '/api/eez-studio/projects';
const HVAC_DRAWINGS_URL = '/api/design-hub/hvac-drawings';

/**
 * When true, the HVAC project list is read from the disk folder
 * (`<T3Web>/t3-hvac/<id>/<id>.json`). For now (folder untested) the dashboard
 * lists HVAC from localStorage; flip this once the disk path is verified.
 */
const HVAC_LIST_FROM_DISK = false;

function iso(secs: number): string {
  const ms = secs > 0 ? secs * 1000 : Date.now();
  return new Date(ms).toISOString();
}

function eezToHubProject(e: EezProjectEntry): HubProject {
  const type = getDrawingType('lvgl-9-5');
  return {
    id: `eez:${e.folder}`,
    name: e.name,
    description: e.lvgl_version
      ? `LVGL ${e.lvgl_version} project`
      : 'EEZ Studio project',
    typeId: 'lvgl-9-5',
    engine: type.engine,
    createdAt: iso(e.modified),
    updatedAt: iso(e.modified),
    status: 'local',
    source: 'eez',
    openPath: `/t3000/eez?open=${encodeURIComponent(e.file_path)}`,
  };
}

function hvacDiskToHubProject(d: HvacDrawingEntry): HubProject {
  const type = getDrawingType('hvac-schematic');
  return {
    id: d.id,
    name: d.name || d.id,
    typeId: 'hvac-schematic',
    engine: type.engine,
    createdAt: iso(d.updated_at),
    updatedAt: iso(d.updated_at),
    status: 'local',
    source: 'hvac',
    openPath: `/t3000/hvac-designer/${encodeURIComponent(d.id)}`,
  };
}

async function fetchEezProjects(): Promise<HubProject[]> {
  const r = await fetch(EEZ_PROJECTS_URL);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  const list: EezProjectEntry[] = data?.projects ?? [];
  return list.map(eezToHubProject);
}

async function fetchHvacDiskDrawings(): Promise<HubProject[]> {
  const r = await fetch(HVAC_DRAWINGS_URL);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  const list: HvacDrawingEntry[] = data?.drawings ?? [];
  return list.map(hvacDiskToHubProject);
}

/** Persist an HVAC drawing to disk (best-effort mirror of localStorage). */
export async function saveHvacDrawingToDisk(
  id: string,
  drawing: unknown
): Promise<boolean> {
  try {
    const r = await fetch(`${HVAC_DRAWINGS_URL}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: typeof drawing === 'string' ? drawing : JSON.stringify(drawing),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Delete an HVAC drawing folder on disk (best-effort). */
export async function deleteHvacDrawingOnDisk(id: string): Promise<boolean> {
  try {
    const r = await fetch(`${HVAC_DRAWINGS_URL}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Delete a real EEZ project folder on disk. */
export async function deleteEezProjectOnDisk(folder: string): Promise<boolean> {
  try {
    const r = await fetch(
      `/api/eez-studio/delete-recursive?path=${encodeURIComponent(
        'project/' + folder
      )}&force=true`,
      { method: 'DELETE' }
    );
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Load the REAL created project list across engines.
 * - EEZ/LVGL: from disk via the backend.
 * - HVAC: from localStorage (`t3-hvac-drawings`) FOR NOW — the proven source.
 *   The disk mirror (`<T3Web>/t3-hvac/<id>/<id>.json`) is still written on save,
 *   but we only start LISTING from it once it's tested: flip `HVAC_LIST_FROM_DISK`.
 * - Simulator: excluded (no real storage yet).
 */
export async function loadRealProjects(
  localHvac: HubProject[] = []
): Promise<HubProject[]> {
  // EEZ/LVGL — real on-disk projects.
  const eez = await fetchEezProjects().catch(() => [] as HubProject[]);

  // HVAC — localStorage for now; disk folder once tested (see flag above).
  let hvac: HubProject[];
  if (HVAC_LIST_FROM_DISK) {
    const hvacDisk = await fetchHvacDiskDrawings().catch(() => [] as HubProject[]);
    const byId = new Map<string, HubProject>();
    for (const p of localHvac) {
      if (p.source === 'hvac') byId.set(p.id, p);
    }
    for (const p of hvacDisk) {
      byId.set(p.id, p);
    }
    hvac = [...byId.values()];
  } else {
    hvac = localHvac.filter((p) => p.source === 'hvac');
  }

  const all = [...eez, ...hvac];
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
