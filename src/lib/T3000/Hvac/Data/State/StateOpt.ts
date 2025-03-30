
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
 *   stateOptTypeId: StateConstant.StateOperationType.CREATE
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
    this.states[this.currentStateId].IsOpen = false;
  }

  /**
   * Synchronizes objects with created states to ensure proper state tracking
   * Special handling for objects with CREATE operation type
   * // Operation Types: CREATE: 1, UPDATE: 2, DELETE: 3
   */
  SyncObjectsWithCreateStates() {
    const globalStateOperation = StateConstant.StateOperationType;
    const cloneBlock = Utils1.CloneBlock;
    const currentState = this.states[this.currentStateId];
    const totalStoredObjects = currentState.storedObjects.length;

    for (let index = 0; index < totalStoredObjects; ++index) {
      const storedObject = currentState.storedObjects[index];
      if (storedObject.stateOptTypeId === globalStateOperation.CREATE) {
        const clonedObject = cloneBlock(T3Gv.stdObj.GetObject(storedObject.ID));
        clonedObject.stateOptTypeId = globalStateOperation.CREATE;
        currentState.storedObjects[index] = clonedObject;
      }
    }
  }

  /**
   * Determines if undo and redo operations are available in the current state
   * @returns Object containing availability status for undo and redo operations
   */
  GetUndoState() {
    const stateAvailability = { undo: false, redo: false };
    const lastStateIndex = this.states.length - 1;
    stateAvailability.undo = this.currentStateId > 0;
    stateAvailability.redo = this.currentStateId < lastStateIndex;
    return stateAvailability;
  }

  /**
   * Performs cleanup operations during exceptions to maintain state integrity
   * Restores objects and adjusts current state index
   */
  ExceptionCleanup() {
    if (this.currentStateId > 0 && this.states[this.currentStateId].IsOpen) {
      this.states[this.currentStateId].IsOpen = false;
      T3Gv.currentObjSeqId = this.states[this.currentStateId].currentObjSeqId;
      this.RestoreDataStoreFromState();
      this.currentStateId--;
      if (this.currentStateId < this.states.length - 1) {
        this.states = this.states.slice(0, this.currentStateId + 1);
      }
    }
  }

  /**
   * Restores the previous state (undo operation)
   * Only proceeds if there is a previous state available
   */
  RestorePrevState() {
    if (this.currentStateId > 0) {
      this.RestoreDataStoreFromState();
      this.currentStateId--;
    }
  }

  /**
   * Restores the next state (redo operation)
   * Only proceeds if there is a next state available
   */
  RestoreNextState() {
    if (this.currentStateId < this.states.length - 1) {
      this.currentStateId++;
      this.RestoreDataStoreFromState();
    }
  }

  /**
   * Restores objects from the current state to the object store
   * Handles different operation types (CREATE, UPDATE, DELETE) appropriately
   */
  RestoreDataStoreFromState() {
    const operationTypes = StateConstant.StateOperationType;
    const cloneBlock = Utils1.CloneBlock;

    try {
      const currentState = this.states[this.currentStateId];
      const storedObjects = currentState.storedObjects;
      const totalObjects = storedObjects.length;

      for (let index = 0; index < totalObjects; ++index) {
        const storedObject = storedObjects[index];

        switch (storedObject.stateOptTypeId) {
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
              clonedObject.stateOptTypeId = operationTypes.CREATE;
              T3Gv.stdObj.SaveObject(clonedObject, false);
            }
            break;

          case operationTypes.UPDATE:
            const updatedClone = cloneBlock(storedObject);
            const currentGlobalObject = T3Gv.stdObj.GetObject(storedObject.ID);
            const globalClone = cloneBlock(currentGlobalObject);
            if (currentGlobalObject.stateOptTypeId === operationTypes.CREATE) {
              globalClone.stateOptTypeId = operationTypes.UPDATE;
            }
            T3Gv.stdObj.SaveObject(updatedClone, false);
            currentState.storedObjects[index] = globalClone;
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
    return this.states[this.currentStateId];
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

      $.each(currentState.storedObjects, (index, storedObject) => {
        if (storedObject.ID === newObject.ID) {
          objectFound = true;
          existingObject = storedObject;
          return false; // break out of $.each loop
        }
      });

      if (objectFound) {
        switch (existingObject.stateOptTypeId) {
          case operationTypes.CREATE:
            switch (newObject.stateOptTypeId) {
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
            switch (newObject.stateOptTypeId) {
              case operationTypes.CREATE:
                newObject.stateOptTypeId = operationTypes.UPDATE;
                this.CurrentStateReplace(newObject, false);
                break;
              case operationTypes.DELETE:
                this.CurrentStateReplace(newObject, false);
                break;
              case operationTypes.UPDATE:
                newObject.stateOptTypeId = operationTypes.UPDATE;
                this.CurrentStateReplace(newObject, false);
                break;
            }
            break;
          case operationTypes.UPDATE:
            switch (newObject.stateOptTypeId) {
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
      if (this.currentStateId < this.states.length - 1) {
        this.states = this.states.slice(0, this.currentStateId + 1);
      }

      if (this.maxUndo) {
        newState = new StateClass(this.currentStateId + 1, 'T3');
        newState.AddStoredObject(newObject);
        this.states.push(newState);
        this.currentStateId = newState.ID;

        let totalStates = this.states.length;
        if (totalStates > this.maxUndo) {
          this.states.shift();
          this.currentStateId--;
          this.droppedStates++;
          totalStates = this.states.length;
          for (let index = 0; index < totalStates; ++index) {
            this.states[index].ID--;
          }
        }
      } else if (this.states.length === 0) {
        newState = new StateClass(T3Gv.state.currentStateId + 1, 'T3');
        newState.AddStoredObject(newObject);
        this.states.push(newState);
        this.currentStateId = newState.ID;
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

    if (this.states.length !== 0) {
      const currentState = this.states[this.currentStateId];
      const totalObjects = currentState.storedObjects.length;

      for (let index = 0; index < totalObjects; index++) {
        if (currentState.storedObjects[index].ID === objectId) {
          if (updateOperationTypeOnly) {
            currentState.storedObjects[index].stateOptTypeId = newObject.stateOptTypeId;
          } else {
            const clonedNewObject = cloneObject(newObject);
            currentState.storedObjects[index] = clonedNewObject;
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
    if (this.states.length !== 0) {
      const currentState = this.states[this.currentStateId];
      const totalObjects = currentState.storedObjects.length;
      for (let index = 0; index < totalObjects; ++index) {
        if (currentState.storedObjects[index].ID === objectToDelete.ID) {
          currentState.storedObjects.splice(index, 1);
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
    if (this.states.length > stateIndex) {
      const state = this.states[stateIndex];
      const storedObjectCount = state.storedObjects.length;
      for (let index = 0; index < storedObjectCount; index++) {
        if (state.storedObjects[index].ID === objectId) {
          return state.storedObjects[index];
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
    if (this.states.length === 0) {
      return;
    }

    const currentState = this.states[this.currentStateId];
    const totalObjects = currentState.storedObjects.length;

    for (let index = 0; index < totalObjects; index++) {
      if (currentState.storedObjects[index].ID === objectId) {
        $.extend(currentState.storedObjects[index].Data, updatedObject.Data, true);
        break;
      }
    }
  }

  /**
   * Resets all undo states to initial values
   */
  ResetUndoStates() {
    this.currentStateId = -1;
    this.droppedStates = 0;
    this.historyState = 0;
    this.states = [];
  }

  /**
   * Resets state to a specific index, discarding other states
   * @param stateIndex - The index of the state to reset to
   */
  ResetToSpecificState(stateIndex: number): void {
    this.currentStateId = stateIndex;
    this.droppedStates = 0;
    this.historyState = 0;
    this.states = [this.states[stateIndex]];
  }

  /**
   * Increments the history state counter
   */
  AddToHistoryState() {
    this.historyState++;
  }

  /**
   * Clears all future undo states beyond the current state
   * Used after an action when future redo states should be discarded
   */
  ClearFutureUndoStates() {
    if (this.currentStateId < this.states.length - 1) {
      this.states = this.states.slice(0, this.currentStateId + 1);
    }
  }
}

export default StateOpt
