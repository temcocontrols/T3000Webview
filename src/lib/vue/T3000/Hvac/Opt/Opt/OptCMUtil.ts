
import CursorConstant from "../../Data/Constant/CursorConstant";
import NvConstant from '../../Data/Constant/NvConstant';
import OptConstant from "../../Data/Constant/OptConstant";
import T3Constant from "../../Data/Constant/T3Constant";
import StateConstant from "../../Data/State/StateConstant";
import T3Gv from '../../Data/T3Gv';
import Point from '../../Model/Point';
import '../../Util/T3Hammer';
import Utils2 from "../../Util/Utils2";
import ObjectUtil from "../Data/ObjectUtil";
import UIUtil from "../UI/UIUtil";
import DrawUtil from "./DrawUtil";
import SelectUtil from "./SelectUtil";
import SvgUtil from "./SvgUtil";
import DSUtil from '../DS/DSUtil';
import Instance from '../../Data/Instance/Instance';
import LogUtil from '../../Util/LogUtil';
import LayerUtil from './LayerUtil';
import Utils1 from '../../Util/Utils1';

class OptCMUtil {

  /**
   * Determines the current type of content stored in the clipboard
   * This function checks various application states and clipboard contents
   * to determine what kind of data is currently available for pasting.
   *
   * @returns The identified clipboard content type (Text, LM, Table, or None)
   */
  static GetClipboardType() {
    LogUtil.Debug('O.Opt GetClipboardType - Input: No parameters');

    // Get the text edit session data
    const textEditData = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

    // Initialize clipboard
    T3Gv.clipboard.Get();

    let clipboardType;

    // Check if text or note editing is currently active
    const isTextEditActive = textEditData.theActiveTextEditObjectID !== -1;
    const isNoteEditActive = T3Gv.opt.bInNoteEdit;

    if (isTextEditActive || isNoteEditActive) {
      // Determine clipboard type while in text/note editing mode
      if (T3Gv.opt.textClipboard && T3Gv.opt.textClipboard.text) {
        clipboardType = T3Constant.ClipboardType.Text;
      } else {
        clipboardType = T3Constant.ClipboardType.None;
      }
    }
    // Check for Layout Manager content in clipboard
    else if (T3Gv.opt.header.ClipboardBuffer &&
      T3Gv.opt.header.ClipboardType === T3Constant.ClipboardType.LM) {
      clipboardType = T3Constant.ClipboardType.LM;
    }
    // Check for text selection with available clipboard text
    else if (SelectUtil.GetTargetSelect() >= 0 &&
      T3Gv.opt.textClipboard &&
      T3Gv.opt.textClipboard.text) {
      clipboardType = T3Constant.ClipboardType.Text;
    }
    // Default: no valid clipboard content
    else {
      clipboardType = T3Constant.ClipboardType.None;
    }

    LogUtil.Debug('O.Opt GetClipboardType - Output:', clipboardType);
    return clipboardType;
  }

  /**
   * Converts pixel values to point values for font size calculations
   * This function is used when displaying font sizes that are stored in pixels but need to be shown in points.
   * The conversion uses the standard DPI relationship between pixels and points (72 points per inch).
   *
   * @param pixelValue - The font size in pixels to convert
   * @returns The equivalent font size in points, rounded to the nearest 0.5
   */
  static PixelstoPoints(pixelValue) {
    return Math.floor(100 * pixelValue / 72 + 0.5);
  }

  /**
  * Sets a flag on a link
  * @param targetId - ID of the target object
  * @param flagValue - Flag value to set
  * @returns 0 on success, 1 on failure
  */
  static SetLinkFlag(targetId, flagValue) {
    LogUtil.Debug("O.Opt SetLinkFlag - Input:", { targetId, flagValue });

    const links = ObjectUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false);

    if (links == null) {
      LogUtil.Debug("O.Opt SetLinkFlag - Output: 1 (links not found)");
      return 1;
    }

