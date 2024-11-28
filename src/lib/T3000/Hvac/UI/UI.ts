
import DocumentHandler from "../Document/DocumentHandler";
import * as Utils from '../Hvac.Utils';

class UI {
  public gDocumentHandler: DocumentHandler;

  constructor() {
  }

  Initialize = () => {
    this.gDocumentHandler = new DocumentHandler();
    this.gDocumentHandler.Initialize();

    window.oncontextmenu = function (e) {
      e.preventDefault()
    };

    window.addEventListener.bind("mousemove", this.LM_MouseMove);

    this.SetZoomSlider();
  }

  SetZoomSlider = () => {
  }

  LM_MouseMove = (e) => {
    if (
      e.clientX >= this.gDocumentHandler.svgDoc.docInfo.dispX &&
      e.clientY >= this.gDocumentHandler.svgDoc.docInfo.dispY &&
      e.clientX < this.gDocumentHandler.svgDoc.docInfo.dispX + this.gDocumentHandler.svgDoc.docInfo.dispWidth &&
      e.clientY < this.gDocumentHandler.svgDoc.docInfo.dispY + this.gDocumentHandler.svgDoc.docInfo.dispHeight
    ) {
      var t = this.gDocumentHandler.svgDoc.ConvertWindowToDocCoords(e.clientX, e.clientY);
      this.gDocumentHandler.ShowXY(!0),
        this.gDocumentHandler.UpdateDisplayCoordinates(null, t, null, null)
    } else this.gDocumentHandler.ShowXY(!1)
  }


  LM_WorkAreaMouseWheel = (e) => {
    if (e.ctrlKey) {
      Utils.StopPropagationAndDefaults(e);

      const clientX = e.clientX;
      const clientY = e.clientY;
      const docCoords = this.gDocumentHandler.svgDoc.ConvertWindowToDocCoords(clientX, clientY);


      if (e.deltaY > 0) {

        this.gDocumentHandler.ZoomInandOut(false, true);
      } else if (e.deltaY < 0) {
        this.gDocumentHandler.ZoomInandOut(true, true);
      }

      const windowCoords = this.gDocumentHandler.svgDoc.ConvertDocToWindowCoords(docCoords.x, docCoords.y);
      const offsetX = clientX - windowCoords.x;
      const offsetY = clientY - windowCoords.y;

      const svgArea = document.getElementById('svgarea');
      const scrollLeft = svgArea.scrollLeft;
      const scrollTop = svgArea.scrollTop;

      this.gDocumentHandler.SetScroll(scrollLeft - offsetX, scrollTop - offsetY);
    }
  }
}

export default UI;