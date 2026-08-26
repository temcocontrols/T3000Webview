/**
 * Design Hub Service
 * Unified metadata layer for the hub.
 *
 * Phase 1 (this layer) is localStorage-first:
 *   - reads HVAC drawings from the HVAC designer's existing localStorage index
 *   - keeps hub-managed state (activity, recent, libraries, non-HVAC projects)
 *   - EEZ / Simulator projects are tracked here as launcher + hub entries
 *
 * Phase 4 upgrades this to the Rust `/api` backend + T3 User Library API for
 * cloud/team sharing.
 */

import type {
  ActivityItem,
  ActivityKind,
  DeployLogEntry,
  HubFolder,
  HubProject,
  LibraryItem,
  ProjectStats,
  RevisionSnapshot,
} from '../types';
import { getDrawingType } from '../drawingTypes';

const HUB_KEY = 't3-design-hub';
const HVAC_DRAWINGS_KEY = 't3-hvac-drawings';

interface HubMeta {
  activity: ActivityItem[];
  recentProjectIds: string[];
  libraries: LibraryItem[];
  projects: HubProject[];
  favorites: string[];
  folders: HubFolder[];
  projectFolders: Record<string, string>;
  snapshots: Record<string, RevisionSnapshot[]>;
  deployLogs: Record<string, DeployLogEntry[]>;
}

const EMPTY: HubMeta = {
  activity: [],
  recentProjectIds: [],
  libraries: [],
  projects: [],
  favorites: [],
  folders: [],
  projectFolders: {},
  snapshots: {},
  deployLogs: {},
};

function readHub(): HubMeta {
  try {
    const raw = localStorage.getItem(HUB_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...EMPTY, ...parsed };
  } catch {
    return { ...EMPTY, libraries: [...EMPTY.libraries] };
  }
}

function writeHub(meta: HubMeta): void {
  try {
    localStorage.setItem(HUB_KEY, JSON.stringify(meta));
  } catch {
    /* storage unavailable */
  }
}

/** Read drawings persisted by the HVAC designer (localStorage index). */
function readHvacDrawings(): HubProject[] {
  try {
    const raw = localStorage.getItem(HVAC_DRAWINGS_KEY);
    if (!raw) return [];
    const map = JSON.parse(raw) as Record<string, any>;
    return Object.values(map).map((d) => {
      const typeId =
        d.typeId && getDrawingType(d.typeId) ? d.typeId : 'hvac-schematic';
      const type = getDrawingType(typeId);
      const hasSerial = Number(d.serialNumber) > 0;
      return {
        id: String(d.id ?? `hvac-${Date.now()}`),
        name: d.name || 'Untitled Drawing',
        description: d.description || undefined,
        typeId,
        engine: type.engine,
        serialNumber: hasSerial ? Number(d.serialNumber) : undefined,
        building: d.building || undefined,
        floor: d.floor || undefined,
        room: d.room || undefined,
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString(),
        status: hasSerial ? 'bound' : 'local',
        boundPoints: d.boundPoints ?? undefined,
        source: 'hvac',
        openPath: `/t3000/hvac-designer/${d.id}`,
      };
    });
  } catch {
    return [];
  }
}

const DEFAULT_LIBRARIES: LibraryItem[] = [
  {
    id: 'lib-hvac-symbols',
    name: 'HVAC Symbols',
    description: 'Ducts, dampers, valves, sensors and AHU equipment parts',
    kind: 'symbols',
    count: 48,
    source: 'local',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lib-pipes-ducts',
    name: 'Pipes & Ducts',
    description: 'Pipe runs, elbows, reducers and duct fittings',
    kind: 'part',
    count: 32,
    source: 'local',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lib-thermostat-icons',
    name: 'Thermostat Icons',
    description: 'LCD icons for thermostat screens (cool, heat, fan, schedule)',
    kind: 'symbols',
    count: 24,
    source: 'local',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lib-templates',
    name: 'Drawing Templates',
    description: 'Reusable starter canvases: schematic, floor plan, panel',
    kind: 'template',
    count: 6,
    source: 'local',
    updatedAt: new Date().toISOString(),
  },
];

