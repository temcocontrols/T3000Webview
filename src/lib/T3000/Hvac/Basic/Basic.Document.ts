

import HvacSVG from "../Helper/SVG.t2"
import $ from 'jquery'
import Rect from './Basic.Rect'
import Container from './Basic.Container'
import RRect from './Basic.RRect'
import Oval from './Basic.Oval'
import Line from './Basic.Line'
import PolyLine from './Basic.PolyLine'
import PolyPolyLine from './Basic.PolyPolyLine'
import Polygon from './Basic.Polygon'
import Path from './Basic.Path'
import Group from './Basic.Group'
import Layer from './Basic.Layer'
import Symbol from './Basic.Symbol'
import ShapeCopy from './Basic.ShapeCopy'
import ShapeContainer from './Basic.ShapeContainer'
import Text from './Basic.Text'
import Formatter from "./Basic.Text.Formatter"
import Spell from "./Basic.Text.Spell"
import Image from './Basic.Image'
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import ConstantData from "../Data/ConstantData"

class Document extends Container {

  public parentElem: any;
  public svgObj: any;
  public docInfo: any;
  public fontList: any;
  public activeEdit: any;
  public spellChecker: any;
  public documentLayerID: any;
  public imageLoadRefCount: number;

  constructor(parentElement: string, fontList: any) {
    super();
    console.log('= B.Document constructor', this);

    this.parentElem = parentElement;
    if (this.parentElem.charAt(0) !== '#' && this.parentElem.charAt(0) !== '.') {
      this.parentElem = '#' + this.parentElem;
    }

    this.svgObj = HvacSVG.svg($(this.parentElem)[0]);
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

    this.fontList = fontList;
    this.activeEdit = null;
    this.spellChecker = null;
    this.documentLayerID = null;
    this.imageLoadRefCount = 0;

    console.log('= B.Document constructor', this);
    this.InitElement(this, null);
    this.InitializeContainer();
  }

  CreateShape(shapeType: number) {
    console.log('= B.Document CreateShape input shapeType:', shapeType);
    let basicShape = null;

    switch (shapeType) {
      case ConstantData.CreateShapeType.RECT:
        basicShape = new Rect();
        break;
      case ConstantData.CreateShapeType.RRECT:
        basicShape = new RRect();
        break;
      case ConstantData.CreateShapeType.OVAL:
        basicShape = new Oval();
        break;
      case ConstantData.CreateShapeType.LINE:
        basicShape = new Line();
        break;
      case ConstantData.CreateShapeType.POLYLINE:
        basicShape = new PolyLine();
        break;
      case ConstantData.CreateShapeType.POLYPOLYLINE:
        basicShape = new PolyPolyLine();
        break;
      case ConstantData.CreateShapeType.POLYLINECONTAINER:
        basicShape = new PolyLine();
        break;
      case ConstantData.CreateShapeType.POLYGON:
        basicShape = new Polygon();
        break;
      case ConstantData.CreateShapeType.PATH:
        basicShape = new Path();
        break;
      case ConstantData.CreateShapeType.TEXT:
        basicShape = new Text();
        break;
      case ConstantData.CreateShapeType.IMAGE:
        basicShape = new Image();
        break;
      case ConstantData.CreateShapeType.GROUP:
        basicShape = new Group();
        break;
      case ConstantData.CreateShapeType.LAYER:
        basicShape = new Layer();
        break;
      case ConstantData.CreateShapeType.SYMBOL:
        basicShape = new Symbol();
        break;
      case ConstantData.CreateShapeType.SHAPECOPY:
        basicShape = new ShapeCopy();
        break;
      case ConstantData.CreateShapeType.SHAPECONTAINER:
        basicShape = new ShapeContainer();
        break;
      default:
        console.error('= B.Document CreateShape unknown shapeType:', shapeType);
        return null;
    }

    try {
      if (basicShape) {
        basicShape.CreateElement(this, null);
        console.log('= B.Document CreateShape output basicShape:', basicShape);
        return basicShape;
      } else {
        console.error('= B.Document CreateShape failed to create shape for shapeType:', shapeType);
        return null;
      }
    } catch (error) {
      console.error('= B.Document CreateShape error:', error);
      throw error;
    }
  }

