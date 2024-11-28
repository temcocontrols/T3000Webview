
import Document from '../Graphics/Document';
import Models from '../Hvac.Models';
import Hammer from 'hammerjs';
import * as Utils from '../Hvac.Utils';
import ContentHeader from './ContentHeader';
import UI from '../UI/UI';
import Path from '../Graphics/Path';

enum RulerUnits {
  SED_UNone = 0,
  SED_Inches = 1,
  SED_Feet = 2,
  SED_Mm = 3,
  SED_Cm = 4,
  SED_M = 5
}

enum Defines {
  DefaultRulerMajor = 100,
  MetricConv = 2.54,
}

enum ListManagerDefines {
  MetricConv = 2.54,
}

interface DocumentConfig {
  showRulers: boolean;
  showGrid: boolean;
  enableSnap: boolean;
}

interface RulerSettings {
  useInches: boolean;
  majorScale: number;
  units: RulerUnits;
  nTics: number;
  nMid: number;
  nGrid: number;
  originx: number;
  originy: number;
  major: Defines;
  metricConv: Defines;
  dp: number;
  showpixels: boolean;
  fractionaldenominator: number;
}

class DocumentHandler {
  public documentConfig: DocumentConfig
  public workAreaID: string;
  public svgAreaID: string;
  public hRulerAreaID: string;
  public vRulerAreaID: string;
  public cRulerAreaID: string;
  public svgDoc: any;
  public hRulerDoc: any;
  public vRulerDoc: any;
  public rulerVis: boolean;
  public gridVis: boolean;
  public backgroundElem: any;
  public scaleToFit: boolean;
  public scaleToPage: boolean;
  public scrollWidth: number;
  public rulerSettings: RulerSettings;
  public backgroundLayer: string;
  public gridLayer: any;
  public pageDividerLayer: any;
  public hRulerGuide: any;
  public vRulerGuide: any;
  public rulerGuideWinPos: any;
  public rulerGuideScrollTimer: any;
  public rulerInDrag: boolean;
  // public gListManager: any;

  public theSVGDocumentID: string;
  public svgObjectLayer: any;
  public svgOverlayLayer: any;
  public svgHighlightLayer: any;
  public svgCollabLayer: any;
  public MainAppElement: any;
  public WorkAreaElement: any;
  public DocumentElement: any;
  public WorkAreaHammer: any;
  public DocumentElementHammer: any;



  public SVGroot: any;
  public theDragStartX: number;
  public theDragStartY: number;
  public theDragDeltaX: number;
  public theDragDeltaY: number;
  public theDragTargetID: any;
  public theDragTargetBBox: any;
  public theDragGotMove: boolean;
  public theDragGotAutoResizeRight: boolean;
  public theDragGotAutoResizeBottom: boolean;
  public theDragGotAutoResizeOldX: any[];
  public theDragGotAutoResizeOldY: any[];
  public theDrawStartX: number;
  public theDrawStartY: number;
  public theLineDrawStartX: number;
  public theLineDrawStartY: number;
  public LineDrawID: number;
  public LineDrawLineID: number;
  public autoScrollTimerID: number;
  public autoScrollXPos: number;
  public autoScrollYPos: number;
  public bInAutoScroll: boolean;
  public textEntryTimer: any;
  public TopLeftPastePos: any;
  public TopLeftPasteScrollPos: any;
  public theContentHeader: any;

  constructor() {
    // this.gListManager = new ListManager();
    this.documentConfig = { enableSnap: true, showGrid: true, showRulers: true };
  }

  Initialize = () => {
    console.log('DocumentHandler, Initialize');

    this.theSVGDocumentID = 'svgarea';
    this.theDragStartX = 0;
    this.theDragStartY = 0;
    this.theDragDeltaX = 0;
    this.theDragDeltaY = 0;
    this.theDragTargetID = null;
    this.theDragTargetBBox = {};
    this.theDragGotMove = false;
    this.theDragGotAutoResizeRight = false;
    this.theDragGotAutoResizeBottom = false;
    this.theDragGotAutoResizeOldX = [];
    this.theDragGotAutoResizeOldY = [];
    this.theDrawStartX = 0;
    this.theDrawStartY = 0;
    this.theLineDrawStartX = 0;
    this.theLineDrawStartY = 0;
    this.LineDrawID = -1;
    this.LineDrawLineID = -1;
    this.autoScrollTimerID = -1;
    this.autoScrollXPos = 0;
    this.autoScrollYPos = 0;
    this.bInAutoScroll = true;
    this.textEntryTimer = null;
    this.MainAppElement = null;
    this.WorkAreaElement = null;
    this.WorkAreaHammer = null;
    this.svgDoc = null;
    this.svgObjectLayer = null;
    this.svgOverlayLayer = null;
    this.svgHighlightLayer = null;
    this.theContentHeader = new ContentHeader();// this.gListManager.theContentHeader;
    this.InitSVGDocument();
    this.SVGroot = this.svgDoc.svgObj.node;
    this.TopLeftPastePos = { x: 0, y: 0 };
    this.TopLeftPasteScrollPos = { x: 0, y: 0 };
  }

  InitSVGDocument = () => {
    console.log('DocumentHandler, InitSVGDocument');
    this.InitializeWorkArea({ svgAreaID: this.theSVGDocumentID, documentWidth: 1000, documentHeight: 750, documentDPI: 100 });
    this.svgDoc = this.DocObject();
    this.svgObjectLayer = this.svgDoc.AddLayer('svgObjectLayer');
    this.svgDoc.SetDocumentLayer('svgObjectLayer');
    this.svgOverlayLayer = this.svgDoc.AddLayer('svgOverlayLayer');
    this.svgOverlayLayer.ExcludeFromExport(true);
    this.svgHighlightLayer = this.svgDoc.AddLayer('svgHighlightLayer');
    this.svgHighlightLayer.ExcludeFromExport(true);
    this.svgCollabLayer = this.svgDoc.AddLayer('svgCollabLayer');
    this.svgCollabLayer.ExcludeFromExport(true);
    this.svgCollabLayer.AllowScaling(false);
    this.MainAppElement = document.getElementById('mainApp');
    this.WorkAreaElement = document.getElementById('svgarea');
    this.DocumentElement = document.getElementById('document-area');
    this.WorkAreaHammer = new Hammer(this.WorkAreaElement);
    this.DocumentElementHammer = new Hammer(this.DocumentElement);
  }

