

/**
  * Class that defines constants related to polygon and shape operations
  */
class PolygonConstant {

  // static ShapeTypes = {
  //   SED_S_Photo: - 2,
  //   SED_S_Table: - 1,
  //   SED_S_Text: 0,
  //   SED_S_Image: 1,
  //   SED_S_Rect: 2,
  //   SED_S_RRect: 3,
  //   SED_S_Oval: 4,
  //   SED_S_Pgm: 5,
  //   SED_S_Diam: 6,
  //   SED_S_Doc: 7,
  //   SED_S_Term: 8,
  //   SED_S_Circ: 9,
  //   SED_S_ArrR: 10,
  //   SED_S_ArrL: 11,
  //   SED_S_ArrT: 12,
  //   SED_S_ArrB: 13,
  //   SED_S_Tri: 14,
  //   SED_S_TriB: 15,
  //   SED_S_Input: 16,
  //   SED_S_Trap: 17,
  //   SED_S_TrapB: 18,
  //   SED_S_Oct: 19,
  //   SED_S_Store: 20,
  //   SED_S_Hex: 21,
  //   SED_S_Pent: 22,
  //   SED_S_PentL: 23,
  //   SED_S_Delay: 24,
  //   SED_S_Disp: 25,
  //   SED_S_Poly: 26,
  //   SED_S_MeasureArea: 27,
  //   SED_S_Last: 27
  // }

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
