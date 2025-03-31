

import NvConstant from '../../Data/Constant/NvConstant';
import OptConstant from "../../Data/Constant/OptConstant";
import Instance from '../../Data/Instance/Instance';
import T3Gv from '../../Data/T3Gv';
import Hook from "../../Model/Hook";
import Link from '../../Model/Link';
import Point from '../../Model/Point';
import Rectangle from "../../Model/Rectangle";
import '../../Util/T3Hammer';
import T3Util from "../../Util/T3Util";
import Utils2 from "../../Util/Utils2";
import DataUtil from "../Data/DataUtil";
import DSConstant from "../DS/DSConstant";
import DrawUtil from './DrawUtil';
import LayerUtil from "./LayerUtil";
import OptAhUtil from './OptAhUtil';
import OptCMUtil from "./OptCMUtil";

class HookUtil {

  /**
   * Updates a hook connection between objects
   * @param objectId - ID of the object containing the hook
   * @param hookIndex - Index of the hook to update
   * @param targetObjectId - ID of the target object to connect to
   * @param hookPointType - Type of hook point to use
   * @param connectionPoint - Coordinates for the connection point
   * @param cellId - Optional cell ID for container objects
   * @returns 0 on success, 1 on failure
   */
  static UpdateHook(objectId, hookIndex, targetObjectId, hookPointType, connectionPoint, cellId) {
    T3Util.Log("O.Opt UpdateHook - Input:", {
      objectId,
      hookIndex,
      targetObjectId,
      hookPointType,
      connectionPoint,
      cellId
    });

    let targetObject,
      previousTargetObject,
      hookCount,
      originalCellId = null,
      shouldCreateNewHook = false,
      hookWasDeleted = false;

    // Get the object that owns the hook (with preserved state)
    const sourceObject = DataUtil.GetObjectPtr(objectId, true);
    if (sourceObject == null) {
      T3Util.Log("O.Opt UpdateHook - Output: Failed to get source object");
      return 1;
    }

    // Store original hook count and cell ID if present
    hookCount = sourceObject.hooks.length;
    if (sourceObject.hooks.length > hookIndex && hookIndex >= 0) {
      originalCellId = sourceObject.hooks[hookIndex].cellId;
    }

    // Get links list (with preserved state)
    const linksList = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, true);
    if (linksList == null) {
      T3Util.Log("O.Opt UpdateHook - Output: Failed to get links list");
      return 1;
    }

    // Verify target object exists if provided
    if (targetObjectId >= 0) {
      targetObject = DataUtil.GetObjectPtr(targetObjectId, true);
      if (targetObject == null) {
        T3Util.Log("O.Opt UpdateHook - Output: Failed to get target object");
        return 1;
      }
    } else {
      cellId = null; // No cell ID if no target object
    }

    // Handle new hook creation (when hookIndex is negative)
    if (hookIndex < 0) {
      if (sourceObject.hooks.length < sourceObject.maxhooks && targetObjectId >= 0) {
        hookIndex = sourceObject.hooks.length;
        shouldCreateNewHook = true;
      }
    }
    // Handle existing hook updates or removal
    else if (hookCount > hookIndex) {
      // Check if we need to replace an existing hook
      if (sourceObject.hooks[hookIndex].objid != targetObjectId || originalCellId != cellId) {
        // Get the previous target object
        previousTargetObject = DataUtil.GetObjectPtr(sourceObject.hooks[hookIndex].objid, true);

        if (previousTargetObject) {
          // Notify previous target that the connection is changing
          previousTargetObject.ChangeTarget(
            sourceObject.hooks[hookIndex].objid,
            objectId,
            originalCellId,
            hookIndex,
            connectionPoint,
            false
          );
        }

        // Store hook count before deletion
        hookCount = sourceObject.hooks.length;

        // Remove the link between the objects
        this.DeleteLink(linksList, sourceObject.hooks[hookIndex].objid, objectId, originalCellId, 0, false);
        hookWasDeleted = true;

        // Remove the hook if it wasn't automatically removed by DeleteLink
        if (hookCount === sourceObject.hooks.length) {
          sourceObject.hooks.splice(hookIndex, 1);
        }

        // Update hook index to the end of the list
        hookIndex = sourceObject.hooks.length;
        shouldCreateNewHook = true;
      }
    }

    // Add or update the hook with the new target object
    if (targetObjectId >= 0 && hookIndex >= 0) {
      if (hookIndex >= sourceObject.hooks.length && sourceObject.hooks.length < sourceObject.maxhooks) {
        // Create a new hook
        sourceObject.hooks[sourceObject.hooks.length] = new Hook(targetObjectId, cellId, -1, hookPointType, connectionPoint);
      } else {
        // Update existing hook
        sourceObject.hooks[hookIndex].connect.x = connectionPoint.x;
        sourceObject.hooks[hookIndex].connect.y = connectionPoint.y;
        sourceObject.hooks[hookIndex].hookpt = hookPointType;
        sourceObject.hooks[hookIndex].objid = targetObjectId;
      }

      // Update the hook in the source object
      sourceObject.ChangeHook(hookIndex, true, connectionPoint);

      // Create link if needed
      if (shouldCreateNewHook) {
        this.InsertLink(linksList, objectId, hookIndex, 0);
      }

      // Notify target object about the new connection
      targetObject.ChangeTarget(targetObjectId, objectId, originalCellId, hookIndex, connectionPoint, true);
    }
    // Handle hook removal
    else if (hookWasDeleted) {
      // Check if object should be deleted on unhook
      if (sourceObject.extraflags & OptConstant.ExtraFlags.DeleteOnUnhook) {
        DataUtil.DeleteObjects([sourceObject.BlockID]);
      }

      // Handle special case for network diagram events
      if (sourceObject.objecttype === NvConstant.FNObjectTypes.NgEvent &&
        sourceObject &&
        sourceObject.datasetElemID > -1) {
        TODO.STData.DeleteRow(sourceObject.datasetElemID);
        sourceObject.datasetElemID = -1;
      }
    }

    // Update dimensions if needed
    if ((sourceObject.hooks.length === 2 || hookCount === 2) && sourceObject.Dimensions) {
      DataUtil.AddToDirtyList(objectId);
    }

