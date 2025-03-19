/**
 * Class containing constants related to text styling, alignment, and display
 * Used throughout the HVAC interface for text rendering and formatting
 */
class TextConstant {
  /**
   * Text face styles for basic formatting
   * Used to control the appearance of text
   */
  static TextFace = {
    Bold: 1,
    Italic: 2,
    Underline: 4,
    Superscript: 16,
    Subscript: 32,
    Strike: 64
  }

  /**
   * Text flags for special text behaviors
   * Currently only defines the bad spelling flag
   */
  static TextFlags = {
    BadSpell: 32
  }

  /**
   * Style code constants for text formatting
   * Used to identify different style properties in the text rendering system
   */
  static TextStyleCodes = {
    Font: 0,
    Size: 1,
    Face: 2,
    Flags: 3,
    Color: 4,
    StyleId: 5,
    Extra: 7,
    LinkId: 10,
    DataId: 11,
    PaintType: 20,
    SizeFloat: 25
  }

  /**
   * Text justification constants using numeric codes
   * Defines alignment options for positioning text
   */
  static TextJust = {
    Left: 0,
    Right: 2,
    Center: 6,
    Top: 0,
    Bottom: 8
  }

  /**
   * Text alignment options using string values
   * Provides more readable alignment options for modern interfaces
   */
  static TextAlign = {
    Left: 'left',
    Center: 'center',
    Right: 'right',
    TopLeft: 'top-left',
    TopCenter: 'top-center',
    TopRight: 'top-right',
    BottomLeft: 'bottom-left',
    BottomCenter: 'bottom-center',
    BottomRight: 'bottom-right'
  }

  /**
   * Texture alignment constants for positioning textures
   * Defines how textures are positioned relative to their containers
   */
  static TextureAlign = {
    TopLeft: 1,
    TopCenter: 2,
    TopRight: 3,
    CenterLeft: 4,
    Center: 5,
    CenterRight: 6,
    BottomLeft: 7,
    BottomCenter: 8,
    BottomRight: 9
  }

  /**
   * Default placeholder text strings
   * Used as initial values or placeholders in editable text fields
   */
  static ReplaceTextStrings = [
    ''
  ]
}

export default TextConstant
