

import T3Gv from "../../Data/T3Gv"
import NvConstant from "../../Data/Constant/NvConstant"
import ToolUtil from './ToolUtil'
import T3Util from "../../Util/T3Util";
import OptConstant from "../../Data/Constant/OptConstant";
import SelectUtil from "../Opt/SelectUtil";
import ObjectUtil from "../Data/ObjectUtil";
import StyleConstant from "../../Data/Constant/StyleConstant";
import DrawUtil from "../Opt/DrawUtil";
import UIUtil from "../UI/UIUtil";
import QuasarUtil from "../Quasar/QuasarUtil";
import HvConstant from "../../Data/Constant/HvConstant";
import DataOpt from "../Data/DataOpt";
import LogUtil from "../../Util/LogUtil";

class ToolOpt {

  tul: ToolUtil

  constructor() {
    this.tul = new ToolUtil();
  }

  /**
   * Handles selection operations based on the event and selection mode
   * @param event - The DOM event that triggered the selection
   * @returns void
   */
  SelectAct(event) {
    LogUtil.Debug('= O.ToolOpt SelectAct - Input:', { event });
    this.tul.CancelOperation();
  }

  /**
    * Sets default wall thickness and initiates wall drawing
    * @param event - The DOM event that triggered the action
    * @returns void
    */
  DrawWall(event) {
    const defaultWallThickness = 0.5;
    this.tul.SetDefaultWallThickness(defaultWallThickness, null);
    this.tul.DrawNewWallShape(null, null);
    LogUtil.Debug('= O.ToolOpt DrawWall - Output: Initialized wall drawing with thickness', defaultWallThickness);
  }

  /**
   * Creates a new shape from the selected tool
   * @param event - The DOM event that triggered the action
   * @param shapeType - The type of shape to create
   * @returns void
   */
  StampShapeFromToolAct(event, shapeType, uniShapeType) {
    this.tul.StampOrDragDropNewShape(event, shapeType, uniShapeType);
    LogUtil.Debug('= O.ToolOpt StampShapeFromToolAct - Output:', { event, shapeType, uniShapeType });
  }

  /**
   * Draws a new line shape
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ToolLineAct(lineType, event) {
    // Parameters: lineType=2, isPolygon=false, isClosed=false
    // const lineType = 2;
    this.tul.DrawNewLineShape(lineType, false, false);
    LogUtil.Debug('= O.ToolOpt ToolLineAct - Output: Drew new line shape', "line type=", lineType);
  }

  /**
   * Rotates selected shapes by the specified angle
   * @param event - The DOM event that triggered the action
   * @param angle - The rotation angle in degrees
   * @returns null if angle is null, void otherwise
   */
  RotateAct(event, angle) {
    angle === null ? 0 : angle;
    this.tul.RotateShapes(angle/*360-angle*/);
  }

  /**
   * Aligns selected shapes according to the specified alignment type
   * @param alignmentType - The type of alignment to apply
   * @returns null if alignmentType is null, void otherwise
   */
  ShapeAlignAct(alignmentType) {
    LogUtil.Debug('= O.ToolOpt ShapeAlignAct - Input:', { alignmentType });
    this.tul.AlignShapes(alignmentType);
  }

  /**
   * Groups currently selected shapes
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  GroupAct(event) {
    this.tul.GroupSelected();
    LogUtil.Debug('= O.ToolOpt GroupAct - Output: Grouped selected shapes');
  }

  /**
   * Ungroups currently selected shapes
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  UnGroupAct(event) {
    this.tul.UnGroupSelected();
    LogUtil.Debug('= O.ToolOpt UngroupAct - Output: Ungrouped selected shapes');
  }

  /**
   * Flips selected shapes horizontally
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ShapeFlipHorizontalAct(event) {
    this.tul.FlipHorizontal();
    LogUtil.Debug('= O.ToolOpt ShapeFlipHorizontalAct - Output: Flipped shapes horizontally');
  }

  /**
   * Flips selected shapes vertically
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ShapeFlipVerticalAct(event) {
    this.tul.FlipVertical();
    LogUtil.Debug('= O.ToolOpt ShapeFlipVerticalAct - Output: Flipped shapes vertically');
  }

  /**
   * Makes selected shapes the same size according to the specified option
   * @param event - The DOM event that triggered the action
   * @param sizeOption - The size option to apply
   * @returns void
   */
  MakeSameSizeAct(event, sizeOption) {
    this.tul.MakeSameSize(sizeOption);
    LogUtil.Debug('= O.ToolOpt MakeSameSizeAct - Output: Made shapes same size with option', sizeOption);
  }

