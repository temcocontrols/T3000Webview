

import $ from 'jquery';
import T3Svg from "../Helper/T3Svg"
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import ConstantData from "../Data/ConstantData"

import Path from "./B.Path";

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
    const innerWidth = width - 2 * radiusX;
    const innerHeight = height - 2 * radiusY;

    pathCreator.BeginPath();
    if (radiusX && radiusY) {
      pathCreator.MoveTo(0, radiusY);
      pathCreator.SimpleArcTo(radiusX, -radiusY, true, true);
      pathCreator.LineTo(innerWidth, 0, true);
      pathCreator.SimpleArcTo(radiusX, radiusY, true, true);
      pathCreator.LineTo(0, innerHeight, true);
      pathCreator.SimpleArcTo(-radiusX, radiusY, true, true);
      pathCreator.LineTo(-innerWidth, 0, true);
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

    console.log("= B.RRect SetRRectSize output:", { radiusX: this.rx, radiusY: this.ry, path: pathString });
  }

  SetSize(width: number, height: number): void {
    console.log("= B.RRect SetSize input:", { width, height });
    this.SetRRectSize(width, height, this.rx, this.ry);
    console.log("= B.RRect SetSize output:", { rx: this.rx, ry: this.ry });
  }

}

export default RRect
