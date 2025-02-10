
import $ from 'jquery'
import Point from '../Model/Point'

class Utils2 {

  static HasFlag(value: number, flag: number): boolean {
    return typeof value === 'number' &&
      typeof flag === 'number' &&
      (value & flag) === flag;
  }

  static AddFlag(value: number, flag: number): number {
    if (typeof value !== 'number' || typeof flag !== 'number') {
      return value;
    }
    return value | flag;
  }

  static RemoveFlag(value: number, flag: number): number {
    if (typeof value !== 'number' || typeof flag !== 'number') {
      return value;
    }
    return value & ~flag;
  }

  static SetFlag(value: number, flag: number, set: boolean): number {
    if (set) {
      return value | flag;
    } else {
      return value & ~flag;
    }
  }

  static CopyRect(newFrame, frame) {
    newFrame.x = frame.x;
    newFrame.y = frame.y;
    newFrame.width = frame.width;
    newFrame.height = frame.height;
  }

  static PtInRect(rect, point) {
    return point.x >= rect.x &&
      point.x < rect.x + rect.width &&
      point.y >= rect.y &&
      point.y < rect.y + rect.height;
  }

  static EqualPt(point1, point2) {
    return this.IsEqual(point1.x, point2.x) && this.IsEqual(point1.y, point2.y);
  }

  static TrimDP(value: number, decimalPlaces: number): number {
    const fixedValue = value.toFixed(decimalPlaces);
    return parseFloat(fixedValue);
  }

  static Pt2CPoint(point, isVertical) {
    const cPoint = { h: 0, v: 0 };
    if (isVertical) {
      cPoint.h = point.y;
      cPoint.v = point.x;
    } else {
      cPoint.h = point.x;
      cPoint.v = point.y;
    }
    return cPoint;
  }

  static Rect2CRect(rect, isVertical) {
    const cRect = {
      h: 0,
      v: 0,
      hdist: 0,
      vdist: 0
    };

    if (isVertical) {
      cRect.h = rect.y;
      cRect.v = rect.x;
      cRect.hdist = rect.height;
      cRect.vdist = rect.width;
    } else {
      cRect.h = rect.x;
      cRect.hdist = rect.width;
      cRect.v = rect.y;
      cRect.vdist = rect.height;
    }

    return cRect;
  }

