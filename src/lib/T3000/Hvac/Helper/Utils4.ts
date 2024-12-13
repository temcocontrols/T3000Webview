

import Utils2 from "./Helper.Utils2"
import SegmentData from '../Model/SegmentData'
import Utils3 from "./Utils3"

class Utils4 {

  static LineDStyleHit = function (points, targetPoint, lineWidth, hitPadding, hitInfo) {
    let rect, distance, slope, hypotenuse, deltaX, deltaY, adjustedX, adjustedY, hitCode = -1, hitIndex = 0, hitPoint = {};
    const inflatedPadding = lineWidth + 12 + hitPadding;
    const pointsLength = points.length;

    for (let i = 0; i < pointsLength - 1; i++) {
      rect = Utils2.Pt2Rect(points[i], points[i + 1]);
      Utils2.InflateRect(rect, inflatedPadding, inflatedPadding);

      if (Utils2.PtInRect(rect, targetPoint)) {
        if (points[i].x === points[i + 1].x) {
          rect = points[i].y < points[i + 1].y ?
            Utils2.SetRect(points[i].x - inflatedPadding, points[i].y, points[i].x + inflatedPadding, points[i + 1].y) :
            Utils2.SetRect(points[i].x - inflatedPadding, points[i + 1].y, points[i].x + inflatedPadding, points[i].y);

          if (Utils2.PtInRect(rect, targetPoint)) {
            hitCode = Constants1.HitCodes.SED_Border;
            hitIndex = i;
            adjustedX = points[i].x;
            adjustedY = targetPoint.y;
          }
        } else if (points[i].y === points[i + 1].y) {
          rect = points[i].x < points[i + 1].x ?
            Utils2.SetRect(points[i].x, points[i].y - inflatedPadding, points[i + 1].x, points[i].y + inflatedPadding) :
            Utils2.SetRect(points[i + 1].x, points[i].y - inflatedPadding, points[i].x, points[i].y + inflatedPadding);

          if (Utils2.PtInRect(rect, targetPoint)) {
            hitCode = Constants1.HitCodes.SED_Border;
            hitIndex = i;
            adjustedY = points[i].y;
            adjustedX = targetPoint.x;
          }
        } else {
          deltaX = Math.abs(points[i].x - points[i + 1].x);
          deltaY = Math.abs(points[i].y - points[i + 1].y);
          hypotenuse = Utils2.sqrt(deltaY * deltaY + deltaX * deltaX);
          distance = targetPoint.x - points[i].x;

          if (deltaY / deltaX < 1) {
            if (points[i].x <= points[i + 1].x) {
              slope = points[i].y;
              adjustedY = points[i + 1].y;
            } else {
              adjustedY = points[i].y;
              slope = points[i + 1].y;
              distance = targetPoint.x - points[i + 1].x;
            }

            adjustedY = slope > adjustedY ? slope - deltaY * distance / deltaX : slope + deltaY * distance / deltaX;
            hitPadding = (deltaX ? hypotenuse / deltaX : 1) * inflatedPadding;

            if (targetPoint.y <= adjustedY + hitPadding && targetPoint.y >= adjustedY - hitPadding) {
              hitCode = Constants1.HitCodes.SED_Border;
              hitIndex = i;
              adjustedY = adjustedY;
              adjustedX = targetPoint.x;
            }
          } else {
            if (points[i].x <= points[i + 1].x) {
              slope = points[i].y;
              adjustedY = points[i + 1].y;
              adjustedX = points[i].x;
            } else {
              adjustedY = points[i].y;
              slope = points[i + 1].y;
              adjustedX = points[i + 1].x;
            }

            adjustedX = slope > adjustedY ? adjustedX + deltaX * (slope - targetPoint.y) / deltaY : adjustedX + deltaX * (targetPoint.y - slope) / deltaY;
            hitPadding = (deltaY ? hypotenuse / deltaY : 1) * inflatedPadding;

            if (targetPoint.x <= adjustedX + hitPadding && targetPoint.x >= adjustedX - hitPadding) {
              hitCode = Constants1.HitCodes.SED_Border;
              hitIndex = i;
              adjustedX = adjustedX;
              adjustedY = targetPoint.y;
            }
          }
        }
      }
    }

    if (adjustedX !== undefined) {
      targetPoint.x = adjustedX;
    }
    if (adjustedY !== undefined) {
      targetPoint.y = adjustedY;
    }
    if (hitInfo) {
      hitInfo.lpHit = hitIndex;
    }
    return hitCode;
  }

