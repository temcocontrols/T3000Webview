
import HvTimer from "../Helper/HvTimer";
import QuickStyle from "../Model/QuickStyle";
import ParagraphFormat from '../Model/ParagraphFormat';
import GlobalData from '../Data/GlobalData';
import Globals from "../Data/Globals";
import SDTextureList from "../Model/SDTextureList";
import ContentHeader from '../Model/ContentHeader';
import SEDSession from '../Model/SEDSession';
import LayersManager from "../Model/LayersManager";
import Layer from "../Model/Layer";
import $ from 'jquery';
import DefaultEvt from "../Event/DefaultEvt";
import ArrowSizes from '../Model/ArrowSizes';
import Document from '../Basic/Basic.Document';
import Utils1 from "../Helper/Utils1";
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3"
import BaseLine from '../Shape/Shape.BaseLine';
import '../Helper/HammerTest2'
import PolyLine from '../Shape/Shape.PolyLine';
import PolyLineContainer from '../Shape/Shape.PolyLineContainer';
import BaseDrawingObject from '../Shape/Shape.BaseDrawingObject';
import GroupSymbol from '../Shape/Shape.GroupSymbol';
import Connector from '../Shape/Shape.Connector';
import Point from '../Model/Point';
import ShapeContainer from '../Shape/Shape.ShapeContainer'
import SegmentedLine from '../Shape/Shape.SegmentedLine';
import BaseShape from '../Shape/Shape.BaseShape';
import SegmentData from '../Model/SegmentData'
import DefaultStyle from "../Model/DefaultStyle"
import Style from '../Basic/Basic.Element.Style'
import Instance from "../Data/Instance/Instance"
import ConstantData from '../Data/ConstantData'
import TEDSession from "../Model/TEDSession"
import TextFormatData from "../Model/TextFormatData"
import PolyList from "../Model/PolyList"
import PolySeg from "../Model/PolySeg"
import HitResult from "../Model/HitResult"
import LinkParameters from "../Model/LinkParameters"
import Link from '../Model/Link'
import SelectionAttributes from "../Model/SelectionAttributes"
import Rectangle from "../Model/Rectangle"
import Hook from "../Model/Hook"
import ConstantData1 from "../Data/ConstantData1"
import TextObject from "../Model/TextObject"
import DynamicGuides from "../Model/DynamicGuides"
import ConstantData2 from "../Data/ConstantData2"
import ShapeAttrUtil from "../Opt/ShapeAttrUtil"

class OptHandler{

  //#region  Variables

  public bIsInitialized: boolean;
  public theSVGDocumentID: string;
  public sendstate: number;
  public theRubberBand: any;
  public theRubberBandStartX: number;
  public theRubberBandStartY: number;
  public theRubberBandFrame: any;
  public theDragBBoxList: any[];
  public theDragElementList: any[];
  public theDragEnclosingRect: any;
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
  public theNudgeDelta: number;
  public NoUndo: boolean;
  public theActionStoredObjectID: number;
  public theActionSVGObject: any;
  public theActionTriggerID: number;
  public theActionTriggerData: number;
  public theActionStartX: number;
  public theActionStartY: number;
  public theActionTableLastX: number;
  public theActionTableLastY: number;
  public theActionOldExtra: number;
  public theActionBBox: any;
  public theActionNewBBox: any;
  public theActionLockAspectRatio: boolean;
  public theActionAspectRatioWidth: number;
  public theActionAspectRatioHeight: number;
  public bUseDefaultStyle: boolean;
  public NewObjectVisible: boolean;
  public EmptySymbolList: any[];
  public EmptyEMFList: any[];
  public AddCount: number;
  public LineStamp: boolean;
  public theDrawStartX: number;
  public theDrawStartY: number;
  public theLineDrawStartX: number;
  public theLineDrawStartY: number;
  public FromOverlayLayer: boolean;
  public LineDrawID: number;
  public LineDrawLineID: number;
  public Dynamic_Guides: any;
  public theRotateKnobCenterDivisor: any;
  public theRotateStartPoint: any;
  public theRotateEndPoint: any;
  public theRotateStartRotation: number;
  public theRotateObjectRadians: number;
  public theRotateEndRotation: number;
  public theRotatePivotX: number;
  public theRotatePivotY: number;
  public theRotateSnap: number;
  public enhanceRotateSnap: number;
  public theDrawShape: any;
  public StampTimeout: any;
  public wasClickInShape: boolean;
  public autoScrollTimer: HvTimer;
  public autoScrollTimerID: number;
  public autoScrollXPos: number;
  public autoScrollYPos: number;
  public bInAutoScroll: boolean;
  public textEntryTimer: any;
  public isGestureCapable: boolean;
  public bTouchInitiated: boolean;
  public MainAppElement: any;
  public MainAppHammer: any;
  public WorkAreaElement: any;
  public WorkAreaHammer: any;
  public WorkAreaTextInputProxy: any;
  public theVirtualKeyboardLifterElementFrame: any;
  public bTouchPanStarted: boolean;
  public touchPanX: number;
  public touchPanY: number;
  public bIsFullScreen: boolean;
  public TEHammer: any;
  public TEWorkAreaHammer: any;
  public TEClickAreaHammer: any;
  public TEDecAreaHammer: any;
  public TENoteAreaHammer: any;
  public theSelectedListBlockID: number;
  public theSEDSessionBlockID: number;
  public theTEDSessionBlockID: number;
  public theLayersManagerBlockID: number;
  public stampCompleteCallback: any;
  public stampCompleteUserData: any;
  public stampHCenter: boolean;
  public stampVCenter: boolean;
  public stampShapeOffsetX: number;
  public stampShapeOffsetY: number;
  public stampSticky: boolean;
  public LastOpDuplicate: boolean;
  public NudgeOpen: boolean;
  public NudgeX: number;
  public NudgeY: number;
  public NudgeGrowX: number;
  public NudgeGrowY: number;
  public currentModalOperation: number;
  public FormatPainterMode: number;
  public FormatPainterStyle: QuickStyle;
  public FormatPainterSticky: boolean;
  public FormatPainterText: QuickStyle;
  public FormatPainterParaFormat: ParagraphFormat;
  public FormatPainterArrows: any;
  public svgDoc: Document;
  public svgObjectLayer: any;
  public svgOverlayLayer: any;
  public svgHighlightLayer: any;
  public theEventTimestamp: number;
  public actionArrowHideTimer: HvTimer;
  public uniqueID: number;
  public theTextClipboard: any;
  public theHtmlClipboard: any;
  public CutFromButton: boolean;
  public theImageClipboard: any;
  public SVGroot: any;
  public theDirtyList: any[];
  public theDirtyListMoveOnly: any[];
  public DirtyListReOrder: boolean;
  public theMoveList: any[];
  public theMoveBounds: any;
  public PinRect: any;
  public LinkParams: any;
  public RightClickParams: any;
  public PostMoveSelectID: any;
  public bBuildingSymbols: boolean;
  public bTokenizeStyle: boolean;
  public bDrawEffects: boolean;
  public initialStateID: number;
  public nObjectStoreStart: number;
  public cachedHeight: any;
  public cachedWidth: any;
  public bInDimensionEdit: boolean;
  public curNoteShape: number;
  public curNoteTableCell: any;
  public curNoteGraphPint: any;
  public bInNoteEdit: boolean;
  public bNoteChanged: boolean;
  public OldAllowSave: boolean;
  public SocketAction: any[];
  public PageAction: any[];
  public PagesToDelete: any[];
  public TextureList: SDTextureList;
  public RichGradients: any[];
  public NStdTextures: number;
  public HasBlockDirectory: boolean;
  public FileVersion: number;
  public ActiveExpandedView: any;
  public CommentUserIDs: any[];
  public theContentHeader: ContentHeader;
  public theLinksBlockID: number;
  public SelectionState: any;
  public OldFileMetaData: any;
  public curHiliteShape: number;
  public alternateStateManagerVars: any;
  public bitmapImportCanvas: any;
  public bitmapImportCanvasCTX: any;
  public bitmapScaledCanvas: any;
  public bitmapScaledCanvasCTX: any;
  public bitmapImportSourceWidth: number;
  public bitmapImportSourceHeight: number;
  public bitmapImportDestWidth: number;
  public bitmapImportDestHeight: number;
  public bitmapImportMaxScaledWidth: number;
  public bitmapImportMaxScaledHeight: number;
  public bitmapImportDPI: number;
  public bitmapImportMimeType: string;
  public bitmapImportOriginalSize: number;
  public bitmapImportScaledSize: number;
  public scaledBitmapCallback: any;
  public bitmapImportEXIFdata: any;
  public bitmapImportFile: any;
  public bitmapImportResult: any;
  public symbolLibraryItemID: number;
  public TopLeftPastePos: any;
  public TopLeftPasteScrollPos: any;
  public PasteCount: number;
  public DoubleClickSymbolTimeStamp: number;
  public ImportContext: any;
  public svgCollabLayer: any;
  public DocumentElement: any;
  public DocumentElementHammer: any;
  public editModeList: any;
  public TETextHammer: any;

  //#endregion

