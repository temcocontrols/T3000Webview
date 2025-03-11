

import Rect from './S.Rect'
import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import GlobalData from '../Data/T3Gv'
import DefaultEvt from "../Event/EvtUtil";
import Document from '../Basic/B.Document'
import Element from '../Basic/B.Element';
import ConstantData from '../Data/ConstantData'
import ContainerListShape from '../Model/ContainerListShape'
import Instance from '../Data/Instance/Instance';

class ShapeContainer extends Rect {

  public ContainerList: any;

  constructor(options: any) {
    console.log("= S.ShapeContainer - input:", options);
    options = options || {};
    options.ShapeType = ConstantData.ShapeType.RECT;
    super(options);

    this.dataclass = options.dataclass || ConstantData.SDRShapeTypes.SED_S_Rect;
    this.ContainerList = options.ContainerList || new Instance.Shape.ContainerList();
    this.objecttype = ConstantData.ObjectTypes.SD_OBJT_SHAPECONTAINER;
    this.nativeDataArrayBuffer = options.nativeDataArrayBuffer || null;
    this.SymbolData = options.SymbolData || null;

    console.log("= S.ShapeContainer - output:", {
      ShapeType: options.ShapeType,
      dataclass: this.dataclass,
      ContainerList: this.ContainerList,
      objecttype: this.objecttype,
      nativeDataArrayBuffer: this.nativeDataArrayBuffer,
      SymbolData: this.SymbolData
    });
  }

  IsShapeContainer(shape: any, hook?: any): boolean {
    console.log("= S.ShapeContainer IsShapeContainer - Input:", { shape, hook });

    const containerFlags = ConstantData.ContainerListFlags;
    if (shape == null) {
      console.log("= S.ShapeContainer IsShapeContainer - Output:", false);
      return false;
    }
    if (
      shape.ParentFrameID >= 0 &&
      GlobalData.optManager.GetObjectPtr(shape.ParentFrameID, false)
    ) {
      console.log("= S.ShapeContainer IsShapeContainer - Output:", false);
      return false;
    }
    if (shape.IsSwimlane()) {
      console.log("= S.ShapeContainer IsShapeContainer - Output:", false);
      return false;
    }
    if (shape.flags & ConstantData.ObjFlags.SEDO_TextOnly) {
      console.log("= S.ShapeContainer IsShapeContainer - Output:", false);
      return false;
    }
    if (shape.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
      const containerList = this.ContainerList;
      const isSparse = containerList.flags & containerFlags.Sparse;

      if (hook) {
        if (isSparse || containerList.Arrangement !== ConstantData.ContainerListArrangements.Row) {
          hook.id = ConstantData.HookPts.SED_KCT;
        } else {
          hook.x -= shape.Frame.width / 2;
          hook.y += shape.Frame.height / 2;
          hook.id = ConstantData.HookPts.SED_KCL;
        }
      }

      let result: boolean;
      if (containerList.flags & containerFlags.AllowOnlyContainers) {
        result = (
          shape instanceof ShapeContainer ||
          shape.objecttype === ConstantData.ObjectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER
        );
      } else {
        if (containerList.flags & containerFlags.AllowOnlyNonContainers) {
          result = (
            !(shape instanceof ShapeContainer) &&
            shape.objecttype !== ConstantData.ObjectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER
          );
        } else {
          result = true;
        }
      }
      console.log("= S.ShapeContainer IsShapeContainer - Output:", result);
      return result;
    }

    console.log("= S.ShapeContainer IsShapeContainer - Output:", false);
    return false;
  }

  CreateConnectHilites(
    event: any,
    target: any,
    options: any,
    extraParam1: any,
    extraParam2: any,
    extraParam3: any
  ) {
    console.log("= S.ShapeContainer CreateConnectHilites - Input:", {
      event,
      target,
      options,
      extraParam1,
      extraParam2,
      extraParam3
    });

    // Your implementation here
    const hiliteInfo = {
      active: true,
      eventDetails: event,
      targetDetails: target,
      optionsPassed: options,
      additionalData: {
        param1: extraParam1,
        param2: extraParam2,
        param3: extraParam3
      }
    };

    console.log("= S.ShapeContainer CreateConnectHilites - Output:", hiliteInfo);
    return hiliteInfo;
  }

  GetBestHook(event: any, currentHook: any, additionalData: any): any {
    console.log("= S.ShapeContainer GetBestHook - Input:", { event, currentHook, additionalData });
    const bestHook = currentHook;
    console.log("= S.ShapeContainer GetBestHook - Output:", bestHook);
    return bestHook;
  }

