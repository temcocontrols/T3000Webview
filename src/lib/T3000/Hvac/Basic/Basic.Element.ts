

import $ from "jquery";
import HvacSVG from "../Helper/SVG.t2";
import Effects from "./Basic.Element.Effects"
import Style from "./Basic.Element.Style";
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import GlobalData from '../Data/GlobalData'
import Instance from "../Data/Instance/Instance";
import ConstantData from "../Data/ConstantData"
import BasicConstants from "./Basic.Constants";

class Element {

  public doc: any;
  public parent: any;
  public svgObj: any;
  public ID: any;
  public style: any;
  public effects: any;
  public userData: any;
  public cursor: any;
  public strokeWidth: any;
  public mirrored: any;
  public flipped: any;
  public geometryBBox: any;
  public fillPatternData: any;
  public strokePatternData: any;
  public internalID: any;
  public eventProxy: any;
  public fillGradientData: any;
  public strokeGradientData: any;
  public strokeDashArray: string;

  constructor() {
    this.doc = null;
    this.parent = null;
    this.svgObj = null;
  }

  InitElement(svgDoc: any, parent: any) {
    console.log('= B.Element.InitElement: input =>', { svgDoc, parent });

    this.doc = svgDoc;
    this.parent = parent;
    this.svgObj.SDGObj = this;
    this.ID = null;
    this.style = null;
    this.effects = null;
    this.userData = null;
    this.cursor = null;
    this.strokeWidth = 0;
    this.mirrored = false;
    this.flipped = false;
    this.geometryBBox = {
      x: 0,
      y: 0,
      width: -1,
      height: -1
    };
    this.fillPatternData = null;
    this.strokePatternData = null;
    this.internalID = null;

    console.log('= B.Element.InitElement: output =>', {
      doc: this.doc,
      parent: this.parent,
      ID: this.ID,
      style: this.style,
      effects: this.effects,
      userData: this.userData,
      cursor: this.cursor,
      strokeWidth: this.strokeWidth,
      mirrored: this.mirrored,
      flipped: this.flipped,
      geometryBBox: this.geometryBBox,
      fillPatternData: this.fillPatternData,
      strokePatternData: this.strokePatternData,
      internalID: this.internalID
    });
  }

  CreateElement(svgDocument: any, parentElement: any) {
    console.log('= B.Element.CreateElement: input =>', { svgDocument, parentElement });
    const result = this.InitElement(svgDocument, parentElement);
    console.log('= B.Element.CreateElement: output =>', result);
    throw result;
  }

  Document() {
    console.log('= B.Element.Document: input =>', {});
    const result = this.doc;
    console.log('= B.Element.Document: output =>', { result });
    return result;
  }

  Parent() {
    console.log('= B.Element.Parent: input =>', {});
    const result = this.parent;
    console.log('= B.Element.Parent: output =>', { result });
    return result;
  }

  DOMElement() {
    console.log('= B.Element.DOMElement: input =>', {});
    const result = this.svgObj ? this.svgObj.node : null;
    console.log('= B.Element.DOMElement: output =>', { result });
    return result;
  }

  InDocument() {
    console.log('= B.Element.InDocument: input =>', {});
    if (!this.svgObj) {
      const result = false;
      console.log('= B.Element.InDocument: output =>', { result });
      return result;
    }
    let parent = this.svgObj.parent;
    while (parent) {
      if (parent.type === 'svg') {
        const result = true;
        console.log('= B.Element.InDocument: output =>', { result });
        return result;
      }
      parent = parent.parent;
    }
    const result = false;
    console.log('= B.Element.InDocument: output =>', { result });
    return result;
  }

  SetID(newID: string) {
    console.log('= B.Element.SetID: input =>', { newID });
    this.ID = newID;
    console.log('= B.Element.SetID: output =>', { ID: this.ID });
  }

  ExcludeFromExport(shouldExclude: boolean) {
    console.log('= B.Element.ExcludeFromExport: input =>', { shouldExclude });
    if (shouldExclude) {
      this.svgObj.node.setAttribute('no-export', '1');
    } else {
      this.svgObj.node.removeAttribute('no-export');
    }
    console.log('= B.Element.ExcludeFromExport: output =>', {});
  }

  SetCustomAttribute(attributeName: string, value: string) {
    console.log('= B.Element.SetCustomAttribute: input =>', { attributeName, value });
    if (value) {
      this.svgObj.node.setAttribute(attributeName, value);
    } else {
      this.svgObj.node.removeAttribute(attributeName);
    }
    console.log('= B.Element.SetCustomAttribute: output =>', { attributeName, value });
  }

  GetCustomAttribute(attributeName: string) {
    console.log('= B.Element.GetCustomAttribute: input =>', { attributeName });
    const result = this.svgObj.node.getAttribute(attributeName);
    console.log('= B.Element.GetCustomAttribute: output =>', { result });
    return result;
  }

  SetHyperlinkAttribute(hyperlink: string) {
    console.log('= B.Element.SetHyperlinkAttribute: input =>', { hyperlink });
    const resolvedHyperlink = Utils1.ResolveHyperlink(hyperlink);
    if (resolvedHyperlink) {
      this.SetCustomAttribute('_explink_', resolvedHyperlink);
    }
    console.log('= B.Element.SetHyperlinkAttribute: output =>', { resolvedHyperlink });
  }

  GetID() {
    console.log('= B.Element.GetID: input =>', {});
    const result = this.ID;
    console.log('= B.Element.GetID: output =>', { result });
    return result;
  }

  GetInternalID() {
    console.log('= B.Element.GetInternalID: input =>', {});
    const result = this.internalID || (this.internalID = Utils1.MakeGuid());
    console.log('= B.Element.GetInternalID: output =>', { result });
    return result;
  }

  SetInternalID() {
    console.log('= B.Element.SetInternalID: input =>', {});
    const internalID = this.GetInternalID();
    this.svgObj.attr('id', internalID);
    console.log('= B.Element.SetInternalID: output =>', { internalID });
    return internalID;
  }


  SetUserData(userData: any) {
    console.log('= B.Element.SetUserData: input =>', { userData });
    this.userData = userData;
    console.log('= B.Element.SetUserData: output =>', { userData: this.userData });
  }

