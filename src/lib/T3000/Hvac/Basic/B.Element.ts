

import T3Svg from "../Util/T3Svg"
import Effects from "./B.Element.Effects"
import Style from "./B.Element.Style"
import Utils1 from "../Util/Utils1"
import Instance from "../Data/Instance/Instance"
import BConstant from "./B.Constant"
import BBoxModel from "../Model/BBoxModel"
import TextConstant from "../Data/Constant/TextConstant"
import T3Util from "../Util/T3Util"

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
  public geometryBBox: BBoxModel;
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

  /**
   * Initializes the element with necessary document and parent references
   * @param svgDocument - The SVG document this element belongs to
   * @param parentElement - The parent element containing this element
   */
  InitElement(svgDocument: any, parentElement: any) {
    this.doc = svgDocument;
    this.parent = parentElement;
    this.svgObj.SDGObj = this;
    this.ID = null;
    this.style = null;
    this.effects = null;
    this.userData = null;
    this.cursor = null;
    this.strokeWidth = 0;
    this.mirrored = false;
    this.flipped = false;
    this.geometryBBox = new BBoxModel();
    this.fillPatternData = null;
    this.strokePatternData = null;
    this.internalID = null;
  }

  /**
   * Creates an element in the SVG document
   * @param svgDocument - The SVG document to create the element in
   * @param parentElement - The parent element that will contain this element
   * @throws Returns initialization result
   */
  CreateElement(svgDocument: any, parentElement: any) {
    const result = this.InitElement(svgDocument, parentElement);
    throw result;
  }

  /**
   * Gets the document this element belongs to
   * @returns The SVG document reference
   */
  Document() {
    return this.doc;
  }

  /**
   * Gets the parent element of this element
   * @returns The parent element reference
   */
  Parent() {
    return this.parent;
  }

  /**
   * Gets the DOM element associated with this element
   * @returns The native DOM element node
   */
  DOMElement() {
    return this.svgObj ? this.svgObj.node : null;
  }

  /**
   * Checks if this element is currently in the document
   * @returns True if the element is in the document, false otherwise
   */
  InDocument() {
    if (!this.svgObj) {
      return false;
    }
    let parent = this.svgObj.parent;
    while (parent) {
      if (parent.type === 'svg') {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }

  /**
   * Sets the ID of this element
   * @param newID - The new ID to assign to this element
   */
  SetID(newID: string) {
    this.ID = newID;
  }

  /**
   * Sets whether this element should be excluded from export operations
   * @param shouldExclude - True to exclude this element from export, false to include it
   */
  ExcludeFromExport(shouldExclude: boolean) {
    if (shouldExclude) {
      this.svgObj.node.setAttribute('no-export', '1');
    } else {
      this.svgObj.node.removeAttribute('no-export');
    }
  }

  /**
   * Sets a custom attribute on the element
   * @param attributeName - The name of the attribute to set
   * @param attributeValue - The value to assign to the attribute (null to remove)
   */
  SetCustomAttribute(attributeName: string, attributeValue: string) {
    if (attributeValue) {
      this.svgObj.node.setAttribute(attributeName, attributeValue);
    } else {
      this.svgObj.node.removeAttribute(attributeName);
    }
  }

  /**
   * Gets the value of a custom attribute on the element
   * @param attributeName - The name of the attribute to retrieve
   * @returns The attribute value or null if not set
   */
  GetCustomAttribute(attributeName: string) {
    return this.svgObj.node.getAttribute(attributeName);
  }

  /**
   * Sets a hyperlink attribute on the element
   * @param hyperlink - The URL or reference to set as a hyperlink
   */
  SetHyperlinkAttribute(hyperlink: string) {
    const resolvedHyperlink = Utils1.ResolveHyperlink(hyperlink);
    if (resolvedHyperlink) {
      this.SetCustomAttribute('_explink_', resolvedHyperlink);
    }
  }

  /**
   * Gets the ID of this element
   * @returns The element's ID
   */
  GetID() {
    return this.ID;
  }

  /**
   * Gets the internal ID of this element, generating one if it doesn't exist
   * @returns The element's internal ID
   */
  GetInternalID() {
    return this.internalID || (this.internalID = Utils1.MakeGuid());
  }

  /**
   * Sets the internal ID as the element's ID attribute in the DOM
   * @returns The assigned internal ID
   */
  SetInternalID() {
    const internalID = this.GetInternalID();
    this.svgObj.attr('id', internalID);
    return internalID;
  }

  /**
   * Sets custom user data associated with this element
   * @param userData - The user data to store with this element
   */
  SetUserData(userData: any) {
    this.userData = userData;
  }

  /**
   * Gets the custom user data associated with this element
   * @returns The stored user data
   */
  GetUserData() {
    return this.userData;
  }

  /**
   * Sets an event proxy for handling events on this element
   * @param eventProxy - The event proxy object
   */
  SetEventProxy(eventProxy: any) {
    this.eventProxy = eventProxy;
  }

  /**
   * Gets the event proxy associated with this element
   * @returns The event proxy object
   */
  GetEventProxy() {
    return this.eventProxy;
  }

  /**
   * Sets the size of the element
   * @param width - The new width of the element
   * @param height - The new height of the element
   */
  SetSize(width: number, height: number) {
    width = Utils1.RoundCoord(width);
    height = Utils1.RoundCoord(height);

    this.svgObj.size(width, height);
    this.UpdateTransform();

    this.geometryBBox.width = width;
    this.geometryBBox.height = height;

    this.RefreshPaint();
  }

  /**
   * Sets the position of the element
   * @param x - The x-coordinate position
   * @param y - The y-coordinate position
   */
  SetPos(x: number, y: number) {
    x = Utils1.RoundCoord(x);
    y = Utils1.RoundCoord(y);

    this.svgObj.transform({ x, y });

    if (this.GetRotation()) {
      this.SetRotation(this.GetRotation());
    }

    this.UpdateTransform();
    this.RefreshPaint(true);
  }

  /**
   * Gets the current position of the element
   * @returns An object with x and y coordinates
   */
  GetPos() {
    return {
      x: this.svgObj.trans.x,
      y: this.svgObj.trans.y
    };
  }

  /**
   * Sets the center position of the element
   * @param centerX - The x-coordinate of the center
   * @param centerY - The y-coordinate of the center
   */
  SetCenter(centerX: number, centerY: number) {
    const bbox = this.CalcBBox();
    const newX = centerX - bbox.width / 2;
    const newY = centerY - bbox.height / 2;

    this.SetPos(newX, newY);
  }

  /**
   * Sets the rotation of the element around a specified center point
   * @param rotationAngle - The angle in degrees to rotate the element
   * @param centerPointX - The x-coordinate of the rotation center (defaults to element's center x)
   * @param centerPointY - The y-coordinate of the rotation center (defaults to element's center y)
   */
  SetRotation(rotationAngle: number, centerPointX?: number, centerPointY?: number) {
    let boundingBox;
    if (centerPointX === undefined) {
      boundingBox = this.CalcBBox();
      centerPointX = boundingBox.cx;
    }
    if (centerPointY === undefined) {
      boundingBox = boundingBox || this.CalcBBox();
      centerPointY = boundingBox.cy;
    }

    centerPointX = Utils1.RoundCoord(centerPointX);
    centerPointY = Utils1.RoundCoord(centerPointY);
    rotationAngle = Utils1.RoundCoord(rotationAngle);

    this.svgObj.transform({
      rotation: rotationAngle,
      cx: centerPointX,
      cy: centerPointY
    });

    this.UpdateTransform();
  }

  /**
   * Gets the current rotation angle of the element
   * @returns The rotation angle in degrees
   */
  GetRotation() {
    return this.svgObj.trans.rotation;
  }

  /**
   * Sets whether the element should be mirrored horizontally
   * @param isMirrored - True to mirror the element horizontally, false otherwise
   */
  SetMirror(isMirrored: boolean) {
    this.mirrored = isMirrored;
    this.UpdateTransform();
  }

  /**
   * Gets whether the element is currently mirrored horizontally
   * @returns True if the element is mirrored, false otherwise
   */
  GetMirror() {
    return this.mirrored;
  }

  /**
   * Sets whether the element should be flipped vertically
   * @param isFlipped - True to flip the element vertically, false otherwise
   */
  SetFlip(isFlipped: boolean) {
    this.flipped = isFlipped;
    this.UpdateTransform();
  }

  /**
   * Gets whether the element is currently flipped vertically
   * @returns True if the element is flipped, false otherwise
   */
  GetFlip() {
    return this.flipped;
  }

  /**
   * Sets the scaling factors for the element
   * @param scaleFactorX - The horizontal scaling factor
   * @param scaleFactorY - The vertical scaling factor
   */
  SetScale(scaleFactorX: number, scaleFactorY: number) {
    this.GetScaleElement().transform({
      scaleX: scaleFactorX,
      scaleY: scaleFactorY
    });

    this.UpdateTransform();
  }

  /**
   * Gets the current scaling factors of the element
   * @returns An object containing the horizontal (scaleX) and vertical (scaleY) scaling factors
   */
  GetScale() {
    const scaleElement = this.GetScaleElement();
    return {
      scaleX: scaleElement.trans.scaleX || 1,
      scaleY: scaleElement.trans.scaleY || 1
    };
  }

  /**
   * Sets whether the element should be visible
   * @param isVisible - True to make the element visible, false to hide it
   */
  SetVisible(isVisible: boolean) {
    if (isVisible) {
      this.svgObj.show();
    } else {
      this.svgObj.hide();
    }
  }

  /**
   * Gets whether the element is currently visible
   * @returns True if the element is visible, false otherwise
   */
  GetVisible() {
    return this.svgObj.visible();
  }

  /**
   * Gets the basic bounding box of the element without transformations
   * @returns The bounding box object with x, y, width, and height properties
   */
  GetBBox() {
    let boundingBox;
    let formattingLayer = null;

    if (!this.parent) {
      formattingLayer = this.doc.GetFormattingLayer();
      formattingLayer.AddElement(this);
    }

    boundingBox = this.svgObj.bbox();

    if (formattingLayer) {
      formattingLayer.RemoveElement(this);
    }

    return boundingBox;
  }

  /**
   * Calculates the bounding box including transformations with center points
   * @returns The bounding box object with x, y, width, height, cx, and cy properties
   */
  CalcBBox() {
    const elementFrame = this.CalcElementFrame(true);
    const result = {
      ...elementFrame,
      cx: elementFrame.x + elementFrame.width / 2,
      cy: elementFrame.y + elementFrame.height / 2
    };
    return result;
  }

  /**
   * Gets the rotated bounding box of the element in screen coordinates
   * @returns The rotated bounding box object
   */
  GetRBox() {
    let formattingLayer = null;
    if (!this.parent) {
      formattingLayer = this.doc.GetFormattingLayer();
      formattingLayer.AddElement(this);
    }
    const rotatedBox = this.svgObj.rbox();
    if (formattingLayer) {
      formattingLayer.RemoveElement(this);
    }
    return rotatedBox;
  }

  /**
   * Updates the transformation matrix for this element, including handling of mirroring and flipping operations
   * This method recalculates and applies all transformations to ensure proper rendering
   */
  UpdateTransform() {
    T3Util.Log("= B.Element: UpdateTransform - Starting transformation update for element", this.ID);

    let temporaryFormattingLayer = null;

    // If element has no parent, temporarily add it to formatting layer for calculations
    if (!this.parent) {
      T3Util.Log("= B.Element: UpdateTransform - No parent found, using formatting layer");
      temporaryFormattingLayer = this.doc.GetFormattingLayer();
      temporaryFormattingLayer.AddElement(this);
    }

    // Get the element to which scaling should be applied
    const scaleableElement = this.GetScaleElement();
    scaleableElement.transform({});

    // Apply mirroring and flipping transformations if needed
    if (this.mirrored || this.flipped) {
      let transformationMatrix;
      const elementBoundingBox = this.CalcBBox();
      const horizontalScale = scaleableElement.trans.scaleX || 1;
      const verticalScale = scaleableElement.trans.scaleY || 1;

      T3Util.Log("= B.Element: UpdateTransform - Processing mirror/flip with scales",
        { horizontalScale, verticalScale });

      // Get the current transformation matrix
      transformationMatrix = scaleableElement.node.transform.baseVal.consolidate().matrix;

      // Adjust dimensions for proper transformation calculations
      elementBoundingBox.width /= horizontalScale;
      elementBoundingBox.height /= verticalScale;

      // Apply horizontal mirroring if needed
      if (this.mirrored) {
        T3Util.Log("= B.Element: UpdateTransform - Applying horizontal mirroring");
        transformationMatrix = transformationMatrix.flipX().translate(-elementBoundingBox.width, 0);
      }

      // Apply vertical flipping if needed
      if (this.flipped) {
        T3Util.Log("= B.Element: UpdateTransform - Applying vertical flipping");
        transformationMatrix = transformationMatrix.flipY().translate(0, -elementBoundingBox.height);
      }

      // Convert matrix to a string representation with rounded values for better performance
      const transformationString = `matrix(${Utils1.RoundCoord(transformationMatrix.a)} ${Utils1.RoundCoord(transformationMatrix.b)} ${Utils1.RoundCoord(transformationMatrix.c)} ${Utils1.RoundCoord(transformationMatrix.d)} ${Utils1.RoundCoord(transformationMatrix.e)} ${Utils1.RoundCoord(transformationMatrix.f)})`;

      // Apply the transformation string to the element
      scaleableElement.attr('transform', transformationString);

      T3Util.Log("= B.Element: UpdateTransform - Applied transformation matrix", transformationString);
    }

    // Remove the element from the temporary formatting layer if it was added
    if (temporaryFormattingLayer) {
      temporaryFormattingLayer.RemoveElement(this);
      T3Util.Log("= B.Element: UpdateTransform - Removed from temporary formatting layer");
    }

    // Clean up any unused graphics resources
    Utils1.CleanGraphics();

    T3Util.Log("= B.Element: UpdateTransform - Completed transformation update");
  }

  /**
   * Gets the element to which scaling transformations should be applied
   * @returns The SVG element that should receive scaling transformations
   */
  GetScaleElement() {
    return this.svgObj;
  }

  /**
 * Calculates the bounding box of the element, including transformations.
 * @param includeTransformations - Whether to include transformations in the calculation.
 * @returns The bounding box of the element.
 */
  CalcElementFrame(includeTransformations?) {
    for (
      var geometryBBox = this.GetGeometryBBox(),
      boundingBox = {
        x: geometryBBox.x,
        y: geometryBBox.y,
        width: geometryBBox.width,
        height: geometryBBox.height
      },
      currentElement = this.svgObj;
      currentElement &&
      currentElement !== this.doc.svgObj &&
      (boundingBox.x += currentElement.trans.x, boundingBox.y += currentElement.trans.y, currentElement = currentElement.parent, !includeTransformations);
    );
    return boundingBox
  }

  /**
   * Calculates the geometric bounding box for the element
   * @returns The element's geometric bounding box with x, y, width, and height properties
   */
  GetGeometryBBox() {
    if (this.geometryBBox.width < 0 || this.geometryBBox.height < 0) {
      const formattingLayer = this.doc.GetFormattingLayer();
      const originalPosition = {
        x: this.svgObj.trans.x,
        y: this.svgObj.trans.y
      };
      const originalRotation = this.svgObj.trans.rotation;
      const parentElement = this.svgObj.parent;
      let elementPositionIndex = 0;

      if (parentElement) {
        elementPositionIndex = this.svgObj.position();
        parentElement.remove(this.svgObj);
      }

      formattingLayer.svgObj.add(this.svgObj);
      this.svgObj.transform({
        x: 0,
        y: 0,
        rotation: 0
      });

      const rotatedBox = this.svgObj.rbox();
      formattingLayer.svgObj.remove(this.svgObj);

      const documentCoordinates = this.doc.ConvertWindowToDocCoords(rotatedBox.x, rotatedBox.y);
      this.geometryBBox.x = documentCoordinates.x;
      this.geometryBBox.y = documentCoordinates.y;
      this.geometryBBox.width = rotatedBox.width;
      this.geometryBBox.height = rotatedBox.height;

      this.svgObj.transform({
        x: originalPosition.x,
        y: originalPosition.y,
        rotation: originalRotation
      });

      if (parentElement) {
        parentElement.add(this.svgObj, elementPositionIndex);
      }

      this.UpdateTransform();
    }

    return this.geometryBBox;
  }

  /**
   * Gets the bounds of any arrowheads on the element
   * @returns Array of arrowhead bounds
   */
  GetArrowheadBounds() {
    return [];
  }

  /**
   * Sets a tooltip for the element
   * @param tooltipText - The text to show in the tooltip
   */
  SetTooltip(tooltipText: string): void {
    Element.SetTooltipOnElement(this.svgObj, tooltipText);
  }

  /**
   * Sets a tooltip on a specific SVG element
   * @param element - The SVG element to add the tooltip to
   * @param tooltipText - The text to show in the tooltip
   */
  static SetTooltipOnElement(element: any, tooltipText: string) {
    if (element && element instanceof T3Svg.Container) {
      const titleElement = new T3Svg.Element(T3Svg.create('title'));
      titleElement.node.textContent = tooltipText;
      element.add(titleElement);
    }
  }

  /**
   * Gets the style object for this element, creating it if it doesn't exist
   * @returns The style object for this element
   */
  Style(): Style {
    if (!this.style) {
      this.style = new Style(this);
    }
    return this.style;
  }

  /**
   * Sets the fill color for the element
   * @param color - The color to set for the fill
   */
  SetFillColor(color: string): void {
    this.svgObj.attr('fill', color);
    this.ClearColorData(true);
  }

  /**
   * Sets an image fill for the element
   * @param imageUrl - The URL of the image to use for filling the element
   * @param options - Options for the image fill including cropRect, scaleType, imageWidth, and imageHeight
   */
  SetImageFill(imageUrl: string, options?: any) {
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
  }

  /**
   * Updates the current image fill with new options
   * @param options - New options for the image fill including cropRect and scaleType
   */
  UpdateImageFill(options: { cropRect?: any; scaleType?: string } = {}): void {
    if (this.fillPatternData && this.fillPatternData.isImage) {
      this.fillPatternData.options.cropRect = options.cropRect || this.fillPatternData.options.cropRect;
      this.fillPatternData.options.scaleType = options.scaleType || this.fillPatternData.options.scaleType;

      this.UpdatePattern(this.fillPatternData.ID, true);
    }
  }

  /**
   * Sets a texture fill for the element
   * @param textureSettings - The texture settings including URL, scale, alignment, and dimensions
   */
  SetTextureFill(textureSettings: any): void {
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
  }

  /**
   * Sets a gradient fill for the element
   * @param gradientSettings - The gradient settings including type, stops, and position
   */
  SetGradientFill(gradientSettings) {
    if (gradientSettings && gradientSettings.stops && gradientSettings.stops.length) {
      // Clear previous fill color data
      this.ClearColorData(true);

      // Initialize new gradient fill data with readable parameters
      this.fillGradientData = {};
      this.fillGradientData.settings = {};
      this.fillGradientData.settings.stops = [];
      this.fillGradientData.settings.type = gradientSettings.type || BConstant.GradientStyle.Linear;
      this.fillGradientData.settings.startPos = gradientSettings.startPos || BConstant.GradientPos.LeftTop;
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
    }
  }

  /**
   * Clears fill or stroke pattern/gradient data for the element
   * @param isFill - If true, clears fill data, otherwise clears stroke data
   */
  ClearColorData(isFill: boolean) {
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
  }

  /**
   * Updates a fill or stroke pattern for the element
   * @param patternId - The ID of the pattern to update
   * @param isFill - If true, updates fill pattern, otherwise updates stroke pattern
   */
  UpdatePattern(patternId: string, isFill: boolean) {

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
  }

  /**
   * Updates an image pattern with proper scaling and positioning
   * @param patternData - The image pattern data to update
   */
  UpdateImagePattern(patternData) {

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
  }

  /**
   * Updates a texture pattern with proper scaling and positioning
   * @param patternData - The texture pattern data to update
   */
  UpdateTexturePattern(patternData) {

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
        case TextConstant.TextureAlign.TopLeft:
          // Default position is already top-left
          break;
        case TextConstant.TextureAlign.TopCenter:
          patternRect.x += elementFrame.width / 2;
          break;
        case TextConstant.TextureAlign.TopRight:
          patternRect.x = elementFrame.width - scaledImageSize.width;
          break;
        case TextConstant.TextureAlign.CenterLeft:
          patternRect.y += elementFrame.height / 2;
          break;
        case TextConstant.TextureAlign.Center:
          patternRect.x += elementFrame.width / 2;
          patternRect.y += elementFrame.height / 2;
          break;
        case TextConstant.TextureAlign.CenterRight:
          patternRect.x = elementFrame.width - scaledImageSize.width;
          patternRect.y += elementFrame.height / 2;
          break;
        case TextConstant.TextureAlign.BottomLeft:
          patternRect.y = elementFrame.height - scaledImageSize.height;
          break;
        case TextConstant.TextureAlign.BottomCenter:
          patternRect.x += elementFrame.width / 2;
          patternRect.y = elementFrame.height - scaledImageSize.height;
          break;
        case TextConstant.TextureAlign.BottomRight:
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
  }

  /**
   * Updates a fill or stroke gradient for the element
   * @param gradientId - The ID of the gradient to update
   * @param isFill - If true, updates fill gradient, otherwise updates stroke gradient
   */
  UpdateGradient(gradientId: string, isFill: boolean) {

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
          case BConstant.GradientStyle.Radialfill:
          case BConstant.GradientStyle.Radial:
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

      isLinearGradient = gradientData.settings.type === BConstant.GradientStyle.Linear;
      startPosition.x = boundingBox.x;
      startPosition.y = boundingBox.y;
      endPosition.x = startPosition.x + boundingBox.width;
      endPosition.y = startPosition.y + boundingBox.height;

      // Adjust positions based on the start position setting
      switch (gradientData.settings.startPos) {
        case BConstant.GradientPos.Top:
          startPosition.x += boundingBox.width / 2;
          endPosition.x = startPosition.x;
          gradientDistance = boundingBox.height;
          break;
        case BConstant.GradientPos.RightTop:
          startPosition.x = endPosition.x;
          endPosition.x = boundingBox.x;
          break;
        case BConstant.GradientPos.Right:
          startPosition.x = endPosition.x;
          startPosition.y += boundingBox.height / 2;
          endPosition.x = boundingBox.x;
          endPosition.y = startPosition.y;
          gradientDistance = boundingBox.width;
          break;
        case BConstant.GradientPos.RightBottom:
          startPosition.x = endPosition.x;
          startPosition.y = endPosition.y;
          endPosition.x = boundingBox.x;
          endPosition.y = boundingBox.y;
          break;
        case BConstant.GradientPos.Bottom:
          startPosition.x += boundingBox.width / 2;
          startPosition.y = endPosition.y;
          endPosition.x = startPosition.x;
          endPosition.y = boundingBox.y;
          gradientDistance = boundingBox.height;
          break;
        case BConstant.GradientPos.LeftBottom:
          startPosition.y = endPosition.y;
          endPosition.y = boundingBox.y;
          break;
        case BConstant.GradientPos.Left:
          startPosition.y += boundingBox.height / 2;
          endPosition.y = startPosition.y;
          gradientDistance = boundingBox.width;
          break;
        case BConstant.GradientPos.Center:
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
  }

  RefreshPaint(shouldRefreshChildren?: boolean) {

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
  }

  /**
   * Retrieves the dimensions of the image used for filling the element
   * @returns Object containing the width and height of the image fill
   */
  GetImageFillSize() {
    let size = {
      width: 0,
      height: 0
    };

    if (this.fillPatternData && this.fillPatternData.isImage) {
      size.width = this.fillPatternData.imgWidth;
      size.height = this.fillPatternData.imgHeight;
    }

    return size;
  }

  /**
   * Sets the stroke color for the element
   * @param color - The color to set for the element's stroke
   */
  SetStrokeColor(color: string): void {
    this.svgObj.attr('stroke', color);
    this.ClearColorData(false);
  }
  /**
   * Sets a texture stroke for the element
   * @param textureSettings - The texture settings including URL, scale, alignment, and dimensions
   */
  SetTextureStroke(textureSettings) {

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
  }

  /**
   * Sets a gradient stroke for the element
   * @param gradientSettings - The gradient settings including type, stops, and position
   */
  SetGradientStroke(gradientSettings) {

    if (gradientSettings && gradientSettings.stops && gradientSettings.stops.length) {
      // Clear previous stroke color data
      this.ClearColorData(false);

      // Initialize new stroke gradient data with readable parameters
      this.strokeGradientData = {};
      this.strokeGradientData.settings = {};
      this.strokeGradientData.settings.stops = [];
      this.strokeGradientData.settings.type = gradientSettings.type || BConstant.GradientStyle.Linear;
      this.strokeGradientData.settings.startPos = gradientSettings.startPos || BConstant.GradientPos.LeftTop;
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
    }
  }

  /**
   * Sets the stroke width for the element and updates any stroke dash patterns
   * @param strokeWidth - The width of the stroke as a number or string
   */
  SetStrokeWidth(strokeWidth: number | string) {

    // Set the initial stroke-width attribute
    this.svgObj.attr("stroke-width", strokeWidth);

    // Check if strokeWidth is not a number and parse it if necessary
    if (isNaN(Number(strokeWidth))) {
      strokeWidth = Instance.Basic.Symbol.ParsePlaceholder(strokeWidth, BConstant.Placeholder.LineThick);
    }

    // Update the strokeWidth property with a numeric value
    this.strokeWidth = Number(strokeWidth);

    // Update the stroke-dasharray according to the new strokeWidth
    this.svgObj.attr("stroke-dasharray", this.GetStrokePatternForWidth());
  }

  /**
   * Sets the dash pattern for element strokes
   * @param dashArray - A string containing comma-separated dash pattern values
   */
  SetStrokePattern(dashArray: string) {
    this.strokeDashArray = dashArray;
    const patternForWidth = this.GetStrokePatternForWidth();
    this.svgObj.attr('stroke-dasharray', patternForWidth);
  }

  /**
   * Calculates the stroke dash pattern adjusted for the current stroke width
   * @returns A string containing the dash pattern values scaled by stroke width
   */
  GetStrokePatternForWidth() {
    const strokeWidth = this.strokeWidth;
    let dashArrayValues: number[] = [];

    if (this.strokeDashArray) {
      dashArrayValues = this.strokeDashArray.split(',').map(value => Number(value.trim()));
    }

    if (!dashArrayValues.length || !strokeWidth) {
      return 'none';
    }

    const adjustedValues = dashArrayValues.map(value => value * strokeWidth);
    const result = adjustedValues.join(',');
    return result;
  }

  /**
   * Sets the overall opacity of the element
   * @param opacity - The opacity value between 0 (transparent) and 1 (opaque)
   */
  SetOpacity(opacity: number): void {
    this.svgObj.attr('opacity', opacity);
  }

  /**
   * Sets the opacity of just the fill component of the element
   * @param opacity - The fill opacity value between 0 (transparent) and 1 (opaque)
   */
  SetFillOpacity(opacity: number): void {
    this.svgObj.attr('fill-opacity', opacity);
  }

  /**
   * Sets the opacity of just the stroke component of the element
   * @param opacity - The stroke opacity value between 0 (transparent) and 1 (opaque)
   */
  SetStrokeOpacity(opacity: number): void {
    this.svgObj.attr("stroke-opacity", opacity);
  }

  /**
   * Sets the fill rule for the element (how overlapping paths are filled)
   * @param fillRule - The fill rule to apply ("nonzero" or "evenodd")
   */
  SetFillRule(fillRule: string): void {
    this.svgObj.attr("fill-rule", fillRule);
  }

  /**
   * Sets whether the element should be visible
   * @param isVisible - If true, the element is visible; if false, it's hidden
   */
  SetDisplayVisibility(isVisible: boolean): void {
    const visibility = isVisible ? '' : 'hidden';
    this.svgObj.attr('visibility', visibility);
  }

  /**
   * Gets or creates the effects object for this element
   * @returns The Effects object associated with this element
   */
  Effects() {
    if (!this.effects) {
      this.effects = new Effects(this);
    }
    return this.effects;
  }

  /**
   * Sets a filter effect on the element using a filter ID
   * @param effectID - The ID of the filter to apply
   */
  SetEffect(effectID: string): void {
    this.svgObj.attr('filter', `url(#${effectID})`);
  }

  /**
   * Sets how the element responds to pointer events
   * @param eventBehavior - The pointer-events value (e.g., "none", "auto", "stroke")
   */
  SetEventBehavior(eventBehavior: string): void {
    this.svgObj.attr('pointer-events', eventBehavior);
  }

  /**
   * Gets the current pointer events behavior of the element
   * @returns The current pointer-events attribute value
   */
  GetEventBehavior() {
    return this.svgObj.attr('pointer-events');
  }

  /**
   * Removes the pointer-events attribute from the element
   */
  ClearEventBehavior() {
    this.svgObj.node.removeAttribute('pointer-events');
  }

  /**
   * Sets the cursor style when hovering over this element
   * @param cursorValue - The CSS class name for the cursor style
   */
  SetCursor(cursorValue: string): void {
    this.cursor = cursorValue;
    if (cursorValue) {
      this.svgObj.node.setAttribute('class', cursorValue);
    } else {
      this.svgObj.node.removeAttribute('class');
    }
  }

  /**
   * Gets the current cursor style applied to this element
   * @returns The current cursor style class name
   */
  GetCursor() {
    return this.cursor;
  }

  /**
   * Clears all cursor styles from this element
   */
  ClearAllCursors(): void {
    Element.RemoveCursorsOnSVGObj(this.svgObj);
  }

  /**
   * Recursively removes cursor styles from an SVG object and its children
   * @param svgObject - The SVG object to remove cursors from
   */
  static RemoveCursorsOnSVGObj(svgObject: any): void {
    if (svgObject.SDGObj) {
      svgObject.SDGObj.cursor = null;
    }

    if (svgObject.node) {
      svgObject.node.removeAttribute('class');
    }

    if (svgObject instanceof T3Svg.Container) {
      const children = svgObject.children();
      for (let i = 0; i < children.length; i++) {
        Element.RemoveCursorsOnSVGObj(children[i]);
      }
    }
  }

}

export default Element
