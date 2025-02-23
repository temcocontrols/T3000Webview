

import BaseShape from './Shape.BaseShape'
import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import GlobalData from '../Data/GlobalData'
// import Collab from '../Data/Collab'
// import FileParser from '../Data/FileParser'
import DefaultEvt from "../Event/DefaultEvt";
// import Resources from '../Data/Resources'
// import ListManager from '../Data/ListManager';
import Point from '../Model/Point'
import Document from '../Basic/Basic.Document'
import Element from '../Basic/Basic.Element';
import BaseDrawingObject from './Shape.BaseDrawingObject'
import $ from 'jquery'
import ConstantData from '../Data/ConstantData'

class RRect extends BaseShape {

  constructor(inputParams: any) {
    console.log("= S.RRect: constructor input:", inputParams);
    const params = inputParams || {};
    params.ShapeType = ConstantData.ShapeType.RRECT;
    super(params);
    this.dataclass = ConstantData.SDRShapeTypes.SED_S_RRect;
    console.log("= S.RRect: constructor output:", this);
  }

  GetCornerSize(inputCornerSize?: number) {
    console.log("= S.RRect: GetCornerSize input:", inputCornerSize);

    const shapeWidth = this.Frame.width;
    const shapeHeight = this.Frame.height;
    let minDimension = shapeWidth;

    if (shapeHeight < minDimension) {
      minDimension = shapeHeight;
    }

    if (inputCornerSize) {
      minDimension = inputCornerSize;
    }

    if (this.moreflags & ConstantData.ObjMoreFlags.SED_MF_FixedRR) {
      let fixedDimension = ConstantData.Defines.RRectFixedDim * this.shapeparam;
      const maxAllowed = 0.4 * minDimension;
      if (fixedDimension > maxAllowed) {
        fixedDimension = maxAllowed;
      }
      console.log("= S.RRect: GetCornerSize output:", fixedDimension);
      return fixedDimension;
    }

    const resultDimension = minDimension * this.shapeparam;
    console.log("= S.RRect: GetCornerSize output:", resultDimension);
    return resultDimension;
  }

  CreateShape(svgDoc: any, addEventSlop: boolean) {
    console.log("= S.RRect: CreateShape input:", { svgDoc, addEventSlop });

    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) {
      console.log("= S.RRect: CreateShape output:", null);
      return null;
    }

