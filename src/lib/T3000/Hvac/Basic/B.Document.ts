

import T3Svg from "../Util/T3Svg"
import $ from 'jquery'
import Rect from './B.Rect'
import Container from './B.Container'
import RRect from './B.RRect'
import Oval from './B.Oval'
import Line from './B.Line'
import PolyLine from './B.PolyLine'
import PolyPolyLine from './B.PolyPolyLine'
import Polygon from './B.Polygon'
import Path from './B.Path'
import Group from './B.Group'
import Layer from './B.Layer'
import Symbol from './B.Symbol'
import ShapeContainer from './B.ShapeContainer'
import ShapeCopy from './B.ShapeCopy'
import Text from './B.Text'
import Formatter from "./B.Text.Formatter"
import Image from './B.Image'
import Utils1 from "../Util/Utils1"
import NvConstant from "../Data/Constant/NvConstant"
import OptConstant from "../Data/Constant/OptConstant"
import DocInfo from "../Model/DocInfo"

class Document extends Container {

  /**
   * Document class that represents the main drawing canvas for HVAC elements
   * Handles document initialization, scaling, coordinate transformations, and layer management
   */
  public parentElem: any;
  public svgObj: any;
  public docInfo: DocInfo;
  public activeEdit: any;
  public spellChecker: any;
  public documentLayerId: string;
  public imageLoadRefCount: number;

  /**
   * Creates a new Document instance
   * @param parentElementSelector - CSS selector for the parent element where SVG will be rendered
   * @param fontList - List of available fonts for the document
   */
  constructor(parentElementSelector: string, fontList: any[]) {
    super();

    this.parentElem = parentElementSelector;
    if (this.parentElem.charAt(0) !== '#' && this.parentElem.charAt(0) !== '.') {
      this.parentElem = '#' + this.parentElem;
    }

    this.svgObj = T3Svg.svg($(this.parentElem)[0]);
    this.docInfo = new DocInfo();
    // this.fontList = fontList;
    this.activeEdit = null;
    this.spellChecker = null;
    this.documentLayerId = null;
    this.imageLoadRefCount = 0;
    this.InitElement(this, null);
    this.InitializeContainer();
  }

