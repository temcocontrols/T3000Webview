
import DocumentHandler from "../Document/DocumentHandler";
import ListManager from "../Document/ListManager";


class UI {

  public gDocumentHandler: DocumentHandler;
  public gListManager: ListManager;

  Initialize = () => {
    // SDUI.AppSettings.ApplyApplicationSettings();
    // SDUI.AppSettings.ApplyUI();
    // SDUI.BackplaneEditorInitializer.Initialize();
    // SDUI.Commands.MainController.HTMLLoader.ElementLoaded = SDUI.Initializer.InitializeElement;
    // SDUI.Initializer.AttachWindowEvents();
    // SDUI.Resources.BuildWebFonts();
    this.SDJS_init_document_handler();
    this.SDJS_init_list_manager();
    // SDJS_init_business_manager();
    // SDJS_init_business_manager("FLOORPLAN");
    // window.onkeydown = SDUI.Events.OnKeyDown;
    // window.onkeyup = SDUI.Events.OnKeyUp;
    // window.onkeypress = SDUI.Events.OnKeyPress;

    window.oncontextmenu = function (e) {
      e.preventDefault()
    };

    // SDUI.Resources.KeyboardCommand.prototype.BuildCommands();
    this.SetZoomSlider();
  }

  SDJS_init_document_handler = () => {

    if (!this.gDocumentHandler) {
      this.gDocumentHandler = new DocumentHandler();
    }
  }

  SDJS_init_list_manager = () => {

    if (!this.gListManager) {
      this.gListManager = new ListManager();
      this.gListManager.Initialize();
    }
  }


  SetZoomSlider = () => {
  }


  SDJS_LM_MouseMove = (e) => {
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

}

export default UI;