  GetUserData() {
    console.log('= B.Element.GetUserData: input =>', {});
    const result = this.userData;
    console.log('= B.Element.GetUserData: output =>', { result });
    return result;
  }

  SetEventProxy(eventProxy: any) {
    console.log('= B.Element.SetEventProxy: input =>', { eventProxy });
    this.eventProxy = eventProxy;
    console.log('= B.Element.SetEventProxy: output =>', { eventProxy: this.eventProxy });
  }

  GetEventProxy() {
    console.log('= B.Element.GetEventProxy: input =>', {});
    const result = this.eventProxy;
    console.log('= B.Element.GetEventProxy: output =>', { result });
    return result;
  }

  SetSize(width: number, height: number) {
    console.log('= B.Element.SetSize: input =>', { width, height });

    width = Utils1.RoundCoord(width);
    height = Utils1.RoundCoord(height);

    this.svgObj.size(width, height);
    this.UpdateTransform();

    this.geometryBBox.width = width;
    this.geometryBBox.height = height;

    this.RefreshPaint();

    console.log('= B.Element.SetSize: output =>', { width, height });
  }

  SetPos(x: number, y: number) {
    console.log('= B.Element.SetPos: input =>', { x, y });

    x = Utils1.RoundCoord(x);
    y = Utils1.RoundCoord(y);

    this.svgObj.transform({ x, y });

    if (this.GetRotation()) {
      this.SetRotation(this.GetRotation());
    }

    this.UpdateTransform();
    this.RefreshPaint(true);

    console.log('= B.Element.SetPos: output =>', { x, y });
  }

  GetPos() {
    console.log('= B.Element.GetPos: input =>', {});
    const result = {
      x: this.svgObj.trans.x,
      y: this.svgObj.trans.y
    };
    console.log('= B.Element.GetPos: output =>', { result });
    return result;
  }

  SetCenter(x: number, y: number) {
    console.log('= B.Element.SetCenter: input =>', { x, y });

    const bbox = this.CalcBBox();
    const newX = x - bbox.width / 2;
    const newY = y - bbox.height / 2;

    this.SetPos(newX, newY);

    console.log('= B.Element.SetCenter: output =>', { newX, newY });
  }

  SetRotation(angle: number, centerX?: number, centerY?: number) {
    console.log('= B.Element.SetRotation: input =>', { angle, centerX, centerY });

    let bbox;
    if (centerX === undefined) {
      bbox = this.CalcBBox();
      centerX = bbox.cx;
    }
    if (centerY === undefined) {
      bbox = bbox || this.CalcBBox();
      centerY = bbox.cy;
    }

    centerX = Utils1.RoundCoord(centerX);
    centerY = Utils1.RoundCoord(centerY);
    angle = Utils1.RoundCoord(angle);

    this.svgObj.transform({
      rotation: angle,
      cx: centerX,
      cy: centerY
    });

    this.UpdateTransform();

    console.log('= B.Element.SetRotation: output =>', { angle, centerX, centerY });
  }

  GetRotation() {
    console.log('= B.Element.GetRotation: input =>', {});
    const result = this.svgObj.trans.rotation;
    console.log('= B.Element.GetRotation: output =>', { result });
    return result;
  }

  SetMirror(mirrored: boolean) {
    console.log('= B.Element.SetMirror: input =>', { mirrored });
    this.mirrored = mirrored;
    this.UpdateTransform();
    console.log('= B.Element.SetMirror: output =>', { mirrored: this.mirrored });
  }

  GetMirror() {
    console.log('= B.Element.GetMirror: input =>', {});
    const result = this.mirrored;
    console.log('= B.Element.GetMirror: output =>', { result });
    return result;
  }

  SetFlip(flipped: boolean) {
    console.log('= B.Element.SetFlip: input =>', { flipped });
    this.flipped = flipped;
    this.UpdateTransform();
    console.log('= B.Element.SetFlip: output =>', { flipped: this.flipped });
  }

  GetFlip() {
    console.log('= B.Element.GetFlip: input =>', {});
    const result = this.flipped;
    console.log('= B.Element.GetFlip: output =>', { result });
    return result;
  }

  SetScale(scaleX: number, scaleY: number) {
    console.log('= B.Element.SetScale: input =>', { scaleX, scaleY });

    this.GetScaleElement().transform({
      scaleX,
      scaleY
    });

    this.UpdateTransform();

    console.log('= B.Element.SetScale: output =>', { scaleX, scaleY });
  }

  GetScale() {
    console.log('= B.Element.GetScale: input =>', {});
    const scaleElement = this.GetScaleElement();
    const result = {
      scaleX: scaleElement.trans.scaleX || 1,
      scaleY: scaleElement.trans.scaleY || 1
    };
    console.log('= B.Element.GetScale: output =>', { result });
    return result;
  }

  SetVisible(isVisible: boolean) {
    console.log('= B.Element.SetVisible: input =>', { isVisible });
    if (isVisible) {
      this.svgObj.show();
    } else {
      this.svgObj.hide();
    }
    console.log('= B.Element.SetVisible: output =>', { isVisible });
  }

  GetVisible() {
    console.log('= B.Element.GetVisible: input =>', {});
    const result = this.svgObj.visible();
    console.log('= B.Element.GetVisible: output =>', { result });
    return result;
  }

  GetBBox() {
    console.log('= B.Element.GetBBox: input =>', {});
    let bbox;
    let formattingLayer = null;

    if (!this.parent) {
      formattingLayer = this.doc.GetFormattingLayer();
      formattingLayer.AddElement(this);
    }

    bbox = this.svgObj.bbox();

    if (formattingLayer) {
      formattingLayer.RemoveElement(this);
    }

    console.log('= B.Element.GetBBox: output =>', { bbox });
    return bbox;
  }

  CalcBBox() {
    console.log('= B.Element.CalcBBox: input =>', {});
    const elementFrame = this.CalcElementFrame(true);
    const result = {
      ...elementFrame,
      cx: elementFrame.x + elementFrame.width / 2,
      cy: elementFrame.y + elementFrame.height / 2
    };
    console.log('= B.Element.CalcBBox: output =>', { result });
    return result;
  }

