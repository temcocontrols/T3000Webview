
import HvacSVG from "../Helper/SVG.t2"
import $ from "jquery"
import "../Helper/pathseg"
import Container from "./Basic.Container"
import Creator from "./Basic.Path.Creator"
import Utils1 from "../Helper/Utils1"
import ConstantData2 from "../Data/ConstantData2"

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

  CreateElement(svgDoc, parent) {
    this.svgObj = new HvacSVG.Container(HvacSVG.create('g'));
    this.pathElem = new HvacSVG.Path;
    this.svgObj.add(this.pathElem);
    this.arrowAreaElem = new HvacSVG.Container(HvacSVG.create('g'));
    this.svgObj.add(this.arrowAreaElem);
    this.InitElement(svgDoc, parent);
    return this.svgObj;
  }

  SetArrowheads(sArrowRec, sArrowSize, eArrowRec, eArrowSize, sArrowDisp, eArrowDisp) {
    if (!this.IsClosed()) {
      this.sArrowRec = sArrowRec;
      this.eArrowRec = eArrowRec;
      this.sArrowSize = sArrowSize;
      this.eArrowSize = eArrowSize;
      this.sArrowDisp = sArrowDisp || false;
      this.eArrowDisp = eArrowDisp || false;
      this.UpdateArrowheads();
    }
  }

  SetStrokeWidth(stkWidth) {
    if (isNaN(stkWidth) && typeof stkWidth === 'string') {
      stkWidth = Basic.Symbol.ParsePlaceholder(stkWidth, Basic.Symbol.Placeholder.LineThick);
    }
    stkWidth = Utils1.RoundCoord(stkWidth);
    this.pathElem.attr('stroke-width', stkWidth);
    this.strokeWidth = Number(stkWidth);
    this.pathElem.attr('stroke-dasharray', this.GetStrokePatternForWidth());
    this.UpdateArrowheads();
  }

  SetStrokeColor(stkColor) {
    this.svgObj.attr('stroke', stkColor);
    if (!this.IsClosed()) {
      this.svgObj.attr('fill', stkColor);
      this.pathElem.attr('fill', 'none');
    }
    this.ClearColorData(false);
  }

  UpdatePattern(id, isFill) {
    let strokeColor;
    Basic.Element.prototype.UpdatePattern.call(this, id, isFill);
    if (!isFill) {
      strokeColor = this.svgObj.attr('stroke');
      if (!this.IsClosed()) {
        this.svgObj.attr('fill', strokeColor);
        this.pathElem.attr('fill', 'none');
      }
    }
  }

  UpdateGradient(gradient: any, isFill: boolean): void {
    console.log("= B.Path UpdateGradient input:", { gradient, isFill });

    Basic.Element.prototype.UpdateGradient.call(this, gradient, isFill);

    if (!isFill) {
      const strokeColor = this.svgObj.attr('stroke');
      console.log("= B.Path UpdateGradient stroke retrieved:", strokeColor);

      if (!this.IsClosed()) {
        this.svgObj.attr('fill', strokeColor);
        this.pathElem.attr('fill', 'none');
        console.log("= B.Path UpdateGradient updated fill colors:", {
          svgObjFill: strokeColor,
          pathElemFill: 'none'
        });
      }
    }

    console.log("= B.Path UpdateGradient output:", {
      svgObj: this.svgObj,
      pathElem: this.pathElem
    });
  }

  SetStrokePattern(dasharray) {
    this.strokeDashArray = dasharray;
    this.pathElem.attr('stroke-dasharray', this.GetStrokePatternForWidth());
  }

  SetSize(e, t) {
  }

  GetArrowheadBounds() {
    return this.arrowheadBounds.map(bound => ({ ...bound }));
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

  CalcArrowheadDim(arrowSpec, arrowSize, displayFlag) {
    console.log("= B.Path CalcArrowheadDim input:", {
      arrowSpec,
      arrowSize,
      displayFlag
    });

    let dimension = {
      width: 0,
      height: 0,
      scaleFactor: 0,
      attachX: 0,
      attachY: 0,
      endX: 0,
      endY: 0,
      trimAmount: 0
    };

    let computedSize = 2 * (this.strokeWidth + arrowSize);
    if (arrowSpec.fixedSizeScale) {
      computedSize = this.strokeWidth * arrowSpec.fixedSizeScale;
    }

    let scale = computedSize / arrowSpec.defArea.height;
    dimension.width = arrowSpec.defArea.width * scale;
    dimension.height = computedSize;
    dimension.scaleFactor = scale;
    dimension.attachX = arrowSpec.attachPt.x * scale;
    dimension.attachY = arrowSpec.attachPt.y * scale;
    dimension.endX = arrowSpec.endPt.x * scale;
    dimension.endY = arrowSpec.endPt.y * scale;

    if (arrowSpec.centered) {
      dimension.endX = dimension.attachX;
      dimension.endY = dimension.attachY;
    }

    dimension.trimAmount = dimension.endX - dimension.attachX;

    if (displayFlag && !arrowSpec.centered) {
      dimension.trimAmount += 10;
    }

    console.log("= B.Path CalcArrowheadDim output:", dimension);
    return dimension;
  }

  CreateArrowheadElem(arrowSpec, arrowMetrics, isFlipped, boundsArray) {
    console.log("= B.Path CreateArrowheadElem input:", {
      arrowSpec,
      arrowMetrics,
      isFlipped,
      boundsArray
    });

    // Get stroke-width and stroke-opacity from elements
    let strokeWidth = this.pathElem.attr('stroke-width');
    let strokeOpacity = this.svgObj.attr('stroke-opacity');

    // Ensure strokeWidth and strokeOpacity are numeric
    if (isNaN(strokeWidth)) {
      strokeWidth = Number(
        Basic.Symbol.ParsePlaceholder(
          this.pathElem.attr('stroke-width'),
          Basic.Symbol.Placeholder.LineThick
        )
      );
    }
    if (isNaN(strokeOpacity)) {
      strokeOpacity = 1;
    }

    // Set up offset and rotation parameters
    let offset = {
      x: arrowMetrics.offsetX,
      y: arrowMetrics.offsetY
    };
    let rotatePoint = arrowMetrics.rotatePt;
    let angle = arrowMetrics.angle;
    let scaleFactor = arrowMetrics.scaleFactor;

    // Get the geometry list and allow flipped geometry if applicable
    let geometryList = arrowSpec.geometry;
    if (isFlipped && arrowSpec.flippedGeometry) {
      geometryList = arrowSpec.flippedGeometry;
    }

    // Create a container to hold the arrowhead parts
    let container = new HvacSVG.Container(HvacSVG.create('g'));
    container.parts = [];

    // Iterate over each geometry piece and build the path accordingly
    for (let i = 0; i < geometryList.length; i++) {
      let geometryPiece = geometryList[i];
      let pathElem = null;
      let pathString = '';
      let fillFlag = false; // Indicates whether the shape should be filled

      switch (geometryPiece.type) {
        case 'RECT': {
          pathElem = new HvacSVG.Path();
          pathString = 'M';
          let rectX = geometryPiece.pathData.x * scaleFactor + offset.x;
          let rectY = geometryPiece.pathData.y * scaleFactor + offset.y;
          let rectWidth = geometryPiece.pathData.width * scaleFactor;
          let rectHeight = geometryPiece.pathData.height * scaleFactor;
          let rotated = Utils1.RotatePoint(rotatePoint, { x: rectX, y: rectY }, angle);
          pathString += Utils1.RoundCoord(rotated.x) + ',' + Utils1.RoundCoord(rotated.y) + 'L';

          rotated = Utils1.RotatePoint(rotatePoint, { x: rectX + rectWidth, y: rectY }, angle);
          pathString += Utils1.RoundCoord(rotated.x) + ',' + Utils1.RoundCoord(rotated.y) + 'L';

          rotated = Utils1.RotatePoint(rotatePoint, { x: rectX + rectWidth, y: rectY + rectHeight }, angle);
          pathString += Utils1.RoundCoord(rotated.x) + ',' + Utils1.RoundCoord(rotated.y) + 'L';

          rotated = Utils1.RotatePoint(rotatePoint, { x: rectX, y: rectY + rectHeight }, angle);
          pathString += Utils1.RoundCoord(rotated.x) + ',' + Utils1.RoundCoord(rotated.y) + 'z';

          pathElem.plot(pathString);
          fillFlag = true;
          break;
        }
        case 'OVAL': {
          pathElem = new HvacSVG.Path();
          pathString = 'M';
          let ovalX = geometryPiece.pathData.x * scaleFactor + offset.x;
          let ovalY = geometryPiece.pathData.y * scaleFactor + offset.y;
          let radiusX = geometryPiece.pathData.width * scaleFactor / 2;
          let halfHeight = geometryPiece.pathData.height * scaleFactor / 2;
          // Adjust ovalY for rotation with a small offset
          ovalY = ovalY + halfHeight;
          let firstRotated = Utils1.RotatePoint(rotatePoint, { x: ovalX, y: ovalY - 0.5 }, angle);
          pathString += Utils1.RoundCoord(firstRotated.x) + ',' + Utils1.RoundCoord(firstRotated.y) + 'A';
          pathString += Utils1.RoundCoord(radiusX) + ',' + Utils1.RoundCoord(halfHeight) + ' ' + Utils1.RoundCoord(angle) + ' 1 1 ';
          let secondRotated = Utils1.RotatePoint(rotatePoint, { x: ovalX, y: ovalY + 0.5 }, angle);
          pathString += Utils1.RoundCoord(secondRotated.x) + ',' + Utils1.RoundCoord(secondRotated.y) + 'z';

          pathElem.plot(pathString);
          fillFlag = true;
          break;
        }
        case 'PATH': {
          pathElem = new HvacSVG.Path();
          pathString = '';
          let segments = geometryPiece.pathData;
          if (!Array.isArray(segments)) continue;
          for (let j = 0; j < segments.length; j++) {
            let segment = segments[j];
            if (!Array.isArray(segment) || segment.length < 1) {
              pathString = '';
              break;
            }
            switch (segment[0]) {
              case 'M':
              case 'L': {
                if (segment.length < 3) break;
                let rotated = Utils1.RotatePoint(
                  rotatePoint,
                  {
                    x: segment[1] * scaleFactor + offset.x,
                    y: segment[2] * scaleFactor + offset.y
                  },
                  angle
                );
                pathString += segment[0] + Utils1.RoundCoord(rotated.x) + ',' + Utils1.RoundCoord(rotated.y);
                break;
              }
              case 'A': {
                if (segment.length < 8) break;
                let arcX = segment[6] * scaleFactor + offset.x;
                let arcY = segment[7] * scaleFactor + offset.y;
                let arcRadiusX = segment[1] * scaleFactor;
                let arcRadiusY = segment[2] * scaleFactor;
                let rotatedArc = Utils1.RotatePoint(rotatePoint, { x: arcX, y: arcY }, angle);
                pathString +=
                  'A' +
                  Utils1.RoundCoord(arcRadiusX) +
                  ',' +
                  Utils1.RoundCoord(arcRadiusY) +
                  ' ' +
                  Utils1.RoundCoord(segment[3] + angle);
                pathString += ' ' + segment[4] + ' ' + segment[5] + ' ' + Utils1.RoundCoord(rotatedArc.x) + ',' + Utils1.RoundCoord(rotatedArc.y);
                break;
              }
              case 'z': {
                pathString += 'z';
                fillFlag = true;
                break;
              }
            }
          }
          pathElem.plot(pathString);
          break;
        }
        default: {
          pathElem = null;
        }
      }

      if (geometryPiece.noWhiteFill) {
        fillFlag = false;
      }

      if (pathElem) {
        container.add(pathElem);
        container.parts.push({
          elem: pathElem,
          filled: geometryPiece.filled
        });
        if (geometryPiece.filled) {
          pathElem.attr('stroke', 'none');
          pathElem.attr('fill-opacity', strokeOpacity);
        } else {
          pathElem.attr('stroke-width', strokeWidth * geometryPiece.stroke);
          if (fillFlag) {
            pathElem.attr('fill-opacity', 1);
            pathElem.attr('fill', '#FFFFFF');
          } else {
            pathElem.attr('fill', 'none');
          }
        }
      }
    }

    container.attr('stroke-dasharray', 'none');

    if (boundsArray && arrowSpec.desc !== 'empty') {
      let boundsX = offset.x;
      let boundsY = offset.y;
      let defAreaWidth = arrowSpec.defArea.width * scaleFactor;
      let defAreaHeight = arrowSpec.defArea.height * scaleFactor;

      if (angle) {
        let rotated = Utils1.RotatePoint(rotatePoint, { x: boundsX, y: boundsY }, angle);
        let minX = rotated.x,
          maxX = rotated.x,
          minY = rotated.y,
          maxY = rotated.y;

        rotated = Utils1.RotatePoint(rotatePoint, { x: boundsX + defAreaWidth, y: boundsY }, angle);
        minX = rotated.x < minX ? rotated.x : minX;
        maxX = rotated.x > maxX ? rotated.x : maxX;
        minY = rotated.y < minY ? rotated.y : minY;
        maxY = rotated.y > maxY ? rotated.y : maxY;

        rotated = Utils1.RotatePoint(rotatePoint, { x: boundsX, y: boundsY + defAreaHeight }, angle);
        minX = rotated.x < minX ? rotated.x : minX;
        maxX = rotated.x > maxX ? rotated.x : maxX;
        minY = rotated.y < minY ? rotated.y : minY;
        maxY = rotated.y > maxY ? rotated.y : maxY;

        rotated = Utils1.RotatePoint(rotatePoint, { x: boundsX + defAreaWidth, y: boundsY + defAreaHeight }, angle);
        minX = rotated.x < minX ? rotated.x : minX;
        maxX = rotated.x > maxX ? rotated.x : maxX;
        minY = rotated.y < minY ? rotated.y : minY;
        maxY = rotated.y > maxY ? rotated.y : maxY;

        boundsArray.push({
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        });
      }
    }

    console.log("= B.Path CreateArrowheadElem output:", container);
    return container;
  }

  CalcArrowheadPlacement(startArrowSpec, endArrowSpec) {
    console.log("= B.Path CalcArrowheadPlacement input:", { startArrowSpec, endArrowSpec });

    if (!startArrowSpec && !endArrowSpec) {
      return;
    }

    const totalLength = this.pathElem.node.getTotalLength();
    const startPathPoint = this.pathElem.node.getPointAtLength(0);
    const endPathPoint = this.pathElem.node.getPointAtLength(totalLength);

    let startTrimAmount = startArrowSpec ? this.sArrowMetrics.trimAmount : 0;
    let endTrimAmount = endArrowSpec ? this.eArrowMetrics.trimAmount : 0;

    // If total trim amount exceeds the path length, adjust to midpoint
    let startPlacementPoint, endPlacementPoint;
    if (startTrimAmount + endTrimAmount >= totalLength) {
      const midPoint = this.pathElem.node.getPointAtLength(totalLength / 2);
      if (startTrimAmount && endTrimAmount) {
        this.sArrowMetrics.trimAmount = totalLength / 2;
        this.eArrowMetrics.trimAmount = totalLength / 2;
        startTrimAmount = totalLength / 2;
        endTrimAmount = totalLength / 2;
      } else if (startTrimAmount) {
        this.sArrowMetrics.trimAmount = totalLength;
        startTrimAmount = totalLength;
      } else {
        this.eArrowMetrics.trimAmount = totalLength;
        endTrimAmount = totalLength;
      }
      startPlacementPoint = midPoint;
      endPlacementPoint = midPoint;
    }

    // Determine the placement points for start and end arrowheads
    if (startArrowSpec) {
      startPlacementPoint = startArrowSpec.centered
        ? this.pathElem.node.getPointAtLength(totalLength / 2)
        : this.pathElem.node.getPointAtLength(startTrimAmount);
    }
    if (endArrowSpec) {
      endPlacementPoint = endArrowSpec.centered
        ? this.pathElem.node.getPointAtLength(totalLength / 2)
        : this.pathElem.node.getPointAtLength(totalLength - endTrimAmount);
    }

    // Process start arrowhead metrics
    if (startArrowSpec) {
      let derivedStart = (startPlacementPoint.x === startPathPoint.x && startPlacementPoint.y === startPathPoint.y)
        ? (totalLength < 2 ? { x: startPathPoint.x + 2, y: startPathPoint.y }
                            : this.pathElem.node.getPointAtLength(2))
        : startPlacementPoint;
      if (startArrowSpec.centered && totalLength >= 4) {
        // Adjust start point when centered
        startPlacementPoint = this.pathElem.node.getPointAtLength(totalLength / 2);
      }
      this.sArrowMetrics.angle = startArrowSpec.noRotate
        ? 0
        : Utils1.CalcAngleFromPoints(derivedStart, startPathPoint);
      this.sArrowMetrics.rotatePt = startPlacementPoint;
      this.sArrowMetrics.offsetX = startPlacementPoint.x - this.sArrowMetrics.attachX;
      this.sArrowMetrics.offsetY = startPlacementPoint.y - this.sArrowMetrics.attachY;
    }

    // Process end arrowhead metrics
    if (endArrowSpec) {
      let derivedEnd = (endPlacementPoint.x === endPathPoint.x && endPlacementPoint.y === endPathPoint.y)
        ? (totalLength < 2 ? { x: endPathPoint.x - 2, y: endPathPoint.y }
                            : this.pathElem.node.getPointAtLength(totalLength - 2))
        : endPlacementPoint;
      if (endArrowSpec.centered && totalLength >= 4) {
        // Adjust end point when centered
        endPlacementPoint = this.pathElem.node.getPointAtLength(totalLength / 2);
      }
      this.eArrowMetrics.angle = endArrowSpec.noRotate
        ? 0
        : Utils1.CalcAngleFromPoints(derivedEnd, endPathPoint);
      this.eArrowMetrics.rotatePt = endPlacementPoint;
      this.eArrowMetrics.offsetX = endPlacementPoint.x - this.eArrowMetrics.attachX;
      this.eArrowMetrics.offsetY = endPlacementPoint.y - this.eArrowMetrics.attachY;
    }

    console.log("= B.Path CalcArrowheadPlacement output:", {
      sArrowMetrics: this.sArrowMetrics,
      eArrowMetrics: this.eArrowMetrics
    });
  }

  EmptyArrowhead() {
    console.log("= B.Path EmptyArrowhead input:", {});

    const arrowhead = {
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

    console.log("= B.Path EmptyArrowhead output:", arrowhead);
    return arrowhead;
  }

  TrimPath(direction: 'start' | 'end', trimValue: number): void {
    console.log("= B.Path TrimPath input:", { direction, trimValue });

    let segCount = this.pathElem.node.pathSegList.numberOfItems;
    let totalLength = this.pathElem.node.getTotalLength();
    let endpoint = { x: 0, y: 0 };

    // If trimValue is zero or falsy, nothing to trim.
    if (trimValue) {
      if (trimValue >= totalLength) {
        // If trim value exceeds total length reset the path.
        this.pathElem.plot();
      } else {
        // Calculate the target length along the path.
        let targetLength = direction === 'start' ? trimValue : totalLength - trimValue;
        let segIndex = this.pathElem.node.getPathSegAtLength(targetLength);
        let pointAtTrim = this.pathElem.node.getPointAtLength(targetLength);
        pointAtTrim = {
          x: Utils1.RoundCoord(pointAtTrim.x),
          y: Utils1.RoundCoord(pointAtTrim.y)
        };

        // Get the segment at the target index.
        let currentSeg = this.pathElem.node.pathSegList.getItem(segIndex);

        if (direction === 'start') {
          // Determine if the segment uses absolute coordinates.
          let isAbs = this.IsSegmentAbs(currentSeg);
          if (!isAbs) {
            endpoint = this.CalcSegEndpoint(this.pathElem, segIndex);
            endpoint.x = Utils1.RoundCoord(endpoint.x);
            endpoint.y = Utils1.RoundCoord(endpoint.y);
          }
          // Remove all segments from index 1 up to (but not including) segIndex.
          for (let i = 1; i < segIndex; i++) {
            this.pathElem.node.pathSegList.removeItem(1);
          }
          // Replace the first segment with a move-to at the trimmed point.
          let newSeg = this.pathElem.node.createSVGPathSegMovetoAbs(pointAtTrim.x, pointAtTrim.y);
          this.pathElem.node.pathSegList.replaceItem(newSeg, 0);

          if (!isAbs) {
            let replacementSeg;
            switch (currentSeg.pathSegType) {
              case ConstantData2.SVGPathSeg.PATHSEG_LINETO_ABS:
              case ConstantData2.SVGPathSeg.PATHSEG_LINETO_REL:
              case ConstantData2.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
              case ConstantData2.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL:
              case ConstantData2.SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
              case ConstantData2.SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL:
                replacementSeg = this.pathElem.node.createSVGPathSegLinetoAbs(endpoint.x, endpoint.y);
                break;
              case ConstantData2.SVGPathSeg.PATHSEG_ARC_ABS:
              case ConstantData2.SVGPathSeg.PATHSEG_ARC_REL:
                replacementSeg = this.pathElem.node.createSVGPathSegArcAbs(
                  endpoint.x,
                  endpoint.y,
                  currentSeg.r1,
                  currentSeg.r2,
                  currentSeg.angle,
                  currentSeg.largeArcFlag,
                  currentSeg.sweepFlag
                );
                break;
              default:
                replacementSeg = null;
            }
            if (replacementSeg) {
              this.pathElem.node.pathSegList.replaceItem(replacementSeg, 1);
            }
          }
        } else {
          // For 'end' direction: Remove all segments after segIndex.
          for (let i = segIndex + 1; i < segCount; i++) {
            this.pathElem.node.pathSegList.removeItem(segIndex + 1);
          }
          let replacementSeg;
          switch (currentSeg.pathSegType) {
            case ConstantData2.SVGPathSeg.PATHSEG_LINETO_ABS:
            case ConstantData2.SVGPathSeg.PATHSEG_LINETO_REL:
            case ConstantData2.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
            case ConstantData2.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL:
            case ConstantData2.SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
            case ConstantData2.SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL:
              replacementSeg = this.pathElem.node.createSVGPathSegLinetoAbs(pointAtTrim.x, pointAtTrim.y);
              break;
            case ConstantData2.SVGPathSeg.PATHSEG_ARC_ABS:
            case ConstantData2.SVGPathSeg.PATHSEG_ARC_REL:
              replacementSeg = this.pathElem.node.createSVGPathSegArcAbs(
                pointAtTrim.x,
                pointAtTrim.y,
                currentSeg.r1,
                currentSeg.r2,
                currentSeg.angle,
                currentSeg.largeArcFlag,
                currentSeg.sweepFlag
              );
              break;
            default:
              replacementSeg = null;
          }
          if (replacementSeg) {
            this.pathElem.node.pathSegList.replaceItem(replacementSeg, segIndex);
          }
        }
      }
    }
    console.log("= B.Path TrimPath output:", {
      direction,
      trimValue,
      segCount: this.pathElem.node.pathSegList.numberOfItems
    });
  }

  CalcSegEndpoint(element, segIndex) {
    console.log("= B.Path CalcSegEndpoint input:", { element, segIndex });
    let endpoint = { x: 0, y: 0 };

    for (let i = 0; i <= segIndex; i++) {
      const currentSeg = element.node.pathSegList.getItem(i);
      switch (currentSeg.pathSegType) {
        case ConstantData2.SVGPathSeg.PATHSEG_MOVETO_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_LINETO_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_ARC_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS:
        case ConstantData2.SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS:
          if (currentSeg.x !== undefined) {
            endpoint.x = currentSeg.x;
          }
          if (currentSeg.y !== undefined) {
            endpoint.y = currentSeg.y;
          }
          break;

        case ConstantData2.SVGPathSeg.PATHSEG_MOVETO_REL:
          if (i === 0) {
            endpoint.x = currentSeg.x;
            endpoint.y = currentSeg.y;
          } else {
            endpoint.x += currentSeg.x;
            endpoint.y += currentSeg.y;
          }
          break;

        default:
          if (currentSeg.x !== undefined) {
            endpoint.x += currentSeg.x;
          }
          if (currentSeg.y !== undefined) {
            endpoint.y += currentSeg.y;
          }
          break;
      }
    }

    console.log("= B.Path CalcSegEndpoint output:", endpoint);
    return endpoint;
  }

  GetGeometryBBox() {
    console.log("= B.Path GetGeometryBBox input:", {
      geometryBBox: this.geometryBBox,
      origPathData: this.origPathData
    });

    // If the bounding box values are not set, calculate them.
    if (this.geometryBBox.width < 0 || this.geometryBBox.height < 0) {
      let boundingBox;
      let tempPath: any;
      const formattingLayer = this.doc.GetFormattingLayer();

      tempPath = new HvacSVG.Path();
      tempPath.plot(this.origPathData);
      formattingLayer.svgObj.add(tempPath);

      boundingBox = tempPath.node.getBBox();
      formattingLayer.svgObj.remove(tempPath);

      this.geometryBBox = {
        x: boundingBox.x,
        y: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height,
      };

      console.log("= B.Path GetGeometryBBox calculated boundingBox:", this.geometryBBox);
    }

    console.log("= B.Path GetGeometryBBox output:", this.geometryBBox);
    return this.geometryBBox;
  }

  IsSegmentAbs(segment) {
    console.log("= B.Path IsSegmentAbs input:", segment);
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
    console.log("= B.Path IsSegmentAbs output:", isAbsolute);
    return isAbsolute;
  }

  IsClosed() {
    const numberOfItems = this.pathElem.node.pathSegList.numberOfItems;
    if (numberOfItems < 1) {
      return false;
    }
    const lastSegment = this.pathElem.node.pathSegList.getItem(numberOfItems - 1);
    return lastSegment.pathSegType === ConstantData2.SVGPathSeg.PATHSEG_CLOSEPATH;
  }

  SetPath(pathData, bbox) {
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
  }

  PathCreator() {
    if (!this.pathCreator) {
      this.pathCreator = new Creator(this);
    }
    return this.pathCreator;
  }
}

export default Path
