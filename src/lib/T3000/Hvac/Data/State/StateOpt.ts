
import BaseStateOpt from './BaseStateOpt'
import T3Gv from '../T3Gv'
import Utils1 from '../../Util/Utils1'
import State from './State'
import $ from 'jquery'
import StateConstant from './StateConstant'

/**
 * Manages state transitions and undo/redo operations for HVAC system control objects.
 *
 * The StateOpt class extends the BaseStateOpt and provides methods to add, update, delete, and
 * restore states. It encapsulates logic for synchronizing created states with global objects and
 * maintaining a history of state changes, thereby allowing undo and redo operations. This class
 * handles exceptions to maintain state integrity by rolling back to prior states when errors occur.
 *
 * Key functionalities include:
 * - Preserving and synchronizing states with CREATE operations.
 * - Providing undo and redo capabilities via RestorePrevState and RestoreNextState.
 * - Cleaning up after exceptions to ensure the current state remains valid.
 * - Adding objects to the current state and creating new states if required while keeping the undo
 *   history within the maximum allowed limit.
 * - Managing object restoration from states with proper handling for different operation types (CREATE,
 *   UPDATE, DELETE).
 *
 * @example
 * // Instantiate and use the StateOpt class.
 * const stateOpt = new StateOpt();
 *
 * // Create an object to add to the state (assuming proper definition of StateOperationType constants).
 * const newObject = {
 *   ID: 101,
 *   Data: { temperature: 25, humidity: 50 },
 *   StateOperationTypeID: StateConstant.StateOperationType.CREATE
 * };
 *
 * // Add the new object to the current state.
 * stateOpt.AddToCurrentState(newObject);
 *
 * // Check if undo/redo operations are available.
 * const { undo, redo } = stateOpt.GetUndoState();
 * if (undo) {
 *   // Undo the last state change.
 *   stateOpt.RestorePrevState();
 * }
 *
 * if (redo) {
 *   // Redo the previously undone state change.
 *   stateOpt.RestoreNextState();
 * }
 *
 * // Finalize the current state to close it.
 * stateOpt.PreserveState();
 *
 * @remarks
 * - This class relies on global objects (e.g., T3Gv, Utils1, StateConstant) available in the application scope.
 * - The maximum number of undo operations is configured via T3Gv.maxUndo.
 * - ExceptionCleanup ensures that in the event of an error, the state is rolled back to the most consistent state.
 */
class StateOpt extends BaseStateOpt {

  /**
   * Maximum number of undo operations allowed
   */
  public maxUndo: number;

  /**
   * Initializes the StateOpt with maximum undo limit from global settings
   */
  constructor() {
    super();
    this.maxUndo = T3Gv.maxUndo;
  }

  /**
   * Finalizes the current state by syncing objects and marking it as closed
   */
  PreserveState() {
    this.SyncObjectsWithCreateStates();
    this.States[this.CurrentStateID].IsOpen = false;
  }

  /**
   * Synchronizes objects with created states to ensure proper state tracking
   * Special handling for objects with CREATE operation type
   * // Operation Types: CREATE: 1, UPDATE: 2, DELETE: 3
   */
  SyncObjectsWithCreateStates() {
    const globalStateOperation = StateConstant.StateOperationType;
    const cloneBlock = Utils1.CloneBlock;
    const currentState = this.States[this.CurrentStateID];
    const totalStoredObjects = currentState.StoredObjects.length;

    for (let index = 0; index < totalStoredObjects; ++index) {
      const storedObject = currentState.StoredObjects[index];
      if (storedObject.StateOperationTypeID === globalStateOperation.CREATE) {
        const clonedObject = cloneBlock(T3Gv.stdObj.GetObject(storedObject.ID));
        clonedObject.StateOperationTypeID = globalStateOperation.CREATE;
        currentState.StoredObjects[index] = clonedObject;
      }
    }
  }

  /**
   * Determines if undo and redo operations are available in the current state
   * @returns Object containing availability status for undo and redo operations
   */
  GetUndoState() {
    const stateAvailability = { undo: false, redo: false };
    const lastStateIndex = this.States.length - 1;
    stateAvailability.undo = this.CurrentStateID > 0;
    stateAvailability.redo = this.CurrentStateID < lastStateIndex;
    return stateAvailability;
  }

  /**
   * Performs cleanup operations during exceptions to maintain state integrity
   * Restores objects and adjusts current state index
   */
  ExceptionCleanup() {
    if (this.CurrentStateID > 0 && this.States[this.CurrentStateID].IsOpen) {
      this.States[this.CurrentStateID].IsOpen = false;
      T3Gv.currentObjSeqId = this.States[this.CurrentStateID].currentObjSeqId;
      this.RestoreObjectStoreFromState();
      this.CurrentStateID--;
      if (this.CurrentStateID < this.States.length - 1) {
        this.States = this.States.slice(0, this.CurrentStateID + 1);
      }
    }
  }

  /**
   * Restores the previous state (undo operation)
   * Only proceeds if there is a previous state available
   */
  RestorePrevState() {
    if (this.CurrentStateID > 0) {
      this.RestoreObjectStoreFromState();
      this.CurrentStateID--;
    }
  }