  InitializeContainer() {
    console.log('= B.Document InitializeContainer input');
    this.GetDeviceInfo();
    this.docInfo.docDpi = this.docInfo.dispDpiX;
    this.docInfo.docWidth = this.docInfo.dispWidth;
    this.docInfo.docHeight = this.docInfo.dispHeight;
    this.docInfo.docScale = 1;
    this.docInfo.scrollX = 0;
    this.docInfo.scrollY = 0;
    this.CalcWorkArea();
    this.ApplyDocumentTransform();
    console.log('= B.Document InitializeContainer output', this.docInfo);
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
  GetDeviceInfo() {
    console.log('= B.Document GetDeviceInfo input');

    const rect = this.CreateShape(ConstantData.CreateShapeType.RECT);
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

    console.log('= B.Document GetDeviceInfo output', this.docInfo);
  }

  CalcWorkArea() {
    console.log('= B.Document CalcWorkArea input');

    // Get the offset position (left and top) of the parent element relative to the document
    const offset = $(this.parentElem).offset();
    console.log('= B.Document CalcWorkArea offset:', offset);

    // Set the display X and Y coordinates from the parent's offset
    this.docInfo.dispX = offset.left;
    this.docInfo.dispY = offset.top;
    // Capture the inner width and height of the parent element for display area
    this.docInfo.dispWidth = $(this.parentElem).innerWidth();
    this.docInfo.dispHeight = $(this.parentElem).innerHeight();
    // Get the current scroll positions of the parent element
    this.docInfo.scrollX = $(this.parentElem).scrollLeft();
    this.docInfo.scrollY = $(this.parentElem).scrollTop();
    // Calculate the overall scale factor from document dimensions to screen dimensions,
    // factoring in the display DPI and document scaling.
    this.docInfo.docToScreenScale = (this.docInfo.dispDpiX / this.docInfo.docDpi) * this.docInfo.docScale;
    // Calculate the DPI scale factor
    this.docInfo.docDpiScale = this.docInfo.dispDpiX / this.docInfo.docDpi;
    // Adjust document screen coordinates taking into account the scroll positions
    this.docInfo.docScreenX = this.docInfo.dispX - this.docInfo.scrollX;
    this.docInfo.docScreenY = this.docInfo.dispY - this.docInfo.scrollY;
    // Calculate the document's size on the screen using the computed scaling factor
    this.docInfo.docScreenWidth = this.docInfo.docWidth * this.docInfo.docToScreenScale;
    this.docInfo.docScreenHeight = this.docInfo.docHeight * this.docInfo.docToScreenScale;
    // Determine maximum allowed scroll positions based on difference between document screen size and display area
    this.docInfo.maxScrollX = Math.max(0, this.docInfo.docScreenWidth - this.docInfo.dispWidth);
    this.docInfo.maxScrollY = Math.max(0, this.docInfo.docScreenHeight - this.docInfo.dispHeight);
    // Calculate the visible width and height in document coordinates by converting display area size
    this.docInfo.docVisWidth = Math.min(this.docInfo.dispWidth / this.docInfo.docToScreenScale, this.docInfo.docWidth);
    this.docInfo.docVisHeight = Math.min(this.docInfo.dispHeight / this.docInfo.docToScreenScale, this.docInfo.docHeight);
    // Determine the document's visible starting X coordinate ensuring it does not exceed document bounds
    this.docInfo.docVisX = Math.min(this.docInfo.scrollX / this.docInfo.docToScreenScale, this.docInfo.docWidth - this.docInfo.docVisWidth);
    // Determine the document's visible starting Y coordinate ensuring it does not exceed document bounds
    this.docInfo.docVisY = Math.min(this.docInfo.scrollY / this.docInfo.docToScreenScale, this.docInfo.docHeight - this.docInfo.docVisHeight);

    console.log('= B.Document CalcWorkArea output', this.docInfo);
  }

  ApplyDocumentTransform(applyToAllLayers?: boolean) {
    console.log('= B.Document ApplyDocumentTransform input applyToAllLayers:', applyToAllLayers);

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

    console.log('= B.Document ApplyDocumentTransform output');
  }

  CalcScaleToFit(containerWidth: number, containerHeight: number, docWidth?: number, docHeight?: number) {
    console.log('= B.Document CalcScaleToFit input', { containerWidth, containerHeight, docWidth, docHeight });

    if (!docWidth) {
      docWidth = this.docInfo.docWidth;
    }
    if (!docHeight) {
      docHeight = this.docInfo.docHeight;
    }

    const dpiScale = this.docInfo.dispDpiX / this.docInfo.docDpi;
    let scaleWidth = containerWidth / (docWidth * dpiScale);
    let scaleHeight = containerHeight / (docHeight * dpiScale);
    let scale = Math.min(scaleWidth, scaleHeight);

    if (scale > 1) {
      scale = 1;
    }

    const result = {
      scale: scale,
      width: this.docInfo.docWidth * dpiScale * scale,
      height: this.docInfo.docHeight * dpiScale * scale
    };

    console.log('= B.Document CalcScaleToFit output', result);
    return result;
  }

  SetDocumentSize(width: number, height: number) {
    console.log('= B.Document SetDocumentSize input', { width, height });

    this.SetDocumentMetrics({
      width: width,
      height: height
    });

    console.log('= B.Document SetDocumentSize output', this.docInfo);
  }

  GetDocumentSize() {
    console.log('= B.Document GetDocumentSize input');

    const result = {
      width: this.docInfo.docWidth,
      height: this.docInfo.docHeight
    };

    console.log('= B.Document GetDocumentSize output', result);
    return result;
  }

  SetDocumentDPI(dpi: number) {
    console.log('= B.Document SetDocumentDPI input', { dpi });

    this.SetDocumentMetrics({
      dpi: dpi
    });

    console.log('= B.Document SetDocumentDPI output', this.docInfo);
  }

  SetDocumentScale(scale: number) {
    console.log('= B.Document SetDocumentScale input', { scale });

    this.SetDocumentMetrics({
      scale: scale
    });

    console.log('= B.Document SetDocumentScale output', this.docInfo);
  }

  SetDocumentMetrics(metrics: { width?: number, height?: number, dpi?: number, scale?: number }) {
    console.log('= B.Document SetDocumentMetrics input', metrics);

    this.docInfo.docWidth = metrics.width || this.docInfo.docWidth;
    this.docInfo.docHeight = metrics.height || this.docInfo.docHeight;
    this.docInfo.docDpi = metrics.dpi || this.docInfo.docDpi;
    this.docInfo.docScale = metrics.scale || this.docInfo.docScale;

    this.CalcWorkArea();
    this.ApplyDocumentTransform();

    console.log('= B.Document SetDocumentMetrics output', this.docInfo);
  }

  CalcScrollToVisible(x: number, y: number) {
    console.log('= B.Document CalcScrollToVisible input', { x, y });

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
      const result = {
        xOff: this.docInfo.scrollX + xOffset * this.docInfo.docToScreenScale,
        yOff: this.docInfo.scrollY + yOffset * this.docInfo.docToScreenScale
      };
      console.log('= B.Document CalcScrollToVisible output', result);
      return result;
    }

    console.log('= B.Document CalcScrollToVisible output', null);
    return null;
  }

