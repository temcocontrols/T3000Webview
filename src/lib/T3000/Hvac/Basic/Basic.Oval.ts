

import $ from 'jquery';
import HvacSVG from "../Helper/SVG.t2"
import Element from "./Basic.Element"

class Oval extends Element {
  public shapeElem: any;

  constructor() {
    super();
    this.svgObj = null;
    this.shapeElem = null;
  }

  CreateElement(options: any, config: any): HvacSVG.Container {
    console.log('= B.Oval: CreateElement input options:', options, 'config:', config);

    this.svgObj = new HvacSVG.Container(HvacSVG.create('g'));
    this.shapeElem = new HvacSVG.Ellipse();
    this.svgObj.add(this.shapeElem);
    this.InitElement(options, config);

    console.log('= B.Oval: CreateElement output:', this.svgObj);

    return this.svgObj;
  }

  SetSize(width: number, height: number): void {
    console.log('= B.Oval: SetSize input:', { width, height });

    const roundedWidth = Global.RoundCoord(width);
    const roundedHeight = Global.RoundCoord(height);

    this.geometryBBox.width = roundedWidth;
    this.geometryBBox.height = roundedHeight;

    this.svgObj.size(roundedWidth, roundedHeight);
    this.shapeElem.size(roundedWidth, roundedHeight);

    this.UpdateTransform();
    this.RefreshPaint();

    console.log('= B.Oval: SetSize output:', {
      roundedWidth: roundedWidth,
      roundedHeight: roundedHeight,
      geometryBBox: this.geometryBBox
    });
  }
}

export default Oval