  InitializeWorkArea = (workArea) => {
    console.log('DocumentHandler, InitializeWorkArea 1', workArea);
    this.workAreaID = workArea.workAreaID || 'document-area';
    this.svgAreaID = workArea.svgAreaID || 'svgarea';
    this.hRulerAreaID = workArea.hRulerAreaID || 'h-ruler';
    this.vRulerAreaID = workArea.vRulerAreaID || 'v-ruler';
    this.cRulerAreaID = workArea.cRulerAreaID || 'c-ruler';
    this.svgDoc = null;
    this.hRulerDoc = null;
    this.vRulerDoc = null;
    this.rulerVis = true;
    this.gridVis = true;
    this.gridLayer = "_DOCGRID";
    this.pageDividerLayer = "_DOCPAGEDIVIDER";
    this.backgroundLayer = "_BACKGROUND";
    this.backgroundElem = null;
    this.scaleToFit = false;
    this.scaleToPage = false;
    this.scrollWidth = 0;

    window.addEventListener("resize", this.HandleResizeEvent);
    document.getElementById(this.svgAreaID).addEventListener("scroll", this.HandleScrollEvent);

    this.UpdateWorkArea();
    this.InitRulerSettings();
    this.UpdateRulerVisibility();
    this.InitSVGArea(workArea);
    this.UpdateGridVisibility();
    this.SetupRulers();
    this.UpdateGrid();
    this.UpdateWorkArea();
  }

  InitSVGArea = (config) => {
    this.svgDoc = this.svgDoc || new Document(this.svgAreaID, []);

    const backgroundLayer = this.svgDoc.AddLayer(this.backgroundLayer);
    this.backgroundElem = this.svgDoc.CreateShape(Models.CreateShapeType.RECT);
    backgroundLayer.AddElement(this.backgroundElem);
    this.backgroundElem.SetPos(0, 0);
    this.backgroundElem.SetStrokeWidth(0);
    this.backgroundElem.SetStrokeColor("none");
    this.backgroundElem.SetFillColor("none");
    this.backgroundElem.ExcludeFromExport(true);
    backgroundLayer.SetCustomAttribute("hvac-background", "1");

    const gridLayer = this.svgDoc.AddLayer(this.gridLayer);
    gridLayer.AllowScaling(false);
    gridLayer.ExcludeFromExport(true);
    gridLayer.SetCustomAttribute("hvac-grid", "1");

    const pageDividerLayer = this.svgDoc.AddLayer(this.pageDividerLayer);
    pageDividerLayer.AllowScaling(false);
    pageDividerLayer.ExcludeFromExport(true);

    if (Array.isArray(config.layers)) {
      config.layers.forEach(layer => {
        this.svgDoc.AddLayer(layer);
      });
    }

    if (config.documentWidth && config.documentHeight) {
      this.svgDoc.SetDocumentSize(config.documentWidth, config.documentHeight);
    }

    if (config.documentDPI) {
      this.svgDoc.SetDocumentDPI(config.documentDPI);
    }

    this.backgroundElem.SetSize(this.svgDoc.docInfo.docWidth, this.svgDoc.docInfo.docHeight);
  }

  HandleResizeEvent = () => {
    console.log('HandleResizeEvent');
    this.UpdateWorkArea();
  }

  GetWorkAreaSize = () => {
    const workAreaElem = document.getElementById(this.workAreaID);
    return {
      width: workAreaElem.clientWidth,
      height: workAreaElem.clientHeight
    }
  }

  UpdateDocumentScale = () => {
    // Reset all svg items
  }

  IdleZoomUI = () => {
    this.UpdateDocumentScale()
  }

  GetScrollBarSize = () => {
    const outerDiv = document.createElement('div');
    outerDiv.style.width = '50px';
    outerDiv.style.height = '50px';
    outerDiv.style.overflow = 'auto';

    const innerDiv = document.createElement('div');
    outerDiv.appendChild(innerDiv);
    document.body.appendChild(outerDiv);

    const scrollbarWidth = outerDiv.offsetWidth - innerDiv.clientWidth;
    document.body.removeChild(outerDiv);

    return scrollbarWidth;
  }

