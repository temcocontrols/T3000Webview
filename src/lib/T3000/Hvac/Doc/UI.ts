
import GPP from '../Data/GlobalData';
import StateManager from '../Data/State/StateManager';
import ObjectStore from '../Data/State/ObjectStore';
import ObjectStoreFactory from '../Data/State/ObjectStoreFactory';
import DocHandler from './DocHandler'
import OptHandler from './OptHandler'
import $ from 'jquery';
import Instance from '../Data/Instance/Instance';
import Shape from '../Data/Instance/Shape';
import Basic from '../Data/Instance/Basic';
import DataOpt from '../Data/DataOpt';
import GlobalData from '../Data/GlobalData';

declare global {

  interface Window {
    documentHandler: any;
    businessManager: any;
  }

  interface SVGElement {
    getTransformToElement(element: SVGElement): DOMMatrix;
  }
}

SVGElement.prototype.getTransformToElement = function (element) {
  const thisCTM = (this as SVGGraphicsElement).getScreenCTM();
  const elementCTM = (element as SVGGraphicsElement).getScreenCTM();
  if (thisCTM && elementCTM) {
    return elementCTM.inverse().multiply(thisCTM);
  }
  throw new Error('getScreenCTM is not supported on this element.');
}

class UI {

  constructor() { }

  InitInstance() {
    Instance.Shape = Shape;
    Instance.Basic = Basic;
  }

  InitDocumentHandler = () => {
    GlobalData.documentHandler = new DocHandler();
  }

  InitListManager = () => {
    GlobalData.optManager = new OptHandler();
    GlobalData.optManager.Initialize()
  }

  InitBusinessManager = (e) => {

  }

  Initialize = () => {
    DataOpt.InitStateAndStore();

    this.InitDocumentHandler();
    this.InitListManager();
    this.InitBusinessManager("FL");

    window.oncontextmenu = function (e) {
      e.preventDefault();
    }

    window.documentHandler = GlobalData.documentHandler;
    window.businessManager = GlobalData.businessManager;

    this.EventTest();
    this.InitInstance();

    // Clipboard.Init();

    DataOpt.InitStoredData()

    GlobalData.optManager.RenderAllSVGObjects();
  }

