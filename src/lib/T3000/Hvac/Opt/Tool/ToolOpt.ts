

import T3Gv from "../../Data/T3Gv"
import NvConstant from "../../Data/Constant/NvConstant"
import ToolUtil from './ToolUtil'
import T3Util from "../../Util/T3Util";
import OptConstant from "../../Data/Constant/OptConstant";
import SelectUtil from "../Opt/SelectUtil";
import DataUtil from "../Data/DataUtil";
import StyleConstant from "../../Data/Constant/StyleConstant";
import DrawUtil from "../Opt/DrawUtil";
import UIUtil from "../UI/UIUtil";

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
    T3Util.Log('O.ToolOpt.SelectAct - Input:', { event });

    // const selectionToolSticky = false;

    this.tul.CancelOperation();

    // if (selectionToolSticky) {
    //   T3Gv.opt.ResetObjectDraw();
    // }

    // let selectionModeAttr = "";// event.currentTarget.attributes.getNamedItem(NvConstant.Constants.Attr_SelectionMode);
    // let isMultipleSelection = false;

    // if (selectionModeAttr) {
    //   switch (selectionModeAttr) {
    //     case 'multiple':
    //       isMultipleSelection = true;
    //       break;
    //     case 'all':
    //       T3Gv.opt.SelectAllObjects();
    //       T3Util.Log('O.ToolOpt.SelectAct - Output: Selected all objects');
    //       return;
    //     case 'lines':
    //       T3Gv.opt.SelectAllObjects([
    //         OptConstant.DrawObjectBaseClass.Line,
    //         OptConstant.DrawObjectBaseClass.Connector
    //       ]);
    //       T3Util.Log('O.ToolOpt.SelectAct - Output: Selected all line objects');
    //       break;
    //     case 'shapes':
    //       T3Gv.opt.SelectAllObjects([OptConstant.DrawObjectBaseClass.Shape]);
    //       T3Util.Log('O.ToolOpt.SelectAct - Output: Selected all shape objects');
    //       break;
    //   }
    // }

    // if (isMultipleSelection) {
    //   // NvConstant.DocumentContext.SelectionToolMultiple = true;
    // }

    // T3Util.Log('O.ToolOpt.SelectAct - Output:', { isMultipleSelection, selectionMode: selectionModeAttr });
  }

  /**
    * Sets default wall thickness and initiates wall drawing
    * @param event - The DOM event that triggered the action
    * @returns void
    */
  DrawWall(event) {
    T3Util.Log('O.ToolOpt.DrawWall - Input:', { event });

    const defaultWallThickness = 0.5;
    this.tul.SetDefaultWallThickness(defaultWallThickness, null);
    this.tul.DrawNewWallShape(null, null);

    T3Util.Log('O.ToolOpt.DrawWall - Output: Initialized wall drawing with thickness', defaultWallThickness);
  }

  /**
   * Creates a new shape from the selected tool
   * @param event - The DOM event that triggered the action
   * @param shapeType - The type of shape to create
   * @returns void
   */
  StampShapeFromToolAct(event, shapeType) {
    T3Util.Log('O.ToolOpt.StampShapeFromToolAct - Input:', { event, shapeType });

    this.tul.StampOrDragDropNewShape(event, shapeType);

    T3Util.Log('O.ToolOpt.StampShapeFromToolAct - Output: Created shape of type', shapeType);
  }

  /**
   * Draws a new line shape
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ToolLineAct(event) {
    T3Util.Log('O.ToolOpt.ToolLineAct - Input:', { event });

    // Parameters: lineType=2, isPolygon=false, isClosed=false
    this.tul.DrawNewLineShape(2, false, false);

    T3Util.Log('O.ToolOpt.ToolLineAct - Output: Drew new line shape');
  }

  /**
   * Rotates selected shapes by the specified angle
   * @param event - The DOM event that triggered the action
   * @param angle - The rotation angle in degrees
   * @returns null if angle is null, void otherwise
   */
  RotateAct(event, angle) {
    T3Util.Log('O.ToolOpt.RotateAct - Input:', { event, angle });

    if (angle === null) {
      T3Util.Log('O.ToolOpt.RotateAct - Output: No action, angle was null');
      return null;
    }

    this.tul.RotateShapes(360 - angle);

    T3Util.Log('O.ToolOpt.RotateAct - Output: Rotated shapes by angle', 360 - angle);
  }

  /**
   * Aligns selected shapes according to the specified alignment type
   * @param alignmentType - The type of alignment to apply
   * @returns null if alignmentType is null, void otherwise
   */
  ShapeAlignAct(alignmentType) {
    T3Util.Log('O.ToolOpt.ShapeAlignAct - Input:', { alignmentType });

    if (alignmentType === null) {
      T3Util.Log('O.ToolOpt.ShapeAlignAct - Output: No action, alignmentType was null');
      return null;
    }

    this.tul.AlignShapes(alignmentType);

    T3Util.Log('O.ToolOpt.ShapeAlignAct - Output: Aligned shapes with type', alignmentType);
  }

  /**
   * Groups currently selected shapes
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  GroupAct(event) {
    T3Util.Log('O.ToolOpt.GroupAct - Input:', { event });

    this.tul.GroupSelected();

    T3Util.Log('O.ToolOpt.GroupAct - Output: Grouped selected shapes');
  }

  /**
   * Ungroups currently selected shapes
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  UnGroupAct(event) {
    T3Util.Log('O.ToolOpt.UngroupAct - Input:', { event });

    this.tul.UnGroupSelected();

    T3Util.Log('O.ToolOpt.UngroupAct - Output: Ungrouped selected shapes');
  }

  /**
   * Flips selected shapes horizontally
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ShapeFlipHorizontalAct(event) {
    T3Util.Log('O.ToolOpt.ShapeFlipHorizontalAct - Input:', { event });

    this.tul.FlipHorizontal();

    T3Util.Log('O.ToolOpt.ShapeFlipHorizontalAct - Output: Flipped shapes horizontally');
  }

  /**
   * Flips selected shapes vertically
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ShapeFlipVerticalAct(event) {
    T3Util.Log('O.ToolOpt.ShapeFlipVerticalAct - Input:', { event });

    this.tul.FlipVertical();

    T3Util.Log('O.ToolOpt.ShapeFlipVerticalAct - Output: Flipped shapes vertically');
  }

  /**
   * Makes selected shapes the same size according to the specified option
   * @param event - The DOM event that triggered the action
   * @param sizeOption - The size option to apply
   * @returns void
   */
  MakeSameSizeAct(event, sizeOption) {
    T3Util.Log('O.ToolOpt.MakeSameSizeAct - Input:', { event, sizeOption });

    this.tul.MakeSameSize(sizeOption);

    T3Util.Log('O.ToolOpt.MakeSameSizeAct - Output: Made shapes same size with option', sizeOption);
  }

  /**
   * Brings selected shapes to the front
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ShapeBringToFrontAct(event) {
    T3Util.Log('O.ToolOpt.ShapeBringToFrontAct - Input:', { event });

    this.tul.BringToFrontOf();

    T3Util.Log('O.ToolOpt.ShapeBringToFrontAct - Output: Brought shapes to front');
  }

  /**
   * Sends selected shapes to the back
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ShapeSendToBackAct(event) {
    T3Util.Log('O.ToolOpt.ShapeSendToBackAct - Input:', { event });

    this.tul.SendToBackOf();

    T3Util.Log('O.ToolOpt.ShapeSendToBackAct - Output: Sent shapes to back');
  }

  /**
   * Pastes copied objects
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  PasteAct(event) {
    T3Util.Log('O.ToolOpt.PasteAct - Input:', { event });

    // Parameter: isRightClick=false
    this.tul.Paste(false);

    T3Util.Log('O.ToolOpt.PasteAct - Output: Pasted objects');
  }

  /**
   * Pastes copied objects on right click
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  PasteActRightClickAct(event) {
    T3Util.Log('O.ToolOpt.PasteActRightClickAct - Input:', { event });

    // Parameter: isRightClick=true
    this.tul.Paste(true);

    T3Util.Log('O.ToolOpt.PasteActRightClickAct - Output: Pasted objects with right click context');
  }

  /**
   * Copies selected objects
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  CopyAct(event) {
    T3Util.Log('O.ToolOpt.CopyAct - Input:', { event });

    this.tul.Copy();

    T3Util.Log('O.ToolOpt.CopyAct - Output: Copied selected objects');
  }

  /**
   * Cuts selected objects
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  CutAct(event) {
    T3Util.Log('O.ToolOpt.CutAct - Input:', { event });

    this.tul.Cut();

    T3Util.Log('O.ToolOpt.CutAct - Output: Cut selected objects');
  }

  /**
   * Deletes selected objects
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  DeleteAct(event) {
    T3Util.Log('O.ToolOpt.DeleteAct - Input:', { event });

    this.tul.DeleteSelectedObjects();

    T3Util.Log('O.ToolOpt.DeleteAct - Output: Deleted selected objects');
  }

  /**
   * Undoes the last operation
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  UndoAct(event) {
    T3Util.Log('O.ToolOpt.UndoAct - Input:', { event });

    this.tul.Undo();

    T3Util.Log('O.ToolOpt.UndoAct - Output: Undid last operation');
  }

  /**
   * Redoes the last undone operation
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  RedoAct(event) {
    T3Util.Log('O.ToolOpt.RedoAct - Input:', { event });

    this.tul.Redo();

    T3Util.Log('O.ToolOpt.RedoAct - Output: Redid last undone operation');
  }

  /**
   * Commits the file picker selection and saves the file
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  CommitFilePickerSelectionAct(event) {
    T3Util.Log('O.ToolOpt.CommitFilePickerSelectionAct - Input:', { event });

    this.tul.SaveAs();

    T3Util.Log('O.ToolOpt.CommitFilePickerSelectionAct - Output: Saved file');
  }

  /**
   * Duplicates selected objects
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  DuplicateAct(event) {
    T3Util.Log('O.ToolOpt.DuplicateAct - Input:', { event });

    this.tul.Duplicate();

    T3Util.Log('O.ToolOpt.DuplicateAct - Output: Duplicated selected objects');
  }

  /**
   * Adds a measurement line to the canvas
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  MeasureDistanceAct(event) {
    T3Util.Log('O.ToolOpt.MeasureDistanceAct - Input:', { event });

    T3Gv.wallOpt.AddMeasureLine(event);

    T3Util.Log('O.ToolOpt.MeasureDistanceAct - Output: Added measurement line');
  }

  /**
   * Adds a measurement area to the canvas
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  MeasureAreaAct(event) {
    T3Util.Log('O.ToolOpt.MeasureAreaAct - Input:', { event });

    T3Gv.wallOpt.AddMeasureArea(event);

    T3Util.Log('O.ToolOpt.MeasureAreaAct - Output: Added measurement area');
  }

  /**
   * Pre-loads a symbol for use
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ClickSymbolAct(event) {
    T3Util.Log('O.ToolOpt.ClickSymbolAct - Input:', { event });

    const symbolId = "d6e019b9-110d-4990-8897-eade69451d92";
    this.tul.StampOrDragDropNewSymbol(symbolId, false);

    T3Util.Log('O.ToolOpt.ClickSymbolAct - Output: Pre-loaded symbol', symbolId);
  }

  /**
   * Handles drag and drop of symbols
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  DragDropSymbolAct(event) {
    T3Util.Log('O.ToolOpt.DragDropSymbolAct - Input:', { event });

    this.tul.DragDropSymbol(event, true);

    T3Util.Log('O.ToolOpt.DragDropSymbolAct - Output: Handled symbol drag and drop');
  }

  /**
   * Sets or imports a background image for the canvas
   * @param event - The event or image data for the background
   * @param isLayerImage - Flag determining whether to import as a layer image (true) or set as background (false)
   * @returns void
   */
  LibSetBackgroundImageAct(event, isLayerImage) {
    T3Util.Log('O.ToolOpt.LibSetBackgroundImageAct - Input:', { event, isLayerImage });

    try {
      // Close any ongoing edits first
      T3Gv.opt.CloseEdit(true, true);

      // const imgUrl = "https://tse2-mm.cn.bing.net/th/id/OIP-C.MBfLtlEN6uCfRHikngEd3QHaO3?rs=1&pid=ImgDetMain";
      const imgUrl = "C:\\Users\\Double\\Desktop\\RE5cNdq.jpg";

      // Create a file input element to select an image
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';

      fileInput.onchange = (e) => {
        const file = fileInput.files?.[0];
        if (!file) {
          T3Util.Log('O.ToolOpt.LibSetBackgroundImageAct - Error: No file selected');
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const fileDataUrl = reader.result as string;

          if (isLayerImage) {
            T3Gv.opt.ImportBackgroundLayerImage(file);
          } else {
            T3Gv.opt.SetBackgroundImage(file);
          }

          T3Util.Log('O.ToolOpt.LibSetBackgroundImageAct - Output: Set background image', { asLayer: isLayerImage });
        };

        reader.onerror = () => {
          T3Util.Log('O.ToolOpt.LibSetBackgroundImageAct - Error: Failed to read file');
        };

        reader.readAsDataURL(file);
      };

      // Open file dialog
      fileInput.click();

      // Use the hardcoded URL as a fallback
      let fileDataUrl = imgUrl;


      // if (isLayerImage) {
      //   T3Gv.opt.ImportBackgroundLayerImage(fileDataUrl);
      // } else {
      //   T3Gv.opt.SetBackgroundImage(fileDataUrl);
      // }

      T3Util.Log('O.ToolOpt.LibSetBackgroundImageAct - Output: Set background image', { asLayer: isLayerImage });
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      T3Util.Log('O.ToolOpt.LibSetBackgroundImageAct - Error:', error);
    }
  }

  /**
   * Locks the selected object or right-clicked object
   * @param isRightClick - Flag indicating if the action was triggered by a right-click
   * @returns void
   */
  LibLockAct(isRightClick) {
    T3Util.Log('O.ToolOpt.LibLockAct - Input:', { isRightClick });

    try {
      // Determine the target to lock based on whether this is a right-click action
      const targetId = isRightClick
        ? T3Gv.opt.rClickParam?.targetId
        : SelectUtil.GetTargetSelect();

      // Close any open edits first
      T3Gv.opt.CloseEdit(true);

      // Lock the target object
      T3Gv.opt.Lock(targetId, true);

      T3Util.Log('O.ToolOpt.LibLockAct - Output: Locked object with ID', targetId);
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      T3Util.Log('O.ToolOpt.LibLockAct - Error:', error);
    }
  }

  /**
   * Sets the background color for the canvas
   * @param color - The color to set as the background
   * @returns void
   */
  LibSetBackgroundColorAct(color) {
    T3Util.Log('O.ToolOpt.LibSetBackgroundColorAct - Input:', { color });

    try {
      // Close any ongoing edits first
      T3Gv.opt.CloseEdit(true, true);

      // // Begin collaborative editing if enabled
      // if (SDJS.Collab.AllowMessage()) {
      //   SDJS.Collab.BeginSecondaryEdit();
      // }

      // Get the current data object
      const dataObject = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, true);

      // Get the current background color
      let currentColor = dataObject.background.Paint.Color;

      // If background is transparent, treat current color as white
      if (dataObject.background.Paint.FillType === NvConstant.FillTypes.Transparent) {
        currentColor = NvConstant.Colors.White;
      }

      // Handle transparent color case
      let displayColor = color;
      if (color === NvConstant.Colors.Trans) {
        displayColor = NvConstant.Colors.White;
      }

      // Update the UI text color to complement the new background
      UIUtil.ChangeBackgroundTextColor(displayColor, currentColor);

      // Set the background properties based on color choice
      if (color === NvConstant.Colors.Trans) {
        dataObject.background.Paint.FillType = NvConstant.FillTypes.Transparent;
        dataObject.background.Paint.Color = NvConstant.Colors.White;
      } else {
        dataObject.background.Paint.FillType = NvConstant.FillTypes.Solid;
        dataObject.background.Paint.Color = color;
      }

      // Set opacity to fully opaque
      dataObject.background.Paint.Opacity = 1;

      // Apply the background color change
      UIUtil.SetBackgroundColor();

      // // Handle collaborative messaging if enabled
      // if (SDJS.Collab.AllowMessage()) {
      //   const message = {
      //     color: color
      //   };
      //   SDJS.Collab.BuildMessage(SDJS.ListManager.CollabMessages.SetBackgroundColor, message, false);
      // }

      // Complete the operation
      DrawUtil.CompleteOperation();

      T3Util.Log('O.ToolOpt.LibSetBackgroundColorAct - Output: Set background color', color);
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      T3Util.Log('O.ToolOpt.LibSetBackgroundColorAct - Error:', error);
    }
  }

  LibImportSVGSymbolAct(e) {
    try {
      T3Gv.opt.CloseEdit();

      // Create a file input element to select an image
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';

      fileInput.onchange = (e) => {
        const file = fileInput.files?.[0];
        if (!file) {
          T3Util.Log('O.ToolOpt.LibSetBackgroundImageAct - Error: No file selected');
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const fileDataUrl = reader.result as string;

          T3Gv.opt.ImportSVGSymbol(file)
          T3Util.Log('O.ToolOpt.LibSetBackgroundImageAct - Output: Set background image', { e: e });
        };

        reader.onerror = () => {
          T3Util.Log('O.ToolOpt.LibSetBackgroundImageAct - Error: Failed to read file');
        };

        reader.readAsDataURL(file);
      };

      // Open file dialog
      fileInput.click();

    } catch (e) {
      T3Gv.opt.ExceptionCleanup(e)
    }
  }

  LibToolShape(symbolType, useDragDrop) {
    this.tul.ToolDragDropSymbol(symbolType, useDragDrop);
  }

  LibAddNoteAct() {
    try {
      T3Gv.opt.EditNote()
    } catch (e) {
      T3Gv.opt.ExceptionCleanup(e)
    }
  }

  LibAddCommentAct() {
    try {
      T3Gv.opt.CloseEdit(),
        T3Gv.opt.EditComments()
    } catch (e) {
      T3Gv.opt.ExceptionCleanup(e)
    }
  }
}

export default ToolOpt
