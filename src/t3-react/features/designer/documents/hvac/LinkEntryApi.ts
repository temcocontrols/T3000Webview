/**
 * Designer — the Link Entry picker's data source: the app's **REST API**.
 *
 * Deliberately not the websocket. `T3000_Data.panelsData` stays exactly as it is — other pages read it and the
 * socket keeps filling it — but the picker no longer depends on it:
 *
 * - the socket path carries one panel's *everything* (inputs, outputs, variables **and** schedules, holidays,
 *   programs …, which is why a small controller could read "320 points"), and its strings come straight from the
 *   C++ `GET_PANEL_DATA` reply, where jsoncpp substitutes U+FFFD for the device's 0xFF-filled fields;
 * - these endpoints are per-device and typed, and their rows are written by the Rust sync through action 17 —
 *   the reply that was fixed — so the text is clean and the kinds are exactly the ones worth listing.
 *
 * What each kind is read through (all whitelisted by `api/src/t3_device/routes.rs:106`):
 *
 * | kind | endpoint | shape |
 * |---|---|---|
 * | INPUT / OUTPUT / VARIABLE | `devices/{serial}/input-points` … | `{ input_points: [ camelCase rows ] }` |
 * | PROGRAM / SCHEDULE / HOLIDAY / SCREEN / MONITOR | `devices/{serial}/table/{PROGRAMS\|SCHEDULES\|HOLIDAYS\|GRAPHICS\|MONITORDATA}` | `{ data: [ raw column names ] }` |
 *
 * Every row is mapped once, here, into the entry shape the engine's link path consumes — the panel keeps
 * rendering the very same objects it always did.
 */
import { API_BASE_URL } from "@/t3-react/config/constants";

export type LinkEntryKindId =
    | "INPUT"
    | "OUTPUT"
    | "VARIABLE"
    | "PROGRAM"
    | "SCHEDULE"
    | "HOLIDAY"
    | "SCREEN"
    | "MONITOR";

/**
 * One entry, in the shape `LinkT3EntrySaveV2` / `IdxUtils` expect.
 *
 * `type` is upper case on purpose: `IdxUtils.getEntryRange` lower-cases it to index the app's range tables, and
 * `getUnitText` reads `range` / `value` / `control` / `digital_analog` off the same object.
 */
export interface LinkEntry {
    /**
     * The device the point belongs to. This — not the panel number — is what identifies a device to the picker:
     * the panel list arrives over the engine's websocket, and the picker has to work with nothing connected.
     */
    serial: number;
    /** Panel number — what the engine's write path sends (`pid`); `1` when the engine has no panel list. */
    pid: number;
    /** 0-based point index, the same convention as the C++ entries and the write path. */
    index: number;
    /** Display id (`IN1`, `OUT52`, …); derived from the prefix when the row has none. */
    id: string;
    type: LinkEntryKindId;
    /** The device's full label (C++ `description`) — the picker's *Full Label* column. */
    description: string;
    label: string;
    value: number;
    control: number;
    auto_manual: number;
    digital_analog: number;
    range: number;
    status?: number;
    units: string;
}

interface KindSpec {
    id: LinkEntryKindId;
    /** DB table, read through `devices/{serial}/table/{table}`. */
    table: string;
    /** Id prefix used when the row carries no id (`IN` + index + 1, the C++ convention). */
    prefix: string;
    /** Typed endpoint where one exists (the three point kinds). */
    points?: string;
    /** `POST {refresh}/:serial/refresh` + `save-refreshed` — the device pages' own Refresh. */
    refresh?: string;
}

