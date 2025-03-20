
/**
 * Represents a collection of application-wide constants used to control UI behaviors,
 * document context, clipboard content types, and gradient styling.
 *
 * @remarks
 * The T3Constant class contains static objects grouped as follows:
 * - CursorDisplayMode: Defines the states for cursor visibility (none, shown, or hidden).
 * - DocContext: Contains settings for document interaction, such as text alignment and typing permissions.
 * - ClipboardType: Enumerates the types of content available in the clipboard (none, text, LM-specific, and image).
 * - GradientStyle: Provides bit flags for various gradient styles (middle, horizontal, vertical, diagonal, reversed, shape-based, and radial)
 *   which can be combined to define complex UI gradients.
 *
 * @example
 * An example demonstrating how these constants might be used in the application:
 *
 * // Set the cursor to be visible in the UI
 * const cursorMode = T3Constant.CursorDisplayMode.Show;
 * setCursorVisibility(cursorMode);
 *
 * // Check if the application allows typing in the designated work area
 * if (T3Constant.DocContext.CanTypeInWorkArea) {
 *   enableTyping();
 * }
 *
 * // Use the clipboard type to conditionally handle pasted text
 * if (clipboard.type === T3Constant.ClipboardType.Text) {
 *   processTextClipboard(clipboard.data);
 * }
 *
 * // Apply a radial gradient style to the background of an element
 * const gradient = T3Constant.GradientStyle.GradRadial;
 * applyGradientStyle(element, gradient);
 *
 * @public
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
