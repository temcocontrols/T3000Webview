
import Element from './Element';
import * as Utils from '../Hvac.Utils';
// import { SVG, create } from '@svgdotjs/svg.js';
import HvacSVG from '../HvacSVG';

class Rect extends Element {
  public shapeElem: any;

  CreateElement = (element, parent) => {
    const t1 = HvacSVG.create("g");
    const t2 = new HvacSVG.Container(t1);
    this.svgObj = t2;
    this.shapeElem = new HvacSVG.Rect();
    this.svgObj.add(this.shapeElem);
    this.InitElement(element, parent);
    return this.svgObj;
  }

  SetSize = (width, height) => {
    width = Utils.RoundCoord(width);
    height = Utils.RoundCoord(height);

    this.geometryBBox.width = width;
    this.geometryBBox.height = height;
    this.svgObj.size(width, height);
    this.shapeElem.size(width, height);
    this.UpdateTransform();
    this.RefreshPaint(null);
  }
}

export default Rect;
