

import $ from 'jquery';
import Document from '../../Basic/B.Document';
import NvConstant from '../../Data/Constant/NvConstant';
import OptConstant from "../../Data/Constant/OptConstant";
import StyleConstant from "../../Data/Constant/StyleConstant";
import TextConstant from "../../Data/Constant/TextConstant";
import Instance from "../../Data/Instance/Instance";
import StateConstant from "../../Data/State/StateConstant";
import T3Gv from '../../Data/T3Gv';
import ArrowDefs from '../../Model/ArrowDefs';
import ArrowSizes from '../../Model/ArrowSizes';
import HeaderInfo from '../../Model/HeaderInfo';
import Layer from "../../Model/Layer";
import LayersManager from "../../Model/LayersManager";
import ParagraphFormat from '../../Model/ParagraphFormat';
import Point from '../../Model/Point';
import QuickStyle from "../../Model/QuickStyle";
import RightClickMd from "../../Model/RightClickMd";
import SDData from '../../Model/SDData';
import SegmentData from '../../Model/SegmentData';
import SelectionAttr from "../../Model/SelectionAttr";
import TEData from "../../Model/TEData";
import TextureList from "../../Model/TextureList";
import '../../Util/T3Hammer';
import T3Timer from "../../Util/T3Timer";
import T3Util from "../../Util/T3Util";
import Utils1 from "../../Util/Utils1";
import Utils2 from "../../Util/Utils2";
import Utils3 from "../../Util/Utils3";
import DataUtil from "../Data/DataUtil";
import DSConstant from "../DS/DSConstant";
import PolygonConstant from "../Polygon/PolygonConstant";
import PolygonUtil from "../Polygon/PolygonUtil";
import UIUtil from "../UI/UIUtil";
import DrawUtil from "./DrawUtil";
import HookUtil from "./HookUtil";
import LayerUtil from "./LayerUtil";
import OptAhUtil from './OptAhUtil';
import OptCMUtil from "./OptCMUtil";
import SelectUtil from "./SelectUtil";
import SvgUtil from "./SvgUtil";
import TextUtil from "./TextUtil";
import LMEvtUtil from './LMEvtUtil';
import ToolActUtil from './ToolActUtil';
import DynamicGuides from '../../Model/DynamicGuides';
import CursorConstant from '../../Data/Constant/CursorConstant';
import T3Constant from '../../Data/Constant/T3Constant';
import RulerUtil from '../UI/RulerUtil';
import DynamicUtil from './DynamicUtil';
import DSUtil from '../DS/DSUtil';
import Style from '../../Basic/B.Element.Style';
import ImageRecord from '../../Model/ImageRecord';

/**
 * Utility class for managing SVG optimization and editor functionality in the T3000 application.
 *
 * OptUtil provides core functionality for the T3000 HVAC graphics editor, handling operations like:
 * - SVG document initialization and manipulation
 * - Selection management and rubber band selection
 * - Drag and drop operations
 * - Object formatting and styling
 * - Text editing and formatting
 * - Layer management
 *
 * The class maintains the state of the editor, tracks user interactions, and provides
 * utilities for transforming and manipulating graphical elements.
 *
 * @example
 * // Initialize OptUtil with required configuration
 * const optUtil = new OptUtil();
 * optUtil.Initialize();
 *
 * // Use rubber band selection to select multiple objects
 * optUtil.StartRubberBandSelect(mouseEvent);
 *
 * // Handle format painter operations
 * optUtil.SetFormatPainter(false, true); // Enable format painter in sticky mode
 *
 * // Access and modify selected objects
 * const selectedList = optUtil.GetObjectPtr(optUtil.theSelectedListBlockID, false);
 * optUtil.UpdateSelectionAttributes(selectedList);
 *
 * // Manage document scale/zoom
 * optUtil.SetDocumentScale(1.5, true); // Set zoom to 150% with animation
 */
class OptUtil {

  //#region  Variables

  /**
   * SVG document identifier and root elements
   * Used for referencing and manipulating the main document structure
   */
  public svgDocId: string;           // Selector for the SVG container element
  public svgDoc: Document;           // Reference to the SVG document
  public svgObjectLayer: Document;        // Main layer for drawing content
  public svgOverlayLayer: Document;       // Layer for UI elements (not exported)
  public svgHighlightLayer: Document;     // Layer for selection highlighting
  public svgCollabLayer: Document;        // Layer for collaboration indicators
  public sVGroot: any;               // Root SVG DOM element

  /**
   * Rubber band selection variables
   * Used for implementing rectangular selection behavior
   */
  public rubberBand: any;            // Reference to selection rectangle element
  public rubberBandStartX: number;   // Starting X coordinate for selection
  public rubberBandStartY: number;   // Starting Y coordinate for selection
  public rubberBandFrame: any;       // Bounding rectangle of selection area

  /**
   * Drag operation state variables
   * Track the state of objects being moved by drag operations
   */
  public dragElementList: any[];     // List of elements being dragged
  public dragBBoxList: any[];        // List of bounding boxes for dragged elements
  public dragEnclosingRect: any;     // Rectangle enclosing all dragged elements
  public dragStartX: number;         // Starting X coordinate for drag
  public dragStartY: number;         // Starting Y coordinate for drag
  public dragDeltaX: number;         // X distance moved during drag
  public dragDeltaY: number;         // Y distance moved during drag
  public dragTargetId: any;          // ID of the primary drag target
  public dragTargetBBox: any;        // Bounding box of the target element
  public dragGotMove: boolean;       // Flag indicating movement has occurred
  public dragGotAutoResizeRight: boolean;    // Flag for auto-resize right during drag
  public dragGotAutoResizeBottom: boolean;   // Flag for auto-resize bottom during drag
  public dragGotAutoResizeOldX: any[];       // Previous X dimensions during auto-resize
  public dragGotAutoResizeOldY: any[];       // Previous Y dimensions during auto-resize
  public moveList: any[];            // List of objects to move together
  public moveBounds: any;            // Bounds of the move operation
  public pinRect: any;               // Constraining rectangle for movement

  /**
   * Action state tracking
   * Variables for tracking the current editing action
   */
  public noUndo: boolean;            // Flag to disable undo recording
  public actionStoredObjectId: string;  // ID of the object being acted upon
  public actionSvgObject: any;       // SVG object being acted upon
  public actionTriggerId: number;    // ID of the action trigger
  public actionTriggerData: any;  // Data associated with the trigger
  public actionStartX: number;       // Starting X coordinate for action
  public actionStartY: number;       // Starting Y coordinate for action
  // public actionTableLastX: number;   // Last X coordinate for table actions
  // public actionTableLastY: number;   // Last Y coordinate for table actions
  public actionOldExtra: number;     // Previous extra state data
  public actionBBox: any;            // Original bounding box
  public actionNewBBox: any;         // New bounding box after action
  public actionLockAspectRatio: boolean;     // Whether to maintain width/height ratio
  public actionAspectRatioWidth: number;     // Original width for aspect ratio
  public actionAspectRatioHeight: number;    // Original height for aspect ratio
  public crtOpt: number;      // Current operation type

  /**
   * Drawing state variables
   * Track the state of drawing operations
   */
  public drawShape: any;             // Current shape being drawn
  public drawStartX: number;         // Starting X position for drawing
  public drawStartY: number;         // Starting Y position for drawing
  public lineDrawStartX: number;     // Starting X for line drawing
  public lineDrawStartY: number;     // Starting Y for line drawing
  public lineDrawId: number;         // ID of the line being drawn
  public lineDrawLineId: number;     // ID of the line element
  public lineStamp: boolean;         // Whether in line stamp mode
  public dynamicGuides: any;         // Alignment guides during drawing

  /**
   * Rotation state variables
   * Track state during rotation operations
   */
  public rotateKnobCenterDivisor: any;   // Divisor for rotation knob center
  public rotateStartPoint: any;          // Starting point for rotation
  public rotateEndPoint: any;            // Ending point for rotation
  public rotateObjectRadians: number;    // Rotation angle in radians
  public rotateStartRotation: number;    // Starting rotation angle
  public rotateEndRotation: number;      // Ending rotation angle
  public rotatePivotX: number;           // X coordinate of rotation center
  public rotatePivotY: number;           // Y coordinate of rotation center
  public rotateSnap: number;             // Angle for rotation snapping
  public enhanceRotateSnap: number;      // Enhanced rotation snapping angle

  /**
   * Auto-scroll variables
   * Manage automatic scrolling during drag operations
   */
  public autoScrollTimer: T3Timer;       // Timer for auto-scrolling
  public autoScrollTimerId: number;      // ID of the auto-scroll timer
  public autoScrollXPos: number;         // X position for auto-scrolling
  public autoScrollYPos: number;         // Y position for auto-scrolling
  public inAutoScroll: boolean;          // Whether auto-scroll is active

  /**
   * Touch and gesture variables
   * Support for touch interaction
   */
  public isGestureCapable: boolean;      // Whether device supports touch/gestures
  public touchInitiated: boolean;        // Whether touch interaction started
  public touchPanStarted: boolean;       // Whether panning via touch started
  public touchPanX: number;              // X position for touch panning
  public touchPanY: number;              // Y position for touch panning
  public bIsFullScreen: boolean;         // Whether in fullscreen mode

  /**
   * UI elements and event handlers
   * References to DOM elements and their event handlers
   */
  public mainAppElement: any;            // Main application DOM element
  public mainAppHammer: any;             // Hammer manager for main element
  public workAreaElement: any;           // Work area DOM element
  public WorkAreaHammer: any;            // Hammer manager for work area
  public documentElement: any;           // Document area DOM element
  public documentElementHammer: any;     // Hammer manager for document element
  public workAreaTextInputProxy: any;    // Proxy for text input in work area
  public virtualKeyboardLifterElementFrame: any;  // Frame for virtual keyboard
  public TEHammer: any;                  // Hammer manager for text editing
  public TEWorkAreaHammer: any;          // Hammer manager for text edit work area
  public clickAreaHammer: any;           // Hammer manager for click areas
  public decAreaHammer: any;             // Hammer manager for decoration areas
  public noteAreaHammer: any;            // Hammer manager for note areas
  public textHammer: any;                // Hammer manager for text elements
  public editModeList: any;              // Stack of edit modes

  /**
   * Block IDs for persistent object storage
   * References to stored objects in the object manager
   */
  public theSelectedListBlockID: number; // ID for object selection storage
  public sdDataBlockId: number;      // ID for shape editing data
  public teDataBlockId: number;      // ID for text editing session data
  public layersManagerBlockId: number;   // ID for layer management data
  public linksBlockId: number;           // ID for connection links data

  /**
   * Stamp operation variables
   * State for stamp/duplicate operations
   */
  public stampTimeout: any;              // Timeout for stamp operations
  public stampCompleteCallback: any;     // Callback after stamp completion
  public stampCompleteUserData: any;     // User data for stamp callback
  public stampHCenter: boolean;          // Whether to center horizontally
  public stampVCenter: boolean;          // Whether to center vertically
  public stampShapeOffsetX: number;      // X offset for stamped shape
  public stampShapeOffsetY: number;      // Y offset for stamped shape
  public stampSticky: boolean;           // Whether stamp mode persists
  public lastOpDuplicate: boolean;       // Whether last operation was duplicate

  /**
   * Format painter variables
   * State for format painter functionality
   */
  public formatPainterMode: number;      // Current format painter mode
  public formatPainterStyle: QuickStyle; // Style info for format painter
  public formatPainterSticky: boolean;   // Whether format painter persists
  public formatPainterText: QuickStyle;  // Text style for format painter
  public formatPainterParaFormat: ParagraphFormat;  // Paragraph format for painter
  public formatPainterArrows: any;       // Arrow style for format painter

  /**
   * Nudge operation variables
   * State for nudge operations (small movements)
   */
  public nudgeDelta: number;             // Size of nudge movement
  public nudgeOpen: boolean;             // Whether nudge panel is open
  public nudgeX: number;                 // X coordinate for nudge
  public nudgeY: number;                 // Y coordinate for nudge
  public nudgeGrowX: number;             // X growth for nudge
  public nudgeGrowY: number;             // Y growth for nudge

  /**
   * Document state variables
   * Track document-wide states
   */
  public useDefaultStyle: boolean;       // Whether to use default style
  public newObjectVisible: boolean;      // Whether new objects are visible
  public TextureList: TextureList;       // List of available textures
  public nStdTextures: number;           // Number of standard textures
  public richGradients: any[];           // List of gradient definitions
  public header: HeaderInfo;             // Document metadata and settings
  public FileVersion: number;            // File format version
  public bDrawEffects: boolean;          // Whether to draw effects
  public hasBlockDirectory: boolean;     // Whether block directory exists
  // public initialStateID: number;         // Initial state ID for undo
  public nDataStoreStart: number;      // Initial object store count

  /**
   * Clipboard and paste state
   * Variables for clipboard operations
   */
  public textClipboard: any;             // Clipboard for text content
  public htmlClipboard: any;             // Clipboard for HTML content
  public imageClipboard: any;            // Clipboard for image content
  public cutFromButton: boolean;         // Whether cut from button press
  public topLeftPastePos: any;           // Position for paste operation
  public topLeftPasteScrollPos: any;     // Scroll position during paste
  public pasteCount: number;             // Count of paste operations

  /**
   * Dirty state tracking
   * Variables for tracking modified objects
   */
  public dirtyList: any[];               // List of objects needing redraw
  public dirtyListMoveOnly: any[];       // Objects moved without other changes
  public dirtyListReOrder: boolean;      // Whether z-ordering changed

  /**
   * Note editing state
   * Variables for note editing functionality
   */
  public curNoteShape: number;           // Current shape with note being edited
  // public curNoteTableCell: any;          // Current table cell with note
  public curNoteGraphPint: any;          // Current graph point with note
  public bInNoteEdit: boolean;           // Whether in note edit mode
  public bNoteChanged: boolean;          // Whether note content changed

  /**
   * Symbol and bitmap handling
   * Variables for external asset management
   */
  public emptySymbolList: any[];         // List of empty symbols
  public emptyEMFList: any[];            // List of empty EMF files
  public addCount: number;               // Count of added objects
  public symbolLibraryItemID: number;    // ID in symbol library
  public bitmapImportCanvas: any;        // Canvas for bitmap import
  public bitmapImportCanvasCTX: any;     // Canvas context for bitmap import
  public bitmapScaledCanvas: any;        // Canvas for scaled bitmaps
  public bitmapScaledCanvasCTX: any;     // Context for scaled canvas
  public bitmapImportSourceWidth: number;    // Original bitmap width
  public bitmapImportSourceHeight: number;   // Original bitmap height
  public bitmapImportDestWidth: number;      // Target bitmap width
  public bitmapImportDestHeight: number;     // Target bitmap height
  public bitmapImportMaxScaledWidth: number;  // Max scaled width
  public bitmapImportMaxScaledHeight: number; // Max scaled height
  public bitmapImportDPI: number;        // DPI for imported bitmap
  public bitmapImportMimeType: string;   // MIME type of imported bitmap
  public bitmapImportOriginalSize: number;   // Original size in bytes
  public bitmapImportScaledSize: number;     // Scaled size in bytes
  public scaledBitmapCallback: any;      // Callback after scaling
  public bitmapImportEXIFdata: any;      // EXIF data from image
  public bitmapImportFile: any;          // File being imported
  public bitmapImportResult: any;        // Result of import operation

  /**
   * Miscellaneous state variables
   * Various state tracking variables
   */
  public wasClickInShape: boolean;       // Whether last click was in shape
  public textEntryTimer: any;            // Timer for text entry
  public eventTimestamp: number;         // Timestamp of last event
  public actionArrowHideTimer: T3Timer;  // Timer for hiding action arrows
  public uniqueId: number;               // Counter for generating unique IDs
  public fromOverlayLayer: boolean;      // Whether drawing from overlay layer
  public postMoveSelectId: any;          // ID to select after move
  public bBuildingSymbols: boolean;      // Whether building symbols
  public bTokenizeStyle: boolean;        // Whether tokenizing style
  public linkParams: any;                // Parameters for linking objects
  public rClickParam: RightClickMd;      // Parameters from right-click
  public bInDimensionEdit: boolean;      // Whether editing dimensions
  public oldAllowSave: boolean;          // Previous save permission
  public doubleClickSymbolTimeStamp: number;  // Time of last symbol double-click
  public importContext: any;             // Context for import operations
  public curHiliteShape: number;         // Currently highlighted shape
  public cachedHeight: any;              // Cached height value
  public cachedWidth: any;               // Cached width value

  /**
   * Collaboration state variables
   * Variables for multi-user editing
   */
  // public collaboration: Collaboration;   // Collaboration manager
  public commentUserIDs: any[];          // User IDs for comments
  public activeExpandedView: any;        // Currently expanded view
  public alternateStateManagerVars: any; // Alternate state variables
  public socketAction: any[];            // Actions for socket transmission
  public pageAction: any[];              // Actions for page changes
  public pagesToDelete: any[];           // Pages marked for deletion
  public oldFileMetaData: any;           // Previous file metadata
  public selectionState: any;            // Current selection state

  public forcedotted: any;
  public ob: any;
  public PastePoint: any;

  public actionTableLastX: any;
  public actionTableLastY: any;

  //#endregion

  /**
   * Initializes the OptUtil instance by setting up all required properties and resources
   * This is the main setup method that prepares the SVG document, UI elements, and system state
   * It creates necessary data structures for managing shapes, selections, and user interactions
   */
  Initialize() {
    // #region SVG Document Elements
    /**
     * Configure main SVG document references and layers
     * These elements form the structure of the drawing document
     */
    this.svgDocId = '#svg-area';                // CSS selector for the SVG container
    this.svgDoc = null;                         // SVG document reference (initialized later)
    this.svgObjectLayer = null;                 // Main layer for drawing content
    this.svgOverlayLayer = null;                // Layer for UI elements (not exported)
    this.svgHighlightLayer = null;              // Layer for selection highlights
    this.svgCollabLayer = null;                 // Layer for collaboration indicators
    this.sVGroot = null;                        // Root SVG DOM element
    // #endregion

    // #region Selection & Rubber Band
    /**
     * Set up properties for rubber band selection
     * These properties track state during rectangular selection operations
     */
    this.rubberBand = null;                     // Visual representation of selection area
    this.rubberBandStartX = 0;                  // X position where selection started
    this.rubberBandStartY = 0;                  // Y position where selection started
    this.rubberBandFrame = {                    // Actual selection rectangle coordinates
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };
    // #endregion

    // #region Drag & Drop Operations
    /**
     * Initialize properties for drag operations
     * These track state during object movement and resizing
     */
    this.dragElementList = [];                  // List of elements being dragged
    this.dragStartX = 0;                        // X position where drag started
    this.dragStartY = 0;                        // Y position where drag started
    this.dragDeltaX = 0;                        // X distance moved during drag
    this.dragDeltaY = 0;                        // Y distance moved during drag
    this.dragTargetId = null;                   // ID of main element being dragged
    this.dragGotMove = false;                   // Whether movement has occurred
    this.dragBBoxList = [];                     // Bounding boxes for dragged elements
    this.dragTargetBBox = {};                   // Target element's bounding box
    this.dragEnclosingRect = null;              // Rectangle enclosing all dragged elements

    // Auto-resize during drag
    this.dragGotAutoResizeRight = false;        // Whether right edge was auto-resized
    this.dragGotAutoResizeBottom = false;       // Whether bottom edge was auto-resized
    this.dragGotAutoResizeOldX = [];            // Previous X dimensions during resize
    this.dragGotAutoResizeOldY = [];            // Previous Y dimensions during resize

    // Move lists
    this.moveList = [];                         // Objects to move together
    this.moveBounds = null;                     // Bounds of the move operation
    this.pinRect = null;                        // Constraining rectangle for movement
    // #endregion

    // #region Action State
    /**
     * Initialize properties for tracking current user action state
     * These properties maintain context about the current operation
     */
    this.noUndo = false;                        // Flag to disable undo recording
    this.actionStoredObjectId = -1;             // ID of object being operated on
    this.actionSvgObject = null;                // SVG object being acted upon
    this.actionTriggerId = 0;                   // ID of triggering element
    this.actionTriggerData = 0;                 // Data associated with the trigger
    this.actionStartX = 0;                      // X coordinate where action started
    this.actionStartY = 0;                      // Y coordinate where action started
    // this.actionTableLastX = 0;                  // Last X coordinate for table actions
    // this.actionTableLastY = 0;                  // Last Y coordinate for table actions
    this.actionOldExtra = 0;                    // Previous extra state data
    this.actionBBox = {};                       // Original bounding box
    this.actionNewBBox = {};                    // New bounding box after action

    // Aspect ratio controls
    this.actionLockAspectRatio = false;         // Whether to maintain width/height ratio
    this.actionAspectRatioWidth = 0;            // Original width for aspect ratio
    this.actionAspectRatioHeight = 0;           // Original height for aspect ratio

    // Modal state
    this.crtOpt = OptConstant.OptTypes.None;  // Current modal operation type
    // #endregion

    // #region Drawing State
    /**
     * Initialize properties for shape drawing operations
     * These track state during drawing new shapes
     */
    this.drawShape = null;                      // Current shape being drawn
    this.drawStartX = 0;                        // Starting X position for drawing
    this.drawStartY = 0;                        // Starting Y position for drawing

    // Line drawing state
    this.lineDrawStartX = 0;                    // Starting X for line drawing
    this.lineDrawStartY = 0;                    // Starting Y for line drawing
    this.lineDrawId = -1;                       // ID of the line being drawn
    this.lineDrawLineId = -1;                   // ID of the line element
    this.lineStamp = false;                     // Whether in line stamp mode

    this.fromOverlayLayer = false;              // Whether drawing comes from overlay
    this.dynamicGuides = null;                  // Alignment guides during drawing
    // #endregion

    // #region Rotation State
    /**
     * Initialize properties for rotation operations
     * These track state during object rotation
     */
    this.rotateKnobCenterDivisor = { x: 2, y: 2 }; // Divisor for rotation knob center
    this.rotateStartPoint = {};                 // Starting point for rotation
    this.rotateEndPoint = {};                   // Ending point for rotation
    this.rotateObjectRadians = 0;               // Rotation angle in radians
    this.rotateStartRotation = 0;               // Starting rotation angle
    this.rotateEndRotation = 0;                 // Ending rotation angle
    this.rotatePivotX = 0;                      // X coordinate of rotation center
    this.rotatePivotY = 0;                      // Y coordinate of rotation center
    this.rotateSnap = 5;                        // Angle for rotation snapping
    this.enhanceRotateSnap = 45;                // Enhanced rotation snap angle
    // #endregion

    // #region Auto-scroll & Touch
    /**
     * Initialize properties for auto-scrolling and touch interaction
     * These handle automatic scrolling during drag operations
     */
    this.autoScrollTimer = new T3Timer(this);   // Timer for auto-scrolling
    this.autoScrollTimerId = -1;                // ID of the auto-scroll timer
    this.autoScrollXPos = 0;                    // X position for auto-scrolling
    this.autoScrollYPos = 0;                    // Y position for auto-scrolling
    this.inAutoScroll = false;                  // Whether auto-scroll is active

    // Touch gesture properties
    this.isGestureCapable = 'ontouchstart' in window ||
      ('onpointerdown' in window &&
        navigator.maxTouchPoints &&
        navigator.maxTouchPoints > 1);  // Device supports touch
    this.touchInitiated = false;                // Whether touch interaction started
    this.touchPanStarted = false;               // Whether panning via touch started
    this.touchPanX = 0;                         // X position for touch panning
    this.touchPanY = 0;                         // Y position for touch panning
    this.bIsFullScreen = false;                 // Whether in fullscreen mode
    // #endregion

    // #region UI Elements & Event Handlers
    /**
     * Initialize properties for UI elements and event handlers
     * These connect the application to the DOM and user events
     */
    this.mainAppElement = null;                 // Main application DOM element
    this.mainAppHammer = null;                  // Hammer manager for main element
    this.workAreaElement = null;                // Work area DOM element
    this.WorkAreaHammer = null;                 // Hammer manager for work area
    this.workAreaTextInputProxy = null;         // Proxy for text input in work area
    this.virtualKeyboardLifterElementFrame = null; // Frame for virtual keyboard

    // Text editing and interaction handlers
    this.TEHammer = null;                       // Hammer manager for text editing
    this.TEWorkAreaHammer = null;               // Hammer manager for text edit work area
    this.clickAreaHammer = null;                // Hammer manager for click areas
    this.decAreaHammer = null;                  // Hammer manager for decoration areas
    this.noteAreaHammer = null;                 // Hammer manager for note areas
    this.textEntryTimer = null;                 // Timer for text entry actions
    this.editModeList = null;                   // Stack of edit modes
    // #endregion

    // #region Block IDs
    /**
     * Initialize persistent storage block IDs
     * These reference stored objects in the object manager
     */
    this.theSelectedListBlockID = -1;           // ID for selected objects list
    this.sdDataBlockId = -1;                // ID for shape editing data
    this.teDataBlockId = -1;                // ID for text editing session data
    this.layersManagerBlockId = -1;             // ID for layer management data
    this.linksBlockId = -1;                     // ID for connection links data
    // #endregion

    // #region Stamp Operations
    /**
     * Initialize properties for stamp/duplicate operations
     * These track state during stamp and duplication operations
     */
    this.stampTimeout = null;                   // Timeout for stamp operations
    this.stampCompleteCallback = null;          // Callback after stamp completion
    this.stampCompleteUserData = null;          // User data for callback
    this.stampHCenter = true;                   // Whether to center horizontally
    this.stampVCenter = true;                   // Whether to center vertically
    this.stampShapeOffsetX = 0;                 // X offset for stamped shape
    this.stampShapeOffsetY = 0;                 // Y offset for stamped shape
    this.stampSticky = false;                   // Whether stamp mode is persistent
    this.lastOpDuplicate = false;               // Whether last op was duplicate
    // #endregion

    // #region Format Painter
    /**
     * Initialize properties for format painter functionality
     * These track state during format painting operations
     */
    this.formatPainterMode = StyleConstant.FormatPainterModes.None;  // Format painter mode
    this.formatPainterStyle = new QuickStyle();  // Style info for format painter
    this.formatPainterSticky = false;            // Whether format painter persists
    this.formatPainterText = new QuickStyle();   // Text style for format painter
    this.formatPainterParaFormat = new ParagraphFormat();  // Paragraph format
    this.formatPainterArrows = null;             // Arrow style for format painter
    // #endregion

    // #region Nudge Operations
    /**
     * Initialize properties for nudge operations (small movements)
     * These track state during nudge operations
     */
    this.nudgeDelta = 10;                        // Size of nudge movement
    this.nudgeOpen = false;                      // Whether nudge panel is open
    this.nudgeX = 0;                             // X coordinate for nudge
    this.nudgeY = 0;                             // Y coordinate for nudge
    this.nudgeGrowX = 0;                         // X growth for nudge
    this.nudgeGrowY = 0;                         // Y growth for nudge
    // #endregion

    // #region Document State
    /**
     * Initialize properties for document-wide state
     * These track the overall state of the document
     */
    this.useDefaultStyle = false;                // Whether to use default style
    this.newObjectVisible = false;               // Whether new objects are visible
    this.TextureList = new TextureList();        // List of available textures
    this.nStdTextures = 0;                       // Number of standard textures
    this.richGradients = [];                     // List of gradient definitions
    this.header = new HeaderInfo();    // Document metadata and settings
    this.FileVersion = 41;                       // File format version
    this.bDrawEffects = true;                    // Whether to draw effects
    this.hasBlockDirectory = false;              // Whether block directory exists
    // this.initialStateID = T3Gv.state.currentStateId;  // Initial state ID
    this.nDataStoreStart = T3Gv.stdObj.storedObjects.length;  // Initial object count
    // #endregion

    // #region Clipboard & Paste
    /**
     * Initialize properties for clipboard operations
     * These track clipboard state and paste operations
     */
    this.textClipboard = null;                   // Clipboard for text content
    this.htmlClipboard = null;                   // Clipboard for HTML content
    this.imageClipboard = null;                  // Clipboard for image content
    this.cutFromButton = false;                  // Whether cut from button press
    this.topLeftPastePos = { x: 0, y: 0 };       // Position for paste operation
    this.topLeftPasteScrollPos = { x: 0, y: 0 }; // Scroll position during paste
    this.pasteCount = 0;                         // Count of paste operations
    // #endregion

    // #region Dirty State
    /**
     * Initialize properties for tracking modified objects
     * These track which objects need updating
     */
    this.dirtyList = [];                         // List of objects needing redraw
    this.dirtyListMoveOnly = [];                 // Objects moved without other changes
    this.dirtyListReOrder = false;               // Whether z-ordering changed
    // #endregion

    // #region Note Editing
    /**
     * Initialize properties for note editing functionality
     * These track state during note editing
     */
    // this.curNoteShape = -1;                      // Shape with note being edited
    // this.curNoteTableCell = null;                // Table cell with note being edited
    // this.curNoteGraphPint = null;                // Graph point with note
    this.bInNoteEdit = false;                    // Whether in note edit mode
    this.bNoteChanged = false;                   // Whether note content changed
    // #endregion

    // #region Miscellaneous State
    /**
     * Initialize other state tracking properties
     * These track various utility states
     */
    this.wasClickInShape = false;                // Whether last click was in shape
    this.eventTimestamp = 0;                     // Timestamp of last event
    this.actionArrowHideTimer = new T3Timer(this);  // Timer for hiding arrows
    this.uniqueId = 0;                           // Counter for generating IDs
    this.bInDimensionEdit = false;               // Whether editing dimensions
    this.oldAllowSave = true;                    // Previous save permission
    this.postMoveSelectId = null;                // ID to select after move
    this.bBuildingSymbols = false;               // Whether building symbols
    this.bTokenizeStyle = false;                 // Whether tokenizing style
    this.linkParams = null;                      // Parameters for linking objects
    this.rClickParam = null;                // Parameters from right-click
    this.curHiliteShape = -1;                    // Currently highlighted shape
    this.doubleClickSymbolTimeStamp = 0;         // Time of last symbol double-click
    this.importContext = null;                   // Context for import operations
    this.cachedHeight = null;                    // Cached height value
    this.cachedWidth = null;                     // Cached width value
    // #endregion

    // #region Symbol & Bitmap
    /**
     * Initialize properties for external asset management
     * These handle symbol libraries and bitmap handling
     */
    this.emptySymbolList = [];                   // List of empty symbols
    this.emptyEMFList = [];                      // List of empty EMF files
    this.addCount = 0;                           // Count of added objects
    this.symbolLibraryItemID = -1;               // ID in symbol library

    // Bitmap import properties
    this.bitmapImportCanvas = null;              // Canvas for bitmap import
    this.bitmapImportCanvasCTX = null;           // Canvas context for bitmap import
    this.bitmapScaledCanvas = null;              // Canvas for scaled bitmaps
    this.bitmapScaledCanvasCTX = null;           // Context for scaled canvas
    this.bitmapImportSourceWidth = 0;            // Original bitmap width
    this.bitmapImportSourceHeight = 0;           // Original bitmap height
    this.bitmapImportDestWidth = 800;            // Target bitmap width
    this.bitmapImportDestHeight = 800;           // Target bitmap height
    this.bitmapImportMaxScaledWidth = 1200;      // Max scaled width
    this.bitmapImportMaxScaledHeight = 1200;     // Max scaled height
    this.bitmapImportDPI = 200;                  // DPI for imported bitmap
    this.bitmapImportMimeType = '';              // MIME type of imported bitmap
    this.bitmapImportOriginalSize = 0;           // Original size in bytes
    this.bitmapImportScaledSize = 0;             // Scaled size in bytes
    this.scaledBitmapCallback = null;            // Callback after scaling
    this.bitmapImportEXIFdata = null;            // EXIF data from image
    this.bitmapImportFile = null;                // File being imported
    this.bitmapImportResult = null;              // Result of import operation
    // #endregion

    // #region Collaboration
    /**
     * Initialize properties for multi-user collaboration
     * These track state during collaborative editing
     */
    // this.collaboration = new Collaboration();    // Collaboration manager
    this.commentUserIDs = [];                    // User IDs for comments
    this.activeExpandedView = null;              // Currently expanded view
    this.alternateStateManagerVars = {           // Alternate state variables
      bHasBeenSaved: false
    };
    this.socketAction = [];                      // Actions for socket transmission
    this.pageAction = [];                        // Actions for page changes
    this.pagesToDelete = [];                     // Pages marked for deletion
    this.oldFileMetaData = null;                 // Previous file metadata
    this.selectionState = new SelectionAttr(); // Current selection state
    // #endregion

    // #region Block Creation & Initialization
    /**
     * Create persistent storage blocks and initialize the system
     * These setup basic data structures required for document management
     */
    // Create selected list block
    const selectedListBlock = T3Gv.stdObj.CreateBlock(
      StateConstant.StoredObjectType.SelectedListObject,
      []
    );
    this.theSelectedListBlockID = selectedListBlock.ID;

    // Create shape data block
    const sdData = new SDData();
    sdData.def.style = new QuickStyle();
    sdData.def.pen = Utils1.DeepCopy(OptConstant.Common.PenStylingDefault);
    sdData.def.highlighter = Utils1.DeepCopy(OptConstant.Common.HighlighterStylingDefault);
    sdData.d_sarrow = 0;
    sdData.d_sarrowdisp = false;
    sdData.d_earrow = 0;
    sdData.d_earrowdisp = false;
    sdData.d_arrowsize = 1;
    sdData.CurrentTheme = null;

    const sdDataBlock = T3Gv.stdObj.CreateBlock(
      StateConstant.StoredObjectType.SDDataObject,
      sdData
    );
    this.sdDataBlockId = sdDataBlock.ID;

    // Create layers manager block
    const layersManager = new LayersManager();
    const defaultLayer = new Layer();
    defaultLayer.name = OptConstant.Common.DefaultLayerName;
    layersManager.layers.push(defaultLayer);
    layersManager.nlayers = 1;
    layersManager.activelayer = 0;

    const layersManagerBlock = T3Gv.stdObj.CreateBlock(
      StateConstant.StoredObjectType.LayersManagerObject,
      layersManager
    );
    this.layersManagerBlockId = layersManagerBlock.ID;

    // Create text edit block
    const teData = new TEData();
    const tDataBlock = T3Gv.stdObj.CreateBlock(
      StateConstant.StoredObjectType.TEDataObject,
      teData
    );
    this.teDataBlockId = tDataBlock.ID;

    // Create links list block
    const linksBlock = T3Gv.stdObj.CreateBlock(
      StateConstant.StoredObjectType.LinkListObject,
      []
    );
    this.linksBlockId = linksBlock.ID;
    // #endregion

    // Initialize the system
    DataUtil.PreserveUndoState(true);
    UIUtil.InitSVGDocument();
    this.sVGroot = this.svgDoc.svgObj.node;
    SelectUtil.UpdateSelectionAttributes(null);
    this.BuildarrowHlkTables();
    OptCMUtil.SetEditMode(NvConstant.EditState.Default);
  }