  GetRBox() {
    console.log('= B.Element.GetRBox: input =>', {});
    let formattingLayer = null;
    if (!this.parent) {
      formattingLayer = this.doc.GetFormattingLayer();
      formattingLayer.AddElement(this);
    }
    const rbox = this.svgObj.rbox();
    if (formattingLayer) {
      formattingLayer.RemoveElement(this);
    }
    console.log('= B.Element.GetRBox: output =>', { rbox });
    return rbox;
  }

  UpdateTransform() {
    console.log('= B.Element.UpdateTransform: input =>', {});

    let formattingLayer = null;
    if (!this.parent) {
      formattingLayer = this.doc.GetFormattingLayer();
      formattingLayer.AddElement(this);
    }

    const scaleElement = this.GetScaleElement();
    scaleElement.transform({});

    if (this.mirrored || this.flipped) {
      let matrix;
      const bbox = this.CalcBBox();
      const scaleX = scaleElement.trans.scaleX || 1;
      const scaleY = scaleElement.trans.scaleY || 1;

      matrix = scaleElement.node.transform.baseVal.consolidate().matrix;
      bbox.width /= scaleX;
      bbox.height /= scaleY;

      if (this.mirrored) {
        matrix = matrix.flipX().translate(-bbox.width, 0);
      }
      if (this.flipped) {
        matrix = matrix.flipY().translate(0, -bbox.height);
      }

      const transformString = `matrix(${Utils1.RoundCoord(matrix.a)} ${Utils1.RoundCoord(matrix.b)} ${Utils1.RoundCoord(matrix.c)} ${Utils1.RoundCoord(matrix.d)} ${Utils1.RoundCoord(matrix.e)} ${Utils1.RoundCoord(matrix.f)})`;
      scaleElement.attr('transform', transformString);
    }

    if (formattingLayer) {
      formattingLayer.RemoveElement(this);
    }

    Utils1.CleanGraphics();

    console.log('= B.Element.UpdateTransform: output =>', {});
  }

  GetScaleElement() {
    console.log('= B.Element.GetScaleElement: input =>', {});
    const result = this.svgObj;
    console.log('= B.Element.GetScaleElement: output =>', { result });
    return result;
  }

  CalcElementFrame(e) {
    for (
      var t = this.GetGeometryBBox(),
      a = {
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height
      },
      r = this.svgObj;
      r &&
      r !== this.doc.svgObj &&
      (a.x += r.trans.x, a.y += r.trans.y, r = r.parent, !e);
    );
    return a
  }


  GetGeometryBBox() {
    console.log('= B.Element.GetGeometryBBox: input => {}');

    if (this.geometryBBox.width < 0 || this.geometryBBox.height < 0) {
      const formattingLayer = this.doc.GetFormattingLayer();
      const originalPosition = {
        x: this.svgObj.trans.x,
        y: this.svgObj.trans.y
      };
      const originalRotation = this.svgObj.trans.rotation;
      const parent = this.svgObj.parent;
      let positionIndex = 0;

      if (parent) {
        positionIndex = this.svgObj.position();
        parent.remove(this.svgObj);
      }

      formattingLayer.svgObj.add(this.svgObj);
      this.svgObj.transform({
        x: 0,
        y: 0,
        rotation: 0
      });

      const rbox = this.svgObj.rbox();
      formattingLayer.svgObj.remove(this.svgObj);

      const convertedCoords = this.doc.ConvertWindowToDocCoords(rbox.x, rbox.y);
      this.geometryBBox.x = convertedCoords.x;
      this.geometryBBox.y = convertedCoords.y;
      this.geometryBBox.width = rbox.width;
      this.geometryBBox.height = rbox.height;

      this.svgObj.transform({
        x: originalPosition.x,
        y: originalPosition.y,
        rotation: originalRotation
      });

      if (parent) {
        parent.add(this.svgObj, positionIndex);
      }

      this.UpdateTransform();
    }

    console.log('= B.Element.GetGeometryBBox: output =>', this.geometryBBox);
    return this.geometryBBox;
  }

  GetArrowheadBounds() {
    return []
  }

  SetTooltip(tooltipText: string): void {
    console.log('= B.Element.SetTooltip: input =>', { tooltipText });
    Element.SetTooltipOnElement(this.svgObj, tooltipText);
    console.log('= B.Element.SetTooltip: output =>', { tooltipText });
  }

  static SetTooltipOnElement(element: any, tooltipText: string) {
    console.log('= B.Element.SetTooltipOnElement: input =>', { element, tooltipText });

    if (element && element instanceof HvacSVG.Container) {
      const titleElement = new HvacSVG.Element(HvacSVG.create('title'));
      titleElement.node.textContent = tooltipText;
      element.add(titleElement);
    }

    console.log('= B.Element.SetTooltipOnElement: output =>', {});
  }

  Style(): Style {
    console.log('= B.Element.Style: input => {}');
    if (!this.style) {
      this.style = new Style(this);
    }
    console.log('= B.Element.Style: output =>', { style: this.style });
    return this.style;
  }

  SetFillColor(color: string): void {
    console.log('= B.Element.SetFillColor: input =>', { color });

    this.svgObj.attr('fill', color);
    this.ClearColorData(true);

    console.log('= B.Element.SetFillColor: output =>', { fill: color });
  }

  SetImageFill(imageUrl: string, options?: any) {
    console.log("= B.Element.SetImageFill: input =>", { imageUrl, options });
    options = options || {};

    // Clear previous fill color data
    this.ClearColorData(true);

    // Initialize fillPatternData object with provided options
    this.fillPatternData = {};
    this.fillPatternData.options = {};
    this.fillPatternData.options.cropRect = options.cropRect || { x: 0, y: 0, width: 0, height: 0 };
    this.fillPatternData.options.scaleType = options.scaleType || "PROPFILL";
    this.fillPatternData.url = imageUrl;
    this.fillPatternData.ID = Utils1.MakeGuid();
    this.fillPatternData.imgWidth = options.imageWidth || 0;
    this.fillPatternData.imgHeight = options.imageHeight || 0;
    this.fillPatternData.patternElem = null;
    this.fillPatternData.imageElem = null;
    this.fillPatternData.isImage = true;

    // If image dimensions are not provided, try fetching from cache or calculate asynchronously
    if (!this.fillPatternData.imgWidth || !this.fillPatternData.imgHeight) {
      const cachedSize = Style.GetCachedImageSize(imageUrl);
      if (cachedSize) {
        this.fillPatternData.imgWidth = cachedSize.width;
        this.fillPatternData.imgHeight = cachedSize.height;
      } else {
        Style.CalcImageSize(
          imageUrl,
          function (width, height, error, data) {
            if (!error) {
              if (data.elem && data.elem.fillPatternData) {
                data.elem.fillPatternData.imgWidth = width;
                data.elem.fillPatternData.imgHeight = height;
                data.elem.UpdatePattern(data.ID, data.fill);
              }
            }
          },
          {
            ID: this.fillPatternData.ID,
            elem: this,
            fill: true
          }
        );
      }
    }

    this.UpdatePattern(this.fillPatternData.ID, true);
    console.log("= B.Element.SetImageFill: output =>", { fillPatternData: this.fillPatternData });
  }

