

import $ from 'jquery';
import HvacSVG from "../Helper/SVG.t2"
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import ConstantData from "../Data/ConstantData"
import Element from "./Basic.Element";

class Image extends Element {

  constructor() {
    super()
  }

  CreateElement(element, type) {
    console.log("= B.Group - CreateElement called with:", { element, type });
    this.svgObj = new HvacSVG.Container(HvacSVG.create('image'));
    this.InitElement(element, type);
    console.log("= B.Group - CreateElement output:", this.svgObj);
    return this.svgObj;
  }

  SetURL(url: string): void {
    console.log("= B.Group SetURL - Input:", url);

    // Set the attributes and source for the SVG image element
    this.svgObj.attr({ preserveAspectRatio: "none" });
    this.svgObj.src = url;
    this.svgObj.attr("xlink:href", url, HvacSVG.xlink);

    console.log("= B.Group SetURL - Output:", this.svgObj);
  }

}

export default Image