  UpdateWorkArea = () => {
    var e, t, a, r, i;
    var n = this.documentConfig.showRulers;
    var o = this.GetWorkAreaSize();
    var s = document.getElementById(this.vRulerAreaID).clientWidth;
    var l = document.getElementById(this.hRulerAreaID).clientHeight;
    var S = { width: 0, height: 0, x: 0, y: 0 };
    var c = !1;
    var u = !1;
    this.scrollWidth || (this.scrollWidth = this.GetScrollBarSize());
    e = {
      x: 0,
      y: 0,
      width: o.width,
      height: o.height
    };
    n && (e.x += s,
      e.width -= s,
      e.y += l,
      e.height -= l);
    this.svgDoc ? this.scaleToFit ? this.bInAutoScroll ? t = {
      width: (a = this.svgDoc.GetWorkArea()).docScreenWidth,
      height: a.docScreenHeight
    } : e.width > 0 && e.height > 0 ? (t = {
      width: (a = this.svgDoc.CalcScaleToFit(e.width - 20, e.height - 20)).width,
      height: a.height
    },
      this.svgDoc.docInfo.docScale != a.scale && (this.svgDoc.SetDocumentScale(a.scale),
        this.UpdateGrid(),
        this.ResetRulers())) : t = {
          width: (a = this.svgDoc.GetWorkArea()).docScreenWidth,
          height: a.docScreenHeight
        } : this.scaleToPage && e.width > 0 && e.height > 0 ? (r = this.theContentHeader.Page.papersize.x - (this.theContentHeader.Page.margins.left + this.theContentHeader.Page.margins.right),
          i = this.theContentHeader.Page.papersize.y - (this.theContentHeader.Page.margins.top + this.theContentHeader.Page.margins.bottom),
          t = {
            width: (a = this.svgDoc.CalcScaleToFit(e.width - 20, e.height - 20, r, i)).width,
            height: a.height
          },
          this.bInAutoScroll || this.svgDoc.docInfo.docScale != a.scale && (this.svgDoc.SetDocumentScale(a.scale),
            this.UpdateGrid(),
            this.ResetRulers())) : t = {
              width: (a = this.svgDoc.GetWorkArea()).docScreenWidth,
              height: a.docScreenHeight
            } : t = {
              width: e.width,
              height: e.height
            },
      S.width = Math.min(e.width, t.width),
      S.height = Math.min(e.height, t.height),
      S.width < t.width && (c = !0,
        S.height += this.scrollWidth,
        S.height > e.height && (S.height = e.height,
          u = !0)),
      S.height < t.height && (u = !0,
        S.width += this.scrollWidth,
        S.width > e.width && (S.width = e.width,
          c = !0)),
      S.x = e.x + (e.width - S.width) / 2,
      S.y = e.y + (e.height - S.height) / 2,
      document.getElementById(this.svgAreaID).style.left = S.x + "px";
    document.getElementById(this.svgAreaID).style.top = S.y + "px";
    document.getElementById(this.svgAreaID).style.width = S.width + "px";
    document.getElementById(this.svgAreaID).style.height = S.height + "px";
    n && (
      document.getElementById(this.hRulerAreaID).style.left = S.x + "px",
      document.getElementById(this.hRulerAreaID).style.top = (S.y - l) + "px",
      document.getElementById(this.hRulerAreaID).style.width = S.width + "px",
      document.getElementById(this.hRulerAreaID).style.height = l + "px",
      document.getElementById(this.vRulerAreaID).style.left = (S.x - s) + "px",
      document.getElementById(this.vRulerAreaID).style.top = S.y + "px",
      document.getElementById(this.vRulerAreaID).style.width = s + "px",
      document.getElementById(this.vRulerAreaID).style.height = S.height + "px",
      document.getElementById(this.cRulerAreaID).style.left = (S.x - s) + "px",
      document.getElementById(this.cRulerAreaID).style.top = (S.y - l) + "px")
    document.getElementById(this.svgAreaID).style.overflowX = c ? "scroll" : "hidden";
    document.getElementById(this.svgAreaID).style.overflowY = u ? "scroll" : "hidden";
    this.svgDoc && (this.svgDoc.CalcWorkArea(),
      this.AdjustScroll(),
      this.svgDoc.ApplyDocumentTransform(true))
  }

  AdjustScroll = (scrollX?: number, scrollY?: number) => {
    var workArea = this.svgDoc.GetWorkArea();
    var newScrollX = Math.min(scrollY !== undefined ? scrollX : workArea.scrollX, workArea.maxScrollX);
    var newScrollY = Math.min(scrollY !== undefined ? scrollY : workArea.scrollY, workArea.maxScrollY);
    document.getElementById(this.svgAreaID).scrollLeft = newScrollX;
    document.getElementById(this.svgAreaID).scrollTop = newScrollY;
    this.svgDoc.CalcWorkArea();
    this.SyncRulers();
  }

  HandleScrollEvent = () => {
    console.log('HandleScrollEvent');
    var e = this.svgDoc.GetWorkArea();
    var t = e.scrollX;
    var a = e.scrollY;
    this.svgDoc.CalcWorkArea();
    this.SyncRulers();
    var r = t - (e = this.svgDoc.GetWorkArea()).scrollX;
    var i = a - e.scrollY;
  }

  InitRulerSettings = () => {
    this.rulerSettings = {
      useInches: true,
      majorScale: 1,
      units: RulerUnits.SED_Inches,
      nTics: 12,
      nMid: 1,
      nGrid: 12,
      originx: 0,
      originy: 0,
      major: Defines.DefaultRulerMajor,
      metricConv: Defines.MetricConv,
      dp: 2,
      showpixels: false,
      fractionaldenominator: 1
    };
  }

  UpdateRulerVisibility = () => {
    if (this.documentConfig.showRulers === this.rulerVis) {
      return false;
    }

    if (this.documentConfig.showRulers) {
      document.querySelector(this.hRulerAreaID).setAttribute("visibility", "visible");
      document.querySelector(this.vRulerAreaID).setAttribute("visibility", "visible");
      document.querySelector(this.cRulerAreaID).setAttribute("visibility", "visible");
      this.ShowCoordinates(true);
    } else {
      document.querySelector(this.hRulerAreaID).setAttribute("visibility", "hidden");
      document.querySelector(this.vRulerAreaID).setAttribute("visibility", "hidden");
      document.querySelector(this.cRulerAreaID).setAttribute("visibility", "hidden");
      this.ShowCoordinates(false);
    }

    this.UpdateWorkArea();
    this.rulerVis = this.documentConfig.showRulers;
    return true;
  }

  ShowCoordinates = (show: boolean) => {
    console.log('ShowCoordinates');
  }

  IsRightClick = (e) => {
    let isRightClick = false;

    if (e.gesture) {
      e = e.gesture.srcEvent;
    }

    if (e instanceof MouseEvent) {
      isRightClick = (e.which === 3 || (e.ctrlKey && e.metaKey));
    } else if ('onpointerdown' in window && e instanceof PointerEvent) {
      isRightClick = (e.which === 3);
    }

    return isRightClick;
  }

  Point = (e, t) => {
    return { x: e || 0, y: t || 0 };
  }

