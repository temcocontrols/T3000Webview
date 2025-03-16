

import Utils2 from "../../Util/Utils2"
import Point from "../../Model/Point"

class PolygonUtil {

  constructor() { }

  /**
   * Generates a parallelogram shaped polygon
   * @param dimensions - The width and height of the shape
   * @param offsetSize - The offset size for the shape (normalized by width)
   * @returns Array of points defining the polygon
   */
  static generateParallelogram(dimensions, offsetSize) {
    let offset = offsetSize / dimensions.width;
    if (offset > 1) {
      offset = 1;
    }

    return [
      { x: offset, y: 0 },
      { x: 1, y: 0 },
      { x: 1 - offset, y: 1 },
      { x: 0, y: 1 },
      { x: offset, y: 0 }
    ];
  }

  /**
   * Generates a diamond shaped polygon
   * @param dimensions - The width and height of the shape
   * @param _ - Unused parameter (kept for API consistency)
   * @returns Array of points defining the polygon
   */
  static generateDiamond(dimensions, _) {
    return [
      { x: 0.5, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 1 },
      { x: 0, y: 0.5 },
      { x: 0.5, y: 0 }
    ];
  }

  /**
   * Generates a document shaped polygon with curved corner
   * @param dimensions - The width and height of the shape
   * @param cornerSize - The size of the corner curve
   * @returns Array of points defining the polygon
   */
  static generateDocument(dimensions, cornerSize) {
    const points = [];
    const width = dimensions.width;
    const height = dimensions.height;
    const cornerOffset = cornerSize;

    points.push({ x: 0, y: (height - cornerOffset) / height });
    points.push({ x: 0, y: (height - cornerOffset) / height });

    // Allocate enough space for all points
    points.length = 85;
    points[84] = { x: 0, y: (height - cornerOffset) / height };
    points[1] = { x: 0, y: 0 };
    points[2] = { x: 1, y: 0 };
    points[3] = { x: 1, y: (height - cornerOffset - 0) / height };

    // Generate upper curve
    const quarterWidth = width / 4;
    const cornerRadius = cornerOffset;
    const stepSize = 2 * quarterWidth / 40;

    for (let i = 1; i <= 40; i++) {
      let offset = stepSize * i;
      let x = width - offset;
      let ratio = (quarterWidth - offset) / quarterWidth;
      let y = height - cornerOffset - 0 - Math.sqrt(1 - ratio * ratio) * cornerRadius;
      points[i + 3] = { x: x / width, y: y / height };
    }

    // Generate lower curve
    for (let i = 1; i <= 40; i++) {
      let offset = stepSize * i;
      let x = width - (offset + 2 * quarterWidth);
      let ratio = (quarterWidth - offset) / quarterWidth;
      let y = height - cornerOffset + Math.sqrt(1 - ratio * ratio) * cornerRadius;
      points[i + 43] = { x: x / width, y: y / height };
    }

    return points;
  }

  /**
   * Generates a terminal shaped polygon
   * @param dimensions - The width and height of the shape
   * @param cornerSize - The size of the corners
   * @returns Array of points defining the polygon
   */
  static generateTerminal(dimensions, cornerSize) {
    let points = [];
    const width = dimensions.width;
    const height = dimensions.height;
    let radius;
    let rect;

    radius = Math.floor(height / 2);
    if (radius > width / 2) {
      radius = Math.floor(width / 2);
    }

    // Top-left curve
    rect = { left: 0, top: 0, right: radius, bottom: 2 * radius };
    points = Utils2.PolyYCurve(points, rect, 40, 0, 0, 0, radius, true, width, height);

    // Bottom-left curve
    rect = { left: 0, top: height - 2 * radius, right: radius, bottom: height };
    points = Utils2.PolyYCurve(points, rect, 40, 0, 0, radius, 0, true, width, height);

    // Bottom-right curve
    rect = { left: width - radius, top: height, right: width, bottom: height - 2 * radius };
    points = Utils2.PolyYCurve(points, rect, 40, 0, 0, 0, -radius, false, width, height);

    // Top-right curve
    rect = { left: width - radius, top: 2 * radius, right: width, bottom: 0 };
    points = Utils2.PolyYCurve(points, rect, 40, 0, 0, -radius, 0, false, width, height);

    // Close the polygon
    points.push(new Point(points[0].x, points[0].y));
    return points;
  }

  /**
   * Generates a right-pointing arrow shape
   * @param dimensions - The width and height of the shape
   * @param headSize - The size of the arrow head
   * @returns Array of points defining the polygon
   */
  static generateRightArrow(dimensions, headSize) {
    let arrowHead = headSize / dimensions.width;
    if (arrowHead > 1) {
      arrowHead = 1;
    }

    return [
      { x: 0, y: 0.15 },
      { x: 1 - arrowHead, y: 0.15 },
      { x: 1 - arrowHead, y: 0 },
      { x: 1, y: 0.5 },
      { x: 1 - arrowHead, y: 1 },
      { x: 1 - arrowHead, y: 0.85 },
      { x: 0, y: 0.85 },
      { x: 0, y: 0.15 }
    ];
  }