  /**
   * Creates and initializes a basic shape based on the specified shape type
   *
   * This method instantiates a new shape object according to the provided shape type constant.
   * It initializes the shape within the document context and returns the created object.
   *
   * @param shapeType - Numeric constant defining which type of shape to create
   * @returns The initialized shape object, or null if the shape type is invalid
   */
  CreateShape(shapeType: number) {
    let shape = null;

    switch (shapeType) {
      case OptConstant.CSType.Rect:
        shape = new Rect();
        break;
      case OptConstant.CSType.RRect:
        shape = new RRect();
        break;
      case OptConstant.CSType.Oval:
        shape = new Oval();
        break;
      case OptConstant.CSType.Line:
        shape = new Line();
        break;
      case OptConstant.CSType.Polyline:
        shape = new PolyLine();
        break;
      case OptConstant.CSType.PolyPolyline:
        shape = new PolyPolyLine();
        break;
      case OptConstant.CSType.PolylineContainer:
        shape = new PolyLine();
        break;
      case OptConstant.CSType.Polygon:
        shape = new Polygon();
        break;
      case OptConstant.CSType.Path:
        shape = new Path();
        break;
      case OptConstant.CSType.Text:
        shape = new Text();
        break;
      case OptConstant.CSType.Image:
        shape = new Image();
        break;
      case OptConstant.CSType.Group:
        shape = new Group();
        break;
      case OptConstant.CSType.Layer:
        shape = new Layer();
        break;
      case OptConstant.CSType.Symbol:
        shape = new Symbol();
        break;
      case OptConstant.CSType.ShapeCopy:
        shape = new ShapeCopy();
        break;
      case OptConstant.CSType.ShapeContainer:
        shape = new ShapeContainer();
        break;
      default:
        return null;
    }

    try {
      if (shape) {
        shape.CreateElement(this, null);
        return shape;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Initializes the document container with default settings
   *
   * This method sets up the initial document properties by:
   * - Retrieving device information (display DPI)
   * - Setting document dimensions to match the display dimensions
   * - Configuring initial scale and scroll positions to default values
   * - Calculating the work area based on these settings
   * - Applying the document transform to ensure proper rendering
   *
   * @returns void
   */
  InitializeContainer() {
    this.GetDeviceDetail();
    this.docInfo.docDpi = this.docInfo.dispDpiX;
    this.docInfo.docWidth = this.docInfo.dispWidth;
    this.docInfo.docHeight = this.docInfo.dispHeight;
    this.docInfo.docScale = 1;
    this.docInfo.scrollX = 0;
    this.docInfo.scrollY = 0;
    this.CalcWorkArea();
    this.ApplyDocumentTransform();
  }

  /**
   * Retrieves and updates the device display information.
   *
   * This method performs the following operations:
   * - Creates a temporary rectangular shape with a size of 100in by 100in.
   * - Sets the temporary shape's fill opacity to 0 and stroke width to 0.
   * - Adds the shape to the document in order to measure its bounding box.
   * - Calculates the display DPI (dots per inch) for both X and Y axes by dividing the bounding box's width and height by 100.
   * - Removes the temporary shape element after obtaining the DPI measurements.
   * - Retrieves the display width and height from the parent element's inner dimensions.
   * - Logs the input and output information for debugging purposes.
   *
   * @remarks
   * The method updates the internal document information (this.docInfo) with the calculated DPI and display dimensions.
   *
   * @returns void
   */
  GetDeviceDetail() {
    const rect = this.CreateShape(OptConstant.CSType.Rect);
    rect.SetFillOpacity(0);
    rect.SetStrokeWidth(0);
    rect.SetSize('100in', '100in');
    this.AddElement(rect);

    const bbox = rect.GetBBox();
    this.docInfo.dispDpiX = bbox.width / 100;
    this.docInfo.dispDpiY = bbox.height / 100;
    this.RemoveElement(rect);

    this.docInfo.dispWidth = $(this.parentElem).innerWidth();
    this.docInfo.dispHeight = $(this.parentElem).innerHeight();
  }

  /**
   * Calculates the document's working area dimensions and coordinates
   *
   * This method computes all necessary measurements for properly displaying and
   * interacting with the document, including:
   * - Display offsets and dimensions
   * - Document-to-screen scaling factors
   * - Scroll positions and limits
   * - Visible document area coordinates
   *
   * The calculations consider the parent element dimensions, DPI settings,
   * document scale, and current scroll positions to establish the complete
   * coordinate mapping system between document and screen space.
   *
   * @returns void - Updates the internal docInfo object with calculated values
   */
  CalcWorkArea() {
    // Get the offset position of the parent element relative to the document
    const parentOffset = $(this.parentElem).offset();

    // Set the display X and Y coordinates from the parent's offset
    this.docInfo.dispX = parentOffset.left;
    this.docInfo.dispY = parentOffset.top;

    // Capture the parent element dimensions for display area
    this.docInfo.dispWidth = $(this.parentElem).innerWidth();
    this.docInfo.dispHeight = $(this.parentElem).innerHeight();

    // Get the current scroll positions of the parent element
    this.docInfo.scrollX = $(this.parentElem).scrollLeft();
    this.docInfo.scrollY = $(this.parentElem).scrollTop();

    // Calculate the overall scale factor from document dimensions to screen dimensions
    this.docInfo.docToScreenScale = (this.docInfo.dispDpiX / this.docInfo.docDpi) * this.docInfo.docScale;

    // Calculate the DPI scale factor (ratio between display DPI and document DPI)
    this.docInfo.docDpiScale = this.docInfo.dispDpiX / this.docInfo.docDpi;

    // Calculate document screen coordinates adjusted for scroll positions
    this.docInfo.docScreenX = this.docInfo.dispX - this.docInfo.scrollX;
    this.docInfo.docScreenY = this.docInfo.dispY - this.docInfo.scrollY;

    // Calculate the document's size on the screen using the computed scaling factor
    this.docInfo.docScreenWidth = this.docInfo.docWidth * this.docInfo.docToScreenScale;
    this.docInfo.docScreenHeight = this.docInfo.docHeight * this.docInfo.docToScreenScale;

    // Determine maximum allowed scroll positions
    this.docInfo.maxScrollX = Math.max(0, this.docInfo.docScreenWidth - this.docInfo.dispWidth);
    this.docInfo.maxScrollY = Math.max(0, this.docInfo.docScreenHeight - this.docInfo.dispHeight);

    // Calculate the visible document area dimensions in document coordinates
    this.docInfo.docVisWidth = Math.min(this.docInfo.dispWidth / this.docInfo.docToScreenScale, this.docInfo.docWidth);
    this.docInfo.docVisHeight = Math.min(this.docInfo.dispHeight / this.docInfo.docToScreenScale, this.docInfo.docHeight);

    // Calculate the visible document area origin coordinates
    this.docInfo.docVisX = Math.min(this.docInfo.scrollX / this.docInfo.docToScreenScale,
      this.docInfo.docWidth - this.docInfo.docVisWidth);
    this.docInfo.docVisY = Math.min(this.docInfo.scrollY / this.docInfo.docToScreenScale,
      this.docInfo.docHeight - this.docInfo.docVisHeight);
  }

  /**
   * Applies transformation to document elements based on current scale settings
   *
   * This method updates the SVG dimensions according to calculated screen dimensions
   * and applies appropriate scaling transformations to layers based on their
   * scaling permissions. Layers can be scaled using document-to-screen scale
   * or DPI scale depending on their configuration.
   *
   * @param applyToAllLayers - Whether to apply transformation to all layers regardless of settings
   */
  ApplyDocumentTransform(applyToAllLayers?: boolean) {
    const elementCount = this.ElementCount();
    this.svgObj.attr({
      width: this.docInfo.docScreenWidth,
      height: this.docInfo.docScreenHeight
    });

    if (!applyToAllLayers) {
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

  /**
   * Calculates scale factor to fit document in specified container dimensions
   *
   * Computes the optimal scale factor that would allow the document to fit within
   * the provided container while maintaining aspect ratio. If the document would
   * fit at original size, the scale is capped at 1.
   *
   * @param containerWidth - Width of the container in pixels
   * @param containerHeight - Height of the container in pixels
   * @param documentWidth - Optional custom document width (uses docInfo.docWidth if not provided)
   * @param documentHeight - Optional custom document height (uses docInfo.docHeight if not provided)
   * @returns Object with calculated scale and resulting dimensions
   */
  CalcScaleToFit(containerWidth: number, containerHeight: number, documentWidth?: number, documentHeight?: number) {
    if (!documentWidth) {
      documentWidth = this.docInfo.docWidth;
    }
    if (!documentHeight) {
      documentHeight = this.docInfo.docHeight;
    }

    const dpiScale = this.docInfo.dispDpiX / this.docInfo.docDpi;
    const scaleWidth = containerWidth / (documentWidth * dpiScale);
    const scaleHeight = containerHeight / (documentHeight * dpiScale);
    let scale = Math.min(scaleWidth, scaleHeight);

    if (scale > 1) {
      scale = 1;
    }

    return {
      scale: scale,
      width: this.docInfo.docWidth * dpiScale * scale,
      height: this.docInfo.docHeight * dpiScale * scale
    };
  }

  /**
   * Sets the document's dimensions
   *
   * Updates the document width and height, recalculates the work area,
   * and applies necessary transformations based on the new dimensions.
   *
   * @param width - New document width
   * @param height - New document height
   */
  SetDocumentSize(width: number, height: number) {
    this.SetDocumentMetrics({
      width: width,
      height: height
    });
  }

  /**
   * Retrieves the current document dimensions
   *
   * @returns Object containing document width and height
   */
  GetDocumentSize() {
    return {
      width: this.docInfo.docWidth,
      height: this.docInfo.docHeight
    };
  }

  /**
   * Sets the document's DPI (dots per inch)
   *
   * Updates the document DPI setting, recalculates the work area,
   * and applies necessary transformations based on the new DPI.
   *
   * @param dpi - New DPI value
   */
  SetDocumentDPI(dpi: number) {
    this.SetDocumentMetrics({
      dpi: dpi
    });
  }

  /**
   * Sets the document's scale factor
   *
   * Updates the document scale setting, recalculates the work area,
   * and applies necessary transformations based on the new scale.
   *
   * @param scale - New scale factor
   */
  SetDocumentScale(scale: number) {
    this.SetDocumentMetrics({
      scale: scale
    });
  }

  /**
   * Updates multiple document metrics in a single operation
   *
   * This method allows updating any combination of document width, height,
   * DPI, and scale in a single call. After updating the metrics, it
   * recalculates the work area and applies transformations to reflect
   * the changes.
   *
   * @param metrics - Object containing any combination of width, height, dpi, and scale
   */
  SetDocumentMetrics(metrics: { width?: number, height?: number, dpi?: number, scale?: number }) {
    this.docInfo.docWidth = metrics.width || this.docInfo.docWidth;
    this.docInfo.docHeight = metrics.height || this.docInfo.docHeight;
    this.docInfo.docDpi = metrics.dpi || this.docInfo.docDpi;
    this.docInfo.docScale = metrics.scale || this.docInfo.docScale;

    this.CalcWorkArea();
    this.ApplyDocumentTransform();
  }

  /**
   * Calculates scroll offsets needed to make a point visible
   *
   * Determines if the given document coordinates are within the currently
   * visible area. If not, it calculates the scroll offsets needed to
   * bring that point into view.
   *
   * @param x - X coordinate in document space
   * @param y - Y coordinate in document space
   * @returns Scroll offsets object if scrolling is needed, null otherwise
   */
  CalcScrollToVisible(x: number, y: number) {
    let xOffset = 0;
    let yOffset = 0;
    const visibleRight = this.docInfo.docVisX + this.docInfo.docVisWidth;
    const visibleBottom = this.docInfo.docVisY + this.docInfo.docVisHeight;

    x = Math.max(0, Math.min(x, this.docInfo.docWidth));
    y = Math.max(0, Math.min(y, this.docInfo.docHeight));

    if (x < this.docInfo.docVisX) {
      xOffset = x - this.docInfo.docVisX;
    } else if (x > visibleRight) {
      xOffset = x - visibleRight;
    }

    if (y < this.docInfo.docVisY) {
      yOffset = y - this.docInfo.docVisY;
    } else if (y > visibleBottom) {
      yOffset = y - visibleBottom;
    }

    if (xOffset || yOffset) {
      return {
        xOff: this.docInfo.scrollX + xOffset * this.docInfo.docToScreenScale,
        yOff: this.docInfo.scrollY + yOffset * this.docInfo.docToScreenScale
      };
    }

    return null;
  }

  /**
   * Retrieves the current document work area information
   *
   * Returns the document info object containing all dimensions, coordinates,
   * scaling factors, and other properties defining the current document
   * workspace configuration.
   *
   * @returns Document information object
   */
  GetWorkArea() {
    return this.docInfo;
  }

  /**
   * Converts document coordinates to window coordinates
   *
   * Transforms coordinates from document space to window space by applying
   * the current document-to-screen scaling and offset adjustments.
   *
   * @param documentX - X coordinate in document space
   * @param documentY - Y coordinate in document space
   * @returns Object with transformed coordinates in window space
   */
  ConvertDocToWindowCoords(documentX: number, documentY: number) {
    return {
      x: documentX * this.docInfo.docToScreenScale + this.docInfo.docScreenX,
      y: documentY * this.docInfo.docToScreenScale + this.docInfo.docScreenY
    };
  }

  /**
   * Converts a length measurement from document space to window space
   *
   * Applies the document-to-screen scaling factor to convert a length value
   * from document coordinates to window/screen coordinates.
   *
   * @param length - The length in document space to convert
   * @returns The converted length in window/screen coordinates
   */
  ConvertDocToWindowLength(length: number) {
    return length * this.docInfo.docToScreenScale;
  }

  /**
   * Converts pixel offsets to document coordinates
   *
   * Transforms offset values (typically from mouse events) to document space
   * by dividing by the document-to-screen scale factor.
   *
   * @param offsetX - The X offset in screen pixels
   * @param offsetY - The Y offset in screen pixels
   * @returns Object containing converted X and Y coordinates in document space
   */
  ConvertOffsetToDocCoords(offsetX: number, offsetY: number) {
    return {
      x: offsetX / this.docInfo.docToScreenScale,
      y: offsetY / this.docInfo.docToScreenScale
    };
  }

  /**
   * Converts window/screen coordinates to document coordinates
   *
   * Transforms absolute window coordinates to document space by accounting for
   * document screen position and applying the inverse scaling factor.
   *
   * @param windowX - The X coordinate in window/screen space
   * @param windowY - The Y coordinate in window/screen space
   * @returns Object containing converted X and Y coordinates in document space
   */
  ConvertWindowToDocCoords(windowX: number, windowY: number) {
    return {
      x: (windowX - this.docInfo.docScreenX) / this.docInfo.docToScreenScale,
      y: (windowY - this.docInfo.docScreenY) / this.docInfo.docToScreenScale
    };
  }

  /**
   * Converts a length measurement from window/screen space to document space
   *
   * Applies the inverse of document-to-screen scaling factor to convert a length value
   * from window coordinates to document coordinates.
   *
   * @param length - The length in window/screen space to convert
   * @returns The converted length in document coordinates
   */
  ConvertWindowToDocLength(length: number) {
    return length / this.docInfo.docToScreenScale;
  }

  /**
   * Converts window coordinates to element-local coordinates
   *
   * Transforms window coordinates to the local coordinate system of a specific SVG element
   * by applying appropriate SVG matrix transformations.
   *
   * @param windowX - The X coordinate in window space
   * @param windowY - The Y coordinate in window space
   * @param element - The target SVG element to convert coordinates to
   * @returns Object containing coordinates in the element's local coordinate system
   */
  ConvertWindowToElemCoords(windowX: number, windowY: number, element: any) {
    const svgPoint = this.DOMElement().createSVGPoint();
    const svgElement = this.DOMElement();

    svgPoint.x = windowX;
    svgPoint.y = windowY;

    const transformedPoint = svgPoint
      .matrixTransform(svgElement.getScreenCTM().inverse())
      .matrixTransform(element.getTransformToElement(svgElement).inverse());

    return {
      x: transformedPoint.x,
      y: transformedPoint.y
    };
  }

  /**
   * Converts element-local coordinates to window coordinates
   *
   * Transforms coordinates from an element's local coordinate system to window coordinates
   * by applying appropriate SVG matrix transformations.
   *
   * @param elemX - The X coordinate in element's local space
   * @param elemY - The Y coordinate in element's local space
   * @param element - The source SVG element
   * @returns Object containing coordinates in window space
   */
  ConvertElemToWindowCoords(elemX: number, elemY: number, element: any) {
    const svgPoint = this.DOMElement().createSVGPoint();
    const svgElement = this.DOMElement();

    svgPoint.x = elemX;
    svgPoint.y = elemY;

    const transformedPoint = svgPoint
      .matrixTransform(element.getTransformToElement(svgElement))
      .matrixTransform(svgElement.getScreenCTM());

    return {
      x: transformedPoint.x,
      y: transformedPoint.y
    };
  }

  /**
   * Rotates a point around a specified center point by a given angle
   *
   * Performs a geometric rotation of a point around another point using SVG matrix
   * transformations.
   *
   * @param point - The point to rotate {x, y}
   * @param center - The center point to rotate around {x, y}
   * @param angle - The rotation angle in degrees
   * @returns The rotated point coordinates {x, y}
   */
  RotateAroundCenterPt(point, center, angle) {
    const svgPoint = this.DOMElement().createSVGPoint();
    const svgMatrix = this.DOMElement().createSVGMatrix();

    svgPoint.x = point.x - center.x;
    svgPoint.y = point.y - center.y;

    const rotatedPoint = svgPoint.matrixTransform(svgMatrix.rotate(angle));

    return {
      x: rotatedPoint.x + center.x,
      y: rotatedPoint.y + center.y
    };
  }

  /**
   * Calculates the offset needed when resizing a rotated element
   *
   * Computes the positional adjustment required when resizing an element that has
   * been rotated, ensuring the resize operation respects the rotation angle.
   *
   * @param element - The original element with position and dimensions
   * @param target - The target position and dimensions after resize
   * @param angle - The rotation angle in degrees
   * @returns Object containing the X and Y offsets to apply
   */
  CalculateRotatedOffsetForResize(element, target, angle) {
    const elementCenter = {
      x: element.x + element.width / 2,
      y: element.y + element.height / 2
    };

    const targetCenter = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2
    };

    const rotatedPoint = this.RotateAroundCenterPt(targetCenter, elementCenter, angle);

    return {
      x: rotatedPoint.x - targetCenter.x,
      y: rotatedPoint.y - targetCenter.y
    };
  }

  /**
   * Adds a new layer to the document
   *
   * Creates a layer with the specified ID, adds it to the document,
   * and applies appropriate document transformations.
   *
   * @param layerId - The unique identifier for the layer
   * @returns The newly created layer object
   */
  AddLayer(layerId: string) {
    const layer = this.CreateShape(OptConstant.CSType.Layer);
    layer.SetID(layerId);
    this.AddElement(layer);
    this.ApplyDocumentTransform();
    $(layer.svgObj.node).data('layerID', layerId);

    return layer;
  }

  /**
   * Removes a layer from the document
   *
   * Finds a layer by its ID and removes it from the document if found.
   *
   * @param layerId - The ID of the layer to remove
   */
  RemoveLayer(layerId: string) {
    const layer = this.GetElementById(layerId);
    if (layer) {
      this.RemoveElement(layer);
    }
  }

  /**
   * Retrieves a layer by its ID
   *
   * Searches through all elements in the document to find a Layer element
   * with the specified ID.
   *
   * @param layerId - The ID of the layer to find
   * @returns The found Layer object or null if not found
   */
  GetLayer(layerId: string) {
    let element;
    let layer = null;
    const elementCount = this.ElementCount();

    for (let i = 0; i < elementCount; i++) {
      element = this.GetElementByIndex(i);
      if (element instanceof Layer && element.GetID() === layerId) {
        layer = element;
        break;
      }
    }

    return layer;
  }

  /**
   * Retrieves the current document layer
   *
   * Returns the document's primary layer, either by using the stored document layer ID
   * or by finding the first layer that allows scaling.
   *
   * @returns The document layer, or null if no appropriate layer is found
   */
  GetDocumentLayer() {
    let element;
    let documentLayer = null;
    const elementCount = this.ElementCount();

    for (let i = 0; i < elementCount; i++) {
      element = this.GetElementByIndex(i);
      if (element instanceof Layer) {
        if (this.documentLayerId) {
          if (this.documentLayerId === element.GetID()) {
            documentLayer = element;
            break;
          }
        } else if (element.IsScalingAllowed()) {
          documentLayer = element;
          break;
        }
      }
    }

    return documentLayer;
  }

  /**
   * Sets the specified layer as the active document layer
   *
   * This method establishes a particular layer as the main document layer
   * by storing its ID. The document layer is used as the primary container
   * for drawing elements.
   *
   * @param layerId - The ID of the layer to set as the document layer
   */
  SetDocumentLayer(layerId: string) {
    this.documentLayerId = layerId;
  }

  /**
   * Retrieves or creates a special formatting layer
   *
   * This method returns the formatting layer used for temporary rendering operations.
   * If the formatting layer doesn't exist or isn't properly configured, it creates
   * a new one with appropriate settings (DPI scaling, export exclusion, etc.).
   *
   * @returns The formatting layer object
   */
  GetFormattingLayer() {
    let formattingLayer = this.GetLayer('__FORMATTING__');
    if (formattingLayer && !formattingLayer.IsDpiScalingAllowed()) {
      formattingLayer = null;
    }

    if (!formattingLayer) {
      formattingLayer = this.AddLayer('__FORMATTING__');
      formattingLayer.AllowDpiScalingOnly(true);
      formattingLayer.ExcludeFromExport(true);
      this.MoveLayer('__FORMATTING__', NvConstant.LayerMoveType.Bottom);
      formattingLayer.SetOpacity(0);
      this.ApplyDocumentTransform();
    }

    return formattingLayer;
  }

  /**
   * Finds the layer that appears before the specified layer
   *
   * This method searches through the document's elements to locate the layer
   * that precedes the one with the given ID in the stacking order.
   *
   * @param layerId - The ID of the reference layer
   * @returns The layer object that appears before the specified layer, or null if none found
   */
  GetPreviousLayer(layerId: string) {
    let previousLayer = null;
    const elementCount = this.ElementCount();

    for (let i = 0; i < elementCount; i++) {
      const element = this.GetElementByIndex(i);
      if (element instanceof Layer) {
        if (element.GetID() === layerId) {
          break;
        }
        previousLayer = element;
      }
    }

    return previousLayer;
  }

  /**
   * Finds the layer that appears after the specified layer
   *
   * This method searches through the document's elements to locate the layer
   * that follows the one with the given ID in the stacking order.
   *
   * @param layerId - The ID of the reference layer (optional)
   * @returns The layer object that appears after the specified layer, or null if none found
   */
  GetNextLayer(layerId: string) {
    let nextLayer = null;
    let currentLayer = null;
    let startIndex = 0;
    const elementCount = this.ElementCount();

    if (layerId) {
      currentLayer = this.GetLayer(layerId);
      if (currentLayer) {
        startIndex = this.GetElementIndex(currentLayer) + 1;
      }
    }

    for (let i = startIndex; i < elementCount; i++) {
      const element = this.GetElementByIndex(i);
      if (element instanceof Layer) {
        nextLayer = element;
        break;
      }
    }

    return nextLayer;
  }

  /**
   * Moves a layer to a new position within the document hierarchy
   *
   * This method changes the stacking order of the specified layer based on the
   * requested move type. The layer can be moved to the top, bottom, or before/after
   * another target layer.
   *
   * @param layerId - The ID of the layer to move
   * @param moveType - The type of movement to perform (TOP, BOTTOM, BEFORE, AFTER)
   * @param targetLayerId - The ID of the target layer (required for BEFORE/AFTER moves)
   */
  MoveLayer(layerId: string, moveType: number, targetLayerId?: string) {
    const layer = this.GetLayer(layerId);
    if (!layer) {
      return;
    }

    const totalElements = this.ElementCount();
    let targetIndex = totalElements - 1;
    let currentIndex = this.GetElementIndex(layer);
    let targetLayer = null;
    let targetLayerIndex = 0;

    if (targetLayerId) {
      targetLayer = this.GetLayer(targetLayerId);
      if (targetLayer) {
        targetLayerIndex = this.GetElementIndex(targetLayer);
        if (currentIndex < targetLayerIndex) {
          targetLayerIndex--;
        }
      }
    }

    switch (moveType) {
      case NvConstant.LayerMoveType.Bottom:
        targetIndex = 0;
        break;
      case NvConstant.LayerMoveType.Before:
        targetIndex = targetLayerIndex;
        break;
      case NvConstant.LayerMoveType.After:
        targetIndex = targetLayerIndex + 1;
        break;
      case NvConstant.LayerMoveType.Top:
        targetIndex = totalElements - 1;
        break;
      default:
        return;
    }

    if (targetIndex !== currentIndex) {
      this.RemoveElement(layer);
      this.AddElement(layer, targetIndex);
    }
  }

  /**
   * Text metrics cache to avoid repeated calculations
   */
  static _TextMetricsCache = {}

  /**
   * Retrieves text cache for a specific style, creating one if it doesn't exist
   *
   * @param style - The text style object containing formatting properties
   * @returns Object containing metrics and text cache for the style
   */
  GetTextCacheForStyle(style) {
    const styleID = Formatter.MakeIDFromStyle(style);
    let cache = Document._TextMetricsCache[styleID];

    if (!cache) {
      cache = {
        metrics: Formatter.CalcStyleMetrics(style, this),
        textCache: {}
      };
      Document._TextMetricsCache[styleID] = cache;
    }

    return cache;
  }

  /**
   * Calculates text metrics for a given style
   *
   * @param style - The text style object containing formatting properties
   * @returns Object containing calculated metrics for the style
   */
  CalcStyleMetrics(style) {
    const textCache = this.GetTextCacheForStyle(style);
    const metrics = Utils1.CopyObj(textCache.metrics);

    return metrics;
  }

  /**
   * Retrieves text run cache for positioning characters
   *
   * @param style - The text style object containing formatting properties
   * @param text - The text string to process
   * @returns Object containing character offset positions
   */
  GetTextRunCache(style, text) {
    return { startOffsets: [], endOffsets: [] }
  }

  /**
   * Sets the active editing component, deactivating any previous one
   *
   * @param newEdit - The new edit component to activate
   */
  SetActiveEdit(newEdit) {
    const currentEdit = this.GetActiveEdit();
    if (currentEdit && currentEdit !== newEdit) {
      currentEdit.Deactivate();
    }
    this.activeEdit = newEdit;
  }

  /**
   * Clears the currently active edit component
   *
   * @param event - The event that triggered the clear operation
   */
  ClearActiveEdit(event) {
    const activeEdit = this.GetActiveEdit();
    if (activeEdit) {
      activeEdit.Deactivate(event);
    }
    this.activeEdit = null;
  }

  /**
   * Retrieves the currently active edit component
   *
   * @returns The active edit component or null if none exists
   */
  GetActiveEdit() {
    if (this.activeEdit && !this.activeEdit.InDocument()) {
      this.activeEdit = null;
    }

    return this.activeEdit;
  }

  /**
   * Checks if a definition with the specified ID exists in the SVG defs section
   *
   * @param defID - The ID of the definition to check
   * @returns Boolean indicating whether the definition exists
   */
  DefExists(defID: string) {
    const defsChildren = this.svgObj.defs().children();
    let exists = false;

    for (let i = 0; i < defsChildren.length; i++) {
      if (defsChildren[i].attrs.id === defID) {
        exists = true;
        break;
      }
    }

    return exists;
  }

  /**
   * Retrieves the SVG definitions section
   *
   * @returns The SVG defs element
   */
  Defs() {
    return this.svgObj.defs();
  }

  /**
   * Clears all definitions from the SVG defs section
   */
  ClearDefs() {
    const defs = this.Defs();
    if (defs) {
      defs.clear();
    }
  }

  /**
   * Increments the image load reference counter
   * Used to track pending image loads
   */
  ImageLoadAddRef() {
    this.imageLoadRefCount++;
  }

  /**
   * Decrements the image load reference counter
   * Ensures the counter never goes below zero
   */
  ImageLoadDecRef() {
    this.imageLoadRefCount = Math.max(0, this.imageLoadRefCount - 1);
  }

  /**
   * Gets the current image load reference count
   *
   * @returns The current reference count
   */
  ImageLoadGetRefCount() {
    return this.imageLoadRefCount;
  }

  /**
   * Resets the image load reference counter to zero
   */
  ImageLoadResetRefCount() {
    this.imageLoadRefCount = 0;
  }

  ConverWindowToDocLength(e) {
    "use strict";
    return e / this.docInfo.docToScreenScale
  }
}

export default Document
