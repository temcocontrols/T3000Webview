import * as SVG from "@svgdotjs/svg.js";
import Container from "./Container";
import Rect from "./Rect";
import Layer from "./Layer";
import Models from '../Hvac.Models';

interface DocInfo {
  dispX: number;
  dispY: number;
  dispWidth: number;
  dispHeight: number;
  dispDpiX: number;
  dispDpiY: number;
  scrollX: number;
  scrollY: number;
  docDpi: number;
  docScale: number;
  docWidth: number;
  docHeight: number;
  docToScreenScale: number;
  docDpiScale: number;
  docVisX: number;
  docVisY: number;
  docVisWidth: number;
  docVisHeight: number;
  docScreenX: number;
  docScreenY: number;
  docScreenWidth: number;
  docScreenHeight: number;
  maxScrollX: number;
  maxScrollY: number;
}

class Document extends Container {
  public parentElem: string;
  // public svgObj: any;
  public docInfo: DocInfo;
  public fontList: any;
  public activeEdit: any;
  public spellChecker: any;
  public documentLayerID: any;
  public imageLoadRefCount: number;

  constructor(elementId: string, fontList: any) {
    super();

    this.parentElem = elementId;
    if (this.parentElem.charAt(0) !== '#' && this.parentElem.charAt(0) !== '.') {
      this.parentElem = '#' + this.parentElem;
    }
    this.svgObj = new SVG.Svg(this.parentElem[0]);
    this.InitDocInfo();
    this.fontList = fontList;
    this.activeEdit = null;
    this.spellChecker = null;
    this.documentLayerID = null;
    this.imageLoadRefCount = 0;
    this.InitElement(this, null);
    this.InitializeContainer();
  }

  InitDocInfo = () => {
    this.docInfo = {
      dispX: 0,
      dispY: 0,
      dispWidth: 0,
      dispHeight: 0,
      dispDpiX: 0,
      dispDpiY: 0,
      scrollX: 0,
      scrollY: 0,
      docDpi: 0,
      docScale: 1,
      docWidth: 0,
      docHeight: 0,
      docToScreenScale: 0,
      docDpiScale: 0,
      docVisX: 0,
      docVisY: 0,
      docVisWidth: 0,
      docVisHeight: 0,
      docScreenX: 0,
      docScreenY: 0,
      docScreenWidth: 0,
      docScreenHeight: 0,
      maxScrollX: 0,
      maxScrollY: 0
    };
  }

  InitializeContainer = () => {
    this.GetDeviceInfo();
    this.docInfo.docDpi = this.docInfo.dispDpiX;
    this.docInfo.docWidth = this.docInfo.dispWidth;
    this.docInfo.docHeight = this.docInfo.dispHeight;
    this.docInfo.docScale = 1;
    this.docInfo.scrollX = 0;
    this.docInfo.scrollY = 0;
    this.CalcWorkArea();
    this.ApplyDocumentTransform(null);
  }

  GetDeviceInfo = () => {
    let shape = this.CreateShape(Models.CreateShapeType.RECT);
    shape.SetFillOpacity(0);
    shape.SetStrokeWidth(0);
    shape.SetSize('100in', '100in');
    this.AddElement(shape, null);

    let bbox = shape.GetBBox();
    this.docInfo.dispDpiX = bbox.width / 100;
    this.docInfo.dispDpiY = bbox.height / 100;

    this.RemoveElement(shape);

    // this.docInfo.dispWidth = $(this.parentElem).innerWidth(),
    // this.docInfo.dispHeight = $(this.parentElem).innerHeight()

    this.docInfo.dispWidth = document.getElementById(this.parentElem).clientWidth;
    this.docInfo.dispHeight = document.getElementById(this.parentElem).clientHeight;
  }

  CreateShape = (e) => {
    let shape = null;
    switch (e) {
      case Models.CreateShapeType.RECT:
        shape = new Rect();
        break;
      default:
        return null;
    }
    shape.CreateElement(this, null);
    return shape;
  }

