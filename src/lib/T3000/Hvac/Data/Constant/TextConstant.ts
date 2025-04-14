
/**
 * A collection of constant values used for text formatting and styling.
 *
 * This class aggregates various static properties that define the visual appearance and behavior of text,
 * including style flags, special flags, style and alignment codes, texture alignment, and default placeholder texts.
 *
 * The properties include:
 * - TextFace: Basic text style flags such as Bold, Italic, Underline, Superscript, Subscript, and Strike.
 * - TextFlags: Special flag values, for example to indicate spelling errors.
 * - TextStyleCodes: Numeric codes corresponding to different style attributes like font, size, color, etc.
 * - TextJust: Numeric codes for basic text justification and alignment (e.g. Left, Right, Center, Top, Bottom).
 * - TextAlign: More readable alignment options using string values (e.g. "top-left", "center", "bottom-right").
 * - TextureAlign: Numeric constants used to determine the alignment of textures relative to their containers.
 *
 * @remarks
 * These constants help maintain consistent text rendering across the application by providing a centralized definition
 * of styling options. They can be easily reused throughout the codebase to ensure uniformity of text presentation.
 *
 * @example
 * // Example: Using the constants for text formatting and placeholders:
 *
 * // Applying text face styles:
 * const boldStyle = TextConstant.TextFace.Bold;
 * const italicStyle = TextConstant.TextFace.Italic;
 *
 * // Retrieving style code for font and size:
 * const fontStyleCode = TextConstant.TextStyleCodes.Font;
 * const sizeStyleCode = TextConstant.TextStyleCodes.Size;
 *
 * // Using string-based text alignment:
 * const centeredAlignment = TextConstant.TextAlign.Center;
 *
 * @public
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
}

export default TextConstant
