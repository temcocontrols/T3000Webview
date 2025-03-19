

import Path from "./B.Path";


/**
 * Represents a rounded rectangle path that can be drawn with curved corners.
 *
 * This class extends Path and provides methods to define a rounded rectangle
 * with specific dimensions and customizable corner radii. The class ensures
 * that the corner radii do not exceed half the width or height of the rectangle,
 * thereby preserving valid and visually appealing rounded corners.
 *
 * The main methods include:
 *
 * - SetRRectSize(width: number, height: number, cornerRadiusX: number, cornerRadiusY: number):
 *   Defines the overall dimensions of the rectangle and its corner radii.
 *   It calculates the inner width and height based on given radii and constructs the
 *   path accordingly. If either corner radius is zero, a standard rectangle path
 *   is created.
 *
 * - SetSize(width: number, height: number):
 *   Updates the rectangle dimensions while preserving the last set corner radii.
 *
 * @example
 * // Create a new rounded rectangle instance
 * const roundedRect = new RRect();
 *
 * // Set a rounded rectangle with width 100, height 50, and corner radii of 10 for both axes
 * roundedRect.SetRRectSize(100, 50, 10, 10);
 *
 * // Later, update the size while keeping the existing corner radii
 * roundedRect.SetSize(150, 75);
 *
 * @remarks
 * The class uses an internal path creator to build the path string for rendering the shape.
 */
class RRect extends Path {

  public rx: number;
  public ry: number;

  constructor() {
    super()
    this.rx = 0;
    this.ry = 0;
  }

  /**
   * Sets the dimensions and corner radii of the rounded rectangle
   * @param width - The width of the rounded rectangle
   * @param height - The height of the rounded rectangle
   * @param cornerRadiusX - The horizontal radius of the corner curves
   * @param cornerRadiusY - The vertical radius of the corner curves
   */
  SetRRectSize(width: number, height: number, cornerRadiusX: number, cornerRadiusY: number) {
    // Ensure corner radii don't exceed half the width/height
    if (cornerRadiusX >= width / 2) {
      cornerRadiusX = (width - 1) / 2;
    }
    if (cornerRadiusY >= height / 2) {
      cornerRadiusY = (height - 1) / 2;
    }

    this.rx = cornerRadiusX;
    this.ry = cornerRadiusY;

    const pathCreator = this.PathCreator();
    const innerWidth = width - 2 * cornerRadiusX;
    const innerHeight = height - 2 * cornerRadiusY;

    pathCreator.BeginPath();
    if (cornerRadiusX && cornerRadiusY) {
      // Draw rounded rectangle with curved corners
      pathCreator.MoveTo(0, cornerRadiusY);
      pathCreator.SimpleArcTo(cornerRadiusX, -cornerRadiusY, true, true);
      pathCreator.LineTo(innerWidth, 0, true);
      pathCreator.SimpleArcTo(cornerRadiusX, cornerRadiusY, true, true);
      pathCreator.LineTo(0, innerHeight, true);
      pathCreator.SimpleArcTo(-cornerRadiusX, cornerRadiusY, true, true);
      pathCreator.LineTo(-innerWidth, 0, true);
      pathCreator.SimpleArcTo(-cornerRadiusX, -cornerRadiusY, true, true);
      pathCreator.ClosePath();
    } else {
      // Draw regular rectangle if no corner radius
      pathCreator.MoveTo(0, 0);
      pathCreator.LineTo(width, 0, true);
      pathCreator.LineTo(0, height, true);
      pathCreator.LineTo(-width, 0, true);
      pathCreator.ClosePath();
    }

    const pathString = pathCreator.ToString();
    this.SetPath(pathString, { x: 0, y: 0, width, height });
  }

  /**
   * Sets the dimensions of the rounded rectangle while preserving corner radii
   * @param width - The width of the rounded rectangle
   * @param height - The height of the rounded rectangle
   */
  SetSize(width: number, height: number): void {
    this.SetRRectSize(width, height, this.rx, this.ry);
  }

}

export default RRect
