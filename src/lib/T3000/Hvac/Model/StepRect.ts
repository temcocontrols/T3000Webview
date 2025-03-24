

/**
 * Represents a rectangular region defined by its horizontal and vertical start and end coordinates.
 *
 * @remarks
 * The StepRect class holds four properties:
 * - h: The horizontal starting coordinate.
 * - v: The vertical starting coordinate.
 * - hend: The horizontal ending coordinate.
 * - vend: The vertical ending coordinate.
 *
 * These properties can be used to define boundaries or zones, such as in HVAC control systems for specifying regions.
 * If any value is not provided, it defaults to 0.
 *
 * @example
 * Here's an example of how to create and use a StepRect instance:
 *
 * ```typescript
 * // Create a new StepRect with specified coordinates.
 * const rect = new StepRect(10, 20, 30, 40);
 *
 * // Access the properties of the rectangle.
 * console.log(`Horizontal start: ${rect.h}, Vertical start: ${rect.v}`);
 * console.log(`Horizontal end: ${rect.hend}, Vertical end: ${rect.vend}`);
 * ```
 *
 * @public
 */
class StepRect {

  public h: number;
  public v: number;
  public hend: number;
  public vend: number;

  constructor(e: number, t: number, a: number, r: number) {
    this.h = e || 0;
    this.v = t || 0;
    this.hend = a || 0;
    this.vend = r || 0;
  }
}

export default StepRect
