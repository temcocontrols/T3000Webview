

class ShapeConstant {

  /**
  * Object type identifiers
  * Defines types of objects in the drawing system
  */
  static ObjectTypes = {
    Shape: 0,           // Standard shape
    LineD: 1,           // Directional line
    SegL: 2,            // Segmented line
    Array: 3,           // Array of objects
    PolyL: 4,           // Polyline
    Nurbs: 501,         // Non-uniform rational B-spline
    NurbsSeg: 502,      // NURBS segment
    Ellipse: 503,       // Ellipse
    EllipseEnd: 504,    // Ellipse endpoint
    Quadbez: 505,       // Quadratic bezier
    QuadbezCon: 506,    // Quadratic bezier connector
    Cubebez: 507,       // Cubic bezier
    CubebezCon: 508,    // Cubic bezier connector
    Spline: 509,        // Spline curve
    SplineCon: 510,     // Spline connector
    MoveTo: 600,        // Move to operation
    MoveToNewPoly: 601, // Move to start new polygon
    Freehand: 7         // Freehand drawing
  }
}

export default ShapeConstant
