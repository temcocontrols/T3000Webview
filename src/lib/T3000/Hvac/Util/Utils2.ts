
import $ from 'jquery'
import Point from '../Model/Point'
import Style from '../Basic/B.Element.Style';
import T3Gv from '../Data/T3Gv';

class Utils2 {

  /**
   * Checks if the specified bitwise flag is set in the value
   * @param value - The numeric value to check
   * @param flag - The flag to check for
   * @returns True if the flag is set in the value, false otherwise
   */
  static HasFlag(value: number, flag: number): boolean {
    return typeof value === 'number' &&
      typeof flag === 'number' &&
      (value & flag) === flag;
  }

  /**
   * Adds a bitwise flag to a value
   * @param value - The original numeric value
   * @param flag - The flag to add
   * @returns The value with the flag added
   */
  static AddFlag(value: number, flag: number): number {
    return typeof value !== 'number' ||
      typeof flag !== 'number' ? value : value | flag;
  }

  /**
   * Removes a bitwise flag from a value
   * @param value - The original numeric value
   * @param flag - The flag to remove
   * @returns The value with the flag removed
   */
  static RemoveFlag(value: number, flag: number): number {
    return typeof value !== 'number' ||
      typeof flag !== 'number' ? value : value & ~flag;
  }

  /**
   * Sets or unsets a flag in a value based on a condition
   * @param value - The original numeric value
   * @param flag - The flag to set or unset
   * @param shouldSet - Whether to set or unset the flag
   * @returns The value with the flag updated
   */
  static SetFlag(value: number, flag: number, shouldSet: boolean): number {
    let result = value;
    if (shouldSet) {
      result |= flag;
    } else if (value & flag) {
      result &= ~flag;
    }
    return result;
  }

  /**
   * Copies the properties of a rectangle to another rectangle
   * @param targetRect - The rectangle to copy to
   * @param sourceRect - The rectangle to copy from
   */
  static CopyRect(targetRect: any, sourceRect: any): void {
    targetRect.x = sourceRect.x;
    targetRect.y = sourceRect.y;
    targetRect.width = sourceRect.width;
    targetRect.height = sourceRect.height;
  }

  /**
   * Checks if a point is inside a rectangle
   * @param rect - The rectangle with x, y, width, and height properties
   * @param point - The point with x and y coordinates
   * @returns True if the point is inside the rectangle, false otherwise
   */
  static pointInRect(
    rect: { x: number; y: number; width: number; height: number },
    point: { x: number; y: number }
  ): boolean {
    console.log("= S.BaseDrawingObject - Input rect:", rect, "point:", point);
    const isInside =
      point.x >= rect.x &&
      point.x < rect.x + rect.width &&
      point.y >= rect.y &&
      point.y < rect.y + rect.height;
    console.log("= S.BaseDrawingObject - Output:", isInside);
    return isInside;
  }

  /**
   * Checks if two points are equal within a tolerance
   * @param point1 - The first point with x and y coordinates
   * @param point2 - The second point with x and y coordinates
   * @returns True if the points are equal within tolerance, false otherwise
   */
  static EqualPt(point1: any, point2: any): boolean {
    return this.IsEqual(point1.x, point2.x) && this.IsEqual(point1.y, point2.y);
  }

  /**
   * Trims a number to a specified number of decimal places
   * @param value - The number to trim
   * @param decimalPlaces - The number of decimal places to keep
   * @returns The trimmed number
   */
  static TrimDP(value: number, decimalPlaces: number): number {
    const formattedValue = value.toFixed(decimalPlaces);
    return parseFloat(formattedValue);
  }

  /**
   * Converts a point to a CPoint object (coordinate system conversion)
   * @param point - The point with x and y coordinates
   * @param swapAxes - Whether to swap the x and y axes
   * @returns A CPoint object with h and v properties
   */
  static Pt2CPoint(point: any, swapAxes: boolean): any {
    const cpoint: any = {};
    if (swapAxes) {
      cpoint.h = point.y;
      cpoint.v = point.x;
    } else {
      cpoint.h = point.x;
      cpoint.v = point.y;
    }
    return cpoint;
  }

  /**
   * Converts a rectangle to a CRect object (coordinate system conversion)
   * @param rect - The rectangle with x, y, width, and height properties
   * @param swapAxes - Whether to swap the x and y axes
   * @returns A CRect object with h, v, hdist, and vdist properties
   */
  static Rect2CRect(rect: any, swapAxes: boolean): any {
    const crect = {
      h: 0,
      v: 0,
      hdist: 0,
      vdist: 0
    };

    if (swapAxes) {
      crect.h = rect.y;
      crect.v = rect.x;
      crect.hdist = rect.height;
      crect.vdist = rect.width;
    } else {
      crect.h = rect.x;
      crect.hdist = rect.width;
      crect.v = rect.y;
      crect.vdist = rect.height;
    }

    return crect;
  }

