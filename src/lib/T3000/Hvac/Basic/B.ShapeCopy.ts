

import T3Svg from "../Util/T3Svg"
import Element from "./B.Element"

class ShapeCopy extends Element {

  public shapeElem: any;

  constructor() {
    super()
    this.svgObj = null;
    this.shapeElem = null;
  }

  /**
   * Creates a new SVG element as a copy of another element
   * @param sourceElement - The source element to copy from
   * @param elementType - The type of element to create
   * @returns The created SVG container object
   */
  CreateElement(sourceElement, elementType) {
    this.svgObj = new T3Svg.Container(T3Svg.create('use'));
    this.InitElement(sourceElement, elementType);

    return this.svgObj;
  }

  /**
   * Sets the source reference for this shape copy
   * @param sourceElement - The element to reference as the source
   */
  SetElementSource(sourceElement) {
    const internalID = sourceElement.SetInternalID();
    this.svgObj.attr('xlink:href', `#${internalID}`, 'http://www.w3.org/1999/xlink');
  }

}

export default ShapeCopy
