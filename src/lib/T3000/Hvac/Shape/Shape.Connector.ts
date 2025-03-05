

import BaseDrawingObject from './Shape.BaseDrawingObject'
import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import GlobalData from '../Data/GlobalData'
import DefaultEvt from "../Event/EvtUtil";
import Point from '../Model/Point';
import Document from '../Basic/Basic.Document'
import Element from '../Basic/Basic.Element'
import ConstantData from '../Data/ConstantData'
import HitResult from '../Model/HitResult'
import Hook from '../Model/Hook'
import SelectionAttributes from '../Model/SelectionAttributes'
import RightClickData from '../Model/RightClickData'
import PathPoint from '../Model/PathPoint'
import Rectangle from '../Model/Rectangle'
import CRect from '../Model/CRect'
import StepRect from '../Model/StepRect'
import SEDAHook from '../Model/SEDAHook'
import SEDArray from '../Model/SEDArray'
import ConstantData1 from "../Data/ConstantData1"
import ArrowheadRecord from '../Model/ArrowheadRecord'
import Instance from '../Data/Instance/Instance';
import ShapeAttrUtil from '../Opt/ShapeAttrUtil';

class Connector extends BaseDrawingObject {

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
    console.log('S.Connector: Input options:', options);

    options = options || {};
    options.DrawingObjectBaseClass = ConstantData.DrawingObjectBaseClass.CONNECTOR;
    options.targflags = ConstantData.HookFlags.SED_LC_Shape;
    options.hookflags = ConstantData.HookFlags.SED_LC_Shape;

    let arraylist = options.arraylist || new SEDArray();

    if (options.styleflags != null) {
      arraylist.styleflags = options.styleflags;
    } else {
      arraylist.styleflags = ConstantData.SEDA_Styles.SEDA_PerpConn | ConstantData.SEDA_Styles.SEDA_MinZero;
    }

    arraylist.ht = options.arrayht == null ? ConstantData.ConnectorDefines.DefaultHt : options.arrayht;
    arraylist.wd = options.arraywd == null ? ConstantData.ConnectorDefines.DefaultWd : options.arraywd;
    arraylist.curveparam = options.curveparam || 0;

    var hook = new SEDAHook();
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
    this.TextFlags = Utils2.SetFlag(this.TextFlags, ConstantData.TextFlags.SED_TF_HorizText, !this.TextDirection);