  static CRect2Rect(cRect, isVertical) {
    const rect = { x: 0, y: 0, width: 0, height: 0 };
    if (isVertical) {
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

  static Pt2Rect(point1, point2) {
    if (!point1 || !point2) {
      return null;
    }

    const rect = {
      x: Math.min(point1.x, point2.x),
      y: Math.min(point1.y, point2.y),
      width: Math.abs(point1.x - point2.x),
      height: Math.abs(point1.y - point2.y)
    };

    return rect;
  }

  static Add2Rect(rect, padding) {
    rect.x -= padding.left;
    rect.width += padding.right + padding.left;
    rect.y -= padding.top;
    rect.height += padding.bottom + padding.top;
  }

  static SubRect(rect, padding) {
    rect.x += padding.left;
    rect.width -= padding.right + padding.left;
    rect.y += padding.top;
    rect.height -= padding.bottom + padding.top;
  }

  static GetPolyRect(rect, points) {
    if (points.length === 0) return;

    rect.x = points[0].x;
    rect.y = points[0].y;
    let maxX = rect.x;
    let maxY = rect.y;

    for (let i = 1; i < points.length; i++) {
      if (points[i].x < rect.x) rect.x = points[i].x;
      if (points[i].x > maxX) maxX = points[i].x;
      if (points[i].y < rect.y) rect.y = points[i].y;
      if (points[i].y > maxY) maxY = points[i].y;
    }

    rect.width = maxX - rect.x;
    rect.height = maxY - rect.y;
  }

  static GetPolyRect1(rect, points, startIndex = 0, endIndex = points.length) {
    if (points.length === 0) return;

    rect.x = points[startIndex].x;
    rect.y = points[startIndex].y;
    rect.width = 0;
    rect.height = 0;

    for (let i = startIndex + 1; i < endIndex; i++) {
      if (points[i].x < rect.x) {
        rect.width += rect.x - points[i].x;
        rect.x = points[i].x;
      } else if (points[i].x > rect.x + rect.width) {
        rect.width = points[i].x - rect.x;
      }

      if (points[i].y < rect.y) {
        rect.height += rect.y - points[i].y;
        rect.y = points[i].y;
      } else if (points[i].y > rect.y + rect.height) {
        rect.height = points[i].y - rect.y;
      }
    }
  }

  static IsRectEmpty(rect: { width: number, height: number }): boolean {
    return rect.width <= 0 || rect.height <= 0;
  }

  static InflateRect(rect, horizontalPadding, verticalPadding) {
    rect.x -= horizontalPadding;
    rect.width += 2 * horizontalPadding;
    rect.y -= verticalPadding;
    rect.height += 2 * verticalPadding;
  }

  static OffsetRect(rect, offsetX, offsetY) {
    rect.x += offsetX;
    rect.y += offsetY;
  }

  static EqualRect(rect1, rect2, tolerance = 0.001) {
    return Math.abs(rect1.x - rect2.x) <= tolerance &&
      Math.abs(rect1.y - rect2.y) <= tolerance &&
      Math.abs(rect1.width - rect2.width) <= tolerance &&
      Math.abs(rect1.height - rect2.height) <= tolerance;
  }

  static InflatePoint(point, amount) {
    const halfAmount = amount / 2;
    const inflatedPoint = {
      x: point.x - halfAmount,
      width: amount,
      y: point.y - halfAmount,
      height: amount
    };
    return inflatedPoint;
  }

  static sqrt(value: number): number {
    return value < 1e-9 ? 0 : Math.sqrt(value);
  }

  static parseFloat(value: string): number {
    if (value == null) return 0;
    if (value.length === 0) return 0;
    if (value.charAt(0) === '.') {
      value = '0' + value;
    }
    const parsedValue = parseFloat(value);
    return isNaN(parsedValue) ? 0 : parsedValue;
  }

  static UnionRect(rect1, rect2, resultRect) {
    const unionRect = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };

    unionRect.x = Math.min(rect1.x, rect2.x);
    unionRect.y = Math.min(rect1.y, rect2.y);

    const rect1Right = rect1.x + rect1.width;
    const rect2Right = rect2.x + rect2.width;
    unionRect.width = Math.max(rect1Right, rect2Right) - unionRect.x;

    const rect1Bottom = rect1.y + rect1.height;
    const rect2Bottom = rect2.y + rect2.height;
    unionRect.height = Math.max(rect1Bottom, rect2Bottom) - unionRect.y;

    resultRect.x = unionRect.x;
    resultRect.y = unionRect.y;
    resultRect.width = unionRect.width;
    resultRect.height = unionRect.height;

    return resultRect;
  }

  static IntersectRect(rect1, rect2) {
    let topRect, bottomRect;
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

    if (bottomRect.y >= topRect.y && bottomRect.y < bottom1) {
      if (topRect.x >= bottomRect.x) {
        if (topRect.x < right2) {
          return {
            x: topRect.x,
            width: Math.min(right1, right2) - topRect.x,
            y: bottomRect.y,
            height: Math.min(bottom1, bottom2) - bottomRect.y
          };
        }
      } else if (bottomRect.x < right1) {
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

  static RectInsideRect(innerRect, outerRect) {
    const innerRight = innerRect.x + innerRect.width;
    const outerRight = outerRect.x + outerRect.width;
    const innerBottom = innerRect.y + innerRect.height;
    const outerBottom = outerRect.y + outerRect.height;

    return outerRect.x >= innerRect.x &&
      outerRight <= innerRight &&
      outerRect.y >= innerRect.y &&
      outerBottom <= innerBottom;
  }

  static UnionCRect(rect1, rect2, resultRect) {
    const unionRect = {
      h: 0,
      v: 0,
      hdist: 0,
      vdist: 0
    };

    unionRect.h = Math.min(rect1.h, rect2.h);
    unionRect.v = Math.min(rect1.v, rect2.v);

    const rect1Right = rect1.h + rect1.hdist;
    const rect2Right = rect2.h + rect2.hdist;
    unionRect.hdist = Math.max(rect1Right, rect2Right) - unionRect.h;

    const rect1Bottom = rect1.v + rect1.vdist;
    const rect2Bottom = rect2.v + rect2.vdist;
    unionRect.vdist = Math.max(rect1Bottom, rect2Bottom) - unionRect.v;

    resultRect.h = unionRect.h;
    resultRect.v = unionRect.v;
    resultRect.hdist = unionRect.hdist;
    resultRect.vdist = unionRect.vdist;

    return resultRect;
  }

  static SetRect(x: number, y: number, width: number, height: number) {
    return {
      x: x,
      y: y,
      width: width - x,
      height: height - y
    };
  }

  static PolyFromRect(rect) {
    const points = [];

    points.push(new Point(rect.x, rect.y));
    points.push(new Point(rect.x + rect.width, rect.y));
    points.push(new Point(rect.x + rect.width, rect.y + rect.height));
    points.push(new Point(rect.x, rect.y + rect.height));
    points.push(new Point(rect.x, rect.y));

    return points;
  }

  static GetRectFromDiagonal(rect, diagonal) {
    let width, height, aspectRatio;

    if (this.IsEqual(rect.height, 0)) {
      width = diagonal;
      height = 0;
    } else if (this.IsEqual(rect.width, 0)) {
      width = 0;
      height = diagonal;
    } else {
      aspectRatio = rect.height / rect.width;
      width = this.sqrt(diagonal * diagonal / (1 + aspectRatio * aspectRatio));
      height = aspectRatio * width;
    }

    return {
      width: width,
      height: height
    };
  }

  static IsPointInPoly(polygon, point) {
    let isInside = false;
    const numPoints = polygon.length;

    for (let i = 0, j = numPoints - 1; i < numPoints; j = i++) {
      const vertex1 = polygon[i];
      const vertex2 = polygon[j];

      if ((vertex1.y > point.y) !== (vertex2.y > point.y) &&
        point.x < (vertex2.x - vertex1.x) * (point.y - vertex1.y) / (vertex2.y - vertex1.y) + vertex1.x) {
        isInside = !isInside;
      }
    }

    return isInside;
  }

  static IsFrameCornersInPoly(polygon, rect) {
    const point = { x: rect.x, y: rect.y };
    return this.IsPointInPoly(polygon, point) ||
      (point.x += rect.width, this.IsPointInPoly(polygon, point)) ||
      (point.y += rect.height, this.IsPointInPoly(polygon, point)) ||
      (point.x -= rect.width, this.IsPointInPoly(polygon, point));
  }

  static IsAllFrameCornersInPoly(polygon, rect) {
    const point = { x: rect.x, y: rect.y };
    return this.IsPointInPoly(polygon, point) &&
      (point.x += rect.width, this.IsPointInPoly(polygon, point)) &&
      (point.y += rect.height, this.IsPointInPoly(polygon, point)) &&
      (point.x -= rect.width, this.IsPointInPoly(polygon, point));
  }

  static IsAllPolyPointsInPoly(polygon, points) {
    const numPoints = points.length;
    for (let i = 0; i < numPoints; i++) {
      if (!this.IsPointInPoly(polygon, points[i])) {
        return false;
      }
    }
    return true;
  }

  static stringToCSV(input: string): string {
    const parts = input.split('"');
    if (parts.length < 2) return input;
    let result = '';
    for (let i = 0; i < parts.length - 1; i++) {
      result += parts[i] + '""';
    }
    result += parts[parts.length - 1];
    return result;
  }

  static IsEqual(value1: number, value2: number, tolerance?: number): boolean {
    const tol = tolerance !== undefined ? tolerance : 0.5;
    return Math.abs(value1 - value2) < tol;
  }

  static SpliceArray<T>(array: T[], start: number, deleteCount: number, items: T[]): T[] {
    let result: T[] = [];
    const arrayLength = array.length;

    if (start >= arrayLength) {
      result = array.concat(items);
    } else {
      const before = array.slice(0, start);
      const after = array.slice(start + deleteCount, arrayLength);
      result = before.concat(items).concat(after);
    }

    return result;
  }

  static CompareDates(date1, date2) {
    if (date1.year === date2.year) {
      if (date1.month === date2.month) {
        if (date1.day === date2.day) {
          return 0;
        } else {
          return date1.day < date2.day ? -1 : 1;
        }
      } else {
        return date1.month < date2.month ? -1 : 1;
      }
    } else {
      return date1.year < date2.year ? -1 : 1;
    }
  }

  static arrayToString(array: any[]): string {
    let result = '';
    for (let i = 0; i < array.length; i++) {
      result += array[i];
    }
    return result;
  }

  static PolyYCurve(points, rect, numPoints, minY, maxY, startY, endY, isRight, scaleX, scaleY) {
    let centerY, width, step, currentY, adjustedY, distanceFromCenter, xOffset, point;
    centerY = (rect.bottom - rect.top) / 2;
    width = rect.right - rect.left;
    step = (2 * centerY - startY - endY) / (numPoints - 1);

    for (let i = 0; i < numPoints; ++i) {
      currentY = step * i + startY;
      if (minY && currentY < minY) currentY = minY;
      adjustedY = centerY - currentY;
      if (maxY && adjustedY - maxY < -centerY) adjustedY = -(centerY - maxY);
      point = { y: rect.top + (centerY - adjustedY) };
      distanceFromCenter = centerY ? adjustedY / centerY : 0;
      xOffset = this.sqrt(1 - distanceFromCenter * distanceFromCenter) * width;
      point.x = isRight ? rect.right - xOffset : rect.left + xOffset;
      if (scaleX) point.x /= scaleX;
      if (scaleY) point.y /= scaleY;
      points.push($.extend(true, {}, point));
    }
    return points;
  }

  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  static uint8ArrayToString(uint8Array: Uint8Array): string {
    const chunkSize = 32768;
    const chunks = [];
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      chunks.push(String.fromCharCode.apply(null, uint8Array.subarray(i, i + chunkSize)));
    }
    return chunks.join('');
  }

  static escapeRegExp(input: string): string {
    let escapedString = '';
    for (let i = 0; i < input.length; i++) {
      switch (input[i]) {
        case '$':
        case '*':
        case '^':
        case '?':
        case '+':
          escapedString += '\\' + input[i];
          break;
        default:
          escapedString += input[i];
      }
    }
    return escapedString;
  }

  static stopPropagationAndDefaults(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (event instanceof CustomEvent && event.detail.gesture) {
      event.detail.gesture.preventDefault();
      event.detail.gesture.stopPropagation();
    }
  }

  static utf8ToBase64(input: string): string {
    let output: string;
    try {
      output = window.btoa(unescape(encodeURIComponent(input)));
    } catch (error) {
      output = '';
      throw error;
    }
    return output;
  }

  static base64ToUtf8(base64String: string): string {
    let utf8String: string;
    try {
      utf8String = decodeURIComponent(escape(window.atob(base64String)));
    } catch (error) {
      utf8String = '';
      throw error;
    }
    return utf8String;
  }

  static arrayBufferToString(buffer: ArrayBuffer): string {
    const uint8Array = new Uint8Array(buffer);
    const length = uint8Array.length;
    let result = '';
    for (let i = 0; i < length; i += 65535) {
      const chunkSize = Math.min(65535, length - i);
      result += String.fromCharCode.apply(null, uint8Array.subarray(i, i + chunkSize));
    }
    return result;
  }

  static FlipDate(dateString: string): string | null {
    let separator: string | null = null;
    let parts: string[] = [];
    let flippedDate: string = '';

    // Find the separator
    for (let i = 0; i < dateString.length; i++) {
      if (isNaN(parseInt(dateString[i]))) {
        separator = dateString[i];
        break;
      }
    }

    if (!separator) return null;

    // Split the date string by the separator
    parts = dateString.split(separator);
    if (parts.length < 2) return null;

    // Flip the date parts
    const firstPart = parts.splice(1, 1)[0];
    parts.unshift(firstPart);

    // Join the parts back together
    flippedDate = parts.join(separator);

    return flippedDate;
  }
}

export default Utils2
