
import DocHandler from "../Document/DocHandler";
import * as Utils from '../Hvac.Utils';

class UI {
  public docHandler: DocHandler;

  constructor() {
  }

  Initialize = () => {
    this.docHandler = new DocHandler();
    this.docHandler.Initialize();

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
      e.clientX >= this.docHandler.svgDoc.docInfo.dispX &&
      e.clientY >= this.docHandler.svgDoc.docInfo.dispY &&
      e.clientX < this.docHandler.svgDoc.docInfo.dispX + this.docHandler.svgDoc.docInfo.dispWidth &&
      e.clientY < this.docHandler.svgDoc.docInfo.dispY + this.docHandler.svgDoc.docInfo.dispHeight
    ) {
      var t = this.docHandler.svgDoc.ConvertWindowToDocCoords(e.clientX, e.clientY);
      this.docHandler.ShowXY(!0),
        this.docHandler.UpdateDisplayCoordinates(null, t, null, null)
    } else this.docHandler.ShowXY(!1)
  }

  LM_WorkAreaMouseWheel = (e) => {
    if (e.ctrlKey) {
      Utils.StopPropagationAndDefaults(e);

      const clientX = e.clientX;
      const clientY = e.clientY;
      const docCoords = this.docHandler.svgDoc.ConvertWindowToDocCoords(clientX, clientY);


      if (e.deltaY > 0) {

        this.docHandler.ZoomInandOut(false, true);
      } else if (e.deltaY < 0) {
        this.docHandler.ZoomInandOut(true, true);
      }

      const windowCoords = this.docHandler.svgDoc.ConvertDocToWindowCoords(docCoords.x, docCoords.y);
      const offsetX = clientX - windowCoords.x;
      const offsetY = clientY - windowCoords.y;

      const svgArea = document.getElementById('svgarea');
      const scrollLeft = svgArea.scrollLeft;
      const scrollTop = svgArea.scrollTop;

      this.docHandler.SetScroll(scrollLeft - offsetX, scrollTop - offsetY);
    }
  }
}

export default UI;
