
import Container from './Container';
import * as Utils from '../Hvac.Utils';
// import * as SVG from '@svgdotjs/svg.js';
import SVG from '../HvacSVG';
import Models from '../Hvac.Models';
import Symbol from './Symbol';
import '../pathseg';


class Path extends Container {

  public pathCreator: any;
  public svgObj: any;
  public pathElem: any;
  public arrowAreaElem: any;
  public arrowElems: any[];
  public sArrowRec: any;
  public eArrowRec: any;
  public origPathData: any;
  public strokeWidth: number;
  public sArrowSize: number;
  public eArrowSize: number;
  public sArrowDisp: boolean;
  public eArrowDisp: boolean;
  public sArrowMetrics: any;
  public eArrowMetrics: any;
  public arrowheadBounds: any[];
  public element: any;
  public pathSegs: any[];
  public curPosX: number;
  public curPosY: number;


  constructor() {
    super();
    this.Initialize();
  }

  Initialize = () => {
    this.pathCreator = null;
    this.svgObj = null;
    this.pathElem = null;
    this.arrowAreaElem = null;
    this.arrowElems = [];
    this.sArrowRec = null;
    this.eArrowRec = null;
    this.origPathData = null;
    this.strokeWidth = 0;
    this.sArrowSize = 0;
    this.eArrowSize = 0;
    this.sArrowDisp = !1;
    this.eArrowDisp = !1;
    this.sArrowMetrics = {};
    this.eArrowMetrics = {};
    this.arrowheadBounds = [];
  }

  Creator = (element) => {
    this.element = element;
    this.pathSegs = [];
    this.curPosX = 0;
    this.curPosY = 0;
  }

  CreateElement = (e, t) => {
    this.svgObj = new SVG.Container(SVG.create("g"));
    this.pathElem = new SVG.Path();
    this.arrowAreaElem = new SVG.Container(SVG.create("g"));

    this.svgObj.add(this.pathElem);
    this.svgObj.add(this.arrowAreaElem);

    this.InitElement(e, t);

    return this.svgObj;
  }

  SetArrowheads = (startArrow, startSize, endArrow, endSize, startDisplay, endDisplay) => {
    if (!this.IsClosed()) {
      this.sArrowRec = startArrow;
      this.eArrowRec = endArrow;
      this.sArrowSize = startSize;
      this.eArrowSize = endSize;
      this.sArrowDisp = startDisplay || false;
      this.eArrowDisp = endDisplay || false;
      this.UpdateArrowheads();
    }
  }

  SetStrokeWidth = (width) => {

    let symbol = new Symbol();

    if (isNaN(width) && typeof width === "string") {
      width = symbol.ParsePlaceholder(width, Models.Placeholder.LineThick);
    }
    width = Utils.RoundCoord(width);
    this.pathElem.attr("stroke-width", width);
    this.strokeWidth = Number(width);
    this.pathElem.attr("stroke-dasharray", this.GetStrokePatternForWidth());
    this.UpdateArrowheads();
  }

  SetStrokeColor = (color) => {
    this.svgObj.attr("stroke", color);
    if (!this.IsClosed()) {
      this.svgObj.attr("fill", color);
      this.pathElem.attr("fill", "none");
    }
    this.ClearColorData(false);
  }

  UpdatePattern = (e, t) => {
    // super.UpdatePattern(this, e, t);
    if (!t) {
      const strokeColor = this.svgObj.attr("stroke");
      if (!this.IsClosed()) {
        this.svgObj.attr("fill", strokeColor);
        this.pathElem.attr("fill", "none");
      }
    }
  }

  UpdateGradient = (gradient, isPattern) => {
    // super.UpdateGradient(this, gradient, isPattern);
    if (!isPattern) {
      const strokeColor = this.svgObj.attr("stroke");
      if (!this.IsClosed()) {
        this.svgObj.attr("fill", strokeColor);
        this.pathElem.attr("fill", "none");
      }
    }
  }

