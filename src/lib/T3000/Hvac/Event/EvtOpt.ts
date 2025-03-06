

import { event } from "jquery";
import ToolOpt from "../Opt/ToolOpt";
import $ from 'jquery'

class EvtOpt {

  static toolOpt = new ToolOpt();

  BuildCtlAction() {
    $(document).ready(() => {

      $("#btn_try_select").bind("click", function () {
        EvtOpt.toolOpt.SelectAct(event)
      });

      $("#btn_try_library").bind("click", function () {
        EvtOpt.toolOpt.ClickSymbolAct(event);
        EvtOpt.toolOpt.DragDropSymbolAct(event);
      });

      $("#btn_try_line").bind("click", function () {
        EvtOpt.toolOpt.ToolLineAct(event)
      });

      $("#btn_try_line1").bind("click", function () {
        EvtOpt.toolOpt.ToolLineAct(event)
      });

      $("#btn_try_wall").bind("click", function () {
        EvtOpt.toolOpt.DrawWall(event)
      });

      $("#btn_try_Rect").bind("click", function () {
        EvtOpt.toolOpt.StampShapeFromToolAct(event, 2)
      });

      $("#btn_try_Oval").bind("click", function () {
        EvtOpt.toolOpt.StampShapeFromToolAct(event, 4)
      });

      $("#btn_try_Image").bind("click", function () {
        EvtOpt.toolOpt.StampShapeFromToolAct(event, 1)
      });

      $("#btn_try_Circ").bind("click", function () {
        EvtOpt.toolOpt.StampShapeFromToolAct(event, 9)
      });

      $("#btn_try_Text").bind("click", function () {
        EvtOpt.toolOpt.StampShapeFromToolAct(event, 'textLabel')
      });

      $("#btn_try_ArrR").bind("click", function () {
        EvtOpt.toolOpt.StampShapeFromToolAct(event, 10)
      });

      $("#btn_try_ArrL").bind("click", function () {
        EvtOpt.toolOpt.StampShapeFromToolAct(event, 11)
      });

      $("#btn_try_ArrT").bind("click", function () {
        EvtOpt.toolOpt.StampShapeFromToolAct(event, 12)
      });

      $("#btn_try_ArrB").bind("click", function () {
        EvtOpt.toolOpt.StampShapeFromToolAct(event, 13)
      });

      $("#btn_try_Roate45").bind("click", function () {
        EvtOpt.toolOpt.RotateAct(event, 45)
      });

      $("#btn_try_Roate90").bind("click", function () {
        EvtOpt.toolOpt.RotateAct(event, 90)
      });

      $("#btn_try_Align_lefts").bind("click", function () {
        EvtOpt.toolOpt.ShapeAlignAct("lefts")
      });

      $("#btn_try_Align_centers").bind("click", function () {
        EvtOpt.toolOpt.ShapeAlignAct("centers")
      });

      $("#btn_try_Align_tops").bind("click", function () {
        EvtOpt.toolOpt.ShapeAlignAct("tops")
      });

      $("#btn_try_Align_middles").bind("click", function () {
        EvtOpt.toolOpt.ShapeAlignAct("middles")
      });

      $("#btn_try_Align_bottoms").bind("click", function () {
        EvtOpt.toolOpt.ShapeAlignAct("bottoms")
      });

      $("#btn_try_group").bind("click", function () {
        EvtOpt.toolOpt.GroupAct(event)
      });

      $("#btn_try_Ungroup").bind("click", function () {
        EvtOpt.toolOpt.UngroupAct(event)
      });

      $("#btn_try_Flip_Horizontal").bind("click", function () {
        EvtOpt.toolOpt.ShapeFlipHorizontalAct(event)
      });

      $("#btn_try_Flip_Vertical").bind("click", function () {
        EvtOpt.toolOpt.ShapeFlipVerticalAct(event)
      });

      $("#btn_try_Same_Height").bind("click", function () {
        EvtOpt.toolOpt.MakeSameSizeAct(event, 1)
      });

      $("#btn_try_Same_Width").bind("click", function () {
        EvtOpt.toolOpt.MakeSameSizeAct(event, 2)
      });

      $("#btn_try_Same_Both").bind("click", function () {
        EvtOpt.toolOpt.MakeSameSizeAct(event, 3)
      });

      $("#btn_try_BringToFront").bind("click", function () {
        EvtOpt.toolOpt.ShapeBringToFrontAct(event)
      });

      $("#btn_try_SendToBack").bind("click", function () {
        EvtOpt.toolOpt.ShapeSendToBackAct(event)
      });

      $("#btn_try_Paste").bind("click", function () {
        EvtOpt.toolOpt.PasteAct(event)
      });

      $("#btn_try_Copy").bind("click", function () {
        EvtOpt.toolOpt.CopyAct(event)
      });

      $("#btn_try_Cut").bind("click", function () {
        EvtOpt.toolOpt.CutAct(event)
      });

      $("#btn_try_Delete").bind("click", function () {
        EvtOpt.toolOpt.DeleteAct(event)
      });

      $("#btn_try_Undo").bind("click", function () {
        EvtOpt.toolOpt.UndoAct(event)
      });

      $("#btn_try_Redo").bind("click", function () {
        EvtOpt.toolOpt.RedoAct(event)
      });

      $("#btn_try_Save").bind("click", function () {
        EvtOpt.toolOpt.CommitFilePickerSelectionAct(event)
      });

      $("#btn_try_Duplicate").bind("click", function () {
        EvtOpt.toolOpt.DuplicateAct(event)
      });

      $("#btn_try_Clear").bind("click", function () {
        localStorage.clear();
      });

      $("#btn_try_Measure").bind("click", function () {
        EvtOpt.toolOpt.MeasureDistanceAct(event)
      });

      $("#btn_try_AreaMeasure").bind("click", function () {
        EvtOpt.toolOpt.MeasureAreaAct(event)
      });
    })
  }
}

export default EvtOpt
