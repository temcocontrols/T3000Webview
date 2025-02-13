


import HvacSVG from "../Helper/SVG.t2"
import Element from "./Basic.Element"
import Utils1 from "../Helper/Utils1"

class Rect extends Element {

  public shapeElem: any;

  constructor() {
    super();
    this.svgObj = null;
    this.shapeElem = null;
  }

  CreateElement(elementOptions: any, transformationOptions: any) {
    console.log('= B.Rect CreateElement input:', { elementOptions, transformationOptions });

    this.svgObj = new HvacSVG.Container(HvacSVG.create('g'));
    this.shapeElem = new HvacSVG.Rect();
    this.svgObj.add(this.shapeElem);

    this.InitElement(elementOptions, transformationOptions);

    console.log('= B.Rect CreateElement output:', { svgObj: this.svgObj, shapeElem: this.shapeElem });
    return this.svgObj;
  }

  SetSize(width: number, height: number): void {
    console.log("= B.Rect SetSize input:", { width, height });

    const roundedWidth = Utils1.RoundCoord(width);
    const roundedHeight = Utils1.RoundCoord(height);

    this.geometryBBox.width = roundedWidth;
    this.geometryBBox.height = roundedHeight;
    this.svgObj.size(roundedWidth, roundedHeight);
    this.shapeElem.size(roundedWidth, roundedHeight);

    this.UpdateTransform();
    this.RefreshPaint();

    console.log("= B.Rect SetSize output:", { geometryBBox: this.geometryBBox });
  }
}

export default Rect