  /**
   * Brings selected shapes to the front
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ShapeBringToFrontAct(event) {
    this.tul.BringToFrontOf();
    LogUtil.Debug('= O.ToolOpt ShapeBringToFrontAct - Output: Brought shapes to front');
  }

  /**
   * Sends selected shapes to the back
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ShapeSendToBackAct(event) {
    this.tul.SendToBackOf();
    LogUtil.Debug('= O.ToolOpt ShapeSendToBackAct - Output: Sent shapes to back');
  }

  /**
   * Pastes copied objects
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  PasteAct(event) {
    const isRightClick = false;
    this.tul.Paste(isRightClick);
    LogUtil.Debug('= O.ToolOpt PasteAct - Output: Pasted objects isRightClick', isRightClick);
  }

  /**
   * Pastes copied objects on right click
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  PasteActRightClickAct(event) {
    const isRightClick = true;
    this.tul.Paste(true);
    LogUtil.Debug('= O.ToolOpt PasteActRightClickAct - Output: Pasted objects with right click context menu', isRightClick);
  }

  /**
   * Copies selected objects
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  CopyAct(event) {
    this.tul.Copy();
    LogUtil.Debug('= O.ToolOpt CopyAct - Output: Copied selected objects');
  }

  /**
   * Cuts selected objects
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  CutAct(event) {
    this.tul.Cut();
    LogUtil.Debug('= O.ToolOpt CutAct - Output: Cut selected objects');
  }

  /**
   * Deletes selected objects
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  DeleteAct(event) {
    this.tul.DeleteSelectedObjects();
    LogUtil.Debug('= O.ToolOpt DeleteAct - Output: Deleted selected objects');
  }

  /**
   * Undoes the last operation
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  UndoAct(event) {
    this.tul.Undo();
    LogUtil.Debug('= O.ToolOpt UndoAct - Output: Undid last operation');
  }

  /**
   * Redoes the last undone operation
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  RedoAct(event) {
    this.tul.Redo();
    LogUtil.Debug('= O.ToolOpt RedoAct - Output: Redid last undone operation');
  }

  /**
   * Commits the file picker selection and saves the file
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  SaveAct() {
    this.tul.Save();
  }

  /**
   * Duplicates selected objects
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  DuplicateAct(event) {
    this.tul.Duplicate();
    LogUtil.Debug('= O.ToolOpt DuplicateAct - Output: Duplicated selected objects');
  }

  /**
   * Pre-loads a symbol for use
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  ClickSymbolAct(event) {
    const symbolId = "d6e019b9-110d-4990-8897-eade69451d92";
    this.tul.StampOrDragDropNewSymbol(symbolId, false);
    LogUtil.Debug('= O.ToolOpt ClickSymbolAct - Output: Pre-loaded symbol', symbolId);
  }

  /**
   * Handles drag and drop of symbols
   * @param event - The DOM event that triggered the action
   * @returns void
   */
  DragDropSymbolAct(event) {
    this.tul.DragDropSymbol(event, true);
    LogUtil.Debug('= O.ToolOpt DragDropSymbolAct - Output: Handled symbol drag and drop');
  }

  /**
   * Sets or imports a background image for the canvas
   * @param event - The event or image data for the background
   * @param isLayerImage - Flag determining whether to import as a layer image (true) or set as background (false)
   * @returns void
   */
  LibSetBackgroundImageAct(event, isLayerImage) {
    LogUtil.Debug('= O.ToolOpt LibSetBackgroundImageAct - Input:', { event, isLayerImage });

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
          LogUtil.Debug('= O.ToolOpt LibSetBackgroundImageAct - Error: No file selected');
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

          LogUtil.Debug('= O.ToolOpt LibSetBackgroundImageAct - Output: Set background image', { asLayer: isLayerImage });
        };

        reader.onerror = () => {
          LogUtil.Debug('= O.ToolOpt LibSetBackgroundImageAct - Error: Failed to read file');
        };

