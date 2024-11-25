
import DocumentHandler from "../Document/DocumentHandler";
import ListManager from "../Document/ListManager";

class DocumentController {

  public gDocumentHandler: DocumentHandler;
  public gListManager: ListManager;

  constructor() {
    this.gDocumentHandler = new DocumentHandler();
    this.gListManager = new ListManager();
  }

  ZoomInandOut = (e, t) => {
    var a,
      r = 0.25,
      i = this.gDocumentHandler.GetZoomFactor();
    if (e) {
      if (i >= 4) return;
      (a = Math.ceil(i / r) * r) === i &&
        (a = i + 0.25),
        a > 4 &&
        (a = 4)
    } else {
      if (i <= 0.25) return;
      (a = Math.floor(i / r) * r) === i &&
        (a = i - 0.25),
        a < 0.25 &&
        (a = 0.25)
    }
    this.SetZoomLevel(100 * a, t)
  }

  SetZoomLevel = function (e, t) {








    if (e <= 0 || this.inZoomIdle) {
      return;
    }

    if (this.gListManager) {
      this.gListManager.SetDocumentScale(e / 100, t);
    }









  }
}

export default DocumentController;