  GetWorkArea() {
    console.log('= B.Document GetWorkArea input');
    const result = this.docInfo;
    console.log('= B.Document GetWorkArea output', result);
    return result;
  }

  ConvertDocToWindowCoords(docX: number, docY: number) {
    console.log('= B.Document ConvertDocToWindowCoords input', { docX, docY });

    const windowCoords = {
      x: docX * this.docInfo.docToScreenScale + this.docInfo.docScreenX,
      y: docY * this.docInfo.docToScreenScale + this.docInfo.docScreenY
    };

    console.log('= B.Document ConvertDocToWindowCoords output', windowCoords);
    return windowCoords;
  }

  ConvertDocToWindowLength(length: number) {
    console.log('= B.Document ConvertDocToWindowLength input', { length });
    const result = length * this.docInfo.docToScreenScale;
    console.log('= B.Document ConvertDocToWindowLength output', { result });
    return result;
  }

  ConvertOffsetToDocCoords(offsetX: number, offsetY: number) {
    console.log('= B.Document ConvertOffsetToDocCoords input', { offsetX, offsetY });

    const docCoords = {
      x: offsetX / this.docInfo.docToScreenScale,
      y: offsetY / this.docInfo.docToScreenScale
    };

    console.log('= B.Document ConvertOffsetToDocCoords output', docCoords);
    return docCoords;
  }

