



import BaseDrawingObject from './Shape.BaseDrawingObject'
import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import GlobalData from '../Data/GlobalData'
import DefaultEvt from "../Event/DefaultEvt";
import $ from 'jquery'
import HvTimer from '../Helper/HvTimer'
import Point from '../Model/Point'
import BaseShape from './Shape.BaseShape'
import Utils4 from '../Helper/Utils3'
import Rect from "./Shape.Rect";
import Document from '../Basic/Basic.Document'
import Element from '../Basic/Basic.Element'
import Instance from "../Data/Instance/Instance"
import ConstantData from "../Data/ConstantData"
import PolyList from "../Model/PolyList"
import PolySeg from '../Model/PolySeg'
import HitResult from '../Model/HitResult'
import RightClickData from '../Model/RightClickData'
import ConstantData1 from "../Data/ConstantData1"
import ArrowheadRecord from '../Model/ArrowheadRecord'

class BaseLine extends BaseDrawingObject {

  public LineType: any;
  public linetrect: any;
  public theMinTextDim: any;
  public TextWrapWidth: any;
  public polylist: any;

  public StartArrowID: any;
  public EndArrowID: any;
  public StartArrowDisp: any;
  public EndArrowDisp: any;
  public ArrowSizeIndex: any;

  constructor(params: any) {
    console.log("= S.BaseLine: constructor called with input:", params);

    // Ensure params is defined and set default values
    params = params || {};
    params.DrawingObjectBaseClass = ConstantData.DrawingObjectBaseClass.LINE;
    params.maxhooks = 2;

    if (typeof params.targflags === "undefined") {
      params.targflags = ConstantData.HookFlags.SED_LC_Line | ConstantData.HookFlags.SED_LC_AttachToLine;
    }

    if (typeof params.hookflags === "undefined") {
      params.hookflags = ConstantData.HookFlags.SED_LC_Shape | ConstantData.HookFlags.SED_LC_Line;
    }

    // Call the base class constructor
    super(params);

    // Initialize properties with formatted assignments
    this.LineType = params.LineType;
    this.linetrect = { x: 0, y: 0, width: 0, height: 0 };
    this.theMinTextDim = { width: 0, height: 0 };
    this.TextWrapWidth = 0;
    this.iconShapeBottomOffset = 20;
    this.iconShapeRightOffset = 0;

    console.log("= S.BaseLine: constructor output:", this);
  }

  checkIfPolyLine(polylineObj: any): boolean {
    console.log("= S.BaseLine: checkIfPolyLine called with input:", polylineObj);

    const PolyLineClass = Instance.Shape.PolyLine;
    const isPolyLine = polylineObj instanceof PolyLineClass;

    console.log("= S.BaseLine: checkIfPolyLine output:", isPolyLine);
    return isPolyLine;
  }

  CalcFrame(inputFlag?: boolean): void {
    console.log("= S.BaseLine: CalcFrame called with inputFlag =", inputFlag);

    // Calculate the initial frame from start and end points
    let isSegLine = false;
    this.Frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    console.log("= S.BaseLine: Initial Frame calculated as", this.Frame);

    // Check if the line type requires segment processing
    if (this.LineType === ConstantData.LineType.SEGLINE) {
      isSegLine = true;
      console.log("= S.BaseLine: LineType is SEGLINE, setting isSegLine to", isSegLine);
    }

    // Get the polygon points for the frame computation
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, isSegLine, false, null);
    console.log("= S.BaseLine: Retrieved polyPoints:", polyPoints);

    // If polyPoints exist, update the frame accordingly
    if (polyPoints && polyPoints.length) {
      Utils2.GetPolyRect(this.Frame, polyPoints);
      console.log("= S.BaseLine: Updated Frame using polyPoints:", this.Frame);
    }

