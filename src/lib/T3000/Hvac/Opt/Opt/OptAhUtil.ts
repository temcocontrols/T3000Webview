

import NvConstant from '../../Data/Constant/NvConstant';
import OptConstant from "../../Data/Constant/OptConstant";
import ShapeConstant from '../../Data/Constant/ShapeConstant';
import Instance from "../../Data/Instance/Instance";
import T3Gv from "../../Data/T3Gv";
import Utils1 from '../../Util/Utils1';
import Utils2 from '../../Util/Utils2';
import ObjectUtil from "../Data/ObjectUtil";
import HookUtil from './HookUtil';
import OptCMUtil from "./OptCMUtil";
import SelectUtil from "./SelectUtil";
import ToolActUtil from './ToolActUtil';

/**
 * Utility class for handling HVAC optimization operations in T3000 system.
 * Provides methods to navigate drawing hierarchies, find tree structures,
 * manage object selections, and handle container relationships.
 *
 * The class primarily works with drawing objects in optimization scenarios,
 * handling specialized operations for connectors, shapes, and container objects.
 *
 * @example
 * // Getting the global service operation instance
 * const serviceOpt = OptAhUtil.GetGvSviOpt();
 *
 * @example
 * // Finding the top element of a tree structure
 * const result = { foundtree: false, topconnector: -1, topshape: -1 };
 * const treeFound = OptAhUtil.FindTreeTop(drawingObject, true, result);
 * if (treeFound) {
 *   LogUtil.Debug(`Tree top shape ID: ${result.topshape}`);
 *   LogUtil.Debug(`Tree top connector ID: ${result.topconnector}`);
 * }
 *
 * @example
 * // Selecting the parent container
 * const objectId = 123;
 * const parentId = OptAhUtil.SelectContainerParent(objectId);
 *
 * @example
 * // Navigating to the next logical selection
 * const nextObjectId = OptAhUtil.GetNextSelect();
 * if (nextObjectId >= 0) {
 *   // Select the next object
 *   T3Gv.opt.SelectObject(nextObjectId);
 * }
 *
 * @example
 * // Finding a parent connector
 * const position = { x: 0, y: 0 };
 * const connectorId = OptAhUtil.GetParentConnector(objectId, position);
 * if (connectorId >= 0) {
 *   LogUtil.Debug(`Parent connector found at position (${position.x}, ${position.y})`);
 * }
 */
class OptAhUtil {

  /**
   * Retrieves the global service operation instance
   * @param selectionObject - The selection object (unused in current implementation)
   * @param options - Additional options (unused in current implementation)
   * @returns The global service operation instance
   */
  static GetGvSviOpt(selectionObject?, options?) {
    return T3Gv.wallOpt;
  }

  /**
   * Finds the top element of a tree structure in the drawing hierarchy
   * @param drawingObject - The drawing object to evaluate
   * @param setLinkFlag - Whether to set link flags during traversal
   * @param result - Object to store the results of the tree traversal
   * @returns Boolean indicating whether a tree structure was found
   */
  static FindTreeTop(drawingObject, setLinkFlag, result) {
    if (!drawingObject) {
      return result.foundtree;
    }

    // Skip line objects
    if (drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line) {
      return false;
    }

    // Process based on object type
    if (drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
      result.topconnector = drawingObject.BlockID;
      result.foundtree = true;

      if (setLinkFlag) {
        OptCMUtil.SetLinkFlag(drawingObject.BlockID, setLinkFlag);
      }
    } else {
      result.topshape = drawingObject.BlockID;

      if (result.level != null) {
        result.level++;
      }

      if (setLinkFlag) {
        OptCMUtil.SetLinkFlag(drawingObject.BlockID, setLinkFlag);
      }
    }

    // Process hooks if available
    if (drawingObject.hooks.length) {
      // Handle self-referencing hooks
      if (drawingObject.hooks[0].objid === drawingObject.BlockID) {
        drawingObject.hooks.splice(0, 1);
      } else {
        const childObject = ObjectUtil.GetObjectPtr(drawingObject.hooks[0].objid, false);
        if (childObject) {
          this.FindTreeTop(childObject, setLinkFlag, result);
        }
      }
    } else if (result.foundtree) {
      // Handle connector objects after tree is found
      if (drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
        const childArrayId = T3Gv.opt.FindChildArray(result.topshape, -1);
        if (childArrayId >= 0) {
          result.secondconnector = childArrayId;
        }
      }
    } else {
      // Find child arrays if tree not yet found
      const childArrayId = T3Gv.opt.FindChildArray(drawingObject.BlockID, -1);
      if (childArrayId >= 0) {
        result.topconnector = childArrayId;
        result.foundtree = true;

        if (setLinkFlag) {
          OptCMUtil.SetLinkFlag(childArrayId, setLinkFlag);
        }
      }
    }

    return result.foundtree;
  }

