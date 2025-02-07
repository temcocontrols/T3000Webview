

import Path from "./Basic.Path"

class PolyLine extends Path {

  constructor() {
    super()
  }

  SetPoints(points: { x: number; y: number }[]): void {
    console.log("= B.PolyLine Input:", points);

    let index: number;
    const creator = this.PathCreator();
    let minPoint = { x: 0, y: 0 };
    let maxPoint = { x: 0, y: 0 };
    const numPoints = points.length;

    creator.BeginPath();

    if (numPoints > 1) {
      creator.MoveTo(points[0].x, points[0].y);
      minPoint.x = maxPoint.x = points[0].x;
      minPoint.y = maxPoint.y = points[0].y;
    }

    for (index = 1; index < numPoints; index++) {
      creator.LineTo(points[index].x, points[index].y);
      minPoint.x = Math.min(minPoint.x, points[index].x);
      minPoint.y = Math.min(minPoint.y, points[index].y);
      maxPoint.x = Math.max(maxPoint.x, points[index].x);
      maxPoint.y = Math.max(maxPoint.y, points[index].y);
    }

    const pathString = creator.ToString();

    const boundingBox = {
      x: minPoint.x,
      y: minPoint.y,
      width: maxPoint.x - minPoint.x,
      height: maxPoint.y - minPoint.y,
    };

    console.log("= B.PolyLine Output pathString:", pathString);
    console.log("= B.PolyLine Output boundingBox:", boundingBox);

    this.SetPath(pathString, boundingBox);
  }
}

export default PolyLine
