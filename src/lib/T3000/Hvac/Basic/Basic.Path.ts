

import HvacSVG from "../Helper/SVG.t2"
import $ from "jquery";
import "../Helper/pathseg"
import Container from "./Basic.Container";
import Creator from "./Basic.Path.Creator";
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import ConstantData from "../Data/ConstantData"
import ConstantData1 from "../Data/ConstantData1"
import ConstantData2 from "../Data/ConstantData2"
import Instance from "../Data/Instance/Instance";
import BasicConstants from "./Basic.Constants";

class Path extends Container {

  public pathCreator: any;
  public pathElem: any;
  public arrowAreaElem: any;
  public arrowElems: any[];
  public sArrowRec: any;
  public eArrowRec: any;
  public origPathData: any;
  public sArrowSize: number;
  public eArrowSize: number;
  public sArrowDisp: boolean;
  public eArrowDisp: any;
  public sArrowMetrics: any;
  public eArrowMetrics: any;
  public arrowheadBounds: any;

  constructor() {
    super()
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

  CreateElement(svgDoc: any, parent: any) {
    console.log("= B.Path CreateElement called with svgDoc:", svgDoc, "parent:", parent);

    this.svgObj = new HvacSVG.Container(HvacSVG.create('g'));
    this.pathElem = new HvacSVG.Path();
    this.svgObj.add(this.pathElem);

    this.arrowAreaElem = new HvacSVG.Container(HvacSVG.create('g'));
    this.svgObj.add(this.arrowAreaElem);

    this.InitElement(svgDoc, parent);

    console.log("= B.Path CreateElement returning svgObj:", this.svgObj);
    return this.svgObj;
  }

  SetArrowheads(
    startArrowRec: any,
    startArrowSize: number,
    endArrowRec: any,
    endArrowSize: number,
    startArrowDisplay: boolean,
    endArrowDisplay: boolean
  ) {
    console.log("= B.Path SetArrowheads called with startArrowRec:", startArrowRec, "startArrowSize:", startArrowSize, "endArrowRec:", endArrowRec, "endArrowSize:", endArrowSize, "startArrowDisplay:", startArrowDisplay, "endArrowDisplay:", endArrowDisplay);

    if (!this.IsClosed()) {
      this.sArrowRec = startArrowRec;
      this.eArrowRec = endArrowRec;
      this.sArrowSize = startArrowSize;
      this.eArrowSize = endArrowSize;
      this.sArrowDisp = startArrowDisplay || false;
      this.eArrowDisp = endArrowDisplay || false;
      this.UpdateArrowheads();
    }

    console.log("= B.Path SetArrowheads completed with sArrowRec:", this.sArrowRec, "eArrowRec:", this.eArrowRec, "sArrowSize:", this.sArrowSize, "eArrowSize:", this.eArrowSize, "sArrowDisp:", this.sArrowDisp, "eArrowDisp:", this.eArrowDisp);
  }

  SetStrokeWidth(strokeWidth: any) {
    console.log("= B.Path SetStrokeWidth called with strokeWidth:", strokeWidth);

    if (isNaN(strokeWidth) && typeof strokeWidth === 'string') {
      strokeWidth = Instance.Basic.Symbol.ParsePlaceholder(strokeWidth, BasicConstants.Placeholder.LineThick);
    }

    strokeWidth = Utils1.RoundCoord(strokeWidth);
    this.pathElem.attr('stroke-width', strokeWidth);
    this.strokeWidth = Number(strokeWidth);
    this.pathElem.attr('stroke-dasharray', this.GetStrokePatternForWidth());
    this.UpdateArrowheads();

    console.log("= B.Path SetStrokeWidth completed with strokeWidth:", strokeWidth);
  }

  SetStrokeColor(strokeColor: string) {
    console.log("= B.Path SetStrokeColor called with strokeColor:", strokeColor);

    this.svgObj.attr('stroke', strokeColor);
    if (!this.IsClosed()) {
      this.svgObj.attr('fill', strokeColor);
      this.pathElem.attr('fill', 'none');
    }
    this.ClearColorData(false);

    console.log("= B.Path SetStrokeColor completed with strokeColor:", strokeColor);
  }

  UpdatePattern(patternId, isFill) {
    console.log('= B.Path UpdatePattern called with patternId:', patternId, 'isFill:', isFill);

    let strokeColor;
    Instance.Basic.Element.prototype.UpdatePattern.call(this, patternId, isFill);

    if (!isFill) {
      strokeColor = this.svgObj.attr('stroke');
      if (!this.IsClosed()) {
        this.svgObj.attr('fill', strokeColor);
        this.pathElem.attr('fill', 'none');
      }
    }

    console.log('= B.Path UpdatePattern completed with strokeColor:', strokeColor);
  }

  UpdateGradient(gradientId, isFill) {
    console.log('= B.Path UpdateGradient called with gradientId:', gradientId, 'isFill:', isFill);

    let strokeColor;
    Instance.Basic.Element.prototype.UpdateGradient.call(this, gradientId, isFill);

    if (!isFill) {
      strokeColor = this.svgObj.attr('stroke');
      if (!this.IsClosed()) {
        this.svgObj.attr('fill', strokeColor);
        this.pathElem.attr('fill', 'none');
      }
    }

    console.log('= B.Path UpdateGradient completed with strokeColor:', strokeColor);
  }

  SetStrokePattern(dashArray: string) {
    console.log("= B.Path SetStrokePattern called with dashArray:", dashArray);

    this.strokeDashArray = dashArray;
    this.pathElem.attr('stroke-dasharray', this.GetStrokePatternForWidth());

    console.log("= B.Path SetStrokePattern completed with strokeDashArray:", this.strokeDashArray);
  }

  SetSize(e, t) {
  }

  GetArrowheadBounds() {
    return [...this.arrowheadBounds];
  }

  UpdateArrowheads() {
    const sArrowRec = this.sArrowRec;
    const eArrowRec = this.eArrowRec;
    const sArrowSize = this.sArrowSize;
    const eArrowSize = this.eArrowSize;
    let sArrowElem = null;
    let eArrowElem = null;

    while (this.arrowAreaElem.children().length) {
      this.arrowAreaElem.removeAt(0);
    }

    this.arrowElems.length = 0;
    this.arrowheadBounds = [];

    if (!this.IsClosed() && this.origPathData) {
      this.pathElem.plot(this.origPathData);

      const sArrow = sArrowRec || this.EmptyArrowhead();
      const eArrow = eArrowRec || this.EmptyArrowhead();

      if (sArrow) {
        this.sArrowMetrics = this.CalcArrowheadDim(sArrow, sArrowSize, this.sArrowDisp);
      }

      if (eArrow) {
        this.eArrowMetrics = this.CalcArrowheadDim(eArrow, eArrowSize, this.eArrowDisp);
      }

      this.CalcArrowheadPlacement(sArrow, eArrow);

      if (sArrow) {
        sArrowElem = this.CreateArrowheadElem(sArrow, this.sArrowMetrics, true, this.arrowheadBounds);
      }

      if (eArrow) {
        eArrowElem = this.CreateArrowheadElem(eArrow, this.eArrowMetrics, false, this.arrowheadBounds);
      }

      if (sArrow && this.sArrowMetrics.trimAmount) {
        this.TrimPath('start', this.sArrowMetrics.trimAmount);
      }

      if (eArrow && this.eArrowMetrics.trimAmount) {
        this.TrimPath('end', this.eArrowMetrics.trimAmount);
      }

      if (sArrowElem) {
        this.arrowElems.push(sArrowElem);
        this.arrowAreaElem.add(sArrowElem);
      }

      if (eArrowElem) {
        this.arrowElems.push(eArrowElem);
        this.arrowAreaElem.add(eArrowElem);
      }
    }
  }

  CalcArrowheadDim(arrowRec, arrowSize, displayArrow) {
    console.log("= B.Path CalcArrowheadDim called with arrowRec:", arrowRec, "arrowSize:", arrowSize, "displayArrow:", displayArrow);

    let scaleFactor, arrowWidth, arrowHeight;
    const metrics = {
      width: 0,
      height: 0,
      scaleFactor: 0,
      attachX: 0,
      attachY: 0,
      endX: 0,
      endY: 0,
      trimAmount: 0
    };

    arrowHeight = 2 * (this.strokeWidth + arrowSize);
    if (arrowRec.fixedSizeScale) {
      arrowHeight = this.strokeWidth * arrowRec.fixedSizeScale;
    }

    scaleFactor = arrowHeight / arrowRec.defArea.height;
    metrics.width = arrowRec.defArea.width * scaleFactor;
    metrics.height = arrowHeight;
    metrics.scaleFactor = scaleFactor;
    metrics.attachX = arrowRec.attachPt.x * scaleFactor;
    metrics.attachY = arrowRec.attachPt.y * scaleFactor;
    metrics.endX = arrowRec.endPt.x * scaleFactor;
    metrics.endY = arrowRec.endPt.y * scaleFactor;

    if (arrowRec.centered) {
      metrics.endX = metrics.attachX;
      metrics.endY = metrics.attachY;
    }

    metrics.trimAmount = metrics.endX - metrics.attachX;
    if (displayArrow && !arrowRec.centered) {
      metrics.trimAmount += 10;
    }

    console.log("= B.Path CalcArrowheadDim returning metrics:", metrics);
    return metrics;
  }

  CreateArrowheadElem(
    arrowRecord: any,
    metrics: any,
    isStart: boolean,
    arrowBounds: any[]
  ) {
    console.log("B.Path CreateArrowheadElem input:", {
      arrowRecord,
      metrics,
      isStart,
      arrowBounds,
    });

    // Get strokeWidth and strokeOpacity with fallbacks
    let strokeWidth = this.pathElem.attr("stroke-width");
    if (isNaN(strokeWidth)) {
      strokeWidth = Number(Instance.Basic.Symbol.ParsePlaceholder(strokeWidth, Instance.Basic.Symbol.Placeholder.LineThick));
    }
    let strokeOpacity = this.svgObj.attr("stroke-opacity");
    if (isNaN(strokeOpacity)) {
      strokeOpacity = 1;
    }

    // Define offset and transformation values from metrics
    const offset = {
      x: metrics.offsetX,
      y: metrics.offsetY,
    };
    const rotatePoint = metrics.rotatePt;
    const angle = metrics.angle;
    const scaleFactor = metrics.scaleFactor;
    const geometryParts = arrowRecord.geometry;

    // Create a container group for the arrow head parts.
    const container = new HvacSVG.Container(HvacSVG.create("g"));
    container.parts = [];

    // If the arrowRecord provides a flipped geometry and isStart is true, use it.
    let partsGeometry = geometryParts;
    if (isStart && arrowRecord.flippedGeometry) {
      partsGeometry = arrowRecord.flippedGeometry;
    }

    // Iterate through each part of the arrow geometry.
    for (let i = 0; i < partsGeometry.length; i++) {
      let hasFill = false;
      let pathElement: any = null;
      let pathCommand = "";
      const geomPart = partsGeometry[i];

      switch (geomPart.type) {
        case "RECT": {
          pathElement = new HvacSVG.Path();
          pathCommand = "M";
          const posX = geomPart.pathData.x * scaleFactor + offset.x;
          const posY = geomPart.pathData.y * scaleFactor + offset.y;
          const rectWidth = geomPart.pathData.width * scaleFactor;
          const rectHeight = geomPart.pathData.height * scaleFactor;

          let rotatedPoint = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY }, angle);
          pathCommand += Utils1.RoundCoord(rotatedPoint.x) + "," + Utils1.RoundCoord(rotatedPoint.y) + "L";
          rotatedPoint = Utils1.RotatePoint(rotatePoint, { x: posX + rectWidth, y: posY }, angle);
          pathCommand += Utils1.RoundCoord(rotatedPoint.x) + "," + Utils1.RoundCoord(rotatedPoint.y) + "L";
          rotatedPoint = Utils1.RotatePoint(rotatePoint, { x: posX + rectWidth, y: posY + rectHeight }, angle);
          pathCommand += Utils1.RoundCoord(rotatedPoint.x) + "," + Utils1.RoundCoord(rotatedPoint.y) + "L";
          rotatedPoint = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY + rectHeight }, angle);
          pathCommand += Utils1.RoundCoord(rotatedPoint.x) + "," + Utils1.RoundCoord(rotatedPoint.y) + "z";
          pathElement.plot(pathCommand);
          hasFill = true;
          break;
        }
        case "OVAL": {
          pathElement = new HvacSVG.Path();
          pathCommand = "M";
          let posX = geomPart.pathData.x * scaleFactor + offset.x;
          let posY = geomPart.pathData.y * scaleFactor + offset.y;
          const halfWidth = (geomPart.pathData.width * scaleFactor) / 2;
          const halfHeight = (geomPart.pathData.height * scaleFactor) / 2;

          // Adjust posY for a slight offset as in original code.
          posY += halfHeight - 0.5;
          let rotatedCenter = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY }, angle);
          pathCommand += Utils1.RoundCoord(rotatedCenter.x) + "," + Utils1.RoundCoord(rotatedCenter.y) + "A";
          pathCommand +=
            Utils1.RoundCoord(halfWidth) +
            "," +
            Utils1.RoundCoord(halfHeight) +
            " " +
            Utils1.RoundCoord(angle) +
            " 1 1 ";
          rotatedCenter = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY + 1 }, angle);
          pathCommand += Utils1.RoundCoord(rotatedCenter.x) + "," + Utils1.RoundCoord(rotatedCenter.y) + "z";
          pathElement.plot(pathCommand);
          hasFill = true;
          break;
        }
        case "PATH": {
          pathElement = new HvacSVG.Path();
          pathCommand = "";
          const subPaths = geomPart.pathData;
          if (!Array.isArray(subPaths)) {
            continue;
          }
          for (let j = 0; j < subPaths.length; j++) {
            const segment = subPaths[j];
            if (!Array.isArray(segment) || segment.length < 1) {
              pathCommand = "";
              break;
            }
            switch (segment[0]) {
              case "M":
              case "L": {
                if (segment.length < 3) break;
                const posX = segment[1] * scaleFactor + offset.x;
                const posY = segment[2] * scaleFactor + offset.y;
                const rotatedPoint = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY }, angle);
                pathCommand += segment[0] + Utils1.RoundCoord(rotatedPoint.x) + "," + Utils1.RoundCoord(rotatedPoint.y);
                break;
              }
              case "A": {
                if (segment.length < 8) break;
                const posX = segment[6] * scaleFactor + offset.x;
                const posY = segment[7] * scaleFactor + offset.y;
                const arcWidth = segment[1] * scaleFactor;
                const arcHeight = segment[2] * scaleFactor;
                let rotatedPoint = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY }, angle);
                pathCommand +=
                  "A" +
                  Utils1.RoundCoord(arcWidth) +
                  "," +
                  Utils1.RoundCoord(arcHeight) +
                  " " +
                  Utils1.RoundCoord(segment[3] + angle) +
                  " " +
                  segment[4] +
                  " " +
                  segment[5] +
                  " " +
                  Utils1.RoundCoord(rotatedPoint.x) +
                  "," +
                  Utils1.RoundCoord(rotatedPoint.y);
                break;
              }
              case "z": {
                pathCommand += "z";
                hasFill = true;
                break;
              }
            }
          }
          pathElement.plot(pathCommand);
          break;
        }
        default: {
          pathElement = null;
        }
      }

      // If no white fill is specified, then filled is false.
      if (geomPart.noWhiteFill) {
        hasFill = false;
      }

      if (pathElement) {
        container.add(pathElement);
        container.parts.push({ elem: pathElement, filled: geomPart.filled });
        if (geomPart.filled) {
          pathElement.attr("stroke", "none");
          pathElement.attr("fill-opacity", strokeOpacity);
        } else {
          pathElement.attr("stroke-width", strokeWidth * geomPart.stroke);
          if (hasFill) {
            pathElement.attr("fill-opacity", 1);
            pathElement.attr("fill", "#FFFFFF");
          } else {
            pathElement.attr("fill", "none");
          }
        }
      }
    }

    // Set stroke-dasharray to none.
    container.attr("stroke-dasharray", "none");

    if (arrowBounds && arrowRecord.desc !== "empty") {
      // Calculate bounds based on the arrowRecord's defined area.
      let posX = offset.x;
      let posY = offset.y;
      let defWidth = arrowRecord.defArea.width * scaleFactor;
      let defHeight = arrowRecord.defArea.height * scaleFactor;
      if (angle) {
        let rotated = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY }, angle);
        let minX = rotated.x;
        let maxX = rotated.x;
        let minY = rotated.y;
        let maxY = rotated.y;
        rotated = Utils1.RotatePoint(rotatePoint, { x: posX + defWidth, y: posY }, angle);
        minX = rotated.x < minX ? rotated.x : minX;
        maxX = rotated.x > maxX ? rotated.x : maxX;
        minY = rotated.y < minY ? rotated.y : minY;
        maxY = rotated.y > maxY ? rotated.y : maxY;
        rotated = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY + defHeight }, angle);
        minX = rotated.x < minX ? rotated.x : minX;
        maxX = rotated.x > maxX ? rotated.x : maxX;
        minY = rotated.y < minY ? rotated.y : minY;
        maxY = rotated.y > maxY ? rotated.y : maxY;
        rotated = Utils1.RotatePoint(rotatePoint, { x: posX + defWidth, y: posY + defHeight }, angle);
        minX = rotated.x < minX ? rotated.x : minX;
        maxX = rotated.x > maxX ? rotated.x : maxX;
        minY = rotated.y < minY ? rotated.y : minY;
        maxY = rotated.y > maxY ? rotated.y : maxY;
        posX = minX;
        posY = minY;
        defWidth = maxX - minX;
        defHeight = maxY - minY;
      }
      arrowBounds.push({
        x: posX,
        y: posY,
        width: defWidth,
        height: defHeight,
      });
    }

    console.log("B.Path CreateArrowheadElem output:", container);
    return container;
  }

  CalcArrowheadPlacement(sArrowRec, eArrowRec) {
    console.log("= B.Path CalcArrowheadPlacement called with sArrowRec:", sArrowRec, "eArrowRec:", eArrowRec);

    if (!sArrowRec && !eArrowRec) {
      console.log("= B.Path CalcArrowheadPlacement no arrow records provided, exiting");
      return;
    }

    const totalLength = this.pathElem.node.getTotalLength();
    let startPoint = this.pathElem.node.getPointAtLength(0);
    let endPoint = this.pathElem.node.getPointAtLength(totalLength);
    let sTrimAmount = sArrowRec ? this.sArrowMetrics.trimAmount : 0;
    let eTrimAmount = eArrowRec ? this.eArrowMetrics.trimAmount : 0;

    if (sTrimAmount + eTrimAmount >= totalLength) {
      const midPoint = this.pathElem.node.getPointAtLength(totalLength / 2);
      if (sTrimAmount && eTrimAmount) {
        this.sArrowMetrics.trimAmount = totalLength / 2;
        this.eArrowMetrics.trimAmount = totalLength / 2;
        sTrimAmount = eTrimAmount = totalLength / 2;
      } else if (sTrimAmount) {
        this.sArrowMetrics.trimAmount = totalLength;
        sTrimAmount = totalLength;
      } else {
        this.eArrowMetrics.trimAmount = totalLength;
        eTrimAmount = totalLength;
      }
      startPoint = midPoint;
      endPoint = midPoint;
    }

    let sArrowPoint = sArrowRec ? (sArrowRec.centered ? this.pathElem.node.getPointAtLength(totalLength / 2) : this.pathElem.node.getPointAtLength(sTrimAmount)) : null;
    let eArrowPoint = eArrowRec ? (eArrowRec.centered ? this.pathElem.node.getPointAtLength(totalLength / 2) : this.pathElem.node.getPointAtLength(totalLength - eTrimAmount)) : null;

    if (sArrowRec) {
      let sArrowAnglePoint = sArrowPoint.x === startPoint.x && sArrowPoint.y === startPoint.y ? (totalLength < 2 ? { x: startPoint.x + 2, y: startPoint.y } : this.pathElem.node.getPointAtLength(2)) : sArrowPoint;
      if (sArrowRec.centered && totalLength >= 4) {
        startPoint = this.pathElem.node.getPointAtLength(totalLength / 2 - 2);
      }
      this.sArrowMetrics.angle = sArrowRec.noRotate ? 0 : Utils1.CalcAngleFromPoints(sArrowAnglePoint, startPoint);
      this.sArrowMetrics.rotatePt = sArrowPoint;
      this.sArrowMetrics.offsetX = sArrowPoint.x - this.sArrowMetrics.attachX;
      this.sArrowMetrics.offsetY = sArrowPoint.y - this.sArrowMetrics.attachY;
    }

    if (eArrowRec) {
      let eArrowAnglePoint = eArrowPoint.x === endPoint.x && eArrowPoint.y === endPoint.y ? (totalLength < 2 ? { x: endPoint.x - 2, y: endPoint.y } : this.pathElem.node.getPointAtLength(totalLength - 2)) : eArrowPoint;
      if (eArrowRec.centered && totalLength >= 4) {
        endPoint = this.pathElem.node.getPointAtLength(totalLength / 2 + 2);
      }
      this.eArrowMetrics.angle = eArrowRec.noRotate ? 0 : Utils1.CalcAngleFromPoints(eArrowAnglePoint, endPoint);
      this.eArrowMetrics.rotatePt = eArrowPoint;
      this.eArrowMetrics.offsetX = eArrowPoint.x - this.eArrowMetrics.attachX;
      this.eArrowMetrics.offsetY = eArrowPoint.y - this.eArrowMetrics.attachY;
    }

    console.log("= B.Path CalcArrowheadPlacement updated sArrowMetrics:", this.sArrowMetrics, "eArrowMetrics:", this.eArrowMetrics);
  }

  EmptyArrowhead() {
    console.log("= B.Path EmptyArrowhead called");

    const emptyArrowhead = {
      id: 0,
      desc: 'empty',
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
          type: 'RECT',
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

    console.log("= B.Path EmptyArrowhead returning", emptyArrowhead);
    return emptyArrowhead;
  }

  TrimPath(position: string, trimLength: number) {
    console.log("= B.Path TrimPath called with position:", position, "trimLength:", trimLength);

    const totalSegments = this.pathElem.node.pathSegList.numberOfItems;
    const totalLength = this.pathElem.node.getTotalLength();
    let currentPoint = { x: 0, y: 0 };

    if (trimLength) {
      if (trimLength >= totalLength) {
        this.pathElem.plot();
      } else {
        const trimPosition = position === 'start' ? trimLength : totalLength - trimLength;
        const segmentIndex = this.pathElem.node.getPathSegAtLength(trimPosition);
        let pointAtTrim = this.pathElem.node.getPointAtLength(trimPosition);
        pointAtTrim = {
          x: Utils1.RoundCoord(pointAtTrim.x),
          y: Utils1.RoundCoord(pointAtTrim.y)
        };
        const segment = this.pathElem.node.pathSegList.getItem(segmentIndex);

        if (position === 'start') {
          const isAbsolute = this.IsSegmentAbs(segment);
          if (!isAbsolute) {
            currentPoint = this.CalcSegEndpoint(this.pathElem, segmentIndex);
            currentPoint.x = Utils1.RoundCoord(currentPoint.x);
            currentPoint.y = Utils1.RoundCoord(currentPoint.y);
          }

          for (let i = 1; i < segmentIndex; i++) {
            this.pathElem.node.pathSegList.removeItem(1);
          }

          const moveToSegment = this.pathElem.node.createSVGPathSegMovetoAbs(pointAtTrim.x, pointAtTrim.y);
          this.pathElem.node.pathSegList.replaceItem(moveToSegment, 0);

          if (!isAbsolute) {
            let newSegment;
            switch (segment.pathSegType) {
              case ConstantData2.SVGPathSeg.PATHSEG_LINETO_ABS:
              case ConstantData2.SVGPathSeg.PATHSEG_LINETO_REL:
              case ConstantData2.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
              case ConstantData2.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL:
              case ConstantData2.SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
              case ConstantData2.SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL:
                newSegment = this.pathElem.node.createSVGPathSegLinetoAbs(currentPoint.x, currentPoint.y);
                break;
              case ConstantData2.SVGPathSeg.PATHSEG_ARC_ABS:
              case ConstantData2.SVGPathSeg.PATHSEG_ARC_REL:
                newSegment = this.pathElem.node.createSVGPathSegArcAbs(currentPoint.x, currentPoint.y, segment.r1, segment.r2, segment.angle, segment.largeArcFlag, segment.sweepFlag);
                break;
              default:
                newSegment = null;
            }
            if (newSegment) {
              this.pathElem.node.pathSegList.replaceItem(newSegment, 1);
            }
          }
        } else {
          for (let i = segmentIndex + 1; i < totalSegments; i++) {
            this.pathElem.node.pathSegList.removeItem(segmentIndex + 1);
          }

          let newSegment;
          switch (segment.pathSegType) {
            case ConstantData2.SVGPathSeg.PATHSEG_LINETO_ABS:
            case ConstantData2.SVGPathSeg.PATHSEG_LINETO_REL:
            case ConstantData2.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
            case ConstantData2.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL:
            case ConstantData2.SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
            case ConstantData2.SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL:
              newSegment = this.pathElem.node.createSVGPathSegLinetoAbs(pointAtTrim.x, pointAtTrim.y);
              break;
            case ConstantData2.SVGPathSeg.PATHSEG_ARC_ABS:
            case ConstantData2.SVGPathSeg.PATHSEG_ARC_REL:
              newSegment = this.pathElem.node.createSVGPathSegArcAbs(pointAtTrim.x, pointAtTrim.y, segment.r1, segment.r2, segment.angle, segment.largeArcFlag, segment.sweepFlag);
              break;
            default:
              newSegment = null;
          }
          if (newSegment) {
            this.pathElem.node.pathSegList.replaceItem(newSegment, segmentIndex);
          }
        }
      }
    }

    console.log("= B.Path TrimPath completed");
  }

  CalcSegEndpoint(pathElem, segmentIndex) {
    console.log("= B.Path CalcSegEndpoint called with pathElem:", pathElem, "segmentIndex:", segmentIndex);

    let endpoint = { x: 0, y: 0 };
    for (let i = 0; i <= segmentIndex; i++) {
      const segment = pathElem.node.pathSegList.getItem(i);
      switch (segment.pathSegType) {
        case ConstantData2.SVGPathSeg.PATHSEG_MOVETO_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_LINETO_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_ARC_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS:
          if (segment.x !== undefined) endpoint.x = segment.x;
          if (segment.y !== undefined) endpoint.y = segment.y;
          break;
        case ConstantData2.SVGPathSeg.PATHSEG_MOVETO_REL:
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

    console.log("= B.Path CalcSegEndpoint returning:", endpoint);
    return endpoint;
  }

  GetGeometryBBox() {
    console.log("= B.Path GetGeometryBBox called");

    if (this.geometryBBox.width < 0 || this.geometryBBox.height < 0) {
      console.log("= B.Path GetGeometryBBox calculating new bounding box");

      const formattingLayer = this.doc.GetFormattingLayer();
      const tempPath = new HvacSVG.Path();
      tempPath.plot(this.origPathData);
      formattingLayer.svgObj.add(tempPath);

      const bbox = tempPath.node.getBBox();
      formattingLayer.svgObj.remove(tempPath);

      this.geometryBBox.x = bbox.x;
      this.geometryBBox.y = bbox.y;
      this.geometryBBox.width = bbox.width;
      this.geometryBBox.height = bbox.height;

      console.log("= B.Path GetGeometryBBox new bounding box:", this.geometryBBox);
    } else {
      console.log("= B.Path GetGeometryBBox using cached bounding box:", this.geometryBBox);
    }

    return this.geometryBBox;
  }

  IsSegmentAbs(segment) {
    console.log("= B.Path IsSegmentAbs called with segment:", segment);

    let isAbsolute = false;
    switch (segment.pathSegType) {
      case ConstantData2.SVGPathSeg.PATHSEG_MOVETO_ABS:
      case ConstantData2.SVGPathSeg.PATHSEG_LINETO_ABS:
      case ConstantData2.SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
      case ConstantData2.SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS:
      case ConstantData2.SVGPathSeg.PATHSEG_ARC_ABS:
      case ConstantData2.SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS:
      case ConstantData2.SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS:
        isAbsolute = true;
        break;
    }

    console.log("= B.Path IsSegmentAbs returning:", isAbsolute);
    return isAbsolute;
  }

  IsClosed() {
    console.log("= B.Path IsClosed called");

    const numberOfItems = this.pathElem.node.pathSegList.numberOfItems;
    console.log("= B.Path IsClosed numberOfItems:", numberOfItems);

    if (numberOfItems < 1) {
      console.log("= B.Path IsClosed returning false");
      return false;
    }

    const lastSegment = this.pathElem.node.pathSegList.getItem(numberOfItems - 1);
    console.log("= B.Path IsClosed lastSegment:", lastSegment);

    const isClosed = lastSegment.pathSegType === ConstantData2.SVGPathSeg.PATHSEG_CLOSEPATH;
    console.log("= B.Path IsClosed returning", isClosed);

    return isClosed;
  }

  SetPath(pathData: any, bbox?: any) {
    console.log("= B.Path SetPath called with pathData:", pathData, "bbox:", bbox);

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

    this.RefreshPaint();

    console.log("= B.Path SetPath updated geometryBBox:", this.geometryBBox);
  }

  PathCreator() {
    console.log("= B.Path PathCreator called");
    if (!this.pathCreator) {
      this.pathCreator = new Creator(this);
      console.log("= B.Path PathCreator created new instance");
    }
    console.log("= B.Path PathCreator returning instance", this.pathCreator);
    return this.pathCreator;
  }

}

export default Path
