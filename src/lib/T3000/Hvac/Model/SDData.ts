

import { Type } from 'class-transformer'
import 'reflect-metadata'
import RulerConfig from "./RulerConfig"
import PageSetting from "./PageSetting"
import NvConstant from "../Data/Constant/NvConstant"
// import RecentSymbol from "./RecentSymbol"
import FillData from "./FillData"
import SDDefault from './SDDefault'
import SDGraphDefault from './SDGraphDefault'
import StateConstant from '../Data/State/StateConstant'
import OptConstant from '../Data/Constant/OptConstant'

/**
 * Represents a session configuration for HVAC controls.
 *
 * @remarks
 * The SDData class encapsulates state settings and configurations for a session, including display dimensions,
 * default settings, graph configurations, background properties, and various flags and parameters to control
 * the behavior of HVAC control interfaces.
 *
 * The class is initialized with default values using constants and instances of helper classes such as SDDefault,
 * SDGraphDefault, FillData, RulerConfig, and PageSetting. These defaults ensure a consistent starting state for new
 * sessions.
 *
 * @example
 * // Create a new session instance and adjust some settings.
 * const session = new SDData();
 *
 * // Update display dimensions.
 * session.dim = { x: 1280, y: 720 };
 *
 * // Disable spell checking.
 * session.EnableSpellCheck = false;
 *
 * // Log the session type to the console.
 * console.log("Session type:", session.Type);
 *
 * @property {any} Type - The type identifier of the session, generally defined by state constants.
 * @property {{ x: number, y: number }} dim - The dimensions of the session's display area.
 * @property {number} flags - A set of flags combining options such as link mode, free-hand drawing, and tree overlap.
 * @property {number} tselect - The selected tool or mode identifier (-1 indicates no selection).
 * @property {{ x: number, y: number }} dupdisp - Offset values for duplicate display.
 *
 * @property {SDDefault} def - Default session settings.
 * @property {SDGraphDefault} graphDef - Default graph component settings for the session.
 *
 * @property {number} RefCon - A reference constant used for general state referencing.
 * @property {number} d_sarrow - The identifier for the starting arrow configuration.
 * @property {boolean} d_sarrowdisp - Flag indicating whether the starting arrow is displayed.
 * @property {number} d_earrow - The identifier for the ending arrow configuration.
 * @property {boolean} d_earrowdisp - Flag indicating whether the ending arrow is displayed.
 * @property {number} d_arrowsize - The size of the arrows used in the session.
 *
 * @property {boolean} centersnapalign - Determines if snap alignment should be centered.
 * @property {number} hopdimindex - Index used to select hop dimensions.
 * @property {{ x: any, y: any }} hopdim - Hop dimensions based on predefined constant values.
 * @property {any} hopstyle - The style applied to hops within the session.
 * @property {any} dimensions - Flags defining the various dimension types used in the session.
 * @property {number} shapedimensions - Custom shape dimensions.
 *
 * @property {FillData} background - Background fill configuration.
 * @property {number} bkdir - Background direction value.
 * @property {number} bkid - Identifier for the current background.
 * @property {{ left: number, top: number, right: number, bottom: number }} bkcroprect - The crop rectangle used for the background.
 * @property {number} bkflags - Flags associated with background rendering settings.
 *
 * @property {number} addCount - A counter for additional operations or additions.
 * @property {number} sequencemask - A mask used to represent a sequence of operations.
 * @property {number} sequencestep - The current step in a sequence (-1 indicates no active sequence).
 * @property {number} nsequencesteps - The total number of steps in the sequence.
 * @property {number} sequenceflags - Flags that provide additional configuration for sequence behavior.
 * @property {any} libSelectedRestore - A helper property to restore library selection states.
 * @property {number} chartdirection - The direction in which charts are rendered.
 * @property {number} copyPasteTrialVers - Version number for copy-paste trial operations.
 * @property {number} taskmanagementflags - Flags used for managing tasks within the session.
 * @property {number} taskdays - The number of days allocated for tasks (default is 7).
 * @property {boolean} forcedotted - Whether or not dotted lines are enforced in drawings.
 * @property {number} moreflags - Additional flags for extended session configurations.
 * @property {number} fieldmask - A mask used for filtering or highlighting fields.
 * @property {string} CurrentTheme - The identifier for the currently applied theme.
 * @property {boolean} EnableSpellCheck - Flag indicating whether spell check is enabled.
 *
 * @property {RulerConfig} rulerConfig - Configuration settings for on-screen rulers.
 * @property {PageSetting} Page - Represents the page setting associated with the session.
 *
 * @property {number} CommentListID - Identifier for the comment list associated with the session.
 * @property {number} CommentID - Identifier for a specific comment within the session.
 */

