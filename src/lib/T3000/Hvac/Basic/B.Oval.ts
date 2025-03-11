

import $ from 'jquery';
import T3Svg from "../Helper/T3Svg"
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import ConstantData from "../Data/ConstantData"
import Element from "./B.Element";

class Oval extends Element {

  public shapeElem: any;

  constructor() {
    super();
    this.svgObj = null,
      this.shapeElem = null
  }

  CreateElement(width: number, height: number) {
    console.log("= B.Oval CreateElement input =>", { width, height });

    this.svgObj = new T3Svg.Container(T3Svg.create('g'));
    this.shapeElem = new T3Svg.Ellipse();
    this.svgObj.add(this.shapeElem);

    this.InitElement(width, height);

    console.log("= B.Oval CreateElement output =>", this.svgObj);
    return this.svgObj;
  }

  SetSize(width: number, height: number) {
    console.log("= B.Oval SetSize input =>", { width, height });

    width = Utils1.RoundCoord(width);
    height = Utils1.RoundCoord(height);

    this.geometryBBox.width = width;
    this.geometryBBox.height = height;

    this.svgObj.size(width, height);
    this.shapeElem.size(width, height);

    this.UpdateTransform();
    this.RefreshPaint();

    console.log("= B.Oval SetSize output =>", this.geometryBBox);
  }

}

export default Oval
