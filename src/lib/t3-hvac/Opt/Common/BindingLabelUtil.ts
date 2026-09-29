/**
 * BindingLabelUtil — the label a **linked** widget shows above its shape.
 *
 * WHY THIS FILE EXISTS. In the classic Vue canvases that text came from a Vue component mounted into an SVG
 * `<foreignObject>` (`ForeignObjUtil.CreateVueObject` → `ObjectType3.vue`). The React tree stubs that component
 * out — `src/lib/t3-hvac/Opt/Quasar/ForeignObjUtil.ts` sets `ObjectType3 = null` with the comment "Vue
 * components not needed in React migration" — while `S.SvgSymbol.CreateShape` went on calling it. So every bound
 * widget got an empty 300×30 foreignObject above it and no text at all, with no error to explain it.
 *
 * This file draws the same information as plain SVG — no Vue, no HTML, no React — so the label is part of the
 * shape's own container and therefore moves, zooms and rotates with it, and lands in export/print like any
 * other drawing element.
 *
 * WHAT IS SHOWN is decided by the widget's own `settings.t3EntryDisplayField` (the *Display field* row of the
 * Data section), exactly as the classic renderer did:
 *
 *   `title` set          the title; the linked entry is not drawn
 *   `none`               nothing at all — no box, no node
 *   `description`        the full label, then the value
 *   `label`              the short label, then the value
 *   `value` / `control`  the value only
 *   `id`                 the entry's id
 *   unset                the entry's id — the same fallback classic used
 *
 * TWO CONVENTIONS ARE COPIED FROM THE DESIGNER, NOT INVENTED HERE:
 *
 *  · **the reading.** The engine stores the device's `fValue`, which is the value ×1000, so a human reads
 *    `value / 1000` — the same arithmetic and the same trailing-zero trimming as the Data section's Value field
 *    (`HvacPropertiesPanel`: `formatNumber` + `value / 1000`). The classic canvas printed the stored number raw,
 *    which was right for the classic socket digest because that divided by 1000 on arrival
 *    (`IdxUtils.refreshLinkedEntries2`) — the designer's app state keeps the ×1000 form.
 *  · **the range words.** `IdxUtils.getEntryRange` — the engine's legacy table, and what both classic renderers
 *    used. The Data section and the picker read the point pages' tables instead (`PointRange`); that
 *    disagreement is documented in `PointRange`'s header and is deliberately not resolved here, so a drawing
 *    keeps printing the words it printed before.
 *
 * The controls (auto/manual padlock and the ▲/▼ nudge) live in `BindingLabelControls` beside this file and are
 * added into the same group.
 */
import OptConstant from "../../Data/Constant/OptConstant";
import IdxUtils from "./IdxUtils";
import QuasarUtil from "../Quasar/QuasarUtil";
import BindingControlUtil from "./BindingControlUtil";

/**
 * The label's box, in the shape's own coordinate space — the classic values.
 *
 * 30 tall and starting 40 above the shape, i.e. a 10 px gap, and at least as wide as the shape so a long full
 * label is not clipped by the box (SVG text never wraps, so the box only affects the background the controls
 * use, never the text's own line breaking).
 */
const LABEL_BOX = {
  width: 300,
  height: 30,
  offsetY: -40,
  fontSize: 13
};

/** Used when the widget carries no usable `settings.titleColor` (`inherit` is the tool default). */
const DEFAULT_FILL = "#242424";

/**
 * Marks the group this file adds, so a test (and a human, in DevTools) can find it.
 *
 * A **data attribute**, not an id: `SetID` writes through the engine's own id machinery and does not reliably
 * reach the DOM attribute, while a raw `id` attribute risks colliding with the engine's id-based lookups.
 */
const LABEL_ATTR = "data-t3-binding-label";

/**
 * The words and the unit a linked point's value is read with, as **the app** defines them.
 *
 * WHY A SEAM. A range is described twice in this codebase: the engine's legacy table (`IdxUtils.getEntryRange`,
 * `T3Data.ranges`) and the point pages' tables (`PointRange`). They disagree — the legacy table spells a
 * digital pair `on`/`off` with a `direct` flag that can swap the two, and its analog units are symbols (`°C`)
 * where the pages write `Deg.C`. The designer's inspector and picker read the pages' side, so a canvas using the
 * legacy words would name the same state differently from the panel sitting next to it.
 *
 * The engine cannot import the app's tables (nothing under `src/lib/t3-hvac/**` imports `@/t3-react/**`), so the
 * app hands its reading **in**. With no vocabulary installed the label keeps the legacy reading — which is what
 * the Vue canvases want and what they printed before this file existed.
 */
