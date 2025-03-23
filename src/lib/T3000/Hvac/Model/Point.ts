
/**
 * Represents a point in a two-dimensional coordinate system.
 *
 * The Point class encapsulates two numeric properties: x and y. It provides a simple data structure
 * for storing coordinate values. If either coordinate value is falsy (e.g., undefined, null, or 0),
 * it defaults to 0.
 *
 * @example
 * // Create a point at coordinates (5, 10)
 * const p = new Point(5, 10);
 *
 * @example
 * // Create a point while defaulting coordinates to zero (if falsy values are provided)
 * const origin = new Point(undefined, undefined);
 *
 * @remarks
 * Both properties x and y are publicly accessible and can be directly modified.
 */
class Point {

  public x: number;
  public y: number;

  constructor(x: number, y: number) {
    this.x = x || 0;
    this.y = y || 0;
  }
}

export default Point
