
import { Type } from 'class-transformer'
import 'reflect-metadata'
import PaintData from './PaintData'
import OutsideEffectData from './OutsideEffectData'
import NvConstant from '../Data/Constant/NvConstant'

/**
 * Represents the formatting settings for display text in an HVAC control context.
 *
 * This class encapsulates configurable text attributes including font details such as name,
 * type, size, and identifier. Additionally, it contains styling information for text rendering,
 * including paint color settings and outside effects.
 *
 * Properties:
 * - Paint: An instance of PaintData used to specify the color and related painting properties.
 * - FontName: The name of the font used for rendering text (default is "Arial").
 * - FontType: The style or classification of the font (e.g., "sanserif").
 * - FontId: A numeric identifier for the font.
 * - FontSize: The size of the font in points.
 * - Face: Represents a font face attribute for additional style configuration.
 * - Effect: An instance of OutsideEffectData that holds extra text effects.
 *
 * Methods:
 * - SetPaint(paint: PaintData): Updates the Paint property with a new PaintData instance.
 *
 * @example
 * // Create a new instance of TextFmtData with the default settings
 * const textFormat = new TextFmtData();
 *
 * // Create a custom PaintData instance (assuming PaintData and NvConstant are properly defined)
 * const customPaint = new PaintData(NvConstant.Colors.Red);
 *
 * // Set the new paint on the text format instance
 * textFormat.SetPaint(customPaint);
 *
 * // Output the configured text format data
 * console.log(textFormat);
 */
class TextFmtData {

  @Type(() => PaintData)
  public Paint: PaintData;

  public FontName: string;
  public FontType: string;
  public FontId: number;
  public FontSize: number;
  public Face: number;

  @Type(() => OutsideEffectData)
  public Effect: OutsideEffectData;

  constructor() {

    this.Paint = new PaintData(NvConstant.Colors.Black);
    this.FontName = 'Arial';
    this.FontType = 'sanserif';
    this.FontId = 1;
    this.FontSize = 10;
    this.Face = 0;
    this.Effect = new OutsideEffectData();
  }

  SetPaint = (paint: PaintData) => {
    this.Paint = paint;
    return this;
  }
}

export default TextFmtData
