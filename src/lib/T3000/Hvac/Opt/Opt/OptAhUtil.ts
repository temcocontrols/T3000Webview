

import NvConstant from '../../Data/Constant/NvConstant';
import OptConstant from "../../Data/Constant/OptConstant";
import Instance from "../../Data/Instance/Instance";
import T3Gv from "../../Data/T3Gv";
import DataUtil from "../Data/DataUtil";
import OptCMUtil from "./OptCMUtil";
import SelectUtil from "./SelectUtil";

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
 *   console.log(`Tree top shape ID: ${result.topshape}`);
 *   console.log(`Tree top connector ID: ${result.topconnector}`);
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
 *   console.log(`Parent connector found at position (${position.x}, ${position.y})`);
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
        const childObject = DataUtil.GetObjectPtr(drawingObject.hooks[0].objid, false);
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
    const object = DataUtil.GetObjectPtr(objectId, false);

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
    const currentListSelection = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, false);
    let nextSelection = -1;

    if (currentSelectedId >= 0) {
      const currentObject = DataUtil.GetObjectPtr(currentSelectedId, false);

      if (currentObject && currentObject.hooks.length) {
        const childId = currentObject.hooks[0].objid;
        const childObject = DataUtil.GetObjectPtr(childId, false);

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
        const childArray = DataUtil.GetObjectPtr(childArrayId, false);
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
    const object = DataUtil.GetObjectPtr(objectId, false);

    if (object && object.hooks.length) {
      const parentId = object.hooks[0].objid;

      if (parentId >= 0) {
        const parentObject = DataUtil.GetObjectPtr(parentId, false);

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
      const parentObject = DataUtil.GetObjectPtr(parentId, false);

      if (parentObject && parentObject instanceof Instance.Shape.ShapeContainer) {
        return parentId;
      }
    }
    return false;
  }
}

export default OptAhUtil
