

import Path from "./Basic.Path"

class Line extends Path {

  constructor() {
    super()
  }

  SetPoints(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) {
    console.log('= B.Line SetPoints startX,startY,endX,endY', startX, startY, endX, endY);

    const pathCreator = this.PathCreator();
    pathCreator.BeginPath();
    pathCreator.MoveTo(startX, startY);
    pathCreator.LineTo(endX, endY);

    const pathString = pathCreator.ToString();

    this.SetPath(pathString, {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY),
    });
  }
}

export default Line
