


/**
 * Represents the result of a hit detection operation.
 *
 * This class stores information about a hit event, including the identifier of the object that was hit,
 * a code indicating the nature of the hit, and an optional cell identifier. Additionally, it holds details
 * about the hit's segment index and the coordinates of the hit point.
 *
 * @remarks
 * The information encapsulated by this class is typically used in graphical operations such as hit testing,
 * where it is necessary to determine which object or region within a canvas or UI component is affected by a user action.
 *
 * The default values for the properties are:
 * - objectid: defaults to 0 (if no value is provided),
 * - hitcode: defaults to 0,
 * - cellid: defaults to 0,
 * - segment: initialized to -1,
 * - pt: an object with x and y properties set to 0.
 *
 * @example
 * Here's an example of how to create and use a HitResult instance:
 *
 * ```typescript
 * // Create a new hit result with an object id of 1, a hit code of 2, and a cell id of 3.
 * const hitResult = new HitResult(1, 2, 3);
 *
 * // Optionally update the segment and point where the hit was detected.
 * hitResult.segment = 5;
 * hitResult.pt = { x: 50, y: 100 };
 *
 * console.log(hitResult);
 * ```
 *
 * @param objectId - The identifier for the hit object. Defaults to 0 if no value is provided.
 * @param hitCode - A numeric code that indicates the manner in which the object was hit. Defaults to 0 if not provided.
 * @param cellId - The identifier of the cell that was hit. Useful when the hit is specific to a sub-region, defaults to 0.
 */
class HitResult {
  public objectid: number;
  public hitcode: number;
  public cellid: number;
  public segment: number;
  public pt: { x: number, y: number };

  /**
   * Creates a new hit result instance
   * @param objectId - The ID of the object that was hit
   * @param hitCode - The code indicating how the object was hit
   * @param cellId - The ID of the cell that was hit, if applicable
   */
  constructor(objectId: number, hitCode: number, cellId: number) {
    this.objectid = objectId || 0;
    this.hitcode = hitCode || 0;
    this.cellid = cellId || 0;
    this.segment = -1;
    this.pt = { x: 0, y: 0 };
  }
}

export default HitResult
