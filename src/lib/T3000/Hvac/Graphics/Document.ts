import HvacSVG from '../Hvac.SVG';
import Container from "./Container";
import Rect from "./Rect";
import Layer from "./Layer";
import Models from '../Hvac.Models';
import Path from './Path';
import Text from './Text';
import * as Utils from '../Hvac.Utils';
import Formatter from './Text.Formatter';

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
  public activeEdit: any;
  public documentLayerID: any;
  public textMetricsCache: any;
  public svgObj: any;

  constructor(elementId: string) {
    super();

    this.parentElem = elementId;

    this.svgObj = HvacSVG.svg(this.parentElem);

    const svgT1 = HvacSVG("#" + this.parentElem);
    console.log('Document parentElem svgT1', svgT1);


    this.InitDocInfo();
    this.activeEdit = null;
    this.documentLayerID = null;
    this.InitElement(this, null);
    this.InitializeContainer();
    this.textMetricsCache = {};
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

  SetDocumentLayer = (layerID: string) => {
    this.documentLayerID = layerID;
  }

  GetDeviceInfo = () => {
    let shape = this.CreateShape(Models.CreateShapeType.RECT);

    console.log('Document GetDeviceInfo 1 shape', shape);

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

    console.log('Document CreateElement 4 shape', this);
    console.log('Document CreateElement 5 shape', shape);

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

  ConvertWindowToDocCoords = (x: number, y: number) => {
    return {
      x: (x - this.docInfo.docScreenX) / this.docInfo.docToScreenScale,
      y: (y - this.docInfo.docScreenY) / this.docInfo.docToScreenScale
    };
  }

  ConvertDocToWindowCoords = (docX: number, docY: number) => {
    return {
      x: docX * this.docInfo.docToScreenScale + this.docInfo.docScreenX,
      y: docY * this.docInfo.docToScreenScale + this.docInfo.docScreenY
    };
  }

  SetDocumentScale = (scale: number) => {
    this.SetDocumentMetrics({
      scale: scale
    });
  }

  ApplyDocumentTransform = (layerID) => {
    const elementCount = this.ElementCount();
    this.svgObj.attr({
      width: this.docInfo.docScreenWidth,
      height: this.docInfo.docScreenHeight
    });

    if (!layerID) {
      for (let i = 0; i < elementCount; i++) {
        const element = this.GetElementByIndex(i);
        if (element instanceof Layer) {
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

  SetDocumentSize = (width: number, height: number) => {
    this.SetDocumentMetrics({
      width: width,
      height: height
    });
  }

  SetDocumentMetrics = (metrics: { width?: number, height?: number, dpi?: number, scale?: number }) => {
    this.docInfo.docWidth = metrics.width ?? this.docInfo.docWidth;
    this.docInfo.docHeight = metrics.height ?? this.docInfo.docHeight;
    this.docInfo.docDpi = metrics.dpi ?? this.docInfo.docDpi;
    this.docInfo.docScale = metrics.scale ?? this.docInfo.docScale;
    this.CalcWorkArea();
    this.ApplyDocumentTransform(null);
  }

  GetFormattingLayer = () => {
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
      this.ApplyDocumentTransform(null);
    }

    return formattingLayer;
  }

  AddLayer = (layerID: string) => {
    const layer = this.CreateShape(Models.CreateShapeType.LAYER);

    layer.SetID(layerID);
    this.AddElement(layer, null);
    this.ApplyDocumentTransform(layerID);

    layer.svgObj.data("id", Utils.GenerateUUID());
    return layer;
  }

  GetLayer = (layerID: string): Layer | null => {
    for (let i = 0; i < this.ElementCount(); i++) {
      const element = this.GetElementByIndex(i);
      if (element instanceof Layer && element.GetID() === layerID) {
        return element;
      }
    }
    return null;
  }

  MoveLayer = (layerID: string, moveType: any, referenceLayerID?: string) => {
    const layer = this.GetLayer(layerID);
    if (!layer) return;

    const currentIndex = this.GetElementIndex(layer);
    const totalElements = this.ElementCount() - 1;
    let targetIndex = totalElements;
    let referenceIndex = 0;
    let referenceLayer = null;

    if (referenceLayerID) {
      referenceLayer = this.GetLayer(referenceLayerID);
      if (referenceLayer) {
        referenceIndex = this.GetElementIndex(referenceLayer);
        if (currentIndex < referenceIndex) {
          referenceIndex--;
        }
      }
    }

    switch (moveType) {
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

  GetWorkArea = () => {
    return this.docInfo;
  }

  CalcScaleToFit = (width: number, height: number, docWidth?: number, docHeight?: number) => {
    let scale: number;
    let adjustedDocWidth = docWidth || this.docInfo.docWidth;
    let adjustedDocHeight = docHeight || this.docInfo.docHeight;
    const dpiScale = this.docInfo.dispDpiX / this.docInfo.docDpi;

    adjustedDocWidth *= dpiScale;
    adjustedDocHeight *= dpiScale;

    const widthScale = width / adjustedDocWidth;
    const heightScale = height / adjustedDocHeight;

    scale = Math.min(widthScale, heightScale);
    if (scale > 1) scale = 1;

    return {
      scale: scale,
      width: this.docInfo.docWidth * dpiScale * scale,
      height: this.docInfo.docHeight * dpiScale * scale
    };
  }

  CalcStyleMetrics = (style) => {
    const textCache = this.GetTextCacheForStyle(style);
    return Utils.CopyObj(textCache.metrics);
  }

  GetTextCacheForStyle = (style) => {
    const styleID = new Formatter(null).MakeIDFromStyle(style);
    let cache = this.textMetricsCache[styleID];

    if (!cache) {
      cache = {
        metrics: new Formatter(null).CalcStyleMetrics(style, this),
        textCache: {}
      };
      this.textMetricsCache[styleID] = cache;
    }

    return cache;
  }

  MapFont = (fontName: string, category: string = 'sanserif'): string => {
    return `'${fontName}'`;
  }

  GetTextRunCache(style: any, text: any) {
    const textCache = this.GetTextCacheForStyle(style);
    if (typeof text !== "symbol") {
      text = Symbol.for(text);
    }
    let cache = textCache.textCache[text];
    if (!cache) {
      const length = Symbol.keyFor(text).length;
      cache = {
        startOffsets: new Array(length),
        endOffsets: new Array(length)
      };
      textCache.textCache[text] = cache;
    }
    return cache;
  }
}

export default Document;
