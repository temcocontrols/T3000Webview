

/**
 * Represents the data associated with a right-click event on an HVAC element.
 *
 * @remarks
 * This class encapsulates detailed information for handling right-click interactions,
 * including the identifier of the clicked target, the specific segment of the element,
 * the exact position of the click event, the locked state of the element, and a context
 * number that can be used to determine additional conditions or behaviors within the system.
 *
 * Properties:
 * - targetId: A unique numerical identifier for the target element. Defaults to -1 indicating
 *   that no valid target is currently selected.
 * - segment: A number representing a specific segment of the target element. Defaults to -1,
 *   suggesting no segment is selected.
 * - hitPoint: An object containing the x and y coordinates of the click event. The default
 *   coordinates are set to { x: 0, y: 0 }.
 * - locked: A boolean flag indicating if the target element is locked. The default is false.
 * - context: A numeric value that can carry additional context or state information. Defaults to 0.
 *
 * @example
 * Creating and using an instance of RightClickMd:
 * ```typescript
 * const rcm = new RightClickMd();
 * rcm.targetId = 101;
 * rcm.segment = 3;
 * rcm.hitPoint = { x: 120, y: 250 };
 * rcm.locked = true;
 * rcm.context = 2;
 *
 * // The instance now holds all the necessary data for handling a right-click event.
 * console.log(rcm);
 * ```
 *
 * @class
 */
class RightClickMd {

  public targetId: number;
  public segment: number;
  public hitPoint: { x: number, y: number };
  public locked: boolean;
  public context: number;

  constructor() {
    this.targetId = -1;
    this.segment = -1;
    this.hitPoint = { x: 0, y: 0 };
    this.locked = false;
    this.context = 0;
  }
}

export default RightClickMd
