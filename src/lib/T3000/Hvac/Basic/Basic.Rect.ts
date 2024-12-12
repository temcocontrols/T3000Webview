


// import Basic from "./Basic.Index";
import HvacSVG from "../Helper/Helper.SVG"
import $ from "jquery";
import Element from "./Basic.Element";

class Rect extends Element {

  public shapeElem: any;

  constructor() {
    super();
    'use strict';
    this.svgObj = null,
      this.shapeElem = null
  }
  // GetInstanceName(){
  //   return "Rect";
  // }


  // Basic.Rect.prototype = new Basic.Element
  // Basic.Rect.prototype.constructor = Basic.Rect
  CreateElement(e, t) {
    'use strict';

    console.log('Basic.Rect.prototype.CreateElement 1 e=', e);
    console.log('Basic.Rect.prototype.CreateElement 2 t=', t);

    return this.svgObj = new HvacSVG.Container(HvacSVG.create('g')),
      this.shapeElem = new HvacSVG.Rect,
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

export default Rect;

// export default Basic.Rect;
