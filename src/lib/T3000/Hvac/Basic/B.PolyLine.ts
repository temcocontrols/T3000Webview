

import Path from "./B.Path"

/**
 * Represents a polyline path composed of multiple connected points.
 *
 * The PolyLine class extends the Path class and provides functionality to define a polyline
 * using an array of points with x and y coordinates. It calculates both a string representation
 * of the path and its bounding box based on the provided points.
 *
 * The bounding box is determined by computing the minimum and maximum coordinates among the points.
 * The first point initializes the path and sets the initial bounding box, and subsequent points
 * are added to extend the path and update the bounding box accordingly.
 *
 * @remarks
 * - Uses a helper called PathCreator to construct the path string.
 * - The bounding box is represented as an object with x, y, width, and height properties.
 * - If the provided points array has one or fewer points, the path is not fully created.
 *
 * @example
 * Here is an example of how to use the PolyLine class:
 * ```typescript
 * const polyline = new PolyLine();
 * const points = [
 *   { x: 10, y: 20 },
 *   { x: 15, y: 25 },
 *   { x: 20, y: 20 }
 * ];
 * polyline.SetPoints(points);
 *
 * // The polyline now contains a computed path definition and a bounding box:
 * // boundingBox: { x: 10, y: 20, width: 10, height: 5 }
 * ```
 */
class PolyLine extends Path {

  constructor() {
    super()
  }

  /**
   * Sets the polyline by defining its points and calculates the bounding box
   * @param polylinePoints - Array of points with x and y coordinates that define the polyline
   */
  SetPoints(polylinePoints: { x: number, y: number }[]) {
    const pathCreator = this.PathCreator();
    const minCoord = { x: 0, y: 0 };
    const maxCoord = { x: 0, y: 0 };
    const pointCount = polylinePoints.length;

    pathCreator.BeginPath();

    if (pointCount > 1) {
      const startPoint = polylinePoints[0];
      pathCreator.MoveTo(startPoint.x, startPoint.y);
      minCoord.x = maxCoord.x = startPoint.x;
      minCoord.y = maxCoord.y = startPoint.y;
    }

    for (let i = 1; i < pointCount; i++) {
      const currentPoint = polylinePoints[i];
      pathCreator.LineTo(currentPoint.x, currentPoint.y);

      minCoord.x = Math.min(minCoord.x, currentPoint.x);
      minCoord.y = Math.min(minCoord.y, currentPoint.y);
      maxCoord.x = Math.max(maxCoord.x, currentPoint.x);
      maxCoord.y = Math.max(maxCoord.y, currentPoint.y);
    }

    const pathDefinition = pathCreator.ToString();
    const boundingBox = {
      x: minCoord.x,
      y: minCoord.y,
      width: maxCoord.x - minCoord.x,
      height: maxCoord.y - minCoord.y
    };

    this.SetPath(pathDefinition, boundingBox);
  }

}

export default PolyLine