  ConvertWindowToDocCoords(windowX: number, windowY: number) {
    // console.log('= B.Document ConvertWindowToDocCoords input', { windowX, windowY });

    const docCoords = {
      x: (windowX - this.docInfo.docScreenX) / this.docInfo.docToScreenScale,
      y: (windowY - this.docInfo.docScreenY) / this.docInfo.docToScreenScale
    };

    // console.log('= B.Document ConvertWindowToDocCoords output', docCoords);
    return docCoords;
  }

  ConvertWindowToDocLength(length: number) {
    console.log('= B.Document ConvertWindowToDocLength input', { length });
    const result = length / this.docInfo.docToScreenScale;
    console.log('= B.Document ConvertWindowToDocLength output', { result });
    return result;
  }

  ConvertWindowToElemCoords(windowX: number, windowY: number, element: any) {
    console.log('= B.Document ConvertWindowToElemCoords input', { windowX, windowY, element });

    const svgPoint = this.DOMElement().createSVGPoint();
    const svgElement = this.DOMElement();

    svgPoint.x = windowX;
    svgPoint.y = windowY;

    const transformedPoint = svgPoint
      .matrixTransform(svgElement.getScreenCTM().inverse())
      .matrixTransform(element.getTransformToElement(svgElement).inverse());

    const result = {
      x: transformedPoint.x,
      y: transformedPoint.y
    };

    console.log('= B.Document ConvertWindowToElemCoords output', result);
    return result;
  }

  ConvertElemToWindowCoords(elemX: number, elemY: number, element: any) {
    console.log('= B.Document ConvertElemToWindowCoords input', { elemX, elemY, element });

    const svgPoint = this.DOMElement().createSVGPoint();
    const svgElement = this.DOMElement();

    svgPoint.x = elemX;
    svgPoint.y = elemY;

    const transformedPoint = svgPoint
      .matrixTransform(element.getTransformToElement(svgElement))
      .matrixTransform(svgElement.getScreenCTM());

    const result = {
      x: transformedPoint.x,
      y: transformedPoint.y
    };

    console.log('= B.Document ConvertElemToWindowCoords output', result);
    return result;
  }

  RotateAroundCenterPt(point, center, angle) {
    console.log('= B.Document RotateAroundCenterPt input', { point, center, angle });

    const svgPoint = this.DOMElement().createSVGPoint();
    const svgMatrix = this.DOMElement().createSVGMatrix();

    svgPoint.x = point.x - center.x;
    svgPoint.y = point.y - center.y;

    const rotatedPoint = svgPoint.matrixTransform(svgMatrix.rotate(angle));

    const result = {
      x: rotatedPoint.x + center.x,
      y: rotatedPoint.y + center.y
    };

    console.log('= B.Document RotateAroundCenterPt output', result);
    return result;
  }

  CalculateRotatedOffsetForResize(element, target, angle) {
    console.log('= B.Document CalculateRotatedOffsetForResize input', { element, target, angle });

    const elementCenter = {
      x: element.x + element.width / 2,
      y: element.y + element.height / 2
    };

    const targetCenter = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2
    };

    const rotatedPoint = this.RotateAroundCenterPt(targetCenter, elementCenter, angle);

    const result = {
      x: rotatedPoint.x - targetCenter.x,
      y: rotatedPoint.y - targetCenter.y
    };

