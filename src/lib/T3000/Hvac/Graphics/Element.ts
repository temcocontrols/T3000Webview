import { utils } from '@svgdotjs/svg.js';
import * as Utils from '../Hvac.Utils';
// import Group from './Group';
// import Group from './Group';

class Element {

  public doc: any;
  public parent: any;
  public svgObj: any;
  public ID: any;
  public style: any;
  public effects: any;
  public userData: any;
  public cursor: any;
  public strokeWidth: number;
  public mirrored: boolean;
  public flipped: boolean;
  public geometryBBox: any;
  public fillPatternData: any;
  public strokePatternData: any;
  public internalID: any;
  public fillGradientData: any;
  public strokeGradientData: any;
  public strokeDashArray: any;
  public lineColors: any;

  constructor() {
    // this.InitElement(null, null);
  }

  public InitElement = (element, parent) => {
    this.doc = element;
    this.parent = parent;
    this.svgObj.SDGObj = this;
    this.ID = null;
    this.style = null;
    this.effects = null;
    this.userData = null;
    this.cursor = null;
    this.strokeWidth = 0;
    this.mirrored = !1;
    this.flipped = !1;
    this.geometryBBox = {};
    this.geometryBBox.x = 0;
    this.geometryBBox.y = 0;
    this.geometryBBox.width = - 1;
    this.geometryBBox.height = - 1;
    this.fillPatternData = null;
    this.strokePatternData = null;
    this.internalID = null;
  }

  CreateElement = (element, parent) => {
    this.InitElement(element, parent)
  }

  Document = () => {
    return this.doc
  }

  Parent = () => {
    return this.parent
  }

  DOMElement = () => {
    return this.svgObj ? this.svgObj.node : null
  }

  SetEventBehavior = (e) => {
    this.svgObj.attr("pointer-events", e);
  }

  InDocument = () => {
    if (!this.svgObj) return false;
    for (var e = this.svgObj.parent; e;) {
      if ('svg' == e.type) return true;
      e = e.parent
    }
    return false
  }

  GetScaleElement = () => {
    return this.svgObj
  }

  GetGeometryBBox = () => {
    if (this.geometryBBox.width >= 0 && this.geometryBBox.height >= 0) {
      return this.geometryBBox;
    }

    const formattingLayer = this.doc.GetFormattingLayer();
    const initialTransform = {
      x: this.svgObj.trans.x,
      y: this.svgObj.trans.y,
      rotation: this.svgObj.trans.rotation
    };

    let parent = this.svgObj.parent;
    let position = 0;

    if (parent) {
      position = this.svgObj.position();
      parent.remove(this.svgObj);
    }

    formattingLayer.svgObj.add(this.svgObj);
    this.svgObj.transform({ x: 0, y: 0, rotation: 0 });

    const bbox = this.svgObj.rbox();
    formattingLayer.svgObj.remove(this.svgObj);

    const docCoords = this.doc.ConvertWindowToDocCoords(bbox.x, bbox.y);
    this.geometryBBox = {
      x: docCoords.x,
      y: docCoords.y,
      width: bbox.width,
      height: bbox.height
    };

    this.svgObj.transform(initialTransform);

    if (parent) {
      parent.add(this.svgObj, position);
    }

    this.UpdateTransform();
    return this.geometryBBox;
  }

  SetCursor = (cursor) => {
    this.cursor = cursor;
    if (cursor) {
      this.svgObj.node.setAttribute("class", cursor);
    } else {
      this.svgObj.node.removeAttribute("class");
    }
  }

  CalcElementFrame = (includeTransforms) => {
    const geometryBBox = this.GetGeometryBBox();
    const frame = {
      x: geometryBBox.x,
      y: geometryBBox.y,
      width: geometryBBox.width,
      height: geometryBBox.height
    };

    let currentElement = this.svgObj;
    while (currentElement && currentElement !== this.doc.svgObj && !includeTransforms) {
      frame.x += currentElement.trans.x;
      frame.y += currentElement.trans.y;
      currentElement = currentElement.parent;
    }

    return frame;
  }


