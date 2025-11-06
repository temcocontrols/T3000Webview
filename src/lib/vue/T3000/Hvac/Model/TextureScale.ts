
/**
 * Represents scaling and alignment parameters for textures in HVAC systems.
 *
 * @class TextureScale
 * @description Manages the scale, width, alignment, and unit configuration for textures
 * used in HVAC visualization components.
 *
 * @property {number} Units - The unit system used for texture measurements (e.g., 0: pixels, 1: inches, 2: mm)
 * @property {number} Scale - The scaling factor applied to the texture
 * @property {number} RWidth - The relative width of the texture
 * @property {number} AlignmentScalar - Factor controlling texture alignment within its container
 * @property {number} Flags - Bitwise flags controlling texture rendering behavior
 *
 * @example
 * ```typescript
 * // Create a texture scale with default values
 * const defaultScale = new TextureScale();
 *
 * // Create and configure a texture scale for a specific component
 * const customScale = new TextureScale();
 * customScale.Units = 1; // Set to inches
 * customScale.Scale = 2.5; // Scale the texture by 2.5x
 * customScale.RWidth = 100; // Set relative width to 100
 * customScale.AlignmentScalar = 1.5; // Set alignment factor
 * customScale.Flags = 0b0010; // Set specific rendering flags
 * ```
 */
class TextureScale {

  public Units: number;
  public Scale: number;
  public RWidth: number;
  public AlignmentScalar: number;
  public Flags: number;

  constructor() {
    this.Units = 0;
    this.Scale = 0;
    this.RWidth = 0;
    this.AlignmentScalar = 0;
    this.Flags = 0;
  }
}

export default TextureScale
