
import BaseShape from './S.BaseShape'
import Utils1 from '../Util/Utils1';
import Utils2 from "../Util/Utils2";
import Utils3 from "../Util/Utils3";
import T3Gv from '../Data/T3Gv'
import PolygonShapeGenerator from '../Opt/Polygon/PolygonUtil'
import $ from 'jquery'
import NvConstant from '../Data/Constant/NvConstant'
import PolygonConstant from '../Opt/Polygon/PolygonConstant';
import PolygonUtil from '../Opt/Polygon/PolygonUtil';
import ShapeUtil from "../Opt/Shape/ShapeUtil";
import Instance from '../Data/Instance/Instance';
import DSConstant from '../Opt/DS/DSConstant';
import OptConstant from '../Data/Constant/OptConstant';
import T3Timer from '../Util/T3Timer';
import T3Util from '../Util/T3Util';
import DataUtil from '../Opt/Data/DataUtil';
import UIUtil from '../Opt/UI/UIUtil';
import RulerUtil from '../Opt/UI/RulerUtil';
import OptCMUtil from '../Opt/Opt/OptCMUtil';
import DrawUtil from '../Opt/Opt/DrawUtil';
import PolyUtil from '../Opt/Opt/PolyUtil';
import ToolActUtil from '../Opt/Opt/ToolActUtil';
import TextUtil from '../Opt/Opt/TextUtil';

/**
 * Represents a polygon shape that can be rendered in SVG.
 * This class extends BaseShape and provides functionality for creating and
 * manipulating polygons with various styles, dimensions, and behaviors.
 *
 * @class Polygon
 * @extends {BaseShape}
 *
 * @property {any[]} VertexArray - Array of vertices defining the polygon's shape. Each vertex contains x,y coordinates.
 * @property {any} FixedPoint - Reference point for the polygon, defaults to [0,0].
 * @property {any} LineOrientation - Determines the orientation of lines, defaults to None.
 * @property {Object} hoplist - Contains data about hops in the polygon, with properties nhops and hops array.
 * @property {any[]} ArrowheadData - Contains data for rendering arrowheads.
 *
 * @example
 * // Create a basic polygon
 * const polygonOptions = {
 *   VertexArray: [
 *     { x: 0, y: 0 },
 *     { x: 1, y: 0 },
 *     { x: 1, y: 1 },
 *     { x: 0, y: 1 }
 *   ],
 *   StyleRecord: {
 *     Line: {
 *       Paint: { Color: 'black', Opacity: 1 },
 *       Thickness: 2,
 *       LinePattern: 0
 *     },
 *     Fill: {
 *       Paint: { Color: 'white' }
 *     }
 *   }
 * };
 *
 * const polygon = new Polygon(polygonOptions);
 *
 * // Render the polygon to SVG
 * const svgDoc = T3Gv.opt.svgDoc;
 * const svgElement = polygon.CreateShape(svgDoc, true);
 *
 * // Resize the polygon
 * polygon.Resize(svgDoc, { x: 100, y: 100, width: 200, height: 150 }, OptConstant.ActionTriggerType.Move);
 *
 * // Flip the polygon horizontally
 * polygon.Flip(OptConstant.ExtraFlags.FlipHoriz);
 */
class Polygon extends BaseShape {

  public VertexArray: any;
  public FixedPoint: any;
  public LineOrientation: any;
  public hoplist: any;
  public ArrowheadData: any;

  constructor(options) {
    T3Util.Log('S.Polygon: Constructor input:', options);

    options = options || {};
    options.ShapeType = OptConstant.ShapeType.Polygon;

    super(options);

    this.VertexArray = options.VertexArray || [];
    this.FixedPoint = options.FixedPoint || [0, 0];
    this.LineOrientation = options.LineOrientation || OptConstant.LineOrientation.None;
    this.hoplist = options.hoplist || { nhops: 0, hops: [] };
    this.ArrowheadData = options.ArrowheadData || [];

    this.dataclass = PolygonConstant.ShapeTypes.POLYGON;

    T3Util.Log('S.Polygon: Constructor output:', this);
  }

  ScaleGeometries(svgDoc, points, width, height) {
    T3Util.Log('S.Polygon: scaleGeometries input:', { svgDoc, points, width, height });

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

        shapeElement = svgDoc.GetElementById(OptConstant.SVGElementClass.Shape, geometry.shapeid);
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

        subShapeElement = svgDoc.GetElementById(OptConstant.SVGElementClass.Shape, subShapeId);

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

    T3Util.Log('S.Polygon: scaleGeometries output:', { svgDoc, points, width, height });
  }