  UpdateGridVisibility = () => {
    const gridLayer = this.svgDoc ? this.svgDoc.GetLayer(this.gridLayer) : null;
    if (!gridLayer || this.documentConfig.showGrid === this.gridVis) {
      return false;
    }
    gridLayer.SetVisible(this.documentConfig.showGrid);
    this.gridVis = this.documentConfig.showGrid;
    return true;
  }

  SetupRulers = () => {
    this.hRulerDoc = this.hRulerDoc || new Document(this.hRulerAreaID, []);
    this.vRulerDoc = this.vRulerDoc || new Document(this.vRulerAreaID, []);

    this.hRulerGuide = null;
    this.vRulerGuide = null;
    this.rulerGuideWinPos = { x: 0, y: 0 };
    this.rulerGuideScrollTimer = null;
    this.rulerInDrag = false;

    // if (!this.IsReadOnly()) {
    //   const hRulerElem = document.getElementById(this.hRulerAreaID);
    //   const vRulerElem = document.getElementById(this.vRulerAreaID);
    //   const cRulerElem = document.getElementById(this.cRulerAreaID);

    //   const hammerH = new Hammer(hRulerElem);
    //   const hammerV = new Hammer(vRulerElem);
    //   const hammerC = new Hammer(cRulerElem);

    //   hammerH.on("doubletap", this.RulerTopDoubleClick);
    //   hammerV.on("doubletap", this.RulerLeftDoubleClick);
    //   hammerC.on("doubletap", this.RulerCenterDoubleClick);

    //   hammerH.on("dragstart", this.RulerDragStart);
    //   hammerV.on("dragstart", this.RulerDragStart);
    //   hammerC.on("dragstart", this.RulerDragStart);

    //   hammerH.on("drag", this.RulerTopDrag);
    //   hammerV.on("drag", this.RulerLeftDrag);
    //   hammerC.on("drag", this.RulerCenterDrag);

    //   hammerH.on("dragend", this.RulerDragEnd);
    //   hammerV.on("dragend", this.RulerDragEnd);
    //   hammerC.on("dragend", this.RulerDragEnd);
    // }

    this.ResetRulers();
  }

  RulerDragEnd = (e) => {
    Utils.StopPropagationAndDefaults(e);
    this.RulerEndGuides();
  }

  RulerCenterDrag = (e) => {
    if (Utils.StopPropagationAndDefaults(e), this.gListManager.IsCtrlClick(e)) {
      Utils.StopPropagationAndDefaults(e);
      this.RulerHandleDoubleClick(e, true, true);
    } else {
      this.RulerDragGuides(e, true, true);
    }
  }

  RulerTopDoubleClick = (e) => {
    Utils.StopPropagationAndDefaults(e);
    this.RulerHandleDoubleClick(e, false, true);
  }

  RulerLeftDoubleClick = (e) => {
    Utils.StopPropagationAndDefaults(e);
    this.RulerHandleDoubleClick(e, true, false);
  }

  RulerCenterDoubleClick = (e) => {
    Utils.StopPropagationAndDefaults(e);
    this.RulerHandleDoubleClick(e, true, true);
  }

  RulerDragStart = (e) => {
    if (!this.IsReadOnly()) {
      if (this.IsRightClick(e)) {
        Utils.StopPropagationAndDefaults(e);
        return;
      }
      this.rulerInDrag = true;
    }
  }

  ShowXY = function (e) {
    this.documentConfig.showRulers = e;
  }

  IsCtrlClick = (e) => {
    let isCtrlClick = false;

    if (e instanceof MouseEvent) {
      isCtrlClick = e.ctrlKey;
    } else if ('onpointerdown' in window && e instanceof PointerEvent) {
      isCtrlClick = e.ctrlKey;
    }

    return isCtrlClick;
  }

  RulerTopDrag = (e) => {
    if (this.IsCtrlClick(e)) {
      Utils.StopPropagationAndDefaults(e);
      this.RulerHandleDoubleClick(e, false, true);
      this.RulerDragGuides(e, false, true);
    }
  }

  RulerLeftDrag = (e) => {
    if (Utils.StopPropagationAndDefaults(e), this.IsCtrlClick(e)) {
      Utils.StopPropagationAndDefaults(e);
      this.RulerHandleDoubleClick(e, true, false);
      return;
    }
    this.RulerDragGuides(e, true, false);
  }


  RulerEndGuides = () => {
    if (this.rulerGuideScrollTimer) {
      clearInterval(this.rulerGuideScrollTimer);
      this.rulerGuideScrollTimer = null;
    }

    if (this.hRulerGuide) {
      this.svgOverlayLayer.RemoveElement(this.hRulerGuide);
      this.hRulerGuide = null;
    }

    if (this.vRulerGuide) {
      this.svgOverlayLayer.RemoveElement(this.vRulerGuide);
      this.vRulerGuide = null;
    }

    this.rulerInDrag = false;
  }

  RulerDragGuides = (e, t, a) => {
    const workArea = this.svgDoc.GetWorkArea();
    const scale = 1 / workArea.docScale;
    const pattern = `${4 * scale},${2 * scale}`;

    if (this.rulerInDrag) {
      const shouldEndGuides =
        (this.hRulerGuide && !a) ||
        (this.vRulerGuide && !t) ||
        (a && !this.hRulerGuide) ||
        (t && !this.vRulerGuide);

      if (shouldEndGuides) {
        this.RulerEndGuides();
        this.rulerInDrag = true;
      }

      if (t && !this.hRulerGuide) {
        this.hRulerGuide = this.svgDoc.CreateShape(Models.CreateShapeType.LINE);
        this.hRulerGuide.SetFillColor('none');
        this.hRulerGuide.SetStrokeColor('black');
        this.hRulerGuide.SetStrokeWidth(scale);
        this.hRulerGuide.SetStrokePattern(pattern);
        this.svgOverlayLayer.AddElement(this.hRulerGuide);
      }

      if (a && !this.vRulerGuide) {
        this.vRulerGuide = this.svgDoc.CreateShape(Models.CreateShapeType.LINE);
        this.vRulerGuide.SetFillColor('none');
        this.vRulerGuide.SetStrokeColor('black');
        this.vRulerGuide.SetStrokeWidth(scale);
        this.vRulerGuide.SetStrokePattern(pattern);
        this.svgOverlayLayer.AddElement(this.vRulerGuide);
      }

      this.rulerGuideWinPos.x = e.gesture.center.clientX;
      this.rulerGuideWinPos.y = e.gesture.center.clientY;

      if (!a) {
        this.rulerGuideWinPos.x = workArea.dispX + workArea.dispWidth / 2;
      }

      if (!t) {
        this.rulerGuideWinPos.y = workArea.dispY + workArea.dispHeight / 2;
      }

      this.RulerDrawGuides();

      if (!this.rulerGuideScrollTimer && (!t || !a || (this.rulerGuideWinPos.x > workArea.dispX && this.rulerGuideWinPos.y > workArea.dispY))) {
        this.rulerGuideScrollTimer = setInterval(() => {
          this.RulerAutoScrollGuides();
        }, 100);
      }
    }
  }

