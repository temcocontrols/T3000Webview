

import $ from 'jquery';
import HvacSVG from "../Helper/SVG.t2"
import Path from "./Basic.Path";
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import ConstantData from "../Data/ConstantData"

class PolyPolyLine extends Path {

  public pList: any;

  constructor() {
    super();
    this.pList = [];
    this.arrowElems = [];
  }

  Clear() {
    console.log("= B.PolyPolyLine Clear: Clearing polyline list");
    this.pList = [];
    this.BuildPath();
    console.log("= B.PolyPolyLine Clear: Polyline list cleared and path rebuilt");
  }

  AddPolyLine(points, startArrowFlag, endArrowFlag) {
    console.log("= B.PolyPolyLine AddPolyLine: Adding polyline", { points, startArrowFlag, endArrowFlag });
    this.pList.push({
      points: points,
      sArrowFlag: startArrowFlag,
      eArrowFlag: endArrowFlag
    });
    console.log("= B.PolyPolyLine AddPolyLine: Polyline added", this.pList);
  }

  BuildPath() {
    console.log("= B.PolyPolyLine BuildPath: Input - Building path");

    // Remove all existing arrow children
    while (this.arrowAreaElem.children().length) {
      this.arrowAreaElem.removeAt(0);
    }
    this.arrowElems.length = 0;

    const pathCreator = this.PathCreator();
    pathCreator.BeginPath();
    this.arrowheadBounds = [];

    let currentPoint = null;
    const boundingMin = { x: 0, y: 0 };
    const boundingMax = { x: 0, y: 0 };
    let isFirstSegment = true;
    let arrowGenerated = false;

    const polylineCount = this.pList.length;
    for (let polyIndex = 0; polyIndex < polylineCount; polyIndex++) {
      let startArrowData = null;
      let endArrowData = null;
      const pointsCount = this.pList[polyIndex].points.length;

      for (let pointIndex = 0; pointIndex < pointsCount - 1; pointIndex++) {
        const isFirstSegmentOfPolyline = pointIndex === 0;
        const isLastSegmentOfPolyline = pointIndex === pointsCount - 2;

        const startPoint = this.pList[polyIndex].points[pointIndex];
        let endPoint = this.pList[polyIndex].points[pointIndex + 1];

        // Prepare arrowhead data for start and end of segment if available
        if (isFirstSegmentOfPolyline && this.pList[polyIndex].sArrowFlag && this.sArrowRec) {
          startArrowData = {
            arrowRec: this.sArrowRec,
            arrowSize: this.sArrowSize,
            arrowDisp: this.sArrowDisp
          };
        }

        if (isLastSegmentOfPolyline && this.pList[polyIndex].eArrowFlag && this.eArrowRec) {
          endArrowData = {
            arrowRec: this.eArrowRec,
            arrowSize: this.eArrowSize,
            arrowDisp: this.eArrowDisp
          };
        }

        // Generate arrowheads if any arrow data exists
        if (startArrowData || endArrowData) {
          console.log("= B.PolyPolyLine BuildPath: Generating arrowheads", { startPoint, endPoint, startArrowData, endArrowData });
          this.GenerateArrowheads(startPoint, endPoint, startArrowData, endArrowData);
          arrowGenerated = true;
        }

        // Update the bounding box
        if (isFirstSegment) {
          boundingMin.x = Math.min(startPoint.x, endPoint.x);
          boundingMin.y = Math.min(startPoint.y, endPoint.y);
          boundingMax.x = Math.max(startPoint.x, endPoint.x);
          boundingMax.y = Math.max(startPoint.y, endPoint.y);
        } else {
          boundingMin.x = Math.min(boundingMin.x, startPoint.x, endPoint.x);
          boundingMin.y = Math.min(boundingMin.y, startPoint.y, endPoint.y);
          boundingMax.x = Math.max(boundingMax.x, startPoint.x, endPoint.x);
          boundingMax.y = Math.max(boundingMax.y, startPoint.y, endPoint.y);
        }
        isFirstSegment = false;

        // Adjust start and end points based on arrowheads if generated
        if (startArrowData) {
          currentPoint = startArrowData.segPt;
        } else {
          currentPoint = startPoint;
        }
        if (endArrowData) {
          endPoint = endArrowData.segPt;
        }

        // Plot the path
        if (isFirstSegmentOfPolyline) {
          pathCreator.MoveTo(currentPoint.x, currentPoint.y);
        } else if (!isLastSegmentOfPolyline) {
          pathCreator.LineTo(currentPoint.x, currentPoint.y);
        }
        if (isLastSegmentOfPolyline) {
          pathCreator.LineTo(endPoint.x, endPoint.y);
        }
      }

      // Add arrow elements to the arrow area
      if (startArrowData) {
        this.arrowAreaElem.add(startArrowData.arrowElem);
        this.arrowElems.push(startArrowData.arrowElem);
      }
      if (endArrowData) {
        this.arrowAreaElem.add(endArrowData.arrowElem);
        this.arrowElems.push(endArrowData.arrowElem);
      }
    }

    // Fallback arrowhead generation if none was added
    if (!arrowGenerated && currentPoint) {
      const fallbackArrowData = {
        arrowRec: this.EmptyArrowhead(),
        arrowSize: this.sArrowSize,
        arrowDisp: false,
        arrowElem: null
      };
      // Using the last known endPoint from the loop to generate arrowhead
      this.GenerateArrowheads(currentPoint, currentPoint, fallbackArrowData, null);
      this.arrowAreaElem.add(fallbackArrowData.arrowElem);
      this.arrowElems.push(fallbackArrowData.arrowElem);
    }

    const pathData = pathCreator.ToString();
    this.origPathData = pathData;
    this.pathElem.plot(pathData);
    this.UpdateTransform();

    this.geometryBBox.x = boundingMin.x;
    this.geometryBBox.y = boundingMin.y;
    this.geometryBBox.width = boundingMax.x - boundingMin.x;
    this.geometryBBox.height = boundingMax.y - boundingMin.y;
    this.RefreshPaint();

    console.log("= B.PolyPolyLine BuildPath: Output", {
      origPathData: pathData,
      geometryBBox: this.geometryBBox
    });
  }

