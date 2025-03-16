

import $ from 'jquery';
import T3Svg from "../Util/T3Svg"
import Path from "./B.Path";
import Utils1 from "../Util/Utils1"
import Utils2 from "../Util/Utils2"
import Utils3 from "../Util/Utils3"
import ConstantData from "../Data/ConstantData"

class Line extends Path {

  constructor() {
    super()
  }

  SetPoints(
    startXCoord: number,
    startYCoord: number,
    endXCoord: number,
    endYCoord: number
  ): void {
    console.log("= B.Line SetPoints input:", {
      startXCoord,
      startYCoord,
      endXCoord,
      endYCoord,
    });

    const pathCreator = this.PathCreator();
    pathCreator.BeginPath();
    pathCreator.MoveTo(startXCoord, startYCoord);
    pathCreator.LineTo(endXCoord, endYCoord);

    const pathString = pathCreator.ToString();
    console.log("= B.Line SetPoints output path:", pathString);

    this.SetPath(pathString, {
      x: Math.min(startXCoord, endXCoord),
      y: Math.min(startYCoord, endYCoord),
      width: Math.abs(endXCoord - startXCoord),
      height: Math.abs(endYCoord - startYCoord),
    });
  }

}

export default Line
