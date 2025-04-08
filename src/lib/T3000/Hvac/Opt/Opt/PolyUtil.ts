

import NvConstant from '../../Data/Constant/NvConstant';
import OptConstant from "../../Data/Constant/OptConstant";
import Instance from '../../Data/Instance/Instance';
import T3Gv from '../../Data/T3Gv';
import Point from '../../Model/Point';
import PolyList from "../../Model/PolyList";
import PolySeg from "../../Model/PolySeg";
import '../../Util/T3Hammer';
import T3Util from "../../Util/T3Util";
import Utils1 from "../../Util/Utils1";
import Utils2 from "../../Util/Utils2";
import Utils3 from "../../Util/Utils3";
import DataUtil from "../Data/DataUtil";
import DSConstant from "../DS/DSConstant";
import PolygonConstant from "../Polygon/PolygonConstant";
import DrawUtil from './DrawUtil';
import HookUtil from './HookUtil';
import LayerUtil from "./LayerUtil";
import OptCMUtil from "./OptCMUtil";
import SelectUtil from "./SelectUtil";
import SvgUtil from "./SvgUtil";

class PolyUtil {

  /**
   * Converts an arc to a sequence of polyline points
   * @param segments - Number of segments to divide the arc into
   * @param center - Center point of the arc
   * @param radius - Radius of the arc
   * @param startY - Starting Y coordinate
   * @param endY - Ending Y coordinate
   * @param targetX - Target X coordinate
   * @param flipArc - Whether to flip the arc
   * @param isComplexArc - Whether this is a complex arc that requires multiple segments
   * @returns Array of points representing the arc
   */
  static ArcToPoly(segments, center, radius, startY, endY, targetX, flipArc, isComplexArc) {
    T3Util.Log("O.Opt: ArcToPoly inputs:", {
      segments,
      center: { x: center.x, y: center.y },
      radius,
      startY,
      endY,
      targetX,
      flipArc,
      isComplexArc
    });

    let isRightSide,
      midY1,
      midY2,
      points = [];

    // The following expression has no effect, but keeping it for compatibility
    endY - startY;

    if (isComplexArc) {
      // For complex arcs, divide into three segments
      if (startY > endY) {
        midY2 = center.y - radius;
        midY1 = center.y + radius;
      } else {
        midY1 = center.y - radius;
        midY2 = center.y + radius;
      }

      isRightSide = targetX < center.x;
      flipArc = false;

      // Generate three segments of the complex arc
      this.ArcToPolySeg(points, segments / 2, center, radius, startY, midY1, targetX, flipArc, !isRightSide);
      this.ArcToPolySeg(points, segments, center, radius, midY1, midY2, center.x, flipArc, isRightSide);
      this.ArcToPolySeg(points, segments / 2, center, radius, midY2, endY, targetX, flipArc, !isRightSide);
    } else {
      // For simple arcs, generate a single segment
      isRightSide = targetX >= center.x;
      this.ArcToPolySeg(points, segments, center, radius, startY, endY, targetX, flipArc, isRightSide);
    }

    T3Util.Log("O.Opt: ArcToPoly output points:", points.length);
    return points;
  }

  /**
   * Generates points along an arc segment and adds them to an array
   * @param points - Array to store the generated points
   * @param segments - Number of segments to divide the arc into
   * @param center - Center point of the arc
   * @param radius - Radius of the arc
   * @param startY - Starting Y coordinate
   * @param endY - Ending Y coordinate
   * @param targetX - Target X coordinate
   * @param flipArc - Whether to flip the arc
   * @param isRightSide - Whether the arc is on the right side
   * @returns Array of points representing the arc segment
   */
  static ArcToPolySeg(points, segments, center, radius, startY, endY, targetX, flipArc, isRightSide) {
    T3Util.Log("O.Opt: ArcToPolySeg inputs:", {
      segments,
      center: { x: center.x, y: center.y },
      radius,
      startY,
      endY,
      targetX,
      flipArc,
      isRightSide
    });

    const radiusSquared = radius * radius;
    const yStep = (endY - startY) / segments;

    for (let i = 0; i < segments; i++) {
      const yOffset = yStep * i;
      const yDist = center.y - (startY + yOffset);
      const xDist = Utils2.sqrt(radiusSquared - yDist * yDist);

      const point = new Point(0, 0);
      point.y = center.y - yDist;

      if (isRightSide) {
        point.x = center.x + xDist;
        const diff = point.x - targetX;
        if (flipArc) {
          point.x = targetX - diff;
        }
      } else {
        point.x = center.x - xDist;
        const diff = targetX - point.x;
        if (flipArc) {
          point.x = targetX + diff;
        }
      }

      points.push(point);
    }

    T3Util.Log("O.Opt: ArcToPolySeg output points count:", points.length);
    return points;
  }

  /**
     * Gets intersection points between a line and a polyline
     * @param polylinePoints - Array of points defining the polyline
     * @param intersectValue - Value to test for intersection (x or y coordinate)
     * @param resultPoints - Array to store intersection points
     * @param resultIndices - Optional array to store indices of intersecting segments
     * @param isHorizontal - True for horizontal intersection line, false for vertical
     * @returns Number of intersection points found
     */
  static PolyGetIntersect(
    polylinePoints: Point[],
    intersectValue: number,
    resultPoints: number[],
    resultIndices?: number[],
    isHorizontal?: boolean
  ): number {
    T3Util.Log("O.Opt PolyGetIntersect - Input:", {
      pointCount: polylinePoints.length,
      intersectValue,
      isHorizontal
    });

    let currentIndex = 0;
    let nextIndex = 1;
    let foundIntersection = false;
    let checkIndex = 0;
    let pointCount = polylinePoints.length;
    let intersectionCount = 0;
    let currentPoint = { x: 0, y: 0 };
    let nextPoint = { x: 0, y: 0 };
    let deltaX, deltaY, tempValue;
    let minValue, maxValue;
    let intersectX, intersectY;
    let rangeStart, rangeEnd;

    // Process each line segment in the polyline
    for (; nextIndex < pointCount + 1; nextIndex++) {
      let segmentEndIndex = nextIndex;
      currentPoint = polylinePoints[currentIndex];

      // Handle wrapping to start point for closed polylines
      if (nextIndex === pointCount) {
        nextPoint = polylinePoints[0];
        segmentEndIndex = 0;
      } else {
        nextPoint = polylinePoints[nextIndex];
      }

      // Skip zero-length segments
      if (Utils2.IsEqual(nextPoint.x, currentPoint.x) &&
        Utils2.IsEqual(nextPoint.y, currentPoint.y)) {
        continue;
      }

      currentIndex = nextIndex;
      deltaX = nextPoint.x - currentPoint.x;
      deltaY = nextPoint.y - currentPoint.y;

      // Handle horizontal intersection line
      if (isHorizontal) {
        // Determine x range of segment
        if (currentPoint.x < nextPoint.x) {
          minValue = currentPoint.x;
          maxValue = nextPoint.x;
        } else {
          minValue = nextPoint.x;
          maxValue = currentPoint.x;
        }

        // Skip if intersection line is outside segment x range
        if (intersectValue < minValue || intersectValue > maxValue) {
          continue;
        }

        // Prevent division by zero
        if (deltaX === 0) {
          deltaX = 1;
        }

        // Calculate intersection y coordinate
        intersectY = deltaY / deltaX * (intersectValue - currentPoint.x) + currentPoint.y;

        // Determine valid y range for intersection
        if (currentPoint.y < nextPoint.y) {
          rangeStart = currentPoint.y;
          rangeEnd = nextPoint.y;
        } else {
          rangeEnd = currentPoint.y;
          rangeStart = nextPoint.y;
        }

        // Check if intersection is within valid range
        if (intersectY >= rangeStart && intersectY <= rangeEnd) {
          // Check if this point is distinct from previous intersections
          if (intersectionCount > 0) {
            for (checkIndex = 0; checkIndex < intersectionCount; checkIndex++) {
              foundIntersection = Math.abs(intersectY - resultPoints[checkIndex]) > 1;
            }
          } else {
            foundIntersection = true;
          }

          if (foundIntersection) {
            // Stop if we've found too many intersections
            if (intersectionCount >= 2) {
              T3Util.Log("O.Opt PolyGetIntersect - Output: Too many intersections", intersectionCount + 1);
              return intersectionCount + 1;
            }

            // Store the intersection point
            resultPoints[intersectionCount] = intersectY;
            if (resultIndices) {
              resultIndices[intersectionCount] = segmentEndIndex;
            }
            intersectionCount++;
          }
        }
      }
      // Handle vertical intersection line
      else {
        // Similar logic but for vertical intersection
        if (currentPoint.y < nextPoint.y) {
          minValue = currentPoint.y;
          maxValue = nextPoint.y;
        } else {
          minValue = nextPoint.y;
          maxValue = currentPoint.y;
        }

        if (intersectValue < minValue || intersectValue > maxValue) {
          continue;
        }

        if (deltaY === 0) {
          deltaY = 1;
        }

        intersectX = deltaX / deltaY * (intersectValue - currentPoint.y) + currentPoint.x;

        if (currentPoint.x < nextPoint.x) {
          rangeStart = currentPoint.x;
          rangeEnd = nextPoint.x;
        } else {
          rangeEnd = currentPoint.x;
          rangeStart = nextPoint.x;
        }

        if (intersectX >= rangeStart && intersectX <= rangeEnd) {
          if (intersectionCount > 0) {
            for (checkIndex = 0; checkIndex < intersectionCount; checkIndex++) {
              foundIntersection = Math.abs(intersectX - resultPoints[checkIndex]) > 1;
            }
          } else {
            foundIntersection = true;
          }

          if (foundIntersection) {
            if (intersectionCount >= 2) {
              T3Util.Log("O.Opt PolyGetIntersect - Output: Too many intersections", intersectionCount + 1);
              return intersectionCount + 1;
            }

            resultPoints[intersectionCount] = intersectX;
            if (resultIndices) {
              resultIndices[intersectionCount] = segmentEndIndex;
            }
            intersectionCount++;
          }
        }
      }
    }

    // Sort intersection points in ascending order
    if (intersectionCount === 2 && resultPoints[0] > resultPoints[1]) {
      tempValue = resultPoints[1];
      resultPoints[1] = resultPoints[0];
      resultPoints[0] = tempValue;

      if (resultIndices) {
        tempValue = resultIndices[1];
        resultIndices[1] = resultIndices[0];
        resultIndices[0] = tempValue;
      }
    }

    T3Util.Log("O.Opt PolyGetIntersect - Output: Found", intersectionCount, "intersections");
    return intersectionCount;
  }