  Initialize() {

    if (this.bIsInitialized) {
      return;
    }

    this.theSVGDocumentID = '#svg-area';
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
    this.autoScrollTimer = new HvTimer(this)/*GPTimer(this)*/;
    this.autoScrollTimerID = -1;
    this.autoScrollXPos = 0;
    this.autoScrollYPos = 0;
    this.bInAutoScroll = false;
    this.textEntryTimer = null;
    this.isGestureCapable = 'ontouchstart' in window || ('onpointerdown' in window && navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
    this.bTouchInitiated = false;
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
    this.currentModalOperation = ConstantData2.ModalOperations.NONE;
    this.FormatPainterMode = ConstantData2.FormatPainterModes.NONE;
    this.FormatPainterStyle = new QuickStyle();
    this.FormatPainterSticky = false;
    this.FormatPainterText = new QuickStyle();
    this.FormatPainterParaFormat = new ParagraphFormat();
    this.FormatPainterArrows = null;
    this.svgDoc = null;
    this.svgObjectLayer = null;
    this.svgOverlayLayer = null;
    this.svgHighlightLayer = null;
    this.theEventTimestamp = 0;
    this.actionArrowHideTimer = new HvTimer(this);
    this.uniqueID = 0;
    this.theTextClipboard = null;
    this.theHtmlClipboard = null;
    this.CutFromButton = false;
    this.theImageClipboard = null;

    const selectedListBlock = GlobalData.objectStore.CreateBlock(ConstantData.StoredObjectType.SELECTEDLIST_OBJECT, []);
    this.theSelectedListBlockID = selectedListBlock.ID;

    let defaultStyle = new QuickStyle();

    this.TextureList = new SDTextureList();
    this.NStdTextures = 0;
    this.RichGradients = [];
    this.HasBlockDirectory = false;
    this.FileVersion = 41;
    this.ActiveExpandedView = null;
    this.CommentUserIDs = [];
    this.theContentHeader = new ContentHeader();

    const sedSession = new SEDSession();
    sedSession.def.style = defaultStyle;
    sedSession.def.pen = Utils1.DeepCopy(ConstantData.Defines.PenStylingDefault);
    sedSession.def.highlighter = Utils1.DeepCopy(ConstantData.Defines.HighlighterStylingDefault);
    sedSession.d_sarrow = 0;
    sedSession.d_sarrowdisp = false;
    sedSession.d_earrow = 0;
    sedSession.d_earrowdisp = false;
    sedSession.d_arrowsize = 1;
    sedSession.CurrentTheme = null;

    const sedSessionBlock = GlobalData.objectStore.CreateBlock(ConstantData.StoredObjectType.SED_SESSION_OBJECT, sedSession);
    this.theSEDSessionBlockID = sedSessionBlock.ID;

    const layersManager = new LayersManager();
    const defaultLayer = new Layer();
    defaultLayer.name = ConstantData.Defines.DefaultLayerName;
    layersManager.layers.push(defaultLayer);
    layersManager.nlayers = 1;
    layersManager.activelayer = 0;

    const layersManagerBlock = GlobalData.objectStore.CreateBlock(ConstantData.StoredObjectType.LAYERS_MANAGER_OBJECT, layersManager);
    this.theLayersManagerBlockID = layersManagerBlock.ID;

    this.SelectionState = new SelectionAttributes();

    const tedSession = new TEDSession();
    const tedSessionBlock = GlobalData.objectStore.CreateBlock(ConstantData.StoredObjectType.TED_SESSION_OBJECT, tedSession);
    this.theTEDSessionBlockID = tedSessionBlock.ID;

    const linksBlock = GlobalData.objectStore.CreateBlock(ConstantData.StoredObjectType.LINKLIST_OBJECT, []);
    this.theLinksBlockID = linksBlock.ID;

    this.PreserveUndoState(true);
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
    this.initialStateID = GlobalData.stateManager.CurrentStateID;
    this.nObjectStoreStart = GlobalData.objectStore.StoredObjects.length;
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
    this.SetEditMode(ConstantData.EditState.DEFAULT);
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

  PreserveUndoState(preserveState) {
    console.log('O.Opt PreserveUndoState - Input:', { preserveState });

    if (!GlobalData.optManager.NoUndo) {
      // Check if the state manager exists
      if (null === GlobalData.stateManager) {
        throw new Error('stateManager is null');
      }

      // Only proceed if we have a valid state ID
      if (GlobalData.stateManager.CurrentStateID >= 0) {
        // Check if state is currently open
        const isStateOpen = Utils1.IsStateOpen();

        // Preserve the current state
        GlobalData.stateManager.PreserveState();

        // Add to history state if state was open
        if (isStateOpen) {
          GlobalData.stateManager.AddToHistoryState();
        }

        // Save blocks and update dirty state if needed
        if (!preserveState && isStateOpen) {
          if (this.GetDocDirtyState()) {
            ShapeAttrUtil.SaveChangedBlocks(GlobalData.stateManager.CurrentStateID, 1);
          } else {
            ShapeAttrUtil.SaveAllBlocks();
          }
          this.SetDocDirtyState(true);
        }
      }
    }

    console.log('O.Opt PreserveUndoState - Output: State preserved');
  }

  InitSVGDocument() {
    console.log("O.Opt InitSVGDocument - Input: Starting SVG document initialization");

    // Get the session data from stored object
    const sessionData = GlobalData.objectStore.GetObject(this.theSEDSessionBlockID).Data;

    // Get current screen dimensions
    const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const screenHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    console.log("O.Opt InitSVGDocument - Screen dimensions:", { width: screenWidth, height: screenHeight });

    // Initialize the document work area
    GlobalData.docHandler.InitializeWorkArea({
      svgAreaID: this.theSVGDocumentID,
      documentWidth: screenWidth,
      documentHeight: screenHeight,
      documentDPI: 100
    });

    // Get document object and initialize layers
    this.svgDoc = GlobalData.docHandler.DocObject();
    console.log("O.Opt InitSVGDocument - Created SVG document object");

    // Add and configure the object layer (main content layer)
    this.svgObjectLayer = this.svgDoc.AddLayer('svgObjectLayer');
    this.svgDoc.SetDocumentLayer('svgObjectLayer');
    console.log("O.Opt InitSVGDocument - Added object layer");

    // Add and configure the overlay layer (for UI elements)
    this.svgOverlayLayer = this.svgDoc.AddLayer('svgOverlayLayer');
    this.svgOverlayLayer.ExcludeFromExport(true);
    console.log("O.Opt InitSVGDocument - Added overlay layer");

    // Add and configure the highlight layer (for highlighting elements)
    this.svgHighlightLayer = this.svgDoc.AddLayer('svgHighlightLayer');
    this.svgHighlightLayer.ExcludeFromExport(true);
    console.log("O.Opt InitSVGDocument - Added highlight layer");

    // Add and configure the collaboration layer
    this.svgCollabLayer = this.svgDoc.AddLayer('svgCollabLayer');
    this.svgCollabLayer.ExcludeFromExport(true);
    this.svgCollabLayer.AllowScaling(false);
    console.log("O.Opt InitSVGDocument - Added collaboration layer");

    // Get DOM elements
    this.MainAppElement = document.getElementById('main-app');
    this.WorkAreaElement = document.getElementById('svg-area');
    this.DocumentElement = document.getElementById('document-area');
    console.log("O.Opt InitSVGDocument - DOM elements acquired");

    // Initialize Hammer.js for touch/gesture events
    this.WorkAreaHammer = Hammer(this.WorkAreaElement);
    this.DocumentElementHammer = Hammer(this.DocumentElement);
    console.log("O.Opt InitSVGDocument - Hammer instances created");

    // Bind event handlers
    this.WorkAreaHammer.on('tap', DefaultEvt.Evt_WorkAreaHammerTap);
    this.WorkAreaHammer.on('wheel', DefaultEvt.Evt_WorkAreaMouseWheel);
    this.DocumentElementHammer.on('wheel', DefaultEvt.Evt_WorkAreaMouseWheel);
    this.WorkAreaHammer.on('dragstart', DefaultEvt.Evt_WorkAreaHammerDragStart);
    console.log("O.Opt InitSVGDocument - Event handlers registered");

    console.log("O.Opt InitSVGDocument - Output: SVG document initialization completed");
  }

  GetFractionDenominator() {
    console.log('O.Opt GetFractionDenominator - Input: No parameters');

    let denominator;
    const rulerScale = GlobalData.docHandler.rulerSettings.majorScale;

    // Determine denominator based on ruler scale
    if (rulerScale <= 1) {
      denominator = 16;
    } else if (rulerScale <= 2) {
      denominator = 8;
    } else if (rulerScale <= 4) {
      denominator = 4;
    } else if (rulerScale <= 8) {
      denominator = 2;
    } else {
      denominator = 1;
    }

    console.log('O.Opt GetFractionDenominator - Output:', denominator);
    return denominator;
  }

  UpdateSelectionAttributes(selectedObjects) {
    console.log('O.Opt UpdateSelectionAttributes - Input:', selectedObjects);

    if (!selectedObjects) {
      console.log('O.Opt UpdateSelectionAttributes - Output: No selection objects provided, exiting early');
      return;
    }

    // Constants for better readability
    const DRAWING_OBJECT_CLASS = ConstantData.DrawingObjectBaseClass;
    const TEXT_FACE = ConstantData.TextFace;
    const OBJECT_TYPES = ConstantData.ObjectTypes;
    const SHAPE_TYPE = ConstantData.ShapeType;
    const DIMENSION_FLAGS = ConstantData.DimensionFlags;
    const TEXT_FLAGS = ConstantData.TextFlags;

    // Local variables with descriptive names
    let targetObjectId;
    let objectIndex;
    let currentObject;
    let targetObject;
    let moveList;
    let businessManager;
    let currentTable;
    let currentTextFormat;
    let objectCount = 0;
    let dimensions;
    let objectBaseClass;
    let cornerRadiusValue;
    let textDirectionValue;
    let hasFoundTreeTop = false;
    let textData = {};
    let activeTableId;

    // Tree tracking
    const treeTopInfo = {
      topconnector: -1,
      topshape: -1,
      foundtree: false
    };

    // Get session data
    const sessionData = GlobalData.optManager.GetObjectPtr(this.theSEDSessionBlockID, false);

    // Get selection count if we have selected objects
    if (selectedObjects && (objectCount = selectedObjects.length)) {
      const firstSelectedObject = selectedObjects[0];

      // Handle collaborator animations for selection changes
      if (Collab.IsCollaborating() && Collab.Animation_AllowSelectionMessage(undefined)) {
        Collab.Animation_BuildMessage(
          0, 0,
          ConstantData.Collab_AnimationMessages.ChangeSelection,
          selectedObjects
        );
      }
    }

    // Reset selection state properties
    this.ResetSelectionState();

    // Handle undo/redo state
    const undoState = Collab.GetUndoState();
    this.SelectionState.undo = undoState.undo;
    this.SelectionState.redo = undoState.redo;

    // Special case: dimension editing mode
    if (GlobalData.optManager.bInDimensionEdit) {
      this.HandleDimensionEditMode(sessionData);
      console.log('O.Opt UpdateSelectionAttributes - Output: Dimension edit mode handled');
      return;
    }

    // No selection or note editing mode
    if (objectCount === 0 || this.bInNoteEdit) {
      this.HandleEmptySelectionOrNoteEditMode(sessionData);
      console.log('O.Opt UpdateSelectionAttributes - Output: Empty selection or note edit mode handled');
      return;
    }

    // Get target selection object
    targetObjectId = this.GetTargetSelect();
    this.SelectionState.nselect = objectCount;

    // Validate target object
    if (targetObjectId >= 0) {
      targetObject = this.GetObjectPtr(targetObjectId, false);
      if (!(targetObject && targetObject instanceof BaseDrawingObject)) {
        targetObjectId = -1;
        sessionData.tselect = -1;
      }
    }

    // Process target object if valid
    if (targetObjectId >= 0) {
      this.ProcessTargetObject(targetObjectId, targetObject);

      // Find tree top if applicable
      if (Business.FindTreeTop(targetObject, 0, treeTopInfo)) {
        const topNodeId = treeTopInfo.topshape >= 0 ? treeTopInfo.topshape : treeTopInfo.topconnector;
        moveList = this.GetMoveList(topNodeId, false, true, false, null, false);
      } else {
        moveList = this.GetMoveList(targetObjectId, false, true, false, null, false);
      }
    }

    // Process each selected object
    for (objectIndex = 0; objectIndex < objectCount; objectIndex++) {
      const objectId = selectedObjects[objectIndex];

      // Check if selection allows alignment
      if (moveList) {
        if (moveList.indexOf(objectId) === -1) {
          this.SelectionState.allowalign = true;
        }
      } else if (objectId !== targetObjectId) {
        this.SelectionState.allowalign = true;
      }

      // Get and process the current object
      currentObject = this.GetObjectPtr(objectId, false);
      if (!(currentObject instanceof BaseDrawingObject)) continue;

      // Process the object based on its type and properties
      this.ProcessSelectedObject(currentObject, objectToProcess, objectIndex);
    }

    // Clean up and finalize
    this.theMoveList = null;
    this.SelectionState.allowcopy = this.SelectionState.nselect > 0;

    // Create copy of selection attributes for UI
    const selectionAttributes = new SelectionAttributes();
    $.extend(true, selectionAttributes, this.SelectionState);

    // Handle pixel to point conversion for font size if needed
    if (GlobalData.docHandler.rulerSettings.showpixels && selectionAttributes.fontsize >= 0) {
      selectionAttributes.fontsize = this.PixelstoPoints(selectionAttributes.fontsize);
    }

    // Update UI with selection state (commented out as it's referencing SDUI)
    // SDUI.Commands.MainController.UpdateActiveSelection(selectionAttributes, false);

    console.log('O.Opt UpdateSelectionAttributes - Output:', {
      nselect: this.SelectionState.nselect,
      nshapeselected: this.SelectionState.nshapeselected,
      nlineselected: this.SelectionState.nlineselected,
      nconnectorselected: this.SelectionState.nconnectorselected,
      hastext: this.SelectionState.selectionhastext
    });
  }

  // Helper methods for UpdateSelectionAttributes would go here
  ResetSelectionState() {
    console.log('O.Opt ResetSelectionState - Input: No parameters');

    this.SelectionState.nselect = 0;
    this.SelectionState.nlineselected = 0;
    this.SelectionState.nshapeselected = 0;
    this.SelectionState.nconnectorselected = 0;
    this.SelectionState.ngroupsselected = 0;
    this.SelectionState.nimageselected = 0;
    this.SelectionState.IsTargetTable = false;
    this.SelectionState.allowalign = 0;
    this.SelectionState.width = 0;
    this.SelectionState.widthstr = '';
    this.SelectionState.height = 0;
    this.SelectionState.heightstr = '';
    this.SelectionState.left = 0;
    this.SelectionState.leftstr = '';
    this.SelectionState.top = 0;
    this.SelectionState.topstr = '';
    this.SelectionState.paste = this.GetClipboardType();
    this.SelectionState.TextDirection = 0;
    this.SelectionState.dimensions = 0;
    this.SelectionState.ncells_selected = 0;
    this.SelectionState.cell_notext = false;
    this.SelectionState.celltype = 0;
    this.SelectionState.cellselected = false;
    this.SelectionState.cellflags = 0;
    this.SelectionState.ntablesselected = 0;
    this.SelectionState.bInNoteEdit = this.bInNoteEdit;
    this.SelectionState.allowcopy = false;
    this.SelectionState.selectionhastext = false;
    this.SelectionState.npolylinecontainerselected = 0;
    this.SelectionState.projectTableSelected = false;
    this.SelectionState.lockedTableSelected = false;
    this.SelectionState.nsegs = 0;
    this.SelectionState.polyclosed = false;
    this.SelectionState.iswallselected = false;
    this.SelectionState.WallThickness = 0;
    this.SelectionState.subtype = 0;
    this.SelectionState.objecttype = 0;
    this.SelectionState.datasetElemID = -1;
    this.SelectionState.tselect = -1;
    this.SelectionState.fixedCornerRadius = -2;
    this.SelectionState.lineCornerRadius = -2;
    this.SelectionState.connectorCanHaveCurve = false;
    this.SelectionState.CurrentSelectionBusinessManager = GlobalData.gBusinessManager;
    this.SelectionState.isJiraCard = false;

    console.log('O.Opt ResetSelectionState - Output: Selection state reset');
  }

  HandleDimensionEditMode(sessionData) {
    console.log('O.Opt HandleDimensionEditMode - Input:', sessionData);

    const TEXT_FACE = ConstantData.TextFace;

    this.SelectionState.fontid = -1; // GlobalData.optManager.GetFontIdByName(GlobalData.optManager.theContentHeader.DimensionFont.fontName)
    this.SelectionState.fontsize = GlobalData.optManager.theContentHeader.DimensionFont.fontSize;
    this.SelectionState.bold = (GlobalData.optManager.theContentHeader.DimensionFont.face & TEXT_FACE.Bold) > 0;
    this.SelectionState.italic = (GlobalData.optManager.theContentHeader.DimensionFont.face & TEXT_FACE.Italic) > 0;
    this.SelectionState.underline = (GlobalData.optManager.theContentHeader.DimensionFont.face & TEXT_FACE.Underline) > 0;
    this.SelectionState.superscript = (GlobalData.optManager.theContentHeader.DimensionFont.face & TEXT_FACE.Subscript) > 0;
    this.SelectionState.subscript = (GlobalData.optManager.theContentHeader.DimensionFont.face & TEXT_FACE.Subscript) > 0;
    this.SelectionState.CurrentSelectionBusinessManager = null;

    console.log('O.Opt HandleDimensionEditMode - Output: Dimension edit mode processed');
  }

  HandleEmptySelectionOrNoteEditMode(sessionData) {
    console.log('O.Opt HandleEmptySelectionOrNoteEditMode - Input:', sessionData);

    const TEXT_FACE = ConstantData.TextFace;

    this.SelectionState.fontid = -1; // GlobalData.optManager.GetFontIdByName(sessionData.def.lf.fontName)
    this.SelectionState.fontsize = sessionData.def.style.Text.FontSize;
    this.SelectionState.bold = (sessionData.def.style.Text.Face & TEXT_FACE.Bold) > 0;
    this.SelectionState.italic = (sessionData.def.style.Text.Face & TEXT_FACE.Italic) > 0;
    this.SelectionState.underline = (sessionData.def.style.Text.Face & TEXT_FACE.Underline) > 0;
    this.SelectionState.superscript = (sessionData.def.style.Text.Face & TEXT_FACE.Subscript) > 0;
    this.SelectionState.subscript = (sessionData.def.style.Text.Face & TEXT_FACE.Subscript) > 0;
    this.SelectionState.TextDirection = (sessionData.def.textflags & ConstantData.TextFlags.SED_TF_HorizText) === 0;
    this.SelectionState.dimensions =
      (sessionData.dimensions & ConstantData.DimensionFlags.SED_DF_Always) ||
      (sessionData.dimensions & ConstantData.DimensionFlags.SED_DF_Select);

    // Handle business manager for note edit
    if (this.bInNoteEdit && this.curNoteShape >= 0) {
      const businessManager = Business.GetSelectionBusinessManager(this.curNoteShape);
      if (businessManager) {
        this.SelectionState.CurrentSelectionBusinessManager = businessManager;
      }
    }

    console.log('O.Opt HandleEmptySelectionOrNoteEditMode - Output: Empty selection or note edit mode processed');
  }

  ProcessTargetObject(targetId, targetObject) {
    console.log('O.Opt ProcessTargetObject - Input:', { targetId, targetObject });

    // Get the business manager for the target object
    const businessManager = Business.GetSelectionBusinessManager(targetId);
    if (businessManager) {
      this.SelectionState.CurrentSelectionBusinessManager = businessManager;
    }

    this.SelectionState.tselect = targetId;

    if (targetObject) {
      this.SelectionState.colorfilter = targetObject.colorfilter;
      targetObject.GetPositionRect();
      this.SelectionState.subtype = targetObject.subtype;
      this.SelectionState.objecttype = targetObject.objecttype;
      this.SelectionState.datasetElemID = targetObject.datasetElemID;

      // Get dimensions for display
      const dimensions = targetObject.GetDimensionsForDisplay();
      this.SelectionState.left = dimensions.x;
      this.SelectionState.top = dimensions.y;
      this.SelectionState.width = dimensions.width;
      this.SelectionState.height = dimensions.height;

      // Handle wall objects
      if (targetObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
        this.SelectionState.WallThickness = targetObject.StyleRecord.Line.Thickness;
      }

      // Format dimensions as strings
      this.SelectionState.leftstr = targetObject.GetLengthInRulerUnits(
        this.SelectionState.left,
        GlobalData.docHandler.rulerSettings.originx
      );
      this.SelectionState.topstr = targetObject.GetLengthInRulerUnits(
        this.SelectionState.top,
        GlobalData.docHandler.rulerSettings.originy
      );
      this.SelectionState.widthstr = targetObject.GetLengthInRulerUnits(this.SelectionState.width);

      if (dimensions.height !== 0) {
        this.SelectionState.heightstr = targetObject.GetLengthInRulerUnits(this.SelectionState.height);
      } else {
        this.SelectionState.heightstr = '';
      }

      // Handle table objects
      const table = GlobalData.optManager.Table_HideUI(targetObject) ? null : targetObject.GetTable(false);
      if (table) {
        this.SelectionState.IsTargetTable = true;
        this.SelectionState.NTableRows = table.rows.length;
        this.SelectionState.NTableCols = table.cols.length;
        this.SelectionState.ntablesselected++;
      }

      // Check if selection has text
      this.SelectionState.selectionhastext = targetObject.DataID >= 0;
    }

    console.log('O.Opt ProcessTargetObject - Output: Target object processed');
  }

  ProcessSelectedObject(object, textObject, objectIndex) {
    console.log('O.Opt ProcessSelectedObject - Input:', { object, textObject, objectIndex });

    const TEXT_FACE = ConstantData.TextFace;
    const DRAWING_OBJECT_CLASS = ConstantData.DrawingObjectBaseClass;

    // Handle image URLs
    if (object.ImageURL && object.ImageURL.length) {
      this.SelectionState.nimageselected++;
    }

    // Handle swimlane or shape container
    if (object.IsSwimlane() || object instanceof ShapeContainer) {
      this.SelectionState.lockedTableSelected = true;
      this.SelectionState.IsTargetTable = true;
    }

    // Handle wall objects
    if (object.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
      this.SelectionState.iswallselected = true;
    }

    // Get base class, handling special cases
    let objectClass = object.DrawingObjectBaseClass;
    if (object instanceof PolyLineContainer) {
      objectClass = DRAWING_OBJECT_CLASS.SHAPE;
    }

    // Process object based on its class
    switch (objectClass) {
      case DRAWING_OBJECT_CLASS.SHAPE:
        this.ProcessShapeObject(object, table);
        break;

      case DRAWING_OBJECT_CLASS.CONNECTOR:
        this.ProcessConnectorObject(object);
      // Fall through to LINE case

      case DRAWING_OBJECT_CLASS.LINE:
        this.ProcessLineObject(object);
        break;
    }

    // Handle text and group objects
    if (textObject.DataID >= 0) {
      this.SelectionState.selectionhastext = true;
    }

    if (object instanceof GroupSymbol || object.NativeID >= 0) {
      this.SelectionState.ngroupsselected++;
    }

    // Handle active table
    const activeTableId = this.Table_GetActiveID();
    if (activeTableId === object.BlockID) {
      this.Table_UpdateSelectionAttributes(activeTableId, false);
    } else {
      this.HandleTextFormatAttributes(textObject, objectIndex);
    }

    // Handle special object types
    if (object instanceof PolyLineContainer) {
      this.SelectionState.npolylinecontainerselected++;
    }

    if (object.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_CHART) {
      this.SelectionState.projectTableSelected = true;
    }

    if (object.subtype === ConstantData.ObjectSubTypes.SD_SUBT_TASK) {
      this.SelectionState.projectTableSelected = true;
    }

    // Handle polyline objects
    if (object instanceof PolyLine && object.polylist && object.polylist.segs) {
      this.SelectionState.nsegs = object.polylist.segs.length;
      this.SelectionState.polyclosed = object.polylist.closed;
    }

    // Update dimensions flags
    this.SelectionState.dimensions |= object.Dimensions & (
      ConstantData.DimensionFlags.SED_DF_Always | ConstantData.DimensionFlags.SED_DF_Select
    );

    console.log('O.Opt ProcessSelectedObject - Output: Object processed');
  }

  ProcessShapeObject(shape, table) {
    console.log('O.Opt ProcessShapeObject - Input:', { shape, hasTable: !!table });

    this.SelectionState.nshapeselected++;

    if (table) {
      this.SelectionState.ntablesselected++;
    }

    // Handle rectangle corner radius
    if (shape.ShapeType === ConstantData.ShapeType.RECT || shape.ShapeType === ConstantData.ShapeType.RRECT) {
      if (shape.moreflags & ConstantData.ObjMoreFlags.SED_MF_FixedRR) {
        if (this.SelectionState.fixedCornerRadius === -2) {
          this.SelectionState.fixedCornerRadius = 100 * shape.shapeparam;
        } else if (this.SelectionState.fixedCornerRadius !== 100 * shape.shapeparam) {
          this.SelectionState.fixedCornerRadius = -1;
        }
      } else if (this.SelectionState.fixedCornerRadius === -2 && shape.shapeparam === 0) {
        this.SelectionState.fixedCornerRadius = 0;
      } else {
        this.SelectionState.fixedCornerRadius = -1;
      }
    }

    console.log('O.Opt ProcessShapeObject - Output: Shape object processed');
  }

  ProcessConnectorObject(connector) {
    console.log('O.Opt ProcessConnectorObject - Input:', connector);

    this.SelectionState.nconnectorselected++;

    if (connector.AllowCurveOnConnector()) {
      this.SelectionState.connectorCanHaveCurve = true;

      if (this.SelectionState.lineCornerRadius === -2) {
        this.SelectionState.lineCornerRadius = connector.arraylist.curveparam;
      } else if (this.SelectionState.lineCornerRadius !== connector.arraylist.curveparam) {
        this.SelectionState.lineCornerRadius = -1;
      }
    }

    console.log('O.Opt ProcessConnectorObject - Output: Connector object processed');
  }

  ProcessLineObject(line) {
    console.log('O.Opt ProcessLineObject - Input:', line);

    this.SelectionState.nlineselected++;

    const textDirection = line.TextDirection;
    if (this.SelectionState.TextDirection === 0) {
      this.SelectionState.TextDirection = textDirection;
    } else if (this.SelectionState.TextDirection !== textDirection) {
      this.SelectionState.TextDirection = -1;
    }

    if (line.LineType === ConstantData.LineType.SEGLINE) {
      if (this.SelectionState.lineCornerRadius === -2) {
        this.SelectionState.lineCornerRadius = line.segl.curveparam;
      } else if (this.SelectionState.lineCornerRadius !== line.segl.curveparam) {
        this.SelectionState.lineCornerRadius = -1;
      }
    }

    console.log('O.Opt ProcessLineObject - Output: Line object processed');
  }

  HandleTextFormatAttributes(textObject, objectIndex) {
    console.log('O.Opt HandleTextFormatAttributes - Input:', { textObject, objectIndex });

    const TEXT_FACE = ConstantData.TextFace;
    const textData = {};

    const textFormat = textObject.GetTextFormat(true, textData);
    if (textData.hastext) {
      this.SelectionState.selectionhastext = true;
    }

    if (objectIndex === 0) {
      // First object sets the initial values
      this.SelectionState.fontid = textFormat.FontId;
      this.SelectionState.fontsize = textFormat.FontSize;
      this.SelectionState.bold = (textFormat.Face & TEXT_FACE.Bold) > 0;
      this.SelectionState.italic = (textFormat.Face & TEXT_FACE.Italic) > 0;
      this.SelectionState.underline = (textFormat.Face & TEXT_FACE.Underline) > 0;
      this.SelectionState.superscript = (textFormat.Face & TEXT_FACE.Superscript) > 0;
      this.SelectionState.subscript = (textFormat.Face & TEXT_FACE.Subscript) > 0;
    } else {
      // Subsequent objects may cause values to be cleared if they differ
      if (this.SelectionState.fontid !== textFormat.FontId) {
        this.SelectionState.fontid = -1;
      }
      if (this.SelectionState.fontsize !== textFormat.FontSize) {
        this.SelectionState.fontsize = -1;
      }
      if (this.SelectionState.bold !== ((textFormat.Face & TEXT_FACE.Bold) > 0)) {
        this.SelectionState.bold = false;
      }
      if (this.SelectionState.italic !== ((textFormat.Face & TEXT_FACE.Italic) > 0)) {
        this.SelectionState.italic = false;
      }
      if (this.SelectionState.underline !== ((textFormat.Face & TEXT_FACE.Underline) > 0)) {
        this.SelectionState.underline = false;
      }
      if (this.SelectionState.superscript !== ((textFormat.Face & TEXT_FACE.Superscript) > 0)) {
        this.SelectionState.superscript = false;
      }
      if (this.SelectionState.subscript !== ((textFormat.Face & TEXT_FACE.Subscript) > 0)) {
        this.SelectionState.subscript = false;
      }
    }

    console.log('O.Opt HandleTextFormatAttributes - Output: Text format attributes processed');
  }

  GetObjectPtr(blockId, isPreserveBlock) {
    console.log('O.Opt GetObjectPtr - Input:', { blockId, isPreserveBlock });

    const object = GlobalData.objectStore.GetObject(blockId);
    if (object == null || blockId < 0) {
      console.log('O.Opt GetObjectPtr - Output: null (invalid block ID or not found)');
      return null;
    }

    const result = isPreserveBlock ?
      GlobalData.objectStore.PreserveBlock(blockId).Data :
      object.Data;

    console.log('O.Opt GetObjectPtr - Output:', result);
    return result;
  }

  GetClipboardType() {
    console.log('O.Opt GetClipboardType - Input: No parameters');

    // Get the text edit session data
    const tedSession = this.GetObjectPtr(this.theTEDSessionBlockID, false);

    // Initialize clipboard manager
    GlobalData.clipboardManager.Get();

    let clipboardType;

    // Handle case when text editing is active or note editing is active
    if (tedSession.theActiveTextEditObjectID !== -1 || this.bInNoteEdit) {
      if (tedSession.theActiveTableObjectID >= 0 &&
        this.theContentHeader.ClipboardType === ConstantData.ClipboardType.Table &&
        this.theContentHeader.ClipboardBuffer) {
        clipboardType = ConstantData.ClipboardType.Table;
      } else if (this.theTextClipboard && this.theTextClipboard.text) {
        clipboardType = ConstantData.ClipboardType.Text;
      } else {
        clipboardType = ConstantData.ClipboardType.None;
      }
    }
    // Handle case when table is active
    else if (tedSession.theActiveTableObjectID >= 0 &&
      ((this.theContentHeader.ClipboardType === ConstantData.ClipboardType.Table &&
        this.theContentHeader.ClipboardBuffer) ||
        (this.theTextClipboard && this.theTextClipboard.text))) {
      clipboardType = ConstantData.ClipboardType.Table;
    }
    // Handle case when LM content is in clipboard
    else if (GlobalData.optManager.theContentHeader.ClipboardBuffer &&
      this.theContentHeader.ClipboardType === ConstantData.ClipboardType.LM) {
      clipboardType = ConstantData.ClipboardType.LM;
    }
    // Handle case when text is selected and text is in clipboard
    else if (this.GetTargetSelect() >= 0 && this.theTextClipboard && this.theTextClipboard.text) {
      clipboardType = ConstantData.ClipboardType.Text;
    }
    // Default case: no valid clipboard content
    else {
      clipboardType = ConstantData.ClipboardType.None;
    }

    console.log('O.Opt GetClipboardType - Output:', clipboardType);
    return clipboardType;
  }

  GetTargetSelect() {
    console.log('O.Opt GetTargetSelect - Input: No parameters');

    // Get session data
    const sessionData = this.GetObjectPtr(this.theSEDSessionBlockID, false);

    // Check if table is active and update target select if needed
    const activeTableId = this.Table_GetActiveID();
    if (activeTableId >= 0) {
      sessionData.tselect = activeTableId;
    }

    // Default to no selection
    let targetSelectId = -1;

    // Verify the selected object is valid
    if (sessionData.tselect >= 0) {
      const selectedObject = GlobalData.optManager.GetObjectPtr(sessionData.tselect, false);
      if (selectedObject && selectedObject instanceof BaseDrawingObject) {
        targetSelectId = sessionData.tselect;
      }
    }

    console.log('O.Opt GetTargetSelect - Output:', targetSelectId);
    return targetSelectId;
  }

  Table_GetActiveID() {
    console.log('O.Opt Table_GetActiveID - Input: No parameters');

    const activeTableId = this.GetObjectPtr(this.theTEDSessionBlockID, false).theActiveTableObjectID;

    console.log('O.Opt Table_GetActiveID - Output:', activeTableId);
    return activeTableId;
  }

  BuildArrowheadLookupTables() {
    console.log("O.Opt BuildArrowheadLookupTables - Input: No parameters");

    const arrowDefs = new ArrowDefs().uiArrowDefs;
    const arrowSizes = new ArrowSizes().uiarrowSizes;

    // Initialize lookup tables to the correct size
    ConstantData1.ArrowheadLookupTable.length = arrowDefs.length;
    for (let index = 0; index < arrowDefs.length; index++) {
      ConstantData1.ArrowheadLookupTable[arrowDefs[index].id] = arrowDefs[index];
    }

    // Initialize size table to the correct size
    ConstantData1.ArrowheadSizeTable.length = arrowSizes.length;
    for (let index = 0; index < arrowSizes.length; index++) {
      ConstantData1.ArrowheadSizeTable[index] = arrowSizes[index];
    }

    console.log("O.Opt BuildArrowheadLookupTables - Output: Arrowhead lookup tables built");
  }

  SetEditMode(stateMode, cursorType, shouldAddToList, preserveExisting) {
    console.log("O.Opt SetEditMode - Input:", { stateMode, cursorType, shouldAddToList, preserveExisting });

    let actualCursorType = cursorType;

    // Initialize edit mode list if needed
    if (this.editModeList && (shouldAddToList || preserveExisting)) {
      // Keep existing list
    } else {
      this.editModeList = [];
    }

    // Notify business manager if available
    if (GlobalData.gBusinessManager && GlobalData.gBusinessManager.NotifySetEditMode) {
      GlobalData.gBusinessManager.NotifySetEditMode(stateMode);
    }

    // If no cursor type provided, determine it based on state mode
    if (!actualCursorType) {
      switch (stateMode) {
        case ConstantData.EditState.STAMP:
          actualCursorType = ConstantData.CursorType.STAMP;
          break;
        case ConstantData.EditState.TEXT:
          actualCursorType = ConstantData.CursorType.TEXT;
          break;
        case ConstantData.EditState.FORMATPAINT:
          actualCursorType = ConstantData.CursorType.PAINT;
          break;
        case ConstantData.EditState.LINKCONNECT:
          actualCursorType = ConstantData.CursorType.ANCHOR;
          break;
        case ConstantData.EditState.LINKJOIN:
          actualCursorType = ConstantData.CursorType.EDIT_CLOSE;
          break;
        case ConstantData.EditState.EDIT:
          actualCursorType = ConstantData.CursorType.EDIT;
          break;
        case ConstantData.EditState.DRAGCONTROL:
          actualCursorType = ConstantData.CursorType.NESW_RESIZE;
          break;
        case ConstantData.EditState.DRAGSHAPE:
          actualCursorType = ConstantData.CursorType.MOVE;
          break;
        case ConstantData.EditState.GRAB:
          actualCursorType = ConstantData.CursorType.GRAB;
          break;
        default:
          actualCursorType = ConstantData.CursorType.DEFAULT;
      }
    }

    // Set the cursor
    this.svgDoc.SetCursor(actualCursorType);

    // Update edit mode list
    if (shouldAddToList || !this.editModeList.length) {
      this.editModeList.push({
        mode: stateMode,
        cursor: actualCursorType
      });
    } else {
      this.editModeList[this.editModeList.length - 1].mode = stateMode;
      this.editModeList[this.editModeList.length - 1].cursor = actualCursorType;
    }

    // Update cursors for highlighted shape
    if (this.curHiliteShape >= 0) {
      const highlightedObject = GlobalData.objectStore.GetObject(this.curHiliteShape);
      if (highlightedObject) {
        highlightedObject.Data.SetCursors();
      }
    }

    console.log("O.Opt SetEditMode - Output:", { mode: stateMode, cursor: actualCursorType });
  }

  ShowXY(showCoordinates) {
    console.log("O.Opt ShowXY - Input:", { showCoordinates });
    // Show the x and y coordinates of the mouse pointer
    console.log("O.Opt ShowXY - Output: Coordinates display updated");
  }

  UpdateDisplayCoordinates(dimensions, position, cursorType, drawingObject) {
    console.log("O.Opt UpdateDisplayCoordinates - Input:", {
      dimensions,
      position,
      cursorType,
      drawingObject: drawingObject ? drawingObject.BlockID : null
    });

    // Set default cursor type if not provided
    if (cursorType == null) {
      cursorType = CollabOverlayContoller.CursorTypes.Default;
    }

    // Handle collaboration cursor movement
    if (Collab.IsCollaborating() && position) {
      const currentTime = Date.now();
      if (currentTime - Collab.MoveTimestamp > Collab.MoveDelay) {
        const message = {
          CursorType: cursorType
        };
        Collab.Animation_BuildMessage(
          position.x,
          position.y,
          ConstantData.Collab_AnimationMessages.CursorMove,
          message
        );
        Collab.MoveTimestamp = currentTime;
      }
    }

    // Update ruler displays if rulers are enabled
    if (GlobalData.docHandler.documentConfig.showRulers) {
      let showFractionalInches = 0;
      let showFeetAsInches = 0;
      const useFeet = GlobalData.docHandler.rulerSettings.useInches &&
        GlobalData.docHandler.rulerSettings.units === ConstantData.RulerUnits.SED_Feet;

      // Configure display options for feet/inch mode
      if (useFeet) {
        showFractionalInches = showFeetAsInches = ConstantData.DimensionFlags.SED_DF_ShowFractionalInches;
        if (drawingObject) {
          showFeetAsInches = Utils.SetFlag(
            showFractionalInches,
            ConstantData.DimensionFlags.SED_DF_ShowFeetAsInches,
            (drawingObject.Dimensions & ConstantData.DimensionFlags.SED_DF_ShowFeetAsInches) > 0
          );
        }
      }

      // Update dimension display
      if (dimensions) {
        const xLength = this.GetLengthInRulerUnits(dimensions.x, false, GlobalData.docHandler.rulerSettings.originx, showFractionalInches);
        const yLength = this.GetLengthInRulerUnits(dimensions.y, false, GlobalData.docHandler.rulerSettings.originy, showFractionalInches);
        const width = this.GetLengthInRulerUnits(dimensions.width, false, null, showFeetAsInches);
        const height = this.GetLengthInRulerUnits(dimensions.height, false, null, showFeetAsInches);

        // Helper function to format number values for display (assuming it's defined elsewhere)
        const formatValue = (value) => value ? value : "";

        // Update UI controls with the dimension values
        const workArea = Resources.Controls.WorkArea;

        const leftEdit = workArea.LeftEdit;
        leftEdit.GetControl();
        if (leftEdit.Control) {
          leftEdit.Control[0].value = formatValue(NumberToString(xLength, useFeet));
        }

        const topEdit = workArea.TopEdit;
        topEdit.GetControl();
        if (topEdit.Control) {
          topEdit.Control[0].value = formatValue(NumberToString(yLength, useFeet));
        }

        const widthEdit = workArea.WidthEdit;
        widthEdit.GetControl();
        if (widthEdit.Control) {
          widthEdit.Control[0].value = formatValue(NumberToString(width, useFeet));
        }

        const heightEdit = workArea.HeightEdit;
        heightEdit.GetControl();
        if (heightEdit.Control) {
          heightEdit.Control[0].value = formatValue(NumberToString(height, useFeet));
        }
      }

      // Constrain position to document bounds
      if (position) {
        position.x = Math.max(0, position.x);
        position.y = Math.max(0, position.y);

        const sessionBlock = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
        position.x = Math.min(sessionBlock.dim.x, position.x);
        position.y = Math.min(sessionBlock.dim.y, position.y);
      }
    }

    console.log("O.Opt UpdateDisplayCoordinates - Output: Coordinates updated in UI");
  }

  IsWheelClick(event) {
    console.log("O.Opt IsWheelClick - Input:", event);

    let isMiddleButtonClick = false;

    // Handle different event types
    if (event.gesture) {
      event = event.gesture.srcEvent;
    }

    if (event instanceof MouseEvent) {
      // Button 2 is middle button
      isMiddleButtonClick = (event.which === 2);
    } else if ('onpointerdown' in window && event instanceof PointerEvent) {
      isMiddleButtonClick = (event.which === 2);
    }

    console.log("O.Opt IsWheelClick - Output:", isMiddleButtonClick);
    return isMiddleButtonClick;
  }

  RubberBandSelect_Cancel(event) {
    console.log("O.Opt RubberBandSelect_Cancel - Input:", event);

    if (GlobalData.optManager.theRubberBand) {
      // Unbind related event handlers
      GlobalData.optManager.WorkAreaHammer.off('drag');
      GlobalData.optManager.WorkAreaHammer.off('dragend');

      // Restore default drag start handler
      GlobalData.optManager.WorkAreaHammer.on('dragstart', DefaultEvt.Evt_WorkAreaHammerDragStart);

      // Clean up resources
      GlobalData.optManager.ResetAutoScrollTimer();
      GlobalData.optManager.svgOverlayLayer.RemoveElement(GlobalData.optManager.theRubberBand);

      // Reset rubber band properties
      GlobalData.optManager.theRubberBand = null;
      GlobalData.optManager.theRubberBandStartX = 0;
      GlobalData.optManager.theRubberBandStartY = 0;
      GlobalData.optManager.theRubberBandFrame = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      };
    }

    console.log("O.Opt RubberBandSelect_Cancel - Output: Rubber band selection canceled");
  }

  SetUIAdaptation(event) {
  }

  SetDocumentScale(scaleFactor, isAnimated) {
    console.log('O.Opt SetDocumentScale: input', { scaleFactor, isAnimated });

    if (this.svgDoc) {
      GlobalData.docHandler.SetZoomFactor(scaleFactor, isAnimated);
    }

    console.log('O.Opt SetDocumentScale: output');
  }

  UpdateDocumentScale() {
    console.log('O.Opt UpdateDocumentScale: input');

    if (this.svgDoc) {
      const activeEdit = this.svgDoc.GetActiveEdit();

      if (!activeEdit) {
        this.HideAllSVGSelectionStates();
        this.RenderAllSVGSelectionStates();
      }

      // Double IdleZoomControls();
    }

    console.log('O.Opt UpdateDocumentScale: output');
  }

  HideAllSVGSelectionStates() {
    console.log('O.Opt HideAllSVGSelectionStates: input');

    const selectedList = this.GetObjectPtr(this.theSelectedListBlockID, false);
    this.SetDimensionVisibility(selectedList, false);

    if (!GlobalData.optManager.FromOverlayLayer) {
      this.svgOverlayLayer.RemoveAll();
    }

    this.ClearAllActionArrowTimers();
    this.ShowOverlayLayer();

    console.log('O.Opt HideAllSVGSelectionStates: output');
  }

  SetDimensionVisibility(objects, isVisible) {
    console.log('O.Opt SetDimensionVisibility: input', { objects, isVisible });

    let objectCount = objects.length;
    for (let i = 0; i < objectCount; i++) {
      let object = GlobalData.optManager.GetObjectPtr(objects[i], false);
      if (object && object.ShowOrHideDimensions) {
        object.ShowOrHideDimensions(isVisible);
      }
    }

    console.log('O.Opt SetDimensionVisibility: output');
  }

  IsRightClick(event) {
    console.log('O.Opt isRightClick: input', event);

    let isRightClick = false;

    if (event.gesture) {
      event = event.gesture.srcEvent;
    }

    if (event instanceof MouseEvent) {
      isRightClick = (event.which === 3 || (event.ctrlKey && event.metaKey));
    } else if ('onpointerdown' in window && event instanceof PointerEvent) {
      isRightClick = (event.which === 3);
    }

    console.log('O.Opt isRightClick: output', isRightClick);
    return isRightClick;
  }

  ClearSelectionClick() {
    console.log('O.Opt ClearSelectionClick: input');

    this.CloseEdit();
    this.ClearAnySelection(false);
    this.UpdateSelectionAttributes(null);

    console.log('O.Opt ClearSelectionClick: output');
  }

  CloseEdit(skipShapeClose: boolean, closeOption: any, skipTooltipProcessing: boolean) {
    console.log("O.Opt CloseEdit - Input:", { skipShapeClose, closeOption, skipTooltipProcessing });
    if (!Collab.IsProcessingMessage()) {
      let isNudgeActive = false;
      if (this.NudgeOpen) {
        isNudgeActive = true;
        GlobalData.optManager.CloseOpenNudge();
      }
      if (!skipTooltipProcessing) {
        this.HandleDataTooltipClose(true);
      }
      this.SetFormatPainter(true, false);
      this.DeactivateAllTextEdit(false, !skipShapeClose);
      if (this.bInNoteEdit) {
        this.Note_CloseEdit();
      }
      if (!skipShapeClose) {
        this.CloseShapeEdit(closeOption);
      }
    }
    console.log("O.Opt CloseEdit - Output: done");
  }

  ClearAnySelection(preserveBlock: boolean) {
    console.log("O.Opt ClearAnySelection - Input:", { preserveBlock });
    const selectedList = this.GetObjectPtr(this.theSelectedListBlockID, preserveBlock);
    if (selectedList.length !== 0) {
      this.SetTargetSelect(-1, preserveBlock);
      this.HideAllSVGSelectionStates();
      selectedList.length = 0;
    }
    console.log("O.Opt ClearAnySelection - Output: selection cleared");
  }

  SetTargetSelect(targetId: number, preserveSession: boolean) {
    console.log("O.Opt SetTargetSelect - Input:", { targetId, preserveSession });
    let sessionData = this.GetObjectPtr(this.theSEDSessionBlockID, preserveSession);
    sessionData.tselect = targetId;
    let dimensions: any = null;
    if (targetId > 0) {
      const drawingObject = this.GetObjectPtr(targetId, false);
      if (drawingObject && drawingObject instanceof BaseDrawingObject) {
        dimensions = drawingObject.GetDimensionsForDisplay();
      } else {
        targetId = -1;
        sessionData.tselect = targetId;
      }
    }
    if (dimensions) {
      this.ShowFrame(true);
      this.UpdateDisplayCoordinates(dimensions, null, null, /* drawingObject */ null);
    } else {
      this.ShowFrame(false);
    }
    console.log("O.Opt SetTargetSelect - Output:", { targetId: sessionData.tselect, dimensions });
  }

  ShowFrame(isShowFrame: boolean) {
    console.log('O.Opt ShowFrame - Input:', { isShowFrame });

    const isShowRulers = GlobalData.docHandler.documentConfig.showRulers;

    if (!isShowRulers) {
      console.log('O.Opt ShowFrame - Output: Rulers are not shown');
      return;
    }

    // Double show frame details

    console.log('O.Opt ShowFrame - Output: Frame visibility set to', isShowFrame);
  }

  StartRubberBandSelect(event: any) {
    console.log('O.Opt StartRubberBandSelect - Input event:', event);
    try {
      if (GlobalData.docHandler.IsReadOnly()) {
        console.log('O.Opt StartRubberBandSelect - Document is read-only; aborting.');
        return;
      }

      if (this.cachedWidth) {
        try {
          GlobalData.optManager.CloseEdit();
          GlobalData.optManager.ChangeWidth(this.cachedWidth);
        } catch (error) {
          GlobalData.optManager.ExceptionCleanup(error);
          throw error;
        }
      }
      if (this.cachedHeight) {
        try {
          GlobalData.optManager.CloseEdit();
          GlobalData.optManager.ChangeHeight(this.cachedHeight);
        } catch (error) {
          GlobalData.optManager.ExceptionCleanup(error);
          throw error;
        }
      }
      if (this.currentModalOperation === ConstantData2.ModalOperations.FORMATPAINTER) {
        if (this.FormatPainterSticky) {
          console.log('O.Opt StartRubberBandSelect - FormatPainterSticky active; aborting.');
          return;
        }
        this.SetFormatPainter(true, false);
      }

      // Ensure any active edit is closed
      this.GetObjectPtr(this.theTEDSessionBlockID, false);
      GlobalData.optManager.CloseEdit();

      // Create the rubber band shape as a rectangle
      const rubberBandShape = this.svgDoc.CreateShape(ConstantData.CreateShapeType.RECT);
      rubberBandShape.SetStrokeColor('black');
      if (GlobalData.optManager.isAndroid) {
        rubberBandShape.SetFillColor('none');
        rubberBandShape.SetFillOpacity(0);
      } else {
        rubberBandShape.SetFillColor('black');
        rubberBandShape.SetFillOpacity(0.03);
      }

      const zoomFactorInverse = 1 / GlobalData.docHandler.GetZoomFactor();
      rubberBandShape.SetStrokeWidth(1 * zoomFactorInverse);

      if (!GlobalData.optManager.isAndroid) {
        const strokePattern = 2 * zoomFactorInverse + ',' + zoomFactorInverse;
        rubberBandShape.SetStrokePattern(strokePattern);
      }

      // Convert window coordinates to document coordinates
      const startCoordinates = this.svgDoc.ConvertWindowToDocCoords(
        event.gesture.center.clientX,
        event.gesture.center.clientY
      );
      GlobalData.optManager.theRubberBandStartX = startCoordinates.x;
      GlobalData.optManager.theRubberBandStartY = startCoordinates.y;
      rubberBandShape.SetSize(1, 1);
      rubberBandShape.SetPos(startCoordinates.x, startCoordinates.y);
      GlobalData.optManager.svgOverlayLayer.AddElement(rubberBandShape);

      console.log('O.Opt StartRubberBandSelect - Rubber band shape created:', rubberBandShape);
      GlobalData.optManager.theRubberBand = rubberBandShape;
      GlobalData.optManager.EndStampSession();

      // Bind hammer events for the rubber band dragging
      GlobalData.optManager.WorkAreaHammer.on('drag', DefaultEvt.Evt_RubberBandDrag);
      GlobalData.optManager.WorkAreaHammer.on('dragend', DefaultEvt.Evt_RubberBandDragEnd);

      console.log('O.Opt StartRubberBandSelect - Output rubber band set successfully:', GlobalData.optManager.theRubberBand);
    } catch (error) {
      console.log('O.Opt StartRubberBandSelect - Error:', error);
      GlobalData.optManager.RubberBandSelectExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }
  }

  HandleDataTooltipClose(isCompleteOperation) {
    console.log('O.Opt HandleDataTooltipClose - Input:', { isCompleteOperation });

    this.ClearFieldDataDatePicker();

    if (this.ActiveDataTT && this.ActiveDataTT.dataChanged) {
      this.CompleteOperation(null, isCompleteOperation);
      this.ActiveDataTT.dataChanged = false;
    }

    console.log('O.Opt HandleDataTooltipClose - Output: done');
  }

  ClearFieldDataDatePicker() {
    console.log('O.Opt ClearFieldDataDatePicker - Input:');

    if (this._curDatePickerElem && this._curDatePickerElem.datepicker) {
      this._curDatePickerElem.datepicker('hide');
    }

    this._curDatePickerElem = null;

    console.log('O.Opt ClearFieldDataDatePicker - Output: DatePicker cleared');
  }

  ClearAllActionArrowTimers() {
    console.log('O.Opt ClearAllActionArrowTimers: input');

    const visibleObjects = this.VisibleZList();
    for (let i = 0; i < visibleObjects.length; i++) {
      const object = this.GetObjectPtr(visibleObjects[i], false);
      if (object && object.actionArrowHideTimerID !== -1) {
        this.actionArrowHideTimer.clearTimeout(object.actionArrowHideTimerID);
        object.actionArrowHideTimerID = -1;
      }
    }

    console.log('O.Opt ClearAllActionArrowTimers: output');
  }

  VisibleZList() {
    console.log('O.Opt VisibleZList: input');

    const layersManager = GlobalData.optManager.GetObjectPtr(this.theLayersManagerBlockID, false);
    const layers = layersManager.layers;
    const numberOfLayers = layersManager.nlayers;
    const activeLayerIndex = layersManager.activelayer;
    let visibleZList = [];

    for (let i = numberOfLayers - 1; i >= 0; i--) {
      const layer = layers[i];
      if (i === activeLayerIndex || (layer.flags & ConstantData.LayerFlags.SDLF_Visible)) {
        visibleZList = visibleZList.concat(layer.zList);
      }
    }

    console.log('O.Opt VisibleZList: output', visibleZList);
    return visibleZList;
  }

  ShowOverlayLayer() {
    console.log('O.Opt ShowOverlayLayer: input');
    this.svgOverlayLayer.SetVisible(true);
    console.log('O.Opt ShowOverlayLayer: output');
  }

  RenderAllSVGSelectionStates() {
    console.log('O.Opt RenderAllSVGSelectionStates - Input: No parameters');

    // Get the visible objects list and the currently selected objects
    const visibleObjectIds = this.ActiveVisibleZList();
    const visibleObjectCount = visibleObjectIds.length;
    const selectedList = GlobalData.objectStore.GetObject(this.theSelectedListBlockID).Data;

    let objectIndex = 0;
    let indexInSelectedList = -1;
    let objectId = 0;
    let drawingObject = null;
    let svgElement = null;
    let actionTriggerElement = null;
    let actionTriggerId = null;
    const targetSelectedId = this.GetTargetSelect();

    // List of dimension element types to check for visibility
    const dimensionElementTypes = [
      ConstantData.SVGElementClass.DIMENSIONLINE,
      ConstantData.SVGElementClass.DIMENSIONTEXT,
      ConstantData.SVGElementClass.AREADIMENSIONLINE,
      ConstantData.SVGElementClass.DIMENSIONTEXTNOEDIT
    ];

    // Create action click handler factory
    const createActionClickHandler = function (drawingObject) {
      return function (event) {
        if (ConstantData.DocumentContext.HTMLFocusControl &&
          ConstantData.DocumentContext.HTMLFocusControl.blur) {
          ConstantData.DocumentContext.HTMLFocusControl.blur();
        }
        drawingObject.LM_ActionClick(event);
        return false;
      };
    };

    // Process each visible object
    for (objectIndex = 0; objectIndex < visibleObjectCount; ++objectIndex) {
      objectId = visibleObjectIds[objectIndex];

      // Skip if object is not in selection list or has issues
      indexInSelectedList = selectedList.indexOf(objectId);
      if (indexInSelectedList < 0 ||
        (drawingObject = GlobalData.optManager.GetObjectPtr(objectId, false)) === null ||
        drawingObject.flags & ConstantData.ObjFlags.SEDO_NotVisible ||
        (svgElement = this.svgObjectLayer.GetElementByID(objectId)) === null ||
        svgElement.GetElementByID(ConstantData.SVGElementClass.SHAPE) === null) {
        continue;
      }

      // Handle action triggers
      actionTriggerId = ConstantData.Defines.Action + objectId;
      actionTriggerElement = this.svgOverlayLayer.GetElementByID(actionTriggerId);

      if (actionTriggerElement === null &&
        (actionTriggerElement = drawingObject.CreateActionTriggers(this.svgDoc, objectId, svgElement, targetSelectedId)) !== null) {

        this.svgOverlayLayer.AddElement(actionTriggerElement);

        try {
          actionTriggerElement.SetRotation(drawingObject.RotationAngle);
        } catch (error) {
          throw error;
        }

        // Add interaction events if object is not locked
        if ((drawingObject.flags & ConstantData.ObjFlags.SEDO_Lock) === 0 &&
          !GlobalData.docHandler.IsReadOnly() &&
          !drawingObject.NoGrow()) {

          const domElement = actionTriggerElement.DOMElement();
          const hammerInstance = Hammer(domElement);

          hammerInstance.on('tap', DefaultEvt.Evt_ActionTriggerTap);
          hammerInstance.on('dragstart', createActionClickHandler(drawingObject));

          if (this.isGestureCapable) {
            hammerInstance.on('pinchin', DefaultEvt.Evt_WorkAreaHammerPinchIn);
            hammerInstance.on('pinchout', DefaultEvt.Evt_WorkAreaHammerPinchOut);
            hammerInstance.on('transformend', DefaultEvt.Evt_WorkAreaHammerPinchEnd);
          }

          actionTriggerElement.SetEventProxy(hammerInstance);
        }
      }

      // Handle dimension visibility
      if (drawingObject.Dimensions & ConstantData.DimensionFlags.SED_DF_Select) {
        let elementId;
        let currentElement = null;

        // Set opacity for dimension elements based on selection state
        for (let elementIndex = svgElement.ElementCount() - 1; elementIndex >= 1; elementIndex--) {
          currentElement = svgElement.GetElementByIndex(elementIndex);
          elementId = currentElement.GetID();

          if (dimensionElementTypes.indexOf(elementId) >= 0) {
            currentElement.SetOpacity(indexInSelectedList >= 0 ? 1 : 0);
          }
        }
      }
    }

    console.log('O.Opt RenderAllSVGSelectionStates - Output: Selection states rendered');
  }

  ActiveVisibleZList() {
    console.log('O.Opt ActiveVisibleZList: input');

    const layersManager = GlobalData.optManager.GetObjectPtr(this.theLayersManagerBlockID, false);
    const layers = layersManager.layers;
    const numberOfLayers = layersManager.nlayers;
    const activeLayerIndex = layersManager.activelayer;
    let visibleZList = [];

    for (let i = numberOfLayers - 1; i >= 0; i--) {
      const layer = layers[i];
      if (i === activeLayerIndex || (layer.flags & ConstantData.LayerFlags.SDLF_Visible && layer.flags & ConstantData.LayerFlags.SDLF_Active)) {
        visibleZList = visibleZList.concat(layer.zList);
      }
    }

    console.log('O.Opt ActiveVisibleZList: output', visibleZList);
    return visibleZList;
  }

  SetFormatPainter(shouldDisable: boolean, makeSticky: boolean) {
    console.log("O.Opt SetFormatPainter - Input:", { shouldDisable, makeSticky });

    let targetObject;
    let tableObject;
    let activeTableId;
    let tableCell;
    let tableRow;
    let tableCol;

    // If format painter is already active, disable it
    if (this.currentModalOperation === ConstantData2.ModalOperations.FORMATPAINTER) {
      this.currentModalOperation = ConstantData2.ModalOperations.NONE;
      this.SetEditMode(ConstantData.EditState.DEFAULT);
      this.FormatPainterSticky = false;
      console.log("O.Opt SetFormatPainter - Output: Format painter disabled");
      return;
    }

    // If not disabling, set up format painter based on current selection/context
    if (!shouldDisable) {
      // Cancel any existing modal operation
      this.CancelModalOperation();

      // Get current text edit and active table
      const activeTextEdit = GlobalData.optManager.GetActiveTextEdit();
      activeTableId = GlobalData.optManager.Table_GetActiveID();

      // CASE 1: If text is being edited, set up text format painter
      if (activeTextEdit != null) {
        this.currentModalOperation = ConstantData2.ModalOperations.FORMATPAINTER;
        this.FormatPainterMode = ConstantData2.FormatPainterModes.TEXT;
        this.FormatPainterSticky = makeSticky;

        const activeEdit = this.svgDoc.GetActiveEdit();
        if (activeEdit) {
          this.FormatPainterText = activeEdit.GetSelectedFormat();
          this.FormatPainterStyle = {
            StyleRecord: {}
          };
          this.FormatPainterStyle.Text = new TextFormatData();
          this.TextStyleToSDText(this.FormatPainterStyle.Text, this.FormatPainterText);
          this.SetEditMode(ConstantData.EditState.FORMATPAINT);
        }
      }
      // CASE 2: If a table is active, set up table format painter
      else if (activeTableId >= 0) {
        if ((tableObject = this.GetObjectPtr(activeTableId, false)) &&
          (tableCell = tableObject.GetTable(false))) {

          // If a cell is selected
          if (tableCell.select >= 0) {
            this.currentModalOperation = ConstantData2.ModalOperations.FORMATPAINTER;
            this.FormatPainterSticky = makeSticky;
            this.FormatPainterMode = ConstantData2.FormatPainterModes.TABLE;
            this.FormatPainterStyle = {
              StyleRecord: {}
            };

            const selectedCell = tableCell.cells[tableCell.select];
            this.FormatPainterStyle.Text = Utils1.DeepCopy(selectedCell.Text);
            this.FormatPainterStyle.hline = Utils1.DeepCopy(selectedCell.hline);
            this.FormatPainterStyle.vline = Utils1.DeepCopy(selectedCell.vline);
            this.FormatPainterStyle.Fill = Utils1.DeepCopy(selectedCell.fill);
            this.FormatPainterStyle.vjust = selectedCell.vjust;
            this.FormatPainterStyle.just = selectedCell.just;
            this.FormatPainterText = this.CalcDefaultInitialTextStyle(this.FormatPainterStyle.Text);

            const paraFormat = {};
            paraFormat.just = selectedCell.just;
            paraFormat.bullet = 'none';
            paraFormat.spacing = 0;

            const tableElement = this.svgObjectLayer.GetElementByID(tableObject.BlockID);
            this.Table_GetTextParaFormat(tableCell, paraFormat, tableElement, false, false, tableCell.select);
            this.FormatPainterParaFormat = paraFormat;
            this.SetEditMode(ConstantData.EditState.FORMATPAINT);
          }
          // If a row is selected
          else if (tableCell.rselect >= 0) {
            this.currentModalOperation = ConstantData2.ModalOperations.FORMATPAINTER;
            this.FormatPainterSticky = makeSticky;
            this.FormatPainterMode = ConstantData2.FormatPainterModes.TABLE;
            this.FormatPainterStyle = {
              StyleRecord: {}
            };

            tableRow = tableCell.rows[tableCell.rselect];
            const firstCell = tableCell.cells[tableRow.start + tableRow.segments[0].start];
            this.FormatPainterStyle.hline = Utils1.DeepCopy(firstCell.hline);
            this.SetEditMode(ConstantData.EditState.FORMATPAINT);
          }
          // If a column is selected
          else if (tableCell.cselect >= 0) {
            this.currentModalOperation = ConstantData2.ModalOperations.FORMATPAINTER;
            this.FormatPainterSticky = makeSticky;
            this.FormatPainterMode = ConstantData2.FormatPainterModes.TABLE;
            this.FormatPainterStyle = {
              StyleRecord: {}
            };

            tableCol = tableCell.cols[tableCell.cselect];
            this.FormatPainterStyle.vline = Utils1.DeepCopy(tableCol.vline);
            this.SetEditMode(ConstantData.EditState.FORMATPAINT);
          }
        }
      }
      // CASE 3: If a shape/object is selected, set up object format painter
      else if ((targetObject = this.GetTargetSelect()) >= 0 &&
        (tableObject = this.GetObjectPtr(targetObject, false))) {

        this.currentModalOperation = ConstantData2.ModalOperations.FORMATPAINTER;
        this.FormatPainterSticky = makeSticky;
        this.FormatPainterMode = ConstantData2.FormatPainterModes.OBJECT;
        this.FormatPainterStyle = Utils1.DeepCopy(tableObject.StyleRecord);
        this.FormatPainterStyle.Border = Utils1.DeepCopy(tableObject.StyleRecord.Line);

        // Special handling for images, symbols, and groups
        if ((tableObject.ImageURL ||
          tableObject.SymbolURL ||
          tableObject instanceof GroupSymbol) &&
          !(tableObject instanceof SVGFragmentSymbol)) {

          delete this.FormatPainterStyle.Fill;
          delete this.FormatPainterStyle.Name;

          if (tableObject.StyleRecord.Line.Thickness === 0 ||
            tableObject instanceof GroupSymbol) {
            delete this.FormatPainterStyle.Line;
            delete this.FormatPainterStyle.Border;
          }
        }

        this.FormatPainterText = tableObject.GetTextFormat(false, null);

        if (this.FormatPainterText === null) {
          this.FormatPainterText = this.CalcDefaultInitialTextStyle(this.FormatPainterStyle.Text);
        }

        this.FormatPainterParaFormat = tableObject.GetTextParaFormat(false);
        this.FormatPainterArrows = tableObject.GetArrowheadFormat();
        this.SetEditMode(ConstantData.EditState.FORMATPAINT);
      }
    }

    console.log("O.Opt SetFormatPainter - Output:", {
      mode: this.FormatPainterMode,
      isSticky: this.FormatPainterSticky,
      currentModalOperation: this.currentModalOperation
    });
  }

  DeactivateAllTextEdit(skipShapeClose: boolean, closeOption: any) {
    console.log('O.Opt DeactivateAllTextEdit - Input:', { skipShapeClose, closeOption });

    const tedSession = this.GetObjectPtr(this.theTEDSessionBlockID, false);
    if (tedSession.theActiveTextEditObjectID !== -1) {
      this.DeactivateTextEdit(skipShapeClose, closeOption);
    } else {
      const activeEdit = this.svgDoc.GetActiveEdit();
      if (activeEdit != null && activeEdit.ID === ConstantData.SVGElementClass.DIMENSIONTEXT) {
        this.TEUnregisterEvents();
      }
    }

    console.log('O.Opt DeactivateAllTextEdit - Output: done');
  }

  TEUnregisterEvents(event) {
    console.log('O.Opt TEUnregisterEvents - Input:', event);

    this.svgDoc.ClearActiveEdit(event);

    if (this.textEntryTimer != null) {
      clearTimeout(this.textEntryTimer);
      this.textEntryTimer = null;
    }

    if (this.TETextHammer) {
      this.TETextHammer.off('dragstart');
      this.TETextHammer.dispose();
      this.TETextHammer = null;
    }

    if (this.TEClickAreaHammer) {
      this.TEClickAreaHammer.off('dragstart');
      this.TEClickAreaHammer.dispose();
      this.TEClickAreaHammer = null;
    }

    if (this.TEDecAreaHammer) {
      this.TEDecAreaHammer.off('dragstart');
      this.TEDecAreaHammer.dispose();
      this.TEDecAreaHammer = null;
    }

    if (this.TEWorkAreaHammer) {
      this.TEWorkAreaHammer.off('drag');
      this.TEWorkAreaHammer.off('dragend');
      this.TEWorkAreaHammer.dispose();
      this.TEWorkAreaHammer = null;
    }

    console.log('O.Opt TEUnregisterEvents - Output: done');
  }

  CloseShapeEdit(providedOutlineId, useAlternate, alternateOutlineId) {
    console.log("O.Opt CloseShapeEdit - Input:", { providedOutlineId, useAlternate, alternateOutlineId });

    let sessionData = this.GetObjectPtr(this.theTEDSessionBlockID, false);
    let activeOutlineId = sessionData.theActiveOutlineObjectID;

    // If using the alternate outline id then override activeOutlineId.
    if (useAlternate) {
      activeOutlineId = alternateOutlineId;
    }

    if (activeOutlineId >= 0) {
      // If the provided outline id is boolean true or already the active id, do nothing.
      if (providedOutlineId === true) {
        console.log("O.Opt CloseShapeEdit - Output: Skipping close because providedOutlineId is true");
        return;
      }
      if (providedOutlineId === activeOutlineId) {
        console.log("O.Opt CloseShapeEdit - Output: Provided outline id equals active outline id, no action taken");
        return;
      }
      let shapeObject = this.GetObjectPtr(activeOutlineId, false);
      if (shapeObject) {
        if (shapeObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
          console.log("O.Opt CloseShapeEdit - Output: Active outline is a floorplan wall, skipping close");
          return;
        }
        // Begin secondary edit and re-fetch the shape object.
        Collab.BeginSecondaryEdit();
        shapeObject = this.GetObjectPtr(activeOutlineId, false);
        if (
          shapeObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.LINE &&
          shapeObject.LineType === ConstantData.LineType.POLYLINE &&
          shapeObject.polylist.closed &&
          (this.PolyLineToShape(activeOutlineId), Collab.AllowMessage())
        ) {
          const messagePayload = { BlockID: activeOutlineId };
          Collab.BuildMessage(ConstantData.CollabMessages.CloseShapeEdit, messagePayload, false);
        }
      }
      if (!useAlternate) {
        // Reset the active outline id.
        sessionData = this.GetObjectPtr(this.theTEDSessionBlockID, true);
        sessionData.theActiveOutlineObjectID = -1;
      }
      this.CompleteOperation();
    }
    console.log("O.Opt CloseShapeEdit - Output: Operation complete");
  }

  EndStampSession() {
    console.log('O.Opt EndStampSession - Input');

    const editMode = GlobalData.optManager.GetEditMode();
    if (editMode === ConstantData.EditState.STAMP) {
      this.theActionStoredObjectID = -1;
      this.CancelObjectDragDrop(true);

      if (GlobalData.optManager.MainAppHammer) {
        GlobalData.optManager.UnbindDragDropOrStamp();
      }
    }

    console.log('O.Opt EndStampSession - Output: done');
  }

  GetEditMode() {
    console.log('O.Opt GetEditMode - Input');

    const editModeList = this.editModeList || [];
    let currentEditMode = ConstantData.EditState.DEFAULT;

    if (editModeList.length) {
      currentEditMode = editModeList[editModeList.length - 1].mode;
    }

    console.log('O.Opt GetEditMode - Output:', currentEditMode);
    return currentEditMode;
  }

  AutoScrollCommon(event, snapEnabled, callback) {
    console.log("O.Opt AutoScrollCommon - Input:", { event, snapEnabled, callback });

    let clientX: number, clientY: number;
    let requiresAutoScroll = false;

    // Disable snap if override key is pressed
    if (this.OverrideSnaps(event)) {
      snapEnabled = false;
    }

    // Get client coordinates from gesture or mouse event
    if (event.gesture) {
      clientX = event.gesture.center.clientX;
      clientY = event.gesture.center.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    // Initialize new positions with the current coordinates
    let newX = clientX;
    let newY = clientY;

    // Cache document display info for readability
    const docInfo = GlobalData.optManager.svgDoc.docInfo;
    const dispX = docInfo.dispX;
    const dispY = docInfo.dispY;
    const dispWidth = docInfo.dispWidth;
    const dispHeight = docInfo.dispHeight;

    // Check horizontal boundaries
    if (clientX >= dispX + dispWidth - 8) {
      requiresAutoScroll = true;
      newX = dispX + dispWidth - 8 + 32;
    }
    if (clientX < dispX) {
      requiresAutoScroll = true;
      newX = dispX - 32;
    }

    // Check vertical boundaries
    if (clientY >= dispY + dispHeight - 8) {
      requiresAutoScroll = true;
      newY = dispY + dispHeight - 8 + 32;
    }
    if (clientY < dispY) {
      requiresAutoScroll = true;
      newY = dispY - 32;
    }

    if (requiresAutoScroll) {
      // Apply snapping if enabled and allowed
      if (snapEnabled && GlobalData.docHandler.documentConfig.enableSnap) {
        let snapPoint = { x: newX, y: newY };
        snapPoint = GlobalData.docHandler.SnapToGrid(snapPoint);
        newX = snapPoint.x;
        newY = snapPoint.y;
      }
      GlobalData.optManager.autoScrollXPos = newX;
      GlobalData.optManager.autoScrollYPos = newY;
      if (GlobalData.optManager.autoScrollTimerID !== -1) {
        console.log("O.Opt AutoScrollCommon - Output: Auto scroll already scheduled");
        return false;
      } else {
        GlobalData.optManager.autoScrollTimerID = GlobalData.optManager.autoScrollTimer.setTimeout(callback, 0);
        console.log("O.Opt AutoScrollCommon - Output: Auto scroll timer set", { newX, newY });
        return false;
      }
    } else {
      GlobalData.optManager.ResetAutoScrollTimer();
      console.log("O.Opt AutoScrollCommon - Output: No auto scroll needed, timer reset");
      return true;
    }
  }

  RubberBandSelectExceptionCleanup(exception: any): never {
    console.log("O.Opt RubberBandSelectExceptionCleanup - Input:", exception);

    try {
      // Unbind rubber band related hammer events and reset auto-scroll timer.
      GlobalData.optManager.UnbindRubberBandHammerEvents();
      GlobalData.optManager.ResetAutoScrollTimer();

      // Remove the rubber band element from the overlay layer if it exists.
      if (GlobalData.optManager.theRubberBand) {
        GlobalData.optManager.svgOverlayLayer.RemoveElement(GlobalData.optManager.theRubberBand);
      }

      // Reset rubber band properties.
      GlobalData.optManager.theRubberBand = null;
      GlobalData.optManager.theRubberBandStartX = 0;
      GlobalData.optManager.theRubberBandStartY = 0;
      GlobalData.optManager.theRubberBandFrame = { x: 0, y: 0, width: 0, height: 0 };

      // Unlock and unblock collaboration messages, and reset undo state.
      Collab.UnLockMessages();
      Collab.UnBlockMessages();
      GlobalData.optManager.InUndo = false;
    } catch (cleanupError) {
      console.error("O.Opt RubberBandSelectExceptionCleanup - Cleanup Error:", cleanupError);
      throw cleanupError;
    }

    console.log("O.Opt RubberBandSelectExceptionCleanup - Output: Cleanup completed");
    throw exception;
  }

  /**
   * Maintains the relative distance of a point within a line segment when transforming between lines
   * @param targetLine - The line to which the point should be mapped
   * @param sourceLine - The original line containing the point
   * @param segmentIndex - Index of the segment in the polyline
   * @param point - The point to be maintained in relative position
   * @returns The adjusted point position
   */
  Lines_MaintainDistWithinSegment(targetLine, sourceLine, segmentIndex, point) {
    console.log("O.Opt: Lines_MaintainDistWithinSegment inputs:", {
      targetLine: targetLine.BlockID || "unknown",
      sourceLine: sourceLine.BlockID || "unknown",
      segmentIndex,
      point: { x: point.x, y: point.y }
    });

    // Get bounding rectangle for calculations
    var boundingRect = {};

    // Get points of the source line
    var sourcePoints = sourceLine.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
    Utils2.GetPolyRect(boundingRect, sourcePoints);

    // Calculate angle of the segment in the source line
    var sourceAngle = Utils1.CalcAngleFromPoints(sourcePoints[segmentIndex - 1], sourcePoints[segmentIndex]);
    var sourceAngleComplement = 360 - sourceAngle;
    var sourceAngleRadians = 2 * Math.PI * (sourceAngleComplement / 360);

    // Rotate source points to align with horizontal
    Utils3.RotatePointsAboutCenter(boundingRect, -sourceAngleRadians, sourcePoints);

    // Rotate the target point by the same angle
    var rotatedPoints = [point];
    Utils3.RotatePointsAboutCenter(boundingRect, -sourceAngleRadians, rotatedPoints);

    // Calculate the relative position of the point within the segment
    var segmentLength = sourcePoints[segmentIndex].x - sourcePoints[segmentIndex - 1].x;
    var relativePosition = (point.x - sourcePoints[segmentIndex - 1].x) / segmentLength;
    var verticalOffset = point.y - sourcePoints[segmentIndex - 1].y;

    // Rotate back
    Utils3.RotatePointsAboutCenter(boundingRect, sourceAngleRadians, rotatedPoints);

    // Get points of the target line
    var targetPoints = targetLine.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);

    // Calculate angle of the segment in the target line
    var targetAngle = Utils1.CalcAngleFromPoints(targetPoints[segmentIndex - 1], targetPoints[segmentIndex]);
    var targetAngleComplement = 360 - targetAngle;
    var targetAngleRadians = 2 * Math.PI * (targetAngleComplement / 360);

    // Get bounding rectangle for the target line
    Utils2.GetPolyRect(boundingRect, targetPoints);

    // Rotate target points to align with horizontal
    Utils3.RotatePointsAboutCenter(boundingRect, -targetAngleRadians, targetPoints);
    Utils3.RotatePointsAboutCenter(boundingRect, -targetAngleRadians, rotatedPoints);

    // Apply the relative position to the target segment
    var targetSegmentLength = targetPoints[segmentIndex].x - targetPoints[segmentIndex - 1].x;
    var adjustedDistance = targetSegmentLength * relativePosition;

    rotatedPoints[0].x = targetPoints[segmentIndex - 1].x + adjustedDistance;
    rotatedPoints[0].y = targetPoints[segmentIndex - 1].y + verticalOffset;

    // Rotate back to the target line's orientation
    Utils3.RotatePointsAboutCenter(targetLine.Frame, targetAngleRadians, rotatedPoints);

    // Update the point
    point = rotatedPoints[0];

    console.log("O.Opt: Lines_MaintainDistWithinSegment output:", {
      point: { x: point.x, y: point.y }
    });

    return point;
  }

  /**
   * Converts an arc to a sequence of polyline points
   * @param segments - Number of segments to divide the arc into
   * @param center - Center point of the arc
   * @param radius - Radius of the arc
   * @param startY - Starting Y coordinate
   * @param endY - Ending Y coordinate
   * @param targetX - Target X coordinate
   * @param flipArc - Whether to flip the arc
   * @param isComplexArc - Whether this is a complex arc that requires multiple segments
   * @returns Array of points representing the arc
   */
  ArcToPoly(segments, center, radius, startY, endY, targetX, flipArc, isComplexArc) {
    console.log("O.Opt: ArcToPoly inputs:", {
      segments,
      center: { x: center.x, y: center.y },
      radius,
      startY,
      endY,
      targetX,
      flipArc,
      isComplexArc
    });

    let isRightSide,
      midY1,
      midY2,
      points = [];

    // The following expression has no effect, but keeping it for compatibility
    endY - startY;

    if (isComplexArc) {
      // For complex arcs, divide into three segments
      if (startY > endY) {
        midY2 = center.y - radius;
        midY1 = center.y + radius;
      } else {
        midY1 = center.y - radius;
        midY2 = center.y + radius;
      }

      isRightSide = targetX < center.x;
      flipArc = false;

      // Generate three segments of the complex arc
      this.ArcToPolySeg(points, segments / 2, center, radius, startY, midY1, targetX, flipArc, !isRightSide);
      this.ArcToPolySeg(points, segments, center, radius, midY1, midY2, center.x, flipArc, isRightSide);
      this.ArcToPolySeg(points, segments / 2, center, radius, midY2, endY, targetX, flipArc, !isRightSide);
    } else {
      // For simple arcs, generate a single segment
      isRightSide = targetX >= center.x;
      this.ArcToPolySeg(points, segments, center, radius, startY, endY, targetX, flipArc, isRightSide);
    }

    console.log("O.Opt: ArcToPoly output points:", points.length);
    return points;
  }

  /**
   * Generates points along an arc segment and adds them to an array
   * @param points - Array to store the generated points
   * @param segments - Number of segments to divide the arc into
   * @param center - Center point of the arc
   * @param radius - Radius of the arc
   * @param startY - Starting Y coordinate
   * @param endY - Ending Y coordinate
   * @param targetX - Target X coordinate
   * @param flipArc - Whether to flip the arc
   * @param isRightSide - Whether the arc is on the right side
   * @returns Array of points representing the arc segment
   */
  ArcToPolySeg(points, segments, center, radius, startY, endY, targetX, flipArc, isRightSide) {
    console.log("O.Opt: ArcToPolySeg inputs:", {
      segments,
      center: { x: center.x, y: center.y },
      radius,
      startY,
      endY,
      targetX,
      flipArc,
      isRightSide
    });

    const radiusSquared = radius * radius;
    const yStep = (endY - startY) / segments;

    for (let i = 0; i < segments; i++) {
      const yOffset = yStep * i;
      const yDist = center.y - (startY + yOffset);
      const xDist = Utils2.sqrt(radiusSquared - yDist * yDist);

      const point = new Point(0, 0);
      point.y = center.y - yDist;

      if (isRightSide) {
        point.x = center.x + xDist;
        const diff = point.x - targetX;
        if (flipArc) {
          point.x = targetX - diff;
        }
      } else {
        point.x = center.x - xDist;
        const diff = targetX - point.x;
        if (flipArc) {
          point.x = targetX + diff;
        }
      }

      points.push(point);
    }

    console.log("O.Opt: ArcToPolySeg output points count:", points.length);
    return points;
  }

  DrawNewObject(newShape, clearExistingSection) {
    console.log("O.Opt DrawNewObject - Input:", { newShape, clearExistingSection });

    this.SetModalOperation(ConstantData2.ModalOperations.DRAW);
    this.GetObjectPtr(this.theTEDSessionBlockID, false);
    this.CloseEdit();

    this.LineDrawID = -1;
    this.theDrawShape = newShape;
    this.ClearAnySelection(!clearExistingSection);
    this.SetEditMode(ConstantData.EditState.EDIT);
    this.WorkAreaHammer.on('dragstart', DefaultEvt.Evt_WorkAreaHammerDrawStart);

    console.log("O.Opt DrawNewObject - Output: Draw new object initialized");
  }

  StartNewObjectDraw(inputEvent) {
    console.log("O.Opt StartNewObjectDraw - Input:", inputEvent);

    // Abort drawing if LineStamp is active
    if (GlobalData.optManager.LineStamp) {
      console.log("O.Opt StartNewObjectDraw - Output: LineStamp active, aborting draw");
      return;
    }

    // Convert client coordinates to document coordinates
    let docCoords = this.svgDoc.ConvertWindowToDocCoords(
      inputEvent.gesture.center.clientX,
      inputEvent.gesture.center.clientY
    );
    console.log("O.Opt StartNewObjectDraw: Client coords and Doc coords", inputEvent.gesture.center.clientX, inputEvent.gesture.center.clientY, docCoords);

    // Set the starting point for drawing
    this.theDrawStartX = docCoords.x;
    this.theDrawStartY = docCoords.y;
    console.log("O.Opt StartNewObjectDraw: Draw start coordinates set", this.theDrawStartX, this.theDrawStartY);

    // Pre-track check before drawing
    const preTrackCheck = this.theDrawShape.LM_DrawPreTrack(docCoords);
    if (!preTrackCheck) {
      console.log("O.Opt StartNewObjectDraw - Output: Pre-track check failed");
      return;
    }

    // Determine if snapping should be enabled
    let hasLinkParam = this.LinkParams && this.LinkParams.SConnectIndex >= 0;
    let needOverrideSnaps = this.OverrideSnaps(inputEvent);
    hasLinkParam = hasLinkParam || needOverrideSnaps;
    const isSnapEnabled = GlobalData.docHandler.documentConfig.enableSnap && !hasLinkParam;

    if (isSnapEnabled) {
      let snapRect = this.theDrawShape.GetSnapRect();
      let dragRectCopy = this.theDragEnclosingRect ? Utils1.DeepCopy(this.theDragEnclosingRect) : snapRect;
      let actionBBoxCopy = Utils1.DeepCopy(this.theActionBBox);
      let offsetX = dragRectCopy.x - actionBBoxCopy.x;
      let offsetY = dragRectCopy.y - actionBBoxCopy.y;

      // Reposition the drag rectangle to center around the document coordinates
      dragRectCopy.x = docCoords.x - dragRectCopy.width / 2;
      dragRectCopy.y = docCoords.y - dragRectCopy.height / 2;

      // Calculate the adjusted offset for custom snap
      let adjustedOffset = {
        x: dragRectCopy.x - offsetX,
        y: dragRectCopy.y - offsetY
      };

      if (!this.theDrawShape.CustomSnap(adjustedOffset.x, adjustedOffset.y, 0, 0, false, docCoords)) {
        if (GlobalData.docHandler.documentConfig.centerSnap) {
          let snapPoint = GlobalData.docHandler.SnapToGrid(docCoords);
          docCoords.x = snapPoint.x;
          docCoords.y = snapPoint.y;
        } else {
          let tempSnapRect = $.extend(true, {}, snapRect);
          tempSnapRect.x = docCoords.x - snapRect.width / 2;
          tempSnapRect.y = docCoords.y - snapRect.height / 2;
          let snapAdjustment = GlobalData.docHandler.SnapRect(tempSnapRect);
          docCoords.x += snapAdjustment.x;
          docCoords.y += snapAdjustment.y;
        }
      }
    }

    // Set action coordinates based on document coordinates
    let docX = docCoords.x;
    let docY = docCoords.y;
    this.ClearAnySelection(true);
    this.theActionStartX = docX;
    this.theActionStartY = docY;
    this.theActionBBox = { x: docX, y: docY, width: 1, height: 1 };
    this.theActionNewBBox = { x: docX, y: docY, width: 1, height: 1 };

    // Begin drawing the new shape
    let drawShape = this.theDrawShape;
    this.InitializeAutoGrowDrag();
    this.ShowFrame(true);
    drawShape.LM_DrawClick(docX, docY);
    this.AddNewObject(drawShape, !drawShape.bOverrideDefaultStyleOnDraw, false);

    // Retrieve the new object's ID from the active layer
    let layerZList = this.ActiveLayerZList();
    let layerCount = layerZList.length;
    this.theActionStoredObjectID = layerZList[layerCount - 1];

    // If a circular link list exists, add the new object to it
    if (this.LinkParams && this.LinkParams.lpCircList) {
      this.LinkParams.lpCircList.push(this.theActionStoredObjectID);
    }

    // Get the corresponding SVG object for the new object
    this.theActionSVGObject = this.svgObjectLayer.GetElementByID(this.theActionStoredObjectID);

    // Handle connection highlights if there is a connect index
    if (this.LinkParams && this.LinkParams.SConnectIndex >= 0) {
      this.HiliteConnect(this.LinkParams.SConnectIndex, this.LinkParams.SConnectPt, true, false, drawShape.BlockID, this.LinkParams.SConnectInside);
      this.LinkParams.SHiliteConnect = this.LinkParams.SConnectIndex;
      this.LinkParams.SHiliteInside = this.LinkParams.SConnectInside;
    }

    // Handle join highlights if there is a join index
    if (this.LinkParams && this.LinkParams.SJoinIndex >= 0) {
      this.HiliteConnect(this.LinkParams.SJoinIndex, this.LinkParams.SConnectPt, true, true, drawShape.BlockID, null);
      this.LinkParams.SHiliteJoin = this.LinkParams.SJoinIndex;
    }

    console.log("O.Opt StartNewObjectDraw - Output: New object drawn with ID", this.theActionStoredObjectID);
  }

  AddNewObject(drawingObject, shouldStyleCopy, renderSelection, textContent) {
    console.log("O.Opt AddNewObject - Input:", { drawingObject, shouldStyleCopy, renderSelection, textContent });

    let nativeSymbolResult;
    let symbolTitle;
    let layerFlag = 0;
    let symbolData = null;
    let isStandardShape = false;

    // Ensure textContent defaults to null if not provided
    textContent = textContent || null;
    let symbolId = null;
    let symbolTitleForUpdate = '';

    if (drawingObject == null) {
      throw new Error('The drawing object is null');
    }

    const sessionData = GlobalData.objectStore.GetObject(this.theSEDSessionBlockID).Data;

    if (shouldStyleCopy === undefined) {
      shouldStyleCopy = true;
    }

    // Copy default style if required.
    if (shouldStyleCopy) {
      drawingObject.StyleRecord = Utils1.DeepCopy(sessionData.def.style);
      if (drawingObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
        drawingObject.StyleRecord.Line = Utils1.DeepCopy(drawingObject.StyleRecord.Border);
        drawingObject.TMargins = Utils1.DeepCopy(sessionData.def.tmargins);
        drawingObject.TextFlags = Utils2.SetFlag(
          drawingObject.TextFlags,
          ConstantData.TextFlags.SED_TF_FormCR,
          (sessionData.def.textflags & ConstantData.TextFlags.SED_TF_FormCR) > 0
        );
      }
      let justification = sessionData.def.just;
      if (sessionData.def.vjust !== 'middle' && sessionData.def.vjust !== 'center') {
        justification = sessionData.def.vjust + '-' + sessionData.def.just;
      }
      drawingObject.TextAlign = justification;
    }

    // Apply forced dotted pattern if necessary.
    if (this.forcedotted && drawingObject.StyleRecord) {
      drawingObject.StyleRecord.Line.LinePattern = this.forcedotted;
      this.forcedotted = null;
    }

    drawingObject.UpdateFrame(drawingObject.Frame);
    drawingObject.sizedim.width = drawingObject.Frame.width;
    drawingObject.sizedim.height = drawingObject.Frame.height;
    drawingObject.UniqueID = this.uniqueID++;

    if (drawingObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
      layerFlag = ConstantData.LayerFlags.SDLF_UseEdges;
    }

    drawingObject.DataID = textContent ? GlobalData.optManager.CreateTextBlock(drawingObject, textContent) : -1;

    // Create new graphics block.
    const newBlock = GlobalData.objectStore.CreateBlock(ConstantData.StoredObjectType.BASE_LM_DRAWING_OBJECT, drawingObject);
    if (newBlock == null) {
      throw new Error('AddNewObject got a null new graphics block allocation');
    }

    // Collab.AddToCreateList(newBlock.Data.BlockID);

    if (symbolId) {
      GlobalData.gBaseManager.UpdateShapeList(drawingObject, symbolId, symbolTitleForUpdate, isStandardShape);
    }

    this.ZListPreserve(layerFlag).push(newBlock.ID);

    const isBaseline = drawingObject instanceof BaseLine;
    const layersData = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theLayersManagerBlockID, false);

    const isSpecialLayer = false;

    if (this.IsTopMostVisibleLayer() || isBaseline || isSpecialLayer) {
      this.RenderLastSVGObject(renderSelection);
    } else {
      this.RenderLastSVGObject(renderSelection);
      this.MarkAllAllVisibleHigherLayerObjectsDirty();
      this.RenderDirtySVGObjectsNoSetMouse();
    }

    this.theActionBBox = $.extend(true, {}, drawingObject.Frame);
    this.theDragEnclosingRect = drawingObject.GetDragR();

    console.log("O.Opt AddNewObject - Output:", newBlock.ID);
    return newBlock.ID;
  }

}

export default OptHandler