  HandleDimensionEditMode(sessionData) {
    T3Util.Log('O.Opt HandleDimensionEditMode - Input:', sessionData);

    const TEXT_FACE = TextConstant.TextFace;

    this.selectionState.fontid = -1;
    this.selectionState.fontsize = T3Gv.opt.header.DimensionFont.fontSize;
    this.selectionState.bold = (T3Gv.opt.header.DimensionFont.face & TEXT_FACE.Bold) > 0;
    this.selectionState.italic = (T3Gv.opt.header.DimensionFont.face & TEXT_FACE.Italic) > 0;
    this.selectionState.underline = (T3Gv.opt.header.DimensionFont.face & TEXT_FACE.Underline) > 0;
    this.selectionState.superscript = (T3Gv.opt.header.DimensionFont.face & TEXT_FACE.Superscript) > 0;
    this.selectionState.subscript = (T3Gv.opt.header.DimensionFont.face & TEXT_FACE.Subscript) > 0;
    this.selectionState.csOptMng = null;

    T3Util.Log('O.Opt HandleDimensionEditMode - Output: Dimension edit mode processed');
  }

  HandleEmptySelectionOrNoteEditMode(sessionData) {
    T3Util.Log('O.Opt HandleEmptySelectionOrNoteEditMode - Input:', sessionData);

    const TEXT_FACE = TextConstant.TextFace;

    this.selectionState.fontid = -1;
    this.selectionState.fontsize = sessionData.def.style.Text.FontSize;
    this.selectionState.bold = (sessionData.def.style.Text.Face & TEXT_FACE.Bold) > 0;
    this.selectionState.italic = (sessionData.def.style.Text.Face & TEXT_FACE.Italic) > 0;
    this.selectionState.underline = (sessionData.def.style.Text.Face & TEXT_FACE.Underline) > 0;
    this.selectionState.superscript = (sessionData.def.style.Text.Face & TEXT_FACE.Superscript) > 0;
    this.selectionState.subscript = (sessionData.def.style.Text.Face & TEXT_FACE.Subscript) > 0;
    this.selectionState.TextDirection = (sessionData.def.textflags & NvConstant.TextFlags.HorizText) === 0;
    this.selectionState.dimensions =
      (sessionData.dimensions & NvConstant.DimensionFlags.Always) ||
      (sessionData.dimensions & NvConstant.DimensionFlags.Select);

    // Handle operation mng for note edit
    if (this.bInNoteEdit && this.curNoteShape >= 0) {
      const optMng = OptAhUtil.GetGvSviOpt(this.curNoteShape);
      if (optMng) {
        this.selectionState.csOptMng = optMng;
      }
    }

    T3Util.Log('O.Opt HandleEmptySelectionOrNoteEditMode - Output: Empty selection or note edit mode processed');
  }

  ProcessTargetObject(targetId, targetObject) {
    T3Util.Log('O.Opt ProcessTargetObject - Input:', { targetId, targetObject });

    // Get the operation mng for the target object
    const optMng = OptAhUtil.GetGvSviOpt(targetId);
    if (optMng) {
      this.selectionState.csOptMng = optMng;
    }

    this.selectionState.tselect = targetId;

    if (targetObject) {
      this.selectionState.colorfilter = targetObject.colorfilter;
      targetObject.GetPositionRect();
      this.selectionState.subtype = targetObject.subtype;
      this.selectionState.objecttype = targetObject.objecttype;
      this.selectionState.datasetElemID = targetObject.datasetElemID;

      // Get dimensions for display
      const dimensions = targetObject.GetDimensionsForDisplay();
      this.selectionState.left = dimensions.x;
      this.selectionState.top = dimensions.y;
      this.selectionState.width = dimensions.width;
      this.selectionState.height = dimensions.height;

      // Handle wall objects
      if (targetObject.objecttype === NvConstant.FNObjectTypes.FlWall) {
        this.selectionState.WallThickness = targetObject.StyleRecord.Line.Thickness;
      }

      // Format dimensions as strings
      this.selectionState.leftstr = targetObject.GetLengthInRulerUnits(
        this.selectionState.left,
        T3Gv.docUtil.rulerConfig.originx
      );
      this.selectionState.topstr = targetObject.GetLengthInRulerUnits(
        this.selectionState.top,
        T3Gv.docUtil.rulerConfig.originy
      );
      this.selectionState.widthstr = targetObject.GetLengthInRulerUnits(this.selectionState.width);

      if (dimensions.height !== 0) {
        this.selectionState.heightstr = targetObject.GetLengthInRulerUnits(this.selectionState.height);
      } else {
        this.selectionState.heightstr = '';
      }

      // Check if selection has text
      this.selectionState.selectionhastext = targetObject.DataID >= 0;
    }

    T3Util.Log('O.Opt ProcessTargetObject - Output: Target object processed');
  }

  ProcessSelectedObject(object, textObject, objectIndex) {
    T3Util.Log('O.Opt ProcessSelectedObject - Input:', { object, textObject, objectIndex });

    const TEXT_FACE = TextConstant.TextFace;
    const DRAWING_OBJECT_CLASS = OptConstant.DrawObjectBaseClass;

    // Handle image URLs
    if (object.ImageURL && object.ImageURL.length) {
      this.selectionState.nimageselected++;
    }

    // Handle swimlane or shape container
    if (object instanceof Instance.Shape.ShapeContainer) {
      this.selectionState.lockedTableSelected = true;
      this.selectionState.IsTargetTable = true;
    }

    // Handle wall objects
    if (object.objecttype === NvConstant.FNObjectTypes.FlWall) {
      this.selectionState.iswallselected = true;
    }

    // Get base class, handling special cases
    let objectClass = object.DrawingObjectBaseClass;
    if (object instanceof Instance.Shape.PolyLineContainer) {
      objectClass = DRAWING_OBJECT_CLASS.Shape;
    }

    // Process object based on its class
    switch (objectClass) {
      case DRAWING_OBJECT_CLASS.Shape:
        this.ProcessShapeObject(object, null);
        break;

      case DRAWING_OBJECT_CLASS.Connector:
        this.ProcessConnectorObject(object);
      // Fall through to LINE case

      case DRAWING_OBJECT_CLASS.Line:
        this.ProcessLineObject(object);
        break;
    }

    // Handle text and group objects
    if (textObject.DataID >= 0) {
      this.selectionState.selectionhastext = true;
    }

    if (object instanceof Instance.Shape.GroupSymbol || object.NativeID >= 0) {
      this.selectionState.ngroupsselected++;
    }

    TextUtil.HandleTextFormatAttributes(textObject, objectIndex);

    // Handle special object types
    if (object instanceof Instance.Shape.PolyLineContainer) {
      this.selectionState.npolylinecontainerselected++;
    }

    // Handle polyline objects
    if (object instanceof Instance.Shape.PolyLine && object.polylist && object.polylist.segs) {
      this.selectionState.nsegs = object.polylist.segs.length;
      this.selectionState.polyclosed = object.polylist.closed;
    }

    // Update dimensions flags
    this.selectionState.dimensions |= object.Dimensions & (
      NvConstant.DimensionFlags.Always | NvConstant.DimensionFlags.Select
    );

    T3Util.Log('O.Opt ProcessSelectedObject - Output: Object processed');
  }

  ProcessShapeObject(shape, table) {

    this.selectionState.nshapeselected++;

    // Handle rectangle corner radius
    if (shape.ShapeType === OptConstant.ShapeType.Rect || shape.ShapeType === OptConstant.ShapeType.RRect) {
      if (shape.moreflags & OptConstant.ObjMoreFlags.FixedRR) {
        if (this.selectionState.fixedCornerRadius === -2) {
          this.selectionState.fixedCornerRadius = 100 * shape.shapeparam;
        } else if (this.selectionState.fixedCornerRadius !== 100 * shape.shapeparam) {
          this.selectionState.fixedCornerRadius = -1;
        }
      } else if (this.selectionState.fixedCornerRadius === -2 && shape.shapeparam === 0) {
        this.selectionState.fixedCornerRadius = 0;
      } else {
        this.selectionState.fixedCornerRadius = -1;
      }
    }

    T3Util.Log('O.Opt ProcessShapeObject - Output: Shape object processed');
  }

  ProcessConnectorObject(connector) {
    T3Util.Log('O.Opt ProcessConnectorObject - Input:', connector);

    this.selectionState.nconnectorselected++;

    if (connector.AllowCurveOnConnector()) {
      this.selectionState.connectorCanHaveCurve = true;

      if (this.selectionState.lineCornerRadius === -2) {
        this.selectionState.lineCornerRadius = connector.arraylist.curveparam;
      } else if (this.selectionState.lineCornerRadius !== connector.arraylist.curveparam) {
        this.selectionState.lineCornerRadius = -1;
      }
    }

    T3Util.Log('O.Opt ProcessConnectorObject - Output: Connector object processed');
  }

  ProcessLineObject(lineObject) {
    T3Util.Log('O.Opt ProcessLineObject - Input:', lineObject);

    // Increment count of selected line objects
    this.selectionState.nlineselected++;

    // Handle text direction consistency across selected objects
    const lineTextDirection = lineObject.TextDirection;
    if (this.selectionState.TextDirection === 0) {
      // First line sets the direction
      this.selectionState.TextDirection = lineTextDirection;
    } else if (this.selectionState.TextDirection !== lineTextDirection) {
      // If directions don't match, mark as inconsistent
      this.selectionState.TextDirection = -1;
    }

    // Handle corner radius for segmented lines
    if (lineObject.LineType === OptConstant.LineType.SEGLINE) {
      if (this.selectionState.lineCornerRadius === -2) {
        // First segmented line sets the corner radius
        this.selectionState.lineCornerRadius = lineObject.segl.curveparam;
      } else if (this.selectionState.lineCornerRadius !== lineObject.segl.curveparam) {
        // If corner radii don't match, mark as inconsistent
        this.selectionState.lineCornerRadius = -1;
      }
    }

    T3Util.Log('O.Opt ProcessLineObject - Output: Line processed', {
      lineCount: this.selectionState.nlineselected,
      textDirection: this.selectionState.TextDirection,
      cornerRadius: this.selectionState.lineCornerRadius
    });
  }

  BuildarrowHlkTables() {
    T3Util.Log("O.Opt BuildarrowHlkTables - Input: No parameters");

    const arrowDefs = new ArrowDefs().uiArrowDefs;
    const arrowSizes = new ArrowSizes().uiarrowSizes;

    // Initialize lookup tables to the correct size
    T3Gv.arrowHlkTable.length = arrowDefs.length;
    for (let index = 0; index < arrowDefs.length; index++) {
      T3Gv.arrowHlkTable[arrowDefs[index].id] = arrowDefs[index];
    }

    // Initialize size table to the correct size
    T3Gv.arrowHsTable.length = arrowSizes.length;
    for (let index = 0; index < arrowSizes.length; index++) {
      T3Gv.arrowHsTable[index] = arrowSizes[index];
    }

    T3Util.Log("O.Opt BuildarrowHlkTables - Output: Arrowhead lookup tables built");
  }

  SetDimensionVisibility(objects, isVisible) {
    T3Util.Log('O.Opt SetDimensionVisibility: input', { objects, isVisible });

    let objectCount = objects.length;
    for (let i = 0; i < objectCount; i++) {
      let object = DataUtil.GetObjectPtr(objects[i], false);
      if (object && object.ShowOrHideDimensions) {
        object.ShowOrHideDimensions(isVisible);
      }
    }

    T3Util.Log('O.Opt SetDimensionVisibility: output');
  }

  CloseEdit(skipShapeClose?: boolean, closeOption?: any, skipTooltipProcessing?: boolean) {
    T3Util.Log("O.Opt CloseEdit - Input:", { skipShapeClose, closeOption, skipTooltipProcessing });

    const isProcessingMessage = false;

    if (!isProcessingMessage) {
      let isNudgeActive = false;
      if (this.nudgeOpen) {
        isNudgeActive = true;
      }
      if (!skipTooltipProcessing) {
        TextUtil.HandleDataTooltipClose(true);
      }
      UIUtil.SetFormatPainter(true, false);
      this.DeactivateAllTextEdit(false, !skipShapeClose);
      if (this.bInNoteEdit) {
      }
      if (!skipShapeClose) {
        this.CloseShapeEdit(closeOption);
      }
    }
    T3Util.Log("O.Opt CloseEdit - Output: done");
  }

  DeactivateAllTextEdit(skipShapeClose: boolean, closeOption?: any) {
    T3Util.Log('O.Opt DeactivateAllTextEdit - Input:', { skipShapeClose, closeOption });

    const teData = DataUtil.GetObjectPtr(this.teDataBlockId, false);
    if (teData.theActiveTextEditObjectID !== -1) {
      TextUtil.DeactivateTextEdit(skipShapeClose, closeOption);
    } else {
      const activeEdit = this.svgDoc.GetActiveEdit();
      if (activeEdit != null && activeEdit.ID === OptConstant.SVGElementClass.DimText) {
        TextUtil.TEUnregisterEvents();
      }
    }

    T3Util.Log('O.Opt DeactivateAllTextEdit - Output: done');
  }

  CloseShapeEdit(providedOutlineId, useAlternate?, alternateOutlineId?) {
    T3Util.Log("O.Opt CloseShapeEdit - Input:", { providedOutlineId, useAlternate, alternateOutlineId });

    let sessionData = DataUtil.GetObjectPtr(this.teDataBlockId, false);
    let activeOutlineId = sessionData.theActiveOutlineObjectID;

    // If using the alternate outline id then override activeOutlineId.
    if (useAlternate) {
      activeOutlineId = alternateOutlineId;
    }

    if (activeOutlineId >= 0) {
      // If the provided outline id is boolean true or already the active id, do nothing.
      if (providedOutlineId === true) {
        T3Util.Log("O.Opt CloseShapeEdit - Output: Skipping close because providedOutlineId is true");
        return;
      }
      if (providedOutlineId === activeOutlineId) {
        T3Util.Log("O.Opt CloseShapeEdit - Output: Provided outline id equals active outline id, no action taken");
        return;
      }
      let shapeObject = DataUtil.GetObjectPtr(activeOutlineId, false);
      if (shapeObject) {
        if (shapeObject.objecttype === NvConstant.FNObjectTypes.FlWall) {
          T3Util.Log("O.Opt CloseShapeEdit - Output: Active outline is a wall opt wall, skipping close");
          return;
        }

        shapeObject = DataUtil.GetObjectPtr(activeOutlineId, false);
        if (
          shapeObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line &&
          shapeObject.LineType === OptConstant.LineType.POLYLINE &&
          shapeObject.polylist.closed &&
          (this.PolyLineToShape(activeOutlineId))
        ) {
          const messagePayload = { BlockID: activeOutlineId };
        }
      }
      if (!useAlternate) {
        // Reset the active outline id.
        sessionData = DataUtil.GetObjectPtr(this.teDataBlockId, true);
        sessionData.theActiveOutlineObjectID = -1;
      }
      DrawUtil.CompleteOperation();
    }
    T3Util.Log("O.Opt CloseShapeEdit - Output: Operation complete");
  }

  /**
   * Converts a PolyLine object to a Polygon shape
   * This function takes a polyline with multiple points and converts it to a closed
   * polygon shape, preserving its position, rotation, and other properties.
   * The polyline's points are normalized to the shape's dimensions.
   *
   * @param polyLineId - ID of the polyline object to convert
   * @param skipRendering - If true, skips rendering the object after conversion
   * @returns Boolean indicating whether a shape was successfully converted from polyline
   */
  PolyLineToShape(polyLineId, skipRendering?) {
    let polyLineObject;
    let polygonShape;
    let vertexIndex;
    let polyPoints;
    let normalizedPoint;
    let pointCount;
    let width;
    let height;
    let boundingRect = { x: 0, y: 0, width: 0, height: 0 };

    // Get and preserve the polyline block
    const polyLineBlock = T3Gv.stdObj.PreserveBlock(polyLineId);

    if (polyLineBlock != null) {
      // Get the polyline object from the block
      polyLineObject = polyLineBlock.Data;

      // Get the points that make up the polyline
      polyPoints = polyLineObject.GetPolyPoints(
        OptConstant.Common.MaxPolyPoints,
        true,
        false,
        false,
        null
      );

      pointCount = polyPoints.length;

      // Set dimension and offset data
      polyLineObject.polylist.dim.x = polyLineObject.inside.width;
      polyLineObject.polylist.dim.y = polyLineObject.inside.height;
      polyLineObject.polylist.offset.x = polyLineObject.StartPoint.x - polyLineObject.Frame.x;
      polyLineObject.polylist.offset.y = polyLineObject.StartPoint.y - polyLineObject.Frame.y;

      // Ensure minimum dimensions
      width = polyLineObject.inside.width;
      if (width < 1) {
        width = 1;
      }

      height = polyLineObject.inside.height;
      if (height < 1) {
        height = 1;
      }

      // Create new polygon shape and copy properties from polyline
      polygonShape = new Instance.Shape.Polygon(polyLineObject);
      polygonShape.NeedsSIndentCount = true;
      polygonShape.polylist = polyLineObject.polylist;
      polygonShape.BlockID = polyLineObject.BlockID;
      polygonShape.StartPoint = polyLineObject.StartPoint;
      polygonShape.EndPoint = polyLineObject.EndPoint;
      polygonShape.RotationAngle = polyLineObject.polylist.Shape_Rotation;
      polygonShape.DataID = polyLineObject.polylist.Shape_DataID;

      // Calculate bounding rectangle of points
      Utils2.GetPolyRect(boundingRect, polyPoints);

      // Process each vertex, normalizing to shape dimensions
      for (vertexIndex = 0; vertexIndex < pointCount; vertexIndex++) {
        // Skip duplicate consecutive points
        if (vertexIndex > 0 &&
          polyPoints[vertexIndex].x === polyPoints[vertexIndex - 1].x &&
          polyPoints[vertexIndex].y === polyPoints[vertexIndex - 1].y) {
          continue;
        }

        // Adjust point relative to bounding rectangle
        polyPoints[vertexIndex].x -= boundingRect.x;
        polyPoints[vertexIndex].y -= boundingRect.y;

        // Normalize point coordinates to shape dimensions
        normalizedPoint = new Point(
          polyPoints[vertexIndex].x / width,
          polyPoints[vertexIndex].y / height
        );

        // Add normalized vertex to the polygon
        polygonShape.VertexArray.push(normalizedPoint);
      }

      // Update frame and replace the original object with the new polygon
      polygonShape.UpdateFrame(polyLineObject.Frame);
      polyLineBlock.Data = polygonShape;

      // Render the changes if not skipped
      if (!skipRendering) {
        DataUtil.AddToDirtyList(polyLineId);
        SvgUtil.RenderDirtySVGObjects();
      }

      return true;
    }

    return false;
  }

  EndStampSession() {
    T3Util.Log('O.Opt EndStampSession - Input');

    const editMode = OptCMUtil.GetEditMode();
    if (editMode === NvConstant.EditState.Stamp) {
      T3Gv.opt.actionStoredObjectId = -1;
      DrawUtil.CancelObjectDragDrop(true);

      if (T3Gv.opt.mainAppHammer) {
        T3Gv.opt.UnbindDragDropOrStamp();
      }
    }

    T3Util.Log('O.Opt EndStampSession - Output: done');
  }

  /**
   * Checks if snap behavior should be overridden (based on Alt key)
   * @param inputEvent - The input event to check for Alt key state
   * @returns True if snapping should be overridden, false otherwise
   */
  OverrideSnaps(inputEvent) {
    T3Util.Log('O.Opt OverrideSnaps - Input:', inputEvent);

    // Early return if no event provided
    if (inputEvent == null) {
      T3Util.Log('O.Opt OverrideSnaps - Output: false (no event)');
      return false;
    }

    // Check for Alt key in either direct event or gesture event
    let altKeyIsPressed = inputEvent.altKey;

    if (inputEvent.gesture && inputEvent.gesture.srcEvent) {
      altKeyIsPressed = inputEvent.gesture.srcEvent.altKey;
    }

    T3Util.Log('O.Opt OverrideSnaps - Output:', altKeyIsPressed);
    return altKeyIsPressed === true;
  }


  ExceptionCleanup(error) {
    T3Util.Log('O.Opt ExceptionCleanup - Input:', error);

    try {
      TextUtil.TEUnregisterEvents();
      this.DeactivateAllTextEdit(true);
      this.CloseEdit(false, true);
      T3Gv.state.ExceptionCleanup();
      UIUtil.ResizeSVGDocument();
      SvgUtil.RenderAllSVGObjects();

      const sessionData = DataUtil.GetObjectPtr(this.sdDataBlockId, false);
      const selectedList = DataUtil.GetObjectPtr(this.theSelectedListBlockID, false);
      SelectUtil.UpdateSelectionAttributes(selectedList);

      T3Util.Log('O.Opt ExceptionCleanup - Output: done');
    } catch (cleanupError) {
      console.error('O.Opt ExceptionCleanup - Cleanup Error:', cleanupError);
      throw cleanupError;
    }

    throw error;
  }

  RemoveNotVisible(objects) {
    T3Util.Log('O.Opt RemoveNotVisible - Input:', objects);

    const notVisibleFlag = NvConstant.ObjFlags.NotVisible;
    const visibleObjects = [];

    for (let i = 0; i < objects.length; i++) {
      const objectId = objects[i];
      const object = DataUtil.GetObjectPtr(objectId, false);

      if (object && !(object.flags & notVisibleFlag)) {
        visibleObjects.push(objectId);
      }
    }

    T3Util.Log('O.Opt RemoveNotVisible - Output:', visibleObjects);
    return visibleObjects;
  }


  AllowAddToRecent(item) {
    T3Util.Log('O.Opt allowAddToRecent - Input:', item);
    if (item) {
      if (item.flags & NvConstant.ObjFlags.TextOnly) {
        T3Util.Log('O.Opt allowAddToRecent - Output:', false);
        return false;
      }
    }
    T3Util.Log('O.Opt allowAddToRecent - Output:', true);
    return true;
  }

  UnbindDragDropOrStamp() {
    T3Util.Log('O.Opt UnbindDragDropOrStamp - Input: No parameters');

    if (T3Gv.opt.mainAppHammer) {
      T3Gv.opt.mainAppHammer.dispose();
      T3Gv.opt.mainAppHammer = null;
    }

    T3Util.Log('O.Opt UnbindDragDropOrStamp - Output: DragDrop or Stamp unbound');
  }

  /**
   * Recursively finds the ultimate target node by following object hooks
   * This function traverses a chain of connected objects to identify the final target node.
   * It follows the first hook of each object until it reaches an object without hooks,
   * which is considered the ultimate target.
   *
   * @param objectId - ID of the starting object to check
   * @returns The ID of the ultimate target node (object without hooks or end of chain)
   */
  GetTargetNode(objectId) {
    // Get the object from the object store
    const object = DataUtil.GetObjectPtr(objectId, false);

    // If the object exists and has hooks, recursively follow the first hook
    if (object && object.hooks.length) {
      // Call recursively with the ID of the object connected to the first hook
      objectId = this.GetTargetNode(object.hooks[0].objid);
    }

    // Return the final target node ID
    return objectId;
  }

