/**
 * Device-tree load flow
 *
 * Verifies the sequence TreePanel runs on mount:
 *
 *   fetchDevices()                 → GET /api/t3_device/devices        (DB cache, instant paint)
 *   loadDevicesWithSync()  ┐       → POST /api/t3000/ffi/call {action:4} + N device upserts
 *   scanForDevices('udp')  ┘       → POST /api/t3_device/devices/scan-refresh   (concurrent)
 *   fetchDevices()                 → authoritative read, merged tree
 *
 * The backend is replaced by controllable mocks, so the tests also report the
 * *cost* of one page load: how many HTTP round-trips it takes and how long it
 * takes with realistic latencies (proving the two passes overlap).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

interface Panel {
  serial_number: number;
  panel_name: string;
  panel_number?: number;
  pid?: number;
  online_time?: number;
  object_instance?: number;
}

const backend = {
  /** DEVICES table, as returned by GET /api/t3_device/devices */
  db: [] as any[],
  /** action 4 (GET_PANELS_LIST) payload */
  panels: [] as Panel[],
  /** what the discovery scan finds on the LAN */
  scanFinds: [] as any[],
  /** true = scan response is the post-upsert DB list (real backend behaviour) */
  scanUpserts: true,
  /** non-empty = action 4 answers with an error instead of a panel list */
  ffiError: '' as string,
  panelListLatencyMs: 0,
  scanLatencyMs: 0,
  calls: { devicesRead: 0, panelList: 0, panelCreate: 0, scan: 0 },
  /** start/end of each pass, for overlap assertions */
  timing: { panelStart: 0, panelEnd: 0, scanStart: 0, scanEnd: 0 },
};

const sleep = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

const nowSecs = () => Math.floor(Date.now() / 1000);

/** A row as the backend would return it from the DEVICES table. */
const deviceRow = (over: Record<string, any> = {}) => ({
  serialNumber: 1001,
  productName: 'T3-BB',
  productClassId: 19,
  nameShowOnTree: 'T3-BB',
  mainBuildingName: 'Default_Building',
  buildingName: 'Local View',
  isOnline: 1,
  lastChecked: '2026-11-19T00:00:00.000Z',
  ...over,
});

// ── mocks ────────────────────────────────────────────────────────────────────

vi.mock('@t3-react/services/deviceApi', () => ({
  default: {
    getAllDevices: vi.fn(async () => {
      backend.calls.devicesRead++;
      await sleep(1);
      return { devices: backend.db.map((d) => ({ ...d })), total: backend.db.length, message: 'ok' };
    }),
    scanAndRefreshDevices: vi.fn(async () => {
      backend.calls.scan++;
      backend.timing.scanStart = performance.now();
      await sleep(backend.scanLatencyMs);
      if (backend.scanUpserts) {
        for (const d of backend.scanFinds) {
          if (!backend.db.some((x) => x.serialNumber === d.serialNumber)) backend.db.push({ ...d });
        }
      }
      const devices = backend.scanUpserts
        ? backend.db.map((d) => ({ ...d }))
        : backend.scanFinds.map((d) => ({ ...d }));
      backend.timing.scanEnd = performance.now();
      return {
        devices,
        total: devices.length,
        scanned: backend.scanFinds.length,
        udp_count: backend.scanFinds.length,
        mode: 'udp',
        message: 'scan',
      };
    }),
  },
}));

vi.mock('@/lib/t3-transport/core/T3Transport', () => ({
  T3Transport: class {
    constructor(_cfg?: unknown) {}
    async connect() {}
    async disconnect() {}
    async getDeviceList() {
      backend.calls.panelList++;
      backend.timing.panelStart = performance.now();
      await sleep(backend.panelListLatencyMs);
      backend.timing.panelEnd = performance.now();
      if (backend.ffiError) {
        return { success: false, data: { error: backend.ffiError, code: 'T3000_PANELS_WARMUP' } };
      }
      return { success: true, data: { action: 'GET_PANELS_LIST_RES', data: backend.panels } };
    }
    async refreshDeviceRecords() {
      return { success: true, data: { data: [] } };
    }
  },
}));

