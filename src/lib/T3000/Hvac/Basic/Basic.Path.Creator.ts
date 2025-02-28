

import $ from 'jquery';
import HvacSVG from "../Helper/SVG.t2"
import Path from './Basic.Path'
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import ConstantData from "../Data/ConstantData"

class Creator {

  public element: any;
  public pathSegs: any[];
  public curPosX: number;
  public curPosY: number;

  constructor(element?) {
    this.element = element;
    this.pathSegs = [];
    this.curPosX = 0;
    this.curPosY = 0;
  }

  BeginPath() {
    this.pathSegs = [];
    this.curPosX = 0;
    this.curPosY = 0;
  }

  MoveTo(x: number, y: number, isRelative: boolean): void {
    console.log("= B.Path.Creator - MoveTo called with x:", x, "y:", y, "isRelative:", isRelative);

    const roundedX = Utils1.RoundCoord(x);
    const roundedY = Utils1.RoundCoord(y);
    const commandPrefix = isRelative ? 'm' : 'M';
    const command = `${commandPrefix}${roundedX},${roundedY}`;

    this.pathSegs.push(command);

    if (isRelative) {
      this.curPosX += roundedX;
      this.curPosY += roundedY;
    } else {
      this.curPosX = roundedX;
      this.curPosY = roundedY;
    }

    console.log("= B.Path.Creator - MoveTo updated position to curPosX:", this.curPosX, "curPosY:", this.curPosY);
  }

  LineTo(x: number, y: number, isRelative: boolean): void {
    console.log(`= B.Path.Creator - LineTo called with x: ${x}, y: ${y}, isRelative: ${isRelative}`);

    const commandPrefix = isRelative ? 'l' : 'L';
    const roundedX = Utils1.RoundCoord(x);
    const roundedY = Utils1.RoundCoord(y);
    const command = `${commandPrefix}${roundedX},${roundedY}`;

    this.pathSegs.push(command);

    const prevPosX = this.curPosX;
    const prevPosY = this.curPosY;

    if (isRelative) {
      this.curPosX += roundedX;
      this.curPosY += roundedY;
    } else {
      this.curPosX = roundedX;
      this.curPosY = roundedY;
    }

    console.log(`= B.Path.Creator - LineTo updated position from (${prevPosX}, ${prevPosY}) to (${this.curPosX}, ${this.curPosY}), command: ${command}`);
  }

  CurveTo(controlX: number, controlY: number, endX: number, endY: number, isRelative: boolean): void {
    console.log("= B.Path.Creator - CurveTo called with controlX:", controlX,
      "controlY:", controlY, "endX:", endX, "endY:", endY, "isRelative:", isRelative);

    const adjustedControlX = Utils1.RoundCoord(controlX);
    const adjustedControlY = Utils1.RoundCoord(controlY);
    const adjustedEndX = Utils1.RoundCoord(endX);
    const adjustedEndY = Utils1.RoundCoord(endY);

    const commandPrefix = isRelative ? 'q' : 'Q';
    const command = `${commandPrefix}${adjustedControlX},${adjustedControlY} ${adjustedEndX},${adjustedEndY}`;

    this.pathSegs.push(command);

    const prevPosX = this.curPosX;
    const prevPosY = this.curPosY;

    if (isRelative) {
      this.curPosX += adjustedEndX;
      this.curPosY += adjustedEndY;
    } else {
      this.curPosX = adjustedEndX;
      this.curPosY = adjustedEndY;
    }

    console.log("= B.Path.Creator - CurveTo updated from (", prevPosX, ",", prevPosY,
      ") to (", this.curPosX, ",", this.curPosY, "), command:", command);
  }

