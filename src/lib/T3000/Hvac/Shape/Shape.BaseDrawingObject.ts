



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
}

export default BaseDrawingObject
