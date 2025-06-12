import CursorConstant from "../../Data/Constant/CursorConstant";
import NvConstant from "../../Data/Constant/NvConstant";
import OptConstant from "../../Data/Constant/OptConstant";
import T3Gv from "../../Data/T3Gv";
import Utils1 from "../../Util/Utils1";
import Rectangle from "../../Model/Rectangle";
import Utils3 from "../../Util/Utils3";
import ObjectUtil from "../Data/ObjectUtil";
import SelectUtil from "./SelectUtil";
import Utils2 from "../../Util/Utils2";
import ToolActUtil from "./ToolActUtil";
import OptCMUtil from "./OptCMUtil";
import DrawUtil from "./DrawUtil";
import HookUtil from "./HookUtil";
import ToolUtil from "../Tool/ToolUtil";
import OptAhUtil from "./OptAhUtil";
import DSConstant from "../DS/DSConstant";


class LineDraw {

  /**
   * Creates custom action buttons for connect points
   * @param context - The drawing context/document
   * @param targetObject - The object for which to create action buttons
   * @returns Array of created action button shapes
   */
  CreateCustomActionButtons(context, targetObject) {
    console.log("T3Util: CreateCustomActionButtons input", { context, targetObject });

    const actionButtons = [];
    const useConnectPoints = targetObject.flags & NvConstant.ObjFlags.UseConnect && targetObject.ConnectPoints;
    const table = targetObject.GetTable(false);
    const useTableRows = targetObject.hookflags & NvConstant.HookFlags.LcTableRows && table;
    const dimensionMax = OptConstant.Common.DimMax;
    let connectPoints = [];

    if (useConnectPoints) {
      const rectangle = new Rectangle(0, 0, dimensionMax, dimensionMax);
      connectPoints = Utils1.DeepCopy(targetObject.ConnectPoints);
      T3Gv.opt.FlipPoints(rectangle, targetObject.extraflags, connectPoints);
    } else if (useTableRows) {
      connectPoints = T3Gv.opt.TableGetRowConnectPoints(targetObject, table);
    }

    if ((useConnectPoints || useTableRows) && (connectPoints.length <= 4 || useTableRows)) {
      for (let i = 0; i < connectPoints.length; i++) {
        const xPos = connectPoints[i].x / dimensionMax * targetObject.Frame.width;
        const yPos = connectPoints[i].y / dimensionMax * targetObject.Frame.height;
        const actionButton = this.CreateActionButton(context, xPos, yPos);

        if (actionButton) {
          actionButtons.push(actionButton);
        }
      }
    }

    console.log("T3Util: CreateCustomActionButtons output", actionButtons);
    return actionButtons;
  }

  /**
   * Creates a single action button at the specified position
   * @param context - The drawing context/document
   * @param xPosition - The x position for the button
   * @param yPosition - The y position for the button
   * @returns The created button shape or null if creation failed
   */
  CreateActionButton(context, xPosition, yPosition) {
    console.log("T3Util: CreateActionButton input", { context, xPosition, yPosition });

    const scale = context.docInfo.docToScreenScale;
    const adjustedScale = context.docInfo.docScale <= 0.5 ? scale * 2 : scale;
    const buttonSize = OptConstant.Common.ActionArrowSizeV / adjustedScale;

    const buttonShape = context.CreateShape(OptConstant.CSType.Oval);
    buttonShape.SetSize(buttonSize, buttonSize);
    buttonShape.SetPos(xPosition - buttonSize / 2, yPosition - buttonSize / 2);
    buttonShape.SetFillColor("#FFD64A");
    buttonShape.SetStrokeWidth(0);
    buttonShape.SetCursor(CursorConstant.CursorType.Cross);

    console.log("T3Util: CreateActionButton output", buttonShape);
    return buttonShape;
  }

  RotateActionButtons() {
    return true;
  }

  PrNormalizeConnect(e) {
    var t = OptConstant.Common.DimMax
      , a = Utils1.DeepCopy(e);
    return a.x < 0 ? a.x = 0 : a.x > t && (a.x = t),
      a.y < 0 ? a.y = 0 : a.y > t && (a.y = t),
      a
  }

