

/**
 * Represents a point in a path with additional attributes for movement and curve control.
 *
 * @remarks
 * This class is used to store the coordinates of a point (x, y) along with metadata
 * that controls how paths are drawn. The properties include:
 *
 * - x, y: The coordinates of the point.
 * - moveto: A flag indicating whether this point starts a new subpath.
 * - arrowhead: A flag indicating whether an arrowhead should be drawn at this point.
 * - curvex, curvey: Coordinates for the control point used in curve drawing.
 *
 * These properties facilitate flexible drawing operations, such as differentiating between
 * moving to a new point or drawing a line to the next point, as well as rendering curves
 * when needed.
 *
 * @example
 * Creating a PathPoint instance:
 *
 * const point = new PathPoint(100, 200, true, false, 50, 50);
 * console.log(`Point at (${point.x}, ${point.y}) with curve control at (${point.curvex}, ${point.curvey})`);
 */
class PathPoint {

  public x: number;
  public y: number;
  public moveto: boolean;
  public arrowhead: boolean;
  public curvex: number;
  public curvey: number;

  constructor(x?: number, y?: number, moveto?: boolean, arrowhead?: boolean, curvex?: number, curvey?: number) {
    this.x = x || 0;
    this.y = y || 0;
    this.moveto = moveto || false;
    this.arrowhead = arrowhead || false;
    this.curvex = curvex || 0;
    this.curvey = curvey || 0;
  }
}

export default PathPoint
