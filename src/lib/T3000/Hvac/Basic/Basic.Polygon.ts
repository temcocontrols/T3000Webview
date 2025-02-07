

import Path from "./Basic.Path"

class Polygon extends Path {

  constructor() {
    super()
  }

  SetPoints(e: { x: number; y: number }[]) {
    console.log("B.Polygon: Input points:", e);

    const pathCreator = this.PathCreator();
    let minPoint = { x: 0, y: 0 };
    let maxPoint = { x: 0, y: 0 };
    const n = e.length;

    // Begin drawing the path
    pathCreator.BeginPath();

    if (n > 1) {
      // Start with the first point
      pathCreator.MoveTo(e[0].x, e[0].y);
      minPoint = { x: e[0].x, y: e[0].y };
      maxPoint = { x: e[0].x, y: e[0].y };
    } else if (n === 1) {
      // If only one point, use it as both min and max
      minPoint = { x: e[0].x, y: e[0].y };
      maxPoint = { x: e[0].x, y: e[0].y };
    }

    // Process remaining points
    for (let t = 1; t < n; t++) {
      pathCreator.LineTo(e[t].x, e[t].y);
      minPoint.x = Math.min(minPoint.x, e[t].x);
      minPoint.y = Math.min(minPoint.y, e[t].y);
      maxPoint.x = Math.max(maxPoint.x, e[t].x);
      maxPoint.y = Math.max(maxPoint.y, e[t].y);
    }

    // Close the path if there are enough points
    if (n > 1) {
      pathCreator.ClosePath();
    }

    // Convert path to string and log the output
    const pathString = pathCreator.ToString();
    console.log("B.Polygon: Generated path string:", pathString);

    // Calculate bounding box and log the result
    const boundingBox = {
      x: minPoint.x,
      y: minPoint.y,
      width: maxPoint.x - minPoint.x,
      height: maxPoint.y - minPoint.y,
    };
    console.log("B.Polygon: Calculated bounding box:", boundingBox);

    // Set the path with its bounding box
    this.SetPath(pathString, boundingBox);
  }
}

export default Polygon
