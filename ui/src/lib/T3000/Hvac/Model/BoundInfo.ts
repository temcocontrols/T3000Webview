

/**
 * Represents a rectangular boundary with position and dimensions.
 *
 * @remarks
 * The BoundInfo class provides properties to define the X and Y coordinates along with the width and height,
 * essentially describing a rectangular area. This simple data structure is primarily used for graphical layouts,
 * spatial calculations, or any scenario where the bounds of an object need to be defined.
 *
 * @example
 * Here's how to create and initialize an instance of BoundInfo:
 *
 * ```typescript
 * const bound = new BoundInfo();
 * bound.x = 50;
 * bound.y = 75;
 * bound.width = 100;
 * bound.height = 200;
 * ```
 */
class BoundInfo {

  x: number;
  y: number;
  width: number;
  height: number;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
  }
}

export default BoundInfo
