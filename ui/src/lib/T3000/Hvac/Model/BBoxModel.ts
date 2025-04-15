

/**
 * Represents a bounding box defined by position and dimensions.
 *
 * The BBoxModel class encapsulates a basic rectangular shape using the properties:
 * - x: The horizontal position.
 * - y: The vertical position.
 * - width: The width of the bounding box. A value of -1 indicates an uninitialized dimension.
 * - height: The height of the bounding box. A value of -1 indicates an uninitialized dimension.
 *
 * The default constructor initializes the bounding box at the origin (0, 0) with both width and height set to -1.
 *
 * @example
 * // Creating an instance of BBoxModel
 * const bbox = new BBoxModel();
 *
 * // Accessing properties of the bounding box
 * console.log(`Position: (${bbox.x}, ${bbox.y})`);
 * console.log(`Dimensions: width=${bbox.width}, height=${bbox.height}`);
 */
class BBoxModel {

  x: number;
  y: number;
  width: number;
  height: number;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = -1;
    this.height = -1;
  }

}

export default BBoxModel
