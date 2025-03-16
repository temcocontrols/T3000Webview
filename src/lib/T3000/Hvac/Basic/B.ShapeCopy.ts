

import $ from 'jquery';
import T3Svg from "../Util/T3Svg"
import Element from "./B.Element";
import Utils1 from "../Util/Utils1"
import Utils2 from "../Util/Utils2"
import Utils3 from "../Util/Utils3"
import ConstantData from "../Data/ConstantData"

class ShapeCopy extends Element {

  public shapeElem: any;

  constructor() {
    super()
    this.svgObj = null;
    this.shapeElem = null;
  }

  CreateElement(element, type) {
    console.log('= B.ShapeCopy CreateElement input:', { element, type });

    this.svgObj = new T3Svg.Container(T3Svg.create('use'));
    this.InitElement(element, type);

    console.log('= B.ShapeCopy CreateElement output:', this.svgObj);
    return this.svgObj;
  }

  SetElementSource(element) {
    console.log('= B.ShapeCopy SetElementSource input:', { element });

    const internalID = element.SetInternalID();
    this.svgObj.attr('xlink:href', `#${internalID}`, 'http://www.w3.org/1999/xlink');

    console.log('= B.ShapeCopy SetElementSource output:', this.svgObj);
  }

}

export default ShapeCopy
