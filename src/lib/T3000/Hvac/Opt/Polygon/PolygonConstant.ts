

/**
  * Class that defines constants related to polygon and shape operations
  */
class PolygonConstant {

  /**
   * Enumeration of shape types used in the system
   * Each value represents a specific shape for rendering and processing
   */
  static ShapeTypes = {
    // Document and media shapes
    PHOTO: -2,
    TABLE: -1,
    TEXT: 0,
    IMAGE: 1,
    DOCUMENT: 7,

    // Basic geometric shapes
    RECTANGLE: 2,
    ROUNDED_RECTANGLE: 3,
    OVAL: 4,
    CIRCLE: 9,
    DIAMOND: 6,
    TRIANGLE: 14,
    TRIANGLE_BOTTOM: 15,
    PARALLELOGRAM: 5,
    TRAPEZOID: 17,
    TRAPEZOID_BOTTOM: 18,
    OCTAGON: 19,
    HEXAGON: 21,
    PENTAGON: 22,
    PENTAGON_LEFT: 23,
    POLYGON: 26,

    // Functional shapes
    TERMINAL: 8,
    INPUT: 16,
    STORAGE: 20,
    DELAY: 24,
    DISPLAY: 25,

    // Arrow shapes
    ARROW_RIGHT: 10,
    ARROW_LEFT: 11,
    ARROW_TOP: 12,
    ARROW_BOTTOM: 13,

    // Measurement shapes
    MEASURE_AREA: 27,

    // Reference constant for the last shape type
    LAST_SHAPE: 27
  }
}

export default PolygonConstant
