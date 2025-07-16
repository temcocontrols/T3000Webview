
import T3Gv from "../Data/T3Gv";
import PolygonConstant from "../Opt/Polygon/PolygonConstant";
import ToolOpt from "../Opt/Tool/ToolOpt"
import $ from 'jquery'
import LogUtil from "../Util/LogUtil";

class EvtOpt {

  static toolOpt = new ToolOpt();

  /**
   * Initializes all UI control event bindings when the document is ready.
   * This method serves as the main entry point for setting up all tool interactions.
   */
  BindElemCtlEvent() {
    $(document).ready(() => {

      this.BindVueForeignObjectEvent();

      // Selection and basic tools
      this.BindSelectEvent();
      this.BindSelectAllEvent();
      this.BindLibraryEvent();

      // Drawing tools
      this.BindLineEvent();
      this.BindLine1Event();
      this.BindWallEvent();

      // Shape creation tools
      this.BindRectEvent();
      this.BindOvalEvent();
      this.BindImageEvent();
      this.BindCircleEvent();
      this.BindTextEvent();

      // Arrow tools
      this.BindArrREvent();
      this.BindArrLEvent();
      this.BindArrTEvent();
      this.BindArrBEvent();

      // Transformation tools
      this.BindRoate45Event();
      this.BindRoate90Event();

      // Alignment tools
      this.BindAlignLeftEvent();
      this.BindAlignCentersEvent();
      this.BindAlignTopsEvent();
      this.BindAlignMiddlesEvent();
      this.BindAlignBottomsEvent();
      this.BindAlignRightsEvent();

      // Grouping tools
      this.BindGroupEvent();
      this.BindUngroupEvent();

      // Flip operations
      this.BindFlipHorizontalEvent();
      this.BindFlipVerticalEvent();

      // Size matching tools
      this.BindSameHeightEvent();
      this.BindSameWidthEvent();
      this.BindSameBothEvent();

      // Z-order controls
      this.BindBringToFrontEvent();
      this.BindSendToBackEvent();

      // Clipboard operations
      this.BindCopyEvent();
      this.BindCutEvent();
      this.BindPasteEvent();
      this.BindDeleteEvent();

      // History operations
      this.BindUndoEvent();
      this.BindRedoEvent();

      // File and utility operations
      this.BindSaveEvent();
      this.BindDuplicateEvent();
      this.BindClearEvent();

      this.BindLibSelectEvent();
      this.BindLibBoxEvent();
      this.BindLibTextEvent();
      this.BindLibIconEvent();
      this.BindLibSwitchIconEvent();
      this.BindLibLedEvent();
      this.BindLibRoomHumidityEvent();
      this.BindLibRoomTemperatureEvent();
      this.BindLibTemperatureEvent();
      this.BindLibBoilerEvent();
      this.BindLibHeatpumpEvent();
      this.BindLibPumpEvent();
      this.BindLibValveThreeWayEvent();
      this.BindLibValveTwoWayEvent();
      this.BindLibDuctEvent();
      this.BindLibFanEvent();
      this.BindLibCoolingCoilEvent();
      this.BindLibHeatingCoilEvent();
      this.BindLibFilterEvent();
      this.BindLibHumidifierEvent();
      this.BindLibHumidityEvent();
      this.BindLibPressureEvent();
      this.BindLibDamperEvent();
      this.BindLibTemperature2Event();
      this.BindLibThermalWheelEvent();
      this.BindLibEnthalpyEvent();
      this.BindLibFlowEvent();
      this.BindLibGuageEvent();
      this.BindLibDialEvent();
      this.BindLibValueEvent();
      this.BindLibIconWithTitleEvent();
      this.BindLibSetBackgroundColorEvent();
      this.BindLibSetBackgroundImageEvent();
      this.BindLibImportSvgSymbolEvent();
      this.BindLibLockEvent();
      this.BindLibUnLockEvent();
      this.BindLibAddNoteEvent();
      this.BindLibAddCommentEvent();
      this.BindLibHyperlinkEvent();

      this.BindSetXEvent();
      this.BindSetYEvent();
      this.BindSetWidthEvent();
      this.BindSetHeightEvent();

      this.BindAddToLibraryEvent();

      this.BindLoadLibraryEvent();
      this.BindDuct1Event();
      this.BindDuct2Event();
      this.BindDuct3Event();
      this.BindDuct4Event();
      this.BindDuct5Event();
      this.BindDuct6Event();
      this.BindDuct7Event();
      this.BindDuct8Event();
      this.BindDuct9Event();
      this.BindDuct10Event();
      this.BindDuct11Event();
      this.BindDuct12Event();

      this.BindResetScaleEvent();

      this.BindDocumentAreaEvent();
    });
  }

