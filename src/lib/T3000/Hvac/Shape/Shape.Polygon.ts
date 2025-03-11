
import BaseShape from './Shape.BaseShape'
import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import GlobalData from '../Data/T3Gv'
import DefaultEvt from "../Event/EvtUtil";
import Document from '../Basic/B.Document'
import Element from '../Basic/B.Element';
import $ from 'jquery'
import ConstantData from '../Data/ConstantData'
import PolySeg from '../Model/PolySeg'
import Instance from '../Data/Instance/Instance';

class Polygon extends BaseShape {

  public VertexArray: any;
  public FixedPoint: any;
  public LineOrientation: any;
  public hoplist: any;
  public ArrowheadData: any;

  constructor(options) {
    console.log('S.Polygon: Constructor input:', options);

    options = options || {};
    options.ShapeType = ConstantData.ShapeType.POLYGON;

    super(options);

    this.VertexArray = options.VertexArray || [];
    this.FixedPoint = options.FixedPoint || [0, 0];
    this.LineOrientation = options.LineOrientation || ConstantData.LineOrientation.NONE;
    this.hoplist = options.hoplist || { nhops: 0, hops: [] };
    this.ArrowheadData = options.ArrowheadData || [];

    this.dataclass = ConstantData.SDRShapeTypes.SED_S_Poly;

    console.log('S.Polygon: Constructor output:', this);
  }

  ScaleGeometries(svgDoc, points, width, height) {
    console.log('S.Polygon: scaleGeometries input:', { svgDoc, points, width, height });

    let currentShapeId = null;
    let pathCreator = null;
    let shapeElement = null;
    let subPathCreator = null;
    let subShapeElement = null;
    let subShapeIdCounter = 0;

    const geometriesCount = this.Geometries.length;

    for (let i = 0; i < geometriesCount; i++) {
      const geometry = this.Geometries[i];

      if (currentShapeId !== geometry.shapeid) {
        if (pathCreator) {
          pathCreator.Apply();
        }

        shapeElement = svgDoc.GetElementByID(ConstantData.SVGElementClass.SHAPE, geometry.shapeid);
        currentShapeId = geometry.shapeid;

        if (shapeElement) {
          shapeElement.SetSize(width, height);
          pathCreator = shapeElement.PathCreator();
          pathCreator.BeginPath();
        }
      }

      if (!geometry.NoFill || geometry.MoveTo.length === 0) {
        let point = points[geometry.Offset];
        pathCreator.MoveTo(point.x, point.y);

        for (let j = 1; j < geometry.NPoints; j++) {
          point = points[geometry.Offset + j];
          pathCreator.LineTo(point.x, point.y);
        }
      }

      if (geometry.Closed) {
        pathCreator.ClosePath();
      }

      if (geometry.MoveTo.length > 0) {
        const subShapeId = `${currentShapeId}.${subShapeIdCounter}`;
        subShapeIdCounter++;

        subShapeElement = svgDoc.GetElementByID(ConstantData.SVGElementClass.SHAPE, subShapeId);

        if (!subShapeElement) {
          continue;
        }

        subShapeElement.SetSize(width, height);
        subPathCreator = subShapeElement.PathCreator();
        subPathCreator.BeginPath();

        let moveToIndex = 0;
        let moveToPointIndex = 1;
        let point = points[geometry.Offset];

        while (moveToIndex <= geometry.MoveTo.length) {
          subPathCreator.MoveTo(point.x, point.y);

          const nextMoveToIndex = moveToIndex < geometry.MoveTo.length ? geometry.MoveTo[moveToIndex] : geometry.NPoints;

          for (let j = moveToPointIndex; j < nextMoveToIndex; j++) {
            point = points[geometry.Offset + j];
            subPathCreator.LineTo(point.x, point.y);
          }

          moveToIndex++;
          if (moveToIndex < geometry.MoveTo.length) {
            point = points[geometry.MoveTo[moveToIndex - 1] + geometry.Offset];
            moveToPointIndex = moveToIndex < geometry.MoveTo.length ? geometry.MoveTo[moveToIndex] : geometry.NPoints;
          }
        }

        subPathCreator.Apply();
      }
    }

    if (pathCreator) {
      pathCreator.Apply();
    }

    console.log('S.Polygon: scaleGeometries output:', { svgDoc, points, width, height });
  }

  CreateShape(svgDoc, isInteractive) {
    console.log("S.Polygon: CreateShape input:", { svgDoc, isInteractive });

    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) {
      console.log("S.Polygon: CreateShape output: null (not visible)");
      return null;
    }

