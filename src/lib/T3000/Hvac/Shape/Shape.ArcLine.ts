
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

}

export default ArcLine
