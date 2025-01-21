



class SelectAttributes {

  //#region  Properties

  public tselect: number;
  public nselect: number;
  public nlineselected: number;
  public nshapeselected: number;
  public nconnectorselected: number;
  public ngroupsselected: number;
  public nimageselected: number;
  public IsTargetTable: boolean;
  public paste: number;
  public undo: boolean;
  public redo: boolean;
  public allowalign: any;
  public width: number;
  public height: number;
  public left: number;
  public top: number;
  public widthstr: string;
  public heightstr: string;
  public leftstr: string;
  public topstr: string;
  public fontid: number;
  public fontsize: number;
  public bold: boolean;
  public italic: boolean;
  public underline: boolean;
  public superscript: boolean;
  public subscript: boolean;
  public TextDirection: boolean;
  public ncells_selected: number;
  public NTableRows: number;
  public NTableCols: number;
  public cell_notext: boolean;
  public celltype: number;
  public cellselected: boolean;
  public cellflags: number;
  public ntablesselected: number;
  public bInNoteEdit: boolean;
  public allowcopy: boolean;
  public selectionhastext: boolean;
  public subtype: number;
  public objecttype: number;
  public datasetElemID: number;
  public projectTableSelected: boolean;
  public lockedTableSelected: boolean;
  public fixedCornerRadius: number;
  public lineCornerRadius: number;
  public colorfilter: number;
  public SelectionBusinessManager: any;
  public WallThickness: number;

  //#endregion

  constructor() {

    //#region Initialize Properties

    this.tselect = - 1;
    this.nselect = 0;
    this.nlineselected = 0;
    this.nshapeselected = 0;
    this.nconnectorselected = 0;
    this.ngroupsselected = 0;
    this.nimageselected = 0;
    this.IsTargetTable = !1;
    this.paste = 0;
    this.undo = !1;
    this.redo = !1;
    this.allowalign;
    this.width = 0;
    this.height = 0;
    this.left = 0;
    this.top = 0;
    this.widthstr = '';
    this.heightstr = '';
    this.leftstr = '';
    this.topstr = '';
    this.fontid = 0;
    this.fontsize = 12;
    this.bold = !1;
    this.italic = !1;
    this.underline = !1;
    this.superscript = !1;
    this.subscript = !1;
    this.TextDirection = !0;
    this.ncells_selected = 0;
    this.NTableRows = 4;
    this.NTableCols = 3;
    this.cell_notext = !1;
    this.celltype = 0;
    this.cellselected = !1;
    this.cellflags = 0;
    this.ntablesselected = 0;
    this.bInNoteEdit = !1;
    this.allowcopy = !1;
    this.selectionhastext = !1;
    this.subtype = 0;
    this.objecttype = 0;
    this.datasetElemID = - 1;
    this.projectTableSelected = !1;
    this.lockedTableSelected = !1;
    this.fixedCornerRadius = 0;
    this.lineCornerRadius = 0;
    this.colorfilter = 0;
    this.SelectionBusinessManager = null;
    this.WallThickness = 0;

    //#endregion
  }
}

export default SelectAttributes
