
import Document from '../Graphics/Document';
import Models from '../Hvac.Models';
import Hammer from 'hammerjs';
import * as Utils from '../Hvac.Utils';
import ListManager from './ListManager';
import DocumentController from '../UI/DocumentController';
import UI from '../UI/UI';

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
  public scrollWidth: boolean;
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

  constructor() {
    // this.gListManager = new ListManager();


    this.documentConfig = {
      enableSnap: true,
      showGrid: true,
      showRulers: true
    };
  }

  InitializeWorkArea = (workArea) => {
    console.log('InitializeWorkArea', workArea);

    // workArea = { svgAreaID: "#svgarea", documentWidth: 1000, documentHeight: 750, documentDPI: 100 }

    this.workAreaID = workArea.workAreaID || '#document-area';
    this.svgAreaID = 'svgarea';//workArea.svgAreaID || 'svgarea';
    this.hRulerAreaID = workArea.hRulerAreaID || '#h-ruler';
    this.vRulerAreaID = workArea.vRulerAreaID || '#v-ruler';
    this.cRulerAreaID = workArea.cRulerAreaID || '#c-ruler';
    this.svgDoc = null;
    this.hRulerDoc = null;
    this.vRulerDoc = null;
    this.rulerVis = true;
    this.gridVis = true;
    this.backgroundElem = null;
    this.scaleToFit = false;
    this.scaleToPage = false;
    this.scrollWidth = false;

    this.backgroundLayer = '_BACKGROUND';

    window.addEventListener("resize", this.HandleResizeEvent);

    console.log('document.getElementById(this.svgAreaID)', this.svgAreaID, document.getElementById(this.svgAreaID));
    document.getElementById(this.svgAreaID).addEventListener("scroll", this.HandleScrollEvent);

    this.UpdateWorkArea();
    this.InitRulerSettings();
    // this.rulerSettings.fractionaldenominator = gListManager.GetFractionDenominator();
    this.UpdateRulerVisibility();

    window.addEventListener.bind("mousemove", new UI().SDJS_LM_MouseMove);

    this.InitSVGArea(workArea);
    this.UpdateGridVisibility();
    this.UpdatePageDividerVisibility();
    this.SetupRulers();
    this.UpdateGrid();
    this.UpdatePageDivider();
    this.UpdateWorkArea();
    // this.InitSpellCheck();
  }

  HandleResizeEvent = () => {
    console.log('HandleResizeEvent');
  }

  UpdateWorkArea = () => {
    console.log('UpdateWorkArea');
  }

  HandleScrollEvent = () => {
    console.log('HandleScrollEvent');
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
    this.documentConfig.showRulers = true;
    this.rulerVis = true;

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

  // SDJS_LM_MouseMove = (e) => {
  //   if (
  //     e.clientX >= this.gListManager.svgDoc.docInfo.dispX &&
  //     e.clientY >= this.gListManager.svgDoc.docInfo.dispY &&
  //     e.clientX < this.gListManager.svgDoc.docInfo.dispX + this.gListManager.svgDoc.docInfo.dispWidth &&
  //     e.clientY < this.gListManager.svgDoc.docInfo.dispY + this.gListManager.svgDoc.docInfo.dispHeight
  //   ) {
  //     var t = this.gListManager.svgDoc.ConvertWindowToDocCoords(e.clientX, e.clientY);
  //     this.gListManager.ShowXY(!0),
  //       this.gListManager.UpdateDisplayCoordinates(null, t, null, null)
  //   } else this.gListManager.ShowXY(!1)
  // }

  InitSVGArea = (workArea) => {
    console.log('InitSVGArea');

    var t;
    if (!this.svgDoc) {
      this.svgDoc = new Document(this.svgAreaID, []);
    }
    t = this.svgDoc.AddLayer(this.backgroundLayer);
    this.backgroundElem = this.svgDoc.CreateShape(Models.CreateShapeType.RECT);
    t.AddElement(this.backgroundElem);
    this.backgroundElem.SetPos(0, 0);
    this.backgroundElem.SetStrokeWidth(0);
    this.backgroundElem.SetStrokeColor("none");
    this.backgroundElem.SetFillColor("none");
    this.backgroundElem.ExcludeFromExport(true);
    t.SetCustomAttribute("sdjs-background", "1");

    t = this.svgDoc.AddLayer(this.gridLayer);
    t.AllowScaling(false);
    t.ExcludeFromExport(true);
    t.SetCustomAttribute("sdjs-grid", "1");

    t = this.svgDoc.AddLayer(this.pageDividerLayer);
    t.AllowScaling(false);
    t.ExcludeFromExport(true);

    if (workArea.layers && Array.isArray(workArea.layers)) {
      workArea.layers.forEach(function (layer) {
        this.svgDoc.AddLayer(layer);
      }, this);
    }

    if (workArea.documentWidth && workArea.documentHeight) {
      this.svgDoc.SetDocumentSize(workArea.documentWidth, workArea.documentHeight);
    }

    if (workArea.documentDPI) {
      this.svgDoc.SetDocumentDPI(workArea.documentDPI);
    }

    this.backgroundElem.SetSize(this.svgDoc.docInfo.docWidth, this.svgDoc.docInfo.docHeight);
    this.svgDoc.ImageLoad_ResetRefCount();
  }

  UpdateGridVisibility = () => {
    const gridLayer = this.svgDoc ? this.svgDoc.GetLayer(this.gridLayer) : null;
    if (gridLayer && this.documentConfig.showGrid !== this.gridVis) {
      gridLayer.SetVisible(this.documentConfig.showGrid);
      this.gridVis = this.documentConfig.showGrid;
      return true;
    }
    return false;
  }


  SetupRulers = () => {
    if (!this.hRulerDoc) {
      this.hRulerDoc = new Document(this.hRulerAreaID, []);
    }

    if (!this.vRulerDoc) {
      this.vRulerDoc = new Document(this.vRulerAreaID, []);
    }

    this.hRulerGuide = null;
    this.vRulerGuide = null;
    this.rulerGuideWinPos = { x: 0, y: 0 };
    this.rulerGuideScrollTimer = null;
    this.rulerInDrag = false;

    if (!this.IsReadOnly()) {

      const hRulerElem = document.getElementById(this.hRulerAreaID)[0];
      const vRulerElem = document.getElementById(this.vRulerAreaID)[0];
      const cRulerElem = document.getElementById(this.cRulerAreaID)[0];

      new Hammer(hRulerElem).on('doubletap', this.RulerTopDoubleClick);
      new Hammer(vRulerElem).on('doubletap', this.RulerLeftDoubleClick);
      new Hammer(cRulerElem).on('doubletap', this.RulerCenterDoubleClick);

      new Hammer(hRulerElem).on('dragstart', this.RulerDragStart);
      new Hammer(vRulerElem).on('dragstart', this.RulerDragStart);
      new Hammer(cRulerElem).on('dragstart', this.RulerDragStart);

      new Hammer(hRulerElem).on('drag', this.RulerTopDrag);
      new Hammer(vRulerElem).on('drag', this.RulerLeftDrag);
      new Hammer(cRulerElem).on('drag', this.RulerCenterDrag);

      new Hammer(hRulerElem).on('dragend', this.RulerDragEnd);
      new Hammer(vRulerElem).on('dragend', this.RulerDragEnd);
      new Hammer(cRulerElem).on('dragend', this.RulerDragEnd);
    }

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
      if (this.gListManager.IsRightClick(e)) {
        Utils.StopPropagationAndDefaults(e);
        // Double show dropdown
        return;
      }
      this.rulerInDrag = true;
    }
  }

  RulerTopDrag = (e) => {
    if (this.gListManager.IsCtrlClick(e)) {
      Utils.StopPropagationAndDefaults(e);
      this.RulerHandleDoubleClick(e, false, true);
      this.RulerDragGuides(e, false, true);
    }
  }

  RulerLeftDrag = (e) => {
    if (Utils.StopPropagationAndDefaults(e), this.gListManager.IsCtrlClick(e)) {
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
      this.gListManager.svgOverlayLayer.RemoveElement(this.hRulerGuide);
      this.hRulerGuide = null;
    }

    if (this.vRulerGuide) {
      this.gListManager.svgOverlayLayer.RemoveElement(this.vRulerGuide);
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
        this.gListManager.svgOverlayLayer.AddElement(this.hRulerGuide);
      }

      if (a && !this.vRulerGuide) {
        this.vRulerGuide = this.svgDoc.CreateShape(Models.CreateShapeType.LINE);
        this.vRulerGuide.SetFillColor('none');
        this.vRulerGuide.SetStrokeColor('black');
        this.vRulerGuide.SetStrokeWidth(scale);
        this.vRulerGuide.SetStrokePattern(pattern);
        this.gListManager.svgOverlayLayer.AddElement(this.vRulerGuide);
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



  AdjustScroll = (e, t) => {
    const workArea = this.svgDoc.GetWorkArea();
    const scrollX = Math.min(e !== undefined ? e : workArea.scrollX, workArea.maxScrollX);
    const scrollY = Math.min(t !== undefined ? t : workArea.scrollY, workArea.maxScrollY);

    document.querySelector(this.svgAreaID).scrollLeft = scrollX;
    document.querySelector(this.svgAreaID).scrollTop = scrollY;

    this.svgDoc.CalcWorkArea();
    this.SyncRulers();
  }


  SyncRulers = function () {
    const scrollLeft = document.querySelector(this.svgAreaID).scrollLeft;
    const scrollTop = document.querySelector(this.svgAreaID).scrollTop;
    document.querySelector(this.hRulerAreaID).scrollLeft = scrollLeft;
    document.querySelector(this.vRulerAreaID).scrollTop = scrollTop;
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
    if (!this.gListManager.IsRightClick(e)) {
      const origin = {
        originx: this.rulerSettings.originx,
        originy: this.rulerSettings.originy
      };

      const coords = this.svgDoc.ConvertWindowToDocCoords(e.gesture.center.clientX, e.gesture.center.clientY);
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

        const selectedObject = this.gListManager.GetObjectPtr(this.gListManager.theSelectedListBlockID, false);
        this.gListManager.UpdateSelectionAttributes(selectedObject);
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
        const sdp = this.gListManager.GetObjectPtr(this.gListManager.theSEDSessionBlockID, true);
        sdp.rulerSettings = Utils.DeepCopy(this.rulerSettings);
      }
      this.ResetRulers();
      this.UpdateGrid();
      this.UpdatePageDivider();
    }
  }

  ResetRulers = function () {
    const workArea = this.svgDoc.GetWorkArea();
    const vRulerWidth = document.querySelector(this.vRulerAreaID).clientWidth;
    const hRulerHeight = document.querySelector(this.hRulerAreaID).clientHeight;

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

  SD_GetScaledRuler = (e) => {
    let scale = Math.floor(this.svgDoc.docInfo.docScale);
    if (scale === 0) {
      scale = Math.floor(1 / this.svgDoc.docInfo.docScale);
      if (scale > 1) {
        e /= scale;
      }
    } else if (scale > 1) {
      e *= scale;
    }
    return e;
  }

  UpdateGrid = () => {
    const workArea = this.svgDoc.GetWorkArea();
    const gridLayer = this.svgDoc.GetLayer(this.gridLayer);
    const scale = 1;

    if (gridLayer) {
      const scaledRuler = this.SD_GetScaledRuler(scale);
      gridLayer.RemoveAll();

      const majorPath = this.svgDoc.CreateShape(Models.CreateShapeType.PATH);
      const minorPath = this.svgDoc.CreateShape(Models.CreateShapeType.PATH);

      const unitConversion = this.rulerSettings.useInches ? 1 : ListManagerDefines.MetricConv;
      const majorUnit = this.rulerSettings.major / unitConversion;
      const gridSpacing = this.rulerSettings.nGrid * scaledRuler;

      let majorPathData = '';
      let minorPathData = '';

      const pageWidth = this.gListManager.theContentHeader.Page.papersize.x -
        (this.gListManager.theContentHeader.Page.margins.left + this.gListManager.theContentHeader.Page.margins.right) / 2;
      const pageHeight = this.gListManager.theContentHeader.Page.papersize.y -
        (this.gListManager.theContentHeader.Page.margins.top + this.gListManager.theContentHeader.Page.margins.bottom) / 2;

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

      let offset = -Math.ceil(pageWidth / majorUnit);
      let position;

      do {
        position = originX + offset * this.rulerSettings.major / unitConversion;
        const x = Utils.RoundCoordLP(position * workArea.docToScreenScale);
        if (x > endX) break;

        majorPathData += `M${x},${startY}v${docHeight}`;

        for (let i = 1; i < gridSpacing; i++) {
          position = originX + offset * this.rulerSettings.major / unitConversion + i * (majorUnit / gridSpacing);
          const minorX = Utils.RoundCoordLP(position * workArea.docToScreenScale);
          if (minorX > endX) break;

          minorPathData += `M${minorX},${startY}v${docHeight}`;
        }

        offset++;
      } while (position < endX);

      offset = -Math.ceil(pageHeight / majorUnit);

      do {
        position = originY + offset * this.rulerSettings.major / unitConversion;
        const y = Utils.RoundCoordLP(position * workArea.docToScreenScale);
        if (y > endY) break;

        majorPathData += `M${startX},${y}h${docWidth}`;

        for (let i = 1; i < gridSpacing; i++) {
          position = originY + offset * this.rulerSettings.major / unitConversion + i * (majorUnit / gridSpacing);
          const minorY = Utils.RoundCoordLP(position * workArea.docToScreenScale);
          if (minorY > endY) break;

          minorPathData += `M${startX},${minorY}h${docWidth}`;
        }

        offset++;
      } while (position < endY);

      majorPath.SetPath(majorPathData);
      minorPath.SetPath(minorPathData);

      majorPath.SetFillColor('none');
      majorPath.SetStrokeColor('#000');
      majorPath.SetStrokeOpacity('.4');
      majorPath.SetStrokeWidth('.5');

      minorPath.SetFillColor('none');
      minorPath.SetStrokeColor('#000');
      minorPath.SetStrokeOpacity('.2');
      minorPath.SetStrokeWidth('.5');

      gridLayer.AddElement(minorPath);
      gridLayer.AddElement(majorPath);
      gridLayer.SetEventBehavior(Models.EventBehavior.NONE);
    }
  }

  UpdatePageDivider = () => {
    const workArea = this.svgDoc.GetWorkArea();
    const pageDividerLayer = this.svgDoc.GetLayer(this.pageDividerLayer);

    if (pageDividerLayer) {
      pageDividerLayer.RemoveAll();

      const path = this.svgDoc.CreateShape(Models.CreateShapeType.PATH);
      let pathData = '';

      const pageSize = this.gListManager.theContentHeader.Page.papersize;
      const margins = this.gListManager.theContentHeader.Page.margins;

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



  UpdatePageDividerVisibility = function () {

    const pageDividerLayer = this.svgDoc ? this.svgDoc.GetLayer(this.pageDividerLayer) : null;
    // const printFlags = this.gListManager.theContentHeader.Page.printflags;

    // Double TODO
    const shouldShowPageDivider = this.documentConfig.showPageDivider;

    if (pageDividerLayer && shouldShowPageDivider !== pageDividerLayer.GetVisible()) {
      pageDividerLayer.SetVisible(shouldShowPageDivider);
      return true;
    }
    return false;
  }

  SetScroll = (e, t) => {
    this.AdjustScroll(e, t)
  }

  SDJS_LM_WorkAreaMouseWheel = (e) => {

    if (e.ctrlKey) {
      const clientX = e.clientX;
      const clientY = e.clientY;
      const docCoords = this.gListManager.svgDoc.ConvertWindowToDocCoords(clientX, clientY);

      let docController = new DocumentController();

      if (e.deltaY > 0) {

        docController.ZoomInandOut(false, true);
      } else if (e.deltaY < 0) {
        docController.ZoomInandOut(true, true);
      }

      Utils.StopPropagationAndDefaults(e);

      const windowCoords = this.gListManager.svgDoc.ConvertDocToWindowCoords(docCoords.x, docCoords.y);
      const offsetX = clientX - windowCoords.x;
      const offsetY = clientY - windowCoords.y;

      const svgArea = document.querySelector('#svgarea');
      const scrollLeft = svgArea.scrollLeft;
      const scrollTop = svgArea.scrollTop;

      this.SetScroll(scrollLeft - offsetX, scrollTop - offsetY);
    }
  }

  GetZoomFactor = () => {





    let zoomFactor = 1;
    if (this.svgDoc) {
      zoomFactor = this.svgDoc.GetWorkArea().docScale;
    }
    return zoomFactor;








  }
}

export default DocumentHandler;