  /**
   * Converts a CRect object (with h, v, hdist, vdist properties) to a standard rectangle object
   * @param cRect - The CRect object to convert
   * @param swapAxes - Whether to swap the horizontal and vertical axes during conversion
   * @returns A standard rectangle object with x, y, width, and height properties
   */
  static CRect2Rect(cRect: any, swapAxes: boolean): { x: number; y: number; width: number; height: number } {
    const rect = { x: 0, y: 0, width: 0, height: 0 };

    if (swapAxes) {
      rect.x = cRect.v;
      rect.y = cRect.h;
      rect.width = cRect.vdist;
      rect.height = cRect.hdist;
    } else {
      rect.x = cRect.h;
      rect.y = cRect.v;
      rect.width = cRect.hdist;
      rect.height = cRect.vdist;
    }

    return rect;
  }

  /**
   * Creates a rectangle that encompasses two points
   * @param point1 - The first point with x and y coordinates
   * @param point2 - The second point with x and y coordinates
   * @returns A rectangle that contains both points, or null if either point is null
   */
  static Pt2Rect(point1: { x: number; y: number }, point2: { x: number; y: number }): { x: number; y: number; width: number; height: number } | null {
    const rect = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };

    if (point1 == null || point2 == null) {
      return null;
    }

    // Set initial position to the first point
    rect.x = point1.x;
    rect.y = point1.y;

    // Adjust x to the leftmost point
    if (point2.x < rect.x) {
      rect.x = point2.x;
    }

    // Adjust y to the topmost point
    if (point2.y < rect.y) {
      rect.y = point2.y;
    }

    // Calculate width based on the rightmost point
    rect.width = point1.x - rect.x;
    const point2Width = point2.x - rect.x;
    if (point2Width > rect.width) {
      rect.width = point2Width;
    }

    // Calculate height based on the bottommost point
    rect.height = point1.y - rect.y;
    const point2Height = point2.y - rect.y;
    if (point2Height > rect.height) {
      rect.height = point2Height;
    }

