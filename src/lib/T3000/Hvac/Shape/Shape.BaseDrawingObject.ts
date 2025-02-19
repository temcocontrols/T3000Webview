



import { Type } from 'class-transformer'
import 'reflect-metadata'
import Globals from "../Data/Globals"
import Utils1 from '../Helper/Utils1'
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import GlobalData from '../Data/GlobalData'
import DefaultStyle from '../Model/DefaultStyle'
import Point from '../Model/Point'
import $ from 'jquery'
import Document from '../Basic/Basic.Document'
import Element from '../Basic/Basic.Element';
import Utils4 from "../Helper/Utils3";
import ParagraphFormat from '../Model/ParagraphFormat'
import Instance from "../Data/Instance/Instance"
import ConstantData from "../Data/ConstantData"
import TextFormatData from "../Model/TextFormatData"
import QuickStyle from "../Model/QuickStyle"
import PolySeg from '../Model/PolySeg'
import RightClickData from '../Model/RightClickData'
import TextObject from '../Model/TextObject'
import Rectangle from '../Model/Rectangle'
import CRect from '../Model/CRect'
import ConstantData2 from '../Data/ConstantData2'
import PolyList from '../Model/PolyList'

class BaseDrawingObject {
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
  public GanttInfoID: number;
  public ImageID: number;
  public ContentType: number;
  public ContentID: number;
  public CommentID: number;
  public TextParams: any;
  public TextGrow: number;
  public TextAlign: number;
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
  public InitialGroupBounds: Point;
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
  public VisioRotationDiff: number;
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
    this.Type = ConstantData.StoredObjectType.BASE_LM_DRAWING_OBJECT;
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
    this.attachpoint = config.attachpoint || { x: ConstantData.Defines.SED_CDim / 2, y: ConstantData.Defines.SED_CDim / 2 };
    this.hookdisp = { x: 0, y: 0 };
    this.TextFlags = config.TextFlags || 0;
    this.DrawingObjectBaseClass = config.DrawingObjectBaseClass || ConstantData.DrawingObjectBaseClass.SHAPE;
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
    this.GanttInfoID = config.GanttInfoID || -1;
    this.ImageID = config.ImageID || -1;
    this.ContentType = config.ContentType || ConstantData.ContentType.NONE;
    this.ContentID = e.ContentID || -1;
    this.CommentID = e.CommentID || -1;
    this.TextParams = config.TextParams || null;
    this.TextGrow = config.TextGrow || ConstantData.TextGrowBehavior.PROPORTIONAL;
    this.TextAlign = config.TextAlign || ConstantData.TextAlign.CENTER;
    this.colorfilter = config.colorfilter || 0;
    this.colorchanges = config.colorchanges || 0;
    this.moreflags = config.moreflags || 0;
    this.sizedim = config.sizedim || { width: 0, height: 0 };
    this.ConnectPoints = config.ConnectPoints || [];
    this.ObjGrow = config.ObjGrow || ConstantData.GrowBehavior.ALL;
    config.ResizeAspectConstrain = this.ObjGrow === ConstantData.GrowBehavior.PROPORTIONAL ? true : false;
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
    this.iconShapeBottomOffset = config.iconShapeBottomOffset || ConstantData.Defines.IconShapeBottomOffset;
    this.iconShapeRightOffset = config.iconShapeRightOffset || ConstantData.Defines.iconShapeRightOffset;
    this.HyperlinkText = config.HyperlinkText || '';
    this.AttachmentInfo = config.AttachmentInfo || '';
    this.ResizeAspectConstrain = config.ResizeAspectConstrain || false;
    this.ob = {};
    this.prevBBox = config.prevBBox || { x: 0, y: 0, width: 0, height: 0 };
    this.bInGroup = false;
    this.LineTextX = config.LineTextX || 0;
    this.LineTextY = config.LineTextX || 0;
    this.VisioRotationDiff = 0;
    this.actionArrowHideTimerID = -1;
    this.FramezList = null;
    this.ParentFrameID = -1;
  }

  GenericKnob(params: any) {
    console.log('= S.BaseDrawingObject: GenericKnob input:', params);

    let knobShape = params.svgDoc.CreateShape(params.shapeType);

    if (params.shapeType === ConstantData.CreateShapeType.POLYGON) {
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
      knobShape.SetEventBehavior(Element.EventBehavior.ALL);
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

    console.log('= S.BaseDrawingObject: GenericKnob output:', knobShape);
    return knobShape;
  }

  CreateActionTriggers(
    inputElement: any,
    triggerType: any,
    additionalInfo: any,
    options: any
  ): any {
    console.log('= S.BaseDrawingObject: CreateActionTriggers input:', {
      inputElement,
      triggerType,
      additionalInfo,
      options
    });

    const result = null;

    console.log('= S.BaseDrawingObject: CreateActionTriggers output:', result);
    return result;
  }

  CreateShape(shapeType: string, options?: any): any {
    console.log("= S.BaseDrawingObject: CreateShape input:", { shapeType, options });

    // Create a dummy shape object with the provided type and options.
    const shape = {
      type: shapeType,
      options: options || {}
    };

    console.log("= S.BaseDrawingObject: CreateShape output:", shape);
    return shape;
  }

  MoveSVG(): void {
    console.log('= S.BaseDrawingObject: MoveSVG input, BlockID:', this.BlockID);

    // Retrieve the SVG element using the current BlockID
    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    if (svgElement) {
      // Get the current SVG frame
      const svgFrame = this.GetSVGFrame();
      console.log('= S.BaseDrawingObject: MoveSVG retrieved frame:', svgFrame);

      // Move the SVG element to the new position specified by the frame
      svgElement.SetPos(svgFrame.x, svgFrame.y);
      console.log(`= S.BaseDrawingObject: MoveSVG output, SVG element position set to x: ${svgFrame.x}, y: ${svgFrame.y}`);
    } else {
      console.log('= S.BaseDrawingObject: MoveSVG output, no SVG element found for BlockID:', this.BlockID);
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
    console.log("= S.BaseDrawingObject: CreateConnectHilites input:", {
      hiliteElements,
      triggerType,
      additionalInfo,
      options,
      extraParam1,
      extraParam2
    });
    const result = null;
    console.log("= S.BaseDrawingObject: CreateConnectHilites output:", result);
    return result;
  }

  CreateDimensionAdjustmentKnobs(container: any, triggerElement: any, knobParams: any) {
    console.log("= S.BaseDrawingObject: CreateDimensionAdjustmentKnobs input:", container, triggerElement, knobParams);

    // Create a deep copy of the knob parameters and calculate half knob size
    let baseParams: any = $.extend(true, {}, knobParams);
    const knobSizeHalf = baseParams.knobSize / 2;

    // Set additional parameters for the knob
    baseParams.knobID = ConstantData.ActionTriggerType.DIMENSION_LINE_ADJ;
    let docToScreenScale: number = GlobalData.optManager.svgDoc.docInfo.docToScreenScale;
    if (GlobalData.optManager.svgDoc.docInfo.docScale <= 0.5) {
      docToScreenScale *= 2;
    }
    baseParams.knobSize = ConstantData.Defines.SED_KnobSize / docToScreenScale;
    baseParams.shapeType = ConstantData.CreateShapeType.POLYGON;
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
          Utils3.RotatePointsAboutCenter(polyRect, -angleBetween / (180 / ConstantData.Geometry.PI), baseParams.polyPoints);
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

    console.log("= S.BaseDrawingObject: CreateDimensionAdjustmentKnobs output: created knobs for", numPoints - 1, "segments");
  }

  HitAreaClick(event: any): void {
    console.log("= S.BaseDrawingObject: HitAreaClick input:", event);

    // TODO: Implement the hit area click functionality here.
    // Currently, no action is performed.

    console.log("= S.BaseDrawingObject: HitAreaClick output: no action taken");
  }

  ChangeTarget(
    currentTarget: any,
    newTarget: any,
    action: any,
    options: any,
    extra1: any,
    extra2: any
  ): void {
    console.log("= S.BaseDrawingObject: ChangeTarget input:", {
      currentTarget,
      newTarget,
      action,
      options,
      extra1,
      extra2
    });

    // TODO: Add the implementation logic here

    console.log("= S.BaseDrawingObject: ChangeTarget output: completed");
  }

  OnConnect(connectionPoint: Point, targetObject: any, connectionData: any, options: any, context: any): void {
    console.log("= S.BaseDrawingObject: OnConnect input:", {
      connectionPoint,
      targetObject,
      connectionData,
      options,
      context
    });

    // TODO: Implement connection handling logic

    console.log("= S.BaseDrawingObject: OnConnect output: completed");
  }

  OnDisconnect(
    connectionPoint: Point,
    targetObject: any,
    disconnectData: any,
    options: any
  ): void {
    console.log('= S.BaseDrawingObject: OnDisconnect input:', {
      connectionPoint,
      targetObject,
      disconnectData,
      options
    });

    // TODO: Implement disconnect logic here

    console.log('= S.BaseDrawingObject: OnDisconnect output: completed');
  }

  GetDimensionsRect() {
    console.log("= S.BaseDrawingObject: GetDimensionsRect input, Dimensions:", this.Dimensions, "Frame:", this.Frame);

    let resultRect: Rectangle = new Rectangle();
    let accumulatedRect: Rectangle = resultRect; // alias for clarity
    let collectedRects: Rectangle[] = [];

    // Check if the dimension flags allow dimensions to be shown
    if (
      !(
        this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always ||
        this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select
      )
    ) {
      console.log("= S.BaseDrawingObject: GetDimensionsRect output, dimension flags not set. Result:", resultRect);
      return resultRect;
    }

    const dimensionPoints: Point[] = this.GetDimensionPoints();
    if (dimensionPoints.length < 2) {
      console.log("= S.BaseDrawingObject: GetDimensionsRect output, not enough dimension points. Result:", resultRect);
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

    console.log("= S.BaseDrawingObject: GetDimensionsRect output, result:", resultRect);
    return resultRect;
  }

  GetBoundingBoxesForSecondaryDimensions(): Rectangle[] {
    console.log('= S.BaseDrawingObject: GetBoundingBoxesForSecondaryDimensions input');
    const result: Rectangle[] = [];
    console.log('= S.BaseDrawingObject: GetBoundingBoxesForSecondaryDimensions output:', result);
    return result;
  }

  AddDimensionsToR(): void {
    console.log("= S.BaseDrawingObject: AddDimensionsToR input");

    // Retrieve the dimensions rectangle
    let dimensionsRect: Rectangle = this.GetDimensionsRect();
    console.log("= S.BaseDrawingObject: AddDimensionsToR - dimensionsRect:", dimensionsRect);

    // If the dimensions rectangle has a non-zero width, update the union of the current rectangle (r) with it
    if (dimensionsRect.width !== 0) {
      this.r = Utils2.UnionRect(this.r, dimensionsRect, this.r);
      console.log("= S.BaseDrawingObject: AddDimensionsToR - updated r:", this.r);
    } else {
      console.log("= S.BaseDrawingObject: AddDimensionsToR - dimensionsRect.width is 0, no updates made");
    }

    console.log("= S.BaseDrawingObject: AddDimensionsToR output", this.r);
  }

  UpdateFrame(newRect: Rectangle): void {
    console.log("= S.BaseDrawingObject: UpdateFrame input:", newRect);
    if (newRect) {
      Utils2.CopyRect(this.Frame, newRect);
      Utils2.CopyRect(this.r, newRect);
      Utils2.CopyRect(this.inside, newRect);
      Utils2.CopyRect(this.trect, newRect);
    }
    console.log("= S.BaseDrawingObject: UpdateFrame output:", {
      Frame: this.Frame,
      r: this.r,
      inside: this.inside,
      trect: this.trect
    });
  }

  SetSize(width: number, height: number): void {
    console.log("= S.BaseDrawingObject: SetSize input:", { width, height });
    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }
    console.log("= S.BaseDrawingObject: SetSize output:", { rflags: this.rflags });
  }

  OffsetShape(dx: number, dy: number): void {
    console.log("= S.BaseDrawingObject: OffsetShape input:", { dx, dy });
    this.Frame.x += dx;
    this.Frame.y += dy;
    this.r.x += dx;
    this.r.y += dy;
    this.inside.x += dx;
    this.inside.y += dy;
    this.trect.x += dx;
    this.trect.y += dy;
    console.log("= S.BaseDrawingObject: OffsetShape output:", {
      Frame: this.Frame,
      r: this.r,
      inside: this.inside,
      trect: this.trect
    });
  }

  SetShapeOrigin(newX: number, newY: number, origin?: any): void {
    console.log("= S.BaseDrawingObject: SetShapeOrigin input:", { newX, newY, origin });

    const deltaX = newX != null ? newX - this.Frame.x : 0;
    const deltaY = newY != null ? newY - this.Frame.y : 0;

    this.OffsetShape(deltaX, deltaY);

    console.log("= S.BaseDrawingObject: SetShapeOrigin output: new Frame:", this.Frame);
  }

  ApplyCurvature(e: any): void {
    console.log('= S.BaseDrawingObject: ApplyCurvature input:', e);

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

    console.log('= S.BaseDrawingObject: ApplyCurvature output: completed');
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
    console.log("= S.BaseDrawingObject: ScaleObject input:", {
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
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    // Apply rotation if needed
    if (rotationAngle) {
      const centerPoint = {
        x: frame.x + frame.width / 2,
        y: frame.y + frame.height / 2
      };
      const angleRadians = 2 * Math.PI * (rotationAngle / 360);
      const rotatedCenter = GlobalData.optManager.RotatePointAroundPoint(rotateCenter, centerPoint, angleRadians);
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

    console.log("= S.BaseDrawingObject: ScaleObject output:", {
      Frame: this.Frame,
      RotationAngle: this.RotationAngle,
      sizedim: this.sizedim
    });
  }

  GetDragR(): Rectangle {
    console.log("= S.BaseDrawingObject: GetDragR input");
    const dragRect: Rectangle = {} as Rectangle;
    Utils2.CopyRect(dragRect, this.r);
    console.log("= S.BaseDrawingObject: GetDragR output:", dragRect);
    return dragRect;
  }

  GetHitTestFrame(): Rectangle {
    console.log("= S.BaseDrawingObject: GetHitTestFrame input");
    let hitTestFrame: Rectangle = new Rectangle();
    Utils2.CopyRect(hitTestFrame, this.r);
    console.log("= S.BaseDrawingObject: GetHitTestFrame output:", hitTestFrame);
    return hitTestFrame;
  }

  GetSVGFrame(frame?: Rectangle): Rectangle {
    console.log('= S.BaseDrawingObject: GetSVGFrame - input:', frame);
    const newFrame: Rectangle = new Rectangle();
    if (frame == null) {
      frame = this.Frame;
    }
    Utils2.CopyRect(newFrame, frame);
    console.log('= S.BaseDrawingObject: GetSVGFrame - output:', newFrame);
    return newFrame;
  }

  LinkGrow(inputElement: any, growthFactor: number): void {
    console.log("= S.BaseDrawingObject: LinkGrow input:", { inputElement, growthFactor });

    // TODO: Implement the link growth logic here.

    console.log("= S.BaseDrawingObject: LinkGrow output: completed");
  }

  GetMoveRect(useRelative: boolean): Rectangle {
    console.log("= S.BaseDrawingObject: GetMoveRect input:", { useRelative });
    let resultRect: Rectangle = {} as Rectangle;

    if (useRelative) {
      Utils2.CopyRect(resultRect, this.r);
      // InflateRect currently uses 0 values; adjust if needed.
      Utils2.InflateRect(resultRect, 0, 0);
    } else {
      Utils2.CopyRect(resultRect, this.Frame);
    }

    console.log("= S.BaseDrawingObject: GetMoveRect output:", resultRect);
    return resultRect;
  }

  GetPositionRect(): Rectangle {
    console.log("= S.BaseDrawingObject: GetPositionRect input");
    const rect: Rectangle = {} as Rectangle;
    Utils2.CopyRect(rect, this.Frame);
    console.log("= S.BaseDrawingObject: GetPositionRect output:", rect);
    return rect;
  }

  AdjustPinRect(inputRect: Rectangle, adjustment: any): Rectangle {
    console.log("= S.BaseDrawingObject: AdjustPinRect input:", { inputRect, adjustment });
    const resultRect = inputRect; // No adjustment applied, returning as is
    console.log("= S.BaseDrawingObject: AdjustPinRect output:", resultRect);
    return resultRect;
  }

  public GetArrayRect(useAlternateMapping: boolean): CRect {
    console.log("= S.BaseDrawingObject: GetArrayRect input:", { useAlternateMapping });

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

    console.log("= S.BaseDrawingObject: GetArrayRect output:", rect);
    return rect;
  }

  GetTargetRect(input: any, options: any): Rectangle {
    console.log("= S.BaseDrawingObject: GetTargetRect input:", { input, options });

    const targetRect: Rectangle = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };

    console.log("= S.BaseDrawingObject: GetTargetRect output:", targetRect);
    return targetRect;
  }

  // IsOKFlowChartShape(e) {
  //   return 0
  // }

  // _IsFlowChartConnector() {
  //   return !1
  // }

  // _IsOrgChartConnector() {
  //   return !1
  // }

  GetHookFlags(): number {
    console.log("= S.BaseDrawingObject: GetHookFlags input");
    const result = 0;
    console.log("= S.BaseDrawingObject: GetHookFlags output:", result);
    return result;
  }

  AllowLink(): number {
    console.log("= S.BaseDrawingObject: AllowLink input: none");
    const result: number = 0;
    console.log("= S.BaseDrawingObject: AllowLink output:", result);
    return result;
  }

  IsSwimlane(): boolean {
    console.log("= S.BaseDrawingObject: IsSwimlane input:");
    const result = false;
    console.log("= S.BaseDrawingObject: IsSwimlane output:", result);
    return result;
  }

  AllowSpell(): boolean {
    console.log("= S.BaseDrawingObject: AllowSpell input, bInGroup:", this.bInGroup, "TextFlags:", this.TextFlags);
    const result = !this.bInGroup && ((this.TextFlags & ConstantData.TextFlags.SED_TF_NoSpell) === 0);
    console.log("= S.BaseDrawingObject: AllowSpell output:", result);
    return result;
  }

  PreventLink(): boolean {
    console.log("= S.BaseDrawingObject: PreventLink input");
    const result = false;
    console.log("= S.BaseDrawingObject: PreventLink output:", result);
    return result;
  }

  AllowHeal(): boolean {
    console.log("= S.BaseDrawingObject: AllowHeal input: none");
    const result = false;
    console.log("= S.BaseDrawingObject: AllowHeal output:", result);
    return result;
  }

  AllowMaintainLink(): boolean {
    console.log("= S.BaseDrawingObject: AllowMaintainLink input, no parameters");
    const result = true;
    console.log("= S.BaseDrawingObject: AllowMaintainLink output:", result);
    return result;
  }

  GetHookPoints(): any {
    console.log("= S.BaseDrawingObject: GetHookPoints input");
    const hookPoints = null;
    console.log("= S.BaseDrawingObject: GetHookPoints output:", hookPoints);
    return hookPoints;
  }

  GetBestHook(inputHook: any, targetHook: any, attachmentData: any): any {
    console.log("= S.BaseDrawingObject: GetBestHook - input:", { inputHook, targetHook, attachmentData });

    const bestHook = targetHook;

    console.log("= S.BaseDrawingObject: GetBestHook - output:", bestHook);
    return bestHook;
  }

  SetHookAlign(hook: any, alignment: any): void {
    console.log("= S.BaseDrawingObject: SetHookAlign input:", { hook, alignment });

    // TODO: Add implementation logic for setting hook alignment here.

    console.log("= S.BaseDrawingObject: SetHookAlign output: completed");
  }

  GetTargetPoints(targetPoint: Point, hookFlags: number, extraParam: any): any {
    console.log("= S.BaseDrawingObject: GetTargetPoints input:", { targetPoint, hookFlags, extraParam });
    const result = null;
    console.log("= S.BaseDrawingObject: GetTargetPoints output:", result);
    return result;
  }

  AllowHook(hookData: any, target: any, attachment: any): boolean {
    console.log("= S.BaseDrawingObject: AllowHook input:", { hookData, target, attachment });
    const result = true;
    console.log("= S.BaseDrawingObject: AllowHook output:", result);
    return result;
  }

  ConnectToHook(sourceHook: any, targetHook: any): any {
    console.log("= S.BaseDrawingObject: ConnectToHook input:", { sourceHook, targetHook });
    const result = targetHook;
    console.log("= S.BaseDrawingObject: ConnectToHook output:", result);
    return result;
  }

  HookToPoint(point: Point, target: Point): Point {
    console.log("= S.BaseDrawingObject: HookToPoint input:", { point, target });
    const result: Point = { x: 0, y: 0 };
    console.log("= S.BaseDrawingObject: HookToPoint output:", result);
    return result;
  }

  public IsCoManager(manager: any): boolean {
    console.log("= S.BaseDrawingObject: IsCoManager input:", manager);
    const result = false;
    console.log("= S.BaseDrawingObject: IsCoManager output:", result);
    return result;
  }

  LinkNotVisible(): boolean {
    console.log("= S.BaseDrawingObject: LinkNotVisible input: no parameters");
    const isNotVisible = (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) > 0;
    console.log("= S.BaseDrawingObject: LinkNotVisible output:", isNotVisible);
    return isNotVisible;
  }

  IsAsstConnector(): boolean {
    console.log("= S.BaseDrawingObject: IsAsstConnector input:");
    const result = false;
    console.log("= S.BaseDrawingObject: IsAsstConnector output:", result);
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
    console.log("= S.BaseDrawingObject: GetPerimPts input:", {
      unusedId,
      points,
      unusedParam,
      skipRotation,
      optionalParam,
      anotherOptionalParam,
    });

    const numPoints = points.length;
    const computedPoints: Point[] = [];
    const shapeTriType = ConstantData.SDRShapeTypes.SED_S_Tri;
    const cellDimension = ConstantData.Defines.SED_CDim;

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
      const rotatedAngle = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotatedAngle, computedPoints);
    }

    console.log("= S.BaseDrawingObject: GetPerimPts output:", computedPoints);
    return computedPoints;
  }

  ChangeHook(sourceHook: any, targetHook: any, additionalData: any): void {
    console.log("= S.BaseDrawingObject: ChangeHook input:", { sourceHook, targetHook, additionalData });
    GlobalData.optManager.CN_ChangeHook(this, sourceHook, targetHook, additionalData);
    console.log("= S.BaseDrawingObject: ChangeHook output:", "Hook change applied");
  }

  ChangeShape(e: any, t: any, a: any, r: any, i: any): boolean {
    console.log("= S.BaseDrawingObject: ChangeShape input:", { e, t, a, r, i });
    const result = false;
    console.log("= S.BaseDrawingObject: ChangeShape output:", result);
    return result;
  }

  GetLineChangeFrame() {
    console.log("= S.BaseDrawingObject: GetLineChangeFrame input:", this.Frame);
    let frame = $.extend(true, {}, this.Frame);
    if (frame.width < ConstantData.Defines.SED_SegDefLen) {
      frame.width = ConstantData.Defines.SED_SegDefLen;
    }
    if (frame.height < ConstantData.Defines.SED_SegDefLen) {
      frame.height = ConstantData.Defines.SED_SegDefLen;
    }
    console.log("= S.BaseDrawingObject: GetLineChangeFrame output:", frame);
    return frame;
  }

  public DeleteObject(): void {
    console.log("= S.BaseDrawingObject: DeleteObject input:", {
      TableID: this.TableID,
      DataID: this.DataID,
      NoteID: this.NoteID,
      NativeID: this.NativeID,
      GanttInfoID: this.GanttInfoID,
      BlobBytesID: this.BlobBytesID,
      EMFBlobBytesID: this.EMFBlobBytesID,
      OleBlobBytesID: this.OleBlobBytesID,
      CommentID: this.CommentID
    });

    let tempObj: any = null;
    let hooksBackup: any[] = [];

    // Delete table object if exists
    if (this.TableID !== -1) {
      const tablePtr = GlobalData.optManager.GetObjectPtr(this.TableID, true);
      if (tablePtr) {
        GlobalData.optManager.Table_DeleteObject(tablePtr);
      }
      tempObj = GlobalData.objectStore.GetObject(this.TableID);
      if (tempObj) {
        tempObj.Delete();
      }
    }

    // Delete data object if exists
    if (this.DataID !== -1) {
      tempObj = GlobalData.objectStore.GetObject(this.DataID);
      if (tempObj) {
        tempObj.Delete();
      }
    }

    // Delete note object if exists
    if (this.NoteID !== -1) {
      tempObj = GlobalData.objectStore.GetObject(this.NoteID);
      if (tempObj) {
        tempObj.Delete();
      }
    }

    // Delete native object if exists
    if (this.NativeID !== -1) {
      tempObj = GlobalData.objectStore.GetObject(this.NativeID);
      if (tempObj) {
        tempObj.Delete();
      }
    }

    // Delete gantt info object if exists
    if (this.GanttInfoID !== -1) {
      tempObj = GlobalData.objectStore.GetObject(this.GanttInfoID);
      if (tempObj) {
        tempObj.Delete();
      }
    }

    // Delete blob bytes object and associated URL if exists
    if (this.BlobBytesID !== -1) {
      tempObj = GlobalData.objectStore.GetObject(this.BlobBytesID);
      if (tempObj) {
        tempObj.Delete();
      }
      if (GlobalData.optManager.IsBlobURL(this.ImageURL)) {
        GlobalData.optManager.DeleteURL(this.ImageURL);
      }
    }

    // Delete EMF blob bytes object if exists
    if (this.EMFBlobBytesID !== -1) {
      tempObj = GlobalData.objectStore.GetObject(this.EMFBlobBytesID);
      if (tempObj) {
        tempObj.Delete();
      }
    }

    // Delete Ole blob bytes object if exists
    if (this.OleBlobBytesID !== -1) {
      tempObj = GlobalData.objectStore.GetObject(this.OleBlobBytesID);
      if (tempObj) {
        tempObj.Delete();
      }
    }

    // Remove field data
    this.RemoveFieldData(true);

    // Process hooks and update dimension lines for hooked objects if necessary
    if (this.hooks.length > 0) {
      const hookedObj = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);
      if (
        hookedObj &&
        hookedObj.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL &&
        !(hookedObj.Dimensions & ConstantData.DimensionFlags.SED_DF_HideHookedObjDimensions)
      ) {
        hooksBackup = Utils1.DeepCopy(this.hooks);
        this.hooks = [];
        const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(hookedObj.BlockID);
        hookedObj.UpdateDimensionLines(svgElement);
        this.hooks = hooksBackup;
      }
    }

    // Delete comment object if applicable
    if (this.CommentID >= 0) {
      GlobalData.optManager.CommentObjectDelete(this);
    }

    console.log("= S.BaseDrawingObject: DeleteObject output: object deleted");
  }

  GetTextIDs(): number[] {
    console.log("= S.BaseDrawingObject: GetTextIDs input");
    const textIDs: number[] = [];
    console.log("= S.BaseDrawingObject: GetTextIDs output:", textIDs);
    return textIDs;
  }

  GetSegLFace(segmentIndex: number, someParam: any, anotherParam: any): number {
    console.log("= S.BaseDrawingObject: GetSegLFace input:", { segmentIndex, someParam, anotherParam });
    const result = 0;
    console.log("= S.BaseDrawingObject: GetSegLFace output:", result);
    return result;
  }

  GetSpacing(): { width: number | null; height: number | null } {
    console.log("= S.BaseDrawingObject: GetSpacing input");
    const spacing = {
      width: null,
      height: null
    };
    console.log("= S.BaseDrawingObject: GetSpacing output:", spacing);
    return spacing;
  }

  GetShapeConnectPoint(): { x: number; y: number } {
    console.log("= S.BaseDrawingObject: GetShapeConnectPoint input:");
    const connectPoint = { x: 0, y: 0 };
    console.log("= S.BaseDrawingObject: GetShapeConnectPoint output:", connectPoint);
    return connectPoint;
  }

  ClosePolygon(e: any, t: any, a: any): boolean {
    console.log("= S.BaseDrawingObject: ClosePolygon input:", { e, t, a });
    const result: boolean = false;
    console.log("= S.BaseDrawingObject: ClosePolygon output:", result);
    return result;
  }

  Hit(point: Point, param2: any, param3: any, param4: any): number {
    console.log("= S.BaseDrawingObject: Hit input:", { point, param2, param3, param4 });
    const hitCode = Utils2.pointInRect(this.Frame, point)
      ? ConstantData.HitCodes.SED_Border
      : 0;
    console.log("= S.BaseDrawingObject: Hit output:", hitCode);
    return hitCode;
  }

  AfterModifyShape(shape: any, additionalData: any): void {
    console.log("= S.BaseDrawingObject: AfterModifyShape input:", { shape, additionalData });

    GlobalData.optManager.SetLinkFlag(shape, ConstantData.LinkFlags.SED_L_MOVE);
    GlobalData.optManager.UpdateLinks();

    console.log("= S.BaseDrawingObject: AfterModifyShape output: links updated");
  }

  AfterRotateShape(shape: any): void {
    console.log("= S.BaseDrawingObject: AfterRotateShape input:", shape);

    GlobalData.optManager.SetLinkFlag(shape, ConstantData.LinkFlags.SED_L_MOVE);
    GlobalData.optManager.UpdateLinks();

    console.log("= S.BaseDrawingObject: AfterRotateShape output: links updated");
  }

  PolyGetTargetPointList(inputParam: any): Point[] {
    console.log("= S.BaseDrawingObject: PolyGetTargetPointList input:", inputParam);

    // Get the list of polygon points
    let targetPoints: Point[] = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, true, null);

    // If there is a rotation applied, convert it to radians and rotate the points about the frame center
    if (this.RotationAngle !== 0) {
      const rotationInRadians: number = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationInRadians, targetPoints);
    }

    console.log("= S.BaseDrawingObject: PolyGetTargetPointList output:", targetPoints);
    return targetPoints;
  }

  GetPolyPoints(dummy: number, applyAbsoluteOffset: boolean, unused: any, inflateRect: boolean, unused2: any): Point[] {
    console.log("= S.BaseDrawingObject: GetPolyPoints input:", { dummy, applyAbsoluteOffset, unused, inflateRect, unused2 });

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

    console.log("= S.BaseDrawingObject: GetPolyPoints output:", points);
    return points;
  }

  RightClick(event: any): any {
    console.log("= S.BaseDrawingObject: RightClick input:", event);

    // Convert the window coordinates to document coordinates
    const docCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
      event.gesture.center.clientX,
      event.gesture.center.clientY
    );
    console.log("= S.BaseDrawingObject: Converted window to doc coords:", docCoords);

    // Find the SVG element corresponding to the current target
    const element = GlobalData.optManager.svgObjectLayer.FindElementByDOMElement(event.currentTarget);
    console.log("= S.BaseDrawingObject: Found SVG element:", element);

    // Select the object from the click event; exit if not selected
    if (!GlobalData.optManager.SelectObjectFromClick(event, element)) {
      console.log("= S.BaseDrawingObject: RightClick output: Object selection failed");
      return false;
    }

    // Set up right click parameters
    GlobalData.optManager.RightClickParams = new RightClickData();
    GlobalData.optManager.RightClickParams.TargetID = element.GetID();
    GlobalData.optManager.RightClickParams.HitPt.x = docCoords.x;
    GlobalData.optManager.RightClickParams.HitPt.y = docCoords.y;
    GlobalData.optManager.RightClickParams.Locked = (this.flags & ConstantData.ObjFlags.SEDO_Lock) > 0;
    console.log("= S.BaseDrawingObject: RightClickParams set to:", GlobalData.optManager.RightClickParams);

    // Show the appropriate contextual menu based on read-only status
    if (GlobalData.docHandler.IsReadOnly()) {
      // TODO
    } else {
      // TODO
    }

    console.log("= S.BaseDrawingObject: RightClick output: Contextual menu shown");
  }

  AdjustTextEditBackground(e: any, t: any): void {
    console.log("= S.BaseDrawingObject: AdjustTextEditBackground input:", { e, t });

    // TODO: Implement the logic to adjust the text edit background as needed.

    console.log("= S.BaseDrawingObject: AdjustTextEditBackground output: completed");
  }

  SetTextContent(text: string): void {
    console.log("= S.BaseDrawingObject: SetTextContent input:", text);
    if (text) {
      const textConfig = { runtimeText: text };
      const textObject = new TextObject(textConfig);
      const newBlock = GlobalData.objectStore.CreateBlock(
        ConstantData.StoredObjectType.LM_TEXT_OBJECT,
        textObject
      );
      if (newBlock === null) {
        throw "error: AddNewObject got a null new text block allocation";
      }
      this.DataID = newBlock.ID;
    }
    console.log("= S.BaseDrawingObject: SetTextContent output, DataID:", this.DataID);
  }

  SetNoteContent(noteText: string): void {
    console.log("= S.BaseDrawingObject: SetNoteContent input:", noteText);

    if (noteText) {
      const textConfig = { runtimeText: noteText };
      const textObj = new TextObject(textConfig);
      const newBlock = GlobalData.objectStore.CreateBlock(ConstantData.StoredObjectType.LM_NOTES_OBJECT, textObj);

      if (newBlock === null) {
        console.error("= S.BaseDrawingObject: SetNoteContent error: null new text block allocation");
        throw "error: AddNewObject got a null new text block allocation";
      }

      this.NoteID = newBlock.ID;
      console.log("= S.BaseDrawingObject: SetNoteContent output: NoteID set to", this.NoteID);
    } else {
      console.log("= S.BaseDrawingObject: SetNoteContent output: no note content provided");
    }
  }

  GetArrowheadFormat(): any {
    console.log("= S.BaseDrawingObject: GetArrowheadFormat input:");
    const result = null;
    console.log("= S.BaseDrawingObject: GetArrowheadFormat output:", result);
    return result;
  }

  GetTextParaFormat(e: any): ParagraphFormat {
    console.log("= S.BaseDrawingObject: GetTextParaFormat input:", e);

    let paraFormat: ParagraphFormat = {} as ParagraphFormat;
    // Set default values
    paraFormat.just = this.TextAlign;
    paraFormat.bullet = "none";
    paraFormat.spacing = 0;

    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    const activeTableID = GlobalData.optManager.Table_GetActiveID();

    const table = this.GetTable(false);
    if (table) {
      GlobalData.optManager.Table_GetTextParaFormat(table, paraFormat, svgElement, this.BlockID !== activeTableID, e, null);
    } else if (this.DataID && this.DataID >= 0) {
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

    console.log("= S.BaseDrawingObject: GetTextParaFormat output:", paraFormat);
    return paraFormat;
  }

  GetTextFormat(returnTextFormat: boolean, textOptions: any): any {
    console.log("= S.BaseDrawingObject: GetTextFormat input:", { returnTextFormat, textOptions });

    // Initialize variables with readable names
    let isBold: boolean, isItalic: boolean, isUnderline: boolean, isSuperscript: boolean, isSubscript: boolean;
    let textElement: any = null;
    const textFace = ConstantData.TextFace;
    let textFormatData = new TextFormatData();
    let defaultStyle = new DefaultStyle();
    const activeTableID = GlobalData.optManager.Table_GetActiveID();
    const sessionBlock = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);

    // Deep copy the StyleRecord's Text settings and update font information from session block
    textFormatData = Utils1.DeepCopy(this.StyleRecord.Text);
    textFormatData.FontId = GlobalData.optManager.GetFontIdByName(sessionBlock.def.lf.fontName);
    textFormatData.FontName = sessionBlock.def.lf.fontName;

    // Try to get the table for text formatting
    const table = this.GetTable(false);
    if (table) {
      GlobalData.optManager.Table_GetTextFormat(table, textFormatData, null, activeTableID !== this.BlockID, textOptions);
    } else if (this.DataID !== null && this.DataID >= 0) {
      const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
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
            textFormatData.FontSize = GlobalData.optManager.FontSizeToPoints(selectedFormat.size);
            textFormatData.FontId = GlobalData.optManager.GetFontIdByName(selectedFormat.font);
            textFormatData.FontName = selectedFormat.font;
            isBold = (selectedFormat.weight === 'bold');
            textFormatData.Face = Utils2.SetFlag(textFormatData.Face, textFace.Bold, isBold);
            isItalic = (selectedFormat.style === 'italic');
            textFormatData.Face = Utils2.SetFlag(textFormatData.Face, textFace.Italic, isItalic);
            isUnderline = (selectedFormat.decoration === 'underline');
            textFormatData.Face = Utils2.SetFlag(textFormatData.Face, textFace.Underline, isUnderline);
            isSuperscript = (selectedFormat.baseOffset === 'super');
            textFormatData.Face = Utils2.SetFlag(textFormatData.Face, textFace.Superscript, isSuperscript);
            isSubscript = (selectedFormat.baseOffset === 'sub');
            textFormatData.Face = Utils2.SetFlag(textFormatData.Face, textFace.Subscript, isSubscript);
            textFormatData.Paint.Color = selectedFormat.color ? selectedFormat.color : "";
            if (selectedFormat.colorTrans) {
              textFormatData.Paint.Opacity = selectedFormat.colorTrans;
            }
            console.log("= S.BaseDrawingObject: GetTextFormat output (TextFormatData):", textFormatData);
            return textFormatData;
          } else {
            defaultStyle.font = selectedFormat.font;
            defaultStyle.size = selectedFormat.size;
            defaultStyle.weight = selectedFormat.weight;
            defaultStyle.style = selectedFormat.style;
            defaultStyle.decoration = selectedFormat.decoration;
            defaultStyle.baseOffset = selectedFormat.baseOffset;
            defaultStyle.color = selectedFormat.color;
            defaultStyle.colorTrans = selectedFormat.colorTrans;
            console.log("= S.BaseDrawingObject: GetTextFormat output (DefaultStyle):", defaultStyle);
            return defaultStyle;
          }
        }
      }
    }
    console.log("= S.BaseDrawingObject: GetTextFormat output:", returnTextFormat ? textFormatData : null);
    return returnTextFormat ? textFormatData : null;
  }

  UseTextBlockColor(): boolean {
    console.log("= S.BaseDrawingObject: UseTextBlockColor input: none");
    const result = false;
    console.log("= S.BaseDrawingObject: UseTextBlockColor output:", result);
    return result;
  }

  SetTextObject(e: any): boolean {
    console.log("= S.BaseDrawingObject: SetTextObject input:", e);
    this.DataID = e;
    console.log("= S.BaseDrawingObject: SetTextObject output: DataID set to", this.DataID);
    return true;
  }

  GetTextObject(input: any, options?: any): number {
    console.log("= S.BaseDrawingObject: GetTextObject input:", { input, options });
    const dataId = this.DataID;
    console.log("= S.BaseDrawingObject: GetTextObject output:", dataId);
    return dataId;
  }

  SetTextFormat(textFormat: TextFormatData, options: any): void {
    console.log("= S.BaseDrawingObject: SetTextFormat input:", { textFormat, options });

    // TODO: Implement text formatting logic here.
    // For example, you might update the style record or modify properties based on the provided text format.

    console.log("= S.BaseDrawingObject: SetTextFormat output: completed");
  }
}

export default BaseDrawingObject