    T3Util.Log("O.Opt UpdateHook - Output: Hook updated successfully");
    return 0;
  }

  /**
  * Changes a hook connection for a connector object
  * @param sourceObject - The source object containing the hook
  * @param hookIndex - Index of the hook being changed
  * @param isAdding - Whether the hook is being added (true) or removed (false)
  * @param hookData - Additional hook data
  */
  static CNChangeHook(sourceObject, hookIndex, isAdding, hookData) {
    T3Util.Log("O.Opt CNChangeHook - Input:", {
      sourceObjectId: sourceObject.BlockID,
      hookIndex,
      isAdding,
      hasHookData: !!hookData
    });

    let connectorObject;
    let connectorId;
    let childConnectorId;
    let connectorStyle;
    let hasCoManagerFlag;
    let objectType;
    let objectSubtype;
    let childConnector;
    let connectionPoint = {};
    let objectsToDelete = [];

    // Handle hook addition
    if (isAdding) {
      // Check if source is a shape with hooks
      if (
        sourceObject.hooks &&
        sourceObject.hooks[hookIndex] &&
        sourceObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape
      ) {
        // Find parent connector for the shape
        childConnectorId = OptAhUtil.GetParentConnector(sourceObject.BlockID, null);
        if (childConnectorId >= 0) {
          // Get the connector object
          connectorObject = DataUtil.GetObjectPtr(childConnectorId, false);
          if (!connectorObject) {
            T3Util.Log("O.Opt CNChangeHook - Output: Failed (no connector object)");
            return;
          }

          // Skip special connector types
          if (connectorObject.IsFlowChartConnector()) {
            T3Util.Log("O.Opt CNChangeHook - Output: Skipped (flowchart connector)");
            return;
          }

          // if (connectorObject.objecttype === NvConstant.FNObjectTypes.SD_OBJT_CAUSEEFFECT_BRANCH) {
          //   T3Util.Log("O.Opt CNChangeHook - Output: Skipped (cause-effect branch)");
          //   return;
          // }

          // if (connectorObject.objecttype === NvConstant.FNObjectTypes.SD_OBJT_GENOGRAM_BRANCH) {
          //   T3Util.Log("O.Opt CNChangeHook - Output: Skipped (genogram branch)");
          //   return;
          // }

          // Check for co-manager flags
          hasCoManagerFlag = connectorObject.arraylist.styleflags & OptConstant.AStyles.CoManager;
          if (
            hasCoManagerFlag &&
            connectorObject.arraylist.hook.length - SDJS.ConnectorDefines.NSkip >= 1
          ) {
            T3Util.Log("O.Opt CNChangeHook - Output: Skipped (co-manager limit reached)");
            return;
          }

          if (connectorObject.IsAsstConnector()) {
            T3Util.Log("O.Opt CNChangeHook - Output: Skipped (assistant connector)");
            return;
          }

          // Store object type and subtype
          objectType = connectorObject.objecttype;
          objectSubtype = connectorObject.subtype;

          // // Update subtype for special object types
          // if (
          //   sourceObject.subtype === NvConstant.ObjectSubTypes.SD_SUBT_TASKMAP ||
          //   sourceObject.subtype === NvConstant.ObjectSubTypes.SD_SUBT_HUBMAP
          // ) {
          //   sourceObject.subtype = objectSubtype;
          // }

          // Find child array for the current object
          connectorId = T3Gv.opt.FindChildArray(sourceObject.BlockID, -1);

          // Create a new connector if needed
          if (connectorId < 0) {
            // // Get appropriate connector style based on object type
            // if (connectorObject.objecttype === NvConstant.FNObjectTypes.SD_OBJT_DECISIONTREE_CONNECTOR) {
            //   connectorStyle = gDecisionTreeManager.GetChildConnectorStyle(sourceObject);
            // } else

            {
              connectorStyle = OptAhUtil.GetChildConnectorStyle(sourceObject);
            }

            // Create new connector
            connectorId = OptAhUtil.AddConnector(100, 100, connectorStyle, sourceObject.BlockID);

            if (connectorId >= 0) {
              childConnector = DataUtil.GetObjectPtr(connectorId, true);
            }

            if (!childConnector) {
              T3Util.Log("O.Opt CNChangeHook - Output: Failed to create child connector");
              return;
            }

            // Set connector properties
            childConnector.objecttype = objectType;
            childConnector.subtype = objectSubtype;

            // // Set text flags for decision tree connectors
            // if (objectType === NvConstant.FNObjectTypes.SD_OBJT_DECISIONTREE_CONNECTOR) {
            //   childConnector.TextFlags = NvConstant.TextFlags.AttachC;
            // }

            // Set connection point based on connector type
            if (hasCoManagerFlag) {
              connectionPoint.x = 0;
              connectionPoint.y = -OptConstant.AStyles.CoManager;
            } else {
              connectionPoint = connectorStyle.connect;
            }

            // Update the hook for the new connector
            HookUtil.UpdateHook(
              connectorId,
              -1,
              sourceObject.BlockID,
              connectorStyle.hookpt,
              connectionPoint,
              null
            );

            // Update link flags and format the connector
            OptCMUtil.SetLinkFlag(sourceObject.BlockID, DSConstant.LinkFlags.Move);
            childConnector.PrFormat(connectorId);
            DataUtil.AddToDirtyList(connectorId);
          }

          // // Special handling for mind map connectors
          // if (objectType === NvConstant.FNObjectTypes.SD_OBJT_MINDMAP_CONNECTOR) {
          //   gMindMapManager.ChangeHook(sourceObject, hookIndex, isAdding, hookData);
          // }
        }
      }
    }
    // Handle hook removal
    else if (sourceObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
      // Search information for finding child arrays
      const searchInfo = {
        lindex: -1,
        id: -1,
        hookpt: 0
      };

      // Find all child connectors and delete those without shapes
      while (T3Gv.opt.FindChildArrayByIndex(sourceObject.BlockID, searchInfo) >= 0) {
        connectorId = searchInfo.id;
        if (connectorId >= 0 && T3Gv.opt.CN_GetNShapes(connectorId) === 0) {
          objectsToDelete.push(connectorId);
          DataUtil.DeleteObjects(objectsToDelete, false);
        }
      }
    }

    T3Util.Log("O.Opt CNChangeHook - Output: Operation completed");
  }

  /**
     * Removes a hook connection from an object
     * @param objectId - ID of the object containing the hook
     * @param targetObjectId - ID of the target object to disconnect from
     * @param targetCellId - Optional cell ID for container connections
     * @returns 0 on success, 1 on failure
     */
  static RemoveHook(objectId, targetObjectId, targetCellId) {
    T3Util.Log("O.Opt RemoveHook - Input:", { objectId, targetObjectId, targetCellId });

    // Get a preserved copy of the object for modification
    const sourceObject = DataUtil.GetObjectPtr(objectId, true);

    if (sourceObject == null) {
      T3Util.Log("O.Opt RemoveHook - Output: Failed to get object (1)");
      return 1;
    }

    // Search for the hook with matching target object ID and cell ID
    for (let hookIndex = 0; hookIndex < sourceObject.hooks.length; hookIndex++) {
      if (sourceObject.hooks[hookIndex].objid == targetObjectId) {
        // If cell ID is specified, it must match
        if (targetCellId !== null && targetCellId !== sourceObject.hooks[hookIndex].cellid) {
          continue;
        }

        // Notify the object that the hook is being removed
        sourceObject.ChangeHook(hookIndex, 0, sourceObject.hooks[hookIndex].connect);

        // Remove the hook from the array
        sourceObject.hooks.splice(hookIndex, 1);
        break;
      }
    }

    T3Util.Log("O.Opt RemoveHook - Output: Hook removed successfully (0)");
    return 0;
  }

  /**
   * Adds linked objects to a hook list based on specified criteria
   * @param linksList - The list of links to search in
   * @param hookList - The list of hooks to add to
   * @param startLinkIndex - Starting index in the links list
   * @param targetId - Target object ID to find hooks for
   * @param listCode - Code indicating which type of objects to include
   * @param recursionLevel - Current recursion level (for limiting depth)
   * @param boundingRect - Optional bounding rectangle to update
   * @returns Updated hook list with added objects
   */
  static AddToHookList(linksList, hookList, startLinkIndex, targetId, listCode, recursionLevel, boundingRect) {
    T3Util.Log("O.Opt AddToHookList - Input:", {
      linksListLength: linksList.length,
      hookListCount: hookList.length,
      startLinkIndex,
      targetId,
      listCode,
      recursionLevel,
      hasBoundingRect: !!boundingRect
    });

    let hookObjectId, hookIndex, hookCounter, nextLinkIndex, otherObjectId, hookObject;
    let objectRect = {};
    let shouldAddToList = false;

    // Process all links for this target
    while (startLinkIndex < linksList.length && linksList[startLinkIndex].targetid == targetId) {
      // Get the ID of the hook object
      hookObjectId = linksList[startLinkIndex].hookid;
      hookObject = DataUtil.GetObjectPtr(hookObjectId, false);

      if (hookObject) {
        // Default to no specific hook
        hookIndex = -1;

        // Determine whether to add this object based on list code
        switch (listCode) {
          case NvConstant.ListCodes.MoveHook:
          case NvConstant.ListCodes.MoveTarg:
            // For connector objects with exactly two hooks, check if the other
            // end is already in the hook list to prevent circular references
            if (
              hookObject.hooks.length == 2 &&
              (
                otherObjectId = hookObject.hooks[0].objid === targetId ? hookObject.hooks[1].objid : hookObject.hooks[0].objid,
                shouldAddToList = false,
                hookList.indexOf(otherObjectId) < 0
              )
            ) {
              break;
            }
            shouldAddToList = true;
            break;

          case NvConstant.ListCodes.CircTarg:
          case NvConstant.ListCodes.TopOnly:
          case NvConstant.ListCodes.MoveTargAndLines:
            shouldAddToList = true;
            break;
        }

        // Skip if object is already in the hook list
        if (hookList.indexOf(hookObjectId) >= 0) {
          shouldAddToList = false;
        }

        // Add the object if conditions are met
        if (shouldAddToList) {
          // Find which hook connects to our target
          if (hookIndex < 0) {
            for (hookCounter = 0; hookCounter < hookObject.hooks.length; hookCounter++) {
              if (hookObject.hooks[hookCounter].objid == targetId) {
                hookIndex = hookCounter;
                break;
              }
            }
          }

          // If we found the matching hook, add the object to our list
          if (hookIndex >= 0 && hookObject.hooks[hookIndex].objid == targetId) {
            hookList.push(hookObjectId);

            // Add any enclosed objects for container shapes
            const enclosedObjects = hookObject.GetListOfEnclosedObjects(true);
            if (enclosedObjects.length) {
              this.JoinHookList(hookList, enclosedObjects);
            }

            // Update the bounding rectangle if provided
            if (
              boundingRect &&
              !(hookObject.flags & NvConstant.ObjFlags.NotVisible)
            ) {
              objectRect = hookObject.GetMoveRect(true, true);
              boundingRect = Utils2.UnionRect(boundingRect, objectRect, boundingRect);
            }

            // For TOPONLY, don't recurse further
            // Otherwise, follow the graph in both directions
            if (listCode !== NvConstant.ListCodes.TopOnly) {
              // Find links where this hook object is the target
              nextLinkIndex = OptCMUtil.FindLink(linksList, hookObjectId, true);
              if (nextLinkIndex >= 0) {
                hookList = this.AddToHookList(
                  linksList,
                  hookList,
                  nextLinkIndex,
                  hookObjectId,
                  listCode,
                  recursionLevel + 1,
                  boundingRect
                );
              }

              // For non-circular targets, follow other hooks on the object
              if (
                hookObject.hooks.length > 1 &&
                listCode !== NvConstant.ListCodes.CircTarg
              ) {
                hookList = this.GetTargetList(hookObjectId, linksList, hookList, boundingRect, listCode);
              }
            }

            // Special handling for circular targets at recursion level 0
            if (
              listCode === NvConstant.ListCodes.CircTarg &&
              recursionLevel === 0 &&
              hookObject.hooks.length > 1
            ) {
              for (hookCounter = 0; hookCounter < hookObject.hooks.length; hookCounter++) {
                if (hookCounter !== hookIndex) {
                  // Break if we find a loop (hook connects to itself)
                  if (hookObject.hooks[hookCounter].objid == hookObject.hooks[hookIndex].objid) {
                    break;
                  }
                  hookList.push(hookObject.hooks[hookIndex].objid);
                }
              }
            }
          }
        }
      }

      // Move to the next link
      startLinkIndex++;
    }

    T3Util.Log("O.Opt AddToHookList - Output: Updated hook list with", hookList.length, "items");
    return hookList;
  }

  /**
    * Notifies objects that a hooked object is moving
    * @param drawingObject - The object being moved
    * @param boundingBox - The bounding box of the moving object
    */
  static HandleHookedObjectMoving(drawingObject, boundingBox) {
    T3Util.Log("O.Opt HandleHookedObjectMoving - Input:", {
      drawingObjectId: drawingObject.BlockID,
      boundingBox
    });

    let index = 0;
    let historyLength = 0;
    let connectedObject = null;

    // Handle the currently connected object
    if (
      T3Gv.opt.linkParams &&
      T3Gv.opt.linkParams.ConnectIndex >= 0 &&
      (connectedObject = DataUtil.GetObjectPtr(T3Gv.opt.linkParams.ConnectIndex, false))
    ) {
      if (connectedObject.HookedObjectMoving) {
        connectedObject.HookedObjectMoving({
          linkParams: T3Gv.opt.linkParams,
          movingShapeID: drawingObject.BlockID,
          movingShapeBBox: boundingBox
        });
      }
    }

    // Handle any previously connected objects in history
    if (T3Gv.opt.linkParams && T3Gv.opt.linkParams.ConnectIndexHistory.length > 0) {
      historyLength = T3Gv.opt.linkParams.ConnectIndexHistory.length;

      for (index = 0; index < historyLength; index++) {
        // Skip the current connect index
        if (T3Gv.opt.linkParams.ConnectIndexHistory[index] !== T3Gv.opt.linkParams.ConnectIndex) {
          connectedObject = DataUtil.GetObjectPtr(T3Gv.opt.linkParams.ConnectIndexHistory[index], false);

          if (connectedObject && connectedObject.HookedObjectMoving) {
            connectedObject.HookedObjectMoving({
              linkParams: T3Gv.opt.linkParams,
              movingShapeID: drawingObject.BlockID,
              movingShapeBBox: boundingBox
            });
          }
        }
      }
    }

    T3Util.Log("O.Opt HandleHookedObjectMoving - Output: Notified connected objects");
  }

  /**
     * Highlights a connection point on a drawing object
     * @param objectId - ID of the object to highlight
     * @param connectIndex - Index of the connection point
     * @param shouldHighlight - Whether to show (true) or hide (false) the highlight
     * @param connectPoint - The connection point coordinates
     * @param hookPointType - Type of hook point
     * @param cellId - Optional cell ID for container objects
     */
  static HiliteConnect(objectId, connectIndex, shouldHighlight, connectPoint, hookPointType, cellId) {
    T3Util.Log("O.Opt HiliteConnect - Input:", {
      objectId,
      connectIndex,
      shouldHighlight,
      connectPoint,
      hookPointType,
      cellId
    });

    let targetId = objectId;
    let drawingObject = null;
    let svgElement = null;
    let highlightElement = null;
    let highlightId = null;

    // Get the drawing object
    drawingObject = DataUtil.GetObjectPtr(objectId, false);
    if (drawingObject == null) {
      T3Util.Log("O.Opt HiliteConnect - Output: No drawing object found");
      return;
    }

    // Check if this is a container connection or has a cell ID
    const isContainerConnection = !!(drawingObject.flags & NvConstant.ObjFlags.ContConn || cellId != null);

    // Get the SVG element for this object
    svgElement = T3Gv.opt.svgObjectLayer.GetElementById(targetId);
    if (svgElement == null || svgElement.GetElementById(OptConstant.SVGElementClass.Shape) == null) {
      T3Util.Log("O.Opt HiliteConnect - Output: No SVG element found");
      return;
    }

    // Create the highlight element ID
    highlightId = 'hilite_' + targetId;
    highlightElement = T3Gv.opt.svgHighlightLayer.GetElementById(highlightId);

    // Add highlight if requested and not already present
    if (highlightElement == null && shouldHighlight) {
      highlightElement = drawingObject.CreateConnectHilites(
        T3Gv.opt.svgDoc,
        objectId,
        connectIndex,
        connectPoint,
        hookPointType,
        cellId
      );

      if (highlightElement != null) {
        T3Gv.opt.svgHighlightLayer.AddElement(highlightElement);

        try {
          // Apply rotation to non-container connections
          if (!isContainerConnection) {
            highlightElement.SetRotation(drawingObject.RotationAngle);
          }
        } catch (error) {
          throw error;
        }

        T3Util.Log("O.Opt HiliteConnect - Output: Highlight added");
      } else {
        T3Util.Log("O.Opt HiliteConnect - Output: Failed to create highlight");
      }
    }
    // Remove highlight if requested and present
    else if (highlightElement != null && !shouldHighlight) {
      T3Gv.opt.svgHighlightLayer.RemoveElement(highlightElement);
      T3Util.Log("O.Opt HiliteConnect - Output: Highlight removed");
    } else {
      T3Util.Log("O.Opt HiliteConnect - Output: No change needed");
    }
  }

  /**
  * Moves links from one object to another
  * @param targetObjectId - The ID of the target object to move links to
  * @param sourceObjectId - The ID of the source object to move links from
  * @param linkIndices - Optional array of link indices to move
  * @param hookResults - Optional array to store hook information in
  * @returns 0 on success, 1 on failure
  */
  static MoveLinks(targetObjectId, sourceObjectId, linkIndices, hookResults) {
    T3Util.Log("O.Opt MoveLinks - Input:", {
      targetObjectId,
      sourceObjectId,
      linkIndices: linkIndices ? linkIndices.length : 'null',
      hasHookResults: !!hookResults
    });

    let tempLink, targetObject, sourceObject, hookPoint, linkIndex, linkCount;
    let sourceHookId, sourceHook, hookIndex, foundIndex, swapNeeded;
    let hookPoints = [];
    let hookInfo = {};
    let linksList = DataUtil.GetObjectPtr(this.linksBlockId, true);

    // Check if links list exists
    if (linksList == null) {
      T3Util.Log("O.Opt MoveLinks - Output: Failed (no links list)");
      return 1;
    }

    // Get total number of links
    linkCount = linksList.length;

    // Check if target object exists
    if (DataUtil.GetObjectPtr(sourceObjectId, false) == null) {
      T3Util.Log("O.Opt MoveLinks - Output: Failed (source object not found)");
      return 1;
    }

    // Check if source object exists
    if ((targetObject = DataUtil.GetObjectPtr(targetObjectId, false)) == null) {
      T3Util.Log("O.Opt MoveLinks - Output: Failed (target object not found)");
      return 1;
    }

    // If no link indices provided, find all links for the source object
    if (linkIndices == null) {
      linkIndices = [];
      foundIndex = OptCMUtil.FindLink(linksList, sourceObjectId, true);

      if (foundIndex >= 0) {
        while (foundIndex < linkCount && linksList[foundIndex].targetid === sourceObjectId) {
          linkIndices.push(foundIndex);
          foundIndex++;
        }
      }
    }

    // Process each link to be moved
    if ((linkIndices.length) >= 0) {
      for (let i = 0; i < linkIndices.length; i++) {
        // Get the link index and the hook object ID
        linkIndex = linkIndices[i];
        sourceHookId = linksList[linkIndex].hookid;

        if (sourceHookId >= 0) {
          // Get the hook object
          sourceHook = DataUtil.GetObjectPtr(sourceHookId, true);

          if (sourceHook == null) continue;

          // Skip objects with the NoMaintainLink flag
          if (sourceHook.flags & NvConstant.ObjFlags.NoMaintainLink) continue;

          // Find the hook that points to the source object
          for (hookIndex = 0; hookIndex < sourceHook.hooks.length; hookIndex++) {
            if (sourceHook.hooks[hookIndex].objid === sourceObjectId) {
              // Get the hook point
              hookPoint = sourceHook.HookToPoint(sourceHook.hooks[hookIndex].hookpt, null);

              // If we're just collecting hook results
              if (hookResults) {
                hookInfo = {
                  pt: hookPoint,
                  obj: sourceHook,
                  index: hookIndex
                };
                hookResults.push(hookInfo);
                continue;
              }

              // Handle multiplicity objects differently
              if (sourceHook.objecttype !== NvConstant.FNObjectTypes.Multiplicity) {
                // Get target points for connection
                hookPoints = targetObject.GetTargetPoints(
                  hookPoint,
                  NvConstant.HookFlags.LcNoSnaps,
                  null
                );

                if (hookPoints && hookPoints.length) {
                  // Update hook connection point
                  sourceHook.hooks[hookIndex].connect.x = hookPoints[0].x;
                  sourceHook.hooks[hookIndex].connect.y = hookPoints[0].y;
                }

                // Update hook and link references
                sourceHook.hooks[hookIndex].objid = targetObjectId;
                linksList[linkIndex].targetid = targetObjectId;
              } else {
                // Just mark multiplicity links as moved
                linksList[linkIndex].flags = Utils2.SetFlag(
                  linksList[linkIndex].flags,
                  DSConstant.LinkFlags.Move,
                  true
                );

                // Update hook and link references
                sourceHook.hooks[hookIndex].objid = targetObjectId;
                linksList[linkIndex].targetid = targetObjectId;
              }
            }
          }
        }
      }

      // Sort the links list by target IDs
      do {
        swapNeeded = false;
        for (hookIndex = 0; hookIndex < linkCount - 1; hookIndex++) {
          if (linksList[hookIndex].targetid > linksList[hookIndex + 1].targetid) {
            swapNeeded = true;
            tempLink = linksList[hookIndex + 1];
            linksList[hookIndex + 1] = linksList[hookIndex];
            linksList[hookIndex] = tempLink;
          }
        }
      } while (swapNeeded);
    }

    T3Util.Log("O.Opt MoveLinks - Output: Links moved successfully");
    return 0;
  }

  /**
   * Inserts a link between two objects in the links list
   * @param linksList - The list of links to insert into
   * @param hookObjectId - ID of the object that contains the hook
   * @param hookIndex - Index of the hook in the object's hooks array
   * @param flagValue - Optional flags to set on the link
   * @returns 0 on success, 1 on failure
   */
  static InsertLink(linksList, hookObjectId, hookIndex, flagValue) {
    T3Util.Log("O.Opt InsertLink - Input:", {
      linksList: linksList?.length,
      hookObjectId,
      hookIndex,
      flagValue
    });

    // Get the hook object
    const hookObject = DataUtil.GetObjectPtr(hookObjectId, false);

    // Validation checks
    if (hookObject == null) {
      T3Util.Log("O.Opt InsertLink - Output: Failed to get hook object (1)");
      return 1;
    }

    if (hookIndex < 0 || hookIndex >= hookObject.hooks.length) {
      T3Util.Log("O.Opt InsertLink - Output: Invalid hook index (1)");
      return 1;
    }

    // Find position to insert the link
    const targetObjectId = hookObject.hooks[hookIndex].objid;
    let linkIndex = OptCMUtil.FindLink(linksList, targetObjectId, false);

    if (linkIndex >= 0) {
      // Check if this link already exists
      while (linkIndex < linksList.length && linksList[linkIndex].targetid === targetObjectId) {
        if (linksList[linkIndex].hookid == hookObjectId) {
          T3Util.Log("O.Opt InsertLink - Output: Link already exists (1)");
          return 1;
        }
        linkIndex++;
      }

      // Create and insert the new link
      const newLink = new Link(targetObjectId, hookObjectId, hookObject.hooks[hookIndex].cellid);

      // Set flags if provided
      if (flagValue) {
        newLink.flags = flagValue;
      }

      linksList.splice(linkIndex, 0, newLink);
    }

    T3Util.Log("O.Opt InsertLink - Output: Link inserted successfully (0)");
    return 0;
  }

  /**
   * Moves a connection highlight for an object
   * @param objectId - ID of the object to highlight
   * @param connectionPoint - The connection point coordinates
   * @param hookPointType - Type of hook point
   */
  static MoveConnectHilite(objectId, connectionPoint, hookPointType) {
    T3Util.Log("O.Opt MoveConnectHilite - Input:", { objectId, connectionPoint, hookPointType });

    let targetId;
    let connectionIndex;
    let drawingObject = null;
    let highlightElement = null;
    let highlightId = null;
    let pointsList = [];
    let docScreenScale = T3Gv.opt.svgDoc.docInfo.docToScreenScale;
    let connectionRadius = 0;

    targetId = objectId;

    // Increase highlight size at lower zoom levels for better visibility
    if (T3Gv.opt.svgDoc.docInfo.docScale <= 0.5) {
      docScreenScale *= 2;
    }

    // Get the drawing object and determine connection point dimensions
    drawingObject = DataUtil.GetObjectPtr(objectId, false);
    if (drawingObject != null) {
      // Use different connection point sizes based on object type
      connectionRadius = drawingObject instanceof Instance.Shape.BaseLine
        ? OptConstant.Common.ConnPointLineDim / docScreenScale
        : OptConstant.Common.ConnPointDim / docScreenScale;

      // Create a list with the single connection point
      pointsList.push(connectionPoint);

      // Get perimeter points for the object
      connectionIndex = drawingObject.GetPerimPts(objectId, pointsList, null, false, hookPointType, -1);

      // If the object has a shape element, update its highlight
      if (T3Gv.opt.svgObjectLayer.GetElementById(targetId).GetElementById(OptConstant.SVGElementClass.Shape) != null) {
        highlightId = 'hilite_' + targetId;
        highlightElement = T3Gv.opt.svgHighlightLayer.GetElementById(highlightId);

        if (highlightElement) {
          // Position the highlight element at the connection point
          highlightElement.SetPos(connectionIndex[0].x - connectionRadius, connectionIndex[0].y - connectionRadius);
        }
      }
    }

    T3Util.Log("O.Opt MoveConnectHilite - Output: Highlight moved to", connectionIndex ? connectionIndex[0] : "null");
  }

  /**
   * Removes a link between objects from the links list
   * @param linksList - The list of links to search in
   * @param targetId - ID of the target object
   * @param hookObjectId - Optional ID of the hook object to remove links for
   * @param cellId - Optional cell ID for container objects
   * @param hookPointType - Optional hook point type to filter by
   * @param skipHookRemoval - Whether to skip removing the actual hook (true) or not (false)
   * @returns 0 to indicate success
   */
  static DeleteLink(linksList, targetId, hookObjectId, cellId, hookPointType, skipHookRemoval) {
    T3Util.Log("O.Opt DeleteLink - Input:", {
      targetId,
      hookObjectId,
      cellId,
      hookPointType,
      skipHookRemoval
    });

    // Find the first link with the target ID
    let linkIndex = OptCMUtil.FindLink(linksList, targetId, true);
    let shouldDeleteLink = false;
    let hookId = -1;

    // Default hookObjectId to -1 if undefined
    if (targetId === undefined) {
      hookObjectId = -1;
    }

    // Process each link with the target ID
    if (linkIndex >= 0) {
      while (linkIndex < linksList.length && linksList[linkIndex].targetid === targetId) {
        // Check if this link matches our criteria
        if (hookObjectId === -1 || linksList[linkIndex].hookid === hookObjectId) {
          shouldDeleteLink = true;
          hookId = linksList[linkIndex].hookid;

          // Check cell ID if provided
          if (cellId != null) {
            shouldDeleteLink = (cellId === linksList[linkIndex].cellid);
          }

          // Check hook type if requested
          if (hookId >= 0 && hookPointType !== 0) {
            shouldDeleteLink = this.IsHookType(hookId, targetId, hookPointType);
          }

          // Delete link and remove hook if matched and not skipping hook removal
          if (shouldDeleteLink) {
            if (hookId >= 0 && !skipHookRemoval) {
              this.RemoveHook(hookId, targetId, cellId);
            }
            linksList.splice(linkIndex, 1);
          } else {
            linkIndex++;
          }
        } else {
          linkIndex++;
        }
      }
    }

    T3Util.Log("O.Opt DeleteLink - Output: Links deleted successfully");
    return 0;
  }

  /**
     * Checks if there is an existing link between two objects
     * @param objectId1 - ID of the first object
     * @param objectId2 - ID of the second object
     * @returns True if a link exists between the objects, false otherwise
     */
  static HasExistingLink(objectId1, objectId2) {
    T3Util.Log("O.Opt HasExistingLink - Input:", { objectId1, objectId2 });

    // Helper function to check if source object has a hook to target object
    function hasHookToTarget(sourceId, targetId) {
      const sourceObject = DataUtil.GetObjectPtr(sourceId, false);

      // Check each hook in the source object
      for (let hookIndex = 0; hookIndex < sourceObject.hooks.length; hookIndex++) {
        if (sourceObject.hooks[hookIndex].objid == targetId) {
          return true;
        }
      }
      return false;
    }

    // Check links in both directions
    const linkExists = !(!hasHookToTarget(objectId1, objectId2) && !hasHookToTarget(objectId2, objectId1));

    T3Util.Log("O.Opt HasExistingLink - Output:", linkExists);
    return linkExists;
  }

  /**
   * Verifies if a link between objects is valid
   * @param sourceObject - The source object containing hooks
   * @param linkData - The link data to verify
   * @returns Hook index if link is valid, -1 if link should be deleted
   */
  static VerifyLink(sourceObject, linkData) {
    T3Util.Log("O.Opt VerifyLink - Input:", { sourceObjectId: sourceObject.BlockID, linkData });

    // Get the target object
    const targetObject = DataUtil.GetObjectPtr(linkData.targetid, false);
    const linkFlags = DSConstant.LinkFlags;

    // Check if target object exists
    if (targetObject == null) {
      // Mark link for deletion if target object doesn't exist
      linkData.flags = Utils2.SetFlag(linkData.flags, linkFlags.DeleteLink, true);
      T3Util.Log("O.Opt VerifyLink - Output: Target object doesn't exist (-1)");
      return -1;
    }

    // Check each hook in the source object for a matching target
    for (let hookIndex = 0; hookIndex < sourceObject.hooks.length; hookIndex++) {
      if (sourceObject.hooks[hookIndex].objid === linkData.targetid &&
        sourceObject.hooks[hookIndex].cellid === linkData.cellid) {

        // If no cell ID, link is valid
        if (sourceObject.hooks[hookIndex].cellid === null) {
          T3Util.Log("O.Opt VerifyLink - Output: Valid link found at index", hookIndex);
          return hookIndex;
        }

        // If there is a cell ID, verify it exists in the table
        // const tableData = targetObject.GetTable(false);
        // const cellExists = this.Table_GetCellWithID(tableData, sourceObject.hooks[hookIndex].cellid);

        // if (cellExists) {
        //   T3Util.Log("O.Opt VerifyLink - Output: Valid table cell link found at index", hookIndex);
        //   return hookIndex;
        // } else

        {
          // Mark link for deletion if cell doesn't exist
          linkData.flags = Utils2.SetFlag(linkData.flags, linkFlags.DeleteLink, true);
          T3Util.Log("O.Opt VerifyLink - Output: Cell doesn't exist (-1)");
          return -1;
        }
      }
    }

    // No matching hook found
    T3Util.Log("O.Opt VerifyLink - Output: No matching hook found (-1)");
    return -1;
  }

  /**
     * Cleans up connector hooks after object modifications
     * @param connectorId - ID of the connector to clean up
     * @param shapeId - ID of the shape that may have hooks
     */
  static CleanupHooks(connectorId, shapeId) {
    T3Util.Log("O.Opt CleanupHooks - Input:", { connectorId, shapeId });

    // Get the connector object
    const connectorObject = DataUtil.GetObjectPtr(connectorId, false);

    // Get the shape object
    const shapeObject = DataUtil.GetObjectPtr(shapeId, false);

    // Check if we have a valid connector and shape
    if (
      connectorObject &&
      connectorObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector &&
      !(connectorObject.arraylist.styleflags & OptConstant.AStyles.FlowConn) > 0 &&
      shapeObject &&
      shapeObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape
    ) {
      // Find child array for the shape
      const childConnectorId = T3Gv.opt.FindChildArray(shapeId, connectorId);

      if (childConnectorId >= 0) {
        // Check if the connector has no shapes attached
        if (T3Gv.opt.CN_GetNShapes(childConnectorId) === 0) {
          // Delete the orphaned connector
          const objectsToDelete = [];
          objectsToDelete.push(childConnectorId);
          DataUtil.DeleteObjects(objectsToDelete, false);

          T3Util.Log("O.Opt CleanupHooks - Output: Deleted orphaned connector", childConnectorId);
          return;
        }
      }
    }

    T3Util.Log("O.Opt CleanupHooks - Output: No cleanup needed");
  }

  /**
     * Finds all child connectors for an object
     * @param objectId - ID of the parent object
     * @param linksList - Optional list of links to search through
     * @returns Array of child connector IDs
     */
  static FindAllChildConnectors(objectId, linksList?) {
    T3Util.Log("O.Opt FindAllChildConnectors - Input:", { objectId, linksList });

    const searchInfo = {
      lindex: -1,
      id: -1,
      hookpt: 0
    };

    const childConnectors = [];

    // Keep finding children until there are no more
    while (T3Gv.opt.FindChildArrayByIndex(objectId, searchInfo, linksList) > 0) {
      childConnectors.push(searchInfo.id);
    }

    T3Util.Log("O.Opt FindAllChildConnectors - Output:", childConnectors);
    return childConnectors;
  }

  /**
   * Maintains links between objects when one object moves or changes
   * @param targetId - ID of the target object
   * @param drawingObject - The drawing object being modified
   * @param changeEvent - Optional change event data
   * @param triggerType - Trigger type for the change
   * @param maintainMode - Mode for maintaining the link
   */
  static MaintainLink(targetId, drawingObject, changeEvent, triggerType, maintainMode?) {
    T3Util.Log("O.Opt MaintainLink - Input:", { targetId, drawingObject: drawingObject.BlockID, triggerType, maintainMode });

    let linkIndex, hookObject;
    let hookFlags = 0;
    let connectionPoint = {};
    let targetPoints = [];
    let links = DataUtil.GetObjectPtr(this.linksBlockId, true);

    // Exit if no links or object doesn't allow maintaining links
    if (!links || !drawingObject.AllowMaintainLink()) {
      T3Util.Log("O.Opt MaintainLink - Output: No links or link maintenance not allowed");
      return;
    }

    // Find the first link for this target
    linkIndex = OptCMUtil.FindLink(links, targetId, true);
    if (linkIndex < 0) {
      T3Util.Log("O.Opt MaintainLink - Output: No links found for targetId", targetId);
      return;
    }

    // Process all links to this target
    while (linkIndex < links.length && links[linkIndex].targetid === targetId) {
      hookObject = DataUtil.GetObjectPtr(links[linkIndex].hookid, false);

      // Skip if hook object doesn't exist or has special flags
      if (!hookObject) {
        linkIndex++;
        continue;
      }

      // Skip associated objects
      if (hookObject.associd === targetId && (hookObject.flags & NvConstant.ObjFlags.Assoc)) {
        linkIndex++;
        continue;
      }

      // Skip objects that don't allow link maintenance
      if (hookObject.flags & NvConstant.ObjFlags.NoMaintainLink) {
        linkIndex++;
        continue;
      }

      // Check each hook on the object
      for (let hookIndex = 0; hookIndex < hookObject.hooks.length; hookIndex++) {
        if (hookObject.hooks[hookIndex].objid === targetId) {
          // Determine if special mode handling is needed
          let actualMaintainMode = maintainMode;
          if (maintainMode === 2) {
            actualMaintainMode = !(
              hookObject.hooks[hookIndex].hookpt !== OptConstant.HookPts.KAT ||
              hookObject.DrawingObjectBaseClass !== OptConstant.DrawObjectBaseClass.Shape ||
              drawingObject instanceof Instance.Shape.PolyLineContainer
            );
          }

          // Get hook connection point
          connectionPoint = hookObject.HookToPoint(hookObject.hooks[hookIndex].hookpt, null);

          // Try to maintain the point connection
          if (drawingObject.MaintainPoint(connectionPoint, targetId, changeEvent, hookObject, triggerType) === false) {
            linkIndex++;
            continue;
          }

          // Update hook coordinates if not in special mode
          if (!actualMaintainMode) {
            hookFlags = NvConstant.HookFlags.LcNoSnaps;
            hookFlags = Utils2.SetFlag(
              hookFlags,
              NvConstant.HookFlags.LcShapeOnLine,
              !(hookObject instanceof Instance.Shape.BaseLine)
            );

            targetPoints = drawingObject.GetTargetPoints(connectionPoint, hookFlags, null);
            if (targetPoints) {
              hookObject.hooks[hookIndex].connect.x = targetPoints[0].x;
              hookObject.hooks[hookIndex].connect.y = targetPoints[0].y;
            }
          }

          // Handle text orientation alignment
          if (drawingObject.TextFlags & NvConstant.TextFlags.HorizText &&
            hookObject instanceof Instance.Shape.BaseShape) {

            let textAngle = drawingObject.GetApparentAngle(connectionPoint);
            textAngle %= 180;

            let shapeAngle = hookObject.RotationAngle;
            let angle180 = (textAngle + 180) % 360;

            // Choose the angle with the smallest difference to current rotation
            textAngle = T3Gv.opt.GetAngleSmallestDiff(textAngle, shapeAngle) <
              T3Gv.opt.GetAngleSmallestDiff(angle180, shapeAngle) ?
              textAngle : angle180;

            // Only update if angle difference is significant
            if (Math.abs(shapeAngle - textAngle) > 2 &&
              Math.abs(shapeAngle - Math.abs(textAngle - 180)) > 2) {

              T3Gv.stdObj.PreserveBlock(links[linkIndex].hookid);
              hookObject.RotationAngle = textAngle;
              DataUtil.AddToDirtyList(hookObject.BlockID);
            }
          }
        }
      }
      linkIndex++;
    }

    T3Util.Log("O.Opt MaintainLink - Output: Links maintained successfully");
  }

  /**
     * Sets a link flag during resize operations
     * @param objectId - ID of the object being resized
     * @param flagValue - Flag value to set
     */
  static ResizeSetLinkFlag(objectId, flagValue) {
    T3Util.Log("O.Opt ResizeSetLinkFlag - Input:", { objectId, flagValue });

    const object = DataUtil.GetObjectPtr(objectId, false);

    // If object has hooks, update the hook's link flag
    if (object && object.hooks.length) {
      const hookObjectId = object.hooks[0].objid;
      const hookObject = DataUtil.GetObjectPtr(hookObjectId, false);

      if (hookObject &&
        (hookObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector ||
          hookObject instanceof Instance.Shape.ShapeContainer)) {
        OptCMUtil.SetLinkFlag(hookObjectId, DSConstant.LinkFlags.Move);
      }
    }

    // Set the flag for the object itself
    OptCMUtil.SetLinkFlag(objectId, flagValue);

    T3Util.Log("O.Opt ResizeSetLinkFlag - Output: Link flags updated");
  }

  /**
   * Gets hook points for an object being moved
   * @param objectId - ID of the target object
   * @param drawingObject - The drawing object being moved
   * @param deltaX - Change in X position
   * @param deltaY - Change in Y position
   * @returns Array of hook points or null if hooking not allowed
   */
  static MoveGetHookPoints(objectId, drawingObject, deltaX, deltaY) {
    T3Util.Log("O.Opt MoveGetHookPoints - Input:", {
      objectId,
      drawingObject: drawingObject ? drawingObject.BlockID : null,
      deltaX,
      deltaY
    });

    // Arrays to store various point types
    const hookPoints = [];
    const attachmentPoints = [];
    const containerPoints = [];

    // Flags for different hooking behaviors
    let allowDropOnLine = false;
    let isFreeHandMode = false;
    let allowAutoInsert = false;

    // Constants for readability
    const extraFlags = OptConstant.ExtraFlags;
    const centerDimension = OptConstant.Common.DimMax;

    // Early return conditions
    if (drawingObject == null) {
      T3Util.Log("O.Opt MoveGetHookPoints - Output: null (No drawing object)");
      return null;
    }

    if (T3Gv.opt.linkParams == null) {
      T3Util.Log("O.Opt MoveGetHookPoints - Output: null (No link parameters)");
      return null;
    }

    if (drawingObject.hooks && drawingObject.hooks.length === 2) {
      T3Util.Log("O.Opt MoveGetHookPoints - Output: null (Object already has 2 hooks)");
      return null;
    }

    if (drawingObject.flags & NvConstant.ObjFlags.Assoc) {
      T3Util.Log("O.Opt MoveGetHookPoints - Output: null (Object is associated)");
      return null;
    }

    if (drawingObject.PreventLink()) {
      T3Util.Log("O.Opt MoveGetHookPoints - Output: null (Object prevents linking)");
      return null;
    }

    // Set array-only mode if object doesn't allow linking
    if (!drawingObject.AllowLink() && T3Gv.opt.linkParams) {
      T3Gv.opt.linkParams.ArraysOnly = true;
    }

    // Get session data and check flags
    const sessionData = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    if (sessionData) {
      // Check if attach-to-line is allowed
      allowDropOnLine = sessionData.flags & OptConstant.SessionFlags.AttLink &&
        drawingObject.hookflags & NvConstant.HookFlags.LcAttachToLine;

      // Check if we're in freehand mode
      isFreeHandMode = sessionData.flags & OptConstant.SessionFlags.FreeHand;

      // Check if auto-insert is allowed
      allowAutoInsert = DrawUtil.AllowAutoInsert();
    }

    // Override drop-on-line flag based on object flags
    allowDropOnLine = !!(
      drawingObject.flags & NvConstant.ObjFlags.DropOnBorder ||
      drawingObject.flags & NvConstant.ObjFlags.DropOnTable
    );

    // Handle drop-on-line or auto-insert mode
    if (allowDropOnLine || allowAutoInsert) {
      // Set flag in link parameters
      if (allowDropOnLine) {
        T3Gv.opt.linkParams.DropOnLine = true;
      }

      // Create attachment point
      attachmentPoints.push(new Point(drawingObject.attachpoint.x, drawingObject.attachpoint.y));

      // Apply flipping if needed
      if (drawingObject.extraflags & (extraFlags.SEDE_FlipHoriz | extraFlags.SEDE_FlipVert)) {
        const flipRect = new Rectangle(0, 0, centerDimension, centerDimension);
        T3Gv.opt.FlipPoints(flipRect, drawingObject.extraflags, attachmentPoints);
      }

      // Get perimeter points and adjust for movement
      T3Gv.opt.linkParams.cpt = drawingObject.GetPerimPts(
        objectId,
        attachmentPoints,
        OptConstant.HookPts.KAT,
        false,
        null,
        -1
      );

      if (T3Gv.opt.linkParams.cpt && T3Gv.opt.linkParams.cpt.length > 0) {
        T3Gv.opt.linkParams.cpt[0].id = OptConstant.HookPts.KAT;
        T3Gv.opt.linkParams.cpt[0].x += deltaX;
        T3Gv.opt.linkParams.cpt[0].y += deltaY;
      }
    }

    // Special handling for shapes
    if (drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
      containerPoints.push(new Point(centerDimension / 2, 0));

      T3Gv.opt.linkParams.ContainerPt = drawingObject.GetPerimPts(
        objectId,
        containerPoints,
        OptConstant.HookPts.KAT,
        false,
        null,
        -1
      );

      if (T3Gv.opt.linkParams.ContainerPt && T3Gv.opt.linkParams.ContainerPt.length > 0) {
        T3Gv.opt.linkParams.ContainerPt[0].id = OptConstant.HookPts.KAT;
        T3Gv.opt.linkParams.ContainerPt[0].x += deltaX;
        T3Gv.opt.linkParams.ContainerPt[0].y += deltaY;
      }
    }

    // Set join flag for line objects in freehand mode
    T3Gv.opt.linkParams.AllowJoin = isFreeHandMode &&
      drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line;

    // Get hook points and adjust for movement
    const points = drawingObject.GetHookPoints(true);
    const perimeterPoints = drawingObject.GetPerimPts(objectId, points, 0, false, null, -1);

    // Adjust coordinates for movement delta
    for (let i = 0; i < perimeterPoints.length; i++) {
      perimeterPoints[i].x += deltaX;
      perimeterPoints[i].y += deltaY;
    }

    T3Util.Log("O.Opt MoveGetHookPoints - Output:", {
      pointCount: perimeterPoints.length,
      allowDropOnLine: T3Gv.opt.linkParams.DropOnLine,
      allowJoin: T3Gv.opt.linkParams.AllowJoin
    });

    return perimeterPoints;
  }

  /**
 * Handles hooking for multiple selected objects
 * @returns {boolean} True if handled successfully
 */
  static HandleMultipleSelectionHooks() {
    T3Util.Log("O.Opt HandleMultipleSelectionHooks - Input: No parameters");

    // Get selected objects
    const selectedList = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, false);
    if (selectedList.length <= 1) {
      T3Util.Log("O.Opt HandleMultipleSelectionHooks - Output: false (Only one object selected)");
      return false;
    }

    // Variables for processing
    let currentObject, connectId, objectId, selectedCount, objectIndex, newX, newY;
    let connectObject = null;
    let objectsToUpdate = [];
    let connectionPoints = [];

    // Get the target object that was dragged
    const targetObject = DataUtil.GetObjectPtr(T3Gv.opt.dragTargetId, false);

    // Process connection when we have a valid connection index
    if (T3Gv.opt.linkParams.ConnectIndex >= 0) {
      // Get the connection target object
      connectObject = DataUtil.GetObjectPtr(T3Gv.opt.linkParams.ConnectIndex, false);

      if (connectObject && connectObject instanceof Instance.Shape.ShapeContainer) {
        connectId = T3Gv.opt.linkParams.ConnectIndex;
        selectedCount = selectedList.length;

        // Flag for sparse container layout
        const isSparseContainer = connectObject.ContainerList.flags &
          NvConstant.ContainerListFlags.Sparse;

        // Handle case when target object already has a hook to the connect object
        if (targetObject.hooks.length && targetObject.hooks[0].objid === connectId) {
          // Process all other selected objects
          for (objectIndex = 0; objectIndex < selectedCount; objectIndex++) {
            objectId = selectedList[objectIndex];

            if (objectId !== T3Gv.opt.dragTargetId) {
              currentObject = DataUtil.GetObjectPtr(objectId, false);

              // If this object also hooks to the same container
              if (currentObject.hooks.length &&
                currentObject.hooks[0].objid === connectId) {

                if (isSparseContainer) {
                  // For sparse containers, maintain relative positioning
                  const deltaX = T3Gv.opt.linkParams.ConnectPt.x - targetObject.hooks[0].connect.x;
                  const deltaY = T3Gv.opt.linkParams.ConnectPt.y - targetObject.hooks[0].connect.y;

                  if (deltaX || deltaY) {
                    objectsToUpdate.push(objectId);

                    newX = currentObject.hooks[0].connect.x + deltaX;
                    newY = currentObject.hooks[0].connect.y + deltaY;

                    if (newX < 0) {
                      newX = 0;
                    }

                    connectionPoints.push({
                      x: newX,
                      y: newY
                    });
                  }
                } else {
                  // For regular containers, stack vertically
                  newX = T3Gv.opt.linkParams.ConnectPt.x;
                  if (newX < 0) {
                    newX = 0;
                  }

                  objectsToUpdate.push(objectId);
                  connectionPoints.push({
                    x: newX,
                    y: T3Gv.opt.linkParams.ConnectPt.y + objectsToUpdate.length
                  });
                }
              }
            }
          }
        } else {
          // Find other shapes that could connect to this container
          for (objectIndex = 0; objectIndex < selectedCount; objectIndex++) {
            objectId = selectedList[objectIndex];

            if (objectId !== T3Gv.opt.dragTargetId) {
              currentObject = DataUtil.GetObjectPtr(objectId, false);

              if (connectObject.IsShapeContainer(currentObject)) {
                objectsToUpdate.push(objectId);

                newX = T3Gv.opt.linkParams.ConnectPt.x;
                if (newX < 0) {
                  newX = 0;
                }

                connectionPoints.push({
                  x: newX,
                  y: T3Gv.opt.linkParams.ConnectPt.y + objectsToUpdate.length
                });
              }
            }
          }
        }
      }
    } else if (targetObject.hooks.length > 0) {
      // If target has hooks but no connection index, check if it's connected to a container
      connectId = targetObject.hooks[0].objid;
      connectObject = DataUtil.GetObjectPtr(connectId, false);

      if (connectObject && connectObject instanceof Instance.Shape.ShapeContainer) {
        // Find other objects hooked to the same container
        selectedCount = selectedList.length;

        for (objectIndex = 0; objectIndex < selectedCount; objectIndex++) {
          objectId = selectedList[objectIndex];

          if (objectId !== T3Gv.opt.dragTargetId) {
            currentObject = DataUtil.GetObjectPtr(objectId, false);

            if (currentObject.hooks.length &&
              currentObject.hooks[0].objid === connectId) {

              objectsToUpdate.push(objectId);
              connectionPoints.push(currentObject.hooks[0].connect);
            }
          }
        }
      }
    }

    // If we found additional objects to update, update their hooks
    const objectCount = objectsToUpdate.length;
    if (objectCount > 0) {
      // Add the target object to the beginning of the lists
      objectsToUpdate.unshift(T3Gv.opt.dragTargetId);
      connectionPoints.unshift(T3Gv.opt.linkParams.ConnectPt);

      // Update each object's hook
      for (objectIndex = 0; objectIndex < objectCount + 1; objectIndex++) {
        objectId = objectsToUpdate[objectIndex];

        this.UpdateHook(
          objectId,
          T3Gv.opt.linkParams.InitialHook,
          T3Gv.opt.linkParams.ConnectIndex,
          T3Gv.opt.linkParams.HookIndex,
          connectionPoints[objectIndex],
          T3Gv.opt.linkParams.ConnectInside
        );

        OptCMUtil.SetLinkFlag(
          T3Gv.opt.linkParams.ConnectIndex,
          DSConstant.LinkFlags.Move
        );

        this.CleanupHooks(
          T3Gv.opt.dragTargetId,
          T3Gv.opt.linkParams.ConnectIndex
        );
      }

      T3Util.Log("O.Opt HandleMultipleSelectionHooks - Output: true (Multiple hooks updated)");
      return true;
    }

    T3Util.Log("O.Opt HandleMultipleSelectionHooks - Output: false (No matching objects found)");
    return false;
  }

  static JoinHookList(targetList, sourceList) {
    T3Util.Log("O.Opt JoinHookList - Input:", { targetList, sourceList });

    if (targetList != null && sourceList != null) {
      for (let i = 0; i < sourceList.length; i++) {
        if (targetList.indexOf(sourceList[i]) < 0) {
          targetList.push(sourceList[i]);
        }
      }
    }

    T3Util.Log("O.Opt JoinHookList - Output: Lists joined");
  }

  static GetHookList(links, hookList, objectId, object, listCode, boundsRect) {
    T3Util.Log("O.Opt GetHookList - Input:", {
      objectId,
      listCode,
      hookListLength: hookList ? hookList.length : 0,
      boundsRect
    });

    let targetOnly = false;
    let skipObject = false;
    let linkIndex = -1;
    let objectRect = {};

    // Handle special list codes by mapping them to standard codes
    if (listCode === NvConstant.ListCodes.ChildrenOnly) {
      skipObject = true;
      listCode = NvConstant.ListCodes.CircTarg;
    }

    if (listCode === NvConstant.ListCodes.LinesOnly) {
      skipObject = true;
      listCode = NvConstant.ListCodes.TopOnly;
    }

    // Process based on list code type
    switch (listCode) {
      case NvConstant.ListCodes.MoveTarg:
        // For move targets, check if we need to switch to move hook mode
        if ((object.hooks.length > 1 ||
          (object.hooks.length === 1 &&
            object.flags & NvConstant.ObjFlags.Assoc))) {
          listCode = NvConstant.ListCodes.MoveHook;
        }

        // Return if objectId is already in the list
        if (hookList.indexOf(objectId) >= 0) {
          T3Util.Log("O.Opt GetHookList - Output: Object already in list", hookList);
          return hookList;
        }
        break;

      case NvConstant.ListCodes.MoveHook:
        // Return if objectId is already in the list
        if (hookList.indexOf(objectId) >= 0) {
          T3Util.Log("O.Opt GetHookList - Output: Object already in list", hookList);
          return hookList;
        }
        break;

      case NvConstant.ListCodes.MoveTargAndLines:
      case NvConstant.ListCodes.CircTarg:
        // No special handling for these codes
        break;

      case NvConstant.ListCodes.TargOnly:
        targetOnly = true;
        linkIndex = -1;
        break;
    }

    // Find the link index if not target-only mode
    if (!targetOnly) {
      linkIndex = OptCMUtil.FindLink(links, objectId, true);
    }

    // Add the object to the hook list if not already present and not skipped
    if (hookList.indexOf(objectId) < 0 && !skipObject) {
      hookList.push(objectId);

      // Update bounds rectangle if provided and object is visible
      if (boundsRect &&
        !(object.flags & NvConstant.ObjFlags.NotVisible)) {
        objectRect = object.GetMoveRect(true, true);

        if (hookList.length === 1) {
          Utils2.CopyRect(boundsRect, objectRect);
        } else {
          boundsRect = Utils2.UnionRect(boundsRect, objectRect, boundsRect);
        }
      }

      // Add enclosed objects to the hook list
      const enclosedObjects = object.GetListOfEnclosedObjects(true);
      if (enclosedObjects.length) {
        T3Gv.opt.JoinHookList(hookList, enclosedObjects);
      }
    }

    // Process linked objects if found
    if (linkIndex >= 0) {
      this.AddToHookList(links, hookList, linkIndex, objectId, listCode, 0, boundsRect);
    }

    // Handle special case for move hooks with multiple hooks or associated objects
    if (listCode === NvConstant.ListCodes.MoveHook &&
      (object.hooks.length >= 2 ||
        object.flags & NvConstant.ObjFlags.Assoc)) {
      this.GetTargetList(objectId, links, hookList, boundsRect, listCode);
    }

    T3Util.Log("O.Opt GetHookList - Output: Hook list updated", {
      hookListLength: hookList.length,
      boundsRect
    });

    return hookList;
  }

  static UpdateLineHops(forceUpdate: boolean) {
    T3Util.Log("O.Opt UpdateLineHops - Input:", { forceUpdate });

    // Retrieve the session object and check if hops are allowed
    const session = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    if (session.flags & OptConstant.SessionFlags.AllowHops) {
      this.HideHopTargets();
      const visibleObjects = LayerUtil.VisibleZList();
      const totalVisible = visibleObjects.length;

      // Arrays to store candidate line IDs and candidate lines with hops
      const candidateLineIds: number[] = [];
      const candidateLineHopIds: number[] = [];
      const hopDimension = session.hopdim.x;

      // Counters and mode flag variables for processing
      let allLineCount = 0;
      let hopLineCount = 0;
      let modeFlag = -1; // -1: initial, -2: found modified, -3: found hop
      let startHopIndex = 0;

      // Iterate through all visible objects to find BaseLine objects that need hop updates
      for (let i = 0; i < totalVisible; i++) {
        const objId = visibleObjects[i];
        const obj = DataUtil.GetObjectPtr(objId, false);
        if (obj instanceof Instance.Shape.BaseLine && !(obj instanceof Instance.Shape.PolyLine)) {
          // Check if object is modified or force update is enabled.
          if ((obj.flags & NvConstant.ObjFlags.LineMod || forceUpdate) && modeFlag === -1) {
            modeFlag = -2;
          }
          candidateLineIds.push(objId);
          allLineCount++;

          // Check if object has hop flag set
          if (obj.flags & NvConstant.ObjFlags.LineHop) {
            if (modeFlag === -2) {
              startHopIndex = hopLineCount;
              modeFlag = -3;
            }
            candidateLineHopIds.push(objId);
            hopLineCount++;
          }

          // Clear the modified flag for the object
          obj.flags = Utils2.SetFlag(obj.flags, NvConstant.ObjFlags.LineMod, false);
        }
      }

      // Process candidate lines with hops if any are found and modeFlag indicates hops
      if (hopLineCount && modeFlag === -3) {
        for (let j = startHopIndex; j < hopLineCount; j++) {
          const lineId = candidateLineHopIds[j];
          const lineObject = DataUtil.GetObjectPtr(lineId, false);

          // Reset hop list on the line
          lineObject.hoplist.nhops = 0;
          lineObject.hoplist.hops = [];

          // For each candidate line (up to the current one) that comes before the hop candidate,
          // check if there's any valid hook connection.
          for (let k = 0; k < allLineCount && candidateLineIds[k] !== lineId; k++) {
            let linkFound = false;

            // Check in the current object's hooks for a link to candidateLineIds[k]
            for (let hook of lineObject.hooks) {
              if (hook.objid === candidateLineIds[k]) {
                linkFound = true;
                break;
              }
            }
            // If no link is found, check the candidate object's hooks for a link to the current object
            if (!linkFound) {
              const candidateObj = DataUtil.GetObjectPtr(candidateLineIds[k], false);
              for (let hook of candidateObj.hooks) {
                if (hook.objid === lineId) {
                  linkFound = true;
                  break;
                }
              }
            }
            // If still not found, test the physical intersection of their bounding rectangles
            if (!linkFound) {
              const rectLine = {};
              const rectCandidate = {};
              Utils2.CopyRect(rectLine, lineObject.r);
              Utils2.CopyRect(rectCandidate, DataUtil.GetObjectPtr(candidateLineIds[k], false).r);
              if (rectLine["width"] === 0) rectLine["width"] = 1;
              if (rectLine["height"] === 0) rectLine["height"] = 1;
              if (rectCandidate["width"] === 0) rectCandidate["width"] = 1;
              if (rectCandidate["height"] === 0) rectCandidate["height"] = 1;

              if (Utils2.IntersectRect(rectLine, rectCandidate)) {
                lineObject.CalcLineHops(DataUtil.GetObjectPtr(candidateLineIds[k], false), 0);
              }
            }
          }

          // If more than one hop is recorded, sort and consolidate close hops
          if (lineObject.hoplist.nhops > 1) {
            lineObject.hoplist.hops.sort(this.Hop_Compare);
            for (let a = lineObject.hoplist.nhops - 1; a > 0; a--) {
              const deltaX = lineObject.hoplist.hops[a - 1].pt.x - lineObject.hoplist.hops[a].pt.x;
              const deltaY = lineObject.hoplist.hops[a - 1].pt.y - lineObject.hoplist.hops[a].pt.y;
              if (Utils2.sqrt(deltaX * deltaX + deltaY * deltaY) < 3 * hopDimension) {
                lineObject.hoplist.hops[a - 1].cons = true;
              }
            }
          }

          // Adjust hop positions relative to the line's start and end points and mark the object as dirty
          if (lineObject.hoplist.nhops || lineObject.hoplist.hops.length) {
            const baseRect = Utils2.Pt2Rect(lineObject.StartPoint, lineObject.EndPoint);
            for (let a = 0; a < lineObject.hoplist.nhops; a++) {
              lineObject.hoplist.hops[a].pt.x -= baseRect.x;
              lineObject.hoplist.hops[a].pt.y -= baseRect.y;
            }
            DataUtil.AddToDirtyList(lineId);
          }
        }
      }
    }
    T3Util.Log("O.Opt UpdateLineHops - Output: Completed updating line hops");
  }

  static FixAnyCircularHooks(initialLinkObject?: any): void {
    T3Util.Log("O.Opt FixAnyCircularHooks - Input:", { initialLinkObject });

    // Determine the initial hook IDs
    const hookIds = initialLinkObject
      ? [initialLinkObject.BlockID]
      : (() => {
        const links = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false);
        let ids: number[] = [];
        const linksCount = links.length;
        for (let i = 0; i < linksCount; i++) {
          if (!ids.includes(links[i].hookid)) {
            ids.push(links[i].hookid);
          }
        }
        return ids;
      })();

    // Array to store circular hook pairs
    let circularHookPairs: Array<{ objectId: number; hookObjectId: number }> = [];

    // Traverse each hook id to find circular references
    const hookIdsCount = hookIds.length;
    for (let i = 0; i < hookIdsCount; i++) {
      traverseHooks(circularHookPairs, hookIds[i]);
    }

    // Function to recursively traverse hooks
    function traverseHooks(
      result: Array<{ objectId: number; hookObjectId: number }>,
      currentId: number,
      visited: number[] = []
    ) {
      // Add current id to visited list
      visited.push(currentId);
      const currentObject = DataUtil.GetObjectPtr(currentId, false);
      if (!currentObject) return;
      const hooksCount = currentObject.hooks.length;
      for (let j = 0; j < hooksCount; j++) {
        const nextHookId = currentObject.hooks[j].objid;
        if (visited.indexOf(nextHookId) >= 0) {
          addHookPair(result, currentId, nextHookId);
        } else {
          traverseHooks(result, nextHookId, copyArray(visited));
        }
      }
    }

    // Helper function to copy an array
    function copyArray(arr: number[]): number[] {
      let newArr: number[] = [];
      for (let i = 0; i < arr.length; i++) {
        newArr[i] = arr[i];
      }
      return newArr;
    }

    // Helper function to add a hook pair if not already present
    function addHookPair(
      result: Array<{ objectId: number; hookObjectId: number }>,
      objectId: number,
      hookObjectId: number
    ) {
      if (!result.some(item => item.objectId === objectId && item.hookObjectId === hookObjectId)) {
        result.push({ objectId, hookObjectId });
      }
    }

    // Process the found circular hook pairs
    (function processCircularHooks(hookPairs: Array<{ objectId: number; hookObjectId: number }>) {
      const links = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false);
      const hookPairsCount = hookPairs.length;
      for (let i = 0; i < hookPairsCount; i++) {
        const currentObj = DataUtil.GetObjectPtr(hookPairs[i].objectId, true);
        const hookObj = DataUtil.GetObjectPtr(hookPairs[i].hookObjectId);
        if (hookObj instanceof Instance.Shape.Connector) {
          DataUtil.DeleteObjects([hookObj.BlockID], false);
          continue;
        }
        currentObj.hooks = currentObj.hooks.filter(h => h.objid != hookPairs[i].hookObjectId);
        const linkIndex = T3Gv.opt.FindExactLink(links, hookPairs[i].hookObjectId, hookPairs[i].objectId);
        if (linkIndex >= 0) {
          links[linkIndex].flags = Utils2.SetFlag(links[linkIndex].flags, DSConstant.LinkFlags.DeleteTarget, true);
        }
      }
    })(circularHookPairs);

    T3Util.Log("O.Opt FixAnyCircularHooks - Output: Circular hooks fixed", { circularHookPairs });
  }

}

export default HookUtil