  /**
   * Selects the parent container of an object if applicable
   * @param objectId - The ID of the object to check
   * @returns The ID of the parent container if available, otherwise returns the original object ID
   */
  static SelectContainerParent(objectId) {
    const object = ObjectUtil.GetObjectPtr(objectId, false);

    return object &&
      object instanceof Instance.Shape.ShapeContainer &&
      object.hooks.length &&
      object.hooks[0].cellid != null ? object.hooks[0].objid : objectId;
  }

  /**
   * Determines if a shape cannot have action buttons
   * @param shape - The shape to evaluate
   * @returns Boolean indicating whether the shape cannot have action buttons
   */
  static ShapeCannotHaveActionButtons(shape) {
    // return !!shape.IsSwimlane();
    return true;
  }

  /**
   * Navigates to the next logical object to select based on the current selection
   * @returns The ID of the next object to select, or -1 if no suitable next selection is found
   */
  static GetNextSelect() {
    const currentSelectedId = SelectUtil.GetTargetSelect();
    const currentListSelection = ObjectUtil.GetObjectPtr(T3Gv.opt.selectObjsBlockId, false);
    let nextSelection = -1;

    if (currentSelectedId >= 0) {
      const currentObject = ObjectUtil.GetObjectPtr(currentSelectedId, false);

      if (currentObject && currentObject.hooks.length) {
        const childId = currentObject.hooks[0].objid;
        const childObject = ObjectUtil.GetObjectPtr(childId, false);

        if (childObject && childObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
          // Handle flow chart connectors
          if (childObject.IsFlowChartConnector()) {
            return -1;
          }
          nextSelection = OptAhUtil.GetConnectorNextSelect(childObject, currentSelectedId, currentListSelection);
        }
        // Handle container shapes
        else if (childObject && childObject instanceof Instance.Shape.ShapeContainer) {
          const containerList = childObject.ContainerList;
          const listItems = containerList.List;
          const isSparse = containerList.flags & NvConstant.ContainerListFlags.Sparse;
          const itemCount = listItems.length;
          let currentIndex = -1;

          // Find the current index in the container list
          for (let i = 0; i < itemCount; i++) {
            if (listItems[i].id === currentSelectedId) {
              currentIndex = i;
              break;
            }
          }

          if (isSparse) {

            if (nextSelection >= 0) {
              return nextSelection;
            }

            // Sequential search if navigation methods failed
            if (nextSelection < 0) {
              // Search backwards
              for (let i = currentIndex - 1; i >= 0; i--) {
                if (listItems[i].id >= 0) {
                  return listItems[i].id;
                }
              }

              // Search forwards
              for (let i = currentIndex + 1; i < itemCount; i++) {
                if (listItems[i].id >= 0) {
                  return listItems[i].id;
                }
              }
            }
          } else {
            // Simple navigation for non-sparse containers
            if (currentIndex >= 0) {
              if (currentIndex > 0) {
                nextSelection = listItems[currentIndex - 1].id;
              } else if (itemCount > 1) {
                nextSelection = listItems[currentIndex + 1].id;
              }
            }
          }
        }
        return nextSelection;
      }

      // Handle child arrays
      const childArrayId = T3Gv.opt.FindChildArray(currentSelectedId, -1);
      if (childArrayId >= 0) {
        const childArray = ObjectUtil.GetObjectPtr(childArrayId, false);
      }
    }
    return nextSelection;
  }

