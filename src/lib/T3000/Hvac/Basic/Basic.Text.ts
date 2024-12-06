import Formatter from "./Basic.Text.Formatter";
import * as Utils from '../Helper/Helper.Utils';
import HvacSVG from '../Helper/Helper.SVG';
import Element from './Basic.Element';

class Text extends Element {

  public formatter: Formatter;
  public svgObj: any;
  public textElem: any;
  public selectElem: any;
  public cursorElem: any;
  public clickAreaElem: any;
  public decorationAreaElem: any;
  public minHeight: number;
  public vAlign: string;
  public textElemOffset: number;
  public activeEditStyle: number;
  public editCallbackData: any;
  public dataTableID: number;
  public dataRecordID: number;
  public dataStyleOverride: any;
  public lastFmtSize: any;

  constructor() {
    super();
  }

  CreateElement = function (e, t) {
    this.formatter = new Formatter(this);
    this.svgObj = new HvacSVG.Container(HvacSVG.create('g'));
    this.InitElement(e, t);
    this.textElem = new HvacSVG.Container(HvacSVG.create('text'));
    this.selectElem = new HvacSVG.Path();
    this.cursorElem = new HvacSVG.Line();
    this.clickAreaElem = new HvacSVG.Rect();
    this.decorationAreaElem = new HvacSVG.Container(HvacSVG.create('g'));
    this.clickAreaElem.attr('stroke-width', 0);
    this.clickAreaElem.attr('fill', 'none');
    this.clickAreaElem.attr('visibility', 'hidden');
    this.clickAreaElem.node.setAttribute('no-export', '1');
    this.svgObj.add(this.clickAreaElem);
    this.svgObj.add(this.textElem);
    this.svgObj.add(this.decorationAreaElem);
    this.minHeight = 0;
    this.vAlign = 'top';
    this.lastFmtSize = {
      width: 0,
      height: 0
    };
    return this.svgObj;
  }

  SetText = function (text, formatStyle, additionalParam, anotherParam, flag) {
    this.formatter.SetText(text, formatStyle, additionalParam, anotherParam);
    this.UpdateTextObject();
  }

  SetFormat = function (e, t, a) {
    this.activeEditStyle = this.formatter.SetFormat(e, t, a),
      this.UpdateTextObject()
  }

  UpdateTextObject = function () {
    const textSize = this.formatter.GetTextFormatSize();
    let needsResize = false;
    let verticalOffset = 0;

    if (this.formatter.renderingEnabled) {
      const height = Math.max(textSize.height, this.minHeight);

      switch (this.vAlign) {
        case "top":
          verticalOffset = 0;
          break;
        case "middle":
          verticalOffset = (height - textSize.height) / 2;
          break;
        case "bottom":
          verticalOffset = height - textSize.height;
          break;
      }

      const newSize = { width: textSize.width, height: height };

      this.svgObj.size(textSize.width, height);
      this.clickAreaElem.transform({ x: 0, y: 0 });
      this.clickAreaElem.size(textSize.width, height);
      this.textElem.size(textSize.width, textSize.height);
      this.textElem.transform({ x: 0, y: verticalOffset });
      this.decorationAreaElem.size(textSize.width, textSize.height);
      this.decorationAreaElem.transform({ x: 0, y: verticalOffset });

      this.textElemOffset = verticalOffset;
      this.geometryBBox.width = textSize.width;
      this.geometryBBox.height = height;

      this.RefreshPaint();
      this.formatter.RenderFormattedText(this.textElem, this.decorationAreaElem);

      this.lastFmtSize = newSize;
    }
  }
}

export default Text;