  /**
   * Handles action click events for creating connections between objects
   * @param event - The click event
   * @param objectId - The id of the object being acted on
   * @param actionType - The type of action being performed
   */
  ActionClick(event, objectId, actionType) {
    console.log("T3Util: ActionClick input", { event, objectId, actionType });

    let posX, posY;
    const connectionPoint = { x: 0, y: 0 };
    const dimensionMax = OptConstant.Common.DimMax;
    const perimeterPoints = [];
    let offsetX = 0;
    let offsetY = 0;
    const actionArrow = OptConstant.ActionArrow;

    /**
     * Determines the direction of an action based on point position
     * @param object - The target object
     * @param point - The point coordinates
     * @returns The determined action direction
     */
    const determineActionDirection = (object, point) => {
      const adjustedPoint = {
        x: point.x,
        y: point.y
      };

      if (object.RotationAngle) {
        const rect = {
          x: 0,
          y: 0,
          width: dimensionMax,
          height: dimensionMax
        };
        const angleInRadians = -object.RotationAngle / (180 / NvConstant.Geometry.PI);
        const points = [];

        points.push(adjustedPoint);
        Utils3.RotatePointsAboutCenter(rect, angleInRadians, points);
        adjustedPoint.x = points[0].x;
        adjustedPoint.y = points[0].y;
      }

      let direction = 0;

      if (adjustedPoint.x >= 5 * dimensionMax / 6) {
        direction = actionArrow.Right;
      } else if (adjustedPoint.x < dimensionMax / 6) {
        direction = actionArrow.Left;
      } else if (adjustedPoint.y < dimensionMax / 6) {
        direction = actionArrow.Up;
      } else if (adjustedPoint.y >= 5 * dimensionMax / 6) {
        direction = actionArrow.Down;
      }

      return direction;
    };

    /**
     * Rotates a point based on the target object's rotation angle
     * @param point - The point to rotate
     */
    const rotatePoint = (point) => {
      if (point.x === dimensionMax - 5) {
        point.x = dimensionMax;
      }
      if (point.y === dimensionMax - 5) {
        point.y = dimensionMax;
      }

      const rect = {
        x: 0,
        y: 0,
        width: dimensionMax,
        height: dimensionMax
      };
      const angleInRadians = targetObject.RotationAngle / (180 / NvConstant.Geometry.PI);
      const points = [];

      points.push(point);
      Utils3.RotatePointsAboutCenter(rect, angleInRadians, points);
      point.x = points[0].x;
      point.y = points[0].y;

      if (point.x === dimensionMax) {
        point.x = dimensionMax - 5;
      }
      if (point.y === dimensionMax) {
        point.y = dimensionMax - 5;
      }
    };

    const dataBlockObject = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    const targetObject = ObjectUtil.GetObjectPtr(objectId, false);
    const useConnectPoints = targetObject.flags & NvConstant.ObjFlags.UseConnect && targetObject.ConnectPoints;
    const table = targetObject.GetTable(false);
    const useTableRows = targetObject.hookflags & NvConstant.HookFlags.LcTableRows && table;

    const allowUpdate = true;
    if (allowUpdate) {
      if (targetObject.RotationAngle) {
        switch (actionType) {
          case actionArrow.Right:
            connectionPoint.y = dimensionMax / 2;
            connectionPoint.x = dimensionMax;
            break;
          case actionArrow.Left:
            connectionPoint.y = dimensionMax / 2;
            connectionPoint.x = 0;
            break;
          case actionArrow.Down:
            connectionPoint.x = dimensionMax / 2;
            connectionPoint.y = dimensionMax;
            break;
          case actionArrow.Up:
            connectionPoint.x = dimensionMax / 2;
            connectionPoint.y = 0;
            break;
        }

        if (connectionPoint.x != null) {
          actionType = determineActionDirection(targetObject, connectionPoint);
        }
      }

      let horizontalGridSize = dataBlockObject.def.h_arraywidth;
      if (horizontalGridSize < OptConstant.Common.MinLineDrawGap) {
        horizontalGridSize = OptConstant.Common.MinLineDrawGap;
      }

      let verticalGridSize = dataBlockObject.def.v_arraywidth;
      if (verticalGridSize < OptConstant.Common.MinLineDrawGap) {
        verticalGridSize = OptConstant.Common.MinLineDrawGap;
      }

      switch (actionType) {
        case actionArrow.Right:
          connectionPoint.y = dimensionMax / 2;
          connectionPoint.x = dimensionMax - 5;
          if (targetObject.RotationAngle) {
            rotatePoint(connectionPoint);
          }
          offsetX = horizontalGridSize;
          break;
        case actionArrow.Left:
          connectionPoint.y = dimensionMax / 2;
          connectionPoint.x = 0;
          if (targetObject.RotationAngle) {
            rotatePoint(connectionPoint);
          }
          offsetX = -horizontalGridSize;
          break;
        case actionArrow.Down:
          connectionPoint.x = dimensionMax / 2;
          connectionPoint.y = dimensionMax - 5;
          if (targetObject.RotationAngle) {
            rotatePoint(connectionPoint);
          }
          offsetY = verticalGridSize;
          break;
        case actionArrow.Up:
          connectionPoint.x = dimensionMax / 2;
          connectionPoint.y = 0;
          if (targetObject.RotationAngle) {
            rotatePoint(connectionPoint);
          }
          offsetY = -verticalGridSize;
          break;
        default:
          if (actionType < actionArrow.Custom) {
            return;
          }

          const customConnectIndex = actionType - actionArrow.Custom;
          const rectangle = new Rectangle(0, 0, dimensionMax, dimensionMax);
          let connectPoints = [];

          if (useConnectPoints) {
            connectPoints = Utils1.DeepCopy(targetObject.ConnectPoints);
            T3Gv.opt.FlipPoints(rectangle, targetObject.extraflags, connectPoints);
          } else if (useTableRows) {
            connectPoints = T3Gv.opt.TableGetRowConnectPoints(targetObject, table);
            if (customConnectIndex < connectPoints.length) {
              connectionPoint.x = connectPoints[customConnectIndex].x;
              connectionPoint.y = connectPoints[customConnectIndex].y;
            }
          }

          connectionPoint.x = connectPoints[customConnectIndex].x;
          connectionPoint.y = connectPoints[customConnectIndex].y;

          const direction = determineActionDirection(targetObject, connectionPoint);
          switch (direction) {
            case actionArrow.Left:
              offsetX = -horizontalGridSize;
              break;
            case actionArrow.Right:
              offsetX = horizontalGridSize;
              break;
            case actionArrow.Up:
              offsetY = -verticalGridSize;
              break;
            case actionArrow.Down:
              offsetY = verticalGridSize;
              break;
            default:
              return;
          }

          actionType = direction;
      }

      perimeterPoints.push(connectionPoint);

      /**
       * Calculates the offset for object positioning
       * @param points - The perimeter points
       * @param object - The target object
       * @returns The calculated offset
       */
      const calculatePositionOffset = (points, object) => {
        const offset = {
          x: 0,
          y: 0
        };

        if (object.RotationAngle === 0) {
          switch (actionType) {
            case actionArrow.Right:
              offset.x = object.Frame.x + object.Frame.width - points[0].x;
              break;
            case actionArrow.Left:
              offset.x = object.Frame.x - points[0].x;
              break;
            case actionArrow.Down:
              offset.y = object.Frame.y + object.Frame.height - points[0].y;
              break;
            case actionArrow.Up:
              offset.y = object.Frame.y - points[0].y;
              break;
          }
        }

        return offset;
      };

      const perimPoints = targetObject.GetPerimPts(objectId, perimeterPoints, 1, false, null, -1);
      const positionOffset = calculatePositionOffset(perimPoints, targetObject);
      const lineObjects = SelectUtil.FindAllChildObjects(objectId, OptConstant.DrawObjectBaseClass.Line, null);
      const lineCount = lineObjects.length;

      let connectedLineId = -1;
      let connectedObjectId = -1;

      for (let i = 0; i < lineCount; i++) {
        const lineObject = ObjectUtil.GetObjectPtr(lineObjects[i], false);
        if (lineObject) {
          const hookCount = lineObject.hooks.length;

          for (let hookIndex = 0; hookIndex < hookCount; hookIndex++) {
            if (lineObject.hooks[hookIndex].objid === objectId) {
              const normalizedConnect = this.PrNormalizeConnect(lineObject.hooks[hookIndex].connect);

              if (Utils2.IsEqual(normalizedConnect.x, connectionPoint.x, 10) &&
                Utils2.IsEqual(normalizedConnect.y, connectionPoint.y, 10)) {

                connectedLineId = lineObjects[i];

                if (hookCount > 1) {
                  connectedObjectId = hookIndex === 0 ? lineObject.hooks[1].objid : lineObject.hooks[0].objid;
                  break;
                }
              }
            }
          }
        }
      }

      if (connectedLineId >= 0) {
        OptCMUtil.CancelOperation(true);

        const newPosition = {
          x: perimPoints[0].x + offsetX + positionOffset.x,
          y: perimPoints[0].y + offsetY + positionOffset.y
        };

        const symbolId = this.PrGetCurrentSymbolId();
        this.PrInsertSymbol(
          symbolId,
          actionType,
          objectId,
          connectedLineId,
          connectedObjectId,
          newPosition,
          perimPoints[0],
          connectionPoint
        );
      } else {
        const actionStoredObject = ObjectUtil.GetObjectPtr(T3Gv.opt.actionStoredObjectId, false);

        if (actionStoredObject) {
          switch (actionType) {
            case actionArrow.Right:
              posX = perimPoints[0].x + horizontalGridSize + positionOffset.x;
              posY = perimPoints[0].y;
              break;
            case actionArrow.Left:
              posX = perimPoints[0].x - horizontalGridSize + positionOffset.x;
              posY = perimPoints[0].y;
              break;
            case actionArrow.Down:
              posY = perimPoints[0].y + verticalGridSize + positionOffset.y;
              posX = perimPoints[0].x;
              break;
            case actionArrow.Up:
              posY = perimPoints[0].y - verticalGridSize + positionOffset.y;
              posX = perimPoints[0].x;
              break;
            default:
              return;
          }

          actionStoredObject.StartNewObjectDrawTrackCommon(posX, posY, false);

          let shiftX = 0;
          let shiftY = 0;

          if (posX < 0) {
            shiftX = -posX;
            posX = 0;
          }

          if (posY < 0) {
            shiftY = -posY;
            posY = 0;
          }

          if (shiftX || shiftY) {
            this.PrShiftDiagram(actionStoredObject, shiftX, shiftY, objectId, null);
            ToolActUtil.OffsetShape(T3Gv.opt.actionStoredObjectId, shiftX, shiftY, 0);
          }

          const windowCoords = T3Gv.docUtil.svgDoc.ConvertDocToWindowCoords(posX, posY);
          actionStoredObject.LM_DrawRelease(event, windowCoords);
        }
      }
    }

    console.log("T3Util: ActionClick output", { connectionPoint, perimeterPoints, offsetX, offsetY });
  }

