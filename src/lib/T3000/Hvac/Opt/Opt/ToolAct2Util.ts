import NvConstant from "../../Data/Constant/NvConstant";
import OptConstant from "../../Data/Constant/OptConstant";
import Instance from "../../Data/Instance/Instance";
import T3Gv from "../../Data/T3Gv";
import Utils1 from "../../Util/Utils1";
import Utils2 from "../../Util/Utils2";
import DataUtil from "../Data/DataUtil";
import DSConstant from "../DS/DSConstant";
import DrawUtil from "./DrawUtil";
import HookUtil from "./HookUtil";
import LayerUtil from "./LayerUtil";
import OptCMUtil from "./OptCMUtil";
import SelectUtil from "./SelectUtil";
import SvgUtil from "./SvgUtil";


class ToolAct2Util {

  /**
   * Groups selected shapes together into a single group symbol
   * @param action - The action that triggered the grouping
   * @param customSelectionList - Optional list of shapes to group (if not provided, uses selected objects)
   * @param useAllShapes - If true, uses all shapes in the drawing instead of just selected shapes
   * @param skipRender - If true, doesn't render objects after grouping
   * @param enableCollaboration - If true, enables collaboration features
   * @returns The ID of the newly created group or false if grouping cannot be performed
   */
  GroupSelectedShapes(action, customSelectionList, useAllShapes, skipRender, enableCollaboration) {
    let index, currentObject;
    let hasNoRotateObject = false;
    let commentIDs = [];

    // Get either all visible shapes or just selected shapes based on parameters
    let visibleShapes = LayerUtil.ActiveVisibleZList();
    if (useAllShapes) {
      visibleShapes = LayerUtil.ZList();
    }

    let visibleShapeCount = visibleShapes.length;
    if (visibleShapeCount === 0) {
      return false;
    }

    // Get list of shapes to group
    const selectionList = customSelectionList || T3Gv.stdObj.GetObject(T3Gv.opt.theSelectedListBlockID).Data;
    const selectedCount = selectionList.length;
    if (selectedCount <= 1) {
      return false;
    }

    // Get the move list - either custom provided or from the selection
    const moveList = customSelectionList || SelectUtil.GetMoveList(-1, true, true, false, {}, false);

    // Check if grouping is allowed
    if (!useAllShapes) {
      if (!DrawUtil.AllowGroup(moveList)) {
        const msg = "Some of the objects you have selected to be grouped are locked, or hooked to other objects that must also be selected to become part of the same group.";
        return Utils1.Alert(msg, null, () => { });
      }
      if (T3Gv.opt.IsLinkedOutside(moveList)) {
        const msg = "Some of the objects you have selected to be part of a group are linked to other objects that are not part of the group. \nEither deselect these objects or select the objects that they are linked to.";
        return Utils1.Alert(msg, null, () => { });
      }
      if (T3Gv.opt.IsGroupNonDelete()) {
        const msg = "You cannot group permanent objects like project charts and similar diagrams";
        return Utils1.Alert(msg, null, () => { });
      }
    }

    // Handle dimensions of objects
    const preserveDimensions = function (objects) {
      const savedDimensions = [];
      for (let i = 0, len = objects.length; i < len; i++) {
        const obj = DataUtil.GetObjectPtr(objects[i], true);
        if ((obj.Dimensions & NvConstant.DimensionFlags.Always) ||
          (obj.Dimensions & NvConstant.DimensionFlags.Select)) {
          savedDimensions.push({
            index: i,
            dimensions: obj.Dimensions
          });
          obj.Dimensions = 0;
          obj.UpdateFrame();
        }
      }
      return savedDimensions;
    };

    const restoreDimensions = function (objects, savedDimensions) {
      for (let i = 0, len = savedDimensions.length; i < len; i++) {
        const obj = DataUtil.GetObjectPtr(objects[savedDimensions[i].index], true);
        obj.Dimensions = savedDimensions[i].dimensions;
        obj.UpdateFrame();
      }
    };

    // Save dimensions, get bounding rectangle, then restore dimensions
    const savedDimensions = preserveDimensions(moveList);
    const boundingRect = T3Gv.opt.GetListSRect(moveList);
    restoreDimensions(moveList, savedDimensions);

    // Collect shapes to group
    const shapesToGroup = [];
    for (index = 0; index < visibleShapeCount; index++) {
      if (moveList.indexOf(visibleShapes[index]) !== -1) {
        shapesToGroup.push(visibleShapes[index]);
      }
    }

    // Get links and prepare to adjust shape positions
    const linksBlock = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, true);
    let shape = null;

