

import T3Svg from "../Util/T3Svg"
import Element from "./B.Element";

/**
 * The Image class provides functionality for creating and manipulating an SVG image element.
 * It extends the base Element class and uses the T3Svg library to create and configure SVG elements.
 *
 * @remarks
 * The class creates an SVG "image" element, initializes it with a given configuration, and allows the source URL
 * to be set via the SetURL method. The image is configured to not preserve its aspect ratio to allow for custom scaling.
 *
 * @example
 * Here's an example of how to create an SVG image element and set its source URL:
 *
 * ```typescript
 * // Create an instance of the Image class
 * const image = new Image();
 *
 * // Create the SVG image element with configuration and element type
 * const svgImage = image.CreateElement({ id: 'myImage' }, 'customImage');
 *
 * // Set the source URL of the image
 * image.SetURL('https://example.com/path/to/image.png');
 * ```
 *
 * @class
 */
class Image extends Element {

  constructor() {
    super()
  }

  /**
   * Creates an image SVG element
   * @param elementConfig - The configuration for the element
   * @param elementType - The type of the element
   * @returns The created SVG image object
   */
  CreateElement(elementConfig, elementType) {
    this.svgObj = new T3Svg.Container(T3Svg.create('image'));
    this.InitElement(elementConfig, elementType);
    return this.svgObj;
  }

  /**
   * Sets the URL for the image source
   * @param imageUrl - The URL of the image to display
   */
  SetURL(imageUrl: string): void {
    this.svgObj.attr({ preserveAspectRatio: "none" });
    this.svgObj.src = imageUrl;
    this.svgObj.attr("xlink:href", imageUrl, T3Svg.xlink);
  }

}

export default Image
