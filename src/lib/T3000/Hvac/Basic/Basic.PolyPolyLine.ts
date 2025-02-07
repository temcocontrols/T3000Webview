

import Path from "./Basic.Path"
import Utils1 from "../Helper/Utils1"

class PolyPolyLine extends Path {

  public pList: any;

  constructor() {
    super();
    this.pList = [];
    this.arrowElems = [];
  }

  Clear() {
    this.pList = [];
    this.BuildPath();
  }

  AddPolyLine(points: any, startArrowFlag: boolean, endArrowFlag: boolean): void {
    console.log("= B.Poly2Line - AddPolyLine input:", { points, startArrowFlag, endArrowFlag });

    this.pList.push({
      points: points,
      sArrowFlag: startArrowFlag,
      eArrowFlag: endArrowFlag
    });

    console.log("= B.Poly2Line - AddPolyLine output, updated pList:", this.pList);
  }

  BuildPath() {
    console.log("= B.Poly2Line - BuildPath input: pList =", this.pList);

    // Remove old arrow elements
    while (this.arrowAreaElem.children().length) {
      this.arrowAreaElem.removeAt(0);
    }

    this.arrowElems = [];
    const pathCreator = this.PathCreator();
    pathCreator.BeginPath();
    this.arrowheadBounds = [];

    let polylineCount = this.pList.length;
    let boundingTopLeft = { x: 0, y: 0 };
    let boundingBottomRight = { x: 0, y: 0 };
    let isFirstPoint = true;
    let useDefaultArrow = true;
    let currentPoint: { x: number; y: number } | null = null;
    let nextPoint: { x: number; y: number } | null = null;

    for (let polyIndex = 0; polyIndex < polylineCount; polyIndex++) {
      const polyItem = this.pList[polyIndex];
      const points = polyItem.points;
      const ptsCount = points.length;

      // Reset arrow configurations for this polyline
      let startArrowConfig: any = null;
      let endArrowConfig: any = null;

      for (let ptIndex = 0; ptIndex < ptsCount - 1; ptIndex++) {
        const isStartSegment = ptIndex === 0;
        const isEndSegment = ptIndex === ptsCount - 2;

        currentPoint = points[ptIndex];
        nextPoint = points[ptIndex + 1];

        // Create arrow config objects if needed
        if (isStartSegment && polyItem.sArrowFlag && this.sArrowRec) {
          startArrowConfig = {
            arrowRec: this.sArrowRec,
            arrowSize: this.sArrowSize,
            arrowDisp: this.sArrowDisp
          };
        }
        if (isEndSegment && polyItem.eArrowFlag && this.eArrowRec) {
          endArrowConfig = {
            arrowRec: this.eArrowRec,
            arrowSize: this.eArrowSize,
            arrowDisp: this.eArrowDisp
          };
        }

        // If any arrow configuration exists, generate arrowheads
        if (startArrowConfig || endArrowConfig) {
          this.GenerateArrowheads(currentPoint, nextPoint, startArrowConfig, endArrowConfig);
          useDefaultArrow = false;
        }

        // Update bounding box
        if (isFirstPoint) {
          boundingTopLeft.x = Math.min(currentPoint.x, nextPoint.x);
          boundingTopLeft.y = Math.min(currentPoint.y, nextPoint.y);
          boundingBottomRight.x = Math.max(currentPoint.x, nextPoint.x);
          boundingBottomRight.y = Math.max(currentPoint.y, nextPoint.y);
        } else {
          boundingTopLeft.x = Math.min(boundingTopLeft.x, currentPoint.x, nextPoint.x);
          boundingTopLeft.y = Math.min(boundingTopLeft.y, currentPoint.y, nextPoint.y);
          boundingBottomRight.x = Math.max(boundingBottomRight.x, currentPoint.x, nextPoint.x);
          boundingBottomRight.y = Math.max(boundingBottomRight.y, currentPoint.y, nextPoint.y);
        }
        isFirstPoint = false;

        // Adjust points if arrowheads were generated
        if (startArrowConfig && startArrowConfig.segPt) {
          currentPoint = startArrowConfig.segPt;
        }
        if (endArrowConfig && endArrowConfig.segPt) {
          nextPoint = endArrowConfig.segPt;
        }

        // Build the path
        if (isStartSegment) {
          pathCreator.MoveTo(currentPoint.x, currentPoint.y);
        } else if (!isEndSegment) {
          pathCreator.LineTo(currentPoint.x, currentPoint.y);
        }
        if (isEndSegment) {
          pathCreator.LineTo(nextPoint.x, nextPoint.y);
        }
      }

      // Add the generated arrow elements for this polyline (if any)
      if (startArrowConfig && startArrowConfig.arrowElem) {
        this.arrowAreaElem.add(startArrowConfig.arrowElem);
        this.arrowElems.push(startArrowConfig.arrowElem);
      }
      if (endArrowConfig && endArrowConfig.arrowElem) {
        this.arrowAreaElem.add(endArrowConfig.arrowElem);
        this.arrowElems.push(endArrowConfig.arrowElem);
      }
    }

    // If no arrowheads were generated and there's a valid point, generate a default arrow
    if (useDefaultArrow && currentPoint && nextPoint) {
      const defaultArrowConfig: any = {
        arrowRec: this.EmptyArrowhead(),
        arrowSize: this.sArrowSize,
        arrowDisp: false
      };
      this.GenerateArrowheads(currentPoint, nextPoint, defaultArrowConfig, null);
      this.arrowAreaElem.add(defaultArrowConfig.arrowElem);
      this.arrowElems.push(defaultArrowConfig.arrowElem);
    }

    // Finalize path and update geometry
    const pathData = pathCreator.ToString();
    this.origPathData = pathData;
    this.pathElem.plot(pathData);
    this.UpdateTransform();
    this.geometryBBox.x = boundingTopLeft.x;
    this.geometryBBox.y = boundingTopLeft.y;
    this.geometryBBox.width = boundingBottomRight.x - boundingTopLeft.x;
    this.geometryBBox.height = boundingBottomRight.y - boundingTopLeft.y;
    this.RefreshPaint();

    console.log("= B.Poly2Line - BuildPath output: pathData =", pathData);
  }