  RulerAutoScrollGuides = () => {
    const workArea = this.svgDoc.GetWorkArea();
    let shouldScroll = false;
    const coords = this.svgDoc.ConvertWindowToDocCoords(this.rulerGuideWinPos.x, this.rulerGuideWinPos.y);

    if (
      this.rulerGuideWinPos.x < workArea.dispX ||
      this.rulerGuideWinPos.x > workArea.dispX + workArea.dispWidth ||
      this.rulerGuideWinPos.y < workArea.dispY ||
      this.rulerGuideWinPos.y > workArea.dispY + workArea.dispHeight
    ) {
      shouldScroll = true;
    }

    if (shouldScroll) {
      this.ScrollToPosition(coords.x, coords.y);
      this.RulerDrawGuides();
    }
  }

  ScrollToPosition = (e, t) => {
    var scrollOffset = this.svgDoc.CalcScrollToVisible(e, t);
    if (scrollOffset) {
      this.AdjustScroll(scrollOffset.xOff, scrollOffset.yOff);
    }
  }

  SyncRulers = function () {
    const scrollLeft = document.getElementById(this.svgAreaID).scrollLeft;
    const scrollTop = document.getElementById(this.svgAreaID).scrollTop;
    document.getElementById(this.hRulerAreaID).scrollLeft = scrollLeft;
    document.getElementById(this.vRulerAreaID).scrollTop = scrollTop;
  }


  SnapToGrid = (e) => {
    const workArea = this.svgDoc.GetWorkArea();
    let scale = 1;
    let unitConversion = this.rulerSettings.useInches ? 1 : ListManagerDefines.MetricConv;
    let scaledRuler = this.SD_GetScaledRuler(unitConversion);

    let snappedCoords = { x: e.x, y: e.y };
    let majorUnit = this.rulerSettings.major / unitConversion;
    let gridSpacing = this.rulerSettings.nGrid * scaledRuler;

    let xMajorUnit = Math.floor(snappedCoords.x / majorUnit);
    let xOffset = xMajorUnit * majorUnit;
    snappedCoords.x -= xOffset;
    let xGridUnit = Math.round(snappedCoords.x / gridSpacing);
    snappedCoords.x = xOffset + xGridUnit * gridSpacing;

    let yMajorUnit = Math.floor(snappedCoords.y / majorUnit);
    let yOffset = yMajorUnit * majorUnit;
    snappedCoords.y -= yOffset;
    let yGridUnit = Math.round(snappedCoords.y / gridSpacing);
    snappedCoords.y = yOffset + yGridUnit * gridSpacing;

    return snappedCoords;
  }

  RulerDrawGuides = () => {
    const workArea = this.svgDoc.GetWorkArea();
    let coords = this.svgDoc.ConvertWindowToDocCoords(this.rulerGuideWinPos.x, this.rulerGuideWinPos.y);

    if (this.documentConfig.enableSnap) {
      coords = this.SnapToGrid(coords);
    }

    if (this.vRulerGuide) {
      if (coords.x < workArea.docVisX) {
        coords.x = workArea.docVisX;
      } else if (coords.x > workArea.docVisX + workArea.docVisWidth) {
        coords.x = workArea.docVisX + workArea.docVisWidth;
      }
      this.vRulerGuide.SetPoints(coords.x, 0, coords.x, workArea.docHeight);
    }

    if (this.hRulerGuide) {
      if (coords.y < workArea.docVisY) {
        coords.y = workArea.docVisY;
      } else if (coords.y > workArea.docVisY + workArea.docVisHeight) {
        coords.y = workArea.docVisY + workArea.docVisHeight;
      }
      this.hRulerGuide.SetPoints(0, coords.y, workArea.docWidth, coords.y);
    }
  }


  RulerHandleDoubleClick = (e, t, a) => {
    console.log('RulerHandleDoubleClick', e, t, a);
    if (!this.IsRightClick(e)) {
      const origin = {
        originx: this.rulerSettings.originx,
        originy: this.rulerSettings.originy
      };

      const coords = this.svgDoc.ConvertWindowToDocCoords(e.center.clientX, e.center.clientY);
      this.svgDoc.GetWorkArea();
      this.rulerInDrag = false;

      if (!this.IsReadOnly()) {
        if (t && a) {
          origin.originx = 0;
          origin.originy = 0;
        } else if (a) {
          origin.originx = coords.x / this.rulerSettings.major;
          if (!this.rulerSettings.useInches) {
            origin.originx *= ListManagerDefines.MetricConv;
          }
        } else if (t) {
          origin.originy = coords.y / this.rulerSettings.major;
          if (!this.rulerSettings.useInches) {
            origin.originy *= ListManagerDefines.MetricConv;
          }
        } else {
          return;
        }

        this.SetRulers(origin, null);
        this.ShowCoordinates(true);

        // const selectedObject = this.GetObjectPtr(this.gListManager.theSelectedListBlockID, false);
        // this.gListManager.UpdateSelectionAttributes(selectedObject);
      }
    }
  }