  SimpleArcTo(targetX: number, targetY: number, largeArcFlag: boolean, isRelative: boolean): void {
    console.log("= B.Path.Creator - SimpleArcTo called with targetX:", targetX, "targetY:", targetY, "largeArcFlag:", largeArcFlag, "isRelative:", isRelative);

    let absoluteX = targetX;
    let absoluteY = targetY;

    if (isRelative) {
      absoluteX += this.curPosX;
      absoluteY += this.curPosY;
    }

    const radiusX = Math.abs(absoluteX - this.curPosX);
    const radiusY = Math.abs(absoluteY - this.curPosY);

    console.log("= B.Path.Creator - SimpleArcTo computed absoluteX:", absoluteX, "absoluteY:", absoluteY, "radiusX:", radiusX, "radiusY:", radiusY);

    if (radiusX && radiusY) {
      console.log("= B.Path.Creator - SimpleArcTo using ArcTo with original targetX:", targetX, "targetY:", targetY);
      this.ArcTo(targetX, targetY, radiusX, radiusY, 0, largeArcFlag, false, isRelative);
      console.log("= B.Path.Creator - SimpleArcTo ArcTo executed.");
    } else {
      console.log("= B.Path.Creator - SimpleArcTo using LineTo with targetX:", targetX, "targetY:", targetY);
      this.LineTo(targetX, targetY, isRelative);
      console.log("= B.Path.Creator - SimpleArcTo LineTo executed.");
    }
  }

  ArcTo(
    targetX: number,
    targetY: number,
    radiusX: number,
    radiusY: number,
    xAxisRotation: number,
    sweepFlag: boolean,
    largeArcFlag: boolean,
    isRelative: boolean
  ): void {
    console.log("= B.Path.Creator - ArcTo called with targetX:", targetX, "targetY:", targetY, "radiusX:", radiusX, "radiusY:", radiusY, "xAxisRotation:", xAxisRotation, "sweepFlag:", sweepFlag, "largeArcFlag:", largeArcFlag, "isRelative:", isRelative);

    // Round the coordinates and radii
    const roundedTargetX = Utils1.RoundCoord(targetX);
    const roundedTargetY = Utils1.RoundCoord(targetY);
    const roundedRadiusX = Utils1.RoundCoord(radiusX);
    const roundedRadiusY = Utils1.RoundCoord(radiusY);

    // Determine command letter based on whether the command is relative
    const commandLetter = isRelative ? 'a' : 'A';

    // Build the arc command string following SVG arc syntax:
    // A rx,ry x-axis-rotation large-arc-flag,sweep-flag x,y
    const command = `${commandLetter}${roundedRadiusX},${roundedRadiusY} ${xAxisRotation} ${largeArcFlag ? 1 : 0},${sweepFlag ? 1 : 0} ${roundedTargetX},${roundedTargetY}`;

    // Append the command to the path segments
    this.pathSegs.push(command);

    // Save previous position for logging
    const prevPosX = this.curPosX;
    const prevPosY = this.curPosY;

    // Update the current position
    if (isRelative) {
      this.curPosX += roundedTargetX;
      this.curPosY += roundedTargetY;
    } else {
      this.curPosX = roundedTargetX;
      this.curPosY = roundedTargetY;
    }

    console.log("= B.Path.Creator - ArcTo updated position from (", prevPosX, ",", prevPosY, ") to (", this.curPosX, ",", this.curPosY, "), command:", command);
  }

  ClosePath(): void {
    console.log("= B.Path.Creator - ClosePath called with no parameters");
    this.pathSegs.push('z');
    console.log("= B.Path.Creator - ClosePath output, updated pathSegs:", this.pathSegs);
  }

  ToString(): string {
    console.log("= B.Path.Creator - ToString called. Input pathSegs:", this.pathSegs);
    const joinedPath = this.pathSegs.join(' ');
    console.log("= B.Path.Creator - ToString output:", joinedPath);
    return joinedPath;
  }

  Apply(): void {
    console.log("= B.Path.Creator - Apply called.");

    const pathString: string = this.ToString();
    console.log("= B.Path.Creator - ToString output:", pathString);

    if (this.element && this.element instanceof Path) {
      console.log("= B.Path.Creator - Element is a valid Path instance. Setting path.");
      this.element.SetPath(pathString);
      console.log("= B.Path.Creator - Path successfully set on element.");
    } else {
      console.log("= B.Path.Creator - Element is not an instance of Path. No action taken.");
    }
  }

}

export default Creator