export interface BindingVocabulary {
  /** The unit an inspector row shows beside a value (`Deg.C`); empty for a digital point or an unknown range. */
  unit(entry: any): string;
  /** The two words a digital point's states are called in raw order, or `null` when the point has no state list. */
  states(entry: any): { zero: string; one: string } | null;
  /** Is this point's value a **state list** rather than a number? (A list needs a range that names its states.) */
  isSwitch(entry: any): boolean;
}

/** The installed vocabulary, or `null` while the engine's own legacy reading is in force. */
let vocabulary: BindingVocabulary | null = null;

class BindingLabelUtil {
  /**
   * Installs the app's reading of a range (see `BindingVocabulary`). Called once, by the designer that owns the
   * canvas; passing `null` puts the engine's legacy reading back.
   */
  static setVocabulary(next: BindingVocabulary | null): void {
    vocabulary = next;
  }

  /**
   * A number the way the Data section prints one: two decimals, trailing zeros gone, and an empty string — never
   * the literal `NaN` — for anything the engine could not supply.
   */
  static formatNumber(value: any): string {
    const number = Number(value);
    return Number.isFinite(number) ? String(Number(number.toFixed(2))) : "";
  }

  /** The reading a human sees for a stored value: the device's `fValue` (×1000) as engineering units. */
  static reading(rawValue: any): string {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return "";
    }
    const number = Number(rawValue);
    return Number.isFinite(number) ? BindingLabelUtil.formatNumber(number / 1000) : "";
  }

  /**
   * What the widget prints for the entry's **value**.
   *
   * The three cases, in this order, are the ones the Data section's Value row uses to decide between a state
   * list and a number field — the canvas and the panel have to agree or a widget shows one thing and its
   * properties show another:
   *
   *   1. a **multi-state** point names its state. The option list comes from the device's own MSV rows, so a
   *      range the device never configured has none — and then this is not a state list at all;
   *   2. a **digital** point whose range *names* its two states prints the word;
   *   3. **everything else** prints its reading.
   *
   * The second case is where the old rule went wrong, and it is worth spelling out. `digital_analog === 0`
   * alone is NOT enough to decide there are two words: the device reports `0` for a point whose field was never
   * written — every input of device 1028 is `digital_analog 0` with `range 0` — and such a point has no words
   * to print. Classic branched on the flag alone, so it printed `range.on`/`range.off` for a range that has
   * neither, i.e. an empty string, i.e. **nothing on the canvas at all**. Reported case: a widget bound to
   * `-6500800` (`IN2`, `digital_analog 0`, `range 0`) showed no value where the panel showed `-6500.8`.
   * The panel's own comment says the same thing: *"a list of states needs a range that names them"*.
   */
  static valueText(entry: any): string {
    if (!entry) {
      return "";
    }

    const range = IdxUtils.getEntryRange(entry);

    /* 1. Multi-state (MSV): the state's own name, never the raw number. */
    const option = range?.options?.find((item: any) => item.value === entry.value);
    if (option?.name) {
      return option.name;
    }

    /* 2. Digital with a range that names its two states. */
    if (vocabulary) {
      /*
       * The app's reading: the state's own word and the range's unit as the point pages spell them, so the canvas
       * and the properties panel never name the same state differently.
       */
      if (vocabulary.isSwitch(entry)) {
        const states = vocabulary.states(entry);
        if (states) {
          const raw = Number(entry.control !== undefined ? entry.control : entry.value);
          if (raw === 1) {
            return states.one;
          }
          if (raw === 0) {
            return states.zero;
          }
          /* A value the two-word list cannot contain: the panel shows an em dash, and so does the canvas. */
          return "\u2014";
        }
      }
    } else {
      /*
       * No vocabulary: the engine's legacy reading, i.e. exactly what the classic canvases print. This is the
       * default on purpose — nothing that does not install a vocabulary changes behaviour.
       */
      const digital = Number(entry.digital_analog) === 0;
      const namedStates = Boolean(range?.on || range?.off);
      if (digital && namedStates) {
        return entry.control ? range.on ?? "" : range.off ?? "";
      }
    }

    /* 3. The reading, as the Data section's Value field shows it. */
    const reading = BindingLabelUtil.reading(entry.value);
    if (!reading) {
      return "";
    }
    const unit = vocabulary ? vocabulary.unit(entry) : range?.unit ?? "";
    return unit ? `${reading} ${unit}` : reading;
  }

  /**
   * The whole label for one item, or `null` when this widget draws no label at all.
   *
   * `null` and `""` mean the same thing to the caller — a widget showing nothing gets no node, which is the fix
   * for the empty foreignObject this replaced.
   */
  static labelText(item: any): string | null {
    if (!item) {
      return null;
    }

    const settings = item.settings ?? {};
    const entry = item.t3Entry;

    /* A widget's own title outranks the link, as it did in classic (`v-if title … v-else-if t3Entry`). */
    if (settings.title) {
      return String(settings.title);
    }

    if (!entry || settings.t3EntryDisplayField === "none") {
      return null;
    }

    const field = settings.t3EntryDisplayField;
    const value = BindingLabelUtil.valueText(entry);

    if (field === "value" || field === "control") {
      return value || null;
    }

    if (field === "description") {
      return `${entry.description ?? ""} ${value}`.trim() || null;
    }

    if (field === "label") {
      return `${entry.label ?? ""} ${value}`.trim() || null;
    }

    if (field === "id") {
      return entry.id ? String(entry.id) : null;
    }

    /* Unset display field: the id, which is what the classic template fell back to. */
    return entry.id ? String(entry.id) : null;
  }

  /** The label's colour: the widget's own, or a neutral when it does not name one (`inherit`). */
  static labelFill(item: any): string {
    const colour = item?.settings?.titleColor;
    if (!colour || colour === "inherit") {
      return DEFAULT_FILL;
    }
    return String(colour);
  }

  /**
   * Adds the label to an object's freshly created container when that object is a **linked widget**.
   *
   * Called from `SvgUtil.AddSVGObject` — the one path every shape goes through — so a plain rectangle, an
   * oval and an SVG-symbol widget all behave the same. That is deliberately wider than classic's SVG canvas,
   * which only labelled symbol widgets (`S.SvgSymbol`) and left every other shape to the *drawer* page's DOM
   * overlay; a schematic is mostly plain shapes, so a binding on one of those has to show its text here.
   *
   * Nothing happens for a shape the app layer knows nothing about: an unlinked shape, or one whose record was
   * never written, has no entry to print.
   */
  static AddToShape(svgDocument: any, drawingData: any, shapeContainer: any): void {
    const uniqueId = drawingData?.uniqueId ?? drawingData?.UniqueID;
    if (!uniqueId) {
      return;
    }

    const apsItem = QuasarUtil.GetItemFromAPSV2(uniqueId);
    if (!apsItem || !apsItem.t3Entry) {
      return;
    }

    const label = BindingLabelUtil.CreateShape(svgDocument, drawingData.Frame, apsItem);
    if (label) {
      shapeContainer.AddElement(label);
    }
  }

  /**
   * The label as an engine element, ready to be added to a shape's container — or `null` when this widget shows
   * nothing.
   *
   * The returned element is a **container positioned in the shape's own coordinate space**, which is what makes
   * the text travel with the shape: the engine re-creates the whole container on every render, so the label is
   * rebuilt with it, and the shape's own transform (translate/rotate/scale) carries it along.
   */
  static CreateShape(svgDocument: any, frame: any, apsItem: any) {
    const text = BindingLabelUtil.labelText(apsItem);
    if (!text) {
      return null;
    }

    const width = Math.max(LABEL_BOX.width, Number(frame?.width) || 0);
    const height = LABEL_BOX.height;

    const group = svgDocument.CreateShape(OptConstant.CSType.ShapeContainer);
    group.SetSize(width, height);
    group.SetPos(0, LABEL_BOX.offsetY);

    const groupNode = group.DOMElement();
    const documentRef = groupNode?.ownerDocument ?? (typeof document !== "undefined" ? document : null);
    if (groupNode && documentRef) {
      groupNode.setAttribute(LABEL_ATTR, "1");
      /*
       * `pointer-events: none` on the group: the label sits above the shape and must never swallow a click
       * meant for the drawing underneath (the controls re-enable it on themselves).
       */
      groupNode.setAttribute("pointer-events", "none");

      const textNode = documentRef.createElementNS("http://www.w3.org/2000/svg", "text");
      /*
       * The controls (padlock, ▲/▼) sit first in the box, so the text starts after them when they are present —
       * their positions are fixed, which is the only way to lay out SVG text with no flow to rely on.
       */
      textNode.setAttribute("x", String(BindingControlUtil.textOffset(apsItem)));
      /*
       * `dominant-baseline`, not `alignment-baseline`: Blink ignores the latter, and the text would then be
       * positioned by its alphabetic baseline — i.e. drawn entirely above the box.
       */
      textNode.setAttribute("dominant-baseline", "middle");
      textNode.setAttribute("y", String(height / 2));
      textNode.setAttribute("font-size", String(LABEL_BOX.fontSize));
      textNode.setAttribute("fill", BindingLabelUtil.labelFill(apsItem));
      /* SVG text never wraps — the classic rule was `white-space: nowrap`, which this gives for free. */
      textNode.textContent = text;

      groupNode.appendChild(textNode);

      /* The auto/manual padlock and the ▲/▼ nudge — see `BindingControlUtil` for what each click writes. */
      BindingControlUtil.AddControls(groupNode, apsItem);
    }

    return group;
  }
}

export default BindingLabelUtil;
