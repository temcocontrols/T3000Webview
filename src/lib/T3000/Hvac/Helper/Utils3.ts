

import Utils2 from "./Utils2"
import ConstantData from "../Data/ConstantData"
import KeyboardConstant from "../Util/KeyboardConstant";
import QuickStyle from "../Model/QuickStyle";

class Utils3 {

  /**
   * Determines if a point hits a line with a specific style and calculates the hit point
   * @param points - Array of points that form line segments
   * @param testPoint - The point to test against the line segments
   * @param baseDistance - Base distance threshold for hit detection
   * @param additionalDistance - Additional distance for hit detection
   * @param hitInfo - Optional output parameter for hit information
   * @returns Hit code indicating the type of hit (0 for no hit)
   */
  static LineDStyleHit(points, testPoint, baseDistance, additionalDistance, hitInfo) {
    let xIntersect;  // X coordinate of the intersection point
    let yOnLine;     // Y coordinate on the line
    let startY;      // Start Y coordinate
    let endY;        // End Y coordinate
    let startX;      // Start X coordinate
    let hitDistance; // Distance threshold for hit detection
    let distanceThreshold; // Calculated threshold
    let deltaX;      // Difference in X coordinates
    let deltaY;      // Difference in Y coordinates
    let lineLength;  // Length of the line segment
    let xDiff;       // X difference between test point and line point
    let xHit;        // X coordinate of hit point
    let yHit;        // Y coordinate of hit point

    let hitSegmentIndex = -1;
    let hitCode = 0;
    let rect = { x: 0, y: 0, width: 0, height: 0 };

    // Calculate total hit distance threshold
    hitDistance = baseDistance + 12 + additionalDistance;
    const pointCount = points.length;

    // Loop through line segments
    for (let i = 0; i < pointCount - 1; i++) {
      // Create rectangle from line segment
      rect = Utils2.Pt2Rect(points[i], points[i + 1]);
      Utils2.InflateRect(rect, hitDistance, hitDistance);

      // Check if the test point is within the inflated rectangle
      if (Utils2.pointInRect(rect, testPoint)) {
        // Vertical line segment
        if (points[i].x === points[i + 1].x) {
          // Create rectangle for vertical line
          if (points[i].y < points[i + 1].y) {
            rect = Utils2.SetRect(
              points[i].x - hitDistance,
              points[i].y,
              points[i].x + hitDistance,
              points[i + 1].y
            );
          } else {
            rect = Utils2.SetRect(
              points[i].x - hitDistance,
              points[i + 1].y,
              points[i].x + hitDistance,
              points[i].y
            );
          }

          // If point is in vertical line rectangle
          if (Utils2.pointInRect(rect, testPoint)) {
            hitCode = ConstantData.HitCodes.SED_Border;
            hitSegmentIndex = i;
            xHit = points[i].x;
            yHit = testPoint.y;
          }
        }
        // Horizontal line segment
        else if (points[i].y === points[i + 1].y) {
          // Create rectangle for horizontal line
          if (points[i].x < points[i + 1].x) {
            rect = Utils2.SetRect(
              points[i].x,
              points[i].y - hitDistance,
              points[i + 1].x,
              points[i].y + hitDistance
            );
          } else {
            rect = Utils2.SetRect(
              points[i + 1].x,
              points[i].y - hitDistance,
              points[i].x,
              points[i].y + hitDistance
            );
          }

          // If point is in horizontal line rectangle
          if (Utils2.pointInRect(rect, testPoint)) {
            hitCode = ConstantData.HitCodes.SED_Border;
            hitSegmentIndex = i;
            yHit = points[i].y;
            xHit = testPoint.x;
          }
        }
        // Diagonal line segment
        else {
          deltaX = Math.abs(points[i].x - points[i + 1].x);
          deltaY = Math.abs(points[i].y - points[i + 1].y);
          lineLength = Utils2.sqrt(deltaY * deltaY + deltaX * deltaX);
          xDiff = testPoint.x - points[i].x;

          // Line is more horizontal than vertical (slope < 1)
          if (deltaY / deltaX < 1) {
            if (points[i].x <= points[i + 1].x) {
              startY = points[i].y;
              endY = points[i + 1].y;
            } else {
              endY = points[i].y;
              startY = points[i + 1].y;
              xDiff = testPoint.x - points[i + 1].x;
            }

            // Calculate Y coordinate on line
            yOnLine = startY > endY
              ? startY - deltaY * xDiff / deltaX
              : startY + deltaY * xDiff / deltaX;

            // Calculate distance threshold
            distanceThreshold = (deltaX ? lineLength / deltaX : 1) * hitDistance;

            // Check if point is within threshold of the line
            if (testPoint.y <= yOnLine + distanceThreshold &&
              testPoint.y >= yOnLine - distanceThreshold) {
              hitCode = ConstantData.HitCodes.SED_Border;
              hitSegmentIndex = i;
              yHit = yOnLine;
              xHit = testPoint.x;
            }
          }
          // Line is more vertical than horizontal (slope > 1)
          else {
            if (points[i].x <= points[i + 1].x) {
              startY = points[i].y;
              endY = points[i + 1].y;
              startX = points[i].x;
            } else {
              endY = points[i].y;
              startY = points[i + 1].y;
              startX = points[i + 1].x;
            }

            // Calculate X coordinate on line
            xIntersect = startY > endY
              ? startX + deltaX * (startY - testPoint.y) / deltaY
              : startX + deltaX * (testPoint.y - startY) / deltaY;

            // Calculate distance threshold
            distanceThreshold = (deltaY ? lineLength / deltaY : 1) * hitDistance;

            // Check if point is within threshold of the line
            if (testPoint.x <= xIntersect + distanceThreshold &&
              testPoint.x >= xIntersect - distanceThreshold) {
              hitCode = ConstantData.HitCodes.SED_Border;
              hitSegmentIndex = i;
              xHit = xIntersect;
              yHit = testPoint.y;
            }
          }
        }
      }
    }

    // Update test point with hit location if found
    if (xHit !== undefined) {
      testPoint.x = xHit;
    }
    if (yHit !== undefined) {
      testPoint.y = yHit;
    }

    // Update hit information if provided
    if (hitInfo) {
      hitInfo.lpHit = hitSegmentIndex;
    }

    return hitCode;
  }

