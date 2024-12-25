
import BaseStateManager from './BaseStateManager'
import GPP from '../GlobalData'
import Globals from '../Globals'
import Utils1 from '../../Helper/Utils1'
import State from './State'
import $ from 'jquery'

class StateManager extends BaseStateManager {

  public maxUndoStates: number;

  constructor() {
    super();
    this.maxUndoStates = GPP.gMaxUndoStates;
  }

  PreserveState() {
    this.SyncObjectsWithCreateStates();
    this.States[this.CurrentStateID].IsOpen = false;
  }

  SyncObjectsWithCreateStates() {

    //CREATE: 1 || UPDATE: 2 ||DELETE: 3
    const t = Globals.StateOperationType;
    const a = Utils1.CloneBlock;
    const r = this.States[this.CurrentStateID];
    const i = r.StoredObjects.length;
    for (let e = 0; e < i; ++e) {
      const n = r.StoredObjects[e];
      if (n.StateOperationTypeID == t.CREATE) {
        const o = a(GPP.objectStore.GetObject(n.ID));
        o.StateOperationTypeID = t.CREATE;
        r.StoredObjects[e] = o;
      }
    }
  }

  GetUndoState() {
    const e = { undo: false, redo: false };
    const t = this.States.length - 1;
    e.undo = this.CurrentStateID > 0;
    e.redo = this.CurrentStateID < t;
    return e;
  }

  ExceptionCleanup() {
    if (this.CurrentStateID > 0 && this.States[this.CurrentStateID].IsOpen) {
      this.States[this.CurrentStateID].IsOpen = false;
      GPP.CURRENT_SEQ_OBJECT_ID = this.States[this.CurrentStateID].CURRENT_SEQ_OBJECT_ID;
      this.RestoreObjectStoreFromState();
      this.CurrentStateID--;
      if (this.CurrentStateID < this.States.length - 1) {
        this.States = this.States.slice(0, this.CurrentStateID + 1);
      }
    }
  }

  RestorePrevState() {
    if (this.CurrentStateID > 0) {
      this.RestoreObjectStoreFromState();
      this.CurrentStateID--;
    }
  }

  RestoreNextState() {
    if (this.CurrentStateID < this.States.length - 1) {
      this.CurrentStateID++;
      this.RestoreObjectStoreFromState();
    }
  }

  RestoreObjectStoreFromState() {
    //CREATE: 1 || UPDATE: 2 ||DELETE: 3
    const e = Globals.StateOperationType;
    const t = Utils1.CloneBlock;
    try {
      const a = this.States[this.CurrentStateID];
      const r = a.StoredObjects;
      let i = null;
      const n = r.length;
      let o = 0;
      let s = null;
      for (o = 0; o < n; ++o) {
        s = r[o];
        switch (s.StateOperationTypeID) {
          case e.CREATE:
            if (GPP.objectStore.GetObject(s.ID)) {
              GPP.objectStore.DeleteObject(s.ID, false);
            } else {
              i = t(s);
              GPP.objectStore.SaveObject(i, false);
            }
            break;
          case e.DELETE:
            if (GPP.objectStore.GetObject(s.ID)) {
              GPP.objectStore.DeleteObject(s.ID, false);
            } else {
              i = t(s);
              i.StateOperationTypeID = e.CREATE;
              GPP.objectStore.SaveObject(i, false);
            }
            break;
          case e.UPDATE:
            const l = t(s);
            const S = GPP.objectStore.GetObject(s.ID);
            const c = t(S);
            if (S.StateOperationTypeID == e.CREATE) {
              c.StateOperationTypeID = e.UPDATE;
            }
            GPP.objectStore.SaveObject(l, false);
            a.StoredObjects[o] = c;
            break;
        }
      }
    } catch (error) {
      throw error;
    }
  }

  GetCurrentState() {
    return this.States[this.CurrentStateID];
  }

