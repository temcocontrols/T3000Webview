
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

  /**
   * Defines visual effect types and their properties
   * @property DROPSHADOW - Creates a shadow effect behind an element
   * @property CASTSHADOW - Creates a projected shadow effect
   * @property GLOW - Creates a glowing effect around an element
   * @property REFLECT - Creates a reflection effect
   * @property BEVEL - Creates a beveled edge effect within an element
   * @property GLOSS - Creates a glossy finish effect within an element
   * @property INNERGLOW - Creates a glowing effect inside an element
   * @property INNERSHADOW - Creates a shadow effect inside an element
   * @property RECOLOR - Applies color transformation within an element
   */
  static EffectType = {
    DROPSHADOW: {
      id: 'SHD',
      outside: true
    },
    CASTSHADOW: {
      id: 'SHC',
      outside: true
    },
    GLOW: {
      id: 'GLW',
      outside: true
    },
    REFLECT: {
      id: 'REFL',
      outside: true
    },
    BEVEL: {
      id: 'BVL',
      inside: true
    },
    GLOSS: {
      id: 'GLOSS',
      inside: true
    },
    INNERGLOW: {
      id: 'IGLW',
      inside: true
    },
    INNERSHADOW: {
      id: 'ISHD',
      inside: true
    },
    RECOLOR: {
      id: 'RCLR',
      inside: true
    }
  }

  /**
   * Defines directional options for filter and effect applications
   * @property LEFT - Direction from left
   * @property LEFTTOP - Direction from left top corner
   * @property TOP - Direction from top
   * @property RIGHTTOP - Direction from right top corner
   * @property RIGHT - Direction from right
   * @property RIGHTBOTTOM - Direction from right bottom corner
   * @property BOTTOM - Direction from bottom
   * @property LEFTBOTTOM - Direction from left bottom corner
   * @property CENTER - Direction from center
   */
  static FilterDirection = {
    LEFT: 'L',
    LEFTTOP: 'LT',
    TOP: 'T',
    RIGHTTOP: 'RT',
    RIGHT: 'R',
    RIGHTBOTTOM: 'RB',
    BOTTOM: 'B',
    LEFTBOTTOM: 'LB',
    CENTER: 'C'
  }

  /**
   * Defines bevel effect types for edge treatments
   * @property HARD - Sharp, defined bevel edge
   * @property SOFT - Smooth, gradual bevel edge
   * @property BUMP - Embossed or raised bevel effect
   */
  static BevelType = {
    HARD: 'H',
    SOFT: 'S',
    BUMP: 'B'
  }

  /**
   * Defines gloss effect types for surface finishes
   * @property HARD - Distinct, polished gloss finish
   * @property SOFT - Subtle, diffused gloss finish
   */
  static GlossType = {
    HARD: 'H',
    SOFT: 'S'
  }

  /**
   * Defines size presets for visual effects with percentage values
   * @property DEFAULT - Default effect size (10% of element size)
   * @property SMALL - Small effect size (5% of element size)
   * @property MEDIUM - Medium effect size (25% of element size)
   * @property LARGE - Large effect size (10% of element size)
   * @property GIANT - Very large effect size (5% of element size)
   */
  static EffectSize = {
    DEFAULT: {
      id: 'D',
      percentage: 0.1
    },
    SMALL: {
      id: 'S',
      percentage: 0.05
    },
    MEDIUM: {
      id: 'M',
      percentage: 0.25
    },
    LARGE: {
      id: 'L',
      percentage: 0.1
    },
    GIANT: {
      id: 'G',
      percentage: 0.05
    }
  }
}

export default BConstant
