

import Path from "./B.Path";
import Utils1 from "../Util/Utils1"

/**
 * PolyPolyLine class extends Path to manage and display multiple polylines
 * with optional arrowheads on their segments.
 *
 * This class allows:
 * - Adding multiple polyline segments.
 * - Clearing and rebuilding the path.
 * - Generating arrowheads at the start and/or end of polyline segments.
 * - Calculating and updating the bounding box of the geometry.
 *
 * Example usage:
 * ----------------------------------------------------------------------------
 * import PolyPolyLine from "./B.PolyPolyLine";
 *
 * // Instantiate a new PolyPolyLine
 * const polyLine = new PolyPolyLine();
 *
 * // Add a polyline with arrow only at the start point
 * polyLine.AddPolyLine([{ x: 10, y: 10 }, { x: 50, y: 50 }], true, false);
 *
 * // Build the path for the added polyline
 * polyLine.BuildPath();
 *
 * // Optionally, update arrowheads later if necessary
 * polyLine.UpdateArrowheads();
 * ----------------------------------------------------------------------------
 */
class PolyPolyLine extends Path {

  // List to store multiple polylines and their corresponding arrow flags
  public pList: any;

  constructor() {
    super();
    // Array holding polyline definitions
    this.pList = [];
    // Array storing all SVG arrow elements for later management
    this.arrowElems = [];
  }

  /**
   * Clears all polylines from the list and rebuilds the SVG path.
   */
  Clear() {
    this.pList = [];
    this.BuildPath();
  }

  /**
   * Adds a polyline to the list with optional start and end arrow flags.
   * @param points - Array of point coordinates for the polyline.
   * @param startArrowFlag - Whether to display an arrow at the start point.
   * @param endArrowFlag - Whether to display an arrow at the end point.
   */
  AddPolyLine(points, startArrowFlag, endArrowFlag) {
    this.pList.push({
      points: points,
      sArrowFlag: startArrowFlag,
      eArrowFlag: endArrowFlag
    });
  }

  /**
   * Builds the SVG path from the stored polylines and generates arrowheads.
   *
   * - Removes previous arrow elements.
   * - Iterates through each polyline and its segments.
   * - Calculates bounding box dimensions.
   * - Adjusts segment endpoints if arrowheads are applied.
   * - Falls back to a default arrowhead if none are generated.
   */
  BuildPath() {
    // Remove all existing arrow elements from the arrow area
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

      // Loop through each segment of the polyline
      for (let pointIndex = 0; pointIndex < pointsCount - 1; pointIndex++) {
        const isFirstSegmentOfPolyline = pointIndex === 0;
        const isLastSegmentOfPolyline = pointIndex === pointsCount - 2;

        const startPoint = this.pList[polyIndex].points[pointIndex];
        let endPoint = this.pList[polyIndex].points[pointIndex + 1];

        // If the segment is the first and the flag is set, prepare start arrow data
        if (isFirstSegmentOfPolyline && this.pList[polyIndex].sArrowFlag && this.sArrowRec) {
          startArrowData = {
            arrowRec: this.sArrowRec,
            arrowSize: this.sArrowSize,
            arrowDisp: this.sArrowDisp
          };
        }

        // If the segment is the last and the flag is set, prepare end arrow data
        if (isLastSegmentOfPolyline && this.pList[polyIndex].eArrowFlag && this.eArrowRec) {
          endArrowData = {
            arrowRec: this.eArrowRec,
            arrowSize: this.eArrowSize,
            arrowDisp: this.eArrowDisp
          };
        }

        // Generate arrowheads if any arrow data exists for the segment
        if (startArrowData || endArrowData) {
          this.GenerateArrowheads(startPoint, endPoint, startArrowData, endArrowData);
          arrowGenerated = true;
        }

        // Update the bounding box values using the segment's points
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

        // Adjust the starting point if a start arrow is generated
        if (startArrowData) {
          currentPoint = startArrowData.segPt;
        } else {
          currentPoint = startPoint;
        }
        // Adjust the ending point if an end arrow is generated
        if (endArrowData) {
          endPoint = endArrowData.segPt;
        }

        // Plot the path based on the current polyline segment
        if (isFirstSegmentOfPolyline) {
          pathCreator.MoveTo(currentPoint.x, currentPoint.y);
        } else if (!isLastSegmentOfPolyline) {
          pathCreator.LineTo(currentPoint.x, currentPoint.y);
        }
        if (isLastSegmentOfPolyline) {
          pathCreator.LineTo(endPoint.x, endPoint.y);
        }
      }

      // Add generated arrow elements to the arrow area for rendering
      if (startArrowData) {
        this.arrowAreaElem.add(startArrowData.arrowElem);
        this.arrowElems.push(startArrowData.arrowElem);
      }
      if (endArrowData) {
        this.arrowAreaElem.add(endArrowData.arrowElem);
        this.arrowElems.push(endArrowData.arrowElem);
      }
    }

