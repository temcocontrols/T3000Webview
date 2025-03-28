

/**
 * DSConstant class containing application constants
 */
class DSConstant {
  /**
   * LinkFlags - Bit flags for link operations
   *
   * These flags represent different states or actions for links in the document system.
   *
   * Example usage:
   * ```
   * // Combining operations
   * const operations = DeleteTarget | Move; // Value: 17
   *
   * // Checking if a specific operation is part of the combined value
   * if (operations & DeleteTarget) {
   *   // Delete target operation is included
   * }
   * ```
   */
  static LinkFlags = {
    DeleteTarget: 1,   // Delete target operation  (00000001)
    DeleteLink: 2,     // Delete link operation    (00000010)
    Change: 4,         // Change link operation    (00000100)
    Break: 8,          // Break link operation     (00001000)
    Move: 16,          // Move link operation      (00010000)
    WasMoved: 32       // Flag indicating link was moved (00100000)
  }

  /**
   * Contexts - Different application contexts or modes
   *
   * These values represent different operational modes or areas within the application.
   */
  static Contexts = {
    None: -1,            // No specific context
    All: 0,              // All contexts
    Text: 1,             // Text editing context
    Table: 2,            // Table editing context
    Automation: 3,       // Automation context
    DimensionText: 4,    // Dimension text context
    FloorPlan: 5,        // Floor plan context
    Note: 6,             // Note context
    Navigation: 7,       // Navigation context
    AutomationNoCtrl: 8, // Automation context without control
    ReadOnly: 9          // Read-only context
  }

  /**
   * PolyListFlags - Bit flags for polygon/polyline operations
   *
   * These flags represent different states or properties for polygons and polylines in the drawing system.
   *
   * Example usage:
   * ```
   * const flags = PolyListFlags.FreeHand | PolyListFlags.NoControl; // Value: 17
   * if (flags & PolyListFlags.FreeHand) {
   *   // Handle freehand drawing mode
   * }
   * ```
   */
  static PolyListFlags = {
    FreeHand: 1,             // Freehand drawing mode       (00000001)
    OneStep: 2,              // One-step creation           (00000010)
    NoMiddleControlPoints: 4, // No middle control points    (00000100)
    TimelineControlPoint: 8, // Timeline control point      (00001000)
    NoControl: 16,           // No control elements         (00010000)
    WasExplict: 32,          // Was explicitly defined      (00100000)
    HasMoveTo: 64,           // Has move-to operations      (01000000)
    HasPolyPoly: 128         // Has nested polygons         (10000000)
  }

  /**
   * PolySegFlags - Bit flags for polygon segment properties
   *
   * These flags define the visual and behavioral attributes of polygon segments.
   *
   * Example usage:
   * ```
   * const segmentFlags = PolySegFlags.Select | PolySegFlags.NoFill; // Value: 129
   * if (segmentFlags & PolySegFlags.Select) {
   *   // Handle selected segment
   * }
   * ```
   */
  static PolySegFlags = {
    Select: 1,               // Segment is selected         (00000001)
    Hide: 2,                 // Segment is hidden           (00000010)
    Temp: 4,                 // Temporary segment           (00000100)
    TempSave: 8,             // Temporarily saved segment   (00001000)
    VA: 16,                  // Visual attribute enabled    (00010000)
    NVA: 32,                 // Non-visual attribute        (00100000)
    NoLine: 64,              // No outline/stroke           (01000000)
    NoFill: 128              // No fill for segment         (10000000)
  }
}

export default DSConstant
