

class TextConstant {

  /**
   * Defines text styling face options for text elements
   * Each value represents a binary flag that can be combined
   */
  static TextFace = {
    Bold: 1,
    Italic: 2,
    Underline: 4,
    Superscript: 16,
    Subscript: 32,
    Strikethrough: 64
  }

  /**
   * Defines text flags for special text behaviors
   */
  static TextFlags = {
    TenFBadSpell: 32
  }

  /**
   * Defines numeric codes for different text style properties
   * Used for internal style management
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
   * Defines justification values for text alignment
   * Values can be combined for horizontal and vertical alignment
   */
  static TextJust = {
    Left: 0,
    Right: 2,
    Center: 6,
    Top: 0,
    Bottom: 8
  }

  /**
   * Defines text alignment options using semantic string values
   * For positioning text within containers
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
   * Defines texture alignment options for positioning textures
   * Values represent the 9 possible alignment positions
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
