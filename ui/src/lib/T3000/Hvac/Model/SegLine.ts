

/**
 * Represents a segmented line with defined start and end directions, a curvature parameter, and collections for points and lengths.
 *
 * @remarks
 * The SegLine class encapsulates the basic properties to model a segment of a line often used in HVAC systems.
 * - The 'firstdir' property indicates the starting direction of the segment.
 * - The 'lastdir' property indicates the ending direction of the segment.
 * - The 'curveparam' property defines a parameter for the curve, potentially used in interpolation or replication of curved paths.
 * - The 'pts' array holds the individual points that compose the segmented line.
 * - The 'lengths' array holds the lengths corresponding to segments between points.
 *
 * @example
 * Here's an example of how to create and use a SegLine instance:
 * ```typescript
 * const segment = new SegLine();
 * segment.firstdir = 0;       // Define starting direction
 * segment.lastdir = 90;       // Define ending direction
 * segment.curveparam = 1.0;   // Set curve parameter for interpolation or curve representation
 * segment.pts.push({ x: 0, y: 0 });
 * segment.pts.push({ x: 10, y: 10 });
 * segment.lengths.push(14.14);  // Example: length of segment between (0,0) and (10,10)
 * ```
 *
 * @public
 */
class SegLine {

  public firstdir: number;
  public lastdir: number;
  public curveparam: number;
  public pts: any[];
  public lengths: any[];

  constructor() {
    this.firstdir = 0;
    this.lastdir = 0;
    this.curveparam = 0;
    this.pts = [];
    this.lengths = [];
  }

}

export default SegLine