  /**
   * Clones a DOM element to a new document with optional xmlns handling
   * @param element - The source DOM element to clone
   * @param ignoreXmlns - Whether to ignore xmlns attributes
   * @returns A cloned DOM element in the new document
   */
  static CloneToDoc(element, ignoreXmlns) {
    const newElement = document.createElementNS(element.namespaceURI, element.nodeName);

    for (let i = 0, attributeCount = element.attributes.length; i < attributeCount; ++i) {
      const attribute = element.attributes[i];
      let attributeName = attribute.nodeName;

      if (attributeName.length) {
        if (attributeName[0] >= 'A' && attributeName[0] <= 'Z') {
          attributeName = attributeName.toLowerCase();
        }

        if (ignoreXmlns) {
          if (attribute.nodeValue !== '' && attributeName !== 'xmlns') {
            newElement.setAttribute(attributeName, attribute.nodeValue);
          }
        } else {
          if (attribute.nodeValue !== '') {
            newElement.setAttribute(attributeName, attribute.nodeValue);
          }
        }
      }
    }

    for (let i = 0, childCount = element.childNodes.length; i < childCount; ++i) {
      const childNode = element.childNodes[i];
      if (childNode.nodeType === 1) {
        newElement.insertBefore(this.CloneToDoc(childNode, ignoreXmlns), null);
      } else {
        newElement.insertBefore(document.createTextNode(childNode.nodeValue), null);
      }
    }

    return newElement;
  }