  UpdateImageFill(options: { cropRect?: any; scaleType?: string } = {}): void {
    console.log("= B.Element.UpdateImageFill: input =>", { options });

    if (this.fillPatternData && this.fillPatternData.isImage) {
      this.fillPatternData.options.cropRect = options.cropRect || this.fillPatternData.options.cropRect;
      this.fillPatternData.options.scaleType = options.scaleType || this.fillPatternData.options.scaleType;

      this.UpdatePattern(this.fillPatternData.ID, true);

      console.log("= B.Element.UpdateImageFill: output =>", { fillPatternData: this.fillPatternData });
    } else {
      console.log("= B.Element.UpdateImageFill: output =>", "No update performed. Either fillPatternData is missing or not an image.");
    }
  }

  SetTextureFill(e: any): void {
    console.log('= B.Element.SetTextureFill: input =>', { e });

    if (e && e.url) {
      this.ClearColorData(true);

      // Initialize texture fill data with readable parameters
      this.fillPatternData = {
        options: {
          scale: e.scale || 1,
          alignment: e.alignment || 0
        },
        url: e.url,
        ID: Utils1.MakeGuid(),
        imgWidth: e.dim.x,
        imgHeight: e.dim.y,
        patternElem: null,
        imageElem: null,
        isTexture: true
      };

      // Update the pattern for the texture fill
      this.UpdatePattern(this.fillPatternData.ID, true);
    }

    console.log('= B.Element.SetTextureFill: output =>', { fillPatternData: this.fillPatternData });
  }

  SetGradientFill(e) {
    var t,
      a;
    if (e && e.stops && e.stops.length) {
      for (
        this.ClearColorData(!0),
        this.fillGradientData = {},
        this.fillGradientData.settings = {},
        this.fillGradientData.settings.stops = [],
        this.fillGradientData.settings.type = e.type ||
        BasicConstants.GradientStyle.LINEAR,
        this.fillGradientData.settings.startPos = e.startPos ||
        BasicConstants.GradientPos.LEFTTOP,
        this.fillGradientData.settings.angle = e.angle,
        a = e.stops,
        t = 0;
        t < a.length;
        t++
      ) this.fillGradientData.settings.stops.push({
        offset: a[t].offset ||
          0,
        color: a[t].color ||
          '#fff',
        opacity: void 0 !== a[t].opacity ? a[t].opacity : 1
      });
      this.fillGradientData.ID = Utils1.MakeGuid(),
        this.fillGradientData.gradientElem = null,
        this.UpdateGradient(this.fillGradientData.ID, !0)
    }
  }

  ClearColorData(e) {
    var t,
      a;
    e ? (t = this.fillPatternData, a = this.fillGradientData) : (t = this.strokePatternData, a = this.strokeGradientData),
      t &&
      t.patternElem &&
      (
        this.svgObj.remove(t.patternElem),
        t.patternElem = null,
        t.imageElem = null
      ),
      a &&
      a.gradientElem &&
      (this.svgObj.remove(a.gradientElem), a.gradientElem = null),
      e ? (this.fillPatternData = null, this.fillGradientData = null) : (this.strokePatternData = null, this.strokeGradientData = null)
  }

  UpdatePattern(e, t) {
    var a;
    if ((a = t ? this.fillPatternData : this.strokePatternData) && a.ID == e) {
      if (
        a.patternElem ||
        (
          a.patternElem = new HvacSVG.Pattern,
          a.imageElem = new HvacSVG.Image,
          a.imageElem.load(a.url),
          a.patternElem.add(a.imageElem),
          a.patternElem.attr('id', a.ID),
          this.svgObj.add(a.patternElem, 0)
        ),
        a.isImage
      ) this.UpdateImagePattern(a);
      else {
        if (!a.isTexture) return;
        this.UpdateTexturePattern(a)
      }
      t ? this.svgObj.attr('fill', 'url(#' + a.ID + ')') : this.svgObj.attr('stroke', 'url(#' + a.ID + ')')
    }
  }

  UpdateImagePattern(e) {
    var t,
      a,
      r,
      i,
      n,
      o,
      s,
      l,
      S,
      c = this.CalcElementFrame();
    e.patternElem &&
      e.imageElem &&
      e.isImage &&
      (
        o = e.imgWidth ||
        c.width,
        s = e.imgHeight ||
        c.height,
        t = {
          x: e.options.cropRect.x,
          y: e.options.cropRect.y,
          width: e.options.cropRect.width ||
            o,
          height: e.options.cropRect.height ||
            s
        },
        e.imgWidth &&
        e.imgHeight ||
        (t.x = 0, t.y = 0),
        t.x >= o ||
        t.y >= s ||
        (
          t.width = Math.min(t.width, o - t.x),
          t.height = Math.min(t.height, s - t.y),
          a = c.width / t.width,
          r = c.height / t.height,
          'PROPFILL' == e.options.scaleType ? a > r ? r = a : a = r : 'PROPFIT' == e.options.scaleType ? a < r ? r = a : a = r : 'NONE' == e.options.scaleType &&
            (a = 1, r = 1),
          t.x *= a,
          t.y *= r,
          t.width *= a,
          t.height *= r,
          l = (c.width - t.width) / 2 - t.x,
          S = (c.height - t.height) / 2 - t.y,
          i = t.width - l,
          n = t.height - S,
          i < c.width &&
          (i = c.width),
          n < c.height &&
          (n = c.height),
          l = Utils1.RoundCoord(l / a),
          S = Utils1.RoundCoord(S / r),
          i = Utils1.RoundCoord(i + 1),
          n = Utils1.RoundCoord(n + 1),
          a = Utils1.RoundCoord(a),
          r = Utils1.RoundCoord(r),
          e.patternElem.attr({
            x: 0,
            y: 0,
            width: i,
            height: n,
            patternUnits: 'userSpaceOnUse',
            preserveAspectRatio: 'none meet',
            viewBox: '0 0 ' + i + ' ' + n
          }),
          e.patternElem.node.setAttribute('_isImage_', !0),
          e.imageElem.attr({
            x: 0,
            y: 0,
            width: o,
            height: s,
            transform: 'scale(' + a + ',' + r + ') translate(' + l + ',' + S + ')',
            preserveAspectRatio: 'none'
          })
        )
      )
  }