  SetStrokePattern = (pattern) => {
    this.strokeDashArray = pattern;
    this.pathElem.attr("stroke-dasharray", this.GetStrokePatternForWidth());
  }

  SetSize = function (e, t) { }


  GetArrowheadBounds = () => {
    return [...this.arrowheadBounds];
  }


  UpdateArrowheads = () => {
    const startArrow = this.sArrowRec;
    const endArrow = this.eArrowRec;
    const startSize = this.sArrowSize;
    const endSize = this.eArrowSize;

    // Clear existing arrow elements
    while (this.arrowAreaElem.children().length) {
      this.arrowAreaElem.removeAt(0);
    }
    this.arrowElems.length = 0;
    this.arrowheadBounds = [];

    if (!this.IsClosed() && this.origPathData) {
      this.pathElem.plot(this.origPathData);

      const startArrowData = startArrow || this.EmptyArrowhead();
      const endArrowData = endArrow;

      if (startArrowData) {
        this.sArrowMetrics = this.CalcArrowheadDim(startArrowData, startSize, this.sArrowDisp);
      }
      if (endArrowData) {
        this.eArrowMetrics = this.CalcArrowheadDim(endArrowData, endSize, this.eArrowDisp);
      }

      this.CalcArrowheadPlacement(startArrowData, endArrowData);

      let startArrowElem = null;
      let endArrowElem = null;

      if (startArrowData) {
        startArrowElem = this.CreateArrowheadElem(startArrowData, this.sArrowMetrics, true, this.arrowheadBounds);
      }
      if (endArrowData) {
        endArrowElem = this.CreateArrowheadElem(endArrowData, this.eArrowMetrics, false, this.arrowheadBounds);
      }

      if (startArrowData && this.sArrowMetrics.trimAmount) {
        this.TrimPath("start", this.sArrowMetrics.trimAmount);
      }
      if (endArrowData && this.eArrowMetrics.trimAmount) {
        this.TrimPath("end", this.eArrowMetrics.trimAmount);
      }

      if (startArrowElem) {
        this.arrowElems.push(startArrowElem);
        this.arrowAreaElem.add(startArrowElem);
      }
      if (endArrowElem) {
        this.arrowElems.push(endArrowElem);
        this.arrowAreaElem.add(endArrowElem);
      }
    }
  }



  CalcArrowheadDim = function (arrowData, size, display) {
    const metrics = { width: 0, height: 0, scaleFactor: 0, attachX: 0, attachY: 0, endX: 0, endY: 0, trimAmount: 0, offsetX: 0, offsetY: 0, rotatePt: { x: 0, y: 0 }, angle: 0 };
    let arrowHeight = 2 * (this.strokeWidth + size);

    if (arrowData.fixedSizeScale) {
      arrowHeight = this.strokeWidth * arrowData.fixedSizeScale;
    }

    const scaleFactor = arrowHeight / arrowData.defArea.height;
    metrics.width = arrowData.defArea.width * scaleFactor;
    metrics.height = arrowHeight;
    metrics.scaleFactor = scaleFactor;
    metrics.attachX = arrowData.attachPt.x * scaleFactor;
    metrics.attachY = arrowData.attachPt.y * scaleFactor;
    metrics.endX = arrowData.endPt.x * scaleFactor;
    metrics.endY = arrowData.endPt.y * scaleFactor;

    if (arrowData.centered) {
      metrics.endX = metrics.attachX;
      metrics.endY = metrics.attachY;
    }

    metrics.trimAmount = metrics.endX - metrics.attachX;

    if (display && !arrowData.centered) {
      metrics.trimAmount += 10;
    }

    return metrics;
  }

