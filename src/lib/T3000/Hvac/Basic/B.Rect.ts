

import T3Svg from "../Helper/T3Svg"
import $ from "jquery";
import Element from "./B.Element";
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import ConstantData from "../Data/ConstantData"

class Rect extends Element {

  public shapeElem: any;

  constructor() {
    super();
    this.svgObj = null;
    this.shapeElem = null;
  }

  CreateElement(elementData, transformData) {
    console.log('= B.Rect CreateElement input:', { elementData, transformData });

    this.svgObj = new T3Svg.Container(T3Svg.create('g'));
    this.shapeElem = new T3Svg.Rect();
    this.svgObj.add(this.shapeElem);

    this.InitElement(elementData, transformData);

    console.log('= B.Rect CreateElement output svgObj:', this.svgObj);
    return this.svgObj;
  }

  SetSize(newWidth: number, newHeight: number) {
    console.log('= B.Rect SetSize input:', { newWidth, newHeight });

    const roundedWidth = Utils1.RoundCoord(newWidth);
    const roundedHeight = Utils1.RoundCoord(newHeight);

    this.geometryBBox.width = roundedWidth;
    this.geometryBBox.height = roundedHeight;

    this.svgObj.size(roundedWidth, roundedHeight);
    this.shapeElem.size(roundedWidth, roundedHeight);

    this.UpdateTransform();
    this.RefreshPaint();

    console.log('= B.Rect SetSize output geometryBBox:', this.geometryBBox);
  }

}

export default Rect
