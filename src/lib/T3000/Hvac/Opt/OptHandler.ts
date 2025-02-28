
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
    this.FileVersion = 41;// SDF.SDF_FVERSION2022;
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

    const tedSession = new TEDSession();// new ListManager.TEDSession();
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
            SDF.SaveChangedBlocks(GlobalData.stateManager.CurrentStateID, 1);
          } else {
            SDF.SaveAllBlocks();
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
    let objectVisioTextChild;
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

      // Check for Visio text child
      objectVisioTextChild = -1; // GlobalData.optManager.SD_GetVisioTextChild(objectId);
      const objectToProcess = (objectVisioTextChild >= 0) ?
        this.GetObjectPtr(objectVisioTextChild, false) : currentObject;

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

    // Handle tables
    const table = object.GetTable(false);
    if (table) {
      if ((table.flags & ListManager.Table.TableFlags.SDT_TF_LOCK) > 0) {
        this.SelectionState.lockedTableSelected = true;
      }

      if (SDUI.AppSettings.Application !== Resources.Application.Builder &&
        object.objecttype === ConstantData.ObjectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER) {
        this.SelectionState.lockedTableSelected = true;
      }

      if (GlobalData.optManager.Table_GetCellWithType(table, ListManager.Table.CellTypes.SD_CT_JIRA_ISSUEKEY)) {
        this.SelectionState.isJiraCard = true;
      }
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

}

export default OptHandler
