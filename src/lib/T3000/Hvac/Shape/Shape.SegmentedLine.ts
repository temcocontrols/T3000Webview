

import BaseLine from './Shape.BaseLine'
import ListManager from '../Data/ListManager';
import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import GlobalData from '../Data/GlobalData'
// import Collab from '../Data/Collab'
import FileParser from '../Data/FileParser'
import DefaultEvt from "../Event/DefaultEvt";
import Resources from '../Data/Resources'
import Document from '../Basic/Basic.Document'
import Element from '../Basic/Basic.Element';
import BaseShape from './Shape.BaseShape';
import ConstantData from '../Data/ConstantData'
import PolySeg from '../Model/PolySeg'
import SelectionAttributes from '../Model/SelectionAttributes'
import SegLine from '../Model/SegLine';
import Point from '../Model/Point'
import $ from 'jquery'
import SDF from '../Data/SDF'
import ConstantData2 from '../Data/ConstantData2'

class SegmentedLine extends BaseLine {

  public segl: any;
  public hoplist: any;
  public ArrowheadData: any;
  public StartArrowID: number;
  public EndArrowID: number;
  public StartArrowDisp: boolean;
  public EndArrowDisp: boolean;
  public ArrowSizeIndex: number;
  public TextDirection: boolean;

  constructor(options: any) {
    console.log("= S.SegmentedLine: constructor input", options);

    const e = options || {};
    e.LineType = e.LineType || ConstantData.LineType.SEGLINE;

    super(e);

    // Initialize segmentation line information
    this.segl = e.segl || new SegLine();
    if (e.curveparam != null) {
      this.segl.curveparam = e.curveparam;
    }

    // Set up start and end points with defaults
    this.StartPoint = e.StartPoint || { x: 0, y: 0 };
    this.EndPoint = e.EndPoint || { x: 0, y: 0 };

    // Format segmented line and calculate frame based on end point
    this.SegLFormat(this.EndPoint, ConstantData.ActionTriggerType.LINEEND, 0);
    this.CalcFrame();

    // Initialize hoplist and arrowhead data
    this.hoplist = e.hoplist || { nhops: 0, hops: [] };
    this.ArrowheadData = e.ArrowheadData || [];

    // Set up arrow properties
    this.StartArrowID = e.StartArrowID || 0;
    this.EndArrowID = e.EndArrowID || 0;
    this.StartArrowDisp = e.StartArrowDisp || false;
    this.EndArrowDisp = e.EndArrowDisp || false;
    this.ArrowSizeIndex = e.ArrowSizeIndex || 0;
    this.TextDirection = e.TextDirection || false;

    console.log("= S.SegmentedLine: constructor output", {
      segl: this.segl,
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint,
      hoplist: this.hoplist,
      ArrowheadData: this.ArrowheadData,
      StartArrowID: this.StartArrowID,
      EndArrowID: this.EndArrowID,
      StartArrowDisp: this.StartArrowDisp,
      EndArrowDisp: this.EndArrowDisp,
      ArrowSizeIndex: this.ArrowSizeIndex,
      TextDirection: this.TextDirection,
    });
  }

  CreateShape(svgDoc, isHidden) {
    console.log("= S.SegmentedLine: CreateShape input", { svgDoc, isHidden });
    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) return null;

