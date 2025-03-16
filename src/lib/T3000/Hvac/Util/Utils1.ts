

import HvacModels from '../Data/Constant';
import StoredObject from '../Data/State/StoredObject';
import T3Gv from '../Data/T3Gv';
import SegmentData from '../Model/SegmentData'
import $ from 'jquery'
import ConstantData from '../Data/ConstantData'

class Utils1 {

  /**
   * Logs messages to console if not in production environment
   * Provides conditional logging functionality for development and testing
   * @param message - The main message to log
   * @param additionalParams - Optional additional parameters to log
   */
  static Log = (message, ...additionalParams) => {
    if (HvacModels.Default.Environment.toLowerCase() !== "prd") {
      if (additionalParams == null || additionalParams.length === 0) {
        this.Log.apply(console, [message]);
      } else {
        this.Log.apply(console, [message].concat(additionalParams));
      }
    }
  }

  /**
   * Utility test function for debugging and demonstration purposes
   * Logs a test message along with the provided parameters
   * @param param1 - First parameter to test with
   * @param param2 - Second parameter to test with
   */
  static UtilsTest = (param1, param2) => {
    console.log('This is a test function', param1, param2);
  }

  /**
   * Checks if a value is an object
   * @param value - The value to check
   * @returns Boolean indicating if value is an object
   */
  static isObject(value) {
    console.log('U.Util1 isObject input:', { value });
    const result = value !== null && typeof value === 'object';
    console.log('U.Util1 isObject output:', { result });
    return result;
  }

  /**
   * Creates a deep clone of an object
   * @param sourceObject - The object to clone
   * @returns A deep copy of the original object
   */
  static CloneBlock(sourceObject) {
    console.log('U.Util1 CloneBlock input:', { sourceObject });

    const getInstance = Utils1.GetObjectInstance;

    if (sourceObject === null || typeof sourceObject !== "object") {
      throw new Error("Parameter is not an object");
    }

    const objectInstance = getInstance(sourceObject);
    const clonedObject = $.extend(true, objectInstance, sourceObject);

    if (sourceObject.Data !== null && sourceObject.Data instanceof Object) {
      clonedObject.Data = Utils1.DeepCopy(sourceObject.Data);
    }

    console.log('U.Util1 CloneBlock output:', { clonedObject });
    return clonedObject;
  }

  /**
   * Creates an instance of the appropriate type based on the input object
   * @param storedObject - Object to create an instance from
   * @returns A new instance of the appropriate type
   */
  static GetObjectInstance(storedObject) {
    console.log('U.Util1 GetObjectInstance input:', { storedObject });

    if (storedObject === null || typeof storedObject !== "object") {
      throw new Error("Parameter is not an object");
    }

    let result;

    if (storedObject.constructor === StoredObject) {
      result = new StoredObject(null, null, null, false, false, true);
    } else if (storedObject instanceof Array) {
      result = [];
    } else {
      result = undefined;

      $.each(ConstantData.StoredObjectType, function (key, type) {
        try {
          if (storedObject.Type === type) {
            result = new storedObject.constructor({});
            return false;
          }
        } catch (error) {
          throw error;
        }
      });
    }

    console.log('U.Util1 GetObjectInstance output:', { result });
    return result;
  }

  /**
   * Generates a unique object ID by incrementing a counter
   * @returns New unique object ID
   */
  static GenerateObjectID() {
    console.log('U.Util1 GenerateObjectID called');
    T3Gv.CURRENT_SEQ_OBJECT_ID += 1;
    console.log('U.Util1 GenerateObjectID output:', { id: T3Gv.CURRENT_SEQ_OBJECT_ID });
    return T3Gv.CURRENT_SEQ_OBJECT_ID;
  }

  /**
   * Adds a slice method to ArrayBuffer.prototype if it doesn't exist
   * Ensures compatibility across browsers
   */
  static PatchArrayBufferSlice() {
    console.log('U.Util1 PatchArrayBufferSlice called');

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

    console.log('U.Util1 PatchArrayBufferSlice completed');
  }

