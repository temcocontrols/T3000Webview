

import T3Svg from "../Util/T3Svg"
import Element from "./B.Element"
import Utils1 from "../Util/Utils1"

/**
 * Represents an oval SVG element.
 *
 * This class extends the base Element class and encapsulates the creation and manipulation
 * of an oval shape using SVG elements. It leverages the T3Svg library to construct and adjust
 * the visual representation of the oval.
 *
 * @remarks
 * The oval element is constructed by creating a container for SVG elements, and a specific
 * Ellipse element is added to define the shape of the oval. The class provides methods to create
 * and resize the oval element while maintaining its geometric properties.
 *
 * @example
 * // Create an Oval instance and initialize an oval element with specific dimensions.
 * const oval = new Oval();
 * const svgContainer = oval.CreateElement(150, 100);
 *
 * // Later, update the size of the oval element.
 * oval.SetSize(200, 150);
 *
 * @class
 */
class Oval extends Element {

  public shapeElem: any;

  constructor() {
    super();
    this.svgObj = null;
    this.shapeElem = null;
  }

  /**
   * Creates an oval element with specified dimensions
   * @param elementWidth - The width of the oval
   * @param elementHeight - The height of the oval
   * @returns The SVG container object representing the oval
   */
  CreateElement(elementWidth: number, elementHeight: number) {
    this.svgObj = new T3Svg.Container(T3Svg.create('g'));
    this.shapeElem = new T3Svg.Ellipse();
    this.svgObj.add(this.shapeElem);

    this.InitElement(elementWidth, elementHeight);

    return this.svgObj;
  }

  /**
   * Sets the size of the oval element and updates its visual properties
   * @param elementWidth - The new width of the oval
   * @param elementHeight - The new height of the oval
   */
  SetSize(elementWidth: number, elementHeight: number) {
    const width = Utils1.RoundCoord(elementWidth);
    const height = Utils1.RoundCoord(elementHeight);

    this.geometryBBox.width = width;
    this.geometryBBox.height = height;

    this.svgObj.size(width, height);
    this.shapeElem.size(width, height);

    this.UpdateTransform();
    this.RefreshPaint();
  }

}

export default Oval