  UpdateTexturePattern(e) {
    var t,
      a,
      r,
      i = this.CalcElementFrame();
    if (
      e.patternElem &&
      e.imageElem &&
      e.isTexture &&
      e.imgWidth &&
      e.imgHeight
    ) {
      switch (
      t = e.options.scale,
      r = {
        x: 0,
        y: 0,
        width: (a = {
          x: 0,
          y: 0,
          width: e.imgWidth * t,
          height: e.imgHeight * t
        }).width,
        height: a.height
      },
      e.options.alignment
      ) {
        case ListManager.TextureAlign.SDTX_TOPLEFT:
          break;
        case ListManager.TextureAlign.SDTX_TOPCENTER:
          r.x += i.width / 2;
          break;
        case ListManager.TextureAlign.SDTX_TOPRIGHT:
          r.x = i.width - a.width;
          break;
        case ListManager.TextureAlign.SDTX_CENLEFT:
          r.y += i.height / 2;
          break;
        case ListManager.TextureAlign.SDTX_CENTER:
          r.x += i.width / 2,
            r.y += i.height / 2;
          break;
        case ListManager.TextureAlign.SDTX_CENRIGHT:
          r.x = i.width - a.width,
            r.y += i.height / 2;
          break;
        case ListManager.TextureAlign.SDTX_BOTLEFT:
          r.y = i.height - a.height;
          break;
        case ListManager.TextureAlign.SDTX_BOTCENTER:
          r.x += i.width / 2,
            r.y = i.height - a.height;
          break;
        case ListManager.TextureAlign.SDTX_BOTRIGHT:
          r.x = i.width - a.width,
            r.y = i.height - a.height;
          break;
        default:
          r.x = - i.x,
            r.y = - i.y
      }
      e.imageElem.attr({
        x: 0,
        y: 0,
        width: a.width,
        height: a.height,
        preserveAspectRatio: 'none'
      }),
        e.patternElem.attr({
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          patternUnits: 'userSpaceOnUse',
          preserveAspectRatio: 'none meet',
          viewBox: '0 0 ' + a.width + ' ' + a.height
        })
    }
  }

  UpdateGradient(e, isFill: boolean) {
    console.log("= B.Element.UpdateGradient: input =>", { e, isFill });

    const bbox = this.GetGeometryBBox();
    let startPos = { x: 0, y: 0 };
    let endPos = { x: 0, y: 0 };
    let distance = Math.sqrt(bbox.width * bbox.width + bbox.height * bbox.height);
    let isLinear: boolean = true;
    const gradientData = isFill ? this.fillGradientData : this.strokeGradientData;

    if (gradientData && gradientData.ID === e) {
      if (!gradientData.gradientElem) {
        let gradientType: string;
        switch (gradientData.settings.type) {
          case Style.GradientStyle.RADIALFILL:
          case Style.GradientStyle.RADIAL:
            gradientType = "radial";
            break;
          default:
            gradientType = "linear";
        }
        gradientData.gradientElem = new HvacSVG.Gradient(gradientType);
        gradientData.gradientElem.attr("id", gradientData.ID);

        for (let i = 0; i < gradientData.settings.stops.length; i++) {
          const stop = gradientData.settings.stops[i];
          gradientData.gradientElem.at({
            offset: stop.offset,
            color: stop.color,
            opacity: stop.opacity,
          });
        }
        this.svgObj.add(gradientData.gradientElem, 0);
      }

      isLinear = gradientData.settings.type === Style.GradientStyle.LINEAR;
      startPos.x = bbox.x;
      startPos.y = bbox.y;
      endPos.x = startPos.x + bbox.width;
      endPos.y = startPos.y + bbox.height;

      // Adjust positions based on the start position setting
      switch (gradientData.settings.startPos) {
        case BasicConstants.GradientPos.TOP:
          startPos.x += bbox.width / 2;
          endPos.x = startPos.x;
          distance = bbox.height;
          break;
        case BasicConstants.GradientPos.RIGHTTOP:
          startPos.x = endPos.x;
          endPos.x = bbox.x;
          break;
        case BasicConstants.GradientPos.RIGHT:
          startPos.x = endPos.x;
          startPos.y += bbox.height / 2;
          endPos.x = bbox.x;
          endPos.y = startPos.y;
          distance = bbox.width;
          break;
        case BasicConstants.GradientPos.RIGHTBOTTOM:
          startPos.x = endPos.x;
          startPos.y = endPos.y;
          endPos.x = bbox.x;
          endPos.y = bbox.y;
          break;
        case BasicConstants.GradientPos.BOTTOM:
          startPos.x += bbox.width / 2;
          startPos.y = endPos.y;
          endPos.x = startPos.x;
          endPos.y = bbox.y;
          distance = bbox.height;
          break;
        case BasicConstants.GradientPos.LEFTBOTTOM:
          startPos.y = endPos.y;
          endPos.y = bbox.y;
          break;
        case BasicConstants.GradientPos.LEFT:
          startPos.y += bbox.height / 2;
          endPos.y = startPos.y;
          distance = bbox.width;
          break;
        case BasicConstants.GradientPos.CENTER:
          if (isLinear) {
            startPos.x += bbox.width / 2;
            startPos.y += bbox.height / 2;
            endPos.x = startPos.x;
            endPos.y = startPos.y;
            distance = Math.max(bbox.width, bbox.height) / 2;
          }
          break;
      }

      // Adjust positions based on angle if provided
      if (gradientData.settings.angle !== undefined) {
        let angle = gradientData.settings.angle / 10;
        angle %= 360;
        if (angle < 0) {
          angle += 360;
        }

        if (angle === 0) {
          startPos.x = bbox.x;
          startPos.y = bbox.y + bbox.height / 2;
          endPos.x = bbox.x + bbox.width;
          endPos.y = bbox.y + bbox.height / 2;
        } else if (angle === 180) {
          startPos.x = bbox.x + bbox.width;
          startPos.y = bbox.y + bbox.height / 2;
          endPos.x = bbox.x;
          endPos.y = bbox.y + bbox.height / 2;
        } else if (angle === 90) {
          startPos.x = bbox.x + bbox.width / 2;
          startPos.y = bbox.y;
          endPos.x = bbox.x + bbox.width / 2;
          endPos.y = bbox.y + bbox.height;
        } else if (angle === 270) {
          startPos.x = bbox.x + bbox.width / 2;
          startPos.y = bbox.y + bbox.height;
          endPos.x = bbox.x + bbox.width / 2;
          endPos.y = bbox.y;
        } else {
          let u, p, d, D, g, h;
          const tanAngle = Math.tan(angle * Math.PI / 180);
          const tanAngle90 = Math.tan((angle + 90) * Math.PI / 180);
          const centerX = bbox.x + bbox.width / 2;
          const centerY = bbox.y + bbox.height / 2;
          const intercept = centerY - centerX * tanAngle;

          if (angle < 90) {
            u = bbox.x;
            p = bbox.y;
            D = bbox.x + bbox.width;
            g = bbox.y + bbox.height;
          } else if (angle < 180) {
            u = bbox.x + bbox.width;
            p = bbox.y;
            D = bbox.x;
            g = bbox.y + bbox.height;
          } else if (angle < 270) {
            u = bbox.x + bbox.width;
            p = bbox.y + bbox.height;
            D = bbox.x;
            g = bbox.y;
          } else {
            u = bbox.x;
            p = bbox.y + bbox.height;
            D = bbox.x + bbox.width;
            g = bbox.y;
          }

          const line1 = p - u * tanAngle90;
          const line2 = g - D * tanAngle90;
          startPos.x = (line1 - intercept) / (tanAngle - tanAngle90);
          startPos.y = startPos.x * tanAngle + intercept;
          endPos.x = (line2 - intercept) / (tanAngle - tanAngle90);
          endPos.y = endPos.x * tanAngle + intercept;
        }
      }

      if (isLinear) {
        gradientData.gradientElem.attr({
          x1: startPos.x,
          y1: startPos.y,
          x2: endPos.x,
          y2: endPos.y,
          gradientUnits: "userSpaceOnUse",
        });
      } else {
        gradientData.gradientElem.attr({
          cx: startPos.x,
          cy: startPos.y,
          r: distance,
          gradientUnits: "userSpaceOnUse",
        });
      }

      if (isFill) {
        this.svgObj.attr("fill", "url(#" + gradientData.ID + ")");
      } else {
        this.svgObj.attr("stroke", "url(#" + gradientData.ID + ")");
      }
    }

    console.log("= B.Element.UpdateGradient: output =>", {});
  }

