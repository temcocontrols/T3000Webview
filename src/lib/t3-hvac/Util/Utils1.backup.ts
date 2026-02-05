import DataObj from '../Data/State/DataObj'
import T3Gv from '../Data/T3Gv'
import SegmentData from '../Model/SegmentData'
import StateConstant from '../Data/State/StateConstant'
// import { Dialog } from 'quasar'
// Placeholder: Quasar Dialog not used in React
const Dialog: any = { create: () => ({}) };
import LogUtil from './LogUtil'

interface AlertOptions {
  message?: string;
  additionalText?: string;
  okCallback?: () => void;
  title?: string;
}

interface Point {
  x: number;
  y: number;
}

class Utils1 {

  /**
   * Displays an alert message to the user
   * @param options - Alert configuration options
   */
  static Alert(options: AlertOptions | string, additionalText?: string, okCallback?: () => void) {
    try {
      // Handle legacy signature (message, additionalText, okCallback)
      let config: AlertOptions;

      if (typeof options === 'string') {
        config = {
          message: options,
          additionalText,
          okCallback,
          title: 'Alert'
        };
      } else {
        config = {
          title: 'Alert',
          ...options
        };
      }

      const { message, additionalText: addText, okCallback: callback, title } = config;

      let displayMessage = message || "Error: ";

      if (addText) {
        displayMessage += addText;
      }

      Dialog.create({
        title,
        message: displayMessage,
        ok: {
          label: 'OK',
          color: 'primary',
          handler: () => {
            if (callback && typeof callback === 'function') {
              try {
                callback();
              } catch (error) {
                LogUtil.Error('Alert callback failed:', error);
              }
            }
          }
        },
        persistent: true
      });
    } catch (error) {
      LogUtil.Error('Failed to show alert:', error);
      // Fallback to native alert
      alert(`${options}: ${additionalText || ''}`);
    }
  }

  /**
   * Checks if a value is an object
   * @param value - The value to check
   * @returns Boolean indicating if value is an object
   */
  static IsObject(value: unknown): value is object {
    return value !== null && typeof value === 'object';
  }

  /**
   * Creates a deep clone of an object
   * @param sourceObject - The object to clone
   * @returns A deep copy of the original object
   */
  static CloneBlock<T extends object>(sourceObject: T): T {
    if (!Utils1.IsObject(sourceObject)) {
      throw new Error("Parameter is not an object");
    }

    try {
      const getInstance = Utils1.GetObjectInstance;
      const objectInstance = getInstance(sourceObject);
      const clonedObject = Utils1.DeepCopy({ ...objectInstance, ...sourceObject });

      // Type-safe check for Data property
      if ('Data' in sourceObject && sourceObject.Data && Utils1.IsObject(sourceObject.Data)) {
        (clonedObject as any).Data = Utils1.DeepCopy((sourceObject as any).Data);
      }

      return clonedObject;
    } catch (error) {
      LogUtil.Error('Error cloning object:', error);
      throw error;
    }
  }

  /**
   * Creates an instance of the appropriate type based on the input object
   * @param storedObject - Object to create an instance from
   * @returns A new instance of the appropriate type
   */
  static GetObjectInstance(storedObject) {
    if (storedObject === null || typeof storedObject !== "object") {
      throw new Error("Parameter is not an object");
    }

    let result;

    if (storedObject.constructor === DataObj) {
      result = new DataObj(null, null, null, false, false, true);
    } else if (storedObject instanceof Array) {
      result = [];
    } else {
      result = undefined;

      /*
      $.each(StateConstant.StoredObjectType, function (key, type) {
        try {
          if (storedObject.Type === type) {
            result = new storedObject.constructor({});
            return false;
          }
        } catch (error) {
          throw error;
        }
      });
      */

      for (const [key, type] of Object.entries(StateConstant.StoredObjectType)) {
        try {
          if (storedObject.Type === type) {
            result = new storedObject.constructor({});
            break; // Exit the loop when a match is found
          }
        } catch (error) {
          throw error;
        }
      }
    }

    return result;
  }