    // If no arrow was generated and a valid point exists, create a fallback arrowhead at the last point
    if (!arrowGenerated && currentPoint) {
      const fallbackArrowData = {
        arrowRec: this.EmptyArrowhead(),
        arrowSize: this.sArrowSize,
        arrowDisp: false,
        arrowElem: null
      };
      this.GenerateArrowheads(currentPoint, currentPoint, fallbackArrowData, null);
      this.arrowAreaElem.add(fallbackArrowData.arrowElem);
      this.arrowElems.push(fallbackArrowData.arrowElem);
    }

    // Finalize the path and update the transform and geometry bounding box
    const pathData = pathCreator.ToString();
    this.origPathData = pathData;
    this.pathElem.plot(pathData);
    this.UpdateTransform();

    this.geometryBBox.x = boundingMin.x;
    this.geometryBBox.y = boundingMin.y;
    this.geometryBBox.width = boundingMax.x - boundingMin.x;
    this.geometryBBox.height = boundingMax.y - boundingMin.y;
    this.RefreshPaint();
  }

  /**
   * Updates arrowheads by triggering a rebuild of the entire path.
   */
  UpdateArrowheads() {
    this.BuildPath();
  }

  /**
   * Generates arrowheads for a line segment between two points.
   *
   * Assigns calculated coordinates, angles, and offsets to the arrow configuration.
   * Checks both the start and end arrow data if provided.
   * Also calculates trimming of the line segment so that arrowheads do not overlap with the line.
   *
   * @param startPoint - The starting point of the line segment.
   * @param endPoint - The ending point of the line segment.
   * @param startArrow - Arrow configuration for the start point.
   * @param endArrow - Arrow configuration for the end point.
   */
  GenerateArrowheads(startPoint, endPoint, startArrow, endArrow) {
    let deltaX, deltaY, distance, startArrowDim, endArrowDim, trimAmount, startTrim, endTrim;

    // Initialize start arrow properties if provided
    if (startArrow) {
      startArrow.segPt = { x: startPoint.x, y: startPoint.y };
      startArrow.attachPt = { x: startPoint.x, y: startPoint.y };
      startArrow.offset = { x: startPoint.x, y: startPoint.y };
      startArrow.arrowElem = null;
      startArrow.angle = 180;
    }

    // Initialize end arrow properties if provided
    if (endArrow) {
      endArrow.segPt = { x: endPoint.x, y: endPoint.y };
      endArrow.attachPt = { x: endPoint.x, y: endPoint.y };
      endArrow.offset = { x: endPoint.x, y: endPoint.y };
      endArrow.arrowElem = null;
      endArrow.angle = 0;
    }

    // Calculate the distance and direction between the two points
    deltaX = endPoint.x - startPoint.x;
    deltaY = endPoint.y - startPoint.y;
    distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Retrieve arrowhead dimensions, including trim amount needed for arrowhead spacing
    if (startArrow) {
      startArrowDim = this.CalcArrowheadDim(startArrow.arrowRec, startArrow.arrowSize, startArrow.arrowDisp);
    }
    if (endArrow) {
      endArrowDim = this.CalcArrowheadDim(endArrow.arrowRec, endArrow.arrowSize, endArrow.arrowDisp);
    }
    trimAmount = (startArrowDim ? startArrowDim.trimAmount : 0) + (endArrowDim ? endArrowDim.trimAmount : 0);

    // Adjust trim amounts if the total trim exceeds the distance between points
    if (trimAmount > distance) {
      startTrim = (startArrowDim ? startArrowDim.trimAmount : 0) / trimAmount * distance;
      endTrim = (endArrowDim ? endArrowDim.trimAmount : 0) / trimAmount * distance;
    } else {
      startTrim = startArrowDim ? startArrowDim.trimAmount : 0;
      endTrim = endArrowDim ? endArrowDim.trimAmount : 0;
    }

    // Calculate adjusted positions and angles if there is a valid distance
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

      // Create the SVG element for the start arrowhead if dimensions are available
      if (startArrowDim) {
        startArrowDim.offsetX = startArrow.offset.x;
        startArrowDim.offsetY = startArrow.offset.y;
        startArrowDim.angle = startArrow.angle;
        startArrowDim.rotatePt = startArrow.attachPt;
        startArrow.arrowElem = this.CreateArrowheadElem(startArrow.arrowRec, startArrowDim, true, this.arrowheadBounds);
      }

      // Create the SVG element for the end arrowhead if dimensions are available
      if (endArrowDim) {
        endArrowDim.offsetX = endArrow.offset.x;
        endArrowDim.offsetY = endArrow.offset.y;
        endArrowDim.angle = endArrow.angle;
        endArrowDim.rotatePt = endArrow.attachPt;
        endArrow.arrowElem = this.CreateArrowheadElem(endArrow.arrowRec, endArrowDim, false, this.arrowheadBounds);
      }
    }
  }
}

export default PolyPolyLine
