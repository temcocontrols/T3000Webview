
import DocumentHandler from "./DocumentHandler";



class ListManager {

  public bIsInitialized: boolean;
  public gDocumentHandler: DocumentHandler;
  public theSVGDocumentID: string;
  public svgDoc: any;
  public svgObjectLayer: any;
  public svgOverlayLayer: any;
  public svgHighlightLayer: any;
  public svgCollabLayer: any;
  public MainAppElement: any;
  public WorkAreaElement: any;
  public DocumentElement: any;
  public WorkAreaHammer: any;
  public DocumentElementHammer: any;

  constructor() {
    this.bIsInitialized = false;
    this.gDocumentHandler = new DocumentHandler();
  }

  Initialize = function () {










    if (!this.bIsInitialized) {
      this.theSVGDocumentID = '#svgarea';
      this.sendstate = 0;
      this.theRubberBand = null;
      this.theRubberBandStartX = 0;
      this.theRubberBandStartY = 0;
      this.theRubberBandFrame = { x: 0, y: 0, width: 0, height: 0 };
      this.theDragBBoxList = [];
      this.theDragElementList = [];
      this.theDragEnclosingRect = null;
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
      this.theNudgeDelta = 10;
      this.NoUndo = false;
      this.theActionStoredObjectID = -1;
      this.theActionSVGObject = null;
      this.theActionTriggerID = 0;
      this.theActionTriggerData = 0;
      this.theActionStartX = 0;
      this.theActionStartY = 0;
      this.theActionTableLastX = 0;
      this.theActionTableLastY = 0;
      this.theActionOldExtra = 0;
      this.theActionBBox = {};
      this.theActionNewBBox = {};
      this.theActionLockAspectRatio = false;
      this.theActionAspectRatioWidth = 0;
      this.theActionAspectRatioHeight = 0;
      this.bUseDefaultStyle = false;
      this.NewObjectVisible = false;
      this.EmptySymbolList = [];
      this.EmptyEMFList = [];
      this.AddCount = 0;
      this.LineStamp = false;
      this.theDrawStartX = 0;
      this.theDrawStartY = 0;
      this.theLineDrawStartX = 0;
      this.theLineDrawStartY = 0;
      this.FromOverlayLayer = false;
      this.LineDrawID = -1;
      this.LineDrawLineID = -1;
      this.Dynamic_Guides = null;
      this.theRotateKnobCenterDivisor = { x: 2, y: 2 };
      this.theRotateStartPoint = {};
      this.theRotateEndPoint = {};
      this.theRotateStartRotation = 0;
      this.theRotateObjectRadians = 0;
      this.theRotateEndRotation = 0;
      this.theRotatePivotX = 0;
      this.theRotatePivotY = 0;
      this.theRotateSnap = 5;
      this.enhanceRotateSnap = 45;
      this.theDrawShape = null;
      this.StampTimeout = null;
      this.wasClickInShape = false;
      // this.autoScrollTimer = new GPTimer(this);
      this.autoScrollTimerID = -1;
      this.autoScrollXPos = 0;
      this.autoScrollYPos = 0;
      this.bInAutoScroll = false;
      this.textEntryTimer = null;
      this.isMobilePlatform = /mobile|ip(ad|hone|od)|android|silk/i.test(navigator.userAgent);
      this.isGestureCapable = 'ontouchstart' in window || ('onpointerdown' in window && navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
      this.isIOS = /ip(ad|hone|od)/i.test(navigator.userAgent);
      this.isAndroid = /android/i.test(navigator.userAgent);
      this.isMac = /(mac os x)/i.test(navigator.userAgent) && !this.isMobilePlatform;
      if (this.isMac && this.isGestureCapable) {
        this.isMac = false;
        this.isIOS = true;
        this.isMobilePlatform = true;
      }
      this.bTouchInitiated = false;
      if (this.isMobilePlatform) {
        // SDJS.ListManager.Defines.SED_KnobSize = 19;
        // SDJS.ListManager.Defines.SED_RKnobSize = 21;
        // SDJS.ListManager.Defines.SED_CKnobSize = 28;
        // SDJS.ListManager.Defines.CONNECTPT_DIM = 19;
        // SDJS.ListManager.Defines.JOINPT_DIM = 19;
        // SDJS.ListManager.Defines.JOINPT_LINE_DIM = 95;
        // SDJS.ListManager.Defines.CONNECTPT_LINE_DIM = 85;
        // SDJS.ListManager.Defines.SED_Slop = 20;
        // SDJS.ListManager.Defines.SED_SlopShapeExtra = 20;
      }
      this.MainAppElement = null;
      this.MainAppHammer = null;
      this.WorkAreaElement = null;
      this.WorkAreaHammer = null;
      this.WorkAreaTextInputProxy = null;
      this.theVirtualKeyboardLifterElementFrame = null;
      this.bTouchPanStarted = false;
      this.touchPanX = 0;
      this.touchPanY = 0;
      this.bIsFullScreen = false;
      this.TEHammer = null;
      this.TEWorkAreaHammer = null;
      this.TEClickAreaHammer = null;
      this.TEDecAreaHammer = null;
      this.TENoteAreaHammer = null;
      this.theSelectedListBlockID = -1;
      this.theSEDSessionBlockID = -1;
      this.theTEDSessionBlockID = -1;
      this.theLayersManagerBlockID = -1;
      this.stampCompleteCallback = null;
      this.stampCompleteUserData = null;
      this.stampHCenter = true;
      this.stampVCenter = true;
      this.stampShapeOffsetX = 0;
      this.stampShapeOffsetY = 0;
      this.stampSticky = false;
      this.LastOpDuplicate = false;
      this.NudgeOpen = false;
      this.NudgeX = 0;
      this.NudgeY = 0;
      this.NudgeGrowX = 0;
      this.NudgeGrowY = 0;
      // this.currentModalOperation = SDJS.ListManager.ModalOperations.NONE;
      // this.FormatPainterMode = SDJS.ListManager.FormatPainterModes.NONE;
      // this.FormatPainterStyle = new SDUI.Resources.QuickStyle();
      this.FormatPainterSticky = false;
      // this.FormatPainterText = new SDGraphics.Text.Formatter.DefaultStyle();
      // this.FormatPainterParaFormat = new SDGraphics.Text.ParagraphFormat();
      this.FormatPainterArrows = null;
      this.svgDoc = null;
      this.svgObjectLayer = null;
      this.svgOverlayLayer = null;
      this.svgHighlightLayer = null;
      this.theEventTimestamp = 0;
      // this.actionArrowHideTimer = new GPTimer(this);
      this.uniqueID = 0;
      this.theTextClipboard = null;
      this.theHtmlClipboard = null;
      this.CutFromButton = false;
      this.theImageClipboard = null;

      // const e = objectStore.CreateBlock(SDJS.Globals.StoredObjectType.SELECTEDLIST_OBJECT, []);
      // if (e === null) {
      //   throw new SDJSError({
      //     source: 'ListManager.LMInitialize',
      //     message: 'Got null value for theSelectedListBlock'
      //   });
      // }

      // this.theSelectedListBlockID = e.ID;

      // let t = {};
      // if (SDUI.Resources.CurrentTheme) {
      //   const a = SDUI.Resources.FindStyle(SDJS.ListManager.Defines.DefaultStyle);
      //   if (a) {
      //     t = $.extend(true, {}, a);
      //   } else if (SDUI.Resources.CurrentTheme.Styles && SDUI.Resources.CurrentTheme.Styles.length) {
      //     const a = SDUI.Resources.CurrentTheme.Styles[0];
      //     t = $.extend(true, {}, a);
      //   }
      // }

      // this.TextureList = new SDUI.Resources.SDTextureList();
      this.NStdTextures = 0;
      // this.LoadStdTextures();
      this.RichGradients = [];
      this.HasBlockDirectory = false;
      // this.FileVersion = SDJS.SDF.SDF_FVERSION2022;
      this.ActiveExpandedView = null;
      this.CommentUserIDs = [];
      // this.theContentHeader = new SDJS.ListManager.ContentHeader();
      // this.InitFontList(this.theContentHeader.FontList);

      // const r = new SDJS.ListManager.SEDSession();
      // r.def.style = t;
      // r.def.pen = SDJS.Editor.DeepCopy(SDJS.ListManager.Defines.PenStylingDefault);
      // r.def.highlighter = SDJS.Editor.DeepCopy(SDJS.ListManager.Defines.HighlighterStylingDefault);
      // r.d_sarrow = 0;
      // r.d_sarrowdisp = false;
      // r.d_earrow = 0;
      // r.d_earrowdisp = false;
      // r.d_arrowsize = 1;
      // r.CurrentTheme = SDUI.Commands.MainController.Theme.GetCurrentTheme();

      // const i = objectStore.CreateBlock(SDJS.Globals.StoredObjectType.SED_SESSION_OBJECT, r);
      // this.theSEDSessionBlockID = i.ID;

      // const n = new SDJS.ListManager.LayersManager();
      // const o = new SDJS.ListManager.Layer();
      // o.name = SDJS.ListManager.Defines.DefaultLayerName;
      // n.layers.push(o);
      // n.nlayers = 1;
      // n.activelayer = 0;

      // const s = objectStore.CreateBlock(SDJS.Globals.StoredObjectType.LAYERS_MANAGER_OBJECT, n);
      // this.theLayersManagerBlockID = s.ID;

      // this.SelectionState = new SDJS.ListManager.SelectionAttributes();

      // const l = new SDJS.ListManager.TEDSession();
      // const S = objectStore.CreateBlock(SDJS.Globals.StoredObjectType.TED_SESSION_OBJECT, l);
      // this.theTEDSessionBlockID = S.ID;

      // const c = objectStore.CreateBlock(SDJS.Globals.StoredObjectType.LINKLIST_OBJECT, []);
      // if (c === null) {
      //   throw new SDJSError({
      //     source: 'ListManager.LMInitialize',
      //     message: 'Got null value for theLinksBlock'
      //   });
      // }
      // this.theLinksBlockID = c.ID;

      // this.PreserveUndoState(true);
      this.InitSVGDocument();
      this.SVGroot = this.svgDoc.svgObj.node;
      this.UpdateSelectionAttributes(null);
      this.BuildArrowheadLookupTables();
      this.theDirtyList = [];
      this.theDirtyListMoveOnly = [];
      this.DirtyListReOrder = false;
      this.theMoveList = [];
      this.theMoveBounds = null;
      this.PinRect = null;
      this.LinkParams = null;
      this.RightClickParams = null;
      this.PostMoveSelectID = null;
      this.bBuildingSymbols = false;
      this.bTokenizeStyle = false;
      this.bDrawEffects = true;
      // this.initialStateID = stateManager.CurrentStateID;
      // this.nObjectStoreStart = objectStore.StoredObjects.length;
      this.cachedHeight = null;
      this.cachedWidth = null;
      this.bInDimensionEdit = false;
      this.curNoteShape = -1;
      this.curNoteTableCell = null;
      this.curNoteGraphPint = null;
      this.bInNoteEdit = false;
      this.bNoteChanged = false;
      this.OldAllowSave = true;
      this.SocketAction = [];
      this.PageAction = [];
      this.PagesToDelete = [];
      this.OldFileMetaData = null;
      this.curHiliteShape = -1;
      // this.SetEditMode(SDJS.ListManager.EditState.DEFAULT);
      this.alternateStateManagerVars = [];
      this.alternateStateManagerVars.bHasBeenSaved = false;
      this.bitmapImportCanvas = null;
      this.bitmapImportCanvasCTX = null;
      this.bitmapScaledCanvas = null;
      this.bitmapScaledCanvasCTX = null;
      this.bitmapImportSourceWidth = 0;
      this.bitmapImportSourceHeight = 0;
      this.bitmapImportDestWidth = 800;
      this.bitmapImportDestHeight = 800;
      this.bitmapImportMaxScaledWidth = 1200;
      this.bitmapImportMaxScaledHeight = 1200;
      this.bitmapImportDPI = 200;
      this.bitmapImportMimeType = '';
      this.bitmapImportOriginalSize = 0;
      this.bitmapImportScaledSize = 0;
      this.scaledBitmapCallback = null;
      this.bitmapImportEXIFdata = null;
      this.bitmapImportFile = null;
      this.bitmapImportResult = null;
      this.symbolLibraryItemID = -1;
      this.bIsInitialized = true;
      this.TopLeftPastePos = { x: 0, y: 0 };
      this.TopLeftPasteScrollPos = { x: 0, y: 0 };
      this.PasteCount = 0;
      this.DoubleClickSymbolTimeStamp = 0;
      this.ImportContext = null;
    }
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

  ContentHeader = () => {


    // this.Page = new SDJS.ListManager.PageRecord();
    // this.MaxWorkDim = new SDJS.ListManager.Point(
    //   SDJS.ListManager.Defines.MaxWorkDimX,
    //   SDJS.ListManager.Defines.MaxWorkDimY
    // );
    // this.DimensionFont = new SDJS.ListManager.FontRecord();
    // this.DimensionFontStyle = new SDGraphics.Text.Formatter.DefaultStyle();
    // this.flags = SDJS.ListManager.ContentHeaderFlags.CT_DA_Pages;
    // this.BusinessModule = '';
    // this.dateformat = -1;
    // this.smarthelpname = '';
    // this.smartpanelname = '';
    // this.originaltemplate = '';
    // this.orgcharttable = '';
    // this.exportpath = '';
    // this.presentationBackground = '';
    // this.presentationName = '';
    // this.importSourcePath = '';
    // this.defaultlibs = '';
    // this.lp_list = new SDJS.ListManager.LibList();
    // this.ClipboardBuffer = null;
    // this.ClipboardType = SDJS.ListManager.ClipboardType.None;
    // this.nonworkingdays = SDJS.ListManager.Defines.DEFAULT_NONWORKINGDAYS;
    // this.holidaymask = 0;
    // this.DocIsDirty = false;
    // this.AllowReplace = true;
    // this.FontList = [];
    // this.SymbolSearchString = '';
    // this.Save_HistoryState = -1;
    // this.ParentPageID = '';
  }



  InitSVGDocument = function () {
    // const e = objectStore.GetObject(this.theSEDSessionBlockID).Data;

    this.gDocumentHandler.InitializeWorkArea({
      svgAreaID: this.theSVGDocumentID,
      documentWidth: 1000,// e.dim.x,
      documentHeight: 1000,// e.dim.y,
      documentDPI: 100
    });

    this.svgDoc = this.gDocumentHandler.DocObject();
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

    // this.WorkAreaHammer.on('tap', SDJS_LM_WorkAreaHammerTap);
    // this.WorkAreaHammer.on('wheel', SDJS_LM_WorkAreaMouseWheel);
    // this.DocumentElementHammer.on('wheel', SDJS_LM_WorkAreaMouseWheel);

    // if (this.isGestureCapable) {
    //   this.WorkAreaHammer.on('pinchin', SDJS_LM_WorkAreaHammerPinchIn);
    //   this.WorkAreaHammer.on('pinchout', SDJS_LM_WorkAreaHammerPinchOut);
    //   this.WorkAreaHammer.on('transformend', SDJS_LM_WorkAreaHammerPinchEnd);
    //   this.WorkAreaHammer.on('hold', SDJS_LM_WorkAreaHold);
    // }

    // if (this.isMobilePlatform) {
    //   if (this.isIOS) {
    //     this.WorkAreaElement.addEventListener('gesturestart', SDJS_LM_WorkAreaIOSGesture, false);
    //     this.WorkAreaElement.addEventListener('gesturechange', SDJS_LM_WorkAreaIOSGesture, false);
    //     this.WorkAreaElement.addEventListener('gestureend', SDJS_LM_WorkAreaIOSGesture, false);
    //     this.WorkAreaElement.addEventListener('orientationchange', SDJS_LM_WorkAreaOrientationChange, false);
    //   }
    //   this.WorkAreaTextInputProxy = $('#SDTS_TouchProxy');
    // }

    // this.WorkAreaHammer.on('dragstart', SDJS_LM_WorkAreaHammerDragStart);
  }
}

export default ListManager;
