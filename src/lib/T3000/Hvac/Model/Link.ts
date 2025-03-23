
/**
 * Represents a connection between a target and a hook within the HVAC system.
 *
 * @remarks
 * The Link class manages identifiers that establish a relationship between different HVAC components:
 * - targetid: The identifier representing the target element.
 * - hookid: The identifier representing the hook element.
 * - flags: A field reserved for future settings; it is initialized to 0 by default.
 * - cellid: The identifier of the cell element, indicating additional context or location.
 *
 * This class provides a simple structure for linking components, where the responsibility of setting or modifying the flags is managed externally.
 *
 * @example
 * ```typescript
 * // Creating a new Link instance connecting target 1 with hook 202 in cell 3
 * const link = new Link(1, 202, 3);
 * console.log(link);
 * // Expected output:
 * // Link { targetid: 1, hookid: 202, flags: 0, cellid: 3 }
 * ```
 *
 * @public
 */
class Link {
  public targetid: number;
  public hookid: number;
  public flags: number;
  public cellid: number;

  constructor(targetid: number, hookid: number, cellid: number) {
    this.targetid = targetid || 0;
    this.hookid = hookid || 0;
    this.flags = 0;
    this.cellid = cellid;
  }
}

export default Link
