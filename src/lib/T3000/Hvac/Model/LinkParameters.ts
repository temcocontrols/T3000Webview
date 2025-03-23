

import NvConstant from "../Data/Constant/NvConstant"

/**
 * Represents the linking parameters used in HVAC model configurations.
 *
 * This class encapsulates various properties required for managing connection
 * states, historical indices, join configurations, and auto-insertion details within
 * an HVAC control system. It is primarily responsible for maintaining the state of
 * connections between system components including connection hooks, join data, and
 * auto-healing properties.
 *
 * @remarks
 * The properties include:
 * - Connection indices and points, which track current and historical states.
 * - Hook flags and indices for managing connections that involve linking components.
 * - Join data values and source join data for joining configurations.
 * - Arrays for storing lists of connection points and auto-generated segments.
 * - Boolean flags for features such as auto insertion, drop-on-line functionality, and auto healing.
 *
 * This class is designed to work seamlessly as part of an HVAC control module where
 * precise management of linked components is critical.
 *
 * @example
 * Here is an example of how to initialize and utilize an instance of LinkParameters:
 *
 * ```typescript
 * // Create a new instance of LinkParameters
 * const linkParams = new LinkParameters();
 *
 * // Configure the connection index and point
 * linkParams.ConnectIndex = 5;
 * linkParams.ConnectPt = { x: 100, y: 200 };
 *
 * // Set auto insertion and auto-heal properties
 * linkParams.AutoInsert = true;
 * linkParams.AutoHeal = true;
 * linkParams.AutoHealID = 10;
 *
 * // Use the instance within your HVAC control logic
 * if (linkParams.AutoInsert) {
 *   // Perform auto insertion logic here
 * }
 *
 * // Further usage of linkParams for managing joining and connection hooks...
 * ```
 */
class LinkParameters {

  //#region Properties

  public ConnectIndex: number;
  public ConnectPt: { x: number, y: number };
  public ConnectInside: any;
  public ConnectHookFlag: number;
  public HookIndex: number;
  public InitialHook: number;
  public PrevConnect: number;
  public ConnectIndexHistory: number[];
  public SConnectIndex: number;
  public SConnectInside: any;
  public SConnectHookFlag: number;
  public SConnectPt: { x: number, y: number };
  public HiliteConnect: number;
  public HiliteInside: any;
  public HiliteHookFlag: number;
  public SHiliteConnect: number;
  public SHiliteInside: any;
  public SHiliteHookFlag: number;
  public JoinIndex: number;
  public JoinData: number;
  public JoinSourceData: number;
  public SJoinIndex: number;
  public SJoinData: number;
  public SJoinSourceData: number;
  public HiliteJoin: number;
  public SHiliteJoin: number;
  public ArraysOnly: boolean;
  public lpCircList: any[];
  public DropOnLine: boolean;
  public AutoInsert: boolean;
  public AutoPoints: any[];
  public AutoSeg: number;
  public AutoSinglePoint: number;
  public AutoHeal: boolean;
  public AutoHealID: number;
  public cpt: any[];
  public ContainerPt: any[];
  public AllowJoin: number;
  public savedEditState: number;

  //#endregion

  constructor() {

    //#region Initialize Properties

    this.ConnectIndex = - 1;
    this.ConnectPt = { x: 0, y: 0 };
    this.ConnectInside = null;
    this.ConnectHookFlag = 0;
    this.HookIndex = - 1;
    this.InitialHook = - 1;
    this.PrevConnect = - 1;
    this.ConnectIndexHistory = [];
    this.SConnectIndex = - 1;
    this.SConnectInside = null;
    this.SConnectHookFlag = 0;
    this.SConnectPt = { x: 0, y: 0 };
    this.HiliteConnect = - 1;
    this.HiliteInside = null;
    this.HiliteHookFlag = 0;
    this.SHiliteConnect = - 1;
    this.SHiliteInside = null;
    this.SHiliteHookFlag = 0;
    this.JoinIndex = - 1;
    this.JoinData = 0;
    this.JoinSourceData = 0;
    this.SJoinIndex = - 1;
    this.SJoinData = 0;
    this.SJoinSourceData = 0;
    this.HiliteJoin = - 1;
    this.SHiliteJoin = - 1;
    this.ArraysOnly = !1;
    this.lpCircList = [];
    this.DropOnLine = !1;
    this.AutoInsert = !1;
    this.AutoPoints = [];
    this.AutoSeg = 0;
    this.AutoSinglePoint = 0;
    this.AutoHeal = !1;
    this.AutoHealID = - 1;
    this.cpt = [];
    this.ContainerPt = [];
    this.AllowJoin = 0;
    this.savedEditState = NvConstant.EditState.Default;

    //#endregion
  }
}

export default LinkParameters
