
import { Type } from 'class-transformer'
import 'reflect-metadata'

import PaintData from './PaintData'
import NvConstant from '../Data/Constant/NvConstant'

/**
 * Represents the fill settings for HVAC components, including paint details and fill effects.
 *
 * @remarks
 * The FillData class holds information about the fill style by configuring properties related to
 * paint appearance and additional parameters used for graphical effects. It provides an easy way
 * to initialize fill properties with default values and update the paint settings through its method.
 *
 * The constructor initializes the following properties:
 * - Paint: A PaintData instance initialized with a default white color.
 * - Hatch: A numeric value representing the hatch style, defaulting to 0.
 * - FillEffect: A numeric value representing the fill effect, defaulting to 0.
 * - EffectColor: A property to hold the effect color, initialized to null.
 * - WParam and LParam: Numeric parameters for extended functionalities, both defaulting to 0.
 *
 * Use the {@link SetPaint} method to update the paint setting.
 *
 * @example
 * ```typescript
 * // Create a new FillData instance with default settings.
 * const fillData = new FillData();
 *
 * // Instantiate a new PaintData with a custom color (e.g., a red shade).
 * const customPaint = new PaintData('#FF0000');
 *
 * // Update the FillData instance with the custom PaintData.
 * fillData.SetPaint(customPaint);
 *
 * // Now fillData.Paint reflects the updated PaintData instance.
 * console.log(fillData);
 * ```
 */
class FillData {

  @Type(() => PaintData)
  public Paint: PaintData;

  public Hatch: number;
  public FillEffect: number;
  public EffectColor: any;
  public WParam: number;
  public LParam: number;

  // White: '#FFFFFF' Black: '#000000' Hilite: '#0099FF' Select: '#00FF00' Shade: '#F1F1F1' Gray: '#C0C0C0'
  constructor() {
    this.Paint = new PaintData(NvConstant.Colors.White);
    this.Hatch = 0;
    this.FillEffect = 0;
    this.EffectColor = null;
    this.WParam = 0;
    this.LParam = 0;
  }

  SetPaint = (paint: PaintData) => {
    this.Paint = paint;
    return this;
  }
}

export default FillData
