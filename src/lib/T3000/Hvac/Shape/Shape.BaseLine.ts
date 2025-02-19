



import BaseDrawingObject from './Shape.BaseDrawingObject'
import Utils2 from "../Helper/Utils2";
import Instance from "../Data/Instance/Instance"
import ConstantData from "../Data/ConstantData"

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

  GetDimensionTextForPoints(e, t) {
    //'use strict';
    var a,
      r = [],
      i = 0,
      n = 0,
      o = 0,
      s = 0,
      l = 0;
    if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Total) {
      var S = this.GetPolyPoints(200, !0, !1, !1, null);
      for (a = 1; a < S.length; a++) s = Math.abs(S[a].x - S[a - 1].x),
        l = Math.abs(S[a].y - S[a - 1].y),
        (s || l) &&
        (o += Math.sqrt(s * s + l * l))
    } else i = 360 - Utils1.CalcAngleFromPoints(e, t),
      n = 2 * Math.PI * (i / 360),
      r.push(new Point(e.x, e.y)),
      r.push(new Point(t.x, t.y)),
      Utils3.RotatePointsAboutCenter(this.Frame, - n, r),
      o = Math.abs(r[0].x - r[1].x);
    return this.GetLengthInRulerUnits(o)
  }

  EnforceMinimum(e) {
    var t,
      a = ConstantData.Defines.SED_MinDim;
    if (Utils2.IsEqual(this.EndPoint.x, this.StartPoint.x)) t = this.EndPoint.y - this.StartPoint.y,
      Math.abs(t) < a &&
      this.hooks.length < 2 &&
      (
        t >= 0 ? e ? this.StartPoint.y = this.EndPoint.y - a : this.EndPoint.y = this.StartPoint.y + a : e ? this.StartPoint.y = this.EndPoint.y + a : this.EndPoint.y = this.StartPoint.y - a
      );
    else if (Utils2.IsEqual(this.EndPoint.y, this.StartPoint.y)) t = this.EndPoint.x - this.StartPoint.x,
      Math.abs(t) < a &&
      this.hooks.length < 2 &&
      (
        t >= 0 ? e ? this.StartPoint.x = this.EndPoint.x - a : this.EndPoint.x = this.StartPoint.x + a : e ? this.StartPoint.x = this.EndPoint.x + a : this.EndPoint.x = this.StartPoint.x - a
      );
    else {
      var r,
        i;
      r = this.EndPoint.x - this.StartPoint.x,
        i = this.EndPoint.y - this.StartPoint.y,
        Math.abs(r) < a &&
        Math.abs(i) < a &&
        this.hooks.length < 2 &&
        (
          Math.abs(r) >= Math.abs(i) ? r >= 0 ? e ? this.StartPoint.x = this.EndPoint.x - a : this.EndPoint.x = this.StartPoint.x + a : e ? this.StartPoint.x = this.EndPoint.x + a : this.EndPoint.x = this.StartPoint.x - a : i >= 0 ? e ? this.StartPoint.y = this.EndPoint.y - a : this.EndPoint.y = this.StartPoint.y + a : e ? this.StartPoint.y = this.EndPoint.y + a : this.EndPoint.y = this.StartPoint.y - a
        )
    }
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
    const trackCoords = this.LM_ActionDuringTrack(adjustedCoords);

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

  GetBestHook(hookPointID: number, hookPoint: Point, relativePoint: Point): number {
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
}

export default BaseLine
