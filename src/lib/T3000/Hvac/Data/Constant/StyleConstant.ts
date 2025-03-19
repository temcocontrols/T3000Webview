/**
 * Constants related to styling in the HVAC system
 */
class StyleConstant {
  /**
   * Color filter constants for styling elements
   * Controls which style attributes should be ignored
   */
  static ColorFilters = {
    NCFill: 1,         // Ignore fill color
    NCTexture: 2,      // Ignore texture
    NCLine: 4,         // Ignore line color
    NCLineThick: 8,    // Ignore line thickness
    NCLinePat: 16,     // Ignore line pattern
    NCLineArrow: 32,   // Ignore line arrow
    NCText: 64,        // Ignore text color
    NCOutSide: 128,    // Ignore outside color
    NCEffect: 256,     // Ignore effects
    NCStyle: 512,      // Ignore style
    NCAll: 1023,       // Ignore all color attributes
    NCResize: 1024     // Ignore resize attributes
  };

  /**
   * Fill effect types for element styling
   * Defines different interior effects that can be applied
   */
  static FillEffect = {
    None: 0,      // No fill effect
    Gloss: 1,     // Glossy effect
    Bevel: 2,     // Beveled effect
    InShadow: 3,  // Inner shadow effect
    InGlow: 4     // Inner glow effect
  };

  /**
   * Outline effect types for element styling
   * Defines different exterior effects that can be applied
   */
  static OutEffect = {
    None: 0,       // No outline effect
    Drop: 1,       // Drop shadow effect
    Cast: 2,       // Cast shadow effect
    Glow: 3,       // Glow effect
    Refl: 4        // Reflection effect
  };

  /**
   * Paragraph style codes for text formatting
   * Controls various aspects of paragraph formatting
   */
  static ParaStyleCodes = {
    Just: 100,            // Justification
    Spacing: 101,         // Spacing between paragraphs
    Leading: 102,         // Leading (space between lines)
    Tracking: 103,        // Tracking (space between letters)
    Lindent: 104,         // Left indent
    Rindent: 105,         // Right indent
    Pindent: 106,         // Paragraph indent
    Bindent: 107,         // Bottom indent
    Bullet: 108,          // Bullet style
    TabSpace: 109,        // Tab spacing
    Hyphen: 110           // Hyphenation
  };

  /**
   * Format painter modes for copying styles
   * Defines what type of formatting will be copied
   */
  static FormatPainterModes = {
    None: 0,                    // No format copying
    Object: 1,                  // Copy object formatting
    Text: 2,                    // Copy text formatting
    Table: 3                    // Copy table formatting
  };

  /**
   * Image directory identifiers
   * References to different image format directories
   */
  static ImageDir = {
    Meta: 113,              // Metadata directory
    Jpg: 124,               // JPEG images directory
    Png: 125,               // PNG images directory
    Svg: 143,               // SVG images directory
    Store: 123              // Storage directory
  };

  /**
   * Rich gradient types for advanced fill effects
   * Defines different gradient patterns and their focal points
   */
  static RichGradientTypes = {
    Linear: 0,       // Linear gradient
    BR: 1,           // Radial gradient focused at bottom right
    BL: 2,           // Radial gradient focused at bottom left
    RadialCenter: 3, // Radial gradient focused at center
    RadialBC: 4,     // Radial gradient focused at bottom center
    RadialTC: 5,     // Radial gradient focused at top center
    RadialTR: 6,     // Radial gradient focused at top right
    RadialTL: 7,     // Radial gradient focused at top left
    RectBR: 8,       // Rectangular gradient focused at bottom right
    RectBL: 9,       // Rectangular gradient focused at bottom left
    RectCenter: 10,  // Rectangular gradient focused at center
    RectTR: 11,      // Rectangular gradient focused at top right
    RectTL: 12,      // Rectangular gradient focused at top left
    Shape: 13        // Shape-based gradient
  };
}

export default StyleConstant