  CreateShape(svgDoc, isInteractive) {
    T3Util.Log("S.Polygon: CreateShape input:", { svgDoc, isInteractive });

    if (this.flags & NvConstant.ObjFlags.NotVisible) {
      T3Util.Log("S.Polygon: CreateShape output: null (not visible)");
      return null;
    }

    // Create the container shape and initial polygon shape.
    const containerShape = svgDoc.CreateShape(OptConstant.CSType.ShapeContainer);
    let polygonShape = svgDoc.CreateShape(OptConstant.CSType.Polygon);
    polygonShape.SetID(OptConstant.SVGElementClass.Shape);

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
      let currentPathShape = svgDoc.CreateShape(OptConstant.CSType.Path);
      currentPathShape.SetID(OptConstant.SVGElementClass.Shape);
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
          currentPathShape = svgDoc.CreateShape(OptConstant.CSType.Path);
          currentPathShape.SetID(OptConstant.SVGElementClass.Shape);
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
          const secondaryShape = svgDoc.CreateShape(OptConstant.CSType.Path);
          secondaryShape.SetID(OptConstant.SVGElementClass.Shape);
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
    const invisiblePolygon = svgDoc.CreateShape(OptConstant.CSType.Polygon);
    invisiblePolygon.SetPoints(points);
    invisiblePolygon.SetStrokeColor("white");
    invisiblePolygon.SetFillColor("none");
    invisiblePolygon.SetOpacity(0);
    invisiblePolygon.SetStrokeWidth(lineThickness + OptConstant.Common.Slop);
    if (isInteractive) {
      invisiblePolygon.SetEventBehavior(OptConstant.EventBehavior.HiddenOut);
    } else {
      invisiblePolygon.SetEventBehavior(OptConstant.EventBehavior.None);
    }
    invisiblePolygon.SetID(OptConstant.SVGElementClass.Slop);
    invisiblePolygon.ExcludeFromExport(true);
    invisiblePolygon.SetSize(width, height);
    containerShape.AddElement(invisiblePolygon);

    // Add hatch fill if defined.
    const hatch = styleRecord.Fill.Hatch;
    if (hatch && hatch !== 0) {
      const hatchShape = svgDoc.CreateShape(OptConstant.CSType.Polygon);
      hatchShape.SetPoints(points);
      hatchShape.SetID(OptConstant.SVGElementClass.Hatch);
      hatchShape.SetSize(width, height);
      hatchShape.SetStrokeWidth(0);
      this.SetFillHatch(hatchShape, hatch);
      containerShape.AddElement(hatchShape);
    }

    containerShape.isShape = true;
    // const tableData = this.GetTable(false);
    // if (tableData) {
    //   T3Gv.opt.LM_AddSVGTableObject(this, svgDoc, containerShape, tableData);
    // }
    if (this.DataID >= 0) {
      this.LMAddSVGTextObject(svgDoc, containerShape);
    }

    T3Util.Log("S.Polygon: CreateShape output:", containerShape);
    return containerShape;
  }

  Resize(svgDoc, newSize, actionTriggerType, prevBBox) {
    T3Util.Log('S.Polygon: Resize input:', { svgDoc, newSize, actionTriggerType, prevBBox });

    if (svgDoc != null) {
      const rotation = svgDoc.GetRotation();
      const previousBoundingBox = $.extend(true, {}, this.prevBBox);
      const newBoundingBox = $.extend(true, {}, newSize);
      const adjustedBoundingBox = $.extend(true, {}, newSize);
      const offset = T3Gv.opt.svgDoc.CalculateRotatedOffsetForResize(previousBoundingBox, newBoundingBox, rotation);

      if (this.StyleRecord.Line.BThick && this.polylist == null) {
        Utils2.InflateRect(adjustedBoundingBox, this.StyleRecord.Line.BThick, this.StyleRecord.Line.BThick);
      }

      if (actionTriggerType !== OptConstant.ActionTriggerType.MovePolySeg) {
        svgDoc.SetSize(adjustedBoundingBox.width, adjustedBoundingBox.height);
        svgDoc.SetPos(adjustedBoundingBox.x + offset.x, adjustedBoundingBox.y + offset.y);

        const shapeElement = svgDoc.GetElementById(OptConstant.SVGElementClass.Shape);
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

        const slopElement = svgDoc.GetElementById(OptConstant.SVGElementClass.Slop);
        if (slopElement) {
          slopElement.SetPoints(points);
          slopElement.SetSize(adjustedBoundingBox.width, adjustedBoundingBox.height);
        }

        const hatchElement = svgDoc.GetElementById(OptConstant.SVGElementClass.Hatch);
        if (hatchElement) {
          hatchElement.SetPoints(points);
          hatchElement.SetSize(newSize.width, newSize.height);
        }
      }

      // if (this.GetTable(false)) {
      //   T3Gv.opt.Table_ResizeSVGTableObject(svgDoc, actionTriggerType, newSize);
      // } else
      {
        this.LMResizeSVGTextObject(svgDoc, actionTriggerType, newSize);
      }

      svgDoc.SetRotation(rotation);
      this.UpdateDimensionLines(svgDoc);
      UIUtil.UpdateDisplayCoordinates(newSize, null, null, this);

      T3Util.Log('S.Polygon: Resize output:', offset);
      return offset;
    }
  }

  ResizeInTextEdit(svgDoc, newSize) {
    T3Util.Log('S.Polygon: ResizeInTextEdit input:', { svgDoc, newSize });

    const rotation = svgDoc.GetRotation();
    this.SetDimensionLinesVisibility(svgDoc, false);

    const previousFrame = $.extend(true, {}, this.Frame);
    const newFrame = $.extend(true, {}, newSize);
    const adjustedFrame = $.extend(true, {}, newSize);
    const offset = T3Gv.opt.svgDoc.CalculateRotatedOffsetForResize(previousFrame, newFrame, rotation);

    if (this.StyleRecord.Line.BThick && this.polylist == null) {
      Utils2.InflateRect(adjustedFrame, this.StyleRecord.Line.BThick, this.StyleRecord.Line.BThick);
    }

    svgDoc.SetSize(adjustedFrame.width, adjustedFrame.height);
    svgDoc.SetPos(adjustedFrame.x + offset.x, adjustedFrame.y + offset.y);

    const shapeElement = svgDoc.GetElementById(OptConstant.SVGElementClass.Shape);
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

    const slopElement = svgDoc.GetElementById(OptConstant.SVGElementClass.Slop);
    if (slopElement) {
      slopElement.SetPoints(points);
      slopElement.SetSize(adjustedFrame.width, adjustedFrame.height);
    }

    // if (this.GetTable(false)) {
    //   T3Gv.opt.Table_ResizeSVGTableObject(svgDoc, this, newSize, true);
    // }

    const hatchElement = svgDoc.GetElementById(OptConstant.SVGElementClass.Hatch);
    if (hatchElement) {
      hatchElement.SetPoints(points);
      hatchElement.SetSize(newSize.width, newSize.height);
    }

    svgDoc.SetRotation(rotation);
    this.UpdateDimensionLines(svgDoc);
    UIUtil.UpdateDisplayCoordinates(newSize, null, null, this);

    T3Util.Log('S.Polygon: ResizeInTextEdit output:', offset);
    return offset;
  }

