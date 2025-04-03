

import Rect from './S.Rect'
import Utils1 from '../Util/Utils1';
import Utils2 from "../Util/Utils2";
import T3Gv from '../Data/T3Gv'
import NvConstant from '../Data/Constant/NvConstant'
import ContainerListShape from '../Model/ContainerListShape'
import Instance from '../Data/Instance/Instance';
import Point from '../Model/Point';
import PolygonConstant from '../Opt/Polygon/PolygonConstant';
import DSConstant from '../Opt/DS/DSConstant';
import OptConstant from '../Data/Constant/OptConstant';
import CursorConstant from '../Data/Constant/CursorConstant';
import T3Util from '../Util/T3Util';
import DataUtil from '../Opt/Data/DataUtil';
import OptCMUtil from '../Opt/Opt/OptCMUtil';
import DrawUtil from '../Opt/Opt/DrawUtil';
import HookUtil from '../Opt/Opt/HookUtil';
import TextUtil from '../Opt/Opt/TextUtil';

/**
 * A shape container that manages collections of child shapes in various layout arrangements.
 *
 * @extends Rect
 * @class
 * @description
 * ShapeContainer acts as a parent container for organizing and managing groups of shapes in
 * different layout configurations. It provides advanced layout management for HVAC components
 * with support for:
 *
 * - Grid-based layouts with automatic spacing and alignment
 * - Row and column arrangements with configurable wrapping
 * - Sparse layouts where shapes can be positioned at specific grid coordinates
 * - Dynamic resizing and repositioning of child elements
 * - Container-to-container connections with proper z-index handling
 *
 * The container automatically manages the positioning of child shapes and can adjust its size
 * to accommodate its contents. It supports both direct shape attachment and grid-based placement,
 * and provides facilities for hit testing, hooking points, and container-specific connection handling.
 *
 * When shapes are added to a container, they become "container children" and their positions
 * are managed by the container's layout system. The ShapeContainer supports double-click
 * operations for sparse layouts, which enables quick addition or manipulation of child shapes.
 *
 * @example
 * // Create a new shape container with a sparse grid layout
 * const containerOptions = {
 *   ContainerList: {
 *     flags: NvConstant.ContainerListFlags.Sparse,
 *     nacross: 3,
 *     ndown: 2,
 *     VerticalSpacing: 10,
 *     HorizontalSpacing: 10
 *   }
 * };
 * const container = new ShapeContainer(containerOptions);
 */
class ShapeContainer extends Rect {

  public ContainerList: any;
  public zListIndex: any;

  /**
   * Creates a new ShapeContainer instance which serves as a container for other shapes
   * ShapeContainer manages layout arrangements of child shapes in grid, row, or column format
   *
   * @param containerOptions - Configuration options for the shape container
   */
  constructor(containerOptions: any) {
    T3Util.Log("= S.ShapeContainer constructor - Input:", containerOptions);

    // Initialize base container options
    containerOptions = containerOptions || {};
    containerOptions.ShapeType = OptConstant.ShapeType.Rect;

    // Call parent constructor
    super(containerOptions);

    // Set container-specific properties
    this.dataclass = containerOptions.dataclass || PolygonConstant.ShapeTypes.RECTANGLE;
    this.ContainerList = containerOptions.ContainerList || new Instance.Shape.ContainerList();
    this.objecttype = NvConstant.FNObjectTypes.ShapeContainer;
    this.nativeDataArrayBuffer = containerOptions.nativeDataArrayBuffer || null;
    this.SymbolData = containerOptions.SymbolData || null;

    T3Util.Log("= S.ShapeContainer constructor - Output:", {
      ShapeType: containerOptions.ShapeType,
      dataclass: this.dataclass,
      ContainerList: this.ContainerList,
      objecttype: this.objecttype,
      nativeDataArrayBuffer: this.nativeDataArrayBuffer,
      SymbolData: this.SymbolData
    });
  }

  /**
   * Determines whether a shape can be added to this container based on container rules
   * This method checks if the given shape is compatible with the container's settings,
   * such as allowing only containers or non-containers, and adjusts hook points as needed.
   *
   * @param shapeToCheck - The shape object to evaluate for container compatibility
   * @param hookPoint - Optional hook point that will be modified based on container arrangement
   * @returns Boolean indicating whether the shape can be added to this container
   */
  IsShapeContainer(shapeToCheck: any, hookPoint?: any): boolean {
    T3Util.Log("= S.ShapeContainer IsShapeContainer - Input:", { shapeToCheck, hookPoint });

    const containerFlags = NvConstant.ContainerListFlags;

    // Reject null shapes
    if (shapeToCheck == null) {
      T3Util.Log("= S.ShapeContainer IsShapeContainer - Output:", false);
      return false;
    }

    // Reject shapes that already have a parent frame
    if (
      shapeToCheck.ParentFrameID >= 0 &&
      DataUtil.GetObjectPtr(shapeToCheck.ParentFrameID, false)
    ) {
      T3Util.Log("= S.ShapeContainer IsShapeContainer - Output:", false);
      return false;
    }

    // // Reject swimlanes
    // if (shapeToCheck.IsSwimlane()) {
    //   T3Util.Log("= S.ShapeContainer IsShapeContainer - Output:", false);
    //   return false;
    // }

    // Reject text-only objects
    if (shapeToCheck.flags & NvConstant.ObjFlags.TextOnly) {
      T3Util.Log("= S.ShapeContainer IsShapeContainer - Output:", false);
      return false;
    }

    // Process shapes that are of SHAPE drawing object type
    if (shapeToCheck.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
      const containerList = this.ContainerList;
      const isSparse = containerList.flags & containerFlags.Sparse;

      // Adjust hook point if provided
      if (hookPoint) {
        if (isSparse || containerList.Arrangement !== NvConstant.ContainerListArrangements.Row) {
          hookPoint.id = OptConstant.HookPts.KCT;
        } else {
          hookPoint.x -= shapeToCheck.Frame.width / 2;
          hookPoint.y += shapeToCheck.Frame.height / 2;
          hookPoint.id = OptConstant.HookPts.KCL;
        }
      }

      let isCompatible: boolean;

      // Check container-specific compatibility flags
      if (containerList.flags & containerFlags.AllowOnlyContainers) {
        // Only allow other containers or tables with shape containers
        isCompatible = (
          shapeToCheck instanceof ShapeContainer/* ||
          shapeToCheck.objecttype === NvConstant.FNObjectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER*/
        );
      } else if (containerList.flags & containerFlags.AllowOnlyNonContainers) {
        // Only allow non-container shapes
        isCompatible = (
          !(shapeToCheck instanceof ShapeContainer) /*&&
          shapeToCheck.objecttype !== NvConstant.FNObjectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER*/
        );
      } else {
        // Allow all shape types
        isCompatible = true;
      }

      T3Util.Log("= S.ShapeContainer IsShapeContainer - Output:", isCompatible);
      return isCompatible;
    }

    T3Util.Log("= S.ShapeContainer IsShapeContainer - Output:", false);
    return false;
  }

  /**
   * Creates highlight information when connecting to this container
   * This method generates connection highlight data for visual feedback when
   * the user is connecting objects to this container
   *
   * @param connectEvent - The connection event data
   * @param targetObject - Target object for the connection
   * @param highlightOptions - Options for configuring the highlights
   * @param sourceShape - The source shape initiating the connection
   * @param connectionType - Type of connection being made
   * @param additionalContext - Additional contextual data
   * @returns Object containing highlight information
   */
  CreateConnectHilites(
    connectEvent: any,
    targetObject: any,
    highlightOptions: any,
    sourceShape: any,
    connectionType: any,
    additionalContext: any
  ) {
    T3Util.Log("= S.ShapeContainer CreateConnectHilites - Input:", {
      connectEvent,
      targetObject,
      highlightOptions,
      sourceShape,
      connectionType,
      additionalContext
    });

    const hiliteInfo = {
      active: true,
      eventDetails: connectEvent,
      targetDetails: targetObject,
      optionsPassed: highlightOptions,
      additionalData: {
        param1: sourceShape,
        param2: connectionType,
        param3: additionalContext
      }
    };

    T3Util.Log("= S.ShapeContainer CreateConnectHilites - Output:", hiliteInfo);
    return hiliteInfo;
  }