  /**
   * Generates a left-pointing arrow shape
   * @param dimensions - The width and height of the shape
   * @param headSize - The size of the arrow head
   * @returns Array of points defining the polygon
   */
  static generateLeftArrow(dimensions, headSize) {
    let arrowHead = headSize / dimensions.width;
    if (arrowHead > 1) {
      arrowHead = 1;
    }

    return [
      { x: 0, y: 0.5 },
      { x: arrowHead, y: 0 },
      { x: arrowHead, y: 0.15 },
      { x: 1, y: 0.15 },
      { x: 1, y: 0.85 },
      { x: arrowHead, y: 0.85 },
      { x: arrowHead, y: 1 },
      { x: 0, y: 0.5 }
    ];
  }

  /**
   * Generates a top-pointing arrow shape
   * @param dimensions - The width and height of the shape
   * @param headSize - The size of the arrow head
   * @returns Array of points defining the polygon
   */
  static generateTopArrow(dimensions, headSize) {
    let arrowHead = headSize / dimensions.height;
    if (arrowHead > 1) {
      arrowHead = 1;
    }

    return [
      { x: 0.5, y: 0 },
      { x: 0, y: arrowHead },
      { x: 0.15, y: arrowHead },
      { x: 0.15, y: 1 },
      { x: 0.85, y: 1 },
      { x: 0.85, y: arrowHead },
      { x: 1, y: arrowHead },
      { x: 0.5, y: 0 }
    ];
  }

  /**
   * Generates a bottom-pointing arrow shape
   * @param dimensions - The width and height of the shape
   * @param headSize - The size of the arrow head
   * @returns Array of points defining the polygon
   */
  static generateBottomArrow(dimensions, headSize) {
    let arrowHead = headSize / dimensions.height;
    if (arrowHead > 1) {
      arrowHead = 1;
    }

    return [
      { x: 0.15, y: 0 },
      { x: 0.15, y: 1 - arrowHead },
      { x: 0, y: 1 - arrowHead },
      { x: 0.5, y: 1 },
      { x: 1, y: 1 - arrowHead },
      { x: 0.85, y: 1 - arrowHead },
      { x: 0.85, y: 0 },
      { x: 0.15, y: 0 }
    ];
  }

  /**
   * Generates a triangular shape (pointing up)
   * @param dimensions - The width and height of the shape
   * @param _ - Unused parameter (kept for API consistency)
   * @returns Array of points defining the polygon
   */
  static generateTriangle(dimensions, _) {
    return [
      { x: 0.5, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 0.5, y: 0 }
    ];
  }

