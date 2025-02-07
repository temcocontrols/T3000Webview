

import Path from "./Basic.Path"

class RRect extends Path {

  public rx: number;
  public ry: number;

  constructor() {
    super()
    this.rx = 0;
    this.ry = 0;
  }

  SetRRectSize(width: number, height: number, radiusX: number, radiusY: number) {
    console.log("= B.RRect SetRRectSize input:", { width, height, radiusX, radiusY });

    if (radiusX >= width / 2) {
      radiusX = (width - 1) / 2;
    }
    if (radiusY >= height / 2) {
      radiusY = (height - 1) / 2;
    }

    this.rx = radiusX;
    this.ry = radiusY;

    const pathCreator = this.PathCreator();
    const lineWidth = width - 2 * radiusX;
    const lineHeight = height - 2 * radiusY;

    pathCreator.BeginPath();

    if (radiusX > 0 && radiusY > 0) {
      pathCreator.MoveTo(0, radiusY);
      pathCreator.SimpleArcTo(radiusX, -radiusY, true, true);
      pathCreator.LineTo(lineWidth, 0, true);
      pathCreator.SimpleArcTo(radiusX, radiusY, true, true);
      pathCreator.LineTo(0, lineHeight, true);
      pathCreator.SimpleArcTo(-radiusX, radiusY, true, true);
      pathCreator.LineTo(-lineWidth, 0, true);
      pathCreator.SimpleArcTo(-radiusX, -radiusY, true, true);
      pathCreator.ClosePath();
    } else {
      pathCreator.MoveTo(0, 0);
      pathCreator.LineTo(width, 0, true);
      pathCreator.LineTo(0, height, true);
      pathCreator.LineTo(-width, 0, true);
      pathCreator.ClosePath();
    }

    const pathString = pathCreator.ToString();
    this.SetPath(pathString, { x: 0, y: 0, width, height });

    console.log("= B.RRect SetRRectSize output:", { rx: this.rx, ry: this.ry, path: pathString });
  }

  SetSize(width: number, height: number): void {
    console.log("= B.RRect SetSize - Input:", `width=${width}, height=${height}`);
    this.SetRRectSize(width, height, this.rx, this.ry);
    console.log("= B.RRect SetSize - Output:", `rx=${this.rx}, ry=${this.ry}`);
  }
}

export default RRect
