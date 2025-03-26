

import { Type } from 'class-transformer'
import $ from 'jquery'
import 'reflect-metadata'
import BConstant from '../Basic/B.Constant'
import Element from '../Basic/B.Element'
import Effects from "../Basic/B.Element.Effects"
import CursorConstant from '../Data/Constant/CursorConstant'
import NvConstant from "../Data/Constant/NvConstant"
import OptConstant from '../Data/Constant/OptConstant'
import StyleConstant from '../Data/Constant/StyleConstant'
import T3Constant from '../Data/Constant/T3Constant'
import TextConstant from '../Data/Constant/TextConstant'
import Instance from "../Data/Instance/Instance"
import StateConstant from '../Data/State/StateConstant'
import T3Gv from '../Data/T3Gv'
import EvtUtil from "../Event/EvtUtil"
import CRect from '../Model/CRect'
import DefaultStyle from '../Model/DefaultStyle'
import ParagraphFormat from '../Model/ParagraphFormat'
import Point from '../Model/Point'
import PolyList from '../Model/PolyList'
import QuickStyle from "../Model/QuickStyle"
import Rectangle from '../Model/Rectangle'
import RightClickMd from '../Model/RightClickMd'
import TextFmtData from "../Model/TextFmtData"
import TextObject from '../Model/TextObject'
import DataUtil from '../Opt/Data/DataUtil'
import DSConstant from '../Opt/DS/DSConstant'
import OptCMUtil from '../Opt/Opt/OptCMUtil'
import SvgUtil from '../Opt/Opt/SvgUtil'
import TextUtil from '../Opt/Opt/TextUtil'
import PolygonConstant from '../Opt/Polygon/PolygonConstant'
import RulerUtil from '../Opt/UI/RulerUtil'
import UIUtil from '../Opt/UI/UIUtil'
import T3Util from '../Util/T3Util'
import Utils1 from '../Util/Utils1'
import Utils2 from "../Util/Utils2"
import Utils3 from "../Util/Utils3"
import LMEvtUtil from '../Opt/Opt/LMEvtUtil'
import HookUtil from '../Opt/Opt/HookUtil'
import LayerUtil from '../Opt/Opt/LayerUtil'
import SelectUtil from '../Opt/Opt/SelectUtil'
import BlobBytes from '../Model/BlobBytes'

/**
 * BaseDrawObject is the fundamental class for all drawable elements within the T3000 HVAC system.
 * It provides core functionality for positioning, rendering, scaling, and manipulating graphical objects.
 *
 * This class handles:
 * - Basic geometric properties (position, size, rotation)
 * - Visual styling (colors, line styles, fill effects)
 * - Object connections and hooks for creating relationships between elements
 * - Dimension display and measurement
 * - Event handling and user interactions
 * - Object lifecycle management
 *
 * Most drawing objects in the system inherit from BaseDrawObject and extend its functionality
 * for specific use cases such as shapes, lines, text, or symbols.
 *
 * @example
 * ```typescript
 * // Create a new drawing object
 * const config = {
 *   Frame: { x: 100, y: 100, width: 200, height: 150 },
 *   StyleRecord: new QuickStyle(),
 *   UniqueID: 12345
 * };
 * const drawObject = new BaseDrawObject(config);
 *
 * // Move the object
 * drawObject.SetShapeOrigin(150, 200);
 *
 * // Scale the object
 * drawObject.ScaleObject(0, 0, { x: 150, y: 200 }, 0, 1.5, 1.5, true);
 *
 * // Rotate the object
 * drawObject.RotationAngle = 45;
 *
 * // Connect to another object
 * drawObject.OnConnect(connectionPoint, targetObject, connectionData, options, context);
 * ```
 */
class BaseDrawObject {
  public Type: string;
  public Frame: Rectangle;
  public r: Point;
  public inside: Point;
  public trect: Point;
  public rtop: number;
  public rleft: number;
  public rbottom: number;
  public rright: number;
  public rwd: number;
  public rht: number;
  public rflags: number;
  public RotationAngle: number;
  public ShortRef: number;

  @Type(() => QuickStyle)
  public StyleRecord: QuickStyle;

  public Dimensions: number;
  public bOverrideDefaultStyleOnDraw: boolean;
  public UniqueID: number;
  public flags: number;
  public extraflags: number;
  public hookflags: any[];
  public targflags: any[];
  public hooks: any[];
  public maxhooks: number;
  public associd: number;
  public attachpoint: Point;

  public hookdisp: Point;
  public TextFlags: number;
  public DrawingObjectBaseClass: number;
  public objecttype: number;
  public subtype: number;
  public dataclass: number;
  public Layer: number;
  public SequenceNumber: number;
  public BusinessObjectID: number;
  public NoteID: number;
  public ExpandedViewID: number;
  public DataID: number;
  public tindent: Point;
  public TMargins: Point;
  public left_sindent: number;
  public right_sindent: number;
  public top_sindent: number;
  public bottom_sindent: number;
  public TableID: number;
  public GraphID: number;
  public ImageID: number;
  public ContentType: number;
  public ContentID: number;
  public CommentID: number;
  public TextParams: any;
  public TextGrow: number;
  public TextAlign: any;
  public colorfilter: number;
  public colorchanges: number;
  public moreflags: number;
  public sizedim: Point;
  public ConnectPoints: any[];
  public ObjGrow: number;
  public datasetType: number;
  public datasetID: number;
  public datasetTableID: number;
  public datasetElemID: number;
  public fieldDataDatasetID: number;
  public fieldDataTableID: number;
  public fieldDataElemID: number;
  public dataStyleOverride: any;
  public SymbolURL: string;
  public ImageURL: string;
  public ImageDir: any;
  public BlobBytesID: number;
  public EMFHash: any;
  public EMFBlobBytesID: number;
  public OleBlobBytesID: number;
  public NativeID: number;
  public SymbolData: any;
  public nativeDataArrayBuffer: any;
  public EMFBuffer: any;
  public EMFBufferType: any;
  public SymbolID: any;
  public SVGFragment: any;
  public ShapesInGroup: any[];
  public InitialGroupBounds: any;
  public ImageHeader: any;
  public OleHeader: any;
  public nIcons: number;
  public iconSize: number;
  public iconShapeBottomOffset: any;
  public iconShapeRightOffset: any;
  public HyperlinkText: string;
  public AttachmentInfo: string;
  public ResizeAspectConstrain: boolean;
  public ob: any;

  @Type(() => Point)
  public prevBBox: Point;

  public bInGroup: boolean;
  public LineTextX: number;
  public LineTextY: number;
  public actionArrowHideTimerID: number;
  public FramezList: any;
  public ParentFrameID: number;

  @Type(() => Point)
  public StartPoint: Point;

  @Type(() => Point)
  public EndPoint: Point;

  public LineType: number;

  public BlockID: number;

  @Type(() => PolyList)
  public polylist: PolyList;

  public dimensionDeflectionH: number;
  public dimensionDeflectionV: number;

  constructor(config: any) {
    config = config || {};
    this.Type = StateConstant.StoredObjectType.BaseDrawObject;
    this.Frame = config.Frame || { x: 0, y: 0, width: 0, height: 0 };
    this.r = config.r || { x: 0, y: 0, width: 0, height: 0 };
    this.inside = config.inside || { x: 0, y: 0, width: 0, height: 0 };
    this.trect = config.trect || { x: 0, y: 0, width: 0, height: 0 };
    this.rtop = config.rtop || 0;
    this.rleft = config.rleft || 0;
    this.rbottom = config.rbottom || 0;
    this.rright = config.rright || 0;
    this.rwd = config.rwd || 0;
    this.rht = config.rht || 0;
    this.rflags = config.rflags || 0;
    this.RotationAngle = config.RotationAngle || 0;
    this.ShortRef = config.ShortRef || 0;
    this.StyleRecord = config.StyleRecord || null;
    this.Dimensions = config.Dimensions || 0;
    this.bOverrideDefaultStyleOnDraw = config.bOverrideDefaultStyleOnDraw || false;
    this.UniqueID = config.UniqueID == null ? -1 : config.UniqueID;
    this.flags = config.flags || 0;
    this.extraflags = config.extraflags || 0;
    this.hookflags = config.hookflags || [];
    this.targflags = config.targflags || [];
    this.hooks = config.hooks || [];
    this.maxhooks = config.maxhooks || 1;
    this.associd = config.associd || -1;
    this.attachpoint = config.attachpoint || { x: OptConstant.Common.DimMax / 2, y: OptConstant.Common.DimMax / 2 };
    this.hookdisp = { x: 0, y: 0 };
    this.TextFlags = config.TextFlags || 0;
    this.DrawingObjectBaseClass = config.DrawingObjectBaseClass || OptConstant.DrawObjectBaseClass.Shape;
    this.objecttype = config.objecttype || 0;
    this.subtype = config.subtype || 0;
    this.dataclass = config.dataclass || 0;
    this.Layer = config.Layer || 0;
    this.SequenceNumber = config.SequenceNumber || -1;
    this.BusinessObjectID = config.BusinessObjectId || -1;
    this.NoteID = config.NoteID || -1;
    this.ExpandedViewID = config.ExpandedViewID || -1;
    this.DataID = config.DataID || -1;
    this.tindent = config.tindent || { top: 0, left: 0, bottom: 0, right: 0 };
    this.TMargins = config.TMargins || { top: 0, left: 0, bottom: 0, right: 0 };
    this.left_sindent = config.left_sindent || 0;
    this.right_sindent = config.right_sindent || 0;
    this.top_sindent = config.top_sindent || 0;
    this.bottom_sindent = config.bottom_sindent || 0;
    this.TableID = config.TableID || -1;
    this.GraphID = config.GraphID || -1;
    this.ImageID = config.ImageID || -1;
    this.ContentType = config.ContentType || OptConstant.ContentType.None;
    this.ContentID = config.ContentID || -1;
    this.CommentID = config.CommentID || -1;
    this.TextParams = config.TextParams || null;
    this.TextGrow = config.TextGrow || NvConstant.TextGrowBehavior.ProPortional;
    this.TextAlign = config.TextAlign || TextConstant.TextAlign.Center;
    this.colorfilter = config.colorfilter || 0;
    this.colorchanges = config.colorchanges || 0;
    this.moreflags = config.moreflags || 0;
    this.sizedim = config.sizedim || { width: 0, height: 0 };
    this.ConnectPoints = config.ConnectPoints || [];
    this.ObjGrow = config.ObjGrow || OptConstant.GrowBehavior.All;
    config.ResizeAspectConstrain = this.ObjGrow === OptConstant.GrowBehavior.ProPortional ? true : false;
    this.datasetType = config.datasetType || -1;
    this.datasetID = config.datasetID || -1;
    this.datasetTableID = config.datasetTableID || -1;
    this.datasetElemID = config.datasetElemID || -1;
    this.fieldDataDatasetID = config.fieldDataDatasetID || -1;
    this.fieldDataTableID = config.fieldDataTableID || -1;
    this.fieldDataElemID = config.fieldDataElemID || -1;
    this.dataStyleOverride = null;
    this.SymbolURL = config.SymbolURL || '';
    this.ImageURL = config.ImageURL || '';
    this.ImageDir = config.ImageDir || null;
    this.BlobBytesID = config.BlobBytesID || -1;
    this.EMFHash = config.EMFHash || null;
    this.EMFBlobBytesID = config.EMFBlobBytesID || -1;
    this.OleBlobBytesID = config.OleBlobBytesID || -1;
    this.NativeID = config.NativeID || -1;
    this.SymbolData = null;
    this.nativeDataArrayBuffer = null;
    this.EMFBuffer = null;
    this.EMFBufferType = config.EMFBufferType || null;
    this.SymbolID = config.SymbolID;
    this.SVGFragment = config.SVGFragment || null;
    this.ShapesInGroup = config.ShapesInGroup || [];
    this.InitialGroupBounds = config.InitialGroupBounds || { x: 0, y: 0, width: 0, height: 0 };
    this.ImageHeader = config.ImageHeader || null;
    this.OleHeader = config.OleHeader || null;
    this.nIcons = config.nIcons || 0;
    this.iconSize = config.iconSize || 18;
    this.iconShapeBottomOffset = config.iconShapeBottomOffset || OptConstant.Common.IconShapeBottomOffset;
    this.iconShapeRightOffset = config.iconShapeRightOffset || OptConstant.Common.iconShapeRightOffset;
    this.HyperlinkText = config.HyperlinkText || '';
    this.AttachmentInfo = config.AttachmentInfo || '';
    this.ResizeAspectConstrain = config.ResizeAspectConstrain || false;
    this.ob = {};
    this.prevBBox = config.prevBBox || { x: 0, y: 0, width: 0, height: 0 };
    this.bInGroup = false;
    this.LineTextX = config.LineTextX || 0;
    this.LineTextY = config.LineTextX || 0;
    this.actionArrowHideTimerID = -1;
    this.FramezList = null;
    this.ParentFrameID = -1;
  }

  GenericKnob(params: any) {
    T3Util.Log('= S.BaseDrawObject: GenericKnob input:', params);

    let knobShape = params.svgDoc.CreateShape(params.shapeType);

    if (params.shapeType === OptConstant.CSType.Polygon) {
      if (params.polyPoints) {
        knobShape.SetPoints(params.polyPoints);
        params.polyPoints = null;
      } else if (params.polyType === 'vertical') {
        const verticalPoints = [
          { x: 0, y: 0 },
          { x: params.knobSize / 2, y: -params.knobSize },
          { x: params.knobSize, y: 0 },
          { x: params.knobSize / 2, y: params.knobSize }
        ];
        knobShape.SetPoints(verticalPoints);
      } else if (params.polyType === 'horizontal') {
        const horizontalPoints = [
          { x: -params.knobSize / 2, y: 0 },
          { x: params.knobSize / 2, y: -params.knobSize / 2 },
          { x: (3 * params.knobSize) / 2, y: 0 },
          { x: params.knobSize / 2, y: params.knobSize / 2 }
        ];
        knobShape.SetPoints(horizontalPoints);
      } else {
        const defaultPoints = [
          { x: 0, y: params.knobSize / 2 },
          { x: params.knobSize / 2, y: 0 },
          { x: params.knobSize, y: params.knobSize / 2 },
          { x: params.knobSize / 2, y: params.knobSize }
        ];
        knobShape.SetPoints(defaultPoints);
      }
      knobShape.SetEventBehavior(OptConstant.EventBehavior.ALL);
    }

    if (params.locked) {
      knobShape.SetFillColor('gray');
      knobShape.SetID(0);
    } else {
      knobShape.SetFillColor(params.fillColor);
      knobShape.SetID(params.knobID);
      knobShape.SetCursor(params.cursorType);
    }

    knobShape.SetSize(params.knobSize, params.knobSize);
    knobShape.SetPos(params.x, params.y);
    knobShape.SetFillOpacity(params.fillOpacity);
    knobShape.SetStrokeWidth(params.strokeSize);
    knobShape.SetStrokeColor(params.strokeColor);

    T3Util.Log('= S.BaseDrawObject: GenericKnob output:', knobShape);
    return knobShape;
  }

  CreateActionTriggers(
    inputElement: any,
    triggerType: any,
    additionalInfo: any,
    options: any
  ): any {
    T3Util.Log('= S.BaseDrawObject: CreateActionTriggers input:', {
      inputElement,
      triggerType,
      additionalInfo,
      options
    });

    const result = null;

    T3Util.Log('= S.BaseDrawObject: CreateActionTriggers output:', result);
    return result;
  }

  CreateShape(shapeType: string, options?: any): any {
    T3Util.Log("= S.BaseDrawObject: CreateShape input:", { shapeType, options });

    // Create a dummy shape object with the provided type and options.
    const shape = {
      type: shapeType,
      options: options || {}
    };

    T3Util.Log("= S.BaseDrawObject: CreateShape output:", shape);
    return shape;
  }

  MoveSVG(): void {
    T3Util.Log('= S.BaseDrawObject: MoveSVG input, BlockID:', this.BlockID);

    // Retrieve the SVG element using the current BlockID
    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    if (svgElement) {
      // Get the current SVG frame
      const svgFrame = this.GetSVGFrame();
      T3Util.Log('= S.BaseDrawObject: MoveSVG retrieved frame:', svgFrame);

      // Move the SVG element to the new position specified by the frame
      svgElement.SetPos(svgFrame.x, svgFrame.y);
      T3Util.Log(`= S.BaseDrawObject: MoveSVG output, SVG element position set to x: ${svgFrame.x}, y: ${svgFrame.y}`);
    } else {
      T3Util.Log('= S.BaseDrawObject: MoveSVG output, no SVG element found for BlockID:', this.BlockID);
    }
  }

  CreateConnectHilites(
    hiliteElements: any,
    triggerType: any,
    additionalInfo: any,
    options: any,
    extraParam1: any,
    extraParam2: any
  ): any {
    T3Util.Log("= S.BaseDrawObject: CreateConnectHilites input:", {
      hiliteElements,
      triggerType,
      additionalInfo,
      options,
      extraParam1,
      extraParam2
    });
    const result = null;
    T3Util.Log("= S.BaseDrawObject: CreateConnectHilites output:", result);
    return result;
  }

  CreateDimensionAdjustmentKnobs(container: any, triggerElement: any, knobParams: any) {
    T3Util.Log("= S.BaseDrawObject: CreateDimensionAdjustmentKnobs input:", container, triggerElement, knobParams);

    // Create a deep copy of the knob parameters and calculate half knob size
    let baseParams: any = $.extend(true, {}, knobParams);
    const knobSizeHalf = baseParams.knobSize / 2;

    // Set additional parameters for the knob
    baseParams.knobID = OptConstant.ActionTriggerType.DimLineAdj;
    let docToScreenScale: number = T3Gv.opt.svgDoc.docInfo.docToScreenScale;
    if (T3Gv.opt.svgDoc.docInfo.docScale <= 0.5) {
      docToScreenScale *= 2;
    }
    baseParams.knobSize = OptConstant.Common.KnobSize / docToScreenScale;
    baseParams.shapeType = OptConstant.CSType.Polygon;
    baseParams.fillColor = 'black';
    baseParams.fillOpacity = 1;

    // Get the dimension points used for creating adjustment knobs
    let dimensionPoints: Point[] = this.GetDimensionPoints();
    const numPoints: number = dimensionPoints.length;

    // Loop through each segment between the dimension points to create a knob
    for (let i = 1; i < numPoints; i++) {
      let dimLineDeflectUserData = this.GetDimensionLineDeflectionKnobUserData(triggerElement, i, dimensionPoints, knobSizeHalf, baseParams.knobSize / 2);
      if (dimLineDeflectUserData) {
        // Set knob position to the calculated knob point
        baseParams.x = dimLineDeflectUserData.knobPoint.x;
        baseParams.y = dimLineDeflectUserData.knobPoint.y;

        // Calculate the angle between consecutive dimension points
        let angleBetween: number = Utils1.CalcAngleFromPoints(dimensionPoints[i - 1], dimensionPoints[i]);

        // Define the polygon points for the knob (a diamond shape)
        baseParams.polyPoints = [
          { x: 0, y: baseParams.knobSize / 2 },
          { x: baseParams.knobSize / 2, y: 0 },
          { x: baseParams.knobSize, y: baseParams.knobSize / 2 },
          { x: baseParams.knobSize / 2, y: baseParams.knobSize }
        ];

        // If the angle is not zero, adjust (rotate) the polygon points
        if (angleBetween !== 0) {
          let polyRect: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
          Utils2.GetPolyRect(polyRect, baseParams.polyPoints);
          Utils3.RotatePointsAboutCenter(polyRect, -angleBetween / (180 / NvConstant.Geometry.PI), baseParams.polyPoints);
        }

        // Adjust the cursor angle taking into account the object's rotation
        let cursorAngle: number = angleBetween;
        if (this.RotationAngle && this.RotationAngle !== 0) {
          cursorAngle += this.RotationAngle;
          cursorAngle %= 360;
        }
        baseParams.cursorType = this.CalcCursorForAngle(cursorAngle, true);

        // Create the knob using the generic knob creation method and attach its user data
        let knobElement = this.GenericKnob(baseParams);
        knobElement.SetUserData(dimLineDeflectUserData);

        // Add this knob element to the container
        container.AddElement(knobElement);
      }
    }

    T3Util.Log("= S.BaseDrawObject: CreateDimensionAdjustmentKnobs output: created knobs for", numPoints - 1, "segments");
  }

  HitAreaClick(event: any): void {
    T3Util.Log("= S.BaseDrawObject: HitAreaClick input:", event);

    // TODO: Implement the hit area click functionality here.
    // Currently, no action is performed.

    T3Util.Log("= S.BaseDrawObject: HitAreaClick output: no action taken");
  }

  ChangeTarget(
    currentTarget: any,
    newTarget: any,
    action: any,
    options: any,
    extra1: any,
    extra2: any
  ): void {
    T3Util.Log("= S.BaseDrawObject: ChangeTarget input:", {
      currentTarget,
      newTarget,
      action,
      options,
      extra1,
      extra2
    });

    // TODO: Add the implementation logic here

    T3Util.Log("= S.BaseDrawObject: ChangeTarget output: completed");
  }

  OnConnect(connectionPoint: Point, targetObject: any, connectionData: any, options: any, context: any): void {
    T3Util.Log("= S.BaseDrawObject: OnConnect input:", {
      connectionPoint,
      targetObject,
      connectionData,
      options,
      context
    });

    // TODO: Implement connection handling logic

    T3Util.Log("= S.BaseDrawObject: OnConnect output: completed");
  }

  OnDisconnect(
    connectionPoint: Point,
    targetObject: any,
    disconnectData: any,
    options: any
  ): void {
    T3Util.Log('= S.BaseDrawObject: OnDisconnect input:', {
      connectionPoint,
      targetObject,
      disconnectData,
      options
    });

    // TODO: Implement disconnect logic here

    T3Util.Log('= S.BaseDrawObject: OnDisconnect output: completed');
  }

  GetDimensionsRect() {
    T3Util.Log("= S.BaseDrawObject: GetDimensionsRect input, Dimensions:", this.Dimensions, "Frame:", this.Frame);

    let resultRect: Rectangle = new Rectangle();
    let accumulatedRect: Rectangle = resultRect; // alias for clarity
    let collectedRects: Rectangle[] = [];

    // Check if the dimension flags allow dimensions to be shown
    if (
      !(
        this.Dimensions & NvConstant.DimensionFlags.Always ||
        this.Dimensions & NvConstant.DimensionFlags.Select
      )
    ) {
      T3Util.Log("= S.BaseDrawObject: GetDimensionsRect output, dimension flags not set. Result:", resultRect);
      return resultRect;
    }

    const dimensionPoints: Point[] = this.GetDimensionPoints();
    if (dimensionPoints.length < 2) {
      T3Util.Log("= S.BaseDrawObject: GetDimensionsRect output, not enough dimension points. Result:", resultRect);
      return resultRect;
    }

    // Loop over consecutive dimension points
    for (let i = 1; i < dimensionPoints.length; i++) {
      let dimensionText: string = this.GetDimensionFloatingPointValue(i);
      if (!dimensionText) {
        dimensionText = this.GetDimensionTextForPoints(dimensionPoints[i - 1], dimensionPoints[i]);
      }
      const angle: number = Utils1.CalcAngleFromPoints(dimensionPoints[i - 1], dimensionPoints[i]);
      const dimensionRects = this.GetPointsForDimension(angle, dimensionText, dimensionPoints[i - 1], dimensionPoints[i], i);

      if (dimensionRects) {
        collectedRects.push(dimensionRects.left);
        collectedRects.push(dimensionRects.right);
        collectedRects.push(dimensionRects.textFrame);
      }
    }

    // Include secondary dimension bounding boxes
    const secondaryRects: Rectangle[] = this.GetBoundingBoxesForSecondaryDimensions();
    collectedRects = collectedRects.concat(secondaryRects);

    // Union all collected rectangles
    for (let j = 0; j < collectedRects.length; j++) {
      if (resultRect.width === 0 && resultRect.height === 0) {
        Utils2.CopyRect(resultRect, collectedRects[j]);
      } else {
        resultRect = Utils2.UnionRect(resultRect, collectedRects[j], resultRect);
      }
    }

    // Adjust by the current frame's position
    resultRect.x += this.Frame.x;
    resultRect.y += this.Frame.y;

    T3Util.Log("= S.BaseDrawObject: GetDimensionsRect output, result:", resultRect);
    return resultRect;
  }

  GetBoundingBoxesForSecondaryDimensions(): Rectangle[] {
    T3Util.Log('= S.BaseDrawObject: GetBoundingBoxesForSecondaryDimensions input');
    const result: Rectangle[] = [];
    T3Util.Log('= S.BaseDrawObject: GetBoundingBoxesForSecondaryDimensions output:', result);
    return result;
  }

  AddDimensionsToR(): void {
    T3Util.Log("= S.BaseDrawObject: AddDimensionsToR input");

    // Retrieve the dimensions rectangle
    let dimensionsRect: Rectangle = this.GetDimensionsRect();
    T3Util.Log("= S.BaseDrawObject: AddDimensionsToR - dimensionsRect:", dimensionsRect);

    // If the dimensions rectangle has a non-zero width, update the union of the current rectangle (r) with it
    if (dimensionsRect.width !== 0) {
      this.r = Utils2.UnionRect(this.r, dimensionsRect, this.r);
      T3Util.Log("= S.BaseDrawObject: AddDimensionsToR - updated r:", this.r);
    } else {
      T3Util.Log("= S.BaseDrawObject: AddDimensionsToR - dimensionsRect.width is 0, no updates made");
    }

    T3Util.Log("= S.BaseDrawObject: AddDimensionsToR output", this.r);
  }

  UpdateFrame(newRect: Rectangle): void {
    T3Util.Log("= S.BaseDrawObject: UpdateFrame input:", newRect);
    if (newRect) {
      Utils2.CopyRect(this.Frame, newRect);
      Utils2.CopyRect(this.r, newRect);
      Utils2.CopyRect(this.inside, newRect);
      Utils2.CopyRect(this.trect, newRect);
    }
    T3Util.Log("= S.BaseDrawObject: UpdateFrame output:", {
      Frame: this.Frame,
      r: this.r,
      inside: this.inside,
      trect: this.trect
    });
  }

