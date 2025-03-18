

import T3Svg from "../Util/T3Svg"
import Element from "./B.Element"
import Utils1 from "../Util/Utils1"

class Rect extends Element {

  public shapeElem: any;

  constructor() {
    super();
    this.svgObj = null;
    this.shapeElem = null;
  }

  /**
   * Creates a rectangular SVG element based on provided data
   * @param elementData - The base data for the element
   * @param transformData - The transformation data for positioning and sizing
   * @returns The created SVG container object
   */
  CreateElement(elementData, transformData) {
    this.svgObj = new T3Svg.Container(T3Svg.create('g'));
    this.shapeElem = new T3Svg.Rect();
    this.svgObj.add(this.shapeElem);

    this.InitElement(elementData, transformData);

    return this.svgObj;
  }

  /**
   * Sets the size of the rectangular element
   * @param newWidth - The desired width for the rectangle
   * @param newHeight - The desired height for the rectangle
   */
  SetSize(newWidth: number, newHeight: number) {
    const roundedWidth = Utils1.RoundCoord(newWidth);
    const roundedHeight = Utils1.RoundCoord(newHeight);

    this.geometryBBox.width = roundedWidth;
    this.geometryBBox.height = roundedHeight;

    this.svgObj.size(roundedWidth, roundedHeight);
    this.shapeElem.size(roundedWidth, roundedHeight);

    this.UpdateTransform();
    this.RefreshPaint();
  }

}

export default Rect