  UpdateArrowheads() {
    this.BuildPath()
  }

  GenerateArrowheads(startPoint, endPoint, startArrow, endArrow) {
    console.log("= B.PolyPolyLine GenerateArrowheads: Generating arrowheads", { startPoint, endPoint, startArrow, endArrow });

    let deltaX, deltaY, distance, startArrowDim, endArrowDim, trimAmount, startTrim, endTrim;
    let startArrowElem = null, endArrowElem = null;

    if (startArrow) {
      startArrow.segPt = { x: startPoint.x, y: startPoint.y };
      startArrow.attachPt = { x: startPoint.x, y: startPoint.y };
      startArrow.offset = { x: startPoint.x, y: startPoint.y };
      startArrow.arrowElem = null;
      startArrow.angle = 180;
    }

    if (endArrow) {
      endArrow.segPt = { x: endPoint.x, y: endPoint.y };
      endArrow.attachPt = { x: endPoint.x, y: endPoint.y };
      endArrow.offset = { x: endPoint.x, y: endPoint.y };
      endArrow.arrowElem = null;
      endArrow.angle = 0;
    }

    deltaX = endPoint.x - startPoint.x;
    deltaY = endPoint.y - startPoint.y;
    distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (startArrow) {
      startArrowDim = this.CalcArrowheadDim(startArrow.arrowRec, startArrow.arrowSize, startArrow.arrowDisp);
    }

    if (endArrow) {
      endArrowDim = this.CalcArrowheadDim(endArrow.arrowRec, endArrow.arrowSize, endArrow.arrowDisp);
    }

    trimAmount = (startArrowDim ? startArrowDim.trimAmount : 0) + (endArrowDim ? endArrowDim.trimAmount : 0);

    if (trimAmount > distance) {
      startTrim = (startArrowDim ? startArrowDim.trimAmount : 0) / trimAmount * distance;
      endTrim = (endArrowDim ? endArrowDim.trimAmount : 0) / trimAmount * distance;
    } else {
      startTrim = startArrowDim ? startArrowDim.trimAmount : 0;
      endTrim = endArrowDim ? endArrowDim.trimAmount : 0;
    }

    if (distance) {
      const unitX = deltaX / distance;
      const unitY = deltaY / distance;

      if (startArrow) {
        startArrow.segPt.x = startPoint.x + startTrim * unitX;
        startArrow.segPt.y = startPoint.y + startTrim * unitY;
        startArrow.attachPt.x = startArrow.arrowRec.centered ? startPoint.x + distance / 2 * unitX : startArrow.segPt.x;
        startArrow.attachPt.y = startArrow.arrowRec.centered ? startPoint.y + distance / 2 * unitY : startArrow.segPt.y;
        startArrow.angle = startArrow.arrowRec.noRotate ? 0 : Utils1.CalcAngleFromPoints(endPoint, startPoint);
        startArrow.offset.x = startArrow.attachPt.x - startArrowDim.attachX;
        startArrow.offset.y = startArrow.attachPt.y - startArrowDim.attachY;
      }

      if (endArrow) {
        endArrow.segPt.x = startPoint.x + (distance - endTrim) * unitX;
        endArrow.segPt.y = startPoint.y + (distance - endTrim) * unitY;
        endArrow.attachPt.x = endArrow.arrowRec.centered ? startPoint.x + distance / 2 * unitX : endArrow.segPt.x;
        endArrow.attachPt.y = endArrow.arrowRec.centered ? startPoint.y + distance / 2 * unitY : endArrow.segPt.y;
        endArrow.angle = endArrow.arrowRec.noRotate ? 0 : Utils1.CalcAngleFromPoints(startPoint, endPoint);
        endArrow.offset.x = endArrow.attachPt.x - endArrowDim.attachX;
        endArrow.offset.y = endArrow.attachPt.y - endArrowDim.attachY;
      }

      if (startArrowDim) {
        startArrowDim.offsetX = startArrow.offset.x;
        startArrowDim.offsetY = startArrow.offset.y;
        startArrowDim.angle = startArrow.angle;
        startArrowDim.rotatePt = startArrow.attachPt;
        startArrow.arrowElem = this.CreateArrowheadElem(startArrow.arrowRec, startArrowDim, true, this.arrowheadBounds);
      }

      if (endArrowDim) {
        endArrowDim.offsetX = endArrow.offset.x;
        endArrowDim.offsetY = endArrow.offset.y;
        endArrowDim.angle = endArrow.angle;
        endArrowDim.rotatePt = endArrow.attachPt;
        endArrow.arrowElem = this.CreateArrowheadElem(endArrow.arrowRec, endArrowDim, false, this.arrowheadBounds);
      }
    }

    console.log("= B.PolyPolyLine GenerateArrowheads: Arrowheads generated", { startArrow, endArrow });
  }

}

export default PolyPolyLine
