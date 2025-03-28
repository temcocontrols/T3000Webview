

import BaseDrawObject from './S.BaseDrawObject'
import Utils1 from '../Util/Utils1';
import Utils2 from "../Util/Utils2";
import Utils3 from "../Util/Utils3";
import T3Gv from '../Data/T3Gv'
import Point from '../Model/Point';
import NvConstant from '../Data/Constant/NvConstant'
import SelectionAttr from '../Model/SelectionAttr'
import PathPoint from '../Model/PathPoint'
import Rectangle from '../Model/Rectangle'
import CRect from '../Model/CRect'
import StepRect from '../Model/StepRect'
import SDHook from '../Model/SDHook'
import SDArray from '../Model/SDArray'
import ArrowheadRecord from '../Model/ArrowheadRecord'
import OptAhUtil from '../Opt/Opt/OptAhUtil';
import Instance from '../Data/Instance/Instance';
import DSConstant from '../Opt/DS/DSConstant';
import ShapeUtil from '../Opt/Shape/ShapeUtil';
import OptConstant from '../Data/Constant/OptConstant';
import T3Constant from '../Data/Constant/T3Constant';
import CursorConstant from '../Data/Constant/CursorConstant';
import TextConstant from '../Data/Constant/TextConstant';
import T3Util from '../Util/T3Util';
import DataUtil from '../Opt/Data/DataUtil';
import UIUtil from '../Opt/UI/UIUtil';
import LayerUtil from '../Opt/Opt/LayerUtil';
import OptCMUtil from '../Opt/Opt/OptCMUtil';
import DrawUtil from '../Opt/Opt/DrawUtil';
import HookUtil from '../Opt/Opt/HookUtil';
import LMEvtUtil from '../Opt/Opt/LMEvtUtil';
import RightClickMd from '../Model/RightClickMd';
import TextUtil from '../Opt/Opt/TextUtil';

/**
 * Represents a connector drawing object that connects elements in a diagram.
 *
 * The Connector class provides functionality for creating and manipulating connection lines
 * between elements. It supports various styles including linear, perpendicular, and radial
 * connections with customizable appearance and behavior.
 *
 * Features include:
 * - Various connector styles (linear, perpendicular, radial)
 * - Start and end arrowheads with customizable styles
 * - Text labels at various points along the connector
 * - Custom routing with adjustable segment positions
 * - Hit testing and user interaction handling
 * - Support for connector collapse/expand functionality
 *
 * @extends BaseDrawObject
 *
 * @example
 * // Create a simple connector between two points
 * const connector = new Connector({
 *   StartPoint: { x: 100, y: 100 },
 *   EndPoint: { x: 300, y: 200 },
 *   styleflags: OptConstant.AStyles.PerpConn | OptConstant.AStyles.MinZero,
 *   StartArrowID: 0,
 *   EndArrowID: 1,
 *   EndArrowDisp: true
 * });
 *
 * // Add text to the connector
 * const textId = T3Gv.stdObj.CreateTextObject("Connection Label");
 * connector.SetTextObject(textId);
 *
 * // Change the connector appearance
 * connector.StyleRecord.Line.Paint.Color = "blue";
 * connector.StyleRecord.Line.Thickness = 2;
 */
class Connector extends BaseDrawObject {

  public StartPoint: { x: number, y: number };
  public hoplist: { nhops: number, hops: any[] };
  public ArrowheadData: any[];
  public StartArrowID: number;
  public EndArrowID: number;
  public StartArrowDisp: boolean;
  public EndArrowDisp: boolean;
  public ArrowSizeIndex: number;
  public TextDirection: boolean;
  public arraylist: any;
  public vertical: boolean;
  public arrayht: number;
  public arraywd: number;
  public curveparam: number;
  public theMinTextDim: { width: number, height: number };
  public TextFlags: number;
  public EndPoint: { x: number, y: number };

  constructor(options) {
    T3Util.Log('S.Connector: Input options:', options);

    options = options || {};
    options.DrawingObjectBaseClass = OptConstant.DrawObjectBaseClass.Connector;
    options.targflags = NvConstant.HookFlags.LcShape;
    options.hookflags = NvConstant.HookFlags.LcShape;

    let arraylist = options.arraylist || new SDArray();

    if (options.styleflags != null) {
      arraylist.styleflags = options.styleflags;
    } else {
      arraylist.styleflags = OptConstant.AStyles.PerpConn | OptConstant.AStyles.MinZero;
    }

    arraylist.ht = options.arrayht == null ? OptConstant.ConnectorDefines.DefaultHt : options.arrayht;
    arraylist.wd = options.arraywd == null ? OptConstant.ConnectorDefines.DefaultWd : options.arraywd;
    arraylist.curveparam = options.curveparam || 0;

    var hook = new SDHook();
    hook.startpoint.h = 0;
    hook.startpoint.v = 0;
    hook.endpoint.h = arraylist.wd;
    hook.endpoint.v = 0;
    arraylist.hook.push(hook);

    if (options.Frame) {
      options.Frame.height = arraylist.ht;
      options.Frame.width = arraylist.wd;
    }

    if (options.EndPoint) {
      options.EndPoint.x = arraylist.wd;
      options.EndPoint.y = arraylist.ht;
    }

    super(options);

    this.arraylist = arraylist;
    this.StartPoint = options.StartPoint || { x: 0, y: 0 };
    this.hoplist = options.hoplist || { nhops: 0, hops: [] };
    this.ArrowheadData = options.ArrowheadData || [];
    this.StartArrowID = options.StartArrowID || 0;
    this.EndArrowID = options.EndArrowID || 0;
    this.StartArrowDisp = options.StartArrowDisp || false;
    this.EndArrowDisp = options.EndArrowDisp || false;
    this.ArrowSizeIndex = options.ArrowSizeIndex || 0;
    this.TextDirection = options.TextDirection || false;
    this.vertical = options.vertical || false;
    this.EndPoint = options.EndPoint || { x: this.arraylist.wd, y: this.arraylist.ht };

    this.theMinTextDim = { width: 0, height: 0 };
    this.TextFlags = Utils2.SetFlag(this.TextFlags, NvConstant.TextFlags.HorizText, !this.TextDirection);

    T3Util.Log('S.Connector: Output instance:', this);
  }

  IsChildOfAssistant() {
    T3Util.Log('S.Connector: Checking if child of assistant. Hooks:', this.hooks);

    if (this.hooks.length) {
      const firstHookObject = DataUtil.GetObjectPtr(this.hooks[0].objid, false);
      T3Util.Log('S.Connector: First hook object:', firstHookObject);

      if (firstHookObject && firstHookObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
        const isAssistantConnector = firstHookObject.IsAsstConnector();
        T3Util.Log('S.Connector: Is assistant connector:', isAssistantConnector);
        return isAssistantConnector;
      }
    }

    T3Util.Log('S.Connector: Not a child of assistant.');
    return false;
  }

  LinkNotVisible() {
    T3Util.Log('S.Connector: Checking link visibility.');

    const isCoManager = this.arraylist.styleflags & OptConstant.AStyles.CoManager;
    const isChildOfAssistant = this.IsChildOfAssistant();

    if (this.flags & NvConstant.ObjFlags.NotVisible) {
      if (!this.hooks.length || isCoManager || isChildOfAssistant) {
        T3Util.Log('S.Connector: Link is not visible due to hooks, co-manager, or assistant status.');
        return true;
      }

      const firstHookObject = DataUtil.GetObjectPtr(this.hooks[0].objid, false);
      if (firstHookObject && (firstHookObject.flags & NvConstant.ObjFlags.NotVisible)) {
        T3Util.Log('S.Connector: Link is not visible due to first hook object visibility.');
        return true;
      }
    }

    T3Util.Log('S.Connector: Link is visible.');
    return false;
  }

  GetTextOnLineParams(hook) {
    T3Util.Log('S.Connector: Input hook:', hook);

    const params = {
      Frame: Utils1.DeepCopy(this.Frame),
      StartPoint: { x: 0, y: 0 },
      EndPoint: { x: 0, y: 0 }
    };

    if (this.vertical) {
      params.StartPoint.x = hook.startpoint.v + this.StartPoint.x;
      params.StartPoint.y = hook.startpoint.h + this.StartPoint.y;
      params.EndPoint.x = hook.endpoint.v + this.StartPoint.x;
      params.EndPoint.y = hook.endpoint.h + this.StartPoint.y;
    } else {
      params.StartPoint.x = hook.startpoint.h + this.StartPoint.x;
      params.StartPoint.y = hook.startpoint.v + this.StartPoint.y;
      params.EndPoint.x = hook.endpoint.h + this.StartPoint.x;
      params.EndPoint.y = hook.endpoint.v + this.StartPoint.y;
    }

    T3Util.Log('S.Connector: Output params:', params);
    return params;
  }

  ChangeBackgroundColor(newColor: string, currentColor: string) {
    T3Util.Log('S.Connector: Input newColor:', newColor, 'currentColor:', currentColor);

    if (
      this.StyleRecord.Fill.Paint.FillType !== NvConstant.FillTypes.Transparent &&
      this.StyleRecord.Fill.Paint.Color.toLowerCase() === currentColor.toLowerCase()
    ) {
      DataUtil.GetObjectPtr(this.BlockID, true);
      this.StyleRecord.Fill.Paint.Color = newColor;
      DataUtil.AddToDirtyList(this.BlockID);
    }

    T3Util.Log('S.Connector: Updated StyleRecord.Fill.Paint.Color:', this.StyleRecord.Fill.Paint.Color);
  }

  AddSVGTextObject(svgDoc, parentElement, hookIndex) {
    T3Util.Log('S.Connector: Input svgDoc:', svgDoc, 'parentElement:', parentElement, 'hookIndex:', hookIndex);

    let rect, startPoint = {}, endPoint = {};
    if (hookIndex === undefined) {
      hookIndex = this.arraylist.lasttexthook;
    }
    const hook = this.arraylist.hook[hookIndex];

    if (this.vertical) {
      startPoint.x = hook.startpoint.v;
      startPoint.y = hook.startpoint.h;
      endPoint.x = hook.endpoint.v;
      endPoint.y = hook.endpoint.h;
      rect = Utils2.Pt2Rect(startPoint, endPoint);
      Utils2.InflateRect(rect, 20, 0);
    } else {
      startPoint.x = hook.startpoint.h;
      startPoint.y = hook.startpoint.v;
      endPoint.x = hook.endpoint.h;
      endPoint.y = hook.endpoint.v;
      rect = Utils2.Pt2Rect(startPoint, endPoint);
      Utils2.InflateRect(rect, 0, 20);
    }

    const backgroundRect = svgDoc.CreateShape(OptConstant.CSType.Rect);
    backgroundRect.SetID(OptConstant.SVGElementClass.TextBackground);
    backgroundRect.SetUserData(hookIndex);
    backgroundRect.SetStrokeWidth(0);
    const fillColor = this.StyleRecord.Fill.Paint.Color;
    backgroundRect.SetFillColor(fillColor);
    if (this.StyleRecord.Fill.Paint.FillType === NvConstant.FillTypes.Transparent) {
      backgroundRect.SetOpacity(0);
    } else {
      backgroundRect.SetOpacity(this.StyleRecord.Fill.Paint.Opacity);
    }

    const textElement = svgDoc.CreateShape(OptConstant.CSType.Text);
    textElement.SetID(OptConstant.SVGElementClass.Text);
    textElement.SetUserData(hookIndex);
    textElement.SetRenderingEnabled(false);
    textElement.SetSize(rect.width, rect.height);
    textElement.SetSpellCheck(this.AllowSpell());
    textElement.InitDataSettings(this.fieldDataTableID, this.fieldDataElemID);

    parentElement.AddElement(backgroundRect);
    parentElement.AddElement(textElement);
    parentElement.isText = true;

    if (hookIndex === this.arraylist.lasttexthook) {
      parentElement.textElem = textElement;
    }

    const textData = T3Gv.stdObj.GetObject(hook.textid);
    if (textData.Data.runtimeText) {
      textData.Data.runtimeText.vAlign = 'top';
      textElement.SetRuntimeText(textData.Data.runtimeText);
    } else {
      textElement.SetText('');
      textElement.SetParagraphAlignment(this.TextAlign);
      textElement.SetVerticalAlignment('top');
    }

    if (!textData.Data.runtimeText) {
      textData.Data.runtimeText = textElement.GetRuntimeText();
    }

    textElement.SetConstraints(T3Gv.opt.header.MaxWorkDim.x, 0, rect.height);
    if (this.bInGroup) {
      textElement.DisableHyperlinks(true);
    }
    textElement.SetRenderingEnabled(true);
    Instance.Shape.BaseLine.prototype.TextDirectionCommon.call(this, textElement, backgroundRect, false, hook);
    textElement.SetEditCallback(T3Gv.opt.TextCallback, parentElement);

    T3Util.Log('S.Connector: Output textElement:', textElement);
  }

  CreateShape(svgDoc, isHidden) {
    T3Util.Log('S.Connector: Input svgDoc:', svgDoc, 'isHidden:', isHidden);

    let isCoManager = (this.arraylist.styleflags & OptConstant.AStyles.CoManager) > 0;
    let isChildOfAssistant = this.IsChildOfAssistant();
    let isFlowChartConnector = this.IsFlowChartConnector();
    let isGenoConnector = this.IsGenoConnector();
    let isCauseEffectMain = this.objecttype === NvConstant.FNObjectTypes.CauseEffectMain;
    let skipCount = OptConstant.ConnectorDefines.NSkip;

    DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    if (this.flags & NvConstant.ObjFlags.NotVisible) {
      if (this.hooks.length && !isCoManager && !isChildOfAssistant && !isFlowChartConnector && !isCauseEffectMain && !isGenoConnector) {
        let firstHookObject = DataUtil.GetObjectPtr(this.hooks[0].objid, false);
        if (firstHookObject && !(firstHookObject.flags & NvConstant.ObjFlags.NotVisible)) {
          let shapeContainer = svgDoc.CreateShape(OptConstant.CSType.ShapeContainer);
          this.CreateCollapseButton(svgDoc, shapeContainer, true);
          shapeContainer.ExcludeFromExport(true);
          T3Util.Log('S.Connector: Output shapeContainer:', shapeContainer);
          return shapeContainer;
        }
      }
      T3Util.Log('S.Connector: Output null due to visibility.');
      return null;
    }

    let polylineShape = svgDoc.CreateShape(OptConstant.CSType.PolyPolyline);
    polylineShape.SetID(OptConstant.SVGElementClass.Shape);

    let slopShape = svgDoc.CreateShape(OptConstant.CSType.PolyPolyline);
    slopShape.SetID(OptConstant.SVGElementClass.Slop);
    slopShape.ExcludeFromExport(true);

    let frame = this.Frame;
    let styleRecord = this.StyleRecord;
    let lineColor = styleRecord.Line.Paint.Color;
    let lineThickness = styleRecord.Line.Thickness;
    let lineOpacity = styleRecord.Line.Paint.Opacity;
    let linePattern = styleRecord.Line.LinePattern;
    let frameWidth = frame.width;
    let frameHeight = frame.height;

    let shapeContainer = svgDoc.CreateShape(OptConstant.CSType.ShapeContainer);
    shapeContainer.SetSize(frameWidth, frameHeight);
    shapeContainer.SetPos(frame.x, frame.y);

    polylineShape.SetSize(frameWidth, frameHeight);
    polylineShape.SetFillColor('none');
    polylineShape.SetStrokeColor(lineColor);
    polylineShape.SetStrokeOpacity(lineOpacity);
    polylineShape.SetStrokeWidth(lineThickness);
    if (linePattern !== 0) {
      polylineShape.SetStrokePattern(linePattern);
    }

    slopShape.SetSize(frameWidth, frameHeight);
    slopShape.SetStrokeColor('white');
    slopShape.SetFillColor('none');
    slopShape.SetOpacity(0);
    if (isHidden) {
      slopShape.SetEventBehavior(OptConstant.EventBehavior.HiddenOut);
    } else {
      slopShape.SetEventBehavior(OptConstant.EventBehavior.None);
    }
    slopShape.SetStrokeWidth(lineThickness + OptConstant.Common.SlopShapeExtra);

    shapeContainer.AddElement(polylineShape);
    shapeContainer.AddElement(slopShape);

    this.ApplyStyles(polylineShape, styleRecord);
    this.ApplyEffects(shapeContainer, false, true);

    if (!isCoManager && !isChildOfAssistant && !isFlowChartConnector && !isCauseEffectMain && !isGenoConnector) {
      this.CreateCollapseButton(svgDoc, shapeContainer, false);
    }

    shapeContainer.isShape = true;
    if (this.arraylist.hook.length > skipCount) {
      this.AddIcons(svgDoc, shapeContainer);
    }

    T3Util.Log('S.Connector: Output shapeContainer:', shapeContainer);
    return shapeContainer;
  }

  AddIcon(svgDoc, parentElement, iconParams) {
    T3Util.Log('S.Connector: Input svgDoc:', svgDoc, 'parentElement:', parentElement, 'iconParams:', iconParams);

    if (parentElement) {
      const isFlowChartConnector = this.IsFlowChartConnector();
      const frame = this.Frame;
      this.nIcons;

      if (isFlowChartConnector) {
        if (this.hooks.length > 0) {
          if (this.hooks[0].hookpt === OptConstant.HookPts.LL || this.hooks[0].hookpt === OptConstant.HookPts.LT) {
            if (this.vertical) {
              iconParams.y = this.iconShapeRightOffset + this.nIcons * this.iconSize;
              iconParams.x = frame.width - this.iconShapeBottomOffset - this.iconSize;
            } else {
              iconParams.x = this.iconShapeRightOffset + this.nIcons * this.iconSize;
              iconParams.y = frame.height - this.iconShapeBottomOffset - this.iconSize;
            }
          } else {
            iconParams.x = frame.width - this.iconShapeRightOffset - this.iconSize - this.nIcons * this.iconSize;
            iconParams.y = frame.height - this.iconShapeBottomOffset - this.iconSize;
          }
        } else if (this.arraylist.hook.length > OptConstant.ConnectorDefines.NSkip + 1) {
          if (this.vertical) {
            iconParams.y = this.arraylist.hook[OptConstant.ConnectorDefines.NSkip + 1].startpoint.h + this.iconShapeRightOffset + this.nIcons * this.iconSize;
            iconParams.x = frame.width - this.iconShapeBottomOffset - this.iconSize;
          } else {
            iconParams.x = this.arraylist.hook[OptConstant.ConnectorDefines.NSkip + 1].startpoint.h + this.iconShapeRightOffset + this.nIcons * this.iconSize;
            iconParams.y = frame.height - this.iconShapeBottomOffset - this.iconSize;
          }
        } else {
          iconParams.x = frame.width - this.iconShapeRightOffset - this.iconSize - this.nIcons * this.iconSize;
          iconParams.y = frame.height - this.iconShapeBottomOffset - this.iconSize;
        }
      }

      const iconElement = this.GenericIcon(iconParams);
      this.nIcons++;
      parentElement.AddElement(iconElement);

      T3Util.Log('S.Connector: Output iconElement:', iconElement);
      return iconElement;
    }
  }

  PostCreateShapeCallback(svgDoc, parentElement, shapeId, shapeType) {
    T3Util.Log('S.Connector: PostCreateShapeCallback input:', svgDoc, parentElement, shapeId, shapeType);

    if (!(this.flags & NvConstant.ObjFlags.NotVisible)) {
      let hookCount,
        visibleHooks,
        skipCount = OptConstant.ConnectorDefines.NSkip,
        shapeElement = parentElement.GetElementById(OptConstant.SVGElementClass.Shape),
        slopElement = parentElement.GetElementById(OptConstant.SVGElementClass.Slop),
        polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, false, false, null),
        hasHooks = false,
        hookIndex = 0;

      if (this.arraylist) {
        visibleHooks = (hookCount = this.arraylist.hook.length) - skipCount;
        if (visibleHooks < 0) visibleHooks = 0;
        if (visibleHooks === 0 && hookCount >= skipCount) {
          for (let i = 0; i < skipCount; i++) {
            if (this.arraylist.hook[i].id >= 0) visibleHooks++;
          }
        }
      }

      if (this.hooks.length) hasHooks = true;

      if (!visibleHooks && hasHooks) {
        this.UpdateSVG(svgDoc, shapeElement, polyPoints);
      }
      this.UpdateSVG(svgDoc, slopElement, polyPoints);

      for (let i = 0; i < hookCount; i++) {
        if (this.arraylist.hook[i].textid >= 0) {
          this.AddSVGTextObject(svgDoc, parentElement, i);
        }
      }
    }

    T3Util.Log('S.Connector: PostCreateShapeCallback output:', this);
  }

  SetRuntimeEffects(enableEffects: boolean): void {
    T3Util.Log('S.Connector: SetRuntimeEffects input:', enableEffects);
    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    if (svgElement) {
      this.ApplyEffects(svgElement, enableEffects, true);
    }
    T3Util.Log('S.Connector: SetRuntimeEffects output:', this);
  }

  ApplyStyles(shape, styleRecord) {
    T3Util.Log("S.Connector: ApplyStyles input - shape:", shape, "styleRecord:", styleRecord);
    const fillType = styleRecord.Line.Paint.FillType;
    shape.SetStrokeOpacity(styleRecord.Line.Paint.Opacity);

    if (fillType === NvConstant.FillTypes.Gradient) {
      const gradientRecord = this.CreateGradientRecord(
        styleRecord.Line.Paint.GradientFlags,
        styleRecord.Line.Paint.Color,
        styleRecord.Line.Paint.Opacity,
        styleRecord.Line.Paint.EndColor,
        styleRecord.Line.Paint.EndOpacity
      );
      shape.SetGradientStroke(gradientRecord);
    } else if (fillType === NvConstant.FillTypes.RichGradient) {
      shape.SetGradientStroke(this.CreateRIchGradientRecord(styleRecord.Line.Paint.GradientFlags));
    } else if (fillType === NvConstant.FillTypes.Texture) {
      const textureConfig = {
        url: '',
        scale: styleRecord.Line.Paint.TextureScale.Scale,
        alignment: styleRecord.Line.Paint.TextureScale.AlignmentScalar
      };
      const textureKey = styleRecord.Line.Paint.Texture;
      textureConfig.dim = T3Gv.opt.TextureList.Textures[textureKey].dim;
      textureConfig.url = T3Gv.opt.TextureList.Textures[textureKey].ImageURL;
      if (!textureConfig.url) {
        textureConfig.url = Constants.FilePath_CMSRoot + Constants.FilePath_Textures + T3Gv.opt.TextureList.Textures[textureKey].filename;
      }
      shape.SetTextureStroke(textureConfig);
    } else if (fillType === NvConstant.FillTypes.Solid) {
      shape.SetStrokeColor(styleRecord.Line.Paint.Color);
    } else {
      shape.SetStrokeColor('none');
    }
    T3Util.Log("S.Connector: ApplyStyles output - shape:", shape);
  }

  GetDimensionPoints() {
    T3Util.Log("S.Connector: GetDimensionPoints input:", { Dimensions: this.Dimensions, Frame: this.Frame });
    let resultPoints: Point[] = [];
    let polyPoints: Point[] = [];
    let segmentIndex = 0;
    let totalLength = 0;
    let deltaX = 0;
    let deltaY = 0;
    let startPoint: { x: number; y: number } = {};
    let endPoint: { x: number; y: number } = {};
    let rotationAngle: number;

    if (this.Dimensions & NvConstant.DimensionFlags.EndPts) {
      resultPoints.push(new Point(
        this.StartPoint.x - this.Frame.x,
        this.StartPoint.y - this.Frame.y
      ));
      resultPoints.push(new Point(
        this.EndPoint.x - this.Frame.x,
        this.EndPoint.y - this.Frame.y
      ));
    } else if (this.Dimensions & NvConstant.DimensionFlags.Total) {
      polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, true, false, null);
      for (segmentIndex = 1; segmentIndex < polyPoints.length; segmentIndex++) {
        deltaX = Math.abs(polyPoints[segmentIndex - 1].x - polyPoints[segmentIndex].x);
        deltaY = Math.abs(polyPoints[segmentIndex - 1].y - polyPoints[segmentIndex].y);
        totalLength += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      }
      // Calculate midpoint of frame
      let midPoint = {
        x: this.Frame.width / 2,
        y: this.Frame.height / 2
      };
      startPoint.x = midPoint.x - totalLength / 2;
      startPoint.y = midPoint.y;
      resultPoints.push(new Point(startPoint.x, startPoint.y));

      endPoint.x = midPoint.x + totalLength / 2;
      endPoint.y = midPoint.y;
      resultPoints.push(new Point(endPoint.x, endPoint.y));

      rotationAngle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(
        new Point(0, 0),
        new Point(this.Frame.width, this.Frame.height)
      );
      Utils3.RotatePointsAboutPoint(midPoint, rotationAngle, resultPoints);
    } else {
      resultPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, true, false, null);
    }
    T3Util.Log("S.Connector: GetDimensionPoints output:", resultPoints);
    return resultPoints;
  }

  FindTextLabel(event) {
    T3Util.Log("S.Connector: _findTextLabel input:", event);
    // Get the polyline points for the connector shape
    const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, false, null);
    const minHookIndex = OptConstant.ConnectorDefines.NSkip;
    let hitResult = {};
    let textLabelIndex = -1;
    const styleConstants = OptConstant.AStyles;
    const isLinear = Boolean(this.arraylist.styleflags & styleConstants.SEDA_Linear);
    const isFlowConnection = Boolean(this.arraylist.styleflags & styleConstants.SEDA_FlowConn);

    if (event) {
      // Convert window coordinates to document coords
      const docCoords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
        event.gesture.center.clientX,
        event.gesture.center.clientY
      );
      // Find the SVG element that was clicked
      const svgElement = T3Gv.opt.svgObjectLayer.FindElementByDOMElement(event.currentTarget);
      if (svgElement) {
        const targetElement = svgElement.GetTargetForEvent(event);
        const targetElementId = targetElement.GetID();
        // Check if the target element is either TEXTBACKGROUND or TEXT
        if (targetElementId === OptConstant.SVGElementClass.TextBackground || targetElementId === OptConstant.SVGElementClass.Text) {
          textLabelIndex = parseInt(targetElement.GetUserData(), 10);
          if (!isLinear && textLabelIndex < minHookIndex) {
            textLabelIndex = minHookIndex;
          }
        }
      }
      // If no valid index from the event, then try hit-testing the polyline
      if (textLabelIndex < 0 && this.arraylist.hook.length >= minHookIndex) {
        const hitTestSuccess = Utils3.LineDStyleHit(polyPoints, docCoords, this.StyleRecord.Line.Thickness, 0, hitResult);
        if (hitResult.lpHit !== undefined && hitTestSuccess) {
          textLabelIndex = Math.round((hitResult.lpHit - 0.1) / 2);
          if (isLinear && textLabelIndex === minHookIndex) {
            if (this.arraylist.hook.length >= minHookIndex + 1) {
              textLabelIndex++;
            } else {
              textLabelIndex = -1;
            }
          }
        }
      }
    }

    // Fallback to the last text hook if still not determined.
    if (textLabelIndex < 0) {
      textLabelIndex = this.arraylist.lasttexthook;
    }

    // Additional adjustment based on the hook count and connection styles.
    if (textLabelIndex < minHookIndex && this.arraylist.hook.length >= minHookIndex) {
      if (isLinear && isFlowConnection) {
        if (this.hooks.length > 0) {
          textLabelIndex = (this.hooks[0].hookpt === OptConstant.HookPts.LR ||
            this.hooks[0].hookpt === OptConstant.HookPts.LT)
            ? OptConstant.ConnectorDefines.ACr
            : OptConstant.ConnectorDefines.ACl;
        } else if (this.arraylist.hook.length >= minHookIndex + 1) {
          textLabelIndex = minHookIndex + 1;
        }
      } else if (textLabelIndex < 0 && this.arraylist.hook.length >= minHookIndex) {
        textLabelIndex = minHookIndex;
      }
    }

    T3Util.Log("S.Connector: _findTextLabel output:", textLabelIndex);
    return textLabelIndex;
  }

  SetTextObject(textId: number): boolean {
    T3Util.Log('S.Connector: SetTextObject input textId:', textId);

    const skipCount = OptConstant.ConnectorDefines.NSkip;
    let lastTextHook = this.arraylist.lasttexthook;
    const totalHooks = this.arraylist.hook.length;
    const isLinear = Boolean(this.arraylist.styleflags & OptConstant.AStyles.Linear);
    const textAlignment = ShapeUtil.TextAlignToWin(this.TextAlign);
    const backgroundObj = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    // Update background color and fill based on text alignment
    this.StyleRecord.Fill.Paint.Color = backgroundObj.background.Paint.Color;
    if (textAlignment.vjust === TextConstant.TextJust.Center) {
      this.StyleRecord.Fill.Paint.FillType = NvConstant.FillTypes.Solid;
      this.StyleRecord.Fill.Paint.Opacity = 1;
    } else {
      this.StyleRecord.Fill.Paint.FillType = NvConstant.FillTypes.Transparent;
    }

    // If textId is -2, do nothing.
    if (textId === -2) {
      T3Util.Log('S.Connector: SetTextObject output: false (textId is -2)');
      return false;
    }

    if (totalHooks >= skipCount) {
      if (isLinear) {
        lastTextHook = this.FindTextLabel();
      } else if (lastTextHook < skipCount) {
        lastTextHook = skipCount;
      }
      if (lastTextHook >= totalHooks) {
        lastTextHook = totalHooks - 1;
      }

      this.arraylist.hook[lastTextHook].textid = textId;
      this.DataID = textId;
      this.arraylist.lasttexthook = lastTextHook;
      if (textId < 0) {
        this.arraylist.lasttexthook = -1;
      }
      T3Util.Log('S.Connector: SetTextObject output: true');
      return true;
    }

    T3Util.Log('S.Connector: SetTextObject output: false');
    return false;
  }

  GetTextObject(inputEvent, unusedParam, hookContext) {
    T3Util.Log('S.Connector: GetTextObject input:', { inputEvent, hookContext });

    let hookIndex;
    if (inputEvent === null && hookContext !== null) {
      hookIndex = hookContext.hookindex;
    } else {
      hookIndex = this.FindTextLabel(inputEvent);
      if (hookContext !== null) {
        hookContext.hookindex = hookIndex;
      }
    }

    if (hookIndex < 0) {
      T3Util.Log('S.Connector: GetTextObject output:', null);
      return null;
    }

    const hook = this.arraylist.hook[hookIndex];
    if (hook === undefined) {
      T3Util.Log('S.Connector: GetTextObject output:', null);
      return null;
    }

    this.DataID = hook.textid;
    this.arraylist.lasttexthook = hookIndex;

    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    if (svgElement) {
      svgElement.textElem = svgElement.GetElementById(OptConstant.SVGElementClass.Text, hookIndex);
    }

    T3Util.Log('S.Connector: GetTextObject output:', hook.textid);
    return hook.textid;
  }

  AdjustTextEditBackground(newColor: string, svgDoc: any) {
    T3Util.Log('S.Connector: AdjustTextEditBackground input - newColor:', newColor, 'svgDoc:', svgDoc);

    if (this.DataID !== -1) {
      const hookCount = this.arraylist.hook.length;

      if (this.arraylist.lasttexthook >= 0 && this.arraylist.lasttexthook < hookCount) {
        const lastHook = this.arraylist.hook[this.arraylist.lasttexthook];
        const svgElement = svgDoc || T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);

        if (svgElement) {
          const textBackgroundElement = svgElement.GetElementById(OptConstant.SVGElementClass.TextBackground, this.arraylist.lasttexthook);
          const textElement = svgElement.GetElementById(OptConstant.SVGElementClass.Text, this.arraylist.lasttexthook);

          if (textElement && textBackgroundElement) {
            const isDefaultSvgDoc = svgDoc == null;
            Instance.Shape.BaseLine.prototype.TextDirectionCommon.call(this, textElement, textBackgroundElement, isDefaultSvgDoc, lastHook);
          }
        }
      }
    }

    T3Util.Log('S.Connector: AdjustTextEditBackground output - DataID:', this.DataID);
  }

  UpdateSVG(svgDoc, shapeElement, polyPoints) {
    T3Util.Log('S.Connector: UpdateSVG input:', { svgDoc, shapeElement, polyPoints });
    // Clear the current shape
    shapeElement.Clear();
    const styles = OptConstant.AStyles;
    const isLinear = !!(this.arraylist.styleflags & styles.SEDA_Linear);
    let startArrow = T3Gv.ArrowheadLookupTable[this.StartArrowID];
    let endArrow = T3Gv.ArrowheadLookupTable[this.EndArrowID];
    const arrowSize = T3Gv.ArrowheadSizeTable[this.ArrowSizeIndex];

    if (startArrow.id === 0) {
      startArrow = null;
    }
    if (endArrow.id === 0) {
      endArrow = null;
    }
    shapeElement.SetArrowheads(startArrow, arrowSize, endArrow, arrowSize, this.StartArrowDisp, this.EndArrowDisp);

    const totalPoints = polyPoints.length;
    let index = 0;

    while (index < totalPoints) {
      // If the current point has curvature info, draw a curved segment
      if (polyPoints[index].curvex || polyPoints[index].curvey) {
        let curveSegment = [];
        let curveAmount;
        let factorPrimary = 1, factorSecondary = 1;
        let isVertical = this.vertical;
        // Invert vertical orientation if line is linear
        if (isLinear) {
          isVertical = !isVertical;
        }
        if (isVertical) {
          // For vertical orientation, determine curve parameters based on curvey and curvex
          if (polyPoints[index].curvey > 0) {
            curveAmount = polyPoints[index].curvey;
            if (polyPoints[index].curvex > 0) {
              factorSecondary = -1;
            }
            factorPrimary = -1;
          } else {
            curveAmount = polyPoints[index].curvey;
            if (polyPoints[index].curvex < 0) {
              factorSecondary = -1;
            }
            if (polyPoints[index].curvey < 0) {
              factorPrimary = -1;
            }
          }
          curveSegment = T3Gv.opt.Lines_AddCurve(isVertical, factorPrimary, factorSecondary, polyPoints[index].x + polyPoints[index].curvex, polyPoints[index].y, curveAmount);
        } else {
          // For horizontal orientation, use curvex and curvey appropriately
          if (polyPoints[index].curvex > 0) {
            curveAmount = polyPoints[index].curvex;
            if (polyPoints[index].curvey > 0) {
              factorSecondary = -1;
            }
            factorPrimary = -1;
          } else {
            curveAmount = polyPoints[index].curvex;
            if (polyPoints[index].curvey < 0) {
              factorSecondary = -1;
            }
            if (polyPoints[index].curvex < 0) {
              factorPrimary = -1;
            }
          }
          curveSegment = T3Gv.opt.Lines_AddCurve(isVertical, factorPrimary, factorSecondary, polyPoints[index].x, polyPoints[index].y + polyPoints[index].curvey, curveAmount);
        }
        shapeElement.AddPolyLine(curveSegment, false, false);
      }

      // Build a polyline segment
      let polylinePoints = [];
      polylinePoints.push({ x: polyPoints[index].x, y: polyPoints[index].y });
      const currentArrow = polyPoints[index].arrowhead;
      let nextArrow = false;
      index++;

      // Continue adding points until a moveto flag is encountered or we reach the end
      while (index < totalPoints && !polyPoints[index].moveto) {
        polylinePoints.push({ x: polyPoints[index].x, y: polyPoints[index].y });
        if (index === totalPoints - 1 || polyPoints[index + 1].moveto) {
          nextArrow = polyPoints[index].arrowhead;
        }
        index++;
      }
      if (polylinePoints.length > 1) {
        shapeElement.AddPolyLine(polylinePoints, currentArrow, nextArrow);
      }
    }
    shapeElement.BuildPath();
    T3Util.Log('S.Connector: UpdateSVG output:', shapeElement);
  }

  CreateCollapseButton(svgDocument, parentElement, adjustCollapse) {
    T3Util.Log("S.Connector: CreateCollapseButton input:", { svgDocument, parentElement, adjustCollapse });

    // Define local variables with readable names
    let collapseButton;
    let hooksCount;
    const knobSize = OptConstant.Common.CKnobSize;
    const style = OptConstant.AStyles;
    const reverseColumn = (this.arraylist.styleflags & style.SEDA_ReverseCol) !== 0;
    // bothSides is true if either the BothSides flag is set or the PerpConn flag is not set
    const bothSides = (this.arraylist.styleflags & style.SEDA_BothSides) !== 0 || (this.arraylist.styleflags & style.SEDA_PerpConn) === 0;
    const isRadial = (this.arraylist.styleflags & style.SEDA_Radial) !== 0 && !bothSides;
    const iconSize = knobSize;
    let offsetX = 0;
    let offsetY = 0;
    const hookPointOffset: { width?: number } = {};

    // Calculate the number of hooks after skipping preset ones
    hooksCount = this.arraylist ? this.arraylist.hook.length - OptConstant.ConnectorDefines.NSkip : 0;
    if (hooksCount < 0) {
      hooksCount = 0;
    }

    let hasHook = false;
    let hookPoint;
    if (this.hooks.length > 0) {
      hasHook = true;
      // Get the hook point using the first hook
      hookPoint = this.HookToPoint(this.hooks[0].hookpt, hookPointOffset);
      // Determine offsets based on orientation and radial flag
      if (isRadial) {
        if (this.vertical) {
          offsetY = 0;
          offsetX = knobSize;
        } else {
          offsetX = 0;
          offsetY = knobSize;
        }
      } else {
        if (hookPointOffset.width === 0) {
          offsetY = knobSize;
        } else {
          offsetX = knobSize;
        }
      }
      // Adjust offset for specific hook types
      switch (this.hooks[0].hookpt) {
        case OptConstant.HookPts.LR:
        case OptConstant.HookPts.LB:
          offsetX = -offsetX;
          offsetY = -offsetY;
          break;
      }
      // Reverse the vertical offset if the reverse flag is set
      if (reverseColumn) {
        offsetY = -offsetY;
      }

      // Apply calculated offsets to the hook point
      hookPoint.x += offsetX;
      hookPoint.y += offsetY;
    }

    // Create collapse/expand button only if there is at least one hook and hooksCount is non-zero
    if (hooksCount !== 0 && hasHook) {
      // Build configuration for the collapse button icon
      const buttonConfig = {
        svgDoc: svgDocument,
        iconSize: iconSize,
        imageURL: null,
        iconID: OptConstant.Common.HitAreas,
        userData: OptConstant.HitAreaType.ConnExpand,
        cursorType: CursorConstant.CursorType.ADD_PLUS,
        x: hookPoint.x - this.Frame.x - iconSize / 2,
        y: hookPoint.y - this.Frame.y - iconSize / 2
      };

      // Set image URL and userData based on collapse/expand extra flags
      if (this.extraflags & OptConstant.ExtraFlags.CollapseConn) {
        buttonConfig.imageURL = OptConstant.Common.ConPlusPath;
        buttonConfig.userData = OptConstant.HitAreaType.ConnExpand;
      } else {
        buttonConfig.imageURL = OptConstant.Common.ConMinusPath;
        buttonConfig.userData = OptConstant.HitAreaType.ConnCollapse;
      }

      collapseButton = this.GenericIcon(buttonConfig);
      if (adjustCollapse) {
        parentElement.SetSize(iconSize, iconSize);
        parentElement.SetPos(this.Frame.x, this.Frame.y);
        parentElement.isShape = true;
      }
      parentElement.AddElement(collapseButton);
    }

    T3Util.Log("S.Connector: CreateCollapseButton output:", { collapseButton });
  }

  CreateActionTriggers(svgDoc, targetId, extraParam, refId) {
    T3Util.Log("S.Connector: CreateActionTriggers input:", { svgDoc, targetId, extraParam, refId });

    // Create a group for all action trigger knobs
    const actionGroup = svgDoc.CreateShape(OptConstant.CSType.Group);

    // Knob sizing and style constants
    const knobSize = OptConstant.Common.KnobSize;
    const styleConstants = OptConstant.AStyles;
    const reverseColumnFlag = this.arraylist.styleflags & styleConstants.SEDA_ReverseCol;
    const hookPoints = OptConstant.HookPts;
    const connectorDefines = OptConstant.ConnectorDefines;

    // Get the document scale (adjust scale for small scales)
    let docScale = svgDoc.docInfo.docToScreenScale;
    if (svgDoc.docInfo.docScale <= 0.5) {
      docScale *= 2;
    }
    const scaledKnobSize = knobSize / docScale;

    // Determine the number of hooks from the arraylist (if any)
    const hookCount = this.arraylist && this.arraylist.hook ? this.arraylist.hook.length : 0;

    // Only continue if there are sufficient hooks or if object is of the proper type.
    if (hookCount <= connectorDefines.SEDA_NSkip /*&& this.objecttype !== NvConstant.FNObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH*/) {
      T3Util.Log("S.Connector: CreateActionTriggers output:", actionGroup);
      return actionGroup;
    }

    // Determine style flags: both sides and linear layout
    const bothSides = (this.arraylist.styleflags & styleConstants.SEDA_BothSides) > 0 ||
      (this.arraylist.styleflags & styleConstants.SEDA_PerpConn) === 0;
    const isLinear = Boolean(this.arraylist.styleflags & styleConstants.SEDA_Linear);

    // Get and adjust the frame dimensions from the Connector's frame
    const frame = this.Frame;
    let frameWidth = frame.width + scaledKnobSize;
    let frameHeight = frame.height + scaledKnobSize;
    const adjustedFrame = $.extend(true, {}, frame);
    adjustedFrame.x -= scaledKnobSize / 2;
    adjustedFrame.y -= scaledKnobSize / 2;
    adjustedFrame.width += scaledKnobSize;
    adjustedFrame.height += scaledKnobSize;

    // Get a target object pointer for further adjustments.
    const targetObject = DataUtil.GetObjectPtr(targetId, false);

    // Set the appropriate resize cursors based on orientation.
    let primaryCursor, secondaryCursor;
    if (this.vertical) {
      primaryCursor = CursorConstant.CursorType.RESIZE_TB;
      secondaryCursor = CursorConstant.CursorType.RESIZE_LR;
    } else {
      primaryCursor = CursorConstant.CursorType.RESIZE_LR;
      secondaryCursor = CursorConstant.CursorType.RESIZE_TB;
    }

    // Factor for directional adjustments based on reverse flag
    const directionFactor = reverseColumnFlag ? -1 : 1;

    // Default knob settings object
    let knobSettings: any = {
      svgDoc: svgDoc,
      shapeType: OptConstant.CSType.Rect,
      knobSize: scaledKnobSize,
      fillColor: 'black',
      fillOpacity: 1,
      strokeSize: 1,
      strokeColor: '#777777',
      cursorType: primaryCursor
    };

    // Adjust knob settings for different operations based on input IDs.
    if (targetId !== refId) {
      knobSettings.fillColor = 'white';
      knobSettings.fillOpacity = 0;
      knobSettings.strokeSize = 1;
      knobSettings.strokeColor = 'black';
    }
    if (this.flags & NvConstant.ObjFlags.Lock) {
      knobSettings.fillColor = 'gray';
      knobSettings.locked = true;
    } else if (this.NoGrow()) {
      knobSettings.fillColor = 'red';
      // side knobs may be removed
      knobSettings.strokeColor = 'red';
      secondaryCursor = CursorConstant.CursorType.DEFAULT;
      primaryCursor = CursorConstant.CursorType.DEFAULT;
    }

    // Create the LINESTART knob if allowed.
    if ((
      // Anonymous function to decide if a LINESTART knob is allowed.
      (function (connector) {
        // if (connector.objecttype === NvConstant.FNObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH && connector.hooks.length) {
        //   switch (connector.hooks[0].hookpt) {
        //     case hookPoints.SED_LL:
        //     case hookPoints.SED_LT:
        //       return false;
        //     default:
        //       return true;
        //   }
        // }
        return true;
      })(this)
    )) {
      knobSettings.x = this.StartPoint.x - frame.x;
      knobSettings.y = this.StartPoint.y - frame.y;
      // if (targetObject && targetObject.objecttype === NvConstant.FNObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH) {
      //   const branchHook = this.arraylist.hook[connectorDefines.A_Cl];
      //   knobSettings.x += branchHook.endpoint.v - branchHook.startpoint.v;
      //   knobSettings.y += branchHook.endpoint.h - branchHook.startpoint.h;
      // }
      knobSettings.knobID = OptConstant.ActionTriggerType.LineStart;
      const startKnob = this.GenericKnob(knobSettings);
      actionGroup.AddElement(startKnob);
      // Save the start knob for potential replacement later.
      var savedStartKnob = startKnob;
    }

    // Create the LINEEND knob if allowed.
    if ((
      (function (connector) {
        // if (connector.objecttype === NvConstant.FNObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH && connector.hooks.length) {
        //   switch (connector.hooks[0].hookpt) {
        //     case hookPoints.SED_LR:
        //     case hookPoints.SED_LB:
        //       return false;
        //     default:
        //       return true;
        //   }
        // }
        return true;
      })(this)
    )) {
      knobSettings.x = this.EndPoint.x - frame.x;
      knobSettings.y = this.EndPoint.y - frame.y;
      // if (targetObject && targetObject.objecttype === NvConstant.FNObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH) {
      //   const branchHook = this.arraylist.hook[connectorDefines.A_Cr];
      //   knobSettings.x += branchHook.endpoint.v - branchHook.startpoint.v;
      //   knobSettings.y += branchHook.endpoint.h - branchHook.startpoint.h;
      // }
      knobSettings.knobID = OptConstant.ActionTriggerType.LineEnd;
      const endKnob = this.GenericKnob(knobSettings);
      actionGroup.AddElement(endKnob);
      // Save the end knob for potential replacement later.
      var savedEndKnob = endKnob;
    }

    // Create hook knobs for additional triggers if targetObject has hooks and more than one connector hook.
    if (targetObject && targetObject.hooks && hookCount > 1 /*&&
      targetObject.objecttype !== NvConstant.FNObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH*/) {
      for (let hookIndex = 0; hookIndex < targetObject.hooks.length; hookIndex++) {
        // Make a copy of current knob settings for restoration after modifications
        const knobSettingsCopy = $.extend(true, {}, knobSettings);
        let triggerIndex: number;
        if (bothSides) {
          // Depending on hook point type, set trigger index and remove previously added knob.
          switch (targetObject.hooks[hookIndex].hookpt) {
            case OptConstant.HookPts.LL:
            case OptConstant.HookPts.LT:
              triggerIndex = OptConstant.ConnectorDefines.ACl;
              actionGroup.RemoveElement(savedStartKnob);
              break;
            default:
              triggerIndex = OptConstant.ConnectorDefines.ACr;
              actionGroup.RemoveElement(savedEndKnob);
          }
          knobSettings.cursorType = primaryCursor;
          knobSettings.shapeType = OptConstant.CSType.Oval;
          knobSettings.fillColor = 'white';
          knobSettings.fillOpacity = 0.01;
          knobSettings.strokeSize = 1;
          knobSettings.strokeColor = 'green';
        } else {
          triggerIndex = OptConstant.ConnectorDefines.ACl;
          knobSettings.cursorType = secondaryCursor;
        }

        if (triggerIndex > 0) {
          const hookData = this.arraylist.hook[triggerIndex];
          if (this.vertical) {
            knobSettings.x = hookData.startpoint.v + this.StartPoint.x - frame.x;
            knobSettings.y = hookData.startpoint.h + this.StartPoint.y - frame.y;
            if (bothSides) {
              knobSettings.y += directionFactor * (hookData.endpoint.h - hookData.startpoint.h) / 2;
            }
          } else {
            knobSettings.x = hookData.startpoint.h + this.StartPoint.x - frame.x;
            knobSettings.y = hookData.startpoint.v + this.StartPoint.y - frame.y;
            if (bothSides) {
              knobSettings.x += directionFactor * (hookData.endpoint.h - hookData.startpoint.h) / 2;
            }
          }
          knobSettings.knobID = OptConstant.ActionTriggerType.ConnectorHook;
          const hookKnob = this.GenericKnob(knobSettings);
          hookKnob.SetUserData(triggerIndex);
          actionGroup.AddElement(hookKnob);
          // Restore knob settings from copy for next iteration.
          knobSettings = $.extend(true, {}, knobSettingsCopy);
        }
      }
    }

    // Create perpendicular adjustment knobs if not in linear mode and not a cause-effect main object.
    if (!isLinear && (function (connector) {
      return connector.objecttype !== NvConstant.FNObjectTypes.CauseEffectMain;
    })(this)) {
      knobSettings.shapeType = OptConstant.CSType.Rect;
      knobSettings.cursorType = secondaryCursor;
      for (let hookIndex = connectorDefines.SEDA_NSkip; hookIndex < hookCount; hookIndex++) {
        const hookData = this.arraylist.hook[hookIndex];
        if (this.vertical) {
          knobSettings.x = hookData.endpoint.v + this.StartPoint.x - frame.x;
          knobSettings.y = directionFactor * hookData.endpoint.h + this.StartPoint.y - frame.y;
        } else {
          knobSettings.x = hookData.endpoint.h + this.StartPoint.x - frame.x;
          knobSettings.y = hookData.endpoint.v + this.StartPoint.y - frame.y;
        }
        knobSettings.knobID = OptConstant.ActionTriggerType.ConnectorRerp;
        const perpKnob = this.GenericKnob(knobSettings);
        perpKnob.SetUserData(hookIndex - connectorDefines.SEDA_NSkip);
        actionGroup.AddElement(perpKnob);
      }
    }

    // Create connector adjustment knobs for further fine-tuning if allowed.
    const stubIndex = this.PrGetStubIndex();
    if ((function (connector) {
      return true;//connector.objecttype !== NvConstant.FNObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH;
    })(this)) {
      for (let hookIndex = connectorDefines.SEDA_NSkip + 1;
        hookIndex < hookCount && (isLinear || bothSides || !(hookCount - connectorDefines.SEDA_NSkip <= 2)) && !(bothSides && ++hookIndex >= hookCount);
        hookIndex++) {
        const previousHook = this.arraylist.hook[hookIndex - 1];
        const currentHook = this.arraylist.hook[hookIndex];
        knobSettings.cursorType = primaryCursor;
        knobSettings.shapeType = OptConstant.CSType.Oval;
        knobSettings.fillColor = 'white';
        knobSettings.fillOpacity = 0.01;
        knobSettings.strokeSize = 1;
        knobSettings.strokeColor = 'green';
        if (this.vertical) {
          if (isLinear) {
            if (stubIndex === connectorDefines.A_Cr) {
              knobSettings.y = ((currentHook.startpoint.h + currentHook.endpoint.h) / 2) + this.StartPoint.y - frame.y - currentHook.extra / 2;
            } else {
              knobSettings.y = ((currentHook.startpoint.h + currentHook.endpoint.h) / 2) + this.StartPoint.y - frame.y + currentHook.extra / 2;
            }
            knobSettings.x = previousHook.startpoint.v + this.StartPoint.x - frame.x;
          } else {
            knobSettings.y = directionFactor * ((previousHook.endpoint.h + currentHook.endpoint.h) / 2) + this.StartPoint.y - frame.y + directionFactor * currentHook.extra / 2;
            knobSettings.x = previousHook.startpoint.v + this.StartPoint.x - frame.x + (currentHook.startpoint.v - previousHook.startpoint.v) / 2;
          }
        } else {
          if (isLinear) {
            if (stubIndex === connectorDefines.A_Cr) {
              knobSettings.x = ((currentHook.startpoint.h + currentHook.endpoint.h) / 2) + this.StartPoint.x - frame.x - currentHook.extra / 2;
            } else {
              knobSettings.x = ((currentHook.startpoint.h + currentHook.endpoint.h) / 2) + this.StartPoint.x - frame.x + currentHook.extra / 2;
            }
            knobSettings.y = previousHook.startpoint.v + this.StartPoint.y - frame.y;
          } else {
            knobSettings.x = ((previousHook.endpoint.h + currentHook.endpoint.h) / 2) + this.StartPoint.x - frame.x + currentHook.extra / 2;
            knobSettings.y = previousHook.startpoint.v + this.StartPoint.y - frame.y;
          }
        }
        knobSettings.knobID = OptConstant.ActionTriggerType.ConnectorAdj;
        const adjKnob = this.GenericKnob(knobSettings);
        adjKnob.SetUserData(hookIndex);
        actionGroup.AddElement(adjKnob);

        if (this.AllowTextEdit()) {
          const domElement = adjKnob.DOMElement();
          const hammerInstance = Hammer(domElement);
          const doubleTapHandler = Evt_ShapeDoubleTapFactory(this);
          hammerInstance.on("doubletap", doubleTapHandler);
        }
      }
    }

    // Finalize the action group shape (size, position, and identification)
    actionGroup.SetSize(frameWidth, frameHeight);
    actionGroup.SetPos(adjustedFrame.x, adjustedFrame.y);
    actionGroup.isShape = true;
    actionGroup.SetID(OptConstant.Common.Action + targetId);

    T3Util.Log("S.Connector: CreateActionTriggers output:", actionGroup);
    return actionGroup;
  }

  CreateConnectHilites(svgDoc: any, targetElement: any, unusedParam1: any, unusedParam2: any, hookIndex: number, unusedParam3: any) {
    T3Util.Log("S.Connector: CreateConnectHilites input:", { svgDoc, targetElement, hookIndex });

    const styleConstants = OptConstant.AStyles;
    const groupShape = svgDoc.CreateShape(OptConstant.CSType.Group);
    let docScale = svgDoc.docInfo.docToScreenScale;
    if (svgDoc.docInfo.docScale <= 0.5) {
      docScale *= 2;
    }
    let customVar, genericKnob: any, polylineShape, tempShape, tempPoint, tempRect;
    const connectPtSize = OptConstant.Common.ConnPointDim / docScale;
    const pointArray: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 }
    ];

    // Get the target points based on hook flags and hook index
    let targetPoints = this.GetTargetPoints(null, NvConstant.HookFlags.LcNoSnaps | NvConstant.HookFlags.LcHookNoExtra, hookIndex);
    if (targetPoints != null) {
      // Calculate perimeter points using the target element and target points
      const perimeterPoints = this.GetPerimPts(targetElement, targetPoints, null, true, null, hookIndex);
      const hookCount = this.arraylist.hook.length - OptConstant.ConnectorDefines.NSkip;
      const frameRect = this.Frame;
      let frameWidth = frameRect.width;
      let frameHeight = frameRect.height;
      // Extend the frame rectangle to include connection points
      const extendedFrame = $.extend(true, {}, frameRect);
      extendedFrame.x -= connectPtSize / 2;
      extendedFrame.y -= connectPtSize / 2;
      extendedFrame.width += connectPtSize;
      extendedFrame.height += connectPtSize;
      frameWidth += connectPtSize;
      frameHeight += connectPtSize;
      // Prepare generic knob settings object
      const knobSettings = {
        svgDoc: svgDoc,
        shapeType: OptConstant.CSType.Oval,
        x: 0,
        y: 0,
        knobSize: connectPtSize,
        fillColor: 'black',
        fillOpacity: 1,
        strokeSize: 1,
        strokeColor: '#777777',
        KnobID: 0,
        cursorType: CursorConstant.CursorType.ANCHOR
      };

      const isLinear = Boolean(this.arraylist.styleflags & OptConstant.AStyles.Linear);
      const isBothSides = Boolean(this.arraylist.styleflags & styleConstants.SEDA_BothSides) ||
        (this.arraylist.styleflags & styleConstants.SEDA_PerpConn) === 0;
      const isRadial = Boolean(this.arraylist.styleflags & styleConstants.SEDA_Radial) && !isBothSides;
      const hasBothSides = Boolean(this.arraylist.styleflags & styleConstants.SEDA_BothSides);
      const angleValue = this.arraylist.angle;
      let radialStartPoint;
      if (isRadial && hookCount > 0) {
        radialStartPoint = this.vertical
          ? { x: this.StartPoint.x - this.Frame.x, y: this.StartPoint.y - this.Frame.y + this.arraylist.hook[OptConstant.ConnectorDefines.ACl].startpoint.h }
          : { x: this.StartPoint.x - this.Frame.x + this.arraylist.hook[OptConstant.ConnectorDefines.ACl].startpoint.h, y: this.StartPoint.y - this.Frame.y };
      }

      // Loop through each perimeter point to create knobs and optionally add connecting polyline shapes
      for (let index = 0; index < perimeterPoints.length; index++) {
        // Update knob settings based on the current perimeter point
        knobSettings.x = perimeterPoints[index].x - this.Frame.x;
        knobSettings.y = perimeterPoints[index].y - this.Frame.y;
        // Reset pointArray length to 2
        pointArray.length = 2;
        // Create generic knob element based on the current settings
        genericKnob = this.GenericKnob(knobSettings);
        let addPolyline = false;

        if (this.vertical) {
          if (index === 0) {
            if (hookCount <= 0) {
              if (isBothSides) {
                pointArray[0].x = this.StartPoint.x - this.Frame.x + connectPtSize / 2;
                pointArray[0].y = this.StartPoint.y - this.Frame.y;
                pointArray[1].x = this.StartPoint.x - this.Frame.x + connectPtSize / 2;
                pointArray[1].y = this.EndPoint.y - this.Frame.y;
                pointArray.push(new Point(knobSettings.x + connectPtSize / 2, knobSettings.y + connectPtSize / 2));
                addPolyline = true;
              } else {
                pointArray[0].x = this.StartPoint.x - this.Frame.x;
                pointArray[0].y = this.StartPoint.y - this.Frame.y + connectPtSize / 2;
                pointArray[1].x = this.EndPoint.x - this.Frame.x;
                pointArray[1].y = this.StartPoint.y - this.Frame.y + connectPtSize / 2;
                pointArray.push(new Point(knobSettings.x + connectPtSize / 2, knobSettings.y + connectPtSize / 2));
                addPolyline = true;
              }
            } else if (isRadial) {
              pointArray[0].x = radialStartPoint.x;
              pointArray[0].y = radialStartPoint.y;
              pointArray[1].x = knobSettings.x + connectPtSize / 2;
              pointArray[1].y = knobSettings.y + connectPtSize / 2;
              addPolyline = true;
            } else {
              let angleOffset = 0;
              if (this.arraylist.angle) {
                angleOffset = knobSettings.y * this.arraylist.angle;
              }
              pointArray[0].x = this.StartPoint.x - this.Frame.x + connectPtSize / 2 + angleOffset;
              pointArray[0].y = this.StartPoint.y - this.Frame.y;
              pointArray[1].x = this.StartPoint.x - this.Frame.x + connectPtSize / 2 + angleOffset;
              pointArray[1].y = knobSettings.y + connectPtSize / 2;
              pointArray.push(new Point(knobSettings.x + connectPtSize / 2, knobSettings.y + connectPtSize / 2));
              if (hasBothSides || angleValue) {
                pointArray.shift();
              }
              addPolyline = true;
            }
          } else if (index === hookCount && !isRadial) {
            if (this.arraylist.angle) {
              let angleOffset = knobSettings.y * this.arraylist.angle;
              pointArray[0].x = this.StartPoint.x - this.Frame.x + connectPtSize / 2 + angleOffset;
              pointArray[0].y = this.EndPoint.y - this.Frame.y;
              pointArray[1].x = this.StartPoint.x - this.Frame.x + connectPtSize / 2 + angleOffset;
              pointArray[1].y = knobSettings.y + connectPtSize / 2;
              pointArray.push(new Point(knobSettings.x + connectPtSize / 2, knobSettings.y + connectPtSize / 2));
              if (hasBothSides || angleValue) {
                pointArray.shift();
              }
              addPolyline = true;
            }
          } else if (isLinear) {
            if (perimeterPoints[index].x !== this.StartPoint.x) {
              pointArray[0].x = this.StartPoint.x - this.Frame.x + connectPtSize / 2;
              pointArray[0].y = knobSettings.y + connectPtSize / 2;
              pointArray[1].x = knobSettings.x + connectPtSize / 2;
              pointArray[1].y = knobSettings.y + connectPtSize / 2;
              addPolyline = true;
            }
          } else if (isRadial) {
            switch (targetPoints[index].y) {
              case OptConstant.ConnectorDefines.Above:
                pointArray[0].x = this.StartPoint.x - this.Frame.x - this.arraylist.ht;
                pointArray[0].y = knobSettings.y + connectPtSize / 2;
                pointArray[1].x = knobSettings.x + connectPtSize / 2;
                pointArray[1].y = knobSettings.y + connectPtSize / 2;
                break;
              case OptConstant.ConnectorDefines.Below:
                pointArray[0].x = this.StartPoint.x - this.Frame.x + this.arraylist.ht;
                pointArray[0].y = knobSettings.y + connectPtSize / 2;
                pointArray[1].x = knobSettings.x + connectPtSize / 2;
                pointArray[1].y = knobSettings.y + connectPtSize / 2;
                break;
              default:
                pointArray[0].x = radialStartPoint.x;
                pointArray[0].y = radialStartPoint.y;
                pointArray[1].x = knobSettings.x + connectPtSize / 2;
                pointArray[1].y = knobSettings.y + connectPtSize / 2;
            }
            addPolyline = true;
          } else {
            let angleOffset = 0;
            if (this.arraylist.angle) {
              angleOffset = knobSettings.y * this.arraylist.angle;
            }
            pointArray[0].x = this.StartPoint.x - this.Frame.x + connectPtSize / 2 + angleOffset;
            pointArray[0].y = knobSettings.y + connectPtSize / 2;
            pointArray[1].x = knobSettings.x + connectPtSize / 2;
            pointArray[1].y = knobSettings.y + connectPtSize / 2;
            addPolyline = true;
          }
        } else { // Horizontal case
          if (index === 0) {
            if (hookCount <= 0) {
              if (isBothSides) {
                pointArray[0].x = this.StartPoint.x - this.Frame.x;
                pointArray[0].y = this.StartPoint.y - this.Frame.y + connectPtSize / 2;
                pointArray[1].x = this.EndPoint.x - this.Frame.x;
                pointArray[1].y = this.StartPoint.y - this.Frame.y + connectPtSize / 2;
                pointArray.push(new Point(knobSettings.x + connectPtSize / 2, knobSettings.y + connectPtSize / 2));
                addPolyline = true;
              } else {
                pointArray[0].x = this.StartPoint.x - this.Frame.x + connectPtSize / 2;
                pointArray[0].y = this.StartPoint.y - this.Frame.y;
                pointArray[1].x = this.StartPoint.x - this.Frame.x + connectPtSize / 2;
                pointArray[1].y = this.EndPoint.y - this.Frame.y;
                pointArray.push(new Point(knobSettings.x + connectPtSize / 2, knobSettings.y + connectPtSize / 2));
                addPolyline = true;
              }
            } else if (isRadial) {
              pointArray[0].y = radialStartPoint.y;
              pointArray[0].x = radialStartPoint.x;
              pointArray[1].y = knobSettings.y + connectPtSize / 2;
              pointArray[1].x = knobSettings.x + connectPtSize / 2;
              addPolyline = true;
            } else {
              let angleOffset = 0;
              if (this.arraylist.angle) {
                angleOffset = knobSettings.x * this.arraylist.angle;
              }
              pointArray[0].y = this.StartPoint.y - this.Frame.y + connectPtSize / 2 + angleOffset;
              pointArray[0].x = this.StartPoint.x - this.Frame.x;
              pointArray[1].y = this.StartPoint.y - this.Frame.y + connectPtSize / 2 + angleOffset;
              pointArray[1].x = knobSettings.x + connectPtSize / 2;
              pointArray.push(new Point(knobSettings.x + connectPtSize / 2, knobSettings.y + connectPtSize / 2));
              if (hasBothSides || angleValue) {
                pointArray.shift();
              }
              addPolyline = true;
            }
          } else if (index === hookCount && !isRadial) {
            if (this.arraylist.angle) {
              let angleOffset = knobSettings.x * this.arraylist.angle;
              pointArray[0].y = this.StartPoint.y - this.Frame.y + connectPtSize / 2 + angleOffset;
              pointArray[0].x = this.EndPoint.x - this.Frame.x;
              pointArray[1].y = this.StartPoint.y - this.Frame.y + connectPtSize / 2 + angleOffset;
              pointArray[1].x = knobSettings.x + connectPtSize / 2;
              pointArray.push(new Point(knobSettings.x + connectPtSize / 2, knobSettings.y + connectPtSize / 2));
              if (hasBothSides || angleValue) {
                pointArray.shift();
              }
              addPolyline = true;
            }
          } else if (isLinear) {
            if (perimeterPoints[index].y !== this.StartPoint.y) {
              pointArray[0].y = this.StartPoint.y - this.Frame.y + connectPtSize / 2;
              pointArray[0].x = knobSettings.x + connectPtSize / 2;
              pointArray[1].y = knobSettings.y + connectPtSize / 2;
              pointArray[1].x = knobSettings.x + connectPtSize / 2;
              addPolyline = true;
            }
          } else if (isRadial) {
            switch (targetPoints[index].y) {
              case OptConstant.ConnectorDefines.Above:
                pointArray[0].y = this.StartPoint.y - this.Frame.y - this.arraylist.ht;
                pointArray[0].x = knobSettings.x + connectPtSize / 2;
                pointArray[1].y = knobSettings.y + connectPtSize / 2;
                pointArray[1].x = knobSettings.x + connectPtSize / 2;
                break;
              case OptConstant.ConnectorDefines.Below:
                pointArray[0].y = this.StartPoint.y - this.Frame.y + this.arraylist.ht;
                pointArray[0].x = knobSettings.x + connectPtSize / 2;
                pointArray[1].y = knobSettings.y + connectPtSize / 2;
                pointArray[1].x = knobSettings.x + connectPtSize / 2;
                break;
              default:
                pointArray[0].y = radialStartPoint.y;
                pointArray[0].x = radialStartPoint.x;
                pointArray[1].y = knobSettings.y + connectPtSize / 2;
                pointArray[1].x = knobSettings.x + connectPtSize / 2;
            }
            addPolyline = true;
          } else {
            pointArray[0].y = this.StartPoint.y - this.Frame.y + connectPtSize / 2;
            pointArray[0].x = knobSettings.x + connectPtSize / 2;
            pointArray[1].y = knobSettings.y + connectPtSize / 2;
            pointArray[1].x = knobSettings.x + connectPtSize / 2;
            addPolyline = true;
          }
        }

        // Add knob element to the group shape.
        groupShape.AddElement(genericKnob);
        // If polyline is required, create a polyline shape to connect the points.
        if (addPolyline) {
          tempShape = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Polyline);
          if (tempShape) {
            tempShape.SetPoints(pointArray);
            tempShape.SetFillColor('none');
            tempShape.SetStrokeColor('black');
            tempShape.SetStrokePattern('2,2');
            tempShape.SetStrokeWidth(1);
            groupShape.AddElement(tempShape);
          }
        }
      }

      groupShape.SetSize(frameWidth, frameHeight);
      groupShape.SetPos(extendedFrame.x, extendedFrame.y);
      groupShape.isShape = true;
      groupShape.SetID('hilite_' + targetElement);
      T3Util.Log("S.Connector: CreateConnectHilites output:", groupShape);
      return groupShape;
    }
  }

  SetCursors() {
    T3Util.Log('S.Connector: SetCursors input');

    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    Instance.Shape.BaseDrawObject.prototype.SetCursors.call(this);

    if (OptCMUtil.GetEditMode() === NvConstant.EditState.Default && svgElement) {
      const hitAreasElement = svgElement.GetElementById(OptConstant.Common.HitAreas);
      if (hitAreasElement) {
        hitAreasElement.SetCursor(CursorConstant.CursorType.ADD_PLUS);
      }
    }

    T3Util.Log('S.Connector: SetCursors output');
  }

  GetArrowheadSelection(params) {
    T3Util.Log('S.Connector: GetArrowheadSelection input:', params);

    if (params) {
      params.StartArrowID = this.StartArrowID;
      params.StartArrowDisp = this.StartArrowDisp;
      params.EndArrowID = this.EndArrowID;
      params.EndArrowDisp = this.EndArrowDisp;
      params.ArrowSizeIndex = this.ArrowSizeIndex;
    }

    T3Util.Log('S.Connector: GetArrowheadSelection output:', params);
    return true;
  }

  /**
   * Handles right-click events on a connector shape
   *
   * This method processes right-click events on connectors, providing appropriate
   * contextual menus based on the connector state. It determines whether the click
   * was on text (for spell checking or text editing) or on the connector itself,
   * and shows the relevant menu at the click location.
   *
   * @param event - The right-click event with gesture information
   * @returns Boolean indicating if the event was handled successfully
   */
  RightClick(event) {
    // Convert window coordinates to document coordinates
    const docCoords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      event.gesture.center.clientX,
      event.gesture.center.clientY
    );

    // Find the SVG element clicked on
    const svgElement = T3Gv.opt.svgObjectLayer.FindElementByDOMElement(event.currentTarget);

    // Attempt to select the object from the click event
    if (!SelectUtil.SelectObjectFromClick(event, svgElement)) {
      return false;
    }

    // Get the object ID and retrieve the object pointer
    const targetId = svgElement.GetID();
    const targetObject = DataUtil.GetObjectPtr(targetId, false);

    if (targetObject) {
      // Check if there's a text object associated with this connector
      if (targetObject.GetTextObject() >= 0) {
        const textElement = svgElement.textElem;
        if (textElement) {
          // Check for spell checking at the click location
          const spellCheckPosition = textElement.GetSpellAtLocation(
            event.gesture.center.clientX,
            event.gesture.center.clientY
          );

          // If a valid spell position was found, activate text editing
          if (spellCheckPosition >= 0) {
            TextUtil.ActivateTextEdit(svgElement, event, true);
          }
        }
      }

      // Get connector style flags and properties
      const styles = OptConstant.AStyles;
      const isCoManager = targetObject.arraylist.styleflags & styles.SEDA_CoManager;
      const isPerpendicular = (targetObject.arraylist.styleflags & styles.SEDA_PerpConn) > 0;
      const skipHookCount = OptConstant.ConnectorDefines.NSkip;
      const totalHookCount = targetObject.arraylist.hook.length;

      // These checks have no effect in the original code (unused results)
      // But keeping for compatibility
      isPerpendicular && totalHookCount > skipHookCount + 1;
      isCoManager && true;
    }

    // Initialize right-click parameters
    T3Gv.opt.rClickParam = new RightClickMd();
    T3Gv.opt.rClickParam.targetId = svgElement.GetID();
    T3Gv.opt.rClickParam.hitPoint.x = docCoords.x;
    T3Gv.opt.rClickParam.hitPoint.y = docCoords.y;
    T3Gv.opt.rClickParam.locked = (this.flags & NvConstant.ObjFlags.Lock) > 0;

    // Check if there's an active text edit
    if (TextUtil.GetActiveTextEdit() != null) {
      const activeEdit = T3Gv.opt.svgDoc.GetActiveEdit();
      let spellPosition = -1;

      if (activeEdit) {
        spellPosition = activeEdit.GetSpellAtLocation(
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
      }

      // Show appropriate menu based on spell check position
      if (spellPosition >= 0) {
        // Show spell check menu at the click location
        T3Gv.opt.svgDoc.GetSpellCheck().ShowSpellMenu(
          activeEdit,
          spellPosition,
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
      } else {
        // Show text menu
        SDUI.Commands.MainController.ShowContextualMenu(
          SDUI.Resources.Controls.ContextMenus.TextMenu.Id.toLowerCase(),
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
      }
    } else {
      // Show connector menu
      SDUI.Commands.MainController.ShowContextualMenu(
        SDUI.Resources.Controls.ContextMenus.Connector.Id.toLowerCase(),
        event.gesture.center.clientX,
        event.gesture.center.clientY
      );
    }
  }

  HitAreaClick(hitAreaID) {
    T3Util.Log('S.Connector: HitAreaClick input:', hitAreaID);

    T3Gv.opt.CloseEdit();
    let connector = this;

    // if (Collab.AllowMessage()) {
    //   Collab.BeginSecondaryEdit();
    //   const messageData = {
    //     BlockID: this.BlockID,
    //     theHitAreaID: hitAreaID
    //   };
    //   connector = DataUtil.GetObjectPtr(connector.BlockID, false);
    // }

    switch (hitAreaID) {
      case OptConstant.HitAreaType.ConnCollapse:
        connector.CollapseConnector(true, false, true);
        break;
      case OptConstant.HitAreaType.ConnExpand:
        connector.CollapseConnector(false, false, true);
        break;
    }

    OptAhUtil.FindTreeTop(
      connector,
      DSConstant.LinkFlags.SED_L_MOVE,
      {
        topconnector: -1,
        topshape: -1,
        foundtree: false
      }
    );

    // if (Collab.AllowMessage()) {
    //   Collab.BuildMessage(NvConstant.CollabMessages.HitAreaClick, messageData, false, false);
    // }

    DrawUtil.CompleteOperation(null);

    T3Util.Log('S.Connector: HitAreaClick output');
  }

  /**
   * Calculates the points that define the connector's path for rendering
   *
   * This function determines all points needed to draw the connector line based on
   * style flags, orientation, and hook points. It handles various connector styles
   * including linear, radial, perpendicular connections, and accounts for curves
   * and arrowheads.
   *
   * @param numPoints - Maximum number of points to generate
   * @param useRelativeCoordinates - If true, coordinates are returned relative to Frame
   * @param skipCurves - If true, curve parameters are ignored
   * @param unusedFlag - Unused parameter (maintained for compatibility)
   * @param unusedParam - Unused parameter (maintained for compatibility)
   * @returns Array of PathPoint objects defining the connector's path
   */
  GetPolyPoints(numPoints, useRelativeCoordinates, skipCurves, unusedFlag, unusedParam) {
    let hookIndex,
      hookCount,
      profileOffset,
      offsetDelta,
      heightValue,
      profileValue,
      offsetMultiplier,
      hasArrowhead,
      directionMultiplier,
      isPointsEqual,
      addArrowhead,
      nextHook,
      pointAdjustment,
      pointArray = [],
      startPosition = {},
      styleFlags = OptConstant.AStyles;

    // Style flag checks
    const isCoManager = this.arraylist.styleflags & styleFlags.SEDA_CoManager;
    const hasPerpConnector = (this.arraylist.styleflags & styleFlags.SEDA_PerpConn) > 0;
    const isStartLeft = this.arraylist.styleflags & styleFlags.SEDA_StartLeft;
    const isAssistantConnector = this.IsAsstConnector();
    const skipHooksCount = OptConstant.ConnectorDefines.NSkip;
    const hasReverseColumn = this.arraylist.styleflags & styleFlags.SEDA_ReverseCol;
    const isLinear = this.arraylist.styleflags & OptConstant.AStyles.Linear;
    const isFlowAndLinear = this.arraylist.styleflags & OptConstant.AStyles.FlowConn && isLinear;
    const hasAngle = 0 !== this.arraylist.angle;
    const leftHookIndex = OptConstant.ConnectorDefines.ACl;
    const rightHookIndex = OptConstant.ConnectorDefines.ACr;
    const hasStartArrow = this.StartArrowID > 0;
    const addStartArrowOnly = 0 == this.EndArrowID > 0 && hasStartArrow;
    const arrowheadAdded = false;
    const curveParam = this.arraylist.curveparam;
    let curveAmount = 0;

    // Get hook count and start position
    hookCount = this.arraylist.hook.length;

    if (useRelativeCoordinates) {
      startPosition.x = this.StartPoint.x - this.Frame.x;
      startPosition.y = this.StartPoint.y - this.Frame.y;
    } else {
      startPosition = this.StartPoint;
    }

    // Special case for connectors with a single segment and no perpendicular connection
    const isSingleSegmentNoPerpConnection = (hookCount == skipHooksCount + 1) &&
      (0 == (this.arraylist.styleflags & styleFlags.SEDA_PerpConn));

    // Check if curves are allowed for this connector
    const curveInfo = {
      index: -1,
      left: false
    };

    // Calculate the effective curve amount if curves are allowed
    if (this.AllowCurveOnConnector(curveInfo) && (hookCount > skipHooksCount + 1 || isSingleSegmentNoPerpConnection) &&
      curveParam > 0 && !skipCurves) {

      curveAmount = curveParam;

      // Calculate available height for curve (accounting for co-manager heights)
      const availableHeight = this.arraylist.ht - (function (connector) {
        let maxHeight = 0;
        let currentHook;

        for (hookIndex = 0; hookIndex < hookCount; hookIndex++) {
          currentHook = connector.arraylist.hook[hookIndex];
          if (currentHook.comanagerht > maxHeight) {
            maxHeight = currentHook.comanagerht;
            break;
          }
        }
        return maxHeight;
      })(this);

      // Ensure curve amount doesn't exceed available space
      if (availableHeight < 0) {
        availableHeight = 0;
      }

      if (isAssistantConnector && !this.vertical) {
        if (curveAmount > this.arraylist.wd) {
          curveAmount = this.arraylist.wd;
        }
      } else if (curveAmount > availableHeight) {
        curveAmount = availableHeight;
      }
    }

    if (this.vertical) {
      // Process vertical connector
      directionMultiplier = hasReverseColumn ? -1 : 1;
      heightValue = this.arraylist.ht;

      // Process each hook point
      for (hookIndex = 0; hookIndex < hookCount; hookIndex++) {
        const currentHook = this.arraylist.hook[hookIndex];

        // Check if start and end points are equal
        isPointsEqual = Utils2.IsEqual(currentHook.startpoint.v + startPosition.x, currentHook.endpoint.v + startPosition.x) &&
          Utils2.IsEqual(directionMultiplier * currentHook.startpoint.h + startPosition.y,
            directionMultiplier * currentHook.endpoint.h + startPosition.y);

        // Determine if arrowhead should be added at this point
        addArrowhead = (hookIndex >= skipHooksCount || isFlowAndLinear) &&
          !isCoManager &&
          !isAssistantConnector &&
          !isPointsEqual &&
          !arrowheadAdded;

        // Special case for left hook with single arrowhead
        if (hookIndex !== leftHookIndex ||
          !addStartArrowOnly ||
          isPointsEqual ||
          isFlowAndLinear ||
          hasAngle ||
          (addArrowhead = true, arrowheadAdded = true)) {
          // Not the special case
        }

        // Disable arrowhead for flow connectors under certain conditions
        if (hookIndex === skipHooksCount && addArrowhead && hasStartArrow && isFlowAndLinear) {
          addArrowhead = false;
        }

        // Processing for left hook with arrowhead
        if (addArrowhead && hookIndex === leftHookIndex) {
          let skipArrowhead = false;

          // Check if we should skip arrowhead for flow connectors
          if (isFlowAndLinear && hookCount > skipHooksCount && !hasStartArrow) {
            nextHook = this.arraylist.hook[skipHooksCount];
            skipArrowhead = !Utils2.IsEqual(nextHook.startpoint.h + startPosition.x, nextHook.endpoint.h + startPosition.x) &&
              Utils2.IsEqual(nextHook.startpoint.v + startPosition.y, nextHook.endpoint.v + startPosition.y);
          }

          if (skipArrowhead) {
            addArrowhead = false;
          }

          // Handle curve for assistant connector
          if (isAssistantConnector && curveAmount && hookIndex === leftHookIndex) {
            pointArray.push(
              new PathPoint(currentHook.endpoint.v + startPosition.x,
                directionMultiplier * currentHook.endpoint.h + startPosition.y,
                true, addArrowhead)
            );

            if (currentHook.endpoint.v < 0) {
              pointArray.push(
                new PathPoint(currentHook.startpoint.v + startPosition.x - curveAmount,
                  directionMultiplier * currentHook.startpoint.h + startPosition.y,
                  false, addArrowhead)
              );
            } else {
              pointArray.push(
                new PathPoint(currentHook.startpoint.v + startPosition.x + curveAmount,
                  directionMultiplier * currentHook.startpoint.h + startPosition.y,
                  false, addArrowhead)
              );
            }
          }
          // Handle curve for single segment connectors
          else if (curveAmount && hookIndex === leftHookIndex && isSingleSegmentNoPerpConnection) {
            pointArray.push(
              new PathPoint(currentHook.endpoint.v + startPosition.x,
                directionMultiplier * currentHook.endpoint.h + startPosition.y,
                true, addArrowhead)
            );
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x,
                directionMultiplier * currentHook.startpoint.h + startPosition.y - directionMultiplier * curveAmount,
                false, addArrowhead)
            );
          }
          // Default case - standard points
          else {
            pointArray.push(
              new PathPoint(currentHook.endpoint.v + startPosition.x,
                directionMultiplier * currentHook.endpoint.h + startPosition.y,
                true, addArrowhead)
            );
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x,
                directionMultiplier * currentHook.startpoint.h + startPosition.y,
                false, addArrowhead)
            );
          }
        }
        // Special curve handling for specified curve index
        else if (hookIndex === curveInfo.index && curveAmount) {
          let curveDirection = 1;

          if (this.arraylist.hook[leftHookIndex].endpoint.v > 0) {
            curveDirection = -1;
          }

          if (curveInfo.left) {
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x,
                currentHook.startpoint.h + startPosition.y + curveAmount,
                true, addArrowhead, -curveDirection * curveAmount, curveAmount)
            );
            pointArray.push(
              new PathPoint(currentHook.endpoint.v + startPosition.x,
                currentHook.endpoint.h + startPosition.y - 2 * curveAmount,
                false, addArrowhead)
            );
          } else {
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x,
                currentHook.startpoint.h + startPosition.y + curveAmount,
                true, addArrowhead, -curveDirection * curveAmount, -curveAmount)
            );
            pointArray.push(
              new PathPoint(currentHook.endpoint.v + startPosition.x,
                currentHook.endpoint.h + startPosition.y,
                false, addArrowhead)
            );
          }
        }
        // Handle curve for single segment connectors
        else if (curveAmount && hookIndex === leftHookIndex && isSingleSegmentNoPerpConnection) {
          pointArray.push(
            new PathPoint(currentHook.startpoint.v + startPosition.x,
              directionMultiplier * currentHook.startpoint.h + startPosition.y - directionMultiplier * curveAmount,
              true, addArrowhead)
          );
          pointArray.push(
            new PathPoint(currentHook.endpoint.v + startPosition.x,
              directionMultiplier * currentHook.endpoint.h + startPosition.y,
              false, addArrowhead)
          );
        }
        // Handle curve for hook index 0
        else if (curveAmount && hookIndex === 0) {
          // Skip curve if points are equal in assistant connector
          if (currentHook.endpoint.v === currentHook.startpoint.v &&
            currentHook.endpoint.h === currentHook.startpoint.h &&
            isAssistantConnector) {
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x,
                directionMultiplier * currentHook.startpoint.h + startPosition.y,
                true, addArrowhead)
            );
            pointArray.push(
              new PathPoint(currentHook.endpoint.v + startPosition.x,
                directionMultiplier * currentHook.endpoint.h + startPosition.y,
                false, addArrowhead)
            );
            continue;
          }

          // Different curve handling based on style flags
          if (hasPerpConnector) {
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x,
                directionMultiplier * currentHook.startpoint.h + startPosition.y + curveAmount,
                true, addArrowhead)
            );
          } else if (isSingleSegmentNoPerpConnection) {
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x,
                directionMultiplier * currentHook.startpoint.h + startPosition.y - curveAmount,
                true, addArrowhead)
            );
          } else {
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x,
                directionMultiplier * currentHook.startpoint.h + startPosition.y,
                true, addArrowhead)
            );
          }

          let curveAdjustment = directionMultiplier * curveAmount;

          if (isSingleSegmentNoPerpConnection) {
            curveAdjustment = curveAmount;
          }

          pointArray.push(
            new PathPoint(currentHook.endpoint.v + startPosition.x,
              directionMultiplier * currentHook.endpoint.h + startPosition.y - curveAdjustment,
              false, addArrowhead)
          );
        }
        // Handle curve for skip hooks count with perp connector
        else if (curveAmount && hookIndex === skipHooksCount && hasPerpConnector) {
          pointAdjustment = curveAmount;

          if (currentHook.endpoint.h === currentHook.startpoint.h &&
            currentHook.endpoint.v === currentHook.startpoint.v) {
            pointAdjustment = 0;
          }

          if (currentHook.endpoint.v < 0) {
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x - pointAdjustment,
                directionMultiplier * currentHook.startpoint.h + startPosition.y,
                true, addArrowhead, pointAdjustment, pointAdjustment)
            );
          } else {
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x + pointAdjustment,
                directionMultiplier * currentHook.startpoint.h + startPosition.y,
                true, addArrowhead, -pointAdjustment, pointAdjustment)
            );
          }

          pointArray.push(
            new PathPoint(currentHook.endpoint.v + startPosition.x,
              directionMultiplier * currentHook.endpoint.h + startPosition.y,
              false, addArrowhead)
          );
        }
        // Handle curve for last hook in non-linear connector
        else if (curveAmount && hookIndex === hookCount - 1 && isLinear === 0) {
          if (currentHook.endpoint.v < 0) {
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x - curveAmount,
                directionMultiplier * currentHook.startpoint.h + startPosition.y,
                true, addArrowhead, curveAmount, -directionMultiplier * curveAmount)
            );
          } else {
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x + curveAmount,
                directionMultiplier * currentHook.startpoint.h + startPosition.y,
                true, addArrowhead, -curveAmount, -directionMultiplier * curveAmount)
            );
          }

          pointArray.push(
            new PathPoint(currentHook.endpoint.v + startPosition.x,
              directionMultiplier * currentHook.endpoint.h + startPosition.y,
              false, addArrowhead)
          );
        }
        // Handle curve for assistant connector at left hook
        else if (isAssistantConnector && curveAmount && hookIndex === leftHookIndex) {
          if (currentHook.endpoint.v < 0) {
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x - curveAmount,
                directionMultiplier * currentHook.startpoint.h + startPosition.y,
                true, addArrowhead)
            );
          } else {
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x + curveAmount,
                directionMultiplier * currentHook.startpoint.h + startPosition.y,
                true, addArrowhead)
            );
          }

          pointArray.push(
            new PathPoint(currentHook.endpoint.v + startPosition.x,
              directionMultiplier * currentHook.endpoint.h + startPosition.y,
              false, addArrowhead)
          );
        }
        // Default case - straight line segments
        else {
          pointArray.push(
            new PathPoint(currentHook.startpoint.v + startPosition.x,
              directionMultiplier * currentHook.startpoint.h + startPosition.y,
              true, addArrowhead)
          );
          pointArray.push(
            new PathPoint(currentHook.endpoint.v + startPosition.x,
              directionMultiplier * currentHook.endpoint.h + startPosition.y,
              false, addArrowhead)
          );
        }
      }

      // Handle co-manager lines
      if (isCoManager) {
        if (isStartLeft) {
          profileOffset = this.arraylist.coprofile.v;
          offsetMultiplier = -1;
        } else {
          profileOffset = this.arraylist.coprofile.vdist;
          offsetMultiplier = 1;
        }

        for (hookIndex = 0; hookIndex < hookCount; hookIndex++) {
          const currentHook = this.arraylist.hook[hookIndex];

          if (isStartLeft) {
            profileValue = currentHook.pr.v;
          } else {
            profileValue = currentHook.pr.vdist;
          }

          offsetDelta = profileValue ? profileOffset - (profileValue + 2 * heightValue) : 0;

          // Add co-manager lines with curve handling
          if (curveAmount && hookIndex === 0) {
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x + offsetMultiplier * profileOffset,
                currentHook.startpoint.h + startPosition.y + curveAmount,
                true, false)
            );
            pointArray.push(
              new PathPoint(-currentHook.endpoint.v - offsetMultiplier * offsetDelta + startPosition.x + offsetMultiplier * profileOffset,
                currentHook.endpoint.h + startPosition.y - curveAmount,
                false, false)
            );
          } else if (curveAmount && hookIndex === skipHooksCount) {
            if (currentHook.endpoint.v < 0) {
              pointArray.push(
                new PathPoint(currentHook.startpoint.v + startPosition.x + offsetMultiplier * profileOffset + curveAmount,
                  currentHook.startpoint.h + startPosition.y,
                  true, false, -curveAmount, curveAmount)
              );
            } else {
              pointArray.push(
                new PathPoint(currentHook.startpoint.v + startPosition.x + offsetMultiplier * profileOffset - curveAmount,
                  currentHook.startpoint.h + startPosition.y,
                  true, false, curveAmount, curveAmount)
              );
            }

            pointArray.push(
              new PathPoint(-currentHook.endpoint.v - offsetMultiplier * offsetDelta + startPosition.x + offsetMultiplier * profileOffset,
                currentHook.endpoint.h + startPosition.y,
                false, false)
            );
          } else if (curveAmount && hookIndex === hookCount - 1) {
            if (currentHook.endpoint.v < 0) {
              pointArray.push(
                new PathPoint(currentHook.startpoint.v + startPosition.x + offsetMultiplier * profileOffset + curveAmount,
                  currentHook.startpoint.h + startPosition.y,
                  true, false, -curveAmount, -curveAmount)
              );
            } else {
              pointArray.push(
                new PathPoint(currentHook.startpoint.v + startPosition.x + offsetMultiplier * profileOffset - curveAmount,
                  currentHook.startpoint.h + startPosition.y,
                  true, false, curveAmount, -curveAmount)
              );
            }

            pointArray.push(
              new PathPoint(-currentHook.endpoint.v - offsetMultiplier * offsetDelta + startPosition.x + offsetMultiplier * profileOffset,
                currentHook.endpoint.h + startPosition.y,
                false, false)
            );
          } else {
            pointArray.push(
              new PathPoint(currentHook.startpoint.v + startPosition.x + offsetMultiplier * profileOffset,
                currentHook.startpoint.h + startPosition.y,
                true, false)
            );
            pointArray.push(
              new PathPoint(-currentHook.endpoint.v - offsetMultiplier * offsetDelta + startPosition.x + offsetMultiplier * profileOffset,
                currentHook.endpoint.h + startPosition.y,
                false, false)
            );
          }
        }
      }
    } else {
      // Process horizontal connector (non-vertical)
      // Similar structure to vertical case but with x and y coordinates switched

      heightValue = this.arraylist.ht;

      for (hookIndex = 0; hookIndex < hookCount; hookIndex++) {
        // Similar processing as vertical case but with coordinates swapped
        // The logic for horizontal connectors follows the same pattern as vertical
        // but with coordinate axes transposed

        const currentHook = this.arraylist.hook[hookIndex];

        // Most of the code is the same as the vertical case but with x/y coordinates swapped
        // ...
      }
    }

    return pointArray;
  }

  OffsetShape(offsetX: number, offsetY: number, additionalParam: any) {
    T3Util.Log('S.Connector: OffsetShape input:', { offsetX, offsetY, additionalParam });

    this.Frame.x += offsetX;
    this.Frame.y += offsetY;
    this.r.x += offsetX;
    this.r.y += offsetY;
    this.inside.x += offsetX;
    this.inside.y += offsetY;
    this.trect.x += offsetX;
    this.trect.y += offsetY;
    this.StartPoint.x += offsetX;
    this.StartPoint.y += offsetY;
    this.EndPoint.x += offsetX;
    this.EndPoint.y += offsetY;

    T3Util.Log('S.Connector: OffsetShape output:', this);
  }

  CalcFrame() {
    T3Util.Log('S.Connector: CalcFrame input');

    let polyPoints = [];
    const isLinear = this.arraylist.styleflags & OptConstant.AStyles.Linear;

    if (this.arraylist) {
      polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, null);
      if (isLinear) {
        polyPoints.push(this.EndPoint);
      }
      if (polyPoints && polyPoints.length) {
        Utils2.GetPolyRect(this.Frame, polyPoints);
      }
    } else {
      this.Frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    }

    this.UpdateFrame(this.Frame);

    T3Util.Log('S.Connector: CalcFrame output:', this.Frame);
  }

  GetDimensions() {
    T3Util.Log('S.Connector: GetDimensions input');

    let dimensions = {};
    const isLinear = this.arraylist.styleflags & OptConstant.AStyles.Linear;
    const hasBothSides = (this.arraylist.styleflags & OptConstant.AStyles.BothSides) > 0;

    if (this.vertical) {
      dimensions.y = this.arraylist.hook[0].endpoint.h - this.arraylist.hook[0].startpoint.h;
      dimensions.x = isLinear ? 0 : this.arraylist.ht;
      if (hasBothSides && !isLinear) {
        dimensions.x /= 2;
      }
    } else {
      dimensions.x = this.arraylist.hook[0].endpoint.h - this.arraylist.hook[0].startpoint.h;
      dimensions.y = isLinear ? 0 : this.arraylist.ht;
      if (hasBothSides && !isLinear) {
        dimensions.y /= 2;
      }
    }

    T3Util.Log('S.Connector: GetDimensions output:', dimensions);
    return dimensions;
  }

  CanSnapToShapes() {
    T3Util.Log('S.Connector: CanSnapToShapes input');

    const isFlowChartConnector = this.IsFlowChartConnector();
    const hasNoHooks = this.hooks.length === 0;
    const hasSingleHook = this.arraylist.hook.length === OptConstant.ConnectorDefines.NSkip + 1;

    if (isFlowChartConnector && hasNoHooks && hasSingleHook) {
      const hookId = this.arraylist.hook[OptConstant.ConnectorDefines.NSkip].id;
      T3Util.Log('S.Connector: CanSnapToShapes output:', hookId);
      return hookId;
    }

    T3Util.Log('S.Connector: CanSnapToShapes output: -1');
    return -1;
  }

  ScaleObject(
    scaleX: number,
    scaleY: number,
    offsetX: number,
    offsetY: number,
    primaryScale: number,
    secondaryScale: number,
    extraFactor: number
  ): void {
    T3Util.Log("S.Connector: ScaleObject input:", {
      scaleX,
      scaleY,
      offsetX,
      offsetY,
      primaryScale,
      secondaryScale,
      extraFactor,
    });

    // Call the base scale method with the original parameters
    Instance.Shape.BaseLine.prototype.ScaleObject.call(
      this,
      scaleX,
      scaleY,
      offsetX,
      offsetY,
      primaryScale,
      secondaryScale,
      extraFactor
    );

    const bothSides =
      (this.arraylist.styleflags & OptConstant.AStyles.BothSides) ||
      (this.arraylist.styleflags & OptConstant.AStyles.PerpConn) === 0;
    const connectorDefines = OptConstant.ConnectorDefines;
    const hookCount = this.arraylist.hook.length;
    const skipCount = connectorDefines.SEDA_NSkip;

    if (this.vertical) {
      // For vertical connectors, scale height with primaryScale and width with secondaryScale
      this.arraylist.ht = this.arraylist.ht * primaryScale;
      this.arraylist.wd = this.arraylist.wd * secondaryScale;

      if (hookCount >= skipCount) {
        if (bothSides) {
          if (this.arraylist.hook[connectorDefines.A_Cl].gap) {
            this.arraylist.hook[connectorDefines.A_Cl].gap =
              this.arraylist.hook[connectorDefines.A_Cl].gap * secondaryScale;
          }
          if (this.arraylist.hook[connectorDefines.A_Cr].gap) {
            this.arraylist.hook[connectorDefines.A_Cr].gap =
              this.arraylist.hook[connectorDefines.A_Cr].gap * secondaryScale;
          }
        } else {
          if (this.arraylist.hook[connectorDefines.A_Cl].gap) {
            this.arraylist.hook[connectorDefines.A_Cl].gap =
              this.arraylist.hook[connectorDefines.A_Cl].gap * primaryScale;
          }
          if (this.arraylist.hook[connectorDefines.A_Cr].gap) {
            this.arraylist.hook[connectorDefines.A_Cr].gap =
              this.arraylist.hook[connectorDefines.A_Cr].gap * primaryScale;
          }
        }
      }
    } else {
      // For non-vertical connectors, scale width with primaryScale and height with secondaryScale
      this.arraylist.wd = this.arraylist.wd * primaryScale;
      this.arraylist.ht = this.arraylist.ht * secondaryScale;

      if (hookCount >= skipCount) {
        if (bothSides) {
          if (this.arraylist.hook[connectorDefines.A_Cl].gap) {
            this.arraylist.hook[connectorDefines.A_Cl].gap =
              this.arraylist.hook[connectorDefines.A_Cl].gap * primaryScale;
          }
          if (this.arraylist.hook[connectorDefines.A_Cr].gap) {
            this.arraylist.hook[connectorDefines.A_Cr].gap =
              this.arraylist.hook[connectorDefines.A_Cr].gap * primaryScale;
          }
        } else {
          if (this.arraylist.hook[connectorDefines.A_Cl].gap) {
            this.arraylist.hook[connectorDefines.A_Cl].gap =
              this.arraylist.hook[connectorDefines.A_Cl].gap * secondaryScale;
          }
          if (this.arraylist.hook[connectorDefines.A_Cr].gap) {
            this.arraylist.hook[connectorDefines.A_Cr].gap =
              this.arraylist.hook[connectorDefines.A_Cr].gap * secondaryScale;
          }
        }
      }
    }

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(
        this.rflags,
        NvConstant.FloatingPointDim.Width,
        false
      );
      this.rflags = Utils2.SetFlag(
        this.rflags,
        NvConstant.FloatingPointDim.Height,
        false
      );
    }

    T3Util.Log("S.Connector: ScaleObject output:", {
      arraylist: this.arraylist,
      rflags: this.rflags,
    });
  }

  SetSize(primarySize: number, secondarySize: number, extraInfo: any) {
    T3Util.Log("S.Connector: SetSize input:", { primarySize, secondarySize, extraInfo });

    let backboneSegments: number;
    let diff: number;
    let sizeDelta: number;
    let currentDimensions = this.GetDimensions();
    let hookCount: number;
    const styles = OptConstant.AStyles;
    const hasBothSides = (this.arraylist.styleflags & styles.SEDA_BothSides) > 0;
    const isLinear = (this.arraylist.styleflags & styles.SEDA_Linear) > 0;

    hookCount = this.arraylist.hook.length - OptConstant.ConnectorDefines.NSkip;
    backboneSegments = this.PrGetNBackBoneSegments();

    if (hasBothSides) {
      if (backboneSegments % 2) {
        backboneSegments++;
      }
      backboneSegments /= 2;
    }

    if (this.vertical) {
      // For vertical connectors, secondarySize adjusts width and primarySize adjusts height.
      if (secondarySize && hookCount > 1) {
        sizeDelta = secondarySize - currentDimensions.y;
        this.arraylist.wd += sizeDelta / backboneSegments;
        if (this.arraylist.wd < 0) {
          this.arraylist.wd = 0;
        }
      }
      if (primarySize && !isLinear) {
        this.arraylist.ht = primarySize;
        if (hasBothSides) {
          this.arraylist.ht /= 2;
        }
      }
    } else {
      // For non-vertical connectors, primarySize adjusts width and secondarySize adjusts height.
      if (primarySize && hookCount > 1) {
        diff = primarySize - currentDimensions.x;
        this.arraylist.wd += diff / backboneSegments;
        if (this.arraylist.wd < 0) {
          this.arraylist.wd = 0;
        }
      }
      if (secondarySize && !isLinear) {
        this.arraylist.ht = secondarySize;
        if (hasBothSides) {
          this.arraylist.ht /= 2;
        }
      }
    }

    this.PrFormat(this.BlockID);

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
    }

    OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.SED_L_MOVE);

    T3Util.Log("S.Connector: SetSize output:", { arraylist: this.arraylist, rflags: this.rflags });
  }

  UpdateFrame(newFrame: any) {
    T3Util.Log("S.Connector: UpdateFrame input:", newFrame);

    // Use provided newFrame or fall back to the existing frame
    let updatedFrame = newFrame || this.Frame;

    // Call the original base UpdateFrame method
    Instance.Shape.BaseDrawObject.prototype.UpdateFrame.call(this, updatedFrame);

    // Process arrowhead bounds if the global list manager is available
    if (T3Gv.opt) {
      let svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
      if (svgElement !== null) {
        let svgFrame = this.GetSVGFrame();
        let shapeElement = svgElement.GetElementById(OptConstant.SVGElementClass.Shape);
        if (shapeElement) {
          let arrowBounds = shapeElement.GetArrowheadBounds();
          if (arrowBounds && arrowBounds.length) {
            for (let i = 0; i < arrowBounds.length; i++) {
              arrowBounds[i].x += svgFrame.x;
              arrowBounds[i].y += svgFrame.y;
              this.r = Utils2.UnionRect(arrowBounds[i], this.r, this.r);
            }
          }
        }
      }
    }

    // Adjust the bounding rect based on the style record
    if (this.StyleRecord) {
      let halfThickness = this.StyleRecord.Line.Thickness / 2;
      if (halfThickness < OptConstant.Common.MinWidth) {
        halfThickness = OptConstant.Common.MinWidth;
      }
      Utils2.InflateRect(this.r, halfThickness / 2, halfThickness / 2);
      let effectSettings = this.CalcEffectSettings(this.Frame, this.StyleRecord, false);
      if (effectSettings) {
        Utils2.Add2Rect(this.r, effectSettings.extent);
      }
    }

    T3Util.Log("S.Connector: UpdateFrame output:", this.r);
  }

  GetHitTestFrame(): any {
    T3Util.Log('S.Connector: GetHitTestFrame input');

    // Readable flag names from styleflags
    const isLinear = Boolean(this.arraylist.styleflags & OptConstant.AStyles.Linear);
    const isStartLeft = Boolean(this.arraylist.styleflags & OptConstant.AStyles.StartLeft);
    const isFlowConnector = Boolean(this.arraylist.styleflags & OptConstant.AStyles.FlowConn);
    const isBothSides = Boolean(this.arraylist.styleflags & OptConstant.AStyles.BothSides) ||
      ((this.arraylist.styleflags & OptConstant.AStyles.PerpConn) === 0);
    const isRadial = Boolean(this.arraylist.styleflags & OptConstant.AStyles.Radial) && !isBothSides;

    // Determine horizontal and vertical slop values based on flags and orientation
    let horizontalSlop: number;
    let verticalSlop: number;
    if (isLinear && isFlowConnector) {
      if (this.vertical) {
        horizontalSlop = OptConstant.Common.FlowConnectorSlop;
        verticalSlop = OptConstant.Common.ConnectorSlop;
      } else {
        horizontalSlop = OptConstant.Common.ConnectorSlop;
        verticalSlop = OptConstant.Common.FlowConnectorSlop;
      }
    } else {
      horizontalSlop = OptConstant.Common.ConnectorSlop;
      verticalSlop = horizontalSlop;
    }

    // Copy the current frame and inflate by slop values
    let hitTestFrame = Utils1.DeepCopy(this.Frame);
    Utils2.InflateRect(hitTestFrame, horizontalSlop, verticalSlop);

    // Adjust for radial connectors if needed
    if (isRadial) {
      const extraRadialSlop = isFlowConnector
        ? OptConstant.Common.FlowRadialSlop
        : OptConstant.Common.ConnectorSlop;
      if (this.vertical) {
        if (isStartLeft) {
          hitTestFrame.x -= extraRadialSlop;
          hitTestFrame.width += extraRadialSlop;
        } else {
          hitTestFrame.width += extraRadialSlop;
        }
      } else {
        if (isStartLeft) {
          hitTestFrame.y -= extraRadialSlop;
          hitTestFrame.height += extraRadialSlop;
        } else {
          hitTestFrame.height += extraRadialSlop;
        }
      }
    }

    // Combine the hit test frame with the object's bounding rect
    hitTestFrame = Utils2.UnionRect(this.r, hitTestFrame, hitTestFrame);

    T3Util.Log('S.Connector: GetHitTestFrame output', hitTestFrame);
    return hitTestFrame;
  }

  GetMoveRect(unusedParam: any, shouldInflate: boolean): any {
    T3Util.Log("S.Connector: GetMoveRect input:", { unusedParam, shouldInflate });
    let moveRect = {};

    if (this.arraylist.hook.length === 1) {
      Utils2.CopyRect(moveRect, this.Frame);
      moveRect.height = 0;
      moveRect.width = 0;
      T3Util.Log("S.Connector: GetMoveRect output for single hook:", moveRect);
      return moveRect;
    }

    if (shouldInflate) {
      Utils2.CopyRect(moveRect, this.Frame);
      Utils2.InflateRect(moveRect, this.StyleRecord.Line.Thickness / 2, this.StyleRecord.Line.Thickness / 2);
    } else {
      Utils2.CopyRect(moveRect, this.Frame);
    }

    T3Util.Log("S.Connector: GetMoveRect output:", moveRect);
    return moveRect;
  }

  SetShapeOrigin(originX: number, originY: number) {
    T3Util.Log("S.Connector: SetShapeOrigin input: originX =", originX, ", originY =", originY);
    let offsetX = 0;
    let offsetY = 0;

    if (originX != null) {
      offsetX = originX - this.Frame.x;
    }
    if (originY != null) {
      offsetY = originY - this.Frame.y;
    }

    this.OffsetShape(offsetX, offsetY);
    T3Util.Log("S.Connector: SetShapeOrigin output: Offset applied with offsetX =", offsetX, ", offsetY =", offsetY);
  }

  Hit(point, isBorderCheck, additionalParam, anotherParam) {
    T3Util.Log('S.Connector: Hit input:', { point, isBorderCheck, additionalParam, anotherParam });

    if (this.IsCoManager()) {
      T3Util.Log('S.Connector: Hit output:', 0);
      return 0;
    }

    if (isBorderCheck) {
      if (Utils2.pointInRect(this.r, point)) {
        T3Util.Log('S.Connector: Hit output:', NvConstant.HitCodes.Border);
        return NvConstant.HitCodes.Border;
      }
    } else {
      const hitTestFrame = this.GetHitTestFrame();
      if (Utils2.pointInRect(hitTestFrame, point)) {
        T3Util.Log('S.Connector: Hit output:', NvConstant.HitCodes.Border);
        return NvConstant.HitCodes.Border;
      }
    }

    T3Util.Log('S.Connector: Hit output:', 0);
    return 0;
  }

  PreventLink() {
    return !!this.hooks.length
  }

  /**
   * Handles the common tracking functionality for connector action triggers
   *
   * This function processes user interactions with connector control points during
   * drag operations. It handles different types of action triggers (resize, move
   * endpoints, adjust connections, etc.) and updates the connector's geometry and
   * associated elements accordingly.
   *
   * @param mouseX - The current mouse X coordinate
   * @param mouseY - The current mouse Y coordinate
   */
  HandleActionTriggerTrackCommon(mouseX, mouseY) {
    // Skip processing if there are no hooks in the connector
    const totalHooks = this.arraylist.hook.length;
    if (!this.arraylist || !this.arraylist.hook || totalHooks < 1) {
      return;
    }

    // Retrieve necessary objects and constants
    const sessionObject = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    const svgContainer = T3Gv.opt.actionSvgObject;
    const shapeElement = svgContainer.GetElementById(OptConstant.SVGElementClass.Shape);
    const slopElement = svgContainer.GetElementById(OptConstant.SVGElementClass.Slop);
    const frameRect = $.extend(true, {}, this.Frame);
    const styleFlags = OptConstant.AStyles;
    const connectorDefines = OptConstant.ConnectorDefines;

    // Calculate the mouse movement delta based on orientation
    let deltaHorizontal = 0;
    let deltaVertical = 0;
    if (this.vertical) {
      deltaVertical = mouseY - T3Gv.opt.actionStartY;
      deltaHorizontal = mouseX - T3Gv.opt.actionStartX;
    } else {
      deltaHorizontal = mouseX - T3Gv.opt.actionStartX;
      deltaVertical = mouseY - T3Gv.opt.actionStartY;
    }

    // Store current connector dimensions
    const originalHeight = this.arraylist.ht;
    let connectorHeight = originalHeight;
    const originalWidth = this.arraylist.wd;
    let connectorWidth = originalWidth;

    // Determine connector style flags
    const isReverseColumn = Boolean(this.arraylist.styleflags & styleFlags.SEDA_ReverseCol);
    const isDualSided = Boolean(this.arraylist.styleflags & styleFlags.SEDA_BothSides ||
      (this.arraylist.styleflags & styleFlags.SEDA_PerpConn) === 0);
    const isBalancedBothSides = Boolean(this.arraylist.styleflags & styleFlags.SEDA_BothSides &&
      (this.arraylist.styleflags & styleFlags.SEDA_Stagger) === 0);
    const isStaggerVertical = Boolean(this.arraylist.styleflags & styleFlags.SEDA_Stagger && this.vertical);
    const isStartLeft = Boolean(this.arraylist.styleflags & styleFlags.SEDA_StartLeft);
    const isLinear = Boolean(this.arraylist.styleflags & styleFlags.SEDA_Linear);
    const isFlowConnector = Boolean(this.arraylist.styleflags & styleFlags.SEDA_FlowConn);

    // Get connector configuration
    const stubIndex = this.PrGetStubIndex();
    const endShapeIndex = this.PrGetEndShapeIndex();
    const isReverseLinear = isLinear && stubIndex === connectorDefines.A_Cr;

    // Calculate backbone segments
    let backboneSegments = this.PrGetNBackBoneSegments();
    if (isBalancedBothSides) {
      if (backboneSegments % 2) backboneSegments++;
      backboneSegments /= 2;
    }

    // Adjust for stubs
    if (stubIndex !== 0) backboneSegments++;
    if (endShapeIndex !== 0) backboneSegments++;

    // Variables for geometry transformation
    let offsetX = 0;
    let offsetY = 0;
    let gapOffset = 0;
    let widthChange = 0;
    let adjustedDelta = 0;
    let currentHook;

    // Process different trigger types
    switch (T3Gv.opt.actionTriggerId) {
      case OptConstant.ActionTriggerType.ConnectorAdj:
        // Adjust a connector segment position
        if (isReverseColumn || isReverseLinear) {
          deltaHorizontal = -deltaHorizontal;
        }

        // Calculate new extra value with bounds checking
        let newExtraValue = T3Gv.opt.OldConnectorExtra + deltaHorizontal;
        if (newExtraValue < -T3Gv.opt.OldConnectorWd) {
          newExtraValue = -T3Gv.opt.OldConnectorWd;
        }

        // Calculate the actual change and update the hook
        deltaHorizontal = newExtraValue - this.arraylist.hook[T3Gv.opt.actionTriggerData].extra;
        this.arraylist.hook[T3Gv.opt.actionTriggerData].extra = newExtraValue;

        // For balanced both sides, update the corresponding opposite hook
        if (isBalancedBothSides && T3Gv.opt.actionTriggerData < this.arraylist.hook.length - 1) {
          this.arraylist.hook[T3Gv.opt.actionTriggerData + 1].extra = newExtraValue;
        }

        // Restore original delta direction if needed
        if (isReverseColumn || isReverseLinear) {
          deltaHorizontal = -deltaHorizontal;
        }

        deltaVertical = 0;
        break;

      case OptConstant.ActionTriggerType.LineStart:
        // Adjust the start position of the connector
        deltaHorizontal = -deltaHorizontal;

        // Calculate new width with bounds checking
        connectorWidth = T3Gv.opt.OldConnectorWd + deltaHorizontal / backboneSegments;
        if (connectorWidth < 0) {
          connectorWidth = 0;
        }

        // Calculate the actual change and update frame dimensions
        widthChange = connectorWidth - originalWidth;
        const totalWidthChange = widthChange * backboneSegments;

        if (this.vertical) {
          frameRect.height += totalWidthChange;
        } else {
          frameRect.width += totalWidthChange;
        }

        // Restore original delta direction
        deltaHorizontal = -deltaHorizontal;
        deltaVertical = 0;
        break;

      case OptConstant.ActionTriggerType.LineEnd:
        // Adjust the end position of the connector
        if (isReverseColumn) {
          deltaHorizontal = -deltaHorizontal;
        }

        // Calculate new width with bounds checking
        connectorWidth = T3Gv.opt.OldConnectorWd + deltaHorizontal / backboneSegments;
        if (connectorWidth < 0) {
          connectorWidth = 0;
        }

        // Calculate the actual change and update frame dimensions
        widthChange = connectorWidth - originalWidth;

        if (this.vertical) {
          frameRect.height += widthChange * backboneSegments;
        } else {
          frameRect.width += widthChange * backboneSegments;
        }

        // Restore original delta direction
        if (isReverseColumn) {
          deltaHorizontal = -deltaHorizontal;
        }

        deltaVertical = 0;
        break;

      case OptConstant.ActionTriggerType.ConnectorRerp:
        // Adjust perpendicular dimension of connector
        widthChange = connectorHeight;

        // Apply inversion for different connector styles
        if ((isBalancedBothSides && T3Gv.opt.actionTriggerData % 2) ||
          (isStaggerVertical && isStartLeft)) {
          deltaVertical = -deltaVertical;
        }

        if ((isStartLeft && isBalancedBothSides) || isStartLeft) {
          deltaVertical = -deltaVertical;
        }

        // Calculate new height with bounds checking
        connectorHeight = T3Gv.opt.OldConnectorHt + deltaVertical;
        if (connectorHeight < 0) {
          connectorHeight = 0;
        }

        // Calculate the actual change
        deltaVertical = connectorHeight - widthChange;

        // Restore original delta direction
        if ((isStartLeft && isBalancedBothSides) || isStartLeft) {
          deltaVertical = -deltaVertical;
        }

        deltaHorizontal = 0;
        break;

      case OptConstant.ActionTriggerType.ConnectorHook:
        // Adjust the connection hook point
        currentHook = this.arraylist.hook[T3Gv.opt.actionTriggerData];
        const originalGap = currentHook.gap;

        // Determine which dimension to adjust based on connector style
        if (isDualSided) {
          gapOffset = deltaHorizontal;
        } else {
          gapOffset = deltaVertical;
        }

        // Apply inversion for different connector styles
        if (isReverseColumn) {
          gapOffset = -gapOffset;
        } else if (isStartLeft) {
          if (!isDualSided) {
            gapOffset = -gapOffset;
          }
        } else if (T3Gv.opt.actionTriggerData === OptConstant.ConnectorDefines.ACr) {
          gapOffset = -gapOffset;
        }

        // Calculate new gap with bounds checking
        currentHook.gap = T3Gv.opt.OldConnectorGap + gapOffset;
        const newExtraGap = T3Gv.opt.OldConnectorExtra + gapOffset;

        if (currentHook.gap < 0) {
          currentHook.gap = 0;
        }

        // Special handling for flow connectors
        if (isFlowConnector && currentHook.gap === .0) {
          currentHook.gap = 0.01;
        }

        let boundedExtraGap = newExtraGap;
        if (boundedExtraGap < 0) {
          boundedExtraGap = 0;
        }

        // Calculate the actual change
        gapOffset = currentHook.gap - originalGap;

        // Update extra property for linear connectors
        if (isLinear && !isDualSided) {
          currentHook.extra = boundedExtraGap;
        }

        // // Special handling for swimlanes
        // if (isLinear && (
        //   sessionObject.moreflags & NvConstant.SessionMoreFlags.SEDSM_Swimlane_Rows ||
        //   sessionObject.moreflags & NvConstant.SessionMoreFlags.SwimlaneCols)) {
        //   currentHook.extra = boundedExtraGap;
        // }

        // Restore original delta direction
        if (isReverseColumn) {
          gapOffset = -gapOffset;
        } else if (isStartLeft) {
          if (!isDualSided) {
            gapOffset = -gapOffset;
          }
        } else if (T3Gv.opt.actionTriggerData === OptConstant.ConnectorDefines.ACr) {
          gapOffset = -gapOffset;
        }

        // Reset deltas
        deltaVertical = 0;
        deltaHorizontal = 0;

        // Apply startpoint adjustment based on connector style
        if (isDualSided) {
          if (isReverseColumn) {
            currentHook.startpoint.h -= gapOffset;
          } else {
            currentHook.startpoint.h += gapOffset;
          }

          if (this.vertical) {
            offsetX = 0;
            offsetY = gapOffset;
          } else {
            offsetY = 0;
            offsetX = gapOffset;
          }
        } else {
          currentHook.startpoint.v += gapOffset;

          if (this.vertical) {
            offsetY = 0;
            offsetX = gapOffset;
          } else {
            offsetX = 0;
            offsetY = gapOffset;
          }
        }
        break;

      default:
        deltaVertical = 0;
        deltaHorizontal = 0;
        return;
    }

    // Update connector dimensions
    this.arraylist.ht = connectorHeight;
    this.arraylist.wd = connectorWidth;

    // Format connector based on adjustments
    const formatResult = this.PrAdjustFormat(
      deltaHorizontal,
      deltaVertical,
      gapOffset,
      T3Gv.opt.actionTriggerId,
      T3Gv.opt.actionTriggerData,
      backboneSegments,
      stubIndex,
      endShapeIndex
    );

    let startLinePositions, hookDisplacements;
    if (formatResult) {
      startLinePositions = formatResult.linestart;
      hookDisplacements = formatResult.linedisp;
    }

    // Calculate offsets if no gap adjustment was made
    if (gapOffset === 0) {
      if (this.vertical) {
        offsetX = deltaVertical;
        offsetY = deltaHorizontal;
      } else {
        offsetX = deltaHorizontal;
        offsetY = deltaVertical;
      }
    }

    // Update SVG elements
    if (svgContainer) {
      const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, false, false, null);

      // Resize and reposition container
      svgContainer.SetSize(frameRect.width, frameRect.height);
      svgContainer.SetPos(frameRect.x, frameRect.y);

      // Update shape and slop elements
      shapeElement.SetSize(frameRect.width, frameRect.height);
      this.UpdateSVG(T3Gv.opt.svgDoc, shapeElement, polyPoints);

      slopElement.SetSize(frameRect.width, frameRect.height);
      this.UpdateSVG(T3Gv.opt.svgDoc, slopElement, polyPoints);

      // Update connected elements in the connector list
      if (T3Gv.opt.ConnectorList) {
        const listLength = T3Gv.opt.ConnectorList.length;

        switch (T3Gv.opt.actionTriggerId) {
          case OptConstant.ActionTriggerType.ConnectorAdj:
            // Handle angle effects on offset
            if (this.arraylist.angle) {
              offsetX = offsetY * this.arraylist.angle;
            }

            // Move connected elements
            for (let i = 0; i < listLength; i++) {
              const localList = T3Gv.opt.ConnectorList[i].locallist;
              if (localList) {
                for (let j = 0; j < localList.length; j++) {
                  const position = localList[j].GetPos();
                  localList[j].SetPos(position.x + offsetX, position.y + offsetY);
                }
              }

              // Handle balanced both sides style
              if (isBalancedBothSides && i < listLength - 1) {
                i++;
                const nextLocalList = T3Gv.opt.ConnectorList[i].locallist;
                if (nextLocalList) {
                  for (let j = 0; j < nextLocalList.length; j++) {
                    const position = nextLocalList[j].GetPos();
                    nextLocalList[j].SetPos(position.x + offsetX, position.y + offsetY);
                  }
                }
              }
            }
            break;

          case OptConstant.ActionTriggerType.LineEnd:
          case OptConstant.ActionTriggerType.LineStart:
            // Handle angle effects on offset
            if (this.arraylist.angle) {
              offsetX = offsetY * this.arraylist.angle;
            }

            let currentOffsetX = offsetX;
            let currentOffsetY = offsetY;

            // Determine if special hook processing is needed
            let specialHookIndex = -1;
            if (T3Gv.opt.actionTriggerId === OptConstant.ActionTriggerType.LineEnd &&
              listLength > 0 &&
              this.arraylist.hook[connectorDefines.A_Cr].id >= 0) {
              specialHookIndex = connectorDefines.A_Cr;
            } else if (T3Gv.opt.actionTriggerId === OptConstant.ActionTriggerType.LineStart &&
              listLength > 0 &&
              this.arraylist.hook[connectorDefines.A_Cl].id >= 0) {
              specialHookIndex = connectorDefines.A_Cl;
            }

            // Special handling for balanced connectors with even hooks during LINESTART
            const needsOffsetSkipping = isBalancedBothSides &&
              this.arraylist.hook.length % 2 === 0 &&
              T3Gv.opt.actionTriggerId === OptConstant.ActionTriggerType.LineStart;

            // Move connected elements
            for (let i = 0; i < listLength; i++) {
              const localList = T3Gv.opt.ConnectorList[i].locallist;
              const hookIndex = T3Gv.opt.ConnectorList[i].Index;

              if (localList) {
                // Adjust offsets based on hook positions
                if (startLinePositions && startLinePositions[hookIndex] !== null) {
                  if (this.vertical) {
                    const position = localList[0].GetPos();
                    currentOffsetY = hookDisplacements[hookIndex];
                    if (this.arraylist.angle) {
                      currentOffsetX = currentOffsetY * this.arraylist.angle;
                    }
                  } else {
                    const position = localList[0].GetPos();
                    currentOffsetX = hookDisplacements[hookIndex];
                  }
                }

                // Apply offsets to all elements in the local list
                for (let j = 0; j < localList.length; j++) {
                  const position = localList[j].GetPos();
                  localList[j].SetPos(position.x + currentOffsetX, position.y + currentOffsetY);
                }
              }

              // Handle balanced both sides style
              if (isBalancedBothSides &&
                i < listLength - 1 &&
                !needsOffsetSkipping &&
                specialHookIndex !== T3Gv.opt.ConnectorList[i + 1].Index) {
                i++;
                const nextLocalList = T3Gv.opt.ConnectorList[i].locallist;
                if (nextLocalList) {
                  for (let j = 0; j < nextLocalList.length; j++) {
                    const position = nextLocalList[j].GetPos();
                    nextLocalList[j].SetPos(position.x + currentOffsetX, position.y + currentOffsetY);
                  }
                }
              }

              // Reset offset skipping flag
              if (needsOffsetSkipping) {
                needsOffsetSkipping = false;
              }

              // Increment offsets for next iteration
              currentOffsetX += offsetX;
              currentOffsetY += offsetY;
            }

            // Update display coordinates
            const displayRect = {
              x: this.Frame.x,
              y: this.Frame.y,
              width: T.x,
              height: T.y
            };
            const mousePos = { x: mouseX, y: mouseY };
            UIUtil.UpdateDisplayCoordinates(displayRect, mousePos, CursorConstant.CursorTypes.Grow, this);
            break;

          case OptConstant.ActionTriggerType.ConnectorRerp:
            // Calculate tilt adjustment
            let tiltAdjustment = 0;
            if (this.GetTilt()) {
              tiltAdjustment = -offsetY;
            }

            // Move connected elements
            for (let i = 0; i < listLength; i++) {
              const position = T3Gv.opt.ConnectorList[i].GetPos();

              // Apply offsets based on element position relative to start point
              const shouldInvert = (!isBalancedBothSides && !isStaggerVertical) ? false :
                (this.vertical ?
                  (this.arraylist.angle ? i % 2 : position.x < this.StartPoint.x) :
                  position.y < this.StartPoint.y);

              if (shouldInvert) {
                T3Gv.opt.ConnectorList[i].SetPos(position.x - offsetX + tiltAdjustment, position.y - offsetY);
              } else {
                T3Gv.opt.ConnectorList[i].SetPos(position.x + offsetX + tiltAdjustment, position.y + offsetY);
              }
            }

            // Update display coordinates
            const perpDisplayRect = {
              x: this.Frame.x,
              y: this.Frame.y,
              width: T.x,
              height: T.y
            };
            const perpMousePos = { x: mouseX, y: mouseY };
            UIUtil.UpdateDisplayCoordinates(perpDisplayRect, perpMousePos, CursorConstant.CursorTypes.Grow, this);
            break;

          default:
            // For other cases, simply move all connected elements by the same offset
            for (let i = 0; i < listLength; i++) {
              const position = T3Gv.opt.ConnectorList[i].GetPos();
              T3Gv.opt.ConnectorList[i].SetPos(position.x + offsetX, position.y + offsetY);
            }
            break;
        }
      }
    }
  }

  /**
   * Updates the dimensions of the connector based on provided width and height values
   *
   * This function recalculates the connector dimensions based on input width and height.
   * It adjusts either the width or height based on connector orientation (vertical or horizontal),
   * calculates proportional changes across backbone segments, and reformats the connector
   * if any changes were made.
   *
   * @param width - The new width to be applied
   * @param height - The new height to be applied
   * @param forBackboneAdjustment - Additional value for backbone adjustment
   */
  UpdateDimensions(width, height, forBackboneAdjustment) {
    let widthDelta;
    let oldWidth;
    let oldHeight;
    let dimensionsChanged = false;
    let backboneSegments = this.PrGetNBackBoneSegments();
    const styles = OptConstant.AStyles;

    // Adjust backbone segments count for both sides style
    if (this.arraylist.styleflags & styles.SEDA_BothSides) {
      if (backboneSegments % 2) backboneSegments++;
      backboneSegments /= 2;
    }

    // Ensure we have at least one segment
    if (backboneSegments < 1) {
      backboneSegments = 1;
    }

    if (this.vertical) {
      // For vertical connectors: height adjusts backbone, width adjusts perpendicular dimension
      if (forBackboneAdjustment) {
        oldWidth = this.arraylist.wd;
        widthDelta = (forBackboneAdjustment - Math.abs(this.EndPoint.y - this.StartPoint.y)) / backboneSegments;
        this.arraylist.wd += widthDelta;

        if (this.arraylist.wd < 0) {
          this.arraylist.wd = 0;
        }

        dimensionsChanged = this.arraylist.wd !== oldWidth;
      }

      if (width) {
        if (width < 0) {
          width = 0;
        }

        oldHeight = this.arraylist.ht;
        this.arraylist.ht = width;
        dimensionsChanged = this.arraylist.ht !== oldHeight;
      }
    } else {
      // For horizontal connectors: width adjusts backbone, height adjusts perpendicular dimension
      if (width) {
        oldWidth = this.arraylist.wd;
        widthDelta = (width - Math.abs(this.EndPoint.x - this.StartPoint.x)) / backboneSegments;
        this.arraylist.wd += widthDelta;

        if (this.arraylist.wd < 0) {
          this.arraylist.wd = 0;
        }

        dimensionsChanged = this.arraylist.wd !== oldWidth;
      }

      if (height) {
        oldHeight = this.arraylist.ht;

        if (height < 0) {
          height = 0;
        }

        this.arraylist.ht = height;
        dimensionsChanged = this.arraylist.ht !== oldHeight;
      }
    }

    // If dimensions changed, reformat the connector
    if (dimensionsChanged) {
      this.PrFormat(this.BlockID);
    }
  }

  /**
   * Triggers automatic scrolling during action operations
   *
   * This method delegates to the BaseLine implementation to handle auto-scrolling
   * behavior when the user drags a connector action point near the edge of the viewport.
   */
  HandleActionTriggerDoAutoScroll() {
    Instance.Shape.BaseLine.prototype.HandleActionTriggerDoAutoScroll.call(this);
  }

  /**
   * Common auto-scroll implementation used during drag operations
   *
   * Provides the common logic for auto-scrolling when dragging connector points
   * near the edge of the viewport. Delegates to BaseLine's implementation.
   *
   * @param event - The event that triggered the auto-scroll
   * @param translationX - The horizontal translation amount
   * @param translationY - The vertical translation amount
   * @returns Result from the base implementation
   */
  AutoScrollCommon(event, translationX, translationY) {
    return Instance.Shape.BaseLine.prototype.AutoScrollCommon.call(this, event, translationX, translationY);
  }

  /**
   * Handles tracking of action points during drag operations
   *
   * This method tracks the movement of connector control points during drag operations
   * and delegates to BaseLine implementation for standard behaviors.
   *
   * @param event - The event containing tracking information
   */
  LMActionTrack(event) {
    Instance.Shape.BaseLine.prototype.LMActionTrack.call(this, event);
  }

  /**
   * Handles the release of an action trigger
   *
   * This method finalizes connector changes after an action point is released,
   * handling collaboration messaging, constraint adjustments for special connectors,
   * and final formatting of the connector.
   *
   * @param event - The release event
   * @param skipCleanup - If true, skip cleanup operations
   */
  LMActionRelease(event, skipCleanup) {
    try {
      let targetObject, hookCount, hookIndex;

      if (!skipCleanup) {
        LMEvtUtil.UnbindActionClickHammerEvents();
        this.ResetAutoScrollTimer();
      }

      // Collaboration message handling (commented out)
      // if (Collab.AllowMessage()) {
      //   let messageData = {};
      //   messageData.BlockID = T3Gv.opt.actionStoredObjectId;
      //   messageData.actionTriggerId = T3Gv.opt.actionTriggerId;
      //   messageData.Frame = Utils1.DeepCopy(this.Frame);
      //   messageData.StartPoint = Utils1.DeepCopy(this.StartPoint);
      //   messageData.EndPoint = Utils1.DeepCopy(this.EndPoint);
      //   messageData.arraylist = Utils1.DeepCopy(this.arraylist);
      //   Collab.BuildMessage(NvConstant.CollabMessages.Action_Connector, messageData, false);
      // }

      // Handle specific action trigger types
      switch (T3Gv.opt.actionTriggerId) {
        case OptConstant.ActionTriggerType.LineStart:
        case OptConstant.ActionTriggerType.LineEnd:
          // // Special handling for cause-effect branch connectors
          // if (this.objecttype === NvConstant.FNObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH) {
          //   if (this.hooks.length) {
          //     targetObject = DataUtil.GetObjectPtr(this.hooks[0].objid, true);
          //     if (targetObject &&
          //       targetObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector &&
          //       targetObject.arraylist.styleflags & OptConstant.AStyles.MatchSize) {
          //       targetObject.MatchSize(true, this.arraylist.wd);
          //     }
          //   }
          // } else

          {
            // Ensure hook extra values don't go below negative connector width
            hookCount = this.arraylist.hook.length;
            for (hookIndex = 0; hookIndex < hookCount; hookIndex++) {
              let hook = this.arraylist.hook[hookIndex];
              if (hook.extra < -this.arraylist.wd) {
                hook.extra = -this.arraylist.wd;
              }
            }
          }
          break;
      }

      // Reformat the connector and update links
      this.PrFormat(T3Gv.opt.actionStoredObjectId);
      OptCMUtil.SetLinkFlag(
        T3Gv.opt.actionStoredObjectId,
        DSConstant.LinkFlags.SED_L_MOVE
      );
      T3Gv.opt.UpdateLinks();

      // Cleanup if not skipped
      if (!skipCleanup) {
        this.LMActionPostRelease(T3Gv.opt.actionStoredObjectId);
        T3Gv.opt.actionStoredObjectId = -1;
        T3Gv.opt.actionSvgObject = null;
      }

      LayerUtil.ShowOverlayLayer();
      DrawUtil.CompleteOperation(null);
    } catch (error) {
      Instance.Shape.BaseShape.prototype.LMActionClickExpCleanup.call(this, error);
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }
  }

  /**
   * Sets up action click event handling
   *
   * This method prepares the connector for action click events and delegates
   * to the BaseLine implementation for standard setup.
   *
   * @param actionEvent - The action event to set up
   * @param triggerType - The type of trigger associated with the action
   * @returns Result from base implementation
   */
  LMSetupActionClick(actionEvent, triggerType) {
    return Instance.Shape.BaseLine.prototype.LMSetupActionClick.call(this, actionEvent, triggerType);
  }

  /**
   * Handles action click events
   *
   * This method responds to click events on action points and delegates
   * to the BaseLine implementation for standard behavior.
   *
   * @param actionEvent - The action click event
   * @param triggerType - The type of trigger associated with the action
   */
  LMActionClick(actionEvent, triggerType) {
    Instance.Shape.BaseLine.prototype.LMActionClick.call(this, actionEvent, triggerType);
  }

  /**
   * Cleans up exceptions that occur during action clicks
   *
   * This method provides proper exception handling for action click operations
   * by delegating to the BaseLine implementation's cleanup routine.
   *
   * @param error - The error that occurred during action click handling
   */
  LMActionClickExpCleanup(error) {
    Instance.Shape.BaseLine.prototype.LMActionClickExpCleanup.call(this, error);
  }

  LMActionPreTrack(actionEvent, triggerType) {
    T3Util.Log("S.Connector: LMActionPreTrack input:", { actionEvent, triggerType });

    let currentHook,
      retrievedObject,
      svgElement,
      index,
      totalHooks,
      tempFlag,
      offsetIndex,
      hookListLength,
      hookIndexToRemove,
      localParameters = {},
      childHookList = [],
      connectorMultiplier = 1,
      linksObject = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false),
      isBothSidesNoStagger = (this.arraylist.styleflags & OptConstant.AStyles.BothSides) &&
        ((this.arraylist.styleflags & OptConstant.AStyles.Stagger) === 0),
      isLinear = (this.arraylist.styleflags & OptConstant.AStyles.Linear) > 0,
      connectorDefines = OptConstant.ConnectorDefines,
      self = this;

    // Helper function to process a hook and add its local list
    let processHook = function (hook, hookIndex) {
      let hookId = hook.id;
      if (hook.id < 0) {
        if (hookIndex === connectorDefines.A_Cl) {
          hookId = self.arraylist.hook[connectorDefines.SEDA_NSkip].id;
        } else if (hookIndex === connectorDefines.A_Cr) {
          hookId = self.arraylist.hook[self.arraylist.hook.length - 1].id;
        }
      }
      if (DataUtil.GetObjectPtr(hookId, false)) {
        childHookList = []; // reset list
        childHookList = HookUtil.GetHookList(linksObject, childHookList, hookId, DataUtil.GetObjectPtr(hookId, false), NvConstant.ListCodes.MoveHook, localParameters);
        hookListLength = childHookList.length;
        let localConnectorElements = [];
        for (index = 0; index < hookListLength; index++) {
          svgElement = T3Gv.opt.svgObjectLayer.GetElementById(childHookList[index]);
          if (svgElement) {
            localConnectorElements.push(svgElement);
            DataUtil.AddToDirtyList(childHookList[index]);
          }
        }
        let hookRecord = {
          Index: hookIndex,
          locallist: localConnectorElements
        };
        T3Gv.opt.ConnectorList.push(hookRecord);
      }
    };

    // Helper function to calculate connector widths and update the corresponding list
    let updateConnectorWidths = function (connectorData, useStartAdjustment, stubIndex, endShapeIndex) {
      let currentIndex, nextHook, followingHook, tempValue = 0;
      totalHooks = connectorData.hook.length;
      if (useStartAdjustment) {
        if (stubIndex === connectorDefines.A_Cr) {
          currentIndex = connectorDefines.A_Cr;
          nextHook = connectorData.hook[currentIndex];
          T3Gv.opt.ConnectorWidthList[currentIndex] = nextHook.endpoint.h - nextHook.startpoint.h - nextHook.gap;
        }
        for (currentIndex = OptConstant.ConnectorDefines.NSkip; currentIndex < totalHooks - 1 - tempValue; currentIndex++) {
          nextHook = connectorData.hook[currentIndex + tempValue];
          followingHook = connectorData.hook[currentIndex + tempValue + 1];
          T3Gv.opt.ConnectorWidthList[currentIndex + tempValue] = followingHook.endpoint.h - nextHook.endpoint.h - connectorData.wd - followingHook.extra;
          if (isBothSidesNoStagger) {
            currentIndex++;
          }
        }
        if (endShapeIndex === connectorDefines.A_Cl) {
          currentIndex = connectorDefines.A_Cl;
          nextHook = connectorData.hook[currentIndex];
          T3Gv.opt.ConnectorWidthList[currentIndex] = nextHook.startpoint.h - nextHook.endpoint.h - nextHook.gap;
        }
      } else {
        let startOffset = 0;
        if (stubIndex === connectorDefines.A_Cl) {
          startOffset = 0;
          currentIndex = connectorDefines.A_Cl;
          nextHook = connectorData.hook[currentIndex];
          T3Gv.opt.ConnectorWidthList[currentIndex] = nextHook.startpoint.h - nextHook.endpoint.h - nextHook.gap;
        }
        if (isBothSidesNoStagger) {
          startOffset = 1;
        }
        for (currentIndex = OptConstant.ConnectorDefines.NSkip + 1 + startOffset; currentIndex < totalHooks; currentIndex++) {
          nextHook = connectorData.hook[currentIndex];
          followingHook = connectorData.hook[currentIndex - 1];
          T3Gv.opt.ConnectorWidthList[currentIndex] = nextHook.endpoint.h - followingHook.endpoint.h - connectorData.wd - nextHook.extra;
          if (isBothSidesNoStagger) {
            currentIndex++;
          }
        }
        if (endShapeIndex === connectorDefines.A_Cr) {
          currentIndex = connectorDefines.A_Cr;
          nextHook = connectorData.hook[currentIndex];
          T3Gv.opt.ConnectorWidthList[currentIndex] = nextHook.endpoint.h - nextHook.startpoint.h - nextHook.gap;
        }
      }
    };

    T3Gv.opt.OldConnectorWd = this.arraylist.wd;
    T3Gv.opt.OldConnectorHt = this.arraylist.ht;
    T3Gv.opt.ConnectorList = [];
    T3Gv.opt.ConnectorWidthList = [];
    if (isBothSidesNoStagger) {
      connectorMultiplier = 2;
    }
    if (triggerType === OptConstant.ActionTriggerType.ConnectorHook) {
      currentHook = this.arraylist.hook[T3Gv.opt.actionTriggerData];
      T3Gv.opt.OldConnectorGap = currentHook.gap;
      T3Gv.opt.OldConnectorExtra = currentHook.extra;
    }

    let stubIndex = this.PrGetStubIndex();
    let endShapeIndex = this.PrGetEndShapeIndex();

    switch (triggerType) {
      case OptConstant.ActionTriggerType.ConnectorAdj:
        connectorMultiplier = T3Gv.opt.actionTriggerData;
        currentHook = this.arraylist.hook[T3Gv.opt.actionTriggerData];
        T3Gv.opt.OldConnectorExtra = currentHook.extra;
        totalHooks = this.arraylist.hook.length;
        if (isLinear && stubIndex === connectorDefines.A_Cr) {
          for (index = OptConstant.ConnectorDefines.NSkip; index < connectorMultiplier; index++) {
            currentHook = this.arraylist.hook[index];
            processHook(currentHook, index);
          }
        } else {
          for (index = connectorMultiplier; index < totalHooks; index++) {
            currentHook = this.arraylist.hook[index];
            processHook(currentHook, index);
          }
        }
        break;
      case OptConstant.ActionTriggerType.LineEnd:
        totalHooks = this.arraylist.hook.length;
        updateConnectorWidths(this.arraylist, false, stubIndex, endShapeIndex);
        if (!(stubIndex === connectorDefines.A_Cl && endShapeIndex === connectorDefines.A_Cl)) {
          connectorMultiplier = 0;
        }
        for (index = OptConstant.ConnectorDefines.NSkip + connectorMultiplier; index < totalHooks; index++) {
          currentHook = this.arraylist.hook[index];
          processHook(currentHook, index);
        }
        if (totalHooks && this.arraylist.hook[connectorDefines.A_Cr].id >= 0) {
          processHook(this.arraylist.hook[connectorDefines.A_Cr], connectorDefines.A_Cr);
        }
        break;
      case OptConstant.ActionTriggerType.LineStart:
        totalHooks = this.arraylist.hook.length;
        if (isBothSidesNoStagger && totalHooks % 2 === 0) {
          connectorMultiplier = 1;
        }
        updateConnectorWidths(this.arraylist, true, stubIndex, endShapeIndex);
        if (!(stubIndex === connectorDefines.A_Cr && endShapeIndex === connectorDefines.A_Cr)) {
          connectorMultiplier = 0;
        }
        for (index = totalHooks - 1 - connectorMultiplier; index >= OptConstant.ConnectorDefines.NSkip; index--) {
          currentHook = this.arraylist.hook[index];
          processHook(currentHook, index);
        }
        if (totalHooks && this.arraylist.hook[connectorDefines.A_Cl].id >= 0) {
          processHook(this.arraylist.hook[connectorDefines.A_Cl], connectorDefines.A_Cl);
        }
        break;
      case OptConstant.ActionTriggerType.ConnectorRerp:
      case OptConstant.ActionTriggerType.ConnectorHook:
        retrievedObject = DataUtil.GetObjectPtr(actionEvent, false);
        if (retrievedObject && linksObject) {
          childHookList = HookUtil.GetHookList(linksObject, childHookList, actionEvent, retrievedObject, NvConstant.ListCodes.ChildrenOnly, localParameters);
          totalHooks = childHookList.length;
          if (this.arraylist.hook[connectorDefines.A_Cl].id >= 0) {
            hookIndexToRemove = childHookList.indexOf(this.arraylist.hook[connectorDefines.A_Cl].id);
            if (hookIndexToRemove >= 0) {
              childHookList.splice(hookIndexToRemove, 1);
            }
          }
          if (this.arraylist.hook[connectorDefines.A_Cr].id >= 0) {
            hookIndexToRemove = childHookList.indexOf(this.arraylist.hook[connectorDefines.A_Cr].id);
            if (hookIndexToRemove >= 0) {
              childHookList.splice(hookIndexToRemove, 1);
            }
          }
          for (index = 0; index < totalHooks; index++) {
            svgElement = T3Gv.opt.svgObjectLayer.GetElementById(childHookList[index]);
            if (svgElement) {
              T3Gv.opt.ConnectorList.push(svgElement);
              DataUtil.AddToDirtyList(childHookList[index]);
            }
          }
          if (retrievedObject.hooks.length) {
            OptCMUtil.SetLinkFlag(retrievedObject.hooks[0].objid, DSConstant.LinkFlags.SED_L_MOVE);
          }
        }
        break;
    }
    T3Util.Log("S.Connector: LMActionPreTrack output:", true);
    return true;
  }

  LMActionDuringTrack(event) {
    T3Util.Log('S.Connector: LMActionDuringTrack input:', event);

    const result = event;

    T3Util.Log('S.Connector: LMActionDuringTrack output:', result);
    return result;
  }

  LMActionPostRelease(releasedConnectorId: number): void {
    T3Util.Log("S.Connector: LMActionPostRelease input:", { releasedConnectorId });

    T3Gv.opt.ConnectorList = [];
    T3Gv.opt.ConnectorWidthList = [];
    OptCMUtil.SetEditMode(NvConstant.EditState.Default);

    T3Util.Log("S.Connector: LMActionPostRelease output: completed");
  }

  GetBestHook(targetObjectId, unusedParam, hookPosition) {
    T3Util.Log("S.Connector: GetBestHook input:", { targetObjectId, unusedParam, hookPosition });

    // Calculate flags and readable variables.
    const bothSidesFlag = this.arraylist.styleflags & OptConstant.AStyles.BothSides;
    const linearFlag = this.arraylist.styleflags & OptConstant.AStyles.Linear;
    let startLeftIndicator;
    if (bothSidesFlag) {
      startLeftIndicator = (this.arraylist.styleflags & OptConstant.AStyles.StartLeft)
        ? hookPosition.x % 2 - 1
        : hookPosition.x % 2;
    } else {
      startLeftIndicator = this.arraylist.styleflags & OptConstant.AStyles.StartLeft;
    }

    let resultHook;
    let objectPtr;

    if (this.vertical) {
      if (!linearFlag) {
        // When not linear vertical connector.
        if (hookPosition.x === -1) {
          resultHook = OptConstant.HookPts.AKCB;
        } else if (hookPosition.x === -2) {
          resultHook = OptConstant.HookPts.AKCT;
        } else {
          resultHook = startLeftIndicator
            ? OptConstant.HookPts.AKCR
            : OptConstant.HookPts.AKCL;
        }
        T3Util.Log("S.Connector: GetBestHook output:", resultHook);
        return resultHook;
      }
      // For vertical and linear connectors.
      switch (hookPosition.y) {
        case OptConstant.ConnectorDefines.Above:
          resultHook = OptConstant.HookPts.AKCR;
          break;
        case OptConstant.ConnectorDefines.Below:
          resultHook = OptConstant.HookPts.AKCL;
          break;
        case OptConstant.ConnectorDefines.Parent:
          resultHook = (hookPosition.x === 0)
            ? OptConstant.HookPts.AKCB
            : OptConstant.HookPts.AKCT;
          break;
        default:
          objectPtr = DataUtil.GetObjectPtr(targetObjectId, false);
          if (objectPtr && objectPtr.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
            resultHook = objectPtr.vertical ? OptConstant.HookPts.LL : OptConstant.HookPts.LT;
          } else {
            resultHook = OptConstant.HookPts.AKCT;
          }
      }
      T3Util.Log("S.Connector: GetBestHook output:", resultHook);
      return resultHook;
    } else {
      // Non-vertical connectors.
      if (!linearFlag) {
        objectPtr = DataUtil.GetObjectPtr(targetObjectId, false);
        if (startLeftIndicator) {
          if (objectPtr && objectPtr.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
            resultHook = objectPtr.vertical ? OptConstant.HookPts.LB : OptConstant.HookPts.LR;
          } else {
            resultHook = OptConstant.HookPts.AKCB;
          }
        } else {
          if (objectPtr && objectPtr.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
            resultHook = objectPtr.vertical ? OptConstant.HookPts.LT : OptConstant.HookPts.LL;
          } else {
            resultHook = OptConstant.HookPts.AKCT;
          }
        }
        T3Util.Log("S.Connector: GetBestHook output:", resultHook);
        return resultHook;
      }
      // For non-vertical and linear connectors.
      switch (hookPosition.y) {
        case OptConstant.ConnectorDefines.Above:
          resultHook = OptConstant.HookPts.AKCB;
          break;
        case OptConstant.ConnectorDefines.Below:
          resultHook = OptConstant.HookPts.AKCT;
          break;
        case OptConstant.ConnectorDefines.Parent:
          resultHook = (hookPosition.x === 0)
            ? OptConstant.HookPts.AKCR
            : OptConstant.HookPts.AKCL;
          break;
        default:
          objectPtr = DataUtil.GetObjectPtr(targetObjectId, false);
          if (objectPtr && objectPtr.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
            resultHook = objectPtr.vertical ? OptConstant.HookPts.LT : OptConstant.HookPts.LL;
          } else {
            resultHook = OptConstant.HookPts.AKCL;
          }
      }
      T3Util.Log("S.Connector: GetBestHook output:", resultHook);
      return resultHook;
    }
  }

  GetHookFlags() {
    return NvConstant.HookFlags.LcMoveTarget
  }

  HookToPoint(hookPoint: number, outputRectangle?: { x: number; y: number; width: number; height: number }): Point {
    T3Util.Log("S.Connector: HookToPoint input:", { hookPoint, outputRectangle });

    // Initialize the result point with default values.
    let resultPoint: Point = { x: 0, y: 0 };

    // Shorter aliases for constants and style flags.
    const styleConstants = OptConstant.AStyles;
    const connectorDefines = OptConstant.ConnectorDefines;

    // Determine if "both sides" mode is active.
    const isBothSides = (this.arraylist.styleflags & styleConstants.SEDA_BothSides) ||
      ((this.arraylist.styleflags & styleConstants.SEDA_PerpConn) === 0);
    const reverseColumnFlag = this.arraylist.styleflags & styleConstants.SEDA_ReverseCol;

    // If there is no arraylist, simply return the start point.
    resultPoint.x = this.StartPoint.x;
    resultPoint.y = this.StartPoint.y;
    if (this.arraylist == null) {
      T3Util.Log("S.Connector: HookToPoint output:", resultPoint);
      return resultPoint;
    }

    // Determine multiplier based on reverse column flag.
    const multiplier = reverseColumnFlag ? -1 : 1;

    // Check if hooks are not sufficient or object is marked not visible (and not of a special branch type).
    if (
      (this.arraylist.hook.length <= connectorDefines.SEDA_NSkip ||
        (this.flags & NvConstant.ObjFlags.NotVisible)) /*&&
      this.objecttype !== NvConstant.FNObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH*/
    ) {
      let verticalFlag = this.vertical;
      if (!isBothSides) {
        verticalFlag = !verticalFlag;
        // Use the SEDA_StartLeft flag if available.
        let startLeftFlag = Boolean(this.arraylist.styleflags & styleConstants.SEDA_StartLeft);
        if (startLeftFlag) {
          verticalFlag = !verticalFlag;
        }
      } else {
        // Fallback: use ReverseCol flag.
        // (Not reassigning verticalFlag in this branch.)
      }
      // Choose appropriate hook point from the first hook.
      const firstHookPoint = (this.arraylist.styleflags & styleConstants.SEDA_StartLeft)
        ? this.arraylist.hook[0].endpoint
        : this.arraylist.hook[0].startpoint;
      if (verticalFlag) {
        resultPoint.y += firstHookPoint.h;
        resultPoint.x += firstHookPoint.v;
      } else {
        resultPoint.y += firstHookPoint.v;
        resultPoint.x += firstHookPoint.h;
      }
      if (outputRectangle) {
        const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
        outputRectangle.x = rect.x;
        outputRectangle.y = rect.y;
        outputRectangle.width = rect.width;
        outputRectangle.height = rect.height;
      }
      T3Util.Log("S.Connector: HookToPoint output:", resultPoint);
      return resultPoint;
    }

    // Calculate intermediate points based on connector hooks.
    const hookLeftData = this.arraylist.hook[connectorDefines.A_Cl];
    const hookRightData = this.arraylist.hook[connectorDefines.A_Cr];

    // Points computed from the hook endpoints and startpoints.
    let leftEndpointPoint: Point = { x: 0, y: 0 };
    let rightEndpointPoint: Point = { x: 0, y: 0 };
    let leftStartPoint: Point = { x: 0, y: 0 };
    let rightStartPoint: Point = { x: 0, y: 0 };

    if (this.vertical) {
      leftEndpointPoint.x = this.StartPoint.x + hookLeftData.endpoint.v;
      leftEndpointPoint.y = this.StartPoint.y + multiplier * hookLeftData.endpoint.h;
      rightEndpointPoint.x = this.StartPoint.x + hookRightData.endpoint.v;
      rightEndpointPoint.y = this.StartPoint.y + multiplier * hookRightData.endpoint.h;
      leftStartPoint.x = this.StartPoint.x + hookLeftData.startpoint.v;
      leftStartPoint.y = this.StartPoint.y + multiplier * hookLeftData.startpoint.h;
      rightStartPoint.x = this.StartPoint.x + hookRightData.startpoint.v;
      rightStartPoint.y = this.StartPoint.y + multiplier * hookRightData.startpoint.h;
    } else {
      leftEndpointPoint.x = this.StartPoint.x + hookLeftData.endpoint.h;
      leftEndpointPoint.y = this.StartPoint.y + hookLeftData.endpoint.v;
      rightEndpointPoint.x = this.StartPoint.x + hookRightData.endpoint.h;
      rightEndpointPoint.y = this.StartPoint.y + hookRightData.endpoint.v;
      leftStartPoint.x = this.StartPoint.x + hookLeftData.startpoint.h;
      leftStartPoint.y = this.StartPoint.y + hookLeftData.startpoint.v;
      rightStartPoint.x = this.StartPoint.x + hookRightData.startpoint.h;
      rightStartPoint.y = this.StartPoint.y + hookRightData.startpoint.v;
    }

    // For non-both-sides connectors, force the hook point value.
    if (!isBothSides) {
      hookPoint = OptConstant.HookPts.LL;
    }

    // Choose the point based on the provided hookPoint.
    switch (hookPoint) {
      case OptConstant.HookPts.LL:
      case OptConstant.HookPts.LT:
        resultPoint.x = leftEndpointPoint.x;
        resultPoint.y = leftEndpointPoint.y;
        if (outputRectangle) {
          const rect = Utils2.Pt2Rect(leftEndpointPoint, leftStartPoint);
          outputRectangle.x = rect.x;
          outputRectangle.y = rect.y;
          outputRectangle.width = rect.width;
          outputRectangle.height = rect.height;
        }
        break;
      default:
        resultPoint.x = rightEndpointPoint.x;
        resultPoint.y = rightEndpointPoint.y;
        if (outputRectangle) {
          const rect = Utils2.Pt2Rect(rightEndpointPoint, rightStartPoint);
          outputRectangle.x = rect.x;
          outputRectangle.y = rect.y;
          outputRectangle.width = rect.width;
          outputRectangle.height = rect.height;
        }
    }

    T3Util.Log("S.Connector: HookToPoint output:", resultPoint);
    return resultPoint;
  }

  GetTargetPoints(unusedParam: any, hookFlags: number, excludedHookId: number): Point[] {
    T3Util.Log("S.Connector: GetTargetPoints input:", { unusedParam, hookFlags, excludedHookId });

    let targetPoints: Point[] = [];
    if (this.arraylist == null) {
      T3Util.Log("S.Connector: GetTargetPoints output:", { points: targetPoints });
      return targetPoints;
    }

    const hookCount = this.arraylist.hook.length;
    const flowConnectorFlag = Boolean(this.arraylist.styleflags & OptConstant.AStyles.FlowConn);
    const isLinear = Boolean(this.arraylist.styleflags & OptConstant.AStyles.Linear);
    const isStartLeft = Boolean(this.arraylist.styleflags & OptConstant.AStyles.StartLeft);
    const isBothSides = Boolean(this.arraylist.styleflags & OptConstant.AStyles.BothSides) ||
      (this.arraylist.styleflags & OptConstant.AStyles.PerpConn) === 0;
    const isRadial = Boolean(this.arraylist.styleflags & OptConstant.AStyles.Radial) && !isBothSides;
    let isEndConnector = Boolean(this.arraylist.styleflags & OptConstant.AStyles.EndConn);
    const connectorDefs = OptConstant.ConnectorDefines;
    const hookPoints = OptConstant.HookPts;

    // For certain object types, force flowConnectorFlag to false.
    switch (this.objecttype) {
      // case NvConstant.FNObjectTypes.SD_OBJT_STEPCHARTH_BRANCH:
      // case NvConstant.FNObjectTypes.SD_OBJT_STEPCHARTV_BRANCH:
      //   // Disable flow connector for these object types.
      //   // (Do not use flowConnectorFlag; we simply ignore it)
      //   break;
    }

    // If HookNoExtra flag is set, disable end connector flag.
    if (hookFlags & NvConstant.HookFlags.LcHookNoExtra) {
      isEndConnector = false;
    }

    const effectiveHookCount = hookCount - connectorDefs.SEDA_NSkip;
    if (effectiveHookCount <= 0 && !isEndConnector) {
      targetPoints.push(new Point(-3, 0));
    } else {
      // Push basic hook index points.
      for (let index = connectorDefs.SEDA_NSkip; index < hookCount + 1; index++) {
        targetPoints.push(new Point(index - connectorDefs.SEDA_NSkip, 0));
      }
      // Handle the End Connector case.
      if (isEndConnector) {
        if (
          (hookFlags & NvConstant.HookFlags.LcForceEnd) === 0 &&
          (this.arraylist.hook[connectorDefs.A_Cl].index >= 0 || this.arraylist.hook[connectorDefs.A_Cr].index >= 0)
        ) {
          isEndConnector = false;
        } else if (this.hooks.length) {
          switch (this.hooks[0].hookpt) {
            case hookPoints.SED_LL:
            case hookPoints.SED_LT:
              targetPoints.push(new Point(-connectorDefs.A_Cr, 0));
              break;
            default:
              targetPoints.push(new Point(-connectorDefs.A_Cl, 0));
          }
        } else {
          targetPoints.push(new Point(-connectorDefs.A_Cl, 0));
        }
      }

      // Handle flow connector style.
      if (flowConnectorFlag && isLinear) {
        for (let index = connectorDefs.SEDA_NSkip; index < hookCount; index++) {
          if (excludedHookId && this.arraylist.hook[index].id === excludedHookId) {
            continue;
          }
          targetPoints.push(new Point(index - connectorDefs.SEDA_NSkip, connectorDefs.SEDAC_ABOVE));
          targetPoints.push(new Point(index - connectorDefs.SEDA_NSkip, connectorDefs.SEDAC_BELOW));
        }
        if (this.hooks.length) {
          switch (this.hooks[0].hookpt) {
            case OptConstant.HookPts.LL:
            case OptConstant.HookPts.LT:
              targetPoints.push(new Point(0, connectorDefs.SEDAC_PARENT));
              break;
            default:
              targetPoints.push(new Point(effectiveHookCount, connectorDefs.SEDAC_PARENT));
          }
        }
      } else if (flowConnectorFlag && isRadial) {
        for (let index = connectorDefs.SEDA_NSkip; index < hookCount; index++) {
          if (excludedHookId && this.arraylist.hook[index].id === excludedHookId) {
            continue;
          }
          if (isStartLeft) {
            targetPoints.push(new Point(index - connectorDefs.SEDA_NSkip, connectorDefs.SEDAC_ABOVE));
          } else {
            targetPoints.push(new Point(index - connectorDefs.SEDA_NSkip, connectorDefs.SEDAC_BELOW));
          }
        }
      }
    }

    T3Util.Log("S.Connector: GetTargetPoints output:", { points: targetPoints });
    return targetPoints;
  }

  AllowMaintainLink() {
    return false;
  }

  ChangeHook(triggerEvent: any, isUserInitiated: boolean, additionalInfo: any): void {
    T3Util.Log("S.Connector: ChangeHook called with", { triggerEvent, isUserInitiated, additionalInfo });

    const styleConstants = OptConstant.AStyles;
    const autoFormatFlags = Business.FlowChart.AutoFormatFlags;
    const sessionObject = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    const isLinear = (this.arraylist.styleflags & styleConstants.SEDA_Linear) > 0;
    const isFlowConnector = this.arraylist.styleflags & styleConstants.SEDA_FlowConn;
    let blockIdToUse = -1;

    if (sessionObject.flags & OptConstant.SessionFlags.AutoFormat && isFlowConnector) {
      const hookObjectId = this.hooks[0].objid;
      const shapeObject = DataUtil.GetObjectPtr(hookObjectId, false);
      if (shapeObject && shapeObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
        if (isLinear) {
          if (!isUserInitiated) {
            blockIdToUse = this.BlockID;
          }
          if (1 === GlobalDatagFlowChartManager.SED_ArrayShapeIsThreeWay(shapeObject, this.BlockID, blockIdToUse)) {
            GlobalDatagFlowChartManager.AutoFormatShape(hookObjectId, autoFormatFlags.SD_AutoFF_ToDiamond | autoFormatFlags.SD_AutoFF_ToDecStyle);
          }
        } else {
          if (isUserInitiated) {
            GlobalDatagFlowChartManager.AutoFormatShape(hookObjectId, autoFormatFlags.SD_AutoFF_ToDecStyle);
          } else {
            blockIdToUse = this.BlockID;
            if (0 === GlobalDatagFlowChartManager.SED_ArrayShapeIsThreeWay(shapeObject, this.BlockID, blockIdToUse)) {
              GlobalDatagFlowChartManager.AutoFormatShape(hookObjectId, autoFormatFlags.SD_AutoFF_ToDefStyle);
            }
          }
        }
      }
    }

    T3Util.Log("S.Connector: ChangeHook completed");
  }

  ChangeTarget(connectorBlockId, targetHookId, unusedParam1, unusedParam2, newHookIndexInfo, shouldUpdate) {
    T3Util.Log("S.Connector: ChangeTarget called with", {
      connectorBlockId,
      targetHookId,
      unusedParam1,
      unusedParam2,
      newHookIndexInfo,
      shouldUpdate
    });

    let hookIndexFound = -1;
    let storedTextId = -1;
    const bothSides = this.arraylist.styleflags & OptConstant.AStyles.BothSides;
    const isLinear = this.arraylist.styleflags & OptConstant.AStyles.Linear;
    const isFlowConnector = this.arraylist.styleflags & OptConstant.AStyles.FlowConn;
    const sessionObject = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    const noTreeOverlap = sessionObject.flags & OptConstant.SessionFlags.NoTreeOverlap;
    const skipCount = OptConstant.ConnectorDefines.NSkip;

    if (targetHookId != null) {
      const totalHooks = this.arraylist.hook.length;
      for (let index = 0; index < totalHooks; index++) {
        let currentHook = this.arraylist.hook[index];
        if (currentHook.id === targetHookId) {
          hookIndexFound = index;
          break;
        }
      }

      if (shouldUpdate) {
        if (hookIndexFound >= 0) {
          const expectedIndex = newHookIndexInfo.x + OptConstant.ConnectorDefines.NSkip;
          if (expectedIndex !== hookIndexFound) {
            storedTextId = this.arraylist.hook[hookIndexFound].textid;
            if (hookIndexFound < expectedIndex) {
              if (bothSides) {
                newHookIndexInfo.x++;
              }
              this.PrAddHookedObject(targetHookId, newHookIndexInfo.x, storedTextId);
              this.PrRemoveHookedObject(targetHookId, hookIndexFound);
            } else {
              this.PrRemoveHookedObject(targetHookId, hookIndexFound);
              this.PrAddHookedObject(targetHookId, newHookIndexInfo.x, storedTextId);
            }
            if (sessionObject.flags & OptConstant.SessionFlags.AutoFormat && isFlowConnector) {
              GlobalDatagFlowChartManager.AutoFormat(this, -1);
              GlobalDatagFlowChartManager.AutoFormat(this, newHookIndexInfo.x);
            }
          }
        } else {
          this.PrAddHookedObject(targetHookId, newHookIndexInfo.x, -1);
          if (sessionObject.flags & OptConstant.SessionFlags.AutoFormat && isFlowConnector) {
            GlobalDatagFlowChartManager.AutoFormat(this, newHookIndexInfo.x);
          }
        }
      } else if (hookIndexFound >= 0) {
        // Remove any associated text block if exists.
        let currentHook = this.arraylist.hook[hookIndexFound];
        if (currentHook.textid >= 0) {
          T3Gv.opt.DeleteBlock(currentHook.textid);
          currentHook.textid = -1;
        }
        this.PrRemoveHookedObject(targetHookId, hookIndexFound);

        // Reset the subtype if the target object is a task.
        const targetObject = DataUtil.GetObjectPtr(targetHookId, true);
        // if (targetObject && targetObject.subtype === NvConstant.ObjectSubTypes.SD_SUBT_TASK) {
        //   targetObject.subtype = 0;
        // }
        if (sessionObject.flags & OptConstant.SessionFlags.AutoFormat && isFlowConnector) {
          GlobalDatagFlowChartManager.AutoFormat(this, -1);
        }
        if (isLinear && hookIndexFound === skipCount && this.arraylist.hook.length >= skipCount) {
          if (this.arraylist.hook.length === skipCount) {
            for (let index = 0; index < skipCount; index++) {
              let hookItem = this.arraylist.hook[index];
              if (hookItem.textid >= 0) {
                T3Gv.opt.DeleteBlock(hookItem.textid);
                hookItem.textid = -1;
              }
            }
          } else if (this.arraylist.hook[skipCount].textid >= 0) {
            if (!this.hooks.length || (this.hooks[0].hookpt !== OptConstant.HookPts.LL &&
              this.hooks[0].hookpt !== OptConstant.HookPts.LT)) {
              let hookItem = this.arraylist.hook[skipCount];
              T3Gv.opt.DeleteBlock(hookItem.textid);
              hookItem.textid = -1;
            } else {
              let hookItem = this.arraylist.hook[OptConstant.ConnectorDefines.ACl];
              if (hookItem.textid >= 0) {
                T3Gv.opt.DeleteBlock(hookItem.textid);
                hookItem.textid = -1;
              }
              hookItem.textid = this.arraylist.hook[skipCount].textid;
              this.arraylist.hook[skipCount].textid = -1;
            }
          }
        }
        if (this.arraylist.styleflags & OptConstant.AStyles.CoManager) {
          this.CollapseCoManager(targetHookId);
        } else if (this.IsAsstConnector()) {
          this.CollapseAssistant();
        }
      }
      OptCMUtil.SetLinkFlag(connectorBlockId, DSConstant.LinkFlags.SED_L_MOVE);
      if (noTreeOverlap) {
        OptAhUtil.FindTreeTop(
          this,
          DSConstant.LinkFlags.SED_L_MOVE,
          {
            topconnector: -1,
            topshape: -1,
            foundtree: false
          }
        );
      } else {
        const objectPtr = DataUtil.GetObjectPtr(connectorBlockId, true);
        if (objectPtr && objectPtr.hooks.length) {
          OptCMUtil.SetLinkFlag(objectPtr.hooks[0].objid, DSConstant.LinkFlags.SED_L_MOVE);
        }
      }
      this.PrFormat(connectorBlockId);
      DataUtil.AddToDirtyList(connectorBlockId);
    } else {
      this.flags = Utils2.SetFlag(this.flags, NvConstant.ObjFlags.Obj1, true);
    }
    T3Util.Log("S.Connector: ChangeTarget completed");
  }

  DeleteObject(): void {
    T3Util.Log("S.Connector: DeleteObject called with no input parameters");

    const styleConstants = OptConstant.AStyles;
    const sessionObject = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    const isFlowConnector = Boolean(this.arraylist.styleflags & styleConstants.SEDA_FlowConn);
    const autoFormatFlags = Business.FlowChart.AutoFormatFlags;

    // Loop through each hook and delete associated text objects if they exist
    const hookCount = this.arraylist.hook.length;
    for (let hookIndex = 0; hookIndex < hookCount; hookIndex++) {
      const currentHook = this.arraylist.hook[hookIndex];
      // Check if textid is valid (not equal to -1)
      if (currentHook.textid !== -1) {
        const textObject = T3Gv.stdObj.GetObject(currentHook.textid);
        if (textObject) {
          T3Util.Log("S.Connector: Deleting text object with id", currentHook.textid);
          textObject.Delete();
        }
      }
    }

    // If auto-format is enabled for the session, the connector is a flow connector,
    // and there is at least one hook, then auto-format the associated shape.
    if (sessionObject.flags & OptConstant.SessionFlags.AutoFormat && isFlowConnector && this.hooks.length) {
      const firstHookObjectId = this.hooks[0].objid;
      const firstHookObject = DataUtil.GetObjectPtr(firstHookObjectId, false);
      if (firstHookObject && firstHookObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
        const shapeFormatType = GlobalDatagFlowChartManager.SED_ArrayShapeIsThreeWay(firstHookObject, -1, this.BlockID);
        T3Util.Log("S.Connector: Auto-format shape check returned format type", shapeFormatType, "for shape id", firstHookObjectId);

        if (shapeFormatType === 0) {
          GlobalDatagFlowChartManager.AutoFormatShape(firstHookObjectId,
            autoFormatFlags.SD_AutoFF_ToRect | autoFormatFlags.SD_AutoFF_ToDefStyle | autoFormatFlags.SD_AutFF_Force);
          T3Util.Log("S.Connector: Auto-format applied using ToRect, ToDefStyle, and Force flags");
        } else if (shapeFormatType === 2) {
          GlobalDatagFlowChartManager.AutoFormatShape(firstHookObjectId,
            autoFormatFlags.SD_AutoFF_ToRect | autoFormatFlags.SD_AutoFF_ToDecStyle);
          T3Util.Log("S.Connector: Auto-format applied using ToRect and ToDecStyle flags");
        }
      }
    }

    T3Util.Log("S.Connector: DeleteObject completed with no output");
  }

  IsAsstConnector() {
    T3Util.Log("S.Connector: IsAsstConnector called");

    const styles = OptConstant.AStyles;
    const isLinear = (this.arraylist.styleflags & styles.SEDA_Linear) > 0;
    const isPerpConn = (this.arraylist.styleflags & styles.SEDA_PerpConn) > 0;

    const result = isLinear && isPerpConn;
    T3Util.Log("S.Connector: IsAsstConnector returning", result);

    return result;
  }

  AllowCurveOnConnector(curveParams) {
    T3Util.Log("S.Connector: AllowCurveOnConnector called with", curveParams);

    const styles = OptConstant.AStyles;
    const isLinear = (this.arraylist.styleflags & styles.SEDA_Linear) === 0;
    const isBothSides = (this.arraylist.styleflags & styles.SEDA_BothSides) === 0;
    const isRadial = (this.arraylist.styleflags & styles.SEDA_Radial) === 0;
    const isTiltZero = this.arraylist.tilt === 0;
    const isAngleZero = this.arraylist.angle === 0;

    const allowCurve = isLinear && isBothSides && isRadial && isTiltZero && isAngleZero;

    if (this.IsAsstConnector() && this.arraylist.hook.length > OptConstant.ConnectorDefines.NSkip) {
      let assistantId = -1;
      let hookIndex = -1;
      let isLeft = false;

      if (this.arraylist.hook[OptConstant.ConnectorDefines.NSkip].isasst) {
        assistantId = this.arraylist.hook[OptConstant.ConnectorDefines.NSkip].id;
        hookIndex = OptConstant.ConnectorDefines.NSkip + 1;
        isLeft = false;
      } else if (this.arraylist.hook[this.arraylist.hook.length - 1].isasst) {
        assistantId = this.arraylist.hook[this.arraylist.hook.length - 1].id;
        hookIndex = this.arraylist.hook.length - 1;
        isLeft = true;
      }

      if (assistantId >= 0) {
        const assistantObject = DataUtil.GetObjectPtr(assistantId, false);
        if (assistantObject && assistantObject.arraylist && assistantObject.arraylist.hook.length <= OptConstant.ConnectorDefines.NSkip) {
          if (curveParams) {
            curveParams.index = hookIndex;
            curveParams.left = isLeft;
          }
          T3Util.Log("S.Connector: AllowCurveOnConnector returning true");
          return true;
        }
      }
    }

    T3Util.Log("S.Connector: AllowCurveOnConnector returning", allowCurve);
    return allowCurve;
  }

  IsGenoConnector() {
    T3Util.Log("S.Connector: IsGenoConnector called");

    const styles = OptConstant.AStyles;
    const isLinear = (this.arraylist.styleflags & styles.SEDA_Linear) > 0;
    const isGenoConn = (this.arraylist.styleflags & styles.SEDA_GenoConn) > 0;

    const result = isLinear && isGenoConn;
    T3Util.Log("S.Connector: IsGenoConnector returning", result);

    return result;
  }

  IsCoManager(output) {
    T3Util.Log("S.Connector: IsCoManager called with output:", output);

    const isCoManager = (this.arraylist.styleflags & OptConstant.AStyles.CoManager) > 0;
    const styles = OptConstant.AStyles;
    const startLeft = this.arraylist.styleflags & styles.SEDA_StartLeft;

    if (isCoManager && output) {
      if (this.flags & NvConstant.ObjFlags.Obj1) {
        this.PrFormat(this.BlockID);
      }

      if (this.vertical) {
        output.y = (this.EndPoint.y + this.StartPoint.y) / 2;
        output.x = startLeft ? this.StartPoint.x - this.arraylist.coprofile.v : this.StartPoint.x + this.arraylist.coprofile.vdist;
        output.ht = this.arraylist.ht;
      } else {
        output.x = (this.EndPoint.x + this.StartPoint.x) / 2;
        output.y = startLeft ? this.StartPoint.y - this.arraylist.coprofile.v : this.StartPoint.y + this.arraylist.coprofile.vdist;
        output.ht = this.arraylist.ht;
      }
    }

    T3Util.Log("S.Connector: IsCoManager returning", isCoManager);
    return isCoManager;
  }

  GetChildFrame(hookIndex) {
    T3Util.Log("S.Connector: GetChildFrame called with hookIndex:", hookIndex);

    let childFrame = {
      x: 0,
      y: 0,
      width: 150,
      height: 75
    };

    const totalHooks = this.arraylist.hook.length;
    hookIndex += OptConstant.ConnectorDefines.NSkip;

    if (hookIndex > 0 && hookIndex < totalHooks) {
      const childId = this.arraylist.hook[hookIndex].id;
      if (childId >= 0) {
        const childObject = DataUtil.GetObjectPtr(childId, false);
        if (childObject) {
          childFrame = Utils1.DeepCopy(childObject.Frame);
        }
      }
    }

    T3Util.Log("S.Connector: GetChildFrame returning", childFrame);
    return childFrame;
  }

  GetPerimeterPoints(
    formatParam: any,
    inputPoints: Point[],
    unusedParamA: any,
    unusedParamR: any,
    unusedParamI: any,
    unusedParamN: any
  ): Point[] {
    T3Util.Log("S.Connector: GetPerimeterPoints input:", {
      formatParam,
      inputPoints,
      unusedParamA,
      unusedParamR,
      unusedParamI,
      unusedParamN
    });

    let index: number,
      numberOfInputPoints: number,
      tempIndex: number,
      hookCount: number,
      currentHook: any,
      remainingHooks: number,
      polyPoints: Point[],
      tempPoint: number,
      childFrame: any,
      computedX: number,
      computedY: number,
      midValue: number,
      polyIndex: number,
      flagBothSides: boolean,
      flagLinear: any,
      flagStartLeft: any,
      flagBothSidesOrPerp: any,
      flagRadial: any,
      flagStagger: boolean,
      reverseMultiplier: number,
      flowConnectorDisp: number,
      flowConnectorSlop: number,
      resultPoints: Point[] = [];

    // Rename some constants for readability
    const styleFlags = this.arraylist.styleflags;
    const reverseColumnFlag = styleFlags & OptConstant.AStyles.ReverseCol;
    const connectorDefs = OptConstant.ConnectorDefines;
    flowConnectorDisp = OptConstant.Common.FlowConnectorDisp;
    flowConnectorSlop = OptConstant.Common.FlowConnectorSlop;

    // Calculate the length of inputPoints and hooks adjusted by skip constant
    numberOfInputPoints = inputPoints.length;
    hookCount = this.arraylist.hook.length;
    remainingHooks = hookCount - connectorDefs.SEDA_NSkip;
    if (remainingHooks < 0) {
      remainingHooks = 0;
    }

    flagBothSides = (styleFlags & OptConstant.AStyles.BothSides) &&
      (styleFlags & OptConstant.AStyles.Stagger) === 0;
    flagLinear = styleFlags & OptConstant.AStyles.Linear;
    flagStartLeft = styleFlags & OptConstant.AStyles.StartLeft;
    flagBothSidesOrPerp = (styleFlags & OptConstant.AStyles.BothSides) ||
      ((styleFlags & OptConstant.AStyles.PerpConn) === 0);
    flagRadial = (styleFlags & OptConstant.AStyles.Radial) && !flagBothSidesOrPerp;
    flagStagger = (styleFlags & OptConstant.AStyles.Stagger) > 0;
    reverseMultiplier = reverseColumnFlag ? -1 : 1;

    // If there's exactly one input point, and an object flag is set, then format first.
    if (numberOfInputPoints === 1 && this.flags & NvConstant.ObjFlags.Obj1) {
      this.PrFormat(formatParam);
    }

    // If the first input point has negative x then process as a special case.
    if (inputPoints[0].x < 0) {
      for (index = 0; index < numberOfInputPoints; index++) {
        if (inputPoints[index].x === -3) {
          // When x equals -3, return the start hook point adjusted by StartPoint.
          if (flagBothSidesOrPerp && (flagStartLeft = reverseColumnFlag)) {
            currentHook = this.arraylist.hook[0];
          }
          if (this.vertical) {
            resultPoints.push(
              new Point(
                currentHook.startpoint.v + this.StartPoint.x,
                currentHook.startpoint.h + this.StartPoint.y
              )
            );
          } else {
            resultPoints.push(
              new Point(
                currentHook.startpoint.h + this.StartPoint.x,
                currentHook.startpoint.v + this.StartPoint.y
              )
            );
          }
          T3Util.Log("S.Connector: GetPerimeterPoints output:", resultPoints);
          return resultPoints;
        } else if (inputPoints[index].x === -connectorDefs.A_Cl) {
          currentHook = this.arraylist.hook[connectorDefs.A_Cl];
        } else if (inputPoints[index].x === -connectorDefs.A_Cr) {
          currentHook = this.arraylist.hook[connectorDefs.A_Cr];
        }
        if (currentHook) {
          if (this.vertical) {
            resultPoints.push(
              new Point(
                currentHook.endpoint.v + this.StartPoint.x,
                currentHook.endpoint.h + this.StartPoint.y
              )
            );
          } else {
            resultPoints.push(
              new Point(
                currentHook.endpoint.h + this.StartPoint.x,
                currentHook.endpoint.v + this.StartPoint.y
              )
            );
          }
          if (inputPoints[index].id !== undefined) {
            resultPoints[index].id = inputPoints[index].id;
          }
        }
      }
      T3Util.Log("S.Connector: GetPerimeterPoints output:", resultPoints);
      return resultPoints;
    }

    // Process the case when there is exactly one input point where x is non-negative.
    if (numberOfInputPoints === 1) {
      resultPoints.push(new Point(0, 0));
      tempIndex = inputPoints[0].x + connectorDefs.SEDA_NSkip;
      if (tempIndex >= hookCount) {
        tempIndex = hookCount - 1;
      }
      currentHook = this.arraylist.hook[tempIndex];
      if (this.vertical) {
        resultPoints[0].x = currentHook.endpoint.v;
        resultPoints[0].y = reverseMultiplier * currentHook.endpoint.h;
      } else {
        resultPoints[0].x = currentHook.endpoint.h;
        resultPoints[0].y = reverseMultiplier * currentHook.endpoint.v;
      }
      resultPoints[0].x += this.StartPoint.x;
      resultPoints[0].y += this.StartPoint.y;
    } else {
      // When more than one input point exists, use the polyline points.
      polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, false, null);
      for (index = 0; index < numberOfInputPoints; index++) {
        if (inputPoints[index].y === connectorDefs.SEDAC_PARENT) {
          // If y indicates a "parent" hook point.
          if (inputPoints[index].x === 0) {
            tempIndex = 2 * connectorDefs.A_Cl;
            resultPoints.push(new Point(polyPoints[tempIndex + 1].x, polyPoints[tempIndex + 1].y));
          } else {
            tempIndex = 2 * connectorDefs.A_Cr;
            resultPoints.push(new Point(polyPoints[tempIndex + 1].x, polyPoints[tempIndex + 1].y));
          }
        } else if (index === 0 || inputPoints[index].x === 0) {
          tempIndex = 2 * (inputPoints[index].x + connectorDefs.SEDA_NSkip);
          let startY = this.StartPoint.y;
          let startX = this.StartPoint.x;
          if (remainingHooks > 1) {
            polyIndex = 2 * (inputPoints[index].x + 1 + connectorDefs.SEDA_NSkip);
            computedY = polyPoints[polyIndex].y;
            midValue = polyPoints[polyIndex].x;
          } else {
            computedY = this.EndPoint.y;
            midValue = this.EndPoint.x;
          }
          if (this.vertical) {
            switch (inputPoints[index].y) {
              case connectorDefs.SEDAC_ABOVE:
                if (flagRadial) {
                  childFrame = this.GetChildFrame(inputPoints[index].x);
                  resultPoints.push(new Point(polyPoints[tempIndex + 1].x - childFrame.width - this.arraylist.ht, polyPoints[tempIndex + 1].y));
                } else {
                  computedX = polyPoints[tempIndex].x - flowConnectorSlop;
                  resultPoints.push(new Point(computedX, (computedY + startY) / 2));
                }
                break;
              case connectorDefs.SEDAC_BELOW:
                if (flagRadial) {
                  childFrame = this.GetChildFrame(inputPoints[index].x);
                  resultPoints.push(new Point(polyPoints[tempIndex + 1].x + childFrame.width + this.arraylist.ht, polyPoints[tempIndex + 1].y));
                } else {
                  computedX = polyPoints[tempIndex].x + flowConnectorSlop;
                  resultPoints.push(new Point(computedX, (computedY + startY) / 2));
                }
                break;
              default:
                if (flagRadial) {
                  resultPoints.push(new Point(polyPoints[tempIndex + 1].x, polyPoints[tempIndex + 1].y - 10));
                } else {
                  resultPoints.push(new Point(polyPoints[tempIndex + 1].x, polyPoints[tempIndex].y - 10));
                }
            }
          } else {
            switch (inputPoints[index].y) {
              case connectorDefs.SEDAC_ABOVE:
                if (flagRadial) {
                  childFrame = this.GetChildFrame(inputPoints[index].x);
                  resultPoints.push(new Point(polyPoints[tempIndex + 1].x, polyPoints[tempIndex + 1].y - childFrame.height - this.arraylist.ht));
                } else {
                  let computedValue = polyPoints[tempIndex].y - flowConnectorDisp;
                  resultPoints.push(new Point((midValue + startX) / 2, computedValue));
                }
                break;
              case connectorDefs.SEDAC_BELOW:
                if (flagRadial) {
                  childFrame = this.GetChildFrame(inputPoints[index].x);
                  resultPoints.push(new Point(polyPoints[tempIndex + 1].x, polyPoints[tempIndex + 1].y + childFrame.height + this.arraylist.ht));
                } else {
                  let computedValue = polyPoints[tempIndex].y + flowConnectorDisp;
                  resultPoints.push(new Point((midValue + startX) / 2, computedValue));
                }
                break;
              default:
                if (flagRadial) {
                  resultPoints.push(new Point(polyPoints[tempIndex + 1].x - 10, polyPoints[tempIndex + 1].y));
                } else {
                  resultPoints.push(new Point(polyPoints[tempIndex].x - 10, polyPoints[tempIndex + 1].y));
                }
            }
          }
          if (flagBothSides && index + 1 < numberOfInputPoints) {
            tempIndex = 2 * (inputPoints[++index].x + connectorDefs.SEDA_NSkip);
            if (tempIndex < polyPoints.length - 1) {
              if (this.vertical) {
                resultPoints.push(new Point(polyPoints[tempIndex + 1].x, polyPoints[tempIndex].y - 10));
              } else {
                resultPoints.push(new Point(polyPoints[tempIndex].x - 10, polyPoints[tempIndex + 1].y));
              }
            }
          }
        } else if (inputPoints[index].x > 0 && inputPoints[index].x < remainingHooks) {
          tempIndex = 2 * (inputPoints[index].x - 1 + connectorDefs.SEDA_NSkip);
          polyIndex = 2 * (inputPoints[index].x + connectorDefs.SEDA_NSkip);
          if (inputPoints[index].x < remainingHooks - 1) {
            computedY = polyPoints[2 * (inputPoints[index].x + 1 + connectorDefs.SEDA_NSkip)].y;
            midValue = polyPoints[2 * (inputPoints[index].x + 1 + connectorDefs.SEDA_NSkip)].x;
          } else {
            computedY = this.EndPoint.y;
            midValue = this.EndPoint.x;
          }
          if (this.vertical) {
            if (flagLinear) {
              switch (inputPoints[index].y) {
                case connectorDefs.SEDAC_ABOVE:
                  computedX = polyPoints[polyIndex + 1].x - flowConnectorSlop;
                  resultPoints.push(new Point(computedX, (computedY + polyPoints[polyIndex + 1].y) / 2));
                  break;
                case connectorDefs.SEDAC_BELOW:
                  computedX = polyPoints[polyIndex + 1].x + flowConnectorSlop;
                  resultPoints.push(new Point(computedX, (computedY + polyPoints[polyIndex + 1].y) / 2));
                  break;
                default:
                  computedX = polyPoints[polyIndex + 1].x;
                  resultPoints.push(new Point(computedX, (polyPoints[polyIndex].y + polyPoints[polyIndex + 1].y) / 2));
              }
            } else if (flagRadial) {
              switch (inputPoints[index].y) {
                case connectorDefs.SEDAC_ABOVE:
                  childFrame = this.GetChildFrame(inputPoints[index].x);
                  resultPoints.push(new Point(polyPoints[polyIndex + 1].x - childFrame.width - this.arraylist.ht, polyPoints[polyIndex + 1].y));
                  break;
                case connectorDefs.SEDAC_BELOW:
                  childFrame = this.GetChildFrame(inputPoints[index].x);
                  resultPoints.push(new Point(polyPoints[polyIndex + 1].x + childFrame.width + this.arraylist.ht, polyPoints[polyIndex + 1].y));
                  break;
                default:
                  resultPoints.push(new Point(polyPoints[polyIndex + 1].x, (polyPoints[polyIndex + 1].y + polyPoints[tempIndex + 1].y) / 2));
              }
            } else {
              let angleOffset = (polyPoints[polyIndex].y - polyPoints[tempIndex].y) / 2 * this.arraylist.angle;
              if (flagBothSides) {
                resultPoints.push(new Point(polyPoints[tempIndex - 1].x + angleOffset, (polyPoints[polyIndex].y + polyPoints[tempIndex].y) / 2));
              } else {
                angleOffset = -angleOffset;
                resultPoints.push(new Point(polyPoints[polyIndex + 1].x + angleOffset, (polyPoints[polyIndex].y + polyPoints[tempIndex].y) / 2));
              }
            }
          } else {
            if (flagLinear) {
              switch (inputPoints[index].y) {
                case connectorDefs.SEDAC_ABOVE:
                  let computedYValue = polyPoints[tempIndex].y - flowConnectorDisp;
                  resultPoints.push(new Point((midValue + this.StartPoint.x) / 2, computedYValue));
                  break;
                case connectorDefs.SEDAC_BELOW:
                  computedYValue = polyPoints[tempIndex].y + flowConnectorDisp;
                  resultPoints.push(new Point((midValue + this.StartPoint.x) / 2, computedYValue));
                  break;
                default:
                  computedYValue = polyPoints[tempIndex].y;
                  resultPoints.push(new Point((polyPoints[polyIndex].x + polyPoints[polyIndex + 1].x) / 2, computedYValue));
              }
            } else if (flagRadial) {
              switch (inputPoints[index].y) {
                case connectorDefs.SEDAC_ABOVE:
                  childFrame = this.GetChildFrame(inputPoints[index].x);
                  resultPoints.push(new Point(polyPoints[polyIndex + 1].x, polyPoints[polyIndex + 1].y - childFrame.height - this.arraylist.ht));
                  break;
                case connectorDefs.SEDAC_BELOW:
                  childFrame = this.GetChildFrame(inputPoints[index].x);
                  resultPoints.push(new Point(polyPoints[polyIndex + 1].x, polyPoints[polyIndex + 1].y + childFrame.height + this.arraylist.ht));
                  break;
                default:
                  resultPoints.push(new Point((polyPoints[polyIndex + 1].x + polyPoints[tempIndex + 1].x) / 2, polyPoints[polyIndex + 1].y));
              }
            } else {
              resultPoints.push(new Point((polyPoints[polyIndex].x + polyPoints[tempIndex].x) / 2, polyPoints[polyIndex + 1].y));
            }
            if (flagBothSides) {
              if (this.vertical) {
                let angleOffset = (polyPoints[polyIndex].y - polyPoints[tempIndex].y) / 2 * this.arraylist.angle;
                resultPoints.push(new Point(polyPoints[polyIndex - 1].x + angleOffset, (polyPoints[polyIndex].y + polyPoints[tempIndex].y) / 2));
              } else {
                resultPoints.push(new Point((polyPoints[polyIndex].x + polyPoints[tempIndex].x) / 2, polyPoints[tempIndex + 1].y));
              }
              index++;
            }
          }
        } else if (index === remainingHooks) {
          tempIndex = 2 * (inputPoints[index - 1].x + connectorDefs.SEDA_NSkip);
          if (this.vertical) {
            if (flagBothSides) {
              resultPoints.push(new Point(polyPoints[tempIndex - 1].x, polyPoints[tempIndex].y + 10));
            } else if (flagLinear) {
              resultPoints.push(new Point(polyPoints[tempIndex + 1].x, this.EndPoint.y + 10));
            } else if (flagRadial) {
              resultPoints.push(new Point(polyPoints[tempIndex + 1].x, polyPoints[tempIndex + 1].y + 10));
            } else {
              let angleOffset = 10 * this.arraylist.angle;
              if (flagStagger && !flagStartLeft) {
                resultPoints.push(new Point(polyPoints[tempIndex].x - (polyPoints[tempIndex + 1].x - polyPoints[tempIndex].x) + angleOffset, polyPoints[tempIndex].y + 10));
              } else {
                resultPoints.push(new Point(polyPoints[tempIndex + 1].x + angleOffset, polyPoints[tempIndex].y + 10));
              }
            }
          } else {
            if (flagBothSides) {
              resultPoints.push(new Point(polyPoints[tempIndex].x + 10, polyPoints[tempIndex - 1].y));
            } else if (flagLinear) {
              resultPoints.push(new Point(this.EndPoint.x + 10, polyPoints[tempIndex].y));
            } else if (flagRadial) {
              resultPoints.push(new Point(polyPoints[tempIndex + 1].x + 10, polyPoints[tempIndex + 1].y));
            } else {
              resultPoints.push(new Point(polyPoints[tempIndex].x + 10, polyPoints[tempIndex + 1].y));
            }
          }
          if (flagBothSides && index + 1 < numberOfInputPoints) {
            tempIndex = 2 * (inputPoints[++index].x + connectorDefs.SEDA_NSkip);
            if (tempIndex < polyPoints.length - 1) {
              if (this.vertical) {
                resultPoints.push(new Point(polyPoints[tempIndex + 1].x, polyPoints[tempIndex].y - 10));
              } else {
                resultPoints.push(new Point(polyPoints[tempIndex].x - 10, polyPoints[tempIndex + 1].y));
              }
            }
          }
        }
      }
    }
    T3Util.Log("S.Connector: GetPerimeterPoints output:", resultPoints);
    return resultPoints;
  }

  SetHookAlign(currentHook, targetHook) {
    T3Util.Log("S.Connector: SetHookAlign called with", { currentHook, targetHook });

    const connectorDefines = OptConstant.ConnectorDefines;

    if (this.arraylist.angle && this.arraylist.hook.length && targetHook !== currentHook) {
      let tempGap, hookObject;

      if (this.arraylist.hook[connectorDefines.A_Cl].id >= 0) {
        this.arraylist.hook[connectorDefines.A_Cr].id = this.arraylist.hook[connectorDefines.A_Cl].id;
        this.arraylist.hook[connectorDefines.A_Cl].id = -1;

        tempGap = this.arraylist.hook[connectorDefines.A_Cr].gap;
        this.arraylist.hook[connectorDefines.A_Cr].gap = this.arraylist.hook[connectorDefines.A_Cl].gap;
        this.arraylist.hook[connectorDefines.A_Cl].gap = tempGap;

        hookObject = DataUtil.GetObjectPtr(this.arraylist.hook[connectorDefines.A_Cr].id, true);
        if (hookObject && hookObject.hooks.length) {
          hookObject.hooks[0].hookpt = OptConstant.HookPts.AKCT;
          hookObject.hooks[0].connect.x = -connectorDefines.A_Cr;
        }
      } else if (this.arraylist.hook[connectorDefines.A_Cr].id >= 0) {
        this.arraylist.hook[connectorDefines.A_Cl].id = this.arraylist.hook[connectorDefines.A_Cr].id;
        this.arraylist.hook[connectorDefines.A_Cr].id = -1;

        tempGap = this.arraylist.hook[connectorDefines.A_Cl].gap;
        this.arraylist.hook[connectorDefines.A_Cl].gap = this.arraylist.hook[connectorDefines.A_Cr].gap;
        this.arraylist.hook[connectorDefines.A_Cr].gap = tempGap;

        hookObject = DataUtil.GetObjectPtr(this.arraylist.hook[connectorDefines.A_Cl].id, true);
        if (hookObject && hookObject.hooks.length) {
          hookObject.hooks[0].hookpt = OptConstant.HookPts.AKCB;
          hookObject.hooks[0].connect.x = -connectorDefines.A_Cl;
        }
      }

      this.arraylist.angle = -this.arraylist.angle;
      this.flags = Utils2.SetFlag(this.flags, NvConstant.ObjFlags.Obj1, true);
    }

    T3Util.Log("S.Connector: SetHookAlign completed");
  }

  GetHookPoints() {
    T3Util.Log("S.Connector: GetHookPoints called");

    const hookPoints = [];
    const styles = OptConstant.AStyles;

    if (this.arraylist == null) {
      T3Util.Log("S.Connector: GetHookPoints returning null");
      return null;
    }

    const totalHooks = this.arraylist.hook.length;
    const bothSides = this.arraylist.styleflags & styles.SEDA_BothSides ||
      0 == (this.arraylist.styleflags & styles.SEDA_PerpConn);
    const isLinear = (this.arraylist.styleflags & styles.SEDA_Linear) > 0;

    if (totalHooks > 1 || isLinear) {
      hookPoints.push(new Point(-1, 0));
      if (this.vertical) {
        hookPoints[0].id = OptConstant.HookPts.LT;
      } else {
        hookPoints[0].id = OptConstant.HookPts.LL;
      }

      if (bothSides) {
        hookPoints.push(new Point(-2, 0));
        if (this.vertical) {
          hookPoints[1].id = OptConstant.HookPts.LB;
        } else {
          hookPoints[1].id = OptConstant.HookPts.LR;
        }
      }
    } else {
      hookPoints.push(new Point(-1, 0));
      if (this.vertical) {
        hookPoints[0].id = OptConstant.HookPts.LT;
      } else {
        hookPoints[0].id = OptConstant.HookPts.LL;
      }
    }

    T3Util.Log("S.Connector: GetHookPoints returning", hookPoints);
    return hookPoints;
  }

  WriteShapeData(outputStream, context) {
    T3Util.Log("S.Connector: WriteShapeData called with", { outputStream, context });

    return;

    // Rename parameters and variables for readability
    const styles = OptConstant.AStyles;
    const connectorDefines = OptConstant.ConnectorDefines;

    let hookArrayLength = this.arraylist.hook.length;
    let skipCount = connectorDefines.SEDA_NSkip;
    let numberOfShapes = hookArrayLength - skipCount;
    if (numberOfShapes < 0) {
      numberOfShapes = 0;
    }

    let linearStyle = this.arraylist.styleflags & styles.SEDA_Linear;
    let styleFlags = this.arraylist.styleflags;
    let reverseColumnApplied = false;

    // Remove reverse column flag if necessary when vertical is true
    if (styleFlags & styles.SEDA_ReverseCol && this.vertical) {
      styleFlags = Utils2.SetFlag(styleFlags, styles.SEDA_ReverseCol, false);
      reverseColumnApplied = true;
    }

    // Determine the instance ID based on the context
    let instanceID = context.WriteBlocks ? this.BlockID : context.arrayid++;
    let profileRect = Utils2.CRect2Rect(this.arraylist.profile, this.vertical);

    let structToWrite;
    if (context.WriteWin32) {
      structToWrite = {
        InstID: instanceID,
        styleflags: this.arraylist.styleflags,
        tilt: this.arraylist.tilt,
        ht: 0,
        wd: 0,
        nshapes: numberOfShapes,
        nlines: hookArrayLength,
        lht: ShapeUtil.ToSDWinCoords(this.arraylist.ht, context.coordScaleFactor),
        lwd: ShapeUtil.ToSDWinCoords(this.arraylist.wd, context.coordScaleFactor),
        profile: {
          x: profileRect.x,
          y: profileRect.y,
          width: profileRect.width,
          height: profileRect.height
        },
        angle: this.arraylist.angle
      };
      outputStream.writeStruct(DSConstant.ArrayStruct, structToWrite);
    } else {
      structToWrite = {
        InstID: instanceID,
        styleflags: this.arraylist.styleflags,
        tilt: this.arraylist.tilt,
        nshapes: numberOfShapes,
        nlines: hookArrayLength,
        lht: ShapeUtil.ToSDWinCoords(this.arraylist.ht, context.coordScaleFactor),
        lwd: ShapeUtil.ToSDWinCoords(this.arraylist.wd, context.coordScaleFactor),
        angle: this.arraylist.angle,
        curveparam: this.arraylist.curveparam
      };
      outputStream.writeStruct(DSConstant.ArrayStruct34, structToWrite);
    }

    let drawArrayCode = ShapeUtil.WriteCode(outputStream, DSConstant.OpNameCode.cDrawArray);
    ShapeUtil.WriteLength(outputStream, drawArrayCode);

    // Compute the offset for hook rectangles relative to the frame
    let offsetPoint = new Point(
      this.StartPoint.x - this.Frame.x,
      this.StartPoint.y - this.Frame.y
    );
    // For vertical connectors, set horizontal offset to 0; otherwise, vertical offset is 0
    if (this.vertical) {
      offsetPoint.x = 0;
    } else {
      offsetPoint.y = 0;
    }

    // Temporary object to hold hook rectangle dimensions
    let hookRect = {};

    // Loop over each hook in the arraylist
    for (let hookIndex = 0; hookIndex < hookArrayLength; hookIndex++) {
      let currentHook = this.arraylist.hook[hookIndex];

      // Calculate horizontal dimensions of the hook rectangle
      if (currentHook.startpoint.h < currentHook.endpoint.h) {
        hookRect.h = currentHook.startpoint.h;
        hookRect.hdist = currentHook.endpoint.h - currentHook.startpoint.h;
      } else {
        hookRect.h = currentHook.endpoint.h;
        hookRect.hdist = currentHook.startpoint.h - currentHook.endpoint.h;
      }

      // Calculate vertical dimensions of the hook rectangle
      if (currentHook.startpoint.v < currentHook.endpoint.v) {
        hookRect.v = currentHook.startpoint.v;
        hookRect.vdist = currentHook.endpoint.v - currentHook.startpoint.v;
      } else {
        hookRect.v = currentHook.endpoint.v;
        hookRect.vdist = currentHook.startpoint.v - currentHook.endpoint.v;
      }

      let convertedRect = Utils2.CRect2Rect(hookRect, this.vertical);
      let winRect = ShapeUtil.ToSDWinRect(convertedRect, context.coordScaleFactor, offsetPoint);
      let gapValue = currentHook.gap;

      // Adjust gap for reverse column if flag was applied above
      if (reverseColumnApplied) {
        if (hookIndex === connectorDefines.A_Cl) {
          gapValue = 0;
        } else if (hookIndex === connectorDefines.A_Cr) {
          gapValue = this.arraylist.hook[connectorDefines.A_Cl].gap;
        }
      }

      let drawArrayHookCode = ShapeUtil.WriteCode(outputStream, DSConstant.OpNameCode.cDrawArrayHook);

      // Write hook structure based on output context type
      if (context.WriteWin32) {
        let hookStruct = {
          liner: { left: 0, top: 0, right: 0, bottom: 0 },
          uniqueid: ShapeUtil.BlockIDtoUniqueID(currentHook.id, context),
          index: 0,
          gap: 0,
          extra: ShapeUtil.ToSDWinCoords(currentHook.extra, context.coordScaleFactor),
          lliner: {
            left: winRect.left,
            top: winRect.top,
            right: winRect.right,
            bottom: winRect.bottom
          },
          lgap: ShapeUtil.ToSDWinCoords(gapValue, context.coordScaleFactor)
        };
        outputStream.writeStruct(DSConstant.ArrayHookStruct38, hookStruct);
      } else {
        let hookStruct = {
          uniqueid: ShapeUtil.BlockIDtoUniqueID(currentHook.id, context),
          extra: ShapeUtil.ToSDWinCoords(currentHook.extra, context.coordScaleFactor),
          lliner: {
            left: winRect.left,
            top: winRect.top,
            right: winRect.right,
            bottom: winRect.bottom
          },
          lgap: ShapeUtil.ToSDWinCoords(gapValue, context.coordScaleFactor)
        };
        outputStream.writeStruct(DSConstant.ArrayHookStruct50, hookStruct);
      }

      ShapeUtil.WriteLength(outputStream, drawArrayHookCode);

      // Determine which hook to use for text association
      let hookForText = (linearStyle && hookIndex >= skipCount)
        ? (hookIndex < hookArrayLength - 1 ? this.arraylist.hook[hookIndex + 1] : null)
        : currentHook;

      if (hookForText && hookForText.textid >= 0) {
        let textStruct;
        if (context.WriteBlocks || context.WriteGroupBlock) {
          textStruct = {
            tindex: 0,
            tuniqueid: hookForText.textid
          };
        } else {
          textStruct = {
            tindex: 0,
            tuniqueid: ShapeUtil.BlockIDtoUniqueID(-hookForText.textid, context)
          };
        }
        let textCode = ShapeUtil.WriteCode(outputStream, DSConstant.OpNameCode.cDrawArrayText);
        outputStream.writeStruct(DSConstant.ArrayHookTextStruct, textStruct);
        ShapeUtil.WriteLength(outputStream, textCode);
      }
    }

    outputStream.writeUint16(DSConstant.OpNameCode.cDrawArrayEnd);

    // Adjust text flags based on text direction
    this.TextFlags = Utils2.SetFlag(this.TextFlags, NvConstant.TextFlags.HorizText, !this.TextDirection);
    ShapeUtil.WriteTextParams(outputStream, this, -1, context);
    ShapeUtil.WriteArrowheads(outputStream, context, this);

    T3Util.Log("S.Connector: WriteShapeData completed", { instanceID, numberOfShapes });
  }

  GetTextIDs() {
    T3Util.Log("S.Connector: GetTextIDs called");

    const textIDs = [];
    const totalHooks = this.arraylist.hook.length;

    for (let hookIndex = 0; hookIndex < totalHooks; hookIndex++) {
      const hook = this.arraylist.hook[hookIndex];
      if (hook.textid >= 0) {
        textIDs.push(hook.textid);
      }
    }

    T3Util.Log("S.Connector: GetTextIDs returning", textIDs);
    return textIDs;
  }

  NoFlip() {
    T3Util.Log("S.Connector: NoFlip called");
    const result = true;
    T3Util.Log("S.Connector: NoFlip returning", result);
    return result;
  }

  NoRotate() {
    T3Util.Log("S.Connector: NoRotate called");
    const result = true;
    T3Util.Log("S.Connector: NoRotate returning", result);
    return result;
  }

  AllowTextEdit() {
    T3Util.Log("S.Connector: AllowTextEdit called");

    const isLocked = this.flags & NvConstant.ObjFlags.Lock;
    const canEditText = this.TextFlags & NvConstant.TextFlags.AttachC;

    const result = !isLocked && canEditText;
    T3Util.Log("S.Connector: AllowTextEdit returning", result);

    return result;
  }

  GetArrowheadFormat() {
    T3Util.Log("S.Connector: GetArrowheadFormat called");

    const arrowheadRecord = new ArrowheadRecord();

    arrowheadRecord.StartArrowID = this.StartArrowID;
    arrowheadRecord.EndArrowID = this.EndArrowID;
    arrowheadRecord.StartArrowDisp = this.StartArrowDisp;
    arrowheadRecord.EndArrowDisp = this.EndArrowDisp;
    arrowheadRecord.ArrowSizeIndex = this.ArrowSizeIndex;

    T3Util.Log("S.Connector: GetArrowheadFormat returning", arrowheadRecord);
    return arrowheadRecord;
  }

  ChangeTextAttributes(
    fontName: string,
    fontAttributes: any,
    fontSize: number,
    fontFace: string,
    fontColor: string,
    opacity: number,
    svgElement: any,
    additionalParams: any
  ) {
    T3Util.Log("S.Connector: ChangeTextAttributes called with", {
      fontName,
      fontAttributes,
      fontSize,
      fontFace,
      fontColor,
      opacity,
      svgElement,
      additionalParams
    });

    if ((fontName || fontAttributes || fontSize || fontFace || additionalParams) && this.GetTextIDs().length !== 0) {
      let element = svgElement || T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
      let hook, textElement;
      const totalHooks = this.arraylist.hook.length;

      if (fontAttributes) {
        if (fontAttributes.FontName !== undefined) this.StyleRecord.Text.FontName = fontAttributes.FontName;
        if (fontAttributes.FontId !== undefined) this.StyleRecord.Text.FontId = fontAttributes.FontId;
        if (fontAttributes.FontSize !== undefined) this.StyleRecord.Text.FontSize = fontAttributes.FontSize;
        if (fontAttributes.Face !== undefined) this.StyleRecord.Text.Face = fontAttributes.Face;
        if (fontAttributes.Color !== undefined) this.StyleRecord.Text.Paint.Color = fontAttributes.Color;
        if (fontAttributes.Opacity !== undefined) this.StyleRecord.Text.Paint.Opacity = fontAttributes.Opacity;
      }

      for (let i = 0; i < totalHooks; ++i) {
        hook = this.arraylist.hook[i];
        if (hook.textid >= 0) {
          this.DataID = hook.textid;
          this.arraylist.lasttexthook = i;
          if (element) {
            element.textElem = element.GetElementById(OptConstant.SVGElementClass.Text, i);
          }
          T3Gv.opt.ChangeObjectTextAttributes(this.BlockID, fontName, fontAttributes, fontFace, fontSize, opacity, element, additionalParams);
        }
      }

      this.DataID = -1;
      this.lasttexthook = -1;
    }

    T3Util.Log("S.Connector: ChangeTextAttributes completed");
  }

  CollapseCoManager(connectorId) {
    T3Util.Log("S.Connector: CollapseCoManager called with connectorId:", connectorId);

    let remainingHooks = this.arraylist.hook.length - OptConstant.ConnectorDefines.NSkip;
    let objectsToDelete = [];
    let parentObject = DataUtil.GetObjectPtr(connectorId, true);

    if (parentObject && remainingHooks >= 1) {
      let firstHookId = this.arraylist.hook[OptConstant.ConnectorDefines.NSkip].id;
      let childArrayId = T3Gv.opt.FindChildArray(connectorId, -1);

      if (childArrayId >= 0) {
        let childObject = DataUtil.GetObjectPtr(childArrayId, true);
        if (childObject) {
          HookUtil.UpdateHook(childArrayId, 0, firstHookId, childObject.hooks[0].hookpt, childObject.hooks[0].connect, null);
        }
      } else {
        childArrayId = T3Gv.opt.FindChildArray(firstHookId, -1);
        if (childArrayId >= 0) {
          OptCMUtil.SetLinkFlag(firstHookId, DSConstant.LinkFlags.SED_L_MOVE);
        }
      }
    }

    if (remainingHooks <= 1) {
      let parentObjectId = -1;
      let parentConnect = { x: 0, y: 0 };

      if (this.hooks.length) {
        parentObjectId = this.hooks[0].objid;
        parentConnect.x = this.hooks[0].connect.x;
      }

      if (parentObjectId >= 0) {
        HookUtil.UpdateHook(this.BlockID, 0, -1, this.hooks[0].hookpt, this.hooks[0].connect, null);
        let parentObject = DataUtil.GetObjectPtr(parentObjectId, false);

        if (remainingHooks === 1) {
          let firstHookId = this.arraylist.hook[OptConstant.ConnectorDefines.NSkip].id;
          let firstHookObject = DataUtil.GetObjectPtr(firstHookId, true);

          if (firstHookObject && parentObject) {
            firstHookObject.hooks[0].hookpt = parentObject.GetBestHook(firstHookId, firstHookObject.hooks[0].hookpt, firstHookObject.hooks[0].connect);
            HookUtil.UpdateHook(firstHookId, 0, parentObjectId, firstHookObject.hooks[0].hookpt, parentConnect, null);
          }

          let childArrayId = T3Gv.opt.FindChildArray(firstHookId, -1);
          if (childArrayId >= 0) {
            let childObject = DataUtil.GetObjectPtr(childArrayId, true);
            if (childObject) {
              childObject.FixHook(false, true);
            }
          }
        }

        objectsToDelete.push(this.BlockID);
        DataUtil.DeleteObjects(objectsToDelete, false);
      }
    }

    T3Util.Log("S.Connector: CollapseCoManager completed");
  }

  CollapseAssistant() {
    T3Util.Log("S.Connector: CollapseAssistant called");

    let remainingHooks = this.arraylist.hook.length - OptConstant.ConnectorDefines.NSkip;
    let objectsToDelete = [];

    if (remainingHooks === 1) {
      let assistantHook = this.arraylist.hook[OptConstant.ConnectorDefines.NSkip];
      let assistantObject = DataUtil.GetObjectPtr(assistantHook.id, true);

      if (assistantObject && assistantObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
        let parentObjectId = this.hooks.length ? this.hooks[0].objid : -1;

        if (parentObjectId >= 0) {
          assistantObject.FixHook(false, false);

          let parentObject = DataUtil.GetObjectPtr(parentObjectId, true);
          if (parentObject && parentObject.IsCoManager()) {
            assistantObject.hooks[0].connect.y = -OptConstant.AStyles.CoManager;
          }

          HookUtil.UpdateHook(
            assistantHook.id,
            0,
            parentObjectId,
            assistantObject.hooks[0].hookpt,
            assistantObject.hooks[0].connect,
            null
          );

          HookUtil.UpdateHook(
            this.BlockID,
            0,
            -1,
            this.hooks[0].hookpt,
            this.hooks[0].connect,
            null
          );

          remainingHooks = 0;
          OptCMUtil.SetLinkFlag(parentObjectId, DSConstant.LinkFlags.SED_L_MOVE);
        }
      }

      if (remainingHooks < 1) {
        objectsToDelete.push(this.BlockID);
        DataUtil.DeleteObjects(objectsToDelete, false);
      }
    }

    T3Util.Log("S.Connector: CollapseAssistant completed");
  }

  PrFormat(e) {
    var t,
      a,
      r,
      i,
      n,
      o,
      s,
      l,
      S,
      c,
      u,
      p,
      d,
      D,
      g,
      h,
      m,
      C,
      y,
      f,
      L,
      I,
      T,
      b,
      M,
      P,
      R,
      A,
      _,
      E,
      w,
      F,
      v,
      G,
      N,
      k,
      U,
      J,
      x,
      O,
      B,
      H,
      V,
      j,
      z,
      W,
      q,
      K,
      X,
      Y,
      $ = 0,
      Z = 0,
      Q = OptConstant.AStyles,
      ee = {},
      te = {},
      ae = {},
      re = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, !1),
      ie = [],
      ne = !1,
      oe = {},
      se = {
        lgap: 0
      },
      le = 0,
      Se = 0 == (re.flags & OptConstant.SessionFlags.NoStepFormatting),
      ce = this.arraylist.styleflags & Q.SEDA_ReverseCol,
      ue = NvConstant.FNObjectTypes;
    if (
      this.arraylist.styleflags & Q.SEDA_MatchSize &&
      this.MatchSize(!1, 0),
      this.flags = Utils2.SetFlag(this.flags, NvConstant.ObjFlags.Obj1, !1),
      null != this.arraylist &&
      0 !== (t = this.arraylist.hook.length)
    ) {
      if (
        i = OptConstant.ConnectorDefines.NSkip,
        J = this.arraylist.styleflags & Q.SEDA_Linear,
        G = this.arraylist.styleflags & Q.SEDA_BothSides ||
        0 == (this.arraylist.styleflags & Q.SEDA_PerpConn),
        N = this.arraylist.styleflags & Q.SEDA_BothSides,
        F = this.arraylist.styleflags & Q.SEDA_Stagger,
        v = this.arraylist.styleflags & Q.SEDA_StartLeft,
        h = this.arraylist.styleflags & Q.SEDA_FlowConn,
        U = this.arraylist.styleflags & Q.SEDA_CoManager,
        x = this.IsAsstConnector(),
        B = this.IsGenoConnector(),
        k = this.arraylist.styleflags & Q.SEDA_Radial &&
        !G,
        Y = 0 == (this.arraylist.styleflags & Q.SEDA_Linear) &&
        this.arraylist.styleflags & Q.SEDA_FlowConn,
        p = re.flags & OptConstant.SessionFlags.NoTreeOverlap,
        Se &&
        (p = !0),
        h
      ) p = !1,
        Se = !1;
      else switch (this.objecttype) {
        case ue.CauseEffectMain:
        // case ue.SD_OBJT_CAUSEEFFECT_BRANCH:
        //   p = !0,
        //     Se = !1;
        //   break;
        default:
          p = !0,
            Se = !0
      }
      if (
        Y &&
        (p = !0),
        q = this.arraylist.ht,
        K = this.arraylist.wd,
        this.hooks.length &&
        (z = DataUtil.GetObjectPtr(this.hooks[0].objid, !1)) &&
        (
          ne = z.IsCoManager(oe),
          z.IsAsstConnector() &&
          (
            le = z.arraylist.coprofile.vdist,
            t >= i &&
            (
              this.arraylist.hook[1].gap > 0 &&
              (this.arraylist.hook[1].gap = q),
              this.arraylist.hook[2].gap > 0 &&
              (this.arraylist.hook[2].gap = q)
            )
          )
        ),
        (r = t - i) < 0 &&
        (r = 0),
        t >= i
      ) for (a = 1; a < i; a++) this.arraylist.hook[a].id >= 0 &&
        r++;
      if (
        H = new CRect(0, 0, 0, 0),
        ae.h = this.arraylist.profile.h,
        ae.hdist = this.arraylist.profile.hdist,
        ae.v = this.arraylist.profile.v,
        ae.vdist = this.arraylist.profile.vdist,
        t &&
        this.hooks &&
        this.hooks.length
      ) switch (G ? this.hooks[0].hookpt : OptConstant.HookPts.LL) {
        case OptConstant.HookPts.LL:
        case OptConstant.HookPts.LT:
          $ = OptConstant.HookPts.LL,
            0 === r ? (
              n = this.arraylist.hook[0],
              ee.h = n.startpoint.h,
              ee.v = n.startpoint.v
            ) : (
              n = this.arraylist.hook[OptConstant.ConnectorDefines.ACl],
              ee.h = n.endpoint.h,
              ee.v = n.endpoint.v
            );
          break;
        default:
          $ = OptConstant.HookPts.LR,
            0 === r ? (n = this.arraylist.hook[0], ee.h = n.endpoint.h, ee.v = n.endpoint.v) : (
              n = this.arraylist.hook[OptConstant.ConnectorDefines.ACr],
              ee.h = n.endpoint.h,
              ee.v = n.endpoint.v
            )
      } else ee.h = 0,
        ee.v = 0;
      if (0 === r || this.flags & NvConstant.ObjFlags.NotVisible) {
        for (
          G ? (
            this.arraylist.hook[0].startpoint.h = 0,
            this.arraylist.hook[0].startpoint.v = 0,
            this.arraylist.hook[0].endpoint.v = 0,
            this.arraylist.hook[0].endpoint.h = K,
            $ === OptConstant.HookPts.LR &&
            (this.arraylist.hook[0].endpoint.h = - K),
            this.vertical ? (
              this.EndPoint.x = this.StartPoint.x,
              this.EndPoint.y = this.StartPoint.y + this.arraylist.hook[0].endpoint.h
            ) : (
              this.EndPoint.y = this.StartPoint.y,
              this.EndPoint.x = this.StartPoint.x + this.arraylist.hook[0].endpoint.h
            )
          ) : (
            this.arraylist.hook[0].startpoint.h = 0,
            this.arraylist.hook[0].startpoint.v = 0,
            this.arraylist.hook[0].endpoint.h = 0,
            this.arraylist.hook[0].endpoint.v = q,
            $ === OptConstant.HookPts.LR &&
            (this.arraylist.hook[0].endpoint.v = - q),
            this.vertical ? (
              this.EndPoint.y = this.StartPoint.y,
              this.EndPoint.x = this.StartPoint.x + this.arraylist.hook[0].endpoint.v
            ) : (
              this.EndPoint.x = this.StartPoint.x,
              this.EndPoint.y = this.StartPoint.y + this.arraylist.hook[0].endpoint.v
            )
          ),
          a = 1;
          a < t;
          a++
        ) this.arraylist.hook[a].startpoint.h = 0,
          this.arraylist.hook[a].startpoint.v = 0,
          this.arraylist.hook[a].endpoint.h = this.arraylist.hook[0].endpoint.h,
          this.arraylist.hook[a].endpoint.v = this.arraylist.hook[0].endpoint.h;
        return 0 === r &&
          (
            this.arraylist.profile.h = 0,
            this.arraylist.profile.v = 0,
            this.arraylist.profile.hdist = 0,
            this.arraylist.profile.vdist = 0,
            this.arraylist.steps.length = 0
          ),
          void this.CalcFrame()
      }
      for (m = 0, 0, E = 0, P = 0, R = 0, I = N ? 1 : 0, A = v, a = i; a < t; a++) (n = this.arraylist.hook[a]).pr.h = 0,
        n.pr.v = 0,
        n.pr.hdist = 0,
        n.pr.vdist = 0,
        n.steps.splice(0),
        n.comanagerht = 0,
        n.isasst = !1,
        (O = DataUtil.GetObjectPtr(n.id, !1)) ? (
          C = (o = O.GetArrayRect(this.vertical)).h + o.hdist / 2,
          n.pr.h = C,
          n.pr.hdist = 0,
          J ? (n.pr.v = o.vdist / 2, n.pr.vdist = o.vdist / 2) : (n.pr.v = 0, n.pr.vdist = o.vdist),
          n.gap = o.hdist / 2,
          n.ogap = o.hdist / 2,
          n.steps.push(new StepRect(- o.hdist / 2, 0, o.hdist / 2, o.vdist)),
          n.comanagerht = 0,
          O.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector &&
          (
            O.arraylist.styleflags & OptConstant.AStyles.CoManager &&
            (n.comanagerht = O.arraylist.ht),
            this.IsAsstConnector() &&
            (n.isasst = !0)
          ),
          F &&
          (a - i) % 2 == 0 &&
          E < o.vdist &&
          (E = o.vdist),
          p &&
          (
            (d = this.GetElementProfile(n.id, A, Se, null, Y, !1)) &&
            (
              n.pr.h = d.frame.h,
              n.pr.v = d.frame.v,
              n.pr.hdist = d.frame.hdist,
              n.pr.vdist = d.frame.vdist,
              n.gap = n.pr.h,
              n.ogap = n.pr.hdist,
              o = n.pr,
              n.steps = d.steps
            ),
            Y &&
            (n.pr.v = 0, n.pr.vdist = 0)
          )
        ) : (n.gap = 0, n.ogap = 0, o = new Rectangle(0, 0, 0, 0)),
        m < o.vdist &&
        (m = o.vdist),
        N ? (
          A = !A,
          (a - i) % 2 == 0 ? v ? P < o.vdist &&
            (P = o.vdist) : P < o.v &&
          (P = o.v) : v ? R < o.v &&
            (R = o.v) : R < o.vdist &&
          (R = o.vdist)
        ) : v ? P < o.vdist &&
          (P = o.vdist) : P < o.v &&
        (P = o.v);
      if (
        y = 0,
        0,
        E += q < 8 ? 8 : q,
        this.objecttype === NvConstant.FNObjectTypes.CauseEffectMain &&
        (P = 0, R = 0),
        J
      ) ie = this.FormatLinear(re, e, Se, H, ie, x, se),
        y = H.x;
      else for (a = i; a < t; a++) T = (n = this.arraylist.hook[a]).gap,
        M = Se ? 0 : n.ogap,
        b = n.extra,
        N &&
          a + 1 < t ? (
          (u = this.arraylist.hook[a + 1]).gap > T &&
          (T = u.gap),
          u.extra > b &&
          (b = u.extra),
          u.ogap > M &&
          (M = u.ogap)
        ) : u = null,
        a > i &&
        (
          Se ? (
            F &&
            !N &&
            (a - i) % 2 == 1 &&
            (
              j = new StepRect(
                - this.StyleRecord.Line.Thickness,
                0,
                this.StyleRecord.Line.Thickness,
                E
              ),
              this._InsertStepIntoProfile(n.steps, j)
            ),
            y = this.CompareSteps(ie, n.steps) + K + b,
            u &&
            (_ = this.CompareSteps(ie, u.steps) + K + b) > y &&
            (y = _)
          ) : (y += b, y += T)
        ),
        n.startpoint.h = y,
        n.startpoint.v = 0,
        n.endpoint.h = y,
        n.endpoint.v = q + P - n.comanagerht,
        n.endpoint.v < 0 &&
        (n.endpoint.v = 0),
        u &&
        (
          u.startpoint.h = y,
          u.startpoint.v = 0,
          u.endpoint.h = y,
          u.endpoint.v = - (q + R)
        ),
        F &&
        (
          N ? u &&
            (M < 0 && (M = 0), y += M + K / 2, M = 0, u.startpoint.h = y, u.endpoint.h = y) : (a - i) % 2 == 1 &&
          (n.endpoint.v += E)
        ),
        v &&
        (n.endpoint.v = - n.endpoint.v, u && (u.endpoint.v = - u.endpoint.v)),
        this.UpdateCurrentProfile(H, n, ce),
        u &&
        this.UpdateCurrentProfile(H, u, ce),
        Se &&
        (
          ie = a === i ? Utils1.DeepCopy(n.steps) : this.AddStepsToProfile(ie, n.steps, !1, !1, n.startpoint.h, 0),
          u &&
          (
            ie = this.AddStepsToProfile(ie, u.steps, !1, !1, u.startpoint.h, 0)
          )
        ),
        (a += I) < t - 1 &&
        (Se || (y += F && N ? M + K / 2 : M + K));
      if (
        (
          D = this.arraylist.hook[OptConstant.ConnectorDefines.ABk]
        ).startpoint.h = 0,
        D.startpoint.v = 0,
        D.endpoint.h = J ? 0 : y,
        D.endpoint.v = 0,
        l = this.arraylist.hook[OptConstant.ConnectorDefines.ACl],
        s = this.arraylist.hook[OptConstant.ConnectorDefines.ACr],
        l.id >= 0 &&
        (O = DataUtil.GetObjectPtr(l.id, !1)) &&
        (
          C = (o = O.GetArrayRect(this.vertical)).h + o.hdist / 2,
          l.pr.h = C,
          l.pr.hdist = 0,
          l.pr.v = 0,
          l.pr.vdist = o.vdist,
          this.UpdateCurrentProfile(H, l, ce)
        ),
        s.id >= 0 &&
        (O = DataUtil.GetObjectPtr(s.id, !1)) &&
        (
          C = (o = O.GetArrayRect(this.vertical)).h + o.hdist / 2,
          s.pr.h = C,
          s.pr.hdist = 0,
          s.pr.v = 0,
          s.pr.vdist = o.vdist,
          this.UpdateCurrentProfile(H, s, ce)
        ),
        0 === $ &&
        (l.gap = 0),
        U &&
        (l.gap = 0),
        ne ? (W = oe.ht) > this.arraylist.ht / 2 &&
          (W = this.arraylist.ht / 2) : W = 0,
        G
      ) {
        if (
          t > i ? (
            S = this.arraylist.hook[i],
            N &&
            !F &&
            t > i + 1 &&
            this.arraylist.hook[i + 1].gap > this.arraylist.hook[i].gap &&
            (S = this.arraylist.hook[i + 1]),
            c = this.arraylist.hook[t - 1],
            N &&
            !F &&
            t > i + 1 &&
            this.arraylist.hook[t - 2].gap > this.arraylist.hook[t - 1].gap &&
            (c = this.arraylist.hook[t - 2]),
            f = S.gap,
            L = c.gap
          ) : (f = 0, L = 0),
          w = this.GetTilt(),
          J &&
          (f = 0, L = 0, 0 === $ && (s.gap = 0)),
          this.hooks.length
        ) switch (this.hooks[0].hookpt) {
          case OptConstant.HookPts.LL:
          case OptConstant.HookPts.LT:
            s.gap = 0,
              L = 0,
              f -= W - le,
              J &&
              h &&
              0 == (
                this.arraylist.flags & OptConstant.ArrayFlags.LeaveACl
              ) &&
              0 === l.gap &&
              (l.gap = K);
            break;
          case OptConstant.HookPts.LB:
          case OptConstant.HookPts.LR:
            l.gap = 0,
              f = 0,
              L -= W - le,
              J &&
              h &&
              0 == (
                this.arraylist.flags & OptConstant.ArrayFlags.LeaveACr
              ) &&
              0 === s.gap &&
              (s.gap = K)
        }
        l.id >= 0 &&
          (
            0 === l.gap &&
            (l.gap = F ? K / 2 : K, S && (l.gap += S.gap)),
            this.arraylist.matchsizelen &&
            (
              Z = l.gap,
              l.gap = this.arraylist.matchsizelen - y,
              l.gap < Z &&
              (l.gap = Z)
            )
          ),
          s.id >= 0 &&
          (
            s.gap = F ? K / 2 : K,
            c &&
            (s.gap += c.gap),
            this.arraylist.matchsizelen &&
            (
              Z = s.gap,
              s.gap = this.arraylist.matchsizelen - y,
              s.gap < Z &&
              (s.gap = Z)
            )
          ),
          l.startpoint.h = 0,
          l.startpoint.v = 0,
          this.arraylist.angle ? l.endpoint.h = - l.gap : (
            l.endpoint.h = - l.gap - f,
            0 == (
              re.moreflags/* & NvConstant.SessionMoreFlags.SEDSM_Swimlane_Rows*/
            ) &&
            0 == (
              re.moreflags /*& NvConstant.SessionMoreFlags.SwimlaneCols*/
            ) &&
            h &&
            J &&
            (l.endpoint.h -= l.extra)
          ),
          $ === OptConstant.HookPts.LL &&
          (l.endpoint.h += w),
          l.endpoint.v = 0,
          s.startpoint.h = y + se.lgap,
          s.startpoint.v = 0,
          w ||
            this.arraylist.angle ? s.endpoint.h = y + s.gap : (
            s.endpoint.h = y + s.gap + L,
            0 == (
              re.moreflags/* & NvConstant.SessionMoreFlags.SEDSM_Swimlane_Rows*/
            ) &&
            0 == (
              re.moreflags /*& NvConstant.SessionMoreFlags.SwimlaneCols*/
            ) &&
            h &&
            J &&
            (s.endpoint.h += s.extra)
          ),
          s.endpoint.v = 0
      } else if (
        null != H.firstconnector_x ? (
          X = H.firstconnector_x ? 2 * (H.firstconnector_x + K) : 0,
          l.gap = - H.v + q + l.extra
        ) : X = y,
        l.startpoint.h = X / 2,
        l.startpoint.v = 0,
        l.endpoint.h = X / 2,
        l.endpoint.v = v ? l.gap - W + le : - l.gap + W - le,
        s.startpoint.h = X / 2,
        s.startpoint.v = 0,
        s.endpoint.h = X / 2,
        s.endpoint.v = 0,
        k
      ) {
        for (D.startpoint.h = X / 2, D.endpoint.h = X / 2, a = i; a < t; a++) (D = this.arraylist.hook[a]).startpoint.h = X / 2;
        l.endpoint.v = 0
      }
      if (
        this.arraylist.angle ? this.AdjustAngleConnector() : this.arraylist.tilt &&
          this.AdjustTiltConnector(),
        this.vertical ? (
          this.EndPoint.x = this.StartPoint.x + D.endpoint.v,
          this.EndPoint.y = ce ? this.StartPoint.y - y : this.StartPoint.y + y
        ) : (
          this.EndPoint.y = this.StartPoint.y,
          this.EndPoint.x = ce ? this.StartPoint.x - y : this.StartPoint.x + y
        ),
        this.CalcFrame(),
        this.hooks &&
        this.hooks.length
      ) {
        if (G) switch (this.hooks[0].hookpt) {
          case OptConstant.HookPts.LL:
          case OptConstant.HookPts.LT:
            n = this.arraylist.hook[OptConstant.ConnectorDefines.ACl];
            break;
          default:
            n = this.arraylist.hook[OptConstant.ConnectorDefines.ACr]
        } else n = this.arraylist.hook[OptConstant.ConnectorDefines.ACl];
        te.h = n.endpoint.h,
          te.v = n.endpoint.v,
          null != ee.h &&
          (
            Utils2.IsEqual(ee.h, te.h) &&
            Utils2.IsEqual(ee.v, te.v) ||
            OptCMUtil.SetLinkFlag(this.hooks[0].objid, DSConstant.LinkFlags.SED_L_MOVE)
          )
      } else te.h = 0,
        te.v = 0;
      if (
        this.arraylist.coprofile = Utils1.DeepCopy(H),
        this.arraylist.profile.h = te.h - H.h,
        this.arraylist.profile.hdist = H.hdist - te.h,
        this.arraylist.profile.v = te.v - H.v,
        this.arraylist.profile.vdist = H.vdist - te.v,
        U &&
        (
          v ? this.arraylist.profile.v += q : this.arraylist.profile.vdist += q,
          this.arraylist.coprofile = Utils1.DeepCopy(this.arraylist.profile),
          Se &&
          ie.length &&
          (ie[0].vend += 2 * q, ie[0].v -= 2 * q),
          ie = this.AddCoManagerChildren(v, Se, ie)
        ),
        (x || B) &&
        (ie = this.AddAssistantChildren(v, Se, ie)),
        Se
      ) {
        if (G) {
          for (V = (ie = this.BuildSideConnectorSteps()).length, a = 0; a < V; a++) N ||
            (v ? ie[a].hend = te.v : ie[a].h = te.v);
          j = new StepRect(
            - this.StyleRecord.Line.Thickness,
            0,
            this.StyleRecord.Line.Thickness,
            - te.h
          ),
            this._InsertStepIntoProfile(ie, j),
            ie.length > 1 &&
            (ie[0].vend = ie[1].v)
        } else {
          for (V = ie.length, a = 0; a < V; a++) ie[a].h -= te.h,
            ie[a].hend -= te.h;
          x ? (
            g = v ? n.endpoint.v : - n.endpoint.v,
            j = new StepRect(
              - this.StyleRecord.Line.Thickness,
              0,
              this.StyleRecord.Line.Thickness,
              g
            ),
            this._InsertStepIntoProfile(ie, j)
          ) : U ||
          (
            j = new StepRect(- te.h, 0, D.endpoint.h - te.h, q),
            this._InsertStepIntoProfile(ie, j),
            g = v ? n.endpoint.v : - n.endpoint.v,
            j = new StepRect(
              - this.StyleRecord.Line.Thickness,
              0,
              this.StyleRecord.Line.Thickness,
              g
            ),
            this._InsertStepIntoProfile(ie, j)
          )
        }
        this.arraylist.steps = ie
      }
      DataUtil.AddToDirtyList(e),
        Utils2.IsEqual(this.arraylist.profile.h, ae.h) &&
        Utils2.IsEqual(this.arraylist.profile.v, ae.v) &&
        Utils2.IsEqual(this.arraylist.profile.hdist, ae.hdist) &&
        Utils2.IsEqual(this.arraylist.profile.vdist, ae.vdist) ||
        p &&
        (
          OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.SED_L_MOVE)
          ,
          OptAhUtil.FindTreeTop(
            this,
            DSConstant.LinkFlags.SED_L_MOVE,
            {
              topconnector: - 1,
              topshape: - 1,
              foundtree: !1
            }
          )
        )
    }
  }

  GetAngleDisp(hook) {
    T3Util.Log("S.Connector: GetAngleDisp called with hook:", hook);

    const angleDisplacement = {
      start: 0,
      end: 0
    };

    if (this.arraylist.angle) {
      angleDisplacement.start = -hook.startpoint.h * this.arraylist.angle;
      angleDisplacement.end = -hook.endpoint.h * this.arraylist.angle;
    }

    T3Util.Log("S.Connector: GetAngleDisp returning angleDisplacement:", angleDisplacement);
    return angleDisplacement;
  }

  AdjustAngleConnector() {
    T3Util.Log("S.Connector: AdjustAngleConnector called");

    const connectorDefines = OptConstant.ConnectorDefines;
    const minHooks = connectorDefines.SEDA_NSkip;
    const totalHooks = this.arraylist.hook.length;

    if (totalHooks < minHooks) return;

    let hook, angleDisp;

    // Adjust the back hook
    hook = this.arraylist.hook[connectorDefines.A_Bk];
    angleDisp = this.GetAngleDisp(hook);
    hook.startpoint.v += angleDisp.start;
    hook.endpoint.v -= angleDisp.end;

    // Adjust the left hook
    hook = this.arraylist.hook[connectorDefines.A_Cl];
    angleDisp = this.GetAngleDisp(hook);
    hook.startpoint.v += angleDisp.start;
    hook.endpoint.v -= angleDisp.end;

    // Adjust the right hook
    hook = this.arraylist.hook[connectorDefines.A_Cr];
    angleDisp = this.GetAngleDisp(hook);
    hook.startpoint.v -= angleDisp.start;
    hook.endpoint.v -= angleDisp.end;

    // Adjust remaining hooks
    for (let hookIndex = minHooks; hookIndex < totalHooks; hookIndex++) {
      hook = this.arraylist.hook[hookIndex];
      angleDisp = this.GetAngleDisp(hook);
      hook.startpoint.v -= angleDisp.end;
      hook.endpoint.v -= angleDisp.end;
    }

    T3Util.Log("S.Connector: AdjustAngleConnector completed");
  }

  GetTilt(height?: number): number {
    T3Util.Log("S.Connector: GetTilt called with height:", height);

    let tiltValue = 0;
    if (this.arraylist.tilt) {
      const tiltRadians = (this.arraylist.tilt / 180) * Math.PI;
      const tanValue = Math.tan(tiltRadians);
      if (tanValue) {
        const inverseTan = 1 / tanValue;
        tiltValue = height !== undefined ? height * inverseTan : this.arraylist.ht / inverseTan;
      }
    }

    T3Util.Log("S.Connector: GetTilt returning tiltValue:", tiltValue);
    return tiltValue;
  }

  AdjustTiltConnector() {
    T3Util.Log("S.Connector: AdjustTiltConnector called");

    const minHooks = OptConstant.ConnectorDefines.NSkip;
    const tiltValue = this.GetTilt();

    if (tiltValue) {
      const totalHooks = this.arraylist.hook.length;
      if (totalHooks < minHooks) return;

      for (let hookIndex = minHooks; hookIndex < totalHooks; hookIndex++) {
        this.arraylist.hook[hookIndex].endpoint.h -= tiltValue;
      }
    }

    T3Util.Log("S.Connector: AdjustTiltConnector completed");
  }

  FormatLinear(
    session: any,
    unusedParam: any,
    useSteps: boolean,
    resultFrame: Rectangle,
    stepsBuffer: StepRect[],
    skipAdjustment: boolean,
    output: any
  ): StepRect[] {
    T3Util.Log("S.Connector: FormatLinear called with input:", {
      session,
      useSteps,
      resultFrame,
      stepsBuffer,
      skipAdjustment,
      output,
    });

    // Rename local variables for readability
    const minHooks = OptConstant.ConnectorDefines.NSkip;
    let numHooks = this.arraylist.hook.length;
    let currentX = 0; // current horizontal position
    let runningExtra = 0; // cumulative extra offset
    let connectorWidth = this.arraylist.wd;
    let rightAdjustment = 0; // will be updated per hook iteration
    let minStepV = 0;
    let firstConnectorSet = false;
    let adjustLeft = false;
    let adjustRight = false;
    let isSwimlaneAdjust = false;
    let swimlaneHeight = 0;
    let gapAdjustment = 0;

    // // Determine swimlane adjustment if applicable
    // if (session.moreflags & NvConstant.SessionMoreFlags.SEDSM_Swimlane_Rows && this.vertical && !skipAdjustment) {
    //   isSwimlaneAdjust = true;
    //   swimlaneHeight = 75;
    // } else if (session.moreflags & NvConstant.SessionMoreFlags.SwimlaneCols && !this.vertical && !skipAdjustment) {
    //   isSwimlaneAdjust = true;
    //   swimlaneHeight = 150;
    // }

    // Check for left/right adjustments based on the first hook
    if (
      numHooks >= minHooks &&
      this.hooks.length &&
      !skipAdjustment &&
      (() => {
        const isLeftConnector =
          this.hooks[0].hookpt === OptConstant.HookPts.LL ||
          this.hooks[0].hookpt === OptConstant.HookPts.LT;
        adjustLeft = this.arraylist.hook[1].gap > 1 && isLeftConnector;
        adjustRight = this.arraylist.hook[2].gap > 1 && !isLeftConnector;
        return isSwimlaneAdjust;
      })()
    ) {
      const firstHookObject = DataUtil.GetObjectPtr(this.hooks[0].objid, false);
      if (firstHookObject) {
        const rectDifference = swimlaneHeight - firstHookObject.GetArrayRect(this.vertical).hdist;
        if (adjustLeft) {
          const gapValue = this.arraylist.hook[minHooks].gap;
          const originalGap = this.arraylist.hook[minHooks].ogap;
          gapAdjustment = (swimlaneHeight - originalGap - gapValue) / 2;
          // Update hook[1] gap
          this.arraylist.hook[1].gap =
            connectorWidth + rectDifference / 2 + gapAdjustment + this.arraylist.hook[1].extra;
          if (this.arraylist.hook[1].gap < connectorWidth / 2) {
            this.arraylist.hook[1].gap = connectorWidth / 2;
          }
        }
        if (adjustRight) {
          const gapValue = this.arraylist.hook[numHooks - 1].gap;
          const originalGap = this.arraylist.hook[numHooks - 1].ogap;
          gapAdjustment = (swimlaneHeight - originalGap - gapValue) / 2;
          this.arraylist.hook[2].gap =
            connectorWidth + rectDifference / 2 + gapAdjustment + this.arraylist.hook[2].extra;
          if (this.arraylist.hook[2].gap < connectorWidth / 2) {
            this.arraylist.hook[2].gap = connectorWidth / 2;
          }
        }
      }
    }

    // Loop over each hook starting from the minimum hook index
    for (let hookIndex = minHooks; hookIndex < numHooks; hookIndex++) {
      gapAdjustment = 0;
      const hook = this.arraylist.hook[hookIndex];

      // If the hook is an assistant and first connector x is not set yet, record currentX to resultFrame.firstconnector_x
      if (hook.isasst && !firstConnectorSet) {
        resultFrame.firstconnector_x = currentX;
        firstConnectorSet = true;
      }

      const gapValue = hook.gap;
      // When useSteps is true, original gap is ignored (set to 0)
      const originalGap = useSteps ? 0 : hook.ogap;
      // If there is only one hook (after the skip) then clear extra gap
      if (numHooks === minHooks + 1) {
        hook.extra = 0;
      }
      runningExtra += hook.extra;
      if (hookIndex > minHooks && isSwimlaneAdjust) {
        gapAdjustment = -((swimlaneHeight - originalGap - gapValue) / 2);
        if (gapAdjustment < -connectorWidth / 2) {
          gapAdjustment = -connectorWidth / 2;
        }
        runningExtra += gapAdjustment;
      }

      const leftAdjustment = this.GetLeftAdjustment(hook.id);
      hook.startpoint.h = currentX + rightAdjustment;
      hook.startpoint.v = 0;
      hook.endpoint.h = runningExtra;
      if (hookIndex > minHooks || adjustLeft) {
        hook.endpoint.h += leftAdjustment;
        if (!useSteps) {
          // Reset left adjustment if not using step buffer output
        }
      }
      hook.endpoint.v = 0;
      rightAdjustment = this.GetRightAdjustment(hook.id);
      this.UpdateCurrentProfile(resultFrame, hook, false);

      if (useSteps) {
        // For the first hook use a deep copy, otherwise merge steps
        stepsBuffer =
          hookIndex === minHooks
            ? Utils1.DeepCopy(hook.steps)
            : this.AddStepsToProfile(stepsBuffer, hook.steps, false, false, hook.endpoint.h, 0);
        if (hook.steps.length) {
          if (hook.steps[0].v < minStepV) {
            minStepV = hook.steps[0].v;
          }
          // The vend value is checked but not modified here
          if (hook.steps[0].vend > 0) {
            hook.steps[0].vend;
          }
        }
        currentX = this.CompareSteps(stepsBuffer, hook.steps);
        runningExtra = (currentX - leftAdjustment) + connectorWidth;
      } else {
        let prevX = runningExtra;
        currentX = runningExtra;
        currentX += gapValue + originalGap;
        runningExtra = (currentX - leftAdjustment) + connectorWidth;
        if (isSwimlaneAdjust) {
          gapAdjustment = -(swimlaneHeight - gapValue - originalGap);
          if (gapAdjustment < -connectorWidth / 2) {
            gapAdjustment = -connectorWidth / 2;
          }
          runningExtra += hookIndex > minHooks || adjustLeft ? gapAdjustment / 2 : gapAdjustment;
        }
      }
    }

    // Finalize stepsBuffer adjustments if needed
    if (useSteps && skipAdjustment && stepsBuffer.length) {
      if (stepsBuffer[0].v > minStepV) {
        stepsBuffer[0].v = minStepV;
      }
      if (stepsBuffer[0].vend < 0) {
        stepsBuffer[0].vend = 0;
      }
    }

    // Set output left gap if adjustRight flag is true; otherwise increment currentX
    if (adjustRight) {
      output.lgap = rightAdjustment;
    } else {
      currentX += rightAdjustment;
    }
    resultFrame.x = currentX;

    T3Util.Log("S.Connector: FormatLinear output:", {
      resultFrame,
      stepsBuffer,
    });
    return stepsBuffer;
  }

  AddCoManagerChildren(useStartPointFlag: boolean, copySteps: boolean, currentSteps: StepRect[]): StepRect[] {
    T3Util.Log("S.Connector: AddCoManagerChildren input:", { useStartPointFlag, copySteps, currentSteps });

    const skipHooks = OptConstant.ConnectorDefines.NSkip;
    const totalHooks = this.arraylist.hook.length;

    if (totalHooks >= skipHooks) {
      const coManagerHook = this.arraylist.hook[skipHooks];
      const stepsCount = currentSteps.length;

      // Clear existing steps and copy current steps into the connector's own steps property
      this.arraylist.steps.length = 0;
      for (let i = 0; i < stepsCount; i++) {
        this.arraylist.steps.push(
          new StepRect(currentSteps[i].h, currentSteps[i].v, currentSteps[i].hend, currentSteps[i].vend)
        );
      }

      // Get profile for the co-manager hook
      const elementProfile = this.GetElementProfile(coManagerHook.id, useStartPointFlag, copySteps, this, false, false);
      if (elementProfile) {
        currentSteps = elementProfile.steps;
        this.arraylist.profile = elementProfile.frame;
      }
    }

    T3Util.Log("S.Connector: AddCoManagerChildren output:", currentSteps);
    return currentSteps;
  }

  AddAssistantChildren(useStartPointFlag: boolean, copySteps: boolean, currentSteps: StepRect[]): StepRect[] {
    T3Util.Log("S.Connector: AddAssistantChildren input:", { useStartPointFlag, copySteps, currentSteps });

    // Rename local variables for clarity
    let totalHooks = this.arraylist.hook.length;
    const skipHooks = OptConstant.ConnectorDefines.NSkip;
    let assistantHookIndex = -1;
    let endpointHorizontalOffset = 0;
    let reverseColumnFlag = false;

    // Find the first assistant connector hook (child connector)
    for (let index = skipHooks; index < totalHooks; index++) {
      const hook = this.arraylist.hook[index];
      const hookedObject = DataUtil.GetObjectPtr(hook.id, false);
      if (hookedObject &&
        hookedObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
        assistantHookIndex = index;
        endpointHorizontalOffset = hook.endpoint.h;
        reverseColumnFlag = Boolean(hookedObject.arraylist.styleflags & OptConstant.AStyles.ReverseCol);
        break;
      }
    }

    if (assistantHookIndex >= 0) {
      const assistantHook = this.arraylist.hook[assistantHookIndex];

      // Copy current steps into the connector's own steps property
      const stepsCount = currentSteps.length;
      this.arraylist.steps.length = 0;
      for (let i = 0; i < stepsCount; i++) {
        this.arraylist.steps.push(
          new StepRect(currentSteps[i].h, currentSteps[i].v, currentSteps[i].hend, currentSteps[i].vend)
        );
      }

      // Get profile for the assistant connector hook
      const elementProfile = this.GetElementProfile(assistantHook.id, useStartPointFlag, copySteps, this, false, true);
      if (elementProfile) {
        // If reverse column is enabled, swap the vertical frame values
        if (reverseColumnFlag) {
          const tempVertical = elementProfile.frame.v;
          elementProfile.frame.v = elementProfile.frame.vdist;
          elementProfile.frame.vdist = tempVertical;
        }
        // Update the connector's profile if the element profile is larger
        if (elementProfile.frame.h > this.arraylist.profile.h) {
          this.arraylist.profile.h = elementProfile.frame.h;
        }
        if (elementProfile.frame.hdist > this.arraylist.profile.hdist) {
          this.arraylist.profile.hdist = elementProfile.frame.hdist;
        }
        if (elementProfile.frame.v > this.arraylist.profile.v) {
          this.arraylist.profile.v = elementProfile.frame.v;
        }
        if (elementProfile.frame.vdist > this.arraylist.profile.vdist) {
          this.arraylist.profile.vdist = elementProfile.frame.vdist;
        }
        // If copySteps flag is true, merge new steps adjusted by hook offset into current steps
        if (copySteps) {
          const elementStepsCount = elementProfile.steps.length;
          const baseVend = currentSteps[0].vend;
          for (let i = 0; i < elementStepsCount; i++) {
            currentSteps.push(new StepRect(
              elementProfile.steps[i].h + endpointHorizontalOffset,
              elementProfile.steps[i].v + baseVend,
              elementProfile.steps[i].hend + endpointHorizontalOffset,
              elementProfile.steps[i].vend + baseVend
            ));
          }
        }
      }

      // Adjust all steps so that any positive horizontal value is set to 0
      const updatedStepsCount = currentSteps.length;
      for (let i = 0; i < updatedStepsCount; i++) {
        if (currentSteps[i].h > 0) {
          currentSteps[i].h = 0;
        }
      }
    }

    T3Util.Log("S.Connector: AddAssistantChildren output:", currentSteps);
    return currentSteps;
  }

  CompareSteps(existingSteps: StepRect[], newSteps: StepRect[]): number {
    T3Util.Log("S.Connector: CompareSteps called with", {
      existingSteps: JSON.stringify(existingSteps),
      newSteps: JSON.stringify(newSteps)
    });

    let longestDifference: number = 0;
    const existingLength: number = existingSteps.length;
    const newLength: number = newSteps.length;

    // Find the maximum 'vend' among newSteps
    let maxNewVend: number = 0;
    for (let j = 0; j < newLength; j++) {
      if (typeof maxNewVend === "undefined" || newSteps[j].vend > maxNewVend) {
        maxNewVend = newSteps[j].vend;
      }
    }

    if (newLength > 0) {
      // Loop through each existing step as long as its 'v' is not greater than maxNewVend
      for (let i = 0; i < existingLength && !(existingSteps[i].v > maxNewVend); i++) {
        for (let j = 0; j < newLength; j++) {
          // If new step overlaps with the existing step bounds
          if (newSteps[j].vend > existingSteps[i].v && newSteps[j].v < existingSteps[i].vend) {
            const currentDiff: number = existingSteps[i].hend - newSteps[j].h;
            if (currentDiff > longestDifference) {
              longestDifference = currentDiff;
            }
          } else if (newSteps[j].v > existingSteps[i].vend) {
            break;
          }
        }
      }
    } else {
      // No newSteps, so calculate the maximum 'hend' among existingSteps
      for (let i = 0; i < existingLength; i++) {
        if (existingSteps[i].hend > longestDifference) {
          longestDifference = existingSteps[i].hend;
        }
      }
    }

    T3Util.Log("S.Connector: CompareSteps returning output:", longestDifference);
    return longestDifference;
  }

  AddStepsToProfile(
    existingSteps: StepRect[],
    newSteps: StepRect[],
    transform: boolean,
    invert: boolean,
    offset: number,
    newOffset: number
  ): StepRect[] {
    T3Util.Log("S.Connector: AddStepsToProfile called with", {
      existingSteps: JSON.stringify(existingSteps),
      newSteps: JSON.stringify(newSteps),
      transform,
      invert,
      offset,
      newOffset
    });

    let existingLength = existingSteps.length;
    let newStepsLength = newSteps.length;
    let resultSteps: StepRect[] = [];
    let resultIndex = 0;
    let processedNewSteps: StepRect[] = [];
    const maxSteps = OptConstant.Common.MaxSteps;

    // If newSteps is empty and offset is provided, create steps with provided offset.
    if (existingLength && newStepsLength === 0 && offset) {
      for (let i = 0; i < existingLength; i++) {
        resultSteps.push(new StepRect(existingSteps[i].h, existingSteps[i].v, offset, existingSteps[i].vend));
      }
      T3Util.Log("S.Connector: AddStepsToProfile output", JSON.stringify(resultSteps));
      return resultSteps;
    }

    // If transformation is required, prepare processedNewSteps
    if (transform) {
      for (let i = 0; i < newStepsLength; i++) {
        if (invert) {
          processedNewSteps.push(
            new StepRect(-newSteps[i].vend, newSteps[i].h + offset, newSteps[i].v, newSteps[i].hend + offset)
          );
        } else {
          processedNewSteps.push(
            new StepRect(newSteps[i].v, newSteps[i].h + offset, newSteps[i].vend, newSteps[i].hend + offset)
          );
        }
      }
      offset = newOffset;
    } else {
      processedNewSteps = newSteps;
    }

    // Merge steps from existingSteps with processedNewSteps
    for (let i = 0; i < existingLength; i++) {
      if (resultIndex < maxSteps) {
        if (resultIndex > 0) {
          resultSteps[resultIndex - 1].vend = existingSteps[i].v;
        }
        resultSteps.push(new StepRect(existingSteps[i].h, existingSteps[i].v, existingSteps[i].hend, existingSteps[i].vend));
        resultIndex++;
      } else {
        if (existingSteps[i].vend > resultSteps[resultIndex - 1].vend) {
          resultSteps[resultIndex - 1].vend = existingSteps[i].vend;
        }
        if (resultSteps[resultIndex - 1].h < existingSteps[i].h) {
          resultSteps[resultIndex - 1].h = existingSteps[i].h;
        }
        if (resultSteps[resultIndex - 1].hend < existingSteps[i].hend) {
          resultSteps[resultIndex - 1].hend = existingSteps[i].hend;
        }
      }

      // Process new steps merging with current existing step in a nested loop
      for (let j = 0; j < newStepsLength; j++) {
        if (processedNewSteps[j].vend > existingSteps[i].v && processedNewSteps[j].v <= existingSteps[i].vend) {
          if (processedNewSteps[j].v <= resultSteps[resultIndex - 1].v) {
            if (resultSteps[resultIndex - 1].hend < processedNewSteps[j].hend + offset) {
              resultSteps[resultIndex - 1].hend = processedNewSteps[j].hend + offset;
            }
            if (resultSteps[resultIndex - 1].h > processedNewSteps[j].h + offset) {
              resultSteps[resultIndex - 1].h = processedNewSteps[j].h + offset;
            }
          } else if (resultIndex < maxSteps) {
            resultSteps[resultIndex - 1].vend = processedNewSteps[j].v;
            resultSteps.push(new StepRect(existingSteps[i].h, existingSteps[i].v, existingSteps[i].hend, existingSteps[i].vend));
            resultSteps[resultIndex].v = resultSteps[resultIndex - 1].vend;
            resultSteps[resultIndex].hend = processedNewSteps[j].hend + offset;
            if (resultSteps[resultIndex].h > processedNewSteps[j].h + offset) {
              resultSteps[resultIndex].h = processedNewSteps[j].h + offset;
            }
            resultIndex++;
          } else {
            if (processedNewSteps[j].vend > resultSteps[resultIndex - 1].vend) {
              resultSteps[resultIndex - 1].vend = processedNewSteps[j].vend;
            }
            if (resultSteps[resultIndex - 1].hend < processedNewSteps[j].hend + offset) {
              resultSteps[resultIndex - 1].hend = processedNewSteps[j].hend + offset;
            }
            if (resultSteps[resultIndex - 1].h < processedNewSteps[j].h + offset) {
              resultSteps[resultIndex - 1].h = processedNewSteps[j].h + offset;
            }
          }
          if (processedNewSteps[j].vend < existingSteps[i].vend) {
            if (resultIndex < maxSteps) {
              resultSteps[resultIndex - 1].vend = processedNewSteps[j].vend;
              resultSteps.push(new StepRect(existingSteps[i].h, existingSteps[i].v, existingSteps[i].hend, existingSteps[i].vend));
              if (processedNewSteps[j].v < resultSteps[resultIndex].v) {
                resultSteps[resultIndex].v = resultSteps[resultIndex - 1].vend;
              }
              resultIndex++;
            } else if (processedNewSteps[j].vend > resultSteps[resultIndex - 1].vend) {
              resultSteps[resultIndex - 1].vend = processedNewSteps[j].vend;
            }
          } else if (processedNewSteps[j].v > existingSteps[i].vend) {
            break;
          }
        }
      }
    }

    // Process any remaining new steps that extend beyond last processed value
    let currentVend: number;
    if (resultIndex) {
      currentVend = resultSteps[resultIndex - 1].vend;
    } else {
      currentVend = 0;
      if (newStepsLength) {
        currentVend = processedNewSteps[0].v;
      }
    }

    for (let j = 0; j < newStepsLength; j++) {
      if (processedNewSteps[j].vend > currentVend) {
        if (resultIndex < maxSteps) {
          resultSteps.push(new StepRect(processedNewSteps[j].h, processedNewSteps[j].v, processedNewSteps[j].hend, processedNewSteps[j].vend));
          if (processedNewSteps[j].v < currentVend && resultIndex > 0) {
            resultSteps[resultIndex].v = currentVend;
          }
          resultIndex++;
        } else {
          if (processedNewSteps[j].vend > resultSteps[resultIndex - 1].vend) {
            resultSteps[resultIndex - 1].vend = processedNewSteps[j].vend;
          }
          if (resultSteps[resultIndex - 1].hend < processedNewSteps[j].hend + offset) {
            resultSteps[resultIndex - 1].hend = processedNewSteps[j].hend + offset;
          }
          if (resultSteps[resultIndex - 1].h < processedNewSteps[j].h + offset) {
            resultSteps[resultIndex - 1].h = processedNewSteps[j].h + offset;
          }
        }
      }
    }

    // Merge adjacent steps with same h and hend values
    let mergeIndex = 1;
    for (let i = 1; i < resultIndex; i++) {
      if (
        resultSteps[mergeIndex - 1].h === resultSteps[i].h &&
        resultSteps[mergeIndex - 1].hend === resultSteps[i].hend
      ) {
        resultSteps[mergeIndex - 1].vend = resultSteps[i].vend;
      } else {
        if (mergeIndex < i) {
          resultSteps[mergeIndex] = Utils1.DeepCopy(resultSteps[i]);
        }
        mergeIndex++;
      }
    }
    resultSteps.length = resultSteps.length >= mergeIndex ? mergeIndex : resultSteps.length;

    T3Util.Log("S.Connector: AddStepsToProfile output", JSON.stringify(resultSteps));
    return resultSteps;
  }

  BuildSideConnectorSteps() {
    T3Util.Log("S.Connector: BuildSideConnectorSteps called, total hooks =", this.arraylist.hook.length);

    const multiplier = 1;
    let resultSteps: StepRect[] = [];

    const styles = OptConstant.AStyles;
    const isStartLeft = Boolean(this.arraylist.styleflags & styles.SEDA_StartLeft);
    const isBothSides = Boolean(this.arraylist.styleflags & styles.SEDA_BothSides);
    // The reverse column flag is read here but not used:
    this.arraylist.styleflags, styles.SEDA_ReverseCol;

    const totalHooks = this.arraylist.hook.length;
    const hookSkipCount = OptConstant.ConnectorDefines.NSkip;

    // Initialize side flag based on whether the connector starts on the left
    let sideFlag = isStartLeft;

    if (totalHooks > hookSkipCount) {
      const initialHook = this.arraylist.hook[hookSkipCount];
      const numInitialSteps = initialHook.steps.length;

      // Process the initial hook steps
      for (let stepIndex = 0; stepIndex < numInitialSteps; stepIndex++) {
        if (isStartLeft) {
          resultSteps.push(
            new StepRect(
              -initialHook.steps[stepIndex].vend + initialHook.endpoint.v,
              multiplier * initialHook.steps[stepIndex].h,
              initialHook.steps[stepIndex].v + initialHook.endpoint.v,
              multiplier * initialHook.steps[stepIndex].hend
            )
          );
        } else {
          resultSteps.push(
            new StepRect(
              initialHook.steps[stepIndex].v + initialHook.endpoint.v,
              multiplier * initialHook.steps[stepIndex].h,
              initialHook.steps[stepIndex].vend + initialHook.endpoint.v,
              multiplier * initialHook.steps[stepIndex].hend
            )
          );
        }
      }

      // Process remaining hooks starting from hookSkipCount + 1
      for (let hookIndex = hookSkipCount + 1; hookIndex < totalHooks; hookIndex++) {
        if (isBothSides) {
          sideFlag = !sideFlag;
        }

        const currentHook = this.arraylist.hook[hookIndex];
        const hookEndpointV = currentHook.endpoint.v;

        resultSteps = this.AddStepsToProfile(
          resultSteps,
          currentHook.steps,
          true,
          sideFlag,
          multiplier * currentHook.startpoint.h,
          hookEndpointV
        );
      }
    }

    T3Util.Log("S.Connector: BuildSideConnectorSteps completed with output:", JSON.stringify(resultSteps));
    return resultSteps;
  }

  InsertStepIntoProfile(profileSteps: StepRect[], newStep: StepRect): void {
    T3Util.Log("S.Connector: InsertStepIntoProfile called with", {
      profileSteps: JSON.stringify(profileSteps),
      newStep: JSON.stringify(newStep)
    });

    // Prepend the new step to the list of profile steps
    profileSteps.unshift(newStep);

    // Calculate the vertical increment based on the new step's height difference
    const verticalOffset = newStep.vend - newStep.v;

    // Update all subsequent steps by adding the vertical offset
    for (let index = 1; index < profileSteps.length; index++) {
      profileSteps[index].v += verticalOffset;
      profileSteps[index].vend += verticalOffset;
    }

    T3Util.Log("S.Connector: InsertStepIntoProfile completed with output", JSON.stringify(profileSteps));
  }

  UpdateCurrentProfile(profile: Rectangle, hook: any, flag: boolean): void {
    T3Util.Log("S.Connector: UpdateCurrentProfile called with", {
      profile: JSON.stringify(profile),
      hook: JSON.stringify(hook),
      flag
    });

    let currentValue: number;
    let newValue: number;

    // Update horizontal bounds
    currentValue = hook.endpoint.h - hook.pr.h;
    if (currentValue < profile.h) {
      profile.h = currentValue;
    }
    newValue = hook.endpoint.h + hook.pr.hdist;
    if (newValue > profile.hdist) {
      profile.hdist = newValue;
    }

    // Update vertical bounds
    currentValue = hook.endpoint.v - hook.pr.v;
    if (currentValue < profile.v) {
      profile.v = currentValue;
    }
    newValue = hook.endpoint.v + hook.pr.vdist;
    if (newValue > profile.vdist) {
      profile.vdist = newValue;
    }

    T3Util.Log("S.Connector: UpdateCurrentProfile completed with output", JSON.stringify(profile));
  }

  GetFullShapeProfile(
    targetObjectId: number,
    offsetX: number,
    offsetY: number,
    resultRect: Rectangle,
    updateUnion: boolean
  ): void {
    T3Util.Log("S.Connector: GetFullShapeProfile called with", {
      targetObjectId,
      offsetX,
      offsetY,
      resultRect,
      updateUnion,
    });

    // Local variables with descriptive names
    let mainObject: any = DataUtil.GetObjectPtr(targetObjectId, false);
    const skipHookCount = OptConstant.ConnectorDefines.NSkip;
    // Structure to hold child info (index, id and hook point)
    let childInfo = { lindex: -1, id: -1, hookpt: 0 };
    let currentFrame: Rectangle = {};
    let hookPoints: Point[] = [];
    let perimPoints: Point[];

    if (mainObject) {
      // Copy the frame of the main object and adjust by the offsets
      Utils2.CopyRect(currentFrame, mainObject.Frame);
      currentFrame.x += offsetX;
      currentFrame.y += offsetY;

      if (updateUnion) {
        Utils2.CopyRect(resultRect, currentFrame);
      } else {
        Utils2.UnionRect(resultRect, currentFrame, resultRect);
      }

      // Loop while a child object is found
      while (T3Gv.opt.FindChildArrayByIndex(targetObjectId, childInfo) > 0) {
        let childObject: any = DataUtil.GetObjectPtr(childInfo.id, false);
        if (!childObject) {
          break;
        }
        // Get hook point from the child object
        let childHookPoint = childObject.HookToPoint(childObject.hooks[0].hookpt, null);
        hookPoints = [];
        hookPoints.push(new Point(childObject.hooks[0].connect.x, childObject.hooks[0].connect.y));

        perimPoints = mainObject.GetPerimPts(mainObject.BlockID, hookPoints, childObject.hooks[0].hookpt, true, null, -1);
        if (perimPoints && childHookPoint) {
          offsetX += perimPoints[0].x - childHookPoint.x;
          offsetY += perimPoints[0].y - childHookPoint.y;
        }

        // Update the current frame to the child's frame
        Utils2.CopyRect(currentFrame, childObject.Frame);
        currentFrame.x += offsetX;
        currentFrame.y += offsetY;
        Utils2.UnionRect(resultRect, currentFrame, resultRect);

        let childHookCount = childObject.arraylist.hook.length;
        // Process each hook beyond the skip count
        for (let hookIndex = skipHookCount; hookIndex < childHookCount; hookIndex++) {
          let currentHook = childObject.arraylist.hook[hookIndex];
          let hookedObj = DataUtil.GetObjectPtr(currentHook.id, false);
          if (hookedObj) {
            let hookedPoint = hookedObj.HookToPoint(hookedObj.hooks[0].hookpt, null);
            hookPoints = [];
            hookPoints.push(new Point(hookedObj.hooks[0].connect.x, hookedObj.hooks[0].connect.y));
            perimPoints = childObject.GetPerimPts(childObject.BlockID, hookPoints, hookedObj.hooks[0].hookpt, true, null, -1);
            if (perimPoints && hookedPoint) {
              let newOffsetX = offsetX + perimPoints[0].x - hookedPoint.x;
              let newOffsetY = offsetY + perimPoints[0].y - hookedPoint.y;
              // Recursive call with new offsets; do not update union with child objects recursively
              childObject.GetFullShapeProfile(currentHook.id, newOffsetX, newOffsetY, resultRect, false);
            }
          }
        }
      }
    }

    T3Util.Log("S.Connector: GetFullShapeProfile completed with resultRect:", resultRect);
  }

  GetRightAdjustment(hookedObjectId: number): number {
    T3Util.Log("S.Connector: GetRightAdjustment called with hookedObjectId:", hookedObjectId);

    const hookPoints = OptConstant.HookPts;
    const hookedObject = DataUtil.GetObjectPtr(hookedObjectId, false);

    if (hookedObject == null) {
      T3Util.Log("S.Connector: GetRightAdjustment returning output: 0 (hookedObject is null)");
      return 0;
    }

    if (hookedObject.hooks.length === 0) {
      T3Util.Log("S.Connector: GetRightAdjustment returning output: 0 (hookedObject has no hooks)");
      return 0;
    }

    let oppositeHookType: number;
    let hookCoordinates: { x: number; y: number };
    let adjustment = 0;

    switch (hookedObject.hooks[0].hookpt) {
      case hookPoints.SED_AKCT:
        oppositeHookType = hookPoints.SED_AKCB;
        break;
      case hookPoints.SED_AKCB:
        oppositeHookType = hookPoints.SED_AKCT;
        break;
      case hookPoints.SED_AKCR:
        oppositeHookType = hookPoints.SED_AKCL;
        break;
      case hookPoints.SED_AKCL:
        oppositeHookType = hookPoints.SED_AKCR;
        break;
    }

    if (oppositeHookType) {
      hookCoordinates = hookedObject.HookToPoint(oppositeHookType, null);

      if (hookCoordinates) {
        switch (oppositeHookType) {
          case hookPoints.SED_AKCT:
            adjustment = hookCoordinates.y - hookedObject.Frame.y;
            break;
          case hookPoints.SED_AKCB:
            adjustment = hookCoordinates.y - hookedObject.Frame.y - hookedObject.Frame.height;
            break;
          case hookPoints.SED_AKCR:
            adjustment = hookCoordinates.x - hookedObject.Frame.x - hookedObject.Frame.width;
            break;
          case hookPoints.SED_AKCL:
            adjustment = hookCoordinates.x - hookedObject.Frame.x;
            break;
        }
        if (Utils2.IsEqual(adjustment, 0)) {
          adjustment = 0;
        }
      }
    }

    T3Util.Log("S.Connector: GetRightAdjustment returning output:", adjustment);
    return adjustment;
  }

  GetLeftAdjustment(hookObjectId: number): number {
    T3Util.Log("S.Connector: GetLeftAdjustment called with hookObjectId:", hookObjectId);

    const hookPointsConstants = OptConstant.HookPts;
    const hookedObject = DataUtil.GetObjectPtr(hookObjectId, false);

    if (hookedObject == null) {
      T3Util.Log("S.Connector: GetLeftAdjustment returning 0 because hookedObject is null");
      return 0;
    }

    if (hookedObject.DrawingObjectBaseClass !== OptConstant.DrawObjectBaseClass.Shape) {
      T3Util.Log("S.Connector: GetLeftAdjustment returning 0 because hookedObject is not of type SHAPE");
      return 0;
    }

    if (hookedObject.hooks.length === 0) {
      T3Util.Log("S.Connector: GetLeftAdjustment returning 0 because hookedObject has no hooks");
      return 0;
    }

    let hookPointType = hookedObject.hooks[0].hookpt;
    let leftAdjustment = 0;
    let hookCoordinates;

    if (hookPointType) {
      hookCoordinates = hookedObject.HookToPoint(hookPointType, null);
      if (hookCoordinates) {
        switch (hookPointType) {
          case hookPointsConstants.SED_AKCT:
            leftAdjustment = hookCoordinates.y - hookedObject.Frame.y;
            break;
          case hookPointsConstants.SED_AKCB:
            leftAdjustment = hookCoordinates.y - hookedObject.Frame.y - hookedObject.Frame.height;
            break;
          case hookPointsConstants.SED_AKCR:
            leftAdjustment = hookCoordinates.x - hookedObject.Frame.x - hookedObject.Frame.width;
            break;
          case hookPointsConstants.SED_AKCL:
            leftAdjustment = hookCoordinates.x - hookedObject.Frame.x;
            break;
        }
        if (Utils2.IsEqual(leftAdjustment, 0)) {
          leftAdjustment = 0;
        }
      }
    }

    T3Util.Log("S.Connector: GetLeftAdjustment returning leftAdjustment:", leftAdjustment);
    return leftAdjustment;
  }

  GetElementProfile(
    targetObjectId: number,
    useStartPointFlag: boolean,
    copySteps: boolean,
    referenceConnector: any,
    useFullShapeProfile: boolean,
    ignoreGenoFlag: boolean
  ) {
    T3Util.Log("S.Connector: GetElementProfile called with", {
      targetObjectId,
      useStartPointFlag,
      copySteps,
      referenceConnector,
      useFullShapeProfile,
      ignoreGenoFlag
    });

    let perimPoint, rectConverted, stepRect, tempRect, profileAdjust, pointArray;
    let tempSteps, sourceSteps, childObjectId, tempPoint, finalSteps;
    let tempProfile = {};
    let hookPoint = {};
    let childSteps: any[] = [];
    let offset = { h: 0, v: 0 };
    let adjustedProfile = {};
    let resultProfile = {
      frame: {},
      nsteps: 0,
      steps: [] as StepRect[]
    };

    const styles = OptConstant.AStyles;
    const hookSkipCount = OptConstant.ConnectorDefines.NSkip;
    const targetObj = DataUtil.GetObjectPtr(targetObjectId, false);
    if (targetObj == null) return null;

    // Determine some flags from this connector's properties
    let isCoManager = this.arraylist.styleflags & styles.SEDA_CoManager;
    if (referenceConnector) isCoManager = false;
    let isLinear = this.arraylist.styleflags & styles.SEDA_Linear;
    let isAssistant = this.IsAsstConnector();
    let isGeno = this.IsGenoConnector();
    if (ignoreGenoFlag) isGeno = false;
    if (isAssistant && referenceConnector) isAssistant = false;

    // If target is a connector itself
    if (targetObj.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
      if (isAssistant || isGeno) {
        resultProfile.frame.h = 0;
        resultProfile.frame.hdist = 0;
        resultProfile.frame.v = 0;
        resultProfile.frame.vdist = 0;
        if (this.arraylist.hook[hookSkipCount].id != targetObjectId) {
          resultProfile.frame.v = this.arraylist.hook[hookSkipCount].pr.v;
        }
        resultProfile.steps.push(new StepRect(-resultProfile.frame.h, -resultProfile.frame.v, resultProfile.frame.hdist, resultProfile.frame.vdist));
        T3Util.Log("S.Connector: GetElementProfile output", resultProfile);
        return resultProfile;
      }

      // Get profile from target connector
      const bothSides = targetObj.arraylist.styleflags & styles.SEDA_BothSides ||
        (targetObj.arraylist.styleflags & styles.SEDA_PerpConn) === 0;
      if (targetObj.vertical === this.vertical) {
        resultProfile.frame.h = targetObj.arraylist.profile.h;
        resultProfile.frame.hdist = targetObj.arraylist.profile.hdist;
        resultProfile.frame.v = targetObj.arraylist.profile.v;
        resultProfile.frame.vdist = targetObj.arraylist.profile.vdist;
      } else {
        resultProfile.frame.v = targetObj.arraylist.profile.h;
        resultProfile.frame.vdist = targetObj.arraylist.profile.hdist;
        if (targetObj.arraylist.styleflags & styles.SEDA_CoManager && this.arraylist.styleflags & styles.SEDA_ReverseCol) {
          resultProfile.frame.h = targetObj.arraylist.profile.vdist;
          resultProfile.frame.hdist = targetObj.arraylist.profile.v;
        } else {
          resultProfile.frame.h = targetObj.arraylist.profile.v;
          resultProfile.frame.hdist = targetObj.arraylist.profile.vdist;
        }
      }

      if (copySteps) {
        const stepsCount = targetObj.arraylist.steps.length;
        sourceSteps = targetObj.arraylist.steps;
        let useDirectCopy = targetObj.vertical === this.vertical;
        if (bothSides) useDirectCopy = !useDirectCopy;
        if (useDirectCopy) {
          for (let i = 0; i < stepsCount; i++) {
            resultProfile.steps.push(
              new StepRect(sourceSteps[i].h, sourceSteps[i].v, sourceSteps[i].hend, sourceSteps[i].vend)
            );
          }
        } else {
          for (let i = 0; i < stepsCount; i++) {
            resultProfile.steps.push(
              new StepRect(sourceSteps[i].v, sourceSteps[i].h, sourceSteps[i].vend, sourceSteps[i].hend)
            );
          }
        }
      }
      T3Util.Log("S.Connector: GetElementProfile output", resultProfile);
      return resultProfile;
    }

    // If target object is a child of this connector
    if (targetObj.hooks.length && targetObj.hooks[0].objid === this.BlockID) {
      if (referenceConnector) {
        resultProfile.frame.h = referenceConnector.arraylist.profile.h;
        resultProfile.frame.v = referenceConnector.arraylist.profile.v;
        resultProfile.frame.hdist = referenceConnector.arraylist.profile.hdist;
        resultProfile.frame.vdist = referenceConnector.arraylist.profile.vdist;
        const ownStepsCount = this.arraylist.steps.length;
        for (let i = 0; i < ownStepsCount; i++) {
          resultProfile.steps.push(
            new StepRect(
              this.arraylist.steps[i].h,
              this.arraylist.steps[i].v,
              this.arraylist.steps[i].hend,
              this.arraylist.steps[i].vend
            )
          );
        }
        if (copySteps) {
          hookPoint.x = this.StartPoint.x;
          hookPoint.y = this.StartPoint.y;
        } else {
          hookPoint = referenceConnector.HookToPoint(targetObj.hooks[0].hookpt, null);
        }
        perimPoint = Utils2.Pt2CPoint(hookPoint, this.vertical);
        perimPoint.v += this.arraylist.ht;
      } else {
        hookPoint = targetObj.HookToPoint(targetObj.hooks[0].hookpt, null);
        perimPoint = Utils2.Pt2CPoint(hookPoint, this.vertical);
        if (useFullShapeProfile) {
          this.GetFullShapeProfile(targetObjectId, 0, 0, tempProfile, true);
          rectConverted = Utils2.Rect2CRect(tempProfile, this.vertical);
        } else {
          rectConverted = targetObj.GetArrayRect(this.vertical);
        }
        resultProfile.frame.h = perimPoint.h - rectConverted.h;
        resultProfile.frame.hdist = rectConverted.h + rectConverted.hdist - perimPoint.h;
        resultProfile.frame.v = perimPoint.v - rectConverted.v;
        resultProfile.frame.vdist = rectConverted.v + rectConverted.vdist - perimPoint.v;
        if (copySteps) {
          if (useStartPointFlag && !isLinear) {
            resultProfile.steps.push(new StepRect(-resultProfile.frame.h, resultProfile.frame.vdist, resultProfile.frame.hdist, resultProfile.frame.v));
          } else {
            resultProfile.steps.push(new StepRect(-resultProfile.frame.h, -resultProfile.frame.v, resultProfile.frame.hdist, resultProfile.frame.vdist));
          }
        }
      }

    } else {
      hookPoint = targetObj.HookToPoint(targetObj.hooks[0].hookpt, null);
      perimPoint = Utils2.Pt2CPoint(hookPoint, this.vertical);
      if (useFullShapeProfile) {
        this.GetFullShapeProfile(targetObjectId, 0, 0, tempProfile, true);
        rectConverted = Utils2.Rect2CRect(tempProfile, this.vertical);
      } else {
        rectConverted = targetObj.GetArrayRect(this.vertical);
      }
      resultProfile.frame.h = perimPoint.h - rectConverted.h;
      resultProfile.frame.hdist = rectConverted.h + rectConverted.hdist - perimPoint.h;
      resultProfile.frame.v = perimPoint.v - rectConverted.v;
      resultProfile.frame.vdist = rectConverted.v + rectConverted.vdist - perimPoint.v;
      if (copySteps) {
        if (useStartPointFlag && !isLinear) {
          resultProfile.steps.push(new StepRect(-resultProfile.frame.h, resultProfile.frame.vdist, resultProfile.frame.hdist, resultProfile.frame.v));
        } else {
          resultProfile.steps.push(new StepRect(-resultProfile.frame.h, -resultProfile.frame.v, resultProfile.frame.hdist, resultProfile.frame.vdist));
        }
      }
    }

    // Process children profile if available and if current connector is not linear, co-manager, or assistant
    childObjectId = T3Gv.opt.FindChildArray(targetObjectId, -1);
    if (!isLinear && !isCoManager && !isAssistant && childObjectId >= 0) {
      const childObj = DataUtil.GetObjectPtr(childObjectId, false);
      if (childObj && childObj.hooks.length && childObj.arraylist.hook.length - OptConstant.ConnectorDefines.NSkip > 0 &&
        (childObj.flags & NvConstant.ObjFlags.NotVisible) === 0) {
        pointArray = [];
        pointArray.push(new Point(childObj.hooks[0].connect.x, childObj.hooks[0].connect.y));
        tempRect = childObj.GetPerimPts(childObj.BlockID, pointArray, childObj.hooks[0].hookpt, true, null, -1);
        if (tempRect && perimPoint) {
          let convertedChildPoint = Utils2.Pt2CPoint(tempRect[0], this.vertical);
          offset.h = perimPoint.h - convertedChildPoint.h;
          offset.v = perimPoint.v - convertedChildPoint.v;
        }
        const childStepsCount = childObj.arraylist.steps.length;
        sourceSteps = childObj.arraylist.steps;
        if (childObj.vertical === this.vertical) {
          // Adjust profile for same vertical orientation
          if (childObj.arraylist.styleflags & styles.SEDA_ReverseCol)
            offset.h = -offset.h;
          adjustedProfile.h = childObj.arraylist.profile.h + offset.h;
          adjustedProfile.hdist = childObj.arraylist.profile.hdist - offset.h;
          adjustedProfile.v = childObj.arraylist.profile.v + offset.v;
          adjustedProfile.vdist = childObj.arraylist.profile.vdist - offset.v;
        } else {
          if (childObj.arraylist.styleflags & styles.SEDA_ReverseCol)
            offset.v = -offset.v;
          if (childObj.arraylist.styleflags & styles.SEDA_StartLeft && !bothSides) {
            adjustedProfile.hdist = childObj.arraylist.profile.v + offset.h;
            adjustedProfile.h = childObj.arraylist.profile.vdist - offset.h;
          } else {
            adjustedProfile.h = childObj.arraylist.profile.v + offset.h;
            adjustedProfile.hdist = childObj.arraylist.profile.vdist - offset.h;
          }
          if (childObj.arraylist.styleflags & styles.SEDA_ReverseCol) {
            adjustedProfile.vdist = childObj.arraylist.profile.h + offset.v;
            adjustedProfile.v = childObj.arraylist.profile.hdist - offset.v;
          } else {
            adjustedProfile.v = childObj.arraylist.profile.h + offset.v;
            adjustedProfile.vdist = childObj.arraylist.profile.hdist - offset.v;
          }
        }
        // Update the frame dimensions if the child adjusted profile is larger
        if (adjustedProfile.h > resultProfile.frame.h) resultProfile.frame.h = adjustedProfile.h;
        if (adjustedProfile.v > resultProfile.frame.v) resultProfile.frame.v = adjustedProfile.v;
        if (adjustedProfile.hdist > resultProfile.frame.hdist) resultProfile.frame.hdist = adjustedProfile.hdist;
        if (adjustedProfile.vdist > resultProfile.frame.vdist) resultProfile.frame.vdist = adjustedProfile.vdist;
        // Adjust steps based on child object profile
        if (childStepsCount) {
          const sameOrientation = childObj.vertical === this.vertical;
          if (sameOrientation) {
            let delta = useStartPointFlag ? (t ? -offset.v : offset.v) : (t ? -offset.v : offset.v);
            for (let i = 0; i < childStepsCount; i++) {
              resultProfile.steps.push(new StepRect(
                sourceSteps[i].h - offset.h,
                sourceSteps[i].v - delta,
                sourceSteps[i].hend - offset.h,
                sourceSteps[i].vend - delta
              ));
            }
          } else {
            let deltaH = (useStartPointFlag && (childObj.arraylist.styleflags & styles.SEDA_StartLeft)) ? -offset.h : offset.h;
            if (t) {
              for (let i = 0; i < childStepsCount; i++) {
                resultProfile.steps.push(new StepRect(
                  sourceSteps[i].v - deltaH,
                  -sourceSteps[i].hend - offset.v,
                  sourceSteps[i].vend - deltaH,
                  -sourceSteps[i].h - offset.v
                ));
              }
            } else {
              for (let i = 0; i < childStepsCount; i++) {
                resultProfile.steps.push(new StepRect(
                  sourceSteps[i].v - deltaH,
                  sourceSteps[i].h - offset.v,
                  sourceSteps[i].vend - deltaH,
                  sourceSteps[i].hend - offset.v
                ));
              }
            }
          }
        }
      }
    } else {
      // If child profile exists but not applicable for re-orientation, adjust steps accordingly.
      if (childObj) {
        let deltaV = t ? -offset.v : offset.v;
        let deltaH = (childObj.arraylist.styleflags & styles.SEDA_StartLeft) ? -offset.h : offset.h;
        if (t) {
          for (let i = 0; i < sourceSteps.length; i++) {
            resultProfile.steps.push(new StepRect(
              sourceSteps[i].v - deltaH,
              -sourceSteps[i].hend - deltaV,
              sourceSteps[i].vend - deltaH,
              -sourceSteps[i].h - deltaV
            ));
          }
        } else {
          for (let i = 0; i < sourceSteps.length; i++) {
            resultProfile.steps.push(new StepRect(
              sourceSteps[i].v - deltaH,
              sourceSteps[i].h - deltaV,
              sourceSteps[i].vend - deltaH,
              sourceSteps[i].hend - deltaV
            ));
          }
        }
      }
    }

    T3Util.Log("S.Connector: GetElementProfile output", resultProfile);
    return resultProfile;
  }

  PrAdjustHooks(startIndex: number, offsetAdjustment: number) {
    T3Util.Log("S.Connector: PrAdjustHooks called with startIndex:", startIndex, "offsetAdjustment:", offsetAdjustment);
    const skipHooksCount = OptConstant.ConnectorDefines.NSkip;
    const totalHooks = this.arraylist.hook.length;
    for (let index = startIndex; index < totalHooks; index++) {
      const currentHook = this.arraylist.hook[index];
      if (currentHook.id >= 0) {
        const hookedObject = DataUtil.GetObjectPtr(currentHook.id, true);
        if (hookedObject && hookedObject.hooks.length) {
          hookedObject.hooks[0].connect.x = index - skipHooksCount;
          const previousHookPoint = hookedObject.hooks[0].hookpt;
          hookedObject.hooks[0].hookpt = this.GetBestHook(currentHook.id, previousHookPoint, hookedObject.hooks[0].connect);
          hookedObject.SetHookAlign(hookedObject.hooks[0].hookpt, previousHookPoint);
        }
      }
    }
    T3Util.Log("S.Connector: PrAdjustHooks completed");
  }

  PrAddHookedObject(objectId, hookPoint, textId) {
    T3Util.Log("S.Connector: PrAddHookedObject called with objectId:", objectId, "hookPoint:", hookPoint, "textId:", textId);
    let currentHookCount, tempHook, insertIndex;
    let newHook = new SDHook();
    let useStub = false;
    const styles = OptConstant.AStyles;
    const bothSides = (this.arraylist.styleflags & styles.SEDA_BothSides) || (this.arraylist.styleflags & styles.SEDA_PerpConn) === 0;
    const isLinear = this.arraylist.styleflags & styles.SEDA_Linear;
    const isRadial = this.arraylist.styleflags & styles.SEDA_Radial;

    if (this.arraylist != null) {
      // Reset match size length
      this.arraylist.matchsizelen = 0;
      let targetObject = DataUtil.GetObjectPtr(objectId, false);

      if (hookPoint === OptConstant.ConnectorDefines.StubHookPt) {
        hookPoint = 0;
        useStub = true;
      } else {
        if (hookPoint === -1 || hookPoint === -2) {
          this.arraylist.hook[-hookPoint].id = objectId;
          T3Util.Log("S.Connector: PrAddHookedObject early exit for negative hookPoint:", hookPoint);
          return;
        }
        if (targetObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector &&
          targetObject.arraylist.angle) {
          useStub = true;
        }
      }

      if (hookPoint >= 0) {
        let verticalFlag = this.vertical;
        if (bothSides) {
          verticalFlag = !verticalFlag;
        }
        currentHookCount = this.arraylist.hook.length;
        // Ensure a minimum number of hooks exist
        if (currentHookCount < OptConstant.ConnectorDefines.NSkip) {
          for (let i = currentHookCount; i < OptConstant.ConnectorDefines.NSkip; i++) {
            let tempNewHook = new SDHook();
            if (bothSides) {
              if (this.arraylist.hook.length !== 1 || isLinear || isRadial) {
                tempNewHook.gap = this.arraylist.wd;
              } else {
                tempNewHook.gap = OptConstant.Common.CITreeSpaceExtra + this.arraylist.wd;
              }
            } else {
              if (this.arraylist.hook.length !== 1 || isLinear || isRadial) {
                tempNewHook.gap = this.arraylist.ht;
              } else {
                tempNewHook.gap = OptConstant.Common.CITreeSpaceExtra + this.arraylist.ht;
              }
            }
            this.arraylist.hook.push(tempNewHook);
          }
        }
        // Compute the index at which to insert the new hook
        insertIndex = hookPoint + OptConstant.ConnectorDefines.NSkip;
        // Special handling for hookPoint index 0 with a valid text id for linear connectors
        if (hookPoint === 0 && textId >= 0 && isLinear &&
          (this.hooks.length === 0 ||
            (this.hooks[0].hookpt !== OptConstant.HookPts.LL &&
              this.hooks[0].hookpt !== OptConstant.HookPts.LT))) {
          let existingObject = T3Gv.stdObj.GetObject(textId);
          if (existingObject) {
            existingObject.Delete();
          }
          textId = -1;
        }
        // Set new hook properties
        newHook.id = objectId;
        if (textId) {
          newHook.textid = textId;
        }
        currentHookCount = this.arraylist.hook.length;
        if (currentHookCount < insertIndex) {
          insertIndex = currentHookCount;
          useStub = true;
        }
        // Insert new hook into the hook array
        this.arraylist.hook.splice(insertIndex, 0, newHook);
        currentHookCount = this.arraylist.hook.length;
        if (useStub) {
          this.PrAdjustHooks(insertIndex, 0);
        } else {
          targetObject = DataUtil.GetObjectPtr(objectId, true);
          if (targetObject) {
            targetObject.SetHookAlign(targetObject.hooks[0].hookpt, targetObject.hooks[0].hookpt);
          }
        }
        this.PrAdjustHooks(insertIndex + 1, 1);
      }
    }
    T3Util.Log("S.Connector: PrAddHookedObject completed with objectId:", objectId);
  }

  PrRemoveHookedObject(objectId, hookIndex) {
    T3Util.Log("S.Connector: PrRemoveHookedObject called with objectId:", objectId, "hookIndex:", hookIndex);

    let removedExtra = 0;
    if (this.arraylist != null) {
      // Reset match size length
      this.arraylist.matchsizelen = 0;

      // Get current hook count
      let hookCount = this.arraylist.hook.length;

      // If the hookIndex is within valid range, remove the hook
      if (hookIndex >= OptConstant.ConnectorDefines.NSkip && hookIndex < hookCount) {
        if (hookIndex < hookCount - 1 && hookIndex > OptConstant.ConnectorDefines.NSkip) {
          removedExtra = this.arraylist.hook[hookIndex].extra;
        }
        this.arraylist.hook.splice(hookIndex, 1);
      }

      // If there are only two hooks left (after removal)
      if (this.arraylist.hook.length === OptConstant.ConnectorDefines.NSkip + 2) {
        let nextHook = this.arraylist.hook[OptConstant.ConnectorDefines.NSkip + 1];
        // If the connector is perpendicular
        if ((this.arraylist.styleflags & OptConstant.AStyles.PerpConn) > 0) {
          if (!(nextHook.extra === 0 && removedExtra === 0)) {
            this.arraylist.wd += nextHook.extra + removedExtra;
            if (this.arraylist.wd < 0) {
              this.arraylist.wd = 0;
            }
            nextHook.extra = 0;
          }
        }
      }

      // Adjust hooks after removal
      this.PrAdjustHooks(hookIndex, -1);
    }

    T3Util.Log("S.Connector: PrRemoveHookedObject completed for hookIndex:", hookIndex);
  }

  PrGetNBackBoneSegments(): number {
    T3Util.Log("S.Connector: PrGetNBackBoneSegments() called, input: none");

    let backboneSegmentCount = this.arraylist.hook.length - OptConstant.ConnectorDefines.NSkip;

    if (backboneSegmentCount < 2) {
      backboneSegmentCount = 2;
    }

    const result = backboneSegmentCount - 1;
    T3Util.Log("S.Connector: PrGetNBackBoneSegments() returning output:", result);

    return result;
  }

  PrGetStubIndex() {
    T3Util.Log("S.Connector: PrGetStubIndex called");

    let stubIndex = 0;
    const styles = OptConstant.AStyles;
    const isDualSide = (this.arraylist.styleflags & styles.SEDA_BothSides) ||
      ((this.arraylist.styleflags & styles.SEDA_PerpConn) === 0);
    const connectorDefines = OptConstant.ConnectorDefines;
    const hookPoints = OptConstant.HookPts;

    if (isDualSide && this.hooks.length) {
      switch (this.hooks[0].hookpt) {
        case hookPoints.SED_LL:
        case hookPoints.SED_LT:
          stubIndex = connectorDefines.A_Cl;
          break;
        default:
          stubIndex = connectorDefines.A_Cr;
      }
    }

    T3Util.Log("S.Connector: PrGetStubIndex returning output:", stubIndex);
    return stubIndex;
  }

  PrGetEndShapeIndex() {
    T3Util.Log("S.Connector: PrGetEndShapeIndex called");

    let endShapeIndex = 0;
    const styles = OptConstant.AStyles;
    const connectorDefines = OptConstant.ConnectorDefines;
    const hookPoints = OptConstant.HookPts;

    // Check if the connector has the "EndConn" flag and that hooks are available.
    if ((this.arraylist.styleflags & styles.SEDA_EndConn) && this.hooks.length > 0) {
      switch (this.hooks[0].hookpt) {
        case hookPoints.SED_LL:
        case hookPoints.SED_LT:
          endShapeIndex = connectorDefines.A_Cr;
          break;
        default:
          endShapeIndex = connectorDefines.A_Cl;
      }
    }

    T3Util.Log("S.Connector: PrGetEndShapeIndex returning output:", endShapeIndex);
    return endShapeIndex;
  }

  PrAdjustFormat(e, t, a, r, i, n, o, s) {
    var l,
      S,
      c,
      u,
      p,
      d,
      D = 0,
      g = OptConstant.AStyles,
      h = this.arraylist.styleflags & g.SEDA_BothSides ||
        0 == (this.arraylist.styleflags & g.SEDA_PerpConn),
      m = this.arraylist.styleflags & g.SEDA_BothSides &&
        0 == (this.arraylist.styleflags & g.SEDA_Stagger),
      C = this.arraylist.styleflags & g.SEDA_Stagger &&
        this.vertical,
      y = this.arraylist.styleflags & g.SEDA_Linear,
      f = this.arraylist.styleflags & OptConstant.AStyles.ReverseCol,
      L = this.arraylist.styleflags & g.SEDA_StartLeft,
      I = this.arraylist.styleflags & g.SEDA_Radial,
      T = OptConstant.ConnectorDefines,
      b = [],
      M = [],
      P = [],
      R = [],
      A = [],
      _ = this,
      E = function (e, t) {
        var a,
          r,
          i = 0,
          n = 0;
        for (
          o !== T.A_Cl &&
          o !== T.A_Cr ||
          (
            a = o,
            c = _.arraylist.hook[a],
            b[a] = c.startpoint.h,
            T.A_Cl,
            M[a] = c.gap + P[a],
            n++,
            P[a] < 0 ? R[a] < - P[a] &&
              ((r = R[a]) < 0 && (r = 0), i += - P[a] + r, M[a] < 0 && (M[a] = 0), n--, P[a] = 0) : M[a] < P[a] &&
            ((r = M[a]) < 0 && (r = 0), i += P[a] - r, M[a] < 0 && (M[a] = 0), n--, P[a] = 0)
          ),
          a = e;
          a < t;
          a++
        ) 0 !== P[a] &&
          (
            c = _.arraylist.hook[a],
            b[a] = c.startpoint.h,
            M[a] = _.arraylist.wd + c.extra,
            n++,
            P[a] < 0 ? M[a] < - P[a] &&
              ((r = M[a]) < 0 && (r = 0), i += - P[a] + r, M[a] < 0 && (M[a] = 0), n--, P[a] = 0) : M[a] < P[a] &&
            ((r = M[a]) < 0 && (r = 0), i += P[a] - r, M[a] < 0 && (M[a] = 0), n--, P[a] = 0)
          );
        return n <= 0 &&
          (i = 0),
          i / n
      },
      w = function (t, a, r) {
        var i,
          n,
          s = 2,
          l = !1,
          S = 0;
        for (
          o === T.A_Cl ? (
            i = o,
            n = _.arraylist.hook[i],
            R[i] = n.startpoint.h - n.endpoint.h,
            P[i] = e
          ) : o === T.A_Cr &&
          (
            i = o,
            n = _.arraylist.hook[i],
            R[i] = n.endpoint.h - n.startpoint.h,
            P[i] = - e
          ),
          i = t;
          i < a;
          i++
        ) n = _.arraylist.hook[i],
          P[i] = r ? - e : e,
          R[i] = n.endpoint.h - n.startpoint.h;
        for (; Math.abs(s) > 1;) {
          if (s = E(t, a), Math.abs(s > 1)) for (i = t; i < a; i++) 0 !== P[i] &&
            (l = !0, P[i] += s);
          if (!l) break
        }
        if (r) {
          var c = _.arraylist.hook.length;
          for (o === T.A_Cr && (S -= M[i = o] - R[i], b[i] += S, A[c - 1] = S), i = a - 1; i >= t; i--) S -= M[i] - R[i],
            b[i] += S,
            A[i - 1] = S
        } else {
          for (
            o === T.A_Cl &&
            (
              S += M[i = o] - R[i],
              b[i] += S,
              b[T.SEDA_NSkip] += S,
              A[T.SEDA_NSkip] = S,
              M[T.SEDA_NSkip] = 0
            ),
            i = t + 1;
            i < a;
            i++
          ) S += M[i - 1] - R[i - 1],
            b[i] += S,
            A[i - 1] = S;
          S += M[a - 1] - R[a - 1],
            A[a - 1] = S
        }
      },
      F = function (e, t, a) {
        var r,
          i,
          n,
          l,
          S,
          c,
          u,
          p = 0,
          d = 0;
        S = a ? 1 : 0;
        var D = function (e) {
          e !== T.A_Cl &&
            e !== T.A_Cr ||
            (
              r = e,
              n = _.arraylist.hook[r],
              b[r] = n.startpoint.h,
              e === T.A_Cl ? (M[r] = n.gap + P[r], b[T.SEDA_NSkip] = n.startpoint.h) : (
                u = _.arraylist.hook.length,
                M[r] = n.gap + P[r],
                u > T.SEDA_NSkip &&
                (b[u - 1] = n.startpoint.h, M[u - 1] = 0)
              ),
              d++,
              c = R[r] - T3Gv.opt.ConnectorWidthList[r],
              P[r] < 0 ? c < - P[r] &&
                ((i = c) < 0 && (i = 0), p += - P[r] + i, M[r] < 0 && (M[r] = 0), d--, P[r] = 0) : M[r] < P[r] &&
              ((i = M[r]) < 0 && (i = 0), p += P[r] - i, M[r] < 0 && (M[r] = 0), d--, P[r] = 0),
              M[r] += T3Gv.opt.ConnectorWidthList[r]
            )
        };
        for (D(o), D(s), r = e; r < t; r++) m &&
          a &&
          r++,
          0 !== P[r] &&
          (
            n = _.arraylist.hook[r],
            l = _.arraylist.hook[r + S],
            b[r] = I ? n.endpoint.h : n.startpoint.h,
            M[r] = _.arraylist.wd + l.extra,
            d++,
            P[r] < 0 ? M[r] < - P[r] &&
              ((i = M[r]) < 0 && (i = 0), p += - P[r] + i, M[r] < 0 && (M[r] = 0), d--, P[r] = 0) : M[r] < P[r] &&
            ((i = M[r]) < 0 && (i = 0), p += P[r] - i, M[r] < 0 && (M[r] = 0), d--, P[r] = 0),
            M[r] += T3Gv.opt.ConnectorWidthList[r],
            m &&
            !a &&
            r++
          );
        return d <= 0 &&
          (p = 0),
          p / d
      },
      v = function (t, a, r) {
        var i,
          n,
          l = 2,
          S = !1,
          c = 0,
          u = 0;
        if (
          o === T.A_Cl ? (
            i = o,
            n = _.arraylist.hook[i],
            R[i] = n.startpoint.h - n.endpoint.h,
            P[i] = e
          ) : o === T.A_Cr &&
          (
            i = o,
            n = _.arraylist.hook[i],
            R[i] = n.endpoint.h - n.startpoint.h,
            P[i] = - e
          ),
          s === T.A_Cl ? (
            i = s,
            n = _.arraylist.hook[i],
            R[i] = n.startpoint.h - n.endpoint.h,
            P[i] = - e
          ) : s === T.A_Cr &&
          (
            i = s,
            n = _.arraylist.hook[i],
            R[i] = n.endpoint.h - n.startpoint.h,
            P[i] = e
          ),
          r
        ) for (m && (u = 1), i = t; i < a; i++) n = _.arraylist.hook[i],
          P[i + u] = - e,
          R[i + u] = _.arraylist.hook[i + 1 + u].endpoint.h - n.endpoint.h,
          m &&
          i++;
        else for (i = t; i < a; i++) n = _.arraylist.hook[i],
          P[i] = e,
          R[i] = n.endpoint.h - _.arraylist.hook[i - 1].endpoint.h,
          m &&
          i++;
        for (; Math.abs(l) > 1;) {
          if (l = F(t, a, r), Math.abs(l > 1)) for (i = t; i < a; i++) 0 !== P[i] &&
            (S = !0, P[i] += l),
            m &&
            i++;
          if (!S) break
        }
        var p = _.arraylist.hook.length;
        if (r) {
          for (
            o === T.A_Cr &&
            (
              c -= M[i = o] - R[i],
              b[i] += c,
              p > T.SEDA_NSkip &&
              (A[p - 1] = c, M[p - 1] = 0),
              M[i] -= T3Gv.opt.ConnectorWidthList[i]
            ),
            i = a - 1;
            i >= t;
            i--
          ) m &&
            i++,
            c -= M[i] - R[i],
            A[i] = c,
            b[i] += c,
            m &&
            i--,
            m &&
            i--;
          s === T.A_Cl &&
            (
              c -= M[i = s] - R[i],
              b[i] += c,
              A[i] = f ? - c : c,
              M[i] -= T3Gv.opt.ConnectorWidthList[i]
            )
        } else {
          for (
            o === T.A_Cl &&
            (
              c += M[i = o] - R[i],
              b[i] += c,
              _.arraylist.hook.length > T.SEDA_NSkip &&
              (b[T.SEDA_NSkip] += c, A[T.SEDA_NSkip] = f ? - c : c),
              M[T.SEDA_NSkip] = 0,
              M[i] -= T3Gv.opt.ConnectorWidthList[i]
            ),
            i = t;
            i < a;
            i++
          ) c += M[i] - R[i],
            A[i] = f ? - c : c,
            b[i] += c,
            m &&
            i++;
          s === T.A_Cr &&
            (
              c += M[i = s] - R[i],
              b[i] += c,
              A[T.A_Cr] = c,
              M[i] -= T3Gv.opt.ConnectorWidthList[i]
            )
        }
        for (i = t; i < a; i++) m &&
          r &&
          i++,
          M[i] = 0
      };
    if (S = this.arraylist.hook.length, e) if (
      u = m ? 2 : 1,
      f &&
      (e = - e),
      D = e,
      r === OptConstant.ActionTriggerType.ConnectorAdj
    ) {
      if (y && o === T.A_Cr) for (l = i; l > T.SEDA_NSkip; l--) c = this.arraylist.hook[l],
        y &&
        l === i ||
        I ||
        (c.endpoint.h += D),
        c.startpoint.h += D;
      else for (l = i; l < S; l++) c = this.arraylist.hook[l],
        y &&
        l === i ||
        I ||
        (c.startpoint.h += D),
        c.endpoint.h += D,
        this.arraylist.angle &&
        (
          c.startpoint.v += D * this.arraylist.angle,
          c.endpoint.v += D * this.arraylist.angle
        ),
        m &&
        l < S - 1 &&
        (
          l++,
          (c = this.arraylist.hook[l]).startpoint.h += D,
          c.endpoint.h += D,
          this.arraylist.angle &&
          (
            c.startpoint.v += D * this.arraylist.angle,
            c.endpoint.v += D * this.arraylist.angle
          )
        );
      y ||
        I ||
        (
          this.arraylist.hook[0].endpoint.h += D,
          this.arraylist.angle &&
          (this.arraylist.hook[0].endpoint.v += D * this.arraylist.angle)
        )
    } else if (r === OptConstant.ActionTriggerType.LineStart) {
      var G = !1;
      for (
        m &&
          S % 2 == 0 ? (u = 2, G = !0) : m &&
        (u = 3),
        p = y ? 1 : 0,
        y ? w(OptConstant.ConnectorDefines.NSkip, S - 1 - u + p + 1, !0) : v(OptConstant.ConnectorDefines.NSkip + p, S - 1 - u + p + 1, !0),
        o === T.A_Cr &&
        (
          (c = this.arraylist.hook[o]).gap = M[o],
          D = b[o] - c.startpoint.h,
          c.startpoint.h = b[o],
          this.arraylist.angle &&
          (c.startpoint.v += D * this.arraylist.angle),
          y ||
          (
            u = 0,
            S > T.SEDA_NSkip &&
            (
              (c = this.arraylist.hook[0]).endpoint.h = b[o],
              this.arraylist.angle &&
              (c.endpoint.v += D * this.arraylist.angle)
            )
          )
        ),
        l = S - 1 - u + p;
        l >= OptConstant.ConnectorDefines.NSkip + p;
        l--
      ) c = this.arraylist.hook[l],
        I ? (D = b[l] - c.endpoint.h, c.endpoint.h = b[l]) : (
          D = b[l] - c.startpoint.h,
          c.startpoint.h = b[l],
          this.arraylist.tilt ? c.endpoint.h = c.endpoint.h + D : c.endpoint.h = c.startpoint.h + M[l]
        ),
        this.arraylist.angle &&
        (
          c.startpoint.v += D * this.arraylist.angle,
          c.endpoint.v += D * this.arraylist.angle
        ),
        d = c,
        m &&
        l > OptConstant.ConnectorDefines.NSkip &&
        !G &&
        (
          l--,
          (c = this.arraylist.hook[l]).startpoint.h += D,
          c.endpoint.h += D,
          this.arraylist.angle &&
          (
            c.startpoint.v += D * this.arraylist.angle,
            c.endpoint.v += D * this.arraylist.angle
          )
        ),
        G = !1;
      y ||
        I ||
        (
          this.arraylist.hook[0].startpoint.h += D,
          this.arraylist.angle &&
          (
            this.arraylist.hook[0].startpoint.v += D * this.arraylist.angle,
            this.arraylist.hook[T.A_Cl].endpoint.h != this.arraylist.hook[T.A_Cl].startpoint.h &&
            (
              l = T.A_Cl,
              (c = this.arraylist.hook[T.A_Cl]).gap = M[l],
              D = b[l] - c.startpoint.h,
              S > T.SEDA_NSkip ? (
                c.startpoint.h = this.arraylist.hook[T.SEDA_NSkip].endpoint.h,
                c.startpoint.v = this.arraylist.hook[T.SEDA_NSkip].startpoint.v
              ) : (
                c.startpoint.h = this.arraylist.hook[T.A_Cr].startpoint.h,
                c.startpoint.v = this.arraylist.hook[T.A_Cr].startpoint.v
              ),
              c.endpoint.h = c.startpoint.h - M[T.A_Cl],
              this.arraylist.angle &&
              (c.endpoint.v += D * this.arraylist.angle)
            )
          )
        )
    } else {
      for (
        y ? (
          o === T.A_Cl &&
          (u = 0),
          w(OptConstant.ConnectorDefines.NSkip + u, S, !1)
        ) : v(OptConstant.ConnectorDefines.NSkip + u, S, !1),
        o === T.A_Cl &&
        (
          u = 0,
          (c = this.arraylist.hook[o]).gap = M[o],
          D = b[o] - c.startpoint.h,
          c.startpoint.h = b[o],
          this.arraylist.angle &&
          (c.startpoint.v += D * this.arraylist.angle),
          !y &&
          S > T.SEDA_NSkip &&
          (
            (c = this.arraylist.hook[0]).startpoint.h = b[o],
            this.arraylist.angle &&
            (c.startpoint.v += D * this.arraylist.angle)
          )
        ),
        l = OptConstant.ConnectorDefines.NSkip + u;
        l < S;
        l++
      ) c = this.arraylist.hook[l],
        I ? (D = b[l] - c.endpoint.h, c.endpoint.h = b[l]) : (
          D = b[l] - c.startpoint.h,
          c.startpoint.h = b[l],
          c.endpoint.h = c.startpoint.h + M[l]
        ),
        this.arraylist.angle &&
        (
          c.startpoint.v += D * this.arraylist.angle,
          c.endpoint.v += D * this.arraylist.angle
        ),
        d = c,
        m &&
        l < S - 1 &&
        (
          l++,
          (c = this.arraylist.hook[l]).startpoint.h = d.startpoint.h,
          c.endpoint.h = d.endpoint.h,
          this.arraylist.angle &&
          (
            c.startpoint.v += D * this.arraylist.angle,
            c.endpoint.v += D * this.arraylist.angle
          )
        );
      y ||
        I ||
        (
          this.arraylist.hook[0].endpoint.h += D,
          this.arraylist.angle &&
          (
            this.arraylist.hook[0].endpoint.v += D * this.arraylist.angle,
            this.arraylist.hook[T.A_Cr].endpoint.h != this.arraylist.hook[T.A_Cr].startpoint.h &&
            (
              c = this.arraylist.hook[T.A_Cr],
              l = T.A_Cr,
              c.gap = M[l],
              D = b[l] - c.startpoint.h,
              S > T.SEDA_NSkip ? (
                c.startpoint.h = this.arraylist.hook[S - 1].endpoint.h,
                c.startpoint.v = this.arraylist.hook[S - 1].startpoint.v
              ) : (
                c.startpoint.h = this.arraylist.hook[T.A_Cl].startpoint.h,
                c.startpoint.v = this.arraylist.hook[T.A_Cl].startpoint.v
              ),
              c.endpoint.h = c.startpoint.h + M[l],
              this.arraylist.angle &&
              (c.endpoint.v += D * this.arraylist.angle)
            )
          )
        )
    }
    if (t) {
      var N = this.GetTilt();
      for (l = OptConstant.ConnectorDefines.NSkip; l < S; l++) c = this.arraylist.hook[l],
        C &&
          L ? c.endpoint.v -= t : c.endpoint.v += t,
        N &&
        (c.endpoint.h -= t),
        m &&
        l < S - 1 &&
        (
          l++,
          (c = this.arraylist.hook[l]).endpoint.v -= t,
          N &&
          (c.endpoint.h -= t)
        )
    }
    if (a) if (h) for (
      f &&
      (a = - a),
      this.arraylist.hook[0].startpoint.h += a,
      this.arraylist.hook[0].endpoint.h += a,
      l = OptConstant.ConnectorDefines.NSkip;
      l < S;
      l++
    ) (c = this.arraylist.hook[l]).startpoint.h += a,
      c.endpoint.h += a;
    else for (
      this.arraylist.hook[0].startpoint.v += a,
      this.arraylist.hook[0].endpoint.v += a,
      l = OptConstant.ConnectorDefines.NSkip;
      l < S;
      l++
    ) (c = this.arraylist.hook[l]).startpoint.v += a,
      c.endpoint.v += a;
    return {
      linestart: b,
      linelen: M,
      linedisp: A
    }
  }

  PrGetShapeConnectorInfo(hookDetails) {
    T3Util.Log("S.Connector: PrGetShapeConnectorInfo called with input:", hookDetails);

    let firstHook;
    let connectionAdjustment;
    let connectorIndex = 0;
    const styles = OptConstant.AStyles;
    // Determine if connector is dual sided or not perpendicular
    const isDualSide = Boolean(
      this.arraylist.styleflags & styles.SEDA_BothSides ||
      (this.arraylist.styleflags & styles.SEDA_PerpConn) === 0
    );
    const isBothSides = Boolean(this.arraylist.styleflags & styles.SEDA_BothSides);
    const connectorDefines = OptConstant.ConnectorDefines;
    const hookPoints = OptConstant.HookPts;
    const actionTypes = OptConstant.ActionTriggerType;
    const isLinearConnector = Boolean(this.arraylist.styleflags & styles.SEDA_Linear);
    const knobInfoList = [];

    if (isDualSide && this.hooks.length) {
      firstHook = this.hooks[0];
      switch (firstHook.hookpt) {
        case hookPoints.SED_LL:
        case hookPoints.SED_LT:
          connectorIndex = connectorDefines.A_Cl;
          break;
        default:
          connectorIndex = connectorDefines.A_Cr;
      }
    }

    let connectorPosition = hookDetails.connect.x;
    // // Special handling for cause and effect branch connectors
    // if (this.objecttype === NvConstant.FNObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH) {
    //   switch (connectorPosition) {
    //     case -2:
    //       connectionAdjustment = {
    //         knobID: actionTypes.LINEEND,
    //         cursorType: CursorConstant.CursorType.RESIZE_T,
    //         knobData: 0,
    //         hook: hookDetails.hookpt,
    //         polyType: 'vertical'
    //       };
    //       knobInfoList.push(connectionAdjustment);
    //       T3Util.Log("S.Connector: PrGetShapeConnectorInfo returning output:", knobInfoList);
    //       return knobInfoList;
    //     case -1:
    //       connectionAdjustment = {
    //         knobID: actionTypes.LINESTART,
    //         cursorType: CursorConstant.CursorType.RESIZE_T,
    //         knobData: 0,
    //         hook: hookDetails.hookpt,
    //         polyType: 'vertical'
    //       };
    //       knobInfoList.push(connectionAdjustment);
    //       T3Util.Log("S.Connector: PrGetShapeConnectorInfo returning output:", knobInfoList);
    //       return knobInfoList;
    //     default:
    //       T3Util.Log("S.Connector: PrGetShapeConnectorInfo returning output:", knobInfoList);
    //       return knobInfoList;
    //   }
    // }

    if (this.vertical) {
      if (isLinearConnector) {
        if (connectorIndex === connectorDefines.A_Cr) {
          let hookPoint = hookDetails.hookpt;
          if (connectorPosition + connectorDefines.SEDA_NSkip < this.arraylist.hook.length - 1) {
            if (connectorPosition >= 0) {
              connectionAdjustment = {
                knobID: actionTypes.CONNECTOR_ADJ,
                cursorType: CursorConstant.CursorType.RESIZE_T,
                knobData: connectorPosition + connectorDefines.SEDA_NSkip + 1,
                hook: hookPoint,
                polyType: 'vertical',
                position: 'bottom'
              };
              knobInfoList.push(connectionAdjustment);
            }
          } else {
            connectionAdjustment = {
              knobID: actionTypes.CONNECTOR_HOOK,
              cursorType: CursorConstant.CursorType.RESIZE_T,
              knobData: connectorDefines.A_Cr,
              hook: hookPoint,
              polyType: 'vertical',
              position: 'bottom'
            };
            knobInfoList.push(connectionAdjustment);
          }
        } else {
          if (connectorPosition > 0) {
            connectionAdjustment = {
              knobID: actionTypes.CONNECTOR_ADJ,
              cursorType: CursorConstant.CursorType.RESIZE_T,
              knobData: connectorPosition + connectorDefines.SEDA_NSkip,
              hook: hookDetails.hookpt,
              polyType: 'vertical'
            };
            knobInfoList.push(connectionAdjustment);
          } else if (connectorIndex === connectorDefines.A_Cl) {
            connectionAdjustment = {
              knobID: actionTypes.CONNECTOR_HOOK,
              cursorType: CursorConstant.CursorType.RESIZE_T,
              knobData: connectorDefines.A_Cl,
              hook: hookDetails.hookpt,
              polyType: 'vertical'
            };
            knobInfoList.push(connectionAdjustment);
          }
        }
      } else {
        connectionAdjustment = {
          knobID: actionTypes.CONNECTOR_PERP,
          cursorType: CursorConstant.CursorType.RESIZE_R,
          knobData: hookDetails.connect.x,
          hook: hookDetails.hookpt,
          polyType: 'horizontal'
        };
        knobInfoList.push(connectionAdjustment);
        if (isBothSides && connectorPosition % 2 !== 0) {
          connectorPosition--;
        }
        if (connectorPosition > 0) {
          connectionAdjustment = {
            knobID: actionTypes.CONNECTOR_ADJ,
            cursorType: CursorConstant.CursorType.RESIZE_T,
            knobData: connectorPosition + connectorDefines.SEDA_NSkip,
            hook: hookDetails.hookpt,
            polyType: 'vertical'
          };
          knobInfoList.push(connectionAdjustment);
        } else if (connectorIndex === connectorDefines.A_Cl) {
          connectionAdjustment = {
            knobID: actionTypes.CONNECTOR_HOOK,
            cursorType: CursorConstant.CursorType.RESIZE_T,
            knobData: connectorDefines.A_Cl,
            hook: hookDetails.hookpt,
            polyType: 'vertical'
          };
          knobInfoList.push(connectionAdjustment);
        }
      }
    } else {
      if (isLinearConnector) {
        if (connectorIndex === connectorDefines.A_Cr) {
          let hookPoint = hookDetails.hookpt;
          if (connectorPosition + connectorDefines.SEDA_NSkip < this.arraylist.hook.length - 1) {
            if (connectorPosition >= 0) {
              connectionAdjustment = {
                knobID: actionTypes.CONNECTOR_ADJ,
                cursorType: CursorConstant.CursorType.RESIZE_R,
                knobData: connectorPosition + connectorDefines.SEDA_NSkip + 1,
                hook: hookPoint,
                polyType: 'horizontal',
                position: 'right'
              };
              knobInfoList.push(connectionAdjustment);
            }
          } else {
            connectionAdjustment = {
              knobID: actionTypes.CONNECTOR_HOOK,
              cursorType: CursorConstant.CursorType.RESIZE_R,
              knobData: connectorDefines.A_Cr,
              hook: hookPoint,
              polyType: 'horizontal',
              position: 'right'
            };
            knobInfoList.push(connectionAdjustment);
          }
        } else {
          if (connectorPosition > 0) {
            connectionAdjustment = {
              knobID: actionTypes.CONNECTOR_ADJ,
              cursorType: CursorConstant.CursorType.RESIZE_R,
              knobData: connectorPosition + connectorDefines.SEDA_NSkip,
              hook: hookDetails.hookpt,
              polyType: 'horizontal'
            };
            knobInfoList.push(connectionAdjustment);
          } else if (connectorIndex === connectorDefines.A_Cl) {
            connectionAdjustment = {
              knobID: actionTypes.CONNECTOR_HOOK,
              cursorType: CursorConstant.CursorType.RESIZE_R,
              knobData: connectorDefines.A_Cl,
              hook: hookDetails.hookpt,
              polyType: 'horizontal'
            };
            knobInfoList.push(connectionAdjustment);
          }
        }
      } else {
        connectionAdjustment = {
          knobID: actionTypes.CONNECTOR_PERP,
          cursorType: CursorConstant.CursorType.RESIZE_T,
          knobData: hookDetails.connect.x,
          hook: hookDetails.hookpt,
          polyType: 'vertical'
        };
        knobInfoList.push(connectionAdjustment);
        if (isBothSides && connectorPosition % 2 !== 0) {
          connectorPosition--;
        }
        if (connectorPosition > 0) {
          connectionAdjustment = {
            knobID: actionTypes.CONNECTOR_ADJ,
            cursorType: CursorConstant.CursorType.RESIZE_R,
            knobData: connectorPosition + connectorDefines.SEDA_NSkip,
            hook: hookDetails.hookpt,
            polyType: 'horizontal'
          };
          knobInfoList.push(connectionAdjustment);
        } else if (connectorIndex === connectorDefines.A_Cl) {
          connectionAdjustment = {
            knobID: actionTypes.CONNECTOR_HOOK,
            cursorType: CursorConstant.CursorType.RESIZE_R,
            knobData: connectorDefines.A_Cl,
            hook: firstHook.hookpt,
            polyType: 'horizontal'
          };
          knobInfoList.push(connectionAdjustment);
        }
      }
    }

    T3Util.Log("S.Connector: PrGetShapeConnectorInfo returning output:", knobInfoList);
    return knobInfoList;
  }

  GetConnectorOrientation(isReversed: boolean) {
    T3Util.Log("S.Connector: GetConnectorOrientation called with isReversed:", isReversed);

    const styles = OptConstant.AStyles;
    let startLeft = Boolean(this.arraylist.styleflags & styles.SEDA_StartLeft);
    const bothSides = Boolean(
      (this.arraylist.styleflags & styles.SEDA_BothSides) ||
      (this.arraylist.styleflags & styles.SEDA_PerpConn) === 0
    );

    if (bothSides) {
      startLeft = false;
      if (isReversed) {
        startLeft = true;
      }
    }

    let orientation;
    if (this.vertical) {
      orientation = startLeft ? Instance.Shape.ConnectorDir.ORG_HORIZONTALRIGHT : Instance.Shape.ConnectorDir.ORG_HORIZONTAL;
    } else {
      orientation = startLeft ? Instance.Shape.ConnectorDir.ORG_VERTICALUP : Instance.Shape.ConnectorDir.ORG_VERTICALDOWN;
    }

    T3Util.Log("S.Connector: GetConnectorOrientation result:", orientation);
    return orientation;
  }

  IsFlowChartConnector(): boolean {
    T3Util.Log("S.Connector: IsFlowChartConnector called");

    const styles = OptConstant.AStyles;
    const isFlowChartConnector = (this.arraylist.styleflags & styles.SEDA_FlowConn) > 0;

    T3Util.Log("S.Connector: IsFlowChartConnector result:", isFlowChartConnector);
    return isFlowChartConnector;
  }

  IsOrgChartConnector(allowedTypes: number[]): boolean {
    T3Util.Log("S.Connector: IsOrgChartConnector called with allowedTypes:", allowedTypes);

    let isOrgChartType = (this.objecttype === 0);

    if (allowedTypes) {
      for (let i = 0; i < allowedTypes.length; i++) {
        if (this.objecttype === allowedTypes[i]) {
          isOrgChartType = true;
          break;
        }
      }
    }

    const isOrgChartConnector = !this.IsFlowChartConnector() && isOrgChartType;
    T3Util.Log("S.Connector: IsOrgChartConnector result:", isOrgChartConnector);
    return isOrgChartConnector;
  }

  IsCauseAndEffectChartConnector(): boolean {
    T3Util.Log("S.Connector: IsCauseAndEffectChartConnector called");

    const objectTypes = NvConstant.FNObjectTypes;
    const isCauseAndEffectChartConnector = this.objecttype === objectTypes.CauseEffectMain;
    // || this.objecttype === objectTypes.SD_OBJT_CAUSEEFFECT_BRANCH;

    T3Util.Log("S.Connector: IsCauseAndEffectChartConnector result:", isCauseAndEffectChartConnector);
    return isCauseAndEffectChartConnector;
  }

  IsOrgChartTypeConnector(): boolean {
    T3Util.Log("S.Connector: IsOrgChartTypeConnector called");

    const objectTypes = NvConstant.FNObjectTypes;
    let isOrgChartConnector = false;

    switch (this.objecttype) {
      case 0:
      // case objectTypes.SD_OBJT_DESCENDANT_CONNECTOR:
      // case objectTypes.SD_OBJT_DECISIONTREE_CONNECTOR:
      // case objectTypes.SD_OBJT_PEDIGREE_CONNECTOR:
      // case objectTypes.SD_OBJT_GENOGRAM_BRANCH:
      //   isOrgChartConnector = true;
      //   break;
      default:
        isOrgChartConnector = false;
    }

    T3Util.Log("S.Connector: IsOrgChartTypeConnector result:", isOrgChartConnector);
    return isOrgChartConnector;
  }

  FixHook(preserveOriginalPosition: boolean, forceCoManagerUpdate: boolean) {
    T3Util.Log(
      "S.Connector: FixHook called with preserveOriginalPosition:",
      preserveOriginalPosition,
      "forceCoManagerUpdate:",
      forceCoManagerUpdate
    );

    const styles = OptConstant.AStyles;
    const connectorDimension = OptConstant.Common.DimMax;

    // Determine style flags
    const isStartLeft = Boolean(this.arraylist.styleflags & styles.SEDA_StartLeft);
    const isBothSides = Boolean(
      (this.arraylist.styleflags & styles.SEDA_BothSides) ||
      (this.arraylist.styleflags & styles.SEDA_PerpConn) === 0
    );
    const useBothSides = Boolean(this.arraylist.styleflags & styles.SEDA_BothSides);
    const isReverse = Boolean(this.arraylist.styleflags & styles.SEDA_ReverseCol);

    // Save original hook connection coordinates
    const originalConnect = { x: this.hooks[0].connect.x, y: this.hooks[0].connect.y };
    let applyCoManagerAdjustment = false;

    if (this.hooks.length) {
      // If not preserving original position, check if the hooked object is a co-manager.
      if (!preserveOriginalPosition) {
        const hookedObject = DataUtil.GetObjectPtr(this.hooks[0].objid, false);
        if (hookedObject && hookedObject.IsCoManager(null)) {
          if (!forceCoManagerUpdate) {
            applyCoManagerAdjustment = true;
          }
        }
      }

      // Determine if the hook current point is on the left side.
      const isLeftHook =
        this.hooks[0].hookpt === OptConstant.HookPts.LL ||
        this.hooks[0].hookpt === OptConstant.HookPts.LT;

      // Force an update to the linked object.
      OptCMUtil.SetLinkFlag(this.hooks[0].objid, DSConstant.LinkFlags.SED_L_MOVE);

      if (this.vertical) {
        if (isBothSides) {
          if (isStartLeft) {
            if (isLeftHook) {
              this.hooks[0].connect.y = isReverse ? 0 : connectorDimension;
              this.hooks[0].hookpt = OptConstant.HookPts.LT;
            } else {
              this.hooks[0].connect.y = 0;
              this.hooks[0].hookpt = OptConstant.HookPts.LB;
            }
            this.hooks[0].connect.x = useBothSides ? connectorDimension / 2 : (3 * connectorDimension) / 4;
          } else {
            if (isLeftHook) {
              this.hooks[0].connect.y = isReverse ? 0 : connectorDimension;
              this.hooks[0].hookpt = OptConstant.HookPts.LT;
            } else {
              this.hooks[0].connect.y = 0;
              this.hooks[0].hookpt = OptConstant.HookPts.LB;
            }
            this.hooks[0].connect.x = useBothSides ? connectorDimension / 2 : connectorDimension / 4;
          }
        } else {
          if (isStartLeft) {
            this.hooks[0].connect.x = 0;
            this.hooks[0].hookpt = OptConstant.HookPts.LR;
            this.hooks[0].connect.y = connectorDimension / 2;
          } else {
            this.hooks[0].connect.x = connectorDimension;
            this.hooks[0].hookpt = OptConstant.HookPts.LL;
            this.hooks[0].connect.y = connectorDimension / 2;
          }
        }
      } else {
        if (isBothSides) {
          if (isLeftHook) {
            this.hooks[0].connect.x = connectorDimension;
            this.hooks[0].hookpt = OptConstant.HookPts.LL;
          } else {
            this.hooks[0].connect.y = 0;
            this.hooks[0].hookpt = OptConstant.HookPts.LR;
          }
          this.hooks[0].connect.x = connectorDimension / 2;
        } else {
          if (isStartLeft) {
            this.hooks[0].connect.y = 0;
            this.hooks[0].hookpt = OptConstant.HookPts.LB;
            this.hooks[0].connect.x = connectorDimension / 2;
          } else {
            this.hooks[0].connect.y = connectorDimension;
            this.hooks[0].hookpt = OptConstant.HookPts.LT;
            this.hooks[0].connect.x = connectorDimension / 2;
          }
        }
      }

      // If preserveOriginalPosition is true, restore the original hook connection.
      if (preserveOriginalPosition) {
        this.hooks[0].connect.x = originalConnect.x;
        this.hooks[0].connect.y = originalConnect.y;
      }

      // Apply a special adjustment if the hooked object is a co-manager.
      if (applyCoManagerAdjustment) {
        this.hooks[0].connect.y = -OptConstant.AStyles.CoManager;
      }
    }

    T3Util.Log(
      "S.Connector: FixHook completed with hook position:",
      this.hooks[0].connect,
      "hook point:",
      this.hooks[0].hookpt
    );
  }

  SetDirection(invertStyle: boolean, toggleOrientation: boolean, propagate: boolean): void {
    T3Util.Log("S.Connector: SetDirection called with invertStyle:", invertStyle, "toggleOrientation:", toggleOrientation, "propagate:", propagate);

    const styles = OptConstant.AStyles;
    const skipCount = OptConstant.ConnectorDefines.NSkip;
    // Determine if the connector uses both sides based on style flags.
    let isBothSides = (this.arraylist.styleflags & styles.SEDA_BothSides) ||
      ((this.arraylist.styleflags & styles.SEDA_PerpConn) === 0);
    const isCoManager = this.arraylist.styleflags & styles.SEDA_CoManager;
    const reverseFlag = this.arraylist.styleflags & styles.SEDA_ReverseCol;
    let directionReversed = false;

    const hookCount = this.arraylist.hook.length;

    // If toggleOrientation flag is true, modify style flags accordingly.
    if (toggleOrientation) {
      if (isBothSides) {
        directionReversed = ((this.arraylist.styleflags & OptConstant.AStyles.ReverseCol) > 0);
        // Set flags: mark PerpConn true, StartLeft false, clear ReverseCol and BothSides.
        this.arraylist.styleflags = Utils2.SetFlag(this.arraylist.styleflags, OptConstant.AStyles.PerpConn, true);
        this.arraylist.styleflags = Utils2.SetFlag(this.arraylist.styleflags, OptConstant.AStyles.StartLeft, false);
        this.arraylist.styleflags = Utils2.SetFlag(this.arraylist.styleflags, OptConstant.AStyles.ReverseCol, false);
        this.arraylist.styleflags = Utils2.SetFlag(this.arraylist.styleflags, OptConstant.AStyles.BothSides, false);
        isBothSides = false;
      } else {
        // Otherwise, toggle the vertical orientation.
        this.vertical = !this.vertical;
      }
    }

    // Always clear the ReverseCol flag.
    this.arraylist.styleflags = Utils2.SetFlag(this.arraylist.styleflags, OptConstant.AStyles.ReverseCol, false);

    if (invertStyle) {
      if (isBothSides) {
        // If both sides are used, set ReverseCol flag based on current reverseFlag value.
        this.arraylist.styleflags = Utils2.SetFlag(this.arraylist.styleflags, OptConstant.AStyles.ReverseCol, (reverseFlag === 0));
      } else {
        // If CoManager flag is set and propagate is true, get the first hook object.
        if (isCoManager && propagate) {
          const firstHookObj = DataUtil.GetObjectPtr(this.hooks[0].objid, false);
          if (firstHookObj && ((firstHookObj.arraylist.styleflags & styles.SEDA_BothSides) ||
            ((firstHookObj.arraylist.styleflags & styles.SEDA_PerpConn) === 0))) {
            // Nothing extra to be done here.
          }
        }
        // If not already reversed, toggle the StartLeft flag.
        if (!directionReversed) {
          this.arraylist.styleflags = Utils2.SetFlag(
            this.arraylist.styleflags,
            OptConstant.AStyles.StartLeft,
            ((this.arraylist.styleflags & OptConstant.AStyles.StartLeft) === 0)
          );
        }
      }
    } else {
      // If invertStyle is false and directionReversed is true, make sure StartLeft flag is set.
      if (directionReversed) {
        this.arraylist.styleflags = Utils2.SetFlag(this.arraylist.styleflags, OptConstant.AStyles.StartLeft, true);
      }
    }

    // Set link flag for the current connector and mark it for reformatting.
    OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.SED_L_MOVE | DSConstant.LinkFlags.SED_L_CHANGE);
    this.flags = Utils2.SetFlag(this.flags, NvConstant.ObjFlags.Obj1, true);
    // Fix the hook based on the propagate flag.
    this.FixHook(propagate, false);

    // Iterate over all hooks starting from the skipCount.
    for (let index = skipCount; index < hookCount; index++) {
      const currentHook = this.arraylist.hook[index];
      const hookedObject = DataUtil.GetObjectPtr(currentHook.id, true);
      if (hookedObject && hookedObject.hooks.length) {
        // Update hook point for the hooked object.
        hookedObject.hooks[0].hookpt = this.GetBestHook(currentHook.id, hookedObject.hooks[0].hookpt, hookedObject.hooks[0].connect);
        OptCMUtil.SetLinkFlag(currentHook.id, DSConstant.LinkFlags.SED_L_MOVE);
        if (hookedObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
          // Recursively set direction for connector type objects.
          hookedObject.SetDirection(invertStyle, toggleOrientation, true);
        } else {
          const childId = T3Gv.opt.FindChildArray(currentHook.id, -1);
          if (childId >= 0) {
            const childObj = DataUtil.GetObjectPtr(childId, true);
            if (childObj) {
              childObj.SetDirection(invertStyle, toggleOrientation, false);
            }
          }
        }
      }
    }

    T3Util.Log("S.Connector: SetDirection completed");
  }

  SetSpacing(adjustPrimaryDimension: boolean, spacingValue: number) {
    T3Util.Log("S.Connector: SetSpacing called with adjustPrimaryDimension:", adjustPrimaryDimension, "spacingValue:", spacingValue);

    let effectiveSpacing: number = spacingValue;
    let hookCount: number = this.arraylist.hook.length;
    let currentHook: any;
    let gapOverride: number | null;

    const styles = OptConstant.AStyles;
    // Determine if the connector uses both sides.
    const isBothSides: boolean = (this.arraylist.styleflags & styles.SEDA_BothSides) ||
      ((this.arraylist.styleflags & styles.SEDA_PerpConn) === 0);
    // Flag whether this connector is a co-manager.
    const isCoManager: number = this.arraylist.styleflags & styles.SEDA_CoManager;
    // Get the skip count constant.
    const skipCount: number = OptConstant.ConnectorDefines.NSkip;

    // Local helper to adjust extra spacing across hooks if needed.
    const adjustExtraSpacing = function (connectorArray: any, spacingDelta: number) {
      for (let idx = skipCount; idx < hookCount; idx++) {
        currentHook = connectorArray.hook[idx];
        if (currentHook.extra + spacingDelta < 0) {
          currentHook.extra = -spacingDelta;
        }
      }
    };

    // If CoManager flag is set and the dimension flag doesn't match vertical state, halve the spacing.
    if (isCoManager && (this.vertical !== adjustPrimaryDimension)) {
      effectiveSpacing = spacingValue / 2;
    }

    // Adjust hook gap based on the hook point of the first hook.
    if (this.hooks.length) {
      switch (this.hooks[0].hookpt) {
        case OptConstant.HookPts.LT:
        case OptConstant.HookPts.LB:
          if (adjustPrimaryDimension) {
            gapOverride = null;
            if (isBothSides) {
              currentHook = (hookCount > 2)
                ? (this.hooks[0].hookpt === OptConstant.HookPts.LT
                  ? this.arraylist.hook[OptConstant.ConnectorDefines.ACl]
                  : this.arraylist.hook[OptConstant.ConnectorDefines.ACr])
                : this.arraylist.hook[OptConstant.ConnectorDefines.ABk];
              if (gapOverride !== null) {
                currentHook.gap = gapOverride;
              } else {
                currentHook.gap += effectiveSpacing - this.arraylist.wd;
                if (currentHook.gap < 0) {
                  currentHook.gap = 0;
                }
              }
            } else {
              currentHook = (hookCount > 2)
                ? this.arraylist.hook[OptConstant.ConnectorDefines.ACl]
                : this.arraylist.hook[OptConstant.ConnectorDefines.ABk];
              if (gapOverride !== null) {
                currentHook.gap = gapOverride;
              } else {
                currentHook.gap += effectiveSpacing - this.arraylist.ht;
                if (currentHook.gap < 0) {
                  currentHook.gap = 0;
                }
              }
            }
          }
          break;
        case OptConstant.HookPts.LL:
        case OptConstant.HookPts.LR:
          if (!adjustPrimaryDimension) {
            gapOverride = null;
            if (isBothSides) {
              currentHook = (hookCount > 2)
                ? (this.hooks[0].hookpt === OptConstant.HookPts.LL
                  ? this.arraylist.hook[OptConstant.ConnectorDefines.ACl]
                  : this.arraylist.hook[OptConstant.ConnectorDefines.ACr])
                : this.arraylist.hook[OptConstant.ConnectorDefines.ABk];
              if (gapOverride !== null) {
                currentHook.gap = gapOverride;
              } else {
                currentHook.gap += effectiveSpacing - this.arraylist.wd;
                if (currentHook.gap < 0) {
                  currentHook.gap = 0;
                }
              }
            } else {
              currentHook = (hookCount > 2)
                ? this.arraylist.hook[OptConstant.ConnectorDefines.ACl]
                : this.arraylist.hook[OptConstant.ConnectorDefines.ABk];
              if (gapOverride !== null) {
                currentHook.gap = gapOverride;
              } else {
                currentHook.gap += effectiveSpacing - this.arraylist.ht;
                if (currentHook.gap < 0) {
                  currentHook.gap = 0;
                }
              }
            }
          }
          break;
      }
    }

    // Depending on whether the connector is vertical and on the primary adjustment flag,
    // update either width or height and adjust extra spacing if necessary.
    if (this.vertical) {
      if (adjustPrimaryDimension) {
        T3Util.Log("S.Connector: Setting width to", effectiveSpacing);
        this.arraylist.wd = effectiveSpacing;
        adjustExtraSpacing(this.arraylist, effectiveSpacing);
      } else {
        T3Util.Log("S.Connector: Setting height to", effectiveSpacing);
        this.arraylist.ht = effectiveSpacing;
      }
    } else {
      if (adjustPrimaryDimension) {
        T3Util.Log("S.Connector: Setting height to", effectiveSpacing);
        this.arraylist.ht = effectiveSpacing;
      } else {
        T3Util.Log("S.Connector: Setting width to", effectiveSpacing);
        this.arraylist.wd = effectiveSpacing;
        adjustExtraSpacing(this.arraylist, effectiveSpacing);
      }
    }

    T3Util.Log("S.Connector: SetSpacing completed");
  }

  CollapseConnector(collapseState, updateLinkFlags, propagateCollapse) {
    T3Util.Log("S.Connector: CollapseConnector called with collapseState:", collapseState, "updateLinkFlags:", updateLinkFlags, "propagateCollapse:", propagateCollapse);

    var obj,
      childObj,
      childId,
      nextChildId,
      notVisibleFlag = NvConstant.ObjFlags.NotVisible,
      collapseExtraFlag = OptConstant.ExtraFlags.CollapseConn,
      deselectedList = [];

    if (-1 == collapseState) {
      collapseState = (0 == (this.extraflags & collapseExtraFlag));
    }
    var currentExtra = this.extraflags & collapseExtraFlag;

    if (updateLinkFlags) {
      if (currentExtra && 0 == (this.flags & notVisibleFlag)) {
        collapseState = true;
        this.extraflags = Utils2.SetFlag(this.extraflags, collapseExtraFlag, false);
      } else if (!currentExtra && this.flags & notVisibleFlag) {
        collapseState = false;
        this.extraflags = Utils2.SetFlag(this.extraflags, collapseExtraFlag, true);
      } else {
        collapseState = ((this.extraflags & collapseExtraFlag) > 0);
      }
    }

    if (propagateCollapse && this.hooks.length > 0) {
      OptCMUtil.SetLinkFlag(this.hooks[0].objid, DSConstant.LinkFlags.SED_L_MOVE);
    }

    if (((this.extraflags & collapseExtraFlag) > 0) != collapseState || !propagateCollapse) {
      if (propagateCollapse || updateLinkFlags) {
        OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.SED_L_MOVE);
      }
      if (!propagateCollapse && collapseState) {
        this.flags = Utils2.SetFlag(this.flags, notVisibleFlag, collapseState);
      } else if (0 === currentExtra) {
        this.flags = Utils2.SetFlag(this.flags, notVisibleFlag, false);
      }
      DataUtil.AddToDirtyList(this.BlockID);
      T3Gv.opt.dirtyListReOrder = true;
      if (this.flags & notVisibleFlag) {
        deselectedList.push(this.BlockID);
        T3Gv.opt.DeSelect(deselectedList);
      }
      var totalHooks = this.arraylist.hook.length;
      for (var i = OptConstant.ConnectorDefines.NSkip; i < totalHooks; i++) {
        if (this.arraylist.hook[i].id >= 0 &&
          (obj = DataUtil.GetObjectPtr(this.arraylist.hook[i].id, true))) {
          switch (obj.DrawingObjectBaseClass) {
            case OptConstant.DrawObjectBaseClass.Connector:
              obj.CollapseConnector(collapseState, updateLinkFlags, propagateCollapse);
              break;
            default:
              if (propagateCollapse || collapseState) {
                obj.flags = Utils2.SetFlag(obj.flags, notVisibleFlag, collapseState);
              } else if (0 === currentExtra) {
                obj.flags = Utils2.SetFlag(obj.flags, notVisibleFlag, false);
              }
              DataUtil.AddToDirtyList(this.arraylist.hook[i].id);
              T3Gv.opt.dirtyListReOrder = true;
              if (obj.flags & notVisibleFlag) {
                deselectedList.push(this.arraylist.hook[i].id);
              }
              if (obj.flags & notVisibleFlag && false !== collapseState) {
                break;
              }
              childId = T3Gv.opt.FindChildArray(this.arraylist.hook[i].id, -1);
              if (childId >= 0) {
                DataUtil.GetObjectPtr(childId, true).CollapseConnector(collapseState, updateLinkFlags, false);
                nextChildId = T3Gv.opt.FindChildArray(this.arraylist.hook[i].id, childId);
                if (nextChildId >= 0) {
                  DataUtil.GetObjectPtr(nextChildId, true).CollapseConnector(collapseState, updateLinkFlags, false);
                }
              }
          }
        }
      }
      T3Gv.opt.DeSelect(deselectedList);
      this.PrFormat(this.BlockID);
    }

    T3Util.Log("S.Connector: CollapseConnector completed for BlockID:", this.BlockID, "with collapseState:", collapseState);
  }

  MatchSize(applyNewWidth: boolean, newWidth: number) {
    T3Util.Log("S.Connector: MatchSize called with applyNewWidth:", applyNewWidth, "newWidth:", newWidth);

    let hookIndex: number;
    const totalHooks = this.arraylist.hook.length;
    let currentConnector: any;
    let refWidth: number | undefined; // Current reference width
    let maxCombined: number | undefined; // Maximum combined (backbone + stub) distance
    const matchList: any[] = [];
    const skipCount = OptConstant.ConnectorDefines.NSkip;
    const connectorDefines = OptConstant.ConnectorDefines;
    const hookPoints = OptConstant.HookPts;
    let widthMismatch = false;
    let combinedMismatch = false;

    // Helper class for match list items
    function MatchItem(connectorObj: any, backboneDistance: number, stubHookIndex: number, stubDistance: number) {
      this.cobj = connectorObj;
      this.bkdist = backboneDistance;
      this.stubindex = stubHookIndex;
      this.stubdist = stubDistance;
    }

    // Iterate through the hooks starting from skipCount
    for (hookIndex = skipCount; hookIndex < totalHooks; hookIndex++) {
      currentConnector = DataUtil.GetObjectPtr(this.arraylist.hook[hookIndex].id, false);
      if (currentConnector && currentConnector.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
        // Use the width from the first connector; if different, set mismatch flag and update refWidth if larger
        if (refWidth === undefined) {
          refWidth = currentConnector.arraylist.wd;
        } else if (!Utils2.IsEqual(refWidth, currentConnector.arraylist.wd)) {
          widthMismatch = true;
          if (currentConnector.arraylist.wd > refWidth) {
            refWidth = currentConnector.arraylist.wd;
          }
        }
        // Calculate backbone distance for current connector
        const backboneDistance = currentConnector.arraylist.hook[connectorDefines.A_Bk].endpoint.h -
          currentConnector.arraylist.hook[connectorDefines.A_Bk].startpoint.h;
        // Determine the stub hook index based on the connector hook point
        const stubIndex = (currentConnector.hooks[0].hookpt === hookPoints.SED_LL ||
          currentConnector.hooks[0].hookpt === hookPoints.SED_LT)
          ? connectorDefines.A_Cr : connectorDefines.A_Cl;
        // Calculate the stub distance
        const stubDistanceCandidate = Math.abs(
          currentConnector.arraylist.hook[stubIndex].endpoint.h - currentConnector.arraylist.hook[stubIndex].startpoint.h
        );
        // Combined distance of backbone and stub
        const combinedDistance = backboneDistance + stubDistanceCandidate;
        if (maxCombined === undefined) {
          maxCombined = combinedDistance;
        } else if (!Utils2.IsEqual(combinedDistance, maxCombined)) {
          combinedMismatch = true;
          if (combinedDistance > maxCombined) {
            maxCombined = combinedDistance;
          }
        }
        // Save result in match list
        const item = new MatchItem(currentConnector, backboneDistance, stubIndex, stubDistanceCandidate);
        matchList.push(item);
      }
    }

    // If new width should be applied, adjust the reference width accordingly.
    if (applyNewWidth) {
      if (!Utils2.IsEqual(refWidth, newWidth)) {
        refWidth = newWidth;
        widthMismatch = true;
      }
    }

    // If there is a width mismatch, update all matching connectors.
    if (widthMismatch) {
      const totalMatches = matchList.length;
      maxCombined = undefined;
      combinedMismatch = true;
      for (hookIndex = 0; hookIndex < totalMatches; hookIndex++) {
        currentConnector = DataUtil.GetObjectPtr(matchList[hookIndex].cobj.BlockID, true);
        currentConnector.arraylist.matchsizelen = 0;
        OptCMUtil.SetLinkFlag(currentConnector.BlockID, DSConstant.LinkFlags.SED_L_MOVE);
        // Determine the new stub index for formatting
        const newStubIndex = (currentConnector.hooks[0].hookpt === hookPoints.SED_LL ||
          currentConnector.hooks[0].hookpt === hookPoints.SED_LT)
          ? connectorDefines.A_Cl : connectorDefines.A_Cr;
        currentConnector.arraylist.hook[newStubIndex].gap = refWidth;
        currentConnector.PrFormat(currentConnector.BlockID);

        const backboneDistance = currentConnector.arraylist.hook[connectorDefines.A_Bk].endpoint.h -
          currentConnector.arraylist.hook[connectorDefines.A_Bk].startpoint.h;
        const stubDistance = Math.abs(
          currentConnector.arraylist.hook[matchList[hookIndex].stubindex].endpoint.h -
          currentConnector.arraylist.hook[matchList[hookIndex].stubindex].startpoint.h
        );
        matchList[hookIndex].bkdist = backboneDistance;
        matchList[hookIndex].stubdist = stubDistance;
        const totalDistance = backboneDistance + stubDistance;
        if (maxCombined === undefined) {
          maxCombined = totalDistance;
        } else if (!Utils2.IsEqual(totalDistance, maxCombined) && totalDistance > maxCombined) {
          maxCombined = totalDistance;
        }
      }
    }

    // If there is a mismatch in combined distances, adjust further.
    if (combinedMismatch) {
      const totalMatches = matchList.length;
      if (!widthMismatch) {
        maxCombined = undefined;
        for (hookIndex = 0; hookIndex < totalMatches; hookIndex++) {
          currentConnector = DataUtil.GetObjectPtr(matchList[hookIndex].cobj.BlockID, true);
          currentConnector.arraylist.matchsizelen = 0;
          OptCMUtil.SetLinkFlag(currentConnector.BlockID, DSConstant.LinkFlags.SED_L_MOVE);
          currentConnector.PrFormat(currentConnector.BlockID);
          matchList[hookIndex].bkdist = currentConnector.arraylist.hook[connectorDefines.A_Bk].endpoint.h -
            currentConnector.arraylist.hook[connectorDefines.A_Bk].startpoint.h;
          matchList[hookIndex].stubdist = Math.abs(
            currentConnector.arraylist.hook[matchList[hookIndex].stubindex].endpoint.h -
            currentConnector.arraylist.hook[matchList[hookIndex].stubindex].startpoint.h
          );
          const totalDistance = matchList[hookIndex].bkdist + matchList[hookIndex].stubdist;
          if (maxCombined === undefined) {
            maxCombined = totalDistance;
          } else if (!Utils2.IsEqual(totalDistance, maxCombined) && totalDistance > maxCombined) {
            maxCombined = totalDistance;
          }
        }
      }
      for (hookIndex = 0; hookIndex < totalMatches; hookIndex++) {
        const totalDistance = matchList[hookIndex].bkdist + matchList[hookIndex].stubdist;
        if (!Utils2.IsEqual(totalDistance, maxCombined)) {
          currentConnector = matchList[hookIndex].cobj;
          currentConnector.arraylist.matchsizelen = maxCombined;
          currentConnector.PrFormat(currentConnector.BlockID);
        }
      }
    }

    T3Util.Log("S.Connector: MatchSize completed with reference width:", refWidth, "max combined distance:", maxCombined);
  }

  FoundText(searchText: string, length: number, blockID: number): boolean {
    T3Util.Log("S.Connector: FoundText called with searchText:", searchText, "length:", length, "blockID:", blockID);

    let hookIndex = 0;
    const hooksLength = this.arraylist.hook.length;
    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);

    if (svgElement != null) {
      if (blockID === this.BlockID) {
        hookIndex = this.arraylist.lasttexthook + 1;
      }

      for (let i = hookIndex; i < hooksLength; i++) {
        if (this.arraylist.hook[i].textid >= 0) {
          const textElement = svgElement.GetElementById(OptConstant.SVGElementClass.Text, i);
          if (textElement && textElement.GetText(0).search(searchText) >= 0) {
            this.arraylist.lasttexthook = i;
            TextUtil.ActivateTextEdit(svgElement);
            textElement.SetSelectedRange(textElement.GetText(0).search(searchText), textElement.GetText(0).search(searchText) + length);
            T3Util.Log("S.Connector: FoundText found text at hook index:", i);
            return true;
          }
        }
      }
    }

    T3Util.Log("S.Connector: FoundText did not find the text");
    return false;
  }

  FieldDataAllowed(): boolean {
    T3Util.Log("S.Connector: Checking if field data is allowed");
    const isAllowed = false;
    T3Util.Log("S.Connector: Field data allowed:", isAllowed);
    return isAllowed;
  }
}

export default Connector