  /**
   * Converts an arc point to its corresponding chord point
   * This function transforms a point on an arc to a point on a straight line (chord)
   * @param startPoint - The starting point of the arc
   * @param endPoint - The ending point of the arc
   * @param targetPoint - The target point to convert
   * @param connectionLine - The connection line information (optional)
   * @param lineSegment - The line segment object containing the arc
   * @returns The converted chord point
   */
  static ArcToChord(startPoint, endPoint, targetPoint, connectionLine, lineSegment) {
    // Calculate midpoint between start and end points
    const midpoint = {
      x: (endPoint.x + startPoint.x) / 2,
      y: (endPoint.y + startPoint.y) / 2
    };

    // Calculate vector from start to end
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;

    // Calculate distance and normalized direction
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const normalizedY = deltaY / distance;
    const normalizedX = deltaX / distance;

    // Handle very small values
    const adjustedNormalizedY = Math.abs(normalizedY) < 1e-4 ? 0 : normalizedY;
    const adjustedDeltaX = Math.abs(deltaX) < 1e-4 ? 0 : deltaX;

    // Calculate angles
    const arcSine = Math.asin(adjustedNormalizedY);
    const arcCosine = Math.acos(normalizedX);

    // Initialize points for calculations
    let startRotated = { x: 0, y: 0 };
    let endRotated = { x: 0, y: 0 };

    // Adjust angle based on quadrant
    let angle;
    if (adjustedDeltaX < 0 && deltaY < 0) {
      angle = -arcCosine;
    } else if (arcSine > 0 && adjustedDeltaX < 0) {
      angle = -arcSine;
    } else {
      angle = arcSine;
    }

    // Calculate sine and cosine of the adjusted angle
    const sinAngle = Math.sin(angle);
    const cosAngle = Math.cos(angle);

    // Calculate rotated coordinates for start point
    let relativeX = startPoint.x - midpoint.x;
    let relativeY = startPoint.y - midpoint.y;
    startRotated.x = relativeX * cosAngle + relativeY * sinAngle + midpoint.x;
    startRotated.y = -relativeX * sinAngle + relativeY * cosAngle + midpoint.y;

    // Calculate rotated coordinates for end point
    relativeX = endPoint.x - midpoint.x;
    relativeY = endPoint.y - midpoint.y;
    endRotated.x = relativeX * cosAngle + relativeY * sinAngle + midpoint.x;
    endRotated.y = -relativeX * sinAngle + relativeY * cosAngle + midpoint.y;

    // Initialize and rotate line segment points
    const lineStartPoint = {
      x: lineSegment.StartPoint.x,
      y: lineSegment.StartPoint.y
    };
    const lineEndPoint = {
      x: lineSegment.EndPoint.x,
      y: lineSegment.EndPoint.y
    };

    // Rotate line start point
    relativeX = lineStartPoint.x - midpoint.x;
    relativeY = lineStartPoint.y - midpoint.y;
    lineStartPoint.x = relativeX * cosAngle + relativeY * sinAngle + midpoint.x;
    lineStartPoint.y = -relativeX * sinAngle + relativeY * cosAngle + midpoint.y;

    // Rotate line end point
    relativeX = lineEndPoint.x - midpoint.x;
    relativeY = lineEndPoint.y - midpoint.y;
    lineEndPoint.x = relativeX * cosAngle + relativeY * sinAngle + midpoint.x;
    lineEndPoint.y = -relativeX * sinAngle + relativeY * cosAngle + midpoint.y;

    // Rotate target point
    relativeX = targetPoint.x - midpoint.x;
    relativeY = targetPoint.y - midpoint.y;
    const resultPoint = {
      x: relativeX * cosAngle + relativeY * sinAngle + midpoint.x,
      y: -relativeX * sinAngle + relativeY * cosAngle + midpoint.y
    };

    let centerPoint = { x: 0, y: 0 };
    let isBelowCenter = false;

    // Process connection line if provided
    if (connectionLine) {
      // Rotate center point
      relativeX = connectionLine.center.x - midpoint.x;
      relativeY = connectionLine.center.y - midpoint.y;
      centerPoint.x = relativeX * cosAngle + relativeY * sinAngle + midpoint.x;
      centerPoint.y = -relativeX * sinAngle + relativeY * cosAngle + midpoint.y;

      // Determine if result point is below center
      isBelowCenter = midpoint.y < centerPoint.y ? resultPoint.y < centerPoint.y : resultPoint.y > centerPoint.y;

      // Adjust x position based on relative positions
      if (isBelowCenter) {
        if (lineStartPoint.x < lineEndPoint.x) {
          if (resultPoint.x > lineStartPoint.x && resultPoint.x < lineEndPoint.x) {
            if (lineEndPoint.x - resultPoint.x < resultPoint.x - lineStartPoint.x) {
              resultPoint.x = lineEndPoint.x;
            } else {
              resultPoint.x = lineStartPoint.x;
            }
          }
        } else {
          if (resultPoint.x > lineEndPoint.x && resultPoint.x < lineStartPoint.x) {
            if (lineStartPoint.x - resultPoint.x < resultPoint.x - lineEndPoint.x) {
              resultPoint.x = lineStartPoint.x;
            } else {
              resultPoint.x = lineEndPoint.x;
            }
          }
        }
      }
    }

    // Set y to midpoint y and prepare to rotate back
    resultPoint.y = midpoint.y;
    relativeX = resultPoint.x - midpoint.x;
    relativeY = resultPoint.y - midpoint.y;

    // Rotate back using negative angle
    const negSinAngle = Math.sin(-angle);
    const negCosAngle = Math.cos(-angle);

    // Final position calculation
    resultPoint.x = relativeX * negCosAngle + relativeY * negSinAngle + midpoint.x;
    resultPoint.y = -relativeX * negSinAngle + relativeY * negCosAngle + midpoint.y;

    // Rotate start point back
    relativeX = startRotated.x - midpoint.x;
    relativeY = startRotated.y - midpoint.y;
    startRotated.x = relativeX * negCosAngle + relativeY * negSinAngle + midpoint.x;
    startRotated.y = -relativeX * negSinAngle + relativeY * negCosAngle + midpoint.y;

    // Round and adjust if needed
    if (connectionLine) {
      resultPoint.x = 2 * Math.round((resultPoint.x + 0.5) / 2);
      if (isBelowCenter === true) {
        resultPoint.x--;
      }
    }

    return resultPoint;
  }

  /**
   * Converts a chord point to its corresponding arc point
   * This function transforms a point on a straight line (chord) to a point on an arc
   * @param startPoint - The starting point of the chord
   * @param endPoint - The ending point of the chord
   * @param centerPoint - The center point of the arc
   * @param radius - The radius of the arc
   * @param isInverted - Whether the arc is inverted
   * @param flipArc - Whether to flip the arc direction
   * @param isCenterInside - Whether the center is inside the arc
   * @param targetPoint - The target point to convert
   * @returns The converted arc point
   */
  static ChordToArc(startPoint, endPoint, centerPoint, radius, isInverted, flipArc, isCenterInside, targetPoint) {
    // Calculate vector from start to end
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;

    // Calculate distance and normalized direction
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const normalizedY = deltaY / distance;
    const normalizedX = deltaX / distance;

    // Handle very small values
    const adjustedNormalizedY = Math.abs(normalizedY) < 1e-4 ? 0 : normalizedY;
    const adjustedDeltaX = Math.abs(deltaX) < 1e-4 ? 0 : deltaX;

    // Calculate angle
    let arcSine = Math.asin(adjustedNormalizedY);

    // Adjust angle based on quadrant
    if ((arcSine > 0 && deltaX < 0) || (arcSine < 0 && deltaX < 0 && deltaY < 0)) {
      arcSine = -arcSine;
    }

    // Calculate sine and cosine of the angle
    let sinAngle = Math.sin(arcSine);
    let cosAngle = Math.cos(arcSine);

    // Initialize points for rotations
    let resultPoint = { x: 0, y: 0 };
    let startRotated = { x: 0, y: 0 };
    let targetRotated = { x: 0, y: 0 };
    let endRotated = { x: 0, y: 0 };

    // Calculate rotated coordinates for start point
    let relativeX = startPoint.x - centerPoint.x;
    let relativeY = startPoint.y - centerPoint.y;
    targetRotated.x = relativeX * cosAngle + relativeY * sinAngle + centerPoint.x;
    targetRotated.y = -relativeX * sinAngle + relativeY * cosAngle + centerPoint.y;

    // Calculate rotated coordinates for end point
    relativeX = endPoint.x - centerPoint.x;
    relativeY = endPoint.y - centerPoint.y;
    endRotated.x = relativeX * cosAngle + relativeY * sinAngle + centerPoint.x;
    endRotated.y = -relativeX * sinAngle + relativeY * cosAngle + centerPoint.y;

    // Calculate rotated coordinates for target point
    relativeX = targetPoint.x - centerPoint.x;
    relativeY = targetPoint.y - centerPoint.y;
    resultPoint.x = relativeX * cosAngle + relativeY * sinAngle + centerPoint.x;
    resultPoint.y = -relativeX * sinAngle + relativeY * cosAngle + centerPoint.y;

    // Calculate rotated coordinates for start point (used for reference)
    relativeX = startPoint.x - centerPoint.x;
    relativeY = startPoint.y - centerPoint.y;
    startRotated.x = relativeX * cosAngle + relativeY * sinAngle + centerPoint.x;
    startRotated.y = -relativeX * sinAngle + relativeY * cosAngle + centerPoint.y;

    // Determine if point is above center
    let isAboveCenter = (startRotated.y > centerPoint.y && !isCenterInside) ||
      (startRotated.y <= centerPoint.y && isCenterInside);

    // Handle flip arc option
    if (flipArc) {
      isAboveCenter = !isAboveCenter;
    }

    // Calculate x distance and ensure it's within radius
    relativeX = resultPoint.x - centerPoint.x;
    if (Math.abs(relativeX) > radius) {
      relativeX = radius;
    }

    // Calculate y component using Pythagorean theorem
    const yComponent = Utils2.sqrt(radius * radius - relativeX * relativeX);

    // Set y position based on whether point is above or below center
    if (isAboveCenter) {
      resultPoint.y = centerPoint.y + yComponent;
      if (isInverted) {
        const yOffset = startRotated.y - resultPoint.y;
        resultPoint.y = startRotated.y + yOffset;
      }
    } else {
      resultPoint.y = centerPoint.y - yComponent;
      if (isInverted) {
        const yOffset = startRotated.y - resultPoint.y;
        resultPoint.y = startRotated.y + yOffset;
      }
    }

    // Calculate relative position for final rotation
    relativeX = resultPoint.x - centerPoint.x;
    relativeY = resultPoint.y - centerPoint.y;

    // Rotate back using negative angle
    const negSinAngle = Math.sin(-arcSine);
    const negCosAngle = Math.cos(-arcSine);

    // Final position calculation
    resultPoint.x = relativeX * negCosAngle + relativeY * negSinAngle + centerPoint.x;
    resultPoint.y = -relativeX * negSinAngle + relativeY * negCosAngle + centerPoint.y;

    return resultPoint;
  }