  CalcBBox = () => {
    const frame = this.CalcElementFrame(true);
    frame.x = frame.x + frame.width / 2;
    frame.y = frame.y + frame.height / 2;
    return frame;
  }

  UpdateTransform = () => {
    let formattingLayer = null;
    if (!this.parent) {
      formattingLayer = this.doc.GetFormattingLayer();
      formattingLayer?.AddElement(this);
    }

    const scaleElement = this.GetScaleElement();
    scaleElement.transform({});

    if (this.mirrored || this.flipped) {
      const bbox = this.CalcBBox();
      const scaleX = scaleElement.trans.scaleX || 1;
      const scaleY = scaleElement.trans.scaleY || 1;
      let matrix = scaleElement.node.transform.baseVal.consolidate().matrix;

      bbox.width /= scaleX;
      bbox.height /= scaleY;

      if (this.mirrored) {
        matrix = matrix.flipX().translate(-bbox.width, 0);
      }

      if (this.flipped) {
        matrix = matrix.flipY().translate(0, -bbox.height);
      }

      const transformString = `matrix(${Utils.RoundCoord(matrix.a)} ${Utils.RoundCoord(matrix.b)} ${Utils.RoundCoord(matrix.c)} ${Utils.RoundCoord(matrix.d)} ${Utils.RoundCoord(matrix.e)} ${Utils.RoundCoord(matrix.f)})`;
      scaleElement.attr("transform", transformString);
    }

    if (formattingLayer) {
      formattingLayer.RemoveElement(this);
    }

    this.CleanGraphics();
  }

  CleanGraphics = () => {
    // TODO
  }

  UpdateImagePattern = (e) => { }

  UpdateTexturePattern = (e) => { }

  protected UpdatePattern = (e, t) => {
    let patternData;
    if ((patternData = t ? this.fillPatternData : this.strokePatternData) && patternData.ID === e) {
      if (!patternData.patternElem) {
        patternData.patternElem = null;// new SVG.Pattern();
        patternData.imageElem = null;// new SVG.Image();
        patternData.imageElem.load(patternData.url);
        patternData.patternElem.add(patternData.imageElem);
        patternData.patternElem.attr('id', patternData.ID);
        this.svgObj.add(patternData.patternElem, 0);
      }

      if (patternData.isImage) {
        this.UpdateImagePattern(patternData);
      } else if (patternData.isTexture) {
        this.UpdateTexturePattern(patternData);
      }

      if (t) {
        this.svgObj.attr('fill', `url(#${patternData.ID})`);
      } else {
        this.svgObj.attr('stroke', `url(#${patternData.ID})`);
      }
    }
  }

  protected UpdateGradient = (e, t) => {

  }

  protected RefreshPaint = (e) => {
    if (this.fillPatternData) {
      this.UpdatePattern(this.fillPatternData.ID, true);
    } else if (this.fillGradientData) {
      this.UpdateGradient(this.fillGradientData.ID, true);
    }

    if (this.strokePatternData) {
      this.UpdatePattern(this.strokePatternData.ID, false);
    } else if (this.strokeGradientData) {
      this.UpdateGradient(this.strokeGradientData.ID, false);
    }

    /*
    if (e && this instanceof Group) {
      const elementCount = this.ElementCount();
      for (let i = 0; i < elementCount; i++) {
        const element = this.GetElementByIndex(i);
        if (element) {
          element.RefreshPaint(e);
        }
      }
    }
    */
  }


  SetFillOpacity = (e) => {
    this.svgObj.attr('fill-opacity', e)
  }

  SetStrokeOpacity = (e) => {
    this.svgObj.attr('stroke-opacity', e)
  }

  SetFillRule = (e) => {
    this.svgObj.attr('fill-rule', e)
  }


