
import State from "./State"

class BaseStateManager {

  public CurrentStateID: number;
  public HistoryState: number;
  public DroppedStates: number;
  public States: State[];

  constructor() {
    this.CurrentStateID = -1;
    this.HistoryState = 0;
    this.DroppedStates = 0;
    this.States = [];
  }

  PreserveState() { }

  SyncObjectsWithCreateStates() { }

  GetUndoState() {
    // return false;
  }

  ExceptionCleanup() { }

  RestorePrevState() { }

  RestoreNextState() { }

  RestoreObjectStoreFromState() { }

  GetCurrentState() {
    return null;
  }

  AddToCurrentState(e: any) { }

  CurrentStateReplace(e: any, t: any) { }

  CurrentStateDelete(e: any) { }

  ReplaceInCurrentState(e: any, t: any) { }

  ResetUndoStates() {
    this.CurrentStateID = -1;
    this.DroppedStates = 0;
    this.HistoryState = 0;
    this.States = [];
  }

  ResetToSpecificState(e: any) { }

  ClearFutureUndoStates() { }

  DumpStates(e: any) { }
}

export default BaseStateManager
