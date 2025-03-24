
import WinSetting from './WinSetting'

/**
 * Represents the result container for HVAC document processing operations.
 *
 * This class stores all the state, settings, and output data related to
 * processing and rendering HVAC diagrams and documents. It maintains references
 * to document components, styling information, object tracking, and various
 * processing flags.
 *
 * @class WResult
 * @example
 * ```ts
 * // Create a new result container
 * const result = new WResult();
 *
 * // Configure processing options
 * result.WriteBlocks = true;
 * result.selectonly = false;
 * result.docDpi = 300;
 *
 * // Set document offsets for grouped objects
 * result.GroupOffset = { x: 10, y: 20 };
 *
 * // Check for processing errors after operations
 * if (result.error !== 0) {
 *   console.error(`Processing failed with error code: ${result.error}`);
 * }
 * ```
 */
class WResult {

  //#region Properties

  public error: number;
  public coordScaleFactor: number;
  public sdp: any;
  public tLMB: any;
  public ctp: any;
  public WinSetting: any;
  public docDpi: number;
  public fontlist: any[];
  public lpStyles: any[];
  public UniqueMap: any[];
  public zList: any[];
  public links: any[];
  public textlinks: any[];
  public polyid: number;
  public nsegl: number;
  public arrayid: number;
  public GroupOffset: { x: number; y: number };
  public rulerConfig: any;
  public WriteBlocks: boolean;
  public noTables: boolean;
  public WriteGroupBlock: boolean;
  public selectonly: boolean;
  public nblocks: number;
  public BlockAction: number;
  public state: number;
  public delta: number;
  public TextureList: any[];
  public LibraryPathTarget: string;
  public richGradients: any[];
  public KeepSegDir: boolean;
  public WriteWin32: boolean;

  //#endregion

  constructor() {

    //#region Init Properties

    // Error and scaling
    this.error = 0;
    this.coordScaleFactor = 1;

    // Core document components
    this.sdp = null;                   // Session data pointer
    this.tLMB = null;                  // Layer manager block reference
    this.ctp = null;                   // Content header pointer
    this.WinSetting = new WinSetting();
    this.docDpi = 100;

    // Style and font information
    this.fontlist = [];                // List of fonts used in the document
    this.lpStyles = [];                // List of styles

    // Object tracking and mapping
    this.UniqueMap = [];               // Maps object IDs to unique identifiers
    this.zList = [];                   // List of objects in z-order
    this.links = [];                   // Object links/connections
    this.textlinks = [];               // Text links

    // Object counters
    this.polyid = 0;                   // Polygon ID counter
    this.nsegl = 0;                    // Segmented line counter
    this.arrayid = 0;                  // Array ID counter

    // Positioning and layout
    this.GroupOffset = {               // Offset for grouped objects
      x: 0,
      y: 0
    };
    this.rulerConfig = null;           // Ruler configuration

    // Processing flags
    this.WriteBlocks = false;          // Whether to write blocks
    this.noTables = false;             // Whether to skip tables
    this.WriteGroupBlock = false;      // Whether writing a group block
    this.selectonly = false;           // Whether only writing selected objects
    this.nblocks = 0;                  // Number of blocks
    this.BlockAction = 0;              // Block action type

    // State tracking
    this.state = 0;                    // Current state
    this.delta = 0;                    // Delta value for incremental operations

    // Additional resources
    this.TextureList = [];             // List of textures
    this.LibraryPathTarget = '';       // Target library path
    this.richGradients = [];           // Enhanced gradient definitions

    // Format flags
    this.KeepSegDir = false;           // Whether to preserve segment direction
    this.WriteWin32 = false;           // Whether to write in Win32 format

    //#endregion
  }
}

export default WResult