    const shapeContainer = svgDoc.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER);
    const mainShape = svgDoc.CreateShape(ConstantData.CreateShapeType.RRECT);
    mainShape.SetID(ConstantData.SVGElementClass.SHAPE);

    const extendedFrame = $.extend(true, {}, this.Frame);
    let style = this.StyleRecord;
    if (style.Line.BThick) {
      Utils2.InflateRect(extendedFrame, style.Line.BThick, style.Line.BThick);
    }

    style = this.SVGTokenizerHook(style);
    const strokeColor = style.Line.Paint.Color;
    const strokeThickness = style.Line.Thickness;
    const strokePattern = style.Line.LinePattern;
    const width = extendedFrame.width;
    const height = extendedFrame.height;

    shapeContainer.SetSize(width, height);
    shapeContainer.SetPos(extendedFrame.x, extendedFrame.y);

    mainShape.SetSize(width, height);
    const cornerSize = this.GetCornerSize();
    mainShape.SetRRectSize(width, height, cornerSize, cornerSize);
    mainShape.SetStrokeColor(strokeColor);
    mainShape.SetStrokeWidth(strokeThickness);

    if (strokePattern !== 0) {
      mainShape.SetStrokePattern(strokePattern);
    }

    shapeContainer.AddElement(mainShape);
    this.ApplyStyles(mainShape, style);
    this.ApplyEffects(shapeContainer, false, false);

    const slopShape = svgDoc.CreateShape(ConstantData.CreateShapeType.RRECT);
    slopShape.SetStrokeColor('white');
    slopShape.SetFillColor('none');
    slopShape.SetOpacity(0);
    slopShape.SetStrokeWidth(strokeThickness + ConstantData.Defines.SED_Slop);
    if (addEventSlop) {
      slopShape.SetEventBehavior(Element.EventBehavior.HIDDEN_OUT);
    } else {
      slopShape.SetEventBehavior(Element.EventBehavior.NONE);
    }
    slopShape.SetID(ConstantData.SVGElementClass.SLOP);
    slopShape.ExcludeFromExport(true);
    slopShape.SetRRectSize(width, height, cornerSize, cornerSize);

    shapeContainer.AddElement(slopShape);

    const hatchType = style.Fill.Hatch;
    if (hatchType && hatchType !== 0) {
      const hatchShape = svgDoc.CreateShape(ConstantData.CreateShapeType.RRECT);
      hatchShape.SetID(ConstantData.SVGElementClass.HATCH);
      hatchShape.SetSize(width, height);
      hatchShape.SetRRectSize(width, height, cornerSize, cornerSize);
      hatchShape.SetStrokeWidth(0);
      this.SetFillHatch(hatchShape, hatchType);
      shapeContainer.AddElement(hatchShape);
    }

    shapeContainer.isShape = true;
    const tableData = this.GetTable(false);
    if (tableData) {
      GlobalData.optManager.LM_AddSVGTableObject(this, svgDoc, shapeContainer, tableData);
    }

    if (this.DataID >= 0) {
      this.LM_AddSVGTextObject(svgDoc, shapeContainer);
    }

    console.log("= S.RRect: CreateShape output:", shapeContainer);
    return shapeContainer;
  }

  Resize(
    svgElement: any,
    newDimensions: any,
    drawingContainer: any
  ) {
    console.log("= S.RRect: Resize input:", {
      svgElement,
      newDimensions,
      drawingContainer
    });

    drawingContainer.SetDimensionLinesVisibility(svgElement, false);

    const rotation = svgElement.GetRotation();
    const previousBBox = $.extend(true, {}, this.prevBBox);
    const dimensionClone = $.extend(true, {}, newDimensions);
    const inflatedDimensions = $.extend(true, {}, newDimensions);
    const offset = GlobalData.optManager.svgDoc.CalculateRotatedOffsetForResize(
      previousBBox,
      dimensionClone,
      rotation
    );

    if (this.StyleRecord.Line.BThick && this.polylist == null) {
      Utils2.InflateRect(
        inflatedDimensions,
        this.StyleRecord.Line.BThick,
        this.StyleRecord.Line.BThick
      );
    }

    svgElement.SetSize(inflatedDimensions.width, inflatedDimensions.height);
    svgElement.SetPos(
      inflatedDimensions.x + offset.x,
      inflatedDimensions.y + offset.y
    );

    const mainShape = svgElement.GetElementByID(ConstantData.SVGElementClass.SHAPE);
    mainShape.SetSize(inflatedDimensions.width, inflatedDimensions.height);

    const slopShape = svgElement.GetElementByID(ConstantData.SVGElementClass.SLOP);
    if (slopShape) {
      slopShape.SetSize(inflatedDimensions.width, inflatedDimensions.height);
    }

    const hatchShape = svgElement.GetElementByID(ConstantData.SVGElementClass.HATCH);
    if (hatchShape) {
      hatchShape.SetSize(newDimensions.width, newDimensions.height);
    }

    const cornerSize = this.GetCornerSize();
    mainShape.SetRRectSize(
      inflatedDimensions.width,
      inflatedDimensions.height,
      cornerSize,
      cornerSize
    );

    if (hatchShape) {
      hatchShape.SetRRectSize(
        inflatedDimensions.width,
        inflatedDimensions.height,
        cornerSize,
        cornerSize
      );
    }

    if (slopShape) {
      slopShape.SetRRectSize(
        inflatedDimensions.width,
        inflatedDimensions.height,
        cornerSize,
        cornerSize
      );
    }

    if (this.GetTable(false)) {
      GlobalData.optManager.Table_ResizeSVGTableObject(
        svgElement,
        drawingContainer,
        newDimensions
      );
    } else {
      this.LM_ResizeSVGTextObject(
        svgElement,
        drawingContainer,
        newDimensions
      );
    }

    svgElement.SetRotation(rotation);
    this.UpdateDimensionLines(svgElement);
    GlobalData.optManager.UpdateDisplayCoordinates(
      newDimensions,
      null,
      null,
      this
    );

    console.log("= S.RRect: Resize output:", offset);
    return offset;
  }

  ResizeInTextEdit(svgElement: any, newDimensions: any) {
    console.log("= S.RRect: ResizeInTextEdit input:", { svgElement, newDimensions });

    const rotation = svgElement.GetRotation();
    this.SetDimensionLinesVisibility(svgElement, false);

    const oldFrame = $.extend(true, {}, this.Frame);
    const dimensionClone = $.extend(true, {}, newDimensions);
    const inflatedDimensions = $.extend(true, {}, newDimensions);

    const offset = GlobalData.optManager.svgDoc.CalculateRotatedOffsetForResize(
      oldFrame,
      dimensionClone,
      rotation
    );

    if (this.StyleRecord.Line.BThick && this.polylist == null) {
      Utils2.InflateRect(
        inflatedDimensions,
        this.StyleRecord.Line.BThick,
        this.StyleRecord.Line.BThick
      );
    }

    svgElement.SetSize(inflatedDimensions.width, inflatedDimensions.height);
    svgElement.SetPos(
      inflatedDimensions.x + offset.x,
      inflatedDimensions.y + offset.y
    );

    const shapeEl = svgElement.GetElementByID(ConstantData.SVGElementClass.SHAPE);
    if (shapeEl) {
      shapeEl.SetSize(inflatedDimensions.width, inflatedDimensions.height);
    }

    const slopEl = svgElement.GetElementByID(ConstantData.SVGElementClass.SLOP);
    if (slopEl) {
      slopEl.SetSize(inflatedDimensions.width, inflatedDimensions.height);
    }

    if (this.GetTable(false)) {
      GlobalData.optManager.Table_ResizeSVGTableObject(
        svgElement,
        this,
        newDimensions,
        true
      );
    }

    const hatchEl = svgElement.GetElementByID(ConstantData.SVGElementClass.HATCH);
    if (hatchEl) {
      hatchEl.SetSize(inflatedDimensions.width, inflatedDimensions.height);
    }

    // Preserve parameter reference
    this.shapeparam;

    let minDimension = inflatedDimensions.width;
    if (inflatedDimensions.height < minDimension) {
      minDimension = inflatedDimensions.height;
    }

    const cornerSize = this.GetCornerSize();

    if (shapeEl) {
      shapeEl.SetRRectSize(
        inflatedDimensions.width,
        inflatedDimensions.height,
        cornerSize,
        cornerSize
      );
    }

    if (hatchEl) {
      hatchEl.SetRRectSize(
        inflatedDimensions.width,
        inflatedDimensions.height,
        cornerSize,
        cornerSize
      );
    }

    if (slopEl) {
      slopEl.SetRRectSize(
        inflatedDimensions.width,
        inflatedDimensions.height,
        cornerSize,
        cornerSize
      );
    }

    svgElement.SetRotation(rotation);
    this.UpdateDimensionLines(svgElement);
    GlobalData.optManager.UpdateDisplayCoordinates(newDimensions, null, null, this);

    console.log("= S.RRect: ResizeInTextEdit output:", offset);
    return offset;
  }

  GetPolyPoints(
    divisionCount: number,
    applyPositionOffset: boolean,
    unusedParamA: any,
    shouldInflateFrame: boolean,
    unusedParamI: any
  ) {
    console.log("= S.RRect: GetPolyPoints input:", {
      divisionCount,
      applyPositionOffset,
      unusedParamA,
      shouldInflateFrame,
      unusedParamI
    });

    const pointsArray: Point[] = [];
    const rectCopy: any = {};
    const tempRect: any = {};

    // Copy current frame
    Utils2.CopyRect(rectCopy, this.Frame);

    // Possibly inflate rect if needed
    const halfThickness = this.StyleRecord.Line.Thickness / 2;
    if (shouldInflateFrame) {
      Utils2.InflateRect(rectCopy, halfThickness, halfThickness);
    }

    // Corner size
    const cornerSize = this.GetCornerSize();

    // TempRect initialization
    tempRect.x = 0;
    tempRect.y = 0;
    tempRect.width = cornerSize;
    tempRect.height = 2 * cornerSize;

    // Top-left corner
    GlobalData.optManager.PolyYCurve(
      pointsArray,
      tempRect,
      divisionCount / 2,
      0,
      0,
      0,
      cornerSize,
      true
    );

    // Bottom-left corner
    tempRect.x = 0;
    tempRect.y = rectCopy.height - 2 * cornerSize;
    tempRect.width = cornerSize;
    tempRect.height = 2 * cornerSize;
    GlobalData.optManager.PolyYCurve(
      pointsArray,
      tempRect,
      divisionCount / 2,
      0,
      0,
      cornerSize,
      0,
      true
    );

    // Bottom-right corner
    tempRect.x = rectCopy.width - cornerSize;
    tempRect.y = rectCopy.height;
    tempRect.width = cornerSize;
    tempRect.height = -2 * cornerSize;
    GlobalData.optManager.PolyYCurve(
      pointsArray,
      tempRect,
      divisionCount / 2,
      0,
      0,
      0,
      -cornerSize,
      false
    );

    // Top-right corner
    tempRect.x = rectCopy.width - cornerSize;
    tempRect.y = 2 * cornerSize;
    tempRect.width = cornerSize;
    tempRect.height = -2 * cornerSize;
    GlobalData.optManager.PolyYCurve(
      pointsArray,
      tempRect,
      divisionCount / 2,
      0,
      0,
      -cornerSize,
      0,
      false
    );

    // Close shape
    pointsArray.push(new Point(pointsArray[0].x, pointsArray[0].y));

    // Add position offset if needed
    if (!applyPositionOffset) {
      for (let i = 0; i < pointsArray.length; i++) {
        pointsArray[i].x += rectCopy.x;
        pointsArray[i].y += rectCopy.y;
      }
    }

    console.log("= S.RRect: GetPolyPoints output:", pointsArray);
    return pointsArray;
  }

  ExtendLines() {
    console.log("= S.RRect: ExtendLines input:", {});

    const tableData = this.GetTable(false);
    if (tableData) {
      GlobalData.optManager.Table_ExtendLines(this, tableData);
    }

    console.log("= S.RRect: ExtendLines output:", { tableDataFound: !!tableData });
  }

  ExtendCell(cellIndex: number, extensionData: any, additionalOptions: any) {
    console.log("= S.RRect: ExtendCell input:", { cellIndex, extensionData, additionalOptions });

    const table = this.GetTable(false);
    if (!table) {
      console.log("= S.RRect: ExtendCell output:", null);
      return null;
    }

    const extendedCells = GlobalData.optManager.Table_ExtendCell(
      this,
      table,
      cellIndex,
      extensionData,
      additionalOptions
    );

    if (extendedCells) {
      const svgFrame = this.GetSVGFrame(this.Frame);
      const offsetX = this.inside.x - svgFrame.x;
      const offsetY = this.inside.y - svgFrame.y;

      if (offsetX || offsetY) {
        for (let i = 0, len = extendedCells.length; i < len; i++) {
          extendedCells[i].x += offsetX;
          extendedCells[i].y += offsetY;
        }
      }

      console.log("= S.RRect: ExtendCell output:", extendedCells);
      return extendedCells;
    }

    console.log("= S.RRect: ExtendCell output:", null);
    return null;
  }

  GetPerimPts(
    eventObj: any,
    hookPoints: any[],
    anchorType: number,
    keepRotation: boolean,
    optionalParam: any,
    eventData: any
  ) {
    console.log("= S.RRect: GetPerimPts input:", {
      eventObj,
      hookPoints,
      anchorType,
      keepRotation,
      optionalParam,
      eventData
    });

    let outputPoints: Point[] = [];
    const localPoints: any[] = [];
    const interSectionData: any = {};
    const tmpIntersect: number[] = [0, 0];
    const baseDim = ConstantData.Defines.SED_CDim;
    const totalHooks = hookPoints.length;

    // Special check
    if (
      totalHooks === 1 &&
      hookPoints[0].y === -ConstantData.SEDA_Styles.SEDA_CoManager &&
      this.IsCoManager(interSectionData)
    ) {
      outputPoints.push(new Point(interSectionData.x, interSectionData.y));
      if (hookPoints[0].id != null) {
        outputPoints[0].id = hookPoints[0].id;
      }
      console.log("= S.RRect: GetPerimPts output:", outputPoints);
      return outputPoints;
    }

    // If anchorType is KAT and optionalParam is null
    if (anchorType === ConstantData.HookPts.SED_KAT && optionalParam == null) {
      // Double === todo
      console.log("= S.RRect: GetPerimPts output:", outputPoints);
      // Return from base
      return new BaseDrawingObject(this).GetPerimPts(
        eventObj,
        hookPoints,
        anchorType,
        false,
        optionalParam,
        eventData
      );
    }

    const tableData = this.GetTable(false);
    if (optionalParam != null && tableData) {
      const tablePoints = GlobalData.optManager.Table_GetPerimPts(
        this,
        tableData,
        optionalParam,
        hookPoints
      );
      if (tablePoints) {
        outputPoints = tablePoints;
        if (!keepRotation) {
          const rotationAngle = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
          Utils3.RotatePointsAboutCenter(this.Frame, rotationAngle, outputPoints);
        }
        console.log("= S.RRect: GetPerimPts output:", outputPoints);
        return outputPoints;
      }
    }

    const useConnect = !!(this.flags & ConstantData.ObjFlags.SEDO_UseConnect);
    const useTableRows = !!(this.hookflags & ConstantData.HookFlags.SED_LC_TableRows && tableData);

    if (useConnect || useTableRows) {
      for (let i = 0; i < totalHooks; i++) {
        outputPoints[i] = { x: 0, y: 0, id: 0 };
        outputPoints[i].x =
          (hookPoints[i].x / ConstantData.Defines.SED_CDim) * this.Frame.width +
          this.Frame.x;
        outputPoints[i].y =
          (hookPoints[i].y / ConstantData.Defines.SED_CDim) * this.Frame.height +
          this.Frame.y;
        if (hookPoints[i].id != null) {
          outputPoints[i].id = hookPoints[i].id;
        }
      }
    } else {
      // Double === todo
      outputPoints = new BaseDrawingObject(this).GetPerimPts(
        eventObj,
        hookPoints,
        anchorType,
        true,
        optionalParam,
        eventData
      );

      let minSize = this.Frame.width;
      if (this.Frame.height < minSize) {
        minSize = this.Frame.height;
      }
      const cornerFactor = this.GetCornerSize() * ConstantData.Defines.SED_RoundFactor;
      const polyPoints = this.GetPolyPoints(
        ConstantData.Defines.NPOLYPTS,
        false,
        false,
        false,
        null
      );

      for (let idx = 0; idx < outputPoints.length; idx++) {
        if (hookPoints[idx].x === 0 && hookPoints[idx].y === 0) {
          outputPoints[idx].x += cornerFactor;
          outputPoints[idx].y += cornerFactor;
        } else if (hookPoints[idx].x === 0 && hookPoints[idx].y === baseDim) {
          outputPoints[idx].x += cornerFactor;
          outputPoints[idx].y -= cornerFactor;
        } else if (hookPoints[idx].x === baseDim && hookPoints[idx].y === 0) {
          outputPoints[idx].x -= cornerFactor;
          outputPoints[idx].y += cornerFactor;
        } else if (hookPoints[idx].x === baseDim && hookPoints[idx].y === baseDim) {
          outputPoints[idx].x -= cornerFactor;
          outputPoints[idx].y -= cornerFactor;
        } else if (hookPoints[idx].x < baseDim / 4) {
          const count = GlobalData.optManager.PolyGetIntersect(
            polyPoints,
            outputPoints[idx].y,
            tmpIntersect,
            null,
            false
          );
          if (count) {
            outputPoints[idx].x = tmpIntersect[0];
            if (count > 1 && tmpIntersect[1] < outputPoints[idx].x) {
              outputPoints[idx].x = tmpIntersect[1];
            }
          }
        } else if (hookPoints[idx].x > (3 * baseDim) / 4) {
          const count = GlobalData.optManager.PolyGetIntersect(
            polyPoints,
            outputPoints[idx].y,
            tmpIntersect,
            null,
            false
          );
          if (count) {
            outputPoints[idx].x = tmpIntersect[0];
            if (count > 1 && tmpIntersect[1] > outputPoints[idx].x) {
              outputPoints[idx].x = tmpIntersect[1];
            }
          }
        } else if (hookPoints[idx].y < baseDim / 4) {
          const count = GlobalData.optManager.PolyGetIntersect(
            polyPoints,
            outputPoints[idx].x,
            tmpIntersect,
            null,
            true
          );
          if (count) {
            outputPoints[idx].y = tmpIntersect[0];
            if (count > 1 && tmpIntersect[1] < outputPoints[idx].y) {
              outputPoints[idx].y = tmpIntersect[1];
            }
          }
        } else if (hookPoints[idx].y > (3 * baseDim) / 4) {
          const count = GlobalData.optManager.PolyGetIntersect(
            polyPoints,
            outputPoints[idx].x,
            tmpIntersect,
            null,
            true
          );
          if (count) {
            outputPoints[idx].y = tmpIntersect[0];
            if (count > 1 && tmpIntersect[1] > outputPoints[idx].y) {
              outputPoints[idx].y = tmpIntersect[1];
            }
          }
        }
        if (hookPoints[idx].id != null) {
          outputPoints[idx].id = hookPoints[idx].id;
        }
      }
    }

    if (!keepRotation) {
      const rotationAngle = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationAngle, outputPoints);
    }

    console.log("= S.RRect: GetPerimPts output:", outputPoints);
    return outputPoints;
  }

  SetShapeIndent(applyAdjustment: boolean) {
    console.log("= S.RRect: SetShapeIndent input:", applyAdjustment);

    // Read the inside dimensions
    const insideWidth = this.inside.width;
    const insideHeight = this.inside.height;
    // Choose the minimum dimension
    const minDimension = insideHeight > insideWidth ? insideWidth : insideHeight;
    // Default shape parameter
    let shapeParam = this.shapeparam;
    const roundFactor = ConstantData.Defines.SED_RoundFactor;
    let rectDimension: number = minDimension;

    // When fixed rounded rectangle flag is set, adjust the shape parameter
    if (this.moreflags & ConstantData.ObjMoreFlags.SED_MF_FixedRR) {
      rectDimension = minDimension;
      if (applyAdjustment) {
        // Increase rectDimension by twice the corner size adjusted by roundFactor
        rectDimension = minDimension + 2 * this.GetCornerSize() * roundFactor;
        rectDimension = minDimension + 2 * this.GetCornerSize(rectDimension) * roundFactor;
      }
      shapeParam = this.GetCornerSize(rectDimension) / rectDimension;
    }

    // Calculate the uniform indent based on the shape parameter and round factor
    const singleIndent = shapeParam * roundFactor;
    this.left_sindent = singleIndent;
    this.top_sindent = singleIndent;
    this.right_sindent = singleIndent;
    this.bottom_sindent = singleIndent;

    // Prepare denominators for tint calculations; default is 1 if no adjustment is applied.
    let divisorWidth = 1;
    let divisorHeight = 1;

    if (applyAdjustment) {
      divisorWidth = 1 - 2 * this.left_sindent;
      divisorHeight = divisorWidth;
    }

    // Calculate the table indent values for each side
    this.tindent.left = this.left_sindent * insideWidth / divisorWidth;
    this.tindent.top = this.top_sindent * insideHeight / divisorHeight;
    this.tindent.right = this.right_sindent * insideWidth / divisorWidth;
    this.tindent.bottom = this.bottom_sindent * insideHeight / divisorHeight;

    console.log("= S.RRect: SetShapeIndent output:", {
      left_sindent: this.left_sindent,
      top_sindent: this.top_sindent,
      right_sindent: this.right_sindent,
      bottom_sindent: this.bottom_sindent,
      tint: this.tindent
    });
  }

  SetShapeProperties(properties: any): boolean {
    console.log("= S.RRect: SetShapeProperties input:", properties);
    let updated = false;
    const fixedRFlag = ConstantData.ObjMoreFlags.SED_MF_FixedRR;

    if (properties.hasrrectselected) {
      if (((this.moreflags & fixedRFlag) > 0) === properties.rrectfixed && properties.rrectparam === this.shapeparam) {
        // No update needed if the fixed flag and parameter already match.
      } else {
        this.moreflags = Utils2.SetFlag(this.moreflags, fixedRFlag, properties.rrectfixed);
        this.shapeparam = properties.rrectparam;
        this.SetSize(
          this.Frame.width,
          0,
          ConstantData.ActionTriggerType.LINELENGTH
        );
        updated = true;
      }
    }

    // Call the base implementation and update the flag if needed.
    if (super.SetShapeProperties(properties)) {
      updated = true;
    }

    console.log("= S.RRect: SetShapeProperties output:", updated);
    return updated;
  }

}

export default RRect
