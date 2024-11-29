
import DocHandler from "../Document/DocHandler";
import OptHandler from "../Document/OptHandler";
import * as Utils from '../Hvac.Utils';

class UI {
  public docHandler: DocHandler;
  public optHandler: OptHandler;

  constructor() {
  }

  Initialize = () => {
    this.docHandler = new DocHandler();
    const defaultWorkArea = { svgAreaID: 'svg-area', documentWidth: 1000, documentHeight: 750, documentDPI: 100 };
    this.docHandler.InitializeWorkArea(defaultWorkArea);

    this.optHandler = new OptHandler();
    this.optHandler.svgDoc = this.docHandler.svgDoc;
    this.optHandler.docHandler = this.docHandler;

    this.optHandler.Initialize();
    this.docHandler.optHandler = this.optHandler;

    window.oncontextmenu = function (event) {
      event.preventDefault()
    };

    window.addEventListener("mousemove", this.LM_MouseMove);
    window.addEventListener("resize", this.docHandler.HandleResizeEvent);
    document.getElementById("svg-area").addEventListener("scroll", this.docHandler.HandleScrollEvent);
    document.getElementById("document-area").addEventListener("wheel", this.LM_WorkAreaMouseWheel);
    document.getElementById("svg-area").addEventListener("wheel", this.LM_WorkAreaMouseWheel);

    document.getElementById('svg-area').addEventListener('mousedown', this.LM_WorkAreaDragStart);
    // document.getElementById('svg-area').addEventListener('mousedown', this.optHandler.DrawTest);
    document.getElementById('svg-area').addEventListener('mousemove', this.LM_RubberBandDrag);
    document.getElementById('svg-area').addEventListener('mouseup', this.LM_RubberBandDragEnd);

    /*
    const hRulerElem = document.getElementById(this.docHandler.hRulerAreaID);
    const vRulerElem = document.getElementById(this.docHandler.vRulerAreaID);
    const cRulerElem = document.getElementById(this.docHandler.cRulerAreaID);

    hRulerElem.addEventListener("doubletap", this.RulerTopDoubleClick);
    vRulerElem.addEventListener("doubletap", this.RulerLeftDoubleClick);
    cRulerElem.addEventListener("doubletap", this.RulerCenterDoubleClick);

    hRulerElem.addEventListener("dragstart", this.RulerDragStart);
    vRulerElem.addEventListener("dragstart", this.RulerDragStart);
    cRulerElem.addEventListener("dragstart", this.RulerDragStart);

    hRulerElem.addEventListener("drag", this.RulerTopDrag);
    vRulerElem.addEventListener("drag", this.RulerLeftDrag);
    cRulerElem.addEventListener("drag", this.RulerCenterDrag);

    hRulerElem.addEventListener("dragend", this.RulerDragEnd);
    vRulerElem.addEventListener("dragend", this.RulerDragEnd);
    cRulerElem.addEventListener("dragend", this.RulerDragEnd);
    */

    // document.getElementById("svg-area").addEventListener("mousedown", this.LM_WorkAreaHammerDragStart);
    // document.getElementById("svg-area").addEventListener("click", this.SDJS_LM_WorkAreaHammerPan);
    // document.getElementById("svg-area").addEventListener("mousemove", this.docHandler.MouseStampObjectMove);

    this.SetZoomSlider();
  }

  SetZoomSlider = () => {
  }

  LM_MouseMove = (event) => {
    const { clientX, clientY } = event;
    const { dispX, dispY, dispWidth, dispHeight } = this.optHandler.svgDoc.docInfo;
    const check = clientX >= dispX && clientY >= dispY && clientX < dispX + dispWidth && clientY < dispY + dispHeight;

    if (check) {
      const docCoords = this.docHandler.svgDoc.ConvertWindowToDocCoords(clientX, clientY);
      this.optHandler.ShowXY(true);
      this.optHandler.UpdateDisplayCoordinates(null, docCoords, null, null);
    } else {
      this.optHandler.ShowXY(true);
    }
  }