  SetSize(width: number, height: number): void {
    T3Util.Log("= S.BaseDrawObject: SetSize input:", { width, height });
    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
    }
    T3Util.Log("= S.BaseDrawObject: SetSize output:", { rflags: this.rflags });
  }

  OffsetShape(dx: number, dy: number): void {
    T3Util.Log("= S.BaseDrawObject: OffsetShape input:", { dx, dy });
    this.Frame.x += dx;
    this.Frame.y += dy;
    this.r.x += dx;
    this.r.y += dy;
    this.inside.x += dx;
    this.inside.y += dy;
    this.trect.x += dx;
    this.trect.y += dy;
    T3Util.Log("= S.BaseDrawObject: OffsetShape output:", {
      Frame: this.Frame,
      r: this.r,
      inside: this.inside,
      trect: this.trect
    });
  }

  SetShapeOrigin(newX: number, newY: number, origin?: any): void {
    T3Util.Log("= S.BaseDrawObject: SetShapeOrigin input:", { newX, newY, origin });

    const deltaX = newX != null ? newX - this.Frame.x : 0;
    const deltaY = newY != null ? newY - this.Frame.y : 0;

    this.OffsetShape(deltaX, deltaY);

    T3Util.Log("= S.BaseDrawObject: SetShapeOrigin output: new Frame:", this.Frame);
  }

  ApplyCurvature(param: any): void {
    T3Util.Log('= S.BaseDrawObject: ApplyCurvature input:', param);

    // Insert curvature application logic here.
    // For example, if e represents curvature data, process it accordingly.
    // This is a placeholder for the actual implementation.
    //
    // Example (pseudo-code):
    // const curvatureValue = e.curvature || 0;
    // // Apply the curvature to the object's frame or related property.
    // this.curvature = curvatureValue;
    //
    // End of curvature logic.

    T3Util.Log('= S.BaseDrawObject: ApplyCurvature output: completed');
  }

  ScaleObject(
    posOffsetX: number,
    posOffsetY: number,
    rotateCenter: Point,
    rotationAngle: number,
    scaleX: number,
    scaleY: number,
    updateContainerStyle: boolean
  ): void {
    T3Util.Log("= S.BaseDrawObject: ScaleObject input:", {
      posOffsetX,
      posOffsetY,
      rotateCenter,
      rotationAngle,
      scaleX,
      scaleY,
      updateContainerStyle
    });

    // Scale and translate the frame
    let frame = this.Frame;
    frame.x = posOffsetX + frame.x * scaleX;
    frame.y = posOffsetY + frame.y * scaleY;
    frame.width *= scaleX;
    frame.height *= scaleY;

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
    }

    // Apply rotation if needed
    if (rotationAngle) {
      const centerPoint = {
        x: frame.x + frame.width / 2,
        y: frame.y + frame.height / 2
      };
      const angleRadians = 2 * Math.PI * (rotationAngle / 360);
      const rotatedCenter = T3Gv.opt.RotatePointAroundPoint(rotateCenter, centerPoint, angleRadians);
      frame.x = rotatedCenter.x - frame.width / 2;
      frame.y = rotatedCenter.y - frame.height / 2;
      this.RotationAngle += rotationAngle;
      if (this.RotationAngle >= 360) {
        this.RotationAngle -= 360;
      }
    }

    // Update style record if updateContainerStyle flag is true
    if (updateContainerStyle) {
      let maxScale = scaleX;
      if (scaleY > maxScale) {
        maxScale = scaleY;
      }
      this.StyleRecord.Line.Thickness *= maxScale;
      this.StyleRecord.Line.BThick *= maxScale;
    }

    // Update container list scaling if available
    if (this.ContainerList) {
      const container = this.ContainerList;
      container.HorizontalSpacing *= scaleX;
      container.VerticalSpacing *= scaleX;
      container.MinWidth *= scaleX;
      container.MinHeight *= scaleX;
      container.childwidth *= scaleX;
      container.childheight *= scaleX;
    }

    // Update frame and sizedim based on new frame values
    this.UpdateFrame(frame);
    this.sizedim.width = this.Frame.width;
    this.sizedim.height = this.Frame.height;

    T3Util.Log("= S.BaseDrawObject: ScaleObject output:", {
      Frame: this.Frame,
      RotationAngle: this.RotationAngle,
      sizedim: this.sizedim
    });
  }

  GetDragR(): Rectangle {
    T3Util.Log("= S.BaseDrawObject: GetDragR input");
    const dragRect: Rectangle = {} as Rectangle;
    Utils2.CopyRect(dragRect, this.r);
    T3Util.Log("= S.BaseDrawObject: GetDragR output:", dragRect);
    return dragRect;
  }

  GetHitTestFrame(): Rectangle {
    T3Util.Log("= S.BaseDrawObject: GetHitTestFrame input");
    let hitTestFrame: Rectangle = new Rectangle();
    Utils2.CopyRect(hitTestFrame, this.r);
    T3Util.Log("= S.BaseDrawObject: GetHitTestFrame output:", hitTestFrame);
    return hitTestFrame;
  }

  GetSVGFrame(frame?: Rectangle): Rectangle {
    T3Util.Log('= S.BaseDrawObject: GetSVGFrame - input:', frame);
    const newFrame: Rectangle = new Rectangle();
    if (frame == null) {
      frame = this.Frame;
    }
    Utils2.CopyRect(newFrame, frame);
    T3Util.Log('= S.BaseDrawObject: GetSVGFrame - output:', newFrame);
    return newFrame;
  }

  LinkGrow(inputElement: any, growthFactor: number): void {
    T3Util.Log("= S.BaseDrawObject: LinkGrow input:", { inputElement, growthFactor });

    // TODO: Implement the link growth logic here.

    T3Util.Log("= S.BaseDrawObject: LinkGrow output: completed");
  }

  GetMoveRect(useRelative: boolean): Rectangle {
    T3Util.Log("= S.BaseDrawObject: GetMoveRect input:", { useRelative });
    let resultRect: Rectangle = {} as Rectangle;

    if (useRelative) {
      Utils2.CopyRect(resultRect, this.r);
      // InflateRect currently uses 0 values; adjust if needed.
      Utils2.InflateRect(resultRect, 0, 0);
    } else {
      Utils2.CopyRect(resultRect, this.Frame);
    }

    T3Util.Log("= S.BaseDrawObject: GetMoveRect output:", resultRect);
    return resultRect;
  }

  GetPositionRect(): Rectangle {
    T3Util.Log("= S.BaseDrawObject: GetPositionRect input");
    const rect: Rectangle = {} as Rectangle;
    Utils2.CopyRect(rect, this.Frame);
    T3Util.Log("= S.BaseDrawObject: GetPositionRect output:", rect);
    return rect;
  }

  AdjustPinRect(inputRect: Rectangle, adjustment: any): any {
    T3Util.Log("= S.BaseDrawObject: AdjustPinRect input:", { inputRect, adjustment });
    const resultRect = inputRect; // No adjustment applied, returning as is
    T3Util.Log("= S.BaseDrawObject: AdjustPinRect output:", resultRect);
    return resultRect;
  }

  GetArrayRect(useAlternateMapping: boolean): CRect {
    T3Util.Log("= S.BaseDrawObject: GetArrayRect input:", { useAlternateMapping });

    // Calculate the border thickness based on the line style record
    const borderThickness: number = this.StyleRecord.Line.BThick
      ? 2 * this.StyleRecord.Line.BThick
      : this.StyleRecord.Line.Thickness / 2;

    // Create a deep copy of the current frame object
    const frameCopy: Rectangle = $.extend(true, {}, this.Frame);

    // Inflate the copied frame by the border thickness on both axes
    Utils2.InflateRect(frameCopy, borderThickness, borderThickness);

    // Create a new rectangle object (CRect) with computed properties
    const rect: CRect = new CRect();
    if (useAlternateMapping) {
      rect.h = frameCopy.y;
      rect.v = frameCopy.x;
      rect.hdist = frameCopy.height;
      rect.vdist = frameCopy.width;
    } else {
      rect.h = frameCopy.x;
      rect.hdist = frameCopy.width;
      rect.v = frameCopy.y;
      rect.vdist = frameCopy.height;
    }

    T3Util.Log("= S.BaseDrawObject: GetArrayRect output:", rect);
    return rect;
  }

  GetTargetRect(input: any, options: any): Rectangle {
    T3Util.Log("= S.BaseDrawObject: GetTargetRect input:", { input, options });

    const targetRect: Rectangle = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };

    T3Util.Log("= S.BaseDrawObject: GetTargetRect output:", targetRect);
    return targetRect;
  }

  // IsOKFlowChartShape(e) {
  //   return 0
  // }

  // IsFlowChartConnector() {
  //   return !1
  // }

  // IsOrgChartConnector() {
  //   return !1
  // }

  GetHookFlags(): number {
    T3Util.Log("= S.BaseDrawObject: GetHookFlags input");
    const result = 0;
    T3Util.Log("= S.BaseDrawObject: GetHookFlags output:", result);
    return result;
  }

  AllowLink(): number {
    T3Util.Log("= S.BaseDrawObject: AllowLink input: none");
    const result: number = 0;
    T3Util.Log("= S.BaseDrawObject: AllowLink output:", result);
    return result;
  }

  // IsSwimlane(): boolean {
  //   T3Util.Log("= S.BaseDrawObject: IsSwimlane input:");
  //   const result = false;
  //   T3Util.Log("= S.BaseDrawObject: IsSwimlane output:", result);
  //   return result;
  // }

  AllowSpell(): boolean {
    T3Util.Log("= S.BaseDrawObject: AllowSpell input, bInGroup:", this.bInGroup, "TextFlags:", this.TextFlags);
    const result = !this.bInGroup && ((this.TextFlags & NvConstant.TextFlags.NoSpell) === 0);
    T3Util.Log("= S.BaseDrawObject: AllowSpell output:", result);
    return result;
  }

  PreventLink(): boolean {
    T3Util.Log("= S.BaseDrawObject: PreventLink input");
    const result = false;
    T3Util.Log("= S.BaseDrawObject: PreventLink output:", result);
    return result;
  }

  AllowHeal(): boolean {
    T3Util.Log("= S.BaseDrawObject: AllowHeal input: none");
    const result = false;
    T3Util.Log("= S.BaseDrawObject: AllowHeal output:", result);
    return result;
  }

  AllowMaintainLink(): boolean {
    T3Util.Log("= S.BaseDrawObject: AllowMaintainLink input, no parameters");
    const result = true;
    T3Util.Log("= S.BaseDrawObject: AllowMaintainLink output:", result);
    return result;
  }

  GetHookPoints(): any {
    T3Util.Log("= S.BaseDrawObject: GetHookPoints input");
    const hookPoints = null;
    T3Util.Log("= S.BaseDrawObject: GetHookPoints output:", hookPoints);
    return hookPoints;
  }

  GetBestHook(inputHook: any, targetHook: any, attachmentData: any): any {
    T3Util.Log("= S.BaseDrawObject: GetBestHook - input:", { inputHook, targetHook, attachmentData });

    const bestHook = targetHook;

    T3Util.Log("= S.BaseDrawObject: GetBestHook - output:", bestHook);
    return bestHook;
  }

  SetHookAlign(hook: any, alignment: any): void {
    T3Util.Log("= S.BaseDrawObject: SetHookAlign input:", { hook, alignment });

    // TODO: Add implementation logic for setting hook alignment here.

    T3Util.Log("= S.BaseDrawObject: SetHookAlign output: completed");
  }

  GetTargetPoints(targetPoint: Point, hookFlags: number, extraParam: any): any {
    T3Util.Log("= S.BaseDrawObject: GetTargetPoints input:", { targetPoint, hookFlags, extraParam });
    const result = null;
    T3Util.Log("= S.BaseDrawObject: GetTargetPoints output:", result);
    return result;
  }

  AllowHook(hookData: any, target: any, attachment: any): boolean {
    T3Util.Log("= S.BaseDrawObject: AllowHook input:", { hookData, target, attachment });
    const result = true;
    T3Util.Log("= S.BaseDrawObject: AllowHook output:", result);
    return result;
  }

  ConnectToHook(sourceHook: any, targetHook: any): any {
    T3Util.Log("= S.BaseDrawObject: ConnectToHook input:", { sourceHook, targetHook });
    const result = targetHook;
    T3Util.Log("= S.BaseDrawObject: ConnectToHook output:", result);
    return result;
  }

  HookToPoint(point: Point, target: Point): Point {
    T3Util.Log("= S.BaseDrawObject: HookToPoint input:", { point, target });
    const result: Point = { x: 0, y: 0 };
    T3Util.Log("= S.BaseDrawObject: HookToPoint output:", result);
    return result;
  }

  IsCoManager(manager: any): boolean {
    T3Util.Log("= S.BaseDrawObject: IsCoManager input:", manager);
    const result = false;
    T3Util.Log("= S.BaseDrawObject: IsCoManager output:", result);
    return result;
  }

  LinkNotVisible(): boolean {
    T3Util.Log("= S.BaseDrawObject: LinkNotVisible input: no parameters");
    const isNotVisible = (this.flags & NvConstant.ObjFlags.NotVisible) > 0;
    T3Util.Log("= S.BaseDrawObject: LinkNotVisible output:", isNotVisible);
    return isNotVisible;
  }

  IsAsstConnector(): boolean {
    T3Util.Log("= S.BaseDrawObject: IsAsstConnector input:");
    const result = false;
    T3Util.Log("= S.BaseDrawObject: IsAsstConnector output:", result);
    return result;
  }

  GetPerimPts(
    unusedId: any,
    points: Point[],
    unusedParam: any,
    skipRotation: boolean,
    optionalParam?: any,
    anotherOptionalParam?: any
  ): Point[] {
    T3Util.Log("= S.BaseDrawObject: GetPerimPts input:", {
      unusedId,
      points,
      unusedParam,
      skipRotation,
      optionalParam,
      anotherOptionalParam,
    });

    const numPoints = points.length;
    const computedPoints: Point[] = [];
    const shapeTriType = PolygonConstant.ShapeTypes.TRIANGLE;
    const cellDimension = OptConstant.Common.DimMax;

    for (let index = 0; index < numPoints; index++) {
      computedPoints[index] = { x: 0, y: 0, id: 0 };
      computedPoints[index].x =
        (points[index].x / cellDimension) * this.Frame.width + this.Frame.x;

      const adjustedY =
        this.dataclass === shapeTriType ? cellDimension - points[index].y : points[index].y;

      computedPoints[index].y =
        (adjustedY / cellDimension) * this.Frame.height + this.Frame.y;

      if (points[index].id != null) {
        computedPoints[index].id = points[index].id;
      }
    }

    if (!skipRotation) {
      const rotatedAngle = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotatedAngle, computedPoints);
    }

    T3Util.Log("= S.BaseDrawObject: GetPerimPts output:", computedPoints);
    return computedPoints;
  }

  ChangeHook(sourceHook: any, targetHook: any, additionalData: any): void {
    T3Util.Log("= S.BaseDrawObject: ChangeHook input:", { sourceHook, targetHook, additionalData });
    HookUtil.CNChangeHook(this, sourceHook, targetHook, additionalData);
    T3Util.Log("= S.BaseDrawObject: ChangeHook output:", "Hook change applied");
  }

  ChangeShape(e: any, t: any, a: any, r: any, i: any): boolean {
    T3Util.Log("= S.BaseDrawObject: ChangeShape input:", { e, t, a, r, i });
    const result = false;
    T3Util.Log("= S.BaseDrawObject: ChangeShape output:", result);
    return result;
  }

  GetLineChangeFrame() {
    T3Util.Log("= S.BaseDrawObject: GetLineChangeFrame input:", this.Frame);
    let frame = $.extend(true, {}, this.Frame);
    if (frame.width < OptConstant.Common.SegDefLen) {
      frame.width = OptConstant.Common.SegDefLen;
    }
    if (frame.height < OptConstant.Common.SegDefLen) {
      frame.height = OptConstant.Common.SegDefLen;
    }
    T3Util.Log("= S.BaseDrawObject: GetLineChangeFrame output:", frame);
    return frame;
  }

  DeleteObject(): void {
    T3Util.Log("= S.BaseDrawObject: DeleteObject input:", {
      TableID: this.TableID,
      DataID: this.DataID,
      NoteID: this.NoteID,
      NativeID: this.NativeID,
      BlobBytesID: this.BlobBytesID,
      EMFBlobBytesID: this.EMFBlobBytesID,
      OleBlobBytesID: this.OleBlobBytesID,
      CommentID: this.CommentID
    });

    let tempObj: any = null;
    let hooksBackup: any[] = [];

    // Delete table object if exists
    // if (this.TableID !== -1) {
    //   const tablePtr = DataUtil.GetObjectPtr(this.TableID, true);
    //   if (tablePtr) {
    //     T3Gv.opt.Table_DeleteObject(tablePtr);
    //   }
    //   tempObj = T3Gv.stdObj.GetObject(this.TableID);
    //   if (tempObj) {
    //     tempObj.Delete();
    //   }
    // }

    // Delete data object if exists
    if (this.DataID !== -1) {
      tempObj = T3Gv.stdObj.GetObject(this.DataID);
      if (tempObj) {
        tempObj.Delete();
      }
    }

    // Delete note object if exists
    if (this.NoteID !== -1) {
      tempObj = T3Gv.stdObj.GetObject(this.NoteID);
      if (tempObj) {
        tempObj.Delete();
      }
    }

    // Delete native object if exists
    if (this.NativeID !== -1) {
      tempObj = T3Gv.stdObj.GetObject(this.NativeID);
      if (tempObj) {
        tempObj.Delete();
      }
    }

    // Delete blob bytes object and associated URL if exists
    if (this.BlobBytesID !== -1) {
      tempObj = T3Gv.stdObj.GetObject(this.BlobBytesID);
      if (tempObj) {
        tempObj.Delete();
      }
      if (OptCMUtil.IsBlobURL(this.ImageURL)) {
        OptCMUtil.DeleteURL(this.ImageURL);
      }
    }

    // Delete EMF blob bytes object if exists
    if (this.EMFBlobBytesID !== -1) {
      tempObj = T3Gv.stdObj.GetObject(this.EMFBlobBytesID);
      if (tempObj) {
        tempObj.Delete();
      }
    }

    // Delete Ole blob bytes object if exists
    if (this.OleBlobBytesID !== -1) {
      tempObj = T3Gv.stdObj.GetObject(this.OleBlobBytesID);
      if (tempObj) {
        tempObj.Delete();
      }
    }

    // Remove field data
    this.RemoveFieldData(true);

    // Process hooks and update dimension lines for hooked objects if necessary
    if (this.hooks.length > 0) {
      const hookedObj = DataUtil.GetObjectPtr(this.hooks[0].objid, false);
      if (
        hookedObj &&
        hookedObj.objecttype === NvConstant.FNObjectTypes.FlWall &&
        !(hookedObj.Dimensions & NvConstant.DimensionFlags.HideHookedObjDimensions)
      ) {
        hooksBackup = Utils1.DeepCopy(this.hooks);
        this.hooks = [];
        const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(hookedObj.BlockID);
        hookedObj.UpdateDimensionLines(svgElement);
        this.hooks = hooksBackup;
      }
    }

    // Delete comment object if applicable
    if (this.CommentID >= 0) {
      T3Gv.opt.CommentObjectDelete(this);
    }

    T3Util.Log("= S.BaseDrawObject: DeleteObject output: object deleted");
  }

  GetTextIDs(): number[] {
    T3Util.Log("= S.BaseDrawObject: GetTextIDs input");
    const textIDs: number[] = [];
    T3Util.Log("= S.BaseDrawObject: GetTextIDs output:", textIDs);
    return textIDs;
  }

  GetSegLFace(segmentIndex: number, someParam: any, anotherParam: any): number {
    T3Util.Log("= S.BaseDrawObject: GetSegLFace input:", { segmentIndex, someParam, anotherParam });
    const result = 0;
    T3Util.Log("= S.BaseDrawObject: GetSegLFace output:", result);
    return result;
  }

  GetSpacing(): { width: number | null; height: number | null } {
    T3Util.Log("= S.BaseDrawObject: GetSpacing input");
    const spacing = {
      width: null,
      height: null
    };
    T3Util.Log("= S.BaseDrawObject: GetSpacing output:", spacing);
    return spacing;
  }

  GetShapeConnectPoint(): { x: number; y: number } {
    T3Util.Log("= S.BaseDrawObject: GetShapeConnectPoint input:");
    const connectPoint = { x: 0, y: 0 };
    T3Util.Log("= S.BaseDrawObject: GetShapeConnectPoint output:", connectPoint);
    return connectPoint;
  }

  ClosePolygon(e: any, t: any, a: any): boolean {
    T3Util.Log("= S.BaseDrawObject: ClosePolygon input:", { e, t, a });
    const result: boolean = false;
    T3Util.Log("= S.BaseDrawObject: ClosePolygon output:", result);
    return result;
  }

  Hit(point: Point, param2: any, param3: any, param4: any): number {
    T3Util.Log("= S.BaseDrawObject: Hit input:", { point, param2, param3, param4 });
    const hitCode = Utils2.pointInRect(this.Frame, point)
      ? NvConstant.HitCodes.Border
      : 0;
    T3Util.Log("= S.BaseDrawObject: Hit output:", hitCode);
    return hitCode;
  }

  AfterModifyShape(shape: any, additionalData: any): void {
    T3Util.Log("= S.BaseDrawObject: AfterModifyShape input:", { shape, additionalData });

    OptCMUtil.SetLinkFlag(shape, DSConstant.LinkFlags.SED_L_MOVE);
    T3Gv.opt.UpdateLinks();

    T3Util.Log("= S.BaseDrawObject: AfterModifyShape output: links updated");
  }

  AfterRotateShape(shape: any): void {
    T3Util.Log("= S.BaseDrawObject: AfterRotateShape input:", shape);

    OptCMUtil.SetLinkFlag(shape, DSConstant.LinkFlags.SED_L_MOVE);
    T3Gv.opt.UpdateLinks();

    T3Util.Log("= S.BaseDrawObject: AfterRotateShape output: links updated");
  }

  PolyGetTargetPointList(inputParam: any): Point[] {
    T3Util.Log("= S.BaseDrawObject: PolyGetTargetPointList input:", inputParam);

    // Get the list of polygon points
    let targetPoints: Point[] = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, true, null);

    // If there is a rotation applied, convert it to radians and rotate the points about the frame center
    if (this.RotationAngle !== 0) {
      const rotationInRadians: number = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationInRadians, targetPoints);
    }

    T3Util.Log("= S.BaseDrawObject: PolyGetTargetPointList output:", targetPoints);
    return targetPoints;
  }

  GetPolyPoints(dummy: number, applyAbsoluteOffset: boolean, unused: any, inflateRect: boolean, unused2: any): Point[] {
    T3Util.Log("= S.BaseDrawObject: GetPolyPoints input:", { dummy, applyAbsoluteOffset, unused, inflateRect, unused2 });

    let points: Point[] = [];
    let frameCopy: Rectangle = new Rectangle();
    const lineThickness: number = this.StyleRecord.Line.Thickness / 2;

    // Copy the current frame into frameCopy
    Utils2.CopyRect(frameCopy, this.Frame);

    // Inflate the frame if requested
    if (inflateRect) {
      Utils2.InflateRect(frameCopy, lineThickness, lineThickness);
    }

    // Define the polygon points relative to the frame
    points.push(new Point(0, 0));
    points.push(new Point(frameCopy.width, 0));
    points.push(new Point(frameCopy.width, frameCopy.height));
    points.push(new Point(0, frameCopy.height));
    points.push(new Point(0, 0));

    // If absolute positioning is not required, adjust the points by the frame's origin.
    if (!applyAbsoluteOffset) {
      for (let index = 0; index < points.length; index++) {
        points[index].x += frameCopy.x;
        points[index].y += frameCopy.y;
      }
    }

    T3Util.Log("= S.BaseDrawObject: GetPolyPoints output:", points);
    return points;
  }

  /**
   * Handles right-click events on the drawing object
   * This method processes the right-click event, converts window coordinates to document coordinates,
   * selects the object, and prepares the context menu parameters
   *
   * @param clickEvent - The mouse/touch event with gesture information
   * @returns Boolean indicating whether the right-click handling was successful
   */
  RightClick(clickEvent: any): boolean {
    T3Util.Log("= S.BaseDrawObject: RightClick input:", clickEvent);

    // Convert the window coordinates to document coordinates
    const documentCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      clickEvent.gesture.center.clientX,
      clickEvent.gesture.center.clientY
    );
    T3Util.Log("= S.BaseDrawObject: Converted window to doc coords:", documentCoordinates);

    // Find the SVG element corresponding to the current target
    const targetElement = T3Gv.opt.svgObjectLayer.FindElementByDOMElement(clickEvent.currentTarget);
    T3Util.Log("= S.BaseDrawObject: Found SVG element:", targetElement);

    // Select the object from the click event; exit if not selected
    if (!SelectUtil.SelectObjectFromClick(clickEvent, targetElement)) {
      T3Util.Log("= S.BaseDrawObject: RightClick output: Object selection failed");
      return false;
    }

    // Set up right click parameters
    T3Gv.opt.rClickParam = new RightClickMd();
    T3Gv.opt.rClickParam.targetId = targetElement.GetID();
    T3Gv.opt.rClickParam.hitPoint.x = documentCoordinates.x;
    T3Gv.opt.rClickParam.hitPoint.y = documentCoordinates.y;
    T3Gv.opt.rClickParam.locked = (this.flags & NvConstant.ObjFlags.Lock) > 0;
    T3Util.Log("= S.BaseDrawObject: Right click param set to:", T3Gv.opt.rClickParam);

    // Show the appropriate contextual menu based on read-only status
    if (T3Gv.docUtil.IsReadOnly()) {
      // Show read-only context menu
      UIUtil.ShowContextMenu("", clickEvent.gesture.center.clientX, clickEvent.gesture.center.clientY);
    } else {
      // Show editable context menu
      UIUtil.ShowContextMenu("", clickEvent.gesture.center.clientX, clickEvent.gesture.center.clientY);
    }

    T3Util.Log("= S.BaseDrawObject: RightClick output: Contextual menu shown");
    return true;
  }

  AdjustTextEditBackground(e: any, t: any): void {
    T3Util.Log("= S.BaseDrawObject: AdjustTextEditBackground input:", { e, t });

    // TODO: Implement the logic to adjust the text edit background as needed.

    T3Util.Log("= S.BaseDrawObject: AdjustTextEditBackground output: completed");
  }

  SetTextContent(text: string): void {
    T3Util.Log("= S.BaseDrawObject: SetTextContent input:", text);
    if (text) {
      const textConfig = { runtimeText: text };
      const textObject = new TextObject(textConfig);
      const newBlock = T3Gv.stdObj.CreateBlock(
        StateConstant.StoredObjectType.TextObject,
        textObject
      );
      if (newBlock === null) {
        throw "error: AddNewObject got a null new text block allocation";
      }
      this.DataID = newBlock.ID;
    }
    T3Util.Log("= S.BaseDrawObject: SetTextContent output, DataID:", this.DataID);
  }

  SetNoteContent(noteText: string): void {
    T3Util.Log("= S.BaseDrawObject: SetNoteContent input:", noteText);

    if (noteText) {
      const textConfig = { runtimeText: noteText };
      const textObj = new TextObject(textConfig);
      const newBlock = T3Gv.stdObj.CreateBlock(StateConstant.StoredObjectType.NotesObject, textObj);

      if (newBlock === null) {
        console.error("= S.BaseDrawObject: SetNoteContent error: null new text block allocation");
        throw "error: AddNewObject got a null new text block allocation";
      }

      this.NoteID = newBlock.ID;
      T3Util.Log("= S.BaseDrawObject: SetNoteContent output: NoteID set to", this.NoteID);
    } else {
      T3Util.Log("= S.BaseDrawObject: SetNoteContent output: no note content provided");
    }
  }

  GetArrowheadFormat(): any {
    T3Util.Log("= S.BaseDrawObject: GetArrowheadFormat input:");
    const result = null;
    T3Util.Log("= S.BaseDrawObject: GetArrowheadFormat output:", result);
    return result;
  }

  GetTextParaFormat(e: any): ParagraphFormat {
    T3Util.Log("= S.BaseDrawObject: GetTextParaFormat input:", e);

    let paraFormat: ParagraphFormat = {} as ParagraphFormat;
    // Set default values
    paraFormat.just = this.TextAlign;
    paraFormat.bullet = "none";
    paraFormat.spacing = 0;

    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    // const activeTableID = T3Gv.opt.Table_GetActiveID();

    // const table = this.GetTable(false);
    // if (table) {
    //   T3Gv.opt.Table_GetTextParaFormat(table, paraFormat, svgElement, this.BlockID !== activeTableID, e, null);
    // } else

    if (this.DataID && this.DataID >= 0) {
      const textElement = svgElement.textElem;
      if (textElement) {
        const verticalAlign = textElement.GetVerticalAlignment();
        const selectedStyle = textElement.GetSelectedParagraphStyle();
        if (selectedStyle) {
          paraFormat = new ParagraphFormat();
          paraFormat.bullet = selectedStyle.bullet;
          paraFormat.spacing = selectedStyle.spacing;
          // Check if this instance is of type Instance.Shape.BaseShape
          if (this instanceof Instance.Shape.BaseShape) {
            paraFormat.vjust = verticalAlign;
            if (e) {
              switch (verticalAlign) {
                case "bottom":
                case "top":
                  paraFormat.just = verticalAlign + "-" + selectedStyle.just;
                  break;
                default:
                  paraFormat.just = selectedStyle.just;
              }
            } else {
              paraFormat.just = selectedStyle.just;
            }
          } else {
            paraFormat.just = this.TextAlign;
          }
        }
      }
    }

    T3Util.Log("= S.BaseDrawObject: GetTextParaFormat output:", paraFormat);
    return paraFormat;
  }

  GetTextFormat(returnTextFormat: boolean, textOptions: any): any {
    T3Util.Log("= S.BaseDrawObject: GetTextFormat input:", { returnTextFormat, textOptions });

    // Initialize variables with readable names
    let isBold: boolean, isItalic: boolean, isUnderline: boolean, isSuperscript: boolean, isSubscript: boolean;
    let textElement: any = null;
    const textFace = TextConstant.TextFace;
    let txtFmtData = new TextFmtData();
    let defaultStyle = new DefaultStyle();
    // const activeTableID = T3Gv.opt.Table_GetActiveID();
    const sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    // Deep copy the StyleRecord's Text settings and update font information from session block
    txtFmtData = Utils1.DeepCopy(this.StyleRecord.Text);
    txtFmtData.FontId = -1;
    txtFmtData.FontName = sessionBlock.def.lf.fontName;

    // Try to get the table for text formatting
    // const table = this.GetTable(false);
    // if (table) {
    //   T3Gv.opt.Table_GetTextFormat(table, txtFmtData, null, activeTableID !== this.BlockID, textOptions);
    // } else

    if (this.DataID !== null && this.DataID >= 0) {
      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
      if (svgElement) {
        textElement = svgElement.textElem;
      }
      if (textOptions) {
        textOptions.hastext = true;
      }
      if (textElement) {
        textElement.GetText();
        const selectedFormat = textElement.GetSelectedFormat();
        if (selectedFormat) {
          if (returnTextFormat) {
            txtFmtData.FontSize = TextUtil.FontSizeToPoints(selectedFormat.size);
            txtFmtData.FontId = -1;// T3Gv.opt.GetFontIdByName(selectedFormat.font);
            txtFmtData.FontName = selectedFormat.font;
            isBold = (selectedFormat.weight === 'bold');
            txtFmtData.Face = Utils2.SetFlag(txtFmtData.Face, textFace.Bold, isBold);
            isItalic = (selectedFormat.style === 'italic');
            txtFmtData.Face = Utils2.SetFlag(txtFmtData.Face, textFace.Italic, isItalic);
            isUnderline = (selectedFormat.decoration === 'underline');
            txtFmtData.Face = Utils2.SetFlag(txtFmtData.Face, textFace.Underline, isUnderline);
            isSuperscript = (selectedFormat.baseOffset === 'super');
            txtFmtData.Face = Utils2.SetFlag(txtFmtData.Face, textFace.Superscript, isSuperscript);
            isSubscript = (selectedFormat.baseOffset === 'sub');
            txtFmtData.Face = Utils2.SetFlag(txtFmtData.Face, textFace.Subscript, isSubscript);
            txtFmtData.Paint.Color = selectedFormat.color ? selectedFormat.color : "";
            if (selectedFormat.colorTrans) {
              txtFmtData.Paint.Opacity = selectedFormat.colorTrans;
            }
            T3Util.Log("= S.BaseDrawObject: GetTextFormat output (TxtFmtData):", txtFmtData);
            return txtFmtData;
          } else {
            defaultStyle.font = selectedFormat.font;
            defaultStyle.size = selectedFormat.size;
            defaultStyle.weight = selectedFormat.weight;
            defaultStyle.style = selectedFormat.style;
            defaultStyle.decoration = selectedFormat.decoration;
            defaultStyle.baseOffset = selectedFormat.baseOffset;
            defaultStyle.color = selectedFormat.color;
            defaultStyle.colorTrans = selectedFormat.colorTrans;
            T3Util.Log("= S.BaseDrawObject: GetTextFormat output (DefaultStyle):", defaultStyle);
            return defaultStyle;
          }
        }
      }
    }
    T3Util.Log("= S.BaseDrawObject: GetTextFormat output:", returnTextFormat ? txtFmtData : null);
    return returnTextFormat ? txtFmtData : null;
  }

  UseTextBlockColor(): boolean {
    T3Util.Log("= S.BaseDrawObject: UseTextBlockColor input: none");
    const result = false;
    T3Util.Log("= S.BaseDrawObject: UseTextBlockColor output:", result);
    return result;
  }

  SetTextObject(dataId: any): boolean {
    T3Util.Log("= S.BaseDrawObject: SetTextObject input:", dataId);
    this.DataID = dataId;
    T3Util.Log("= S.BaseDrawObject: SetTextObject output: DataID set to", this.DataID);
    return true;
  }

  GetTextObject(input: any, options?: any): number {
    T3Util.Log("= S.BaseDrawObject: GetTextObject input:", { input, options });
    const dataId = this.DataID;
    T3Util.Log("= S.BaseDrawObject: GetTextObject output:", dataId);
    return dataId;
  }

  SetTextFormat(textFormat: TextFmtData, options: any): void {
    T3Util.Log("= S.BaseDrawObject: SetTextFormat input:", { textFormat, options });

    // TODO: Implement text formatting logic here.
    // For example, you might update the style record or modify properties based on the provided text format.

    T3Util.Log("= S.BaseDrawObject: SetTextFormat output: completed");
  }

  ExtendLines(): void {
    T3Util.Log("= S.BaseDrawObject: ExtendLines input:");

    // TODO: Implement the logic for extending lines here.

    T3Util.Log("= S.BaseDrawObject: ExtendLines output: complete");
  }

  ExtendCell(inputCell: any, additionalParam: any, anotherParam: any): any {
    T3Util.Log("= S.BaseDrawObject: ExtendCell input:", { inputCell, additionalParam, anotherParam });

    // TODO: Add your implementation logic here.
    const result = null;

    T3Util.Log("= S.BaseDrawObject: ExtendCell output:", result);
    return result;
  }

  SetShapeProperties(options: {
    ClickFlag: number;
    PositionFlag: number;
    CRFlag?: boolean;
    AllowSpell?: boolean;
  }): boolean {
    T3Util.Log("= S.BaseDrawObject: SetShapeProperties input:", options);

    let changed = false;

    // Process ClickFlag
    switch (options.ClickFlag) {
      case NvConstant.TextFlags.OneClick:
        if ((this.TextFlags & NvConstant.TextFlags.OneClick) === 0) {
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            NvConstant.TextFlags.OneClick,
            true
          );
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            NvConstant.TextFlags.None,
            false
          );
          changed = true;
        }
        break;

      case NvConstant.TextFlags.None:
        if ((this.TextFlags & NvConstant.TextFlags.None) === 0) {
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            NvConstant.TextFlags.OneClick,
            false
          );
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            NvConstant.TextFlags.None,
            true
          );
          changed = true;
        }
        break;

      case 0:
        if (
          (this.TextFlags & NvConstant.TextFlags.None) ||
          (this.TextFlags & NvConstant.TextFlags.OneClick)
        ) {
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            NvConstant.TextFlags.OneClick,
            false
          );
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            NvConstant.TextFlags.None,
            false
          );
          changed = true;
        }
        break;
    }

    // Process PositionFlag
    switch (options.PositionFlag) {
      case NvConstant.TextFlags.AttachA:
        if ((this.TextFlags & NvConstant.TextFlags.AttachA) === 0) {
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            NvConstant.TextFlags.AttachA,
            true
          );
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            NvConstant.TextFlags.AttachB,
            false
          );
          changed = true;
        }
        break;

      case NvConstant.TextFlags.AttachB:
        if ((this.TextFlags & NvConstant.TextFlags.AttachB) === 0) {
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            NvConstant.TextFlags.AttachB,
            true
          );
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            NvConstant.TextFlags.AttachA,
            false
          );
          changed = true;
        }
        break;

      case 0:
        if (
          (this.TextFlags & NvConstant.TextFlags.AttachB) !== 0 ||
          (this.TextFlags & NvConstant.TextFlags.AttachA) !== 0
        ) {
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            NvConstant.TextFlags.AttachB,
            false
          );
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            NvConstant.TextFlags.AttachA,
            false
          );
          changed = true;
        }
        break;
    }

    // Process CRFlag
    if (options.CRFlag === true) {
      if ((this.TextFlags & NvConstant.TextFlags.FormCR) === 0) {
        this.TextFlags = Utils2.SetFlag(
          this.TextFlags,
          NvConstant.TextFlags.FormCR,
          true
        );
        changed = true;
      }
    } else if (options.CRFlag === false) {
      if ((this.TextFlags & NvConstant.TextFlags.FormCR) !== 0) {
        this.TextFlags = Utils2.SetFlag(
          this.TextFlags,
          NvConstant.TextFlags.FormCR,
          false
        );
        changed = true;
      }
    }

    // Process AllowSpell
    if (options.AllowSpell === false) {
      if ((this.TextFlags & NvConstant.TextFlags.NoSpell) === 0) {
        this.TextFlags = Utils2.SetFlag(
          this.TextFlags,
          NvConstant.TextFlags.NoSpell,
          true
        );
        changed = true;
      }
    } else if (options.AllowSpell === true) {
      if ((this.TextFlags & NvConstant.TextFlags.NoSpell) !== 0) {
        this.TextFlags = Utils2.SetFlag(
          this.TextFlags,
          NvConstant.TextFlags.NoSpell,
          false
        );
        changed = true;
      }
    }

    T3Util.Log("= S.BaseDrawObject: SetShapeProperties output:", changed);
    return changed;
  }

  SetShapeConnectionPoints(shape: any, connectionPoint: any, additionalInfo: any): boolean {
    T3Util.Log("= S.BaseDrawObject: SetShapeConnectionPoints input:", { shape, connectionPoint, additionalInfo });
    const result = false;
    T3Util.Log("= S.BaseDrawObject: SetShapeConnectionPoints output:", result);
    return result;
  }

  GetClosestConnectPoint(e: any): boolean {
    T3Util.Log("= S.BaseDrawObject: GetClosestConnectPoint input:", e);
    const result = false;
    T3Util.Log("= S.BaseDrawObject: GetClosestConnectPoint output:", result);
    return result;
  }

  ScaleEndPoints(): void {
    T3Util.Log("= S.BaseDrawObject: ScaleEndPoints input:", {
      polylist: this.polylist,
      startPoint: this.StartPoint,
      endPoint: this.EndPoint
    });

    if (this.polylist && this.StartPoint && this.EndPoint) {
      this.PolyLineScaleEndPoints();
    }

    T3Util.Log("= S.BaseDrawObject: ScaleEndPoints output: completed");
  }

  PolyLineScaleEndPoints(): void {
    T3Util.Log("= S.BaseDrawObject: PolyLineScaleEndPoints input:", {
      polylist: this.polylist,
      Frame: this.Frame,
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint
    });

    "use strict";

    const scaleX = this.Frame.width / this.polylist.dim.x;
    const scaleY = this.Frame.height / this.polylist.dim.y;
    const center = { x: this.Frame.x + this.Frame.width / 2, y: this.Frame.y + this.Frame.height / 2 };

    if (scaleX === 1 && scaleY === 1) {
      T3Util.Log("= S.BaseDrawObject: PolyLineScaleEndPoints output: no scaling required");
      return;
    }

    // Adjust StartPoint
    let deltaX = center.x - this.StartPoint.x;
    this.StartPoint.x = center.x - deltaX * scaleX;
    let deltaY = center.y - this.StartPoint.y;
    this.StartPoint.y = center.y - deltaY * scaleY;

    // Adjust EndPoint
    deltaX = center.x - this.EndPoint.x;
    this.EndPoint.x = center.x - deltaX * scaleX;
    deltaY = center.y - this.EndPoint.y;
    this.EndPoint.y = center.y - deltaY * scaleY;

    T3Util.Log("= S.BaseDrawObject: PolyLineScaleEndPoints output:", {
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint
    });
  }

  ChangeLineThickness(thickness: number): void {
    T3Util.Log("= S.BaseDrawObject: ChangeLineThickness input:", thickness);
    this.UpdateFrame(null);
    T3Util.Log("= S.BaseDrawObject: ChangeLineThickness output: thickness changed");
  }

  ChangeEffect(): void {
    T3Util.Log("= S.BaseDrawObject: ChangeEffect input: no parameters");
    this.UpdateFrame(null);
    T3Util.Log("= S.BaseDrawObject: ChangeEffect output: effect changed");
  }

  ChangeTextAttributes(
    fillColor: string,
    strokeColor: string,
    isBold: boolean,
    isItalic: boolean,
    paramI: any,
    paramN: any,
    paramO: any,
    paramS: any
  ): void {
    T3Util.Log("= S.BaseDrawObject: ChangeTextAttributes input:", {
      fillColor,
      strokeColor,
      isBold,
      isItalic,
      paramI,
      paramN,
      paramO,
      paramS,
    });

    // Only process if any of these parameters are provided
    if (fillColor || strokeColor || isBold || isItalic || paramS) {
      // if (this.GetTable(true)) {
      //   T3Gv.opt.Table_ChangeTextAttributes(
      //     this,
      //     fillColor,
      //     strokeColor,
      //     paramI,
      //     isItalic,
      //     paramN,
      //     null,
      //     false,
      //     paramO,
      //     paramS
      //   );
      // } else

      {
        T3Gv.opt.ChangeObjectTextAttributes(
          this.BlockID,
          fillColor,
          strokeColor,
          paramI,
          isItalic,
          paramN,
          paramO,
          paramS
        );
      }
    }

    T3Util.Log("= S.BaseDrawObject: ChangeTextAttributes output: text attributes changed");
  }

  SetObjectStyle(styleInput: any): any {
    T3Util.Log("= S.BaseDrawObject: SetObjectStyle input:", styleInput);

    const filteredStyle = T3Gv.opt.ApplyColorFilter(
      styleInput,
      this,
      this.StyleRecord,
      this.colorfilter
    );
    const initialThickness = this.StyleRecord.Line.Thickness;

    // if (this.GetTable(false)) {
    //   T3Gv.opt.Table_ApplyProperties(this, filteredStyle, styleInput, false);
    // } else

    if (
      filteredStyle.StyleRecord &&
      filteredStyle.StyleRecord.Fill &&
      filteredStyle.StyleRecord.Fill.Paint &&
      filteredStyle.StyleRecord.Fill.Paint.Color &&
      filteredStyle.StyleRecord.Name === undefined &&
      filteredStyle.StyleRecord.Fill.Paint.FillType === undefined
    ) {
      if (this.StyleRecord.Fill.Paint.FillType === NvConstant.FillTypes.Gradient) {
        if (
          this.StyleRecord.Fill.Paint.Color.toUpperCase() ===
          filteredStyle.StyleRecord.Fill.Paint.Color.toUpperCase()
        ) {
          filteredStyle.StyleRecord.Fill.Paint.FillType = NvConstant.FillTypes.Solid;
        }
      } else {
        filteredStyle.StyleRecord.Fill.Paint.FillType = NvConstant.FillTypes.Solid;
      }
    }

    T3Gv.opt.ApplyProperties(filteredStyle, this);

    if (filteredStyle.StyleRecord) {
      if (filteredStyle.StyleRecord.Line && filteredStyle.StyleRecord.Line.Thickness) {
        this.ChangeLineThickness(initialThickness);
      }
      if (filteredStyle.StyleRecord.OutsideEffect) {
        this.ChangeEffect();
      }
    }

    T3Util.Log("= S.BaseDrawObject: SetObjectStyle output:", filteredStyle);
    return filteredStyle;
  }

  /**
   * Gets the default text formatting settings for the drawing object
   * This combines the shape's text alignment settings with default paragraph formatting
   * and retrieves font information from the session block.
   *
   * @param paraFormat - The paragraph format object to be populated with default settings
   * @returns TextFmtData object containing default text formatting
   */
  GetTextDefault(paraFormat) {
    // Initialize paragraph format if provided
    if (paraFormat) {
      // Extend the input object with a new ParagraphFormat instance
      $.extend(true, paraFormat, new ParagraphFormat());

      // Set default paragraph properties
      paraFormat.bullet = 'none';
      paraFormat.spacing = 0;
      paraFormat.just = 'center';
      paraFormat.vjust = 'middle';

      // Process text alignment if available
      if (this.TextAlign) {
        const alignSeparatorIndex = this.TextAlign.indexOf('-');

        // If alignment contains both vertical and horizontal components
        if (alignSeparatorIndex >= 0) {
          paraFormat.vjust = this.TextAlign.slice(0, alignSeparatorIndex);
          paraFormat.just = this.TextAlign.slice(alignSeparatorIndex + 1, this.TextAlign.length);
        } else {
          // Only horizontal alignment specified
          paraFormat.just = this.TextAlign;
        }
      }
    }

    // Get the session block to retrieve font information
    const sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    // Create a deep copy of this object's text style record
    const textFormat = $.extend(true, {}, this.StyleRecord.Text);

    // Update font information from session block
    textFormat.FontId = -1;// T3Gv.opt.GetFontIdByName(sessionBlock.def.lf.fontName);
    textFormat.FontName = sessionBlock.def.lf.fontName;

    return textFormat;
  }

  // GetTextParams(e) {
  //   var t = {};
  //   return t.trect = this.trect,
  //     t.sizedim = this.sizedim,
  //     t.tsizedim = {},
  //     t.tsizedim.height = this.sizedim.height - (this.Frame.height - this.trect.height),
  //     t.tsizedim.width = this.sizedim.width - (this.Frame.width - this.trect.width),
  //     t
  // }

  GetListOfEnclosedObjects(enclosedItems: any): any[] {
    T3Util.Log("= S.BaseDrawObject: GetListOfEnclosedObjects input:", enclosedItems);
    const result: any[] = [];
    T3Util.Log("= S.BaseDrawObject: GetListOfEnclosedObjects output:", result);
    return result;
  }

  InterceptMoveOperation(event: any): boolean {
    T3Util.Log('= S.BaseDrawObject: InterceptMoveOperation input:', event);
    const result = false;
    T3Util.Log('= S.BaseDrawObject: InterceptMoveOperation output:', result);
    return result;
  }

  SetupInterceptMove(event: any): boolean {
    T3Util.Log("= S.BaseDrawObject: SetupInterceptMove input:", event);
    const result = false;
    T3Util.Log("= S.BaseDrawObject: SetupInterceptMove output:", result);
    return result;
  }

  IsSelected(): boolean {
    T3Util.Log("= S.BaseDrawObject: IsSelected input: none");

    const blockID = this.BlockID;
    const selectedList = T3Gv.opt.theSelectedListBlockID.Data;
    const isSelected = $.inArray(blockID, selectedList) >= 0;

    T3Util.Log("= S.BaseDrawObject: IsSelected output:", isSelected);
    return isSelected;
  }

  RemoveDimensionLines(svgDoc: any): void {
    T3Util.Log('= S.BaseDrawObject: RemoveDimensionLines input:', svgDoc);

    if (svgDoc != null) {
      const elementClasses = [
        OptConstant.SVGElementClass.DimLine,
        OptConstant.SVGElementClass.DimText,
        OptConstant.SVGElementClass.AreaDimLine,
        OptConstant.SVGElementClass.DimTextNoEdit
      ];

      for (let i = 0; i < elementClasses.length; i++) {
        const elements = svgDoc.GetElementListWithId(elementClasses[i]);
        for (let j = 0; j < elements.length; j++) {
          svgDoc.RemoveElement(elements[j]);
        }
      }
    }

    T3Util.Log('= S.BaseDrawObject: RemoveDimensionLines output: completed');
  }

  // Remove coordinate lines when adjusting the line
  RemoveCoordinateLines(svgDoc: any): void {
    T3Util.Log('= S.BaseDrawObject: RemoveCoordinateLines input:', svgDoc);

    if (svgDoc != null) {
      const elementClasses = [
        OptConstant.SVGElementClass.CoordinateLine,
      ];

      for (let i = 0; i < elementClasses.length; i++) {
        const elements = svgDoc.GetElementListWithId(elementClasses[i]);
        for (let j = 0; j < elements.length; j++) {
          svgDoc.RemoveElement(elements[j]);
        }
      }
    }

    T3Util.Log('= S.BaseDrawObject: RemoveCoordinateLines output: completed');
  }

  SetDimensionLinesVisibility(svgDoc: any, isVisible: boolean) {
    T3Util.Log('= S.BaseDrawObject: SetDimensionLinesVisibility input:', { svgDoc, isVisible });

    function setVisibility(svgDoc: any, elementClass: string, isVisible: boolean) {
      const elements = svgDoc.GetElementListWithId(elementClass);
      for (let i = 0; i < elements.length; i++) {
        elements[i].SetVisible(isVisible);
      }
    }

    const shouldSetVisibility = this.Dimensions === NvConstant.DimensionFlags.Always || this.Dimensions === NvConstant.DimensionFlags.Select;

    if (svgDoc && shouldSetVisibility) {
      setVisibility(svgDoc, OptConstant.SVGElementClass.DimLine, isVisible);
      setVisibility(svgDoc, OptConstant.SVGElementClass.DimText, isVisible);
      setVisibility(svgDoc, OptConstant.SVGElementClass.DimTextNoEdit, isVisible);
    }

    T3Util.Log('= S.BaseDrawObject: SetDimensionLinesVisibility output: visibility set to', isVisible);
  }

  NeedsAddLineThicknessToDimension(dimension: any): boolean {
    T3Util.Log("= S.BaseDrawObject: NeedsAddLineThicknessToDimension input:", dimension);

    // Currently, the function always returns false.
    const result = false;

    T3Util.Log("= S.BaseDrawObject: NeedsAddLineThicknessToDimension output:", result);
    return result;
  }

  GetLengthInRulerUnits(length: number, offset?: number): string {
    T3Util.Log("= S.BaseDrawObject: GetLengthInRulerUnits input:", { length, offset });

    const sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    let result = '';
    let feet = 0;
    let inches = 0;
    let fractionalInches = 0;
    let numerator = 0;
    let denominator = 0;
    let fraction = '';
    let sign = 1;
    const decimalPlaces = Math.pow(10, T3Gv.docUtil.rulerConfig.dp);

    if (offset) {
      offset *= 100;
      if (!T3Gv.docUtil.rulerConfig.useInches) {
        offset /= OptConstant.Common.MetricConv;
      }
      length -= offset;
    }

    if (T3Gv.docUtil.rulerConfig.showpixels) {
      result = Math.round(length).toString();
      T3Util.Log("= S.BaseDrawObject: GetLengthInRulerUnits output:", result);
      return result;
    }

    if (T3Gv.docUtil.rulerConfig.useInches && T3Gv.docUtil.rulerConfig.units === NvConstant.RulerUnit.Feet) {
      let totalInches = this.GetLengthInUnits(length, true);
      if (totalInches < 0) {
        sign = -1;
        totalInches = -totalInches;
      }
      feet = Math.floor(totalInches / 12);
      inches = Math.floor(totalInches % 12);
      fractionalInches = totalInches - (feet * 12 + inches);

      if (this.Dimensions & NvConstant.DimensionFlags.ShowFeetAsInches) {
        inches += feet * 12;
        feet = 0;
      }

      if (fractionalInches > 0) {
        denominator = this.GetFractionStringGranularity(sessionBlock);
        numerator = Math.round(fractionalInches / denominator);
        if (numerator >= 1 / denominator) {
          numerator = 0;
          if (++inches === 12) {
            inches = 0;
            feet++;
          }
        }
        if (numerator > 0) {
          while (numerator % 2 === 0) {
            numerator /= 2;
            denominator *= 2;
          }
          fraction = `${numerator}/${Math.floor(1 / denominator)}`;
        }
      }

      if (feet !== 0) {
        result = `${feet * sign}'`;
      }
      if (inches > 0 || fraction.length === 0) {
        result += `${feet !== 0 ? ' ' : ''}${inches}`;
      }
      if (fraction.length > 0) {
        result += `${feet !== 0 || inches !== 0 ? ' ' : ''}${fraction}`;
      }
      result += '"';
    } else if (T3Gv.docUtil.rulerConfig.units === NvConstant.RulerUnit.Inches) {
      const inches = this.GetLengthInUnits(length);
      result = (Math.round(inches * decimalPlaces) / decimalPlaces).toString();
    } else {
      const units = this.GetLengthInUnits(length);
      if (T3Gv.docUtil.rulerConfig.units === NvConstant.RulerUnit.M || T3Gv.docUtil.rulerConfig.units === NvConstant.RulerUnit.Cm) {
        result = (Math.round(units * decimalPlaces) / decimalPlaces).toString();
      } else if (T3Gv.docUtil.rulerConfig.units === NvConstant.RulerUnit.Mm) {
        result = Math.round(units).toString();
      }
    }

    T3Util.Log("= S.BaseDrawObject: GetLengthInRulerUnits output:", result);
    return result;
  }

  GetDimensionTextForPoints(startPoint: Point, endPoint: Point): string {
    T3Util.Log("= S.BaseDrawObject: GetDimensionTextForPoints input:", { startPoint, endPoint });

    // Calculate the angle between the start and end points
    const startAngle = 360 - Utils1.CalcAngleFromPoints(startPoint, endPoint);
    const radians = 2 * Math.PI * (startAngle / 360);

    // Create a copy of the points and rotate them around the center of the frame
    const points = [new Point(startPoint.x, startPoint.y), new Point(endPoint.x, endPoint.y)];
    Utils3.RotatePointsAboutCenter(this.Frame, -radians, points);

    // Calculate the distance between the rotated points
    const distance = Math.abs(points[0].x - points[1].x);

    // Convert the distance to ruler units
    const result = RulerUtil.GetLengthInRulerUnits(distance);
    T3Util.Log("= S.BaseDrawObject: GetDimensionTextForPoints output:", result);
    return result;
  }

  UpdateDimensionFromTextObj(textObject: any): void {
    T3Util.Log("= S.BaseDrawObject: UpdateDimensionFromTextObj input:", textObject);

    if (textObject && textObject.userData) {
      const { segment, hookedObjectInfo } = textObject.userData;
      const text = textObject.GetText();

      if (hookedObjectInfo) {
        this.UpdateDimensionsFromTextForHookedObject(textObject, text, hookedObjectInfo);
      } else if (segment && segment.angleChange) {
        this.UpdateLineAngleDimensionFromText(textObject, text, segment);
      } else {
        this.UpdateDimensionFromText(textObject, text, segment);
      }
    }

    T3Util.Log("= S.BaseDrawObject: UpdateDimensionFromTextObj output: completed");
  }

  UpdateDimensionFromText(textObject: any, text: string, segment: any): void {
    T3Util.Log("= S.BaseDrawObject: UpdateDimensionFromText input:", { textObject, text, segment });

    // TODO: Implement the logic to update dimensions from text.
    // This is a placeholder for the actual implementation.

    T3Util.Log("= S.BaseDrawObject: UpdateDimensionFromText output: completed");
  }

  MaintainProportions(width: number, height: number): { width: number; height: number } | null {
    T3Util.Log("= S.BaseDrawObject: MaintainProportions input:", { width, height });

    // Placeholder logic for maintaining proportions
    const result = null;

    T3Util.Log("= S.BaseDrawObject: MaintainProportions output:", result);
    return result;
  }

  CanUseRFlags(): boolean {
    T3Util.Log("= S.BaseDrawObject: CanUseRFlags input: none");
    const result = true;
    T3Util.Log("= S.BaseDrawObject: CanUseRFlags output:", result);
    return result;
  }

  UpdateDimensionsFromTextForHookedObject(textObject: any, text: string, hookedObjectInfo: any): void {
    T3Util.Log("= S.BaseDrawObject: UpdateDimensionsFromTextForHookedObject input:", { textObject, text, hookedObjectInfo });

    const segmentIndex = hookedObjectInfo.segment;
    SvgUtil.ShowSVGSelectionState(this.BlockID, false);

    const dimensionLength = this.GetDimensionLengthFromString(text, segmentIndex);
    if (dimensionLength <= 0) {
      DataUtil.AddToDirtyList(this.BlockID);
      SvgUtil.RenderDirtySVGObjects();
      return;
    }

    const hookedObject = DataUtil.GetObjectPtr(hookedObjectInfo.hookedObjectID, true);
    if (!hookedObject) {
      T3Util.Log("= S.BaseDrawObject: UpdateDimensionsFromTextForHookedObject output: hooked object not found");
      return;
    }

    const hookConnection = hookedObject.hooks[0].connect;
    const perimeterPoints = this.GetPerimPts(this.BlockID, [hookConnection], hookedObject.hooks[0].hookpt, false, -1, hookedObject.BlockID);

    const startPoint = new Point(hookedObjectInfo.start.x, hookedObjectInfo.start.y);
    const endPoint = new Point(hookedObjectInfo.end.x, hookedObjectInfo.end.y);
    const dimensionPoints = [startPoint, endPoint];

    const angle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(startPoint, endPoint);
    Utils3.RotatePointsAboutCenter(this.Frame, -angle, dimensionPoints);

    let offset = dimensionLength - Math.abs(dimensionPoints[1].x - dimensionPoints[0].x);
    if (hookedObjectInfo.side === 1) {
      offset = -offset;
    }

    const framePoints = this.GetDimensionPoints();
    for (let i = 0; i < framePoints.length; i++) {
      framePoints[i].x += this.inside.x;
      framePoints[i].y += this.inside.y;
    }

    const updatedPoints = [framePoints[segmentIndex - 1], framePoints[segmentIndex], perimeterPoints[0]];
    Utils3.RotatePointsAboutCenter(this.Frame, -angle, updatedPoints);

    if (offset > 0 && updatedPoints[2].x + offset - hookedObject.Frame.width / 2 > updatedPoints[1].x) {
      updatedPoints[2].x = updatedPoints[1].x - hookedObject.Frame.width / 2 - 5;
    } else if (offset < 0 && updatedPoints[2].x + offset - hookedObject.Frame.width / 2 < updatedPoints[0].x) {
      updatedPoints[2].x = updatedPoints[0].x + hookedObject.Frame.width / 2 + 5;
    } else {
      updatedPoints[2].x += offset;
    }

    Utils3.RotatePointsAboutCenter(this.Frame, angle, updatedPoints);

    const frameCopy = Utils1.DeepCopy(this.Frame);
    Utils2.InflateRect(frameCopy, 3, 3);
    const isPointInRect = Utils2.pointInRect(frameCopy, perimeterPoints[0]);

    const targetPoints = this.GetTargetPoints(
      perimeterPoints[0],
      NvConstant.HookFlags.LcNoSnaps | NvConstant.HookFlags.LcHookNoExtra | NvConstant.HookFlags.LcShapeOnLine,
      null
    );

    if (targetPoints && isPointInRect) {
      HookUtil.UpdateHook(hookedObject.BlockID, 0, this.BlockID, hookedObject.hooks[0].hookpt, targetPoints[0]);
      OptCMUtil.SetLinkFlag(hookedObject.BlockID, DSConstant.LinkFlags.SED_L_MOVE);
      OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.SED_L_MOVE);
      T3Gv.opt.UpdateLinks();
      HookUtil.UpdateHook(hookedObject.BlockID, 0, this.BlockID, hookedObject.hooks[0].hookpt, targetPoints[0]);
    } else {
      setTimeout(() => {
        // Warning user could find the dimension text
      }, 250);
    }

    T3Util.Log("= S.BaseDrawObject: UpdateDimensionsFromTextForHookedObject output: completed");
  }

  UpdateDimensions(inputElement: any, triggerType: any, additionalInfo: any): void {
    T3Util.Log("= S.BaseDrawObject: UpdateDimensions input:", { inputElement, triggerType, additionalInfo });

    // TODO: Implement the logic to update dimensions here.
    // This is a placeholder for the actual implementation.

    T3Util.Log("= S.BaseDrawObject: UpdateDimensions output: completed");
  }

  GetDimensions(): { width: number; height: number } {
    T3Util.Log("= S.BaseDrawObject: GetDimensions input: none");

    const dimensions = {
      width: this.Frame.width,
      height: this.Frame.height
    };

    T3Util.Log("= S.BaseDrawObject: GetDimensions output:", dimensions);
    return dimensions;
  }

  GetDimensionsForDisplay(): { x: number; y: number; width: number; height: number } {
    T3Util.Log("= S.BaseDrawObject: GetDimensionsForDisplay input: none");

    const dimensions = {
      x: this.Frame.x,
      y: this.Frame.y,
      width: this.Frame.width,
      height: this.Frame.height
    };

    T3Util.Log("= S.BaseDrawObject: GetDimensionsForDisplay output:", dimensions);
    return dimensions;
  }

  CreateDimension(container, pathCreator, isAreaDimension, angle, text, startPoint, endPoint, segmentIndex, isPolygon, isStandoff, hookedObjectInfo?) {

    let textShape, textFramePoints = [], leftArrowPoints = [], rightArrowPoints = [], topArrowPoints = [], bottomArrowPoints = [];
    let boundingBox = new Rectangle(), textFrameRect = new Rectangle(), dimensionBounds = { left: -1, top: -1, right: -1, bottom: -1 };
    let isLocked = this.flags & NvConstant.ObjFlags.Lock;
    let rotationAngle = this.RotationAngle + angle;
    let textFrameData = { segment: segmentIndex, hookedObjectInfo: null, textFramePts: [] };

    if (hookedObjectInfo) {
      textFrameData.hookedObjectInfo = hookedObjectInfo;
    }

    if (container) {
      textShape = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Text);
      container.AddElement(textShape);
      textShape.SetRenderingEnabled(false);
      textShape.SetText(text);
      if (Utils2.HasFlag(this.Dimensions, NvConstant.DimensionFlags.Select)) {
        textShape.ExcludeFromExport(true);
      }
      textShape.SetUserData(textFrameData);

      if (this.LineType !== OptConstant.LineType.LINE && (isAreaDimension || this.Dimensions & NvConstant.DimensionFlags.Total || this.Dimensions & NvConstant.DimensionFlags.EndPts || this.NoGrow())) {
        textShape.SetID(OptConstant.SVGElementClass.DimTextNoEdit);
      } else {
        textShape.SetID(OptConstant.SVGElementClass.DimText);
        textShape.SetEditCallback(this.DimensionEditCallback, this);
      }

      textShape.SetFormat(T3Gv.opt.contentHeader.DimensionFontStyle);
      textShape.SetConstraints(T3Gv.opt.contentHeader.MaxWorkDim.x, 0, 0);
      textShape.SetRenderingEnabled(true);

      if (isAreaDimension) {
        this.GetDimensionAreaTextInfo(textShape, angle, textFramePoints, leftArrowPoints, rightArrowPoints, topArrowPoints, bottomArrowPoints);
        if (textFramePoints.length > 0 && (Utils2.GetPolyRect(textFrameRect, textFramePoints), textFrameRect.width >= this.Frame.width)) {
          container.RemoveElement(textShape);
          return;
        }
        textFrameData.textFramePts = textFramePoints;
        this.CreateDimensionLineArrowHead(container, pathCreator, leftArrowPoints, dimensionBounds);
        this.CreateDimensionLineArrowHead(container, pathCreator, rightArrowPoints, dimensionBounds);
        this.CreateDimensionLineArrowHead(container, pathCreator, topArrowPoints, dimensionBounds);
        this.CreateDimensionLineArrowHead(container, pathCreator, bottomArrowPoints, dimensionBounds);
      } else {
        this.GetDimensionTextInfo(startPoint, endPoint, angle, textShape, segmentIndex, textFramePoints, leftArrowPoints, rightArrowPoints, isStandoff);
        textFrameData.textFramePts = Utils1.DeepCopy(textFramePoints);
        if (isPolygon && (Utils2.sqrt((endPoint.x - startPoint.x) ** 2 + (endPoint.y - startPoint.y) ** 2) < textShape.geometryBBox.width)) {
          container.RemoveElement(textShape);
          return;
        }
        if (this.Dimensions & NvConstant.DimensionFlags.Standoff && this.CanUseStandOffDimensionLines() && !isStandoff) {
          this.CreateDimensionLineSegment(pathCreator, isAreaDimension, leftArrowPoints, dimensionBounds);
          this.CreateDimensionLineSegment(pathCreator, isAreaDimension, rightArrowPoints, dimensionBounds);
        } else {
          this.CreateDimensionLineArrowHead(container, pathCreator, leftArrowPoints, dimensionBounds, textFrameData);
          this.CreateDimensionLineArrowHead(container, pathCreator, rightArrowPoints, dimensionBounds, textFrameData);
        }
      }

      if (rotationAngle >= 360) {
        rotationAngle -= 360;
      }

      let textPosition = [new Point(textFramePoints[0].x, textFramePoints[0].y)];
      if (rotationAngle >= 89 && rotationAngle < 270) {
        let reverseAngle = 360 - angle;
        let reverseRadians = 2 * Math.PI * (reverseAngle / 360);
        Utils3.RotatePointsAboutCenter(this.Frame, -reverseRadians, textFramePoints);
        textFrameRect = { x: 0, y: 0, width: 0, height: 0 };
        Utils2.GetPolyRect(textFrameRect, textFramePoints);
        let oppositeCorner = { x: textFrameRect.x + textFrameRect.width, y: textFrameRect.y + textFrameRect.height };
        textPosition = [new Point(oppositeCorner.x, oppositeCorner.y)];
        Utils3.RotatePointsAboutCenter(this.Frame, reverseRadians, textPosition);
        if ((angle += 180) > 360) {
          angle -= 360;
        }
      }

      textShape.SetPos(textPosition[0].x, textPosition[0].y);
      try {
        textShape.SetRotation(angle, textPosition[0].x, textPosition[0].y);
      } catch (error) {
        throw error;
      }

      if (!isAreaDimension && !isLocked && !this.NoGrow()) {
        let hammerInstance = Hammer(textShape.svgObj.SDGObj.DOMElement());
        hammerInstance.on('tap', EvtUtil.Evt_DimensionTextTapFactory(this, textFrameData, false));
        hammerInstance.on('doubletap', EvtUtil.Evt_DimensionTextTapFactory(this, textFrameData, true));
        textShape.SetEventProxy(hammerInstance);
      }
    }
  }

  CreateCoordinateLine(container, pathCreator, isAreaDimension, angle, text, startPoint, endPoint, segmentIndex, isPolygon, isStandoff, hookedObjectInfo?) {

    let textShape, textFramePoints = [], leftArrowPoints = [], rightArrowPoints = [], topArrowPoints = [], bottomArrowPoints = [];
    let boundingBox = new Rectangle(), textFrameRect = new Rectangle(), dimensionBounds = { left: -1, top: -1, right: -1, bottom: -1 };
    let isLocked = this.flags & NvConstant.ObjFlags.Lock;
    let rotationAngle = this.RotationAngle + angle;
    let textFrameData = { segment: segmentIndex, hookedObjectInfo: null, textFramePts: [] };

    if (hookedObjectInfo) {
      textFrameData.hookedObjectInfo = hookedObjectInfo;
    }

    if (!container) {
      return;
    }

    textShape = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Text);
    container.AddElement(textShape);
    textShape.SetRenderingEnabled(false);
    textShape.SetText(angle);

    const hasSelectFlag = Utils2.HasFlag(this.Dimensions, NvConstant.DimensionFlags.Select);

    if (hasSelectFlag) {
      textShape.ExcludeFromExport(true);
    }

    textShape.SetUserData(textFrameData);

    const isNotLine = this.LineType !== OptConstant.LineType.LINE;
    const isTotalEndPtsFlag = this.Dimensions & NvConstant.DimensionFlags.Total || this.Dimensions & NvConstant.DimensionFlags.EndPts;

    if (isNotLine && (isAreaDimension || isTotalEndPtsFlag || this.NoGrow())) {
      textShape.SetID(OptConstant.SVGElementClass.DimTextNoEdit);
    } else {
      textShape.SetID(OptConstant.SVGElementClass.DimText);
      textShape.SetEditCallback(this.DimensionEditCallback, this);
    }

    textShape.SetFormat(T3Gv.opt.contentHeader.DimensionFontStyle);
    textShape.SetConstraints(T3Gv.opt.contentHeader.MaxWorkDim.x, 0, 0);
    textShape.SetRenderingEnabled(true);

    if (isAreaDimension) {

      this.GetDimensionAreaTextInfo(textShape, angle, textFramePoints, leftArrowPoints, rightArrowPoints, topArrowPoints, bottomArrowPoints);

      if (textFramePoints.length > 0 && (Utils2.GetPolyRect(textFrameRect, textFramePoints), textFrameRect.width >= this.Frame.width)) {
        container.RemoveElement(textShape);
        return;
      }

      textFrameData.textFramePts = textFramePoints;
      this.CreateDimensionLineArrowHead(container, pathCreator, leftArrowPoints, dimensionBounds);
      this.CreateDimensionLineArrowHead(container, pathCreator, rightArrowPoints, dimensionBounds);
      this.CreateDimensionLineArrowHead(container, pathCreator, topArrowPoints, dimensionBounds);
      this.CreateDimensionLineArrowHead(container, pathCreator, bottomArrowPoints, dimensionBounds);
    }
    else {

      this.GetCoordinateTextInfo(startPoint, endPoint, angle, textShape, segmentIndex, textFramePoints, leftArrowPoints, rightArrowPoints, isStandoff);
      textFrameData.textFramePts = Utils1.DeepCopy(textFramePoints);
      const check2 = (Utils2.sqrt((endPoint.x - startPoint.x) ** 2 + (endPoint.y - startPoint.y) ** 2) < textShape.geometryBBox.width);

      if (isPolygon && check2) {
        container.RemoveElement(textShape);
        return;
      }

      const isStdOff = this.Dimensions & NvConstant.DimensionFlags.Standoff;
      const check3 = isStdOff && this.CanUseStandOffDimensionLines() && !isStandoff;

      if (check3) {

        T3Util.Log('=== wall CreateCoordinateLine.leftArrowPoints=', leftArrowPoints);
        T3Util.Log('=== wall CreateCoordinateLine.rightArrowPoints=', rightArrowPoints);

        this.CreateCoordinateLineSegment(pathCreator, isAreaDimension, leftArrowPoints, dimensionBounds);
        this.CreateCoordinateLineSegment(pathCreator, isAreaDimension, rightArrowPoints, dimensionBounds);

      } else {
        this.CreateDimensionLineArrowHead(container, pathCreator, leftArrowPoints, dimensionBounds, textFrameData);
        this.CreateDimensionLineArrowHead(container, pathCreator, rightArrowPoints, dimensionBounds, textFrameData);
      }
    }

    if (rotationAngle >= 360) {
      rotationAngle -= 360;
    }

    let textPosition = [new Point(textFramePoints[0].x, textFramePoints[0].y)];

    if (rotationAngle >= 89 && rotationAngle < 270) {
      let reverseAngle = 360 - angle;
      let reverseRadians = 2 * Math.PI * (reverseAngle / 360);
      Utils3.RotatePointsAboutCenter(this.Frame, -reverseRadians, textFramePoints);

      textFrameRect = { x: 0, y: 0, width: 0, height: 0 };
      Utils2.GetPolyRect(textFrameRect, textFramePoints);

      let oppositeCorner = { x: textFrameRect.x + textFrameRect.width, y: textFrameRect.y + textFrameRect.height };

      textPosition = [new Point(oppositeCorner.x, oppositeCorner.y)];

      Utils3.RotatePointsAboutCenter(this.Frame, reverseRadians, textPosition);

      if ((angle += 180) > 360) {
        angle -= 360;
      }
    }

    textShape.SetPos(textPosition[0].x, textPosition[0].y);

    try {
      textShape.SetRotation(angle, textPosition[0].x, textPosition[0].y);
    } catch (error) {
      throw error;
    }

    if (!isAreaDimension && !isLocked && !this.NoGrow()) {
      let hammerInstance = Hammer(textShape.svgObj.SDGObj.DOMElement());
      hammerInstance.on('tap', EvtUtil.Evt_DimensionTextTapFactory(this, textFrameData, false));
      hammerInstance.on('doubletap', EvtUtil.Evt_DimensionTextTapFactory(this, textFrameData, true));
      textShape.SetEventProxy(hammerInstance);
    }
  }

  DrawDimensionAngle(container: any, pathCreator: any, segmentIndex: number, dimensionPoints: Point[]): void {
    T3Util.Log("= S.BaseDrawObject: DrawDimensionAngle input:", { container, pathCreator, segmentIndex, dimensionPoints });

    let dimensionInfo, textMinDimensions, distanceBetweenPoints;
    const angleChangeData = { angleChange: 1, segment: segmentIndex };

    dimensionInfo = this.GetDimensionAngleInfo(segmentIndex, dimensionPoints);
    if (dimensionInfo) {
      container.AddElement(dimensionInfo.text);
      dimensionInfo.text.SetRenderingEnabled(false);
      dimensionInfo.text.SetUserData(angleChangeData);
      dimensionInfo.text.SetID(OptConstant.SVGElementClass.DimText);
      dimensionInfo.text.SetEditCallback(this.DimensionEditCallback, this);
      dimensionInfo.text.SetConstraints(T3Gv.opt.contentHeader.MaxWorkDim.x, 0, 0);
      dimensionInfo.text.SetRenderingEnabled(true);
      dimensionInfo.text.SetPos(dimensionInfo.textRect.x, dimensionInfo.textRect.y);

      if (this.RotationAngle !== 0) {
        dimensionInfo.text.SetRotation(-this.RotationAngle);
      }

      distanceBetweenPoints = Utils2.GetDistanceBetween2Points(dimensionInfo.baseLinePts[1], dimensionInfo.targetLinePts[1]);
      textMinDimensions = dimensionInfo.text.GetTextMinDimensions();

      if (distanceBetweenPoints > textMinDimensions.width) {
        const textElement = dimensionInfo.text.svgObj.SDGObj.DOMElement();
        const hammerInstance = Hammer(textElement);
        hammerInstance.on('tap', EvtUtil.Evt_DimensionTextTapFactory(this, angleChangeData, false));
        hammerInstance.on('doubletap', EvtUtil.Evt_DimensionTextTapFactory(this, angleChangeData, true));
        dimensionInfo.text.SetEventProxy(hammerInstance);
      } else {
        container.RemoveElement(dimensionInfo.text);
      }

      if (distanceBetweenPoints > textMinDimensions.width + 2 * OptConstant.LineAngleDimensionDefs.ArrowHeadSize) {
        Utils2.InflateRect(dimensionInfo.textRect, 2, 2);
        this.DrawDimensionAngleArc(container, pathCreator, dimensionInfo.targetLinePts[0], dimensionInfo.targetLinePts[1], dimensionInfo.textRect, dimensionInfo.baseLinePts[1]);
        this.DrawDimensionAngleArc(container, pathCreator, dimensionInfo.targetLinePts[0], dimensionInfo.targetLinePts[1], dimensionInfo.textRect, dimensionInfo.targetLinePts[1]);
      }

      if (!(this.Dimensions & NvConstant.DimensionFlags.InteriorAngles)) {
        pathCreator.MoveTo(dimensionInfo.baseLinePts[0].x, dimensionInfo.baseLinePts[0].y);
        pathCreator.LineTo(dimensionInfo.baseLinePts[1].x, dimensionInfo.baseLinePts[1].y);
      }
    }

    T3Util.Log("= S.BaseDrawObject: DrawDimensionAngle output: completed");
  }

  UpdateLineAngleDimensionFromText(textObject: any, text: string, segment: any): void {
    T3Util.Log("= S.BaseDrawObject: UpdateLineAngleDimensionFromText input:", { textObject, text, segment });

    let angle = parseFloat(text);

    if (isNaN(angle) || angle < -360 || angle > 360) {
      this.UpdateDimensionLines(textObject);
    } else {
      if (angle < 0) {
        angle += 360;
      }
      this.SetSegmentAngle(textObject, segment.segment, angle);
    }

    T3Util.Log("= S.BaseDrawObject: UpdateLineAngleDimensionFromText output: completed");
  }

  SetSegmentAngle(segment: any, angle: number, additionalData: any): void {
    T3Util.Log("= S.BaseDrawObject: SetSegmentAngle input:", { segment, angle, additionalData });

    // TODO: Implement the logic to set the segment angle here.
    // This is a placeholder for the actual implementation.

    T3Util.Log("= S.BaseDrawObject: SetSegmentAngle output: completed");
  }

  DrawDimensionAngleArrowhead(container: any, angle: number, point: Point): void {
    T3Util.Log("= S.BaseDrawObject: DrawDimensionAngleArrowhead input:", { container, angle, point });

    const arrowheadPoints: Point[] = [];
    const boundingRect: Rectangle = new Rectangle();

    // Define the arrowhead points relative to the given point
    arrowheadPoints.push(new Point(point.x, point.y));
    arrowheadPoints.push(
      new Point(
        point.x - OptConstant.LineAngleDimensionDefs.ArrowHeadSize,
        point.y + OptConstant.LineAngleDimensionDefs.ArrowHeadWidth
      )
    );
    arrowheadPoints.push(
      new Point(
        point.x - OptConstant.LineAngleDimensionDefs.ArrowHeadSize,
        point.y - OptConstant.LineAngleDimensionDefs.ArrowHeadWidth
      )
    );

    // Rotate the arrowhead points around the given point by the specified angle
    Utils3.RotatePointsAboutPoint(point, angle, arrowheadPoints);

    // Calculate the bounding rectangle for the arrowhead points
    Utils2.GetPolyRect(boundingRect, arrowheadPoints);

    // Create the arrowhead shape and set its properties
    const arrowheadShape = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Polygon);
    arrowheadShape.SetPoints(arrowheadPoints);
    arrowheadShape.SetEventBehavior(OptConstant.EventBehavior.All);
    arrowheadShape.SetID(OptConstant.SVGElementClass.DimLine);
    arrowheadShape.SetPos(0, 0);
    arrowheadShape.SetSize(boundingRect.width, boundingRect.height);
    arrowheadShape.SetFillColor(OptConstant.Common.DimLineColor);

    // Add the arrowhead shape to the container
    container.AddElement(arrowheadShape);

    T3Util.Log("= S.BaseDrawObject: DrawDimensionAngleArrowhead output: arrowhead drawn");
  }

  GetPerpendicularAngle(point1: Point, point2: Point, isClockwise: boolean): number {
    T3Util.Log("= S.BaseDrawObject: GetPerpendicularAngle input:", { point1, point2, isClockwise });

    let angle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(point1, point2);
    angle += isClockwise ? Math.PI / 2 : -Math.PI / 2;

    if (angle < 0) {
      angle += 2 * Math.PI;
    }

    if (angle > 2 * Math.PI) {
      angle -= 2 * Math.PI;
    }

    T3Util.Log("= S.BaseDrawObject: GetPerpendicularAngle output:", angle);
    return angle;
  }

  DrawDimensionAngleArc(
    container: any,
    pathCreator: any,
    startPoint: Point,
    endPoint: Point,
    textRect: Rectangle,
    centerPoint: Point
  ): void {
    T3Util.Log("= S.BaseDrawObject: DrawDimensionAngleArc input:", {
      container,
      pathCreator,
      startPoint,
      endPoint,
      textRect,
      centerPoint
    });

    let distance = Utils2.GetDistanceBetween2Points(startPoint, endPoint);
    let arcCenter = {
      x: textRect.x + textRect.width / 2,
      y: textRect.y + textRect.height / 2
    };
    let startAngle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(startPoint, arcCenter);
    let endAngle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(startPoint, centerPoint);

    if (startAngle > Math.PI && endAngle === 0) {
      endAngle = 2 * Math.PI;
    }

    endAngle -= startAngle;
    if (endAngle < 0) {
      endAngle += 2 * Math.PI;
    }

    let isClockwise = endAngle <= Math.PI;
    let perpendicularAngle = this.GetPerpendicularAngle(startPoint, centerPoint, isClockwise);
    let rotatedCenterPoint = Utils3.RotatePointAboutPoint(startPoint, -perpendicularAngle, centerPoint);
    let lineThickness = this.StyleRecord.Line.Thickness / 2;
    rotatedCenterPoint.x -= lineThickness;
    rotatedCenterPoint = Utils3.RotatePointAboutPoint(startPoint, perpendicularAngle, rotatedCenterPoint);

    let arcStartPoint = isClockwise ? rotatedCenterPoint : arcCenter;
    let arcEndPoint = isClockwise ? arcCenter : rotatedCenterPoint;
    let arcStartAngle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(startPoint, arcStartPoint);

    let arcPoints = T3Gv.opt.ArcToPoly(
      OptConstant.Common.MaxPolyPoints,
      startPoint,
      distance,
      arcStartPoint.y,
      arcEndPoint.y,
      startPoint.x,
      false
    );

    arcPoints = Utils3.RotatePointsAboutPoint(startPoint, -(Math.PI / 2 - arcStartAngle), arcPoints);

    for (let i = 1; i < arcPoints.length; i++) {
      pathCreator.MoveTo(arcPoints[i - 1].x, arcPoints[i - 1].y);
      pathCreator.LineTo(arcPoints[i].x, arcPoints[i].y);
    }

    let arrowheadPoint = isClockwise ? arcPoints[0] : arcPoints[arcPoints.length - 1];
    for (let i = 0; i < arcPoints.length; i++) {
      let index = isClockwise ? i : arcPoints.length - 1 - i;
      if (Utils2.GetDistanceBetween2Points(arrowheadPoint, arcPoints[index]) > OptConstant.LineAngleDimensionDefs.ArrowHeadSize) {
        arrowheadPoint = arcPoints[index];
        break;
      }
    }

    let arrowheadAngle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(arrowheadPoint, arcPoints[0]);
    this.DrawDimensionAngleArrowhead(container, arrowheadAngle, arcPoints[0]);

    T3Util.Log("= S.BaseDrawObject: DrawDimensionAngleArc output: completed");
  }

  GetDimensionAngleInfo(segmentIndex: number, points: Point[]): any {
    T3Util.Log("= S.BaseDrawObject: GetDimensionAngleInfo input:", { segmentIndex, points });

    let angle, baseAngle, bisectorAngle, minDistance, preferredBisectorLength, textDimensions;
    let isInteriorAngle = false;
    let text = '';
    let textShape = null;
    let textRect = new Rectangle(0, 0, 0, 0);
    let baseLinePoints: Point[] = [];
    let targetLinePoints: Point[] = [];
    let bisectorPoints: Point[] = [];
    let distance = 0;
    let halfAngle = 0;
    let angleInDegrees = 0;
    let isClockwise = false;

    // Initialize points for the segment
    targetLinePoints.push(new Point(points[segmentIndex - 1].x, points[segmentIndex - 1].y));
    targetLinePoints.push(new Point(points[segmentIndex].x, points[segmentIndex].y));

    // Check if the shape is closed
    const isClosedShape = this.polylist ? this.polylist.closed : points.length > 2 && points[0].x === points[points.length - 1].x && points[0].y === points[points.length - 1].y;

    // Skip if it's an interior angle and the first segment of an open shape
    if (this.Dimensions & NvConstant.DimensionFlags.InteriorAngles && segmentIndex === 1 && !isClosedShape) {
      return null;
    }

    // Skip if the segment is not a line
    if (this.polylist && segmentIndex >= 1 && segmentIndex < this.polylist.segs.length) {
      const prevSegmentIndex = segmentIndex > 1 ? segmentIndex - 1 : this.polylist.segs.length - 1;
      if (this.polylist.segs[segmentIndex].LineType !== OptConstant.LineType.LINE || this.polylist.segs[prevSegmentIndex].LineType !== OptConstant.LineType.LINE) {
        return null;
      }
    }

    // Initialize base line points
    baseLinePoints.push(new Point(targetLinePoints[0].x, targetLinePoints[0].y));
    if (this.Dimensions & NvConstant.DimensionFlags.InteriorAngles) {
      if (segmentIndex === 1) {
        baseLinePoints.push(new Point(points[points.length - 2].x, points[points.length - 2].y));
      } else {
        baseLinePoints.push(new Point(points[segmentIndex - 2].x, points[segmentIndex - 2].y));
      }
    } else {
      distance = Utils2.GetDistanceBetween2Points(targetLinePoints[0], targetLinePoints[1]);
      baseLinePoints.push(new Point(baseLinePoints[0].x + distance, baseLinePoints[0].y));
    }

    // Calculate angles
    angle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(targetLinePoints[0], targetLinePoints[1]);
    baseAngle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(baseLinePoints[0], baseLinePoints[1]);
    angle -= baseAngle;
    if (angle < 0) {
      angle += 2 * Math.PI;
    }
    halfAngle = angle / 2;
    if (angle > Math.PI) {
      angle = 2 * Math.PI - angle;
      halfAngle += Math.PI;
      if (halfAngle >= 2 * Math.PI) {
        halfAngle -= 2 * Math.PI;
      }
      isClockwise = true;
    }
    angle += baseAngle;
    if (angle >= 2 * Math.PI) {
      angle -= 2 * Math.PI;
    }
    halfAngle += baseAngle;
    if (halfAngle >= 2 * Math.PI) {
      halfAngle -= 2 * Math.PI;
    }

    // Initialize bisector points
    bisectorPoints.push(new Point(targetLinePoints[0].x, targetLinePoints[0].y));
    bisectorPoints.push(new Point(targetLinePoints[1].x, targetLinePoints[1].y));
    Utils3.RotatePointsAboutPoint(targetLinePoints[0], -angle, bisectorPoints);

    // Calculate preferred bisector length
    minDistance = Math.min(Utils2.GetDistanceBetween2Points(targetLinePoints[0], targetLinePoints[1]), Utils2.GetDistanceBetween2Points(baseLinePoints[0], baseLinePoints[1]));
    preferredBisectorLength = OptConstant.LineAngleDimensionDefs.PreferredBisectorLen < minDistance ? OptConstant.LineAngleDimensionDefs.PreferredBisectorLen : minDistance;
    bisectorPoints[1].x = bisectorPoints[0].x + preferredBisectorLength;
    Utils3.RotatePointsAboutPoint(targetLinePoints[0], halfAngle, bisectorPoints);

    // Calculate angle in degrees
    angleInDegrees = Math.abs(angle / (2 * Math.PI) * 360);
    angleInDegrees = Math.round(angleInDegrees);
    text = angleInDegrees.toString() + '°';

    // Create text shape
    textShape = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Text);
    textShape.SetFormat(T3Gv.opt.contentHeader.DimensionFontStyle);
    textShape.SetText(text);
    textDimensions = textShape.GetTextMinDimensions();

    // Adjust bisector length if necessary
    while (preferredBisectorLength < minDistance && Math.tan(angle / 2) * preferredBisectorLength < textDimensions.width / 2 + OptConstant.LineAngleDimensionDefs.PreferredArrowStemMin + OptConstant.LineAngleDimensionDefs.ArrowHeadSize) {
      preferredBisectorLength += OptConstant.LineAngleDimensionDefs.PreferredBisectorLen;
      if (preferredBisectorLength >= minDistance) {
        preferredBisectorLength = minDistance;
      }
    }

    // Set line lengths
    T3Gv.opt.SetLineLength(targetLinePoints[0], targetLinePoints[1], preferredBisectorLength);
    T3Gv.opt.SetLineLength(baseLinePoints[0], baseLinePoints[1], preferredBisectorLength);
    T3Gv.opt.SetLineLength(bisectorPoints[0], bisectorPoints[1], preferredBisectorLength);

    // Set text rectangle
    textRect = Utils2.SetRect(0, 0, textDimensions.width, textDimensions.height);
    Utils2.OffsetRect(textRect, bisectorPoints[1].x, bisectorPoints[1].y);
    Utils2.OffsetRect(textRect, -textDimensions.width / 2, -textDimensions.height / 2);

    const result = {
      text: textShape,
      textRect: textRect,
      baseLinePts: baseLinePoints,
      targetLinePts: targetLinePoints
    };

    T3Util.Log("= S.BaseDrawObject: GetDimensionAngleInfo output:", result);
    return result;
  }

  GetPointsForDimension(
    angle: number,
    text: string,
    startPoint: Point,
    endPoint: Point,
    segmentIndex: number,
    isStandoff: boolean
  ): { left: Rectangle; textFrame: Rectangle; right: Rectangle } {
    T3Util.Log("= S.BaseDrawObject: GetPointsForDimension input:", {
      angle,
      text,
      startPoint,
      endPoint,
      segmentIndex,
      isStandoff
    });

    let textShape: any;
    const leftArrowPoints: Point[] = [];
    const rightArrowPoints: Point[] = [];
    const textFramePoints: Point[] = [];
    const leftRect = new Rectangle();
    const rightRect = new Rectangle();
    const textFrameRect = new Rectangle();

    textShape = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Text);
    textShape.SetText(text);
    textShape.SetFormat(T3Gv.opt.contentHeader.DimensionFontStyle);
    textShape.SetConstraints(T3Gv.opt.contentHeader.MaxWorkDim.x, 0, 0);

    this.GetDimensionTextInfo(startPoint, endPoint, angle, textShape, segmentIndex, textFramePoints, leftArrowPoints, rightArrowPoints, isStandoff);

    textShape = null;

    Utils2.GetPolyRect(leftRect, leftArrowPoints);
    Utils2.GetPolyRect(rightRect, rightArrowPoints);
    Utils2.GetPolyRect(textFrameRect, textFramePoints);

    const result = {
      left: leftRect,
      textFrame: textFrameRect,
      right: rightRect
    };

    T3Util.Log("= S.BaseDrawObject: GetPointsForDimension output:", result);
    return result;
  }

  GetAreaDimension(points: Point[]): string | void {
    T3Util.Log("= S.BaseDrawObject: GetAreaDimension input:", points);

    let result: string | void;

    if (this.Dimensions & NvConstant.DimensionFlags.Area) {
      result = this.GetAreaDimensionText(points);
    } else if (this.Dimensions & NvConstant.DimensionFlags.RectWithAndHeight) {
      result = this.GetAreaWidthAndHeightText(points);
    }

    T3Util.Log("= S.BaseDrawObject: GetAreaDimension output:", result);
    return result;
  }

  GetAreaDimensionText(points: Point[]): string {
    T3Util.Log("= S.BaseDrawObject: GetAreaDimensionText input:", points);

    let area = 0;
    let result = '';

    if (points) {
      area = this.calculatePolygonArea(points);
    } else {
      area = this.Frame.width * this.Frame.height;
    }

    const lengthInUnits = T3Gv.docUtil.rulerConfig.showpixels ? area : this.GetLengthInUnits(area);
    result = RulerUtil.GetLengthInRulerUnits(lengthInUnits);

    T3Util.Log("= S.BaseDrawObject: GetAreaDimensionText output:", result);
    return result;
  }

  private calculatePolygonArea(points: Point[]): number {
    let area = 0;
    let j = points.length - 1;

    for (let i = 0; i < points.length; i++) {
      area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
      j = i;
    }

    return Math.abs(area / 2);
  }

  GetAreaWidthAndHeightText(points: Point[]): string | null {
    T3Util.Log("= S.BaseDrawObject: GetAreaWidthAndHeightText input:", points);

    // Placeholder logic for calculating width and height text
    const result = null;

    T3Util.Log("= S.BaseDrawObject: GetAreaWidthAndHeightText output:", result);
    return result;
  }

  GetDimensionPoints(): Point[] {
    T3Util.Log("= S.BaseDrawObject: GetDimensionPoints input");

    let points = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, false, false, null);
    if (this.RotationAngle) {
      const angleInRadians = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, angleInRadians, points);
    }

    T3Util.Log("= S.BaseDrawObject: GetDimensionPoints output:", points);
    return points;
  }

  // Horizon and vertial points 0,0 -> horizon x,0 | 0,0 -> vertial y,0

  GetCoordinateLinePoints(): Point[] {
    T3Util.Log("= S.BaseDrawObject: GetCoordinateLinePoints input");

    let points = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, false, false, null);
    if (this.RotationAngle) {
      const angleInRadians = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, angleInRadians, points);
    }

    T3Util.Log("= S.BaseDrawObject: GetCoordinateLinePoints output:", points);
    return points;
  }

  GetHookedObjectDescList(dimensionPoints: Point[], context: any): any[] {
    T3Util.Log("= S.BaseDrawObject: GetHookedObjectDescList input:", { dimensionPoints, context });

    let result: any[] = [];
    let linkManager = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false);
    let boundingRect = new Rectangle(0, 0, 0, 0);
    let hookPoints: Point[] = [];
    let hookObject: any = null;
    let connectPoint: Point = { x: 0, y: 0 };
    let segmentSortValue = 0;

    if (linkManager) {
      let linkIndex = OptCMUtil.FindLink(linkManager, this.BlockID, true);
      let linkCount = linkManager.length;

      while (linkIndex >= 0 && linkIndex < linkCount && linkManager[linkIndex].targetid === this.BlockID) {
        hookObject = DataUtil.GetObjectPtr(linkManager[linkIndex].hookid, false);
        if (hookObject) {
          for (let i = 0; i < hookObject.hooks.length; i++) {
            if (hookObject.hooks[i].objid === this.BlockID) {
              hookPoints.push(linkManager[linkIndex].hookid);
              break;
            }
          }
        }
        linkIndex++;
      }
    }

    if (context && context.linkParams) {
      if (context.linkParams.ConnectIndex !== this.BlockID &&
        (context.linkParams.PrevConnect === this.BlockID ||
          context.linkParams.ConnectIndexHistory.indexOf(this.BlockID) >= 0)) {
        let index = hookPoints.indexOf(context.movingShapeID);
        if (index >= 0) hookPoints.splice(index, 1);
      }

      if (context.linkParams.ConnectIndex === this.BlockID &&
        hookPoints.indexOf(context.movingShapeID) < 0) {
        hookPoints.push(context.movingShapeID);
      }
    }

    for (let i = 0; i < hookPoints.length; i++) {
      hookObject = DataUtil.GetObjectPtr(hookPoints[i], false);
      if (hookObject instanceof Instance.Shape.BaseShape &&
        !(context && context.linkParams && context.movingShapeID === hookObject.BlockID &&
          context.linkParams.ConnectIndex < 0 && context.linkParams.PrevConnect === this.BlockID)) {

        if (context && context.linkParams && context.movingShapeID === hookObject.BlockID) {
          connectPoint = context.linkParams.ConnectPt;
        } else {
          if (!(hookObject.hooks.length > 0)) continue;
          connectPoint = hookObject.hooks[0].connect;
        }

        let perimeterPoints = this.GetPerimPts(this.BlockID, [connectPoint]);
        let hitResult = this.Hit(perimeterPoints[0], true, false, {});

        if (!hitResult) {
          if (!(this instanceof Instance.Shape.BaseLine) || this instanceof Instance.Shape.PolyLine) continue;
          if (Utils2.IsEqual(perimeterPoints[0].x, this.StartPoint.x, 2) &&
            Utils2.IsEqual(perimeterPoints[0].y, this.StartPoint.y, 2)) {
            hitResult.segment = 0;
          } else {
            if (!Utils2.IsEqual(perimeterPoints[0].x, this.EndPoint.x, 2) ||
              !Utils2.IsEqual(perimeterPoints[0].y, this.EndPoint.y, 2)) continue;
            hitResult.segment = dimensionPoints.length > 2 ? dimensionPoints.length - 2 : 0;
          }
        }

        let segmentIndex = hitResult.segment + 1;
        if (segmentIndex - 1 >= dimensionPoints.length) continue;

        let segmentPoints = [
          new Point(dimensionPoints[segmentIndex - 1].x, dimensionPoints[segmentIndex - 1].y),
          new Point(dimensionPoints[segmentIndex].x, dimensionPoints[segmentIndex].y)
        ];

        let angle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(segmentPoints[0], segmentPoints[1]);
        Utils3.RotatePointsAboutCenter(boundingRect, -angle, segmentPoints);

        let hookObjectPoints = context && context.movingShapeID === hookObject.BlockID ?
          Utils2.PolyFromRect(context.movingShapeBBox) :
          hookObject.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, false, null);

        let rotationAngle = context && context.movingShapeID === hookObject.BlockID ? angle : -hookObject.RotationAngle / (180 / NvConstant.Geometry.PI);
        let hookObjectRect = Utils2.GetPolyRect({}, hookObjectPoints);
        let rotatedConnectPoint = Utils1.DeepCopy(perimeterPoints[0]);

        Utils3.RotatePointsAboutCenter(hookObjectRect, rotationAngle, [rotatedConnectPoint]);
        Utils2.OffsetRect(hookObjectRect, perimeterPoints[0].x - rotatedConnectPoint.x, perimeterPoints[0].y - rotatedConnectPoint.y);
        hookObjectPoints = Utils2.PolyFromRect(hookObjectRect);

        if (rotationAngle) {
          Utils3.RotatePointsAboutPoint(perimeterPoints[0], -rotationAngle, hookObjectPoints);
        }

        for (let j = 0; j < hookObjectPoints.length; j++) {
          hookObjectPoints[j].x -= this.Frame.x;
          hookObjectPoints[j].y -= this.Frame.y;
        }

        Utils3.RotatePointsAboutCenter(boundingRect, -angle, hookObjectPoints);
        let hookObjectBoundingRect = Utils2.GetPolyRect({}, hookObjectPoints);

        let startPoint = new Point(hookObjectBoundingRect.x, segmentPoints[0].y);
        let endPoint = new Point(hookObjectBoundingRect.x + hookObjectBoundingRect.width, segmentPoints[0].y);
        segmentSortValue = startPoint.x;

        Utils3.RotatePointsAboutCenter(boundingRect, angle, [startPoint, endPoint]);

        result.push({
          id: hookObject.BlockID,
          segment: segmentIndex,
          segmentSortValue: segmentSortValue,
          start: { x: startPoint.x, y: startPoint.y },
          end: { x: endPoint.x, y: endPoint.y }
        });
      }
    }

    result.sort((a, b) => {
      if (a.segment !== b.segment) return a.segment < b.segment ? -1 : 1;
      return a.segmentSortValue < b.segmentSortValue ? -1 : 1;
    });

    T3Util.Log("= S.BaseDrawObject: GetHookedObjectDescList output:", result);
    return result;
  }

  GetHookedObjectDimensionInfo(context: any): any[] {
    T3Util.Log("= S.BaseDrawObject: GetHookedObjectDimensionInfo input:", context);

    let maxSegmentIndex = -1;
    let currentPoint = new Point(0, 0);
    const hookedObjectInfoList: any[] = [];
    const dimensionPoints = this.GetDimensionPoints();
    const hookedObjectDescList = this.GetHookedObjectDescList(dimensionPoints, context);
    const length = hookedObjectDescList.length;

    for (let i = 0; i < length; i++) {
      const hookedObjectDesc = hookedObjectDescList[i];

      if (hookedObjectDesc.segment > maxSegmentIndex) {
        currentPoint = dimensionPoints[(maxSegmentIndex = hookedObjectDesc.segment) - 1];
        hookedObjectInfoList.push({
          hookedObjID: hookedObjectDesc.id,
          side: 0,
          segment: maxSegmentIndex,
          start: { x: currentPoint.x, y: currentPoint.y },
          end: { x: hookedObjectDesc.start.x, y: hookedObjectDesc.start.y }
        });
      } else if (hookedObjectInfoList.length > 0) {
        hookedObjectInfoList[hookedObjectInfoList.length - 1].end = hookedObjectDesc.start;
      }

      hookedObjectInfoList.push({
        hookedObjID: hookedObjectDesc.id,
        side: 1,
        segment: maxSegmentIndex,
        start: { x: hookedObjectDesc.end.x, y: hookedObjectDesc.end.y },
        end: { x: dimensionPoints[maxSegmentIndex].x, y: dimensionPoints[maxSegmentIndex].y }
      });

      currentPoint = hookedObjectDesc.end;
    }

    T3Util.Log("= S.BaseDrawObject: GetHookedObjectDimensionInfo output:", hookedObjectInfoList);
    return hookedObjectInfoList;
  }

  DimensionLineDeflectionAdjust(
    element: any,
    segmentIndex: number,
    knobPoint: Point,
    ccAngleRadians: number,
    adjustForKnob: number
  ): any {
    T3Util.Log("= S.BaseDrawObject: DimensionLineDeflectionAdjust input:", {
      element,
      segmentIndex,
      knobPoint,
      ccAngleRadians,
      adjustForKnob
    });

    let dimensionPoints = this.GetDimensionPoints();
    let deflectionValue = this.GetDimensionDeflectionValue(segmentIndex);

    // Adjust the knob point based on the frame position and adjustment value
    let adjustedKnobPoint = new Point(
      knobPoint.x + this.Frame.x - adjustForKnob,
      knobPoint.y + this.Frame.y - adjustForKnob
    );

    // Create an array of points for the segment and knob point
    let points = [
      dimensionPoints[segmentIndex - 1],
      dimensionPoints[segmentIndex],
      adjustedKnobPoint,
      new Point(element.x, element.y)
    ];

    // Rotate the points around the center of the frame
    Utils3.RotatePointsAboutCenter(this.Frame, -ccAngleRadians, points);

    // Adjust for reverse winding if necessary
    if (this.IsReverseWinding()) {
      Utils3.RotatePointsAboutCenter(this.Frame, Math.PI, points);
    }

    // Calculate the deflection value based on the adjusted points
    let deflection = points[3].y - points[2].y;
    if (this.polylist && this.polylist.segs[segmentIndex].dimTextAltPositioning) {
      deflectionValue -= deflection;
    } else {
      deflectionValue += deflection;
    }

    T3Util.Log("= S.BaseDrawObject: DimensionLineDeflectionAdjust output:", deflectionValue);
    return deflectionValue;
  }

  GetDimensionLineDeflectionKnobUserData(element, segmentIndex, dimensionPoints, knobRadius, knobOffset) {
    T3Util.Log("= S.BaseDrawObject: GetDimensionLineDeflectionKnobUserData input:", {
      element,
      segmentIndex,
      dimensionPoints,
      knobRadius,
      knobOffset
    });

    let textElement = null;
    let bbox, rotationAngle, angleInRadians, midPoint, deflectionAngle, isReverseWinding = false;
    const points = [];
    const textElements = element.GetElementListWithId(OptConstant.SVGElementClass.DimText);

    for (let i = 0; i < textElements.length; i++) {
      if (textElements[i].userData.segment === segmentIndex && textElements[i].userData.side === undefined) {
        textElement = textElements[i];
        break;
      }
    }

    if (!textElement) {
      T3Util.Log("= S.BaseDrawObject: GetDimensionLineDeflectionKnobUserData output: null");
      return null;
    }

    bbox = textElement.CalcBBox();
    const knobPoint = {
      x: bbox.x + bbox.width + 25,
      y: bbox.y + bbox.height / 2
    };

    rotationAngle = 360 - textElement.GetRotation();
    if (rotationAngle === 360) rotationAngle = 0;
    angleInRadians = 2 * Math.PI * (rotationAngle / 360);
    Utils3.RotatePointsAboutPoint({ x: bbox.x, y: bbox.y }, angleInRadians, [knobPoint]);

    points.push(new Point(dimensionPoints[segmentIndex - 1].x, dimensionPoints[segmentIndex - 1].y));
    points.push(new Point(dimensionPoints[segmentIndex].x, dimensionPoints[segmentIndex].y));

    midPoint = {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2
    };

    deflectionAngle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(dimensionPoints[segmentIndex - 1], dimensionPoints[segmentIndex]);

    if (this instanceof Instance.Shape.Polygon && this.polylist) {
      const polyCopy = Utils1.DeepCopy(this);
      const polyLine = T3Gv.opt.ShapeToPolyLine(this.BlockID, false, true, polyCopy);
      if (polyLine && polyLine.IsReverseWinding && polyLine.IsReverseWinding()) {
        isReverseWinding = true;
      }
    }

    if (this.IsReverseWinding && this.IsReverseWinding()) {
      isReverseWinding = true;
    }

    if (isReverseWinding) {
      deflectionAngle += Math.PI;
      deflectionAngle %= 2 * Math.PI;
    }

    points.push(new Point(knobPoint.x, knobPoint.y));

    const boundingRect = new Rectangle(0, 0, 0, 0);
    Utils2.GetPolyRect(boundingRect, points);
    Utils3.RotatePointsAboutCenter(boundingRect, -deflectionAngle, points);

    const isAbove = points[2].y > points[0].y;
    const maxX = Math.max(points[0].x, points[1].x);
    const minX = Math.min(points[0].x, points[1].x);

    if (points[2].x > maxX || points[2].x < minX) {
      points[2].x = Math.abs(deflectionAngle - angleInRadians) < 2 ? maxX : minX;
      Utils3.RotatePointsAboutCenter(boundingRect, deflectionAngle, points);
      knobPoint.x = points[2].x;
      knobPoint.y = points[2].y;
    }

    knobPoint.x += knobRadius - knobOffset;
    knobPoint.y += knobRadius - knobOffset;

    const result = {
      segmentIndex,
      knobPoint,
      ccAngleRadians: deflectionAngle,
      originalDeflection: this.GetDimensionDeflectionValue(segmentIndex),
      adjustForKnob: knobRadius - knobOffset
    };

    T3Util.Log("= S.BaseDrawObject: GetDimensionLineDeflectionKnobUserData output:", result);
    return result;
  }

  GetDimensionDeflectionValue(segmentIndex: number): number {
    T3Util.Log("= S.BaseDrawObject: GetDimensionDeflectionValue input:", segmentIndex);

    let deflectionValue = 0;
    if (segmentIndex === 1) {
      deflectionValue = this.dimensionDeflectionH ? this.dimensionDeflectionH : 0;
    } else {
      deflectionValue = this.dimensionDeflectionV ? this.dimensionDeflectionV : 0;
    }

    T3Util.Log("= S.BaseDrawObject: GetDimensionDeflectionValue output:", deflectionValue);
    return deflectionValue;
  }

  GetDimensionLineDeflection(knobPoint: Point, x: number, y: number, deflectionData: any): number {
    T3Util.Log("= S.BaseDrawObject: GetDimensionLineDeflection input:", { knobPoint, x, y, deflectionData });

    let segmentPoints: Point[] = [];
    let adjustedKnobPoint = new Point(0, 0);
    let dimensionPoints = this.GetDimensionPoints();

    // Adjust dimension points by the inside offset
    for (let i = 0; i < dimensionPoints.length; i++) {
      dimensionPoints[i].x += this.inside.x;
      dimensionPoints[i].y += this.inside.y;
    }

    // Adjust the knob point based on the frame position and adjustment value
    adjustedKnobPoint.x = deflectionData.knobPoint.x + this.Frame.x - deflectionData.adjustForKnob;
    adjustedKnobPoint.y = deflectionData.knobPoint.y + this.Frame.y - deflectionData.adjustForKnob;

    // Create an array of points for the segment and knob point
    segmentPoints.push(dimensionPoints[deflectionData.segmentIndex - 1]);
    segmentPoints.push(dimensionPoints[deflectionData.segmentIndex]);
    segmentPoints.push(new Point(adjustedKnobPoint.x, adjustedKnobPoint.y));
    segmentPoints.push(new Point(x, y));

    // Rotate the points around the center of the frame
    Utils3.RotatePointsAboutCenter(this.Frame, -deflectionData.ccAngleRadians, segmentPoints);

    // Adjust for reverse winding if necessary
    if (this.IsReverseWinding()) {
      Utils3.RotatePointsAboutCenter(this.Frame, Math.PI, segmentPoints);
    }

    // Calculate the deflection value based on the adjusted points
    let deflection = segmentPoints[3].y - segmentPoints[2].y;
    let result = this.polylist && this.polylist.segs[deflectionData.segmentIndex].dimTextAltPositioning
      ? deflectionData.originalDeflection - deflection
      : deflectionData.originalDeflection + deflection;

    T3Util.Log("= S.BaseDrawObject: GetDimensionLineDeflection output:", result);
    return result;
  }

  UpdateDimensionLines(container: any, triggerType?: any): any {
    T3Util.Log("= S.BaseDrawObject: UpdateDimensionLines input:", { container, triggerType });

    if (T3Gv.opt.bBuildingSymbols) {
      return container;
    }

    if (container != null) {
      this.RemoveDimensionLines(container);

      const hasAreaOrRectDimensions = this.Dimensions & NvConstant.DimensionFlags.Area ||
        this.Dimensions & NvConstant.DimensionFlags.RectWithAndHeight;

      if (hasAreaOrRectDimensions) {
        this.UpdateAreaDimensionLines(container);
      }

      const hasAlwaysOrSelectDimensions = this.Dimensions & NvConstant.DimensionFlags.Always ||
        this.Dimensions & NvConstant.DimensionFlags.Select || triggerType;

      if (hasAlwaysOrSelectDimensions) {
        this.UpdateEdgeDimensionLines(container, triggerType);
      }

      T3Util.Log("= S.BaseDrawObject: UpdateDimensionLines output:", container);
      return container;
    }

    T3Util.Log("= S.BaseDrawObject: UpdateDimensionLines output: null");
    return null;
  }

  UpdateCoordinateLines(container: any, triggerType?: any): any {
    T3Util.Log("= S.BaseDrawObject: UpdateCoordinateLines input:", { container, triggerType });

    if (T3Gv.opt.bBuildingSymbols) {
      return container;
    }

    if (container != null) {
      this.RemoveCoordinateLines(container);

      const hasAreaOrRectDimensions = this.Dimensions & NvConstant.DimensionFlags.Area ||
        this.Dimensions & NvConstant.DimensionFlags.RectWithAndHeight;

      if (hasAreaOrRectDimensions) {
        this.UpdateAreaDimensionLines(container);
      }

      const hasAlwaysOrSelectDimensions = this.Dimensions & NvConstant.DimensionFlags.Always ||
        this.Dimensions & NvConstant.DimensionFlags.Select || triggerType;

      if (hasAlwaysOrSelectDimensions) {
        this.UpdateEdgeCoordinateLines(container, triggerType);
      }

      T3Util.Log("= S.BaseDrawObject: UpdateCoordinateLines output:", container);
      return container;
    }

    T3Util.Log("= S.BaseDrawObject: UpdateCoordinateLines output: null");
    return null;
  }

  UpdateHookedObjectDimensionLines(container: any, pathCreator: any, dimensionInfo: any): void {
    T3Util.Log("= S.BaseDrawObject: UpdateHookedObjectDimensionLines input:", { container, pathCreator, dimensionInfo });

    if (this.Dimensions & NvConstant.DimensionFlags.AllSeg) {
      const hookedObjectInfo = this.GetHookedObjectDimensionInfo(dimensionInfo);
      for (let i = 0; i < hookedObjectInfo.length; i++) {
        if (!Utils2.EqualPt(hookedObjectInfo[i].start, hookedObjectInfo[i].end)) {
          const angle = Utils1.CalcAngleFromPoints(hookedObjectInfo[i].start, hookedObjectInfo[i].end);
          const dimensionText = this.GetDimensionTextForPoints(hookedObjectInfo[i].start, hookedObjectInfo[i].end);
          this.CreateDimension(
            container,
            pathCreator,
            false,
            angle,
            dimensionText,
            hookedObjectInfo[i].start,
            hookedObjectInfo[i].end,
            hookedObjectInfo[i].segment,
            true,
            true,
            hookedObjectInfo[i]
          );
        }
      }
    }

    T3Util.Log("= S.BaseDrawObject: UpdateHookedObjectDimensionLines output: completed");
  }

  UpdateEdgeDimensionLines(element, triggerType) {
    T3Util.Log("= S.BaseDrawObject: UpdateEdgeDimensionLines input:", { element, triggerType });

    let pathShape, pathCreator, dimensionPoints, isPolygon;
    let angle = 0, segmentIndex = 0, dimensionText = '', dimensionLineShape = null, path = null;

    if (!element) {
      T3Util.Log("= S.BaseDrawObject: UpdateEdgeDimensionLines output: element is null");
      return;
    }

    pathShape = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Path);
    element.AddElement(pathShape);
    pathCreator = pathShape.PathCreator();
    pathShape.SetID(OptConstant.SVGElementClass.DimLine);
    pathShape.SetFillColor('none');
    pathShape.SetStrokeColor(OptConstant.Common.DimLineColor);
    pathShape.SetStrokeOpacity(1);
    pathShape.SetStrokeWidth(1);
    pathCreator.BeginPath();

    const alwaysOrSelectDimension = this.Dimensions & NvConstant.DimensionFlags.Always || this.Dimensions & NvConstant.DimensionFlags.Select;
    dimensionPoints = this.GetDimensionPoints();

    T3Util.Log('= S.BaseDrawObject: dimensionPoints:', dimensionPoints);

    const pointsLength = dimensionPoints.length;
    isPolygon = this instanceof Instance.Shape.Polygon;

    if (alwaysOrSelectDimension) {
      for (segmentIndex = 1; segmentIndex < pointsLength; segmentIndex++) {
        if (!Utils2.EqualPt(dimensionPoints[segmentIndex - 1], dimensionPoints[segmentIndex])) {
          angle = Utils1.CalcAngleFromPoints(dimensionPoints[segmentIndex - 1], dimensionPoints[segmentIndex]);
          dimensionText = this.GetDimensionFloatingPointValue(segmentIndex) || this.GetDimensionTextForPoints(dimensionPoints[segmentIndex - 1], dimensionPoints[segmentIndex]);

          T3Util.Log('= S.BaseDrawObject: angle:', angle);
          T3Util.Log('= S.BaseDrawObject: dimensionText:', dimensionText);

          this.CreateDimension(element, pathCreator, false, angle, dimensionText, dimensionPoints[segmentIndex - 1], dimensionPoints[segmentIndex], segmentIndex, false, isPolygon);
        }
      }
    }

    this.UpdateSecondaryDimensions(element, pathCreator, triggerType);
    this.ShowOrHideDimensions(false, triggerType);
    pathCreator.Apply();

    T3Util.Log("= S.BaseDrawObject: UpdateEdgeDimensionLines output: completed");
  }

  UpdateEdgeCoordinateLines(shapeContainer, triggerType) {
    T3Util.Log("= S.BaseDrawObject: UpdateEdgeCoordinateLines input:", { shapeContainer, triggerType });

    let pathShape, pathCreator;
    let coordinateLinePoints;
    let isPolygon;
    let angle = 0, segmentIndex = 0, dimensionText = '', dimensionLineShape = null, path = null;

    if (!shapeContainer) {
      T3Util.Log("= S.BaseDrawObject: UpdateEdgeCoordinateLines output: shapeContainer is null");
      return;
    }

    pathShape = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Path);
    shapeContainer.AddElement(pathShape);
    pathCreator = pathShape.PathCreator();
    pathShape.SetID(OptConstant.SVGElementClass.CoordinateLine);
    pathShape.SetFillColor('none');
    pathShape.SetStrokeColor(OptConstant.Common.CoordinateLineColor);
    pathShape.SetStrokeOpacity(1);
    pathShape.SetStrokeWidth(1);
    pathShape.SetStrokePattern("5,5");
    pathCreator.BeginPath();

    const showCoordinateLine = true;
    coordinateLinePoints = this.GetCoordinateLinePoints();

    T3Util.Log('= S.BaseDrawObject: coordinateLinePoints:', coordinateLinePoints);

    const pointsLength = coordinateLinePoints.length;
    isPolygon = this instanceof Instance.Shape.Polygon;

    if (showCoordinateLine) {
      for (segmentIndex = 1; segmentIndex < pointsLength; segmentIndex++) {
        if (!Utils2.EqualPt(coordinateLinePoints[segmentIndex - 1], coordinateLinePoints[segmentIndex])) {
          angle = Utils1.CalcAngleFromPoints(coordinateLinePoints[segmentIndex - 1], coordinateLinePoints[segmentIndex]);
          dimensionText = this.GetDimensionFloatingPointValue(segmentIndex) || this.GetDimensionTextForPoints(coordinateLinePoints[segmentIndex - 1], coordinateLinePoints[segmentIndex]);

          const startPoint = coordinateLinePoints[segmentIndex - 1];
          const endPoint = coordinateLinePoints[segmentIndex];

          T3Util.Log('= S.BaseDrawObject: angle:', angle);
          T3Util.Log('= S.BaseDrawObject: dimensionText:', dimensionText);
          T3Util.Log('= S.BaseDrawObject: startPoint:', startPoint);
          T3Util.Log('= S.BaseDrawObject: endPoint:', endPoint);

          this.CreateCoordinateLine(shapeContainer, pathCreator, false, angle, dimensionText, startPoint, endPoint, segmentIndex, false, isPolygon);
        }
      }
    }

    this.UpdateSecondaryDimensions(shapeContainer, pathCreator, triggerType);
    this.ShowOrHideDimensions(false, triggerType);
    pathCreator.Apply();

    T3Util.Log("= S.BaseDrawObject: UpdateEdgeCoordinateLines output: completed");
  }

  UpdateSecondaryDimensions(container: any, pathCreator: any, triggerType: any): void {
    T3Util.Log("= S.BaseDrawObject: UpdateSecondaryDimensions input:", { container, pathCreator, triggerType });

    // TODO: Implement the logic to update secondary dimensions here.
    // This is a placeholder for the actual implementation.

    T3Util.Log("= S.BaseDrawObject: UpdateSecondaryDimensions output: completed");
  }

  HideOrShowSelectOnlyDimensions(show: boolean, context: any): void {
    T3Util.Log("= S.BaseDrawObject: HideOrShowSelectOnlyDimensions input:", { show, context });

    let elementID: string;
    let elementIndex = 0;
    let element = null;
    let userData = null;
    let isHookedObject = false;
    let shouldShow = false;
    const svgLayer = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);

    if (svgLayer !== null) {
      const dimensionClasses = [
        OptConstant.SVGElementClass.DimLine,
        OptConstant.SVGElementClass.DimText,
        OptConstant.SVGElementClass.AreaDimLine,
        OptConstant.SVGElementClass.DimTextNoEdit
      ];

      for (elementIndex = svgLayer.ElementCount() - 1; elementIndex >= 1; elementIndex--) {
        element = svgLayer.GetElementByIndex(elementIndex);
        elementID = element.GetID();

        if (dimensionClasses.indexOf(elementID) >= 0) {
          isHookedObject = false;

          if (context && (userData = element.GetUserData()) && userData.hookedObjectInfo && userData.hookedObjectInfo.hookedObjID === context.movingShapeID) {
            isHookedObject = true;
          }

          shouldShow = show;
          shouldShow = !!isHookedObject || !!(this.Dimensions & NvConstant.DimensionFlags.Always) || !!(this.Dimensions & NvConstant.DimensionFlags.Select) && show;

          element.SetOpacity(shouldShow ? 1 : 0);
        }
      }
    }

    T3Util.Log("= S.BaseDrawObject: HideOrShowSelectOnlyDimensions output: completed");
  }

  ShowOrHideDimensions(show: boolean, context: any): void {
    T3Util.Log("= S.BaseDrawObject: ShowOrHideDimensions input:", { show, context });

    let hookedObject = null;
    this.HideOrShowSelectOnlyDimensions(show, context);

    if (this.hooks.length > 0 && context && context.movingShapeID === this.BlockID) {
      hookedObject = DataUtil.GetObjectPtr(this.hooks[0].objid, false);

      if (
        !hookedObject ||
        hookedObject.objecttype !== NvConstant.FNObjectTypes.FlWall ||
        hookedObject.Dimensions & NvConstant.DimensionFlags.HideHookedObjDimensions
      ) {
        hookedObject.HideOrShowSelectOnlyDimensions(show, context);
      }
    }

    T3Util.Log("= S.BaseDrawObject: ShowOrHideDimensions output: completed");
  }

  GetPointsForAreaDimension(): Point[] {
    T3Util.Log("= S.BaseDrawObject: GetPointsForAreaDimension input: none");

    const points = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, false, null);

    T3Util.Log("= S.BaseDrawObject: GetPointsForAreaDimension output:", points);
    return points;
  }

  UpdateAreaDimensionLines(container: any): void {
    T3Util.Log("= S.BaseDrawObject: UpdateAreaDimensionLines input:", container);

    const pathShape = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Path);
    if (container != null) {
      container.AddElement(pathShape);
      const pathCreator = pathShape.PathCreator();
      pathShape.SetID(OptConstant.SVGElementClass.AreaDimLine);
      pathShape.SetFillColor('none');
      pathShape.SetStrokeColor(OptConstant.Common.DimLineColor);
      pathShape.SetStrokeOpacity(1);
      pathShape.SetStrokeWidth(1);
      pathCreator.BeginPath();

      const areaPoints = this.GetPointsForAreaDimension();
      const areaDimensionText = this.GetAreaDimension(areaPoints);

      if (areaDimensionText && areaDimensionText !== '') {
        this.CreateDimension(container, pathCreator, true, 0, areaDimensionText);
      }

      pathShape.SetFillColor('#0000FF');
      pathShape.SetStrokeWidth(0);
      pathCreator.Apply();
    }

    T3Util.Log("= S.BaseDrawObject: UpdateAreaDimensionLines output: completed");
  }

  GetDimensionFloatingPointValue(segmentIndex: number): string | null {
    T3Util.Log("= S.BaseDrawObject: GetDimensionFloatingPointValue input:", segmentIndex);

    let dimensionValue = 0;

    const hasWidthFlag = this.rflags & NvConstant.FloatingPointDim.Width;
    const hasHeightFlag = this.rflags & NvConstant.FloatingPointDim.Height;

    if (hasWidthFlag || hasHeightFlag) {
      if (segmentIndex === 1 && hasWidthFlag) {
        dimensionValue = this.GetDimensionLengthFromValue(this.rwd);
        const result = RulerUtil.GetLengthInRulerUnits(dimensionValue);
        T3Util.Log("= S.BaseDrawObject: GetDimensionFloatingPointValue output:", result);
        return result;
      } else if (segmentIndex === 2 && hasHeightFlag) {
        dimensionValue = this.GetDimensionLengthFromValue(this.rht);
        const result = RulerUtil.GetLengthInRulerUnits(dimensionValue);
        T3Util.Log("= S.BaseDrawObject: GetDimensionFloatingPointValue output:", result);
        return result;
      }
    }

    T3Util.Log("= S.BaseDrawObject: GetDimensionFloatingPointValue output: null");
    return null;
  }

  IsTextFrameOverlap(textFrame: Rectangle, angle: number): boolean {
    T3Util.Log("= S.BaseDrawObject: IsTextFrameOverlap input:", { textFrame, angle });

    // Placeholder logic for checking text frame overlap
    const result = false;

    T3Util.Log("= S.BaseDrawObject: IsTextFrameOverlap output:", result);
    return result;
  }

  GetExteriorDimensionMeasurementLineThicknessAdjustment(thickness: number): number {
    T3Util.Log("= S.BaseDrawObject: GetExteriorDimensionMeasurementLineThicknessAdjustment input:", thickness);

    // Placeholder logic for thickness adjustment
    const result = 0;

    T3Util.Log("= S.BaseDrawObject: GetExteriorDimensionMeasurementLineThicknessAdjustment output:", result);
    return result;
  }

  CanUseStandOffDimensionLines(): boolean {
    T3Util.Log("= S.BaseDrawObject: CanUseStandOffDimensionLines input: none");

    const result = true;

    T3Util.Log("= S.BaseDrawObject: CanUseStandOffDimensionLines output:", result);
    return result;
  }

  GetDimensionLengthFromString(input: string, someParam: any): number {
    T3Util.Log("= S.BaseDrawObject: GetDimensionLengthFromString input:", { input, someParam });

    let dimensionValue = this.GetDimensionValueFromString(input, someParam);
    let result = dimensionValue < 0 ? dimensionValue : this.GetDimensionLengthFromValue(dimensionValue);

    T3Util.Log("= S.BaseDrawObject: GetDimensionLengthFromString output:", result);
    return result;
  }

  GetDimensionValueFromString(input: string, someParam: any): number {
    T3Util.Log("= S.BaseDrawObject: GetDimensionValueFromString input:", { input, someParam });

    let value = 0;
    input = input.trim();

    if (input.length === 0) {
      T3Util.Log("= S.BaseDrawObject: GetDimensionValueFromString output:", -1);
      return -1;
    }

    if (!input.match(/^[0-9. \/\'\"]+$/)) {
      T3Util.Log("= S.BaseDrawObject: GetDimensionValueFromString output:", -1);
      return -1;
    }

    if (
      T3Gv.docUtil.rulerConfig.useInches &&
      T3Gv.docUtil.rulerConfig.units === NvConstant.RulerUnit.Feet &&
      !T3Gv.docUtil.rulerConfig.showpixels
    ) {
      value = this.ConvertToFeet(input);
      if (value < 0 || isNaN(value)) {
        T3Util.Log("= S.BaseDrawObject: GetDimensionValueFromString output:", -1);
        return -1;
      }
    } else {
      if (!this.NumberIsFloat(input)) {
        T3Util.Log("= S.BaseDrawObject: GetDimensionValueFromString output:", -1);
        return -1;
      }
      value = parseFloat(input);
    }

    const result = isNaN(value) ? -1 : value;
    T3Util.Log("= S.BaseDrawObject: GetDimensionValueFromString output:", result);
    return result;
  }

  GetDimensionLengthFromValue(value: number): number {
    T3Util.Log("= S.BaseDrawObject: GetDimensionLengthFromValue input:", value);

    let length = 0;
    if (T3Gv.docUtil.rulerConfig.showpixels) {
      length = value;
    } else {
      length = this.UnitsToCoord(value, 0);
    }

    if (isNaN(length) || length > 400000) {
      length = -1;
    }

    T3Util.Log("= S.BaseDrawObject: GetDimensionLengthFromValue output:", length);
    return length;
  }

  AdjustDimensionLength(length: number): number {
    T3Util.Log("= S.BaseDrawObject: AdjustDimensionLength input:", length);
    const result = length;
    T3Util.Log("= S.BaseDrawObject: AdjustDimensionLength output:", result);
    return result;
  }

  GetDimensionAreaTextInfo(textShape, textFramePoints, leftArrowPoints, rightArrowPoints, topArrowPoints, bottomArrowPoints) {
    T3Util.Log("= S.BaseDrawObject: GetDimensionAreaTextInfo input:", {
      textShape,
      textFramePoints,
      leftArrowPoints,
      rightArrowPoints,
      topArrowPoints,
      bottomArrowPoints
    });

    const textMinDimensions = textShape.GetTextMinDimensions();
    const textFrame = {
      width: textMinDimensions.width,
      height: textMinDimensions.height,
      x: this.Frame.width / 2 - textMinDimensions.width / 2,
      y: this.Frame.height / 2 - textMinDimensions.height / 2
    };

    this.Frame2Poly(textFrame, textFramePoints);

    const halfHeight = 0.5 * textFrame.height;
    const quarterHeight = 0.5 * halfHeight;
    const arrowPoint = { x: 0, y: 0 };

    // Left arrow points
    arrowPoint.x = textFrame.x - quarterHeight;
    arrowPoint.y = textFrame.y + (textFrame.height - halfHeight) / 2;
    leftArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
    arrowPoint.y += halfHeight;
    leftArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
    arrowPoint.x -= halfHeight;
    arrowPoint.y = textFrame.y + textFrame.height / 2;
    leftArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
    leftArrowPoints.push(new Point(leftArrowPoints[0].x, leftArrowPoints[0].y));

    // Right arrow points
    arrowPoint.x = textFrame.x + textFrame.width + quarterHeight;
    arrowPoint.y = textFrame.y + (textFrame.height - halfHeight) / 2;
    rightArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
    arrowPoint.y += halfHeight;
    rightArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
    arrowPoint.x += halfHeight;
    arrowPoint.y = textFrame.y + textFrame.height / 2;
    rightArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
    rightArrowPoints.push(new Point(rightArrowPoints[0].x, rightArrowPoints[0].y));

    // Top arrow points
    arrowPoint.x = textFrame.x + textFrame.width / 2 - quarterHeight / 2;
    arrowPoint.y = textFrame.y - quarterHeight;
    topArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
    arrowPoint.x += quarterHeight;
    topArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
    arrowPoint.x -= quarterHeight / 2;
    arrowPoint.y -= quarterHeight;
    topArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
    topArrowPoints.push(new Point(topArrowPoints[0].x, topArrowPoints[0].y));

    // Bottom arrow points
    arrowPoint.x = textFrame.x + textFrame.width / 2 - quarterHeight / 2;
    arrowPoint.y = textFrame.y + textFrame.height + quarterHeight;
    bottomArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
    arrowPoint.x += quarterHeight;
    bottomArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
    arrowPoint.x -= quarterHeight / 2;
    arrowPoint.y += quarterHeight;
    bottomArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
    bottomArrowPoints.push(new Point(bottomArrowPoints[0].x, bottomArrowPoints[0].y));

    T3Util.Log("= S.BaseDrawObject: GetDimensionAreaTextInfo output:", {
      textFramePoints,
      leftArrowPoints,
      rightArrowPoints,
      topArrowPoints,
      bottomArrowPoints
    });
  }

  GetFrameIntersects(frame: any, point: Point, tolerance: number): boolean {
    T3Util.Log("= S.BaseDrawObject: GetFrameIntersects input:", { frame, point, tolerance });

    // Placeholder logic for frame intersection
    const result = false;

    T3Util.Log("= S.BaseDrawObject: GetFrameIntersects output:", result);
    return result;
  }

  AdjustAutoInsertShape(shapeData: any): boolean {
    T3Util.Log("= S.BaseDrawObject: AdjustAutoInsertShape input:", shapeData);

    const result = false;

    T3Util.Log("= S.BaseDrawObject: AdjustAutoInsertShape output:", result);
    return result;
  }

  GetDimensionTextInfo1(
    startPoint: Point,
    endPoint: Point,
    angle: number,
    textShape: any,
    segmentIndex: number,
    textFramePoints: Point[],
    leftArrowPoints: Point[],
    rightArrowPoints: Point[],
    isStandoff: boolean
  ): void {
    T3Util.Log("= S.BaseDrawObject: GetDimensionTextInfo1 input:", {
      startPoint,
      endPoint,
      angle,
      textShape,
      segmentIndex,
      textFramePoints,
      leftArrowPoints,
      rightArrowPoints,
      isStandoff
    });

    // Define local variables with readable names
    let newAngle: number;
    let arcLength: number;
    let minTextDim: any;
    const polyPoints: Point[] = [];
    let pointStartRef: Point;
    let pointEndRef: Point;
    let tempPoint: Point = { x: 0, y: 0 };
    let textDim: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 0, height: 0 };
    let textGap: number = 0;
    let isTextAltPositioning: boolean = false;
    let deflection: number = 0;
    let useStandOff: boolean = false;

    // Get minimum text dimensions and initialize textDim
    minTextDim = textShape.GetTextMinDimensions();
    textDim.height = minTextDim.height;
    textDim.width = minTextDim.width;

    // Create a polyline from the start and end points
    polyPoints.push(new Point(startPoint.x, startPoint.y));
    polyPoints.push(new Point(endPoint.x, endPoint.y));

    // Calculate the arc depending on the angle
    newAngle = 360 - angle;
    arcLength = 2 * Math.PI * (newAngle / 360);
    Utils3.RotatePointsAboutCenter(this.Frame, -arcLength, polyPoints);

    // Determine which point is to the left most given the rotated points
    if (polyPoints[0].x < polyPoints[1].x) {
      pointStartRef = $.extend(true, {}, polyPoints[0]);
      pointEndRef = $.extend(true, {}, polyPoints[1]);
    } else {
      pointStartRef = $.extend(true, {}, polyPoints[1]);
      pointEndRef = $.extend(true, {}, polyPoints[0]);
    }

    // Calculate the text frame's position (centered between the two points)
    textDim.x = pointStartRef.x + (pointEndRef.x - pointStartRef.x) / 2;
    textDim.y = pointStartRef.y + (pointEndRef.y - pointStartRef.y) / 2;
    textDim.x -= textDim.width / 2;
    textDim.y -= textDim.height / 2;
    textDim.y -= textDim.height / 2;

    // If using exterior dimensions, adjust the text frame vertically by line thickness
    const exteriorCheck =
      (this.Dimensions & NvConstant.DimensionFlags.Exterior) ||
      (this.StyleRecord && this.StyleRecord.Line && this.StyleRecord.Line.Thickness);
    if (exteriorCheck) {
      textDim.y -= this.StyleRecord.Line.Thickness;
    }

    // Determine if standoff should be used
    useStandOff =
      (this.Dimensions & NvConstant.DimensionFlags.Standoff) != 0 &&
      this.CanUseStandOffDimensionLines();

    if (
      !isStandoff &&
      !(this.Dimensions & NvConstant.DimensionFlags.HideHookedObjDimensions) &&
      this instanceof Instance.Shape.BaseLine &&
      this.ShortRef != OptConstant.LineTypes.LsMeasuringTape &&
      this.objecttype === NvConstant.FNObjectTypes.FlWall
    ) {
      const linkObj = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false);
      if (linkObj && OptCMUtil.FindLink(linkObj, this.BlockID, true) >= 0) {
        useStandOff = true;
      }
    }
    if (isStandoff) {
      useStandOff = false;
    }

    // Choose default offset based on standoff usage
    const defaultOffset = useStandOff
      ? OptConstant.Common.DimDefaultStandoff
      : OptConstant.Common.DimDefaultNonStandoff;

    // Adjust textDim vertically with the default offset
    textDim.y -= defaultOffset;
    textGap = OptConstant.Common.DimDefaultTextGap;
    if (
      (this.Dimensions & NvConstant.DimensionFlags.Exterior) ||
      (this.StyleRecord && this.StyleRecord.Line && this.StyleRecord.Line.Thickness)
    ) {
      textGap += this.StyleRecord.Line.Thickness;
    }

    // Determine if alternative text positioning is needed
    if (
      this instanceof Instance.Shape.BaseLine &&
      (!this.polylist || this.polylist.segs.length === 2)
    ) {
      const T = Math.floor((arcLength - 0.01) / (Math.PI / 2));
      isTextAltPositioning = T === 1 || T === 2;
    } else if (this.polylist && !this.polylist.closed && isStandoff) {
      const polyPts = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, true, false, null);
      const segmentPoints = [polyPts[segmentIndex - 1], polyPts[segmentIndex]];
      Utils3.RotatePointsAboutCenter(this.Frame, -arcLength, segmentPoints);
      segmentPoints.push({
        x: textDim.x + textDim.width / 2,
        y: textDim.y + textDim.height / 2
      });
      segmentPoints[2].x = segmentPoints[0].x + (segmentPoints[1].x - segmentPoints[0].x) / 2;
      Utils3.RotatePointsAboutCenter(this.Frame, arcLength, segmentPoints);
      if (Utils2.IsPointInPoly(polyPts, segmentPoints[2])) {
        isTextAltPositioning = true;
      }
    } else if (this.IsTextFrameOverlap(textDim, angle)) {
      isTextAltPositioning = true;
    }
    if (isTextAltPositioning) {
      textDim.y += defaultOffset;
      textDim.y += textDim.height;
      if (this.StyleRecord && this.StyleRecord.Line && this.StyleRecord.Line.Thickness) {
        textDim.y += 2 * this.StyleRecord.Line.Thickness;
      }
      textDim.y += defaultOffset;
    }

    // Handle standoff flag for further adjustment
    let standOffFlag = this.Dimensions & NvConstant.DimensionFlags.Standoff;
    if (standOffFlag && !this.CanUseStandOffDimensionLines()) {
      standOffFlag = false;
    }
    if (isStandoff) {
      standOffFlag = false;
    }
    if (standOffFlag) {
      if (
        (this instanceof Instance.Shape.PolyLine || this instanceof Instance.Shape.Polygon) &&
        this.polylist &&
        this.polylist.segs &&
        this.polylist.segs.length > segmentIndex
      ) {
        deflection = this.polylist.segs[segmentIndex].dimDeflection;
      } else if (this instanceof Instance.Shape.BaseLine) {
        deflection = this.dimensionDeflectionH ? this.dimensionDeflectionH : 0;
      } else {
        deflection = Math.abs(angle % 180) < 5 ? this.dimensionDeflectionH : this.dimensionDeflectionV || 0;
      }
      textDim.y = isTextAltPositioning ? textDim.y + deflection : textDim.y - deflection;
      if (this.polylist && this.polylist.segs && this.polylist.segs.length > segmentIndex) {
        this.polylist.segs[segmentIndex].dimTextAltPositioning = isTextAltPositioning;
      }
    }

    // Convert the calculated text frame (textDim) into a polygon and store in textFramePoints
    this.Frame2Poly(textDim, textFramePoints);

    // Depending on the standoff flag, create arrowhead points for dimension lines
    if (this.Dimensions & standOffFlag) {
      tempPoint.x = pointStartRef.x;
      tempPoint.y = pointStartRef.y > textDim.y ? pointStartRef.y - textGap : pointStartRef.y + textGap;
      leftArrowPoints.push(new Point(tempPoint.x, tempPoint.y));
      tempPoint.y = textDim.y + textDim.height / 2;
      leftArrowPoints.push(new Point(tempPoint.x, tempPoint.y));
      tempPoint.x = textDim.x - OptConstant.Common.DimDefaultTextGap;
      leftArrowPoints.push(new Point(tempPoint.x, tempPoint.y));
      tempPoint.x = textDim.x + textDim.width + OptConstant.Common.DimDefaultTextGap;
      rightArrowPoints.push(new Point(tempPoint.x, tempPoint.y));
      tempPoint.x = pointEndRef.x;
      rightArrowPoints.push(new Point(tempPoint.x, tempPoint.y));
      tempPoint.y = pointEndRef.y > textDim.y ? pointEndRef.y - textGap : pointEndRef.y + textGap;
      rightArrowPoints.push(new Point(tempPoint.x, tempPoint.y));
    } else {
      const halfHeight = 0.5 * textDim.height;
      const quarterHeight = 0.5 * halfHeight;

      tempPoint.x = textDim.x - quarterHeight;
      tempPoint.y = textDim.y + (textDim.height - halfHeight) / 2;
      leftArrowPoints.push(new Point(tempPoint.x, tempPoint.y));
      tempPoint.y += halfHeight;
      leftArrowPoints.push(new Point(tempPoint.x, tempPoint.y));
      tempPoint.x -= halfHeight;
      tempPoint.y = textDim.y + textDim.height / 2;
      leftArrowPoints.push(new Point(tempPoint.x, tempPoint.y));
      leftArrowPoints.push(new Point(leftArrowPoints[0].x, leftArrowPoints[0].y));

      tempPoint.x = textDim.x + textDim.width + quarterHeight;
      tempPoint.y = textDim.y + (textDim.height - halfHeight) / 2;
      rightArrowPoints.push(new Point(tempPoint.x, tempPoint.y));
      tempPoint.y += halfHeight;
      rightArrowPoints.push(new Point(tempPoint.x, tempPoint.y));
      tempPoint.x += halfHeight;
      tempPoint.y = textDim.y + textDim.height / 2;
      rightArrowPoints.push(new Point(tempPoint.x, tempPoint.y));
      rightArrowPoints.push(new Point(rightArrowPoints[0].x, rightArrowPoints[0].y));
    }

    // Rotate all calculated points back by the arcLength to adjust their final positions
    Utils3.RotatePointsAboutCenter(this.Frame, arcLength, textFramePoints);
    Utils3.RotatePointsAboutCenter(this.Frame, arcLength, leftArrowPoints);
    Utils3.RotatePointsAboutCenter(this.Frame, arcLength, rightArrowPoints);

    T3Util.Log("= S.BaseDrawObject: GetDimensionTextInfo1 output:", {
      textDim,
      textFramePoints,
      leftArrowPoints,
      rightArrowPoints
    });
  }

  GetDimensionTextInfo(startPoint, endPoint, angle, textShape, segmentIndex, textFramePoints, leftArrowPoints, rightArrowPoints, isStandoff) {

    var newAngle;//S;
    var arcLength;//c;
    var textMinDim;
    var polyPoints = [];

    // start point
    var pointStart = { x: 0, y: 0 };// d = { x: 0, y: 0 };

    // end point
    var pointEnd = { x: 0, y: 0 };// D = { x: 0, y: 0 };
    var g = { x: 0, y: 0 };
    var textDim = { x: 0, y: 0, width: 0, height: 0 };
    var m = 0;
    var C = false;// !1;
    var y = 0;

    var isStdOff = false;

    textMinDim = textShape.GetTextMinDimensions();
    textDim.height = textMinDim.height;
    textDim.width = textMinDim.width;

    polyPoints.push(new Point(startPoint.x, startPoint.y));
    polyPoints.push(new Point(endPoint.x, endPoint.y));

    newAngle = 360 - angle;

    // this expression calculates the length of the arc on a unit circle that corresponds to an angle S measured in degrees.
    arcLength = 2 * Math.PI * (newAngle / 360);
    Utils3.RotatePointsAboutCenter(this.Frame, - arcLength, polyPoints);

    if (polyPoints[0].x < polyPoints[1].x) {
      pointStart = $.extend(true, {}, polyPoints[0]);
      pointEnd = $.extend(true, {}, polyPoints[1]);
    }
    else {
      pointStart = $.extend(true, {}, polyPoints[1]);
      pointEnd = $.extend(true, {}, polyPoints[0]);

    }

    textDim.x = pointStart.x + (pointEnd.x - pointStart.x) / 2;
    textDim.y = pointStart.y + (pointEnd.y - pointStart.y) / 2;
    textDim.x -= textDim.width / 2;
    textDim.y -= textDim.height / 2;
    textDim.y -= textDim.height / 2;

    const check1 = this.Dimensions & NvConstant.DimensionFlags.Exterior || this.StyleRecord &&
      this.StyleRecord.Line && this.StyleRecord.Line.Thickness;

    if (check1) {
      (textDim.y -= this.StyleRecord.Line.Thickness);
    }

    const stdOffFlag = this.Dimensions & NvConstant.DimensionFlags.Standoff;
    isStdOff = stdOffFlag != 0 && this.CanUseStandOffDimensionLines();

    const isHideHookedObjDimensions = this.Dimensions & NvConstant.DimensionFlags.HideHookedObjDimensions;

    const check3 = !isStandoff && !isHideHookedObjDimensions && this instanceof Instance.Shape.BaseLine &&
      this.ShortRef != OptConstant.LineTypes.LsMeasuringTape &&
      this.objecttype === NvConstant.FNObjectTypes.FlWall;


    if (check3) {
      var linkObject = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false);
      if (linkObject) {

        const fdLink = OptCMUtil.FindLink(linkObject, this.BlockID, !0);
        if (fdLink >= 0) {
          isStdOff = true;
        }
      }
    }

    if (isStandoff) {
      isStdOff = false;
    }

    const stdOffNum = isStdOff ? OptConstant.Common.DimDefaultStandoff : OptConstant.Common.DimDefaultNonStandoff;

    if (textDim.y -= stdOffNum,
      m = OptConstant.Common.DimDefaultTextGap,
      this.Dimensions & NvConstant.DimensionFlags.Exterior ||
      this.StyleRecord &&
      this.StyleRecord.Line &&
      this.StyleRecord.Line.Thickness &&
      (m += this.StyleRecord.Line.Thickness),
      this instanceof Instance.Shape.BaseLine &&
      (!this.polylist || 2 === this.polylist.segs.length)) {
      var T = Math.floor((arcLength - 0.01) / (Math.PI / 2));
      C = 1 == T || 2 == T;
    } else if (this.polylist && !this.polylist.closed && isStandoff) {
      var b = [
        (polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, !0, !0, !1, null))[segmentIndex - 1],
        polyPoints[segmentIndex]
      ];
      Utils3.RotatePointsAboutCenter(this.Frame, -arcLength, b);
      b.push({
        x: textDim.x + textDim.width / 2,
        y: textDim.y + textDim.height / 2
      });
      b[2].x = b[0].x + (b[1].x - b[0].x) / 2;
      Utils3.RotatePointsAboutCenter(this.Frame, arcLength, b);
      Utils2.IsPointInPoly(polyPoints, b[2]) && (C = !0);
    } else if (this.IsTextFrameOverlap(textDim, angle)) {
      C = !0;
    }
    if (C) {
      textDim.y += stdOffNum;
      textDim.y += textDim.height;
      if (this.StyleRecord && this.StyleRecord.Line && this.StyleRecord.Line.Thickness) {
        textDim.y += 2 * this.StyleRecord.Line.Thickness;
      }
      textDim.y += stdOffNum;
    }

    let isStdOff2 = false;
    var stdOffFlag2 = this.Dimensions & NvConstant.DimensionFlags.Standoff;

    if (stdOffFlag2 && !this.CanUseStandOffDimensionLines()) {
      isStdOff2 = false;
    }

    if (isStandoff) {
      isStdOff2 = false;
    }

    if (isStdOff2) {
      if (
        (this instanceof Instance.Shape.PolyLine || this instanceof Instance.Shape.Polygon) &&
        this.polylist &&
        this.polylist.segs &&
        this.polylist.segs.length > segmentIndex
      ) {
        y = this.polylist.segs[segmentIndex].dimDeflection;
      } else if (this instanceof Instance.Shape.BaseLine) {
        y = this.dimensionDeflectionH ? this.dimensionDeflectionH : 0;
      } else {
        y = Math.abs(angle % 180) < 5 ? this.dimensionDeflectionH : this.dimensionDeflectionV || 0;
      }

      if (C) {
        textDim.y += y;
      } else {
        textDim.y -= y;
      }

      if (this.polylist && this.polylist.segs && this.polylist.segs.length > segmentIndex) {
        this.polylist.segs[segmentIndex].dimTextAltPositioning = C;
      }
    }

    this.Frame2Poly(textDim, textFramePoints);

    if (this.Dimensions & stdOffFlag2) {
      g.x = pointStart.x;
      g.y = pointStart.y > textDim.y ? pointStart.y - m : pointStart.y + m;
      leftArrowPoints.push(new Point(g.x, g.y));
      g.y = textDim.y + textDim.height / 2;
      leftArrowPoints.push(new Point(g.x, g.y));
      g.x = textDim.x - OptConstant.Common.DimDefaultTextGap;
      leftArrowPoints.push(new Point(g.x, g.y));
      g.x = textDim.x + textDim.width + OptConstant.Common.DimDefaultTextGap;
      rightArrowPoints.push(new Point(g.x, g.y));
      g.x = pointEnd.x;
      rightArrowPoints.push(new Point(g.x, g.y));
      g.y = pointEnd.y > textDim.y ? pointEnd.y - m : pointEnd.y + m;
      rightArrowPoints.push(new Point(g.x, g.y));
    } else {
      var P = 0.5 * textDim.height;
      var R = 0.5 * P;

      g.x = textDim.x - R;
      g.y = textDim.y + (textDim.height - P) / 2;
      leftArrowPoints.push(new Point(g.x, g.y));
      g.y += P;
      leftArrowPoints.push(new Point(g.x, g.y));
      g.x -= P;
      g.y = textDim.y + textDim.height / 2;
      leftArrowPoints.push(new Point(g.x, g.y));
      leftArrowPoints.push(new Point(leftArrowPoints[0].x, leftArrowPoints[0].y));
      g.x = textDim.x + textDim.width + R;
      g.y = textDim.y + (textDim.height - P) / 2;
      rightArrowPoints.push(new Point(g.x, g.y));
      g.y += P;
      rightArrowPoints.push(new Point(g.x, g.y));
      g.x += P;
      g.y = textDim.y + textDim.height / 2;
      rightArrowPoints.push(new Point(g.x, g.y));
      rightArrowPoints.push(new Point(rightArrowPoints[0].x, rightArrowPoints[0].y));
    }

    Utils3.RotatePointsAboutCenter(this.Frame, arcLength, textFramePoints);
    Utils3.RotatePointsAboutCenter(this.Frame, arcLength, leftArrowPoints);
    Utils3.RotatePointsAboutCenter(this.Frame, arcLength, rightArrowPoints);
  }

  GetCoordinateTextInfo(startPoint, endPoint, angle, textShape, segmentIndex, textFramePoints, leftArrowPoints, rightArrowPoints, isStandoff) {

    var newAngle;//S;
    var arcLength;//c;
    var textMinDim;
    var polyPoints = [];

    // start point
    var pointStart = { x: 0, y: 0 };// d = { x: 0, y: 0 };

    // end point
    var pointEnd = { x: 0, y: 0 };// D = { x: 0, y: 0 };
    var arrowPoint = { x: 0, y: 0 };
    var textDim = { x: 0, y: 0, width: 0, height: 0 };
    var textGap = 0;//m = 0;
    var isFitArc = false;// !1;
    var y = 0;

    var isStdOff = false;// f = !1;

    textMinDim = textShape.GetTextMinDimensions();
    textDim.height = textMinDim.height;
    textDim.width = textMinDim.width;

    polyPoints.push(new Point(startPoint.x, startPoint.y));
    polyPoints.push(new Point(endPoint.x, endPoint.y));

    newAngle = 360 - angle;

    // this expression calculates the length of the arc on a unit circle that corresponds to an angle S measured in degrees.
    arcLength = 2 * Math.PI * (newAngle / 360);
    Utils3.RotatePointsAboutCenter(this.Frame, - arcLength, polyPoints);

    if (polyPoints[0].x < polyPoints[1].x) {
      pointStart = $.extend(true, {}, polyPoints[0]);
      pointEnd = $.extend(true, {}, polyPoints[1]);
    }
    else {
      pointStart = $.extend(true, {}, polyPoints[1]);
      pointEnd = $.extend(true, {}, polyPoints[0]);
    }

    textDim.x = pointStart.x + (pointEnd.x - pointStart.x) / 2;
    textDim.y = pointStart.y + (pointEnd.y - pointStart.y) / 2;
    textDim.x -= textDim.width / 2;
    textDim.y -= textDim.height / 2;
    textDim.y -= textDim.height / 2;

    const check1 = this.Dimensions & NvConstant.DimensionFlags.Exterior || this.StyleRecord &&
      this.StyleRecord.Line && this.StyleRecord.Line.Thickness;

    if (check1) {
      (textDim.y -= this.StyleRecord.Line.Thickness);
    }

    const stdOffFlag = this.Dimensions & NvConstant.DimensionFlags.Standoff;
    isStdOff = stdOffFlag != 0 && this.CanUseStandOffDimensionLines();
    const isHideHookedObjDimensions = this.Dimensions & NvConstant.DimensionFlags.HideHookedObjDimensions;

    const check3 = !isStandoff && !isHideHookedObjDimensions && this instanceof Instance.Shape.BaseLine &&
      this.ShortRef != OptConstant.LineTypes.LsMeasuringTape &&
      this.objecttype === NvConstant.FNObjectTypes.FlWall;

    if (
      check3
    ) {
      var linkObject = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false);
      if (linkObject) {

        const fdLink = OptCMUtil.FindLink(linkObject, this.BlockID, !0);
        if (fdLink >= 0) {
          isStdOff = true;
        }
      }
    }

    if (isStandoff) {
      isStdOff = false;
    }

    const stdOffNum = isStdOff ? OptConstant.Common.CoordinateLineDefaultStandoff : OptConstant.Common.CoordinateLineDefaultNonStandoff;

    textDim.y -= stdOffNum;
    textGap = OptConstant.Common.CoordinateLineDefaultTextGap;

    const check4 = this.Dimensions & NvConstant.DimensionFlags.Exterior || this.StyleRecord &&
      this.StyleRecord.Line && this.StyleRecord.Line.Thickness;

    if (check4) {
      (textGap += this.StyleRecord.Line.Thickness);
    }

    const check5 = this instanceof Instance.Shape.BaseLine &&
      (!this.polylist || 2 === this.polylist.segs.length);

    if (
      check5
    ) {

      // The entire expression calculates how many π/2 segments fit into the adjusted arcLength, rounding down to the nearest whole number. This could be useful in scenarios where you need to determine the number of complete right-angle segments in an arc.
      var fitArcSegments = Math.floor((arcLength - 0.01) / (Math.PI / 2));
      isFitArc = 1 == fitArcSegments || 2 == fitArcSegments;
    } else if (this.polylist && !this.polylist.closed && isStandoff) {
      var b = [
        (polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, !0, !0, !1, null))[segmentIndex - 1],
        polyPoints[segmentIndex]
      ];
      Utils3.RotatePointsAboutCenter(this.Frame, -arcLength, b);
      b.push({
        x: textDim.x + textDim.width / 2,
        y: textDim.y + textDim.height / 2
      });
      b[2].x = b[0].x + (b[1].x - b[0].x) / 2;
      Utils3.RotatePointsAboutCenter(this.Frame, arcLength, b);
      Utils2.IsPointInPoly(polyPoints, b[2]) && (isFitArc = !0);
    } else if (this.IsTextFrameOverlap(textDim, angle)) {
      isFitArc = !0;
    }
    if (isFitArc) {
      textDim.y += stdOffNum;
      textDim.y += textDim.height;
      if (this.StyleRecord && this.StyleRecord.Line && this.StyleRecord.Line.Thickness) {
        textDim.y += 2 * this.StyleRecord.Line.Thickness;
      }
      textDim.y += stdOffNum;
    }

    let isStdOff2 = false;
    var stdOffFlag2 = this.Dimensions & NvConstant.DimensionFlags.Standoff;

    if (stdOffFlag2 && !this.CanUseStandOffDimensionLines()) {
      isStdOff2 = false;
    }

    if (isStandoff) {
      isStdOff2 = false;
    }

    if (isStdOff2) {
      if (
        (this instanceof Instance.Shape.PolyLine || this instanceof Instance.Shape.Polygon) &&
        this.polylist &&
        this.polylist.segs &&
        this.polylist.segs.length > segmentIndex
      ) {
        y = this.polylist.segs[segmentIndex].dimDeflection;
      } else if (this instanceof Instance.Shape.BaseLine) {
        y = this.dimensionDeflectionH ? this.dimensionDeflectionH : 0;
      } else {
        y = Math.abs(angle % 180) < 5 ? this.dimensionDeflectionH : this.dimensionDeflectionV || 0;
      }

      if (isFitArc) {
        textDim.y += y;
      } else {
        textDim.y -= y;
      }

      if (this.polylist && this.polylist.segs && this.polylist.segs.length > segmentIndex) {
        this.polylist.segs[segmentIndex].dimTextAltPositioning = isFitArc;
      }
    }

    this.Frame2Poly(textDim, textFramePoints);

    if (this.Dimensions & stdOffFlag2) {

      // Double temp point {x:0,y:0}
      // 1st----------------2nd--- txtdim  1st---------------
      // just take 2 points for each arrow (left and right)

      // left arrow's 1st point
      // pointStart {x:0,y:0}
      arrowPoint.x = pointStart.x;
      arrowPoint.y = pointStart.y > textDim.y ? pointStart.y - textGap : pointStart.y + textGap;
      leftArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));

      // left arrow's 2nd point  up-line
      // arrowPoint.y = textDim.y + textDim.height / 2;

      // TODO do not add this point
      //leftArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));

      // left arrow's 3rd point
      arrowPoint.x = textDim.x - OptConstant.Common.CoordinateLineDefaultTextGap;
      leftArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));

      // right arrow's 1st point
      arrowPoint.x = textDim.x + textDim.width + OptConstant.Common.CoordinateLineDefaultTextGap;
      rightArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));

      // right arrow's 2nd point
      arrowPoint.x = pointEnd.x;

      // TODO do not add this point
      // rightArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));

      // right arrow's 3rd point
      arrowPoint.y = pointEnd.y > textDim.y ? pointEnd.y - textGap : pointEnd.y + textGap;
      rightArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));

    } else {
      var P = 0.5 * textDim.height;
      var R = 0.5 * P;

      arrowPoint.x = textDim.x - R;
      arrowPoint.y = textDim.y + (textDim.height - P) / 2;
      leftArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
      arrowPoint.y += P;
      leftArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
      arrowPoint.x -= P;
      arrowPoint.y = textDim.y + textDim.height / 2;
      leftArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
      leftArrowPoints.push(new Point(leftArrowPoints[0].x, leftArrowPoints[0].y));
      arrowPoint.x = textDim.x + textDim.width + R;
      arrowPoint.y = textDim.y + (textDim.height - P) / 2;
      rightArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
      arrowPoint.y += P;
      rightArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
      arrowPoint.x += P;
      arrowPoint.y = textDim.y + textDim.height / 2;
      rightArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));
      rightArrowPoints.push(new Point(rightArrowPoints[0].x, rightArrowPoints[0].y));
    }

    Utils3.RotatePointsAboutCenter(this.Frame, arcLength, textFramePoints);
    Utils3.RotatePointsAboutCenter(this.Frame, arcLength, leftArrowPoints);
    Utils3.RotatePointsAboutCenter(this.Frame, arcLength, rightArrowPoints);
  }

  CreateDimensionLineSegment(pathCreator, path, points, bounds) {

    // T3Util.Log('=== wall CreateDimensionLineSegment pathCreator', pathCreator);
    T3Util.Log('=== wall ========================================================');
    T3Util.Log('=== wall CreateDimensionLineSegment path,points,bounds', path, points, bounds);

    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        pathCreator.MoveTo(points[i].x, points[i].y);
      } else {
        pathCreator.LineTo(points[i].x, points[i].y);
      }

      if (points[i].x < bounds.left || bounds.left === -1) {
        bounds.left = points[i].x;
      }
      if (points[i].x > bounds.right) {
        bounds.right = points[i].x;
      }
      if (points[i].y < bounds.top || bounds.top === -1) {
        bounds.top = points[i].y;
      }
      if (points[i].y > bounds.bottom) {
        bounds.bottom = points[i].y;
      }
    }
  }

  CreateCoordinateLineSegment(pathCreator, path, points, bounds) {

    // T3Util.Log('=== wall CreateDimensionLineSegment pathCreator', pathCreator);
    // T3Util.Log('=== wall ========================================================');
    T3Util.Log('=== wall CreateCoordinateLineSegment points/bounds', points, bounds);

    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        pathCreator.MoveTo(points[i].x, points[i].y);
      } else {
        pathCreator.LineTo(points[i].x, points[i].y);
      }

      if (points[i].x < bounds.left || bounds.left === -1) {
        bounds.left = points[i].x;
      }
      if (points[i].x > bounds.right) {
        bounds.right = points[i].x;
      }
      if (points[i].y < bounds.top || bounds.top === -1) {
        bounds.top = points[i].y;
      }
      if (points[i].y > bounds.bottom) {
        bounds.bottom = points[i].y;
      }
    }
  }

  CreateDimensionLineArrowHead(
    container: any,
    polygonCreator: any, // not used in this function but provided for consistency
    arrowPoints: Point[],
    bounds: Rectangle,
    userData: any
  ): void {
    T3Util.Log("= S.BaseDrawObject: CreateDimensionLineArrowHead - Input:", {
      container,
      polygonCreator,
      arrowPoints,
      bounds,
      userData,
    });

    // Make a deep copy of the input arrow points
    const copiedPoints: Point[] = Utils1.DeepCopy(arrowPoints);
    const numPoints: number = copiedPoints.length;
    // Update bounds based on each point in the copied array
    for (let i = 0; i < numPoints; i++) {
      bounds.left = Math.min(bounds.left, copiedPoints[i].x);
      bounds.right = Math.max(bounds.right, copiedPoints[i].x);
      bounds.top = Math.min(bounds.top, copiedPoints[i].y);
      bounds.bottom = Math.max(bounds.bottom, copiedPoints[i].y);
    }

    // Get the polygon's bounding rectangle from the copied points
    const polyRect: Rectangle = new Rectangle(0, 0, 0, 0);
    Utils2.GetPolyRect(polyRect, copiedPoints);

    // Adjust copied points relative to the bounding rectangle origin
    for (let i = 0; i < numPoints; i++) {
      copiedPoints[i].x -= polyRect.x;
      copiedPoints[i].y -= polyRect.y;
    }

    // Create a polygon shape using the SVG document
    const polygonShape = T3Gv.opt.svgDoc.CreateShape(
      OptConstant.CSType.Polygon
    );
    polygonShape.SetPoints(arrowPoints);
    polygonShape.SetEventBehavior(OptConstant.EventBehavior.All);
    polygonShape.SetID(OptConstant.SVGElementClass.DimLine);
    polygonShape.SetPos(0, 0);
    polygonShape.SetSize(polyRect.width, polyRect.height);
    polygonShape.SetFillColor("black");

    // Exclude from export if the Select flag is set in Dimensions
    if (Utils2.HasFlag(this.Dimensions, NvConstant.DimensionFlags.Select)) {
      polygonShape.ExcludeFromExport(true);
    }

    // Set user data if provided
    if (userData) {
      polygonShape.SetUserData(userData);
    }

    // Add the polygon shape to the container
    container.AddElement(polygonShape);

    T3Util.Log("= S.BaseDrawObject: CreateDimensionLineArrowHead - Output: Polygon shape created", polygonShape);
  }

  ConvertToNative(inputData: any, conversionOptions: any): any {
    T3Util.Log("= S.BaseDrawObject: ConvertToNative - Input:", { inputData, conversionOptions });
    const nativeResult = null;
    T3Util.Log("= S.BaseDrawObject: ConvertToNative - Output:", nativeResult);
    return nativeResult;
  }

  ContainsText(): boolean {
    T3Util.Log("= S.BaseDrawObject: ContainsText - Input: none");
    const hasText = this.DataID >= 0;
    T3Util.Log("= S.BaseDrawObject: ContainsText - Output:", hasText);
    return hasText;
  }

  GetToUnits(): number {
    T3Util.Log("= S.BaseDrawObject: GetToUnits - Input: none");

    // Retrieve major value and majorScale from ruler settings
    const major: number = T3Gv.docUtil.rulerConfig.major;
    const majorScale: number = T3Gv.docUtil.rulerConfig.majorScale;

    // Calculate unit conversion factor
    let conversionFactor: number = majorScale / major;

    // If not using inches, apply metric conversion factor
    if (!T3Gv.docUtil.rulerConfig.useInches) {
      conversionFactor *= T3Gv.docUtil.rulerConfig.metricConv;
    }

    T3Util.Log("= S.BaseDrawObject: GetToUnits - Output:", conversionFactor);
    return conversionFactor;
  }

  GetLengthInUnits(value: number, round: boolean = false): number {
    T3Util.Log("= S.BaseDrawObject: GetLengthInUnits input:", { value, round });
    let result = value * this.GetToUnits();
    if (!round) {
      const factor = Math.pow(10, T3Gv.docUtil.rulerConfig.dp);
      result = Math.round(result * factor) / factor;
    }
    T3Util.Log("= S.BaseDrawObject: GetLengthInUnits output:", result);
    return result;
  }

  GetFractionStringGranularity(input: any): number {
    T3Util.Log("= S.BaseDrawObject: GetFractionStringGranularity input:", { input });

    const rulerConfig = T3Gv.docUtil.rulerConfig;
    let granularity: number;

    if (rulerConfig.fractionaldenominator >= 1) {
      granularity = 1 / rulerConfig.fractionaldenominator;
    } else if (rulerConfig.majorScale <= 1) {
      granularity = 1 / 16;
    } else if (rulerConfig.majorScale <= 2) {
      granularity = 1 / 8;
    } else if (rulerConfig.majorScale <= 4) {
      granularity = 1 / 4;
    } else if (rulerConfig.majorScale <= 8) {
      granularity = 0.5;
    } else {
      granularity = 1;
    }

    T3Util.Log("= S.BaseDrawObject: GetFractionStringGranularity output:", granularity);
    return granularity;
  }

  NumberIsFloat(input: string): boolean {
    T3Util.Log("= S.BaseDrawObject: NumberIsFloat input:", input);

    const nineCharCode = '9'.charCodeAt(0);
    const zeroCharCode = '0'.charCodeAt(0);
    const dotCharCode = '.'.charCodeAt(0);

    for (let index = 0; index < input.length; index++) {
      const charCode = input.charCodeAt(index);
      if (!((charCode >= zeroCharCode && charCode <= nineCharCode) || charCode === dotCharCode)) {
        T3Util.Log("= S.BaseDrawObject: NumberIsFloat output:", false);
        return false;
      }
    }

    T3Util.Log("= S.BaseDrawObject: NumberIsFloat output:", true);
    return true;
  }

  ParseInchesString(input: string): number {
    T3Util.Log("= S.BaseDrawObject: ParseInchesString input:", input);

    // Trim the input string
    input = input.trim();

    let result = 0;
    // Check if there's a space separating whole number from fractional part
    const spaceIndex = input.indexOf(' ');
    if (spaceIndex >= 0) {
      // Extract the whole part and the fraction part
      const wholePartStr = input.substring(0, spaceIndex);
      const fractionPartStr = input.substring(spaceIndex + 1);

      const wholePart = parseFloat(wholePartStr);
      result = isNaN(wholePart) ? 0 : wholePart;

      // Check if the fraction part contains a '/'
      const slashIndex = fractionPartStr.indexOf('/');
      if (slashIndex >= 0) {
        const numeratorStr = fractionPartStr.substring(0, slashIndex);
        const denominatorStr = fractionPartStr.substring(slashIndex + 1);
        const numerator = parseFloat(numeratorStr);
        const denominator = parseFloat(denominatorStr);
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          result += numerator / denominator;
        }
      } else {
        // If no fraction separator found, try to parse the fraction part directly
        const fractionValue = parseFloat(fractionPartStr);
        if (!isNaN(fractionValue)) {
          result += fractionValue;
        }
      }
    } else {
      // If no space, attempt to parse the entire string as a number
      result = parseFloat(input);
    }

    T3Util.Log("= S.BaseDrawObject: ParseInchesString output:", result);
    return result;
  }

  ConvertToFeet(input: string): number {
    T3Util.Log("= S.BaseDrawObject: ConvertToFeet - Input:", input);

    // Trim the input and insert a space after the foot symbol if missing
    let processedInput = input.trim();
    let quoteIndex = processedInput.indexOf("'");
    if (
      quoteIndex >= 0 &&
      quoteIndex < processedInput.length - 1 &&
      processedInput.charAt(quoteIndex + 1) !== " "
    ) {
      processedInput = processedInput.substr(0, quoteIndex + 1) + " " + processedInput.substr(quoteIndex + 1);
    }

    // Split the input into parts
    const parts = processedInput.split(" ");
    let fractionStr = "";
    let inchStr = "";
    let footStr = "";

    // Determine the parts based on the presence of a fraction (e.g., 1/2)
    if (parts[parts.length - 1].indexOf("/") >= 0) {
      // Last part is a fraction
      fractionStr = parts[parts.length - 1];
      if (parts.length >= 2 && parts[parts.length - 2].endsWith("'")) {
        // Second to last part ends with a foot symbol: use it as the foot part
        footStr = parts[parts.length - 2];
        inchStr = "";
      }
      if (parts.length >= 3) {
        // Third to last part (if exists) becomes the foot part
        footStr = parts[parts.length - 3];
      }
    } else if (parts.length === 2) {
      footStr = parts[0];
      inchStr = parts[1];
    } else if (parts[0].endsWith('"')) {
      inchStr = parts[0];
    } else {
      footStr = parts[0];
    }

    // Remove trailing foot (') and inch (") symbols if present
    if (footStr.endsWith("'")) {
      footStr = footStr.substring(0, footStr.length - 1);
    }
    if (inchStr.endsWith('"')) {
      inchStr = inchStr.substring(0, inchStr.length - 1);
    }
    if (fractionStr.endsWith('"')) {
      fractionStr = fractionStr.substring(0, fractionStr.length - 1);
    }

    // Parse the numeric values for feet and inches
    let feet = footStr.length > 0 ? parseFloat(footStr) : 0;
    let inches = inchStr.length > 0 ? parseFloat(inchStr) : 0;

    // If a fraction is provided, split and add its value to inches
    if (fractionStr.length > 0) {
      const fractionParts = fractionStr.split("/");
      const numerator = parseInt(fractionParts[0], 10);
      const denominator = parseInt(fractionParts[1], 10);
      if (numerator !== 0 && denominator !== 0) {
        inches += numerator / denominator;
      }
    }

    // Set dimension flag based on inches and feet
    if (inches >= 12 && feet === 0) {
      this.Dimensions = Utils2.SetFlag(
        this.Dimensions,
        NvConstant.DimensionFlags.ShowFeetAsInches,
        true
      );
    } else if (feet > 0) {
      this.Dimensions = Utils2.SetFlag(
        this.Dimensions,
        NvConstant.DimensionFlags.ShowFeetAsInches,
        false
      );
    }

    // Convert the total inches into feet
    feet += inches / 12;

    T3Util.Log("= S.BaseDrawObject: ConvertToFeet - Output:", feet);
    return feet;
  }

  UnitsToCoord(value: number, offset: number): number {
    T3Util.Log("= S.BaseDrawObject: UnitsToCoord - Input:", { value, offset });

    // Ensure the SED session block is retrieved (result unused here)
    DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    const toUnits = this.GetToUnits();
    value += offset * T3Gv.docUtil.rulerConfig.majorScale;
    const result = value / toUnits;

    T3Util.Log("= S.BaseDrawObject: UnitsToCoord - Output:", result);
    return result;
  }

  ConvToUnits(value: number, offset: number): number {
    T3Util.Log("= S.BaseDrawObject: ConvToUnits input:", { value, offset });

    // Ensure the SED session block is retrieved (though result is unused here)
    DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    const toUnits = this.GetToUnits();
    const majorScale = T3Gv.docUtil.rulerConfig.majorScale;
    const result = value * toUnits - offset * majorScale;

    T3Util.Log("= S.BaseDrawObject: ConvToUnits output:", result);
    return result;
  }

  Frame2Poly(frame, polyPoints) {

    // left bottom
    polyPoints.push(new Point(frame.x, frame.y));

    // right bottom
    polyPoints.push(new Point(frame.x + frame.width, frame.y));

    // right top
    polyPoints.push(new Point(frame.x + frame.width, frame.y + frame.height));

    // left top
    polyPoints.push(new Point(frame.x, frame.y + frame.height));
  }

  SetBackgroundImageURL(imageURL: string): void {
    T3Util.Log("= S.BaseDrawObject: SetBackgroundImageURL - Input:", { imageURL });

    // TODO: Add implementation to set the background image URL.
    // For example:
    // this.backgroundImageURL = imageURL;

    T3Util.Log("= S.BaseDrawObject: SetBackgroundImageURL - Output: Completed");
  }

  WriteShapeData(outputStream: any, options: any) {
    T3Util.Log("= S.BaseDrawObject: WriteShapeData - Input:", { outputStream, options });

    // TODO: Add your implementation logic here

    T3Util.Log("= S.BaseDrawObject: WriteShapeData - Output: Completed");
  }

  CalcTextPosition(inputPosition: any): any {
    T3Util.Log("= S.BaseDrawObject: CalcTextPosition - Input:", inputPosition);

    // TODO: Add the logic to calculate the text position.
    // For now, we return a placeholder position.
    const calculatedPosition = { x: 0, y: 0 };

    T3Util.Log("= S.BaseDrawObject: CalcTextPosition - Output:", calculatedPosition);
    return calculatedPosition;
  }

  GetBlobBytes(): any {
    T3Util.Log("= S.BaseDrawObject: GetBlobBytes input: none");
    let blob: any = null;
    if (this.BlobBytesID >= 0) {
      blob = DataUtil.GetObjectPtr(this.BlobBytesID, false);
    }
    T3Util.Log("= S.BaseDrawObject: GetBlobBytes output:", blob);
    return blob;
  }

  GetEMFBlobBytes(): any {
    T3Util.Log("= S.BaseDrawObject: GetEMFBlobBytes input: EMFBlobBytesID =", this.EMFBlobBytesID);
    let emfBlob: any = null;
    if (this.EMFBlobBytesID >= 0) {
      emfBlob = DataUtil.GetObjectPtr(this.EMFBlobBytesID, false);
    }
    T3Util.Log("= S.BaseDrawObject: GetEMFBlobBytes output:", emfBlob);
    return emfBlob;
  }

  GetOleBlobBytes(): any {
    T3Util.Log("= S.BaseDrawObject: GetOleBlobBytes input:", { OleBlobBytesID: this.OleBlobBytesID });
    let oleBlob: any = null;
    if (this.OleBlobBytesID >= 0) {
      oleBlob = DataUtil.GetObjectPtr(this.OleBlobBytesID, false);
    }
    T3Util.Log("= S.BaseDrawObject: GetOleBlobBytes output:", oleBlob);
    return oleBlob;
  }

  // GetTable(preserve: boolean = false): any {
  //   T3Util.Log("= S.BaseDrawObject: GetTable - Input:", { preserve });
  //   let table = null;
  //   if (this.TableID >= 0) {
  //     table = DataUtil.GetObjectPtr(this.TableID, preserve);
  //   }
  //   T3Util.Log("= S.BaseDrawObject: GetTable - Output:", table);
  //   return table;
  // }

  // SetTable(table: any) {
  //   T3Util.Log("= S.BaseDrawObject: SetTable input:", { table });
  //   if (this.TableID >= 0) {
  //     if (table == null) {
  //       const existingTable = T3Gv.stdObj.GetObject(this.TableID);
  //       if (existingTable) {
  //         existingTable.Delete();
  //         T3Util.Log("= S.BaseDrawObject: SetTable output: deleted existing table");
  //       }
  //       this.TableID = -1;
  //     } else {
  //       const preservedTable = T3Gv.stdObj.PreserveBlock(this.TableID);
  //       if (preservedTable) {
  //         preservedTable.Data = table;
  //         T3Util.Log("= S.BaseDrawObject: SetTable output: updated existing table");
  //       }
  //     }
  //   } else {
  //     // const newTable = T3Gv.stdObj.CreateBlock(StateConstant.StoredObjectType.TABLE_OBJECT, table);
  //     // if (newTable) {
  //     //   this.TableID = newTable.ID;
  //     //   T3Util.Log("= S.BaseDrawObject: SetTable output: created new table with ID", this.TableID);
  //     // }
  //   }
  // }

  GetGraph(preserve: boolean = false): any {
    T3Util.Log("= S.BaseDrawObject: GetGraph input:", { preserve });
    let graph = null;

    if (this.GraphID >= 0) {
      graph = DataUtil.GetObjectPtr(this.GraphID, preserve);
    }

    T3Util.Log("= S.BaseDrawObject: GetGraph output:", graph);
    return graph;
  }

  SetGraph(graph: any): void {
    T3Util.Log("= S.BaseDrawObject: SetGraph input:", graph);

    if (this.GraphID >= 0) {
      if (graph == null) {
        const existingBlock = T3Gv.stdObj.GetObject(this.GraphID);
        if (existingBlock) {
          existingBlock.Delete();
        }
        this.GraphID = -1;
      } else {
        const preservedBlock = T3Gv.stdObj.PreserveBlock(this.GraphID);
        if (preservedBlock) {
          preservedBlock.Data = graph;
        }
      }
    } else {
      const newBlock = T3Gv.stdObj.CreateBlock(StateConstant.StoredObjectType.GraphObject, graph);
      if (newBlock) {
        this.GraphID = newBlock.ID;
      }
    }

    T3Util.Log("= S.BaseDrawObject: SetGraph output:", this.GraphID);
  }

  Flip(isHorizontalFlip: boolean): void {
    T3Util.Log("= S.BaseDrawObject: Flip - Input:", { isHorizontalFlip });

    // TODO: Implement the flip logic here.

    T3Util.Log("= S.BaseDrawObject: Flip - Output: Completed");
  }

  NoFlip(): boolean {
    T3Util.Log("= S.BaseDrawObject: NoFlip - Input: {}");
    const shouldNotFlip = this.hooks.length > 0;
    T3Util.Log("= S.BaseDrawObject: NoFlip - Output:", shouldNotFlip);
    return shouldNotFlip;
  }

  NoRotate(): boolean {
    T3Util.Log("= S.BaseDrawObject: NoRotate - Input: none");
    const result = false;
    T3Util.Log("= S.BaseDrawObject: NoRotate - Output:", result);
    return result;
  }

  NoGrow(): boolean {
    T3Util.Log("= S.BaseDrawObject: NoGrow input: none");
    const result = (this.colorfilter & StyleConstant.ColorFilters.NCResize) > 0;
    T3Util.Log("= S.BaseDrawObject: NoGrow output:", result);
    return result;
  }

  MaintainPoint(currentPoint: any, targetPoint: any, adjustmentX: number, adjustmentY: number, shouldApply: boolean): boolean {
    T3Util.Log("= S.BaseDrawObject: MaintainPoint - Input:", {
      currentPoint,
      targetPoint,
      adjustmentX,
      adjustmentY,
      shouldApply
    });
    const result = false;
    T3Util.Log("= S.BaseDrawObject: MaintainPoint - Output:", result);
    return result;
  }

  AllowTextEdit() {
    T3Util.Log("= S.BaseDrawObject: AllowTextEdit - Input:", {
      TextFlags: this.TextFlags,
      objecttype: this.objecttype,
      flags: this.flags,
      FromEditShapeOutline: this.FromEditShapeOutline
    });

    if ((this.TextFlags & NvConstant.TextFlags.None) > 0) {
      T3Util.Log("= S.BaseDrawObject: AllowTextEdit - Output: false (None flag is set)");
      return false;
    }

    if (
      this.objecttype === NvConstant.FNObjectTypes.ShapeContainer &&
      (this.TextFlags & NvConstant.TextFlags.AttachA) === 0 &&
      (this.TextFlags & NvConstant.TextFlags.AttachB) === 0
    ) {
      T3Util.Log("= S.BaseDrawObject: AllowTextEdit - Output: false (Shape container without attach flags)");
      return false;
    }

    if (this.flags & NvConstant.ObjFlags.Lock) {
      T3Util.Log("= S.BaseDrawObject: AllowTextEdit - Output: false (Object is locked)");
      return false;
    }

    if (this.FromEditShapeOutline) {
      T3Util.Log("= S.BaseDrawObject: AllowTextEdit - Output: false (FromEditShapeOutline is true)");
      return false;
    }

    // const table = this.GetTable(false);
    // if (table) {
    //   let cellIndex = -1;
    //   if (T3Gv.opt.Table_GetActiveID() === table.BlockID) {
    //     cellIndex = table.select;
    //   }
    //   if (cellIndex < 0) {
    //     cellIndex = T3Gv.opt.Table_GetFirstTextCell(table);
    //   }
    //   const allowCellEdit = T3Gv.opt.Table_AllowCellTextEdit(table, cellIndex);
    //   T3Util.Log("= S.BaseDrawObject: AllowTextEdit - Output:", allowCellEdit, "(Table cell text edit check)");
    //   return allowCellEdit;
    // }

    T3Util.Log("= S.BaseDrawObject: AllowTextEdit - Output: true (No table present)");
    return true;
  }

  AllowDoubleClick() {
    return !1
  }

  ChangeBackgroundColor(desiredColor: string, applyImmediately: boolean) {
    T3Util.Log("= S.BaseDrawObject: ChangeBackgroundColor - Input:", { desiredColor, applyImmediately });
    const result = false;
    T3Util.Log("= S.BaseDrawObject: ChangeBackgroundColor - Output:", result);
    return result;
  }

  UseEdges(edgeData: any, threshold: number, isActive: boolean, radius: number, importance: number, extraParam: any): boolean {
    T3Util.Log("= S.BaseDrawObject: UseEdges - Input:", { edgeData, threshold, isActive, radius, importance, extraParam });

    // Placeholder logic: return false.
    const result = false;

    T3Util.Log("= S.BaseDrawObject: UseEdges - Output:", result);
    return result;
  }

  ApplyStyle(style: any, applyTextStyle: any) {
    T3Util.Log("= S.BaseDrawObject: ApplyStyle - Input:", { style, applyTextStyle });

    let copiedStyle = Utils1.DeepCopy(style);
    let defaultTextStyle = Utils3.FindStyle(OptConstant.Common.TextBlockStyle);

    if (
      !(this.colorfilter & StyleConstant.ColorFilters.NCStyle)
    ) {
      let textColorObj = { Color: copiedStyle.Text.Paint.Color };
      let textCSS = { color: copiedStyle.Text.Paint.Color };

      if (applyTextStyle) {
        if (
          this.DrawingObjectBaseClass !== OptConstant.DrawObjectBaseClass.Shape
        ) {
          copiedStyle.Fill = Utils1.DeepCopy(this.StyleRecord.Fill);
          copiedStyle.Text = Utils1.DeepCopy(defaultTextStyle.Text);
          textColorObj = { Color: defaultTextStyle.Text.Paint.Color };
          textCSS = { color: defaultTextStyle.Text.Paint.Color };
        } else if (this.UseTextBlockColor()) {
          copiedStyle.Text = Utils1.DeepCopy(defaultTextStyle.Text);
          textColorObj = { Color: defaultTextStyle.Text.Paint.Color };
          textCSS = { color: defaultTextStyle.Text.Paint.Color };
        }
      }

      if (this.StyleRecord.Fill.Paint.FillType === NvConstant.FillTypes.Transparent) {
        copiedStyle.Fill.Paint.FillType = NvConstant.FillTypes.Transparent;
        copiedStyle.Fill.Hatch = 0;
      }

      if (this.StyleRecord.Line.Thickness === 0) {
        copiedStyle.Line.Thickness = 0;
      }

      if (copiedStyle.Line.LinePattern === 0) {
        copiedStyle.Line.LinePattern = this.StyleRecord.Line.LinePattern;
      }

      copiedStyle.Fill.Paint.Opacity = this.StyleRecord.Fill.Paint.Opacity;
      copiedStyle.Fill.Paint.EndOpacity = this.StyleRecord.Fill.Paint.EndOpacity;
      copiedStyle.Line.Paint.Opacity = this.StyleRecord.Line.Paint.Opacity;
      copiedStyle.Line.Paint.EndOpacity = this.StyleRecord.Line.Paint.EndOpacity;
      copiedStyle.Text.Paint.Opacity = this.StyleRecord.Text.Paint.Opacity;
      copiedStyle.Text.Paint.EndOpacity = this.StyleRecord.Text.Paint.EndOpacity;

      this.ChangeTextAttributes(textCSS, textColorObj);
      this.StyleRecord = copiedStyle;
    }

    T3Util.Log("= S.BaseDrawObject: ApplyStyle - Output:", { StyleRecord: this.StyleRecord });
  }

  GenericIcon(iconParams: any): any {
    T3Util.Log("= S.BaseDrawObject: GenericIcon - Input:", iconParams);

    // Create an IMAGE shape from the SVG document
    const iconShape = iconParams.svgDoc.CreateShape(OptConstant.CSType.Image);

    // Set the user data
    if (iconParams.userData != null) {
      iconShape.SetUserData(iconParams.userData);
    } else {
      iconShape.SetUserData(OptConstant.SVGElementClass.Icon);
    }

    // Set size and position
    iconShape.SetSize(iconParams.iconSize, iconParams.iconSize);
    iconShape.SetPos(iconParams.x, iconParams.y);

    // Set image URL and appearance properties
    iconShape.SetURL(iconParams.imageURL);
    iconShape.SetFillOpacity(1);
    iconShape.SetStrokeWidth(0);
    iconShape.SetID(iconParams.iconID);
    iconShape.SetCursor(iconParams.cursorType);
    iconShape.ExcludeFromExport(true);

    T3Util.Log("= S.BaseDrawObject: GenericIcon - Output:", iconShape);
    return iconShape;
  }

  AddIcon(svgDoc: any, container: any, iconParams: any): any {
    T3Util.Log("= S.BaseDrawObject: AddIcon - Input:", { svgDoc, container, iconParams });

    if (container) {
      const frame = this.Frame;
      // Calculate position for the icon
      iconParams.x = frame.width - this.iconShapeRightOffset - this.iconSize - (this.nIcons * this.iconSize);
      iconParams.y = frame.height - this.iconShapeBottomOffset - this.iconSize;
      // Create icon using the generic icon function
      const iconShape = this.GenericIcon(iconParams);

      // Increment icon counter and add the icon shape to the container
      this.nIcons++;
      container.AddElement(iconShape);

      T3Util.Log("= S.BaseDrawObject: AddIcon - Output:", iconShape);
      return iconShape;
    }

    T3Util.Log("= S.BaseDrawObject: AddIcon - Output: container not provided");
    return null;
  }

  GetIconShape() {
    return this.BlockID
  }

  HasIcons() {

  }

  AddIcons(svgDoc: any, container: any): void {
    T3Util.Log("= S.BaseDrawObject: AddIcons - Input:", { svgDoc, container });

    if (container) {
      this.nIcons = 0;
      let iconParams = {
        svgDoc: svgDoc,
        iconSize: this.iconSize,
        cursorType: CursorConstant.CursorType.POINTER
      };

      // Data action icon if available

      this.nIcons = 0;
      if (!this.bInGroup) {
        // Comment icon
        if (this.CommentID >= 0) {
          iconParams.iconID = OptConstant.ShapeIconType.Comment;
          iconParams.imageURL = Constants.FilePath_Icons + Constants.Icon_Comment;
          const commentIcon = this.AddIcon(svgDoc, container, iconParams);
          const commentUserData = OptConstant.SVGElementClass.Icon + '.' + this.BlockID;
          commentIcon.SetUserData(commentUserData);
        }

        // Hyperlink icon
        if (this.HyperlinkText && Utils1.ResolveHyperlink(this.HyperlinkText)) {
          iconParams.iconID = OptConstant.ShapeIconType.HyperLink;
          iconParams.imageURL = Constants.FilePath_Icons + Constants.Icon_Hyperlink;
          const hyperlinkIcon = this.AddIcon(svgDoc, container, iconParams);
          hyperlinkIcon.SetHyperlinkAttribute(this.HyperlinkText);
          hyperlinkIcon.SetTooltip(Utils1.ResolveHyperlinkForDisplay(this.HyperlinkText));
        }
        // Attachment icon
        if (this.AttachmentInfo) {
          iconParams.iconID = OptConstant.ShapeIconType.Attachment;
          iconParams.imageURL = '../../../Styles/Img/Icons/attachment_icon.png';
          this.AddIcon(svgDoc, container, iconParams);
        }
        // Expanded view icon
        if (this.ExpandedViewID >= 0) {
          iconParams.iconID = OptConstant.ShapeIconType.ExpandedView;
          iconParams.imageURL = Constants.FilePath_Icons + Constants.Icon_ExpandedView;
          const expandedViewIcon = this.AddIcon(svgDoc, container, iconParams);
          expandedViewIcon.SetCustomAttribute('_expextendtt_', this.ExpandedViewID);
        }
        // Note icon with hover functionality
        if (this.NoteID !== -1 || TextUtil.NoteIsShowing(this.BlockID, null)) {
          let noteIcon: any, noteHoverTimeout: any;
          iconParams.iconID = OptConstant.ShapeIconType.Notes;
          iconParams.imageURL = Constants.FilePath_Icons + Constants.Icon_Note;
          if (this.moreflags & OptConstant.ObjMoreFlags.UseInfoNoteIcon) {
            iconParams.imageURL = Constants.FilePath_Icons + Constants.Icon_Info;
          }
          noteIcon = this.AddIcon(svgDoc, container, iconParams);
          noteIcon.SetCustomAttribute('_expnotett_', this.NoteID);
          const self = this;
          const noteDom = noteIcon.DOMElement();
          $(noteDom).hover(
            function () {
              noteHoverTimeout = setTimeout(() => {
                if (!T3Gv.opt.bInNoteEdit) {
                  T3Gv.opt.ShowNote(self.BlockID, null);
                }
              }, 750);
            },
            function () {
              if (!T3Gv.opt.bInNoteEdit) {
                T3Gv.opt.HideNote(self.BlockID, null);
              }
              clearTimeout(noteHoverTimeout);
            }
          );
        }
        // Field data icon with tooltip and double tap functionality
      }
    }
    T3Util.Log("= S.BaseDrawObject: AddIcons - Output: Completed");
  }

  HideAllIcons(unused: any, svgLayer: any): void {
    T3Util.Log("= S.BaseDrawObject: HideAllIcons - Input: svgLayer =", svgLayer);

    this.nIcons = 0;

    const hyperlinkIcon = svgLayer.GetElementById(OptConstant.ShapeIconType.HyperLink);
    const notesIcon = svgLayer.GetElementById(OptConstant.ShapeIconType.Notes);
    const commentIcon = svgLayer.GetElementById(OptConstant.ShapeIconType.Comment);
    const fieldDataIcon = svgLayer.GetElementById(OptConstant.ShapeIconType.FieldData);

    if (hyperlinkIcon) {
      svgLayer.RemoveElement(hyperlinkIcon);
    }

    if (notesIcon) {
      svgLayer.RemoveElement(notesIcon);
    }
    if (commentIcon) {
      svgLayer.RemoveElement(commentIcon);
    }
    if (fieldDataIcon) {
      svgLayer.RemoveElement(fieldDataIcon);
    }

    T3Util.Log("= S.BaseDrawObject: HideAllIcons - Output: Icons hidden");
  }

  GetHyperlink(input: string): string {
    T3Util.Log("= S.BaseDrawObject: GetHyperlink - Input:", input);
    let hyperlinkIndex: number | undefined;
    // const table = this.GetTable(false);

    if (input) {
      if (typeof input === "string" && input.split) {
        const parts = input.split(".");
        if (parts[1]) {
          hyperlinkIndex = parseInt(parts[1], 10);
        }
      }
    }

    // else if (table && table.select >= 0) {
    //   hyperlinkIndex = table.select;
    // }

    let result: string;
    // if (table && typeof hyperlinkIndex === "number" && hyperlinkIndex >= 0 && hyperlinkIndex < table.cells.length) {
    //   result = table.cells[hyperlinkIndex].hyperlink;
    // } else

    {
      result = this.HyperlinkText;
    }

    T3Util.Log("= S.BaseDrawObject: GetHyperlink - Output:", result);
    return result;
  }

  IsNoteCell(cellIdentifier: any): any {
    T3Util.Log("= S.BaseDrawObject: IsNoteCell - Input:", cellIdentifier);

    let cellIndex: number | undefined;
    // const table = this.GetTable(false);

    if (cellIdentifier) {
      if (typeof cellIdentifier.split === "function") {
        const parts = cellIdentifier.split(".");
        if (parts[1]) {
          cellIndex = parseInt(parts[1], 10);
        }
      }
    }
    // else if (table && table.select >= 0) {
    //   cellIndex = table.select;
    // }

    let noteCell = null;
    // if (table && typeof cellIndex === "number" && cellIndex >= 0 && cellIndex < table.cells.length) {
    //   noteCell = table.cells[cellIndex];
    // }

    T3Util.Log("= S.BaseDrawObject: IsNoteCell - Output:", noteCell);
    return noteCell;
  }

  SetCursors() {
    T3Util.Log("= S.BaseDrawObject: SetCursors - Input: BlockID =", this.BlockID);

    // Get the main SVG element for this object
    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    let updateTextCursor = false;

    if (!(this.flags & NvConstant.ObjFlags.Lock) && svgElement) {
      if (OptCMUtil.GetEditMode() === NvConstant.EditState.Default) {
        // Set cursor for the main shape element
        const shapeElement = svgElement.GetElementById(OptConstant.SVGElementClass.Shape);
        if (shapeElement) {
          if (this.objecttype === NvConstant.FNObjectTypes.FrameContainer) {
            shapeElement.SetCursor(CursorConstant.CursorType.DEFAULT);
          } else {
            shapeElement.SetCursor(CursorConstant.CursorType.ADD);
          }
        }

        // Set cursors for various icon elements to POINTER
        let iconElement = svgElement.GetElementById(OptConstant.ShapeIconType.HyperLink);
        if (iconElement) iconElement.SetCursor(CursorConstant.CursorType.POINTER);

        iconElement = svgElement.GetElementById(OptConstant.ShapeIconType.Notes);
        if (iconElement) iconElement.SetCursor(CursorConstant.CursorType.POINTER);

        iconElement = svgElement.GetElementById(OptConstant.ShapeIconType.ExpandedView);
        if (iconElement) iconElement.SetCursor(CursorConstant.CursorType.POINTER);

        iconElement = svgElement.GetElementById(OptConstant.ShapeIconType.Comment);
        if (iconElement) iconElement.SetCursor(CursorConstant.CursorType.POINTER);

        iconElement = svgElement.GetElementById(OptConstant.ShapeIconType.Attachment);
        if (iconElement) iconElement.SetCursor(CursorConstant.CursorType.POINTER);

        iconElement = svgElement.GetElementById(OptConstant.ShapeIconType.FieldData);
        if (iconElement) iconElement.SetCursor(CursorConstant.CursorType.POINTER);

        // Set cursor for "slope" element
        const slopeElement = svgElement.GetElementById(OptConstant.SVGElementClass.Slop);
        if (slopeElement) {
          slopeElement.SetCursor(CursorConstant.CursorType.ADD);
        }

        // Check for active text editing element
        const activeEditElement = T3Gv.opt.svgDoc.GetActiveEdit();
        if (this.DataID && this.DataID >= 0 && svgElement.textElem) {
          if (svgElement.textElem === activeEditElement) {
            if (shapeElement) {
              shapeElement.SetCursor(CursorConstant.CursorType.TEXT);
            }
            svgElement.textElem.SetCursorState(CursorConstant.CursorState.EditLink);
          } else {
            svgElement.textElem.SetCursorState(CursorConstant.CursorState.LinkOnly);
          }
        }

        // If dimensions should always be shown or if selected, adjust dimension text cursors
        if (
          (this.Dimensions & NvConstant.DimensionFlags.Always ||
            this.Dimensions & NvConstant.DimensionFlags.Select) &&
          this.IsSelected()
        ) {
          const dimensionTextElements = svgElement.GetElementListWithId(OptConstant.SVGElementClass.DimText);
          for (let idx = 0; idx < dimensionTextElements.length; idx++) {
            dimensionTextElements[idx].SetCursorState(CursorConstant.CursorState.EditOnly);
            if (dimensionTextElements[idx] === activeEditElement) {
              updateTextCursor = true;
            }
          }
          if (updateTextCursor) {
            // Clear cursor for main shape and slope if text edit is active
            if (shapeElement) {
              shapeElement.SetCursor(null);
            }
            if (slopeElement) {
              slopeElement.SetCursor(null);
            }
          }
        }
      } else {
        // Clear cursors if not in default edit mode
        this.ClearCursors();
      }
    } else {
      // If object is locked or no svgElement found, clear cursors
      this.ClearCursors();
    }

    T3Util.Log("= S.BaseDrawObject: SetCursors - Output: Completed");
  }

  ClearCursors() {
    T3Util.Log("= S.BaseDrawObject: ClearCursors - Input: {}");
    const element = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    if (element) {
      element.ClearAllCursors();
      if (element.textElem) {
        element.textElem.SetCursorState(CursorConstant.CursorState.None);
      }
    }
    T3Util.Log("= S.BaseDrawObject: ClearCursors - Output: Completed");
  }

  PostCreateShapeCallback(shape: any, container: any, config: any, additionalInfo: any): void {
    T3Util.Log("= S.BaseDrawObject PostCreateShapeCallback - Input:", { shape, container, config, additionalInfo });

    // (Any additional processing logic can be added here)

    T3Util.Log("= S.BaseDrawObject PostCreateShapeCallback - Output: completed");
  }

  SVGTokenizerHook(svgElementData: any): any {
    T3Util.Log("= S.BaseDrawObject: SVGTokenizerHook - Input:", svgElementData);

    // Process the SVG element data only if tokenization is enabled
    if (T3Gv.opt.bTokenizeStyle) {
      const currentColorFilter = this.colorfilter;
      svgElementData = Utils1.DeepCopy(svgElementData);

      // If all colors are disabled, return the unchanged data
      if (currentColorFilter === StyleConstant.ColorFilters.NCAll) {
        T3Util.Log("= S.BaseDrawObject: SVGTokenizerHook - Output (NCAll):", svgElementData);
        return svgElementData;
      }

      // Process Fill settings if fill color is allowed
      if (!(currentColorFilter & StyleConstant.ColorFilters.NCFill)) {
        if (svgElementData.Fill.Paint.FillType === NvConstant.FillTypes.Gradient) {
          svgElementData.Fill.Paint.FillType = NvConstant.FillTypes.Solid;
        }
        svgElementData.Fill.Paint.Color = Basic.Symbol.CreatePlaceholder(
          Basic.Symbol.Placeholder.FillColor,
          svgElementData.Fill.Paint.Color
        );
      }

      // Process Line color if line color is allowed
      if (!(currentColorFilter & StyleConstant.ColorFilters.NCLine)) {
        svgElementData.Line.Paint.Color = Basic.Symbol.CreatePlaceholder(
          Basic.Symbol.Placeholder.LineColor,
          svgElementData.Line.Paint.Color
        );
      }

      // Process Line thickness if line thickness is allowed
      if (!(currentColorFilter & StyleConstant.ColorFilters.NCLineThick)) {
        svgElementData.Line.Thickness = Basic.Symbol.CreatePlaceholder(
          Basic.Symbol.Placeholder.LineThick,
          svgElementData.Line.Thickness
        );
      }
    }

    T3Util.Log("= S.BaseDrawObject: SVGTokenizerHook - Output:", svgElementData);
    return svgElementData;
  }

  CancelObjectDraw(): boolean {
    T3Util.Log("= S.BaseDrawObject: CancelObjectDraw - Input: {}");

    LMEvtUtil.UnbindActionClickHammerEvents();
    this.ResetAutoScrollTimer();

    T3Util.Log("= S.BaseDrawObject: CancelObjectDraw - Output: true");
    return true;
  }

  GetAlignRect(): any {
    T3Util.Log("= S.BaseDrawObject: GetAlignRect - Input:", { Frame: this.Frame });
    const alignRect = $.extend(true, {}, this.Frame);
    T3Util.Log("= S.BaseDrawObject: GetAlignRect - Output:", { alignRect });
    return alignRect;
  }

  GetCustomConnectPointsDirection() {
    return null
  }

  GetTextures(textures: string[]): void {
    T3Util.Log("= S.BaseDrawObject: GetTextures - Input:", { textures });

    const textureFillType = NvConstant.FillTypes.Texture;

    // Process fill texture
    if (this.StyleRecord.Fill.Paint.FillType === textureFillType) {
      const fillTexture = this.StyleRecord.Fill.Paint.Texture;
      if (textures.indexOf(fillTexture) === -1) {
        textures.push(fillTexture);
      }
    }

    // Process line texture
    if (this.StyleRecord.Line.Paint.FillType === textureFillType) {
      const lineTexture = this.StyleRecord.Line.Paint.Texture;
      if (textures.indexOf(lineTexture) === -1) {
        textures.push(lineTexture);
      }
    }

    // Process text texture
    if (this.StyleRecord.Text.Paint.FillType === textureFillType) {
      const textTexture = this.StyleRecord.Text.Paint.Texture;
      if (textures.indexOf(textTexture) === -1) {
        textures.push(textTexture);
      }
    }

    // // Process table textures if table exists
    // const table = this.GetTable(false);
    // if (table) {
    //   T3Gv.opt.Table_GetTextures(table, textures);
    // }

    T3Util.Log("= S.BaseDrawObject: GetTextures - Output:", { textures });
  }

  GetContrastingColorName(e: any): string {
    T3Util.Log("= S.BaseDrawObject: GetContrastingColorName - Input:", e);

    const color = this.StyleRecord.Line.Paint.Color;
    const red = parseInt(color.substr(1, 2), 16);
    const green = parseInt(color.substr(3, 2), 16);
    const blue = parseInt(color.substr(5, 2), 16);
    const brightness = (299 * red + 587 * green + 114 * blue) / 1000;
    const result = brightness >= 128 ? 'black' : 'white';

    T3Util.Log("= S.BaseDrawObject: GetContrastingColorName - Output:", result);
    return result;
  }

  SetRuntimeEffects(effectParams: any): void {
    T3Util.Log("= S.BaseDrawObject: SetRuntimeEffects - Input:", { effectParams });
    const targetElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    if (targetElement) {
      this.ApplyEffects(targetElement, effectParams, false);
    }
    T3Util.Log("= S.BaseDrawObject: SetRuntimeEffects - Output: Completed");
  }

  ApplyEffects(targetElement: any, effectParams: any, isSecondary: boolean) {
    return;

    T3Util.Log("= S.BaseDrawObject: ApplyEffects - Input:", { targetElement, effectParams, isSecondary });

    targetElement = targetElement || T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);

    if (
      targetElement &&
      T3Gv.opt.bDrawEffects &&
      !T3Gv.opt.bTokenizeStyle
    ) {
      const shapeElement = targetElement.GetElementById(OptConstant.SVGElementClass.Shape);
      const groupElement = targetElement.shapeGroup || targetElement;
      const outsideEffectType = this.StyleRecord.OutsideEffect
        ? this.StyleRecord.OutsideEffect.OutsideType
        : 0;

      if (
        outsideEffectType === StyleConstant.OutEffect.Refl ||
        outsideEffectType === StyleConstant.OutEffect.Cast
      ) {
        this.SetEffects(shapeElement, effectParams, isSecondary, null, false, isSecondary);
      } else {
        if (!isSecondary) {
          this.SetEffects(shapeElement, effectParams, isSecondary, null, true, false);
        }
        this.SetEffects(groupElement, effectParams, isSecondary, null, false, true);
      }

      T3Util.Log("= S.BaseDrawObject: ApplyEffects - Output: Effects applied");
    } else {
      T3Util.Log("= S.BaseDrawObject: ApplyEffects - Output: No target element or effects disabled");
    }
  }

  SetEffects(
    targetElement,              // the element on which to set effects
    flagOverrideGlow,           // boolean flag to override glow settings
    isSecondary,                // boolean flag indicating secondary effect calculation
    styleOverride,              // optional style record override
    skipOutsideEffects,         // boolean flag to skip outside effects processing
    skipInsideEffects           // boolean flag to skip inside effects processing
  ) {
    T3Util.Log("= S.BaseDrawObject: SetEffects - Input:", {
      targetElement,
      flagOverrideGlow,
      isSecondary,
      styleOverride,
      skipOutsideEffects,
      skipInsideEffects
    });

    const frame = this.Frame;
    let effectsArray = [];
    let overrideGlowColor = null;

    if (targetElement) {
      const styleUsed = styleOverride || this.StyleRecord;

      if (styleUsed != null) {
        // Use override glow color if provided in dataStyleOverride
        if (this.dataStyleOverride && this.dataStyleOverride.glowColor) {
          overrideGlowColor = this.dataStyleOverride.glowColor;
        }

        // Calculate the effect settings based on the frame, style, and secondary flag
        const effectSettings = this.CalcEffectSettings(frame, styleUsed, isSecondary);

        if (!skipOutsideEffects) {
          // Process outside effects if any
          if (effectSettings.outside.type) {
            // If flagOverrideGlow is true and the outside type is GLOW, then push its settings
            if (flagOverrideGlow && effectSettings.outside.type.id === BConstant.EffectType.GLOW.id) {
              effectsArray.push({
                type: effectSettings.outside.type,
                params: effectSettings.outside.settings
              });
            } else if (!flagOverrideGlow) {
              effectsArray.push({
                type: effectSettings.outside.type,
                params: effectSettings.outside.settings
              });
            }
          }

          if (flagOverrideGlow) {
            // Add a default glow effect for collaboration
            effectsArray.push({
              type: BConstant.EffectType.GLOW,
              params: {
                color: "#FFD64A",
                size: 4,
                asSecondary: true
              }
            });
          } else if (this.collabGlowColor) {
            // Use collaboration glow color if available
            effectsArray.push({
              type: BConstant.EffectType.GLOW,
              params: {
                color: this.collabGlowColor,
                size: 6,
                asSecondary: true
              }
            });
          } else if (overrideGlowColor) {
            // Fallback to override color from dataStyleOverride
            effectsArray.push({
              type: BConstant.EffectType.GLOW,
              params: {
                color: overrideGlowColor,
                size: 4,
                asSecondary: true
              }
            });
          }
        }

        // Process inside effects if available
        if (effectSettings.inside.type && !skipInsideEffects) {
          effectsArray.push({
            type: effectSettings.inside.type,
            params: effectSettings.inside.settings
          });
        }

        // Apply the calculated effects to the target element
        targetElement.Effects().SetEffects(effectsArray, frame);
      }
    }

    T3Util.Log("= S.BaseDrawObject: SetEffects - Output:", {
      appliedEffects: effectsArray,
      frame
    });
  }

  CalcEffectSettings(frame: { width: number; height: number }, style: any, isSecondary: boolean): any {
    T3Util.Log("= S.BaseDrawObject CalcEffectSettings - Input:", { frame, style, isSecondary });

    let minDimension: number;
    let secondaryOffset: number;
    let shadowParam: number;
    const widthWithThickness = frame.width;
    const heightWithThickness = frame.height;
    const lineThickness = style.Line.Thickness;
    const extent: { left: number; top: number; right: number; bottom: number } = {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    };
    const config: any = {};

    // Adjust line thickness if necessary.
    let adjustedThickness = lineThickness;
    if (isSecondary && adjustedThickness < 2) {
      adjustedThickness = 2;
    }
    // Increase overall dimensions by thickness.
    let adjustedWidth = widthWithThickness + adjustedThickness;
    let adjustedHeight = heightWithThickness + adjustedThickness;

    // Determine the minimum dimension.
    minDimension = Math.min(adjustedWidth, adjustedHeight);
    minDimension = isSecondary ? adjustedThickness : Math.min(minDimension, 50);

    // Initialize inside and outside configurations.
    config.inside = {};
    config.outside = {};

    // Process Outside Effects.
    if (style.OutsideEffect && style.OutsideEffect.OutsideType) {
      config.outside.settings = {};
      switch (style.OutsideEffect.OutsideType) {
        case StyleConstant.OutEffect.Drop:
          extent.left = minDimension * style.OutsideEffect.OutsideExtent_Left;
          extent.top = minDimension * style.OutsideEffect.OutsideExtent_Top;
          extent.right = minDimension * style.OutsideEffect.OutsideExtent_Right;
          extent.bottom = minDimension * style.OutsideEffect.OutsideExtent_Bottom;
          if (isSecondary) {
            if (extent.left) extent.left = Math.min(extent.left, 2);
            if (extent.top) extent.top = Math.min(extent.top, 2);
            if (extent.right) extent.right = Math.min(extent.right, 2);
            if (extent.bottom) extent.bottom = Math.min(extent.bottom, 2);
          }
          config.outside.type = BConstant.EffectType.DROPSHADOW;
          config.outside.settings.size = Math.min(Math.max((extent.left + extent.right) / 2, 2), 50);
          config.outside.settings.xOff = extent.right / 2 - extent.left / 2;
          config.outside.settings.yOff = extent.bottom / 2 - extent.top / 2;
          config.outside.settings.color = style.OutsideEffect.Color;
          config.outside.settings.asSecondary = true;
          extent.left = Math.max(-config.outside.settings.xOff + config.outside.settings.size, 0);
          extent.top = Math.max(-config.outside.settings.yOff + config.outside.settings.size, 0);
          extent.right = Math.max(config.outside.settings.xOff + config.outside.settings.size, 0);
          extent.bottom = Math.max(config.outside.settings.yOff + config.outside.settings.size, 0);
          break;

        case StyleConstant.OutEffect.Glow:
          extent.left = extent.top = extent.right = extent.bottom = Math.max(minDimension * style.OutsideEffect.OutsideExtent_Left, 2);
          config.outside.type = BConstant.EffectType.GLOW;
          config.outside.settings.size = Math.min(Math.max((extent.left + extent.right) / 2, 2), 50);
          config.outside.settings.color = style.OutsideEffect.Color;
          config.outside.settings.asSecondary = true;
          extent.left = extent.top = extent.right = extent.bottom = config.outside.settings.size;
          break;

        case StyleConstant.OutEffect.Refl:
          extent.left = adjustedWidth * style.OutsideEffect.OutsideExtent_Left;
          extent.right = adjustedWidth * style.OutsideEffect.OutsideExtent_Right;
          extent.bottom = adjustedHeight * style.OutsideEffect.OutsideExtent_Bottom;
          config.outside.type = BConstant.EffectType.REFLECT;
          config.outside.settings.xOff = extent.right - extent.left;
          config.outside.settings.yOff = extent.bottom;
          config.outside.settings.asSecondary = true;
          secondaryOffset = Element.Effects.CalcSecondaryEffectOffset(config.outside.settings.xOff, config.outside.settings.yOff);
          extent.left = Math.max(-secondaryOffset, 0);
          extent.right = Math.max(secondaryOffset, 0);
          break;

        case StyleConstant.OutEffect.Cast:
          extent.left = adjustedWidth * style.OutsideEffect.OutsideExtent_Left;
          extent.right = adjustedWidth * style.OutsideEffect.OutsideExtent_Right;
          extent.bottom = adjustedHeight * style.OutsideEffect.OutsideExtent_Bottom;
          config.outside.type = BConstant.EffectType.CASTSHADOW;
          config.outside.settings.xOff = extent.right - extent.left;
          config.outside.settings.yOff = extent.bottom;
          config.outside.settings.size = Math.min(Math.max(0.1 * Math.abs(extent.bottom), 2), 25);
          config.outside.settings.asSecondary = true;
          secondaryOffset = Element.Effects.CalcSecondaryEffectOffset(config.outside.settings.xOff, config.outside.settings.yOff);
          extent.left = Math.max(-secondaryOffset + config.outside.settings.size, 0);
          extent.right = Math.max(secondaryOffset + config.outside.settings.size, 0);
          extent.bottom = Math.max(config.outside.settings.yOff + config.outside.settings.size, 0);
          break;
      }
    }

    // Process Fill Effects (Inside Effects) if available and if not secondary.
    if (style.Fill.FillEffect && !isSecondary) {
      minDimension = Math.min(adjustedWidth, adjustedHeight);
      config.inside.settings = {};
      switch (style.Fill.FillEffect) {
        case StyleConstant.FillEffect.Gloss:
          config.inside.type = BConstant.EffectType.GLOSS;
          config.inside.settings.size = Math.min(adjustedWidth, adjustedHeight);
          config.inside.settings.type = Element.Effects.GlossType.Soft;
          config.inside.settings.dir = Element.Effects.FilterDirection.TOP;
          config.inside.settings.color = style.Fill.EffectColor;
          if (style.Fill.LParam) {
            switch (style.Fill.LParam) {
              case 1:
                config.inside.settings.dir = Element.Effects.FilterDirection.LEFTTOP;
                break;
              case 2:
                config.inside.settings.dir = Element.Effects.FilterDirection.RIGHTTOP;
                break;
              case 3:
                config.inside.settings.dir = Element.Effects.FilterDirection.CENTER;
                break;
            }
          }
          if (style.Fill.WParam) {
            config.inside.settings.type = Element.Effects.GlossType.Hard;
          }
          break;

        case StyleConstant.FillEffect.Bevel:
          minDimension = Math.max(Math.min(minDimension, 50) / 10, 2);
          config.inside.type = BConstant.EffectType.BEVEL;
          config.inside.settings.size = minDimension;
          config.inside.settings.type = Element.Effects.BevelType.SOFT;
          config.inside.settings.dir = Element.Effects.FilterDirection.LEFTTOP;
          if (style.Fill.WParam !== undefined) {
            switch (style.Fill.WParam) {
              case 0:
                config.inside.settings.type = Element.Effects.BevelType.HARD;
                break;
              case 1:
                config.inside.settings.type = Element.Effects.BevelType.SOFT;
                break;
              case 2:
                config.inside.settings.type = Element.Effects.BevelType.BUMP;
                break;
            }
          }
          switch (style.Fill.LParam) {
            case 0:
              config.inside.settings.dir = Element.Effects.FilterDirection.LEFT;
              break;
            case 1:
              config.inside.settings.dir = Element.Effects.FilterDirection.LEFTTOP;
              break;
            case 2:
              config.inside.settings.dir = Element.Effects.FilterDirection.TOP;
              break;
            case 3:
              config.inside.settings.dir = Element.Effects.FilterDirection.RIGHTTOP;
              break;
            case 4:
              config.inside.settings.dir = Element.Effects.FilterDirection.RIGHT;
              break;
            case 5:
              config.inside.settings.dir = Element.Effects.FilterDirection.RIGHTBOTTOM;
              break;
            case 6:
              config.inside.settings.dir = Element.Effects.FilterDirection.BOTTOM;
              break;
            case 7:
              config.inside.settings.dir = Element.Effects.FilterDirection.LEFTBOTTOM;
              break;
            case 8:
              config.inside.settings.dir = Element.Effects.FilterDirection.CENTER;
              break;
          }
          break;

        case StyleConstant.FillEffect.InShadow:
          minDimension = Math.min(minDimension, 50) / 2;
          if (style.Fill.WParam) {
            shadowParam = style.Fill.WParam;
            if (shadowParam < 0 || shadowParam > 100) {
              shadowParam = 20;
            }
            minDimension = (minDimension * shadowParam) / 100;
          } else {
            minDimension /= 5;
          }
          config.inside.type = Effects.EffectType.INNERSHADOW;
          config.inside.settings.size = minDimension;
          config.inside.settings.dir = Element.Effects.FilterDirection.LEFTTOP;
          break;

        case StyleConstant.FillEffect.InGlow:
          minDimension = Math.min(minDimension, 50) / 2;
          if (style.Fill.WParam) {
            shadowParam = style.Fill.WParam;
            if (shadowParam < 0 || shadowParam > 100) {
              shadowParam = 20;
            }
            minDimension = (minDimension * shadowParam) / 100;
          } else {
            minDimension /= 5;
          }
          config.inside.type = Effects.EffectType.INNERGLOW;
          config.inside.settings.size = minDimension;
          config.inside.settings.color = style.Fill.EffectColor;
          break;
      }
    }

    config.extent = extent;
    T3Util.Log("= S.BaseDrawObject CalcEffectSettings - Output:", config);
    return config;
  }

  CreateGradientRecord(
    flags: number,
    color1: string,
    opacity1: number,
    color2: string,
    opacity2: number
  ) {
    T3Util.Log("= S.BaseDrawObject: CreateGradientRecord - Input:", {
      flags,
      color1,
      opacity1,
      color2,
      opacity2,
    });

    let gradientRecord = {
      type: BConstant.GradientStyle.Linear,
      startPos: BConstant.GradientPos.LeftTop,
      stops: [] as Array<{ offset: number; color: string; opacity: number }>,
    };

    let firstStop = { color: color1, opacity: opacity1 };
    let secondStop = { color: color2, opacity: opacity2 };

    // Reverse colors if GRAD_REV flag is set
    if (flags & T3Constant.GradientStyle.GradRev) {
      firstStop = { color: color2, opacity: opacity2 };
      secondStop = { color: color1, opacity: opacity1 };
    }

    // Build gradient stops: if GRAD_MIDDLE flag is set, insert a middle stop at 50%
    if (flags & T3Constant.GradientStyle.GradMiddle) {
      gradientRecord.stops.push({
        offset: 0,
        color: firstStop.color,
        opacity: firstStop.opacity,
      });
      gradientRecord.stops.push({
        offset: 50,
        color: secondStop.color,
        opacity: secondStop.opacity,
      });
      gradientRecord.stops.push({
        offset: 100,
        color: firstStop.color,
        opacity: firstStop.opacity,
      });
    } else {
      gradientRecord.stops.push({
        offset: 0,
        color: firstStop.color,
        opacity: firstStop.opacity,
      });
      gradientRecord.stops.push({
        offset: 100,
        color: secondStop.color,
        opacity: secondStop.opacity,
      });
    }

    // Set gradient type and start position
    if (flags & T3Constant.GradientStyle.GradRadial) {
      gradientRecord.type = BConstant.GradientStyle.Radial;
      gradientRecord.startPos = BConstant.GradientPos.Center;
    } else if (flags & T3Constant.GradientStyle.GradShape) {
      gradientRecord.type = BConstant.GradientStyle.Radialfill;
      gradientRecord.startPos = BConstant.GradientPos.Center;
    } else {
      gradientRecord.type = BConstant.GradientStyle.Linear;
      if (flags & T3Constant.GradientStyle.GradTlbr) {
        gradientRecord.startPos = BConstant.GradientPos.LeftTop;
      } else if (flags & T3Constant.GradientStyle.GradTrbl) {
        gradientRecord.startPos = BConstant.GradientPos.RightTop;
      } else if (flags & T3Constant.GradientStyle.GradVert) {
        gradientRecord.startPos = BConstant.GradientPos.Top;
      } else if (flags & T3Constant.GradientStyle.GradHoriz) {
        gradientRecord.startPos = BConstant.GradientPos.Left;
      } else {
        gradientRecord.startPos = BConstant.GradientPos.LeftTop;
      }
    }

    T3Util.Log("= S.BaseDrawObject: CreateGradientRecord - Output:", gradientRecord);
    return gradientRecord;
  }

  CreateRichGradientRecord(index: number) {
    T3Util.Log("= S.BaseDrawObject: CreateRichGradientRecord - Input:", { index });

    if (index < 0 || index >= T3Gv.opt.richGradients.length) {
      T3Util.Log("= S.BaseDrawObject: CreateRichGradientRecord - Output:", null, "(Invalid index)");
      return null;
    }

    const richGradient = T3Gv.opt.richGradients[index];
    let gradientRecord: {
      type: any;
      startPos: any;
      stops: Array<{ color: string; opacity: number; offset: number }>;
      angle?: number;
    } = {
      type: BConstant.GradientStyle.Linear,
      startPos: BConstant.GradientPos.LeftTop,
      stops: [],
    };

    switch (richGradient.gradienttype) {
      case StyleConstant.RichGradientTypes.Linear:
        gradientRecord.type = BConstant.GradientStyle.Linear;
        gradientRecord.angle = richGradient.angle;
        break;
      case StyleConstant.RichGradientTypes.BR:
      case StyleConstant.RichGradientTypes.RectBR:
        gradientRecord.type = BConstant.GradientStyle.Radial;
        gradientRecord.startPos = BConstant.GradientPos.RightBottom;
        break;
      case StyleConstant.RichGradientTypes.BL:
      case StyleConstant.RichGradientTypes.RectBL:
        gradientRecord.type = BConstant.GradientStyle.Radial;
        gradientRecord.startPos = BConstant.GradientPos.LeftBottom;
        break;
      case StyleConstant.RichGradientTypes.RadialCenter:
      case StyleConstant.RichGradientTypes.RectCenter:
        gradientRecord.type = BConstant.GradientStyle.Radial;
        gradientRecord.startPos = BConstant.GradientPos.Center;
        break;
      case StyleConstant.RichGradientTypes.RadialTR:
      case StyleConstant.RichGradientTypes.RectTR:
        gradientRecord.type = BConstant.GradientStyle.Radial;
        gradientRecord.startPos = BConstant.GradientPos.RightTop;
        break;
      case StyleConstant.RichGradientTypes.RadialTL:
      case StyleConstant.RichGradientTypes.RectTL:
        gradientRecord.type = BConstant.GradientStyle.Radial;
        gradientRecord.startPos = BConstant.GradientPos.LeftTop;
        break;
      case StyleConstant.RichGradientTypes.RadialBC:
        gradientRecord.type = BConstant.GradientStyle.Radial;
        gradientRecord.startPos = BConstant.GradientPos.Bottom;
        break;
      case StyleConstant.RichGradientTypes.RadialTC:
        gradientRecord.type = BConstant.GradientStyle.Radial;
        gradientRecord.startPos = BConstant.GradientPos.Top;
        break;
      case StyleConstant.RichGradientTypes.Shape:
        gradientRecord.type = BConstant.GradientStyle.Radialfill;
        gradientRecord.startPos = BConstant.GradientPos.Center;
        break;
    }

    for (let i = 0; i < richGradient.stops.length; i++) {
      const stop = richGradient.stops[i];
      gradientRecord.stops.push({
        color: stop.color,
        opacity: stop.opacity,
        offset: stop.stop,
      });
    }

    T3Util.Log("= S.BaseDrawObject: CreateRichGradientRecord - Output:", gradientRecord);
    return gradientRecord;
  }

  CalcLineHops(e) {
  }

  AddHopPoint(pointA: any, pointB: any, hopIndex: number, radius: number, angle: number, flag: boolean) {
    T3Util.Log("= S.BaseDrawObject: AddHopPoint input:", { pointA, pointB, hopIndex, radius, angle, flag });
    const result = {
      bSuccess: false,
      tindex: -1
    };
    T3Util.Log("= S.BaseDrawObject: AddHopPoint output:", result);
    return result;
  }

  ResetAutoScrollTimer() {
    T3Util.Log("= S.BaseDrawObject: ResetAutoScrollTimer - Input: {}");

    if (T3Gv.opt.autoScrollTimerId !== -1) {
      T3Gv.opt.autoScrollTimer.clearTimeout(T3Gv.opt.autoScrollTimerId);
      T3Gv.opt.autoScrollTimer.obj = T3Gv.opt;
      T3Gv.opt.autoScrollTimerId = -1;
      T3Util.Log("= S.BaseDrawObject: ResetAutoScrollTimer - Output: Timer has been reset");
    } else {
      T3Util.Log("= S.BaseDrawObject: ResetAutoScrollTimer - Output: No active timer to reset");
    }
  }

  GetActionButtons() {
    return null
  }

  GetArrowheadSelection(selection: any): boolean {
    T3Util.Log("= S.BaseDrawObject: GetArrowheadSelection - Input:", { selection });
    const result = false;
    T3Util.Log("= S.BaseDrawObject: GetArrowheadSelection - Output:", result);
    return result;
  }

  SetRolloverActions(rolloverElement: any, eventObj: any) {
    T3Util.Log("= S.BaseDrawObject SetRolloverActions - Input:", { rolloverElement, eventObj });

    // If current highlighted shape is different than this, clear its effects and cursors
    if (
      T3Gv.opt.curHiliteShape !== -1 &&
      T3Gv.opt.curHiliteShape !== this.BlockID
    ) {
      const previousShape = DataUtil.GetObjectPtr(T3Gv.opt.curHiliteShape, false);
      if (previousShape) {
        T3Util.Log("= S.BaseDrawObject SetRolloverActions - Clearing previous shape:", T3Gv.opt.curHiliteShape);
        previousShape.SetRuntimeEffects(false);
        previousShape.ClearCursors();
      }
    }

    // Set runtime effects for current object based on mobile platform
    if (T3Gv.opt.isMobilePlatform) {
      this.SetRuntimeEffects(false);
    } else {
      this.SetRuntimeEffects(true);
    }
    this.SetCursors();
    T3Gv.opt.curHiliteShape = this.BlockID;
    const self = this; // preserve context for event handler

    eventObj.svgObj.mouseout(function () {
      T3Util.Log("= S.BaseDrawObject SetRolloverActions - MouseOut Triggered for BlockID:", self.BlockID);
      self.SetRuntimeEffects(false);
      self.ClearCursors();
      if (T3Gv.opt.curHiliteShape === self.BlockID) {
        T3Gv.opt.curHiliteShape = -1;
      }
      T3Util.Log("= S.BaseDrawObject SetRolloverActions - MouseOut Completed for BlockID:", self.BlockID);
    });

    T3Util.Log("= S.BaseDrawObject SetRolloverActions - Output: Completed setup for BlockID", this.BlockID);
  }

  CalcCursorForAngle(angle: number, swap: boolean): string {
    T3Util.Log("= S.BaseDrawObject: CalcCursorForAngle - Input:", { angle, swap });

    // Round the angle to the nearest multiple of 10.
    angle = 10 * Math.round(angle / 10);

    // Initialize the cursor with a default value.
    let cursor: string = CursorConstant.CursorType.RESIZE_LR;

    // Determine the cursor type based on the angle.
    if ((angle > 0 && angle < 90) || (angle > 180 && angle < 270)) {
      cursor = CursorConstant.CursorType.NWSE_RESIZE;
    } else if ((angle > 90 && angle < 180) || (angle > 270 && angle < 360)) {
      cursor = CursorConstant.CursorType.NESW_RESIZE;
    } else if (angle === 90 || angle === 270) {
      cursor = CursorConstant.CursorType.RESIZE_TB;
    }

    // Optionally swap the cursor type.
    if (swap) {
      switch (cursor) {
        case CursorConstant.CursorType.RESIZE_LR:
          cursor = CursorConstant.CursorType.RESIZE_TB;
          break;
        case CursorConstant.CursorType.RESIZE_TB:
          cursor = CursorConstant.CursorType.RESIZE_LR;
          break;
        case CursorConstant.CursorType.NWSE_RESIZE:
          cursor = CursorConstant.CursorType.NESW_RESIZE;
          break;
        case CursorConstant.CursorType.NESW_RESIZE:
          cursor = CursorConstant.CursorType.NWSE_RESIZE;
          break;
      }
    }

    T3Util.Log("= S.BaseDrawObject: CalcCursorForAngle - Output:", cursor);
    return cursor;
  }

  FoundText(searchText: string, selectionLength: number, targetBlockId: number): boolean {
    T3Util.Log("= S.BaseDrawObject FoundText - Input:", { searchText, selectionLength, targetBlockId });

    // If the target block is this block then skip processing.
    if (this.BlockID === targetBlockId) {
      T3Util.Log("= S.BaseDrawObject FoundText - Output:", false, "Same BlockID");
      return false;
    }

    let found: boolean = false;
    if (this.DataID >= 0) {
      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
      if (svgElement) {
        const textElement = svgElement.textElem;
        if (textElement) {
          const textContent = textElement.GetText(0);
          const foundIndex = textContent.search(searchText);
          if (foundIndex >= 0) {
            TextUtil.ActivateTextEdit(svgElement);
            textElement.SetSelectedRange(foundIndex, foundIndex + selectionLength);
            found = true;
          }
        }
      }
    }

    T3Util.Log("= S.BaseDrawObject FoundText - Output:", found);
    return found;
  }

  MoveBehindAllLinked() {
    T3Util.Log("= S.BaseDrawObject MoveBehindAllLinked - Input: {}");

    // Flag to track if modifications were made.
    let hasMoved: boolean = false;

    // Get the current z-order list.
    let frontLayerZList: number[] = LayerUtil.FrontMostLayerZListPreserve();
    // Find the index of the current block ID within the z-order list.
    let currentBlockID: number = this.BlockID;
    let currentIndex: number = $.inArray(currentBlockID, frontLayerZList);

    // Retrieve the links object.
    let linksObj = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, true);
    if (linksObj) {
      // Start finding links starting for the current block.
      let linkIndex: number = OptCMUtil.FindLink(linksObj, currentBlockID, true);
      // Process all valid links where the target id matches this block.
      while (linkIndex >= 0 &&
        linkIndex < linksObj.length &&
        linksObj[linkIndex].targetid === currentBlockID) {

        let hookId: number = linksObj[linkIndex].hookid;
        let hookIndex: number = $.inArray(hookId, frontLayerZList);

        // If current block appears after the hook, swap their positions.
        if (currentIndex > hookIndex) {
          frontLayerZList[hookIndex] = currentBlockID;
          frontLayerZList[currentIndex] = hookId;
          currentIndex = hookIndex;
          hasMoved = true;
        }
        linkIndex++;
      }
    }

    T3Util.Log("= S.BaseDrawObject MoveBehindAllLinked - Output: { hasMoved: " + hasMoved + " }");
    return hasMoved;
  }

  HookedObjectMoving(event: any): boolean {
    T3Util.Log("= S.BaseDrawObject HookedObjectMoving - Input:", { event });
    const result = false;
    T3Util.Log("= S.BaseDrawObject HookedObjectMoving - Output:", result);
    return result;
  }

  CustomSnap(snapTarget: any, snapOptions: any, tolerance: number, additionalData: any, flag: boolean): boolean {
    T3Util.Log("= S.BaseDrawObject CustomSnap - Input:", { snapTarget, snapOptions, tolerance, additionalData, flag });

    // Custom snapping logic can be added here.
    const result = false;

    T3Util.Log("= S.BaseDrawObject CustomSnap - Output:", result);
    return result;
  }

  GetSnapRect(): any {
    T3Util.Log("= S.BaseDrawObject GetSnapRect - Input:", { frame: this.Frame });
    const snapRect: any = {};
    Utils2.CopyRect(snapRect, this.Frame);
    T3Util.Log("= S.BaseDrawObject GetSnapRect - Output:", snapRect);
    return snapRect;
  }

  CanSnapToShapes(): number {
    T3Util.Log("= S.BaseDrawObject CanSnapToShapes - Input: {}");
    const result: number = -1;
    T3Util.Log("= S.BaseDrawObject CanSnapToShapes - Output:", result);
    return result;
  }

  IsSnapTarget(): boolean {
    T3Util.Log("= S.BaseDrawObject IsSnapTarget - Input:", {});
    const result = false;
    T3Util.Log("= S.BaseDrawObject IsSnapTarget - Output:", result);
    return result;
  }

  GuideDistanceOnly(): boolean {
    T3Util.Log("= S.BaseDrawObject GuideDistanceOnly - Input:", {});
    const result = false;
    T3Util.Log("= S.BaseDrawObject GuideDistanceOnly - Output:", result);
    return result;
  }

  ActionApplySnaps(snapTarget: any, snapOptions: any): any {
    T3Util.Log("= S.BaseDrawObject ActionApplySnaps - Input:", { snapTarget, snapOptions });

    // TODO: implement snap action logic here.
    // For now, we'll assume no snap action is applied and return null.
    const result = null;

    T3Util.Log("= S.BaseDrawObject ActionApplySnaps - Output:", result);
    return result;
  }

  GetNotePos(source, container) {
    T3Util.Log("= S.BaseDrawObject GetNotePos - Input:", { source, container });

    // Copy the source frame deeply to noteFrame
    let noteFrame = $.extend(true, {}, source.Frame);

    if (container) {
      noteFrame.x += container.frame.x;
      noteFrame.y += container.frame.y;
      noteFrame.width = container.frame.width - 5;
      noteFrame.height = container.frame.height - 6;
    }

    const width = noteFrame.width;
    const height = noteFrame.height;

    const notePosition = {
      x: noteFrame.x + width,
      y: noteFrame.y + height + source.StyleRecord.Line.Thickness / 2 + 1
    };

    T3Util.Log("= S.BaseDrawObject GetNotePos - Output:", notePosition);
    return notePosition;
  }

  RefreshFromRuleChange(fieldDataTableID: number, fieldDataElementID: number): void {
    T3Util.Log("= S.BaseDrawObject RefreshFromRuleChange - Input:", {
      fieldDataTableID,
      fieldDataElementID
    });

    if (this.HasFieldDataRecord(fieldDataTableID, fieldDataElementID, true)) {
      this.GetFieldDataStyleOverride();
      DataUtil.AddToDirtyList(this.BlockID);
      T3Util.Log("= S.BaseDrawObject RefreshFromRuleChange - Output: Rule change refreshed", {
        BlockID: this.BlockID
      });
    } else {
      T3Util.Log("= S.BaseDrawObject RefreshFromRuleChange - Output: No matching field data record", {
        fieldDataTableID,
        fieldDataElementID
      });
    }
  }

  IsShapeContainer(element: any): boolean {
    T3Util.Log("= S.BaseDrawObject IsShapeContainer - Input:", element);
    const result = false;
    T3Util.Log("= S.BaseDrawObject IsShapeContainer - Output:", result);
    return result;
  }

  HasFieldData() {
  }

  HasFieldDataForTable(event) {
  }

  HasFieldDataInText(event) {
  }

  SetFieldDataRecord(event, t, a) {
  }

  NewFieldDataRecord(event) {
  }

  HasFieldDataRecord(event, t, a) {
  }

  ChangeFieldDataTable(event) {
  }

  RemoveFieldData(event, t) {
  }

  GetFieldDataTable() {
  }

  GetFieldDataRecord() {
  }

  HasFieldDataRules(event) {
  }

  /**
   * Retrieves and calculates the style override based on field data rules
   * If this shape is part of a group, it will also inherit style overrides from its parent group
   * @returns The calculated style override object or null if no field data exists
   */
  GetFieldDataStyleOverride(): any {
    T3Util.Log("= S.BaseDrawObject: GetFieldDataStyleOverride input");

    // If no field data, set style override to null
    // Otherwise, process rules for the record
    if (!this.HasFieldData()) {
      this.dataStyleOverride = null;
    } else if (this.fieldDataElemID >= 0) {
      this.dataStyleOverride = TODO.STData.FieldedDataProcessRulesForRecord(this.fieldDataTableID, this.fieldDataElemID);
    } else {
      this.dataStyleOverride = null;
    }

    // If this shape is in a group, inherit style overrides from the parent group
    if (this.bInGroup) {
      const parentGroup = T3Gv.opt.FindParentGroup(this.BlockID);

      if (parentGroup) {
        const parentStyleOverride = parentGroup.GetFieldDataStyleOverride();

        if (parentStyleOverride) {
          // Create a deep copy of parent style and reset some properties
          const parentStyleCopy = $.extend(true, {}, parentStyleOverride);
          parentStyleCopy.glowColor = null;
          parentStyleCopy.iconID = null;

          // Merge parent style with this object's style if it exists
          if (this.dataStyleOverride) {
            this.dataStyleOverride = $.extend(true, {}, parentStyleCopy, this.dataStyleOverride);
          } else {
            this.dataStyleOverride = parentStyleCopy;
          }
        }
      }
    }

    T3Util.Log("= S.BaseDrawObject: GetFieldDataStyleOverride output:", this.dataStyleOverride);
    return this.dataStyleOverride;
  }

  RefreshFromFieldData(event) {
  }

  RefreshFromRuleChange(event, t) {
  }

  RemapDataFields(event) {
  }

  RegisterForDataDrop(event) {
  }

  GetFieldDataStyleOverride() {
  }

  SetBlobBytes(e, t) {
    var a = new BlobBytes(t, e);
    if (this.BlobBytesID >= 0) {
      var r = T3Gv.stdObj.PreserveBlock(this.BlobBytesID);
      r && (r.Data = a)
    } else {
      var i = T3Gv.stdObj.CreateBlock(StateConstant.StoredObjectType.BlobBytesObject, a);
      i && (this.BlobBytesID = i.ID)
    }
  }
}

export default BaseDrawObject
