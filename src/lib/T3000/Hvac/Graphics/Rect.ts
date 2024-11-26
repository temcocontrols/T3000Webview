
import Element from './Element';
import * as Utils from '../Hvac.Utils';
// import * as SVG from '@svgdotjs/svg.js';
import SVG from '../HvacSVG';


class Rect extends Element {
  public shapeElem: any;


  CreateElement = (element, parent) => {

    console.log('Rect.CreateElement element', element);

    const t1 = SVG.create("g");
    console.log('Rect.CreateElement t1', t1);

    const t2 = new SVG.Container(t1);
    console.log('Rect.CreateElement t2', t2);

    this.svgObj = t2;
    console.log('Rect.CreateElement svgObj 1', this.svgObj);

    this.shapeElem = new SVG.Rect();
    console.log('Rect.CreateElement shapeElem ', this.shapeElem);

    this.svgObj.add(this.shapeElem);
    console.log('Rect.CreateElement svgObj 2', this.svgObj);

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