        reader.readAsDataURL(file);
      };

      // Open file dialog
      fileInput.click();

      // Use the hardcoded URL as a fallback
      let fileDataUrl = imgUrl;

      if (isLayerImage) {
        T3Gv.opt.ImportBackgroundLayerImage(fileDataUrl);
      } else {
        T3Gv.opt.SetBackgroundImage(fileDataUrl);
      }

      LogUtil.Debug('= O.ToolOpt LibSetBackgroundImageAct - Output: Set background image', { asLayer: isLayerImage });
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Locks the selected object or right-clicked object
   * @param isRightClick - Flag indicating if the action was triggered by a right-click
   * @returns void
   */
  LibLockAct(isRightClick) {

    try {
      // Determine the target to lock based on whether this is a right-click action
      const targetId = isRightClick ? T3Gv.opt.rClickParam?.targetId : SelectUtil.GetTargetSelect();

      // Close any open edits first
      T3Gv.opt.CloseEdit(true);

      // Lock the target object
      T3Gv.opt.Lock(targetId, true);

      LogUtil.Debug('= O.ToolOpt LibLockAct - Input/Output: Locked object with ID', isRightClick, targetId);
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  LibUnlockAct(isRightClick) {
    try {
      // Determine the target to unlock based on whether this is a right-click action
      const targetId = isRightClick ? T3Gv.opt.rClickParam?.targetId : SelectUtil.GetTargetSelect();

      // Close any open edits first
      T3Gv.opt.CloseEdit(true);

      // Unlock the target object
      T3Gv.opt.Lock(targetId, false);

      LogUtil.Debug('= O.ToolOpt LibUnlockAct - Input/Output: Unlocked object with ID', isRightClick, targetId);
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Sets the background color for the canvas
   * @param color - The color to set as the background
   * @returns void
   */
  LibSetBackgroundColorAct(color) {
    try {
      // Close any ongoing edits first
      T3Gv.opt.CloseEdit(true, true);

      // Get the current data object
      const dataObject = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, true);

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

      // Complete the operation
      DrawUtil.CompleteOperation();

      LogUtil.Debug('= O.ToolOpt LibSetBackgroundColorAct - Output: Set background color', color);
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  LibImportSvgSymbolAct(e) {
    try {
      T3Gv.opt.CloseEdit();

      // Create a file input element to select an image
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';

      fileInput.onchange = (e) => {
        const file = fileInput.files?.[0];
        if (!file) {
          LogUtil.Debug('= O.ToolOpt LibSetBackgroundImageAct - Error: No file selected');
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const fileDataUrl = reader.result as string;

          T3Gv.opt.ImportSvgSymbol(file)
          LogUtil.Debug('= O.ToolOpt LibSetBackgroundImageAct - Output: Set background image', { e: e });
        };

        reader.onerror = () => {
          LogUtil.Debug('= O.ToolOpt LibSetBackgroundImageAct - Error: Failed to read file');
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

  LibAddNoteAct() { }

  LibAddCommentAct() { }

  LibHyperlinkAct() { }

  VueForeignObjectAct(event, shapeType, uniShapeType) {
    LogUtil.Debug('= = O.ToolOpt VueForeignObjectAct - Iutput: Created shape of type', event, shapeType, uniShapeType);
    this.tul.StampOrDragDropNewShape(event, shapeType, uniShapeType);
  }

  SetX(xVal: string) {
    try {
      T3Gv.opt.CloseEdit();
      T3Gv.opt.SetTopLeft(xVal, true);
    } catch (ex) {
      T3Gv.opt.ExceptionCleanup(ex);
    }
  }

  SetY(yVal: string) {
    try {
      T3Gv.opt.CloseEdit();
      T3Gv.opt.SetTopLeft(yVal, false);
    } catch (ex) {
      T3Gv.opt.ExceptionCleanup(ex);
    }
  }

  SetWidth(widthVal: string) {
    try {
      T3Gv.opt.CloseEdit();
      T3Gv.opt.ChangeWidth(widthVal);
    } catch (ex) {
      T3Gv.opt.ExceptionCleanup(ex);
    }
  }

  SetHeight(heightVal: string) {
    try {
      T3Gv.opt.CloseEdit();
      T3Gv.opt.ChangeHeight(heightVal);
    } catch (ex) {
      T3Gv.opt.ExceptionCleanup(ex);
    }
  }

  SetBackgroundColor(color: string) {
    try {
      T3Gv.opt.CloseEdit();
      T3Gv.opt.SetBackgroundColor(color);
    } catch (ex) {
      T3Gv.opt.ExceptionCleanup(ex);
    }
  }

  AddToLibraryAct() {
    try {
      T3Gv.opt.CloseEdit();
      T3Gv.opt.AddToLibrary();
    } catch (ex) {
      T3Gv.opt.ExceptionCleanup(ex);
    }
  }

  LoadLibraryAct() {
    try {
      T3Gv.opt.CloseEdit();
      T3Gv.opt.LoadLibrary();
    } catch (ex) {
      T3Gv.opt.ExceptionCleanup(ex);
    }
  }

  ResetScaleAct(event) {
    try {
      T3Gv.opt.CloseEdit();
      T3Gv.docUtil.SetZoomLevel(HvConstant.T3Config.Zoom.Default * 100);
    } catch (ex) {
      T3Gv.opt.ExceptionCleanup(ex);
    }
  }

  ClearAct() {
    try {
      T3Gv.opt.CloseEdit();
      this.tul.ClearAndRest();
      LogUtil.Debug('= O.ToolOpt ClearAct - Output: Cleared all shapes and data');
    } catch (ex) {
      T3Gv.opt.ExceptionCleanup(ex);
    }
  }
}

export default ToolOpt
