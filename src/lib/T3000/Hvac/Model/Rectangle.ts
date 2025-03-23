

/**
 * Represents a rectangle defined by its top-left corner (x, y) and its dimensions (width and height).
 *
 * @remarks
 * The Rectangle class is a simple model used to encapsulate the properties of a rectangle.
 * It assigns default values of 0 to all properties if none are provided, making it safe to
 * instantiate without parameters.
 *
 * @example
 * Creating a new Rectangle instance:
 * ```typescript
 * const rect = new Rectangle(10, 20, 100, 50);
 * console.log(`x: ${rect.x}, y: ${rect.y}, width: ${rect.width}, height: ${rect.height}`);
 * // Output: x: 10, y: 20, width: 100, height: 50
 * ```
 *
 * @public
 */
class Rectangle {

  public x: number;
  public y: number;
  public width: number;
  public height: number;

  constructor(x?: number, y?: number, width?: number, height?: number) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
  }
}

export default Rectangle
