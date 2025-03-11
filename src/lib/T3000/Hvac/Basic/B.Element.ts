

import $ from "jquery";
import T3Svg from "../Helper/T3Svg";
import Effects from "./B.Element.Effects"
import Style from "./B.Element.Style";
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import GlobalData from '../Data/T3Gv'
import Instance from "../Data/Instance/Instance";
import ConstantData from "../Data/ConstantData"
import BasicConstants from "./B.Constants";
import ConstantData2 from "../Data/ConstantData2";

class Element {

  //#region Properties

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

  //#endregion

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

  /**
   * Calculates the bounding box of the element, including transformations.
   * @param includeTransformations - Whether to include transformations in the calculation.
   * @returns The bounding box of the element.
   */
  CalcElementFrame(includeTransformations?) {
    console.log('= B.Element.CalcElementFrame: input =>', { includeTransformations });

    const geometryBBox = this.GetGeometryBBox();
    let boundingBox = {
      x: geometryBBox.x,
      y: geometryBBox.y,
      width: geometryBBox.width,
      height: geometryBBox.height
    };

    let currentElement = this.svgObj;

    while (currentElement && currentElement !== this.doc.svgObj) {
      boundingBox.x += currentElement.trans.x;
      boundingBox.y += currentElement.trans.y;
      currentElement = currentElement.parent;

      if (!includeTransformations) {
        break;
      }
    }

    console.log('= B.Element.CalcElementFrame: output =>', { boundingBox });
    return boundingBox;
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

    if (element && element instanceof T3Svg.Container) {
      const titleElement = new T3Svg.Element(T3Svg.create('title'));
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

  /**
   * Sets a texture fill for the element
   * @param textureSettings - The texture settings including URL, scale, alignment, and dimensions
   */
  SetTextureFill(textureSettings: any): void {
    console.log('= B.Element.SetTextureFill: input =>', { textureSettings });

    if (textureSettings && textureSettings.url) {
      this.ClearColorData(true);

      // Initialize texture fill data with readable parameters
      this.fillPatternData = {
        options: {
          scale: textureSettings.scale || 1,
          alignment: textureSettings.alignment || 0
        },
        url: textureSettings.url,
        ID: Utils1.MakeGuid(),
        imgWidth: textureSettings.dim.x,
        imgHeight: textureSettings.dim.y,
        patternElem: null,
        imageElem: null,
        isTexture: true
      };

      // Update the pattern for the texture fill
      this.UpdatePattern(this.fillPatternData.ID, true);
    }

    console.log('= B.Element.SetTextureFill: output =>', { fillPatternData: this.fillPatternData });
  }

  /**
   * Sets a gradient fill for the element
   * @param gradientSettings - The gradient settings including type, stops, and position
   */
  SetGradientFill(gradientSettings) {
    console.log("= B.Element.SetGradientFill: input =>", { gradientSettings });

    if (gradientSettings && gradientSettings.stops && gradientSettings.stops.length) {
      // Clear previous fill color data
      this.ClearColorData(true);

      // Initialize new gradient fill data with readable parameters
      this.fillGradientData = {};
      this.fillGradientData.settings = {};
      this.fillGradientData.settings.stops = [];
      this.fillGradientData.settings.type = gradientSettings.type || BasicConstants.GradientStyle.LINEAR;
      this.fillGradientData.settings.startPos = gradientSettings.startPos || BasicConstants.GradientPos.LEFTTOP;
      this.fillGradientData.settings.angle = gradientSettings.angle;

      // Process each gradient stop
      const stops = gradientSettings.stops;
      for (let i = 0; i < stops.length; i++) {
        this.fillGradientData.settings.stops.push({
          offset: stops[i].offset || 0,
          color: stops[i].color || '#fff',
          opacity: stops[i].opacity !== undefined ? stops[i].opacity : 1
        });
      }

      // Generate a new unique ID for the gradient and update fill gradient data
      this.fillGradientData.ID = Utils1.MakeGuid();
      this.fillGradientData.gradientElem = null;

      this.UpdateGradient(this.fillGradientData.ID, true);
      console.log("= B.Element.SetGradientFill: output =>", { fillGradientData: this.fillGradientData });
    } else {
      console.log("= B.Element.SetGradientFill: output =>", "No valid gradient stops provided.");
    }
  }

  /**
   * Clears fill or stroke pattern/gradient data for the element
   * @param isFill - If true, clears fill data, otherwise clears stroke data
   */
  ClearColorData(isFill: boolean) {
    console.log("= B.Element.ClearColorData: input =>", { isFill });

    // Determine which data to clear based on isFill parameter
    let patternData;
    let gradientData;

    if (isFill) {
      patternData = this.fillPatternData;
      gradientData = this.fillGradientData;
    } else {
      patternData = this.strokePatternData;
      gradientData = this.strokeGradientData;
    }

    // Remove and clear pattern elements if they exist
    if (patternData && patternData.patternElem) {
      this.svgObj.remove(patternData.patternElem);
      patternData.patternElem = null;
      patternData.imageElem = null;
    }

    // Remove and clear gradient elements if they exist
    if (gradientData && gradientData.gradientElem) {
      this.svgObj.remove(gradientData.gradientElem);
      gradientData.gradientElem = null;
    }

    // Reset the appropriate data properties
    if (isFill) {
      this.fillPatternData = null;
      this.fillGradientData = null;
    } else {
      this.strokePatternData = null;
      this.strokeGradientData = null;
    }

    console.log("= B.Element.ClearColorData: output =>", { isFill });
  }

  /**
   * Updates a fill or stroke pattern for the element
   * @param patternId - The ID of the pattern to update
   * @param isFill - If true, updates fill pattern, otherwise updates stroke pattern
   */
  UpdatePattern(patternId: string, isFill: boolean) {
    console.log("= B.Element.UpdatePattern: input =>", { patternId, isFill });

    // Get the appropriate pattern data based on whether we're updating fill or stroke
    const patternData = isFill ? this.fillPatternData : this.strokePatternData;

    // Only proceed if the pattern data exists and matches the requested ID
    if (patternData && patternData.ID === patternId) {
      // Create pattern elements if they don't exist
      if (!patternData.patternElem) {
        patternData.patternElem = new T3Svg.Pattern;
        patternData.imageElem = new T3Svg.Image;
        patternData.imageElem.load(patternData.url);
        patternData.patternElem.add(patternData.imageElem);
        patternData.patternElem.attr('id', patternData.ID);
        this.svgObj.add(patternData.patternElem, 0);
      }

      // Update the appropriate pattern type
      if (patternData.isImage) {
        this.UpdateImagePattern(patternData);
      } else if (patternData.isTexture) {
        this.UpdateTexturePattern(patternData);
      }

      // Apply the pattern to the element
      const attrName = isFill ? 'fill' : 'stroke';
      this.svgObj.attr(attrName, 'url(#' + patternData.ID + ')');
    }

    console.log("= B.Element.UpdatePattern: output =>", { patternId, isFill });
  }

  /**
   * Updates an image pattern with proper scaling and positioning
   * @param patternData - The image pattern data to update
   */
  UpdateImagePattern(patternData) {
    console.log("= B.Element.UpdateImagePattern: input =>", { patternData });

    // Get the element's bounding box for calculations
    const elementFrame = this.CalcElementFrame();

    // Only proceed if we have valid pattern elements and image data
    if (patternData.patternElem && patternData.imageElem && patternData.isImage) {
      // Use image dimensions or fallback to element dimensions
      const imageWidth = patternData.imgWidth || elementFrame.width;
      const imageHeight = patternData.imgHeight || elementFrame.height;

      // Define the crop rectangle
      const cropRect = {
        x: patternData.options.cropRect.x,
        y: patternData.options.cropRect.y,
        width: patternData.options.cropRect.width || imageWidth,
        height: patternData.options.cropRect.height || imageHeight
      };

      // If image dimensions are not set, reset crop coordinates
      if (!patternData.imgWidth && !patternData.imgHeight) {
        cropRect.x = 0;
        cropRect.y = 0;
      }

      // Make sure crop rectangle isn't out of bounds
      if (cropRect.x < imageWidth && cropRect.y < imageHeight) {
        // Adjust crop dimensions to stay within image bounds
        cropRect.width = Math.min(cropRect.width, imageWidth - cropRect.x);
        cropRect.height = Math.min(cropRect.height, imageHeight - cropRect.y);

        // Calculate scale factors based on scaling type
        let scaleX = elementFrame.width / cropRect.width;
        let scaleY = elementFrame.height / cropRect.height;

        // Adjust scale factors based on scaling type
        if (patternData.options.scaleType === 'PROPFILL') {
          // Proportional fill - use the larger scale factor
          if (scaleX > scaleY) {
            scaleY = scaleX;
          } else {
            scaleX = scaleY;
          }
        } else if (patternData.options.scaleType === 'PROPFIT') {
          // Proportional fit - use the smaller scale factor
          if (scaleX < scaleY) {
            scaleY = scaleX;
          } else {
            scaleX = scaleY;
          }
        } else if (patternData.options.scaleType === 'NONE') {
          // No scaling - use scale factor of 1
          scaleX = 1;
          scaleY = 1;
        }

        // Apply scale to crop rectangle
        cropRect.x *= scaleX;
        cropRect.y *= scaleY;
        cropRect.width *= scaleX;
        cropRect.height *= scaleY;

        // Calculate positioning adjustments
        const offsetX = (elementFrame.width - cropRect.width) / 2 - cropRect.x;
        const offsetY = (elementFrame.height - cropRect.height) / 2 - cropRect.y;

        // Calculate pattern dimensions
        let patternWidth = cropRect.width - offsetX;
        let patternHeight = cropRect.height - offsetY;

        // Ensure pattern is at least as large as the element
        if (patternWidth < elementFrame.width) {
          patternWidth = elementFrame.width;
        }
        if (patternHeight < elementFrame.height) {
          patternHeight = elementFrame.height;
        }

        // Round coordinate values for better rendering
        const roundedOffsetX = Utils1.RoundCoord(offsetX / scaleX);
        const roundedOffsetY = Utils1.RoundCoord(offsetY / scaleY);
        const roundedPatternWidth = Utils1.RoundCoord(patternWidth + 1);
        const roundedPatternHeight = Utils1.RoundCoord(patternHeight + 1);
        const roundedScaleX = Utils1.RoundCoord(scaleX);
        const roundedScaleY = Utils1.RoundCoord(scaleY);

        // Set pattern attributes
        patternData.patternElem.attr({
          x: 0,
          y: 0,
          width: roundedPatternWidth,
          height: roundedPatternHeight,
          patternUnits: 'userSpaceOnUse',
          preserveAspectRatio: 'none meet',
          viewBox: '0 0 ' + roundedPatternWidth + ' ' + roundedPatternHeight
        });

        // Mark pattern as an image
        patternData.patternElem.node.setAttribute('_isImage_', true);

        // Set image attributes
        patternData.imageElem.attr({
          x: 0,
          y: 0,
          width: imageWidth,
          height: imageHeight,
          transform: 'scale(' + roundedScaleX + ',' + roundedScaleY + ') translate(' + roundedOffsetX + ',' + roundedOffsetY + ')',
          preserveAspectRatio: 'none'
        });
      }
    }

    console.log("= B.Element.UpdateImagePattern: output =>", { patternData });
  }

  /**
   * Updates a texture pattern with proper scaling and positioning
   * @param patternData - The texture pattern data to update
   */
  UpdateTexturePattern(patternData) {
    console.log("= B.Element.UpdateTexturePattern: input =>", { patternData });

    const elementFrame = this.CalcElementFrame();
    let scale, scaledImageSize, patternRect;

    if (
      patternData.patternElem &&
      patternData.imageElem &&
      patternData.isTexture &&
      patternData.imgWidth &&
      patternData.imgHeight
    ) {
      scale = patternData.options.scale;

      scaledImageSize = {
        x: 0,
        y: 0,
        width: patternData.imgWidth * scale,
        height: patternData.imgHeight * scale
      };

      patternRect = {
        x: 0,
        y: 0,
        width: scaledImageSize.width,
        height: scaledImageSize.height
      };

      // Position the pattern based on alignment option
      switch (patternData.options.alignment) {
        case ConstantData2.TextureAlign.SDTX_TOPLEFT:
          // Default position is already top-left
          break;
        case ConstantData2.TextureAlign.SDTX_TOPCENTER:
          patternRect.x += elementFrame.width / 2;
          break;
        case ConstantData2.TextureAlign.SDTX_TOPRIGHT:
          patternRect.x = elementFrame.width - scaledImageSize.width;
          break;
        case ConstantData2.TextureAlign.SDTX_CENLEFT:
          patternRect.y += elementFrame.height / 2;
          break;
        case ConstantData2.TextureAlign.SDTX_CENTER:
          patternRect.x += elementFrame.width / 2;
          patternRect.y += elementFrame.height / 2;
          break;
        case ConstantData2.TextureAlign.SDTX_CENRIGHT:
          patternRect.x = elementFrame.width - scaledImageSize.width;
          patternRect.y += elementFrame.height / 2;
          break;
        case ConstantData2.TextureAlign.SDTX_BOTLEFT:
          patternRect.y = elementFrame.height - scaledImageSize.height;
          break;
        case ConstantData2.TextureAlign.SDTX_BOTCENTER:
          patternRect.x += elementFrame.width / 2;
          patternRect.y = elementFrame.height - scaledImageSize.height;
          break;
        case ConstantData2.TextureAlign.SDTX_BOTRIGHT:
          patternRect.x = elementFrame.width - scaledImageSize.width;
          patternRect.y = elementFrame.height - scaledImageSize.height;
          break;
        default:
          patternRect.x = -elementFrame.x;
          patternRect.y = -elementFrame.y;
      }

      // Set image attributes
      patternData.imageElem.attr({
        x: 0,
        y: 0,
        width: scaledImageSize.width,
        height: scaledImageSize.height,
        preserveAspectRatio: 'none'
      });

      // Set pattern attributes
      patternData.patternElem.attr({
        x: patternRect.x,
        y: patternRect.y,
        width: patternRect.width,
        height: patternRect.height,
        patternUnits: 'userSpaceOnUse',
        preserveAspectRatio: 'none meet',
        viewBox: '0 0 ' + scaledImageSize.width + ' ' + scaledImageSize.height
      });
    }

    console.log("= B.Element.UpdateTexturePattern: output =>", { patternData });
  }

  /**
   * Updates a fill or stroke gradient for the element
   * @param gradientId - The ID of the gradient to update
   * @param isFill - If true, updates fill gradient, otherwise updates stroke gradient
   */
  UpdateGradient(gradientId: string, isFill: boolean) {
    console.log("= B.Element.UpdateGradient: input =>", { gradientId, isFill });

    const boundingBox = this.GetGeometryBBox();
    let startPosition = { x: 0, y: 0 };
    let endPosition = { x: 0, y: 0 };
    let gradientDistance = Math.sqrt(boundingBox.width * boundingBox.width + boundingBox.height * boundingBox.height);
    let isLinearGradient: boolean = true;
    const gradientData = isFill ? this.fillGradientData : this.strokeGradientData;

    if (gradientData && gradientData.ID === gradientId) {
      // Create the gradient element if it doesn't exist yet
      if (!gradientData.gradientElem) {
        let gradientType: string;
        switch (gradientData.settings.type) {
          case BasicConstants.GradientStyle.RADIALFILL:
          case BasicConstants.GradientStyle.RADIAL:
            gradientType = "radial";
            break;
          default:
            gradientType = "linear";
        }

        // Create gradient element with proper type
        gradientData.gradientElem = new T3Svg.Gradient(gradientType);
        gradientData.gradientElem.attr("id", gradientData.ID);

        // Add color stops to the gradient
        for (let i = 0; i < gradientData.settings.stops.length; i++) {
          const colorStop = gradientData.settings.stops[i];
          gradientData.gradientElem.at({
            offset: colorStop.offset,
            color: colorStop.color,
            opacity: colorStop.opacity,
          });
        }

        // Add the gradient element to the SVG
        this.svgObj.add(gradientData.gradientElem, 0);
      }

      isLinearGradient = gradientData.settings.type === BasicConstants.GradientStyle.LINEAR;
      startPosition.x = boundingBox.x;
      startPosition.y = boundingBox.y;
      endPosition.x = startPosition.x + boundingBox.width;
      endPosition.y = startPosition.y + boundingBox.height;

      // Adjust positions based on the start position setting
      switch (gradientData.settings.startPos) {
        case BasicConstants.GradientPos.TOP:
          startPosition.x += boundingBox.width / 2;
          endPosition.x = startPosition.x;
          gradientDistance = boundingBox.height;
          break;
        case BasicConstants.GradientPos.RIGHTTOP:
          startPosition.x = endPosition.x;
          endPosition.x = boundingBox.x;
          break;
        case BasicConstants.GradientPos.RIGHT:
          startPosition.x = endPosition.x;
          startPosition.y += boundingBox.height / 2;
          endPosition.x = boundingBox.x;
          endPosition.y = startPosition.y;
          gradientDistance = boundingBox.width;
          break;
        case BasicConstants.GradientPos.RIGHTBOTTOM:
          startPosition.x = endPosition.x;
          startPosition.y = endPosition.y;
          endPosition.x = boundingBox.x;
          endPosition.y = boundingBox.y;
          break;
        case BasicConstants.GradientPos.BOTTOM:
          startPosition.x += boundingBox.width / 2;
          startPosition.y = endPosition.y;
          endPosition.x = startPosition.x;
          endPosition.y = boundingBox.y;
          gradientDistance = boundingBox.height;
          break;
        case BasicConstants.GradientPos.LEFTBOTTOM:
          startPosition.y = endPosition.y;
          endPosition.y = boundingBox.y;
          break;
        case BasicConstants.GradientPos.LEFT:
          startPosition.y += boundingBox.height / 2;
          endPosition.y = startPosition.y;
          gradientDistance = boundingBox.width;
          break;
        case BasicConstants.GradientPos.CENTER:
          if (isLinearGradient) {
            startPosition.x += boundingBox.width / 2;
            startPosition.y += boundingBox.height / 2;
            endPosition.x = startPosition.x;
            endPosition.y = startPosition.y;
            gradientDistance = Math.max(boundingBox.width, boundingBox.height) / 2;
          }
          break;
      }

      // Adjust positions based on angle if provided
      if (gradientData.settings.angle !== undefined) {
        let angleInDegrees = gradientData.settings.angle / 10;
        angleInDegrees %= 360;
        if (angleInDegrees < 0) {
          angleInDegrees += 360;
        }

        // Handle special angle cases (0, 90, 180, 270 degrees)
        if (angleInDegrees === 0) {
          startPosition.x = boundingBox.x;
          startPosition.y = boundingBox.y + boundingBox.height / 2;
          endPosition.x = boundingBox.x + boundingBox.width;
          endPosition.y = boundingBox.y + boundingBox.height / 2;
        } else if (angleInDegrees === 180) {
          startPosition.x = boundingBox.x + boundingBox.width;
          startPosition.y = boundingBox.y + boundingBox.height / 2;
          endPosition.x = boundingBox.x;
          endPosition.y = boundingBox.y + boundingBox.height / 2;
        } else if (angleInDegrees === 90) {
          startPosition.x = boundingBox.x + boundingBox.width / 2;
          startPosition.y = boundingBox.y;
          endPosition.x = boundingBox.x + boundingBox.width / 2;
          endPosition.y = boundingBox.y + boundingBox.height;
        } else if (angleInDegrees === 270) {
          startPosition.x = boundingBox.x + boundingBox.width / 2;
          startPosition.y = boundingBox.y + boundingBox.height;
          endPosition.x = boundingBox.x + boundingBox.width / 2;
          endPosition.y = boundingBox.y;
        } else {
          // Calculate gradient line for arbitrary angles
          let leftCoord, topCoord, rightCoord, bottomCoord;
          const angleTangent = Math.tan(angleInDegrees * Math.PI / 180);
          const perpAngleTangent = Math.tan((angleInDegrees + 90) * Math.PI / 180);
          const centerX = boundingBox.x + boundingBox.width / 2;
          const centerY = boundingBox.y + boundingBox.height / 2;
          const lineIntercept = centerY - centerX * angleTangent;

          // Determine coordinates based on angle quadrant
          if (angleInDegrees < 90) {
            leftCoord = boundingBox.x;
            topCoord = boundingBox.y;
            rightCoord = boundingBox.x + boundingBox.width;
            bottomCoord = boundingBox.y + boundingBox.height;
          } else if (angleInDegrees < 180) {
            leftCoord = boundingBox.x + boundingBox.width;
            topCoord = boundingBox.y;
            rightCoord = boundingBox.x;
            bottomCoord = boundingBox.y + boundingBox.height;
          } else if (angleInDegrees < 270) {
            leftCoord = boundingBox.x + boundingBox.width;
            topCoord = boundingBox.y + boundingBox.height;
            rightCoord = boundingBox.x;
            bottomCoord = boundingBox.y;
          } else {
            leftCoord = boundingBox.x;
            topCoord = boundingBox.y + boundingBox.height;
            rightCoord = boundingBox.x + boundingBox.width;
            bottomCoord = boundingBox.y;
          }

          // Calculate intersections with bounding box edges
          const line1 = topCoord - leftCoord * perpAngleTangent;
          const line2 = bottomCoord - rightCoord * perpAngleTangent;
          startPosition.x = (line1 - lineIntercept) / (angleTangent - perpAngleTangent);
          startPosition.y = startPosition.x * angleTangent + lineIntercept;
          endPosition.x = (line2 - lineIntercept) / (angleTangent - perpAngleTangent);
          endPosition.y = endPosition.x * angleTangent + lineIntercept;
        }
      }

      // Set attributes for the gradient element based on its type
      if (isLinearGradient) {
        gradientData.gradientElem.attr({
          x1: startPosition.x,
          y1: startPosition.y,
          x2: endPosition.x,
          y2: endPosition.y,
          gradientUnits: "userSpaceOnUse",
        });
      } else {
        gradientData.gradientElem.attr({
          cx: startPosition.x,
          cy: startPosition.y,
          r: gradientDistance,
          gradientUnits: "userSpaceOnUse",
        });
      }

      // Apply the gradient to the element
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

    /*
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
    */

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

  /**
   * Sets a texture stroke for the element
   * @param textureSettings - The texture settings including URL, scale, alignment, and dimensions
   */
  SetTextureStroke(textureSettings) {
    console.log('= B.Element.SetTextureStroke: input =>', { textureSettings });

    if (textureSettings && textureSettings.url) {
      // Clear previous stroke color data
      this.ClearColorData(false);

      // Initialize stroke texture parameters with readable values
      this.strokePatternData = {};
      this.strokePatternData.options = {};
      this.strokePatternData.options.scale = textureSettings.scale || 1;
      this.strokePatternData.options.alignment = textureSettings.alignment || 0;
      this.strokePatternData.url = textureSettings.url;
      this.strokePatternData.ID = Utils1.MakeGuid();
      this.strokePatternData.imgWidth = textureSettings.dim.x;
      this.strokePatternData.imgHeight = textureSettings.dim.y;
      this.strokePatternData.patternElem = null;
      this.strokePatternData.imageElem = null;
      this.strokePatternData.isTexture = true;

      // Update the pattern for the stroke texture
      this.UpdatePattern(this.strokePatternData.ID, false);
    }

    console.log('= B.Element.SetTextureStroke: output =>', { strokePatternData: this.strokePatternData });
  }

  /**
   * Sets a gradient stroke for the element
   * @param gradientSettings - The gradient settings including type, stops, and position
   */
  SetGradientStroke(gradientSettings) {
    console.log("= B.Element.SetGradientStroke: input =>", { gradientSettings });

    if (gradientSettings && gradientSettings.stops && gradientSettings.stops.length) {
      // Clear previous stroke color data
      this.ClearColorData(false);

      // Initialize new stroke gradient data with readable parameters
      this.strokeGradientData = {};
      this.strokeGradientData.settings = {};
      this.strokeGradientData.settings.stops = [];
      this.strokeGradientData.settings.type = gradientSettings.type || BasicConstants.GradientStyle.LINEAR;
      this.strokeGradientData.settings.startPos = gradientSettings.startPos || BasicConstants.GradientPos.LEFTTOP;
      this.strokeGradientData.settings.angle = gradientSettings.angle;

      // Process each gradient stop
      for (let i = 0; i < gradientSettings.stops.length; i++) {
        const stop = gradientSettings.stops[i];
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

  /**
   * Sets the stroke width for the element and updates any stroke dash patterns
   * @param strokeWidth - The width of the stroke as a number or string
   */
  SetStrokeWidth(strokeWidth: number | string) {
    console.log("= B.Element.SetStrokeWidth: input =>", { strokeWidth });

    // Set the initial stroke-width attribute
    this.svgObj.attr("stroke-width", strokeWidth);

    // Check if strokeWidth is not a number and parse it if necessary
    if (isNaN(Number(strokeWidth))) {
      strokeWidth = Instance.Basic.Symbol.ParsePlaceholder(strokeWidth, BasicConstants.Placeholder.LineThick);
    }

    // Update the strokeWidth property with a numeric value
    this.strokeWidth = Number(strokeWidth);

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
    // console.log('= B.Element.ClearAllCursors: input => {}');
    Element.RemoveCursorsOnSVGObj(this.svgObj);
    // console.log('= B.Element.ClearAllCursors: output => {}');
  }

  static RemoveCursorsOnSVGObj(e: any): void {
    // console.log('= B.Element.RemoveCursorsOnSVGObj: input =>', { e });

    if (e.SDGObj) {
      e.SDGObj.cursor = null;
    }

    if (e.node) {
      e.node.removeAttribute('class');
    }

    if (e instanceof T3Svg.Container) {
      const children = e.children();
      for (let i = 0; i < children.length; i++) {
        Element.RemoveCursorsOnSVGObj(children[i]);
      }
    }

    // console.log('= B.Element.RemoveCursorsOnSVGObj: output =>', { completed: true });
  }

}

export default Element
