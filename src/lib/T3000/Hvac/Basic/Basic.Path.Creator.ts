
import * as Utils from '../Helper/Helper.Utils'
import Path from './Basic.Path'

class Creator {

  public element: any;
  public pathSegs: string[];
  public curPosX: number;
  public curPosY: number;

  constructor(element) {
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

  MoveTo(x: number, y: number, isRelative: boolean) {
    const command = isRelative ? 'm' : 'M';
    const roundedX = Utils.RoundCoord(x);
    const roundedY = Utils.RoundCoord(y);
    const pathSegment = `${command}${roundedX},${roundedY}`;

    this.pathSegs.push(pathSegment);

    if (isRelative) {
      this.curPosX += roundedX;
      this.curPosY += roundedY;
    } else {
      this.curPosX = roundedX;
      this.curPosY = roundedY;
    }
  }

  LineTo(x: number, y: number, isRelative: boolean) {
    const command = isRelative ? 'l' : 'L';
    const roundedX = Utils.RoundCoord(x);
    const roundedY = Utils.RoundCoord(y);
    const pathSegment = `${command}${roundedX},${roundedY}`;

    this.pathSegs.push(pathSegment);

    if (isRelative) {
      this.curPosX += roundedX;
      this.curPosY += roundedY;
    } else {
      this.curPosX = roundedX;
      this.curPosY = roundedY;
    }
  }

  CurveTo(x1: number, y1: number, x2: number, y2: number, isRelative: boolean) {
    const command = isRelative ? 'q' : 'Q';
    const roundedX1 = Utils.RoundCoord(x1);
    const roundedY1 = Utils.RoundCoord(y1);
    const roundedX2 = Utils.RoundCoord(x2);
    const roundedY2 = Utils.RoundCoord(y2);
    const pathSegment = `${command}${roundedX1},${roundedY1} ${roundedX2},${roundedY2}`;

    this.pathSegs.push(pathSegment);

    if (isRelative) {
      this.curPosX += roundedX2;
      this.curPosY += roundedY2;
    } else {
      this.curPosX = roundedX2;
      this.curPosY = roundedY2;
    }
  }

  SimpleArcTo(x: number, y: number, largeArcFlag: boolean, isRelative: boolean) {
    let endX = x;
    let endY = y;

    if (isRelative) {
      endX += this.curPosX;
      endY += this.curPosY;
    }

    const radiusX = Math.abs(endX - this.curPosX);
    const radiusY = Math.abs(endY - this.curPosY);

    if (radiusX && radiusY) {
      this.ArcTo(x, y, radiusX, radiusY, 0, largeArcFlag, false, isRelative);
    } else {
      this.LineTo(x, y, isRelative);
    }
  }

  ArcTo(x: number, y: number, radiusX: number, radiusY: number, rotation: number, largeArcFlag: boolean, sweepFlag: boolean, isRelative: boolean) {
    const command = isRelative ? 'a' : 'A';
    const roundedX = Utils.RoundCoord(x);
    const roundedY = Utils.RoundCoord(y);
    const roundedRadiusX = Utils.RoundCoord(radiusX);
    const roundedRadiusY = Utils.RoundCoord(radiusY);
    const pathSegment = `${command}${roundedRadiusX},${roundedRadiusY} ${rotation} ${largeArcFlag ? 1 : 0},${sweepFlag ? 1 : 0} ${roundedX},${roundedY}`;

    this.pathSegs.push(pathSegment);

    if (isRelative) {
      this.curPosX += roundedX;
      this.curPosY += roundedY;
    } else {
      this.curPosX = roundedX;
      this.curPosY = roundedY;
    }
  }

  ClosePath() {
    this.pathSegs.push('z');
  }

  ToString() {
    return this.pathSegs.join(' ')
  }

  Apply() {
    const pathString = this.ToString();
    if (this.element instanceof Path) {
      this.element.SetPath(pathString);
    }
  }
}

export default Creator;
