



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
    this.ContentID = config.ContentID || -1;
    this.CommentID = config.CommentID || -1;
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

  ExtendLines(): void {
    console.log("= S.BaseDrawingObject: ExtendLines input:");

    // TODO: Implement the logic for extending lines here.

    console.log("= S.BaseDrawingObject: ExtendLines output: complete");
  }

  ExtendCell(inputCell: any, additionalParam: any, anotherParam: any): any {
    console.log("= S.BaseDrawingObject: ExtendCell input:", { inputCell, additionalParam, anotherParam });

    // TODO: Add your implementation logic here.
    const result = null;

    console.log("= S.BaseDrawingObject: ExtendCell output:", result);
    return result;
  }

  SetShapeProperties(options: {
    ClickFlag: number;
    PositionFlag: number;
    CRFlag?: boolean;
    AllowSpell?: boolean;
  }): boolean {
    console.log("= S.BaseDrawingObject: SetShapeProperties input:", options);

    let changed = false;

    // Process ClickFlag
    switch (options.ClickFlag) {
      case ConstantData.TextFlags.SED_TF_OneClick:
        if ((this.TextFlags & ConstantData.TextFlags.SED_TF_OneClick) === 0) {
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            ConstantData.TextFlags.SED_TF_OneClick,
            true
          );
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            ConstantData.TextFlags.SED_TF_None,
            false
          );
          changed = true;
        }
        break;

      case ConstantData.TextFlags.SED_TF_None:
        if ((this.TextFlags & ConstantData.TextFlags.SED_TF_None) === 0) {
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            ConstantData.TextFlags.SED_TF_OneClick,
            false
          );
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            ConstantData.TextFlags.SED_TF_None,
            true
          );
          changed = true;
        }
        break;

      case 0:
        if (
          (this.TextFlags & ConstantData.TextFlags.SED_TF_None) ||
          (this.TextFlags & ConstantData.TextFlags.SED_TF_OneClick)
        ) {
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            ConstantData.TextFlags.SED_TF_OneClick,
            false
          );
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            ConstantData.TextFlags.SED_TF_None,
            false
          );
          changed = true;
        }
        break;
    }

    // Process PositionFlag
    switch (options.PositionFlag) {
      case ConstantData.TextFlags.SED_TF_AttachA:
        if ((this.TextFlags & ConstantData.TextFlags.SED_TF_AttachA) === 0) {
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            ConstantData.TextFlags.SED_TF_AttachA,
            true
          );
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            ConstantData.TextFlags.SED_TF_AttachB,
            false
          );
          changed = true;
        }
        break;

      case ConstantData.TextFlags.SED_TF_AttachB:
        if ((this.TextFlags & ConstantData.TextFlags.SED_TF_AttachB) === 0) {
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            ConstantData.TextFlags.SED_TF_AttachB,
            true
          );
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            ConstantData.TextFlags.SED_TF_AttachA,
            false
          );
          changed = true;
        }
        break;

      case 0:
        if (
          (this.TextFlags & ConstantData.TextFlags.SED_TF_AttachB) !== 0 ||
          (this.TextFlags & ConstantData.TextFlags.SED_TF_AttachA) !== 0
        ) {
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            ConstantData.TextFlags.SED_TF_AttachB,
            false
          );
          this.TextFlags = Utils2.SetFlag(
            this.TextFlags,
            ConstantData.TextFlags.SED_TF_AttachA,
            false
          );
          changed = true;
        }
        break;
    }

    // Process CRFlag
    if (options.CRFlag === true) {
      if ((this.TextFlags & ConstantData.TextFlags.SED_TF_FormCR) === 0) {
        this.TextFlags = Utils2.SetFlag(
          this.TextFlags,
          ConstantData.TextFlags.SED_TF_FormCR,
          true
        );
        changed = true;
      }
    } else if (options.CRFlag === false) {
      if ((this.TextFlags & ConstantData.TextFlags.SED_TF_FormCR) !== 0) {
        this.TextFlags = Utils2.SetFlag(
          this.TextFlags,
          ConstantData.TextFlags.SED_TF_FormCR,
          false
        );
        changed = true;
      }
    }

    // Process AllowSpell
    if (options.AllowSpell === false) {
      if ((this.TextFlags & ConstantData.TextFlags.SED_TF_NoSpell) === 0) {
        this.TextFlags = Utils2.SetFlag(
          this.TextFlags,
          ConstantData.TextFlags.SED_TF_NoSpell,
          true
        );
        changed = true;
      }
    } else if (options.AllowSpell === true) {
      if ((this.TextFlags & ConstantData.TextFlags.SED_TF_NoSpell) !== 0) {
        this.TextFlags = Utils2.SetFlag(
          this.TextFlags,
          ConstantData.TextFlags.SED_TF_NoSpell,
          false
        );
        changed = true;
      }
    }

    console.log("= S.BaseDrawingObject: SetShapeProperties output:", changed);
    return changed;
  }

  SetShapeConnectionPoints(shape: any, connectionPoint: any, additionalInfo: any): boolean {
    console.log("= S.BaseDrawingObject: SetShapeConnectionPoints input:", { shape, connectionPoint, additionalInfo });
    const result = false;
    console.log("= S.BaseDrawingObject: SetShapeConnectionPoints output:", result);
    return result;
  }

  GetClosestConnectPoint(e: any): boolean {
    console.log("= S.BaseDrawingObject: GetClosestConnectPoint input:", e);
    const result = false;
    console.log("= S.BaseDrawingObject: GetClosestConnectPoint output:", result);
    return result;
  }

  ScaleEndPoints(): void {
    console.log("= S.BaseDrawingObject: ScaleEndPoints input:", {
      polylist: this.polylist,
      startPoint: this.StartPoint,
      endPoint: this.EndPoint
    });

    if (this.polylist && this.StartPoint && this.EndPoint) {
      // ListManager.PolyLine.prototype.ScaleEndPoints.call(this)
      this.PolyLine_ScaleEndPoints();
    }

    console.log("= S.BaseDrawingObject: ScaleEndPoints output: completed");
  }

  PolyLine_ScaleEndPoints(): void {
    console.log("= S.BaseDrawingObject: PolyLine_ScaleEndPoints input:", {
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
      console.log("= S.BaseDrawingObject: PolyLine_ScaleEndPoints output: no scaling required");
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

    console.log("= S.BaseDrawingObject: PolyLine_ScaleEndPoints output:", {
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint
    });
  }

  ChangeLineThickness(thickness: number): void {
    console.log("= S.BaseDrawingObject: ChangeLineThickness input:", thickness);
    this.UpdateFrame(null);
    console.log("= S.BaseDrawingObject: ChangeLineThickness output: thickness changed");
  }

  ChangeEffect(): void {
    console.log("= S.BaseDrawingObject: ChangeEffect input: no parameters");
    this.UpdateFrame(null);
    console.log("= S.BaseDrawingObject: ChangeEffect output: effect changed");
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
    console.log("= S.BaseDrawingObject: ChangeTextAttributes input:", {
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
      if (this.GetTable(true)) {
        GlobalData.optManager.Table_ChangeTextAttributes(
          this,
          fillColor,
          strokeColor,
          paramI,
          isItalic,
          paramN,
          null,
          false,
          paramO,
          paramS
        );
      } else {
        GlobalData.optManager.ChangeObjectTextAttributes(
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

    console.log("= S.BaseDrawingObject: ChangeTextAttributes output: text attributes changed");
  }

  SetObjectStyle(styleInput: any): any {
    console.log("= S.BaseDrawingObject: SetObjectStyle input:", styleInput);

    const filteredStyle = GlobalData.optManager.ApplyColorFilter(
      styleInput,
      this,
      this.StyleRecord,
      this.colorfilter
    );
    const initialThickness = this.StyleRecord.Line.Thickness;

    if (this.GetTable(false)) {
      GlobalData.optManager.Table_ApplyProperties(this, filteredStyle, styleInput, false);
    } else if (
      filteredStyle.StyleRecord &&
      filteredStyle.StyleRecord.Fill &&
      filteredStyle.StyleRecord.Fill.Paint &&
      filteredStyle.StyleRecord.Fill.Paint.Color &&
      filteredStyle.StyleRecord.Name === undefined &&
      filteredStyle.StyleRecord.Fill.Paint.FillType === undefined
    ) {
      if (this.StyleRecord.Fill.Paint.FillType === ConstantData.FillTypes.SDFILL_GRADIENT) {
        if (
          this.StyleRecord.Fill.Paint.Color.toUpperCase() ===
          filteredStyle.StyleRecord.Fill.Paint.Color.toUpperCase()
        ) {
          filteredStyle.StyleRecord.Fill.Paint.FillType = ConstantData.FillTypes.SDFILL_SOLID;
        }
      } else {
        filteredStyle.StyleRecord.Fill.Paint.FillType = ConstantData.FillTypes.SDFILL_SOLID;
      }
    }

    GlobalData.optManager.ApplyProperties(filteredStyle, this);

    if (filteredStyle.StyleRecord) {
      if (filteredStyle.StyleRecord.Line && filteredStyle.StyleRecord.Line.Thickness) {
        this.ChangeLineThickness(initialThickness);
      }
      if (filteredStyle.StyleRecord.OutsideEffect) {
        this.ChangeEffect();
      }
    }

    console.log("= S.BaseDrawingObject: SetObjectStyle output:", filteredStyle);
    return filteredStyle;
  }

  GetListOfEnclosedObjects(enclosedItems: any): any[] {
    console.log("= S.BaseDrawingObject: GetListOfEnclosedObjects input:", enclosedItems);
    const result: any[] = [];
    console.log("= S.BaseDrawingObject: GetListOfEnclosedObjects output:", result);
    return result;
  }

  InterceptMoveOperation(event: any): boolean {
    console.log('= S.BaseDrawingObject: InterceptMoveOperation input:', event);
    const result = false;
    console.log('= S.BaseDrawingObject: InterceptMoveOperation output:', result);
    return result;
  }

  SetupInterceptMove(event: any): boolean {
    console.log("= S.BaseDrawingObject: SetupInterceptMove input:", event);
    const result = false;
    console.log("= S.BaseDrawingObject: SetupInterceptMove output:", result);
    return result;
  }

  IsSelected(): boolean {
    console.log("= S.BaseDrawingObject: IsSelected input: none");

    const blockID = this.BlockID;
    const selectedList = GlobalData.optManager.theSelectedListBlockID.Data;
    const isSelected = $.inArray(blockID, selectedList) >= 0;

    console.log("= S.BaseDrawingObject: IsSelected output:", isSelected);
    return isSelected;
  }

  RemoveDimensionLines(svgDoc: any): void {
    console.log('= S.BaseDrawingObject: RemoveDimensionLines input:', svgDoc);

    if (svgDoc != null) {
      const elementClasses = [
        ConstantData.SVGElementClass.DIMENSIONLINE,
        ConstantData.SVGElementClass.DIMENSIONTEXT,
        ConstantData.SVGElementClass.AREADIMENSIONLINE,
        ConstantData.SVGElementClass.DIMENSIONTEXTNOEDIT
      ];

      for (let i = 0; i < elementClasses.length; i++) {
        const elements = svgDoc.GetElementListWithID(elementClasses[i]);
        for (let j = 0; j < elements.length; j++) {
          svgDoc.RemoveElement(elements[j]);
        }
      }
    }

    console.log('= S.BaseDrawingObject: RemoveDimensionLines output: completed');
  }

  // Remove coordinate lines when adjusting the line
  RemoveCoordinateLines(svgDoc: any): void {
    console.log('= S.BaseDrawingObject: RemoveCoordinateLines input:', svgDoc);

    if (svgDoc != null) {
      const elementClasses = [
        ConstantData.SVGElementClass.CoordinateLine,
      ];

      for (let i = 0; i < elementClasses.length; i++) {
        const elements = svgDoc.GetElementListWithID(elementClasses[i]);
        for (let j = 0; j < elements.length; j++) {
          svgDoc.RemoveElement(elements[j]);
        }
      }
    }

    console.log('= S.BaseDrawingObject: RemoveCoordinateLines output: completed');
  }

  SetDimensionLinesVisibility(svgDoc: any, isVisible: boolean) {
    console.log('= S.BaseDrawingObject: SetDimensionLinesVisibility input:', { svgDoc, isVisible });

    function setVisibility(svgDoc: any, elementClass: string, isVisible: boolean) {
      const elements = svgDoc.GetElementListWithID(elementClass);
      for (let i = 0; i < elements.length; i++) {
        elements[i].SetVisible(isVisible);
      }
    }

    const shouldSetVisibility = this.Dimensions === ConstantData.DimensionFlags.SED_DF_Always || this.Dimensions === ConstantData.DimensionFlags.SED_DF_Select;

    if (svgDoc && shouldSetVisibility) {
      setVisibility(svgDoc, ConstantData.SVGElementClass.DIMENSIONLINE, isVisible);
      setVisibility(svgDoc, ConstantData.SVGElementClass.DIMENSIONTEXT, isVisible);
      setVisibility(svgDoc, ConstantData.SVGElementClass.DIMENSIONTEXTNOEDIT, isVisible);
    }

    console.log('= S.BaseDrawingObject: SetDimensionLinesVisibility output: visibility set to', isVisible);
  }

  NeedsAddLineThicknessToDimension(dimension: any): boolean {
    console.log("= S.BaseDrawingObject: NeedsAddLineThicknessToDimension input:", dimension);

    // Currently, the function always returns false.
    const result = false;

    console.log("= S.BaseDrawingObject: NeedsAddLineThicknessToDimension output:", result);
    return result;
  }

  GetLengthInRulerUnits(length: number, offset?: number): string {
    console.log("= S.BaseDrawingObject: GetLengthInRulerUnits input:", { length, offset });

    const sessionBlock = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
    let result = '';
    let feet = 0;
    let inches = 0;
    let fractionalInches = 0;
    let numerator = 0;
    let denominator = 0;
    let fraction = '';
    let sign = 1;
    const decimalPlaces = Math.pow(10, GlobalData.docHandler.rulerSettings.dp);

    if (offset) {
      offset *= 100;
      if (!GlobalData.docHandler.rulerSettings.useInches) {
        offset /= ConstantData.Defines.MetricConv;
      }
      length -= offset;
    }

    if (GlobalData.docHandler.rulerSettings.showpixels) {
      result = Math.round(length).toString();
      console.log("= S.BaseDrawingObject: GetLengthInRulerUnits output:", result);
      return result;
    }

    if (GlobalData.docHandler.rulerSettings.useInches && GlobalData.docHandler.rulerSettings.units === ConstantData.RulerUnits.SED_Feet) {
      let totalInches = this.GetLengthInUnits(length, true);
      if (totalInches < 0) {
        sign = -1;
        totalInches = -totalInches;
      }
      feet = Math.floor(totalInches / 12);
      inches = Math.floor(totalInches % 12);
      fractionalInches = totalInches - (feet * 12 + inches);

      if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_ShowFeetAsInches) {
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
    } else if (GlobalData.docHandler.rulerSettings.units === ConstantData.RulerUnits.SED_Inches) {
      const inches = this.GetLengthInUnits(length);
      result = (Math.round(inches * decimalPlaces) / decimalPlaces).toString();
    } else {
      const units = this.GetLengthInUnits(length);
      if (GlobalData.docHandler.rulerSettings.units === ConstantData.RulerUnits.SED_M || GlobalData.docHandler.rulerSettings.units === ConstantData.RulerUnits.SED_Cm) {
        result = (Math.round(units * decimalPlaces) / decimalPlaces).toString();
      } else if (GlobalData.docHandler.rulerSettings.units === ConstantData.RulerUnits.SED_Mm) {
        result = Math.round(units).toString();
      }
    }

    console.log("= S.BaseDrawingObject: GetLengthInRulerUnits output:", result);
    return result;
  }

  GetDimensionTextForPoints(startPoint: Point, endPoint: Point): string {
    console.log("= S.BaseDrawingObject: GetDimensionTextForPoints input:", { startPoint, endPoint });

    // Calculate the angle between the start and end points
    const startAngle = 360 - Utils1.CalcAngleFromPoints(startPoint, endPoint);
    const radians = 2 * Math.PI * (startAngle / 360);

    // Create a copy of the points and rotate them around the center of the frame
    const points = [new Point(startPoint.x, startPoint.y), new Point(endPoint.x, endPoint.y)];
    Utils3.RotatePointsAboutCenter(this.Frame, -radians, points);

    // Calculate the distance between the rotated points
    const distance = Math.abs(points[0].x - points[1].x);

    // Convert the distance to ruler units
    const result = this.GetLengthInRulerUnits(distance);
    console.log("= S.BaseDrawingObject: GetDimensionTextForPoints output:", result);
    return result;
  }

  UpdateDimensionFromTextObj(textObject: any): void {
    console.log("= S.BaseDrawingObject: UpdateDimensionFromTextObj input:", textObject);

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

    console.log("= S.BaseDrawingObject: UpdateDimensionFromTextObj output: completed");
  }

  UpdateDimensionFromText(textObject: any, text: string, segment: any): void {
    console.log("= S.BaseDrawingObject: UpdateDimensionFromText input:", { textObject, text, segment });

    // TODO: Implement the logic to update dimensions from text.
    // This is a placeholder for the actual implementation.

    console.log("= S.BaseDrawingObject: UpdateDimensionFromText output: completed");
  }

  MaintainProportions(width: number, height: number): { width: number; height: number } | null {
    console.log("= S.BaseDrawingObject: MaintainProportions input:", { width, height });

    // Placeholder logic for maintaining proportions
    const result = null;

    console.log("= S.BaseDrawingObject: MaintainProportions output:", result);
    return result;
  }

  CanUseRFlags(): boolean {
    console.log("= S.BaseDrawingObject: CanUseRFlags input: none");
    const result = true;
    console.log("= S.BaseDrawingObject: CanUseRFlags output:", result);
    return result;
  }

  UpdateDimensionsFromTextForHookedObject(textObject: any, text: string, hookedObjectInfo: any): void {
    console.log("= S.BaseDrawingObject: UpdateDimensionsFromTextForHookedObject input:", { textObject, text, hookedObjectInfo });

    const segmentIndex = hookedObjectInfo.segment;
    GlobalData.optManager.ShowSVGSelectionState(this.BlockID, false);

    const dimensionLength = this.GetDimensionLengthFromString(text, segmentIndex);
    if (dimensionLength <= 0) {
      GlobalData.optManager.AddToDirtyList(this.BlockID);
      GlobalData.optManager.RenderDirtySVGObjects();
      return;
    }

    const hookedObject = GlobalData.optManager.GetObjectPtr(hookedObjectInfo.hookedObjectID, true);
    if (!hookedObject) {
      console.log("= S.BaseDrawingObject: UpdateDimensionsFromTextForHookedObject output: hooked object not found");
      return;
    }

    const hookConnection = hookedObject.hooks[0].connect;
    const perimeterPoints = this.GetPerimPts(this.BlockID, [hookConnection], hookedObject.hooks[0].hookpt, false, -1, hookedObject.BlockID);

    const startPoint = new Point(hookedObjectInfo.start.x, hookedObjectInfo.start.y);
    const endPoint = new Point(hookedObjectInfo.end.x, hookedObjectInfo.end.y);
    const dimensionPoints = [startPoint, endPoint];

    const angle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(startPoint, endPoint);
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
      ConstantData.HookFlags.SED_LC_NoSnaps | ConstantData.HookFlags.SED_LC_HookNoExtra | ConstantData.HookFlags.SED_LC_ShapeOnLine,
      null
    );

    if (targetPoints && isPointInRect) {
      GlobalData.optManager.UpdateHook(hookedObject.BlockID, 0, this.BlockID, hookedObject.hooks[0].hookpt, targetPoints[0]);
      GlobalData.optManager.SetLinkFlag(hookedObject.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
      GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
      GlobalData.optManager.UpdateLinks();
      GlobalData.optManager.UpdateHook(hookedObject.BlockID, 0, this.BlockID, hookedObject.hooks[0].hookpt, targetPoints[0]);
    } else {
      setTimeout(() => {
        // Warning user could find the dimension text
      }, 250);
    }

    console.log("= S.BaseDrawingObject: UpdateDimensionsFromTextForHookedObject output: completed");
  }

  UpdateDimensions(inputElement: any, triggerType: any, additionalInfo: any): void {
    console.log("= S.BaseDrawingObject: UpdateDimensions input:", { inputElement, triggerType, additionalInfo });

    // TODO: Implement the logic to update dimensions here.
    // This is a placeholder for the actual implementation.

    console.log("= S.BaseDrawingObject: UpdateDimensions output: completed");
  }

  GetDimensions(): { width: number; height: number } {
    console.log("= S.BaseDrawingObject: GetDimensions input: none");

    const dimensions = {
      width: this.Frame.width,
      height: this.Frame.height
    };

    console.log("= S.BaseDrawingObject: GetDimensions output:", dimensions);
    return dimensions;
  }

  GetDimensionsForDisplay(): { x: number; y: number; width: number; height: number } {
    console.log("= S.BaseDrawingObject: GetDimensionsForDisplay input: none");

    const dimensions = {
      x: this.Frame.x,
      y: this.Frame.y,
      width: this.Frame.width,
      height: this.Frame.height
    };

    console.log("= S.BaseDrawingObject: GetDimensionsForDisplay output:", dimensions);
    return dimensions;
  }

  CreateDimension(container, pathCreator, isAreaDimension, angle, text, startPoint, endPoint, segmentIndex, isPolygon, isStandoff, hookedObjectInfo?) {

    let textShape, textFramePoints = [], leftArrowPoints = [], rightArrowPoints = [], topArrowPoints = [], bottomArrowPoints = [];
    let boundingBox = new Rectangle(), textFrameRect = new Rectangle(), dimensionBounds = { left: -1, top: -1, right: -1, bottom: -1 };
    let isLocked = this.flags & ConstantData.ObjFlags.SEDO_Lock;
    let rotationAngle = this.RotationAngle + angle;
    let textFrameData = { segment: segmentIndex, hookedObjectInfo: null, textFramePts: [] };

    if (hookedObjectInfo) {
      textFrameData.hookedObjectInfo = hookedObjectInfo;
    }

    if (container) {
      textShape = GlobalData.optManager.svgDoc.CreateShape(ConstantData.CreateShapeType.TEXT);
      container.AddElement(textShape);
      textShape.SetRenderingEnabled(false);
      textShape.SetText(text);
      if (Utils2.HasFlag(this.Dimensions, ConstantData.DimensionFlags.SED_DF_Select)) {
        textShape.ExcludeFromExport(true);
      }
      textShape.SetUserData(textFrameData);

      if (this.LineType !== ConstantData.LineType.LINE && (isAreaDimension || this.Dimensions & ConstantData.DimensionFlags.SED_DF_Total || this.Dimensions & ConstantData.DimensionFlags.SED_DF_EndPts || this.NoGrow())) {
        textShape.SetID(ConstantData.SVGElementClass.DIMENSIONTEXTNOEDIT);
      } else {
        textShape.SetID(ConstantData.SVGElementClass.DIMENSIONTEXT);
        textShape.SetEditCallback(this.DimensionEditCallback, this);
      }

      textShape.SetFormat(GlobalData.optManager.theContentHeader.DimensionFontStyle);
      textShape.SetConstraints(GlobalData.optManager.theContentHeader.MaxWorkDim.x, 0, 0);
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
        if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Standoff && this.CanUseStandOffDimensionLines() && !isStandoff) {
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
        hammerInstance.on('tap', DefaultEvt.Evt_DimensionTextTapFactory(this, textFrameData, false));
        hammerInstance.on('doubletap', DefaultEvt.Evt_DimensionTextTapFactory(this, textFrameData, true));
        textShape.SetEventProxy(hammerInstance);
      }
    }
  }

  CreateCoordinateLine(container, pathCreator, isAreaDimension, angle, text, startPoint, endPoint, segmentIndex, isPolygon, isStandoff, hookedObjectInfo?) {

    let textShape, textFramePoints = [], leftArrowPoints = [], rightArrowPoints = [], topArrowPoints = [], bottomArrowPoints = [];
    let boundingBox = new Rectangle(), textFrameRect = new Rectangle(), dimensionBounds = { left: -1, top: -1, right: -1, bottom: -1 };
    let isLocked = this.flags & ConstantData.ObjFlags.SEDO_Lock;
    let rotationAngle = this.RotationAngle + angle;
    let textFrameData = { segment: segmentIndex, hookedObjectInfo: null, textFramePts: [] };

    if (hookedObjectInfo) {
      textFrameData.hookedObjectInfo = hookedObjectInfo;
    }

    if (!container) {
      return;
    }

    textShape = GlobalData.optManager.svgDoc.CreateShape(ConstantData.CreateShapeType.TEXT);
    container.AddElement(textShape);
    textShape.SetRenderingEnabled(false);
    textShape.SetText(angle);

    const hasSelectFlag = Utils2.HasFlag(this.Dimensions, ConstantData.DimensionFlags.SED_DF_Select);

    if (hasSelectFlag) {
      textShape.ExcludeFromExport(true);
    }

    textShape.SetUserData(textFrameData);

    const isNotLine = this.LineType !== ConstantData.LineType.LINE;
    const isTotalEndPtsFlag = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Total || this.Dimensions & ConstantData.DimensionFlags.SED_DF_EndPts;

    if (isNotLine && (isAreaDimension || isTotalEndPtsFlag || this.NoGrow())) {
      textShape.SetID(ConstantData.SVGElementClass.DIMENSIONTEXTNOEDIT);
    } else {
      textShape.SetID(ConstantData.SVGElementClass.DIMENSIONTEXT);
      textShape.SetEditCallback(this.DimensionEditCallback, this);
    }

    textShape.SetFormat(GlobalData.optManager.theContentHeader.DimensionFontStyle);
    textShape.SetConstraints(GlobalData.optManager.theContentHeader.MaxWorkDim.x, 0, 0);
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

      const isStdOff = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Standoff;
      const check3 = isStdOff && this.CanUseStandOffDimensionLines() && !isStandoff;

      if (check3) {

        console.log('=== wall CreateCoordinateLine.leftArrowPoints=', leftArrowPoints);
        console.log('=== wall CreateCoordinateLine.rightArrowPoints=', rightArrowPoints);

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
      hammerInstance.on('tap', DefaultEvt.Evt_DimensionTextTapFactory(this, textFrameData, false));
      hammerInstance.on('doubletap', DefaultEvt.Evt_DimensionTextTapFactory(this, textFrameData, true));
      textShape.SetEventProxy(hammerInstance);
    }
  }

  DrawDimensionAngle(container: any, pathCreator: any, segmentIndex: number, dimensionPoints: Point[]): void {
    console.log("= S.BaseDrawingObject: DrawDimensionAngle input:", { container, pathCreator, segmentIndex, dimensionPoints });

    let dimensionInfo, textMinDimensions, distanceBetweenPoints;
    const angleChangeData = { angleChange: 1, segment: segmentIndex };

    dimensionInfo = this.GetDimensionAngleInfo(segmentIndex, dimensionPoints);
    if (dimensionInfo) {
      container.AddElement(dimensionInfo.text);
      dimensionInfo.text.SetRenderingEnabled(false);
      dimensionInfo.text.SetUserData(angleChangeData);
      dimensionInfo.text.SetID(ConstantData.SVGElementClass.DIMENSIONTEXT);
      dimensionInfo.text.SetEditCallback(this.DimensionEditCallback, this);
      dimensionInfo.text.SetConstraints(GlobalData.optManager.theContentHeader.MaxWorkDim.x, 0, 0);
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
        hammerInstance.on('tap', DefaultEvt.Evt_DimensionTextTapFactory(this, angleChangeData, false));
        hammerInstance.on('doubletap', DefaultEvt.Evt_DimensionTextTapFactory(this, angleChangeData, true));
        dimensionInfo.text.SetEventProxy(hammerInstance);
      } else {
        container.RemoveElement(dimensionInfo.text);
      }

      if (distanceBetweenPoints > textMinDimensions.width + 2 * ConstantData.LineAngleDimensionDefs.ANGLEDIMENSION_ARROWHEAD_SIZE) {
        Utils2.InflateRect(dimensionInfo.textRect, 2, 2);
        this.DrawDimensionAngleArc(container, pathCreator, dimensionInfo.targetLinePts[0], dimensionInfo.targetLinePts[1], dimensionInfo.textRect, dimensionInfo.baseLinePts[1]);
        this.DrawDimensionAngleArc(container, pathCreator, dimensionInfo.targetLinePts[0], dimensionInfo.targetLinePts[1], dimensionInfo.textRect, dimensionInfo.targetLinePts[1]);
      }

      if (!(this.Dimensions & ConstantData.DimensionFlags.SED_DF_InteriorAngles)) {
        pathCreator.MoveTo(dimensionInfo.baseLinePts[0].x, dimensionInfo.baseLinePts[0].y);
        pathCreator.LineTo(dimensionInfo.baseLinePts[1].x, dimensionInfo.baseLinePts[1].y);
      }
    }

    console.log("= S.BaseDrawingObject: DrawDimensionAngle output: completed");
  }

  UpdateLineAngleDimensionFromText(textObject: any, text: string, segment: any): void {
    console.log("= S.BaseDrawingObject: UpdateLineAngleDimensionFromText input:", { textObject, text, segment });

    let angle = parseFloat(text);

    if (isNaN(angle) || angle < -360 || angle > 360) {
      this.UpdateDimensionLines(textObject);
    } else {
      if (angle < 0) {
        angle += 360;
      }
      this.SetSegmentAngle(textObject, segment.segment, angle);
    }

    console.log("= S.BaseDrawingObject: UpdateLineAngleDimensionFromText output: completed");
  }

  SetSegmentAngle(segment: any, angle: number, additionalData: any): void {
    console.log("= S.BaseDrawingObject: SetSegmentAngle input:", { segment, angle, additionalData });

    // TODO: Implement the logic to set the segment angle here.
    // This is a placeholder for the actual implementation.

    console.log("= S.BaseDrawingObject: SetSegmentAngle output: completed");
  }

  DrawDimensionAngleArrowhead(container: any, angle: number, point: Point): void {
    console.log("= S.BaseDrawingObject: DrawDimensionAngleArrowhead input:", { container, angle, point });

    const arrowheadPoints: Point[] = [];
    const boundingRect: Rectangle = new Rectangle();

    // Define the arrowhead points relative to the given point
    arrowheadPoints.push(new Point(point.x, point.y));
    arrowheadPoints.push(
      new Point(
        point.x - ConstantData.LineAngleDimensionDefs.ANGLEDIMENSION_ARROWHEAD_SIZE,
        point.y + ConstantData.LineAngleDimensionDefs.ANGLEDIMENSION_ARROWHEAD_WIDTH
      )
    );
    arrowheadPoints.push(
      new Point(
        point.x - ConstantData.LineAngleDimensionDefs.ANGLEDIMENSION_ARROWHEAD_SIZE,
        point.y - ConstantData.LineAngleDimensionDefs.ANGLEDIMENSION_ARROWHEAD_WIDTH
      )
    );

    // Rotate the arrowhead points around the given point by the specified angle
    Utils3.RotatePointsAboutPoint(point, angle, arrowheadPoints);

    // Calculate the bounding rectangle for the arrowhead points
    Utils2.GetPolyRect(boundingRect, arrowheadPoints);

    // Create the arrowhead shape and set its properties
    const arrowheadShape = GlobalData.optManager.svgDoc.CreateShape(ConstantData.CreateShapeType.POLYGON);
    arrowheadShape.SetPoints(arrowheadPoints);
    arrowheadShape.SetEventBehavior(Element.EventBehavior.ALL);
    arrowheadShape.SetID(ConstantData.SVGElementClass.DIMENSIONLINE);
    arrowheadShape.SetPos(0, 0);
    arrowheadShape.SetSize(boundingRect.width, boundingRect.height);
    arrowheadShape.SetFillColor(ConstantData.Defines.DimensionLineColor);

    // Add the arrowhead shape to the container
    container.AddElement(arrowheadShape);

    console.log("= S.BaseDrawingObject: DrawDimensionAngleArrowhead output: arrowhead drawn");
  }

  GetPerpendicularAngle(point1: Point, point2: Point, isClockwise: boolean): number {
    console.log("= S.BaseDrawingObject: GetPerpendicularAngle input:", { point1, point2, isClockwise });

    let angle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(point1, point2);
    angle += isClockwise ? Math.PI / 2 : -Math.PI / 2;

    if (angle < 0) {
      angle += 2 * Math.PI;
    }

    if (angle > 2 * Math.PI) {
      angle -= 2 * Math.PI;
    }

    console.log("= S.BaseDrawingObject: GetPerpendicularAngle output:", angle);
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
    console.log("= S.BaseDrawingObject: DrawDimensionAngleArc input:", {
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
    let startAngle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(startPoint, arcCenter);
    let endAngle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(startPoint, centerPoint);

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
    let arcStartAngle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(startPoint, arcStartPoint);

    let arcPoints = GlobalData.optManager.ArcToPoly(
      ConstantData.Defines.NPOLYPTS,
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
      if (Utils2.GetDistanceBetween2Points(arrowheadPoint, arcPoints[index]) > ConstantData.LineAngleDimensionDefs.ANGLEDIMENSION_ARROWHEAD_SIZE) {
        arrowheadPoint = arcPoints[index];
        break;
      }
    }

    let arrowheadAngle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(arrowheadPoint, arcPoints[0]);
    this.DrawDimensionAngleArrowhead(container, arrowheadAngle, arcPoints[0]);

    console.log("= S.BaseDrawingObject: DrawDimensionAngleArc output: completed");
  }

  GetDimensionAngleInfo(segmentIndex: number, points: Point[]): any {
    console.log("= S.BaseDrawingObject: GetDimensionAngleInfo input:", { segmentIndex, points });

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
    if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_InteriorAngles && segmentIndex === 1 && !isClosedShape) {
      return null;
    }

    // Skip if the segment is not a line
    if (this.polylist && segmentIndex >= 1 && segmentIndex < this.polylist.segs.length) {
      const prevSegmentIndex = segmentIndex > 1 ? segmentIndex - 1 : this.polylist.segs.length - 1;
      if (this.polylist.segs[segmentIndex].LineType !== ConstantData.LineType.LINE || this.polylist.segs[prevSegmentIndex].LineType !== ConstantData.LineType.LINE) {
        return null;
      }
    }

    // Initialize base line points
    baseLinePoints.push(new Point(targetLinePoints[0].x, targetLinePoints[0].y));
    if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_InteriorAngles) {
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
    angle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(targetLinePoints[0], targetLinePoints[1]);
    baseAngle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(baseLinePoints[0], baseLinePoints[1]);
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
    preferredBisectorLength = ConstantData.LineAngleDimensionDefs.ANGLEDIMENSION_PREFERRED_BISECTOR_LEN < minDistance ? ConstantData.LineAngleDimensionDefs.ANGLEDIMENSION_PREFERRED_BISECTOR_LEN : minDistance;
    bisectorPoints[1].x = bisectorPoints[0].x + preferredBisectorLength;
    Utils3.RotatePointsAboutPoint(targetLinePoints[0], halfAngle, bisectorPoints);

    // Calculate angle in degrees
    angleInDegrees = Math.abs(angle / (2 * Math.PI) * 360);
    angleInDegrees = Math.round(angleInDegrees);
    text = angleInDegrees.toString() + '°';

    // Create text shape
    textShape = GlobalData.optManager.svgDoc.CreateShape(ConstantData.CreateShapeType.TEXT);
    textShape.SetFormat(GlobalData.optManager.theContentHeader.DimensionFontStyle);
    textShape.SetText(text);
    textDimensions = textShape.GetTextMinDimensions();

    // Adjust bisector length if necessary
    while (preferredBisectorLength < minDistance && Math.tan(angle / 2) * preferredBisectorLength < textDimensions.width / 2 + ConstantData.LineAngleDimensionDefs.ANGLEDIMENSION_PREFERRED_ARROWSTEM_MINIMUM + ConstantData.LineAngleDimensionDefs.ANGLEDIMENSION_ARROWHEAD_SIZE) {
      preferredBisectorLength += ConstantData.LineAngleDimensionDefs.ANGLEDIMENSION_PREFERRED_BISECTOR_LEN;
      if (preferredBisectorLength >= minDistance) {
        preferredBisectorLength = minDistance;
      }
    }

    // Set line lengths
    GlobalData.optManager.SetLineLength(targetLinePoints[0], targetLinePoints[1], preferredBisectorLength);
    GlobalData.optManager.SetLineLength(baseLinePoints[0], baseLinePoints[1], preferredBisectorLength);
    GlobalData.optManager.SetLineLength(bisectorPoints[0], bisectorPoints[1], preferredBisectorLength);

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

    console.log("= S.BaseDrawingObject: GetDimensionAngleInfo output:", result);
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
    console.log("= S.BaseDrawingObject: GetPointsForDimension input:", {
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

    textShape = GlobalData.optManager.svgDoc.CreateShape(ConstantData.CreateShapeType.TEXT);
    textShape.SetText(text);
    textShape.SetFormat(GlobalData.optManager.theContentHeader.DimensionFontStyle);
    textShape.SetConstraints(GlobalData.optManager.theContentHeader.MaxWorkDim.x, 0, 0);

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

    console.log("= S.BaseDrawingObject: GetPointsForDimension output:", result);
    return result;
  }

  GetAreaDimension(points: Point[]): string | void {
    console.log("= S.BaseDrawingObject: GetAreaDimension input:", points);

    let result: string | void;

    if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Area) {
      result = this.GetAreaDimensionText(points);
    } else if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_RectWithAndHeight) {
      result = this.GetAreaWidthAndHeightText(points);
    }

    console.log("= S.BaseDrawingObject: GetAreaDimension output:", result);
    return result;
  }

  GetAreaDimensionText(points: Point[]): string {
    console.log("= S.BaseDrawingObject: GetAreaDimensionText input:", points);

    let area = 0;
    let result = '';

    if (points) {
      area = this.calculatePolygonArea(points);
    } else {
      area = this.Frame.width * this.Frame.height;
    }

    const lengthInUnits = GlobalData.docHandler.rulerSettings.showpixels ? area : this.GetLengthInUnits(area);
    result = this.GetLengthInRulerUnits(lengthInUnits);

    console.log("= S.BaseDrawingObject: GetAreaDimensionText output:", result);
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
    console.log("= S.BaseDrawingObject: GetAreaWidthAndHeightText input:", points);

    // Placeholder logic for calculating width and height text
    const result = null;

    console.log("= S.BaseDrawingObject: GetAreaWidthAndHeightText output:", result);
    return result;
  }

  GetDimensionPoints(): Point[] {
    console.log("= S.BaseDrawingObject: GetDimensionPoints input");

    let points = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, false, false, null);
    if (this.RotationAngle) {
      const angleInRadians = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, angleInRadians, points);
    }

    console.log("= S.BaseDrawingObject: GetDimensionPoints output:", points);
    return points;
  }

  // Horizon and vertial points 0,0 -> horizon x,0 | 0,0 -> vertial y,0

  GetCoordinateLinePoints(): Point[] {
    console.log("= S.BaseDrawingObject: GetCoordinateLinePoints input");

    let points = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, false, false, null);
    if (this.RotationAngle) {
      const angleInRadians = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, angleInRadians, points);
    }

    console.log("= S.BaseDrawingObject: GetCoordinateLinePoints output:", points);
    return points;
  }

  GetHookedObjectDescList(dimensionPoints: Point[], context: any): any[] {
    console.log("= S.BaseDrawingObject: GetHookedObjectDescList input:", { dimensionPoints, context });

    let result: any[] = [];
    let linkManager = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theLinksBlockID, false);
    let boundingRect = new Rectangle(0, 0, 0, 0);
    let hookPoints: Point[] = [];
    let hookObject: any = null;
    let connectPoint: Point = { x: 0, y: 0 };
    let segmentSortValue = 0;

    if (linkManager) {
      let linkIndex = GlobalData.optManager.FindLink(linkManager, this.BlockID, true);
      let linkCount = linkManager.length;

      while (linkIndex >= 0 && linkIndex < linkCount && linkManager[linkIndex].targetid === this.BlockID) {
        hookObject = GlobalData.optManager.GetObjectPtr(linkManager[linkIndex].hookid, false);
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
      hookObject = GlobalData.optManager.GetObjectPtr(hookPoints[i], false);
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

        let angle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(segmentPoints[0], segmentPoints[1]);
        Utils3.RotatePointsAboutCenter(boundingRect, -angle, segmentPoints);

        let hookObjectPoints = context && context.movingShapeID === hookObject.BlockID ?
          Utils2.PolyFromRect(context.movingShapeBBox) :
          hookObject.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false, null);

        let rotationAngle = context && context.movingShapeID === hookObject.BlockID ? angle : -hookObject.RotationAngle / (180 / ConstantData.Geometry.PI);
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

    console.log("= S.BaseDrawingObject: GetHookedObjectDescList output:", result);
    return result;
  }

  GetHookedObjectDimensionInfo(context: any): any[] {
    console.log("= S.BaseDrawingObject: GetHookedObjectDimensionInfo input:", context);

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

    console.log("= S.BaseDrawingObject: GetHookedObjectDimensionInfo output:", hookedObjectInfoList);
    return hookedObjectInfoList;
  }

  DimensionLineDeflectionAdjust(
    element: any,
    segmentIndex: number,
    knobPoint: Point,
    ccAngleRadians: number,
    adjustForKnob: number
  ): any {
    console.log("= S.BaseDrawingObject: DimensionLineDeflectionAdjust input:", {
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

    console.log("= S.BaseDrawingObject: DimensionLineDeflectionAdjust output:", deflectionValue);
    return deflectionValue;
  }

  GetDimensionLineDeflectionKnobUserData(element, segmentIndex, dimensionPoints, knobRadius, knobOffset) {
    console.log("= S.BaseDrawingObject: GetDimensionLineDeflectionKnobUserData input:", {
      element,
      segmentIndex,
      dimensionPoints,
      knobRadius,
      knobOffset
    });

    let textElement = null;
    let bbox, rotationAngle, angleInRadians, midPoint, deflectionAngle, isReverseWinding = false;
    const points = [];
    const textElements = element.GetElementListWithID(ConstantData.SVGElementClass.DIMENSIONTEXT);

    for (let i = 0; i < textElements.length; i++) {
      if (textElements[i].userData.segment === segmentIndex && textElements[i].userData.side === undefined) {
        textElement = textElements[i];
        break;
      }
    }

    if (!textElement) {
      console.log("= S.BaseDrawingObject: GetDimensionLineDeflectionKnobUserData output: null");
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

    deflectionAngle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(dimensionPoints[segmentIndex - 1], dimensionPoints[segmentIndex]);

    if (this instanceof Instance.Shape.Polygon && this.polylist) {
      const polyCopy = Utils1.DeepCopy(this);
      const polyLine = GlobalData.optManager.ShapeToPolyLine(this.BlockID, false, true, polyCopy);
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

    console.log("= S.BaseDrawingObject: GetDimensionLineDeflectionKnobUserData output:", result);
    return result;
  }

  GetDimensionDeflectionValue(segmentIndex: number): number {
    console.log("= S.BaseDrawingObject: GetDimensionDeflectionValue input:", segmentIndex);

    let deflectionValue = 0;
    if (segmentIndex === 1) {
      deflectionValue = this.dimensionDeflectionH ? this.dimensionDeflectionH : 0;
    } else {
      deflectionValue = this.dimensionDeflectionV ? this.dimensionDeflectionV : 0;
    }

    console.log("= S.BaseDrawingObject: GetDimensionDeflectionValue output:", deflectionValue);
    return deflectionValue;
  }

  GetDimensionLineDeflection(knobPoint: Point, x: number, y: number, deflectionData: any): number {
    console.log("= S.BaseDrawingObject: GetDimensionLineDeflection input:", { knobPoint, x, y, deflectionData });

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

    console.log("= S.BaseDrawingObject: GetDimensionLineDeflection output:", result);
    return result;
  }

  UpdateDimensionLines(container: any, triggerType: any): any {
    console.log("= S.BaseDrawingObject: UpdateDimensionLines input:", { container, triggerType });

    if (GlobalData.optManager.bBuildingSymbols) {
      return container;
    }

    if (container != null) {
      this.RemoveDimensionLines(container);

      const hasAreaOrRectDimensions = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Area ||
        this.Dimensions & ConstantData.DimensionFlags.SED_DF_RectWithAndHeight;

      if (hasAreaOrRectDimensions) {
        this.UpdateAreaDimensionLines(container);
      }

      const hasAlwaysOrSelectDimensions = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always ||
        this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select || triggerType;

      if (hasAlwaysOrSelectDimensions) {
        this.UpdateEdgeDimensionLines(container, triggerType);
      }

      console.log("= S.BaseDrawingObject: UpdateDimensionLines output:", container);
      return container;
    }

    console.log("= S.BaseDrawingObject: UpdateDimensionLines output: null");
    return null;
  }

  UpdateCoordinateLines(container: any, triggerType: any): any {
    console.log("= S.BaseDrawingObject: UpdateCoordinateLines input:", { container, triggerType });

    if (GlobalData.optManager.bBuildingSymbols) {
      return container;
    }

    if (container != null) {
      this.RemoveCoordinateLines(container);

      const hasAreaOrRectDimensions = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Area ||
        this.Dimensions & ConstantData.DimensionFlags.SED_DF_RectWithAndHeight;

      if (hasAreaOrRectDimensions) {
        this.UpdateAreaDimensionLines(container);
      }

      const hasAlwaysOrSelectDimensions = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always ||
        this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select || triggerType;

      if (hasAlwaysOrSelectDimensions) {
        this.UpdateEdgeCoordinateLines(container, triggerType);
      }

      console.log("= S.BaseDrawingObject: UpdateCoordinateLines output:", container);
      return container;
    }

    console.log("= S.BaseDrawingObject: UpdateCoordinateLines output: null");
    return null;
  }

  UpdateHookedObjectDimensionLines(container: any, pathCreator: any, dimensionInfo: any): void {
    console.log("= S.BaseDrawingObject: UpdateHookedObjectDimensionLines input:", { container, pathCreator, dimensionInfo });

    if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_AllSeg) {
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

    console.log("= S.BaseDrawingObject: UpdateHookedObjectDimensionLines output: completed");
  }

  UpdateEdgeDimensionLines(element, triggerType) {
    console.log("= S.BaseDrawingObject: UpdateEdgeDimensionLines input:", { element, triggerType });

    let pathShape, pathCreator, dimensionPoints, isPolygon;
    let angle = 0, segmentIndex = 0, dimensionText = '', dimensionLineShape = null, path = null;

    if (!element) {
      console.log("= S.BaseDrawingObject: UpdateEdgeDimensionLines output: element is null");
      return;
    }

    pathShape = GlobalData.optManager.svgDoc.CreateShape(ConstantData.CreateShapeType.PATH);
    element.AddElement(pathShape);
    pathCreator = pathShape.PathCreator();
    pathShape.SetID(ConstantData.SVGElementClass.DIMENSIONLINE);
    pathShape.SetFillColor('none');
    pathShape.SetStrokeColor(ConstantData.Defines.DimensionLineColor);
    pathShape.SetStrokeOpacity(1);
    pathShape.SetStrokeWidth(1);
    pathCreator.BeginPath();

    const alwaysOrSelectDimension = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always || this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select;
    dimensionPoints = this.GetDimensionPoints();

    console.log('= S.BaseDrawingObject: dimensionPoints:', dimensionPoints);

    const pointsLength = dimensionPoints.length;
    isPolygon = this instanceof Instance.Shape.Polygon;

    if (alwaysOrSelectDimension) {
      for (segmentIndex = 1; segmentIndex < pointsLength; segmentIndex++) {
        if (!Utils2.EqualPt(dimensionPoints[segmentIndex - 1], dimensionPoints[segmentIndex])) {
          angle = Utils1.CalcAngleFromPoints(dimensionPoints[segmentIndex - 1], dimensionPoints[segmentIndex]);
          dimensionText = this.GetDimensionFloatingPointValue(segmentIndex) || this.GetDimensionTextForPoints(dimensionPoints[segmentIndex - 1], dimensionPoints[segmentIndex]);

          console.log('= S.BaseDrawingObject: angle:', angle);
          console.log('= S.BaseDrawingObject: dimensionText:', dimensionText);

          this.CreateDimension(element, pathCreator, false, angle, dimensionText, dimensionPoints[segmentIndex - 1], dimensionPoints[segmentIndex], segmentIndex, false, isPolygon);
        }
      }
    }

    this.UpdateSecondaryDimensions(element, pathCreator, triggerType);
    this.ShowOrHideDimensions(false, triggerType);
    pathCreator.Apply();

    console.log("= S.BaseDrawingObject: UpdateEdgeDimensionLines output: completed");
  }

  UpdateEdgeCoordinateLines(shapeContainer, triggerType) {
    console.log("= S.BaseDrawingObject: UpdateEdgeCoordinateLines input:", { shapeContainer, triggerType });

    let pathShape, pathCreator;
    let coordinateLinePoints;
    let isPolygon;
    let angle = 0, segmentIndex = 0, dimensionText = '', dimensionLineShape = null, path = null;

    if (!shapeContainer) {
      console.log("= S.BaseDrawingObject: UpdateEdgeCoordinateLines output: shapeContainer is null");
      return;
    }

    pathShape = GlobalData.optManager.svgDoc.CreateShape(ConstantData.CreateShapeType.PATH);
    shapeContainer.AddElement(pathShape);
    pathCreator = pathShape.PathCreator();
    pathShape.SetID(ConstantData.SVGElementClass.CoordinateLine);
    pathShape.SetFillColor('none');
    pathShape.SetStrokeColor(ConstantData.Defines.CoordinateLineColor);
    pathShape.SetStrokeOpacity(1);
    pathShape.SetStrokeWidth(1);
    pathShape.SetStrokePattern("5,5");
    pathCreator.BeginPath();

    const showCoordinateLine = true;
    coordinateLinePoints = this.GetCoordinateLinePoints();

    console.log('= S.BaseDrawingObject: coordinateLinePoints:', coordinateLinePoints);

    const pointsLength = coordinateLinePoints.length;
    isPolygon = this instanceof Instance.Shape.Polygon;

    if (showCoordinateLine) {
      for (segmentIndex = 1; segmentIndex < pointsLength; segmentIndex++) {
        if (!Utils2.EqualPt(coordinateLinePoints[segmentIndex - 1], coordinateLinePoints[segmentIndex])) {
          angle = Utils1.CalcAngleFromPoints(coordinateLinePoints[segmentIndex - 1], coordinateLinePoints[segmentIndex]);
          dimensionText = this.GetDimensionFloatingPointValue(segmentIndex) || this.GetDimensionTextForPoints(coordinateLinePoints[segmentIndex - 1], coordinateLinePoints[segmentIndex]);

          const startPoint = coordinateLinePoints[segmentIndex - 1];
          const endPoint = coordinateLinePoints[segmentIndex];

          console.log('= S.BaseDrawingObject: angle:', angle);
          console.log('= S.BaseDrawingObject: dimensionText:', dimensionText);
          console.log('= S.BaseDrawingObject: startPoint:', startPoint);
          console.log('= S.BaseDrawingObject: endPoint:', endPoint);

          this.CreateCoordinateLine(shapeContainer, pathCreator, false, angle, dimensionText, startPoint, endPoint, segmentIndex, false, isPolygon);
        }
      }
    }

    this.UpdateSecondaryDimensions(shapeContainer, pathCreator, triggerType);
    this.ShowOrHideDimensions(false, triggerType);
    pathCreator.Apply();

    console.log("= S.BaseDrawingObject: UpdateEdgeCoordinateLines output: completed");
  }

  UpdateSecondaryDimensions(container: any, pathCreator: any, triggerType: any): void {
    console.log("= S.BaseDrawingObject: UpdateSecondaryDimensions input:", { container, pathCreator, triggerType });

    // TODO: Implement the logic to update secondary dimensions here.
    // This is a placeholder for the actual implementation.

    console.log("= S.BaseDrawingObject: UpdateSecondaryDimensions output: completed");
  }

  HideOrShowSelectOnlyDimensions(show: boolean, context: any): void {
    console.log("= S.BaseDrawingObject: HideOrShowSelectOnlyDimensions input:", { show, context });

    let elementID: string;
    let elementIndex = 0;
    let element = null;
    let userData = null;
    let isHookedObject = false;
    let shouldShow = false;
    const svgLayer = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

    if (svgLayer !== null) {
      const dimensionClasses = [
        ConstantData.SVGElementClass.DIMENSIONLINE,
        ConstantData.SVGElementClass.DIMENSIONTEXT,
        ConstantData.SVGElementClass.AREADIMENSIONLINE,
        ConstantData.SVGElementClass.DIMENSIONTEXTNOEDIT
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
          shouldShow = !!isHookedObject || !!(this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always) || !!(this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select) && show;

          element.SetOpacity(shouldShow ? 1 : 0);
        }
      }
    }

    console.log("= S.BaseDrawingObject: HideOrShowSelectOnlyDimensions output: completed");
  }

  ShowOrHideDimensions(show: boolean, context: any): void {
    console.log("= S.BaseDrawingObject: ShowOrHideDimensions input:", { show, context });

    let hookedObject = null;
    this.HideOrShowSelectOnlyDimensions(show, context);

    if (this.hooks.length > 0 && context && context.movingShapeID === this.BlockID) {
      hookedObject = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);

      if (
        !hookedObject ||
        hookedObject.objecttype !== ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL ||
        hookedObject.Dimensions & ConstantData.DimensionFlags.SED_DF_HideHookedObjDimensions
      ) {
        hookedObject.HideOrShowSelectOnlyDimensions(show, context);
      }
    }

    console.log("= S.BaseDrawingObject: ShowOrHideDimensions output: completed");
  }

  GetPointsForAreaDimension(): Point[] {
    console.log("= S.BaseDrawingObject: GetPointsForAreaDimension input: none");

    const points = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false, null);

    console.log("= S.BaseDrawingObject: GetPointsForAreaDimension output:", points);
    return points;
  }

  UpdateAreaDimensionLines(container: any): void {
    console.log("= S.BaseDrawingObject: UpdateAreaDimensionLines input:", container);

    const pathShape = GlobalData.optManager.svgDoc.CreateShape(ConstantData.CreateShapeType.PATH);
    if (container != null) {
      container.AddElement(pathShape);
      const pathCreator = pathShape.PathCreator();
      pathShape.SetID(ConstantData.SVGElementClass.AREADIMENSIONLINE);
      pathShape.SetFillColor('none');
      pathShape.SetStrokeColor(ConstantData.Defines.DimensionLineColor);
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

    console.log("= S.BaseDrawingObject: UpdateAreaDimensionLines output: completed");
  }

  GetDimensionFloatingPointValue(segmentIndex: number): string | null {
    console.log("= S.BaseDrawingObject: GetDimensionFloatingPointValue input:", segmentIndex);

    let dimensionValue = 0;

    const hasWidthFlag = this.rflags & ConstantData.FloatingPointDim.SD_FP_Width;
    const hasHeightFlag = this.rflags & ConstantData.FloatingPointDim.SD_FP_Height;

    if (hasWidthFlag || hasHeightFlag) {
      if (segmentIndex === 1 && hasWidthFlag) {
        dimensionValue = this.GetDimensionLengthFromValue(this.rwd);
        const result = this.GetLengthInRulerUnits(dimensionValue);
        console.log("= S.BaseDrawingObject: GetDimensionFloatingPointValue output:", result);
        return result;
      } else if (segmentIndex === 2 && hasHeightFlag) {
        dimensionValue = this.GetDimensionLengthFromValue(this.rht);
        const result = this.GetLengthInRulerUnits(dimensionValue);
        console.log("= S.BaseDrawingObject: GetDimensionFloatingPointValue output:", result);
        return result;
      }
    }

    console.log("= S.BaseDrawingObject: GetDimensionFloatingPointValue output: null");
    return null;
  }

  IsTextFrameOverlap(textFrame: Rectangle, angle: number): boolean {
    console.log("= S.BaseDrawingObject: IsTextFrameOverlap input:", { textFrame, angle });

    // Placeholder logic for checking text frame overlap
    const result = false;

    console.log("= S.BaseDrawingObject: IsTextFrameOverlap output:", result);
    return result;
  }

  GetExteriorDimensionMeasurementLineThicknessAdjustment(thickness: number): number {
    console.log("= S.BaseDrawingObject: GetExteriorDimensionMeasurementLineThicknessAdjustment input:", thickness);

    // Placeholder logic for thickness adjustment
    const result = 0;

    console.log("= S.BaseDrawingObject: GetExteriorDimensionMeasurementLineThicknessAdjustment output:", result);
    return result;
  }

  CanUseStandOffDimensionLines(): boolean {
    console.log("= S.BaseDrawingObject: CanUseStandOffDimensionLines input: none");

    const result = true;

    console.log("= S.BaseDrawingObject: CanUseStandOffDimensionLines output:", result);
    return result;
  }

  GetDimensionLengthFromString(input: string, someParam: any): number {
    console.log("= S.BaseDrawingObject: GetDimensionLengthFromString input:", { input, someParam });

    let dimensionValue = this.GetDimensionValueFromString(input, someParam);
    let result = dimensionValue < 0 ? dimensionValue : this.GetDimensionLengthFromValue(dimensionValue);

    console.log("= S.BaseDrawingObject: GetDimensionLengthFromString output:", result);
    return result;
  }

  GetDimensionValueFromString(input: string, someParam: any): number {
    console.log("= S.BaseDrawingObject: GetDimensionValueFromString input:", { input, someParam });

    let value = 0;
    input = input.trim();

    if (input.length === 0) {
      console.log("= S.BaseDrawingObject: GetDimensionValueFromString output:", -1);
      return -1;
    }

    if (!input.match(/^[0-9. \/\'\"]+$/)) {
      console.log("= S.BaseDrawingObject: GetDimensionValueFromString output:", -1);
      return -1;
    }

    if (
      GlobalData.docHandler.rulerSettings.useInches &&
      GlobalData.docHandler.rulerSettings.units === ConstantData.RulerUnits.SED_Feet &&
      !GlobalData.docHandler.rulerSettings.showpixels
    ) {
      value = this.ConvertToFeet(input);
      if (value < 0 || isNaN(value)) {
        console.log("= S.BaseDrawingObject: GetDimensionValueFromString output:", -1);
        return -1;
      }
    } else {
      if (!this.NumberIsFloat(input)) {
        console.log("= S.BaseDrawingObject: GetDimensionValueFromString output:", -1);
        return -1;
      }
      value = parseFloat(input);
    }

    const result = isNaN(value) ? -1 : value;
    console.log("= S.BaseDrawingObject: GetDimensionValueFromString output:", result);
    return result;
  }

  GetDimensionLengthFromValue(value: number): number {
    console.log("= S.BaseDrawingObject: GetDimensionLengthFromValue input:", value);

    let length = 0;
    if (GlobalData.docHandler.rulerSettings.showpixels) {
      length = value;
    } else {
      length = this.UnitsToCoord(value, 0);
    }

    if (isNaN(length) || length > 400000) {
      length = -1;
    }

    console.log("= S.BaseDrawingObject: GetDimensionLengthFromValue output:", length);
    return length;
  }

  AdjustDimensionLength(length: number): number {
    console.log("= S.BaseDrawingObject: AdjustDimensionLength input:", length);
    const result = length;
    console.log("= S.BaseDrawingObject: AdjustDimensionLength output:", result);
    return result;
  }

  GetDimensionAreaTextInfo(textShape, textFramePoints, leftArrowPoints, rightArrowPoints, topArrowPoints, bottomArrowPoints) {
    console.log("= S.BaseDrawingObject: GetDimensionAreaTextInfo input:", {
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

    console.log("= S.BaseDrawingObject: GetDimensionAreaTextInfo output:", {
      textFramePoints,
      leftArrowPoints,
      rightArrowPoints,
      topArrowPoints,
      bottomArrowPoints
    });
  }

  GetFrameIntersects(frame: any, point: Point, tolerance: number): boolean {
    console.log("= S.BaseDrawingObject: GetFrameIntersects input:", { frame, point, tolerance });

    // Placeholder logic for frame intersection
    const result = false;

    console.log("= S.BaseDrawingObject: GetFrameIntersects output:", result);
    return result;
  }

  AdjustAutoInsertShape(insertEvent: any): boolean {
    console.log("= S.BaseDrawingObject: AdjustAutoInsertShape input:", insertEvent);
    const result = false;
    console.log("= S.BaseDrawingObject: AdjustAutoInsertShape output:", result);
    return result;
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

    const check1 = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Exterior || this.StyleRecord &&
      this.StyleRecord.Line && this.StyleRecord.Line.Thickness;

    if (check1) {
      (textDim.y -= this.StyleRecord.Line.Thickness);
    }

    const stdOffFlag = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Standoff;
    isStdOff = stdOffFlag != 0 && this.CanUseStandOffDimensionLines();
    const isHideHookedObjDimensions = this.Dimensions & ConstantData.DimensionFlags.SED_DF_HideHookedObjDimensions;

    const check3 = !isStandoff && !isHideHookedObjDimensions && this instanceof Instance.Shape.BaseLine &&
      this.ShortRef != ConstantData2.LineTypes.SED_LS_MeasuringTape &&
      this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL;

    if (
      check3
    ) {
      var linkObject = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theLinksBlockID, false);
      if (linkObject) {

        const fdLink = GlobalData.optManager.FindLink(linkObject, this.BlockID, !0);
        if (fdLink >= 0) {
          isStdOff = true;
        }
      }
    }

    if (isStandoff) {
      isStdOff = false;
    }

    const stdOffNum = isStdOff ? ConstantData.Defines.DimensionDefaultStandoff : ConstantData.Defines.DimensionDefaultNonStandoff;

    if (textDim.y -= stdOffNum,
      m = ConstantData.Defines.DimensionDefaultTextGap,
      this.Dimensions & ConstantData.DimensionFlags.SED_DF_Exterior ||
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
        (polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, !0, !0, !1, null))[segmentIndex - 1],
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

    let isStdOff2 = false; //M
    var stdOffFlag2 = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Standoff;

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
      g.x = textDim.x - ConstantData.Defines.DimensionDefaultTextGap;
      leftArrowPoints.push(new Point(g.x, g.y));
      g.x = textDim.x + textDim.width + ConstantData.Defines.DimensionDefaultTextGap;
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

    const check1 = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Exterior || this.StyleRecord &&
      this.StyleRecord.Line && this.StyleRecord.Line.Thickness;

    if (check1) {
      (textDim.y -= this.StyleRecord.Line.Thickness);
    }

    const stdOffFlag = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Standoff;
    isStdOff = stdOffFlag != 0 && this.CanUseStandOffDimensionLines();

    const isHideHookedObjDimensions = this.Dimensions & ConstantData.DimensionFlags.SED_DF_HideHookedObjDimensions;

    const check3 = !isStandoff && !isHideHookedObjDimensions && this instanceof Instance.Shape.BaseLine &&
      this.ShortRef != ConstantData2.LineTypes.SED_LS_MeasuringTape &&
      this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL;

    if (
      check3
    ) {
      var linkObject = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theLinksBlockID, false);
      if (linkObject) {

        const fdLink = GlobalData.optManager.FindLink(linkObject, this.BlockID, !0);
        if (fdLink >= 0) {
          isStdOff = true;
        }
      }
    }

    if (isStandoff) {
      isStdOff = false;
    }

    const stdOffNum = isStdOff ? ConstantData.Defines.CoordinateLineDefaultStandoff : ConstantData.Defines.CoordinateLineDefaultNonStandoff;

    textDim.y -= stdOffNum;
    textGap = ConstantData.Defines.CoordinateLineDefaultTextGap;//3

    const check4 = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Exterior || this.StyleRecord &&
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
        (polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, !0, !0, !1, null))[segmentIndex - 1],
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

    let isStdOff2 = false; //M
    var stdOffFlag2 = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Standoff;

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

      arrowPoint.x = pointStart.x;
      arrowPoint.y = pointStart.y > textDim.y ? pointStart.y - textGap : pointStart.y + textGap;
      leftArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));

      arrowPoint.x = textDim.x - ConstantData.Defines.CoordinateLineDefaultTextGap;
      leftArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));

      // right arrow's 1st point
      arrowPoint.x = textDim.x + textDim.width + ConstantData.Defines.CoordinateLineDefaultTextGap;
      rightArrowPoints.push(new Point(arrowPoint.x, arrowPoint.y));

      // right arrow's 2nd point
      arrowPoint.x = pointEnd.x;

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
    unusedParam: any,
    points: Point[],
    boundingRect: Rectangle,
    userData?: any
  ): void {
    console.log("= S.BaseDrawingObject: CreateDimensionLineArrowHead input:", {
      container,
      unusedParam,
      points,
      boundingRect,
      userData
    });

    // Make a deep copy of the points array
    const copiedPoints = Utils1.DeepCopy(points);
    const numPoints = copiedPoints.length;

    // Update boundingRect values based on the copied points
    for (let index = 0; index < numPoints; index++) {
      boundingRect.left = Math.min(boundingRect.left, copiedPoints[index].x);
      boundingRect.right = Math.max(boundingRect.right, copiedPoints[index].x);
      boundingRect.top = Math.min(boundingRect.top, copiedPoints[index].y);
      boundingRect.bottom = Math.max(boundingRect.bottom, copiedPoints[index].y);
    }

    // Calculate a rectangle that encloses the copiedPoints
    const rect = new Rectangle(0, 0, 0, 0);
    Utils2.GetPolyRect(rect, copiedPoints);

    // Adjust points relative to the calculated rectangle
    for (let index = 0; index < numPoints; index++) {
      copiedPoints[index].x -= rect.x;
      copiedPoints[index].y -= rect.y;
    }

    // Create the polygon shape representing the arrowhead
    const polygonShape = GlobalData.optManager.svgDoc.CreateShape(ConstantData.CreateShapeType.POLYGON);
    polygonShape.SetPoints(points);
    polygonShape.SetEventBehavior(Element.EventBehavior.ALL);
    polygonShape.SetID(ConstantData.SVGElementClass.DIMENSIONLINE);
    polygonShape.SetPos(0, 0);
    polygonShape.SetSize(rect.width, rect.height);
    polygonShape.SetFillColor("black");

    // Exclude shape from export if the Select flag is set
    if (Utils2.HasFlag(this.Dimensions, ConstantData.DimensionFlags.SED_DF_Select)) {
      polygonShape.ExcludeFromExport(true);
    }

    // Set user data if provided
    if (userData) {
      polygonShape.SetUserData(userData);
    }

    // Add the created shape to the container
    container.AddElement(polygonShape);

    console.log("= S.BaseDrawingObject: CreateDimensionLineArrowHead output: polygon shape added", polygonShape);
  }

  ConvertToNative(source: any, options: any): any {
    console.log("= S.BaseDrawingObject: ConvertToNative input:", { source, options });
    const result = null;
    console.log("= S.BaseDrawingObject: ConvertToNative output:", result);
    return result;
  }

  ContainsText(): boolean {
    console.log("= S.BaseDrawingObject: ContainsText input:", { DataID: this.DataID, BlockID: this.BlockID });
    const result = this.DataID >= 0 || GlobalData.optManager.SD_GetVisioTextChild(this.BlockID) >= 0;
    console.log("= S.BaseDrawingObject: ContainsText output:", result);
    return result;
  }

  GetToUnits(): number {
    console.log("= S.BaseDrawingObject: GetToUnits() input: none");
    const major: number = GlobalData.docHandler.rulerSettings.major;
    const majorScale: number = GlobalData.docHandler.rulerSettings.majorScale;
    const useInches: boolean = GlobalData.docHandler.rulerSettings.useInches;
    const metricConv: number = GlobalData.docHandler.rulerSettings.metricConv;

    let result: number = majorScale / major;
    if (!useInches) {
      result *= metricConv;
    }

    console.log("= S.BaseDrawingObject: GetToUnits() output:", result);
    return result;
  }

  GetLengthInUnits(length: number, skipRounding?: boolean): number {
    console.log("= S.BaseDrawingObject: GetLengthInUnits input:", { length, skipRounding });

    let result = length * this.GetToUnits();

    if (!skipRounding) {
      const roundingFactor = Math.pow(10, GlobalData.docHandler.rulerSettings.dp);
      result = Math.round(result * roundingFactor) / roundingFactor;
    }

    console.log("= S.BaseDrawingObject: GetLengthInUnits output:", result);
    return result;
  }

  GetFractionStringGranularity(e: any): number {
    console.log("= S.BaseDrawingObject: GetFractionStringGranularity input:", { e });

    const rulerSettings = GlobalData.docHandler.rulerSettings;
    let granularity: number;

    if (rulerSettings.fractionaldenominator >= 1) {
      granularity = 1 / rulerSettings.fractionaldenominator;
    } else if (rulerSettings.majorScale <= 1) {
      granularity = 1 / 16;
    } else if (rulerSettings.majorScale <= 2) {
      granularity = 1 / 8;
    } else if (rulerSettings.majorScale <= 4) {
      granularity = 1 / 4;
    } else if (rulerSettings.majorScale <= 8) {
      granularity = 0.5;
    } else {
      granularity = 1;
    }

    console.log("= S.BaseDrawingObject: GetFractionStringGranularity output:", granularity);
    return granularity;
  }

  NumberIsFloat(input: string): boolean {
    console.log("= S.BaseDrawingObject: NumberIsFloat input:", input);

    const char9 = '9'.charCodeAt(0);
    const char0 = '0'.charCodeAt(0);
    const dot = '.'.charCodeAt(0);

    for (let index = 0; index < input.length; index++) {
      const charCode = input.charCodeAt(index);
      if (!((charCode >= char0 && charCode <= char9) || charCode === dot)) {
        console.log("= S.BaseDrawingObject: NumberIsFloat output:", false);
        return false;
      }
    }

    console.log("= S.BaseDrawingObject: NumberIsFloat output:", true);
    return true;
  }

  ParseInchesString(input: string): number {
    console.log("= S.BaseDrawingObject: ParseInchesString input:", input);
    input = input.trim();
    let result = 0;
    const spaceIndex = input.indexOf(' ');

    if (spaceIndex >= 0) {
      // Extract feet and remainder parts
      const feetPart = input.substring(0, spaceIndex);
      const remainder = input.substring(spaceIndex + 1);
      const feet = parseFloat(feetPart);
      let inches = 0;

      const slashIndex = remainder.indexOf('/');
      if (slashIndex >= 0) {
        // If fraction exists then extract numerator and denominator
        const numeratorStr = remainder.substring(0, slashIndex);
        const denominatorStr = remainder.substring(slashIndex + 1);
        const numerator = parseFloat(numeratorStr);
        const denominator = parseFloat(denominatorStr);
        // Avoid division by zero
        if (denominator !== 0) {
          inches = numerator / denominator;
        } else {
          console.warn("= S.BaseDrawingObject: Division by zero in fraction");
        }
      } else {
        inches = parseFloat(remainder);
      }
      result = feet + inches;
    } else {
      result = parseFloat(input);
    }

    console.log("= S.BaseDrawingObject: ParseInchesString output:", result);
    return result;
  }

  ConvertToFeet(e: string): number {
    console.log("= S.BaseDrawingObject: ConvertToFeet input:", e);

    // Trim the input
    e = e.trim();
    let indexQuote = e.indexOf("'");
    // Ensure a space follows the feet symbol if not already there
    if (indexQuote >= 0 && indexQuote < e.length - 1 && e.charAt(indexQuote + 1) !== ' ') {
      e = e.substring(0, indexQuote + 1) + " " + e.substring(indexQuote + 1);
    }

    // Split the string into parts using space as delimiter
    const parts = e.split(' ');
    let fractionPart = '';
    let feetStr = '';
    let inchesStr = '';
    let feet = 0;
    let inches = 0;

    // If the last part contains a fraction (e.g. "3/4")
    if (parts[parts.length - 1].indexOf('/') >= 0) {
      fractionPart = parts[parts.length - 1];

      // Check the part just before the fraction for feet information
      if (parts.length >= 2) {
        feetStr = parts[parts.length - 2];
        if (feetStr.charAt(feetStr.length - 1) === "'") {
          // Remove trailing single quote
          feetStr = feetStr.substring(0, feetStr.length - 1);
        }
      }

      // If there is an additional part, use it as inches string
      if (parts.length >= 3) {
        inchesStr = parts[parts.length - 3];
      }
    } else if (parts.length === 2) {
      // When two parts exist, assume first is feet and second is inches
      feetStr = parts[0];
      inchesStr = parts[1];
    } else if (parts.length === 1 && parts[0].charAt(parts[0].length - 1) === '"') {
      // If only one part and ending with a double quote, treat it as inches
      inchesStr = parts[0];
    } else {
      // Default case, first part is feet
      feetStr = parts[0];
    }

    // Parse feet and inches from their string representations
    if (feetStr.length > 0) {
      feet = parseFloat(feetStr);
    }
    if (inchesStr.length > 0) {
      inches = parseFloat(inchesStr);
    }

    // If fraction part exists, split and process it
    if (fractionPart.length > 0) {
      const fractionSplit = fractionPart.split('/');
      const numerator = parseInt(fractionSplit[0], 10);
      const denominator = parseInt(fractionSplit[1], 10);
      if (numerator !== 0 && denominator !== 0) {
        inches += numerator / denominator;
      }
    }

    // Update the Dimensions flag based on the inches and feet values
    if (inches >= 12 && feet === 0) {
      this.Dimensions = Utils2.SetFlag(
        this.Dimensions,
        ConstantData.DimensionFlags.SED_DF_ShowFeetAsInches,
        true
      );
    } else if (feet > 0) {
      this.Dimensions = Utils2.SetFlag(
        this.Dimensions,
        ConstantData.DimensionFlags.SED_DF_ShowFeetAsInches,
        false
      );
    }

    // Compute the final value in feet (inches converted to feet)
    const result = feet + inches / 12;
    console.log("= S.BaseDrawingObject: ConvertToFeet output:", result);
    return result;
  }

  UnitsToCoord(value: number, offset: number): number {
    console.log("= S.BaseDrawingObject: UnitsToCoord input:", { value, offset });
    GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
    const toUnits = this.GetToUnits();
    value += offset * GlobalData.docHandler.rulerSettings.majorScale;
    value /= toUnits;
    console.log("= S.BaseDrawingObject: UnitsToCoord output:", value);
    return value;
  }

  ConvToUnits(value: number, offset: number): number {
    console.log("= S.BaseDrawingObject: ConvToUnits input:", { value, offset });
    GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
    const result = value * this.GetToUnits() - offset * GlobalData.docHandler.rulerSettings.majorScale;
    console.log("= S.BaseDrawingObject: ConvToUnits output:", result);
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

  SetBackgroundImageURL(url) {
  }

  WriteSDFAttributes(par, attr) {
  }

  CalcTextPosition(parameter) {
  }

  SetBlobBytes(inputData: any, blobData: any): void {
    console.log("= S.BaseDrawingObject: SetBlobBytes input:", { inputData, blobData });

    const blobBytes = new ListManager.BlobBytes(blobData, inputData);

    if (this.BlobBytesID >= 0) {
      const preservedBlock = GlobalData.objectStore.PreserveBlock(this.BlobBytesID);
      if (preservedBlock) {
        preservedBlock.Data = blobBytes;
      }
    } else {
      const createdBlock = GlobalData.objectStore.CreateBlock(
        ConstantData.StoredObjectType.BLOBBYTES_OBJECT,
        blobBytes
      );
      if (createdBlock) {
        this.BlobBytesID = createdBlock.ID;
      }
    }

    console.log("= S.BaseDrawingObject: SetBlobBytes output:", { BlobBytesID: this.BlobBytesID });
  }

  SetEMFBlobBytes(sourceData: any, blobData: any): void {
    console.log("= S.BaseDrawingObject: SetEMFBlobBytes input:", { sourceData, blobData });

    const newBlobBytes = new ListManager.BlobBytes(blobData, sourceData);

    if (this.EMFBlobBytesID >= 0) {
      const preservedBlock = GlobalData.objectStore.PreserveBlock(this.EMFBlobBytesID);
      if (preservedBlock) {
        preservedBlock.Data = newBlobBytes;
      }
    } else {
      const createdBlock = GlobalData.objectStore.CreateBlock(
        ConstantData.StoredObjectType.BLOBBYTES_OBJECT,
        newBlobBytes
      );
      if (createdBlock) {
        this.EMFBlobBytesID = createdBlock.ID;
      }
    }
    console.log("= S.BaseDrawingObject: SetEMFBlobBytes output:", { EMFBlobBytesID: this.EMFBlobBytesID });
  }

  SetOleBlobBytes(sourceData: any, blobData: any): void {
    console.log("= S.BaseDrawingObject: SetOleBlobBytes input:", { sourceData, blobData });

    const blobBytes = new ListManager.BlobBytes(blobData, sourceData);

    if (this.OleBlobBytesID >= 0) {
      const preservedBlock = GlobalData.objectStore.PreserveBlock(this.OleBlobBytesID);
      if (preservedBlock) {
        preservedBlock.Data = blobBytes;
      }
    } else {
      const createdBlock = GlobalData.objectStore.CreateBlock(ConstantData.StoredObjectType.BLOBBYTES_OBJECT, blobBytes);
      if (createdBlock) {
        this.OleBlobBytesID = createdBlock.ID;
      }
    }

    console.log("= S.BaseDrawingObject: SetOleBlobBytes output:", { OleBlobBytesID: this.OleBlobBytesID });
  }

  GetBlobBytes(): any {
    console.log("= S.BaseDrawingObject: GetBlobBytes input: BlobBytesID =", this.BlobBytesID);
    let blobBytes = null;
    if (this.BlobBytesID >= 0) {
      blobBytes = GlobalData.optManager.GetObjectPtr(this.BlobBytesID, false);
    }
    console.log("= S.BaseDrawingObject: GetBlobBytes output:", blobBytes);
    return blobBytes;
  }

  GetEMFBlobBytes(): any {
    console.log("= S.BaseDrawingObject: GetEMFBlobBytes input: EMFBlobBytesID =", this.EMFBlobBytesID);
    let emfBlobBytes: any = null;
    if (this.EMFBlobBytesID >= 0) {
      emfBlobBytes = GlobalData.optManager.GetObjectPtr(this.EMFBlobBytesID, false);
    }
    console.log("= S.BaseDrawingObject: GetEMFBlobBytes output:", emfBlobBytes);
    return emfBlobBytes;
  }

  GetOleBlobBytes(): any {
    console.log("= S.BaseDrawingObject: GetOleBlobBytes input: OleBlobBytesID =", this.OleBlobBytesID);
    let oleBlobBytes: any = null;
    if (this.OleBlobBytesID >= 0) {
      oleBlobBytes = GlobalData.optManager.GetObjectPtr(this.OleBlobBytesID, false);
    }
    console.log("= S.BaseDrawingObject: GetOleBlobBytes output:", oleBlobBytes);
    return oleBlobBytes;
  }

  GetTable(fetchPreserved: boolean = false): any {
    console.log("= S.BaseDrawingObject: GetTable input:", { fetchPreserved });

    let table = null;
    if (this.TableID >= 0) {
      table = GlobalData.optManager.GetObjectPtr(this.TableID, fetchPreserved);
    }

    console.log("= S.BaseDrawingObject: GetTable output:", table);
    return table;
  }

  SetTable(tableData: any): void {
    console.log("= S.BaseDrawingObject: SetTable input:", tableData);

    if (this.TableID >= 0) {
      if (tableData == null) {
        const existingTable = GlobalData.objectStore.GetObject(this.TableID);
        if (existingTable) {
          existingTable.Delete();
        }
        this.TableID = -1;
      } else {
        const preservedBlock = GlobalData.objectStore.PreserveBlock(this.TableID);
        if (preservedBlock) {
          preservedBlock.Data = tableData;
        }
      }
    } else {
      const createdBlock = GlobalData.objectStore.CreateBlock(ConstantData.StoredObjectType.TABLE_OBJECT, tableData);
      if (createdBlock) {
        this.TableID = createdBlock.ID;
      }
    }

    console.log("= S.BaseDrawingObject: SetTable output: TableID =", this.TableID);
  }

  GetGraph(fetchPreserved: boolean = false): any {
    console.log("= S.BaseDrawingObject: GetGraph input:", { fetchPreserved });

    let graph = null;
    if (this.GraphID >= 0) {
      graph = GlobalData.optManager.GetObjectPtr(this.GraphID, fetchPreserved);
    }

    console.log("= S.BaseDrawingObject: GetGraph output:", graph);
    return graph;
  }

  SetGraph(graphData: any): void {
    console.log("= S.BaseDrawingObject: SetGraph input:", graphData);

    if (this.GraphID >= 0) {
      if (graphData == null) {
        const existingGraph = GlobalData.objectStore.GetObject(this.GraphID);
        if (existingGraph) {
          existingGraph.Delete();
        }
        this.GraphID = -1;
      } else {
        const preservedBlock = GlobalData.objectStore.PreserveBlock(this.GraphID);
        if (preservedBlock) {
          preservedBlock.Data = graphData;
        }
      }
    } else {
      const createdBlock = GlobalData.objectStore.CreateBlock(ConstantData.StoredObjectType.GRAPH_OBJECT, graphData);
      if (createdBlock) {
        this.GraphID = createdBlock.ID;
      }
    }

    console.log("= S.BaseDrawingObject: SetGraph output: GraphID =", this.GraphID);
  }

  GetGanttInfo(fetchPreserved: boolean = false): any {
    console.log("= S.BaseDrawingObject: GetGanttInfo input:", { fetchPreserved });

    let ganttInfo = null;
    if (this.GanttInfoID >= 0) {
      ganttInfo = GlobalData.optManager.GetObjectPtr(this.GanttInfoID, fetchPreserved);
    }

    console.log("= S.BaseDrawingObject: GetGanttInfo output:", ganttInfo);
    return ganttInfo;
  }

  SetGanttInfo(ganttInfo: any): void {
    console.log("= S.BaseDrawingObject: SetGanttInfo input:", ganttInfo);

    if (this.GanttInfoID >= 0) {
      if (ganttInfo == null) {
        const existingGanttInfo = GlobalData.objectStore.GetObject(this.GanttInfoID);
        if (existingGanttInfo) {
          existingGanttInfo.Delete();
        }
        this.GanttInfoID = -1;
      } else {
        const preservedBlock = GlobalData.objectStore.PreserveBlock(this.GanttInfoID);
        if (preservedBlock) {
          preservedBlock.Data = ganttInfo;
        }
      }
    } else {
      const createdBlock = GlobalData.objectStore.CreateBlock(ConstantData.StoredObjectType.GANTTINFO_OBJECT, ganttInfo);
      if (createdBlock) {
        this.GanttInfoID = createdBlock.ID;
      }
    }

    console.log("= S.BaseDrawingObject: SetGanttInfo output: GanttInfoID =", this.GanttInfoID);
  }

  Flip(element) {
  }

  NoFlip() {
    return !!this.hooks.length
  }

  NoRotate() {
    return false
  }

  NoGrow(): boolean {
    console.log("= S.BaseDrawingObject: NoGrow input: none");

    const result = (this.colorfilter & FileParser.SDRColorFilters.SD_NOCOLOR_RESIZE) > 0;

    console.log("= S.BaseDrawingObject: NoGrow output:", result);
    return result;
  }

  MaintainPoint(point: Point, angle: number, distance: number, isClockwise: boolean, additionalData: any): boolean {
    console.log("= S.BaseDrawingObject: MaintainPoint input:", { point, angle, distance, isClockwise, additionalData });

    // Placeholder logic for maintaining point
    const result = false;

    console.log("= S.BaseDrawingObject: MaintainPoint output:", result);
    return result;
  }

  AllowTextEdit() {
    console.log("= S.BaseDrawingObject: AllowTextEdit input: none");

    if ((this.TextFlags & ConstantData.TextFlags.SED_TF_None) > 0) {
      console.log("= S.BaseDrawingObject: AllowTextEdit output: false (SED_TF_None flag is set)");
      return false;
    }

    if (
      this.objecttype === ConstantData.ObjectTypes.SD_OBJT_SHAPECONTAINER &&
      (this.TextFlags & ConstantData.TextFlags.SED_TF_AttachA) === 0 &&
      (this.TextFlags & ConstantData.TextFlags.SED_TF_AttachB) === 0
    ) {
      console.log("= S.BaseDrawingObject: AllowTextEdit output: false (ShapeContainer with no Attach flags)");
      return false;
    }

    if (this.flags & ConstantData.ObjFlags.SEDO_Lock) {
      console.log("= S.BaseDrawingObject: AllowTextEdit output: false (Object is locked)");
      return false;
    }

    if (this.FromEditShapeOutline) {
      console.log("= S.BaseDrawingObject: AllowTextEdit output: false (FromEditShapeOutline is true)");
      return false;
    }

    const table = this.GetTable(false);
    if (table) {
      let selectedCellIndex = -1;
      if (GlobalData.optManager.Table_GetActiveID() === table.BlockID) {
        selectedCellIndex = table.select;
      }

      if (selectedCellIndex < 0) {
        selectedCellIndex = GlobalData.optManager.Table_GetFirstTextCell(table);
      }

      const result = selectedCellIndex >= 0 && GlobalData.optManager.Table_AllowCellTextEdit(table, selectedCellIndex);
      console.log("= S.BaseDrawingObject: AllowTextEdit output:", result);
      return result;
    }

    console.log("= S.BaseDrawingObject: AllowTextEdit output: true");
    return true;
  }

  AllowDoubleClick() {
    return false
  }

  ChangeBackgroundColor(e, t) {
    return false
  }

  UseEdges(
    element: any,
    triggerType: any,
    additionalInfo: any,
    pathCreator: any,
    container: any,
    isPolygon: boolean
  ): boolean {
    console.log("= S.BaseDrawingObject: UseEdges input:", {
      element,
      triggerType,
      additionalInfo,
      pathCreator,
      container,
      isPolygon
    });

    const result = false;

    console.log("= S.BaseDrawingObject: UseEdges output:", result);
    return result;
  }

  ApplyStyle(style: any, applyTextBlockColor: boolean): void {
    console.log("= S.BaseDrawingObject: ApplyStyle input:", { style, applyTextBlockColor });

    let newStyle = Utils1.DeepCopy(style);
    const defaultTextStyle = Resources.FindStyle(ConstantData.Defines.TextBlockStyle);

    if (
      this.objecttype !== ConstantData.ObjectTypes.SD_OBJT_GANTT_CHART &&
      !(this.colorfilter & FileParser.SDRColorFilters.SD_NOCOLOR_STYLE)
    ) {
      let textColor = { Color: newStyle.Text.Paint.Color };
      let textPaintColor = { color: newStyle.Text.Paint.Color };

      if (applyTextBlockColor) {
        if (
          this.DrawingObjectBaseClass !== ConstantData.DrawingObjectBaseClass.SHAPE &&
          this.objecttype !== ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR
        ) {
          newStyle.Fill = Utils1.DeepCopy(this.StyleRecord.Fill);
          newStyle.Text = Utils1.DeepCopy(defaultTextStyle.Text);
          textColor = { Color: defaultTextStyle.Text.Paint.Color };
          textPaintColor = { color: defaultTextStyle.Text.Paint.Color };
        } else if (this.UseTextBlockColor()) {
          newStyle.Text = Utils1.DeepCopy(defaultTextStyle.Text);
          textColor = { Color: defaultTextStyle.Text.Paint.Color };
          textPaintColor = { color: defaultTextStyle.Text.Paint.Color };
        }

        if (this.StyleRecord.Fill.Paint.FillType === ConstantData.FillTypes.SDFILL_TRANSPARENT) {
          newStyle.Fill.Paint.FillType = ConstantData.FillTypes.SDFILL_TRANSPARENT;
          newStyle.Fill.Hatch = 0;
        }

        if (this.StyleRecord.Line.Thickness === 0) {
          newStyle.Line.Thickness = 0;
        }

        if (newStyle.Line.LinePattern === 0) {
          newStyle.Line.LinePattern = this.StyleRecord.Line.LinePattern;
        }
      }

      newStyle.Fill.Paint.Opacity = this.StyleRecord.Fill.Paint.Opacity;
      newStyle.Fill.Paint.EndOpacity = this.StyleRecord.Fill.Paint.EndOpacity;
      newStyle.Line.Paint.Opacity = this.StyleRecord.Line.Paint.Opacity;
      newStyle.Line.Paint.EndOpacity = this.StyleRecord.Line.Paint.EndOpacity;
      newStyle.Text.Paint.Opacity = this.StyleRecord.Text.Paint.Opacity;
      newStyle.Text.Paint.EndOpacity = this.StyleRecord.Text.Paint.EndOpacity;

      if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR) {
        newStyle.Line.BThick = this.StyleRecord.Line.BThick;
        newStyle.Line.Thickness = this.StyleRecord.Line.Thickness;
        newStyle.Line.Paint.Color = newStyle.Fill.Paint.Color;
        newStyle.Line.Paint.EndColor = newStyle.Fill.Paint.EndColor;
      }

      this.ChangeTextAttributes(textPaintColor, textColor);
      this.StyleRecord = newStyle;
    }

    console.log("= S.BaseDrawingObject: ApplyStyle output: Style applied successfully");
  }

  GenericIcon(params: {
    svgDoc: any,
    iconSize: number,
    x: number,
    y: number,
    imageURL: string,
    cursorType: string,
    iconID: string,
    userData?: any
  }): any {
    console.log("= S.BaseDrawingObject: GenericIcon input:", params);

    const {
      svgDoc,
      iconSize,
      x,
      y,
      imageURL,
      cursorType,
      iconID,
      userData
    } = params;

    const iconShape = svgDoc.CreateShape(ConstantData.CreateShapeType.IMAGE);

    if (userData != null) {
      iconShape.SetUserData(userData);
    } else {
      iconShape.SetUserData(ConstantData.SVGElementClass.ICON);
    }

    iconShape.SetSize(iconSize, iconSize);
    iconShape.SetPos(x, y);
    iconShape.SetURL(imageURL);
    iconShape.SetFillOpacity(1);
    iconShape.SetStrokeWidth(0);
    iconShape.SetID(iconID);
    iconShape.SetCursor(cursorType);
    iconShape.ExcludeFromExport(true);

    console.log("= S.BaseDrawingObject: GenericIcon output:", iconShape);
    return iconShape;
  }

  AddIcon(svgDoc: any, container: any, params: { svgDoc: any, iconSize: number, cursorType: string, iconID: string, imageURL: string, x?: number, y?: number }): any {
    console.log("= S.BaseDrawingObject: AddIcon input:", { svgDoc, container, params });

    if (container) {
      const frame = this.Frame;
      this.nIcons;

      params.x = frame.width - this.iconShapeRightOffset - this.iconSize - this.nIcons * this.iconSize;
      params.y = frame.height - this.iconShapeBottomOffset - this.iconSize;

      const icon = this.GenericIcon(params);
      this.nIcons++;
      container.AddElement(icon);

      console.log("= S.BaseDrawingObject: AddIcon output:", icon);
      return icon;
    }
  }

  GetIconShape() {
    return this.BlockID
  }

  HasIcons() {
    // if (this.bInGroup) return !1;
    // var e = !1;
    // this.HasFieldData() &&
    //   this.fieldDataElemID >= 0 &&
    //   !SDUI.Commands.MainController.DataPanel.GetHideIconState() &&
    //   (e = !0);
    // var t = !1;
    // return this.datasetElemID >= 0 &&
    //   (
    //     this.subtype === ConstantData.ObjectSubTypes.SD_SUBT_TASKMAP ||
    //     this.subtype === ConstantData.ObjectSubTypes.SD_SUBT_TASK
    //   ) &&
    //   (
    //     s = ListManager.SDData.GetValue(
    //       this.datasetElemID,
    //       ListManager.GanttFieldNameList[ListManager.GanttTaskFields.TASK_TRELLO_CARD_URL]
    //     ),
    //     s &&
    //     s.length &&
    //     (t = !0)
    //   ),
    //   !!(
    //     this.dataStyleOverride &&
    //     this.dataStyleOverride.iconID ||
    //     this.CommentID >= 0 ||
    //     t ||
    //     e ||
    //     this.HyperlinkText &&
    //     Global.ResolveHyperlink(this.HyperlinkText) ||
    //     - 1 != this.NoteID ||
    //     GlobalData.optManager.NoteIsShowing(this.BlockID, null)
    //   )
  }

  AddIcons(svgDoc: any, container: any): void {
    console.log("= S.BaseDrawingObject: AddIcons input:", { svgDoc, container });

    if (container) {
      this.nIcons = 0;
      const iconParams = {
        svgDoc: svgDoc,
        iconSize: this.iconSize,
        cursorType: Element.CursorType.POINTER
      };

      if (this.dataStyleOverride && this.dataStyleOverride.iconID) {
        const iconURL = Resources.ActionIcons[this.dataStyleOverride.iconID];
        if (iconURL) {
          iconParams.iconID = ConstantData.ShapeIconType.DATAACTION;
          iconParams.imageURL = iconURL;
          iconParams.x = this.Frame.width - this.iconSize;
          iconParams.y = 0;
          const iconElement = this.GenericIcon(iconParams);
          iconElement.ExcludeFromExport(false);
          container.AddElement(iconElement);
        }
      }

      if (!this.bInGroup) {
        if (this.CommentID >= 0) {
          iconParams.iconID = ConstantData.ShapeIconType.COMMENT;
          iconParams.imageURL = Constants.FilePath_Icons + Constants.Icon_Comment;
          const commentIcon = this.AddIcon(svgDoc, container, iconParams);
          const userData = ConstantData.SVGElementClass.ICON + '.' + this.BlockID;
          commentIcon.SetUserData(userData);
        }

        if (this.datasetElemID >= 0 &&
          (this.subtype === ConstantData.ObjectSubTypes.SD_SUBT_TASKMAP || this.subtype === ConstantData.ObjectSubTypes.SD_SUBT_TASK)) {
          const trelloURL = ListManager.SDData.GetValue(this.datasetElemID, ListManager.GanttFieldNameList[ListManager.GanttTaskFields.TASK_TRELLO_CARD_URL]);
          if (trelloURL && trelloURL.length) {
            iconParams.iconID = ConstantData.ShapeIconType.TRELLOLINK;
            iconParams.imageURL = Constants.FilePath_Icons + Constants.Icon_TrelloLink;
            this.AddIcon(svgDoc, container, iconParams);
          }
        }

        if (this.HyperlinkText && Global.ResolveHyperlink(this.HyperlinkText)) {
          iconParams.iconID = ConstantData.ShapeIconType.HYPERLINK;
          iconParams.imageURL = Constants.FilePath_Icons + Constants.Icon_Hyperlink;
          const hyperlinkIcon = this.AddIcon(svgDoc, container, iconParams);
          hyperlinkIcon.SetHyperlinkAttribute(this.HyperlinkText);
          hyperlinkIcon.SetTooltip(Global.ResolveHyperlinkForDisplay(this.HyperlinkText));
        }

        if (this.AttachmentInfo) {
          iconParams.iconID = ConstantData.ShapeIconType.ATTACHMENT;
          iconParams.imageURL = '../../../Styles/Img/Icons/attachment_icon.png';
          this.AddIcon(svgDoc, container, iconParams);
        }

        if (this.ExpandedViewID >= 0) {
          iconParams.iconID = ConstantData.ShapeIconType.EXPANDEDVIEW;
          iconParams.imageURL = Constants.FilePath_Icons + Constants.Icon_ExpandedView;
          const expandedViewIcon = this.AddIcon(svgDoc, container, iconParams);
          expandedViewIcon.SetCustomAttribute('_expextendtt_', this.ExpandedViewID);
        }

        if (this.NoteID !== -1 || GlobalData.optManager.NoteIsShowing(this.BlockID, null)) {
          iconParams.iconID = ConstantData.ShapeIconType.NOTES;
          iconParams.imageURL = Constants.FilePath_Icons + Constants.Icon_Note;
          if (this.moreflags & ConstantData.ObjMoreFlags.SED_MF_UseInfoNoteIcon) {
            iconParams.imageURL = Constants.FilePath_Icons + Constants.Icon_Info;
          }
          const noteIcon = this.AddIcon(svgDoc, container, iconParams);
          noteIcon.SetCustomAttribute('_expnotett_', this.NoteID);

          const self = this;
          let hoverTimeout: any;
          const showNote = function () {
            if (!GlobalData.optManager.bInNoteEdit) {
              GlobalData.optManager.ShowNote(self.BlockID, null);
            }
          };
          const hideNote = function () {
            if (!GlobalData.optManager.bInNoteEdit) {
              GlobalData.optManager.HideNote(self.BlockID, null);
            }
            clearTimeout(hoverTimeout);
          };
          const noteDOMElement = noteIcon.DOMElement();
          $(noteDOMElement).hover(
            function () {
              hoverTimeout = setTimeout(showNote, 750);
            },
            hideNote
          );
        }

        if (this.HasFieldData() && this.fieldDataElemID >= 0 && !SDUI.Commands.MainController.DataPanel.GetHideIconState()) {
          iconParams.iconID = ConstantData.ShapeIconType.FIELDDATA;
          iconParams.imageURL = Constants.FilePath_Icons + Constants.Icon_Info;
          const fieldDataIcon = this.AddIcon(svgDoc, container, iconParams);
          fieldDataIcon.SetCustomAttribute('_expdatatt_', this.BlockID);

          const blockID = this.BlockID;
          let fieldDataTimeout: any;
          const showFieldDataTooltip = function () {
            if (!GlobalData.optManager.FieldedDataTooltipVisible(blockID)) {
              GlobalData.optManager.ShowFieldedDataTooltip(blockID);
            }
            fieldDataTimeout = null;
          };
          const hideFieldDataTooltip = function () {
            GlobalData.optManager.HideFieldedDataTooltip(blockID);
            if (fieldDataTimeout) {
              clearTimeout(fieldDataTimeout);
              fieldDataTimeout = null;
            }
          };
          const fieldDataDOMElement = fieldDataIcon.DOMElement();
          $(fieldDataDOMElement).hover(
            function () {
              if (!GlobalData.optManager.FieldedDataTooltipVisible(blockID)) {
                fieldDataTimeout = setTimeout(showFieldDataTooltip, 750);
              }
            },
            hideFieldDataTooltip
          );

          if (!GlobalData.docHandler.IsReadOnly()) {
            const hammerInstance = Hammer(fieldDataDOMElement);
            hammerInstance.off('doubletap');
            hammerInstance.on('doubletap', function (event) {
              Utils2.StopPropagationAndDefaults(event);
              if (fieldDataTimeout) {
                clearTimeout(fieldDataTimeout);
                fieldDataTimeout = null;
              }
              GlobalData.optManager.ShowFieldedDataTooltip(blockID, true, true);
              return false;
            });
          }
        }
      }
    }

    console.log("= S.BaseDrawingObject: AddIcons output: completed");
  }

  HideAllIcons(container: any, svgDoc: any): void {
    console.log("= S.BaseDrawingObject: HideAllIcons input:", { container, svgDoc });

    this.nIcons = 0;

    const hyperlinkIcon = svgDoc.GetElementByID(ConstantData.ShapeIconType.HYPERLINK);
    const trelloLinkIcon = svgDoc.GetElementByID(ConstantData.ShapeIconType.TRELLOLINK);
    const notesIcon = svgDoc.GetElementByID(ConstantData.ShapeIconType.NOTES);
    const commentIcon = svgDoc.GetElementByID(ConstantData.ShapeIconType.COMMENT);
    const fieldDataIcon = svgDoc.GetElementByID(ConstantData.ShapeIconType.FIELDDATA);

    if (hyperlinkIcon) svgDoc.RemoveElement(hyperlinkIcon);
    if (trelloLinkIcon) svgDoc.RemoveElement(trelloLinkIcon);
    if (notesIcon) svgDoc.RemoveElement(notesIcon);
    if (commentIcon) svgDoc.RemoveElement(commentIcon);
    if (fieldDataIcon) svgDoc.RemoveElement(fieldDataIcon);

    console.log("= S.BaseDrawingObject: HideAllIcons output: Icons removed");
  }

  GetHyperlink(cellIdentifier: string): string | null {
    console.log("= S.BaseDrawingObject: GetHyperlink input:", { cellIdentifier });

    let cellIndex: number | null = null;
    const table = this.GetTable(false);

    if (cellIdentifier) {
      if (cellIdentifier.split) {
        const parts = cellIdentifier.split('.');
        if (parts[1]) {
          cellIndex = parseInt(parts[1], 10);
        }
      }
    } else if (table && table.select >= 0) {
      cellIndex = table.select;
    }

    let hyperlink: string | null = null;
    if (table && cellIndex !== null && cellIndex >= 0 && cellIndex < table.cells.length) {
      hyperlink = table.cells[cellIndex].hyperlink;
    } else {
      hyperlink = this.HyperlinkText;
    }

    console.log("= S.BaseDrawingObject: GetHyperlink output:", hyperlink);
    return hyperlink;
  }

  IsNoteCell(cellIdentifier: string): any {
    console.log("= S.BaseDrawingObject: IsNoteCell input:", { cellIdentifier });

    let cellIndex: number | null = null;
    const table = this.GetTable(false);

    if (cellIdentifier) {
      if (cellIdentifier.split) {
        const parts = cellIdentifier.split('.');
        if (parts[1]) {
          cellIndex = parseInt(parts[1], 10);
        }
      }
    } else if (table && table.select >= 0) {
      cellIndex = table.select;
    }

    const result = table && cellIndex !== null && cellIndex >= 0 && cellIndex < table.cells.length ? table.cells[cellIndex] : null;

    console.log("= S.BaseDrawingObject: IsNoteCell output:", result);
    return result;
  }

  SetCursors() {
    console.log("= S.BaseDrawingObject: SetCursors - Input: none");

    const svgObjectLayer = GlobalData.optManager.svgObjectLayer;
    const element = svgObjectLayer.GetElementByID(this.BlockID);
    let isCursorSet = false;

    if (!(this.flags & ConstantData.ObjFlags.SEDO_Lock) && element) {
      const editMode = GlobalData.optManager.GetEditMode();
      if (editMode === ConstantData.EditState.DEFAULT) {
        const shapeElement = element.GetElementByID(ConstantData.SVGElementClass.SHAPE);
        if (shapeElement) {
          if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FRAME_CONTAINER) {
            shapeElement.SetCursor(Element.CursorType.DEFAULT);
          } else {
            shapeElement.SetCursor(Element.CursorType.ADD);
          }
        }

        const iconTypes = [
          ConstantData.ShapeIconType.HYPERLINK,
          ConstantData.ShapeIconType.TRELLOLINK,
          ConstantData.ShapeIconType.NOTES,
          ConstantData.ShapeIconType.EXPANDEDVIEW,
          ConstantData.ShapeIconType.COMMENT,
          ConstantData.ShapeIconType.ATTACHMENT,
          ConstantData.ShapeIconType.FIELDDATA
        ];

        iconTypes.forEach(iconType => {
          const iconElement = element.GetElementByID(iconType);
          if (iconElement) {
            iconElement.SetCursor(Element.CursorType.POINTER);
          }
        });

        const slopElement = element.GetElementByID(ConstantData.SVGElementClass.SLOP);
        if (slopElement) {
          slopElement.SetCursor(Element.CursorType.ADD);
        }

        const activeEdit = GlobalData.optManager.svgDoc.GetActiveEdit();
        if (this.DataID && this.DataID >= 0 && element.textElem) {
          if (element.textElem === activeEdit) {
            shapeElement.SetCursor(Element.CursorType.TEXT);
            element.textElem.SetCursorState(ConstantData.CursorState.EDITLINK);
          } else {
            element.textElem.SetCursorState(ConstantData.CursorState.LINKONLY);
          }
        }

        if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always ||
          (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select && this.IsSelected())) {
          const dimensionTextElements = element.GetElementListWithID(ConstantData.SVGElementClass.DIMENSIONTEXT);
          dimensionTextElements.forEach(dimensionTextElement => {
            dimensionTextElement.SetCursorState(ConstantData.CursorState.EDITONLY);
            if (dimensionTextElement === activeEdit) {
              isCursorSet = true;
            }
          });

          if (isCursorSet) {
            shapeElement.SetCursor(null);
            if (slopElement) {
              slopElement.SetCursor(null);
            }
          }
        }
      } else {
        this.ClearCursors();
      }
    }

    console.log("= S.BaseDrawingObject: SetCursors - Output: completed");
  }

  ClearCursors(): void {
    console.log("= S.BaseDrawingObject: ClearCursors input: none");

    const element = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    if (element) {
      element.ClearAllCursors();
      if (element.textElem) {
        element.textElem.SetCursorState(ConstantData.CursorState.NONE);
      }
    }

    console.log("= S.BaseDrawingObject: ClearCursors output: completed");
  }

  PostCreateShapeCallback(shape, container, pathCreator, additionalData) {
    console.log('= S.BaseDrawingObject: PostCreateShapeCallback input:', { shape, container, pathCreator, additionalData });

    // Placeholder for the actual implementation
    // Add your logic here

    console.log('= S.BaseDrawingObject: PostCreateShapeCallback output: completed');
  }

  SVGTokenizerHook(style) {
    console.log("= S.BaseDrawingObject: SVGTokenizerHook input:", style);

    if (GlobalData.optManager.bTokenizeStyle) {
      const colorFilter = this.colorfilter;
      style = Utils1.DeepCopy(style);

      if (colorFilter === FileParser.SDRColorFilters.SD_NOCOLOR_ALL) {
        console.log("= S.BaseDrawingObject: SVGTokenizerHook output:", style);
        return style;
      }

      if (!(colorFilter & FileParser.SDRColorFilters.SD_NOCOLOR_FILL)) {
        if (style.Fill.Paint.FillType === ConstantData.FillTypes.SDFILL_GRADIENT) {
          style.Fill.Paint.FillType = ConstantData.FillTypes.SDFILL_SOLID;
        }
        style.Fill.Paint.Color = Basic.Symbol.CreatePlaceholder(Basic.Symbol.Placeholder.FillColor, style.Fill.Paint.Color);
      }

      if (!(colorFilter & FileParser.SDRColorFilters.SD_NOCOLOR_LINE)) {
        style.Line.Paint.Color = Basic.Symbol.CreatePlaceholder(Basic.Symbol.Placeholder.LineColor, style.Line.Paint.Color);
      }

      if (!(colorFilter & FileParser.SDRColorFilters.SD_NOCOLOR_LINETHICK)) {
        style.Line.Thickness = Basic.Symbol.CreatePlaceholder(Basic.Symbol.Placeholder.LineThick, style.Line.Thickness);
      }
    }

    console.log("= S.BaseDrawingObject: SVGTokenizerHook output:", style);
    return style;
  }

  CancelObjectDraw(): boolean {
    console.log("= S.BaseDrawingObject: CancelObjectDraw input: none");

    // Unbind action click hammer events
    GlobalData.optManager.unbindActionClickHammerEvents();

    // Reset auto scroll timer
    this.ResetAutoScrollTimer();

    console.log("= S.BaseDrawingObject: CancelObjectDraw output: true");
    return true;
  }

  GetAlignRect(): any {
    console.log("= S.BaseDrawingObject: GetAlignRect input: none");

    const alignRect = $.extend(true, {}, this.Frame);

    console.log("= S.BaseDrawingObject: GetAlignRect output:", alignRect);
    return alignRect;
  }

  GetCustomConnectPointsDirection() {
    return null
  }

  GetTextures(textures: string[]): void {
    console.log("= S.BaseDrawingObject: GetTextures input:", { textures });

    const fillTypeTexture = ConstantData.FillTypes.SDFILL_TEXTURE;

    // Check and add fill texture
    if (this.StyleRecord.Fill.Paint.FillType === fillTypeTexture) {
      const fillTexture = this.StyleRecord.Fill.Paint.Texture;
      if (!textures.includes(fillTexture)) {
        textures.push(fillTexture);
      }
    }

    // Check and add line texture
    if (this.StyleRecord.Line.Paint.FillType === fillTypeTexture) {
      const lineTexture = this.StyleRecord.Line.Paint.Texture;
      if (!textures.includes(lineTexture)) {
        textures.push(lineTexture);
      }
    }

    // Check and add text texture
    if (this.StyleRecord.Text.Paint.FillType === fillTypeTexture) {
      const textTexture = this.StyleRecord.Text.Paint.Texture;
      if (!textures.includes(textTexture)) {
        textures.push(textTexture);
      }
    }

    // Check and add table textures
    const table = this.GetTable(false);
    if (table) {
      GlobalData.optManager.Table_GetTextures(table, textures);
    }

    console.log("= S.BaseDrawingObject: GetTextures output:", { textures });
  }

  GetContrastingColorName(): string {
    console.log("= S.BaseDrawingObject: GetContrastingColorName input: none");

    const lineColor = this.StyleRecord.Line.Paint.Color;
    const red = parseInt(lineColor.substr(1, 2), 16);
    const green = parseInt(lineColor.substr(3, 2), 16);
    const blue = parseInt(lineColor.substr(5, 2), 16);

    const brightness = (299 * red + 587 * green + 114 * blue) / 1000;
    const contrastingColor = brightness >= 128 ? 'black' : 'white';

    console.log("= S.BaseDrawingObject: GetContrastingColorName output:", contrastingColor);
    return contrastingColor;
  }

  SetRuntimeEffects(enableEffects: boolean): void {
    console.log("= S.BaseDrawingObject: SetRuntimeEffects input:", { enableEffects });

    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    if (svgElement) {
      this.ApplyEffects(svgElement, enableEffects, false);
    }

    console.log("= S.BaseDrawingObject: SetRuntimeEffects output: completed");
  }

  ApplyEffects(element, enableEffects, additionalData) {
    console.log("= S.BaseDrawingObject: ApplyEffects - Input:", { element, enableEffects, additionalData });

    // Retrieve the element if not provided
    element = element || GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

    // Check if effects should be applied
    if (element && GlobalData.optManager.bDrawEffects && !GlobalData.optManager.bTokenizeStyle) {
      const shapeElement = element.GetElementByID(ConstantData.SVGElementClass.SHAPE);
      const shapeGroup = element.shapeGroup || element;
      const outsideEffectType = this.StyleRecord.OutsideEffect ? this.StyleRecord.OutsideEffect.OutsideType : 0;

      // Apply effects based on the outside effect type
      if (outsideEffectType === FileParser.OutEffect.SDOUT_EFFECT_REFL || outsideEffectType === FileParser.OutEffect.SDOUT_EFFECT_CAST) {
        this.SetEffects(shapeElement, enableEffects, additionalData, null, false, additionalData);
      } else {
        if (!additionalData) {
          this.SetEffects(shapeElement, enableEffects, additionalData, null, true, false);
        }
        this.SetEffects(shapeGroup, enableEffects, additionalData, null, false, true);
      }
    }

    console.log("= S.BaseDrawingObject: ApplyEffects - Output: Effects applied");
  }

  SetEffects(element, enableEffects, additionalData, styleRecord, applyOutsideEffect, applyInsideEffect) {
    console.log("= S.BaseDrawingObject: SetEffects - Input:", {
      element,
      enableEffects,
      additionalData,
      styleRecord,
      applyOutsideEffect,
      applyInsideEffect
    });

    let frame = this.Frame;
    let effects = [];
    let glowColor = null;

    if (element && (styleRecord = styleRecord || this.StyleRecord)) {
      if (this.dataStyleOverride && this.dataStyleOverride.glowColor) {
        glowColor = this.dataStyleOverride.glowColor;
      }

      let effectSettings = this.CalcEffectSettings(frame, styleRecord, additionalData);

      if (applyOutsideEffect) {
        if (effectSettings.outside.type) {
          if (enableEffects && effectSettings.outside.type.id === Effects.EffectType.GLOW.id) {
            effects.push({
              type: effectSettings.outside.type,
              params: effectSettings.outside.settings
            });
          }

          if (enableEffects) {
            effects.push({
              type: Effects.EffectType.GLOW,
              params: {
                color: '#FFD64A',
                size: 4,
                asSecondary: true
              }
            });
          } else if (this.collabGlowColor) {
            effects.push({
              type: Effects.EffectType.GLOW,
              params: {
                color: this.collabGlowColor,
                size: 6,
                asSecondary: true
              }
            });
          } else if (glowColor) {
            effects.push({
              type: Effects.EffectType.GLOW,
              params: {
                color: glowColor,
                size: 4,
                asSecondary: true
              }
            });
          }
        }
      }

      if (effectSettings.inside.type && !applyInsideEffect) {
        effects.push({
          type: effectSettings.inside.type,
          params: effectSettings.inside.settings
        });
      }

      element.Effects().SetEffects(effects, frame);
    }

    console.log("= S.BaseDrawingObject: SetEffects - Output: Effects applied", { effects });
  }

  CalcEffectSettings(frame: Rectangle, styleRecord: any, isSecondary: boolean): any {
    console.log("= S.BaseDrawingObject: CalcEffectSettings input:", { frame, styleRecord, isSecondary });

    let minDimension = Math.min(frame.width, frame.height);
    let lineThickness = styleRecord.Line.Thickness;
    let effectExtent = { left: 0, top: 0, right: 0, bottom: 0 };
    let effectSettings = { inside: {}, outside: {} };

    if (isSecondary && lineThickness < 2) {
      lineThickness = 2;
    }

    frame.width += lineThickness;
    frame.height += lineThickness;
    minDimension = isSecondary ? lineThickness : Math.min(minDimension, 50);

    if (styleRecord.OutsideEffect && styleRecord.OutsideEffect.OutsideType) {
      effectSettings.outside.settings = {};
      switch (styleRecord.OutsideEffect.OutsideType) {
        case FileParser.OutEffect.SDOUT_EFFECT_DROP:
          effectExtent.left = minDimension * styleRecord.OutsideEffect.OutsideExtent_Left;
          effectExtent.top = minDimension * styleRecord.OutsideEffect.OutsideExtent_Top;
          effectExtent.right = minDimension * styleRecord.OutsideEffect.OutsideExtent_Right;
          effectExtent.bottom = minDimension * styleRecord.OutsideEffect.OutsideExtent_Bottom;

          if (isSecondary) {
            effectExtent.left = Math.min(effectExtent.left, 2);
            effectExtent.top = Math.min(effectExtent.top, 2);
            effectExtent.right = Math.min(effectExtent.right, 2);
            effectExtent.bottom = Math.min(effectExtent.bottom, 2);
          }

          effectSettings.outside.type = Effects.EffectType.DROPSHADOW;
          effectSettings.outside.settings.size = Math.min(Math.max((effectExtent.left + effectExtent.right) / 2, 2), 50);
          effectSettings.outside.settings.xOff = effectExtent.right / 2 - effectExtent.left / 2;
          effectSettings.outside.settings.yOff = effectExtent.bottom / 2 - effectExtent.top / 2;
          effectSettings.outside.settings.color = styleRecord.OutsideEffect.Color;
          effectSettings.outside.settings.asSecondary = true;

          effectExtent.left = Math.max(-effectSettings.outside.settings.xOff + effectSettings.outside.settings.size, 0);
          effectExtent.top = Math.max(-effectSettings.outside.settings.yOff + effectSettings.outside.settings.size, 0);
          effectExtent.right = Math.max(effectSettings.outside.settings.xOff + effectSettings.outside.settings.size, 0);
          effectExtent.bottom = Math.max(effectSettings.outside.settings.yOff + effectSettings.outside.settings.size, 0);
          break;

        case FileParser.OutEffect.SDOUT_EFFECT_GLOW:
          effectExtent.left = effectExtent.top = effectExtent.right = effectExtent.bottom = Math.max(minDimension * styleRecord.OutsideEffect.OutsideExtent_Left, 2);
          effectSettings.outside.type = Effects.EffectType.GLOW;
          effectSettings.outside.settings.size = Math.min(Math.max((effectExtent.left + effectExtent.right) / 2, 2), 50);
          effectSettings.outside.settings.color = styleRecord.OutsideEffect.Color;
          effectSettings.outside.settings.asSecondary = true;

          effectExtent.left = effectExtent.top = effectExtent.right = effectExtent.bottom = effectSettings.outside.settings.size;
          break;

        case FileParser.OutEffect.SDOUT_EFFECT_REFL:
          effectExtent.left = frame.width * styleRecord.OutsideEffect.OutsideExtent_Left;
          effectExtent.right = frame.width * styleRecord.OutsideEffect.OutsideExtent_Right;
          effectExtent.bottom = frame.height * styleRecord.OutsideEffect.OutsideExtent_Bottom;
          effectSettings.outside.type = Effects.EffectType.REFLECT;
          effectSettings.outside.settings.xOff = effectExtent.right - effectExtent.left;
          effectSettings.outside.settings.yOff = effectExtent.bottom;
          effectSettings.outside.settings.asSecondary = true;

          const reflectOffset = Element.Effects.CalcSecondaryEffectOffset(effectSettings.outside.settings.xOff, effectSettings.outside.settings.yOff);
          effectExtent.left = Math.max(-reflectOffset, 0);
          effectExtent.right = Math.max(reflectOffset, 0);
          break;

        case FileParser.OutEffect.SDOUT_EFFECT_CAST:
          effectExtent.left = frame.width * styleRecord.OutsideEffect.OutsideExtent_Left;
          effectExtent.right = frame.width * styleRecord.OutsideEffect.OutsideExtent_Right;
          effectExtent.bottom = frame.height * styleRecord.OutsideEffect.OutsideExtent_Bottom;
          effectSettings.outside.type = Effects.EffectType.CASTSHADOW;
          effectSettings.outside.settings.xOff = effectExtent.right - effectExtent.left;
          effectSettings.outside.settings.yOff = effectExtent.bottom;
          effectSettings.outside.settings.size = Math.min(Math.max(0.1 * Math.abs(effectExtent.bottom), 2), 25);
          effectSettings.outside.settings.asSecondary = true;

          const castOffset = Element.Effects.CalcSecondaryEffectOffset(effectSettings.outside.settings.xOff, effectSettings.outside.settings.yOff);
          effectExtent.left = Math.max(-castOffset + effectSettings.outside.settings.size, 0);
          effectExtent.right = Math.max(castOffset + effectSettings.outside.settings.size, 0);
          effectExtent.bottom = Math.max(effectSettings.outside.settings.yOff + effectSettings.outside.settings.size, 0);
          break;
      }
    }

    if (styleRecord.Fill.FillEffect && !isSecondary) {
      minDimension = Math.min(frame.width, frame.height);
      effectSettings.inside.settings = {};
      switch (styleRecord.Fill.FillEffect) {
        case FileParser.FillEffect.SDFILL_EFFECT_GLOSS:
          effectSettings.inside.type = Effects.EffectType.GLOSS;
          effectSettings.inside.settings.size = Math.min(frame.width, frame.height);
          effectSettings.inside.settings.type = Element.Effects.GlossType.SOFT;
          effectSettings.inside.settings.dir = Element.Effects.FilterDirection.TOP;
          effectSettings.inside.settings.color = styleRecord.Fill.EffectColor;

          switch (styleRecord.Fill.LParam) {
            case 1:
              effectSettings.inside.settings.dir = Element.Effects.FilterDirection.LEFTTOP;
              break;
            case 2:
              effectSettings.inside.settings.dir = Element.Effects.FilterDirection.RIGHTTOP;
              break;
            case 3:
              effectSettings.inside.settings.dir = Element.Effects.FilterDirection.CENTER;
              break;
          }

          if (styleRecord.Fill.WParam) {
            effectSettings.inside.settings.type = Element.Effects.GlossType.HARD;
          }
          break;

        case FileParser.FillEffect.SDFILL_EFFECT_BEVEL:
          minDimension = Math.max(Math.min(minDimension, 50) / 10, 2);
          effectSettings.inside.type = Effects.EffectType.BEVEL;
          effectSettings.inside.settings.size = minDimension;
          effectSettings.inside.settings.type = Element.Effects.BevelType.SOFT;
          effectSettings.inside.settings.dir = Element.Effects.FilterDirection.LEFTTOP;

          switch (styleRecord.Fill.WParam) {
            case 0:
              effectSettings.inside.settings.type = Element.Effects.BevelType.HARD;
              break;
            case 1:
              effectSettings.inside.settings.type = Element.Effects.BevelType.SOFT;
              break;
            case 2:
              effectSettings.inside.settings.type = Element.Effects.BevelType.BUMP;
              break;
          }

          switch (styleRecord.Fill.LParam) {
            case 0:
              effectSettings.inside.settings.dir = Element.Effects.FilterDirection.LEFT;
              break;
            case 1:
              effectSettings.inside.settings.dir = Element.Effects.FilterDirection.LEFTTOP;
              break;
            case 2:
              effectSettings.inside.settings.dir = Element.Effects.FilterDirection.TOP;
              break;
            case 3:
              effectSettings.inside.settings.dir = Element.Effects.FilterDirection.RIGHTTOP;
              break;
            case 4:
              effectSettings.inside.settings.dir = Element.Effects.FilterDirection.RIGHT;
              break;
            case 5:
              effectSettings.inside.settings.dir = Element.Effects.FilterDirection.RIGHTBOTTOM;
              break;
            case 6:
              effectSettings.inside.settings.dir = Element.Effects.FilterDirection.BOTTOM;
              break;
            case 7:
              effectSettings.inside.settings.dir = Element.Effects.FilterDirection.LEFTBOTTOM;
              break;
            case 8:
              effectSettings.inside.settings.dir = Element.Effects.FilterDirection.CENTER;
              break;
          }
          break;

        case FileParser.FillEffect.SDFILL_EFFECT_INSHADOW:
          minDimension = Math.min(minDimension, 50) / 2;
          if (styleRecord.Fill.WParam) {
            let param = styleRecord.Fill.WParam;
            if (param < 0 || param > 100) {
              param = 20;
            }
            minDimension = minDimension * param / 100;
          } else {
            minDimension /= 5;
          }

          effectSettings.inside.type = Effects.EffectType.INNERSHADOW;
          effectSettings.inside.settings.size = minDimension;
          effectSettings.inside.settings.dir = Element.Effects.FilterDirection.LEFTTOP;
          break;

        case FileParser.FillEffect.SDFILL_EFFECT_INGLOW:
          minDimension = Math.min(minDimension, 50) / 2;
          if (styleRecord.Fill.WParam) {
            let param = styleRecord.Fill.WParam;
            if (param < 0 || param > 100) {
              param = 20;
            }
            minDimension = minDimension * param / 100;
          } else {
            minDimension /= 5;
          }

          effectSettings.inside.type = Effects.EffectType.INNERGLOW;
          effectSettings.inside.settings.size = minDimension;
          effectSettings.inside.settings.color = styleRecord.Fill.EffectColor;
          break;
      }
    }

    effectSettings.extent = effectExtent;

    console.log("= S.BaseDrawingObject: CalcEffectSettings output:", effectSettings);
    return effectSettings;
  }

  CreateGradientRecord(
    gradientStyle: number,
    startColor: string,
    startOpacity: number,
    endColor: string,
    endOpacity: number
  ): any {
    console.log("= S.BaseDrawingObject: CreateGradientRecord input:", {
      gradientStyle,
      startColor,
      startOpacity,
      endColor,
      endOpacity
    });

    const gradientRecord = {
      type: Basic.Element.Style.GradientStyle.LINEAR,
      startPos: Basic.Element.Style.GradientPos.LEFTTOP,
      stops: []
    };

    const startStop = {
      color: startColor,
      opacity: startOpacity
    };

    const endStop = {
      color: endColor,
      opacity: endOpacity
    };

    if (gradientStyle & ListManager.GradientStyle.GRAD_REV) {
      startStop.color = endColor;
      startStop.opacity = endOpacity;
      endStop.color = startColor;
      endStop.opacity = startOpacity;
    }

    if (gradientStyle & ListManager.GradientStyle.GRAD_MIDDLE) {
      gradientRecord.stops.push({ offset: 0, color: startStop.color, opacity: startStop.opacity });
      gradientRecord.stops.push({ offset: 50, color: endStop.color, opacity: endStop.opacity });
      gradientRecord.stops.push({ offset: 100, color: startStop.color, opacity: startStop.opacity });
    } else {
      gradientRecord.stops.push({ offset: 0, color: startStop.color, opacity: startStop.opacity });
      gradientRecord.stops.push({ offset: 100, color: endStop.color, opacity: endStop.opacity });
    }

    if (gradientStyle & ListManager.GradientStyle.GRAD_RADIAL) {
      gradientRecord.type = Basic.Element.Style.GradientStyle.RADIAL;
      gradientRecord.startPos = Basic.Element.Style.GradientPos.CENTER;
    } else if (gradientStyle & ListManager.GradientStyle.GRAD_SHAPE) {
      gradientRecord.type = Basic.Element.Style.GradientStyle.RADIALFILL;
      gradientRecord.startPos = Basic.Element.Style.GradientPos.CENTER;
    } else {
      gradientRecord.type = Basic.Element.Style.GradientStyle.LINEAR;
      if (gradientStyle & ListManager.GradientStyle.GRAD_TLBR) {
        gradientRecord.startPos = Basic.Element.Style.GradientPos.LEFTTOP;
      } else if (gradientStyle & ListManager.GradientStyle.GRAD_TRBL) {
        gradientRecord.startPos = Basic.Element.Style.GradientPos.RIGHTTOP;
      } else if (gradientStyle & ListManager.GradientStyle.GRAD_VERT) {
        gradientRecord.startPos = Basic.Element.Style.GradientPos.TOP;
      } else if (gradientStyle & ListManager.GradientStyle.GRAD_HORIZ) {
        gradientRecord.startPos = Basic.Element.Style.GradientPos.LEFT;
      } else {
        gradientRecord.startPos = Basic.Element.Style.GradientPos.LEFTTOP;
      }
    }

    console.log("= S.BaseDrawingObject: CreateGradientRecord output:", gradientRecord);
    return gradientRecord;
  }

  CreateRichGradientRecord(gradientIndex: number): any {
    console.log("= S.BaseDrawingObject: CreateRichGradientRecord input:", { gradientIndex });

    let gradientRecord: any = {
      type: Basic.Element.Style.GradientStyle.LINEAR,
      startPos: Basic.Element.Style.GradientPos.LEFTTOP,
      stops: []
    };

    if (gradientIndex < 0 || gradientIndex >= GlobalData.optManager.RichGradients.length) {
      console.log("= S.BaseDrawingObject: CreateRichGradientRecord output: null (invalid gradientIndex)");
      return null;
    }

    const richGradient = GlobalData.optManager.RichGradients[gradientIndex];

    switch (richGradient.gradienttype) {
      case Resources.RichGradientTypes.SDFILL_RICHGRADIENT_LINEAR:
        gradientRecord.type = Basic.Element.Style.GradientStyle.LINEAR;
        gradientRecord.angle = richGradient.angle;
        break;
      case Resources.RichGradientTypes.SDFILL_RICHGRADIENT_RADIAL_BR:
      case Resources.RichGradientTypes.SDFILL_RICHGRADIENT_RECT_BR:
        gradientRecord.type = Basic.Element.Style.GradientStyle.RADIAL;
        gradientRecord.startPos = Basic.Element.Style.GradientPos.RIGHTBOTTOM;
        break;
      case Resources.RichGradientTypes.SDFILL_RICHGRADIENT_RADIAL_BL:
      case Resources.RichGradientTypes.SDFILL_RICHGRADIENT_RECT_BL:
        gradientRecord.type = Basic.Element.Style.GradientStyle.RADIAL;
        gradientRecord.startPos = Basic.Element.Style.GradientPos.LEFTBOTTOM;
        break;
      case Resources.RichGradientTypes.SDFILL_RICHGRADIENT_RADIAL_CENTER:
      case Resources.RichGradientTypes.SDFILL_RICHGRADIENT_RECT_CENTER:
        gradientRecord.type = Basic.Element.Style.GradientStyle.RADIAL;
        gradientRecord.startPos = Basic.Element.Style.GradientPos.CENTER;
        break;
      case Resources.RichGradientTypes.SDFILL_RICHGRADIENT_RADIAL_TR:
      case Resources.RichGradientTypes.SDFILL_RICHGRADIENT_RECT_TR:
        gradientRecord.type = Basic.Element.Style.GradientStyle.RADIAL;
        gradientRecord.startPos = Basic.Element.Style.GradientPos.RIGHTTOP;
        break;
      case Resources.RichGradientTypes.SDFILL_RICHGRADIENT_RADIAL_TL:
      case Resources.RichGradientTypes.SDFILL_RICHGRADIENT_RECT_TL:
        gradientRecord.type = Basic.Element.Style.GradientStyle.RADIAL;
        gradientRecord.startPos = Basic.Element.Style.GradientPos.LEFTTOP;
        break;
      case Resources.RichGradientTypes.SDFILL_RICHGRADIENT_RADIAL_BC:
        gradientRecord.type = Basic.Element.Style.GradientStyle.RADIAL;
        gradientRecord.startPos = Basic.Element.Style.GradientPos.BOTTOM;
        break;
      case Resources.RichGradientTypes.SDFILL_RICHGRADIENT_RADIAL_TC:
        gradientRecord.type = Basic.Element.Style.GradientStyle.RADIAL;
        gradientRecord.startPos = Basic.Element.Style.GradientPos.TOP;
        break;
      case Resources.RichGradientTypes.SDFILL_RICHGRADIENT_SHAPE:
        gradientRecord.type = Basic.Element.Style.GradientStyle.RADIALFILL;
        gradientRecord.startPos = Basic.Element.Style.GradientPos.CENTER;
        break;
    }

    for (let i = 0; i < richGradient.stops.length; i++) {
      gradientRecord.stops.push({
        color: richGradient.stops[i].color,
        opacity: richGradient.stops[i].opacity,
        offset: richGradient.stops[i].stop
      });
    }

    console.log("= S.BaseDrawingObject: CreateRichGradientRecord output:", gradientRecord);
    return gradientRecord;
  }

  CalcLineHops(element) {
  }

  AddHopPoint(
    point: Point,
    tolerance: number,
    angle: number,
    radius: number,
    index: number,
    additionalData: any
  ): { bSuccess: boolean; tindex: number } {
    console.log("= S.BaseDrawingObject: AddHopPoint input:", {
      point,
      tolerance,
      angle,
      radius,
      index,
      additionalData
    });

    const result = {
      bSuccess: false,
      tindex: -1
    };

    // TODO: Implement the logic for adding a hop point here.

    console.log("= S.BaseDrawingObject: AddHopPoint output:", result);
    return result;
  }

  ResetAutoScrollTimer(): void {
    console.log("= S.BaseDrawingObject: ResetAutoScrollTimer input: none");

    if (GlobalData.optManager.autoScrollTimerID !== -1) {
      clearTimeout(GlobalData.optManager.autoScrollTimerID);
      GlobalData.optManager.autoScrollTimer.obj = GlobalData.optManager;
      GlobalData.optManager.autoScrollTimerID = -1;
    }

    console.log("= S.BaseDrawingObject: ResetAutoScrollTimer output: timer reset");
  }

  GetActionButtons() {
    return null
  }

  GetArrowheadSelection(element) {
    return false
  }

  SetRolloverActions(rolloverElement: any, eventObj: any) {
    console.log("= S.BaseDrawingObject SetRolloverActions - Input:", { rolloverElement, eventObj });

    // If current highlighted shape is different than this, clear its effects and cursors
    if (
      GlobalData.optManager.curHiliteShape !== -1 &&
      GlobalData.optManager.curHiliteShape !== this.BlockID
    ) {
      const previousShape = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.curHiliteShape, false);
      if (previousShape) {
        console.log("= S.BaseDrawingObject SetRolloverActions - Clearing previous shape:", GlobalData.optManager.curHiliteShape);
        previousShape.SetRuntimeEffects(false);
        previousShape.ClearCursors();
      }
    }

    // Set runtime effects for current object based on mobile platform
    if (GlobalData.optManager.isMobilePlatform) {
      this.SetRuntimeEffects(false);
    } else {
      this.SetRuntimeEffects(true);
    }
    this.SetCursors();
    GlobalData.optManager.curHiliteShape = this.BlockID;
    const self = this; // preserve context for event handler

    eventObj.svgObj.mouseout(function () {
      console.log("= S.BaseDrawingObject SetRolloverActions - MouseOut Triggered for BlockID:", self.BlockID);
      self.SetRuntimeEffects(false);
      self.ClearCursors();
      if (GlobalData.optManager.curHiliteShape === self.BlockID) {
        GlobalData.optManager.curHiliteShape = -1;
      }
      console.log("= S.BaseDrawingObject SetRolloverActions - MouseOut Completed for BlockID:", self.BlockID);
    });

    console.log("= S.BaseDrawingObject SetRolloverActions - Output: Completed setup for BlockID", this.BlockID);
  }

  CalcCursorForAngle(angle: number, swap: boolean): string {
    console.log("= S.BaseDrawingObject: CalcCursorForAngle - Input:", { angle, swap });

    // Round the angle to the nearest multiple of 10.
    angle = 10 * Math.round(angle / 10);

    // Initialize the cursor with a default value.
    let cursor: string = Element.CursorType.RESIZE_LR;

    // Determine the cursor type based on the angle.
    if ((angle > 0 && angle < 90) || (angle > 180 && angle < 270)) {
      cursor = Element.CursorType.NWSE_RESIZE;
    } else if ((angle > 90 && angle < 180) || (angle > 270 && angle < 360)) {
      cursor = Element.CursorType.NESW_RESIZE;
    } else if (angle === 90 || angle === 270) {
      cursor = Element.CursorType.RESIZE_TB;
    }

    // Optionally swap the cursor type.
    if (swap) {
      switch (cursor) {
        case Element.CursorType.RESIZE_LR:
          cursor = Element.CursorType.RESIZE_TB;
          break;
        case Element.CursorType.RESIZE_TB:
          cursor = Element.CursorType.RESIZE_LR;
          break;
        case Element.CursorType.NWSE_RESIZE:
          cursor = Element.CursorType.NESW_RESIZE;
          break;
        case Element.CursorType.NESW_RESIZE:
          cursor = Element.CursorType.NWSE_RESIZE;
          break;
      }
    }

    console.log("= S.BaseDrawingObject: CalcCursorForAngle - Output:", cursor);
    return cursor;
  }

  FoundText(searchText: string, selectionLength: number, targetBlockId: number): boolean {
    console.log("= S.BaseDrawingObject FoundText - Input:", { searchText, selectionLength, targetBlockId });

    // If the target block is this block then skip processing.
    if (this.BlockID === targetBlockId) {
      console.log("= S.BaseDrawingObject FoundText - Output:", false, "Same BlockID");
      return false;
    }

    let found: boolean = false;
    if (this.DataID >= 0) {
      const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
      if (svgElement) {
        const textElement = svgElement.textElem;
        if (textElement) {
          const textContent = textElement.GetText(0);
          const foundIndex = textContent.search(searchText);
          if (foundIndex >= 0) {
            GlobalData.optManager.ActivateTextEdit(svgElement);
            textElement.SetSelectedRange(foundIndex, foundIndex + selectionLength);
            found = true;
          }
        }
      }
    }

    console.log("= S.BaseDrawingObject FoundText - Output:", found);
    return found;
  }

  MoveBehindAllLinked() {
    console.log("= S.BaseDrawingObject MoveBehindAllLinked - Input: {}");

    // Flag to track if modifications were made.
    let hasMoved: boolean = false;

    // Get the current z-order list.
    let frontLayerZList: number[] = GlobalData.optManager.FrontMostLayerZListPreserve();
    // Find the index of the current block ID within the z-order list.
    let currentBlockID: number = this.BlockID;
    let currentIndex: number = $.inArray(currentBlockID, frontLayerZList);

    // Retrieve the links object.
    let linksObj = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theLinksBlockID, true);
    if (linksObj) {
      // Start finding links starting for the current block.
      let linkIndex: number = GlobalData.optManager.FindLink(linksObj, currentBlockID, true);
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

    console.log("= S.BaseDrawingObject MoveBehindAllLinked - Output: { hasMoved: " + hasMoved + " }");
    return hasMoved;
  }

  HookedObjectMoving(event: any): boolean {
    console.log("= S.BaseDrawingObject HookedObjectMoving - Input:", { event });
    const result = false;
    console.log("= S.BaseDrawingObject HookedObjectMoving - Output:", result);
    return result;
  }

  CustomSnap(snapTarget: any, snapOptions: any, tolerance: number, additionalData: any, flag: boolean): boolean {
    console.log("= S.BaseDrawingObject CustomSnap - Input:", { snapTarget, snapOptions, tolerance, additionalData, flag });

    // Custom snapping logic can be added here.
    const result = false;

    console.log("= S.BaseDrawingObject CustomSnap - Output:", result);
    return result;
  }

  GetSnapRect(): any {
    console.log("= S.BaseDrawingObject GetSnapRect - Input:", { frame: this.Frame });
    const snapRect: any = {};
    Utils2.CopyRect(snapRect, this.Frame);
    console.log("= S.BaseDrawingObject GetSnapRect - Output:", snapRect);
    return snapRect;
  }

  CanSnapToShapes(): number {
    console.log("= S.BaseDrawingObject CanSnapToShapes - Input: {}");
    const result: number = -1;
    console.log("= S.BaseDrawingObject CanSnapToShapes - Output:", result);
    return result;
  }

  IsSnapTarget(): boolean {
    console.log("= S.BaseDrawingObject IsSnapTarget - Input:", {});
    const result = false;
    console.log("= S.BaseDrawingObject IsSnapTarget - Output:", result);
    return result;
  }

  GuideDistanceOnly(): boolean {
    console.log("= S.BaseDrawingObject Guide_DistanceOnly - Input:", {});
    const result = false;
    console.log("= S.BaseDrawingObject Guide_DistanceOnly - Output:", result);
    return result;
  }

  ActionApplySnaps(snapTarget: any, snapOptions: any): any {
    console.log("= S.BaseDrawingObject ActionApplySnaps - Input:", { snapTarget, snapOptions });

    // TODO: implement snap action logic here.
    // For now, we'll assume no snap action is applied and return null.
    const result = null;

    console.log("= S.BaseDrawingObject ActionApplySnaps - Output:", result);
    return result;
  }

  GetNotePos(source, container) {
    console.log("= S.BaseDrawingObject GetNotePos - Input:", { source, container });

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

    console.log("= S.BaseDrawingObject GetNotePos - Output:", notePosition);
    return notePosition;
  }

  RefreshFromRuleChange(fieldDataTableID: number, fieldDataElementID: number): void {
    console.log("= S.BaseDrawingObject RefreshFromRuleChange - Input:", {
      fieldDataTableID,
      fieldDataElementID
    });

    if (this.HasFieldDataRecord(fieldDataTableID, fieldDataElementID, true)) {
      this.GetFieldDataStyleOverride();
      GlobalData.optManager.AddToDirtyList(this.BlockID);
      console.log("= S.BaseDrawingObject RefreshFromRuleChange - Output: Rule change refreshed", {
        BlockID: this.BlockID
      });
    } else {
      console.log("= S.BaseDrawingObject RefreshFromRuleChange - Output: No matching field data record", {
        fieldDataTableID,
        fieldDataElementID
      });
    }
  }

  IsShapeContainer(element: any): boolean {
    console.log("= S.BaseDrawingObject IsShapeContainer - Input:", element);
    const result = false;
    console.log("= S.BaseDrawingObject IsShapeContainer - Output:", result);
    return result;
  }

  HasFieldData(): boolean {
    // console.log("= S.BaseDrawingObject: HasFieldData input: none");

    // const hasDatasetID =
    //   this.fieldDataDatasetID !== null &&
    //   this.fieldDataDatasetID !== undefined &&
    //   this.fieldDataDatasetID >= 0;

    // const hasTableID =
    //   this.fieldDataTableID !== null &&
    //   this.fieldDataTableID !== undefined &&
    //   this.fieldDataTableID >= 0;

    // const result = hasDatasetID && hasTableID;

    // console.log("= S.BaseDrawingObject: HasFieldData output:", result);
    // return result;
  }

  HasFieldDataForTable(tableID: number): boolean {
    console.log("= S.BaseDrawingObject: HasFieldDataForTable input:", { tableID });

    // Return false if no field data dataset is set
    if (this.fieldDataDatasetID < 0) {
      console.log("= S.BaseDrawingObject: HasFieldDataForTable output:", false, "(invalid fieldDataDatasetID)");
      return false;
    }

    // Compare the field data table ID to the provided tableID
    const result = this.fieldDataTableID === tableID;

    console.log("= S.BaseDrawingObject: HasFieldDataForTable output:", result);
    return result;
  }

  HasFieldDataInText(tableID: number): boolean {
    console.log("= S.BaseDrawingObject: HasFieldDataInText input:", { tableID });

    // If a table ID is provided, ensure it matches this object's field data table ID
    if (tableID && this.fieldDataTableID !== tableID) {
      console.log("= S.BaseDrawingObject: HasFieldDataInText output:", false, "(tableID mismatch)");
      return false;
    }

    // If the field data element ID is invalid, return false
    if (this.fieldDataElemID < 0) {
      console.log("= S.BaseDrawingObject: HasFieldDataInText output:", false, "(invalid fieldDataElemID)");
      return false;
    }

    // Check for field data in table cells
    const table = this.GetTable(false);
    if (table) {
      const hasData = GlobalData.optManager.Table_HasFieldDataInText(this.BlockID, table);
      console.log("= S.BaseDrawingObject: HasFieldDataInText output:", hasData, "(found in table cells)");
      return hasData;
    }

    // Check for field data in text if DataID exists
    if (this.DataID >= 0) {
      const element = GlobalData.optManager.svgObjectLayer.FindElement(this.BlockID);
      if (element && element.textElem) {
        const hasDataFields = element.textElem.HasDataFields();
        console.log("= S.BaseDrawingObject: HasFieldDataInText output:", hasDataFields, "(found in textElem)");
        return hasDataFields;
      }
    }

    console.log("= S.BaseDrawingObject: HasFieldDataInText output:", false, "(not found)");
    return false;
  }

  SetFieldDataRecord(tableID: number, elementID: number, additionalParam: any): void {
    console.log("= S.BaseDrawingObject: SetFieldDataRecord input:", {
      tableID,
      elementID,
      additionalParam
    });

    console.log("= S.BaseDrawingObject: SetFieldDataRecord output: completed");
  }

  NewFieldDataRecord(element) {
  }

  HasFieldDataRecord(tableID: number, elementID: number, additionalParam: any): boolean {
    console.log("= S.BaseDrawingObject: HasFieldDataRecord input:", { tableID, elementID, additionalParam });

    const result =
      this.HasFieldData() &&
      (!tableID || this.fieldDataTableID === tableID) &&
      (!elementID || this.fieldDataElemID === elementID || this.fieldDataElemID === -1);

    console.log("= S.BaseDrawingObject: HasFieldDataRecord output:", result);
    return result;
  }

  ChangeFieldDataTable(element) {
  }

  RemoveFieldData(element, toRemove) {
  }

  GetFieldDataTable() {
  }

  GetFieldDataRecord() {
  }

  HasFieldDataRules(element) {
  }

  GetFieldDataStyleOverride() {
  }

  RefreshFromFieldData(element) {
  }

  RefreshFromRuleChange(element, par) {
  }

  RemapDataFields(element) {
  }

  RegisterForDataDrop(element) {
  }

  GetFieldDataStyleOverride() {
  }
}

export default BaseDrawingObject