  /**
   * Calculates the intersection point between an arc and a line
   * This function determines if and where a line intersects with an arc segment,
   * and returns the intersection point in the provided output parameter
   *
   * @param arcSegment - The arc segment to test for intersection
   * @param lineSegment - The line segment to test for intersection
   * @param intersectionPoint - Object to store the intersection point coordinates
   * @returns True if an intersection is found, false otherwise
   */
  static ArcIntersect(arcSegment, lineSegment, intersectionPoint) {
    // Calculate the arc's center and radius
    let arcDeltaX = arcSegment.EndPoint.x - arcSegment.StartPoint.x;
    let arcDeltaY = arcSegment.EndPoint.y - arcSegment.StartPoint.y;

    // Calculate the center and radius of the arc
    let arcInfo = arcSegment.IsReversed
      ? arcSegment.CalcRadiusAndCenter(
        arcSegment.EndPoint.x,
        arcSegment.EndPoint.y,
        arcSegment.StartPoint.x,
        arcSegment.StartPoint.y,
        arcSegment.CurveAdjust,
        arcSegment.IsReversed
      )
      : arcSegment.CalcRadiusAndCenter(
        arcSegment.StartPoint.x,
        arcSegment.StartPoint.y,
        arcSegment.EndPoint.x,
        arcSegment.EndPoint.y,
        arcSegment.CurveAdjust,
        arcSegment.IsReversed
      );

    let arcCenter = {
      x: arcInfo.centerX,
      y: arcInfo.centerY
    };
    let radius = arcInfo.radius;

    // Calculate the line's parameters
    let lineDeltaX = lineSegment.EndPoint.x - lineSegment.StartPoint.x;
    let lineDeltaY = lineSegment.EndPoint.y - lineSegment.StartPoint.y;
    let isLineVertical = lineDeltaX === 0;
    let lineSlope = isLineVertical ? 1 : lineDeltaY / lineDeltaX;
    let lineStartX = lineSegment.StartPoint.x;
    let lineStartY = lineSegment.StartPoint.y;

    // Get arc points for hit testing
    let arcPoints = arcSegment.GetPolyPoints(
      OptConstant.Common.MaxPolyPoints,
      false,
      false,
      false,
      null
    );

    // Check for horizontal line case (slope = 0)
    if (lineSlope === 0) {
      // Calculate distance from line to arc center on Y axis
      let distanceToArcCenter = lineSegment.StartPoint.y - arcCenter.y;
      let squaredDistance = distanceToArcCenter * distanceToArcCenter;
      let discriminant = radius * radius - squaredDistance;

      // No intersection if discriminant is negative
      if (discriminant < 0) return false;

      // Calculate the two possible X coordinates
      let xOffset = Utils2.sqrt(discriminant);

      // First possible intersection point
      let x1 = xOffset + arcCenter.x;
      intersectionPoint.x = x1;
      intersectionPoint.y = lineStartY;

      // Check if the point is on the arc segment
      if (Utils3.LineDStyleHit(
        arcPoints,
        intersectionPoint,
        arcSegment.StyleRecord.lineThickness,
        0,
        null
      ) || Utils2.pointInRect(arcSegment.Frame, intersectionPoint)) {
        return true;
      }

      // Second possible intersection point
      let x2 = -xOffset + arcCenter.x;
      intersectionPoint.x = x2;
      intersectionPoint.y = lineStartY;

      // Check if the point is on the arc segment
      return Utils3.LineDStyleHit(
        arcPoints,
        intersectionPoint,
        arcSegment.StyleRecord.lineThickness,
        0,
        null
      ) || Utils2.pointInRect(arcSegment.Frame, intersectionPoint);
    }
    // Check for vertical line case
    else if (isLineVertical) {
      // Calculate distance from line to arc center on X axis
      let distanceToArcCenter = lineSegment.StartPoint.x - arcCenter.x;
      let squaredDistance = distanceToArcCenter * distanceToArcCenter;
      let discriminant = radius * radius - squaredDistance;

      // No intersection if discriminant is negative
      if (discriminant < 0) return false;

      // Calculate the two possible Y coordinates
      let yOffset = Utils2.sqrt(discriminant);

      // First possible intersection point
      let y1 = yOffset + arcCenter.y;
      intersectionPoint.x = lineStartX;
      intersectionPoint.y = y1;

      // Check if the point is on the arc segment
      if (Utils3.LineDStyleHit(
        arcPoints,
        intersectionPoint,
        arcSegment.StyleRecord.lineThickness,
        0,
        null
      ) || Utils2.pointInRect(arcSegment.Frame, intersectionPoint)) {
        return true;
      }

      // Second possible intersection point
      let y2 = -yOffset + arcCenter.y;
      intersectionPoint.x = lineStartX;
      intersectionPoint.y = y2;

      // Check if the point is on the arc segment
      return Utils3.LineDStyleHit(
        arcPoints,
        intersectionPoint,
        arcSegment.StyleRecord.lineThickness,
        0,
        null
      ) || Utils2.pointInRect(arcSegment.Frame, intersectionPoint);
    }
    // General case: sloped line
    else {
      // Calculate coefficients for quadratic formula
      let a = lineSlope * lineSlope + 1;
      let yIntercept = lineStartY - lineSlope * lineStartX - arcCenter.y;
      let b = 2 * lineSlope * yIntercept - 2 * arcCenter.x;
      let c = arcCenter.x * arcCenter.x + yIntercept * yIntercept - radius * radius;

      // Calculate discriminant of quadratic equation
      let discriminant = b * b - 4 * a * c;

      // No intersection if discriminant is negative
      if (discriminant < 0) return false;

      // Calculate the square root of discriminant
      let sqrtDiscriminant = Utils2.sqrt(discriminant);

      // First possible intersection point
      let x1 = (-b + sqrtDiscriminant) / (2 * a);
      let y1 = lineStartY + lineSlope * (x1 - lineStartX);
      intersectionPoint.x = x1;
      intersectionPoint.y = y1;

      // Check if the point is on the arc segment
      if (Utils3.LineDStyleHit(
        arcPoints,
        intersectionPoint,
        arcSegment.StyleRecord.lineThickness,
        0,
        null
      ) || Utils2.pointInRect(arcSegment.Frame, intersectionPoint)) {
        return true;
      }

      // Second possible intersection point
      let x2 = (-b - sqrtDiscriminant) / (2 * a);
      let y2 = lineStartY + lineSlope * (x2 - lineStartX);
      intersectionPoint.x = x2;
      intersectionPoint.y = y2;

      // Check if the point is on the arc segment
      return Utils3.LineDStyleHit(
        arcPoints,
        intersectionPoint,
        arcSegment.StyleRecord.lineThickness,
        0,
        null
      ) || Utils2.pointInRect(arcSegment.Frame, intersectionPoint);
    }
  }

  /**
   * Maintains a consistent distance between lines or constrains point movement along a line
   * @param targetLine - The primary line to maintain distance for
   * @param referenceLine - The reference line (defaults to targetLine if null)
   * @param actionType - The action trigger type (LINESTART or LINEEND)
   * @param pointToAdjust - The point whose position will be adjusted
   */
  static LinesMaintainDist(targetLine, referenceLine, actionType, pointToAdjust) {
    let deltaX, deltaY, distance, maxDistance;
    let lineLength, normalizedDeltaY, normalizedDeltaX;
    let startPoint, endPoint, anchorPoint;
    let connectLine = { startpt: 0, endpt: 0 };
    let adjustedPoint = { x: 0, y: 0 };
    let arcCenterPoint = { x: 0, y: 0 };

    // Use the target line as reference if none provided
    if (referenceLine === null) {
      referenceLine = targetLine;
    }

    // Get line points either from connectLine or directly
    connectLine = referenceLine.GetConnectLine();
    if (connectLine) {
      startPoint = connectLine.startpt;
      endPoint = connectLine.endpt;
    } else {
      startPoint = referenceLine.StartPoint;
      endPoint = referenceLine.EndPoint;
    }

    // Calculate reference line vector
    deltaX = endPoint.x - startPoint.x;
    deltaY = endPoint.y - startPoint.y;

    Math.sqrt(deltaX * deltaX + deltaY * deltaY); // Unused calculation

    // Create a working copy of the point
    adjustedPoint.x = pointToAdjust.x;
    adjustedPoint.y = pointToAdjust.y;

    // Convert arc point to chord point for arc lines
    if (referenceLine.LineType === OptConstant.LineType.ARCLINE) {
      adjustedPoint = this.ArcToChord(startPoint, endPoint, adjustedPoint, connectLine, referenceLine);
    }

    // Calculate the vector from anchor point to adjustedPoint based on action type
    if (actionType === OptConstant.ActionTriggerType.LineStart) {
      deltaX = adjustedPoint.x - endPoint.x;
      deltaY = adjustedPoint.y - endPoint.y;
    } else {
      deltaX = adjustedPoint.x - startPoint.x;
      deltaY = adjustedPoint.y - startPoint.y;
    }

    // Calculate distance to maintain
    distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Get points for target line
    connectLine = targetLine.GetConnectLine();
    if (connectLine) {
      startPoint = connectLine.startpt;
      endPoint = connectLine.endpt;
    } else {
      startPoint = targetLine.StartPoint;
      endPoint = targetLine.EndPoint;
    }

    // Set anchor point and calculate vector based on action type
    if (actionType === OptConstant.ActionTriggerType.LineStart) {
      anchorPoint = endPoint;
      deltaX = -(endPoint.x - startPoint.x);
      deltaY = -(endPoint.y - startPoint.y);
    } else {
      anchorPoint = startPoint;
      deltaX = endPoint.x - startPoint.x;
      deltaY = endPoint.y - startPoint.y;
    }

    // Calculate maximum allowed distance
    maxDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Constrain distance to max line length
    if (distance > maxDistance) {
      distance = maxDistance;
    }

    // Handle degenerate case
    if (maxDistance < 1) {
      pointToAdjust.x = startPoint.x;
      pointToAdjust.y = startPoint.y;
    } else {
      // Normalize direction vector
      normalizedDeltaY = deltaY / maxDistance;
      normalizedDeltaX = deltaX / maxDistance;

      // Calculate new position
      pointToAdjust.x = anchorPoint.x + normalizedDeltaX * distance;
      pointToAdjust.y = anchorPoint.y + normalizedDeltaY * distance;
    }

    // Convert chord point back to arc point for arc lines
    if (targetLine.LineType === OptConstant.LineType.ARCLINE) {
      const arcInfo = targetLine.CalcRadiusAndCenter(
        targetLine.StartPoint.x,
        targetLine.StartPoint.y,
        targetLine.EndPoint.x,
        targetLine.EndPoint.y,
        targetLine.CurveAdjust,
        targetLine.IsReversed
      );

      const isFlipArc = false;
      const isReversed = connectLine ? false : targetLine.IsReversed;

      arcCenterPoint.x = arcInfo.centerX;
      arcCenterPoint.y = arcInfo.centerY;

      pointToAdjust = this.ChordToArc(
        startPoint,
        endPoint,
        arcCenterPoint,
        arcInfo.radius,
        isReversed,
        isFlipArc,
        arcInfo.centerInside,
        pointToAdjust
      );
    }
  }