    // Find the link for the target object
    let linkIndex = this.FindLink(links, targetId, true);

    if (linkIndex >= 0) {
      // Get a preserved copy of the links for modification
      const preservedLinks = ObjectUtil.GetObjectPtr(T3Gv.opt.linksBlockId, true);

      // Get the target object and ensure it exists
      const targetObject = ObjectUtil.GetObjectPtr(targetId, true);
      if (targetObject == null) {
        LogUtil.Debug("O.Opt SetLinkFlag - Output: 1 (target object not found)");
        return 1;
      }

      // Update the target object
      targetObject.ChangeTarget(targetId, null, null, null, null, false);

      // Set the flag for all links to this target
      while (linkIndex < preservedLinks.length && preservedLinks[linkIndex].targetid == targetId) {
        preservedLinks[linkIndex].flags = Utils2.SetFlag(preservedLinks[linkIndex].flags, flagValue, true);
        linkIndex++;
      }
    }

    LogUtil.Debug("O.Opt SetLinkFlag - Output: 0 (success)");
    return 0;
  }

  static FindLink(links, targetId, exactMatchOnly) {
    LogUtil.Debug("O.Opt FindLink - Input:", { links, targetId, exactMatchOnly });

    if (links.length === 0) {
      const result = exactMatchOnly ? -1 : 0;
      LogUtil.Debug("O.Opt FindLink - Output (empty links):", result);
      return result;
    }

    for (let index = 0; index < links.length; index++) {
      // If we find an exact match for the target ID
      if (links[index].targetid === targetId) {
        LogUtil.Debug("O.Opt FindLink - Output (exact match):", index);
        return index;
      }

      // If we're not requiring an exact match and found a target ID that's greater
      // than what we're looking for (used for sorted insertion)
      if (!exactMatchOnly && links[index].targetid > targetId) {
        LogUtil.Debug("O.Opt FindLink - Output (insertion point):", index);
        return index;
      }
    }

    // No match found - return appropriate value based on exactMatchOnly
    const result = exactMatchOnly ? -1 : links.length;
    LogUtil.Debug("O.Opt FindLink - Output (no match):", result);
    return result;
  }

  static SetEditMode(stateMode, cursorType?, shouldAddToList?, preserveExisting?) {
    LogUtil.Debug("O.Opt SetEditMode - Input:", { stateMode, cursorType, shouldAddToList, preserveExisting });

    let actualCursorType = cursorType;

    // Initialize edit mode list if needed
    if (T3Gv.opt.editModeList && (shouldAddToList || preserveExisting)) {
      // Keep existing list
    } else {
      T3Gv.opt.editModeList = [];
    }

    // Notify operation mng if available
    if (T3Gv.wallOpt && T3Gv.wallOpt.NotifySetEditMode) {
      T3Gv.wallOpt.NotifySetEditMode(stateMode);
    }

    // If no cursor type provided, determine it based on state mode
    if (!actualCursorType) {
      switch (stateMode) {
        case NvConstant.EditState.Stamp:
          actualCursorType = CursorConstant.CursorType.Stamp;
          break;
        case NvConstant.EditState.Text:
          actualCursorType = CursorConstant.CursorType.Text;
          break;
        case NvConstant.EditState.FormatPaint:
          actualCursorType = CursorConstant.CursorType.Paint;
          break;
        case NvConstant.EditState.LinkConnect:
          actualCursorType = CursorConstant.CursorType.Anchor;
          break;
        case NvConstant.EditState.LinkJoin:
          actualCursorType = CursorConstant.CursorType.EditClose;
          break;
        case NvConstant.EditState.Edit:
          actualCursorType = CursorConstant.CursorType.Edit;
          break;
        case NvConstant.EditState.DragControl:
          actualCursorType = CursorConstant.CursorType.NeswResize;
          break;
        case NvConstant.EditState.DragShape:
          actualCursorType = CursorConstant.CursorType.Move;
          break;
        case NvConstant.EditState.Grab:
          actualCursorType = CursorConstant.CursorType.Grab;
          break;
        default:
          actualCursorType = CursorConstant.CursorType.Default;
      }
    }

    // Set the cursor
    T3Gv.opt.svgDoc.SetCursor(actualCursorType);

    // Update edit mode list
    if (shouldAddToList || !T3Gv.opt.editModeList.length) {
      T3Gv.opt.editModeList.push({
        mode: stateMode,
        cursor: actualCursorType
      });
    } else {
      T3Gv.opt.editModeList[T3Gv.opt.editModeList.length - 1].mode = stateMode;
      T3Gv.opt.editModeList[T3Gv.opt.editModeList.length - 1].cursor = actualCursorType;
    }

    // Update cursors for highlighted shape
    if (T3Gv.opt.curHiliteShape >= 0) {
      const highlightedObject = T3Gv.stdObj.GetObject(T3Gv.opt.curHiliteShape);
      if (highlightedObject) {
        highlightedObject.Data.SetCursors();
      }
    }

    LogUtil.Debug("O.Opt SetEditMode - Output:", { mode: stateMode, cursor: actualCursorType });
  }

  static CancelOperation(type?: any): void {
    LogUtil.Debug("O.Opt CancelOperation - Input: crtOpt =", T3Gv.opt.crtOpt);
    switch (T3Gv.opt.crtOpt) {
      case OptConstant.OptTypes.None:
        break;
      case OptConstant.OptTypes.Stamp:
        DrawUtil.CancelObjectStamp(true);
        break;
      case OptConstant.OptTypes.StampTextOnTap:
        DrawUtil.CancelObjectStampTextOnTap(true);
        break;
      case OptConstant.OptTypes.DragDrop:
        DrawUtil.CancelObjectDragDrop(true);
        break;
      case OptConstant.OptTypes.Draw:
        DrawUtil.CancelObjectDraw();
        break;
      case OptConstant.OptTypes.FormatPainter:
        UIUtil.SetFormatPainter(true, false);
        break;
      case OptConstant.OptTypes.AddCorner:
        if (T3Gv.wallOpt && T3Gv.wallOpt.AddCorner) {
          this.ResetHammerGesture('dragstart', T3Gv.wallOpt.AddCorner, T3Gv.Evt_ShapeDragStart);
        }
        break;
    }
    LogUtil.Debug("O.Opt CancelOperation - Output: completed");
  }

  /**
   * Resets Hammer.js gesture events for objects in the active visible Z-list
   * This function iterates through all visible objects in the active layer and
   * resets the specified Hammer gesture event by replacing the handler with a new one.
   * This is useful when changing interaction modes or canceling operations.
   *
   * @param eventType - The Hammer gesture event type to reset (e.g., 'dragstart', 'tap')
   * @param currentHandler - The current handler function to be replaced
   * @param newHandler - The new handler function to assign to the event
   * @returns void
   */
  static ResetHammerGesture(eventType: string, currentHandler: Function, newHandler: Function): void {
    LogUtil.Debug("O.Opt ResetHammerGesture - Input:", { eventType, currentHandler, newHandler });

    const visibleObjects = LayerUtil.ActiveVisibleZList();

    for (let objectIndex = 0; objectIndex < visibleObjects.length; objectIndex++) {
      const svgObject = T3Gv.opt.svgObjectLayer.GetElementByID(visibleObjects[objectIndex]);
      const eventProxy = svgObject.svgObj.SDGObj.GetEventProxy();
      let handlerExists = false;

      // Check if the current handler exists on this object
      for (let handlerIndex = 0; handlerIndex < eventProxy.eventHandlers.length; handlerIndex++) {
        if (eventProxy.eventHandlers[handlerIndex].handler === currentHandler) {
          handlerExists = true;
          break;
        }
      }

      // If the handler exists, reset the event with the new handler
      if (handlerExists) {
        eventProxy.on(eventType, newHandler);
      }
    }

    LogUtil.Debug("O.Opt ResetHammerGesture - Output: Hammer gestures reset");
  }

  /**
   * Rebuilds URLs for objects in the current state manager, handling blob URLs for images and tables.
   * This function processes stored objects and ensures that blob URLs are properly created or deleted
   * based on the state operations (create or delete).
   *
   * @param stateId - The ID of the state to process
   * @param isNextState - If true, process the next state instead of current state
   * @returns void
   */
  static RebuildURLs(stateId: number, isNextState: boolean): void {
    LogUtil.Debug("O.Opt RebuildURLs - Input:", { stateId, isNextState });

    let storedObjectCount: number;
    let objectIndex: number;
    let storedObject: any;
    let objectInstance: any;
    let objectData: any;
    let blobBytes: any;
    let imageType: string;
    let tableObject: any;
    let tableData: any;
    let storedData: any;

    // If processing the next state, handle CREATE operations
    if (isNextState) {
      storedObjectCount = T3Gv.state.states[stateId + 1].storedObjects.length;

      for (objectIndex = 0; objectIndex < storedObjectCount; objectIndex++) {
        storedObject = T3Gv.state.states[stateId + 1].storedObjects[objectIndex];

        // Handle drawing objects with CREATE operations
        if (storedObject.Type === StateConstant.StoredObjectType.BaseDrawObject) {
          if (storedObject.stateOptTypeId === StateConstant.StateOperationType.CREATE) {
            objectData = storedObject.Data;

            if (this.IsBlobURL(objectData.ImageURL)) {
              objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);

              if (objectInstance) {
                objectData = objectInstance.Data;
                blobBytes = objectData.GetBlobBytes();
                imageType = DSUtil.GetImageBlobType(blobBytes.ImageDir);
                objectData.ImageURL = DSUtil.MakeURL(null, blobBytes.Bytes, imageType);
              }
            }
          }
        }
      }
    }

    // Process current state objects
    storedObjectCount = T3Gv.state.states[stateId].storedObjects.length;

    for (objectIndex = 0; objectIndex < storedObjectCount; objectIndex++) {
      storedObject = T3Gv.state.states[stateId].storedObjects[objectIndex];

      // Handle drawing objects
      if (storedObject.Type === StateConstant.StoredObjectType.BaseDrawObject) {
        // Handle DELETE operations
        if (storedObject.stateOptTypeId === StateConstant.StateOperationType.DELETE) {
          if (!isNextState) {
            objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);

            if (objectInstance) {
              objectData = objectInstance.Data;

              if (objectData.BlobBytesID >= 0 && this.IsBlobURL(objectData.ImageURL)) {
                blobBytes = objectData.GetBlobBytes();
                imageType = DSUtil.GetImageBlobType(blobBytes.ImageDir);
                objectData.ImageURL = DSUtil.MakeURL(null, blobBytes.Bytes, imageType);
              }
            }
          }
        }
        // Handle other operations
        else {
          storedData = storedObject.Data;
          objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);

          if (this.IsBlobURL(storedData.ImageURL)) {
            if (objectInstance) {
              objectData = objectInstance.Data;

              if (storedData.ImageURL !== objectData.ImageURL) {
                this.DeleteURL(storedData.ImageURL);

                if (this.IsBlobURL(objectData.ImageURL)) {
                  blobBytes = objectData.GetBlobBytes();

                  if (blobBytes) {
                    imageType = DSUtil.GetImageBlobType(blobBytes.ImageDir);

                    if (this.IsBlobURL(objectData.ImageURL)) {
                      objectData.ImageURL = DSUtil.MakeURL(null, blobBytes.Bytes, imageType);
                    }
                  }
                }
              }
            } else {
              this.DeleteURL(storedData.ImageURL);
            }
          } else if (objectInstance) {
            objectData = objectInstance.Data;

            if (this.IsBlobURL(objectData.ImageURL)) {
              blobBytes = objectData.GetBlobBytes();

              if (blobBytes) {
                imageType = DSUtil.GetImageBlobType(blobBytes.ImageDir);

                if (this.IsBlobURL(objectData.ImageURL)) {
                  objectData.ImageURL = DSUtil.MakeURL(null, blobBytes.Bytes, imageType);
                }
              }
            }
          }
        }
      }
    }

    LogUtil.Debug("O.Opt RebuildURLs - Output: URLs rebuilt for state:", stateId);
  }

  /**
   * Checks if a URL is a blob URL
   * @param url - The URL to check
   * @returns True if the URL is a blob URL, false otherwise
   */
  static IsBlobURL(url) {
    LogUtil.Debug("O.Opt IsBlobURL - Input:", url);

    const isBlobUrl = !!(url && url.length > 0 && 'blob:' === url.substring(0, 5));

    LogUtil.Debug("O.Opt IsBlobURL - Output:", isBlobUrl);
    return isBlobUrl;
  }

  /**
   * Converts a shape object to a polyline representation
   * This function takes a shape and converts it to a polyline format, handling scaling,
   * rotation, and positioning. It can work with existing polyline data or generate new polyline
   * representation from shape data.
   *
   * @param shapeId - The ID of the shape object to convert
   * @param createContainer - If true, creates a PolyLineContainer, otherwise creates a PolyLine
   * @param skipSelection - If true, skips selection of the resulting object
   * @param existingShape - Optional existing shape object to use instead of fetching by ID
   * @returns The converted polyline object or null if conversion fails
   */
  static ShapeToPolyLine(shapeId, createContainer, skipSelection, existingShape) {
    let shapeObject;
    let polylineObject;
    let segmentCount;
    let dataPreserved = false;
    const selectedObjects = [];
    let originalFrame = {};

    if (existingShape) {
      shapeObject = existingShape;
      dataPreserved = true;
      // originalFrame = $.extend(true, {}, shapeObject.Frame);
      originalFrame = Utils1.DeepCopy(shapeObject.Frame);
    } else {
      shapeObject = ObjectUtil.GetObjectPtr(shapeId, false);

      if (shapeObject.polylist == null) {
        shapeObject.polylist = shapeObject.GetPolyList();
        shapeObject.StartPoint = {};
        shapeObject.EndPoint = {};
      } else {
        dataPreserved = true;
      }

      const preservedBlock = T3Gv.stdObj.PreserveBlock(shapeId);
      if (preservedBlock == null) {
        return;
      }

      shapeObject = preservedBlock.Data;
      // originalFrame = $.extend(true, {}, shapeObject.Frame);
      originalFrame = Utils1.DeepCopy(shapeObject.Frame);
    }

    if (dataPreserved) {
      if (!shapeObject.polylist) {
        return null;
      }

      T3Gv.opt.GetClosedPolyDim(shapeObject);

      if (!Utils2.IsEqual(shapeObject.polylist.dim.x, originalFrame.width)) {
        const tempObject = Utils2.DeepCopy(shapeObject);
        // tempObject.inside = $.extend(true, {}, shapeObject.Frame);
        tempObject.inside = Utils1.DeepCopy(shapeObject.Frame);

        Instance.Shape.PolyLine.prototype.ScaleObject.call(
          tempObject,
          0,
          0,
          0,
          0,
          0,
          0
        );

        shapeObject.polylist = tempObject.polylist;
      }
    }

    segmentCount = shapeObject.polylist.segs.length;

    shapeObject.StartPoint.x =
      shapeObject.Frame.x + shapeObject.polylist.segs[0].pt.x + shapeObject.polylist.offset.x;
    shapeObject.StartPoint.y =
      shapeObject.Frame.y + shapeObject.polylist.segs[0].pt.y + shapeObject.polylist.offset.y;

    shapeObject.EndPoint.x =
      shapeObject.Frame.x + shapeObject.polylist.segs[segmentCount - 1].pt.x + shapeObject.polylist.offset.x;
    shapeObject.EndPoint.y =
      shapeObject.Frame.y + shapeObject.polylist.segs[segmentCount - 1].pt.y + shapeObject.polylist.offset.y;

    polylineObject = createContainer
      ? new Instance.Shape.PolyLineContainer(shapeObject)
      : new Instance.Shape.PolyLine(shapeObject);

    polylineObject.BlockID = shapeObject.BlockID;
    polylineObject.polylist.Shape_Rotation = shapeObject.RotationAngle;
    polylineObject.polylist.Shape_DataID = shapeObject.DataID;
    polylineObject.RotationAngle = 0;
    polylineObject.DataID = -1;

    if (!existingShape) {
      preservedBlock.Data = polylineObject;
    }

    if (!skipSelection) {
      ObjectUtil.AddToDirtyList(shapeId);
      SvgUtil.RenderDirtySVGObjects();
      selectedObjects.push(shapeId);
      SelectUtil.SelectObjects(selectedObjects, false, true);
    }

    // polylineObject.inside = $.extend(true, {}, shapeObject.Frame);
    polylineObject.inside = Utils1.DeepCopy(shapeObject.Frame);

    return polylineObject;
  }

  /**
   * Rearranges objects in a layer's z-order by moving an object in front of another
   * This function manipulates the z-order of objects in the active layer by changing
   * their positions in the layer's zList array.
   *
   * @param targetObjectId - The object ID that will be the reference position
   * @param objectToMoveId - The object ID that will be moved in front of the target
   */
  static PutInFrontofObject(targetObjectId, objectToMoveId) {
    const layerManager = ObjectUtil.GetObjectPtr(T3Gv.opt.layersManagerBlockId, true);
    const zList = layerManager.layers[layerManager.activelayer].zList;
    const targetIndex = zList.indexOf(targetObjectId);
    const objectToMoveIndex = zList.indexOf(objectToMoveId);

    if (targetIndex < 0 || objectToMoveIndex < 0) {
      return;
    }

    if (objectToMoveIndex < targetIndex) {
      // Move up in z-order
      for (let i = objectToMoveIndex; i < targetIndex; i++) {
        zList[i] = zList[i + 1];
        ObjectUtil.AddToDirtyList(zList[i]);
      }
      zList[targetIndex] = objectToMoveId;
      ObjectUtil.AddToDirtyList(objectToMoveId);
    } else {
      // Move down in z-order
      for (let i = objectToMoveIndex; i > targetIndex + 1; i--) {
        zList[i] = zList[i - 1];
        ObjectUtil.AddToDirtyList(zList[i]);
      }
      zList[targetIndex + 1] = objectToMoveId;
      ObjectUtil.AddToDirtyList(objectToMoveId);
    }
  }

  /**
   * Inserts "hop" segments into a polyline to represent line jumps/crossovers
   * This function finds appropriate places in the polyline to insert visual breaks
   * or "hops" where the line should appear to jump over other elements.
   *
   * @param hopObject - The object containing hop information
   * @param pointsArray - The array of points representing the polyline
   * @param startIndex - The starting index for insertion
   * @returns Object with success status and the new number of points
   */
  static InsertHops(hopObject, pointsArray, startIndex) {
    let segmentIndex, insertSegment, hopStart, currentIndex;
    let endIndex, consecutiveIndex, numPoints, hopWidth, hopHeight;
    let result, startPoint = new Point(), endPoint = new Point();
    let hopStartPt = new Point(), hopEndPt = new Point();
    let hopPoints = [];
    const sdData = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    hopWidth = sdData.hopdim.x;
    hopHeight = sdData.hopdim.y;
    const hopCount = hopObject.hoplist.nhops;

    // Process hops in reverse order to handle nested hops correctly
    for (segmentIndex = hopCount - 1; segmentIndex >= 0; segmentIndex--) {
      if (!hopObject.hoplist.hops[segmentIndex].cons) {
        insertSegment = hopObject.hoplist.hops[segmentIndex].segment;
        hopStart = segmentIndex;
        consecutiveIndex = segmentIndex;

        // Find consecutive hops
        while (hopStart > 0 && hopObject.hoplist.hops[hopStart - 1].cons) {
          insertSegment = hopObject.hoplist.hops[hopStart - 1].segment;
          consecutiveIndex = hopStart - 1;
          hopStart--;
        }

        if (insertSegment >= startIndex) {
          return { bSuccess: false, npts: startIndex };
        }

        // Insert points for the hop
        result = this.InsertPoints(pointsArray, startIndex, insertSegment, 2);
        startIndex = result.npts;

        if (result.bSuccess) {
          pointsArray[insertSegment] = {
            x: hopObject.hoplist.hops[consecutiveIndex].pt.x,
            y: hopObject.hoplist.hops[consecutiveIndex].pt.y
          };

          pointsArray[insertSegment + 1] = {
            x: hopObject.hoplist.hops[segmentIndex].pt.x,
            y: hopObject.hoplist.hops[segmentIndex].pt.y
          };

          // Handle segment position adjustment
          if (insertSegment < insertSegment) {
            for (currentIndex = insertSegment; currentIndex < startIndex; currentIndex++) {
              pointsArray[insertSegment + currentIndex - insertSegment] = {
                x: pointsArray[currentIndex].x,
                y: pointsArray[currentIndex].y
              };
            }
            startIndex -= (insertSegment - insertSegment);
          }

          insertSegment = insertSegment;
          endIndex = insertSegment + 1;
          currentIndex = numPoints = insertSegment + 1;

          // Trim polyline for start arrow
          result = this.PolyTrimForArrow(pointsArray, 0, numPoints, hopWidth, hopWidth, startPoint, endPoint, false);
          numPoints = result.npts;
          startPoint = result.spt;
          endPoint = result.ept;

          if (numPoints < currentIndex) {
            for (currentIndex = currentIndex; currentIndex < startIndex; currentIndex++) {
              pointsArray[numPoints + currentIndex - currentIndex] = {
                x: pointsArray[currentIndex].x,
                y: pointsArray[currentIndex].y
              };
            }
            startIndex -= (currentIndex - numPoints);
            endIndex -= (currentIndex - numPoints);
          }

          hopStartPt = { x: startPoint.x, y: startPoint.y };

          // Process end points
          currentIndex = numPoints = startIndex - endIndex;
          result = this.PolyTrimForArrow(pointsArray, endIndex, numPoints, hopWidth, hopWidth, startPoint, endPoint, true);
          numPoints = result.npts;
          startPoint = result.spt;

          if (numPoints < currentIndex) {
            startIndex -= (currentIndex - numPoints);
          }

          hopEndPt = { x: (endPoint = result.ept).x, y: endPoint.y };

          // Build the visual hop
          result = this.BuildHop(sdData.hopstyle, hopHeight, hopStartPt, hopEndPt, numPoints);
          hopPoints = result.pts;
          numPoints = result.npts;

          // Insert the hop points
          result = this.InsertPoints(pointsArray, startIndex, numPoints, numPoints);
          startIndex = result.npts;

          if (result.bSuccess) {
            for (currentIndex = 0; currentIndex < numPoints; currentIndex++) {
              pointsArray[numPoints + currentIndex] = {
                x: hopPoints[currentIndex].x,
                y: hopPoints[currentIndex].y
              };
            }
          }
        }
      }
    }

    return { bSuccess: true, npts: startIndex };
  }

  /**
   * Trims a polyline to accommodate arrow rendering
   * This function adjusts the start or end points of a polyline segment to ensure
   * there's proper space for rendering arrow decorations.
   *
   * @param pointsArray - Array of points representing the polyline
   * @param startIndex - Start index in the points array
   * @param pointCount - Number of points to process
   * @param width - Width parameter for trimming calculation
   * @param height - Height parameter for trimming calculation
   * @param startPoint - Output parameter for the start point
   * @param endPoint - Output parameter for the end point
   * @param isReversed - If true, processes the polyline in reverse direction
   * @returns Object containing the processed data and points
   */
  static PolyTrimForArrow(pointsArray, startIndex, pointCount, width, height, startPoint, endPoint, isReversed) {
    let findPoint = new Point();
    let result = { findpt: findPoint, npts: pointCount };
    let output = { spt: {}, ept: {}, pts: [], npts: 0 };

    // Find the appropriate length and point
    result = this.PolyFindLength(pointsArray, startIndex, pointCount, height, isReversed, false, findPoint);
    findPoint = result.findpt;
    pointCount = result.npts;

    // Set start and end points based on direction
    if (isReversed) {
      output.spt = {
        x: pointsArray[startIndex].x,
        y: pointsArray[startIndex].y
      };
      output.ept = {
        x: findPoint.x,
        y: findPoint.y
      };
    } else {
      output.ept = {
        x: pointsArray[startIndex + pointCount - 1].x,
        y: pointsArray[startIndex + pointCount - 1].y
      };
      output.spt = {
        x: findPoint.x,
        y: findPoint.y
      };
    }

    // Find additional points with the width parameter
    result = this.PolyFindLength(pointsArray, startIndex, pointCount, width, isReversed, true, findPoint);
    findPoint = result.findpt;
    pointCount = result.npts;
    output.pts = result.pts;
    output.npts = pointCount;

    return output;
  }

  /**
   * Inserts new points into a polyline array at a specific position
   * This function creates space in the points array to accommodate additional points,
   * shifting existing points as needed and initializing the new points.
   *
   * @param pointsArray - The array of points to modify
   * @param totalPoints - Current total number of points in the array
   * @param insertPosition - Position where new points should be inserted
   * @param pointsToInsert - Number of new points to insert
   * @returns Object with success status and the new total point count
   */
  static InsertPoints(pointsArray, totalPoints, insertPosition, pointsToInsert) {
    // Check if inserting would exceed the maximum allowed points
    if (totalPoints + pointsToInsert > OptConstant.Common.MaxPolyPoints) {
      return {
        bSuccess: false,
        npts: totalPoints
      };
    }

    // Add empty points to the end of the array
    for (let i = 0; i < pointsToInsert; ++i) {
      const newPoint = new Point();
      pointsArray.push(newPoint);
    }

    // Shift existing points to make room for new points
    for (let i = totalPoints - 1; i >= insertPosition; i--) {
      pointsArray[i + pointsToInsert] = {
        x: pointsArray[i].x,
        y: pointsArray[i].y
      };
    }

    // Initialize new points with placeholder values
    totalPoints += pointsToInsert;
    for (let i = insertPosition; i < insertPosition + pointsToInsert; i++) {
      pointsArray[i] = {
        x: i - insertPosition,
        y: i - insertPosition
      };
    }

    return {
      bSuccess: true,
      npts: totalPoints
    };
  }

  static GetEditMode() {
    LogUtil.Debug('= O.Opt GetEditMode - Input');

    const editModeList = T3Gv.opt.editModeList || [];
    let currentEditMode = NvConstant.EditState.Default;

    if (editModeList.length) {
      currentEditMode = editModeList[editModeList.length - 1].mode;
    }

    LogUtil.Debug('= O.Opt GetEditMode - Output:', currentEditMode);
    return currentEditMode;
  }

  /**
   * Revokes a blob URL to free browser resources
   * This function releases the reference to a blob URL that was previously created
   * with URL.createObjectURL(). This helps prevent memory leaks when blob URLs
   * are no longer needed.
   *
   * @param url - The blob URL to revoke
   * @returns void
   */
  static DeleteURL(url) {
    const urlAPI = window.URL || window.webkitURL;
    if (urlAPI && urlAPI.revokeObjectURL) {
      urlAPI.revokeObjectURL(url);
    }
  }
}

export default OptCMUtil
