
import BaseLine from './Shape.BaseLine'
import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import GlobalData from '../Data/GlobalData'
import Document from '../Basic/Basic.Document'
import Element from '../Basic/Basic.Element'
import ConstantData from '../Data/ConstantData'
import PolySeg from '../Model/PolySeg'
import SelectionAttributes from '../Model/SelectionAttributes'

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

  constructor(options: any = {}) {
    console.log('= S.ArcLine constructor input:', options);

    options.LineType = ConstantData.LineType.ARCLINE;
    super(options);

    this.StartPoint = options.StartPoint || { x: 0, y: 0 };
    this.EndPoint = options.EndPoint || { x: 0, y: 0 };
    this.CurveAdjust = options.CurveAdjust;
    this.IsReversed = options.IsReversed || false;
    this.FromPolygon = options.FromPolygon || false;

    this.CalcFrame();

    this.FixedPoint = options.FixedPoint || [0, 0];
    this.LineOrientation = options.LineOrientation || ConstantData.LineOrientation.NONE;
    this.hoplist = options.hoplist || { nhops: 0, hops: [] };
    this.ArrowheadData = options.ArrowheadData || [];
    this.StartArrowID = options.StartArrowID || 0;
    this.EndArrowID = options.EndArrowID || 0;
    this.StartArrowDisp = options.StartArrowDisp || false;
    this.EndArrowDisp = options.EndArrowDisp || false;
    this.ArrowSizeIndex = options.ArrowSizeIndex || 0;
    this.TextDirection = options.TextDirection || false;

    console.log('= S.ArcLine constructor output (instance created):', this);
  }

  CalcRadiusAndCenter(startX: number, startY: number, endX: number, endY: number, curveAdjust: number, isReversed: boolean) {
    console.log("= S.ArcLine CalcRadiusAndCenter input:", { startX, startY, endX, endY, curveAdjust, isReversed });

    // Midpoint between start and end
    const midX = startX + (endX - startX) / 2;
    const midY = startY + (endY - startY) / 2;

    // Delta values and full distance between start and end
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const fullDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (fullDistance === 0) {
      const invalidResult = {
        centerX: 0,
        centerY: 0,
        actionX: 0,
        actionY: 0,
        radius: 0,
        valid: false,
        centerInside: false
      };
      console.log("= S.ArcLine CalcRadiusAndCenter output:", invalidResult);
      return invalidResult;
    }

    // Unit normal components perpendicular to the line
    const unitNormalX = -deltaY / fullDistance;
    const unitNormalY = deltaX / fullDistance;

    // Half the distance between endpoints
    let halfDistance = fullDistance / 2;

    // Compute the absolute radius using the relation: (halfDistance^2 + curveAdjust^2) / (2*curveAdjust)
    let computedRadius = Math.abs((halfDistance * halfDistance + curveAdjust * curveAdjust) / (2 * curveAdjust));

    // Prepare placeholders for results
    let centerX = 0, centerY = 0, actionX = 0, actionY = 0;

    if (computedRadius < curveAdjust) {
      // Center lies inside the arc
      const centerInside = true;
      // Compute the chord offset using the Pythagorean relation
      const chordOffset = Utils2.sqrt(computedRadius * computedRadius - halfDistance * halfDistance);
      const offsetX = chordOffset * unitNormalX;
      const offsetY = chordOffset * unitNormalY;

      if (isReversed) {
        centerX = midX + offsetX;
        centerY = midY + offsetY;
        actionX = centerX + computedRadius * unitNormalX;
        actionY = centerY + computedRadius * unitNormalY;
      } else {
        centerX = midX - offsetX;
        centerY = midY - offsetY;
        actionX = centerX - computedRadius * unitNormalX;
        actionY = centerY - computedRadius * unitNormalY;
      }
    } else {
      // Center lies outside the arc
      // Adjust the offset distance depending on the reverse flag
      let adjustedOffset = isReversed ? computedRadius + curveAdjust : computedRadius - curveAdjust;
      centerX = midX + unitNormalX * adjustedOffset;
      centerY = midY + unitNormalY * adjustedOffset;
      actionX = centerX - computedRadius * unitNormalX;
      actionY = centerY - computedRadius * unitNormalY;
      if (isReversed) {
        // In the reversed case, override the center with an alternative computation
        adjustedOffset = computedRadius - curveAdjust;
        centerX = midX + unitNormalX * adjustedOffset;
        centerY = midY + unitNormalY * adjustedOffset;
      }
    }

    const result = {
      centerX,
      centerY,
      actionX,
      actionY,
      radius: computedRadius,
      valid: true,
      centerInside: computedRadius < curveAdjust
    };
    console.log("= S.ArcLine CalcRadiusAndCenter output:", result);
    return result;
  }

  GetLineChangeFrame(): any {
    console.log("= S.ArcLine GetLineChangeFrame input:", {
      startPoint: this.StartPoint,
      endPoint: this.EndPoint
    });

    const frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

    if (frame.width < ConstantData.Defines.SED_SegDefLen) {
      frame.width = ConstantData.Defines.SED_SegDefLen;
    }
    if (frame.height < ConstantData.Defines.SED_SegDefLen) {
      frame.height = ConstantData.Defines.SED_SegDefLen;
    }

    console.log("= S.ArcLine GetLineChangeFrame output:", frame);
    return frame;
  }

  CreateArcShapeForHops(svgDoc, eventFlag) {
    console.log("= S.ArcLine CreateArcShapeForHops input:", { svgDoc, eventFlag });

    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) {
      console.log("= S.ArcLine CreateArcShapeForHops output:", null, "(Not Visible)");
      return null;
    }

    const container = svgDoc.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER);

    const shape = svgDoc.CreateShape(ConstantData.CreateShapeType.POLYLINE);
    shape.SetID(ConstantData.SVGElementClass.SHAPE);

    const slop = svgDoc.CreateShape(ConstantData.CreateShapeType.POLYLINE);
    slop.SetID(ConstantData.SVGElementClass.SLOP);
    slop.ExcludeFromExport(true);

    this.CalcFrame();
    const frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const width = frame.width;
    const height = frame.height;

    let styleRecord = this.StyleRecord;
    styleRecord = this.SVGTokenizerHook(styleRecord);
    const strokeColor = styleRecord.Line.Paint.Color;
    const lineThickness = styleRecord.Line.Thickness;
    const strokeOpacity = styleRecord.Line.Paint.Opacity;
    const linePattern = styleRecord.Line.LinePattern;

    container.SetSize(width, height);
    container.SetPos(frame.x, frame.y);

    let polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true);
    const hopResult = GlobalData.optManager.InsertHops(this, polyPoints, polyPoints.length);
    polyPoints = polyPoints.slice(0, hopResult.npts);

    shape.SetPoints(polyPoints);
    shape.SetFillColor("none");
    shape.SetStrokeColor(strokeColor);
    shape.SetStrokeOpacity(strokeOpacity);
    shape.SetStrokeWidth(lineThickness);
    if (linePattern !== 0) {
      shape.SetStrokePattern(linePattern);
    }

    slop.SetPoints(polyPoints);
    slop.SetStrokeColor("white");
    slop.SetFillColor("none");
    slop.SetOpacity(0);
    if (eventFlag) {
      slop.SetEventBehavior(Element.EventBehavior.HIDDEN_OUT);
    } else {
      slop.SetEventBehavior(Element.EventBehavior.NONE);
    }
    slop.SetStrokeWidth(lineThickness + ConstantData.Defines.SED_Slop);

    container.AddElement(shape);
    container.AddElement(slop);

    this.ApplyStyles(shape, styleRecord);
    this.ApplyEffects(container, false, true);
    container.isShape = true;
    this.AddIcons(svgDoc, container);

    console.log("= S.ArcLine CreateArcShapeForHops output:", container);
    return container;
  }

  CreateShape(svgDoc, eventFlag) {
    console.log("= S.ArcLine CreateShape input:", { svgDoc, eventFlag });

    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) {
      console.log("= S.ArcLine CreateShape output:", null, "(Not Visible)");
      return null;
    }

    // If no hops, create a basic arc shape
    if (this.hoplist.nhops === 0) {
      const shapeContainer = svgDoc.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER);
      const shapePath = svgDoc.CreateShape(ConstantData.CreateShapeType.PATH);
      shapePath.SetID(ConstantData.SVGElementClass.SHAPE);

      const slopPath = svgDoc.CreateShape(ConstantData.CreateShapeType.PATH);
      slopPath.SetID(ConstantData.SVGElementClass.SLOP);
      slopPath.ExcludeFromExport(true);

      this.CalcFrame();
      const frameRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      const width = frameRect.width;
      const height = frameRect.height;

      let styleRecord = this.StyleRecord;
      styleRecord = this.SVGTokenizerHook(styleRecord);
      const strokeColor = styleRecord.Line.Paint.Color;
      const strokeOpacity = styleRecord.Line.Paint.Opacity;
      let strokeWidth = styleRecord.Line.Thickness;
      if (strokeWidth > 0 && strokeWidth < 1) {
        strokeWidth = 1;
      }
      const linePattern = styleRecord.Line.LinePattern;

      shapeContainer.SetSize(width, height);
      shapeContainer.SetPos(frameRect.x, frameRect.y);

      shapePath.SetFillColor("none");
      shapePath.SetStrokeColor(strokeColor);
      shapePath.SetStrokeOpacity(strokeOpacity);
      shapePath.SetStrokeWidth(strokeWidth);
      if (linePattern !== 0) {
        shapePath.SetStrokePattern(linePattern);
      }

      slopPath.SetStrokeColor("white");
      slopPath.SetFillColor("none");
      slopPath.SetOpacity(0);
      if (eventFlag) {
        slopPath.SetEventBehavior(Element.EventBehavior.HIDDEN_OUT);
      } else {
        slopPath.SetEventBehavior(Element.EventBehavior.NONE);
      }
      slopPath.SetStrokeWidth(strokeWidth + ConstantData.Defines.SED_Slop);

      shapeContainer.AddElement(shapePath);
      shapeContainer.AddElement(slopPath);

      this.ApplyStyles(shapePath, styleRecord);
      this.ApplyEffects(shapeContainer, false, true);
      shapeContainer.isShape = true;
      this.AddIcons(svgDoc, shapeContainer);

      console.log("= S.ArcLine CreateShape output:", shapeContainer);
      return shapeContainer;
    }

    // When hops exist, create an arc shape for hops
    const result = this.CreateArcShapeForHops(svgDoc, eventFlag);
    console.log("= S.ArcLine CreateShape output:", result);
    return result;
  }

  PostCreateShapeCallback(svgDoc: any, shapeContainer: any, additionalParam: any, callbackFlag: any): void {
    console.log('= S.ArcLine PostCreateShapeCallback input:', { svgDoc, shapeContainer, additionalParam, callbackFlag });

    if (this.hoplist.nhops === 0) {
      this.RegenerateGenerateArc(svgDoc);
    } else {
      this.RegenerateGenerateArcForHops(svgDoc);
    }

    if (this.DataID >= 0) {
      this.LM_AddSVGTextObject(svgDoc, shapeContainer);
    }

    this.UpdateDimensionLines(svgDoc);

    console.log('= S.ArcLine PostCreateShapeCallback output: Callback executed successfully');
  }

  CreateActionTriggers(svgDoc, triggerId, paramA, targetId) {
    console.log("= S.ArcLine CreateActionTriggers input:", {
      svgDoc,
      triggerId,
      paramA,
      targetId,
    });

    // Create the main group for action triggers
    const group = svgDoc.CreateShape(ConstantData.CreateShapeType.GROUP);
    const defaultKnobSize = ConstantData.Defines.SED_KnobSize;
    const defaultRotKnobSize = ConstantData.Defines.SED_RKnobSize;
    let showKnobs = true;
    let docToScreenScale = svgDoc.docInfo.docToScreenScale;
    let knobsMultiplied;

    if (svgDoc.docInfo.docScale <= 0.5) {
      docToScreenScale *= 2;
    }
    const knobSize = defaultKnobSize / docToScreenScale;
    const rotKnobSize = defaultRotKnobSize / docToScreenScale;

    // Adjust knob size for floorplan walls
    if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
      // Double the knob size
      knobsMultiplied = knobSize * 2;
    }

    // Calculate the frame from start and end points
    const frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    let frameWidth = frame.width;
    let frameHeight = frame.height;
    const refObj = GlobalData.optManager.GetObjectPtr(triggerId, false);

    frameWidth += knobSize;
    frameHeight += knobSize;

    // Extend the frame slightly
    const extendedFrame = $.extend(true, {}, frame);
    extendedFrame.x -= knobSize / 2;
    extendedFrame.y -= knobSize / 2;
    extendedFrame.width += knobSize;
    extendedFrame.height += knobSize;

    // Generate first knob (line start)
    const knobParams: any = {
      svgDoc,
      shapeType: ConstantData.CreateShapeType.RECT,
      knobSize: knobSize,
      fillColor: 'black',
      fillOpacity: 1,
      strokeSize: 1,
      strokeColor: '#777777',
      cursorType: this.CalcCursorForSegment(this.StartPoint, this.EndPoint, false),
      locked: false,
      x: this.StartPoint.x - frame.x,
      y: this.StartPoint.y - frame.y,
      knobID: ConstantData.ActionTriggerType.LINESTART,
    };

    if (triggerId !== targetId) {
      knobParams.fillColor = 'white';
      knobParams.strokeSize = 1;
      knobParams.strokeColor = 'black';
      knobParams.fillOpacity = 0;
    }

    if (this.flags & ConstantData.ObjFlags.SEDO_Lock) {
      knobParams.fillColor = 'gray';
      knobParams.locked = true;
    } else if (this.NoGrow()) {
      knobParams.fillColor = 'red';
      knobParams.strokeColor = 'red';
      knobParams.cursorType = Element.CursorType.DEFAULT;
    }

    if (refObj && refObj.hooks) {
      for (let h = 0; h < refObj.hooks.length; h++) {
        if (refObj.hooks[h].hookpt === ConstantData.HookPts.SED_KTL) {
          knobParams.shapeType = ConstantData.CreateShapeType.OVAL;
          showKnobs = false;
          break;
        }
      }
    }

    if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
      knobParams.shapeType = ConstantData.CreateShapeType.IMAGE;
    }

    let knob = this.GenericKnob(knobParams);
    group.AddElement(knob);

    // Generate second knob (line end)
    knobParams.shapeType = ConstantData.CreateShapeType.RECT;
    knobParams.x = this.EndPoint.x - frame.x;
    knobParams.y = this.EndPoint.y - frame.y;
    knobParams.knobID = ConstantData.ActionTriggerType.LINEEND;

    if (refObj && refObj.hooks) {
      for (let h = 0; h < refObj.hooks.length; h++) {
        if (refObj.hooks[h].hookpt === ConstantData.HookPts.SED_KTR) {
          knobParams.shapeType = ConstantData.CreateShapeType.OVAL;
          showKnobs = false;
          break;
        }
      }
    }

    if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
      knobParams.shapeType = ConstantData.CreateShapeType.IMAGE;
    }
    knob = this.GenericKnob(knobParams);
    group.AddElement(knob);

    // Generate modify knob
    knobParams.shapeType = ConstantData.CreateShapeType.RECT;
    knobParams.cursorType = this.CalcCursorForSegment(this.StartPoint, this.EndPoint, true);
    if (this.NoGrow()) {
      knobParams.cursorType = Element.CursorType.DEFAULT;
    }
    const startX = this.StartPoint.x;
    const startY = this.StartPoint.y;
    const endX = this.EndPoint.x;
    const endY = this.EndPoint.y;
    const radiusResult = this.CalcRadiusAndCenter(startX, startY, endX, endY, this.CurveAdjust, this.IsReversed);
    knobParams.x = radiusResult.actionX - frame.x;
    knobParams.y = radiusResult.actionY - frame.y;
    knobParams.knobID = ConstantData.ActionTriggerType.MODIFYSHAPE;
    knob = this.GenericKnob(knobParams);
    group.AddElement(knob);

    // Generate rotate knob if allowed
    if (GlobalData.optManager.bTouchInitiated) {
      showKnobs = false;
    }
    if (showKnobs && !knobParams.locked && !this.NoGrow()) {
      knobParams.shapeType = ConstantData.CreateShapeType.OVAL;
      let angle = Math.atan((this.EndPoint.y - this.StartPoint.y) / (this.EndPoint.x - this.StartPoint.x));
      if (angle < 0) {
        angle = -angle;
      }
      if (this.EndPoint.x >= this.StartPoint.x) {
        knobParams.x = this.EndPoint.x - 2 * rotKnobSize * Math.cos(angle) - frame.x;
        knobParams.y = this.EndPoint.y - 2 * rotKnobSize * Math.sin(angle) - frame.y;
      } else {
        knobParams.x = this.StartPoint.x - 2 * rotKnobSize * Math.cos(angle) - frame.x;
        knobParams.y = this.StartPoint.y - 2 * rotKnobSize * Math.sin(angle) - frame.y;
      }
      knobParams.cursorType = Element.CursorType.ROTATE;
      knobParams.knobID = ConstantData.ActionTriggerType.ROTATE;
      knobParams.fillColor = 'white';
      knobParams.fillOpacity = 0.001;
      knobParams.strokeSize = 1.5;
      knobParams.strokeColor = 'black';
      knobParams.knobSize = rotKnobSize;
      knob = this.GenericKnob(knobParams);
      group.AddElement(knob);
      knobParams.knobSize = knobSize;
    }

    if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Standoff && this.CanUseStandOffDimensionLines()) {
      const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
      this.CreateDimensionAdjustmentKnobs(group, svgElement, knobParams);
    }

    group.SetSize(frameWidth, frameHeight);
    group.SetPos(extendedFrame.x, extendedFrame.y);
    group.isShape = true;
    group.SetID(ConstantData.Defines.Action + triggerId);

    console.log("= S.ArcLine CreateActionTriggers output:", group);
    return group;
  }

  GetTextOnLineParams(inputParam: any) {
    console.log("= S.ArcLine GetTextOnLineParams - Input:", { inputParam });

    // Prepare a container for text parameters with clearer names
    const textParams = {
      Frame: new ListManager.Rect(),
      StartPoint: new Point(),
      EndPoint: new Point(),
    };

    // Copy the initial points from the current object
    textParams.StartPoint.x = this.StartPoint.x;
    textParams.StartPoint.y = this.StartPoint.y;
    textParams.EndPoint.x = this.EndPoint.x;
    textParams.EndPoint.y = this.EndPoint.y;
    textParams.Frame = Utils2.Pt2Rect(textParams.StartPoint, textParams.EndPoint);

    // Adjust text position based on text alignment
    if (
      this.TextAlign === ConstantData.TextAlign.TOPCENTER ||
      this.TextAlign === ConstantData.TextAlign.CENTER ||
      this.TextAlign === ConstantData.TextAlign.BOTTOMCENTER
    ) {
      const rotationAngle = GlobalData.optManager.SD_GetClockwiseAngleBetween2PointsInRadians(
        textParams.StartPoint,
        textParams.EndPoint
      );
      console.log("= S.ArcLine GetTextOnLineParams - Rotation Angle:", rotationAngle);

      // Rotate the start and end points to simplify calculation
      const rotatedPoints = [
        new Point(textParams.StartPoint.x, textParams.StartPoint.y),
        new Point(textParams.EndPoint.x, textParams.EndPoint.y),
      ];
      console.log("= S.ArcLine GetTextOnLineParams - Before Rotation:", { rotatedPoints });

      Utils3.RotatePointsAboutCenter(textParams.Frame, rotationAngle, rotatedPoints);
      console.log("= S.ArcLine GetTextOnLineParams - After Rotation:", { rotatedPoints });

      // Calculate arc parameters based on rotated coordinates
      const arcResult = this.CalcRadiusAndCenter(
        rotatedPoints[0].x,
        rotatedPoints[0].y,
        rotatedPoints[1].x,
        rotatedPoints[1].y,
        this.CurveAdjust,
        this.IsReversed
      );
      console.log("= S.ArcLine GetTextOnLineParams - CalcRadiusAndCenter Result:", arcResult);

      // Use the calculated actionY for both points
      rotatedPoints[0].y = arcResult.actionY;
      rotatedPoints[1].y = arcResult.actionY;

      // Rotate the points back to the original coordinate system
      Utils3.RotatePointsAboutCenter(textParams.Frame, -rotationAngle, rotatedPoints);
      textParams.StartPoint.x = rotatedPoints[0].x;
      textParams.StartPoint.y = rotatedPoints[0].y;
      textParams.EndPoint.x = rotatedPoints[1].x;
      textParams.EndPoint.y = rotatedPoints[1].y;
    }

    console.log("= S.ArcLine GetTextOnLineParams - Output:", textParams);
    return textParams;
  }

  RegenerateGenerateArc(svgDoc: any): void {
    console.log("= S.ArcLine RegenerateGenerateArc - Input:", svgDoc);

    let startArrow = ConstantData1.ArrowheadLookupTable[this.StartArrowID];
    let endArrow = ConstantData1.ArrowheadLookupTable[this.EndArrowID];
    const arrowSize = ConstantData1.ArrowheadSizeTable[this.ArrowSizeIndex];

    if (startArrow.id === 0) {
      startArrow = null;
    }
    if (endArrow.id === 0) {
      endArrow = null;
    }

    const shapeElement = svgDoc.GetElementByID(ConstantData.SVGElementClass.SHAPE);
    const slopElement = svgDoc.GetElementByID(ConstantData.SVGElementClass.SLOP);

    if (shapeElement != null && shapeElement.PathCreator != null) {
      const pathCreator = shapeElement.PathCreator();
      pathCreator.BeginPath();

      const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      const startX = this.StartPoint.x - rect.x;
      const startY = this.StartPoint.y - rect.y;
      const endX = this.EndPoint.x - rect.x;
      const endY = this.EndPoint.y - rect.y;

      const arcParams = this.CalcRadiusAndCenter(startX, startY, endX, endY, this.CurveAdjust, this.IsReversed);
      console.log("= S.ArcLine RegenerateGenerateArc - Arc Params:", arcParams);

      if (arcParams.centerInside) {
        pathCreator.MoveTo(endX, endY);
        pathCreator.ArcTo(startX, startY, arcParams.radius, arcParams.radius, 0, this.IsReversed, true, false);
      } else {
        pathCreator.MoveTo(startX, startY);
        pathCreator.ArcTo(endX, endY, arcParams.radius, arcParams.radius, 0, !this.IsReversed, false, false);
      }

      const pathString = pathCreator.ToString();
      console.log("= S.ArcLine RegenerateGenerateArc - Generated Path:", pathString);

      shapeElement.SetPath(pathString);
      slopElement.SetPath(pathString);
      svgDoc.SetSize(rect.width, rect.height);
      svgDoc.SetPos(rect.x, rect.y);

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

    console.log("= S.ArcLine RegenerateGenerateArc - Output: Arc regenerated with path set.");
  }

  RegenerateGenerateArcForHops(svgDoc: any): void {
    console.log("= S.ArcLine RegenerateGenerateArcForHops input:", { svgDoc });

    let startArrow = ConstantData1.ArrowheadLookupTable[this.StartArrowID];
    let endArrow = ConstantData1.ArrowheadLookupTable[this.EndArrowID];
    const arrowSize = ConstantData1.ArrowheadSizeTable[this.ArrowSizeIndex];

    if (startArrow.id === 0) {
      startArrow = null;
    }
    if (endArrow.id === 0) {
      endArrow = null;
    }

    const shapeElement = svgDoc.GetElementByID(ConstantData.SVGElementClass.SHAPE);
    const slopElement = svgDoc.GetElementByID(ConstantData.SVGElementClass.SLOP);

    let polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true);
    const hopResult = GlobalData.optManager.InsertHops(this, polyPoints, polyPoints.length);
    polyPoints = polyPoints.slice(0, hopResult.npts);

    shapeElement.SetPoints(polyPoints);

    const frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const offsetX = this.StartPoint.x - frame.x;
    const offsetY = this.StartPoint.y - frame.y;

    svgDoc.SetSize(frame.width, frame.height);
    svgDoc.SetPos(frame.x, frame.y);

    if (startArrow || endArrow) {
      const firstPoint = polyPoints[0];
      const lastPoint = polyPoints[polyPoints.length - 1];
      const distStart = (offsetX - firstPoint.x) * (offsetX - firstPoint.x) + (offsetY - firstPoint.y) * (offsetY - firstPoint.y);
      const distEnd = (offsetX - lastPoint.x) * (offsetX - lastPoint.x) + (offsetY - lastPoint.y) * (offsetY - lastPoint.y);
      const useStartAsAnchor = distEnd < distStart;

      if (useStartAsAnchor) {
        shapeElement.SetArrowheads(endArrow, arrowSize, startArrow, arrowSize, this.EndArrowDisp, this.StartArrowDisp);
        slopElement.SetArrowheads(endArrow, arrowSize, startArrow, arrowSize, this.EndArrowDisp, this.StartArrowDisp);
      } else {
        shapeElement.SetArrowheads(startArrow, arrowSize, endArrow, arrowSize, this.StartArrowDisp, this.EndArrowDisp);
        slopElement.SetArrowheads(startArrow, arrowSize, endArrow, arrowSize, this.StartArrowDisp, this.EndArrowDisp);
      }
    }

    console.log("= S.ArcLine RegenerateGenerateArcForHops output: arc regenerated with polyPoints:", polyPoints);
  }

  AdjustLineStart(svgDoc: any, newX: number, newY: number): void {
    console.log("= S.ArcLine AdjustLineStart input:", { svgDoc, newX, newY });

    // Store initial start point for rollback if needed
    const initialStart = { x: this.StartPoint.x, y: this.StartPoint.y };

    // Update start point with new coordinates
    this.StartPoint.x = newX;
    this.StartPoint.y = newY;

    // Enforce minimum dimension constraints and recalculate the frame
    this.EnforceMinimum(true);
    this.CalcFrame();

    // If the recalculated frame is invalid, rollback to initial coordinates
    if (this.r.x < 0 || this.r.y < 0) {
      this.StartPoint.x = initialStart.x;
      this.StartPoint.y = initialStart.y;
      this.CalcFrame();
    }

    // Regenerate the arc shape based on the updated start point
    this.RegenerateGenerateArc(svgDoc);

    // Resize text objects if applicable
    if (this.DataID !== -1) {
      this.LM_ResizeSVGTextObject(svgDoc, this, this.Frame);
    }

    // Log selection attributes (even if not stored, for tracing)
    new SelectionAttributes();

    // Calculate the new distance between start and end points
    const deltaX = this.EndPoint.x - this.StartPoint.x;
    const deltaY = this.EndPoint.y - this.StartPoint.y;
    Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Update dimension lines and display coordinates
    this.UpdateDimensionLines(svgDoc);
    GlobalData.optManager.UpdateDisplayCoordinates(
      this.Frame,
      this.StartPoint,
      ConstantData.CursorTypes.Grow
    );

    // Resize text objects again if applicable
    if (this.DataID !== -1) {
      this.LM_ResizeSVGTextObject(svgDoc, this, this.Frame);
    }

    console.log("= S.ArcLine AdjustLineStart output:", { updatedStart: this.StartPoint, frame: this.Frame });
  }

  AdjustLineEnd(svgDoc: any, newX: number, newY: number, trigger?: any): void {
    console.log("= S.ArcLine AdjustLineEnd - Input:", { svgDoc, newX, newY, trigger });

    // Store original end point in case a rollback is needed
    const originalEndPoint = { x: this.EndPoint.x, y: this.EndPoint.y };

    // Update end point with new coordinates
    this.EndPoint.x = newX;
    this.EndPoint.y = newY;

    // Enforce minimum dimensions and recalculate frame
    this.EnforceMinimum(false);
    this.CalcFrame();

    // If the recalculated frame is invalid (negative positions), rollback
    if (this.r.x < 0 || this.r.y < 0) {
      this.EndPoint.x = originalEndPoint.x;
      this.EndPoint.y = originalEndPoint.y;
      this.CalcFrame();
    }

    // Regenerate the arc shape if svgDoc is available
    if (svgDoc) {
      this.RegenerateGenerateArc(svgDoc);
      if (this.DataID !== -1) {
        this.LM_ResizeSVGTextObject(svgDoc, this, this.Frame);
      }

      // Log selection attributes creation for traceability
      new SelectionAttributes();

      // Calculate the distance between start and end points for logging
      const deltaX = this.EndPoint.x - this.StartPoint.x;
      const deltaY = this.EndPoint.y - this.StartPoint.y;
      const distance = Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);
      console.log("= S.ArcLine AdjustLineEnd - Calculated Distance:", distance);

      // Update dimension lines and display coordinates
      this.UpdateDimensionLines(svgDoc);
      GlobalData.optManager.UpdateDisplayCoordinates(
        this.Frame,
        this.EndPoint,
        ConstantData.CursorTypes.Grow,
        this
      );

      if (this.DataID !== -1) {
        this.LM_ResizeSVGTextObject(svgDoc, this, this.Frame);
      }
    }

    console.log("= S.ArcLine AdjustLineEnd - Output:", { updatedEndPoint: this.EndPoint, frame: this.Frame });
  }

  Flip(flipFlag: number): void {
    console.log("= S.ArcLine Flip - Input:", { flipFlag });

    let hasFlipChanged = false;
    const swapStore: { x?: number; y?: number } = {};

    // Backup the current object
    GlobalData.optManager.ob = Utils1.DeepCopy(this);

    // Vertical flip
    if (flipFlag & ConstantData.ExtraFlags.SEDE_FlipVert) {
      swapStore.y = this.StartPoint.y;
      this.StartPoint.y = this.EndPoint.y;
      this.EndPoint.y = swapStore.y;
      hasFlipChanged = true;
      console.log("= S.ArcLine Flip - Vertical flip applied");
    }

    // Horizontal flip
    if (flipFlag & ConstantData.ExtraFlags.SEDE_FlipHoriz) {
      swapStore.x = this.StartPoint.x;
      this.StartPoint.x = this.EndPoint.x;
      this.EndPoint.x = swapStore.x;
      hasFlipChanged = true;
      console.log("= S.ArcLine Flip - Horizontal flip applied");
    }

    if (hasFlipChanged) {
      this.IsReversed = !this.IsReversed;
      const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
      if (svgElement) {
        this.UpdateDimensionLines(svgElement);
        if (this.DataID !== -1) {
          this.LM_ResizeSVGTextObject(svgElement, this, this.Frame);
        }
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
      console.log("= S.ArcLine Flip - Flip change executed");
    }

    GlobalData.optManager.ob = {};
    console.log("= S.ArcLine Flip - Output:", {
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint,
      IsReversed: this.IsReversed,
    });
  }

  ModifyShape(
    svgDoc: any,
    pointerX: number,
    pointerY: number,
    trigger: number,
    extra?: any
  ): void {
    console.log("= S.ArcLine ModifyShape input:", { svgDoc, pointerX, pointerY, trigger, extra });

    // Determine which side the pointer is on relative to the line.
    let side = this.FindSide(
      this.StartPoint.x,
      this.StartPoint.y,
      this.EndPoint.x,
      this.EndPoint.y,
      pointerX,
      pointerY
    );

    // If trigger equals -1, use the original line side.
    if (trigger === -1) {
      side = this.OriginalLineSide;
    }

    // If the side has changed, update IsReversed and store the new side.
    if (side !== this.OriginalLineSide) {
      if (this.OriginalLineSide !== 0) {
        this.IsReversed = !this.IsReversed;
      }
      this.OriginalLineSide = side;
    }

    // Calculate the midpoint of the line.
    const midX = this.StartPoint.x + (this.EndPoint.x - this.StartPoint.x) / 2;
    const midY = this.StartPoint.y + (this.EndPoint.y - this.StartPoint.y) / 2;

    // Compute the current distance from the midpoint to the pointer.
    const deltaX = midX - pointerX;
    const deltaY = midY - pointerY;
    const currentDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Determine the distance difference relative to the original center point distance.
    const distanceDiff = currentDistance - this.OriginalCenterPointDistance;

    // Save the current CurveAdjust in case we need to rollback.
    const originalCurveAdjust = this.CurveAdjust;

    // Adjust CurveAdjust based on the pointer's distance.
    // Note: Using the + difference as the final calculation.
    this.CurveAdjust = this.OriginalCurveAdjust + distanceDiff;

    // Constrain CurveAdjust within the boundaries.
    if (this.CurveAdjust < 1) {
      this.CurveAdjust = 1;
    }
    if (this.CurveAdjust > 500) {
      this.CurveAdjust = 500;
    }

    // Recalculate the frame.
    this.CalcFrame();

    // If trigger is not -1 and the new frame is invalid, rollback CurveAdjust and recalc frame.
    if (trigger !== -1 && (this.r.x < 0 || this.r.y < 0)) {
      this.CurveAdjust = originalCurveAdjust;
      this.CalcFrame();
    }

    // If dimension flags are set, add this object to the dirty list.
    if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select ||
      this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always) {
      GlobalData.optManager.AddToDirtyList(this.BlockID);
    }

    // If svgDoc is provided, regenerate the arc shape and update any associated text.
    if (svgDoc) {
      this.RegenerateGenerateArc(svgDoc);
      if (this.DataID !== -1) {
        this.LM_ResizeSVGTextObject(svgDoc, this, this.Frame);
      }
    }

    console.log("= S.ArcLine ModifyShape output:", { CurveAdjust: this.CurveAdjust, Frame: this.Frame });
  }

  FindSide(startX: number, startY: number, endX: number, endY: number, pointX: number, pointY: number) {
    console.log("= S.ArcLine FindSide input:", { startX, startY, endX, endY, pointX, pointY });

    // Handle vertical line
    if (startX === endX) {
      let result: number;
      if (pointX < endX) {
        result = endY > startY ? 1 : -1;
      } else if (pointX > endX) {
        result = endY > startY ? -1 : 1;
      } else {
        result = 0;
      }
      console.log("= S.ArcLine FindSide output:", result);
      return result;
    }

    // Handle horizontal line
    if (startY === endY) {
      let result: number;
      if (pointY < endY) {
        result = endX > startX ? 1 : -1;
      } else if (pointY > endY) {
        result = endX > startX ? -1 : 1;
      } else {
        result = 0;
      }
      console.log("= S.ArcLine FindSide output:", result);
      return result;
    }

    // For non-vertical and non-horizontal lines, compute the slope
    const slope = (endY - startY) / (endX - startX);
    // Calculate the expected Y value on the line at the given pointX
    const lineY = slope * pointX + (startY - slope * startX);
    let result = 0;

    if (slope !== 0) {
      result = pointY > lineY ? (endX > startX ? 1 : -1)
        : pointY < lineY ? (endX > startX ? -1 : 1)
          : 0;
    }
    console.log("= S.ArcLine FindSide output:", result);
    return result;
  }

  BeforeModifyShape(pointerX: number, pointerY: number, extra?: any): void {
    console.log("= S.ArcLine BeforeModifyShape input:", { pointerX, pointerY, extra });

    // Store the initial curve adjustment
    this.OriginalCurveAdjust = this.CurveAdjust;

    // Calculate the center point of the line between start and end points
    const midPointX = this.StartPoint.x + (this.EndPoint.x - this.StartPoint.x) / 2;
    const midPointY = this.StartPoint.y + (this.EndPoint.y - this.StartPoint.y) / 2;

    // Calculate the distance from the pointer to the midpoint
    const deltaX = midPointX - pointerX;
    const deltaY = midPointY - pointerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    this.OriginalCenterPointDistance = distance;

    // Determine the original line side based on the curve adjustment
    if (this.CurveAdjust <= 1) {
      this.OriginalLineSide = 0;
    } else {
      this.OriginalLineSide = this.FindSide(
        this.StartPoint.x,
        this.StartPoint.y,
        this.EndPoint.x,
        this.EndPoint.y,
        pointerX,
        pointerY
      );
    }

    console.log("= S.ArcLine BeforeModifyShape output:", {
      OriginalCurveAdjust: this.OriginalCurveAdjust,
      OriginalCenterPointDistance: this.OriginalCenterPointDistance,
      OriginalLineSide: this.OriginalLineSide
    });
  }

  StartNewObjectDrawTrackCommon(currentX: number, currentY: number, additionalParam: any) {
    console.log("= S.ArcLine StartNewObjectDrawTrackCommon - Input:", { currentX, currentY, additionalParam });

    // Retrieve the starting X coordinate from the global action manager.
    const startX = GlobalData.optManager.theActionStartX;
    // Calculate the offset from the start point.
    const deltaX = currentX - startX;
    const deltaY = currentY - GlobalData.optManager.theActionStartY;
    // Compute the distance using the Euclidean distance formula.
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    console.log("= S.ArcLine StartNewObjectDrawTrackCommon - Calculated distance:", distance);

    // Merge the bounding box (the result is not stored as return value, kept for side effects).
    $.extend(true, {}, GlobalData.optManager.theActionBBox);

    // Set the curve adjustment based on the distance.
    this.CurveAdjust = distance / 10;
    if (this.CurveAdjust < 1) {
      this.CurveAdjust = 1;
    }
    if (this.CurveAdjust > 500) {
      this.CurveAdjust = 500;
    }

    // Determine if the arc should be reversed based on the current x-coordinate.
    this.IsReversed = !(currentX >= startX);
    console.log("= S.ArcLine StartNewObjectDrawTrackCommon - Updated parameters:", { CurveAdjust: this.CurveAdjust, IsReversed: this.IsReversed });

    // Adjust the line end using the updated parameters.
    this.AdjustLineEnd(GlobalData.optManager.theActionSVGObject, currentX, currentY, ConstantData.ActionTriggerType.LINEEND);

    console.log("= S.ArcLine StartNewObjectDrawTrackCommon - Output:", {
      currentX,
      currentY,
      CurveAdjust: this.CurveAdjust,
      IsReversed: this.IsReversed
    });
  }

  GetPolyPoints(
    numPolyPoints: number,
    applyOffset: boolean,
    useBaseMethod: boolean,
    paramR: any,
    paramI: any
  ): Point[] {
    console.log("= S.ArcLine GetPolyPoints input:", {
      numPolyPoints,
      applyOffset,
      useBaseMethod,
      paramR,
      paramI,
    });

    // If using base method, delegate to BaseLine implementation
    if (useBaseMethod) {
      const basePoints = ListManager.BaseLine.prototype.GetPolyPoints.call(this, numPolyPoints, applyOffset, useBaseMethod, paramR, paramI);
      console.log("= S.ArcLine GetPolyPoints output (base):", basePoints);
      return basePoints;
    }

    // Initialize arrays and objects
    let polyPoints: Point[] = [];
    const basePoints: Point[] = [];
    const centerOffset = { x: 0, y: 0 };

    // Calculate bounding rectangle and relative start/end coordinates
    const boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const startRelX = this.StartPoint.x - boundingRect.x;
    const startRelY = this.StartPoint.y - boundingRect.y;
    const endRelX = this.EndPoint.x - boundingRect.x;
    const endRelY = this.EndPoint.y - boundingRect.y;

    // Compute differences and angle for rotation
    const deltaX = endRelX - startRelX;
    const deltaY = endRelY - startRelY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    let ratio = distance > 0 ? deltaX / distance : 0;
    if (Math.abs(ratio) < 0.0001) {
      ratio = 0;
    }
    if (Math.abs(deltaY) < 0.0001) {
      // Force deltaY to zero if nearly zero for precision
      // (deltaY is used in angle calculation)
      // deltaY remains zero due to JavaScript number behavior, so no reassign.
    }
    let rotationAngle = Math.asin(ratio);
    // Invert the angle if deltaY is non-negative
    if (deltaY >= 0) {
      rotationAngle = -rotationAngle;
    }

    // Calculate arc parameters
    const arcParams = ListManager.ArcLine.prototype.CalcRadiusAndCenter.call(
      this,
      startRelX,
      startRelY,
      endRelX,
      endRelY,
      this.CurveAdjust,
      this.IsReversed
    );

    // Set rotation center based on calculated arc parameters
    centerOffset.x = arcParams.centerX;
    centerOffset.y = arcParams.centerY;

    // Push the original relative start and end points
    basePoints.push(new Point(startRelX, startRelY));
    basePoints.push(new Point(endRelX, endRelY));

    // Rotate base points about the arc center for further processing
    Utils3.RotatePointsAboutPoint(centerOffset, rotationAngle, basePoints);

    // Determine vertical ordering adjusted by FromPolygon flag
    let lowerY: number, higherY: number;
    if (basePoints[0].y > basePoints[1].y && !this.FromPolygon) {
      lowerY = basePoints[1].y;
      higherY = basePoints[0].y;
    } else {
      lowerY = basePoints[0].y;
      higherY = basePoints[1].y;
    }

    // Generate poly points representing the arc using external helper function
    polyPoints = GlobalData.optManager.ArcToPoly(
      numPolyPoints - 1,
      centerOffset,
      arcParams.radius,
      lowerY,
      higherY,
      basePoints[0].x,
      this.IsReversed,
      arcParams.centerInside
    );

    // Add an extra point based on the first generated point and the higher Y value
    polyPoints.push(new Point(polyPoints[0].x, higherY));

    // Rotate poly points back to original coordinate system
    Utils3.RotatePointsAboutPoint(centerOffset, -rotationAngle, polyPoints);

    // If applyOffset flag is false, adjust points back by the bounding rectangle offset
    if (!applyOffset) {
      for (let idx = 0; idx < polyPoints.length; idx++) {
        polyPoints[idx].x += boundingRect.x;
        polyPoints[idx].y += boundingRect.y;
      }
    }

    console.log("= S.ArcLine GetPolyPoints output:", polyPoints);
    return polyPoints;
  }

  GetConnectLine() {
    console.log("= S.ArcLine GetConnectLine input:", {
      startPoint: this.StartPoint,
      endPoint: this.EndPoint,
      curveAdjust: this.CurveAdjust,
      isReversed: this.IsReversed,
    });

    // Calculate relative coordinates based on the bounding rectangle
    const boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const startRelX = this.StartPoint.x - boundingRect.x;
    const startRelY = this.StartPoint.y - boundingRect.y;
    const endRelX = this.EndPoint.x - boundingRect.x;
    const endRelY = this.EndPoint.y - boundingRect.y;

    // Prepare the output structure
    const connectLine = {
      frame: {},
      length: 0,
      startpt: {},
      endpt: {},
      center: {},
    };

    // Compute arc parameters using relative coordinates
    const arcParams = this.CalcRadiusAndCenter(
      startRelX,
      startRelY,
      endRelX,
      endRelY,
      this.CurveAdjust,
      this.IsReversed
    );

    if (arcParams.centerInside) {
      // Calculate differences and the unit vector along the line
      let deltaX = endRelX - startRelX;
      let deltaY = endRelY - startRelY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      let unitX = distance > 0 ? deltaX / distance : 0;
      if (Math.abs(unitX) < 0.0001) {
        unitX = 0;
      }
      if (Math.abs(deltaY) < 0.0001) {
        deltaY = 0;
      }

      // Determine the rotation angle from the unit vector (handle sign inversion)
      let angle = Math.asin(unitX);
      if (deltaY >= 0) {
        angle = -angle;
      }

      // Use the arc center from the calculated parameters
      const arcCenter = { x: arcParams.centerX, y: arcParams.centerY };

      // Create points array for start and end in relative coordinates
      const points: Point[] = [];
      points.push(new Point(startRelX, startRelY));
      points.push(new Point(endRelX, endRelY));

      // Rotate points about the arc center by the computed angle
      Utils3.RotatePointsAboutPoint(arcCenter, angle, points);

      // Adjust Y coordinates so that the chord becomes centered on the arc
      let diffY: number, halfDiff: number;
      if (points[0].y > points[1].y) {
        diffY = points[0].y - points[1].y;
        halfDiff = arcParams.radius - diffY / 2;
        points[0].y += halfDiff;
        points[1].y -= halfDiff;
      } else {
        diffY = points[1].y - points[0].y;
        halfDiff = arcParams.radius - diffY / 2;
        points[1].y += halfDiff;
        points[0].y -= halfDiff;
      }

      // Rotate the points back to the original orientation
      Utils3.RotatePointsAboutPoint(arcCenter, -angle, points);

      // Translate the points back to the original coordinate system
      points[0].x += boundingRect.x;
      points[0].y += boundingRect.y;
      points[1].x += boundingRect.x;
      points[1].y += boundingRect.y;

      // Compute the frame and length of the connection line
      connectLine.frame = Utils2.Pt2Rect(points[0], points[1]);
      const finalDeltaX = points[0].x - points[1].x;
      const finalDeltaY = points[0].y - points[1].y;
      connectLine.length = Math.sqrt(finalDeltaX * finalDeltaX + finalDeltaY * finalDeltaY);
      connectLine.startpt = { x: points[0].x, y: points[0].y };
      connectLine.endpt = { x: points[1].x, y: points[1].y };
      connectLine.center = {
        x: arcCenter.x + boundingRect.x,
        y: arcCenter.y + boundingRect.y,
      };

      console.log("= S.ArcLine GetConnectLine output:", connectLine);
      return connectLine;
    } else {
      console.log("= S.ArcLine GetConnectLine output:", null, "(arc center not inside)");
      return null;
    }
  }

  GetTargetPoints(hook: any, hookFlags: any, targetId: any): Point[] {
    console.log("= S.ArcLine GetTargetPoints input:", { hook, hookFlags, targetId });

    let result: Point[] = [{ x: 0, y: 0 }];
    const connectLine = this.GetConnectLine();
    let ptStart: Point;
    let ptEnd: Point;
    const hookPoints = ConstantData.HookPts;

    // If a valid target object exists and is a SHAPE, use base method for certain hook IDs.
    if (targetId != null && targetId >= 0) {
      const objPtr = GlobalData.optManager.GetObjectPtr(targetId, false);
      if (objPtr.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
        switch (hook.id) {
          case hookPoints.SED_KTC:
          case hookPoints.SED_KBC:
          case hookPoints.SED_KRC:
          case hookPoints.SED_KLC: {
            const baseTargetPoints = ListManager.BaseLine.prototype.GetTargetPoints.call(this, hook, hookFlags, targetId);
            console.log("= S.ArcLine GetTargetPoints output (base):", baseTargetPoints);
            return baseTargetPoints;
          }
        }
      }
    }

    // Determine the start and end points based on the connect line if available.
    if (connectLine) {
      ptStart = connectLine.startpt;
      ptEnd = connectLine.endpt;
    } else {
      ptStart = this.StartPoint;
      ptEnd = this.EndPoint;
    }

    let deltaX = this.EndPoint.x - this.StartPoint.x;
    if (Math.abs(deltaX) < 1) {
      deltaX = 1;
    }
    let deltaY = this.EndPoint.y - this.StartPoint.y;
    const slope = deltaY / deltaX;

    // Calculate chord difference using the external ArcToChord helper.
    const chord = GlobalData.optManager.ArcToChord(ptStart, ptEnd, hook, connectLine, this);
    let diffX: number;
    let diffY: number;

    if (Math.abs(slope) > 1 || (hookFlags & ConstantData.HookFlags.SED_LC_HOnly)) {
      diffY = chord.y - ptStart.y;
      diffX = chord.x - ptStart.x;
    } else {
      diffX = chord.x - ptStart.x;
      diffY = chord.y - ptStart.y;
    }

    // Recompute the differences based on the connect line endpoints.
    deltaX = ptEnd.x - ptStart.x;
    deltaY = ptEnd.y - ptStart.y;

    if (Math.abs(deltaY) > 1) {
      result[0].y = (diffY / deltaY) * ConstantData.Defines.SED_CDim;
    } else {
      result[0].y = ConstantData.Defines.SED_CDim;
    }

    if (Math.abs(deltaX) > 1) {
      result[0].x = (diffX / deltaX) * ConstantData.Defines.SED_CDim;
    } else {
      result[0].x = ConstantData.Defines.SED_CDim;
    }

    // Constrain the values to be within 0 and the defined dimension.
    if (result[0].x > ConstantData.Defines.SED_CDim) {
      result[0].x = ConstantData.Defines.SED_CDim;
    }
    if (result[0].y > ConstantData.Defines.SED_CDim) {
      result[0].y = ConstantData.Defines.SED_CDim;
    }
    if (result[0].x < 0) {
      result[0].x = 0;
    }
    if (result[0].y < 0) {
      result[0].y = 0;
    }

    // If a connect line exists, adjust x value rounding.
    if (connectLine) {
      const isRounded = (2 * Math.round(chord.x / 2)) !== chord.x;
      result[0].x = 2 * Math.round((result[0].x + 0.5) / 2);
      if (isRounded) {
        result[0].x--;
      }
    }

    console.log("= S.ArcLine GetTargetPoints output:", result);
    return result;
  }

  GetPerimPts(eventArg, hooks, argA, argR, argI, targetId) {
    console.log("= S.ArcLine GetPerimPts input:", { eventArg, hooks, argA, argR, argI, targetId });

    let basePerimPoints,
      isReversed = this.IsReversed,
      hookCount,
      connectLine,
      resultPoints: Point[] = [],
      centerAbsolute: { x?: number; y?: number } = {},
      roundingFlag = false,
      lineStart: Point = {},
      lineEnd: Point = {},
      boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint),
      relativeStartX = this.StartPoint.x - boundingRect.x,
      relativeStartY = this.StartPoint.y - boundingRect.y,
      relativeEndX = this.EndPoint.x - boundingRect.x,
      relativeEndY = this.EndPoint.y - boundingRect.y;

    // If hooks contain exactly two points with expected IDs, return start and end as perimeter points.
    hookCount = hooks.length;
    if (
      hooks &&
      hookCount === 2 &&
      hooks[0].id &&
      hooks[0].id === ConstantData.HookPts.SED_KTL &&
      hooks[1].id &&
      hooks[1].id === ConstantData.HookPts.SED_KTR
    ) {
      resultPoints.push(new Point(this.StartPoint.x, this.StartPoint.y));
      resultPoints[0].id = hooks[0].id;
      resultPoints.push(new Point(this.EndPoint.x, this.EndPoint.y));
      resultPoints[1].id = hooks[1].id;
      console.log("= S.ArcLine GetPerimPts output:", resultPoints);
      return resultPoints;
    }

    // Check for specific object types from target.
    const targetObj = GlobalData.optManager.GetObjectPtr(targetId, false);
    if (targetObj && targetObj.objecttype === ConstantData.ObjectTypes.SD_OBJT_MULTIPLICITY) {
      resultPoints = ListManager.BaseLine.prototype.GetPerimPts.call(this, eventArg, hooks, argA, argR, argI, targetId);
      console.log("= S.ArcLine GetPerimPts output:", resultPoints);
      return resultPoints;
    }
    if (targetObj && targetObj.objecttype === ConstantData.ObjectTypes.SD_OBJT_EXTRATEXTLABEL && hookCount === 1) {
      resultPoints = ListManager.BaseLine.prototype.GetPerimPts.call(this, eventArg, hooks, argA, argR, argI, targetId);
      console.log("= S.ArcLine GetPerimPts output:", resultPoints);
      return resultPoints;
    }

    // Calculate arc parameters based on relative coordinates.
    const arcParams = this.CalcRadiusAndCenter(relativeStartX, relativeStartY, relativeEndX, relativeEndY, this.CurveAdjust, this.IsReversed);
    centerAbsolute.x = arcParams.centerX + boundingRect.x;
    centerAbsolute.y = arcParams.centerY + boundingRect.y;

    // Get base perimeter points from BaseLine.
    basePerimPoints = ListManager.BaseLine.prototype.GetPerimPts.call(this, eventArg, hooks, argA, argR, argI, targetId);

    // Determine connection line: if available, use its start and end; else use object's start and end.
    connectLine = this.GetConnectLine();
    if (connectLine) {
      lineStart = connectLine.startpt;
      lineEnd = connectLine.endpt;
      // Check for rounding: if the first hook's x value is not a multiple of 2 exactly.
      roundingFlag = (2 * Math.round(hooks[0].x / 2)) !== hooks[0].x;
      isReversed = false;
    } else {
      lineStart = this.StartPoint;
      lineEnd = this.EndPoint;
    }

    hookCount = basePerimPoints.length;
    // Convert each chord point to an arc point.
    for (let index = 0; index < hookCount; index++) {
      resultPoints[index] = GlobalData.optManager.ChordToArc(
        lineStart,
        lineEnd,
        centerAbsolute,
        arcParams.radius,
        isReversed,
        roundingFlag,
        arcParams.centerInside,
        basePerimPoints[index]
      );
      if (basePerimPoints[index].id != null) {
        resultPoints[index].id = basePerimPoints[index].id;
      }
    }

    console.log("= S.ArcLine GetPerimPts output:", resultPoints);
    return resultPoints;
  }

  MaintainPoint(eventArg, targetId, paramA, refObject, extraParam) {
    console.log("= S.ArcLine MaintainPoint input:", { eventArg, targetId, paramA, refObject, extraParam });

    let status, index, hookPoint = {}, copiedObject = {};

    switch (refObject.DrawingObjectBaseClass) {
      case ConstantData.DrawingObjectBaseClass.LINE:
        switch (refObject.LineType) {
          case ConstantData.LineType.SEGLINE:
          case ConstantData.LineType.ARCSEGLINE:
          case ConstantData.LineType.POLYLINE:
            status = -1;
            for (index = 0; index < refObject.hooks.length; index++) {
              if (refObject.hooks[index].targetid === targetId) {
                refObject.HookToPoint(refObject.hooks[index].hookpt, hookPoint);
                status = 0;
                break;
              }
            }
            if (status !== 0) {
              console.log("= S.ArcLine MaintainPoint output:", true, "(hook not found)");
              return true;
            }
            copiedObject = Utils1.DeepCopy(refObject);
            Utils2.CopyRect(copiedObject.Frame, hookPoint);
            copiedObject.StartPoint.x = hookPoint.x;
            copiedObject.StartPoint.y = hookPoint.y;
            copiedObject.EndPoint.x = hookPoint.x + hookPoint.width;
            copiedObject.EndPoint.y = hookPoint.y + hookPoint.height;
            console.log("= S.ArcLine MaintainPoint output:", copiedObject);
            return copiedObject;
        }
        if (GlobalData.optManager.ArcCheckPoint(this, eventArg)) {
          console.log("= S.ArcLine MaintainPoint output:", true, "(ArcCheckPoint triggered)");
          return true;
        }
        if (GlobalData.optManager.Arc_Intersect(this, refObject, eventArg)) {
          console.log("= S.ArcLine MaintainPoint output:", true, "(Arc_Intersect triggered)");
          return true;
        }
        GlobalData.optManager.Lines_MaintainDist(this, paramA, extraParam, eventArg);
        break;

      case ConstantData.DrawingObjectBaseClass.SHAPE:
        GlobalData.optManager.Lines_MaintainDist(this, paramA, extraParam, eventArg);
        break;
    }

    console.log("= S.ArcLine MaintainPoint output:", true);
    return true;
  }
}

export default ArcLine
