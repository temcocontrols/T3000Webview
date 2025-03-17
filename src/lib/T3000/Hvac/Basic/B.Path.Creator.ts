

import Path from './B.Path'
import Utils1 from "../Util/Utils1"

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

  /**
   * Initializes a new path, clearing existing path segments and resetting position
   */
  BeginPath(): void {
    this.pathSegs = [];
    this.curPosX = 0;
    this.curPosY = 0;
  }

  /**
   * Moves the current position to specified coordinates
   * @param x - X coordinate to move to
   * @param y - Y coordinate to move to
   * @param isRelative - If true, coordinates are relative to current position
   */
  MoveTo(x: number, y: number, isRelative: boolean): void {
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
  }

  /**
   * Draws a straight line from current position to specified coordinates
   * @param x - X coordinate of line end point
   * @param y - Y coordinate of line end point
   * @param isRelative - If true, coordinates are relative to current position
   */
  LineTo(x: number, y: number, isRelative: boolean): void {
    const commandPrefix = isRelative ? 'l' : 'L';
    const roundedX = Utils1.RoundCoord(x);
    const roundedY = Utils1.RoundCoord(y);
    const command = `${commandPrefix}${roundedX},${roundedY}`;

    this.pathSegs.push(command);

    if (isRelative) {
      this.curPosX += roundedX;
      this.curPosY += roundedY;
    } else {
      this.curPosX = roundedX;
      this.curPosY = roundedY;
    }
  }

  /**
   * Creates a quadratic Bezier curve from current position
   * @param controlX - X coordinate of the control point
   * @param controlY - Y coordinate of the control point
   * @param endX - X coordinate of the end point
   * @param endY - Y coordinate of the end point
   * @param isRelative - If true, coordinates are relative to current position
   */
  CurveTo(controlX: number, controlY: number, endX: number, endY: number, isRelative: boolean): void {
    const adjustedControlX = Utils1.RoundCoord(controlX);
    const adjustedControlY = Utils1.RoundCoord(controlY);
    const adjustedEndX = Utils1.RoundCoord(endX);
    const adjustedEndY = Utils1.RoundCoord(endY);

    const commandPrefix = isRelative ? 'q' : 'Q';
    const command = `${commandPrefix}${adjustedControlX},${adjustedControlY} ${adjustedEndX},${adjustedEndY}`;

    this.pathSegs.push(command);

    if (isRelative) {
      this.curPosX += adjustedEndX;
      this.curPosY += adjustedEndY;
    } else {
      this.curPosX = adjustedEndX;
      this.curPosY = adjustedEndY;
    }
  }

  /**
   * Creates a simple arc to the target point with automatic radius calculation
   * @param targetX - X coordinate of the target point
   * @param targetY - Y coordinate of the target point
   * @param largeArcFlag - If true, arc spans more than 180 degrees
   * @param isRelative - If true, coordinates are relative to current position
   */
  SimpleArcTo(targetX: number, targetY: number, largeArcFlag: boolean, isRelative: boolean): void {
    let absoluteX = targetX;
    let absoluteY = targetY;

    if (isRelative) {
      absoluteX += this.curPosX;
      absoluteY += this.curPosY;
    }

    const radiusX = Math.abs(absoluteX - this.curPosX);
    const radiusY = Math.abs(absoluteY - this.curPosY);

    if (radiusX && radiusY) {
      this.ArcTo(targetX, targetY, radiusX, radiusY, 0, largeArcFlag, false, isRelative);
    } else {
      this.LineTo(targetX, targetY, isRelative);
    }
  }

  /**
   * Creates an elliptical arc from current position to specified coordinates
   * @param targetX - X coordinate of the target point
   * @param targetY - Y coordinate of the target point
   * @param radiusX - X-axis radius of the ellipse
   * @param radiusY - Y-axis radius of the ellipse
   * @param xAxisRotation - Rotation of the ellipse in degrees
   * @param sweepFlag - If true, arc takes the longer path
   * @param largeArcFlag - If true, arc spans more than 180 degrees
   * @param isRelative - If true, coordinates are relative to current position
   */
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
    const roundedTargetX = Utils1.RoundCoord(targetX);
    const roundedTargetY = Utils1.RoundCoord(targetY);
    const roundedRadiusX = Utils1.RoundCoord(radiusX);
    const roundedRadiusY = Utils1.RoundCoord(radiusY);

    const commandLetter = isRelative ? 'a' : 'A';
    const command = `${commandLetter}${roundedRadiusX},${roundedRadiusY} ${xAxisRotation} ${largeArcFlag ? 1 : 0},${sweepFlag ? 1 : 0} ${roundedTargetX},${roundedTargetY}`;

    this.pathSegs.push(command);

    if (isRelative) {
      this.curPosX += roundedTargetX;
      this.curPosY += roundedTargetY;
    } else {
      this.curPosX = roundedTargetX;
      this.curPosY = roundedTargetY;
    }
  }

  /**
   * Closes the current path by drawing a line to the beginning point
   */
  ClosePath(): void {
    this.pathSegs.push('z');
  }

  /**
   * Converts the path segments array to an SVG path string
   * @returns SVG path string representation of the path
   */
  ToString(): string {
    return this.pathSegs.join(' ');
  }

  /**
   * Applies the current path to the associated element
   * Sets the path string to the element if it's a valid Path instance
   */
  Apply(): void {
    const pathString: string = this.ToString();

    if (this.element && this.element instanceof Path) {
      this.element.SetPath(pathString);
    }
  }

}

export default Creator
