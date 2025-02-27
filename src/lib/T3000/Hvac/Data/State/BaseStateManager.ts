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

  GetUndoState() { }

  ExceptionCleanup() { }

  RestorePrevState() { }

  RestoreNextState() { }

  RestoreObjectStoreFromState() { }

  GetCurrentState() { return null; }

  AddToCurrentState(input: any) { }

  CurrentStateReplace(state: any, isReplace: any) { }

  CurrentStateDelete(state: any) { }

  ReplaceInCurrentState(state: any, isReplace: any) { }

  ResetUndoStates() {
    this.CurrentStateID = -1;
    this.DroppedStates = 0;
    this.HistoryState = 0;
    this.States = [];
  }

  ResetToSpecificState(input: any) { }

  ClearFutureUndoStates() { }

  DumpStates(input: any) { }
}

export default BaseStateManager