  /**
   * Sets a point to the maximum allowable dimensions
   * @param point - The point to set to maximum dimensions
   * @returns Always returns true
   */
  static GetMaxDim(point) {
    point.x = OptConstant.Common.MaxLongDim;
    point.y = OptConstant.Common.MaxLongDim;
    return true;
  }

  /**
   * Generates curve points for line connections based on direction vectors
   * @param isRightSide - Whether to place curve on the right side
   * @param directionX - X direction vector (-1 for left, 1 for right)
   * @param directionY - Y direction vector (-1 for up, 1 for down)
   * @param originX - X coordinate of curve origin
   * @param originY - Y coordinate of curve origin
   * @param curveSize - Size/radius of the curve
   * @returns Array of points defining the curve
   */
  static LinesAddCurve(isRightSide, directionX, directionY, originX, originY, curveSize) {
    let index;
    let curvePoints = [];
    let tempPoints = [];
    let curveRect = { x: 0, y: 0, width: 0, height: 0 };

    if (isRightSide) {
      // Right side curves
      if (directionX > 0 && directionY > 0) {
        // Right-down direction
        curveRect.x = originX;
        curveRect.y = originY;
        curveRect.width = curveSize;
        curveRect.height = -2 * curveSize;

        Utils2.PolyYCurve(tempPoints, curveRect, 20, 0, 0, 0, -curveSize, true);

        // Reverse points order
        for (index = tempPoints.length - 1; index >= 0; index--) {
          curvePoints.push(tempPoints[index]);
        }
      } else if (directionX < 0 && directionY > 0) {
        // Left-down direction
        curveRect.x = originX;
        curveRect.y = originY + 2 * curveSize;
        curveRect.width = curveSize;
        curveRect.height = -2 * curveSize;

        Utils2.PolyYCurve(curvePoints, curveRect, 20, 0, 0, -curveSize, 0, true);
      } else if (directionX > 0 && directionY < 0) {
        // Right-up direction
        curveRect.x = originX;
        curveRect.y = originY - 2 * curveSize;
        curveRect.width = -curveSize;
        curveRect.height = 2 * curveSize;

        Utils2.PolyYCurve(curvePoints, curveRect, 20, 0, 0, curveSize, 0, true);
      } else if (directionX < 0 && directionY < 0) {
        // Left-up direction
        curveRect.x = originX;
        curveRect.y = originY + 2 * curveSize;
        curveRect.width = -curveSize;
        curveRect.height = -2 * curveSize;

        Utils2.PolyYCurve(curvePoints, curveRect, 20, 0, 0, -curveSize, 0, true);
      }
    } else {
      // Left side curves
      if (directionX > 0 && directionY > 0) {
        // Right-down direction
        curveRect.x = originX - curveSize;
        curveRect.y = originY;
        curveRect.width = curveSize;
        curveRect.height = 2 * curveSize;

        Utils2.PolyYCurve(curvePoints, curveRect, 20, 0, 0, 0, curveSize, false);
      } else if (directionX < 0 && directionY > 0) {
        // Left-down direction
        curveRect.x = originX;
        curveRect.y = originY;
        curveRect.width = curveSize;
        curveRect.height = 2 * curveSize;

        Utils2.PolyYCurve(curvePoints, curveRect, 20, 0, 0, 0, curveSize, true);
      } else if (directionX > 0 && directionY < 0) {
        // Right-up direction
        curveRect.x = originX - curveSize;
        curveRect.y = originY;
        curveRect.width = curveSize;
        curveRect.height = -2 * curveSize;

        Utils2.PolyYCurve(curvePoints, curveRect, 20, 0, 0, 0, -curveSize, false);
      } else if (directionX < 0 && directionY < 0) {
        // Left-up direction
        curveRect.x = originX;
        curveRect.y = originY - 2 * curveSize;
        curveRect.width = curveSize;
        curveRect.height = 2 * curveSize;

        Utils2.PolyYCurve(tempPoints, curveRect, 20, 0, 0, curveSize, 0, true);

        // Reverse points order
        for (index = tempPoints.length - 1; index >= 0; index--) {
          curvePoints.push(tempPoints[index]);
        }
      }
    }

    return curvePoints;
  }

  /**
   * Joins two polylines together or closes a polyline to form a polygon
   * This function connects two polylines at their endpoints, forming a single polyline,
   * or closes a single polyline to form a polygon.
   *
   * @param sourceBlockId - Block ID of the source polyline
   * @param sourceHookPoint - Connection point on the source polyline
   * @param targetBlockId - Block ID of the target polyline
   * @param targetHookPoint - Connection point on the target polyline
   * @param skipDimensionMaintenance - Whether to skip dimension maintenance during the operation
   * @returns The block ID of the resulting polyline/polygon, or a status code (-1 if failed, -2 for special cases)
   */
  static PolyLJoin(sourceBlockId, sourceHookPoint, targetBlockId, targetHookPoint, skipDimensionMaintenance) {
    let sourceIndex, targetIndex, segmentCount, offsetX, offsetY, lineType;
    let polyPointsCount, blockIndexInLayer;
    let resultBlockId, currentHookPoint;
    let arcQuadrantInfo, polySegmentIndex, distanceCheckRect;
    let dataId, noteId, commentId, hyperlinkText;

    let sourceObject = null;
    let targetObject = null;
    let mainPolyline = null;
    let secondaryPolyline = null;
    let blocksToDelete = [];
    let objectsToSelect = [];
    let wasSourceClosed = false;
    let needsRender = false;

    // Action trigger type for hook maintenance
    let hookTriggerType = OptConstant.ActionTriggerType.LineEnd;

    // Temporary points and objects
    let tempPoint = { x: 0, y: 0 };
    let tempPoint2 = { x: 0, y: 0 };

    // Constants
    const KNOB_SIZE = OptConstant.Common.KnobSize;

    // Get layer information
    let layerPosition = -1;
    let visibleLayers = LayerUtil.ActiveVisibleZList();

    // Get source object
    sourceObject = DataUtil.GetObjectPtr(sourceBlockId, true);
    if (sourceObject == null) return -1;

    // Get target object
    targetObject = DataUtil.GetObjectPtr(targetBlockId, true);
    if (targetObject == null) return -1;

    // Preserve metadata from objects (use the valid ones)
    dataId = sourceObject.DataID;
    if (targetObject.DataID >= 0) dataId = targetObject.DataID;

    noteId = sourceObject.NoteID;
    if (targetObject.NoteID >= 0) noteId = targetObject.NoteID;

    commentId = sourceObject.CommentID;
    if (targetObject.CommentID >= 0) commentId = targetObject.CommentID;

    hyperlinkText = sourceObject.HyperlinkText;
    if (targetObject.HyperlinkText) hyperlinkText = targetObject.HyperlinkText;

    // Convert wall connection points if needed
    if (targetHookPoint === OptConstant.HookPts.WTL || targetHookPoint === OptConstant.HookPts.WTR) {
      targetHookPoint = OptConstant.HookPts.KTL;
    }

    // Handle self-connection case (closing a polyline to form a polygon)
    if (sourceBlockId === targetBlockId && sourceObject.LineType === OptConstant.LineType.POLYLINE) {
      wasSourceClosed = sourceObject.polylist.closed;
      sourceObject.polylist.closed = true;
      segmentCount = sourceObject.polylist.segs.length;

      // Connect the last point to the first point
      sourceObject.polylist.segs[segmentCount - 1].pt.x = sourceObject.polylist.segs[0].pt.x;
      sourceObject.polylist.segs[segmentCount - 1].pt.y = sourceObject.polylist.segs[0].pt.y;
      sourceObject.EndPoint.x = sourceObject.StartPoint.x;
      sourceObject.EndPoint.y = sourceObject.StartPoint.y;

      // Open shape editor if not a wall
      if (sourceObject.objecttype !== NvConstant.FNObjectTypes.FlWall) {
        this.OpenShapeEdit(sourceBlockId);
      }

      // Handle dimension maintenance for PolyLineContainers
      let result = -1;
      if (sourceObject instanceof Instance.Shape.PolyLineContainer && !wasSourceClosed && skipDimensionMaintenance !== true) {
        sourceObject.MaintainDimensionThroughPolygonOpennessChange(sourceObject.polylist.closed);
        result = -2;
      }

      // Update frame and mark as dirty
      sourceObject.CalcFrame();
      DataUtil.AddToDirtyList(sourceObject.BlockID);
      OptCMUtil.SetLinkFlag(sourceBlockId, DSConstant.LinkFlags.Move);
      HookUtil.MaintainLink(sourceBlockId, sourceObject, null, hookTriggerType, false);
      return result;
    }

    // Determine which object is the polyline (if either)
    if (sourceObject.LineType === OptConstant.LineType.POLYLINE) {
      mainPolyline = sourceObject;
      secondaryPolyline = targetObject;
      blocksToDelete.push(targetBlockId);
      resultBlockId = sourceBlockId;
    } else if (targetObject.LineType === OptConstant.LineType.POLYLINE) {
      mainPolyline = targetObject;
      secondaryPolyline = sourceObject;
      // Swap hook points
      let tempHook = sourceHookPoint;
      sourceHookPoint = targetHookPoint;
      targetHookPoint = tempHook;
      blocksToDelete.push(sourceBlockId);
      resultBlockId = targetBlockId;
    }

    // If neither is a polyline, create a new one
    if (mainPolyline == null) {
      blocksToDelete.push(targetBlockId);
      blocksToDelete.push(sourceBlockId);

      // Remember layer position to restore it later
      layerPosition = Math.min(visibleLayers.indexOf(targetBlockId), visibleLayers.indexOf(sourceBlockId));

      // Create new polyline object
      let newPolylineData = {
        Frame: {
          x: sourceObject.Frame.x,
          y: sourceObject.Frame.x,
          width: sourceObject.Frame.width,
          height: sourceObject.Frame.height
        },
        inside: {
          x: sourceObject.inside.x,
          y: sourceObject.inside.x,
          width: sourceObject.inside.width,
          height: sourceObject.inside.height
        },
        StartPoint: {
          x: sourceObject.StartPoint.x,
          y: sourceObject.StartPoint.y
        },
        EndPoint: {
          x: sourceObject.EndPoint.x,
          y: sourceObject.EndPoint.y
        },
        flags: NvConstant.ObjFlags.Erase | NvConstant.ObjFlags.EraseOnGrow,
        extraflags: OptConstant.ExtraFlags.SideKnobs,
        StartArrowID: targetObject.StartArrowID,
        EndArrowID: targetObject.EndArrowID,
        StartArrowDisp: targetObject.StartArrowDisp,
        EndArrowDisp: targetObject.EndArrowDisp,
        ArrowSizeIndex: targetObject.ArrowSizeIndex,
        TextFlags: sourceObject.TextFlags,
        objecttype: sourceObject.objecttype,
        Dimensions: sourceObject.Dimensions,
        dataclass: PolygonConstant.ShapeTypes.POLYGON,
        polylist: new PolyList(),
      };

      // Set arrow properties (use non-zero values from either source)
      if (targetObject.StartArrowID === 0 && sourceObject.StartArrowID > 0) {
        newPolylineData.StartArrowID = sourceObject.StartArrowID;
        newPolylineData.StartArrowDisp = sourceObject.StartArrowDisp;
        newPolylineData.ArrowSizeIndex = sourceObject.ArrowSizeIndex;
      }

      if (targetObject.EndArrowID === 0 && sourceObject.EndArrowID > 0) {
        newPolylineData.EndArrowID = sourceObject.EndArrowID;
        newPolylineData.EndArrowDisp = sourceObject.EndArrowDisp;
        newPolylineData.ArrowSizeIndex = sourceObject.ArrowSizeIndex;
      }

      // Copy style from source object
      newPolylineData.StyleRecord = Utils1.DeepCopy(sourceObject.StyleRecord);

      // For walls, use transparent fill
      if (newPolylineData.objecttype === NvConstant.FNObjectTypes.FlWall) {
        newPolylineData.StyleRecord.Fill.Paint.FillType = NvConstant.FillTypes.Transparent;
      }

      // Clear hatch pattern
      newPolylineData.StyleRecord.Fill.Hatch = 0;

      // Get polyline points from source
      let polyPoints = sourceObject.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, null);
      let numPoints = polyPoints.length;

      // Create segments for the polyline
      for (let i = 0; i < numPoints; i++) {
        // Use appropriate line type
        let currentLineType = (i === 0 || sourceObject.LineType === OptConstant.LineType.SEGLINE)
          ? OptConstant.LineType.LINE
          : sourceObject.LineType;

        newPolylineData.polylist.segs.push(new PolySeg(
          currentLineType,
          polyPoints[i].x - sourceObject.StartPoint.x,
          polyPoints[i].y - sourceObject.StartPoint.y
        ));

        // Set parameters for arc lines
        if (currentLineType === OptConstant.LineType.ARCLINE) {
          newPolylineData.polylist.segs[newPolylineData.polylist.segs.length - 1].param =
            sourceObject.IsReversed ? sourceObject.CurveAdjust : -sourceObject.CurveAdjust;
        } else if (currentLineType === OptConstant.LineType.ARCSEGLINE) {
          // Calculate arc quadrant parameters
          let arcQuadrant = this.PolyLinePrPolyLGetArcQuadrant(polyPoints[i - 1], polyPoints[i], 0);

          newPolylineData.polylist.segs[newPolylineData.polylist.segs.length - 1].param = arcQuadrant.param;
          newPolylineData.polylist.segs[newPolylineData.polylist.segs.length - 1].ShortRef = arcQuadrant.ShortRef;
        }
      }

      // Create the new polyline object
      mainPolyline = T3Gv.wallOpt.AddNewPolyLine(sourceObject.objecttype, newPolylineData) || new Instance.Shape.PolyLine(newPolylineData);
      secondaryPolyline = targetObject;
      needsRender = true;
    }

