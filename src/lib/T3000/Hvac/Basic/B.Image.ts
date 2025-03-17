

import T3Svg from "../Util/T3Svg"
import Element from "./B.Element";

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
