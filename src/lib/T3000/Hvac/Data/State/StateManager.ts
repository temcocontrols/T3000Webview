
import BaseStateManager from './BaseStateManager'
import GlobalData from '../GlobalData'
import Globals from '../Globals'
import Utils1 from '../../Helper/Utils1'
import State from './State'
import $ from 'jquery'

class StateManager extends BaseStateManager {

  public maxUndoStates: number;

  constructor() {
    super();
    this.maxUndoStates = GlobalData.gMaxUndoStates;
  }

  PreserveState() {
    this.SyncObjectsWithCreateStates();
    this.States[this.CurrentStateID].IsOpen = false;
  }

  SyncObjectsWithCreateStates() {
    // Operation Types: CREATE: 1, UPDATE: 2, DELETE: 3
    const globalStateOperation = Globals.StateOperationType;
    const cloneBlock = Utils1.CloneBlock;
    const currentState = this.States[this.CurrentStateID];
    const totalStoredObjects = currentState.StoredObjects.length;

    for (let index = 0; index < totalStoredObjects; ++index) {
      const storedObject = currentState.StoredObjects[index];
      if (storedObject.StateOperationTypeID === globalStateOperation.CREATE) {
        const clonedObject = cloneBlock(GlobalData.objectStore.GetObject(storedObject.ID));
        clonedObject.StateOperationTypeID = globalStateOperation.CREATE;
        currentState.StoredObjects[index] = clonedObject;
      }
    }
  }

  GetUndoState() {
    const stateAvailability = { undo: false, redo: false };
    const lastStateIndex = this.States.length - 1;
    stateAvailability.undo = this.CurrentStateID > 0;
    stateAvailability.redo = this.CurrentStateID < lastStateIndex;
    return stateAvailability;
  }