    // Adjust positions of all shapes relative to the group's bounding rectangle
    const shapeCount = shapesToGroup.length;
    for (index = 0; index < shapeCount; index++) {
      shape = DataUtil.GetObjectPtr(shapesToGroup[index], true);

      // Track comments
      if (shape.CommentID >= 0) {
        commentIDs.push(shape.CommentID);
      }

      // Adjust frame position
      const frame = shape.Frame;
      frame.x -= boundingRect.x;
      frame.y -= boundingRect.y;

      // Check if any shape has no-rotate flag
      if (shape.NoRotate()) {
        hasNoRotateObject = true;
      }

      shape.bInGroup = true;

      // Adjust points for lines and connectors
      if (shape instanceof Instance.Shape.BaseLine ||
        shape instanceof Instance.Shape.Connector ||
        (shape.StartPoint !== undefined && shape.EndPoint !== undefined)) {
        shape.StartPoint.x -= boundingRect.x;
        shape.StartPoint.y -= boundingRect.y;
        shape.EndPoint.x -= boundingRect.x;
        shape.EndPoint.y -= boundingRect.y;
      }

      // Handle native group symbols
      if (shape.NativeID >= 0 && shape.ShapeType === OptConstant.ShapeType.GroupSymbol) {
        const block = T3Gv.stdObj.PreserveBlock(shape.NativeID);
        if (block) {
          block.Delete();
        }
        shape.NativeID = -1;
      }

      // Update shape with new frame
      shape.UpdateFrame(frame);
    }

    // Create the group object properties
    const groupProperties = {
      Frame: {
        x: boundingRect.x,
        y: boundingRect.y,
        width: boundingRect.width,
        height: boundingRect.height
      },
      TextGrow: NvConstant.TextGrowBehavior.ProPortional,
      ShapesInGroup: shapesToGroup,
      InitialGroupBounds: {
        x: boundingRect.x,
        y: boundingRect.y,
        width: boundingRect.width,
        height: boundingRect.height
      }
    };

    // Create the group symbol
    const groupSymbol = new Instance.Shape.GroupSymbol(groupProperties);

    // Set no-rotate flag if any shape had it
    if (hasNoRotateObject) {
      groupSymbol.extraflags = Utils2.SetFlag(
        groupSymbol.extraflags,
        OptConstant.ExtraFlags.NoRotate,
        true
      );
    }

    // Add the new group to the drawing
    LayerUtil.ZListPreserve();
    const newGroupID = DrawUtil.AddNewObject(groupSymbol, true, false);

    // Adjust style properties of the group
    if (groupSymbol.StyleRecord) {
      if (groupSymbol.StyleRecord.Line) {
        groupSymbol.StyleRecord.Line.Thickness = 0;
      }
      if (groupSymbol.StyleRecord.OutsideEffect) {
        groupSymbol.StyleRecord.OutsideEffect.OutsideType = 0;
        groupSymbol.StyleRecord.OutsideEffect.OutsideExtent_Bottom = 0;
        groupSymbol.StyleRecord.OutsideEffect.OutsideExtent_Left = 0;
        groupSymbol.StyleRecord.OutsideEffect.OutsideExtent_Right = 0;
        groupSymbol.StyleRecord.OutsideEffect.OutsideExtent_Top = 0;
      }
      groupSymbol.UpdateFrame();
    }

    // Remove individual shapes from lists
    for (index = 0; index < shapeCount; index++) {
      LayerUtil.RemoveFromAllZLists(shapesToGroup[index]);
      HookUtil.DeleteLink(linksBlock, shapesToGroup[index], -1, null, 0, true);
    }

    // Handle comments
    if (commentIDs.length) {
      T3Gv.opt.Comment_Group(commentIDs);
    }

    // Update visible shapes list
    visibleShapes = LayerUtil.ActiveVisibleZList();
    visibleShapeCount = visibleShapes.length;

    // Convert group to native format
    groupSymbol.ConvertToNative(T3Gv.opt.richGradients, useAllShapes);

