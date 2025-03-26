

import BaseLine from './S.BaseLine'
import Utils1 from '../Util/Utils1'
import Utils2 from "../Util/Utils2"
import Utils3 from "../Util/Utils3"
import T3Gv from '../Data/T3Gv'
import NvConstant from '../Data/Constant/NvConstant'
import SelectionAttr from '../Model/SelectionAttr'
import Point from '../Model/Point'
import $ from 'jquery'
import Instance from '../Data/Instance/Instance'
import DSConstant from '../Opt/DS/DSConstant'
import OptConstant from '../Data/Constant/OptConstant'
import CursorConstant from '../Data/Constant/CursorConstant'
import T3Util from '../Util/T3Util'
import TextConstant from '../Data/Constant/TextConstant'
import DataUtil from '../Opt/Data/DataUtil'
import UIUtil from '../Opt/UI/UIUtil'
import OptCMUtil from '../Opt/Opt/OptCMUtil'
import HookUtil from '../Opt/Opt/HookUtil'

/**
 * ArcLine class represents a curved line segment in the T3000 HVAC drawing system.
 * This class extends BaseLine and provides functionality for creating, rendering, and manipulating
 * arc-shaped connections between two points.
 *
 * @extends BaseLine
 *
 * @property {any} CurveAdjust - Controls the curvature of the arc (1-500). Higher values increase curvature.
 * @property {boolean} IsReversed - Determines the side of the curve relative to the line between start and end points.
 * @property {any} FromPolygon - Indicates if this arc is part of a polygon.
 * @property {any} FixedPoint - Reference point used for certain operations.
 * @property {any} LineOrientation - Specifies the orientation of the line.
 * @property {any} hoplist - Contains information about "hops" (places where the arc jumps over other elements).
 * @property {any} ArrowheadData - Data for rendering arrowheads.
 * @property {number} StartArrowID - ID of the arrow style at the start point.
 * @property {number} EndArrowID - ID of the arrow style at the end point.
 * @property {boolean} StartArrowDisp - Controls visibility of the start arrow.
 * @property {boolean} EndArrowDisp - Controls visibility of the end arrow.
 * @property {number} ArrowSizeIndex - Controls the size of arrowheads.
 * @property {boolean} TextDirection - Affects text placement/orientation on the arc.
 * @property {number} OriginalCurveAdjust - Stores initial curvature during modifications.
 * @property {boolean} OriginalIsReversed - Stores initial reversal state during modifications.
 * @property {number} OriginalLineSide - Stores which side of the line the curve is on during modifications.
 * @property {number} OriginalCenterPointDistance - Stores the initial distance to center during modifications.
 *
 * @example
 * // Create a new arc line
 * const arcLine = new ArcLine({
 *   StartPoint: { x: 100, y: 100 },
 *   EndPoint: { x: 200, y: 200 },
 *   CurveAdjust: 50,
 *   IsReversed: false,
 *   StartArrowID: 1,
 *   EndArrowID: 2,
 *   ArrowSizeIndex: 1
 * });
 *
 * // Modify the curve's shape
 * arcLine.CurveAdjust = 75;
 * arcLine.ModifyShape(svgDoc, 150, 130, 0);
 *
 * // Flip the arc horizontally
 * arcLine.Flip(OptConstant.ExtraFlags.FlipHoriz);
 */
class ArcLine extends BaseLine {
  public CurveAdjust: any;
  public IsReversed: any;
  public FromPolygon: any;
  public FixedPoint: any;
  public LineOrientation: any;
  public hoplist: any;
  public ArrowheadData: any;
  public StartArrowID: any;
  public EndArrowID: any;
  public StartArrowDisp: any;
  public EndArrowDisp: any;
  public ArrowSizeIndex: any;
  public TextDirection: any;
  public OriginalCurveAdjust: any;
  public OriginalIsReversed: any;
  public OriginalLineSide: any;
  public OriginalCenterPointDistance: any;

  constructor(options: any = {}) {
    T3Util.Log("= S.ArcLine constructor input:", options);

    // Set line type and call the super constructor
    options.LineType = OptConstant.LineType.ARCLINE;
    super(options);

    // Initialize properties with default values if not provided
    this.StartPoint = options.StartPoint || { x: 0, y: 0 };
    this.EndPoint = options.EndPoint || { x: 0, y: 0 };
    this.CurveAdjust = options.CurveAdjust;
    this.IsReversed = options.IsReversed || false;
    this.FromPolygon = options.FromPolygon || false;

    // Calculate frame based on start and end points
    this.CalcFrame();

    // Other properties initialization
    this.FixedPoint = options.FixedPoint || [0, 0];
    this.LineOrientation = options.LineOrientation || OptConstant.LineOrientation.None;
    this.hoplist = options.hoplist || { nhops: 0, hops: [] };
    this.ArrowheadData = options.ArrowheadData || [];
    this.StartArrowID = options.StartArrowID || 0;
    this.EndArrowID = options.EndArrowID || 0;
    this.StartArrowDisp = options.StartArrowDisp || false;
    this.EndArrowDisp = options.EndArrowDisp || false;
    this.ArrowSizeIndex = options.ArrowSizeIndex || 0;
    this.TextDirection = options.TextDirection || false;

    T3Util.Log("= S.ArcLine constructor output:", this);
  }

  CalcRadiusAndCenter(startX, startY, endX, endY, curveAdjust, isReversed) {
    T3Util.Log("= S.ArcLine CalcRadiusAndCenter input:", { startX, startY, endX, endY, curveAdjust, isReversed });

    const result = {
      centerX: 0,
      centerY: 0,
      actionX: 0,
      actionY: 0,
      radius: 0,
      valid: false,
      centerInside: false
    };

    // Calculate midpoint and chord vector
    const midX = startX + (endX - startX) / 2;
    const midY = startY + (endY - startY) / 2;
    const dx = endX - startX;
    const dy = endY - startY;
    let chordLength = Math.sqrt(dx * dx + dy * dy);

    if (chordLength === 0) {
      T3Util.Log("= S.ArcLine CalcRadiusAndCenter output:", result);
      result.valid = false;
      return result;
    }

    // Unit perpendicular and parallel components along the chord
    const unitPerp = -dy / chordLength;
    const unitPar = dx / chordLength;

    // Half chord length
    const halfChord = chordLength / 2;
    // Use curveAdjust as given (renaming variable y to adjust)
    const adjust = curveAdjust;

    // Calculate the absolute radius from chord and adjust
    let computedRadius = Math.abs((halfChord * halfChord + adjust * adjust) / (2 * adjust));

    let delta, offsetX, offsetY, centerX, centerY, actionX, actionY, tempS;

    if (computedRadius < adjust) {
      // Center lies inside the arc
      result.centerInside = true;
      // Delta is the distance from the chord midpoint to the circle center along the perpendicular
      delta = Utils2.sqrt(computedRadius * computedRadius - halfChord * halfChord);
      if (isReversed) {
        centerX = midX + delta * unitPerp;
        centerY = midY + delta * unitPar;
        actionX = centerX + computedRadius * unitPerp;
        actionY = centerY + computedRadius * unitPar;
      } else {
        centerX = midX - delta * unitPerp;
        centerY = midY - delta * unitPar;
        actionX = centerX - computedRadius * unitPerp;
        actionY = centerY - computedRadius * unitPar;
      }
    } else {
      // Center lies outside the arc
      // Adjust the distance along the chord perpendicular accordingly
      let s = computedRadius;
      s = isReversed ? s + adjust : s - adjust;
      offsetX = unitPerp * s;
      offsetY = unitPar * s;
      centerX = midX + offsetX;
      centerY = midY + offsetY;
      actionX = centerX - computedRadius * unitPerp;
      actionY = centerY - computedRadius * unitPar;
      if (isReversed) {
        // Overwrite center coordinates with recalculated offset when reversed
        tempS = computedRadius - adjust;
        centerX = midX + unitPerp * tempS;
        centerY = midY + unitPar * tempS;
      }
    }

    result.radius = computedRadius;
    result.centerX = centerX;
    result.centerY = centerY;
    result.actionX = actionX;
    result.actionY = actionY;
    result.valid = true;

    T3Util.Log("= S.ArcLine CalcRadiusAndCenter output:", result);
    return result;
  }