  /**
   * Gets the current symbol ID from recent symbols or selected buttons
   * @returns The current symbol ID for use in drawing operations
   */
  PrGetCurrentSymbolId() {
    console.log("T3Util: PrGetCurrentSymbolId input");

    let index, symbolsCount;
    const dataBlock = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    symbolsCount = dataBlock.RecentSymbols.length;

    // Get the currently selected button ID
    let selectedSymbolId = this.GetSelectedButton();

    // Check if the selected ID is valid (not marked as NoMenu)
    if (selectedSymbolId) {
      for (index = 0; index < symbolsCount; index++) {
        if (dataBlock.RecentSymbols[index].ItemId === selectedSymbolId &&
          dataBlock.RecentSymbols[index].NoMenu) {
          selectedSymbolId = null;
          break;
        }
      }
    }

    // If no valid ID was found or selected
    if (selectedSymbolId == null) {
      // Check if there are any non-NoMenu symbols available
      if (dataBlock.RecentSymbols.length) {
        for (index = 0; index < symbolsCount; index++) {
          if (!dataBlock.RecentSymbols[index].NoMenu) {
            selectedSymbolId = dataBlock.RecentSymbols[index].ItemId;
            break;
          }
        }
      }

      // If still no valid symbol, initialize and use the first one
      if (selectedSymbolId == null) {
        this.Initialize();
        selectedSymbolId = dataBlock.RecentSymbols[0].ItemId;
      }
    }

    console.log("T3Util: PrGetCurrentSymbolId output", selectedSymbolId);
    return selectedSymbolId;
  }