export const designHubService = {
  /** All projects across engines, newest first. */
  listProjects(): HubProject[] {
    const hub = readHub();
    const hvac = readHvacDrawings();
    return [...hvac, ...hub.projects].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  },

  /** Recently opened projects (ordered by last-open).
   *  Pass the REAL catalog list (projectCatalog.loadRealProjects) so recent
   *  entries resolve against actual on-disk projects, not the hub seeds. */
  listRecentProjects(all?: HubProject[], limit = 8): HubProject[] {
    const hub = readHub();
    const src = all ?? this.listProjects();
    const byId = new Map(src.map((p) => [p.id, p]));
    const recent: HubProject[] = [];
    for (const id of hub.recentProjectIds) {
      const p = byId.get(id);
      if (p) recent.push(p);
      if (recent.length >= limit) break;
    }
    return recent;
  },

  /** Shared libraries (symbols / templates / parts). */
  listLibraries(): LibraryItem[] {
    const hub = readHub();
    if (hub.libraries.length === 0) {
      const meta = { ...hub, libraries: DEFAULT_LIBRARIES };
      writeHub(meta);
      return DEFAULT_LIBRARIES;
    }
    return hub.libraries;
  },

  addLibrary(lib: Omit<LibraryItem, 'id' | 'updatedAt'>): LibraryItem {
    const hub = readHub();
    const item: LibraryItem = {
      ...lib,
      id: `lib-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    writeHub({ ...hub, libraries: [item, ...hub.libraries] });
    return item;
  },

  /** Activity log (newest first). */
  listActivity(limit = 20): ActivityItem[] {
    return readHub().activity.slice(0, limit);
  },

  recordActivity(
    kind: ActivityKind,
    label: string,
    opts?: { detail?: string; typeId?: string; projectId?: string }
  ): void {
    const hub = readHub();
    const item: ActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind,
      label,
      detail: opts?.detail,
      typeId: opts?.typeId,
      projectId: opts?.projectId,
      timestamp: new Date().toISOString(),
    };
    writeHub({ ...hub, activity: [item, ...hub.activity].slice(0, 100) });
  },

  /** Deploy logs for a project (newest first). */
  listDeployLogs(projectId: string): DeployLogEntry[] {
    return readHub().deployLogs[projectId] ?? [];
  },

  /** Append a deploy log entry (newest first, capped at 20 per project). */
  recordDeployLog(projectId: string, entry: DeployLogEntry): void {
    const hub = readHub();
    const logs = [entry, ...(hub.deployLogs[projectId] ?? [])].slice(0, 20);
    writeHub({ ...hub, deployLogs: { ...hub.deployLogs, [projectId]: logs } });
  },

  /** Clear all deploy logs for a project. */
  clearDeployLogs(projectId: string): void {
    const hub = readHub();
    const deployLogs = { ...hub.deployLogs };
    delete deployLogs[projectId];
    writeHub({ ...hub, deployLogs });
  },

  /**
   * Read the EEZ on-disk deploy manifest (`project/<folder>/device-config/
   * deploy-manifest.json`) written by the EEZ editor's "Deploy to Device".
   * Returns the screen/image detail, or null when not present.
   */
  async fetchDeployManifest(folder: string): Promise<{
    screenCount?: number;
    imageCount?: number;
    screens?: string[];
    images?: { name: string; width: number; height: number; color_format?: number }[];
  } | null> {
    try {
      const host = window.location.hostname || 'localhost';
      const path = `project/${folder}/device-config/deploy-manifest.json`;
      const resp = await fetch(
        `http://${host}:9103/api/eez-studio/read-text-file?path=${encodeURIComponent(path)}`
      );
      if (!resp.ok) return null;
      const m = JSON.parse(await resp.text());
      if (!m || typeof m !== 'object') return null;
      return {
        screenCount: Number(m.screenCount) || undefined,
        imageCount: Number(m.imageCount) || undefined,
        screens: Array.isArray(m.screens) ? (m.screens as string[]) : undefined,
        images: Array.isArray(m.images) ? (m.images as any[]) : undefined,
      };
    } catch {
      return null;
    }
  },

  /** Record that a project was opened (also feeds "recent"). */
  recordOpen(projectId: string, label: string, typeId?: string): void {
    const hub = readHub();
    const recentProjectIds = [
      projectId,
      ...hub.recentProjectIds.filter((id) => id !== projectId),
    ].slice(0, 20);
    const item: ActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: 'opened',
      label: `Opened "${label}"`,
      typeId,
      projectId,
      timestamp: new Date().toISOString(),
    };
    writeHub({
      ...hub,
      recentProjectIds,
      activity: [item, ...hub.activity].slice(0, 100),
    });
  },

  /** Track a hub-managed (non-HVAC-localStorage) project. */
  upsertProject(project: HubProject): void {
    const hub = readHub();
    const idx = hub.projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      const projects = [...hub.projects];
      projects[idx] = { ...projects[idx], ...project, updatedAt: new Date().toISOString() };
      writeHub({ ...hub, projects });
    } else {
      writeHub({
        ...hub,
        projects: [{ ...project, updatedAt: new Date().toISOString() }, ...hub.projects],
      });
    }
  },

  /** Update the device binding (serial/building/floor/room) on a project. */
  saveProjectBinding(
    projectId: string,
    binding: { serialNumber?: number; building?: string; floor?: string; room?: string }
  ): HubProject | null {
    const hub = readHub();
    // Update hub-managed project (EEZ/simulator/hub entries)
    const hubIdx = hub.projects.findIndex((p) => p.id === projectId);
    let updated: HubProject | null = null;
    if (hubIdx >= 0) {
      const projects = [...hub.projects];
      projects[hubIdx] = {
        ...projects[hubIdx],
        ...binding,
        status: binding.serialNumber ? 'bound' : projects[hubIdx].status,
        updatedAt: new Date().toISOString(),
      };
      updated = projects[hubIdx];
      writeHub({ ...hub, projects });
    }
    // Update HVAC drawing in its own localStorage index
    try {
      const raw = localStorage.getItem(HVAC_DRAWINGS_KEY);
      if (raw) {
        const map = JSON.parse(raw);
        if (map[projectId]) {
          map[projectId] = {
            ...map[projectId],
            serialNumber: binding.serialNumber,
            building: binding.building,
            floor: binding.floor,
            room: binding.room,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(HVAC_DRAWINGS_KEY, JSON.stringify(map));
          if (!updated) {
            const typeId =
              map[projectId].typeId && getDrawingType(map[projectId].typeId)
                ? map[projectId].typeId
                : 'hvac-schematic';
            updated = {
              id: projectId,
              name: map[projectId].name || 'Untitled Drawing',
              typeId,
              engine: getDrawingType(typeId).engine,
              serialNumber: binding.serialNumber,
              building: binding.building,
              floor: binding.floor,
              room: binding.room,
              createdAt: map[projectId].createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              status: binding.serialNumber ? 'bound' : 'local',
              source: 'hvac',
              openPath: `/t3000/hvac-designer/${projectId}`,
            };
          }
        }
      }
    } catch {
      /* ignore */
    }
    this.recordActivity('edited', 'Updated device binding', {
      detail: binding.serialNumber ? `Bound to SN ${binding.serialNumber}` : 'Unbound',
      projectId,
    });
    return updated;
  },

  /** Share / unshare a project (Phase 4 — cloud sync when backend available). */
  shareProject(projectId: string, shared: boolean): void {
    const hub = readHub();
    const projects = hub.projects.map((p) =>
      p.id === projectId
        ? { ...p, status: shared ? ('synced' as const) : ('local' as const), updatedAt: new Date().toISOString() }
        : p
    );
    writeHub({ ...hub, projects });
    // Also reflect on HVAC drawings that carry a hub record (best-effort).
    this.recordActivity(shared ? 'shared' : 'edited', shared ? `Shared "${projectId}"` : `Unshared "${projectId}"`, {
      projectId,
    });
  },

  /** Mark a project as deployed to its bound device (status: deployed). */
  markDeployed(projectId: string): void {
    const hub = readHub();
    const projects = hub.projects.map((p) =>
      p.id === projectId
        ? { ...p, status: 'deployed' as const, updatedAt: new Date().toISOString() }
        : p
    );
    writeHub({ ...hub, projects });
    this.recordActivity('deployed', 'Deployed to device', { projectId });
  },

  /** Mark a library as cloud-synced (Phase 4). */
  syncLibraryToCloud(libraryId: string): LibraryItem | null {
    const hub = readHub();
    const idx = hub.libraries.findIndex((l) => l.id === libraryId);
    if (idx < 0) return null;
    const libraries = [...hub.libraries];
    libraries[idx] = {
      ...libraries[idx],
      source: 'cloud',
      updatedAt: new Date().toISOString(),
    };
    writeHub({ ...hub, libraries });
    this.recordActivity('shared', `Synced library "${libraries[idx].name}" to cloud`, {
      detail: 'T3 User Library API',
    });
    return libraries[idx];
  },

  /**
   * Bulk-sync hub metadata to the backend. Phase 4:
   * posts to /api/design-hub/projects + /libraries. Falls back to local-only
   * when the API is unavailable (reports backends availability).
   */
  async syncToBackend(): Promise<{ backend: boolean; projects: number; libraries: number }> {
    const hub = readHub();
    const payload = {
      projects: [...readHvacDrawings(), ...hub.projects],
      libraries: hub.libraries,
      activity: hub.activity.slice(0, 100),
    };
    try {
      const r = await fetch('/api/design-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return { backend: true, projects: payload.projects.length, libraries: payload.libraries.length };
    } catch {
      // Backend not available — keep local-first
      return { backend: false, projects: payload.projects.length, libraries: payload.libraries.length };
    }
  },

  /**
   * Import a drawing file (JSON or SVG/Inkscape) into a new HVAC drawing.
   * Returns the new drawing id + open path so the caller can navigate.
   */
  async importFile(
    file: File
  ): Promise<{ drawingId: string; openPath: string; name: string }> {
    const text = await file.text();
    const name = file.name.replace(/\.[^.]+$/, '') || 'Imported Drawing';
    const now = new Date().toISOString();

    if (file.name.toLowerCase().endsWith('.svg')) {
      const drawing: any = {
        id: `drawing-${Date.now()}`,
        name,
        description: 'Imported from SVG (Inkscape)',
        typeId: 'hvac-schematic',
        width: 1600,
        height: 1000,
        backgroundColor: '#ffffff',
        shapes: [],
        layers: [{ id: 'l1', name: 'Layer 1', visible: true, locked: false, opacity: 1, order: 0 }],
        symbols: [],
        svgSource: text, // consumed by the HVAC editor on load
        createdAt: now,
        updatedAt: now,
        version: 1,
        gridSize: 10,
        snapToGrid: true,
        showRulers: false,
        showGrid: false,
      };
      const map = this.getHvacDrawingsRaw();
      map[drawing.id] = drawing;
      localStorage.setItem(HVAC_DRAWINGS_KEY, JSON.stringify(map));
      this.recordActivity('imported', `Imported "${name}" (SVG)`, { detail: 'Inkscape / SVG', typeId: 'hvac-schematic' });
      return { drawingId: drawing.id, openPath: `/t3000/hvac-designer/${drawing.id}`, name };
    }

    // JSON drawing
    try {
      const data = JSON.parse(text);
      const drawing: any = {
        id: `drawing-${Date.now()}`,
        name: data.name || name,
        description: data.description || 'Imported drawing (JSON)',
        typeId: data.typeId || 'hvac-schematic',
        width: data.width || 1600,
        height: data.height || 1000,
        backgroundColor: data.backgroundColor || '#ffffff',
        shapes: data.shapes || [],
        layers: data.layers || [{ id: 'l1', name: 'Layer 1', visible: true, locked: false, opacity: 1, order: 0 }],
        symbols: data.symbols || [],
        createdAt: now,
        updatedAt: now,
        version: 1,
        gridSize: data.gridSize ?? 10,
        snapToGrid: true,
        showRulers: false,
        showGrid: false,
      };
      const map = this.getHvacDrawingsRaw();
      map[drawing.id] = drawing;
      localStorage.setItem(HVAC_DRAWINGS_KEY, JSON.stringify(map));
      this.recordActivity('imported', `Imported "${drawing.name}" (JSON)`, { typeId: drawing.typeId });
      return { drawingId: drawing.id, openPath: `/t3000/hvac-designer/${drawing.id}`, name: drawing.name };
    } catch {
      throw new Error('Unsupported file format — use .json or .svg');
    }
  },

  getHvacDrawingsRaw(): Record<string, any> {
    try {
      const raw = localStorage.getItem(HVAC_DRAWINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  // ── Favorites / pinning ─────────────────────────────────────────────
  listFavorites(): string[] {
    return readHub().favorites ?? [];
  },

  toggleFavorite(projectId: string): string[] {
    const hub = readHub();
    const favorites = hub.favorites ?? [];
    const next = favorites.includes(projectId)
      ? favorites.filter((id) => id !== projectId)
      : [...favorites, projectId];
    writeHub({ ...hub, favorites: next });
    return next;
  },

  // ── Project operations ──────────────────────────────────────────────
  deleteProject(projectId: string): void {
    // Remove from HVAC drawings index
    try {
      const map = this.getHvacDrawingsRaw();
      if (map[projectId]) {
        delete map[projectId];
        localStorage.setItem(HVAC_DRAWINGS_KEY, JSON.stringify(map));
      }
    } catch { /* ignore */ }
    // Remove from hub-managed projects + favorites + recent
    const hub = readHub();
    writeHub({
      ...hub,
      projects: hub.projects.filter((p) => p.id !== projectId),
      favorites: (hub.favorites ?? []).filter((id) => id !== projectId),
      recentProjectIds: hub.recentProjectIds.filter((id) => id !== projectId),
    });
    this.recordActivity('edited', 'Deleted drawing', { projectId });
  },

  duplicateProject(projectId: string): HubProject | null {
    const raw = this.getHvacDrawingsRaw();
    const src = raw[projectId];
    if (!src) return null;
    const newId = `drawing-${Date.now()}`;
    const now = new Date().toISOString();
    raw[newId] = {
      ...src,
      id: newId,
      name: `${src.name || 'Drawing'} (copy)`,
      createdAt: now,
      updatedAt: now,
    };
    localStorage.setItem(HVAC_DRAWINGS_KEY, JSON.stringify(raw));
    this.recordActivity('created', `Duplicated "${src.name || 'Drawing'}"`, {
      detail: 'Copy',
      typeId: src.typeId || 'hvac-schematic',
      projectId: newId,
    });
    return {
      id: newId,
      name: raw[newId].name,
      typeId: src.typeId || 'hvac-schematic',
      engine: getDrawingType(src.typeId || 'hvac-schematic').engine,
      createdAt: now,
      updatedAt: now,
      status: 'local',
      source: 'hvac',
      openPath: `/t3000/hvac-designer/${newId}`,
    };
  },

  renameProject(projectId: string, name: string): void {
    try {
      const map = this.getHvacDrawingsRaw();
      if (map[projectId]) {
        map[projectId] = { ...map[projectId], name, updatedAt: new Date().toISOString() };
        localStorage.setItem(HVAC_DRAWINGS_KEY, JSON.stringify(map));
      }
    } catch { /* ignore */ }
    const hub = readHub();
    const projects = hub.projects.map((p) =>
      p.id === projectId ? { ...p, name, updatedAt: new Date().toISOString() } : p
    );
    writeHub({ ...hub, projects });
    this.recordActivity('edited', `Renamed to "${name}"`, { projectId });
  },

  createFromTemplate(template: { id: string; name: string; typeId: string; width: number; height: number; backgroundColor: string; hint?: string }): HubProject {
    const now = new Date().toISOString();
    const id = `drawing-${Date.now()}`;
    const type = getDrawingType(template.typeId);
    const drawing: any = {
      id,
      name: template.name,
      description: `Created from template "${template.name}"`,
      typeId: template.typeId,
      width: template.width,
      height: template.height,
      backgroundColor: template.backgroundColor,
      shapes: [],
      layers: [
        { id: 'l1', name: template.hint || 'Layer 1', visible: true, locked: false, opacity: 1, order: 0 },
      ],
      symbols: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      gridSize: 10,
      snapToGrid: true,
      showRulers: false,
      showGrid: false,
    };
    const map = this.getHvacDrawingsRaw();
    map[id] = drawing;
    localStorage.setItem(HVAC_DRAWINGS_KEY, JSON.stringify(map));
    this.recordActivity('created', `New "${template.name}" from template`, {
      detail: template.typeId,
      typeId: template.typeId,
      projectId: id,
    });
    return {
      id,
      name: drawing.name,
      typeId: template.typeId,
      engine: type.engine,
      createdAt: now,
      updatedAt: now,
      status: 'local',
      source: 'hvac',
      openPath: `/t3000/hvac-designer/${id}`,
    };
  },

  // ── Backup / restore ────────────────────────────────────────────────
  exportHub(): Blob {
    const payload = {
      exportedAt: new Date().toISOString(),
      hvacDrawings: this.getHvacDrawingsRaw(),
      hub: readHub(),
      customTypes: (() => {
        try {
          const raw = localStorage.getItem('t3-design-hub-custom-types');
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })(),
    };
    return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  },

  async importHub(file: File): Promise<{ projects: number; libraries: number; customTypes: number }> {
    const text = await file.text();
    const data = JSON.parse(text);
    const now = new Date().toISOString();

    if (data.hvacDrawings && typeof data.hvacDrawings === 'object') {
      // Merge — do not overwrite existing drawings with same id
      const map = this.getHvacDrawingsRaw();
      for (const [id, d] of Object.entries(data.hvacDrawings)) {
        if (!map[id]) map[id] = { ...(d as any), updatedAt: now };
      }
      localStorage.setItem(HVAC_DRAWINGS_KEY, JSON.stringify(map));
    }
    if (data.hub && typeof data.hub === 'object') {
      const prev = readHub();
      writeHub({
        ...prev,
        projects: [...prev.projects, ...(data.hub.projects ?? []).filter((p: any) => !prev.projects.some((x) => x.id === p.id))],
        libraries: [...prev.libraries, ...(data.hub.libraries ?? []).filter((l: any) => !prev.libraries.some((x) => x.id === l.id))],
        favorites: [...new Set([...prev.favorites, ...(data.hub.favorites ?? [])])],
      });
    }
    if (Array.isArray(data.customTypes)) {
      try {
        const existing = (() => {
          const raw = localStorage.getItem('t3-design-hub-custom-types');
          return raw ? JSON.parse(raw) : [];
        })();
        const known = new Set(existing.map((t: any) => t.id));
        const merged = [...existing, ...data.customTypes.filter((t: any) => !known.has(t.id))];
        localStorage.setItem('t3-design-hub-custom-types', JSON.stringify(merged));
      } catch { /* ignore */ }
    }
    this.recordActivity('imported', 'Restored Design Hub backup');
    return {
      projects: Object.keys(data.hvacDrawings ?? {}).length,
      libraries: (data.hub?.libraries ?? []).length,
      customTypes: (data.customTypes ?? []).length,
    };
  },

  // ── Folders / organization ──────────────────────────────────────────
  listFolders(): HubFolder[] {
    return readHub().folders ?? [];
  },

  getProjectFolder(projectId: string): string | null {
    return readHub().projectFolders?.[projectId] ?? null;
  },

  addFolder(name: string, color?: string): HubFolder {
    const hub = readHub();
    const folder: HubFolder = {
      id: `folder-${Date.now()}`,
      name: name.trim() || 'New Folder',
      color: color || '#0078d4',
    };
    writeHub({ ...hub, folders: [...(hub.folders ?? []), folder] });
    return folder;
  },

  renameFolder(folderId: string, name: string): void {
    const hub = readHub();
    writeHub({
      ...hub,
      folders: (hub.folders ?? []).map((f) => (f.id === folderId ? { ...f, name } : f)),
    });
  },

  deleteFolder(folderId: string): void {
    const hub = readHub();
    const projectFolders: Record<string, string> = {};
    for (const [pid, fid] of Object.entries(hub.projectFolders ?? {})) {
      if (fid !== folderId) projectFolders[pid] = fid;
    }
    writeHub({
      ...hub,
      folders: (hub.folders ?? []).filter((f) => f.id !== folderId),
      projectFolders,
    });
  },

  setProjectFolder(projectId: string, folderId: string | null): void {
    const hub = readHub();
    const projectFolders = { ...(hub.projectFolders ?? {}) };
    if (folderId) projectFolders[projectId] = folderId;
    else delete projectFolders[projectId];
    writeHub({ ...hub, projectFolders });
  },

  // ── Revision snapshots ──────────────────────────────────────────────
  listSnapshots(projectId: string): RevisionSnapshot[] {
    return readHub().snapshots?.[projectId] ?? [];
  },

  saveSnapshot(projectId: string, name?: string): RevisionSnapshot | null {
    const raw = this.getHvacDrawingsRaw()[projectId];
    if (!raw) return null;
    const hub = readHub();
    const snapshot: RevisionSnapshot = {
      id: `snap-${Date.now()}`,
      name: name || `Snapshot ${new Date().toLocaleString()}`,
      timestamp: new Date().toISOString(),
      drawing: raw,
    };
    const list = [snapshot, ...(hub.snapshots?.[projectId] ?? [])].slice(0, 50);
    writeHub({ ...hub, snapshots: { ...(hub.snapshots ?? {}), [projectId]: list } });
    return snapshot;
  },

  restoreSnapshot(projectId: string, snapshotId: string): boolean {
    const hub = readHub();
    const snap = (hub.snapshots?.[projectId] ?? []).find((s) => s.id === snapshotId);
    if (!snap) return false;
    try {
      const map = this.getHvacDrawingsRaw();
      map[projectId] = { ...snap.drawing, id: projectId, updatedAt: new Date().toISOString() };
      localStorage.setItem(HVAC_DRAWINGS_KEY, JSON.stringify(map));
      this.recordActivity('edited', `Restored snapshot "${snap.name}"`, { projectId });
      return true;
    } catch {
      return false;
    }
  },

  deleteSnapshot(projectId: string, snapshotId: string): void {
    const hub = readHub();
    const list = (hub.snapshots?.[projectId] ?? []).filter((s) => s.id !== snapshotId);
    writeHub({ ...hub, snapshots: { ...(hub.snapshots ?? {}), [projectId]: list } });
  },

  // ── Stats ───────────────────────────────────────────────────────────
  computeProjectStats(project: HubProject): ProjectStats {
    const raw = this.getHvacDrawingsRaw()[project.id];
    const shapes = Array.isArray(raw?.shapes) ? raw.shapes : [];
    const layers = Array.isArray(raw?.layers) ? raw.layers.length : 1;
    const boundPoints = shapes.filter((s: any) => s?.deviceLink || s?.DeviceLink).length;
    const width = Number(raw?.width) || 0;
    const height = Number(raw?.height) || 0;
    const count = shapes.length;
    const complexity: ProjectStats['complexity'] =
      count > 60 ? 'complex' : count > 20 ? 'medium' : 'simple';
    return { shapeCount: count, width, height, layers, boundPoints, complexity };
  },
};
