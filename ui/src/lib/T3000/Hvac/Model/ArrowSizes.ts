

/**
 * Class representing a collection of predefined arrow sizes for UI elements.
 *
 * This class initializes an array of arrow sizes upon construction, which can be used
 * to adjust visual elements such as arrows in a user interface. The sizes are specified
 * as a number array and can be accessed via the public property "uiarrowSizes".
 *
 * @example
 * // Create an instance of ArrowSizes
 * const arrowSizes = new ArrowSizes();
 *
 * // Log the predefined arrow sizes to the console
 * console.log(arrowSizes.uiarrowSizes); // Output: [2, 4, 6, 1.5, 3, 12, 24]
 */
class ArrowSizes {

  public uiarrowSizes: number[] = [];

  constructor() {
    this.InitArrowSizes();
  }

  InitArrowSizes = () => {
    this.uiarrowSizes = [2, 4, 6, 1.5, 3, 12, 24]
  }
}

export default ArrowSizes
