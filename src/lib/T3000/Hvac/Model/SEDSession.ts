

import RulerSettings from "./RulerSettings"
import PageRecord from "./PageRecord"

class SEDSession {

  //#region  Properties

  public Type: any;
  public dim: { x: number, y: number };
  public flags: number;
  public tselect: number;
  public dupdisp: { x: number, y: number };
  public def: any;
  public graphDef: any;
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
  public background: any;
  public bkdir: number;
  public bkid: number;
  public bkcroprect: { left: number, top: number, right: number, bottom: number };
  public bkflags: number;
  public addcount: number;
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
  public rulerSettings: any;
  public Page: any;
  public RecentSymbols: any[];
  public CommentListID: number;
  public CommentID: number;

  //#endregion

  constructor() {

    //#region Initialize Properties

    this.Type = 'TSession';
    this.dim = { x: 1000, y: 750 };
    this.flags = 8 | 1024 | 2048;
    this.tselect = -1;
    this.dupdisp = { x: 0, y: 0 };
    this.RefCon = 0;
    this.d_sarrow = 0;
    this.d_sarrowdisp = false;
    this.d_earrow = 0;
    this.d_earrowdisp = false;
    this.d_arrowsize = 1;
    this.centersnapalign = true;
    this.hopdimindex = 1;
    this.hopdim = { x: 8, y: 8 };
    this.hopstyle = 1;
    this.dimensions = 4;
    this.shapedimensions = 0;
    this.background.Paint.FillType = 0;
    this.bkdir = 0;
    this.bkid = -1;
    this.bkcroprect = { left: 0, top: 0, right: 0, bottom: 0 };
    this.bkflags = 0;
    this.addcount = 0;
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
    this.rulerSettings = new RulerSettings();
    this.Page = new PageRecord();
    this.RecentSymbols = [];
    this.CommentListID = -1;
    this.CommentID = -1;

    //#endregion
  }
}

export default SEDSession