  SetRulers = (e, t) => {
    if (e) {
      this.rulerSettings.useInches = e.useInches !== undefined ? e.useInches : this.rulerSettings.useInches;
      this.rulerSettings.units = e.units !== undefined ? e.units : this.rulerSettings.units;
      this.rulerSettings.major = e.major !== undefined ? e.major : this.rulerSettings.major;
      this.rulerSettings.majorScale = e.majorScale !== undefined ? e.majorScale : this.rulerSettings.majorScale;
      this.rulerSettings.nTics = e.nTics !== undefined ? e.nTics : this.rulerSettings.nTics;
      this.rulerSettings.nMid = e.nMid !== undefined ? e.nMid : this.rulerSettings.nMid;
      this.rulerSettings.nGrid = e.nGrid !== undefined ? e.nGrid : this.rulerSettings.nGrid;
      this.rulerSettings.originx = e.originx !== undefined ? e.originx : this.rulerSettings.originx;
      this.rulerSettings.originy = e.originy !== undefined ? e.originy : this.rulerSettings.originy;
      this.rulerSettings.dp = e.dp !== undefined ? e.dp : this.rulerSettings.dp;
      this.rulerSettings.fractionaldenominator = e.fractionaldenominator !== undefined ? e.fractionaldenominator : this.rulerSettings.fractionaldenominator;
      if (e.showpixels !== null) {
        this.rulerSettings.showpixels = e.showpixels;
      }
      if (!t) {
        // const sdp = this.gListManager.GetObjectPtr(this.gListManager.theSEDSessionBlockID, true);
        // sdp.rulerSettings = Utils.DeepCopy(this.rulerSettings);
      }
      this.ResetRulers();
      this.UpdateGrid();
      // this.UpdatePageDivider();
    }
  }

  ResetRulers = function () {
    const workArea = this.svgDoc.GetWorkArea();
    const vRulerWidth = document.getElementById(this.vRulerAreaID).clientWidth;
    const hRulerHeight = document.getElementById(this.hRulerAreaID).clientHeight;

    this.hRulerDoc.SetDocumentSize(workArea.docScreenWidth + 100, hRulerHeight);
    this.vRulerDoc.SetDocumentSize(vRulerWidth, workArea.docScreenHeight + 100);

    this.hRulerDoc.RemoveAll();
    this.vRulerDoc.RemoveAll();

    this.SetRulerContent(this.hRulerDoc, true);
    this.SetRulerContent(this.vRulerDoc, false);
  }

  IsReadOnly = () => {
    return false;//SDUI.AppSettings.ReadOnly
  }

  SD_GetScaledRuler = (scale: number): number => {
    let docScale = Math.floor(this.svgDoc.docInfo.docScale);
    if (docScale === 0) {
      docScale = Math.floor(1 / this.svgDoc.docInfo.docScale);
      if (docScale > 1) {
        scale /= docScale;
      }
    } else if (docScale > 1) {
      scale *= docScale;
    }
    return scale;
  }

  UpdateGrid = function () {
    const workArea = this.svgDoc.GetWorkArea();
    const gridLayer = this.svgDoc.GetLayer(this.gridLayer);
    const scale = 1;

    if (!gridLayer) { return }

    const scaledRuler = this.SD_GetScaledRuler(scale);
    gridLayer.RemoveAll();

    const majorGridPath = this.svgDoc.CreateShape(Models.CreateShapeType.PATH);
    const minorGridPath = this.svgDoc.CreateShape(Models.CreateShapeType.PATH);

    const unitConversion = this.rulerSettings.useInches ? 1 : Defines.MetricConv;
    const majorUnit = this.rulerSettings.major / unitConversion;
    const gridSpacing = this.rulerSettings.nGrid * scaledRuler;

    const pageWidth = this.theContentHeader.Page.papersize.x - (this.theContentHeader.Page.margins.left + this.theContentHeader.Page.margins.right) / 2;
    const pageHeight = this.theContentHeader.Page.papersize.y - (this.theContentHeader.Page.margins.top + this.theContentHeader.Page.margins.bottom) / 2;

    const docWidth = Utils.RoundCoordLP(workArea.docScreenWidth + 2 * pageWidth * workArea.docToScreenScale);
    const docHeight = Utils.RoundCoordLP(workArea.docScreenHeight + 2 * pageHeight * workArea.docToScreenScale);

    const startX = -Utils.RoundCoordLP(pageWidth * workArea.docToScreenScale);
    const endX = startX + docWidth;
    const startY = -Utils.RoundCoordLP(pageHeight * workArea.docToScreenScale);
    const endY = startY + docHeight;

    let originX = this.rulerSettings.originx - Math.floor(this.rulerSettings.originx);
    if (originX) originX -= 1;
    originX *= majorUnit;

    let originY = this.rulerSettings.originy - Math.floor(this.rulerSettings.originy);
    if (originY) originY -= 1;
    originY *= majorUnit;

    let majorGridPathData = '';
    let minorGridPathData = '';

    for (let x = -Math.ceil(pageWidth / majorUnit); ; x++) {
      const posX = originX + x * this.rulerSettings.major / unitConversion;
      const coordX = Utils.RoundCoordLP(posX * workArea.docToScreenScale);
      if (coordX > endX) break;

      majorGridPathData += `M${coordX},${startY}v${docHeight}`;

      for (let i = 1; i < gridSpacing; i++) {
        const minorPosX = posX + i * (majorUnit / gridSpacing);
        const minorCoordX = Utils.RoundCoordLP(minorPosX * workArea.docToScreenScale);
        if (minorCoordX > endX) break;

        minorGridPathData += `M${minorCoordX},${startY}v${docHeight}`;
      }
    }

    for (let y = -Math.ceil(pageHeight / majorUnit); ; y++) {
      const posY = originY + y * this.rulerSettings.major / unitConversion;
      const coordY = Utils.RoundCoordLP(posY * workArea.docToScreenScale);
      if (coordY > endY) break;

      majorGridPathData += `M${startX},${coordY}h${docWidth}`;

      for (let i = 1; i < gridSpacing; i++) {
        const minorPosY = posY + i * (majorUnit / gridSpacing);
        const minorCoordY = Utils.RoundCoordLP(minorPosY * workArea.docToScreenScale);
        if (minorCoordY > endY) break;

        minorGridPathData += `M${startX},${minorCoordY}h${docWidth}`;
      }
    }

    majorGridPath.SetPath(majorGridPathData);
    minorGridPath.SetPath(minorGridPathData);

    majorGridPath.SetFillColor('none');
    majorGridPath.SetStrokeColor('#000');
    majorGridPath.SetStrokeOpacity('.4');
    majorGridPath.SetStrokeWidth('.5');

    minorGridPath.SetFillColor('none');
    minorGridPath.SetStrokeColor('#000');
    minorGridPath.SetStrokeOpacity('.2');
    minorGridPath.SetStrokeWidth('.5');

    gridLayer.AddElement(minorGridPath);
    gridLayer.AddElement(majorGridPath);
    gridLayer.SetEventBehavior(Models.EventBehavior.NONE);
  }

