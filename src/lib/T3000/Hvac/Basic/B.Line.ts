

import Path from "./B.Path"

class Line extends Path {

  constructor() {
    super()
  }

  /**
   * Sets the start and end points of a line and creates the corresponding path
   * @param startX - The x-coordinate of the starting point
   * @param startY - The y-coordinate of the starting point
   * @param endX - The x-coordinate of the ending point
   * @param endY - The y-coordinate of the ending point
   */
  SetPoints(startX: number, startY: number, endX: number, endY: number): void {
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