  /**
   * Binds the click event handler to the select button.
   * When clicked, activates the selection tool.
   */
  BindSelectEvent() {
    $("#btn_try_select").on("click", (event) => {
      EvtOpt.toolOpt.SelectAct(event);
    });
  }

  BindSelectAllEvent() {
    $("#btn_try_select_all").on("click", (event) => {
      EvtOpt.toolOpt.SelectAllObjects();
    });
  }

  /**
   * Binds the click event handler to the library button.
   * When clicked, activates symbol click and drag-drop functionality.
   */
  BindLibraryEvent() {
    $("#btn_try_library").on("click", (event) => {
      // EvtOpt.toolOpt.ClickSymbolAct(event);
      EvtOpt.toolOpt.DragDropSymbolAct(event);
    });
  }

  /**
   * Binds the click event handler to the line drawing tool.
   * When clicked, activates the line drawing functionality.
   */
  BindLineEvent() {
    $("#btn_try_line").on("pointerdown", (event) => {
      EvtOpt.toolOpt.ToolLineAct("line", event);
    });
  }

  /**
   * Binds the click event handler to the alternative line drawing tool.
   * When clicked, activates the line drawing functionality.
   */
  BindLine1Event() {
    $("#btn_try_line1").on("pointerdown", (event) => {
      EvtOpt.toolOpt.ToolLineAct("arcLine", event);
    });
  }

  /**
   * Binds the click event handler to the wall drawing tool.
   * When clicked, activates wall drawing functionality.
   */
  BindWallEvent() {
    $("#btn_try_wall").on("pointerdown", (event) => {
      EvtOpt.toolOpt.DrawWall(event);
    });
  }

  // Shape creation tools