  /**
   * Checks if the current state is open
   * @returns Boolean indicating if current state is open
   */
  static IsStateOpen() {
    console.log('U.Util1 IsStateOpen called');

    const result = T3Gv.stateManager.CurrentStateID > 0 &&
      T3Gv.stateManager.States[T3Gv.stateManager.CurrentStateID].IsOpen;

    console.log('U.Util1 IsStateOpen output:', { result });
    return result;
  }

  /**
   * Creates a deep copy of an object or value
   * @param source - The value to copy
   * @returns Deep copy of the input value
   */
  static DeepCopy(source) {
    console.log('U.Util1 DeepCopy input:', { source });

    if (source == null) {
      console.log('U.Util1 DeepCopy output: null');
      return null;
    }

    const sourceType = typeof source;

    // Handle array
    if (source instanceof Array) {
      const copy = [];
      const length = source.length;

      for (let i = 0; i < length; i++) {
        copy.push(Utils1.DeepCopy(source[i]));
      }

      console.log('U.Util1 DeepCopy output (array):', { copy });
      return copy;
    }

    // Handle primitives
    if (sourceType === "string" || sourceType === "number" ||
      sourceType === "boolean" || sourceType === "function") {
      console.log('U.Util1 DeepCopy output (primitive):', { source });
      return source;
    }

    // Handle Blob
    if (source instanceof Blob) {
      const result = source.slice();
      console.log('U.Util1 DeepCopy output (Blob):', { result });
      return result;
    }

    // Handle Uint8Array
    if (source instanceof Uint8Array) {
      console.log('U.Util1 DeepCopy output (Uint8Array):', { source });
      return source;
    }

    // Handle objects
    if (sourceType === "object") {
      const copy = new source.constructor();

      for (const key in source) {
        const value = source[key];
        const valueType = typeof value;

        if (value == null) {
          copy[key] = value;
        } else if (valueType === "string" || valueType === "number" || valueType === "boolean") {
          copy[key] = value;
        } else if (value instanceof Array) {
          if (copy[key] == null) {
            copy[key] = [];
          }

          const arrayLength = value.length;
          for (let i = 0; i < arrayLength; i++) {
            copy[key].push(Utils1.DeepCopy(value[i]));
          }
        } else if (valueType !== "function") {
          copy[key] = Utils1.DeepCopy(value);
        }
      }

      console.log('U.Util1 DeepCopy output (object):', { copy });
      return copy;
    }

    console.log('U.Util1 DeepCopy output: null (unhandled type)');
    return null;
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
  static CalcAngleFromPoints(startPoint, endPoint) {
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

  /**
   * Rounds a coordinate value to three decimal places
   * @param value - The coordinate value to round
   * @returns Rounded value with 3 decimal places or original value if NaN
   */
  static RoundCoord(value) {
    const roundedValue = Math.round(1000 * Number(value)) / 1000;
    return isNaN(roundedValue) ? value : roundedValue;
  }

  /**
   * Rounds a coordinate value to two decimal places
   * @param value - The coordinate value to round
   * @returns Rounded value with 2 decimal places or original value if NaN
   */
  static RoundCoord2(value) {
    const roundedValue = Math.round(100 * Number(value)) / 100;
    return isNaN(roundedValue) ? value : roundedValue;
  }

  /**
   * Rounds a coordinate value to one decimal place (low precision)
   * @param value - The coordinate value to round
   * @returns Rounded value with 1 decimal place or original value if NaN
   */
  static RoundCoordLP(value) {
    const roundedValue = Math.round(10 * Number(value)) / 10;
    return isNaN(roundedValue) ? value : roundedValue;
  }

  /**
   * Resolves a hyperlink
   * @param hyperlink - The hyperlink to resolve
   * @returns Resolved hyperlink or null
   */
  static ResolveHyperlink(hyperlink) {
    return null;
  }

  /**
   * Resolves a hyperlink for display purposes
   * Processes special formats and removes routing prefixes
   * @param hyperlink - The hyperlink to format for display
   * @returns Formatted hyperlink string suitable for display
   */
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
  static toTitleCase(title) {
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
    return str.replace(new RegExp(this.StrEscapeRegExp(find), 'g'), replace);
  }

  /**
   * Converts an XML node to a string
   * @param xml - The XML node to serialize
   * @returns Serialized string representation of the XML
   */
  static XML2Str(xml) {
    return (new XMLSerializer).serializeToString(xml);
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
        clonedElement.insertBefore(this.CloneToDoc(childNode, filterAttributes), null);
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
    console.log('U.Util1 CalcSegmentAngle input:', { startPoint, endPoint });

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

    console.log('U.Util1 CalcSegmentAngle output:', { angle });
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
    console.log('U.Util1 RotatePoint input:', { centerPoint, pointToRotate, angleDegrees });

    // Convert angle to radians (negative for clockwise rotation)
    const angleRadians = Math.PI * -angleDegrees / 180;

    let sinAngle = Math.sin(angleRadians);
    let cosAngle = Math.cos(angleRadians);

    // Handle very small values to prevent floating point errors
    if (Math.abs(sinAngle) < 0.0001) sinAngle = 0;
    if (Math.abs(cosAngle) < 0.0001) cosAngle = 0;

    // Translate point to origin (relative to center)
    const relativeX = pointToRotate.x - centerPoint.x;
    const relativeY = pointToRotate.y - centerPoint.y;

    // Apply rotation matrix
    const rotatedPoint = {
      x: relativeX * cosAngle + relativeY * sinAngle + centerPoint.x,
      y: -relativeX * sinAngle + relativeY * cosAngle + centerPoint.y
    };

    console.log('U.Util1 RotatePoint output:', { rotatedPoint });
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
    console.log('U.Util1 OffsetPointAtAngle input:', { point, angleDegrees, distance });

    // Create a deep copy of the point
    const newPoint = Utils1.DeepCopy(point);

    if (distance !== 0) {
      // First offset along x-axis by the distance
      newPoint.x += distance;
      // Then rotate around the original point by the specified angle
      const result = this.RotatePoint(point, newPoint, angleDegrees);

      console.log('U.Util1 OffsetPointAtAngle output:', { result });
      return result;
    }

    console.log('U.Util1 OffsetPointAtAngle output (no offset):', { newPoint });
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
    console.log('U.Util1 CalcExtendedOffsetSegment input:',
      { segment, offset, scale, rayLength });

    // Calculate segment angle (direction)
    const segmentAngle = this.CalcSegmentAngle(
      segment.origSeg.start,
      segment.origSeg.end
    );

    // Calculate perpendicular angle (90° counter-clockwise from segment)
    const perpAngle = segmentAngle - 90;

    // Create offset segment points (shifted perpendicular to original segment)
    segment.extSeg.start = this.OffsetPointAtAngle(
      segment.origSeg.start,
      perpAngle,
      offset
    );

    segment.extSeg.end = this.OffsetPointAtAngle(
      segment.origSeg.end,
      perpAngle,
      offset
    );

    // Create extension points at start (in opposite direction of segment)
    segment.extSeg.startExt = this.OffsetPointAtAngle(
      segment.extSeg.start,
      segmentAngle,
      -offset * scale
    );

    segment.extSeg.startRay = this.OffsetPointAtAngle(
      segment.extSeg.start,
      segmentAngle,
      -rayLength
    );

    // Create extension points at end (in direction of segment)
    segment.extSeg.endExt = this.OffsetPointAtAngle(
      segment.extSeg.end,
      segmentAngle,
      offset * scale
    );

    segment.extSeg.endRay = this.OffsetPointAtAngle(
      segment.extSeg.end,
      segmentAngle,
      rayLength
    );

    // Slightly adjust segment points for better visualization
    segment.extSeg.start = this.OffsetPointAtAngle(
      segment.extSeg.start,
      segmentAngle,
      -1
    );

    segment.extSeg.end = this.OffsetPointAtAngle(
      segment.extSeg.end,
      segmentAngle,
      1
    );

    // Store segment angle for future reference
    segment.angle = segmentAngle;

    console.log('U.Util1 CalcExtendedOffsetSegment output:', { segment });
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
    console.log('U.Util1 CalcSegmentIntersect input:',
      { segment1Start, segment1End, segment2Start, segment2End });

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

          console.log('U.Util1 CalcSegmentIntersect output (collinear overlap):',
            { intersectionPoint, result: true });

          return true;
        }
      }

      console.log('U.Util1 CalcSegmentIntersect output:', { result: false });
      return false;
    }

