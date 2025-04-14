
import NvConstant from '../Data/Constant/NvConstant'

/**
 * Represents the configuration for an outside effect in an HVAC system.
 *
 * This class stores parameters that define the type, dimensions, and appearance of the
 * outside effect. The properties include the effect type, extents on four sides, a color value,
 * and two additional parameters (LParam and WParam) for further customization.
 *
 * @remarks
 * - Properties:
 *   - OutsideType: Specifies the type or style of the outside effect.
 *   - OutsideExtent_Right: The extension measure towards the right side.
 *   - OutsideExtent_Left: The extension measure towards the left side.
 *   - OutsideExtent_Top: The extension measure towards the top side.
 *   - OutsideExtent_Bottom: The extension measure towards the bottom side.
 *   - Color: Defines the visual color for the effect.
 *   - LParam: An extra parameter for additional configurations.
 *   - WParam: An extra parameter for additional configurations.
 *
 * @example
 * ```typescript
 * const outsideEffect = new OutsideEffectData();
 * outsideEffect.OutsideType = 1;
 * outsideEffect.OutsideExtent_Right = 80;
 * outsideEffect.OutsideExtent_Left = 80;
 * outsideEffect.OutsideExtent_Top = 40;
 * outsideEffect.OutsideExtent_Bottom = 40;
 * outsideEffect.Color = NvConstant.Colors.Red;
 * outsideEffect.LParam = 15;
 * outsideEffect.WParam = 25;
 * ```
 */
class OutsideEffectData {

  public OutsideType: number;
  public OutsideExtent_Right: number;
  public OutsideExtent_Left: number;
  public OutsideExtent_Top: number;
  public OutsideExtent_Bottom: number;
  public Color: string;
  public LParam: number;
  public WParam: number;

  constructor() {
    this.OutsideType = 0;
    this.OutsideExtent_Right = 0;
    this.OutsideExtent_Left = 0;
    this.OutsideExtent_Top = 0;
    this.OutsideExtent_Bottom = 0;
    this.Color = NvConstant.Colors.Black;
    this.LParam = 0;
    this.WParam = 0;
  }
}

export default OutsideEffectData