  /**
   * Binds the click event handler to the rectangle tool.
   * When clicked, creates a rectangle shape.
   */
  BindRectEvent() {
    $("#btn_try_Rect").on("pointerdown", (event) => {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 2, "Rect");
    });
  }

  /**
   * Binds the click event handler to the oval tool.
   * When clicked, creates an oval shape.
   */
  BindOvalEvent() {
    $("#btn_try_Oval").on("pointerdown", (event) => {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 4, "Oval");
    });
  }

  /**
   * Binds the click event handler to the image insertion tool.
   * When clicked, allows inserting an image.
   */
  BindImageEvent() {
    $("#btn_try_Image").on("pointerdown", (event) => {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 1, "Image");
    });
  }

  /**
   * Binds the click event handler to the circle tool.
   * When clicked, creates a circle shape.
   */
  BindCircleEvent() {
    $("#btn_try_Circ").on("pointerdown", (event) => {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 9, "Circle");
    });
  }

  /**
   * Binds the click event handler to the text tool.
   * When clicked, creates a text label.
   */
  BindTextEvent() {
    $("#btn_try_Text").on("pointerdown", (event) => {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 'textLabel', "Text");
    });
  }

  // Arrow tools

  /**
   * Binds the click event handler to the right arrow tool.
   * When clicked, creates a right-pointing arrow.
   */
  BindArrREvent() {
    $("#btn_try_ArrR").on("pointerdown", (event) => {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 10, "ArrR");
    });
  }

  /**
   * Binds the click event handler to the left arrow tool.
   * When clicked, creates a left-pointing arrow.
   */
  BindArrLEvent() {
    $("#btn_try_ArrL").on("pointerdown", (event) => {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 11, "ArrL");
    });
  }

  /**
   * Binds the click event handler to the top arrow tool.
   * When clicked, creates an up-pointing arrow.
   */
  BindArrTEvent() {
    $("#btn_try_ArrT").on("pointerdown", (event) => {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 12, "ArrT");
    });
  }

  /**
   * Binds the click event handler to the bottom arrow tool.
   * When clicked, creates a down-pointing arrow.
   */
  BindArrBEvent() {
    $("#btn_try_ArrB").on("pointerdown", (event) => {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 13, "ArrB");
    });
  }

  // Rotation tools

  /**
   * Binds the click event handler to the 45° rotation tool.
   * When clicked, rotates selected element(s) by 45 degrees.
   */
  BindRoate45Event() {
    $("#btn_try_Roate45").on("pointerdown", (event) => {
      EvtOpt.toolOpt.RotateAct(event, 45);
    });
  }

  /**
   * Binds the click event handler to the 90° rotation tool.
   * When clicked, rotates selected element(s) by 90 degrees.
   */
  BindRoate90Event() {
    $("#btn_try_Roate90").on("pointerdown", (event) => {
      EvtOpt.toolOpt.RotateAct(event, 90);
    });
  }

  // Alignment tools

  /**
   * Binds the click event handler to the left alignment tool.
   * When clicked, aligns selected elements to their leftmost edges.
   */
  BindAlignLeftEvent() {
    $("#btn_try_Align_lefts").on("pointerdown", (event) => {
      EvtOpt.toolOpt.ShapeAlignAct("lefts");
    });
  }

  /**
   * Binds the click event handler to the center alignment tool.
   * When clicked, aligns selected elements to their horizontal centers.
   */
  BindAlignCentersEvent() {
    $("#btn_try_Align_centers").on("pointerdown", (event) => {
      EvtOpt.toolOpt.ShapeAlignAct("centers");
    });
  }

  /**
   * Binds the click event handler to the top alignment tool.
   * When clicked, aligns selected elements to their top edges.
   */
  BindAlignTopsEvent() {
    $("#btn_try_Align_tops").on("pointerdown", (event) => {
      EvtOpt.toolOpt.ShapeAlignAct("tops");
    });
  }

  /**
   * Binds the click event handler to the middle alignment tool.
   * When clicked, aligns selected elements to their vertical centers.
   */
  BindAlignMiddlesEvent() {
    $("#btn_try_Align_middles").on("pointerdown", (event) => {
      EvtOpt.toolOpt.ShapeAlignAct("middles");
    });
  }

  /**
   * Binds the click event handler to the bottom alignment tool.
   * When clicked, aligns selected elements to their bottom edges.
   */
  BindAlignBottomsEvent() {
    $("#btn_try_Align_bottoms").on("pointerdown", (event) => {
      EvtOpt.toolOpt.ShapeAlignAct("bottoms");
    });
  }

  /**
   * Binds the click event handler to the right alignment tool.
   * When clicked, aligns selected elements to their right edges.
   */
  BindAlignRightsEvent() {
    $("#btn_try_Align_rights").on("pointerdown", (event) => {
      EvtOpt.toolOpt.ShapeAlignAct("rights");
    });
  }

  // Grouping tools

  /**
   * Binds the click event handler to the group tool.
   * When clicked, groups selected elements together.
   */
  BindGroupEvent() {
    $("#btn_try_Group").on("pointerdown", (event) => {
      EvtOpt.toolOpt.GroupAct(event);
    });
  }

  /**
   * Binds the click event handler to the ungroup tool.
   * When clicked, ungroups the selected group into individual elements.
   */
  BindUngroupEvent() {
    $("#btn_try_UnGroup").on("pointerdown", (event) => {
      EvtOpt.toolOpt.UnGroupAct(event);
    });
  }

  // Flip tools

  /**
   * Binds the click event handler to the horizontal flip tool.
   * When clicked, flips selected element(s) horizontally.
   */
  BindFlipHorizontalEvent() {
    $("#btn_try_Flip_Horizontal").on("pointerdown", (event) => {
      EvtOpt.toolOpt.ShapeFlipHorizontalAct(event);
    });
  }

  /**
   * Binds the click event handler to the vertical flip tool.
   * When clicked, flips selected element(s) vertically.
   */
  BindFlipVerticalEvent() {
    $("#btn_try_Flip_Vertical").on("pointerdown", (event) => {
      EvtOpt.toolOpt.ShapeFlipVerticalAct(event);
    });
  }

  // Size matching tools

  /**
   * Binds the click event handler to the same height tool.
   * When clicked, makes selected elements the same height.
   */
  BindSameHeightEvent() {
    $("#btn_try_Same_Height").on("pointerdown", (event) => {
      EvtOpt.toolOpt.MakeSameSizeAct(event, 1);
    });
  }

  /**
   * Binds the click event handler to the same width tool.
   * When clicked, makes selected elements the same width.
   */
  BindSameWidthEvent() {
    $("#btn_try_Same_Width").on("pointerdown", (event) => {
      EvtOpt.toolOpt.MakeSameSizeAct(event, 2);
    });
  }

  /**
   * Binds the click event handler to the same size tool.
   * When clicked, makes selected elements the same width and height.
   */
  BindSameBothEvent() {
    $("#btn_try_Same_Both").on("pointerdown", (event) => {
      EvtOpt.toolOpt.MakeSameSizeAct(event, 3);
    });
  }

  // Z-order tools

  /**
   * Binds the click event handler to the bring to front tool.
   * When clicked, brings selected element(s) to the front.
   */
  BindBringToFrontEvent() {
    $("#btn_try_BringToFront").on("pointerdown", (event) => {
      EvtOpt.toolOpt.ShapeBringToFrontAct(event);
    });
  }

  /**
   * Binds the click event handler to the send to back tool.
   * When clicked, sends selected element(s) to the back.
   */
  BindSendToBackEvent() {
    $("#btn_try_SendToBack").on("pointerdown", (event) => {
      EvtOpt.toolOpt.ShapeSendToBackAct(event);
    });
  }

  // Clipboard operations

  /**
   * Binds the click event handler to the paste tool.
   * When clicked, pastes previously copied or cut element(s).
   */
  BindPasteEvent() {
    $("#btn_try_Paste").on("pointerdown", (event) => {
      EvtOpt.toolOpt.PasteAct(event);
    });
  }

  /**
   * Binds the click event handler to the copy tool.
   * When clicked, copies selected element(s).
   */
  BindCopyEvent() {
    $("#btn_try_Copy").on("pointerdown", (event) => {
      EvtOpt.toolOpt.CopyAct(event);
    });
  }

  /**
   * Binds the click event handler to the cut tool.
   * When clicked, cuts selected element(s).
   */
  BindCutEvent() {
    $("#btn_try_Cut").on("pointerdown", (event) => {
      EvtOpt.toolOpt.CutAct(event);
    });
  }

  /**
   * Binds the click event handler to the delete tool.
   * When clicked, deletes selected element(s).
   */
  BindDeleteEvent() {
    $("#btn_try_Delete").on("pointerdown", (event) => {
      EvtOpt.toolOpt.DeleteAct(event);
    });
  }

  // History operations

  /**
   * Binds the click event handler to the undo tool.
   * When clicked, undoes the last action.
   */
  BindUndoEvent() {
    $("#btn_try_Undo").on("pointerdown", (event) => {
      EvtOpt.toolOpt.UndoAct(event);
    });
  }

  /**
   * Binds the click event handler to the redo tool.
   * When clicked, redoes the last undone action.
   */
  BindRedoEvent() {
    $("#btn_try_Redo").on("pointerdown", (event) => {
      EvtOpt.toolOpt.RedoAct(event);
    });
  }

  // File operations

  /**
   * Binds the click event handler to the save tool.
   * When clicked, saves the current work.
   */
  BindSaveEvent() {
    $("#btn_try_Save").on("pointerdown", (event) => {
      EvtOpt.toolOpt.SaveAct();
    });
  }

  /**
   * Binds the click event handler to the duplicate tool.
   * When clicked, duplicates selected element(s).
   */
  BindDuplicateEvent() {
    $("#btn_try_Duplicate").on("pointerdown", (event) => {
      EvtOpt.toolOpt.DuplicateAct(event);
    });
  }

  /**
   * Binds the click event handler to the clear tool.
   * When clicked, clears local storage.
   */
  BindClearEvent() {
    $("#btn_try_Clear").on("pointerdown", (event) => {
      EvtOpt.toolOpt.ClearAct();
    });
  }

  BindLibSelectEvent() {
    $("#btn_try_Lib_Select").on("pointerdown", (event) => {
      EvtOpt.toolOpt.SelectAct(event);
    });
  }

  BindLibBoxEvent() {
    $("#btn_try_Lib_Box").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Box", true);
    });
  }

  BindLibTextEvent() {
    $("#btn_try_Lib_Text").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Text", true);
    });
  }

  BindLibIconEvent() {
    $("#btn_try_Lib_Icon").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Icon", true);
    });
  }

  BindLibSwitchIconEvent() {
    $("#btn_try_Lib_SwitchIcon").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("SwitchIcon", true);
    });
  }

  BindLibLedEvent() {
    $("#btn_try_Lib_Led").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Led", true);
    });
  }

  BindLibRoomHumidityEvent() {
    $("#btn_try_Lib_RoomHumidity").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("RoomHumidity", true);
    });
  }

  BindLibRoomTemperatureEvent() {
    $("#btn_try_Lib_RoomTemperature").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("RoomTemperature", true);
    });
  }

  BindLibTemperatureEvent() {
    $("#btn_try_Lib_Temperature").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Temperature", true);
    });
  }

  BindLibBoilerEvent() {
    $("#btn_try_Lib_Boiler").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Boiler", true);
    });
  }

  BindLibHeatpumpEvent() {
    $("#btn_try_Lib_Heatpump").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Heatpump", true);
    });
  }

  BindLibPumpEvent() {
    $("#btn_try_Lib_Pump").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Pump", true);
    });
  }

  BindLibValveThreeWayEvent() {
    $("#btn_try_Lib_ValveThreeWay").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("ValveThreeWay", true);
    });
  }

  BindLibValveTwoWayEvent() {
    $("#btn_try_Lib_ValveTwoWay").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("ValveTwoWay", true);
    });
  }

  BindLibDuctEvent() {
    $("#btn_try_Lib_Duct").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Duct", true);
    });
  }

  BindLibFanEvent() {
    $("#btn_try_Lib_Fan").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Fan", true);
    });
  }

  BindLibCoolingCoilEvent() {
    $("#btn_try_Lib_CoolingCoil").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("CoolingCoil", true);
    });
  }

  BindLibHeatingCoilEvent() {
    $("#btn_try_Lib_HeatingCoil").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("HeatingCoil", true);
    });
  }

  BindLibFilterEvent() {
    $("#btn_try_Lib_Filter").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Filter", true);
    });
  }

  BindLibHumidifierEvent() {
    $("#btn_try_Lib_Humidifier").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Humidifier", true);
    });
  }

  BindLibHumidityEvent() {
    $("#btn_try_Lib_Humidity").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Humidity", true);
    });
  }

  BindLibPressureEvent() {
    $("#btn_try_Lib_Pressure").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Pressure", true);
    });
  }

  BindLibDamperEvent() {
    $("#btn_try_Lib_Damper").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Damper", true);
    });
  }

  BindLibTemperature2Event() {
    $("#btn_try_Lib_Temperature2").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Temperature2", true);
    });
  }

  BindLibThermalWheelEvent() {
    $("#btn_try_Lib_ThermalWheel").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("ThermalWheel", true);
    });
  }

  BindLibEnthalpyEvent() {
    $("#btn_try_Lib_Enthalpy").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Enthalpy", true);
    });
  }

  BindLibFlowEvent() {
    $("#btn_try_Lib_Flow").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Flow", true);
    });
  }

  BindLibGuageEvent() {
    $("#btn_try_Lib_Guage").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Guage", true);
    });
  }

  BindLibDialEvent() {
    $("#btn_try_Lib_Dial").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Dial", true);
    });
  }

  BindLibValueEvent() {
    $("#btn_try_Lib_Value").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Value", true);
    });
  }

  BindLibIconWithTitleEvent() {
    $("#btn_try_Lib_IconWithTitle").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("IconWithTitle", true);
    });
  }

  BindLibSetBackgroundColorEvent() {
    $("#btn_try_Lib_SetBackgroundColor").on("pointerdown", (event) => {
      if (T3Gv.docUtil.docConfig.backgroundColor == "#FFFFFF") {
        EvtOpt.toolOpt.LibSetBackgroundColorAct("#20b2aa");
        T3Gv.docUtil.docConfig.backgroundColor = "#20b2aa";
      }
      else {
        EvtOpt.toolOpt.LibSetBackgroundColorAct("#FFFFFF");
        T3Gv.docUtil.docConfig.backgroundColor = "#FFFFFF";
      }
    });
  }

  BindLibSetBackgroundImageEvent() {
    $("#btn_try_Lib_SetBackgroundImage").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibSetBackgroundImageAct(event, false);
    });
  }

  BindLibImportSvgSymbolEvent() {
    $("#btn_try_Lib_ImportSvgSymbol").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibImportSvgSymbolAct(event);
    });
  }

  BindLibLockEvent() {
    $("#btn_try_Lib_Lock").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibLockAct(event);
    });
  }

  BindLibUnLockEvent() {
    $("#btn_try_Lib_UnLock").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibUnlockAct(event);
    });
  }

  BindLibAddNoteEvent() {
    $("#btn_try_Lib_AddNote").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibAddNoteAct();
    });
  }

  BindLibAddCommentEvent() {
    $("#btn_try_Lib_AddComment").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibAddCommentAct();
    });
  }

  BindLibHyperlinkEvent() {
    $("#btn_try_Lib_Hyperlink").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibHyperlinkAct();
    });
  }

  HandleSidebarToolEvent(selectedTool: any) {
    LogUtil.Debug("Selected tool: ", selectedTool);


    if (selectedTool.value.name == "Temperature") {
      EvtOpt.toolOpt.LibToolShape("Temperature", true);
    }

    if (selectedTool.value.name == "Boiler") {
      EvtOpt.toolOpt.LibToolShape("Boiler", true);
    }

    if (selectedTool.value.name == "Heatpump") {
      EvtOpt.toolOpt.LibToolShape("Heatpump", true);
    }

    if (selectedTool.value.name == "Pump") {
      EvtOpt.toolOpt.LibToolShape("Pump", true);
    }

    if (selectedTool.value.name == "ValveThreeWay") {
      EvtOpt.toolOpt.LibToolShape("ValveThreeWay", true);
    }

    if (selectedTool.value.name == "ValveTwoWay") {
      EvtOpt.toolOpt.LibToolShape("ValveTwoWay", true);
    }

    if (selectedTool.value.name == "Duct") {
      // EvtOpt.toolOpt.LibToolShape("Duct", true);
    }

    if (selectedTool.value.name == "Fan") {
      EvtOpt.toolOpt.LibToolShape("Fan", true);
    }

    if (selectedTool.value.name == "CoolingCoil") {
      EvtOpt.toolOpt.LibToolShape("CoolingCoil", true);
    }

    if (selectedTool.value.name == "HeatingCoil") {
      EvtOpt.toolOpt.LibToolShape("HeatingCoil", true);
    }

    if (selectedTool.value.name == "Filter") {
      EvtOpt.toolOpt.LibToolShape("Filter", true);
    }

    if (selectedTool.value.name == "Humidifier") {
      EvtOpt.toolOpt.LibToolShape("Humidifier", true);
    }

    if (selectedTool.value.name == "Humidity") {
      EvtOpt.toolOpt.LibToolShape("Humidity", true);
    }

    if (selectedTool.value.name == "Pressure") {
      EvtOpt.toolOpt.LibToolShape("Pressure", true);
    }

    if (selectedTool.value.name == "Damper") {
      EvtOpt.toolOpt.LibToolShape("Damper", true);
    }

    if (selectedTool.value.name == "ThermalWheel") {
      EvtOpt.toolOpt.LibToolShape("ThermalWheel", true);
    }

    if (selectedTool.value.name == "Enthalpy") {
      EvtOpt.toolOpt.LibToolShape("Enthalpy", true);
    }

    if (selectedTool.value.name == "Flow") {
      EvtOpt.toolOpt.LibToolShape("Flow", true);
    }

    if (selectedTool.value.name == "RoomHumidity") {
      EvtOpt.toolOpt.LibToolShape("RoomHumidity", true);
    }

    if (selectedTool.value.name == "RoomTemperature") {
      EvtOpt.toolOpt.LibToolShape("RoomTemperature", true);
    }

    if (selectedTool.value.name == "Gauge") {
      // EvtOpt.toolOpt.LibToolShape("Gauge", true);
    }

    if (selectedTool.value.name == "Dial") {
      // EvtOpt.toolOpt.LibToolShape("Dial", true);
    }

    if (selectedTool.value.name == "Value") {
      // EvtOpt.toolOpt.LibToolShape("Value", true);
    }

    if (selectedTool.value.name == "Wall") {
      EvtOpt.toolOpt.DrawWall(event);
    }

    // line
    if (selectedTool.value.name == "Line") {
      EvtOpt.toolOpt.ToolLineAct("line", event);
    }

    // if (selectedTool.value.name == "commline") {
    //   EvtOpt.toolOpt.ToolLineAct("commline", event);
    // }

    // if (selectedTool.value.name == "digiline") {
    //   EvtOpt.toolOpt.ToolLineAct("digiline", event);
    // }

    if (selectedTool.value.name == "ArcLine") {
      EvtOpt.toolOpt.ToolLineAct("arcLine", event);
    }

    if (selectedTool.value.name == "SegLine") {
      EvtOpt.toolOpt.ToolLineAct("segLine", event);
    }

    // if (selectedTool.value.name == "arcSegLine") {
    //   EvtOpt.toolOpt.ToolLineAct("arcSegLine", event);
    // }

    if (selectedTool.value.name == "PolyLine") {
      EvtOpt.toolOpt.ToolLineAct("polyLine", event);
    }

    // if (selectedTool.value.name == "polyLineContainer") {
    //   EvtOpt.toolOpt.ToolLineAct("polyLineContainer", event);
    // }

    if (selectedTool.value.name == "G_Circle") {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 9, "G_Circle");
    }

    if (selectedTool.value.name == "G_Rectangle") {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 2, "G_Rectangle");
    }

    if (selectedTool.value.name == "ArrowRight") {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 10, "g_arr_right");
    }

    if (selectedTool.value.name == "ArrowLeft") {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 11, "g_arr_left");
    }

    if (selectedTool.value.name == "ArrowTop") {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 12, "g_arr_top");
    }

    if (selectedTool.value.name == "ArrowBottom") {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 13, "g_arr_bottom");
    }

    if (selectedTool.value.name == "Oval") {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 4, "Oval");
    }

    if (selectedTool.value.name == "Switch") {
      EvtOpt.toolOpt.LibToolShape("SwitchIcon", true);
    }

    if (selectedTool.value.name == "LED") {
      EvtOpt.toolOpt.LibToolShape("Led", true);
    }

    if (selectedTool.value.name == "Text") {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 'textLabel', "Text");
    }

    if (selectedTool.value.name == "Box") {
      EvtOpt.toolOpt.StampShapeFromToolAct(event, 2, "Box");
    }

    if (selectedTool.value.name == "Pointer") {
      EvtOpt.toolOpt.SelectAct(event);
    }

    // New ducts
    if (selectedTool.value.name == "Duct1") {
      EvtOpt.toolOpt.LibToolShape("Duct1", true);
    }
    if (selectedTool.value.name == "Duct2") {
      EvtOpt.toolOpt.LibToolShape("Duct2", true);
    }
    if (selectedTool.value.name == "Duct3") {
      EvtOpt.toolOpt.LibToolShape("Duct3", true);
    }
    if (selectedTool.value.name == "Duct4") {
      EvtOpt.toolOpt.LibToolShape("Duct4", true);
    }
    if (selectedTool.value.name == "Duct5") {
      EvtOpt.toolOpt.LibToolShape("Duct5", true);
    }
    if (selectedTool.value.name == "Duct6") {
      EvtOpt.toolOpt.LibToolShape("Duct6", true);
    }
    if (selectedTool.value.name == "Duct7") {
      EvtOpt.toolOpt.LibToolShape("Duct7", true);
    }
    if (selectedTool.value.name == "Duct8") {
      EvtOpt.toolOpt.LibToolShape("Duct8", true);
    }
    if (selectedTool.value.name == "Duct9") {
      EvtOpt.toolOpt.LibToolShape("Duct9", true);
    }
  }

  BindVueForeignObjectEvent() {
    $("#btn_try_vue_foreignObject").on("pointerdown", (event) => {
      EvtOpt.toolOpt.VueForeignObjectAct(event, PolygonConstant.ShapeTypes.ForeignObject, "Boiler");
    });
  }

  BindSetXEvent() {
    $("#btn_try_x").on("pointerdown", (event) => {
      var xVal = "1.5";
      EvtOpt.toolOpt.SetX(xVal);
    });
  }

  BindSetYEvent() {
    $("#btn_try_y").on("pointerdown", (event) => {
      var yVal = "2.3";
      EvtOpt.toolOpt.SetY(yVal);
    });
  }

  BindSetWidthEvent() {
    $("#btn_try_w").on("pointerdown", (event) => {
      var widthVal = "3.2";
      EvtOpt.toolOpt.SetWidth(widthVal);
    });
  }

  BindSetHeightEvent() {
    $("#btn_try_h").on("pointerdown", (event) => {
      var heightVal = "2.5";
      EvtOpt.toolOpt.SetHeight(heightVal);
    });
  }

  BindAddToLibraryEvent() {
    $("#btn_try_Add_To_Library").on("pointerdown", (event) => {
      EvtOpt.toolOpt.AddToLibraryAct();
    });
  }

  BindLoadLibraryEvent() {
    $("#btn_try_Load_Library").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LoadLibraryAct();
    });
  }

  BindDuct1Event() {
    $("#btn_try_Duct_1").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Duct1", true);
    });
  }

  BindDuct2Event() {
    $("#btn_try_Duct_2").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Duct2", true);
    });
  }

  BindDuct3Event() {
    $("#btn_try_Duct_3").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Duct3", true);
    });
  }

  BindDuct4Event() {
    $("#btn_try_Duct_4").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Duct4", true);
    });
  }

  BindDuct5Event() {
    $("#btn_try_Duct_5").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Duct5", true);
    });
  }

  BindDuct6Event() {
    $("#btn_try_Duct_6").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Duct6", true);
    });
  }

  BindDuct7Event() {
    $("#btn_try_Duct_7").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Duct7", true);
    });
  }

  BindDuct8Event() {
    $("#btn_try_Duct_8").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Duct8", true);
    });
  }

  BindDuct9Event() {
    $("#btn_try_Duct_9").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Duct9", true);
    });
  }

  BindDuct10Event() {
    $("#btn_try_Duct_10").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Duct10", true);
    });
  }

  BindDuct11Event() {
    $("#btn_try_Duct_11").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Duct11", true);
    });
  }

  BindDuct12Event() {
    $("#btn_try_Duct_12").on("pointerdown", (event) => {
      EvtOpt.toolOpt.LibToolShape("Duct12", true);
    });
  }

  BindResetScaleEvent() {
    $("#btn_try_Reset_Scale").on("pointerdown", (event) => {
      EvtOpt.toolOpt.ResetScaleAct(event);
    });
  }

  BindDocumentAreaEvent() {
    $("#document-area").on("pointerdown", (event) => {
      EvtOpt.toolOpt.ClearContextMenu();
    });
  }
}

export default EvtOpt
