

import BaseLine from './S.BaseLine'
import Utils1 from '../Util/Utils1';
import Utils2 from "../Util/Utils2";
import Utils3 from "../Util/Utils3";
import T3Gv from '../Data/T3Gv'
import NvConstant from '../Data/Constant/NvConstant'
import SelectionAttr from '../Model/SelectionAttr'
import SegLine from '../Model/SegLine';
import Point from '../Model/Point'
import $ from 'jquery'
import ShapeUtil from '../Opt/Shape/ShapeUtil'
import Instance from '../Data/Instance/Instance';
import DSConstant from '../Opt/DS/DSConstant';
import OptConstant from '../Data/Constant/OptConstant';
import CursorConstant from '../Data/Constant/CursorConstant';
import T3Util from '../Util/T3Util';
import TextConstant from '../Data/Constant/TextConstant';
import DataUtil from '../Opt/Data/DataUtil';
import UIUtil from '../Opt/UI/UIUtil';
import OptCMUtil from '../Opt/Opt/OptCMUtil';
import DrawUtil from '../Opt/Opt/DrawUtil';
import HookUtil from '../Opt/Opt/HookUtil';

/**
 * A specialized line class that implements segmented (polyline) functionality with advanced features.
 *
 * @class SegmentedLine
 * @extends BaseLine
 * @description
 * The SegmentedLine class represents a multi-segment line (polyline) component in the T3000 HVAC
 * visualization system. Segmented lines allow for complex routing patterns with various bending
 * configurations, supporting layouts in horizontal, vertical, and mixed orientations.
 *
 * Key features include:
 * - Flexible multi-segment routing with automatic recalculation and optimization
 * - Support for curved corners with adjustable radius parameters
 * - Automatic connection to other components via hook points with intelligent directional awareness
 * - Arrowhead styling options at start and end points
 * - Text positioning and alignment along any segment of the line
 * - Advanced layout features including hop-over points for line crossings
 * - Support for auto-insertion of components along the line
 *
 * @example
 * // Create a new segmented line with start and end points
 * const options = {
 *   StartPoint: { x: 100, y: 100 },
 *   EndPoint: { x: 300, y: 200 }
 * };
 * const segmentedLine = new SegmentedLine(options);
 */
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

  /**
   * Initializes a new SegmentedLine instance
   *
   * @param options - Configuration options for the segmented line
   * @description
   * Creates a segmented line with customizable properties including:
   * - Start and end points
   * - Segmentation details for complex routing
   * - Arrow styling properties
   * - Text direction
   * The constructor initializes the line and calculates its frame dimensions.
   */
  constructor(options: any) {
    T3Util.Log("= S.SegmentedLine: constructor input", options);

    const configOptions = options || {};
    configOptions.LineType = configOptions.LineType || OptConstant.LineType.SEGLINE;

    super(configOptions);

    // Initialize segmentation line information
    this.segl = configOptions.segl || new SegLine();
    if (configOptions.curveparam != null) {
      this.segl.curveparam = configOptions.curveparam;
    }

    // Set up start and end points with defaults
    this.StartPoint = configOptions.StartPoint || { x: 0, y: 0 };
    this.EndPoint = configOptions.EndPoint || { x: 0, y: 0 };

    // Format segmented line and calculate frame based on end point
    this.SegLFormat(this.EndPoint, OptConstant.ActionTriggerType.LineEnd, 0);
    this.CalcFrame();

    // Initialize hoplist and arrowhead data
    this.hoplist = configOptions.hoplist || { nhops: 0, hops: [] };
    this.ArrowheadData = configOptions.ArrowheadData || [];

    // Set up arrow properties
    this.StartArrowID = configOptions.StartArrowID || 0;
    this.EndArrowID = configOptions.EndArrowID || 0;
    this.StartArrowDisp = configOptions.StartArrowDisp || false;
    this.EndArrowDisp = configOptions.EndArrowDisp || false;
    this.ArrowSizeIndex = configOptions.ArrowSizeIndex || 0;
    this.TextDirection = configOptions.TextDirection || false;

    T3Util.Log("= S.SegmentedLine: constructor output", {
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

  /**
   * Creates the SVG representation of the segmented line
   *
   * @param svgDoc - The SVG document where the shape will be created
   * @param isHidden - Whether the shape should be hidden
   * @returns The created SVG container element or null if the shape is not visible
   * @description
   * Creates a polyline shape with appropriate styling according to the segmented line's properties.
   * Includes both the visible line and an invisible "slop" line for easier interaction.
   * Handles application of styles, hop points, and effects to the shape.
   */
  CreateShape(svgDoc, isHidden) {
    T3Util.Log("= S.SegmentedLine: CreateShape input", { svgDoc, isHidden });
    if (this.flags & NvConstant.ObjFlags.NotVisible) return null;

    let linePoints = [];
    const containerShape = svgDoc.CreateShape(OptConstant.CSType.ShapeContainer);
    const visibleLineShape = svgDoc.CreateShape(OptConstant.CSType.Polyline);
    visibleLineShape.SetID(OptConstant.SVGElementClass.Shape);

    const interactionLineShape = svgDoc.CreateShape(OptConstant.CSType.Polyline);
    interactionLineShape.SetID(OptConstant.SVGElementClass.Slop);
    interactionLineShape.ExcludeFromExport(true);

    this.CalcFrame();
    const frameRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

    // Obtain and format style record details
    let styleRecord = this.StyleRecord;
    styleRecord = this.SVGTokenizerHook(styleRecord);
    const strokeColor = styleRecord.Line.Paint.Color;
    let strokeThickness = styleRecord.Line.Thickness;
    const strokeOpacity = styleRecord.Line.Paint.Opacity;
    const strokePattern = styleRecord.Line.LinePattern;

    // Ensure minimum stroke thickness
    if (strokeThickness > 0 && strokeThickness < 1) {
      strokeThickness = 1;
    }

    // Ensure minimum dimensions based on stroke thickness
    let frameWidth = frameRect.width;
    let frameHeight = frameRect.height;
    if (frameWidth < strokeThickness) {
      frameWidth = strokeThickness;
    }
    if (frameHeight < strokeThickness) {
      frameHeight = strokeThickness;
    }

    containerShape.SetSize(frameWidth, frameHeight);
    containerShape.SetPos(frameRect.x, frameRect.y);
    visibleLineShape.SetSize(frameWidth, frameHeight);

    // Get line points and process hop points if needed
    linePoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, false, false, null);
    if (this.hoplist.nhops !== 0) {
      const hopsResult = T3Gv.opt.InsertHops(this, linePoints, linePoints.length);
      linePoints = linePoints.slice(0, hopsResult.npts);
    }

    // Set up the visible line shape
    this.UpdateSVG(visibleLineShape, linePoints);
    visibleLineShape.SetFillColor("none");
    visibleLineShape.SetStrokeColor(strokeColor);
    visibleLineShape.SetStrokeOpacity(strokeOpacity);
    visibleLineShape.SetStrokeWidth(strokeThickness);
    if (strokePattern !== 0) {
      visibleLineShape.SetStrokePattern(strokePattern);
    }

    // Set up the interaction line shape
    interactionLineShape.SetSize(frameWidth, frameHeight);
    this.UpdateSVG(interactionLineShape, linePoints);
    interactionLineShape.SetStrokeColor("white");
    interactionLineShape.SetFillColor("none");
    interactionLineShape.SetOpacity(0);
    if (isHidden) {
      interactionLineShape.SetEventBehavior(OptConstant.EventBehavior.HiddenOut);
    } else {
      interactionLineShape.SetEventBehavior(OptConstant.EventBehavior.None);
    }
    interactionLineShape.SetStrokeWidth(strokeThickness + OptConstant.Common.Slop);

    containerShape.AddElement(visibleLineShape);
    containerShape.AddElement(interactionLineShape);

    this.ApplyStyles(visibleLineShape, styleRecord);
    this.ApplyEffects(containerShape, false, true);
    containerShape.isShape = true;
    this.AddIcons(svgDoc, containerShape);

    T3Util.Log("= S.SegmentedLine: CreateShape output", { shape: containerShape });
    return containerShape;
  }

  /**
   * Updates the SVG shape's points
   *
   * @param shape - The SVG shape element to update
   * @param points - Array of points to set on the shape
   * @description
   * Updates the points of an SVG polyline shape to match the specified points array.
   * This function is used to redraw the line after changes to its path.
   */
  UpdateSVG(shape, points) {
    T3Util.Log("= S.SegmentedLine: UpdateSVG input", { shape, points });
    if (shape && shape.SetPoints) {
      shape.SetPoints(points);
    }
    T3Util.Log("= S.SegmentedLine: UpdateSVG output", { shape });
  }

  /**
   * Determines whether this shape type can be healed in optimization
   *
   * @returns True if the shape supports the healing process
   * @description
   * Specifies that segmented lines can participate in the healing process
   * which reconnects broken or disconnected line segments during optimization.
   */
  AllowHeal(): boolean {
    T3Util.Log("= S.SegmentedLine: AllowHeal input");
    const result: boolean = true;
    T3Util.Log("= S.SegmentedLine: AllowHeal output", result);
    return result;
  }

  /**
   * Determines whether stand-off dimension lines can be used
   *
   * @returns False as segmented lines do not support stand-off dimension lines
   * @description
   * Segmented lines use their own dimension line calculation method and
   * don't support the stand-off dimension lines used by other shapes.
   */
  CanUseStandOffDimensionLines() {
    T3Util.Log("= S.SegmentedLine: CanUseStandOffDimensionLines input");
    const result = false;
    T3Util.Log("= S.SegmentedLine: CanUseStandOffDimensionLines output", result);
    return result;
  }

  /**
   * Formats a segmented line based on input coordinates and action type
   *
   * @param targetPoint - The target point for the segmentation operation
   * @param actionType - The type of action triggering the formatting (e.g., LineStart, LineEnd)
   * @param initialDirection - The initial direction provided (0 for auto-calculation)
   * @description
   * This function calculates and formats the segmentation points of a polyline based on:
   * - The specified action type (start point, end point, or specific segment adjustment)
   * - The target coordinates where the action is being applied
   * - The current or provided directional constraints
   *
   * The function handles different connection scenarios (top-to-top, top-to-bottom, etc.)
   * and updates the segmentation points accordingly. It maintains appropriate
   * directional flags that control how segments connect at junction points.
   */
  SegLFormat(targetPoint: Point, actionType: number, initialDirection: number) {
    T3Util.Log("= S.SegmentedLine: SegLFormat input", { targetPoint, actionType, initialDirection });

    let deltaX: number, deltaY: number, absDeltaX: number, absDeltaY: number;
    let boundingRect: any;
    let pointsCount: number;
    let isLastDirectionModified = false;
    let isFirstDirectionModified = false;
    let isDirectionRecomputed = false;
    const DirectionType = NvConstant.SegLDir;

    // Helper function to determine optimal connection direction based on point positions
    const calculateOptimalDirection = (currentDirection: number, sourcePoint: Point, destinationPoint: Point): number => {
      let newDirection = 0;
      const horizontalDifference = Math.abs(destinationPoint.x - sourcePoint.x);
      const verticalDifference = Math.abs(destinationPoint.y - sourcePoint.y);

      switch (currentDirection) {
        case DirectionType.Ktc: // Top center
          newDirection = destinationPoint.y < sourcePoint.y
            ? (verticalDifference >= horizontalDifference ? DirectionType.Kbc :
              (destinationPoint.x < sourcePoint.x ? DirectionType.Krc : DirectionType.Klc))
            : DirectionType.Ktc;
          break;
        case DirectionType.Kbc: // Bottom center
          newDirection = destinationPoint.y >= sourcePoint.y
            ? (verticalDifference >= horizontalDifference ? DirectionType.Ktc :
              (destinationPoint.x < sourcePoint.x ? DirectionType.Krc : DirectionType.Klc))
            : DirectionType.Kbc;
          break;
        case DirectionType.Klc: // Left center
          newDirection = destinationPoint.x < sourcePoint.x
            ? (verticalDifference <= horizontalDifference ? DirectionType.Krc :
              (destinationPoint.y < sourcePoint.y ? DirectionType.Kbc : DirectionType.Ktc))
            : DirectionType.Klc;
          break;
        case DirectionType.Krc: // Right center
          newDirection = destinationPoint.x > sourcePoint.x
            ? (verticalDifference < horizontalDifference ? DirectionType.Klc :
              (destinationPoint.y < sourcePoint.y ? DirectionType.Kbc : DirectionType.Ktc))
            : DirectionType.Krc;
          break;
        default:
          newDirection = currentDirection;
      }
      return newDirection;
    };

    // Ensure we have valid segmentation data
    if (this.segl != null) {
      // Update the appropriate endpoint based on action type
      switch (actionType) {
        case OptConstant.ActionTriggerType.LineStart:
          this.StartPoint.x = targetPoint.x;
          this.StartPoint.y = targetPoint.y;
          break;
        case OptConstant.ActionTriggerType.SeglPreserve:
        case OptConstant.ActionTriggerType.LineEnd:
          this.EndPoint.x = targetPoint.x;
          this.EndPoint.y = targetPoint.y;
          break;
      }

      // If we have at least one directional constraint
      if (this.segl.firstdir !== 0 || this.segl.lastdir !== 0) {
        // If we need to determine the last direction (at endpoint)
        if (this.segl.lastdir === 0) {
          switch (actionType) {
            case OptConstant.ActionTriggerType.LineStart:
            case OptConstant.ActionTriggerType.SeglOne:
            case OptConstant.ActionTriggerType.SeglTwo:
            case OptConstant.ActionTriggerType.SeglThree:
              initialDirection = calculateOptimalDirection(this.segl.firstdir, targetPoint, this.EndPoint);
              break;
            case OptConstant.ActionTriggerType.SeglPreserve:
              initialDirection = calculateOptimalDirection(this.segl.firstdir, this.StartPoint, this.EndPoint);
              break;
            default:
              initialDirection = calculateOptimalDirection(this.segl.firstdir, this.StartPoint, targetPoint);
          }
          isLastDirectionModified = true;
          this.segl.lastdir = initialDirection;
          isDirectionRecomputed = true;
        }

        // If we need to determine the first direction (at start point)
        if (this.segl.firstdir === 0) {
          switch (actionType) {
            case OptConstant.ActionTriggerType.LineEnd:
            case OptConstant.ActionTriggerType.SeglOne:
            case OptConstant.ActionTriggerType.SeglTwo:
            case OptConstant.ActionTriggerType.SeglThree:
              initialDirection = calculateOptimalDirection(this.segl.lastdir, targetPoint, this.StartPoint);
              break;
            case OptConstant.ActionTriggerType.SeglPreserve:
              initialDirection = calculateOptimalDirection(this.segl.lastdir, this.EndPoint, this.StartPoint);
              break;
            default:
              initialDirection = calculateOptimalDirection(this.segl.lastdir, this.EndPoint, targetPoint);
          }
          isFirstDirectionModified = true;
          this.segl.firstdir = initialDirection;
          isDirectionRecomputed = true;
        }

        // Calculate the segmentation points based on the determined directions
        switch (this.segl.firstdir) {
          case DirectionType.Ktc: // From top center
            switch (this.segl.lastdir) {
              case DirectionType.Ktc:
                this.SegLTopToTop(actionType, targetPoint, 1, false, isDirectionRecomputed);
                break;
              case DirectionType.Kbc:
                this.SegLTopToBottom(actionType, targetPoint, 1, false);
                break;
              case DirectionType.Klc:
                this.SegLTopToLeft(actionType, targetPoint, 1, 1, false, isDirectionRecomputed);
                break;
              case DirectionType.Krc:
                this.SegLTopToLeft(actionType, targetPoint, 1, -1, false, isDirectionRecomputed);
                break;
            }
            break;
          case DirectionType.Kbc: // From bottom center
            switch (this.segl.lastdir) {
              case DirectionType.Ktc:
                this.SegLTopToBottom(actionType, targetPoint, -1, false);
                break;
              case DirectionType.Kbc:
                this.SegLTopToTop(actionType, targetPoint, -1, false, isDirectionRecomputed);
                break;
              case DirectionType.Klc:
                this.SegLTopToLeft(actionType, targetPoint, -1, 1, false, isDirectionRecomputed);
                break;
              case DirectionType.Krc:
                this.SegLTopToLeft(actionType, targetPoint, -1, -1, false, isDirectionRecomputed);
                break;
            }
            break;
          case DirectionType.Klc: // From left center
            switch (this.segl.lastdir) {
              case DirectionType.Ktc:
                this.SegLTopToLeft(actionType, targetPoint, 1, 1, true, isDirectionRecomputed);
                break;
              case DirectionType.Kbc:
                this.SegLTopToLeft(actionType, targetPoint, 1, -1, true, isDirectionRecomputed);
                break;
              case DirectionType.Klc:
                this.SegLTopToTop(actionType, targetPoint, 1, true, isDirectionRecomputed);
                break;
              case DirectionType.Krc:
                this.SegLTopToBottom(actionType, targetPoint, 1, true);
                break;
            }
            break;
          case DirectionType.Krc: // From right center
            switch (this.segl.lastdir) {
              case DirectionType.Ktc:
                this.SegLTopToLeft(actionType, targetPoint, -1, 1, true, isDirectionRecomputed);
                break;
              case DirectionType.Kbc:
                this.SegLTopToLeft(actionType, targetPoint, -1, -1, true, isDirectionRecomputed);
                break;
              case DirectionType.Klc:
                this.SegLTopToBottom(actionType, targetPoint, -1, true);
                break;
              case DirectionType.Krc:
                this.SegLTopToTop(actionType, targetPoint, -1, true, isDirectionRecomputed);
                break;
            }
            break;
        }

        // Reset temporary direction flags if needed
        if (isLastDirectionModified) {
          this.segl.lastdir = 0;
        }
        if (isFirstDirectionModified) {
          this.segl.firstdir = 0;
        }
      } else {
        // When no directional constraints exist, create a default segmentation
        deltaX = this.EndPoint.x - this.StartPoint.x;
        deltaY = this.EndPoint.y - this.StartPoint.y;
        absDeltaX = Math.abs(deltaX);
        absDeltaY = Math.abs(deltaY);
        boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

        if ((absDeltaY >= 1 || absDeltaX >= 1)) {
          // Auto-determine orientation if not specified
          if (initialDirection === 0) {
            initialDirection = (absDeltaX - absDeltaY > 0.01)
              ? OptConstant.Common.HorizOnly  // Prefer horizontal if wider than tall
              : OptConstant.Common.VertOnly;  // Prefer vertical if taller than wide
          }

          // Clear existing segmentation data
          this.segl.pts.splice(0);
          this.segl.lengths.splice(0);

          if (initialDirection === OptConstant.Common.HorizOnly) {
            if (absDeltaY < 1) {
              // Simple horizontal line for very small height differences
              this.segl.pts.push(new Point(this.StartPoint.x, this.StartPoint.y));
              this.segl.pts.push(new Point(this.EndPoint.x, this.EndPoint.y));
              this.segl.lengths.push(deltaX);
            } else {
              // Three-segment horizontal-primary path
              const halfWidth = deltaX / 2;
              this.segl.pts.push(new Point(this.StartPoint.x, this.StartPoint.y));
              this.segl.pts.push(new Point(this.StartPoint.x + halfWidth, this.StartPoint.y));
              this.segl.pts.push(new Point(this.StartPoint.x + halfWidth, this.EndPoint.y));
              this.segl.pts.push(new Point(this.EndPoint.x, this.EndPoint.y));
              this.segl.lengths.push(halfWidth);
              this.segl.lengths.push(deltaY);
              this.segl.lengths.push(halfWidth);
            }
          } else if (initialDirection === OptConstant.Common.VertOnly) {
            if (absDeltaX < 1) {
              // Simple vertical line for very small width differences
              this.segl.pts.push(new Point(this.StartPoint.x, this.StartPoint.y));
              this.segl.pts.push(new Point(this.EndPoint.x, this.EndPoint.y));
              this.segl.lengths.push(deltaY);
            } else {
              // Three-segment vertical-primary path
              const halfHeight = deltaY / 2;
              this.segl.pts.push(new Point(this.StartPoint.x, this.StartPoint.y));
              this.segl.pts.push(new Point(this.StartPoint.x, this.StartPoint.y + halfHeight));
              this.segl.pts.push(new Point(this.EndPoint.x, this.StartPoint.y + halfHeight));
              this.segl.pts.push(new Point(this.EndPoint.x, this.EndPoint.y));
              this.segl.lengths.push(halfHeight);
              this.segl.lengths.push(deltaX);
              this.segl.lengths.push(halfHeight);
            }
          }

          // Adjust all points to be relative to the bounding rectangle
          pointsCount = this.segl.pts.length;
          for (let index = 0; index < pointsCount; index++) {
            this.segl.pts[index].x -= boundingRect.x;
            this.segl.pts[index].y -= boundingRect.y;
          }
        }
      }

      T3Util.Log("= S.SegmentedLine: SegLFormat output", {
        StartPoint: this.StartPoint,
        EndPoint: this.EndPoint,
        segl: this.segl
      });
    }
  }

  /**
   * Calculates and returns points used for dimension lines on a segmented line
   *
   * @returns Array of points that define the dimension lines for the segmented line
   * @description
   * This function determines the appropriate points for drawing dimension lines based on
   * the current dimension flags. It can return:
   * - All segmentation points if the AllSeg flag is set
   * - Two measurement points around the center if the Total flag is set
   * - The start and end points relative to the bounding rectangle as a fallback
   */
  GetDimensionPoints() {
    T3Util.Log("= S.SegmentedLine: GetDimensionPoints input", {
      Dimensions: this.Dimensions,
      Frame: this.Frame,
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint,
    });

    let dimensionPoints: Point[] = [];

    // Use all segmentation points if flag set
    if (this.Dimensions & NvConstant.DimensionFlags.AllSeg) {
      dimensionPoints = this.segl.pts;
    }
    // Calculate total dimension if flag set
    else if (this.Dimensions & NvConstant.DimensionFlags.Total) {
      // Deep copy the points and adjust them by the frame offsets
      let adjustedPoints = Utils1.DeepCopy(this.segl.pts);
      for (let i = 0; i < adjustedPoints.length; i++) {
        adjustedPoints[i].x += this.Frame.x;
        adjustedPoints[i].y += this.Frame.y;
      }

      // Calculate segment distances (for debugging and potential future use)
      for (let i = 1; i < adjustedPoints.length; i++) {
        const deltaX = Math.abs(adjustedPoints[i - 1].x - adjustedPoints[i].x);
        const deltaY = Math.abs(adjustedPoints[i - 1].y - adjustedPoints[i].y);
        const segmentLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        T3Util.Log("= S.SegmentedLine: Segment distance", { index: i, segmentLength });
      }

      // Calculate center based on the overall rectangle
      const boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      const halfYOffset = (this.Frame.y - boundingRect.y) / 2;
      const halfXOffset = (this.Frame.x - boundingRect.x) / 2;
      const centerPoint = {
        x: this.Frame.width / 2 + halfXOffset,
        y: this.Frame.height / 2 + halfYOffset,
      };

      // Create two measurement points offset by 10 pixels to the left and right of center
      const startMeasurePoint = { x: centerPoint.x - 10, y: centerPoint.y };
      const endMeasurePoint = { x: centerPoint.x + 10, y: centerPoint.y };

      dimensionPoints.push(new Point(startMeasurePoint.x, startMeasurePoint.y));
      dimensionPoints.push(new Point(endMeasurePoint.x, endMeasurePoint.y));
    }
    // Fallback: use start and end points relative to the bounding rectangle
    else {
      const boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      dimensionPoints.push(new Point(this.StartPoint.x - boundingRect.x, this.StartPoint.y - boundingRect.y));
      dimensionPoints.push(new Point(this.EndPoint.x - boundingRect.x, this.EndPoint.y - boundingRect.y));
    }

    T3Util.Log("= S.SegmentedLine: GetDimensionPoints output", dimensionPoints);
    return dimensionPoints;
  }

  /**
   * Formats a segmented line for top-to-top connections
   *
   * @param actionType - The type of action triggering the formatting
   * @param targetPoint - The target point for the segmentation operation
   * @param directionFactor - The direction factor (1 or -1) to determine orientation
   * @param isVertical - Whether the segments are oriented vertically
   * @param forcePreserveFormat - Whether to preserve the current format regardless of other conditions
   * @description
   * This function calculates and formats the segmentation points for a top-to-top connection,
   * handling both vertical and horizontal orientations. It creates a routing path with
   * appropriate bends based on the start and end points, handles different action types,
   * and accounts for object connections at hook points.
   */
  SegLTopToTop(
    actionType: number,
    targetPoint: Point,
    directionFactor: number,
    isVertical: boolean,
    forcePreserveFormat: boolean
  ) {
    T3Util.Log("= S.SegmentedLine: SegLTopToTop input", {
      actionType,
      targetPoint,
      directionFactor,
      isVertical,
      forcePreserveFormat,
    });

    // Define readable variable names
    let horizontalDistance: number,
      verticalDistance: number;
    let startPrimary: number,
      startSecondary: number;
    let endPrimary: number,
      endSecondary: number;
    let boundingRect: any;
    let existingPointsCount: number;
    let hookObjectRect: any;
    let hookAdjustmentValue: number;
    let hookAdjustmentNeeded = 0;
    let shouldPreserveFormat = false;
    const SEGMENT_MAX_DIMENSION = OptConstant.Common.DimMax;

    // Maximum dimension placeholder
    let maxDimensions: Point = { x: 0, y: 0 };

    if (isVertical) {
      // Compute based on vertical orientation
      verticalDistance = Math.abs(this.EndPoint.y - this.StartPoint.y);
      horizontalDistance = Math.abs(this.EndPoint.x - this.StartPoint.x);
      startPrimary = this.StartPoint.y;
      startSecondary = this.StartPoint.x;
      endPrimary = this.EndPoint.y;
      endSecondary = this.EndPoint.x;
      boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

      // Swap boundingRect.x and boundingRect.y for proper adjustment in vertical mode
      let temp = boundingRect.x;
      boundingRect.x = boundingRect.y;
      boundingRect.y = temp;

      T3Gv.opt.GetMaxDim(maxDimensions);
      temp = maxDimensions.x;
      maxDimensions.x = maxDimensions.y;
      maxDimensions.y = temp;
    } else {
      // Compute based on horizontal orientation
      verticalDistance = Math.abs(this.EndPoint.x - this.StartPoint.x);
      horizontalDistance = Math.abs(this.EndPoint.y - this.StartPoint.y);
      startPrimary = this.StartPoint.x;
      startSecondary = this.StartPoint.y;
      endPrimary = this.EndPoint.x;
      endSecondary = this.EndPoint.y;
      boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      T3Gv.opt.GetMaxDim(maxDimensions);
    }

    existingPointsCount = this.segl.pts.length;
    // Clear segmentation points
    this.segl.pts.splice(0);

    // Check hooks for adjustment if available
    if (this.hooks && this.hooks.length > 0) {
      // Determine hook adjustment direction based on point positions
      const shouldUseStartHook = isVertical
        ? (directionFactor === -1
          ? this.StartPoint.x > this.EndPoint.x
          : this.StartPoint.x < this.EndPoint.x)
        : (directionFactor === -1
          ? this.StartPoint.y > this.EndPoint.y
          : this.StartPoint.y < this.EndPoint.y);

      if (shouldUseStartHook) {
        // Look for KTL hook point
        for (let j = 0; j < this.hooks.length; j++) {
          if (this.hooks[j].hookpt === OptConstant.HookPts.KTL) {
            const hookObj = DataUtil.GetObjectPtr(this.hooks[j].objid, false);
            if (hookObj) {
              hookObjectRect = hookObj.GetTargetRect();
              if (isVertical) {
                hookAdjustmentValue =
                  this.StartPoint.y +
                  hookObjectRect.height *
                  ((SEGMENT_MAX_DIMENSION - this.hooks[j].connect.y) / SEGMENT_MAX_DIMENSION) +
                  OptConstant.Common.SegDefLen;
              } else {
                hookAdjustmentValue =
                  this.StartPoint.x +
                  hookObjectRect.width *
                  ((SEGMENT_MAX_DIMENSION - this.hooks[j].connect.x) / SEGMENT_MAX_DIMENSION) +
                  OptConstant.Common.SegDefLen;
              }
              break;
            }
          }
        }
      } else {
        // Look for KTR hook point
        for (let j = 0; j < this.hooks.length; j++) {
          if (this.hooks[j].hookpt === OptConstant.HookPts.KTR) {
            const hookObj = DataUtil.GetObjectPtr(this.hooks[j].objid, false);
            if (hookObj) {
              hookObjectRect = hookObj.GetTargetRect();
              if (isVertical) {
                hookAdjustmentValue =
                  this.EndPoint.y +
                  hookObjectRect.height *
                  ((SEGMENT_MAX_DIMENSION - this.hooks[j].connect.y) / SEGMENT_MAX_DIMENSION) +
                  OptConstant.Common.SegDefLen;
              } else {
                hookAdjustmentValue =
                  this.EndPoint.x +
                  hookObjectRect.width *
                  ((SEGMENT_MAX_DIMENSION - this.hooks[j].connect.x) / SEGMENT_MAX_DIMENSION) +
                  OptConstant.Common.SegDefLen;
              }
              break;
            }
          }
        }
      }

      // Determine if hook adjustment is needed based on dimensions
      if (hookObjectRect) {
        hookAdjustmentNeeded = isVertical
          ? verticalDistance < hookObjectRect.height / 2 + OptConstant.Common.SegMinLen
            ? 1
            : 0
          : verticalDistance < hookObjectRect.width / 2 + OptConstant.Common.SegMinLen
            ? 1
            : 0;
      }
    }

    // If the horizontal distance is very small, treat it as zero
    if (horizontalDistance < OptConstant.Common.SegMinSeg) {
      horizontalDistance = 0;
    }

    // Determine if we should preserve the current format
    if (actionType === OptConstant.ActionTriggerType.SeglPreserve) {
      shouldPreserveFormat = existingPointsCount === 4;
    }

    if (forcePreserveFormat) {
      shouldPreserveFormat = true;
    }

    // CASE 1: Simple routing with 4 points
    if (
      !shouldPreserveFormat &&
      ((verticalDistance > OptConstant.Common.SegMinLen ||
        horizontalDistance < OptConstant.Common.SegMinLen) &&
        !hookAdjustmentNeeded)
    ) {
      // Clear existing lengths if not a 4-point line
      if (existingPointsCount !== 4) {
        this.segl.lengths.splice(0);
      }

      // Add the first point based on orientation
      if (isVertical) {
        this.segl.pts.push(new Point(startSecondary - boundingRect.y, startPrimary - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(startPrimary - boundingRect.x, startSecondary - boundingRect.y));
      }

      // Ensure we have a default length value
      if (this.segl.lengths.length < 1) {
        this.segl.lengths.push(OptConstant.Common.SegDefLen);
      }

      let firstLength = this.segl.lengths[0];
      let computedLength: number;

      // Handle segl one action (first segment adjustment)
      if (actionType === OptConstant.ActionTriggerType.SeglOne) {
        if (isVertical) {
          this.segl.lengths[0] = directionFactor * (startSecondary - targetPoint.x);
          computedLength = directionFactor * (endSecondary - targetPoint.x);
        } else {
          this.segl.lengths[0] = directionFactor * (startSecondary - targetPoint.y);
          computedLength = directionFactor * (endSecondary - targetPoint.y);
        }

        // Enforce minimum segment lengths
        if (this.segl.lengths[0] < OptConstant.Common.SegMinLen) {
          this.segl.lengths[0] = OptConstant.Common.SegMinLen;
        }
        if (computedLength < OptConstant.Common.SegMinLen) {
          computedLength = OptConstant.Common.SegMinLen;
        }

        // Use smallest length value
        if (computedLength < firstLength) {
          firstLength = computedLength;
        }
      } else if (firstLength > OptConstant.Common.SegDefLen) {
        firstLength = OptConstant.Common.SegDefLen;
      }

      // Calculate coordinates for the middle points
      let middleCoordFirst = startSecondary - directionFactor * this.segl.lengths[0];
      if (middleCoordFirst < 0) {
        middleCoordFirst = 0;
      }
      if (middleCoordFirst > maxDimensions.y) {
        middleCoordFirst = maxDimensions.y;
      }

      let middleCoordSecond = endSecondary - directionFactor * firstLength;
      if (middleCoordSecond < 0) {
        middleCoordSecond = 0;
      }
      if (middleCoordSecond > maxDimensions.y) {
        middleCoordSecond = maxDimensions.y;
      }

      // Adjust coordinates to maintain minimum separation
      if (directionFactor === -1) {
        if (middleCoordSecond > middleCoordFirst) {
          middleCoordFirst = middleCoordSecond;
        }
      } else {
        if (middleCoordSecond < middleCoordFirst) {
          middleCoordFirst = middleCoordSecond;
        }
      }

      // Add the remaining points based on orientation
      if (isVertical) {
        this.segl.pts.push(new Point(middleCoordFirst - boundingRect.y, startPrimary - boundingRect.x));
        this.segl.pts.push(new Point(middleCoordFirst - boundingRect.y, endPrimary - boundingRect.x));
        this.segl.pts.push(new Point(endSecondary - boundingRect.y, endPrimary - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(startPrimary - boundingRect.x, middleCoordFirst - boundingRect.y));
        this.segl.pts.push(new Point(endPrimary - boundingRect.x, middleCoordFirst - boundingRect.y));
        this.segl.pts.push(new Point(endPrimary - boundingRect.x, endSecondary - boundingRect.y));
      }
    }
    // CASE 2: Complex routing with 6 points
    else {
      // Clear existing lengths if not a 6-point line
      if (existingPointsCount !== 6) {
        this.segl.lengths.splice(0);
      }

      // Add the first point based on orientation
      if (isVertical) {
        this.segl.pts.push(new Point(startSecondary - boundingRect.y, startPrimary - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(startPrimary - boundingRect.x, startSecondary - boundingRect.y));
      }

      // Ensure we have a default length value for first segment
      if (this.segl.lengths.length < 1) {
        this.segl.lengths.push(OptConstant.Common.SegDefLen);
      }

      // Handle segl one action (first segment adjustment)
      if (actionType === OptConstant.ActionTriggerType.SeglOne) {
        if (isVertical) {
          this.segl.lengths[0] = directionFactor * (startSecondary - targetPoint.x);
        } else {
          this.segl.lengths[0] = directionFactor * (startSecondary - targetPoint.y);
        }

        // Enforce minimum segment length
        if (this.segl.lengths[0] < OptConstant.Common.SegMinLen) {
          this.segl.lengths[0] = OptConstant.Common.SegMinLen;
        }
      }

      // Calculate first middle point coordinate
      let middleCoordU = startSecondary - directionFactor * this.segl.lengths[0];
      if (middleCoordU < 0) {
        middleCoordU = 0;
      }
      if (middleCoordU > maxDimensions.y) {
        middleCoordU = maxDimensions.y;
      }

      // Add second point based on orientation
      if (isVertical) {
        this.segl.pts.push(new Point(middleCoordU - boundingRect.y, startPrimary - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(startPrimary - boundingRect.x, middleCoordU - boundingRect.y));
      }

      // Ensure we have a default length value for second segment
      if (this.segl.lengths.length < 2) {
        this.segl.lengths.push(OptConstant.Common.SegDefLen);
      }

      // Handle segl two action (second segment adjustment)
      if (actionType === OptConstant.ActionTriggerType.SeglTwo) {
        if (isVertical) {
          this.segl.lengths[1] = targetPoint.y - startPrimary;
        } else {
          this.segl.lengths[1] = targetPoint.x - startPrimary;
        }

        // Enforce minimum segment length
        if (this.segl.lengths[1] < OptConstant.Common.SegMinLen) {
          this.segl.lengths[1] = OptConstant.Common.SegMinLen;
        }
      }
      // Apply hook adjustment if needed
      else if (hookAdjustmentNeeded) {
        const lengthToHook = hookAdjustmentValue - startPrimary;
        if (this.segl.lengths[1] < lengthToHook) {
          this.segl.lengths[1] = lengthToHook;
        }
      }

      // Calculate vertical distance coordinate
      let verticalPosition = startPrimary + this.segl.lengths[1];
      if (verticalPosition < 0) {
        verticalPosition = 0;
      }
      if (verticalPosition > maxDimensions.x) {
        verticalPosition = maxDimensions.x;
      }

      // Add third point based on orientation
      if (isVertical) {
        this.segl.pts.push(new Point(middleCoordU - boundingRect.y, verticalPosition - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(verticalPosition - boundingRect.x, middleCoordU - boundingRect.y));
      }

      // Ensure we have a default length value for third segment
      if (this.segl.lengths.length < 3) {
        this.segl.lengths.push(OptConstant.Common.SegDefLen);
      }

      // Handle segl three action (third segment adjustment)
      if (actionType === OptConstant.ActionTriggerType.SeglThree) {
        if (isVertical) {
          this.segl.lengths[2] = directionFactor * (endSecondary - targetPoint.x);
        } else {
          this.segl.lengths[2] = directionFactor * (endSecondary - targetPoint.y);
        }

        // Enforce minimum segment length
        if (this.segl.lengths[2] < OptConstant.Common.SegMinLen) {
          this.segl.lengths[2] = OptConstant.Common.SegMinLen;
        }
      }

      // Calculate second middle point coordinate
      let middleCoordP = endSecondary - directionFactor * this.segl.lengths[2];
      if (middleCoordP < 0) {
        middleCoordP = 0;
      }
      if (middleCoordP > maxDimensions.y) {
        middleCoordP = maxDimensions.y;
      }

      // Add remaining points based on orientation
      if (isVertical) {
        this.segl.pts.push(new Point(middleCoordP - boundingRect.y, verticalPosition - boundingRect.x));
        this.segl.pts.push(new Point(middleCoordP - boundingRect.y, endPrimary - boundingRect.x));
        this.segl.pts.push(new Point(endSecondary - boundingRect.y, endPrimary - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(verticalPosition - boundingRect.x, middleCoordP - boundingRect.y));
        this.segl.pts.push(new Point(endPrimary - boundingRect.x, middleCoordP - boundingRect.y));
        this.segl.pts.push(new Point(endPrimary - boundingRect.x, endSecondary - boundingRect.y));
      }
    }

    T3Util.Log("= S.SegmentedLine: SegLTopToTop output", {
      pts: this.segl.pts,
      lengths: this.segl.lengths,
    });
  }

  /**
   * Formats a segmented line for top-to-bottom connections
   *
   * @param actionType - The type of action triggering the formatting (e.g., LineStart, LineEnd, SeglOne)
   * @param targetPoint - The target point for the segmentation operation
   * @param directionFactor - The direction factor (1 or -1) to determine orientation
   * @param isVertical - Whether the segments are oriented vertically (true) or horizontally (false)
   * @description
   * This function calculates and formats segmentation points for a top-to-bottom connection,
   * handling both vertical and horizontal orientations. It creates a routing path with appropriate
   * bends based on the start and end points. The function also accounts for different action types
   * (like segment adjustments) and hook points for connections to other objects.
   */
  SegLTopToBottom(actionType: number, targetPoint: Point, directionFactor: number, isVertical: boolean) {
    T3Util.Log("= S.SegmentedLine: SegLTopToBottom input", { actionType, targetPoint, directionFactor, isVertical });

    // Define variables with meaningful names
    let secondaryDistance: number;
    let primaryStart: number;
    let secondaryStart: number;
    let primaryEnd: number;
    let secondaryEnd: number;
    let boundingRect: any;
    let maxDimensions: Point = { x: 0, y: 0 };
    let shouldUseSimpleSegmentation: boolean;
    let existingPointCount = this.segl.pts.length;
    let secondaryCoordinate: number;
    let hookAdjustmentLength: number = 0;
    const segmentDimension: number = OptConstant.Common.DimMax;

    // Set up coordinates based on orientation
    if (isVertical) {
      // For vertical orientation, swap primary/secondary axes
      Math.abs(this.EndPoint.y - this.StartPoint.y); // This calculation result is unused
      secondaryDistance = Math.abs(this.EndPoint.x - this.StartPoint.x);
      primaryStart = this.StartPoint.y;
      secondaryStart = this.StartPoint.x;
      primaryEnd = this.EndPoint.y;
      secondaryEnd = this.EndPoint.x;
      boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

      // Swap rect coordinates for vertical adjustment
      let temp = boundingRect.x;
      boundingRect.x = boundingRect.y;
      boundingRect.y = temp;

      // Get maximum dimensions and swap them for vertical orientation
      T3Gv.opt.GetMaxDim(maxDimensions);
      temp = maxDimensions.x;
      maxDimensions.x = maxDimensions.y;
      maxDimensions.y = temp;
    } else {
      // For horizontal orientation
      Math.abs(this.EndPoint.x - this.StartPoint.x); // This calculation result is unused
      secondaryDistance = Math.abs(this.EndPoint.y - this.StartPoint.y);
      primaryStart = this.StartPoint.x;
      secondaryStart = this.StartPoint.y;
      primaryEnd = this.EndPoint.x;
      secondaryEnd = this.EndPoint.y;
      boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      T3Gv.opt.GetMaxDim(maxDimensions);
    }

    // Determine if we should use simple segmentation based on secondary coordinate differences
    shouldUseSimpleSegmentation = (directionFactor === -1)
      ? (secondaryEnd - 2 * OptConstant.Common.SegMinLen > secondaryStart)
      : (secondaryEnd + 2 * OptConstant.Common.SegMinLen < secondaryStart);

    // Store existing points count and clear current points
    existingPointCount = this.segl.pts.length;
    this.segl.pts.splice(0);

    // Override segmentation mode if preserving format
    if (actionType === OptConstant.ActionTriggerType.SeglPreserve) {
      shouldUseSimpleSegmentation = (existingPointCount !== 6);
    }

    // CASE 1: Use simple segmentation (4-point path)
    if (shouldUseSimpleSegmentation) {
      // If primary coordinates are very close, use a direct 2-point line
      if (Math.abs(primaryStart - primaryEnd) <= 1) {
        if (isVertical) {
          this.segl.pts.push(new Point(secondaryStart - boundingRect.y, primaryStart - boundingRect.x));
          this.segl.pts.push(new Point(secondaryEnd - boundingRect.y, primaryStart - boundingRect.x));
        } else {
          this.segl.pts.push(new Point(primaryStart - boundingRect.x, secondaryStart - boundingRect.y));
          this.segl.pts.push(new Point(primaryStart - boundingRect.x, secondaryEnd - boundingRect.y));
        }
        this.segl.lengths.splice(0);
      } else {
        // Otherwise, create a 4-point path with a middle segment
        // Reset lengths array if the point count has changed
        if (existingPointCount !== 4) {
          this.segl.lengths.splice(0);
        }

        // Add first point
        if (isVertical) {
          this.segl.pts.push(new Point(secondaryStart - boundingRect.y, primaryStart - boundingRect.x));
        } else {
          this.segl.pts.push(new Point(primaryStart - boundingRect.x, secondaryStart - boundingRect.y));
        }

        // Ensure we have a default length value for first segment
        if (this.segl.lengths.length < 1) {
          this.segl.lengths.push(OptConstant.Common.SegDefLen);
        }

        // Handle first segment adjustment
        if (actionType === OptConstant.ActionTriggerType.SeglOne) {
          this.segl.lengths[0] = isVertical
            ? directionFactor * (secondaryStart - targetPoint.x)
            : directionFactor * (secondaryStart - targetPoint.y);

          if (this.segl.lengths[0] < OptConstant.Common.SegMinLen) {
            this.segl.lengths[0] = OptConstant.Common.SegMinLen;
          }
        } else {
          // For other actions, ensure length is within appropriate bounds
          if (actionType !== OptConstant.ActionTriggerType.SeglPreserve &&
            this.segl.lengths[0] < OptConstant.Common.SegDefLen) {
            this.segl.lengths[0] = OptConstant.Common.SegDefLen;
          }
          if (this.segl.lengths[0] > secondaryDistance - OptConstant.Common.SegMinLen) {
            this.segl.lengths[0] = secondaryDistance - OptConstant.Common.SegMinLen;
          }
        }

        // Calculate middle segment coordinate
        secondaryCoordinate = secondaryStart - directionFactor * this.segl.lengths[0];
        if (secondaryCoordinate < 0) {
          secondaryCoordinate = 0;
        }
        if (secondaryCoordinate > maxDimensions.y) {
          secondaryCoordinate = maxDimensions.y;
        }

        // Calculate minimum required secondary coordinate for the end segment
        let minEndCoordinate = secondaryEnd + directionFactor * OptConstant.Common.SegMinLen;
        if (minEndCoordinate < 0) {
          minEndCoordinate = 0;
        }
        if (minEndCoordinate > maxDimensions.y) {
          minEndCoordinate = maxDimensions.y;
        }

        // Adjust coordinates to maintain minimum separation
        if (directionFactor === -1) {
          if (minEndCoordinate < secondaryStart + OptConstant.Common.SegMinLen) {
            minEndCoordinate = secondaryStart + OptConstant.Common.SegMinLen;
          }
          if (minEndCoordinate < secondaryCoordinate) {
            secondaryCoordinate = minEndCoordinate;
          }
        } else {
          if (minEndCoordinate > secondaryStart - OptConstant.Common.SegMinLen) {
            minEndCoordinate = secondaryStart - OptConstant.Common.SegMinLen;
          }
          if (minEndCoordinate > secondaryCoordinate) {
            secondaryCoordinate = minEndCoordinate;
          }
        }

        // Add remaining points based on orientation
        if (isVertical) {
          this.segl.pts.push(new Point(secondaryCoordinate - boundingRect.y, primaryStart - boundingRect.x));
          this.segl.pts.push(new Point(secondaryCoordinate - boundingRect.y, primaryEnd - boundingRect.x));
          this.segl.pts.push(new Point(secondaryEnd - boundingRect.y, primaryEnd - boundingRect.x));
        } else {
          this.segl.pts.push(new Point(primaryStart - boundingRect.x, secondaryCoordinate - boundingRect.y));
          this.segl.pts.push(new Point(primaryEnd - boundingRect.x, secondaryCoordinate - boundingRect.y));
          this.segl.pts.push(new Point(primaryEnd - boundingRect.x, secondaryEnd - boundingRect.y));
        }
      }
    } else {
      // CASE 2: Use complex segmentation (6-point path)
      // Check for hook adjustments if available
      if (this.hooks && this.hooks.length > 0) {
        for (let hookIndex = 0; hookIndex < this.hooks.length; hookIndex++) {
          if (this.hooks[hookIndex].hookpt === OptConstant.HookPts.KTL) {
            const hookObj = DataUtil.GetObjectPtr(this.hooks[hookIndex].objid, false);
            if (hookObj) {
              const hookRect = hookObj.GetTargetRect();
              if (isVertical) {
                hookAdjustmentLength = primaryStart <= primaryEnd
                  ? this.StartPoint.y + hookRect.height * ((segmentDimension - this.hooks[hookIndex].connect.y) / segmentDimension) + OptConstant.Common.SegDefLen
                  : this.StartPoint.y + hookRect.height * (this.hooks[hookIndex].connect.y / segmentDimension) + OptConstant.Common.SegDefLen;
              } else {
                hookAdjustmentLength = primaryStart <= primaryEnd
                  ? this.StartPoint.x + hookRect.width * ((segmentDimension - this.hooks[hookIndex].connect.x) / segmentDimension) + OptConstant.Common.SegDefLen
                  : this.StartPoint.x + hookRect.width * (this.hooks[hookIndex].connect.x / segmentDimension) + OptConstant.Common.SegDefLen;
              }
              break;
            }
          }
        }
      }

      // Reset lengths array if point count has changed
      if (existingPointCount !== 6) {
        this.segl.lengths.splice(0);
      }

      // Add first segmentation point
      if (isVertical) {
        this.segl.pts.push(new Point(secondaryStart - boundingRect.y, primaryStart - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(primaryStart - boundingRect.x, secondaryStart - boundingRect.y));
      }

      // Ensure we have a default length value for first segment
      if (this.segl.lengths.length < 1) {
        this.segl.lengths.push(OptConstant.Common.SegDefLen);
      }

      // Handle first segment adjustment
      if (actionType === OptConstant.ActionTriggerType.SeglOne) {
        this.segl.lengths[0] = isVertical
          ? directionFactor * (secondaryStart - targetPoint.x)
          : directionFactor * (secondaryStart - targetPoint.y);

        if (this.segl.lengths[0] < OptConstant.Common.SegMinLen) {
          this.segl.lengths[0] = OptConstant.Common.SegMinLen;
        }
      }

      // Calculate first bend coordinate
      secondaryCoordinate = secondaryStart - directionFactor * this.segl.lengths[0];
      if (secondaryCoordinate < 0) {
        secondaryCoordinate = 0;
      }
      if (secondaryCoordinate > maxDimensions.y) {
        secondaryCoordinate = maxDimensions.y;
      }

      // Add second point
      if (isVertical) {
        this.segl.pts.push(new Point(secondaryCoordinate - boundingRect.y, primaryStart - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(primaryStart - boundingRect.x, secondaryCoordinate - boundingRect.y));
      }

      // Ensure we have a default length value for second segment
      if (this.segl.lengths.length < 2) {
        this.segl.lengths.push(OptConstant.Common.SegDefLen);
      }

      // Handle second segment adjustment
      if (actionType === OptConstant.ActionTriggerType.SeglTwo) {
        this.segl.lengths[1] = primaryStart <= primaryEnd
          ? (isVertical ? targetPoint.y - primaryStart : targetPoint.x - primaryStart)
          : (isVertical ? -(targetPoint.y - primaryStart) : -(targetPoint.x - primaryStart));
      } else if (hookAdjustmentLength) {
        // Apply hook adjustment if available
        const availableLength = hookAdjustmentLength - primaryStart;
        if (this.segl.lengths[1] < availableLength) {
          this.segl.lengths[1] = availableLength;
        }
      }

      // Calculate middle segment position
      let middlePosition: number;
      if (primaryStart <= primaryEnd) {
        middlePosition = primaryStart + this.segl.lengths[1];
        if (Math.abs(primaryEnd - middlePosition) < OptConstant.Common.SegMinLen) {
          middlePosition = middlePosition < primaryEnd
            ? primaryEnd - OptConstant.Common.SegMinLen
            : primaryEnd + OptConstant.Common.SegMinLen;
        }
      } else {
        middlePosition = primaryStart - this.segl.lengths[1];
        if (Math.abs(middlePosition - primaryEnd) < OptConstant.Common.SegMinLen) {
          middlePosition = middlePosition < primaryEnd
            ? primaryEnd - OptConstant.Common.SegMinLen
            : primaryEnd + OptConstant.Common.SegMinLen;
        }
      }

      // Ensure middle position is within bounds
      if (middlePosition < 0) {
        middlePosition = 0;
      }
      if (middlePosition > maxDimensions.x) {
        middlePosition = maxDimensions.x;
      }

      // Add third point
      if (isVertical) {
        this.segl.pts.push(new Point(secondaryCoordinate - boundingRect.y, middlePosition - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(middlePosition - boundingRect.x, secondaryCoordinate - boundingRect.y));
      }

      // Ensure we have a default length value for third segment
      if (this.segl.lengths.length < 3) {
        this.segl.lengths.push(OptConstant.Common.SegDefLen);
      }

      // Handle third segment adjustment
      if (actionType === OptConstant.ActionTriggerType.SeglThree) {
        this.segl.lengths[2] = isVertical
          ? -directionFactor * (secondaryEnd - targetPoint.x)
          : -directionFactor * (secondaryEnd - targetPoint.y);

        if (this.segl.lengths[2] < OptConstant.Common.SegMinLen) {
          this.segl.lengths[2] = OptConstant.Common.SegMinLen;
        }
      }

      // Calculate end bend coordinate
      secondaryCoordinate = secondaryEnd + directionFactor * this.segl.lengths[2];
      if (secondaryCoordinate < 0) {
        secondaryCoordinate = 0;
      }
      if (secondaryCoordinate > maxDimensions.y) {
        secondaryCoordinate = maxDimensions.y;
      }

      // Add remaining points based on orientation
      if (isVertical) {
        this.segl.pts.push(new Point(secondaryCoordinate - boundingRect.y, middlePosition - boundingRect.x));
        this.segl.pts.push(new Point(secondaryCoordinate - boundingRect.y, primaryEnd - boundingRect.x));
        this.segl.pts.push(new Point(secondaryEnd - boundingRect.y, primaryEnd - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(middlePosition - boundingRect.x, secondaryCoordinate - boundingRect.y));
        this.segl.pts.push(new Point(primaryEnd - boundingRect.x, secondaryCoordinate - boundingRect.y));
        this.segl.pts.push(new Point(primaryEnd - boundingRect.x, secondaryEnd - boundingRect.y));
      }
    }

    T3Util.Log("= S.SegmentedLine: SegLTopToBottom output", { pts: this.segl.pts, lengths: this.segl.lengths });
  }

  /**
   * Formats a segmented line from top to left direction
   * This function calculates points and lengths for drawing a segmented line that connects
   * from a top point to a left point, handling both horizontal and vertical orientations.
   *
   * @param actionType - The type of action triggering this format (e.g. SEGL_ONE, SEGL_TWO)
   * @param point - The current point being manipulated
   * @param primaryFactor - The primary direction factor (1 or -1)
   * @param secondaryFactor - The secondary direction factor (1 or -1)
   * @param isVertical - Whether the orientation is vertical (true) or horizontal (false)
   * @param directionFlag - Flag to preserve current direction
   */
  SegLTopToLeft(
    actionType: number,
    point: Point,
    primaryFactor: number,
    secondaryFactor: number,
    isVertical: boolean,
    directionFlag: boolean
  ) {
    T3Util.Log("= S.SegmentedLine: SegLTopToLeft input", { actionType, point, primaryFactor, secondaryFactor, isVertical, directionFlag });

    // Variable declarations with meaningful names
    let coordU: number,
      coordP: number,
      rectTemp: number,
      isShortcutNeeded: boolean,
      isPreserveFormat: boolean,
      isPrimaryLessThanSecondary: boolean,
      hookObj: any,
      loopIndex: number,
      distance: number,
      totalPoints: number,
      startPrimary: number,
      startSecondary: number,
      endPrimary: number,
      endSecondary: number,
      hookStartAdjustment: number = 0,
      hookEndAdjustment: number = 0,
      isAutoInsertAllowed: boolean = false,
      boundingRect: any = {},
      maxDimensions: Point = {
        x: 0,
        y: 0
      };

    const segmentDimension = OptConstant.Common.DimMax;

    // Check if auto-insert is allowed
    DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    if (DrawUtil.AllowAutoInsert()) {
      isAutoInsertAllowed = true;
    }

    // Calculate dimensions
    Math.abs(this.EndPoint.x - this.StartPoint.x);
    Math.abs(this.EndPoint.y - this.StartPoint.y);

    // Set up coordinates based on orientation
    if (isVertical) {
      startPrimary = this.StartPoint.y;
      startSecondary = this.StartPoint.x;
      endPrimary = this.EndPoint.y;
      endSecondary = this.EndPoint.x;
      boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

      // Swap x and y for vertical orientation
      rectTemp = boundingRect.x;
      boundingRect.x = boundingRect.y;
      boundingRect.y = rectTemp;

      T3Gv.opt.GetMaxDim(maxDimensions);
      rectTemp = maxDimensions.x;
      maxDimensions.x = maxDimensions.y;
      maxDimensions.y = rectTemp;
    } else {
      startPrimary = this.StartPoint.x;
      startSecondary = this.StartPoint.y;
      endPrimary = this.EndPoint.x;
      endSecondary = this.EndPoint.y;
      boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      T3Gv.opt.GetMaxDim(maxDimensions);
    }

    // Get current points count and clear points
    totalPoints = this.segl.pts.length;
    this.segl.pts.splice(0);

    // Calculate conditions for format decisions
    isPrimaryLessThanSecondary = secondaryFactor == -1 ?
      startPrimary - 2 * OptConstant.Common.SegMinLen > endPrimary :
      startPrimary + 2 * OptConstant.Common.SegMinLen < endPrimary;

    isShortcutNeeded = primaryFactor == -1 ?
      endSecondary - 2 * OptConstant.Common.SegMinLen > startSecondary && isPrimaryLessThanSecondary :
      endSecondary + 2 * OptConstant.Common.SegMinLen < startSecondary && isPrimaryLessThanSecondary;

    // Override format based on action type or flag
    if (actionType === OptConstant.ActionTriggerType.SeglPreserve) {
      isShortcutNeeded = totalPoints !== 5;
    }

    if (directionFlag) {
      isShortcutNeeded = true;
    }

    // Shortcut case: create simple 3-point line
    if (isShortcutNeeded) {
      this.segl.lengths.splice(0);

      // Add points based on orientation
      if (isVertical) {
        this.segl.pts.push(new Point(startSecondary - boundingRect.y, startPrimary - boundingRect.x));
        this.segl.pts.push(new Point(endSecondary - boundingRect.y, startPrimary - boundingRect.x));
        this.segl.pts.push(new Point(endSecondary - boundingRect.y, endPrimary - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(startPrimary - boundingRect.x, startSecondary - boundingRect.y));
        this.segl.pts.push(new Point(startPrimary - boundingRect.x, endSecondary - boundingRect.y));
        this.segl.pts.push(new Point(endPrimary - boundingRect.x, endSecondary - boundingRect.y));
      }
    } else {
      // Complex case: create 5-point segmented line

      // Check for primary/secondary relationship
      isPrimaryLessThanSecondary = startPrimary < endPrimary;

      // Clear lengths array if we don't have exactly 5 points
      if (totalPoints != 5) {
        this.segl.lengths.splice(0);
      }

      // Process hooks for adjustments
      if (this.hooks) {
        if (isPrimaryLessThanSecondary) {
          if (secondaryFactor === -1) {
            // Calculate hook start adjustment
            hookStartAdjustment = isVertical ?
              this.EndPoint.y + OptConstant.Common.SegDefLen :
              this.EndPoint.x + OptConstant.Common.SegDefLen;

            // Look for hook at KTR point
            for (loopIndex = 0; loopIndex < this.hooks.length; loopIndex++) {
              if (this.hooks[loopIndex].hookpt === OptConstant.HookPts.KTR) {
                hookObj = DataUtil.GetObjectPtr(this.hooks[loopIndex].objid, false);
                if (hookObj) {
                  const hookRect = hookObj.GetTargetRect();
                  const heightDiff = startSecondary - (hookRect.y + hookRect.height);

                  // Determine hook end adjustment based on connection point and space
                  hookEndAdjustment = heightDiff < OptConstant.Common.SegDefLen + OptConstant.Common.SegMinLen ?
                    isVertical ?
                      this.EndPoint.x - hookRect.width * (this.hooks[loopIndex].connect.x / segmentDimension) - OptConstant.Common.SegDefLen :
                      this.EndPoint.y - hookRect.height * (this.hooks[loopIndex].connect.y / segmentDimension) - OptConstant.Common.SegDefLen
                    : isVertical ?
                      this.EndPoint.x + hookRect.width * ((segmentDimension - this.hooks[loopIndex].connect.x) / segmentDimension) + OptConstant.Common.SegDefLen :
                      this.EndPoint.y + hookRect.height * ((segmentDimension - this.hooks[loopIndex].connect.y) / segmentDimension) + OptConstant.Common.SegDefLen;
                }
                break;
              }
            }
          } else {
            // Handle other factor cases
            for (loopIndex = 0; loopIndex < this.hooks.length; loopIndex++) {
              if (this.hooks[loopIndex].hookpt === OptConstant.HookPts.KTR) {
                hookObj = DataUtil.GetObjectPtr(this.hooks[loopIndex].objid, false);
                if (hookObj) {
                  const hookRect = hookObj.GetTargetRect();
                  hookStartAdjustment = isVertical ?
                    this.StartPoint.y + hookRect.height / 2 + OptConstant.Common.SegDefLen :
                    this.StartPoint.x + hookRect.width / 2 + OptConstant.Common.SegDefLen;
                }
                break;
              }
            }
          }
        } else {
          // Handle the case where primary is greater than or equal to secondary
          for (loopIndex = 0; loopIndex < this.hooks.length; loopIndex++) {
            if (this.hooks[loopIndex].hookpt === OptConstant.HookPts.KTR) {
              hookObj = DataUtil.GetObjectPtr(this.hooks[loopIndex].objid, false);
              if (hookObj) {
                const hookRect = hookObj.GetTargetRect();
                hookEndAdjustment = isVertical ?
                  this.EndPoint.x - hookRect.width / 2 - OptConstant.Common.SegDefLen :
                  this.EndPoint.y - hookRect.height / 2 - OptConstant.Common.SegDefLen;
              }
              break;
            }
          }
        }
      }

      // Reset adjustments if auto-insert is allowed
      if (isAutoInsertAllowed) {
        hookEndAdjustment = 0;
        hookStartAdjustment = 0;
      }

      // Add the first point based on orientation
      if (isVertical) {
        this.segl.pts.push(new Point(startSecondary - boundingRect.y, startPrimary - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(startPrimary - boundingRect.x, startSecondary - boundingRect.y));
      }

      // Ensure we have at least one length
      if (this.segl.lengths.length < 1) {
        this.segl.lengths.push(OptConstant.Common.SegDefLen);
      }

      // Handle SEGL_ONE action type
      if (actionType === OptConstant.ActionTriggerType.SeglOne) {
        this.segl.lengths[0] = isVertical ?
          primaryFactor * (startSecondary - point.x) :
          primaryFactor * (startSecondary - point.y);

        // Ensure minimum length
        if (this.segl.lengths[0] < OptConstant.Common.SegMinLen) {
          this.segl.lengths[0] = OptConstant.Common.SegMinLen;
        }
      }

      // Calculate primary distance
      distance = primaryFactor * this.segl.lengths[0];

      // Adjust distance based on hooks and primary/secondary relationship
      if (isPrimaryLessThanSecondary) {
        if (hookEndAdjustment) {
          distance = startSecondary - hookEndAdjustment;
          if (distance < OptConstant.Common.SegDefLen) {
            distance = OptConstant.Common.SegDefLen;
          }
          if (distance < this.segl.lengths[0]) {
            distance = primaryFactor * this.segl.lengths[0];
          }
        }
      } else {
        if (hookEndAdjustment) {
          distance = startSecondary - hookEndAdjustment;
          if (primaryFactor === -1) {
            if (-distance < OptConstant.Common.SegDefLen) {
              distance = -OptConstant.Common.SegDefLen;
            }
          } else if (distance < OptConstant.Common.SegDefLen) {
            distance = OptConstant.Common.SegDefLen;
          }

          if (this.segl.lengths[0] < primaryFactor * distance) {
            distance = primaryFactor * this.segl.lengths[0];
          }
        }
      }

      // Ensure length consistency
      if (this.segl.lengths[0] > primaryFactor * distance) {
        distance = primaryFactor * this.segl.lengths[0];
      }

      // Calculate coordinate U and ensure it's within bounds
      coordU = startSecondary - distance;
      if (coordU < 0) {
        coordU = 0;
      }
      if (coordU > maxDimensions.y) {
        coordU = maxDimensions.y;
      }

      // Add second point based on orientation
      if (isVertical) {
        this.segl.pts.push(new Point(coordU - boundingRect.y, startPrimary - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(startPrimary - boundingRect.x, coordU - boundingRect.y));
      }

      // Ensure we have at least two lengths
      if (this.segl.lengths.length < 2) {
        this.segl.lengths.push(OptConstant.Common.SegDefLen);
      }

      // Handle SEGL_TWO action type (adjust second segment)
      if (actionType === OptConstant.ActionTriggerType.SeglTwo) {
        if (isPrimaryLessThanSecondary) {
          if (isVertical) {
            // Adjust point y for vertical orientation
            if (secondaryFactor === -1) {
              if (point.y < endPrimary + OptConstant.Common.SegDefLen) {
                point.y = endPrimary + OptConstant.Common.SegDefLen;
              }
            } else if (point.y > endPrimary - OptConstant.Common.SegDefLen) {
              point.y = endPrimary - OptConstant.Common.SegDefLen;
            }
            this.segl.lengths[1] = Math.abs(point.y - startPrimary);
          } else {
            // Adjust point x for horizontal orientation
            if (secondaryFactor === -1) {
              if (point.x < endPrimary + OptConstant.Common.SegDefLen) {
                point.x = endPrimary + OptConstant.Common.SegDefLen;
              }
            } else if (point.x > endPrimary - OptConstant.Common.SegDefLen) {
              point.x = endPrimary - OptConstant.Common.SegDefLen;
            }
            this.segl.lengths[1] = Math.abs(point.x - startPrimary);
          }
        } else {
          if (isVertical) {
            // Different constraints for reversed direction
            if (secondaryFactor === -1) {
              if (point.y < endPrimary - OptConstant.Common.SegMinLen) {
                point.y = endPrimary - OptConstant.Common.SegMinLen;
              }
            } else if (point.y > endPrimary + OptConstant.Common.SegMinLen) {
              point.y = endPrimary + OptConstant.Common.SegMinLen;
            }
            this.segl.lengths[1] = Math.abs(point.y - startPrimary);
          } else {
            // Ensure minimum segment length for horizontal
            if (point.x > startPrimary - OptConstant.Common.SegMinLen) {
              point.x = startPrimary - OptConstant.Common.SegMinLen;
            }
            this.segl.lengths[1] = Math.abs(point.x - startPrimary);
          }
        }
      }

      // Calculate coordinate P based on primary/secondary relationship
      if (isPrimaryLessThanSecondary) {
        distance = this.segl.lengths[1];
        if (hookStartAdjustment && hookStartAdjustment > this.segl.lengths[1] + startPrimary) {
          distance = hookStartAdjustment - startPrimary;
        }
        coordP = startPrimary + distance;
        if (secondaryFactor == -1) {
          if (coordP <= endPrimary) {
            coordP = startPrimary + distance;
          }
        } else if (coordP >= endPrimary) {
          coordP = startPrimary - distance;
        }
      } else {
        coordP = startPrimary - this.segl.lengths[1];
        const tempCoord = endPrimary - secondaryFactor * OptConstant.Common.SegDefLen;
        if (secondaryFactor == -1 && this.segl.lengths[1] != OptConstant.Common.SegDefLen) {
          if (tempCoord > coordP) {
            coordP = tempCoord;
          }
        } else if (tempCoord < coordP) {
          coordP = tempCoord;
        }
      }

      // Ensure coordinate P is within bounds
      if (coordP < 0) {
        coordP = 0;
      }
      if (coordP > maxDimensions.x) {
        coordP = maxDimensions.x;
      }

      // Add remaining points based on orientation
      if (isVertical) {
        this.segl.pts.push(new Point(coordU - boundingRect.y, coordP - boundingRect.x));
        this.segl.pts.push(new Point(endSecondary - boundingRect.y, coordP - boundingRect.x));
        this.segl.pts.push(new Point(endSecondary - boundingRect.y, endPrimary - boundingRect.x));
      } else {
        this.segl.pts.push(new Point(coordP - boundingRect.x, coordU - boundingRect.y));
        this.segl.pts.push(new Point(coordP - boundingRect.x, endSecondary - boundingRect.y));
        this.segl.pts.push(new Point(endPrimary - boundingRect.x, endSecondary - boundingRect.y));
      }
    }

    T3Util.Log("= S.SegmentedLine: SegLTopToLeft output", {
      pts: this.segl.pts,
      lengths: this.segl.lengths
    });
  }

  /**
   * Calculates the appropriate corner size for curved segments of a segmented line
   *
   * @param cornerBaseSize - The base size to calculate from (typically segment length)
   * @param maxCornerSize - The maximum allowed corner size
   * @returns The calculated corner size, constrained by limits
   * @description
   * This function determines the proper corner radius to use at segment junctions
   * based on the input sizes and the line's curve parameter. It ensures corners
   * are proportional to segment lengths while respecting maximum constraints.
   */
  GetCornerSize(cornerBaseSize: number, maxCornerSize: number): number {
    T3Util.Log("= S.SegmentedLine: GetCornerSize input", { cornerBaseSize, maxCornerSize });

    // Choose the smaller of the two sizes as the base for calculation
    const baseSize = Math.min(cornerBaseSize, maxCornerSize);

    // Get the current curve parameter and define the maximum allowed curve (40% of base size)
    const currentCurve = this.segl.curveparam;
    const maxCurve = 0.4 * baseSize;

    // Limit the curve parameter to the maximum allowed value if necessary
    const cornerSize = currentCurve > maxCurve ? maxCurve : currentCurve;

    T3Util.Log("= S.SegmentedLine: GetCornerSize output", { cornerSize });
    return cornerSize;
  }

  /**
   * Generates an array of points representing the segmented line's path
   *
   * @param maxPointCount - The maximum number of points to generate
   * @param shouldTranslatePoints - Whether to translate points relative to the frame
   * @param shouldSkipCurves - Whether to skip curve generation at corners
   * @param reserved - Reserved parameter (unused)
   * @param extraOptions - Additional options for point generation
   * @returns Array of points defining the segmented line's path
   * @description
   * This function creates points that define the visual path of the segmented line.
   * It handles both straight segments and curved corners, properly accounting for
   * segment directions and corner radii. The points can be used to render the line
   * as an SVG polyline or for hit testing purposes.
   */
  GetPolyPoints(maxPointCount, shouldTranslatePoints, shouldSkipCurves, reserved, extraOptions?) {
    T3Util.Log("= S.SegmentedLine: GetPolyPoints input", {
      maxPointCount,
      shouldTranslatePoints,
      shouldSkipCurves,
      reserved,
      extraOptions
    });

    let polyPoints: Point[] = [];
    let cornerRadius = 0;

    if (this.segl && this.segl.pts.length) {
      const totalPoints = this.segl.pts.length;
      // If curve parameter > 0 and curves are not skipped, add curves to the polyline
      if (this.segl.curveparam > 0 && !shouldSkipCurves) {
        for (let pointIndex = 0; pointIndex < totalPoints; pointIndex++) {
          let prevSegmentLength = 0, nextSegmentLength = 0;
          let isVerticalSegment = false;
          let prevSegmentDirection: number, nextSegmentDirection: number;
          let curveSegmentPoints: Point[];

          if (pointIndex > 0 && pointIndex < totalPoints - 1) {
            // Calculate length from previous point
            if (this.segl.pts[pointIndex].x === this.segl.pts[pointIndex - 1].x) {
              prevSegmentLength = Math.abs(this.segl.pts[pointIndex].y - this.segl.pts[pointIndex - 1].y);
              isVerticalSegment = true;
              prevSegmentDirection = this.segl.pts[pointIndex].y - this.segl.pts[pointIndex - 1].y > 0 ? 1 : -1;
            } else {
              prevSegmentLength = Math.abs(this.segl.pts[pointIndex].x - this.segl.pts[pointIndex - 1].x);
              prevSegmentDirection = this.segl.pts[pointIndex].x - this.segl.pts[pointIndex - 1].x > 0 ? 1 : -1;
            }
            // Calculate length to next point
            if (this.segl.pts[pointIndex].x === this.segl.pts[pointIndex + 1].x) {
              nextSegmentLength = Math.abs(this.segl.pts[pointIndex].y - this.segl.pts[pointIndex + 1].y);
              nextSegmentDirection = this.segl.pts[pointIndex + 1].y - this.segl.pts[pointIndex].y > 0 ? 1 : -1;
            } else {
              nextSegmentLength = Math.abs(this.segl.pts[pointIndex].x - this.segl.pts[pointIndex + 1].x);
              nextSegmentDirection = this.segl.pts[pointIndex + 1].x - this.segl.pts[pointIndex].x > 0 ? 1 : -1;
            }
            // Calculate the corner size based on the segment lengths
            cornerRadius = this.GetCornerSize(prevSegmentLength, nextSegmentLength);

            // Depending on the orientation, adjust the point and add curve points
            if (isVerticalSegment) {
              polyPoints.push(new Point(this.segl.pts[pointIndex].x, this.segl.pts[pointIndex].y - cornerRadius * prevSegmentDirection));
              curveSegmentPoints = T3Gv.opt.LinesAddCurve(
                true,
                prevSegmentDirection,
                nextSegmentDirection,
                this.segl.pts[pointIndex].x,
                this.segl.pts[pointIndex].y,
                cornerRadius
              );
              polyPoints = polyPoints.concat(curveSegmentPoints);
            } else {
              polyPoints.push(new Point(this.segl.pts[pointIndex].x - cornerRadius * prevSegmentDirection, this.segl.pts[pointIndex].y));
              curveSegmentPoints = T3Gv.opt.LinesAddCurve(
                false,
                prevSegmentDirection,
                nextSegmentDirection,
                this.segl.pts[pointIndex].x,
                this.segl.pts[pointIndex].y,
                cornerRadius
              );
              polyPoints = polyPoints.concat(curveSegmentPoints);
            }
          } else {
            // For endpoints, simply push the original point
            polyPoints.push(new Point(this.segl.pts[pointIndex].x, this.segl.pts[pointIndex].y));
          }
        }
      } else {
        // No curve formatting requested, so simply clone all segmentation points
        for (let pointIndex = 0; pointIndex < totalPoints; pointIndex++) {
          polyPoints.push(new Point(this.segl.pts[pointIndex].x, this.segl.pts[pointIndex].y));
        }
      }

      // If translation flag is false, translate the points by the top-left of the bounding rectangle
      if (!shouldTranslatePoints) {
        const boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
        for (let pointIndex = 0; pointIndex < polyPoints.length; pointIndex++) {
          polyPoints[pointIndex].x += boundingRect.x;
          polyPoints[pointIndex].y += boundingRect.y;
        }
      }
    } else {
      // Fallback to base class implementation if no segmentation points available
      polyPoints = super.GetPolyPoints(maxPointCount, shouldTranslatePoints, true, extraOptions);
    }

    T3Util.Log("= S.SegmentedLine: GetPolyPoints output", polyPoints);
    return polyPoints;
  }

  /**
   * Handles pre-tracking operations when drawing the segmented line
   *
   * @param svgDoc - The SVG document context
   * @returns True if pre-tracking operations completed successfully
   * @description
   * This function is called before tracking the line during drawing operations.
   * It handles directional setup based on connected objects and ensures proper
   * initialization for the line's start and end points. The function determines
   * proper segmentation direction flags based on connected shapes.
   */
  LMDrawPreTrack(svgDoc) {
    T3Util.Log("= S.SegmentedLine: LMDrawPreTrack input", { svgDoc });

    // Call the base class method and log its result
    const basePreTrackResult = super.LMDrawPreTrack(svgDoc);
    T3Util.Log("= S.SegmentedLine: Base LMDrawPreTrack output", { basePreTrackResult });

    let connectedObject;
    if (
      T3Gv.opt.linkParams &&
      T3Gv.opt.linkParams.SConnectIndex >= 0
    ) {
      connectedObject = DataUtil.GetObjectPtr(
        T3Gv.opt.linkParams.SConnectIndex,
        false
      );
      if (connectedObject) {
        this.segl.firstdir = connectedObject.GetSegLFace(
          T3Gv.opt.linkParams.ConnectPt,
          this.EndPoint,
          svgDoc
        );
        T3Util.Log("= S.SegmentedLine: Updated segl.firstdir", {
          firstdir: this.segl.firstdir
        });
      }
    }

    T3Util.Log("= S.SegmentedLine: LMDrawPreTrack output", { result: true });
    return true;
  }

  /**
   * Adjusts the segmented line based on a new point and trigger type
   *
   * @param svgDoc - The SVG document context
   * @param newX - The new X coordinate for adjustment
   * @param newY - The new Y coordinate for adjustment
   * @param triggerType - The type of adjustment trigger (start point, end point, segment)
   * @description
   * This function updates the segmented line when one of its points (start, end, or segment)
   * is moved. It recalculates the line's geometry, updates its frame dimensions, and
   * refreshes the visual representation in the SVG document. The function handles
   * both the visible line shape and its "slop" shape used for interaction.
   */
  AdjustLine(svgDoc, newX, newY, triggerType) {
    T3Util.Log("= S.SegmentedLine: AdjustLine input", { svgDoc, newX, newY, triggerType });

    let visibleLineShape, interactionLineShape;
    if (svgDoc) {
      visibleLineShape = svgDoc.GetElementById(OptConstant.SVGElementClass.Shape);
      interactionLineShape = svgDoc.GetElementById(OptConstant.SVGElementClass.Slop);
    }

    const adjustmentPoint = new Point(newX, newY);
    this.SegLFormat(adjustmentPoint, triggerType, 0);
    this.CalcFrame();

    const boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    // Get the updated polyline points with readable parameters
    const polylinePoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, false, false, null);

    if (svgDoc) {
      svgDoc.SetSize(this.Frame.width, this.Frame.height);
      svgDoc.SetPos(boundingRect.x, boundingRect.y);

      visibleLineShape.SetSize(this.Frame.width, this.Frame.height);
      this.UpdateSVG(visibleLineShape, polylinePoints);

      interactionLineShape.SetSize(this.Frame.width, this.Frame.height);
      this.UpdateSVG(interactionLineShape, polylinePoints);

      new SelectionAttr();
      this.UpdateDimensionLines(svgDoc);

      UIUtil.UpdateDisplayCoordinates(
        this.Frame,
        adjustmentPoint,
        CursorConstant.CursorTypes.Grow,
        this
      );

      if (this.DataID !== -1) {
        this.LMResizeSVGTextObject(svgDoc, this, this.Frame);
      }
    }

    T3Util.Log("= S.SegmentedLine: AdjustLine output", { Frame: this.Frame, adjustmentPoint });
  }

  /**
   * Adjusts the end point of the segmented line
   *
   * @param svgDocument - The SVG document containing the line
   * @param newEndX - The new X coordinate for the end point
   * @param newEndY - The new Y coordinate for the end point
   * @param triggerType - The type of action triggering this adjustment
   * @description
   * Updates the line's end point while maintaining the proper connections and
   * enforcing minimum dimensions. Updates direction properties based on connected objects.
   */
  AdjustLineEnd(svgDocument, newEndX, newEndY, triggerType) {
    T3Util.Log("= S.SegmentedLine: AdjustLineEnd input", { svgDocument, newEndX, newEndY, triggerType });

    // Save current endpoint values
    const originalEndPoint = { x: this.EndPoint.x, y: this.EndPoint.y };

    // Temporarily update EndPoint to new values and enforce minimum dimensions
    this.EndPoint.x = newEndX;
    this.EndPoint.y = newEndY;
    this.EnforceMinimum(false);

    // Use the enforced new values
    newEndX = this.EndPoint.x;
    newEndY = this.EndPoint.y;

    // Restore original EndPoint
    this.EndPoint.x = originalEndPoint.x;
    this.EndPoint.y = originalEndPoint.y;

    // Create an adjusted endpoint object for direction calculation
    const adjustedEndPoint = { x: newEndX, y: newEndY };

    // Update directional properties based on connected object if applicable
    if (T3Gv.opt.linkParams && T3Gv.opt.linkParams.ConnectIndex >= 0) {
      const connectedObject = DataUtil.GetObjectPtr(T3Gv.opt.linkParams.ConnectIndex, false);
      if (connectedObject) {
        this.segl.lastdir = connectedObject.GetSegLFace(
          T3Gv.opt.linkParams.ConnectPt,
          this.StartPoint,
          adjustedEndPoint
        );
      }
    } else if (T3Gv.opt.ob && T3Gv.opt.ob.BlockID === this.BlockID) {
      this.segl.firstdir = T3Gv.opt.ob.segl.firstdir;
      this.segl.lastdir = T3Gv.opt.ob.segl.lastdir;
    }

    // Adjust the line using the svg document and the new endpoint values
    this.AdjustLine(svgDocument, newEndX, newEndY, OptConstant.ActionTriggerType.LineEnd);

    T3Util.Log("= S.SegmentedLine: AdjustLineEnd output", { EndPoint: this.EndPoint, segl: this.segl });
  }

  /**
   * Adjusts the start point of the segmented line
   *
   * @param svgDocument - The SVG document containing the line
   * @param newStartX - The new X coordinate for the start point
   * @param newStartY - The new Y coordinate for the start point
   * @description
   * Updates the line's start point while maintaining the proper connections,
   * enforcing minimum dimensions, and adjusting segment lengths accordingly.
   * Updates direction properties based on connected objects.
   */
  AdjustLineStart(svgDocument, newStartX, newStartY) {
    T3Util.Log("= S.SegmentedLine: AdjustLineStart input", { svgDocument, newStartX, newStartY });

    // Save the original StartPoint values
    const originalStartPoint = {
      x: this.StartPoint.x,
      y: this.StartPoint.y,
    };

    // Minimum allowed dimension value
    const minDimension = OptConstant.Common.MinDim;

    // Temporarily update StartPoint to the new position and enforce minimum dimensions
    this.StartPoint.x = newStartX;
    this.StartPoint.y = newStartY;
    this.EnforceMinimum(true);

    // Get the adjusted values after enforcing minimum dimensions
    const adjustedStartX = this.StartPoint.x;
    const adjustedStartY = this.StartPoint.y;

    // Restore original StartPoint for further calculations
    this.StartPoint.x = originalStartPoint.x;
    this.StartPoint.y = originalStartPoint.y;

    // Adjust the first segmentation length based on the orientation
    if (this.segl.pts[0].x === this.segl.pts[1].x) {
      // Vertical line: adjust based on Y difference
      this.segl.lengths[0] += this.StartPoint.y - adjustedStartY;
      if (this.segl.lengths[0] < minDimension) {
        this.segl.lengths[0] = minDimension;
      }
    } else {
      // Horizontal line: adjust based on X difference
      this.segl.lengths[0] += this.StartPoint.x - adjustedStartX;
      if (this.segl.lengths[0] < minDimension) {
        this.segl.lengths[0] = minDimension;
      }
    }

    // Prepare the connection point using the adjusted coordinates
    const connectionPoint = { x: adjustedStartX, y: adjustedStartY };

    // Update segl.firstdir based on a connected object if available
    if (T3Gv.opt.linkParams && T3Gv.opt.linkParams.ConnectIndex >= 0) {
      const connectedObject = DataUtil.GetObjectPtr(T3Gv.opt.linkParams.ConnectIndex, false);
      if (connectedObject) {
        this.segl.firstdir = connectedObject.GetSegLFace(
          T3Gv.opt.linkParams.ConnectPt,
          this.EndPoint,
          connectionPoint
        );
      }
    } else if (T3Gv.opt.ob && T3Gv.opt.ob.BlockID === this.BlockID) {
      // Fallback to using the current object's directional values
      this.segl.firstdir = T3Gv.opt.ob.segl.firstdir;
      this.segl.lastdir = T3Gv.opt.ob.segl.lastdir;
    }

    // Adjust the line using the updated parameters
    this.AdjustLine(svgDocument, adjustedStartX, adjustedStartY, OptConstant.ActionTriggerType.LineStart);

    T3Util.Log("= S.SegmentedLine: AdjustLineStart output", {
      originalStartPoint,
      adjustedPoint: connectionPoint,
      seglFirstDir: this.segl.firstdir,
      seglLength0: this.segl.lengths[0]
    });
  }

  /**
   * Gets the basic width and height dimensions of the segmented line
   *
   * @returns Object containing width (x) and height (y) of the line
   * @description
   * Calculates the absolute difference between the start and end points
   * to determine the overall dimensions of the segmented line.
   */
  GetDimensions() {
    T3Util.Log("= S.SegmentedLine: GetDimensions input", {
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint
    });

    const width = Math.abs(this.EndPoint.x - this.StartPoint.x);
    const height = Math.abs(this.EndPoint.y - this.StartPoint.y);
    const dimensions = { x: width, y: height };

    T3Util.Log("= S.SegmentedLine: GetDimensions output", dimensions);
    return dimensions;
  }

  /**
   * Gets the dimensions needed for display purposes
   *
   * @returns Object containing the position and size information for display
   * @description
   * Returns the frame dimensions of the segmented line which include the
   * entire area covered by all segments, not just the direct start-to-end dimensions.
   */
  GetDimensionsForDisplay() {
    T3Util.Log("= S.SegmentedLine: GetDimensionsForDisplay input", { Frame: this.Frame });

    const displayDimensions = {
      x: this.Frame.x,
      y: this.Frame.y,
      width: this.Frame.width,
      height: this.Frame.height
    };

    T3Util.Log("= S.SegmentedLine: GetDimensionsForDisplay output", displayDimensions);
    return displayDimensions;
  }

  /**
   * Updates the dimensions of the segmented line based on offsets
   *
   * @param offsetElement - The element to offset
   * @param offsetX - The X offset to apply
   * @param offsetY - The Y offset to apply
   * @description
   * Adjusts the end point of the line based on the provided offsets relative to
   * the start point, allowing for dimensional changes to be applied.
   */
  UpdateDimensions(offsetElement, offsetX, offsetY) {
    T3Util.Log("= S.SegmentedLine: UpdateDimensions input", { offsetElement, offsetX, offsetY });

    const svgObject = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    const newEndX = offsetX ? this.StartPoint.x + offsetX : this.EndPoint.x;
    const newEndY = offsetY ? this.StartPoint.y + offsetY : this.EndPoint.y;

    T3Util.Log("= S.SegmentedLine: UpdateDimensions computed", { newEndX, newEndY });
    this.AdjustLineEnd(svgObject, newEndX, newEndY, OptConstant.ActionTriggerType.LineEnd);

    T3Util.Log("= S.SegmentedLine: UpdateDimensions output", { EndPoint: this.EndPoint });
  }

  /**
   * Sets the size of the segmented line to new dimensions
   *
   * @param newWidth - The desired width for the line
   * @param newHeight - The desired height for the line
   * @param forceFlag - Flag to force the size change
   * @description
   * Adjusts either the start or end point of the line to achieve the desired
   * dimensions, preserving the opposite point. The adjustment is made based on
   * the relative positions of the start and end points.
   */
  SetSize(newWidth, newHeight, forceFlag) {
    T3Util.Log("= S.SegmentedLine: SetSize input", { newWidth, newHeight, forceFlag });

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
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
    }

    // Determine adjustment mode based on StartPoint and EndPoint ordering
    if (
      this.StartPoint.x < this.EndPoint.x ||
      (Utils2.IsEqual(this.StartPoint.x, this.EndPoint.x) && this.StartPoint.y < this.EndPoint.y)
    ) {
      isEndAdjusted = true;
    }

    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);

    // Adjust line end or start based on order
    if (isEndAdjusted) {
      this.AdjustLineEnd(svgElement, this.EndPoint.x + deltaWidth, this.EndPoint.y + deltaHeight, 0);
    } else {
      this.AdjustLineStart(svgElement, this.StartPoint.x + deltaWidth, this.StartPoint.y + deltaHeight, 0);
    }

    OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.SED_L_MOVE);
    T3Util.Log("= S.SegmentedLine: SetSize output", { deltaWidth, deltaHeight, isEndAdjusted });
  }

  /**
   * Flips the segmented line horizontally and/or vertically
   *
   * @param flipFlags - Bitmask specifying flip direction (FlipVert, FlipHoriz, or both)
   * @description
   * This function handles both horizontal and vertical flips of a segmented line.
   * It updates the directional flags, recalculates all segmentation points,
   * and properly repositions the line maintaining its connections.
   * The function also updates any text associated with the line.
   */
  Flip(flipFlags: number): void {
    T3Util.Log("= S.SegmentedLine: Flip input", { flipFlags });
    let isFlipped = false;
    let boundingRect: any;
    let pointIndex: number;
    let repositionOffset: number;
    let temporaryPoints: Point[] = [];
    const directionConstants = NvConstant.SegLDir;

    // Create a backup of current object
    T3Gv.opt.ob = Utils1.DeepCopy(this);

    // Process vertical flip if flag is set
    if (flipFlags & OptConstant.ExtraFlags.FlipVert) {
      isFlipped = true;

      // Flip first directional flag vertically
      switch (this.segl.firstdir) {
        case directionConstants.Ktc: // Top center to bottom center
          this.segl.firstdir = directionConstants.Kbc;
          break;
        case directionConstants.Kbc: // Bottom center to top center
          this.segl.firstdir = directionConstants.Ktc;
          break;
      }

      // Flip last directional flag vertically
      switch (this.segl.lastdir) {
        case directionConstants.Ktc: // Top center to bottom center
          this.segl.lastdir = directionConstants.Kbc;
          break;
        case directionConstants.Kbc: // Bottom center to top center
          this.segl.lastdir = directionConstants.Ktc;
          break;
      }

      // Calculate the rectangle from start to end points
      boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      const numPoints = this.segl.pts.length;

      // Adjust each point: shift relative to the rectangle and frame
      for (pointIndex = 0; pointIndex < numPoints; pointIndex++) {
        temporaryPoints.push(
          new Point(this.segl.pts[pointIndex].x, this.segl.pts[pointIndex].y + boundingRect.y - this.Frame.y)
        );
      }

      // Flip the vertical positions based on frame height
      const frameHeight = this.Frame.height;
      for (pointIndex = 0; pointIndex < numPoints; pointIndex++) {
        temporaryPoints[pointIndex].y = frameHeight - temporaryPoints[pointIndex].y;
      }

      // Update StartPoint and EndPoint y coordinates
      this.StartPoint.y = temporaryPoints[0].y + this.Frame.y;
      this.EndPoint.y = temporaryPoints[numPoints - 1].y + this.Frame.y;

      // Compute adjustment offset based on which point is higher
      repositionOffset =
        this.EndPoint.y < this.StartPoint.y
          ? this.EndPoint.y - this.Frame.y
          : this.StartPoint.y - this.Frame.y;

      // Reposition the segmentation points
      for (pointIndex = 0; pointIndex < numPoints; pointIndex++) {
        this.segl.pts[pointIndex].y = temporaryPoints[pointIndex].y - repositionOffset;
      }

      // Clear temporary points for reuse
      temporaryPoints = [];
    }

    // Process horizontal flip if flag is set
    if (flipFlags & OptConstant.ExtraFlags.FlipHoriz) {
      isFlipped = true;

      // Flip first directional flag horizontally
      switch (this.segl.firstdir) {
        case directionConstants.Klc: // Left center to right center
          this.segl.firstdir = directionConstants.Krc;
          break;
        case directionConstants.Krc: // Right center to left center
          this.segl.firstdir = directionConstants.Klc;
          break;
      }

      // Flip last directional flag horizontally
      switch (this.segl.lastdir) {
        case directionConstants.Klc: // Left center to right center
          this.segl.lastdir = directionConstants.Krc;
          break;
        case directionConstants.Krc: // Right center to left center
          this.segl.lastdir = directionConstants.Klc;
          break;
      }

      // Calculate the rectangle from start to end points
      boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      const numPoints = this.segl.pts.length;

      // Adjust each point: shift relative to the rectangle and frame
      for (pointIndex = 0; pointIndex < numPoints; pointIndex++) {
        temporaryPoints.push(
          new Point(this.segl.pts[pointIndex].x + boundingRect.x - this.Frame.x, this.segl.pts[pointIndex].y)
        );
      }

      // Flip the horizontal positions based on frame width
      const frameWidth = this.Frame.width;
      for (pointIndex = 0; pointIndex < numPoints; pointIndex++) {
        temporaryPoints[pointIndex].x = frameWidth - temporaryPoints[pointIndex].x;
      }

      // Update StartPoint and EndPoint x coordinates
      this.StartPoint.x = temporaryPoints[0].x + this.Frame.x;
      this.EndPoint.x = temporaryPoints[numPoints - 1].x + this.Frame.x;

      // Compute adjustment offset based on which point is more to the left
      repositionOffset =
        this.EndPoint.x < this.StartPoint.x
          ? this.EndPoint.x - this.Frame.x
          : this.StartPoint.x - this.Frame.x;

      // Reposition the segmentation points
      for (pointIndex = 0; pointIndex < numPoints; pointIndex++) {
        this.segl.pts[pointIndex].x = temporaryPoints[pointIndex].x - repositionOffset;
      }

      // Clear temporary points
      temporaryPoints = [];
    }

    // If any flip occurred, update the text object and maintain links
    if (isFlipped) {
      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
      if (this.DataID !== -1) {
        this.LMResizeSVGTextObject(svgElement, this, this.Frame);
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

    T3Gv.opt.ob = {};
    T3Util.Log("= S.SegmentedLine: Flip output", {
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint,
      segl: this.segl,
    });
  }

  /**
   * Finds intersection points between the segmented line and a specified frame
   *
   * @param intersectFrame - The frame rectangle to check for intersections
   * @param shapeDoc - The document containing the shapes
   * @param outputPoints - Array to store the resulting intersection points
   * @param resultContext - Object to store additional result information
   * @returns Boolean indicating whether any intersections were found
   * @description
   * This function checks each segment of the segmented line to determine if and where
   * it intersects with the provided frame. It handles both vertical and horizontal segments
   * separately and calculates the exact intersection points. The function is primarily used
   * for auto-insertion of components along the line.
   */
  GetFrameIntersects(intersectFrame: any, shapeDoc: any, outputPoints: Point[], resultContext: any): boolean {
    T3Util.Log("= S.SegmentedLine: GetFrameIntersects input", { intersectFrame, shapeDoc, outputPoints, resultContext });

    const minimumSegmentLength = 2 * OptConstant.Common.SegMinLen;

    // Get the bounding rect of the entire segmented line object
    const segmentedLineRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

    // Translate the given frame by subtracting the segmented line's origin
    let localFrame: any = {
      x: intersectFrame.x - segmentedLineRect.x,
      y: intersectFrame.y - segmentedLineRect.y,
      width: intersectFrame.width,
      height: intersectFrame.height
    };

    const totalPoints = this.segl.pts.length;

    // Loop through each segment
    for (let segmentIndex = 1; segmentIndex < totalPoints; segmentIndex++) {
      // Check if the segment is vertical (x coordinates are equal)
      if (this.segl.pts[segmentIndex].x === this.segl.pts[segmentIndex - 1].x) {
        // Determine vertical min and max Y
        let segmentMinY = this.segl.pts[segmentIndex].y < this.segl.pts[segmentIndex - 1].y ?
          this.segl.pts[segmentIndex].y : this.segl.pts[segmentIndex - 1].y;
        let segmentMaxY = this.segl.pts[segmentIndex].y > this.segl.pts[segmentIndex - 1].y ?
          this.segl.pts[segmentIndex].y : this.segl.pts[segmentIndex - 1].y;

        // The common X coordinate for vertical segments
        const segmentX = this.segl.pts[segmentIndex].x;

        // Check if vertical segment spans across the frame with sufficient length
        if ((segmentMinY + minimumSegmentLength < localFrame.y) &&
          (segmentMaxY - minimumSegmentLength > localFrame.y + localFrame.height) &&
          (segmentX > localFrame.x) &&
          (segmentX < localFrame.x + localFrame.width)) {

          shapeDoc.AdjustAutoInsertShape(intersectFrame, true);
          resultContext.AutoSeg = segmentIndex;

          // Update localFrame with original values
          localFrame = {
            x: intersectFrame.x - segmentedLineRect.x,
            y: intersectFrame.y - segmentedLineRect.y,
            width: intersectFrame.width,
            height: intersectFrame.height
          };

          // Add intersection points based on segment direction
          if (this.segl.pts[segmentIndex - 1].y < this.segl.pts[segmentIndex].y) {
            // Direction is bottom to top
            outputPoints.push(new Point(segmentX + segmentedLineRect.x, localFrame.y + segmentedLineRect.y));
            outputPoints[0].index = segmentIndex;
            outputPoints.push(new Point(segmentX + segmentedLineRect.x, localFrame.y + localFrame.height + segmentedLineRect.y));
            outputPoints[1].index = segmentIndex;
          } else {
            // Direction is top to bottom
            outputPoints.push(new Point(segmentX + segmentedLineRect.x, localFrame.y + localFrame.height + segmentedLineRect.y));
            outputPoints.push(new Point(segmentX + segmentedLineRect.x, localFrame.y + segmentedLineRect.y));
            outputPoints[0].index = segmentIndex;
            outputPoints[1].index = segmentIndex;
          }

          T3Util.Log("= S.SegmentedLine: GetFrameIntersects output", {
            outputPoints,
            resultContext,
            hitSegment: segmentIndex
          });

          return true;
        }
      } else {
        // Horizontal segment - determine minimal and maximal X values
        let segmentMinX = this.segl.pts[segmentIndex].x < this.segl.pts[segmentIndex - 1].x ?
          this.segl.pts[segmentIndex].x : this.segl.pts[segmentIndex - 1].x;
        let segmentMaxX = this.segl.pts[segmentIndex].x > this.segl.pts[segmentIndex - 1].x ?
          this.segl.pts[segmentIndex].x : this.segl.pts[segmentIndex - 1].x;

        // Common Y coordinate for horizontal segments
        const segmentY = this.segl.pts[segmentIndex].y;

        // Check if horizontal segment spans across the frame with sufficient length
        if ((segmentMinX + minimumSegmentLength < localFrame.x) &&
          (segmentMaxX - minimumSegmentLength > localFrame.x + localFrame.width) &&
          (segmentY > localFrame.y) &&
          (segmentY < localFrame.y + localFrame.height)) {

          shapeDoc.AdjustAutoInsertShape(intersectFrame, false);
          resultContext.AutoSeg = segmentIndex;

          localFrame = {
            x: intersectFrame.x - segmentedLineRect.x,
            y: intersectFrame.y - segmentedLineRect.y,
            width: intersectFrame.width,
            height: intersectFrame.height
          };

          // Add intersection points based on segment direction
          if (this.segl.pts[segmentIndex - 1].x < this.segl.pts[segmentIndex].x) {
            // Direction is left to right
            outputPoints.push(new Point(localFrame.x + segmentedLineRect.x, segmentY + segmentedLineRect.y));
            outputPoints.push(new Point(localFrame.x + localFrame.width + segmentedLineRect.x, segmentY + segmentedLineRect.y));
            outputPoints[0].index = segmentIndex;
            outputPoints[1].index = segmentIndex;
          } else {
            // Direction is right to left
            outputPoints.push(new Point(localFrame.x + localFrame.width + segmentedLineRect.x, segmentY + segmentedLineRect.y));
            outputPoints.push(new Point(localFrame.x + segmentedLineRect.x, segmentY + segmentedLineRect.y));
            outputPoints[0].index = segmentIndex;
            outputPoints[1].index = segmentIndex;
          }

          T3Util.Log("= S.SegmentedLine: GetFrameIntersects output", {
            outputPoints,
            resultContext,
            hitSegment: segmentIndex
          });

          return true;
        }
      }
    }

    T3Util.Log("= S.SegmentedLine: GetFrameIntersects output", { result: false });
    return false;
  }

  /**
   * Determines whether this shape type can be rotated
   *
   * @returns Always returns true indicating segmented lines cannot be rotated
   * @description
   * This function is called during rotation operations to determine if the
   * segmented line should be allowed to rotate. For segmented lines, rotation
   * is not supported - they must be manipulated using other means such as
   * flipping or adjusting segment points.
   */
  NoRotate(): boolean {
    T3Util.Log("= S.SegmentedLine: NoRotate input", {});
    const result = true;
    T3Util.Log("= S.SegmentedLine: NoRotate output", result);
    return result;
  }

  /**
   * Calculates the optimal position for text along a segmented line
   *
   * @param textPositioningParams - Parameters for text positioning and alignment
   * @description
   * This function determines where text should be positioned along a segmented line by:
   * - Identifying the line segment closest to the center point of the text
   * - Calculating distances along and perpendicular to the chosen segment
   * - Computing proportional positions for proper text alignment
   * - Setting text orientation flags for proper display
   *
   * The function handles both vertical and horizontal segments differently and calculates
   * the position as a proportion of the total line length, which is stored in LineTextX.
   * The perpendicular offset from the line is stored in LineTextY.
   */
  CalcTextPosition(textPositioningParams) {
    T3Util.Log("= S.SegmentedLine: CalcTextPosition input", { textPositioningParams });

    // Calculate the center of the text position relative to the object's frame
    const centerPoint = {
      x: textPositioningParams.Frame.x + textPositioningParams.Frame.width / 2 - this.Frame.x,
      y: textPositioningParams.Frame.y + textPositioningParams.Frame.height / 2 - this.Frame.y,
    };
    T3Util.Log("= S.SegmentedLine: Center calculated", { centerPoint });

    const totalPoints = this.segl.pts.length;
    let bestSegmentIndex = 1; // index of the segment chosen for alignment
    let segmentReferenceCoordinate = 0; // reference coordinate: x for horizontal, y for vertical segments
    let minimumDistance = undefined; // tracks the minimum distance to find closest segment
    const segmentLengths = [];
    let totalSegmentLength = 0;

    // Loop through segments to find the segment closest to the center
    for (let segmentIndex = 1; segmentIndex < totalPoints; segmentIndex++) {
      const previousPoint = this.segl.pts[segmentIndex - 1];
      const currentPoint = this.segl.pts[segmentIndex];

      if (Utils2.IsEqual(previousPoint.x, currentPoint.x)) {
        // Vertical segment
        const segmentMinY = Math.min(previousPoint.y, currentPoint.y);
        const segmentMaxY = Math.max(previousPoint.y, currentPoint.y);
        const horizontalDistance = Math.abs(centerPoint.x - previousPoint.x);

        // Check if the center's y coordinate lies within this vertical segment's range
        if (centerPoint.y >= segmentMinY && centerPoint.y <= segmentMaxY) {
          if (minimumDistance === undefined || horizontalDistance < minimumDistance) {
            minimumDistance = horizontalDistance;
            bestSegmentIndex = segmentIndex;
            segmentReferenceCoordinate = previousPoint.y;
          }
        }

        const segmentLength = Math.abs(previousPoint.y - currentPoint.y);
        segmentLengths.push(segmentLength);
        totalSegmentLength += segmentLength;
        T3Util.Log("= S.SegmentedLine: Vertical segment", { index: segmentIndex, segmentLength, totalSegmentLength });
      } else {
        // Horizontal segment
        const segmentMinX = Math.min(previousPoint.x, currentPoint.x);
        const segmentMaxX = Math.max(previousPoint.x, currentPoint.x);
        const verticalDistance = Math.abs(centerPoint.y - previousPoint.y);

        // Check if the center's x coordinate lies within this horizontal segment's range
        if (centerPoint.x >= segmentMinX && centerPoint.x <= segmentMaxX) {
          if (minimumDistance === undefined || verticalDistance < minimumDistance) {
            minimumDistance = verticalDistance;
            bestSegmentIndex = segmentIndex;
            segmentReferenceCoordinate = previousPoint.x;
          }
        }

        const segmentLength = Math.abs(previousPoint.x - currentPoint.x);
        segmentLengths.push(segmentLength);
        totalSegmentLength += segmentLength;
        T3Util.Log("= S.SegmentedLine: Horizontal segment", { index: segmentIndex, segmentLength, totalSegmentLength });
      }
    }

    T3Util.Log("= S.SegmentedLine: Chosen segment", {
      bestSegmentIndex,
      minimumDistance,
      segmentReferenceCoordinate,
      totalSegmentLength,
    });

    // Determine offset along and across the chosen segment
    const segmentStartPoint = this.segl.pts[bestSegmentIndex - 1];
    const segmentEndPoint = this.segl.pts[bestSegmentIndex];
    let offsetAlongSegment; // Distance along the segment's direction
    let offsetAcrossSegment; // Distance perpendicular to the segment's direction

    if (Utils2.IsEqual(segmentStartPoint.x, segmentEndPoint.x)) {
      // For vertical segment: primary offset is along the Y axis; secondary offset is horizontal
      offsetAlongSegment = Math.abs(centerPoint.y - segmentReferenceCoordinate);
      offsetAcrossSegment = -(centerPoint.x - segmentStartPoint.x);
      T3Util.Log("= S.SegmentedLine: Vertical offset", { offsetAlongSegment, offsetAcrossSegment });
    } else {
      // For horizontal segment: primary offset is along the X axis; secondary offset is vertical
      offsetAlongSegment = Math.abs(centerPoint.x - segmentReferenceCoordinate);
      offsetAcrossSegment = centerPoint.y - segmentStartPoint.y;
      T3Util.Log("= S.SegmentedLine: Horizontal offset", { offsetAlongSegment, offsetAcrossSegment });
    }

    // Calculate the accumulated distance along the polyline up to the chosen segment
    let accumulatedDistance = 0;
    for (let i = 0; i < bestSegmentIndex - 1; i++) {
      accumulatedDistance += segmentLengths[i];
    }
    accumulatedDistance += offsetAlongSegment;
    T3Util.Log("= S.SegmentedLine: Accumulated distance", { accumulatedDistance });

    // Set relative text positions
    this.LineTextX = totalSegmentLength ? accumulatedDistance / totalSegmentLength : 0;
    this.LineTextY = offsetAcrossSegment;

    // If there's a valid horizontal text position, copy the text rectangle
    if (this.LineTextX) {
      this.trect = $.extend(true, {}, textPositioningParams.trect);
    }

    // Set text growth behavior and update text flags
    textPositioningParams.TextGrow = NvConstant.TextGrowBehavior.Vertical;
    this.TextFlags = Utils2.SetFlag(this.TextFlags, NvConstant.TextFlags.HorizText, true);

    T3Util.Log("= S.SegmentedLine: CalcTextPosition output", {
      LineTextX: this.LineTextX,
      LineTextY: this.LineTextY,
      trect: this.trect,
    });
  }

  /**
   * Calculates the text positioning parameters along a segmented line
   * This function determines the optimal position for text along a segmented line based on:
   * - The LineTextX property (proportional position along the total line length)
   * - Text alignment settings when LineTextX is not specified
   * - The geometry of the segmented line's points
   *
   * @param textOptions - Text formatting options
   * @returns Object containing text positioning data including frame, start/end points and center proportion
   */
  GetTextOnLineParams(textOptions) {
    T3Util.Log("= S.SegmentedLine: GetTextOnLineParams input", { textOptions });

    // Initialize variables and the result structure
    let segmentStartIndex, segmentEndIndex;
    let selectedSegmentIndex, segmentLength, currentSegmentLength;
    let accumulatedLineLength = 0;
    let positionProportion = 0.5; // default center position value
    const positionParams = {
      Frame: new Instance.Shape.Rect(),
      StartPoint: new Point(0, 0),
      EndPoint: new Point(0, 0),
      CenterProp: 0
    };

    const segmentPoints = this.segl.pts;
    const pointCount = segmentPoints.length;
    let isReverseAlignment = false;

    // Determine initial alignment indices based on point order (left-to-right or right-to-left)
    if (
      segmentPoints[0].x < segmentPoints[pointCount - 1].x ||
      (segmentPoints[0].x === segmentPoints[pointCount - 1].x && segmentPoints[0].y < segmentPoints[pointCount - 1].y)
    ) {
      segmentStartIndex = 0;
      segmentEndIndex = pointCount - 2;
    } else {
      segmentStartIndex = pointCount - 2;
      segmentEndIndex = 0;
      isReverseAlignment = true;
    }

    if (this.LineTextX !== 0) {
      // When LineTextX is specified: Calculate position based on proportional distance along the line
      let totalLineLength = 0;

      // Calculate the total length of the segmented line by summing all segment lengths
      for (let j = 1; j < pointCount; j++) {
        if (Utils2.IsEqual(segmentPoints[j - 1].x, segmentPoints[j].x)) {
          // Vertical segment: use Y-distance
          totalLineLength += Math.abs(segmentPoints[j - 1].y - segmentPoints[j].y);
        } else {
          // Horizontal segment: use X-distance
          totalLineLength += Math.abs(segmentPoints[j - 1].x - segmentPoints[j].x);
        }
      }

      // Determine the target distance along the line based on LineTextX proportion
      const targetDistance = this.LineTextX * totalLineLength;
      T3Util.Log("= S.SegmentedLine: Total line length calculated", { totalLineLength, targetDistance });

      accumulatedLineLength = 0;
      selectedSegmentIndex = pointCount - 2; // default value if not found

      // Walk through segments until we find the one containing the target position
      for (let j = 1; j < pointCount; j++) {
        currentSegmentLength = Utils2.IsEqual(segmentPoints[j - 1].x, segmentPoints[j].x)
          ? Math.abs(segmentPoints[j - 1].y - segmentPoints[j].y)
          : Math.abs(segmentPoints[j - 1].x - segmentPoints[j].x);

        accumulatedLineLength += currentSegmentLength;

        if (accumulatedLineLength > targetDistance) {
          selectedSegmentIndex = j - 1;
          // Calculate the exact proportional position within the selected segment
          positionProportion = (currentSegmentLength - (accumulatedLineLength - targetDistance)) / currentSegmentLength;
          break;
        }
      }

      positionParams.CenterProp = positionProportion;

      // Set the frame and positioning points based on the selected segment
      positionParams.Frame = Utils1.DeepCopy(this.Frame);
      positionParams.StartPoint.x = positionParams.Frame.x + segmentPoints[selectedSegmentIndex].x;
      positionParams.StartPoint.y = positionParams.Frame.y + segmentPoints[selectedSegmentIndex].y;
      positionParams.EndPoint.x = positionParams.Frame.x + segmentPoints[selectedSegmentIndex + 1].x;
      positionParams.EndPoint.y = positionParams.Frame.y + segmentPoints[selectedSegmentIndex + 1].y;
    } else {
      // When LineTextX is zero: determine segment based on segment count and relative lengths
      switch (pointCount) {
        case 2:
          // Simple line with just two points - use the only available segment
          selectedSegmentIndex = 0;
          break;
        case 3:
          // For 3-point line, compare relative segment lengths and choose the longer one
          if (Utils2.IsEqual(segmentPoints[0].x, segmentPoints[1].x)) {
            // First segment is vertical
            segmentLength = Math.abs(segmentPoints[0].y - segmentPoints[1].y);
            currentSegmentLength = Math.abs(segmentPoints[1].x - segmentPoints[2].x);
          } else {
            // First segment is horizontal
            segmentLength = Math.abs(segmentPoints[0].x - segmentPoints[1].x);
            currentSegmentLength = Math.abs(segmentPoints[1].y - segmentPoints[2].y);
          }
          selectedSegmentIndex = segmentLength > currentSegmentLength ? 0 : 1;
          break;
        case 5:
          // For 5-point line, compare middle segment lengths
          if (Utils2.IsEqual(segmentPoints[1].x, segmentPoints[2].x)) {
            segmentLength = Math.abs(segmentPoints[1].y - segmentPoints[2].y);
            currentSegmentLength = Math.abs(segmentPoints[2].x - segmentPoints[3].x);
          } else {
            segmentLength = Math.abs(segmentPoints[1].x - segmentPoints[2].x);
            currentSegmentLength = Math.abs(segmentPoints[2].y - segmentPoints[3].y);
          }
          selectedSegmentIndex = segmentLength > currentSegmentLength ? 1 : 2;
          break;
        default:
          // For other point counts, select the middle segment
          selectedSegmentIndex = Math.round((pointCount - 1.1) / 2);
      }

      // Adjust start and end points based on TextAlign property
      switch (this.TextAlign) {
        case TextConstant.TextAlign.TopLeft:
        case TextConstant.TextAlign.Left:
        case TextConstant.TextAlign.BottomLeft:
          // Left alignment: use the leftmost segment
          if (isReverseAlignment) {
            positionParams.EndPoint.x = this.Frame.x + segmentPoints[segmentStartIndex].x;
            positionParams.EndPoint.y = this.Frame.y + segmentPoints[segmentStartIndex].y;
            positionParams.StartPoint.x = this.Frame.x + segmentPoints[segmentStartIndex + 1].x;
            positionParams.StartPoint.y = this.Frame.y + segmentPoints[segmentStartIndex + 1].y;
          } else {
            positionParams.StartPoint.x = this.Frame.x + segmentPoints[segmentStartIndex].x;
            positionParams.StartPoint.y = this.Frame.y + segmentPoints[segmentStartIndex].y;
            positionParams.EndPoint.x = this.Frame.x + segmentPoints[segmentStartIndex + 1].x;
            positionParams.EndPoint.y = this.Frame.y + segmentPoints[segmentStartIndex + 1].y;
          }
          break;
        case TextConstant.TextAlign.TopRight:
        case TextConstant.TextAlign.Right:
        case TextConstant.TextAlign.BottomRight:
          // Right alignment: use the rightmost segment
          if (isReverseAlignment) {
            positionParams.EndPoint.x = this.Frame.x + segmentPoints[segmentEndIndex].x;
            positionParams.EndPoint.y = this.Frame.y + segmentPoints[segmentEndIndex].y;
            positionParams.StartPoint.x = this.Frame.x + segmentPoints[segmentEndIndex + 1].x;
            positionParams.StartPoint.y = this.Frame.y + segmentPoints[segmentEndIndex + 1].y;
          } else {
            positionParams.StartPoint.x = this.Frame.x + segmentPoints[segmentEndIndex].x;
            positionParams.StartPoint.y = this.Frame.y + segmentPoints[segmentEndIndex].y;
            positionParams.EndPoint.x = this.Frame.x + segmentPoints[segmentEndIndex + 1].x;
            positionParams.EndPoint.y = this.Frame.y + segmentPoints[segmentEndIndex + 1].y;
          }
          break;
        default:
          // Center or other alignment: use the selected segment from earlier calculations
          if (isReverseAlignment) {
            positionParams.EndPoint.x = this.Frame.x + segmentPoints[selectedSegmentIndex].x;
            positionParams.EndPoint.y = this.Frame.y + segmentPoints[selectedSegmentIndex].y;
            positionParams.StartPoint.x = this.Frame.x + segmentPoints[selectedSegmentIndex + 1].x;
            positionParams.StartPoint.y = this.Frame.y + segmentPoints[selectedSegmentIndex + 1].y;
          } else {
            positionParams.StartPoint.x = this.Frame.x + segmentPoints[selectedSegmentIndex].x;
            positionParams.StartPoint.y = this.Frame.y + segmentPoints[selectedSegmentIndex].y;
            positionParams.EndPoint.x = this.Frame.x + segmentPoints[selectedSegmentIndex + 1].x;
            positionParams.EndPoint.y = this.Frame.y + segmentPoints[selectedSegmentIndex + 1].y;
          }
      }
      positionParams.Frame = Utils1.DeepCopy(this.Frame);
    }

    T3Util.Log("= S.SegmentedLine: GetTextOnLineParams output", positionParams);
    return positionParams;
  }

  /**
   * Creates interactive control knobs for manipulating the segmented line
   *
   * @param svgDocument - The SVG document where the triggers will be created
   * @param objectId - The ID of the object to create triggers for
   * @param optionalParam - Optional parameters for trigger creation
   * @param connectedObjectId - ID of any connected object
   * @returns An SVG group element containing all the control knobs
   * @description
   * This function creates control knobs (handles) at the start point, end point,
   * and along segments of the line to allow for interactive editing. The knobs'
   * appearance changes based on connection status, locking, and other conditions.
   * Each knob is assigned a specific action trigger type that determines what happens
   * when it's dragged.
   */
  CreateActionTriggers(
    svgDocument: any,
    objectId: any,
    optionalParam: any,
    connectedObjectId: any
  ) {
    T3Util.Log("= S.SegmentedLine: CreateActionTriggers input", {
      svgDocument,
      objectId,
      optionalParam,
      connectedObjectId
    });

    const knobGroup = svgDocument.CreateShape(OptConstant.CSType.Group);
    const defaultKnobSize = OptConstant.Common.KnobSize;

    // Calculate appropriate knob size based on current zoom level
    let scaleAdjustment = svgDocument.docInfo.docToScreenScale;
    if (svgDocument.docInfo.docScale <= 0.5) {
      scaleAdjustment *= 2;
    }
    const knobSize = defaultKnobSize / scaleAdjustment;

    // Calculate frame dimensions and adjust for knob size
    const boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    let adjustedWidth = this.Frame.width + knobSize;
    let adjustedHeight = this.Frame.height + knobSize;

    // Get the connected object if available
    const connectedObject = DataUtil.GetObjectPtr(objectId, false);

    // Create an adjusted frame that accounts for knob dimensions
    const adjustedFrame = $.extend(true, {}, this.Frame);
    adjustedFrame.x -= knobSize / 2;
    adjustedFrame.y -= knobSize / 2;
    adjustedFrame.width += knobSize;
    adjustedFrame.height += knobSize;

    // Configure the base properties for all knobs
    let knobConfig: any = {
      svgDoc: svgDocument,
      shapeType: OptConstant.CSType.Rect,
      knobSize: knobSize,
      fillColor: "black",
      fillOpacity: 1,
      strokeSize: 1,
      strokeColor: "#777777",
      cursorType: this.CalcCursorForSegment(this.StartPoint, this.EndPoint, false),
      locked: false
    };

    // Adjust knob appearance based on connection status
    if (objectId != connectedObjectId) {
      knobConfig.fillColor = "white";
      knobConfig.strokeSize = 1;
      knobConfig.strokeColor = "black";
      knobConfig.fillOpacity = 0;
    }

    // Handle locked or non-growable states
    if (this.flags & NvConstant.ObjFlags.Lock) {
      knobConfig.fillColor = "gray";
      knobConfig.locked = true;
    } else if (this.NoGrow()) {
      knobConfig.fillColor = "red";
      knobConfig.strokeColor = "red";
      knobConfig.cursorType = CursorConstant.CursorType.DEFAULT;
    }

    // Create start point knob
    knobConfig.x = this.StartPoint.x - this.Frame.x;
    knobConfig.y = this.StartPoint.y - this.Frame.y;
    knobConfig.knobID = OptConstant.ActionTriggerType.LineStart;

    // Check if start point is connected to an object
    if (connectedObject && connectedObject.hooks) {
      for (let hookIndex = 0; hookIndex < connectedObject.hooks.length; hookIndex++) {
        if (connectedObject.hooks[hookIndex].hookpt === OptConstant.HookPts.KTL) {
          knobConfig.shapeType = OptConstant.CSType.Oval;
          break;
        }
      }
    }

    let startKnob = this.GenericKnob(knobConfig);
    knobGroup.AddElement(startKnob);

    // Create end point knob
    knobConfig.shapeType = OptConstant.CSType.Rect;
    if (connectedObject && connectedObject.hooks) {
      for (let hookIndex = 0; hookIndex < connectedObject.hooks.length; hookIndex++) {
        if (connectedObject.hooks[hookIndex].hookpt === OptConstant.HookPts.KTR) {
          knobConfig.shapeType = OptConstant.CSType.Oval;
          break;
        }
      }
    }

    knobConfig.x = this.EndPoint.x - this.Frame.x;
    knobConfig.y = this.EndPoint.y - this.Frame.y;
    knobConfig.knobID = OptConstant.ActionTriggerType.LineEnd;

    let endKnob = this.GenericKnob(knobConfig);
    knobGroup.AddElement(endKnob);

    // Create segment control knobs along the line
    knobConfig.shapeType = OptConstant.CSType.Rect;
    if (this.segl && this.segl.pts && this.segl.firstdir > 0) {
      const pointsCount = this.segl.pts.length;

      // Add knobs for intermediate segment points
      for (let pointIndex = 2; pointIndex < pointsCount - 1; pointIndex++) {
        // Position knob at the midpoint of the segment
        if (this.segl.pts[pointIndex - 1].x === this.segl.pts[pointIndex].x) {
          // Vertical segment
          knobConfig.x = this.segl.pts[pointIndex].x + boundingRect.x - this.Frame.x;
          knobConfig.y = (this.segl.pts[pointIndex - 1].y + this.segl.pts[pointIndex].y) / 2 +
            boundingRect.y - this.Frame.y;
        } else {
          // Horizontal segment
          knobConfig.y = this.segl.pts[pointIndex].y + boundingRect.y - this.Frame.y;
          knobConfig.x = (this.segl.pts[pointIndex - 1].x + this.segl.pts[pointIndex].x) / 2 +
            boundingRect.x - this.Frame.x;
        }

        // Set cursor based on segment orientation
        knobConfig.cursorType = this.CalcCursorForSegment(
          this.segl.pts[pointIndex],
          this.segl.pts[pointIndex - 1],
          true
        );

        // Assign appropriate segment modification action type
        knobConfig.knobID = OptConstant.ActionTriggerType.SeglOne + pointIndex - 2;

        if (this.NoGrow()) {
          knobConfig.cursorType = CursorConstant.CursorType.DEFAULT;
        }

        let segmentKnob = this.GenericKnob(knobConfig);
        knobGroup.AddElement(segmentKnob);
      }
    }

    // Set the size and position of the overall knob group container
    knobGroup.SetSize(adjustedWidth, adjustedHeight);
    knobGroup.SetPos(adjustedFrame.x, adjustedFrame.y);
    knobGroup.isShape = true;
    knobGroup.SetID(OptConstant.Common.Action + objectId);

    T3Util.Log("= S.SegmentedLine: CreateActionTriggers output", {
      knobGroup,
      adjustedFrame,
      adjustedWidth,
      adjustedHeight
    });

    return knobGroup;
  }

  /**
   * Updates the segmented line shape in response to user interaction
   *
   * @param svgDocument - The SVG document containing the line
   * @param newXCoord - The new X coordinate for the modified point
   * @param newYCoord - The new Y coordinate for the modified point
   * @param triggerType - The type of modification being made (start, end, or segment point)
   * @param extraData - Additional data for the modification
   * @description
   * This function handles shape modifications when the user drags control points.
   * It reformats the segmented line based on the new coordinates and trigger type,
   * then updates the SVG elements to reflect these changes. The function updates
   * both the visible line and its interaction area, along with dimension lines
   * and any associated text.
   */
  ModifyShape(svgDocument, newXCoord, newYCoord, triggerType, extraData) {
    T3Util.Log("= S.SegmentedLine: ModifyShape input", {
      svgDocument,
      newXCoord,
      newYCoord,
      triggerType,
      extraData
    });

    // Get the main visible line element and its interaction area
    const visibleLineElement = svgDocument.GetElementById(OptConstant.SVGElementClass.Shape);
    const interactionAreaElement = svgDocument.GetElementById(OptConstant.SVGElementClass.Slop);

    // Create a point object from the new coordinates
    const modifiedPoint = new Point(newXCoord, newYCoord);

    // Update the line with the modified point and recalculate its frame
    this.SegLFormat(modifiedPoint, triggerType, 0);
    this.CalcFrame();

    // Get the updated line points
    const polylinePoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, false, null);

    // Calculate the bounding rectangle from start and end points
    const boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

    // Update the SVG document container's size and position
    svgDocument.SetSize(this.Frame.width, this.Frame.height);
    svgDocument.SetPos(boundingRect.x, boundingRect.y);

    // Update the visible line element
    visibleLineElement.SetSize(this.Frame.width, this.Frame.height);
    this.UpdateSVG(visibleLineElement, polylinePoints);

    // Update the interaction area element
    interactionAreaElement.SetSize(this.Frame.width, this.Frame.height);
    this.UpdateSVG(interactionAreaElement, polylinePoints);

    // Update dimension lines and text if applicable
    this.UpdateDimensionLines(svgDocument);
    if (this.DataID !== -1) {
      this.LMResizeSVGTextObject(svgDocument, this, this.Frame);
    }

    T3Util.Log("= S.SegmentedLine: ModifyShape output", {
      Frame: this.Frame,
      polylinePoints,
      boundingRect
    });
  }

  /**
   * Handles logic when the segmented line is connected to another object
   *
   * @param elementId - The SVG element ID of this line
   * @param connectedObject - The object being connected to
   * @param hookPoint - The hook point type being used for connection
   * @param connectionCoordinate - The coordinates of the connection point
   * @param extraData - Additional connection data
   * @description
   * This function updates the line's properties when it's connected to another object.
   * It determines the appropriate directional face for the line endpoint based on the
   * connection point and updates the segmented line accordingly. The function ensures
   * that line segments are properly formatted after connection to maintain visual
   * consistency.
   */
  OnConnect(elementId, connectedObject, hookPoint, connectionCoordinate, extraData) {
    T3Util.Log("= S.SegmentedLine: OnConnect input", {
      elementId,
      connectedObject,
      hookPoint,
      connectionCoordinate,
      extraData
    });

    let adjustXCoord, adjustYCoord;
    let actionTrigger = 0;
    const svgDocument = T3Gv.opt.svgObjectLayer.GetElementById(elementId);

    switch (hookPoint) {
      case OptConstant.HookPts.KTL:
        // Connection at start point: update first direction based on end point
        this.segl.firstdir = connectedObject.GetSegLFace(
          T3Gv.opt.linkParams.ConnectPt,
          this.EndPoint,
          connectionCoordinate
        );
        actionTrigger = OptConstant.ActionTriggerType.LineEnd;
        adjustXCoord = this.EndPoint.x;
        adjustYCoord = this.EndPoint.y;
        break;

      case OptConstant.HookPts.KTR:
        // Connection at end point: update last direction based on start point
        this.segl.lastdir = connectedObject.GetSegLFace(
          T3Gv.opt.linkParams.ConnectPt,
          this.StartPoint,
          connectionCoordinate
        );
        actionTrigger = OptConstant.ActionTriggerType.LineStart;
        adjustXCoord = this.StartPoint.x;
        adjustYCoord = this.StartPoint.y;
        break;

      default:
        T3Util.Log("= S.SegmentedLine: OnConnect unknown hookPoint", { hookPoint });
    }

    // Adjust line geometry if an action trigger has been determined
    if (actionTrigger) {
      T3Util.Log("= S.SegmentedLine: OnConnect calling AdjustLine", {
        svgDocument,
        adjustXCoord,
        adjustYCoord,
        actionTrigger
      });
      this.AdjustLine(svgDocument, adjustXCoord, adjustYCoord, actionTrigger);
    }

    T3Util.Log("= S.SegmentedLine: OnConnect output");
  }

  /**
   * Handles logic when the segmented line is disconnected from an object
   *
   * @param elementId - The SVG element ID of this line
   * @param unusedParam - Unused parameter (maintained for interface compatibility)
   * @param hookType - The type of hook that was disconnected
   * @param extraData - Additional disconnection data
   * @description
   * This function updates the segmented line when it's disconnected from another object.
   * It resets the appropriate directional properties based on the hook that was disconnected
   * and adjusts the line's geometry accordingly. The function ensures that both the current
   * object and any global object references are properly updated.
   */
  OnDisconnect(elementId: string, unusedParam: any, hookType: number, extraData: any): void {
    T3Util.Log("= S.SegmentedLine: OnDisconnect input", {
      elementId,
      unusedParam,
      hookType,
      extraData
    });

    let adjustXCoord: number = 0;
    let adjustYCoord: number = 0;
    let actionTrigger: number = 0;
    const svgDocument = T3Gv.opt.svgObjectLayer.GetElementById(elementId);

    // If this is the active object, sync directional properties with the global object
    if (T3Gv.opt.ob && T3Gv.opt.ob.BlockID === this.BlockID) {
      this.segl.firstdir = T3Gv.opt.ob.segl.firstdir;
      this.segl.lastdir = T3Gv.opt.ob.segl.lastdir;
    }

    switch (hookType) {
      case OptConstant.HookPts.KTL:
        // Disconnection at start point
        actionTrigger = OptConstant.ActionTriggerType.LineEnd;
        adjustXCoord = this.EndPoint.x;
        adjustYCoord = this.EndPoint.y;

        // Reset start direction flags
        this.segl.firstdir = 0;
        if (T3Gv.opt.ob && T3Gv.opt.ob.segl) {
          T3Gv.opt.ob.segl.firstdir = 0;
        }
        break;

      case OptConstant.HookPts.KTR:
        // Disconnection at end point
        actionTrigger = OptConstant.ActionTriggerType.LineStart;
        adjustXCoord = this.StartPoint.x;
        adjustYCoord = this.StartPoint.y;

        // Reset end direction flags
        this.segl.lastdir = 0;
        if (T3Gv.opt.ob && T3Gv.opt.ob.segl) {
          T3Gv.opt.ob.segl.lastdir = 0;
        }
        break;

      default:
        // Other hook types not handled
        break;
    }

    // Adjust line geometry if an action trigger was determined
    if (actionTrigger) {
      T3Util.Log("= S.SegmentedLine: OnDisconnect - calling AdjustLine", {
        svgDocument,
        adjustXCoord,
        adjustYCoord,
        actionTrigger
      });
      this.AdjustLine(svgDocument, adjustXCoord, adjustYCoord, actionTrigger);
    }

    T3Util.Log("= S.SegmentedLine: OnDisconnect output", {
      updatedStartPoint: this.StartPoint,
      updatedEndPoint: this.EndPoint,
      actionTrigger
    });
  }

  /**
   * Updates the segmented line when a connected object moves
   *
   * @param elementId - The ID of the SVG element representing this line
   * @param hookType - The type of hook connection point being used
   * @param newPosition - The new position to adjust the line to
   * @description
   * This function is called when a connected object moves, requiring the segmented line
   * to adjust one of its endpoints. It updates the appropriate endpoint (start or end point)
   * based on the hook type, recalculates the line's geometry, and updates the display.
   * The function optimizes performance by only updating when the position has actually changed.
   */
  LinkGrow(elementId, hookType, newPosition) {
    T3Util.Log("= S.SegmentedLine: LinkGrow input", {
      elementId,
      hookType,
      newPosition
    });

    switch (hookType) {
      case OptConstant.HookPts.KTL:
        // Only update if the start point has actually moved
        if (
          !(
            Utils2.IsEqual(newPosition.x, this.StartPoint.x) &&
            Utils2.IsEqual(newPosition.y, this.StartPoint.y)
          )
        ) {
          this.SegLFormat(newPosition, OptConstant.ActionTriggerType.LineStart, 0);
        }
        break;
      case OptConstant.HookPts.KTR:
        // Only update if the end point has actually moved
        if (
          !(
            Utils2.IsEqual(newPosition.x, this.EndPoint.x) &&
            Utils2.IsEqual(newPosition.y, this.EndPoint.y)
          )
        ) {
          this.SegLFormat(newPosition, OptConstant.ActionTriggerType.LineEnd, 0);
        }
        break;
      default:
        // Optionally handle other hook types if needed.
        break;
    }

    // Recalculate the frame and mark element as modified
    this.CalcFrame(true);
    OptCMUtil.SetLinkFlag(elementId, DSConstant.LinkFlags.SED_L_MOVE);
    DataUtil.AddToDirtyList(elementId);

    T3Util.Log("= S.SegmentedLine: LinkGrow output", {
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint
    });
  }

  /**
   * Retrieves the point location for a specified hook
   *
   * @param hookId - The ID of the hook to locate
   * @param outRect - Optional rectangle to receive dimensional information
   * @returns The hook point coordinates
   * @description
   * This function returns the coordinates of a specified hook point, typically
   * the start or end point of the segmented line. If outRect is provided, it
   * also populates it with dimensional information about the segment connected
   * to the hook point. This is used when calculating connections between objects.
   */
  HookToPoint(hookId: number, outRect?: { x: number; y: number; width: number; height: number }): Point {
    T3Util.Log("= S.SegmentedLine: HookToPoint input", { hookId, outRect });

    const hookPointTypes = OptConstant.HookPts;
    let resultPoint: Point = { x: 0, y: 0 };
    let segmentEndPoint: Point = { x: 0, y: 0 };
    let segmentRect: any = {};

    switch (hookId) {
      case hookPointTypes.KTL:
        // Return the start point and calculate segment from start point to first bend
        resultPoint.x = this.StartPoint.x;
        resultPoint.y = this.StartPoint.y;
        if (outRect) {
          segmentEndPoint.x = this.StartPoint.x + this.segl.pts[1].x;
          segmentEndPoint.y = this.StartPoint.y + this.segl.pts[1].y;
          segmentRect = Utils2.Pt2Rect(this.StartPoint, segmentEndPoint);
          outRect.x = segmentRect.x;
          outRect.y = segmentRect.y;
          outRect.width = segmentRect.width;
          outRect.height = segmentRect.height;
        }
        break;
      case hookPointTypes.KTR:
      default:
        // Return the end point and calculate segment from end point to last bend
        resultPoint.x = this.EndPoint.x;
        resultPoint.y = this.EndPoint.y;
        const pointsCount = this.segl.pts.length;
        if (outRect) {
          segmentEndPoint.x = this.StartPoint.x + this.segl.pts[pointsCount - 2].x;
          segmentEndPoint.y = this.StartPoint.y + this.segl.pts[pointsCount - 2].y;
          segmentRect = Utils2.Pt2Rect(this.EndPoint, segmentEndPoint);
          outRect.x = segmentRect.x;
          outRect.y = segmentRect.y;
          outRect.width = segmentRect.width;
          outRect.height = segmentRect.height;
        }
        break;
    }

    T3Util.Log("= S.SegmentedLine: HookToPoint output", { resultPoint, segmentRect });
    return resultPoint;
  }

  /**
   * Calculates target points for connecting to this segmented line
   *
   * @param hookData - Information about the hook connection point
   * @param targetFlags - Flags that modify targeting behavior
   * @param connectedObjectId - ID of the object being connected to this line
   * @returns Array of target points for connection
   * @description
   * This function determines appropriate target points on the segmented line
   * for connecting with other objects. It handles different scenarios based on:
   * - The connection point type (standard or custom)
   * - Existing connections that may limit available points
   * - The type of object being connected
   *
   * The function returns normalized coordinates in the range 0-DimMax
   * that represent potential connection points on the line.
   */
  GetTargetPoints(hookData, targetFlags, connectedObjectId) {
    T3Util.Log("= S.SegmentedLine: GetTargetPoints input", { hookData, targetFlags, connectedObjectId });

    const hookPointTypes = OptConstant.HookPts;
    const maxDimension = OptConstant.Common.DimMax;
    let targetPoints = [
      { x: 0, y: 0, id: hookPointTypes.SED_KTL },
      { x: maxDimension, y: maxDimension, id: hookPointTypes.SED_KTR }
    ];

    // Check if a connected object exists and is a SHAPE
    if (
      connectedObjectId != null &&
      connectedObjectId >= 0 &&
      DataUtil.GetObjectPtr(connectedObjectId, false).DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape
    ) {
      // Determine a normalized hook id value
      let normalizedHookId = hookData.id;
      if (hookData.id >= hookPointTypes.CustomBase) {
        normalizedHookId = hookPointTypes.CustomBase;
      }
      switch (normalizedHookId) {
        case hookPointTypes.CustomBase:
        case hookPointTypes.KTC:
        case hookPointTypes.KBC:
        case hookPointTypes.KRC:
        case hookPointTypes.KLC: {
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
          targetPoints[0].x = ((this.StartPoint.x - this.Frame.x) / frameWidth) * maxDimension;
          targetPoints[0].y = ((this.StartPoint.y - this.Frame.y) / frameHeight) * maxDimension;
          targetPoints[1].x = ((this.EndPoint.x - this.Frame.x) / frameWidth) * maxDimension;
          targetPoints[1].y = ((this.EndPoint.y - this.Frame.y) / frameHeight) * maxDimension;

          // Process hooks if available
          if (this.hooks.length === 0) {
            T3Util.Log("= S.SegmentedLine: GetTargetPoints output", targetPoints);
            return targetPoints;
          }
          if (this.hooks.length !== 1) {
            T3Util.Log("= S.SegmentedLine: GetTargetPoints output", []);
            return [];
          }
          if (this.hooks[0].hookpt === hookPointTypes.KTR) {
            targetPoints[1].skip = true;
            T3Util.Log("= S.SegmentedLine: GetTargetPoints output", targetPoints);
            return targetPoints;
          }
          if (this.hooks[0].hookpt === hookPointTypes.KTL) {
            targetPoints[0].skip = true;
            // Mirror target point 1 into target point 0 if necessary
            targetPoints[0].x = targetPoints[1].x;
            targetPoints[0].y = targetPoints[1].y;
            T3Util.Log("= S.SegmentedLine: GetTargetPoints output", targetPoints);
            return targetPoints;
          }
          break;
        }
      }
    }

    // Fallback to base shape poly get targets
    const result = this.BaseShapePolyGetTargets(hookData, targetFlags, this.Frame);
    T3Util.Log("= S.SegmentedLine: GetTargetPoints output", result);
    return result;
  }

  /**
   * Calculates target points on a polyline for connection or interaction purposes
   * This function finds the closest point on the polyline segments to the specified input point,
   * handling grid snapping and coordinate transformations as needed. It's primarily used
   * for determining connection targets when objects are linked together.
   *
   * @param inputPoint - The reference point for target calculation
   * @param hookFlags - Flags that modify the targeting behavior
   * @param boundingRect - The bounding rectangle of the shape
   * @returns Array of normalized target points or null if no suitable target found
   */
  BaseShapePolyGetTargets(inputPoint, hookFlags, boundingRect) {
    T3Util.Log("= S.SegmentedLine: BaseShapePolyGetTargets input", { inputPoint, hookFlags, boundingRect });

    // Get the list of target points from the polyline
    const polylinePoints = this.PolyGetTargetPointList(hookFlags);
    if (inputPoint == null) {
      T3Util.Log("= S.SegmentedLine: BaseShapePolyGetTargets output", { targets: null });
      return null;
    }

    // Initialize variables
    const candidatePoints: Point[] = [{ x: 0, y: 0 }];
    const targetPoints: Point[] = [];
    let closestDistance = OptConstant.Common.LongIntMax;
    const candidatePoint: { x: number; y: number } = { x: 0, y: 0 };
    const referencePoint: { x: number; y: number } = { x: inputPoint.x, y: inputPoint.y };
    const temporaryPoint: { x: number; y: number } = { x: inputPoint.x, y: inputPoint.y };
    let isGridSnapEnabled: boolean = false;
    let segmentRect: any = {};
    let bestSegmentIndex = -1;

    // Prepare the snapping point if enabled
    let snapPoint = { x: inputPoint.x, y: inputPoint.y };
    if (T3Gv.docUtil.docConfig.enableSnap && (hookFlags & NvConstant.HookFlags.LcNoSnaps) === 0) {
      snapPoint = T3Gv.docUtil.SnapToGrid(snapPoint);
      // Clamp snap point within the boundingRect
      if (snapPoint.y < boundingRect.y) { snapPoint.y = boundingRect.y; }
      if (snapPoint.y > boundingRect.y + boundingRect.height) { snapPoint.y = boundingRect.y + boundingRect.height; }
      if (snapPoint.x < boundingRect.x) { snapPoint.x = boundingRect.x; }
      if (snapPoint.x > boundingRect.x + boundingRect.width) { snapPoint.x = boundingRect.x + boundingRect.width; }
      isGridSnapEnabled = true;
    }

    // Loop through the polyline segments to find the best target point
    const pointCount = polylinePoints.length;
    for (let segmentIndex = 1; segmentIndex < pointCount; segmentIndex++) {
      // Reset the temporary point to the reference point each iteration
      temporaryPoint.x = inputPoint.x;
      temporaryPoint.y = inputPoint.y;

      // Get two consecutive points that define the current segment
      const segmentStart = polylinePoints[segmentIndex - 1];
      const segmentEnd = polylinePoints[segmentIndex];

      // Skip if the segment has zero length
      if (Utils2.EqualPt(segmentStart, segmentEnd)) {
        continue;
      }

      // Compute segment vector and ensure non-zero components
      const segmentVectorX = segmentEnd.x - segmentStart.x;
      const segmentVectorY = segmentEnd.y - segmentStart.y;
      const safeVectorX = segmentVectorX === 0 ? 1 : segmentVectorX;
      const safeVectorY = segmentVectorY === 0 ? 1 : segmentVectorY;

      // Determine if segment is more vertical or horizontal and calculate projection
      if (Math.abs(safeVectorY / safeVectorX) > 1) {
        // For steep (vertical) segments, adjust x coordinate using y
        if (isGridSnapEnabled) {
          temporaryPoint.y = snapPoint.y;
        }
        const projectedX = safeVectorX / safeVectorY * (temporaryPoint.y - segmentStart.y) + segmentStart.x;
        let distanceToSegment = Math.abs(projectedX - temporaryPoint.x);
        temporaryPoint.x = projectedX;

        // Ensure the projected point lies on the segment
        const minX = Math.min(segmentStart.x, segmentEnd.x);
        const maxX = Math.max(segmentStart.x, segmentEnd.x);
        if (projectedX < minX || projectedX > maxX) {
          distanceToSegment = OptConstant.Common.LongIntMax;
        } else {
          // Create a slightly inflated rectangle around the segment for tolerance
          segmentRect = Utils2.Pt2Rect(segmentStart, segmentEnd);
          Utils2.InflateRect(segmentRect, 1, 1);
          if (!Utils2.pointInRect(segmentRect, temporaryPoint)) {
            distanceToSegment = OptConstant.Common.LongIntMax;
          }
        }

        // Update if this is the closest point so far
        if (distanceToSegment < closestDistance) {
          bestSegmentIndex = segmentIndex;
          candidatePoint.x = projectedX;
          candidatePoint.y = temporaryPoint.y;
          closestDistance = distanceToSegment;
        }
      } else {
        // For shallow (horizontal) segments, adjust y coordinate using x
        if (isGridSnapEnabled) {
          temporaryPoint.x = snapPoint.x;
        }
        const projectedY = safeVectorY / safeVectorX * (temporaryPoint.x - segmentStart.x) + segmentStart.y;
        let distanceToSegment = Math.abs(projectedY - temporaryPoint.y);
        temporaryPoint.y = projectedY;

        // Ensure the projected point lies on the segment
        const minY = Math.min(segmentStart.y, segmentEnd.y);
        const maxY = Math.max(segmentStart.y, segmentEnd.y);
        if (projectedY < minY || projectedY > maxY) {
          distanceToSegment = OptConstant.Common.LongIntMax;
        } else {
          segmentRect = Utils2.Pt2Rect(segmentStart, segmentEnd);
          Utils2.InflateRect(segmentRect, 1, 1);
          if (!Utils2.pointInRect(segmentRect, temporaryPoint)) {
            distanceToSegment = OptConstant.Common.LongIntMax;
          }
        }

        // Update if this is the closest point so far
        if (distanceToSegment < closestDistance) {
          bestSegmentIndex = segmentIndex;
          candidatePoint.x = temporaryPoint.x;
          candidatePoint.y = projectedY;
          closestDistance = distanceToSegment;
        }
      }
    }

    // If a candidate segment was found, prepare the final target point
    if (bestSegmentIndex >= 0) {
      candidatePoints[0].x = candidatePoint.x;
      candidatePoints[0].y = candidatePoint.y;

      // Use the provided boundingRect as the reference for normalized coordinates
      const referenceRect = boundingRect;

      // If the object is rotated, rotate the candidate point about the center of the bounding rectangle
      if (this.RotationAngle !== 0) {
        const angleInRadians = this.RotationAngle / (180 / NvConstant.Geometry.PI);
        Utils3.RotatePointsAboutCenter(referenceRect, angleInRadians, candidatePoints);
      }

      // Calculate normalized coordinates relative to the bounding rectangle
      const rectWidth = referenceRect.width;
      const rectHeight = referenceRect.height;
      const normalizedX = rectWidth === 0 ? 0 : (candidatePoints[0].x - referenceRect.x) / rectWidth;
      const normalizedY = rectHeight === 0 ? 0 : (candidatePoints[0].y - referenceRect.y) / rectHeight;

      // Scale the normalized coordinates to the standard coordinate system
      targetPoints.push(new Point(
        normalizedX * OptConstant.Common.DimMax,
        normalizedY * OptConstant.Common.DimMax
      ));

      T3Util.Log("= S.SegmentedLine: BaseShapePolyGetTargets output", { targets: targetPoints });
      return targetPoints;
    }

    T3Util.Log("= S.SegmentedLine: BaseShapePolyGetTargets output", { targets: null });
    return null;
  }

  /**
   * Gets perimeter points for connecting objects to the segmented line
   *
   * @param unusedInputParam - Unused parameter preserved for interface compatibility
   * @param hookPointDefinitions - Array of hook point definitions with coordinates and IDs
   * @param currentHookType - The type of hook being processed
   * @param unusedParamR - Unused parameter preserved for interface compatibility
   * @param unusedParamI - Unused parameter preserved for interface compatibility
   * @param connectedObjectId - ID of the object connected to this line
   * @returns Array of points that define connection locations on the line's perimeter
   * @description
   * This function calculates appropriate connection points on the segmented line's perimeter
   * based on hook definitions. It handles special cases for different connection scenarios:
   * - Direct connections to start and end points (KTL and KTR hooks)
   * - Special positioning for multiplicity objects
   * - Text label positioning
   * - General coordinate mapping for other hook types
   */
  GetPerimPts(unusedInputParam: any, hookPointDefinitions: any, currentHookType: any, unusedParamR: any, unusedParamI: any, connectedObjectId: number) {
    T3Util.Log("= S.SegmentedLine: GetPerimPts input", {
      unusedInputParam,
      hookPointDefinitions,
      currentHookType,
      unusedParamR,
      unusedParamI,
      connectedObjectId
    });

    let boundingFrame = this.Frame;
    let resultPoints: Point[] = [];
    let pointIndex = 0;
    let hookCount = 0;

    // Quick reference to NvConstant.FNObjectTypes (unused, but kept as in original)
    NvConstant.FNObjectTypes;

    if (hookPointDefinitions) {
      // Special case: exactly 2 hooks with SED_KTL and SED_KTR
      hookCount = hookPointDefinitions.length;
      if (
        hookCount === 2 &&
        hookPointDefinitions[0].id && hookPointDefinitions[0].id === OptConstant.HookPts.KTL &&
        hookPointDefinitions[1].id && hookPointDefinitions[1].id === OptConstant.HookPts.KTR
      ) {
        if (hookPointDefinitions[0].skip == null) {
          resultPoints.push(new Point(this.StartPoint.x, this.StartPoint.y));
          resultPoints[0].id = hookPointDefinitions[0].id;
          pointIndex = 1;
        }
        if (hookPointDefinitions[1].skip == null) {
          resultPoints.push(new Point(this.EndPoint.x, this.EndPoint.y));
          resultPoints[pointIndex].id = hookPointDefinitions[1].id;
        }
        T3Util.Log("= S.SegmentedLine: GetPerimPts output", resultPoints);
        return resultPoints;
      }

      // Handle connected object cases if provided
      if (connectedObjectId >= 0) {
        const connectedObject = DataUtil.GetObjectPtr(connectedObjectId, false);
        if (connectedObject) {
          // Case for multiplicity object
          if (connectedObject.objecttype === NvConstant.FNObjectTypes.Multiplicity && hookCount === 1) {
            let offsetX = 5, offsetY = 5;
            offsetX += connectedObject.Frame.width / 2;

            if (hookPointDefinitions[0].x === 0) {
              const firstPoint = this.segl.pts[0];
              const secondPoint = this.segl.pts[1];
              if (firstPoint.x === secondPoint.x) {
                if (connectedObject.subtype === NvConstant.ObjectSubTypes.SubtMultiplicityFilpped) {
                  offsetX = -offsetX;
                }
                offsetY = firstPoint.y > secondPoint.y ? -offsetY : offsetY + connectedObject.Frame.height;
                resultPoints.push(new Point(this.StartPoint.x + offsetX, this.StartPoint.y + offsetY));
                resultPoints[0].id = hookPointDefinitions[0].id;
              } else {
                if (connectedObject.subtype === NvConstant.ObjectSubTypes.SubtMultiplicityFilpped) {
                  offsetY = -connectedObject.Frame.height - 5;
                }
                offsetY = -offsetY;
                if (firstPoint.x > secondPoint.x) {
                  offsetX = -offsetX;
                }
                resultPoints.push(new Point(this.StartPoint.x + offsetX, this.StartPoint.y + offsetY));
                resultPoints[0].id = hookPointDefinitions[0].id;
              }
            } else {
              const pointsLength = this.segl.pts.length;
              const secondLastPoint = this.segl.pts[pointsLength - 2];
              const lastPoint = this.segl.pts[pointsLength - 1];
              if (secondLastPoint.x === lastPoint.x) {
                if (connectedObject.subtype === NvConstant.ObjectSubTypes.SubtMultiplicityFilpped) {
                  offsetX = -offsetX;
                }
                offsetY = secondLastPoint.y < lastPoint.y ? -offsetY : offsetY + connectedObject.Frame.height;
                if (currentHookType === OptConstant.HookPts.KCBR) {
                  offsetX = -offsetX;
                }
                resultPoints.push(new Point(this.EndPoint.x + offsetX, this.EndPoint.y + offsetY));
                resultPoints[0].id = hookPointDefinitions[0].id;
              } else {
                if (connectedObject.subtype === NvConstant.ObjectSubTypes.SubtMultiplicityFilpped) {
                  offsetY = -connectedObject.Frame.height - 5;
                }
                offsetY = -offsetY;
                if (secondLastPoint.x < lastPoint.x) {
                  offsetX = -offsetX;
                }
                resultPoints.push(new Point(this.EndPoint.x + offsetX, this.EndPoint.y + offsetY));
                resultPoints[0].id = hookPointDefinitions[0].id;
              }
            }
            T3Util.Log("= S.SegmentedLine: GetPerimPts output", resultPoints);
            return resultPoints;
          }
          // Case for extra text label object
          if (connectedObject.objecttype === NvConstant.FNObjectTypes.ExtraTextLable && hookCount === 1) {
            const extraLabelPoints = super.GetPerimPts(unusedInputParam, hookPointDefinitions, currentHookType, unusedParamR, unusedParamI, connectedObjectId);
            T3Util.Log("= S.SegmentedLine: GetPerimPts output", extraLabelPoints);
            return extraLabelPoints;
          }
        }
      }
    }

    // Default processing: map hook coordinates relative to the frame
    hookCount = hookPointDefinitions ? hookPointDefinitions.length : 0;
    resultPoints = new Array(hookCount);
    for (let hookIndex = 0; hookIndex < hookCount; hookIndex++) {
      resultPoints[hookIndex] = { x: 0, y: 0, id: 0 };
      const frameWidth = boundingFrame.width;
      const frameHeight = boundingFrame.height;
      resultPoints[hookIndex].x = (hookPointDefinitions[hookIndex].x / OptConstant.Common.DimMax) * frameWidth + boundingFrame.x;
      resultPoints[hookIndex].y = (hookPointDefinitions[hookIndex].y / OptConstant.Common.DimMax) * frameHeight + boundingFrame.y;
      if (hookPointDefinitions[hookIndex].id != null) {
        resultPoints[hookIndex].id = hookPointDefinitions[hookIndex].id;
      }
    }
    T3Util.Log("= S.SegmentedLine: GetPerimPts output", resultPoints);
    return resultPoints;
  }

  /**
   * Scales the segmented line when the drawing is scaled
   *
   * @param scaleX - Horizontal scaling factor
   * @param scaleY - Vertical scaling factor
   * @param deltaX - Horizontal translation amount
   * @param deltaY - Vertical translation amount
   * @param pivotX - X coordinate of the scaling pivot point
   * @param pivotY - Y coordinate of the scaling pivot point
   * @param preserveAspectRatio - Whether to maintain the aspect ratio
   * @description
   * This function handles both scaling and positioning of the segmented line.
   * It calls the base class implementation to scale the line's core properties,
   * then recalculates the segmented line's points with the preserved format.
   * Finally, it updates the frame dimensions to match the scaled line.
   */
  ScaleObject(
    scaleX: number,
    scaleY: number,
    deltaX: number,
    deltaY: number,
    pivotX: number,
    pivotY: number,
    preserveAspectRatio: boolean
  ): void {
    T3Util.Log("= S.SegmentedLine: ScaleObject input", {
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
      OptConstant.ActionTriggerType.SeglPreserve,
      0
    );
    this.CalcFrame();

    T3Util.Log("= S.SegmentedLine: ScaleObject output", {
      EndPoint: this.EndPoint,
      Frame: this.Frame,
    });
  }

  /**
   * Determines the connection direction/face when connecting to a segmented line
   * This function analyzes which face (top, bottom, left, right) of the segmented
   * line should be used as a connection point based on the intersection of a test point
   * with one of the line's segments.
   *
   * @param hookPoint - The hook point identifier
   * @param referencePoint - The reference point for direction determination
   * @param testPoint - The test point to check for intersection with the line segments
   * @returns The appropriate hook direction (SED_KTC, SED_KBC, SED_KLC, or SED_KRC) or 0 if no intersection
   */
  GetSegLFace(hookPoint, referencePoint, testPoint) {
    T3Util.Log("= S.SegmentedLine: GetSegLFace input", { hookPoint, referencePoint, testPoint });

    // Get the polyline points with curves skipped (third parameter true)
    const polylinePoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, null);
    let hookDirection = 0;
    let segmentRect = null;

    // Prepare the point for hit testing
    const pointToTest = { x: testPoint.x, y: testPoint.y };
    const hitInformation = {};

    // Check if the test point intersects with any line segment
    if (Utils3.LineDStyleHit(polylinePoints, pointToTest, this.StyleRecord.Line.Thickness, 0, hitInformation) &&
      hitInformation.lpHit >= 0) {

      // Get the rectangle defining the segment that was hit
      segmentRect = Utils2.Pt2Rect(polylinePoints[hitInformation.lpHit], polylinePoints[hitInformation.lpHit + 1]);

      // Determine hook direction based on segment orientation and relative positions
      if (segmentRect.width >= segmentRect.height) {
        // For horizontal segments, use top or bottom connection
        hookDirection = (referencePoint.y >= testPoint.y) ?
          OptConstant.HookPts.KBC :  // Bottom connection
          OptConstant.HookPts.KTC;   // Top connection
      } else {
        // For vertical segments, use left or right connection
        hookDirection = (referencePoint.x >= testPoint.x) ?
          OptConstant.HookPts.KRC :  // Right connection
          OptConstant.HookPts.KLC;   // Left connection
      }
    }

    T3Util.Log("= S.SegmentedLine: GetSegLFace output", { hookDirection });
    return hookDirection;
  }

  /**
   * Calculates the spacing between objects connected by this segmented line
   *
   * @returns Object containing width and/or height spacing measurements between connected objects
   * @description
   * This function analyzes the segmented line's configuration to determine the spacing between
   * connected objects. It considers the line's directional properties and examines connected
   * objects to provide accurate measurements. The function returns spacing values based on:
   * - Vertical spacing for top-to-bottom or bottom-to-top connections
   * - Horizontal spacing for left-to-right or right-to-left connections
   * The spacing values represent the actual distance between object boundaries, not just
   * the distance between connection points.
   */
  GetSpacing() {
    T3Util.Log("= S.SegmentedLine: GetSpacing input", {
      hooks: this.hooks,
      segl: this.segl,
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint
    });

    const hookPointTypes = OptConstant.HookPts;
    let spacing = { width: null, height: null };

    let firstConnectedObject, secondConnectedObject;
    if (this.hooks.length === 2) {
      firstConnectedObject = DataUtil.GetObjectPtr(this.hooks[0].objid, false);
      secondConnectedObject = DataUtil.GetObjectPtr(this.hooks[1].objid, false);
    }

    switch (this.segl.firstdir) {
      case hookPointTypes.KTC:
        if (this.segl.lastdir === hookPointTypes.KBC) {
          spacing.height = Math.abs(this.StartPoint.y - this.EndPoint.y);
          if (firstConnectedObject && secondConnectedObject) {
            if (firstConnectedObject.Frame.y < secondConnectedObject.Frame.y) {
              spacing.height = secondConnectedObject.Frame.y - (firstConnectedObject.Frame.y + firstConnectedObject.Frame.height);
            } else {
              spacing.height = firstConnectedObject.Frame.y - (secondConnectedObject.Frame.y + secondConnectedObject.Frame.height);
            }
          }
        }
        break;
      case hookPointTypes.KBC:
        if (this.segl.lastdir === hookPointTypes.KTC) {
          spacing.height = Math.abs(this.StartPoint.y - this.EndPoint.y);
          if (firstConnectedObject && secondConnectedObject) {
            if (firstConnectedObject.Frame.y < secondConnectedObject.Frame.y) {
              spacing.height = secondConnectedObject.Frame.y - (firstConnectedObject.Frame.y + firstConnectedObject.Frame.height);
            } else {
              spacing.height = firstConnectedObject.Frame.y - (secondConnectedObject.Frame.y + secondConnectedObject.Frame.height);
            }
          }
        }
        break;
      case hookPointTypes.KLC:
        if (this.segl.lastdir === hookPointTypes.KRC) {
          spacing.width = Math.abs(this.StartPoint.x - this.EndPoint.x);
          if (firstConnectedObject && secondConnectedObject) {
            if (firstConnectedObject.Frame.x < secondConnectedObject.Frame.x) {
              spacing.width = secondConnectedObject.Frame.x - (firstConnectedObject.Frame.x + firstConnectedObject.Frame.width);
            } else {
              spacing.width = firstConnectedObject.Frame.x - (secondConnectedObject.Frame.x + secondConnectedObject.Frame.width);
            }
          }
        }
        break;
      case hookPointTypes.KRC:
        if (this.segl.lastdir === hookPointTypes.KLC) {
          spacing.width = Math.abs(this.StartPoint.x - this.EndPoint.x);
          if (firstConnectedObject && secondConnectedObject) {
            if (firstConnectedObject.Frame.x < secondConnectedObject.Frame.x) {
              spacing.width = secondConnectedObject.Frame.x - (firstConnectedObject.Frame.x + firstConnectedObject.Frame.width);
            } else {
              spacing.width = firstConnectedObject.Frame.x - (secondConnectedObject.Frame.x + secondConnectedObject.Frame.width);
            }
          }
        }
        break;
    }

    T3Util.Log("= S.SegmentedLine: GetSpacing output", spacing);
    return spacing;
  }

  /**
   * Determines the appropriate connection point coordinates for a given hook
   *
   * @param hookType - The type of hook to calculate connection point for
   * @returns Object containing normalized x and y coordinates for the connection point
   * @description
   * This function calculates the proper connection point coordinates for a given hook type,
   * analyzing the orientation of the line segment at the hook location. It handles:
   * - Vertical segments: determining whether connections should be at the top or bottom
   * - Horizontal segments: determining whether connections should be at the left or right
   * The function returns normalized coordinates (in the range 0-DimMax) and also updates
   * the line's directional properties to maintain proper connection relationships.
   */
  GetShapeConnectPoint(hookType: number) {
    T3Util.Log("= S.SegmentedLine: GetShapeConnectPoint input", { hookType });

    let firstPoint: Point, secondPoint: Point;
    let leftConnectionPoint: { x?: number; y?: number } = {};
    let rightConnectionPoint: { x?: number; y?: number } = {};
    let lastDirection = this.segl.lastdir;
    let firstDirection = this.segl.firstdir;
    const maxCoordinate = OptConstant.Common.DimMax;
    const pointCount = this.segl.pts.length;

    // Select segment points based on the hook type
    if (hookType === OptConstant.HookPts.KTL) {
      firstPoint = this.segl.pts[0];
      secondPoint = this.segl.pts[1];
    } else {
      firstPoint = this.segl.pts[pointCount - 2];
      secondPoint = this.segl.pts[pointCount - 1];
    }

    // Calculate connection points based on segment orientation
    if (firstPoint.x === secondPoint.x) {
      // For vertical segments
      leftConnectionPoint.x = maxCoordinate / 2;
      rightConnectionPoint.x = maxCoordinate / 2;
      if (secondPoint.y > firstPoint.y) {
        leftConnectionPoint.y = 0;
        rightConnectionPoint.y = maxCoordinate;
        lastDirection = OptConstant.HookPts.KTC;
        firstDirection = OptConstant.HookPts.KBC;
      } else {
        leftConnectionPoint.y = maxCoordinate;
        rightConnectionPoint.y = 0;
        lastDirection = OptConstant.HookPts.KBC;
        firstDirection = OptConstant.HookPts.KTC;
      }
    } else {
      // For horizontal segments
      leftConnectionPoint.y = maxCoordinate / 2;
      rightConnectionPoint.y = maxCoordinate / 2;
      if (secondPoint.x > firstPoint.x) {
        leftConnectionPoint.x = 0;
        rightConnectionPoint.x = maxCoordinate;
        lastDirection = OptConstant.HookPts.KLC;
        firstDirection = OptConstant.HookPts.KRC;
      } else {
        leftConnectionPoint.x = maxCoordinate;
        rightConnectionPoint.x = 0;
        lastDirection = OptConstant.HookPts.KRC;
        firstDirection = OptConstant.HookPts.KLC;
      }
    }

    // Set the appropriate direction and return the correct connection point
    let resultConnectionPoint: { x?: number; y?: number };
    if (hookType === OptConstant.HookPts.KTL) {
      this.segl.firstdir = firstDirection;
      resultConnectionPoint = rightConnectionPoint;
    } else {
      this.segl.lastdir = lastDirection;
      resultConnectionPoint = leftConnectionPoint;
    }

    T3Util.Log("= S.SegmentedLine: GetShapeConnectPoint output", resultConnectionPoint);
    return resultConnectionPoint;
  }

  /**
   * Adjusts the hook type when connecting to an object based on line orientation
   *
   * @param connectedObjectId - ID of the object being connected to
   * @param hookType - Initial hook type for the connection
   * @returns The adjusted hook type to use for connection
   * @description
   * This function determines the appropriate hook type to use when connecting the
   * segmented line to another object. It checks if the line is reversed and swaps
   * the hook types accordingly (e.g., start hook becomes end hook) to maintain proper
   * connection relationships regardless of line orientation.
   */
  ConnectToHook(connectedObjectId: number, hookType: number): number {
    T3Util.Log("= S.SegmentedLine: ConnectToHook input", { connectedObjectId, hookType });

    let adjustedHookType = hookType;
    if (ShapeUtil.LineIsReversed(this, null, false)) {
      if (adjustedHookType === OptConstant.HookPts.KTL) {
        adjustedHookType = OptConstant.HookPts.KTR;
      } else if (adjustedHookType === OptConstant.HookPts.KTR) {
        adjustedHookType = OptConstant.HookPts.KTL;
      }
    }

    T3Util.Log("= S.SegmentedLine: ConnectToHook output", { result: adjustedHookType });
    return adjustedHookType;
  }

  /**
   * Determines the best hook point to use for a connection
   *
   * @param objectId - ID of the object to connect to
   * @param initialHookType - The initially proposed hook type
   * @param referencePoint - Reference point for determining orientation
   * @returns The optimal hook type to use for the connection
   * @description
   * This function analyzes the segmented line's orientation and connected object
   * to determine the most appropriate hook point to use for connection. It considers:
   * - The segmented line's orientation (vertical or horizontal)
   * - Direction relationships between segments
   * - Properties of the object being connected to
   *
   * For shape objects, it selects appropriate top, bottom, left or right connection
   * points based on the segment direction. For other objects, it returns the input hook.
   */
  GetBestHook(objectId: number, initialHookType: number, referencePoint: Point): number {
    T3Util.Log("= S.SegmentedLine: GetBestHook input", { objectId, initialHookType, referencePoint });

    // Define constants and extract hook points from constant data
    const maxCoordinate: number = OptConstant.Common.DimMax;
    // Call Pt2Rect for side-effect (if needed) and get hook points
    Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const hookPointTypes = OptConstant.HookPts;

    const totalPoints: number = this.segl.pts.length;
    // Start with referencePoint.x as baseline
    let compareValue = referencePoint.x;
    // If there are exactly 2 points and they form a vertical line, use referencePoint.y instead
    if (totalPoints === 2 && this.segl.pts[0].x === this.segl.pts[1].x) {
      compareValue = referencePoint.y;
    }

    // Determine the two candidate points from the segmentation points
    let firstSegmentPoint: Point, secondSegmentPoint: Point;
    if (ShapeUtil.LineIsReversed(this, null, false)) {
      if (compareValue === 0) {
        // Use the last two points
        firstSegmentPoint = this.segl.pts[totalPoints - 2];
        secondSegmentPoint = this.segl.pts[totalPoints - 1];
      } else {
        // Use the first two points
        secondSegmentPoint = this.segl.pts[0];
        firstSegmentPoint = this.segl.pts[1];
      }
    } else {
      if (compareValue === maxCoordinate) {
        // Use the last two points
        firstSegmentPoint = this.segl.pts[totalPoints - 2];
        secondSegmentPoint = this.segl.pts[totalPoints - 1];
      } else {
        // Use the first two points
        secondSegmentPoint = this.segl.pts[0];
        firstSegmentPoint = this.segl.pts[1];
      }
    }

    // Retrieve the object pointer for the given objectId
    const connectedShape = DataUtil.GetObjectPtr(objectId, false);
    let bestHookType = initialHookType;
    if (connectedShape && connectedShape.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
      switch (initialHookType) {
        case hookPointTypes.KTC:
        case hookPointTypes.KBC:
        case hookPointTypes.KRC:
        case hookPointTypes.KLC:
          // For vertical segments: choose Bottom Center if first point is above second, else Top Center
          // For horizontal segments: choose Right Center if first point is to the left, else Left Center
          if (firstSegmentPoint.x === secondSegmentPoint.x) {
            bestHookType = firstSegmentPoint.y < secondSegmentPoint.y ?
              hookPointTypes.KBC : hookPointTypes.KTC;
          } else {
            bestHookType = firstSegmentPoint.x < secondSegmentPoint.x ?
              hookPointTypes.KRC : hookPointTypes.KLC;
          }
          break;
        default:
          bestHookType = initialHookType;
      }
    }

    T3Util.Log("= S.SegmentedLine: GetBestHook output", { bestHookType });
    return bestHookType;
  }

  /**
   * Determines if a point should be maintained when connecting to another object
   *
   * @param point - The point to check for maintenance
   * @param targetObjectId - The ID of the target object
   * @param additionalParams - Additional parameters for the maintenance check
   * @param objectToCheck - The object to check against
   * @param extraParams - Extra parameters for the maintenance check
   * @returns Boolean indicating whether the point should be maintained
   * @description
   * This function checks whether a connection point should be maintained when objects
   * are connected. It handles various object types differently and performs intersection
   * checks between line segments and objects to determine if points are valid for connection.
   */
  MaintainPoint(
    point: Point,
    targetObjectId: number,
    additionalParams: any,
    objectToCheck: any,
    extraParams: any
  ): boolean {
    T3Util.Log("= S.SegmentedLine: MaintainPoint input", { point, targetObjectId, additionalParams, objectToCheck, extraParams });

    let result = true;
    let currentObject = objectToCheck;
    let hookRectangle: any = {};
    let lineSegmentRectangle: any = {};
    let objectCopy: any = {};

    switch (currentObject.DrawingObjectBaseClass) {
      case OptConstant.DrawObjectBaseClass.Line:
        switch (currentObject.LineType) {
          case OptConstant.LineType.SEGLINE:
          case OptConstant.LineType.ARCSEGLINE:
          case OptConstant.LineType.POLYLINE:
            // Look for a hook with matching targetObjectId
            let hookFound = false;
            for (let hookIndex = 0; hookIndex < currentObject.hooks.length; hookIndex++) {
              if (currentObject.hooks[hookIndex].targetid === targetObjectId) {
                currentObject.HookToPoint(currentObject.hooks[hookIndex].hookpt, hookRectangle);
                hookFound = true;
                break;
              }
            }
            if (!hookFound) {
              T3Util.Log("= S.SegmentedLine: MaintainPoint - no matching hook found, returning true");
              T3Util.Log("= S.SegmentedLine: MaintainPoint output", true);
              return true;
            }
            // Create a deep copy and update its Frame and endpoints based on hookRectangle
            objectCopy = Utils1.DeepCopy(currentObject);
            Utils2.CopyRect(objectCopy.Frame, hookRectangle);
            objectCopy.StartPoint.x = hookRectangle.x;
            objectCopy.StartPoint.y = hookRectangle.y;
            objectCopy.EndPoint.x = hookRectangle.x + hookRectangle.width;
            objectCopy.EndPoint.y = hookRectangle.y + hookRectangle.height;
            currentObject = objectCopy;
            break;
        }
        break;
      case OptConstant.DrawObjectBaseClass.Shape:
        T3Gv.opt.Lines_MaintainDist(this, additionalParams, extraParams, point);
        T3Util.Log("= S.SegmentedLine: MaintainPoint processed for SHAPE, returning true");
        T3Util.Log("= S.SegmentedLine: MaintainPoint output", true);
        return true;
    }

    // Get the polyline points without translation and with curves skipped
    const polylinePoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, null);
    const totalPointCount = polylinePoints.length;

    for (let pointIndex = 1; pointIndex < totalPointCount; pointIndex++) {
      // Get rectangle defined by the current segment points
      lineSegmentRectangle = Utils2.Pt2Rect(polylinePoints[pointIndex], polylinePoints[pointIndex - 1]);

      // Create a deep copy of this segmented line and update its frame using the segment rectangle
      objectCopy = Utils1.DeepCopy(this);
      Utils2.CopyRect(objectCopy.Frame, lineSegmentRectangle);
      objectCopy.StartPoint.x = lineSegmentRectangle.x;
      objectCopy.StartPoint.y = lineSegmentRectangle.y;
      objectCopy.EndPoint.x = lineSegmentRectangle.x + lineSegmentRectangle.width;
      objectCopy.EndPoint.y = lineSegmentRectangle.y + lineSegmentRectangle.height;

      // Check if the point lies on this segment
      if (T3Gv.opt.LineCheckPoint(objectCopy, point)) {
        T3Util.Log("= S.SegmentedLine: MaintainPoint - LineCheckPoint returned true", { segment: pointIndex, lineSegmentRectangle });
        T3Util.Log("= S.SegmentedLine: MaintainPoint output", true);
        return true;
      }
      // Check for intersection with the current object
      if (T3Gv.opt.LinesIntersect(objectCopy, currentObject, point)) {
        T3Util.Log("= S.SegmentedLine: MaintainPoint - LinesIntersect returned true", { segment: pointIndex, lineSegmentRectangle });
        T3Util.Log("= S.SegmentedLine: MaintainPoint output", true);
        return true;
      }
    }

    T3Gv.opt.Lines_MaintainDist(this, additionalParams, extraParams, point);
    T3Util.Log("= S.SegmentedLine: MaintainPoint output", result);
    return result;
  }

  /**
   * Serializes the segmented line data for storage or transmission
   *
   * @param outputStream - The stream to write the shape data to
   * @param exportOptions - Options controlling the export process
   * @description
   * This function prepares and writes the segmented line's data to an output stream
   * for persistence or transmission. It handles special cases like line reversal,
   * converts coordinate systems, and ensures proper segment ordering. The function
   * supports both standard and Win32-specific serialization formats.
   */
  WriteShapeData(outputStream, exportOptions) {
    T3Util.Log("= S.SegmentedLine: WriteShapeData input", { outputStream, exportOptions });

    return;

    const pointCount = this.segl.pts.length;
    T3Util.Log("= S.SegmentedLine: Number of segmentation points", { pointCount });

    const instanceId = exportOptions.WriteBlocks ? this.BlockID : exportOptions.nsegl++;
    T3Util.Log("= S.SegmentedLine: Instance ID", { instanceId });

    const isLineReversed = ShapeUtil.LineIsReversed(this, exportOptions, false);
    T3Util.Log("= S.SegmentedLine: Is line reversed?", { isLineReversed });

    let segmentationCopy = Utils1.DeepCopy(this.segl);
    let lastSegmentIndex = pointCount - 1;
    if (lastSegmentIndex < 0) lastSegmentIndex = 0;

    // If the line is reversed, reverse the segmentation points and swap the direction flags.
    if (isLineReversed) {
      T3Util.Log("= S.SegmentedLine: Reversing segmentation points and swapping direction flags");
      for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
        segmentationCopy.pts[pointCount - 1 - pointIndex].x = this.segl.pts[pointIndex].x;
        segmentationCopy.pts[pointCount - 1 - pointIndex].y = this.segl.pts[pointIndex].y;
      }
      const tempDirection = segmentationCopy.firstdir;
      segmentationCopy.firstdir = segmentationCopy.lastdir;
      segmentationCopy.lastdir = tempDirection;
      T3Util.Log("= S.SegmentedLine: Reversed direction flags", {
        firstdir: segmentationCopy.firstdir,
        lastdir: segmentationCopy.lastdir,
      });

      for (let segmentIndex = 0; segmentIndex < pointCount - 1; segmentIndex++) {
        if (Utils2.IsEqual(segmentationCopy.pts[segmentIndex + 1].x, segmentationCopy.pts[segmentIndex].x)) {
          segmentationCopy.lengths[segmentIndex] = Math.abs(segmentationCopy.pts[segmentIndex + 1].y - segmentationCopy.pts[segmentIndex].y);
        } else {
          segmentationCopy.lengths[segmentIndex] = Math.abs(segmentationCopy.pts[segmentIndex + 1].x - segmentationCopy.pts[segmentIndex].x);
        }
      }
      if (pointCount === 6) {
        segmentationCopy.lengths[2] = segmentationCopy.lengths[4];
      }
    }

    let serializationData;
    if (exportOptions.WriteWin32) {
      serializationData = {
        InstId: instanceId,
        firstdir: segmentationCopy.firstdir,
        lastdir: segmentationCopy.lastdir,
        nsegs: lastSegmentIndex,
        segr: [],
        lengths: [0, 0, 0, 0, 0],
        lsegr: [],
        llengths: [0, 0, 0, 0, 0],
      };
    } else {
      serializationData = {
        InstId: instanceId,
        firstdir: segmentationCopy.firstdir,
        lastdir: segmentationCopy.lastdir,
        curveparam: segmentationCopy.curveparam,
        nsegs: lastSegmentIndex,
        lsegr: [],
        llengths: [0, 0, 0, 0, 0],
      };
    }
    T3Util.Log("= S.SegmentedLine: Initialized serializationData", serializationData);

    // Determine the minimum X and Y coordinates from all segmentation points.
    let minimumX, minimumY;
    for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
      if (pointIndex === 0 || segmentationCopy.pts[pointIndex].x < minimumX) {
        minimumX = segmentationCopy.pts[pointIndex].x;
      }
      if (pointIndex === 0 || segmentationCopy.pts[pointIndex].y < minimumY) {
        minimumY = segmentationCopy.pts[pointIndex].y;
      }
    }
    T3Util.Log("= S.SegmentedLine: Computed minimumX and minimumY", { minimumX, minimumY });

    // Convert each segment's length to SD window coordinates.
    const lengthsCount = segmentationCopy.lengths.length;
    for (let lengthIndex = 0; lengthIndex < lengthsCount; lengthIndex++) {
      serializationData.llengths[lengthIndex] = ShapeUtil.ToSDWinCoords(segmentationCopy.lengths[lengthIndex], exportOptions.coordScaleFactor);
    }
    T3Util.Log("= S.SegmentedLine: Converted segment lengths", { llengths: serializationData.llengths });

    // Create rectangle info for each segment between adjacent points.
    for (let segmentIndex = 0; segmentIndex < pointCount - 1; segmentIndex++) {
      let segmentRectangle = {
        left: ShapeUtil.ToSDWinCoords(segmentationCopy.pts[segmentIndex].x - minimumX, exportOptions.coordScaleFactor),
        top: ShapeUtil.ToSDWinCoords(segmentationCopy.pts[segmentIndex].y - minimumY, exportOptions.coordScaleFactor),
        right: ShapeUtil.ToSDWinCoords(segmentationCopy.pts[segmentIndex + 1].x - minimumX, exportOptions.coordScaleFactor),
        bottom: ShapeUtil.ToSDWinCoords(segmentationCopy.pts[segmentIndex + 1].y - minimumY, exportOptions.coordScaleFactor),
      };

      // Ensure the rectangle is properly ordered.
      if (pointCount > 2) {
        if (segmentRectangle.left > segmentRectangle.right) {
          let temp = segmentRectangle.left;
          segmentRectangle.left = segmentRectangle.right;
          segmentRectangle.right = temp;
        }
        if (segmentRectangle.top > segmentRectangle.bottom) {
          let temp = segmentRectangle.top;
          segmentRectangle.top = segmentRectangle.bottom;
          segmentRectangle.bottom = temp;
        }
      }
      serializationData.lsegr.push(segmentRectangle);

      if (exportOptions.WriteWin32) {
        serializationData.segr.push({ left: 0, top: 0, right: 0, bottom: 0 });
      }
    }
    T3Util.Log("= S.SegmentedLine: Created segmentation rectangles", { lsegr: serializationData.lsegr });

    // If there are fewer than 5 segments, pad the remaining segment info with zeros.
    for (let paddingIndex = pointCount - 1; paddingIndex < 5; paddingIndex++) {
      serializationData.lsegr.push({ left: 0, top: 0, right: 0, bottom: 0 });
      if (exportOptions.WriteWin32) {
        serializationData.segr.push({ left: 0, top: 0, right: 0, bottom: 0 });
      }
    }
    T3Util.Log("= S.SegmentedLine: Padded segmentation rectangles", { lsegr: serializationData.lsegr });

    const operationCode = ShapeUtil.WriteCode(outputStream, DSConstant.OpNameCode.cDrawSegl);
    if (exportOptions.WriteWin32) {
      outputStream.writeStruct(DSConstant.SegLineStruct, serializationData);
    } else {
      outputStream.writeStruct(DSConstant.SegLineStruct210, serializationData);
    }
    ShapeUtil.WriteLength(outputStream, operationCode);

    // Call the base class implementation.
    super.WriteShapeData(outputStream, exportOptions);

    T3Util.Log("= S.SegmentedLine: WriteShapeData output", { serializationData, operationCode });
  }
}

export default SegmentedLine

