/**
 * The designer hands the engine its own reading of a linked point's range.
 *
 * A range is described twice in this codebase — the engine's legacy table (`IdxUtils.getEntryRange`, over
 * `T3Data.ranges`) and the point pages' tables (`PointRange`) — and they disagree: the legacy table can swap a
 * digital pair (`direct`) and uses symbols for units (`°C`) where the pages write `Deg.C`. The inspector's Value
 * row, the Display-field options and the Link Entry picker all read the pages' side, so the engine's label must
 * too, or a widget prints one state and its own properties print another.
 *
 * The engine cannot import `PointRange` itself (nothing under `src/lib/t3-hvac/**` imports `@/t3-react/**`), so
 * this module — which can — installs it into `BindingLabelUtil` as a vocabulary. Imported for its side effect by
 * `HvacDocument`, i.e. whenever an HVAC drawing is open. Nothing else changes: without an installed
 * vocabulary the label keeps the engine's legacy reading, which is what the legacy pages print.
 *
 * The three answers below are **verbatim** the conditions `HvacPropertiesPanel` uses to choose between a state
 * list and a number field for its Value row (`isMsv` / `rangeUnset` / `isSwitch`), so the two stay in step by
 * construction rather than by coincidence.
 */
import BindingLabelUtil from "@/lib/t3-hvac/Opt/Common/BindingLabelUtil";
import { PointRange } from "./PointRange";

BindingLabelUtil.setVocabulary({
    /** The unit an inspector row shows: the analog unit, never a digital badge. */
    unit: (entry) => PointRange.unit(entry),

    /** The two words the pages call this point's states, or `null` when its value is not a state list. */
    states: (entry) =>
        PointRange.isPoint(entry) && PointRange.isDigital(entry) && PointRange.rangeId(entry) !== undefined
            ? PointRange.states(entry)
            : null,

    /**
     * A state list needs a range that **names** states. A range of `0` or `255` is the device's "field never
     * written" fill, and a multi-state point names itself from the device's own rows — neither is a two-word
     * list, so both read as numbers.
     */
    isSwitch: (entry) =>
        PointRange.isPoint(entry) &&
        PointRange.isDigital(entry) &&
        !PointRange.isMsv(entry) &&
        PointRange.rangeId(entry) !== undefined
});
