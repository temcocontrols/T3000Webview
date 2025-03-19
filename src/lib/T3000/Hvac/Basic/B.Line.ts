

import Path from "./B.Path"

/**
 * Represents a simple line path defined by a starting point and an ending point.
 *
 * This class extends the base Path class and provides functionality for creating and
 * managing a line segment by specifying its start and end coordinates. The line is internally
 * built as a path string that can be rendered or further manipulated.
 *
 * @example
 * // Creating a new line instance and setting its start and end points:
 * const line = new Line();
 * line.SetPoints(10, 20, 30, 40);
 *
 * // The line now represents a segment from (10, 20) to (30, 40) and the path has been internally set.
 */
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
