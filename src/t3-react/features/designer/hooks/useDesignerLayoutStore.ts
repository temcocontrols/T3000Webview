/**
 * Designer — per-document-kind layout memory (region widths, collapsed flags, active tabs).
 *
 * Deliberately dependency-free (no zustand) and persisted to `localStorage` under one key, keyed by
 * document kind, so an HVAC user and an LVGL user get their own defaults.
 */
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "t3.designer.layout";

export interface RegionLayout {
    width?: number;
    height?: number;
    collapsed?: boolean;
    /**
     * The user **explicitly** expanded this region.
     *
     * `collapsed: false` cannot carry that on its own: it is also what a region nobody ever touched reports
     * (the spec's default). The distinction matters because `DesignerShell`'s responsive rule forces a collapse
     * when the viewport is too narrow for the panel — and the user's own click has to be able to override it,
     * otherwise the chevron looks dead there.
     */
    expandedByUser?: boolean;
    /**
     * The document's `width.default` / `height.default` in force when this size was written.
     *
     * It is what tells a size the user **chose** from one the shell merely *remembered*: when a document ships
     * a new default, an entry still holding the old one follows it instead of pinning the region forever (see
     * `resolveRegionSize`). Absent on entries written before this existed, which are treated as chosen.
     */
    specDefault?: number;
}

export interface KindLayout {
    left?: RegionLayout;
    right?: RegionLayout;
    bottom?: RegionLayout;
    /** regionId -> tabId */
    activeTabs: Record<string, string>;
    /** `regionId:sectionId` -> the section's share of the region body (0–1). */
    sections?: Record<string, number>;
    /**
     * `regionId` -> the width (px) of that region's **second column**.
     *
     * The origin's left area is two panels side by side — the Components Palette and the Widgets Structure —
     * with a divider the user can drag, so the memory has to be per column, not just per region.
     */
    secondaryWidths?: Record<string, number>;
}

type StoreShape = Record<string, KindLayout>;

const EMPTY: KindLayout = { activeTabs: {} };

let cache: StoreShape = readStorage();
const listeners = new Set<() => void>();

function readStorage(): StoreShape {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : undefined;
        return parsed && typeof parsed === "object" ? (parsed as StoreShape) : {};
    } catch {
        return {};
    }
}

function writeStorage(next: StoreShape) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        /* quota / privacy mode — layout memory is best effort */
    }
}