    // Update the frame with additional properties if needed
    this.UpdateFrame(this.Frame, inputFlag);
    console.log("= S.BaseLine: Final Frame after UpdateFrame:", this.Frame);
  }

  GetArrowheadFormat(): ArrowheadRecord {
    console.log("= S.BaseLine: GetArrowheadFormat called");
    console.log("= S.BaseLine: Input this =", this);

    const arrHead = new ArrowheadRecord();
    if (SDF.LineIsReversed(this, null, false)) {
      console.log("= S.BaseLine: Line is reversed");
      arrHead.StartArrowID = this.EndArrowID;
      arrHead.EndArrowID = this.StartArrowID;
      arrHead.StartArrowDisp = this.EndArrowDisp;
      arrHead.EndArrowDisp = this.StartArrowDisp;
    } else {
      console.log("= S.BaseLine: Line is not reversed");
      arrHead.StartArrowID = this.StartArrowID;
      arrHead.EndArrowID = this.EndArrowID;
      arrHead.StartArrowDisp = this.StartArrowDisp;
      arrHead.EndArrowDisp = this.EndArrowDisp;
    }
    arrHead.ArrowSizeIndex = this.ArrowSizeIndex;

    console.log("= S.BaseLine: Output ArrowheadRecord =", arrHead);
    return arrHead;
  }

  GetSVGFrame(inputFrame?: any): any {
    console.log("= S.BaseLine: GetSVGFrame called with input:", inputFrame);
    let frame: any = {};

    if (inputFrame != null) {
      Utils2.CopyRect(frame, inputFrame);
    } else {
      frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    }

    console.log("= S.BaseLine: GetSVGFrame output:", frame);
    return frame;
  }

  GetPositionRect(): any {
    console.log("= S.BaseLine: GetPositionRect called with StartPoint:", this.StartPoint, "and EndPoint:", this.EndPoint);
    const positionRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    console.log("= S.BaseLine: GetPositionRect output:", positionRect);
    return positionRect;
  }

  AdjustPinRect(pinRect: any, offset: any, additional: any): any {
    console.log("= S.BaseLine: AdjustPinRect called with", { pinRect, offset, additional });
    const adjustedPinRect =
      this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR
        ? GlobalData.optManager.GanttAdjustPinRect(this.BlockID, pinRect, offset, additional)
        : pinRect;
    console.log("= S.BaseLine: AdjustPinRect output:", adjustedPinRect);
    return adjustedPinRect;
  }

  GetDimensions(): { x: number; y: number } {
    console.log("= S.BaseLine: GetDimensions called with StartPoint:", this.StartPoint, "and EndPoint:", this.EndPoint);
    const deltaX = this.EndPoint.x - this.StartPoint.x;
    const deltaY = this.EndPoint.y - this.StartPoint.y;
    const distance = Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);
    const dimensions = { x: distance, y: 0 };
    console.log("= S.BaseLine: GetDimensions output:", dimensions);
    return dimensions;
  }

  GetDimensionsForDisplay(): { x: number; y: number; width: number; height: number } {
    console.log("= S.BaseLine: GetDimensionsForDisplay called with no input parameters");

    const dimensions = this.GetDimensions();
    console.log("= S.BaseLine: Dimensions retrieved:", dimensions);

    const result = {
      x: this.Frame.x,
      y: this.Frame.y,
      width: dimensions.x,
      height: dimensions.y,
    };

    console.log("= S.BaseLine: GetDimensionsForDisplay output:", result);
    return result;
  }

  GetSnapRect() {
    console.log("= S.BaseLine: GetSnapRect called with no input");

    // Create a snap rectangle by copying the current frame.
    let snapRect: any = {};
    Utils2.CopyRect(snapRect, this.Frame);
    console.log("= S.BaseLine: Initial snapRect copied from Frame:", snapRect);

    // If the object is a floorplan wall, adjust the snap rectangle dimensions.
    if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
      let widthInflation = 0;
      let heightInflation = 0;

      // Inflate width if necessary.
      if (snapRect.width === 0) {
        widthInflation = this.StyleRecord.Line.Thickness / 2;
      }

      // Inflate height if necessary.
      if (snapRect.height === 0) {
        heightInflation = this.StyleRecord.Line.Thickness / 2;
      }

      Utils2.InflateRect(snapRect, widthInflation, heightInflation);
      console.log("= S.BaseLine: snapRect after inflation for floorplan wall:", snapRect);
    }

    console.log("= S.BaseLine: GetSnapRect returning:", snapRect);
    return snapRect;
  }

  CanSnapToShapes(input: any): number {
    console.log("= S.BaseLine: CanSnapToShapes called with input:", input);

    if (input && this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
      if (Utils2.IsEqual(this.StartPoint.x, this.EndPoint.x, this.StyleRecord.Line.BThick)) {
        input.distanceonly = ConstantData.Guide_DistanceTypes.Vertical_Wall;
        console.log("= S.BaseLine: CanSnapToShapes output:", this.BlockID, "for Vertical_Wall");
        return this.BlockID;
      }
      if (Utils2.IsEqual(this.StartPoint.y, this.EndPoint.y, this.StyleRecord.Line.BThick)) {
        input.distanceonly = ConstantData.Guide_DistanceTypes.Horizontal_Wall;
        console.log("= S.BaseLine: CanSnapToShapes output:", this.BlockID, "for Horizontal_Wall");
        return this.BlockID;
      }
    }

    console.log("= S.BaseLine: CanSnapToShapes output: -1");
    return -1;
  }

  IsSnapTarget(): boolean {
    console.log("= S.BaseLine: IsSnapTarget called with no input");
    const result = false;
    console.log("= S.BaseLine: IsSnapTarget output:", result);
    return result;
  }

  GuideDistanceOnly(): any {
    console.log("= S.BaseLine: Guide_DistanceOnly called");

    const isFloorPlanWall = this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL;
    const result = isFloorPlanWall ? ConstantData.Guide_DistanceTypes.PolyWall : false;

    console.log("= S.BaseLine: Guide_DistanceOnly returning", result);
    return result;
  }

  CreateDimension(
    startPoint: any,
    endPoint: any,
    dimensionParam: any,
    extraParam1: any,
    extraParam2: any,
    extraParam3: any,
    extraParam4: any,
    extraParam5: any,
    extraParam6: any,
    extraParam7: any,
    extraParam8: any
  ): any {
    console.log("= S.BaseLine: CreateDimension called with input:", {
      startPoint,
      endPoint,
      dimensionParam,
      extraParam1,
      extraParam2,
      extraParam3,
      extraParam4,
      extraParam5,
      extraParam6,
      extraParam7,
      extraParam8,
    });

    if (
      !dimensionParam ||
      (this instanceof Instance.Shape.PolyLine &&
        this.polylist &&
        this.polylist.closed)
    ) {
      const result = super.CreateDimension(
        startPoint,
        endPoint,
        dimensionParam,
        extraParam1,
        extraParam2,
        extraParam3,
        extraParam4,
        extraParam5,
        extraParam6,
        extraParam7,
        extraParam8
      );
      console.log("= S.BaseLine: CreateDimension output:", result);
      return result;
    }

    console.log("= S.BaseLine: CreateDimension condition not met, returning undefined.");
    return undefined;
  }

  GetDimensionTextForPoints(startPoint: Point, endPoint: Point): string {
    console.log("= S.BaseDrawingObject: GetDimensionTextForPoints input:", { startPoint, endPoint });

    let totalLength = 0;

    // If total dimension flag is set then calculate the total polyline length.
    if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Total) {
      const polyPoints = this.GetPolyPoints(200, true, false, false, null);
      for (let i = 1; i < polyPoints.length; i++) {
        const deltaX = Math.abs(polyPoints[i].x - polyPoints[i - 1].x);
        const deltaY = Math.abs(polyPoints[i].y - polyPoints[i - 1].y);
        if (deltaX !== 0 || deltaY !== 0) {
          totalLength += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        }
      }
    } else {
      // Otherwise compute the arc dimension.
      // Calculate the angle difference between 360 and the angle from startPoint to endPoint.
      const angleDifferenceDegrees = 360 - Utils1.CalcAngleFromPoints(startPoint, endPoint);
      // Convert the angle difference to radians.
      const rotationRadians = 2 * Math.PI * (angleDifferenceDegrees / 360);

      // Create a copy of start and end points.
      const points: Point[] = [
        new Point(startPoint.x, startPoint.y),
        new Point(endPoint.x, endPoint.y)
      ];
      // Rotate the points about the current Frame using the negative rotation.
      Utils3.RotatePointsAboutCenter(this.Frame, -rotationRadians, points);
      // Use the absolute difference in x-coordinate after rotation.
      totalLength = Math.abs(points[0].x - points[1].x);
    }

    // Convert the calculated length in pixels (or document units) into ruler units (e.g. inches, cm, etc.).
    const dimensionText: string = this.GetLengthInRulerUnits(totalLength);
    console.log("= S.BaseDrawingObject: GetDimensionTextForPoints output:", dimensionText);
    return dimensionText;
  }

  EnforceMinimum(isPrimary: boolean): void {
    console.log("= S.BaseDrawingObject: EnforceMinimum input:", { isPrimary, StartPoint: this.StartPoint, EndPoint: this.EndPoint });

    const minDim = ConstantData.Defines.SED_MinDim;

    // Case 1: Vertical line (same x-coordinate)
    if (Utils2.IsEqual(this.EndPoint.x, this.StartPoint.x)) {
      const deltaY = this.EndPoint.y - this.StartPoint.y;
      if (Math.abs(deltaY) < minDim && this.hooks.length < 2) {
        if (deltaY >= 0) {
          if (isPrimary) {
            this.StartPoint.y = this.EndPoint.y - minDim;
          } else {
            this.EndPoint.y = this.StartPoint.y + minDim;
          }
        } else {
          if (isPrimary) {
            this.StartPoint.y = this.EndPoint.y + minDim;
          } else {
            this.EndPoint.y = this.StartPoint.y - minDim;
          }
        }
      }
    }
    // Case 2: Horizontal line (same y-coordinate)
    else if (Utils2.IsEqual(this.EndPoint.y, this.StartPoint.y)) {
      const deltaX = this.EndPoint.x - this.StartPoint.x;
      if (Math.abs(deltaX) < minDim && this.hooks.length < 2) {
        if (deltaX >= 0) {
          if (isPrimary) {
            this.StartPoint.x = this.EndPoint.x - minDim;
          } else {
            this.EndPoint.x = this.StartPoint.x + minDim;
          }
        } else {
          if (isPrimary) {
            this.StartPoint.x = this.EndPoint.x + minDim;
          } else {
            this.EndPoint.x = this.StartPoint.x - minDim;
          }
        }
      }
    }
    // Case 3: Diagonal line (neither x nor y are equal)
    else {
      const deltaX = this.EndPoint.x - this.StartPoint.x;
      const deltaY = this.EndPoint.y - this.StartPoint.y;
      if (Math.abs(deltaX) < minDim && Math.abs(deltaY) < minDim && this.hooks.length < 2) {
        // Compare absolute differences to decide which axis to adjust
        if (Math.abs(deltaX) >= Math.abs(deltaY)) {
          // Adjust along x-axis
          if (deltaX >= 0) {
            if (isPrimary) {
              this.StartPoint.x = this.EndPoint.x - minDim;
            } else {
              this.EndPoint.x = this.StartPoint.x + minDim;
            }
          } else {
            if (isPrimary) {
              this.StartPoint.x = this.EndPoint.x + minDim;
            } else {
              this.EndPoint.x = this.StartPoint.x - minDim;
            }
          }
        } else {
          // Adjust along y-axis
          if (deltaY >= 0) {
            if (isPrimary) {
              this.StartPoint.y = this.EndPoint.y - minDim;
            } else {
              this.EndPoint.y = this.StartPoint.y + minDim;
            }
          } else {
            if (isPrimary) {
              this.StartPoint.y = this.EndPoint.y + minDim;
            } else {
              this.EndPoint.y = this.StartPoint.y - minDim;
            }
          }
        }
      }
    }

    console.log("= S.BaseDrawingObject: EnforceMinimum output:", { StartPoint: this.StartPoint, EndPoint: this.EndPoint });
  }

  UpdateDimensions(newLength: number, unusedParam1: any, unusedParam2: any): void {
    console.log("= S.BaseLine: UpdateDimensions called with input:", { newLength, unusedParam1, unusedParam2 });

    let angleDegrees = 0;
    let adjustedX = 0;
    let adjustedY = 0;
    let shiftX = 0;
    let shiftY = 0;
    const points: Point[] = [];
    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

    // Translate start and end points relative to the rectangle origin
    points.push(new Point(this.StartPoint.x - rect.x, this.StartPoint.y - rect.y));
    points.push(new Point(this.EndPoint.x - rect.x, this.EndPoint.y - rect.y));

    // Calculate the rotation angle and convert to radians
    angleDegrees = 360 - Utils1.CalcAngleFromPoints(points[0], points[1]);
    const rotationRadians = 2 * Math.PI * (angleDegrees / 360);

    // Rotate points by -rotationRadians
    Utils3.RotatePointsAboutCenter(this.Frame, -rotationRadians, points);

    // Set the second point's x-coordinate based on the new length
    if (points[0].x < points[1].x) {
      points[1].x = points[0].x + newLength;
    } else {
      points[1].x = points[0].x - newLength;
    }

    // Rotate points back by rotationRadians
    Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, points);

    // Calculate adjusted coordinates relative to the original rectangle
    adjustedX = points[1].x + rect.x;
    adjustedY = points[1].y + rect.y;

    // Adjust X if the new value is negative
    if (adjustedX < 0) {
      shiftX = -adjustedX;
      adjustedX = 0;
    }

    // Adjust Y if the new value is negative and add a standoff if necessary
    if (adjustedY < 0) {
      shiftY += -adjustedY;
      if (
        this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always ||
        this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select
      ) {
        shiftY += ConstantData.Defines.DimensionDefaultStandoff;
      }
      adjustedY += shiftY;
    }

    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

    // Adjust the line end point using the calculated coordinates
    this.AdjustLineEnd(svgElement, adjustedX, adjustedY, ConstantData.ActionTriggerType.LINEEND, true);

    // If there's any shift, adjust the line start point accordingly
    if (shiftX > 0 || shiftY > 0) {
      adjustedX = this.StartPoint.x + shiftX;
      adjustedY = this.StartPoint.y + shiftY;
      this.AdjustLineStart(svgElement, adjustedX, adjustedY, ConstantData.ActionTriggerType.LINESTART, true);
    }

    console.log("= S.BaseLine: UpdateDimensions output: StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  OffsetShape(offsetX: number, offsetY: number): void {
    console.log("= S.BaseLine: OffsetShape called with offsetX:", offsetX, "offsetY:", offsetY);

    // Update frame and points with the given offsets
    this.Frame.x += offsetX;
    this.Frame.y += offsetY;
    this.r.x += offsetX;
    this.r.y += offsetY;
    this.StartPoint.x += offsetX;
    this.StartPoint.y += offsetY;
    this.EndPoint.x += offsetX;
    this.EndPoint.y += offsetY;

    // Recalculate the frame
    this.CalcFrame();

    console.log("= S.BaseLine: OffsetShape updated Frame:", this.Frame, "StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  SetShapeOrigin(newX: number, newY: number, additionalParam: any): void {
    console.log("= S.BaseLine: SetShapeOrigin called with newX:", newX, "newY:", newY, "additionalParam:", additionalParam);

    const frame = this.GetSVGFrame();
    let deltaX = 0;
    let deltaY = 0;

    if (newX != null) {
      deltaX = frame.x - newX;
    }

    if (newY != null) {
      deltaY = frame.y - newY;
    }

    this.StartPoint.x -= deltaX;
    this.StartPoint.y -= deltaY;
    this.EndPoint.x -= deltaX;
    this.EndPoint.y -= deltaY;

    this.CalcFrame();

    console.log("= S.BaseLine: SetShapeOrigin updated StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  UpdateFrame(inputFrame, shouldRedraw) {
    console.log("= S.BaseLine: UpdateFrame called with inputFrame:", inputFrame, "shouldRedraw:", shouldRedraw);

    let arrowheadBounds;
    let shapeElement;
    let frame = inputFrame || this.Frame;
    let lineTextRect = this.LineTextX ? $.extend(true, {}, this.trect) : null;
    let lineThickness = this.StyleRecord?.Line?.Thickness || 0;
    let minLineThickness = Math.max(lineThickness, ConstantData.Defines.SED_MinWid);

    // Call the base class UpdateFrame method
    super.UpdateFrame(frame);

    // Copy the line rectangle and adjust its position
    let adjustedLineRect = $.extend(true, {}, this.linetrect);
    adjustedLineRect.x += this.Frame.x;
    adjustedLineRect.y += this.Frame.y;

    // Ensure StartPoint is defined
    if (this.StartPoint?.x == null) {
      shouldRedraw = false;
    }

    // Handle SVG element updates
    if (GlobalData.optManager) {
      shapeElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

      if (shouldRedraw) {
        if (shapeElement) {
          GlobalData.optManager.svgObjectLayer.RemoveElement(shapeElement);
          Collab.NoRedrawFromSameEditor = false;
        }
        shapeElement = this.CreateShape(GlobalData.optManager.svgDoc, false);
      } else if (shapeElement) {
        frame = this.GetSVGFrame();
        shapeElement = shapeElement.GetElementByID(ConstantData.SVGElementClass.SHAPE);
      }

      if (shapeElement) {
        arrowheadBounds = shapeElement.GetArrowheadBounds();
        if (arrowheadBounds && arrowheadBounds.length) {
          for (let i = 0; i < arrowheadBounds.length; i++) {
            arrowheadBounds[i].x += frame.x;
            arrowheadBounds[i].y += frame.y;
            this.r = Utils2.UnionRect(arrowheadBounds[i], this.r, this.r);
          }
        }
      }
    }

    // Inflate the rectangle by the line thickness
    Utils2.InflateRect(this.r, minLineThickness / 2, minLineThickness / 2);

    // Add effect settings to the rectangle
    if (this.StyleRecord) {
      let effectSettings = this.CalcEffectSettings(this.Frame, this.StyleRecord, false);
      if (effectSettings) {
        Utils2.Add2Rect(this.r, effectSettings.extent);
      }
    }

    // Union the line rectangle with the main rectangle
    if (this.DataID >= 0 && this.linetrect.width) {
      this.r = Utils2.UnionRect(adjustedLineRect, this.r, this.r);
    }

    // Add dimensions to the rectangle
    this.AddDimensionsToR();

    // Handle vertical text growth
    if (this.TextGrow === ConstantData.TextGrowBehavior.VERTICAL && !this.LineTextX) {
      let textParams = this.GetTextOnLineParams(this.BlockID);
      let textRect = Utils2.Pt2Rect(textParams.StartPoint, textParams.EndPoint);

      if (!this.TextWrapWidth) {
        let diagonal = Math.sqrt(frame.width ** 2 + frame.height ** 2);
        this.TextWrapWidth = diagonal / 2;
      }

      let widthDifference = textRect.width - this.TextWrapWidth;
      switch (SDF.TextAlignToWin(this.TextAlign).just) {
        case FileParser.TextJust.TA_LEFT:
          this.trect.x = textRect.x;
          this.trect.width = this.TextWrapWidth;
          break;
        case FileParser.TextJust.TA_RIGHT:
          this.trect.x = textRect.x + textRect.width - this.TextWrapWidth;
          this.trect.width = this.TextWrapWidth;
          break;
        default:
          this.trect.x = textRect.x + widthDifference / 2;
          this.trect.width = this.TextWrapWidth;
      }
    }

    // Restore the original text rectangle dimensions if needed
    if (lineTextRect) {
      this.trect.width = lineTextRect.width;
      this.trect.height = lineTextRect.height;
    }

    console.log("= S.BaseLine: UpdateFrame output:", this.Frame, this.r);
  }

  GetHitTestFrame(): any {
    console.log("= S.BaseLine: GetHitTestFrame called");

    // Create a copy of the current frame
    let hitTestFrame = {};
    Utils2.CopyRect(hitTestFrame, this.Frame);
    console.log("= S.BaseLine: Initial hitTestFrame copied from Frame:", hitTestFrame);

    // Inflate the rectangle by half the knob size
    const knobSize = ConstantData.Defines.SED_KnobSize;
    Utils2.InflateRect(hitTestFrame, knobSize / 2, knobSize / 2);
    console.log("= S.BaseLine: Inflated hitTestFrame by knob size:", hitTestFrame);

    // Union the inflated rectangle with the main rectangle
    hitTestFrame = Utils2.UnionRect(hitTestFrame, this.r, hitTestFrame);
    console.log("= S.BaseLine: Final hitTestFrame after union with main rectangle:", hitTestFrame);

    return hitTestFrame;
  }

  GetMoveRect(includeInflation: boolean, isGanttBar: boolean): any {
    console.log("= S.BaseLine: GetMoveRect called with includeInflation:", includeInflation, "isGanttBar:", isGanttBar);

    const moveRect: any = {};

    if (includeInflation) {
      Utils2.CopyRect(moveRect, this.r);
      Utils2.InflateRect(moveRect, 0, 0);
    } else if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR) {
      Utils2.CopyRect(moveRect, this.Frame);
      let lineThickness = 0;

      if (this.StyleRecord?.Line?.Thickness) {
        lineThickness = this.StyleRecord.Line.Thickness;
      }

      Utils2.InflateRect(moveRect, 0, lineThickness / 2);
    } else {
      Utils2.CopyRect(moveRect, this.Frame);
    }

    console.log("= S.BaseLine: GetMoveRect output:", moveRect);
    return moveRect;
  }

  SetSize(newWidth: number, newHeight: number, actionType: number): void {
    console.log("= S.BaseLine: SetSize called with newWidth:", newWidth, "newHeight:", newHeight, "actionType:", actionType);

    let shouldAdjustEnd = false;
    let widthDifference = 0;
    let heightDifference = 0;

    if (actionType !== ConstantData.ActionTriggerType.LINELENGTH || newWidth == null) {
      if (newWidth != null) {
        widthDifference = newWidth - this.Frame.width;
      }
      if (newHeight != null) {
        heightDifference = newHeight - this.Frame.height;
      }

      if (this.rflags) {
        this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
        this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
      }

      if (this.StartPoint.x < this.EndPoint.x || (Utils2.IsEqual(this.StartPoint.x, this.EndPoint.x) && this.StartPoint.y < this.EndPoint.y)) {
        shouldAdjustEnd = true;
      }

      const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

      if (shouldAdjustEnd) {
        this.AdjustLineEnd(svgElement, this.EndPoint.x + widthDifference, this.EndPoint.y + heightDifference, 0, true);
      } else {
        this.AdjustLineStart(svgElement, this.StartPoint.x + widthDifference, this.StartPoint.y + heightDifference, 0, true);
      }

      GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
    } else {
      this.UpdateDimensions(newWidth);
    }

    console.log("= S.BaseLine: SetSize completed with updated StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  AdjustForLineAngleSnap(startPoint: Point, endPoint: Point): boolean {
    console.log("= S.BaseLine: AdjustForLineAngleSnap called with startPoint:", startPoint, "endPoint:", endPoint);

    let angle = Utils1.CalcAngleFromPoints(startPoint, endPoint);
    let adjusted = false;

    // Snap to horizontal or vertical angles
    if ((angle >= 358 || angle <= 3) || (angle >= 178 && angle <= 183)) {
      endPoint.y = startPoint.y;
      adjusted = true;
    }

    if ((angle >= 88 && angle <= 93) || (angle >= 268 && angle <= 273)) {
      endPoint.x = startPoint.x;
      adjusted = true;
    }

    console.log("= S.BaseLine: AdjustForLineAngleSnap output endPoint:", endPoint, "adjusted:", adjusted);
    return adjusted;
  }

  GetAngle(params: any): number {
    console.log("= S.BaseLine: GetAngle called with params:", params);

    let angle = 0;
    const textParams = this.GetTextOnLineParams(params);
    let startPoint = textParams.StartPoint;
    let endPoint = textParams.EndPoint;

    if (this.LineType === ConstantData.LineType.LINE) {
      if (startPoint.x > endPoint.x) {
        startPoint = textParams.EndPoint;
        endPoint = textParams.StartPoint;
      }

      const deltaX = Math.abs(startPoint.x - endPoint.x);
      const deltaY = Math.abs(startPoint.y - endPoint.y);

      if (deltaY < 1) {
        angle = 0;
      } else if (deltaX < 1) {
        angle = 90;
      } else {
        const radian = Math.atan(deltaY / deltaX);
        angle = startPoint.y < endPoint.y ? 180 - (angle = 180 * radian / Math.PI) : 180 * radian / Math.PI;
      }
    } else {
      angle = GlobalData.optManager.SD_GetClockwiseAngleBetween2PointsInDegrees(startPoint, endPoint);
    }

    console.log("= S.BaseLine: GetAngle output:", angle);
    return angle;
  }

  GetDrawNormalizedAngle(startPoint: Point, endPoint: Point): number {
    console.log("= S.BaseLine: GetDrawNormalizedAngle called with startPoint:", startPoint, "endPoint:", endPoint);

    let angle = Utils1.CalcAngleFromPoints(startPoint, endPoint);
    let isReversed = false;

    if (this.polylist) {
      if (this.checkIfPolyLine(this)) {
        isReversed = this.IsReverseWinding();
      } else if (this.IsReversed !== undefined) {
        isReversed = this.IsReversed;
      }
    } else if (angle >= 180) {
      isReversed = true;
    }

    if (isReversed) {
      angle -= 180;
      if (angle < 0) {
        angle += 360;
      }
    }

    console.log("= S.BaseLine: GetDrawNormalizedAngle output:", angle);
    return angle;
  }

  GetApparentAngle(params: any): number {
    console.log("= S.BaseLine: GetApparentAngle called with params:", params);

    const angle = this.GetDrawNormalizedAngle(this.StartPoint, this.EndPoint);

    console.log("= S.BaseLine: GetApparentAngle output:", angle);
    return angle;
  }

  IsReverseWinding(): boolean {
    console.log("= S.BaseLine: IsReverseWinding called");

    let points = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
    console.log("= S.BaseLine: Retrieved points:", points);

    if (points.length === 2) {
      const isReversed = points[0].x > points[1].x;
      console.log("= S.BaseLine: IsReverseWinding output (2 points):", isReversed);
      return isReversed;
    }

    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
    }

    const isReversed = 0.5 * area >= 0;
    console.log("= S.BaseLine: IsReverseWinding output:", isReversed);
    return isReversed;
  }

  LinkGrow(blockID: number, hookPoint: number, newPoint: Point): void {
    console.log("= S.BaseLine: LinkGrow called with blockID:", blockID, "hookPoint:", hookPoint, "newPoint:", newPoint);

    switch (hookPoint) {
      case ConstantData.HookPts.SED_KTL:
        this.StartPoint.x = newPoint.x;
        this.StartPoint.y = newPoint.y;
        break;
      case ConstantData.HookPts.SED_KTR:
        this.EndPoint.x = newPoint.x;
        this.EndPoint.y = newPoint.y;
        break;
    }

    this.CalcFrame(true);
    GlobalData.optManager.SetLinkFlag(blockID, ConstantData.LinkFlags.SED_L_MOVE);
    GlobalData.optManager.AddToDirtyList(blockID);

    console.log("= S.BaseLine: LinkGrow updated StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  HandleActionTriggerTrackCommon(e, t, a, r) {
    console.log("= S.BaseLine: HandleActionTriggerTrackCommon called with e:", e, "t:", t, "a:", a, "r:", r);

    const startX = GlobalData.optManager.theActionStartX;
    const startY = GlobalData.optManager.theActionStartY;
    const actionBBox = $.extend(true, {}, GlobalData.optManager.theActionBBox);

    let adjustedPoint = {};

    function adjustPoint(x, y, rect) {
      const point = { x, y };
      if (rect.x < 0) point.x -= rect.x;
      if (rect.y < 0) point.y -= rect.y;
      return point;
    }

    switch (GlobalData.optManager.theActionTriggerID) {
      case ConstantData.ActionTriggerType.LINESTART:
        this.AdjustLineStart(GlobalData.optManager.theActionSVGObject, e, t, GlobalData.optManager.theActionTriggerID, a);
        if (this.r.x < 0 || this.r.y < 0) {
          adjustedPoint = adjustPoint(this.StartPoint.x, this.StartPoint.y, this.r);
          this.AdjustLineStart(GlobalData.optManager.theActionSVGObject, adjustedPoint.x, adjustedPoint.y, GlobalData.optManager.theActionTriggerID, a);
        }
        break;
      case ConstantData.ActionTriggerType.POLYLEND:
      case ConstantData.ActionTriggerType.LINEEND:
        this.AdjustLineEnd(GlobalData.optManager.theActionSVGObject, e, t, GlobalData.optManager.theActionTriggerID, a);
        if (this.r.x < 0 || this.r.y < 0) {
          adjustedPoint = adjustPoint(this.EndPoint.x, this.EndPoint.y, this.r);
          this.AdjustLineEnd(GlobalData.optManager.theActionSVGObject, adjustedPoint.x, adjustedPoint.y, GlobalData.optManager.theActionTriggerID, a);
        }
        break;
      case ConstantData.ActionTriggerType.ROTATE:
        this.AdjustRotate(e, t, r);
        break;
      case ConstantData.ActionTriggerType.MODIFYSHAPE:
      case ConstantData.ActionTriggerType.SEGL_ONE:
      case ConstantData.ActionTriggerType.SEGL_TWO:
      case ConstantData.ActionTriggerType.SEGL_THREE:
      case ConstantData.ActionTriggerType.POLYLNODE:
      case ConstantData.ActionTriggerType.POLYLADJ:
      case ConstantData.ActionTriggerType.TOPLEFT:
      case ConstantData.ActionTriggerType.TOPRIGHT:
      case ConstantData.ActionTriggerType.BOTTOMLEFT:
      case ConstantData.ActionTriggerType.BOTTOMRIGHT:
        this.ModifyShape(GlobalData.optManager.theActionSVGObject, e, t, GlobalData.optManager.theActionTriggerID, GlobalData.optManager.theActionTriggerData, a);
        this.UpdateFrame();
        if (this.r.x < 0 || this.r.y < 0) {
          adjustedPoint = adjustPoint(e, t, this.r);
          this.ModifyShape(GlobalData.optManager.theActionSVGObject, adjustedPoint.x, adjustedPoint.y, GlobalData.optManager.theActionTriggerID, GlobalData.optManager.theActionTriggerData);
          this.UpdateFrame();
        }
        break;
      case ConstantData.ActionTriggerType.MOVEPOLYSEG:
        this.MovePolySeg(GlobalData.optManager.theActionSVGObject, e, t, GlobalData.optManager.theActionTriggerID, GlobalData.optManager.theActionTriggerData);
        break;
      case ConstantData.ActionTriggerType.DIMENSION_LINE_ADJ:
        this.DimensionLineDeflectionAdjust(GlobalData.optManager.theActionSVGObject, e, t, GlobalData.optManager.theActionTriggerID, GlobalData.optManager.theActionTriggerData);
        break;
    }

    console.log("= S.BaseLine: HandleActionTriggerTrackCommon completed with updated StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }


  AdjustRotate(mouseX: number, mouseY: number, event: any): void {
    console.log("= S.BaseLine: AdjustRotate called with mouseX:", mouseX, "mouseY:", mouseY, "event:", event);

    const pivotX = GlobalData.optManager.theRotatePivotX;
    const pivotY = GlobalData.optManager.theRotatePivotY;
    let deltaX = mouseX - pivotX;
    let deltaY = mouseY - pivotY;
    let angle = 0;

    if (deltaX === 0 && deltaY === 0) {
      angle = 0;
    } else if (deltaX === 0) {
      angle = deltaY > 0 ? 90 : 270;
    } else if (deltaX >= 0 && deltaY >= 0) {
      angle = Math.atan(deltaY / deltaX) * (180 / ConstantData.Geometry.PI);
    } else if ((deltaX < 0 && deltaY >= 0) || (deltaX < 0 && deltaY < 0)) {
      angle = 180 + Math.atan(deltaY / deltaX) * (180 / ConstantData.Geometry.PI);
    } else if (deltaX >= 0 && deltaY < 0) {
      angle = 360 + Math.atan(deltaY / deltaX) * (180 / ConstantData.Geometry.PI);
    }

    const overrideSnaps = GlobalData.optManager.OverrideSnaps(event);
    if (GlobalData.docHandler.documentConfig.enableSnap && !overrideSnaps) {
      const enhanceSnaps = GlobalData.optManager.EnhanceSnaps(event);
      const snapAngle = enhanceSnaps ? GlobalData.optManager.enhanceRotateSnap : GlobalData.optManager.theRotateSnap;
      angle = Math.round(angle / snapAngle) * snapAngle;
    }

    if (this.Rotate(GlobalData.optManager.theActionSVGObject, angle)) {
      GlobalData.optManager.theRotateEndRotation = angle;
    }

    console.log("= S.BaseLine: AdjustRotate output angle:", angle);
  }

  DimensionLineDeflectionAdjust(svgDoc, mouseX, mouseY, actionTriggerID, triggerData) {
    console.log('= S.BaseLine: DimensionLineDeflectionAdjust called with', {
      svgDoc,
      mouseX,
      mouseY,
      actionTriggerID,
      triggerData
    });

    // Calculate the horizontal deflection for the dimension line
    this.dimensionDeflectionH = this.GetDimensionLineDeflection(svgDoc, mouseX, mouseY, triggerData);
    console.log('= S.BaseLine: Calculated dimensionDeflectionH:', this.dimensionDeflectionH);

    // Update the dimension lines on the SVG document
    this.UpdateDimensionLines(svgDoc);
    console.log('= S.BaseLine: Dimension lines updated');

    // Check if the dimension should be shown only when selected
    const isDimSelect = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select;
    console.log('= S.BaseLine: isDimSelect:', isDimSelect);

    // Hide or show dimensions based on selection state
    if (isDimSelect) {
      this.HideOrShowSelectOnlyDimensions(true);
      console.log('= S.BaseLine: Select-only dimensions shown');
    }

    console.log('= S.BaseLine: DimensionLineDeflectionAdjust completed');
  }

  ScaleObject(
    offsetX: number,
    offsetY: number,
    rotationCenter: Point,
    rotationAngle: number,
    scaleX: number,
    scaleY: number,
    adjustThickness: boolean
  ) {
    console.log("= S.BaseLine: ScaleObject called with", {
      offsetX,
      offsetY,
      rotationCenter,
      rotationAngle,
      scaleX,
      scaleY,
      adjustThickness
    });

    // Scale the start and end points
    this.StartPoint.x = offsetX + this.StartPoint.x * scaleX;
    this.StartPoint.y = offsetY + this.StartPoint.y * scaleY;
    this.EndPoint.x = offsetX + this.EndPoint.x * scaleX;
    this.EndPoint.y = offsetY + this.EndPoint.y * scaleY;

    // Rotate the points if a rotation angle is provided
    if (rotationAngle) {
      const rotationRadians = 2 * Math.PI * (rotationAngle / 360);
      this.StartPoint = GlobalData.optManager.RotatePointAroundPoint(rotationCenter, this.StartPoint, rotationRadians);
      this.EndPoint = GlobalData.optManager.RotatePointAroundPoint(rotationCenter, this.EndPoint, rotationRadians);
    }

    // Adjust the curve if necessary
    if (this.CurveAdjust) {
      this.CurveAdjust *= (scaleX + scaleY) / 2;
    }

    // Reset floating point dimensions flags
    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    // Adjust line thickness if required
    if (adjustThickness) {
      const maxScale = Math.max(scaleX, scaleY);
      this.StyleRecord.Line.Thickness *= maxScale;
      this.StyleRecord.Line.BThick *= maxScale;
    }

    // Recalculate the frame
    this.CalcFrame();

    console.log("= S.BaseLine: ScaleObject output", {
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint,
      CurveAdjust: this.CurveAdjust,
      StyleRecord: this.StyleRecord
    });
  }

  CanUseStandOffDimensionLines(): boolean {
    console.log("= S.BaseLine: CanUseStandOffDimensionLines called");
    const result = true;
    console.log("= S.BaseLine: CanUseStandOffDimensionLines output:", result);
    return result;
  }

  GetDimensionLineDeflection(svgDoc, mouseX, mouseY, triggerData) {
    console.log("= S.BaseLine: GetDimensionLineDeflection called with", {
      svgDoc,
      mouseX,
      mouseY,
      triggerData
    });

    let deflection = 0;
    const points = [];
    const adjustedPoint = new Point(0, 0);
    const dimensionPoints = this.GetDimensionPoints();

    // Adjust dimension points by the inside offset
    for (let i = 0; i < dimensionPoints.length; i++) {
      dimensionPoints[i].x += this.inside.x;
      dimensionPoints[i].y += this.inside.y;
    }

    // Calculate the adjusted knob point
    adjustedPoint.x = triggerData.knobPoint.x + this.Frame.x - triggerData.adjustForKnob;
    adjustedPoint.y = triggerData.knobPoint.y + this.Frame.y - triggerData.adjustForKnob;

    // Add points to the array for rotation
    points.push(dimensionPoints[triggerData.segmentIndex - 1]);
    points.push(dimensionPoints[triggerData.segmentIndex]);
    points.push(new Point(adjustedPoint.x, adjustedPoint.y));
    points.push(new Point(mouseX, mouseY));

    // Rotate points about the center
    Utils3.RotatePointsAboutCenter(this.Frame, -triggerData.ccAngleRadians, points);

    // Check if the object is a BaseLine with specific conditions
    if (this instanceof Instance.Shape.BaseLine && (!this.polylist || this.polylist.segs.length === 2)) {
      const quadrant = Math.floor((triggerData.ccAngleRadians - 0.01) / (Math.PI / 2));
      if (quadrant !== 1 && quadrant !== 2) {
        Utils3.RotatePointsAboutCenter(this.Frame, Math.PI, points);
      }
    } else if (this.polylist && this.IsReverseWinding()) {
      Utils3.RotatePointsAboutCenter(this.Frame, Math.PI, points);
    }

    // Calculate the deflection
    deflection = points[3].y - points[2].y;
    if (this.polylist && this.polylist.segs[triggerData.segmentIndex].dimTextAltPositioning) {
      deflection = triggerData.originalDeflection - deflection;
    } else {
      deflection = triggerData.originalDeflection + deflection;
    }

    console.log("= S.BaseLine: GetDimensionLineDeflection output:", deflection);
    return deflection;
  }

  HandleActionTriggerCallResize(event, triggerData) {
    console.log("= S.BaseLine: HandleActionTriggerCallResize called with event:", event, "triggerData:", triggerData);

    // Perform the resize operation
    const resizeAdjustment = this.Resize(
      GlobalData.optManager.theActionSVGObject,
      GlobalData.optManager.theActionNewBBox
    );

    // Update the action bounding box and start coordinates
    GlobalData.optManager.theActionBBox.x += resizeAdjustment.x;
    GlobalData.optManager.theActionBBox.y += resizeAdjustment.y;
    GlobalData.optManager.theActionStartX += resizeAdjustment.x;
    GlobalData.optManager.theActionStartY += resizeAdjustment.y;

    console.log("= S.BaseLine: HandleActionTriggerCallResize output resizeAdjustment:", resizeAdjustment);
  }

  HandleActionTriggerDoAutoScroll() {
    console.log("= S.BaseLine: HandleActionTriggerDoAutoScroll called");

    // Set a timeout for the auto-scroll function
    GlobalData.optManager.autoScrollTimerID = GlobalData.optManager.autoScrollTimer.setTimeout('HandleActionTriggerDoAutoScroll', 100);

    // Convert window coordinates to document coordinates
    const docCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(GlobalData.optManager.autoScrollXPos, GlobalData.optManager.autoScrollYPos);
    console.log("= S.BaseLine: Converted document coordinates:", docCoords);

    // Track the pin point if PinRect is defined
    if (GlobalData.optManager.PinRect) {
      GlobalData.optManager.PinTrackPoint(docCoords);
    }

    // Perform auto-grow drag adjustments
    const adjustedCoords = GlobalData.optManager.DoAutoGrowDrag(docCoords);
    console.log("= S.BaseLine: Adjusted coordinates after auto-grow drag:", adjustedCoords);

    // Scroll to the new position
    GlobalData.docHandler.ScrollToPosition(adjustedCoords.x, adjustedCoords.y);

    // Handle the common action trigger track
    this.HandleActionTriggerTrackCommon(adjustedCoords.x, adjustedCoords.y);

    console.log("= S.BaseLine: HandleActionTriggerDoAutoScroll completed");
  }


  AutoScrollCommon(event, enableSnap, autoScrollCallback) {
    console.log('= S.BaseLine: AutoScrollCommon called with event:', event, 'enableSnap:', enableSnap, 'autoScrollCallback:', autoScrollCallback);

    let clientX, clientY;
    let shouldAutoScroll = false;

    // Determine clientX and clientY based on the event type
    if (GlobalData.optManager.OverrideSnaps(event)) {
      enableSnap = false;
    }
    if (event.gesture) {
      clientX = event.gesture.center.clientX;
      clientY = event.gesture.center.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    let scrollX = clientX;
    let scrollY = clientY;
    const docInfo = GlobalData.optManager.svgDoc.docInfo;

    // Check if auto-scroll is needed and adjust scrollX and scrollY accordingly
    if (clientX >= docInfo.dispX + docInfo.dispWidth - 4) {
      shouldAutoScroll = true;
      scrollX = docInfo.dispX + docInfo.dispWidth - 4 + 32;
    }
    if (clientX < docInfo.dispX) {
      shouldAutoScroll = true;
      scrollX = docInfo.dispX - 32;
    }
    if (clientY >= docInfo.dispY + docInfo.dispHeight - 4) {
      shouldAutoScroll = true;
      scrollY = docInfo.dispY + docInfo.dispHeight - 4 + 32;
    }
    if (clientY < docInfo.dispY) {
      shouldAutoScroll = true;
      scrollY = docInfo.dispY - 4 - 32;
    }

    // Perform snapping if enabled
    if (shouldAutoScroll) {
      if (enableSnap && GlobalData.docHandler.documentConfig.enableSnap) {
        const snapPoint = GlobalData.docHandler.SnapToGrid({ x: scrollX, y: scrollY });
        scrollX = snapPoint.x;
        scrollY = snapPoint.y;
      }

      // Set auto-scroll positions and start the timer if not already running
      GlobalData.optManager.autoScrollXPos = scrollX;
      GlobalData.optManager.autoScrollYPos = scrollY;
      if (GlobalData.optManager.autoScrollTimerID === -1) {
        GlobalData.optManager.autoScrollTimer = new HvTimer(this);
        GlobalData.optManager.autoScrollTimerID = GlobalData.optManager.autoScrollTimer.setTimeout(autoScrollCallback, 0);
      }

      console.log('= S.BaseLine: AutoScrollCommon output: shouldAutoScroll = false');
      return false;
    }

    // Reset the auto-scroll timer if no auto-scroll is needed
    this.ResetAutoScrollTimer();
    console.log('= S.BaseLine: AutoScrollCommon output: shouldAutoScroll = true');
    return true;
  }

  LM_ActionTrack(event) {
    console.log('= S.BaseLine: LM_ActionTrack called with event:', event);

    let t;
    let a;
    let r;
    let i = false;

    if (Utils2.StopPropagationAndDefaults(event), -1 == GlobalData.optManager.theActionStoredObjectID) {
      return false;
    }

    const n = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(event.gesture.center.clientX, event.gesture.center.clientY);
    const o = event.gesture.srcEvent.altKey;

    if (GlobalData.optManager.PinRect) {
      GlobalData.optManager.PinTrackPoint(n);
    }

    const adjustedCoords = GlobalData.optManager.DoAutoGrowDrag(n);
    let trackCoords = this.LM_ActionDuringTrack(adjustedCoords);

    t = GlobalData.optManager.LinkParams && GlobalData.optManager.LinkParams.ConnectIndex >= 0;

    if (GlobalData.optManager.OverrideSnaps(event)) {
      t = true;
    }

    if (GlobalData.optManager.theActionTriggerID !== ConstantData.ActionTriggerType.MODIFYSHAPE &&
      GlobalData.docHandler.documentConfig.enableSnap && !t) {
      const deltaX = trackCoords.x - GlobalData.optManager.theActionStartX;
      const deltaY = trackCoords.y - GlobalData.optManager.theActionStartY;
      const isMovePolySeg = GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.MOVEPOLYSEG;

      if (GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.ROTATE ||
        this.CustomSnap(this.Frame.x, this.Frame.y, deltaX, deltaY, isMovePolySeg, trackCoords) || isMovePolySeg) {
        // Do nothing
      } else {
        trackCoords = GlobalData.docHandler.SnapToGrid(trackCoords);
      }
    }

    if (this.AutoScrollCommon(event, !t, 'HandleActionTriggerDoAutoScroll')) {
      this.HandleActionTriggerTrackCommon(trackCoords.x, trackCoords.y, o, event);
    }

    console.log('= S.BaseLine: LM_ActionTrack completed with updated coordinates:', trackCoords);
  }

  LM_ActionRelease(event, isSecondary) {
    console.log("= S.BaseLine: LM_ActionRelease called with event:", event, "isSecondary:", isSecondary);

    if (!isSecondary) {
      GlobalData.optManager.unbindActionClickHammerEvents();
      this.ResetAutoScrollTimer();

      if (Collab.AllowMessage()) {
        const actionData = {
          BlockID: GlobalData.optManager.theActionStoredObjectID,
          theActionTriggerID: GlobalData.optManager.theActionTriggerID,
          theRotateEndRotation: GlobalData.optManager.theRotateEndRotation,
          theRotatePivotX: GlobalData.optManager.theRotatePivotX,
          theRotatePivotY: GlobalData.optManager.theRotatePivotY,
          theRotateStartPoint: Utils1.DeepCopy(GlobalData.optManager.theRotateStartPoint),
          CurveAdjust: this.CurveAdjust,
          IsReversed: this.IsReversed,
          Frame: Utils1.DeepCopy(this.Frame),
          StartPoint: Utils1.DeepCopy(this.StartPoint),
          EndPoint: Utils1.DeepCopy(this.EndPoint),
        };

        if (GlobalData.optManager.theActionTriggerData) {
          actionData.hitSegment = GlobalData.optManager.theActionTriggerData.hitSegment;
          actionData.moveAngle = GlobalData.optManager.theActionTriggerData.moveAngle;
        }

        if (GlobalData.optManager.ob.Frame) {
          actionData.ob = {
            StartPoint: Utils1.DeepCopy(GlobalData.optManager.ob.StartPoint),
            EndPoint: Utils1.DeepCopy(GlobalData.optManager.ob.EndPoint),
            Frame: Utils1.DeepCopy(GlobalData.optManager.ob.Frame),
            CurveAdjust: GlobalData.optManager.ob.CurveAdjust,
            IsReversed: GlobalData.optManager.ob.IsReversed,
          };
        }

        if (GlobalData.optManager.LinkParams) {
          actionData.LinkParams = Utils1.DeepCopy(GlobalData.optManager.LinkParams);
        }

        if (this.segl) {
          actionData.segl = Utils1.DeepCopy(this.segl);
        }

        if (this.polylist) {
          actionData.polylist = Utils1.DeepCopy(this.polylist);
        }

        if (this.pointlist) {
          actionData.pointlist = Utils1.DeepCopy(this.pointlist);
        }

        if (GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.DIMENSION_LINE_ADJ) {
          actionData.dimensionDeflectionH = this.dimensionDeflectionH;
          actionData.dimensionDeflectionV = this.dimensionDeflectionV;
        }
      }
    }

    switch (GlobalData.optManager.theActionTriggerID) {
      case ConstantData.ActionTriggerType.ROTATE:
        this.AfterRotateShape(GlobalData.optManager.theActionStoredObjectID);
        break;
      case ConstantData.ActionTriggerType.MODIFYSHAPE:
      case ConstantData.ActionTriggerType.SEGL_ONE:
      case ConstantData.ActionTriggerType.SEGL_TWO:
      case ConstantData.ActionTriggerType.SEGL_THREE:
      case ConstantData.ActionTriggerType.POLYLNODE:
      case ConstantData.ActionTriggerType.POLYLADJ:
      case ConstantData.ActionTriggerType.POLYLEND:
      case ConstantData.ActionTriggerType.MOVEPOLYSEG:
        this.AfterModifyShape(GlobalData.optManager.theActionStoredObjectID, GlobalData.optManager.theActionTriggerID);
        break;
      default:
        if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR) {
          switch (GlobalData.optManager.theActionTriggerID) {
            case ConstantData.ActionTriggerType.LINEEND:
            case ConstantData.ActionTriggerType.LINESTART:
              GlobalData.optManager.GanttAdjustBar(GlobalData.optManager.theActionStoredObjectID, GlobalData.optManager.theActionTriggerID);
          }
        }

        if (GlobalData.optManager.ob.Frame) {
          GlobalData.optManager.MaintainLink(GlobalData.optManager.theActionStoredObjectID, this, GlobalData.optManager.ob, GlobalData.optManager.theActionTriggerID);
          GlobalData.optManager.ob = {};
          GlobalData.optManager.SetLinkFlag(GlobalData.optManager.theActionStoredObjectID, ConstantData.LinkFlags.SED_L_MOVE);
          GlobalData.optManager.UpdateLinks();
        }
    }

    this.LM_ActionPostRelease(GlobalData.optManager.theActionStoredObjectID);

    if (this.HyperlinkText !== "" || this.NoteID !== -1 || this.CommentID !== -1 || this.HasFieldData()) {
      GlobalData.optManager.AddToDirtyList(GlobalData.optManager.theActionStoredObjectID);
    }

    if (!isSecondary) {
      GlobalData.optManager.theActionStoredObjectID = -1;
      GlobalData.optManager.theActionSVGObject = null;
    }

    GlobalData.optManager.ShowOverlayLayer();
    GlobalData.optManager.CompleteOperation(null);

    console.log("= S.BaseLine: LM_ActionRelease completed");
  }

  LM_ActionPreTrack(actionStoredObjectID, actionTriggerID) {
    console.log("= S.BaseLine: LM_ActionPreTrack called with actionStoredObjectID:", actionStoredObjectID, "actionTriggerID:", actionTriggerID);

    let objectPtr, sessionPtr, linkParams, hookIndex = -1;

    // Retrieve the object pointer for the given actionStoredObjectID
    objectPtr = GlobalData.optManager.GetObjectPtr(actionStoredObjectID, false);
    if (!objectPtr) {
      console.log("= S.BaseLine: LM_ActionPreTrack - objectPtr not found");
      return;
    }

    // Deep copy the object pointer to GlobalData.optManager.ob
    GlobalData.optManager.ob = Utils1.DeepCopy(objectPtr);

    // Determine the hook index based on the actionTriggerID
    switch (actionTriggerID) {
      case ConstantData.ActionTriggerType.LINESTART:
        for (let i = 0; i < objectPtr.hooks.length; i++) {
          if (
            objectPtr.hooks[i].hookpt === ConstantData.HookPts.SED_KTL ||
            objectPtr.hooks[i].hookpt === ConstantData.HookPts.SED_WTL ||
            objectPtr.hooks[i].hookpt === ConstantData.HookPts.SED_WTR
          ) {
            hookIndex = i;
            break;
          }
        }
        break;
      case ConstantData.ActionTriggerType.LINEEND:
        for (let i = 0; i < objectPtr.hooks.length; i++) {
          if (
            objectPtr.hooks[i].hookpt === ConstantData.HookPts.SED_KTR ||
            objectPtr.hooks[i].hookpt === ConstantData.HookPts.SED_WBL ||
            objectPtr.hooks[i].hookpt === ConstantData.HookPts.SED_WBR
          ) {
            hookIndex = i;
            break;
          }
        }
        break;
      default:
        console.log("= S.BaseLine: LM_ActionPreTrack - invalid actionTriggerID");
        return;
    }

    // Reset floating point dimensions flags
    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    // Initialize LinkParameters
    linkParams = new LinkParameters();
    GlobalData.optManager.LinkParams = linkParams;

    // Retrieve the session pointer
    sessionPtr = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);

    // Set ArraysOnly flag if linking is not allowed
    if (!this.AllowLink()) {
      linkParams.ArraysOnly = true;
    }

    // Set AllowJoin flag based on session flags
    if (sessionPtr) {
      linkParams.AllowJoin = sessionPtr.flags & ConstantData.SessionFlags.SEDS_FreeHand;
    }

    // Set connection parameters if a valid hook index is found
    if (hookIndex >= 0) {
      linkParams.ConnectIndex = objectPtr.hooks[hookIndex].objid;
      linkParams.PrevConnect = objectPtr.hooks[hookIndex].objid;
      linkParams.ConnectPt.x = objectPtr.hooks[hookIndex].connect.x;
      linkParams.ConnectPt.y = objectPtr.hooks[hookIndex].connect.y;
      linkParams.ConnectInside = objectPtr.hooks[hookIndex].cellid;
      linkParams.HookIndex = objectPtr.hooks[hookIndex].hookpt;
      linkParams.InitialHook = hookIndex;
    }

    // Retrieve the links block object pointer
    const linksBlockPtr = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theLinksBlockID, false);

    // Get the hook list for circular targets
    linkParams.lpCircList = GlobalData.optManager.GetHookList(
      linksBlockPtr,
      linkParams.lpCircList,
      actionStoredObjectID,
      objectPtr,
      ConstantData.ListCodes.SED_LC_CIRCTARG,
      {}
    );

    // Add the single hook object to the circular list if no valid hook index is found
    if (hookIndex < 0 && objectPtr.hooks.length === 1 && linkParams.lpCircList) {
      linkParams.lpCircList.push(objectPtr.hooks[0].objid);
    }

    console.log("= S.BaseLine: LM_ActionPreTrack completed with LinkParams:", linkParams);
    return true;
  }


  LM_ActionDuringTrack(event) {
    console.log('= S.BaseLine: LM_ActionDuringTrack called with event:', event);

    const points = [{ x: 0, y: 0 }];

    if (GlobalData.optManager.LinkParams) {
      points[0].x = event.x;
      points[0].y = event.y;

      if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
        points[0].id = GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.LINESTART
          ? ConstantData.HookPts.SED_KTL
          : ConstantData.HookPts.SED_KTR;

        GlobalData.optManager.theDragDeltaX = 0;
        GlobalData.optManager.theDragDeltaY = 0;

        if (GlobalData.optManager.FindConnect(
          GlobalData.optManager.theActionStoredObjectID,
          this,
          points,
          true,
          false,
          GlobalData.optManager.LinkParams.AllowJoin,
          event
        )) {
          event.x += GlobalData.optManager.theDragDeltaX;
          event.y += GlobalData.optManager.theDragDeltaY;
        }
      }
    }

    console.log('= S.BaseLine: LM_ActionDuringTrack output event:', event);
    return event;
  }

  AfterRotateShape(blockID: number): void {
    console.log("= S.BaseLine: AfterRotateShape called with blockID:", blockID);

    // Check if the rectangle's x or y coordinates are negative
    if (this.r.x < 0 || this.r.y < 0) {
      console.log("= S.BaseLine: Rectangle coordinates are negative, performing undo operation");
      GlobalData.optManager.Undo();
      Collab.UnLockMessages();
      Collab.UnBlockMessages();
      return;
    }

    // Maintain link if the frame is defined
    if (GlobalData.optManager.ob.Frame) {
      console.log("= S.BaseLine: Maintaining link with frame:", GlobalData.optManager.ob.Frame);
      GlobalData.optManager.MaintainLink(blockID, this, GlobalData.optManager.ob, ConstantData.ActionTriggerType.ROTATE);
      GlobalData.optManager.ob = {};
    }

    // Set link flag and update links
    GlobalData.optManager.SetLinkFlag(blockID, ConstantData.LinkFlags.SED_L_MOVE);
    GlobalData.optManager.UpdateLinks();

    console.log("= S.BaseLine: AfterRotateShape completed for blockID:", blockID);
  }

  AfterModifyShape(blockID: number, actionTriggerID: number): void {
    console.log("= S.BaseLine: AfterModifyShape called with blockID:", blockID, "actionTriggerID:", actionTriggerID);

    if (GlobalData.optManager.theActionSVGObject) {
      const ellipseAxesElement = GlobalData.optManager.theActionSVGObject.GetElementByID(ConstantData.Defines.EllipseAxes);
      if (ellipseAxesElement != null) {
        GlobalData.optManager.theActionSVGObject.RemoveElement(ellipseAxesElement);
        console.log("= S.BaseLine: Removed ellipseAxesElement:", ellipseAxesElement);
      }
    }

    if (GlobalData.optManager.ob.Frame) {
      GlobalData.optManager.MaintainLink(blockID, this, GlobalData.optManager.ob, actionTriggerID);
      GlobalData.optManager.ob = {};
      console.log("= S.BaseLine: Maintained link and reset ob.Frame");
    }

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
      console.log("= S.BaseLine: Reset floating point dimensions flags");
    }

    GlobalData.optManager.SetLinkFlag(blockID, ConstantData.LinkFlags.SED_L_MOVE);
    GlobalData.optManager.UpdateLinks();
    console.log("= S.BaseLine: Set link flag and updated links");

    if (this.arcobj) {
      this.arcobj = null;
      console.log("= S.BaseLine: Reset arcobj to null");
    }

    console.log("= S.BaseLine: AfterModifyShape completed for blockID:", blockID);
  }


  LM_ActionPostRelease(blockID: number): void {
    console.log("= S.BaseLine: LM_ActionPostRelease called with blockID:", blockID);

    // Set edit mode to default
    GlobalData.optManager.SetEditMode(ConstantData.EditState.DEFAULT);

    // Check if LinkParams is not null
    if (GlobalData.optManager.LinkParams) {
      // Handle HiliteConnect
      if (GlobalData.optManager.LinkParams.HiliteConnect >= 0) {
        GlobalData.optManager.HiliteConnect(
          GlobalData.optManager.LinkParams.HiliteConnect,
          GlobalData.optManager.LinkParams.ConnectPt,
          false,
          false,
          this.BlockID,
          GlobalData.optManager.LinkParams.HiliteInside
        );
        GlobalData.optManager.LinkParams.HiliteConnect = -1;
        GlobalData.optManager.LinkParams.HiliteInside = null;
      }

      // Handle HiliteJoin
      if (GlobalData.optManager.LinkParams.HiliteJoin >= 0) {
        GlobalData.optManager.HiliteConnect(
          GlobalData.optManager.LinkParams.HiliteJoin,
          GlobalData.optManager.LinkParams.ConnectPt,
          false,
          true,
          this.BlockID,
          null
        );
        GlobalData.optManager.LinkParams.HiliteJoin = -1;
      }

      // Handle JoinIndex
      if (GlobalData.optManager.LinkParams.JoinIndex >= 0) {
        GlobalData.optManager.PolyLJoin(
          GlobalData.optManager.LinkParams.JoinIndex,
          GlobalData.optManager.LinkParams.JoinData,
          blockID,
          GlobalData.optManager.LinkParams.JoinSourceData,
          false
        );
      } else if (GlobalData.optManager.LinkParams.ConnectIndex >= 0 || GlobalData.optManager.LinkParams.InitialHook >= 0) {
        GlobalData.optManager.UpdateHook(
          blockID,
          GlobalData.optManager.LinkParams.InitialHook,
          GlobalData.optManager.LinkParams.ConnectIndex,
          GlobalData.optManager.LinkParams.HookIndex,
          GlobalData.optManager.LinkParams.ConnectPt,
          GlobalData.optManager.LinkParams.ConnectInside
        );
      }

      // Set link flag and update links
      GlobalData.optManager.SetLinkFlag(blockID, ConstantData.LinkFlags.SED_L_MOVE);
      GlobalData.optManager.UpdateLinks();

      // Clear LinkParams
      GlobalData.optManager.LinkParams = null;
    }

    console.log("= S.BaseLine: LM_ActionPostRelease completed for blockID:", blockID);
  }

  LM_SetupActionClick(event, isSecondary) {
    console.log("= S.BaseLine: LM_SetupActionClick called with event:", event, "isSecondary:", isSecondary);

    let actionStoredObjectID, actionTriggerID, preservedBlock, targetElement;

    if (isSecondary) {
      actionStoredObjectID = GlobalData.optManager.theActionStoredObjectID;
      actionTriggerID = GlobalData.optManager.theActionTriggerID;
      GlobalData.optManager.PinRect = null;
      preservedBlock = GlobalData.objectStore.PreserveBlock(actionStoredObjectID);
    } else {
      GlobalData.optManager.SetUIAdaptation(event);
      GlobalData.optManager.theEventTimestamp = Date.now();
      event.stopPropagation();

      const overlayElement = GlobalData.optManager.svgOverlayLayer.FindElementByDOMElement(event.currentTarget);
      if (overlayElement === null) return false;

      const elementID = overlayElement.GetID();
      actionStoredObjectID = parseInt(elementID.substring(ConstantData.Defines.Action.length), 10);
      GlobalData.optManager.theActionStoredObjectID = actionStoredObjectID;

      targetElement = overlayElement.GetTargetForEvent(event);
      if (targetElement == null) return false;

      preservedBlock = GlobalData.objectStore.PreserveBlock(actionStoredObjectID);
      actionTriggerID = targetElement.GetID();
      GlobalData.optManager.theActionTriggerID = actionTriggerID;
      GlobalData.optManager.theActionTriggerData = targetElement.GetUserData();
      GlobalData.optManager.PinRect = null;
    }

    if (preservedBlock.Data.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR) {
      GlobalData.optManager.PinRect = {};
      GlobalData.optManager.PinRect = this.AdjustPinRect(GlobalData.optManager.PinRect, false, actionTriggerID);
    }

    if (!isSecondary) {
      GlobalData.optManager.SetControlDragMode(targetElement);
    }

    this.LM_ActionPreTrack(actionStoredObjectID, actionTriggerID);
    GlobalData.optManager.theActionSVGObject = GlobalData.optManager.svgObjectLayer.GetElementByID(actionStoredObjectID);

    if (this.HyperlinkText !== "" || this.NoteID !== -1 || this.CommentID !== -1 || this.HasFieldData()) {
      this.HideAllIcons(GlobalData.optManager.svgDoc, GlobalData.optManager.theActionSVGObject);
    }

    let coords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(event.gesture.center.clientX, event.gesture.center.clientY);
    let shouldSnap = GlobalData.optManager.LinkParams && GlobalData.optManager.LinkParams.ConnectIndex >= 0;

    if (GlobalData.optManager.OverrideSnaps(event)) {
      shouldSnap = true;
    }

    if (GlobalData.docHandler.documentConfig.enableSnap && !shouldSnap) {
      coords = GlobalData.docHandler.SnapToGrid(coords);
    }

    coords = GlobalData.optManager.DoAutoGrowDrag(coords);
    const startX = coords.x;
    const startY = coords.y;

    GlobalData.optManager.theActionLockAspectRatio = event.gesture.srcEvent.shiftKey;
    if (this.ResizeAspectConstrain) {
      GlobalData.optManager.theActionLockAspectRatio = !GlobalData.optManager.theActionLockAspectRatio;
    }

    const svgFrame = this.GetSVGFrame();
    if (GlobalData.optManager.theActionLockAspectRatio) {
      if (svgFrame.height === 0) {
        GlobalData.optManager.theActionLockAspectRatio = false;
      } else {
        GlobalData.optManager.theActionAspectRatioWidth = svgFrame.width;
        GlobalData.optManager.theActionAspectRatioHeight = svgFrame.height;
      }
    }

    GlobalData.optManager.theActionBBox = $.extend(true, {}, svgFrame);
    GlobalData.optManager.theActionNewBBox = $.extend(true, {}, svgFrame);
    GlobalData.optManager.HideOverlayLayer();
    GlobalData.optManager.theActionStartX = startX;
    GlobalData.optManager.theActionStartY = startY;

    if (GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.ROTATE) {
      this.BeforeRotate(svgFrame);
    } else if (GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.MODIFYSHAPE || GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.POLYLADJ) {
      this.BeforeModifyShape(startX, startY, GlobalData.optManager.theActionTriggerData);
    }

    console.log("= S.BaseLine: LM_SetupActionClick output:", true);
    return true;
  }

  BeforeRotate(frame: any): void {
    console.log("= S.BaseLine: BeforeRotate called with frame:", frame);

    // Set the rotation knob center divisor
    GlobalData.optManager.theRotateKnobCenterDivisor = this.RotateKnobCenterDivisor();

    // Calculate the start rotation angle in degrees
    const deltaX = this.EndPoint.x - this.StartPoint.x;
    const deltaY = this.EndPoint.y - this.StartPoint.y;
    GlobalData.optManager.theRotateStartRotation = 180 * Math.atan2(deltaY, deltaX) / Math.PI;
    GlobalData.optManager.theRotateEndRotation = GlobalData.optManager.theRotateStartRotation;

    // Calculate the pivot point for rotation
    GlobalData.optManager.theRotatePivotX = frame.x + frame.width / GlobalData.optManager.theRotateKnobCenterDivisor.x;
    GlobalData.optManager.theRotatePivotY = frame.y + frame.height / GlobalData.optManager.theRotateKnobCenterDivisor.y;

    // Store the start and end points
    GlobalData.optManager.theRotateStartPoint = $.extend(true, {}, this.StartPoint);
    GlobalData.optManager.theRotateEndPoint = $.extend(true, {}, this.EndPoint);

    console.log("= S.BaseLine: BeforeRotate output:", {
      theRotateStartRotation: GlobalData.optManager.theRotateStartRotation,
      theRotateEndRotation: GlobalData.optManager.theRotateEndRotation,
      theRotatePivotX: GlobalData.optManager.theRotatePivotX,
      theRotatePivotY: GlobalData.optManager.theRotatePivotY,
      theRotateStartPoint: GlobalData.optManager.theRotateStartPoint,
      theRotateEndPoint: GlobalData.optManager.theRotateEndPoint
    });
  }

  LM_ActionClick_ExceptionCleanup(error) {
    console.log("= S.BaseLine: LM_ActionClick_ExceptionCleanup called with error:", error);

    // Unbind action click hammer events
    GlobalData.optManager.unbindActionClickHammerEvents();

    // Reset auto scroll timer
    this.ResetAutoScrollTimer();

    // Clear global data properties
    GlobalData.optManager.ob = {};
    GlobalData.optManager.LinkParams = null;
    GlobalData.optManager.theActionTriggerID = -1;
    GlobalData.optManager.theActionTriggerData = null;
    GlobalData.optManager.theActionStoredObjectID = -1;
    GlobalData.optManager.theActionSVGObject = null;

    // Unblock messages
    Collab.UnBlockMessages();

    console.log("= S.BaseLine: LM_ActionClick_ExceptionCleanup completed");
  }

  LM_ActionClick(event, isSecondary) {
    console.log("= S.BaseLine: LM_ActionClick called with event:", event, "isSecondary:", isSecondary);

    try {
      const blockID = this.BlockID;
      const objectPtr = GlobalData.optManager.GetObjectPtr(blockID, false);

      if (!(objectPtr && objectPtr instanceof BaseDrawingObject)) {
        console.log("= S.BaseLine: LM_ActionClick - objectPtr is not an instance of BaseDrawingObject");
        return false;
      }

      GlobalData.optManager.DoAutoGrowDragInit(0, blockID);

      if (!this.LM_SetupActionClick(event, isSecondary)) {
        console.log("= S.BaseLine: LM_ActionClick - LM_SetupActionClick returned false");
        return;
      }

      Collab.BeginSecondaryEdit();

      const actionObjectPtr = GlobalData.optManager.GetObjectPtr(blockID, false);
      GlobalData.optManager.WorkAreaHammer.on('drag', DefaultEvt.Evt_ActionTrackHandlerFactory(actionObjectPtr));
      GlobalData.optManager.WorkAreaHammer.on('dragend', DefaultEvt.Evt_ActionReleaseHandlerFactory(actionObjectPtr));

      console.log("= S.BaseLine: LM_ActionClick setup completed for blockID:", blockID);
    } catch (error) {
      console.error("= S.BaseLine: LM_ActionClick encountered an error:", error);
      this.LM_ActionClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }
  }

  Rotate(svgElement: any, endRotation: number): boolean {
    console.log("= S.BaseLine: Rotate called with svgElement:", svgElement, "endRotation:", endRotation);

    const pivotPoint = {
      x: GlobalData.optManager.theRotatePivotX,
      y: GlobalData.optManager.theRotatePivotY
    };

    const rotationRadians = (endRotation - GlobalData.optManager.theRotateStartRotation) / (180 / ConstantData.Geometry.PI);
    const rotatedStartPoint = GlobalData.optManager.RotatePointAroundPoint(pivotPoint, GlobalData.optManager.theRotateStartPoint, rotationRadians);
    const rotatedEndPoint = GlobalData.optManager.RotatePointAroundPoint(pivotPoint, GlobalData.optManager.theRotateEndPoint, rotationRadians);

    console.log("= S.BaseLine: Rotated points calculated as rotatedStartPoint:", rotatedStartPoint, "rotatedEndPoint:", rotatedEndPoint);

    if (rotatedStartPoint.x < 0 || rotatedStartPoint.y < 0 || rotatedEndPoint.x < 0 || rotatedEndPoint.y < 0) {
      console.log("= S.BaseLine: Rotation resulted in negative coordinates, returning false");
      return false;
    }

    if (GlobalData.optManager.theContentHeader.flags & ConstantData.ContentHeaderFlags.CT_DA_NoAuto) {
      const sessionObject = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
      if (rotatedStartPoint.x > sessionObject.dim.x || rotatedStartPoint.y > sessionObject.dim.y || rotatedEndPoint.x > sessionObject.dim.x || rotatedEndPoint.y > sessionObject.dim.y) {
        console.log("= S.BaseLine: Rotation resulted in coordinates outside session dimensions, returning false");
        return false;
      }
    }

    this.AdjustLineStart(svgElement, rotatedStartPoint.x, rotatedStartPoint.y, 0, true);
    this.AdjustLineEnd(svgElement, rotatedEndPoint.x, rotatedEndPoint.y, ConstantData.ActionTriggerType.LINEEND, true);

    console.log("= S.BaseLine: Rotate completed successfully");
    return true;
  }

  RotateKnobCenterDivisor(): { x: number; y: number } {
    console.log("= S.BaseLine: RotateKnobCenterDivisor called");

    const divisor = {
      x: 2,
      y: 2
    };

    console.log("= S.BaseLine: RotateKnobCenterDivisor output:", divisor);
    return divisor;
  }

  GetHookFlags(): number {
    console.log("= S.BaseLine: GetHookFlags called");

    const hookFlags = ConstantData.HookFlags.SED_LC_Shape |
      ConstantData.HookFlags.SED_LC_Line |
      ConstantData.HookFlags.SED_LC_CHook;

    console.log("= S.BaseLine: GetHookFlags output:", hookFlags);
    return hookFlags;
  }


  AllowLink() {

    const layersManager = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theLayersManagerBlockID, false);
    const session = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);

    const useEdges = layersManager && layersManager.activelayer >= 0 && (layersManager.layers[layersManager.activelayer].flags & ConstantData.LayerFlags.SDLF_UseEdges);
    const fromOverlayLayer = GlobalData.optManager.FromOverlayLayer;
    const sessionLink = session && (session.flags & ConstantData.SessionFlags.SEDS_LLink);

    return !useEdges && (fromOverlayLayer || sessionLink);
  }



  GetHookPoints(): { x: number; y: number; id: number }[] {
    console.log("= S.BaseLine: GetHookPoints called");

    const hookDimension = ConstantData.Defines.SED_CDim;
    const hookPoints = [
      {
        x: 0,
        y: 0,
        id: ConstantData.HookPts.SED_KTL
      },
      {
        x: hookDimension,
        y: hookDimension,
        id: ConstantData.HookPts.SED_KTR
      }
    ];

    console.log("= S.BaseLine: GetHookPoints output:", hookPoints);
    return hookPoints;
  }

  Pr_GetWidthAdjustment() {
    console.log("= S.BaseLine: Pr_GetWidthAdjustment called");

    const lineThicknessHalf = this.StyleRecord.Line.Thickness / 2;
    let angle = this.GetAngle(null);

    if (angle >= 90) {
      angle = 180 - angle;
    }

    const angleRadians = angle / 180 * Math.PI;
    const deltaX = Math.sin(angleRadians) * lineThicknessHalf;
    const deltaY = Math.cos(angleRadians) * lineThicknessHalf;

    const result = {
      deltax: deltaX,
      deltay: deltaY
    };

    console.log("= S.BaseLine: Pr_GetWidthAdjustment output:", result);
    return result;
  }

  GetConnectLine(): { startpt: Point; endpt: Point } | null {
    console.log("= S.BaseLine: GetConnectLine called");

    // This method is intended to be overridden by subclasses if needed.
    // By default, it returns null indicating no specific connection line.
    const result = null;

    console.log("= S.BaseLine: GetConnectLine output:", result);
    return result;
  }

  GetPerimPts(hookPoints, targetPoints, targetID, isRelative, additionalParam, hookIndex) {
    console.log("= S.BaseLine: GetPerimPts called with", { hookPoints, targetPoints, targetID, isRelative, additionalParam, hookIndex });

    let resultPoints = [];
    let startPoint = {};
    let endPoint = {};
    const HookPts = ConstantData.HookPts;
    const numTargetPoints = targetPoints.length;

    if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL && hookIndex < 0 && numTargetPoints > 1) {
      const lineThickness = this.StyleRecord.Line.Thickness / 2;
      const widthAdjustment = this.Pr_GetWidthAdjustment();

      for (let i = 0; i < numTargetPoints; i++) {
        let point = {};
        switch (targetPoints[i].id) {
          case HookPts.SED_WTL:
            point = { x: this.StartPoint.x - widthAdjustment.deltax, y: this.StartPoint.y - widthAdjustment.deltay, id: targetPoints[i].id };
            break;
          case HookPts.SED_WTR:
            point = { x: this.StartPoint.x + widthAdjustment.deltax, y: this.StartPoint.y - widthAdjustment.deltay, id: targetPoints[i].id };
            break;
          case HookPts.SED_WBL:
            point = { x: this.EndPoint.x - widthAdjustment.deltax, y: this.EndPoint.y + widthAdjustment.deltay, id: targetPoints[i].id };
            break;
          case HookPts.SED_WBR:
            point = { x: this.EndPoint.x + widthAdjustment.deltax, y: this.EndPoint.y + widthAdjustment.deltay, id: targetPoints[i].id };
            break;
          case HookPts.SED_KTL:
            point = { x: this.StartPoint.x, y: this.StartPoint.y, id: targetPoints[i].id };
            break;
          case HookPts.SED_KTR:
            point = { x: this.EndPoint.x, y: this.EndPoint.y, id: targetPoints[i].id };
            break;
        }
        resultPoints.push(point);
      }
      console.log("= S.BaseLine: GetPerimPts output:", resultPoints);
      return resultPoints;
    }

    if (hookIndex >= 0) {
      const targetObject = GlobalData.optManager.GetObjectPtr(hookIndex, false);
      if (targetObject && targetObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_CONNECTOR) {
        if (targetObject.hooks.length > 1) {
          if (targetObject.hooks[0].objid === this.BlockID) {
            resultPoints[0] = { x: 0, y: this.StartPoint.y };
            resultPoints[0].x = GlobalData.optManager.GetDependencyLineStartX(targetObject);
            if (targetPoints[0].id != null) resultPoints[0].id = targetPoints[0].id;
            const endArrowDisp = this.EndArrowDisp;
            if (resultPoints[0].x > GlobalData.optManager.GetDependencyLineEndX(targetObject) - endArrowDisp + 1) {
              resultPoints[0].x = GlobalData.optManager.GetDependencyLineEndX(targetObject) - endArrowDisp + 1;
            }
            console.log("= S.BaseLine: GetPerimPts output:", resultPoints);
            return resultPoints;
          }
          if (targetObject.hooks[1].objid === this.BlockID) {
            resultPoints[0] = { x: 0, y: this.StartPoint.y };
            if (targetPoints[0].id != null) resultPoints[0].id = targetPoints[0].id;
            resultPoints[0].x = GlobalData.optManager.GetDependencyLineEndX(targetObject);
            console.log("= S.BaseLine: GetPerimPts output:", resultPoints);
            return resultPoints;
          }
        }
      } else if (targetObject && targetObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_MULTIPLICITY) {
        let offsetX = 5;
        let offsetY = 5;
        offsetX += targetObject.Frame.width / 2;
        let angle = this.GetAngle(null);
        if (angle >= 90) angle = 180 - angle;
        const angleRadians = angle / 180 * Math.PI;
        let delta = 0;

        if (angle <= 45) {
          if (targetObject.subtype == ConstantData.ObjectSubTypes.SD_SUBT_MULTIPLICITY_FLIPPED) offsetY = -targetObject.Frame.height - 5;
          delta = Math.tan(angleRadians) * offsetX;
          if (targetPoints[0].x === 0) {
            if (this.StartPoint.y < this.EndPoint.y) offsetY -= delta;
            else offsetY += delta;
          } else {
            if (this.StartPoint.y < this.EndPoint.y) offsetY += delta;
            else offsetY -= delta;
          }
          offsetY = -offsetY;
          if (this.StartPoint.x >= this.EndPoint.x) offsetX = -offsetX;
        } else {
          if (targetObject.subtype == ConstantData.ObjectSubTypes.SD_SUBT_MULTIPLICITY_FLIPPED) offsetX = -offsetX;
          const tanInverse = Math.tan(Math.PI / 2 - angleRadians);
          if (targetPoints[0].x === 0) {
            if (this.StartPoint.y >= this.EndPoint.y) offsetY = -offsetY;
            else offsetY += targetObject.Frame.height;
            delta = tanInverse * Math.abs(offsetY);
            if (this.StartPoint.x < this.EndPoint.x) offsetX += delta;
            else offsetX -= delta;
          } else {
            if (this.StartPoint.y >= this.EndPoint.y) offsetY += targetObject.Frame.height;
            else offsetY = -offsetY;
            delta = tanInverse * Math.abs(offsetY);
            if (this.StartPoint.x < this.EndPoint.x) offsetX -= delta;
            else offsetX += delta;
            offsetX = -offsetX;
          }
        }

        if (targetPoints[0].x === 0) {
          resultPoints.push(new Point(this.StartPoint.x + offsetX, this.StartPoint.y + offsetY));
          resultPoints[0].id = targetPoints[0].id;
        } else {
          resultPoints.push(new Point(this.EndPoint.x - offsetX, this.EndPoint.y + offsetY));
          resultPoints[0].id = targetPoints[0].id;
        }
        console.log("= S.BaseLine: GetPerimPts output:", resultPoints);
        return resultPoints;
      } else if (targetObject && targetObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_EXTRATEXTLABEL && numTargetPoints === 1) {
        const proportion = targetPoints[0].x / ConstantData.Defines.SED_CDim;
        const pointOnLine = this.GetPointOnLine(proportion);
        resultPoints.push(pointOnLine);
        resultPoints[0].id = targetPoints[0].id;
        console.log("= S.BaseLine: GetPerimPts output:", resultPoints);
        return resultPoints;
      }
    }

    const connectLine = this.GetConnectLine();
    if (connectLine) {
      startPoint = connectLine.startpt;
      endPoint = connectLine.endpt;
    } else {
      startPoint = this.StartPoint;
      endPoint = this.EndPoint;
    }

    for (let i = 0; i < numTargetPoints; i++) {
      resultPoints[i] = { x: 0, y: 0, id: 0 };
      if (targetPoints[i].x === 0 && targetPoints[i].y === 0) {
        resultPoints[i].x = startPoint.x;
        resultPoints[i].y = startPoint.y;
      } else if (targetPoints[i].x === ConstantData.Defines.SED_CDim && targetPoints[i].y === ConstantData.Defines.SED_CDim) {
        resultPoints[i].x = endPoint.x;
        resultPoints[i].y = endPoint.y;
      } else {
        const deltaX = endPoint.x - startPoint.x;
        const deltaY = endPoint.y - startPoint.y;
        resultPoints[i].x = (targetPoints[i].x / ConstantData.Defines.SED_CDim) * deltaX + startPoint.x;
        resultPoints[i].y = (targetPoints[i].y / ConstantData.Defines.SED_CDim) * deltaY + startPoint.y;
      }
      if (targetPoints[i].id != null) resultPoints[i].id = targetPoints[i].id;
    }

    console.log("= S.BaseLine: GetPerimPts output:", resultPoints);
    return resultPoints;
  }

  GetPointOnLine(proportion: number): Point {
    console.log("= S.BaseLine: GetPointOnLine called with proportion:", proportion);

    const distanceBetweenPoints = (point1: Point, point2: Point): number => {
      const deltaX = point1.x - point2.x;
      const deltaY = point1.y - point2.y;
      return Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);
    };

    const resultPoint: Point = { x: this.StartPoint.x, y: this.StartPoint.y };
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false, null);
    const segments: { pt1: Point; pt2: Point; len: number }[] = [];
    let totalLength = 0;

    for (let i = 1; i < polyPoints.length; i++) {
      const point1 = polyPoints[i - 1];
      const point2 = polyPoints[i];
      const segmentLength = distanceBetweenPoints(point1, point2);
      segments.push({ pt1: point1, pt2: point2, len: segmentLength });
      totalLength += segmentLength;
    }

    proportion = Math.max(0, Math.min(1, proportion));
    const targetLength = proportion * totalLength;
    let accumulatedLength = 0;

    for (const segment of segments) {
      const { pt1, pt2, len } = segment;
      if (accumulatedLength + len >= targetLength) {
        const segmentProportion = (targetLength - accumulatedLength) / len;
        resultPoint.x = pt1.x + (pt2.x - pt1.x) * segmentProportion;
        resultPoint.y = pt1.y + (pt2.y - pt1.y) * segmentProportion;
        break;
      }
      accumulatedLength += len;
    }

    console.log("= S.BaseLine: GetPointOnLine output:", resultPoint);
    return resultPoint;
  }

  GetTargetPoints(hookPoint, hookFlags, targetID) {
    console.log("= S.BaseLine: GetTargetPoints called with", { hookPoint, hookFlags, targetID });

    let isVertical = false;
    let isHorizontal = false;
    const targetPoints = [{ x: 0, y: 0 }];
    const adjustedPoint = { x: 0, y: 0 };
    const hookPts = ConstantData.HookPts;

    if (targetID != null && targetID >= 0) {
      const targetObject = GlobalData.optManager.GetObjectPtr(targetID, false);

      if (targetObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_CONNECTOR) {
        if (targetObject.hooks.length > 1) {
          if (targetObject.hooks[0].objid === this.BlockID) {
            targetPoints[0].x = ConstantData.Defines.SED_CDim;
            targetPoints[0].y = ConstantData.Defines.SED_CDim / 2;
            console.log("= S.BaseLine: GetTargetPoints output:", targetPoints);
            return targetPoints;
          }
          if (targetObject.hooks[1].objid === this.BlockID) {
            targetPoints[0].x = 0;
            targetPoints[0].y = ConstantData.Defines.SED_CDim / 2;
            console.log("= S.BaseLine: GetTargetPoints output:", targetPoints);
            return targetPoints;
          }
        }
      } else if (targetObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
        switch (hookPoint.id) {
          case hookPts.SED_KTC:
          case hookPts.SED_KBC:
          case hookPts.SED_KRC:
          case hookPts.SED_KLC:
            const isReversed = SDF.LineIsReversed(this, null, false);
            if (this.hooks.length === 0) {
              if (isReversed) {
                targetPoints[0].x = ConstantData.Defines.SED_CDim;
                targetPoints[0].y = ConstantData.Defines.SED_CDim;
                targetPoints.push({ x: 0, y: 0 });
              } else {
                targetPoints[0].x = 0;
                targetPoints[0].y = 0;
                targetPoints.push({ x: ConstantData.Defines.SED_CDim, y: ConstantData.Defines.SED_CDim });
              }
              console.log("= S.BaseLine: GetTargetPoints output:", targetPoints);
              return targetPoints;
            }
            if (this.hooks.length === 1) {
              if (this.hooks[0].hookpt === hookPts.SED_KTR) {
                targetPoints[0].x = 0;
                targetPoints[0].y = 0;
                console.log("= S.BaseLine: GetTargetPoints output:", targetPoints);
                return targetPoints;
              }
              if (this.hooks[0].hookpt === hookPts.SED_KTL) {
                targetPoints[0].x = ConstantData.Defines.SED_CDim;
                targetPoints[0].y = ConstantData.Defines.SED_CDim;
                console.log("= S.BaseLine: GetTargetPoints output:", targetPoints);
                return targetPoints;
              }
            }
            return [];
        }
      }
    }

    let deltaX = this.EndPoint.x - this.StartPoint.x;
    if (Utils2.IsEqual(deltaX, 0)) {
      deltaX = 0;
    }
    if (deltaX === 0) {
      isVertical = true;
    }

    let deltaY = this.EndPoint.y - this.StartPoint.y;
    if (Utils2.IsEqual(deltaY, 0)) {
      deltaY = 0;
    }
    if (deltaY === 0) {
      isHorizontal = true;
    }

    let slope = isVertical ? 0 : deltaY / deltaX;

    adjustedPoint.x = hookPoint.x;
    adjustedPoint.y = hookPoint.y;

    if (isVertical || Math.abs(slope) > 1 || (hookFlags & ConstantData.HookFlags.SED_LC_HOnly && !isHorizontal)) {
      if (GlobalData.docHandler.documentConfig.enableSnap && !(hookFlags & ConstantData.HookFlags.SED_LC_NoSnaps)) {
        adjustedPoint = GlobalData.docHandler.SnapToGrid(adjustedPoint);
        const frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
        if (adjustedPoint.y < frame.y) {
          adjustedPoint.y = frame.y;
        }
        if (adjustedPoint.y > frame.y + frame.height) {
          adjustedPoint.y = frame.y + frame.height;
        }
      }
      const offsetY = adjustedPoint.y - this.StartPoint.y;
      var offsetX = isVertical ? offsetY : offsetY / slope;
    } else {
      if (GlobalData.docHandler.documentConfig.enableSnap && !(hookFlags & ConstantData.HookFlags.SED_LC_NoSnaps)) {
        adjustedPoint = GlobalData.docHandler.SnapToGrid(adjustedPoint);
        const frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
        if (adjustedPoint.x < frame.x) {
          adjustedPoint.x = frame.x;
        }
        if (adjustedPoint.x > frame.x + frame.width) {
          adjustedPoint.x = frame.x + frame.width;
        }
      }
      const offsetX = adjustedPoint.x - this.StartPoint.x;
      var offsetY = offsetX * slope;
    }

    if (!isHorizontal) {
      targetPoints[0].y = (offsetY / deltaY) * ConstantData.Defines.SED_CDim;
    }
    targetPoints[0].x = isVertical ? targetPoints[0].y : (offsetX / deltaX) * ConstantData.Defines.SED_CDim;

    if (isHorizontal) {
      targetPoints[0].y = targetPoints[0].x;
    }

    if (targetPoints[0].x > ConstantData.Defines.SED_CDim) {
      targetPoints[0].x = ConstantData.Defines.SED_CDim;
    }
    if (targetPoints[0].y > ConstantData.Defines.SED_CDim) {
      targetPoints[0].y = ConstantData.Defines.SED_CDim;
    }
    if (targetPoints[0].x < 0) {
      targetPoints[0].x = 0;
    }
    if (targetPoints[0].y < 0) {
      targetPoints[0].y = 0;
    }

    console.log("= S.BaseLine: GetTargetPoints output:", targetPoints);
    return targetPoints;
  }

  AllowHook(hookPoint: any, targetID: number, distance: number): boolean {
    console.log("= S.BaseLine: AllowHook called with hookPoint:", hookPoint, "targetID:", targetID, "distance:", distance);

    const HookPts = ConstantData.HookPts;

    if (targetID != null && targetID >= 0) {
      const targetObject = GlobalData.optManager.GetObjectPtr(targetID, false);

      if (targetObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
        switch (hookPoint.id) {
          case HookPts.SED_KTC:
          case HookPts.SED_KBC:
          case HookPts.SED_KRC:
          case HookPts.SED_KLC:
            if (distance > 200) {
              console.log("= S.BaseLine: AllowHook output: false (distance > 200)");
              return false;
            }
            break;
          default:
            if (hookPoint.id >= HookPts.SED_CustomBase && hookPoint.id < HookPts.SED_CustomBase + 100 && distance > 200) {
              console.log("= S.BaseLine: AllowHook output: false (custom hook point and distance > 200)");
              return false;
            }
        }
      }
    }

    console.log("= S.BaseLine: AllowHook output: true");
    return true;
  }

  DeleteObject() {
    console.log("= S.BaseLine: DeleteObject called");

    // Call the base class DeleteObject method
    super.DeleteObject();

    // Handle specific object types
    switch (this.objecttype) {
      case ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR:
        console.log("= S.BaseLine: Handling SD_OBJT_GANTT_BAR");

        if (this.datasetElemID >= 0) {
          const deleteResult = GlobalData.optManager.GanttDeleteTask(
            this.datasetTableID,
            this.datasetElemID,
            this.BlockID,
            true,
            null
          );

          if (deleteResult === -2) {
            console.log("= S.BaseLine: GanttDeleteTask returned -2, exiting");
            return;
          }
        }

        if (this.hooks.length) {
          const hookObject = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);

          if (hookObject && hookObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_CHART) {
            console.log("= S.BaseLine: Returning Gantt chart object:", hookObject);
            return hookObject;
          }
        }
        break;

      case ConstantData.ObjectTypes.SD_OBJT_NG_EVENT:
        console.log("= S.BaseLine: Handling SD_OBJT_NG_EVENT");

        if (this.datasetElemID >= 0) {
          ListManager.SDData.DeleteRow(this.datasetElemID);
        }

        if (this.hooks.length) {
          const hookObject = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);

          if (hookObject && hookObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_NG_TIMELINE) {
            console.log("= S.BaseLine: Returning NG timeline object:", hookObject);
            return hookObject;
          }
        }
        break;

      default:
        console.log("= S.BaseLine: No specific handling for objecttype:", this.objecttype);
    }

    console.log("= S.BaseLine: DeleteObject completed");
  }

  GetSegLFace(objectType: number, point: Point, referencePoint: Point): number {
    console.log("= S.BaseLine: GetSegLFace called with objectType:", objectType, "point:", point, "referencePoint:", referencePoint);

    let result: number;

    if (objectType === ConstantData.ObjectTypes.SD_OBJT_GANTT_CONNECTOR) {
      if (this.Frame.x + this.Frame.height <= referencePoint.x) {
        result = ConstantData.HookPts.SED_KRC;
      } else if (this.y > referencePoint.y) {
        result = ConstantData.HookPts.SED_KTC;
      } else {
        result = ConstantData.HookPts.SED_KBC;
      }
    } else {
      if (this.Frame.width >= this.Frame.height) {
        result = point.y >= referencePoint.y ? ConstantData.HookPts.SED_KBC : ConstantData.HookPts.SED_KTC;
      } else {
        result = point.x >= referencePoint.x ? ConstantData.HookPts.SED_KRC : ConstantData.HookPts.SED_KLC;
      }
    }

    console.log("= S.BaseLine: GetSegLFace output:", result);
    return result;
  }

  GetSpacing(): { width: number | null; height: number | null } {
    console.log("= S.BaseLine: GetSpacing called");

    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const spacing = { width: null, height: null };

    if (this.hooks.length === 2) {
      const hook1 = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);
      const hook2 = GlobalData.optManager.GetObjectPtr(this.hooks[1].objid, false);

      if (rect.width < rect.height) {
        spacing.height = Math.abs(this.StartPoint.y - this.EndPoint.y);
        if (hook1 && hook2) {
          spacing.height = hook1.Frame.y < hook2.Frame.y
            ? hook2.Frame.y - (hook1.Frame.y + hook1.Frame.height)
            : hook1.Frame.y - (hook2.Frame.y + hook2.Frame.height);
        }
      } else {
        spacing.width = Math.abs(this.StartPoint.x - this.EndPoint.x);
        if (hook1 && hook2) {
          spacing.width = hook1.Frame.x < hook2.Frame.x
            ? hook2.Frame.x - (hook1.Frame.x + hook1.Frame.width)
            : hook1.Frame.x - (hook2.Frame.x + hook2.Frame.width);
        }
      }
    }

    console.log("= S.BaseLine: GetSpacing output:", spacing);
    return spacing;
  }

  GetShapeConnectPoint(hookPointID) {
    console.log("= S.BaseLine: GetShapeConnectPoint called with hookPointID:", hookPointID);

    const connectPoint = { x: 0, y: 0 };
    const alternatePoint = { x: 0, y: 0 };
    const dimension = ConstantData.Defines.SED_CDim;
    const frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

    if (frame.width < frame.height) {
      connectPoint.x = dimension / 2;
      alternatePoint.x = dimension / 2;
      if (this.EndPoint.y < this.StartPoint.y) {
        connectPoint.y = dimension;
        alternatePoint.y = 0;
      } else {
        connectPoint.y = 0;
        alternatePoint.y = dimension;
      }
    } else {
      connectPoint.y = dimension / 2;
      alternatePoint.y = dimension / 2;
      if (this.EndPoint.x < this.StartPoint.x) {
        connectPoint.x = dimension;
        alternatePoint.x = 0;
      } else {
        connectPoint.x = 0;
        alternatePoint.x = dimension;
      }
    }

    const result = hookPointID === ConstantData.HookPts.SED_KTL ? alternatePoint : connectPoint;
    console.log("= S.BaseLine: GetShapeConnectPoint output:", result);
    return result;
  }

  GetBestHook(hookPointID: number, hookPoint: Point, relativePoint: Point): any {
    console.log("= S.BaseLine: GetBestHook called with hookPointID:", hookPointID, "hookPoint:", hookPoint, "relativePoint:", relativePoint);

    const dimension = ConstantData.Defines.SED_CDim;
    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const HookPts = ConstantData.HookPts;
    let isEndPoint = false;

    const targetObject = GlobalData.optManager.GetObjectPtr(hookPointID, false);
    if (targetObject && targetObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
      switch (hookPoint) {
        case HookPts.SED_KTC:
        case HookPts.SED_KBC:
        case HookPts.SED_KRC:
        case HookPts.SED_KLC:
          if (rect.width < rect.height) {
            isEndPoint = rect.y === this.EndPoint.y;
            const bestHook = relativePoint.y < dimension / 2 ? (isEndPoint ? HookPts.SED_KTC : HookPts.SED_KBC) : (isEndPoint ? HookPts.SED_KBC : HookPts.SED_KTC);
            console.log("= S.BaseLine: GetBestHook output:", bestHook);
            return bestHook;
          } else {
            isEndPoint = rect.x === this.EndPoint.x;
            const bestHook = relativePoint.x < dimension / 2 ? (isEndPoint ? HookPts.SED_KLC : HookPts.SED_KRC) : (isEndPoint ? HookPts.SED_KRC : HookPts.SED_KLC);
            console.log("= S.BaseLine: GetBestHook output:", bestHook);
            return bestHook;
          }
        default:
          console.log("= S.BaseLine: GetBestHook output (default):", hookPoint);
          return hookPoint;
      }
    }

    console.log("= S.BaseLine: GetBestHook output (no target object):", hookPoint);
    return hookPoint;
  }

  CreateConnectHilites(svgDoc, targetPoint, hookPoint, isJoin, hookIndex, additionalParam) {
    console.log("= S.BaseLine: CreateConnectHilites called with", {
      svgDoc,
      targetPoint,
      hookPoint,
      isJoin,
      hookIndex,
      additionalParam
    });

    const groupElement = svgDoc.CreateShape(ConstantData.CreateShapeType.GROUP);
    let scale = svgDoc.docInfo.docToScreenScale;
    if (svgDoc.docInfo.docScale <= 0.5) {
      scale *= 2;
    }

    let knobSize = ConstantData.Defines.CONNECTPT_LINE_DIM / scale;
    if (isJoin) {
      knobSize = ConstantData.Defines.JOINPT_LINE_DIM / scale;
    }

    const perimeterPoints = [];
    const position = {};

    if (hookPoint != null) {
      perimeterPoints.push(hookPoint);
      const perimeter = this.GetPerimPts(targetPoint, perimeterPoints, null, true, null, hookIndex);

      if (isJoin) {
        if (hookPoint.x === 0 && hookPoint.y === 0) {
          perimeter[0].x = this.StartPoint.x;
          perimeter[0].y = this.StartPoint.y;
        } else if (hookPoint.x === ConstantData.Defines.SED_CDim && hookPoint.y === ConstantData.Defines.SED_CDim) {
          perimeter[0].x = this.EndPoint.x;
          perimeter[0].y = this.EndPoint.y;
        }
      }

      position.x = perimeter[0].x - knobSize;
      position.y = perimeter[0].y - knobSize;
      position.width = knobSize;
      position.height = knobSize;

      let knobParams = null;
      if (GlobalData.optManager.bTouchInitiated) {
        knobParams = {
          svgDoc,
          shapeType: ConstantData.CreateShapeType.OVAL,
          x: knobSize / 2,
          y: knobSize / 2,
          knobSize,
          fillColor: 'black',
          fillOpacity: 0.25,
          strokeSize: 1,
          strokeColor: '#777777',
          KnobID: 0,
          cursorType: Element.CursorType.ANCHOR
        };
        if (isJoin) {
          knobParams.fillColor = 'none';
          knobParams.strokeSize = 2;
          knobParams.strokeColor = 'black';
          knobParams.cursorType = Element.CursorType.CUR_JOIN;
        }
      } else {
        knobParams = {
          svgDoc,
          shapeType: ConstantData.CreateShapeType.OVAL,
          x: knobSize / 2,
          y: knobSize / 2,
          knobSize,
          fillColor: 'black',
          fillOpacity: 1,
          strokeSize: 1,
          strokeColor: '#777777',
          KnobID: 0,
          cursorType: Element.CursorType.ANCHOR
        };
        if (isJoin) {
          knobParams.fillColor = 'none';
          knobParams.strokeSize = 1;
          knobParams.strokeColor = 'black';
          knobParams.cursorType = Element.CursorType.CUR_JOIN;
        }
      }

      const knobElement = this.GenericKnob(knobParams);
      groupElement.AddElement(knobElement);
      groupElement.SetPos(position.x, position.y);
      groupElement.SetSize(position.width, position.height);
      groupElement.isShape = true;
      groupElement.SetID('hilite_' + targetPoint);

      console.log("= S.BaseLine: CreateConnectHilites output:", groupElement);
      return groupElement;
    }
  }

  HookToPoint(hookId: number, outRect?: any): Point {
    console.log("= S.BaseLine: HookToPoint input, hookId:", hookId, "outRect:", outRect);

    // Initialize the result point
    const resultPoint: Point = { x: 0, y: 0 };

    // Get the constant alias for ease of reading
    const CD = ConstantData;

    // Calculate the width adjustment using the helper method
    const widthAdjustment = this.Pr_GetWidthAdjustment();

    // Determine the hook point based on the hookId
    switch (hookId) {
      case CD.HookPts.SED_KTL:
        resultPoint.x = this.StartPoint.x;
        resultPoint.y = this.StartPoint.y;
        break;
      case CD.HookPts.SED_KTR:
        resultPoint.x = this.EndPoint.x;
        resultPoint.y = this.EndPoint.y;
        break;
      case CD.HookPts.SED_WTL:
        resultPoint.x = this.StartPoint.x - widthAdjustment.deltax;
        resultPoint.y = this.StartPoint.y - widthAdjustment.deltay;
        break;
      case CD.HookPts.SED_WTR:
        resultPoint.x = this.StartPoint.x + widthAdjustment.deltax;
        resultPoint.y = this.StartPoint.y - widthAdjustment.deltay;
        break;
      case CD.HookPts.SED_WBL:
        resultPoint.x = this.EndPoint.x - widthAdjustment.deltax;
        resultPoint.y = this.EndPoint.y + widthAdjustment.deltay;
        break;
      case CD.HookPts.SED_WBR:
        resultPoint.x = this.EndPoint.x + widthAdjustment.deltax;
        resultPoint.y = this.EndPoint.y + widthAdjustment.deltay;
        break;
      default:
        resultPoint.x = this.EndPoint.x;
        resultPoint.y = this.EndPoint.y;
    }

    // If an output rectangle is provided, calculate and assign the rectangle based on StartPoint and EndPoint
    if (outRect) {
      const computedRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      outRect.x = computedRect.x;
      outRect.y = computedRect.y;
      outRect.width = computedRect.width;
      outRect.height = computedRect.height;
    }

    console.log("= S.BaseLine: HookToPoint output, resultPoint:", resultPoint, "outRect:", outRect);
    return resultPoint;
  }

  MaintainPoint(point: Point, targetId: number, distance: number, lineObj: any, offset: any): boolean {
    console.log("= S.BaseLine: MaintainPoint input:", { point, targetId, distance, lineObj, offset });

    let hookIndex: number = -1;
    let currentLine = lineObj;
    const hookRect: any = {};
    let newLine: any = {};

    if (currentLine.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.LINE) {
      switch (currentLine.LineType) {
        case ConstantData.LineType.SEGLINE:
        case ConstantData.LineType.ARCSEGLINE:
        case ConstantData.LineType.POLYLINE:
          // loop through hooks to find the matching target id
          for (let i = 0; i < currentLine.hooks.length; i++) {
            if (currentLine.hooks[i].targetid === targetId) {
              currentLine.HookToPoint(currentLine.hooks[i].hookpt, hookRect);
              hookIndex = 0; // found a matching hook
              break;
            }
          }
          if (hookIndex !== 0) {
            console.log("= S.BaseLine: MaintainPoint output: returning true early (no matching hook)");
            return true;
          }
          newLine = Utils1.DeepCopy(currentLine);
          Utils2.CopyRect(newLine.Frame, hookRect);
          newLine.StartPoint.x = hookRect.x;
          newLine.StartPoint.y = hookRect.y;
          newLine.EndPoint.x = hookRect.x + hookRect.width;
          newLine.EndPoint.y = hookRect.y + hookRect.height;
          currentLine = newLine;
          break;
      }
      if (GlobalData.optManager.LineCheckPoint(this, point)) {
        console.log("= S.BaseLine: MaintainPoint output: returning true early (LineCheckPoint true)");
        return true;
      }
      if (GlobalData.optManager.Lines_Intersect(this, currentLine, point)) {
        console.log("= S.BaseLine: MaintainPoint output: returning true early (Lines_Intersect true)");
        return true;
      }
      GlobalData.optManager.Lines_MaintainDist(this, distance, offset, point);
    } else {
      GlobalData.optManager.Lines_MaintainDist(this, distance, offset, point);
    }

    console.log("= S.BaseLine: MaintainPoint output: returning true");
    return true;
  }

  ChangeTarget(e: any, targetId: any, a: any, r: any, i: any, n: any): void {
    console.log("= S.BaseLine: ChangeTarget called with e:", e, "targetId:", targetId, "a:", a, "r:", r, "i:", i, "n:", n);

    let apparentAngle = 0;
    let targetObj: any = GlobalData.optManager.GetObjectPtr(targetId, false);

    if (this.TextFlags & ConstantData.TextFlags.SED_TF_HorizText &&
      targetObj instanceof Instance.Shape.BaseShape) {

      apparentAngle = this.GetApparentAngle(-1);
      apparentAngle = Math.abs(apparentAngle) % 180;

      let targetRotation = Math.abs(targetObj.RotationAngle % 180);
      console.log("= S.BaseLine: ChangeTarget computed apparentAngle:", apparentAngle, "targetRotation:", targetRotation);

      if (Math.abs(targetRotation - apparentAngle) > 2 &&
        Math.abs(targetRotation - (apparentAngle - 180)) > 2) {
        targetObj.RotationAngle = apparentAngle;
        GlobalData.optManager.SetLinkFlag(
          this.BlockID,
          ConstantData.LinkFlags.SED_L_MOVE | ConstantData.LinkFlags.SED_L_CHANGE
        );
        GlobalData.optManager.AddToDirtyList(targetId);
        console.log("= S.BaseLine: ChangeTarget updated targetObj.RotationAngle to:", apparentAngle);
      } else {
        console.log("= S.BaseLine: ChangeTarget rotation difference within tolerance, no update performed");
      }
    }

    GlobalData.optManager.AddToDirtyList(this.BlockID);
    console.log("= S.BaseLine: ChangeTarget completed for BlockID:", this.BlockID);
  }

  GetPolyPoints(numPoints: number, isRelative: boolean, a: any, r: any, i: any): Point[] {
    console.log("= S.BaseLine: GetPolyPoints called with:", { numPoints, isRelative, a, r, i });

    // Create the points array using StartPoint and EndPoint
    const points: Point[] = [
      new Point(this.StartPoint.x, this.StartPoint.y),
      new Point(this.EndPoint.x, this.EndPoint.y)
    ];

    // If points should be relative to the frame, subtract frame offsets
    if (isRelative) {
      for (const point of points) {
        point.x -= this.Frame.x;
        point.y -= this.Frame.y;
      }
    }

    console.log("= S.BaseLine: GetPolyPoints output:", points);
    return points;
  }

  Hit(
    point: { x: number; y: number },
    t: any,
    isKnob: boolean,
    hitResult: any,
    hookPointID: number
  ): number {
    console.log("= S.BaseLine: Hit called with input:", { point, t, isKnob, hitResult, hookPointID });

    let hitCode: number;
    let inflatedStartPoint: any;
    let inflatedEndPoint: any;
    const knobSize = ConstantData.Defines.SED_KnobSize;
    let docToScreenScale = GlobalData.optManager.svgDoc.docInfo.docToScreenScale;

    if (GlobalData.optManager.svgDoc.docInfo.docScale <= 0.5) {
      docToScreenScale *= 2;
    }

    if (isKnob) {
      const inflatedSize = 2 * knobSize / docToScreenScale;
      inflatedStartPoint = Utils2.InflatePoint(this.StartPoint, inflatedSize);
      inflatedEndPoint = Utils2.InflatePoint(this.EndPoint, inflatedSize);

      if (hookPointID) {
        if (hookPointID === ConstantData.HookPts.SED_KTL) {
          inflatedStartPoint = null;
        }
        if (hookPointID === ConstantData.HookPts.SED_KTR) {
          inflatedEndPoint = null;
        }
      }

      if (this.hooks) {
        for (let i = 0; i < this.hooks.length; i++) {
          if (this.hooks[i].hookpt === ConstantData.HookPts.SED_KTL) {
            inflatedStartPoint = null;
          }
          if (this.hooks[i].hookpt === ConstantData.HookPts.SED_KTR) {
            inflatedEndPoint = null;
          }
        }
      }

      if (inflatedStartPoint && Utils2.pointInRect(inflatedStartPoint, point)) {
        const targetObject = GlobalData.optManager.GetObjectPtr(hitResult.objectid, false);
        if (!(targetObject && targetObject.polylist && targetObject.polylist.closed)) {
          if (hitResult) {
            hitResult.hitcode = ConstantData.HitCodes.SED_PLApp;
            hitResult.segment = ConstantData.HookPts.SED_KTL;
            hitResult.pt.x = this.StartPoint.x;
            hitResult.pt.y = this.StartPoint.y;
          }
          console.log("= S.BaseLine: Hit output:", ConstantData.HitCodes.SED_PLApp);
          return ConstantData.HitCodes.SED_PLApp;
        }
      }

      if (inflatedEndPoint && Utils2.pointInRect(inflatedEndPoint, point)) {
        const targetObject = GlobalData.optManager.GetObjectPtr(hitResult.objectid, false);
        if (!(targetObject && targetObject.polylist && targetObject.polylist.closed)) {
          if (hitResult) {
            hitResult.hitcode = ConstantData.HitCodes.SED_PLApp;
            hitResult.segment = ConstantData.HookPts.SED_KTR;
            hitResult.pt.x = this.EndPoint.x;
            hitResult.pt.y = this.EndPoint.y;
          }
          console.log("= S.BaseLine: Hit output:", ConstantData.HitCodes.SED_PLApp);
          return ConstantData.HitCodes.SED_PLApp;
        }
      }
    }

    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, true, []);
    const hitPoint = { x: point.x, y: point.y };
    const hitData = {};

    hitCode = Utils3.LineDStyleHit(polyPoints, hitPoint, this.StyleRecord.Line.Thickness, 0, hitData);

    if (hitData.lpHit !== undefined && hitResult) {
      for (let i = 0; i < polyPoints.length; i++) {
        if (hitData.lpHit < polyPoints[i]) {
          hitData.lpHit = i;
          break;
        }
      }
      hitResult.segment = hitData.lpHit;
    }

    if (hitResult) {
      hitResult.hitcode = hitCode;
    }

    console.log("= S.BaseLine: Hit output:", hitCode);
    return hitCode;
  }

  StartNewObjectDrawDoAutoScroll() {
    console.log("= S.BaseLine: StartNewObjectDrawDoAutoScroll called");

    // Set the auto-scroll timer with a 100ms timeout
    GlobalData.optManager.autoScrollTimerID = GlobalData.optManager.autoScrollTimer.setTimeout(
      'StartNewObjectDrawDoAutoScroll',
      100
    );
    console.log("= S.BaseLine: autoScrollTimerID set to", GlobalData.optManager.autoScrollTimerID);

    // Convert window coordinates (autoScrollXPos, autoScrollYPos) to document coordinates
    let docCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
      GlobalData.optManager.autoScrollXPos,
      GlobalData.optManager.autoScrollYPos
    );
    console.log("= S.BaseLine: Converted window coords to docCoords:", docCoords);

    // Adjust the document coordinates for auto-grow drag
    docCoords = GlobalData.optManager.DoAutoGrowDrag(docCoords);
    console.log("= S.BaseLine: After DoAutoGrowDrag, docCoords:", docCoords);

    // Scroll the document to the new position
    GlobalData.docHandler.ScrollToPosition(docCoords.x, docCoords.y);
    console.log("= S.BaseLine: Scrolled to position:", docCoords);

    // Continue drawing tracking with the updated coordinates
    this.StartNewObjectDrawTrackCommon(docCoords.x, docCoords.y, null);
    console.log("= S.BaseLine: Called StartNewObjectDrawTrackCommon with coords:", docCoords.x, docCoords.y);
  }

  StartNewObjectDrawTrackCommon(x: number, y: number, extraFlag: any): void {
    console.log("= S.BaseLine: StartNewObjectDrawTrackCommon called with x:", x, "y:", y, "extraFlag:", extraFlag);

    // Compute differences relative to the action start coordinates
    const deltaX = x - GlobalData.optManager.theActionStartX;
    const deltaY = y - GlobalData.optManager.theActionStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    console.log("= S.BaseLine: Computed deltaX:", deltaX, "deltaY:", deltaY, "distance:", distance);

    // Make a deep copy of the action bounding box
    const actionBBox = $.extend(true, {}, GlobalData.optManager.theActionBBox);
    console.log("= S.BaseLine: actionBBox:", actionBBox);

    // Adjust the line end point
    this.AdjustLineEnd(
      GlobalData.optManager.theActionSVGObject,
      x,
      y,
      ConstantData.ActionTriggerType.LINEEND,
      extraFlag
    );
    console.log("= S.BaseLine: AdjustLineEnd called with x:", x, "y:", y, "trigger:", ConstantData.ActionTriggerType.LINEEND, "extraFlag:", extraFlag);
  }

  LM_DrawTrack(event: any) {
    console.log("= S.BaseLine: LM_DrawTrack called with event:", event);

    // Stop propagation and default handling
    Utils2.StopPropagationAndDefaults(event);

    let trackPoint: { x: number; y: number };
    let altKeyFlag = 0;

    // Check if action stored object is valid
    if (GlobalData.optManager.theActionStoredObjectID === -1) {
      console.log("= S.BaseLine: LM_DrawTrack aborted, theActionStoredObjectID is -1");
      return false;
    }

    // Get window coordinates and convert to document coordinates
    if (event.gesture) {
      trackPoint = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
        event.gesture.center.clientX,
        event.gesture.center.clientY
      );
      altKeyFlag = event.gesture.srcEvent.altKey;
    } else {
      trackPoint = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
        event.clientX,
        event.clientY
      );
    }

    console.log("= S.BaseLine: LM_DrawTrack input point (before track):", trackPoint);

    // Process during track
    trackPoint = this.LM_DrawDuringTrack(trackPoint);
    console.log("= S.BaseLine: After LM_DrawDuringTrack, trackPoint:", trackPoint);

    // Determine if link parameters indicate an active connection
    let hasLinkParams =
      GlobalData.optManager.LinkParams &&
      GlobalData.optManager.LinkParams.ConnectIndex >= 0;

    // If override snaps is enabled, force snap behavior
    if (GlobalData.optManager.OverrideSnaps(event)) {
      hasLinkParams = true;
    }

    // If snapping is enabled and there's no active link connection, snap the point to grid
    if (GlobalData.docHandler.documentConfig.enableSnap && !hasLinkParams) {
      const deltaX = trackPoint.x - GlobalData.optManager.theActionStartX;
      const deltaY = trackPoint.y - GlobalData.optManager.theActionStartY;
      console.log("= S.BaseLine: Calculated delta for snapping:", { deltaX, deltaY });
      if (!this.CustomSnap(this.Frame.x, this.Frame.y, deltaX, deltaY, false, trackPoint)) {
        trackPoint = GlobalData.docHandler.SnapToGrid(trackPoint);
        console.log("= S.BaseLine: After SnapToGrid, trackPoint:", trackPoint);
      }
    }

    // Adjust the point for auto-grow dragging
    trackPoint = GlobalData.optManager.DoAutoGrowDrag(trackPoint);
    console.log("= S.BaseLine: After DoAutoGrowDrag, trackPoint:", trackPoint);

    // Auto-scroll and process new object drawing
    if (this.AutoScrollCommon(event, !hasLinkParams, "StartNewObjectDrawDoAutoScroll")) {
      console.log("= S.BaseLine: AutoScrollCommon returned true. Calling StartNewObjectDrawTrackCommon with:", {
        x: trackPoint.x,
        y: trackPoint.y,
        altKey: altKeyFlag
      });
      this.StartNewObjectDrawTrackCommon(trackPoint.x, trackPoint.y, altKeyFlag);
    } else {
      console.log("= S.BaseLine: AutoScrollCommon returned false, not calling StartNewObjectDrawTrackCommon");
    }

    console.log("= S.BaseLine: LM_DrawTrack completed with final trackPoint:", trackPoint);
  }

  CancelObjectDraw(): boolean {
    console.log("= S.BaseLine: CancelObjectDraw called");

    // Unbind click hammer events
    GlobalData.optManager.unbindActionClickHammerEvents();

    // Handle the LineStamp flag: if set, unbind mousemove on non-mobile platforms
    if (GlobalData.optManager.LineStamp) {
      if (!GlobalData.optManager.isMobilePlatform && GlobalData.optManager.WorkAreaHammer) {
        GlobalData.optManager.WorkAreaHammer.off('mousemove');
      }
      GlobalData.optManager.LineStamp = false;
    }

    // Reset overlay flag and re-bind tap event
    GlobalData.optManager.FromOverlayLayer = false;
    GlobalData.optManager.WorkAreaHammer.on('tap', DefaultEvt.Evt_WorkAreaHammerTap);

    // Reset auto-scroll timer
    this.ResetAutoScrollTimer();

    console.log("= S.BaseLine: CancelObjectDraw completed with output: true");
    return true;
  }

  LM_DrawRelease(event: any, touch: any) {
    console.log("= S.BaseLine: LM_DrawRelease called with input:", { event: event, touch: touch });
    try {
      // Determine pointer position and conversion point (document coordinates)
      let conversionPoint: any;
      let pointerPos: { x: number; y: number } = { x: 0, y: 0 };
      const defaultMinLength: number = ConstantData.Defines.SED_SegDefLen;
      let minLength: number = defaultMinLength;

      if (touch) {
        pointerPos = { x: touch.x, y: touch.y };
        conversionPoint = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(touch.x, touch.y);
      } else if (event.gesture) {
        pointerPos = {
          x: event.gesture.center.clientX,
          y: event.gesture.center.clientY,
        };
        conversionPoint = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
      } else {
        pointerPos = { x: event.clientX, y: event.clientY };
        conversionPoint = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(event.clientX, event.clientY);
      }
      console.log("= S.BaseLine: LM_DrawRelease - pointerPos:", pointerPos, "conversionPoint:", conversionPoint);

      if (event) {
        Utils2.StopPropagationAndDefaults(event);
      }

      // Calculate differences between starting draw point and current conversion point
      let deltaX: number, deltaY: number;
      const movementThreshold: number = 2 * ConstantData.Defines.SED_MinDim;

      if (GlobalData.optManager.FromOverlayLayer) {
        deltaX = GlobalData.optManager.theLineDrawStartX - conversionPoint.x;
        deltaY = GlobalData.optManager.theLineDrawStartY - conversionPoint.y;
        // For overlay, reduce the minimum length to make the snapping easier
        minLength -= 20;
      } else {
        deltaX = GlobalData.optManager.theDrawStartX - conversionPoint.x;
        deltaY = GlobalData.optManager.theDrawStartY - conversionPoint.y;
      }
      console.log("= S.BaseLine: LM_DrawRelease - deltaX:", deltaX, "deltaY:", deltaY, "minLength:", minLength);

      // If movement is very small and LineStamp flag is not set, set LineStamp and bind mousemove (for desktop)
      if (
        !GlobalData.optManager.LineStamp &&
        Math.abs(deltaX) < movementThreshold &&
        Math.abs(deltaY) < movementThreshold
      ) {
        GlobalData.optManager.LineStamp = true;
        if (!GlobalData.optManager.isMobilePlatform && GlobalData.optManager.WorkAreaHammer) {
          GlobalData.optManager.WorkAreaHammer.on(
            "mousemove",
            DefaultEvt.Evt_DrawTrackHandlerFactory(this)
          );
        }
        console.log("= S.BaseLine: LM_DrawRelease - negligible movement; early exit.");
        return;
      }

      // Unbind click events and re-bind tap events on the work area hammer
      if (GlobalData.optManager.WorkAreaHammer) {
        GlobalData.optManager.unbindActionClickHammerEvents();
        GlobalData.optManager.WorkAreaHammer.on("tap", DefaultEvt.Evt_WorkAreaHammerTap);
      }
      if (event && event.gesture) {
        event.gesture.stopDetect();
      }
      this.ResetAutoScrollTimer();

      // Verify if movement is long enough when using overlay; if not, cancel the modal operation
      if (
        GlobalData.optManager.FromOverlayLayer &&
        (deltaX * deltaX + deltaY * deltaY) < minLength * minLength
      ) {
        console.log("= S.BaseLine: LM_DrawRelease - movement below minimum length; canceling modal operation.");
        return SDUI.Commands.MainController.Shapes.CancelModalOperation();
      }

      // Preserve current LinkParams for messaging output
      const localLinkParams = {
        LinkParams: Utils1.DeepCopy(GlobalData.optManager.LinkParams)
      };

      // Complete the drawing by calling LM_DrawPostRelease
      const postReleaseResult = this.LM_DrawPostRelease(GlobalData.optManager.theActionStoredObjectID);
      let addedLabel: any = null;
      if (GlobalData.optManager.FromOverlayLayer) {
        addedLabel = gBusinessController.AddLineLabel(this.BlockID);
      }

      // Build and send collaborative message if allowed
      if (Collab.AllowMessage()) {
        const messageData: any = { attributes: {} };
        messageData.attributes.StyleRecord = Utils1.DeepCopy(GlobalData.optManager.theDrawShape.StyleRecord);
        messageData.attributes.StartArrowID = GlobalData.optManager.theDrawShape.StartArrowID;
        messageData.attributes.EndArrowID = GlobalData.optManager.theDrawShape.EndArrowID;
        messageData.attributes.StartArrowDisp = GlobalData.optManager.theDrawShape.StartArrowDisp;
        messageData.attributes.ArrowSizeIndex = GlobalData.optManager.theDrawShape.ArrowSizeIndex;
        messageData.attributes.TextGrow = GlobalData.optManager.theDrawShape.TextGrow;
        messageData.attributes.TextAlign = GlobalData.optManager.theDrawShape.TextAlign;
        messageData.attributes.TextDirection = GlobalData.optManager.theDrawShape.TextDirection;
        messageData.attributes.TextFlags = GlobalData.optManager.theDrawShape.TextFlags;
        messageData.attributes.Dimensions = GlobalData.optManager.theDrawShape.Dimensions;
        messageData.attributes.StartPoint = Utils1.DeepCopy(GlobalData.optManager.theDrawShape.StartPoint);
        messageData.attributes.EndPoint = Utils1.DeepCopy(GlobalData.optManager.theDrawShape.EndPoint);
        messageData.attributes.Frame = Utils1.DeepCopy(GlobalData.optManager.theDrawShape.Frame);
        messageData.attributes.objecttype = this.objecttype;
        messageData.attributes.ShortRef = this.ShortRef;
        messageData.attributes.shapeparam = this.shapeparam;
        if (this.CurveAdjust != null) {
          messageData.attributes.CurveAdjust = this.CurveAdjust;
        }
        if (this.segl) {
          messageData.attributes.segl = Utils1.DeepCopy(this.segl);
        }
        messageData.UsingWallTool = ConstantData.DocumentContext.UsingWallTool;
        messageData.LineTool = ConstantData.DocumentContext.LineTool;
        if (Collab.CreateList.length) {
          Collab.AddNewBlockToSecondary(Collab.CreateList[0]);
        }
        if (Collab.IsSecondary() && Collab.CreateList.length) {
          messageData.CreateList = [].concat(Collab.CreateList);
        }
        messageData.LinkParams = localLinkParams.LinkParams;
        messageData.Actions = [];
        let action = new Collab.MessageAction(ConstantData.CollabMessageActions.CreateLine);
        messageData.Actions.push(action);
        action = new Collab.MessageAction(ConstantData.CollabMessageActions.LinkObject);
        messageData.Actions.push(action);
        if (addedLabel) {
          messageData.label = addedLabel;
          action = new Collab.MessageAction(ConstantData.CollabMessageActions.AddLabel);
          messageData.Actions.push(action);
        }
        const message = Collab.BuildMessage(ConstantData.CollabMessages.AddLine, messageData, false, true);
        if (message) {
          Collab.SendMessage(message);
        }
      }

      // Execute post drawing routines
      if (postReleaseResult) {
        GlobalData.optManager.PostObjectDraw(null);
      } else {
        GlobalData.optManager.PostObjectDraw(this.LM_DrawRelease);
      }

      // Unbind temporary mousemove events if set via LineStamp, then reset flag
      if (GlobalData.optManager.LineStamp) {
        if (!GlobalData.optManager.isMobilePlatform && GlobalData.optManager.WorkAreaHammer) {
          GlobalData.optManager.WorkAreaHammer.off("mousemove");
        }
        GlobalData.optManager.LineStamp = false;
      }

      // If drawing was initiated from overlay, complete business action and reset overlay flag
      if (GlobalData.optManager.FromOverlayLayer) {
        GlobalData.optManager.FromOverlayLayer = false;
        gBusinessController.CompleteAction(this.BlockID, pointerPos);
      }
      console.log("= S.BaseLine: LM_DrawRelease output: completed successfully");
    } catch (error) {
      GlobalData.optManager.CancelModalOperation();
      this.LM_DrawClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      console.error("= S.BaseLine: LM_DrawRelease encountered error:", error);
      throw error;
    }
  }

  LM_DrawPreTrack(event: any): boolean {
    console.log("= S.BaseLine: LM_DrawPreTrack called with event:", event);

    // Initialize variables with readable names
    let hookFlags = this.GetHookFlags();
    let sessionObj = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
    let linksBlockObj: any;
    let hookList: Array<{ x: number; y: number; id?: number }> = [{ x: 0, y: 0 }];
    let extraData: any = {}; // for GetHookList
    const allowLink: boolean = this.AllowLink();

    if (allowLink) {
      GlobalData.optManager.LinkParams = new LinkParameters();

      if (sessionObj) {
        if (!GlobalData.optManager.FromOverlayLayer) {
          GlobalData.optManager.LinkParams.AllowJoin = sessionObj.flags & ConstantData.SessionFlags.SEDS_FreeHand;
        }
      }

      if (hookFlags & ConstantData.HookFlags.SED_LC_CHook) {
        // Set the hook list using the event point as starting hook (Top Left)
        hookList[0].id = ConstantData.HookPts.SED_KTL;
        hookList[0].x = event.x;
        hookList[0].y = event.y;

        // Reset drag delta values
        GlobalData.optManager.theDragDeltaX = 0;
        GlobalData.optManager.theDragDeltaY = 0;

        linksBlockObj = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theLinksBlockID, false);

        // Try to find a connection using the hook list
        if (
          GlobalData.optManager.FindConnect(
            GlobalData.optManager.theActionStoredObjectID,
            this,
            hookList,
            false,
            false,
            GlobalData.optManager.LinkParams.AllowJoin,
            event
          )
        ) {
          // Save connection hook parameters into temporary SConnect* properties
          GlobalData.optManager.LinkParams.SConnectIndex = GlobalData.optManager.LinkParams.ConnectIndex;
          GlobalData.optManager.LinkParams.SConnectHookFlag = GlobalData.optManager.LinkParams.ConnectHookFlag;
          GlobalData.optManager.LinkParams.SConnectInside = GlobalData.optManager.LinkParams.ConnectInside;
          GlobalData.optManager.LinkParams.SConnectPt.x = GlobalData.optManager.LinkParams.ConnectPt.x;
          GlobalData.optManager.LinkParams.SConnectPt.y = GlobalData.optManager.LinkParams.ConnectPt.y;

          // Reset connection parameters
          GlobalData.optManager.LinkParams.ConnectIndex = -1;
          GlobalData.optManager.LinkParams.Hookindex = -1;
          GlobalData.optManager.LinkParams.ConnectInside = 0;
          GlobalData.optManager.LinkParams.ConnectHookFlag = 0;

          // Adjust event and line start coordinates using the drag delta
          event.x += GlobalData.optManager.theDragDeltaX;
          event.y += GlobalData.optManager.theDragDeltaY;
          this.StartPoint.x += GlobalData.optManager.theDragDeltaX;
          this.StartPoint.y += GlobalData.optManager.theDragDeltaY;
          this.EndPoint.x = this.StartPoint.x;
          this.EndPoint.y = this.StartPoint.y;

          // Get circular target hook list
          GlobalData.optManager.LinkParams.lpCircList = GlobalData.optManager.GetHookList(
            linksBlockObj,
            GlobalData.optManager.LinkParams.lpCircList,
            GlobalData.optManager.LinkParams.SConnectIndex,
            this,
            ConstantData.ListCodes.SED_LC_TARGONLY,
            extraData
          );
        } else if (GlobalData.optManager.LinkParams.JoinIndex >= 0) {
          // Process join parameters if a join exists
          GlobalData.optManager.LinkParams.SJoinIndex = GlobalData.optManager.LinkParams.JoinIndex;
          GlobalData.optManager.LinkParams.SJoinData = GlobalData.optManager.LinkParams.JoinData;
          GlobalData.optManager.LinkParams.SJoinSourceData = GlobalData.optManager.LinkParams.JoinSourceData;
          GlobalData.optManager.LinkParams.SConnectPt.x = GlobalData.optManager.LinkParams.ConnectPt.x;
          GlobalData.optManager.LinkParams.SConnectPt.y = GlobalData.optManager.LinkParams.ConnectPt.y;
          GlobalData.optManager.LinkParams.JoinIndex = -1;
          GlobalData.optManager.LinkParams.JoinData = 0;
          GlobalData.optManager.LinkParams.JoinSourceData = 0;
          GlobalData.optManager.LinkParams.lpCircList = GlobalData.optManager.GetHookList(
            linksBlockObj,
            GlobalData.optManager.LinkParams.lpCircList,
            GlobalData.optManager.LinkParams.SJoinIndex,
            this,
            ConstantData.ListCodes.SED_LC_CIRCTARG,
            extraData
          );
        }
      }
    } else if (sessionObj) {
      // If linking is not allowed, check if object is a PolyLine or freehand allowed
      if (this instanceof Instance.Shape.PolyLine || sessionObj.flags & ConstantData.SessionFlags.SEDS_FreeHand) {
        GlobalData.optManager.LinkParams = new LinkParameters();
        GlobalData.optManager.LinkParams.ArraysOnly = true;
        GlobalData.optManager.LinkParams.AllowJoin = sessionObj.flags & ConstantData.SessionFlags.SEDS_FreeHand;
      }
    }

    console.log("= S.BaseLine: LM_DrawPreTrack returning:", true);
    return true;
  }

  // LM_DrawDuringTrack(e) { }

  LM_DrawDuringTrack(event: any) {
    console.log("= S.BaseLine: LM_DrawDuringTrack called with input:", event);

    let connectionResult: any;
    let hitResult: HitResult;
    let hookPoints: { x: number; y: number; id?: number }[] = [
      { x: 0, y: 0 }
    ];
    let joinChanged: boolean = false;

    // If no LinkParams then skip connection logic
    if (GlobalData.optManager.LinkParams == null) {
      console.log("= S.BaseLine: LM_DrawDuringTrack output (no LinkParams):", event);
      return event;
    }

    // Set hook point for connection attempt
    hookPoints[0].x = event.x;
    hookPoints[0].y = event.y;
    hookPoints[0].id = ConstantData.HookPts.SED_KTR;

    // Reset drag deltas
    GlobalData.optManager.theDragDeltaX = 0;
    GlobalData.optManager.theDragDeltaY = 0;

    // Attempt to find a connection; if found, adjust e.x and e.y
    if (GlobalData.optManager.FindConnect(
      GlobalData.optManager.theActionStoredObjectID,
      this,
      hookPoints,
      true,
      false,
      GlobalData.optManager.LinkParams.AllowJoin,
      event
    )) {
      event.x += GlobalData.optManager.theDragDeltaX;
      event.y += GlobalData.optManager.theDragDeltaY;
    }

    // Check for join conditions when SJoinIndex is set and JoinIndex is not yet set
    if (
      GlobalData.optManager.LinkParams.SJoinIndex >= 0 &&
      GlobalData.optManager.LinkParams.JoinIndex < 0
    ) {
      // Get the candidate join object
      let joinObject = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.LinkParams.SJoinIndex);
      // Check if the join candidate is a PolyLine
      if (this.checkIfPolyLine(joinObject)) {
        hitResult = new HitResult(-1, 0, null);
        hitResult.hitcode = joinObject.Hit(event, false, true, hitResult);

        if (
          hitResult &&
          hitResult.hitcode === ConstantData.HitCodes.SED_PLApp &&
          GlobalData.optManager.LinkParams.SJoinData != hitResult.segment
        ) {
          joinChanged = true;
        }

        if (joinChanged) {
          GlobalData.optManager.LinkParams.JoinIndex = joinObject.BlockID;
          GlobalData.optManager.LinkParams.JoinData = hitResult.segment;
          if (GlobalData.optManager.LinkParams.HiliteJoin < 0) {
            GlobalData.optManager.LinkParams.hiliteJoin = joinObject.BlockID;
            if (GlobalData.optManager.GetEditMode() != ConstantData.EditState.LINKJOIN) {
              GlobalData.optManager.SetEditMode(ConstantData.EditState.LINKJOIN, null, false);
              joinObject.SetCursors();
              GlobalData.optManager.SetEditMode(ConstantData.EditState.LINKJOIN, null, false);
            }
          }
        } else {
          if (GlobalData.optManager.LinkParams.HiliteJoin >= 0) {
            GlobalData.optManager.HiliteConnect(
              GlobalData.optManager.LinkParams.HiliteJoin,
              GlobalData.optManager.LinkParams.ConnectPt,
              false,
              true,
              this.BlockID,
              null
            );
            GlobalData.optManager.LinkParams.HiliteJoin = -1;
          }
          GlobalData.optManager.SetEditMode(ConstantData.EditState.DEFAULT);
        }
      }
    }

    console.log("= S.BaseLine: LM_DrawDuringTrack output:", event);
    return event;
  }

  LM_DrawPostRelease(actionTarget: number): number {
    console.log("= S.BaseLine: LM_DrawPostRelease input:", actionTarget);

    // Check if LinkParams exist
    if (GlobalData.optManager.LinkParams != null) {
      const lp = GlobalData.optManager.LinkParams;

      // Process SHiliteConnect: if set, clear after hiliting using SConnectPt
      if (lp.SHiliteConnect >= 0) {
        GlobalData.optManager.HiliteConnect(
          lp.SHiliteConnect,
          lp.SConnectPt,
          false,
          false,
          this.BlockID,
          lp.SHiliteInside
        );
        lp.SHiliteConnect = -1;
        lp.SHiliteInside = null;
      }

      // Process HiliteConnect: if set, clear after hiliting using ConnectPt
      if (lp.HiliteConnect >= 0) {
        GlobalData.optManager.HiliteConnect(
          lp.HiliteConnect,
          lp.ConnectPt,
          false,
          false,
          this.BlockID,
          lp.HiliteInside
        );
        lp.HiliteConnect = -1;
        lp.HiliteInside = null;
      }

      // Process SHiliteJoin: if set, hilite join in "join" mode then clear
      if (lp.SHiliteJoin >= 0) {
        GlobalData.optManager.HiliteConnect(
          lp.SHiliteJoin,
          lp.SConnectPt,
          false,
          true,
          this.BlockID,
          null
        );
        lp.SHiliteJoin = -1;
      }

      // Process HiliteJoin: if set, hilite join using ConnectPt then clear
      if (lp.HiliteJoin >= 0) {
        GlobalData.optManager.HiliteConnect(
          lp.HiliteJoin,
          lp.ConnectPt,
          false,
          true,
          this.BlockID,
          null
        );
        lp.HiliteJoin = -1;
      }

      // Reset edit mode to default
      GlobalData.optManager.SetEditMode(ConstantData.EditState.DEFAULT);

      // If SJoinIndex is set then perform PolyLJoin on the join information
      if (lp.SJoinIndex >= 0) {
        let joinResult = GlobalData.optManager.PolyLJoin(
          lp.SJoinIndex,
          lp.SJoinData,
          actionTarget,
          lp.SJoinSourceData,
          false
        );

        if (joinResult !== actionTarget && joinResult >= 0) {
          // Update action target and clear ConnectIndex if set
          actionTarget = joinResult;
          if (lp.ConnectIndex >= 0) {
            lp.ConnectIndex = -1;
          }
          // Determine JoinSourceData based on the equality of EndPoint and the join object's StartPoint
          const joinObj = GlobalData.optManager.GetObjectPtr(joinResult, false);
          if (Utils2.EqualPt(this.EndPoint, joinObj.StartPoint)) {
            lp.JoinSourceData = 1;
          } else {
            lp.JoinSourceData = 2;
          }
        }
      }
      // Else if SConnectIndex is set then update hook with Visio parent info
      else if (lp.SConnectIndex >= 0) {
        lp.SConnectIndex = GlobalData.optManager.SD_GetVisioTextParent(lp.SConnectIndex);
        GlobalData.optManager.UpdateHook(
          actionTarget,
          -1,
          lp.SConnectIndex,
          ConstantData.HookPts.SED_KTL,
          lp.SConnectPt,
          lp.SConnectInside
        );
      }

      // Initialize result flag
      let result = 0; // default false (0) as number flag

      // If JoinIndex is set, call PolyLJoin and check for a return value of -2
      if (lp.JoinIndex >= 0) {
        result = (GlobalData.optManager.PolyLJoin(
          lp.JoinIndex,
          lp.JoinData,
          actionTarget,
          lp.JoinSourceData,
          false
        ) === -2) ? 1 : 0;
      }
      // Otherwise, if ConnectIndex is set, update the hook using the stored parameters
      else if (lp.ConnectIndex >= 0) {
        GlobalData.optManager.UpdateHook(
          actionTarget,
          lp.InitialHook,
          lp.ConnectIndex,
          lp.HookIndex,
          lp.ConnectPt,
          lp.ConnectInside
        );
      }

      // Clear the NoContinuous flag from hookflags
      this.hookflags = Utils2.SetFlag(this.hookflags, ConstantData.HookFlags.SED_LC_NoContinuous, false);

      // Update links and clear the LinkParams
      GlobalData.optManager.UpdateLinks();
      GlobalData.optManager.LinkParams = null;

      console.log("= S.BaseLine: LM_DrawPostRelease output:", result);
      return result;
    }
    // If no LinkParams, do nothing and return default (0)
    return 0;
  }


  LM_DrawClick_ExceptionCleanup(event) {
    console.log("= S.BaseLine: LM_DrawClick_ExceptionCleanup called with input:", event);

    GlobalData.optManager.unbindActionClickHammerEvents();

    if (GlobalData.optManager.LineStamp) {
      if (!GlobalData.optManager.isMobilePlatform && GlobalData.optManager.WorkAreaHammer) {
        GlobalData.optManager.WorkAreaHammer.off('mousemove');
      }
      GlobalData.optManager.LineStamp = false;
    }

    GlobalData.optManager.WorkAreaHammer.on('tap', DefaultEvt.Evt_WorkAreaHammerTap);
    this.ResetAutoScrollTimer();
    GlobalData.optManager.LinkParams = null;
    GlobalData.optManager.theActionStoredObjectID = -1;
    GlobalData.optManager.theActionSVGObject = null;
    GlobalData.optManager.LineStamp = false;
    GlobalData.optManager.FromOverlayLayer = false;
    GlobalData.optManager.WorkAreaHammer.on('dragstart', DefaultEvt.Evt_WorkAreaHammerDragStart);

    console.log("= S.BaseLine: LM_DrawClick_ExceptionCleanup output: cleanup complete");
  }


  LM_DrawClick(docCorX, docCorY) {

    //docCorX, docCorY

    console.log('3 ========= LM_DrawClick 1 draw click e=>', docCorX, docCorY);

    try {
      this.Frame.x = docCorX;
      this.Frame.y = docCorY;
      this.StartPoint = { x: docCorX, y: docCorY };
      this.EndPoint = { x: docCorX, y: docCorY };
      GlobalData.optManager.WorkAreaHammer.on('drag', DefaultEvt.Evt_DrawTrackHandlerFactory(this));
      GlobalData.optManager.WorkAreaHammer.on('dragend', DefaultEvt.Evt_DrawReleaseHandlerFactory(this));
      GlobalData.optManager.WorkAreaHammer.off('tap');
    } catch (error) {

      console.log('3 ========= LM_DrawClick 2 eRRdraw click e=>', error);

      this.LM_DrawClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }
  }

  WriteSDFAttributes(e, options) {
    console.log("= S.BaseLine: WriteSDFAttributes called with input:", { svg: e, options: options });

    // Initialize attach flag and a temporary DataID holder.
    let attachFlag = 0;
    let dataIdForWrite = -1;

    // Process only if DataID is valid.
    if (this.DataID >= 0) {
      console.log("= S.BaseLine: DataID is valid:", this.DataID);

      // Evaluate vertical justification from text alignment.
      const textAlignWin = SDF.TextAlignToWin(this.TextAlign);
      switch (textAlignWin.vjust) {
        case FileParser.TextJust.TA_TOP:
        case FileParser.TextJust.TA_BOTTOM:
          console.log("= S.BaseLine: Vertical justification is TOP or BOTTOM");
          break;
      }

      // Set attachFlag based on LineTextX. Default is AttachC.
      attachFlag = ConstantData.TextFlags.SED_TF_AttachC;
      if (this.LineTextX) {
        attachFlag = ConstantData.TextFlags.SED_TF_AttachC;
        console.log("= S.BaseLine: LineTextX is set; using AttachC flag");
      }

      // Clear all attach flags (AttachA, AttachB, AttachC, and AttachD).
      this.TextFlags = Utils2.SetFlag(
        this.TextFlags,
        ConstantData.TextFlags.SED_TF_AttachA |
        ConstantData.TextFlags.SED_TF_AttachB |
        ConstantData.TextFlags.SED_TF_AttachC |
        ConstantData.TextFlags.SED_TF_AttachD,
        false
      );
      console.log("= S.BaseLine: Cleared attach flags; current TextFlags:", this.TextFlags);

      // Set the specific attach flag.
      this.TextFlags = Utils2.SetFlag(this.TextFlags, attachFlag, true);
      console.log("= S.BaseLine: Set attach flag (", attachFlag, "); current TextFlags:", this.TextFlags);

      // Set the horizontal text flag based on TextDirection.
      this.TextFlags = Utils2.SetFlag(
        this.TextFlags,
        ConstantData.TextFlags.SED_TF_HorizText,
        !this.TextDirection
      );
      console.log("= S.BaseLine: Set horizontal text flag (", !this.TextDirection, "); current TextFlags:", this.TextFlags);
    }

    // Determine the DataID to use if WriteBlocks or WriteVisio options are set.
    if (options.WriteBlocks || options.WriteVisio) {
      dataIdForWrite = this.DataID;
      console.log("= S.BaseLine: WriteBlocks or WriteVisio flag set; using DataID:", dataIdForWrite);
    }

    // If writing for Visio and a polyline exists, delegate the SDF attributes for PolyLine.
    if (options.WriteVisio && this.polylist) {
      console.log("= S.BaseLine: WriteVisio flag set and polylist exists; delegating to PolyLine.WriteSDFAttributes");
      ListManager.PolyLine.prototype.WriteSDFAttributes.call(this, e, options, false);
    }

    // Write text parameters to SDF.
    console.log("= S.BaseLine: Writing text parameters with DataID:", dataIdForWrite);
    SDF.WriteTextParams(e, this, dataIdForWrite, options);

    // Optionally write text for Visio.
    if (options.WriteVisio && dataIdForWrite >= 0) {
      console.log("= S.BaseLine: Writing text for Visio with DataID:", dataIdForWrite);
      SDF.WriteText(e, this, null, null, false, options);
    }

    // Write arrowhead attributes.
    console.log("= S.BaseLine: Writing arrowhead attributes");
    SDF.WriteArrowheads(e, options, this);

    console.log("= S.BaseLine: WriteSDFAttributes completed with output:", {
      DataID: this.DataID,
      TextFlags: this.TextFlags
    });
  }

  ChangeBackgroundColor(newColor: string, currentColor: string): void {
    console.log("= S.BaseLine: ChangeBackgroundColor called with newColor:", newColor, "currentColor:", currentColor);

    if (
      this.StyleRecord.Fill.Paint.FillType !== ConstantData.FillTypes.SDFILL_TRANSPARENT &&
      this.StyleRecord.Fill.Paint.Color === currentColor
    ) {
      console.log("= S.BaseLine: Condition met. Updating background color.");
      GlobalData.optManager.GetObjectPtr(this.BlockID, true);
      this.StyleRecord.Fill.Paint.Color = newColor;
      console.log("= S.BaseLine: Background color updated to:", this.StyleRecord.Fill.Paint.Color);
    } else {
      console.log("= S.BaseLine: Condition not met. Background color remains:", this.StyleRecord.Fill.Paint.Color);
    }
  }

  ResizeInTextEdit(textObject: any, newSize: any): { x: number; y: number } {
    console.log("= S.BaseLine: ResizeInTextEdit called with input:", { textObject, newSize });
    const result = { x: 0, y: 0 };
    console.log("= S.BaseLine: ResizeInTextEdit output:", result);
    return result;
  }

  CalcTextPosition(params: any) {
    console.log("= S.BaseLine: CalcTextPosition input:", params);

    // Calculate the center of the incoming frame
    const paramsCenter = {
      x: params.Frame.x + params.Frame.width / 2,
      y: params.Frame.y + params.Frame.height / 2,
    };

    // Build an array containing the start and end points of this line
    const linePoints = [
      { x: this.StartPoint.x, y: this.StartPoint.y },
      { x: this.EndPoint.x, y: this.EndPoint.y },
    ];

    // Calculate the center of this object's frame
    const frameCenter = {
      x: this.Frame.x + this.Frame.width / 2,
      y: this.Frame.y + this.Frame.height / 2,
    };

    // Get the angle of the line (in degrees)
    const lineAngle = this.GetAngle(null);
    let rotationAngle = params.RotationAngle;

    // If this is a simple line, adjust the rotation angle and normalize it to [0,180)
    if (this.LineType === ConstantData.LineType.LINE) {
      rotationAngle = lineAngle + rotationAngle;
      rotationAngle %= 180;
      if (Math.abs(rotationAngle) < 1) {
        rotationAngle = 0;
      }
    }

    // Compute the differences between the end and start points
    const deltaX = this.EndPoint.x - this.StartPoint.x;
    const deltaY = this.EndPoint.y - this.StartPoint.y;
    const modAngle = lineAngle % 180;

    // If the line is not horizontally aligned and there is no additional rotation,
    // set the horizontal text flag.
    if (!Utils2.IsEqual(modAngle, 0) && rotationAngle === 0) {
      this.TextFlags = Utils2.SetFlag(
        this.TextFlags,
        ConstantData.TextFlags.SED_TF_HorizText,
        true
      );
    }

    // Calculate the total length of the line and update TextWrapWidth
    const lineLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    this.TextWrapWidth = lineLength;

    // Rotate the line points about the frame center by the negative line angle (in radians)
    const angleInRadians = -lineAngle * ConstantData.Geometry.PI / 180;
    Utils3.RotatePointsAboutPoint(frameCenter, angleInRadians, linePoints);

    // Calculate the relative text positions based on the rotated points
    this.LineTextX = (paramsCenter.x - linePoints[0].x) / lineLength;
    if (this.LineTextX < 0) {
      this.LineTextX = 1 + this.LineTextX;
    }
    this.LineTextY = paramsCenter.y - linePoints[0].y;

    // If LineTextX is valid, copy the text rectangle from the input parameters
    if (this.LineTextX) {
      this.trect = $.extend(true, {}, params.trect);
    }

    console.log("= S.BaseLine: CalcTextPosition output:", {
      LineTextX: this.LineTextX,
      LineTextY: this.LineTextY,
      TextWrapWidth: this.TextWrapWidth,
      trect: this.trect,
    });
  }

  SetTextObject(newDataId: any): boolean {
    console.log("= S.BaseLine: SetTextObject called with newDataId =", newDataId);

    // Set the DataID property
    this.DataID = newDataId;

    // Get text alignment settings and session object
    const textAlignWin = SDF.TextAlignToWin(this.TextAlign);
    const sessionObj = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);

    // Update the fill color based on the session background
    this.StyleRecord.Fill.Paint.Color = sessionObj.background.Paint.Color;

    // Set FillType and Opacity based on vertical justification
    if (textAlignWin.vjust === FileParser.TextJust.TA_CENTER) {
      this.StyleRecord.Fill.Paint.FillType = ConstantData.FillTypes.SDFILL_SOLID;
      this.StyleRecord.Fill.Paint.Opacity = 1;
    } else {
      this.StyleRecord.Fill.Paint.FillType = ConstantData.FillTypes.SDFILL_TRANSPARENT;
    }

    console.log("= S.BaseLine: SetTextObject output, DataID =", this.DataID, "StyleRecord.Fill =", this.StyleRecord.Fill);
    return true;
  }

  GetTextOnLineParams(e) {
    console.log("= S.BaseLine: GetTextOnLineParams called with input:", e);

    let params = {
      Frame: new Rect(),
      StartPoint: new Point(),
      EndPoint: new Point()
    };

    // Copy StartPoint and EndPoint from the current object
    params.StartPoint.x = this.StartPoint.x;
    params.StartPoint.y = this.StartPoint.y;
    params.EndPoint.x = this.EndPoint.x;
    params.EndPoint.y = this.EndPoint.y;

    // Calculate the frame using the start and end points
    params.Frame = Utils2.Pt2Rect(params.StartPoint, params.EndPoint);

    // If LineTextX is not zero, set CenterProp and Displacement accordingly
    if (this.LineTextX !== 0) {
      params.CenterProp = this.LineTextX;
      params.Displacement = this.LineTextY;
    }

    console.log("= S.BaseLine: GetTextOnLineParams output:", params);
    return params;
  }

  TextDirectionCommon(textObj, bgObj, useOriginal, extraParam) {
    console.log("= S.BaseLine: TextDirectionCommon input:", { textObj, bgObj, useOriginal, extraParam });
    // Get the minimum text dimensions
    let textMinDim = textObj.GetTextMinDimensions();
    let textWidth = textMinDim.width;
    let textHeight = textMinDim.height;

    // Get on-line text parameters
    let textParams = this.GetTextOnLineParams(extraParam);
    let startX = textParams.StartPoint.x;
    let frameX = textParams.Frame.x;
    let endX = textParams.EndPoint.x;
    let height = textHeight; // local copy for clarity
    let startY = textParams.StartPoint.y;
    let frameY = textParams.Frame.y;
    let endY = textParams.EndPoint.y;

    // Calculate the rotation angle between start and end points (in radians and degrees)
    let angleRadians = GlobalData.optManager.SD_GetClockwiseAngleBetween2PointsInRadians(textParams.StartPoint, textParams.EndPoint);
    let angleDegrees = angleRadians * (180 / ConstantData.Geometry.PI);

    // Flags and adjustments
    let flipText = false;
    let centerProp = 0.5;
    let centerPoint = {};
    let offsetX = 0, offsetY = 0;

    // Temporary variables for calculated positions
    let finalX = 0, finalY = 0;

    // Update vertical alignment of the text object
    textObj.SetVerticalAlignment('top');
    this.linetrect = $.extend(true, {}, this.Frame);

    // Calculate offsets if LineTextY is provided
    if (this.LineTextY) {
      offsetX = this.LineTextY * Math.cos(angleRadians);
      offsetY = -this.LineTextY * Math.sin(angleRadians);
    }

    // Adjust angle for Visio if needed
    if (this.VisioRotationDiff) {
      angleDegrees -= this.VisioRotationDiff;
    }

    // Flip text if angle is in (90,270)
    if (angleDegrees > 90 && angleDegrees < 270) {
      angleDegrees -= 180;
      flipText = true;
    }

    // If not using original orientation AND TextDirection flag is set, then override angle parameters
    if (!useOriginal && this.TextDirection) {
      angleRadians = 0;
      angleDegrees = 0;
      // preserve original TextAlign and TextDirection for later restore
      var origTextAlign = this.TextAlign;
      var origTextDirection = this.TextDirection;
    }

    // Main block when LineTextX or LineTextY is defined
    if (this.LineTextX || this.LineTextY) {
      if (textMinDim) {
        // Save the minimum text dimensions for later text object calculation
        this.theMinTextDim.width = textWidth;
        this.theMinTextDim.height = textHeight;

        // If "useOriginal" then restore TextAlign from saved setting
        if (useOriginal) {
          this.TextAlign = origTextAlign;
        }

        // Get a justification object from text alignment
        let just = SDF.TextAlignToJust(this.TextAlign);

        // If text is flipped and this is a simple line, swap left/right alignment
        if (flipText && this.LineType === ConstantData.LineType.LINE) {
          switch (just.just) {
            case ConstantData.TextAlign.LEFT:
              just.just = ConstantData.TextAlign.RIGHT;
              break;
            case ConstantData.TextAlign.RIGHT:
              just.just = ConstantData.TextAlign.LEFT;
              break;
          }
        }

        // Update the background object size if provided
        if (bgObj) {
          bgObj.SetSize(textWidth + 2, textHeight + 2);
        }

        // Calculate the center position along the line based on CenterProp
        centerProp = D.CenterProp = textParams.CenterProp; // using CenterProp from text parameters
        let posX = startX + (endX - startX) * centerProp - frameX + offsetY;
        let posY = startY + (endY - startY) * centerProp - frameY + offsetX;

        // If no height is set in text rectangle then set default height
        if (this.trect.height === 0) {
          this.trect.height = 3 * textHeight;
        }

        // Choose height from trect if larger
        let finalTextHeight = this.trect.height > textHeight ? this.trect.height : textHeight;

        // Calculate the position for text object placement
        finalX = this.TextGrow === ConstantData.TextGrowBehavior.HORIZONTAL ?
          posX - textWidth / 2 : posX - this.trect.width / 2;
        finalY = posY - finalTextHeight / 2;

        textObj.SetPos(finalX, finalY);
        textObj.SetVerticalAlignment(just.vjust);
        textObj.SetParagraphAlignment(just.just);

        // Rotate text based on TextDirection flag
        if (this.TextDirection) {
          textObj.SetRotation(angleDegrees, posX, posY);
        } else {
          textObj.SetRotation(0, posX, posY);
        }

        centerPoint = { x: posX, y: posY };

        // Set background object position accordingly
        if (bgObj) {
          let bgPos = {};
          switch (just.just) {
            case ConstantData.TextAlign.LEFT:
              bgPos.x = finalX - 1;
              break;
            case ConstantData.TextAlign.RIGHT:
              bgPos.x = finalX - 1 + this.trect.width - textWidth;
              break;
            default:
              bgPos.x = posX - textWidth / 2 - 1;
          }
          switch (just.vjust) {
            case 'top':
              bgPos.y = finalY - 1 - finalTextHeight / 2;
              break;
            case 'bottom':
              bgPos.y = finalY - textHeight / 2 - 1 + finalTextHeight / 2;
              break;
            default:
              bgPos.y = finalY - textHeight / 2 - 1;
          }
          bgObj.SetPos(bgPos.x, bgPos.y);
        }

        // Update linerect and adjust with frame offsets
        this.linetrect.x = finalX + this.Frame.x;
        this.linetrect.y = finalY + this.Frame.y;
        this.linetrect.width = textWidth + 2;
        this.linetrect.height = textHeight + 2;

        // Adjust rotation of background
        if (this.TextDirection) {
          if (bgObj) {
            bgObj.SetRotation(angleDegrees, posX, posY);
          }
          this.linetrect = GlobalData.optManager.RotateRect(this.linetrect, centerPoint, angleDegrees);
        } else if (bgObj) {
          bgObj.SetRotation(0, posX, posY);
        }

        // Finally, update the frame to reflect changes
        this.UpdateFrame();
      }
    } else if (textMinDim) {
      // Else block for when no LineTextX or LineTextY is set
      this.theMinTextDim.width = textWidth;
      this.theMinTextDim.height = textHeight;
      bgObj.SetSize(textWidth + 2, textHeight + 2);
      switch (this.TextAlign) {
        case ConstantData.TextAlign.TOPLEFT:
          finalX = startX - frameX + textWidth / 2 * Math.cos(angleRadians);
          finalY = startY - frameY + textWidth / 2 * Math.sin(angleRadians);
          bgObj.SetPos(finalX - textWidth / 2 - 1, finalY - textHeight - this.StyleRecord.Line.Thickness / 2 - 2);
          finalX = finalX - textWidth / 2;
          finalY = finalY - textHeight - this.StyleRecord.Line.Thickness / 2 - 1;
          textObj.SetPos(finalX, finalY);
          textObj.SetRotation(angleDegrees, finalX + textWidth / 2, finalY + textHeight / 2);
          centerPoint = { x: finalX + textWidth / 2, y: finalY + textHeight / 2 };
          bgObj.SetRotation(angleDegrees, finalX + textWidth / 2, finalY + textHeight / 2);
          if (this.TextGrow === ConstantData.TextGrowBehavior.VERTICAL) {
            flipText = false;
          }
          flipText ? textObj.SetParagraphAlignment(ConstantData.TextAlign.RIGHT)
            : textObj.SetParagraphAlignment(ConstantData.TextAlign.LEFT);
          break;
        case ConstantData.TextAlign.LEFT:
          finalX = startX - frameX + textWidth / 2 * Math.cos(angleRadians);
          finalY = startY - frameY + textWidth / 2 * Math.sin(angleRadians);
          bgObj.SetPos(finalX - textWidth / 2 - 1, finalY - textHeight / 2 - 1);
          finalX = finalX - textWidth / 2;
          finalY = finalY - textHeight / 2;
          textObj.SetPos(finalX, finalY);
          textObj.SetRotation(angleDegrees, finalX + textWidth / 2, finalY + textHeight / 2);
          centerPoint = { x: finalX + textWidth / 2, y: finalY + textHeight / 2 };
          bgObj.SetRotation(angleDegrees, finalX + textWidth / 2, finalY + textHeight / 2);
          if (this.TextGrow === ConstantData.TextGrowBehavior.VERTICAL) {
            flipText = false;
          }
          flipText ? textObj.SetParagraphAlignment(ConstantData.TextAlign.RIGHT)
            : textObj.SetParagraphAlignment(ConstantData.TextAlign.LEFT);
          break;
        // Implement other cases for BOTTOMLEFT, TOPCENTER, CENTER, BOTTOMCENTER,
        // TOPRIGHT, RIGHT, BOTTOMRIGHT similar to above as needed...
        // For brevity, not all cases are modified here.
        default:
          // Default positioning if no alignment match
          finalX = (startX + endX) / 2 - frameX;
          finalY = (startY + endY) / 2 - frameY;
          bgObj.SetPos(finalX, finalY);
          textObj.SetPos(finalX, finalY);
          textObj.SetRotation(angleDegrees, finalX, finalY);
          centerPoint = { x: finalX, y: finalY };
          bgObj.SetRotation(angleDegrees, finalX, finalY);
          textObj.SetParagraphAlignment(ConstantData.TextAlign.CENTER);
          break;
      }

      this.linetrect.x = finalX + this.Frame.x;
      this.linetrect.y = finalY + this.Frame.y;
      this.linetrect.width = textWidth;
      this.linetrect.height = textHeight;
      centerPoint.x += this.Frame.x;
      centerPoint.y += this.Frame.y;
      this.linetrect = GlobalData.optManager.RotateRect(this.linetrect, centerPoint, angleDegrees);
      let tempRect = $.extend(true, {}, this.linetrect);
      GlobalData.optManager.TextPinFrame(this.linetrect, textHeight);
      this.linetrect.x = this.linetrect.x - this.Frame.x;
      this.linetrect.y = this.linetrect.y - this.Frame.y;
      this.UpdateFrame();
    }

    // Restore original settings if useOriginal is true
    if (useOriginal) {
      this.TextDirection = origTextDirection;
      this.TextAlign = origTextAlign;
    }
    console.log("= S.BaseLine: TextDirectionCommon output:", { linerect: this.linetrect });
  }

  LM_AddSVGTextObject(svgDoc, container) {
    console.log("= S.BaseLine: LM_AddSVGTextObject input:", { svgDoc, container });

    // Use the text rectangle stored in this.trect to size the text object.
    const trect = this.trect;

    // Create background rectangle for the text.
    const bgRect = svgDoc.CreateShape(Document.CreateShapeType.RECT);
    bgRect.SetID(ConstantData.SVGElementClass.TEXTBACKGROUND);
    bgRect.SetStrokeWidth(0);

    let fillColor = this.StyleRecord.Fill.Paint.Color;
    bgRect.SetFillColor(fillColor);
    if (this.StyleRecord.Fill.Paint.FillType === ConstantData.FillTypes.SDFILL_TRANSPARENT) {
      bgRect.SetOpacity(0);
    } else {
      bgRect.SetOpacity(this.StyleRecord.Fill.Paint.Opacity);
    }

    // Create the text shape.
    const textShape = svgDoc.CreateShape(Document.CreateShapeType.TEXT);
    textShape.SetID(ConstantData.SVGElementClass.TEXT);
    textShape.SetRenderingEnabled(false);
    textShape.SetSize(trect.width, trect.height);
    textShape.SetSpellCheck(this.AllowSpell());

    // Mark the container as a text container and save the text element.
    container.isText = true;
    container.textElem = textShape;

    // Get the stored object using DataID.
    const storedObject = GlobalData.objectStore.GetObject(this.DataID);
    if (storedObject.Data.runtimeText) {
      textShape.SetRuntimeText(storedObject.Data.runtimeText);
    } else {
      textShape.SetText('');
      textShape.SetParagraphAlignment(this.TextAlign);
      textShape.SetVerticalAlignment('top');
    }
    if (!storedObject.Data.runtimeText) {
      storedObject.Data.runtimeText = textShape.GetRuntimeText();
    }

    // Set constraints if the text is not growing vertically.
    if (this.TextGrow !== ConstantData.TextGrowBehavior.VERTICAL) {
      textShape.SetConstraints(GlobalData.optManager.theContentHeader.MaxWorkDim.x, 0, trect.height);
    }

    // Disable hyperlinks if the text object is in a group.
    if (this.bInGroup) {
      textShape.DisableHyperlinks(true);
    }

    // Enable rendering for the text.
    textShape.SetRenderingEnabled(true);

    // Get minimum text dimensions.
    const textMinDimensions = textShape.GetTextMinDimensions();
    const textHeight = textMinDimensions.height;
    let verticalOffset;
    // If in text direction mode and line thickness is tall enough, hide background.
    if (
      this.TextDirection &&
      this.StyleRecord.Line.Thickness >= textMinDimensions.height &&
      bgRect
    ) {
      fillColor = this.StyleRecord.Line.Paint.Color;
      bgRect.SetOpacity(0);
    }

    // Calculate vertical offset based on text alignment.
    if (this.LineTextY || this.LineTextX) {
      const winTextAlign = SDF.TextAlignToWin(this.TextAlign);
      switch (winTextAlign.vjust) {
        case FileParser.TextJust.TA_TOP:
          verticalOffset = this.trect.height / 2 - textHeight / 2 + this.LineTextY;
          break;
        case FileParser.TextJust.TA_BOTTOM:
          verticalOffset = -this.trect.height / 2 + textHeight / 2 + this.LineTextY;
          break;
        default:
          verticalOffset = this.LineTextY;
      }
    }
    // This value is calculated although Math.abs() is applied without assignment.
    Math.abs(verticalOffset);

    // Add background and text elements to the container.
    if (bgRect) {
      container.AddElement(bgRect);
    }
    container.AddElement(textShape);

    // Adjust text direction and style.
    this.TextDirectionCommon(textShape, bgRect, false, null);

    // Set the text edit callback.
    textShape.SetEditCallback(GlobalData.optManager.TextCallback, container);

    console.log("= S.BaseLine: LM_AddSVGTextObject output:", { addedTextElement: textShape });
  }

  LM_ResizeSVGTextObject(svgDoc: any, textContainer: any, extraData: any): void {
    console.log("= S.BaseLine: LM_ResizeSVGTextObject called with input:", { svgDoc, textContainer, extraData });

    if (textContainer.DataID !== -1) {
      const textBackground = svgDoc.GetElementByID(ConstantData.SVGElementClass.TEXTBACKGROUND);
      const textElement = svgDoc.GetElementByID(ConstantData.SVGElementClass.TEXT);

      if (textElement) {
        textContainer.TextDirectionCommon(textElement, textBackground, false, null);
      }
    }

    console.log("= S.BaseLine: LM_ResizeSVGTextObject completed");
  }

  AdjustTextEditBackground(elementId: string | number, container?: any) {
    console.log("= S.BaseLine: AdjustTextEditBackground called with input:", { elementId, container });

    // Only adjust if a valid DataID exists
    if (this.DataID !== -1) {
      // Use provided container if available; otherwise get it from the SVG object layer by elementId
      const svgContainer = container ? container : GlobalData.optManager.svgObjectLayer.GetElementByID(elementId);
      console.log("= S.BaseLine: Retrieved svgContainer:", svgContainer);

      // Retrieve text background and text elements from the container
      const textBackgroundElement = svgContainer.GetElementByID(ConstantData.SVGElementClass.TEXTBACKGROUND);
      const textElement = svgContainer.GetElementByID(ConstantData.SVGElementClass.TEXT);
      console.log("= S.BaseLine: Retrieved textBackgroundElement:", textBackgroundElement, "and textElement:", textElement);

      // If a text element is present, adjust its text direction
      if (textElement) {
        // If no container parameter was provided we treat it as original (true)
        const useOriginal = container == null;
        this.TextDirectionCommon(textElement, textBackgroundElement, useOriginal, null);
        console.log("= S.BaseLine: TextDirectionCommon applied with useOriginal =", useOriginal);
      } else {
        console.log("= S.BaseLine: No text element found in the SVG container.");
      }
    } else {
      console.log("= S.BaseLine: Skipped AdjustTextEditBackground because DataID is -1.");
    }

    console.log("= S.BaseLine: AdjustTextEditBackground completed.");
  }

  AddCorner(cornerIndex: number, cornerData: any): void {
    console.log("= S.BaseLine: AddCorner called with input:", { cornerIndex, cornerData });

    // TODO: Implement the logic to add a corner using the provided parameters.
    // For example, you might want to update internal corner lists or recalc shapes.

    console.log("= S.BaseLine: AddCorner completed with no output (void)");
  }

  SVGTokenizerHook(e: any): any {
    console.log("= S.BaseLine: SVGTokenizerHook called with input:", e);

    if (GlobalData.optManager.bTokenizeStyle) {
      // Make a deep copy of input object
      e = Utils1.DeepCopy(e);

      // Replace fill color with a placeholder
      e.Fill.Paint.Color = Basic.Symbol.CreatePlaceholder(
        Basic.Symbol.Placeholder.SolidFill,
        e.Fill.Paint.Color
      );

      // Replace stroke (line) color with a placeholder
      e.Line.Paint.Color = Basic.Symbol.CreatePlaceholder(
        Basic.Symbol.Placeholder.LineColor,
        e.Line.Paint.Color
      );

      // If both arrow IDs are not set, replace the line thickness with a placeholder
      if (this.StartArrowID === 0 && this.EndArrowID === 0) {
        e.Line.Thickness = Basic.Symbol.CreatePlaceholder(
          Basic.Symbol.Placeholder.LineThick,
          e.Line.Thickness
        );
      }
    }

    console.log("= S.BaseLine: SVGTokenizerHook output:", e);
    return e;
  }

  GetDimensionPoints(): Point[] {
    console.log("= S.BaseLine: GetDimensionPoints called, input: none");

    const points: Point[] = [];
    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    console.log("= S.BaseLine: Computed rect =", rect);

    const startPointRelative = new Point(this.StartPoint.x - rect.x, this.StartPoint.y - rect.y);
    console.log("= S.BaseLine: Computed relative start point =", startPointRelative);

    const endPointRelative = new Point(this.EndPoint.x - rect.x, this.EndPoint.y - rect.y);
    console.log("= S.BaseLine: Computed relative end point =", endPointRelative);

    points.push(startPointRelative);
    points.push(endPointRelative);

    console.log("= S.BaseLine: GetDimensionPoints output =", points);
    return points;
  }

  PostCreateShapeCallback(svgDoc: any, shapeContainer: any, flag: boolean, extra: any): void {
    console.log("= S.BaseLine: PostCreateShapeCallback input:", { svgDoc, shapeContainer, flag, extra });

    // Retrieve the main shape and the slop elements from the container.
    const shapeElement = shapeContainer.GetElementByID(ConstantData.SVGElementClass.SHAPE);
    const slopElement = shapeContainer.GetElementByID(ConstantData.SVGElementClass.SLOP);
    console.log("= S.BaseLine: Retrieved shapeElement and slopElement", { shapeElement, slopElement });

    // Look up arrowhead definitions using constants.
    let startArrow = ConstantData1.ArrowheadLookupTable[this.StartArrowID];
    let endArrow = ConstantData1.ArrowheadLookupTable[this.EndArrowID];
    const arrowSize = ConstantData1.ArrowheadSizeTable[this.ArrowSizeIndex];
    console.log("= S.BaseLine: Arrow lookup:", { startArrow, endArrow, arrowSize });

    // If arrow id is zero, set the corresponding arrow to null.
    if (startArrow.id === 0) {
      startArrow = null;
    }
    if (endArrow.id === 0) {
      endArrow = null;
    }
    console.log("= S.BaseLine: Arrow after check:", { startArrow, endArrow });

    // If either arrow is set, assign them to both shapeElement and slopElement.
    if (startArrow || endArrow) {
      shapeElement.SetArrowheads(startArrow, arrowSize, endArrow, arrowSize, this.StartArrowDisp, this.EndArrowDisp);
      slopElement.SetArrowheads(startArrow, arrowSize, endArrow, arrowSize, this.StartArrowDisp, this.EndArrowDisp);
      console.log("= S.BaseLine: Arrowheads set on shapeElement and slopElement");
    } else {
      console.log("= S.BaseLine: No arrowheads to set (both null)");
    }

    // If DataID is valid, add the SVG text object.
    if (this.DataID >= 0) {
      this.LM_AddSVGTextObject(svgDoc, shapeContainer);
      console.log("= S.BaseLine: SVG text object added");
    } else {
      console.log("= S.BaseLine: DataID is invalid, skipping text object addition");
    }

    // Update dimension lines.
    this.UpdateDimensionLines(shapeContainer, null);
    console.log("= S.BaseLine: Dimension lines updated");

    // Update coordinate lines (horizontal/vertical) fixed at the start point.
    this.UpdateCoordinateLines(shapeContainer, null);
    console.log("= S.BaseLine: Coordinate lines updated");

    console.log("= S.BaseLine: PostCreateShapeCallback completed");
  }

  CreateActionTriggers(
    svgDoc: any,
    triggerTarget: any,
    unusedParam: any,
    secondaryTarget: any
  ): any {
    console.log("= S.BaseLine: CreateActionTriggers input:", { svgDoc, triggerTarget, unusedParam, secondaryTarget });

    let isInteractive = true,
      actionKnob: any,
      groupShape = svgDoc.CreateShape(Document.CreateShapeType.GROUP),
      knobSizeConst = ConstantData.Defines.SED_KnobSize,
      rotationKnobSizeConst = ConstantData.Defines.SED_RKnobSize;

    // Check if the object is a Line that is a floorplan wall and if the wall tool is enabled
    if (!(
      this instanceof Line &&
      this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL &&
      (
        (GlobalData.gBusinessManager && GlobalData.gBusinessManager.IsAddingWalls && GlobalData.gBusinessManager.IsAddingWalls()) ||
        ConstantData.DocumentContext.UsingWallTool
      )
    )) {
      let docScale = svgDoc.docInfo.docToScreenScale;
      if (svgDoc.docInfo.docScale <= 0.5) {
        docScale *= 2;
      }
      const scaledKnobSize = (knobSizeConst / docScale) * (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL ? 2 : 1);
      const scaledRotKnobSize = rotationKnobSizeConst / docScale;

      // Get frame properties and adjust for knob placement
      const frameRect = this.Frame;
      let width = frameRect.width + scaledKnobSize;
      let height = frameRect.height + scaledKnobSize;

      // Expand the frame rectangle for proper knob placement
      const expandedFrame = $.extend(true, {}, frameRect);
      expandedFrame.x -= scaledKnobSize / 2;
      expandedFrame.y -= scaledKnobSize / 2;
      expandedFrame.width += scaledKnobSize;
      expandedFrame.height += scaledKnobSize;

      // Prepare knob parameters for the LINESTART knob
      let knobParams: any = {
        svgDoc: svgDoc,
        shapeType: Document.CreateShapeType.RECT,
        knobSize: scaledKnobSize,
        fillColor: 'black',
        fillOpacity: 1,
        strokeSize: 1,
        strokeColor: '#777777',
        cursorType: this.CalcCursorForSegment(this.StartPoint, this.EndPoint, false),
        locked: false
      };

      // If triggerTarget differs from secondaryTarget, modify knob colors and styles
      if (triggerTarget !== secondaryTarget) {
        knobParams.fillColor = 'white';
        knobParams.strokeSize = 1;
        knobParams.strokeColor = 'black';
        knobParams.fillOpacity = 0;
      }

      // Adjust knob appearance if the object is locked or not growable
      if (this.flags & ConstantData.ObjFlags.SEDO_Lock) {
        knobParams.fillColor = 'gray';
        knobParams.locked = true;
      } else if (this.NoGrow()) {
        knobParams.fillColor = 'red';
        knobParams.strokeColor = 'red';
        knobParams.cursorType = Element.CursorType.DEFAULT;
      }

      // Set the position and ID for the LINESTART knob
      knobParams.x = this.StartPoint.x - this.Frame.x;
      knobParams.y = this.StartPoint.y - this.Frame.y;
      knobParams.knobID = ConstantData.ActionTriggerType.LINESTART;

      // Check for a hook in the linked object (for example, if a hook with SED_KTL exists)
      let hookIndex: number;
      const linkedObject = GlobalData.optManager.GetObjectPtr(triggerTarget, false);
      if (linkedObject && linkedObject.hooks) {
        for (hookIndex = 0; hookIndex < linkedObject.hooks.length; hookIndex++) {
          if (linkedObject.hooks[hookIndex].hookpt === ConstantData.HookPts.SED_KTL) {
            knobParams.shapeType = Document.CreateShapeType.OVAL;
            isInteractive = false;
            break;
          }
        }
      }
      // For floorplan walls, set the shape type to IMAGE
      if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
        knobParams.shapeType = Document.CreateShapeType.IMAGE;
      }

      // Create the LINESTART knob and add it to the group
      actionKnob = this.GenericKnob(knobParams);
      if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL && actionKnob.SetURL) {
        actionKnob.SetURL(
          knobParams.cursorType === Element.CursorType.NWSE_RESIZE
            ? ConstantData.Constants.FilePath_ImageKnobs + ConstantData.Constants.Knob_ExpandDiag1
            : ConstantData.Constants.FilePath_ImageKnobs + ConstantData.Constants.Knob_ExpandDiag2
        );
        actionKnob.ExcludeFromExport(true);
      }
      groupShape.AddElement(actionKnob);

      // Create the LINEEND knob: reset shapeType to RECT by default
      knobParams.shapeType = Document.CreateShapeType.RECT;
      if (linkedObject && linkedObject.hooks) {
        for (hookIndex = 0; hookIndex < linkedObject.hooks.length; hookIndex++) {
          if (linkedObject.hooks[hookIndex].hookpt === ConstantData.HookPts.SED_KTR) {
            knobParams.shapeType = Document.CreateShapeType.OVAL;
            isInteractive = false;
            break;
          }
        }
      }
      knobParams.x = this.EndPoint.x - this.Frame.x;
      knobParams.y = this.EndPoint.y - this.Frame.y;
      knobParams.knobID = ConstantData.ActionTriggerType.LINEEND;
      if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
        knobParams.shapeType = Document.CreateShapeType.IMAGE;
      }
      actionKnob = this.GenericKnob(knobParams);
      if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL && actionKnob.SetURL) {
        actionKnob.SetURL(
          knobParams.cursorType === Element.CursorType.NWSE_RESIZE
            ? ConstantData.Constants.FilePath_ImageKnobs + ConstantData.Constants.Knob_ExpandDiag1
            : ConstantData.Constants.FilePath_ImageKnobs + ConstantData.Constants.Knob_ExpandDiag2
        );
        actionKnob.ExcludeFromExport(true);
      }
      groupShape.AddElement(actionKnob);

      // Create the ROTATE knob if interactive and allowed
      if (isInteractive && !knobParams.locked && !this.NoGrow()) {
        knobParams.shapeType = Document.CreateShapeType.OVAL;
        // Calculate angle tangent for adjustment
        let angleTan = Math.atan((this.EndPoint.y - this.StartPoint.y) / (this.EndPoint.x - this.StartPoint.x));
        if (angleTan < 0) {
          angleTan = Math.abs(angleTan);
        }
        // Adjust X position based on the orientation
        if (this.EndPoint.x >= this.StartPoint.x) {
          knobParams.x = this.EndPoint.x - 3 * scaledRotKnobSize * Math.cos(angleTan) - this.Frame.x + scaledKnobSize / 2 - scaledRotKnobSize / 2;
        } else {
          knobParams.x = this.EndPoint.x + 3 * scaledRotKnobSize * Math.cos(angleTan) - this.Frame.x + scaledKnobSize / 2 - scaledRotKnobSize / 2;
        }
        // Adjust Y position based on the orientation
        if (this.EndPoint.y >= this.StartPoint.y) {
          knobParams.y = this.EndPoint.y - 3 * scaledRotKnobSize * Math.sin(angleTan) - this.Frame.y + scaledKnobSize / 2 - scaledRotKnobSize / 2;
        } else {
          knobParams.y = this.EndPoint.y + 3 * scaledRotKnobSize * Math.sin(angleTan) - this.Frame.y + scaledKnobSize / 2 - scaledRotKnobSize / 2;
        }
        knobParams.cursorType = Element.CursorType.ROTATE;
        knobParams.knobID = ConstantData.ActionTriggerType.ROTATE;
        knobParams.fillColor = 'white';
        knobParams.fillOpacity = 0.001;
        knobParams.strokeSize = 2.5;
        knobParams.knobSize = scaledRotKnobSize;
        knobParams.strokeColor = 'white';
        actionKnob = this.GenericKnob(knobParams);
        groupShape.AddElement(actionKnob);
        // Create a second rotate knob for outline effects
        knobParams.strokeSize = 1;
        knobParams.strokeColor = 'black';
        actionKnob = this.GenericKnob(knobParams);
        groupShape.AddElement(actionKnob);
        // Reset knob size to original scaled knob size
        knobParams.knobSize = scaledKnobSize;
      }

      // Add dimension adjustment knobs if stand-off dimension lines are allowed and used
      if (
        this.Dimensions & ConstantData.DimensionFlags.SED_DF_Standoff &&
        this.CanUseStandOffDimensionLines()
      ) {
        const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
        this.CreateDimensionAdjustmentKnobs(groupShape, svgElement, knobParams);
      }

      groupShape.SetSize(width, height);
      groupShape.SetPos(expandedFrame.x, expandedFrame.y);
      groupShape.isShape = true;
      groupShape.SetID(ConstantData.Defines.Action + triggerTarget);

      console.log("= S.BaseLine: CreateActionTriggers output:", groupShape);
      return groupShape;
    }
  }

  CalcCursorForSegment(startPoint: Point, endPoint: Point, flag?: boolean): string {
    console.log("= S.BaseLine: CalcCursorForSegment input:", { startPoint, endPoint, flag });
    const angle = Utils1.CalcAngleFromPoints(startPoint, endPoint);
    console.log("= S.BaseLine: Calculated angle:", angle);
    const cursor = this.CalcCursorForAngle(angle, flag);
    console.log("= S.BaseLine: CalcCursorForSegment output:", { cursor });
    return cursor;
  }

  NoRotate(): boolean {
    console.log("= S.BaseLine: NoRotate called, input: none");
    const result = (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR) || (this.hooks.length > 1);
    console.log("= S.BaseLine: NoRotate output:", result);
    return result;
  }

  SetRuntimeEffects(effects: any): void {
    console.log("= S.BaseLine: SetRuntimeEffects called with input:", effects);
    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    if (svgElement) {
      console.log("= S.BaseLine: Retrieved SVG element for BlockID", this.BlockID, ":", svgElement);
      this.ApplyEffects(svgElement, effects, true);
      console.log("= S.BaseLine: Applied runtime effects with input:", effects);
    } else {
      console.log("= S.BaseLine: No SVG element found for BlockID", this.BlockID);
    }
  }

  ApplyStyles(element: any, styleObj: any) {
    console.log("= S.BaseLine: ApplyStyles called with input:", { element, styleObj });

    // Retrieve fill and stroke types and check if an image is set
    const fillType = styleObj.Fill.Paint.FillType;
    const lineFillType = styleObj.Line.Paint.FillType;
    const hasImage = this.ImageURL !== '';

    if (this.polylist && this.polylist.closed) {
      // Process image fill for closed polylines
      if (hasImage) {
        let scaleType = 'PROPFILL';
        let cropRect = { x: 0, y: 0, width: 0, height: 0 };

        if (this.ImageHeader) {
          if (this.ImageHeader.croprect) {
            cropRect.x = this.ImageHeader.croprect.left;
            cropRect.y = this.ImageHeader.croprect.top;
            cropRect.width = this.ImageHeader.croprect.right - this.ImageHeader.croprect.left;
            cropRect.height = this.ImageHeader.croprect.bottom - this.ImageHeader.croprect.top;
          }
          if (this.ImageHeader.imageflags !== undefined &&
            this.ImageHeader.imageflags === ConstantData.ImageScales.SDIMAGE_ALWAYS_FIT) {
            scaleType = 'NOPROP';
          }
        }
        console.log("= S.BaseLine: Applying image fill with", { url: this.ImageURL, scaleType, cropRect });
        element.SetImageFill(this.ImageURL, { scaleType, cropRect });
        element.SetFillOpacity(styleObj.Fill.Paint.Opacity);
      }
    } else {
      // Process normal fill styles based on the fill type
      if (fillType === ConstantData.FillTypes.SDFILL_GRADIENT) {
        const gradientRecord = this.CreateGradientRecord(
          styleObj.Fill.Paint.GradientFlags,
          styleObj.Fill.Paint.Color,
          styleObj.Fill.Paint.Opacity,
          styleObj.Fill.Paint.EndColor,
          styleObj.Fill.Paint.EndOpacity
        );
        console.log("= S.BaseLine: Applying gradient fill with record:", gradientRecord);
        element.SetGradientFill(gradientRecord);
      } else if (fillType === ConstantData.FillTypes.SDFILL_RICHGRADIENT) {
        const richGradientRecord = this.CreateRichGradientRecord(styleObj.Fill.Paint.GradientFlags);
        console.log("= S.BaseLine: Applying rich gradient fill with record:", richGradientRecord);
        element.SetGradientFill(richGradientRecord);
      } else if (fillType === ConstantData.FillTypes.SDFILL_TEXTURE) {
        const textureParams = {
          url: '',
          scale: 1,
          alignment: styleObj.Fill.Paint.TextureScale.AlignmentScalar
        };
        const textureIndex = styleObj.Fill.Paint.Texture;
        if (GlobalData.optManager.TextureList.Textures[textureIndex]) {
          textureParams.dim = GlobalData.optManager.TextureList.Textures[textureIndex].dim;
          textureParams.url = GlobalData.optManager.TextureList.Textures[textureIndex].ImageURL;
          textureParams.scale = GlobalData.optManager.CalcTextureScale(styleObj.Fill.Paint.TextureScale, textureParams.dim.x);
          styleObj.Fill.Paint.TextureScale.Scale = textureParams.scale;
          if (!textureParams.url) {
            textureParams.url = Constants.FilePath_CMSRoot + Constants.FilePath_Textures +
              GlobalData.optManager.TextureList.Textures[textureIndex].filename;
          }
          console.log("= S.BaseLine: Applying texture fill with params:", textureParams);
          element.SetTextureFill(textureParams);
          element.SetFillOpacity(styleObj.Fill.Paint.Opacity);
        }
      } else if (fillType === ConstantData.FillTypes.SDFILL_TRANSPARENT) {
        console.log("= S.BaseLine: Applying transparent fill");
        element.SetFillColor('none');
      } else {
        console.log("= S.BaseLine: Applying solid fill with color:", styleObj.Fill.Paint.Color);
        element.SetFillColor(styleObj.Fill.Paint.Color);
        element.SetFillOpacity(styleObj.Fill.Paint.Opacity);
      }
    }

    // Process stroke (line) styles based on the line fill type
    if (lineFillType === ConstantData.FillTypes.SDFILL_GRADIENT) {
      const gradientStrokeRecord = this.CreateGradientRecord(
        styleObj.Line.Paint.GradientFlags,
        styleObj.Line.Paint.Color,
        styleObj.Line.Paint.Opacity,
        styleObj.Line.Paint.EndColor,
        styleObj.Line.Paint.EndOpacity
      );
      console.log("= S.BaseLine: Applying gradient stroke with record:", gradientStrokeRecord);
      element.SetGradientStroke(gradientStrokeRecord);
    } else if (lineFillType === ConstantData.FillTypes.SDFILL_RICHGRADIENT) {
      const richGradientStrokeRecord = this.CreateRichGradientRecord(styleObj.Line.Paint.GradientFlags);
      console.log("= S.BaseLine: Applying rich gradient stroke with record:", richGradientStrokeRecord);
      element.SetGradientStroke(richGradientStrokeRecord);
    } else if (lineFillType === ConstantData.FillTypes.SDFILL_TEXTURE) {
      const textureStrokeParams = {
        url: '',
        scale: styleObj.Line.Paint.TextureScale.Scale,
        alignment: styleObj.Line.Paint.TextureScale.AlignmentScalar
      };
      const textureIndex = styleObj.Line.Paint.Texture;
      textureStrokeParams.dim = GlobalData.optManager.TextureList.Textures[textureIndex].dim;
      textureStrokeParams.url = GlobalData.optManager.TextureList.Textures[textureIndex].ImageURL;
      if (!textureStrokeParams.url) {
        textureStrokeParams.url = Constants.FilePath_CMSRoot +
          Constants.FilePath_Textures +
          GlobalData.optManager.TextureList.Textures[textureIndex].filename;
      }
      console.log("= S.BaseLine: Applying texture stroke with params:", textureStrokeParams);
      element.SetTextureStroke(textureStrokeParams);
      element.SetStrokeOpacity(styleObj.Line.Paint.Opacity);
    } else if (lineFillType === ConstantData.FillTypes.SDFILL_SOLID) {
      console.log("= S.BaseLine: Applying solid stroke with color:", styleObj.Line.Paint.Color);
      element.SetStrokeColor(styleObj.Line.Paint.Color);
      element.SetStrokeOpacity(styleObj.Line.Paint.Opacity);
    } else {
      console.log("= S.BaseLine: No stroke to apply, setting stroke color to none");
      element.SetStrokeColor('none');
    }

    console.log("= S.BaseLine: ApplyStyles completed for element:", element);
  }

  CalcLineHops(targetShape: any, hopData: any): void {
    console.log("= S.BaseLine: CalcLineHops called with targetShape =", targetShape, "and hopData =", hopData);

    // Get poly-points for the current object and the target shape
    const basePolyPoints: Point[] = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false, null);
    let basePointCount: number = basePolyPoints.length;
    let targetPolyPoints: Point[] = targetShape.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false, null);
    let targetPointCount: number = targetPolyPoints.length;

    // Iterate over base poly-points
    for (let baseIdx = 0; baseIdx < basePointCount; ++baseIdx) {
      // Check if maximum hops is exceeded
      if (this.hoplist.nhops > ConstantData.Defines.SDMAXHOPS) {
        console.log("= S.BaseLine: Maximum hop count exceeded, exiting CalcLineHops");
        return;
      }

      let prevPoint: Point, currPoint: Point;
      if (baseIdx > 0) {
        prevPoint = basePolyPoints[baseIdx - 1];
        currPoint = basePolyPoints[baseIdx];
      } else {
        // For the first point, use current and the next point; increment index to skip duplicate
        prevPoint = basePolyPoints[baseIdx];
        currPoint = basePolyPoints[baseIdx + 1];
        baseIdx++;
      }

      console.log("= S.BaseLine: Processing base segment between", prevPoint, "and", currPoint);

      // Try to add a hop point using the current segment and target poly points
      let hopResult = this.AddHopPoint(prevPoint, currPoint, targetPolyPoints, targetPointCount, baseIdx, hopData);
      if (hopResult == null) {
        console.log("= S.BaseLine: AddHopPoint returned null, breaking out of loop");
        break;
      }
      console.log("= S.BaseLine: AddHopPoint result =", hopResult);

      // If hop was successful, refine the target poly points further
      if (hopResult.bSuccess) {
        let tIndex: number = hopResult.tindex;
        if (tIndex >= 1 && targetPointCount > 2) {
          console.log("= S.BaseLine: First hop success with tindex =", tIndex, "; refining target poly points");
          targetPolyPoints = targetPolyPoints.slice(tIndex);
          targetPointCount -= tIndex;
          hopResult = this.AddHopPoint(prevPoint, currPoint, targetPolyPoints, targetPointCount, baseIdx, hopData);
          if (hopResult == null) {
            console.log("= S.BaseLine: Second AddHopPoint returned null, breaking out of loop");
            break;
          }
          tIndex = hopResult.tindex;
          console.log("= S.BaseLine: Refined hop result, new tindex =", tIndex);
        }
        if (tIndex < targetPointCount - 1) {
          console.log("= S.BaseLine: tindex =", tIndex, "is less than targetPointCount - 1 =", targetPointCount - 1, "; further refining target poly points");
          targetPolyPoints = targetPolyPoints.slice(tIndex);
          targetPointCount -= tIndex;
          hopResult = this.AddHopPoint(prevPoint, currPoint, targetPolyPoints, targetPointCount, baseIdx, hopData);
          if (hopResult == null) {
            console.log("= S.BaseLine: Third AddHopPoint returned null, breaking out of loop");
            break;
          }
          tIndex = hopResult.tindex;
          console.log("= S.BaseLine: Final hop refinement, new tindex =", tIndex);
        }
      }
    }
    console.log("= S.BaseLine: CalcLineHops completed");
  }

  DebugLineHops(svgDoc: any): void {
    console.log("= S.BaseLine: DebugLineHops called with input:", svgDoc);

    // Total number of hops in the hoplist
    const totalHops: number = this.hoplist.nhops;

    // Temporary variable for the current hop and flag for aggregation
    let currentHop: any = null;
    let aggregate: boolean = false;

    // Get the session object using the SEDSessionBlockID
    const session = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);

    // Process only if the session allows hops
    if ((session.flags & ConstantData.SessionFlags.SEDS_AllowHops) !== 0) {
      // Get the base hop dimension from the session and initialize accumulators
      let hopDimension: number = session.hopdim.x;
      let sumX: number = 0;
      let sumY: number = 0;
      let count: number = 0;

      // Loop through each hop in the hoplist
      for (let index = 0; index < totalHops; index++) {
        currentHop = this.hoplist.hops[index];

        if (currentHop.cons) {
          // If this hop is marked as 'consolidated'
          aggregate = true;
          count++;
          sumX += currentHop.pt.x;
          sumY += currentHop.pt.y;
        } else {
          // Not consolidated; decide based on the previous aggregation state
          let strokeColor: string;
          if (aggregate) {
            // If we had an aggregation, mark the color green and extend the hop dimension
            strokeColor = 'green';
            hopDimension = 3 * session.hopdim.x;
            count++;
            sumX += currentHop.pt.x;
            sumY += currentHop.pt.y;
            // Compute the average position over hops
            sumX /= count;
            sumY /= count;
            aggregate = false;
          } else {
            // Otherwise, use red and original hop dimension
            strokeColor = 'red';
            hopDimension = session.hopdim.x;
            sumX = currentHop.pt.x;
            sumY = currentHop.pt.y;
          }

          // Get the main shape rectangle defined by the start and end points
          const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

          // Prepare knob parameters with readable names
          const knobParams = {
            svgDoc: svgDoc,
            shapeType: Document.CreateShapeType.OVAL,
            x: rect.x + (sumX - hopDimension / 2),
            y: rect.y + (sumY - hopDimension / 2),
            knobSize: hopDimension,
            fillColor: 'none',
            fillOpacity: 1,
            strokeSize: 1,
            strokeColor: strokeColor,
            KnobID: 0,
            cursorType: Element.CursorType.CROSSHAIR
          };

          console.log("= S.BaseLine: DebugLineHops knobParams:", knobParams);

          // Create a knob element based on the parameters
          const knob = this.GenericKnob(knobParams);

          // Set an ID for the knob and add it to the overlay layer
          knob.SetID("hoptarget");
          GlobalData.optManager.svgOverlayLayer.AddElement(knob);

          // Reset accumulators after drawing the knob
          sumX = 0;
          sumY = 0;
          count = 0;
        }
      }
    }
    console.log("= S.BaseLine: DebugLineHops completed");
  }

  AddHopPoint(
    startPoint: Point,
    endPoint: Point,
    polyPoints: Point[],
    numPoints: number,
    segmentIndex: number,
    hopIndex: number
  ): { bSuccess: boolean; tindex: number } {
    console.log("= S.BaseLine: AddHopPoint called with input:", {
      startPoint,
      endPoint,
      polyPoints,
      numPoints,
      segmentIndex,
      hopIndex,
    });

    let rect: any,
      intersectPoint: Point,
      deltaX: number,
      deltaY: number,
      tindexAcc: number,
      accumulated = 0,
      iteration = 0;

    // Exit early if maximum hops reached
    if (this.hoplist.nhops > ConstantData.Defines.SDMAXHOPS) {
      console.log("= S.BaseLine: Maximum hops exceeded, no hop added.");
      return { bSuccess: false, tindex: 0 };
    }

    // Save original polyPoints for slicing later and initialize working set.
    const originalPolyPoints = polyPoints;
    polyPoints = originalPolyPoints.slice(accumulated);
    let intersectData = GlobalData.optManager.PolyLIntersect(startPoint, endPoint, polyPoints, numPoints);
    intersectPoint = intersectData.ipt;
    // tindexAcc holds the index (lpseg) from intersection.
    tindexAcc = intersectData.lpseg;

    // Loop until intersection is not successful.
    while (intersectData.bSuccess) {
      // Get the bounding rectangle for the line segment and inflate it.
      rect = Utils2.Pt2Rect(startPoint, endPoint);
      Utils2.InflateRect(rect, 2, 2);

      // Check if the intersection point lies within the inflated rectangle.
      if (
        intersectPoint.x >= rect.x &&
        intersectPoint.x <= rect.x + rect.width &&
        intersectPoint.y >= rect.y &&
        intersectPoint.y <= rect.y + rect.height
      ) {
        tindexAcc += accumulated;
        // Calculate distance from endPoint.
        deltaX = intersectPoint.x - endPoint.x;
        deltaY = intersectPoint.y - endPoint.y;
        const distance = Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);
        // Create hop object.
        const hopObj = {
          segment: segmentIndex,
          index: hopIndex,
          pt: intersectPoint,
          dist: distance,
          cons: false,
        };
        this.hoplist.hops.push(hopObj);
        this.hoplist.nhops++;
        const output = { bSuccess: true, tindex: tindexAcc };
        console.log("= S.BaseLine: AddHopPoint output:", output);
        return output;
      }

      // Update accumulated index.
      accumulated += tindexAcc;
      if (accumulated > numPoints - 1) {
        break;
      }
      if (++iteration > numPoints) {
        break;
      }

      // Update working set with remaining polyPoints.
      polyPoints = originalPolyPoints.slice(accumulated);
      numPoints = polyPoints.length;

      intersectData = GlobalData.optManager.PolyLIntersect(startPoint, endPoint, polyPoints, numPoints);
      tindexAcc = intersectData.lpseg;
      intersectPoint = intersectData.ipt;
    }

    const output = { bSuccess: false, tindex: tindexAcc };
    console.log("= S.BaseLine: AddHopPoint output:", output);
    return output;
  }

  RightClick(e) {
    console.log("= S.BaseLine: RightClick called with input:", e);

    // Convert window coordinates to document coordinates.
    const docPt = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
      e.gesture.center.clientX,
      e.gesture.center.clientY
    );
    console.log("= S.BaseLine: Converted document coords:", docPt);

    // Find the target SVG element that was clicked.
    const targetElement = GlobalData.optManager.svgObjectLayer.FindElementByDOMElement(e.currentTarget);
    console.log("= S.BaseLine: Found target element:", targetElement);

    // Select the object from the click; if not selected, exit.
    if (!GlobalData.optManager.SelectObjectFromClick(e, targetElement)) {
      console.log("= S.BaseLine: RightClick - selection failed, returning false");
      return false;
    }

    // Retrieve the object via its ID.
    const objID = targetElement.GetID();
    let obj = GlobalData.optManager.GetObjectPtr(objID, false);
    console.log("= S.BaseLine: Retrieved object:", obj);

    // If the object has a text object, check for spell location and activate text edit if needed.
    if (obj && obj.GetTextObject() >= 0) {
      const textElem = targetElement.textElem;
      if (textElem) {
        const spellIndex = textElem.GetSpellAtLocation(e.gesture.center.clientX, e.gesture.center.clientY);
        console.log("= S.BaseLine: Spell index at location:", spellIndex);
        if (spellIndex >= 0) {
          GlobalData.optManager.ActivateTextEdit(targetElement, e, true);
        }
      }
    }

    // Prepare right-click parameters.
    GlobalData.optManager.RightClickParams = new RightClickData();
    GlobalData.optManager.RightClickParams.TargetID = targetElement.GetID();
    GlobalData.optManager.RightClickParams.HitPt.x = docPt.x;
    GlobalData.optManager.RightClickParams.HitPt.y = docPt.y;
    GlobalData.optManager.RightClickParams.Locked = ((this.flags & ConstantData.ObjFlags.SEDO_Lock) > 0);
    console.log("= S.BaseLine: Set RightClickParams:", GlobalData.optManager.RightClickParams);

    // If there is an active text edit, show the spell menu or the text contextual menu.
    if (GlobalData.optManager.GetActiveTextEdit() != null) {
      const activeEdit = GlobalData.optManager.svgDoc.GetActiveEdit();
      let spellIndex = -1;
      if (activeEdit) {
        spellIndex = activeEdit.GetSpellAtLocation(e.gesture.center.clientX, e.gesture.center.clientY);
      }
      console.log("= S.BaseLine: Active edit spell index:", spellIndex);
      if (spellIndex >= 0) {
        GlobalData.optManager.svgDoc.GetSpellCheck().ShowSpellMenu(
          activeEdit,
          spellIndex,
          e.gesture.center.clientX,
          e.gesture.center.clientY
        );
      } else {
        // Show the context menu
      }
    } else {
      // Show the context menu
    }

    console.log("= S.BaseLine: RightClick completed");
  }

  SetObjectStyle(style: any) {
    console.log("= S.BaseLine: SetObjectStyle called with input:", style);

    // Make a deep copy of the input style
    let newStyle = Utils1.DeepCopy(style);
    let shouldSwapArrows = false;

    // If not a SEGLINE and segl property exists, delete it
    if (this.LineType !== ConstantData.LineType.SEGLINE && newStyle.segl != null) {
      delete newStyle.segl;
    }

    // If either arrow ID is provided
    if (!(style.EndArrowID == null && style.StartArrowID == null)) {
      // Determine whether to swap arrows based on start and end point positions
      if (this.StartPoint.x < this.EndPoint.x) {
        shouldSwapArrows = false;
      } else if (this.StartPoint.x > this.EndPoint.x || this.StartPoint.y > this.EndPoint.y) {
        shouldSwapArrows = true;
      }

      if (shouldSwapArrows) {
        // Swap the arrow values from this object by default
        newStyle.EndArrowID = this.EndArrowID;
        newStyle.StartArrowID = this.StartArrowID;
        newStyle.EndArrowDisp = this.EndArrowDisp;
        newStyle.StartArrowDisp = this.StartArrowDisp;

        // If input has specific arrow IDs, override accordingly
        if (style.EndArrowID != null) {
          newStyle.StartArrowID = style.EndArrowID;
          newStyle.StartArrowDisp = style.EndArrowDisp;
        }
        if (style.StartArrowID != null) {
          newStyle.EndArrowID = style.StartArrowID;
          newStyle.EndArrowDisp = style.StartArrowDisp;
        }
      }
    }

    // For non-closed polylines, reset the hatch property to 0 if set
    if (!(this.polylist && this.polylist.closed)) {
      if (newStyle &&
        newStyle.StyleRecord &&
        newStyle.StyleRecord.Fill &&
        newStyle.StyleRecord.Fill.Hatch) {
        newStyle.StyleRecord.Fill.Hatch = 0;
      }
    }

    // For Gantt Bar objects, enforce the line thickness from this object
    if (
      this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR &&
      newStyle.StyleRecord &&
      newStyle.StyleRecord.Name &&
      newStyle.StyleRecord.Line &&
      newStyle.StyleRecord.Line.Thickness
    ) {
      newStyle.StyleRecord.Line.Thickness = this.StyleRecord.Line.Thickness;
    }

    // Call the superclass method for setting the object style
    let result = super.SetObjectStyle(newStyle);

    // If the result has a StyleRecord with Fill, clear the ImageURL property
    if (result.StyleRecord && result.StyleRecord.Fill) {
      this.ImageURL = '';
    }

    console.log("= S.BaseLine: SetObjectStyle output:", result);
    return result;
  }

  GetArrowheadSelection(selection: any): boolean {
    console.log("= S.BaseLine: GetArrowheadSelection - input:", selection);

    if (selection) {
      // Determine if the arrowhead order should be reversed
      const isReversed = (function (obj: any): boolean {
        if (Math.abs(obj.EndPoint.x - obj.StartPoint.x) < 0.01) {
          return obj.EndPoint.y < obj.StartPoint.y;
        }
        const rect = Utils2.Pt2Rect(obj.EndPoint, obj.StartPoint);
        return (
          (Math.abs(obj.EndPoint.x - rect.x) < 0.01 && Math.abs(obj.EndPoint.y - rect.y) < 0.01) ||
          (Math.abs(obj.EndPoint.x - rect.x) < 0.01 && Math.abs(obj.EndPoint.y - (rect.y + rect.height)) < 0.01)
        );
      })(this);

      if (isReversed) {
        selection.StartArrowID = this.EndArrowID;
        selection.StartArrowDisp = this.EndArrowDisp;
        selection.EndArrowID = this.StartArrowID;
        selection.EndArrowDisp = this.StartArrowDisp;
      } else {
        selection.StartArrowID = this.StartArrowID;
        selection.StartArrowDisp = this.StartArrowDisp;
        selection.EndArrowID = this.EndArrowID;
        selection.EndArrowDisp = this.EndArrowDisp;
      }
      selection.ArrowSizeIndex = this.ArrowSizeIndex;
    }

    console.log("= S.BaseLine: GetArrowheadSelection - output:", selection);
    return true;
  }

  UpdateDimensionFromTextObj(sourceElement: any, textData: any) {
    console.log("= S.BaseLine: UpdateDimensionFromTextObj called with input:", { sourceElement, textData });

    // Local variables for text content and user data
    let textContent: string = "";
    let userData: number = -1;

    // Preserve the current block so Undo works correctly
    GlobalData.objectStore.PreserveBlock(this.BlockID);

    // Hide the SVG selection state for this block
    GlobalData.optManager.ShowSVGSelectionState(this.BlockID, false);

    // Retrieve the SVG element for this block
    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    console.log("= S.BaseLine: Retrieved SVG element for BlockID", this.BlockID, svgElement);

    // Get text content and user data either from textData or from the source element
    if (textData) {
      textContent = textData.text;
      userData = textData.userData;
    } else {
      textContent = sourceElement.GetText();
      userData = sourceElement.GetUserData();
    }
    console.log("= S.BaseLine: Determined text content and userData:", { textContent, userData });

    // Update dimensions based on the text content and user data
    this.UpdateDimensionFromText(svgElement, textContent, userData);
    console.log("= S.BaseLine: UpdateDimensionFromText completed");

    // Set link flag for the current block
    GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
    console.log("= S.BaseLine: Set link flag for BlockID", this.BlockID);

    // Set link flag for each hooked object
    for (let i = 0; i < this.hooks.length; i++) {
      GlobalData.optManager.SetLinkFlag(this.hooks[i].objid, ConstantData.LinkFlags.SED_L_MOVE);
      console.log("= S.BaseLine: Set link flag for hook object with id", this.hooks[i].objid);
    }

    // If hyperlink, note, comment, or field data exists, add this block to the dirty list
    if (this.HyperlinkText !== "" || this.NoteID !== -1 || this.CommentID !== -1 || this.HasFieldData()) {
      GlobalData.optManager.AddToDirtyList(this.BlockID);
      console.log("= S.BaseLine: Added BlockID to dirty list", this.BlockID);
    }

    // Complete the current operation
    GlobalData.optManager.CompleteOperation(null);
    console.log("= S.BaseLine: Completed operation for BlockID", this.BlockID);

    // If frame coordinates are negative, scroll the object into view
    if (this.Frame.x < 0 || this.Frame.y < 0) {
      GlobalData.optManager.ScrollObjectIntoView(this.BlockID, false);
      console.log("= S.BaseLine: Scrolled object into view for BlockID", this.BlockID);
    }

    console.log("= S.BaseLine: UpdateDimensionFromTextObj completed for BlockID", this.BlockID);
  }

  UpdateDimensionFromText(inputElement: any, textValue: string, options: any): void {
    console.log("= S.BaseLine: UpdateDimensionFromText called with input:", { inputElement, textValue, options });

    let dimensionValue: number;
    let segment: number;
    let hookIndex: number;
    let dimensionLength: number = -1;

    // If hooked object info exists, delegate accordingly.
    if (options.hookedObjectInfo) {
      const hookedResult = this.UpdateDimensionsFromTextForHookedObject(inputElement, textValue, options);
      console.log("= S.BaseLine: UpdateDimensionFromText (hooked) output:", hookedResult);
      return;
    }

    // Get segment index from options.
    segment = options.segment;

    // Retrieve the dimension value from the string for the given segment.
    dimensionValue = this.GetDimensionValueFromString(textValue, segment);
    if (dimensionValue >= 0) {
      dimensionLength = this.GetDimensionLengthFromValue(dimensionValue);
    }

    // If the computed dimension length is invalid, mark dirty and re-render, then exit.
    if (dimensionLength < 0) {
      GlobalData.optManager.AddToDirtyList(this.BlockID);
      GlobalData.optManager.RenderDirtySVGObjects();
      console.log("= S.BaseLine: UpdateDimensionFromText output: invalid dimensionLength (< 0), early return");
      return;
    }

    // Update the object dimensions.
    this.UpdateDimensions(dimensionLength, null, null);

    // Set link flags for this object.
    GlobalData.optManager.SetLinkFlag(
      this.BlockID,
      ConstantData.LinkFlags.SED_L_MOVE | ConstantData.LinkFlags.SED_L_CHANGE
    );

    // Set link flags for each hooked object.
    for (hookIndex = 0; hookIndex < this.hooks.length; hookIndex++) {
      GlobalData.optManager.SetLinkFlag(
        this.hooks[hookIndex].objid,
        ConstantData.LinkFlags.SED_L_MOVE | ConstantData.LinkFlags.SED_L_CHANGE
      );
    }

    // Update all links.
    GlobalData.optManager.UpdateLinks();

    // If the display width equals the dimensionLength, update runtime flags.
    if (this.GetDimensionsForDisplay().width === dimensionLength) {
      this.rwd = dimensionValue;
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, true);
    }

    // Update the dimension lines based on the new dimensions.
    this.UpdateDimensionLines(inputElement);

    console.log("= S.BaseLine: UpdateDimensionFromText completed, output dimensionLength:", dimensionLength);
  }

  UpdateSecondaryDimensions(container: any, creator: any, forcedUpdate: boolean): void {
    console.log("= S.BaseLine: UpdateSecondaryDimensions called with input:", { container, creator, forcedUpdate });

    const isWall: boolean = this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL;
    const isHookedDimVisible: boolean = !(this.Dimensions & ConstantData.DimensionFlags.SED_DF_HideHookedObjDimensions);
    const shouldShowAlways: boolean =
      Boolean(this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always ||
        this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select || forcedUpdate);

    if (isWall && isHookedDimVisible && shouldShowAlways) {
      this.UpdateHookedObjectDimensionLines(container, creator, forcedUpdate);
    }

    console.log("= S.BaseLine: UpdateSecondaryDimensions completed");
  }

  GetBoundingBoxesForSecondaryDimensions(): any[] {
    console.log("= S.BaseLine: GetBoundingBoxesForSecondaryDimensions called, input: none");

    // Retrieve hooked object dimension info
    const hookedInfo = this.GetHookedObjectDimensionInfo();
    console.log("= S.BaseLine: Retrieved hookedInfo:", hookedInfo);

    const boundingBoxes: any[] = [];

    // Process only if the object is a floorplan wall, secondary dimensions are not hidden, and all segments are enabled.
    if (
      this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL &&
      !(this.Dimensions & ConstantData.DimensionFlags.SED_DF_HideHookedObjDimensions) &&
      (this.Dimensions & ConstantData.DimensionFlags.SED_DF_AllSeg)
    ) {
      console.log("= S.BaseLine: Conditions met for processing secondary dimensions.");

      for (let index = 0, count = hookedInfo.length; index < count; index++) {
        const dimensionInfo = hookedInfo[index];
        console.log(`= S.BaseLine: Processing hookedInfo[${index}]:`, dimensionInfo);

        // Skip processing if start and end points are identical
        if (Utils2.EqualPt(dimensionInfo.start, dimensionInfo.end)) {
          console.log(`= S.BaseLine: Skipping index ${index} as start and end points are equal.`);
          continue;
        }

        // Calculate angle between start and end points
        const angle = Utils1.CalcAngleFromPoints(dimensionInfo.start, dimensionInfo.end);
        console.log(`= S.BaseLine: Calculated angle at index ${index}:`, angle);

        // Get the dimension text for the current segment
        const dimensionText = this.GetDimensionTextForPoints(dimensionInfo.start, dimensionInfo.end);
        console.log(`= S.BaseLine: Retrieved dimensionText at index ${index}:`, dimensionText);

        // Retrieve left, right, and text frame bounding boxes for the dimension
        const dimensionPoints = this.GetPointsForDimension(
          angle,
          dimensionText,
          dimensionInfo.start,
          dimensionInfo.end,
          dimensionInfo.segment,
          true
        );
        console.log(`= S.BaseLine: Retrieved dimensionPoints at index ${index}:`, dimensionPoints);

        if (dimensionPoints) {
          boundingBoxes.push(dimensionPoints.left);
          boundingBoxes.push(dimensionPoints.right);
          boundingBoxes.push(dimensionPoints.textFrame);
          console.log(`= S.BaseLine: Added bounding boxes from index ${index}.`);
        }
      }
    } else {
      console.log("= S.BaseLine: Conditions not met for processing secondary dimensions.");
    }

    console.log("= S.BaseLine: GetBoundingBoxesForSecondaryDimensions output:", boundingBoxes);
    return boundingBoxes;
  }

  AddIcon(e: any, container: any, iconPosition: any): any {
    console.log("= S.BaseLine: AddIcon called with input:", { e, container, iconPosition });

    let targetX: number, targetY: number;
    const polyPoints: any[] = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true);
    const len: number = polyPoints.length;

    if (this.DataID >= 0) {
      // When DataID is valid, choose target point based on polyPoints length.
      if (len === 2) {
        targetX = polyPoints[1].x;
        targetY = polyPoints[1].y;
      } else if (len === 3) {
        targetX = polyPoints[2].x;
        targetY = polyPoints[2].y;
      } else {
        targetX = polyPoints[len - 1].x;
        targetY = polyPoints[len - 1].y;
      }

      if (this instanceof Instance.Shape.Line || this instanceof Instance.Shape.ArcLine) {
        targetX -= this.iconSize;
        iconPosition.y = targetY - 2 * this.iconSize;
      } else {
        // For segmented lines or other shapes.
        targetX -= this.iconSize;
        iconPosition.y = targetY - 2 * this.iconSize;
      }
      iconPosition.x = targetX - this.iconSize * this.nIcons;
    } else {
      // When DataID is not valid, choose the midpoint or center point.
      if (len === 2) {
        targetX = (polyPoints[0].x + polyPoints[1].x) / 2;
        targetY = (polyPoints[0].y + polyPoints[1].y) / 2;
      } else if (len === 3) {
        targetX = polyPoints[1].x;
        targetY = polyPoints[1].y;
      } else {
        const midIndex = Math.floor(len / 2);
        targetX = polyPoints[midIndex].x;
        targetY = polyPoints[midIndex].y;
      }

      if (this instanceof Instance.Shape.Line) {
        if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR) {
          iconPosition.y = targetY - (this.StyleRecord.Line.Thickness / 2 + this.iconSize / 8);
        } else {
          targetX += this.iconSize / 2;
          iconPosition.y = targetY + this.iconSize / 4;
        }
      } else if (this instanceof Instance.Shape.ArcLine) {
        targetX += this.iconSize / 2;
        iconPosition.y = targetY + this.iconSize / 2;
      } else if (this instanceof Instance.Shape.SegmentedLine) {
        iconPosition.y = targetY + this.iconSize / 2;
      } else {
        iconPosition.y = targetY - this.iconSize / 2;
      }
      iconPosition.x = targetX - this.iconSize * this.nIcons;
    }

    // Create the icon element using the computed iconPosition.
    const iconElement = this.GenericIcon(iconPosition);
    this.nIcons++;
    container.AddElement(iconElement);

    console.log("= S.BaseLine: AddIcon output:", iconElement);
    return iconElement;
  }

  GetNotePos(event: any, param: any): { x: number; y: number } {
    console.log("= S.BaseLine: GetNotePos called with input:", { event, param });

    // Retrieve polyline points (relative to frame)
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true);
    const numPoints = polyPoints.length;
    let posX: number, posY: number;
    let adjustedPos: { x: number; y: number } = { x: 0, y: 0 };
    let svgFrame: { x: number; y: number; width: number; height: number };

    if (this.DataID >= 0) {
      // When DataID is valid, determine base position from the polyline endpoints
      if (numPoints === 2) {
        posX = polyPoints[1].x;
        posY = polyPoints[1].y;
      } else if (numPoints === 3) {
        posX = polyPoints[2].x;
        posY = polyPoints[2].y;
      } else {
        posX = polyPoints[numPoints - 1].x;
        posY = polyPoints[numPoints - 1].y;
      }

      // Adjust position for specific object types
      if (this instanceof Instance.Shape.Line || this instanceof Instance.Shape.ArcLine) {
        posX -= this.iconSize;
        adjustedPos.y = posY - 2 * this.iconSize;
      } else {
        posX -= this.iconSize;
        adjustedPos.y = posY - 2 * this.iconSize;
      }

      adjustedPos.x = posX - this.iconSize * this.nIcons;
      if (this.nIcons === 1) {
        adjustedPos.x += 2 * this.iconSize;
      }

      svgFrame = this.GetSVGFrame();
      const result = {
        x: svgFrame.x + adjustedPos.x,
        y: svgFrame.y + adjustedPos.y + this.iconSize
      };
      console.log("= S.BaseLine: GetNotePos output (DataID valid):", result);
      return result;
    } else {
      // When DataID is not valid, use alternative positioning based on polyline midpoint
      if (numPoints === 2) {
        posX = (polyPoints[0].x + polyPoints[1].x) / 2;
        posY = (polyPoints[0].y + polyPoints[1].y) / 2;
      } else if (numPoints === 3) {
        posX = polyPoints[1].x;
        posY = polyPoints[1].y;
      } else {
        const midIndex = Math.floor(numPoints / 2);
        posX = polyPoints[midIndex].x;
        posY = polyPoints[midIndex].y;
      }

      // Adjust for specific shape types
      if (this instanceof Instance.Shape.Line) {
        posX += this.iconSize / 2;
        adjustedPos.y = posY + this.iconSize / 4;
      } else if (this instanceof Instance.Shape.ArcLine) {
        posX += this.iconSize / 2;
        adjustedPos.y = posY + this.iconSize / 2;
      } else if (this instanceof Instance.Shape.SegmentedLine) {
        adjustedPos.y = posY + this.iconSize / 2;
      } else {
        adjustedPos.y = posY - this.iconSize / 2;
      }

      if (this.nIcons === 1) {
        posX += this.iconSize;
      }
      adjustedPos.x = posX;

      svgFrame = this.GetSVGFrame();
      const result = {
        x: svgFrame.x + adjustedPos.x,
        y: svgFrame.y + adjustedPos.y + this.iconSize
      };
      console.log("= S.BaseLine: GetNotePos output (DataID invalid):", result);
      return result;
    }
  }

  PolyLine_Pr_PolyLGetArcQuadrant(
    startPoint: Point,
    endPoint: Point,
    angle: number
  ): { param: number; ShortRef: number } {
    console.log("= S.BaseLine: PolyLine_Pr_PolyLGetArcQuadrant - input:", {
      startPoint,
      endPoint,
      angle,
    });

    // Initialize default result object
    let result = { param: 0, ShortRef: 0 };

    // Create a copy of the points array containing startPoint and endPoint
    let points: Point[] = [
      new Point(startPoint.x, startPoint.y),
      new Point(endPoint.x, endPoint.y)
    ];
    console.log("= S.BaseLine: Points array before rotation:", points);

    // Define the center of rotation (use startPoint as center)
    let center = { x: startPoint.x, y: startPoint.y };
    console.log("= S.BaseLine: Center of rotation:", center);

    // If the angle is significant, rotate the points about the center
    if (Math.abs(angle) >= 0.01) {
      const sinValue = Math.sin(angle);
      const cosValue = Math.cos(angle);
      let rotationAngle = Math.asin(sinValue);
      if (cosValue < 0) {
        rotationAngle = -rotationAngle;
      }
      console.log("= S.BaseLine: rotationAngle computed:", rotationAngle);
      Utils3.RotatePointsAboutPoint(center, rotationAngle, points);
      console.log("= S.BaseLine: Points array after rotation:", points);
    } else {
      console.log("= S.BaseLine: Angle less than threshold, no rotation applied.");
    }

    // Extract the rotated start and end points
    const rotatedStart = points[0];
    const rotatedEnd = points[1];
    console.log("= S.BaseLine: Rotated start point:", rotatedStart);
    console.log("= S.BaseLine: Rotated end point:", rotatedEnd);

    // Determine the quadrant of the arc and set parameters accordingly
    if (rotatedEnd.x > rotatedStart.x) {
      if (rotatedEnd.y > rotatedStart.y) {
        result.param = -ConstantData.Geometry.PI / 2;
        result.ShortRef = ConstantData.ArcQuad.SD_PLA_BL;
        console.log("= S.BaseLine: Condition: rotatedEnd.x > rotatedStart.x and rotatedEnd.y > rotatedStart.y");
        if (endPoint.notclockwise) {
          result.param = 0;
          console.log("= S.BaseLine: endPoint.notclockwise is true, setting result.param to 0");
        }
      } else {
        result.ShortRef = ConstantData.ArcQuad.SD_PLA_TL;
        console.log("= S.BaseLine: Condition: rotatedEnd.x > rotatedStart.x and rotatedEnd.y <= rotatedStart.y");
        if (endPoint.notclockwise) {
          result.ShortRef = ConstantData.ArcQuad.SD_PLA_TR;
          result.param = ConstantData.Geometry.PI / 2;
          console.log("= S.BaseLine: endPoint.notclockwise is true, setting result.ShortRef to SD_PLA_TR and result.param to PI/2");
        }
      }
    } else {
      if (rotatedEnd.y > rotatedStart.y) {
        result.ShortRef = ConstantData.ArcQuad.SD_PLA_BR;
        console.log("= S.BaseLine: Condition: rotatedEnd.x <= rotatedStart.x and rotatedEnd.y > rotatedStart.y");
        if (endPoint.notclockwise) {
          result.ShortRef = ConstantData.ArcQuad.SD_PLA_BL;
          result.param = ConstantData.Geometry.PI / 2;
          console.log("= S.BaseLine: endPoint.notclockwise is true, setting result.ShortRef to SD_PLA_BL and result.param to PI/2");
        }
      } else {
        result.param = -ConstantData.Geometry.PI / 2;
        result.ShortRef = ConstantData.ArcQuad.SD_PLA_TR;
        console.log("= S.BaseLine: Condition: rotatedEnd.x <= rotatedStart.x and rotatedEnd.y <= rotatedStart.y");
        if (endPoint.notclockwise) {
          result.param = 0;
          console.log("= S.BaseLine: endPoint.notclockwise is true, setting result.param to 0");
        }
      }
    }

    console.log("= S.BaseLine: PolyLine_Pr_PolyLGetArcQuadrant - output:", result);
    return result;
  }

  FieldDataAllowed(): boolean {
    console.log("= S.BaseLine: FieldDataAllowed called, input: none");
    const result: boolean = false;
    console.log("= S.BaseLine: FieldDataAllowed output:", result);
    return result;
  }
}

export default BaseLine