  CreateArrowheadElem = function (arrowData, metrics, isStart, bounds) {
    const strokeWidth = parseFloat(this.pathElem.attr("stroke-width")) || 0;
    const strokeOpacity = parseFloat(this.svgObj.attr("stroke-opacity")) || 1;
    const offset = { x: metrics.offsetX, y: metrics.offsetY };
    const rotatePoint = metrics.rotatePt;
    const angle = metrics.angle;
    const scaleFactor = metrics.scaleFactor;
    const geometry = isStart && arrowData.flippedGeometry ? arrowData.flippedGeometry : arrowData.geometry;

    const arrowContainer = new SVG.Container(SVG.create("g"));
    arrowContainer.parts = [];

    geometry.forEach((shape) => {
      let path = new SVG.Path();
      let pathData = "";

      switch (shape.type) {
        case "RECT":
          pathData = this.createRectPathData(shape, offset, rotatePoint, angle, scaleFactor);
          break;
        case "OVAL":
          pathData = this.createOvalPathData(shape, offset, rotatePoint, angle, scaleFactor);
          break;
        case "PATH":
          pathData = this.createCustomPathData(shape, offset, rotatePoint, angle, scaleFactor);
          break;
        default:
          path = null;
      }

      if (path) {
        path.plot(pathData);
        arrowContainer.add(path);
        arrowContainer.parts.push({ elem: path, filled: shape.filled });

        if (shape.filled) {
          path.attr("stroke", "none");
          path.attr("fill-opacity", strokeOpacity);
        } else {
          path.attr("stroke-width", strokeWidth * shape.stroke);
          path.attr("fill", shape.noWhiteFill ? "none" : "#FFFFFF");
          path.attr("fill-opacity", shape.noWhiteFill ? 0 : 1);
        }
      }
    });

    arrowContainer.attr("stroke-dasharray", "none");

    if (bounds && arrowData.desc !== "empty") {
      const boundingBox = this.calculateBoundingBox(arrowData, offset, rotatePoint, angle, scaleFactor);
      bounds.push(boundingBox);
    }

    return arrowContainer;
  }