  RefreshPaint(shouldRefreshChildren?: boolean) {
    console.log('= B.Element.RefreshPaint: input =>', { shouldRefreshChildren });

    // Update fill pattern or gradient if exists
    if (this.fillPatternData) {
      this.UpdatePattern(this.fillPatternData.ID, true);
    } else if (this.fillGradientData) {
      this.UpdateGradient(this.fillGradientData.ID, true);
    }

    // Update stroke pattern or gradient if exists
    if (this.strokePatternData) {
      this.UpdatePattern(this.strokePatternData.ID, false);
    } else if (this.strokeGradientData) {
      this.UpdateGradient(this.strokeGradientData.ID, false);
    }

    // If flag is set and double move is needed (currently always false)
    if (shouldRefreshChildren && false) {
      const count = this.ElementCount();
      for (let index = 0; index < count; index++) {
        const childElement = this.GetElementByIndex(index);
        if (childElement) {
          childElement.RefreshPaint(shouldRefreshChildren);
        }
      }
    }

    console.log('= B.Element.RefreshPaint: output =>', { shouldRefreshChildren });
  }

  GetImageFillSize() {
    console.log('= B.Element.GetImageFillSize: input => {}');
    let size = {
      width: 0,
      height: 0
    };

    if (this.fillPatternData && this.fillPatternData.isImage) {
      size.width = this.fillPatternData.imgWidth;
      size.height = this.fillPatternData.imgHeight;
    }

    console.log('= B.Element.GetImageFillSize: output =>', { width: size.width, height: size.height });
    return size;
  }

  SetStrokeColor(color: string): void {
    console.log('= B.Element.SetStrokeColor: input =>', { color });
    this.svgObj.attr('stroke', color);
    this.ClearColorData(false);
    console.log('= B.Element.SetStrokeColor: output =>', { color });
  }

  SetTextureStroke(e) {
    console.log('= B.Element.SetTextureStroke: input =>', { e });

    if (e && e.url) {
      // Clear previous stroke color data
      this.ClearColorData(false);

      // Initialize stroke texture parameters with readable values
      this.strokePatternData = {};
      this.strokePatternData.options = {};
      this.strokePatternData.options.scale = e.scale || 1;
      this.strokePatternData.options.alignment = e.alignment || 0;
      this.strokePatternData.url = e.url;
      this.strokePatternData.ID = Utils1.MakeGuid();
      this.strokePatternData.imgWidth = e.dim.x;
      this.strokePatternData.imgHeight = e.dim.y;
      this.strokePatternData.patternElem = null;
      this.strokePatternData.imageElem = null;
      this.strokePatternData.isTexture = true;

      // Update the pattern for the stroke texture
      this.UpdatePattern(this.strokePatternData.ID, false);
    }

    console.log('= B.Element.SetTextureStroke: output =>', { strokePatternData: this.strokePatternData });
  }