/** The kinds the legacy picker listed, in its own order. */
export const LINK_ENTRY_KINDS: KindSpec[] = [
    { id: "INPUT", table: "INPUTS", prefix: "IN", points: "input-points", refresh: "inputs" },
    { id: "OUTPUT", table: "OUTPUTS", prefix: "OUT", points: "output-points", refresh: "outputs" },
    { id: "VARIABLE", table: "VARIABLES", prefix: "VAR", points: "variable-points", refresh: "variables" },
    { id: "PROGRAM", table: "PROGRAMS", prefix: "PRG" },
    { id: "SCHEDULE", table: "SCHEDULES", prefix: "SCH" },
    { id: "HOLIDAY", table: "HOLIDAYS", prefix: "HOL" },
    { id: "SCREEN", table: "GRAPHICS", prefix: "SCR" },
    { id: "MONITOR", table: "MONITORDATA", prefix: "MON" }
];

/** The three kinds a device can be asked to re-read (the others only ever arrive through the sync). */
const REFRESHABLE = LINK_ENTRY_KINDS.filter((kind) => !!kind.refresh);

const num = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

/** `Full_Label`, `fullLabel` and `full_label` are the same column to us. */
const norm = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * First matching column of a row, by normalised name.
 *
 * The typed endpoints answer in camelCase (serde `rename_all`), the generic table endpoint answers with the raw
 * SQLite column names (`Full_Label`, `Input_Index`, `SerialNumber`) — one lookup covers both, and each kind only
 * needs the list of names it might have.
 */
function pickField(row: Record<string, unknown>, names: string[]): unknown {
    const byNorm = new Map<string, unknown>();
    Object.keys(row).forEach((key) => byNorm.set(norm(key), row[key]));
    for (const name of names) {
        const value = byNorm.get(norm(name));
        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
    }
    return undefined;
}

/** One API row → one entry. */
function toEntry(row: Record<string, unknown>, spec: KindSpec, pid: number, serial: number): LinkEntry {
    const kind = spec.id.toLowerCase();
    const indexRaw = pickField(row, [`${kind}Index`, "index", "entryIndex"]);
    const index = num(indexRaw, 0);
    const idRaw = pickField(row, [`${kind}Id`, "id", "entryId"]);
    const description = pickField(row, ["fullLabel", "full_label", "description", "desc", "name"]);
    const label = pickField(row, ["label", "shortLabel"]);
    const valueRaw = pickField(row, ["fValue", "value"]);
    return {
        serial,
        pid,
        index,
        id: typeof idRaw === "string" && idRaw.trim() ? idRaw.trim() : `${spec.prefix}${index + 1}`,
        type: spec.id,
        description: typeof description === "string" ? description : description === undefined ? "" : String(description),
        label: typeof label === "string" ? label : label === undefined ? "" : String(label),
        value: num(valueRaw),
        control: num(pickField(row, ["control"]) ?? valueRaw),
        auto_manual: num(pickField(row, ["autoManual", "auto_manual"]), 1),
        digital_analog: num(pickField(row, ["digitalAnalog", "digital_analog", "digitalAnalogField"])),
        range: num(pickField(row, ["range", "rangeField", "range_field"])),
        status: num(pickField(row, ["status"])),
        units: String(pickField(row, ["units", "unit"]) ?? "")
    };
}

export class LinkEntryApi {
    private cache = new Map<number, { at: number; entries: LinkEntry[] }>();
    private inFlight = new Map<number, Promise<LinkEntry[]>>();

    constructor(
        private baseUrl: string = API_BASE_URL,
        /** How long a device's entries are trusted, so reopening the picker does not re-query. */
        private ttlMs = 30_000
    ) {}

    /** Every kind of one device, `pid` being the panel number the picker's device row resolved. */
    async loadDevice(serial: number, pid = 1): Promise<LinkEntry[]> {
        const hit = this.cache.get(serial);
        if (hit && Date.now() - hit.at < this.ttlMs) {
            return hit.entries;
        }
        const running = this.inFlight.get(serial);
        if (running) {
            return running;
        }
        const job = this.fetchAll(serial, pid)
            .then((entries) => {
                this.cache.set(serial, { at: Date.now(), entries });
                return entries;
            })
            .finally(() => this.inFlight.delete(serial));
        this.inFlight.set(serial, job);
        return job;
    }