vi.mock('@/lib/t3-database', () => ({
  T3Database: class {
    devices = {
      create: async (row: any) => {
        backend.calls.panelCreate++;
        const serial = row.SerialNumber;
        if (backend.db.some((d) => d.serialNumber === serial)) {
          throw new Error('UNIQUE constraint failed: duplicate serial');
        }
        backend.db.push({
          serialNumber: serial,
          nameShowOnTree: row.Product_Name,
          productName: row.Product_Name,
          productClassId: row.Product_ID,
          mainBuildingName: row.MainBuilding_Name,
          buildingName: row.Building_Name,
          isOnline: row.is_online,
          lastChecked: row.last_checked,
          parentSerialNumber: 0,
        });
        return row;
      },
    };
  },
}));

// ── helpers ──────────────────────────────────────────────────────────────────

/** Fresh module graph per test: resets the zustand store and its in-flight guards. */
async function loadModules() {
  vi.resetModules();
  const [tree, status] = await Promise.all([
    import('@t3-react/features/devices/store/deviceTreeStore'),
    import('@t3-react/store/statusBarStore'),
  ]);
  return { store: tree.useDeviceTreeStore, status: status.useStatusBarStore };
}

/** The exact sequence TreePanel runs on mount (see TreePanel.initializeDevices). */
async function runPageLoad(store: any) {
  await store.getState().fetchDevices(); // phase 0 — DB cache
  await Promise.allSettled([
    store.getState().loadDevicesWithSync({ skipInitialFetch: true, quiet: true }),
    store.getState().scanForDevices({ timeout: 8, mode: 'udp', quiet: true }),
  ]);
  await store.getState().fetchDevices(); // reconcile
}

const serials = (store: any) =>
  store
    .getState()
    .devices.map((d: any) => d.serialNumber)
    .sort((a: number, b: number) => a - b);