    console.log('S.Connector: Output instance:', this);
  }

  _IsChildOfAssistant() {
    console.log('S.Connector: Checking if child of assistant. Hooks:', this.hooks);

    if (this.hooks.length) {
      const firstHookObject = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);
      console.log('S.Connector: First hook object:', firstHookObject);

      if (firstHookObject && firstHookObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR) {
        const isAssistantConnector = firstHookObject.IsAsstConnector();
        console.log('S.Connector: Is assistant connector:', isAssistantConnector);
        return isAssistantConnector;
      }
    }

    console.log('S.Connector: Not a child of assistant.');
    return false;
  }

  LinkNotVisible() {
    console.log('S.Connector: Checking link visibility.');

    const isCoManager = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_CoManager;
    const isChildOfAssistant = this._IsChildOfAssistant();

    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) {
      if (!this.hooks.length || isCoManager || isChildOfAssistant) {
        console.log('S.Connector: Link is not visible due to hooks, co-manager, or assistant status.');
        return true;
      }

      const firstHookObject = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);
      if (firstHookObject && (firstHookObject.flags & ConstantData.ObjFlags.SEDO_NotVisible)) {
        console.log('S.Connector: Link is not visible due to first hook object visibility.');
        return true;
      }
    }

    console.log('S.Connector: Link is visible.');
    return false;
  }

  GetTextOnLineParams(hook) {
    console.log('S.Connector: Input hook:', hook);

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

    console.log('S.Connector: Output params:', params);
    return params;
  }

  ChangeBackgroundColor(newColor: string, currentColor: string) {
    console.log('S.Connector: Input newColor:', newColor, 'currentColor:', currentColor);

    if (
      this.StyleRecord.Fill.Paint.FillType !== ConstantData.FillTypes.SDFILL_TRANSPARENT &&
      this.StyleRecord.Fill.Paint.Color.toLowerCase() === currentColor.toLowerCase()
    ) {
      GlobalData.optManager.GetObjectPtr(this.BlockID, true);
      this.StyleRecord.Fill.Paint.Color = newColor;
      GlobalData.optManager.AddToDirtyList(this.BlockID);
    }

    console.log('S.Connector: Updated StyleRecord.Fill.Paint.Color:', this.StyleRecord.Fill.Paint.Color);
  }

  AddSVGTextObject(svgDoc, parentElement, hookIndex) {
    console.log('S.Connector: Input svgDoc:', svgDoc, 'parentElement:', parentElement, 'hookIndex:', hookIndex);

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

    const backgroundRect = svgDoc.CreateShape(ConstantData.CreateShapeType.RECT);
    backgroundRect.SetID(ConstantData.SVGElementClass.TEXTBACKGROUND);
    backgroundRect.SetUserData(hookIndex);
    backgroundRect.SetStrokeWidth(0);
    const fillColor = this.StyleRecord.Fill.Paint.Color;
    backgroundRect.SetFillColor(fillColor);
    if (this.StyleRecord.Fill.Paint.FillType === ConstantData.FillTypes.SDFILL_TRANSPARENT) {
      backgroundRect.SetOpacity(0);
    } else {
      backgroundRect.SetOpacity(this.StyleRecord.Fill.Paint.Opacity);
    }

    const textElement = svgDoc.CreateShape(ConstantData.CreateShapeType.TEXT);
    textElement.SetID(ConstantData.SVGElementClass.TEXT);
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

    const textData = GlobalData.objectStore.GetObject(hook.textid);
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

    textElement.SetConstraints(GlobalData.optManager.theContentHeader.MaxWorkDim.x, 0, rect.height);
    if (this.bInGroup) {
      textElement.DisableHyperlinks(true);
    }
    textElement.SetRenderingEnabled(true);
    Instance.Shape.BaseLine.prototype.TextDirectionCommon.call(this, textElement, backgroundRect, false, hook);
    textElement.SetEditCallback(GlobalData.optManager.TextCallback, parentElement);

    console.log('S.Connector: Output textElement:', textElement);
  }

  CreateShape(svgDoc, isHidden) {
    console.log('S.Connector: Input svgDoc:', svgDoc, 'isHidden:', isHidden);

    let isCoManager = (this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_CoManager) > 0;
    let isChildOfAssistant = this._IsChildOfAssistant();
    let isFlowChartConnector = this._IsFlowChartConnector();
    let isGenoConnector = this.IsGenoConnector();
    let isCauseEffectMain = this.objecttype === ConstantData.ObjectTypes.SD_OBJT_CAUSEEFFECT_MAIN;
    let skipCount = ConstantData.ConnectorDefines.SEDA_NSkip;

    GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);

    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) {
      if (this.hooks.length && !isCoManager && !isChildOfAssistant && !isFlowChartConnector && !isCauseEffectMain && !isGenoConnector) {
        let firstHookObject = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);
        if (firstHookObject && !(firstHookObject.flags & ConstantData.ObjFlags.SEDO_NotVisible)) {
          let shapeContainer = svgDoc.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER);
          this._CreateCollapseButton(svgDoc, shapeContainer, true);
          shapeContainer.ExcludeFromExport(true);
          console.log('S.Connector: Output shapeContainer:', shapeContainer);
          return shapeContainer;
        }
      }
      console.log('S.Connector: Output null due to visibility.');
      return null;
    }

    let polylineShape = svgDoc.CreateShape(ConstantData.CreateShapeType.POLYPOLYLINE);
    polylineShape.SetID(ConstantData.SVGElementClass.SHAPE);

    let slopShape = svgDoc.CreateShape(ConstantData.CreateShapeType.POLYPOLYLINE);
    slopShape.SetID(ConstantData.SVGElementClass.SLOP);
    slopShape.ExcludeFromExport(true);

    let frame = this.Frame;
    let styleRecord = this.StyleRecord;
    let lineColor = styleRecord.Line.Paint.Color;
    let lineThickness = styleRecord.Line.Thickness;
    let lineOpacity = styleRecord.Line.Paint.Opacity;
    let linePattern = styleRecord.Line.LinePattern;
    let frameWidth = frame.width;
    let frameHeight = frame.height;

    let shapeContainer = svgDoc.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER);
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
      slopShape.SetEventBehavior(Element.EventBehavior.HIDDEN_OUT);
    } else {
      slopShape.SetEventBehavior(Element.EventBehavior.NONE);
    }
    slopShape.SetStrokeWidth(lineThickness + ConstantData.Defines.SED_SlopShapeExtra);

    shapeContainer.AddElement(polylineShape);
    shapeContainer.AddElement(slopShape);

    this.ApplyStyles(polylineShape, styleRecord);
    this.ApplyEffects(shapeContainer, false, true);

    if (!isCoManager && !isChildOfAssistant && !isFlowChartConnector && !isCauseEffectMain && !isGenoConnector) {
      this._CreateCollapseButton(svgDoc, shapeContainer, false);
    }

    shapeContainer.isShape = true;
    if (this.arraylist.hook.length > skipCount) {
      this.AddIcons(svgDoc, shapeContainer);
    }

    console.log('S.Connector: Output shapeContainer:', shapeContainer);
    return shapeContainer;
  }

  AddIcon(svgDoc, parentElement, iconParams) {
    console.log('S.Connector: Input svgDoc:', svgDoc, 'parentElement:', parentElement, 'iconParams:', iconParams);

    if (parentElement) {
      const isFlowChartConnector = this._IsFlowChartConnector();
      const frame = this.Frame;
      this.nIcons;

      if (isFlowChartConnector) {
        if (this.hooks.length > 0) {
          if (this.hooks[0].hookpt === ConstantData.HookPts.SED_LL || this.hooks[0].hookpt === ConstantData.HookPts.SED_LT) {
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
        } else if (this.arraylist.hook.length > ConstantData.ConnectorDefines.SEDA_NSkip + 1) {
          if (this.vertical) {
            iconParams.y = this.arraylist.hook[ConstantData.ConnectorDefines.SEDA_NSkip + 1].startpoint.h + this.iconShapeRightOffset + this.nIcons * this.iconSize;
            iconParams.x = frame.width - this.iconShapeBottomOffset - this.iconSize;
          } else {
            iconParams.x = this.arraylist.hook[ConstantData.ConnectorDefines.SEDA_NSkip + 1].startpoint.h + this.iconShapeRightOffset + this.nIcons * this.iconSize;
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

      console.log('S.Connector: Output iconElement:', iconElement);
      return iconElement;
    }
  }

  PostCreateShapeCallback(svgDoc, parentElement, shapeId, shapeType) {
    console.log('S.Connector: PostCreateShapeCallback input:', svgDoc, parentElement, shapeId, shapeType);

    if (!(this.flags & ConstantData.ObjFlags.SEDO_NotVisible)) {
      let hookCount,
        visibleHooks,
        skipCount = ConstantData.ConnectorDefines.SEDA_NSkip,
        shapeElement = parentElement.GetElementByID(ConstantData.SVGElementClass.SHAPE),
        slopElement = parentElement.GetElementByID(ConstantData.SVGElementClass.SLOP),
        polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, false, false, null),
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

    console.log('S.Connector: PostCreateShapeCallback output:', this);
  }

  SetRuntimeEffects(enableEffects: boolean): void {
    console.log('S.Connector: SetRuntimeEffects input:', enableEffects);
    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    if (svgElement) {
      this.ApplyEffects(svgElement, enableEffects, true);
    }
    console.log('S.Connector: SetRuntimeEffects output:', this);
  }

  ApplyStyles(shape, styleRecord) {
    console.log("S.Connector: ApplyStyles input - shape:", shape, "styleRecord:", styleRecord);
    const fillType = styleRecord.Line.Paint.FillType;
    shape.SetStrokeOpacity(styleRecord.Line.Paint.Opacity);

    if (fillType === ConstantData.FillTypes.SDFILL_GRADIENT) {
      const gradientRecord = this.CreateGradientRecord(
        styleRecord.Line.Paint.GradientFlags,
        styleRecord.Line.Paint.Color,
        styleRecord.Line.Paint.Opacity,
        styleRecord.Line.Paint.EndColor,
        styleRecord.Line.Paint.EndOpacity
      );
      shape.SetGradientStroke(gradientRecord);
    } else if (fillType === ConstantData.FillTypes.SDFILL_RICHGRADIENT) {
      shape.SetGradientStroke(this.CreateRIchGradientRecord(styleRecord.Line.Paint.GradientFlags));
    } else if (fillType === ConstantData.FillTypes.SDFILL_TEXTURE) {
      const textureConfig = {
        url: '',
        scale: styleRecord.Line.Paint.TextureScale.Scale,
        alignment: styleRecord.Line.Paint.TextureScale.AlignmentScalar
      };
      const textureKey = styleRecord.Line.Paint.Texture;
      textureConfig.dim = GlobalData.optManager.TextureList.Textures[textureKey].dim;
      textureConfig.url = GlobalData.optManager.TextureList.Textures[textureKey].ImageURL;
      if (!textureConfig.url) {
        textureConfig.url = Constants.FilePath_CMSRoot + Constants.FilePath_Textures + GlobalData.optManager.TextureList.Textures[textureKey].filename;
      }
      shape.SetTextureStroke(textureConfig);
    } else if (fillType === ConstantData.FillTypes.SDFILL_SOLID) {
      shape.SetStrokeColor(styleRecord.Line.Paint.Color);
    } else {
      shape.SetStrokeColor('none');
    }
    console.log("S.Connector: ApplyStyles output - shape:", shape);
  }

  GetDimensionPoints() {
    console.log("S.Connector: GetDimensionPoints input:", { Dimensions: this.Dimensions, Frame: this.Frame });
    let resultPoints: Point[] = [];
    let polyPoints: Point[] = [];
    let segmentIndex = 0;
    let totalLength = 0;
    let deltaX = 0;
    let deltaY = 0;
    let startPoint: { x: number; y: number } = {};
    let endPoint: { x: number; y: number } = {};
    let rotationAngle: number;

    if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_EndPts) {
      resultPoints.push(new Point(
        this.StartPoint.x - this.Frame.x,
        this.StartPoint.y - this.Frame.y
      ));
      resultPoints.push(new Point(
        this.EndPoint.x - this.Frame.x,
        this.EndPoint.y - this.Frame.y
      ));
    } else if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Total) {
      polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
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

      rotationAngle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(
        new Point(0, 0),
        new Point(this.Frame.width, this.Frame.height)
      );
      Utils3.RotatePointsAboutPoint(midPoint, rotationAngle, resultPoints);
    } else {
      resultPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
    }
    console.log("S.Connector: GetDimensionPoints output:", resultPoints);
    return resultPoints;
  }

  _FindTextLabel(event) {
    console.log("S.Connector: _findTextLabel input:", event);
    // Get the polyline points for the connector shape
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false, null);
    const minHookIndex = ConstantData.ConnectorDefines.SEDA_NSkip;
    let hitResult = {};
    let textLabelIndex = -1;
    const styleConstants = ConstantData.SEDA_Styles;
    const isLinear = Boolean(this.arraylist.styleflags & styleConstants.SEDA_Linear);
    const isFlowConnection = Boolean(this.arraylist.styleflags & styleConstants.SEDA_FlowConn);

    if (event) {
      // Convert window coordinates to document coords
      const docCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
        event.gesture.center.clientX,
        event.gesture.center.clientY
      );
      // Find the SVG element that was clicked
      const svgElement = GlobalData.optManager.svgObjectLayer.FindElementByDOMElement(event.currentTarget);
      if (svgElement) {
        const targetElement = svgElement.GetTargetForEvent(event);
        const targetElementId = targetElement.GetID();
        // Check if the target element is either TEXTBACKGROUND or TEXT
        if (targetElementId === ConstantData.SVGElementClass.TEXTBACKGROUND || targetElementId === ConstantData.SVGElementClass.TEXT) {
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
          textLabelIndex = (this.hooks[0].hookpt === ConstantData.HookPts.SED_LR ||
            this.hooks[0].hookpt === ConstantData.HookPts.SED_LT)
            ? ConstantData.ConnectorDefines.A_Cr
            : ConstantData.ConnectorDefines.A_Cl;
        } else if (this.arraylist.hook.length >= minHookIndex + 1) {
          textLabelIndex = minHookIndex + 1;
        }
      } else if (textLabelIndex < 0 && this.arraylist.hook.length >= minHookIndex) {
        textLabelIndex = minHookIndex;
      }
    }

    console.log("S.Connector: _findTextLabel output:", textLabelIndex);
    return textLabelIndex;
  }

  SetTextObject(textId: number): boolean {
    console.log('S.Connector: SetTextObject input textId:', textId);

    const skipCount = ConstantData.ConnectorDefines.SEDA_NSkip;
    let lastTextHook = this.arraylist.lasttexthook;
    const totalHooks = this.arraylist.hook.length;
    const isLinear = Boolean(this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Linear);
    const textAlignment = ShapeAttrUtil.TextAlignToWin(this.TextAlign);
    const backgroundObj = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);

    // Update background color and fill based on text alignment
    this.StyleRecord.Fill.Paint.Color = backgroundObj.background.Paint.Color;
    if (textAlignment.vjust === ConstantData2.TextJust.TA_CENTER) {
      this.StyleRecord.Fill.Paint.FillType = ConstantData.FillTypes.SDFILL_SOLID;
      this.StyleRecord.Fill.Paint.Opacity = 1;
    } else {
      this.StyleRecord.Fill.Paint.FillType = ConstantData.FillTypes.SDFILL_TRANSPARENT;
    }

    // If textId is -2, do nothing.
    if (textId === -2) {
      console.log('S.Connector: SetTextObject output: false (textId is -2)');
      return false;
    }

    if (totalHooks >= skipCount) {
      if (isLinear) {
        lastTextHook = this._FindTextLabel();
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
      console.log('S.Connector: SetTextObject output: true');
      return true;
    }

    console.log('S.Connector: SetTextObject output: false');
    return false;
  }

  GetTextObject(inputEvent, unusedParam, hookContext) {
    console.log('S.Connector: GetTextObject input:', { inputEvent, hookContext });

    let hookIndex;
    if (inputEvent === null && hookContext !== null) {
      hookIndex = hookContext.hookindex;
    } else {
      hookIndex = this._FindTextLabel(inputEvent);
      if (hookContext !== null) {
        hookContext.hookindex = hookIndex;
      }
    }

    if (hookIndex < 0) {
      console.log('S.Connector: GetTextObject output:', null);
      return null;
    }

    const hook = this.arraylist.hook[hookIndex];
    if (hook === undefined) {
      console.log('S.Connector: GetTextObject output:', null);
      return null;
    }

    this.DataID = hook.textid;
    this.arraylist.lasttexthook = hookIndex;

    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    if (svgElement) {
      svgElement.textElem = svgElement.GetElementByID(ConstantData.SVGElementClass.TEXT, hookIndex);
    }

    console.log('S.Connector: GetTextObject output:', hook.textid);
    return hook.textid;
  }

  AdjustTextEditBackground(newColor: string, svgDoc: any) {
    console.log('S.Connector: AdjustTextEditBackground input - newColor:', newColor, 'svgDoc:', svgDoc);

    if (this.DataID !== -1) {
      const hookCount = this.arraylist.hook.length;

      if (this.arraylist.lasttexthook >= 0 && this.arraylist.lasttexthook < hookCount) {
        const lastHook = this.arraylist.hook[this.arraylist.lasttexthook];
        const svgElement = svgDoc || GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

        if (svgElement) {
          const textBackgroundElement = svgElement.GetElementByID(ConstantData.SVGElementClass.TEXTBACKGROUND, this.arraylist.lasttexthook);
          const textElement = svgElement.GetElementByID(ConstantData.SVGElementClass.TEXT, this.arraylist.lasttexthook);

          if (textElement && textBackgroundElement) {
            const isDefaultSvgDoc = svgDoc == null;
            Instance.Shape.BaseLine.prototype.TextDirectionCommon.call(this, textElement, textBackgroundElement, isDefaultSvgDoc, lastHook);
          }
        }
      }
    }

    console.log('S.Connector: AdjustTextEditBackground output - DataID:', this.DataID);
  }

  UpdateSVG(svgDoc, shapeElement, polyPoints) {
    console.log('S.Connector: UpdateSVG input:', { svgDoc, shapeElement, polyPoints });
    // Clear the current shape
    shapeElement.Clear();
    const styles = ConstantData.SEDA_Styles;
    const isLinear = !!(this.arraylist.styleflags & styles.SEDA_Linear);
    let startArrow = ConstantData1.ArrowheadLookupTable[this.StartArrowID];
    let endArrow = ConstantData1.ArrowheadLookupTable[this.EndArrowID];
    const arrowSize = ConstantData1.ArrowheadSizeTable[this.ArrowSizeIndex];

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
          curveSegment = GlobalData.optManager.Lines_AddCurve(isVertical, factorPrimary, factorSecondary, polyPoints[index].x + polyPoints[index].curvex, polyPoints[index].y, curveAmount);
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
          curveSegment = GlobalData.optManager.Lines_AddCurve(isVertical, factorPrimary, factorSecondary, polyPoints[index].x, polyPoints[index].y + polyPoints[index].curvey, curveAmount);
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
    console.log('S.Connector: UpdateSVG output:', shapeElement);
  }

  _CreateCollapseButton(svgDocument, parentElement, adjustCollapse) {
    console.log("S.Connector: _CreateCollapseButton input:", { svgDocument, parentElement, adjustCollapse });

    // Define local variables with readable names
    let collapseButton;
    let hooksCount;
    const knobSize = ConstantData.Defines.SED_CKnobSize;
    const style = ConstantData.SEDA_Styles;
    const reverseColumn = (this.arraylist.styleflags & style.SEDA_ReverseCol) !== 0;
    // bothSides is true if either the BothSides flag is set or the PerpConn flag is not set
    const bothSides = (this.arraylist.styleflags & style.SEDA_BothSides) !== 0 || (this.arraylist.styleflags & style.SEDA_PerpConn) === 0;
    const isRadial = (this.arraylist.styleflags & style.SEDA_Radial) !== 0 && !bothSides;
    const iconSize = knobSize;
    let offsetX = 0;
    let offsetY = 0;
    const hookPointOffset: { width?: number } = {};

    // Calculate the number of hooks after skipping preset ones
    hooksCount = this.arraylist ? this.arraylist.hook.length - ConstantData.ConnectorDefines.SEDA_NSkip : 0;
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
        case ConstantData.HookPts.SED_LR:
        case ConstantData.HookPts.SED_LB:
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
        iconID: ConstantData.Defines.HitAreas,
        userData: ConstantData.HitAreaType.CONNECTOR_EXPAND,
        cursorType: Element.CursorType.ADD_PLUS,
        x: hookPoint.x - this.Frame.x - iconSize / 2,
        y: hookPoint.y - this.Frame.y - iconSize / 2
      };

      // Set image URL and userData based on collapse/expand extra flags
      if (this.extraflags & ConstantData.ExtraFlags.SEDE_CollapseConn) {
        buttonConfig.imageURL = ConstantData.Defines.Connector_PlusPath;
        buttonConfig.userData = ConstantData.HitAreaType.CONNECTOR_EXPAND;
      } else {
        buttonConfig.imageURL = ConstantData.Defines.Connector_MinusPath;
        buttonConfig.userData = ConstantData.HitAreaType.CONNECTOR_COLLAPSE;
      }

      collapseButton = this.GenericIcon(buttonConfig);
      if (adjustCollapse) {
        parentElement.SetSize(iconSize, iconSize);
        parentElement.SetPos(this.Frame.x, this.Frame.y);
        parentElement.isShape = true;
      }
      parentElement.AddElement(collapseButton);
    }

    console.log("S.Connector: _CreateCollapseButton output:", { collapseButton });
  }

  CreateActionTriggers(svgDoc, targetId, extraParam, refId) {
    console.log("S.Connector: CreateActionTriggers input:", { svgDoc, targetId, extraParam, refId });

    // Create a group for all action trigger knobs
    const actionGroup = svgDoc.CreateShape(ConstantData.CreateShapeType.GROUP);

    // Knob sizing and style constants
    const knobSize = ConstantData.Defines.SED_KnobSize;
    const styleConstants = ConstantData.SEDA_Styles;
    const reverseColumnFlag = this.arraylist.styleflags & styleConstants.SEDA_ReverseCol;
    const hookPoints = ConstantData.HookPts;
    const connectorDefines = ConstantData.ConnectorDefines;

    // Get the document scale (adjust scale for small scales)
    let docScale = svgDoc.docInfo.docToScreenScale;
    if (svgDoc.docInfo.docScale <= 0.5) {
      docScale *= 2;
    }
    const scaledKnobSize = knobSize / docScale;

    // Determine the number of hooks from the arraylist (if any)
    const hookCount = this.arraylist && this.arraylist.hook ? this.arraylist.hook.length : 0;

    // Only continue if there are sufficient hooks or if object is of the proper type.
    if (hookCount <= connectorDefines.SEDA_NSkip && this.objecttype !== ConstantData.ObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH) {
      console.log("S.Connector: CreateActionTriggers output:", actionGroup);
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
    const targetObject = GlobalData.optManager.GetObjectPtr(targetId, false);

    // Set the appropriate resize cursors based on orientation.
    let primaryCursor, secondaryCursor;
    if (this.vertical) {
      primaryCursor = Element.CursorType.RESIZE_TB;
      secondaryCursor = Element.CursorType.RESIZE_LR;
    } else {
      primaryCursor = Element.CursorType.RESIZE_LR;
      secondaryCursor = Element.CursorType.RESIZE_TB;
    }

    // Factor for directional adjustments based on reverse flag
    const directionFactor = reverseColumnFlag ? -1 : 1;

    // Default knob settings object
    let knobSettings: any = {
      svgDoc: svgDoc,
      shapeType: ConstantData.CreateShapeType.RECT,
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
    if (this.flags & ConstantData.ObjFlags.SEDO_Lock) {
      knobSettings.fillColor = 'gray';
      knobSettings.locked = true;
    } else if (this.NoGrow()) {
      knobSettings.fillColor = 'red';
      // side knobs may be removed
      knobSettings.strokeColor = 'red';
      secondaryCursor = Element.CursorType.DEFAULT;
      primaryCursor = Element.CursorType.DEFAULT;
    }

    // Create the LINESTART knob if allowed.
    if ((
      // Anonymous function to decide if a LINESTART knob is allowed.
      (function (connector) {
        if (connector.objecttype === ConstantData.ObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH && connector.hooks.length) {
          switch (connector.hooks[0].hookpt) {
            case hookPoints.SED_LL:
            case hookPoints.SED_LT:
              return false;
            default:
              return true;
          }
        }
        return true;
      })(this)
    )) {
      knobSettings.x = this.StartPoint.x - frame.x;
      knobSettings.y = this.StartPoint.y - frame.y;
      if (targetObject && targetObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH) {
        const branchHook = this.arraylist.hook[connectorDefines.A_Cl];
        knobSettings.x += branchHook.endpoint.v - branchHook.startpoint.v;
        knobSettings.y += branchHook.endpoint.h - branchHook.startpoint.h;
      }
      knobSettings.knobID = ConstantData.ActionTriggerType.LINESTART;
      const startKnob = this.GenericKnob(knobSettings);
      actionGroup.AddElement(startKnob);
      // Save the start knob for potential replacement later.
      var savedStartKnob = startKnob;
    }

    // Create the LINEEND knob if allowed.
    if ((
      (function (connector) {
        if (connector.objecttype === ConstantData.ObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH && connector.hooks.length) {
          switch (connector.hooks[0].hookpt) {
            case hookPoints.SED_LR:
            case hookPoints.SED_LB:
              return false;
            default:
              return true;
          }
        }
        return true;
      })(this)
    )) {
      knobSettings.x = this.EndPoint.x - frame.x;
      knobSettings.y = this.EndPoint.y - frame.y;
      if (targetObject && targetObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH) {
        const branchHook = this.arraylist.hook[connectorDefines.A_Cr];
        knobSettings.x += branchHook.endpoint.v - branchHook.startpoint.v;
        knobSettings.y += branchHook.endpoint.h - branchHook.startpoint.h;
      }
      knobSettings.knobID = ConstantData.ActionTriggerType.LINEEND;
      const endKnob = this.GenericKnob(knobSettings);
      actionGroup.AddElement(endKnob);
      // Save the end knob for potential replacement later.
      var savedEndKnob = endKnob;
    }

    // Create hook knobs for additional triggers if targetObject has hooks and more than one connector hook.
    if (targetObject && targetObject.hooks && hookCount > 1 &&
      targetObject.objecttype !== ConstantData.ObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH) {
      for (let hookIndex = 0; hookIndex < targetObject.hooks.length; hookIndex++) {
        // Make a copy of current knob settings for restoration after modifications
        const knobSettingsCopy = $.extend(true, {}, knobSettings);
        let triggerIndex: number;
        if (bothSides) {
          // Depending on hook point type, set trigger index and remove previously added knob.
          switch (targetObject.hooks[hookIndex].hookpt) {
            case ConstantData.HookPts.SED_LL:
            case ConstantData.HookPts.SED_LT:
              triggerIndex = ConstantData.ConnectorDefines.A_Cl;
              actionGroup.RemoveElement(savedStartKnob);
              break;
            default:
              triggerIndex = ConstantData.ConnectorDefines.A_Cr;
              actionGroup.RemoveElement(savedEndKnob);
          }
          knobSettings.cursorType = primaryCursor;
          knobSettings.shapeType = ConstantData.CreateShapeType.OVAL;
          knobSettings.fillColor = 'white';
          knobSettings.fillOpacity = 0.01;
          knobSettings.strokeSize = 1;
          knobSettings.strokeColor = 'green';
        } else {
          triggerIndex = ConstantData.ConnectorDefines.A_Cl;
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
          knobSettings.knobID = ConstantData.ActionTriggerType.CONNECTOR_HOOK;
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
      return connector.objecttype !== ConstantData.ObjectTypes.SD_OBJT_CAUSEEFFECT_MAIN;
    })(this)) {
      knobSettings.shapeType = ConstantData.CreateShapeType.RECT;
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
        knobSettings.knobID = ConstantData.ActionTriggerType.CONNECTOR_PERP;
        const perpKnob = this.GenericKnob(knobSettings);
        perpKnob.SetUserData(hookIndex - connectorDefines.SEDA_NSkip);
        actionGroup.AddElement(perpKnob);
      }
    }

    // Create connector adjustment knobs for further fine-tuning if allowed.
    const stubIndex = this.Pr_GetStubIndex();
    if ((function (connector) {
      return connector.objecttype !== ConstantData.ObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH;
    })(this)) {
      for (let hookIndex = connectorDefines.SEDA_NSkip + 1;
        hookIndex < hookCount && (isLinear || bothSides || !(hookCount - connectorDefines.SEDA_NSkip <= 2)) && !(bothSides && ++hookIndex >= hookCount);
        hookIndex++) {
        const previousHook = this.arraylist.hook[hookIndex - 1];
        const currentHook = this.arraylist.hook[hookIndex];
        knobSettings.cursorType = primaryCursor;
        knobSettings.shapeType = ConstantData.CreateShapeType.OVAL;
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
        knobSettings.knobID = ConstantData.ActionTriggerType.CONNECTOR_ADJ;
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
    actionGroup.SetID(ConstantData.Defines.Action + targetId);

    console.log("S.Connector: CreateActionTriggers output:", actionGroup);
    return actionGroup;
  }

  CreateConnectHilites(svgDoc: any, targetElement: any, unusedParam1: any, unusedParam2: any, hookIndex: number, unusedParam3: any) {
    console.log("S.Connector: CreateConnectHilites input:", { svgDoc, targetElement, hookIndex });

    const styleConstants = ConstantData.SEDA_Styles;
    const groupShape = svgDoc.CreateShape(ConstantData.CreateShapeType.GROUP);
    let docScale = svgDoc.docInfo.docToScreenScale;
    if (svgDoc.docInfo.docScale <= 0.5) {
      docScale *= 2;
    }
    let customVar, genericKnob: any, polylineShape, tempShape, tempPoint, tempRect;
    const connectPtSize = ConstantData.Defines.CONNECTPT_DIM / docScale;
    const pointArray: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 }
    ];

    // Get the target points based on hook flags and hook index
    let targetPoints = this.GetTargetPoints(null, ConstantData.HookFlags.SED_LC_NoSnaps | ConstantData.HookFlags.SED_LC_HookNoExtra, hookIndex);
    if (targetPoints != null) {
      // Calculate perimeter points using the target element and target points
      const perimeterPoints = this.GetPerimPts(targetElement, targetPoints, null, true, null, hookIndex);
      const hookCount = this.arraylist.hook.length - ConstantData.ConnectorDefines.SEDA_NSkip;
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
        shapeType: ConstantData.CreateShapeType.OVAL,
        x: 0,
        y: 0,
        knobSize: connectPtSize,
        fillColor: 'black',
        fillOpacity: 1,
        strokeSize: 1,
        strokeColor: '#777777',
        KnobID: 0,
        cursorType: Element.CursorType.ANCHOR
      };

      const isLinear = Boolean(this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Linear);
      const isBothSides = Boolean(this.arraylist.styleflags & styleConstants.SEDA_BothSides) ||
        (this.arraylist.styleflags & styleConstants.SEDA_PerpConn) === 0;
      const isRadial = Boolean(this.arraylist.styleflags & styleConstants.SEDA_Radial) && !isBothSides;
      const hasBothSides = Boolean(this.arraylist.styleflags & styleConstants.SEDA_BothSides);
      const angleValue = this.arraylist.angle;
      let radialStartPoint;
      if (isRadial && hookCount > 0) {
        radialStartPoint = this.vertical
          ? { x: this.StartPoint.x - this.Frame.x, y: this.StartPoint.y - this.Frame.y + this.arraylist.hook[ConstantData.ConnectorDefines.A_Cl].startpoint.h }
          : { x: this.StartPoint.x - this.Frame.x + this.arraylist.hook[ConstantData.ConnectorDefines.A_Cl].startpoint.h, y: this.StartPoint.y - this.Frame.y };
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
              case ConstantData.ConnectorDefines.SEDAC_ABOVE:
                pointArray[0].x = this.StartPoint.x - this.Frame.x - this.arraylist.ht;
                pointArray[0].y = knobSettings.y + connectPtSize / 2;
                pointArray[1].x = knobSettings.x + connectPtSize / 2;
                pointArray[1].y = knobSettings.y + connectPtSize / 2;
                break;
              case ConstantData.ConnectorDefines.SEDAC_BELOW:
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
              case ConstantData.ConnectorDefines.SEDAC_ABOVE:
                pointArray[0].y = this.StartPoint.y - this.Frame.y - this.arraylist.ht;
                pointArray[0].x = knobSettings.x + connectPtSize / 2;
                pointArray[1].y = knobSettings.y + connectPtSize / 2;
                pointArray[1].x = knobSettings.x + connectPtSize / 2;
                break;
              case ConstantData.ConnectorDefines.SEDAC_BELOW:
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
          tempShape = GlobalData.optManager.svgDoc.CreateShape(ConstantData.CreateShapeType.POLYLINE);
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
      console.log("S.Connector: CreateConnectHilites output:", groupShape);
      return groupShape;
    }
  }

  SetCursors() {
    console.log('S.Connector: SetCursors input');

    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    Instance.Shape.BaseDrawingObject.prototype.SetCursors.call(this);

    if (GlobalData.optManager.GetEditMode() === ConstantData.EditState.DEFAULT && svgElement) {
      const hitAreasElement = svgElement.GetElementByID(ConstantData.Defines.HitAreas);
      if (hitAreasElement) {
        hitAreasElement.SetCursor(Element.CursorType.ADD_PLUS);
      }
    }

    console.log('S.Connector: SetCursors output');
  }

  GetArrowheadSelection(params) {
    console.log('S.Connector: GetArrowheadSelection input:', params);

    if (params) {
      params.StartArrowID = this.StartArrowID;
      params.StartArrowDisp = this.StartArrowDisp;
      params.EndArrowID = this.EndArrowID;
      params.EndArrowDisp = this.EndArrowDisp;
      params.ArrowSizeIndex = this.ArrowSizeIndex;
    }

    console.log('S.Connector: GetArrowheadSelection output:', params);
    return true;
  }

  RightClick(event) {
    console.log('S.Connector: RightClick input:', event);

    const docCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(event.gesture.center.clientX, event.gesture.center.clientY);
    const hitResult = new HitResult(-1, 0, null);
    const svgElement = GlobalData.optManager.svgObjectLayer.FindElementByDOMElement(event.currentTarget);

    if (!GlobalData.optManager.SelectObjectFromClick(event, svgElement)) {
      console.log('S.Connector: RightClick output: false (selection failed)');
      return false;
    }

    const elementId = svgElement.GetID();
    const targetObject = GlobalData.optManager.GetObjectPtr(elementId, false);

    if (targetObject) {
      if (targetObject.GetTextObject() >= 0) {
        const textElement = svgElement.textElem;
        if (textElement) {
          const spellIndex = textElement.GetSpellAtLocation(event.gesture.center.clientX, event.gesture.center.clientY);
          if (spellIndex >= 0) {
            GlobalData.optManager.ActivateTextEdit(svgElement, event, true);
          }
        }
      }

      const styles = ConstantData.SEDA_Styles;
      const isCoManager = targetObject.arraylist.styleflags & styles.SEDA_CoManager;
      const isPerpConn = (targetObject.arraylist.styleflags & styles.SEDA_PerpConn) > 0;
      const skipCount = ConstantData.ConnectorDefines.SEDA_NSkip;
      const hookCount = targetObject.arraylist.hook.length;

      if (isPerpConn && hookCount > skipCount + 1) {
        // Additional logic if needed
      }

      if (isCoManager) {
        // Additional logic if needed
      }
    }

    GlobalData.optManager.RightClickParams = new RightClickData();
    GlobalData.optManager.RightClickParams.TargetID = svgElement.GetID();
    GlobalData.optManager.RightClickParams.HitPt.x = docCoords.x;
    GlobalData.optManager.RightClickParams.HitPt.y = docCoords.y;
    GlobalData.optManager.RightClickParams.Locked = (this.flags & ConstantData.ObjFlags.SEDO_Lock) > 0;

    if (GlobalData.optManager.GetActiveTextEdit() !== null) {
      const activeEdit = GlobalData.optManager.svgDoc.GetActiveEdit();
      let spellIndex = -1;
      if (activeEdit) {
        spellIndex = activeEdit.GetSpellAtLocation(event.gesture.center.clientX, event.gesture.center.clientY);
      }
      if (spellIndex >= 0) {
        GlobalData.optManager.svgDoc.GetSpellCheck().ShowSpellMenu(activeEdit, spellIndex, event.gesture.center.clientX, event.gesture.center.clientY);
      } else {
        Commands.MainController.ShowContextualMenu(Resources.Controls.ContextMenus.TextMenu.Id.toLowerCase(), event.gesture.center.clientX, event.gesture.center.clientY);
      }
    } else {
      Commands.MainController.ShowContextualMenu(Resources.Controls.ContextMenus.Connector.Id.toLowerCase(), event.gesture.center.clientX, event.gesture.center.clientY);
    }

    console.log('S.Connector: RightClick output: true');
  }

  HitAreaClick(hitAreaID) {
    console.log('S.Connector: HitAreaClick input:', hitAreaID);

    GlobalData.optManager.CloseEdit();
    let connector = this;

    // if (Collab.AllowMessage()) {
    //   Collab.BeginSecondaryEdit();
    //   const messageData = {
    //     BlockID: this.BlockID,
    //     theHitAreaID: hitAreaID
    //   };
    //   connector = GlobalData.optManager.GetObjectPtr(connector.BlockID, false);
    // }

    switch (hitAreaID) {
      case ConstantData.HitAreaType.CONNECTOR_COLLAPSE:
        connector._CollapseConnector(true, false, true);
        break;
      case ConstantData.HitAreaType.CONNECTOR_EXPAND:
        connector._CollapseConnector(false, false, true);
        break;
    }

    Business.FindTreeTop(
      connector,
      ConstantData.LinkFlags.SED_L_MOVE,
      {
        topconnector: -1,
        topshape: -1,
        foundtree: false
      }
    );

    // if (Collab.AllowMessage()) {
    //   Collab.BuildMessage(ConstantData.CollabMessages.HitAreaClick, messageData, false, false);
    // }

    GlobalData.optManager.CompleteOperation(null);

    console.log('S.Connector: HitAreaClick output');
  }

  GetPolyPoints(e, t, a, r, i) {
    var n,
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
      C = [],
      y = {},
      f = ConstantData.SEDA_Styles,
      L = this.arraylist.styleflags & f.SEDA_CoManager,
      I = (this.arraylist.styleflags & f.SEDA_PerpConn) > 0,
      T = this.arraylist.styleflags & f.SEDA_StartLeft,
      b = this.IsAsstConnector(),
      M = ConstantData.ConnectorDefines.SEDA_NSkip,
      P = this.arraylist.styleflags & f.SEDA_ReverseCol,
      R = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Linear,
      A = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_FlowConn &&
        R,
      _ = 0 !== this.arraylist.angle,
      E = ConstantData.ConnectorDefines.A_Cl,
      w = ConstantData.ConnectorDefines.A_Cr,
      F = this.StartArrowID > 0,
      v = 0 == this.EndArrowID > 0 &&
        1 == F,
      G = !1,
      N = this.arraylist.curveparam,
      k = 0;
    o = this.arraylist.hook.length,
      t ? (
        y.x = this.StartPoint.x - this.Frame.x,
        y.y = this.StartPoint.y - this.Frame.y
      ) : y = this.StartPoint;
    var U = o == M + 1 &&
      0 == (this.arraylist.styleflags & f.SEDA_PerpConn),
      J = {
        index: - 1,
        left: !1
      };
    if (this.AllowCurveOnConnector(J) && (o > M + 1 || U) && N > 0 && !a) {
      k = N;
      var x = this.arraylist.ht - function (e) {
        var t,
          a = 0;
        for (n = 0; n < o; n++) if ((t = e.arraylist.hook[n]).comanagerht > a) {
          a = t.comanagerht;
          break
        }
        return a
      }(this);
      x < 0 &&
        (x = 0),
        b &&
          !this.vertical ? k > this.arraylist.wd &&
        (k = this.arraylist.wd) : k > x &&
        (k = x)
    }
    if (this.vertical) {
      for (d = P ? - 1 : 1, S = this.arraylist.ht, n = 0; n < o; n++) if (
        h = this.arraylist.hook[n],
        D = Utils2.IsEqual(h.startpoint.v + y.x, h.endpoint.v + y.x) &&
        Utils2.IsEqual(d * h.startpoint.h + y.y, d * h.endpoint.h + y.y),
        p = (n >= M || A) &&
        !L &&
        !b &&
        !D &&
        !G,
        n !== E ||
        !v ||
        D ||
        A ||
        _ ||
        (p = !0, G = !0),
        n === M &&
        p &&
        F &&
        A &&
        (p = !1),
        p &&
        n === E
      ) g = !1,
        A &&
        o > M &&
        !F &&
        (
          m = this.arraylist.hook[M],
          g = !Utils2.IsEqual(m.startpoint.h + y.x, m.endpoint.h + y.x) &&
          Utils2.IsEqual(m.startpoint.v + y.y, m.endpoint.v + y.y)
        ),
        g &&
        (p = !1),
        b &&
          k &&
          n === E ? (
          C.push(
            new PathPoint(h.endpoint.v + y.x, d * h.endpoint.h + y.y, !0, p)
          ),
          h.endpoint.v < 0 ? C.push(
            new PathPoint(h.startpoint.v + y.x - k, d * h.startpoint.h + y.y, !1, p)
          ) : C.push(
            new PathPoint(h.startpoint.v + y.x + k, d * h.startpoint.h + y.y, !1, p)
          )
        ) : k &&
          n === E &&
          U ? (
          C.push(
            new PathPoint(h.endpoint.v + y.x, d * h.endpoint.h + y.y, !0, p)
          ),
          C.push(
            new PathPoint(h.startpoint.v + y.x, d * h.startpoint.h + y.y - d * k, !1, p)
          )
        ) : (
          C.push(
            new PathPoint(h.endpoint.v + y.x, d * h.endpoint.h + y.y, !0, p)
          ),
          C.push(
            new PathPoint(h.startpoint.v + y.x, d * h.startpoint.h + y.y, !1, p)
          )
        );
      else if (n === J.index && k) {
        var O = 1;
        this.arraylist.hook[E].endpoint.v > 0 &&
          (O = - 1),
          J.left ? (
            C.push(
              new PathPoint(h.startpoint.v + y.x, h.startpoint.h + y.y + k, !0, p, - O * k, k)
            ),
            C.push(
              new PathPoint(h.endpoint.v + y.x, h.endpoint.h + y.y - 2 * k, !1, p)
            )
          ) : (
            C.push(
              new PathPoint(h.startpoint.v + y.x, h.startpoint.h + y.y + k, !0, p, - O * k, - k)
            ),
            C.push(
              new PathPoint(h.endpoint.v + y.x, h.endpoint.h + y.y, !1, p)
            )
          )
      } else if (k && n === E && U) C.push(
        new PathPoint(h.startpoint.v + y.x, d * h.startpoint.h + y.y - d * k, !0, p)
      ),
        C.push(
          new PathPoint(h.endpoint.v + y.x, d * h.endpoint.h + y.y, !1, p)
        );
      else if (k && 0 === n) {
        if (
          h.endpoint.v === h.startpoint.v &&
          h.endpoint.h === h.startpoint.h &&
          b
        ) {
          C.push(
            new PathPoint(h.startpoint.v + y.x, d * h.startpoint.h + y.y, !0, p)
          ),
            C.push(
              new PathPoint(h.endpoint.v + y.x, d * h.endpoint.h + y.y, !1, p)
            );
          continue
        }
        I ? C.push(
          new PathPoint(h.startpoint.v + y.x, d * h.startpoint.h + y.y + k, !0, p)
        ) : U ? C.push(
          new PathPoint(h.startpoint.v + y.x, d * h.startpoint.h + y.y - k, !0, p)
        ) : C.push(
          new PathPoint(h.startpoint.v + y.x, d * h.startpoint.h + y.y, !0, p)
        );
        var B = d * k;
        U &&
          (B = k),
          C.push(
            new PathPoint(h.endpoint.v + y.x, d * h.endpoint.h + y.y - B, !1, p)
          )
      } else k &&
        n === M &&
        I ? (
        B = k,
        h.endpoint.h === h.startpoint.h &&
        h.endpoint.v === h.startpoint.v &&
        (B = 0),
        h.endpoint.v < 0 ? C.push(
          new PathPoint(h.startpoint.v + y.x - B, d * h.startpoint.h + y.y, !0, p, B, B)
        ) : C.push(
          new PathPoint(h.startpoint.v + y.x + B, d * h.startpoint.h + y.y, !0, p, - B, B)
        ),
        C.push(
          new PathPoint(h.endpoint.v + y.x, d * h.endpoint.h + y.y, !1, p)
        )
      ) : k &&
        n === o - 1 &&
        0 === R ? (
        h.endpoint.v < 0 ? C.push(
          new PathPoint(h.startpoint.v + y.x - k, d * h.startpoint.h + y.y, !0, p, k, - d * k)
        ) : C.push(
          new PathPoint(h.startpoint.v + y.x + k, d * h.startpoint.h + y.y, !0, p, - k, - d * k)
        ),
        C.push(
          new PathPoint(h.endpoint.v + y.x, d * h.endpoint.h + y.y, !1, p)
        )
      ) : b &&
        k &&
        n === E ? (
        h.endpoint.v < 0 ? C.push(
          new PathPoint(h.startpoint.v + y.x - k, d * h.startpoint.h + y.y, !0, p)
        ) : C.push(
          new PathPoint(h.startpoint.v + y.x + k, d * h.startpoint.h + y.y, !0, p)
        ),
        C.push(
          new PathPoint(h.endpoint.v + y.x, d * h.endpoint.h + y.y, !1, p)
        )
      ) : (
        C.push(
          new PathPoint(h.startpoint.v + y.x, d * h.startpoint.h + y.y, !0, p)
        ),
        C.push(
          new PathPoint(h.endpoint.v + y.x, d * h.endpoint.h + y.y, !1, p)
        )
      );
      if (L) for (
        T ? (s = this.arraylist.coprofile.v, u = - 1) : (s = this.arraylist.coprofile.vdist, u = 1),
        n = 0;
        n < o;
        n++
      ) h = this.arraylist.hook[n],
        l = (c = T ? h.pr.v : h.pr.vdist) ? s - (c + 2 * S) : 0,
        k &&
          0 === n ? (
          C.push(
            new PathPoint(h.startpoint.v + y.x + u * s, h.startpoint.h + y.y + k, !0, !1)
          ),
          C.push(
            new PathPoint(- h.endpoint.v - u * l + y.x + u * s, h.endpoint.h + y.y - k, !1, !1)
          )
        ) : k &&
          n === M ? (
          h.endpoint.v < 0 ? C.push(
            new PathPoint(h.startpoint.v + y.x + u * s + k, h.startpoint.h + y.y, !0, !1, - k, k)
          ) : C.push(
            new PathPoint(h.startpoint.v + y.x + u * s - k, h.startpoint.h + y.y, !0, !1, k, k)
          ),
          C.push(
            new PathPoint(- h.endpoint.v - u * l + y.x + u * s, h.endpoint.h + y.y, !1, !1)
          )
        ) : k &&
          n === o - 1 ? (
          h.endpoint.v < 0 ? C.push(
            new PathPoint(h.startpoint.v + y.x + u * s + k, h.startpoint.h + y.y, !0, !1, - k, - k)
          ) : C.push(
            new PathPoint(h.startpoint.v + y.x + u * s - k, h.startpoint.h + y.y, !0, !1, k, - k)
          ),
          C.push(
            new PathPoint(- h.endpoint.v - u * l + y.x + u * s, h.endpoint.h + y.y, !1, !1)
          )
        ) : (
          C.push(
            new PathPoint(h.startpoint.v + y.x + u * s, h.startpoint.h + y.y, !0, !1)
          ),
          C.push(
            new PathPoint(- h.endpoint.v - u * l + y.x + u * s, h.endpoint.h + y.y, !1, !1)
          )
        )
    } else {
      for (S = this.arraylist.ht, n = 0; n < o; n++) h = this.arraylist.hook[n],
        D = Utils2.IsEqual(h.startpoint.h + y.x, h.endpoint.h + y.x) &&
        Utils2.IsEqual(h.startpoint.v + y.y, h.endpoint.v + y.y),
        p = (n >= M || A) &&
        !L &&
        !b &&
        !D &&
        !G,
        n !== E ||
        !v ||
        D ||
        A ||
        _ ||
        (p = !0, G = !0),
        n === M &&
        p &&
        F &&
        A &&
        (p = !1),
        n !== w ||
        this.objecttype != ConstantData.ObjectTypes.SD_OBJT_CAUSEEFFECT_MAIN ||
        !v ||
        D ||
        A ||
        _ ||
        (
          p = !0,
          C.push(
            new PathPoint(h.endpoint.h + y.x, h.endpoint.v + y.y, !0, p)
          ),
          C.push(
            new PathPoint(h.startpoint.h + y.x, h.startpoint.v + y.y, !1, p)
          )
        ),
        n === J.index &&
          k ? (
          d = this.arraylist.hook[E].endpoint.v < 0 ? 1 : - 1,
          J.left ? (
            C.push(
              new PathPoint(h.startpoint.h + y.x + k, h.startpoint.v + y.y, !0, p, k, - d * k)
            ),
            C.push(
              new PathPoint(h.endpoint.h + y.x - 2 * k, h.endpoint.v + y.y, !1, p)
            )
          ) : (
            C.push(
              new PathPoint(h.startpoint.h + y.x + k, h.startpoint.v + y.y, !0, p, - k, - d * k)
            ),
            C.push(
              new PathPoint(h.endpoint.h + y.x, h.endpoint.v + y.y, !1, p)
            )
          )
        ) : p &&
          n === E ? (
          g = !1,
          A &&
          o > M &&
          !F &&
          (
            m = this.arraylist.hook[M],
            g = !Utils2.IsEqual(m.startpoint.h + y.x, m.endpoint.h + y.x) &&
            Utils2.IsEqual(m.startpoint.v + y.y, m.endpoint.v + y.y)
          ),
          g &&
          (p = !1),
          b &&
            k ? (
            d = this.arraylist.hook[E].endpoint.v < 0 ? 1 : - 1,
            C.push(
              new PathPoint(h.endpoint.h + y.x, h.endpoint.v + y.y, !0, p)
            ),
            C.push(
              new PathPoint(h.startpoint.h + y.x, h.startpoint.v + y.y - d * k, !1, p)
            )
          ) : (
            C.push(
              new PathPoint(h.endpoint.h + y.x, h.endpoint.v + y.y, !0, p)
            ),
            C.push(
              new PathPoint(h.startpoint.h + y.x, h.startpoint.v + y.y, !1, p)
            )
          )
        ) : k &&
          0 === n ? (
          B = k,
          h.endpoint.v === h.startpoint.v &&
          h.endpoint.h === h.startpoint.h &&
          b &&
          (B = 0),
          C.push(
            new PathPoint(h.startpoint.h + y.x + B, h.startpoint.v + y.y, !0, p)
          ),
          C.push(
            new PathPoint(h.endpoint.h + y.x - B, h.endpoint.v + y.y, !1, p)
          )
        ) : k &&
          n === M ? (
          B = k,
          h.endpoint.h === h.startpoint.h &&
          h.endpoint.v === h.startpoint.v &&
          (B = 0),
          h.endpoint.v < 0 ? C.push(
            new PathPoint(h.startpoint.h + y.x, h.startpoint.v + y.y - B, !0, p, B, B)
          ) : C.push(
            new PathPoint(h.startpoint.h + y.x, h.startpoint.v + y.y + B, !0, p, B, - B)
          ),
          C.push(
            new PathPoint(h.endpoint.h + y.x, h.endpoint.v + y.y, !1, p)
          )
        ) : k &&
          n === o - 1 &&
          0 === R ? (
          h.endpoint.v < 0 ? C.push(
            new PathPoint(h.startpoint.h + y.x, h.startpoint.v + y.y - k, !0, p, - k, k)
          ) : C.push(
            new PathPoint(h.startpoint.h + y.x, h.startpoint.v + y.y + k, !0, p, - k, - k)
          ),
          C.push(
            new PathPoint(h.endpoint.h + y.x, h.endpoint.v + y.y, !1, p)
          )
        ) : b &&
          k &&
          n === E ? (
          d = this.arraylist.hook[E].endpoint.v < 0 ? 1 : - 1,
          C.push(
            new PathPoint(h.startpoint.h + y.x, h.startpoint.v + y.y - d * k, !0, p)
          ),
          C.push(
            new PathPoint(h.endpoint.h + y.x, h.endpoint.v + y.y, !1, p)
          )
        ) : (
          C.push(
            new PathPoint(h.startpoint.h + y.x, h.startpoint.v + y.y, !0, p)
          ),
          C.push(
            new PathPoint(h.endpoint.h + y.x, h.endpoint.v + y.y, !1, p)
          )
        );
      if (L) for (
        T ? (s = this.arraylist.coprofile.v, u = - 1) : (s = this.arraylist.coprofile.vdist, u = 1),
        n = 0;
        n < o;
        n++
      ) h = this.arraylist.hook[n],
        l = (c = T ? h.pr.v : h.pr.vdist) ? s - (c + 2 * S) : 0,
        k &&
          0 === n ? (
          C.push(
            new PathPoint(h.startpoint.h + y.x + k, h.startpoint.v + y.y + u * s, !0, !1)
          ),
          C.push(
            new PathPoint(h.endpoint.h + y.x - k, - h.endpoint.v - u * l + y.y + u * s, !1, !1)
          )
        ) : k &&
          n === M ? (
          h.endpoint.v < 0 ? C.push(
            new PathPoint(h.startpoint.h + y.x, h.startpoint.v + y.y + u * s + k, !0, !1, k, - k)
          ) : C.push(
            new PathPoint(h.startpoint.h + y.x, h.startpoint.v + y.y + u * s - k, !0, !1, k, k)
          ),
          C.push(
            new PathPoint(h.endpoint.h + y.x, - h.endpoint.v - u * l + y.y + u * s, !1, !1)
          )
        ) : k &&
          n === o - 1 ? (
          h.endpoint.v < 0 ? C.push(
            new PathPoint(h.startpoint.h + y.x, h.startpoint.v + y.y + u * s + k, !0, !1, - k, - k)
          ) : C.push(
            new PathPoint(h.startpoint.h + y.x, h.startpoint.v + y.y + u * s - k, !0, !1, - k, k)
          ),
          C.push(
            new PathPoint(h.endpoint.h + y.x, - h.endpoint.v - u * l + y.y + u * s, !1, !1)
          )
        ) : (
          C.push(
            new PathPoint(h.startpoint.h + y.x, h.startpoint.v + y.y + u * s, !0, !1)
          ),
          C.push(
            new PathPoint(h.endpoint.h + y.x, - h.endpoint.v - u * l + y.y + u * s, !1, !1)
          )
        )
    }
    return C
  }

  OffsetShape(offsetX: number, offsetY: number, additionalParam: any) {
    console.log('S.Connector: OffsetShape input:', { offsetX, offsetY, additionalParam });

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

    console.log('S.Connector: OffsetShape output:', this);
  }

  CalcFrame() {
    console.log('S.Connector: CalcFrame input');

    let polyPoints = [];
    const isLinear = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Linear;

    if (this.arraylist) {
      polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
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

    console.log('S.Connector: CalcFrame output:', this.Frame);
  }

  GetDimensions() {
    console.log('S.Connector: GetDimensions input');

    let dimensions = {};
    const isLinear = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Linear;
    const hasBothSides = (this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_BothSides) > 0;

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

    console.log('S.Connector: GetDimensions output:', dimensions);
    return dimensions;
  }

  CanSnapToShapes() {
    console.log('S.Connector: CanSnapToShapes input');

    const isFlowChartConnector = this._IsFlowChartConnector();
    const hasNoHooks = this.hooks.length === 0;
    const hasSingleHook = this.arraylist.hook.length === ConstantData.ConnectorDefines.SEDA_NSkip + 1;

    if (isFlowChartConnector && hasNoHooks && hasSingleHook) {
      const hookId = this.arraylist.hook[ConstantData.ConnectorDefines.SEDA_NSkip].id;
      console.log('S.Connector: CanSnapToShapes output:', hookId);
      return hookId;
    }

    console.log('S.Connector: CanSnapToShapes output: -1');
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
    console.log("S.Connector: ScaleObject input:", {
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
      (this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_BothSides) ||
      (this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_PerpConn) === 0;
    const connectorDefines = ConstantData.ConnectorDefines;
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
        ConstantData.FloatingPointDim.SD_FP_Width,
        false
      );
      this.rflags = Utils2.SetFlag(
        this.rflags,
        ConstantData.FloatingPointDim.SD_FP_Height,
        false
      );
    }

    console.log("S.Connector: ScaleObject output:", {
      arraylist: this.arraylist,
      rflags: this.rflags,
    });
  }

  SetSize(primarySize: number, secondarySize: number, extraInfo: any) {
    console.log("S.Connector: SetSize input:", { primarySize, secondarySize, extraInfo });

    let backboneSegments: number;
    let diff: number;
    let sizeDelta: number;
    let currentDimensions = this.GetDimensions();
    let hookCount: number;
    const styles = ConstantData.SEDA_Styles;
    const hasBothSides = (this.arraylist.styleflags & styles.SEDA_BothSides) > 0;
    const isLinear = (this.arraylist.styleflags & styles.SEDA_Linear) > 0;

    hookCount = this.arraylist.hook.length - ConstantData.ConnectorDefines.SEDA_NSkip;
    backboneSegments = this.Pr_GetNBackBoneSegments();

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

    this.Pr_Format(this.BlockID);

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);

    console.log("S.Connector: SetSize output:", { arraylist: this.arraylist, rflags: this.rflags });
  }

  UpdateFrame(newFrame: any) {
    console.log("S.Connector: UpdateFrame input:", newFrame);

    // Use provided newFrame or fall back to the existing frame
    let updatedFrame = newFrame || this.Frame;

    // Call the original base UpdateFrame method
    Instance.Shape.BaseDrawingObject.prototype.UpdateFrame.call(this, updatedFrame);

    // Process arrowhead bounds if the global list manager is available
    if (GlobalData.optManager) {
      let svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
      if (svgElement !== null) {
        let svgFrame = this.GetSVGFrame();
        let shapeElement = svgElement.GetElementByID(ConstantData.SVGElementClass.SHAPE);
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
      if (halfThickness < ConstantData.Defines.SED_MinWid) {
        halfThickness = ConstantData.Defines.SED_MinWid;
      }
      Utils2.InflateRect(this.r, halfThickness / 2, halfThickness / 2);
      let effectSettings = this.CalcEffectSettings(this.Frame, this.StyleRecord, false);
      if (effectSettings) {
        Utils2.Add2Rect(this.r, effectSettings.extent);
      }
    }

    console.log("S.Connector: UpdateFrame output:", this.r);
  }

  GetHitTestFrame(): any {
    console.log('S.Connector: GetHitTestFrame input');

    // Readable flag names from styleflags
    const isLinear = Boolean(this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Linear);
    const isStartLeft = Boolean(this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_StartLeft);
    const isFlowConnector = Boolean(this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_FlowConn);
    const isBothSides = Boolean(this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_BothSides) ||
      ((this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_PerpConn) === 0);
    const isRadial = Boolean(this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Radial) && !isBothSides;

    // Determine horizontal and vertical slop values based on flags and orientation
    let horizontalSlop: number;
    let verticalSlop: number;
    if (isLinear && isFlowConnector) {
      if (this.vertical) {
        horizontalSlop = ConstantData.Defines.SED_FlowConnectorSlop;
        verticalSlop = ConstantData.Defines.SED_ConnectorSlop;
      } else {
        horizontalSlop = ConstantData.Defines.SED_ConnectorSlop;
        verticalSlop = ConstantData.Defines.SED_FlowConnectorSlop;
      }
    } else {
      horizontalSlop = ConstantData.Defines.SED_ConnectorSlop;
      verticalSlop = horizontalSlop;
    }

    // Copy the current frame and inflate by slop values
    let hitTestFrame = Utils1.DeepCopy(this.Frame);
    Utils2.InflateRect(hitTestFrame, horizontalSlop, verticalSlop);

    // Adjust for radial connectors if needed
    if (isRadial) {
      const extraRadialSlop = isFlowConnector
        ? ConstantData.Defines.SED_FlowRadialSlop
        : ConstantData.Defines.SED_ConnectorSlop;
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

    console.log('S.Connector: GetHitTestFrame output', hitTestFrame);
    return hitTestFrame;
  }

  GetMoveRect(unusedParam: any, shouldInflate: boolean): any {
    console.log("S.Connector: GetMoveRect input:", { unusedParam, shouldInflate });
    let moveRect = {};

    if (this.arraylist.hook.length === 1) {
      Utils2.CopyRect(moveRect, this.Frame);
      moveRect.height = 0;
      moveRect.width = 0;
      console.log("S.Connector: GetMoveRect output for single hook:", moveRect);
      return moveRect;
    }

    if (shouldInflate) {
      Utils2.CopyRect(moveRect, this.Frame);
      Utils2.InflateRect(moveRect, this.StyleRecord.Line.Thickness / 2, this.StyleRecord.Line.Thickness / 2);
    } else {
      Utils2.CopyRect(moveRect, this.Frame);
    }

    console.log("S.Connector: GetMoveRect output:", moveRect);
    return moveRect;
  }

  SetShapeOrigin(originX: number, originY: number) {
    console.log("S.Connector: SetShapeOrigin input: originX =", originX, ", originY =", originY);
    let offsetX = 0;
    let offsetY = 0;

    if (originX != null) {
      offsetX = originX - this.Frame.x;
    }
    if (originY != null) {
      offsetY = originY - this.Frame.y;
    }

    this.OffsetShape(offsetX, offsetY);
    console.log("S.Connector: SetShapeOrigin output: Offset applied with offsetX =", offsetX, ", offsetY =", offsetY);
  }

  Hit(point, isBorderCheck, additionalParam, anotherParam) {
    console.log('S.Connector: Hit input:', { point, isBorderCheck, additionalParam, anotherParam });

    if (this.IsCoManager()) {
      console.log('S.Connector: Hit output:', 0);
      return 0;
    }

    if (isBorderCheck) {
      if (Utils2.pointInRect(this.r, point)) {
        console.log('S.Connector: Hit output:', ConstantData.HitCodes.SED_Border);
        return ConstantData.HitCodes.SED_Border;
      }
    } else {
      const hitTestFrame = this.GetHitTestFrame();
      if (Utils2.pointInRect(hitTestFrame, point)) {
        console.log('S.Connector: Hit output:', ConstantData.HitCodes.SED_Border);
        return ConstantData.HitCodes.SED_Border;
      }
    }

    console.log('S.Connector: Hit output:', 0);
    return 0;
  }

  PreventLink() {
    return !!this.hooks.length
  }

  HandleActionTriggerTrackCommon(e, t) {
    var a,
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
      b = 0,
      M = 0,
      P = 0,
      R = ConstantData.SEDA_Styles,
      A = 0,
      _ = 0,
      E = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_ReverseCol,
      w = (
        new SelectionAttributes(),
        ConstantData.ConnectorDefines
      ),
      F = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, !1);
    if (
      null != this.arraylist &&
      null != this.arraylist.hook &&
      !((a = this.arraylist.hook.length) < 1)
    ) {
      var v = GlobalData.optManager.theActionSVGObject,
        G = v.GetElementByID(ConstantData.SVGElementClass.SHAPE),
        N = v.GetElementByID(ConstantData.SVGElementClass.SLOP),
        k = $.extend(!0, {
        }, this.Frame);
      s = this.arraylist.styleflags & R.SEDA_BothSides ||
        0 == (this.arraylist.styleflags & R.SEDA_PerpConn),
        c = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_BothSides &&
        0 == (
          this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Stagger
        );
      var U = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Stagger &&
        this.vertical;
      S = this.arraylist.styleflags & R.SEDA_StartLeft,
        u = this.arraylist.styleflags & R.SEDA_Linear,
        d = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_FlowConn,
        this.vertical ? (
          b = t - GlobalData.optManager.theActionStartY,
          M = e - GlobalData.optManager.theActionStartX
        ) : (
          b = e - GlobalData.optManager.theActionStartX,
          M = t - GlobalData.optManager.theActionStartY
        ),
        L = this.arraylist.ht,
        I = this.arraylist.wd;
      var J = this.Pr_GetStubIndex(),
        x = this.Pr_GetEndShapeIndex(),
        O = u &&
          J === w.A_Cr;
      switch (
      i = this.Pr_GetNBackBoneSegments(),
      c &&
      (i % 2 && i++, i /= 2),
      0 !== J &&
      i++,
      0 !== x &&
      i++,
      GlobalData.optManager.theActionTriggerID
      ) {
        case ConstantData.ActionTriggerType.CONNECTOR_ADJ:
          (E || O) &&
            (b = - b),
            (f = GlobalData.optManager.OldConnectorExtra + b) < - GlobalData.optManager.OldConnectorWd &&
            (f = - GlobalData.optManager.OldConnectorWd),
            b = f - this.arraylist.hook[GlobalData.optManager.theActionTriggerData].extra,
            this.arraylist.hook[GlobalData.optManager.theActionTriggerData].extra = f,
            c &&
            GlobalData.optManager.theActionTriggerData < this.arraylist.hook.length - 1 &&
            (
              this.arraylist.hook[GlobalData.optManager.theActionTriggerData + 1].extra = f
            ),
            (E || O) &&
            (b = - b),
            M = 0;
          break;
        case ConstantData.ActionTriggerType.LINESTART:
          b = - b,
            n = I,
            (I = GlobalData.optManager.OldConnectorWd + b / i) < 0 &&
            (I = 0),
            o = (b = I - n) * i,
            this.vertical ? k.height += o : k.width += o,
            b = - b,
            M = 0;
          break;
        case ConstantData.ActionTriggerType.LINEEND:
          E &&
            (b = - b),
            n = I,
            (I = GlobalData.optManager.OldConnectorWd + b / i) < 0 &&
            (I = 0),
            b = I - n,
            this.vertical ? k.height += b * i : k.width += b * i,
            E &&
            (b = - b),
            M = 0;
          break;
        case ConstantData.ActionTriggerType.CONNECTOR_PERP:
          n = L,
            (c && GlobalData.optManager.theActionTriggerData % 2 || U && S) &&
            (M = - M),
            (S && c || S) &&
            (M = - M),
            (L = GlobalData.optManager.OldConnectorHt + M) < 0 &&
            (L = 0),
            M = L - n,
            (S && c || S) &&
            (M = - M),
            b = 0;
          break;
        case ConstantData.ActionTriggerType.CONNECTOR_HOOK:
          n = (r = this.arraylist.hook[GlobalData.optManager.theActionTriggerData]).gap,
            P = s ? b : M,
            E ? P = - P : S ? s ||
              (P = - P) : GlobalData.optManager.theActionTriggerData === ConstantData.ConnectorDefines.A_Cr &&
            (P = - P),
            r.gap = GlobalData.optManager.OldConnectorGap + P,
            p = GlobalData.optManager.OldConnectorExtra + P,
            r.gap < 0 &&
            (r.gap = 0),
            d &&
            0 === r.gap &&
            (r.gap = 0.01),
            p < 0 &&
            (p = 0),
            P = r.gap - n,
            u &&
            !s &&
            (r.extra = p),
            u &&
            (
              F.moreflags & ConstantData.SessionMoreFlags.SEDSM_Swimlane_Rows ||
              F.moreflags & ConstantData.SessionMoreFlags.SEDSM_Swimlane_Cols
            ) &&
            (r.extra = p),
            E ? P = - P : S ? s ||
              (P = - P) : GlobalData.optManager.theActionTriggerData === ConstantData.ConnectorDefines.A_Cr &&
            (P = - P),
            M = 0,
            b = 0,
            s ? (
              E ? r.startpoint.h -= P : r.startpoint.h += P,
              this.vertical ? (A = 0, _ = P) : (_ = 0, A = P)
            ) : (r.startpoint.v += P, this.vertical ? (_ = 0, A = P) : (A = 0, _ = P));
          break;
        default:
          return M = 0,
            void (b = 0)
      }
      this.arraylist.ht = L,
        this.arraylist.wd = I;
      var B,
        H,
        V = this.Pr_AdjustFormat(
          b,
          M,
          P,
          GlobalData.optManager.theActionTriggerID,
          GlobalData.optManager.theActionTriggerData,
          i,
          J,
          x
        );
      if (
        V &&
        (V.linelen, B = V.linestart, H = V.linedisp),
        0 === P &&
        (this.vertical ? (A = M, _ = b) : (A = b, _ = M)),
        v
      ) {
        var j = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, !0, !1, !1, null);
        if (
          v.SetSize(k.width, k.height),
          v.SetPos(k.x, k.y),
          G.SetSize(k.width, k.height),
          this.UpdateSVG(GlobalData.optManager.svgDoc, G, j),
          N.SetSize(k.width, k.height),
          this.UpdateSVG(GlobalData.optManager.svgDoc, N, j),
          GlobalData.optManager.ConnectorList
        ) switch (
          a = GlobalData.optManager.ConnectorList.length,
          GlobalData.optManager.theActionTriggerID
          ) {
            case ConstantData.ActionTriggerType.CONNECTOR_ADJ:
              for (this.arraylist.angle && (A = _ * this.arraylist.angle), l = 0; l < a; l++) {
                if (g = GlobalData.optManager.ConnectorList[l].locallist) for (h = g.length, m = 0; m < h; m++) D = g[m].GetPos(),
                  g[m].SetPos(D.x + A, D.y + _);
                if (c && l < a - 1 && (l++, g = GlobalData.optManager.ConnectorList[l].locallist)) for (h = g.length, m = 0; m < h; m++) D = g[m].GetPos(),
                  g[m].SetPos(D.x + A, D.y + _)
              }
              break;
            case ConstantData.ActionTriggerType.LINEEND:
            case ConstantData.ActionTriggerType.LINESTART:
              this.arraylist.angle &&
                (A = _ * this.arraylist.angle),
                C = A,
                y = _;
              var z,
                W = - 1;
              GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.LINEEND &&
                a > 0 &&
                this.arraylist.hook[w.A_Cr].id >= 0 &&
                (W = w.A_Cr),
                GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.LINESTART &&
                a > 0 &&
                this.arraylist.hook[w.A_Cl].id >= 0 &&
                (W = w.A_Cl);
              var q = c &&
                this.arraylist.hook.length % 2 == 0 &&
                GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.LINESTART;
              for (l = 0; l < a; l++) {
                if (
                  g = GlobalData.optManager.ConnectorList[l].locallist,
                  z = GlobalData.optManager.ConnectorList[l].Index,
                  g
                ) for (
                    B &&
                    null != B[z] &&
                    (
                      this.vertical ? (
                        D = g[0].GetPos(),
                        y = H[z],
                        this.arraylist.angle &&
                        (C = y * this.arraylist.angle)
                      ) : (D = g[0].GetPos(), C = H[z])
                    ),
                    h = g.length,
                    m = 0;
                    m < h;
                    m++
                  ) D = g[m].GetPos(),
                    g[m].SetPos(D.x + C, D.y + y);
                if (
                  c &&
                  l < a - 1 &&
                  !q &&
                  W !== GlobalData.optManager.ConnectorList[l + 1].Index &&
                  (l++, g = GlobalData.optManager.ConnectorList[l].locallist)
                ) for (h = g.length, m = 0; m < h; m++) D = g[m].GetPos(),
                  g[m].SetPos(D.x + C, D.y + y);
                q = !1,
                  C += A,
                  y += _
              }
              var K = {
                x: this.Frame.x,
                y: this.Frame.y,
                width: T.x,
                height: T.y
              },
                X = {
                  x: e,
                  y: t
                };
              GlobalData.optManager.UpdateDisplayCoordinates(K, X, ConstantData.CursorTypes.Grow, this);
              break;
            case ConstantData.ActionTriggerType.CONNECTOR_PERP:
              var Y = 0;
              for (this._GetTilt() && (Y = - _), l = 0; l < a; l++) D = GlobalData.optManager.ConnectorList[l].GetPos(),
                !(!c && !U) &&
                  (
                    this.vertical ? this.arraylist.angle ? l % 2 : D.x < this.StartPoint.x : D.y < this.StartPoint.y
                  ) ? GlobalData.optManager.ConnectorList[l].SetPos(D.x - A + Y, D.y - _) : GlobalData.optManager.ConnectorList[l].SetPos(D.x + A + Y, D.y + _);
              K = {
                x: this.Frame.x,
                y: this.Frame.y,
                width: T.x,
                height: T.y
              },
                X = {
                  x: e,
                  y: t
                };
              GlobalData.optManager.UpdateDisplayCoordinates(K, X, ConstantData.CursorTypes.Grow, this);
              break;
            default:
              for (l = 0; l < a; l++) D = GlobalData.optManager.ConnectorList[l].GetPos(),
                GlobalData.optManager.ConnectorList[l].SetPos(D.x + A, D.y + _)
          }
      }
    }
  }

  UpdateDimensions(e, t, a) {
    var r,
      i,
      n,
      o = !1,
      s = this.Pr_GetNBackBoneSegments(),
      l = ConstantData.SEDA_Styles;
    this.arraylist.styleflags & l.SEDA_BothSides &&
      (s % 2 && s++, s /= 2),
      s < 1 &&
      (s = 1),
      this.vertical ? (
        a &&
        (
          i = this.arraylist.wd,
          r = (a - Math.abs(this.EndPoint.y - this.StartPoint.y)) / s,
          this.arraylist.wd += r,
          this.arraylist.wd < 0 &&
          (this.arraylist.wd = 0),
          o = this.arraylist.wd !== i
        ),
        t &&
        (
          t < 0 &&
          (t = 0),
          n = this.arraylist.ht,
          this.arraylist.ht = t,
          o = this.arraylist.ht !== n
        )
      ) : (
        t &&
        (
          i = this.arraylist.wd,
          r = (t - Math.abs(this.EndPoint.x - this.StartPoint.x)) / s,
          this.arraylist.wd += r,
          this.arraylist.wd < 0 &&
          (this.arraylist.wd = 0),
          o = this.arraylist.wd !== i
        ),
        a &&
        (
          n = this.arraylist.ht,
          a < 0 &&
          (a = 0),
          this.arraylist.ht = a,
          o = this.arraylist.ht !== n
        )
      ),
      o &&
      this.Pr_Format(this.BlockID)
  }

  HandleActionTriggerDoAutoScroll() {
    Instance.Shape.BaseLine.prototype.HandleActionTriggerDoAutoScroll.call(this)
  }

  AutoScrollCommon(e, t, a) {
    return Instance.Shape.BaseLine.prototype.AutoScrollCommon.call(this, e, t, a)
  }

  LM_ActionTrack(e) {

    Instance.Shape.BaseLine.prototype.LM_ActionTrack.call(this, e)
  }

  LM_ActionRelease(e, t) {
    try {
      var a,
        r,
        i;
      if (
        t ||
        (
          GlobalData.optManager.UnbindActionClickHammerEvents(),
          this.ResetAutoScrollTimer()
        )
        // ,
        // Collab.AllowMessage()
      ) {
        var n = {};
        n.BlockID = GlobalData.optManager.theActionStoredObjectID,
          n.theActionTriggerID = GlobalData.optManager.theActionTriggerID,
          n.Frame = Utils1.DeepCopy(this.Frame),
          n.StartPoint = Utils1.DeepCopy(this.StartPoint),
          n.EndPoint = Utils1.DeepCopy(this.EndPoint),
          n.arraylist = Utils1.DeepCopy(this.arraylist)
        // ,
        // Collab.BuildMessage(ConstantData.CollabMessages.Action_Connector, n, !1)
      }
      switch (GlobalData.optManager.theActionTriggerID) {
        case ConstantData.ActionTriggerType.LINESTART:
        case ConstantData.ActionTriggerType.LINEEND:
          if (
            this.objecttype === ConstantData.ObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH
          ) this.hooks.length &&
            (a = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, !0)) &&
            a.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR &&
            a.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_MatchSize &&
            a.MatchSize(!0, this.arraylist.wd);
          else for (r = this.arraylist.hook.length, i = 0; i < r; i++) hook = this.arraylist.hook[i],
            hook.extra < - this.arraylist.wd &&
            (hook.extra = - this.arraylist.wd)
      }
      this.Pr_Format(GlobalData.optManager.theActionStoredObjectID),
        GlobalData.optManager.SetLinkFlag(
          GlobalData.optManager.theActionStoredObjectID,
          ConstantData.LinkFlags.SED_L_MOVE
        ),
        GlobalData.optManager.UpdateLinks(),
        t ||
        (
          this.LM_ActionPostRelease(GlobalData.optManager.theActionStoredObjectID),
          GlobalData.optManager.theActionStoredObjectID = - 1,
          GlobalData.optManager.theActionSVGObject = null
        ),
        GlobalData.optManager.ShowOverlayLayer(),
        GlobalData.optManager.CompleteOperation(null)
    } catch (e) {
      Instance.Shape.BaseShape.prototype.LM_ActionClick_ExceptionCleanup.call(this, e);
      GlobalData.optManager.ExceptionCleanup(e);
      throw e;
    }
  }

  LM_SetupActionClick(e, t) {
    return Instance.Shape.BaseLine.prototype.LM_SetupActionClick.call(this, e, t)
  }

  LM_ActionClick(e, t) {
    Instance.Shape.BaseLine.prototype.LM_ActionClick.call(this, e, t)
  }

  LM_ActionClick_ExceptionCleanup(e) {
    Instance.Shape.BaseLine.prototype.LM_ActionClick_ExceptionCleanup.call(this, e)
  }

  LM_ActionPreTrack(actionEvent, triggerType) {
    console.log("S.Connector: LM_ActionPreTrack input:", { actionEvent, triggerType });

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
      linksObject = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theLinksBlockID, false),
      isBothSidesNoStagger = (this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_BothSides) &&
        ((this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Stagger) === 0),
      isLinear = (this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Linear) > 0,
      connectorDefines = ConstantData.ConnectorDefines,
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
      if (GlobalData.optManager.GetObjectPtr(hookId, false)) {
        childHookList = []; // reset list
        childHookList = GlobalData.optManager.GetHookList(linksObject, childHookList, hookId, GlobalData.optManager.GetObjectPtr(hookId, false), ConstantData.ListCodes.SED_LC_MOVEHOOK, localParameters);
        hookListLength = childHookList.length;
        let localConnectorElements = [];
        for (index = 0; index < hookListLength; index++) {
          svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(childHookList[index]);
          if (svgElement) {
            localConnectorElements.push(svgElement);
            GlobalData.optManager.AddToDirtyList(childHookList[index]);
          }
        }
        let hookRecord = {
          Index: hookIndex,
          locallist: localConnectorElements
        };
        GlobalData.optManager.ConnectorList.push(hookRecord);
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
          GlobalData.optManager.ConnectorWidthList[currentIndex] = nextHook.endpoint.h - nextHook.startpoint.h - nextHook.gap;
        }
        for (currentIndex = ConstantData.ConnectorDefines.SEDA_NSkip; currentIndex < totalHooks - 1 - tempValue; currentIndex++) {
          nextHook = connectorData.hook[currentIndex + tempValue];
          followingHook = connectorData.hook[currentIndex + tempValue + 1];
          GlobalData.optManager.ConnectorWidthList[currentIndex + tempValue] = followingHook.endpoint.h - nextHook.endpoint.h - connectorData.wd - followingHook.extra;
          if (isBothSidesNoStagger) {
            currentIndex++;
          }
        }
        if (endShapeIndex === connectorDefines.A_Cl) {
          currentIndex = connectorDefines.A_Cl;
          nextHook = connectorData.hook[currentIndex];
          GlobalData.optManager.ConnectorWidthList[currentIndex] = nextHook.startpoint.h - nextHook.endpoint.h - nextHook.gap;
        }
      } else {
        let startOffset = 0;
        if (stubIndex === connectorDefines.A_Cl) {
          startOffset = 0;
          currentIndex = connectorDefines.A_Cl;
          nextHook = connectorData.hook[currentIndex];
          GlobalData.optManager.ConnectorWidthList[currentIndex] = nextHook.startpoint.h - nextHook.endpoint.h - nextHook.gap;
        }
        if (isBothSidesNoStagger) {
          startOffset = 1;
        }
        for (currentIndex = ConstantData.ConnectorDefines.SEDA_NSkip + 1 + startOffset; currentIndex < totalHooks; currentIndex++) {
          nextHook = connectorData.hook[currentIndex];
          followingHook = connectorData.hook[currentIndex - 1];
          GlobalData.optManager.ConnectorWidthList[currentIndex] = nextHook.endpoint.h - followingHook.endpoint.h - connectorData.wd - nextHook.extra;
          if (isBothSidesNoStagger) {
            currentIndex++;
          }
        }
        if (endShapeIndex === connectorDefines.A_Cr) {
          currentIndex = connectorDefines.A_Cr;
          nextHook = connectorData.hook[currentIndex];
          GlobalData.optManager.ConnectorWidthList[currentIndex] = nextHook.endpoint.h - nextHook.startpoint.h - nextHook.gap;
        }
      }
    };

    GlobalData.optManager.OldConnectorWd = this.arraylist.wd;
    GlobalData.optManager.OldConnectorHt = this.arraylist.ht;
    GlobalData.optManager.ConnectorList = [];
    GlobalData.optManager.ConnectorWidthList = [];
    if (isBothSidesNoStagger) {
      connectorMultiplier = 2;
    }
    if (triggerType === ConstantData.ActionTriggerType.CONNECTOR_HOOK) {
      currentHook = this.arraylist.hook[GlobalData.optManager.theActionTriggerData];
      GlobalData.optManager.OldConnectorGap = currentHook.gap;
      GlobalData.optManager.OldConnectorExtra = currentHook.extra;
    }

    let stubIndex = this.Pr_GetStubIndex();
    let endShapeIndex = this.Pr_GetEndShapeIndex();

    switch (triggerType) {
      case ConstantData.ActionTriggerType.CONNECTOR_ADJ:
        connectorMultiplier = GlobalData.optManager.theActionTriggerData;
        currentHook = this.arraylist.hook[GlobalData.optManager.theActionTriggerData];
        GlobalData.optManager.OldConnectorExtra = currentHook.extra;
        totalHooks = this.arraylist.hook.length;
        if (isLinear && stubIndex === connectorDefines.A_Cr) {
          for (index = ConstantData.ConnectorDefines.SEDA_NSkip; index < connectorMultiplier; index++) {
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
      case ConstantData.ActionTriggerType.LINEEND:
        totalHooks = this.arraylist.hook.length;
        updateConnectorWidths(this.arraylist, false, stubIndex, endShapeIndex);
        if (!(stubIndex === connectorDefines.A_Cl && endShapeIndex === connectorDefines.A_Cl)) {
          connectorMultiplier = 0;
        }
        for (index = ConstantData.ConnectorDefines.SEDA_NSkip + connectorMultiplier; index < totalHooks; index++) {
          currentHook = this.arraylist.hook[index];
          processHook(currentHook, index);
        }
        if (totalHooks && this.arraylist.hook[connectorDefines.A_Cr].id >= 0) {
          processHook(this.arraylist.hook[connectorDefines.A_Cr], connectorDefines.A_Cr);
        }
        break;
      case ConstantData.ActionTriggerType.LINESTART:
        totalHooks = this.arraylist.hook.length;
        if (isBothSidesNoStagger && totalHooks % 2 === 0) {
          connectorMultiplier = 1;
        }
        updateConnectorWidths(this.arraylist, true, stubIndex, endShapeIndex);
        if (!(stubIndex === connectorDefines.A_Cr && endShapeIndex === connectorDefines.A_Cr)) {
          connectorMultiplier = 0;
        }
        for (index = totalHooks - 1 - connectorMultiplier; index >= ConstantData.ConnectorDefines.SEDA_NSkip; index--) {
          currentHook = this.arraylist.hook[index];
          processHook(currentHook, index);
        }
        if (totalHooks && this.arraylist.hook[connectorDefines.A_Cl].id >= 0) {
          processHook(this.arraylist.hook[connectorDefines.A_Cl], connectorDefines.A_Cl);
        }
        break;
      case ConstantData.ActionTriggerType.CONNECTOR_PERP:
      case ConstantData.ActionTriggerType.CONNECTOR_HOOK:
        retrievedObject = GlobalData.optManager.GetObjectPtr(actionEvent, false);
        if (retrievedObject && linksObject) {
          childHookList = GlobalData.optManager.GetHookList(linksObject, childHookList, actionEvent, retrievedObject, ConstantData.ListCodes.SED_LC_CHILDRENONLY, localParameters);
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
            svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(childHookList[index]);
            if (svgElement) {
              GlobalData.optManager.ConnectorList.push(svgElement);
              GlobalData.optManager.AddToDirtyList(childHookList[index]);
            }
          }
          if (retrievedObject.hooks.length) {
            GlobalData.optManager.SetLinkFlag(retrievedObject.hooks[0].objid, ConstantData.LinkFlags.SED_L_MOVE);
          }
        }
        break;
    }
    console.log("S.Connector: LM_ActionPreTrack output:", true);
    return true;
  }

  LM_ActionDuringTrack(event) {
    console.log('S.Connector: LM_ActionDuringTrack input:', event);

    const result = event;

    console.log('S.Connector: LM_ActionDuringTrack output:', result);
    return result;
  }

  LM_ActionPostRelease(releasedConnectorId: number): void {
    console.log("S.Connector: LM_ActionPostRelease input:", { releasedConnectorId });

    GlobalData.optManager.ConnectorList = [];
    GlobalData.optManager.ConnectorWidthList = [];
    GlobalData.optManager.SetEditMode(ConstantData.EditState.DEFAULT);

    console.log("S.Connector: LM_ActionPostRelease output: completed");
  }

  GetBestHook(targetObjectId, unusedParam, hookPosition) {
    console.log("S.Connector: GetBestHook input:", { targetObjectId, unusedParam, hookPosition });

    // Calculate flags and readable variables.
    const bothSidesFlag = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_BothSides;
    const linearFlag = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Linear;
    let startLeftIndicator;
    if (bothSidesFlag) {
      startLeftIndicator = (this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_StartLeft)
        ? hookPosition.x % 2 - 1
        : hookPosition.x % 2;
    } else {
      startLeftIndicator = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_StartLeft;
    }

    let resultHook;
    let objectPtr;

    if (this.vertical) {
      if (!linearFlag) {
        // When not linear vertical connector.
        if (hookPosition.x === -1) {
          resultHook = ConstantData.HookPts.SED_AKCB;
        } else if (hookPosition.x === -2) {
          resultHook = ConstantData.HookPts.SED_AKCT;
        } else {
          resultHook = startLeftIndicator
            ? ConstantData.HookPts.SED_AKCR
            : ConstantData.HookPts.SED_AKCL;
        }
        console.log("S.Connector: GetBestHook output:", resultHook);
        return resultHook;
      }
      // For vertical and linear connectors.
      switch (hookPosition.y) {
        case ConstantData.ConnectorDefines.SEDAC_ABOVE:
          resultHook = ConstantData.HookPts.SED_AKCR;
          break;
        case ConstantData.ConnectorDefines.SEDAC_BELOW:
          resultHook = ConstantData.HookPts.SED_AKCL;
          break;
        case ConstantData.ConnectorDefines.SEDAC_PARENT:
          resultHook = (hookPosition.x === 0)
            ? ConstantData.HookPts.SED_AKCB
            : ConstantData.HookPts.SED_AKCT;
          break;
        default:
          objectPtr = GlobalData.optManager.GetObjectPtr(targetObjectId, false);
          if (objectPtr && objectPtr.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR) {
            resultHook = objectPtr.vertical ? ConstantData.HookPts.SED_LL : ConstantData.HookPts.SED_LT;
          } else {
            resultHook = ConstantData.HookPts.SED_AKCT;
          }
      }
      console.log("S.Connector: GetBestHook output:", resultHook);
      return resultHook;
    } else {
      // Non-vertical connectors.
      if (!linearFlag) {
        objectPtr = GlobalData.optManager.GetObjectPtr(targetObjectId, false);
        if (startLeftIndicator) {
          if (objectPtr && objectPtr.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR) {
            resultHook = objectPtr.vertical ? ConstantData.HookPts.SED_LB : ConstantData.HookPts.SED_LR;
          } else {
            resultHook = ConstantData.HookPts.SED_AKCB;
          }
        } else {
          if (objectPtr && objectPtr.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR) {
            resultHook = objectPtr.vertical ? ConstantData.HookPts.SED_LT : ConstantData.HookPts.SED_LL;
          } else {
            resultHook = ConstantData.HookPts.SED_AKCT;
          }
        }
        console.log("S.Connector: GetBestHook output:", resultHook);
        return resultHook;
      }
      // For non-vertical and linear connectors.
      switch (hookPosition.y) {
        case ConstantData.ConnectorDefines.SEDAC_ABOVE:
          resultHook = ConstantData.HookPts.SED_AKCB;
          break;
        case ConstantData.ConnectorDefines.SEDAC_BELOW:
          resultHook = ConstantData.HookPts.SED_AKCT;
          break;
        case ConstantData.ConnectorDefines.SEDAC_PARENT:
          resultHook = (hookPosition.x === 0)
            ? ConstantData.HookPts.SED_AKCR
            : ConstantData.HookPts.SED_AKCL;
          break;
        default:
          objectPtr = GlobalData.optManager.GetObjectPtr(targetObjectId, false);
          if (objectPtr && objectPtr.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR) {
            resultHook = objectPtr.vertical ? ConstantData.HookPts.SED_LT : ConstantData.HookPts.SED_LL;
          } else {
            resultHook = ConstantData.HookPts.SED_AKCL;
          }
      }
      console.log("S.Connector: GetBestHook output:", resultHook);
      return resultHook;
    }
  }

  GetHookFlags() {
    return ConstantData.HookFlags.SED_LC_MoveTarget
  }

  HookToPoint(hookPoint: number, outputRectangle?: { x: number; y: number; width: number; height: number }): Point {
    console.log("S.Connector: HookToPoint input:", { hookPoint, outputRectangle });

    // Initialize the result point with default values.
    let resultPoint: Point = { x: 0, y: 0 };

    // Shorter aliases for constants and style flags.
    const styleConstants = ConstantData.SEDA_Styles;
    const connectorDefines = ConstantData.ConnectorDefines;

    // Determine if "both sides" mode is active.
    const isBothSides = (this.arraylist.styleflags & styleConstants.SEDA_BothSides) ||
      ((this.arraylist.styleflags & styleConstants.SEDA_PerpConn) === 0);
    const reverseColumnFlag = this.arraylist.styleflags & styleConstants.SEDA_ReverseCol;

    // If there is no arraylist, simply return the start point.
    resultPoint.x = this.StartPoint.x;
    resultPoint.y = this.StartPoint.y;
    if (this.arraylist == null) {
      console.log("S.Connector: HookToPoint output:", resultPoint);
      return resultPoint;
    }

    // Determine multiplier based on reverse column flag.
    const multiplier = reverseColumnFlag ? -1 : 1;

    // Check if hooks are not sufficient or object is marked not visible (and not of a special branch type).
    if (
      (this.arraylist.hook.length <= connectorDefines.SEDA_NSkip ||
        (this.flags & ConstantData.ObjFlags.SEDO_NotVisible)) &&
      this.objecttype !== ConstantData.ObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH
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
      console.log("S.Connector: HookToPoint output:", resultPoint);
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
      hookPoint = ConstantData.HookPts.SED_LL;
    }

    // Choose the point based on the provided hookPoint.
    switch (hookPoint) {
      case ConstantData.HookPts.SED_LL:
      case ConstantData.HookPts.SED_LT:
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

    console.log("S.Connector: HookToPoint output:", resultPoint);
    return resultPoint;
  }

  GetTargetPoints(unusedParam: any, hookFlags: number, excludedHookId: number): Point[] {
    console.log("S.Connector: GetTargetPoints input:", { unusedParam, hookFlags, excludedHookId });

    let targetPoints: Point[] = [];
    if (this.arraylist == null) {
      console.log("S.Connector: GetTargetPoints output:", { points: targetPoints });
      return targetPoints;
    }

    const hookCount = this.arraylist.hook.length;
    const flowConnectorFlag = Boolean(this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_FlowConn);
    const isLinear = Boolean(this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Linear);
    const isStartLeft = Boolean(this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_StartLeft);
    const isBothSides = Boolean(this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_BothSides) ||
      (this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_PerpConn) === 0;
    const isRadial = Boolean(this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Radial) && !isBothSides;
    let isEndConnector = Boolean(this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_EndConn);
    const connectorDefs = ConstantData.ConnectorDefines;
    const hookPoints = ConstantData.HookPts;

    // For certain object types, force flowConnectorFlag to false.
    switch (this.objecttype) {
      case ConstantData.ObjectTypes.SD_OBJT_STEPCHARTH_BRANCH:
      case ConstantData.ObjectTypes.SD_OBJT_STEPCHARTV_BRANCH:
        // Disable flow connector for these object types.
        // (Do not use flowConnectorFlag; we simply ignore it)
        break;
    }

    // If HookNoExtra flag is set, disable end connector flag.
    if (hookFlags & ConstantData.HookFlags.SED_LC_HookNoExtra) {
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
          (hookFlags & ConstantData.HookFlags.SED_LC_ForceEnd) === 0 &&
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
            case ConstantData.HookPts.SED_LL:
            case ConstantData.HookPts.SED_LT:
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

    console.log("S.Connector: GetTargetPoints output:", { points: targetPoints });
    return targetPoints;
  }

  AllowMaintainLink() {
    return false;
  }

  ChangeHook(triggerEvent: any, isUserInitiated: boolean, additionalInfo: any): void {
    console.log("S.Connector: ChangeHook called with", { triggerEvent, isUserInitiated, additionalInfo });

    const styleConstants = ConstantData.SEDA_Styles;
    const autoFormatFlags = Business.FlowChart.AutoFormatFlags;
    const sessionObject = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
    const isLinear = (this.arraylist.styleflags & styleConstants.SEDA_Linear) > 0;
    const isFlowConnector = this.arraylist.styleflags & styleConstants.SEDA_FlowConn;
    let blockIdToUse = -1;

    if (sessionObject.flags & ConstantData.SessionFlags.SEDS_AutoFormat && isFlowConnector) {
      const hookObjectId = this.hooks[0].objid;
      const shapeObject = GlobalData.optManager.GetObjectPtr(hookObjectId, false);
      if (shapeObject && shapeObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
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

    console.log("S.Connector: ChangeHook completed");
  }

  ChangeTarget(connectorBlockId, targetHookId, unusedParam1, unusedParam2, newHookIndexInfo, shouldUpdate) {
    console.log("S.Connector: ChangeTarget called with", {
      connectorBlockId,
      targetHookId,
      unusedParam1,
      unusedParam2,
      newHookIndexInfo,
      shouldUpdate
    });

    let hookIndexFound = -1;
    let storedTextId = -1;
    const bothSides = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_BothSides;
    const isLinear = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Linear;
    const isFlowConnector = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_FlowConn;
    const sessionObject = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
    const noTreeOverlap = sessionObject.flags & ConstantData.SessionFlags.SEDS_NoTreeOverlap;
    const skipCount = ConstantData.ConnectorDefines.SEDA_NSkip;

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
          const expectedIndex = newHookIndexInfo.x + ConstantData.ConnectorDefines.SEDA_NSkip;
          if (expectedIndex !== hookIndexFound) {
            storedTextId = this.arraylist.hook[hookIndexFound].textid;
            if (hookIndexFound < expectedIndex) {
              if (bothSides) {
                newHookIndexInfo.x++;
              }
              this.Pr_AddHookedObject(targetHookId, newHookIndexInfo.x, storedTextId);
              this.Pr_RemoveHookedObject(targetHookId, hookIndexFound);
            } else {
              this.Pr_RemoveHookedObject(targetHookId, hookIndexFound);
              this.Pr_AddHookedObject(targetHookId, newHookIndexInfo.x, storedTextId);
            }
            if (sessionObject.flags & ConstantData.SessionFlags.SEDS_AutoFormat && isFlowConnector) {
              GlobalDatagFlowChartManager.AutoFormat(this, -1);
              GlobalDatagFlowChartManager.AutoFormat(this, newHookIndexInfo.x);
            }
          }
        } else {
          this.Pr_AddHookedObject(targetHookId, newHookIndexInfo.x, -1);
          if (sessionObject.flags & ConstantData.SessionFlags.SEDS_AutoFormat && isFlowConnector) {
            GlobalDatagFlowChartManager.AutoFormat(this, newHookIndexInfo.x);
          }
        }
      } else if (hookIndexFound >= 0) {
        // Remove any associated text block if exists.
        let currentHook = this.arraylist.hook[hookIndexFound];
        if (currentHook.textid >= 0) {
          GlobalData.optManager.DeleteBlock(currentHook.textid);
          currentHook.textid = -1;
        }
        this.Pr_RemoveHookedObject(targetHookId, hookIndexFound);

        // Reset the subtype if the target object is a task.
        const targetObject = GlobalData.optManager.GetObjectPtr(targetHookId, true);
        if (targetObject && targetObject.subtype === ConstantData.ObjectSubTypes.SD_SUBT_TASK) {
          targetObject.subtype = 0;
        }
        if (sessionObject.flags & ConstantData.SessionFlags.SEDS_AutoFormat && isFlowConnector) {
          GlobalDatagFlowChartManager.AutoFormat(this, -1);
        }
        if (isLinear && hookIndexFound === skipCount && this.arraylist.hook.length >= skipCount) {
          if (this.arraylist.hook.length === skipCount) {
            for (let index = 0; index < skipCount; index++) {
              let hookItem = this.arraylist.hook[index];
              if (hookItem.textid >= 0) {
                GlobalData.optManager.DeleteBlock(hookItem.textid);
                hookItem.textid = -1;
              }
            }
          } else if (this.arraylist.hook[skipCount].textid >= 0) {
            if (!this.hooks.length || (this.hooks[0].hookpt !== ConstantData.HookPts.SED_LL &&
              this.hooks[0].hookpt !== ConstantData.HookPts.SED_LT)) {
              let hookItem = this.arraylist.hook[skipCount];
              GlobalData.optManager.DeleteBlock(hookItem.textid);
              hookItem.textid = -1;
            } else {
              let hookItem = this.arraylist.hook[ConstantData.ConnectorDefines.A_Cl];
              if (hookItem.textid >= 0) {
                GlobalData.optManager.DeleteBlock(hookItem.textid);
                hookItem.textid = -1;
              }
              hookItem.textid = this.arraylist.hook[skipCount].textid;
              this.arraylist.hook[skipCount].textid = -1;
            }
          }
        }
        if (this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_CoManager) {
          this._CollapseCoManager(targetHookId);
        } else if (this.IsAsstConnector()) {
          this._CollapseAssistant();
        }
      }
      GlobalData.optManager.SetLinkFlag(connectorBlockId, ConstantData.LinkFlags.SED_L_MOVE);
      if (noTreeOverlap) {
        Business.FindTreeTop(
          this,
          ConstantData.LinkFlags.SED_L_MOVE,
          {
            topconnector: -1,
            topshape: -1,
            foundtree: false
          }
        );
      } else {
        const objectPtr = GlobalData.optManager.GetObjectPtr(connectorBlockId, true);
        if (objectPtr && objectPtr.hooks.length) {
          GlobalData.optManager.SetLinkFlag(objectPtr.hooks[0].objid, ConstantData.LinkFlags.SED_L_MOVE);
        }
      }
      this.Pr_Format(connectorBlockId);
      GlobalData.optManager.AddToDirtyList(connectorBlockId);
    } else {
      this.flags = Utils2.SetFlag(this.flags, ConstantData.ObjFlags.SEDO_Obj1, true);
    }
    console.log("S.Connector: ChangeTarget completed");
  }

  DeleteObject(): void {
    console.log("S.Connector: DeleteObject called with no input parameters");

    const styleConstants = ConstantData.SEDA_Styles;
    const sessionObject = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
    const isFlowConnector = Boolean(this.arraylist.styleflags & styleConstants.SEDA_FlowConn);
    const autoFormatFlags = Business.FlowChart.AutoFormatFlags;

    // Loop through each hook and delete associated text objects if they exist
    const hookCount = this.arraylist.hook.length;
    for (let hookIndex = 0; hookIndex < hookCount; hookIndex++) {
      const currentHook = this.arraylist.hook[hookIndex];
      // Check if textid is valid (not equal to -1)
      if (currentHook.textid !== -1) {
        const textObject = GlobalData.objectStore.GetObject(currentHook.textid);
        if (textObject) {
          console.log("S.Connector: Deleting text object with id", currentHook.textid);
          textObject.Delete();
        }
      }
    }

    // If auto-format is enabled for the session, the connector is a flow connector,
    // and there is at least one hook, then auto-format the associated shape.
    if (sessionObject.flags & ConstantData.SessionFlags.SEDS_AutoFormat && isFlowConnector && this.hooks.length) {
      const firstHookObjectId = this.hooks[0].objid;
      const firstHookObject = GlobalData.optManager.GetObjectPtr(firstHookObjectId, false);
      if (firstHookObject && firstHookObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
        const shapeFormatType = GlobalDatagFlowChartManager.SED_ArrayShapeIsThreeWay(firstHookObject, -1, this.BlockID);
        console.log("S.Connector: Auto-format shape check returned format type", shapeFormatType, "for shape id", firstHookObjectId);

        if (shapeFormatType === 0) {
          GlobalDatagFlowChartManager.AutoFormatShape(firstHookObjectId,
            autoFormatFlags.SD_AutoFF_ToRect | autoFormatFlags.SD_AutoFF_ToDefStyle | autoFormatFlags.SD_AutFF_Force);
          console.log("S.Connector: Auto-format applied using ToRect, ToDefStyle, and Force flags");
        } else if (shapeFormatType === 2) {
          GlobalDatagFlowChartManager.AutoFormatShape(firstHookObjectId,
            autoFormatFlags.SD_AutoFF_ToRect | autoFormatFlags.SD_AutoFF_ToDecStyle);
          console.log("S.Connector: Auto-format applied using ToRect and ToDecStyle flags");
        }
      }
    }

    console.log("S.Connector: DeleteObject completed with no output");
  }

  IsAsstConnector() {
    console.log("S.Connector: IsAsstConnector called");

    const styles = ConstantData.SEDA_Styles;
    const isLinear = (this.arraylist.styleflags & styles.SEDA_Linear) > 0;
    const isPerpConn = (this.arraylist.styleflags & styles.SEDA_PerpConn) > 0;

    const result = isLinear && isPerpConn;
    console.log("S.Connector: IsAsstConnector returning", result);

    return result;
  }

  AllowCurveOnConnector(curveParams) {
    console.log("S.Connector: AllowCurveOnConnector called with", curveParams);

    const styles = ConstantData.SEDA_Styles;
    const isLinear = (this.arraylist.styleflags & styles.SEDA_Linear) === 0;
    const isBothSides = (this.arraylist.styleflags & styles.SEDA_BothSides) === 0;
    const isRadial = (this.arraylist.styleflags & styles.SEDA_Radial) === 0;
    const isTiltZero = this.arraylist.tilt === 0;
    const isAngleZero = this.arraylist.angle === 0;

    const allowCurve = isLinear && isBothSides && isRadial && isTiltZero && isAngleZero;

    if (this.IsAsstConnector() && this.arraylist.hook.length > ConstantData.ConnectorDefines.SEDA_NSkip) {
      let assistantId = -1;
      let hookIndex = -1;
      let isLeft = false;

      if (this.arraylist.hook[ConstantData.ConnectorDefines.SEDA_NSkip].isasst) {
        assistantId = this.arraylist.hook[ConstantData.ConnectorDefines.SEDA_NSkip].id;
        hookIndex = ConstantData.ConnectorDefines.SEDA_NSkip + 1;
        isLeft = false;
      } else if (this.arraylist.hook[this.arraylist.hook.length - 1].isasst) {
        assistantId = this.arraylist.hook[this.arraylist.hook.length - 1].id;
        hookIndex = this.arraylist.hook.length - 1;
        isLeft = true;
      }

      if (assistantId >= 0) {
        const assistantObject = GlobalData.optManager.GetObjectPtr(assistantId, false);
        if (assistantObject && assistantObject.arraylist && assistantObject.arraylist.hook.length <= ConstantData.ConnectorDefines.SEDA_NSkip) {
          if (curveParams) {
            curveParams.index = hookIndex;
            curveParams.left = isLeft;
          }
          console.log("S.Connector: AllowCurveOnConnector returning true");
          return true;
        }
      }
    }

    console.log("S.Connector: AllowCurveOnConnector returning", allowCurve);
    return allowCurve;
  }

  IsGenoConnector() {
    console.log("S.Connector: IsGenoConnector called");

    const styles = ConstantData.SEDA_Styles;
    const isLinear = (this.arraylist.styleflags & styles.SEDA_Linear) > 0;
    const isGenoConn = (this.arraylist.styleflags & styles.SEDA_GenoConn) > 0;

    const result = isLinear && isGenoConn;
    console.log("S.Connector: IsGenoConnector returning", result);

    return result;
  }

  IsCoManager(output) {
    console.log("S.Connector: IsCoManager called with output:", output);

    const isCoManager = (this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_CoManager) > 0;
    const styles = ConstantData.SEDA_Styles;
    const startLeft = this.arraylist.styleflags & styles.SEDA_StartLeft;

    if (isCoManager && output) {
      if (this.flags & ConstantData.ObjFlags.SEDO_Obj1) {
        this.Pr_Format(this.BlockID);
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

    console.log("S.Connector: IsCoManager returning", isCoManager);
    return isCoManager;
  }

  GetChildFrame(hookIndex) {
    console.log("S.Connector: GetChildFrame called with hookIndex:", hookIndex);

    let childFrame = {
      x: 0,
      y: 0,
      width: 150,
      height: 75
    };

    const totalHooks = this.arraylist.hook.length;
    hookIndex += ConstantData.ConnectorDefines.SEDA_NSkip;

    if (hookIndex > 0 && hookIndex < totalHooks) {
      const childId = this.arraylist.hook[hookIndex].id;
      if (childId >= 0) {
        const childObject = GlobalData.optManager.GetObjectPtr(childId, false);
        if (childObject) {
          childFrame = Utils1.DeepCopy(childObject.Frame);
        }
      }
    }

    console.log("S.Connector: GetChildFrame returning", childFrame);
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
    console.log("S.Connector: GetPerimeterPoints input:", {
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
    const reverseColumnFlag = styleFlags & ConstantData.SEDA_Styles.SEDA_ReverseCol;
    const connectorDefs = ConstantData.ConnectorDefines;
    flowConnectorDisp = ConstantData.Defines.SED_FlowConnectorDisp;
    flowConnectorSlop = ConstantData.Defines.SED_FlowConnectorSlop;

    // Calculate the length of inputPoints and hooks adjusted by skip constant
    numberOfInputPoints = inputPoints.length;
    hookCount = this.arraylist.hook.length;
    remainingHooks = hookCount - connectorDefs.SEDA_NSkip;
    if (remainingHooks < 0) {
      remainingHooks = 0;
    }

    flagBothSides = (styleFlags & ConstantData.SEDA_Styles.SEDA_BothSides) &&
      (styleFlags & ConstantData.SEDA_Styles.SEDA_Stagger) === 0;
    flagLinear = styleFlags & ConstantData.SEDA_Styles.SEDA_Linear;
    flagStartLeft = styleFlags & ConstantData.SEDA_Styles.SEDA_StartLeft;
    flagBothSidesOrPerp = (styleFlags & ConstantData.SEDA_Styles.SEDA_BothSides) ||
      ((styleFlags & ConstantData.SEDA_Styles.SEDA_PerpConn) === 0);
    flagRadial = (styleFlags & ConstantData.SEDA_Styles.SEDA_Radial) && !flagBothSidesOrPerp;
    flagStagger = (styleFlags & ConstantData.SEDA_Styles.SEDA_Stagger) > 0;
    reverseMultiplier = reverseColumnFlag ? -1 : 1;

    // If there's exactly one input point, and an object flag is set, then format first.
    if (numberOfInputPoints === 1 && this.flags & ConstantData.ObjFlags.SEDO_Obj1) {
      this.Pr_Format(formatParam);
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
          console.log("S.Connector: GetPerimeterPoints output:", resultPoints);
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
      console.log("S.Connector: GetPerimeterPoints output:", resultPoints);
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
      polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false, null);
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
    console.log("S.Connector: GetPerimeterPoints output:", resultPoints);
    return resultPoints;
  }

  SetHookAlign(currentHook, targetHook) {
    console.log("S.Connector: SetHookAlign called with", { currentHook, targetHook });

    const connectorDefines = ConstantData.ConnectorDefines;

    if (this.arraylist.angle && this.arraylist.hook.length && targetHook !== currentHook) {
      let tempGap, hookObject;

      if (this.arraylist.hook[connectorDefines.A_Cl].id >= 0) {
        this.arraylist.hook[connectorDefines.A_Cr].id = this.arraylist.hook[connectorDefines.A_Cl].id;
        this.arraylist.hook[connectorDefines.A_Cl].id = -1;

        tempGap = this.arraylist.hook[connectorDefines.A_Cr].gap;
        this.arraylist.hook[connectorDefines.A_Cr].gap = this.arraylist.hook[connectorDefines.A_Cl].gap;
        this.arraylist.hook[connectorDefines.A_Cl].gap = tempGap;

        hookObject = GlobalData.optManager.GetObjectPtr(this.arraylist.hook[connectorDefines.A_Cr].id, true);
        if (hookObject && hookObject.hooks.length) {
          hookObject.hooks[0].hookpt = ConstantData.HookPts.SED_AKCT;
          hookObject.hooks[0].connect.x = -connectorDefines.A_Cr;
        }
      } else if (this.arraylist.hook[connectorDefines.A_Cr].id >= 0) {
        this.arraylist.hook[connectorDefines.A_Cl].id = this.arraylist.hook[connectorDefines.A_Cr].id;
        this.arraylist.hook[connectorDefines.A_Cr].id = -1;

        tempGap = this.arraylist.hook[connectorDefines.A_Cl].gap;
        this.arraylist.hook[connectorDefines.A_Cl].gap = this.arraylist.hook[connectorDefines.A_Cr].gap;
        this.arraylist.hook[connectorDefines.A_Cr].gap = tempGap;

        hookObject = GlobalData.optManager.GetObjectPtr(this.arraylist.hook[connectorDefines.A_Cl].id, true);
        if (hookObject && hookObject.hooks.length) {
          hookObject.hooks[0].hookpt = ConstantData.HookPts.SED_AKCB;
          hookObject.hooks[0].connect.x = -connectorDefines.A_Cl;
        }
      }

      this.arraylist.angle = -this.arraylist.angle;
      this.flags = Utils2.SetFlag(this.flags, ConstantData.ObjFlags.SEDO_Obj1, true);
    }

    console.log("S.Connector: SetHookAlign completed");
  }

  GetHookPoints() {
    console.log("S.Connector: GetHookPoints called");

    const hookPoints = [];
    const styles = ConstantData.SEDA_Styles;

    if (this.arraylist == null) {
      console.log("S.Connector: GetHookPoints returning null");
      return null;
    }

    const totalHooks = this.arraylist.hook.length;
    const bothSides = this.arraylist.styleflags & styles.SEDA_BothSides ||
      0 == (this.arraylist.styleflags & styles.SEDA_PerpConn);
    const isLinear = (this.arraylist.styleflags & styles.SEDA_Linear) > 0;

    if (totalHooks > 1 || isLinear) {
      hookPoints.push(new Point(-1, 0));
      if (this.vertical) {
        hookPoints[0].id = ConstantData.HookPts.SED_LT;
      } else {
        hookPoints[0].id = ConstantData.HookPts.SED_LL;
      }

      if (bothSides) {
        hookPoints.push(new Point(-2, 0));
        if (this.vertical) {
          hookPoints[1].id = ConstantData.HookPts.SED_LB;
        } else {
          hookPoints[1].id = ConstantData.HookPts.SED_LR;
        }
      }
    } else {
      hookPoints.push(new Point(-1, 0));
      if (this.vertical) {
        hookPoints[0].id = ConstantData.HookPts.SED_LT;
      } else {
        hookPoints[0].id = ConstantData.HookPts.SED_LL;
      }
    }

    console.log("S.Connector: GetHookPoints returning", hookPoints);
    return hookPoints;
  }

  GetTextIDs() {
    console.log("S.Connector: GetTextIDs called");

    const textIDs = [];
    const totalHooks = this.arraylist.hook.length;

    for (let hookIndex = 0; hookIndex < totalHooks; hookIndex++) {
      const hook = this.arraylist.hook[hookIndex];
      if (hook.textid >= 0) {
        textIDs.push(hook.textid);
      }
    }

    console.log("S.Connector: GetTextIDs returning", textIDs);
    return textIDs;
  }

  NoFlip() {
    console.log("S.Connector: NoFlip called");
    const result = true;
    console.log("S.Connector: NoFlip returning", result);
    return result;
  }

  NoRotate() {
    console.log("S.Connector: NoRotate called");
    const result = true;
    console.log("S.Connector: NoRotate returning", result);
    return result;
  }

  AllowTextEdit() {
    console.log("S.Connector: AllowTextEdit called");

    const isLocked = this.flags & ConstantData.ObjFlags.SEDO_Lock;
    const canEditText = this.TextFlags & ConstantData.TextFlags.SED_TF_AttachC;

    const result = !isLocked && canEditText;
    console.log("S.Connector: AllowTextEdit returning", result);

    return result;
  }

  GetArrowheadFormat() {
    console.log("S.Connector: GetArrowheadFormat called");

    const arrowheadRecord = new ArrowheadRecord();

    arrowheadRecord.StartArrowID = this.StartArrowID;
    arrowheadRecord.EndArrowID = this.EndArrowID;
    arrowheadRecord.StartArrowDisp = this.StartArrowDisp;
    arrowheadRecord.EndArrowDisp = this.EndArrowDisp;
    arrowheadRecord.ArrowSizeIndex = this.ArrowSizeIndex;

    console.log("S.Connector: GetArrowheadFormat returning", arrowheadRecord);
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
    console.log("S.Connector: ChangeTextAttributes called with", {
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
      let element = svgElement || GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
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
            element.textElem = element.GetElementByID(ConstantData.SVGElementClass.TEXT, i);
          }
          GlobalData.optManager.ChangeObjectTextAttributes(this.BlockID, fontName, fontAttributes, fontFace, fontSize, opacity, element, additionalParams);
        }
      }

      this.DataID = -1;
      this.lasttexthook = -1;
    }

    console.log("S.Connector: ChangeTextAttributes completed");
  }

  _CollapseCoManager(connectorId) {
    console.log("S.Connector: _CollapseCoManager called with connectorId:", connectorId);

    let remainingHooks = this.arraylist.hook.length - ConstantData.ConnectorDefines.SEDA_NSkip;
    let objectsToDelete = [];
    let parentObject = GlobalData.optManager.GetObjectPtr(connectorId, true);

    if (parentObject && remainingHooks >= 1) {
      let firstHookId = this.arraylist.hook[ConstantData.ConnectorDefines.SEDA_NSkip].id;
      let childArrayId = GlobalData.optManager.FindChildArray(connectorId, -1);

      if (childArrayId >= 0) {
        let childObject = GlobalData.optManager.GetObjectPtr(childArrayId, true);
        if (childObject) {
          GlobalData.optManager.UpdateHook(childArrayId, 0, firstHookId, childObject.hooks[0].hookpt, childObject.hooks[0].connect, null);
        }
      } else {
        childArrayId = GlobalData.optManager.FindChildArray(firstHookId, -1);
        if (childArrayId >= 0) {
          GlobalData.optManager.SetLinkFlag(firstHookId, ConstantData.LinkFlags.SED_L_MOVE);
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
        GlobalData.optManager.UpdateHook(this.BlockID, 0, -1, this.hooks[0].hookpt, this.hooks[0].connect, null);
        let parentObject = GlobalData.optManager.GetObjectPtr(parentObjectId, false);

        if (remainingHooks === 1) {
          let firstHookId = this.arraylist.hook[ConstantData.ConnectorDefines.SEDA_NSkip].id;
          let firstHookObject = GlobalData.optManager.GetObjectPtr(firstHookId, true);

          if (firstHookObject && parentObject) {
            firstHookObject.hooks[0].hookpt = parentObject.GetBestHook(firstHookId, firstHookObject.hooks[0].hookpt, firstHookObject.hooks[0].connect);
            GlobalData.optManager.UpdateHook(firstHookId, 0, parentObjectId, firstHookObject.hooks[0].hookpt, parentConnect, null);
          }

          let childArrayId = GlobalData.optManager.FindChildArray(firstHookId, -1);
          if (childArrayId >= 0) {
            let childObject = GlobalData.optManager.GetObjectPtr(childArrayId, true);
            if (childObject) {
              childObject._FixHook(false, true);
            }
          }
        }

        objectsToDelete.push(this.BlockID);
        GlobalData.optManager.DeleteObjects(objectsToDelete, false);
      }
    }

    console.log("S.Connector: _CollapseCoManager completed");
  }



  _CollapseAssistant() {
    console.log("S.Connector: _CollapseAssistant called");

    let remainingHooks = this.arraylist.hook.length - ConstantData.ConnectorDefines.SEDA_NSkip;
    let objectsToDelete = [];

    if (remainingHooks === 1) {
      let assistantHook = this.arraylist.hook[ConstantData.ConnectorDefines.SEDA_NSkip];
      let assistantObject = GlobalData.optManager.GetObjectPtr(assistantHook.id, true);

      if (assistantObject && assistantObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR) {
        let parentObjectId = this.hooks.length ? this.hooks[0].objid : -1;

        if (parentObjectId >= 0) {
          assistantObject._FixHook(false, false);

          let parentObject = GlobalData.optManager.GetObjectPtr(parentObjectId, true);
          if (parentObject && parentObject.IsCoManager()) {
            assistantObject.hooks[0].connect.y = -ConstantData.SEDA_Styles.SEDA_CoManager;
          }

          GlobalData.optManager.UpdateHook(
            assistantHook.id,
            0,
            parentObjectId,
            assistantObject.hooks[0].hookpt,
            assistantObject.hooks[0].connect,
            null
          );

          GlobalData.optManager.UpdateHook(
            this.BlockID,
            0,
            -1,
            this.hooks[0].hookpt,
            this.hooks[0].connect,
            null
          );

          remainingHooks = 0;
          GlobalData.optManager.SetLinkFlag(parentObjectId, ConstantData.LinkFlags.SED_L_MOVE);
        }
      }

      if (remainingHooks < 1) {
        objectsToDelete.push(this.BlockID);
        GlobalData.optManager.DeleteObjects(objectsToDelete, false);
      }
    }

    console.log("S.Connector: _CollapseAssistant completed");
  }

  _GetAngleDisp(hook) {
    console.log("S.Connector: _GetAngleDisp called with hook:", hook);

    const angleDisplacement = {
      start: 0,
      end: 0
    };

    if (this.arraylist.angle) {
      angleDisplacement.start = -hook.startpoint.h * this.arraylist.angle;
      angleDisplacement.end = -hook.endpoint.h * this.arraylist.angle;
    }

    console.log("S.Connector: _GetAngleDisp returning angleDisplacement:", angleDisplacement);
    return angleDisplacement;
  }

  _AdjustAngleConnector() {
    console.log("S.Connector: _AdjustAngleConnector called");

    const connectorDefines = ConstantData.ConnectorDefines;
    const minHooks = connectorDefines.SEDA_NSkip;
    const totalHooks = this.arraylist.hook.length;

    if (totalHooks < minHooks) return;

    let hook, angleDisp;

    // Adjust the back hook
    hook = this.arraylist.hook[connectorDefines.A_Bk];
    angleDisp = this._GetAngleDisp(hook);
    hook.startpoint.v += angleDisp.start;
    hook.endpoint.v -= angleDisp.end;

    // Adjust the left hook
    hook = this.arraylist.hook[connectorDefines.A_Cl];
    angleDisp = this._GetAngleDisp(hook);
    hook.startpoint.v += angleDisp.start;
    hook.endpoint.v -= angleDisp.end;

    // Adjust the right hook
    hook = this.arraylist.hook[connectorDefines.A_Cr];
    angleDisp = this._GetAngleDisp(hook);
    hook.startpoint.v -= angleDisp.start;
    hook.endpoint.v -= angleDisp.end;

    // Adjust remaining hooks
    for (let hookIndex = minHooks; hookIndex < totalHooks; hookIndex++) {
      hook = this.arraylist.hook[hookIndex];
      angleDisp = this._GetAngleDisp(hook);
      hook.startpoint.v -= angleDisp.end;
      hook.endpoint.v -= angleDisp.end;
    }

    console.log("S.Connector: _AdjustAngleConnector completed");
  }

  _GetTilt(height?: number): number {
    console.log("S.Connector: _GetTilt called with height:", height);

    let tiltValue = 0;
    if (this.arraylist.tilt) {
      const tiltRadians = (this.arraylist.tilt / 180) * Math.PI;
      const tanValue = Math.tan(tiltRadians);
      if (tanValue) {
        const inverseTan = 1 / tanValue;
        tiltValue = height !== undefined ? height * inverseTan : this.arraylist.ht / inverseTan;
      }
    }

    console.log("S.Connector: _GetTilt returning tiltValue:", tiltValue);
    return tiltValue;
  }

  _AdjustTiltConnector() {
    console.log("S.Connector: _AdjustTiltConnector called");

    const minHooks = ConstantData.ConnectorDefines.SEDA_NSkip;
    const tiltValue = this._GetTilt();

    if (tiltValue) {
      const totalHooks = this.arraylist.hook.length;
      if (totalHooks < minHooks) return;

      for (let hookIndex = minHooks; hookIndex < totalHooks; hookIndex++) {
        this.arraylist.hook[hookIndex].endpoint.h -= tiltValue;
      }
    }

    console.log("S.Connector: _AdjustTiltConnector completed");
  }

  _FormatLinear(
    session: any,
    unusedParam: any,
    useSteps: boolean,
    resultFrame: Rectangle,
    stepsBuffer: StepRect[],
    skipAdjustment: boolean,
    output: any
  ): StepRect[] {
    console.log("S.Connector: _FormatLinear called with input:", {
      session,
      useSteps,
      resultFrame,
      stepsBuffer,
      skipAdjustment,
      output,
    });

    // Rename local variables for readability
    const minHooks = ConstantData.ConnectorDefines.SEDA_NSkip;
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

    // Determine swimlane adjustment if applicable
    if (session.moreflags & ConstantData.SessionMoreFlags.SEDSM_Swimlane_Rows && this.vertical && !skipAdjustment) {
      isSwimlaneAdjust = true;
      swimlaneHeight = 75;
    } else if (session.moreflags & ConstantData.SessionMoreFlags.SEDSM_Swimlane_Cols && !this.vertical && !skipAdjustment) {
      isSwimlaneAdjust = true;
      swimlaneHeight = 150;
    }

    // Check for left/right adjustments based on the first hook
    if (
      numHooks >= minHooks &&
      this.hooks.length &&
      !skipAdjustment &&
      (() => {
        const isLeftConnector =
          this.hooks[0].hookpt === ConstantData.HookPts.SED_LL ||
          this.hooks[0].hookpt === ConstantData.HookPts.SED_LT;
        adjustLeft = this.arraylist.hook[1].gap > 1 && isLeftConnector;
        adjustRight = this.arraylist.hook[2].gap > 1 && !isLeftConnector;
        return isSwimlaneAdjust;
      })()
    ) {
      const firstHookObject = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);
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

      const leftAdjustment = this._GetLeftAdjustment(hook.id);
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
      rightAdjustment = this._GetRightAdjustment(hook.id);
      this._UpdateCurrentProfile(resultFrame, hook, false);

      if (useSteps) {
        // For the first hook use a deep copy, otherwise merge steps
        stepsBuffer =
          hookIndex === minHooks
            ? Utils1.DeepCopy(hook.steps)
            : this._AddStepsToProfile(stepsBuffer, hook.steps, false, false, hook.endpoint.h, 0);
        if (hook.steps.length) {
          if (hook.steps[0].v < minStepV) {
            minStepV = hook.steps[0].v;
          }
          // The vend value is checked but not modified here
          if (hook.steps[0].vend > 0) {
            hook.steps[0].vend;
          }
        }
        currentX = this._CompareSteps(stepsBuffer, hook.steps);
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

    console.log("S.Connector: _FormatLinear output:", {
      resultFrame,
      stepsBuffer,
    });
    return stepsBuffer;
  }

  _AddCoManagerChildren(useStartPointFlag: boolean, copySteps: boolean, currentSteps: StepRect[]): StepRect[] {
    console.log("S.Connector: _AddCoManagerChildren input:", { useStartPointFlag, copySteps, currentSteps });

    const skipHooks = ConstantData.ConnectorDefines.SEDA_NSkip;
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
      const elementProfile = this._GetElementProfile(coManagerHook.id, useStartPointFlag, copySteps, this, false, false);
      if (elementProfile) {
        currentSteps = elementProfile.steps;
        this.arraylist.profile = elementProfile.frame;
      }
    }

    console.log("S.Connector: _AddCoManagerChildren output:", currentSteps);
    return currentSteps;
  }

  _AddAssistantChildren(useStartPointFlag: boolean, copySteps: boolean, currentSteps: StepRect[]): StepRect[] {
    console.log("S.Connector: _AddAssistantChildren input:", { useStartPointFlag, copySteps, currentSteps });

    // Rename local variables for clarity
    let totalHooks = this.arraylist.hook.length;
    const skipHooks = ConstantData.ConnectorDefines.SEDA_NSkip;
    let assistantHookIndex = -1;
    let endpointHorizontalOffset = 0;
    let reverseColumnFlag = false;

    // Find the first assistant connector hook (child connector)
    for (let index = skipHooks; index < totalHooks; index++) {
      const hook = this.arraylist.hook[index];
      const hookedObject = GlobalData.optManager.GetObjectPtr(hook.id, false);
      if (hookedObject &&
        hookedObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR) {
        assistantHookIndex = index;
        endpointHorizontalOffset = hook.endpoint.h;
        reverseColumnFlag = Boolean(hookedObject.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_ReverseCol);
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
      const elementProfile = this._GetElementProfile(assistantHook.id, useStartPointFlag, copySteps, this, false, true);
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

    console.log("S.Connector: _AddAssistantChildren output:", currentSteps);
    return currentSteps;
  }

  _CompareSteps(existingSteps: StepRect[], newSteps: StepRect[]): number {
    console.log("S.Connector: _CompareSteps called with", {
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

    console.log("S.Connector: _CompareSteps returning output:", longestDifference);
    return longestDifference;
  }

  _AddStepsToProfile(
    existingSteps: StepRect[],
    newSteps: StepRect[],
    transform: boolean,
    invert: boolean,
    offset: number,
    newOffset: number
  ): StepRect[] {
    console.log("S.Connector: _AddStepsToProfile called with", {
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
    const maxSteps = ConstantData.Defines.SD_MAXSTEPS;

    // If newSteps is empty and offset is provided, create steps with provided offset.
    if (existingLength && newStepsLength === 0 && offset) {
      for (let i = 0; i < existingLength; i++) {
        resultSteps.push(new StepRect(existingSteps[i].h, existingSteps[i].v, offset, existingSteps[i].vend));
      }
      console.log("S.Connector: _AddStepsToProfile output", JSON.stringify(resultSteps));
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

    console.log("S.Connector: _AddStepsToProfile output", JSON.stringify(resultSteps));
    return resultSteps;
  }

  _BuildSideConnectorSteps() {
    console.log("S.Connector: _BuildSideConnectorSteps called, total hooks =", this.arraylist.hook.length);

    const multiplier = 1;
    let resultSteps: StepRect[] = [];

    const styles = ConstantData.SEDA_Styles;
    const isStartLeft = Boolean(this.arraylist.styleflags & styles.SEDA_StartLeft);
    const isBothSides = Boolean(this.arraylist.styleflags & styles.SEDA_BothSides);
    // The reverse column flag is read here but not used:
    this.arraylist.styleflags, styles.SEDA_ReverseCol;

    const totalHooks = this.arraylist.hook.length;
    const hookSkipCount = ConstantData.ConnectorDefines.SEDA_NSkip;

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

        resultSteps = this._AddStepsToProfile(
          resultSteps,
          currentHook.steps,
          true,
          sideFlag,
          multiplier * currentHook.startpoint.h,
          hookEndpointV
        );
      }
    }

    console.log("S.Connector: _BuildSideConnectorSteps completed with output:", JSON.stringify(resultSteps));
    return resultSteps;
  }

  _insertStepIntoProfile(profileSteps: StepRect[], newStep: StepRect): void {
    console.log("S.Connector: _insertStepIntoProfile called with", {
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

    console.log("S.Connector: _insertStepIntoProfile completed with output", JSON.stringify(profileSteps));
  }

  _UpdateCurrentProfile(profile: Rectangle, hook: any, flag: boolean): void {
    console.log("S.Connector: _UpdateCurrentProfile called with", {
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

    console.log("S.Connector: _UpdateCurrentProfile completed with output", JSON.stringify(profile));
  }

  _GetFullShapeProfile(
    targetObjectId: number,
    offsetX: number,
    offsetY: number,
    resultRect: Rectangle,
    updateUnion: boolean
  ): void {
    console.log("S.Connector: _GetFullShapeProfile called with", {
      targetObjectId,
      offsetX,
      offsetY,
      resultRect,
      updateUnion,
    });

    // Local variables with descriptive names
    let mainObject: any = GlobalData.optManager.GetObjectPtr(targetObjectId, false);
    const skipHookCount = ConstantData.ConnectorDefines.SEDA_NSkip;
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
      while (GlobalData.optManager.FindChildArrayByIndex(targetObjectId, childInfo) > 0) {
        let childObject: any = GlobalData.optManager.GetObjectPtr(childInfo.id, false);
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
          let hookedObj = GlobalData.optManager.GetObjectPtr(currentHook.id, false);
          if (hookedObj) {
            let hookedPoint = hookedObj.HookToPoint(hookedObj.hooks[0].hookpt, null);
            hookPoints = [];
            hookPoints.push(new Point(hookedObj.hooks[0].connect.x, hookedObj.hooks[0].connect.y));
            perimPoints = childObject.GetPerimPts(childObject.BlockID, hookPoints, hookedObj.hooks[0].hookpt, true, null, -1);
            if (perimPoints && hookedPoint) {
              let newOffsetX = offsetX + perimPoints[0].x - hookedPoint.x;
              let newOffsetY = offsetY + perimPoints[0].y - hookedPoint.y;
              // Recursive call with new offsets; do not update union with child objects recursively
              childObject._GetFullShapeProfile(currentHook.id, newOffsetX, newOffsetY, resultRect, false);
            }
          }
        }
      }
    }

    console.log("S.Connector: _GetFullShapeProfile completed with resultRect:", resultRect);
  }

  _GetRightAdjustment(hookedObjectId: number): number {
    console.log("S.Connector: _GetRightAdjustment called with hookedObjectId:", hookedObjectId);

    const hookPoints = ConstantData.HookPts;
    const hookedObject = GlobalData.optManager.GetObjectPtr(hookedObjectId, false);

    if (hookedObject == null) {
      console.log("S.Connector: _GetRightAdjustment returning output: 0 (hookedObject is null)");
      return 0;
    }

    if (hookedObject.hooks.length === 0) {
      console.log("S.Connector: _GetRightAdjustment returning output: 0 (hookedObject has no hooks)");
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

    console.log("S.Connector: _GetRightAdjustment returning output:", adjustment);
    return adjustment;
  }

  _GetLeftAdjustment(hookObjectId: number): number {
    console.log("S.Connector: _GetLeftAdjustment called with hookObjectId:", hookObjectId);

    const hookPointsConstants = ConstantData.HookPts;
    const hookedObject = GlobalData.optManager.GetObjectPtr(hookObjectId, false);

    if (hookedObject == null) {
      console.log("S.Connector: _GetLeftAdjustment returning 0 because hookedObject is null");
      return 0;
    }

    if (hookedObject.DrawingObjectBaseClass !== ConstantData.DrawingObjectBaseClass.SHAPE) {
      console.log("S.Connector: _GetLeftAdjustment returning 0 because hookedObject is not of type SHAPE");
      return 0;
    }

    if (hookedObject.hooks.length === 0) {
      console.log("S.Connector: _GetLeftAdjustment returning 0 because hookedObject has no hooks");
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

    console.log("S.Connector: _GetLeftAdjustment returning leftAdjustment:", leftAdjustment);
    return leftAdjustment;
  }

  _GetElementProfile(
    targetObjectId: number,
    useStartPointFlag: boolean,
    copySteps: boolean,
    referenceConnector: any,
    useFullShapeProfile: boolean,
    ignoreGenoFlag: boolean
  ) {
    console.log("S.Connector: _GetElementProfile called with", {
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

    const styles = ConstantData.SEDA_Styles;
    const hookSkipCount = ConstantData.ConnectorDefines.SEDA_NSkip;
    const targetObj = GlobalData.optManager.GetObjectPtr(targetObjectId, false);
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
    if (targetObj.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR) {
      if (isAssistant || isGeno) {
        resultProfile.frame.h = 0;
        resultProfile.frame.hdist = 0;
        resultProfile.frame.v = 0;
        resultProfile.frame.vdist = 0;
        if (this.arraylist.hook[hookSkipCount].id != targetObjectId) {
          resultProfile.frame.v = this.arraylist.hook[hookSkipCount].pr.v;
        }
        resultProfile.steps.push(new StepRect(-resultProfile.frame.h, -resultProfile.frame.v, resultProfile.frame.hdist, resultProfile.frame.vdist));
        console.log("S.Connector: _GetElementProfile output", resultProfile);
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
      console.log("S.Connector: _GetElementProfile output", resultProfile);
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
          this._GetFullShapeProfile(targetObjectId, 0, 0, tempProfile, true);
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
        this._GetFullShapeProfile(targetObjectId, 0, 0, tempProfile, true);
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
    childObjectId = GlobalData.optManager.FindChildArray(targetObjectId, -1);
    if (!isLinear && !isCoManager && !isAssistant && childObjectId >= 0) {
      const childObj = GlobalData.optManager.GetObjectPtr(childObjectId, false);
      if (childObj && childObj.hooks.length && childObj.arraylist.hook.length - ConstantData.ConnectorDefines.SEDA_NSkip > 0 &&
        (childObj.flags & ConstantData.ObjFlags.SEDO_NotVisible) === 0) {
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

    console.log("S.Connector: _GetElementProfile output", resultProfile);
    return resultProfile;
  }

  Pr_AdjustHooks(startIndex: number, offsetAdjustment: number) {
    console.log("S.Connector: Pr_AdjustHooks called with startIndex:", startIndex, "offsetAdjustment:", offsetAdjustment);
    const skipHooksCount = ConstantData.ConnectorDefines.SEDA_NSkip;
    const totalHooks = this.arraylist.hook.length;
    for (let index = startIndex; index < totalHooks; index++) {
      const currentHook = this.arraylist.hook[index];
      if (currentHook.id >= 0) {
        const hookedObject = GlobalData.optManager.GetObjectPtr(currentHook.id, true);
        if (hookedObject && hookedObject.hooks.length) {
          hookedObject.hooks[0].connect.x = index - skipHooksCount;
          const previousHookPoint = hookedObject.hooks[0].hookpt;
          hookedObject.hooks[0].hookpt = this.GetBestHook(currentHook.id, previousHookPoint, hookedObject.hooks[0].connect);
          hookedObject.SetHookAlign(hookedObject.hooks[0].hookpt, previousHookPoint);
        }
      }
    }
    console.log("S.Connector: Pr_AdjustHooks completed");
  }

  Pr_AddHookedObject(objectId, hookPoint, textId) {
    console.log("S.Connector: Pr_AddHookedObject called with objectId:", objectId, "hookPoint:", hookPoint, "textId:", textId);
    let currentHookCount, tempHook, insertIndex;
    let newHook = new SEDAHook();
    let useStub = false;
    const styles = ConstantData.SEDA_Styles;
    const bothSides = (this.arraylist.styleflags & styles.SEDA_BothSides) || (this.arraylist.styleflags & styles.SEDA_PerpConn) === 0;
    const isLinear = this.arraylist.styleflags & styles.SEDA_Linear;
    const isRadial = this.arraylist.styleflags & styles.SEDA_Radial;

    if (this.arraylist != null) {
      // Reset match size length
      this.arraylist.matchsizelen = 0;
      let targetObject = GlobalData.optManager.GetObjectPtr(objectId, false);

      if (hookPoint === ConstantData.ConnectorDefines.StubHookPt) {
        hookPoint = 0;
        useStub = true;
      } else {
        if (hookPoint === -1 || hookPoint === -2) {
          this.arraylist.hook[-hookPoint].id = objectId;
          console.log("S.Connector: Pr_AddHookedObject early exit for negative hookPoint:", hookPoint);
          return;
        }
        if (targetObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR &&
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
        if (currentHookCount < ConstantData.ConnectorDefines.SEDA_NSkip) {
          for (let i = currentHookCount; i < ConstantData.ConnectorDefines.SEDA_NSkip; i++) {
            let tempNewHook = new SEDAHook();
            if (bothSides) {
              if (this.arraylist.hook.length !== 1 || isLinear || isRadial) {
                tempNewHook.gap = this.arraylist.wd;
              } else {
                tempNewHook.gap = ConstantData.Defines.CITreeSpacingExtra + this.arraylist.wd;
              }
            } else {
              if (this.arraylist.hook.length !== 1 || isLinear || isRadial) {
                tempNewHook.gap = this.arraylist.ht;
              } else {
                tempNewHook.gap = ConstantData.Defines.CITreeSpacingExtra + this.arraylist.ht;
              }
            }
            this.arraylist.hook.push(tempNewHook);
          }
        }
        // Compute the index at which to insert the new hook
        insertIndex = hookPoint + ConstantData.ConnectorDefines.SEDA_NSkip;
        // Special handling for hookPoint index 0 with a valid text id for linear connectors
        if (hookPoint === 0 && textId >= 0 && isLinear &&
          (this.hooks.length === 0 ||
            (this.hooks[0].hookpt !== ConstantData.HookPts.SED_LL &&
              this.hooks[0].hookpt !== ConstantData.HookPts.SED_LT))) {
          let existingObject = GlobalData.objectStore.GetObject(textId);
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
          this.Pr_AdjustHooks(insertIndex, 0);
        } else {
          targetObject = GlobalData.optManager.GetObjectPtr(objectId, true);
          if (targetObject) {
            targetObject.SetHookAlign(targetObject.hooks[0].hookpt, targetObject.hooks[0].hookpt);
          }
        }
        this.Pr_AdjustHooks(insertIndex + 1, 1);
      }
    }
    console.log("S.Connector: Pr_AddHookedObject completed with objectId:", objectId);
  }

  Pr_RemoveHookedObject(objectId, hookIndex) {
    console.log("S.Connector: Pr_RemoveHookedObject called with objectId:", objectId, "hookIndex:", hookIndex);

    let removedExtra = 0;
    if (this.arraylist != null) {
      // Reset match size length
      this.arraylist.matchsizelen = 0;

      // Get current hook count
      let hookCount = this.arraylist.hook.length;

      // If the hookIndex is within valid range, remove the hook
      if (hookIndex >= ConstantData.ConnectorDefines.SEDA_NSkip && hookIndex < hookCount) {
        if (hookIndex < hookCount - 1 && hookIndex > ConstantData.ConnectorDefines.SEDA_NSkip) {
          removedExtra = this.arraylist.hook[hookIndex].extra;
        }
        this.arraylist.hook.splice(hookIndex, 1);
      }

      // If there are only two hooks left (after removal)
      if (this.arraylist.hook.length === ConstantData.ConnectorDefines.SEDA_NSkip + 2) {
        let nextHook = this.arraylist.hook[ConstantData.ConnectorDefines.SEDA_NSkip + 1];
        // If the connector is perpendicular
        if ((this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_PerpConn) > 0) {
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
      this.Pr_AdjustHooks(hookIndex, -1);
    }

    console.log("S.Connector: Pr_RemoveHookedObject completed for hookIndex:", hookIndex);
  }

  Pr_GetNBackBoneSegments(): number {
    console.log("S.Connector: Pr_GetNBackBoneSegments() called, input: none");

    let backboneSegmentCount = this.arraylist.hook.length - ConstantData.ConnectorDefines.SEDA_NSkip;

    if (backboneSegmentCount < 2) {
      backboneSegmentCount = 2;
    }

    const result = backboneSegmentCount - 1;
    console.log("S.Connector: Pr_GetNBackBoneSegments() returning output:", result);

    return result;
  }

  Pr_GetStubIndex() {
    console.log("S.Connector: Pr_GetStubIndex called");

    let stubIndex = 0;
    const styles = ConstantData.SEDA_Styles;
    const isDualSide = (this.arraylist.styleflags & styles.SEDA_BothSides) ||
      ((this.arraylist.styleflags & styles.SEDA_PerpConn) === 0);
    const connectorDefines = ConstantData.ConnectorDefines;
    const hookPoints = ConstantData.HookPts;

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

    console.log("S.Connector: Pr_GetStubIndex returning output:", stubIndex);
    return stubIndex;
  }

  Pr_GetEndShapeIndex() {
    console.log("S.Connector: Pr_GetEndShapeIndex called");

    let endShapeIndex = 0;
    const styles = ConstantData.SEDA_Styles;
    const connectorDefines = ConstantData.ConnectorDefines;
    const hookPoints = ConstantData.HookPts;

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

    console.log("S.Connector: Pr_GetEndShapeIndex returning output:", endShapeIndex);
    return endShapeIndex;
  }

  Pr_AdjustFormat(e, t, a, r, i, n, o, s) {
    var l,
      S,
      c,
      u,
      p,
      d,
      D = 0,
      g = ConstantData.SEDA_Styles,
      h = this.arraylist.styleflags & g.SEDA_BothSides ||
        0 == (this.arraylist.styleflags & g.SEDA_PerpConn),
      m = this.arraylist.styleflags & g.SEDA_BothSides &&
        0 == (this.arraylist.styleflags & g.SEDA_Stagger),
      C = this.arraylist.styleflags & g.SEDA_Stagger &&
        this.vertical,
      y = this.arraylist.styleflags & g.SEDA_Linear,
      f = this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_ReverseCol,
      L = this.arraylist.styleflags & g.SEDA_StartLeft,
      I = this.arraylist.styleflags & g.SEDA_Radial,
      T = ConstantData.ConnectorDefines,
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
              c = R[r] - GlobalData.optManager.ConnectorWidthList[r],
              P[r] < 0 ? c < - P[r] &&
                ((i = c) < 0 && (i = 0), p += - P[r] + i, M[r] < 0 && (M[r] = 0), d--, P[r] = 0) : M[r] < P[r] &&
              ((i = M[r]) < 0 && (i = 0), p += P[r] - i, M[r] < 0 && (M[r] = 0), d--, P[r] = 0),
              M[r] += GlobalData.optManager.ConnectorWidthList[r]
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
            M[r] += GlobalData.optManager.ConnectorWidthList[r],
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
              M[i] -= GlobalData.optManager.ConnectorWidthList[i]
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
              M[i] -= GlobalData.optManager.ConnectorWidthList[i]
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
              M[i] -= GlobalData.optManager.ConnectorWidthList[i]
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
              M[i] -= GlobalData.optManager.ConnectorWidthList[i]
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
      r === ConstantData.ActionTriggerType.CONNECTOR_ADJ
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
    } else if (r === ConstantData.ActionTriggerType.LINESTART) {
      var G = !1;
      for (
        m &&
          S % 2 == 0 ? (u = 2, G = !0) : m &&
        (u = 3),
        p = y ? 1 : 0,
        y ? w(ConstantData.ConnectorDefines.SEDA_NSkip, S - 1 - u + p + 1, !0) : v(ConstantData.ConnectorDefines.SEDA_NSkip + p, S - 1 - u + p + 1, !0),
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
        l >= ConstantData.ConnectorDefines.SEDA_NSkip + p;
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
        l > ConstantData.ConnectorDefines.SEDA_NSkip &&
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
          w(ConstantData.ConnectorDefines.SEDA_NSkip + u, S, !1)
        ) : v(ConstantData.ConnectorDefines.SEDA_NSkip + u, S, !1),
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
        l = ConstantData.ConnectorDefines.SEDA_NSkip + u;
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
      var N = this._GetTilt();
      for (l = ConstantData.ConnectorDefines.SEDA_NSkip; l < S; l++) c = this.arraylist.hook[l],
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
      l = ConstantData.ConnectorDefines.SEDA_NSkip;
      l < S;
      l++
    ) (c = this.arraylist.hook[l]).startpoint.h += a,
      c.endpoint.h += a;
    else for (
      this.arraylist.hook[0].startpoint.v += a,
      this.arraylist.hook[0].endpoint.v += a,
      l = ConstantData.ConnectorDefines.SEDA_NSkip;
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

  Pr_GetShapeConnectorInfo(hookDetails) {
    console.log("S.Connector: Pr_GetShapeConnectorInfo called with input:", hookDetails);

    let firstHook;
    let connectionAdjustment;
    let connectorIndex = 0;
    const styles = ConstantData.SEDA_Styles;
    // Determine if connector is dual sided or not perpendicular
    const isDualSide = Boolean(
      this.arraylist.styleflags & styles.SEDA_BothSides ||
      (this.arraylist.styleflags & styles.SEDA_PerpConn) === 0
    );
    const isBothSides = Boolean(this.arraylist.styleflags & styles.SEDA_BothSides);
    const connectorDefines = ConstantData.ConnectorDefines;
    const hookPoints = ConstantData.HookPts;
    const actionTypes = ConstantData.ActionTriggerType;
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
    // Special handling for cause and effect branch connectors
    if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH) {
      switch (connectorPosition) {
        case -2:
          connectionAdjustment = {
            knobID: actionTypes.LINEEND,
            cursorType: Element.CursorType.RESIZE_T,
            knobData: 0,
            hook: hookDetails.hookpt,
            polyType: 'vertical'
          };
          knobInfoList.push(connectionAdjustment);
          console.log("S.Connector: Pr_GetShapeConnectorInfo returning output:", knobInfoList);
          return knobInfoList;
        case -1:
          connectionAdjustment = {
            knobID: actionTypes.LINESTART,
            cursorType: Element.CursorType.RESIZE_T,
            knobData: 0,
            hook: hookDetails.hookpt,
            polyType: 'vertical'
          };
          knobInfoList.push(connectionAdjustment);
          console.log("S.Connector: Pr_GetShapeConnectorInfo returning output:", knobInfoList);
          return knobInfoList;
        default:
          console.log("S.Connector: Pr_GetShapeConnectorInfo returning output:", knobInfoList);
          return knobInfoList;
      }
    }

    if (this.vertical) {
      if (isLinearConnector) {
        if (connectorIndex === connectorDefines.A_Cr) {
          let hookPoint = hookDetails.hookpt;
          if (connectorPosition + connectorDefines.SEDA_NSkip < this.arraylist.hook.length - 1) {
            if (connectorPosition >= 0) {
              connectionAdjustment = {
                knobID: actionTypes.CONNECTOR_ADJ,
                cursorType: Element.CursorType.RESIZE_T,
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
              cursorType: Element.CursorType.RESIZE_T,
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
              cursorType: Element.CursorType.RESIZE_T,
              knobData: connectorPosition + connectorDefines.SEDA_NSkip,
              hook: hookDetails.hookpt,
              polyType: 'vertical'
            };
            knobInfoList.push(connectionAdjustment);
          } else if (connectorIndex === connectorDefines.A_Cl) {
            connectionAdjustment = {
              knobID: actionTypes.CONNECTOR_HOOK,
              cursorType: Element.CursorType.RESIZE_T,
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
          cursorType: Element.CursorType.RESIZE_R,
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
            cursorType: Element.CursorType.RESIZE_T,
            knobData: connectorPosition + connectorDefines.SEDA_NSkip,
            hook: hookDetails.hookpt,
            polyType: 'vertical'
          };
          knobInfoList.push(connectionAdjustment);
        } else if (connectorIndex === connectorDefines.A_Cl) {
          connectionAdjustment = {
            knobID: actionTypes.CONNECTOR_HOOK,
            cursorType: Element.CursorType.RESIZE_T,
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
                cursorType: Element.CursorType.RESIZE_R,
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
              cursorType: Element.CursorType.RESIZE_R,
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
              cursorType: Element.CursorType.RESIZE_R,
              knobData: connectorPosition + connectorDefines.SEDA_NSkip,
              hook: hookDetails.hookpt,
              polyType: 'horizontal'
            };
            knobInfoList.push(connectionAdjustment);
          } else if (connectorIndex === connectorDefines.A_Cl) {
            connectionAdjustment = {
              knobID: actionTypes.CONNECTOR_HOOK,
              cursorType: Element.CursorType.RESIZE_R,
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
          cursorType: Element.CursorType.RESIZE_T,
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
            cursorType: Element.CursorType.RESIZE_R,
            knobData: connectorPosition + connectorDefines.SEDA_NSkip,
            hook: hookDetails.hookpt,
            polyType: 'horizontal'
          };
          knobInfoList.push(connectionAdjustment);
        } else if (connectorIndex === connectorDefines.A_Cl) {
          connectionAdjustment = {
            knobID: actionTypes.CONNECTOR_HOOK,
            cursorType: Element.CursorType.RESIZE_R,
            knobData: connectorDefines.A_Cl,
            hook: firstHook.hookpt,
            polyType: 'horizontal'
          };
          knobInfoList.push(connectionAdjustment);
        }
      }
    }

    console.log("S.Connector: Pr_GetShapeConnectorInfo returning output:", knobInfoList);
    return knobInfoList;
  }

  _GetConnectorOrientation(isReversed: boolean) {
    console.log("S.Connector: _GetConnectorOrientation called with isReversed:", isReversed);

    const styles = ConstantData.SEDA_Styles;
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

    console.log("S.Connector: _GetConnectorOrientation result:", orientation);
    return orientation;
  }

  _IsFlowChartConnector(): boolean {
    console.log("S.Connector: _IsFlowChartConnector called");

    const styles = ConstantData.SEDA_Styles;
    const isFlowChartConnector = (this.arraylist.styleflags & styles.SEDA_FlowConn) > 0;

    console.log("S.Connector: _IsFlowChartConnector result:", isFlowChartConnector);
    return isFlowChartConnector;
  }

  _IsOrgChartConnector(allowedTypes: number[]): boolean {
    console.log("S.Connector: _IsOrgChartConnector called with allowedTypes:", allowedTypes);

    let isOrgChartType = (this.objecttype === 0);

    if (allowedTypes) {
      for (let i = 0; i < allowedTypes.length; i++) {
        if (this.objecttype === allowedTypes[i]) {
          isOrgChartType = true;
          break;
        }
      }
    }

    const isOrgChartConnector = !this._IsFlowChartConnector() && isOrgChartType;
    console.log("S.Connector: _IsOrgChartConnector result:", isOrgChartConnector);
    return isOrgChartConnector;
  }

  _IsCauseAndEffectChartConnector(): boolean {
    console.log("S.Connector: _IsCauseAndEffectChartConnector called");

    const objectTypes = ConstantData.ObjectTypes;
    const isCauseAndEffectChartConnector = this.objecttype === objectTypes.SD_OBJT_CAUSEEFFECT_MAIN ||
      this.objecttype === objectTypes.SD_OBJT_CAUSEEFFECT_BRANCH;

    console.log("S.Connector: _IsCauseAndEffectChartConnector result:", isCauseAndEffectChartConnector);
    return isCauseAndEffectChartConnector;
  }

  _IsOrgChartTypeConnector(): boolean {
    console.log("S.Connector: _IsOrgChartTypeConnector called");

    const objectTypes = ConstantData.ObjectTypes;
    let isOrgChartConnector = false;

    switch (this.objecttype) {
      case 0:
      case objectTypes.SD_OBJT_MINDMAP_CONNECTOR:
      case objectTypes.SD_OBJT_DESCENDANT_CONNECTOR:
      case objectTypes.SD_OBJT_DECISIONTREE_CONNECTOR:
      case objectTypes.SD_OBJT_PEDIGREE_CONNECTOR:
      case objectTypes.SD_OBJT_GENOGRAM_BRANCH:
        isOrgChartConnector = true;
        break;
      default:
        isOrgChartConnector = false;
    }

    console.log("S.Connector: _IsOrgChartTypeConnector result:", isOrgChartConnector);
    return isOrgChartConnector;
  }

  _FixHook(preserveOriginalPosition: boolean, forceCoManagerUpdate: boolean) {
    console.log(
      "S.Connector: _FixHook called with preserveOriginalPosition:",
      preserveOriginalPosition,
      "forceCoManagerUpdate:",
      forceCoManagerUpdate
    );

    const styles = ConstantData.SEDA_Styles;
    const connectorDimension = ConstantData.Defines.SED_CDim;

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
        const hookedObject = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);
        if (hookedObject && hookedObject.IsCoManager(null)) {
          if (!forceCoManagerUpdate) {
            applyCoManagerAdjustment = true;
          }
        }
      }

      // Determine if the hook current point is on the left side.
      const isLeftHook =
        this.hooks[0].hookpt === ConstantData.HookPts.SED_LL ||
        this.hooks[0].hookpt === ConstantData.HookPts.SED_LT;

      // Force an update to the linked object.
      GlobalData.optManager.SetLinkFlag(this.hooks[0].objid, ConstantData.LinkFlags.SED_L_MOVE);

      if (this.vertical) {
        if (isBothSides) {
          if (isStartLeft) {
            if (isLeftHook) {
              this.hooks[0].connect.y = isReverse ? 0 : connectorDimension;
              this.hooks[0].hookpt = ConstantData.HookPts.SED_LT;
            } else {
              this.hooks[0].connect.y = 0;
              this.hooks[0].hookpt = ConstantData.HookPts.SED_LB;
            }
            this.hooks[0].connect.x = useBothSides ? connectorDimension / 2 : (3 * connectorDimension) / 4;
          } else {
            if (isLeftHook) {
              this.hooks[0].connect.y = isReverse ? 0 : connectorDimension;
              this.hooks[0].hookpt = ConstantData.HookPts.SED_LT;
            } else {
              this.hooks[0].connect.y = 0;
              this.hooks[0].hookpt = ConstantData.HookPts.SED_LB;
            }
            this.hooks[0].connect.x = useBothSides ? connectorDimension / 2 : connectorDimension / 4;
          }
        } else {
          if (isStartLeft) {
            this.hooks[0].connect.x = 0;
            this.hooks[0].hookpt = ConstantData.HookPts.SED_LR;
            this.hooks[0].connect.y = connectorDimension / 2;
          } else {
            this.hooks[0].connect.x = connectorDimension;
            this.hooks[0].hookpt = ConstantData.HookPts.SED_LL;
            this.hooks[0].connect.y = connectorDimension / 2;
          }
        }
      } else {
        if (isBothSides) {
          if (isLeftHook) {
            this.hooks[0].connect.x = connectorDimension;
            this.hooks[0].hookpt = ConstantData.HookPts.SED_LL;
          } else {
            this.hooks[0].connect.y = 0;
            this.hooks[0].hookpt = ConstantData.HookPts.SED_LR;
          }
          this.hooks[0].connect.x = connectorDimension / 2;
        } else {
          if (isStartLeft) {
            this.hooks[0].connect.y = 0;
            this.hooks[0].hookpt = ConstantData.HookPts.SED_LB;
            this.hooks[0].connect.x = connectorDimension / 2;
          } else {
            this.hooks[0].connect.y = connectorDimension;
            this.hooks[0].hookpt = ConstantData.HookPts.SED_LT;
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
        this.hooks[0].connect.y = -ConstantData.SEDA_Styles.SEDA_CoManager;
      }
    }

    console.log(
      "S.Connector: _FixHook completed with hook position:",
      this.hooks[0].connect,
      "hook point:",
      this.hooks[0].hookpt
    );
  }

  _SetDirection(invertStyle: boolean, toggleOrientation: boolean, propagate: boolean): void {
    console.log("S.Connector: _SetDirection called with invertStyle:", invertStyle, "toggleOrientation:", toggleOrientation, "propagate:", propagate);

    const styles = ConstantData.SEDA_Styles;
    const skipCount = ConstantData.ConnectorDefines.SEDA_NSkip;
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
        directionReversed = ((this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_ReverseCol) > 0);
        // Set flags: mark PerpConn true, StartLeft false, clear ReverseCol and BothSides.
        this.arraylist.styleflags = Utils2.SetFlag(this.arraylist.styleflags, ConstantData.SEDA_Styles.SEDA_PerpConn, true);
        this.arraylist.styleflags = Utils2.SetFlag(this.arraylist.styleflags, ConstantData.SEDA_Styles.SEDA_StartLeft, false);
        this.arraylist.styleflags = Utils2.SetFlag(this.arraylist.styleflags, ConstantData.SEDA_Styles.SEDA_ReverseCol, false);
        this.arraylist.styleflags = Utils2.SetFlag(this.arraylist.styleflags, ConstantData.SEDA_Styles.SEDA_BothSides, false);
        isBothSides = false;
      } else {
        // Otherwise, toggle the vertical orientation.
        this.vertical = !this.vertical;
      }
    }

    // Always clear the ReverseCol flag.
    this.arraylist.styleflags = Utils2.SetFlag(this.arraylist.styleflags, ConstantData.SEDA_Styles.SEDA_ReverseCol, false);

    if (invertStyle) {
      if (isBothSides) {
        // If both sides are used, set ReverseCol flag based on current reverseFlag value.
        this.arraylist.styleflags = Utils2.SetFlag(this.arraylist.styleflags, ConstantData.SEDA_Styles.SEDA_ReverseCol, (reverseFlag === 0));
      } else {
        // If CoManager flag is set and propagate is true, get the first hook object.
        if (isCoManager && propagate) {
          const firstHookObj = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);
          if (firstHookObj && ((firstHookObj.arraylist.styleflags & styles.SEDA_BothSides) ||
            ((firstHookObj.arraylist.styleflags & styles.SEDA_PerpConn) === 0))) {
            // Nothing extra to be done here.
          }
        }
        // If not already reversed, toggle the StartLeft flag.
        if (!directionReversed) {
          this.arraylist.styleflags = Utils2.SetFlag(
            this.arraylist.styleflags,
            ConstantData.SEDA_Styles.SEDA_StartLeft,
            ((this.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_StartLeft) === 0)
          );
        }
      }
    } else {
      // If invertStyle is false and directionReversed is true, make sure StartLeft flag is set.
      if (directionReversed) {
        this.arraylist.styleflags = Utils2.SetFlag(this.arraylist.styleflags, ConstantData.SEDA_Styles.SEDA_StartLeft, true);
      }
    }

    // Set link flag for the current connector and mark it for reformatting.
    GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE | ConstantData.LinkFlags.SED_L_CHANGE);
    this.flags = Utils2.SetFlag(this.flags, ConstantData.ObjFlags.SEDO_Obj1, true);
    // Fix the hook based on the propagate flag.
    this._FixHook(propagate, false);

    // Iterate over all hooks starting from the skipCount.
    for (let index = skipCount; index < hookCount; index++) {
      const currentHook = this.arraylist.hook[index];
      const hookedObject = GlobalData.optManager.GetObjectPtr(currentHook.id, true);
      if (hookedObject && hookedObject.hooks.length) {
        // Update hook point for the hooked object.
        hookedObject.hooks[0].hookpt = this.GetBestHook(currentHook.id, hookedObject.hooks[0].hookpt, hookedObject.hooks[0].connect);
        GlobalData.optManager.SetLinkFlag(currentHook.id, ConstantData.LinkFlags.SED_L_MOVE);
        if (hookedObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR) {
          // Recursively set direction for connector type objects.
          hookedObject._SetDirection(invertStyle, toggleOrientation, true);
        } else {
          const childId = GlobalData.optManager.FindChildArray(currentHook.id, -1);
          if (childId >= 0) {
            const childObj = GlobalData.optManager.GetObjectPtr(childId, true);
            if (childObj) {
              childObj._SetDirection(invertStyle, toggleOrientation, false);
            }
          }
        }
      }
    }

    console.log("S.Connector: _SetDirection completed");
  }

  _SetSpacing(adjustPrimaryDimension: boolean, spacingValue: number) {
    console.log("S.Connector: _SetSpacing called with adjustPrimaryDimension:", adjustPrimaryDimension, "spacingValue:", spacingValue);

    let effectiveSpacing: number = spacingValue;
    let hookCount: number = this.arraylist.hook.length;
    let currentHook: any;
    let gapOverride: number | null;

    const styles = ConstantData.SEDA_Styles;
    // Determine if the connector uses both sides.
    const isBothSides: boolean = (this.arraylist.styleflags & styles.SEDA_BothSides) ||
      ((this.arraylist.styleflags & styles.SEDA_PerpConn) === 0);
    // Flag whether this connector is a co-manager.
    const isCoManager: number = this.arraylist.styleflags & styles.SEDA_CoManager;
    // Get the skip count constant.
    const skipCount: number = ConstantData.ConnectorDefines.SEDA_NSkip;

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
        case ConstantData.HookPts.SED_LT:
        case ConstantData.HookPts.SED_LB:
          if (adjustPrimaryDimension) {
            gapOverride = null;
            if (isBothSides) {
              currentHook = (hookCount > 2)
                ? (this.hooks[0].hookpt === ConstantData.HookPts.SED_LT
                  ? this.arraylist.hook[ConstantData.ConnectorDefines.A_Cl]
                  : this.arraylist.hook[ConstantData.ConnectorDefines.A_Cr])
                : this.arraylist.hook[ConstantData.ConnectorDefines.A_Bk];
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
                ? this.arraylist.hook[ConstantData.ConnectorDefines.A_Cl]
                : this.arraylist.hook[ConstantData.ConnectorDefines.A_Bk];
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
        case ConstantData.HookPts.SED_LL:
        case ConstantData.HookPts.SED_LR:
          if (!adjustPrimaryDimension) {
            gapOverride = null;
            if (isBothSides) {
              currentHook = (hookCount > 2)
                ? (this.hooks[0].hookpt === ConstantData.HookPts.SED_LL
                  ? this.arraylist.hook[ConstantData.ConnectorDefines.A_Cl]
                  : this.arraylist.hook[ConstantData.ConnectorDefines.A_Cr])
                : this.arraylist.hook[ConstantData.ConnectorDefines.A_Bk];
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
                ? this.arraylist.hook[ConstantData.ConnectorDefines.A_Cl]
                : this.arraylist.hook[ConstantData.ConnectorDefines.A_Bk];
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
        console.log("S.Connector: Setting width to", effectiveSpacing);
        this.arraylist.wd = effectiveSpacing;
        adjustExtraSpacing(this.arraylist, effectiveSpacing);
      } else {
        console.log("S.Connector: Setting height to", effectiveSpacing);
        this.arraylist.ht = effectiveSpacing;
      }
    } else {
      if (adjustPrimaryDimension) {
        console.log("S.Connector: Setting height to", effectiveSpacing);
        this.arraylist.ht = effectiveSpacing;
      } else {
        console.log("S.Connector: Setting width to", effectiveSpacing);
        this.arraylist.wd = effectiveSpacing;
        adjustExtraSpacing(this.arraylist, effectiveSpacing);
      }
    }

    console.log("S.Connector: _SetSpacing completed");
  }

  _CollapseConnector(collapseState, updateLinkFlags, propagateCollapse) {
    console.log("S.Connector: _CollapseConnector called with collapseState:", collapseState, "updateLinkFlags:", updateLinkFlags, "propagateCollapse:", propagateCollapse);

    var obj,
      childObj,
      childId,
      nextChildId,
      notVisibleFlag = ConstantData.ObjFlags.SEDO_NotVisible,
      collapseExtraFlag = ConstantData.ExtraFlags.SEDE_CollapseConn,
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
      GlobalData.optManager.SetLinkFlag(this.hooks[0].objid, ConstantData.LinkFlags.SED_L_MOVE);
    }

    if (((this.extraflags & collapseExtraFlag) > 0) != collapseState || !propagateCollapse) {
      if (propagateCollapse || updateLinkFlags) {
        GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
      }
      if (!propagateCollapse && collapseState) {
        this.flags = Utils2.SetFlag(this.flags, notVisibleFlag, collapseState);
      } else if (0 === currentExtra) {
        this.flags = Utils2.SetFlag(this.flags, notVisibleFlag, false);
      }
      GlobalData.optManager.AddToDirtyList(this.BlockID);
      GlobalData.optManager.DirtyListReOrder = true;
      if (this.flags & notVisibleFlag) {
        deselectedList.push(this.BlockID);
        GlobalData.optManager.DeSelect(deselectedList);
      }
      var totalHooks = this.arraylist.hook.length;
      for (var i = ConstantData.ConnectorDefines.SEDA_NSkip; i < totalHooks; i++) {
        if (this.arraylist.hook[i].id >= 0 &&
          (obj = GlobalData.optManager.GetObjectPtr(this.arraylist.hook[i].id, true))) {
          switch (obj.DrawingObjectBaseClass) {
            case ConstantData.DrawingObjectBaseClass.CONNECTOR:
              obj._CollapseConnector(collapseState, updateLinkFlags, propagateCollapse);
              break;
            default:
              if (propagateCollapse || collapseState) {
                obj.flags = Utils2.SetFlag(obj.flags, notVisibleFlag, collapseState);
              } else if (0 === currentExtra) {
                obj.flags = Utils2.SetFlag(obj.flags, notVisibleFlag, false);
              }
              GlobalData.optManager.AddToDirtyList(this.arraylist.hook[i].id);
              GlobalData.optManager.DirtyListReOrder = true;
              if (obj.flags & notVisibleFlag) {
                deselectedList.push(this.arraylist.hook[i].id);
              }
              if (obj.flags & notVisibleFlag && false !== collapseState) {
                break;
              }
              childId = GlobalData.optManager.FindChildArray(this.arraylist.hook[i].id, -1);
              if (childId >= 0) {
                GlobalData.optManager.GetObjectPtr(childId, true)._CollapseConnector(collapseState, updateLinkFlags, false);
                nextChildId = GlobalData.optManager.FindChildArray(this.arraylist.hook[i].id, childId);
                if (nextChildId >= 0) {
                  GlobalData.optManager.GetObjectPtr(nextChildId, true)._CollapseConnector(collapseState, updateLinkFlags, false);
                }
              }
          }
        }
      }
      GlobalData.optManager.DeSelect(deselectedList);
      this.Pr_Format(this.BlockID);
    }

    console.log("S.Connector: _CollapseConnector completed for BlockID:", this.BlockID, "with collapseState:", collapseState);
  }

  MatchSize(applyNewWidth: boolean, newWidth: number) {
    console.log("S.Connector: MatchSize called with applyNewWidth:", applyNewWidth, "newWidth:", newWidth);

    let hookIndex: number;
    const totalHooks = this.arraylist.hook.length;
    let currentConnector: any;
    let refWidth: number | undefined; // Current reference width
    let maxCombined: number | undefined; // Maximum combined (backbone + stub) distance
    const matchList: any[] = [];
    const skipCount = ConstantData.ConnectorDefines.SEDA_NSkip;
    const connectorDefines = ConstantData.ConnectorDefines;
    const hookPoints = ConstantData.HookPts;
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
      currentConnector = GlobalData.optManager.GetObjectPtr(this.arraylist.hook[hookIndex].id, false);
      if (currentConnector && currentConnector.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR) {
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
        currentConnector = GlobalData.optManager.GetObjectPtr(matchList[hookIndex].cobj.BlockID, true);
        currentConnector.arraylist.matchsizelen = 0;
        GlobalData.optManager.SetLinkFlag(currentConnector.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
        // Determine the new stub index for formatting
        const newStubIndex = (currentConnector.hooks[0].hookpt === hookPoints.SED_LL ||
          currentConnector.hooks[0].hookpt === hookPoints.SED_LT)
          ? connectorDefines.A_Cl : connectorDefines.A_Cr;
        currentConnector.arraylist.hook[newStubIndex].gap = refWidth;
        currentConnector.Pr_Format(currentConnector.BlockID);

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
          currentConnector = GlobalData.optManager.GetObjectPtr(matchList[hookIndex].cobj.BlockID, true);
          currentConnector.arraylist.matchsizelen = 0;
          GlobalData.optManager.SetLinkFlag(currentConnector.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
          currentConnector.Pr_Format(currentConnector.BlockID);
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
          currentConnector.Pr_Format(currentConnector.BlockID);
        }
      }
    }

    console.log("S.Connector: MatchSize completed with reference width:", refWidth, "max combined distance:", maxCombined);
  }

  FoundText(searchText: string, length: number, blockID: number): boolean {
    console.log("S.Connector: FoundText called with searchText:", searchText, "length:", length, "blockID:", blockID);

    let hookIndex = 0;
    const hooksLength = this.arraylist.hook.length;
    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

    if (svgElement != null) {
      if (blockID === this.BlockID) {
        hookIndex = this.arraylist.lasttexthook + 1;
      }

      for (let i = hookIndex; i < hooksLength; i++) {
        if (this.arraylist.hook[i].textid >= 0) {
          const textElement = svgElement.GetElementByID(ConstantData.SVGElementClass.TEXT, i);
          if (textElement && textElement.GetText(0).search(searchText) >= 0) {
            this.arraylist.lasttexthook = i;
            GlobalData.optManager.ActivateTextEdit(svgElement);
            textElement.SetSelectedRange(textElement.GetText(0).search(searchText), textElement.GetText(0).search(searchText) + length);
            console.log("S.Connector: FoundText found text at hook index:", i);
            return true;
          }
        }
      }
    }

    console.log("S.Connector: FoundText did not find the text");
    return false;
  }

  FieldDataAllowed(): boolean {
    console.log("S.Connector: Checking if field data is allowed");
    const isAllowed = false;
    console.log("S.Connector: Field data allowed:", isAllowed);
    return isAllowed;
  }

}

export default Connector