  /**
   * Restores the next state (redo operation)
   * Only proceeds if there is a next state available
   */
  RestoreNextState() {
    if (this.CurrentStateID < this.States.length - 1) {
      this.CurrentStateID++;
      this.RestoreObjectStoreFromState();
    }
  }

  /**
   * Restores objects from the current state to the object store
   * Handles different operation types (CREATE, UPDATE, DELETE) appropriately
   */
  RestoreObjectStoreFromState() {
    const operationTypes = StateConstant.StateOperationType;
    const cloneBlock = Utils1.CloneBlock;

    try {
      const currentState = this.States[this.CurrentStateID];
      const storedObjects = currentState.StoredObjects;
      const totalObjects = storedObjects.length;

      for (let index = 0; index < totalObjects; ++index) {
        const storedObject = storedObjects[index];

        switch (storedObject.StateOperationTypeID) {
          case operationTypes.CREATE:
            if (T3Gv.stdObj.GetObject(storedObject.ID)) {
              T3Gv.stdObj.DeleteObject(storedObject.ID, false);
            } else {
              const clonedObject = cloneBlock(storedObject);
              T3Gv.stdObj.SaveObject(clonedObject, false);
            }
            break;

          case operationTypes.DELETE:
            if (T3Gv.stdObj.GetObject(storedObject.ID)) {
              T3Gv.stdObj.DeleteObject(storedObject.ID, false);
            } else {
              const clonedObject = cloneBlock(storedObject);
              clonedObject.StateOperationTypeID = operationTypes.CREATE;
              T3Gv.stdObj.SaveObject(clonedObject, false);
            }
            break;

          case operationTypes.UPDATE:
            const updatedClone = cloneBlock(storedObject);
            const currentGlobalObject = T3Gv.stdObj.GetObject(storedObject.ID);
            const globalClone = cloneBlock(currentGlobalObject);
            if (currentGlobalObject.StateOperationTypeID === operationTypes.CREATE) {
              globalClone.StateOperationTypeID = operationTypes.UPDATE;
            }
            T3Gv.stdObj.SaveObject(updatedClone, false);
            currentState.StoredObjects[index] = globalClone;
            break;
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieves the current active state
   * @returns The current state object
   */
  GetCurrentState() {
    return this.States[this.CurrentStateID];
  }

  /**
   * Adds a new object to the current state or creates a new state if needed
   * Handles various operation types and maintains maximum undo stack size
   * @param newObject - The object to add to the current state
   */
  AddToCurrentState(newObject) {
    const StateClass = State;
    const operationTypes = StateConstant.StateOperationType;
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

      if (this.maxUndo) {
        newState = new StateClass(this.CurrentStateID + 1, 'T3');
        newState.AddStoredObject(newObject);
        this.States.push(newState);
        this.CurrentStateID = newState.ID;

        let totalStates = this.States.length;
        if (totalStates > this.maxUndo) {
          this.States.shift();
          this.CurrentStateID--;
          this.DroppedStates++;
          totalStates = this.States.length;
          for (let index = 0; index < totalStates; ++index) {
            this.States[index].ID--;
          }
        }
      } else if (this.States.length === 0) {
        newState = new StateClass(T3Gv.state.CurrentStateID + 1, 'T3');
        newState.AddStoredObject(newObject);
        this.States.push(newState);
        this.CurrentStateID = newState.ID;
      }
    }
  }

  /**
   * Replaces an object in the current state
   * @param newObject - The new object to replace with
   * @param updateOperationTypeOnly - If true, only update operation type, not the entire object
   */
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

  /**
   * Deletes an object from the current state
   * @param objectToDelete - The object to be deleted
   */
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

  /**
   * Retrieves an object from a specific state by its ID
   * @param stateIndex - The index of the state to search in
   * @param objectId - The ID of the object to retrieve
   * @returns The found object or undefined if not found
   */
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

  /**
   * Replaces an object in the current state with updated data
   * @param objectId - The ID of the object to replace
   * @param updatedObject - The object with updated data
   */
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

  /**
   * Resets all undo states to initial values
   */
  ResetUndoStates() {
    this.CurrentStateID = -1;
    this.DroppedStates = 0;
    this.HistoryState = 0;
    this.States = [];
  }

  /**
   * Resets state to a specific index, discarding other states
   * @param stateIndex - The index of the state to reset to
   */
  ResetToSpecificState(stateIndex: number): void {
    this.CurrentStateID = stateIndex;
    this.DroppedStates = 0;
    this.HistoryState = 0;
    this.States = [this.States[stateIndex]];
  }

  /**
   * Increments the history state counter
   */
  AddToHistoryState() {
    this.HistoryState++;
  }

  /**
   * Clears all future undo states beyond the current state
   * Used after an action when future redo states should be discarded
   */
  ClearFutureUndoStates() {
    if (this.CurrentStateID < this.States.length - 1) {
      this.States = this.States.slice(0, this.CurrentStateID + 1);
    }
  }
}

export default StateOpt