  GetTargetPoints(inputParam?: any, secondParam?: any, thirdParam?: any): Point[] {
    console.log("= S.ShapeContainer GetTargetPoints - Input:", { inputParam, secondParam, thirdParam });

    const resultPoints: Point[] = [];
    const containerList = this.ContainerList;
    const list = containerList.List;
    const listLength = list.length;
    const standardDimension = ConstantData.Defines.SED_CDim;
    let defaultPoint = { x: standardDimension / 2, y: 0 };
    const isSparse = containerList.flags & ConstantData.ContainerListFlags.Sparse;
    const containerFrame = this.Pr_GetContainerFrame().frame;
    const isContainerInCell = GlobalData.optManager.ContainerIsInCell(this);
    const frameWidth = containerFrame.width;
    let numDown = containerList.ndown;
    let numAcross = containerList.nacross;

    // Adjust grid dimensions if container is in cell and in sparse mode
    if (isContainerInCell && isSparse) {
      let heightDifference = containerFrame.height - containerList.height;
      let additionalRows = Math.floor(heightDifference / containerList.childheight);
      if (additionalRows < 0) {
        additionalRows = 0;
      }
      numDown += additionalRows;

      let widthDifference = containerFrame.width - containerList.width;
      let additionalCols = Math.floor(widthDifference / containerList.childwidth);
      if (additionalCols < 0) {
        additionalCols = 0;
      }
      numAcross += additionalCols;
    }

    // Process for sparse container list
    if (isSparse) {
      for (let row = 0; row <= numDown; row++) {
        for (let col = -1; col <= numAcross; col++) {
          defaultPoint = new Point(col, row);
          resultPoints.push(defaultPoint);
        }
      }
      console.log("= S.ShapeContainer GetTargetPoints - Output:", resultPoints);
      return resultPoints;
    }

    // Process for non-sparse container list
    if (containerList.Arrangement === ConstantData.ContainerListArrangements.Column) {
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

    console.log("= S.ShapeContainer GetTargetPoints - Output:", resultPoints);
    return resultPoints;
  }

  Pr_GetContainerFrame(): { frame: any; StartY: number } {
    console.log("= S.ShapeContainer Pr_GetContainerFrame - Input:", { trect: this.trect });
    const frame = Utils1.DeepCopy(this.trect);
    const StartY = 0;
    const result = { frame, StartY };
    console.log("= S.ShapeContainer Pr_GetContainerFrame - Output:", result);
    return result;
  }

  GetHitTestFrame(target: any) {
    console.log("= S.ShapeContainer GetHitTestFrame - Input:", { target });
    const hitTestFrame: any = {};
    const containerList = this.ContainerList;
    const isSparse = containerList.flags & ConstantData.ContainerListFlags.Sparse;

    // Copy base rectangle
    Utils2.CopyRect(hitTestFrame, this.r);

    if (target && target.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
      if (isSparse) {
        hitTestFrame.width += containerList.HorizontalSpacing + containerList.childwidth;
        hitTestFrame.x -= containerList.HorizontalSpacing + containerList.childwidth / 2;
      } else {
        hitTestFrame.width += containerList.HorizontalSpacing + target.Frame.width / 2;
      }
      hitTestFrame.height += 2 * containerList.VerticalSpacing;
    }

    console.log("= S.ShapeContainer GetHitTestFrame - Output:", hitTestFrame);
    return hitTestFrame;
  }

  AllowDoubleClick(): boolean {
    console.log("= S.ShapeContainer AllowDoubleClick - Input:", {});
    const containerListFlags = this.ContainerList.flags;
    const isAllowed = !!(containerListFlags & ConstantData.ContainerListFlags.Sparse);
    console.log("= S.ShapeContainer AllowDoubleClick - Output:", isAllowed);
    return isAllowed;
  }

  DoubleClick(event: any, target: any) {
    console.log("= S.ShapeContainer DoubleClick - Input:", { event, target });

    const containerList = this.ContainerList;
    const list = containerList.List;
    const listLength = list.length;
    const isSparse = containerList.flags & ConstantData.ContainerListFlags.Sparse;
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
          const obj = GlobalData.optManager.GetObjectPtr(list[index].id, false);
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

    if (!target) {
      const ctrlKey = event.gesture.srcEvent.ctrlKey;
      const shiftKey = event.gesture.srcEvent.shiftKey;
      const containerInCell = GlobalData.optManager.ContainerIsInCell(this);
      if (containerInCell && (shiftKey || ctrlKey)) {
        console.log("= S.ShapeContainer DoubleClick - Detected container in cell with modifier keys.");
        GlobalData.optManager.Table_SetupAction(event, containerInCell.obj.BlockID, ConstantData.Defines.TableCellHit, null);
        console.log("= S.ShapeContainer DoubleClick - Output: action triggered via Table_SetupAction");
        return;
      }
    }

    if (isSparse) {
      if (target) {
        rowIndex = target.Data.row;
        colIndex = target.Data.col;
        foundSlot = true;
        newPoint = Utils1.DeepCopy(target.Data.theNewPoint);
      } else {
        foundSlot = false;
        newPoint = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
        newPoint = Utils1.DeepCopy(newPoint);

        // Adjust newPoint relative to the container frame
        newPoint.x -= this.Frame.x;
        newPoint.y -= this.Frame.y;

        if (
          (this.TextFlags & ConstantData.TextFlags.SED_TF_AttachA ||
            this.TextFlags & ConstantData.TextFlags.SED_TF_AttachB) &&
          (newPoint.y < 10 || newPoint.y > this.Frame.height - 10)
        ) {
          const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
          console.log("= S.ShapeContainer DoubleClick - Output: activating text edit.");
          GlobalData.optManager.ActivateTextEdit(svgElement.svgObj.SDGObj, event);
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
            if (containerList.Arrangement === ConstantData.ContainerListArrangements.Column) {
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
          someVariable = target ? target.Data.SymbolID : SDUI.Commands.MainController.Symbols.GetSelectedButton();
          const newId = gBaseManager.AddSymbol(someVariable);
          const newObj = GlobalData.optManager.GetObjectPtr(newId, true);
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
          GlobalData.optManager.AddToDirtyList(newId);
        } else {
          const duplicatedId = gBaseManager.DuplicateShape(closest, true, false);
          GlobalData.optManager.AddToDirtyList(duplicatedId);
        }

        const hookLocation = { x: colIndex, y: rowIndex };
        const hookPointID = ConstantData.HookPts.SED_KCT;
        const createdIds: any[] = [];
        GlobalData.optManager.UpdateHook(closest < 0 ? someVariable : closest, -1, this.BlockID, hookPointID, hookLocation, null);
        createdIds.push(closest < 0 ? someVariable : closest);
        GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
        if (Collab.AllowMessage()) {
          const messageList = [closest < 0 ? someVariable : closest];
          const messageObj = {
            BlockID: this.BlockID,
            closest: closest,
            SymbolID: someVariable,
            row: rowIndex,
            col: colIndex,
            CreateList: messageList,
            theNewPoint: { x: newPoint.x, y: newPoint.y },
          };
          Collab.BuildMessage(ConstantData.CollabMessages.ContainerDoubleClick, messageObj, false);
        }
        GlobalData.optManager.CompleteOperation(createdIds);
      }
    }

    console.log("= S.ShapeContainer DoubleClick - Output:", { event, target });
  }

  NoRotate(): boolean {
    console.log("= S.ShapeContainer NoRotate - Input:", {});
    const result = true;
    console.log("= S.ShapeContainer NoRotate - Output:", result);
    return result;
  }

  FieldDataAllowed(): boolean {
    console.log("= S.ShapeContainer FieldDataAllowed - Input:", { thisContext: this });
    const allowed = !GlobalData.optManager.ContainerIsInCell(this);
    console.log("= S.ShapeContainer FieldDataAllowed - Output:", allowed);
    return allowed;
  }

  GetPerimPts(
    hook: any,
    points: Point[],
    hookId: number,
    extraParam: any,
    anotherParam: any,
    index: number
  ): Point[] {
    console.log("= S.ShapeContainer GetPerimPts - Input:", { hook, points, hookId, extraParam, anotherParam, index });
    const resultPoints: Point[] = [];
    const containerList = this.ContainerList;
    const containerItems = containerList.List;
    const containerItemCount = containerItems.length;
    const standardDimension = ConstantData.Defines.SED_CDim;
    const containerArrangement = ConstantData.ContainerListArrangements;
    const isSparse = !!(containerList.flags & ConstantData.ContainerListFlags.Sparse);

    // Ensure formatting if a single point and specific flag is set
    if (points.length === 1 && (this.flags & ConstantData.ObjFlags.SEDO_Obj1)) {
      this.Pr_Format();
    }

    const containerFrameData = this.Pr_GetContainerFrame();
    const containerFrame = containerFrameData.frame;
    let verticalOffset = containerList.VerticalSpacing + containerFrameData.StartY;
    const isInCell = GlobalData.optManager.ContainerIsInCell(this);

    // Case 1: Single point and negative index
    if (points.length === 1 && index < 0) {
      let xCoord: number, yCoord: number;
      if (hookId === ConstantData.HookPts.SED_KCTL) {
        xCoord = containerFrame.x;
        yCoord = containerFrame.y;
      } else if (hookId === ConstantData.HookPts.SED_KCL) {
        xCoord = containerFrame.x;
        yCoord = containerFrame.y + containerFrame.height / 2;
      } else {
        xCoord = containerFrame.x + containerFrame.width / 2;
        yCoord = containerFrame.y;
      }
      const computedPoint = new Point(xCoord, yCoord);
      if (points[0].id != null) {
        computedPoint.id = points[0].id;
      }
      resultPoints.push(computedPoint);
      console.log("= S.ShapeContainer GetPerimPts - Output (single point):", resultPoints);
      return resultPoints;
    }

    // Case 2: Sparse container list with a valid index
    if (isSparse && index >= 0) {
      for (let i = 0; i < points.length; i++) {
        let xCoord = 0;
        let yCoord = 0;
        let listIndex: number;
        if (points[i].y < containerList.ndown) {
          if (points[i].x < 0) {
            listIndex = points[i].y * containerList.nacross;
            yCoord = containerItems[listIndex].pt.y;
            xCoord = isInCell
              ? containerList.HorizontalSpacing / 2
              : -containerList.childwidth / 2;
          } else if (points[i].x < containerList.nacross) {
            listIndex = points[i].y * containerList.nacross + points[i].x;
            yCoord = containerItems[listIndex].pt.y;
            xCoord = containerItems[listIndex].pt.x;
          } else {
            listIndex = points[i].y * containerList.nacross + containerList.nacross - 1;
            yCoord = containerItems[listIndex].pt.y;
            xCoord = containerList.width + (points[i].x - containerList.nacross) * containerList.childwidth + containerList.childwidth / 2;
            if (isInCell && xCoord > containerFrame.width - containerList.HorizontalSpacing / 2) {
              xCoord = containerFrame.width - containerList.HorizontalSpacing / 2;
            }
          }
        } else {
          yCoord = containerList.height + (points[i].y - containerList.ndown) * containerList.childheight + containerList.VerticalSpacing;
          if (isInCell && yCoord > containerFrame.height - containerList.VerticalSpacing / 2) {
            yCoord = containerFrame.height - containerList.VerticalSpacing / 2;
          }
          if (points[i].x < 0) {
            listIndex = points[i].y * containerList.nacross;
            xCoord = isInCell
              ? containerList.HorizontalSpacing / 2
              : -containerList.childwidth / 2;
          } else if (points[i].x < containerList.nacross) {
            listIndex = points[i].y >= containerList.ndown
              ? (containerList.ndown - 1) * containerList.nacross + points[i].x
              : (points[i].y - 1) * containerList.nacross + points[i].x;
            xCoord = containerItems[listIndex].pt.x;
          } else {
            xCoord = containerList.width + (points[i].x - containerList.nacross) * containerList.childwidth + containerList.childwidth / 2;
            if (isInCell && xCoord > containerFrame.width - containerList.HorizontalSpacing / 2) {
              xCoord = containerFrame.width - containerList.HorizontalSpacing / 2;
            }
          }
        }
        const computedPoint = new Point(xCoord + containerFrame.x, yCoord + containerFrame.y);
        resultPoints.push(computedPoint);
      }
      console.log("= S.ShapeContainer GetPerimPts - Output (sparse):", resultPoints);
      return resultPoints;
    }

    // Case 3: Default processing for non-sparse container list
    for (let i = 0; i < points.length; i++) {
      let pointIndex = points[i].y;
      let xCoord = 0;
      let yCoord = 0;
      if (containerList.Arrangement === ConstantData.ContainerListArrangements.Column) {
        xCoord = (points[i].x / standardDimension) * containerFrame.width;
      } else {
        yCoord = (points[i].x / standardDimension) * containerFrame.height;
      }
      if (pointIndex < containerItemCount) {
        yCoord = containerItems[pointIndex].pt.y;
        xCoord = containerItems[pointIndex].pt.x;
      } else if (containerItemCount === 0) {
        if (containerList.Arrangement === ConstantData.ContainerListArrangements.Column) {
          yCoord = containerList.VerticalSpacing;
        } else {
          xCoord = containerList.HorizontalSpacing;
          yCoord = this.Frame.height / 2;
        }
      } else {
        pointIndex = containerItemCount - 1;
        const obj = GlobalData.optManager.GetObjectPtr(containerItems[pointIndex].id, false);
        if (containerList.Arrangement === containerArrangement.Row) {
          xCoord = containerList.width;
          yCoord = containerItems[pointIndex].pt.y;
          if (obj) {
            const computedX = containerItems[pointIndex].pt.x + obj.Frame.width + containerList.HorizontalSpacing;
            xCoord = computedX > containerList.width ? containerList.width : computedX;
          }
        } else {
          yCoord = containerList.height;
          if (obj) {
            const computedY = containerItems[pointIndex].pt.y + obj.Frame.height + containerList.VerticalSpacing;
            yCoord = computedY;
          }
          xCoord = containerItems[pointIndex].pt.x;
        }
      }
      // If the hook type is SED_KAT, adjust the y-coordinate
      if (hookId === ConstantData.HookPts.SED_KAT) {
        yCoord = 0;
      }
      const computedPoint = new Point(xCoord + containerFrame.x, yCoord + containerFrame.y);
      if (points[i].id != null) {
        computedPoint.id = points[i].id;
      }
      // Adjust offset when multiple points are present
      if (points.length > 1) {
        if (containerList.Arrangement === ConstantData.ContainerListArrangements.Column) {
          computedPoint.y -= containerList.VerticalSpacing / 2;
        } else {
          computedPoint.x -= containerList.HorizontalSpacing / 2;
        }
      }
      resultPoints.push(computedPoint);
    }

    console.log("= S.ShapeContainer GetPerimPts - Output:", resultPoints);
    return resultPoints;
  }

  Pr_Format(e) {
    console.log("= S.ShapeContainer Pr_Format - Input:", { e });

    // Rename variables for readability
    let lm = this.ContainerList;
    let listItems = lm.List;
    let totalItems = listItems.length;
    let colOffset = 0;
    let verticalSpacing = lm.VerticalSpacing;
    let currentX = 0;
    let currentY = verticalSpacing;
    const Arrangement = ConstantData.ContainerListArrangements;
    let self = this;
    let extraTop = 0;
    let isSparse = Boolean(lm.flags & ConstantData.ContainerListFlags.Sparse);
    let leftChanged = Boolean(lm.flags & ConstantData.ContainerListFlags.LeftChanged);
    let topChanged = Boolean(lm.flags & ConstantData.ContainerListFlags.TopChanged);
    let cellDimensions = null;

    // Clear change flags
    lm.flags = Utils2.SetFlag(lm.flags, ConstantData.ContainerListFlags.LeftChanged, false);
    lm.flags = Utils2.SetFlag(lm.flags, ConstantData.ContainerListFlags.TopChanged, false);

    // Function to format a column
    const formatColumn = function (startIndex: number, startX: number, refDimensions: { width: number; height: number } | null) {
      let idx = startIndex;
      let runningY = lm.VerticalSpacing + extraTop;
      let wrapCount = lm.Wrap;
      let formattedCount = 0;
      let maxWidth = 0;

      // Loop through items for the current column
      for (; idx < totalItems; idx++) {
        runningY += listItems[idx].extra;
        listItems[idx].pt = { x: startX, y: runningY };
        let obj = GlobalData.optManager.GetObjectPtr(listItems[idx].id, false);
        if (obj) {
          if (obj.Frame.y !== runningY) {
            GlobalData.optManager.SetLinkFlag(obj.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
          }
          if (obj.Frame.width > maxWidth) {
            maxWidth = obj.Frame.width;
          }
          runningY += obj.Frame.height + lm.VerticalSpacing;
          formattedCount++;
        }
        if (wrapCount > 0 && formattedCount >= wrapCount) {
          break;
        }
      }
      maxWidth += 2 * lm.HorizontalSpacing;
      if (maxWidth < lm.MinWidth) {
        maxWidth = lm.MinWidth;
      }
      let colWidth = maxWidth;
      if (refDimensions && colWidth < refDimensions.width) {
        colWidth = refDimensions.width;
      }
      let updateFlag = false;
      for (let j = startIndex; j < idx; j++) {
        listItems[j].pt.x += colWidth / 2;
        let currObj = GlobalData.optManager.GetObjectPtr(listItems[j].id, false);
        if (
          currObj &&
          (currObj.Frame.x + currObj.Frame.width / 2) !== (self.Frame.x + listItems[j].pt.x)
        ) {
          GlobalData.optManager.SetLinkFlag(currObj.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
          updateFlag = true;
        }
      }
      if (updateFlag) {
        GlobalData.optManager.SetLinkFlag(self.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
      }
      return { start: idx, colwidth: colWidth, top: runningY };
    };

    // Function to format a row
    const formatRow = function (startIndex: number, basePoint: any, startY: number, refDimensions: { width: number; height: number } | null) {
      let idx = startIndex;
      let runningX = lm.HorizontalSpacing;
      let wrapCount = lm.Wrap;
      let formattedCount = 0;
      let maxHeight = 0;
      let currentBaseY = startY;

      for (; idx < totalItems; idx++) {
        runningX += listItems[idx].extra;
        listItems[idx].pt = { x: runningX, y: currentBaseY };
        let obj = GlobalData.optManager.GetObjectPtr(listItems[idx].id, false);
        let objWidth: number, objHeight: number;
        if (obj) {
          if (obj.Frame.y / 2 !== currentBaseY) {
            GlobalData.optManager.SetLinkFlag(obj.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
          }
          objWidth = obj.Frame.width;
          objHeight = obj.Frame.height;
        } else {
          objWidth = lm.childwidth;
          objHeight = lm.childheight;
        }
        if (objHeight > maxHeight) {
          maxHeight = objHeight;
        }
        runningX += objWidth + lm.HorizontalSpacing;
        formattedCount++;
        if (wrapCount > 0 && formattedCount >= wrapCount) {
          break;
        }
      }
      maxHeight += 2 * lm.VerticalSpacing;
      if (maxHeight < lm.MinHeight) {
        maxHeight = lm.MinHeight;
      }
      let rowHeight = maxHeight;
      if (refDimensions && rowHeight < refDimensions.height) {
        rowHeight = refDimensions.height;
      }
      let updateFlag = false;
      for (let j = startIndex; j < idx; j++) {
        listItems[j].pt.y += rowHeight / 2;
        let currObj = GlobalData.optManager.GetObjectPtr(listItems[j].id, false);
        if (
          currObj &&
          (currObj.Frame.y + currObj.Frame.height / 2) !== (basePoint.y + listItems[j].pt.y)
        ) {
          GlobalData.optManager.SetLinkFlag(currObj.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
          updateFlag = true;
        }
      }
      if (updateFlag) {
        GlobalData.optManager.SetLinkFlag(self.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
      }
      return { start: idx, rowht: rowHeight, left: runningX };
    };

    let inCell = GlobalData.optManager.ContainerIsInCell(this);
    if (inCell) {
      cellDimensions = { width: this.trect.width, height: this.trect.height };
    }

    let containerFrameData = this.Pr_GetContainerFrame();
    let containerFrame = containerFrameData.frame;
    extraTop = containerFrameData.StartY;
    let index = 0;
    let baseY = lm.VerticalSpacing + extraTop;
    let finalWidth = 0;
    let finalHeight = baseY;
    let resultFormat: { start: number; colwidth?: number; top?: number; rowht?: number; left?: number };

    // Format based on sparse flag or arrangement setting
    if (isSparse) {
      const sparseFormat = (function (startY: number) {
        let currentY = startY;
        let maxWidths: number[] = [];
        let maxHeights: number[] = [];
        for (let r = 0; r < lm.ndown; r++) {
          for (let c = 0; c < lm.nacross; c++) {
            let idx = r * lm.nacross + c;
            let item = lm.List[idx];
            if (item.id == null) {
              item.id = -1;
            }
            let obj = GlobalData.optManager.GetObjectPtr(item.id, false);
            let widthVal = obj ? obj.Frame.width : lm.childwidth;
            let heightVal = obj ? obj.Frame.height : lm.childheight;
            if (maxWidths[c] == null || maxWidths[c] < widthVal) {
              maxWidths[c] = widthVal;
            }
            if (maxHeights[r] == null || maxHeights[r] < heightVal) {
              maxHeights[r] = heightVal;
            }
          }
        }
        for (let r = 0; r < lm.ndown; r++) {
          let currentX = lm.HorizontalSpacing;
          for (let c = 0; c < lm.nacross; c++) {
            let idx = r * lm.nacross + c;
            let item = lm.List[idx];
            item.pt.x = currentX + maxWidths[c] / 2;
            item.pt.y = currentY;
            currentX += maxWidths[c] + lm.HorizontalSpacing;
          }
          currentY += maxHeights[r] + lm.VerticalSpacing;
        }
        return { left: lm.HorizontalSpacing, top: currentY };
      })(baseY);
      finalWidth = sparseFormat.left;
      finalHeight = sparseFormat.top;
    } else {
      switch (lm.Arrangement) {
        case Arrangement.Column:
          while (index < totalItems) {
            resultFormat = formatColumn(index, colOffset, cellDimensions);
            index = resultFormat.start;
            finalWidth += resultFormat.colwidth!;
            colOffset += resultFormat.colwidth!;
            if (index < totalItems) {
              finalWidth -= lm.HorizontalSpacing;
              colOffset -= lm.HorizontalSpacing;
            }
            if (resultFormat.top! > finalHeight) {
              finalHeight = resultFormat.top!;
            }
          }
          break;
        case Arrangement.Row:
          while (index < totalItems) {
            baseY -= lm.VerticalSpacing;
            resultFormat = formatRow(index, containerFrame, baseY, cellDimensions);
            index = resultFormat.start;
            finalHeight += resultFormat.rowht!;
            baseY += resultFormat.rowht!;
            if (resultFormat.left! > finalWidth) {
              finalWidth = resultFormat.left!;
            }
          }
          break;
      }
    }

    if (!e) {
      lm.width = finalWidth;
      finalHeight += extraTop;
      lm.height = finalHeight;
      if (finalWidth < lm.MinWidth) {
        finalWidth = lm.MinWidth;
      }
      if (finalHeight < lm.MinHeight) {
        finalHeight = lm.MinHeight;
      }
      let deltaWidth = finalWidth - containerFrame.width;
      let deltaHeight = finalHeight - containerFrame.height;
      if (Utils2.IsEqual(deltaHeight, 0, 1)) {
        deltaHeight = 0;
      }
      if (Utils2.IsEqual(deltaWidth, 0, 1)) {
        deltaWidth = 0;
      }
      if (inCell && (deltaWidth || deltaHeight)) {
        let parentObj = GlobalData.optManager.GetObjectPtr(inCell.obj.BlockID, true);
        let tableRef = parentObj.GetTable(true);
        Business.SizeContainerCell(parentObj, tableRef, inCell.cell, inCell.cellindex, finalWidth, finalHeight);
        if (!isSparse) {
          deltaHeight = inCell.cell.frame.height - inCell.cell.vdisp - containerFrame.height;
          finalHeight = inCell.cell.frame.height - inCell.cell.vdisp;
        }
        if (deltaWidth < 0) {
          deltaWidth = 0;
        }
        if (deltaHeight < 0 && isSparse) {
          deltaHeight = 0;
        }
      }
      let offsetX = 0, offsetY = 0;
      if (deltaWidth || deltaHeight) {
        if (deltaWidth) {
          containerFrame.width = finalWidth;
          offsetX = leftChanged ? -deltaWidth : deltaWidth;
        }
        if (deltaHeight) {
          containerFrame.height = finalHeight;
          offsetY = topChanged ? -deltaHeight : deltaHeight;
        }
        this.TRectToFrame(containerFrame, true);
        GlobalData.optManager.AddToDirtyList(this.BlockID);
        let hookObj = this.hooks.length ? GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false) : null;
        if (hookObj && hookObj instanceof ShapeContainer) {
          hookObj.flags = Utils2.SetFlag(hookObj.flags, ConstantData.ObjFlags.SEDO_Obj1, true);
          GlobalData.optManager.SetLinkFlag(hookObj.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
        }
        if (offsetX || offsetY) {
          this.OffsetShape(offsetX, offsetY);
        }
      }
      this.flags = Utils2.SetFlag(this.flags, ConstantData.ObjFlags.SEDO_Obj1, false);
    }

    console.log("= S.ShapeContainer Pr_Format - Output:", { ContainerList: lm });
  }

  OnConnect(eventId: string, target: any, paramA: any, paramR: any, paramI: any): void {
    console.log("= S.ShapeContainer OnConnect - Input:", { eventId, target, paramA, paramR, paramI });

    if (target instanceof ShapeContainer && (this.zListIndex == null || this.zListIndex < 0)) {
      const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(eventId);
      if (svgElement) {
        this.zListIndex = GlobalData.optManager.svgObjectLayer.GetElementIndex(svgElement);
        GlobalData.optManager.svgObjectLayer.MoveElementToFront(svgElement);
      }
    }

    console.log("= S.ShapeContainer OnConnect - Output:", { zListIndex: this.zListIndex });
  }

  Pr_GetShapeConnectorInfo(event: any) {
    console.log("= S.ShapeContainer Pr_GetShapeConnectorInfo - Input:", { event });

    const containerList = this.ContainerList;
    const isSparse = containerList.flags & ConstantData.ContainerListFlags.Sparse;
    const isAdjust = containerList.flags & ConstantData.ContainerListFlags.Adjust;
    const result: any[] = [];
    const actionTriggerType = ConstantData.ActionTriggerType;

    if (isSparse || !isAdjust) {
      console.log("= S.ShapeContainer Pr_GetShapeConnectorInfo - Output:", null);
      return null;
    }

    const connectorInfo = containerList.Arrangement === ConstantData.ContainerListArrangements.Row
      ? {
        knobID: actionTriggerType.CONTAINER_ADJ,
        cursorType: Element.CursorType.RESIZE_R,
        knobData: 0,
        hook: event.hookpt,
        polyType: "horizontal"
      }
      : {
        knobID: actionTriggerType.CONTAINER_ADJ,
        cursorType: Element.CursorType.RESIZE_B,
        knobData: 0,
        hook: event.hookpt,
        polyType: "vertical"
      };

    result.push(connectorInfo);
    console.log("= S.ShapeContainer Pr_GetShapeConnectorInfo - Output:", result);
    return result;
  }


  GetListOfEnclosedObjects(options: any): any[] {
    console.log("= S.ShapeContainer GetListOfEnclosedObjects - Input:", options);

    const enclosedObjects: any[] = [];

    console.log("= S.ShapeContainer GetListOfEnclosedObjects - Output:", enclosedObjects);
    return enclosedObjects;
  }

  ChangeTarget(
    event: any,
    targetId: number,
    anchor: any,
    rect: any,
    point: { x: number; y: number },
    flag: any
  ) {
    console.log("= S.ShapeContainer ChangeTarget - Input:", {
      event,
      targetId,
      anchor,
      rect,
      point,
      flag,
    });

    const containerFlags = ConstantData.ContainerListFlags;
    const isContainerInCell = GlobalData.optManager.ContainerIsInCell(this);

    // Function to insert a new shape into the container list at a specified index.
    const insertContainerShape = (id: number, index: number) => {
      const list = currentContainerList.List;
      const listLength = list.length;
      const newShape = new ContainerListShape();
      newShape.id = id;
      if (index >= listLength) {
        list.push(newShape);
      } else {
        const extraValue = list[index].extra;
        list[index].extra = 0;
        newShape.extra = extraValue;
        list.splice(index, 0, newShape);
      }
    };

    // Function to remove a shape from the container list by id.
    const removeContainerShape = (id: number) => {
      const list = currentContainerList.List;
      const listLength = list.length;
      let removeIndex = -1;
      for (let j = 0; j < listLength; j++) {
        if (list[j].id === id) {
          removeIndex = j;
          break;
        }
      }
      if (removeIndex >= 0) {
        list.splice(removeIndex, 1);
      }
    };

    // Function to adjust container shapes and return offsets.
    const adjustContainerShapes = (id: number, pos: { x: number; y: number }) => {
      const container = currentContainerList;
      const list = container.List;
      let deltaX = 0;
      let deltaY = 0;
      const markCols: boolean[] = [];
      const markRows: boolean[] = [];

      for (let row = 0; row < container.ndown; row++) {
        for (let col = 0; col < container.nacross; col++) {
          const index = container.nacross * row + col;
          const item = list[index];
          if (item.id === id) {
            item.id = -1;
          }
          if (item.id >= 0) {
            markCols[col] = true;
            markRows[row] = true;
          }
        }
      }

      let firstFullCol = -1;
      for (let col = 0; col < container.nacross; col++) {
        if (markCols[col] === true && firstFullCol < 0) {
          firstFullCol = col;
        }
      }
      let lastFullCol = -1;
      for (let col = container.nacross - 1; col >= 0; col--) {
        if (markCols[col] === true && lastFullCol < 0) {
          lastFullCol = col;
        }
      }
      let firstFullRow = -1;
      if (markRows[0] == null && pos && pos.y === 0) {
        markRows[0] = true;
      }
      for (let row = 0; row < container.ndown; row++) {
        if (markRows[row] === true && firstFullRow < 0) {
          firstFullRow = row;
        }
      }
      let lastFullRow = -1;
      for (let row = container.ndown - 1; row >= 0; row--) {
        if (markRows[row] === true && lastFullRow < 0) {
          lastFullRow = row;
        }
      }
      for (let row = container.ndown - 1; row > lastFullRow; row--) {
        if (container.ndown > 1) {
          list.splice(row * container.nacross, container.nacross);
          container.ndown--;
        }
      }
      if (isContainerInCell == null) {
        for (let row = firstFullRow - 1; row >= 0; row--) {
          if (container.ndown > 1) {
            list.splice(row * container.nacross, container.nacross);
            container.ndown--;
            deltaY--;
          }
        }
      }
      for (let col = container.nacross - 1; col > lastFullCol; col--) {
        if (container.nacross > 1) {
          for (let row = container.ndown - 1; row >= 0; row--) {
            list.splice(container.nacross * row + col, 1);
          }
          container.nacross--;
        }
      }
      if (isContainerInCell == null) {
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
    const isSparse = currentContainerList.flags & ConstantData.ContainerListFlags.Sparse;
    let targetIndex = -1;
    for (let idx = 0, len = list.length; idx < len; idx++) {
      if (list[idx].id === targetId) {
        targetIndex = idx;
        break;
      }
    }

    if (targetId != null) {
      const targetObj = GlobalData.optManager.GetObjectPtr(targetId, false);
      targetObj.OnDisconnect(targetId, this);

      let dummyVar, dummyY, dummyD;
      if (isSparse) {
        let adjustOffsets;
        if (flag) {
          if (targetIndex >= 0) {
            adjustOffsets = adjustContainerShapes(targetId, point);
            point.x += adjustOffsets.dx;
            point.y += adjustOffsets.dy;
          }
          // Insert empty rows/columns when needed.
          const adjustGrid = ((x: number, y: number) => {
            const container = currentContainerList;
            const listRef = container.List;
            let deltaCols = 0;
            let deltaRows = 0;
            let tempCounter = 0;
            const arrangements = ConstantData.ContainerListArrangements;

            // Function to insert additional grid items.
            const insertGridItems = (xPos: number, yPos: number) => {
              let colIndex: number;
              // Insert extra columns if needed.
              if (yPos < 0 || xPos < 0) {
                // Return offsets if negative position.
                return { dx: deltaCols, dy: deltaRows };
              }
              if (container.Arrangement === arrangements.Column) {
                let newCol = -1;
                for (let row = xPos + 1; row < container.ndown; row++) {
                  const idx = row * container.nacross + yPos;
                  if (listRef[idx].id < 0 && newCol < 0) {
                    newCol = row;
                  }
                }
                if (newCol < 0) {
                  for (let i = 0; i < container.nacross; i++) {
                    const newShape = new ContainerListShape();
                    listRef.push(newShape);
                  }
                  container.ndown++;
                  newCol = container.ndown - 1;
                }
                for (let row = newCol; row > xPos; row--) {
                  const fromIdx = (row - 1) * container.nacross + yPos;
                  const toIdx = row * container.nacross + yPos;
                  listRef[toIdx].id = listRef[fromIdx].id;
                }
                listRef[xPos * container.nacross + yPos].id = -1;
              } else if (container.Arrangement === arrangements.Row) {
                let newRow = -1;
                for (let col = yPos + 1; col < container.nacross; col++) {
                  const idx = xPos * container.nacross + col;
                  if (listRef[idx].id < 0 && newRow < 0) {
                    newRow = col;
                  }
                }
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
                for (let col = newRow; col > yPos; col--) {
                  const fromIdx = xPos * container.nacross + (col - 1);
                  const toIdx = xPos * container.nacross + col;
                  listRef[toIdx].id = listRef[fromIdx].id;
                }
                listRef[xPos * container.nacross + yPos].id = -1;
              }
              return { dx: deltaCols, dy: deltaRows };
            };

            if (!(x >= currentContainerList.nacross || (y >= currentContainerList.ndown && x >= 0))) {
              if (y < 0 || x < 0) {
                return insertGridItems(x, y);
              }
              const idx = currentContainerList.nacross * y + x;
              if (listRef[idx].id >= 0) {
                insertGridItems(x, y);
              }
            }
          })(point.x, point.y);
          if (point.y < 0) {
            point.y = 0;
          }
          if (point.x < 0) {
            point.x = 0;
          }
          // Set the target id into the proper spot in the container list.
          ((id: number, xPos: number, yPos: number) => {
            const container = currentContainerList;
            const listRef = container.List;
            if (yPos >= container.ndown) {
              for (let r = container.ndown; r <= yPos; r++) {
                for (let n = 0; n < container.nacross; n++) {
                  const newShape = new ContainerListShape();
                  listRef.push(newShape);
                }
                container.ndown = yPos + 1;
              }
            }
            if (xPos >= container.nacross) {
              const oldNacross = container.nacross;
              for (let r = container.ndown - 1; r >= 0; r--) {
                const insertIndex = oldNacross * (r + 1);
                for (let n = oldNacross; n <= xPos; n++) {
                  const newShape = new ContainerListShape();
                  listRef.splice(insertIndex, 0, newShape);
                }
              }
              container.nacross = xPos + 1;
            }
            const index = yPos * container.nacross + xPos;
            listRef[index].id = id;
          })(targetId, point.x, point.y);
          GlobalData.optManager.PutInFrontofObject(containerObj.BlockID, targetId);
          targetObj.moreflags = Utils2.SetFlag(
            targetObj.moreflags,
            ConstantData.ObjMoreFlags.SED_MF_ContainerChild,
            true
          );
        } else {
          // Non-sparse: simply adjust the container list.
          const offsets = adjustContainerShapes(targetId, null);
          targetObj.moreflags = Utils2.SetFlag(
            targetObj.moreflags,
            ConstantData.ObjMoreFlags.SED_MF_ContainerChild,
            false
          );
          GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
        }

        let offsetX = 0,
          offsetY = 0;
        if (flag) {
          if (targetIndex >= 0) {
            dummyY = point.y;
            if (dummyY > targetIndex) {
              insertContainerShape(targetId, point.y);
              removeContainerShape(targetId);
            } else if (dummyY < targetIndex) {
              removeContainerShape(targetId);
              insertContainerShape(targetId, dummyY);
            } else {
              insertContainerShape(targetId, point.y);
              GlobalData.optManager.PutInFrontofObject(containerObj.BlockID, targetId);
              targetObj.moreflags = Utils2.SetFlag(
                targetObj.moreflags,
                ConstantData.ObjMoreFlags.SED_MF_ContainerChild,
                true
              );
            }
          } else {
            removeContainerShape(targetId);
            targetObj.moreflags = Utils2.SetFlag(
              targetObj.moreflags,
              ConstantData.ObjMoreFlags.SED_MF_ContainerChild,
              false
            );
            GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
          }
        }

        if (isSparse) {
          // Update hook positions for each object in the container list.
          (() => {
            const container = currentContainerList;
            const listRef = container.List;
            for (let row = 0; row < container.ndown; row++) {
              for (let col = 0; col < container.nacross; col++) {
                const idx = row * container.nacross + col;
                const obj = GlobalData.optManager.GetObjectPtr(listRef[idx].id, false);
                if (obj && obj.hooks.length) {
                  const hook = obj.hooks[0].connect;
                  if (hook.x !== col || hook.y !== row) {
                    const objFront = GlobalData.optManager.GetObjectPtr(listRef[idx].id, true);
                    objFront.hooks[0].connect.x = col;
                    objFront.hooks[0].connect.y = row;
                  }
                }
              }
            }
          })();
        } else {
          (() => {
            const listRef = currentContainerList.List;
            for (let j = 0, len = listRef.length; j < len; j++) {
              const obj = GlobalData.optManager.GetObjectPtr(listRef[j].id, true);
              if (obj && obj.hooks.length) {
                obj.hooks[0].connect.y = j;
              }
            }
          })();
        }

        this.Pr_Format();
      } else {
        this.flags = Utils2.SetFlag(this.flags, ConstantData.ObjFlags.SEDO_Obj1, true);
      }

      console.log("= S.ShapeContainer ChangeTarget - Output:", {
        containerList: this.ContainerList,
        targetId,
        point,
      });
    }
  }

}

export default ShapeContainer
