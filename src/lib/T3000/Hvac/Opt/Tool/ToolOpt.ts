

import GlobalData from '../../Data/GlobalData'
import ConstantData from '../../Data/ConstantData'
import ToolUtil from '../../Util/ToolUtil';

class ToolOpt {

  public tul: ToolUtil

  constructor() {
    this.tul = new ToolUtil();
  }

  /**
   * Handles selection operations based on the event and selection mode
   * @param event - The DOM event that triggered the selection
   * @returns void
   */
  SelectAct(event) {
    console.log('O.ToolOpt.SelectAct - Input:', { event });

    const selectionToolSticky = false;

    this.tul.CancelModalOperation();

    if (selectionToolSticky) {
      GlobalData.optManager.ResetObjectDraw();
    }

    let selectionModeAttr = "";// event.currentTarget.attributes.getNamedItem(ConstantData.Constants.Attr_SelectionMode);
    let isMultipleSelection = false;

    if (selectionModeAttr) {
      switch (selectionModeAttr) {
        case 'multiple':
          isMultipleSelection = true;
          break;
        case 'all':
          GlobalData.optManager.SelectAllObjects();
          console.log('O.ToolOpt.SelectAct - Output: Selected all objects');
          return;
        case 'lines':
          GlobalData.optManager.SelectAllObjects([
            ConstantData.DrawingObjectBaseClass.LINE,
            ConstantData.DrawingObjectBaseClass.CONNECTOR
          ]);
          console.log('O.ToolOpt.SelectAct - Output: Selected all line objects');
          break;
        case 'shapes':
          GlobalData.optManager.SelectAllObjects([ConstantData.DrawingObjectBaseClass.SHAPE]);
          console.log('O.ToolOpt.SelectAct - Output: Selected all shape objects');
          break;
      }
    }

    if (isMultipleSelection) {
      // ConstantData.DocumentContext.SelectionToolMultiple = true;
    }

    console.log('O.ToolOpt.SelectAct - Output:', { isMultipleSelection, selectionMode: selectionModeAttr });
  }

  /**
    * Sets default wall thickness and initiates wall drawing
    * @param event - The DOM event that triggered the action
    * @returns void
    */
  DrawWall(event) {
    console.log('O.ToolOpt.DrawWall - Input:', { event });

    const defaultWallThickness = 0.5;
    this.tul.SetDefaultWallThickness(defaultWallThickness, null);
    this.tul.DrawNewWallShape(null, null);

    console.log('O.ToolOpt.DrawWall - Output: Initialized wall drawing with thickness', defaultWallThickness);
  }

  /**
   * Creates a new shape from the selected tool
   * @param event - The DOM event that triggered the action
   * @param shapeType - The type of shape to create
   * @returns void
   */
  StampShapeFromToolAct(event, shapeType) {
    console.log('O.ToolOpt.StampShapeFromToolAct - Input:', { event, shapeType });

    this.tul.StampOrDragDropNewShape(event, shapeType);

    console.log('O.ToolOpt.StampShapeFromToolAct - Output: Created shape of type', shapeType);
  }

  /**
   * Draws a new line shape
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ToolLineAct(event) {
    console.log('O.ToolOpt.ToolLineAct - Input:', { event });

    // Parameters: lineType=2, isPolygon=false, isClosed=false
    this.tul.DrawNewLineShape(2, false, false);

    console.log('O.ToolOpt.ToolLineAct - Output: Drew new line shape');
  }

  /**
   * Rotates selected shapes by the specified angle
   * @param event - The DOM event that triggered the action
   * @param angle - The rotation angle in degrees
   * @returns null if angle is null, void otherwise
   */
  RotateAct(event, angle) {
    console.log('O.ToolOpt.RotateAct - Input:', { event, angle });

    if (angle === null) {
      console.log('O.ToolOpt.RotateAct - Output: No action, angle was null');
      return null;
    }

    this.tul.RotateShapes(360 - angle);

    console.log('O.ToolOpt.RotateAct - Output: Rotated shapes by angle', 360 - angle);
  }

  /**
   * Aligns selected shapes according to the specified alignment type
   * @param alignmentType - The type of alignment to apply
   * @returns null if alignmentType is null, void otherwise
   */
  ShapeAlignAct(alignmentType) {
    console.log('O.ToolOpt.ShapeAlignAct - Input:', { alignmentType });

    if (alignmentType === null) {
      console.log('O.ToolOpt.ShapeAlignAct - Output: No action, alignmentType was null');
      return null;
    }

    this.tul.AlignShapes(alignmentType);

    console.log('O.ToolOpt.ShapeAlignAct - Output: Aligned shapes with type', alignmentType);
  }

  /**
   * Groups currently selected shapes
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  GroupAct(event) {
    console.log('O.ToolOpt.GroupAct - Input:', { event });

    this.tul.GroupSelectedShapes();

    console.log('O.ToolOpt.GroupAct - Output: Grouped selected shapes');
  }

  /**
   * Ungroups currently selected shapes
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  UngroupAct(event) {
    console.log('O.ToolOpt.UngroupAct - Input:', { event });

    this.tul.UngroupSelectedShapes();

    console.log('O.ToolOpt.UngroupAct - Output: Ungrouped selected shapes');
  }

  /**
   * Flips selected shapes horizontally
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ShapeFlipHorizontalAct(event) {
    console.log('O.ToolOpt.ShapeFlipHorizontalAct - Input:', { event });

    this.tul.FlipHorizontal();

    console.log('O.ToolOpt.ShapeFlipHorizontalAct - Output: Flipped shapes horizontally');
  }

  /**
   * Flips selected shapes vertically
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ShapeFlipVerticalAct(event) {
    console.log('O.ToolOpt.ShapeFlipVerticalAct - Input:', { event });

    this.tul.FlipVertical();

    console.log('O.ToolOpt.ShapeFlipVerticalAct - Output: Flipped shapes vertically');
  }

  /**
   * Makes selected shapes the same size according to the specified option
   * @param event - The DOM event that triggered the action
   * @param sizeOption - The size option to apply
   * @returns void
   */
  MakeSameSizeAct(event, sizeOption) {
    console.log('O.ToolOpt.MakeSameSizeAct - Input:', { event, sizeOption });

    this.tul.MakeSameSize(sizeOption);

    console.log('O.ToolOpt.MakeSameSizeAct - Output: Made shapes same size with option', sizeOption);
  }