  /**
   * Inserts a symbol into the diagram and connects it with a line
   * @param symbolId - The ID of the symbol to insert
   * @param arrowDirection - The direction of the arrow/connection
   * @param sourceObjectId - The ID of the source object to connect from
   * @param lineId - The ID of the line to use for connection
   * @param connectedObjectId - The ID of the object already connected
   * @param endPoint - The endpoint coordinates for the connection line
   * @param startPoint - The starting point coordinates for the connection line
   * @param connectionPoint - The connection point coordinates
   */
  PrInsertSymbol(symbolId, arrowDirection, sourceObjectId, lineId, connectedObjectId, endPoint, startPoint, connectionPoint) {
    console.log("T3Util: PrInsertSymbol input", {
      symbolId, arrowDirection, sourceObjectId, lineId,
      connectedObjectId, endPoint, startPoint, connectionPoint
    });

    const newSymbolId = this.AddSymbol(symbolId);

    if (connectedObjectId >= 0) {
      OptAhUtil.ShiftConnectedShapes(
        sourceObjectId,
        connectedObjectId,
        lineId,
        arrowDirection,
        true,
        newSymbolId
      );
    }

    T3Gv.opt.lineDrawId = lineId;

    this.PrAddLine(
      startPoint,
      endPoint,
      connectionPoint,
      "segLine",
      sourceObjectId,
      arrowDirection,
      newSymbolId
    );

    console.log("T3Util: PrInsertSymbol output", { newSymbolId });
  }

