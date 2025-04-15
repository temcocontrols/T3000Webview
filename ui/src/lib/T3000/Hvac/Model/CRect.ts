

/**
 * Represents a rectangular shape defined by its horizontal and vertical dimensions as well as
 * distances from a reference point.
 *
 * @remarks
 * The CRect class encapsulates properties to represent the horizontal measurement (h),
 * vertical measurement (v), and the corresponding horizontal (hdist) and vertical (vdist)
 * distances. This class can be used in graphical or layout calculations where a specific
 * measurement and spacing are required.
 *
 * @example
 * Creating a new instance of CRect:
 *
 * ```typescript
 * // Initialize a rectangle with a width of 10, height of 20, and both horizontal and vertical distances of 5.
 * const rect = new CRect(10, 20, 5, 5);
 *
 * console.log(rect.h);     // Output: 10
 * console.log(rect.v);     // Output: 20
 * console.log(rect.hdist); // Output: 5
 * console.log(rect.vdist); // Output: 5
 * ```
 *
 * @param h - The horizontal measurement of the rectangle. Defaults to 0 if not provided.
 * @param v - The vertical measurement of the rectangle. Defaults to 0 if not provided.
 * @param hdist - The horizontal distance from a reference point. Defaults to 0 if not provided.
 * @param vdist - The vertical distance from a reference point. Defaults to 0 if not provided.
 */
class CRect {

  public h: number;
  public v: number;
  public hdist: number;
  public vdist: number;

  constructor(h?: number, v?: number, hdist?: number, vdist?: number) {
    this.h = h || 0;
    this.v = v || 0;
    this.hdist = hdist || 0;
    this.vdist = vdist || 0;
  }
}

export default CRect
