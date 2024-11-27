
import Element from './Element';
import * as Utils from '../Hvac.Utils';
import HvacSvg from '../Hvac.SVG';

class Rect extends Element {
  public shapeElem: any;

  CreateElement = (element, parent) => {
    this.svgObj = new HvacSvg.Container(HvacSvg.create("g"));

    const test = HvacSvg().rect(100, 100).fill('red');
    this.svgObj.add(test);

    this.shapeElem = new HvacSvg.Rect();
    this.svgObj.add(this.shapeElem);
    this.InitElement(element, parent);
    return this.svgObj;

    /*
    this.svgObj = new SVG.Container(SVG.create("g"));
    this.shapeElem = new SVG.Rect();
    this.svgObj.add(this.shapeElem);
    this.InitElement(e, t);
    return this.svgObj;
    */
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