    /**
     * Read the device into the local DB — the device pages' own two-step Refresh:
     *
     * 1. `POST /{kind}/:serial/refresh` body `{}` → `{ success, message, items, count, timestamp }`, the rows the
     *    device answered with (`GET_WEBVIEW_LIST`, action 17). **Nothing is stored by this call.**
     * 2. `POST /{kind}/:serial/save-refreshed` body `{ items }` → writes those rows into the local DB.
     *
     * The second body is not optional: `SaveRefreshedDataRequest { items: Vec<Value> }` rejects `{}` with
     * *"missing field `items`"*, and an empty `items` means the device gave nothing — the server's own message
     * ("Protocol settings not found for serial …") is what the panel then reports.
     */
    async refreshDevice(serial: number): Promise<void> {
        const jobs = REFRESHABLE.map(async (spec) => {
            const base = `${this.baseUrl}/api/t3_device/${spec.refresh}/${serial}`;
            const headers = { "Content-Type": "application/json" };
            const refreshed = await fetch(`${base}/refresh`, { method: "POST", headers, body: "{}" });
            if (!refreshed.ok) {
                throw new Error(`${spec.id}: refresh HTTP ${refreshed.status}`);
            }
            const payload = (await refreshed.json()) as { success?: boolean; message?: string; items?: unknown[] };
            const items = Array.isArray(payload.items) ? payload.items : [];
            if (payload.success === false || items.length === 0) {
                throw new Error(`${spec.id}: ${payload.message || "the device returned no rows"}`);
            }
            const saved = await fetch(`${base}/save-refreshed`, {
                method: "POST",
                headers,
                body: JSON.stringify({ items })
            });
            if (!saved.ok) {
                throw new Error(`${spec.id}: save-refreshed HTTP ${saved.status}`);
            }
        });
        const results = await Promise.allSettled(jobs);
        this.cache.delete(serial);
        const failed = results.filter((result) => result.status === "rejected");
        if (failed.length === results.length) {
            throw new Error("The device did not answer the refresh request");
        }
    }

    /** Whether anything at all is stored for a device — the picker says so instead of showing an empty table. */
    async hasDevice(serial: number): Promise<boolean> {
        try {
            const rows = await this.fetchKind(serial, LINK_ENTRY_KINDS[0]);
            return rows.length > 0;
        } catch {
            return false;
        }
    }

    invalidate(serial?: number): void {
        if (serial === undefined) {
            this.cache.clear();
        } else {
            this.cache.delete(serial);
        }
    }

    private async fetchAll(serial: number, pid: number): Promise<LinkEntry[]> {
        const perKind = await Promise.all(
            LINK_ENTRY_KINDS.map(async (spec) => {
                try {
                    const rows = await this.fetchKind(serial, spec);
                    return rows.map((row) => toEntry(row, spec, pid, serial));
                } catch {
                    /* One kind failing (an empty table, a slow device) must not empty the whole list. */
                    return [] as LinkEntry[];
                }
            })
        );
        return perKind.flat();
    }

    private async fetchKind(serial: number, spec: KindSpec): Promise<Record<string, unknown>[]> {
        const url = spec.points
            ? `${this.baseUrl}/api/t3_device/devices/${serial}/${spec.points}`
            : `${this.baseUrl}/api/t3_device/devices/${serial}/table/${spec.table}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`${spec.id}: HTTP ${response.status}`);
        }
        const data = (await response.json()) as Record<string, unknown>;
        const rows = spec.points ? data[`${spec.id.toLowerCase()}_points`] : data.data;
        return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
    }
}

/** One instance per app — the cache is the point of it. */
let sharedApi: LinkEntryApi | null = null;

export function getLinkEntryApi(): LinkEntryApi {
    if (!sharedApi) {
        sharedApi = new LinkEntryApi();
    }
    return sharedApi;
}
