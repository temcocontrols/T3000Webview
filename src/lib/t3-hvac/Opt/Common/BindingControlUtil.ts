/**
 * BindingControlUtil — the two controls a linked widget carries with its label: the **auto/manual padlock** and
 * the **▲/▼ nudge**.
 *
 * Drawn as plain SVG inside the label's group (see `BindingLabelUtil`), so they sit above the shape, travel with
 * it under move/zoom/rotate, and need no HTML in the canvas.
 *
 * ## Why these two
 *
 * A point is either **Auto** (the controller's program writes it) or **Manual** (an operator has taken it over).
 * Writing to an Auto point would be overwritten on the next scan, so the operator needs a way to take it over
 * first — the padlock — and then a way to change it — the arrows. The padlock is shown whenever the entry has an
 * `auto_manual` flag at all (programs, schedules and screens have none).
 *
 * **Icon mapping (decided):** a *closed* padlock means **Manual** (the point is held at your value, the program is
 * locked out) and an *open* one means **Auto** (the program drives it). Classic renders the opposite of its own
 * tooltip — `ObjectType3.vue` draws a closed padlock for Auto while the tooltip on the same element says "In auto
 * mode" — and the block above it in that file has the mapping the other way round, so the classic rendering is
 * treated as a bug rather than preserved.
 *
 * ## What a click writes
 *
 * Exactly what the Data section's Value row writes for the same point, because a canvas that disagreed with the
 * panel by a factor of 1000 (classic nudged by `value ± 1` and leaned on the engine's divide) would be worse than
 * no control at all:
 *
 *   multi-state (the range carries options)  step to the next/previous state, committed as the option's own value
 *   digital with a range that names states   toggle `control`
 *   everything else                          ± 1 engineering unit, committed ×1000
 *
 * The commit itself is the panel's sequence verbatim — mutate the live item, push to the device, refresh the
 * status, repaint, save — see `HvacPropertiesPanel.commitEntryField`.
 *
 * The arrows are **enabled in both modes**, matching that panel: it deliberately never disables its fields
 * ("greying it out while the point is in AUTO … left no way to change it at all"), so the canvas must not be
 * stricter than the panel it sits beside. The padlock tells the operator which mode the point is in.
 */
import Hvac from "../../Hvac";
import EvtOpt from "../../Event/EvtOpt";
import IdxUtils from "./IdxUtils";
import SvgUtil from "../Opt/SvgUtil";
import LogUtil from "../../Util/LogUtil";

const SVG_NS = "http://www.w3.org/2000/svg";

/** The controls' ink — the same neutral the label text falls back to. */
const INK = "#242424";

/**
 * Layout, in the label box's own coordinates (30 px tall, the shape's left edge is x = 0).
 *
 * The controls sit **first**, left of the text: their positions are then fixed whatever the label says, while
 * text after them simply overflows to the right for a long full label (SVG text never wraps).
 */
const LAYOUT = {
  /** Padlock: 12 wide, vertically centred on the box's middle. */
  padlock: { x: 0, y: 8, w: 12, h: 16 },
  /** The two arrows, stacked: ▲ over ▼. */
  arrows: { x: 14, y: 5, w: 12, h: 20 },
  /** Where the label text starts — zero when a widget has no controls. */
  textX: 30
};

class BindingControlUtil {
  /** Does this entry have a mode at all? Programs, schedules and screens report no `auto_manual`. */
  static hasMode(entry: any): boolean {
    return entry?.auto_manual !== undefined && entry?.auto_manual !== null;
  }

  /**
   * Are the arrows meaningful for this widget?
   *
   * Only when the label is showing a **value** — a widget printing a label or a full label has nothing numeric to
   * nudge — and never on a `Switch`, which is itself the control (the classic rule).
   */
  static hasArrows(item: any): boolean {
    if (!item?.t3Entry || item?.type === "Switch") {
      return false;
    }
    const field = item.settings?.t3EntryDisplayField;
    return field === "value" || field === "control";
  }