  GetTargetPoints(target, hookFlags, objectID) {
    T3Util.Log('S.Polygon: GetTargetPoints input:', { target, hookFlags, objectID });

    const targetPoints = [];
    const defaultPoints = [
      { x: OptConstant.Common.DimMax / 2, y: 0 },
      { x: OptConstant.Common.DimMax, y: OptConstant.Common.DimMax / 2 },
      { x: OptConstant.Common.DimMax / 2, y: OptConstant.Common.DimMax },
      { x: 0, y: OptConstant.Common.DimMax / 2 }
    ];

    const isContinuousConnection = this.flags & NvConstant.ObjFlags.ContConn && target !== null && (hookFlags & NvConstant.HookFlags.LcNoContinuous) === 0;
    const hasConnectPoints = this.flags & NvConstant.ObjFlags.UseConnect && this.ConnectPoints;
    // const table = this.GetTable(false);
    // const hasTableRows = this.hookflags & NvConstant.HookFlags.LcTableRows && table;
    // const isNoTableLink = !hasTableRows && (this.flags & NvConstant.ObjFlags.NoTableLink);

    let tableTargetPoint = {};
    let foundTableTarget = false;
    const dimension = OptConstant.Common.DimMax;

    if (objectID >= 0) {
      const object = DataUtil.GetObjectPtr(objectID, false);
    }

    if (foundTableTarget) {
      targetPoints.push(tableTargetPoint);
      T3Util.Log('S.Polygon: GetTargetPoints output:', targetPoints);
      return targetPoints;
    }

    if (isContinuousConnection) {
      const continuousPoints = this.PolyGetTargets(target, hookFlags, this.Frame);
      T3Util.Log('S.Polygon: GetTargetPoints output:', continuousPoints);
      return continuousPoints;
    }

    if (hasConnectPoints /*|| hasTableRows*/) {
      const connectPoints = hasConnectPoints ? this.ConnectPoints : T3Gv.opt.Table_GetRowConnectPoints(this, table);
      const deepCopiedPoints = Utils1.DeepCopy(connectPoints);
      T3Util.Log('S.Polygon: GetTargetPoints output:', deepCopiedPoints);
      return deepCopiedPoints;
    }

    T3Util.Log('S.Polygon: GetTargetPoints output:', defaultPoints);
    return defaultPoints;
  }

  ExtendLines() {
    // T3Util.Log('S.Polygon: ExtendLines input:', { table: this.GetTable(false) });

    // // const table = this.GetTable(false);
    // // if (table) {
    // //   T3Gv.opt.Table_ExtendLines(this, table);
    // // }

    // T3Util.Log('S.Polygon: ExtendLines output:', { table });
  }

  // ExtendCell(columnIndex, rowIndex, extendValue) {
  //   T3Util.Log('S.Polygon: ExtendCell input:', { columnIndex, rowIndex, extendValue });

  //   const table = this.GetTable(false);
  //   if (table) {
  //     const extendedCells = T3Gv.opt.Table_ExtendCell(this, table, columnIndex, rowIndex, extendValue);
  //     if (extendedCells) {
  //       const svgFrame = this.GetSVGFrame(this.Frame);
  //       const offsetX = this.inside.x - svgFrame.x;
  //       const offsetY = this.inside.y - svgFrame.y;

  //       if (offsetX || offsetY) {
  //         for (let i = 0; i < extendedCells.length; i++) {
  //           extendedCells[i].x += offsetX;
  //           extendedCells[i].y += offsetY;
  //         }
  //       }
  //       T3Util.Log('S.Polygon: ExtendCell output:', extendedCells);
  //       return extendedCells;
  //     }
  //   }
  //   T3Util.Log('S.Polygon: ExtendCell output: null');
  //   return null;
  // }