  SetGradientStroke(e) {
    console.log("= B.Element.SetGradientStroke: input =>", { e });

    if (e && e.stops && e.stops.length) {
      // Clear previous stroke color data
      this.ClearColorData(false);

      // Initialize new stroke gradient data with readable parameters
      this.strokeGradientData = {};
      this.strokeGradientData.settings = {};
      this.strokeGradientData.settings.stops = [];
      this.strokeGradientData.settings.type = e.type || Style.GradientStyle.LINEAR;
      this.strokeGradientData.settings.startPos = e.startPos || Style.GradientPos.LEFTTOP;
      this.strokeGradientData.settings.angle = e.angle;

      // Process each gradient stop
      for (let i = 0; i < e.stops.length; i++) {
        const stop = e.stops[i];
        this.strokeGradientData.settings.stops.push({
          offset: stop.offset || 0,
          color: stop.color || "#fff",
          opacity: stop.opacity !== undefined ? stop.opacity : 1,
        });
      }

      // Generate a new unique ID for the gradient and update stroke gradient data
      this.strokeGradientData.ID = Utils1.MakeGuid();
      this.strokeGradientData.gradientElem = null;

      this.UpdateGradient(this.strokeGradientData.ID, false);
      console.log("= B.Element.SetGradientStroke: output =>", { strokeGradientData: this.strokeGradientData });
    } else {
      console.log("= B.Element.SetGradientStroke: output =>", "No valid gradient stops provided.");
    }
  }

  SetStrokeWidth(e: number | string) {
    console.log("= B.Element.SetStrokeWidth: input =>", { e });

    // Set the initial stroke-width attribute
    this.svgObj.attr("stroke-width", e);

    // Check if e is not a number and parse it if necessary
    if (isNaN(Number(e))) {
      e = Instance.Basic.Symbol.ParsePlaceholder(e, BasicConstants.Placeholder.LineThick);
    }

    // Update the strokeWidth property with a numeric value
    this.strokeWidth = Number(e);

    // Update the stroke-dasharray according to the new strokeWidth
    this.svgObj.attr("stroke-dasharray", this.GetStrokePatternForWidth());

    console.log("= B.Element.SetStrokeWidth: output =>", { strokeWidth: this.strokeWidth });
  }

  SetStrokePattern(dashArray: string) {
    console.log('= B.Element.SetStrokePattern: input =>', { dashArray });

    this.strokeDashArray = dashArray;
    const patternForWidth = this.GetStrokePatternForWidth();
    this.svgObj.attr('stroke-dasharray', patternForWidth);

    console.log('= B.Element.SetStrokePattern: output =>', { strokeDashArray: this.strokeDashArray, patternForWidth });
  }

  GetStrokePatternForWidth() {
    console.log('= B.Element.GetStrokePatternForWidth: input => {}');
    // Get the current stroke width
    const strokeWidth = this.strokeWidth;
    let dashArrayValues: number[] = [];

    // If a dash pattern is defined, split into an array of numeric values
    if (this.strokeDashArray) {
      dashArrayValues = this.strokeDashArray.split(',').map(value => Number(value.trim()));
    }

    // If no valid dash pattern or stroke width is provided, return 'none'
    if (!dashArrayValues.length || !strokeWidth) {
      console.log('= B.Element.GetStrokePatternForWidth: output =>', 'none');
      return 'none';
    }

    // Multiply each dash value by the stroke width
    const adjustedValues = dashArrayValues.map(value => value * strokeWidth);
    const result = adjustedValues.join(',');

    console.log('= B.Element.GetStrokePatternForWidth: output =>', result);
    return result;
  }

  SetOpacity(opacity: number): void {
    console.log('= B.Element.SetOpacity: input =>', { opacity });
    this.svgObj.attr('opacity', opacity);
    console.log('= B.Element.SetOpacity: output =>', { opacity });
  }

  SetFillOpacity(opacity: number): void {
    console.log('= B.Element.SetFillOpacity: input =>', { opacity });
    this.svgObj.attr('fill-opacity', opacity);
    console.log('= B.Element.SetFillOpacity: output =>', { opacity });
  }

  SetStrokeOpacity(opacity: number): void {
    console.log("= B.Element.SetStrokeOpacity: input =>", { opacity });
    this.svgObj.attr("stroke-opacity", opacity);
    console.log("= B.Element.SetStrokeOpacity: output =>", { opacity });
  }

  SetFillRule(fillRule: string): void {
    console.log("= B.Element.SetFillRule: input =>", { fillRule });
    this.svgObj.attr("fill-rule", fillRule);
    console.log("= B.Element.SetFillRule: output =>", { fillRule });
  }

  SetDisplayVisibility(isVisible: boolean): void {
    console.log('= B.Element.SetDisplayVisibility: input =>', { isVisible });
    const visibility = isVisible ? '' : 'hidden';
    this.svgObj.attr('visibility', visibility);
    console.log('= B.Element.SetDisplayVisibility: output =>', { visibility });
  }

  Effects() {
    console.log('= B.Element.Effects: input => {}');

    if (!this.effects) {
      this.effects = new Effects(this);
    }

    console.log('= B.Element.Effects: output =>', { effects: this.effects });
    return this.effects;
  }

  SetEffect(effectID: string): void {
    console.log('= B.Element.SetEffect: input =>', { effectID });
    this.svgObj.attr('filter', `url(#${effectID})`);
    console.log('= B.Element.SetEffect: output =>', { effectID });
  }

  SetEventBehavior(eventBehavior: string): void {
    console.log('= B.Element.SetEventBehavior: input =>', { eventBehavior });
    this.svgObj.attr('pointer-events', eventBehavior);
    console.log('= B.Element.SetEventBehavior: output =>', { eventBehavior });
  }

  GetEventBehavior() {
    console.log('= B.Element.GetEventBehavior: input => {}');
    const eventBehavior = this.svgObj.attr('pointer-events');
    console.log('= B.Element.GetEventBehavior: output =>', { eventBehavior });
    return eventBehavior;
  }

  ClearEventBehavior() {
    console.log('= B.Element.ClearEventBehavior: input => {}');

    // Remove the pointer-events attribute from the SVG node
    this.svgObj.node.removeAttribute('pointer-events');

    console.log('= B.Element.ClearEventBehavior: output =>', { pointerEventsCleared: true });
  }

  SetCursor(cursorValue: string): void {
    console.log('= B.Element.SetCursor: input =>', { cursorValue });
    this.cursor = cursorValue;
    if (cursorValue) {
      this.svgObj.node.setAttribute('class', cursorValue);
    } else {
      this.svgObj.node.removeAttribute('class');
    }
    console.log('= B.Element.SetCursor: output =>', { cursor: this.cursor });
  }