  static CalcAngleFromPoints = (startPoint, endPoint) => {
    let deltaX = endPoint.x - startPoint.x;
    let deltaY = endPoint.y - startPoint.y;
    let angle;

    if (deltaY === 0) {
      angle = deltaX >= 0 ? 0 : 180;
    } else if (deltaX === 0) {
      angle = deltaY > 0 ? 90 : 270;
    } else {
      angle = Math.atan(deltaY / deltaX) * (180 / Math.PI);
      if (deltaX < 0) {
        angle += 180;
      } else if (deltaY < 0) {
        angle += 360;
      }
    }

    return angle;
  }

  static RoundCoord = (value) => {
    const roundedValue = Math.round(1000 * Number(value)) / 1000;
    return isNaN(roundedValue) ? value : roundedValue;
  }

  static RoundCoord2 = (value) => {
    const roundedValue = Math.round(100 * Number(value)) / 100;
    return isNaN(roundedValue) ? value : roundedValue;
  }

  static RoundCoordLP = (value) => {
    const roundedValue = Math.round(10 * Number(value)) / 10;
    return isNaN(roundedValue) ? value : roundedValue;
  }

  static ResolveHyperlinkForDisplay = (hyperlink) => {
    let resolvedLink = hyperlink || '';
    if (resolvedLink.indexOf('\r') >= 0) {
      const parts = resolvedLink.split('\r');
      resolvedLink = parts[0];
    } else if (resolvedLink.indexOf('/#') === 0) {
      resolvedLink = resolvedLink.slice(2);
    }
    return resolvedLink;
  }

  static CalcExtendedOffsetSegment(segment, offset, scale, ray) {
    const angle = this.CalcSegmentAngle(segment.origSeg.start, segment.origSeg.end);
    const perpendicularAngle = angle - 90;

    segment.extSeg.start = this.OffsetPointAtAngle(segment.origSeg.start, perpendicularAngle, offset);
    segment.extSeg.end = this.OffsetPointAtAngle(segment.origSeg.end, perpendicularAngle, offset);
    segment.extSeg.startExt = this.OffsetPointAtAngle(segment.extSeg.start, angle, -offset * scale);
    segment.extSeg.startRay = this.OffsetPointAtAngle(segment.extSeg.start, angle, -ray);
    segment.extSeg.endExt = this.OffsetPointAtAngle(segment.extSeg.end, angle, offset * scale);
    segment.extSeg.endRay = this.OffsetPointAtAngle(segment.extSeg.end, angle, ray);
    segment.extSeg.start = this.OffsetPointAtAngle(segment.extSeg.start, angle, -1);
    segment.extSeg.end = this.OffsetPointAtAngle(segment.extSeg.end, angle, 1);
    segment.angle = angle;
  }

  static CalcSegmentIntersect(segment1Start, segment1End, segment2Start, segment2End, intersectionPoint) {
    let denominator, numerator1, numerator2, r, s;

    numerator1 = (segment2End.x - segment2Start.x) * (segment1Start.y - segment2Start.y) - (segment2End.y - segment2Start.y) * (segment1Start.x - segment2Start.x);
    numerator2 = (segment1End.x - segment1Start.x) * (segment1Start.y - segment2Start.y) - (segment1End.y - segment1Start.y) * (segment1Start.x - segment2Start.x);
    denominator = (segment2End.y - segment2Start.y) * (segment1End.x - segment1Start.x) - (segment2End.x - segment2Start.x) * (segment1End.y - segment1Start.y);

    if (denominator === 0) {
      if (numerator1 === 0 && numerator2 === 0) {
        let minX1 = Math.min(segment1Start.x, segment1End.x);
        let maxX1 = Math.max(segment1Start.x, segment1End.x);
        let minY1 = Math.min(segment1Start.y, segment1End.y);
        let maxY1 = Math.max(segment1Start.y, segment1End.y);

        if (segment2Start.x >= minX1 && segment2Start.x <= maxX1 && segment2Start.y >= minY1 && segment2Start.y <= maxY1) {
          intersectionPoint.x = (segment2Start.x + segment1End.x) / 2;
          intersectionPoint.y = (segment2Start.y + segment1End.y) / 2;
          return true;
        }
      }
      return false;
    }

    r = numerator1 / denominator;
    s = numerator2 / denominator;

    if (r >= 0 && r <= 1 && s >= 0 && s <= 1) {
      intersectionPoint.x = segment1Start.x + r * (segment1End.x - segment1Start.x);
      intersectionPoint.y = segment1Start.y + r * (segment1End.y - segment1Start.y);
      return true;
    }

    return false;
  }