  /** Where the label text must start so it does not collide with the controls. */
  static textOffset(item: any): number {
    if (BindingControlUtil.hasMode(item?.t3Entry) || BindingControlUtil.hasArrows(item)) {
      return LAYOUT.textX;
    }
    return 0;
  }

  /**
   * Push one field of the linked entry to the device — the panel's own write sequence, not a copy of its maths.
   *
   * Deliberate cycle: `SvgUtil` imports `BindingLabelUtil` which imports this file, so this file's import of
   * `SvgUtil` closes a loop. It is call-time only — nothing here touches `SvgUtil` while the modules evaluate —
   * which is the benign case for ES modules.
   */
  static commitField(apsItem: any, field: string, value: number): void {
    const live = apsItem?.t3Entry;
    if (!live) {
      return;
    }

    try {
      live[field] = value;
      const page: any = (Hvac as any)?.IdxPageReact ?? (Hvac as any)?.IdxPage;
      page?.T3UpdateEntryField?.(field, apsItem);
      IdxUtils.refreshObjectStatus(apsItem);
      SvgUtil.RenderAllSVGObjects();
      EvtOpt.toolOpt.SaveAct();
    } catch (error) {
      LogUtil.Error("= BindingControlUtil.commitField failed:", field, error);
    }
  }

  /** Take the point over, or hand it back: `auto_manual` 1 = Manual, 0 = Auto. */
  static toggleMode(apsItem: any): void {
    const autoManual = Number(apsItem?.t3Entry?.auto_manual);
    BindingControlUtil.commitField(apsItem, "auto_manual", autoManual === 1 ? 0 : 1);
  }

  /**
   * Step the value by one, in the way this point's Value row in the panel steps it.
   *
   * `direction` is **+1 for ▲ (up the list)** and −1 for ▼.
   */
  static nudge(apsItem: any, direction: 1 | -1): void {
    const entry = apsItem?.t3Entry;
    if (!entry) {
      return;
    }

    const range = IdxUtils.getEntryRange(entry);

    /* Multi-state: the states the Value list shows are the range's own options (the device's rows). */
    const options = (range?.options ?? []).filter((option: any) => option.status === 1);
    if (options.length) {
      const index = options.findIndex((option: any) => option.value === entry.value);
      const next = index === -1 ? 0 : index - direction;
      if (next >= 0 && next < options.length) {
        BindingControlUtil.commitField(apsItem, "value", options[next].value);
      }
      return;
    }

    /* A digital point whose range names its two states: the command field, toggled. */
    if (Number(entry.digital_analog) === 0 && (range?.on || range?.off)) {
      BindingControlUtil.commitField(apsItem, "control", entry.control ? 0 : 1);
      return;
    }

    /* Everything else is a number, and the panel's field stores it ×1000 (the engine divides on the way out). */
    const reading = Number(entry.value) / 1000;
    if (!Number.isFinite(reading)) {
      return;
    }
    BindingControlUtil.commitField(apsItem, "value", Math.round((reading + direction) * 1000));
  }

  /** A `<path>`/`<rect>` helper: one visible glyph, no event wiring of its own. */
  private static node(documentRef: any, tag: string, attributes: Record<string, string | number>) {
    const element = documentRef.createElementNS(SVG_NS, tag);
    Object.keys(attributes).forEach((name) => element.setAttribute(name, String(attributes[name])));
    return element;
  }

