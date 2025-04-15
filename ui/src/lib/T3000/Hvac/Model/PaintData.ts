
import { Type } from 'class-transformer'
import 'reflect-metadata'
import TextureScale from './TextureScale'
import NvConstant from '../Data/Constant/NvConstant'

/**
 * Represents the paint configuration data used in the HVAC model.
 *
 * This class encapsulates properties that define the characteristics of the paint,
 * such as color, opacity, texture, and gradient information. These properties can be
 * used to render visual elements with specific aesthetic attributes.
 *
 * @remarks
 * - The FillType determines the mechanism used to fill a shape, with a default of a solid fill.
 * - The Color property stores the primary color code as a string.
 * - The EndColor is used for situations such as gradient fills, with a default to white.
 * - The GradientFlags control specific gradient properties or behaviors.
 * - The Texture property holds an identifier or index for the texture to be applied.
 * - The TextureScale property contains scaling details and uses a type-conversion decorator.
 * - The Opacity and EndOpacity depict the transparency levels for the start and end of a gradient.
 *
 * @example
 * Here's how to create a new instance of PaintData:
 *
 * ```typescript
 * // Create PaintData instance with a given color (e.g., red)
 * const paintData = new PaintData('#FF0000');
 *
 * // Accessing properties
 * console.log(paintData.Color);         // Expected output: "#FF0000"
 * console.log(paintData.Opacity);       // Expected output: 1 (default opacity)
 * console.log(paintData.TextureScale);  // An instance of TextureScale with default values
 * ```
 *
 * @public
 */
class PaintData {

  public FillType: number;
  public Color: string;
  public EndColor: string;
  public GradientFlags: number;
  public Texture: number;

  @Type(() => TextureScale)
  public TextureScale: TextureScale;

  public Opacity: number;
  public EndOpacity: number;

  constructor(color: string) {

    this.FillType = NvConstant.FillTypes.Solid;
    this.Color = color;
    this.EndColor = NvConstant.Colors.White;
    this.GradientFlags = 0;
    this.Texture = 0;
    this.TextureScale = new TextureScale();
    this.Opacity = 1;
    this.EndOpacity = 1;

  }
}

export default PaintData