  LM_WorkAreaMouseWheel = (event) => {
    if (event.ctrlKey) {
      Utils.StopPropagationAndDefaults(event);

      const clientX = event.clientX;
      const clientY = event.clientY;
      const docCoords = this.optHandler.svgDoc.ConvertWindowToDocCoords(clientX, clientY);

      if (event.deltaY > 0) {
        this.docHandler.ZoomInandOut(false, true);
      }

      if (event.deltaY < 0) {
        this.docHandler.ZoomInandOut(true, true);
      }

      const windowCoords = this.optHandler.svgDoc.ConvertDocToWindowCoords(docCoords.x, docCoords.y);
      const offsetX = clientX - windowCoords.x;
      const offsetY = clientY - windowCoords.y;

      const svgArea = document.getElementById('svg-area');
      const scrollLeft = svgArea.scrollLeft;
      const scrollTop = svgArea.scrollTop;

      this.docHandler.SetScroll(scrollLeft - offsetX, scrollTop - offsetY);
    }
  }

  LM_WorkAreaHammerDragStart = (event) => {
    console.log('LM_WorkAreaHammerDragStart');
    const svgArea = document.getElementById("svg-area");
    const offset = svgArea.getBoundingClientRect();
    const clientX = event.clientX - offset.left;
    const clientY = event.clientY - offset.top;
    const clientWidth = svgArea.clientWidth;
    const clientHeight = svgArea.clientHeight;

    this.optHandler.StartRubberBandSelect(event);

    // if (clientX < clientWidth && clientY < clientHeight) {
    //   if (this.docHandler.IsWheelClick(event) || SDUI.Resources.DocumentContext.SpacebarDown) {
    //     if (!gListManager.bTouchPanStarted) {
    //       gListManager.bTouchPanStarted = true;
    //       gListManager.touchPanX = event.gesture.center.clientX;
    //       gListManager.touchPanY = event.gesture.center.clientY;
    //       gListManager.WorkAreaHammer.on("drag", SDJS_LM_WorkAreaHammerPan);
    //       gListManager.WorkAreaHammer.on("dragend", SDJS_LM_WorkAreaHammerPanEnd);
    //       SDJS.Utils.StopPropagationAndDefaults(event);
    //     }
    //     return false;
    //   } else {
    //     if (gListManager.bTouchPanStarted) {
    //       SDJS_LM_WorkAreaHammerPanEnd();
    //     }
    //     SDJS.Utils.StopPropagationAndDefaults(event);
    //     gListManager.SetUIAdaptation(event);
    //     if (gListManager.IsRightClick(event)) {
    //       event.preventDefault();
    //       event.stopPropagation();
    //       return false;
    //     } else {
    //       SDUI.Commands.MainController.Dropdowns.HideAllDropdowns();
    //       gListManager.StartRubberBandSelect(event);
    //       return false;
    //     }
    //   }
    // }
  }

  LM_WorkAreaDragStart = (e) => {

    const svgArea = document.getElementById("svg-area");
    const offset = svgArea.getBoundingClientRect();
    const clientX = e.clientX - offset.left;
    const clientY = e.clientY - offset.top;
    const clientWidth = svgArea.clientWidth;
    const clientHeight = svgArea.clientHeight;

    if (clientX < clientWidth && clientY < clientHeight) {
      this.optHandler.StartRubberBandSelect(e);
    }
  }


  LM_RubberBandDrag = (e) => {
    // Utils.StopPropagationAndDefaults(e);

    if (!this.optHandler.AutoScrollCommon(e, !1, "RubberBandSelectDoAutoScroll"))
      return;

    var a = this.optHandler.svgDoc.ConvertWindowToDocCoords(
      e.clientX,
      e.clientY
    );

    this.optHandler.RubberBandSelectMoveCommon(a.x, a.y);
  }

  LM_RubberBandDragEnd = (e) => {
    // Utils.StopPropagationAndDefaults(e);

    this.optHandler.ResetAutoScrollTimer();
    var t = this.optHandler.theRubberBandFrame;

    if (this.optHandler.theRubberBand != null) {
      this.optHandler.svgOverlayLayer.RemoveElement(this.optHandler.theRubberBand);
    }
    this.optHandler.theRubberBand = null;
    this.optHandler.theRubberBandStartX = 0;
    this.optHandler.theRubberBandStartY = 0;
    this.optHandler.theRubberBandFrame = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }
}

export default UI;