  createRectPathData = (shape, offset, rotatePoint, angle, scaleFactor) => {
    const x = shape.pathData.x * scaleFactor + offset.x;
    const y = shape.pathData.y * scaleFactor + offset.y;
    const width = shape.pathData.width * scaleFactor;
    const height = shape.pathData.height * scaleFactor;

    const points = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height }
    ];

    return this.createPathData(points, rotatePoint, angle);
  }

  createOvalPathData = (shape, offset, rotatePoint, angle, scaleFactor) => {
    const x = shape.pathData.x * scaleFactor + offset.x;
    const y = shape.pathData.y * scaleFactor + offset.y;
    const width = shape.pathData.width * scaleFactor / 2;
    const height = shape.pathData.height * scaleFactor / 2;

    const startPoint = this.rotatePoint({ x, y: y + height }, rotatePoint, angle);
    const endPoint = this.rotatePoint({ x, y: y - height }, rotatePoint, angle);

    return `M${startPoint.x},${startPoint.y}A${width},${height} ${angle} 1 1 ${endPoint.x},${endPoint.y}z`;
  }

  createCustomPathData = (shape, offset, rotatePoint, angle, scaleFactor) => {
    return shape.pathData.reduce((acc, command) => {
      if (!Array.isArray(command) || command.length < 1) return acc;

      switch (command[0]) {
        case "M":
        case "L":
          if (command.length >= 3) {
            const point = this.rotatePoint({ x: command[1] * scaleFactor + offset.x, y: command[2] * scaleFactor + offset.y }, rotatePoint, angle);
            acc += `${command[0]}${point.x},${point.y}`;
          }
          break;
        case "A":
          if (command.length >= 8) {
            const point = this.rotatePoint({ x: command[6] * scaleFactor + offset.x, y: command[7] * scaleFactor + offset.y }, rotatePoint, angle);
            acc += `A${command[1] * scaleFactor},${command[2] * scaleFactor} ${command[3] + angle} ${command[4]} ${command[5]} ${point.x},${point.y}`;
          }
          break;
        case "z":
          acc += "z";
          break;
      }

      return acc;
    }, "");
  }

  createPathData = (points, rotatePoint, angle) => {
    return points.reduce((acc, point, index) => {
      const rotatedPoint = this.rotatePoint(point, rotatePoint, angle);
      acc += `${index === 0 ? "M" : "L"}${rotatedPoint.x},${rotatedPoint.y}`;
      return acc;
    }, "") + "z";
  }

  rotatePoint = (point, rotatePoint, angle) => {
    const rad = (Math.PI / 180) * angle;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx = point.x - rotatePoint.x;
    const dy = point.y - rotatePoint.y;

    return {
      x: cos * dx - sin * dy + rotatePoint.x,
      y: sin * dx + cos * dy + rotatePoint.y
    };
  }

  calculateBoundingBox = (arrowData, offset, rotatePoint, angle, scaleFactor) => {
    const x = offset.x;
    const y = offset.y;
    const width = arrowData.defArea.width * scaleFactor;
    const height = arrowData.defArea.height * scaleFactor;

    const points = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height }
    ];

    const rotatedPoints = points.map(point => this.rotatePoint(point, rotatePoint, angle));

    const minX = Math.min(...rotatedPoints.map(p => p.x));
    const maxX = Math.max(...rotatedPoints.map(p => p.x));
    const minY = Math.min(...rotatedPoints.map(p => p.y));
    const maxY = Math.max(...rotatedPoints.map(p => p.y));

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  CalcArrowheadPlacement = function (startArrow, endArrow) {
    if (!startArrow && !endArrow) return;

    const totalLength = this.pathElem.node.getTotalLength();
    let startPoint = this.pathElem.node.getPointAtLength(0);
    let endPoint = this.pathElem.node.getPointAtLength(totalLength);

    let startTrim = startArrow ? this.sArrowMetrics.trimAmount : 0;
    let endTrim = endArrow ? this.eArrowMetrics.trimAmount : 0;

    if (startTrim + endTrim >= totalLength) {
      const midPoint = this.pathElem.node.getPointAtLength(totalLength / 2);
      if (startTrim && endTrim) {
        this.sArrowMetrics.trimAmount = totalLength / 2;
        this.eArrowMetrics.trimAmount = totalLength / 2;
        startTrim = endTrim = totalLength / 2;
      } else if (startTrim) {
        this.sArrowMetrics.trimAmount = totalLength;
        startTrim = totalLength;
      } else {
        this.eArrowMetrics.trimAmount = totalLength;
        endTrim = totalLength;
      }
    }

    let startArrowPoint = startArrow ? (startArrow.centered ? this.pathElem.node.getPointAtLength(totalLength / 2) : this.pathElem.node.getPointAtLength(startTrim)) : null;
    let endArrowPoint = endArrow ? (endArrow.centered ? this.pathElem.node.getPointAtLength(totalLength / 2) : this.pathElem.node.getPointAtLength(totalLength - endTrim)) : null;

    if (startArrow) {
      const startRefPoint = startArrowPoint.x === startPoint.x && startArrowPoint.y === startPoint.y ? (totalLength < 2 ? { x: startPoint.x + 2, y: startPoint.y } : this.pathElem.node.getPointAtLength(2)) : startArrowPoint;
      if (startArrow.centered && totalLength >= 4) {
        startPoint = this.pathElem.node.getPointAtLength(totalLength / 2 - 2);
      }
      this.sArrowMetrics.angle = startArrow.noRotate ? 0 : Utils.CalcAngleFromPoints(startRefPoint, startPoint);
      this.sArrowMetrics.rotatePt = startArrowPoint;
      this.sArrowMetrics.offsetX = startArrowPoint.x - this.sArrowMetrics.attachX;
      this.sArrowMetrics.offsetY = startArrowPoint.y - this.sArrowMetrics.attachY;
    }

    if (endArrow) {
      const endRefPoint = endArrowPoint.x === endPoint.x && endArrowPoint.y === endPoint.y ? (totalLength < 2 ? { x: endPoint.x - 2, y: endPoint.y } : this.pathElem.node.getPointAtLength(totalLength - 2)) : endArrowPoint;
      if (endArrow.centered && totalLength >= 4) {
        endPoint = this.pathElem.node.getPointAtLength(totalLength / 2 + 2);
      }
      this.eArrowMetrics.angle = endArrow.noRotate ? 0 : Utils.CalcAngleFromPoints(endRefPoint, endPoint);
      this.eArrowMetrics.rotatePt = endArrowPoint;
      this.eArrowMetrics.offsetX = endArrowPoint.x - this.eArrowMetrics.attachX;
      this.eArrowMetrics.offsetY = endArrowPoint.y - this.eArrowMetrics.attachY;
    }
  }

  EmptyArrowhead = () => {
    return {
      id: 0,
      desc: "empty",
      defArea: {
        width: 10,
        height: 10
      },
      endPt: {
        x: 5,
        y: 5
      },
      attachPt: {
        x: 5,
        y: 5
      },
      centered: false,
      noRotate: true,
      geometry: [
        {
          type: "RECT",
          filled: false,
          noWhiteFill: true,
          stroke: 0,
          pathData: {
            x: 0,
            y: 0,
            width: 10,
            height: 10
          }
        }
      ]
    };
  }

  TrimPath = (position, length) => {
    const pathSegList = this.pathElem.node.pathSegList;
    const totalLength = this.pathElem.node.getTotalLength();
    const numSegments = pathSegList.numberOfItems;

    if (!length || length >= totalLength) {
      this.pathElem.plot();
      return;
    }

    const trimLength = position === "start" ? length : totalLength - length;
    const segmentIndex = this.pathElem.node.getPathSegAtLength(trimLength);
    const trimPoint = this.pathElem.node.getPointAtLength(trimLength);
    const roundedTrimPoint = {
      x: Utils.RoundCoord(trimPoint.x),
      y: Utils.RoundCoord(trimPoint.y)
    };

    const segment = pathSegList.getItem(segmentIndex);
    const isSegmentAbs = this.IsSegmentAbs(segment);
    let endPoint = { x: 0, y: 0 };

    if (!isSegmentAbs) {
      endPoint = this.CalcSegEndpoint(this.pathElem, segmentIndex);
      endPoint.x = Utils.RoundCoord(endPoint.x);
      endPoint.y = Utils.RoundCoord(endPoint.y);
    }

    if (position === "start") {
      for (let i = 1; i < segmentIndex; i++) {
        pathSegList.removeItem(1);
      }

      const moveTo = this.pathElem.node.createSVGPathSegMovetoAbs(roundedTrimPoint.x, roundedTrimPoint.y);
      pathSegList.replaceItem(moveTo, 0);

      if (!isSegmentAbs) {
        let newSegment;
        switch (segment.pathSegType) {
          case Models.SVGPathSeg.PATHSEG_LINETO_ABS:
          case Models.SVGPathSeg.PATHSEG_LINETO_REL:
          case Models.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
          case Models.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL:
          case Models.SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
          case Models.SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL:
            newSegment = this.pathElem.node.createSVGPathSegLinetoAbs(endPoint.x, endPoint.y);
            break;
          case Models.SVGPathSeg.PATHSEG_ARC_ABS:
          case Models.SVGPathSeg.PATHSEG_ARC_REL:
            newSegment = this.pathElem.node.createSVGPathSegArcAbs(endPoint.x, endPoint.y, segment.r1, segment.r2, segment.angle, segment.largeArcFlag, segment.sweepFlag);
            break;
          default:
            newSegment = null;
        }
        if (newSegment) {
          pathSegList.replaceItem(newSegment, 1);
        }
      }
    } else {
      for (let i = segmentIndex + 1; i < numSegments; i++) {
        pathSegList.removeItem(segmentIndex + 1);
      }

      let newSegment;
      switch (segment.pathSegType) {
        case Models.SVGPathSeg.PATHSEG_LINETO_ABS:
        case Models.SVGPathSeg.PATHSEG_LINETO_REL:
        case Models.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
        case Models.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL:
        case Models.SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
        case Models.SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL:
          newSegment = this.pathElem.node.createSVGPathSegLinetoAbs(roundedTrimPoint.x, roundedTrimPoint.y);
          break;
        case Models.SVGPathSeg.PATHSEG_ARC_ABS:
        case Models.SVGPathSeg.PATHSEG_ARC_REL:
          newSegment = this.pathElem.node.createSVGPathSegArcAbs(roundedTrimPoint.x, roundedTrimPoint.y, segment.r1, segment.r2, segment.angle, segment.largeArcFlag, segment.sweepFlag);
          break;
        default:
          newSegment = null;
      }
      if (newSegment) {
        pathSegList.replaceItem(newSegment, segmentIndex);
      }
    }
  }


  CalcSegEndpoint = (pathElem, segmentIndex) => {
    const endpoint = { x: 0, y: 0 };

    for (let i = 0; i <= segmentIndex; i++) {
      const segment = pathElem.node.pathSegList.getItem(i);

      switch (segment.pathSegType) {
        case Models.SVGPathSeg.PATHSEG_MOVETO_ABS:
        case Models.SVGPathSeg.PATHSEG_LINETO_ABS:
        case Models.SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
        case Models.SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS:
        case Models.SVGPathSeg.PATHSEG_ARC_ABS:
        case Models.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
        case Models.SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
        case Models.SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS:
        case Models.SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS:
          if (segment.x !== undefined) endpoint.x = segment.x;
          if (segment.y !== undefined) endpoint.y = segment.y;
          break;
        case Models.SVGPathSeg.PATHSEG_MOVETO_REL:
          if (i === 0) {
            endpoint.x = segment.x;
            endpoint.y = segment.y;
          } else {
            endpoint.x += segment.x;
            endpoint.y += segment.y;
          }
          break;
        default:
          if (segment.x !== undefined) endpoint.x += segment.x;
          if (segment.y !== undefined) endpoint.y += segment.y;
      }
    }

    return endpoint;
  }


  GetGeometryBBox = () => {
    if (this.geometryBBox.width < 0 || this.geometryBBox.height < 0) {
      const formattingLayer = this.doc.GetFormattingLayer();
      const tempPath = new SVG.Path();
      tempPath.plot(this.origPathData);
      formattingLayer.svgObj.add(tempPath);
      const bbox = tempPath.node.getBBox();
      formattingLayer.svgObj.remove(tempPath);
      this.geometryBBox.x = bbox.x;
      this.geometryBBox.y = bbox.y;
      this.geometryBBox.width = bbox.width;
      this.geometryBBox.height = bbox.height;
    }
    return this.geometryBBox;
  }


  IsSegmentAbs = (segment) => {
    switch (segment.pathSegType) {
      case Models.SVGPathSeg.PATHSEG_MOVETO_ABS:
      case Models.SVGPathSeg.PATHSEG_LINETO_ABS:
      case Models.SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
      case Models.SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS:
      case Models.SVGPathSeg.PATHSEG_ARC_ABS:
      case Models.SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS:
      case Models.SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS:
        return true;
      default:
        return false;
    }
  }


  IsClosed = () => {
    console.log('this.pathElem.node.pathSegList.numberOfItems', this.pathElem.node);
    const numSegments = this.pathElem.node.pathSegList.numberOfItems;
    if (numSegments < 1) return false;
    const lastSegment = this.pathElem.node.pathSegList.getItem(numSegments - 1);
    return lastSegment.pathSegType === Models.SVGPathSeg.PATHSEG_CLOSEPATH;
  }


  SetPath = (pathData, bbox) => {
    this.origPathData = pathData;
    this.pathElem.plot(pathData);
    this.UpdateArrowheads();
    this.UpdateTransform();

    if (bbox) {
      this.geometryBBox.x = bbox.x;
      this.geometryBBox.y = bbox.y;
      this.geometryBBox.width = bbox.width;
      this.geometryBBox.height = bbox.height;
    } else {
      this.geometryBBox.width = -1;
      this.geometryBBox.height = -1;
    }

    this.RefreshPaint(null);
  }

  PathCreator = () => {
    if (!this.pathCreator) {
      this.pathCreator = new this.Creator(this);
    }
    return this.pathCreator;
  }
}

export default Path;