  GetCursor() {
    console.log('= B.Element.GetCursor: input => {}');
    const result = this.cursor;
    console.log('= B.Element.GetCursor: output =>', { cursor: result });
    return result;
  }

  ClearAllCursors(): void {
    console.log('= B.Element.ClearAllCursors: input => {}');
    Element.RemoveCursorsOnSVGObj(this.svgObj);
    console.log('= B.Element.ClearAllCursors: output => {}');
  }

  static RemoveCursorsOnSVGObj(e: any): void {
    console.log('= B.Element.RemoveCursorsOnSVGObj: input =>', { e });

    if (e.SDGObj) {
      e.SDGObj.cursor = null;
    }

    if (e.node) {
      e.node.removeAttribute('class');
    }

    if (e instanceof HvacSVG.Container) {
      const children = e.children();
      for (let i = 0; i < children.length; i++) {
        Element.RemoveCursorsOnSVGObj(children[i]);
      }
    }

    console.log('= B.Element.RemoveCursorsOnSVGObj: output =>', { completed: true });
  }

  // GetTargetForEvent2(e: any) {
  //   console.log("= B.Element.GetTargetForEvent2: input =>", { e });

  //   let domTarget: any, foundElement: any, rootElement: any;

  //   // Ensure the event exists and the current instance is a valid container.
  //   if (!(e && this instanceof Instance.Basic.Container)) {
  //     console.log("= B.Element.GetTargetForEvent2: output =>", this);
  //     return this;
  //   }

  //   domTarget = e.target || e.srcElement;
  //   rootElement = this.DOMElement();

  //   if (!domTarget || domTarget === rootElement) {
  //     console.log("= B.Element.GetTargetForEvent2: output =>", this);
  //     return this;
  //   }

  //   foundElement = this.FindElementByDOMElement(domTarget);

  //   while (domTarget && !foundElement) {
  //     domTarget = domTarget.parentNode;
  //     foundElement = (domTarget === rootElement) ? this : this.FindElementByDOMElement(domTarget);
  //   }

  //   console.log("= B.Element.GetTargetForEvent2: output =>", foundElement || this);
  //   return foundElement || this;
  // }

  // GetTargetForEvent1(e: any): any {
  //   console.log("= B.Element.GetTargetForEvent1: input =>", { e });

  //   let target: any = e.target || e.srcElement;
  //   let rootElement: any = this.DOMElement();
  //   let element: any;

  //   if (!target || target === rootElement) {
  //     console.log("= B.Element.GetTargetForEvent1: output =>", this);
  //     return this;
  //   }

  //   element = this.FindElementByDOMElement(target);

  //   while (target && !element) {
  //     target = target.parentNode;
  //     if (target === rootElement) {
  //       element = this;
  //       break;
  //     } else {
  //       element = this.FindElementByDOMElement(target);
  //     }
  //   }

  //   console.log("= B.Element.GetTargetForEvent1: output =>", element || this);
  //   return element || this;
  // }

  static EventBehavior = {
    NORMAL: 'visiblePainted',
    INSIDE: 'visibleFill',
    OUTSIDE: 'visibleStroke',
    ALL: 'visible',
    HIDDEN: 'painted',
    HIDDEN_IN: 'fill',
    HIDDEN_OUT: 'stroke',
    HIDDEN_ALL: 'all',
    NONE: 'none'
  }
  // Object.freeze(Element.EventBehavior),
  static CursorType = {
    AUTO: 'cur-auto',
    DEFAULT: 'cur-default',
    NONE: 'cur-none',
    CONTEXT_MENU: 'cur-context-menu',
    HELP: 'cur-help',
    POINTER: 'cur-pointer',
    PROGRESS: 'cur-progress',
    BUSY: 'cur-wait',
    CELL: 'cur-cell',
    CROSSHAIR: 'cur-crosshair',
    TEXT: 'cur-text',
    VERTICAL_TEXT: 'cur-vertical-text',
    ALIAS: 'cur-alias',
    COPY: 'cur-copy',
    MOVE: 'cur-move',
    NO_DROP: 'cur-no-drop',
    NOT_ALLOWED: 'cur-not-allowed',
    ALL_SCROLL: 'cur-all-scroll',
    COL_RESIZE: 'cur-col-resize',
    ROW_RESIZE: 'cur-row-resize',
    RESIZE_T: 'cur-n-resize',
    RESIZE_R: 'cur-e-resize',
    RESIZE_B: 'cur-s-resize',
    RESIZE_L: 'cur-w-resize',
    RESIZE_TB: 'cur-ns-resize',
    RESIZE_LR: 'cur-ew-resize',
    RESIZE_RT: 'cur-ne-resize',
    RESIZE_LT: 'cur-nw-resize',
    RESIZE_RB: 'cur-se-resize',
    RESIZE_LB: 'cur-sw-resize',
    NESW_RESIZE: 'cur-nesw-resize',
    NWSE_RESIZE: 'cur-nwse-resize',
    ZOOM_IN: 'cur-zoom-in',
    ZOOM_OUT: 'cur-zoom-out',
    ZOOM_GRAB: 'cur-zoom-grab',
    ZOOM_GRABBING: 'cur-zoom-grabbing',
    ANCHOR: 'cur-anchor',
    PAINT: 'cur-paint',
    ROTATE: 'cur-rotate',
    DROPLIB: 'cur-droplib',
    EDIT_X: 'cur-pencil-x',
    EDIT: 'cur-pencil',
    EDIT_CLOSE: 'cur-pencil-close',
    ADD: 'cur-add',
    STAMP: 'cur-stamp',
    ARR_DOWN: 'cur-arr-down',
    ARR_RIGHT: 'cur-arr-right',
    BRUSH: 'cur-brush',
    BRUSH_EDIT: 'cur-brush-edit',
    BRUSH_CELL: 'cur-brush-cell',
    BRUSH_TABLE: 'cur-brush-table',
    ADD_RIGHT: 'cur-add-right',
    ADD_LEFT: 'cur-add-left',
    ADD_UP: 'cur-add-up',
    ADD_DOWN: 'cur-add-down',
    ADD_PLUS: 'cur-add-plus',
    GRAB: 'cur-grab'
  }
  // Object.freeze(Element.CursorType)

}

export default Element


// export default Basic.Element;