  GetPerimeterPoints(event, pointsArray, hookType, rotateFlag, tableID, additionalParams) {
    T3Util.Log('S.Polygon: GetPerimeterPoints input:', { event, pointsArray, hookType, rotateFlag, tableID, additionalParams });

    let intersectionCount, rotatedPoints, perimeterPoints = [], tempPoints = [], intersectionPoints = {}, defaultPoint = [0, 0];
    const dimension = OptConstant.Common.DimMax;

    if (pointsArray.length === 1 && pointsArray[0].y === -OptConstant.AStyles.CoManager && this.IsCoManager(intersectionPoints)) {
      perimeterPoints.push(new Point(intersectionPoints.x, intersectionPoints.y));
      if (pointsArray[0].id != null) {
        perimeterPoints[0].id = pointsArray[0].id;
      }
      T3Util.Log('S.Polygon: GetPerimeterPoints output:', perimeterPoints);
      return perimeterPoints;
    }

    if (hookType === OptConstant.HookPts.KAT || hookType === OptConstant.HookPts.KATD) {
      perimeterPoints = this.BaseDrawingObject_GetPerimPts(event, pointsArray, hookType, false, tableID);
      T3Util.Log('S.Polygon: GetPerimeterPoints output:', perimeterPoints);
      return perimeterPoints;
    }

    // const table = this.GetTable(false);
    // if (tableID != null && table) {
    //   const tablePerimeterPoints = T3Gv.opt.Table_GetPerimPts(this, table, tableID, pointsArray);
    //   if (tablePerimeterPoints) {
    //     perimeterPoints = tablePerimeterPoints;
    //     if (!rotateFlag) {
    //       rotatedPoints = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
    //       Utils3.RotatePointsAboutCenter(this.Frame, rotatedPoints, perimeterPoints);
    //     }
    //     T3Util.Log('S.Polygon: GetPerimeterPoints output:', perimeterPoints);
    //     return perimeterPoints;
    //   }
    // }

    const pointsLength = pointsArray.length;
    const useConnectFlag = this.flags & NvConstant.ObjFlags.UseConnect;
    // const tableRowsFlag = this.hookflags & NvConstant.HookFlags.LcTableRows && table;

    if (useConnectFlag /*|| tableRowsFlag*/) {
      for (let i = 0; i < pointsLength; i++) {
        perimeterPoints[i] = { x: 0, y: 0, id: 0 };
        perimeterPoints[i].x = pointsArray[i].x / dimension * this.Frame.width + this.Frame.x;
        perimeterPoints[i].y = pointsArray[i].y / dimension * this.Frame.height + this.Frame.y;
        if (pointsArray[i].id != null) {
          perimeterPoints[i].id = pointsArray[i].id;
        }
      }
    } else {
      if (this.flags & NvConstant.ObjFlags.ContConn && !T3Gv.opt.fromOverlayLayer) {
        perimeterPoints = this.BaseDrawingObject_GetPerimPts(event, pointsArray, hookType, rotateFlag, tableID, additionalParams);
        T3Util.Log('S.Polygon: GetPerimeterPoints output:', perimeterPoints);
        return perimeterPoints;
      }

      perimeterPoints = this.BaseDrawingObject_GetPerimPts(event, pointsArray, hookType, true, tableID, additionalParams);
      const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, false, null);
      const polyPointsLength = polyPoints.length;

      if (!Utils2.EqualPt(polyPoints[0], polyPoints[polyPointsLength - 1])) {
        polyPoints.push(new Point(polyPoints[0].x, polyPoints[0].y));
      }

      for (let i = 0; i < pointsLength; i++) {
        if (pointsArray[i].x < dimension / 4) {
          intersectionCount = PolyUtil.PolyGetIntersect(polyPoints, perimeterPoints[i].y, defaultPoint, null, false);
          if (intersectionCount) {
            perimeterPoints[i].x = defaultPoint[0];
            if (intersectionCount > 1 && defaultPoint[1] < perimeterPoints[i].x) {
              perimeterPoints[i].x = defaultPoint[1];
            }
          }
        } else if (pointsArray[i].x > 3 * dimension / 4) {
          intersectionCount = PolyUtil.PolyGetIntersect(polyPoints, perimeterPoints[i].y, defaultPoint, null, false);
          if (intersectionCount) {
            perimeterPoints[i].x = defaultPoint[0];
            if (intersectionCount > 1 && defaultPoint[1] > perimeterPoints[i].x) {
              perimeterPoints[i].x = defaultPoint[1];
            }
          }
        } else if (pointsArray[i].y < dimension / 4) {
          intersectionCount = PolyUtil.PolyGetIntersect(polyPoints, perimeterPoints[i].x, defaultPoint, null, true);
          if (intersectionCount) {
            perimeterPoints[i].y = defaultPoint[0];
            if (intersectionCount > 1 && defaultPoint[1] < perimeterPoints[i].y) {
              perimeterPoints[i].y = defaultPoint[1];
            }
          }
        } else if (pointsArray[i].y > 3 * dimension / 4) {
          intersectionCount = PolyUtil.PolyGetIntersect(polyPoints, perimeterPoints[i].x, defaultPoint, null, true);
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
      rotatedPoints = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotatedPoints, perimeterPoints);
    }

    T3Util.Log('S.Polygon: GetPerimeterPoints output:', perimeterPoints);
    return perimeterPoints;
  }

