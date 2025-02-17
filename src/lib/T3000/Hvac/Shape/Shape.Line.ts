

import BaseLine from './Shape.BaseLine'
import Utils1 from '../Helper/Utils1'
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import GPP from '../Data/GlobalData'
import Point from '../Model/Point'
import Document from '../Basic/Basic.Document'
import Element from '../Basic/Basic.Element'
import ConstantData from '../Data/ConstantData'
import PolySeg from '../Model/PolySeg'
import SelectionAttributes from '../Model/SelectionAttributes'
import ConstantData2 from '../Data/ConstantData2'
import GlobalData from '../Data/GlobalData'

class Line extends BaseLine {

  public StartPoint: Point;
  public EndPoint: Point;
  public FixedPoint: number[];
  public LineOrientation: number;
  public hoplist: any;
  public ArrowheadData: any[];
  public ShortRef: number;
  public shapeparam: number;
  public StartArrowID: number;
  public EndArrowID: number;
  public StartArrowDisp: boolean;
  public EndArrowDisp: boolean;
  public ArrowSizeIndex: number;
  public TextDirection: boolean;

  constructor(lineParam: any = {}) {

    lineParam = lineParam || {};
    lineParam.LineType = ConstantData.LineType.LINE;

    super(lineParam);

    this.StartPoint = lineParam.StartPoint || { x: 0, y: 0 };
    this.EndPoint = lineParam.EndPoint || { x: 0, y: 0 };
    this.FixedPoint = lineParam.FixedPoint || [0, 0];
    this.LineOrientation = lineParam.LineOrientation || ConstantData.LineOrientation.NONE;
    this.hoplist = lineParam.hoplist || { nhops: 0, hops: [] };
    this.ArrowheadData = lineParam.ArrowheadData || [];
    this.ShortRef = lineParam.ShortRef || 0;
    this.shapeparam = lineParam.shapeparam || 0;
    this.StartArrowID = lineParam.StartArrowID || 0;
    this.EndArrowID = lineParam.EndArrowID || 0;
    this.StartArrowDisp = lineParam.StartArrowDisp || false;
    this.EndArrowDisp = lineParam.EndArrowDisp || false;
    this.ArrowSizeIndex = lineParam.ArrowSizeIndex || 0;
    this.TextDirection = lineParam.TextDirection || false;

    this.CalcFrame();
  }

  GetLineShapePolyPoints(numPoints: number, adjustForFrame: boolean): Point[] {
    const polyPoints: Point[] = [];
    let shapeValue = this.shapeparam;
    let shortReference = this.ShortRef;
    if (shapeValue < 0.01) {
      shortReference = 0;
    }

    const deltaX = this.EndPoint.x - this.StartPoint.x;
    const deltaY = this.EndPoint.y - this.StartPoint.y;
    // Use a special curve when shortReference equals 2 (or a specific constant)
    const useSpecialCurve = (shortReference === 2);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance === 0) return polyPoints;

    const sinTheta = deltaY / distance;
    const cosTheta = deltaX / distance;
    const limitedDistance = distance > 200 ? 200 : distance;
    const offset = shapeValue * limitedDistance / 2;
    const segmentLength = (distance - 2 * offset) / 2;

    // Start point
    const startPoint = { x: this.StartPoint.x, y: this.StartPoint.y };
    polyPoints.push(startPoint);

    // End of the first linear segment
    const firstSegmentEnd = {
      x: this.StartPoint.x + segmentLength * cosTheta,
      y: this.StartPoint.y + segmentLength * sinTheta
    };
    polyPoints.push(firstSegmentEnd);

    // Calculate components from offset
    const offsetComponentX = offset * sinTheta; // corresponds to vertical offset from segment end
    const offsetComponentY = offset * cosTheta; // corresponds to horizontal offset from segment end

    // The point where the curve starts
    const curveStart = {
      x: firstSegmentEnd.x + offsetComponentX,
      y: firstSegmentEnd.y - offsetComponentY
    };