  EventTest = () => {

    $(document).ready(function () {

      document.getElementById('test_btn_select').addEventListener('click', function () {
        console.log('11111111111111111111111111111111111111')
        new Commands().SD_Select(event)
      });

      document.getElementById('test_btn_try_library').addEventListener('click', function () {
        new Commands().SD_ClickSymbol(event);
        new Commands().SD_DragDropSymbol(event);
      });

      document.getElementById('test_btn_try_line').addEventListener('click', function () {
        console.log('222222222222222222222222222222222222222')
        new Commands().SD_Tool_Line(event)
      });

      document.getElementById('test_btn_try_wall').addEventListener('click', function () {
        console.log('test_btn_try_wall')

        // Interior Wall 4" linethickness="0.33333" Exterior Wall 6 linethickness="0.5"
        // Metric Interior Wall 150mm linethickness="0.15" linethickness="0.2"
        new Commands().SD_Line_SetDefaultWallThickness(event)
      });

      document.getElementById('test_btn_try_Rect').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Rect SED_S_Rect: 2')
        new Commands().SD_StampShapeFromTool(event, 2)
        var shapeType = 2;
      });

      document.getElementById('test_btn_try_Oval').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Oval SED_S_Oval: 4')
        new Commands().SD_StampShapeFromTool(event, 4)
        var shapeType = 8;
      });

      document.getElementById('test_btn_try_Image').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Image SED_S_Image: 1')
        new Commands().SD_StampShapeFromTool(event, 1)
        var shapeType = 3;
      });

      document.getElementById('test_btn_try_Circ').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Circ SED_S_Circ: 9')
        new Commands().SD_StampShapeFromTool(event, 9)
        var shapeType = 5;
      });

      document.getElementById('test_btn_try_Text').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Text SED_S_Text: 0')
        new Commands().SD_StampShapeFromTool(event, 'textLabel')
        var shapeType = 5;
      });

      document.getElementById('test_btn_try_ArrR').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_ArrR SED_S_ArrR: 10')
        new Commands().SD_StampShapeFromTool(event, 10)
        var shapeType = 5;
      });

      document.getElementById('test_btn_try_ArrL').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_ArrL SED_S_ArrL: 11')
        new Commands().SD_StampShapeFromTool(event, 11)
        var shapeType = 5;
      });

      document.getElementById('test_btn_try_ArrT').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_ArrT SED_S_ArrT: 12')
        new Commands().SD_StampShapeFromTool(event, 12)
        var shapeType = 5;
      });

      document.getElementById('test_btn_try_ArrB').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_ArrB SED_S_ArrB: 13')
        new Commands().SD_StampShapeFromTool(event, 13)
        var shapeType = 5;
      });

      document.getElementById('test_btn_try_Roate45').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Roate45 45')
        new Commands().SD_Rotate(event, 45)
        var shapeType = 5;
      });

      document.getElementById('test_btn_try_Roate90').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Roate90 90')
        new Commands().SD_Rotate(event, 90)
        var shapeType = 5;
      });

      document.getElementById('test_btn_try_Align_lefts').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Align_lefts Align_lefts')
        new Commands().SD_Shape_Align("lefts")
      });

      document.getElementById('test_btn_try_Align_centers').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Align_centers Align_rights')
        new Commands().SD_Shape_Align("lefts")
      });

      document.getElementById('test_btn_try_Align_tops').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Align_tops Align_tops')
        new Commands().SD_Shape_Align("tops")
        var shapeType = 5;
      });

      document.getElementById('test_btn_try_Align_middles').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Align_middles Align_middles')
        new Commands().SD_Shape_Align("middles")
        var shapeType = 5;
      });

      document.getElementById('test_btn_try_Align_bottoms').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Align_bottoms Align_bottoms')
        new Commands().SD_Shape_Align("bottoms")
        var shapeType = 5;
      });

      document.getElementById('test_btn_try_Group').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Group Group')
        new Commands().SD_Group(event)
      });

      document.getElementById('test_btn_try_Ungroup').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Ungroup Ungroup')
        new Commands().SD_Ungroup(event)
      });

      document.getElementById('test_btn_try_Flip_Horizontal').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Flip_Horizontal Flip_Horizontal')
        new Commands().SD_Shape_Flip_Horizontal(event)
        var shapeType = 5;
      });

      document.getElementById('test_btn_try_Flip_Vertical').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Flip_Vertical Flip_Horizontal')
        new Commands().SD_Shape_Flip_Vertical(event)
        var shapeType = 5;
      });

      document.getElementById('test_btn_try_Same_Height').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Same_Height Same_Height')
        new Commands().SD_MakeSameSize(event, 1)
      });

      document.getElementById('test_btn_try_Same_Width').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Same_Width Same_Width')
        new Commands().SD_MakeSameSize(event, 2)
      });

      document.getElementById('test_btn_try_Same_Both').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Same_Both Same_Both')
        new Commands().SD_MakeSameSize(event, 3)
      });

      document.getElementById('test_btn_try_BringToFront').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_BringToFront BringToFront')
        new Commands().SD_Shape_BringToFront(event)
        var shapeType = 5;
      });

      document.getElementById('test_btn_try_SendToBack').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_SendToBack SendToBack')
        new Commands().SD_Shape_SendToBack(event)
        var shapeType = 5;
      });

      document.getElementById('test_btn_try_Paste').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Paste Paste')
        new Commands().SD_Paste(event)
      });

      document.getElementById('test_btn_try_Copy').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Copy Copy')
        new Commands().SD_Copy(event)
      });

      document.getElementById('test_btn_try_Cut').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Cut Cut')
        new Commands().SD_Cut(event)
      });

      document.getElementById('test_btn_try_Delete').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Delete Delete')
        new Commands().SD_Delete(event)
      });

      document.getElementById('test_btn_try_Undo').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Undo Undo')
        new Commands().SD_Undo(event)
      });

      document.getElementById('test_btn_try_Redo').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Redo Redo')
        new Commands().SD_Redo(event)
      });

      document.getElementById('test_btn_try_Save').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Save save')
        new Commands().SD_CommitFilePickerSelection(event)
      });

      document.getElementById('test_btn_try_Duplicate').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Duplicate Duplicate')
        new Commands().SD_Duplicate(event)
      });

      document.getElementById('test_btn_try_Clear').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Clear Clear')
        localStorage.clear();
      });

      document.getElementById('test_btn_try_Measure').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_Measure Measure')
        new Commands().SD_MeasureDistance(event)
      });

      document.getElementById('test_btn_try_AreaMeasure').addEventListener('pointerdown', function (e) {
        console.log('test_btn_try_AreaMeasure AreaMeasure')
        new Commands().SD_MeasureArea(event)
      });
    })
  }
}

export default UI
