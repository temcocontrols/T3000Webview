/**
 * Class containing constants used throughout the T3000 application
 */
class T3Constant {
  /**
   * Constants defining different cursor display states
   * @property None - No cursor is displayed
   * @property Show - Cursor is visible
   * @property Hide - Cursor is explicitly hidden
   */
  static CursorDisplayMode = {
    None: 0,
    Show: 1,
    Hide: 2
  }

  /**
   * Document context settings that control text behavior and user interaction
   * @property CurrentTextAlignment - Text alignment setting (center, left, right)
   * @property SpacebarDown - Tracks if spacebar is currently pressed
   * @property CanTypeInWorkArea - Controls if typing is permitted in the work area
   */
  static DocContext = {
    CurrentTextAlignment: 'center',
    SpacebarDown: false,
    CanTypeInWorkArea: true,
  }

  /**
   * Clipboard content type identifiers
   * @property None - No clipboard content
   * @property Text - Text content in clipboard
   * @property LM - LM content type (specific to application)
   * @property Image - Image content in clipboard
   */
  static ClipboardType = {
    None: 0,
    Text: 1,
    LM: 2,
    Image: 4
  }

  /**
   * Gradient style configuration flags
   * @property GradMiddle - Middle gradient
   * @property GradHoriz - Horizontal gradient
   * @property GradVert - Vertical gradient
   * @property GradTlbr - Top-left to bottom-right diagonal gradient
   * @property GradTrbl - Top-right to bottom-left diagonal gradient
   * @property GradRev - Reversed gradient
   * @property GradShape - Shape-based gradient
   * @property GradRadial - Radial/circular gradient
   */
  static GradientStyle = {
    GradMiddle: 1,
    GradHoriz: 4,
    GradVert: 2,
    GradTlbr: 8,
    GradTrbl: 16,
    GradRev: 32,
    GradShape: 64,
    GradRadial: 128
  }
}

export default T3Constant
