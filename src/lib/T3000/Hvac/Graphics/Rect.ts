
import Element from './Element';
import * as Utils from '../Hvac.Utils';
import HvacSVG from '../Hvac.SVG';
import * as HvacSVG1 from '../Hvac.SVG1';

class Rect extends Element {
  public shapeElem: any;

  CreateElement = (element, parent) => {
    this.svgObj = new HvacSVG.Container(HvacSVG.create('g'));
    this.svgObj.data();

    this.shapeElem = new HvacSVG.Rect();
    this.svgObj.add(this.shapeElem);

    // const blueRectT1 = HvacSVG().rect(100, 100).fill('blue').move(100, 100);
    // blueRectT1.t1();
    // this.svgObj.add(blueRectT1);

    // const redCircleT1 = new HvacSVG1.Circle();
    // redCircleT1.attr({ cx: 100, cy: 100, r: 50, fill: 'red' });
    // redCircleT1.t1();
    // this.svgObj.add(redCircleT1);

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