    if (useSpecialCurve) {
      polyPoints.push(curveStart);

      // In the special curve branch, add additional points without shift adjustments
      const specialPoint = {
        x: curveStart.x + offsetComponentY,
        y: curveStart.y + offsetComponentX
      };
      polyPoints.push(specialPoint);

      const intermediatePoint = {
        x: specialPoint.x - 2 * segmentLength * cosTheta,
        y: specialPoint.y + 2 * segmentLength * sinTheta
      };
      polyPoints.push(intermediatePoint);

      const secondCurvePoint = {
        x: intermediatePoint.x + offsetComponentY,
        y: intermediatePoint.y + offsetComponentX
      };
      polyPoints.push(secondCurvePoint);

      const finalCurvePoint = {
        x: secondCurvePoint.x + segmentLength * cosTheta,
        y: secondCurvePoint.y - offsetComponentY
      };
      polyPoints.push(finalCurvePoint);

      // Push the end point of the line
      polyPoints.push({ x: this.EndPoint.x, y: this.EndPoint.y });
    } else {
      // Normal branch with shift adjustments
      const shiftX = offset * cosTheta / 2;
      const shiftY = offset * sinTheta / 2;

      const adjustedCurvePoint = {
        x: curveStart.x + offsetComponentY - shiftX,
        y: curveStart.y + offsetComponentX - shiftY
      };
      polyPoints.push(adjustedCurvePoint);

      const intermediatePoint = {
        x: adjustedCurvePoint.x - 2 * segmentLength * cosTheta + 2 * shiftX,
        y: adjustedCurvePoint.y + 2 * segmentLength * sinTheta + 2 * shiftY
      };
      polyPoints.push(intermediatePoint);

      const secondAdjustedPoint = {
        x: intermediatePoint.x + offsetComponentY - shiftX,
        y: intermediatePoint.y + offsetComponentX - shiftY
      };
      const finalCurvePoint = {
        x: secondAdjustedPoint.x + offset * sinTheta,
        y: secondAdjustedPoint.y - offset * cosTheta
      };
      polyPoints.push(finalCurvePoint);

      // Finally, add the end point of the line
      polyPoints.push({ x: this.EndPoint.x, y: this.EndPoint.y });
    }

