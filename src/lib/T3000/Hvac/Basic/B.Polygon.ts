

import Path from "./B.Path"

/**
 * Class representing a polygon, a specialized path shape composed of multiple connected vertices.
 *
 * The Polygon class builds a path shape using a list of points with x and y coordinates that
 * represent the vertices of the polygon. It leverages a path creator (from the base Path class)
 * to compile the shape into a string representation and calculates the minimal bounding rectangle
 * that encloses the polygon.
 *
 * @remarks
 * - A valid polygon should be defined with at least two points. The first point initiates the path,
 *   and subsequent points extend it with line segments.
 * - During the SetPoints operation, the minimal and maximal x/y values are computed to determine the
 *   bounding box of the shape.
 * - Internally, a path creator is used to start, continue, and finally close the path based on the given points.
 *
 * @example
 * ```typescript
 * const polygon = new Polygon();
 * polygon.SetPoints([
 *   { x: 10, y: 10 },
 *   { x: 50, y: 10 },
 *   { x: 50, y: 50 },
 *   { x: 10, y: 50 }
 * ]);
 * // The polygon now represents a square with a bounding rectangle from (10, 10) with width 40 and height 40.
 * ```
 */

/**
 * Sets the vertices of the polygon and updates its path representation.
 *
 * This method initializes a new drawing path and computes the bounding rectangle by tracking
 * the minimal and maximal x and y values among the provided points. The path is constructed by:
 * - Moving to the first vertex.
 * - Drawing line segments to each subsequent vertex.
 * - Closing the path if more than one point is provided.
 *
 * The resulting path string and bounding rectangle (defined by x, y, width, and height) are then
 * used to update the polygon's representation.
 *
 * @param polygonPoints - An array of points where each point is an object with numeric properties 'x' and 'y'.
 *
 * @remarks
 * - At least two points are required to form an enclosed polygon (i.e., to close the path).
 * - The bounding rectangle is determined by the minimum and maximum coordinate values among the vertices.
 */
class Polygon extends Path {

  constructor() {
    super()
  }

  /**
   * Sets points that define the polygon and updates the path
   * @param polygonPoints - Array of points with x and y coordinates that define the polygon vertices
   */
  SetPoints(polygonPoints: { x: number, y: number }[]) {
    let pathCreator = this.PathCreator();
    let minCoordinate = { x: 0, y: 0 };
    let maxCoordinate = { x: 0, y: 0 };
    let pointCount = polygonPoints.length;

    pathCreator.BeginPath();

    if (pointCount > 1) {
      pathCreator.MoveTo(polygonPoints[0].x, polygonPoints[0].y);
      minCoordinate.x = maxCoordinate.x = polygonPoints[0].x;
      minCoordinate.y = maxCoordinate.y = polygonPoints[0].y;
    }

    for (let i = 1; i < pointCount; i++) {
      pathCreator.LineTo(polygonPoints[i].x, polygonPoints[i].y);
      minCoordinate.x = Math.min(minCoordinate.x, polygonPoints[i].x);
      minCoordinate.y = Math.min(minCoordinate.y, polygonPoints[i].y);
      maxCoordinate.x = Math.max(maxCoordinate.x, polygonPoints[i].x);
      maxCoordinate.y = Math.max(maxCoordinate.y, polygonPoints[i].y);
    }

    if (pointCount > 1) {
      pathCreator.ClosePath();
    }

    let pathString = pathCreator.ToString();
    this.SetPath(pathString, {
      x: minCoordinate.x,
      y: minCoordinate.y,
      width: maxCoordinate.x - minCoordinate.x,
      height: maxCoordinate.y - minCoordinate.y
    });
  }

}

export default Polygon