  BaseDrawingObject_GetPerimPts(event, pointsArray, hookType, rotateFlag, tableID, additionalParams) {
    T3Util.Log('S.Polygon: BaseDrawingObject_GetPerimPts input:', { event, pointsArray, hookType, rotateFlag, tableID, additionalParams });

    const perimeterPoints = [];
    const pointsCount = pointsArray.length;
    const triangleShapeType = PolygonConstant.ShapeTypes.TRIANGLE;
    const dimension = OptConstant.Common.DimMax;

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
      const rotationAngle = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationAngle, perimeterPoints);
    }

    T3Util.Log('S.Polygon: BaseDrawingObject_GetPerimPts output:', perimeterPoints);
    return perimeterPoints;
  }

  GetPolyPoints(numPoints, includeFrameOffset, inflate, adjustForLineThickness, additionalParams) {
    T3Util.Log('S.Polygon: GetPolyPoints input:', { numPoints, includeFrameOffset, inflate, adjustForLineThickness, additionalParams });

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

    T3Util.Log('S.Polygon: GetPolyPoints output:', pointsArray);
    return pointsArray;
  }

  SetShapeIndent(isIndentNeeded) {
    T3Util.Log('S.Polygon: SetShapeIndent input:', { isIndentNeeded });

    let width, height, leftIndentRatio = 1, rightIndentRatio = 1, topIndentRatio = 1, bottomIndentRatio = 1;
    let polygonPoints = [], indentValues = {};

    width = this.inside.width;
    height = this.inside.height;

    if (this.NeedsSIndentCount) {
      polygonPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, false, false, null);
      indentValues = TextUtil.GuessTextIndents(polygonPoints, this.Frame);
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

    T3Util.Log('S.Polygon: SetShapeIndent output:', {
      left: this.tindent.left,
      top: this.tindent.top,
      right: this.tindent.right,
      bottom: this.tindent.bottom
    });
  }

  WriteShapeData(outputStream, context) {
    T3Util.Log('S.Polygon: WriteShapeData input:', { outputStream, context });

    return;

    let vertexCount, width, height, polyId, vertexX, vertexY, polySegment;
    if (this.dataclass && this.dataclass === PolygonConstant.ShapeTypes.POLYGON) {
      if (this.polylist) {
        Instance.Shape.PolyLine.prototype.WriteShapeData.call(this, outputStream, context, true);
      } else {
        let code = ShapeUtil.WriteCode(outputStream, DSConstant.OpNameCode.cDrawPoly);
        vertexCount = this.VertexArray.length;
        width = ShapeUtil.ToSDWinCoords(this.Frame.width, context.coordScaleFactor);
        height = ShapeUtil.ToSDWinCoords(this.Frame.height, context.coordScaleFactor);
        polyId = context.WriteBlocks ? this.BlockID : context.polyid++;

        let polyListStruct;
        if (context.WriteWin32) {
          polyListStruct = {
            InstID: polyId,
            n: vertexCount,
            dim: { x: 0, y: 0 },
            flags: DSConstant.PolyListFlags.FreeHand,
            ldim: { x: width, y: height }
          };
          outputStream.writeStruct(DSConstant.PolyListStruct20, polyListStruct);
        } else {
          polyListStruct = {
            InstID: polyId,
            n: vertexCount,
            flags: DSConstant.PolyListFlags.FreeHand,
            ldim: { x: width, y: height }
          };
          outputStream.writeStruct(DSConstant.PolyListStruct24, polyListStruct);
        }
        ShapeUtil.WriteLength(outputStream, code);

        for (let i = 0; i < vertexCount; i++) {
          vertexX = this.VertexArray[i].x * width;
          vertexY = this.VertexArray[i].y * height;
          polySegment = {
            otype: NvConstant.FNObjectTypes.SED_LineD,
            dataclass: 0,
            ShortRef: 0,
            param: 0,
            pt: { x: 0, y: 0 },
            lpt: { x: vertexX, y: vertexY },
            dimDeflection: 0
          };
          code = ShapeUtil.WriteCode(outputStream, DSConstant.OpNameCode.cDrawPolySeg);
          outputStream.writeStruct(DSConstant.PolySegStruct, polySegment);
          ShapeUtil.WriteLength(outputStream, code);
        }
        outputStream.writeUint16(DSConstant.OpNameCode.cDrawPolyEnd);
      }
    }
    super.WriteShapeData(outputStream, context);

    T3Util.Log('S.Polygon: WriteShapeData output:', { outputStream, context });
  }

  Flip(flipType) {
    T3Util.Log('S.Polygon: Flip input:', { flipType });

    let shouldUpdate = true;
    const shapeTypes = PolygonConstant.ShapeTypes;
    const dimension = OptConstant.Common.DimMax;

    this.VertexArray = ToolActUtil.FlipVertexArray(this.VertexArray, flipType);

    if (this.polylist) {
      Instance.Shape.PolyLine.prototype.Flip.call(this, flipType);
    }

    if (flipType & OptConstant.ExtraFlags.FlipVert && this.dataclass != null) {
      switch (this.dataclass) {
        case shapeTypes.ARROW_TOP:
          this.dataclass = shapeTypes.ARROW_BOTTOM;
          break;
        case shapeTypes.ARROW_BOTTOM:
          this.dataclass = shapeTypes.ARROW_TOP;
          break;
        case shapeTypes.TRIANGLE:
          this.dataclass = shapeTypes.TRIANGLE_BOTTOM;
          break;
        case shapeTypes.TRIANGLE_BOTTOM:
          this.dataclass = shapeTypes.TRIANGLE;
          break;
        case shapeTypes.TRAPEZOID:
          this.dataclass = shapeTypes.TRAPEZOID_BOTTOM;
          break;
        case shapeTypes.TRAPEZOID_BOTTOM:
          this.dataclass = shapeTypes.TRAPEZOID;
          break;
        case shapeTypes.POLYGON:
        case shapeTypes.MEASURE_AREA:
          shouldUpdate = false;
          break;
        default:
          this.extraflags = Utils2.SetFlag(
            this.extraflags,
            OptConstant.ExtraFlags.FlipVert,
            !(this.extraflags & OptConstant.ExtraFlags.FlipVert)
          );
          shouldUpdate = false;
      }

      if (shouldUpdate && this.flags & NvConstant.ObjFlags.UseConnect && this.ConnectPoints) {
        for (let i = 0; i < this.ConnectPoints.length; i++) {
          this.ConnectPoints[i].y = dimension - this.ConnectPoints[i].y;
        }
      }
    }

    if (flipType & OptConstant.ExtraFlags.FlipHoriz && this.dataclass != null) {
      switch (this.dataclass) {
        case shapeTypes.ARROW_LEFT:
          this.dataclass = shapeTypes.ARROW_RIGHT;
          break;
        case shapeTypes.ARROW_RIGHT:
          this.dataclass = shapeTypes.ARROW_LEFT;
          break;
        case shapeTypes.POLYGON:
        case shapeTypes.MEASURE_AREA:
          shouldUpdate = false;
          break;
        default:
          this.extraflags = Utils2.SetFlag(
            this.extraflags,
            OptConstant.ExtraFlags.FlipHoriz,
            !(this.extraflags & OptConstant.ExtraFlags.FlipHoriz)
          );
          shouldUpdate = false;
      }

      if (shouldUpdate && this.flags & NvConstant.ObjFlags.UseConnect && this.ConnectPoints) {
        for (let i = 0; i < this.ConnectPoints.length; i++) {
          this.ConnectPoints[i].x = dimension - this.ConnectPoints[i].x;
        }
      }
    }

    OptCMUtil.SetLinkFlag(
      this.BlockID,
      DSConstant.LinkFlags.Move | DSConstant.LinkFlags.Change
    );

    if (this.hooks.length) {
      OptCMUtil.SetLinkFlag(this.hooks[0].objid, DSConstant.LinkFlags.Move);
    }

    this.NeedsSIndentCount = true;
    this.UpdateFrame(this.Frame);
    this.Resize(
      T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID),
      this.Frame,
      this
    );

    T3Util.Log('S.Polygon: Flip output:', { flipType });
  }

  RegenerateVectors(width, height) {
    T3Util.Log('S.Polygon: RegenerateVectors input:', { width, height });

    let radius, adjustedWidth, adjustedHeight, vectors = null;
    let shapeParam = this.shapeparam;
    const shapeType = this.dataclass;

    switch (shapeType) {
      case PolygonConstant.ShapeTypes.PARALLELOGRAM:
        vectors = PolygonUtil.generateParallelogram(this.Frame, shapeParam);
        break;
      case PolygonConstant.ShapeTypes.TERMINAL:
        vectors = PolygonUtil.generateTerminal(this.Frame, shapeParam);
        break;
      case PolygonConstant.ShapeTypes.PENTAGON:
        radius = width / 2;
        shapeParam = width / 2 * (shapeParam / radius);
        vectors = PolygonUtil.generatePentagon(this.Frame, shapeParam);
        break;
      case PolygonConstant.ShapeTypes.PENTAGON_LEFT:
        radius = height / 2;
        shapeParam = height / 2 * (shapeParam / radius);
        vectors = PolygonUtil.generatePentagonLeft(this.Frame, shapeParam);
        break;
      case PolygonConstant.ShapeTypes.HEXAGON:
        radius = height / 2;
        shapeParam = height / 2 * (shapeParam / radius);
        vectors = PolygonUtil.generateHexagon(this.Frame, shapeParam);
        break;
      case PolygonConstant.ShapeTypes.OCTAGON:
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
        vectors = PolygonUtil.generateOctagon(this.Frame, shapeParam, adjustedWidth);
        break;
      case PolygonConstant.ShapeTypes.ARROW_RIGHT:
        vectors = PolygonUtil.generateRightArrow(this.Frame, shapeParam);
        break;
      case PolygonConstant.ShapeTypes.ARROW_LEFT:
        vectors = PolygonUtil.generateLeftArrow(this.Frame, shapeParam);
        break;
      case PolygonConstant.ShapeTypes.ARROW_TOP:
        vectors = PolygonUtil.generateTopArrow(this.Frame, shapeParam);
        break;
      case PolygonConstant.ShapeTypes.ARROW_BOTTOM:
        vectors = PolygonUtil.generateBottomArrow(this.Frame, shapeParam);
        break;
      case PolygonConstant.ShapeTypes.TRAPEZOID:
        vectors = PolygonUtil.generateTrapezoid(this.Frame, shapeParam);
        break;
      case PolygonConstant.ShapeTypes.TRAPEZOID_BOTTOM:
        vectors = PolygonUtil.generateTrapezoidDown(this.Frame, shapeParam);
        break;
      case PolygonConstant.ShapeTypes.INPUT:
        vectors = PolygonUtil.generateInput(this.Frame, shapeParam);
        break;
      case PolygonConstant.ShapeTypes.STORAGE:
        adjustedHeight = shapeParam;
        vectors = PolygonUtil.generateStorage(this.Frame, shapeParam, adjustedHeight);
        break;
      case PolygonConstant.ShapeTypes.DELAY:
        vectors = PolygonUtil.generateDelay(this.Frame, shapeParam);
        break;
      case PolygonConstant.ShapeTypes.DISPLAY:
        vectors = PolygonUtil.generateDisplay(this.Frame, shapeParam);
        break;
    }

    const extraFlags = this.extraflags;
    if (extraFlags & (OptConstant.ExtraFlags.FlipHoriz | OptConstant.ExtraFlags.FlipVert) && vectors) {
      vectors = ToolActUtil.FlipVertexArray(vectors, extraFlags);
    }

    T3Util.Log('S.Polygon: RegenerateVectors output:', vectors);
    return vectors;
  }

  GetParabolaAdjustmentPoint(point, adjustment) {
    T3Util.Log('S.Polygon: GetParabolaAdjustmentPoint input:', { point, adjustment });
    const result = Instance.Shape.PolyLine.prototype.PrPolyLGetParabolaAdjPoint.call(this, point, adjustment);
    T3Util.Log('S.Polygon: GetParabolaAdjustmentPoint output:', result);
    return result;
  }

  GetArcParameters(startPoint, endPoint) {
    T3Util.Log('S.Polygon: GetArcParameters input:', { startPoint, endPoint });
    const result = Instance.Shape.PolyLine.prototype.PrPolyLGetArc.call(this, startPoint, endPoint);
    T3Util.Log('S.Polygon: GetArcParameters output:', result);
    return result;
  }

  GetParabolaParameters(event, target) {
    T3Util.Log('S.Polygon: GetParabolaParameters input:', { event, target });
    const result = Instance.Shape.PolyLine.prototype.PrPolyLGetParabolaParam.call(this, event, target);
    T3Util.Log('S.Polygon: GetParabolaParameters output:', result);
    return result;
  }

  GetArcParameters(event, target, additionalParams) {
    T3Util.Log('S.Polygon: GetArcParameters input:', { event, target, additionalParams });
    const result = Instance.Shape.PolyLine.prototype.PrPolyLGetArcParam.call(this, event, target, additionalParams);
    T3Util.Log('S.Polygon: GetArcParameters output:', result);
    return result;
  }

  GetArcQuadrant(event, target, additionalParams) {
    T3Util.Log('S.Polygon: GetArcQuadrant input:', { event, target, additionalParams });
    const result = Instance.Shape.PolyLine.prototype.PrPolyLGetArcQuadrant.call(this, event, target, additionalParams);
    T3Util.Log('S.Polygon: GetArcQuadrant output:', result);
    return result;
  }

  ScaleObject(x, y, rotation, center, scaleX, scaleY, adjustLineThickness) {
    T3Util.Log('S.Polygon: ScaleObject input:', { x, y, rotation, center, scaleX, scaleY, adjustLineThickness });

    let frameCopy = Utils1.DeepCopy(this.Frame);

    if (scaleX && scaleY) {
      frameCopy.x = x + frameCopy.x * scaleX;
      frameCopy.y = y + frameCopy.y * scaleY;
      frameCopy.width *= scaleX;
      frameCopy.height *= scaleY;
    }

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
    }

    if (rotation) {
      const centerPoint = {
        x: frameCopy.x + frameCopy.width / 2,
        y: frameCopy.y + frameCopy.height / 2
      };
      const rotationRadians = 2 * Math.PI * (rotation / 360);
      const rotatedPoint = T3Gv.opt.RotatePointAroundPoint(center, centerPoint, rotationRadians);
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

    T3Util.Log('S.Polygon: ScaleObject output:', { frameCopy, regeneratedVectors });
  }

  UpdateSecondaryDimensions(svgDoc, dimensions, polyPoints) {
    T3Util.Log('S.Polygon: UpdateSecondaryDimensions input:', { svgDoc, dimensions, polyPoints });

    let pointsArray = [];
    let pointsCount = 0;

    if (
      (this.Dimensions & NvConstant.DimensionFlags.Always ||
        this.Dimensions & NvConstant.DimensionFlags.Select) &&
      this.Dimensions & NvConstant.DimensionFlags.ShowLineAngles &&
      this.polylist
    ) {
      pointsArray = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, true, false, null);
      pointsCount = pointsArray.length;

      for (let i = 1; i < pointsCount; i++) {
        this.DrawDimensionAngle(svgDoc, dimensions, i, pointsArray);
      }
    }

    T3Util.Log('S.Polygon: UpdateSecondaryDimensions output:', { pointsArray, pointsCount });
  }

  SetSegmentAngle(segmentIndex, angle, additionalParams) {
    T3Util.Log('S.Polygon: SetSegmentAngle input:', { segmentIndex, angle, additionalParams });

    T3Gv.opt.ShapeToPolyLine(this.BlockID, false, true);
    const polygonObject = DataUtil.GetObjectPtr(this.BlockID, false);
    polygonObject.SetSegmentAngle(segmentIndex, angle, additionalParams);
    T3Gv.opt.PolyLineToShape(this.BlockID);

    T3Util.Log('S.Polygon: SetSegmentAngle output:', { segmentIndex, angle, additionalParams });
  }

  DimensionLineDeflectionAdjust(event, target, angle, radius, index) {
    T3Util.Log('S.Polygon: DimensionLineDeflectionAdjust input:', { event, target, angle, radius, index });

    if (!this.polylist) {
      const result = Instance.Shape.BaseShape.prototype.DimensionLineDeflectionAdjust.call(this, event, target, angle, radius, index);
      T3Util.Log('S.Polygon: DimensionLineDeflectionAdjust output:', result);
      return result;
    }

    T3Gv.opt.ShapeToPolyLine(this.BlockID, false, true);
    const polygonObject = DataUtil.GetObjectPtr(this.BlockID, false);
    polygonObject.DimensionLineDeflectionAdjust(event, target, angle, radius, index);
    T3Gv.opt.PolyLineToShape(this.BlockID);

    T3Util.Log('S.Polygon: DimensionLineDeflectionAdjust output: completed');
  }

  GetDimensionDeflectionValue(segmentIndex) {
    T3Util.Log('S.Polygon: GetDimensionDeflectionValue input:', { segmentIndex });

    if (this.polylist) {
      if (!this.polylist.segs || this.polylist.segs.length === 0 || segmentIndex < 0 || segmentIndex >= this.polylist.segs.length) {
        T3Util.Log('S.Polygon: GetDimensionDeflectionValue output: undefined');
        return undefined;
      }
      const deflectionValue = this.polylist.segs[segmentIndex].dimDeflection;
      T3Util.Log('S.Polygon: GetDimensionDeflectionValue output:', deflectionValue);
      return deflectionValue;
    } else {
      const deflectionValue = Instance.Shape.BaseShape.prototype.GetDimensionDeflectionValue.call(this, segmentIndex);
      T3Util.Log('S.Polygon: GetDimensionDeflectionValue output:', deflectionValue);
      return deflectionValue;
    }
  }

  UpdateDimensionFromTextObj(textObj, textData) {
    T3Util.Log('S.Polygon: UpdateDimensionFromTextObj input:', { textObj, textData });

    T3Gv.stdObj.PreserveBlock(this.BlockID);

    let text, userData;
    if (textData) {
      text = textData.text;
      userData = textData.userData;
    } else {
      text = textObj.GetText();
      userData = textObj.GetUserData();
    }

    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);

    if (userData.angleChange) {
      this.UpdateLineAngleDimensionFromText(svgElement, text, userData);
      DataUtil.AddToDirtyList(this.BlockID);
      if (this.Frame.x < 0 || this.Frame.y < 0) {
        T3Gv.opt.ScrollObjectIntoView(this.BlockID, false);
      }
      DrawUtil.CompleteOperation(null);
      T3Util.Log('S.Polygon: UpdateDimensionFromTextObj output: angleChange handled');
      return;
    }

    if (this.polylist && (this.extraflags & OptConstant.ExtraFlags.SideKnobs) > 0) {
      T3Gv.opt.ShapeToPolyLine(this.BlockID, false, true);
      DataUtil.GetObjectPtr(this.BlockID, false).UpdateDimensionFromText(svgElement, text, userData);
      T3Gv.opt.PolyLineToShape(this.BlockID);
    } else {
      Instance.Shape.BaseShape.prototype.UpdateDimensionFromTextObj.call(this, textObj, textData);
    }

    T3Util.Log('S.Polygon: UpdateDimensionFromTextObj output: dimension updated');
  }

  GetDimensionPoints() {
    T3Util.Log('S.Polygon: GetDimensionPoints input');

    let dimensionPoints;
    if (this.polylist && (this.extraflags & OptConstant.ExtraFlags.SideKnobs) > 0) {
      let deepCopiedShape = Utils1.DeepCopy(this);
      deepCopiedShape = T3Gv.opt.ShapeToPolyLine(this.BlockID, false, true, deepCopiedShape);
      dimensionPoints = deepCopiedShape.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, true, false, null);
    } else {
      dimensionPoints = Instance.Shape.BaseShape.prototype.GetDimensionPoints.call(this);
    }

    T3Util.Log('S.Polygon: GetDimensionPoints output:', dimensionPoints);
    return dimensionPoints;
  }

  GetPolyRectangularInfo() {
    T3Util.Log('S.Polygon: GetPolyRectangularInfo input');

    let widthDimension, heightDimension, angle, points = [];
    if (!this.polylist) return null;

    points = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, true, false, null);
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

    angle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(points[0], points[1]);
    if (angle < Math.PI / 4 || angle > 1.5 * Math.PI || (angle > 0.75 * Math.PI && angle < 1.25 * Math.PI)) {
      widthDimension = 1;
      heightDimension = 2;
    } else {
      widthDimension = 2;
      heightDimension = 1;
    }

    const result = { wdDim: widthDimension, htDim: heightDimension };
    T3Util.Log('S.Polygon: GetPolyRectangularInfo output:', result);
    return result;
  }

  GetDimensionFloatingPointValue(dimensionType) {
    T3Util.Log('S.Polygon: GetDimensionFloatingPointValue input:', { dimensionType });

    let dimensionValue = 0;

    if (!this.polylist) {
      T3Util.Log('S.Polygon: GetDimensionFloatingPointValue output: null (no polylist)');
      return null;
    }

    if (!(this.rflags & NvConstant.FloatingPointDim.Width || this.rflags & NvConstant.FloatingPointDim.Height)) {
      T3Util.Log('S.Polygon: GetDimensionFloatingPointValue output: null (no floating point dimensions)');
      return null;
    }

    const polyRectInfo = this.GetPolyRectangularInfo();
    if (!polyRectInfo) {
      T3Util.Log('S.Polygon: GetDimensionFloatingPointValue output: null (no poly rectangular info)');
      return null;
    }

    if (polyRectInfo.wdDim === dimensionType || polyRectInfo.wdDim + 2 === dimensionType) {
      if (this.rflags & NvConstant.FloatingPointDim.Width) {
        dimensionValue = this.GetDimensionLengthFromValue(this.rwd);
        const result = RulerUtil.GetLengthInRulerUnits(dimensionValue);
        T3Util.Log('S.Polygon: GetDimensionFloatingPointValue output:', result);
        return result;
      }
    } else if ((polyRectInfo.htDim === dimensionType || polyRectInfo.htDim + 2 === dimensionType) && this.rflags & NvConstant.FloatingPointDim.Height) {
      dimensionValue = this.GetDimensionLengthFromValue(this.rht);
      const result = RulerUtil.GetLengthInRulerUnits(dimensionValue);
      T3Util.Log('S.Polygon: GetDimensionFloatingPointValue output:', result);
      return result;
    }

    T3Util.Log('S.Polygon: GetDimensionFloatingPointValue output: null');
    return null;
  }

  IsTextFrameOverlap(textFrame, rotationAngle) {
    T3Util.Log('S.Polygon: IsTextFrameOverlap input:', { textFrame, rotationAngle });

    if (!this.polylist) {
      T3Util.Log('S.Polygon: IsTextFrameOverlap output: false (no polylist)');
      return false;
    }

    const polygonPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, true, false, null);
    const adjustedAngle = 360 - rotationAngle;
    const radians = 2 * Math.PI * (adjustedAngle / 360);
    Utils3.RotatePointsAboutCenter(this.Frame, -radians, polygonPoints);
    const isOverlap = Utils2.IsFrameCornersInPoly(polygonPoints, textFrame);

    T3Util.Log('S.Polygon: IsTextFrameOverlap output:', isOverlap);
    return isOverlap;
  }
}

export default Polygon;
