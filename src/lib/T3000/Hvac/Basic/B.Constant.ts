
class BConstant {

  /**
   * Defines gradient style types for visual elements
   * @property Linear - Linear gradient style
   * @property Radial - Radial gradient style
   * @property Radialfill - Radial fill gradient style
   */
  static GradientStyle = {
    Linear: 'linear',
    Radial: 'radial',
    Radialfill: 'radialfill'
  }

  /**
   * Defines gradient position options for element styling
   * @property LeftTop - Position at the left top
   * @property Top - Position at the top center
   * @property RightTop - Position at the right top
   * @property Right - Position at the right center
   * @property RightBottom - Position at the right bottom
   * @property Bottom - Position at the bottom center
   * @property LeftBottom - Position at the left bottom
   * @property Left - Position at the left center
   * @property Center - Position at the center
   */
  static GradientPos = {
    LeftTop: 'ltop',
    Top: 'top',
    RightTop: 'rtop',
    Right: 'right',
    RightBottom: 'rbottom',
    Bottom: 'bottom',
    LeftBottom: 'lbottom',
    Left: 'left',
    Center: 'center'
  }

  /**
   * Defines placeholder tokens used in styling templates
   * @property FillColor - Placeholder for fill color
   * @property EndColor - Placeholder for gradient end color
   * @property FillTrans - Placeholder for fill transparency
   * @property LineColor - Placeholder for line color
   * @property LineTrans - Placeholder for line transparency
   * @property LineThick - Placeholder for line thickness
   * @property SolidFill - Placeholder for solid fill color
   * @property Terminator - Symbol indicating end of placeholder
   */
  static Placeholder = {
    FillColor: '##FillColor',
    EndColor: '##EndColor',
    FillTrans: '##FillTrans',
    LineColor: '##LineColor',
    LineTrans: '##LineTrans',
    LineThick: '##LineThick',
    SolidFill: '##SolidFill',
    Terminator: '##'
  }

  /**
   * Default values for styling placeholders
   * @property ##FillColor - Default fill color (white)
   * @property ##EndColor - Default end color for gradients (white)
   * @property ##FillTrans - Default fill transparency (fully opaque)
   * @property ##LineColor - Default line color (black)
   * @property ##LineTrans - Default line transparency (fully opaque)
   * @property ##LineThick - Default line thickness (1 pixel)
   * @property ##SolidFill - Default solid fill color (black)
   */
  static PlaceholderDefault = {
    '##FillColor': '#FFFFFF',
    '##EndColor': '#FFFFFF',
    '##FillTrans': 1,
    '##LineColor': '#000',
    '##LineTrans': 1,
    '##LineThick': 1,
    '##SolidFill': '#000'
  }
}

export default BConstant