    // Complete the operation
    DrawUtil.CompleteOperation([visibleShapes[visibleShapeCount - 1]], action);

    // Render if not skipped
    if (!skipRender && !useAllShapes) {
      SvgUtil.RenderAllSVGObjects();
    }

    T3Gv.opt.moveList = null;
    return newGroupID;
  }

  /**
   * Ungroups a previously grouped shape into its component shapes. This function:
   * 1. Extracts all shapes from the group
   * 2. Repositions and scales them based on the group's current dimensions
   * 3. Handles flipping, rotation, and text scaling
   * 4. Maintains links between shapes
   * 5. Manages comments and Visio text associations
   * 6. Removes the original group container
   *
   * @param groupShapeId - The ID of the group shape to ungroup
   * @param maintainLinkFlag - Controls whether and how links between shapes are maintained during ungrouping
   */
  UngroupShape(groupShapeId, maintainLinkFlag) {
    let i, tableData, offsetX, tableIndex;
    let commentIds = [];
    let originalShape = null;
    let targetShape = null;
    let originalShapeList = [];
    let flipVertFlag = OptConstant.ExtraFlags.FlipVert;
    let flipHorizFlag = OptConstant.ExtraFlags.FlipHoriz;

    let groupShape = DataUtil.GetObjectPtr(groupShapeId, true);
    let shapeContainerIds = [];
    let groupFrame = groupShape.Frame;
    let centerPoint = {
      x: groupFrame.x + groupFrame.width / 2,
      y: groupFrame.y + groupFrame.height / 2
    };

    let shapesInGroup = groupShape.ShapesInGroup;
    let shapeCount = shapesInGroup.length;

    if (shapeCount === 0) {
      return;
    }

    let currentShape = null;
    let linksBlock = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, true);

    LayerUtil.ZListPreserve();
    let groupX = groupFrame.x;
    let groupY = groupFrame.y;

    let scaleFactorX = groupFrame.width / groupShape.InitialGroupBounds.width;
    if (isNaN(scaleFactorX)) {
      scaleFactorX = 1;
    }

    let scaleFactorY = groupFrame.height / groupShape.InitialGroupBounds.height;
    if (isNaN(scaleFactorY)) {
      scaleFactorY = 1;
    }

    for (i = 0; i < shapeCount; ++i) {
      currentShape = DataUtil.GetObjectPtr(shapesInGroup[i], true);

      if (currentShape.CommentID >= 0) {
        commentIds.push(currentShape.CommentID);
      }

      if (currentShape instanceof Instance.Shape.ShapeContainer) {
        shapeContainerIds.push(currentShape.BlockID);
      }

      originalShape = new Instance.Shape.BaseDrawObject(null);
      originalShape = Utils1.DeepCopy(currentShape);

      originalShape.Frame.x += groupX;
      originalShape.Frame.y += groupY;

      if (originalShape.StartPoint) {
        originalShape.StartPoint.x += groupX;
        originalShape.StartPoint.y += groupY;
      }

      if (originalShape.EndPoint) {
        originalShape.EndPoint.x += groupX;
        originalShape.EndPoint.y += groupY;
      }

      originalShapeList.push(originalShape);

      if (currentShape instanceof Instance.Shape.GroupSymbol &&
        currentShape.NativeID < 0) {
        currentShape.ConvertToNative(T3Gv.opt.richGradients, false);
      }

      currentShape.ScaleObject(
        groupX,
        groupY,
        centerPoint,
        groupShape.RotationAngle,
        scaleFactorX,
        scaleFactorY,
        true
      );

      offsetX = 0;

      if (groupShape.extraflags & flipVertFlag) {
        currentShape.Flip(flipVertFlag);
      }

      if (groupShape.extraflags & flipHorizFlag) {
        offsetX = groupShape.Frame.width -
          (currentShape.Frame.x + currentShape.Frame.width - groupShape.Frame.x) -
          currentShape.Frame.x +
          groupShape.Frame.x;
        currentShape.Flip(flipHorizFlag);
      }

      if (offsetX) {
        currentShape.OffsetShape(offsetX, 0);
      }

      if (currentShape.DataID !== -1 && scaleFactorY !== 1) {
        let textStyles = DataUtil.GetObjectPtr(currentShape.DataID, true).runtimeText.styles;
        let styleCount = textStyles.length;

        for (tableIndex = 0; tableIndex < styleCount; ++tableIndex) {
          textStyles[tableIndex].size *= scaleFactorY;
        }
      }

      currentShape.bInGroup = false;

      DataUtil.AddToDirtyList(shapesInGroup[i]);
      T3Gv.opt.RebuildLinks(linksBlock, shapesInGroup[i]);
    }

    LayerUtil.InsertObjectsIntoLayerAt(groupShapeId, shapesInGroup);

    for (i = 0; i < originalShapeList.length; i++) {
      T3Gv.opt.ob = originalShapeList[i];
      targetShape = DataUtil.GetObjectPtr(originalShapeList[i].BlockID, false);

      let linkMaintainMode = maintainLinkFlag ? 2 : false;

      HookUtil.MaintainLink(
        originalShapeList[i].BlockID,
        targetShape,
        T3Gv.opt.ob,
        OptConstant.ActionTriggerType.Flip,
        linkMaintainMode
      );
    }

    T3Gv.opt.ob = {};

    let containerCount = shapeContainerIds.length;
    for (i = 0; i < containerCount; i++) {
      OptCMUtil.SetLinkFlag(
        shapeContainerIds[i],
        DSConstant.LinkFlags.Move
      );
    }

    T3Gv.opt.UpdateLinks();

    groupShape.ShapesInGroup = [];
    DataUtil.DeleteObjects([groupShapeId], false);
    SvgUtil.RenderDirtySVGObjects();
  }

  /**
   * Ungroups selected shapes in the drawing by converting group symbols back to their component shapes
   * This function:
   * 1. Checks if there are any selected shapes that are groupable
   * 2. Handles collaboration features if enabled
   * 3. Processes each selected shape, ungrouping any GroupSymbols or native groups
   * 4. Renders the updated objects and selects all the ungrouped shapes
   *
   * @returns {boolean|undefined} False if there are no shapes to ungroup, undefined otherwise
   */
  UngroupSelectedShapes() {
    let index, nativeGroupResult;

    // Check if there are any visible shapes
    if (LayerUtil.ActiveVisibleZList().length === 0) {
      return false;
    }

    // Get selected objects
    const selectedShapes = T3Gv.stdObj.GetObject(T3Gv.opt.theSelectedListBlockID).Data;
    const selectedCount = selectedShapes.length;

    // Check if there are selected objects
    if (selectedCount === 0) {
      return false;
    }

    // Check if any selected shapes are groups
    let hasGroupShape = false;
    let currentShape = null;

    for (index = 0; index < selectedCount; ++index) {
      currentShape = DataUtil.GetObjectPtr(selectedShapes[index], false);

      if (currentShape instanceof Instance.Shape.GroupSymbol) {
        hasGroupShape = true;
        break;
      }

      if (currentShape.NativeID >= 0) {
        hasGroupShape = true;
        break;
      }
    }

    if (hasGroupShape) {

      // Create a copy of the selected shapes
      const shapesCopy = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, true).slice(0);
      let resultShapes = [];

      // Process each selected shape
      for (index = 0; index < selectedCount; ++index) {
        currentShape = DataUtil.GetObjectPtr(shapesCopy[index], false);
        const shapeId = shapesCopy[index];

        if (currentShape instanceof Instance.Shape.GroupSymbol) {
          hasGroupShape = true;
          resultShapes = resultShapes.concat(currentShape.ShapesInGroup);
          this.UngroupShape(shapeId);
        } else if (currentShape.NativeID >= 0) {
          nativeGroupResult = T3Gv.opt.UngroupNative(shapeId, false, true);

          if (nativeGroupResult) {
            DataUtil.DeleteObjects([shapeId], false);
            resultShapes = resultShapes.concat(nativeGroupResult);
            hasGroupShape = true;
          }
        } else {
          resultShapes.push(shapeId);
        }
      }

      if (hasGroupShape) {
        // Render and select the ungrouped shapes
        SvgUtil.RenderAllSVGObjects();
        SelectUtil.SelectObjects(resultShapes);
        DrawUtil.CompleteOperation(resultShapes);
      }
    }
  }

}

export default ToolAct2Util