  /**
   * Adds a new line connecting objects on the diagram
   * @param startPoint - The starting coordinates of the line
   * @param endPoint - The ending coordinates of the line
   * @param connectionPoint - The connection point coordinates
   * @param lineType - The type of line to draw (line, arcLine, segLine, arcSegLine)
   * @param objectId - The ID of the object to connect from
   * @param arrowDirection - The direction of the arrow/connection
   * @param symbolId - The ID of the symbol to connect to
   * @returns ID of the newly created line
   */
  PrAddLine(startPoint, endPoint, connectionPoint, lineType, objectId, arrowDirection, symbolId) {
    console.log("T3Util: PrAddLine input", {
      startPoint, endPoint, connectionPoint, lineType, objectId, arrowDirection, symbolId
    });

    let newLine, segmentLine;
    const hookPoints = OptConstant.HookPts;
    const actionArrow = OptConstant.ActionArrow;

    // Create appropriate line type
    switch (lineType) {
      case "line":
        newLine = new ToolUtil().DrawNewLine(false, 0, true, null);
        break;
      case "arcLine":
        newLine = new ToolUtil().DrawNewArcLine(true, false, null);
        break;
      case "segLine":
        newLine = new ToolUtil().DrawNewSegLine(true, false, null);
        segmentLine = newLine.segl;
        break;
      case "arcSegLine":
        newLine = new ToolUtil().DrawNewArcSegLine(true, false, null);
        segmentLine = newLine.segl;
    }

    // Set line start and initial end points
    newLine.StartPoint = startPoint;
    newLine.EndPoint = {
      x: startPoint.x,
      y: startPoint.y
    };

    // Add the new line to the document
    const newObjectId = DrawUtil.AddNewObject(newLine, !newLine.bOverrideDefaultStyleOnDraw, true);

    // Configure segment line directions based on arrow direction
    if (segmentLine) {
      switch (arrowDirection) {
        case actionArrow.Left:
          segmentLine.firstdir = hookPoints.KLC;
          segmentLine.lastdir = hookPoints.KRC;
          break;
        case actionArrow.Right:
          segmentLine.firstdir = hookPoints.KRC;
          segmentLine.lastdir = hookPoints.KLC;
          break;
        case actionArrow.Up:
          segmentLine.firstdir = hookPoints.KTC;
          segmentLine.lastdir = hookPoints.KBC;
          break;
        case actionArrow.Down:
          segmentLine.firstdir = hookPoints.KBC;
          segmentLine.lastdir = hookPoints.KTC;
      }
    }

    // Update hook connection between objects
    HookUtil.UpdateHook(newObjectId, -1, objectId, OptConstant.HookPts.KTL, connectionPoint, null);

    // Adjust the line end to the target position
    newLine.AdjustLineEnd(null, endPoint.x, endPoint.y, OptConstant.ActionTriggerType.LineEnd);

    // Store the line ID and insert the shape
    T3Gv.opt.lineDrawId = newObjectId;
    this.InsertShape(-1, null, true, symbolId);

    console.log("T3Util: PrAddLine output", { newObjectId });
    return newObjectId;
  }

