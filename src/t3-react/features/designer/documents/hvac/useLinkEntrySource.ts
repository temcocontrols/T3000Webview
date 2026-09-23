/**
 * Designer — the Link Entry picker's point source (see `LinkEntryApi` for *where* the data comes from).
 *
 * The hook owns the one thing the class should not: React state. It fetches a device at a time, appends as each
 * answer arrives (so a slow device never blocks the list), remembers what has been loaded, and exposes a
 * `refresh` that re-reads a device into the local DB before re-fetching it.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { getLinkEntryApi } from "./LinkEntryApi";
import type { LinkEntry } from "./LinkEntryApi";

/** A device the picker wants points for: its serial plus the panel number its row resolved. */
export interface LinkEntryDeviceRef {
    serial: number;
    pid: number | null;
}

export interface LinkEntrySource {
    entries: LinkEntry[];
    loading: boolean;
    error: string | null;
    /** Fetch anything not yet loaded (and not already in flight). Safe to call on every render. */
    ensure(devices: LinkEntryDeviceRef[]): void;
    /** Read the device into the local DB, then re-read its points. */
    refresh(device: LinkEntryDeviceRef): Promise<void>;
    /** Re-read from the API what is already stored (no device round-trip) — the *All devices* Reload. */
    reload(devices: LinkEntryDeviceRef[]): void;
}

export function useLinkEntrySource(enabled: boolean): LinkEntrySource {
    const [bySerial, setBySerial] = useState<Map<number, LinkEntry[]>>(() => new Map());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    /** Serials whose entries are in state, and those being fetched right now. */
    const loadedRef = useRef(new Set<number>());
    const runningRef = useRef(new Set<number>());

    const entries = useMemo(() => Array.from(bySerial.values()).flat(), [bySerial]);

    const fetchDevices = useCallback(async (devices: LinkEntryDeviceRef[], force: boolean) => {
        const api = getLinkEntryApi();
        const wanted = devices.filter(
            (device) =>
                Number.isFinite(device.serial) &&
                device.serial > 0 &&
                !runningRef.current.has(device.serial) &&
                (force || !loadedRef.current.has(device.serial))
        );
        if (wanted.length === 0) {
            return;
        }
        const load = async (device: LinkEntryDeviceRef) => {
            runningRef.current.add(device.serial);
            try {
                if (force) {
                    api.invalidate(device.serial);
                }
                const list = await api.loadDevice(device.serial, Number(device.pid) || 1);
                loadedRef.current.add(device.serial);
                setBySerial((previous) => {
                    const next = new Map(previous);
                    next.set(device.serial, list);
                    return next;
                });
            } catch (fetchError) {
                setError(
                    `Could not read this device's points (${device.serial}): ` +
                        (fetchError instanceof Error ? fetchError.message : String(fetchError))
                );
            } finally {
                runningRef.current.delete(device.serial);
            }
        };
        setLoading(true);
        setError(null);
        /*
         * A few at a time: *All devices* means one request per kind per device, so a burst of them is worth
         * avoiding on a server-backed install. Answers land as they arrive (`setBySerial` per device), so a slow
         * device never holds up the list.
         */
        const CHUNK = 4;
        for (let at = 0; at < wanted.length; at += CHUNK) {
            await Promise.all(wanted.slice(at, at + CHUNK).map(load));
        }
        setLoading(false);
    }, []);

    const ensure = useCallback(
        (devices: LinkEntryDeviceRef[]) => {
            if (!enabled) {
                return;
            }
            void fetchDevices(devices, false);
        },
        [enabled, fetchDevices]
    );

    const refresh = useCallback(
        async (device: LinkEntryDeviceRef) => {
            if (!Number.isFinite(device.serial) || device.serial <= 0) {
                return;
            }
            const api = getLinkEntryApi();
            setLoading(true);
            setError(null);
            try {
                await api.refreshDevice(device.serial);
            } catch (refreshError) {
                setError(
                    `The device did not answer the refresh request: ` +
                        (refreshError instanceof Error ? refreshError.message : String(refreshError))
                );
            }
            /* Re-read it either way: `refreshDevice` drops the cache, and `force` also clears the hook's record of
             * what it has, so `fetchDevices` goes to the API again. */
            loadedRef.current.delete(device.serial);
            await fetchDevices([device], true);
        },
        [fetchDevices]
    );

    const reload = useCallback(
        (devices: LinkEntryDeviceRef[]) => {
            void fetchDevices(devices, true);
        },
        [fetchDevices]
    );

    return { entries, loading, error, ensure, refresh, reload };
}