  static GetSegmentCenterPoint(startPoint, endPoint) {
    const centerPoint = {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2
    };
    return centerPoint;
  }

  static compareAngles(angle1, angle2) {
    if (angle1 === angle2) {
      return 0;
    } else if (angle1 > angle2) {
      return angle1 < angle2 + 180 ? 1 : -1;
    } else {
      return angle1 < angle2 - 180 ? 1 : -1;
    }
  }

  static DeltaAngle(angle1, angle2) {
    let delta = angle1 - angle2;
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }
    return delta;
  }

  static DeltaPoints(point1, point2) {
    const deltaX = Math.abs(point1.x - point2.x);
    const deltaY = Math.abs(point1.y - point2.y);
    return deltaX > deltaY ? deltaX : deltaY;
  }

  static GetSegmentsDeltaAngle(segments, totalSegments, startIndex, endIndex) {
    let deltaAngleSum = 0;
    let currentIndex = startIndex;

    while (currentIndex !== endIndex) {
      currentIndex--;
      if (currentIndex < 0) {
        currentIndex = totalSegments - 1;
      }
      deltaAngleSum += this.DeltaAngle(segments[startIndex].angle, segments[currentIndex].angle);
      startIndex = currentIndex;
    }

    return deltaAngleSum;
  }

  static AreSegmentsObtuse(segments, totalSegments, startIndex, endIndex) {
    return this.GetSegmentsDeltaAngle(segments, totalSegments, startIndex, endIndex) > 0;
  }

  static AreSegmentsAdjacent(totalSegments, currentIndex, adjacentIndex) {
    if (adjacentIndex < 0) {
      adjacentIndex = totalSegments - 1;
    }
    return adjacentIndex === currentIndex - 1;
  }

  static InsertSegment(segments, index, start, end, offset, scale, ray) {
    const newSegment = new SegmentData();
    newSegment.extSeg.start = start;
    newSegment.extSeg.end = end;
    newSegment.clipSeg.start = start;
    newSegment.clipSeg.end = end;
    newSegment.angle = this.CalcSegmentAngle(start, end);
    newSegment.extSeg.startExt = this.OffsetPointAtAngle(start, newSegment.angle, -offset * scale);
    newSegment.extSeg.startRay = this.OffsetPointAtAngle(start, newSegment.angle, -ray);
    newSegment.extSeg.endExt = this.OffsetPointAtAngle(end, newSegment.angle, offset * scale);
    newSegment.extSeg.endRay = this.OffsetPointAtAngle(end, newSegment.angle, ray);
    segments.splice(index, 0, newSegment);
  }

  static SegmentsInAlignment(segments, startIndex, endIndex, referenceIndex) {
    const referenceAngle = -segments[referenceIndex].angle;
    const referenceStart = segments[referenceIndex].extSeg.start;
    const referenceEnd = this.RotatePoint(referenceStart, segments[referenceIndex].extSeg.end, referenceAngle);
    const startPoint = this.RotatePoint(referenceStart, segments[startIndex].extSeg.start, referenceAngle);
    const endPoint = this.RotatePoint(referenceStart, segments[startIndex].extSeg.end, referenceAngle);

    return startPoint.x > referenceEnd.x &&
      endPoint.x > referenceEnd.x &&
      startPoint.x <= endPoint.x;
  }

  static isEmptySegment(segment) {
    return segment.start.x === segment.end.x &&
      segment.start.y === segment.end.y;
  }

  static isStart(index, flag) {
    return index === 0 && !flag;
  }

  static isEnd(index, length, flag) {
    return index === length - 1 && !flag;
  }

  static cloneToDoc(sourceElement, preserveNamespace) {
    const clonedElement = document.createElementNS(sourceElement.namespaceURI, sourceElement.nodeName);

    for (let i = 0; i < sourceElement.attributes.length; i++) {
      const attribute = sourceElement.attributes[i];
      let attributeName = attribute.nodeName;

      if (attributeName.length) {
        if (attributeName[0] >= 'A' && attributeName[0] <= 'Z') {
          attributeName = attributeName.toLowerCase();
        }

        if (preserveNamespace) {
          if (attribute.nodeValue !== '' && attributeName !== 'xmlns') {
            clonedElement.setAttribute(attributeName, attribute.nodeValue);
          }
        } else {
          if (attribute.nodeValue !== '') {
            clonedElement.setAttribute(attributeName, attribute.nodeValue);
          }
        }
      }
    }

    for (let i = 0; i < sourceElement.childNodes.length; i++) {
      const childNode = sourceElement.childNodes[i];
      if (childNode.nodeType === 1) {
        clonedElement.appendChild(this.cloneToDoc(childNode, preserveNamespace));
      } else {
        clonedElement.appendChild(document.createTextNode(childNode.nodeValue));
      }
    }

    return clonedElement;
  }

  static CalcSegmentAngle(startPoint, endPoint) {
    let deltaX = endPoint.x - startPoint.x;
    let deltaY = endPoint.y - startPoint.y;
    let angle;

    if (deltaY === 0) {
      angle = deltaX >= 0 ? 0 : 180;
    } else if (deltaX === 0) {
      angle = deltaY > 0 ? 90 : 270;
    } else {
      let slope = deltaY / deltaX;
      angle = Math.atan(slope) * (180 / Math.PI);
      if (deltaX < 0) {
        angle += 180;
      } else if (deltaY < 0) {
        angle += 360;
      }
    }

    return angle;
  }

  static RotatePoint(origin, point, angle) {
    const radian = Math.PI * -angle / 180;
    const sin = Math.sin(radian);
    const cos = Math.cos(radian);
    const rotatedPoint = {
      x: 0,
      y: 0
    };

    const deltaX = point.x - origin.x;
    const deltaY = point.y - origin.y;

    rotatedPoint.x = deltaX * cos + deltaY * sin + origin.x;
    rotatedPoint.y = -deltaX * sin + deltaY * cos + origin.y;

    return rotatedPoint;
  }

  static OffsetPointAtAngle(point, angle, offset) {
    let newPoint = Utils3.DeepCopy(point);
    if (offset !== 0) {
      newPoint.x += offset;
      newPoint = this.RotatePoint(point, newPoint, angle);
    }
    return newPoint;
  }

  static LineIsReversed(e, t, a) {
    if (null == e) return !1;
    if (
      e.DrawingObjectBaseClass === Constants1.DrawingObjectBaseClass.LINE
    ) switch (e.LineType) {
      case Constants1.LineType.ARCLINE:
      case Constants1.LineType.LINE:
        if (Math.abs(e.EndPoint.x - e.StartPoint.x) < 0.01) return e.EndPoint.y < e.StartPoint.y;
        var r = Utils2.Pt2Rect(e.EndPoint, e.StartPoint);
        if (
          Math.abs(e.EndPoint.x - r.x) < 0.01 &&
          Math.abs(e.EndPoint.y - r.y) < 0.01 ||
          Math.abs(e.EndPoint.x - r.x) < 0.01 &&
          Math.abs(e.EndPoint.y - (r.y + r.height)) < 0.01
        ) return !0;
        break;
      case Constants1.LineType.SEGLINE:
      case Constants1.LineType.ARCSEGLINE:
        if (a) break;
        if (t && t.KeepSegDir) return !1;
        if (Math.abs(e.StartPoint.x - e.EndPoint.x) <= 1) {
          if (e.StartPoint.y > e.EndPoint.y) return !0
        } else if (e.StartPoint.x > e.EndPoint.x) return !0
    }
    return !1
  }
}

export default Utils4
