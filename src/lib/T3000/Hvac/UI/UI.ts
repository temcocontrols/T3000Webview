
import DocumentHandler from "../Document/DocumentHandler";
import ListManager from "../Document/ListManager";
import * as Utils from '../Hvac.Utils';
import DocumentController from "./DocumentController";

class UI {

  public gDocumentHandler: DocumentHandler;
  public gListManager: ListManager;

  constructor() {
    this.gDocumentHandler = new DocumentHandler();
    this.gListManager = new ListManager();
  }

  Initialize = () => {
    // SDUI.AppSettings.ApplyApplicationSettings();
    // SDUI.AppSettings.ApplyUI();
    // SDUI.BackplaneEditorInitializer.Initialize();
    // SDUI.Commands.MainController.HTMLLoader.ElementLoaded = SDUI.Initializer.InitializeElement;
    // SDUI.Initializer.AttachWindowEvents();
    // SDUI.Resources.BuildWebFonts();
    this.init_document_handler();
    this.init_list_manager();
    // init_business_manager();
    // init_business_manager("FLOORPLAN");
    // window.onkeydown = SDUI.Events.OnKeyDown;
    // window.onkeyup = SDUI.Events.OnKeyUp;
    // window.onkeypress = SDUI.Events.OnKeyPress;

    window.oncontextmenu = function (e) {
      e.preventDefault()
    };


    // SDUI.Resources.KeyboardCommand.prototype.BuildCommands();
    this.SetZoomSlider();
  }

  init_document_handler = () => {

    if (!this.gDocumentHandler) {
      this.gDocumentHandler = new DocumentHandler();
    }

    this.gDocumentHandler.Initialize();
  }

  init_list_manager = () => {

    if (!this.gListManager) {
      this.gListManager = new ListManager();
    }

    this.gListManager.Initialize();
  }


  SetZoomSlider = () => {
  }


  LM_MouseMove = (e) => {
    if (
      e.clientX >= this.gListManager.svgDoc.docInfo.dispX &&
      e.clientY >= this.gListManager.svgDoc.docInfo.dispY &&
      e.clientX < this.gListManager.svgDoc.docInfo.dispX + this.gListManager.svgDoc.docInfo.dispWidth &&
      e.clientY < this.gListManager.svgDoc.docInfo.dispY + this.gListManager.svgDoc.docInfo.dispHeight
    ) {
      var t = this.gListManager.svgDoc.ConvertWindowToDocCoords(e.clientX, e.clientY);
      this.gListManager.ShowXY(!0),
        this.gListManager.UpdateDisplayCoordinates(null, t, null, null)
    } else this.gListManager.ShowXY(!1)
  }


  LM_WorkAreaMouseWheel = (e) => {

    if (e.ctrlKey) {
      Utils.StopPropagationAndDefaults(e);

      const clientX = e.clientX;
      const clientY = e.clientY;
      const docCoords = this.gListManager.svgDoc.ConvertWindowToDocCoords(clientX, clientY);

      let docController = new DocumentController();

      if (e.deltaY > 0) {

        docController.ZoomInandOut(false, true);
      } else if (e.deltaY < 0) {
        docController.ZoomInandOut(true, true);
      }


      const windowCoords = this.gListManager.svgDoc.ConvertDocToWindowCoords(docCoords.x, docCoords.y);
      const offsetX = clientX - windowCoords.x;
      const offsetY = clientY - windowCoords.y;

      const svgArea = document.querySelector('#svgarea');
      const scrollLeft = svgArea.scrollLeft;
      const scrollTop = svgArea.scrollTop;

      this.gDocumentHandler.SetScroll(scrollLeft - offsetX, scrollTop - offsetY);
    }
  }
}

export default UI;