class SDData {

  //#region Properties

  public Type: any;
  public dim: { x: number, y: number };
  public flags: number;
  public tselect: number;
  public dupdisp: { x: number, y: number };

  @Type(() => SDDefault)
  public def: SDDefault;

  @Type(() => SDGraphDefault)
  public graphDef: SDGraphDefault;

  public RefCon: number;
  public d_sarrow: number;
  public d_sarrowdisp: boolean;
  public d_earrow: number;
  public d_earrowdisp: boolean;
  public d_arrowsize: number;
  public centersnapalign: boolean;
  public hopdimindex: number;
  public hopdim: { x: any, y: any };
  public hopstyle: any;
  public dimensions: any;
  public shapedimensions: number;

  @Type(() => FillData)
  public background: FillData;

  public bkdir: number;
  public bkid: number;
  public bkcroprect: { left: number, top: number, right: number, bottom: number };
  public bkflags: number;
  public addCount: number;
  public sequencemask: number;
  public sequencestep: number;
  public nsequencesteps: number;
  public sequenceflags: number;
  public libSelectedRestore: any;
  public chartdirection: number;
  public copyPasteTrialVers: number;
  public taskmanagementflags: number;
  public taskdays: number;
  public forcedotted: boolean;
  public moreflags: number;
  public fieldmask: number;
  public CurrentTheme: string;
  public EnableSpellCheck: boolean;

  @Type(() => RulerConfig)
  public rulerConfig: RulerConfig;

  @Type(() => PageSetting)
  public Page: PageSetting;

  // @Type(() => RecentSymbol)
  // public RecentSymbols: RecentSymbol[];

  public CommentListID: number;
  public CommentID: number;

  //#endregion

  constructor() {

    //#region Initialize Properties

    // Get current screen dimensions

    const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const screenHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

    // Set the default dim to screen width and height
    // this.dim = { x: 1000, y: 750 };
    this.dim = { x: screenWidth, y: screenHeight };

    this.Type = StateConstant.StoredObjectType.SDDataObject;
    this.flags = OptConstant.SessionFlags.LLink | OptConstant.SessionFlags.FreeHand | OptConstant.SessionFlags.NoTreeOverlap;
    this.tselect = -1;
    this.dupdisp = { x: 0, y: 0 };
    this.def = new SDDefault();
    this.graphDef = new SDGraphDefault();
    this.RefCon = 0;
    this.d_sarrow = 0;
    this.d_sarrowdisp = false;
    this.d_earrow = 0;
    this.d_earrowdisp = false;
    this.d_arrowsize = 1;
    this.centersnapalign = true;
    this.hopdimindex = 1;
    this.hopdim = { x: NvConstant.HopDimX[1], y: NvConstant.HopDimY[1] };
    this.hopstyle = NvConstant.HopStyle.Arc;

    // Double change it to Select: 8 | Always: 16
    this.dimensions = NvConstant.DimensionFlags.Total;
    this.shapedimensions = 0;
    this.background = new FillData();
    this.background.Paint.FillType = NvConstant.FillTypes.Transparent;
    this.bkdir = 0;
    this.bkid = -1;
    this.bkcroprect = { left: 0, top: 0, right: 0, bottom: 0 };
    this.bkflags = 0;
    this.addCount = 0;
    this.sequencemask = 0;
    this.sequencestep = -1;
    this.nsequencesteps = 0;
    this.sequenceflags = 0;
    this.libSelectedRestore = undefined;
    this.chartdirection = 0;
    this.copyPasteTrialVers = 0;
    this.taskmanagementflags = 0;
    this.taskdays = 7;
    this.forcedotted = false;
    this.moreflags = 0;
    this.fieldmask = 0;
    this.CurrentTheme = '';
    this.EnableSpellCheck = true;
    this.rulerConfig = new RulerConfig();
    this.Page = new PageSetting();
    // this.RecentSymbols = [];
    this.CommentListID = -1;
    this.CommentID = -1;

    //#endregion
  }
}

export default SDData