  SetStrokeWidth = (e) => {



    this.svgObj.attr('stroke-width', e);

    if (isNaN(e)) {
      e = null; //Graphics.Symbol.ParsePlaceholder(e, Graphics.Symbol.Placeholder.LineThick);
    }

    this.strokeWidth = Number(e);
    this.svgObj.attr('stroke-dasharray', this.GetStrokePatternForWidth());

  }

  SetStrokePattern = (e) => {
    this.strokeDashArray = e;
    this.svgObj.attr('stroke-dasharray', this.GetStrokePatternForWidth());
  }

  GetID = function () {
    return this.ID
  }

  SetID = function (e) {
    this.ID = e
  }

  GetBBox = () => {
    let bbox = null;

    if (!this.parent) {
      const formattingLayer = this.doc.GetFormattingLayer();
      formattingLayer.AddElement(this);
      bbox = this.svgObj.bbox();
      formattingLayer.RemoveElement(this);
    } else {
      bbox = this.svgObj.bbox();
    }

    return bbox;
  }

  GetStrokePatternForWidth = () => {
    if (!this.strokeDashArray || !this.strokeWidth) {
      return 'none';
    }

    const dashArray = this.strokeDashArray.split(',').map(value => {
      return parseFloat(value) * this.strokeWidth;
    });

    return dashArray.join(',');
  }

  SetOpacity = (e) => {
    this.svgObj.attr('opacity', e);
  }

  ExcludeFromExport = (e) => {
    if (e) {
      this.svgObj.node.setAttribute("no-export", "1");
    } else {
      this.svgObj.node.removeAttribute("no-export");
    }
  }

  SetPos = (x, y) => {
    x = Utils.RoundCoord(x);
    y = Utils.RoundCoord(y);
    this.svgObj.transform({ x, y });

    var rt = this.GetRotation();
    if (rt) {
      this.SetRotation(rt, x, y);
    }

    this.UpdateTransform();
    this.RefreshPaint(true);
  }

  GetPos = () => {
    return {
      x: this.svgObj.trans.x,
      y: this.svgObj.trans.y
    };
  }

  GetRotation = () => {
    return this.svgObj.trans.rotation;
  }

  SetRotation = (angle, cx, cy) => {
    const bbox = this.CalcBBox();
    cx = cx !== undefined ? Utils.RoundCoord(cx) : Utils.RoundCoord(bbox.x);
    cy = cy !== undefined ? Utils.RoundCoord(cy) : Utils.RoundCoord(bbox.y);
    angle = Utils.RoundCoord(angle);

    this.svgObj.transform({
      rotation: angle,
      cx: cx,
      cy: cy
    });

    this.UpdateTransform();
  }

  SetStrokeColor = (color) => {
    this.svgObj.attr("stroke", color);
    this.ClearColorData(false);
  }



  ClearColorData = (isFill) => {
    let patternData, gradientData;

    if (isFill) {
      patternData = this.fillPatternData;
      gradientData = this.fillGradientData;
    } else {
      patternData = this.strokePatternData;
      gradientData = this.strokeGradientData;
    }

    if (patternData && patternData.patternElem) {
      this.svgObj.remove(patternData.patternElem);
      patternData.patternElem = null;
      patternData.imageElem = null;
    }

    if (gradientData && gradientData.gradientElem) {
      this.svgObj.remove(gradientData.gradientElem);
      gradientData.gradientElem = null;
    }

    if (isFill) {
      this.fillPatternData = null;
      this.fillGradientData = null;
    } else {
      this.strokePatternData = null;
      this.strokeGradientData = null;
    }
  }

  SetFillColor = (color) => {
    this.svgObj.attr("fill", color);
    this.ClearColorData(true);
  }

  SetCustomAttribute = (attributeName, value) => {
    if (value) {
      this.svgObj.node.setAttribute(attributeName, value);
    } else {
      this.svgObj.node.removeAttribute(attributeName);
    }
  }

  GetVisible = function () {
    return this.svgObj.visible()
  }

  SetVisible = (isVisible) => {
    if (isVisible) {
      this.svgObj.show();
    } else {
      this.svgObj.hide();
    }
  }
}

export default Element;