    let polyPoints = [];
    const container = svgDoc.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER);
    const shapeLine = svgDoc.CreateShape(ConstantData.CreateShapeType.POLYLINE);
    shapeLine.SetID(ConstantData.SVGElementClass.SHAPE);

    const slopLine = svgDoc.CreateShape(ConstantData.CreateShapeType.POLYLINE);
    slopLine.SetID(ConstantData.SVGElementClass.SLOP);
    slopLine.ExcludeFromExport(true);

    this.CalcFrame();
    const frameRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

    // Obtain and format style record details.
    let style = this.StyleRecord;
    style = this.SVGTokenizerHook(style);
    const fillColor = style.Fill.Paint.Color; // not used further
    const strokeColor = style.Line.Paint.Color;
    let strokeThickness = style.Line.Thickness;
    const strokeOpacity = style.Line.Paint.Opacity;
    const strokePattern = style.Line.LinePattern;

    if (strokeThickness > 0 && strokeThickness < 1) {
      strokeThickness = 1;
    }

    let width = frameRect.width;
    let height = frameRect.height;
    if (width < strokeThickness) {
      width = strokeThickness;
    }
    if (height < strokeThickness) {
      height = strokeThickness;
    }

    container.SetSize(width, height);
    container.SetPos(frameRect.x, frameRect.y);
    shapeLine.SetSize(width, height);

    polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, false, false, null);
    if (this.hoplist.nhops !== 0) {
      const hopsResult = GlobalData.optManager.InsertHops(this, polyPoints, polyPoints.length);
      polyPoints = polyPoints.slice(0, hopsResult.npts);
    }

    this.UpdateSVG(shapeLine, polyPoints);
    shapeLine.SetFillColor("none");
    shapeLine.SetStrokeColor(strokeColor);
    shapeLine.SetStrokeOpacity(strokeOpacity);
    shapeLine.SetStrokeWidth(strokeThickness);
    if (strokePattern !== 0) {
      shapeLine.SetStrokePattern(strokePattern);
    }

    slopLine.SetSize(width, height);
    this.UpdateSVG(slopLine, polyPoints);
    slopLine.SetStrokeColor("white");
    slopLine.SetFillColor("none");
    slopLine.SetOpacity(0);
    if (isHidden) {
      slopLine.SetEventBehavior(ConstantData2.EventBehavior.HIDDEN_OUT);
    } else {
      slopLine.SetEventBehavior(ConstantData2.EventBehavior.NONE);
    }
    slopLine.SetStrokeWidth(strokeThickness + ConstantData.Defines.SED_Slop);

    container.AddElement(shapeLine);
    container.AddElement(slopLine);

    this.ApplyStyles(shapeLine, style);
    this.ApplyEffects(container, false, true);
    container.isShape = true;
    this.AddIcons(svgDoc, container);

    console.log("= S.SegmentedLine: CreateShape output", { shape: container });
    return container;
  }

  UpdateSVG(shape, points) {
    console.log("= S.SegmentedLine: UpdateSVG input", { shape, points });
    if (shape && shape.SetPoints) {
      shape.SetPoints(points);
    }
    console.log("= S.SegmentedLine: UpdateSVG output", { shape });
  }

  AllowHeal(): boolean {
    console.log("= S.SegmentedLine: AllowHeal input");
    const result: boolean = true;
    console.log("= S.SegmentedLine: AllowHeal output", result);
    return result;
  }

  CanUseStandOffDimensionLines() {
    console.log("= S.SegmentedLine: CanUseStandOffDimensionLines input");
    const result = false;
    console.log("= S.SegmentedLine: CanUseStandOffDimensionLines output", result);
    return result;
  }

  SegLFormat(point: Point, action: number, providedDir: number) {
    console.log("= S.SegmentedLine: SegLFormat input", { point, action, providedDir });

    let deltaX: number, deltaY: number, absDeltaX: number, absDeltaY: number;
    let rect: any;
    let ptsCount: number;
    let isLeftModified = false;
    let isRightModified = false;
    let isDirectionModified = false;
    const SegLDir = ConstantData.SegLDir;

    // Helper function to determine the new direction based on current direction and two points.
    const determineDirection = (currentDir: number, basePoint: Point, comparePoint: Point): number => {
      let direction = 0;
      const diffX = Math.abs(comparePoint.x - basePoint.x);
      const diffY = Math.abs(comparePoint.y - basePoint.y);
      switch (currentDir) {
        case ConstantData.SegLDir.SED_KTC:
          direction = comparePoint.y < basePoint.y
            ? (diffY >= diffX ? SegLDir.SED_KBC : (comparePoint.x < basePoint.x ? SegLDir.SED_KRC : SegLDir.SED_KLC))
            : SegLDir.SED_KTC;
          break;
        case ConstantData.SegLDir.SED_KBC:
          direction = comparePoint.y >= basePoint.y
            ? (diffY >= diffX ? SegLDir.SED_KTC : (comparePoint.x < basePoint.x ? SegLDir.SED_KRC : SegLDir.SED_KLC))
            : SegLDir.SED_KBC;
          break;
        case ConstantData.SegLDir.SED_KLC:
          direction = comparePoint.x < basePoint.x
            ? (diffY <= diffX ? SegLDir.SED_KRC : (comparePoint.y < basePoint.y ? SegLDir.SED_KBC : SegLDir.SED_KTC))
            : SegLDir.SED_KLC;
          break;
        case ConstantData.SegLDir.SED_KRC:
          direction = comparePoint.x > basePoint.x
            ? (diffY < diffX ? SegLDir.SED_KLC : (comparePoint.y < basePoint.y ? SegLDir.SED_KBC : SegLDir.SED_KTC))
            : SegLDir.SED_KRC;
          break;
        default:
          direction = currentDir;
      }
      return direction;
    };

    if (this.segl != null) {
      // Update StartPoint or EndPoint based on action type.
      switch (action) {
        case ConstantData.ActionTriggerType.LINESTART:
          this.StartPoint.x = point.x;
          this.StartPoint.y = point.y;
          break;
        case ConstantData.ActionTriggerType.SEGL_PRESERVE:
        case ConstantData.ActionTriggerType.LINEEND:
          this.EndPoint.x = point.x;
          this.EndPoint.y = point.y;
          break;
      }

      if (this.segl.firstdir !== 0 || this.segl.lastdir !== 0) {
        if (this.segl.lastdir === 0) {
          switch (action) {
            case ConstantData.ActionTriggerType.LINESTART:
            case ConstantData.ActionTriggerType.SEGL_ONE:
            case ConstantData.ActionTriggerType.SEGL_TWO:
            case ConstantData.ActionTriggerType.SEGL_THREE:
              providedDir = determineDirection(this.segl.firstdir, point, this.EndPoint);
              break;
            case ConstantData.ActionTriggerType.SEGL_PRESERVE:
              providedDir = determineDirection(this.segl.firstdir, this.StartPoint, this.EndPoint);
              break;
            default:
              providedDir = determineDirection(this.segl.firstdir, this.StartPoint, point);
          }
          isLeftModified = true;
          this.segl.lastdir = providedDir;
          isDirectionModified = true;
        }
        if (this.segl.firstdir === 0) {
          switch (action) {
            case ConstantData.ActionTriggerType.LINEEND:
            case ConstantData.ActionTriggerType.SEGL_ONE:
            case ConstantData.ActionTriggerType.SEGL_TWO:
            case ConstantData.ActionTriggerType.SEGL_THREE:
              providedDir = determineDirection(this.segl.lastdir, point, this.StartPoint);
              break;
            case ConstantData.ActionTriggerType.SEGL_PRESERVE:
              providedDir = determineDirection(this.segl.lastdir, this.EndPoint, this.StartPoint);
              break;
            default:
              providedDir = determineDirection(this.segl.lastdir, this.EndPoint, point);
          }
          isRightModified = true;
          this.segl.firstdir = providedDir;
          isDirectionModified = true;
        }

        // Execute segmentation based on the first direction.
        switch (this.segl.firstdir) {
          case ConstantData.SegLDir.SED_KTC:
            switch (this.segl.lastdir) {
              case ConstantData.SegLDir.SED_KTC:
                this.SegLTopToTop(action, point, 1, false, isDirectionModified);
                break;
              case ConstantData.SegLDir.SED_KBC:
                this.SegLTopToBottom(action, point, 1, false);
                break;
              case ConstantData.SegLDir.SED_KLC:
                this.SegLTopToLeft(action, point, 1, 1, false, isDirectionModified);
                break;
              case ConstantData.SegLDir.SED_KRC:
                this.SegLTopToLeft(action, point, 1, -1, false, isDirectionModified);
                break;
            }
            break;
          case ConstantData.SegLDir.SED_KBC:
            switch (this.segl.lastdir) {
              case ConstantData.SegLDir.SED_KTC:
                this.SegLTopToBottom(action, point, -1, false);
                break;
              case ConstantData.SegLDir.SED_KBC:
                this.SegLTopToTop(action, point, -1, false, isDirectionModified);
                break;
              case ConstantData.SegLDir.SED_KLC:
                this.SegLTopToLeft(action, point, -1, 1, false, isDirectionModified);
                break;
              case ConstantData.SegLDir.SED_KRC:
                this.SegLTopToLeft(action, point, -1, -1, false, isDirectionModified);
                break;
            }
            break;
          case ConstantData.SegLDir.SED_KLC:
            switch (this.segl.lastdir) {
              case ConstantData.SegLDir.SED_KTC:
                this.SegLTopToLeft(action, point, 1, 1, true, isDirectionModified);
                break;
              case ConstantData.SegLDir.SED_KBC:
                this.SegLTopToLeft(action, point, 1, -1, true, isDirectionModified);
                break;
              case ConstantData.SegLDir.SED_KLC:
                this.SegLTopToTop(action, point, 1, true, isDirectionModified);
                break;
              case ConstantData.SegLDir.SED_KRC:
                this.SegLTopToBottom(action, point, 1, true);
                break;
            }
            break;
          case ConstantData.SegLDir.SED_KRC:
            switch (this.segl.lastdir) {
              case ConstantData.SegLDir.SED_KTC:
                this.SegLTopToLeft(action, point, -1, 1, true, isDirectionModified);
                break;
              case ConstantData.SegLDir.SED_KBC:
                this.SegLTopToLeft(action, point, -1, -1, true, isDirectionModified);
                break;
              case ConstantData.SegLDir.SED_KLC:
                this.SegLTopToBottom(action, point, -1, true);
                break;
              case ConstantData.SegLDir.SED_KRC:
                this.SegLTopToTop(action, point, -1, true, isDirectionModified);
                break;
            }
            break;
        }
        if (isLeftModified) {
          this.segl.lastdir = 0;
        }
        if (isRightModified) {
          this.segl.firstdir = 0;
        }
      } else {
        // When both firstdir and lastdir are zero, re-calculate segmentation solely based on difference.
        deltaX = this.EndPoint.x - this.StartPoint.x;
        deltaY = this.EndPoint.y - this.StartPoint.y;
        absDeltaX = Math.abs(deltaX);
        absDeltaY = Math.abs(deltaY);
        rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
        if ((absDeltaY >= 1 || absDeltaX >= 1)) {
          if (providedDir === 0) {
            providedDir = (absDeltaX - absDeltaY > 0.01)
              ? ConstantData.Defines.SED_HorizOnly
              : ConstantData.Defines.SED_VertOnly;
          }
          // Clear previous segmentation array.
          this.segl.pts.splice(0);
          this.segl.lengths.splice(0);
          if (providedDir === ConstantData.Defines.SED_HorizOnly) {
            if (absDeltaY < 1) {
              this.segl.pts.push(new Point(this.StartPoint.x, this.StartPoint.y));
              this.segl.pts.push(new Point(this.EndPoint.x, this.EndPoint.y));
              this.segl.lengths.push(deltaX);
            } else {
              const half = deltaX / 2;
              this.segl.pts.push(new Point(this.StartPoint.x, this.StartPoint.y));
              this.segl.pts.push(new Point(this.StartPoint.x + deltaX / 2, this.StartPoint.y));
              this.segl.pts.push(new Point(this.StartPoint.x + deltaX / 2, this.EndPoint.y));
              this.segl.pts.push(new Point(this.EndPoint.x, this.EndPoint.y));
              this.segl.lengths.push(half);
              this.segl.lengths.push(deltaY);
              this.segl.lengths.push(half);
            }
          } else if (providedDir === ConstantData.Defines.SED_VertOnly) {
            if (absDeltaX < 1) {
              this.segl.pts.push(new Point(this.StartPoint.x, this.StartPoint.y));
              this.segl.pts.push(new Point(this.EndPoint.x, this.EndPoint.y));
              this.segl.lengths.push(deltaY);
            } else {
              const half = deltaY / 2;
              this.segl.pts.push(new Point(this.StartPoint.x, this.StartPoint.y));
              this.segl.pts.push(new Point(this.StartPoint.x, this.StartPoint.y + deltaY / 2));
              this.segl.pts.push(new Point(this.EndPoint.x, this.StartPoint.y + deltaY / 2));
              this.segl.pts.push(new Point(this.EndPoint.x, this.EndPoint.y));
              this.segl.lengths.push(half);
              this.segl.lengths.push(deltaX);
              this.segl.lengths.push(half);
            }
          }
          // Adjust all points relative to the rectangle origin.
          ptsCount = this.segl.pts.length;
          for (let idx = 0; idx < ptsCount; idx++) {
            this.segl.pts[idx].x -= rect.x;
            this.segl.pts[idx].y -= rect.y;
          }
        }
      }

      console.log("= S.SegmentedLine: SegLFormat output", { StartPoint: this.StartPoint, EndPoint: this.EndPoint, segl: this.segl });
    }
  }

  GetDimensionPoints() {
    console.log("= S.SegmentedLine: GetDimensionPoints input", {
      Dimensions: this.Dimensions,
      Frame: this.Frame,
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint,
    });

    let dimensionPoints: Point[] = [];

    // Use all segmentation points if flag set
    if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_AllSeg) {
      dimensionPoints = this.segl.pts;
    }
    // Calculate total dimension if flag set
    else if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Total) {
      // Deep copy the points and adjust them by the frame offsets
      let copiedPoints = Utils1.DeepCopy(this.segl.pts);
      for (let i = 0; i < copiedPoints.length; i++) {
        copiedPoints[i].x += this.Frame.x;
        copiedPoints[i].y += this.Frame.y;
      }

      // Calculate segment distances (result not used directly, but kept for potential logging)
      for (let i = 1; i < copiedPoints.length; i++) {
        const dx = Math.abs(copiedPoints[i - 1].x - copiedPoints[i].x);
        const dy = Math.abs(copiedPoints[i - 1].y - copiedPoints[i].y);
        const distance = Math.sqrt(dx * dx + dy * dy);
        console.log("= S.SegmentedLine: Segment distance", { index: i, distance });
      }

      // Calculate center based on the overall rectangle
      const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      const halfYOffset = (this.Frame.y - rect.y) / 2;
      const halfXOffset = (this.Frame.x - rect.x) / 2;
      const center = {
        x: this.Frame.width / 2 + halfXOffset,
        y: this.Frame.height / 2 + halfYOffset,
      };

      // Create two measurement points offset by 10 pixels to the left and right of center
      const startMeasurePoint = { x: center.x - 10, y: center.y };
      const endMeasurePoint = { x: center.x + 10, y: center.y };

      dimensionPoints.push(new Point(startMeasurePoint.x, startMeasurePoint.y));
      dimensionPoints.push(new Point(endMeasurePoint.x, endMeasurePoint.y));
    }
    // Fallback: use start and end points relative to the rectangle
    else {
      const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      dimensionPoints.push(new Point(this.StartPoint.x - rect.x, this.StartPoint.y - rect.y));
      dimensionPoints.push(new Point(this.EndPoint.x - rect.x, this.EndPoint.y - rect.y));
    }

    console.log("= S.SegmentedLine: GetDimensionPoints output", dimensionPoints);
    return dimensionPoints;
  }

  SegLTopToTop(
    action: number,
    point: Point,
    factor: number,
    isVertical: boolean,
    flag: boolean
  ) {
    console.log("= S.SegmentedLine: SegLTopToTop input", {
      action,
      point,
      factor,
      isVertical,
      flag,
    });

    // Define readable variable names
    let horizontalDiff: number,
      verticalDiff: number;
    let startPrimary: number,
      startSecondary: number;
    let endPrimary: number,
      endSecondary: number;
    let boundingRect: any;
    let totalPoints: number;
    let hookObjRect: any;
    let adjustmentValue: number;
    let hookAdjustmentNeeded = 0;
    let preserve = false;
    const SEG_DIM = ConstantData.Defines.SED_CDim;

    // Temporary max dimension placeholder
    let maxDim: Point = { x: 0, y: 0 };

    if (isVertical) {
      // Compute based on vertical differences.
      verticalDiff = Math.abs(this.EndPoint.y - this.StartPoint.y);
      horizontalDiff = Math.abs(this.EndPoint.x - this.StartPoint.x);
      startPrimary = this.StartPoint.y;
      startSecondary = this.StartPoint.x;
      endPrimary = this.EndPoint.y;
      endSecondary = this.EndPoint.x;
      boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      // Swap boundingRect.x and boundingRect.y for proper adjustment
      let temp = boundingRect.x;
      boundingRect.x = boundingRect.y;
      boundingRect.y = temp;
      GlobalData.optManager.GetMaxDim(maxDim);
      temp = maxDim.x;
      maxDim.x = maxDim.y;
      maxDim.y = temp;
    } else {
      // Compute based on horizontal differences.
      verticalDiff = Math.abs(this.EndPoint.x - this.StartPoint.x);
      horizontalDiff = Math.abs(this.EndPoint.y - this.StartPoint.y);
      startPrimary = this.StartPoint.x;
      startSecondary = this.StartPoint.y;
      endPrimary = this.EndPoint.x;
      endSecondary = this.EndPoint.y;
      boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      GlobalData.optManager.GetMaxDim(maxDim);
    }

    totalPoints = this.segl.pts.length;
    // Clear segmentation points
    this.segl.pts.splice(0);

    // Check hooks for adjustment if available.
    if (this.hooks && this.hooks.length > 0) {
      if (
        isVertical
          ? (factor === -1
            ? this.StartPoint.x > this.EndPoint.x
            : this.StartPoint.x < this.EndPoint.x)
          : (factor === -1
            ? this.StartPoint.y > this.EndPoint.y
            : this.StartPoint.y < this.EndPoint.y)
      ) {
        for (let j = 0; j < this.hooks.length; j++) {
          if (this.hooks[j].hookpt === ConstantData.HookPts.SED_KTL) {
            const hookObj = GlobalData.optManager.GetObjectPtr(
              this.hooks[j].objid,
              false
            );
            if (hookObj) {
              hookObjRect = hookObj.GetTargetRect();
              if (isVertical) {
                adjustmentValue =
                  this.StartPoint.y +
                  hookObjRect.height *
                  ((SEG_DIM - this.hooks[j].connect.y) / SEG_DIM) +
                  ConstantData.Defines.SED_SegDefLen;
              } else {
                adjustmentValue =
                  this.StartPoint.x +
                  hookObjRect.width *
                  ((SEG_DIM - this.hooks[j].connect.x) / SEG_DIM) +
                  ConstantData.Defines.SED_SegDefLen;
              }
              break;
            }
          }
        }
      } else {
        for (let j = 0; j < this.hooks.length; j++) {
          if (this.hooks[j].hookpt === ConstantData.HookPts.SED_KTR) {
            const hookObj = GlobalData.optManager.GetObjectPtr(
              this.hooks[j].objid,
              false
            );
            if (hookObj) {
              hookObjRect = hookObj.GetTargetRect();
              if (isVertical) {
                adjustmentValue =
                  this.EndPoint.y +
                  hookObjRect.height *
                  ((SEG_DIM - this.hooks[j].connect.y) / SEG_DIM) +
                  ConstantData.Defines.SED_SegDefLen;
              } else {
                adjustmentValue =
                  this.EndPoint.x +
                  hookObjRect.width *
                  ((SEG_DIM - this.hooks[j].connect.x) / SEG_DIM) +
                  ConstantData.Defines.SED_SegDefLen;
              }
              break;
            }
          }
        }
      }
      if (hookObjRect) {
        hookAdjustmentNeeded = isVertical
          ? verticalDiff < hookObjRect.height / 2 + ConstantData.Defines.SED_SegMinLen
            ? 1
            : 0
          : verticalDiff < hookObjRect.width / 2 + ConstantData.Defines.SED_SegMinLen
            ? 1
            : 0;
      }
    }

    if (horizontalDiff < ConstantData.Defines.SED_SegMinSeg) {
      horizontalDiff = 0;
    }

    if (action === ConstantData.ActionTriggerType.SEGL_PRESERVE) {
      preserve = totalPoints === 4;
    }

    if (flag) {
      preserve = true;
    }

    if (
      !preserve &&
      ((verticalDiff > ConstantData.Defines.SED_SegMinLen ||
        horizontalDiff < ConstantData.Defines.SED_SegMinLen) &&
        !hookAdjustmentNeeded)
    ) {
      if (totalPoints !== 4) {
        this.segl.lengths.splice(0);
      }
      if (isVertical) {
        this.segl.pts.push(new Point(startSecondary - boundingRect.y, startPrimary - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(startPrimary - boundingRect.x, startSecondary - boundingRect.y));
      }
      if (this.segl.lengths.length < 1) {
        this.segl.lengths.push(ConstantData.Defines.SED_SegDefLen);
      }
      let firstLength = this.segl.lengths[0];
      let computedLength: number;
      if (action === ConstantData.ActionTriggerType.SEGL_ONE) {
        if (isVertical) {
          this.segl.lengths[0] = factor * (startSecondary - point.x);
          computedLength = factor * (endSecondary - point.x);
        } else {
          this.segl.lengths[0] = factor * (startSecondary - point.y);
          computedLength = factor * (endSecondary - point.y);
        }
        if (this.segl.lengths[0] < ConstantData.Defines.SED_SegMinLen) {
          this.segl.lengths[0] = ConstantData.Defines.SED_SegMinLen;
        }
        if (computedLength < ConstantData.Defines.SED_SegMinLen) {
          computedLength = ConstantData.Defines.SED_SegMinLen;
        }
        if (computedLength < firstLength) {
          firstLength = computedLength;
        }
      } else if (firstLength > ConstantData.Defines.SED_SegDefLen) {
        firstLength = ConstantData.Defines.SED_SegDefLen;
      }
      let coordU = startSecondary - factor * this.segl.lengths[0];
      if (coordU < 0) {
        coordU = 0;
      }
      if (coordU > maxDim.y) {
        coordU = maxDim.y;
      }
      let coordP = endSecondary - factor * firstLength;
      if (coordP < 0) {
        coordP = 0;
      }
      if (coordP > maxDim.y) {
        coordP = maxDim.y;
      }
      if (factor === -1) {
        if (coordP > coordU) {
          coordU = coordP;
        }
      } else {
        if (coordP < coordU) {
          coordU = coordP;
        }
      }
      if (isVertical) {
        this.segl.pts.push(new Point(coordU - boundingRect.y, startPrimary - boundingRect.x));
        this.segl.pts.push(new Point(coordU - boundingRect.y, endPrimary - boundingRect.x));
        this.segl.pts.push(new Point(endSecondary - boundingRect.y, endPrimary - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(startPrimary - boundingRect.x, coordU - boundingRect.y));
        this.segl.pts.push(new Point(endPrimary - boundingRect.x, coordU - boundingRect.y));
        this.segl.pts.push(new Point(endPrimary - boundingRect.x, endSecondary - boundingRect.y));
      }
    } else {
      if (totalPoints !== 6) {
        this.segl.lengths.splice(0);
      }
      if (isVertical) {
        this.segl.pts.push(new Point(startSecondary - boundingRect.y, startPrimary - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(startPrimary - boundingRect.x, startSecondary - boundingRect.y));
      }
      if (this.segl.lengths.length < 1) {
        this.segl.lengths.push(ConstantData.Defines.SED_SegDefLen);
      }
      if (action === ConstantData.ActionTriggerType.SEGL_ONE) {
        if (isVertical) {
          this.segl.lengths[0] = factor * (startSecondary - point.x);
        } else {
          this.segl.lengths[0] = factor * (startSecondary - point.y);
        }
        if (this.segl.lengths[0] < ConstantData.Defines.SED_SegMinLen) {
          this.segl.lengths[0] = ConstantData.Defines.SED_SegMinLen;
        }
      }
      let coordU = startSecondary - factor * this.segl.lengths[0];
      if (coordU < 0) {
        coordU = 0;
      }
      if (coordU > maxDim.y) {
        coordU = maxDim.y;
      }
      if (isVertical) {
        this.segl.pts.push(new Point(coordU - boundingRect.y, startPrimary - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(startPrimary - boundingRect.x, coordU - boundingRect.y));
      }
      if (this.segl.lengths.length < 2) {
        this.segl.lengths.push(ConstantData.Defines.SED_SegDefLen);
      }
      if (action === ConstantData.ActionTriggerType.SEGL_TWO) {
        if (isVertical) {
          this.segl.lengths[1] = point.y - startPrimary;
        } else {
          this.segl.lengths[1] = point.x - startPrimary;
        }
        if (this.segl.lengths[1] < ConstantData.Defines.SED_SegMinLen) {
          this.segl.lengths[1] = ConstantData.Defines.SED_SegMinLen;
        }
      } else if (hookAdjustmentNeeded) {
        const lengthToHook = adjustmentValue - startPrimary;
        if (this.segl.lengths[1] < lengthToHook) {
          this.segl.lengths[1] = lengthToHook;
        }
      }
      let coordD = startPrimary + this.segl.lengths[1];
      if (coordD < 0) {
        coordD = 0;
      }
      if (coordD > maxDim.x) {
        coordD = maxDim.x;
      }
      if (isVertical) {
        this.segl.pts.push(new Point(coordU - boundingRect.y, coordD - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(coordD - boundingRect.x, coordU - boundingRect.y));
      }
      if (this.segl.lengths.length < 3) {
        this.segl.lengths.push(ConstantData.Defines.SED_SegDefLen);
      }
      if (action === ConstantData.ActionTriggerType.SEGL_THREE) {
        if (isVertical) {
          this.segl.lengths[2] = factor * (endSecondary - point.x);
        } else {
          this.segl.lengths[2] = factor * (endSecondary - point.y);
        }
        if (this.segl.lengths[2] < ConstantData.Defines.SED_SegMinLen) {
          this.segl.lengths[2] = ConstantData.Defines.SED_SegMinLen;
        }
      }
      let coordP = endSecondary - factor * this.segl.lengths[2];
      if (coordP < 0) {
        coordP = 0;
      }
      if (coordP > maxDim.y) {
        coordP = maxDim.y;
      }
      if (isVertical) {
        this.segl.pts.push(new Point(coordP - boundingRect.y, coordD - boundingRect.x));
        this.segl.pts.push(new Point(coordP - boundingRect.y, endPrimary - boundingRect.x));
        this.segl.pts.push(new Point(endSecondary - boundingRect.y, endPrimary - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(coordD - boundingRect.x, coordP - boundingRect.y));
        this.segl.pts.push(new Point(endPrimary - boundingRect.x, coordP - boundingRect.y));
        this.segl.pts.push(new Point(endPrimary - boundingRect.x, endSecondary - boundingRect.y));
      }
    }

    console.log("= S.SegmentedLine: SegLTopToTop output", {
      pts: this.segl.pts,
      lengths: this.segl.lengths,
    });
  }

  SegLTopToBottom(actionType: number, pt: Point, factor: number, isVertical: boolean) {
    console.log("= S.SegmentedLine: SegLTopToBottom input", { actionType, pt, factor, isVertical });

    let calcVar: any;
    let SDim: number;
    let startPrimary: number;
    let startSecondary: number;
    let endPrimary: number;
    let endSecondary: number;
    let rect: any;
    let maxDim: Point = { x: 0, y: 0 };
    let hookCondition: boolean;
    let ptsCount = this.segl.pts.length;
    // Temporary variables for later use
    let tempPoint: number;
    let hookAdjustLength: number = 0;
    const segDim: number = ConstantData.Defines.SED_CDim;

    // Depending on orientation, calculate geometry variables
    if (isVertical) {
      // Vertical orientation
      // Calculate horizontal differences etc.
      Math.abs(this.EndPoint.y - this.StartPoint.y);
      SDim = Math.abs(this.EndPoint.x - this.StartPoint.x);
      startPrimary = this.StartPoint.y;
      startSecondary = this.StartPoint.x;
      endPrimary = this.EndPoint.y;
      endSecondary = this.EndPoint.x;
      rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      // Swap rect coordinates for vertical adjustment
      let swap = rect.x;
      rect.x = rect.y;
      rect.y = swap;
      GlobalData.optManager.GetMaxDim(maxDim);
      swap = maxDim.x;
      maxDim.x = maxDim.y;
      maxDim.y = swap;
    } else {
      // Horizontal orientation
      Math.abs(this.EndPoint.x - this.StartPoint.x);
      SDim = Math.abs(this.EndPoint.y - this.StartPoint.y);
      startPrimary = this.StartPoint.x;
      startSecondary = this.StartPoint.y;
      endPrimary = this.EndPoint.x;
      endSecondary = this.EndPoint.y;
      rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      GlobalData.optManager.GetMaxDim(maxDim);
    }

    // Determine hook condition based on factor and segment minimum length constraints
    hookCondition = (factor === -1 ? (endSecondary - 2 * ConstantData.Defines.SED_SegMinLen > startSecondary)
      : (endSecondary + 2 * ConstantData.Defines.SED_SegMinLen < startSecondary));
    // Store current point segment count and clear points
    ptsCount = this.segl.pts.length;
    this.segl.pts.splice(0);

    // When preserving, override hookCondition based on a segment count check
    if (actionType === ConstantData.ActionTriggerType.SEGL_PRESERVE) {
      hookCondition = (ptsCount !== 6);
    }

    // CASE 1: Hook condition satisfied
    if (hookCondition) {
      // If the primary coordinate difference is minimal, simply create two points
      if (Math.abs(startPrimary - endPrimary) <= 1) {
        if (isVertical) {
          this.segl.pts.push(new Point(startSecondary - rect.y, startPrimary - rect.x));
          this.segl.pts.push(new Point(endSecondary - rect.y, startPrimary - rect.x));
        } else {
          this.segl.pts.push(new Point(startPrimary - rect.x, startSecondary - rect.y));
          this.segl.pts.push(new Point(startPrimary - rect.x, endSecondary - rect.y));
        }
        this.segl.lengths.splice(0);
      } else {
        // Otherwise, adjust segmentation lengths and compute intermediate points
        if (ptsCount !== 4) {
          this.segl.lengths.splice(0);
        }
        if (isVertical) {
          this.segl.pts.push(new Point(startSecondary - rect.y, startPrimary - rect.x));
        } else {
          this.segl.pts.push(new Point(startPrimary - rect.x, startSecondary - rect.y));
        }
        if (this.segl.lengths.length < 1) {
          this.segl.lengths.push(ConstantData.Defines.SED_SegDefLen);
        }
        if (actionType === ConstantData.ActionTriggerType.SEGL_ONE) {
          this.segl.lengths[0] = isVertical ? factor * (startSecondary - pt.x) : factor * (startSecondary - pt.y);
          if (this.segl.lengths[0] < ConstantData.Defines.SED_SegMinLen) {
            this.segl.lengths[0] = ConstantData.Defines.SED_SegMinLen;
          }
        } else {
          if (actionType !== ConstantData.ActionTriggerType.SEGL_PRESERVE && this.segl.lengths[0] < ConstantData.Defines.SED_SegDefLen) {
            this.segl.lengths[0] = ConstantData.Defines.SED_SegDefLen;
          }
          if (this.segl.lengths[0] > SDim - ConstantData.Defines.SED_SegMinLen) {
            this.segl.lengths[0] = SDim - ConstantData.Defines.SED_SegMinLen;
          }
        }
        // Calculate new intermediate coordinate i based on factor and segment length
        tempPoint = startSecondary - factor * this.segl.lengths[0];
        if (tempPoint < 0) {
          tempPoint = 0;
        }
        if (tempPoint > maxDim.y) {
          tempPoint = maxDim.y;
        }
        // Calculate another coordinate n using minimum segment length
        let nCoord = endSecondary + factor * ConstantData.Defines.SED_SegMinLen;
        if (nCoord < 0) {
          nCoord = 0;
        }
        if (nCoord > maxDim.y) {
          nCoord = maxDim.y;
        }
        // Adjust coordinates based on factor polarity
        if (factor === -1) {
          if (nCoord < startSecondary + ConstantData.Defines.SED_SegMinLen) {
            nCoord = startSecondary + ConstantData.Defines.SED_SegMinLen;
          }
          if (nCoord < tempPoint) {
            tempPoint = nCoord;
          }
        } else {
          if (nCoord > startSecondary - ConstantData.Defines.SED_SegMinLen) {
            nCoord = startSecondary - ConstantData.Defines.SED_SegMinLen;
          }
          if (nCoord > tempPoint) {
            tempPoint = nCoord;
          }
        }
        // Push remaining segmentation points
        if (isVertical) {
          this.segl.pts.push(new Point(tempPoint - rect.y, startPrimary - rect.x));
          this.segl.pts.push(new Point(tempPoint - rect.y, endPrimary - rect.x));
          this.segl.pts.push(new Point(endSecondary - rect.y, endPrimary - rect.x));
        } else {
          this.segl.pts.push(new Point(startPrimary - rect.x, tempPoint - rect.y));
          this.segl.pts.push(new Point(endPrimary - rect.x, tempPoint - rect.y));
          this.segl.pts.push(new Point(endPrimary - rect.x, endSecondary - rect.y));
        }
      }
    } else {
      // CASE 2: Hook condition not satisfied
      // Try to calculate hook adjustment from available hooks
      if (this.hooks && this.hooks.length > 0) {
        for (let h = 0; h < this.hooks.length; h++) {
          if (this.hooks[h].hookpt === ConstantData.HookPts.SED_KTL) {
            const hookObj = GlobalData.optManager.GetObjectPtr(this.hooks[h].objid, false);
            if (hookObj) {
              const hookRect = hookObj.GetTargetRect();
              if (isVertical) {
                hookAdjustLength = startPrimary <= endPrimary
                  ? this.StartPoint.y + hookRect.height * ((segDim - this.hooks[h].connect.y) / segDim) + ConstantData.Defines.SED_SegDefLen
                  : this.StartPoint.y + hookRect.height * (this.hooks[h].connect.y / segDim) + ConstantData.Defines.SED_SegDefLen;
              } else {
                hookAdjustLength = startPrimary <= endPrimary
                  ? this.StartPoint.x + hookRect.width * ((segDim - this.hooks[h].connect.x) / segDim) + ConstantData.Defines.SED_SegDefLen
                  : this.StartPoint.x + hookRect.width * (this.hooks[h].connect.x / segDim) + ConstantData.Defines.SED_SegDefLen;
              }
              break;
            }
          }
        }
      }
      if (ptsCount !== 6) {
        this.segl.lengths.splice(0);
      }
      // Add first segmentation point
      if (isVertical) {
        this.segl.pts.push(new Point(startSecondary - rect.y, startPrimary - rect.x));
      } else {
        this.segl.pts.push(new Point(startPrimary - rect.x, startSecondary - rect.y));
      }
      if (this.segl.lengths.length < 1) {
        this.segl.lengths.push(ConstantData.Defines.SED_SegDefLen);
      }
      if (actionType === ConstantData.ActionTriggerType.SEGL_ONE) {
        this.segl.lengths[0] = isVertical ? factor * (startSecondary - pt.x) : factor * (startSecondary - pt.y);
        if (this.segl.lengths[0] < ConstantData.Defines.SED_SegMinLen) {
          this.segl.lengths[0] = ConstantData.Defines.SED_SegMinLen;
        }
      }
      tempPoint = startSecondary - factor * this.segl.lengths[0];
      if (tempPoint < 0) {
        tempPoint = 0;
      }
      if (tempPoint > maxDim.y) {
        tempPoint = maxDim.y;
      }
      if (isVertical) {
        this.segl.pts.push(new Point(tempPoint - rect.y, startPrimary - rect.x));
      } else {
        this.segl.pts.push(new Point(startPrimary - rect.x, tempPoint - rect.y));
      }
      if (this.segl.lengths.length < 2) {
        this.segl.lengths.push(ConstantData.Defines.SED_SegDefLen);
      }
      if (actionType === ConstantData.ActionTriggerType.SEGL_TWO) {
        this.segl.lengths[1] = startPrimary <= endPrimary
          ? (isVertical ? pt.y - startPrimary : pt.x - startPrimary)
          : (isVertical ? -(pt.y - startPrimary) : -(pt.x - startPrimary));
      } else if (hookAdjustLength) {
        const availableLength = hookAdjustLength - startPrimary;
        if (this.segl.lengths[1] < availableLength) {
          this.segl.lengths[1] = availableLength;
        }
      }
      // Calculate coordinate o based on the second segment
      let oCoord: number;
      if (startPrimary <= endPrimary) {
        oCoord = startPrimary + this.segl.lengths[1];
        if (Math.abs(endPrimary - oCoord) < ConstantData.Defines.SED_SegMinLen) {
          oCoord = oCoord < endPrimary ? endPrimary - ConstantData.Defines.SED_SegMinLen : endPrimary + ConstantData.Defines.SED_SegMinLen;
        }
      } else {
        oCoord = startPrimary - this.segl.lengths[1];
        if (Math.abs(oCoord - endPrimary) < ConstantData.Defines.SED_SegMinLen) {
          oCoord = oCoord < endPrimary ? endPrimary - ConstantData.Defines.SED_SegMinLen : endPrimary + ConstantData.Defines.SED_SegMinLen;
        }
      }
      if (oCoord < 0) {
        oCoord = 0;
      }
      if (oCoord > maxDim.x) {
        oCoord = maxDim.x;
      }
      if (isVertical) {
        this.segl.pts.push(new Point(tempPoint - rect.y, oCoord - rect.x));
      } else {
        this.segl.pts.push(new Point(oCoord - rect.x, tempPoint - rect.y));
      }
      if (this.segl.lengths.length < 3) {
        this.segl.lengths.push(ConstantData.Defines.SED_SegDefLen);
      }
      if (actionType === ConstantData.ActionTriggerType.SEGL_THREE) {
        this.segl.lengths[2] = isVertical ? -factor * (endSecondary - pt.x) : -factor * (endSecondary - pt.y);
        if (this.segl.lengths[2] < ConstantData.Defines.SED_SegMinLen) {
          this.segl.lengths[2] = ConstantData.Defines.SED_SegMinLen;
        }
      }
      tempPoint = endSecondary + factor * this.segl.lengths[2];
      if (tempPoint < 0) {
        tempPoint = 0;
      }
      if (tempPoint > maxDim.y) {
        tempPoint = maxDim.y;
      }
      if (isVertical) {
        this.segl.pts.push(new Point(tempPoint - rect.y, oCoord - rect.x));
        this.segl.pts.push(new Point(tempPoint - rect.y, endPrimary - rect.x));
        this.segl.pts.push(new Point(endSecondary - rect.y, endPrimary - rect.x));
      } else {
        this.segl.pts.push(new Point(oCoord - rect.x, tempPoint - rect.y));
        this.segl.pts.push(new Point(endPrimary - rect.x, tempPoint - rect.y));
        this.segl.pts.push(new Point(endPrimary - rect.x, endSecondary - rect.y));
      }
    }

    console.log("= S.SegmentedLine: SegLTopToBottom output", { pts: this.segl.pts, lengths: this.segl.lengths });
  }

  SegLTopToLeft(e, t, a, r, i, n) {
    var o,
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
      I = 0,
      T = 0,
      b = !1,
      M = {},
      P = {
        x: 0,
        y: 0
      },
      R = ConstantData.Defines.SED_CDim;
    GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, !1);
    if (
      GlobalData.optManager.AllowAutoInsert() &&
      (b = !0),
      Math.abs(this.EndPoint.x - this.StartPoint.x),
      Math.abs(this.EndPoint.y - this.StartPoint.y),
      i ? (
        m = this.StartPoint.y,
        C = this.StartPoint.x,
        y = this.EndPoint.y,
        f = this.EndPoint.x,
        S = (M = Utils2.Pt2Rect(this.StartPoint, this.EndPoint)).x,
        M.x = M.y,
        M.y = S,
        GlobalData.optManager.GetMaxDim(P),
        S = P.x,
        P.x = P.y,
        P.y = S
      ) : (
        m = this.StartPoint.x,
        C = this.StartPoint.y,
        y = this.EndPoint.x,
        f = this.EndPoint.y,
        M = Utils2.Pt2Rect(this.StartPoint, this.EndPoint),
        GlobalData.optManager.GetMaxDim(P)
      ),
      h = this.segl.pts.length,
      this.segl.pts.splice(0),
      u = - 1 == r ? m - 2 * ConstantData.Defines.SED_SegMinLen > y : m + 2 * ConstantData.Defines.SED_SegMinLen < y,
      c = - 1 == a ? f - 2 * ConstantData.Defines.SED_SegMinLen > C &&
        u : f + 2 * ConstantData.Defines.SED_SegMinLen < C &&
      u,
      e === ConstantData.ActionTriggerType.SEGL_PRESERVE &&
      (c = 5 !== h),
      n &&
      (c = !0),
      c
    ) this.segl.lengths.splice(0),
      i ? this.segl.pts.push(new Point(C - M.y, m - M.x)) : this.segl.pts.push(new Point(m - M.x, C - M.y)),
      i ? this.segl.pts.push(new Point(f - M.y, m - M.x)) : this.segl.pts.push(new Point(m - M.x, f - M.y)),
      i ? this.segl.pts.push(new Point(f - M.y, y - M.x)) : this.segl.pts.push(new Point(y - M.x, f - M.y));
    else {
      if (p = m < y, 5 != h && this.segl.lengths.splice(0), this.hooks) if (p) {
        if (- 1 === r) {
          for (
            I = i ? this.EndPoint.y + ConstantData.Defines.SED_SegDefLen : this.EndPoint.x + ConstantData.Defines.SED_SegDefLen,
            D = 0;
            D < this.hooks.length;
            D++
          ) if (this.hooks[D].hookpt === ConstantData.HookPts.SED_KTR) {
            (d = GlobalData.optManager.GetObjectPtr(this.hooks[D].objid, !1)) &&
              (
                T = C - ((L = d.GetTargetRect()).y + L.height) < ConstantData.Defines.SED_SegDefLen + ConstantData.Defines.SED_SegMinLen ? i ? this.EndPoint.x - L.width * (this.hooks[D].connect.x / R) - ConstantData.Defines.SED_SegDefLen : this.EndPoint.y - L.height * (this.hooks[D].connect.y / R) - ConstantData.Defines.SED_SegDefLen : i ? this.EndPoint.x + L.width * ((R - this.hooks[D].connect.x) / R) + ConstantData.Defines.SED_SegDefLen : this.EndPoint.y + L.height * ((R - this.hooks[D].connect.y) / R) + ConstantData.Defines.SED_SegDefLen
              );
            break
          }
        } else for (D = 0; D < this.hooks.length; D++) if (this.hooks[D].hookpt === ConstantData.HookPts.SED_KTR) {
          (d = GlobalData.optManager.GetObjectPtr(this.hooks[D].objid, !1)) &&
            (
              L = d.GetTargetRect(),
              I = i ? this.StartPoint.y + L.height / 2 + ConstantData.Defines.SED_SegDefLen : this.StartPoint.x + L.width / 2 + ConstantData.Defines.SED_SegDefLen
            );
          break
        }
      } else for (D = 0; D < this.hooks.length; D++) if (this.hooks[D].hookpt === ConstantData.HookPts.SED_KTR) {
        (d = GlobalData.optManager.GetObjectPtr(this.hooks[D].objid, !1)) &&
          (
            L = d.GetTargetRect(),
            T = i ? this.EndPoint.x - L.width / 2 - ConstantData.Defines.SED_SegDefLen : this.EndPoint.y - L.height / 2 - ConstantData.Defines.SED_SegDefLen
          );
        break
      }
      b &&
        (T = 0, I = 0),
        i ? this.segl.pts.push(new Point(C - M.y, m - M.x)) : this.segl.pts.push(new Point(m - M.x, C - M.y)),
        this.segl.lengths.length < 1 &&
        this.segl.lengths.push(ConstantData.Defines.SED_SegDefLen),
        e === ConstantData.ActionTriggerType.SEGL_ONE &&
        (
          this.segl.lengths[0] = i ? a * (C - t.x) : a * (C - t.y),
          this.segl.lengths[0] < ConstantData.Defines.SED_SegMinLen &&
          (this.segl.lengths[0] = ConstantData.Defines.SED_SegMinLen)
        ),
        g = a * this.segl.lengths[0],
        p ? T &&
          (
            (g = C - T) < ConstantData.Defines.SED_SegDefLen &&
            (g = ConstantData.Defines.SED_SegDefLen),
            g < this.segl.lengths[0] &&
            (g = a * this.segl.lengths[0])
          ) : T &&
        (
          g = C - T,
          - 1 === a ? - g < ConstantData.Defines.SED_SegDefLen &&
            (g = - ConstantData.Defines.SED_SegDefLen) : g < ConstantData.Defines.SED_SegDefLen &&
          (g = ConstantData.Defines.SED_SegDefLen),
          this.segl.lengths[0] < a * g &&
          (g = a * this.segl.lengths[0])
        ),
        this.segl.lengths[0] > a * g &&
        (g = a * this.segl.lengths[0]),
        (o = C - g) < 0 &&
        (o = 0),
        o > P.y &&
        (o = P.y),
        i ? this.segl.pts.push(new Point(o - M.y, m - M.x)) : this.segl.pts.push(new Point(m - M.x, o - M.y)),
        this.segl.lengths.length < 2 &&
        this.segl.lengths.push(ConstantData.Defines.SED_SegDefLen),
        e === ConstantData.ActionTriggerType.SEGL_TWO &&
        (
          p ? i ? (
            - 1 === r ? t.y < y + ConstantData.Defines.SED_SegDefLen &&
              (t.y = y + ConstantData.Defines.SED_SegDefLen) : t.y > y - ConstantData.Defines.SED_SegDefLen &&
            (t.y = y - ConstantData.Defines.SED_SegDefLen),
            this.segl.lengths[1] = Math.abs(t.y - m)
          ) : (
            - 1 === r ? t.x < y + ConstantData.Defines.SED_SegDefLen &&
              (t.x = y + ConstantData.Defines.SED_SegDefLen) : t.x > y - ConstantData.Defines.SED_SegDefLen &&
            (t.x = y - ConstantData.Defines.SED_SegDefLen),
            this.segl.lengths[1] = Math.abs(t.x - m)
          ) : i ? (
            - 1 === r ? t.y < y - ConstantData.Defines.SED_SegMinLen &&
              (t.y = y - ConstantData.Defines.SED_SegMinLen) : t.y > y + ConstantData.Defines.SED_SegMinLen &&
            (t.y = y + ConstantData.Defines.SED_SegMinLen),
            this.segl.lengths[1] = Math.abs(t.y - m)
          ) : (
            t.x > m - ConstantData.Defines.SED_SegMinLen &&
            (t.x = m - ConstantData.Defines.SED_SegMinLen),
            this.segl.lengths[1] = Math.abs(t.x - m)
          )
        ),
        p ? (
          g = this.segl.lengths[1],
          I &&
          I > this.segl.lengths[1] + m &&
          (g = I - m),
          s = m + g,
          - 1 == r ? s <= y &&
            (s = m + g) : s >= y &&
          (s = m - g)
        ) : (
          s = m - this.segl.lengths[1],
          l = y - r * ConstantData.Defines.SED_SegDefLen,
          - 1 == r &&
            this.segl.lengths[1] != ConstantData.Defines.SED_SegDefLen ? l > s &&
          (s = l) : l < s &&
          (s = l)
        ),
        s < 0 &&
        (s = 0),
        s > P.x &&
        (s = P.x),
        i ? this.segl.pts.push(new Point(o - M.y, s - M.x)) : this.segl.pts.push(new Point(s - M.x, o - M.y)),
        i ? this.segl.pts.push(new Point(f - M.y, s - M.x)) : this.segl.pts.push(new Point(s - M.x, f - M.y)),
        i ? this.segl.pts.push(new Point(f - M.y, y - M.x)) : this.segl.pts.push(new Point(y - M.x, f - M.y))
    }
  }

  GetCornerSize(inputSize: number, maxAllowedCorner: number): number {
    console.log("= S.SegmentedLine: GetCornerSize input", { inputSize, maxAllowedCorner });

    // Choose the smaller of the two sizes as the base for calculation
    const baseSize = Math.min(inputSize, maxAllowedCorner);

    // Get the current curve parameter and define the maximum allowed curve (40% of base size)
    const currentCurve = this.segl.curveparam;
    const maxCurve = 0.4 * baseSize;

    // Limit the curve parameter to the maximum allowed value if necessary
    const cornerSize = currentCurve > maxCurve ? maxCurve : currentCurve;

    console.log("= S.SegmentedLine: GetCornerSize output", { cornerSize });
    return cornerSize;
  }

  GetPolyPoints(numPolyPts, translatePoints, skipCurves, reserved, extraOption) {
    console.log("= S.SegmentedLine: GetPolyPoints input", {
      numPolyPts,
      translatePoints,
      skipCurves,
      reserved,
      extraOption
    });

    let polyPoints: Point[] = [];
    let cornerSizeCalc = 0;

    if (this.segl && this.segl.pts.length) {
      const totalPts = this.segl.pts.length;
      // If curve parameter > 0 and curves are not skipped, add curves to the polyline
      if (this.segl.curveparam > 0 && !skipCurves) {
        for (let n = 0; n < totalPts; n++) {
          let lenPrev = 0, lenNext = 0;
          let isVertical = false;
          let directionPrev: number, directionNext: number;
          let curveSegment: Point[];

          if (n > 0 && n < totalPts - 1) {
            // Calculate length from previous point
            if (this.segl.pts[n].x === this.segl.pts[n - 1].x) {
              lenPrev = Math.abs(this.segl.pts[n].y - this.segl.pts[n - 1].y);
              isVertical = true;
              directionPrev = this.segl.pts[n].y - this.segl.pts[n - 1].y > 0 ? 1 : -1;
            } else {
              lenPrev = Math.abs(this.segl.pts[n].x - this.segl.pts[n - 1].x);
              directionPrev = this.segl.pts[n].x - this.segl.pts[n - 1].x > 0 ? 1 : -1;
            }
            // Calculate length to next point
            if (this.segl.pts[n].x === this.segl.pts[n + 1].x) {
              lenNext = Math.abs(this.segl.pts[n].y - this.segl.pts[n + 1].y);
              directionNext = this.segl.pts[n + 1].y - this.segl.pts[n].y > 0 ? 1 : -1;
            } else {
              lenNext = Math.abs(this.segl.pts[n].x - this.segl.pts[n + 1].x);
              directionNext = this.segl.pts[n + 1].x - this.segl.pts[n].x > 0 ? 1 : -1;
            }
            // Calculate the corner size based on the length differences
            cornerSizeCalc = this.GetCornerSize(lenPrev, lenNext);

            // Depending on the orientation, adjust the point and add curve points
            if (isVertical) {
              polyPoints.push(new Point(this.segl.pts[n].x, this.segl.pts[n].y - cornerSizeCalc * directionPrev));
              curveSegment = GlobalData.optManager.Lines_AddCurve(
                true,
                directionPrev,
                directionNext,
                this.segl.pts[n].x,
                this.segl.pts[n].y,
                cornerSizeCalc
              );
              polyPoints = polyPoints.concat(curveSegment);
            } else {
              polyPoints.push(new Point(this.segl.pts[n].x - cornerSizeCalc * directionPrev, this.segl.pts[n].y));
              curveSegment = GlobalData.optManager.Lines_AddCurve(
                false,
                directionPrev,
                directionNext,
                this.segl.pts[n].x,
                this.segl.pts[n].y,
                cornerSizeCalc
              );
              polyPoints = polyPoints.concat(curveSegment);
            }
          } else {
            // For endpoints, simply push the original point
            polyPoints.push(new Point(this.segl.pts[n].x, this.segl.pts[n].y));
          }
        }
      } else {
        // No curve formatting requested, so simply clone all segmentation points
        for (let n = 0; n < totalPts; n++) {
          polyPoints.push(new Point(this.segl.pts[n].x, this.segl.pts[n].y));
        }
      }

      // If translation flag is false, translate the points by the top-left of the bounding rectangle
      if (!translatePoints) {
        const rectStart = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
        for (let n = 0; n < polyPoints.length; n++) {
          polyPoints[n].x += rectStart.x;
          polyPoints[n].y += rectStart.y;
        }
      }
    } else {
      // Fallback to base class implementation (Double === TODO)
      polyPoints = super.GetPolyPoints(numPolyPts, translatePoints, true, extraOption);
    }

    console.log("= S.SegmentedLine: GetPolyPoints output", polyPoints);
    return polyPoints;
  }

  LM_DrawPreTrack(svgDoc) {
    console.log("= S.SegmentedLine: LM_DrawPreTrack input", { svgDoc });

    // Call the base class method and log its result
    const basePreTrackResult = super.LM_DrawPreTrack(svgDoc);
    console.log("= S.SegmentedLine: Base LM_DrawPreTrack output", { basePreTrackResult });

    let connectObject;
    if (
      GlobalData.optManager.LinkParams &&
      GlobalData.optManager.LinkParams.SConnectIndex >= 0
    ) {
      connectObject = GlobalData.optManager.GetObjectPtr(
        GlobalData.optManager.LinkParams.SConnectIndex,
        false
      );
      if (connectObject) {
        this.segl.firstdir = connectObject.GetSegLFace(
          GlobalData.optManager.LinkParams.ConnectPt,
          this.EndPoint,
          svgDoc
        );
        console.log("= S.SegmentedLine: Updated segl.firstdir", {
          firstdir: this.segl.firstdir
        });
      }
    }

    console.log("= S.SegmentedLine: LM_DrawPreTrack output", { result: true });
    return true;
  }

  AdjustLine(svgDoc, x, y, trigger) {
    console.log("= S.SegmentedLine: AdjustLine input", { svgDoc, x, y, trigger });

    let shapeElem, slopElem;
    if (svgDoc) {
      shapeElem = svgDoc.GetElementByID(ConstantData.SVGElementClass.SHAPE);
      slopElem = svgDoc.GetElementByID(ConstantData.SVGElementClass.SLOP);
    }

    const newPoint = new Point(x, y);
    this.SegLFormat(newPoint, trigger, 0);
    this.CalcFrame();

    const frameRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    // Get the updated polyline points with readable parameters
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, false, false, null);

    if (svgDoc) {
      svgDoc.SetSize(this.Frame.width, this.Frame.height);
      svgDoc.SetPos(frameRect.x, frameRect.y);

      shapeElem.SetSize(this.Frame.width, this.Frame.height);
      this.UpdateSVG(shapeElem, polyPoints);

      slopElem.SetSize(this.Frame.width, this.Frame.height);
      this.UpdateSVG(slopElem, polyPoints);

      new SelectionAttributes();
      this.UpdateDimensionLines(svgDoc);

      GlobalData.optManager.UpdateDisplayCoordinates(
        this.Frame,
        newPoint,
        ConstantData.CursorTypes.Grow,
        this
      );

      if (this.DataID !== -1) {
        this.LM_ResizeSVGTextObject(svgDoc, this, this.Frame);
      }
    }

    console.log("= S.SegmentedLine: AdjustLine output", { Frame: this.Frame, newPoint });
  }

  AdjustLineEnd(svgDoc, newX, newY, trigger) {
    console.log("= S.SegmentedLine: AdjustLineEnd input", { svgDoc, newX, newY, trigger });

    // Save current endpoint values
    const originalEndPoint = { x: this.EndPoint.x, y: this.EndPoint.y };

    // Temporarily update EndPoint to new values and enforce minimum dimensions
    this.EndPoint.x = newX;
    this.EndPoint.y = newY;
    this.EnforceMinimum(false);

    // Use the enforced new values
    newX = this.EndPoint.x;
    newY = this.EndPoint.y;

    // Restore original EndPoint
    this.EndPoint.x = originalEndPoint.x;
    this.EndPoint.y = originalEndPoint.y;

    // Create an adjusted endpoint object for direction calculation
    const adjustedEndPoint = { x: newX, y: newY };

    // Update directional properties based on connected object if applicable
    if (GlobalData.optManager.LinkParams && GlobalData.optManager.LinkParams.ConnectIndex >= 0) {
      const connectedObj = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.LinkParams.ConnectIndex, false);
      if (connectedObj) {
        this.segl.lastdir = connectedObj.GetSegLFace(GlobalData.optManager.LinkParams.ConnectPt, this.StartPoint, adjustedEndPoint);
      }
    } else if (GlobalData.optManager.ob && GlobalData.optManager.ob.BlockID === this.BlockID) {
      this.segl.firstdir = GlobalData.optManager.ob.segl.firstdir;
      this.segl.lastdir = GlobalData.optManager.ob.segl.lastdir;
    }

    // Adjust the line using the svg document and the new endpoint values
    this.AdjustLine(svgDoc, newX, newY, ConstantData.ActionTriggerType.LINEEND);

    console.log("= S.SegmentedLine: AdjustLineEnd output", { EndPoint: this.EndPoint, segl: this.segl });
  }

  AdjustLineStart(svgDoc, newX, newY) {
    console.log("= S.SegmentedLine: AdjustLineStart input", { svgDoc, newX, newY });

    // Save the original StartPoint values
    const originalStartPoint = {
      x: this.StartPoint.x,
      y: this.StartPoint.y,
    };

    // Minimum allowed dimension value
    const minDim = ConstantData.Defines.SED_MinDim;

    // Temporarily update StartPoint to the new position and enforce minimum dimensions
    this.StartPoint.x = newX;
    this.StartPoint.y = newY;
    this.EnforceMinimum(true);

    // Get the adjusted values after enforcing minimum dimensions
    const adjustedX = this.StartPoint.x;
    const adjustedY = this.StartPoint.y;

    // Restore original StartPoint for further calculations
    this.StartPoint.x = originalStartPoint.x;
    this.StartPoint.y = originalStartPoint.y;

    // Adjust the first segmentation length based on the orientation
    if (this.segl.pts[0].x === this.segl.pts[1].x) {
      // Vertical line: adjust based on Y difference
      this.segl.lengths[0] += this.StartPoint.y - adjustedY;
      if (this.segl.lengths[0] < minDim) {
        this.segl.lengths[0] = minDim;
      }
    } else {
      // Horizontal line: adjust based on X difference
      this.segl.lengths[0] += this.StartPoint.x - adjustedX;
      if (this.segl.lengths[0] < minDim) {
        this.segl.lengths[0] = minDim;
      }
    }

    // Prepare the connection point using the adjusted coordinates
    const connectionPoint = { x: adjustedX, y: adjustedY };

    // Update segl.firstdir based on a connected object if available
    if (GlobalData.optManager.LinkParams && GlobalData.optManager.LinkParams.ConnectIndex >= 0) {
      const connectedObj = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.LinkParams.ConnectIndex, false);
      if (connectedObj) {
        this.segl.firstdir = connectedObj.GetSegLFace(GlobalData.optManager.LinkParams.ConnectPt, this.EndPoint, connectionPoint);
      }
    } else if (GlobalData.optManager.ob && GlobalData.optManager.ob.BlockID === this.BlockID) {
      // Fallback to using the current object's directional values
      this.segl.firstdir = GlobalData.optManager.ob.segl.firstdir;
      this.segl.lastdir = GlobalData.optManager.ob.segl.lastdir;
    }

    // Adjust the line using the updated parameters
    this.AdjustLine(svgDoc, adjustedX, adjustedY, ConstantData.ActionTriggerType.LINESTART);

    console.log("= S.SegmentedLine: AdjustLineStart output", {
      originalStartPoint,
      adjustedPoint: connectionPoint,
      seglFirstDir: this.segl.firstdir,
      seglLength0: this.segl.lengths[0]
    });
  }

  GetDimensions() {
    console.log("= S.SegmentedLine: GetDimensions input", {
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint
    });
    const width = Math.abs(this.EndPoint.x - this.StartPoint.x);
    const height = Math.abs(this.EndPoint.y - this.StartPoint.y);
    const dimensions = { x: width, y: height };
    console.log("= S.SegmentedLine: GetDimensions output", dimensions);
    return dimensions;
  }

  GetDimensionsForDisplay() {
    console.log("= S.SegmentedLine: GetDimensionsForDisplay input", { Frame: this.Frame });
    const dimensions = {
      x: this.Frame.x,
      y: this.Frame.y,
      width: this.Frame.width,
      height: this.Frame.height
    };
    console.log("= S.SegmentedLine: GetDimensionsForDisplay output", dimensions);
    return dimensions;
  }

  UpdateDimensions(offsetElement, offsetX, offsetY) {
    console.log("= S.SegmentedLine: UpdateDimensions input", { offsetElement, offsetX, offsetY });
    const svgObject = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    const newX = offsetX ? this.StartPoint.x + offsetX : this.EndPoint.x;
    const newY = offsetY ? this.StartPoint.y + offsetY : this.EndPoint.y;
    console.log("= S.SegmentedLine: UpdateDimensions computed", { newX, newY });
    this.AdjustLineEnd(svgObject, newX, newY, ConstantData.ActionTriggerType.LINEEND);
    console.log("= S.SegmentedLine: UpdateDimensions output", { EndPoint: this.EndPoint });
  }

  SetSize(newWidth, newHeight, forceFlag) {
    console.log("= S.SegmentedLine: SetSize input", { newWidth, newHeight, forceFlag });

    let isEndAdjusted = false;
    let deltaWidth = 0;
    let deltaHeight = 0;

    // Calculate delta values based on current frame size
    if (newWidth) {
      deltaWidth = newWidth - this.Frame.width;
    }
    if (newHeight) {
      deltaHeight = newHeight - this.Frame.height;
    }

    // Clear floating point dimension flags if present
    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    // Determine adjustment mode based on StartPoint and EndPoint ordering
    if (
      this.StartPoint.x < this.EndPoint.x ||
      (Utils2.IsEqual(this.StartPoint.x, this.EndPoint.x) && this.StartPoint.y < this.EndPoint.y)
    ) {
      isEndAdjusted = true;
    }

    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

    // Adjust line end or start based on order
    if (isEndAdjusted) {
      this.AdjustLineEnd(svgElement, this.EndPoint.x + deltaWidth, this.EndPoint.y + deltaHeight, 0);
    } else {
      this.AdjustLineStart(svgElement, this.StartPoint.x + deltaWidth, this.StartPoint.y + deltaHeight, 0);
    }

    GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
    console.log("= S.SegmentedLine: SetSize output", { deltaWidth, deltaHeight, isEndAdjusted });
  }

  Flip(flipFlags: number): void {
    console.log("= S.SegmentedLine: Flip input", { flipFlags });
    let isFlipped = false;
    let rect: any;
    let i: number;
    let reposition: number;
    let tempPoints: Point[] = [];
    const segLDir = ConstantData.SegLDir;

    // Create a backup of current object
    GlobalData.optManager.ob = Utils1.DeepCopy(this);

    // Process vertical flip if flag is set
    if (flipFlags & ConstantData.ExtraFlags.SEDE_FlipVert) {
      isFlipped = true;

      // Flip first directional flag vertically
      switch (this.segl.firstdir) {
        case segLDir.SED_KTC:
          this.segl.firstdir = segLDir.SED_KBC;
          break;
        case segLDir.SED_KBC:
          this.segl.firstdir = segLDir.SED_KTC;
          break;
      }

      // Flip last directional flag vertically
      switch (this.segl.lastdir) {
        case segLDir.SED_KTC:
          this.segl.lastdir = segLDir.SED_KBC;
          break;
        case segLDir.SED_KBC:
          this.segl.lastdir = segLDir.SED_KTC;
          break;
      }

      // Calculate the rectangle from start to end points
      rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      const numPoints = this.segl.pts.length;

      // Adjust each point: shift relative to the rectangle and frame
      for (i = 0; i < numPoints; i++) {
        tempPoints.push(
          new Point(this.segl.pts[i].x, this.segl.pts[i].y + rect.y - this.Frame.y)
        );
      }
      // Flip the vertical positions based on frame height
      const frameHeight = this.Frame.height;
      for (i = 0; i < numPoints; i++) {
        tempPoints[i].y = frameHeight - tempPoints[i].y;
      }
      // Update StartPoint and EndPoint y coordinates
      this.StartPoint.y = tempPoints[0].y + this.Frame.y;
      this.EndPoint.y = tempPoints[numPoints - 1].y + this.Frame.y;
      // Compute adjustment offset based on which point is higher
      reposition =
        this.EndPoint.y < this.StartPoint.y
          ? this.EndPoint.y - this.Frame.y
          : this.StartPoint.y - this.Frame.y;
      // Reposition the segmentation points
      for (i = 0; i < numPoints; i++) {
        this.segl.pts[i].y = tempPoints[i].y - reposition;
      }
      // Clear temporary points for reuse
      tempPoints = [];
    }

    // Process horizontal flip if flag is set
    if (flipFlags & ConstantData.ExtraFlags.SEDE_FlipHoriz) {
      isFlipped = true;

      // Flip first directional flag horizontally
      switch (this.segl.firstdir) {
        case segLDir.SED_KLC:
          this.segl.firstdir = segLDir.SED_KRC;
          break;
        case segLDir.SED_KRC:
          this.segl.firstdir = segLDir.SED_KLC;
          break;
      }

      // Flip last directional flag horizontally
      switch (this.segl.lastdir) {
        case segLDir.SED_KLC:
          this.segl.lastdir = segLDir.SED_KRC;
          break;
        case segLDir.SED_KRC:
          this.segl.lastdir = segLDir.SED_KLC;
          break;
      }

      // Calculate the rectangle from start to end points
      rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      const numPoints = this.segl.pts.length;

      // Adjust each point: shift relative to the rectangle and frame
      for (i = 0; i < numPoints; i++) {
        tempPoints.push(
          new Point(this.segl.pts[i].x + rect.x - this.Frame.x, this.segl.pts[i].y)
        );
      }
      // Flip the horizontal positions based on frame width
      const frameWidth = this.Frame.width;
      for (i = 0; i < numPoints; i++) {
        tempPoints[i].x = frameWidth - tempPoints[i].x;
      }
      // Update StartPoint and EndPoint x coordinates
      this.StartPoint.x = tempPoints[0].x + this.Frame.x;
      this.EndPoint.x = tempPoints[numPoints - 1].x + this.Frame.x;
      // Compute adjustment offset based on which point is more to the left
      reposition =
        this.EndPoint.x < this.StartPoint.x
          ? this.EndPoint.x - this.Frame.x
          : this.StartPoint.x - this.Frame.x;
      // Reposition the segmentation points
      for (i = 0; i < numPoints; i++) {
        this.segl.pts[i].x = tempPoints[i].x - reposition;
      }
      // Clear temporary points
      tempPoints = [];
    }

    // If any flip occurred, update the text object and maintain links
    if (isFlipped) {
      const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
      if (this.DataID !== -1) {
        this.LM_ResizeSVGTextObject(svgElement, this, this.Frame);
      }
      if (GlobalData.optManager.ob.Frame) {
        GlobalData.optManager.MaintainLink(
          this.BlockID,
          this,
          GlobalData.optManager.ob,
          ConstantData.ActionTriggerType.ROTATE
        );
      }
      GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
    }

    GlobalData.optManager.ob = {};
    console.log("= S.SegmentedLine: Flip output", {
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint,
      segl: this.segl,
    });
  }

  GetFrameIntersects(intersectFrame: any, shapeDoc: any, outputPoints: Point[], resultContext: any): boolean {
    console.log("= S.SegmentedLine: GetFrameIntersects input", { intersectFrame, shapeDoc, outputPoints, resultContext });

    const minThreshold = 2 * ConstantData.Defines.SED_SegMinLen;
    // Get the bounding rect of the entire segmented line object
    const segRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    // Translate the given frame by subtracting the segmented line's origin
    let localFrame: any = {
      x: intersectFrame.x - segRect.x,
      y: intersectFrame.y - segRect.y,
      width: intersectFrame.width,
      height: intersectFrame.height
    };

    const totalPoints = this.segl.pts.length;
    // Loop through each segment
    for (let idx = 1; idx < totalPoints; idx++) {
      // Check if the segment is vertical (x coordinates are equal)
      if (this.segl.pts[idx].x === this.segl.pts[idx - 1].x) {
        // Determine vertical min and max Y
        let segMinY = this.segl.pts[idx].y < this.segl.pts[idx - 1].y ? this.segl.pts[idx].y : this.segl.pts[idx - 1].y;
        let segMaxY = this.segl.pts[idx].y > this.segl.pts[idx - 1].y ? this.segl.pts[idx].y : this.segl.pts[idx - 1].y;
        // The common X coordinate for vertical segments
        const segX = this.segl.pts[idx].x;

        if ((segMinY + minThreshold < localFrame.y) &&
          (segMaxY - minThreshold > localFrame.y + localFrame.height) &&
          (segX > localFrame.x) &&
          (segX < localFrame.x + localFrame.width)) {
          shapeDoc.AdjustAutoInsertShape(intersectFrame, true);
          resultContext.AutoSeg = idx;
          // Update localFrame with original values
          localFrame = {
            x: intersectFrame.x - segRect.x,
            y: intersectFrame.y - segRect.y,
            width: intersectFrame.width,
            height: intersectFrame.height
          };
          // Add intersection points based on segment direction
          if (this.segl.pts[idx - 1].y < this.segl.pts[idx].y) {
            outputPoints.push(new Point(segX + segRect.x, localFrame.y + segRect.y));
            outputPoints[0].index = idx;
            outputPoints.push(new Point(segX + segRect.x, localFrame.y + localFrame.height + segRect.y));
            outputPoints[1].index = idx;
          } else {
            outputPoints.push(new Point(segX + segRect.x, localFrame.y + localFrame.height + segRect.y));
            outputPoints.push(new Point(segX + segRect.x, localFrame.y + segRect.y));
            outputPoints[0].index = idx;
            outputPoints[1].index = idx;
          }
          console.log("= S.SegmentedLine: GetFrameIntersects output", { outputPoints, resultContext, hitSegment: idx });
          return true;
        }
      } else {
        // Horizontal segment - determine minimal and maximal X values
        let segMinX = this.segl.pts[idx].x < this.segl.pts[idx - 1].x ? this.segl.pts[idx].x : this.segl.pts[idx - 1].x;
        let segMaxX = this.segl.pts[idx].x > this.segl.pts[idx - 1].x ? this.segl.pts[idx].x : this.segl.pts[idx - 1].x;
        // Common Y coordinate for horizontal segments
        const segY = this.segl.pts[idx].y;

        if ((segMinX + minThreshold < localFrame.x) &&
          (segMaxX - minThreshold > localFrame.x + localFrame.width) &&
          (segY > localFrame.y) &&
          (segY < localFrame.y + localFrame.height)) {
          shapeDoc.AdjustAutoInsertShape(intersectFrame, false);
          resultContext.AutoSeg = idx;
          localFrame = {
            x: intersectFrame.x - segRect.x,
            y: intersectFrame.y - segRect.y,
            width: intersectFrame.width,
            height: intersectFrame.height
          };
          if (this.segl.pts[idx - 1].x < this.segl.pts[idx].x) {
            outputPoints.push(new Point(localFrame.x + segRect.x, segY + segRect.y));
            outputPoints.push(new Point(localFrame.x + localFrame.width + segRect.x, segY + segRect.y));
            outputPoints[0].index = idx;
            outputPoints[1].index = idx;
          } else {
            outputPoints.push(new Point(localFrame.x + localFrame.width + segRect.x, segY + segRect.y));
            outputPoints.push(new Point(localFrame.x + segRect.x, segY + segRect.y));
            outputPoints[0].index = idx;
            outputPoints[1].index = idx;
          }
          console.log("= S.SegmentedLine: GetFrameIntersects output", { outputPoints, resultContext, hitSegment: idx });
          return true;
        }
      }
    }

    console.log("= S.SegmentedLine: GetFrameIntersects output", { result: false });
    return false;
  }

  NoRotate(): boolean {
    console.log("= S.SegmentedLine: NoRotate input", {});
    const result = true;
    console.log("= S.SegmentedLine: NoRotate output", result);
    return result;
  }

  CalcTextPosition(textParams) {
    console.log("= S.SegmentedLine: CalcTextPosition input", { textParams });

    // Calculate the center of the text position relative to the object's frame.
    const centerPoint = {
      x: textParams.Frame.x + textParams.Frame.width / 2 - this.Frame.x,
      y: textParams.Frame.y + textParams.Frame.height / 2 - this.Frame.y,
    };
    console.log("= S.SegmentedLine: Center calculated", { centerPoint });

    const totalPoints = this.segl.pts.length;
    let selectedSegmentIndex = 1; // index of the segment chosen for alignment
    let referenceCoordinate = 0; // reference coordinate: x for horizontal, y for vertical segments
    let minDistanceCandidate: number | undefined = undefined;
    const segmentLengths: number[] = [];
    let totalSegmentLength = 0;

    // Loop through segments to find the segment closest to the center
    for (let i = 1; i < totalPoints; i++) {
      const previousPoint = this.segl.pts[i - 1];
      const currentPoint = this.segl.pts[i];

      if (Utils2.IsEqual(previousPoint.x, currentPoint.x)) {
        // Vertical segment
        const segMinY = Math.min(previousPoint.y, currentPoint.y);
        const segMaxY = Math.max(previousPoint.y, currentPoint.y);
        const diffX = Math.abs(centerPoint.x - previousPoint.x);

        // Check if the center's y coordinate lies within this vertical segment's range
        if (centerPoint.y >= segMinY && centerPoint.y <= segMaxY) {
          if (minDistanceCandidate === undefined || diffX < minDistanceCandidate) {
            minDistanceCandidate = diffX;
            selectedSegmentIndex = i;
            referenceCoordinate = previousPoint.y;
          }
        }

        const segLength = Math.abs(previousPoint.y - currentPoint.y);
        segmentLengths.push(segLength);
        totalSegmentLength += segLength;
        console.log("= S.SegmentedLine: Vertical segment", { index: i, segLength, totalSegmentLength });
      } else {
        // Horizontal segment
        const segMinX = Math.min(previousPoint.x, currentPoint.x);
        const segMaxX = Math.max(previousPoint.x, currentPoint.x);
        const diffY = Math.abs(centerPoint.y - previousPoint.y);

        // Check if the center's x coordinate lies within this horizontal segment's range
        if (centerPoint.x >= segMinX && centerPoint.x <= segMaxX) {
          if (minDistanceCandidate === undefined || diffY < minDistanceCandidate) {
            minDistanceCandidate = diffY;
            selectedSegmentIndex = i;
            referenceCoordinate = previousPoint.x;
          }
        }

        const segLength = Math.abs(previousPoint.x - currentPoint.x);
        segmentLengths.push(segLength);
        totalSegmentLength += segLength;
        console.log("= S.SegmentedLine: Horizontal segment", { index: i, segLength, totalSegmentLength });
      }
    }

    console.log("= S.SegmentedLine: Chosen segment", {
      selectedSegmentIndex,
      minDistanceCandidate,
      referenceCoordinate,
      totalSegmentLength,
    });

    // Determine offset along and across the chosen segment.
    const previousPt = this.segl.pts[selectedSegmentIndex - 1];
    const nextPt = this.segl.pts[selectedSegmentIndex];
    let offsetAlongSegment: number;
    let offsetAcrossSegment: number;

    if (Utils2.IsEqual(previousPt.x, nextPt.x)) {
      // For vertical segment: primary offset is along the Y axis; secondary offset is horizontal.
      offsetAlongSegment = Math.abs(centerPoint.y - referenceCoordinate);
      offsetAcrossSegment = -(centerPoint.x - previousPt.x);
      console.log("= S.SegmentedLine: Vertical offset", { offsetAlongSegment, offsetAcrossSegment });
    } else {
      // For horizontal segment: primary offset is along the X axis; secondary offset is vertical.
      offsetAlongSegment = Math.abs(centerPoint.x - referenceCoordinate);
      offsetAcrossSegment = centerPoint.y - previousPt.y;
      console.log("= S.SegmentedLine: Horizontal offset", { offsetAlongSegment, offsetAcrossSegment });
    }

    // Calculate the accumulated distance along the polyline up to the chosen segment.
    let accumulatedDistance = 0;
    for (let i = 0; i < selectedSegmentIndex - 1; i++) {
      accumulatedDistance += segmentLengths[i];
    }
    accumulatedDistance += offsetAlongSegment;
    console.log("= S.SegmentedLine: Accumulated distance", { accumulatedDistance });

    // Set relative text positions.
    this.LineTextX = totalSegmentLength ? accumulatedDistance / totalSegmentLength : 0;
    this.LineTextY = offsetAcrossSegment;

    // If there's a valid horizontal text position, copy the text rectangle.
    if (this.LineTextX) {
      this.trect = $.extend(true, {}, textParams.trect);
    }

    // Set text growth behavior and update text flags.
    textParams.TextGrow = ConstantData.TextGrowBehavior.VERTICAL;
    this.TextFlags = Utils2.SetFlag(this.TextFlags, ConstantData.TextFlags.SED_TF_HorizText, true);

    console.log("= S.SegmentedLine: CalcTextPosition output", {
      LineTextX: this.LineTextX,
      LineTextY: this.LineTextY,
      trect: this.trect,
    });
  }

  GetTextOnLineParams(e) {
    console.log("= S.SegmentedLine: GetTextOnLineParams input", { e });

    // Initialize variables and the result structure
    let startIndex, endIndex;
    let segIndex, segLen, currentSegmentLength;
    let totalLineLength = 0;
    let centerProportion = 0.5; // default center proportion value
    const result = {
      Frame: new ListManager.Rect(),
      StartPoint: new Point(),
      EndPoint: new Point(),
      CenterProp: 0
    };

    const pts = this.segl.pts;
    const ptsCount = pts.length;
    let reverseAlign = false;

    // Determine initial alignment indices based on point order
    if (
      pts[0].x < pts[ptsCount - 1].x ||
      (pts[0].x === pts[ptsCount - 1].x && pts[0].y < pts[ptsCount - 1].y)
    ) {
      startIndex = 0;
      endIndex = ptsCount - 2;
    } else {
      startIndex = ptsCount - 2;
      endIndex = 0;
      reverseAlign = true;
    }

    if (this.LineTextX !== 0) {
      // Calculate total length of the segmented line
      for (let j = 1; j < ptsCount; j++) {
        if (Utils2.IsEqual(pts[j - 1].x, pts[j].x)) {
          totalLineLength += Math.abs(pts[j - 1].y - pts[j].y);
        } else {
          totalLineLength += Math.abs(pts[j - 1].x - pts[j].x);
        }
      }
      // Determine the target length along the line based on LineTextX proportion
      const targetLength = this.LineTextX * totalLineLength;
      console.log("= S.SegmentedLine: Total line length calculated", { totalLineLength, targetLength });
      totalLineLength = 0;
      segIndex = ptsCount - 2; // default value if not found

      // Walk through the segments until the accumulated length surpasses the target
      for (let j = 1; j < ptsCount; j++) {
        currentSegmentLength = Utils2.IsEqual(pts[j - 1].x, pts[j].x)
          ? Math.abs(pts[j - 1].y - pts[j].y)
          : Math.abs(pts[j - 1].x - pts[j].x);
        totalLineLength += currentSegmentLength;
        if (totalLineLength > targetLength) {
          segIndex = j - 1;
          // Calculate the proportional offset along the chosen segment
          centerProportion = (currentSegmentLength - (totalLineLength - targetLength)) / currentSegmentLength;
          break;
        }
      }
      result.CenterProp = centerProportion;

      // Establish the frame and text points relative to the frame
      result.Frame = Utils1.DeepCopy(this.Frame);
      result.StartPoint.x = result.Frame.x + pts[segIndex].x;
      result.StartPoint.y = result.Frame.y + pts[segIndex].y;
      result.EndPoint.x = result.Frame.x + pts[segIndex + 1].x;
      result.EndPoint.y = result.Frame.y + pts[segIndex + 1].y;
    } else {
      // Fallback when LineTextX is zero: decide segment based on the number of points
      switch (ptsCount) {
        case 2:
          segIndex = 0;
          break;
        case 3:
          if (Utils2.IsEqual(pts[0].x, pts[1].x)) {
            // Vertical alignment: compare y differences vs. x differences
            segLen = Math.abs(pts[0].y - pts[1].y);
            currentSegmentLength = Math.abs(pts[1].x - pts[2].x);
          } else {
            segLen = Math.abs(pts[0].x - pts[1].x);
            currentSegmentLength = Math.abs(pts[1].y - pts[2].y);
          }
          segIndex = segLen > currentSegmentLength ? 0 : 1;
          break;
        case 5:
          if (Utils2.IsEqual(pts[1].x, pts[2].x)) {
            segLen = Math.abs(pts[1].y - pts[2].y);
            currentSegmentLength = Math.abs(pts[2].x - pts[3].x);
          } else {
            segLen = Math.abs(pts[1].x - pts[2].x);
            currentSegmentLength = Math.abs(pts[2].y - pts[3].y);
          }
          segIndex = segLen > currentSegmentLength ? 1 : 2;
          break;
        default:
          segIndex = Math.round((ptsCount - 1.1) / 2);
      }
      // Adjust start and end points based on TextAlign
      switch (this.TextAlign) {
        case ConstantData.TextAlign.TOPLEFT:
        case ConstantData.TextAlign.LEFT:
        case ConstantData.TextAlign.BOTTOMLEFT:
          if (reverseAlign) {
            result.EndPoint.x = this.Frame.x + pts[startIndex].x;
            result.EndPoint.y = this.Frame.y + pts[startIndex].y;
            result.StartPoint.x = this.Frame.x + pts[startIndex + 1].x;
            result.StartPoint.y = this.Frame.y + pts[startIndex + 1].y;
          } else {
            result.StartPoint.x = this.Frame.x + pts[startIndex].x;
            result.StartPoint.y = this.Frame.y + pts[startIndex].y;
            result.EndPoint.x = this.Frame.x + pts[startIndex + 1].x;
            result.EndPoint.y = this.Frame.y + pts[startIndex + 1].y;
          }
          break;
        case ConstantData.TextAlign.TOPRIGHT:
        case ConstantData.TextAlign.RIGHT:
        case ConstantData.TextAlign.BOTTOMRIGHT:
          if (reverseAlign) {
            result.EndPoint.x = this.Frame.x + pts[endIndex].x;
            result.EndPoint.y = this.Frame.y + pts[endIndex].y;
            result.StartPoint.x = this.Frame.x + pts[endIndex + 1].x;
            result.StartPoint.y = this.Frame.y + pts[endIndex + 1].y;
          } else {
            result.StartPoint.x = this.Frame.x + pts[endIndex].x;
            result.StartPoint.y = this.Frame.y + pts[endIndex].y;
            result.EndPoint.x = this.Frame.x + pts[endIndex + 1].x;
            result.EndPoint.y = this.Frame.y + pts[endIndex + 1].y;
          }
          break;
        default:
          if (reverseAlign) {
            result.EndPoint.x = this.Frame.x + pts[segIndex].x;
            result.EndPoint.y = this.Frame.y + pts[segIndex].y;
            result.StartPoint.x = this.Frame.x + pts[segIndex + 1].x;
            result.StartPoint.y = this.Frame.y + pts[segIndex + 1].y;
          } else {
            result.StartPoint.x = this.Frame.x + pts[segIndex].x;
            result.StartPoint.y = this.Frame.y + pts[segIndex].y;
            result.EndPoint.x = this.Frame.x + pts[segIndex + 1].x;
            result.EndPoint.y = this.Frame.y + pts[segIndex + 1].y;
          }
      }
      result.Frame = Utils1.DeepCopy(this.Frame);
    }

    console.log("= S.SegmentedLine: GetTextOnLineParams output", result);
    return result;
  }

  CreateActionTriggers(
    svgDoc: any,
    triggerId: any,
    paramA: any,
    relatedId: any
  ) {
    console.log("= S.SegmentedLine: CreateActionTriggers input", {
      svgDoc,
      triggerId,
      paramA,
      relatedId
    });

    const groupShape = svgDoc.CreateShape(ConstantData.CreateShapeType.GROUP);
    const knobSizeDef = ConstantData.Defines.SED_KnobSize;

    let docToScreenScale = svgDoc.docInfo.docToScreenScale;
    if (svgDoc.docInfo.docScale <= 0.5) {
      docToScreenScale *= 2;
    }
    const knobSize = knobSizeDef / docToScreenScale;
    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    let frameWidth = this.Frame.width;
    let frameHeight = this.Frame.height;
    const hookObj = GlobalData.optManager.GetObjectPtr(triggerId, false);

    frameWidth += knobSize;
    frameHeight += knobSize;

    const adjustedFrame = $.extend(true, {}, this.Frame);
    adjustedFrame.x -= knobSize / 2;
    adjustedFrame.y -= knobSize / 2;
    adjustedFrame.width += knobSize;
    adjustedFrame.height += knobSize;

    let knobConfig: any = {
      svgDoc: svgDoc,
      shapeType: ConstantData.CreateShapeType.RECT,
      knobSize: knobSize,
      fillColor: "black",
      fillOpacity: 1,
      strokeSize: 1,
      strokeColor: "#777777",
      cursorType: this.CalcCursorForSegment(this.StartPoint, this.EndPoint, false),
      locked: false
    };

    // Modify knob appearance based on connection status
    if (triggerId != relatedId) {
      knobConfig.fillColor = "white";
      knobConfig.strokeSize = 1;
      knobConfig.strokeColor = "black";
      knobConfig.fillOpacity = 0;
    }
    if (this.flags & ConstantData.ObjFlags.SEDO_Lock) {
      knobConfig.fillColor = "gray";
      knobConfig.locked = true;
    } else if (this.NoGrow()) {
      knobConfig.fillColor = "red";
      knobConfig.strokeColor = "red";
      knobConfig.cursorType = ConstantData2.CursorType.DEFAULT;
    }

    // Set knob position for start knob
    knobConfig.x = this.StartPoint.x - this.Frame.x;
    knobConfig.y = this.StartPoint.y - this.Frame.y;
    knobConfig.knobID = ConstantData.ActionTriggerType.LINESTART;

    if (hookObj && hookObj.hooks) {
      for (let d = 0; d < hookObj.hooks.length; d++) {
        if (hookObj.hooks[d].hookpt === ConstantData.HookPts.SED_KTL) {
          knobConfig.shapeType = ConstantData.CreateShapeType.OVAL;
          break;
        }
      }
    }
    let startKnob = this.GenericKnob(knobConfig);
    groupShape.AddElement(startKnob);

    // Set knob configuration for end knob
    knobConfig.shapeType = ConstantData.CreateShapeType.RECT;
    if (hookObj && hookObj.hooks) {
      for (let d = 0; d < hookObj.hooks.length; d++) {
        if (hookObj.hooks[d].hookpt === ConstantData.HookPts.SED_KTR) {
          knobConfig.shapeType = ConstantData.CreateShapeType.OVAL;
          break;
        }
      }
    }
    knobConfig.x = this.EndPoint.x - this.Frame.x;
    knobConfig.y = this.EndPoint.y - this.Frame.y;
    knobConfig.knobID = ConstantData.ActionTriggerType.LINEEND;

    let endKnob = this.GenericKnob(knobConfig);
    groupShape.AddElement(endKnob);

    // Create additional knobs along the segmented line if available
    knobConfig.shapeType = ConstantData.CreateShapeType.RECT;
    if (this.segl && this.segl.pts && this.segl.firstdir > 0) {
      const ptsCount = this.segl.pts.length;
      for (let d = 2; d < ptsCount - 1; d++) {
        if (this.segl.pts[d - 1].x === this.segl.pts[d].x) {
          knobConfig.x = this.segl.pts[d].x + rect.x - this.Frame.x;
          knobConfig.y =
            (this.segl.pts[d - 1].y + this.segl.pts[d].y) / 2 +
            rect.y -
            this.Frame.y;
        } else {
          knobConfig.y = this.segl.pts[d].y + rect.y - this.Frame.y;
          knobConfig.x =
            (this.segl.pts[d - 1].x + this.segl.pts[d].x) / 2 +
            rect.x -
            this.Frame.x;
        }
        knobConfig.cursorType = this.CalcCursorForSegment(
          this.segl.pts[d],
          this.segl.pts[d - 1],
          true
        );
        knobConfig.knobID =
          ConstantData.ActionTriggerType.SEGL_ONE + d - 2;
        if (this.NoGrow()) {
          knobConfig.cursorType = ConstantData2.CursorType.DEFAULT;
        }
        let midKnob = this.GenericKnob(knobConfig);
        groupShape.AddElement(midKnob);
      }
    }

    groupShape.SetSize(frameWidth, frameHeight);
    groupShape.SetPos(adjustedFrame.x, adjustedFrame.y);
    groupShape.isShape = true;
    groupShape.SetID(ConstantData.Defines.Action + triggerId);

    console.log("= S.SegmentedLine: CreateActionTriggers output", {
      groupShape,
      adjustedFrame,
      frameWidth,
      frameHeight
    });
    return groupShape;

  }

  ModifyShape(svgDoc, newX, newY, trigger, extra) {
    console.log("= S.SegmentedLine: ModifyShape input", {
      svgDoc,
      newX,
      newY,
      trigger,
      extra
    });

    // Get the main shape and slop elements
    const shapeElem = svgDoc.GetElementByID(ConstantData.SVGElementClass.SHAPE);
    const slopElem = svgDoc.GetElementByID(ConstantData.SVGElementClass.SLOP);

    // Create a new point from the provided coordinates
    const newPoint = new Point(newX, newY);

    // Format the segmented line with the new point and trigger, then recalc the frame
    this.SegLFormat(newPoint, trigger, 0);
    this.CalcFrame();

    // Get updated polyline points for the shape
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, false, null);

    // Calculate frame rectangle based on StartPoint and EndPoint
    const frameRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

    // Adjust the svgDoc position and size based on the new frame
    svgDoc.SetSize(this.Frame.width, this.Frame.height);
    svgDoc.SetPos(frameRect.x, frameRect.y);

    // Update the primary shape element
    shapeElem.SetSize(this.Frame.width, this.Frame.height);
    this.UpdateSVG(shapeElem, polyPoints);

    // Update the slop element for event capture, etc.
    slopElem.SetSize(this.Frame.width, this.Frame.height);
    this.UpdateSVG(slopElem, polyPoints);

    // Update dimension lines and text if applicable
    this.UpdateDimensionLines(svgDoc);
    if (this.DataID !== -1) {
      this.LM_ResizeSVGTextObject(svgDoc, this, this.Frame);
    }

    console.log("= S.SegmentedLine: ModifyShape output", {
      Frame: this.Frame,
      polyPoints,
      frameRect
    });
  }

  OnConnect(svgElementId, connectObj, hookPoint, connectionCoord, extra) {
    console.log("= S.SegmentedLine: OnConnect input", {
      svgElementId,
      connectObj,
      hookPoint,
      connectionCoord,
      extra
    });

    let xCoord, yCoord;
    let actionTrigger = 0;
    const svgDoc = GlobalData.optManager.svgObjectLayer.GetElementByID(svgElementId);

    switch (hookPoint) {
      case ConstantData.HookPts.SED_KTL:
        // Update first directional face based on connection point at the end of the line
        this.segl.firstdir = connectObj.GetSegLFace(GlobalData.optManager.LinkParams.ConnectPt, this.EndPoint, connectionCoord);
        actionTrigger = ConstantData.ActionTriggerType.LINEEND;
        xCoord = this.EndPoint.x;
        yCoord = this.EndPoint.y;
        break;
      case ConstantData.HookPts.SED_KTR:
        // Update last directional face based on connection point at the start of the line
        this.segl.lastdir = connectObj.GetSegLFace(GlobalData.optManager.LinkParams.ConnectPt, this.StartPoint, connectionCoord);
        actionTrigger = ConstantData.ActionTriggerType.LINESTART;
        xCoord = this.StartPoint.x;
        yCoord = this.StartPoint.y;
        break;
      default:
        console.log("= S.SegmentedLine: OnConnect unknown hookPoint", { hookPoint });
    }

    if (actionTrigger) {
      console.log("= S.SegmentedLine: OnConnect calling AdjustLine", { svgDoc, xCoord, yCoord, actionTrigger });
      this.AdjustLine(svgDoc, xCoord, yCoord, actionTrigger);
    }

    console.log("= S.SegmentedLine: OnConnect output");
  }

  OnDisconnect(elementId: string, unusedParam: any, hookType: number, extraParam: any): void {
    console.log("= S.SegmentedLine: OnDisconnect input", { elementId, unusedParam, hookType, extraParam });

    let xCoord: number = 0;
    let yCoord: number = 0;
    let actionTrigger: number = 0;
    const svgDoc = GlobalData.optManager.svgObjectLayer.GetElementByID(elementId);

    // If the current object is active, update directional properties from the global object
    if (GlobalData.optManager.ob && GlobalData.optManager.ob.BlockID === this.BlockID) {
      this.segl.firstdir = GlobalData.optManager.ob.segl.firstdir;
      this.segl.lastdir = GlobalData.optManager.ob.segl.lastdir;
    }

    switch (hookType) {
      case ConstantData.HookPts.SED_KTL:
        actionTrigger = ConstantData.ActionTriggerType.LINEEND;
        xCoord = this.EndPoint.x;
        yCoord = this.EndPoint.y;
        this.segl.firstdir = 0;
        if (GlobalData.optManager.ob && GlobalData.optManager.ob.segl) {
          GlobalData.optManager.ob.segl.firstdir = 0;
        }
        break;
      case ConstantData.HookPts.SED_KTR:
        actionTrigger = ConstantData.ActionTriggerType.LINESTART;
        xCoord = this.StartPoint.x;
        yCoord = this.StartPoint.y;
        this.segl.lastdir = 0;
        if (GlobalData.optManager.ob && GlobalData.optManager.ob.segl) {
          GlobalData.optManager.ob.segl.lastdir = 0;
        }
        break;
      default:
        // Optionally handle other hook types if needed.
        break;
    }

    if (actionTrigger) {
      console.log("= S.SegmentedLine: OnDisconnect - calling AdjustLine", { svgDoc, xCoord, yCoord, actionTrigger });
      this.AdjustLine(svgDoc, xCoord, yCoord, actionTrigger);
    }

    console.log("= S.SegmentedLine: OnDisconnect output", { updatedStartPoint: this.StartPoint, updatedEndPoint: this.EndPoint, actionTrigger });
  }

  LinkGrow(elementId, hookType, point) {
    console.log("= S.SegmentedLine: LinkGrow input", {
      elementId,
      hookType,
      point
    });

    switch (hookType) {
      case ConstantData.HookPts.SED_KTL:
        if (
          !(
            Utils2.IsEqual(point.x, this.StartPoint.x) &&
            Utils2.IsEqual(point.y, this.StartPoint.y)
          )
        ) {
          this.SegLFormat(point, ConstantData.ActionTriggerType.LINESTART, 0);
        }
        break;
      case ConstantData.HookPts.SED_KTR:
        if (
          !(
            Utils2.IsEqual(point.x, this.EndPoint.x) &&
            Utils2.IsEqual(point.y, this.EndPoint.y)
          )
        ) {
          this.SegLFormat(point, ConstantData.ActionTriggerType.LINEEND, 0);
        }
        break;
      default:
        // Optionally handle other hook types if needed.
        break;
    }

    this.CalcFrame(true);
    GlobalData.optManager.SetLinkFlag(elementId, ConstantData.LinkFlags.SED_L_MOVE);
    GlobalData.optManager.AddToDirtyList(elementId);

    console.log("= S.SegmentedLine: LinkGrow output", {
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint
    });
  }

  HookToPoint(hookId: number, outRect?: { x: number; y: number; width: number; height: number }): Point {
    console.log("= S.SegmentedLine: HookToPoint input", { hookId, outRect });

    const listManager = ListManager;
    let resultPoint: Point = { x: 0, y: 0 };
    let tempPoint: Point = { x: 0, y: 0 };
    let rectData: any = {};

    switch (hookId) {
      case listManager.HookPts.SED_KTL:
        resultPoint.x = this.StartPoint.x;
        resultPoint.y = this.StartPoint.y;
        if (outRect) {
          tempPoint.x = this.StartPoint.x + this.segl.pts[1].x;
          tempPoint.y = this.StartPoint.y + this.segl.pts[1].y;
          rectData = Utils2.Pt2Rect(this.StartPoint, tempPoint);
          outRect.x = rectData.x;
          outRect.y = rectData.y;
          outRect.width = rectData.width;
          outRect.height = rectData.height;
        }
        break;
      case listManager.HookPts.SED_KTR:
      default:
        resultPoint.x = this.EndPoint.x;
        resultPoint.y = this.EndPoint.y;
        const ptsLength = this.segl.pts.length;
        if (outRect) {
          tempPoint.x = this.StartPoint.x + this.segl.pts[ptsLength - 2].x;
          tempPoint.y = this.StartPoint.y + this.segl.pts[ptsLength - 2].y;
          rectData = Utils2.Pt2Rect(this.EndPoint, tempPoint);
          outRect.x = rectData.x;
          outRect.y = rectData.y;
          outRect.width = rectData.width;
          outRect.height = rectData.height;
        }
        break;
    }

    console.log("= S.SegmentedLine: HookToPoint output", { resultPoint, rectData });
    return resultPoint;
  }

  GetTargetPoints(hook, flags, connectedObjectId) {
    console.log("= S.SegmentedLine: GetTargetPoints input", { hook, flags, connectedObjectId });

    const hookPts = ConstantData.HookPts;
    const sedDim = ConstantData.Defines.SED_CDim;
    let targetPoints = [
      { x: 0, y: 0, id: hookPts.SED_KTL },
      { x: sedDim, y: sedDim, id: hookPts.SED_KTR }
    ];

    // Check if a connected object exists and is a SHAPE
    if (
      connectedObjectId != null &&
      connectedObjectId >= 0 &&
      GlobalData.optManager.GetObjectPtr(connectedObjectId, false).DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE
    ) {
      // Determine a normalized hook id value
      let normalizedId = hook.id;
      if (hook.id >= hookPts.SED_CustomBase) {
        normalizedId = hookPts.SED_CustomBase;
      }
      switch (normalizedId) {
        case hookPts.SED_CustomBase:
        case hookPts.SED_KTC:
        case hookPts.SED_KBC:
        case hookPts.SED_KRC:
        case hookPts.SED_KLC: {
          // Ensure valid frame dimensions
          let frameWidth = this.Frame.width;
          if (frameWidth <= 0) {
            frameWidth = 1;
          }
          let frameHeight = this.Frame.height;
          if (frameHeight <= 0) {
            frameHeight = 1;
          }
          // Calculate target points relative to the Frame
          targetPoints[0].x = ((this.StartPoint.x - this.Frame.x) / frameWidth) * sedDim;
          targetPoints[0].y = ((this.StartPoint.y - this.Frame.y) / frameHeight) * sedDim;
          targetPoints[1].x = ((this.EndPoint.x - this.Frame.x) / frameWidth) * sedDim;
          targetPoints[1].y = ((this.EndPoint.y - this.Frame.y) / frameHeight) * sedDim;

          // Process hooks if available
          if (this.hooks.length === 0) {
            console.log("= S.SegmentedLine: GetTargetPoints output", targetPoints);
            return targetPoints;
          }
          if (this.hooks.length !== 1) {
            console.log("= S.SegmentedLine: GetTargetPoints output", []);
            return [];
          }
          if (this.hooks[0].hookpt === hookPts.SED_KTR) {
            targetPoints[1].skip = true;
            console.log("= S.SegmentedLine: GetTargetPoints output", targetPoints);
            return targetPoints;
          }
          if (this.hooks[0].hookpt === hookPts.SED_KTL) {
            targetPoints[0].skip = true;
            // Mirror target point 1 into target point 0 if necessary
            targetPoints[0].x = targetPoints[1].x;
            targetPoints[0].y = targetPoints[1].y;
            console.log("= S.SegmentedLine: GetTargetPoints output", targetPoints);
            return targetPoints;
          }
          break;
        }
      }
    }

    // Fallback to base shape poly get targets
    const result = this.BaseShape_PolyGetTargets(hook, flags, this.Frame);
    console.log("= S.SegmentedLine: GetTargetPoints output", result);
    return result;
  }

  BaseShape_PolyGetTargets(e, hookFlags, boundingRect) {
    console.log("= S.SegmentedLine: BaseShape_PolyGetTargets input", { inputPoint: e, hookFlags, boundingRect });

    // Get the list of target points from the polyline
    let polyList = this.PolyGetTargetPointList(hookFlags);
    if (e == null) {
      console.log("= S.SegmentedLine: BaseShape_PolyGetTargets output", { targets: null });
      return null;
    }

    // Initialize variables
    let candidateArray: Point[] = [{ x: 0, y: 0 }];
    let targetPoints: Point[] = [];
    let bestDistance = ConstantData.Defines.LongIntMax;
    let candidate: { x: number; y: number } = { x: 0, y: 0 };
    let queryPoint: { x: number; y: number } = { x: e.x, y: e.y };
    let tempPoint: { x: number; y: number } = { x: e.x, y: e.y };
    let snapEnabled: boolean = false;
    let currentRect: any = {};
    let bestIndex = -1;

    // Prepare the snapping point if enabled
    let snapPoint = { x: e.x, y: e.y };
    if (GlobalData.docHandler.documentConfig.enableSnap && (hookFlags & ConstantData.HookFlags.SED_LC_NoSnaps) === 0) {
      snapPoint = GlobalData.docHandler.SnapToGrid(snapPoint);
      // Clamp snap point within the boundingRect
      if (snapPoint.y < boundingRect.y) { snapPoint.y = boundingRect.y; }
      if (snapPoint.y > boundingRect.y + boundingRect.height) { snapPoint.y = boundingRect.y + boundingRect.height; }
      if (snapPoint.x < boundingRect.x) { snapPoint.x = boundingRect.x; }
      if (snapPoint.x > boundingRect.x + boundingRect.width) { snapPoint.x = boundingRect.x + boundingRect.width; }
      snapEnabled = true;
    }

    // Loop through the polyline points to find the best target point
    let listLength = polyList.length;
    for (let i = 1; i < listLength; i++) {
      // Reset the temporary point to the query point each iteration
      tempPoint.x = e.x;
      tempPoint.y = e.y;

      // Get two consecutive points from the polyList
      const pt1 = polyList[i - 1];
      const pt2 = polyList[i];

      // Skip if the points are equal
      if (Utils2.EqualPt(pt1, pt2)) {
        continue;
      }

      // Compute differences and ensure non-zero denominators
      let deltaX = pt2.x - pt1.x;
      let deltaY = pt2.y - pt1.y;
      let safeDeltaX = deltaX === 0 ? 1 : deltaX;
      let safeDeltaY = deltaY === 0 ? 1 : deltaY;

      // Depending on the slope magnitude, adjust the query point coordinate accordingly
      if (Math.abs(safeDeltaY / safeDeltaX) > 1) {
        // For steep (vertical) segments, adjust x using the queryPoint.y
        if (snapEnabled) {
          tempPoint.y = snapPoint.y;
        }
        let projectedX = safeDeltaX / safeDeltaY * (tempPoint.y - pt1.y) + pt1.x;
        let distance = Math.abs(projectedX - tempPoint.x);
        tempPoint.x = projectedX;
        // Ensure the projected x is between pt1.x and pt2.x
        const minX = Math.min(pt1.x, pt2.x);
        const maxX = Math.max(pt1.x, pt2.x);
        if (projectedX < minX || projectedX > maxX) {
          distance = ConstantData.Defines.LongIntMax;
        } else {
          // Inflate the segment rectangle slightly for tolerance
          currentRect = Utils2.Pt2Rect(pt1, pt2);
          Utils2.InflateRect(currentRect, 1, 1);
          if (!Utils2.pointInRect(currentRect, tempPoint)) {
            distance = ConstantData.Defines.LongIntMax;
          }
        }
        if (distance < bestDistance) {
          bestIndex = i;
          candidate.x = projectedX;
          candidate.y = tempPoint.y;
          bestDistance = distance;
        }
      } else {
        // For shallow (horizontal) segments, adjust y using the queryPoint.x
        if (snapEnabled) {
          tempPoint.x = snapPoint.x;
        }
        let projectedY = safeDeltaY / safeDeltaX * (tempPoint.x - pt1.x) + pt1.y;
        let distance = Math.abs(projectedY - tempPoint.y);
        tempPoint.y = projectedY;
        // Ensure the projected y is between pt1.y and pt2.y
        const minY = Math.min(pt1.y, pt2.y);
        const maxY = Math.max(pt1.y, pt2.y);
        if (projectedY < minY || projectedY > maxY) {
          distance = ConstantData.Defines.LongIntMax;
        } else {
          currentRect = Utils2.Pt2Rect(pt1, pt2);
          Utils2.InflateRect(currentRect, 1, 1);
          if (!Utils2.pointInRect(currentRect, tempPoint)) {
            distance = ConstantData.Defines.LongIntMax;
          }
        }
        if (distance < bestDistance) {
          bestIndex = i;
          candidate.x = tempPoint.x;
          candidate.y = projectedY;
          bestDistance = distance;
        }
      }
    }

    // If a candidate segment was found, prepare the final target point.
    if (bestIndex >= 0) {
      candidateArray[0].x = candidate.x;
      candidateArray[0].y = candidate.y;
      // Use the provided boundingRect as the reference for proportions
      let refRect = boundingRect;
      // If the object is rotated, rotate the candidate point about the center of the bounding rectangle
      if (this.RotationAngle !== 0) {
        let angleRad = this.RotationAngle / (180 / ConstantData.Geometry.PI);
        Utils3.RotatePointsAboutCenter(refRect, angleRad, candidateArray);
      }
      let width = refRect.width;
      let height = refRect.height;
      let ratioX = width === 0 ? 0 : (candidateArray[0].x - refRect.x) / width;
      let ratioY = height === 0 ? 0 : (candidateArray[0].y - refRect.y) / height;

      // Scale the ratios by the defined constant to get target coordinates
      targetPoints.push(new Point(ratioX * ConstantData.Defines.SED_CDim, ratioY * ConstantData.Defines.SED_CDim));
      console.log("= S.SegmentedLine: BaseShape_PolyGetTargets output", { targets: targetPoints });
      return targetPoints;
    }

    console.log("= S.SegmentedLine: BaseShape_PolyGetTargets output", { targets: null });
    return null;
  }


  GetPerimPts(input: any, hooks: any, hookType: any, paramR: any, paramI: any, connectedObjectId: number) {
    console.log("= S.SegmentedLine: GetPerimPts input", { input, hooks, hookType, paramR, paramI, connectedObjectId });

    let frame = this.Frame;
    let resultPoints: Point[] = [];
    let index = 0;
    let numHooks = 0;

    // Quick reference to ConstantData.ObjectTypes (unused, but kept as in original)
    ConstantData.ObjectTypes;

    if (hooks) {
      // Special case: exactly 2 hooks with SED_KTL and SED_KTR
      numHooks = hooks.length;
      if (
        numHooks === 2 &&
        hooks[0].id && hooks[0].id === ConstantData.HookPts.SED_KTL &&
        hooks[1].id && hooks[1].id === ConstantData.HookPts.SED_KTR
      ) {
        if (hooks[0].skip == null) {
          resultPoints.push(new Point(this.StartPoint.x, this.StartPoint.y));
          resultPoints[0].id = hooks[0].id;
          index = 1;
        }
        if (hooks[1].skip == null) {
          resultPoints.push(new Point(this.EndPoint.x, this.EndPoint.y));
          resultPoints[index].id = hooks[1].id;
        }
        console.log("= S.SegmentedLine: GetPerimPts output", resultPoints);
        return resultPoints;
      }

      // Handle connected object cases if provided
      if (connectedObjectId >= 0) {
        const connectedObj = GlobalData.optManager.GetObjectPtr(connectedObjectId, false);
        if (connectedObj) {
          // Case for multiplicity object
          if (connectedObj.objecttype === ConstantData.ObjectTypes.SD_OBJT_MULTIPLICITY && numHooks === 1) {
            let offsetX = 5, offsetY = 5;
            offsetX += connectedObj.Frame.width / 2;

            if (hooks[0].x === 0) {
              const ptStart = this.segl.pts[0];
              const ptNext = this.segl.pts[1];
              if (ptStart.x === ptNext.x) {
                if (connectedObj.subtype === ConstantData.ObjectSubTypes.SD_SUBT_MULTIPLICITY_FLIPPED) {
                  offsetX = -offsetX;
                }
                offsetY = ptStart.y > ptNext.y ? -offsetY : offsetY + connectedObj.Frame.height;
                resultPoints.push(new Point(this.StartPoint.x + offsetX, this.StartPoint.y + offsetY));
                resultPoints[0].id = hooks[0].id;
              } else {
                if (connectedObj.subtype === ConstantData.ObjectSubTypes.SD_SUBT_MULTIPLICITY_FLIPPED) {
                  offsetY = -connectedObj.Frame.height - 5;
                }
                offsetY = -offsetY;
                if (ptStart.x > ptNext.x) {
                  offsetX = -offsetX;
                }
                resultPoints.push(new Point(this.StartPoint.x + offsetX, this.StartPoint.y + offsetY));
                resultPoints[0].id = hooks[0].id;
              }
            } else {
              const ptsLength = this.segl.pts.length;
              const ptPrev = this.segl.pts[ptsLength - 2];
              const ptLast = this.segl.pts[ptsLength - 1];
              if (ptPrev.x === ptLast.x) {
                if (connectedObj.subtype === ConstantData.ObjectSubTypes.SD_SUBT_MULTIPLICITY_FLIPPED) {
                  offsetX = -offsetX;
                }
                offsetY = ptPrev.y < ptLast.y ? -offsetY : offsetY + connectedObj.Frame.height;
                if (hookType === ConstantData.HookPts.SED_KCBR) {
                  offsetX = -offsetX;
                }
                resultPoints.push(new Point(this.EndPoint.x + offsetX, this.EndPoint.y + offsetY));
                resultPoints[0].id = hooks[0].id;
              } else {
                if (connectedObj.subtype === ConstantData.ObjectSubTypes.SD_SUBT_MULTIPLICITY_FLIPPED) {
                  offsetY = -connectedObj.Frame.height - 5;
                }
                offsetY = -offsetY;
                if (ptPrev.x < ptLast.x) {
                  offsetX = -offsetX;
                }
                resultPoints.push(new Point(this.EndPoint.x + offsetX, this.EndPoint.y + offsetY));
                resultPoints[0].id = hooks[0].id;
              }
            }
            console.log("= S.SegmentedLine: GetPerimPts output", resultPoints);
            return resultPoints;
          }
          // Case for extra text label object
          if (connectedObj.objecttype === ConstantData.ObjectTypes.SD_OBJT_EXTRATEXTLABEL && numHooks === 1) {
            const extraLabelPoints = super.GetPerimPts(input, hooks, hookType, paramR, paramI, connectedObjectId);
            console.log("= S.SegmentedLine: GetPerimPts output", extraLabelPoints);
            return extraLabelPoints;
          }
        }
      }
    }

    // Default processing: map hook coordinates relative to the frame
    numHooks = hooks ? hooks.length : 0;
    resultPoints = new Array(numHooks);
    for (let C = 0; C < numHooks; C++) {
      resultPoints[C] = { x: 0, y: 0, id: 0 };
      const frameWidth = frame.width;
      const frameHeight = frame.height;
      resultPoints[C].x = (hooks[C].x / ConstantData.Defines.SED_CDim) * frameWidth + frame.x;
      resultPoints[C].y = (hooks[C].y / ConstantData.Defines.SED_CDim) * frameHeight + frame.y;
      if (hooks[C].id != null) {
        resultPoints[C].id = hooks[C].id;
      }
    }
    console.log("= S.SegmentedLine: GetPerimPts output", resultPoints);
    return resultPoints;
  }

  ScaleObject(
    scaleX: number,
    scaleY: number,
    deltaX: number,
    deltaY: number,
    pivotX: number,
    pivotY: number,
    preserveAspectRatio: boolean
  ): void {
    console.log("= S.SegmentedLine: ScaleObject input", {
      scaleX,
      scaleY,
      deltaX,
      deltaY,
      pivotX,
      pivotY,
      preserveAspectRatio,
    });

    // Call the base class scale function
    super.ScaleObject(scaleX, scaleY, deltaX, deltaY, pivotX, pivotY, preserveAspectRatio);

    // Recalculate the segmented line with preserved format and update frame values
    this.SegLFormat(
      this.EndPoint,
      ConstantData.ActionTriggerType.SEGL_PRESERVE,
      0
    );
    this.CalcFrame();

    console.log("= S.SegmentedLine: ScaleObject output", {
      EndPoint: this.EndPoint,
      Frame: this.Frame,
    });
  }

  GetSegLFace(e, currentPt, testPt) {
    console.log("= S.SegmentedLine: GetSegLFace input", { e, currentPt, testPt });

    // Get the polyline points with curves skipped (third parameter true)
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, null);
    let hook = 0;
    let rect = null;
    // Prepare the test point using testPt
    const testPoint = { x: testPt.x, y: testPt.y };
    const hitData = {};

    // Check if the testPoint hits the line style
    if (Utils3.LineDStyleHit(polyPoints, testPoint, this.StyleRecord.Line.Thickness, 0, hitData) && hitData.lpHit >= 0) {
      rect = Utils2.Pt2Rect(polyPoints[hitData.lpHit], polyPoints[hitData.lpHit + 1]);
      // Determine hook based on the orientation of the segment
      if (rect.width >= rect.height) {
        hook = (currentPt.y >= testPt.y) ? ConstantData.HookPts.SED_KBC : ConstantData.HookPts.SED_KTC;
      } else {
        hook = (currentPt.x >= testPt.x) ? ConstantData.HookPts.SED_KRC : ConstantData.HookPts.SED_KLC;
      }
    }

    console.log("= S.SegmentedLine: GetSegLFace output", { hook });
    return hook;
  }

  GetSpacing() {
    console.log("= S.SegmentedLine: GetSpacing input", {
      hooks: this.hooks,
      segl: this.segl,
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint
    });

    const hookPoints = ConstantData.HookPts;
    let spacing = { width: null, height: null };

    let hookObj1, hookObj2;
    if (this.hooks.length === 2) {
      hookObj1 = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);
      hookObj2 = GlobalData.optManager.GetObjectPtr(this.hooks[1].objid, false);
    }

    switch (this.segl.firstdir) {
      case hookPoints.SED_KTC:
        if (this.segl.lastdir === hookPoints.SED_KBC) {
          spacing.height = Math.abs(this.StartPoint.y - this.EndPoint.y);
          if (hookObj1 && hookObj2) {
            if (hookObj1.Frame.y < hookObj2.Frame.y) {
              spacing.height = hookObj2.Frame.y - (hookObj1.Frame.y + hookObj1.Frame.height);
            } else {
              spacing.height = hookObj1.Frame.y - (hookObj2.Frame.y + hookObj2.Frame.height);
            }
          }
        }
        break;
      case hookPoints.SED_KBC:
        if (this.segl.lastdir === hookPoints.SED_KTC) {
          spacing.height = Math.abs(this.StartPoint.y - this.EndPoint.y);
          if (hookObj1 && hookObj2) {
            if (hookObj1.Frame.y < hookObj2.Frame.y) {
              spacing.height = hookObj2.Frame.y - (hookObj1.Frame.y + hookObj1.Frame.height);
            } else {
              spacing.height = hookObj1.Frame.y - (hookObj2.Frame.y + hookObj2.Frame.height);
            }
          }
        }
        break;
      case hookPoints.SED_KLC:
        if (this.segl.lastdir === hookPoints.SED_KRC) {
          spacing.width = Math.abs(this.StartPoint.x - this.EndPoint.x);
          if (hookObj1 && hookObj2) {
            if (hookObj1.Frame.x < hookObj2.Frame.x) {
              spacing.width = hookObj2.Frame.x - (hookObj1.Frame.x + hookObj1.Frame.width);
            } else {
              spacing.width = hookObj1.Frame.x - (hookObj2.Frame.x + hookObj2.Frame.width);
            }
          }
        }
        break;
      case hookPoints.SED_KRC:
        if (this.segl.lastdir === hookPoints.SED_KLC) {
          spacing.width = Math.abs(this.StartPoint.x - this.EndPoint.x);
          if (hookObj1 && hookObj2) {
            if (hookObj1.Frame.x < hookObj2.Frame.x) {
              spacing.width = hookObj2.Frame.x - (hookObj1.Frame.x + hookObj1.Frame.width);
            } else {
              spacing.width = hookObj1.Frame.x - (hookObj2.Frame.x + hookObj2.Frame.width);
            }
          }
        }
        break;
    }

    console.log("= S.SegmentedLine: GetSpacing output", spacing);
    return spacing;
  }

  GetShapeConnectPoint(inputHook: number) {
    console.log("= S.SegmentedLine: GetShapeConnectPoint input", { inputHook });

    let pt1: Point, pt2: Point;
    let resultLeft: { x?: number; y?: number } = {};
    let resultRight: { x?: number; y?: number } = {};
    let lastDirection = this.segl.lastdir;
    let firstDirection = this.segl.firstdir;
    const shapeDim = ConstantData.Defines.SED_CDim;
    const ptsLength = this.segl.pts.length;

    // Choose endpoints based on the hook parameter:
    if (inputHook === ConstantData.HookPts.SED_KTL) {
      pt1 = this.segl.pts[0];
      pt2 = this.segl.pts[1];
    } else {
      pt1 = this.segl.pts[ptsLength - 2];
      pt2 = this.segl.pts[ptsLength - 1];
    }

    // Determine connection point based on the orientation of the segment:
    if (pt1.x === pt2.x) {
      // Vertical segment:
      resultLeft.x = shapeDim / 2;
      resultRight.x = shapeDim / 2;
      if (pt2.y > pt1.y) {
        resultLeft.y = 0;
        resultRight.y = shapeDim;
        lastDirection = ConstantData.HookPts.SED_KTC;
        firstDirection = ConstantData.HookPts.SED_KBC;
      } else {
        resultLeft.y = shapeDim;
        resultRight.y = 0;
        lastDirection = ConstantData.HookPts.SED_KBC;
        firstDirection = ConstantData.HookPts.SED_KTC;
      }
    } else {
      // Horizontal segment:
      resultLeft.y = shapeDim / 2;
      resultRight.y = shapeDim / 2;
      if (pt2.x > pt1.x) {
        resultLeft.x = 0;
        resultRight.x = shapeDim;
        lastDirection = ConstantData.HookPts.SED_KLC;
        firstDirection = ConstantData.HookPts.SED_KRC;
      } else {
        resultLeft.x = shapeDim;
        resultRight.x = 0;
        lastDirection = ConstantData.HookPts.SED_KRC;
        firstDirection = ConstantData.HookPts.SED_KLC;
      }
    }

    // Set output and update directional properties:
    let outputPoint: { x?: number; y?: number };
    if (inputHook === ConstantData.HookPts.SED_KTL) {
      this.segl.firstdir = firstDirection;
      outputPoint = resultRight;
    } else {
      this.segl.lastdir = lastDirection;
      outputPoint = resultLeft;
    }

    console.log("= S.SegmentedLine: GetShapeConnectPoint output", outputPoint);
    return outputPoint;
  }

  ConnectToHook(connectedObjectId: number, hookType: number): number {
    console.log("= S.SegmentedLine: ConnectToHook input", { connectedObjectId, hookType });

    let resultHook = hookType;
    if (SDF.LineIsReversed(this, null, false)) {
      if (resultHook === ConstantData.HookPts.SED_KTL) {
        resultHook = ConstantData.HookPts.SED_KTR;
      } else if (resultHook === ConstantData.HookPts.SED_KTR) {
        resultHook = ConstantData.HookPts.SED_KTL;
      }
    }

    console.log("= S.SegmentedLine: ConnectToHook output", { result: resultHook });
    return resultHook;
  }

  GetBestHook(objectId: number, inputHook: number, pt: Point): number {
    console.log("= S.SegmentedLine: GetBestHook input", { objectId, inputHook, pt });

    // Define constants and extract hook points from constant data.
    const sedCDim: number = ConstantData.Defines.SED_CDim;
    // Call Pt2Rect for side-effect (if needed) and get hook points.
    Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const hookPts = ConstantData.HookPts;

    const totalPts: number = this.segl.pts.length;
    // Start with pt.x as baseline
    let compareValue = pt.x;
    // If there are exactly 2 points and they form a vertical line, use pt.y instead.
    if (totalPts === 2 && this.segl.pts[0].x === this.segl.pts[1].x) {
      compareValue = pt.y;
    }

    // Determine the two candidate points (r and i) from the segmentation points.
    let firstPt: Point, secondPt: Point;
    if (SDF.LineIsReversed(this, null, false)) {
      if (compareValue === 0) {
        // Use the last two points.
        firstPt = this.segl.pts[totalPts - 2];
        secondPt = this.segl.pts[totalPts - 1];
      } else {
        // Use the first two points.
        secondPt = this.segl.pts[0];
        firstPt = this.segl.pts[1];
      }
    } else {
      if (compareValue === sedCDim) {
        // Use the last two points.
        firstPt = this.segl.pts[totalPts - 2];
        secondPt = this.segl.pts[totalPts - 1];
      } else {
        // Use the first two points.
        secondPt = this.segl.pts[0];
        firstPt = this.segl.pts[1];
      }
    }

    // Retrieve the object pointer for the given objectId.
    const shapeObj = GlobalData.optManager.GetObjectPtr(objectId, false);
    let bestHook = inputHook;
    if (shapeObj && shapeObj.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
      switch (inputHook) {
        case hookPts.SED_KTC:
        case hookPts.SED_KBC:
        case hookPts.SED_KRC:
        case hookPts.SED_KLC:
          // For vertical segments: choose SED_KBC if firstPt is above secondPt, else SED_KTC.
          // For horizontal segments: choose SED_KRC if firstPt is to the left of secondPt, else SED_KLC.
          if (firstPt.x === secondPt.x) {
            bestHook = firstPt.y < secondPt.y ? hookPts.SED_KBC : hookPts.SED_KTC;
          } else {
            bestHook = firstPt.x < secondPt.x ? hookPts.SED_KRC : hookPts.SED_KLC;
          }
          break;
        default:
          bestHook = inputHook;
      }
    }

    console.log("= S.SegmentedLine: GetBestHook output", { bestHook });
    return bestHook;
  }

  MaintainPoint(
    point: Point,
    targetId: number,
    paramA: any,
    currentObj: any,
    paramI: any
  ): boolean {
    console.log("= S.SegmentedLine: MaintainPoint input", { point, targetId, paramA, currentObj, paramI });

    let result = true;
    let obj = currentObj; // alias for input object
    let hookRect: any = {};
    let polyRect: any = {};
    let tempCopy: any = {};

    switch (obj.DrawingObjectBaseClass) {
      case ConstantData.DrawingObjectBaseClass.LINE:
        switch (obj.LineType) {
          case ConstantData.LineType.SEGLINE:
          case ConstantData.LineType.ARCSEGLINE:
          case ConstantData.LineType.POLYLINE:
            // Look for a hook with matching targetId
            let hookFound = false;
            for (let idx = 0; idx < obj.hooks.length; idx++) {
              if (obj.hooks[idx].targetid === targetId) {
                obj.HookToPoint(obj.hooks[idx].hookpt, hookRect);
                hookFound = true;
                break;
              }
            }
            if (!hookFound) {
              console.log("= S.SegmentedLine: MaintainPoint - no matching hook found, returning true");
              console.log("= S.SegmentedLine: MaintainPoint output", true);
              return true;
            }
            // Create a deep copy and update its Frame and endpoints based on hookRect
            tempCopy = Utils1.DeepCopy(obj);
            Utils2.CopyRect(tempCopy.Frame, hookRect);
            tempCopy.StartPoint.x = hookRect.x;
            tempCopy.StartPoint.y = hookRect.y;
            tempCopy.EndPoint.x = hookRect.x + hookRect.width;
            tempCopy.EndPoint.y = hookRect.y + hookRect.height;
            obj = tempCopy;
            break;
        }
        break;
      case ConstantData.DrawingObjectBaseClass.SHAPE:
        GlobalData.optManager.Lines_MaintainDist(this, paramA, paramI, point);
        console.log("= S.SegmentedLine: MaintainPoint processed for SHAPE, returning true");
        console.log("= S.SegmentedLine: MaintainPoint output", true);
        return true;
    }

    // Get the polyline points without translation and with curves skipped
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, null);
    const totalPoints = polyPoints.length;

    for (let idx = 1; idx < totalPoints; idx++) {
      // Get rectangle defined by the current segment points
      polyRect = Utils2.Pt2Rect(polyPoints[idx], polyPoints[idx - 1]);

      // Create a deep copy of this segmented line and update its frame using the segment rectangle
      tempCopy = Utils1.DeepCopy(this);
      Utils2.CopyRect(tempCopy.Frame, polyRect);
      tempCopy.StartPoint.x = polyRect.x;
      tempCopy.StartPoint.y = polyRect.y;
      tempCopy.EndPoint.x = polyRect.x + polyRect.width;
      tempCopy.EndPoint.y = polyRect.y + polyRect.height;

      // Check if the point lies on this segment
      if (GlobalData.optManager.LineCheckPoint(tempCopy, point)) {
        console.log("= S.SegmentedLine: MaintainPoint - LineCheckPoint returned true", { segment: idx, polyRect });
        console.log("= S.SegmentedLine: MaintainPoint output", true);
        return true;
      }
      // Check for intersection with the current object
      if (GlobalData.optManager.Lines_Intersect(tempCopy, obj, point)) {
        console.log("= S.SegmentedLine: MaintainPoint - Lines_Intersect returned true", { segment: idx, polyRect });
        console.log("= S.SegmentedLine: MaintainPoint output", true);
        return true;
      }
    }

    GlobalData.optManager.Lines_MaintainDist(this, paramA, paramI, point);
    console.log("= S.SegmentedLine: MaintainPoint output", result);
    return result;
  }

  WriteSDFAttributes(writer, options) {
    console.log("= S.SegmentedLine: WriteSDFAttributes input", { writer, options });

    const numPoints = this.segl.pts.length;
    console.log("= S.SegmentedLine: Number of segmentation points", { numPoints });

    const instanceId = options.WriteBlocks ? this.BlockID : options.nsegl++;
    console.log("= S.SegmentedLine: Instance ID", { instanceId });

    const reversed = SDF.LineIsReversed(this, options, false);
    console.log("= S.SegmentedLine: Is line reversed?", { reversed });

    let copiedSeg = Utils1.DeepCopy(this.segl);
    let lastSegIndex = numPoints - 1;
    if (lastSegIndex < 0) lastSegIndex = 0;

    // If the line is reversed, reverse the segmentation points and swap the direction flags.
    if (reversed) {
      console.log("= S.SegmentedLine: Reversing segmentation points and swapping direction flags");
      for (let i = 0; i < numPoints; i++) {
        copiedSeg.pts[numPoints - 1 - i].x = this.segl.pts[i].x;
        copiedSeg.pts[numPoints - 1 - i].y = this.segl.pts[i].y;
      }
      const tempDir = copiedSeg.firstdir;
      copiedSeg.firstdir = copiedSeg.lastdir;
      copiedSeg.lastdir = tempDir;
      console.log("= S.SegmentedLine: Reversed direction flags", {
        firstdir: copiedSeg.firstdir,
        lastdir: copiedSeg.lastdir,
      });

      for (let i = 0; i < numPoints - 1; i++) {
        if (Utils2.IsEqual(copiedSeg.pts[i + 1].x, copiedSeg.pts[i].x)) {
          copiedSeg.lengths[i] = Math.abs(copiedSeg.pts[i + 1].y - copiedSeg.pts[i].y);
        } else {
          copiedSeg.lengths[i] = Math.abs(copiedSeg.pts[i + 1].x - copiedSeg.pts[i].x);
        }
      }
      if (numPoints === 6) {
        copiedSeg.lengths[2] = copiedSeg.lengths[4];
      }
    }

    let sdfData;
    if (options.WriteWin32) {
      sdfData = {
        InstId: instanceId,
        firstdir: copiedSeg.firstdir,
        lastdir: copiedSeg.lastdir,
        nsegs: lastSegIndex,
        segr: [],
        lengths: [0, 0, 0, 0, 0],
        lsegr: [],
        llengths: [0, 0, 0, 0, 0],
      };
    } else {
      sdfData = {
        InstId: instanceId,
        firstdir: copiedSeg.firstdir,
        lastdir: copiedSeg.lastdir,
        curveparam: copiedSeg.curveparam,
        nsegs: lastSegIndex,
        lsegr: [],
        llengths: [0, 0, 0, 0, 0],
      };
    }
    console.log("= S.SegmentedLine: Initialized sdfData", sdfData);

    // Determine the minimum X and Y coordinates from all segmentation points.
    let minX, minY;
    for (let i = 0; i < numPoints; i++) {
      if (i === 0 || copiedSeg.pts[i].x < minX) {
        minX = copiedSeg.pts[i].x;
      }
      if (i === 0 || copiedSeg.pts[i].y < minY) {
        minY = copiedSeg.pts[i].y;
      }
    }
    console.log("= S.SegmentedLine: Computed minX and minY", { minX, minY });

    // Convert each segment's length to SD window coordinates.
    const lengthsCount = copiedSeg.lengths.length;
    for (let i = 0; i < lengthsCount; i++) {
      sdfData.llengths[i] = SDF.ToSDWinCoords(copiedSeg.lengths[i], options.coordScaleFactor);
    }
    console.log("= S.SegmentedLine: Converted segment lengths", { llengths: sdfData.llengths });

    // Create rectangle info for each segment between adjacent points.
    for (let i = 0; i < numPoints - 1; i++) {
      let segmentRect = {
        left: SDF.ToSDWinCoords(copiedSeg.pts[i].x - minX, options.coordScaleFactor),
        top: SDF.ToSDWinCoords(copiedSeg.pts[i].y - minY, options.coordScaleFactor),
        right: SDF.ToSDWinCoords(copiedSeg.pts[i + 1].x - minX, options.coordScaleFactor),
        bottom: SDF.ToSDWinCoords(copiedSeg.pts[i + 1].y - minY, options.coordScaleFactor),
      };

      // Ensure the rectangle is properly ordered.
      if (numPoints > 2) {
        if (segmentRect.left > segmentRect.right) {
          let temp = segmentRect.left;
          segmentRect.left = segmentRect.right;
          segmentRect.right = temp;
        }
        if (segmentRect.top > segmentRect.bottom) {
          let temp = segmentRect.top;
          segmentRect.top = segmentRect.bottom;
          segmentRect.bottom = temp;
        }
      }
      sdfData.lsegr.push(segmentRect);

      if (options.WriteWin32) {
        sdfData.segr.push({ left: 0, top: 0, right: 0, bottom: 0 });
      }
    }
    console.log("= S.SegmentedLine: Created segmentation rectangles", { lsegr: sdfData.lsegr });

    // If there are fewer than 5 segments, pad the remaining segment info with zeros.
    for (let i = numPoints - 1; i < 5; i++) {
      sdfData.lsegr.push({ left: 0, top: 0, right: 0, bottom: 0 });
      if (options.WriteWin32) {
        sdfData.segr.push({ left: 0, top: 0, right: 0, bottom: 0 });
      }
    }
    console.log("= S.SegmentedLine: Padded segmentation rectangles", { lsegr: sdfData.lsegr });

    const code = SDF.Write_CODE(writer, ConstantData2.SDROpCodesByName.SDF_C_DRAWSEGL);
    if (options.WriteWin32) {
      writer.writeStruct(FileParser.SDF_SegLine_Struct, sdfData);
    } else {
      writer.writeStruct(FileParser.SDF_SegLine_Struct_210, sdfData);
    }
    SDF.Write_LENGTH(writer, code);

    // Call the base class implementation.
    super.WriteSDFAttributes(writer, options);

    console.log("= S.SegmentedLine: WriteSDFAttributes output", { sdfData, code });
  }

}

export default SegmentedLine