  UpdateLinks() {
    T3Util.Log("O.Opt UpdateLinks - Input: No parameters");

    let objectFrame;
    let linkCount;
    let linkIndex;
    let targetNodeId;
    let targetObject;
    let hookPoint;
    let targetPoints;
    let numTargetPoints;
    let pointIndex;
    let bestPointIndex;
    let distanceSquared;
    let deltaY;
    let deltaX;
    let bestDistance;
    let hookObject;
    let hookTargetObject;
    let hookIndex;
    let moveList;
    let currentObject;
    let moveListLength;
    let continueProcessing = true;
    let needsBoundsCheck = false;
    let hasDeletedLinks = false;
    let hookFlags = 0;
    let hookPosition = {
      x: 0,
      y: 0
    };
    let perimeterPoints = [
      {
        x: 0,
        y: 0
      }
    ];
    let moveBounds = { x: 0, y: 0, width: 0, height: 0 };
    const constantData = OptConstant;
    let links = DataUtil.GetObjectPtr(this.linksBlockId, false);
    let isLinksModified = false;

    // Early return if no links exist
    if (links == null) {
      HookUtil.UpdateLineHops(true);
      T3Util.Log("O.Opt UpdateLinks - Output: 1 (No links found)");
      return 1;
    }

    // Fix any circular references in hooks
    HookUtil.FixAnyCircularHooks();

    // Get session data and save original snap setting
    const sessionData = DataUtil.GetObjectPtr(this.sdDataBlockId, false);
    const originalSnapEnabled = T3Gv.docUtil.docConfig.enableSnap;

    // Disable snapping during link updates
    T3Gv.docUtil.docConfig.enableSnap = false;

    // First pass: Delete marked links
    for (linkIndex = links.length - 1; linkIndex >= 0 && !(linkIndex >= links.length); linkIndex--) {
      // Handle links marked for deletion
      if (links[linkIndex].flags & DSConstant.LinkFlags.DeleteTarget) {
        // Ensure we're working with a modifiable copy of links
        if (!isLinksModified) {
          links = DataUtil.GetObjectPtr(this.linksBlockId, true);
          isLinksModified = true;
        }

        HookUtil.DeleteLink(links, links[linkIndex].targetid, -1, null, 0, false);
        linkIndex = links.length;
      }
      // Handle links with missing or broken hook objects
      else if (
        links[linkIndex].flags & DSConstant.LinkFlags.DeleteLink ||
        links[linkIndex].flagss & DSConstant.LinkFlags.Break ||
        (hookObject = DataUtil.GetObjectPtr(links[linkIndex].hookid, false)) == null
      ) {
        if (!isLinksModified) {
          links = DataUtil.GetObjectPtr(this.linksBlockId, true);
          isLinksModified = true;
        }

        HookUtil.DeleteLink(
          links,
          links[linkIndex].targetid,
          links[linkIndex].hookid,
          links[linkIndex].cellid,
          0,
          false
        );

        linkIndex = links.length;
      }
    }

    // Special handling for tree and flowchart layouts
    if (
      sessionData.flags & constantData.SessionFlags.NoTreeOverlap ||
      sessionData.flags & constantData.SessionFlags.IsFlowChart
    ) {
      let linkHasMoveFlag;
      linkCount = links.length;

      const treeTopInfo = {
        topconnector: -1,
        topshape: -1,
        foundtree: false
      };

      for (linkIndex = 0; linkIndex < linkCount; linkIndex++) {
        linkHasMoveFlag = links[linkIndex].flags & DSConstant.LinkFlags.Move;

        if (linkHasMoveFlag) {
          targetObject = DataUtil.GetObjectPtr(links[linkIndex].targetid, false);

          // If tree top is found, mark it for movement
          if (/*OptAhUtil.FindTreeTop(targetObject, linkHasMoveFlag, treeTopInfo)*/ 1 &&
            treeTopInfo.topshape >= 0) {
            OptCMUtil.SetLinkFlag(
              treeTopInfo.topshape,
              DSConstant.LinkFlags.Move
            );
          }

          // Reset tree top info for next iteration
          treeTopInfo.topshape = -1;
          treeTopInfo.foundtree = false;
        }
      }
    }

    // Process links with move flags
    while (continueProcessing) {
      continueProcessing = false;

      for (linkIndex = 0; linkIndex < links.length; linkIndex++) {
        if (links[linkIndex].flags & DSConstant.LinkFlags.Move) {
          // Ensure we're working with a modifiable copy of links
          if (!isLinksModified) {
            links = DataUtil.GetObjectPtr(this.linksBlockId, true);
            isLinksModified = true;
          }

          hookObject = DataUtil.GetObjectPtr(links[linkIndex].hookid, true);

          // If hook object is missing, mark link for deletion
          if (hookObject == null) {
            links[linkIndex].flags = Utils2.SetFlag(
              links[linkIndex].flags,
              DSConstant.LinkFlags.DeleteLink,
              true
            );
            links[linkIndex].flags = Utils2.SetFlag(
              links[linkIndex].flags,
              DSConstant.LinkFlags.Move,
              false
            );
            hasDeletedLinks = true;
            continue;
          }

          // Verify link and get hook index
          hookIndex = HookUtil.VerifyLink(hookObject, links[linkIndex]);
          if (hookIndex >= 0) {
            // Set hook object to not be visible when linked
            hookObject.LinkNotVisible();

            hookTargetObject = DataUtil.GetObjectPtr(links[linkIndex].targetid, false);

            // Special handling for multiplicity objects
            if (hookObject.objecttype === NvConstant.FNObjectTypes.Multiplicity) {
              links[linkIndex].flags = Utils2.SetFlag(
                links[linkIndex].flags,
                DSConstant.LinkFlags.Change,
                false
              );
            }

            // If the link has the change flag set, update connection points
            if (links[linkIndex].flags & DSConstant.LinkFlags.Change) {
              hookPoint = hookObject.HookToPoint(hookObject.hooks[hookIndex].hookpt, null);

              hookFlags = NvConstant.HookFlags.LcNoSnaps |
                NvConstant.HookFlags.LcForceEnd;

              hookFlags = Utils2.SetFlag(
                hookFlags,
                NvConstant.HookFlags.LcShapeOnLine,
                !(hookObject instanceof Instance.Shape.BaseLine)
              );

              targetPoints = hookTargetObject.GetTargetPoints(
                hookPoint,
                hookFlags,
                hookObject.BlockID
              );

              // Find the closest target point
              if (targetPoints) {
                numTargetPoints = targetPoints.length;
                bestDistance = null;

                for (pointIndex = 0; pointIndex < numTargetPoints; pointIndex++) {
                  deltaX = targetPoints[pointIndex].x - hookObject.hooks[hookIndex].connect.x;
                  deltaY = targetPoints[pointIndex].y - hookObject.hooks[hookIndex].connect.y;

                  distanceSquared = deltaX * deltaX + deltaY * deltaY;

                  if (bestDistance == null || distanceSquared < bestDistance) {
                    bestDistance = distanceSquared;
                    bestPointIndex = pointIndex;
                  }
                }

                // Update with best connection point
                if (bestPointIndex != null) {
                  hookObject.hooks[hookIndex].connect.x = targetPoints[bestPointIndex].x;

                  if (hookObject.DrawingObjectBaseClass != OptConstant.DrawObjectBaseClass.Connector) {
                    hookObject.hooks[hookIndex].connect.y = targetPoints[bestPointIndex].y;
                  }
                }
              }

              // Update the hook point to the best one for the target
              hookObject.hooks[hookIndex].hookpt = hookTargetObject.GetBestHook(
                links[linkIndex].hookid,
                hookObject.hooks[hookIndex].hookpt,
                hookObject.hooks[hookIndex].connect
              );

              // Clear the change flag
              links[linkIndex].flags = Utils2.SetFlag(
                links[linkIndex].flags,
                DSConstant.LinkFlags.Change,
                false
              );
            }

            // Get the current hook position
            hookPosition = hookObject.HookToPoint(hookObject.hooks[hookIndex].hookpt, null);
            if (hookPosition == null) continue;

            // Update connection points for the target object
            if (hookTargetObject != null) {
              perimeterPoints[0].x = hookObject.hooks[hookIndex].connect.x;
              perimeterPoints[0].y = hookObject.hooks[hookIndex].connect.y;

              perimeterPoints = hookTargetObject.GetPerimPts(
                links[linkIndex].targetid,
                perimeterPoints,
                hookObject.hooks[hookIndex].hookpt,
                false,
                links[linkIndex].cellid,
                links[linkIndex].hookid
              );

              // Handle special cases based on hook count
              if (hookObject.hooks.length === 1) {
                // Calculate offset needed to align with perimeter point
                deltaX = perimeterPoints[0].x - hookPosition.x;
                if (Math.abs(deltaX) < 0.1) deltaX = 0;

                deltaY = perimeterPoints[0].y - hookPosition.y;
                if (Math.abs(deltaY) < 0.1) deltaY = 0;

                // Apply offset if needed
                if (deltaX || deltaY) {
                  ToolActUtil.OffsetShape(
                    links[linkIndex].hookid,
                    deltaX,
                    deltaY,
                    OptConstant.ActionTriggerType.UpdateLinks
                  );

                  // Check if object went out of bounds
                  objectFrame = hookObject.Frame;
                  if (
                    objectFrame.x < 0 ||
                    objectFrame.y < 0 ||
                    objectFrame.x + objectFrame.width > sessionData.dim.x ||
                    objectFrame.y + objectFrame.height > sessionData.dim.y
                  ) {
                    needsBoundsCheck = true;
                    targetNodeId = this.GetTargetNode(links[linkIndex].hookid);

                    targetObject = DataUtil.GetObjectPtr(targetNodeId, false);
                    if (targetObject) {
                      targetObject.flags = Utils2.SetFlag(
                        targetObject.flags,
                        NvConstant.ObjFlags.Bounds,
                        true
                      );
                    }
                  }
                }
              }
              // For objects with exactly 2 hooks, use LinkGrow
              else if (hookObject.hooks.length === 2) {
                hookObject.LinkGrow(
                  links[linkIndex].hookid,
                  hookObject.hooks[hookIndex].hookpt,
                  perimeterPoints[0]
                );
              }
            }

            // Clear move flag and continue processing
            links[linkIndex].flags = Utils2.SetFlag(
              links[linkIndex].flags,
              DSConstant.LinkFlags.Move,
              false
            );
            continueProcessing = true;
          } else {
            hasDeletedLinks = true;
          }
        }
      }
    }

    // Clean up any links marked for deletion
    if (hasDeletedLinks) {
      for (linkIndex = links.length - 1; linkIndex >= 0 && !(linkIndex >= links.length); linkIndex--) {
        if (links[linkIndex].flags & DSConstant.LinkFlags.DeleteTarget) {
          HookUtil.DeleteLink(links, links[linkIndex].targetid, -1, null, 0, false);
          linkIndex = links.length;
        }
        else if (
          links[linkIndex].flags & DSConstant.LinkFlags.DeleteLink ||
          links[linkIndex].flagss & DSConstant.LinkFlags.Break ||
          (hookObject = DataUtil.GetObjectPtr(links[linkIndex].hookid, false)) == null
        ) {
          HookUtil.DeleteLink(
            links,
            links[linkIndex].targetid,
            links[linkIndex].hookid,
            links[linkIndex].cellid,
            0,
            false
          );
          linkIndex = links.length;
        }
      }
    }

    // Handle objects that went out of bounds
    if (needsBoundsCheck) {
      const zList = LayerUtil.ZList();

      DrawUtil.InitializeAutoGrowDrag();
      linkCount = zList.length;

      for (linkIndex = 0; linkIndex < linkCount; linkIndex++) {
        currentObject = DataUtil.GetObjectPtr(zList[linkIndex], false);

        if (currentObject &&
          currentObject.flags & NvConstant.ObjFlags.Bounds) {

          // Clear bounds flag
          currentObject.flags = Utils2.SetFlag(
            currentObject.flags,
            NvConstant.ObjFlags.Bounds,
            false
          );

          // Get objects to move together
          moveList = SelectUtil.GetMoveList(
            zList[linkIndex],
            false,
            true,
            false,
            moveBounds,
            false
          );

          // Calculate needed offsets to fit in document bounds
          deltaX = 0;
          if (moveBounds.x + moveBounds.width > sessionData.dim.x) {
            deltaX = sessionData.dim.x - (moveBounds.x + moveBounds.width);
          }
          if (deltaX < -moveBounds.x) {
            deltaX = -moveBounds.x;
          }

          deltaY = 0;
          if (moveBounds.y + moveBounds.height > sessionData.dim.y) {
            deltaY = sessionData.dim.y - (moveBounds.y + moveBounds.height);
          }
          if (deltaY < -moveBounds.y) {
            deltaY = -moveBounds.y;
          }

          // Apply offsets if needed
          moveListLength = moveList.length;
          if ((deltaX || deltaY) && moveListLength) {
            for (pointIndex = 0; pointIndex < moveListLength; pointIndex++) {
              ToolActUtil.OffsetShape(
                moveList[pointIndex],
                deltaX,
                deltaY,
                OptConstant.ActionTriggerType.UpdateLinks
              );
            }
          }
        }
      }

      this.moveList = null;
    }

    // Restore original snap setting
    T3Gv.docUtil.docConfig.enableSnap = originalSnapEnabled;

    T3Util.Log("O.Opt UpdateLinks - Output: 0 (Success)");
    return 0;
  }

  CalcAllObjectEnclosingRect(shouldUseEdges, fitOptions?) {
    T3Util.Log("O.Opt CalcAllObjectEnclosingRect - Input:", { shouldUseEdges, fitOptions });

    // Get all visible objects and their count
    const visibleObjects = LayerUtil.VisibleZList();
    const visibleObjectCount = visibleObjects.length;

    // Default padding values
    let widthPadding = 0;
    let heightPadding = 0;

    // Get layers manager to check layer settings
    const layersManager = DataUtil.GetObjectPtr(this.layersManagerBlockId, false);

    // Initialize empty enclosing rectangle
    let enclosingRect = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };

    // If no visible objects, return empty rect
    if (visibleObjectCount === 0) {
      T3Util.Log("O.Opt CalcAllObjectEnclosingRect - Output:", enclosingRect);
      return enclosingRect;
    }

    let layerIndex = 0;
    let objectId = 0;
    let objectData = null;
    let objectRect = null;
    let objectsFromEdgeLayers = [];

    // Collect objects from edge layers if needed
    for (layerIndex = 0; layerIndex < layersManager.nlayers; layerIndex++) {
      if (layerIndex !== layersManager.activelayer &&
        layersManager.layers[layerIndex].flags & NvConstant.LayerFlags.UseEdges) {

        // Add objects from this edge layer to our collection
        objectsFromEdgeLayers = objectsFromEdgeLayers.concat(layersManager.layers[layerIndex].zList);

        if (shouldUseEdges) {
          // Add padding for edge layers
          widthPadding = 25;
          heightPadding = 25;

          const objectsInEdgeLayer = objectsFromEdgeLayers.length;
          const sessionData = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

          // Check for annotations near the bottom of the document
          for (let i = 0; i < objectsInEdgeLayer; i++) {
            objectData = DataUtil.GetObjectPtr(objectsFromEdgeLayers[i], false);
            if (objectData &&
              objectData.objecttype === NvConstant.FNObjectTypes.Annotation &&
              objectData.Frame.y + objectData.Frame.height >= sessionData.dim.y - OptConstant.Common.AnnoHotDist) {

              heightPadding = 10 + sessionData.dim.y - objectData.Frame.y;
            }
          }
        }
      }
    }

    // Process all visible objects to calculate the enclosing rectangle
    let processedObjectCount = 0;

    for (let i = 0; i < visibleObjectCount; i++) {
      objectId = visibleObjects[i];

      // Skip objects already processed from edge layers
      if (objectsFromEdgeLayers.indexOf(objectId) >= 0) {
        continue;
      }

      const objectBlock = T3Gv.stdObj.GetObject(objectId);
      if (objectBlock == null) {
        continue;
      }

      objectData = objectBlock.Data;

      // Skip invisible objects
      if (objectData.flags & NvConstant.ObjFlags.NotVisible) {
        continue;
      }

      // Get the appropriate rectangle based on the fitOptions parameter
      objectRect = fitOptions ?
        Utils1.DeepCopy(objectData.Frame) :
        Utils1.DeepCopy(objectData.r);

      // If this is the first object, use its rect as the initial enclosing rect
      if (processedObjectCount === 0) {
        enclosingRect = Utils1.DeepCopy(objectRect);
      } else {
        // Otherwise, expand the enclosing rect to include this object
        Utils2.UnionRect(objectRect, enclosingRect, enclosingRect);
      }

      processedObjectCount++;
    }

    // Apply padding for edge layers if needed
    if (shouldUseEdges) {
      enclosingRect.width += widthPadding;
      enclosingRect.height += heightPadding;
    }