    // Create the container shape and initial polygon shape.
    const containerShape = svgDoc.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER);
    let polygonShape = svgDoc.CreateShape(ConstantData.CreateShapeType.POLYGON);
    polygonShape.SetID(ConstantData.SVGElementClass.SHAPE);

    // Clone frame for modification.
    const frameRect = $.extend(true, {}, this.Frame);
    let styleRecord = this.StyleRecord;
    if (styleRecord.Line.BThick && this.polylist == null) {
      Utils2.InflateRect(frameRect, styleRecord.Line.BThick, styleRecord.Line.BThick);
    }
    // Tokenize style record.
    styleRecord = this.SVGTokenizerHook(styleRecord);
    const lineColor = styleRecord.Line.Paint.Color;
    const lineOpacity = styleRecord.Line.Paint.Opacity;
    const lineThickness = styleRecord.Line.Thickness;
    const linePattern = styleRecord.Line.LinePattern;

    this.GetFieldDataStyleOverride();
    const width = frameRect.width;
    const height = frameRect.height;
    containerShape.SetSize(width, height);
    containerShape.SetPos(frameRect.x, frameRect.y);
    polygonShape.SetSize(width, height);

    // Transform vertex array into point coordinates.
    const vertexArray = this.VertexArray;
    const numVertices = vertexArray.length;
    const points: { x: number, y: number }[] = [];
    for (let i = 0; i < numVertices; ++i) {
      const vertex = vertexArray[i];
      points.push({
        x: vertex.x * width,
        y: vertex.y * height
      });
    }

    // If geometries are defined then create paths accordingly.
    if (this.Geometries && this.Geometries.length) {
      let shapeCounter = 1;
      let secondaryCounter = 0;
      const geometriesCount = this.Geometries.length;
      let currentPathShape = svgDoc.CreateShape(ConstantData.CreateShapeType.PATH);
      currentPathShape.SetID(ConstantData.SVGElementClass.SHAPE);
      currentPathShape.SetUserData(shapeCounter);
      currentPathShape.SetSize(width, height);
      let pathCreator = currentPathShape.PathCreator();
      pathCreator.BeginPath();

      let defaultNoFill = this.Geometries[0].NoFill;
      let defaultNoLine = (this.Geometries[0].NoLine || this.Geometries[0].MoveTo.length > 0);

      for (let i = 0; i < geometriesCount; i++) {
        const geometry = this.Geometries[i];
        // Check if the current geometry belongs to the same group.
        if (geometry.NoFill === defaultNoFill && (geometry.NoLine || geometry.MoveTo.length > 0) === defaultNoLine) {
          // Continue drawing in current path.
        } else {
          if (pathCreator && pathCreator.pathSegs.length === 1 && pathCreator.pathSegs[0] === "z") {
            pathCreator = null;
          } else if (pathCreator) {
            pathCreator.Apply();
          }
          // Set stroke properties before starting a new path.
          if (defaultNoLine) {
            currentPathShape.SetStrokeWidth(0);
          } else {
            currentPathShape.SetStrokeColor(lineColor);
            currentPathShape.SetStrokeWidth(lineThickness);
            if (linePattern !== 0) {
              currentPathShape.SetStrokePattern(linePattern);
            }
          }
          containerShape.AddElement(currentPathShape);

          // Create a new path shape.
          currentPathShape = svgDoc.CreateShape(ConstantData.CreateShapeType.PATH);
          currentPathShape.SetID(ConstantData.SVGElementClass.SHAPE);
          shapeCounter++;
          currentPathShape.SetUserData(shapeCounter);
          currentPathShape.SetSize(width, height);
          pathCreator = currentPathShape.PathCreator();
          pathCreator.BeginPath();

          defaultNoFill = geometry.NoFill;
          defaultNoLine = (geometry.NoLine || geometry.MoveTo.length > 0);
        }

        // Draw the main polyline for current geometry.
        if (!defaultNoFill || geometry.MoveTo.length === 0) {
          const startPoint = points[geometry.Offset];
          pathCreator.MoveTo(startPoint.x, startPoint.y);
          for (let d = 1; d < geometry.NPoints; d++) {
            const pt = points[geometry.Offset + d];
            pathCreator.LineTo(pt.x, pt.y);
          }
        }
        if (geometry.Closed) {
          pathCreator.ClosePath();
        }

        // Process secondary path if MoveTo points exist.
        if (geometry.MoveTo.length > 0) {
          const secondaryShape = svgDoc.CreateShape(ConstantData.CreateShapeType.PATH);
          secondaryShape.SetID(ConstantData.SVGElementClass.SHAPE);
          const secondaryUserData = shapeCounter + '.' + secondaryCounter;
          secondaryCounter++;
          secondaryShape.SetUserData(secondaryUserData);
          secondaryShape.SetSize(width, height);
          const secondaryPathCreator = secondaryShape.PathCreator();
          secondaryPathCreator.BeginPath();

          let moveIndex = 0;
          let movePointIndex = 1;
          let currentPt = points[geometry.Offset];
          while (moveIndex <= geometry.MoveTo.length) {
            secondaryPathCreator.MoveTo(currentPt.x, currentPt.y);
            const nextMoveToIndex = (moveIndex < geometry.MoveTo.length) ? geometry.MoveTo[moveIndex] : geometry.NPoints;
            for (let d = movePointIndex; d < nextMoveToIndex; d++) {
              currentPt = points[geometry.Offset + d];
              secondaryPathCreator.LineTo(currentPt.x, currentPt.y);
            }
            moveIndex++;
            if (moveIndex < geometry.MoveTo.length) {
              currentPt = points[geometry.MoveTo[moveIndex - 1] + geometry.Offset];
              movePointIndex = (moveIndex < geometry.MoveTo.length) ? geometry.MoveTo[moveIndex] : geometry.NPoints;
            }
          }
          secondaryPathCreator.Apply();
          containerShape.AddElement(secondaryShape);
        }
      }
      if (pathCreator) {
        pathCreator.Apply();
      }
      // Finalize the current path shape.
      if (defaultNoLine) {
        currentPathShape.SetStrokeWidth(0);
      } else {
        currentPathShape.SetStrokeColor(lineColor);
        currentPathShape.SetStrokeWidth(lineThickness);
        if (linePattern !== 0) {
          currentPathShape.SetStrokePattern(linePattern);
        }
      }
      containerShape.AddElement(currentPathShape);
      if (defaultNoFill) {
        currentPathShape.SetFillColor("none");
      } else {
        this.ApplyStyles(currentPathShape, styleRecord);
      }
    } else {
      // No geometries: use the polygon shape.
      polygonShape.SetPoints(points);
      polygonShape.SetStrokeColor(lineColor);
      polygonShape.SetStrokeWidth(lineThickness);
      if (linePattern !== 0) {
        polygonShape.SetStrokePattern(linePattern);
      }
      containerShape.AddElement(polygonShape);
      this.ApplyStyles(polygonShape, styleRecord);
    }

    // Apply visual effects.
    this.ApplyEffects(containerShape, false, false);

    // Create an invisible polygon for events/slop.
    const invisiblePolygon = svgDoc.CreateShape(ConstantData.CreateShapeType.POLYGON);
    invisiblePolygon.SetPoints(points);
    invisiblePolygon.SetStrokeColor("white");
    invisiblePolygon.SetFillColor("none");
    invisiblePolygon.SetOpacity(0);
    invisiblePolygon.SetStrokeWidth(lineThickness + ConstantData.Defines.SED_Slop);
    if (isInteractive) {
      invisiblePolygon.SetEventBehavior(Element.EventBehavior.HIDDEN_OUT);
    } else {
      invisiblePolygon.SetEventBehavior(Element.EventBehavior.NONE);
    }
    invisiblePolygon.SetID(ConstantData.SVGElementClass.SLOP);
    invisiblePolygon.ExcludeFromExport(true);
    invisiblePolygon.SetSize(width, height);
    containerShape.AddElement(invisiblePolygon);

    // Add hatch fill if defined.
    const hatch = styleRecord.Fill.Hatch;
    if (hatch && hatch !== 0) {
      const hatchShape = svgDoc.CreateShape(ConstantData.CreateShapeType.POLYGON);
      hatchShape.SetPoints(points);
      hatchShape.SetID(ConstantData.SVGElementClass.HATCH);
      hatchShape.SetSize(width, height);
      hatchShape.SetStrokeWidth(0);
      this.SetFillHatch(hatchShape, hatch);
      containerShape.AddElement(hatchShape);
    }

    containerShape.isShape = true;
    const tableData = this.GetTable(false);
    if (tableData) {
      GlobalData.optManager.LM_AddSVGTableObject(this, svgDoc, containerShape, tableData);
    }
    if (this.DataID >= 0) {
      this.LM_AddSVGTextObject(svgDoc, containerShape);
    }

    console.log("S.Polygon: CreateShape output:", containerShape);
    return containerShape;
  }

  Resize(svgDoc, newSize, actionTriggerType, prevBBox) {
    console.log('S.Polygon: Resize input:', { svgDoc, newSize, actionTriggerType, prevBBox });

    if (svgDoc != null) {
      const rotation = svgDoc.GetRotation();
      const previousBoundingBox = $.extend(true, {}, this.prevBBox);
      const newBoundingBox = $.extend(true, {}, newSize);
      const adjustedBoundingBox = $.extend(true, {}, newSize);
      const offset = GlobalData.optManager.svgDoc.CalculateRotatedOffsetForResize(previousBoundingBox, newBoundingBox, rotation);

      if (this.StyleRecord.Line.BThick && this.polylist == null) {
        Utils2.InflateRect(adjustedBoundingBox, this.StyleRecord.Line.BThick, this.StyleRecord.Line.BThick);
      }

      if (actionTriggerType !== ConstantData.ActionTriggerType.MOVEPOLYSEG) {
        svgDoc.SetSize(adjustedBoundingBox.width, adjustedBoundingBox.height);
        svgDoc.SetPos(adjustedBoundingBox.x + offset.x, adjustedBoundingBox.y + offset.y);

        const shapeElement = svgDoc.GetElementByID(ConstantData.SVGElementClass.SHAPE);
        const regeneratedVectors = this.RegenerateVectors(adjustedBoundingBox.width, adjustedBoundingBox.height);
        if (regeneratedVectors) {
          this.VertexArray = regeneratedVectors;
        }

        const vertexArray = this.VertexArray;
        const points = vertexArray.map(vertex => ({
          x: vertex.x * adjustedBoundingBox.width,
          y: vertex.y * adjustedBoundingBox.height
        }));

        if (this.Geometries && this.Geometries.length) {
          this.ScaleGeometries(svgDoc, points, adjustedBoundingBox.width, adjustedBoundingBox.height);
        } else {
          shapeElement.SetPoints(points);
          shapeElement.SetSize(adjustedBoundingBox.width, adjustedBoundingBox.height);
        }

        const slopElement = svgDoc.GetElementByID(ConstantData.SVGElementClass.SLOP);
        if (slopElement) {
          slopElement.SetPoints(points);
          slopElement.SetSize(adjustedBoundingBox.width, adjustedBoundingBox.height);
        }

        const hatchElement = svgDoc.GetElementByID(ConstantData.SVGElementClass.HATCH);
        if (hatchElement) {
          hatchElement.SetPoints(points);
          hatchElement.SetSize(newSize.width, newSize.height);
        }
      }

      if (this.GetTable(false)) {
        GlobalData.optManager.Table_ResizeSVGTableObject(svgDoc, actionTriggerType, newSize);
      } else {
        this.LM_ResizeSVGTextObject(svgDoc, actionTriggerType, newSize);
      }

      svgDoc.SetRotation(rotation);
      this.UpdateDimensionLines(svgDoc);
      GlobalData.optManager.UpdateDisplayCoordinates(newSize, null, null, this);

      console.log('S.Polygon: Resize output:', offset);
      return offset;
    }
  }

  ResizeInTextEdit(svgDoc, newSize) {
    console.log('S.Polygon: ResizeInTextEdit input:', { svgDoc, newSize });

    const rotation = svgDoc.GetRotation();
    this.SetDimensionLinesVisibility(svgDoc, false);

    const previousFrame = $.extend(true, {}, this.Frame);
    const newFrame = $.extend(true, {}, newSize);
    const adjustedFrame = $.extend(true, {}, newSize);
    const offset = GlobalData.optManager.svgDoc.CalculateRotatedOffsetForResize(previousFrame, newFrame, rotation);

    if (this.StyleRecord.Line.BThick && this.polylist == null) {
      Utils2.InflateRect(adjustedFrame, this.StyleRecord.Line.BThick, this.StyleRecord.Line.BThick);
    }

    svgDoc.SetSize(adjustedFrame.width, adjustedFrame.height);
    svgDoc.SetPos(adjustedFrame.x + offset.x, adjustedFrame.y + offset.y);

    const shapeElement = svgDoc.GetElementByID(ConstantData.SVGElementClass.SHAPE);
    const regeneratedVectors = this.RegenerateVectors(adjustedFrame.width, adjustedFrame.height);
    if (regeneratedVectors) {
      this.VertexArray = regeneratedVectors;
    }

    if (this.polylist) {
      this.ScaleObject(0, 0, 0, 0, 0, 0);
    }

    const vertexArray = this.VertexArray;
    const points = vertexArray.map(vertex => ({
      x: vertex.x * adjustedFrame.width,
      y: vertex.y * adjustedFrame.height
    }));

    if (shapeElement) {
      if (this.Geometries && this.Geometries.length) {
        this.ScaleGeometries(svgDoc, points, adjustedFrame.width, adjustedFrame.height);
      } else {
        shapeElement.SetPoints(points);
      }
      shapeElement.SetSize(adjustedFrame.width, adjustedFrame.height);
    }

    const slopElement = svgDoc.GetElementByID(ConstantData.SVGElementClass.SLOP);
    if (slopElement) {
      slopElement.SetPoints(points);
      slopElement.SetSize(adjustedFrame.width, adjustedFrame.height);
    }

    if (this.GetTable(false)) {
      GlobalData.optManager.Table_ResizeSVGTableObject(svgDoc, this, newSize, true);
    }

    const hatchElement = svgDoc.GetElementByID(ConstantData.SVGElementClass.HATCH);
    if (hatchElement) {
      hatchElement.SetPoints(points);
      hatchElement.SetSize(newSize.width, newSize.height);
    }

    svgDoc.SetRotation(rotation);
    this.UpdateDimensionLines(svgDoc);
    GlobalData.optManager.UpdateDisplayCoordinates(newSize, null, null, this);

    console.log('S.Polygon: ResizeInTextEdit output:', offset);
    return offset;
  }

  GetTargetPoints(target, hookFlags, objectID) {
    console.log('S.Polygon: GetTargetPoints input:', { target, hookFlags, objectID });

    const targetPoints = [];
    const defaultPoints = [
      { x: ConstantData.Defines.SED_CDim / 2, y: 0 },
      { x: ConstantData.Defines.SED_CDim, y: ConstantData.Defines.SED_CDim / 2 },
      { x: ConstantData.Defines.SED_CDim / 2, y: ConstantData.Defines.SED_CDim },
      { x: 0, y: ConstantData.Defines.SED_CDim / 2 }
    ];

    const isContinuousConnection = this.flags & ConstantData.ObjFlags.SEDO_ContConn && target !== null && (hookFlags & ConstantData.HookFlags.SED_LC_NoContinuous) === 0;
    const hasConnectPoints = this.flags & ConstantData.ObjFlags.SEDO_UseConnect && this.ConnectPoints;
    const table = this.GetTable(false);
    const hasTableRows = this.hookflags & ConstantData.HookFlags.SED_LC_TableRows && table;
    const isNoTableLink = !hasTableRows && (this.flags & ConstantData.ObjFlags.SEDO_NoTableLink);
    const isGanttChart = this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_CHART;

    let tableTargetPoint = {};
    let foundTableTarget = false;
    const dimension = ConstantData.Defines.SED_CDim;

    if (isGanttChart && table && target) {
      foundTableTarget = GlobalData.optManager.Table_GetTargetPoints(this, table, target, hookFlags, tableTargetPoint, objectID);
    }

    if (foundTableTarget) {
      targetPoints.push(tableTargetPoint);
      console.log('S.Polygon: GetTargetPoints output:', targetPoints);
      return targetPoints;
    }

    if (isContinuousConnection) {
      const continuousPoints = this.PolyGetTargets(target, hookFlags, this.Frame);
      console.log('S.Polygon: GetTargetPoints output:', continuousPoints);
      return continuousPoints;
    }

    if (hasConnectPoints || hasTableRows) {
      const connectPoints = hasConnectPoints ? this.ConnectPoints : GlobalData.optManager.Table_GetRowConnectPoints(this, table);
      const deepCopiedPoints = Utils1.DeepCopy(connectPoints);
      console.log('S.Polygon: GetTargetPoints output:', deepCopiedPoints);
      return deepCopiedPoints;
    }

    console.log('S.Polygon: GetTargetPoints output:', defaultPoints);
    return defaultPoints;
  }

  ExtendLines() {
    console.log('S.Polygon: ExtendLines input:', { table: this.GetTable(false) });

    const table = this.GetTable(false);
    if (table) {
      GlobalData.optManager.Table_ExtendLines(this, table);
    }

    console.log('S.Polygon: ExtendLines output:', { table });
  }

  ExtendCell(columnIndex, rowIndex, extendValue) {
    console.log('S.Polygon: ExtendCell input:', { columnIndex, rowIndex, extendValue });

    const table = this.GetTable(false);
    if (table) {
      const extendedCells = GlobalData.optManager.Table_ExtendCell(this, table, columnIndex, rowIndex, extendValue);
      if (extendedCells) {
        const svgFrame = this.GetSVGFrame(this.Frame);
        const offsetX = this.inside.x - svgFrame.x;
        const offsetY = this.inside.y - svgFrame.y;

        if (offsetX || offsetY) {
          for (let i = 0; i < extendedCells.length; i++) {
            extendedCells[i].x += offsetX;
            extendedCells[i].y += offsetY;
          }
        }
        console.log('S.Polygon: ExtendCell output:', extendedCells);
        return extendedCells;
      }
    }
    console.log('S.Polygon: ExtendCell output: null');
    return null;
  }

  GetPerimeterPoints(event, pointsArray, hookType, rotateFlag, tableID, additionalParams) {
    console.log('S.Polygon: GetPerimeterPoints input:', { event, pointsArray, hookType, rotateFlag, tableID, additionalParams });

    let intersectionCount, rotatedPoints, perimeterPoints = [], tempPoints = [], intersectionPoints = {}, defaultPoint = [0, 0];
    const dimension = ConstantData.Defines.SED_CDim;

    if (pointsArray.length === 1 && pointsArray[0].y === -ConstantData.SEDA_Styles.SEDA_CoManager && this.IsCoManager(intersectionPoints)) {
      perimeterPoints.push(new Point(intersectionPoints.x, intersectionPoints.y));
      if (pointsArray[0].id != null) {
        perimeterPoints[0].id = pointsArray[0].id;
      }
      console.log('S.Polygon: GetPerimeterPoints output:', perimeterPoints);
      return perimeterPoints;
    }

    if (hookType === ConstantData.HookPts.SED_KAT || hookType === ConstantData.HookPts.SED_KATD) {
      perimeterPoints = this.BaseDrawingObject_GetPerimPts(event, pointsArray, hookType, false, tableID);
      console.log('S.Polygon: GetPerimeterPoints output:', perimeterPoints);
      return perimeterPoints;
    }

    const table = this.GetTable(false);
    if (tableID != null && table) {
      const tablePerimeterPoints = GlobalData.optManager.Table_GetPerimPts(this, table, tableID, pointsArray);
      if (tablePerimeterPoints) {
        perimeterPoints = tablePerimeterPoints;
        if (!rotateFlag) {
          rotatedPoints = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
          Utils3.RotatePointsAboutCenter(this.Frame, rotatedPoints, perimeterPoints);
        }
        console.log('S.Polygon: GetPerimeterPoints output:', perimeterPoints);
        return perimeterPoints;
      }
    }

    const pointsLength = pointsArray.length;
    const useConnectFlag = this.flags & ConstantData.ObjFlags.SEDO_UseConnect;
    const tableRowsFlag = this.hookflags & ConstantData.HookFlags.SED_LC_TableRows && table;

    if (useConnectFlag || tableRowsFlag) {
      for (let i = 0; i < pointsLength; i++) {
        perimeterPoints[i] = { x: 0, y: 0, id: 0 };
        perimeterPoints[i].x = pointsArray[i].x / dimension * this.Frame.width + this.Frame.x;
        perimeterPoints[i].y = pointsArray[i].y / dimension * this.Frame.height + this.Frame.y;
        if (pointsArray[i].id != null) {
          perimeterPoints[i].id = pointsArray[i].id;
        }
      }
    } else {
      if (this.flags & ConstantData.ObjFlags.SEDO_ContConn && !GlobalData.optManager.FromOverlayLayer) {
        perimeterPoints = this.BaseDrawingObject_GetPerimPts(event, pointsArray, hookType, rotateFlag, tableID, additionalParams);
        console.log('S.Polygon: GetPerimeterPoints output:', perimeterPoints);
        return perimeterPoints;
      }

      perimeterPoints = this.BaseDrawingObject_GetPerimPts(event, pointsArray, hookType, true, tableID, additionalParams);
      const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false, null);
      const polyPointsLength = polyPoints.length;

      if (!Utils2.EqualPt(polyPoints[0], polyPoints[polyPointsLength - 1])) {
        polyPoints.push(new Point(polyPoints[0].x, polyPoints[0].y));
      }

      for (let i = 0; i < pointsLength; i++) {
        if (pointsArray[i].x < dimension / 4) {
          intersectionCount = GlobalData.optManager.PolyGetIntersect(polyPoints, perimeterPoints[i].y, defaultPoint, null, false);
          if (intersectionCount) {
            perimeterPoints[i].x = defaultPoint[0];
            if (intersectionCount > 1 && defaultPoint[1] < perimeterPoints[i].x) {
              perimeterPoints[i].x = defaultPoint[1];
            }
          }
        } else if (pointsArray[i].x > 3 * dimension / 4) {
          intersectionCount = GlobalData.optManager.PolyGetIntersect(polyPoints, perimeterPoints[i].y, defaultPoint, null, false);
          if (intersectionCount) {
            perimeterPoints[i].x = defaultPoint[0];
            if (intersectionCount > 1 && defaultPoint[1] > perimeterPoints[i].x) {
              perimeterPoints[i].x = defaultPoint[1];
            }
          }
        } else if (pointsArray[i].y < dimension / 4) {
          intersectionCount = GlobalData.optManager.PolyGetIntersect(polyPoints, perimeterPoints[i].x, defaultPoint, null, true);
          if (intersectionCount) {
            perimeterPoints[i].y = defaultPoint[0];
            if (intersectionCount > 1 && defaultPoint[1] < perimeterPoints[i].y) {
              perimeterPoints[i].y = defaultPoint[1];
            }
          }
        } else if (pointsArray[i].y > 3 * dimension / 4) {
          intersectionCount = GlobalData.optManager.PolyGetIntersect(polyPoints, perimeterPoints[i].x, defaultPoint, null, true);
          if (intersectionCount) {
            perimeterPoints[i].y = defaultPoint[0];
            if (intersectionCount > 1 && defaultPoint[1] > perimeterPoints[i].y) {
              perimeterPoints[i].y = defaultPoint[1];
            }
          }
        }
        if (pointsArray[i].id != null) {
          perimeterPoints[i].id = pointsArray[i].id;
        }
      }
    }

    if (!rotateFlag) {
      rotatedPoints = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotatedPoints, perimeterPoints);
    }

    console.log('S.Polygon: GetPerimeterPoints output:', perimeterPoints);
    return perimeterPoints;
  }

  BaseDrawingObject_GetPerimPts(event, pointsArray, hookType, rotateFlag, tableID, additionalParams) {
    console.log('S.Polygon: BaseDrawingObject_GetPerimPts input:', { event, pointsArray, hookType, rotateFlag, tableID, additionalParams });

    const perimeterPoints = [];
    const pointsCount = pointsArray.length;
    const triangleShapeType = ConstantData.SDRShapeTypes.SED_S_Tri;
    const dimension = ConstantData.Defines.SED_CDim;

    for (let i = 0; i < pointsCount; i++) {
      perimeterPoints[i] = { x: 0, y: 0, id: 0 };
      perimeterPoints[i].x = pointsArray[i].x / dimension * this.Frame.width + this.Frame.x;
      const yValue = this.dataclass === triangleShapeType ? dimension - pointsArray[i].y : pointsArray[i].y;
      perimeterPoints[i].y = yValue / dimension * this.Frame.height + this.Frame.y;
      if (pointsArray[i].id != null) {
        perimeterPoints[i].id = pointsArray[i].id;
      }
    }

    if (!rotateFlag) {
      const rotationAngle = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationAngle, perimeterPoints);
    }

    console.log('S.Polygon: BaseDrawingObject_GetPerimPts output:', perimeterPoints);
    return perimeterPoints;
  }

  GetPolyPoints(numPoints, includeFrameOffset, inflate, adjustForLineThickness, additionalParams) {
    console.log('S.Polygon: GetPolyPoints input:', { numPoints, includeFrameOffset, inflate, adjustForLineThickness, additionalParams });

    let vertex, point, frame = {}, pointsArray = [];
    Utils2.CopyRect(frame, this.Frame);

    const halfLineThickness = this.StyleRecord.Line.Thickness / 2;
    if (adjustForLineThickness) {
      Utils2.InflateRect(frame, halfLineThickness, halfLineThickness);
    }

    for (let i = 0; i < this.VertexArray.length; ++i) {
      vertex = this.VertexArray[i];
      point = {
        x: vertex.x * frame.width,
        y: vertex.y * frame.height
      };
      pointsArray.push(point);
    }

    if (!includeFrameOffset) {
      for (let i = 0; i < pointsArray.length; i++) {
        pointsArray[i].x += frame.x;
        pointsArray[i].y += frame.y;
      }
    }

    console.log('S.Polygon: GetPolyPoints output:', pointsArray);
    return pointsArray;
  }

  SetShapeIndent(isIndentNeeded) {
    console.log('S.Polygon: SetShapeIndent input:', { isIndentNeeded });

    let width, height, leftIndentRatio = 1, rightIndentRatio = 1, topIndentRatio = 1, bottomIndentRatio = 1;
    let polygonPoints = [], indentValues = {};

    width = this.inside.width;
    height = this.inside.height;

    if (this.NeedsSIndentCount) {
      polygonPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, false, false, null);
      indentValues = GlobalData.optManager.GuessTextIndents(polygonPoints, this.Frame);
      this.left_sindent = indentValues.left_sindent;
      this.right_sindent = indentValues.right_sindent;
      this.top_sindent = indentValues.top_sindent;
      this.bottom_sindent = indentValues.bottom_sindent;
      this.NeedsSIndentCount = false;
    }

    if (isIndentNeeded) {
      leftIndentRatio = 1 - (this.left_sindent + this.right_sindent);
      rightIndentRatio = 1 - (this.left_sindent + this.right_sindent);
      topIndentRatio = 1 - (this.bottom_sindent + this.top_sindent);
      bottomIndentRatio = 1 - (this.bottom_sindent + this.top_sindent);
    }

    this.tindent.left = this.left_sindent * width / leftIndentRatio;
    this.tindent.top = this.top_sindent * height / topIndentRatio;
    this.tindent.right = this.right_sindent * width / rightIndentRatio;
    this.tindent.bottom = this.bottom_sindent * height / bottomIndentRatio;

    console.log('S.Polygon: SetShapeIndent output:', {
      left: this.tindent.left,
      top: this.tindent.top,
      right: this.tindent.right,
      bottom: this.tindent.bottom
    });
  }
  WriteSDFAttributes(writer, context) {
    console.log('S.Polygon: WriteSDFAttributes input:', { writer, context });

    let vertexCount, width, height, polyId, vertexX, vertexY, polySegment;
    if (this.dataclass && this.dataclass === ConstantData.SDRShapeTypes.SED_S_Poly) {
      if (this.polylist) {
        Instance.Shape.PolyLine.prototype.WriteSDFAttributes.call(this, writer, context, true);
      } else {
        let code = ShapeAttrUtil.Write_CODE(writer, FileParser.SDROpCodesByName.SDF_C_DRAWPOLY);
        vertexCount = this.VertexArray.length;
        width = ShapeAttrUtil.ToSDWinCoords(this.Frame.width, context.coordScaleFactor);
        height = ShapeAttrUtil.ToSDWinCoords(this.Frame.height, context.coordScaleFactor);
        polyId = context.WriteBlocks ? this.BlockID : context.polyid++;

        for (let i = 0; i < vertexCount; i++) {
          vertexX = this.VertexArray[i].x * width;
          vertexY = this.VertexArray[i].y * height;
          polySegment = {
            otype: ConstantData.ObjectTypes.SED_LineD,
            dataclass: 0,
            ShortRef: 0,
            param: 0,
            pt: { x: 0, y: 0 },
            lpt: { x: vertexX, y: vertexY },
            dimDeflection: 0
          };
          code = ShapeAttrUtil.Write_CODE(writer, FileParser.SDROpCodesByName.SDF_C_DRAWPOLYSEG);
          writer.writeStruct(FileParser.SDF_PolySeg_Struct, polySegment);
          ShapeAttrUtil.Write_LENGTH(writer, code);
        }
        writer.writeUint16(FileParser.SDROpCodesByName.SDF_C_DRAWPOLY_END);
      }
    }
    super.WriteSDFAttributes(writer, context);

    console.log('S.Polygon: WriteSDFAttributes output:', { writer, context });
  }

  Flip(flipType) {
    console.log('S.Polygon: Flip input:', { flipType });

    let shouldUpdate = true;
    const shapeTypes = ConstantData.SDRShapeTypes;
    const dimension = ConstantData.Defines.SED_CDim;

    this.VertexArray = GlobalData.optManager.FlipVertexArray(this.VertexArray, flipType);

    if (this.polylist) {
      Instance.Shape.PolyLine.prototype.Flip.call(this, flipType);
    }

    if (flipType & ConstantData.ExtraFlags.SEDE_FlipVert && this.dataclass != null) {
      switch (this.dataclass) {
        case shapeTypes.SED_S_ArrT:
          this.dataclass = shapeTypes.SED_S_ArrB;
          break;
        case shapeTypes.SED_S_ArrB:
          this.dataclass = shapeTypes.SED_S_ArrT;
          break;
        case shapeTypes.SED_S_Tri:
          this.dataclass = shapeTypes.SED_S_TriB;
          break;
        case shapeTypes.SED_S_TriB:
          this.dataclass = shapeTypes.SED_S_Tri;
          break;
        case shapeTypes.SED_S_Trap:
          this.dataclass = shapeTypes.SED_S_TrapB;
          break;
        case shapeTypes.SED_S_TrapB:
          this.dataclass = shapeTypes.SED_S_Trap;
          break;
        case shapeTypes.SED_S_Poly:
        case shapeTypes.SED_S_MeasureArea:
          shouldUpdate = false;
          break;
        default:
          this.extraflags = Utils2.SetFlag(
            this.extraflags,
            ConstantData.ExtraFlags.SEDE_FlipVert,
            !(this.extraflags & ConstantData.ExtraFlags.SEDE_FlipVert)
          );
          shouldUpdate = false;
      }

      if (shouldUpdate && this.flags & ConstantData.ObjFlags.SEDO_UseConnect && this.ConnectPoints) {
        for (let i = 0; i < this.ConnectPoints.length; i++) {
          this.ConnectPoints[i].y = dimension - this.ConnectPoints[i].y;
        }
      }
    }

    if (flipType & ConstantData.ExtraFlags.SEDE_FlipHoriz && this.dataclass != null) {
      switch (this.dataclass) {
        case shapeTypes.SED_S_ArrL:
          this.dataclass = shapeTypes.SED_S_ArrR;
          break;
        case shapeTypes.SED_S_ArrR:
          this.dataclass = shapeTypes.SED_S_ArrL;
          break;
        case shapeTypes.SED_S_Poly:
        case shapeTypes.SED_S_MeasureArea:
          shouldUpdate = false;
          break;
        default:
          this.extraflags = Utils2.SetFlag(
            this.extraflags,
            ConstantData.ExtraFlags.SEDE_FlipHoriz,
            !(this.extraflags & ConstantData.ExtraFlags.SEDE_FlipHoriz)
          );
          shouldUpdate = false;
      }

      if (shouldUpdate && this.flags & ConstantData.ObjFlags.SEDO_UseConnect && this.ConnectPoints) {
        for (let i = 0; i < this.ConnectPoints.length; i++) {
          this.ConnectPoints[i].x = dimension - this.ConnectPoints[i].x;
        }
      }
    }

    GlobalData.optManager.SetLinkFlag(
      this.BlockID,
      ConstantData.LinkFlags.SED_L_MOVE | ConstantData.LinkFlags.SED_L_CHANGE
    );

    if (this.hooks.length) {
      GlobalData.optManager.SetLinkFlag(this.hooks[0].objid, ConstantData.LinkFlags.SED_L_MOVE);
    }

    this.NeedsSIndentCount = true;
    this.UpdateFrame(this.Frame);
    this.Resize(
      GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID),
      this.Frame,
      this
    );

    console.log('S.Polygon: Flip output:', { flipType });
  }

  RegenerateVectors(width, height) {
    console.log('S.Polygon: RegenerateVectors input:', { width, height });

    let radius, adjustedWidth, adjustedHeight, vectors = null;
    const shapeParam = this.shapeparam;
    const shapeType = this.dataclass;

    switch (shapeType) {
      case ConstantData.SDRShapeTypes.SED_S_Pgm:
        vectors = PolygonShapeGenerator.SED_S_Pgm(this.Frame, shapeParam);
        break;
      case ConstantData.SDRShapeTypes.SED_S_Term:
        vectors = PolygonShapeGenerator.SED_S_Term(this.Frame, shapeParam);
        break;
      case ConstantData.SDRShapeTypes.SED_S_Pent:
        radius = width / 2;
        shapeParam = width / 2 * (shapeParam / radius);
        vectors = PolygonShapeGenerator.SED_S_Pent(this.Frame, shapeParam);
        break;
      case ConstantData.SDRShapeTypes.SED_S_PentL:
        radius = height / 2;
        shapeParam = height / 2 * (shapeParam / radius);
        vectors = PolygonShapeGenerator.SED_S_PentL(this.Frame, shapeParam);
        break;
      case ConstantData.SDRShapeTypes.SED_S_Hex:
        radius = height / 2;
        shapeParam = height / 2 * (shapeParam / radius);
        vectors = PolygonShapeGenerator.SED_S_Hex(this.Frame, shapeParam);
        break;
      case ConstantData.SDRShapeTypes.SED_S_Oct:
        adjustedWidth = shapeParam * height;
        adjustedHeight = shapeParam * width;
        if (adjustedWidth < adjustedHeight) {
          adjustedHeight = adjustedWidth;
        }
        if (height) {
          adjustedHeight = height * (adjustedHeight / height);
        }
        shapeParam = adjustedHeight / width;
        adjustedWidth = adjustedHeight / height;
        vectors = PolygonShapeGenerator.SED_S_Oct(this.Frame, shapeParam, adjustedWidth);
        break;
      case ConstantData.SDRShapeTypes.SED_S_ArrR:
        vectors = PolygonShapeGenerator.SED_S_ArrR(this.Frame, shapeParam);
        break;
      case ConstantData.SDRShapeTypes.SED_S_ArrL:
        vectors = PolygonShapeGenerator.SED_S_ArrL(this.Frame, shapeParam);
        break;
      case ConstantData.SDRShapeTypes.SED_S_ArrT:
        vectors = PolygonShapeGenerator.SED_S_ArrT(this.Frame, shapeParam);
        break;
      case ConstantData.SDRShapeTypes.SED_S_ArrB:
        vectors = PolygonShapeGenerator.SED_S_ArrB(this.Frame, shapeParam);
        break;
      case ConstantData.SDRShapeTypes.SED_S_Trap:
        vectors = PolygonShapeGenerator.SED_S_Trap(this.Frame, shapeParam);
        break;
      case ConstantData.SDRShapeTypes.SED_S_TrapB:
        vectors = PolygonShapeGenerator.SED_S_TrapB(this.Frame, shapeParam);
        break;
      case ConstantData.SDRShapeTypes.SED_S_Input:
        vectors = PolygonShapeGenerator.SED_S_Input(this.Frame, shapeParam);
        break;
      case ConstantData.SDRShapeTypes.SED_S_Store:
        adjustedHeight = shapeParam;
        vectors = PolygonShapeGenerator.SED_S_Store(this.Frame, shapeParam, adjustedHeight);
        break;
      case ConstantData.SDRShapeTypes.SED_S_Delay:
        vectors = PolygonShapeGenerator.SED_S_Delay(this.Frame, shapeParam);
        break;
      case ConstantData.SDRShapeTypes.SED_S_Disp:
        vectors = PolygonShapeGenerator.SED_S_Disp(this.Frame, shapeParam);
        break;
    }

    const extraFlags = this.extraflags;
    if (extraFlags & (ConstantData.ExtraFlags.SEDE_FlipHoriz | ConstantData.ExtraFlags.SEDE_FlipVert) && vectors) {
      vectors = GlobalData.optManager.FlipVertexArray(vectors, extraFlags);
    }

    console.log('S.Polygon: RegenerateVectors output:', vectors);
    return vectors;
  }

  GetParabolaAdjustmentPoint(point, adjustment) {
    console.log('S.Polygon: GetParabolaAdjustmentPoint input:', { point, adjustment });
    const result = Instance.Shape.PolyLine.prototype.Pr_PolyLGetParabolaAdjPoint.call(this, point, adjustment);
    console.log('S.Polygon: GetParabolaAdjustmentPoint output:', result);
    return result;
  }

  GetArcParameters(startPoint, endPoint) {
    console.log('S.Polygon: GetArcParameters input:', { startPoint, endPoint });
    const result = Instance.Shape.PolyLine.prototype.Pr_PolyLGetArc.call(this, startPoint, endPoint);
    console.log('S.Polygon: GetArcParameters output:', result);
    return result;
  }

  GetParabolaParameters(event, target) {
    console.log('S.Polygon: GetParabolaParameters input:', { event, target });
    const result = Instance.Shape.PolyLine.prototype.Pr_PolyLGetParabolaParam.call(this, event, target);
    console.log('S.Polygon: GetParabolaParameters output:', result);
    return result;
  }

  GetArcParameters(event, target, additionalParams) {
    console.log('S.Polygon: GetArcParameters input:', { event, target, additionalParams });
    const result = Instance.Shape.PolyLine.prototype.Pr_PolyLGetArcParam.call(this, event, target, additionalParams);
    console.log('S.Polygon: GetArcParameters output:', result);
    return result;
  }

  GetArcQuadrant(event, target, additionalParams) {
    console.log('S.Polygon: GetArcQuadrant input:', { event, target, additionalParams });
    const result = Instance.Shape.PolyLine.prototype.Pr_PolyLGetArcQuadrant.call(this, event, target, additionalParams);
    console.log('S.Polygon: GetArcQuadrant output:', result);
    return result;
  }

  ScaleObject(x, y, rotation, center, scaleX, scaleY, adjustLineThickness) {
    console.log('S.Polygon: ScaleObject input:', { x, y, rotation, center, scaleX, scaleY, adjustLineThickness });

    let frameCopy = Utils1.DeepCopy(this.Frame);

    if (scaleX && scaleY) {
      frameCopy.x = x + frameCopy.x * scaleX;
      frameCopy.y = y + frameCopy.y * scaleY;
      frameCopy.width *= scaleX;
      frameCopy.height *= scaleY;
    }

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    if (rotation) {
      const centerPoint = {
        x: frameCopy.x + frameCopy.width / 2,
        y: frameCopy.y + frameCopy.height / 2
      };
      const rotationRadians = 2 * Math.PI * (rotation / 360);
      const rotatedPoint = GlobalData.optManager.RotatePointAroundPoint(center, centerPoint, rotationRadians);
      frameCopy.x = rotatedPoint.x - frameCopy.width / 2;
      frameCopy.y = rotatedPoint.y - frameCopy.height / 2;
      this.RotationAngle += rotation;
      if (this.RotationAngle >= 360) {
        this.RotationAngle -= 360;
      }
    }

    if (adjustLineThickness) {
      let maxScale = scaleX;
      if (scaleY > maxScale) {
        maxScale = scaleY;
      }
      this.StyleRecord.Line.Thickness *= maxScale;
      this.StyleRecord.Line.BThick *= maxScale;
    }

    this.UpdateFrame(frameCopy);
    const regeneratedVectors = this.RegenerateVectors(frameCopy.width, frameCopy.height);
    if (regeneratedVectors) {
      this.VertexArray = regeneratedVectors;
    }

    if (this.polylist) {
      Instance.Shape.PolyLine.prototype.ScaleObject.call(this, 0, 0, 0, 0, 0, 0);
    }

    if (scaleX && scaleY) {
      this.sizedim.width = this.Frame.width;
      this.sizedim.height = this.Frame.height;
    }

    console.log('S.Polygon: ScaleObject output:', { frameCopy, regeneratedVectors });
  }

  UpdateSecondaryDimensions(svgDoc, dimensions, polyPoints) {
    console.log('S.Polygon: UpdateSecondaryDimensions input:', { svgDoc, dimensions, polyPoints });

    let pointsArray = [];
    let pointsCount = 0;

    if (
      (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always ||
        this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select) &&
      this.Dimensions & ConstantData.DimensionFlags.SED_DF_ShowLineAngles &&
      this.polylist
    ) {
      pointsArray = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
      pointsCount = pointsArray.length;

      for (let i = 1; i < pointsCount; i++) {
        this.DrawDimensionAngle(svgDoc, dimensions, i, pointsArray);
      }
    }

    console.log('S.Polygon: UpdateSecondaryDimensions output:', { pointsArray, pointsCount });
  }

  SetSegmentAngle(segmentIndex, angle, additionalParams) {
    console.log('S.Polygon: SetSegmentAngle input:', { segmentIndex, angle, additionalParams });

    GlobalData.optManager.ShapeToPolyLine(this.BlockID, false, true);
    const polygonObject = GlobalData.optManager.GetObjectPtr(this.BlockID, false);
    polygonObject.SetSegmentAngle(segmentIndex, angle, additionalParams);
    GlobalData.optManager.PolyLineToShape(this.BlockID);

    console.log('S.Polygon: SetSegmentAngle output:', { segmentIndex, angle, additionalParams });
  }

  DimensionLineDeflectionAdjust(event, target, angle, radius, index) {
    console.log('S.Polygon: DimensionLineDeflectionAdjust input:', { event, target, angle, radius, index });

    if (!this.polylist) {
      const result = Instance.Shape.BaseShape.prototype.DimensionLineDeflectionAdjust.call(this, event, target, angle, radius, index);
      console.log('S.Polygon: DimensionLineDeflectionAdjust output:', result);
      return result;
    }

    GlobalData.optManager.ShapeToPolyLine(this.BlockID, false, true);
    const polygonObject = GlobalData.optManager.GetObjectPtr(this.BlockID, false);
    polygonObject.DimensionLineDeflectionAdjust(event, target, angle, radius, index);
    GlobalData.optManager.PolyLineToShape(this.BlockID);

    console.log('S.Polygon: DimensionLineDeflectionAdjust output: completed');
  }

  GetDimensionDeflectionValue(segmentIndex) {
    console.log('S.Polygon: GetDimensionDeflectionValue input:', { segmentIndex });

    if (this.polylist) {
      if (!this.polylist.segs || this.polylist.segs.length === 0 || segmentIndex < 0 || segmentIndex >= this.polylist.segs.length) {
        console.log('S.Polygon: GetDimensionDeflectionValue output: undefined');
        return undefined;
      }
      const deflectionValue = this.polylist.segs[segmentIndex].dimDeflection;
      console.log('S.Polygon: GetDimensionDeflectionValue output:', deflectionValue);
      return deflectionValue;
    } else {
      const deflectionValue = Instance.Shape.BaseShape.prototype.GetDimensionDeflectionValue.call(this, segmentIndex);
      console.log('S.Polygon: GetDimensionDeflectionValue output:', deflectionValue);
      return deflectionValue;
    }
  }

  UpdateDimensionFromTextObj(textObj, textData) {
    console.log('S.Polygon: UpdateDimensionFromTextObj input:', { textObj, textData });

    GlobalData.objectStore.PreserveBlock(this.BlockID);

    let text, userData;
    if (textData) {
      text = textData.text;
      userData = textData.userData;
    } else {
      text = textObj.GetText();
      userData = textObj.GetUserData();
    }

    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

    if (userData.angleChange) {
      this.UpdateLineAngleDimensionFromText(svgElement, text, userData);
      GlobalData.optManager.AddToDirtyList(this.BlockID);
      if (this.Frame.x < 0 || this.Frame.y < 0) {
        GlobalData.optManager.ScrollObjectIntoView(this.BlockID, false);
      }
      GlobalData.optManager.CompleteOperation(null);
      console.log('S.Polygon: UpdateDimensionFromTextObj output: angleChange handled');
      return;
    }

    if (this.polylist && (this.extraflags & ConstantData.ExtraFlags.SEDE_SideKnobs) > 0) {
      GlobalData.optManager.ShapeToPolyLine(this.BlockID, false, true);
      GlobalData.optManager.GetObjectPtr(this.BlockID, false).UpdateDimensionFromText(svgElement, text, userData);
      GlobalData.optManager.PolyLineToShape(this.BlockID);
    } else {
      Instance.Shape.BaseShape.prototype.UpdateDimensionFromTextObj.call(this, textObj, textData);
    }

    console.log('S.Polygon: UpdateDimensionFromTextObj output: dimension updated');
  }

  GetDimensionPoints() {
    console.log('S.Polygon: GetDimensionPoints input');

    let dimensionPoints;
    if (this.polylist && (this.extraflags & ConstantData.ExtraFlags.SEDE_SideKnobs) > 0) {
      let deepCopiedShape = Utils1.DeepCopy(this);
      deepCopiedShape = GlobalData.optManager.ShapeToPolyLine(this.BlockID, false, true, deepCopiedShape);
      dimensionPoints = deepCopiedShape.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
    } else {
      dimensionPoints = Instance.Shape.BaseShape.prototype.GetDimensionPoints.call(this);
    }

    console.log('S.Polygon: GetDimensionPoints output:', dimensionPoints);
    return dimensionPoints;
  }

  GetPolyRectangularInfo() {
    console.log('S.Polygon: GetPolyRectangularInfo input');

    let widthDimension, heightDimension, angle, points = [];
    if (!this.polylist) return null;

    points = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
    if (this.polylist.segs.length !== 5 || !this.polylist.closed) return null;

    let filteredPoints = [];
    const pointsLength = points.length;
    for (let i = 0; i < pointsLength; i++) {
      if (i < pointsLength - 1 && points[i].x === points[i + 1].x && points[i].y === points[i + 1].y) continue;
      filteredPoints.push(points[i]);
    }

    points = filteredPoints;
    if (!Utils2.IsRectangular(points) || points.length !== 5) return null;

    const distance1 = Utils2.GetDistanceBetween2Points(points[0], points[1]);
    const distance2 = Utils2.GetDistanceBetween2Points(points[2], points[3]);
    if (distance1 / distance2 <= 0.99 || distance1 / distance2 >= 1.01) return null;

    const distance3 = Utils2.GetDistanceBetween2Points(points[1], points[2]);
    const distance4 = Utils2.GetDistanceBetween2Points(points[3], points[4]);
    if (distance3 / distance4 <= 0.99 || distance3 / distance4 >= 1.01) return null;

    angle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(points[0], points[1]);
    if (angle < Math.PI / 4 || angle > 1.5 * Math.PI || (angle > 0.75 * Math.PI && angle < 1.25 * Math.PI)) {
      widthDimension = 1;
      heightDimension = 2;
    } else {
      widthDimension = 2;
      heightDimension = 1;
    }

    const result = { wdDim: widthDimension, htDim: heightDimension };
    console.log('S.Polygon: GetPolyRectangularInfo output:', result);
    return result;
  }

  GetDimensionFloatingPointValue(dimensionType) {
    console.log('S.Polygon: GetDimensionFloatingPointValue input:', { dimensionType });

    let dimensionValue = 0;

    if (!this.polylist) {
      console.log('S.Polygon: GetDimensionFloatingPointValue output: null (no polylist)');
      return null;
    }

    if (!(this.rflags & ConstantData.FloatingPointDim.SD_FP_Width || this.rflags & ConstantData.FloatingPointDim.SD_FP_Height)) {
      console.log('S.Polygon: GetDimensionFloatingPointValue output: null (no floating point dimensions)');
      return null;
    }

    const polyRectInfo = this.GetPolyRectangularInfo();
    if (!polyRectInfo) {
      console.log('S.Polygon: GetDimensionFloatingPointValue output: null (no poly rectangular info)');
      return null;
    }

    if (polyRectInfo.wdDim === dimensionType || polyRectInfo.wdDim + 2 === dimensionType) {
      if (this.rflags & ConstantData.FloatingPointDim.SD_FP_Width) {
        dimensionValue = this.GetDimensionLengthFromValue(this.rwd);
        const result = this.GetLengthInRulerUnits(dimensionValue);
        console.log('S.Polygon: GetDimensionFloatingPointValue output:', result);
        return result;
      }
    } else if ((polyRectInfo.htDim === dimensionType || polyRectInfo.htDim + 2 === dimensionType) && this.rflags & ConstantData.FloatingPointDim.SD_FP_Height) {
      dimensionValue = this.GetDimensionLengthFromValue(this.rht);
      const result = this.GetLengthInRulerUnits(dimensionValue);
      console.log('S.Polygon: GetDimensionFloatingPointValue output:', result);
      return result;
    }

    console.log('S.Polygon: GetDimensionFloatingPointValue output: null');
    return null;
  }

  IsTextFrameOverlap(textFrame, rotationAngle) {
    console.log('S.Polygon: IsTextFrameOverlap input:', { textFrame, rotationAngle });

    if (!this.polylist) {
      console.log('S.Polygon: IsTextFrameOverlap output: false (no polylist)');
      return false;
    }

    const polygonPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
    const adjustedAngle = 360 - rotationAngle;
    const radians = 2 * Math.PI * (adjustedAngle / 360);
    Utils3.RotatePointsAboutCenter(this.Frame, -radians, polygonPoints);
    const isOverlap = Utils2.IsFrameCornersInPoly(polygonPoints, textFrame);

    console.log('S.Polygon: IsTextFrameOverlap output:', isOverlap);
    return isOverlap;
  }

}

export default Polygon;
