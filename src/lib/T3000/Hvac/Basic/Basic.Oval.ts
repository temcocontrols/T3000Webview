



// import SDJS from "../SDJS/SDJS.Index";
// import SDUI from "../SDUI/SDUI.Index";
// import Basic from "./Basic.Index";
// import GPP from "../gListManager";
import $ from 'jquery';
import HvacSVG from "../Helper/Helper.SVG.t2"


import Global from "./Basic.Global";




import Element from "./Basic.Element";

class Oval extends Element {
  public shapeElem: any;


  constructor() {
    super();
    'use strict';
    this.svgObj = null,
      this.shapeElem = null
  }

  // GetInstanceName(){
  //   return "Oval";
  // }
  // Basic.Oval.prototype = new Basic.Element,
  // Basic.Oval.prototype.constructor = Basic.Oval,
  CreateElement(e, t) {
    'use strict';
    return this.svgObj = new HvacSVG.Container(HvacSVG.create('g')),
      this.shapeElem = new HvacSVG.Ellipse,
      this.svgObj.add(this.shapeElem),
      this.InitElement(e, t),
      this.svgObj
  }

  SetSize(e, t) {
    'use strict';
    e = Global.RoundCoord(e),
      t = Global.RoundCoord(t),
      this.geometryBBox.width = e,
      this.geometryBBox.height = t,
      this.svgObj.size(e, t),
      this.shapeElem.size(e, t),
      this.UpdateTransform(),
      this.RefreshPaint()
  }

}

export default Oval


// export default Basic.Oval;