  GetLineChangeFrame() {
    T3Util.Log("= S.ArcLine GetLineChangeFrame input:", {
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint
    });

    let frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

    if (frame.width < OptConstant.Common.SegDefLen) {
      frame.width = OptConstant.Common.SegDefLen;
    }

    if (frame.height < OptConstant.Common.SegDefLen) {
      frame.height = OptConstant.Common.SegDefLen;
    }

    T3Util.Log("= S.ArcLine GetLineChangeFrame output:", frame);
    return frame;
  }

  CreateArcShapeForHops(svgDoc, isTouch) {
    T3Util.Log("= S.ArcLine CreateArcShapeForHops input:", { svgDoc, isTouch });

    if (this.flags & NvConstant.ObjFlags.NotVisible) {
      T3Util.Log("= S.ArcLine CreateArcShapeForHops output:", null);
      return null;
    }

    // Create container shape
    const container = svgDoc.CreateShape(OptConstant.CSType.ShapeContainer);

    // Create the primary polyline shape
    const shapePolyline = svgDoc.CreateShape(OptConstant.CSType.Polyline);
    shapePolyline.SetID(OptConstant.SVGElementClass.Shape);

    // Create the auxiliary slop polyline shape
    const slopPolyline = svgDoc.CreateShape(OptConstant.CSType.Polyline);
    slopPolyline.SetID(OptConstant.SVGElementClass.Slop);
    slopPolyline.ExcludeFromExport(true);

    // Calculate frame based on start and end points
    this.CalcFrame();
    const frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

    // Obtain style settings with token hook processing
    const styleRecord = this.StyleRecord;
    const hookedStyle = this.SVGTokenizerHook(styleRecord);
    const strokeColor = hookedStyle.Line.Paint.Color;
    const strokeWidth = hookedStyle.Line.Thickness;
    const strokeOpacity = hookedStyle.Line.Paint.Opacity;
    const strokePattern = hookedStyle.Line.LinePattern;

    // Set container dimensions and position
    container.SetSize(frame.width, frame.height);
    container.SetPos(frame.x, frame.y);

    // Generate polyline points and adjust for hops
    let polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true);
    const hopsInfo = T3Gv.opt.InsertHops(this, polyPoints, polyPoints.length);
    polyPoints = polyPoints.slice(0, hopsInfo.npts);

    // Configure the primary polyline shape
    shapePolyline.SetPoints(polyPoints);
    shapePolyline.SetFillColor('none');
    shapePolyline.SetStrokeColor(strokeColor);
    shapePolyline.SetStrokeOpacity(strokeOpacity);
    shapePolyline.SetStrokeWidth(strokeWidth);
    if (strokePattern !== 0) {
      shapePolyline.SetStrokePattern(strokePattern);
    }

    // Configure the auxiliary slop polyline shape
    slopPolyline.SetPoints(polyPoints);
    slopPolyline.SetStrokeColor('white');
    slopPolyline.SetFillColor('none');
    slopPolyline.SetOpacity(0);
    if (isTouch) {
      slopPolyline.SetEventBehavior(OptConstant.EventBehavior.HiddenOut);
    } else {
      slopPolyline.SetEventBehavior(OptConstant.EventBehavior.None);
    }
    slopPolyline.SetStrokeWidth(strokeWidth + OptConstant.Common.Slop);

    // Add elements to the container and apply styles/effects
    container.AddElement(shapePolyline);
    container.AddElement(slopPolyline);
    this.ApplyStyles(shapePolyline, hookedStyle);
    this.ApplyEffects(container, false, true);
    container.isShape = true;
    this.AddIcons(svgDoc, container);

