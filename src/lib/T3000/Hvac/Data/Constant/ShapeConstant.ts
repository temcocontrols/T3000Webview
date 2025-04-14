

/**
 * Represents a collection of constants used as object type identifiers in a drawing system.
 *
 * This class holds a static property that maps descriptive names of shapes and curves
 * to their corresponding numeric identifiers. The identifiers are used throughout the system
 * to distinguish between different object types, such as standard shapes, directional lines,
 * segmented lines, arrays of objects, and various types of curves (e.g., bezier and spline curves).
 *
 * @remarks
 * - The `ObjectTypes` property contains values for a range of drawing elements, from basic shapes
 *   like `Shape` and `LineD` to more advanced curve representations like `Nurbs` and `Cubebez`.
 * - It is intended to provide a centralized set of constants that help ensure consistency in
 *   object type identification across the application.
 *
 * @example
 * Here's an example of how to use the `ShapeConstant` class:
 *
 * ```typescript
 * // Retrieve the identifier for a standard shape
 * const standardShapeType = ShapeConstant.ObjectTypes.Shape;
 *
 * // Use the identifier to check the type of an object in a drawing system
 * function handleShapeType(type: number): void {
 *   if (type === ShapeConstant.ObjectTypes.Freehand) {
 *     console.log('Processing a freehand drawing');
 *   } else {
 *     console.log('Processing a different type of shape');
 *   }
 * }
 *
 * handleShapeType(standardShapeType);
 * ```
 *
 * @beta
 */
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
