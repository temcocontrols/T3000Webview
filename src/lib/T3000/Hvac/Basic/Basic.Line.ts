



// import SDJS from "../SDJS/SDJS.Index";
// import SDUI from "../SDUI/SDUI.Index";
// import Basic from "./Basic.Index";
// import GPP from "../gListManager";
import $ from 'jquery';
import HvacSVG from "../Helper/Helper.SVG.t2"


import Path from "./Basic.Path";

import Global from "./Basic.Global";


class Line extends Path {

  constructor() {
    super()
  }

  // GetInstanceName(){
  //   return "Line";
  // }


  // Basic.Line = function () {
  // },
  //   Basic.Line.prototype = new Basic.Path,
  //   Basic.Line.prototype.constructor = Basic.Line,
  SetPoints(e, t, a, r) {
    'use strict';
    var i = this.PathCreator();
    i.BeginPath(),
      i.MoveTo(e, t),
      i.LineTo(a, r);
    var n = i.ToString();
    this.SetPath(
      n,
      {
        x: Math.min(e, a),
        y: Math.min(t, r),
        width: Math.abs(a - e),
        height: Math.abs(r - t)
      }
    )
  }

}

export default Line;




// export default Basic.Line;
