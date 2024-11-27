import { SVG, Line, create, Svg } from "@svgdotjs/svg.js";
import HvacSVG from '../Hvac.SVG';
import Container from "./Container";
import Rect from "./Rect";
import Layer from "./Layer";
import Models from '../Hvac.Models';
import Path from './Path';
import Text from './Text';

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
      this.parentElem = this.parentElem
    }

    console.log('Document parentElem', this.parentElem);
    this.svgObj = HvacSVG.svg(this.parentElem);

    console.log('Document parentElem this.svgObj', this.svgObj);

    const svgT1 = SVG("#" + this.parentElem);
    console.log('Document parentElem svgT1', svgT1);

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

  SetDocumentLayer = (e) => {
    this.documentLayerID = e;
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

    this.docInfo.dispWidth = document.getElementById(this.parentElem).clientWidth;
    this.docInfo.dispHeight = document.getElementById(this.parentElem).clientHeight;
  }

  CreateShape = (shapeType) => {

    let shape = null;
    switch (shapeType) {
      case Models.CreateShapeType.RECT:
        shape = new Rect();
        break;
      case Models.CreateShapeType.RRECT:
        // shape = new RRect;
        break;
      case Models.CreateShapeType.OVAL:
        // shape = new Oval;
        break;
      case Models.CreateShapeType.LINE:
        // shape = new Line;
        break;
      case Models.CreateShapeType.POLYLINE:
        // shape = new PolyLine;
        break;
      case Models.CreateShapeType.POLYPOLYLINE:
        // shape = new PolyPolyLine;
        break;
      case Models.CreateShapeType.POLYLINECONTAINER:
        // shape = new PolyLine;
        break;
      case Models.CreateShapeType.POLYGON:
        // shape = new Polygon;
        break;
      case Models.CreateShapeType.PATH:
        shape = new Path();
        break;
      case Models.CreateShapeType.TEXT:
        shape = new Text();
        break;
      case Models.CreateShapeType.IMAGE:
        // shape = new Image;
        break;
      case Models.CreateShapeType.GROUP:
        // shape = new Group;
        break;
      case Models.CreateShapeType.LAYER:
        shape = new Layer();
        break;
      case Models.CreateShapeType.SYMBOL:
        // shape = new Symbol;
        break;
      case Models.CreateShapeType.SHAPECOPY:
        // shape = new ShapeCopy;
        break;
      case Models.CreateShapeType.SHAPECONTAINER:
        // shape = new ShapeContainer;
        break;
      default:
        break;
    }

    shape.CreateElement(this, null);

    return shape;
  }

  CalcWorkArea = () => {
    var parentElemRect = document.getElementById(this.parentElem).getBoundingClientRect();
    this.docInfo.dispX = parentElemRect.left;
    this.docInfo.dispY = parentElemRect.top;
    this.docInfo.dispWidth = parentElemRect.width;
    this.docInfo.dispHeight = parentElemRect.height;
    this.docInfo.scrollX = document.getElementById(this.parentElem).scrollLeft;
    this.docInfo.scrollY = document.getElementById(this.parentElem).scrollTop;
    this.docInfo.docToScreenScale = this.docInfo.dispDpiX / this.docInfo.docDpi * this.docInfo.docScale;
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

  ConvertWindowToDocCoords = (e, t) => {
    return {
      x: (e - this.docInfo.docScreenX) / this.docInfo.docToScreenScale,
      y: (t - this.docInfo.docScreenY) / this.docInfo.docToScreenScale
    }
  }

  ConvertDocToWindowCoords = (e, t) => {
    return {
      x: e * this.docInfo.docToScreenScale + this.docInfo.docScreenX,
      y: t * this.docInfo.docToScreenScale + this.docInfo.docScreenY
    }
  }

  SetDocumentScale = (e) => {
    this.SetDocumentMetrics({
      scale: e
    })
  }

  ApplyDocumentTransform = (e) => {
    var t, a, r = this.ElementCount();
    if (this.svgObj.attr({
      width: this.docInfo.docScreenWidth,
      height: this.docInfo.docScreenHeight
    }),
      !e)
      for (a = 0; a < r; a++)
        (t = this.GetElementByIndex(a)) instanceof Layer && (t.IsScalingAllowed() ? t.svgObj.transform({
          scaleX: this.docInfo.docToScreenScale,
          scaleY: this.docInfo.docToScreenScale
        }) : t.IsDpiScalingAllowed() && t.svgObj.transform({
          scaleX: this.docInfo.docDpiScale,
          scaleY: this.docInfo.docDpiScale
        }))
  }

  SetDocumentSize = (width: number, height: number) => {
    this.SetDocumentMetrics({
      width: width,
      height: height
    });
  }

  SetDocumentMetrics = function (e) {
    this.docInfo.docWidth = e.width || this.docInfo.docWidth;
    this.docInfo.docHeight = e.height || this.docInfo.docHeight;
    this.docInfo.docDpi = e.dpi || this.docInfo.docDpi;
    this.docInfo.docScale = e.scale || this.docInfo.docScale;
    this.CalcWorkArea();
    this.ApplyDocumentTransform();
  }

  GetFormattingLayer = function () {
    let formattingLayer = this.GetLayer('__FORMATTING__');

    if (formattingLayer && !formattingLayer.IsDpiScalingAllowed()) {
      formattingLayer = null;
    }

    if (!formattingLayer) {
      formattingLayer = this.AddLayer('__FORMATTING__');
      formattingLayer.AllowDpiScalingOnly(true);
      formattingLayer.ExcludeFromExport(true);
      this.MoveLayer('__FORMATTING__', "");
      formattingLayer.SetOpacity(0);
      this.ApplyDocumentTransform();
    }

    return formattingLayer;
  }

  AddLayer = (e) => {
    const layer = this.CreateShape(Models.CreateShapeType.LAYER);
    layer.SetID(e);
    this.AddElement(layer, null);
    this.ApplyDocumentTransform(e);

    layer.svgObj.node.setAttribute("layerID", e);
    return layer;
  }

  GetLayer = (e) => {
    let layer = null;
    const elementCount = this.ElementCount();
    for (let i = 0; i < elementCount; i++) {
      const element = this.GetElementByIndex(i);
      if (element instanceof Layer && element.GetID() === e) {
        layer = element;
        break;
      }
    }
    return layer;
  }

  MoveLayer = function (e, t, a) {
    const layer = this.GetLayer(e);
    if (!layer) return;

    const currentIndex = this.GetElementIndex(layer);
    const totalElements = this.ElementCount() - 1;
    let targetIndex = totalElements;
    let referenceIndex = 0;
    let referenceLayer = null;

    if (a) {
      referenceLayer = this.GetLayer(a);
      if (referenceLayer) {
        referenceIndex = this.GetElementIndex(referenceLayer);
        if (currentIndex < referenceIndex) {
          referenceIndex--;
        }
      }
    }

    switch (t) {
      case Models.LayerMoveType.BOTTOM:
        targetIndex = 0;
        break;
      case Models.LayerMoveType.BEFORE:
        targetIndex = referenceIndex;
        break;
      case Models.LayerMoveType.AFTER:
        targetIndex = referenceIndex + 1;
        break;
      case Models.LayerMoveType.TOP:
        targetIndex = totalElements;
        break;
    }

    if (targetIndex !== currentIndex) {
      this.RemoveElement(layer);
      this.AddElement(layer, targetIndex);
    }
  }

  SetDocumentDPI(dpi: number) {
    this.SetDocumentMetrics({ dpi });
  }

  ImageLoad_ResetRefCount = () => {
    this.imageLoadRefCount = 0;
  }

  GetWorkArea = () => {
    return this.docInfo;
  }

  CalcScaleToFit = function (e, t, a, r) {
    var i, n, o;
    return a || (a = this.docInfo.docWidth),
      r || (r = this.docInfo.docHeight),
      (n = e / (a *= i = this.docInfo.dispDpiX / this.docInfo.docDpi)) > (o = t / (r *= i)) && (n = o),
      n > 1 && (n = 1),
    {
      scale: n,
      width: this.docInfo.docWidth * i * n,
      height: this.docInfo.docHeight * i * n
    }
  }
}

export default Document;