  /**
   * One clickable control: an invisible hit rectangle (so a hairline glyph is still easy to hit), the glyph, a
   * native `<title>` tooltip, and the two event listeners that keep the engine out of it.
   *
   * Why the listeners: `SvgUtil.AddSVGObject` binds a Hammer instance to every shape's container
   * (`new Hammer(shapeContainer.DOMElement())`, `tap` + `dragstart`). A click on a control therefore reaches the
   * container as well, which would select the shape or start a drag — so the pointer events are stopped here,
   * where the control still sees them first.
   */
  private static control(
    documentRef: any,
    hit: { x: number; y: number; w: number; h: number },
    glyph: any[],
    tooltip: string,
    onActivate: () => void
  ) {
    const group = BindingControlUtil.node(documentRef, "g", {
      "pointer-events": "all",
      cursor: "pointer"
    });

    const title = BindingControlUtil.node(documentRef, "title", {});
    title.textContent = tooltip;
    group.appendChild(title);

    group.appendChild(
      BindingControlUtil.node(documentRef, "rect", {
        x: hit.x,
        y: hit.y,
        width: hit.w,
        height: hit.h,
        fill: "none",
        "pointer-events": "all"
      })
    );

    glyph.forEach((element) => group.appendChild(element));

    const stop = (event: any) => {
      event.stopPropagation();
      event.preventDefault?.();
    };
    group.addEventListener("pointerdown", stop);
    group.addEventListener("click", (event: any) => {
      stop(event);
      onActivate();
    });

    return group;
  }

  /** The padlock: a body plus a square shackle, offset to the right when the point is not held. */
  private static padlock(documentRef: any, manual: boolean) {
    const body = BindingControlUtil.node(documentRef, "rect", {
      x: 1,
      y: 14,
      width: 10,
      height: 7,
      rx: 1.5,
      fill: INK
    });
    /* Open = the shackle's legs shifted right, so it is no longer seated on the body. */
    const legs = manual ? "M3 14 V11 H9 V14" : "M7 14 V11 H13 V14";
    const shackle = BindingControlUtil.node(documentRef, "path", {
      d: legs,
      fill: "none",
      stroke: INK,
      "stroke-width": 1.6
    });
    return [shackle, body];
  }

  /** The two triangles, drawn from one hit box. */
  private static arrow(documentRef: any, up: boolean) {
    const { x, y, w } = LAYOUT.arrows;
    const base = up ? y + 8 : y + 12;
    const apex = up ? y : y + 20;
    return BindingControlUtil.node(documentRef, "path", {
      d: `M${x} ${base} L${x + w / 2} ${apex} L${x + w} ${base} Z`,
      fill: INK
    });
  }

  /**
   * Adds the controls to a widget's label group. Returns without touching the DOM when the widget has neither a
   * mode nor a nudgeable value.
   */
  static AddControls(groupNode: any, apsItem: any): void {
    const documentRef = groupNode?.ownerDocument ?? (typeof document !== "undefined" ? document : null);
    if (!groupNode || !documentRef) {
      return;
    }

    const entry = apsItem?.t3Entry;
    const showPadlock = BindingControlUtil.hasMode(entry);
    const showArrows = BindingControlUtil.hasArrows(apsItem);
    if (!showPadlock && !showArrows) {
      return;
    }

    /*
     * The controls are engine furniture, not drawing content: `no-export` keeps them out of print/export while
     * the label's text stays in it (the same attribute the engine's own `ExcludeFromExport` sets).
     */
    const controls = BindingControlUtil.node(documentRef, "g", { "no-export": "1" });

    if (showPadlock) {
      const manual = Number(entry.auto_manual) === 1;
      const tooltip = manual
        ? "Manual — held at your value. Click to return to auto."
        : "Auto — controlled by program. Click to take manual control.";
      controls.appendChild(
        BindingControlUtil.control(documentRef, LAYOUT.padlock, BindingControlUtil.padlock(documentRef, manual), tooltip, () =>
          BindingControlUtil.toggleMode(apsItem)
        )
      );
    }

    if (showArrows) {
      const { x, y, w } = LAYOUT.arrows;
      controls.appendChild(
        BindingControlUtil.control(
          documentRef,
          { x, y, w, h: 10 },
          [BindingControlUtil.arrow(documentRef, true)],
          "Increase by one",
          () => BindingControlUtil.nudge(apsItem, 1)
        )
      );
      controls.appendChild(
        BindingControlUtil.control(
          documentRef,
          { x, y: y + 10, w, h: 10 },
          [BindingControlUtil.arrow(documentRef, false)],
          "Decrease by one",
          () => BindingControlUtil.nudge(apsItem, -1)
        )
      );
    }

    groupNode.appendChild(controls);
  }
}

export default BindingControlUtil;
