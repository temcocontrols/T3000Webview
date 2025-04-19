

/**
 * Constants for HVAC tool types used in the application
 */
class ToolConstant {

  /**
   * Enum representing different tool types available in the HVAC editor
   * Each tool has a specific numeric identifier
   */
  static Tools = {
    Symbol: -1,    //symbol operations (-1)
    Select: 0,     //selection operations (0)
    Shape: 1,      //creating and manipulating shapes (1)
    Line: 2,       //drawing lines (2)
    Text: 3,       //adding text elements (3)
    Wall: 4,       //creating wall elements (4)
    StyledLine: 5  //drawing styled/formatted lines (5)
  }
}

export default ToolConstant
