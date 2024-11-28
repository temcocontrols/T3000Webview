
class Edit {

  public parent: any;
  public isActive: boolean;
  public selStart: number;
  public selEnd: number;
  public selAnchor: number;
  public inActiveSel: any;
  public activeSelPos: number;
  public cursorPos: number;
  public cursorLine: any;
  public curHit: any;
  public lastClickTime: number;
  public inWordSelect: boolean;
  public anchorWord: any;
  public savedCursorState: any;
  public TableDrag: boolean;

  constructor(parent: any) {
    this.parent = parent;
    this.isActive = false;
    this.selStart = -1;
    this.selEnd = -1;
    this.selAnchor = -1;
    this.inActiveSel = undefined;
    this.activeSelPos = -1;
    this.cursorPos = -1;
    this.cursorLine = undefined;
    this.curHit = null;
    this.lastClickTime = 0;
    this.inWordSelect = false;
    this.anchorWord = null;
    this.savedCursorState = this.parent.cursorState;
    this.TableDrag = false;
  }

  IsActive = function () {
    return this.isActive
  }
}

export default Edit;