function commit(next: StoreShape) {
    cache = next;
    writeStorage(next);
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** Snapshot for one kind — stable identity while unchanged (required by `useSyncExternalStore`). */
export function getKindLayout(kind: string): KindLayout {
    return cache[kind] ?? EMPTY;
}

function patchKind(kind: string, patch: Partial<KindLayout>) {
    const current = getKindLayout(kind);
    commit({ ...cache, [kind]: { ...current, ...patch } });
}

function patchRegion(kind: string, region: keyof Omit<KindLayout, "activeTabs">, patch: RegionLayout) {
    const current = getKindLayout(kind);
    const previous: RegionLayout = current[region] ?? {};
    patchKind(kind, { [region]: { ...previous, ...patch } } as Partial<KindLayout>);
}

export const layoutStore = {
    get: getKindLayout,

    setRegionSize(kind: string, region: "left" | "right", width: number, specDefault?: number) {
        patchRegion(kind, region, { width, ...(typeof specDefault === "number" ? { specDefault } : {}) });
    },
    setBottomHeight(kind: string, height: number, specDefault?: number) {
        patchRegion(kind, "bottom", { height, ...(typeof specDefault === "number" ? { specDefault } : {}) });
    },
    /**
     * Records the collapsed state **as the user chose it** — `expandedByUser` is the difference between "the
     * user expanded this" and "nobody ever touched it, so it is expanded by default".
     */
    setCollapsed(kind: string, region: "left" | "right" | "bottom", collapsed: boolean) {
        patchRegion(kind, region, { collapsed, expandedByUser: !collapsed });
    },
    toggleCollapsed(kind: string, region: "left" | "right" | "bottom") {
        const current = getKindLayout(kind);
        layoutStore.setCollapsed(kind, region, !current[region]?.collapsed);
    },
    setActiveTab(kind: string, regionId: string, tabId: string) {
        const current = getKindLayout(kind);
        const activeTabs = { ...current.activeTabs, [regionId]: tabId };
        patchKind(kind, { activeTabs });
    },
    /** Remembers a section split (`fractions` are the shares of the body, top to bottom). */
    setSectionFractions(kind: string, regionId: string, sectionIds: string[], fractions: number[]) {
        const current = getKindLayout(kind);
        const sections = { ...(current.sections ?? {}) };
        sectionIds.forEach((sectionId, index) => {
            sections[`${regionId}:${sectionId}`] = fractions[index];
        });
        patchKind(kind, { sections });
    },
    /** Remembers the width of a region's second column, px (dragged, like a region's own width). */
    setSecondaryWidth(kind: string, regionId: string, width: number) {
        const current = getKindLayout(kind);
        const secondaryWidths = { ...(current.secondaryWidths ?? {}), [regionId]: width };
        patchKind(kind, { secondaryWidths });
    },
    /** Used by the "reset panels" command. */
    resetKind(kind: string) {
        const next = { ...cache };
        delete next[kind];
        commit(next);
    }
};

export function useKindLayout(kind: string): KindLayout {
    return useSyncExternalStore(subscribe, () => getKindLayout(kind), () => EMPTY);
}

/**
 * Region width resolution: a size the user chose first, then the spec's default.
 *
 * "Chose" is the subtle half. A remembered value is only kept when it was **not** the old default: entries
 * written against a different `specDefault` and still holding exactly that value are untouched defaults, so the
 * document's new default wins. Without this, shipping a smaller default changes nothing for anyone who had ever
 * dragged a splitter — and a region could never be retuned by the document again.
 */
export function resolveRegionWidth(
    layout: KindLayout,
    region: "left" | "right",
    spec: { default: number; min: number; max: number } | undefined
): number {
    const stored = layout[region]?.width;
    if (!spec) {
        return typeof stored === "number" ? stored : 240;
    }

    return resolveRegionSize(stored, layout[region]?.specDefault, spec);
}

/** The shared rule behind `resolveRegionWidth` / `resolveRegionHeight`. */
function resolveRegionSize(
    stored: number | undefined,
    writtenAgainst: number | undefined,
    spec: { default: number; min: number; max: number }
): number {
    if (typeof stored !== "number") {
        return spec.default;
    }

    // Untouched since it was written against a default the document has since changed → follow the document.
    if (writtenAgainst !== undefined && writtenAgainst !== spec.default && stored === writtenAgainst) {
        return spec.default;
    }

    return Math.min(spec.max, Math.max(spec.min, stored));
}

export function resolveRegionHeight(
    layout: KindLayout,
    spec: { default: number; min: number; max: number } | undefined
): number {
    const stored = layout.bottom?.height;
    if (!spec) {
        return typeof stored === "number" ? stored : 180;
    }

    return resolveRegionSize(stored, layout.bottom?.specDefault, spec);
}

/**
 * The second column's width: the document's default until the user drags its divider, then what they chose.
 *
 * Unlike a region, a column is not re-tuned by the document: `defaultWidth` is the width it *starts* at, and
 * the document's min/max stay the bounds of the drag — so a new default never overrides a chosen width.
 */
export function resolveSecondaryWidth(
    layout: KindLayout,
    regionId: string,
    spec: { defaultWidth: number; min: number; max: number } | undefined
): number | undefined {
    if (!spec) {
        return undefined;
    }

    const stored = layout.secondaryWidths?.[regionId];
    if (typeof stored !== "number") {
        return spec.defaultWidth;
    }

    return Math.min(spec.max, Math.max(spec.min, stored));
}
