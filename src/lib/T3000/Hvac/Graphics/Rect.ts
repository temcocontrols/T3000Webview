
import Element from './Element';
import * as Utils from '../Hvac.Utils';
import * as SVG from '@svgdotjs/svg.js';
// import SVG from '../HvacSVG.js';
// import SVG from '../Hvac.SVG';


class Rect extends Element {
  public shapeElem: any;


  CreateElement = (element, parent) => {
    const t1 = SVG.create("g");
    console.log('CreateElement t1', t1);
    this.svgObj = t1;
    this.shapeElem = new SVG.Rect();
    console.log('SDGraphics.Rect.prototype.CreateElement this.shapeElem ', this.shapeElem);
    this.svgObj.add(this.shapeElem);
    console.log('SDGraphics.Rect.prototype.CreateElement this.svgObj ', this.svgObj);
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
