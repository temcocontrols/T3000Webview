
import DocHandler from "../Document/DocHandler";
import * as Utils from '../Hvac.Utils';

class UI {
  public docHandler: DocHandler;

  constructor() {
  }

  Initialize = () => {
    this.docHandler = new DocHandler();
    this.docHandler.Initialize();

    window.oncontextmenu = function (event) {
      event.preventDefault()
    };

    window.addEventListener("mousemove", this.LM_MouseMove);
    window.addEventListener("resize", this.docHandler.HandleResizeEvent);
    document.getElementById("svg-area").addEventListener("scroll", this.docHandler.HandleScrollEvent);
    document.getElementById("document-area").addEventListener("wheel", this.LM_WorkAreaMouseWheel);
    document.getElementById("svg-area").addEventListener("wheel", this.LM_WorkAreaMouseWheel);

    this.SetZoomSlider();
  }

  SetZoomSlider = () => {
  }

  LM_MouseMove = (event) => {
    const { clientX, clientY } = event;
    const { dispX, dispY, dispWidth, dispHeight } = this.docHandler.svgDoc.docInfo;
    const check = clientX >= dispX && clientY >= dispY && clientX < dispX + dispWidth && clientY < dispY + dispHeight;

    if (check) {
      const docCoords = this.docHandler.svgDoc.ConvertWindowToDocCoords(clientX, clientY);
      this.docHandler.ShowXY(true);
      this.docHandler.UpdateDisplayCoordinates(null, docCoords, null, null);
    } else {
      this.docHandler.ShowXY(true);
    }
  }

  LM_WorkAreaMouseWheel = (event) => {
    if (event.ctrlKey) {
      Utils.StopPropagationAndDefaults(event);

      const clientX = event.clientX;
      const clientY = event.clientY;
      const docCoords = this.docHandler.svgDoc.ConvertWindowToDocCoords(clientX, clientY);

      if (event.deltaY > 0) {
        this.docHandler.ZoomInandOut(false, true);
      }

      if (event.deltaY < 0) {
        this.docHandler.ZoomInandOut(true, true);
      }

      const windowCoords = this.docHandler.svgDoc.ConvertDocToWindowCoords(docCoords.x, docCoords.y);
      const offsetX = clientX - windowCoords.x;
      const offsetY = clientY - windowCoords.y;

      const svgArea = document.getElementById('svg-area');
      const scrollLeft = svgArea.scrollLeft;
      const scrollTop = svgArea.scrollTop;

      this.docHandler.SetScroll(scrollLeft - offsetX, scrollTop - offsetY);
    }
  }
}

export default UI;
