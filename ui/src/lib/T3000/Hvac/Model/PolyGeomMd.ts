

/**
 * Represents a polygon geometry model with configurable fill, outline, closure, and offset properties.
 *
 * @remarks
 * The PolyGeometryModel class is designed to encapsulate the geometric properties of a polygon,
 * particularly in the context of HVAC control systems. It allows for the specification of whether the polygon
 * should be filled or outlined (or both), whether it is closed, and defines an offset value along with the number
 * of points that define the polygon's shape.
 *
 * Properties:
 * - NoFill: Determines if the polygon should not be filled.
 * - NoLine: Determines if the polygon should not have an outline.
 * - Closed: Indicates if the polygon is closed.
 * - Offset: The offset value applied to the polygon.
 * - NPoints: The total number of points that compose the polygon.
 * - MoveTo: A placeholder for an array of coordinate values (initially empty).
 * - shapeid: A numerical identifier for the shape.
 *
 * @example
 * // Create a new polygon geometry model instance with defined parameters:
 * const polygon = new PolyGeomMd(
 *   false, // noFill: Polygon will be filled.
 *   true,  // noLine: Polygon will not have an outline.
 *   true,  // closed: Polygon is closed.
 *   10,    // offset: Offset value for positioning.
 *   5      // numPoints: The polygon consists of 5 points.
 * );
 *
 * console.log(polygon);
 *
 * @public
 */
class PolyGeomMd {

  NoFill: boolean;
  NoLine: boolean;
  Closed: boolean;
  Offset: number;
  NPoints: number;
  MoveTo: any[];
  shapeid: number;

  /**
   * Creates a new PolyGeomMd instance
   * @param noFill - Whether the polygon should be filled
   * @param noLine - Whether the polygon should have an outline
   * @param closed - Whether the polygon is closed
   * @param offset - Offset value for the polygon
   * @param numPoints - Number of points in the polygon
   */
  constructor(noFill: boolean, noLine: boolean, closed: boolean, offset: number, numPoints: number) {
    this.NoFill = noFill;
    this.NoLine = noLine;
    this.Closed = closed;
    this.Offset = offset;
    this.NPoints = numPoints;
    this.MoveTo = [];
    this.shapeid = 0;
  }
}

export default PolyGeomMd