    if (adjustForFrame) {
      for (let i = 0; i < polyPoints.length; i++) {
        polyPoints[i].x -= this.Frame.x;
        polyPoints[i].y -= this.Frame.y;
      }
    }
    return polyPoints;
  }

  CreateShape(svgDoc, useHiddenEventBehavior) {
    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) return null;

    // Determine the effective short reference based on shape parameter
    let shortReference = this.ShortRef;
    if (this.shapeparam < 0.01) {
      shortReference = 0;
    }
    const isSimpleLine =
      (shortReference === 0 ||
        shortReference === ConstantData2.LineTypes.SED_LS_MeasuringTape) &&
      this.hoplist.nhops === 0;

    // Create container and shape elements
    const containerShape = svgDoc.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER);
    const shapeElement = isSimpleLine
      ? svgDoc.CreateShape(ConstantData.CreateShapeType.LINE)
      : svgDoc.CreateShape(ConstantData.CreateShapeType.POLYLINE);
    shapeElement.SetID(ConstantData.SVGElementClass.SHAPE);

    const slopElement = isSimpleLine
      ? svgDoc.CreateShape(ConstantData.CreateShapeType.LINE)
      : svgDoc.CreateShape(ConstantData.CreateShapeType.POLYLINE);
    slopElement.SetID(ConstantData.SVGElementClass.SLOP);
    slopElement.ExcludeFromExport(true);

    // Calculate the drawing frame
    this.CalcFrame();
    const frame = this.Frame;

    // Get style information
    let styleRecord = this.StyleRecord;
    styleRecord = this.SVGTokenizerHook(styleRecord);
    if (!styleRecord) {
      const sessionBlock = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
      if (sessionBlock) {
        styleRecord = sessionBlock.def.style;
      }
    }

    let lineColor, lineThickness, lineOpacity, linePattern;
    if (styleRecord) {
      lineColor = styleRecord.Line.Paint.Color;
      lineThickness = styleRecord.Line.Thickness;
      // Ensure a visible thickness if the value is too thin
      if (lineThickness > 0 && lineThickness < 1) {
        lineThickness = 1;
      }
      lineOpacity = styleRecord.Line.Paint.Opacity;
      linePattern = styleRecord.Line.LinePattern;
    }

    // Set container dimensions
    const containerWidth = frame.width;
    const containerHeight = frame.height;
    containerShape.SetSize(containerWidth, containerHeight);
    containerShape.SetPos(frame.x, frame.y);
    shapeElement.SetSize(containerWidth, containerHeight);

    let points = [];
    if (isSimpleLine) {
      shapeElement.SetPoints(
        this.StartPoint.x - frame.x,
        this.StartPoint.y - frame.y,
        this.EndPoint.x - frame.x,
        this.EndPoint.y - frame.y
      );
    } else {
      points = this.GetLineShapePolyPoints(ConstantData.Defines.NPOLYPTS, true);
      if (this.hoplist.nhops !== 0) {
        const hopResult = GlobalData.optManager.InsertHops(this, points, points.length);
        points = points.slice(0, hopResult.npts);
      }
      shapeElement.SetPoints(points);
    }

    // Apply stroke and fill style settings to the shape element
    shapeElement.SetFillColor('none');
    shapeElement.SetStrokeColor(lineColor);
    shapeElement.SetStrokeOpacity(lineOpacity);
    shapeElement.SetStrokeWidth(lineThickness);
    if (linePattern !== 0) {
      shapeElement.SetStrokePattern(linePattern);
    }

    // Configure the slop (invisible drag target) element
    slopElement.SetSize(containerWidth, containerHeight);
    if (isSimpleLine) {
      slopElement.SetPoints(
        this.StartPoint.x - frame.x,
        this.StartPoint.y - frame.y,
        this.EndPoint.x - frame.x,
        this.EndPoint.y - frame.y
      );
    } else {
      slopElement.SetPoints(points);
    }
    slopElement.SetStrokeColor('white');
    slopElement.SetFillColor('none');
    slopElement.SetOpacity(0);
    slopElement.SetEventBehavior(
      useHiddenEventBehavior ? Element.EventBehavior.HIDDEN_OUT : Element.EventBehavior.NONE
    );
    slopElement.SetStrokeWidth(lineThickness + ConstantData.Defines.SED_Slop);

    // Add the shape elements to the container
    containerShape.AddElement(shapeElement);
    containerShape.AddElement(slopElement);

    // Apply any additional styles or effects
    this.ApplyStyles(shapeElement, styleRecord);
    this.ApplyEffects(containerShape, false, true);

    if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR) {
      GlobalData.optManager.GanttSetPercentCompleteEffectOnBar(this, shapeElement, styleRecord);
    }

    containerShape.isShape = true;
    this.AddIcons(svgDoc, containerShape);
    return containerShape;
  }

  SetCursors() {
    const svgLayerElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    if (GlobalData.optManager.currentModalOperation === ListManager.ModalOperations.ADDCORNER) {
      const slopElement = svgLayerElement.GetElementByID(ConstantData.SVGElementClass.SLOP);
      if (slopElement) {
        slopElement.SetCursor(Element.CursorType.CROSSHAIR);
      }
    } else {
      this.BaseDrawingObject_SetCursors();
    }
  }

  BaseDrawingObject_SetCursors() {
    const containerElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    let clearCursorForShapeAndSlop = false;

    if (!(this.flags & ConstantData.ObjFlags.SEDO_Lock) && containerElement) {
      if (GlobalData.optManager.GetEditMode() === ConstantData.EditState.DEFAULT) {
        // Set cursor for the main shape element
        const shapeElement = containerElement.GetElementByID(ConstantData.SVGElementClass.SHAPE);
        if (shapeElement) {
          if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FRAME_CONTAINER) {
            shapeElement.SetCursor(Element.CursorType.DEFAULT);
          } else {
            shapeElement.SetCursor(Element.CursorType.ADD);
          }
        }

        // Set cursors for icon elements
        let iconElement = containerElement.GetElementByID(ConstantData.ShapeIconType.HYPERLINK);
        if (iconElement) {
          iconElement.SetCursor(Element.CursorType.POINTER);
        }

        iconElement = containerElement.GetElementByID(ConstantData.ShapeIconType.TRELLOLINK);
        if (iconElement) {
          iconElement.SetCursor(Element.CursorType.POINTER);
        }

        iconElement = containerElement.GetElementByID(ConstantData.ShapeIconType.NOTES);
        if (iconElement) {
          iconElement.SetCursor(Element.CursorType.POINTER);
        }

        iconElement = containerElement.GetElementByID(ConstantData.ShapeIconType.EXPANDEDVIEW);
        if (iconElement) {
          iconElement.SetCursor(Element.CursorType.POINTER);
        }

        iconElement = containerElement.GetElementByID(ConstantData.ShapeIconType.COMMENT);
        if (iconElement) {
          iconElement.SetCursor(Element.CursorType.POINTER);
        }

        iconElement = containerElement.GetElementByID(ConstantData.ShapeIconType.ATTACHMENT);
        if (iconElement) {
          iconElement.SetCursor(Element.CursorType.POINTER);
        }

        iconElement = containerElement.GetElementByID(ConstantData.ShapeIconType.FIELDDATA);
        if (iconElement) {
          iconElement.SetCursor(Element.CursorType.POINTER);
        }

        // Set cursor for the slop element (the invisible drag target)
        const slopElement = containerElement.GetElementByID(ConstantData.SVGElementClass.SLOP);
        if (slopElement) {
          slopElement.SetCursor(Element.CursorType.ADD);
        }

        const activeEditElement = GlobalData.optManager.svgDoc.GetActiveEdit();

        // Adjust text element cursor if there is one
        if (this.DataID && this.DataID >= 0 && containerElement.textElem) {
          if (containerElement.textElem === activeEditElement) {
            shapeElement.SetCursor(Element.CursorType.TEXT);
            containerElement.textElem.SetCursorState(ConstantData.CursorState.EDITLINK);
          } else {
            containerElement.textElem.SetCursorState(ConstantData.CursorState.LINKONLY);
          }
        }

        // For dimension text elements, adjust their cursor state
        if ((this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always) ||
            ((this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select) && this.IsSelected())) {
          const dimensionTextElements = containerElement.GetElementListWithID(ConstantData.SVGElementClass.DIMENSIONTEXT);
          for (let idx = 0; idx < dimensionTextElements.length; idx++) {
            dimensionTextElements[idx].SetCursorState(ConstantData.CursorState.EDITONLY);
            if (dimensionTextElements[idx] === activeEditElement) {
              clearCursorForShapeAndSlop = true;
            }
          }
          if (clearCursorForShapeAndSlop) {
            shapeElement.SetCursor(null);
            if (slopElement) {
              slopElement.SetCursor(null);
            }
          }
        }
      } else {
        this.ClearCursors();
      }
    } else {
      this.ClearCursors();
    }
  }

  AdjustLineStart(
    svgContainer: any,
    newStartX: number,
    newStartY: number,
    unusedParam: any,
    forceLinkAdjustment: boolean,
    skipMinimumEnforcement: boolean
  ) {
    // Update the start point
    this.StartPoint.x = newStartX;
    this.StartPoint.y = newStartY;
    if (!skipMinimumEnforcement) {
      this.EnforceMinimum(true);
    }

    // Determine if link adjustment is active
    let isLinkMode = false;
    if (GlobalData.optManager.LinkParams && GlobalData.optManager.LinkParams.ConnectIndex >= 0) {
      isLinkMode = true;
    }
    if (forceLinkAdjustment) {
      isLinkMode = true;
    }
    if (!isLinkMode) {
      this.AdjustForLineAngleSnap(this.EndPoint, this.StartPoint);
    }

    // Recalculate frame and update container element
    this.CalcFrame();
    svgContainer.SetSize(this.Frame.width, this.Frame.height);
    svgContainer.SetPos(this.Frame.x, this.Frame.y);

    const shapeElement = svgContainer.GetElementByID(ConstantData.SVGElementClass.SHAPE);
    const slopElement = svgContainer.GetElementByID(ConstantData.SVGElementClass.SLOP);
    shapeElement.SetSize(this.Frame.width, this.Frame.height);

    // Determine if the line is a simple line
    const isSimpleLine =
      (this.ShortRef === 0 ||
        this.ShortRef === ConstantData2.LineTypes.SED_LS_MeasuringTape) &&
      this.hoplist.nhops === 0;
    let shapePoints: Point[] = [];
    if (isSimpleLine) {
      shapeElement.SetPoints(
        this.StartPoint.x - this.Frame.x,
        this.StartPoint.y - this.Frame.y,
        this.EndPoint.x - this.Frame.x,
        this.EndPoint.y - this.Frame.y
      );
    } else {
      shapePoints = this.GetLineShapePolyPoints(ConstantData.Defines.NPOLYPTS, true);
      shapeElement.SetPoints(shapePoints);
    }

    // Update the slop (drag target) element
    slopElement.SetSize(this.Frame.width, this.Frame.height);
    if (isSimpleLine) {
      slopElement.SetPoints(
        this.StartPoint.x - this.Frame.x,
        this.StartPoint.y - this.Frame.y,
        this.EndPoint.x - this.Frame.x,
        this.EndPoint.y - this.Frame.y
      );
    } else {
      slopElement.SetPoints(shapePoints);
    }

    // Recalculate frame and update flags if necessary
    this.CalcFrame();
    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    svgContainer.SetSize(this.Frame.width, this.Frame.height);
    svgContainer.SetPos(this.Frame.x, this.Frame.y);
    shapeElement.SetSize(this.Frame.width, this.Frame.height);
    if (isSimpleLine) {
      shapeElement.SetPoints(
        this.StartPoint.x - this.Frame.x,
        this.StartPoint.y - this.Frame.y,
        this.EndPoint.x - this.Frame.x,
        this.EndPoint.y - this.Frame.y
      );
    } else {
      shapePoints = this.GetLineShapePolyPoints(ConstantData.Defines.NPOLYPTS, true);
      shapeElement.SetPoints(shapePoints);
    }
    slopElement.SetSize(this.Frame.width, this.Frame.height);
    if (isSimpleLine) {
      slopElement.SetPoints(
        this.StartPoint.x - this.Frame.x,
        this.StartPoint.y - this.Frame.y,
        this.EndPoint.x - this.Frame.x,
        this.EndPoint.y - this.Frame.y
      );
    } else {
      slopElement.SetPoints(shapePoints);
    }

    // Update dimensions and coordinates
    this.UpdateDimensionLines(svgContainer);
    this.UpdateCoordinateLines(svgContainer);

    // Set selection attributes
    new SelectionAttributes();
    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const offsetPoints: Point[] = [];
    offsetPoints.push(new Point(this.StartPoint.x - rect.x, this.StartPoint.y - rect.y));
    offsetPoints.push(new Point(this.EndPoint.x - rect.x, this.EndPoint.y - rect.y));

    const deltaX = offsetPoints[0].x - offsetPoints[1].x;
    const deltaY = offsetPoints[0].y - offsetPoints[1].y;
    Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);

    GlobalData.optManager.UpdateDisplayCoordinates(
      this.Frame,
      this.StartPoint,
      ConstantData.CursorTypes.Grow,
      this
    );

    if (this.DataID !== -1) {
      this.LM_ResizeSVGTextObject(svgContainer, this, this.Frame);
    }
  }

  AdjustLineEnd(
    svgContainer: any,
    newEndPointX: number,
    newEndPointY: number,
    unusedParam: any,
    snapEnabled: boolean
  ) {
    let updatedPoints: Point[] = [];
    let shapeElem: any, slopElem: any;

    if (svgContainer) {
      shapeElem = svgContainer.GetElementByID(ConstantData.SVGElementClass.SHAPE);
      slopElem = svgContainer.GetElementByID(ConstantData.SVGElementClass.SLOP);
    }

    // Update endpoint coordinates and enforce minimum size
    this.EndPoint.x = newEndPointX;
    this.EndPoint.y = newEndPointY;
    this.EnforceMinimum(false);

    // Determine if line angle snap should be applied
    const linkParamsExist =
      GlobalData.optManager.LinkParams && GlobalData.optManager.LinkParams.ConnectIndex >= 0;
    const adjustForAngleSnap = snapEnabled || linkParamsExist;

    if (adjustForAngleSnap) {
      this.AdjustForLineAngleSnap(this.StartPoint, this.EndPoint);
    }

    this.CalcFrame();

    if (svgContainer) {
      // Update container dimensions and position
      svgContainer.SetSize(this.Frame.width, this.Frame.height);
      svgContainer.SetPos(this.Frame.x, this.Frame.y);
      shapeElem.SetSize(this.Frame.width, this.Frame.height);

      let polyPoints: Point[] = [];
      const isSimpleLine =
        (this.ShortRef === 0 ||
          this.ShortRef === ConstantData2.LineTypes.SED_LS_MeasuringTape) &&
        this.hoplist.nhops === 0;

      if (isSimpleLine) {
        shapeElem.SetPoints(
          this.StartPoint.x - this.Frame.x,
          this.StartPoint.y - this.Frame.y,
          this.EndPoint.x - this.Frame.x,
          this.EndPoint.y - this.Frame.y
        );
      } else {
        polyPoints = this.GetLineShapePolyPoints(ConstantData.Defines.NPOLYPTS, true);
        shapeElem.SetPoints(polyPoints);
      }

      // Update the invisible drag target (slop element)
      slopElem.SetSize(this.Frame.width, this.Frame.height);
      if (isSimpleLine) {
        slopElem.SetPoints(
          this.StartPoint.x - this.Frame.x,
          this.StartPoint.y - this.Frame.y,
          this.EndPoint.x - this.Frame.x,
          this.EndPoint.y - this.Frame.y
        );
      } else {
        slopElem.SetPoints(polyPoints);
      }

      // Clear width/height flags if set
      if (this.rflags) {
        this.rflags = Utils2.SetFlag(
          this.rflags,
          ConstantData.FloatingPointDim.SD_FP_Width,
          false
        );
        this.rflags = Utils2.SetFlag(
          this.rflags,
          ConstantData.FloatingPointDim.SD_FP_Height,
          false
        );
      }

      // Recalculate frame and update container
      this.CalcFrame();
      svgContainer.SetSize(this.Frame.width, this.Frame.height);
      svgContainer.SetPos(this.Frame.x, this.Frame.y);
      shapeElem.SetSize(this.Frame.width, this.Frame.height);

      if (isSimpleLine) {
        shapeElem.SetPoints(
          this.StartPoint.x - this.Frame.x,
          this.StartPoint.y - this.Frame.y,
          this.EndPoint.x - this.Frame.x,
          this.EndPoint.y - this.Frame.y
        );
      } else {
        polyPoints = this.GetLineShapePolyPoints(ConstantData.Defines.NPOLYPTS, true);
        shapeElem.SetPoints(polyPoints);
      }

      slopElem.SetSize(this.Frame.width, this.Frame.height);
      if (isSimpleLine) {
        slopElem.SetPoints(
          this.StartPoint.x - this.Frame.x,
          this.StartPoint.y - this.Frame.y,
          this.EndPoint.x - this.Frame.x,
          this.EndPoint.y - this.Frame.y
        );
      } else {
        slopElem.SetPoints(polyPoints);
      }

      // Update dimension and coordinate lines
      this.UpdateDimensionLines(svgContainer);
      this.UpdateCoordinateLines(svgContainer);

      // Set selection attributes and update display coordinates
      new SelectionAttributes();
      const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      updatedPoints.push(
        new Point(this.StartPoint.x - rect.x, this.StartPoint.y - rect.y)
      );
      updatedPoints.push(
        new Point(this.EndPoint.x - rect.x, this.EndPoint.y - rect.y)
      );

      const deltaX = updatedPoints[0].x - updatedPoints[1].x;
      const deltaY = updatedPoints[0].y - updatedPoints[1].y;
      Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);

      const copiedEndPoint = Utils1.DeepCopy(this.EndPoint);
      GlobalData.optManager.UpdateDisplayCoordinates(
        this.Frame,
        copiedEndPoint,
        ConstantData.CursorTypes.Grow,
        this
      );

      if (
        GlobalData.optManager.theContentHeader.flags &
          ConstantData.ContentHeaderFlags.CT_DA_NoAuto &&
        (copiedEndPoint.x !== this.EndPoint.x || copiedEndPoint.y !== this.EndPoint.y)
      ) {
        const error = new Error(Resources.Strings.Error_Bounds);
        error.name = '1';
        throw error;
      }

      if (this.DataID !== -1) {
        this.LM_ResizeSVGTextObject(svgContainer, this, this.Frame);
      }
    }
  }

  Flip(flipFlags: number) {
    let hasFlipped = false;
    const temp: { x?: number; y?: number } = {};

    // Create a backup copy of the current line
    GlobalData.optManager.ob = Utils1.DeepCopy(this);

    // Perform vertical flip if required
    if (flipFlags & ConstantData.ExtraFlags.SEDE_FlipVert) {
      temp.y = this.StartPoint.y;
      this.StartPoint.y = this.EndPoint.y;
      this.EndPoint.y = temp.y;
      hasFlipped = true;
    }

    // Perform horizontal flip if required
    if (flipFlags & ConstantData.ExtraFlags.SEDE_FlipHoriz) {
      temp.x = this.StartPoint.x;
      this.StartPoint.x = this.EndPoint.x;
      this.EndPoint.x = temp.x;
      hasFlipped = true;
    }

    // If any flip has occurred, update related components
    if (hasFlipped) {
      const svgContainer = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
      this.UpdateDimensionLines(svgContainer);

      if (this.DataID !== -1) {
        this.LM_ResizeSVGTextObject(svgContainer, this, this.Frame);
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
  }

  AddCorner(eventData, newCornerPoint) {
    // Backup the current line object
    GlobalData.optManager.ob = Utils1.DeepCopy(this);

    // Build an array with the current start and end, then add the new corner
    let cornerPoints: Point[] = [
      { x: this.StartPoint.x, y: this.StartPoint.y },
      { x: this.EndPoint.x, y: this.EndPoint.y }
    ];
    cornerPoints.push(new Point(newCornerPoint.x, newCornerPoint.y));

    // Calculate the angle and determine the rotation in radians
    let rawAngle = Utils1.CalcAngleFromPoints(cornerPoints[0], cornerPoints[1]);
    let adjustedAngle = 360 - rawAngle;
    if (adjustedAngle >= 360) {
      adjustedAngle -= 360;
    }
    const rotationRadians = 2 * Math.PI * (adjustedAngle / 360);

    // Rotate points about the frame center for adjustment
    Utils3.RotatePointsAboutCenter(this.Frame, -rotationRadians, cornerPoints);

    // Do not add a corner if the vertical difference is too small based on line thickness
    if (!(Math.abs(cornerPoints[1].y - cornerPoints[2].y) > this.StyleRecord.Line.Thickness)) {
      return;
    }

    // Begin secondary edit if collaboration messages are allowed
    let collabData: { BlockID?: number; point?: { x: number; y: number } } = {};
    if (Collab.AllowMessage()) {
      Collab.BeginSecondaryEdit();
      collabData.BlockID = this.BlockID;
      collabData.point = { x: newCornerPoint.x, y: newCornerPoint.y };
    }

    // Force the new corner point horizontally aligned with the starting point
    cornerPoints[2].y = cornerPoints[0].y;

    // Determine which end to adjust based on the horizontal distances
    let flipStart = false;
    if (Math.abs(cornerPoints[1].x - cornerPoints[2].x) > Math.abs(cornerPoints[0].x - cornerPoints[2].x)) {
      flipStart = true;
    }

    // Calculate an offset value based on the angle (switching between 50 and -50)
    const offsetY = (adjustedAngle >= 0 && adjustedAngle <= 180) ? 50 : -50;

    // Add an extra point shifted vertically by the offset for dimensioning
    cornerPoints.push(new Point(cornerPoints[2].x, cornerPoints[2].y + offsetY));

    // Rotate the points back to the original coordinate system
    Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, cornerPoints);

    // Extract the new dimension points from the rotated array
    const dimensionPoints: Point[] = [];
    dimensionPoints.push(new Point(cornerPoints[2].x, cornerPoints[2].y));
    dimensionPoints.push(new Point(cornerPoints[3].x, cornerPoints[3].y));

    // Update the corresponding endpoint based on the horizontal adjustment check
    if (flipStart) {
      this.StartPoint.x = dimensionPoints[0].x;
      this.StartPoint.y = dimensionPoints[0].y;
    } else {
      this.EndPoint.x = dimensionPoints[0].x;
      this.EndPoint.y = dimensionPoints[0].y;
    }

    // Recalculate the frame and update the links
    this.CalcFrame();
    GlobalData.optManager.MaintainLink(
      this.BlockID,
      this,
      GlobalData.optManager.ob,
      ConstantData.ActionTriggerType.MODIFYSHAPE
    );
    GlobalData.optManager.SetLinkFlag(
      this.BlockID,
      ConstantData.LinkFlags.SED_L_MOVE | ConstantData.LinkFlags.SED_L_CHANGE
    );
    GlobalData.optManager.UpdateLinks();

    // Prepare the options for the new line representing the added corner
    let newLineOptions = {
      StartPoint: { x: dimensionPoints[0].x, y: dimensionPoints[0].y },
      EndPoint: { x: dimensionPoints[1].x, y: dimensionPoints[1].y },
      Dimensions: this.Dimensions,
      TextFlags: this.TextFlags,
      objecttype: this.objecttype
    };
    newLineOptions.StyleRecord = Utils1.DeepCopy(this.StyleRecord);

    // Create the new line object
    const newLine = new ListManager.Line(newLineOptions);

    // Add new object and connect via join
    const newObjectId = GlobalData.optManager.AddNewObject(newLine, false, true);
    const joinResult = flipStart
      ? GlobalData.optManager.PolyLJoin(
          newObjectId,
          ConstantData.HookPts.SED_KTL,
          this.BlockID,
          ConstantData.HookPts.SED_KTL,
          false
        )
      : GlobalData.optManager.PolyLJoin(
          newObjectId,
          ConstantData.HookPts.SED_KTL,
          this.BlockID,
          ConstantData.HookPts.SED_KTR,
          false
        );

    const newObjectPtr = GlobalData.optManager.GetObjectPtr(joinResult, false);
    const newSVGElement = GlobalData.optManager.svgObjectLayer.GetElementByID(joinResult);

    // Determine the ruler text based on document settings
    let majorScaleString = Number(GPP.gDocumentHandler.rulerSettings.majorScale).toString();
    switch (GPP.gDocumentHandler.rulerSettings.units) {
      case ConstantData.RulerUnits.SED_Feet:
        if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_ShowFeetAsInches) {
          majorScaleString = Number(12 * GPP.gDocumentHandler.rulerSettings.majorScale).toString();
          majorScaleString += '"';
        } else {
          majorScaleString += '\'';
        }
        break;
      case ConstantData.RulerUnits.SED_Inches:
        majorScaleString += '"';
        break;
    }
    newObjectPtr.UpdateDimensionFromText(newSVGElement, majorScaleString, { segment: 2 });

    GlobalData.optManager.AddToDirtyList(this.BlockID);
    Collab.ClearCreateList();
    Collab.AddToCreateList(joinResult);
    if (Collab.AllowMessage()) {
      if (Collab.IsSecondary() && Collab.CreateList.length) {
        collabData.CreateList = [joinResult];
      }
      Collab.BuildMessage(ConstantData.CollabMessages.AddCorner, collabData, false);
    }
    GlobalData.optManager.CompleteOperation(null);
  }
}

export default Line
