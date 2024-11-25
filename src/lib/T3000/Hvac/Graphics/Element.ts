import * as Utils from '../Hvac.Utils';
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










    if (this.geometryBBox.width < 0 || this.geometryBBox.height < 0) {
      let formattingLayer = this.doc.GetFormattingLayer();
      let position = {
        x: this.svgObj.trans.x,
        y: this.svgObj.trans.y
      };
      let rotation = this.svgObj.trans.rotation;
      let parent = this.svgObj.parent;
      let index = 0;

      if (parent) {
        index = this.svgObj.position();
        parent.remove(this.svgObj);
      }

      formattingLayer.svgObj.add(this.svgObj);
      this.svgObj.transform({ x: 0, y: 0, rotation: 0 });

      let bbox = this.svgObj.rbox();
      formattingLayer.svgObj.remove(this.svgObj);

      let docCoords = this.doc.ConvertWindowToDocCoords(bbox.x, bbox.y);
      this.geometryBBox.x = docCoords.x;
      this.geometryBBox.y = docCoords.y;
      this.geometryBBox.width = bbox.width;
      this.geometryBBox.height = bbox.height;

      this.svgObj.transform({ x: position.x, y: position.y, rotation: rotation });

      if (parent) {
        parent.add(this.svgObj, index);
      }

      this.UpdateTransform();
    }
    return this.geometryBBox;















  }




  CalcElementFrame = (e) => {











    const t = this.GetGeometryBBox();
    const a = {
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height
    };
    let r = this.svgObj;
    while (r && r !== this.doc.svgObj) {
      a.x += r.trans.x;
      a.y += r.trans.y;
      r = r.parent;
      if (e) break;
    }
    return a;













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

  UpdatePattern = (e, t) => {
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

  UpdateGradient = (e, t) => {

  }

  RefreshPaint = (e) => {

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

    // Double TODO
    // if (e && this instanceof Group) {
    //   const elementCount = this.ElementCount();
    //   for (let i = 0; i < elementCount; i++) {
    //     const element = this.GetElementByIndex(i);
    //     if (element) {
    //       element.RefreshPaint(e);
    //     }
    //   }
    // }
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

}

export default Element;