  ExceptionCleanup() {
    if (this.CurrentStateID > 0 && this.States[this.CurrentStateID].IsOpen) {
      this.States[this.CurrentStateID].IsOpen = false;
      GlobalData.CURRENT_SEQ_OBJECT_ID = this.States[this.CurrentStateID].CURRENT_SEQ_OBJECT_ID;
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
    const operationTypes = Globals.StateOperationType;
    const cloneBlock = Utils1.CloneBlock;

    try {
      const currentState = this.States[this.CurrentStateID];
      const storedObjects = currentState.StoredObjects;
      let clonedObject = null;
      const totalObjects = storedObjects.length;

      for (let index = 0; index < totalObjects; ++index) {
        const storedObject = storedObjects[index];

        switch (storedObject.StateOperationTypeID) {
          case operationTypes.CREATE:
            if (GlobalData.objectStore.GetObject(storedObject.ID)) {
              GlobalData.objectStore.DeleteObject(storedObject.ID, false);
            } else {
              clonedObject = cloneBlock(storedObject);
              GlobalData.objectStore.SaveObject(clonedObject, false);
            }
            break;

          case operationTypes.DELETE:
            if (GlobalData.objectStore.GetObject(storedObject.ID)) {
              GlobalData.objectStore.DeleteObject(storedObject.ID, false);
            } else {
              clonedObject = cloneBlock(storedObject);
              clonedObject.StateOperationTypeID = operationTypes.CREATE;
              GlobalData.objectStore.SaveObject(clonedObject, false);
            }
            break;

          case operationTypes.UPDATE:
            const updatedClone = cloneBlock(storedObject);
            const currentGlobalObject = GlobalData.objectStore.GetObject(storedObject.ID);
            const globalClone = cloneBlock(currentGlobalObject);
            if (currentGlobalObject.StateOperationTypeID === operationTypes.CREATE) {
              globalClone.StateOperationTypeID = operationTypes.UPDATE;
            }
            GlobalData.objectStore.SaveObject(updatedClone, false);
            currentState.StoredObjects[index] = globalClone;
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

  AddToCurrentState(newObject) {
    const StateClass = State;
    const operationTypes = Globals.StateOperationType;
    let createNewState = true;
    const currentState = this.GetCurrentState();
    let newState = null;

    if (currentState !== undefined && currentState.IsOpen === true) {
      createNewState = false;
      let objectFound = false;
      let existingObject = null;

      $.each(currentState.StoredObjects, (index, storedObject) => {
        if (storedObject.ID === newObject.ID) {
          objectFound = true;
          existingObject = storedObject;
          return false; // break out of $.each loop
        }
      });

      if (objectFound) {
        switch (existingObject.StateOperationTypeID) {
          case operationTypes.CREATE:
            switch (newObject.StateOperationTypeID) {
              case operationTypes.CREATE:
                this.CurrentStateReplace(newObject, false);
                break;
              case operationTypes.DELETE:
                this.CurrentStateDelete(newObject);
              // fall through to UPDATE behavior if needed
              case operationTypes.UPDATE:
                break;
            }
            break;
          case operationTypes.DELETE:
            switch (newObject.StateOperationTypeID) {
              case operationTypes.CREATE:
                newObject.StateOperationTypeID = operationTypes.UPDATE;
                this.CurrentStateReplace(newObject, false);
                break;
              case operationTypes.DELETE:
                this.CurrentStateReplace(newObject, false);
                break;
              case operationTypes.UPDATE:
                newObject.StateOperationTypeID = operationTypes.UPDATE;
                this.CurrentStateReplace(newObject, false);
                break;
            }
            break;
          case operationTypes.UPDATE:
            switch (newObject.StateOperationTypeID) {
              case operationTypes.CREATE:
                this.CurrentStateReplace(newObject, false);
                break;
              case operationTypes.DELETE:
                this.CurrentStateReplace(newObject, true);
              // fall through to UPDATE behavior if needed
              case operationTypes.UPDATE:
                break;
            }
            break;
        }
      } else {
        currentState.AddStoredObject(newObject);
      }
    }

    if (createNewState === true) {
      if (this.CurrentStateID < this.States.length - 1) {
        this.States = this.States.slice(0, this.CurrentStateID + 1);
      }

      if (this.maxUndoStates) {
        newState = new StateClass(this.CurrentStateID + 1, 't3');
        newState.AddStoredObject(newObject);
        this.States.push(newState);
        this.CurrentStateID = newState.ID;

        let totalStates = this.States.length;
        if (totalStates > this.maxUndoStates) {
          this.States.shift();
          this.CurrentStateID--;
          this.DroppedStates++;
          totalStates = this.States.length;
          for (let index = 0; index < totalStates; ++index) {
            this.States[index].ID--;
          }
        }
      } else if (this.States.length === 0) {
        newState = new StateClass(GlobalData.stateManager.CurrentStateID + 1, 't3');
        newState.AddStoredObject(newObject);
        this.States.push(newState);
        this.CurrentStateID = newState.ID;
      }
    }
  }

  CurrentStateReplace(newObject, updateOperationTypeOnly) {
    const objectId = newObject.ID;
    const cloneObject = Utils1.CloneBlock;

    if (this.States.length !== 0) {
      const currentState = this.States[this.CurrentStateID];
      const totalObjects = currentState.StoredObjects.length;

      for (let index = 0; index < totalObjects; index++) {
        if (currentState.StoredObjects[index].ID === objectId) {
          if (updateOperationTypeOnly) {
            currentState.StoredObjects[index].StateOperationTypeID = newObject.StateOperationTypeID;
          } else {
            const clonedNewObject = cloneObject(newObject);
            currentState.StoredObjects[index] = clonedNewObject;
          }
          return;
        }
      }
    }
  }

  CurrentStateDelete(objectToDelete) {
    if (this.States.length !== 0) {
      const currentState = this.States[this.CurrentStateID];
      const totalObjects = currentState.StoredObjects.length;
      for (let index = 0; index < totalObjects; ++index) {
        if (currentState.StoredObjects[index].ID === objectToDelete.ID) {
          currentState.StoredObjects.splice(index, 1);
          return;
        }
      }
    }
  }

  GetObjectFromState(stateIndex: number, objectId: number) {
    if (this.States.length > stateIndex) {
      const state = this.States[stateIndex];
      const storedObjectCount = state.StoredObjects.length;
      for (let index = 0; index < storedObjectCount; index++) {
        if (state.StoredObjects[index].ID === objectId) {
          return state.StoredObjects[index];
        }
      }
    }
  }

  ReplaceInCurrentState(objectId, updatedObject) {
    if (this.States.length === 0) {
      return;
    }

    const currentState = this.States[this.CurrentStateID];
    const totalObjects = currentState.StoredObjects.length;

    for (let index = 0; index < totalObjects; index++) {
      if (currentState.StoredObjects[index].ID === objectId) {
        $.extend(currentState.StoredObjects[index].Data, updatedObject.Data, true);
        break;
      }
    }
  }

  ResetUndoStates() {
    this.CurrentStateID = -1;
    this.DroppedStates = 0;
    this.HistoryState = 0;
    this.States = [];
  }

  ResetToSpecificState(stateIndex: number): void {
    this.CurrentStateID = stateIndex;
    this.DroppedStates = 0;
    this.HistoryState = 0;
    this.States = [this.States[stateIndex]];
  }

  AddToHistoryState() {
    this.HistoryState++;
  }

  ClearFutureUndoStates() {
    if (this.CurrentStateID < this.States.length - 1) {
      this.States = this.States.slice(0, this.CurrentStateID + 1);
    }
  }

  DumpStates(logHeader: string): void {
    const totalStates = this.States.length;
    for (let stateIndex = 0; stateIndex < totalStates; stateIndex++) {
      const currentState = this.States[stateIndex];
      const totalObjects = currentState.StoredObjects.length;
      for (let objectIndex = 0; objectIndex < totalObjects; objectIndex++) {
        const storedObject = currentState.StoredObjects[objectIndex];
        switch (storedObject.StateOperationTypeID) {
          case Globals.StateOperationType.CREATE:
          case Globals.StateOperationType.DELETE:
          case Globals.StateOperationType.UPDATE:
            break;
          default:
            break;
        }
      }
    }
  }
}

export default StateManager