  /**
   * Generates a triangular shape (pointing down)
   * @param dimensions - The width and height of the shape
   * @param _ - Unused parameter (kept for API consistency)
   * @returns Array of points defining the polygon
   */
  static generateTriangleDown(dimensions, _) {
    return [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: 1 },
      { x: 0, y: 0 }
    ];
  }

  /**
   * Generates an input shape (angled at top-left)
   * @param dimensions - The width and height of the shape
   * @param cornerSize - The size of the corner
   * @returns Array of points defining the polygon
   */
  static generateInput(dimensions, cornerSize) {
    let corner = cornerSize / dimensions.height;
    if (corner > 1) {
      corner = 1;
    }

    return [
      { x: 0, y: corner },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 0, y: corner }
    ];
  }

  /**
   * Generates a trapezoid shape (wide at top)
   * @param dimensions - The width and height of the shape
   * @param offsetSize - The offset for the trapezoid sides
   * @returns Array of points defining the polygon
   */
  static generateTrapezoid(dimensions, offsetSize) {
    let offset = offsetSize / dimensions.width;
    if (offset > 0.5) {
      offset = 0.5;
    }

    return [
      { x: offset, y: 0 },
      { x: 1 - offset, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: offset, y: 0 }
    ];
  }

  /**
   * Generates a trapezoid shape (wide at bottom)
   * @param dimensions - The width and height of the shape
   * @param offsetSize - The offset for the trapezoid sides
   * @returns Array of points defining the polygon
   */
  static generateTrapezoidDown(dimensions, offsetSize) {
    let offset = offsetSize / dimensions.width;
    if (offset > 0.5) {
      offset = 0.5;
    }

    return [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1 - offset, y: 1 },
      { x: offset, y: 1 },
      { x: 0, y: 0 }
    ];
  }

  /**
   * Generates an octagon shape
   * @param dimensions - The width and height of the shape
   * @param horizontalOffset - The horizontal offset for the octagon sides
   * @param verticalOffset - The vertical offset for the octagon sides
   * @returns Array of points defining the polygon
   */
  static generateOctagon(dimensions, horizontalOffset, verticalOffset) {
    return [
      { x: horizontalOffset, y: 0 },
      { x: 1 - horizontalOffset, y: 0 },
      { x: 1, y: verticalOffset },
      { x: 1, y: 1 - verticalOffset },
      { x: 1 - horizontalOffset, y: 1 },
      { x: horizontalOffset, y: 1 },
      { x: 0, y: 1 - verticalOffset },
      { x: 0, y: verticalOffset },
      { x: horizontalOffset, y: 0 }
    ];
  }

  /**
   * Generates a storage shape with curved sides
   * @param dimensions - The width and height of the shape
   * @param curveWidth - The width of the curve
   * @param cornerSize - The size of the corner (not used in current implementation)
   * @returns Array of points defining the polygon
   */
  static generateStorage(dimensions, curveWidth, cornerSize) {
    let points = [];
    const width = dimensions.width;
    const height = dimensions.height;
    const curveSize = curveWidth;

    // Start point
    const startPoint = { x: curveSize / width, y: 1 };
    points.push(startPoint);

    // Define left curve region
    let rect = { left: 0, top: 0, right: curveSize, bottom: height };

    // Prepare array with required length
    points.length = 42;

    // Generate left curve
    points = Utils2.PolyYCurve(points, rect, 40, 0, 0, 0, 0, true, width, height);

    // Mirror points for right side
    for (let i = 0; i < 40; i++) {
      points[40 - i] = points[42 + i];
    }

    points[41] = { x: curveSize / width, y: 0 };
    points[42] = { x: 1, y: 0 };

    // Define right curve region
    rect = { left: width - curveSize, top: 0, right: width, bottom: height };

    if (curveSize) {
      rect.left -= 0;
      rect.right -= 0;
      points.length = 43;
      points = Utils2.PolyYCurve(points, rect, 40, 0, 0, 0, 0, true, width, height);
      points.push({ x: 1, y: 1 });
    } else {
      rect.top += 0;
      rect.bottom -= 0;
      points = Utils2.PolyYCurve(points, rect, 40, 0, 0, 0, 0, true, width, height);
      points.push({ x: 1, y: (height - 0) / height });
      points.push({ x: 1, y: 1 });
    }

    return points;
  }

  /**
   * Generates a hexagon shape
   * @param dimensions - The width and height of the shape
   * @param offsetSize - The offset for the hexagon sides
   * @returns Array of points defining the polygon
   */
  static generateHexagon(dimensions, offsetSize) {
    let offset = offsetSize / dimensions.width;
    if (offset > 0.5) {
      offset = 0.5;
    }

    return [
      { x: offset, y: 0 },
      { x: 1 - offset, y: 0 },
      { x: 1, y: 0.5 },
      { x: 1 - offset, y: 1 },
      { x: offset, y: 1 },
      { x: 0, y: 0.5 },
      { x: offset, y: 0 }
    ];
  }

  /**
   * Generates a pentagon shape (pointing up)
   * @param dimensions - The width and height of the shape
   * @param topHeight - The height of the top part
   * @returns Array of points defining the polygon
   */
  static generatePentagon(dimensions, topHeight) {
    let top = topHeight / dimensions.height;
    if (top > 1) {
      top = 1;
    }

    return [
      { x: 0, y: 1 - top },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 - top },
      { x: 0.5, y: 1 },
      { x: 0, y: 1 - top }
    ];
  }

  /**
   * Generates a pentagon shape (pointing left)
   * @param dimensions - The width and height of the shape
   * @param leftWidth - The width of the left part
   * @returns Array of points defining the polygon
   */
  static generatePentagonLeft(dimensions, leftWidth) {
    let left = leftWidth / dimensions.width;
    if (left > 1) {
      left = 1;
    }

    return [
      { x: left, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: left, y: 1 },
      { x: 0, y: 0.5 },
      { x: left, y: 0 }
    ];
  }

  /**
   * Generates a delay shape with curved right side
   * @param dimensions - The width and height of the shape
   * @param curveWidth - The width of the curve
   * @returns Array of points defining the polygon
   */
  static generateDelay(dimensions, curveWidth) {
    let points = [];
    const width = dimensions.width;
    const height = dimensions.height;
    const curveSize = curveWidth;

    points[0] = { x: 0, y: 1 };
    points[1] = { x: 0, y: 0 };
    points[2] = { x: (width - curveSize) / width, y: 0 };

    const rect = { left: width - curveSize, top: 0, right: width, bottom: height };

    points = Utils2.PolyYCurve(points, rect, 80, 0, 0, 0, 0, false, width, height);
    points.push({ x: (width - curveSize) / width, y: 1 });

    return points;
  }

  /**
   * Generates a display shape with curved sides
   * @param dimensions - The width and height of the shape
   * @param curveWidth - The width of the curves
   * @returns Array of points defining the polygon
   */
  static generateDisplay(dimensions, curveWidth) {
    let points = [];
    const width = dimensions.width;
    const height = dimensions.height;
    const curveSize = curveWidth;

    points[0] = { x: curveSize / width, y: 1 };
    points[1] = { x: 0, y: 0.5 };
    points[2] = { x: curveSize / width, y: 0 };
    points[3] = { x: (width - curveSize) / width, y: 0 };

    const rect = { left: width - curveSize, top: 0, right: width, bottom: height };

    points = Utils2.PolyYCurve(points, rect, 80, 0, 0, 0, 0, false, width, height);
    points.push({ x: (width - curveSize) / width, y: 1 });
    points.push({ x: curveSize / width, y: 1 });

    return points;
  }
}

export default PolygonUtil