  CalcWorkArea = () => {

    const parentElem = document.querySelector(this.parentElem);

    // const offset = parentElem.offset();
    const offset = parentElem.getBoundingClientRect();

    this.docInfo.dispX = offset.left;
    this.docInfo.dispY = offset.top;

    // this.docInfo.dispWidth = parentElem.innerWidth();
    // this.docInfo.dispHeight = parentElem.innerHeight();

    this.docInfo.dispWidth = parentElem.clientWidth;
    this.docInfo.dispHeight = parentElem.clientHeight;


    // this.docInfo.scrollX = parentElem.scrollLeft();
    // this.docInfo.scrollY = parentElem.scrollTop();

    this.docInfo.scrollX = parentElem.scrollLeft;
    this.docInfo.scrollY = parentElem.scrollTop;

    this.docInfo.docToScreenScale = (this.docInfo.dispDpiX / this.docInfo.docDpi) * this.docInfo.docScale;
    this.docInfo.docDpiScale = this.docInfo.dispDpiX / this.docInfo.docDpi;
    this.docInfo.docScreenX = this.docInfo.dispX - this.docInfo.scrollX;
    this.docInfo.docScreenY = this.docInfo.dispY - this.docInfo.scrollY;
    this.docInfo.docScreenWidth = this.docInfo.docWidth * this.docInfo.docToScreenScale;
    this.docInfo.docScreenHeight = this.docInfo.docHeight * this.docInfo.docToScreenScale;
    this.docInfo.maxScrollX = Math.max(0, this.docInfo.docScreenWidth - this.docInfo.dispWidth);
    this.docInfo.maxScrollY = Math.max(0, this.docInfo.docScreenHeight - this.docInfo.dispHeight);
    this.docInfo.docVisWidth = Math.min(this.docInfo.dispWidth / this.docInfo.docToScreenScale, this.docInfo.docWidth);
    this.docInfo.docVisHeight = Math.min(this.docInfo.dispHeight / this.docInfo.docToScreenScale, this.docInfo.docHeight);
    this.docInfo.docVisX = Math.min(this.docInfo.scrollX / this.docInfo.docToScreenScale, this.docInfo.docWidth - this.docInfo.docVisWidth);
    this.docInfo.docVisY = Math.min(this.docInfo.scrollY / this.docInfo.docToScreenScale, this.docInfo.docHeight - this.docInfo.docVisHeight);
  }

  ApplyDocumentTransform = (e) => {

    const elementCount = this.ElementCount();
    this.svgObj.attr({
      width: this.docInfo.docScreenWidth,
      height: this.docInfo.docScreenHeight
    });

    if (!e) {
      for (let i = 0; i < elementCount; i++) {
        const element = this.GetElementByIndex(i);
        if (element instanceof /*SDGraphics.Layer*/ Layer) {
          if (element.IsScalingAllowed()) {
            element.svgObj.transform({
              scaleX: this.docInfo.docToScreenScale,
              scaleY: this.docInfo.docToScreenScale
            });
          } else if (element.IsDpiScalingAllowed()) {
            element.svgObj.transform({
              scaleX: this.docInfo.docDpiScale,
              scaleY: this.docInfo.docDpiScale
            });
          }
        }
      }
    }
  }



  GetFormattingLayer = function () {


    return null;

    let formattingLayer = this.GetLayer('__FORMATTING__');

    if (formattingLayer && !formattingLayer.IsDpiScalingAllowed()) {
      formattingLayer = null;
    }

    if (!formattingLayer) {
      formattingLayer = this.AddLayer('__FORMATTING__');
      formattingLayer.AllowDpiScalingOnly(true);
      formattingLayer.ExcludeFromExport(true);
      this.MoveLayer('__FORMATTING__', ""/* LayerMoveType.BOTTOM*/);
      formattingLayer.SetOpacity(0);
      this.ApplyDocumentTransform();
    }

    return formattingLayer;



  };

}

export default Document;
