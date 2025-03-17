

import Path from "./B.Path"

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
