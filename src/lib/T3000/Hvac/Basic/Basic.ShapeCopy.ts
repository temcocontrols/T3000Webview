

import HvacSVG from "../Helper/SVG.t2"
import Element from "./Basic.Element"

class ShapeCopy extends Element {

  public shapeElem: any;

  constructor() {
    super()
    this.svgObj = null;
    this.shapeElem = null;
  }

  CreateElement(element, type) {
    console.log('= B.ShapeCopy CreateElement input:', { element, type });

    this.svgObj = new HvacSVG.Container(HvacSVG.create('use'));
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
