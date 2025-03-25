

/**
 * Constants for HVAC tool types used in the application
 */
class ToolConstant {

  /**
   * Enum representing different tool types available in the HVAC editor
   * Each tool has a specific numeric identifier
   */
  static Tools = {
    /** Tool for symbol operations (-1) */
    Symbol: -1,
    /** Tool for selection operations (0) */
    Select: 0,
    /** Tool for creating and manipulating shapes (1) */
    Shape: 1,
    /** Tool for drawing lines (2) */
    Line: 2,
    /** Tool for adding text elements (3) */
    Text: 3,
    /** Tool for creating wall elements (4) */
    Wall: 4,
    /** Tool for drawing styled/formatted lines (5) */
    StyledLine: 5
  }
}

export default ToolConstant