  UpdatePageDivider = () => {
    const workArea = this.svgDoc.GetWorkArea();
    const pageDividerLayer = this.svgDoc.GetLayer(this.pageDividerLayer);

    if (pageDividerLayer) {
      pageDividerLayer.RemoveAll();

      const path = this.svgDoc.CreateShape(Models.CreateShapeType.PATH);
      let pathData = '';

      const pageSize = this.theContentHeader.Page.papersize;
      const margins = this.theContentHeader.Page.margins;

      if (pageSize.x - (margins.left + margins.right) <= 0) {
        margins.left = 50;
        margins.right = 50;
      }

      if (pageSize.y - (margins.top + margins.bottom) <= 0) {
        margins.top = 50;
        margins.bottom = 50;
      }

      const pageWidth = (pageSize.x - (margins.left + margins.right)) * workArea.docToScreenScale;
      const pageHeight = (pageSize.y - (margins.top + margins.bottom)) * workArea.docToScreenScale;

      let currentX = pageWidth;
      while (currentX < workArea.docScreenWidth) {
        pathData += `M${Utils.RoundCoordLP(currentX)},0v${workArea.docScreenHeight}`;
        currentX += pageWidth;
      }

      let currentY = pageHeight;
      while (currentY < workArea.docScreenHeight) {
        pathData += `M0,${Utils.RoundCoordLP(currentY)}h${workArea.docScreenWidth}`;
        currentY += pageHeight;
      }

      path.SetPath(pathData);
      path.SetFillColor('none');
      path.SetStrokeColor('#000088');
      path.SetStrokeOpacity('.6');
      path.SetStrokePattern('10,4');
      path.SetStrokeWidth('.5');

      pageDividerLayer.AddElement(path);
    }
  }

  SetScroll = (e, t) => {
    this.AdjustScroll(e, t)
  }


  DocObject = function () {
    return this.svgDoc
  }

  SetRulerContent1 = function (elem, isHorizontal) {
    const workArea = this.svgDoc.GetWorkArea();
    const vRulerWidth = document.getElementById(this.vRulerAreaID).clientWidth;
    const hRulerHeight = document.getElementById(this.hRulerAreaID).clientHeight;
    const scale = 1;
    const scaledRuler = this.SD_GetScaledRuler(scale);
    const rulerLength = isHorizontal ? hRulerHeight : vRulerWidth;
    const majorTickLength = Utils.RoundCoordLP(Math.round(3 * rulerLength / 4));
    const midTickLength = Utils.RoundCoordLP(Math.round(rulerLength / 2));
    const minorTickLength = Utils.RoundCoordLP(Math.round(rulerLength / 4));
    const majorUnit = this.rulerSettings.major / (this.rulerSettings.useInches ? 1 : Defines.MetricConv);
    const gridSpacing = this.rulerSettings.nGrid * scaledRuler;
    const origin = isHorizontal ? this.rulerSettings.originx : this.rulerSettings.originy;
    const fractionalOrigin = origin - Math.floor(origin);
    const offset = -Math.ceil(origin) * this.rulerSettings.majorScale;
    const docLength = isHorizontal ? workArea.docScreenWidth : workArea.docScreenHeight;
    const path = elem.CreateShape(Models.CreateShapeType.PATH);
    let pathData = '';
    let labels = [];
    let position = fractionalOrigin * majorUnit;

    for (let i = 0; position < docLength; i++) {
      const coord = Utils.RoundCoordLP(position * workArea.docToScreenScale);
      const label = this.rulerSettings.showpixels ? 100 * (offset + i * this.rulerSettings.majorScale / scaledRuler) : offset + i * this.rulerSettings.majorScale / scaledRuler;
      labels.push({ label, x: isHorizontal ? coord + 2 : 3, y: isHorizontal ? 1 : coord + 2 });

      pathData += isHorizontal ? `M${coord},${rulerLength}v-${majorTickLength}` : `M${rulerLength},${coord}h-${majorTickLength}`;

      for (let j = 1; j < this.rulerSettings.nTics; j++) {
        const minorCoord = Utils.RoundCoordLP((position + j * (majorUnit / this.rulerSettings.nTics)) * workArea.docToScreenScale);
        const tickLength = j % Math.round(this.rulerSettings.nTics / (this.rulerSettings.nMid + 1)) ? minorTickLength : midTickLength;
        pathData += isHorizontal ? `M${minorCoord},${rulerLength}v-${tickLength}` : `M${rulerLength},${minorCoord}h-${tickLength}`;
      }

      position += this.rulerSettings.major / scaledRuler / (this.rulerSettings.useInches ? 1 : Defines.MetricConv);
    }

    path.SetPath(pathData);
    path.SetFillColor("none");
    path.SetStrokeColor("#000");
    path.SetStrokeWidth(".5");
    elem.AddElement(path);
    elem.SetCursor('cur-default');

    const textStyle = { size: 10, color: "#000" };
    const labelCount = labels.length;
    const labelStep = Math.floor(labelCount / 250);

    labels.forEach((label, index) => {
      if (index % labelStep === 0) {
        const text = elem.CreateShape(Models.CreateShapeType.TEXT);
        text.SetText(label.label.toFixed(1), textStyle);
        elem.AddElement(text);
        text.SetPos(label.x, label.y);
      }
    });
  }