beforeEach(() => {
  backend.db = [];
  backend.panels = [];
  backend.scanFinds = [];
  backend.scanUpserts = true;
  backend.ffiError = '';
  backend.panelListLatencyMs = 0;
  backend.scanLatencyMs = 0;
  backend.calls = { devicesRead: 0, panelList: 0, panelCreate: 0, scan: 0 };
  backend.timing = { panelStart: 0, panelEnd: 0, scanStart: 0, scanEnd: 0 };
  // The store also posts the MCP current-device and probes points-count with raw
  // fetch(). Keep those off the real network so they cannot skew the timings.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('network disabled in unit tests');
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── tests ────────────────────────────────────────────────────────────────────

describe('device tree load flow', { timeout: 20000 }, () => {
  it('paints the tree from the DB cache before any network pass runs', async () => {
    backend.db = [deviceRow({ serialNumber: 1001, nameShowOnTree: 'AHU-1', productName: 'AHU-1' })];
    const { store } = await loadModules();

    await store.getState().fetchDevices();

    const state = store.getState();
    expect(state.devices).toHaveLength(1);
    expect(state.treeData.length).toBeGreaterThan(0); // the tree has visible nodes
    expect(state.isLoading).toBe(false);
    // Nothing else was contacted yet — the paint came from the DB alone.
    expect(backend.calls.devicesRead).toBe(1);
    expect(backend.calls.panelList).toBe(0);
    expect(backend.calls.scan).toBe(0);
  });

  it('reports how many round-trips one page load costs', async () => {
    backend.panels = [
      { serial_number: 2001, panel_name: 'AHU-1', panel_number: 1, pid: 19, online_time: nowSecs() },
      { serial_number: 2002, panel_name: 'AHU-2', panel_number: 2, pid: 19, online_time: nowSecs() },
    ];
    backend.scanFinds = [deviceRow({ serialNumber: 2001, nameShowOnTree: 'AHU-1', productName: 'AHU-1' })];
    const { store } = await loadModules();

    const t0 = performance.now();
    await runPageLoad(store);
    const elapsedMs = Math.round(performance.now() - t0);

    // eslint-disable-next-line no-console
    console.log(
      `[tree-load] costs: devicesRead=${backend.calls.devicesRead} ` +
        `panelList=${backend.calls.panelList} panelCreate=${backend.calls.panelCreate} ` +
        `scan=${backend.calls.scan} → ${elapsedMs} ms`
    );

    expect(backend.calls.panelList).toBe(1); // one GET_PANELS_LIST
    expect(backend.calls.panelCreate).toBe(2); // one upsert per panel
    expect(backend.calls.scan).toBe(1); // one scan-refresh
    // Three DB reads are the flow itself (DB cache → panel-list reload →
    // reconcile); a 4th can appear when auto-selecting a device triggers the
    // points check, so assert the invariant rather than an exact number.
    expect(backend.calls.devicesRead).toBeGreaterThanOrEqual(3);
    expect(serials(store)).toEqual([2001, 2002]);
    expect(store.getState().treeData.length).toBeGreaterThan(0);
  });

  it('runs the panel list and the UDP scan concurrently (intervals overlap)', async () => {
    backend.panels = [{ serial_number: 3001, panel_name: 'AHU-3', online_time: nowSecs() }];
    backend.panelListLatencyMs = 120;
    backend.scanLatencyMs = 240;
    const { store } = await loadModules();

    await Promise.allSettled([
      store.getState().loadDevicesWithSync({ skipInitialFetch: true, quiet: true }),
      store.getState().scanForDevices({ timeout: 8, mode: 'udp', quiet: true }),
    ]);

    const t = backend.timing;
    // Overlap is asserted from the recorded intervals, so the check does not
    // depend on machine load (wall-clock thresholds are flaky under CI).
    expect(t.panelStart).toBeLessThan(t.scanEnd);
    expect(t.scanStart).toBeLessThan(t.panelEnd);

    const sequential = t.panelEnd - t.panelStart + (t.scanEnd - t.scanStart);
    const concurrent = Math.max(t.panelEnd, t.scanEnd) - Math.min(t.panelStart, t.scanStart);
    // eslint-disable-next-line no-console
    console.log(
      `[tree-load] panel list ${Math.round(t.panelEnd - t.panelStart)} ms, ` +
        `scan ${Math.round(t.scanEnd - t.scanStart)} ms → sequential ${Math.round(sequential)} ms, ` +
        `measured ${Math.round(concurrent)} ms`
    );
    expect(concurrent).toBeLessThan(sequential * 0.85);
  });

  it('merges scan results instead of replacing the list', async () => {
    // The scan response was built before the panel-list upserts landed, so it
    // does not contain device 5001 — the store must keep it.
    backend.db = [deviceRow({ serialNumber: 5001, nameShowOnTree: 'AHU-1', productName: 'AHU-1' })];
    backend.scanUpserts = false;
    backend.scanFinds = [deviceRow({ serialNumber: 5002, nameShowOnTree: 'AHU-2', productName: 'AHU-2' })];
    const { store } = await loadModules();

    await store.getState().fetchDevices();
    await store.getState().scanForDevices({ timeout: 8, mode: 'udp', quiet: true });

    expect(serials(store)).toEqual([5001, 5002]);
    expect(store.getState().treeData.length).toBeGreaterThan(0);
  });

  it('surfaces an FFI failure in the status bar instead of showing nothing', async () => {
    backend.ffiError = 'T3000 panel data still initializing, retry shortly';
    const { store, status } = await loadModules();

    await store.getState().fetchDevices();
    await store.getState().loadDevicesWithSync({ skipInitialFetch: true, quiet: true });

    expect(status.getState().message).toContain('T3000 panel list unavailable');
    expect(status.getState().message).toContain('T3000_PANELS_WARMUP');
    expect(status.getState().messageType).toBe('error');
  });
});
