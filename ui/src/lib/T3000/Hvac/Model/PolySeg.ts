
import OptConstant from "../Data/Constant/OptConstant";

/**
 * Represents a polygon segment with configurable line styling, geometric parameters,
 * and additional metadata for rendering and user interaction.
 *
 * @remarks
 * The PolySeg class encapsulates various properties such as the type of line used for the segment,
 * geometric attributes including a reference point (pt), and flags that indicate specific characteristics.
 * It is designed to be flexible by allowing initialization with optional x and y coordinates.
 * If no coordinates are provided, the segment's point defaults to { x: 0, y: 0 }.
 *
 * The properties include:
 * - LineType: The type of line style used, with a default provided from a predefined constant.
 * - dataclass: A numerical value associated with the segment's classification.
 * - ShortRef: A short numerical reference, potentially used as an identifier.
 * - param: A parameter for additional configuration.
 * - weight: Likely used for rendering weight or similar metric.
 * - dimDeflection: Represents the deflection for dimension lines.
 * - flags: Used for various bitwise configuration flags.
 * - pt: An object representing the 2D point with x and y coordinates.
 * - UserData: A place to store any user-specific data.
 * - dimTextAltPositioning: A flag to indicate alternative positioning for dimension text.
 *
 * @example
 * // Creating a new PolySeg instance with a specific line type and coordinates
 * const lineType = OptConstant.LineType.LINE; // Assume OptConstant.LineType.LINE is predefined
 * const segment = new PolySeg(lineType, 100, 200);
 *
 * // Accessing properties of the segment
 * console.log(segment.pt.x); // Output: 100
 * console.log(segment.pt.y); // Output: 200
 *
 * // Modifying a property, for example, enabling alternate text positioning
 * segment.dimTextAltPositioning = true;
 *
 * @public
 */
class PolySeg {

  public LineType: any;
  public dataclass: number;
  public ShortRef: number;
  public param: number;
  public weight: number;
  public dimDeflection: number;
  public flags: number;
  public pt: any;
  public UserData: any;
  public dimTextAltPositioning: boolean;

  constructor(lineType: any, ptx: any, pty: any) {

    this.LineType = lineType || OptConstant.LineType.LINE;
    this.dataclass = 0;
    this.ShortRef = 0;
    this.param = 0;
    this.weight = 0;
    this.dimDeflection = 0;
    this.flags = 0;
    this.pt = { x: 0, y: 0 };
    this.UserData = null;
    if (ptx) { this.pt.x = ptx; }
    if (pty) { this.pt.y = pty; }
    this.dimTextAltPositioning = false;
  }
}

export default PolySeg