    T3Util.Log("O.Opt CalcAllObjectEnclosingRect - Output:", enclosingRect);
    return enclosingRect;
  }

  ScrollObjectIntoView(objectId, shouldCenterObject, customRect?) {
    T3Util.Log("O.Opt ScrollObjectIntoView - Input:", { objectId, shouldCenterObject, customRect });

    let objectRect;

    // If no object ID provided, use the target selection
    if (objectId == null || objectId == -1) {
      objectId = SelectUtil.GetTargetSelect();
    }

    // Exit if no valid object ID
    if (objectId == -1) {
      T3Util.Log("O.Opt ScrollObjectIntoView - Output: No valid object ID");
      return;
    }

    // Get the rectangle for the object
    if (customRect) {
      objectRect = customRect;
    } else {
      const object = DataUtil.GetObjectPtr(objectId, false);
      if (object == null) {
        T3Util.Log("O.Opt ScrollObjectIntoView - Output: Object not found");
        return;
      }
      objectRect = object.r;
    }

    // Get current visible area
    const docInfo = this.svgDoc.docInfo;
    const visibleRect = {
      x: docInfo.docVisX,
      y: docInfo.docVisY,
      width: docInfo.docVisWidth,
      height: docInfo.docVisHeight
    };

    // Check if object is already fully visible and we don't need to center it
    if (Utils2.IsRectangleFullyEnclosed(visibleRect, objectRect) && !shouldCenterObject) {
      T3Util.Log("O.Opt ScrollObjectIntoView - Output: Object already visible");
      return;
    }

    let scrollX, scrollY;

    // Handle oversized objects
    if (objectRect.width >= visibleRect.width || objectRect.height >= visibleRect.height) {
      if (Utils2.UnionRect(visibleRect, objectRect, visibleRect) && !shouldCenterObject) {
        T3Util.Log("O.Opt ScrollObjectIntoView - Output: Oversized object, no scroll needed");
        return;
      }
    }

    // Center object if requested
    if (shouldCenterObject) {
      const viewportCenterX = visibleRect.x + visibleRect.width / 2;
      const viewportCenterY = visibleRect.y + visibleRect.height / 2;
      const objectCenterX = objectRect.x + objectRect.width / 2;
      const objectCenterY = objectRect.y + objectRect.height / 2;

      // Calculate offset to center object
      const offsetY = viewportCenterY - objectCenterY;
      scrollX = (visibleRect.x - (viewportCenterX - objectCenterX)) * docInfo.docToScreenScale;
      scrollY = (visibleRect.y - offsetY) * docInfo.docToScreenScale;

      T3Gv.docUtil.SetScroll(scrollX, scrollY);
      T3Util.Log("O.Opt ScrollObjectIntoView - Output: Centered object", { scrollX, scrollY });
      return;
    }

    // Otherwise, scroll to make object visible with padding
    scrollX = visibleRect.x;
    scrollY = visibleRect.y;

    // Adjust padding based on document size
    let verticalPadding = 20;
    let horizontalPadding = 20;

    if (docInfo.docVisWidth < docInfo.docWidth) {
      horizontalPadding = 30;
    }

    if (docInfo.docVisHeight < docInfo.docHeight) {
      verticalPadding = 30;
    }

    // Adjust horizontal scroll if needed
    if (objectRect.x < visibleRect.x) {
      scrollX = objectRect.x - 20;
    }

    if (objectRect.x + objectRect.width > visibleRect.x + visibleRect.width) {
      scrollX = objectRect.x + objectRect.width - visibleRect.width + horizontalPadding;
    }

    // Adjust vertical scroll if needed
    if (objectRect.y < visibleRect.y) {
      scrollY = objectRect.y - 20;
    }

    if (objectRect.y + objectRect.height > visibleRect.y + visibleRect.height) {
      scrollY = objectRect.y + objectRect.height - visibleRect.height + verticalPadding;
    }

    // Convert to screen coordinates and scroll
    scrollX *= docInfo.docToScreenScale;
    scrollY *= docInfo.docToScreenScale;

    T3Gv.docUtil.SetScroll(scrollX, scrollY);
    T3Util.Log("O.Opt ScrollObjectIntoView - Output: Scrolled to make object visible", { scrollX, scrollY });
  }

  SetControlDragMode(controlElement) {
    T3Util.Log("O.Opt SetControlDragMode - Input:", controlElement);

    // Get the appropriate cursor type from the element
    const cursorType = controlElement.GetCursor();

    // Set the edit mode to DRAGCONTROL with the element's cursor type
    OptCMUtil.SetEditMode(NvConstant.EditState.DragControl, cursorType);

    T3Util.Log("O.Opt SetControlDragMode - Output: Mode set to DRAGCONTROL with cursor type:", cursorType);
  }

  UnbindShapeMoveHammerEvents() {
    T3Util.Log('O.Opt UnbindShapeMoveHammerEvents - Input: No parameters');

    if (T3Gv.opt.WorkAreaHammer) {
      T3Gv.opt.WorkAreaHammer.off('drag');
      T3Gv.opt.WorkAreaHammer.off('dragend');
      T3Gv.opt.WorkAreaHammer.off('mousemove');
    }

    T3Util.Log('O.Opt UnbindShapeMoveHammerEvents - Output: Events unbound');
  }

  IsConnectorEndShape(objectData, connectorObject, resultContainer) {
    T3Util.Log("O.Opt IsConnectorEndShape - Input:", { objectData, connectorObject, resultContainer });

    let parentConnector;

    // Check if object has hooks with specific coordinates
    const isConnectorEnd = !!(
      objectData &&
      objectData.hooks.length &&
      objectData.hooks[0].connect.y === 0 &&
      objectData.hooks[0].connect.x < 0 &&
      (
        // Get connector object if not provided
        (connectorObject === null &&
          (connectorObject = DataUtil.GetObjectPtr(objectData.hooks[0].objid, false))),

        // Check if resultContainer exists and if connector object has valid hooks and parent
        resultContainer &&
        connectorObject &&
        connectorObject.hooks.length &&
        (parentConnector = DataUtil.GetObjectPtr(connectorObject.hooks[0].objid, false)) &&
        parentConnector.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector
      )
    );

    // If it's a connector end, set additional properties in the result container
    if (isConnectorEnd) {
      resultContainer.id = connectorObject.hooks[0].objid;

      if (parentConnector.extraflags & OptConstant.ExtraFlags.NoDelete) {
        resultContainer.nshapes = parentConnector.arraylist.hook.length - ConnectorDefines.NSkip;
        if (resultContainer.nshapes < 0) {
          resultContainer.nshapes = 0;
        }
        resultContainer.pasted = false;
      } else {
        resultContainer.pasted = true;
      }
    }

    T3Util.Log("O.Opt IsConnectorEndShape - Output:", isConnectorEnd);
    return isConnectorEnd;
  }

  IsGenogramPartner(objectData, resultContainer) {
    T3Util.Log("O.Opt IsGenogramPartner - Input:", { objectData, resultContainer });

    let connectedObject;
    let childArrayID;

    // Case 1: Check if object has hooks connecting to a genogram connector
    if (objectData && objectData.hooks.length) {
      connectedObject = DataUtil.GetObjectPtr(objectData.hooks[0].objid, false);

      if (connectedObject &&
        connectedObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {

        // Check if it's a genogram connector
        if (connectedObject.IsGenoConnector()) {
          resultContainer.id = objectData.hooks[0].objid;
          T3Util.Log("O.Opt IsGenogramPartner - Output: true (genogram connector found)");
          return true;
        }
      }
    }
    // Case 2: Check if object has a child array with a genogram connector
    else if ((childArrayID = this.FindChildArray(objectData.BlockID, -1)) >= 0 &&
      (connectedObject = DataUtil.GetObjectPtr(childArrayID, false)).IsGenoConnector()) {
      resultContainer.id = childArrayID;
      T3Util.Log("O.Opt IsGenogramPartner - Output: true (child genogram connector found)");
      return true;
    }

    T3Util.Log("O.Opt IsGenogramPartner - Output: false");
    return false;
  }

  FindChildArray(objectId: number, excludeConnectorId?: number): number {
    T3Util.Log("O.Opt FindChildArray - Input:", { objectId, excludeConnectorId });

    // Get the links block
    const links = DataUtil.GetObjectPtr(this.linksBlockId, false);

    // Find the starting link index for this object
    const linkIndex = OptCMUtil.FindLink(links, objectId, true);

    const totalLinks = links.length;

    // If we found a link for this object
    if (linkIndex >= 0) {
      let currentIndex = linkIndex;

      // Process all links for this object
      while (currentIndex < totalLinks && links[currentIndex].targetid === objectId) {
        const hookId = links[currentIndex].hookid;

        // Check if this is not the excluded connector and is a connector
        if (hookId !== excludeConnectorId) {
          const hookObject = DataUtil.GetObjectPtr(hookId, false);

          if (hookObject &&
            hookObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
            T3Util.Log("O.Opt FindChildArray - Output: Found connector:", hookId);
            return hookId;
          }
        }

        currentIndex++;
      }
    }

    T3Util.Log("O.Opt FindChildArray - Output: No connector found (-1)");
    return -1;
  }


  /**
     * Checks if enhanced snapping should be enabled (shift key pressed)
     * @param event - The input event
     * @returns True if shift key is pressed, false otherwise
     */
  EnhanceSnaps(event) {
    T3Util.Log("O.Opt EnhanceSnaps - Input:", event);

    if (event == null) {
      T3Util.Log("O.Opt EnhanceSnaps - Output: false (null event)");
      return false;
    }

    let isShiftKeyPressed = event.shiftKey;

    if (event.gesture && event.gesture.srcEvent) {
      isShiftKeyPressed = event.gesture.srcEvent.shiftKey;
    }

    T3Util.Log("O.Opt EnhanceSnaps - Output:", isShiftKeyPressed);
    return isShiftKeyPressed === true;
  }

  /**
     * Sets a shape's origin without marking it as dirty
     * @param objectId - ID of the shape object
     * @param newX - New X coordinate
     * @param newY - New Y coordinate
     */
  SetShapeOriginNoDirty(objectId, newX, newY) {
    T3Util.Log("O.Opt SetShapeOriginNoDirty - Input:", { objectId, newX, newY });

    const originalPosition = {};
    const objectData = T3Gv.stdObj.PreserveBlock(objectId).Data;

    originalPosition.x = objectData.Frame.x;
    originalPosition.y = objectData.Frame.y;

    objectData.SetShapeOrigin(newX, newY);

    // If position changed, set the link flag
    if (newX - originalPosition.x || newY - originalPosition.y) {
      OptCMUtil.SetLinkFlag(objectId, DSConstant.LinkFlags.Move);
    }

    T3Util.Log("O.Opt SetShapeOriginNoDirty - Output: Shape origin updated");
  }

  /**
     * Rotates a point around another point by a given angle
     * @param centerPoint - Point to rotate around
     * @param targetPoint - Point to be rotated
     * @param angleRadians - Rotation angle in radians
     * @returns The rotated point
     */
  RotatePointAroundPoint(centerPoint, targetPoint, angleRadians) {
    T3Util.Log("O.Opt RotatePointAroundPoint - Input:", { centerPoint, targetPoint, angleRadians });

    // Create a new point to avoid modifying original
    const rotatedPoint = {
      x: targetPoint.x,
      y: targetPoint.y
    };

    // Get sine and cosine of the angle
    const sinAngle = Math.sin(angleRadians);
    const cosAngle = Math.cos(angleRadians);

    // Translate point to origin
    rotatedPoint.x -= centerPoint.x;
    rotatedPoint.y -= centerPoint.y;

    // Apply rotation
    const newX = rotatedPoint.x * cosAngle - rotatedPoint.y * sinAngle;
    const newY = rotatedPoint.x * sinAngle + rotatedPoint.y * cosAngle;

    // Translate back
    rotatedPoint.x = newX + centerPoint.x;
    rotatedPoint.y = newY + centerPoint.y;

    T3Util.Log("O.Opt RotatePointAroundPoint - Output:", rotatedPoint);
    return rotatedPoint;
  }

  /**
   * Updates edge layers based on dimension changes.
   * @param objectsToExclude - Objects to exclude from updates
   * @param originalDimensions - Original document dimensions
   * @param newDimensions - New document dimensions
   */
  UpdateEdgeLayers(objectsToExclude, originalDimensions, newDimensions) {
    T3Util.Log("O.Opt UpdateEdgeLayers - Input:", { objectsToExclude, originalDimensions, newDimensions });

    let layerIndex, objectList, objectCount, objectIndex, objectId, currentObject;
    let needsLeftEdge, needsTopEdge, needsRightEdge, needsBottomEdge;
    let needsRedraw = false;

    // Constants for edge annotations
    const edgeAnnotationDistance = OptConstant.Common.AnnoHotDist;
    const leftEdgeOffset = edgeAnnotationDistance;
    const topEdgeOffset = edgeAnnotationDistance;
    const usableWidth = originalDimensions.x - 2 * edgeAnnotationDistance;
    const usableHeight = originalDimensions.y - 2 * edgeAnnotationDistance;

    // Get layers manager from the object store
    const layersManager = DataUtil.GetObjectPtr(this.layersManagerBlockId, false);
    const layers = layersManager.layers;
    const numberOfLayers = layersManager.nlayers;

    // Save current dirty list to restore later
    const savedDirtyList = Utils1.DeepCopy(this.dirtyList);
    this.dirtyList = [];

    // Process each layer
    for (layerIndex = 0; layerIndex < numberOfLayers; layerIndex++) {
      // Skip active layer and non-edge layers
      if (layerIndex !== layersManager.activelayer &&
        layers[layerIndex].flags & NvConstant.LayerFlags.UseEdges) {

        objectList = layers[layerIndex].zList;
        objectCount = objectList.length;

        // Process each object in the layer
        for (objectIndex = 0; objectIndex < objectCount; objectIndex++) {
          objectId = objectList[objectIndex];

          // Skip excluded objects
          if (objectsToExclude.indexOf(objectId) >= 0) {
            continue;
          }

          // Get the object and check if it needs edge updates
          currentObject = DataUtil.GetObjectPtr(objectId, false);
          if (currentObject) {
            // Determine which edges the object needs
            needsLeftEdge = currentObject.Frame.x < leftEdgeOffset;
            needsTopEdge = currentObject.Frame.y < topEdgeOffset;
            needsRightEdge = currentObject.Frame.x + currentObject.Frame.width > leftEdgeOffset + usableWidth;
            needsBottomEdge = currentObject.Frame.y + currentObject.Frame.height > topEdgeOffset + usableHeight;

            // Update edges if needed
            if (currentObject.UseEdges(needsLeftEdge, needsTopEdge, needsRightEdge, needsBottomEdge,
              originalDimensions, newDimensions)) {
              needsRedraw = true;
            }
          }
        }
      }
    }

    // Redraw if any objects were updated
    if (needsRedraw) {
      SvgUtil.RenderDirtySVGObjects();
    }

    // Restore the original dirty list
    this.dirtyList = savedDirtyList;

    T3Util.Log("O.Opt UpdateEdgeLayers - Output: Edge layers updated, needsRedraw:", needsRedraw);
  }

  /**
     * Sets link flags on filled closed polylines
     * @param objectId - Optional ID of the object to process
     */
  SetLinkFlagsOnFilledClosedPolylines(objectId) {
    T3Util.Log("O.Opt SetLinkFlagsOnFilledClosedPolylines - Input:", objectId);

    let object = null;
    let moveObject = null;

    // Handle the specific object if provided
    if (objectId) {
      object = DataUtil.GetObjectPtr(objectId, false);

      // Set flags if it's a closed polyline
      if (object &&
        object instanceof Instance.Shape.PolyLine &&
        object.polylist &&
        object.polylist.closed) {

        OptCMUtil.SetLinkFlag(
          objectId,
          DSConstant.LinkFlags.Move | DSConstant.LinkFlags.Change
        );
      }
    }

    // Process objects in the move list
    if (this.moveList && this.moveList.length) {
      for (let index = 0; index < this.moveList.length; index++) {
        moveObject = DataUtil.GetObjectPtr(this.moveList[index], true);

        // Check if the object has hooks
        if (moveObject && moveObject.hooks.length > 0) {
          // Process each hook
          for (let hookIndex = 0; hookIndex < moveObject.hooks.length; hookIndex++) {
            const hookedObject = DataUtil.GetObjectPtr(moveObject.hooks[hookIndex].objid, false);

            // Set flags if the hooked object is a filled closed polyline
            if (hookedObject &&
              hookedObject.StyleRecord &&
              hookedObject.StyleRecord.Line &&
              hookedObject.StyleRecord.Line.BThick &&
              hookedObject.polylist &&
              hookedObject.polylist.closed) {

              OptCMUtil.SetLinkFlag(
                moveObject.hooks[hookIndex].objid,
                DSConstant.LinkFlags.Move | DSConstant.LinkFlags.Change
              );
            }
          }
        }
      }
    }

    T3Util.Log("O.Opt SetLinkFlagsOnFilledClosedPolylines - Output: Link flags updated");
  }

  /**
   * Sets and calculates the bounding rectangle for a shape
   * @param shapeObject - The shape object to calculate bounding rectangle for
   * @returns 0 on successful completion
   */
  SetShapeR(shapeObject) {
    T3Util.Log("O.Opt SetShapeR - Input:", { shapeObjectId: shapeObject.BlockID });

    let effectSettings;
    let outlineThickness;

    // Calculate outline thickness based on style record
    if (shapeObject.StyleRecord) {
      if (shapeObject.StyleRecord.Line.BThick && shapeObject.polylist == null) {
        outlineThickness = shapeObject.StyleRecord.Line.Thickness;
      } else {
        outlineThickness = shapeObject.StyleRecord.Line.Thickness / 2;
      }

      // Get effect settings for the shape
      effectSettings = shapeObject.CalcEffectSettings(
        shapeObject.Frame,
        shapeObject.StyleRecord,
        false
      );
    }

    // Inflate rectangle by outline thickness
    Utils2.InflateRect(shapeObject.r, outlineThickness, outlineThickness);

    // Add effects extent if present
    if (effectSettings) {
      Utils2.Add2Rect(shapeObject.r, effectSettings.extent);
    }

    // Handle attached text dimensions
    if (
      shapeObject.DataID >= 0 && (
        shapeObject.TextFlags & NvConstant.TextFlags.AttachB ||
        shapeObject.TextFlags & NvConstant.TextFlags.AttachA
      )
    ) {
      // Function to get text dimensions from SVG
      const getTextDimensions = (objectId) => {
        if (objectId == null) return null;

        let svgElement = T3Gv.opt.svgObjectLayer.GetElementById(objectId);

        // Create text element if it doesn't exist
        if (svgElement == null) {
          svgElement = T3Gv.opt.svgDoc.CreateShape(
            OptConstant.CSType.ShapeContainer
          );
          svgElement.SetID(shapeObject.BlockID);
          T3Gv.opt.svgObjectLayer.AddElement(svgElement, 0);
          shapeObject.LMAddSVGTextObject(T3Gv.opt.svgDoc, svgElement);
        }

        if (svgElement) {
          const textElement = svgElement.GetElementById(OptConstant.SVGElementClass.Text);
          if (textElement) {
            const position = textElement.GetPos();
            const dimensions = textElement.GetTextMinDimensions();
            return {
              x: position.x,
              y: position.y,
              width: dimensions.width,
              height: dimensions.height
            };
          }
        }
        return null;
      };

      // Get text dimensions and include in bounding rectangle
      const textDimensions = getTextDimensions(shapeObject.BlockID);
      if (textDimensions) {
        textDimensions.x += shapeObject.Frame.x;
        textDimensions.y += shapeObject.Frame.y;
        Utils2.UnionRect(shapeObject.r, textDimensions, shapeObject.r);
      }
    }

    // Add dimensions from shape object
    shapeObject.AddDimensionsToR();

    // Handle rotation if needed
    if (shapeObject.RotationAngle !== 0) {
      let points;
      let rotationAngleRadians;
      const originalFrame = {};
      const centerPoint = {};

      // Calculate center point of the shape
      centerPoint.x = shapeObject.Frame.x + shapeObject.Frame.width / 2;
      centerPoint.y = shapeObject.Frame.y + shapeObject.Frame.height / 2;

      // Store original frame
      Utils2.CopyRect(originalFrame, shapeObject.Frame);

      // Set frame to current bounding rect
      Utils2.CopyRect(shapeObject.Frame, shapeObject.r);

      // Get polygon points for rotation calculation
      T3Util.Log("O.Opt SetShapeR - Getting poly points for rotation");
      points = new Instance.Shape.BaseDrawObject(shapeObject).GetPolyPoints(
        OptConstant.Common.MaxPolyPoints,
        false,
        false,
        false,
        null
      );

      // Calculate rotation angle in radians (negative because rotation is clockwise)
      rotationAngleRadians = -shapeObject.RotationAngle / (180 / NvConstant.Geometry.PI);

      // Rotate points around center
      Utils3.RotatePointsAboutPoint(centerPoint, rotationAngleRadians, points);

      // Get bounding rectangle of rotated points
      Utils2.GetPolyRect(shapeObject.r, points);

      // Restore original frame
      Utils2.CopyRect(shapeObject.Frame, originalFrame);
    }

    T3Util.Log("O.Opt SetShapeR - Output: Bounding rectangle calculated", shapeObject.r);
    return 0;
  }

  /**
     * Finds a child array by index
     * @param parentId - ID of the parent object
     * @param resultInfo - Object to store result information
     * @param linksList - Optional list of links to search through
     * @param baseClass - Base class type to filter by
     * @returns The ID of the found child or -1
     */
  FindChildArrayByIndex(parentId, resultInfo, linksList, baseClass?) {
    T3Util.Log("O.Opt FindChildArrayByIndex - Input:", {
      parentId,
      resultInfo,
      hasLinksList: !!linksList,
      baseClass
    });

    let linkIndex, hookId, hookObject;

    // Use provided links list or get the default one
    const links = linksList || DataUtil.GetObjectPtr(this.linksBlockId, false);

    // Use provided base class or default to connector
    baseClass = baseClass || OptConstant.DrawObjectBaseClass.Connector;

    // Find the first link for this parent
    const startLinkIndex = OptCMUtil.FindLink(links, parentId, true);
    const totalLinks = links.length;

    if (startLinkIndex >= 0) {
      for (linkIndex = startLinkIndex; linkIndex < totalLinks && links[linkIndex].targetid === parentId; linkIndex++) {
        // Check if this link is after the last found index and has the correct base class
        if (linkIndex > resultInfo.lindex &&
          (hookId = links[linkIndex].hookid,
            (hookObject = DataUtil.GetObjectPtr(hookId, false)) &&
            hookObject.DrawingObjectBaseClass === baseClass)) {

          // Update result information
          resultInfo.lindex = linkIndex;
          resultInfo.id = hookId;
          resultInfo.hookpt = hookObject.hooks[0].hookpt;

          T3Util.Log("O.Opt FindChildArrayByIndex - Output: Found child", hookId);
          return hookId;
        }
      }
    }

    T3Util.Log("O.Opt FindChildArrayByIndex - Output: No child found (-1)");
    return -1;
  }

  /**
   * Sets the frame for an object
   * @param objectId - ID of the object to update
   * @param newFrame - New frame dimensions
   * @returns 0 on success, 1 on failure
   */
  SetObjectFrame(objectId, newFrame) {
    T3Util.Log("O.Opt SetObjectFrame - Input:", { objectId, newFrame });

    // Get a preserved copy of the object for modification
    const targetObject = DataUtil.GetObjectPtr(objectId, true);

    if (targetObject == null) {
      T3Util.Log("O.Opt SetObjectFrame - Output: Failed to get object (1)");
      return 1;
    }

    // Set link flags for the object and connected objects
    OptCMUtil.SetLinkFlag(objectId, DSConstant.LinkFlags.Move);

    if (targetObject.hooks.length) {
      OptCMUtil.SetLinkFlag(targetObject.hooks[0].objid, DSConstant.LinkFlags.Move);
    }

    // Update the object's frame
    targetObject.UpdateFrame(newFrame);

    T3Util.Log("O.Opt SetObjectFrame - Output: Frame updated successfully (0)");
    return 0;
  }

  /**
    * Sets attributes on an object
    * @param objectId - ID of the object to update
    * @param attributes - Object containing attributes to set
    */
  SetObjectAttributes(objectId, attributes) {
    T3Util.Log("O.Opt SetObjectAttributes - Input:", { objectId, attributes });

    // Get a preserved copy of the object for modification
    const objectBlock = T3Gv.stdObj.PreserveBlock(objectId);

    // Apply the properties to the object
    this.ApplyProperties(attributes, objectBlock.Data);

    T3Util.Log("O.Opt SetObjectAttributes - Output: Attributes applied");
  }

  /**
 * Recursively applies properties from one object to another
 * @param sourceProperties - Source object containing properties to copy
 * @param targetObject - Target object to receive the properties
 */
  ApplyProperties(sourceProperties, targetObject) {
    T3Util.Log("O.Opt ApplyProperties - Input:", {
      sourceProperties: Object.keys(sourceProperties),
      targetObject: targetObject ? targetObject.constructor.name : null
    });

    for (const propertyName in sourceProperties) {
      const targetValue = targetObject[propertyName];
      const sourceValue = sourceProperties[propertyName];
      const targetType = typeof targetValue;

      // Handle case where target property doesn't exist yet
      if (targetValue == null) {
        const sourceType = typeof sourceValue;

        // Simple types can be copied directly
        if (sourceValue == null ||
          sourceType === 'string' ||
          sourceType === 'number' ||
          sourceType === 'boolean') {
          targetObject[propertyName] = sourceValue;
        }
        // Arrays get copied by slice
        else if (sourceValue instanceof Array) {
          targetObject[propertyName] = sourceValue.slice(0);
        }
        // Blob and buffer types are directly assigned
        else if (sourceValue instanceof Blob || sourceValue instanceof Uint8Array) {
          targetObject[propertyName] = sourceValue;
        }
        // Avoid copying functions
        else if (sourceType !== 'function') {
          targetObject[propertyName] = $.extend(true, new sourceValue.constructor(), sourceValue);
        }
      }
      // Handle existing target properties
      else {
        // Simple types can be copied directly
        if (targetType === 'string' ||
          targetType === 'number' ||
          targetType === 'boolean') {
          targetObject[propertyName] = sourceValue;
        }
        // Arrays get copied by slice
        else if (sourceValue instanceof Array) {
          targetObject[propertyName] = sourceValue.slice(0);
        }
        // Blob and buffer types are directly assigned
        else if (sourceValue instanceof Blob || sourceValue instanceof Uint8Array) {
          targetObject[propertyName] = sourceValue;
        }
        // Avoid copying functions
        else if (targetType !== 'function') {
          // Create a copy of the existing object to preserve its type
          const targetCopy = $.extend(true, new targetValue.constructor(), targetValue);
          targetObject[propertyName] = targetCopy;

          // Recursively apply properties
          this.ApplyProperties(sourceValue, targetCopy);
        }
      }
    }

    T3Util.Log("O.Opt ApplyProperties - Output: Properties applied");
  }

  /**
     * Calculates the drawing scale based on ruler settings
     * @param drawingScale - The drawing scale configuration object
     * @returns The calculated drawing scale value
     */
  GetDrawingScale(drawingScale) {
    T3Util.Log("O.Opt GetDrawingScale - Input:", drawingScale);

    const units = NvConstant.RulerUnit;
    let majorScale = drawingScale.majorScale;
    let majorUnit = drawingScale.major;

    if (majorUnit == null) {
      majorUnit = OptConstant.Common.DefaultRulerMajor;
    }

    // Adjust scale based on unit type
    switch (drawingScale.units) {
      case units.Feet:
        majorScale *= 12;
        break;
      case units.Mm:
        majorScale /= 10;
        break;
      case units.M:
        majorScale *= 100;
        break;
    }

    // Calculate final scale
    const finalScale = majorScale * (OptConstant.Common.DefaultRulerMajor / majorUnit);

    T3Util.Log("O.Opt GetDrawingScale - Output:", finalScale);
    return finalScale;
  }

  /**
   * Calculates the counter-clockwise angle between two points in radians
   * @param startPoint - The starting point
   * @param endPoint - The ending point
   * @returns The counter-clockwise angle in radians
   */
  GetCounterClockwiseAngleBetween2Points(startPoint, endPoint) {
    T3Util.Log("O.Opt GetCounterClockwiseAngleBetween2Points - Input:", { startPoint, endPoint });

    const PI = NvConstant.Geometry.PI;

    // Calculate the differences in coordinates
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = startPoint.y - endPoint.y;

    // Calculate the angle based on the position of the points
    let angle;
    if (deltaX === 0) {
      // Vertical line case
      angle = deltaY >= 0 ? PI / 2 : -PI / 2;
    } else if (deltaY === 0) {
      // Horizontal line case
      angle = deltaX >= 0 ? 0 : PI;
    } else {
      // General case - use arctangent
      angle = Math.atan2(deltaY, deltaX);
    }

    // Normalize angle to be between 0 and 2π
    if (angle < 0) {
      angle += 2 * PI;
    }

    T3Util.Log("O.Opt GetCounterClockwiseAngleBetween2Points - Output:", angle);
    return angle;
  }

  /**
   * Reverts to the previous edit mode from the edit mode history stack
   */
  UndoEditMode() {
    T3Util.Log("O.Opt UndoEditMode - Input: No parameters");

    // Get the edit mode history list or initialize empty array if it doesn't exist
    const editModeHistory = this.editModeList || [];

    // Only proceed if we have more than one mode in history (can go back)
    if (editModeHistory.length > 1) {
      // Remove the current mode
      editModeHistory.pop();

      // Get the previous mode
      const previousMode = editModeHistory[editModeHistory.length - 1];

      // Restore the previous edit mode without adding to history
      OptCMUtil.SetEditMode(previousMode.mode, previousMode.cursor, false, true);
    }

    T3Util.Log("O.Opt UndoEditMode - Output: Previous edit mode restored");
  }

  /**
     * Checks if a point intersects with a line
     * @param lineObject - The line object to check
     * @param point - The point to test for intersection
     * @returns True if the point intersects with the line, false otherwise
     */
  LineCheckPoint(lineObject, point) {
    T3Util.Log("O.Opt LineCheckPoint - Input:", { lineObject: lineObject.BlockID, point });

    // Create a copy of the point to avoid modifying the original
    const testPoint = Utils1.DeepCopy(point);

    // Create an array with the line's start and end points
    const linePoints = [];
    linePoints.push(new Point(lineObject.StartPoint.x, lineObject.StartPoint.y));
    linePoints.push(new Point(lineObject.EndPoint.x, lineObject.EndPoint.y));

    // Test if the point intersects with the line, considering line thickness
    const result = Utils3.LineDStyleHit(linePoints, testPoint, lineObject.StyleRecord.Line.Thickness, 0, 0) !== 0;

    T3Util.Log("O.Opt LineCheckPoint - Output:", result);
    return result;
  }

  /**
   * Checks if a point intersects with an arc or curved shape
   * @param drawingObject - The object containing the arc to check
   * @param testPoint - The point to test for intersection
   * @returns True if the point intersects with the arc, false otherwise
   */
  ArcCheckPoint(drawingObject, testPoint) {
    T3Util.Log("O.Opt ArcCheckPoint - Input:", { drawingObject: drawingObject.BlockID, testPoint });

    // Get the polygon points that represent the arc
    const polyPoints = drawingObject.GetPolyPoints(
      OptConstant.Common.MaxPolyPoints,
      false,
      false,
      false,
      null
    );

    // Check if point intersects with the line using the line thickness
    const isIntersecting = Utils3.LineDStyleHit(
      polyPoints,
      testPoint,
      drawingObject.StyleRecord.lineThickness,
      0,
      null
    ) !== 0;

    T3Util.Log("O.Opt ArcCheckPoint - Output:", isIntersecting);
    return isIntersecting;
  }

  /**
     * Determines if two lines intersect and returns the intersection point
     * @param line1 - First line object
     * @param line2 - Second line object
     * @param resultPoint - Object to store intersection point coordinates
     * @returns True if the lines intersect, false otherwise
     */
  LinesIntersect(line1, line2, resultPoint) {
    T3Util.Log("O.Opt LinesIntersect - Input:", {
      line1: { start: line1.StartPoint, end: line1.EndPoint },
      line2: { start: line2.StartPoint, end: line2.EndPoint }
    });

    // Create a temporary point to avoid modifying resultPoint until we confirm intersection
    const tempPoint = {
      x: resultPoint.x,
      y: resultPoint.y
    };

    // Get the intersection point
    const hasIntersection = this.GetIntersectPt(
      line1.StartPoint,
      line1.EndPoint,
      line2.StartPoint,
      line2.EndPoint,
      line2.Frame,
      tempPoint
    );

    // Check if intersection exists and is within line1's frame boundaries
    if (hasIntersection &&
      tempPoint.x >= line1.Frame.x &&
      tempPoint.x <= line1.Frame.x + line1.Frame.width &&
      tempPoint.y >= line1.Frame.y &&
      tempPoint.y <= line1.Frame.y + line1.Frame.height) {

      // Update the result point with intersection coordinates
      resultPoint.x = tempPoint.x;
      resultPoint.y = tempPoint.y;

      T3Util.Log("O.Opt LinesIntersect - Output: Lines intersect at", resultPoint);
      return true;
    }

    T3Util.Log("O.Opt LinesIntersect - Output: Lines do not intersect");
    return false;
  }

  /**
    * Creates an inflated outline around a polyline with specified thickness
    * @param points - The original polyline points
    * @param thickness - The thickness to inflate by
    * @param isClosed - Whether the polyline is closed
    * @param isOutward - Whether to inflate outward (true) or inward (false)
    * @returns The inflated polyline points
    */
  InflateLine(points, thickness, isClosed, isOutward) {
    T3Util.Log("O.Opt InflateLine - Input:", {
      pointCount: points.length,
      thickness,
      isClosed,
      isOutward
    });

    let windingDirection,
      pointIndex,
      angleIndex,
      angleCompare,
      currentAngle,
      segmentOffset,
      segmentCount;

    let outlinePoints = [];
    let tempPoints = [];
    let segmentInfo = {};

    // Helper function to calculate distance between two points
    function getDistance(point1, point2) {
      const deltaX = point2.x - point1.x;
      const deltaY = point2.y - point1.y;
      return Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    // Helper function to check if angles are close enough (within threshold)
    function areAnglesClose(angle1, angle2, threshold) {
      const normalizedAngle1 = angle1 - Math.PI / 2;
      angle1 -= normalizedAngle1;

      angle2 -= normalizedAngle1;
      if (angle2 < 0) {
        angle2 += 2 * Math.PI;
      }
      if (angle2 > 2 * Math.PI) {
        angle2 -= 2 * Math.PI;
      }

      return Math.abs(angle1 - angle2) <= threshold;
    }

    // Helper function to scale a polygon uniformly around its center
    function scalePolygon(polygonPoints, offsetDistance) {
      let scaledPoints = [];
      let boundingRect = {};

      // Make a deep copy of the points and calculate bounding rectangle
      scaledPoints = Utils1.DeepCopy(polygonPoints);
      Utils2.GetPolyRect(boundingRect, scaledPoints);

      // Center the points around origin for scaling
      for (pointIndex = 0; pointIndex < scaledPoints.length; pointIndex++) {
        scaledPoints[pointIndex].x -= boundingRect.x;
        scaledPoints[pointIndex].y -= boundingRect.y;
      }

      // Calculate scale factor based on desired inflation
      const doubleOffset = 2 * offsetDistance;
      const maxDimension = Math.max(boundingRect.width, boundingRect.height);

      // If the inflation is larger than the largest dimension, just return the original
      if (doubleOffset > maxDimension) {
        return polygonPoints;
      }

      // Calculate scale factor and apply it
      const scaleFactor = (maxDimension + doubleOffset) / maxDimension;
      for (pointIndex = 0; pointIndex < scaledPoints.length; pointIndex++) {
        scaledPoints[pointIndex].x *= scaleFactor;
        scaledPoints[pointIndex].y *= scaleFactor;

        // Position back to original location, adjusted by offset
        scaledPoints[pointIndex].x += boundingRect.x - offsetDistance;
        scaledPoints[pointIndex].y += boundingRect.y - offsetDistance;
      }

      return scaledPoints;
    }

    // Helper function to calculate a midpoint with proportional extension
    function calculateProportionalMidpoint(startPoint, endPoint, projectionPoint, startRef, endRef) {
      let resultPoints = [];
      let startDistance = getDistance(startPoint, endPoint);
      let projectionDistance = getDistance(startPoint, projectionPoint);

      // Calculate the scaling factor based on distances
      let scaleFactor = startDistance > 0 ? projectionDistance / startDistance : 0;
      let refDistance = getDistance(startRef, endRef);

      // Create three points for rotation calculation
      resultPoints = [
        { x: startRef.x, y: startRef.y },
        { x: 0, y: 0 },
        { x: endRef.x, y: endRef.y }
      ];

      // Calculate the angle between the reference points and rotate to align horizontally
      let angle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(startRef, endRef);
      Utils3.RotatePointsAboutPoint(resultPoints[0], -angle, resultPoints);

      // Calculate the midpoint with proportional distance
      resultPoints[1].y = resultPoints[0].y;
      if (resultPoints[2].x > resultPoints[0].x) {
        resultPoints[1].x = resultPoints[0].x + refDistance * scaleFactor;
      } else {
        resultPoints[1].x = resultPoints[0].x - refDistance * scaleFactor;
      }

      // Rotate back to original orientation
      Utils3.RotatePointsAboutPoint(resultPoints[0], angle, resultPoints);

      return resultPoints[1];
    }

    // Adjust segment offset based on thickness
    segmentOffset = thickness / 2;
    if (segmentOffset < 3) {
      segmentOffset = 3;
    } else if (segmentOffset > 5) {
      segmentOffset = 5;
    }

    // Calculate the initial outline
    outlinePoints = this.CalcPolyOutline(points, thickness, isClosed, isOutward, segmentOffset, segmentInfo);

    // If outline calculation failed or had to insert segments, fall back to scaling
    if (outlinePoints === null || segmentInfo.segmentsInserted) {
      const fallbackResult = scalePolygon(points, isOutward ? thickness : -thickness);
      T3Util.Log("O.Opt InflateLine - Output (fallback to scaling):", fallbackResult.length);
      return fallbackResult;
    }

    // For closed shapes, ensure the outline is properly closed
    if (isClosed) {
      outlinePoints.push(new Point(outlinePoints[0].x, outlinePoints[0].y));
    }

    // Adjust winding direction based on parameters
    windingDirection = this.GetPolygonWindingDirection(points);
    if (windingDirection === -1 && isOutward) {
      outlinePoints.reverse();
    } else if (windingDirection === 1 && !isOutward) {
      outlinePoints.reverse();
    }

    // Verify the outline by trying to calculate another outline (reversed direction)
    if (this.CalcPolyOutline(outlinePoints, thickness, isClosed, !isOutward, segmentOffset, segmentInfo) === null ||
      segmentInfo.segmentsInserted) {
      const fallbackResult = scalePolygon(points, isOutward ? thickness : -thickness);
      T3Util.Log("O.Opt InflateLine - Output (fallback after verification):", fallbackResult.length);
      return fallbackResult;
    }

    // Process angles to ensure smooth transitions
    segmentCount = points.length;
    let outlineCount = outlinePoints.length;

    while (--outlineCount > 0 && --segmentCount > 0) {
      // Calculate angle between current segments
      const currentAngle = this.GetCounterClockwiseAngleBetween2Points(
        outlinePoints[outlineCount - 1],
        outlinePoints[outlineCount]
      );

      // Check if original and outline angles match
      if (!areAnglesClose(
        this.GetCounterClockwiseAngleBetween2Points(
          points[segmentCount - 1],
          points[segmentCount]
        ),
        currentAngle,
        0.01
      )) {
        // Try to find a matching angle and insert interpolated points
        for (pointIndex = segmentCount - 1; pointIndex >= 0; pointIndex--) {
          if (areAnglesClose(
            this.GetCounterClockwiseAngleBetween2Points(
              points[pointIndex],
              points[segmentCount]
            ),
            currentAngle,
            0.01
          )) {
            // Insert interpolated points
            for (angleIndex = tempPoints.length - 1; angleIndex >= 0; angleIndex--) {
              outlinePoints.splice(
                outlineCount,
                0,
                calculateProportionalMidpoint(
                  points[segmentCount],
                  points[segmentCount - tempPoints.length],
                  tempPoints[angleIndex],
                  outlinePoints[outlineCount],
                  outlinePoints[outlineCount - 1]
                )
              );
            }
            segmentCount -= tempPoints.length;
            tempPoints = [];
            break;
          }
          tempPoints.push(new Point(points[pointIndex].x, points[pointIndex].y));
        }

        if (tempPoints.length > 0) {
          break;
        }
      }
    }

    // If the resulting outline has a different point count, fall back to scaling
    if (outlinePoints.length !== points.length) {
      outlinePoints = scalePolygon(points, isOutward ? thickness : -thickness);
    }

    T3Util.Log("O.Opt InflateLine - Output:", outlinePoints.length);
    return outlinePoints;
  }

  /**
     * Calculates an outline for a polyline with specified thickness
     * @param points - Array of points defining the polyline
     * @param thickness - Thickness of the outline
     * @param isClosed - Whether the polyline is closed (true) or open (false)
     * @param isOutward - Whether the outline should go outward (true) or inward (false)
     * @param segmentStep - Optional step size between segments
     * @param resultInfo - Optional object to store information about the operation
     * @returns Array of points defining the outline or null if calculation failed
     */
  CalcPolyOutline(points, thickness, isClosed, isOutward, segmentStep, resultInfo) {
    T3Util.Log("O.Opt CalcPolyOutline - Input:", {
      pointCount: points.length,
      thickness,
      isClosed,
      isOutward,
      segmentStep
    });

    let segmentCount;
    let segmentIndex;
    let lastSegmentIndex;
    let searchIndex;
    let currentStep;
    let previousPoint;
    let startIndex;
    let increment;
    let foundIntersection;

    const resultPoints = [];
    const segments = [];
    let segmentCounter = 0;
    const intersectionPoint = { x: 0, y: 0 };
    const maxDistance = 100000;

    // Need at least two points to create an outline
    if (points.length < 2) {
      T3Util.Log("O.Opt CalcPolyOutline - Output: Insufficient points (null)");
      return null;
    }

    // Determine the winding direction of the polygon
    let windingDirection = 1;
    if (isClosed) {
      for (segmentIndex = 0; segmentIndex < points.length - 1; segmentIndex++) {
        (points[segmentIndex + 1].x - points[segmentIndex].x) *
          (points[segmentIndex + 1].y + points[segmentIndex].y);
      }
      windingDirection = this.GetPolygonWindingDirection(points);
    }

    // Adjust winding direction based on whether outline should go outward or inward
    if (!isOutward) {
      windingDirection = -windingDirection;
    }

    // Determine starting point and increment direction
    if (windingDirection < 1) {
      startIndex = points.length - 1;
      increment = -1;
    } else {
      startIndex = 0;
      increment = points.length;
    }

    // For zero thickness, just return a copy of the original points
    if (!thickness) {
      T3Util.Log("O.Opt CalcPolyOutline - Output: No thickness, returning copy of input points");
      return Utils1.DeepCopy(points);
    }

    // Initialize variables for segment creation
    segmentCounter = 0;
    previousPoint = startIndex - windingDirection;

    // Use provided segment step or calculate based on thickness
    if (segmentStep) {
      currentStep = segmentStep;
    } else {
      currentStep = thickness / 2;
      if (currentStep < 3) currentStep = 3;
      else if (currentStep > 5) currentStep = 5;
    }

    // Create segments for each point
    for (segmentIndex = startIndex; segmentIndex != increment; segmentIndex += windingDirection) {
      // Handle wrap-around for closed shapes
      if (previousPoint < 0 || previousPoint > points.length - 1) {
        if (!isClosed) {
          previousPoint = segmentIndex;
          continue;
        }
        previousPoint = previousPoint < 0 ? points.length - 1 : 0;
      }

      // Special handling for last segment
      if (segmentIndex == increment - windingDirection) {
        currentStep = 2;
      }

      // Skip segments that are too short
      if (Utils1.DeltaPoints(points[segmentIndex], points[previousPoint]) < currentStep) {
        continue;
      }

      // Create segment data for current point
      const segmentData = new SegmentData();
      segmentData.origSeg.start = Utils1.DeepCopy(points[previousPoint]);
      segmentData.origSeg.end = Utils1.DeepCopy(points[segmentIndex]);

      // Calculate offset segment
      Utils1.CalcExtendedOffsetSegment(segmentData, thickness, 2, maxDistance);

      segmentData.clipSeg.start = Utils1.DeepCopy(segmentData.extSeg.start);
      segmentData.clipSeg.end = Utils1.DeepCopy(segmentData.extSeg.end);

      // Merge with previous segment if angle is the same
      if (segmentCounter > 0 && segmentData.angle == segments[segmentCounter - 1].angle) {
        segments[segmentCounter - 1].origSeg.end = Utils1.DeepCopy(segmentData.origSeg.end);
        segments[segmentCounter - 1].clipSeg.end = Utils1.DeepCopy(segmentData.clipSeg.end);
        segments[segmentCounter - 1].extSeg.end = Utils1.DeepCopy(segmentData.extSeg.end);
        segments[segmentCounter - 1].extSeg.endExt = Utils1.DeepCopy(segmentData.extSeg.endExt);
        segments[segmentCounter - 1].extSeg.endRay = Utils1.DeepCopy(segmentData.extSeg.endRay);
      } else {
        segments.push(segmentData);
        segmentCounter++;
      }

      previousPoint = segmentIndex;
    }

    // If no segments were created, return null
    if (!segmentCounter) {
      T3Util.Log("O.Opt CalcPolyOutline - Output: No segments created (null)");
      return null;
    }

    // If only one segment, return simple outline
    if (segmentCounter == 1) {
      resultPoints.push(segments[0].clipSeg.start);
      resultPoints.push(segments[0].clipSeg.end);
      T3Util.Log("O.Opt CalcPolyOutline - Output: Single segment outline created", resultPoints);
      return resultPoints;
    }

    // Connect segments with proper intersections
    lastSegmentIndex = segmentCounter - 1;

    for (segmentIndex = 0; segmentIndex < segmentCounter; segmentIndex++) {
      // Special handling for first segment of non-closed polyline
      if (!isClosed && segmentIndex === 0) {
        lastSegmentIndex = segmentIndex;
        continue;
      }

      // Process segment intersection with previous segment
      if (Utils1.compareAngle(segments[segmentIndex].angle, segments[lastSegmentIndex].angle) > 0) {
        if (Utils1.CalcSegmentIntersect(
          segments[lastSegmentIndex].clipSeg.start,
          segments[lastSegmentIndex].extSeg.endExt,
          segments[segmentIndex].extSeg.startExt,
          segments[segmentIndex].clipSeg.end,
          intersectionPoint
        )) {
          // Use intersection point for both segments
          segments[lastSegmentIndex].clipSeg.end = Utils1.DeepCopy(intersectionPoint);
          segments[segmentIndex].clipSeg.start = Utils1.DeepCopy(intersectionPoint);
        } else if (Utils1.DeltaAngle(segments[segmentIndex].angle, segments[lastSegmentIndex].angle) < 15) {
          // For small angles, use midpoint
          segments[lastSegmentIndex].clipSeg.end.x = (segments[lastSegmentIndex].extSeg.end.x + segments[segmentIndex].extSeg.start.x) / 2;
          segments[lastSegmentIndex].clipSeg.end.y = (segments[lastSegmentIndex].extSeg.end.y + segments[segmentIndex].extSeg.start.y) / 2;
          segments[segmentIndex].clipSeg.start = Utils1.DeepCopy(segments[lastSegmentIndex].clipSeg.end);
        } else {
          // For larger angles, use extended points and insert a connecting segment
          segments[lastSegmentIndex].clipSeg.end = Utils1.DeepCopy(segments[lastSegmentIndex].extSeg.endExt);
          segments[segmentIndex].clipSeg.start = Utils1.DeepCopy(segments[segmentIndex].extSeg.startExt);
          Utils1.InsertSegment(segments, segmentIndex, segments[lastSegmentIndex].clipSeg.end, segments[segmentIndex].clipSeg.start, thickness, 2, maxDistance);
          segmentCounter++;
          segmentIndex++;
          resultInfo.segmentsInserted = true;
        }
      }
      lastSegmentIndex = segmentIndex;
    }

    // Perform second pass to check for intersections and fix any issues
    lastSegmentIndex = 0;
    for (segmentIndex = 1; segmentIndex < segmentCounter; segmentIndex++) {
      foundIntersection = false;

      // Check if segments are obtuse and adjacent
      if (Utils1.AreSegmentsObtuse(segments, segmentCounter, segmentIndex, lastSegmentIndex) &&
        Utils1.AreSegmentsAjacent(segmentCounter, segmentIndex, lastSegmentIndex)) {
        foundIntersection = true;
      }
      // Check for direct intersection
      else if (Utils1.CalcSegmentIntersect(
        segments[lastSegmentIndex].clipSeg.start,
        segments[lastSegmentIndex].clipSeg.end,
        segments[segmentIndex].clipSeg.start,
        segments[segmentIndex].clipSeg.end,
        intersectionPoint
      )) {
        foundIntersection = true;
        segments[lastSegmentIndex].clipSeg.end = Utils1.DeepCopy(intersectionPoint);
        segments[segmentIndex].clipSeg.start = Utils1.DeepCopy(intersectionPoint);
      }
      // Check for alignment
      else if (Utils1.SegmentsInAlignment(segments, segmentCounter, segmentIndex, lastSegmentIndex)) {
        foundIntersection = true;
        segments[lastSegmentIndex].clipSeg.end.x = (segments[lastSegmentIndex].clipSeg.end.x + segments[segmentIndex].clipSeg.start.x) / 2;
        segments[lastSegmentIndex].clipSeg.end.y = (segments[lastSegmentIndex].clipSeg.end.y + segments[segmentIndex].clipSeg.start.y) / 2;
        segments[segmentIndex].clipSeg.start = segments[lastSegmentIndex].clipSeg.end;
      }
      // Check for intersections with earlier segments
      else if (lastSegmentIndex > 0) {
        for (searchIndex = lastSegmentIndex - 1; searchIndex >= 0 && !foundIntersection && !(searchIndex < 0);) {
          if (Utils1.isEmptySeg(segments[searchIndex].clipSeg)) {
            searchIndex--;
          } else {
            // If we're not at the last segment and segments are obtuse, break
            if (segmentIndex != segmentCounter - 1 &&
              Utils1.AreSegmentsObtuse(segments, segmentCounter, segmentIndex, searchIndex)) {
              break;
            }

            // Check for intersection with earlier segment
            if (Utils1.CalcSegmentIntersect(
              segments[searchIndex].clipSeg.start,
              segments[searchIndex].clipSeg.end,
              segments[segmentIndex].clipSeg.start,
              segments[segmentIndex].clipSeg.end,
              intersectionPoint
            )) {
              lastSegmentIndex = searchIndex;
              segments[searchIndex].clipSeg.end = Utils1.DeepCopy(intersectionPoint);
              segments[segmentIndex].clipSeg.start = Utils1.DeepCopy(intersectionPoint);
              foundIntersection = true;
              break;
            }

            // Special handling for last segment
            if (Utils1.isEnd(segmentIndex, segments.length, isClosed) &&
              Utils1.DeltaAngle(segments[segmentIndex].angle, segments[searchIndex].angle) > 0 &&
              Utils1.CalcSegmentIntersect(
                segments[searchIndex].clipSeg.start,
                segments[searchIndex].extSeg.endRay,
                segments[segmentIndex].clipSeg.start,
                segments[segmentIndex].clipSeg.end,
                intersectionPoint
              )) {
              lastSegmentIndex = searchIndex;
              segments[searchIndex].clipSeg.end = Utils1.DeepCopy(intersectionPoint);
              segments[segmentIndex].clipSeg.start = Utils1.DeepCopy(intersectionPoint);
              foundIntersection = true;
              break;
            }

            searchIndex--;
          }
        }
      }

      // Update segments based on intersection results
      if (foundIntersection) {
        // Mark all segments between last and current as empty
        for (searchIndex = lastSegmentIndex + 1; searchIndex < segmentIndex;) {
          segments[searchIndex].clipSeg.end = Utils1.DeepCopy(segments[searchIndex].clipSeg.start);
          searchIndex++;
        }
        lastSegmentIndex = segmentIndex;
      }
      // Handle end segments
      else if (Utils1.isEnd(segmentIndex, segments.length, isClosed)) {
        segments[lastSegmentIndex].clipSeg.end = Utils1.DeepCopy(segments[segmentIndex].extSeg.end);
        // Mark remaining segments as empty
        for (searchIndex = lastSegmentIndex + 1; searchIndex < segmentCounter;) {
          segments[searchIndex].clipSeg.end = Utils1.DeepCopy(segments[searchIndex].clipSeg.start);
          searchIndex++;
        }
      } else {
        segments[segmentIndex].clipSeg.end = Utils1.DeepCopy(segments[segmentIndex].clipSeg.start);
      }
    }

    // Special handling for closed polylines to connect start and end points
    if (isClosed) {
      let firstValidIndex = -1;
      let lastValidIndex = -1;

      // Find first valid segment
      for (segmentIndex = 0; segmentIndex < segmentCounter; segmentIndex++) {
        if (!Utils1.isEmptySeg(segments[segmentIndex].clipSeg)) {
          firstValidIndex = segmentIndex;
          break;
        }
      }

      // Find last valid segment
      for (segmentIndex = segmentCounter - 1; segmentIndex >= 0; segmentIndex--) {
        if (!Utils1.isEmptySeg(segments[segmentIndex].clipSeg)) {
          lastValidIndex = segmentIndex;
          break;
        }
      }

      // If both valid segments exist, try to connect them
      if (firstValidIndex >= 0 && lastValidIndex >= 0) {
        foundIntersection = false;

        for (segmentIndex = firstValidIndex; !foundIntersection && segmentIndex < lastValidIndex; segmentIndex++) {
          lastSegmentIndex = lastValidIndex;

          // Check if segments are obtuse and adjacent
          if (Utils1.AreSegmentsObtuse(segments, segmentCounter, segmentIndex, lastSegmentIndex) &&
            Utils1.AreSegmentsAjacent(segmentCounter, segmentIndex, lastSegmentIndex)) {
            foundIntersection = true;
          }
          // Check for direct intersection
          else if (Utils1.CalcSegmentIntersect(
            segments[lastSegmentIndex].clipSeg.start,
            segments[lastSegmentIndex].clipSeg.end,
            segments[segmentIndex].clipSeg.start,
            segments[segmentIndex].clipSeg.end,
            intersectionPoint
          )) {
            foundIntersection = true;
            segments[lastSegmentIndex].clipSeg.end = Utils1.DeepCopy(intersectionPoint);
            segments[segmentIndex].clipSeg.start = Utils1.DeepCopy(intersectionPoint);
          }
          // Check for alignment
          else if (Utils1.SegmentsInAlignment(segments, segmentCounter, segmentIndex, lastSegmentIndex)) {
            foundIntersection = true;
          }
          // Check for intersections with earlier segments
          else {
            for (searchIndex = lastSegmentIndex - 1; searchIndex > segmentIndex && !foundIntersection;) {
              if (Utils1.isEmptySeg(segments[searchIndex].clipSeg)) {
                searchIndex--;
              } else {
                if (Utils1.AreSegmentsObtuse(segments, segmentCounter, segmentIndex, searchIndex)) {
                  break;
                }

                if (Utils1.CalcSegmentIntersect(
                  segments[searchIndex].clipSeg.start,
                  segments[searchIndex].clipSeg.end,
                  segments[segmentIndex].clipSeg.start,
                  segments[segmentIndex].clipSeg.end,
                  intersectionPoint
                )) {
                  lastSegmentIndex = searchIndex;
                  segments[searchIndex].clipSeg.end = Utils1.DeepCopy(intersectionPoint);
                  segments[segmentIndex].clipSeg.start = Utils1.DeepCopy(intersectionPoint);
                  foundIntersection = true;
                  break;
                }

                searchIndex--;
              }
            }

            // Update segments if intersection was found
            if (foundIntersection) {
              for (searchIndex = lastSegmentIndex + 1; searchIndex <= lastValidIndex;) {
                segments[searchIndex].clipSeg.end = Utils1.DeepCopy(segments[searchIndex].clipSeg.start);
                searchIndex++;
              }
            } else {
              segments[segmentIndex].clipSeg.end = Utils1.DeepCopy(segments[segmentIndex].clipSeg.start);
            }
          }
        }
      }
    }

    // Build final outline from valid segments
    for (segmentIndex = 0; segmentIndex < segmentCounter; segmentIndex++) {
      if (!Utils1.isEmptySeg(segments[segmentIndex].clipSeg)) {
        // Add start point if it's not already the last point in our result
        if (resultPoints.length === 0 ||
          segments[segmentIndex].clipSeg.start.x != resultPoints[resultPoints.length - 1].x ||
          segments[segmentIndex].clipSeg.start.y != resultPoints[resultPoints.length - 1].y) {
          resultPoints.push(Utils1.DeepCopy(segments[segmentIndex].clipSeg.start));
        }

        // Add end point
        resultPoints.push(Utils1.DeepCopy(segments[segmentIndex].clipSeg.end));
      }
    }

    // Remove duplicate end point if outline is nearly closed
    while (resultPoints.length > 1 && Utils1.DeltaPoints(resultPoints[resultPoints.length - 1], resultPoints[0]) < 3) {
      resultPoints.splice(resultPoints.length - 1, 1);
    }

    // Validate result
    if ((resultPoints.length < 2 && !isClosed) || (resultPoints.length < 3 && isClosed)) {
      T3Util.Log("O.Opt CalcPolyOutline - Output: Insufficient output points (null)");
      return null;
    }

    T3Util.Log("O.Opt CalcPolyOutline - Output: Outline created with", resultPoints.length, "points");
    return resultPoints;
  }

  /**
     * Determines the winding direction of a polygon
     * @param points - Array of points defining the polygon
     * @returns 1 for clockwise, -1 for counter-clockwise
     */
  GetPolygonWindingDirection(points) {
    T3Util.Log("O.Opt GetPolygonWindingDirection - Input:", { pointCount: points.length });

    let sum = 0;

    // Calculate the sum of (x2-x1) * (y2+y1) for each pair of adjacent points
    for (let i = 0; i < points.length - 1; i++) {
      sum += (points[i + 1].x - points[i].x) * (points[i + 1].y + points[i].y);
    }

    // Determine winding direction based on sum
    const direction = sum > 0 ? -1 : 1;

    T3Util.Log("O.Opt GetPolygonWindingDirection - Output:", direction);
    return direction;
  }

  /**
     * Recursively builds a list of target objects connected through hooks
     * @param objectId - ID of the object to get targets for
     * @param linksList - The list of links to search in
     * @param targetList - The list to add targets to
     * @param boundingRect - Optional bounding rectangle to update
     * @param listCode - Optional list code for filtering
     * @returns The updated list of target objects
     */
  GetTargetList(objectId, linksList, targetList, boundingRect, listCode) {
    T3Util.Log("O.Opt GetTargetList - Input:", {
      objectId,
      linksListLength: linksList?.length,
      targetListLength: targetList?.length,
      hasBoundingRect: !!boundingRect,
      listCode
    });

    let sourceObject;
    let targetObject;
    let linkIndex;
    let hookObjectId;

    // Default to move hook list code if not specified
    let hookListCode = NvConstant.ListCodes.MoveHook;

    // Special case for lines and targets
    if (listCode === NvConstant.ListCodes.MoveTargAndLines) {
      hookListCode = listCode;
    }

    // Get the source object
    sourceObject = DataUtil.GetObjectPtr(objectId, false);
    if (sourceObject == null) {
      T3Util.Log("O.Opt GetTargetList - Output: Source object not found, returning original list");
      return targetList;
    }

    // Fix any circular references in hooks
    HookUtil.FixAnyCircularHooks(sourceObject);

    // Process each hook in the source object
    for (let hookIndex = 0; hookIndex < sourceObject.hooks.length; hookIndex++) {
      // Get the ID of the hooked object
      hookObjectId = sourceObject.hooks[hookIndex].objid;

      // Add the hooked object to the list if not already present
      if (targetList.indexOf(hookObjectId) < 0) {
        targetList.push(hookObjectId);

        // Update bounding rectangle if provided
        if (boundingRect) {
          targetObject = DataUtil.GetObjectPtr(hookObjectId, false);

          // Only include visible objects in bounding rectangle calculation
          if (!(targetObject.flags & NvConstant.ObjFlags.NotVisible)) {
            const objectRect = targetObject.GetMoveRect(true, true);
            boundingRect = Utils2.UnionRect(boundingRect, objectRect, boundingRect);
          }
        }
      }

      // Find links for this hooked object and add their targets
      linkIndex = OptCMUtil.FindLink(linksList, hookObjectId, true);
      if (linkIndex >= 0) {
        targetList = this.AddToHookList(
          linksList,
          targetList,
          linkIndex,
          hookObjectId,
          hookListCode,
          1,
          boundingRect
        );
      }

      // Recursive call to process targets of this hooked object
      targetList = this.GetTargetList(
        hookObjectId,
        linksList,
        targetList,
        boundingRect,
        listCode
      );
    }

    T3Util.Log("O.Opt GetTargetList - Output: Returning list with", targetList.length, "targets");
    return targetList;
  }

  /**
     * Calculates the clockwise angle between two points in degrees
     * @param startPoint - The starting point
     * @param endPoint - The ending point
     * @returns The clockwise angle in degrees
     */
  GetClockwiseAngleBetween2PointsInDegrees(startPoint, endPoint) {
    T3Util.Log("O.Opt GetClockwiseAngleBetween2PointsInDegrees - Input:", { startPoint, endPoint });

    const PI = NvConstant.Geometry.PI;
    let deltaX, deltaY, angleRadians;

    deltaX = endPoint.x - startPoint.x;
    deltaY = endPoint.y - startPoint.y;

    // Calculate angle based on position
    if (deltaX === 0) {
      // Vertical line case
      angleRadians = deltaY >= 0 ? PI / 2 : -PI / 2;
    } else if (deltaY === 0) {
      // Horizontal line case
      angleRadians = deltaX >= 0 ? 0 : PI;
    } else {
      // General case - use arctangent
      angleRadians = Math.atan2(deltaY, deltaX);
    }

    // Normalize angle to be between 0 and 2π
    if (angleRadians < 0) {
      angleRadians += 2 * PI;
    }

    // Convert radians to degrees
    const angleDegrees = angleRadians * (180 / PI);

    T3Util.Log("O.Opt GetClockwiseAngleBetween2PointsInDegrees - Output:", angleDegrees);
    return angleDegrees;
  }

  /**
     * Normalizes an angle value to be within the range [0, 2π)
     * @param angle - The angle to normalize
     * @param adjustment - The adjustment to apply before normalization
     * @returns The normalized angle value
     */
  NormalizeAngle(angle, adjustment) {
    T3Util.Log("O.Opt NormalizeAngle - Input:", { angle, adjustment });

    // Add the adjustment to the angle
    angle += adjustment;

    // Normalize to be within [0, 2π)
    if (angle >= 2 * NvConstant.Geometry.PI) {
      angle -= 2 * NvConstant.Geometry.PI;
    }

    if (angle < 0) {
      angle += 2 * NvConstant.Geometry.PI;
    }

    T3Util.Log("O.Opt NormalizeAngle - Output:", angle);
    return angle;
  }

  /**
     * Gets shape parameters for different shape types
     * @param shapeType - The type of shape
     * @param shapeDimensions - The dimensions of the shape
     * @returns Object containing shape parameters
     */
  GetShapeParams(shapeType: number, shapeDimensions: { width: number, height: number }) {
    T3Util.Log("O.Opt GetShapeParams - Input:", { shapeType, shapeDimensions });

    let polyVectorMethod;
    let shouldCircularize = false;
    let shapeParameter = 0;

    switch (shapeType) {
      // Basic shapes
      case PolygonConstant.ShapeTypes.RECTANGLE:
      case PolygonConstant.ShapeTypes.OVAL:
      case PolygonConstant.ShapeTypes.ROUNDED_RECTANGLE:
        break;

      // Circle
      case PolygonConstant.ShapeTypes.CIRCLE:
        shouldCircularize = true;
        break;

      // Diamond
      case PolygonConstant.ShapeTypes.DIAMOND:
        polyVectorMethod = PolygonUtil.generateDiamond;
        break;

      // Triangle variants
      case PolygonConstant.ShapeTypes.TRIANGLE:
        polyVectorMethod = PolygonUtil.generateTriangle;
        break;
      case PolygonConstant.ShapeTypes.TRIANGLE_BOTTOM:
        polyVectorMethod = PolygonUtil.generateTriangleDown;
        break;

      // Parallelogram
      case PolygonConstant.ShapeTypes.PARALLELOGRAM:
        shapeParameter = 0.13333 * shapeDimensions.width;
        polyVectorMethod = PolygonUtil.generateParallelogram;
        break;

      // Pentagon variants
      case PolygonConstant.ShapeTypes.PENTAGON:
        shapeParameter = 0.4 * shapeDimensions.height;
        polyVectorMethod = PolygonUtil.generatePentagon;
        shouldCircularize = false;
        break;
      case PolygonConstant.ShapeTypes.PENTAGON_LEFT:
        shapeParameter = 0.4 * shapeDimensions.width;
        polyVectorMethod = PolygonUtil.generatePentagonLeft;
        shouldCircularize = false;
        break;

      // Regular polygons
      case PolygonConstant.ShapeTypes.HEXAGON:
        shapeParameter = 0.26 * shapeDimensions.width;
        polyVectorMethod = PolygonUtil.generateHexagon;
        shouldCircularize = false;
        break;
      case PolygonConstant.ShapeTypes.OCTAGON:
        shapeParameter = 0.28;
        polyVectorMethod = PolygonUtil.generateOctagon;
        shouldCircularize = false;
        break;

      // Arrow variants
      case PolygonConstant.ShapeTypes.ARROW_RIGHT:
        shapeParameter = 0.3 * shapeDimensions.width;
        polyVectorMethod = PolygonUtil.generateRightArrow;
        break;
      case PolygonConstant.ShapeTypes.ARROW_LEFT:
        shapeParameter = 0.3 * shapeDimensions.width;
        polyVectorMethod = PolygonUtil.generateLeftArrow;
        break;
      case PolygonConstant.ShapeTypes.ARROW_TOP:
        shapeParameter = 0.3 * shapeDimensions.height;
        polyVectorMethod = PolygonUtil.generateTopArrow;
        break;
      case PolygonConstant.ShapeTypes.ARROW_BOTTOM:
        shapeParameter = 0.3 * shapeDimensions.height;
        polyVectorMethod = PolygonUtil.generateBottomArrow;
        break;

      // Trapezoid variants
      case PolygonConstant.ShapeTypes.TRAPEZOID:
        shapeParameter = 0.2 * shapeDimensions.width;
        polyVectorMethod = PolygonUtil.generateTrapezoid;
        break;
      case PolygonConstant.ShapeTypes.TRAPEZOID_BOTTOM:
        shapeParameter = 0.2 * shapeDimensions.width;
        polyVectorMethod = PolygonUtil.generateTrapezoidDown;
        break;

      // Flowchart shapes
      case PolygonConstant.ShapeTypes.INPUT:
        shapeParameter = 0.27 * shapeDimensions.height;
        polyVectorMethod = PolygonUtil.generateInput;
        break;
      case PolygonConstant.ShapeTypes.TERMINAL:
        polyVectorMethod = PolygonUtil.generateTerminal;
        break;
      case PolygonConstant.ShapeTypes.STORAGE:
        shapeParameter = shapeDimensions.width / 7.5;
        polyVectorMethod = PolygonUtil.generateStorage;
        break;
      case PolygonConstant.ShapeTypes.DOCUMENT:
        polyVectorMethod = PolygonUtil.generateDocument;
        shapeParameter = shapeDimensions.height / 7.5;
        break;
      case PolygonConstant.ShapeTypes.DELAY:
        shapeParameter = shapeDimensions.width / 5;
        polyVectorMethod = PolygonUtil.generateDelay;
        break;
      case PolygonConstant.ShapeTypes.DISPLAY:
        shapeParameter = shapeDimensions.width / 7.5;
        polyVectorMethod = PolygonUtil.generateDisplay;
        break;
    }

    const result = {
      dataclass: shapeType,
      shapeparam: shapeParameter,
      polyVectorMethod: polyVectorMethod,
      bCircularize: shouldCircularize
    };

    T3Util.Log("O.Opt GetShapeParams - Output:", result);
    return result;
  }

  AddtoDelete(objectIds: number[], isForced: boolean, additionalData: any) {
    T3Util.Log("O.Opt AddtoDelete - Input:", { objectIds, isForced, additionalData });

    let currentIndex: number;
    let objectCount: number = objectIds.length;
    let currentObj: any;
    let tempId: any;
    let parentConnector: number;
    let tempObj: any;
    let connectorHookCount: number;
    let connectorDefines = OptConstant.ConnectorDefines;
    let hasContainerConnector: boolean = false;
    let connectorUsageCount: number = 0;
    let deleteInfo: any = {};
    let childIds: any[] = [];
    // M holds a helper value; initialize to -1.
    let helperValue: number = -1;

    for (currentIndex = 0; currentIndex < objectCount; currentIndex++) {
      currentObj = DataUtil.GetObjectPtr(objectIds[currentIndex], false);
      if (currentObj != null) {
        // Save the current object's id
        tempId = objectIds[currentIndex];

        if (currentObj instanceof Instance.Shape.ShapeContainer) {
          this.ContainerAddtoDelete(currentObj, objectIds);
          hasContainerConnector = true;
        }

        if (currentObj.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
          hasContainerConnector = true;
          if (currentObj.IsFlowChartConnector && currentObj.IsFlowChartConnector()) {
            switch (currentObj.objecttype) {

              default:
                OptAhUtil.GetConnectorTree(objectIds[currentIndex], objectIds);
            }
          } else {

            OptAhUtil.GetConnectorTree(objectIds[currentIndex], objectIds);
            objectCount = objectIds.length;
            if (isForced && currentObj.hooks.length) {
              tempObj = DataUtil.GetObjectPtr(currentObj.hooks[0].objid, false);
              if (tempObj && tempObj.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape && objectIds.indexOf(currentObj.hooks[0].objid) < 0) {
                objectIds.push(currentObj.hooks[0].objid);
              }
            }
          }
        } else {
          // For non-connector objects.
          let flagSkip: boolean = false;
          parentConnector = OptAhUtil.GetParentConnector(objectIds[currentIndex], null);
          if (parentConnector >= 0) {
            hasContainerConnector = true;
            tempObj = DataUtil.GetObjectPtr(parentConnector, false);
            if (tempObj) {
              let connectorEndInfo: any = {};
              if (this.IsConnectorEndShape(currentObj, tempObj, connectorEndInfo)) {
                if (typeof connectorHookCount === "undefined") {
                  connectorHookCount = connectorEndInfo.nshapes;
                }
                if (objectIds.indexOf(parentConnector) < 0) {
                  if (connectorHookCount - connectorUsageCount > 1 || connectorEndInfo.pasted || isForced) {
                    objectIds.push(parentConnector);
                    if ((tempObj.extraflags & OptConstant.ExtraFlags.NoDelete)) {
                      tempObj.extraflags = SDJS.Utils.SetFlag(tempObj.extraflags, OptConstant.ExtraFlags.NoDelete, false);
                    }
                    OptAhUtil.GetConnectorTree(parentConnector, objectIds);
                    if (!connectorEndInfo.pasted) {
                      connectorUsageCount++;
                    }
                  } else {
                    objectIds.splice(currentIndex, 1);
                  }
                } else if (connectorEndInfo.nshapes <= 1 && !connectorEndInfo.pasted && !isForced) {
                  objectIds.splice(currentIndex, 1);
                  let parentIndex = objectIds.indexOf(parentConnector);
                  if (parentIndex >= 0) {
                    objectIds.splice(parentIndex, 1);
                  }
                }

                if (tempObj.IsFlowChartConnector && tempObj.IsFlowChartConnector()) {
                  childIds = [];
                  let childArray = T3Gv.opt.FindChildArray(objectIds[currentIndex], -1);
                  let childObj = DataUtil.GetObjectPtr(childArray, false);
                  if (childObj == null) {
                    childObj = tempObj;
                  }
                } else if (tempObj.arraylist.styleflags & OptConstant.AStyles.CoManager) {
                  if (isForced) {
                    tempId = tempObj.arraylist.hook[connectorDefines.SEDA_NSkip].id;
                    if (objectIds.indexOf(parentConnector) < 0) {
                      objectIds.push(parentConnector);
                    }
                    let hookCount = tempObj.arraylist.hook.length;
                    for (let hookIndex = connectorDefines.SEDA_NSkip; hookIndex < hookCount; hookIndex++) {
                      let hookId = tempObj.arraylist.hook[hookIndex].id;
                      if (objectIds.indexOf(hookId) < 0) {
                        objectIds.push(hookId);
                      }
                    }
                  } else {
                    let hookCount = tempObj.arraylist.hook.length;
                    for (let hookIndex = connectorDefines.SEDA_NSkip; hookIndex < hookCount; hookIndex++) {
                      let hookId = tempObj.arraylist.hook[hookIndex].id;
                      if (objectIds.indexOf(hookId) < 0) {
                        flagSkip = true;
                        break;
                      }
                    }
                  }
                } else {
                  if (tempObj.hooks.length === 0 && T3Gv.opt.CN_GetNShapes(parentConnector) <= 1 && objectIds.indexOf(parentConnector) === -1) {
                    objectIds.push(parentConnector);
                  }
                }
              }
            }
          } else {
            // No parent connector found.
            let repeatCount: number;

            repeatCount = 1;
            if (!isForced) {
              flagSkip = true;
            }

            let childSearchIndex: number = -1;
            for (let j = 0; j < repeatCount; j++) {
              let childId = T3Gv.opt.FindChildArray(objectIds[currentIndex], childSearchIndex);
              if (childId >= 0) {
                let childObj = DataUtil.GetObjectPtr(childId, true);
                if (childObj && childObj.arraylist && (childObj.arraylist.hook.length <= connectorDefines.SEDA_NSkip || (childObj.flags & NvConstant.ObjFlags.NotVisible))) {
                  flagSkip = false;
                }
                if (childObj.IsGenoConnector && childObj.IsGenoConnector()) {
                  flagSkip = false;
                  let alternateId: number = -1;
                  let hookCount = childObj.arraylist.hook.length;
                  for (let hookIndex = connectorDefines.SEDA_NSkip; hookIndex < hookCount; hookIndex++) {
                    let hookId = childObj.arraylist.hook[hookIndex].id;
                    if (objectIds.indexOf(hookId) < 0) {
                      if (DataUtil.GetObjectPtr(hookId, false).DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
                        flagSkip = true;
                        break;
                      }
                      if (DataUtil.GetObjectPtr(hookId, false).DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
                        alternateId = hookId;
                      }
                    }
                  }
                  if (!flagSkip) {
                    if (objectIds.indexOf(childId) < 0) {
                      objectIds.push(childId);
                    }
                    if (alternateId >= 0 && objectIds.indexOf(alternateId) < 0) {
                      objectIds.push(alternateId);
                    }
                    flagSkip = true;
                  }
                }
                childObj.flags = SDJS.Utils.SetFlag(childObj.flags, NvConstant.ObjFlags.Obj1, true);
                OptCMUtil.SetLinkFlag(childId, DSConstant.LinkFlags.Move);
              }
              childSearchIndex = childId;
            }
          }
          if (!flagSkip) {
            let childConnectorCount = HookUtil.FindAllChildConnectors(tempId).length;
            let allChildConnectors = HookUtil.FindAllChildConnectors(tempId);
            for (let idx = 0; idx < childConnectorCount; idx++) {
              hasContainerConnector = true;
              let childConnectorObj = DataUtil.GetObjectPtr(allChildConnectors[idx], false);
              if (!(childConnectorObj && childConnectorObj.IsFlowChartConnector && childConnectorObj.IsFlowChartConnector())) {
                OptAhUtil.GetConnectorTree(allChildConnectors[idx], objectIds);
              }
            }
            if (currentObj.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape && !isForced) {
              let tempArray: any[] = [];
              let healLineResult = this.HealLine(currentObj, false, tempArray);
              if (healLineResult >= 0) {
                hasContainerConnector = true;
                if (objectIds.indexOf(healLineResult) < 0) {
                  objectIds.push(healLineResult);
                }
                for (let k = 0; k < tempArray.length; k++) {
                  if (objectIds.indexOf(tempArray[k]) < 0) {
                    objectIds.push(tempArray[k]);
                  }
                }
              }
            }
            if (currentObj.associd >= 0) {
              let assocFlag: boolean = false;
              let assocObj = DataUtil.GetObjectPtr(currentObj.associd, false);
              if (assocObj) {
                if (assocObj.hooks.length && assocObj.hooks[0].hookpt === OptConstant.HookPts.KATD) {
                  assocFlag = true;
                }

                if (assocObj.objecttype !== NvConstant.FNObjectTypes.NgEvent && assocObj.objecttype !== NvConstant.FNObjectTypes.NgEventLabel) {
                  if (objectIds.indexOf(currentObj.associd) < 0) {
                    objectIds.push(currentObj.associd);
                  }
                }
              }
              if (assocFlag && objectIds.indexOf(currentObj.associd) < 0) {
                objectIds.push(currentObj.associd);
              }
            }
            if (currentObj.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line) {
              let childShapeList = SelectUtil.FindAllChildObjects(currentObj.BlockID, OptConstant.DrawObjectBaseClass.Shape, NvConstant.FNObjectTypes.Multiplicity);
              if (childShapeList && childShapeList.length) {
                for (let idx = 0; idx < childShapeList.length; idx++) {
                  if (objectIds.indexOf(childShapeList[idx]) < 0) {
                    objectIds.push(childShapeList[idx]);
                  }
                }
              }
            }
            if (!isForced) {
              let childLineList = SelectUtil.FindAllChildObjects(currentObj.BlockID, OptConstant.DrawObjectBaseClass.Line, null);
              if (childLineList && childLineList.length) {
                for (let idx = 0; idx < childLineList.length; idx++) {
                  if (objectIds.indexOf(childLineList[idx]) < 0) {
                    objectIds.push(childLineList[idx]);
                  }
                }
              }
            }
          }
        }
      }
    }

    if (deleteInfo) {
      deleteInfo.connectors = hasContainerConnector;
    }
    T3Util.Log("O.Opt AddtoDelete - Output:", { objectIds, helperValue });
    return helperValue;
  }

  /**
   * Heals or connects line segments by intelligently joining them.
   * This function identifies lines connected to a given object and attempts to join them
   * by analyzing their connection points, directions, and segment properties. It handles
   * hook updates, segment formatting, and proper connection geometry.
   *
   * @param sourceObject - The object whose line connections should be healed
   * @param checkOnly - If true, only checks if healing is possible without performing the operation
   * @param resultArray - Array to store connected object IDs
   * @returns ID of the connected line or -1 if no healing was possible
   */
  HealLine(sourceObject, checkOnly, resultArray) {
    // Initialize variables
    let objectCount;
    let objectIndex;
    let currentObject;
    let secondObject;
    let linkStartIndex;
    let lineDirection;
    let connectionPoint;
    let firstHookIndex;
    let secondHookIndex;
    let firstConnectHookIndex;
    let secondConnectHookIndex;
    let sourceObjectId;
    let northObject;
    let southObject;
    let westObject;
    let eastObject;
    let startPoint;
    let endPoint;
    let firstHookPositionPoint;
    let secondHookPositionPoint;

    // Arrays to store data
    let connectedObjects = [];
    let lineObjectIds = [];
    let connectionPoints = [];
    let directionTypes = [];

    // Get links data
    const links = DataUtil.GetObjectPtr(this.linksBlockId, false);
    let firstConnectedObjectId = -1;
    let secondConnectedObjectId = -1;
    let foundMatchingDirection = false;
    let isConnectFromEnd = false;
    let segmentLengths = [];
    const hookPoints = OptConstant.HookPts;

    /**
     * Calculates segment lengths for combining two line objects
     * @param firstLine - First line object
     * @param secondLine - Second line object
     * @param firstPoint - Connection point on first line
     * @param secondPoint - Connection point on second line
     * @param isFirstLineFirst - Whether to process first line segments first
     * @param isSecondLineReversed - Whether second line segments should be processed in reverse
     * @returns Array of segment lengths for the combined line
     */
    const calculateSegmentLengths = function (firstLine, secondLine, firstPoint, secondPoint, isFirstLineFirst, isSecondLineReversed) {
      let pointCount1, pointCount2, segLength, secondIndex, combinedSegLengths = [], secondLineSegLengths = [];

      // Get point counts from both lines
      pointCount1 = firstLine.segl.pts.length;
      pointCount2 = secondLine.segl.pts.length;

      // Calculate the connection segment length
      segLength = Utils2.IsEqual(firstPoint.y, secondPoint.y, 0.1)
        ? Math.abs(firstPoint.x - secondPoint.x)
        : Math.abs(firstPoint.y - secondPoint.y);

      // Process second line's segments
      if (isSecondLineReversed) {
        for (secondIndex = 2; secondIndex < pointCount2; secondIndex++) {
          let length = Utils2.IsEqual(secondLine.segl.pts[secondIndex].y, secondLine.segl.pts[secondIndex - 1].y)
            ? Math.abs(secondLine.segl.pts[secondIndex].x - secondLine.segl.pts[secondIndex - 1].x)
            : Math.abs(secondLine.segl.pts[secondIndex].y - secondLine.segl.pts[secondIndex - 1].y);
          secondLineSegLengths.push(length);
        }
      } else {
        for (secondIndex = pointCount2 - 2; secondIndex > 0; secondIndex--) {
          let length = Utils2.IsEqual(secondLine.segl.pts[secondIndex].y, secondLine.segl.pts[secondIndex - 1].y)
            ? Math.abs(secondLine.segl.pts[secondIndex].x - secondLine.segl.pts[secondIndex - 1].x)
            : Math.abs(secondLine.segl.pts[secondIndex].y - secondLine.segl.pts[secondIndex - 1].y);
          secondLineSegLengths.push(length);
        }
      }

      // Combine segment lengths in the proper order
      if (isFirstLineFirst) {
        // Add second line segments in reverse
        for (secondIndex = secondLineSegLengths.length - 1; secondIndex >= 0; secondIndex--) {
          combinedSegLengths.push(secondLineSegLengths[secondIndex]);
        }

        // Add connection segment
        combinedSegLengths.push(segLength);

        // Add first line segments
        for (secondIndex = 2; secondIndex < pointCount1; secondIndex++) {
          let length = Utils2.IsEqual(firstLine.segl.pts[secondIndex].y, firstLine.segl.pts[secondIndex - 1].y)
            ? Math.abs(firstLine.segl.pts[secondIndex].x - firstLine.segl.pts[secondIndex - 1].x)
            : Math.abs(firstLine.segl.pts[secondIndex].y - firstLine.segl.pts[secondIndex - 1].y);
          combinedSegLengths.push(length);
        }
      } else {
        // Add first line segments
        for (secondIndex = 1; secondIndex < pointCount1 - 1; secondIndex++) {
          let length = Utils2.IsEqual(firstLine.segl.pts[secondIndex].y, firstLine.segl.pts[secondIndex - 1].y)
            ? Math.abs(firstLine.segl.pts[secondIndex].x - firstLine.segl.pts[secondIndex - 1].x)
            : Math.abs(firstLine.segl.pts[secondIndex].y - firstLine.segl.pts[secondIndex - 1].y);
          combinedSegLengths.push(length);
        }

        // Add connection segment
        combinedSegLengths.push(segLength);

        // Add second line segments
        for (let i = 0; i < secondLineSegLengths.length; i++) {
          combinedSegLengths.push(secondLineSegLengths[i]);
        }
      }

      return combinedSegLengths;
    };

    /**
     * Updates the segment lengths of a line
     * @param lineObject - The line object to update
     * @param newLengths - The new segment lengths to apply
     */
    const updateSegmentLengths = function (lineObject, newLengths) {
      let index;
      let segmentLengthsLength = newLengths.length;
      let pointsCount = lineObject.segl.pts.length - 1;

      // Special case for 5-point segments
      if (pointsCount === 5) {
        newLengths[2] = newLengths[4];
      }

      // Update segment lengths
      for (index = 0; index < segmentLengthsLength && index <= pointsCount; index++) {
        lineObject.segl.lengths[index] = newLengths[index];
      }
    };

    // Find the starting index for this object's links
    linkStartIndex = OptCMUtil.FindLink(links, sourceObject.BlockID, true);
    sourceObjectId = sourceObject.BlockID;

    // If no links found, return immediately
    if (linkStartIndex < 0) {
      return -1;
    }

    // Collect all objects connected to the source object
    this.AddToHookList(
      links,
      connectedObjects,
      linkStartIndex,
      sourceObject.BlockID,
      NvConstant.ListCodes.TopOnly,
      1,
      {}
    );

    // Store total object count
    let totalObjectCount = objectCount = connectedObjects.length;

    // Process each connected object
    for (objectIndex = 0; objectIndex < objectCount; objectIndex++) {
      currentObject = DataUtil.GetObjectPtr(connectedObjects[objectIndex], false);

      // Check if object allows healing
      if (currentObject.AllowHeal()) {
        // Store line object IDs
        lineObjectIds.push(connectedObjects[objectIndex]);

        // Process object's hooks to find connections to the source object
        const hookCount = currentObject.hooks.length;
        for (let hookIndex = 0; hookIndex < hookCount; hookIndex++) {
          if (currentObject.hooks[hookIndex].objid === sourceObjectId) {
            connectionPoints[lineObjectIds.length - 1] = currentObject.hooks[hookIndex].connect;

            // Store direction based on hook point
            if (currentObject.hooks[hookIndex].hookpt === hookPoints.SED_KTL) {
              directionTypes.push(currentObject.segl.firstdir);
            } else {
              directionTypes.push(currentObject.segl.lastdir);
            }
          }
        }
      }
    }

    // Check if we have at least 2 connected objects
    if ((objectCount = lineObjectIds.length) >= 2 && objectCount < 4) {
      // Try to match objects by direction
      for (objectIndex = 0; objectIndex < objectCount; objectIndex++) {
        switch (directionTypes[objectIndex]) {
          case hookPoints.SED_KTC:
            northObject = lineObjectIds[objectIndex];
            if (southObject !== undefined) {
              lineObjectIds[0] = northObject;
              lineObjectIds[1] = southObject;
              objectCount = 2;
              foundMatchingDirection = true;
            }
            break;

          case hookPoints.SED_KBC:
            southObject = lineObjectIds[objectIndex];
            if (northObject !== undefined) {
              lineObjectIds[0] = northObject;
              lineObjectIds[1] = southObject;
              objectCount = 2;
              foundMatchingDirection = true;
            }
            break;

          case hookPoints.SED_KLC:
            westObject = lineObjectIds[objectIndex];
            if (eastObject !== undefined) {
              lineObjectIds[0] = westObject;
              lineObjectIds[1] = eastObject;
              objectCount = 2;
              foundMatchingDirection = true;
            }
            break;

          case hookPoints.SED_KRC:
            eastObject = lineObjectIds[objectIndex];
            if (westObject !== undefined) {
              lineObjectIds[0] = westObject;
              lineObjectIds[1] = eastObject;
              objectCount = 2;
              foundMatchingDirection = true;
            }
            break;
        }

        if (foundMatchingDirection) {
          break;
        }
      }
    }

    // If check only mode and matching direction found, return success
    if (checkOnly && foundMatchingDirection) {
      return 1;
    }

    // If we found matching directions, process the healing
    if (foundMatchingDirection) {
      // Get writable copies of both objects
      currentObject = DataUtil.GetObjectPtr(lineObjectIds[0], true);
      secondObject = DataUtil.GetObjectPtr(lineObjectIds[1], true);

      // If first object has one hook and second has two, swap them
      if (currentObject.hooks.length === 1 && secondObject.hooks.length === 2) {
        let tempId = lineObjectIds[0];
        lineObjectIds[0] = lineObjectIds[1];
        lineObjectIds[1] = tempId;
        currentObject = DataUtil.GetObjectPtr(lineObjectIds[0], true);
        secondObject = DataUtil.GetObjectPtr(lineObjectIds[1], true);
      }

      // Get bounding rectangles for both objects
      const firstRect = Utils2.Pt2Rect(currentObject.StartPoint, currentObject.EndPoint);
      const secondRect = Utils2.Pt2Rect(secondObject.StartPoint, secondObject.EndPoint);

      // Get links for both objects
      const firstObjectLinks = T3Gv.opt.GetPolyLineLinks(lineObjectIds[0], 0);
      const secondObjectLinks = T3Gv.opt.GetPolyLineLinks(lineObjectIds[1], 0);

      // Find hook indices
      for (objectCount = currentObject.hooks.length, objectIndex = 0; objectIndex < objectCount; objectIndex++) {
        if (currentObject.hooks[objectIndex].objid != sourceObject.BlockID) {
          firstConnectedObjectId = currentObject.hooks[objectIndex].objid;
        } else {
          firstHookIndex = objectIndex;
        }
      }

      for (objectCount = secondObject.hooks.length, objectIndex = 0; objectIndex < objectCount; objectIndex++) {
        if (secondObject.hooks[objectIndex].objid != sourceObject.BlockID) {
          secondConnectedObjectId = secondObject.hooks[objectIndex].objid;
          secondConnectHookIndex = objectIndex;
        } else {
          secondHookIndex = objectIndex;
        }
      }

      // Handle case: both objects connected to different objects (not the source)
      if (firstConnectedObjectId >= 0 && secondConnectedObjectId >= 0 && firstConnectedObjectId != secondConnectedObjectId) {
        // Determine connection direction and points
        if (secondObject.hooks[secondHookIndex].hookpt === hookPoints.KTL) {
          lineDirection = secondObject.segl.firstdir;
          connectionPoint = secondObject.StartPoint;
          isConnectFromEnd = false;
          secondHookPositionPoint = {
            x: secondObject.StartPoint.x,
            y: secondObject.StartPoint.y
          };

          const pointCount = secondObject.segl.pts.length;
          if (pointCount > 2) {
            secondHookPositionPoint.x = secondRect.x + secondObject.segl.pts[pointCount - 2].x;
            secondHookPositionPoint.y = secondRect.y + secondObject.segl.pts[pointCount - 2].y;
          }
        } else {
          lineDirection = secondObject.segl.lastdir;
          connectionPoint = secondObject.EndPoint;
          isConnectFromEnd = true;

          secondHookPositionPoint = {
            x: secondObject.StartPoint.x,
            y: secondObject.StartPoint.y
          };

          secondHookPositionPoint.x = secondRect.x + secondObject.segl.pts[1].x;
          secondHookPositionPoint.y = secondRect.y + secondObject.segl.pts[1].y;
        }

        // Connect objects based on hook position
        if (currentObject.hooks[firstHookIndex].hookpt === hookPoints.KTL) {
          firstHookPositionPoint = {
            x: currentObject.StartPoint.x,
            y: currentObject.StartPoint.y
          };

          firstHookPositionPoint.x = firstRect.x + currentObject.segl.pts[1].x;
          firstHookPositionPoint.y = firstRect.y + currentObject.segl.pts[1].y;

          // Calculate segment lengths for the combined line
          segmentLengths = calculateSegmentLengths(
            currentObject,
            secondObject,
            firstHookPositionPoint,
            secondHookPositionPoint,
            true,
            isConnectFromEnd
          );

          // Update first object's properties
          currentObject.segl.firstdir = lineDirection;
          currentObject.StartPoint.x = connectionPoint.x;
          currentObject.StartPoint.y = connectionPoint.y;
          currentObject.SegLFormat(connectionPoint, OptConstant.ActionTriggerType.LineStart, 0);
          updateSegmentLengths(currentObject, segmentLengths);
          currentObject.SegLFormat(connectionPoint, OptConstant.ActionTriggerType.LineStart, 0);
        } else {
          firstHookPositionPoint = {
            x: currentObject.StartPoint.x,
            y: currentObject.StartPoint.y
          };

          const pointCount = currentObject.segl.pts.length;
          if (pointCount > 2) {
            firstHookPositionPoint.x = firstRect.x + currentObject.segl.pts[pointCount - 2].x;
            firstHookPositionPoint.y = firstRect.y + currentObject.segl.pts[pointCount - 2].y;
          }

          // Calculate segment lengths for the combined line
          segmentLengths = calculateSegmentLengths(
            currentObject,
            secondObject,
            firstHookPositionPoint,
            secondHookPositionPoint,
            false,
            isConnectFromEnd
          );

          // Update first object's properties
          currentObject.segl.lastdir = lineDirection;
          currentObject.EndPoint.x = connectionPoint.x;
          currentObject.EndPoint.y = connectionPoint.y;
          currentObject.SegLFormat(connectionPoint, OptConstant.ActionTriggerType.LineEnd, 0);
          updateSegmentLengths(currentObject, segmentLengths);
          currentObject.SegLFormat(connectionPoint, OptConstant.ActionTriggerType.LineEnd, 0);
        }

        // Handle special case for exactly 2 total objects
        if (totalObjectCount === 2) {
          // Determine shift direction based on position
          let shiftDirection;
          if (Utils2.IsEqual(firstHookPositionPoint.y, secondHookPositionPoint.y, 2)) {
            shiftDirection = OptConstant.ActionArrow.Right;
          } else {
            shiftDirection = OptConstant.ActionArrow.Down;
          }

          // Shift connected shapes to maintain spacing
          OptAhUtil.ShiftConnectedShapes(
            sourceObject.BlockID,
            secondConnectedObjectId,
            currentObject.BlockID,
            shiftDirection,
            false
          );
        }

        // Update frame and apply changes
        currentObject.CalcFrame();
        this.FilterLinks(firstObjectLinks, secondObjectLinks, resultArray);

        // Move links if needed
        if (secondObjectLinks && secondObjectLinks.length) {
          HookUtil.MoveLinks(lineObjectIds[0], lineObjectIds[1], secondObjectLinks, null);
        }

        if (firstObjectLinks && firstObjectLinks.length) {
          HookUtil.MoveLinks(lineObjectIds[0], lineObjectIds[0], firstObjectLinks, null);
        }

        // Clear hops and update
        currentObject.hoplist.hops = [];
        currentObject.hoplist.nhops = 0;
        DataUtil.AddToDirtyList(lineObjectIds[0]);

        // Update hook connections
        HookUtil.UpdateHook(
          lineObjectIds[0],
          firstHookIndex,
          secondConnectedObjectId,
          currentObject.hooks[firstHookIndex].hookpt,
          secondObject.hooks[secondHookIndex].connect,
          secondObject.hooks[secondHookIndex].cellid
        );

        // Set link flag and update links
        OptCMUtil.SetLinkFlag(secondObject.hooks[secondHookIndex].objid, DSConstant.LinkFlags.Move);
        this.UpdateLinks();

        return lineObjectIds[1];
      }

      // Handle case: first object connected to something, second not connected
      if (firstConnectedObjectId >= 0 && secondConnectedObjectId < 0) {
        // Determine connection direction and points
        if (secondObject.hooks[0].hookpt === hookPoints.KTL) {
          lineDirection = secondObject.segl.lastdir;
          connectionPoint = secondObject.EndPoint;
          isConnectFromEnd = true;

          secondHookPositionPoint = {
            x: secondObject.StartPoint.x,
            y: secondObject.StartPoint.y
          };

          secondHookPositionPoint.x = secondRect.x + secondObject.segl.pts[1].x;
          secondHookPositionPoint.y = secondRect.y + secondObject.segl.pts[1].y;
        } else {
          lineDirection = secondObject.segl.firstdir;
          connectionPoint = secondObject.StartPoint;
          isConnectFromEnd = false;

          secondHookPositionPoint = {
            x: secondObject.StartPoint.x,
            y: secondObject.StartPoint.y
          };

          const pointCount = secondObject.segl.pts.length;
          if (pointCount > 2) {
            secondHookPositionPoint.x = secondRect.x + secondObject.segl.pts[pointCount - 2].x;
            secondHookPositionPoint.y = secondRect.y + secondObject.segl.pts[pointCount - 2].y;
          }
        }

        // Connect objects based on hook position
        if (currentObject.hooks[firstHookIndex].hookpt === hookPoints.KTL) {
          firstHookPositionPoint = {
            x: currentObject.StartPoint.x,
            y: currentObject.StartPoint.y
          };

          firstHookPositionPoint.x = firstRect.x + currentObject.segl.pts[1].x;
          firstHookPositionPoint.y = firstRect.y + currentObject.segl.pts[1].y;

          // Calculate segment lengths for the combined line
          segmentLengths = calculateSegmentLengths(
            currentObject,
            secondObject,
            firstHookPositionPoint,
            secondHookPositionPoint,
            true,
            isConnectFromEnd
          );

          // Update first object's properties
          currentObject.segl.firstdir = lineDirection;
          currentObject.StartPoint.x = connectionPoint.x;
          currentObject.StartPoint.y = connectionPoint.y;
          currentObject.SegLFormat(connectionPoint, OptConstant.ActionTriggerType.LineStart, 0);
          currentObject.CalcFrame();
          updateSegmentLengths(currentObject, segmentLengths);
          currentObject.SegLFormat(connectionPoint, OptConstant.ActionTriggerType.LineStart, 0);
        } else {
          firstHookPositionPoint = {
            x: currentObject.StartPoint.x,
            y: currentObject.StartPoint.y
          };

          const pointCount = currentObject.segl.pts.length;
          if (pointCount > 2) {
            firstHookPositionPoint.x = firstRect.x + currentObject.segl.pts[pointCount - 2].x;
            firstHookPositionPoint.y = firstRect.y + currentObject.segl.pts[pointCount - 2].y;
          }

          // Calculate segment lengths for the combined line
          segmentLengths = calculateSegmentLengths(
            currentObject,
            secondObject,
            firstHookPositionPoint,
            secondHookPositionPoint,
            false,
            isConnectFromEnd
          );

          // Update first object's properties
          currentObject.segl.lastdir = lineDirection;
          currentObject.EndPoint.x = connectionPoint.x;
          currentObject.EndPoint.y = connectionPoint.y;
          currentObject.SegLFormat(connectionPoint, OptConstant.ActionTriggerType.LineEnd, 0);
          currentObject.CalcFrame();
          updateSegmentLengths(currentObject, segmentLengths);
          currentObject.SegLFormat(connectionPoint, OptConstant.ActionTriggerType.LineEnd, 0);
        }

        // Update links
        this.FilterLinks(firstObjectLinks, secondObjectLinks, resultArray);

        // Move links if needed
        if (secondObjectLinks && secondObjectLinks.length) {
          HookUtil.MoveLinks(lineObjectIds[0], lineObjectIds[1], secondObjectLinks, null);
        }

        if (firstObjectLinks && firstObjectLinks.length) {
          HookUtil.MoveLinks(lineObjectIds[0], lineObjectIds[0], firstObjectLinks, null);
        }

        // Clear hops and update hooks
        currentObject.hoplist.hops = [];
        currentObject.hoplist.nhops = 0;

        HookUtil.UpdateHook(
          lineObjectIds[0],
          firstHookIndex,
          -1,
          currentObject.hooks[firstHookIndex].hookpt,
          currentObject.hooks[firstHookIndex].connect,
          currentObject.hooks[firstHookIndex].cellid
        );

        DataUtil.AddToDirtyList(lineObjectIds[0]);
        return lineObjectIds[1];
      }

      // Handle case: neither object connected or special case
      let mergedSegLine;

      /**
       * Combines two line objects into a single segment line
       * @param firstLine - First line object
       * @param firstHookPoint - Hook point on first line
       * @param secondLine - Second line object
       * @param secondHookPoint - Hook point on second line
       * @returns New segment line with combined points
       */
      const combineSegmentLines = function (firstLine, firstHookPoint, secondLine, secondHookPoint) {
        let i, pointCount;
        let newSegLine = new Instance.Shape.SegLine();
        let firstRect = Utils2.Pt2Rect(firstLine.StartPoint, firstLine.EndPoint);

        // Add points from first line based on hook point
        pointCount = firstLine.segl.pts.length;
        if (firstHookPoint === hookPoints.KTL) {
          for (i = pointCount - 1; i > 0; i--) {
            newSegLine.pts.push({
              x: firstLine.segl.pts[i].x + firstRect.x,
              y: firstLine.segl.pts[i].y + firstRect.y
            });
          }
          newSegLine.firstdir = firstLine.segl.lastdir;
        } else {
          for (i = 0; i < pointCount - 1; i++) {
            newSegLine.pts.push({
              x: firstLine.segl.pts[i].x + firstRect.x,
              y: firstLine.segl.pts[i].y + firstRect.y
            });
          }
          newSegLine.firstdir = firstLine.segl.firstdir;
        }

        // Add points from second line based on hook point
        pointCount = secondLine.segl.pts.length;
        secondRect = Utils2.Pt2Rect(secondLine.StartPoint, secondLine.EndPoint);

        if (secondHookPoint === hookPoints.KTR) {
          for (i = pointCount - 2; i >= 0; i--) {
            newSegLine.pts.push({
              x: secondLine.segl.pts[i].x + secondRect.x,
              y: secondLine.segl.pts[i].y + secondRect.y
            });
          }
          newSegLine.lastdir = secondLine.segl.firstdir;
        } else {
          for (i = 1; i < pointCount; i++) {
            newSegLine.pts.push({
              x: secondLine.segl.pts[i].x + secondRect.x,
              y: secondLine.segl.pts[i].y + secondRect.y
            });
          }
          newSegLine.lastdir = secondLine.segl.lastdir;
        }

        // Calculate segment lengths
        pointCount = newSegLine.pts.length;
        for (i = 1; i < pointCount; i++) {
          if (newSegLine.pts[i].x == newSegLine.pts[i - 1].x) {
            newSegLine.lengths.push(Math.abs(newSegLine.pts[i].y - newSegLine.pts[i - 1].y));
          } else {
            newSegLine.lengths.push(Math.abs(newSegLine.pts[i].x - newSegLine.pts[i - 1].x));
          }
        }

        return newSegLine;
      };

      // Create merged segment line
      mergedSegLine = combineSegmentLines(
        secondObject,
        secondObject.hooks[0].hookpt,
        currentObject,
        currentObject.hooks[0].hookpt
      );

      // If second object's hook is at start point, swap arrow properties
      if (secondObject.hooks[0].hookpt === hookPoints.KTL) {
        let tempArrow = secondObject.EndArrowID;
        secondObject.EndArrowID = secondObject.StartArrowID;
        secondObject.StartArrowID = tempArrow;

        tempArrow = secondObject.EndArrowDisp;
        secondObject.EndArrowDisp = secondObject.StartArrowDisp;
        secondObject.StartArrowDisp = tempArrow;
      }

      // Clear hops and update second object with merged segments
      secondObject.hoplist.hops = [];
      secondObject.hoplist.nhops = 0;
      secondObject.segl = mergedSegLine;

      // Update start and end points
      pointCount = mergedSegLine.pts.length;
      secondObject.StartPoint.x = mergedSegLine.pts[0].x;
      secondObject.StartPoint.y = mergedSegLine.pts[0].y;
      secondObject.EndPoint.x = mergedSegLine.pts[pointCount - 1].x;
      secondObject.EndPoint.y = mergedSegLine.pts[pointCount - 1].y;

      // Adjust segment points to be relative to the new frame
      const newBoundingRect = Utils2.Pt2Rect(secondObject.StartPoint, secondObject.EndPoint);
      for (objectIndex = 0; objectIndex < pointCount; objectIndex++) {
        secondObject.segl.pts[objectIndex].x -= newBoundingRect.x;
        secondObject.segl.pts[objectIndex].y -= newBoundingRect.y;
      }

      // Update frame and format
      secondObject.CalcFrame();
      connectionPoint = secondObject.EndPoint;
      secondObject.SegLFormat(connectionPoint, OptConstant.ActionTriggerType.LineEnd, 0);
      secondObject.CalcFrame();

      // Update links
      this.FilterLinks(secondObjectLinks, firstObjectLinks, resultArray);

      // Move links if needed
      if (firstObjectLinks && firstObjectLinks.length) {
        HookUtil.MoveLinks(lineObjectIds[1], lineObjectIds[0], firstObjectLinks, null);
      }

      if (secondObjectLinks && secondObjectLinks.length) {
        HookUtil.MoveLinks(lineObjectIds[1], lineObjectIds[1], secondObjectLinks, null);
      }

      // Update hook and mark as dirty
      HookUtil.UpdateHook(
        lineObjectIds[1],
        secondHookIndex,
        -1,
        secondObject.hooks[secondHookIndex].hookpt,
        secondObject.hooks[secondHookIndex].connect,
        secondObject.hooks[secondHookIndex].cellid
      );

      DataUtil.AddToDirtyList(lineObjectIds[1]);
      return lineObjectIds[0];
    }

    // If no healing was possible
    return -1;
  }

  SetVirtualKeyboardLifter(editor: any) {

  }

  VirtualKeyboardLifter(element: any, isActive: boolean) {
    T3Util.Log("O.Opt VirtualKeyboardLifter - Input:", { element, isActive });

    if (isActive) {
      // Calculate the element's frame in document coordinates.
      const elementFrame = element.CalcElementFrame();
      let frameChanged = false;
      let forceUpdate = false;

      // Check if the previously stored frame exists and is different.
      if (T3Gv.opt.virtualKeyboardLifterElementFrame) {
        frameChanged =
          elementFrame.x !== T3Gv.opt.virtualKeyboardLifterElementFrame.x ||
          elementFrame.y !== T3Gv.opt.virtualKeyboardLifterElementFrame.y ||
          elementFrame.width !== T3Gv.opt.virtualKeyboardLifterElementFrame.width ||
          elementFrame.height !== T3Gv.opt.virtualKeyboardLifterElementFrame.height;
      } else {
        forceUpdate = true;
      }

      // If the frame has changed or there's no previous frame.
      if (frameChanged || forceUpdate) {
        // Convert element frame's top-left coordinates from document to window coordinates.
        let windowCoords = T3Gv.docUtil.DocObject().ConvertDocToWindowCoords(elementFrame.x, elementFrame.y);

        // Convert width and height from document lengths to window lengths.
        let windowWidth = T3Gv.docUtil.DocObject().ConvertDocToWindowLength(elementFrame.width);
        if (windowWidth === 0) {
          windowWidth = 1;
        }
        let windowHeight = T3Gv.docUtil.DocObject().ConvertDocToWindowLength(elementFrame.height);
        if (windowHeight === 0) {
          windowHeight = 1;
        }

        // Store the updated frame.
        T3Gv.opt.virtualKeyboardLifterElementFrame = $.extend(true, {}, elementFrame);

        // Make the text input proxy visible.
        T3Gv.opt.workAreaTextInputProxy.css('visibility', 'visible');

        // Check for debug flag to style differently.
        if (false) {
          T3Gv.opt.workAreaTextInputProxy.css('background-color', 'yellow');
          T3Gv.opt.workAreaTextInputProxy.css('opacity', '0.25');
          T3Gv.opt.workAreaTextInputProxy.css('color', 'black');
          T3Gv.opt.workAreaTextInputProxy.css('z-index', '1000');
          // Adjust vertical position for debug.
          windowCoords.y += windowHeight;
        } else {
          T3Gv.opt.workAreaTextInputProxy.css('opacity', '0');
          T3Gv.opt.workAreaTextInputProxy.css('color', 'transparent');
          T3Gv.opt.workAreaTextInputProxy.css('z-index', '-1000');
          T3Gv.opt.workAreaTextInputProxy.css('text-align', 'left');
          // On Mac, adjust the coordinates; otherwise, hide the proxy off-screen.
          if (false) {
            windowCoords.x += windowWidth;
            windowHeight = 1;
          } else {
            windowCoords.x = -9999;
            windowWidth = 800;
          }
        }

        // Apply the calculated CSS positioning and dimensions.
        T3Gv.opt.workAreaTextInputProxy.css('left', windowCoords.x + 'px');
        T3Gv.opt.workAreaTextInputProxy.css('top', windowCoords.y + 'px');
        T3Gv.opt.workAreaTextInputProxy.css('width', windowWidth + 'px');
        T3Gv.opt.workAreaTextInputProxy.css('height', windowHeight + 'px');

        // If it's a forced update, clear the proxy's content.
        if (forceUpdate) {
          T3Gv.opt.workAreaTextInputProxy.val('');
        }

        // Set focus to the proxy to trigger the virtual keyboard.
        T3Gv.opt.workAreaTextInputProxy.focus();
      }
    } else {
      // When deactivating the virtual keyboard lifter.
      T3Gv.opt.virtualKeyboardLifterElementFrame = null;
      T3Gv.opt.workAreaTextInputProxy.css('visibility', 'visible');
      T3Gv.opt.workAreaTextInputProxy.blur();
      T3Gv.opt.workAreaTextInputProxy.val('');
      T3Gv.opt.workAreaTextInputProxy.css('visibility', 'hidden');
    }

    T3Util.Log("O.Opt VirtualKeyboardLifter - Output: completed");
  }

  /**
   * Returns an updated list of associated object IDs based on the input list.
   * It adds the original IDs, then appends the associated IDs (if available) and processes
   * objects that are swimlanes or containers for further associated deletions.
   *
   * @param listOfObjectIds - Array of object IDs to process.
   * @param skipContainerParents - If true, objects that have a container parent are excluded.
   * @returns Array of unique associated object IDs.
   *
   * Logs input and output with prefix "O.Opt".
   */
  AddAssoctoList(listOfObjectIds: number[], skipContainerParents?: boolean): number[] {
    T3Util.Log("O.Opt AddAssoctoList - Input:", { listOfObjectIds, skipContainerParents });

    let associatedIds: number[] = [];
    const totalIds = listOfObjectIds.length;
    const objectTypes = NvConstant.FNObjectTypes;

    for (let index = 0; index < totalIds; index++) {
      const objectId = listOfObjectIds[index];
      const currentObject = DataUtil.GetObjectPtr(objectId, false);

      // Process only if skipContainerParents is not enabled
      // or if the current object does not have a container parent.
      if (!skipContainerParents || !OptAhUtil.HasContainerParent(currentObject)) {
        switch (currentObject.objecttype) {
        }

        // Add the current object's ID if not already present.
        if (associatedIds.indexOf(objectId) < 0) {
          associatedIds.push(objectId);
        }

        // If the object has an association (associd) and exists, add its associd.
        if (currentObject && currentObject.associd >= 0 && DataUtil.GetObjectPtr(currentObject.associd, false)) {
          if (associatedIds.indexOf(currentObject.associd) < 0) {
            associatedIds.push(currentObject.associd);
          }
        }

        // Process container types.
        switch (currentObject.objecttype) {
          case objectTypes.ShapeContainer:
            T3Gv.opt.ContainerAddtoDelete(currentObject, associatedIds);
            break;
        }
      }
    }

    T3Util.Log("O.Opt AddAssoctoList - Output:", associatedIds);
    return associatedIds;
  }

  ShowLoading(isLoading) {
  }

  /**
   * Checks if any object in the provided list is linked to an object outside the list.
   * @param linkedObjectIds - Array of object IDs to check.
   * @returns True if at least one linked object refers to an object not in the list, false otherwise.
   */
  IsLinkedOutside(linkedObjectIds: number[]): boolean {
    T3Util.Log("O.Opt IsLinkedOutside - Input:", { linkedObjectIds });

    const allLinkedObjects = LayerUtil.ZList();
    for (let outerIndex = 0; outerIndex < linkedObjectIds.length; outerIndex++) {
      const currentObject = DataUtil.GetObjectPtr(linkedObjectIds[outerIndex], false);
      for (let innerIndex = 0; innerIndex < allLinkedObjects.length; innerIndex++) {
        const comparedObject = DataUtil.GetObjectPtr(allLinkedObjects[innerIndex], false);
        if (comparedObject.associd === currentObject.BlockID && linkedObjectIds.indexOf(comparedObject.BlockID) === -1) {
          T3Util.Log("O.Opt IsLinkedOutside - Output:", true);
          return true;
        }
      }
    }
    T3Util.Log("O.Opt IsLinkedOutside - Output:", false);
    return false;
  }

  /**
   * Determines if the selected group contains any objects that are non-deletable.
   * It checks each object in the selected object list for:
   * - Being a Kanban Table (subtype)
   * - Having a no-delete extra flag set
   * - Being a Timeline Event with a hook referencing a Timeline object
   * @returns True if any object is non-deletable, otherwise false.
   */
  IsGroupNonDelete(): boolean {
    T3Util.Log("O.Opt IsGroupNonDelete - Input: no parameters");

    const selectedObjects = DataUtil.GetObjectPtr(
      T3Gv.opt.theSelectedListBlockID,
      false
    );
    let currentObject = null;

    for (let index = 0; index < selectedObjects.length; index++) {
      currentObject = DataUtil.GetObjectPtr(selectedObjects[index], false);

      if (currentObject.extraflags & OptConstant.ExtraFlags.NoDelete) {
        T3Util.Log("O.Opt IsGroupNonDelete - Output: true");
        return true;
      }
    }

    T3Util.Log("O.Opt IsGroupNonDelete - Output: false");
    return false;
  }

  /**
   * Calculates the bounding rectangle that encloses the shapes corresponding to a list of object IDs.
   * @param objectIdList - An array of object IDs.
   * @param useFrame - If true, uses the object's Frame property.
   * @param useDragRectangle - If true and useFrame is false, uses the object's drag rectangle via GetDragR(); otherwise, uses the object's 'r' property.
   * @returns The union rectangle of all visible objects, or undefined if no valid object is processed.
   */
  GetListSRect(objectIdList, useFrame?, useDragRectangle?) {
    T3Util.Log("O.Opt GetListSRect - Input:", { objectIdList, useFrame, useDragRectangle });

    let unionRect;
    const notVisibleFlag = NvConstant.ObjFlags.NotVisible;

    for (let i = 0; i < objectIdList.length; i++) {
      const objectId = objectIdList[i];
      const currentObject = DataUtil.GetObjectPtr(objectId, false);
      if (currentObject != null) {
        const currentRect = useFrame
          ? currentObject.Frame
          : (useDragRectangle ? currentObject.GetDragR() : currentObject.r);
        if (currentObject && (currentObject.flags & notVisibleFlag) === 0) {
          if (unionRect === undefined) {
            unionRect = {};
            Utils2.CopyRect(unionRect, currentRect);
          } else {
            Utils2.UnionRect(currentRect, unionRect, unionRect);
          }
        }
      }
    }

    T3Util.Log("O.Opt GetListSRect - Output:", unionRect);
    return unionRect;
  }

  /**
     * Finds the parent group that contains a given target object in its group hierarchy.
     * @param targetId - The ID of the target object to search for.
     * @param currentGroup - The current group object to inspect. If null, uses the global ZList.
     * @returns The group object that is a parent of the target object, or null if not found.
     */
  FindParentGroup(targetId: number, currentGroup?: any): any {
    T3Util.Log("O.Opt FindParentGroup - Input:", { targetId, currentGroup });
    let child: any;
    let index: number;
    // Use current group's ShapesInGroup if provided, otherwise use the global ZList.
    const groupArray = (currentGroup = currentGroup || null) ? currentGroup.ShapesInGroup : LayerUtil.ZList();

    for (index = 0; index < groupArray.length; index++) {
      if (groupArray[index] === targetId) {
        T3Util.Log("O.Opt FindParentGroup - Output:", currentGroup);
        return currentGroup;
      }
      child = DataUtil.GetObjectPtr(groupArray[index], false);
      if (child instanceof Instance.Shape.GroupSymbol && child.ShapesInGroup) {
        const parentGroup = T3Gv.opt.FindParentGroup(targetId, child);
        if (parentGroup) {
          T3Util.Log("O.Opt FindParentGroup - Output:", parentGroup);
          return parentGroup;
        }
      }
    }
    T3Util.Log("O.Opt FindParentGroup - Output: null");
    return null;
  }

  /**
     * Rebuilds the links for the specified object.
     * Inserts a move link for each hook present in the object.
     * @param linkList - The list in which the new links will be inserted.
     * @param objectId - The ID of the object whose links need to be rebuilt.
     */
  RebuildLinks(linkList, objectId) {
    T3Util.Log("O.Opt RebuildLinks - Input:", { linkList, objectId });
    const targetObject = DataUtil.GetObjectPtr(objectId, false);
    if (targetObject && targetObject.hooks) {
      const hookCount = targetObject.hooks.length;
      for (let hookIndex = 0; hookIndex < hookCount; hookIndex++) {
        T3Gv.opt.InsertLink(linkList, objectId, hookIndex, DSConstant.LinkFlags.Move);
      }
    }
    T3Util.Log("O.Opt RebuildLinks - Output: Completed");
  }

  /**
     * Collects blob images from objects and stores them in a blob map.
     * This function recursively processes group symbols and extracts blob image data
     * from both direct object images and table cell images.
     *
     * @param objectIds - Array of object IDs to collect blob images from
     * @param blobMap - Map to store blob data by URL
     */
  GetBlobImages(objectIds, blobMap) {
    T3Util.Log("O.Opt GetBlobImages - Input:", {
      objectIdsCount: objectIds.length,
      blobMapSize: Object.keys(blobMap).length
    });

    let imageUrl;
    let tableData;
    let tableCell;
    let objectIndex;
    let cellIndex;
    let currentObject = null;
    let blobBytes = null;
    let objectCount = objectIds.length;

    for (objectIndex = 0; objectIndex < objectCount; ++objectIndex) {
      currentObject = DataUtil.GetObjectPtr(objectIds[objectIndex], false);

      if (currentObject.ShapeType == OptConstant.ShapeType.GroupSymbol) {
        // For group symbols, recursively process their contained shapes
        if (currentObject.ShapesInGroup && currentObject.ShapesInGroup.length) {
          this.GetBlobImages(currentObject.ShapesInGroup, blobMap);
        }
      } else {
        // Process object's direct image or symbol URL
        imageUrl = '';
        if (currentObject.ImageURL) {
          imageUrl = currentObject.ImageURL;
        } else if (currentObject.SymbolURL) {
          imageUrl = currentObject.SymbolURL;
        }

        if (imageUrl) {
          blobBytes = currentObject.GetBlobBytes();
          if (blobBytes && !blobMap[imageUrl]) {
            blobMap[imageUrl] = blobBytes;
          }
        }
      }
    }

    T3Util.Log("O.Opt GetBlobImages - Output:", {
      processedObjects: objectCount,
      blobMapSize: Object.keys(blobMap).length
    });
  }

  /**
    * Calculates the bounding rectangle that encloses all visible objects in the document.
    * Title blocks can be optionally excluded.
    *
    * @param excludeTitleBlocks - Whether to exclude title blocks from the calculation
    * @param frameDetails - Optional object to store the frame details of the first visible object
    * @param objectList - Optional list of objects to calculate bounds for; if not provided, uses all visible objects
    * @returns The union rectangle of all visible objects, or undefined if no visible objects
    */
  GetSRect(excludeTitleBlocks, frameDetails, objectList) {
    T3Util.Log("O.Opt GetSRect - Input:", {
      excludeTitleBlocks,
      hasFrameDetails: !!frameDetails,
      objectList: objectList ? objectList.length : "undefined"
    });

    // Constants for better readability
    const FLAG_NOT_VISIBLE = NvConstant.ObjFlags.NotVisible;
    const FLAG_TITLE_BLOCK = NvConstant.TextFlags.TitleBlock;

    // Use provided object list or get all visible objects
    const visibleObjects = objectList || LayerUtil.VisibleZList();
    const objectCount = visibleObjects.length;

    let unionRect;
    let currentObject;
    let isTitleBlock;
    let objectRect;

    // Process each object
    for (let i = 0; i < objectCount; i++) {
      currentObject = DataUtil.GetObjectPtr(visibleObjects[i], false);

      if (currentObject != null) {
        isTitleBlock = false;

        // Check if object is a title block and we're excluding title blocks
        if (excludeTitleBlocks && (currentObject.TextFlags & FLAG_TITLE_BLOCK)) {
          isTitleBlock = true;
        }

        // Only include visible, non-title block objects
        if (currentObject && (currentObject.flags & FLAG_NOT_VISIBLE) === 0 && !isTitleBlock) {
          // Create a deep copy of the object's rectangle
          objectRect = $.extend(true, {}, currentObject.r);

          // Initialize union rectangle with first object
          if (unionRect === undefined) {
            unionRect = objectRect;

            // Store frame details of first object if requested
            if (frameDetails) {
              frameDetails.x = currentObject.Frame.x;
              frameDetails.y = currentObject.Frame.y;
              frameDetails.width = currentObject.Frame.width;
              frameDetails.height = currentObject.Frame.height;
            }
          } else {
            // Combine with union rectangle
            Utils2.UnionRect(objectRect, unionRect, unionRect);
          }
        }
      }
    }

    T3Util.Log("O.Opt GetSRect - Output:", unionRect);
    return unionRect;
  }

  /**
    * Gets the automation context based on the provided operation mng
    * This function determines the appropriate automation context, considering
    * special flags that might modify the behavior (like disabling control arrows).
    *
    * @param optMng - The opteration mng to get context from
    * @returns The appropriate automation context string
    */
  GetAutomationContext(optMng) {
    T3Util.Log("O.Opt GetAutomationContext - Input:", optMng);

    const sessionObject = DataUtil.GetObjectPtr(this.sdDataBlockId, false);
    let automationContext = DSConstant.Contexts.Automation;

    if (optMng) {
      automationContext = optMng.GetAutomationContext();
    }

    // Check if the context is Automation and if control arrows should be disabled
    if (automationContext === DSConstant.Contexts.Automation) {
      // if (sessionObject.moreflags & NvConstant.SessionMoreFlags.SEDSM_NoCtrlArrow) {
      //   automationContext = DSConstant.Contexts.AutomationNoCtrl;
      // } else
      {
        automationContext = DSConstant.Contexts.Automation;
      }
    }

    T3Util.Log("O.Opt GetAutomationContext - Output:", automationContext);
    return automationContext;
  }

  /**
     * Restores the primary state manager if currently using a secondary state manager
     * This function handles necessary cleanup when switching back to the primary state manager,
     * ensuring any LM methods are restored and the SVG objects are re-rendered.
     */
  RestorePrimaryStateManager(): void {
    T3Util.Log("O.Opt RestorePrimaryStateManager - Input: no parameters");

    // Only take action if we're not already using the primary state manager
    if (!T3Gv.bIsPrimaryStateManager) {
      SvgUtil.RenderAllSVGObjects();
    }

    T3Util.Log("O.Opt RestorePrimaryStateManager - Output: Primary state manager restored");
  }

  /**
   * Maintains the relative distance of a point within a line segment when transforming between lines
   * @param targetLine - The line to which the point should be mapped
   * @param sourceLine - The original line containing the point
   * @param segmentIndex - Index of the segment in the polyline
   * @param point - The point to be maintained in relative position
   * @returns The adjusted point position
   */
  LinesMaintainDistWithinSegment(targetLine, sourceLine, segmentIndex, point) {
    T3Util.Log("O.Opt: LinesMaintainDistWithinSegment inputs:", {
      targetLine: targetLine.BlockID || "unknown",
      sourceLine: sourceLine.BlockID || "unknown",
      segmentIndex,
      point: { x: point.x, y: point.y }
    });

    // Get bounding rectangle for calculations
    var boundingRect = {};

    // Get points of the source line
    var sourcePoints = sourceLine.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, null);
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
    var targetPoints = targetLine.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, null);

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

    T3Util.Log("O.Opt: LinesMaintainDistWithinSegment output:", {
      point: { x: point.x, y: point.y }
    });

    return point;
  }


  /**
   * Handles auto-scrolling during drag operations
   */
  HandleObjectDragDoAutoScroll() {
    T3Util.Log("O.Opt HandleObjectDragDoAutoScroll - Input: Starting auto-scroll");

    // Schedule next auto-scroll
    T3Gv.opt.autoScrollTimerId = T3Gv.opt.autoScrollTimer.setTimeout("HandleObjectDragDoAutoScroll", 100);

    // Convert window coordinates to document coordinates
    const documentCoords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      T3Gv.opt.autoScrollXPos,
      T3Gv.opt.autoScrollYPos
    );

    // Scroll to the position
    T3Gv.docUtil.ScrollToPosition(documentCoords.x, documentCoords.y);

    // Continue object dragging at the new position
    this.HandleObjectDragMoveCommon(documentCoords.x, documentCoords.y);

    T3Util.Log("O.Opt HandleObjectDragDoAutoScroll - Output: Position updated", documentCoords);
  }

  HandleObjectDragMoveCommon(mouseX, mouseY, skipScrolling?, event?) {
    T3Util.Log("O.Opt HandleObjectDragMoveCommon - Input:", { mouseX, mouseY, skipScrolling, event });

    // Helper function to constrain movement within bounds
    const constrainMovementToBounds = () => {
      if (T3Gv.opt.dragDeltaX < -T3Gv.opt.moveBounds.x) {
        T3Gv.opt.dragDeltaX = -T3Gv.opt.moveBounds.x;
      }
      if (T3Gv.opt.dragDeltaY < -T3Gv.opt.moveBounds.y) {
        T3Gv.opt.dragDeltaY = -T3Gv.opt.moveBounds.y;
      }
    };

    // Handle pinned rectangle constraints if applicable
    if (T3Gv.opt.pinRect) {
      const position = {
        x: mouseX,
        y: mouseY
      };
      this.PinMoveRect(position);
      mouseX = position.x;
      mouseY = position.y;
    }

    // Calculate the delta (amount of movement)
    T3Gv.opt.dragDeltaX = mouseX - T3Gv.opt.dragStartX;
    T3Gv.opt.dragDeltaY = mouseY - T3Gv.opt.dragStartY;
    constrainMovementToBounds();

    // Calculate new bounds after movement for auto-growth
    let newBoundsLimit = {
      x: T3Gv.opt.dragDeltaX + T3Gv.opt.moveBounds.x + T3Gv.opt.moveBounds.width,
      y: T3Gv.opt.dragDeltaY + T3Gv.opt.moveBounds.y + T3Gv.opt.moveBounds.height
    };

    // Apply auto-growth if necessary
    newBoundsLimit = DrawUtil.DoAutoGrowDrag(newBoundsLimit);

    // Get the list of objects being moved
    const objectsToMove = T3Gv.opt.moveList;
    const objectCount = objectsToMove ? objectsToMove.length : 0;

    // Early exit if no objects to move
    if (objectCount === 0) {
      T3Util.Log("O.Opt HandleObjectDragMoveCommon - Output: No objects to move");
      return;
    }

    // Variables for object tracking
    let index = 0;
    let svgElement = null;
    let objectRect = null;
    let mousePosition = { x: mouseX, y: mouseY };
    let targetRect = { x: 0, y: 0 };
    let adjustedTargetRect = { x: 0, y: 0 };

    // Determine if we should skip snapping
    let isSnapDisabled = T3Gv.opt.linkParams &&
      (T3Gv.opt.linkParams.ConnectIndex >= 0 || T3Gv.opt.linkParams.JoinIndex >= 0) ||
      skipScrolling;

    const isEnhancedSnap = T3Gv.opt.EnhanceSnaps(event);
    const isOverrideSnap = T3Gv.opt.OverrideSnaps(event);

    if (isOverrideSnap) {
      isSnapDisabled = true;
    }

    // Get the target object being dragged
    let targetObject = DataUtil.GetObjectPtr(T3Gv.opt.dragTargetId, false);
    let snapOffset = { x: null, y: null };
    const currentPosition = { x: mouseX, y: mouseY };

    // Ensure we don't drag to negative coordinates
    if (currentPosition.x < 0) {
      currentPosition.x = 0;
    }

    // Remove any existing dynamic guides if snapping is disabled
    if (isSnapDisabled && T3Gv.opt.dynamicGuides) {
      DynamicUtil.DynamicSnapsRemoveGuides(T3Gv.opt.dynamicGuides);
      T3Gv.opt.dynamicGuides = null;
    }

    // Create dynamic guides for snapping
    let dynamicGuides = new DynamicGuides();
    let snapTargetId;

    // Handle snap-to-shapes if enabled
    if (!isSnapDisabled && DrawUtil.AllowSnapToShapes()) {
      objectRect = targetObject.GetSnapRect();
      targetRect = $.extend(true, {}, objectRect);
      targetRect.x += T3Gv.opt.dragDeltaX;
      targetRect.y += T3Gv.opt.dragDeltaY;

      const snapOptions = {};
      snapTargetId = targetObject.CanSnapToShapes(snapOptions);

      if (snapTargetId >= 0) {
        // Get snap target rectangle
        objectRect = DataUtil.GetObjectPtr(snapTargetId, false).GetSnapRect();
        adjustedTargetRect = $.extend(true, {}, objectRect);
        adjustedTargetRect.x += T3Gv.opt.dragDeltaX;
        adjustedTargetRect.y += T3Gv.opt.dragDeltaY;

        //DynamicSnapsGetSnapObjects(selectedObject, bounds, dynamicGuides, snapDistance, includeCenters, restrictToVisible)

        // Calculate snap points and adjust position
        snapOffset = DynamicUtil.DynamicSnapsGetSnapObjects(
          snapTargetId,
          adjustedTargetRect,
          dynamicGuides,
          T3Gv.opt.moveList,
          null,
          snapOptions
        );

        if (snapOffset.x !== null) {
          currentPosition.x += snapOffset.x;
          adjustedTargetRect.x += snapOffset.x;
          T3Gv.opt.dragDeltaX = currentPosition.x - T3Gv.opt.dragStartX;
        }

        if (snapOffset.y !== null) {
          currentPosition.y += snapOffset.y;
          adjustedTargetRect.y += snapOffset.y;
          T3Gv.opt.dragDeltaY = currentPosition.y - T3Gv.opt.dragStartY;
        }

        constrainMovementToBounds();
      }
    }

    // Handle grid snapping if enabled
    if (T3Gv.docUtil.docConfig.enableSnap && !isSnapDisabled) {
      objectRect = targetObject.GetSnapRect();
      targetRect = $.extend(true, {}, objectRect);
      targetRect.x += T3Gv.opt.dragDeltaX;
      targetRect.y += T3Gv.opt.dragDeltaY;

      // Try custom snapping first
      if (targetObject && targetObject.CustomSnap(
        targetObject.Frame.x,
        targetObject.Frame.y,
        T3Gv.opt.dragDeltaX,
        T3Gv.opt.dragDeltaY,
        false,
        currentPosition
      )) {
        if (snapOffset.x === null) {
          T3Gv.opt.dragDeltaX = currentPosition.x - T3Gv.opt.dragStartX;
        }

        if (snapOffset.y === null) {
          T3Gv.opt.dragDeltaY = currentPosition.y - T3Gv.opt.dragStartY;
        }

        constrainMovementToBounds();
      }
      // Use center snapping if enabled
      else if (T3Gv.docUtil.docConfig.centerSnap) {
        // Snap based on object center
        mousePosition.x = objectRect.x + T3Gv.opt.dragDeltaX + objectRect.width / 2;
        mousePosition.y = objectRect.y + T3Gv.opt.dragDeltaY + objectRect.height / 2;
        mousePosition = T3Gv.docUtil.SnapToGrid(mousePosition);

        if (snapOffset.x === null) {
          T3Gv.opt.dragDeltaX = mousePosition.x - objectRect.x - objectRect.width / 2;
        }

        if (snapOffset.y === null) {
          T3Gv.opt.dragDeltaY = mousePosition.y - objectRect.y - objectRect.height / 2;
        }
      }
      // Use regular rect snapping
      else {
        targetRect = $.extend(true, {}, objectRect);
        targetRect.x += T3Gv.opt.dragDeltaX;
        targetRect.y += T3Gv.opt.dragDeltaY;

        const snapResult = T3Gv.docUtil.SnapRect(targetRect);

        if (snapOffset.x === null) {
          T3Gv.opt.dragDeltaX += snapResult.x;
        }

        if (snapOffset.y === null) {
          T3Gv.opt.dragDeltaY += snapResult.y;
        }
      }

      // Handle enhanced snap (shift key) - constrain to horizontal or vertical
      if (isEnhancedSnap) {
        if (Math.abs(T3Gv.opt.dragDeltaX) >= Math.abs(T3Gv.opt.dragDeltaY)) {
          T3Gv.opt.dragDeltaY = 0;
        } else {
          T3Gv.opt.dragDeltaX = 0;
        }
      }
    }

    // Get session data and check if auto-grow is disabled
    const sessionData = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    if (T3Gv.opt.header.flags & OptConstant.CntHeaderFlags.NoAuto) {
      // Constrain to document dimensions
      const rightEdge = T3Gv.opt.moveBounds.x +
        T3Gv.opt.moveBounds.width +
        T3Gv.opt.dragDeltaX;

      if (rightEdge > sessionData.dim.x) {
        T3Gv.opt.dragDeltaX -= rightEdge - sessionData.dim.x;
      }

      const bottomEdge = T3Gv.opt.moveBounds.y +
        T3Gv.opt.moveBounds.height +
        T3Gv.opt.dragDeltaY;

      if (bottomEdge > sessionData.dim.y) {
        T3Gv.opt.dragDeltaY -= bottomEdge - sessionData.dim.y;
      }
    }

    // Get target selection ID
    let targetSelectionId = SelectUtil.GetTargetSelect();
    if (targetSelectionId < 0) {
      targetSelectionId = T3Gv.opt.dragTargetId;
    }

    // Zero out deltas if skip scrolling is requested
    if (skipScrolling === true) {
      T3Gv.opt.dragDeltaX = 0;
      T3Gv.opt.dragDeltaY = 0;
    }

    // Move each object in the move list
    for (index = 0; index < objectCount; ++index) {
      objectRect = T3Gv.opt.dragBBoxList[index];

      // Special handling for the target selection
      if (objectsToMove[index] === targetSelectionId) {
        targetObject = DataUtil.GetObjectPtr(targetSelectionId, false);

        let displayDimensions = {
          x: objectRect.x + T3Gv.opt.dragDeltaX,
          y: objectRect.y + T3Gv.opt.dragDeltaY,
          width: objectRect.width,
          height: objectRect.height
        };

        if (targetObject) {
          // Get dimensions for display from the object
          displayDimensions = targetObject.GetDimensionsForDisplay();
          displayDimensions.x += T3Gv.opt.dragDeltaX;
          displayDimensions.y += T3Gv.opt.dragDeltaY;

          // Update hooked objects if connected
          if ((T3Gv.opt.linkParams && T3Gv.opt.linkParams.ConnectIndex >= 0) ||
            T3Gv.opt.linkParams.ConnectIndexHistory.length > 0) {
            HookUtil.HandleHookedObjectMoving(targetObject, displayDimensions);
          }
        }

        // Update coordinates display
        UIUtil.UpdateDisplayCoordinates(
          displayDimensions,
          mousePosition,
          CursorConstant.CursorTypes.Move,
          targetObject
        );

        // Update selection attributes for the ribbon
        const selectAttr = new SelectionAttr();
        selectAttr.left = displayDimensions.x;
        selectAttr.top = displayDimensions.y;

        // Check if we need to display dimensions as feet/inches
        const showFeetAsInches = targetObject.Dimensions & NvConstant.DimensionFlags.ShowFeetAsInches;

        // Format the dimensions as strings
        selectAttr.widthstr = T3Constant.DocContext.CurrentWidth;
        selectAttr.heightstr = T3Constant.DocContext.CurrentHeight;
        selectAttr.leftstr = RulerUtil.GetLengthInRulerUnits(
          selectAttr.left,
          false,
          T3Gv.docUtil.rulerConfig.originx,
          showFeetAsInches
        );
        selectAttr.topstr = RulerUtil.GetLengthInRulerUnits(
          selectAttr.top,
          false,
          T3Gv.docUtil.rulerConfig.originy,
          showFeetAsInches
        );

        // Update ribbon dimensions (commented out as it's using SDUI)
        // SDUI.Commands.MainController.UpdateRibbonDimensions(SelectionAttr);

        // Update guides display if they exist
        if (dynamicGuides) {
          DynamicUtil.DynamicSnapsUpdateGuides(dynamicGuides, snapTargetId, adjustedTargetRect);
        }
      }

      // Update SVG element position
      svgElement = SvgUtil.GetSVGDragElement(index);
      if (svgElement) {
        svgElement.SetPos(
          objectRect.x + T3Gv.opt.dragDeltaX,
          objectRect.y + T3Gv.opt.dragDeltaY
        );

        // Send collaboration event for the move
        const newRect = {
          x: objectRect.x + T3Gv.opt.dragDeltaX,
          y: objectRect.y + T3Gv.opt.dragDeltaY,
          width: objectRect.width,
          height: objectRect.height
        };

        // Collab.SendSVGEvent(
        //   this.moveList[index],
        //   OptConstant.CollabSVGEventTypes.ObjectMove,
        //   newRect
        // );
      }
    }

    T3Util.Log("O.Opt HandleObjectDragMoveCommon - Output:", {
      deltaX: T3Gv.opt.dragDeltaX,
      deltaY: T3Gv.opt.dragDeltaY,
      objectsProcessed: objectCount
    });
  }

  /**
   * Handles auto-scrolling during stamp drag operations
   */
  HandleStampDragDoAutoScroll() {
    T3Util.Log("O.Opt HandleStampDragDoAutoScroll - Input: Starting auto-scroll");

    // Schedule next auto-scroll
    T3Gv.opt.autoScrollTimerId = T3Gv.opt.autoScrollTimer.setTimeout(
      'HandleStampDragDoAutoScroll',
      100
    );

    // Convert window coordinates to document coordinates
    const documentCoords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      T3Gv.opt.autoScrollXPos,
      T3Gv.opt.autoScrollYPos
    );

    // Scroll to the position and update the stamp object
    T3Gv.docUtil.ScrollToPosition(documentCoords.x, documentCoords.y);
    DrawUtil.StampObjectMoveCommon(documentCoords.x, documentCoords.y);

    T3Util.Log("O.Opt HandleStampDragDoAutoScroll - Output: Position updated", documentCoords);
  }

  RubberBandSelectDoAutoScroll() {
    T3Util.Log("O.Opt RubberBandSelectDoAutoScroll - Input: starting auto scroll");

    // Schedule auto-scroll callback to run every 100ms
    T3Gv.opt.autoScrollTimerId = T3Gv.opt.autoScrollTimer.setTimeout("RubberBandSelectDoAutoScroll", 100);

    // Convert window coordinates (autoScrollXPos, autoScrollYPos) to document coordinates
    const documentCoords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      T3Gv.opt.autoScrollXPos,
      T3Gv.opt.autoScrollYPos
    );
    T3Util.Log(`O.Opt RubberBandSelectDoAutoScroll - Converted Coordinates: x=${documentCoords.x}, y=${documentCoords.y}`);

    // Scroll the document to the computed position
    T3Gv.docUtil.ScrollToPosition(documentCoords.x, documentCoords.y);
    T3Util.Log(`O.Opt RubberBandSelectDoAutoScroll - Scrolled to position: x=${documentCoords.x}, y=${documentCoords.y}`);

    // Move the rubber band selection rectangle based on the new coordinates
    SelectUtil.RubberBandSelectMoveCommon(documentCoords.x, documentCoords.y);
    T3Util.Log("O.Opt RubberBandSelectDoAutoScroll - Output: Rubber band selection moved");
  }

  /**
   * Imports an image as a background layer in the document
   * This function handles creating a background layer if one doesn't exist,
   * or clearing an existing background layer before adding a new image.
   *
   * @param imageUrl - URL of the image to be imported as background
   * @param importOptions - Optional settings for image import
   * @returns void
   */
  ImportBackgroundLayerImage(imageUrl, importOptions) {
    T3Util.Log("O.Opt ImportBackgroundLayerImage - Input:", { imageUrl, importOptions });

    let layerIndex;
    let existingObjects;
    let backgroundLayerIndex = -1;

    // Function to set background after layer is ready
    const setBackgroundImage = () => {
      // Make the background layer active
      LayerUtil.MakeLayerActiveByIndex(backgroundLayerIndex);

      // Allow adding objects to this layer
      layersManager.layers[backgroundLayerIndex].flags = Utils2.SetFlag(
        layersManager.layers[backgroundLayerIndex].flags,
        NvConstant.LayerFlags.NoAdd,
        false
      );

      // Set the background image
      T3Gv.opt.SetBackgroundImage(imageUrl, true, importOptions, true);
    };

    // Get the layers manager
    let layersManager = DataUtil.GetObjectPtr(this.layersManagerBlockId, false);

    if (layersManager) {
      // Find if a background layer already exists
      for (layerIndex = 0; layerIndex < layersManager.layers.length; layerIndex++) {
        if (layersManager.layers[layerIndex].layertype === NvConstant.LayerTypes.Background) {
          backgroundLayerIndex = layerIndex;
          break;
        }
      }

      // If collaborating, ensure we're working with a modifiable copy
      if (/*Collab.AllowMessage() && (Collab.BeginSecondaryEdit(),*/false) {
        layersManager = DataUtil.GetObjectPtr(this.layersManagerBlockId, true);
      }

      // If no background layer exists, create one
      if (backgroundLayerIndex < 0) {
        LayerUtil.AddNewLayerAtFront("Background Layer", true, false);
        LayerUtil.RotateLayerStack(true);
        backgroundLayerIndex = layersManager.layers.length - 1;
        layersManager.layers[backgroundLayerIndex].layertype = NvConstant.LayerTypes.Background;
      } else {
        // Check if background layer already has objects
        existingObjects = layersManager.layers[backgroundLayerIndex].zList;

        if (existingObjects.length > 0 && importOptions == null) {

          return;
        }

        // Clear any selected objects
        this.CloseEdit(true);
      }

      // Set the background image
      setBackgroundImage();
    }

    T3Util.Log("O.Opt ImportBackgroundLayerImage - Output: Background layer updated");
  }

  /**
   * Sets a background image for the document or a selected object
   * This function handles different scenarios:
   * - Setting an image as document background
   * - Replacing an image in an existing shape
   * - Creating a new image shape
   * - Handling SVG and bitmap images
   *
   * @param imageUrl - URL of the image to set
   * @param replaceExisting - Whether to replace an existing image
   * @param importData - Optional data for import process or collaboration
   * @param isBackground - Whether this is a background image
   * @param callback - Optional callback function
   */
  SetBackgroundImage(imageUrl, replaceExisting, importData, isBackground, callback) {
    T3Util.Log("O.Opt SetBackgroundImage - Input:", {
      imageUrl,
      replaceExisting,
      hasImportData: !!importData,
      isBackground,
      hasCallback: !!callback
    });

    let selectedObject;
    let objectDimensions;
    let shouldReplaceExistingImage = false;
    let imageSourceUrl = "";
    let imageBlob = null;
    let imageBlobBytes = null;
    let self = this;

    // Default target dimensions
    let targetReplaceExisting = replaceExisting;
    let targetWidth = 800;
    let targetHeight = 800;

    // Function to add a new image shape
    const createImageShape = (width, height, skipRendering) => {
      let newObjectId;
      let newObjectList = [];

      // Only proceed if dimensions are valid
      if (!skipRendering && width > 0 && height > 0) {
        let imageHeight = height;
        let imageWidth = width;

        // Calculate position to center the image in work area
        const centerPosition = self.CalcWorkAreaCenterUL(imageWidth, imageHeight);

        // Create a transparent style for the image container
        const transparentStyle = new QuickStyle();
        transparentStyle.Name = "";
        transparentStyle.Line.Thickness = 0;
        transparentStyle.Fill.Paint.FillType = NvConstant.FillTypes.Transparent;

        // Create data for the new rectangle object
        const rectangleData = {
          Frame: {
            x: centerPosition.x,
            y: centerPosition.y,
            width: imageWidth,
            height: imageHeight
          },
          TextGrow: NvConstant.TextGrowBehavior.ProPortional,
          ImageURL: imageSourceUrl,
          StyleRecord: transparentStyle,
          ObjGrow: OptConstant.GrowBehavior.ProPortional,
          flags: NvConstant.ObjFlags.ImageOnly,
          extraflags: OptConstant.ExtraFlags.NoColor
        };

        // Create the rectangle object
        const rectangleObject = new Instance.Shape.Rect(rectangleData);

        if (rectangleObject) {
          // Set image data in the object
          const imageDir = DSUtil.GetImageDir(imageBlob);
          rectangleObject.SetBlobBytes(imageBlobBytes, imageDir);

          // Handle SVG dimensions
          if (imageDir === StyleConstant.ImageDir.Svg) {
            rectangleObject.SVGDim = {
              width: width,
              height: height
            };
          }
        }

        // Add the new object to the document
        newObjectId = DrawUtil.AddNewObject(rectangleObject, false, true);

        // Update object properties
        const newObject = DataUtil.GetObjectPtr(newObjectId, false);
        if (newObject) {
          newObject.TextFlags = NvConstant.TextFlags.AttachB;
          newObject.ImageHeader = new ImageRecord();
          newObjectList.push(newObjectId);
        }

        // Handle background layer flags
        const layersManager = DataUtil.GetObjectPtr(this.layersManagerBlockId, false);
        if (layersManager &&
          layersManager.layers[layersManager.activelayer].layertype === NvConstant.LayerTypes.Background) {

          // Get writable copy of layers manager
          const writableLayersManager = DataUtil.GetObjectPtr(this.layersManagerBlockId, true);
          // Set NoAdd flag on background layer
          writableLayersManager.layers[writableLayersManager.activelayer].flags =
            Utils2.SetFlag(
              writableLayersManager.layers[writableLayersManager.activelayer].flags,
              NvConstant.LayerFlags.NoAdd,
              true
            );
        }

        // Render all objects if this is a background image
        if (isBackground) {
          SvgUtil.RenderAllSVGObjects();
        }

        // Complete the operation
        DrawUtil.CompleteOperation(newObjectList);
      }
    };

    // Function to process the image after it's loaded
    const processLoadedImage = (url, blob, bytes, messageData) => {
      try {
        // Store image data
        imageSourceUrl = url;
        imageBlob = blob;
        imageBlobBytes = bytes;

        let svgDimensions;
        let isSvgImage = false;
        let targetObjectId;

        let excludedObjectTypes;
        let excludedObjectSubtypes;
        let canReplaceImage;

        // Check if image is SVG
        const imageDir = messageData ?
          messageData.Data.ImageDir :
          DSUtil.GetImageDir(blob);

        if (imageDir === StyleConstant.ImageDir.Svg) {
          isSvgImage = true;
          svgDimensions = Utils2.ParseSVGDimensions(bytes);
        }

        // Handle message data
        if (messageData) {
          targetObjectId = messageData.Data.BlockID;
        } else {
          // Get selected object ID
          targetObjectId = SelectUtil.GetTargetSelect();
          canReplaceImage = false;

          // Force new object creation if isBackground is true
          if (isBackground) {
            targetObjectId = -1;
          }

          // Check if selected object can have its image replaced
          if (targetObjectId >= 0) {
            selectedObject = DataUtil.GetObjectPtr(targetObjectId, false);

            // Check if object is of compatible type
            if (excludedObjectTypes?.indexOf(selectedObject.objecttype) < 0 &&
              excludedObjectSubtypes?.indexOf(selectedObject.subtype) < 0) {

              // Only shapes that aren't symbols and don't have existing symbls can have images replaced
              if (selectedObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape &&
                !(selectedObject instanceof Instance.Shape.BaseSymbol) &&
                !selectedObject.SymbolURL) {

                canReplaceImage = targetReplaceExisting;
              }
            } else {
              // Reset to create new image shape
              targetObjectId = -1;
              canReplaceImage = false;
            }
          }
        }

        // Process based on target object and replace flag
        if (canReplaceImage || messageData) {
          selectedObject = DataUtil.GetObjectPtr(targetObjectId, false);

          // Handle table objects differently
          if (selectedObject.GetTable(false)) {

          } else {

            // Get writable copy of the object
            selectedObject = DataUtil.GetObjectPtr(targetObjectId, true);

            // Set SVG dimensions if needed
            if (isSvgImage) {
              selectedObject.SVGDim = svgDimensions;
            }

            // Delete existing text in the object
            TextUtil.DeleteTargetTextObject(targetObjectId);

            // Clean up existing blob URL if needed
            if (OptCMUtil.IsBlobURL && OptCMUtil.IsBlobURL(selectedObject.ImageURL)) {
              OptCMUtil.DeleteURL(selectedObject.ImageURL);
              selectedObject.ImageURL = "";
            }

            // Set new image URL
            selectedObject.ImageURL = url;

            // Store the blob bytes with proper image directory
            const imageDir = DSUtil.GetImageDir(imageBlob);
            selectedObject.StyleRecord.Fill.Paint.Opacity = 1;
            selectedObject.SetBlobBytes(bytes, imageDir);

            // Update image header and text flags
            selectedObject.ImageHeader = new ImageRecord();
            selectedObject.TextFlags = Utils2.SetFlag(
              selectedObject.TextFlags,
              NvConstant.TextFlags.None,
              true
            );

            // Mark object as dirty for rendering
            DataUtil.AddToDirtyList(targetObjectId);

            // Complete the operation
            DrawUtil.CompleteOperation(null);
          }
        } else {
          // Create new image shape
          if (isSvgImage) {
            createImageShape(svgDimensions.width, svgDimensions.height, null);
          } else {
            // Calculate size for bitmap images
            Style.CalcImageSize(url, createImageShape);
          }
        }
      } catch (error) {
        throw error
        this.ExceptionCleanup(error);
      }
    };

    let excludedObjectTypes;
    let excludedObjectSubtypes;

    // Main processing logic starts here
    if (importData) {

    } else {
      // Handle direct image import
      let targetObjectId = SelectUtil.GetTargetSelect();

      // Check if we should replace an image in the selected object
      if (replaceExisting === 0) {
        shouldReplaceExistingImage = false;
        targetReplaceExisting = true;

        if (targetObjectId >= 0) {
          selectedObject = DataUtil.GetObjectPtr(targetObjectId, false);

          // Check if object can receive an image
          if (excludedObjectTypes?.indexOf(selectedObject.objecttype) < 0 &&
            excludedObjectSubtypes?.indexOf(selectedObject.subtype) < 0) {

            // Check if object is a valid shape for image replacement
            if (selectedObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape &&
              !(selectedObject instanceof Instance.Shape.BaseSymbol) &&
              !selectedObject.SymbolURL &&
              selectedObject.ImageURL !== "" &&
              selectedObject.GetTable(false) == null) {

              return;
            }
          } else {
            targetObjectId = -1;
          }
        }
      }

      // Calculate target dimensions based on selected object
      if (targetObjectId >= 0) {
        selectedObject = DataUtil.GetObjectPtr(targetObjectId, false);

        if (selectedObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape &&
          !(selectedObject instanceof Instance.Shape.BaseSymbol) &&
          !selectedObject.SymbolURL) {

          shouldReplaceExistingImage = targetReplaceExisting;
        }

        // Get dimensions from object or table
        if (shouldReplaceExistingImage) {
          selectedObject = DataUtil.GetObjectPtr(targetObjectId, false);

          targetWidth = selectedObject.Frame.width;
          targetHeight = selectedObject.Frame.height;
        }
      }

      // Create bitmap importer and load the image
      const bitmapImporter = new Instance.Shape.BitmapImporter();
      if (bitmapImporter) {
        bitmapImporter.ImportBitmap(
          imageUrl,
          targetWidth,
          targetHeight,
          this.bitmapImportDPI,
          processLoadedImage
        );
      }
    }

    T3Util.Log("O.Opt SetBackgroundImage - Output: Background image set");
  }

  /**
   * Calculates the upper-left coordinates to center an object in the work area
   * This function finds the position where an object with the given dimensions
   * would be centered in the current view of the work area.
   *
   * The function:
   * 1. Calculates the center point of the current view
   * 2. Adjusts for the object dimensions to find upper-left position
   * 3. Converts window coordinates to document coordinates
   * 4. Ensures minimum position of 10,10 to avoid edge placement
   *
   * @param width - The width of the object to center
   * @param height - The height of the object to center
   * @returns Object with x,y coordinates in document space for upper-left position
   */
  CalcWorkAreaCenterUL(width, height) {
    const svgDoc = this.svgDoc;

    // Calculate the center point in window coordinates
    const windowCenterX =
      svgDoc.docInfo.dispX +
      svgDoc.docInfo.dispWidth / 2 -
      (width / 2) * svgDoc.docInfo.docToScreenScale;

    const windowCenterY =
      svgDoc.docInfo.dispY +
      svgDoc.docInfo.dispHeight / 2 -
      (height / 2) * svgDoc.docInfo.docToScreenScale;

    // Convert window coordinates to document coordinates
    const docCoords = svgDoc.ConvertWindowToDocCoords(windowCenterX, windowCenterY);

    // Ensure minimum positioning of 10,10
    if (docCoords.x < 10) {
      docCoords.x = 10;
    }

    if (docCoords.y < 10) {
      docCoords.y = 10;
    }

    return docCoords;
  }

  /**
   * Toggles the lock state of selected objects in the document.
   * Locked objects cannot be modified until they are unlocked.
   * If no objectId is provided, it uses the currently selected objects.
   *
   * @param objectId - ID of the object to toggle lock state
   * @param forceToggle - If true, forces the operation even if no objects are selected
   * @returns void
   */
  Lock(objectId, forceToggle?) {
    // Get the list of selected objects
    const selectedObjects = T3Gv.stdObj.GetObject(this.theSelectedListBlockID).Data;
    const objectCount = selectedObjects.length;

    // Proceed only if there are selected objects or if forceToggle is true
    if (objectCount !== 0 || forceToggle) {
      let currentObject;
      let objectIndex = 0;
      let shouldLock = true;
      const lockFlag = NvConstant.ObjFlags.Lock;

      // Determine whether to lock or unlock by checking the specified object
      if ((currentObject = DataUtil.GetObjectPtr(objectId, false))) {
        shouldLock = (currentObject.flags & lockFlag) === 0;
      }

      // Begin secondary edit if collaborating
      if (false/*Collab.AllowMessage()*/) {
        /*Collab.BeginSecondaryEdit()*/;
      }

      // Apply lock/unlock to all selected objects
      for (objectIndex = 0; objectIndex < objectCount; ++objectIndex) {
        currentObject = DataUtil.GetObjectPtr(selectedObjects[objectIndex], true);
        currentObject.flags = Utils2.SetFlag(currentObject.flags, lockFlag, shouldLock);
        DataUtil.AddToDirtyList(selectedObjects[objectIndex]);
      }

      // Send collaboration message if collaborating
      if (false/*Collab.AllowMessage()*/) {
        const messageData = {
          BlockID: objectId
        };
        /*Collab.BuildMessage(NvConstant.CollabMessages.Lock, messageData, true)*/
      }

      // Complete the operation
      DrawUtil.CompleteOperation(null);
    } else {
      // Show error if no objects are selected and forceToggle is false
      T3Util.Log("O.Opt Lock - Error: No objects selected");
    }
  }

  /**
   * Imports an SVG symbol into the document as a new shape
   * This function handles loading an SVG file, creating a rectangular shape to contain it,
   * and positioning it in the document workspace.
   *
   * The process involves:
   * 1. Creating an SVG importer to load the file
   * 2. Calculating appropriate dimensions for the SVG
   * 3. Creating a rectangle with transparent fill
   * 4. Placing the SVG content in the rectangle
   * 5. Adding the new shape to the document
   *
   * @param svgSource - The source of the SVG (file path, URL, or raw SVG content)
   * @returns void
   */
  ImportSVGSymbol(svgSource) {
    // Initialize variables to store SVG data
    let imageUrl = "";
    let imageBlob = null;
    let imageBytes = null;
    // const self = this;

    /**
     * Callback function that creates a shape containing the SVG after dimensions are calculated
     * @param width - The width of the SVG
     * @param height - The height of the SVG
     * @param skipRendering - Whether to skip rendering the new object
     */
    const createSvgShape = (width, height, skipRendering) => {
      let newObjectId;
      const newObjectList = [];

      // Only proceed if dimensions are valid and rendering is not skipped
      if (!skipRendering && width > 0 && height > 0) {
        // Calculate dimensions maintaining aspect ratio
        let finalWidth = 200;
        let finalHeight = 200;

        if (width < height) {
          finalHeight *= width / height;
        } else {
          finalWidth *= height / width;
        }

        // Calculate position to center the SVG in work area
        const centerPosition = this.CalcWorkAreaCenterUL(finalHeight, finalWidth);

        // Create a transparent style for the SVG container
        const transparentStyle = new QuickStyle();
        transparentStyle.Name = "";
        transparentStyle.Line.Thickness = 0;
        transparentStyle.Fill.Paint.FillType = NvConstant.FillTypes.Transparent;

        // Create data for the new rectangle object
        const rectangleData = {
          Frame: {
            x: centerPosition.x,
            y: centerPosition.y,
            width: finalWidth,
            height: finalHeight
          },
          TextGrow: NvConstant.TextGrowBehavior.ProPortional,
          ImageURL: imageUrl,
          StyleRecord: transparentStyle,
          ObjGrow: OptConstant.GrowBehavior.ProPortional,
          flags: NvConstant.ObjFlags.ImageOnly,
          extraflags: OptConstant.ExtraFlags.NoColor
        };

        // Create the rectangle object
        const rectangleObject = new Instance.Shape.Rect(rectangleData);

        // Add the new object to the document
        newObjectId = DrawUtil.AddNewObject(rectangleObject, false, true);

        // Set the SVG blob data in the object
        const newObject = DataUtil.GetObjectPtr(newObjectId, false);
        if (newObject) {
          const imageDir = DSUtil.GetImageDir(imageBlob);
          newObject.SetBlobBytes(imageBytes, imageDir);
        }

        // Add to list of created objects
        newObjectList.push(newObjectId);

        // Complete the operation
        DrawUtil.CompleteOperation(newObjectList);
      }
    };

    // Create an SVG importer and load the SVG
    const svgImporter = new Instance.Shape.SVGImporter();
    if (svgImporter) {
      svgImporter.ImportSVG(svgSource, (url, blob, bytes) => {
        // Store SVG data
        imageUrl = url;
        imageBlob = blob;
        imageBytes = bytes;

        // Calculate dimensions and create the shape
        this.CalcSVGSymbolDimensions(blob, url, createSvgShape);
      });
    }
  }

  /**
   * Calculates the dimensions of an SVG symbol from a blob
   * This function extracts width and height information from an SVG file by:
   * 1. Reading the blob contents as text
   * 2. Parsing the SVG XML
   * 3. Checking for width/height attributes
   * 4. Falling back to viewBox attribute if direct dimensions aren't specified
   *
   * @param svgBlob - The SVG file as a Blob object
   * @param svgUrl - The URL or path of the SVG (used for reference)
   * @param callback - Function to call with the extracted dimensions (width, height, error)
   */
  CalcSVGSymbolDimensions(svgBlob, svgUrl, callback) {
    if (svgBlob) {
      // Create a FileReader to read the blob contents
      const fileReader = new FileReader();

      // Store callback reference for use in the onload handler
      fileReader.UserData = {
        callback: callback
      };

      // Handle the file load event
      fileReader.onload = function (event) {
        const svgText = this.result;
        let svgDocument = null;

        // Parse the SVG text into an XML document
        if (window.DOMParser) {
          // Modern browsers
          svgDocument = (new DOMParser()).parseFromString(svgText, "text/xml");
        } else {
          // IE fallback (legacy support)
          svgDocument = new ActiveXObject("Microsoft.XMLDOM");
          svgDocument.async = false;
          svgDocument.loadXML(svgText);
        }

        // Try to get width and height directly from attributes
        let width = svgDocument.documentElement.getAttribute("width");
        if (width) {
          width = width.match(/\d*\.*\d*/)[0]; // Extract numeric part
        }

        let height = svgDocument.documentElement.getAttribute("height");
        if (height) {
          height = height.match(/\d*\.*\d*/)[0]; // Extract numeric part
        }

        // If direct dimensions are available, use them
        if (width && height) {
          this.UserData.callback(width, height, null);
        } else {
          // Try to extract dimensions from viewBox attribute
          const viewBox = svgDocument.documentElement.getAttribute("viewBox");

          if (viewBox) {
            const viewBoxParts = viewBox.split(" ");

            width = parseFloat(viewBoxParts[2]);
            width = width.match(/\d*\.*\d*/)[0]; // Extract numeric part

            height = parseFloat(viewBoxParts[3]);
            height = height.match(/\d*\.*\d*/)[0]; // Extract numeric part

            if (width && height) {
              this.UserData.callback(width, height, null);
            } else {
              this.UserData.callback(0, 0, {
                error: "No width/height and viewbox bad"
              });
            }
          } else {
            // No dimensions could be found
            this.UserData.callback(0, 0, {
              error: "No viewbox or width/height"
            });
          }
        }
      };

      // Start reading the blob as text
      fileReader.readAsText(svgBlob);
    } else {
      // Handle case where no blob is provided
      if (callback) {
        callback(0, 0, {
          error: "No blob passed in"
        });
      }
    }
  }

  /**
   * Converts a shape object to a polyline representation
   * This function transforms a standard shape object into either a PolyLine or PolyLineContainer,
   * preserving its dimensions, rotation, and other properties. It handles both creating a new
   * polyline from a shape and processing existing polylines.
   *
   * @param objectId - ID of the shape object to convert
   * @param createContainer - If true, creates a PolyLineContainer; otherwise, creates a PolyLine
   * @param skipSelection - If true, skips adding to selection and rendering changes
   * @param existingObject - Optional existing object to use instead of fetching by ID
   * @returns The created polyline object
   */
  ShapeToPolyLine(objectId, createContainer, skipSelection, existingObject) {
    let polyLineObject;
    let shapeObject;
    let segmentCount;
    let hasPolyList;
    let selectionList = [];
    let originalFrame = {};

    // Use provided object or get by ID
    if (existingObject) {
      shapeObject = existingObject;
      hasPolyList = true;
      originalFrame = $.extend(true, {}, shapeObject.Frame);
    } else {
      shapeObject = this.GetObjectPtr(objectId, false);

      // Initialize polylist if needed
      if (shapeObject.polylist == null) {
        shapeObject.polylist = shapeObject.GetPolyList();
        shapeObject.StartPoint = {};
        shapeObject.EndPoint = {};
      } else {
        hasPolyList = true;
      }

      // Preserve the block for modification
      const objectBlock = T3Gv.stdObj.PreserveBlock(objectId);
      if (objectBlock == null) return;

      shapeObject = objectBlock.Data;
      originalFrame = $.extend(true, {}, shapeObject.Frame);
    }

    // Handle existing polylist
    if (hasPolyList) {
      if (!shapeObject.polylist) return null;

      // Check if dimensions need scaling
      T3Gv.opt.GetClosedPolyDim(shapeObject);
      if (!Utils2.IsEqual(shapeObject.polylist.dim.x, originalFrame.width)) {
        const tempObject = Utils1.DeepCopy(shapeObject);
        tempObject.inside = $.extend(true, {}, shapeObject.Frame);

        // Scale the object
        Instance.Shape.PolyLine.prototype.ScaleObject.call(
          tempObject, 0, 0, 0, 0, 0, 0
        );

        shapeObject.polylist = tempObject.polylist;
      }
    }

    // Set start and end points based on polylist
    segmentCount = shapeObject.polylist.segs.length;
    shapeObject.StartPoint.x =
      shapeObject.Frame.x + shapeObject.polylist.segs[0].pt.x + shapeObject.polylist.offset.x;
    shapeObject.StartPoint.y =
      shapeObject.Frame.y + shapeObject.polylist.segs[0].pt.y + shapeObject.polylist.offset.y;
    shapeObject.EndPoint.x =
      shapeObject.Frame.x + shapeObject.polylist.segs[segmentCount - 1].pt.x + shapeObject.polylist.offset.x;
    shapeObject.EndPoint.y =
      shapeObject.Frame.y + shapeObject.polylist.segs[segmentCount - 1].pt.y + shapeObject.polylist.offset.y;

    // Create the appropriate polyline type
    polyLineObject = createContainer
      ? new Instance.Shape.PolyLineContainer(shapeObject)
      : new Instance.Shape.PolyLine(shapeObject);

    // Set properties from the original shape
    polyLineObject.BlockID = shapeObject.BlockID;
    polyLineObject.polylist.Shape_Rotation = shapeObject.RotationAngle;
    polyLineObject.polylist.Shape_DataID = shapeObject.DataID;
    polyLineObject.RotationAngle = 0;
    polyLineObject.DataID = -1;

    // Update the block data if not using existing object
    if (!existingObject) {
      objectBlock.Data = polyLineObject;
    }

    // Handle rendering and selection unless skipping
    if (!skipSelection) {
      this.AddToDirtyList(objectId);
      this.RenderDirtySVGObjects();
      selectionList.push(objectId);
      this.SelectObjects(selectionList, false, true);
    }

    // Set inside property before returning
    polyLineObject.inside = $.extend(true, {}, shapeObject.Frame);

    return polyLineObject;
  }

  /**
   * Calculates dimensions for a closed polyline shape
   * This function computes the width and height of a closed polyline
   * by examining its points and calculating a bounding rectangle.
   * The results are stored in the shape's polylist.dim property.
   *
   * @param shapeObject - The shape object containing a polylist to dimension
   */
  GetClosedPolyDim(shapeObject) {
    let polyPoints;
    let boundingRect = {};

    if (shapeObject.polylist) {
      // Create a deep copy of the shape to work with
      const tempShape = Utils1.DeepCopy(shapeObject);
      const polyLine = new Instance.Shape.PolyLine(tempShape);

      // Initialize dimensions
      polyLine.inside = $.extend(true, {}, shapeObject.Frame);
      polyLine.polylist.dim.x = 0;
      polyLine.polylist.dim.y = 0;

      // Get polygon points and calculate bounds
      polyPoints = polyLine.GetPolyPoints(
        OptConstant.Common.MaxPolyPoints,
        false,
        false,
        false,
        null
      );

      if (polyPoints && polyPoints.length) {
        // Calculate bounding rectangle from points
        Utils2.GetPolyRect(boundingRect, polyPoints);

        // Ensure minimum dimensions
        if (boundingRect.width < 1) boundingRect.width = 1;
        if (boundingRect.height < 1) boundingRect.height = 1;

        // Update dimensions for closed polylines
        if (shapeObject.polylist.closed) {
          shapeObject.polylist.dim.x = boundingRect.width;
          shapeObject.polylist.dim.y = boundingRect.height;
        }
      }
    }
  }
}

export default OptUtil