  /**
   * Retrieves the parent connector object for a given object
   * @param objectId - The ID of the object to find the parent connector for
   * @param positionOut - Optional object to receive connection position coordinates
   * @returns The ID of the parent connector, or -1 if not found
   */
  static GetParentConnector(objectId, positionOut) {
    let connectorId = -1;
    const object = ObjectUtil.GetObjectPtr(objectId, false);

    if (object && object.hooks.length) {
      const parentId = object.hooks[0].objid;

      if (parentId >= 0) {
        const parentObject = ObjectUtil.GetObjectPtr(parentId, false);

        if (parentObject &&
          parentObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
          connectorId = parentId;

          if (positionOut) {
            positionOut.x = object.hooks[0].connect.x;
            positionOut.y = object.hooks[0].connect.y;
          }
        }
      }
    }

    return connectorId;
  }

  /**
   * Checks if an object has a container as its parent
   * @param object - The object to check
   * @returns The ID of the container parent if it exists, otherwise false
   */
  static HasContainerParent(object) {
    if (object && object.hooks.length) {
      const parentId = object.hooks[0].objid;
      const parentObject = ObjectUtil.GetObjectPtr(parentId, false);

      if (parentObject && parentObject instanceof Instance.Shape.ShapeContainer) {
        return parentId;
      }
    }
    return false;
  }