  AddToCurrentState(e) {
    const t = State;
    const a = Globals.StateOperationType;
    let r = true;
    const i = this.GetCurrentState();
    let n = null;
    let o = 0;
    if (i !== undefined && i.IsOpen === true) {
      r = false;
      let s = false;
      let l = null;
      $.each(i.StoredObjects, (function (t, a) {
        if (a.ID === e.ID) {
          s = true;
          l = a;
          return false;
        }
      }));
      if (s) {
        switch (l.StateOperationTypeID) {
          case a.CREATE:
            switch (e.StateOperationTypeID) {
              case a.CREATE:
                this.CurrentStateReplace(e, false);
                break;
              case a.DELETE:
                this.CurrentStateDelete(e);
              case a.UPDATE:
            }
            break;
          case a.DELETE:
            switch (e.StateOperationTypeID) {
              case a.CREATE:
                e.StateOperationTypeID = a.UPDATE;
                this.CurrentStateReplace(e, false);
                break;
              case a.DELETE:
                this.CurrentStateReplace(e, false);
                break;
              case a.UPDATE:
                e.StateOperationTypeID = a.UPDATE;
                this.CurrentStateReplace(e, false);
            }
            break;
          case a.UPDATE:
            switch (e.StateOperationTypeID) {
              case a.CREATE:
                this.CurrentStateReplace(e, false);
                break;
              case a.DELETE:
                this.CurrentStateReplace(e, true);
              case a.UPDATE:
            }
        }
      } else {
        i.AddStoredObject(e);
      }
    }
    if (r === true) {
      if (this.CurrentStateID < this.States.length - 1) {
        this.States = this.States.slice(0, this.CurrentStateID + 1);
      }
      if (this.maxUndoStates) {
        n = new t(this.CurrentStateID + 1, 't3');
        n.AddStoredObject(e);
        this.States.push(n);
        this.CurrentStateID = n.ID;
        let S = this.States.length;
        if (S > this.maxUndoStates) {
          this.States.shift();
          this.CurrentStateID--;
          this.DroppedStates++;
          S = this.States.length;
          for (o = 0; o < S; ++o) {
            this.States[o].ID--;
          }
        }
      } else if (this.States.length === 0) {
        n = new t(GPP.stateManager.CurrentStateID + 1, 't3');
        n.AddStoredObject(e);
        this.States.push(n);
        this.CurrentStateID = n.ID;
      }
    }
  }

  CurrentStateReplace(e, t) {
    let a = null;
    let r = 0;
    let i = 0;
    const n = e.ID;
    const o = Utils1.CloneBlock;
    if (this.States.length !== 0) {
      a = this.States[this.CurrentStateID];
      i = a.StoredObjects.length;
      for (r = 0; r < i; ++r) {
        if (a.StoredObjects[r].ID == n) {
          if (t) {
            a.StoredObjects[r].StateOperationTypeID = e.StateOperationTypeID;
          } else {
            const s = o(e);
            a.StoredObjects[r] = s;
          }
          return;
        }
      }
    }
  }

  CurrentStateDelete(e) {
    let t = null;
    let a = 0;
    let r = 0;
    const i = e.ID;
    if (this.States.length !== 0) {
      t = this.States[this.CurrentStateID];
      r = t.StoredObjects.length;
      for (a = 0; a < r; ++a) {
        if (t.StoredObjects[a].ID == i) {
          t.StoredObjects.splice(a, 1);
          return;
        }
      }
    }
  }

  GetBlockFromState(e, t) {
    if (this.States.length > e) {
      const i = this.States[e];
      const a = i.StoredObjects.length;
      for (let r = 0; r < a; r++) {
        if (i.StoredObjects[r].ID === t) {
          return i.StoredObjects[r];
        }
      }
    }
  }

  ReplaceInCurrentState(e, t) {
    let a = null;
    let r = 0;
    let i = 0;
    if (this.States.length !== 0) {
      a = this.States[this.CurrentStateID];
      i = a.StoredObjects.length;
      for (r = 0; r < i; ++r) {
        if (a.StoredObjects[r].ID == e) {
          $.extend(a.StoredObjects[r].Data, t.Data, true);
          break;
        }
      }
    }
  }

  ResetUndoStates() {
    this.CurrentStateID = -1;
    this.DroppedStates = 0;
    this.HistoryState = 0;
    this.States = [];
  }

  ResetToSpecificState(e) {
    this.CurrentStateID = e;
    this.DroppedStates = 0;
    this.HistoryState = 0;
    this.States = [this.States[e]];
  }

  AddToHistoryState(e) {
    this.HistoryState++;
  }

  ClearFutureUndoStates() {
    if (this.CurrentStateID < this.States.length - 1) {
      this.States = this.States.slice(0, this.CurrentStateID + 1);
    }
  }

  DumpStates(e) {
    const t = this.States.length;
    let a = null;
    let r = 0;
    let i = 0;
    let n = 0;
    for (r = 0; r < t; ++r) {
      n = (a = this.States[r]).StoredObjects.length;
      for (i = 0; i < n; ++i) {
        switch (a.StoredObjects[i].StateOperationTypeID) {
          case Globals.StateOperationType.CREATE:
          case Globals.StateOperationType.DELETE:
          case Globals.StateOperationType.UPDATE:
        }
      }
    }
  }
}

export default StateManager
