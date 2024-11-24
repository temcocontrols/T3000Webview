import gListManager from "./ListManager/ListManager";



const SDJS_LM_WorkAreaMouseWheel = (e) => {

  console.log("SDJS_LM_WorkAreaMouseWheel svgDoc", gListManager.LM.LMModel.svgDoc);

  if (!e.ctrlKey) {
    var t = e.clientX,
      a = e.clientY,
      // r = gListManager.LM.LMModel.svgDoc.ConvertWindowToDocCoords(t, a);
      r = gListManager.svgDoc.ConvertWindowToDocCoords(t, a);
    if (e.deltaY > 0) {
      SDUI.Commands.MainController.Document.ZoomInandOut(false, true);
    } else if (e.deltaY < 0) {
      SDUI.Commands.MainController.Document.ZoomInandOut(true, true);
    }
    SDJS.Utils.StopPropagationAndDefaults(e);
    var i = gListManager.svgDoc.ConvertDocToWindowCoords(r.x, r.y),
      n = t - i.x,
      o = a - i.y,
      s = $("#svgarea"),
      l = s.scrollLeft(),
      S = s.scrollTop();
    gDocumentHandler.SetScroll(l - n, S - o);
  }
};

export default { SDJS_LM_WorkAreaMouseWheel };
