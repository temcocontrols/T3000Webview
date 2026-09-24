/**
 * Designer / HVAC — a linked point's range, named the way the **point pages** name it.
 *
 * WHY THIS FILE EXISTS. The linked entry's range is described in two different vocabularies in this app:
 *
 *   · the **engine's** reader — `IdxUtils.getEntryRange` / `getUnitText`, backed by the legacy
 *     `T3Data.ranges` table: one `off` and one `on` string per digital range plus a `direct` flag that
 *     flips which of the two the raw 0 means, and unit *symbols* (`°C`, `°F`);
 *   · the **point pages'** tables — `features/<kind>/data/rangeData.ts`, which the input/output/variable
 *     grids read: a single `label` per range (`"Normal/Alarm"`, `"MSV 1"`), explicit units
 *     (`"Deg.C"`, `"Amps"`), and the multi-state ids (101-104) listed inside the *digital* table.
 *
 * Two tables for one device field is why the link-entry panel and the point grid ended up disagreeing:
 * range 11 is `Low/High` on the page, while the engine holds `on: "Low", off: "High", direct: true` — the
 * pair comes out swapped. The canvas renderer still needs the legacy reading, so **nothing there is
 * changed**: this class reads the pages' exports and answers every range question from them, and the
 * designer (the `Data` section and the Link Entry grid) asks here instead.
 *
 * Two rules are taken verbatim from the pages, because that is the whole point of the class:
 *
 *   · `digitalAnalog === 0` is **digital**, anything else — including the `255` an unset row carries — is
 *     **analog** (`signalType` column of the three grids);
 *   · `0` and `255` are the device's "field never written" fills, not range ids (`rangeField` of an unset
 *     row is `255`; the three grids show it as `Unknown`/no unit rather than as a range).
 */
import {
    DIGITAL_RANGES as INPUT_DIGITAL_RANGES,
    INPUT_ANALOG_RANGES,
    type RangeOption
} from "@/t3-react/features/inputs/data/rangeData";
import {
    OUTPUT_DIGITAL_RANGES,
    OUTPUT_ANALOG_RANGES
} from "@/t3-react/features/outputs/data/rangeData";
import {
    DIGITAL_RANGES as VARIABLE_DIGITAL_RANGES,
    VARIABLE_ANALOG_RANGES
} from "@/t3-react/features/variables/data/rangeData";

/** The three kinds that carry a range. Programs, schedules and holidays have none. */
export type PointKind = "INPUT" | "OUTPUT" | "VARIABLE";

/**
 * The little of an entry this class needs.
 *
 * Deliberately structural rather than `LinkEntry`: the class is also handed the engine's own `t3Entry`
 * objects (the picker's rows and the panel's linked entry are two different shapes of the same fields).
 */
export interface PointRangeEntry {
    type?: string;
    range?: number | string;
    digital_analog?: number | string;
}

/** A digital range's two state names, in raw-value order: `zero` is what 0 shows, `one` what 1 shows. */
export interface PointRangeStates {
    zero: string;
    one: string;
}

/** The three kinds' tables, as the pages export them. */
const TABLES: Record<PointKind, { digital: RangeOption[]; analog: RangeOption[] }> = {
    INPUT: { digital: INPUT_DIGITAL_RANGES, analog: INPUT_ANALOG_RANGES },
    OUTPUT: { digital: OUTPUT_DIGITAL_RANGES, analog: OUTPUT_ANALOG_RANGES },
    VARIABLE: { digital: VARIABLE_DIGITAL_RANGES, analog: VARIABLE_ANALOG_RANGES }
};

/** The two names a digital point falls back to when its range names no pair. */
const FALLBACK_STATES: PointRangeStates = { zero: "Off", one: "On" };

/** Ids the device writes into a field it never filled (`0xFF`), and `0` — "no range", not a range id. */
const UNSET_RANGE = 255;

export class PointRange {
    /** The point kind this entry is, or `null` for a kind that has no range table. */
    static kindOf(entry: PointRangeEntry | null | undefined): PointKind | null {
        const type = String(entry?.type ?? "").toUpperCase();
        return type === "INPUT" || type === "OUTPUT" || type === "VARIABLE" ? type : null;
    }

    /** Is this one of the three kinds that carry `range` / `digital_analog` at all? */
    static isPoint(entry: PointRangeEntry | null | undefined): boolean {
        return PointRange.kindOf(entry) !== null;
    }

    /**
     * The pages' own discriminator, verbatim: **only exactly `0` is digital**. An analog point often reports
     * `control: 1`, and an unset row reports `255`; both are analog to the grids.
     */
    static isDigital(entry: PointRangeEntry | null | undefined): boolean {
        return Number(entry?.digital_analog ?? 0) === 0;
    }

