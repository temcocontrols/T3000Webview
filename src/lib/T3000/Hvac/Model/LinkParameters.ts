

import ConstantData from "../Data/ConstantData"

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
    this.savedEditState = ConstantData.EditState.DEFAULT;

    //#endregion
  }
}

export default LinkParameters