  /**
   * Shifts a group of connected shapes in a specified direction
   * @param sourceShapeId - The ID of the source shape
   * @param targetShapeId - The ID of the target shape
   * @param lineId - The ID of the connecting line
   * @param direction - The direction to shift (Up, Down, Left, Right)
   * @param isInsert - Whether this is an insert operation
   * @param referenceShapeId - Optional reference shape ID for positioning
   * @param customDistance - Optional custom distance to shift
   * @returns Number indicating success (-1 for failure) or undefined for success
   */
  static ShiftConnectedShapes(sourceShapeId, targetShapeId, lineId, direction, isInsert, referenceShapeId, customDistance) {
    let filteredResult, sourcesResult;
    let connectedObjects = [];
    let allObjects = [];
    let sdData = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    let actionArrow = OptConstant.ActionArrow;

    // Build a tree of connected objects
    OptAhUtil.GetLineTree(targetShapeId, lineId, connectedObjects);
    filteredResult = OptAhUtil.FilterChartShapes(sourceShapeId, direction, connectedObjects, isInsert);

    let distance, minimumGap;
    let horizontalShift = 0;
    let verticalShift = 0;
    let lineObject = ObjectUtil.GetObjectPtr(lineId, false);
    let sourceObject = ObjectUtil.GetObjectPtr(sourceShapeId, false);
    let referenceFrame;

    // Determine reference dimensions
    if (isInsert && referenceShapeId != null) {
      let referenceObject = ObjectUtil.GetObjectPtr(referenceShapeId, false);

      if (referenceObject) {
        if (referenceObject.flags & NvConstant.ObjFlags.UseConnect && referenceObject.ConnectPoints) {
          let clonedReference = Utils1.DeepCopy(referenceObject);
          referenceFrame = clonedReference.AdjustAutoInsertShape(
            clonedReference.Frame,
            direction === actionArrow.Up || direction === actionArrow.Down,
            true
          ) ? {
            width: clonedReference.Frame.height,
            height: clonedReference.Frame.width
          } : referenceObject.Frame;
        } else {
          referenceFrame = referenceObject.Frame;
        }
      }
    }

    if (referenceFrame == null) {
      referenceFrame = sourceObject.Frame;
    }

    // Calculate shift amounts based on direction
    switch (direction) {
      case actionArrow.Right:
        if (customDistance != null) {
          horizontalShift = customDistance;
          minimumGap = 20;
        } else {
          horizontalShift = referenceFrame.width + sdData.def.h_arraywidth;
          minimumGap = sdData.def.g_arraywidth;
        }

        distance = Math.abs(lineObject.EndPoint.x - lineObject.StartPoint.x);

        if (!isInsert && distance - horizontalShift < minimumGap) {
          horizontalShift = distance - minimumGap;
        }
        break;

      case actionArrow.Left:
        horizontalShift = customDistance != null ?
          customDistance :
          referenceFrame.width + sdData.def.h_arraywidth;

        distance = Math.abs(lineObject.EndPoint.x - lineObject.StartPoint.x);

        if (!isInsert && distance - horizontalShift < sdData.def.h_arraywidth) {
          horizontalShift = distance - sdData.def.h_arraywidth;
        }

        horizontalShift = -horizontalShift;
        break;

      case actionArrow.Down:
        if (customDistance != null) {
          verticalShift = customDistance;
          minimumGap = 20;
        } else {
          verticalShift = referenceFrame.height + sdData.def.v_arraywidth;
          minimumGap = sdData.def.v_arraywidth;
        }

        distance = Math.abs(lineObject.EndPoint.y - lineObject.StartPoint.y);

        if (!isInsert && distance - verticalShift < minimumGap) {
          verticalShift = distance - minimumGap;
        }
        break;

      case actionArrow.Up:
        verticalShift = customDistance != null ?
          customDistance :
          referenceFrame.height + sdData.def.v_arraywidth;

        distance = Math.abs(lineObject.EndPoint.y - lineObject.StartPoint.y);

        if (!isInsert && distance - verticalShift < sdData.def.v_arraywidth) {
          verticalShift = distance - sdData.def.v_arraywidth;
        }

        verticalShift = -verticalShift;
    }

    // For non-insert operations, check for overlap with remaining objects
    if (!isInsert) {
      horizontalShift = -horizontalShift;
      verticalShift = -verticalShift;

      OptAhUtil.GetLineTree(targetShapeId, -1, allObjects);
      sourcesResult = OptAhUtil.FilterChartShapes(sourceShapeId, direction, allObjects, isInsert);

      if (sourcesResult.remainframe && filteredResult.shiftframe) {
        filteredResult.shiftframe.x += horizontalShift;
        filteredResult.shiftframe.y += verticalShift;

        const minGap = 20; // Minimum gap between shapes

        switch (direction) {
          case actionArrow.Right:
            if (filteredResult.shiftframe.x < sourcesResult.remainframe.x + sourcesResult.remainframe.width + minGap) {
              return -1;
            }
            break;

          case actionArrow.Left:
            if (filteredResult.shiftframe.x + filteredResult.shiftframe.width + minGap > sourcesResult.remainframe.x) {
              return -1;
            }
            break;

          case actionArrow.Down:
            if (filteredResult.shiftframe.y < sourcesResult.remainframe.y + sourcesResult.remainframe.height + minGap) {
              return -1;
            }
            break;

          case actionArrow.Up:
            if (filteredResult.shiftframe.y + filteredResult.shiftframe.height + minGap > sourcesResult.remainframe.y) {
              return -1;
            }
        }
      }
    }

    // Apply the shift to all affected shapes
    let shapesToShift = filteredResult.newlist;
    let shapeCount = shapesToShift.length;

    for (let i = 0; i < shapeCount; i++) {
      ToolActUtil.OffsetShape(shapesToShift[i], horizontalShift, verticalShift, 0);
    }
  }