  UpdateArrowheads() {
    this.BuildPath();
  }

  GenerateArrowheads(
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number },
    startConfig: any,
    endConfig: any
  ): void {
    console.log("= B.Poly2Line - GenerateArrowheads input:", { startPoint, endPoint, startConfig, endConfig });

    let dx: number, dy: number;
    let distance: number;
    let trimStart: number, trimEnd: number, combinedTrim: number;
    let unitX: number, unitY: number;
    let startArrowDim: any = null, endArrowDim: any = null;

    if (startConfig || endConfig) {
      // Initialize start configuration.
      if (startConfig) {
        startConfig.segPt = { x: startPoint.x, y: startPoint.y };
        startConfig.attachPt = { x: startPoint.x, y: startPoint.y };
        startConfig.offset = { x: startPoint.x, y: startPoint.y };
        startConfig.arrowElem = null;
        startConfig.angle = 180;
      }

      // Initialize end configuration.
      if (endConfig) {
        endConfig.segPt = { x: endPoint.x, y: endPoint.y };
        endConfig.attachPt = { x: endPoint.x, y: endPoint.y };
        endConfig.offset = { x: endPoint.x, y: endPoint.y };
        endConfig.arrowElem = null;
        endConfig.angle = 0;
      }

      // Calculate vector and distance between points.
      dx = endPoint.x - startPoint.x;
      dy = endPoint.y - startPoint.y;
      distance = Math.sqrt(dx * dx + dy * dy);

      // Calculate arrow dimensions.
      if (startConfig) {
        startArrowDim = this.CalcArrowheadDim(startConfig.arrowRec, startConfig.arrowSize, startConfig.arrowDisp);
      }
      if (endConfig) {
        endArrowDim = this.CalcArrowheadDim(endConfig.arrowRec, endConfig.arrowSize, endConfig.arrowDisp);
      }

      // Calculate trim amounts.
      trimStart = startArrowDim ? startArrowDim.trimAmount : 0;
      trimEnd = endArrowDim ? endArrowDim.trimAmount : 0;
      combinedTrim = trimStart + trimEnd;
      if (combinedTrim > distance) {
        trimStart = (trimStart / combinedTrim) * distance;
        trimEnd = (trimEnd / combinedTrim) * distance;
      }

      // Calculate unit vector.
      if (distance) {
        unitX = dx / distance;
        unitY = dy / distance;

        if (startArrowDim) {
          // Adjust start point.
          startConfig.segPt.x = startPoint.x + trimStart * unitX;
          startConfig.segPt.y = startPoint.y + trimStart * unitY;
          if (startConfig.arrowRec.centered) {
            startConfig.attachPt.x = startPoint.x + (distance / 2) * unitX;
            startConfig.attachPt.y = startPoint.y + (distance / 2) * unitY;
          } else {
            startConfig.attachPt.x = startConfig.segPt.x;
            startConfig.attachPt.y = startConfig.segPt.y;
          }
          startConfig.angle = startConfig.arrowRec.noRotate ? 0 : Utils1.CalcAngleFromPoints(endPoint, startPoint);
          startConfig.offset.x = startConfig.attachPt.x - startArrowDim.attachX;
          startConfig.offset.y = startConfig.attachPt.y - startArrowDim.attachY;
        }

        if (endArrowDim) {
          // Adjust end point.
          endConfig.segPt.x = startPoint.x + (distance - trimEnd) * unitX;
          endConfig.segPt.y = startPoint.y + (distance - trimEnd) * unitY;
          if (endConfig.arrowRec.centered) {
            endConfig.attachPt.x = startPoint.x + (distance / 2) * unitX;
            endConfig.attachPt.y = startPoint.y + (distance / 2) * unitY;
          } else {
            endConfig.attachPt.x = endConfig.segPt.x;
            endConfig.attachPt.y = endConfig.segPt.y;
          }
          endConfig.angle = endConfig.arrowRec.noRotate ? 0 : Utils1.CalcAngleFromPoints(startPoint, endPoint);
          endConfig.offset.x = endConfig.attachPt.x - endArrowDim.attachX;
          endConfig.offset.y = endConfig.attachPt.y - endArrowDim.attachY;
        }
      }

      // Create arrowhead elements.
      if (startArrowDim) {
        startArrowDim.offsetX = startConfig.offset.x;
        startArrowDim.offsetY = startConfig.offset.y;
        startArrowDim.angle = startConfig.angle;
        startArrowDim.rotatePt = startConfig.attachPt;
        startConfig.arrowElem = this.CreateArrowheadElem(startConfig.arrowRec, startArrowDim, true, this.arrowheadBounds);
      }
      if (endArrowDim) {
        endArrowDim.offsetX = endConfig.offset.x;
        endArrowDim.offsetY = endConfig.offset.y;
        endArrowDim.angle = endConfig.angle;
        endArrowDim.rotatePt = endConfig.attachPt;
        endConfig.arrowElem = this.CreateArrowheadElem(endConfig.arrowRec, endArrowDim, false, this.arrowheadBounds);
      }
    }

    console.log("= B.Poly2Line - GenerateArrowheads output:", { startConfig, endConfig });
  }
}

export default PolyPolyLine