  /**
   * Brings selected shapes to the front
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ShapeBringToFrontAct(event) {
    console.log('O.ToolOpt.ShapeBringToFrontAct - Input:', { event });

    this.tul.BringToFrontOf();

    console.log('O.ToolOpt.ShapeBringToFrontAct - Output: Brought shapes to front');
  }

  /**
   * Sends selected shapes to the back
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ShapeSendToBackAct(event) {
    console.log('O.ToolOpt.ShapeSendToBackAct - Input:', { event });

    this.tul.SendToBackOf();

    console.log('O.ToolOpt.ShapeSendToBackAct - Output: Sent shapes to back');
  }

  /**
   * Pastes copied objects
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  PasteAct(event) {
    console.log('O.ToolOpt.PasteAct - Input:', { event });

    // Parameter: isRightClick=false
    this.tul.Paste(false);

    console.log('O.ToolOpt.PasteAct - Output: Pasted objects');
  }

  /**
   * Pastes copied objects on right click
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  PasteActRightClickAct(event) {
    console.log('O.ToolOpt.PasteActRightClickAct - Input:', { event });

    // Parameter: isRightClick=true
    this.tul.Paste(true);

    console.log('O.ToolOpt.PasteActRightClickAct - Output: Pasted objects with right click context');
  }

  /**
   * Copies selected objects
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  CopyAct(event) {
    console.log('O.ToolOpt.CopyAct - Input:', { event });

    this.tul.Copy();

    console.log('O.ToolOpt.CopyAct - Output: Copied selected objects');
  }

  /**
   * Cuts selected objects
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  CutAct(event) {
    console.log('O.ToolOpt.CutAct - Input:', { event });

    this.tul.Cut();

    console.log('O.ToolOpt.CutAct - Output: Cut selected objects');
  }

  /**
   * Deletes selected objects
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  DeleteAct(event) {
    console.log('O.ToolOpt.DeleteAct - Input:', { event });

    this.tul.DeleteSelectedObjects();

    console.log('O.ToolOpt.DeleteAct - Output: Deleted selected objects');
  }

  /**
   * Undoes the last operation
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  UndoAct(event) {
    console.log('O.ToolOpt.UndoAct - Input:', { event });

    this.tul.Undo();

    console.log('O.ToolOpt.UndoAct - Output: Undid last operation');
  }

  /**
   * Redoes the last undone operation
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  RedoAct(event) {
    console.log('O.ToolOpt.RedoAct - Input:', { event });

    this.tul.Redo();

    console.log('O.ToolOpt.RedoAct - Output: Redid last undone operation');
  }

  /**
   * Commits the file picker selection and saves the file
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  CommitFilePickerSelectionAct(event) {
    console.log('O.ToolOpt.CommitFilePickerSelectionAct - Input:', { event });

    this.tul.SaveAs();

    console.log('O.ToolOpt.CommitFilePickerSelectionAct - Output: Saved file');
  }

  /**
   * Duplicates selected objects
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  DuplicateAct(event) {
    console.log('O.ToolOpt.DuplicateAct - Input:', { event });

    this.tul.Duplicate();

    console.log('O.ToolOpt.DuplicateAct - Output: Duplicated selected objects');
  }

  /**
   * Adds a measurement line to the canvas
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  MeasureDistanceAct(event) {
    console.log('O.ToolOpt.MeasureDistanceAct - Input:', { event });

    GlobalData.gBusinessManager.AddMeasureLine(event);

    console.log('O.ToolOpt.MeasureDistanceAct - Output: Added measurement line');
  }

  /**
   * Adds a measurement area to the canvas
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  MeasureAreaAct(event) {
    console.log('O.ToolOpt.MeasureAreaAct - Input:', { event });

    GlobalData.gBusinessManager.AddMeasureArea(event);

    console.log('O.ToolOpt.MeasureAreaAct - Output: Added measurement area');
  }

  /**
   * Pre-loads a symbol for use
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ClickSymbolAct(event) {
    console.log('O.ToolOpt.ClickSymbolAct - Input:', { event });

    const symbolId = "d6e019b9-110d-4990-8897-eade69451d92";
    this.tul.StampOrDragDropNewSymbol(symbolId, false);

    console.log('O.ToolOpt.ClickSymbolAct - Output: Pre-loaded symbol', symbolId);
  }

  /**
   * Handles drag and drop of symbols
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  DragDropSymbolAct(event) {
    console.log('O.ToolOpt.DragDropSymbolAct - Input:', { event });

    this.tul.DragDropSymbol(event, true);

    console.log('O.ToolOpt.DragDropSymbolAct - Output: Handled symbol drag and drop');
  }
}

export default ToolOpt