  /**
   * Builds a tree of connected objects starting from a given shape
   * @param objectId - The ID of the source shape to start tree building from
   * @param excludeLineId - The ID of a line to exclude from the tree traversal (optional)
   * @param connectedObjects - Array to collect the connected objects in the tree
   */
  static GetLineTree(objectId, excludeLineId, connectedObjects) {
    // Add source object if not already in the array
    if (connectedObjects.indexOf(objectId) < 0) {
      connectedObjects.push(objectId);
    }

    const sourceObject = ObjectUtil.GetObjectPtr(objectId, false);

    // Process hook connections (parent objects)
    if (sourceObject && sourceObject.hooks.length && connectedObjects.indexOf(sourceObject.hooks[0].objid) < 0) {
      const parentObject = ObjectUtil.GetObjectPtr(sourceObject.hooks[0].objid, false);

      if (parentObject && parentObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
        // Parent is a connector - traverse the connector tree
        OptAhUtil.GetConnectorTree(parentObject.BlockID, connectedObjects, true);
      } else {
        // Handle special shape types
        let nextObjectId = objectId;

        switch (parentObject.objecttype) {
          case ShapeConstant.ObjectTypes.NgTimeLine:
            nextObjectId = sourceObject.hooks[0].objid;
            break;
          case ShapeConstant.ObjectTypes.NgEvent:
            if (parentObject.hooks.length > 0) {
              nextObjectId = parentObject.hooks[0].objid;
            }
            break;
        }

        if (connectedObjects.indexOf(nextObjectId) < 0) {
          connectedObjects.push(nextObjectId);
        }
      }
    }

    // Find and process child connectors
    const childConnectors = HookUtil.FindAllChildConnectors(objectId);
    for (let i = 0; i < childConnectors.length; i++) {
      if (connectedObjects.indexOf(childConnectors[i]) < 0) {
        OptAhUtil.GetConnectorTree(childConnectors[i], connectedObjects, true);
      }
    }

    // Find and process child lines
    let associatedId;
    const childLines = T3Gv.opt.FindAllChildLines(objectId);

    for (let i = 0; i < childLines.length; i++) {
      // Skip the excluded line and lines already processed
      if (childLines[i] !== excludeLineId && connectedObjects.indexOf(childLines[i]) < 0) {
        connectedObjects.push(childLines[i]);
        const lineObject = ObjectUtil.GetObjectPtr(childLines[i], false);

        if (lineObject && lineObject.hooks.length === 2) {
          // Process objects connected to both ends of the line
          for (let hookIndex = 0; hookIndex < 2; hookIndex++) {
            const connectedId = lineObject.hooks[hookIndex].objid;

            if (connectedId !== objectId) {
              const connectedObject = ObjectUtil.GetObjectPtr(connectedId, false);

              if (connectedObject && connectedObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
                OptAhUtil.GetLineTree(connectedId, childLines[i], connectedObjects);
              }
            }
          }
        } else if (lineObject.objecttype === ShapeConstant.ObjectTypes.NgEvent) {
          // Handle event objects with associations
          associatedId = lineObject.associd;
          if (associatedId >= 0 && connectedObjects.indexOf(associatedId) < 0) {
            connectedObjects.push(associatedId);
          }
        }
      }
    }
  }

  /**
   * Filters shapes in a chart based on their position relative to a reference shape
   * @param referenceShapeId - The ID of the reference shape to compare positions against
   * @param direction - The direction to filter (from OptConstant.ActionArrow: Up, Down, Left, Right)
   * @param objectList - Array of object IDs to filter
   * @param isInsert - Whether this is an insert operation
   * @returns Object containing the filtered shape list and bounding frames
   */
  static FilterChartShapes(referenceShapeId, direction, objectList, isInsert) {
    let shiftFrame, remainFrame;
    let referenceShape = ObjectUtil.GetObjectPtr(referenceShapeId, false);
    let filteredShapes = [];
    let actionArrow = OptConstant.ActionArrow;

    if (referenceShape) {
      let objectIndex, currentObject, objectId, shouldIncludeObject;
      let objectCount = objectList.length;
      let referenceRight = referenceShape.Frame.x + referenceShape.Frame.width;
      let referenceBottom = referenceShape.Frame.y + referenceShape.Frame.height;

      for (objectIndex = 0; objectIndex < objectCount; objectIndex++) {
        objectId = objectList[objectIndex];

        // Skip the reference shape itself
        if (objectId !== referenceShapeId) {
          currentObject = ObjectUtil.GetObjectPtr(objectId, false);

          if (currentObject && currentObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
            shouldIncludeObject = false;

            // Filter objects based on their position relative to the reference shape
            switch (direction) {
              case actionArrow.Right:
                if (currentObject.Frame.x > referenceRight) {
                  filteredShapes.push(objectId);
                  shouldIncludeObject = true;
                }
                break;

              case actionArrow.Left:
                if (currentObject.Frame.x + currentObject.Frame.width < referenceShape.Frame.x) {
                  filteredShapes.push(objectId);
                  shouldIncludeObject = true;
                }
                break;

              case actionArrow.Down:
                if (currentObject.Frame.y > referenceBottom) {
                  filteredShapes.push(objectId);
                  shouldIncludeObject = true;
                }
                break;

              case actionArrow.Up:
                if (currentObject.Frame.y + currentObject.Frame.height < referenceShape.Frame.y) {
                  filteredShapes.push(objectId);
                  shouldIncludeObject = true;
                }
                break;

              default:
                filteredShapes.push(objectId);
                shouldIncludeObject = true;
            }

            // Calculate bounding frames for non-insert operations
            if (!isInsert) {
              if (shouldIncludeObject) {
                // Update the shift frame for included objects
                if (shiftFrame == null) {
                  shiftFrame = Utils1.DeepCopy(currentObject.r);
                } else {
                  Utils2.UnionRect(shiftFrame, currentObject.r, shiftFrame);
                }
              } else {
                // Update the remain frame for excluded objects
                if (remainFrame == null) {
                  remainFrame = Utils1.DeepCopy(currentObject.r);
                } else {
                  Utils2.UnionRect(remainFrame, currentObject.r, remainFrame);
                }
              }
            }
          }
        }
      }
    }

    return {
      newlist: filteredShapes,
      shiftframe: shiftFrame,
      remainframe: remainFrame
    };
  }

