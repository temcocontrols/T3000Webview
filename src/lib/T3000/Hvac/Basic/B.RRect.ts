

import Path from "./B.Path";

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