    T3Util.Log("= S.ArcLine CreateArcShapeForHops output:", container);
    return container;
  }

  CreateShape(svgDoc, isTouch) {
    T3Util.Log("= S.ArcLine CreateShape input:", { svgDoc, isTouch });

    if (this.flags & NvConstant.ObjFlags.NotVisible) {
      T3Util.Log("= S.ArcLine CreateShape output:", null);
      return null;
    }

    // When there are no hops, generate a standard arc shape.
    if (0 === this.hoplist.nhops) {
      const container = svgDoc.CreateShape(OptConstant.CSType.ShapeContainer);
      const shapePath = svgDoc.CreateShape(OptConstant.CSType.Path);
      shapePath.SetID(OptConstant.SVGElementClass.Shape);

      const slopPath = svgDoc.CreateShape(OptConstant.CSType.Path);
      slopPath.SetID(OptConstant.SVGElementClass.Slop);
      slopPath.ExcludeFromExport(true);

      this.CalcFrame();
      const frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      const styleRecord = this.StyleRecord;
      const hookedStyle = this.SVGTokenizerHook(styleRecord);
      const strokeColor = hookedStyle.Line.Paint.Color;
      const strokeOpacity = hookedStyle.Line.Paint.Opacity;
      let strokeWidth = hookedStyle.Line.Thickness;
      if (strokeWidth > 0 && strokeWidth < 1) {
        strokeWidth = 1;
      }
      const strokePattern = hookedStyle.Line.LinePattern;
      const width = frame.width;
      const height = frame.height;

      container.SetSize(width, height);
      container.SetPos(frame.x, frame.y);

      shapePath.SetFillColor('none');
      shapePath.SetStrokeColor(strokeColor);
      shapePath.SetStrokeOpacity(strokeOpacity);
      shapePath.SetStrokeWidth(strokeWidth);
      if (strokePattern !== 0) {
        shapePath.SetStrokePattern(strokePattern);
      }

      slopPath.SetStrokeColor('white');
      slopPath.SetFillColor('none');
      slopPath.SetOpacity(0);
      if (isTouch) {
        slopPath.SetEventBehavior(OptConstant.EventBehavior.HiddenOut);
      } else {
        slopPath.SetEventBehavior(OptConstant.EventBehavior.None);
      }
      slopPath.SetStrokeWidth(strokeWidth + OptConstant.Common.Slop);

      container.AddElement(shapePath);
      container.AddElement(slopPath);
      this.ApplyStyles(shapePath, hookedStyle);
      this.ApplyEffects(container, false, true);
      container.isShape = true;
      this.AddIcons(svgDoc, container);

      T3Util.Log("= S.ArcLine CreateShape output:", container);
      return container;
    }

    // When hops are present, delegate to CreateArcShapeForHops.
    const arcShape = this.CreateArcShapeForHops(svgDoc, isTouch);
    T3Util.Log("= S.ArcLine CreateShape output:", arcShape);
    return arcShape;
  }

  PostCreateShapeCallback(svgDoc, svgContainer, callbackData, event) {
    T3Util.Log("= S.ArcLine PostCreateShapeCallback input:", { svgDoc, svgContainer, callbackData, event });

    if (this.hoplist.nhops === 0) {
      this.RegenerateGenerateArc(svgContainer);
    } else {
      this.RegenerateGenerateArcForHops(svgContainer);
    }

    if (this.DataID >= 0) {
      this.LMAddSVGTextObject(svgDoc, svgContainer);
    }

    this.UpdateDimensionLines(svgContainer);

    T3Util.Log("= S.ArcLine PostCreateShapeCallback output:", "Callback completed");
  }

  CreateActionTriggers(svgDoc, targetId, triggerType, compareId) {
    T3Util.Log("= S.ArcLine CreateActionTriggers input:", { svgDoc, targetId, triggerType, compareId });

    // Create a group container for the action triggers.
    let group = svgDoc.CreateShape(OptConstant.CSType.Group);

    // Calculate knob sizes based on document scale.
    let knobSize = OptConstant.Common.KnobSize;
    let reducedKnobSize = OptConstant.Common.RKnobSize;
    let allowKnob = true;
    let docScale = svgDoc.docInfo.docToScreenScale;
    if (svgDoc.docInfo.docScale <= 0.5) {
      docScale *= 2;
    }
    let adjustedKnobSize = knobSize / docScale;
    let adjustedReducedKnobSize = reducedKnobSize / docScale;

    if (this.objecttype === NvConstant.FNObjectTypes.FlWall) {
      adjustedKnobSize *= 2;
    }

    // Calculate surrounding rectangle.
    let rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    let width = rect.width + adjustedKnobSize;
    let height = rect.height + adjustedKnobSize;

    // Get target object to check for hook overrides.
    let targetObject = DataUtil.GetObjectPtr(targetId, false);

    // Adjust the rectangle boundaries.
    let adjustedRect = $.extend(true, {}, rect);
    adjustedRect.x -= adjustedKnobSize / 2;
    adjustedRect.y -= adjustedKnobSize / 2;
    adjustedRect.width += adjustedKnobSize;
    adjustedRect.height += adjustedKnobSize;

    // Prepare knob configuration.
    let knobConfig = {
      svgDoc: svgDoc,
      shapeType: OptConstant.CSType.Rect,
      knobSize: adjustedKnobSize,
      fillColor: 'black',
      fillOpacity: 1,
      strokeSize: 1,
      strokeColor: '#777777',
      cursorType: this.CalcCursorForSegment(this.StartPoint, this.EndPoint, false),
      locked: false,
      x: 0,
      y: 0,
      knobID: OptConstant.ActionTriggerType.LineStart
    };

    // When targetId is different from compareId, adjust colors.
    if (targetId !== compareId) {
      knobConfig.fillColor = 'white';
      knobConfig.strokeSize = 1;
      knobConfig.strokeColor = 'black';
      knobConfig.fillOpacity = 0;
    }

    // Set knob position for LINESTART.
    knobConfig.x = this.StartPoint.x - rect.x;
    knobConfig.y = this.StartPoint.y - rect.y;
    knobConfig.knobID = OptConstant.ActionTriggerType.LineStart;

    // If there is a hook for SED_KTL, override knob shape.
    if (targetObject && targetObject.hooks) {
      for (let i = 0; i < targetObject.hooks.length; i++) {
        if (targetObject.hooks[i].hookpt === OptConstant.HookPts.KTL) {
          knobConfig.shapeType = OptConstant.CSType.Oval;
          allowKnob = false;
          break;
        }
      }
    }
    if (this.objecttype === NvConstant.FNObjectTypes.FlWall) {
      knobConfig.shapeType = OptConstant.CSType.Image;
    }
    let knob = this.GenericKnob(knobConfig);
    if (this.objecttype === NvConstant.FNObjectTypes.FlWall && knob.SetURL) {
      knob.SetURL(
        knobConfig.cursorType === CursorConstant.CursorType.NWSE_RESIZE
          ? CursorConstant.Knob.Path + CursorConstant.Knob.DiagonLeft
          : CursorConstant.Knob.Path + CursorConstant.Knob.DiagonRight
      );
      knob.ExcludeFromExport(true);
    }
    group.AddElement(knob);

    // Configure knob for LINEEND.
    knobConfig.shapeType = OptConstant.CSType.Rect;
    knobConfig.x = this.EndPoint.x - rect.x;
    knobConfig.y = this.EndPoint.y - rect.y;
    knobConfig.knobID = OptConstant.ActionTriggerType.LineEnd;
    if (targetObject && targetObject.hooks) {
      for (let i = 0; i < targetObject.hooks.length; i++) {
        if (targetObject.hooks[i].hookpt === OptConstant.HookPts.KTR) {
          knobConfig.shapeType = OptConstant.CSType.Oval;
          allowKnob = false;
          break;
        }
      }
    }
    if (this.objecttype === NvConstant.FNObjectTypes.FlWall) {
      knobConfig.shapeType = OptConstant.CSType.Image;
    }
    knob = this.GenericKnob(knobConfig);
    if (this.objecttype === NvConstant.FNObjectTypes.FlWall && knob.SetURL) {
      knob.SetURL(
        knobConfig.cursorType === CursorConstant.CursorType.NWSE_RESIZE
          ? CursorConstant.Knob.Path + CursorConstant.Knob.DiagonLeft
          : CursorConstant.Knob.Path + CursorConstant.Knob.DiagonRight
      );
      knob.ExcludeFromExport(true);
    }
    group.AddElement(knob);

    // Configure knob for MODIFYSHAPE.
    knobConfig.shapeType = OptConstant.CSType.Rect;
    knobConfig.cursorType = this.CalcCursorForSegment(this.StartPoint, this.EndPoint, true);
    if (this.NoGrow()) {
      knobConfig.cursorType = CursorConstant.CursorType.DEFAULT;
    }
    let centerX = this.StartPoint.x;
    let centerY = this.StartPoint.y;
    let endX = this.EndPoint.x;
    let endY = this.EndPoint.y;
    let radiusInfo = this.CalcRadiusAndCenter(centerX, centerY, endX, endY, this.CurveAdjust, this.IsReversed);
    knobConfig.x = radiusInfo.actionX - rect.x;
    knobConfig.y = radiusInfo.actionY - rect.y;
    knobConfig.knobID = OptConstant.ActionTriggerType.ModifyShape;
    knob = this.GenericKnob(knobConfig);
    group.AddElement(knob);

    // Add ROTATE knob if allowed.
    if (T3Gv.opt.touchInitiated) {
      allowKnob = false;
    }
    if (allowKnob && !knobConfig.locked && !this.NoGrow()) {
      knobConfig.shapeType = OptConstant.CSType.Oval;
      let angle = Math.atan((this.EndPoint.y - this.StartPoint.y) / (this.EndPoint.x - this.StartPoint.x));
      if (angle < 0) {
        angle = -angle;
      }
      if (this.EndPoint.x >= this.StartPoint.x) {
        knobConfig.x = this.EndPoint.x - 2 * adjustedReducedKnobSize * Math.cos(angle) - rect.x;
        knobConfig.y = this.EndPoint.y - 2 * adjustedReducedKnobSize * Math.sin(angle) - rect.y;
      } else {
        knobConfig.x = this.StartPoint.x - 2 * adjustedReducedKnobSize * Math.cos(angle) - rect.x;
        knobConfig.y = this.StartPoint.y - 2 * adjustedReducedKnobSize * Math.sin(angle) - rect.y;
      }
      knobConfig.cursorType = CursorConstant.CursorType.ROTATE;
      knobConfig.knobID = OptConstant.ActionTriggerType.Rotate;
      knobConfig.fillColor = 'white';
      knobConfig.fillOpacity = 0.001;
      knobConfig.strokeSize = 1.5;
      knobConfig.strokeColor = 'black';
      knobConfig.knobSize = adjustedReducedKnobSize;
      knob = this.GenericKnob(knobConfig);
      group.AddElement(knob);
      knobConfig.knobSize = adjustedKnobSize;
    }

    // Create dimension adjustment knobs if standoff dimensions are enabled.
    if (this.Dimensions & NvConstant.DimensionFlags.Standoff && this.CanUseStandOffDimensionLines()) {
      let svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
      this.CreateDimensionAdjustmentKnobs(group, svgElement, knobConfig);
    }

    group.SetSize(width, height);
    group.SetPos(adjustedRect.x, adjustedRect.y);
    group.isShape = true;
    group.SetID(OptConstant.Common.Action + targetId);

    T3Util.Log("= S.ArcLine CreateActionTriggers output:", group);
    return group;
  }

  GetTextOnLineParams(e) {
    T3Util.Log("= S.ArcLine GetTextOnLineParams input:", { param: e });

    let result = {
      Frame: new Instance.Shape.Rect(),
      StartPoint: new Point(0, 0),
      EndPoint: new Point(0, 0)
    };

    // Set initial points and frame from the current object
    result.StartPoint.x = this.StartPoint.x;
    result.StartPoint.y = this.StartPoint.y;
    result.EndPoint.x = this.EndPoint.x;
    result.EndPoint.y = this.EndPoint.y;
    result.Frame = Utils2.Pt2Rect(result.StartPoint, result.EndPoint);

    // Adjust parameters based on TextAlign options
    switch (this.TextAlign) {
      case TextConstant.TextAlign.TopCenter:
      case TextConstant.TextAlign.Center:
      case TextConstant.TextAlign.BottomCenter: {
        const angle = T3Gv.opt.GetClockwiseAngleBetween2PointsInRadians(
          result.StartPoint,
          result.EndPoint
        );
        const points: Point[] = [];
        points.push(new Point(result.StartPoint.x, result.StartPoint.y));
        points.push(new Point(result.EndPoint.x, result.EndPoint.y));

        // Rotate points about the center of the frame
        Utils3.RotatePointsAboutCenter(result.Frame, angle, points);
        const radiusInfo = this.CalcRadiusAndCenter(
          points[0].x,
          points[0].y,
          points[1].x,
          points[1].y,
          this.CurveAdjust,
          this.IsReversed
        );

        // Set both points' y-coordinates to the calculated actionY
        points[0].y = radiusInfo.actionY;
        points[1].y = radiusInfo.actionY;

        // Rotate points back by the negative angle
        Utils3.RotatePointsAboutCenter(result.Frame, -angle, points);

        // Update result with the adjusted points
        result.StartPoint.x = points[0].x;
        result.StartPoint.y = points[0].y;
        result.EndPoint.x = points[1].x;
        result.EndPoint.y = points[1].y;
        break;
      }
      default:
        break;
    }

    T3Util.Log("= S.ArcLine GetTextOnLineParams output:", result);
    return result;
  }

  RegenerateGenerateArc(svgDoc) {
    T3Util.Log("= S.ArcLine RegenerateGenerateArc input:", { svgDoc });

    let startArrow = T3Gv.ArrowheadLookupTable[this.StartArrowID];
    let endArrow = T3Gv.ArrowheadLookupTable[this.EndArrowID];
    let arrowSize = T3Gv.ArrowheadSizeTable[this.ArrowSizeIndex];

    if (startArrow.id === 0) {
      startArrow = null;
    }
    if (endArrow.id === 0) {
      endArrow = null;
    }

    const shapeElement = svgDoc.GetElementById(OptConstant.SVGElementClass.Shape);
    const slopElement = svgDoc.GetElementById(OptConstant.SVGElementClass.Slop);

    if (shapeElement !== null && shapeElement.PathCreator !== undefined) {
      const pathCreator = shapeElement.PathCreator();

      // Start building the path.
      pathCreator.BeginPath();

      // Calculate rectangle bounds and relative positions.
      const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      const startRelX = this.StartPoint.x - rect.x;
      const startRelY = this.StartPoint.y - rect.y;
      const endRelX = this.EndPoint.x - rect.x;
      const endRelY = this.EndPoint.y - rect.y;

      // Calculate arc parameters.
      const arcParams = this.CalcRadiusAndCenter(
        startRelX,
        startRelY,
        endRelX,
        endRelY,
        this.CurveAdjust,
        this.IsReversed
      );

      // Build the arc path based on whether the center lies inside the arc.
      if (arcParams.centerInside) {
        pathCreator.MoveTo(endRelX, endRelY);
        pathCreator.ArcTo(startRelX, startRelY, arcParams.radius, arcParams.radius, 0, this.IsReversed, true, false);
      } else {
        pathCreator.MoveTo(startRelX, startRelY);
        pathCreator.ArcTo(endRelX, endRelY, arcParams.radius, arcParams.radius, 0, !this.IsReversed, false, false);
      }

      // Create path string and update the shape and slop elements.
      const pathData = pathCreator.ToString();
      shapeElement.SetPath(pathData);
      slopElement.SetPath(pathData);

      // Update the overall position and size.
      svgDoc.SetSize(rect.width, rect.height);
      svgDoc.SetPos(rect.x, rect.y);

      // Set arrowheads if defined.
      if (startArrow || endArrow) {
        if (arcParams.centerInside) {
          shapeElement.SetArrowheads(endArrow, arrowSize, startArrow, arrowSize, this.EndArrowDisp, this.StartArrowDisp);
          slopElement.SetArrowheads(endArrow, arrowSize, startArrow, arrowSize, this.EndArrowDisp, this.StartArrowDisp);
        } else {
          shapeElement.SetArrowheads(startArrow, arrowSize, endArrow, arrowSize, this.StartArrowDisp, this.EndArrowDisp);
          slopElement.SetArrowheads(startArrow, arrowSize, endArrow, arrowSize, this.StartArrowDisp, this.EndArrowDisp);
        }
      }
    }

    T3Util.Log("= S.ArcLine RegenerateGenerateArc output:", { pathData: shapeElement ? shapeElement.PathCreator ? shapeElement.PathCreator().ToString() : null : null });
  }

  RegenerateGenerateArcForHops(svgDoc) {
    T3Util.Log("= S.ArcLine RegenerateGenerateArcForHops input:", { svgDoc });

    // Retrieve arrowhead definitions and arrow size
    let startArrow = T3Gv.ArrowheadLookupTable[this.StartArrowID];
    let endArrow = T3Gv.ArrowheadLookupTable[this.EndArrowID];
    let arrowSize = T3Gv.ArrowheadSizeTable[this.ArrowSizeIndex];

    if (startArrow.id === 0) {
      startArrow = null;
    }
    if (endArrow.id === 0) {
      endArrow = null;
    }

    // Get primary shape and slop elements from the svgDoc
    const shapeElement = svgDoc.GetElementById(OptConstant.SVGElementClass.Shape);
    const slopElement = svgDoc.GetElementById(OptConstant.SVGElementClass.Slop);

    // Generate polyline points and adjust for hops
    let polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true);
    const hopsInfo = T3Gv.opt.InsertHops(this, polyPoints, polyPoints.length);
    polyPoints = polyPoints.slice(0, hopsInfo.npts);
    const numPoints = polyPoints.length;

    // Set the polyline points in the shape element
    shapeElement.SetPoints(polyPoints);

    // Calculate relative rectangle bounds and starting offsets
    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const startXRel = this.StartPoint.x - rect.x;
    const startYRel = this.StartPoint.y - rect.y;

    // Set the size and position for the svgDoc container
    svgDoc.SetSize(rect.width, rect.height);
    svgDoc.SetPos(rect.x, rect.y);

    // Update arrowheads if defined
    if (startArrow || endArrow) {
      // Compute squared distance from the starting point to the first polyline point
      const distFirst = (startXRel - polyPoints[0].x) * (startXRel - polyPoints[0].x) +
        (startYRel - polyPoints[0].y) * (startYRel - polyPoints[0].y);
      // Compute squared distance from the starting point to the last polyline point
      const distLast = (startXRel - polyPoints[numPoints - 1].x) * (startXRel - polyPoints[numPoints - 1].x) +
        (startYRel - polyPoints[numPoints - 1].y) * (startYRel - polyPoints[numPoints - 1].y);
      let isReversedArrow = false;
      if (distLast < distFirst) {
        isReversedArrow = true;
      }

      if (isReversedArrow) {
        // If the last point is closer, swap arrowhead assignment
        shapeElement.SetArrowheads(endArrow, arrowSize, startArrow, arrowSize, this.EndArrowDisp, this.StartArrowDisp);
        slopElement.SetArrowheads(endArrow, arrowSize, startArrow, arrowSize, this.EndArrowDisp, this.StartArrowDisp);
      } else {
        shapeElement.SetArrowheads(startArrow, arrowSize, endArrow, arrowSize, this.StartArrowDisp, this.EndArrowDisp);
        slopElement.SetArrowheads(startArrow, arrowSize, endArrow, arrowSize, this.StartArrowDisp, this.EndArrowDisp);
      }
    }

    T3Util.Log("= S.ArcLine RegenerateGenerateArcForHops output:", { polyPoints, rect });
  }

  AdjustLineStart(svgDoc, newStartX, newStartY) {
    T3Util.Log("= S.ArcLine AdjustLineStart input:", { svgDoc, newStartX, newStartY });

    // Save the current StartPoint values before update
    const originalStart = {
      x: this.StartPoint.x,
      y: this.StartPoint.y,
    };

    // Update the StartPoint with new values
    this.StartPoint.x = newStartX;
    this.StartPoint.y = newStartY;

    // Enforce minimum dimensions and recalc frame
    this.EnforceMinimum(true);
    this.CalcFrame();

    // If the frame is invalid, revert to original StartPoint and recalc frame
    if (this.r.x < 0 || this.r.y < 0) {
      this.StartPoint.x = originalStart.x;
      this.StartPoint.y = originalStart.y;
      this.CalcFrame();
    }

    // Regenerate the arc based on the updated StartPoint
    this.RegenerateGenerateArc(svgDoc);
    if (this.DataID !== -1) {
      this.LMResizeSVGTextObject(svgDoc, this, this.Frame);
    }

    // Create new selection attributes (side effect only)
    new SelectionAttr();

    // Calculate the euclidean distance (for logging purpose, not assigned)
    const deltaX = this.EndPoint.x - this.StartPoint.x;
    const deltaY = this.EndPoint.y - this.StartPoint.y;
    Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Update dimension lines and display coordinates
    this.UpdateDimensionLines(svgDoc);
    UIUtil.UpdateDisplayCoordinates(
      this.Frame,
      this.StartPoint,
      CursorConstant.CursorTypes.Grow
    );

    if (this.DataID !== -1) {
      this.LMResizeSVGTextObject(svgDoc, this, this.Frame);
    }

    T3Util.Log("= S.ArcLine AdjustLineStart output:", {
      updatedStartPoint: this.StartPoint,
      updatedFrame: this.Frame
    });
  }

  AdjustLineEnd(svgDoc: any, newEndX: number, newEndY: number, trigger: any) {
    T3Util.Log("= S.ArcLine AdjustLineEnd input:", { svgDoc, newEndX, newEndY, trigger });

    // Save original end point coordinates
    const originalEnd = { x: this.EndPoint.x, y: this.EndPoint.y };

    // Update EndPoint with new coordinates
    this.EndPoint.x = newEndX;
    this.EndPoint.y = newEndY;

    // Enforce minimum dimensions and recalculate frame
    this.EnforceMinimum(false);
    this.CalcFrame();

    // If the frame is invalid, revert to original coordinates and recalc frame
    if (this.r.x < 0 || this.r.y < 0) {
      this.EndPoint.x = originalEnd.x;
      this.EndPoint.y = originalEnd.y;
      this.CalcFrame();
    }

    // Regenerate the arc if a valid svgDoc is provided
    if (svgDoc) {
      this.RegenerateGenerateArc(svgDoc);
      if (this.DataID !== -1) {
        this.LMResizeSVGTextObject(svgDoc, this, this.Frame);
      }
      new SelectionAttr();

      const deltaX = this.EndPoint.x - this.StartPoint.x;
      const deltaY = this.EndPoint.y - this.StartPoint.y;
      Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);

      this.UpdateDimensionLines(svgDoc);
      UIUtil.UpdateDisplayCoordinates(
        this.Frame,
        this.EndPoint,
        CursorConstant.CursorTypes.Grow,
        this
      );
      if (this.DataID !== -1) {
        this.LMResizeSVGTextObject(svgDoc, this, this.Frame);
      }
    }

    T3Util.Log("= S.ArcLine AdjustLineEnd output:", { updatedEndPoint: this.EndPoint, frame: this.Frame });
  }

  Flip(flipFlag: number) {
    T3Util.Log("= S.ArcLine Flip input:", { flipFlag });

    let swapped = false;
    const temp: any = {};

    // Save a deep copy of the current object for backup
    T3Gv.opt.ob = Utils1.DeepCopy(this);

    // Flip vertically if flag is set
    if (flipFlag & OptConstant.ExtraFlags.FlipVert) {
      temp.y = this.StartPoint.y;
      this.StartPoint.y = this.EndPoint.y;
      this.EndPoint.y = temp.y;
      swapped = true;
      T3Util.Log("= S.ArcLine Flip: Performed vertical flip.");
    }

    // Flip horizontally if flag is set
    if (flipFlag & OptConstant.ExtraFlags.FlipHoriz) {
      temp.x = this.StartPoint.x;
      this.StartPoint.x = this.EndPoint.x;
      this.EndPoint.x = temp.x;
      swapped = true;
      T3Util.Log("= S.ArcLine Flip: Performed horizontal flip.");
    }

    if (swapped) {
      this.IsReversed = !this.IsReversed;
      T3Util.Log("= S.ArcLine Flip: Toggled IsReversed to", this.IsReversed);

      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
      if (svgElement) {
        this.UpdateDimensionLines(svgElement);
        if (this.DataID !== -1) {
          this.LMResizeSVGTextObject(svgElement, this, this.Frame);
        }
      }

      if (T3Gv.opt.ob.Frame) {
        HookUtil.MaintainLink(
          this.BlockID,
          this,
          T3Gv.opt.ob,
          OptConstant.ActionTriggerType.Rotate
        );
      }
      OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.SED_L_MOVE);
    }

    // Reset the backup object
    T3Gv.opt.ob = {};

    T3Util.Log("= S.ArcLine Flip output:", {
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint,
      IsReversed: this.IsReversed,
    });
  }

  ModifyShape(svgDoc: any, x: number, y: number, trigger: number, additional?: any): void {
    T3Util.Log("= S.ArcLine ModifyShape input:", { svgDoc, x, y, trigger, additional });

    // Determine the side based on the current start and end points and the provided coordinates.
    let side = this.FindSide(
      this.StartPoint.x,
      this.StartPoint.y,
      this.EndPoint.x,
      this.EndPoint.y,
      x,
      y
    );

    // If trigger is -1, use the original line side.
    if (trigger === -1) {
      side = this.OriginalLineSide;
    }

    // If the detected side differs from the original, update and possibly reverse the arc.
    if (side !== this.OriginalLineSide) {
      if (this.OriginalLineSide !== 0) {
        this.IsReversed = !this.IsReversed;
      }
      this.OriginalLineSide = side;
    }

    // Calculate the difference from the midpoint to the input point.
    const midX = this.StartPoint.x + (this.EndPoint.x - this.StartPoint.x) / 2;
    const midY = this.StartPoint.y + (this.EndPoint.y - this.StartPoint.y) / 2;
    const deltaX = midX - x;
    const deltaY = midY - y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const diff = distance - this.OriginalCenterPointDistance;

    // Store the current CurveAdjust value for possible rollback.
    const previousCurveAdjust = this.CurveAdjust;
    const originalCurveAdjust = this.OriginalCurveAdjust;

    // Adjust CurveAdjust based on whether the point is closer or further from the original center distance.
    if (distance < this.OriginalCenterPointDistance) {
      this.CurveAdjust = originalCurveAdjust - diff;
    } else {
      this.CurveAdjust = originalCurveAdjust + diff;
    }

    // Enforce minimum and maximum bounds for CurveAdjust.
    if (this.CurveAdjust < 1) {
      this.CurveAdjust = 1;
    } else if (this.CurveAdjust > 500) {
      this.CurveAdjust = 500;
    }

    // Recalculate frame based on the new CurveAdjust.
    this.CalcFrame();

    // If trigger is not -1 and the frame is invalid, revert to the previous CurveAdjust.
    if (trigger !== -1 && (this.r.x < 0 || this.r.y < 0)) {
      this.CurveAdjust = previousCurveAdjust;
      this.CalcFrame();
    }

    // If selection dimensions demand, mark the object as dirty.
    if ((this.Dimensions & NvConstant.DimensionFlags.Select) ||
      (this.Dimensions & NvConstant.DimensionFlags.Always)) {
      DataUtil.AddToDirtyList(this.BlockID);
    }

    // Regenerate the arc shape and resize the SVG text object if applicable.
    if (svgDoc) {
      this.RegenerateGenerateArc(svgDoc);
      if (this.DataID !== -1) {
        this.LMResizeSVGTextObject(svgDoc, this, this.Frame);
      }
    }

    T3Util.Log("= S.ArcLine ModifyShape output:", { CurveAdjust: this.CurveAdjust, Frame: this.Frame });
  }

  FindSide(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    testX: number,
    testY: number
  ): number {
    T3Util.Log("= S.ArcLine FindSide input:", {
      startX,
      startY,
      endX,
      endY,
      testX,
      testY
    });

    let side = 0;

    // Handle vertical line (startX == endX)
    if (startX === endX) {
      if (testX < startX) {
        side = endY > startY ? 1 : -1;
      } else if (testX > startX) {
        side = endY > startY ? -1 : 1;
      } else {
        side = 0;
      }
      T3Util.Log("= S.ArcLine FindSide output:", side);
      return side;
    }

    // Handle horizontal line (startY == endY)
    if (startY === endY) {
      if (testY < startY) {
        side = endX > startX ? 1 : -1;
      } else if (testY > startY) {
        side = endX > startX ? -1 : 1;
      } else {
        side = 0;
      }
      T3Util.Log("= S.ArcLine FindSide output:", side);
      return side;
    }

    // For non-degenerate lines, compute slope and the expected Y at testX
    const slope = (endY - startY) / (endX - startX);
    const expectedY = slope * (testX - startX) + startY;

    if (testY > expectedY) {
      side = endX > startX ? 1 : -1;
    } else if (testY < expectedY) {
      side = endX > startX ? -1 : 1;
    } else {
      side = 0;
    }

    T3Util.Log("= S.ArcLine FindSide output:", side);
    return side;
  }

  BeforeModifyShape(mouseX: number, mouseY: number, extra: any) {
    T3Util.Log("= S.ArcLine BeforeModifyShape input:", { mouseX, mouseY, extra });

    // Store the original curve adjustment value
    this.OriginalCurveAdjust = this.CurveAdjust;

    // Calculate the midpoint of the line
    const midX = this.StartPoint.x + (this.EndPoint.x - this.StartPoint.x) / 2;
    const midY = this.StartPoint.y + (this.EndPoint.y - this.StartPoint.y) / 2;

    // Calculate the distance from the midpoint to the input point (mouse coordinates)
    const deltaX = midX - mouseX;
    const deltaY = midY - mouseY;
    const centerDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Save the calculated center distance
    this.OriginalCenterPointDistance = centerDistance;

    // Determine the original line side based on the current CurveAdjust
    this.OriginalLineSide =
      this.CurveAdjust <= 1
        ? 0
        : this.FindSide(
          this.StartPoint.x,
          this.StartPoint.y,
          this.EndPoint.x,
          this.EndPoint.y,
          mouseX,
          mouseY
        );

    T3Util.Log("= S.ArcLine BeforeModifyShape output:", {
      OriginalCurveAdjust: this.OriginalCurveAdjust,
      OriginalCenterPointDistance: this.OriginalCenterPointDistance,
      OriginalLineSide: this.OriginalLineSide,
    });
  }

  StartNewObjectDrawTrackCommon(drawX: number, drawY: number, extra: any) {
    T3Util.Log("= S.ArcLine StartNewObjectDrawTrackCommon input:", { drawX, drawY, extra });

    const startX = T3Gv.opt.actionStartX;
    const startY = T3Gv.opt.actionStartY;

    const deltaX = drawX - startX;
    const deltaY = drawY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Extend the action bounding box (side effect, if required)
    $.extend(true, {}, T3Gv.opt.actionBBox);

    let newCurveAdjust = distance / 10;
    if (newCurveAdjust < 1) {
      newCurveAdjust = 1;
    } else if (newCurveAdjust > 500) {
      newCurveAdjust = 500;
    }
    this.CurveAdjust = newCurveAdjust;

    // Determine if the arc should be reversed based on the mouse position
    this.IsReversed = !(drawX >= startX);

    // Update the end point of the line using the new parameters
    this.AdjustLineEnd(
      T3Gv.opt.actionSvgObject,
      drawX,
      drawY,
      OptConstant.ActionTriggerType.LineEnd
    );

    T3Util.Log("= S.ArcLine StartNewObjectDrawTrackCommon output:", { CurveAdjust: this.CurveAdjust, IsReversed: this.IsReversed });
  }

  GetPolyPoints(
    numPoints: number,
    skipOffset: boolean,
    useSuper?: boolean,
    extraParam1?: any,
    extraParam2?: any
  ): Point[] {
    T3Util.Log("= S.ArcLine GetPolyPoints input:", {
      numPoints,
      skipOffset,
      useSuper,
      extraParam1,
      extraParam2
    });

    let polyPoints: Point[] = [];
    let rotatedPoints: Point[] = [];
    let center: { x: number; y: number } = { x: 0, y: 0 };

    // If using superclass implementation, delegate.
    if (useSuper) {
      polyPoints = super.GetPolyPoints(numPoints, skipOffset, useSuper, extraParam1, extraParam2);
      T3Util.Log("= S.ArcLine GetPolyPoints output (using super):", polyPoints);
      return polyPoints;
    }

    // Compute the bounding rectangle for the StartPoint and EndPoint.
    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const startXRel = this.StartPoint.x - rect.x;
    const startYRel = this.StartPoint.y - rect.y;
    const endXRel = this.EndPoint.x - rect.x;
    const endYRel = this.EndPoint.y - rect.y;

    // Calculate differences and distance.
    const deltaX = endXRel - startXRel;
    const deltaY = endYRel - startYRel;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    let ratio = distance > 0 ? deltaX / distance : 0;
    if (Math.abs(ratio) < 0.0001) {
      ratio = 0;
    }
    let deltaYAdjusted = Math.abs(deltaY) < 0.0001 ? 0 : deltaY;

    // Compute the rotation angle.
    let angle = Math.asin(ratio);
    if (deltaYAdjusted > 0 || deltaYAdjusted === 0) {
      angle = -angle;
    }

    // Calculate arc information (radius and center).
    const arcInfo = this.CalcRadiusAndCenter(
      startXRel,
      startYRel,
      endXRel,
      endYRel,
      this.CurveAdjust,
      this.IsReversed
    );
    center.x = arcInfo.centerX;
    center.y = arcInfo.centerY;

    // Build a temporary points list from start and end.
    const tempPoints: Point[] = [];
    tempPoints.push(new Point(startXRel, startYRel));
    tempPoints.push(new Point(endXRel, endYRel));

    // Rotate the temporary points about the computed center.
    Utils3.RotatePointsAboutPoint(center, angle, tempPoints);

    // Determine the lower and upper Y values.
    let lowerY: number, upperY: number;
    if (tempPoints[0].y > tempPoints[1].y && !this.FromPolygon) {
      lowerY = tempPoints[1].y;
      upperY = tempPoints[0].y;
    } else {
      lowerY = tempPoints[0].y;
      upperY = tempPoints[1].y;
    }

    // Generate arc polyline points.
    polyPoints = T3Gv.opt.ArcToPoly(
      numPoints - 1,
      center,
      arcInfo.radius,
      lowerY,
      upperY,
      tempPoints[0].x,
      this.IsReversed,
      arcInfo.centerInside
    );

    // Append an extra point at the upper Y value based on the first point.
    polyPoints.push(new Point(polyPoints[0].x, upperY));

    // Rotate the polyline points back.
    Utils3.RotatePointsAboutPoint(center, -angle, polyPoints);

    // If offset is not skipped, adjust points back to the original coordinate system.
    if (!skipOffset) {
      for (let idx = 0; idx < polyPoints.length; idx++) {
        polyPoints[idx].x += rect.x;
        polyPoints[idx].y += rect.y;
      }
    }

    T3Util.Log("= S.ArcLine GetPolyPoints output:", polyPoints);
    return polyPoints;
  }

  GetConnectLine() {
    T3Util.Log("= S.ArcLine GetConnectLine input:", {
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint,
      CurveAdjust: this.CurveAdjust,
      IsReversed: this.IsReversed
    });

    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const startRelX = this.StartPoint.x - rect.x;
    const startRelY = this.StartPoint.y - rect.y;
    const endRelX = this.EndPoint.x - rect.x;
    const endRelY = this.EndPoint.y - rect.y;

    const result = {
      frame: {},
      length: 0,
      startpt: { x: 0, y: 0 },
      endpt: { x: 0, y: 0 },
      center: {}
    };

    const calcResult = this.CalcRadiusAndCenter(
      startRelX,
      startRelY,
      endRelX,
      endRelY,
      this.CurveAdjust,
      this.IsReversed
    );

    if (calcResult.centerInside) {
      // Calculate chord vector components and length
      const deltaX = endRelX - startRelX;
      const deltaY = endRelY - startRelY;
      let chordLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      let unitX = chordLength > 0 ? deltaX / chordLength : 0;
      if (Math.abs(unitX) < 0.0001) {
        unitX = 0;
      }
      let adjustedDeltaY = Math.abs(deltaY) < 0.0001 ? 0 : deltaY;

      // Compute rotation angle based on the chord direction
      let angle = Math.asin(unitX);
      if (adjustedDeltaY >= 0) {
        angle = -angle;
      }

      // Define the center for rotation
      const centerPoint = { x: calcResult.centerX, y: calcResult.centerY };

      // Create a copy of the start and end points (relative to rect)
      const points: Point[] = [];
      points.push(new Point(startRelX, startRelY));
      points.push(new Point(endRelX, endRelY));

      // Rotate the points about the calculated center
      Utils3.RotatePointsAboutPoint(centerPoint, angle, points);

      // Adjust points vertically based on the arc's radius
      let diffY: number;
      let adjustAmount: number;
      if (points[0].y > points[1].y) {
        diffY = points[0].y - points[1].y;
        adjustAmount = calcResult.radius - diffY / 2;
        points[0].y += adjustAmount;
        points[1].y -= adjustAmount;
      } else {
        diffY = points[1].y - points[0].y;
        adjustAmount = calcResult.radius - diffY / 2;
        points[1].y += adjustAmount;
        points[0].y -= adjustAmount;
      }

      // Rotate the points back to the original orientation
      Utils3.RotatePointsAboutPoint(centerPoint, -angle, points);

      // Offset points back to the document coordinate system
      points[0].x += rect.x;
      points[0].y += rect.y;
      points[1].x += rect.x;
      points[1].y += rect.y;

      // Compute the frame and length of the adjusted arc chord
      const computedFrame = Utils2.Pt2Rect(points[0], points[1]);
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      const computedLength = Math.sqrt(dx * dx + dy * dy);

      result.frame = computedFrame;
      result.length = computedLength;
      result.startpt = { x: points[0].x, y: points[0].y };
      result.endpt = { x: points[1].x, y: points[1].y };
      result.center = { x: centerPoint.x + rect.x, y: centerPoint.y + rect.y };

      T3Util.Log("= S.ArcLine GetConnectLine intermediate values:", {
        rotatedPoints: points,
        computedFrame,
        computedLength,
        resultCenter: result.center
      });

      T3Util.Log("= S.ArcLine GetConnectLine output:", result);
      return result;
    } else {
      T3Util.Log("= S.ArcLine GetConnectLine output:", null);
      return null;
    }
  }

  GetTargetPoints(hookElement, hookFlags, targetId) {
    T3Util.Log("= S.ArcLine GetTargetPoints input:", { hookElement, hookFlags, targetId });

    // Initialize the target point with default values.
    const targetPoints = [{ x: 0, y: 0 }];
    let chordResult: any;
    let startPt = { x: 0, y: 0 };
    let endPt = { x: 0, y: 0 };
    const hookPts = OptConstant.HookPts;

    // If targetId is valid and the target object is a shape,
    // and if the hook id is one of the central hooks, delegate to the base implementation.
    if (
      targetId != null &&
      targetId >= 0 &&
      DataUtil.GetObjectPtr(targetId, false).DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape
    ) {
      switch (hookElement.id) {
        case hookPts.KTC:
        case hookPts.KBC:
        case hookPts.KRC:
        case hookPts.KLC:
          const baseTargetPoints = super.GetTargetPoints(hookElement, hookFlags, targetId);
          T3Util.Log("= S.ArcLine GetTargetPoints output:", baseTargetPoints);
          return baseTargetPoints;
      }
    }

    // Determine start and end points from the connect line if available.
    const connectLine = this.GetConnectLine();
    if (connectLine) {
      startPt = connectLine.startpt;
      endPt = connectLine.endpt;
    } else {
      startPt = this.StartPoint;
      endPt = this.EndPoint;
    }

    // Calculate horizontal difference; ensure non-zero to avoid division by zero.
    let deltaX = this.EndPoint.x - this.StartPoint.x;
    if (Math.abs(deltaX) < 1) {
      deltaX = 1;
    }
    const diffY = this.EndPoint.y - this.StartPoint.y;
    const slope = diffY / deltaX;

    let offsetX, offsetY;
    // Choose chord calculation based on slope or specific hook flag.
    if (Math.abs(slope) > 1 || (hookFlags & NvConstant.HookFlags.LcHOnly)) {
      // Calculate chord and determine offsets.
      chordResult = T3Gv.opt.ArcToChord(startPt, endPt, hookElement, connectLine, this);
      offsetY = chordResult.y - startPt.y;
      offsetX = chordResult.x - startPt.x;
    } else {
      chordResult = T3Gv.opt.ArcToChord(startPt, endPt, hookElement, connectLine, this);
      offsetX = chordResult.x - startPt.x;
      offsetY = chordResult.y - startPt.y;
    }

    // Determine segmentation differences.
    const segDeltaY = endPt.y - startPt.y;
    const segDeltaX = endPt.x - startPt.x;

    // Calculate the target point coordinates scaled to a standard dimension.
    targetPoints[0].y =
      Math.abs(segDeltaY) > 1
        ? (offsetY / segDeltaY) * OptConstant.Common.DimMax
        : OptConstant.Common.DimMax;
    targetPoints[0].x =
      Math.abs(segDeltaX) > 1
        ? (offsetX / segDeltaX) * OptConstant.Common.DimMax
        : OptConstant.Common.DimMax;

    // Clamp the values between 0 and the defined dimension.
    if (targetPoints[0].x > OptConstant.Common.DimMax) {
      targetPoints[0].x = OptConstant.Common.DimMax;
    }
    if (targetPoints[0].y > OptConstant.Common.DimMax) {
      targetPoints[0].y = OptConstant.Common.DimMax;
    }
    if (targetPoints[0].x < 0) {
      targetPoints[0].x = 0;
    }
    if (targetPoints[0].y < 0) {
      targetPoints[0].y = 0;
    }

    // Adjust x coordinate for rounding if a connect line exists.
    if (connectLine) {
      const roundedFlag = (2 * Math.round(chordResult["x"] / 2)) !== chordResult["x"];
      targetPoints[0].x = 2 * Math.round((targetPoints[0].x + 0.5) / 2);
      if (roundedFlag) {
        targetPoints[0].x--;
      }
    }

    T3Util.Log("= S.ArcLine GetTargetPoints output:", targetPoints);
    return targetPoints;
  }

  GetPerimPts(event: any, hooks: any[], param3: any, param4: any, param5: any, targetId: any): Point[] {
    T3Util.Log("= S.ArcLine GetPerimPts input:", { event, hooks, param3, param4, param5, targetId });

    let resultPoints: Point[] = [];
    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const startXRel = this.StartPoint.x - rect.x;
    const startYRel = this.StartPoint.y - rect.y;
    const endXRel = this.EndPoint.x - rect.x;
    const endYRel = this.EndPoint.y - rect.y;

    // If two hooks are provided and they match SED_KTL and SED_KTR, return start and end points directly.
    if (
      hooks &&
      hooks.length === 2 &&
      hooks[0].id && hooks[0].id === OptConstant.HookPts.KTL &&
      hooks[1].id && hooks[1].id === OptConstant.HookPts.KTR
    ) {
      let ptStart = new Point(this.StartPoint.x, this.StartPoint.y);
      ptStart.id = hooks[0].id;
      let ptEnd = new Point(this.EndPoint.x, this.EndPoint.y);
      ptEnd.id = hooks[1].id;
      resultPoints.push(ptStart, ptEnd);
      T3Util.Log("= S.ArcLine GetPerimPts output (direct start/end):", resultPoints);
      return resultPoints;
    }

    // Retrieve the target object, then delegate if it is of a specific type.
    const refObject = DataUtil.GetObjectPtr(targetId, false);
    if (refObject && refObject.objecttype === NvConstant.FNObjectTypes.Multiplicity) {
      resultPoints = super.GetPerimPts(event, hooks, param3, param4, param5, targetId);
      T3Util.Log("= S.ArcLine GetPerimPts output (Multiplicity):", resultPoints);
      return resultPoints;
    }
    if (refObject && refObject.objecttype === NvConstant.FNObjectTypes.ExtraTextLable && hooks.length === 1) {
      resultPoints = super.GetPerimPts(event, hooks, param3, param4, param5, targetId);
      T3Util.Log("= S.ArcLine GetPerimPts output (ExtraTextLabel):", resultPoints);
      return resultPoints;
    }

    // Calculate the arc parameters using relative positions.
    const arcParams = this.CalcRadiusAndCenter(startXRel, startYRel, endXRel, endYRel, this.CurveAdjust, this.IsReversed);
    const arcCenter = {
      x: arcParams.centerX + rect.x,
      y: arcParams.centerY + rect.y
    };

    let isReversedFlag = this.IsReversed;
    const basePerimPts: Point[] = super.GetPerimPts(event, hooks, param3, param4, param5, targetId);
    let chordStart: Point, chordEnd: Point;
    let adjustFlag = false;
    const connectLine = this.GetConnectLine();
    if (connectLine) {
      chordStart = connectLine.startpt;
      chordEnd = connectLine.endpt;
      // Determine adjust flag based on the hook's x-coordinate rounding (if available).
      adjustFlag = (2 * Math.round(hooks[0].x / 2)) !== hooks[0].x;
      isReversedFlag = false;
    } else {
      chordStart = this.StartPoint;
      chordEnd = this.EndPoint;
    }

    // Convert each base perimeter point (chord point) to an arc point.
    for (let i = 0; i < basePerimPts.length; i++) {
      resultPoints[i] = T3Gv.opt.ChordToArc(
        chordStart,
        chordEnd,
        arcCenter,
        arcParams.radius,
        isReversedFlag,
        adjustFlag,
        arcParams.centerInside,
        basePerimPts[i]
      );
      if (basePerimPts[i].id != null) {
        resultPoints[i].id = basePerimPts[i].id;
      }
    }

    T3Util.Log("= S.ArcLine GetPerimPts output:", resultPoints);
    return resultPoints;
  }

  MaintainPoint(event: any, targetId: any, maintainDistParam: any, drawingObject: any, extraParam: any): any {
    T3Util.Log("= S.ArcLine MaintainPoint input:", { event, targetId, maintainDistParam, drawingObject, extraParam });

    let hookFound = false;
    let hookPoint: any = {};
    let newDrawingObject: any = {};

    switch (drawingObject.DrawingObjectBaseClass) {
      case OptConstant.DrawObjectBaseClass.Line:
        switch (drawingObject.LineType) {
          case OptConstant.LineType.SEGLINE:
          case OptConstant.LineType.ARCSEGLINE:
          case OptConstant.LineType.POLYLINE:
            for (let hookIndex = 0; hookIndex < drawingObject.hooks.length; hookIndex++) {
              if (drawingObject.hooks[hookIndex].targetid === targetId) {
                drawingObject.HookToPoint(drawingObject.hooks[hookIndex].hookpt, hookPoint);
                hookFound = true;
                break;
              }
            }
            if (!hookFound) {
              T3Util.Log("= S.ArcLine MaintainPoint output:", true);
              return true;
            }
            newDrawingObject = Utils1.DeepCopy(drawingObject);
            Utils2.CopyRect(newDrawingObject.Frame, hookPoint);
            newDrawingObject.StartPoint.x = hookPoint.x;
            newDrawingObject.StartPoint.y = hookPoint.y;
            newDrawingObject.EndPoint.x = hookPoint.x + hookPoint.width;
            newDrawingObject.EndPoint.y = hookPoint.y + hookPoint.height;
            T3Util.Log("= S.ArcLine MaintainPoint output:", newDrawingObject);
            return newDrawingObject;
        }
        if (T3Gv.opt.ArcCheckPoint(this, event)) {
          T3Util.Log("= S.ArcLine MaintainPoint output:", true);
          return true;
        }
        if (T3Gv.opt.ArcIntersect(this, drawingObject, event)) {
          T3Util.Log("= S.ArcLine MaintainPoint output:", true);
          return true;
        }
        T3Gv.opt.LinesMaintainDist(this, maintainDistParam, extraParam, event);
        break;

      case OptConstant.DrawObjectBaseClass.Shape:
        T3Gv.opt.LinesMaintainDist(this, maintainDistParam, extraParam, event);
        break;
    }

    T3Util.Log("= S.ArcLine MaintainPoint output:", true);
    return true;
  }
}

export default ArcLine