  /**
   * Generates a unique object ID by incrementing a counter
   * @returns New unique object ID
   */
  static GenerateObjectID() {
    T3Gv.currentObjSeqId += 1;
    return T3Gv.currentObjSeqId;
  }

  /**
   * Adds a slice method to ArrayBuffer.prototype if it doesn't exist
   * Ensures compatibility across browsers
   */
  static PatchArrayBufferSlice() {
    if (!ArrayBuffer.prototype.slice) {
      ArrayBuffer.prototype.slice = function (start, end) {
        const srcBuffer = new Uint8Array(this);

        if (end === undefined) {
          end = srcBuffer.length;
        }

        const targetLength = end - start;
        const resultBuffer = new ArrayBuffer(targetLength);
        const targetView = new Uint8Array(resultBuffer);

        for (let i = 0; i < targetLength; i++) {
          targetView[i] = srcBuffer[i + start];
        }

        return resultBuffer;
      };
    }

  }

  /**
   * Checks if the current state is open
   * @returns Boolean indicating if current state is open
   */
  static IsStateOpen() {
    const result = T3Gv.state.currentStateId > 0 &&
      T3Gv.state.states[T3Gv.state.currentStateId].IsOpen;
    return result;
  }

  /**
   * Creates a deep copy of an object or value with circular reference detection
   * @param source - The value to copy
   * @param visited - Map to track visited objects (for circular reference detection)
   * @returns Deep copy of the input value
   */
  static DeepCopy<T>(source: T, visited = new WeakMap()): T {
    // Handle null and undefined
    if (source === null || source === undefined) {
      return source;
    }

    // Handle primitive types
    if (typeof source !== 'object') {
      return source;
    }

    // Handle circular references
    if (visited.has(source as object)) {
      return visited.get(source as object);
    }

    try {
      // Handle dates
      if (source instanceof Date) {
        return new Date(source.getTime()) as unknown as T;
      }

      // Handle regular expressions
      if (source instanceof RegExp) {
        return new RegExp(source.source, source.flags) as unknown as T;
      }

      // Handle arrays
      if (Array.isArray(source)) {
        const copy: any[] = [];
        visited.set(source as object, copy);

        for (let i = 0; i < source.length; i++) {
          copy[i] = Utils1.DeepCopy(source[i], visited);
        }

        return copy as unknown as T;
      }

      // Handle Blob
      if (source instanceof Blob) {
        return source.slice() as unknown as T;
      }

      // Handle Uint8Array and other typed arrays
      if (source instanceof Uint8Array) {
        return new Uint8Array(source) as unknown as T;
      }

      // Handle plain objects
      if (source.constructor === Object || source.constructor === undefined) {
        const copy = {} as T;
        visited.set(source as object, copy);

        for (const key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            (copy as any)[key] = Utils1.DeepCopy((source as any)[key], visited);
          }
        }

        return copy;
      }

      // Handle other object types
      const copy = new (source as any).constructor();
      visited.set(source as object, copy);

      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          const value = (source as any)[key];
          if (typeof value !== 'function') {
            copy[key] = Utils1.DeepCopy(value, visited);
          }
        }
      }

      return copy;

    } catch (error) {
      LogUtil.Error('Error in DeepCopy:', error);
      // Return original if copying fails
      return source;
    }
  }

  /**
   * Generates a UUID (Universally Unique Identifier)
   * Uses current time and performance metrics to enhance randomness
   * @returns A randomly generated UUID string in standard format
   */
  static GenerateUUID() {
    let timestamp = new Date().getTime();
    let performanceTime = (performance && performance.now && performance.now() * 1000) || 0;

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (character) {
      let randomValue = Math.random() * 16;
      if (timestamp > 0) {
        randomValue = (timestamp + randomValue) % 16 | 0;
        timestamp = Math.floor(timestamp / 16);
      } else {
        randomValue = (performanceTime + randomValue) % 16 | 0;
        performanceTime = Math.floor(performanceTime / 16);
      }
      return (character === 'x' ? randomValue : (randomValue & 0x3) | 0x8).toString(16);
    });
  }

  /**
   * Calculates the angle in degrees between two points
   * @param startPoint - The starting point with x and y coordinates
   * @param endPoint - The ending point with x and y coordinates
   * @returns Angle in degrees (0-359) with 0 being East, 90 South, etc.
   */
  static CalcAngleFromPoints(startPoint: Point, endPoint: Point): number {
    if (!startPoint || !endPoint ||
        typeof startPoint.x !== 'number' || typeof startPoint.y !== 'number' ||
        typeof endPoint.x !== 'number' || typeof endPoint.y !== 'number') {
      throw new Error('Invalid point coordinates provided');
    }

    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    let angle: number;

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

  /**
   * Rounds a coordinate value to three decimal places
   * @param value - The coordinate value to round (can include units like px, pt, in, etc.)
   * @returns Rounded value with 3 decimal places
   */
  static RoundCoord(value: number | string): number {
    let numValue: number;

    if (typeof value === 'string') {
      // Handle string values that might contain units
      // Remove common unit suffixes more comprehensively
      const cleanValue = value.toString().trim().replace(/(?:px|pt|in|cm|mm|pc|em|ex|%|vh|vw|vmin|vmax|deg|grad|rad|turn)$/i, '');
      numValue = Number(cleanValue);
    } else {
      numValue = Number(value);
    }

    if (isNaN(numValue)) {
      LogUtil.Warn(`Invalid coordinate value, defaulting to 0: ${value}`);
      return 0;
    }

    return Math.round(1000 * numValue) / 1000;
  }

  /**
   * Rounds a coordinate value to two decimal places
   * @param value - The coordinate value to round (can include units like px, pt, in, etc.)
   * @returns Rounded value with 2 decimal places
   */
  static RoundCoordExt(value: number | string): number {
    let numValue: number;

    if (typeof value === 'string') {
      // Handle string values that might contain units
      const cleanValue = value.toString().trim().replace(/(?:px|pt|in|cm|mm|pc|em|ex|%|vh|vw|vmin|vmax|deg|grad|rad|turn)$/i, '');
      numValue = Number(cleanValue);
    } else {
      numValue = Number(value);
    }

    if (isNaN(numValue)) {
      LogUtil.Warn(`Invalid coordinate value, defaulting to 0: ${value}`);
      return 0;
    }

    return Math.round(100 * numValue) / 100;
  }

  /**
   * Rounds a coordinate value to one decimal place (low precision)
   * @param value - The coordinate value to round (can include units like px, pt, in, etc.)
   * @returns Rounded value with 1 decimal place
   */
  static RoundCoordLP(value: number | string): number {
    let numValue: number;

    if (typeof value === 'string') {
      // Handle string values that might contain units
      const cleanValue = value.toString().trim().replace(/(?:px|pt|in|cm|mm|pc|em|ex|%|vh|vw|vmin|vmax|deg|grad|rad|turn)$/i, '');
      numValue = Number(cleanValue);
    } else {
      numValue = Number(value);
    }

    if (isNaN(numValue)) {
      LogUtil.Warn(`Invalid coordinate value, defaulting to 0: ${value}`);
      return 0;
    }

    return Math.round(10 * numValue) / 10;
  }

  /**
   * Resolves a hyperlink
   * @param hyperlink - The hyperlink to resolve
   * @returns Resolved hyperlink or null
   */
  static ResolveHyperlink(hyperlink: string): string | null {
    if (!hyperlink || typeof hyperlink !== 'string') {
      return null;
    }

    // Add actual hyperlink resolution logic here if needed
    return hyperlink;
  }

  /**
   * Resolves a hyperlink for display purposes
   * Processes special formats and removes routing prefixes
   * @param hyperlink - The hyperlink to format for display
   * @returns Formatted hyperlink string suitable for display
   */
  static ResolveHyperlinkForDisplay(hyperlink: string): string {
    if (!hyperlink || typeof hyperlink !== 'string') {
      return '';
    }

    let resolvedLink = hyperlink;

    if (resolvedLink.indexOf('\r') >= 0) {
      const parts = resolvedLink.split('\r');
      resolvedLink = parts[0];
    } else if (resolvedLink.indexOf('/#') === 0) {
      resolvedLink = resolvedLink.slice(2);
    }

    return resolvedLink;
  }

  /**
   * Creates a deep copy of an object using JSON serialization
   * @param obj - The object to be copied
   * @returns A new deep copy of the object or null if input is falsy
   */
  static CopyObj(obj) {
    if (!obj) return null;
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Converts a string to title case (first letter of each word capitalized)
   * @param title - The string to convert
   * @returns String with the first letter of each word capitalized
   */
  static ToTitleCase(title) {
    return title.replace(
      /([^\W_]+[^\s-]*) */g,
      function (word) {
        return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
      }
    );
  }

  /**
   * Escapes special characters in a string for use in regular expressions
   * @param str - The string to escape
   * @returns String with special regex characters escaped
   */
  static StrEscapeRegExp(str) {
    return str.replace(/([.*+?\^=!:${}()|\[\]\/\\])/g, '\\$1');
  }

  /**
   * Replaces all occurrences of a substring within a string
   * @param find - The substring to find
   * @param replace - The replacement string
   * @param str - The string to modify
   * @returns String with all occurrences of 'find' replaced with 'replace'
   */
  static StrReplaceAll(find, replace, str) {
    return str.replace(new RegExp(Utils1.StrEscapeRegExp(find), 'g'), replace);
  }

  /**
   * Clones an XML element to a document
   * @param sourceElement - The source XML element to clone
   * @param filterAttributes - If true, filters out empty and xmlns attributes
   * @returns A clone of the source element in the target document
   */
  static CloneToDoc(sourceElement, filterAttributes) {
    // Create new element with the same namespace and node name
    const clonedElement = document.createElementNS(
      sourceElement.namespaceURI,
      sourceElement.nodeName
    );

    // Copy attributes
    for (let i = 0, attrLen = sourceElement.attributes.length; i < attrLen; ++i) {
      const attribute = sourceElement.attributes[i];
      const attrName = attribute.nodeName;

      if (attrName.length) {
        // Convert attribute name to lowercase if it starts with uppercase letter
        const finalAttrName = (attrName[0] >= 'A' && attrName[0] <= 'Z') ?
          attrName.toLowerCase() : attrName;

        if (filterAttributes) {
          // Only add non-empty attributes that aren't xmlns
          if (attribute.nodeValue !== '' && finalAttrName !== 'xmlns') {
            clonedElement.setAttribute(finalAttrName, attribute.nodeValue);
          }
        } else {
          // Add all non-empty attributes
          if (attribute.nodeValue !== '') {
            clonedElement.setAttribute(finalAttrName, attribute.nodeValue);
          }
        }
      }
    }

    // Clone child nodes
    for (let i = 0, childLen = sourceElement.childNodes.length; i < childLen; ++i) {
      const childNode = sourceElement.childNodes[i];
      if (childNode.nodeType === 1) { // Element node
        clonedElement.insertBefore(Utils1.CloneToDoc(childNode, filterAttributes), null);
      } else { // Text node
        clonedElement.insertBefore(document.createTextNode(childNode.nodeValue), null);
      }
    }

    return clonedElement;
  }

  /**
   * Calculates the angle (in degrees) between two points
   * Angle is measured clockwise from east (0 degrees)
   * @param startPoint - The starting point with x and y coordinates
   * @param endPoint - The ending point with x and y coordinates
   * @returns Angle in degrees (0-359) with 0 being East, 90 South, 180 West, 270 North
   */
  static CalcSegmentAngle(startPoint, endPoint) {
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    let angle;

    if (deltaY === 0) {
      angle = deltaX >= 0 ? 0 : 180;
    } else if (deltaX === 0) {
      angle = deltaY > 0 ? 90 : 270;
    } else {
      const slope = deltaY / deltaX;
      angle = Math.atan(slope) * 180 / Math.PI;

      if (deltaX < 0) {
        angle += 180;
      } else if (deltaY < 0) {
        angle += 360;
      }
    }

    return angle;
  }

  /**
   * Rotates a point around a center point by a specified angle
   * @param centerPoint - The point to rotate around
   * @param pointToRotate - The point to be rotated
   * @param angleDegrees - The rotation angle in degrees (negative for clockwise)
   * @returns New point after rotation
   */
  static RotatePoint(centerPoint, pointToRotate, angleDegrees) {
    // Convert angle to radians (negative for clockwise rotation)
    const angleRadians = Math.PI * -angleDegrees / 180;

    let sinAngle = Math.sin(angleRadians);
    let cosAngle = Math.cos(angleRadians);

    // Handle very small values to prevent floating point errors
    if (Math.abs(sinAngle) < 0.0001) sinAngle = 0;
    if (Math.abs(cosAngle) < 0.0001) cosAngle = 0;

    // Translate point to origin (relative to center)
    const relativeX = pointToRotate.x - (centerPoint?.x ?? 0);
    const relativeY = pointToRotate.y - (centerPoint?.y ?? 0);

    // Apply rotation matrix
    const rotatedPoint = {
      x: relativeX * cosAngle + relativeY * sinAngle + (centerPoint?.x ?? 0),
      y: -relativeX * sinAngle + relativeY * cosAngle + (centerPoint?.y ?? 0)
    };

    return rotatedPoint;
  }

  /**
   * Offsets a point by a given distance in the specified angle direction
   * @param point - The original point to offset
   * @param angleDegrees - The angle in degrees to offset along
   * @param distance - The distance to offset
   * @returns New point after offset
   */
  static OffsetPointAtAngle(point, angleDegrees, distance) {
    // Create a deep copy of the point
    const newPoint = Utils1.DeepCopy(point);

    if (distance !== 0) {
      // First offset along x-axis by the distance
      newPoint.x += distance;
      // Then rotate around the original point by the specified angle
      const result = Utils1.RotatePoint(point, newPoint, angleDegrees);

      return result;
    }

    return newPoint;
  }

  /**
   * Calculates extended offset segments with various geometric extensions
   * Creates auxiliary points (rays, extensions) useful for drawing connected segments
   * @param segment - The segment to calculate extensions for
   * @param offset - The perpendicular offset distance
   * @param scale - Scale factor for extension lengths
   * @param rayLength - Length of ray extensions
   */
  static CalcExtendedOffsetSegment(segment, offset, scale, rayLength) {
    // Calculate segment angle (direction)
    const segmentAngle = Utils1.CalcSegmentAngle(
      segment.origSeg.start,
      segment.origSeg.end
    );

    // Calculate perpendicular angle (90° counter-clockwise from segment)
    const perpAngle = segmentAngle - 90;

    // Create offset segment points (shifted perpendicular to original segment)
    segment.extSeg.start = Utils1.OffsetPointAtAngle(
      segment.origSeg.start,
      perpAngle,
      offset
    );

    segment.extSeg.end = Utils1.OffsetPointAtAngle(
      segment.origSeg.end,
      perpAngle,
      offset
    );

    // Create extension points at start (in opposite direction of segment)
    segment.extSeg.startExt = Utils1.OffsetPointAtAngle(
      segment.extSeg.start,
      segmentAngle,
      -offset * scale
    );

    segment.extSeg.startRay = Utils1.OffsetPointAtAngle(
      segment.extSeg.start,
      segmentAngle,
      -rayLength
    );

    // Create extension points at end (in direction of segment)
    segment.extSeg.endExt = Utils1.OffsetPointAtAngle(
      segment.extSeg.end,
      segmentAngle,
      offset * scale
    );

    segment.extSeg.endRay = Utils1.OffsetPointAtAngle(
      segment.extSeg.end,
      segmentAngle,
      rayLength
    );

    // Slightly adjust segment points for better visualization
    segment.extSeg.start = Utils1.OffsetPointAtAngle(
      segment.extSeg.start,
      segmentAngle,
      -1
    );

    segment.extSeg.end = Utils1.OffsetPointAtAngle(
      segment.extSeg.end,
      segmentAngle,
      1
    );

    // Store segment angle for future reference
    segment.angle = segmentAngle;

  }

  /**
   * Calculates the intersection point between two line segments
   * @param segment1Start - Start point of first segment
   * @param segment1End - End point of first segment
   * @param segment2Start - Start point of second segment
   * @param segment2End - End point of second segment
   * @param intersectionPoint - Object to store the intersection point
   * @returns Boolean indicating if intersection exists
   */
  static CalcSegmentIntersect(segment1Start, segment1End, segment2Start, segment2End, intersectionPoint) {
    const denominator = (segment2End.y - segment2Start.y) * (segment1End.x - segment1Start.x) -
      (segment2End.x - segment2Start.x) * (segment1End.y - segment1Start.y);

    const uA = ((segment2End.x - segment2Start.x) * (segment1Start.y - segment2Start.y) -
      (segment2End.y - segment2Start.y) * (segment1Start.x - segment2Start.x)) / denominator;

    const uB = ((segment1End.x - segment1Start.x) * (segment1Start.y - segment2Start.y) -
      (segment1End.y - segment1Start.y) * (segment1Start.x - segment2Start.x)) / denominator;

    // If denominator is 0, lines are parallel or collinear
    if (denominator === 0) {
      // Check if collinear
      if (uA === 0 && uB === 0) {
        // Determine bounds for overlap check
        let minX, maxX, minY, maxY;

        if (segment1Start.x <= segment1End.x) {
          minX = segment1Start.x;
          maxX = segment1End.x;
        } else {
          minX = segment1End.x;
          maxX = segment1Start.x;
        }

        if (segment1Start.y <= segment1End.y) {
          minY = segment1Start.y;
          maxY = segment1End.y;
        } else {
          minY = segment1End.y;
          maxY = segment1Start.y;
        }

        // Check if segment2Start is within segment1's bounds
        if (segment2Start.x >= minX &&
          segment2Start.x <= maxX &&
          segment2Start.y >= minY &&
          segment2Start.y <= maxY) {
          intersectionPoint.x = (segment2Start.x + segment1End.x) / 2;
          intersectionPoint.y = (segment2Start.y + segment1End.y) / 2;

          return true;
        }
      }

      return false;
    }

    // Check if intersection point is within both segments
    if (uA < 0 || uA > 1 || uB < 0 || uB > 1) {
      return false;
    }

    // Calculate intersection point
    intersectionPoint.x = segment1Start.x + uA * (segment1End.x - segment1Start.x);
    intersectionPoint.y = segment1Start.y + uA * (segment1End.y - segment1Start.y);

    return true;
  }

  /**
   * Calculates the center point of a segment
   * @param startPoint - Start point of the segment
   * @param endPoint - End point of the segment
   * @returns Object with x and y coordinates of center point
   */
  static GetSegmentCenterPoint(startPoint, endPoint) {
    const centerPoint = {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2
    };

    return centerPoint;
  }

  /**
   * Compares two angles considering wrap-around at 360 degrees
   * @param angle1 - First angle in degrees
   * @param angle2 - Second angle in degrees
   * @returns 0 if equal, 1 if angle1 > angle2, -1 if angle1 < angle2
   */
  static CompareAngle(angle1, angle2) {
    let result;
    if (angle1 === angle2) {
      result = 0;
    } else if (angle1 > angle2) {
      result = angle1 < angle2 + 180 ? 1 : -1;
    } else {
      result = angle1 < angle2 - 180 ? 1 : -1;
    }

    return result;
  }

  /**
   * Calculates the shortest angle difference between two angles
   * @param angle1 - First angle in degrees
   * @param angle2 - Second angle in degrees
   * @returns Angle difference in range [-180, 180]
   */
  static DeltaAngle(angle1, angle2) {
    let delta = angle1 - angle2;
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }

    return delta;
  }

  /**
   * Calculates the maximum delta between x or y coordinates of two points
   * @param point1 - First point with x and y coordinates
   * @param point2 - Second point with x and y coordinates
   * @returns The larger of the x or y deltas
   */
  static DeltaPoints(point1, point2) {
    const deltaX = Math.abs(point1.x - point2.x);
    const deltaY = Math.abs(point1.y - point2.y);
    const result = deltaX > deltaY ? deltaX : deltaY;

    return result;
  }

  /**
   * Calculates the total angle change between segments in a sequence
   * @param segments - Array of segments
   * @param totalSegments - Total number of segments
   * @param startIndex - Start segment index
   * @param endIndex - End segment index
   * @returns Total angle change
   */
  static GetSegmentsDeltaAngle(segments, totalSegments, startIndex, endIndex) {
    let totalDelta = 0;
    let currentIndex = startIndex;

    while (currentIndex !== endIndex) {
      currentIndex--;
      if (currentIndex < 0) {
        currentIndex = totalSegments - 1;
      }

      totalDelta += Utils1.DeltaAngle(segments[startIndex].angle, segments[currentIndex].angle);
      startIndex = currentIndex;
    }

    return totalDelta;
  }

  /**
   * Checks if segments form an obtuse angle
   * @param segments - Array of segments
   * @param totalSegments - Total number of segments
   * @param startIndex - Start segment index
   * @param endIndex - End segment index
   * @returns Boolean indicating if segments form an obtuse angle
   */
  static AreSegmentsObtuse(segments, totalSegments, startIndex, endIndex) {
    const result = Utils1.GetSegmentsDeltaAngle(segments, totalSegments, startIndex, endIndex) > 0;
    return result;
  }

  /**
   * Checks if two segments are adjacent in a loop
   * @param totalSegments - Total number of segments
   * @param currentIndex - Current segment index
   * @param adjacentIndex - Potential adjacent segment index
   * @returns Boolean indicating if segments are adjacent
   */
  static AreSegmentsAjacent(totalSegments, currentIndex, adjacentIndex) {
    if (adjacentIndex < 0) {
      adjacentIndex = totalSegments - 1;
    }

    const result = adjacentIndex === currentIndex - 1;
    return result;
  }

  /**
   * Inserts a new segment into the segments array
   * @param segments - Array of segments to modify
   * @param index - Position to insert the new segment
   * @param start - Start point of the segment
   * @param end - End point of the segment
   * @param offset - Offset distance
   * @param scale - Scale factor for offset
   * @param ray - Ray length
   */
  static InsertSegment(segments, index, start, end, offset, scale, ray) {
    const newSegment = new SegmentData();
    newSegment.extSeg.start = start;
    newSegment.extSeg.end = end;
    newSegment.clipSeg.start = start;
    newSegment.clipSeg.end = end;
    newSegment.angle = Utils1.CalcSegmentAngle(start, end);
    newSegment.extSeg.startExt = Utils1.OffsetPointAtAngle(start, newSegment.angle, -offset * scale);
    newSegment.extSeg.startRay = Utils1.OffsetPointAtAngle(start, newSegment.angle, -ray);
    newSegment.extSeg.endExt = Utils1.OffsetPointAtAngle(end, newSegment.angle, offset * scale);
    newSegment.extSeg.endRay = Utils1.OffsetPointAtAngle(end, newSegment.angle, ray);

    segments.splice(index, 0, newSegment);
  }

  /**
   * Checks if segments are in alignment
   * @param segments - Array of segments
   * @param totalSegments - Total number of segments
   * @param segmentIndex1 - Index of first segment
   * @param segmentIndex2 - Index of second segment
   * @returns Boolean indicating if segments are in alignment
   */
  static SegmentsInAlignment(segments, totalSegments, segmentIndex1, segmentIndex2) {

    // Angle to rotate segments to align with x-axis
    const rotationAngle = -segments[segmentIndex2].angle;

    // Origin point for rotation
    const originPoint = segments[segmentIndex2].extSeg.start;

    // Rotate end point of segment2
    const rotatedEnd = Utils1.RotatePoint(
      originPoint,
      segments[segmentIndex2].extSeg.end,
      rotationAngle
    );

    // Rotate start and end points of segment1
    const rotatedStart1 = Utils1.RotatePoint(
      originPoint,
      segments[segmentIndex1].extSeg.start,
      rotationAngle
    );

    const rotatedEnd1 = Utils1.RotatePoint(
      originPoint,
      segments[segmentIndex1].extSeg.end,
      rotationAngle
    );

    // Check alignment conditions
    const result = rotatedStart1.x > rotatedEnd.x &&
      rotatedEnd1.x > rotatedEnd.x &&
      rotatedStart1.x <= rotatedEnd1.x;
    return result;
  }

  /**
   * Checks if a segment is empty (zero length)
   * @param segment - Segment to check
   * @returns Boolean indicating if segment is empty
   */
  static IsEmptySeg(segment) {
    const result = segment.start.x === segment.end.x && segment.start.y === segment.end.y;
    return result;
  }

  /**
   * Checks if the current position is at the start
   * @param index - Current position index
   * @param flag - Flag to override start check
   * @returns Boolean indicating if at start position
   */
  static IsStart(index, flag) {
    const result = index === 0 && !flag;
    return result;
  }

  /**
   * Checks if the current position is at the end
   * @param index - Current position index
   * @param length - Total length
   * @param flag - Flag to override end check
   * @returns Boolean indicating if at end position
   */
  static IsEnd(index, length, flag) {
    const result = index === length - 1 && !flag;
    return result;
  }

  /**
   * Removes trailing whitespace from a string
   * @param text - Input string
   * @returns String with trailing whitespace removed
   */
  static TrimTrailing(text) {
    const result = text.replace(/\s+$/g, '');
    return result;
  }

  /**
   * Removes leading whitespace from a string
   * @param text - Input string
   * @returns String with leading whitespace removed
   */
  static TrimLeading(text) {

    const result = text.replace(/^\s+/g, '');
    return result;
  }

  /**
   * Cleans up graphics resources
   * Currently an empty implementation
   */
  static CleanGraphics() {
  }

  /**
   * Generates a random GUID/UUID
   * @returns String containing a randomly generated GUID
   */
  static MakeGuid() {
    const result = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'.replace(
      /a/g,
      function () {
        const hexValue = Math.floor(16 * Math.random()).toString(16);
        return hexValue;
      }
    );

    return result;
  }

  /**
   * Safely parses a coordinate value that may contain units
   * @param value - The value to parse (number or string with optional units)
   * @returns Parsed numeric value or 0 if invalid
   */
  private static parseCoordinateValue(value: number | string): number {
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }

    if (typeof value === 'string') {
      // Handle empty or whitespace-only strings
      const trimmed = value.trim();
      if (!trimmed) return 0;

      // Remove common CSS/SVG units (case-insensitive)
      // Includes: px, pt, in, cm, mm, pc, em, ex, %, vh, vw, vmin, vmax, deg, grad, rad, turn
      const cleanValue = trimmed.replace(/(?:px|pt|in|cm|mm|pc|em|ex|%|vh|vw|vmin|vmax|deg|grad|rad|turn)$/i, '');

      const numValue = Number(cleanValue);
      return isNaN(numValue) ? 0 : numValue;
    }

    return 0;
  }

}

export default Utils1