  /**
   * Shifts diagram objects by specified offsets
   * @param actionObject - The action object containing hook information
   * @param xOffset - The horizontal offset amount
   * @param yOffset - The vertical offset amount
   * @param objectId - The ID of the object to shift (optional)
   * @param newShapeId - The ID of the new shape (optional)
   */
  PrShiftDiagram(actionObject, xOffset, yOffset, objectId, newShapeId) {
    console.log("T3Util: PrShiftDiagram input", {
      actionObject, xOffset, yOffset, objectId, newShapeId
    });

    if (xOffset !== 0 || yOffset !== 0) {
      const linksBlock = ObjectUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false);

      let targetObject;
      if (objectId) {
        targetObject = ObjectUtil.GetObjectPtr(objectId, false);
      } else {
        targetObject = ObjectUtil.GetObjectPtr(actionObject.hooks[0].objid, false);
      }

      if (targetObject) {
        let moveList = [];
        moveList = HookUtil.GetHookList(
          linksBlock,
          moveList,
          targetObject.BlockID,
          targetObject,
          NvConstant.ListCodes.MoveTargAndLines,
          {}
        );

        for (let i = 0; i < moveList.length; i++) {
          ToolActUtil.OffsetShape(moveList[i], xOffset, yOffset, 0);
        }

        T3Gv.opt.flowchartShift = {
          x: xOffset,
          y: yOffset,
          id: actionObject.BlockID,
          theMoveList: moveList,
          newshapeid: newShapeId
        };
      }
    }