    /**
     * The entry's range id, or `undefined` when the field carries no range: `0` and `255` are the device's
     * "not set" fills (`rangeField` is `255` on every unset output and variable of a device that was never
     * configured), and neither is an id in the pages' tables.
     */
    static rangeId(entry: PointRangeEntry | null | undefined): number | undefined {
        const range = Number(entry?.range ?? 0);
        if (!Number.isFinite(range) || range === 0 || range === UNSET_RANGE) {
            return undefined;
        }
        return range;
    }

    /** The table the entry's kind and type read from — digital or analog, as the pages choose it. */
    static option(entry: PointRangeEntry | null | undefined): RangeOption | undefined {
        const kind = PointRange.kindOf(entry);
        const range = PointRange.rangeId(entry);
        if (!kind || range === undefined) {
            return undefined;
        }

        const table = PointRange.isDigital(entry) ? TABLES[kind].digital : TABLES[kind].analog;
        return table.find((item) => item.value === range);
    }

    /** The table row for the entry's **raw** range value — `0` included, since the grids name that one. */
    private static tableOption(entry: PointRangeEntry | null | undefined): RangeOption | undefined {
        const kind = PointRange.kindOf(entry);
        if (!kind) {
            return undefined;
        }

        const raw = Number(entry?.range ?? 0);
        const table = PointRange.isDigital(entry) ? TABLES[kind].digital : TABLES[kind].analog;
        return table.find((item) => item.value === raw);
    }

    /**
     * The grids' *Range* cell, **verbatim**: `"Normal/Alarm"`, `"MSV 1"`, `"Unused"` for range `0`, and
     * `"Unknown"` for an id the table does not know (`255`, the fill of a field the device never wrote) — the
     * same three answers `getRangeLabel` gives, from the same table. Empty for a kind that has no range.
     */
    static label(entry: PointRangeEntry | null | undefined): string {
        if (!PointRange.isPoint(entry)) {
            return "";
        }
        return PointRange.tableOption(entry)?.label ?? "Unknown";
    }

    /**
     * The grids' *Units* cell, **verbatim**: `"0/1"` for a digital point (the grids badge it exactly so), the
     * unit symbol for an analog one (`"Deg.C"`, `"Amps"`), and **nothing** when the range names no unit — the
     * same three cases `getUnitSymbol` answers, except that this returns `""` where that one returns `"---"`,
     * because the grids hide that placeholder rather than print it.
     */
    static unitSymbol(entry: PointRangeEntry | null | undefined): string {
        if (!PointRange.isPoint(entry)) {
            return "";
        }
        if (PointRange.isDigital(entry)) {
            return "0/1";
        }
        return PointRange.tableOption(entry)?.unit ?? "";
    }

    /**
     * The grids' *Type* cell: `Digital` / `Analog` for a point (their `signalType` column), and the entry's own
     * kind for everything else — a program has no signal type to report.
     */
    static signalType(entry: PointRangeEntry | null | undefined): string {
        if (!PointRange.isPoint(entry)) {
            return String(entry?.type ?? "");
        }
        return PointRange.isDigital(entry) ? "Digital" : "Analog";
    }

    /**
     * Is the range a multi-state one?
     *
     * The pages' tables name four of them (101-104, *Multi-State*), but a device may number its own states
     * higher, so the test is the id's own convention — 101 and up — with the tables consulted only for a name.
     * A multi-state point's *state names* never come from a table in any case: they live in the device's own
     * MSV rows.
     */
    static isMsv(entry: PointRangeEntry | null | undefined): boolean {
        const range = PointRange.rangeId(entry);
        return PointRange.isPoint(entry) && PointRange.isDigital(entry) && range !== undefined && range >= 101;
    }

    /**
     * What a digital point's two states are called.
     *
     * The range's label **is** the pair (`"Close/Open"` → zero `Close`, one `Open`), which is exactly the order
     * the pages' tables list it in — including the ranges the legacy table marks `direct`, where that flag made
     * the engine's `off`/`on` come out the other way round. No range, or one the table does not know ⇒ the
     * generic OFF/ON pair, so the row is still a working switch.
     */
    static states(entry: PointRangeEntry | null | undefined): PointRangeStates {
        const label = PointRange.option(entry)?.label;
        const parts = label ? label.split("/") : [];
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            return FALLBACK_STATES;
        }
        return { zero: parts[0].trim(), one: parts[1].trim() };
    }

    /**
     * The unit an **inspector row** shows beside a value: the analog unit (`"Deg.C"`), and empty — never a
     * placeholder — for a digital point or a range the table does not know.
     *
     * Distinct from `unitSymbol` on purpose: that one is the grids' cell, which badges `"0/1"` for a digital
     * point, and `"0/1"` belongs in a grid column, not beside a number field in the properties panel.
     */
    static unit(entry: PointRangeEntry | null | undefined): string {
        if (PointRange.isDigital(entry)) {
            return "";
        }
        return PointRange.option(entry)?.unit ?? "";
    }
}