    // Get connection points based on hook points
    let firstPoint, secondPoint;

    if (sourceHookPoint === OptConstant.HookPts.KTL) {
      firstPoint = {
        x: mainPolyline.StartPoint.x,
        y: mainPolyline.StartPoint.y
      };
    } else {
      firstPoint = {
        x: mainPolyline.EndPoint.x,
        y: mainPolyline.EndPoint.y
      };
    }

    if (targetHookPoint === OptConstant.HookPts.KTL) {
      secondPoint = {
        x: secondaryPolyline.StartPoint.x,
        y: secondaryPolyline.StartPoint.y
      };
    } else {
      secondPoint = {
        x: secondaryPolyline.EndPoint.x,
        y: secondaryPolyline.EndPoint.y
      };
    }

    // Calculate offset needed to align secondary polyline with main polyline
    offsetX = firstPoint.x - secondPoint.x;
    offsetY = firstPoint.y - secondPoint.y;

    // Apply offset to secondary polyline
    secondaryPolyline.StartPoint.x += offsetX;
    secondaryPolyline.StartPoint.y += offsetY;
    secondaryPolyline.EndPoint.x += offsetX;
    secondaryPolyline.EndPoint.y += offsetY;

    // Get polyline points
    let polyPoints = secondaryPolyline.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, null);
    polyPointsCount = polyPoints.length;
    let mainPolySegmentCount = mainPolyline.polylist.segs.length;

    // Check if the combined polyline would exceed maximum segment limit
    if (polyPointsCount + mainPolySegmentCount > OptConstant.Common.MaxPolySegs) {
      return -1;
    }

    // Handle connection at the start of the main polyline
    if (sourceHookPoint === OptConstant.HookPts.KTL) {
      // Update hook trigger type
      hookTriggerType = OptConstant.ActionTriggerType.LineStart;

      if (targetHookPoint === OptConstant.HookPts.KTL) {
        // We're connecting start to start, so reverse secondary polyline

        // Offset main polyline to match secondary polyline endpoint
        offsetX = mainPolyline.StartPoint.x - polyPoints[polyPointsCount - 1].x;
        offsetY = mainPolyline.StartPoint.y - polyPoints[polyPointsCount - 1].y;

        for (let i = 0; i < mainPolySegmentCount; i++) {
          mainPolyline.polylist.segs[i].pt.x += offsetX;
          mainPolyline.polylist.segs[i].pt.y += offsetY;
        }

        // Update start point
        mainPolyline.StartPoint.x = polyPoints[polyPointsCount - 1].x;
        mainPolyline.StartPoint.y = polyPoints[polyPointsCount - 1].y;

        // Add secondary polyline segments in reverse order
        for (let i = 1; i < polyPointsCount; i++) {
          switch (secondaryPolyline.LineType) {
            case OptConstant.LineType.POLYLINE:
              // Copy segment with correct properties
              tempPoint.x = mainPolyline.polylist.segs[0].pt.x;
              tempPoint.y = mainPolyline.polylist.segs[0].pt.y;
              mainPolyline.polylist.segs[0] = Utils1.DeepCopy(secondaryPolyline.polylist.segs[i]);
              mainPolyline.polylist.segs[0].pt.x = tempPoint.x;
              mainPolyline.polylist.segs[0].pt.y = tempPoint.y;
              mainPolyline.polylist.segs[0].param = -mainPolyline.polylist.segs[0].param;
              break;

            case OptConstant.LineType.ARCLINE:
              // Set arc line properties
              mainPolyline.polylist.segs[0].LineType = secondaryPolyline.LineType;
              mainPolyline.polylist.segs[0].param = secondaryPolyline.IsReversed ?
                -secondaryPolyline.CurveAdjust : secondaryPolyline.CurveAdjust;
              break;

            case OptConstant.LineType.ARCSEGLINE:
              // Set arc segment properties
              mainPolyline.polylist.segs[0].LineType = secondaryPolyline.LineType;
              mainPolyline.polylist.segs[0].param = 0;
              arcQuadrantInfo = mainPolyline.PrPolyLGetArcQuadrant(polyPoints[i], polyPoints[i - 1], 0);
              mainPolyline.polylist.segs[0].param = arcQuadrantInfo.param;
              mainPolyline.polylist.segs[0].ShortRef = arcQuadrantInfo.ShortRef;
              break;

            default:
              mainPolyline.polylist.segs[0].LineType = OptConstant.LineType.LINE;
          }

          // Insert new segment at beginning
          mainPolyline.polylist.segs.unshift(new PolySeg(
            OptConstant.LineType.LINE,
            polyPoints[i].x - mainPolyline.StartPoint.x,
            polyPoints[i].y - mainPolyline.StartPoint.y
          ));
        }
      } else {
        // We're connecting start to end

        // Offset main polyline to match secondary polyline start
        offsetX = mainPolyline.StartPoint.x - polyPoints[0].x;
        offsetY = mainPolyline.StartPoint.y - polyPoints[0].y;

        for (let i = 0; i < mainPolySegmentCount; i++) {
          mainPolyline.polylist.segs[i].pt.x += offsetX;
          mainPolyline.polylist.segs[i].pt.y += offsetY;
        }

        // Update start point
        mainPolyline.StartPoint.x = polyPoints[0].x;
        mainPolyline.StartPoint.y = polyPoints[0].y;

        // Set line type for first segment
        switch (secondaryPolyline.LineType) {
          case OptConstant.LineType.POLYLINE:
            // Copy segment with correct properties
            tempPoint.x = mainPolyline.polylist.segs[0].pt.x;
            tempPoint.y = mainPolyline.polylist.segs[0].pt.y;
            mainPolyline.polylist.segs[0] = Utils1.DeepCopy(secondaryPolyline.polylist.segs[polyPointsCount - 1]);
            mainPolyline.polylist.segs[0].pt.x = tempPoint.x;
            mainPolyline.polylist.segs[0].pt.y = tempPoint.y;
            break;

          case OptConstant.LineType.ARCLINE:
            // Set arc line properties
            mainPolyline.polylist.segs[0].LineType = secondaryPolyline.LineType;
            mainPolyline.polylist.segs[0].param = secondaryPolyline.IsReversed ?
              secondaryPolyline.CurveAdjust : -secondaryPolyline.CurveAdjust;
            break;

          case OptConstant.LineType.ARCSEGLINE:
            // Set arc segment properties
            mainPolyline.polylist.segs[0].LineType = secondaryPolyline.LineType;
            mainPolyline.polylist.segs[0].param = 0;
            arcQuadrantInfo = mainPolyline.PrPolyLGetArcQuadrant(polyPoints[polyPointsCount - 2], polyPoints[polyPointsCount - 1], 0);
            mainPolyline.polylist.segs[0].param = arcQuadrantInfo.param;
            mainPolyline.polylist.segs[0].ShortRef = arcQuadrantInfo.ShortRef;
            break;

          default:
            mainPolyline.polylist.segs[0].LineType = OptConstant.LineType.LINE;
        }

        // Add remaining secondary polyline segments in reverse order
        for (let i = polyPointsCount - 2; i >= 0; i--) {
          // Add the segment
          mainPolyline.polylist.segs.unshift(new PolySeg(
            OptConstant.LineType.LINE,
            polyPoints[i].x - mainPolyline.StartPoint.x,
            polyPoints[i].y - mainPolyline.StartPoint.y
          ));

          // Set line type for the segment (if not the first one)
          if (i > 0) {
            switch (secondaryPolyline.LineType) {
              case OptConstant.LineType.POLYLINE:
                // Copy segment properties
                tempPoint.x = mainPolyline.polylist.segs[0].pt.x;
                tempPoint.y = mainPolyline.polylist.segs[0].pt.y;
                mainPolyline.polylist.segs[0] = Utils1.DeepCopy(secondaryPolyline.polylist.segs[i]);
                mainPolyline.polylist.segs[0].pt.x = tempPoint.x;
                mainPolyline.polylist.segs[0].pt.y = tempPoint.y;
                break;

              case OptConstant.LineType.ARCSEGLINE:
                // Set arc segment properties
                mainPolyline.polylist.segs[0].LineType = secondaryPolyline.LineType;
                tempPoint2.x = polyPoints[i].x - mainPolyline.StartPoint.x;
                tempPoint2.y = polyPoints[i].y - mainPolyline.StartPoint.y;
                mainPolyline.polylist.segs[0].param = 0;
                arcQuadrantInfo = mainPolyline.PrPolyLGetArcQuadrant(polyPoints[i - 1], polyPoints[i], 0);
                mainPolyline.polylist.segs[0].param = arcQuadrantInfo.param;
                mainPolyline.polylist.segs[0].ShortRef = arcQuadrantInfo.ShortRef;
                break;
            }
          }
        }
      }

      // Check if the polyline should be closed
      distanceCheckRect = Utils2.InflatePoint(mainPolyline.polylist.segs[0].pt, KNOB_SIZE);

      if (!mainPolyline.polylist.closed &&
        Utils2.pointInRect(distanceCheckRect, mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1].pt)) {
        // Close the polyline
        mainPolyline.polylist.closed = true;
        mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1].pt.x = mainPolyline.polylist.segs[0].pt.x;
        mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1].pt.y = mainPolyline.polylist.segs[0].pt.y;
        mainPolyline.EndPoint.x = mainPolyline.StartPoint.x;
        mainPolyline.EndPoint.y = mainPolyline.StartPoint.y;

        // Handle dimension maintenance
        if (mainPolyline instanceof Instance.Shape.PolyLine && skipDimensionMaintenance !== true) {
          mainPolyline.MaintainDimensionThroughPolygonOpennessChange(mainPolyline.polylist.closed);
        }

        // Open shape editor if needed
        if (mainPolyline.objecttype !== NvConstant.FNObjectTypes.FlWall) {
          this.OpenShapeEdit(mainPolyline.BlockID);
        }

        // Mark as dirty
        DataUtil.AddToDirtyList(mainPolyline.BlockID);
      }
    } else {
      // Handle connection at the end of the main polyline

      if (targetHookPoint === OptConstant.HookPts.KTL) {
        // Connect end to start

        // Add secondary polyline segments
        for (let i = 1; i < polyPointsCount; i++) {
          // Determine line type
          switch (secondaryPolyline.LineType) {
            case OptConstant.LineType.POLYLINE:
              lineType = secondaryPolyline.polylist.segs[i].LineType;
              break;
            case OptConstant.LineType.ARCLINE:
            case OptConstant.LineType.ARCSEGLINE:
              lineType = secondaryPolyline.LineType;
              break;
            default:
              lineType = OptConstant.LineType.LINE;
          }

          // Add the segment
          mainPolyline.polylist.segs.push(new PolySeg(
            lineType,
            polyPoints[i].x - mainPolyline.StartPoint.x,
            polyPoints[i].y - mainPolyline.StartPoint.y
          ));

          // Set properties based on line type
          switch (secondaryPolyline.LineType) {
            case OptConstant.LineType.ARCLINE:
              // Set arc properties
              mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1].param =
                secondaryPolyline.IsReversed ?
                  secondaryPolyline.CurveAdjust : -secondaryPolyline.CurveAdjust;
              break;

            case OptConstant.LineType.POLYLINE:
              // Copy polyline segment
              mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1] =
                Utils1.DeepCopy(secondaryPolyline.polylist.segs[i]);
              mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1].pt.x =
                polyPoints[i].x - mainPolyline.StartPoint.x;
              mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1].pt.y =
                polyPoints[i].y - mainPolyline.StartPoint.y;
              break;

            case OptConstant.LineType.ARCSEGLINE:
              // Set arc segment properties
              tempPoint2.x = polyPoints[i].x - mainPolyline.StartPoint.x;
              tempPoint2.y = polyPoints[i].y - mainPolyline.StartPoint.y;
              polySegmentIndex = mainPolyline.polylist.segs.length;
              mainPolyline.polylist.segs[polySegmentIndex - 1].param = 0;
              arcQuadrantInfo = mainPolyline.PrPolyLGetArcQuadrant(polyPoints[i - 1], polyPoints[i], 0);
              mainPolyline.polylist.segs[polySegmentIndex - 1].param = arcQuadrantInfo.param;
              mainPolyline.polylist.segs[polySegmentIndex - 1].ShortRef = arcQuadrantInfo.ShortRef;
              break;
          }
        }

        // Update end point
        mainPolyline.EndPoint.x = polyPoints[polyPointsCount - 1].x;
        mainPolyline.EndPoint.y = polyPoints[polyPointsCount - 1].y;

      } else {
        // Connect end to end, so reverse secondary polyline

        // Add secondary polyline segments in reverse order
        for (let i = polyPointsCount - 2; i >= 0; i--) {
          // Determine line type
          switch (secondaryPolyline.LineType) {
            case OptConstant.LineType.POLYLINE:
              lineType = secondaryPolyline.polylist.segs[i + 1].LineType;
              break;
            case OptConstant.LineType.ARCLINE:
            case OptConstant.LineType.ARCSEGLINE:
              lineType = secondaryPolyline.LineType;
              break;
            default:
              lineType = OptConstant.LineType.LINE;
          }

          // Add the segment
          mainPolyline.polylist.segs.push(new PolySeg(
            lineType,
            polyPoints[i].x - mainPolyline.StartPoint.x,
            polyPoints[i].y - mainPolyline.StartPoint.y
          ));

          // Set properties based on line type
          switch (secondaryPolyline.LineType) {
            case OptConstant.LineType.ARCLINE:
              // Set arc properties with reversed direction
              mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1].param =
                secondaryPolyline.IsReversed ?
                  -secondaryPolyline.CurveAdjust : secondaryPolyline.CurveAdjust;
              break;

            case OptConstant.LineType.POLYLINE:
              // Copy polyline segment with reversed direction
              mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1] =
                Utils1.DeepCopy(secondaryPolyline.polylist.segs[i + 1]);
              mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1].pt.x =
                polyPoints[i].x - mainPolyline.StartPoint.x;
              mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1].pt.y =
                polyPoints[i].y - mainPolyline.StartPoint.y;
              mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1].param =
                -mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1].param;
              break;

            case OptConstant.LineType.ARCSEGLINE:
              // Set arc segment properties
              polySegmentIndex = mainPolyline.polylist.segs.length;
              mainPolyline.polylist.segs[polySegmentIndex - 1].param = 0;
              arcQuadrantInfo = mainPolyline.PrPolyLGetArcQuadrant(polyPoints[i + 1], polyPoints[i], 0);
              mainPolyline.polylist.segs[polySegmentIndex - 1].param = arcQuadrantInfo.param;
              mainPolyline.polylist.segs[polySegmentIndex - 1].ShortRef = arcQuadrantInfo.ShortRef;
              break;
          }
        }

        // Update end point
        mainPolyline.EndPoint.x = polyPoints[0].x;
        mainPolyline.EndPoint.y = polyPoints[0].y;
      }

      // Check if the polyline should be closed
      distanceCheckRect = Utils2.InflatePoint(
        mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1].pt,
        KNOB_SIZE
      );

      if (Utils2.pointInRect(distanceCheckRect, mainPolyline.polylist.segs[0].pt)) {
        // Close the polyline
        mainPolyline.polylist.closed = true;
        mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1].pt.x = mainPolyline.polylist.segs[0].pt.x;
        mainPolyline.polylist.segs[mainPolyline.polylist.segs.length - 1].pt.y = mainPolyline.polylist.segs[0].pt.y;
        mainPolyline.EndPoint.x = mainPolyline.StartPoint.x;
        mainPolyline.EndPoint.y = mainPolyline.StartPoint.y;

        // Open shape editor if needed
        if (mainPolyline.objecttype !== NvConstant.FNObjectTypes.FlWall) {
          this.OpenShapeEdit(mainPolyline.BlockID);
        }

        // Handle dimension maintenance
        if (mainPolyline instanceof Instance.Shape.PolyLine && skipDimensionMaintenance !== true) {
          mainPolyline.MaintainDimensionThroughPolygonOpennessChange(mainPolyline.polylist.closed);
        }

        // Mark as dirty
        DataUtil.AddToDirtyList(mainPolyline.BlockID);
      }
    }

    // Update frame calculations
    mainPolyline.CalcFrame();

    // Add new object if we created a new polyline
    if (needsRender) {
      resultBlockId = DrawUtil.AddNewObject(mainPolyline, false, true);
      // Uncomment if needed:
      // Collab.AddNewBlockToSecondary(resultBlockId);
      // Collab.ClearCreateList();
      // Collab.AddToCreateList(resultBlockId);
      needsRender = true;
      DataUtil.AddToDirtyList(resultBlockId);
    } else {
      // Get current layer position
      let currentLayerIndex = LayerUtil.VisibleZList().indexOf(resultBlockId);
      if (currentLayerIndex >= 0) {
        SvgUtil.AddSVGObject(currentLayerIndex, resultBlockId, true, true);
      }
    }

    // Transfer metadata to the resulting polyline
    mainPolyline = DataUtil.GetObjectPtr(resultBlockId, false);
    if (mainPolyline) {
      // Transfer DataID
      if (mainPolyline.DataID < 0) {
        mainPolyline.DataID = dataId;

        if (sourceObject.DataID === dataId) {
          mainPolyline.TextDirection = sourceObject.TextDirection;
          sourceObject.DataID = -1;
        } else if (targetObject.DataID === dataId) {
          mainPolyline.TextDirection = targetObject.TextDirection;
          targetObject.DataID = -1;
        }

        mainPolyline.TextFlags = Utils2.SetFlag(
          mainPolyline.TextFlags,
          NvConstant.TextFlags.HorizText,
          !mainPolyline.TextDirection
        );
      }

      // Transfer NoteID
      if (mainPolyline && mainPolyline.NoteID < 0) {
        mainPolyline.NoteID = noteId;

        if (sourceObject.NoteID === noteId) {
          sourceObject.NoteID = -1;
        } else if (targetObject.NoteID === noteId) {
          targetObject.NoteID = -1;
        }

        mainPolyline.TextFlags = Utils2.SetFlag(
          mainPolyline.TextFlags,
          NvConstant.TextFlags.HorizText,
          !mainPolyline.TextDirection
        );
      }

      // Transfer CommentID
      if (mainPolyline && mainPolyline.CommentID < 0) {
        mainPolyline.CommentID = commentId;

        if (sourceObject.CommentID === commentId) {
          sourceObject.CommentID = -1;
        } else if (targetObject.CommentID === commentId) {
          targetObject.CommentID = -1;
        }

        mainPolyline.TextFlags = Utils2.SetFlag(
          mainPolyline.TextFlags,
          NvConstant.TextFlags.HorizText,
          !mainPolyline.TextDirection
        );
      }

      // Transfer hyperlink text
      if (mainPolyline && !mainPolyline.HyperlinkText) {
        mainPolyline.HyperlinkText = hyperlinkText;
      }
    }

    // Transfer links from deleted objects to the resulting polyline
    for (let i = 0; i < blocksToDelete.length; i++) {
      HookUtil.MoveLinks(resultBlockId, blocksToDelete[i], null, null);
    }

    // Delete the original objects
    DataUtil.DeleteObjects(blocksToDelete, false);

    // Update links
    OptCMUtil.SetLinkFlag(resultBlockId, DSConstant.LinkFlags.Move);
    HookUtil.MaintainLink(resultBlockId, mainPolyline, null, hookTriggerType, false);
    T3Gv.opt.UpdateLinks();

    // Select the resulting polyline
    objectsToSelect.push(resultBlockId);
    SelectUtil.SelectObjects(objectsToSelect, false, true);

    // Restore layer position if needed
    if (needsRender && layerPosition >= 0) {
      let currentLayerIndex = visibleLayers.indexOf(resultBlockId);
      visibleLayers.splice(currentLayerIndex, 1);
      visibleLayers.splice(layerPosition, 0, resultBlockId);
      needsRender = true;
      DataUtil.AddToDirtyList(resultBlockId);
    }

    // Handle special cases for PolyLineContainer
    if (mainPolyline instanceof Instance.Shape.PolyLineContainer &&
      mainPolyline.MoveBehindAllLinked()) {
      needsRender = true;
    }

    // Render objects if needed
    if (needsRender) {
      if (LayerUtil.IsTopMostVisibleLayer()) {
        SvgUtil.RenderDirtySVGObjects();
      } else {
        SvgUtil.RenderAllSVGObjects();
      }
    }

    return resultBlockId;
  }

  /**
 * Determines the arc quadrant based on two points and an angle
 * @param startPoint - The starting point of the arc
 * @param endPoint - The ending point of the arc
 * @param arcAngle - The angle of the arc in radians
 * @returns Object containing quadrant parameters and reference
 */
  static PolyLinePrPolyLGetArcQuadrant(startPoint, endPoint, arcAngle) {
    T3Util.Log("O.Opt PolyLinePrPolyLGetArcQuadrant - Input:", {
      startPoint,
      endPoint,
      arcAngle
    });

    const result = {
      param: 0,
      ShortRef: 0
    };

    let points = [];
    let rotationCenter = { x: 0, y: 0 };

    // Add the points to the array
    points.push(new Point(startPoint.x, startPoint.y));
    points.push(new Point(endPoint.x, endPoint.y));

    // Set the rotation center to the start point
    rotationCenter.x = startPoint.x;
    rotationCenter.y = startPoint.y;

    // Apply rotation if the angle is significant
    if (Math.abs(arcAngle) >= 0.01) {
      const sinValue = Math.sin(arcAngle);
      const cosValue = Math.cos(arcAngle);
      const arcSin = Math.asin(sinValue);

      // Adjust the arc sine based on cosine sign
      const adjustedArcSin = cosValue < 0 ? -arcSin : arcSin;

      // Rotate the points around the center
      Utils3.RotatePointsAboutPoint(rotationCenter, adjustedArcSin, points);
    }

    const origin = points[0];
    const target = points[1];

    // Determine quadrant based on relative positions
    if (target.x > origin.x) {
      if (target.y > origin.y) {
        // Bottom-left quadrant
        result.param = -NvConstant.Geometry.PI / 2;
        result.ShortRef = OptConstant.ArcQuad.PLA_BL;

        if (endPoint.notclockwise) {
          result.param = 0;
        }
      } else {
        // Top-left quadrant
        result.ShortRef = OptConstant.ArcQuad.PLA_TL;

        if (endPoint.notclockwise) {
          result.ShortRef = OptConstant.ArcQuad.PLA_TR;
          result.param = NvConstant.Geometry.PI / 2;
        }
      }
    } else {
      if (target.y > origin.y) {
        // Bottom-right quadrant
        result.ShortRef = OptConstant.ArcQuad.PLA_BR;

        if (endPoint.notclockwise) {
          result.ShortRef = OptConstant.ArcQuad.PLA_BL;
          result.param = NvConstant.Geometry.PI / 2;
        }
      } else {
        // Top-right quadrant
        result.param = -NvConstant.Geometry.PI / 2;
        result.ShortRef = OptConstant.ArcQuad.PLA_TR;

        if (endPoint.notclockwise) {
          result.param = 0;
        }
      }
    }

    T3Util.Log("O.Opt PolyLinePrPolyLGetArcQuadrant - Output:", result);
    return result;
  }

  /**
     * Calculates points along a Y-curve (vertical semi-ellipse)
     *
     * @param points - Array to store calculated points
     * @param rect - The bounding rectangle for the curve
     * @param segmentCount - Number of segments in the curve
     * @param minOffset - Minimum offset from the top of the rectangle
     * @param maxOffset - Maximum offset from the bottom of the rectangle
     * @param startOffset - Offset for the first point
     * @param endOffset - Offset for the last point
     * @param isRightSide - Whether to place points on the right side of the rectangle
     * @returns The input points array with new points added
     */
  static PolyYCurve(points, rect, segmentCount, minOffset, maxOffset, startOffset, endOffset, isRightSide) {
    T3Util.Log("O.Opt PolyYCurve - Input:", {
      pointCount: points.length,
      rect,
      segmentCount,
      minOffset,
      maxOffset,
      startOffset,
      endOffset,
      isRightSide
    });

    // Calculate vertical center and width
    const verticalHalf = rect.height / 2;
    let rectWidth = rect.width;

    // Ensure minimum segment count
    if (segmentCount < 2) {
      segmentCount = 2;
    }

    // Calculate vertical spacing between points
    const verticalSpacing = (2 * verticalHalf - startOffset - endOffset) / (segmentCount - 1);

    // Track if we've already processed special case points
    let minLimitProcessed = false;
    let maxLimitProcessed = false;

    // Create points along the curve
    for (let i = 0; i < segmentCount; i++) {
      // Calculate raw vertical offset from top
      let verticalOffset = verticalSpacing * i + startOffset;

      // Apply minimum offset constraint
      if (minOffset && verticalOffset < minOffset) {
        if (minLimitProcessed) {
          continue; // Skip duplicate minimum points
        }
        verticalOffset = minOffset;
        minLimitProcessed = true;
      }

      // Calculate distance from horizontal center
      let distanceFromCenter = verticalHalf - verticalOffset;

      // Apply maximum offset constraint
      if (maxOffset && distanceFromCenter - maxOffset < -verticalHalf) {
        if (maxLimitProcessed) {
          break; // Stop if we're past the maximum
        }
        distanceFromCenter = -(verticalHalf - maxOffset);
        maxLimitProcessed = true;
      }

      // Create new point
      const point = new Point(0, 0);

      // Calculate Y position
      point.y = rect.y + (verticalHalf - distanceFromCenter);

      // Calculate ratio for X position
      let ratio = 0;
      if (verticalHalf) {
        ratio = distanceFromCenter / verticalHalf;
      } else {
        rectWidth = 0;
      }

      // Calculate X using ellipse formula and place on correct side
      const horizontalOffset = Utils2.sqrt(1 - ratio * ratio) * rectWidth;
      point.x = isRightSide ? rect.x + rect.width - horizontalOffset : rect.x + horizontalOffset;

      // Add point to result array
      points.push(point);
    }

    T3Util.Log("O.Opt PolyYCurve - Output: Generated points:", points.length);
    return points;
  }

  /**
   * Determines if a point is inside a polygon using ray-casting algorithm
   * @param polygonPoints - Array of points defining the polygon
   * @param testPoint - The point to test for containment
   * @returns True if the point is inside the polygon, false otherwise
   */
  static PolyPtInPolygon(polygonPoints, testPoint) {
    T3Util.Log("O.Opt PolyPtInPolygon - Input:", { polygonPointsCount: polygonPoints.length, testPoint });

    // Initialize triangle points
    const trianglePoints = [
      {}, {}, {}
    ];

    // Counter for number of intersections
    let intersectionCount = 0;

    trianglePoints[0] = polygonPoints[0];
    const pointCount = polygonPoints.length;

    // Check each possible triangle formed by consecutive points
    for (let i = 1; i < pointCount - 1; i++) {
      // Flag to track if point is within current triangle
      let isPointInTriangle = true;

      trianglePoints[1] = polygonPoints[i];
      trianglePoints[2] = polygonPoints[i + 1];

      // Check if test point is within the triangle angles
      for (let j = 0; j < 3; j++) {
        // Get angle from triangle point to test point
        const angleToTestPoint = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(
          trianglePoints[j],
          testPoint
        );

        // Get indices for adjacent points (wrapping around)
        const prevIndex = j - 1 >= 0 ? j - 1 : 2;
        const nextIndex = j + 1 < 3 ? j + 1 : 0;

        // Calculate angles to adjacent points
        const angleToPrevPoint = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(
          trianglePoints[j],
          trianglePoints[prevIndex]
        );

        const angleToNextPoint = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(
          trianglePoints[j],
          trianglePoints[nextIndex]
        );

        // Get the larger of the two angles
        const largerAngle = angleToPrevPoint > angleToNextPoint ?
          angleToPrevPoint : angleToNextPoint;

        // Calculate complementary angle
        const complementaryAngle = NvConstant.Geometry.PI - largerAngle;

        // Normalize all angles to the same range
        const normalizedPrevAngle = T3Gv.opt.NormalizeAngle(angleToPrevPoint, complementaryAngle);
        const normalizedNextAngle = T3Gv.opt.NormalizeAngle(angleToNextPoint, complementaryAngle);

        // Ensure proper ordering of angles
        let smallerAngle = normalizedPrevAngle;
        let greaterAngle = normalizedNextAngle;

        if (normalizedPrevAngle > normalizedNextAngle) {
          smallerAngle = normalizedNextAngle;
          greaterAngle = normalizedPrevAngle;
        }

        // Normalize test point angle
        const normalizedTestPointAngle = T3Gv.opt.NormalizeAngle(angleToTestPoint, complementaryAngle);

        // Check if test point angle is outside the range
        if (normalizedTestPointAngle < smallerAngle || normalizedTestPointAngle > greaterAngle) {
          isPointInTriangle = false;
          break;
        }
      }

      // If point is in triangle, increment intersection counter
      if (isPointInTriangle) {
        intersectionCount++;
      }
    }

    // Point is inside if number of intersections is odd
    const isInside = (intersectionCount % 2) !== 0;
    T3Util.Log("O.Opt PolyPtInPolygon - Output:", isInside);
    return isInside;
  }

  /**
   * Finds the intersection point between a line segment and a polyline
   * This function calculates where a given line segment intersects with a polyline,
   * handling various cases including horizontal lines, vertical lines, and general cases.
   *
   * @param lineStart - Starting point of the line segment
   * @param lineEnd - Ending point of the line segment
   * @param polylinePoints - Array of points defining the polyline
   * @param pointCount - Number of points in the polyline
   * @returns Object containing success flag, intersection point, and segment index
   */
  static PolyLIntersect(lineStart, lineEnd, polylinePoints, pointCount) {
    // Loop counter
    let i;

    // Bounds for coordinate ranges
    let minX, maxX;
    let minY, maxY;

    // Line and segment calculation variables
    let deltaX;
    let lineSlope;
    let yIntercept;
    let segmentSlope;
    let slopeDifference;
    let interceptDifference;
    let intersectionX;

    // Intersection data
    let boundingBox = null;
    let horizontalIntersectionIndex = -1;
    let verticalIntersectionIndex = -1;

    // Points for calculations
    let tempIntersection = {
      x: 0,
      y: 0
    };

    let resultIntersection = {
      x: 0,
      y: 0
    };

    let intersectedSegment = 0;

    // Check for horizontal line case
    let horizontalDifference = Math.abs(lineEnd.x - lineStart.x);
    if (Math.abs(lineEnd.y - lineStart.y) < 1 && horizontalDifference >= 1) {
      // Search for segments that intersect the horizontal line
      for (i = 1; i < pointCount; i++) {
        if (polylinePoints[i].y > polylinePoints[i - 1].y) {
          minY = polylinePoints[i - 1].y;
          maxY = polylinePoints[i].y;
        } else {
          minY = polylinePoints[i].y;
          maxY = polylinePoints[i - 1].y;
        }

        // If horizontal line intersects this segment's Y range
        if (lineEnd.y >= minY && lineEnd.y < maxY) {
          horizontalIntersectionIndex = i;
          resultIntersection.y = lineEnd.y;
          break;
        }
      }

      if (horizontalIntersectionIndex >= 0) {
        intersectedSegment = horizontalIntersectionIndex;

        // Handle vertical segment
        if (polylinePoints[horizontalIntersectionIndex].x - polylinePoints[horizontalIntersectionIndex - 1].x == 0) {
          resultIntersection.x = polylinePoints[horizontalIntersectionIndex].x;
          return {
            bSuccess: true,
            ipt: resultIntersection,
            lpseg: intersectedSegment
          };
        }
        // Handle horizontal segment
        else if (polylinePoints[horizontalIntersectionIndex].y - polylinePoints[horizontalIntersectionIndex - 1].y == 0) {
          if (polylinePoints[horizontalIntersectionIndex].x > polylinePoints[horizontalIntersectionIndex - 1].x) {
            minX = polylinePoints[horizontalIntersectionIndex - 1].x;
            maxX = polylinePoints[horizontalIntersectionIndex].x;
          } else {
            minX = polylinePoints[horizontalIntersectionIndex].x;
            maxX = polylinePoints[horizontalIntersectionIndex - 1].x;
          }

          // Clamp X coordinate to segment bounds
          if (resultIntersection.x < minX) resultIntersection.x = minX;
          if (resultIntersection.x > maxX) resultIntersection.x = maxX;

          return {
            bSuccess: true,
            ipt: resultIntersection,
            lpseg: intersectedSegment
          };
        }
        // Handle sloped segment
        else {
          deltaX = polylinePoints[horizontalIntersectionIndex].x - polylinePoints[horizontalIntersectionIndex - 1].x;
          segmentSlope = (polylinePoints[horizontalIntersectionIndex].y - polylinePoints[horizontalIntersectionIndex - 1].y) / deltaX;
          yIntercept = polylinePoints[horizontalIntersectionIndex].y - segmentSlope * polylinePoints[horizontalIntersectionIndex].x;
          resultIntersection.x = (resultIntersection.y - yIntercept) / segmentSlope;

          return {
            bSuccess: true,
            ipt: resultIntersection,
            lpseg: intersectedSegment
          };
        }
      }
    }
    // Check for vertical line case
    else if (horizontalDifference < 1) {
      // Search for segments that intersect the vertical line
      for (i = 1; i < pointCount; i++) {
        if (polylinePoints[i].x > polylinePoints[i - 1].x) {
          minX = polylinePoints[i - 1].x;
          maxX = polylinePoints[i].x;
        } else {
          minX = polylinePoints[i].x;
          maxX = polylinePoints[i - 1].x;
        }

        // If vertical line intersects this segment's X range
        if (lineEnd.x >= minX && lineEnd.x < maxX) {
          verticalIntersectionIndex = i;
          resultIntersection.x = lineEnd.x;
          break;
        }
      }

      if (verticalIntersectionIndex >= 0) {
        intersectedSegment = verticalIntersectionIndex;

        // Handle horizontal segment
        if (polylinePoints[verticalIntersectionIndex].y - polylinePoints[verticalIntersectionIndex - 1].y == 0) {
          resultIntersection.y = polylinePoints[verticalIntersectionIndex].y;
          return {
            bSuccess: true,
            ipt: resultIntersection,
            lpseg: intersectedSegment
          };
        }
        // Handle vertical segment
        else if (polylinePoints[verticalIntersectionIndex].x - polylinePoints[verticalIntersectionIndex - 1].x == 0) {
          if (polylinePoints[verticalIntersectionIndex].y > polylinePoints[verticalIntersectionIndex - 1].y) {
            minY = polylinePoints[verticalIntersectionIndex - 1].y;
            maxY = polylinePoints[verticalIntersectionIndex].y;
          } else {
            minY = polylinePoints[verticalIntersectionIndex].y;
            maxY = polylinePoints[verticalIntersectionIndex - 1].y;
          }

          // Clamp Y coordinate to segment bounds
          if (resultIntersection.y < minY) resultIntersection.y = minY;
          if (resultIntersection.y > maxY) resultIntersection.y = maxY;

          return {
            bSuccess: true,
            ipt: resultIntersection,
            lpseg: intersectedSegment
          };
        }
        // Handle sloped segment
        else {
          deltaX = polylinePoints[verticalIntersectionIndex].x - polylinePoints[verticalIntersectionIndex - 1].x;
          segmentSlope = (polylinePoints[verticalIntersectionIndex].y - polylinePoints[verticalIntersectionIndex - 1].y) / deltaX;
          yIntercept = polylinePoints[verticalIntersectionIndex].y - segmentSlope * polylinePoints[verticalIntersectionIndex].x;
          resultIntersection.y = segmentSlope * resultIntersection.x + yIntercept;

          return {
            bSuccess: true,
            ipt: resultIntersection,
            lpseg: intersectedSegment
          };
        }
      }
    }
    // General case - sloped line
    else {
      // Calculate line equation: y = mx + b
      deltaX = lineEnd.x - lineStart.x;
      lineSlope = (lineEnd.y - lineStart.y) / deltaX;
      yIntercept = lineEnd.y - lineSlope * lineEnd.x;

      // Check intersection with each polyline segment
      for (i = 1; i < pointCount; i++) {
        // Handle vertical segment
        if (polylinePoints[i].x - polylinePoints[i - 1].x == 0) {
          tempIntersection.x = polylinePoints[i].x;
          tempIntersection.y = lineSlope * tempIntersection.x + yIntercept;
        }
        // Handle horizontal segment
        else if (polylinePoints[i].y - polylinePoints[i - 1].y == 0) {
          tempIntersection.y = polylinePoints[i].y;
          tempIntersection.x = (tempIntersection.y - yIntercept) / lineSlope;
        }
        // Handle sloped segment
        else {
          deltaX = polylinePoints[i].x - polylinePoints[i - 1].x;
          segmentSlope = (polylinePoints[i].y - polylinePoints[i - 1].y) / deltaX;
          yIntercept = polylinePoints[i].y - segmentSlope * polylinePoints[i].x;

          // Calculate intersection of two lines
          slopeDifference = lineSlope - segmentSlope;
          interceptDifference = yIntercept - yIntercept;

          // Skip parallel lines (avoid division by near-zero)
          if (Math.abs(slopeDifference) < 0.001) {
            continue;
          }

          intersectionX = interceptDifference / slopeDifference;
          tempIntersection.x = intersectionX;
          tempIntersection.y = lineSlope * intersectionX + yIntercept;
        }

        // Create bounding box for segment
        boundingBox = Utils2.Pt2Rect(polylinePoints[i], polylinePoints[i - 1]);

        // Fix zero dimensions in bounding box
        if (boundingBox.y + boundingBox.height == boundingBox.y) boundingBox.height++;
        if (boundingBox.x + boundingBox.width == boundingBox.x) boundingBox.width++;

        // Check if intersection is within segment bounds
        if (Utils2.pointInRect(boundingBox, tempIntersection)) {
          return {
            bSuccess: true,
            ipt: tempIntersection,
            lpseg: i
          };
        }
      }
    }

    // No intersection found
    return {
      bSuccess: false,
      ipt: resultIntersection,
      lpseg: intersectedSegment
    };
  }
}

export default PolyUtil
