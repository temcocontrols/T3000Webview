

class BBoxModel {

  /**
   * X-coordinate of the bounding box
   */
  x: number;

  /**
   * Y-coordinate of the bounding box
   */
  y: number;

  /**
   * Width of the bounding box
   */
  width: number;

  /**
   * Height of the bounding box
   */
  height: number;

  /**
   * Creates a new BBoxModel instance with default values
   * x and y are initialized to 0, width and height to -1
   */
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = -1;
    this.height = -1;
  }
}

export default BBoxModel