  /**
   * Converts an XML element to string representation
   * @param xmlElement - The XML element to convert
   * @returns The string representation of the XML element
   */
  static XML2Str(xmlElement) {
    try {
      return (new XMLSerializer()).serializeToString(xmlElement);
    } catch (error) {
      try {
        return xmlElement.xml;
      } catch (innerError) {
        throw innerError;
      }
    }
  }

  /**
   * Escapes special characters in a string for use in regular expressions
   * @param inputString - The string to escape
   * @returns The escaped string safe for regex usage
   */
  static StrEscapeRegExp(inputString) {
    return inputString.replace(/([.*+?\^=!:${}()|\[\]\/\\])/g, '\\$1');
  }

  /**
   * Replaces all occurrences of a pattern in a string
   * @param pattern - The pattern to search for
   * @param replacement - The replacement string
   * @param inputString - The string to perform replacements in
   * @returns The resulting string after all replacements
   */
  static StrReplaceAll(pattern, replacement, inputString) {
    return inputString.replace(new RegExp(this.StrEscapeRegExp(pattern), 'g'), replacement);
  }

  /**
   * Rotates points around a specified center point
   * @param center - The center point coordinates {x, y}
   * @param angle - The rotation angle in radians
   * @param points - Array of points to rotate
   */
  static RotatePointsAboutPoint(center, angle, points) {
    if (angle === 0) return;

    const sinAngle = Math.sin(angle);
    const cosAngle = Math.cos(angle);

    const adjustedCosAngle = Math.abs(cosAngle) < 0.0001 ? 0 : cosAngle;
    const adjustedSinAngle = Math.abs(sinAngle) < 0.0001 ? 0 : sinAngle;

    for (let i = 0; i < points.length; i++) {
      const dx = points[i].x - center.x;
      const dy = points[i].y - center.y;

      points[i].x = dx * adjustedCosAngle + dy * adjustedSinAngle + center.x;
      points[i].y = -dx * adjustedSinAngle + dy * adjustedCosAngle + center.y;
    }
  }

  /**
   * Rotates points around the center of a frame
   * @param frame - The frame object with x, y, width and height properties
   * @param angle - The rotation angle in radians
   * @param points - Array of points to rotate
   */
  static RotatePointsAboutCenter(frame, angle, points) {
    if (angle === 0) return;

    const center = {
      x: (frame.x + frame.x + frame.width) / 2,
      y: (frame.y + frame.y + frame.height) / 2
    };

    Utils3.RotatePointsAboutPoint(center, angle, points);
  }

  /**
   * Determines the modifier keys pressed in a keyboard event
   * @param event - The keyboard event object
   * @returns The modifier key combination from ModifierKeys enum
   */
  static GetModifierKeys(event) {
    let modifierKey = KeyboardConstant.ModifierKeys.None;

    if (event.ctrlKey || event.metaKey) {
      modifierKey = KeyboardConstant.ModifierKeys.Ctrl;
      if (event.shiftKey) {
        modifierKey = KeyboardConstant.ModifierKeys.Ctrl_Shift;
      } else if (event.altKey) {
        modifierKey = KeyboardConstant.ModifierKeys.Ctrl_Alt;
      }
    } else if (event.shiftKey) {
      modifierKey = KeyboardConstant.ModifierKeys.Shift;
      if (event.altKey) {
        modifierKey = KeyboardConstant.ModifierKeys.Shift_Alt;
      }
    } else if (event.altKey) {
      modifierKey = KeyboardConstant.ModifierKeys.Alt;
    }

    return modifierKey;
  }

  /**
   * Finds or creates a style object with the given name
   * @param name - The name of the style to find
   * @returns A QuickStyle object
   */
  static FindStyle(name) {
    return new QuickStyle();
  }

  /**
   * Generates a short unique ID consisting of 16 hexadecimal characters
   * @returns A 16-character hexadecimal string
   */
  static MakeShortUniqueID() {
    const template = "aaaaaaaaaaaaaaaa";
    return template.replace(/a/g, () => {
      const randomValue = Math.floor(16 * Math.random());
      return randomValue.toString(16);
    });
  }
}

export default Utils3