    // Check if intersection point is within both segments
    if (uA < 0 || uA > 1 || uB < 0 || uB > 1) {
      console.log('U.Util1 CalcSegmentIntersect output:', { result: false });
      return false;
    }

    // Calculate intersection point
    intersectionPoint.x = segment1Start.x + uA * (segment1End.x - segment1Start.x);
    intersectionPoint.y = segment1Start.y + uA * (segment1End.y - segment1Start.y);

    console.log('U.Util1 CalcSegmentIntersect output:',
      { intersectionPoint, result: true });

    return true;
  }

  /**
   * Calculates the center point of a segment
   * @param startPoint - Start point of the segment
   * @param endPoint - End point of the segment
   * @returns Object with x and y coordinates of center point
   */
  static GetSegmentCenterPoint(startPoint, endPoint) {
    console.log('U.Util1 GetSegmentCenterPoint input:', { startPoint, endPoint });

    const centerPoint = {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2
    };

    console.log('U.Util1 GetSegmentCenterPoint output:', { centerPoint });
    return centerPoint;
  }

  /**
   * Compares two angles considering wrap-around at 360 degrees
   * @param angle1 - First angle in degrees
   * @param angle2 - Second angle in degrees
   * @returns 0 if equal, 1 if angle1 > angle2, -1 if angle1 < angle2
   */
  static compareAngle(angle1, angle2) {
    console.log('U.Util1 compareAngle input:', { angle1, angle2 });

    let result;
    if (angle1 === angle2) {
      result = 0;
    } else if (angle1 > angle2) {
      result = angle1 < angle2 + 180 ? 1 : -1;
    } else {
      result = angle1 < angle2 - 180 ? 1 : -1;
    }

    console.log('U.Util1 compareAngle output:', { result });
    return result;
  }

  /**
   * Calculates the shortest angle difference between two angles
   * @param angle1 - First angle in degrees
   * @param angle2 - Second angle in degrees
   * @returns Angle difference in range [-180, 180]
   */
  static DeltaAngle(angle1, angle2) {
    console.log('U.Util1 DeltaAngle input:', { angle1, angle2 });

    let delta = angle1 - angle2;
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }

    console.log('U.Util1 DeltaAngle output:', { delta });
    return delta;
  }

  /**
   * Calculates the maximum delta between x or y coordinates of two points
   * @param point1 - First point with x and y coordinates
   * @param point2 - Second point with x and y coordinates
   * @returns The larger of the x or y deltas
   */
  static DeltaPoints(point1, point2) {
    console.log('U.Util1 DeltaPoints input:', { point1, point2 });

    const deltaX = Math.abs(point1.x - point2.x);
    const deltaY = Math.abs(point1.y - point2.y);
    const result = deltaX > deltaY ? deltaX : deltaY;

    console.log('U.Util1 DeltaPoints output:', { result });
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
    console.log('U.Util1 GetSegmentsDeltaAngle input:',
      { segments, totalSegments, startIndex, endIndex });

    let totalDelta = 0;
    let currentIndex = startIndex;

    while (currentIndex !== endIndex) {
      currentIndex--;
      if (currentIndex < 0) {
        currentIndex = totalSegments - 1;
      }

      totalDelta += this.DeltaAngle(segments[startIndex].angle, segments[currentIndex].angle);
      startIndex = currentIndex;
    }

    console.log('U.Util1 GetSegmentsDeltaAngle output:', { totalDelta });
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
    console.log('U.Util1 AreSegmentsObtuse input:',
      { segments, totalSegments, startIndex, endIndex });

    const result = this.GetSegmentsDeltaAngle(segments, totalSegments, startIndex, endIndex) > 0;

    console.log('U.Util1 AreSegmentsObtuse output:', { result });
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
    console.log('U.Util1 AreSegmentsAjacent input:',
      { totalSegments, currentIndex, adjacentIndex });

    if (adjacentIndex < 0) {
      adjacentIndex = totalSegments - 1;
    }

    const result = adjacentIndex === currentIndex - 1;

    console.log('U.Util1 AreSegmentsAjacent output:', { result });
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
    console.log('U.Util1 InsertSegment input:',
      { segments, index, start, end, offset, scale, ray });

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

    console.log('U.Util1 InsertSegment output:', { newSegment });
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
    console.log('U.Util1 SegmentsInAlignment input:',
      { segments, totalSegments, segmentIndex1, segmentIndex2 });

    // Angle to rotate segments to align with x-axis
    const rotationAngle = -segments[segmentIndex2].angle;

    // Origin point for rotation
    const originPoint = segments[segmentIndex2].extSeg.start;

    // Rotate end point of segment2
    const rotatedEnd = this.RotatePoint(
      originPoint,
      segments[segmentIndex2].extSeg.end,
      rotationAngle
    );

    // Rotate start and end points of segment1
    const rotatedStart1 = this.RotatePoint(
      originPoint,
      segments[segmentIndex1].extSeg.start,
      rotationAngle
    );

    const rotatedEnd1 = this.RotatePoint(
      originPoint,
      segments[segmentIndex1].extSeg.end,
      rotationAngle
    );

    // Check alignment conditions
    const result = rotatedStart1.x > rotatedEnd.x &&
      rotatedEnd1.x > rotatedEnd.x &&
      rotatedStart1.x <= rotatedEnd1.x;

    console.log('U.Util1 SegmentsInAlignment output:', { result });
    return result;
  }

  /**
   * Checks if a segment is empty (zero length)
   * @param segment - Segment to check
   * @returns Boolean indicating if segment is empty
   */
  static isEmptySeg(segment) {
    console.log('U.Util1 isEmptySeg input:', { segment });

    const result = segment.start.x === segment.end.x && segment.start.y === segment.end.y;

    console.log('U.Util1 isEmptySeg output:', { result });
    return result;
  }

  /**
   * Checks if the current position is at the start
   * @param index - Current position index
   * @param flag - Flag to override start check
   * @returns Boolean indicating if at start position
   */
  static isStart(index, flag) {
    console.log('U.Util1 isStart input:', { index, flag });

    const result = index === 0 && !flag;

    console.log('U.Util1 isStart output:', { result });
    return result;
  }

  /**
   * Checks if the current position is at the end
   * @param index - Current position index
   * @param length - Total length
   * @param flag - Flag to override end check
   * @returns Boolean indicating if at end position
   */
  static isEnd(index, length, flag) {
    console.log('U.Util1 isEnd input:', { index, length, flag });

    const result = index === length - 1 && !flag;

    console.log('U.Util1 isEnd output:', { result });
    return result;
  }

  /**
   * Removes trailing whitespace from a string
   * @param text - Input string
   * @returns String with trailing whitespace removed
   */
  static TrimTrailing(text) {
    console.log('U.Util1 TrimTrailing input:', { text });

    const result = text.replace(/\s+$/g, '');

    console.log('U.Util1 TrimTrailing output:', { result });
    return result;
  }

  /**
   * Removes leading whitespace from a string
   * @param text - Input string
   * @returns String with leading whitespace removed
   */
  static TrimLeading(text) {
    console.log('U.Util1 TrimLeading input:', { text });

    const result = text.replace(/^\s+/g, '');

    console.log('U.Util1 TrimLeading output:', { result });
    return result;
  }

  /**
   * Cleans up graphics resources
   * Currently an empty implementation
   */
  static CleanGraphics() {
    console.log('U.Util1 CleanGraphics called');
  }

  /**
   * Generates a random GUID/UUID
   * @returns String containing a randomly generated GUID
   */
  static MakeGuid() {
    console.log('U.Util1 MakeGuid called');

    const result = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'.replace(
      /a/g,
      function () {
        const hexValue = Math.floor(16 * Math.random()).toString(16);
        return hexValue;
      }
    );

    console.log('U.Util1 MakeGuid output:', { result });
    return result;
  }
}

export default Utils1