    console.log('= B.Document CalculateRotatedOffsetForResize output', result);
    return result;
  }


  AddLayer(layerID: string) {
    console.log('= B.Document AddLayer input', { layerID });

    const layer = this.CreateShape(ConstantData.CreateShapeType.LAYER);
    layer.SetID(layerID);
    this.AddElement(layer);
    this.ApplyDocumentTransform();
    $(layer.svgObj.node).data('layerID', layerID);

    console.log('= B.Document AddLayer output', layer);
    return layer;
  }

  RemoveLayer(layerID: string) {
    console.log('= B.Document RemoveLayer input', { layerID });

    const layer = this.GetElementByID(layerID);
    if (layer) {
      this.RemoveElement(layer);
      console.log('= B.Document RemoveLayer removed layer', { layerID });
    } else {
      console.warn('= B.Document RemoveLayer layer not found', { layerID });
    }

    console.log('= B.Document RemoveLayer output');
  }

  GetLayer(layerID: string) {
    console.log('= B.Document GetLayer input', { layerID });

    let element;
    let layer = null;
    const elementCount = this.ElementCount();

    for (let i = 0; i < elementCount; i++) {
      element = this.GetElementByIndex(i);
      if (element instanceof Layer && element.GetID() === layerID) {
        layer = element;
        break;
      }
    }

    console.log('= B.Document GetLayer output', { layer });
    return layer;
  }

  GetDocumentLayer() {
    console.log('= B.Document GetDocumentLayer input');

    let element;
    let documentLayer = null;
    const elementCount = this.ElementCount();

    for (let i = 0; i < elementCount; i++) {
      element = this.GetElementByIndex(i);
      if (element instanceof Layer) {
        if (this.documentLayerID) {
          if (this.documentLayerID === element.GetID()) {
            documentLayer = element;
            break;
          }
        } else if (element.IsScalingAllowed()) {
          documentLayer = element;
          break;
        }
      }
    }

    console.log('= B.Document GetDocumentLayer output', documentLayer);
    return documentLayer;
  }

  SetDocumentLayer(layerID: string) {
    console.log('= B.Document SetDocumentLayer input', { layerID });
    this.documentLayerID = layerID;
    console.log('= B.Document SetDocumentLayer output', { documentLayerID: this.documentLayerID });
  }

  GetFormattingLayer() {
    console.log('= B.Document GetFormattingLayer input');

    let formattingLayer = this.GetLayer('__FORMATTING__');
    if (formattingLayer && !formattingLayer.IsDpiScalingAllowed()) {
      formattingLayer = null;
    }

    if (!formattingLayer) {
      formattingLayer = this.AddLayer('__FORMATTING__');
      formattingLayer.AllowDpiScalingOnly(true);
      formattingLayer.ExcludeFromExport(true);
      this.MoveLayer('__FORMATTING__', ConstantData.LayerMoveType.BOTTOM);
      formattingLayer.SetOpacity(0);
      this.ApplyDocumentTransform();
    }

    console.log('= B.Document GetFormattingLayer output', formattingLayer);
    return formattingLayer;
  }

  GetPreviousLayer(layerID: string) {
    console.log('= B.Document GetPreviousLayer input', { layerID });

    let previousLayer = null;
    const elementCount = this.ElementCount();

    for (let i = 0; i < elementCount; i++) {
      const element = this.GetElementByIndex(i);
      if (element instanceof Layer) {
        if (element.GetID() === layerID) {
          break;
        }
        previousLayer = element;
      }
    }

    console.log('= B.Document GetPreviousLayer output', { previousLayer });
    return previousLayer;
  }

  GetNextLayer(layerID: string) {
    console.log('= B.Document GetNextLayer input', { layerID });

    let nextLayer = null;
    let currentLayer = null;
    let startIndex = 0;
    const elementCount = this.ElementCount();

    if (layerID) {
      currentLayer = this.GetLayer(layerID);
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

    console.log('= B.Document GetNextLayer output', { nextLayer });
    return nextLayer;
  }

  MoveLayer(layerID: string, moveType: number, targetLayerID?: string) {
    console.log('= B.Document MoveLayer input', { layerID, moveType, targetLayerID });

    const layer = this.GetLayer(layerID);
    if (!layer) {
      console.warn('= B.Document MoveLayer layer not found', { layerID });
      return;
    }

    const totalElements = this.ElementCount();
    let targetIndex = totalElements - 1;
    let currentIndex = this.GetElementIndex(layer);
    let targetLayer = null;
    let targetLayerIndex = 0;

    if (targetLayerID) {
      targetLayer = this.GetLayer(targetLayerID);
      if (targetLayer) {
        targetLayerIndex = this.GetElementIndex(targetLayer);
        if (currentIndex < targetLayerIndex) {
          targetLayerIndex--;
        }
      }
    }

    switch (moveType) {
      case ConstantData.LayerMoveType.BOTTOM:
        targetIndex = 0;
        break;
      case ConstantData.LayerMoveType.BEFORE:
        targetIndex = targetLayerIndex;
        break;
      case ConstantData.LayerMoveType.AFTER:
        targetIndex = targetLayerIndex + 1;
        break;
      case ConstantData.LayerMoveType.TOP:
        targetIndex = totalElements - 1;
        break;
      default:
        console.error('= B.Document MoveLayer unknown moveType', { moveType });
        return;
    }

    if (targetIndex !== currentIndex) {
      this.RemoveElement(layer);
      this.AddElement(layer, targetIndex);
    }

    console.log('= B.Document MoveLayer output', { layerID, moveType, targetLayerID, targetIndex });
  }

  AddDocumentFontToList(fontList, fontName, fontType) {
    console.log('= B.Document AddDocumentFontToList input', { fontList, fontName, fontType });

    let index = -1;
    const length = fontList.length;

    for (let i = 0; i < length; i++) {
      if (fontList[i].name === fontName) {
        index = i;
        break;
      }
    }

    if (index < 0) {
      fontList.push({
        name: fontName,
        type: fontType
      });
      index = length;
    }

    console.log('= B.Document AddDocumentFontToList output', { index });
    return index;
  }

  MapFont(fontName: string, category: string = 'sanserif') {
    console.log('= B.Document MapFont input', { fontName, category });

    let fallbackFont = '';
    let defaultFont = '';
    const fontListLength = this.fontList.length;
    let mappedFont = `'${fontName}'`;

    for (let i = 0; i < fontListLength; i++) {
      const font = this.fontList[i];
      if (font.name === fontName) {
        fallbackFont = font.fallback;
        break;
      }
      if (!defaultFont && font.default && font.category === category) {
        defaultFont = font.fallback;
      }
    }

    if (fallbackFont) {
      mappedFont += `,${fallbackFont}`;
    }

    console.log('= B.Document MapFont output', { mappedFont });
    return mappedFont;
  }

  GetFontType(fontName: string) {
    console.log('= B.Document GetFontType input', { fontName });

    let fontType = 'sanserif';
    const fontListLength = this.fontList.length;

    for (let i = 0; i < fontListLength; i++) {
      if (this.fontList[i].name === fontName) {
        fontType = this.fontList[i].category;
        break;
      }
    }

    console.log('= B.Document GetFontType output', { fontType });
    return fontType;
  }

  static _TextMetricsCache = {}

  GetTextCacheForStyle(style) {
    console.log('= B.Document GetTextCacheForStyle input', { style });

    const styleID = Formatter.MakeIDFromStyle(style);
    let cache = Document._TextMetricsCache[styleID];

    if (!cache) {
      cache = {
        metrics: Formatter.CalcStyleMetrics(style, this),
        textCache: {}
      };
      Document._TextMetricsCache[styleID] = cache;
    }

    console.log('= B.Document GetTextCacheForStyle output', { cache });
    return cache;
  }

  CalcStyleMetrics(style) {
    console.log('= B.Document CalcStyleMetrics input', { style });

    const textCache = this.GetTextCacheForStyle(style);
    const metrics = Utils1.CopyObj(textCache.metrics);

    console.log('= B.Document CalcStyleMetrics output', { metrics });
    return metrics;
  }

  GetTextRunCache(style, text) {
    return { startOffsets: [], endOffsets: [] }
  }

  SetActiveEdit(newEdit) {
    console.log('= B.Document SetActiveEdit input', { newEdit });

    const currentEdit = this.GetActiveEdit();
    if (currentEdit && currentEdit !== newEdit) {
      currentEdit.Deactivate();
    }
    this.activeEdit = newEdit;

    console.log('= B.Document SetActiveEdit output', { activeEdit: this.activeEdit });
  }

  ClearActiveEdit(event) {
    console.log('= B.Document ClearActiveEdit input', { event });

    const activeEdit = this.GetActiveEdit();
    if (activeEdit) {
      activeEdit.Deactivate(event);
    }
    this.activeEdit = null;

    console.log('= B.Document ClearActiveEdit output', { activeEdit: this.activeEdit });
  }

  GetActiveEdit() {
    console.log('= B.Document GetActiveEdit input');

    if (this.activeEdit && !this.activeEdit.InDocument()) {
      this.activeEdit = null;
    }

    console.log('= B.Document GetActiveEdit output', { activeEdit: this.activeEdit });
    return this.activeEdit;
  }

  InitSpellCheck() {
    console.log('= B.Document InitSpellCheck input');

    // if (!this.spellChecker) {
    //   this.spellChecker = new Spell(this);
    //   this.spellChecker.Initialize();
    // }

    console.log('= B.Document InitSpellCheck output', { spellChecker: this.spellChecker });
  }

  InitSpellCheckUser() {
    console.log('= B.Document InitSpellCheckUser input');

    if (this.spellChecker) {
      this.spellChecker.UserInitialize();
    }

    console.log('= B.Document InitSpellCheckUser output');
  }

  GetSpellCheck() {
    console.log('= B.Document GetSpellCheck input');

    if (!this.spellChecker) {
      this.InitSpellCheck();
    }

    console.log('= B.Document GetSpellCheck output', { spellChecker: this.spellChecker });
    return this.spellChecker;
  }

  DefExists(defID: string) {
    console.log('= B.Document DefExists input', { defID });

    const defsChildren = this.svgObj.defs().children();
    let exists = false;

    for (let i = 0; i < defsChildren.length; i++) {
      if (defsChildren[i].attrs.id === defID) {
        exists = true;
        break;
      }
    }

    console.log('= B.Document DefExists output', { exists });
    return exists;
  }

  Defs() {
    console.log('= B.Document Defs input');
    const defs = this.svgObj.defs();
    console.log('= B.Document Defs output', { defs });
    return defs;
  }

  ClearDefs() {
    console.log('= B.Document ClearDefs input');
    const defs = this.Defs();
    if (defs) {
      defs.clear();
    }
    console.log('= B.Document ClearDefs output');
  }

  ImageLoad_AddRef() {
    console.log('= B.Document ImageLoad_AddRef input');
    this.imageLoadRefCount++;
    console.log('= B.Document ImageLoad_AddRef output', { imageLoadRefCount: this.imageLoadRefCount });
  }

  ImageLoad_DecRef() {
    console.log('= B.Document ImageLoad_DecRef input');
    this.imageLoadRefCount = Math.max(0, this.imageLoadRefCount - 1);
    console.log('= B.Document ImageLoad_DecRef output', { imageLoadRefCount: this.imageLoadRefCount });
  }

  ImageLoad_GetRefCount() {
    console.log('= B.Document ImageLoad_GetRefCount input');
    const refCount = this.imageLoadRefCount;
    console.log('= B.Document ImageLoad_GetRefCount output', { refCount });
    return refCount;
  }

  ImageLoad_ResetRefCount() {
    console.log('= B.Document ImageLoad_ResetRefCount input');
    this.imageLoadRefCount = 0;
    console.log('= B.Document ImageLoad_ResetRefCount output', { imageLoadRefCount: this.imageLoadRefCount });
  }

  static CreateShapeType = {
    RECT: 1,
    RRECT: 2,
    OVAL: 3,
    LINE: 4,
    POLYLINE: 5,
    POLYGON: 6,
    PATH: 7,
    TEXT: 8,
    IMAGE: 9,
    GROUP: 10,
    LAYER: 11,
    SYMBOL: 12,
    POLYLINECONTAINER: 13,
    POLYPOLYLINE: 14,
    SHAPECOPY: 15,
    SHAPECONTAINER: 16
  }
}

export default Document
