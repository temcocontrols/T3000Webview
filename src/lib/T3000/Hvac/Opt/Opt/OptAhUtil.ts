

import NvConstant from '../../Data/Constant/NvConstant';
import OptConstant from "../../Data/Constant/OptConstant";
import Instance from "../../Data/Instance/Instance";
import T3Gv from "../../Data/T3Gv";
import ObjectUtil from "../Data/ObjectUtil";
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
 *   T3Util.Log(`Tree top shape ID: ${result.topshape}`);
 *   T3Util.Log(`Tree top connector ID: ${result.topconnector}`);
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
 *   T3Util.Log(`Parent connector found at position (${position.x}, ${position.y})`);
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

  ShiftConnectedShapes  (e, t, a, r, i, n, o) {
    var s, l, S, c = [], u = [], p = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, !1), d = OptConstant.ActionArrow;
    SDJS.Business.GetLineTree(t, a, c),
      s = SDJS.Business.FilterChartShapes(e, r, c, i);
    var D, g, h = 0, m = 0, C = gListManager.GetObjectPtr(a, !1), y = gListManager.GetObjectPtr(e, !1);
    if (i && null != n) {
      var f = gListManager.GetObjectPtr(n, !1);
      if (f)
        if (f.flags & SDJS.ListManager.ObjFlags.SEDO_UseConnect && f.ConnectPoints) {
          var L = SDJS.Editor.DeepCopy(f);
          g = L.AdjustAutoInsertShape(L.Frame, r === d.UP || r === d.DOWN, !0) ? {
            width: L.Frame.height,
            height: L.Frame.width
          } : f.Frame
        } else
          g = f.Frame
    }
    switch (null == g && (g = y.Frame),
    r) {
      case d.RIGHT:
        null != o ? (h = o,
          l = 20) : (h = g.width + p.def.h_arraywidth,
            l = p.def.g_arraywidth),
          D = Math.abs(C.EndPoint.x - C.StartPoint.x),
          !i && D - h < l && (h = D - l);
        break;
      case d.LEFT:
        h = null != o ? o : g.width + p.def.h_arraywidth,
          D = Math.abs(C.EndPoint.x - C.StartPoint.x),
          !i && D - h < p.def.h_arraywidth && (h = D - p.def.h_arraywidth),
          h = -h;
        break;
      case d.DOWN:
        null != o ? (m = o,
          l = 20) : (m = g.height + p.def.v_arraywidth,
            l = p.def.v_arraywidth),
          D = Math.abs(C.EndPoint.y - C.StartPoint.y),
          !i && D - m < l && (m = D - l);
        break;
      case d.UP:
        m = null != o ? o : g.height + p.def.v_arraywidth,
          D = Math.abs(C.EndPoint.y - C.StartPoint.y),
          !i && D - m < p.def.v_arraywidth && (m = D - p.def.v_arraywidth),
          m = -m
    }
    if (!i && (h = -h,
      m = -m,
      SDJS.Business.GetLineTree(t, -1, u),
      (S = SDJS.Business.FilterChartShapes(e, r, u, i)).remainframe && s.shiftframe))
      switch (s.shiftframe.x += h,
      s.shiftframe.y += m,
      r) {
        case d.RIGHT:
          if (s.shiftframe.x < S.remainframe.x + S.remainframe.width + 20)
            return -1;
          break;
        case d.LEFT:
          if (s.shiftframe.x + S.shiftframe.width + Mingap > S.remainframe.x)
            return -1;
          break;
        case d.DOWN:
          if (s.shiftframe.y < S.remainframe.y + S.remainframe.height + 20)
            return -1;
          break;
        case d.LEFT:
          if (s.shiftframe.y + S.shiftframe.height + Mingap > S.remainframe.y)
            return -1
      }
    var I = (c = s.newlist).length;
    for (j = 0; j < I; j++)
      gListManager.OffsetShape(c[j], h, m, 0)
  }
}

export default OptAhUtil