  /**
   * Determines the best hook point for connecting to this container
   * This method evaluates the current hook and event data to find
   * the optimal connection point for the shape
   *
   * @param connectionEvent - The connection event data
   * @param proposedHook - The currently proposed hook point
   * @param contextData - Additional context data for hook evaluation
   * @returns The best hook point for connection
   */
  GetBestHook(connectionEvent: any, proposedHook: any, contextData: any): any {
    T3Util.Log("= S.ShapeContainer GetBestHook - Input:", { connectionEvent, proposedHook, contextData });
    const bestHook = proposedHook;
    T3Util.Log("= S.ShapeContainer GetBestHook - Output:", bestHook);
    return bestHook;
  }

  /**
   * Gets the target points for hooking items to this container
   * This method calculates valid connection points based on the container arrangement
   * (sparse grid, column, or row) and returns points that can be used for shape connections
   *
   * @param options - Optional configuration options
   * @param filterCriteria - Optional criteria for filtering target points
   * @param renderContext - Optional rendering context information
   * @returns Array of connection point coordinates
   */
  GetTargetPoints(options?: any, filterCriteria?: any, renderContext?: any): Point[] {
    T3Util.Log("= S.ShapeContainer GetTargetPoints - Input:", { options, filterCriteria, renderContext });

    const resultPoints: Point[] = [];
    const containerList = this.ContainerList;
    const list = containerList.List;
    const listLength = list.length;
    const standardDimension = OptConstant.Common.DimMax;
    let defaultPoint = { x: standardDimension / 2, y: 0 };
    const isSparse = containerList.flags & NvConstant.ContainerListFlags.Sparse;
    const containerFrame = this.PrGetContainerFrame().frame;
    // const isContainerInCell = T3Gv.opt.ContainerIsInCell(this);
    const frameWidth = containerFrame.width;
    let numDown = containerList.ndown;
    let numAcross = containerList.nacross;

    // // Adjust grid dimensions if container is in cell and in sparse mode
    // if (isContainerInCell && isSparse) {
    //   let heightDifference = containerFrame.height - containerList.height;
    //   let additionalRows = Math.floor(heightDifference / containerList.childheight);
    //   if (additionalRows < 0) {
    //     additionalRows = 0;
    //   }
    //   numDown += additionalRows;

    //   let widthDifference = containerFrame.width - containerList.width;
    //   let additionalCols = Math.floor(widthDifference / containerList.childwidth);
    //   if (additionalCols < 0) {
    //     additionalCols = 0;
    //   }
    //   numAcross += additionalCols;
    // }

    // Process for sparse container list
    if (isSparse) {
      for (let row = 0; row <= numDown; row++) {
        for (let col = -1; col <= numAcross; col++) {
          defaultPoint = new Point(col, row);
          resultPoints.push(defaultPoint);
        }
      }
      T3Util.Log("= S.ShapeContainer GetTargetPoints - Output:", resultPoints);
      return resultPoints;
    }

    // Process for non-sparse container list
    if (containerList.Arrangement === NvConstant.ContainerListArrangements.Column) {
      if (listLength > 0) {
        defaultPoint.x = (list[0].pt.x / frameWidth) * standardDimension;
      }
      resultPoints.push(defaultPoint);
      for (let idx = 0; idx < listLength; idx++) {
        const computedX = (list[idx].pt.x / frameWidth) * standardDimension;
        const newPoint = new Point(computedX, idx + 1);
        resultPoints.push(newPoint);
      }
    } else {
      defaultPoint.x = containerList.HorizontalSpacing;
      defaultPoint.y = 0;
      if (listLength > 0) {
        defaultPoint.x = 0;
      }
      resultPoints.push(defaultPoint);
      for (let idx = 0; idx < listLength; idx++) {
        const computedY = (list[idx].pt.y / frameWidth) * standardDimension;
        const newPoint = new Point(computedY, idx + 1);
        resultPoints.push(newPoint);
      }
    }

    T3Util.Log("= S.ShapeContainer GetTargetPoints - Output:", resultPoints);
    return resultPoints;
  }

  /**
   * Gets the container's frame rectangle and vertical starting position
   * This method returns the container's base rectangle and calculates
   * the starting Y position for child element layout
   *
   * @returns Object containing the frame rectangle and starting Y position
   */
  PrGetContainerFrame(): { frame: any; StartY: number } {
    T3Util.Log("= S.ShapeContainer PrGetContainerFrame - Input:", { trect: this.trect });
    const frameRectangle = Utils1.DeepCopy(this.trect);
    const verticalStartPosition = 0;
    const result = { frame: frameRectangle, StartY: verticalStartPosition };
    T3Util.Log("= S.ShapeContainer PrGetContainerFrame - Output:", result);
    return result;
  }

  /**
   * Calculates the expanded hit test frame for interaction detection
   * This method determines the area around the container that should respond
   * to mouse events, including extra padding for sparse layouts or based on
   * the target shape's dimensions
   *
   * @param targetShape - The shape being tested for hit detection
   * @returns Rectangle defining the hit test area
   */
  GetHitTestFrame(targetShape: any) {
    T3Util.Log("= S.ShapeContainer GetHitTestFrame - Input:", { target: targetShape });
    const hitTestFrame: any = {};
    const containerList = this.ContainerList;
    const isSparseLayout = containerList.flags & NvConstant.ContainerListFlags.Sparse;

    // Copy base rectangle
    Utils2.CopyRect(hitTestFrame, this.r);

    if (targetShape && targetShape.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
      if (isSparseLayout) {
        hitTestFrame.width += containerList.HorizontalSpacing + containerList.childwidth;
        hitTestFrame.x -= containerList.HorizontalSpacing + containerList.childwidth / 2;
      } else {
        hitTestFrame.width += containerList.HorizontalSpacing + targetShape.Frame.width / 2;
      }
      hitTestFrame.height += 2 * containerList.VerticalSpacing;
    }

    T3Util.Log("= S.ShapeContainer GetHitTestFrame - Output:", hitTestFrame);
    return hitTestFrame;
  }

  /**
   * Determines if double-clicking is allowed on this container
   * This method checks if the container has a sparse layout configuration,
   * which enables double-click interactions for adding or modifying content
   *
   * @returns Boolean indicating whether double-click is permitted
   */
  AllowDoubleClick(): boolean {
    T3Util.Log("= S.ShapeContainer AllowDoubleClick - Input:", {});
    const containerListFlags = this.ContainerList.flags;
    const isDoubleClickAllowed = !!(containerListFlags & NvConstant.ContainerListFlags.Sparse);
    T3Util.Log("= S.ShapeContainer AllowDoubleClick - Output:", isDoubleClickAllowed);
    return isDoubleClickAllowed;
  }

