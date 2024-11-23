const SDJS_LM_WorkAreaMouseWheel = (e) => {
  if (!e.ctrlKey) {
    console.log("SDJS_LM_WorkAreaMouseWheel", e);
    var t = e.clientX,
      a = e.clientY,
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
