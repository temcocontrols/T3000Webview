

import T3Svg from "../Util/T3Svg"
import Element from "./B.Element"

/**
 * Represents a copy of an SVG element, providing functionality to duplicate an existing element and set its source reference.
 *
 * This class extends the Element base class and is designed to work with a custom SVG handling library (T3Svg).
 * It uses the T3Svg.Container to create a new SVG 'use' element, initializing it with properties from a given source element.
 * The copied element references the original element's internal ID to display the corresponding SVG shape.
 *
 * @example
 * // Create a new ShapeCopy instance from an existing element and set its source.
 * const shapeCopy = new ShapeCopy();
 * const svgElement = shapeCopy.CreateElement(sourceElement, 'rect');
 * shapeCopy.SetElementSource(sourceElement);
 *
 * @remarks
 * - The CreateElement method creates the new SVG element and initializes it based on the given source element and type.
 * - The SetElementSource method sets the 'xlink:href' attribute of the SVG element to reference the original element's internal ID.
 */
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