  DoubleClick(event: any, target: any) {
    T3Util.Log("= S.ShapeContainer DoubleClick - Input:", { event, target });

    const containerList = this.ContainerList;
    const list = containerList.List;
    const listLength = list.length;
    const isSparse = containerList.flags & NvConstant.ContainerListFlags.Sparse;
    let rowIndex = 0;
    let colIndex = 0;
    let someVariable: any = null;
    let foundSlot: boolean;
    let newPoint: any;

    const computeWidth = (col: number): number => {
      let maxWidth = 0;
      for (let row = 0; row < containerList.ndown; row++) {
        const index = row * containerList.nacross + col;
        let widthValue: number;
        if (list[index].id >= 0) {
          const obj = DataUtil.GetObjectPtr(list[index].id, false);
          if (!obj) continue;
          widthValue = obj.Frame.width;
        } else {
          widthValue = containerList.childwidth;
        }
        if (widthValue > maxWidth) {
          maxWidth = widthValue;
        }
      }
      return maxWidth + 2 * containerList.HorizontalSpacing;
    };

    // if (!target) {
    //   const ctrlKey = event.gesture.srcEvent.ctrlKey;
    //   const shiftKey = event.gesture.srcEvent.shiftKey;
    //   // const containerInCell = T3Gv.opt.ContainerIsInCell(this);
    //   // if (containerInCell && (shiftKey || ctrlKey)) {
    //   //   T3Util.Log("= S.ShapeContainer DoubleClick - Detected container in cell with modifier keys.");
    //   //   T3Gv.opt.Table_SetupAction(event, containerInCell.obj.BlockID, OptConstant.Common.TableCellHit, null);
    //   //   T3Util.Log("= S.ShapeContainer DoubleClick - Output: action triggered via Table_SetupAction");
    //   //   return;
    //   // }
    // }

    if (isSparse) {
      if (target) {
        rowIndex = target.Data.row;
        colIndex = target.Data.col;
        foundSlot = true;
        newPoint = Utils1.DeepCopy(target.Data.theNewPoint);
      } else {
        foundSlot = false;
        newPoint = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
        newPoint = Utils1.DeepCopy(newPoint);

        // Adjust newPoint relative to the container frame
        newPoint.x -= this.Frame.x;
        newPoint.y -= this.Frame.y;

        if (
          (this.TextFlags & NvConstant.TextFlags.AttachA ||
            this.TextFlags & NvConstant.TextFlags.AttachB) &&
          (newPoint.y < 10 || newPoint.y > this.Frame.height - 10)
        ) {
          const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
          T3Util.Log("= S.ShapeContainer DoubleClick - Output: activating text edit.");
          TextUtil.ActivateTextEdit(svgElement.svgObj.SDGObj, event);
          return;
        }

        // Determine target point based on perimetric points
        const targetPoints = this.GetTargetPoints();
        const perimPoints = this.GetPerimPts(null, targetPoints, null, true, null, 1);
        let bestDistance = Number.MAX_VALUE;
        let bestIndex = -1;
        for (let i = 0; i < perimPoints.length; i++) {
          const diffX = perimPoints[i].x - newPoint.x;
          const diffY = perimPoints[i].y - newPoint.y;
          const distance = diffX * diffX + diffY * diffY;
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
          }
        }
        if (bestIndex >= 0) {
          colIndex = targetPoints[bestIndex].x;
          rowIndex = targetPoints[bestIndex].y;
          foundSlot = true;
        } else {
          // Fallback - determine row based on y-coordinate
          let foundRow = false;
          for (let r = 1; r < containerList.ndown; r++) {
            const idx = r * containerList.nacross;
            if (list[idx].pt.y > newPoint.y) {
              rowIndex = r - 1;
              foundRow = true;
              break;
            }
          }
          if (!foundRow) {
            rowIndex = containerList.ndown - 1;
          }

          // Determine column based on x-coordinate
          let foundCol = false;
          for (let c = 1; c < containerList.nacross; c++) {
            if (list[c].pt.x > newPoint.x) {
              foundCol = true;
              const computedWidth = computeWidth(c - 1);
              const centerX = list[c - 1].pt.x + computedWidth / 2;
              colIndex = newPoint.x < centerX ? c - 1 : c;
              break;
            }
          }
          if (!foundCol) {
            colIndex = containerList.nacross - 1;
          }
          foundSlot = list[containerList.nacross * rowIndex + colIndex].id < 0;
        }
      }

      if (foundSlot) {
        let closest: number;
        if (target) {
          closest = target.Data.closest;
        } else {
          const computeClosest = (row: number, col: number): number => {
            let closestId = -1;
            if (containerList.Arrangement === NvConstant.ContainerListArrangements.Column) {
              if (col <= containerList.nacross && (col = containerList.nacross - 1) < 0) return -1;
              for (let r = 0; r < containerList.ndown; r++) {
                const idx = r * containerList.nacross + col;
                if (idx < list.length && list[idx].id >= 0) {
                  if (!(r < row)) {
                    if (closestId < 0) return list[idx].id;
                    return closestId;
                  }
                  closestId = list[idx].id;
                }
              }
            } else {
              for (let c = 0; c < containerList.nacross; c++) {
                if (row <= containerList.ndown && (row = containerList.ndown - 1) < 0) return -1;
                const idx = row * containerList.nacross + c;
                if (idx < list.length && list[idx].id >= 0) {
                  if (!(c < col)) {
                    if (closestId < 0) return list[idx].id;
                    return closestId;
                  }
                  closestId = list[idx].id;
                }
              }
            }
            if (closestId < 0) {
              for (let i = 0; i < listLength; i++) {
                if (list[i].id >= 0) return list[i].id;
              }
            }
            return closestId;
          };

          closest = computeClosest(rowIndex, colIndex);
        }

        if (closest < 0) {
          someVariable = target ? target.Data.SymbolID : "currentSymbolId";
          const newId = T3Gv.baseOpt.AddSymbol(someVariable);
          const newObj = DataUtil.GetObjectPtr(newId, true);
          const childWidth = containerList.childwidth;
          const childHeight = containerList.childheight;
          const newFrame = {
            x: newPoint.x,
            y: newPoint.y,
            width: childWidth,
            height: childHeight,
          };
          newObj.UpdateFrame(newFrame);
          newObj.sizedim.width = childWidth;
          newObj.sizedim.height = childHeight;
          DataUtil.AddToDirtyList(newId);
        } else {
          const duplicatedId = T3Gv.baseOpt.DuplicateShape(closest, true, false);
          DataUtil.AddToDirtyList(duplicatedId);
        }

        const hookLocation = { x: colIndex, y: rowIndex };
        const hookPointID = OptConstant.HookPts.KCT;
        const createdIds: any[] = [];
        HookUtil.UpdateHook(closest < 0 ? someVariable : closest, -1, this.BlockID, hookPointID, hookLocation, null);
        createdIds.push(closest < 0 ? someVariable : closest);
        OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.Move);
        DrawUtil.CompleteOperation(createdIds);
      }
    }

    T3Util.Log("= S.ShapeContainer DoubleClick - Output:", { event, target });
  }

  /**
   * Determines whether the ShapeContainer can be rotated
   * This method always returns true to indicate that shape containers cannot be rotated,
   * as rotation could disrupt the layout of child elements and cause unexpected behavior
   *
   * @returns Boolean value that is always true, indicating rotation is not allowed
   */
  NoRotate(): boolean {
    T3Util.Log("= S.ShapeContainer NoRotate - Input:", {});
    const isRotationDisabled = true;
    T3Util.Log("= S.ShapeContainer NoRotate - Output:", isRotationDisabled);
    return isRotationDisabled;
  }

  /**
   * Determines if field data can be attached to this ShapeContainer
   * This method checks whether the container is inside a table cell, as containers
   * within cells have special layout constraints that may conflict with field data
   *
   * @returns Boolean indicating whether field data can be attached to this container
   */
  FieldDataAllowed(): boolean {
    T3Util.Log("= S.ShapeContainer FieldDataAllowed - Input:", { thisContext: this });
    const isFieldDataAllowed = true;// !T3Gv.opt.ContainerIsInCell(this);
    T3Util.Log("= S.ShapeContainer FieldDataAllowed - Output:", isFieldDataAllowed);
    return isFieldDataAllowed;
  }

  /**
   * Calculates perimeter points for the container to support connection points
   * This method determines the valid connection points on the container's perimeter
   * based on the container's layout type (sparse grid, column, or row), and is critical
   * for supporting shape connections and positioning child elements
   *
   * @param hookPoint - The hook point for connection
   * @param targetPoints - Array of target points to compute perimeter points for
   * @param hookType - Type of hook as defined in OptConstant.HookPts
   * @param considerLayout - Whether to consider container's layout when calculating points
   * @param additionalContext - Additional contextual data for computation
   * @param pointIndex - Index used for specific point calculations
   * @returns Array of computed perimeter points that can be used for connections
   */
  GetPerimPts(
    hookPoint: any,
    targetPoints: Point[],
    hookType: number,
    considerLayout: any,
    additionalContext: any,
    pointIndex: number
  ): Point[] {
    T3Util.Log("= S.ShapeContainer GetPerimPts - Input:", {
      hookPoint,
      targetPoints,
      hookType,
      considerLayout,
      additionalContext,
      pointIndex
    });

    const resultPoints: Point[] = [];
    const containerList = this.ContainerList;
    const containerItems = containerList.List;
    const containerItemCount = containerItems.length;
    const standardDimension = OptConstant.Common.DimMax;
    const containerArrangement = NvConstant.ContainerListArrangements;
    const isSparse = !!(containerList.flags & NvConstant.ContainerListFlags.Sparse);

    // Ensure formatting if a single point and specific flag is set
    if (targetPoints.length === 1 && (this.flags & NvConstant.ObjFlags.Obj1)) {
      this.PrFormat();
    }

    const containerFrameData = this.PrGetContainerFrame();
    const containerFrame = containerFrameData.frame;
    let verticalOffset = containerList.VerticalSpacing + containerFrameData.StartY;
    // const isInCell = T3Gv.opt.ContainerIsInCell(this);

    // Case 1: Single point and negative index - handle simplified perimeter point
    if (targetPoints.length === 1 && pointIndex < 0) {
      let xCoordinate: number, yCoordinate: number;
      if (hookType === OptConstant.HookPts.KCTL) {
        xCoordinate = containerFrame.x;
        yCoordinate = containerFrame.y;
      } else if (hookType === OptConstant.HookPts.KCL) {
        xCoordinate = containerFrame.x;
        yCoordinate = containerFrame.y + containerFrame.height / 2;
      } else {
        xCoordinate = containerFrame.x + containerFrame.width / 2;
        yCoordinate = containerFrame.y;
      }
      const computedPoint = new Point(xCoordinate, yCoordinate);
      if (targetPoints[0].id != null) {
        computedPoint.id = targetPoints[0].id;
      }
      resultPoints.push(computedPoint);
      T3Util.Log("= S.ShapeContainer GetPerimPts - Output (single point):", resultPoints);
      return resultPoints;
    }

    // Case 2: Sparse container list with a valid index - handle grid-based layout
    if (isSparse && pointIndex >= 0) {
      for (let i = 0; i < targetPoints.length; i++) {
        let xCoordinate = 0;
        let yCoordinate = 0;
        let listIndex: number;

        // Handle points within container's defined rows
        if (targetPoints[i].y < containerList.ndown) {
          if (targetPoints[i].x < 0) {
            // Point is to the left of the grid
            listIndex = targetPoints[i].y * containerList.nacross;
            yCoordinate = containerItems[listIndex].pt.y;
            xCoordinate = false/*isInCell*/
              ? containerList.HorizontalSpacing / 2
              : -containerList.childwidth / 2;
          } else if (targetPoints[i].x < containerList.nacross) {
            // Point is within the grid
            listIndex = targetPoints[i].y * containerList.nacross + targetPoints[i].x;
            yCoordinate = containerItems[listIndex].pt.y;
            xCoordinate = containerItems[listIndex].pt.x;
          } else {
            // Point is to the right of the grid
            listIndex = targetPoints[i].y * containerList.nacross + containerList.nacross - 1;
            yCoordinate = containerItems[listIndex].pt.y;
            xCoordinate = containerList.width +
              (targetPoints[i].x - containerList.nacross) * containerList.childwidth +
              containerList.childwidth / 2;

            if (/*isInCell && */xCoordinate > containerFrame.width - containerList.HorizontalSpacing / 2) {
              xCoordinate = containerFrame.width - containerList.HorizontalSpacing / 2;
            }
          }
        } else {
          // Handle points beyond container's defined rows
          yCoordinate = containerList.height +
            (targetPoints[i].y - containerList.ndown) * containerList.childheight +
            containerList.VerticalSpacing;

          if (/*isInCell &&*/ yCoordinate > containerFrame.height - containerList.VerticalSpacing / 2) {
            yCoordinate = containerFrame.height - containerList.VerticalSpacing / 2;
          }

          if (targetPoints[i].x < 0) {
            // Point is to the left of the extended grid
            listIndex = targetPoints[i].y * containerList.nacross;
            xCoordinate = false/* isInCell*/
              ? containerList.HorizontalSpacing / 2
              : -containerList.childwidth / 2;
          } else if (targetPoints[i].x < containerList.nacross) {
            // Point is within the extended grid horizontally
            listIndex = targetPoints[i].y >= containerList.ndown
              ? (containerList.ndown - 1) * containerList.nacross + targetPoints[i].x
              : (targetPoints[i].y - 1) * containerList.nacross + targetPoints[i].x;
            xCoordinate = containerItems[listIndex].pt.x;
          } else {
            // Point is to the right of the extended grid
            xCoordinate = containerList.width +
              (targetPoints[i].x - containerList.nacross) * containerList.childwidth +
              containerList.childwidth / 2;

            if (/*isInCell && */xCoordinate > containerFrame.width - containerList.HorizontalSpacing / 2) {
              xCoordinate = containerFrame.width - containerList.HorizontalSpacing / 2;
            }
          }
        }

        const computedPoint = new Point(xCoordinate + containerFrame.x, yCoordinate + containerFrame.y);
        resultPoints.push(computedPoint);
      }

      T3Util.Log("= S.ShapeContainer GetPerimPts - Output (sparse):", resultPoints);
      return resultPoints;
    }

    // Case 3: Default processing for non-sparse container list (column or row layout)
    for (let i = 0; i < targetPoints.length; i++) {
      let itemIndex = targetPoints[i].y;
      let xCoordinate = 0;
      let yCoordinate = 0;

      // Initial coordinate calculation based on arrangement type
      if (containerList.Arrangement === containerArrangement.Column) {
        xCoordinate = (targetPoints[i].x / standardDimension) * containerFrame.width;
      } else {
        yCoordinate = (targetPoints[i].x / standardDimension) * containerFrame.height;
      }

      // Determine point position based on list index
      if (itemIndex < containerItemCount) {
        // Point corresponds to an existing container item
        yCoordinate = containerItems[itemIndex].pt.y;
        xCoordinate = containerItems[itemIndex].pt.x;
      } else if (containerItemCount === 0) {
        // Container is empty, use default position
        if (containerList.Arrangement === containerArrangement.Column) {
          yCoordinate = containerList.VerticalSpacing;
        } else {
          xCoordinate = containerList.HorizontalSpacing;
          yCoordinate = this.Frame.height / 2;
        }
      } else {
        // Point is beyond existing items, calculate extension position
        itemIndex = containerItemCount - 1;
        const childObject = DataUtil.GetObjectPtr(containerItems[itemIndex].id, false);

        if (containerList.Arrangement === containerArrangement.Row) {
          // Row arrangement - extend horizontally
          xCoordinate = containerList.width;
          yCoordinate = containerItems[itemIndex].pt.y;

          if (childObject) {
            const computedX = containerItems[itemIndex].pt.x + childObject.Frame.width + containerList.HorizontalSpacing;
            xCoordinate = computedX > containerList.width ? containerList.width : computedX;
          }
        } else {
          // Column arrangement - extend vertically
          yCoordinate = containerList.height;

          if (childObject) {
            const computedY = containerItems[itemIndex].pt.y + childObject.Frame.height + containerList.VerticalSpacing;
            yCoordinate = computedY;
          }

          xCoordinate = containerItems[itemIndex].pt.x;
        }
      }

      // Special adjustment for SED_KAT hook type
      if (hookType === OptConstant.HookPts.KAT) {
        yCoordinate = 0;
      }

      const computedPoint = new Point(xCoordinate + containerFrame.x, yCoordinate + containerFrame.y);

      // Preserve any ID from the target point
      if (targetPoints[i].id != null) {
        computedPoint.id = targetPoints[i].id;
      }

      // Adjust offset when multiple points are present to avoid overlaps
      if (targetPoints.length > 1) {
        if (containerList.Arrangement === containerArrangement.Column) {
          computedPoint.y -= containerList.VerticalSpacing / 2;
        } else {
          computedPoint.x -= containerList.HorizontalSpacing / 2;
        }
      }

      resultPoints.push(computedPoint);
    }

    T3Util.Log("= S.ShapeContainer GetPerimPts - Output:", resultPoints);
    return resultPoints;
  }

  /**
   * Formats the layout of shapes within the container
   * This method handles different container arrangements including sparse grids, columns, and rows.
   * It calculates positions and dimensions for all child objects, and updates the container size.
   * @param skipSizeUpdate - If true, only calculates positions without updating container size
   */
  PrFormat(skipSizeUpdate?: any) {
    T3Util.Log("= S.ShapeContainer PrFormat - Input:", { skipSizeUpdate });

    // Get references to container properties
    const containerList = this.ContainerList;
    const listItems = containerList.List;
    const totalItems = listItems.length;
    let horizontalPosition = 0;
    const verticalSpacing = containerList.VerticalSpacing;
    let currentX = 0;
    let currentY = verticalSpacing;
    const arrangementTypes = NvConstant.ContainerListArrangements;
    const containerInstance = this;
    let headerSpacing = 0;
    const isSparseLayout = Boolean(containerList.flags & NvConstant.ContainerListFlags.Sparse);
    const isLeftAligned = Boolean(containerList.flags & NvConstant.ContainerListFlags.LeftChanged);
    const isTopAligned = Boolean(containerList.flags & NvConstant.ContainerListFlags.TopChanged);
    let parentCellDimensions = null;

    // Clear change flags
    containerList.flags = Utils2.SetFlag(containerList.flags, NvConstant.ContainerListFlags.LeftChanged, false);
    containerList.flags = Utils2.SetFlag(containerList.flags, NvConstant.ContainerListFlags.TopChanged, false);

    /**
     * Formats objects in a vertical column arrangement
     * @param startIndex - Index of the first item to format
     * @param startX - X position to start the column
     * @param referenceDimensions - Optional dimensions to use for sizing
     * @returns Object containing the new start index, column width, and final Y position
     */
    const formatColumn = function (startIndex: number, startX: number, referenceDimensions: { width: number; height: number } | null) {
      let currentIndex = startIndex;
      let runningY = containerList.VerticalSpacing + headerSpacing;
      let wrapCount = containerList.Wrap;
      let itemsFormatted = 0;
      let maxWidth = 0;

      // Process each item in the column
      for (; currentIndex < totalItems; currentIndex++) {
        runningY += listItems[currentIndex].extra;
        listItems[currentIndex].pt = { x: startX, y: runningY };
        const childObject = DataUtil.GetObjectPtr(listItems[currentIndex].id, false);

        if (childObject) {
          // Update position if needed
          if (childObject.Frame.y !== runningY) {
            OptCMUtil.SetLinkFlag(childObject.BlockID, DSConstant.LinkFlags.Move);
          }

          // Track maximum width for the column
          if (childObject.Frame.width > maxWidth) {
            maxWidth = childObject.Frame.width;
          }

          // Calculate next Y position
          runningY += childObject.Frame.height + containerList.VerticalSpacing;
          itemsFormatted++;
        }

        // Check if we've reached wrap limit
        if (wrapCount > 0 && itemsFormatted >= wrapCount) {
          break;
        }
      }

      // Ensure minimum width
      maxWidth += 2 * containerList.HorizontalSpacing;
      if (maxWidth < containerList.MinWidth) {
        maxWidth = containerList.MinWidth;
      }

      // Use reference width if available and larger
      let finalColumnWidth = maxWidth;
      if (referenceDimensions && finalColumnWidth < referenceDimensions.width) {
        finalColumnWidth = referenceDimensions.width;
      }

      // Adjust child positions to center them horizontally in column
      let needsUpdate = false;
      for (let j = startIndex; j < currentIndex; j++) {
        listItems[j].pt.x += finalColumnWidth / 2;
        const currentObject = DataUtil.GetObjectPtr(listItems[j].id, false);
        if (
          currentObject &&
          (currentObject.Frame.x + currentObject.Frame.width / 2) !== (containerInstance.Frame.x + listItems[j].pt.x)
        ) {
          OptCMUtil.SetLinkFlag(currentObject.BlockID, DSConstant.LinkFlags.Move);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        OptCMUtil.SetLinkFlag(containerInstance.BlockID, DSConstant.LinkFlags.Move);
      }

      return { start: currentIndex, colwidth: finalColumnWidth, top: runningY };
    };

    /**
     * Formats objects in a horizontal row arrangement
     * @param startIndex - Index of the first item to format
     * @param basePoint - Base point for positioning
     * @param startY - Y position to start the row
     * @param referenceDimensions - Optional dimensions to use for sizing
     * @returns Object containing the new start index, row height, and final X position
     */
    const formatRow = function (startIndex: number, basePoint: any, startY: number, referenceDimensions: { width: number; height: number } | null) {
      let currentIndex = startIndex;
      let runningX = containerList.HorizontalSpacing;
      let wrapCount = containerList.Wrap;
      let itemsFormatted = 0;
      let maxHeight = 0;
      let currentBaseY = startY;

      // Process each item in the row
      for (; currentIndex < totalItems; currentIndex++) {
        runningX += listItems[currentIndex].extra;
        listItems[currentIndex].pt = { x: runningX, y: currentBaseY };
        const childObject = DataUtil.GetObjectPtr(listItems[currentIndex].id, false);
        let objectWidth: number, objectHeight: number;

        if (childObject) {
          // Update position if needed
          if (childObject.Frame.y / 2 !== currentBaseY) {
            OptCMUtil.SetLinkFlag(childObject.BlockID, DSConstant.LinkFlags.Move);
          }
          objectWidth = childObject.Frame.width;
          objectHeight = childObject.Frame.height;
        } else {
          // Use default dimensions if no object
          objectWidth = containerList.childwidth;
          objectHeight = containerList.childheight;
        }

        // Track maximum height for the row
        if (objectHeight > maxHeight) {
          maxHeight = objectHeight;
        }

        // Calculate next X position
        runningX += objectWidth + containerList.HorizontalSpacing;
        itemsFormatted++;

        // Check if we've reached wrap limit
        if (wrapCount > 0 && itemsFormatted >= wrapCount) {
          break;
        }
      }

      // Ensure minimum height
      maxHeight += 2 * containerList.VerticalSpacing;
      if (maxHeight < containerList.MinHeight) {
        maxHeight = containerList.MinHeight;
      }

      // Use reference height if available and larger
      let finalRowHeight = maxHeight;
      if (referenceDimensions && finalRowHeight < referenceDimensions.height) {
        finalRowHeight = referenceDimensions.height;
      }

      // Adjust child positions to center them vertically in row
      let needsUpdate = false;
      for (let j = startIndex; j < currentIndex; j++) {
        listItems[j].pt.y += finalRowHeight / 2;
        const currentObject = DataUtil.GetObjectPtr(listItems[j].id, false);
        if (
          currentObject &&
          (currentObject.Frame.y + currentObject.Frame.height / 2) !== (basePoint.y + listItems[j].pt.y)
        ) {
          OptCMUtil.SetLinkFlag(currentObject.BlockID, DSConstant.LinkFlags.Move);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        OptCMUtil.SetLinkFlag(containerInstance.BlockID, DSConstant.LinkFlags.Move);
      }

      return { start: currentIndex, rowht: finalRowHeight, left: runningX };
    };

    // // Check if container is in a table cell
    // const containerInCell = T3Gv.opt.ContainerIsInCell(this);
    // if (containerInCell) {
    //   parentCellDimensions = { width: this.trect.width, height: this.trect.height };
    // }

    // Get container frame information
    const containerFrameData = this.PrGetContainerFrame();
    const containerFrame = containerFrameData.frame;
    headerSpacing = containerFrameData.StartY;
    let currentIndex = 0;
    let baseY = containerList.VerticalSpacing + headerSpacing;
    let finalWidth = 0;
    let finalHeight = baseY;
    let formatResult: { start: number; colwidth?: number; top?: number; rowht?: number; left?: number };

    // Format based on container arrangement type
    if (isSparseLayout) {
      /**
       * Formats items in a sparse grid arrangement
       * @param startY - Y position to start the grid
       * @returns Object containing final width and height
       */
      const sparseFormatResult = (function (startY: number) {
        let currentY = startY;
        let maxColumnWidths: number[] = [];
        let maxRowHeights: number[] = [];

        // Calculate maximum dimensions for each row and column
        for (let row = 0; row < containerList.ndown; row++) {
          for (let col = 0; col < containerList.nacross; col++) {
            const idx = row * containerList.nacross + col;
            const item = containerList.List[idx];
            if (item.id == null) {
              item.id = -1;
            }
            const childObject = DataUtil.GetObjectPtr(item.id, false);
            const widthValue = childObject ? childObject.Frame.width : containerList.childwidth;
            const heightValue = childObject ? childObject.Frame.height : containerList.childheight;

            if (maxColumnWidths[col] == null || maxColumnWidths[col] < widthValue) {
              maxColumnWidths[col] = widthValue;
            }
            if (maxRowHeights[row] == null || maxRowHeights[row] < heightValue) {
              maxRowHeights[row] = heightValue;
            }
          }
        }

        // Position items in the grid
        for (let row = 0; row < containerList.ndown; row++) {
          let currentX = containerList.HorizontalSpacing;
          for (let col = 0; col < containerList.nacross; col++) {
            const idx = row * containerList.nacross + col;
            const item = containerList.List[idx];
            item.pt.x = currentX + maxColumnWidths[col] / 2;
            item.pt.y = currentY;
            currentX += maxColumnWidths[col] + containerList.HorizontalSpacing;
          }
          currentY += maxRowHeights[row] + containerList.VerticalSpacing;
        }

        return { left: currentX, top: currentY };
      })(baseY);

      finalWidth = sparseFormatResult.left;
      finalHeight = sparseFormatResult.top;
    } else {
      // Format based on arrangement type (column or row)
      switch (containerList.Arrangement) {
        case arrangementTypes.Column:
          while (currentIndex < totalItems) {
            formatResult = formatColumn(currentIndex, horizontalPosition, parentCellDimensions);
            currentIndex = formatResult.start;
            finalWidth += formatResult.colwidth!;
            horizontalPosition += formatResult.colwidth!;

            // Adjust spacing between columns
            if (currentIndex < totalItems) {
              finalWidth -= containerList.HorizontalSpacing;
              horizontalPosition -= containerList.HorizontalSpacing;
            }

            // Track maximum height
            if (formatResult.top! > finalHeight) {
              finalHeight = formatResult.top!;
            }
          }
          break;

        case arrangementTypes.Row:
          while (currentIndex < totalItems) {
            baseY -= containerList.VerticalSpacing;
            formatResult = formatRow(currentIndex, containerFrame, baseY, parentCellDimensions);
            currentIndex = formatResult.start;
            finalHeight += formatResult.rowht!;
            baseY += formatResult.rowht!;

            // Track maximum width
            if (formatResult.left! > finalWidth) {
              finalWidth = formatResult.left!;
            }
          }
          break;
      }
    }

    // Update container size if not skipped
    if (!skipSizeUpdate) {
      // Update container dimensions
      containerList.width = finalWidth;
      finalHeight += headerSpacing;
      containerList.height = finalHeight;

      // Ensure minimum dimensions
      if (finalWidth < containerList.MinWidth) {
        finalWidth = containerList.MinWidth;
      }
      if (finalHeight < containerList.MinHeight) {
        finalHeight = containerList.MinHeight;
      }

      // Calculate size changes
      let widthChange = finalWidth - containerFrame.width;
      let heightChange = finalHeight - containerFrame.height;

      // Ignore very small changes
      if (Utils2.IsEqual(heightChange, 0, 1)) {
        heightChange = 0;
      }
      if (Utils2.IsEqual(widthChange, 0, 1)) {
        widthChange = 0;
      }

      // Apply size changes and update connected objects
      let offsetX = 0, offsetY = 0;
      if (widthChange || heightChange) {
        if (widthChange) {
          containerFrame.width = finalWidth;
          offsetX = isLeftAligned ? -widthChange : widthChange;
        }
        if (heightChange) {
          containerFrame.height = finalHeight;
          offsetY = isTopAligned ? -heightChange : heightChange;
        }

        this.TRectToFrame(containerFrame, true);
        DataUtil.AddToDirtyList(this.BlockID);

        // Update connected container if present
        const connectedObject = this.hooks.length ? DataUtil.GetObjectPtr(this.hooks[0].objid, false) : null;
        if (connectedObject && connectedObject instanceof ShapeContainer) {
          connectedObject.flags = Utils2.SetFlag(connectedObject.flags, NvConstant.ObjFlags.Obj1, true);
          OptCMUtil.SetLinkFlag(connectedObject.BlockID, DSConstant.LinkFlags.Move);
        }

        // Apply offsets if needed
        if (offsetX || offsetY) {
          this.OffsetShape(offsetX, offsetY);
        }
      }

      // Clear formatting flag
      this.flags = Utils2.SetFlag(this.flags, NvConstant.ObjFlags.Obj1, false);
    }

    T3Util.Log("= S.ShapeContainer PrFormat - Output:", { ContainerList: containerList });
  }

  /**
   * Handles the connection event when this shape container connects to another object
   * This method updates the z-index of the container when it connects to another container
   * to ensure proper visual layering of connected containers
   *
   * @param connectionId - The ID of the connection event
   * @param targetObject - The target object being connected to
   * @param connectionAnchor - The anchor point for the connection
   * @param connectionReference - Reference information for the connection
   * @param additionalInfo - Additional connection information
   */
  OnConnect(connectionId: string, targetObject: any, connectionAnchor: any, connectionReference: any, additionalInfo: any): void {
    T3Util.Log("= S.ShapeContainer OnConnect - Input:", {
      connectionId,
      targetObject,
      connectionAnchor,
      connectionReference,
      additionalInfo
    });

    // When connecting to another container, ensure proper z-index ordering
    if (targetObject instanceof ShapeContainer && (this.zListIndex == null || this.zListIndex < 0)) {
      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(connectionId);
      if (svgElement) {
        // Store current index and move this container to front
        this.zListIndex = T3Gv.opt.svgObjectLayer.GetElementIndex(svgElement);
        T3Gv.opt.svgObjectLayer.MoveElementToFront(svgElement);
      }
    }

    T3Util.Log("= S.ShapeContainer OnConnect - Output:", { zListIndex: this.zListIndex });
  }

  /**
   * Gets connector information for shape adjustments
   * This method provides information about adjustment handles that appear on the container
   * based on the container's arrangement type (row or column) and adjustment flags
   *
   * @param eventData - The event data that triggered the connector info request
   * @returns Array of connector information objects or null if not applicable
   */
  PrGetShapeConnectorInfo(eventData: any) {
    T3Util.Log("= S.ShapeContainer PrGetShapeConnectorInfo - Input:", { eventData });

    const containerList = this.ContainerList;
    const isSparse = containerList.flags & NvConstant.ContainerListFlags.Sparse;
    const isAdjust = containerList.flags & NvConstant.ContainerListFlags.Adjust;
    const result: any[] = [];
    const actionTriggerType = OptConstant.ActionTriggerType;

    // Only provide connectors for non-sparse containers with the Adjust flag
    if (isSparse || !isAdjust) {
      T3Util.Log("= S.ShapeContainer PrGetShapeConnectorInfo - Output:", null);
      return null;
    }

    // Create appropriate connector based on container arrangement (row or column)
    const connectorInfo = containerList.Arrangement === NvConstant.ContainerListArrangements.Row
      ? {
        knobID: actionTriggerType.ContainerAdj,
        cursorType: CursorConstant.CursorType.RESIZE_R,
        knobData: 0,
        hook: eventData.hookpt,
        polyType: "horizontal"
      }
      : {
        knobID: actionTriggerType.ContainerAdj,
        cursorType: CursorConstant.CursorType.RESIZE_B,
        knobData: 0,
        hook: eventData.hookpt,
        polyType: "vertical"
      };

    result.push(connectorInfo);
    T3Util.Log("= S.ShapeContainer PrGetShapeConnectorInfo - Output:", result);
    return result;
  }

  /**
   * Gets a list of objects enclosed within this container
   * This method identifies and returns all objects that are considered
   * to be enclosed by this container based on specified options
   *
   * @param searchOptions - Options that control how enclosed objects are identified
   * @returns Array of enclosed object references
   */
  GetListOfEnclosedObjects(searchOptions: any): any[] {
    T3Util.Log("= S.ShapeContainer GetListOfEnclosedObjects - Input:", searchOptions);

    const enclosedObjects: any[] = [];
    // Implementation would typically populate this array with enclosed objects
    // based on container layout and child elements

    T3Util.Log("= S.ShapeContainer GetListOfEnclosedObjects - Output:", enclosedObjects);
    return enclosedObjects;
  }

  /**
   * Changes the target shape's position within this container
   * This method handles adding, removing, or repositioning shapes within the container grid.
   * It supports both sparse grid layouts and sequential arrangements, adjusting the container
   * dimensions as needed when shapes are added or removed.
   *
   * @param changeEvent - The event that triggered the target change
   * @param targetShapeId - ID of the shape being added, removed, or repositioned
   * @param connectionAnchor - Connection anchor point information
   * @param boundingRect - Rectangle defining the shape's boundaries
   * @param gridPosition - Desired position in the container's grid (x,y coordinates)
   * @param shouldAttach - Whether the shape should be attached to the container
   */
  ChangeTarget(
    changeEvent: any,
    targetShapeId: number,
    connectionAnchor: any,
    boundingRect: any,
    gridPosition: { x: number; y: number },
    shouldAttach: boolean
  ) {
    T3Util.Log("= S.ShapeContainer ChangeTarget - Input:", {
      changeEvent,
      targetShapeId,
      connectionAnchor,
      boundingRect,
      gridPosition,
      shouldAttach,
    });

    const containerFlags = NvConstant.ContainerListFlags;
    // const isContainerInCell = T3Gv.opt.ContainerIsInCell(this);

    /**
     * Inserts a new shape into the container list at a specified index
     * @param shapeId - ID of the shape to insert
     * @param insertIndex - Index at which to insert the shape
     */
    const insertContainerShape = (shapeId: number, insertIndex: number) => {
      const list = currentContainerList.List;
      const listLength = list.length;
      const newShape = new ContainerListShape();
      newShape.id = shapeId;

      if (insertIndex >= listLength) {
        list.push(newShape);
      } else {
        const extraValue = list[insertIndex].extra;
        list[insertIndex].extra = 0;
        newShape.extra = extraValue;
        list.splice(insertIndex, 0, newShape);
      }
    };

    /**
     * Removes a shape from the container list by its ID
     * @param shapeId - ID of the shape to remove
     */
    const removeContainerShape = (shapeId: number) => {
      const list = currentContainerList.List;
      const listLength = list.length;
      let removeIndex = -1;

      for (let j = 0; j < listLength; j++) {
        if (list[j].id === shapeId) {
          removeIndex = j;
          break;
        }
      }

      if (removeIndex >= 0) {
        list.splice(removeIndex, 1);
      }
    };

    /**
     * Adjusts the container grid by removing empty rows and columns
     * This method optimizes the container layout by eliminating empty spaces
     * and returns the offset adjustments needed for proper positioning
     *
     * @param shapeId - ID of the shape being adjusted
     * @param position - Position in the grid where adjustment is occurring
     * @returns Object with x and y offset adjustments
     */
    const adjustContainerShapes = (shapeId: number, position: { x: number; y: number }) => {
      const container = currentContainerList;
      const list = container.List;
      let deltaX = 0;
      let deltaY = 0;
      const markCols: boolean[] = [];
      const markRows: boolean[] = [];

      // Mark rows and columns that contain shapes
      for (let row = 0; row < container.ndown; row++) {
        for (let col = 0; col < container.nacross; col++) {
          const index = container.nacross * row + col;
          const item = list[index];

          if (item.id === shapeId) {
            item.id = -1;
          }

          if (item.id >= 0) {
            markCols[col] = true;
            markRows[row] = true;
          }
        }
      }

      // Find first column with content
      let firstFullCol = -1;
      for (let col = 0; col < container.nacross; col++) {
        if (markCols[col] === true && firstFullCol < 0) {
          firstFullCol = col;
        }
      }

      // Find last column with content
      let lastFullCol = -1;
      for (let col = container.nacross - 1; col >= 0; col--) {
        if (markCols[col] === true && lastFullCol < 0) {
          lastFullCol = col;
        }
      }

      // Find first row with content
      let firstFullRow = -1;
      if (markRows[0] == null && position && position.y === 0) {
        markRows[0] = true;
      }

      for (let row = 0; row < container.ndown; row++) {
        if (markRows[row] === true && firstFullRow < 0) {
          firstFullRow = row;
        }
      }

      // Find last row with content
      let lastFullRow = -1;
      for (let row = container.ndown - 1; row >= 0; row--) {
        if (markRows[row] === true && lastFullRow < 0) {
          lastFullRow = row;
        }
      }

      // Remove empty rows after the last filled row
      for (let row = container.ndown - 1; row > lastFullRow; row--) {
        if (container.ndown > 1) {
          list.splice(row * container.nacross, container.nacross);
          container.ndown--;
        }
      }

      // Remove empty rows before the first filled row (if not in a cell)
      if (/*isContainerInCell == null*/true) {
        for (let row = firstFullRow - 1; row >= 0; row--) {
          if (container.ndown > 1) {
            list.splice(row * container.nacross, container.nacross);
            container.ndown--;
            deltaY--;
          }
        }
      }

      // Remove empty columns after the last filled column
      for (let col = container.nacross - 1; col > lastFullCol; col--) {
        if (container.nacross > 1) {
          for (let row = container.ndown - 1; row >= 0; row--) {
            list.splice(container.nacross * row + col, 1);
          }
          container.nacross--;
        }
      }

      // Remove empty columns before the first filled column (if not in a cell)
      if (/*isContainerInCell == null*/true) {
        for (let col = firstFullCol - 1; col >= 0; col--) {
          if (container.nacross > 1) {
            for (let row = container.ndown - 1; row >= 0; row--) {
              list.splice(container.nacross * row + col, 1);
            }
            container.nacross--;
            deltaX--;
          }
        }
      }

      return {
        dx: deltaX,
        dy: deltaY,
      };
    };

    // Current container list and reference to "this"
    const currentContainerList = this.ContainerList;
    let list = currentContainerList.List;
    const containerObj = this;
    const isSparse = currentContainerList.flags & NvConstant.ContainerListFlags.Sparse;

    // Find the current index of the target shape in the list
    let targetIndex = -1;
    for (let idx = 0, len = list.length; idx < len; idx++) {
      if (list[idx].id === targetShapeId) {
        targetIndex = idx;
        break;
      }
    }

    if (targetShapeId != null) {
      const targetObject = DataUtil.GetObjectPtr(targetShapeId, false);
      targetObject.OnDisconnect(targetShapeId, this);

      let targetPosition, rowIndex, dummyData;

      if (isSparse) {
        let adjustOffsets;

        if (shouldAttach) {
          // If we're attaching and the shape was already in the list, adjust container shape
          if (targetIndex >= 0) {
            adjustOffsets = adjustContainerShapes(targetShapeId, gridPosition);
            gridPosition.x += adjustOffsets.dx;
            gridPosition.y += adjustOffsets.dy;
          }

          /**
           * Adjusts the grid by inserting empty rows or columns when needed
           * @param colPosition - Desired column position
           * @param rowPosition - Desired row position
           * @returns Object containing column and row delta adjustments
           */
          const adjustGrid = ((colPosition: number, rowPosition: number) => {
            const container = currentContainerList;
            const listRef = container.List;
            let deltaCols = 0;
            let deltaRows = 0;
            let tempCounter = 0;
            const arrangements = NvConstant.ContainerListArrangements;

            /**
             * Inserts additional grid items to accommodate the new shape position
             * @param xPos - X position in grid
             * @param yPos - Y position in grid
             * @returns Object containing offset adjustments
             */
            const insertGridItems = (xPos: number, yPos: number) => {
              let colIndex: number;

              // Return offsets if negative position
              if (yPos < 0 || xPos < 0) {
                return { dx: deltaCols, dy: deltaRows };
              }

              // Handle column arrangement
              if (container.Arrangement === arrangements.Column) {
                let newCol = -1;

                // Find available empty slot in the column
                for (let row = xPos + 1; row < container.ndown; row++) {
                  const idx = row * container.nacross + yPos;
                  if (listRef[idx].id < 0 && newCol < 0) {
                    newCol = row;
                  }
                }

                // If no empty slot, add a new row
                if (newCol < 0) {
                  for (let i = 0; i < container.nacross; i++) {
                    const newShape = new ContainerListShape();
                    listRef.push(newShape);
                  }
                  container.ndown++;
                  newCol = container.ndown - 1;
                }

                // Shift objects down to make room
                for (let row = newCol; row > xPos; row--) {
                  const fromIdx = (row - 1) * container.nacross + yPos;
                  const toIdx = row * container.nacross + yPos;
                  listRef[toIdx].id = listRef[fromIdx].id;
                }

                // Clear the target position
                listRef[xPos * container.nacross + yPos].id = -1;
              }
              // Handle row arrangement
              else if (container.Arrangement === arrangements.Row) {
                let newRow = -1;

                // Find available empty slot in the row
                for (let col = yPos + 1; col < container.nacross; col++) {
                  const idx = xPos * container.nacross + col;
                  if (listRef[idx].id < 0 && newRow < 0) {
                    newRow = col;
                  }
                }

                // If no empty slot, add a new column
                if (newRow < 0) {
                  for (let r = container.ndown; r > 0; r--) {
                    const startIdx = r * container.nacross;
                    for (let i = 0; i < container.nacross; i++) {
                      const newShape = new ContainerListShape();
                      listRef.splice(startIdx, 0, newShape);
                    }
                  }
                  container.nacross++;
                  newRow = container.nacross - 1;
                }

                // Shift objects right to make room
                for (let col = newRow; col > yPos; col--) {
                  const fromIdx = xPos * container.nacross + (col - 1);
                  const toIdx = xPos * container.nacross + col;
                  listRef[toIdx].id = listRef[fromIdx].id;
                }

                // Clear the target position
                listRef[xPos * container.nacross + yPos].id = -1;
              }

              return { dx: deltaCols, dy: deltaRows };
            };

            // Check if we need to adjust the grid
            if (!(colPosition >= currentContainerList.nacross || (rowPosition >= currentContainerList.ndown && colPosition >= 0))) {
              if (rowPosition < 0 || colPosition < 0) {
                return insertGridItems(colPosition, rowPosition);
              }

              const idx = currentContainerList.nacross * rowPosition + colPosition;
              if (listRef[idx].id >= 0) {
                insertGridItems(colPosition, rowPosition);
              }
            }
          })(gridPosition.x, gridPosition.y);

          // Ensure non-negative grid positions
          if (gridPosition.y < 0) {
            gridPosition.y = 0;
          }
          if (gridPosition.x < 0) {
            gridPosition.x = 0;
          }

          /**
           * Places the target shape into the container grid at specified position
           * Expands the grid if necessary to accommodate the position
           *
           * @param shapeId - ID of the shape to place
           * @param colPosition - Column position in the grid
           * @param rowPosition - Row position in the grid
           */
          const placeTargetInGrid = (shapeId: number, colPosition: number, rowPosition: number) => {
            const container = currentContainerList;
            const listRef = container.List;

            // Add rows if needed
            if (rowPosition >= container.ndown) {
              for (let r = container.ndown; r <= rowPosition; r++) {
                for (let n = 0; n < container.nacross; n++) {
                  const newShape = new ContainerListShape();
                  listRef.push(newShape);
                }
                container.ndown = rowPosition + 1;
              }
            }

            // Add columns if needed
            if (colPosition >= container.nacross) {
              const oldNacross = container.nacross;
              for (let r = container.ndown - 1; r >= 0; r--) {
                const insertIndex = oldNacross * (r + 1);
                for (let n = oldNacross; n <= colPosition; n++) {
                  const newShape = new ContainerListShape();
                  listRef.splice(insertIndex, 0, newShape);
                }
              }
              container.nacross = colPosition + 1;
            }

            // Set the target ID at the calculated position
            const index = rowPosition * container.nacross + colPosition;
            listRef[index].id = shapeId;
          };

          placeTargetInGrid(targetShapeId, gridPosition.x, gridPosition.y);

          // Put target shape visually in front of container
          T3Gv.opt.PutInFrontofObject(containerObj.BlockID, targetShapeId);

          // Mark the target as a container child
          targetObject.moreflags = Utils2.SetFlag(
            targetObject.moreflags,
            OptConstant.ObjMoreFlags.ContainerChild,
            true
          );
        } else {
          // Remove shape from the container
          const offsets = adjustContainerShapes(targetShapeId, null);

          // Remove container child flag
          targetObject.moreflags = Utils2.SetFlag(
            targetObject.moreflags,
            OptConstant.ObjMoreFlags.ContainerChild,
            false
          );

          // Mark container for layout update
          OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.Move);
        }

        let offsetX = 0,
          offsetY = 0;

        if (shouldAttach) {
          if (targetIndex >= 0) {
            rowIndex = gridPosition.y;

            // Handle repositioning within the list
            if (rowIndex > targetIndex) {
              insertContainerShape(targetShapeId, gridPosition.y);
              removeContainerShape(targetShapeId);
            } else if (rowIndex < targetIndex) {
              removeContainerShape(targetShapeId);
              insertContainerShape(targetShapeId, rowIndex);
            } else {
              insertContainerShape(targetShapeId, gridPosition.y);
              T3Gv.opt.PutInFrontofObject(containerObj.BlockID, targetShapeId);
              targetObject.moreflags = Utils2.SetFlag(
                targetObject.moreflags,
                OptConstant.ObjMoreFlags.ContainerChild,
                true
              );
            }
          } else {
            // Remove if found in list but shouldn't be attached
            removeContainerShape(targetShapeId);
            targetObject.moreflags = Utils2.SetFlag(
              targetObject.moreflags,
              OptConstant.ObjMoreFlags.ContainerChild,
              false
            );
            OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.Move);
          }
        }

        if (isSparse) {
          /**
           * Updates hook positions for all objects in the sparse container grid
           * This ensures that each object's connection points correctly match its grid position
           */
          const updateHookPositions = () => {
            const container = currentContainerList;
            const listRef = container.List;

            for (let row = 0; row < container.ndown; row++) {
              for (let col = 0; col < container.nacross; col++) {
                const idx = row * container.nacross + col;
                const obj = DataUtil.GetObjectPtr(listRef[idx].id, false);

                if (obj && obj.hooks.length) {
                  const hook = obj.hooks[0].connect;
                  if (hook.x !== col || hook.y !== row) {
                    const objFront = DataUtil.GetObjectPtr(listRef[idx].id, true);
                    objFront.hooks[0].connect.x = col;
                    objFront.hooks[0].connect.y = row;
                  }
                }
              }
            }
          };

          updateHookPositions();
        } else {
          /**
           * Updates hook positions for objects in a sequential container list
           * In non-sparse containers, only vertical position (y) needs updating
           */
          const updateSequentialHooks = () => {
            const listRef = currentContainerList.List;

            for (let j = 0, len = listRef.length; j < len; j++) {
              const obj = DataUtil.GetObjectPtr(listRef[j].id, true);
              if (obj && obj.hooks.length) {
                obj.hooks[0].connect.y = j;
              }
            }
          };

          updateSequentialHooks();
        }

        // Format the container to update layout
        this.PrFormat();
      } else {
        // For non-sparse layout, just mark for update
        this.flags = Utils2.SetFlag(this.flags, NvConstant.ObjFlags.Obj1, true);
      }

      T3Util.Log("= S.ShapeContainer ChangeTarget - Output:", {
        containerList: this.ContainerList,
        targetShapeId,
        gridPosition,
      });
    }
  }
}

export default ShapeContainer