    return rect;
  }

  /**
   * Expands a rectangle by adding margins to all sides
   * @param rect - The rectangle to modify
   * @param margins - The margins to add (left, right, top, bottom)
   */
  static Add2Rect(rect: { x: number; y: number; width: number; height: number },
    margins: { left: number; right: number; top: number; bottom: number }): void {
    rect.x -= margins.left;
    rect.width += margins.right + margins.left;
    rect.y -= margins.top;
    rect.height += margins.bottom + margins.top;
  }

  /**
   * Shrinks a rectangle by subtracting margins from all sides
   * @param rect - The rectangle to modify
   * @param margins - The margins to subtract (left, right, top, bottom)
   */
  static SubRect(rect: { x: number; y: number; width: number; height: number },
    margins: { left: number; right: number; top: number; bottom: number }): void {
    rect.x += margins.left;
    rect.width -= margins.right + margins.left;
    rect.y += margins.top;
    rect.height -= margins.bottom + margins.top;
  }

  /**
   * Calculates the bounding rectangle for a polygon
   * @param targetRect - The rectangle object to store the result
   * @param points - Array of points that form the polygon
   */
  static GetPolyRect(targetRect: { x: number; y: number; width: number; height: number },
    points: Array<{ x: number; y: number }>): void {
    const pointCount = points.length;

    if (pointCount) {
      // Initialize with the first point
      targetRect.x = points[0].x;
      targetRect.y = points[0].y;
      let maxX = targetRect.x;
      let maxY = targetRect.y;
      targetRect.width = 0;
      targetRect.height = 0;

      // Find the min/max x and y values
      for (let i = 1; i < pointCount; i++) {
        if (points[i].x < targetRect.x) {
          targetRect.x = points[i].x;
        }
        if (points[i].x > maxX) {
          maxX = points[i].x;
        }
        if (points[i].y < targetRect.y) {
          targetRect.y = points[i].y;
        }
        if (points[i].y > maxY) {
          maxY = points[i].y;
        }
      }

      // Calculate width and height
      targetRect.width = maxX - targetRect.x;
      targetRect.height = maxY - targetRect.y;
    }
  }

  /**
   * Calculates the bounding rectangle for a polygon with optional start and end indices
   * @param targetRect - The rectangle object to store the result
   * @param points - Array of points that form the polygon
   * @param startIndex - Starting index in the points array (optional, defaults to 0)
   * @param endIndex - Ending index in the points array (optional, defaults to points.length)
   */
  static GetPolyRect1(targetRect: { x: number; y: number; width: number; height: number },
    points: Array<{ x: number; y: number }>,
    startIndex?: number,
    endIndex?: number): void {
    // Initialize rectangle
    targetRect.x = 0;
    targetRect.y = 0;
    targetRect.width = 0;
    targetRect.height = 0;

    const pointCount = points.length;
    if (pointCount === 0) {
      return;
    }

    // Set default values if not provided
    if (startIndex === undefined) {
      startIndex = 0;
    }
    if (endIndex === undefined) {
      endIndex = pointCount;
    }

    // Initialize with the first point
    targetRect.x = points[startIndex].x;
    targetRect.y = points[startIndex].y;

    // Process each point and expand the rectangle as needed
    for (let i = 1 + startIndex; i < endIndex; i++) {
      let delta;

      // Adjust x and width
      if (points[i].x < targetRect.x) {
        delta = targetRect.x - points[i].x;
        targetRect.x = points[i].x;
        targetRect.width += delta;
      } else if (points[i].x > targetRect.x + targetRect.width) {
        delta = points[i].x - (targetRect.x + targetRect.width);
        targetRect.width += delta;
      }

      // Adjust y and height
      if (points[i].y < targetRect.y) {
        delta = targetRect.y - points[i].y;
        targetRect.y = points[i].y;
        targetRect.height += delta;
      } else if (points[i].y > targetRect.y + targetRect.height) {
        delta = points[i].y - (targetRect.y + targetRect.height);
        targetRect.height += delta;
      }
    }
  }

  /**
   * Checks if a rectangle has zero or negative dimensions
   * @param rect - The rectangle to check
   * @returns True if the rectangle is empty (width ≤ 0 or height ≤ 0), false otherwise
   */
  static IsRectEmpty(rect: { width: number; height: number }): boolean {
    return rect.width <= 0 || rect.height <= 0;
  }

  /**
   * Expands a rectangle by specified horizontal and vertical amounts
   * @param rect - The rectangle to inflate
   * @param horizontalAmount - Amount to expand horizontally (on both left and right sides)
   * @param verticalAmount - Amount to expand vertically (on both top and bottom sides)
   */
  static InflateRect(rect: { x: number; y: number; width: number; height: number },
    horizontalAmount: number,
    verticalAmount: number): void {
    rect.x -= horizontalAmount;
    rect.width += 2 * horizontalAmount;
    rect.y -= verticalAmount;
    rect.height += 2 * verticalAmount;
  }

  /**
   * Moves a rectangle by specified horizontal and vertical offsets
   * @param rect - The rectangle to offset
   * @param dx - Horizontal offset (positive moves right, negative moves left)
   * @param dy - Vertical offset (positive moves down, negative moves up)
   */
  static OffsetRect(rect: { x: number; y: number }, dx: number, dy: number): void {
    rect.x += dx;
    rect.y += dy;
  }

  /**
   * Checks if two rectangles are equal within a specified tolerance
   * @param rect1 - The first rectangle to compare
   * @param rect2 - The second rectangle to compare
   * @param tolerance - Maximum allowed difference between rectangle properties (default: 0.001)
   * @returns True if rectangles are equal within tolerance, false otherwise
   */
  static EqualRect(rect1, rect2, tolerance = 0.001): boolean {
    return !(Math.abs(rect1.x - rect2.x) > tolerance) &&
      !(Math.abs(rect1.y - rect2.y) > tolerance) &&
      !(Math.abs(rect1.width - rect2.width) > tolerance) &&
      !(Math.abs(rect1.height - rect2.height) > tolerance);
  }

  /**
   * Creates a rectangle centered around a point with specified size
   * @param point - The center point
   * @param size - The total size (both width and height)
   * @returns A rectangle object centered on the point
   */
  static InflatePoint(point, size) {
    const halfSize = size / 2;
    const rect = {};
    rect.x = point.x - halfSize;
    rect.width = 2 * halfSize;
    rect.y = point.y - halfSize;
    rect.height = 2 * halfSize;
    return rect;
  }

  /**
   * Safe square root function that returns 0 for very small values
   * @param value - The number to calculate square root of
   * @returns The square root of the value, or 0 if value is very small
   */
  static sqrt(value) {
    return value < 1e-9 ? 0 : Math.sqrt(value);
  }

  /**
   * Safely parses a string to float, handling edge cases
   * @param str - The string to parse
   * @returns The parsed float value, or 0 if parsing fails
   */
  static parseFloat(str) {
    if (str == null) return 0;
    if (str.length === 0) return 0;

    // Add leading zero to decimal values
    if (str.charAt(0) === '.') {
      str = '0' + str;
    }

    const result = parseFloat(str);
    return isNaN(result) ? 0 : result;
  }

  /**
   * Computes the union of two rectangles (smallest rectangle containing both)
   * @param rect1 - The first rectangle
   * @param rect2 - The second rectangle
   * @param resultRect - The rectangle where the result will be stored
   * @returns The resulting union rectangle
   */
  static UnionRect(rect1, rect2, resultRect) {
    const union = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };

    // Find leftmost and topmost points
    union.x = Math.min(rect1.x, rect2.x);
    union.y = Math.min(rect1.y, rect2.y);

    // Calculate right and bottom edges
    const right1 = rect1.x + rect1.width;
    const right2 = rect2.x + rect2.width;
    union.width = Math.max(right1, right2) - union.x;

    const bottom1 = rect1.y + rect1.height;
    const bottom2 = rect2.y + rect2.height;
    union.height = Math.max(bottom1, bottom2) - union.y;

    // Copy values to result rectangle
    resultRect.x = union.x;
    resultRect.y = union.y;
    resultRect.width = union.width;
    resultRect.height = union.height;

    return resultRect;
  }

  /**
   * Computes the intersection of two rectangles
   * @param rect1 - The first rectangle
   * @param rect2 - The second rectangle
   * @returns The intersection rectangle, or null if there is no intersection
   */
  static IntersectRect(rect1, rect2) {
    let topRect, bottomRect;

    // Determine which rectangle is higher
    if (rect1.y <= rect2.y) {
      topRect = rect1;
      bottomRect = rect2;
    } else {
      topRect = rect2;
      bottomRect = rect1;
    }

    const right1 = topRect.x + topRect.width;
    const right2 = bottomRect.x + bottomRect.width;
    const bottom1 = topRect.y + topRect.height;
    const bottom2 = bottomRect.y + bottomRect.height;

    // Check vertical overlap
    if (bottomRect.y >= topRect.y && bottomRect.y - bottom1 < -0.01) {
      // Check horizontal overlap
      if (topRect.x >= bottomRect.x) {
        if (topRect.x - right2 < -0.01) {
          return {
            x: topRect.x,
            width: Math.min(right1, right2) - topRect.x,
            y: bottomRect.y,
            height: Math.min(bottom1, bottom2) - bottomRect.y
          };
        }
      } else if (bottomRect.x - right1 < -0.01) {
        return {
          x: bottomRect.x,
          width: Math.min(right1, right2) - bottomRect.x,
          y: bottomRect.y,
          height: Math.min(bottom1, bottom2) - bottomRect.y
        };
      }
    }

    return null;
  }

  /**
   * Checks if one rectangle is completely inside another
   * @param outerRect - The containing rectangle
   * @param innerRect - The rectangle being tested for containment
   * @returns True if innerRect is completely inside outerRect, false otherwise
   */
  static RectInsideRect(outerRect, innerRect) {
    const outerRight = outerRect.x + outerRect.width;
    const innerRight = innerRect.x + innerRect.width;
    const outerBottom = outerRect.y + outerRect.height;
    const innerBottom = innerRect.y + innerRect.height;

    return innerRect.x >= outerRect.x &&
      innerRight <= outerRight &&
      innerRect.y >= outerRect.y &&
      innerBottom <= outerBottom;
  }

  /**
   * Computes the union of two rectangles in CRect coordinate system (h,v,hdist,vdist)
   * @param rect1 - First CRect rectangle
   * @param rect2 - Second CRect rectangle
   * @param resultRect - The CRect rectangle where the result will be stored
   * @returns The resulting union CRect rectangle
   */
  static CN_UnionRect(rect1, rect2, resultRect) {
    const union = {
      h: 0,
      v: 0,
      hdist: 0,
      vdist: 0
    };

    // Find leftmost and topmost points
    union.h = Math.min(rect1.h, rect2.h);
    union.v = Math.min(rect1.v, rect2.v);

    // Calculate right and bottom edges
    const right1 = rect1.h + rect1.hdist;
    const right2 = rect2.h + rect2.hdist;
    union.hdist = Math.max(right1, right2) - union.h;

    const bottom1 = rect1.v + rect1.vdist;
    const bottom2 = rect2.v + rect2.vdist;
    union.vdist = Math.max(bottom1, bottom2) - union.v;

    // Copy values to result rectangle
    resultRect.h = union.h;
    resultRect.v = union.v;
    resultRect.hdist = union.hdist;
    resultRect.vdist = union.vdist;

    return resultRect;
  }

  /**
   * Creates a rectangle from coordinates of opposite corners
   * @param left - X-coordinate of the left side
   * @param top - Y-coordinate of the top side
   * @param right - X-coordinate of the right side
   * @param bottom - Y-coordinate of the bottom side
   * @returns A rectangle object with x, y, width, height properties
   */
  static SetRect(left, top, right, bottom) {
    const rect = { x: 0, y: 0, width: 0, height: 0 };
    rect.x = left;
    rect.width = right - left;
    rect.y = top;
    rect.height = bottom - top;
    return rect;
  }

  /**
   * Creates an array of points representing a polygon from a rectangle
   * @param rect - The source rectangle with x, y, width, and height properties
   * @returns Array of points forming a polygon (including the start point repeated at the end)
   */
  static PolyFromRect(rect) {
    const points = [];

    points.push(new Point(rect.x, rect.y));
    points.push(new Point(rect.x + rect.width, rect.y));
    points.push(new Point(rect.x + rect.width, rect.y + rect.height));
    points.push(new Point(rect.x, rect.y + rect.height));
    points.push(new Point(rect.x, rect.y)); // Close the polygon

    return points;
  }

  /**
   * Calculates width and height for a rectangle based on a diagonal length
   * @param originalRect - The original rectangle with width and height properties
   * @param diagonalLength - The target diagonal length
   * @returns Object with width and height properties
   */
  static GetRectFromDiagonal(originalRect, diagonalLength) {
    let ratio, width, height;

    if (this.IsEqual(originalRect.height, 0)) {
      width = diagonalLength;
      height = 0;
    } else if (this.IsEqual(originalRect.width, 0)) {
      width = 0;
      height = diagonalLength;
    } else {
      ratio = originalRect.height / originalRect.width;
      width = this.sqrt(diagonalLength * diagonalLength / (1 + ratio * ratio));
      height = ratio * width;
    }

    return {
      width: width,
      height: height
    };
  }

  /**
   * Checks if a point is inside a polygon using ray casting algorithm
   * @param polygon - Array of points representing the polygon vertices
   * @param testPoint - The point to test for inclusion in the polygon
   * @returns True if the point is inside the polygon, false otherwise
   */
  static IsPointInPoly(polygon, testPoint) {
    let isInside = false;
    const vertexCount = polygon.length;

    for (let current = 0, previous = vertexCount - 1; current < vertexCount; previous = current++) {
      // Check if point is within the y-range of the current edge
      if ((polygon[current].y <= testPoint.y && testPoint.y < polygon[previous].y) ||
        (polygon[previous].y <= testPoint.y && testPoint.y < polygon[current].y)) {

        // Calculate x-coordinate of edge at testPoint's y-coordinate
        if (testPoint.x < (polygon[previous].x - polygon[current].x) *
          (testPoint.y - polygon[current].y) /
          (polygon[previous].y - polygon[current].y) + polygon[current].x) {
          isInside = !isInside;
        }
      }
    }

    return isInside;
  }

  /**
   * Checks if any corner of a rectangle is inside a polygon
   * @param polygon - Array of points representing the polygon vertices
   * @param rect - The rectangle to test
   * @returns True if any corner of the rectangle is inside the polygon, false otherwise
   */
  static IsFrameCornersInPoly(polygon, rect) {
    const testPoint = { x: 0, y: 0 };

    // Test top-left corner
    testPoint.x = rect.x;
    testPoint.y = rect.y;
    if (Utils2.IsPointInPoly(polygon, testPoint)) return true;

    // Test top-right corner
    testPoint.x += rect.width;
    if (Utils2.IsPointInPoly(polygon, testPoint)) return true;

    // Test bottom-right corner
    testPoint.y += rect.height;
    if (Utils2.IsPointInPoly(polygon, testPoint)) return true;

    // Test bottom-left corner
    testPoint.x -= rect.width;
    return Utils2.IsPointInPoly(polygon, testPoint);
  }

  /**
   * Checks if all corners of a rectangle are inside a polygon
   * @param polygon - Array of points representing the polygon vertices
   * @param rect - The rectangle to test
   * @returns True if all corners of the rectangle are inside the polygon, false otherwise
   */
  static IsAllFrameCornersInPoly(polygon, rect) {
    const testPoint = { x: 0, y: 0 };

    // Test top-left corner
    testPoint.x = rect.x;
    testPoint.y = rect.y;
    if (!Utils2.IsPointInPoly(polygon, testPoint)) return false;

    // Test top-right corner
    testPoint.x += rect.width;
    if (!Utils2.IsPointInPoly(polygon, testPoint)) return false;

    // Test bottom-right corner
    testPoint.y += rect.height;
    if (!Utils2.IsPointInPoly(polygon, testPoint)) return false;

    // Test bottom-left corner
    testPoint.x -= rect.width;
    return Utils2.IsPointInPoly(polygon, testPoint);
  }

  /**
   * Checks if all points of one polygon are inside another polygon
   * @param outerPolygon - Array of points representing the containing polygon
   * @param innerPolygon - Array of points representing the polygon to test
   * @returns True if all points of the inner polygon are inside the outer polygon, false otherwise
   */
  static IsAllPolyPointsInPoly(outerPolygon, innerPolygon) {
    const pointCount = innerPolygon.length;

    for (let i = 0; i < pointCount; i++) {
      if (!Utils2.IsPointInPoly(outerPolygon, innerPolygon[i])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Escapes double quotes in a string for CSV format by doubling them
   * @param inputString - The string to prepare for CSV
   * @returns The input string with double quotes properly escaped for CSV
   */
  static StringtoCSV(inputString) {
    const parts = inputString.split('"');
    const partCount = parts.length;

    if (partCount < 2) {
      return inputString;
    }

    let result = '';
    for (let i = 0; i < partCount - 1; i++) {
      result = result + parts[i] + '""';
    }
    result += parts[partCount - 1];

    return result;
  }

  /**
   * Compares two numbers to check if they are equal within a tolerance
   * @param value1 - First number to compare
   * @param value2 - Second number to compare
   * @param tolerance - Maximum allowed difference between values (default: 0.5)
   * @returns True if the difference between values is less than the tolerance
   */
  static IsEqual(value1: number, value2: number, tolerance?: number): boolean {
    const tol = tolerance !== undefined ? tolerance : 0.5;
    return Math.abs(value1 - value2) < tol;
  }

  /**
   * Custom array splice function that returns a new array without modifying the original
   * @param sourceArray - The source array
   * @param startIndex - The starting index for the splice
   * @param deleteCount - The number of elements to delete
   * @param itemsToInsert - Array of items to insert at the start position
   * @returns A new array with the specified modifications
   */
  static SpliceArray(sourceArray, startIndex, deleteCount, itemsToInsert) {
    let resultArray = [];
    const arrayLength = sourceArray.length;

    if (startIndex >= arrayLength) {
      resultArray = sourceArray.concat(itemsToInsert);
    } else {
      const beforeItems = sourceArray.slice(0, startIndex);
      const afterItems = sourceArray.slice(startIndex + deleteCount, arrayLength);
      resultArray = beforeItems.concat(itemsToInsert).concat(afterItems);
    }

    return resultArray;
  }

  /**
   * Compares two date objects for equality or ordering
   * @param date1 - First date object with year, month, and day properties
   * @param date2 - Second date object with year, month, and day properties
   * @returns 0 if equal, -1 if date1 < date2, 1 if date1 > date2
   */
  static EqualDate(date1, date2) {
    if (date1.year === date2.year) {
      if (date1.month === date2.month) {
        if (date1.day === date2.day) {
          return 0;
        }
        return date1.day < date2.day ? -1 : 1;
      }
      return date1.month < date2.month ? -1 : 1;
    }
    return date1.year < date2.year ? -1 : 1;
  }

  /**
   * Converts an array of characters to a single string
   * @param charArray - Array of characters or strings
   * @returns A concatenated string of all array elements
   */
  static ArrayToString(charArray) {
    let result = '';
    const itemCount = charArray.length;

    for (let i = 0; i < itemCount; i++) {
      result += charArray[i];
    }

    return result;
  }

  /**
   * Browser detection function (placeholder)
   * @returns Information about the browser (currently unimplemented)
   */
  static BrowserDetect() {
    // Implementation not provided in the original code
  }

  /**
   * Creates points for a Y-curved polygon
   * @param pointsArray - Array where generated points will be added
   * @param bounds - Boundary rectangle with top, bottom, left, and right properties
   * @param pointCount - Number of points to generate along the curve
   * @param minHeight - Minimum height constraint (optional)
   * @param minDistance - Minimum distance constraint (optional)
   * @param startHeight - Starting height of the curve
   * @param endHeight - Ending height of the curve
   * @param isRightToLeft - If true, curve goes right-to-left, otherwise left-to-right
   * @param scaleX - X scaling factor (optional)
   * @param scaleY - Y scaling factor (optional)
   * @returns The points array with newly added points
   */
  static PolyYCurve(pointsArray, bounds, pointCount, minHeight, minDistance, startHeight, endHeight, isRightToLeft, scaleX, scaleY) {
    let halfHeight, totalWidth, heightStep, currentHeight, currentDistance, ratio, xPos, yPos;
    let currentPoint = { x: 0, y: 0 };

    halfHeight = (bounds.bottom - bounds.top) / 2;
    totalWidth = bounds.right - bounds.left;
    heightStep = (2 * halfHeight - startHeight - endHeight) / (pointCount - 1);

    for (let i = 0; i < pointCount; ++i) {
      // Calculate current height
      currentHeight = heightStep * i + startHeight;

      if (minHeight && currentHeight < minHeight) {
        currentHeight = minHeight;
      }

      currentDistance = halfHeight - currentHeight;

      if (minDistance && currentDistance - minDistance < -halfHeight) {
        currentDistance = -(halfHeight - minDistance);
      }

      currentPoint.y = bounds.top + (halfHeight - currentDistance);

      ratio = halfHeight ? currentDistance / halfHeight : 0;
      xPos = this.sqrt(1 - ratio * ratio) * totalWidth;

      currentPoint.x = isRightToLeft ? bounds.right - xPos : bounds.left + xPos;

      // Create a copy of the point to avoid reference issues
      const newPoint = $.extend(true, {}, currentPoint);

      if (scaleX) {
        newPoint.x /= scaleX;
      }

      if (scaleY) {
        newPoint.y /= scaleY;
      }

      pointsArray.push(newPoint);
    }

    return pointsArray;
  }

  /**
   * Converts an ArrayBuffer to a Base64 encoded string
   * @param buffer - The ArrayBuffer to convert
   * @returns Base64 encoded string representation of the buffer
   */
  static ArrayBufferToBase64(buffer) {
    let binaryString = '';
    const bytes = new Uint8Array(buffer);
    const byteLength = bytes.byteLength;

    for (let i = 0; i < byteLength; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binaryString);
  }

  /**
   * Converts a Uint8Array to string, handling large arrays in chunks
   * @param byteArray - The Uint8Array to convert to string
   * @returns String representation of the byte array
   */
  static UInt8ToString(byteArray) {
    const chunks = [];
    const chunkSize = 32768; // To avoid call stack size exceeded

    for (let i = 0; i < byteArray.length; i += chunkSize) {
      chunks.push(String.fromCharCode.apply(null, byteArray.subarray(i, i + chunkSize)));
    }

    return chunks.join('');
  }

  /**
   * Escapes special characters in a string for use in regular expressions
   * @param inputString - The string containing characters to be escaped
   * @returns A new string with special RegExp characters escaped with backslashes
   */
  static RegExpEscape(inputString: string): string {
    const specialChars = ['$', '*', '^', '?', '+'];
    let result = '';

    for (let i = 0; i < inputString.length; i++) {
      if (specialChars.includes(inputString[i])) {
        result += '\\' + inputString[i];
      } else {
        result += inputString[i];
      }
    }

    return result;
  }

  /**
   * Stops event propagation and prevents default behaviors for DOM events
   * @param event - The DOM event to suppress default actions and bubbling
   */
  static StopPropagationAndDefaults(event) {
    console.log("U.Utils2 - StopPropagationAndDefaults input:", event);

    // Prevent default event behavior
    event.preventDefault();

    // Stop event propagation
    event.stopPropagation();

    // If gesture is available, also prevent default and stop propagation
    if (event.gesture) {
      event.gesture.preventDefault();
      event.gesture.stopPropagation();
    }

    console.log("U.Utils2 - StopPropagationAndDefaults completed");
  }

  /**
   * Converts a UTF-8 string to Base64 encoding
   * @param text - The UTF-8 string to encode
   * @returns The Base64 encoded string, or empty string if encoding fails
   */
  static UTF8_to_B64(text: string): string {
    let result;
    try {
      result = window.btoa(unescape(encodeURIComponent(text)));
    } catch (error) {
      result = '';
      throw error;
    }
    return result;
  }

  /**
   * Converts a Base64 encoded string back to UTF-8
   * @param base64String - The Base64 string to decode
   * @returns The decoded UTF-8 string, or empty string if decoding fails
   */
  static B64_to_UTF8(base64String: string): string {
    let result;
    try {
      result = decodeURIComponent(escape(window.atob(base64String)));
    } catch (error) {
      result = '';
      throw error;
    }
    return result;
  }

  /**
   * Converts an ArrayBuffer to a string by processing it in chunks to avoid call stack size limitations
   * @param buffer - The ArrayBuffer to convert
   * @returns String representation of the buffer content
   */
  static arrayBufferToString(buffer: ArrayBuffer): string {
    const uint8Array = new Uint8Array(buffer);
    const length = uint8Array.length;
    let result = '';
    const chunkSize = 65535; // Process in chunks to avoid call stack size exceeded

    for (let i = 0; i < length; i += chunkSize) {
      const currentChunkSize = Math.min(chunkSize, length - i);
      result += String.fromCharCode.apply(null, uint8Array.subarray(i, i + currentChunkSize));
    }

    return result;
  }

  /**
   * Parses SVG dimensions from a byte array
   * @param byteArray - The byte array containing SVG data
   * @returns The extracted SVG dimensions
   */
  static ParseSVGDimensions(byteArray: Uint8Array): any {
    const svgString = Utils2.UInt8ToString(byteArray);
    return Style.ExtractSVGSize(svgString);
  }

  /**
   * Compares two objects recursively and returns their differences
   * @param originalObject - The original object to compare from
   * @param newObject - The new object to compare against
   * @param ignoreEqual - Whether to ignore properties that are equal
   * @param roundNumbers - Whether to round numbers before comparing
   * @param ignoreAdded - Whether to ignore properties added in the new object
   * @returns An object describing the differences between the objects
   */
  static ObjectDiff(
    originalObject: any,
    newObject: any,
    ignoreEqual: boolean,
    roundNumbers: boolean,
    ignoreAdded: boolean
  ): any {
    // If objects are identical, return equality result
    if (originalObject === newObject) {
      return {
        changed: 'equal',
        value: originalObject
      };
    }

    const diff = {};
    let objectsEqual = true;

    // Check for properties in the original object
    for (const key in originalObject) {
      if (originalObject[key] !== undefined) {
        if (key in newObject) {
          if (originalObject[key] === newObject[key]) {
            // Properties are identical
            if (!ignoreEqual) {
              diff[key] = {
                changed: 'equal',
                value: originalObject[key]
              };
            }
          } else {
            const originalType = typeof originalObject[key];
            const newType = typeof newObject[key];

            // Handle non-object types directly
            if (
              !originalObject[key] ||
              !newObject[key] ||
              (originalType !== 'object' && originalType !== 'function') ||
              (newType !== 'object' && newType !== 'function')
            ) {
              // Special case for rounding numbers
              if (
                roundNumbers &&
                ignoreEqual &&
                !isNaN(originalObject[key]) &&
                !isNaN(newObject[key]) &&
                Math.round(originalObject[key]) === Math.round(newObject[key])
              ) {
                continue;
              }

              objectsEqual = false;
              diff[key] = {
                changed: 'primitive change',
                removed: originalObject[key],
                added: newObject[key]
              };
            } else {
              // Recursively compare objects
              const nestedDiff = Utils2.ObjectDiff(
                originalObject[key],
                newObject[key],
                ignoreEqual,
                roundNumbers,
                ignoreAdded
              );

              if (nestedDiff.changed === 'equal') {
                if (!ignoreEqual) {
                  diff[key] = {
                    changed: 'equal',
                    value: originalObject[key]
                  };
                }
              } else {
                objectsEqual = false;
                diff[key] = nestedDiff;
              }
            }
          }
        } else {
          // Property is missing in new object
          objectsEqual = false;
          diff[key] = {
            changed: 'removed',
            value: originalObject[key]
          };
        }
      }
    }

    // Check for added properties in the new object
    if (!ignoreEqual || !ignoreAdded) {
      for (const key in newObject) {
        if (newObject[key] !== undefined && !(key in originalObject)) {
          objectsEqual = false;
          diff[key] = {
            changed: 'added',
            value: newObject[key]
          };
        }
      }
    }

    return objectsEqual
      ? { changed: 'equal', value: originalObject }
      : { changed: 'object change', value: diff };
  }

  /**
   * Flips parts of a date string that are separated by a delimiter
   * @param dateString - The date string to flip (e.g., "dd/mm/yyyy" to "yyyy/mm/dd")
   * @returns The flipped date string or null if invalid format
   */
  static FlipDate(dateString: string): string | null {
    let firstPart;
    let position = 0;
    let length = 0;
    let delimiter = null;
    let delimiterFound = null;
    let result = '';

    length = dateString.length;

    // Find the first non-numeric character as delimiter
    for (position = 0; position < length; position++) {
      if (isNaN(parseInt(dateString[position]))) {
        delimiterFound = dateString[position];
        break;
      }
    }

    if (!delimiterFound) return null;

    // Split the date string by the delimiter
    const parts = dateString.split(delimiterFound);

    if (parts.length < 2) return null;

    // Move first part to the end
    firstPart = parts.splice(1, 1);
    parts.unshift(firstPart[0]);

    // Reconstruct the date string
    for (let i = 0; i < parts.length; i++) {
      if (result.length > 0) {
        result += delimiterFound;
      }
      result += parts[i];
    }

    return result;
  }

  /**
   * Ensures a URL has a proper protocol prefix
   * @param url - The URL to qualify
   * @returns The URL with proper protocol prefix (http:// added if missing)
   */
  static QualifyURL(url: string): string {
    if (url &&
      url.length > 0 &&
      url.substring(0, 2) !== '/#' &&
      url.indexOf('http://') === -1 &&
      url.indexOf('https://') === -1) {
      url = 'http://' + url;
    }
    return url;
  }

  /**
   * Calculates the Euclidean distance between two points
   * @param point1 - First point with x and y coordinates
   * @param point2 - Second point with x and y coordinates
   * @returns The distance between the two points
   */
  static GetDistanceBetween2Points(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
    const deltaX = point2.x - point1.x;
    const deltaY = point2.y - point1.y;
    return this.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  /**
   * Checks if a polygon has only rectangular angles (90° turns)
   * @param points - Array of points forming the polygon
   * @returns True if the polygon has only right angles, false otherwise
   */
  static IsRectangular(points: Array<{ x: number; y: number }>): boolean {
    let length;
    let previousAngle;
    let angle;
    let angleDifference;

    length = points.length;

    for (let i = 0; i < length - 1; i++) {
      angle = T3Gv.optManager.SD_GetCounterClockwiseAngleBetween2Points(points[i], points[i + 1]);

      if (i > 0) {
        angleDifference = angle - previousAngle;

        // Normalize angle difference
        if (angleDifference < 0) {
          angleDifference += 2 * Math.PI;
        }

        if (angleDifference > Math.PI) {
          angleDifference -= Math.PI;
        }

        // Check if angle is approximately 90 degrees (π/2 ± 0.052 radians, or about 3°)
        if (!(angleDifference >= Math.PI / 2 - 0.052 && angleDifference <= Math.PI / 2 + 0.052)) {
          return false;
        }
      }

      previousAngle = angle;
    }

    return true;
  }

  /**
   * Extracts the file extension from a path string
   * @param path - The file path to process
   * @returns The lowercase file extension including the dot (e.g., ".jpg") or null if no extension
   */
  static GetPathExtension(path: string): string | null {
    if (path == null) return null;

    const length = path.length;

    if (length > 4) {
      const lastDotIndex = path.lastIndexOf('.');

      if (lastDotIndex >= 0) {
        let extension = path.slice(lastDotIndex, length);

        // Remove URL parameters if present
        const queryParamIndex = extension.indexOf('?');
        if (queryParamIndex >= 0) {
          extension = extension.slice(0, queryParamIndex);
        }

        return extension.toLowerCase();
      }
    }

    return null;
  }

  /**
   * Removes the file extension from a path string
   * @param path - The file path to process
   * @returns The path without its extension, or the original path if no extension
   */
  static RemoveExtension(path: string): string | null {
    if (path == null) return null;

    const lastDotIndex = path.lastIndexOf('.');

    return lastDotIndex === -1 ? path : path.slice(0, lastDotIndex);
  }

  /**
   * Encodes special characters in a string to their HTML entities
   * @param text - The text to encode
   * @returns HTML-encoded string with special characters converted to entities
   */
  static HTMLEncode(text: string): string {
    return $('<div>').text(text).html();
  }

}

export default Utils2
