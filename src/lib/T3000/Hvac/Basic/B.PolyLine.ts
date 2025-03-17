

import Path from "./B.Path"

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