    console.log("T3Util: PrShiftDiagram output", T3Gv.opt.flowchartShift);
  }

  /**
   * Inserts a shape into the diagram and connects it with a line
   * @param index - The index of the symbol to insert, or -1 to use current symbol
   * @param symbolId - The ID of the symbol to insert
   * @param isCollabOperation - Flag indicating if this is a collaboration operation
   * @param newShapeId - Optional ID for the new shape
   */
  InsertShape(index, symbolId, isCollabOperation, newShapeId) {
    console.log("T3Util: InsertShape input", { index, symbolId, isCollabOperation, newShapeId });

    const lineObject = ObjectUtil.GetObjectPtr(T3Gv.opt.lineDrawId, false);
    let shapeWidth = OptConstant.Common.ShapeWidth;
    let shapeHeight = OptConstant.Common.ShapeHeight;
    const dimensionMax = OptConstant.Common.DimMax;
    let horizontalShift = 0;
    let verticalShift = 0;
    const dataBlockObject = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    const linksBlockObject = ObjectUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false);
    let symbolTitle = "";
    let isSymbolWithData = false;
    let moveInfo: any = {};

    // Determine the symbol ID if not provided
    if (symbolId == null) {
      if (index < 0) {
        symbolId = this.PrGetCurrentSymbolId();
      } else if (dataBlockObject.RecentSymbols.length) {
        symbolId = dataBlockObject.RecentSymbols[index].ItemId;
      }
    }

    if (symbolId != null) {
      // Check if the line has only one hook connection
      if (lineObject && lineObject.hooks.length === 1) {
        let newShapeObjectId;

        // Begin editing operation for collaboration
        if (isCollabOperation /*|| BeginSecondaryEdit()*/) {
          // Get the source object connected to the line
          const sourceObjectId = lineObject.hooks[0].objid;

          if (sourceObjectId >= 0) {
            const sourceObject = ObjectUtil.GetObjectPtr(sourceObjectId, false);
            let moveList = [];
            const moveInfo = {};

            // Get a list of all objects that need to be moved together
            moveList = HookUtil.GetHookList(
              linksBlockObject,
              moveList,
              sourceObjectId,
              sourceObject,
              NvConstant.ListCodes.MoveTargAndLines,
              moveInfo
            );
          }

          // Create the new shape object
          if (newShapeId != null) {
            newShapeObjectId = newShapeId;
            symbolId = this.PrGetCurrentSymbolId();
          } else {
            newShapeObjectId = this.AddSymbol(symbolId);
          }

          const shapeObject = ObjectUtil.GetObjectPtr(newShapeObjectId, false);

          // Get symbol metadata if available
          if (shapeObject.SymbolData) {
            symbolTitle = shapeObject.SymbolData.Title;
            isSymbolWithData = true;
          }

          // Get connection point from the line
          const connectionPoint = lineObject.GetShapeConnectPoint();
          const isHorizontalCenter = connectionPoint.x === dimensionMax / 2;

          // Initialize frame for the shape
          const shapeFrame = { x: 0, y: 0, width: 0, height: 0 };
          shapeFrame.width = shapeWidth;
          shapeFrame.height = shapeHeight;

          // Adjust shape for auto-insertion
          shapeObject.AdjustAutoInsertShape(shapeObject.Frame, isHorizontalCenter);

          if (shapeObject) {
            shapeFrame.width = shapeObject.Frame.width;
            shapeFrame.height = shapeObject.Frame.height;
            shapeWidth = shapeFrame.width;
            shapeHeight = shapeFrame.height;
          }

          // Position the shape based on the connection point
          if (shapeObject.GetClosestConnectPoint(connectionPoint)) {
            let connectionX = connectionPoint.x / dimensionMax * shapeWidth;
            let connectionY = connectionPoint.y / dimensionMax * shapeHeight;

            // Adjust for rotation if needed
            if (shapeObject.RotationAngle) {
              const rect = {
                x: 0,
                y: 0,
                width: shapeWidth,
                height: shapeHeight
              };

              const angleInRadians = -shapeObject.RotationAngle / (180 / NvConstant.Geometry.PI);
              const points = [];

              points.push({
                x: connectionX,
                y: connectionY
              });

              Utils3.RotatePointsAboutCenter(rect, angleInRadians, points);
              connectionX = points[0].x;
              connectionY = points[0].y;
            }

            shapeFrame.x = lineObject.EndPoint.x - connectionX;
            shapeFrame.y = lineObject.EndPoint.y - connectionY;
          } else {
            // Position based on the connection point location
            if (connectionPoint.x === dimensionMax / 2) {
              if (connectionPoint.y === dimensionMax) {
                shapeFrame.x = lineObject.EndPoint.x - shapeWidth / 2;
                shapeFrame.y = lineObject.EndPoint.y - shapeHeight;

                if (moveInfo.y > 0) {
                  moveInfo.y -= shapeObject.Frame.height;
                }
              } else {
                shapeFrame.x = lineObject.EndPoint.x - shapeWidth / 2;
                shapeFrame.y = lineObject.EndPoint.y;
              }
            } else if (connectionPoint.x === dimensionMax) {
              shapeFrame.x = lineObject.EndPoint.x - shapeWidth;
              shapeFrame.y = lineObject.EndPoint.y - shapeHeight / 2;

              if (moveInfo.x > 0) {
                moveInfo.x -= shapeObject.Frame.width;
              }
            } else {
              shapeFrame.x = lineObject.EndPoint.x;
              shapeFrame.y = lineObject.EndPoint.y - shapeHeight / 2;
            }
          }

          // Calculate shifts to ensure the shape stays within canvas bounds
          if (moveInfo.x < 0) {
            horizontalShift = 10 - moveInfo.x;
            shapeFrame.x += horizontalShift;
          }

          if (moveInfo.y < 0) {
            verticalShift = 10 - moveInfo.y;
            shapeFrame.y += verticalShift;
          }

          if (shapeFrame.y < 0) {
            verticalShift += 10 - shapeFrame.y;
            shapeFrame.y = 10;
          }

          if (shapeFrame.x < 0) {
            horizontalShift += 10 - shapeFrame.x;
            shapeFrame.x = 10;
          }

          // Apply shifts to the diagram if needed
          this.PrShiftDiagram(lineObject, horizontalShift, verticalShift, null, newShapeObjectId);

          // Update shape position and mark as dirty
          if (shapeObject) {
            shapeObject.SetShapeOrigin(shapeFrame.x, shapeFrame.y);
            ObjectUtil.AddToDirtyList(newShapeObjectId);
          }

          // Create list of modified objects
          const modifiedObjects = [];
          modifiedObjects.push(newShapeObjectId);

          // Update hook connections for the line
          HookUtil.UpdateHook(
            T3Gv.opt.lineDrawId,
            -1,
            newShapeObjectId,
            OptConstant.HookPts.KTR,
            connectionPoint,
            null
          );

          OptCMUtil.SetLinkFlag(newShapeObjectId, DSConstant.LinkFlags.Move);

          // Handle connections for existing lines
          if (T3Gv.opt.lineDrawLineId >= 0) {
            const lineDrawLineObject = ObjectUtil.GetObjectPtr(T3Gv.opt.lineDrawLineId, true);
            const sourceObjectId = lineObject.hooks[0].objid;

            for (let hookIndex = 0; hookIndex < lineDrawLineObject.hooks.length; hookIndex++) {
              if (lineDrawLineObject.hooks[hookIndex].objid === sourceObjectId) {
                let hookConnectionPoint = lineDrawLineObject.GetShapeConnectPoint(lineDrawLineObject.hooks[hookIndex].hookpt);

                if (!shapeObject.GetClosestConnectPoint(hookConnectionPoint)) {
                  hookConnectionPoint = lineDrawLineObject.hooks[hookIndex].connect;

                  const sourceObject = ObjectUtil.GetObjectPtr(sourceObjectId, true);
                  if (sourceObject.RotationAngle) {
                    const rect = {
                      x: 0,
                      y: 0,
                      width: dimensionMax,
                      height: dimensionMax
                    };

                    const angleInRadians = -sourceObject.RotationAngle / (180 / NvConstant.Geometry.PI);
                    const points = [];

                    points.push(hookConnectionPoint);
                    Utils3.RotatePointsAboutCenter(rect, angleInRadians, points);
                    hookConnectionPoint.x = points[0].x;
                    hookConnectionPoint.y = points[0].y;
                  }
                }

                HookUtil.UpdateHook(
                  T3Gv.opt.lineDrawLineId,
                  hookIndex,
                  newShapeObjectId,
                  lineDrawLineObject.hooks[hookIndex].hookpt,
                  hookConnectionPoint,
                  null
                );

                OptCMUtil.SetLinkFlag(newShapeObjectId, DSConstant.LinkFlags.Move);
                break;
              }
            }
          }

          // Complete the operation
          DrawUtil.CompleteOperation(modifiedObjects);
        }

        // Reset line drawing state
        T3Gv.opt.lineDrawId = -1;
        T3Gv.opt.lineDrawLineId = -1;
      }
    }

    console.log("T3Util: InsertShape output", { newShapeId });
  }

  /**
   * Initializes the recent symbols list with default symbol IDs
   * This ensures the symbols panel has default options available
   * @returns void
   */
  Initialize() {
    console.log("T3Util: Initialize input");

    const defaultSymbolIds = [
      "aa2307ef-e894-4766-b80f-906328ea4bfd"
    ];

    const dataBlockObject = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    const symbolCount = defaultSymbolIds.length;

    // Initialize recent symbols array if it's empty
    if (dataBlockObject.RecentSymbols && dataBlockObject.RecentSymbols.length === 0) {
      dataBlockObject.RecentSymbols = [];

      // Add each default symbol to the recent symbols list
      for (let symbolIndex = 0; symbolIndex < symbolCount; symbolIndex++) {
        const symbolData = new RecentSymbol(defaultSymbolIds[symbolIndex], "", false);
        dataBlockObject.RecentSymbols.push(symbolData);
      }
    }

    // Register all symbols with the UI controller
    const totalSymbols = dataBlockObject.RecentSymbols.length;
    for (let symbolIndex = 0; symbolIndex < totalSymbols; symbolIndex++) {
      StoreSpecialSymbol(
        dataBlockObject.RecentSymbols[symbolIndex].ItemId,
        dataBlockObject.RecentSymbols[symbolIndex]
      );
    }

    console.log("T3Util: Initialize output", { symbolsInitialized: dataBlockObject.RecentSymbols.length });
  }

  AddSymbol(symbolId: any) {
    console.log("T3Util: AddSymbol input symbolId", symbolId);

    const dataBlockObject = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    const newSymbolId = dataBlockObject.AddSymbol();

    console.log("T3Util: AddSymbol output", { newSymbolId });
    return newSymbolId;
  }

  GetSelectedButton() {
    return ""; // Placeholder for the actual implementation
  }
}

export default LineDraw