  /**
   * Builds a tree of connected objects starting from a connector
   * @param connectorId - The ID of the connector to start traversal from
   * @param connectedObjects - Array to collect the connected objects in the tree
   * @param includeChildLines - Whether to include objects connected via child lines
   */
  static GetConnectorTree(connectorId, connectedObjects, includeChildLines?) {
    // Add current connector if not already in array
    if (connectedObjects.indexOf(connectorId) < 0) {
      connectedObjects.push(connectorId);
    }

    const connector = ObjectUtil.GetObjectPtr(connectorId, false);

    // Process all hooks in the connector's array list
    if (connector && connector.arraylist) {
      const hookCount = connector.arraylist.hook.length;

      // Start from index 1 (skip the first hook)
      for (let hookIndex = 1; hookIndex < hookCount; hookIndex++) {
        const hookedObjectId = connector.arraylist.hook[hookIndex].id;

        if (hookedObjectId >= 0) {
          // Process hooked object if not already in the array
          if (connectedObjects.indexOf(hookedObjectId) < 0) {
            connectedObjects.push(hookedObjectId);

            const hookedObject = ObjectUtil.GetObjectPtr(hookedObjectId, false);
            if (hookedObject &&
              hookedObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
              OptAhUtil.GetConnectorTree(hookedObjectId, connectedObjects);
            }
          }

          // Process all child connectors of the hooked object
          const childConnectors = HookUtil.FindAllChildConnectors(hookedObjectId);
          const childConnectorCount = childConnectors.length;

          for (let i = 0; i < childConnectorCount; i++) {
            this.GetConnectorTree(childConnectors[i], connectedObjects, includeChildLines);
          }

          // If includeChildLines is true, also process child lines and their connected objects
          if (includeChildLines) {
            const childLines = T3Gv.opt.FindAllChildLines(hookedObjectId);
            const lineCount = childLines.length;

            for (let i = 0; i < lineCount; i++) {
              if (connectedObjects.indexOf(childLines[i]) < 0) {
                connectedObjects.push(childLines[i]);

                const lineObject = ObjectUtil.GetObjectPtr(childLines[i], false);

                if (lineObject && lineObject.hooks.length === 2) {
                  // Process objects connected to both ends of the line
                  for (let hookIndex = 0; hookIndex < 2; hookIndex++) {
                    const connectedId = lineObject.hooks[hookIndex].objid;

                    if (connectedId !== hookedObjectId) {
                      const connectedObject = ObjectUtil.GetObjectPtr(connectedId, false);

                      if (connectedObject &&
                        connectedObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
                        OptAhUtil.GetLineTree(connectedId, childLines[i], connectedObjects);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

export default OptAhUtil