  SetRulerContent = function (e, t) {
    var a, r, i, n, o, s, l, S, c, u, p, d, D, g, h, m, C, y, f, L, I, T, b, M, P;
    var R = this.svgDoc.GetWorkArea();
    var A = document.getElementById(this.vRulerAreaID).clientWidth;
    var _ = document.getElementById(this.hRulerAreaID).clientHeight;
    var E = 1;
    var w = false;
    var F = this.SD_GetScaledRuler(E);

    i = e.CreateShape(Models.CreateShapeType.PATH);
    a = t ? _ : A;
    r = "";
    o = Utils.RoundCoordLP(Math.round(3 * a / 4));
    s = Utils.RoundCoordLP(Math.round(a / 2));
    l = Utils.RoundCoordLP(Math.round(a / 4));
    g = 0;

    if (!this.rulerSettings.useInches) {
      E *= Defines.MetricConv;
    }

    p = this.rulerSettings.nTics;
    d = this.rulerSettings.nMid;
    if (p % 2) {
      d = 0;
    }
    D = Math.round(p / (d + 1));
    T = t ? R.docScreenWidth : R.docScreenHeight;
    m = this.rulerSettings.major / E;
    b = [];

    y = (C = t ? this.rulerSettings.originx : this.rulerSettings.originy) - Math.floor(C);
    if (y) {
      y -= 1;
    }
    y *= m;
    f = -Math.ceil(C) * this.rulerSettings.majorScale;
    m /= F;

    do {
      L = h = y + g * this.rulerSettings.major / F / E;
      I = Utils.RoundCoordLP(L * R.docToScreenScale);
      S = this.rulerSettings.showpixels ? 100 * (f + g * this.rulerSettings.majorScale / F) : f + g * this.rulerSettings.majorScale / F;

      if (t) {
        b.push({ label: S, x: I + 2, y: 1 });
        r += "M" + I + "," + a + "v-" + o;
      } else {
        b.push({ label: S, x: 3, y: I + 2 });
        r += "M" + a + "," + I + "h-" + o;
      }

      for (u = 1; u < p; u++) {
        L = h + u * (m / p);
        I = Utils.RoundCoordLP(L * R.docToScreenScale);
        c = u % D ? l : s;
        r += t ? "M" + I + "," + a + "v-" + c : "M" + a + "," + I + "h-" + c;
      }
      g++;
    } while (I < T);

    i.SetPath(r);
    i.SetFillColor("none");
    i.SetStrokeColor("#000");
    i.SetStrokeWidth(".5");
    e.AddElement(i);
    e.SetCursor('cur-default');

    for (u = 0; u < b.length; u++) {
      if (b[u].label !== parseInt(b[u].label, 10)) {
        w = true;
        break;
      }
    }

    if (w) {
      for (u = 0; u < b.length; u++) {
        b[u].label = b[u].label.toFixed(1);
      }
    }

    M = { size: 10, color: "#000" };
    P = b.length;
    var v = Math.floor(P / 250);

    for (u = 0; u < P; u++) {
      n = e.CreateShape(Models.CreateShapeType.TEXT);
      n.SetText(b[u].label, M);
      e.AddElement(n);
      n.SetPos(b[u].x, b[u].y);
      u += v;
      console.log('b[u].label', b[u].label, M)
    }
  }


  GetZoomFactor = () => {
    let zoomFactor = 1;
    if (this.svgDoc) {
      zoomFactor = this.svgDoc.GetWorkArea().docScale;
    }
    return zoomFactor;
  }

  ZoomInandOut = (e, t) => {
    var a,
      r = 0.25,
      i = this.GetZoomFactor();
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
    e <= 0 || this.inZoomIdle || this.SetDocumentScale(e / 100, t)
  }

  SetDocumentScale = function (e, t) {
    this.svgDoc && this.SetZoomFactor(e, t)
  }

  SetZoomFactor = function (zoomFactor, adjustScroll) {
    if (!this.svgDoc) return false;

    const currentZoomFactor = this.GetZoomFactor();
    if (!this.scaleToFit && !this.scaleToPage && zoomFactor === currentZoomFactor) return false;

    this.scaleToFit = false;
    this.scaleToPage = false;
    this.svgDoc.SetDocumentScale(zoomFactor);

    // if (!adjustScroll) {
    //   console.log('SetZoomFactor', adjustScroll);
    //   const workArea = this.svgDoc.GetWorkArea();
    //   const selectedObjects = this.gListManager.GetObjectPtr(this.gListManager.theSelectedListBlockID, false);
    //   const enclosingRect = selectedObjects.length
    //     ? this.gListManager.GetListSRect(selectedObjects)
    //     : this.gListManager.CalcAllObjectEnclosingRect(false);

    //   if (!enclosingRect.width && !enclosingRect.height) {
    //     enclosingRect.x = 0;
    //     enclosingRect.y = 0;
    //     enclosingRect.width = workArea.docWidth;
    //     enclosingRect.height = workArea.docHeight;
    //   }

    //   const scrollX = (enclosingRect.x + enclosingRect.width / 2) * workArea.docToScreenScale - workArea.dispWidth / 2;
    //   const scrollY = (enclosingRect.y + enclosingRect.height / 2) * workArea.docToScreenScale - workArea.dispHeight / 2;
    //   this.AdjustScroll(scrollX, scrollY);
    // }

    this.ResetRulers();
    this.UpdateGrid();
    this.UpdateWorkArea();
    return true;
  }

  UpdateDisplayCoordinates = function (e, t, a, r) {

  }
}

export default DocumentHandler;
