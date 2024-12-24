

import GPP from '../Data/GlobalData'
import StateManager from '../Data/State/StateManager'
import ObjectStore from '../Data/State/ObjectStore'
import ObjectStoreFactory from '../Data/State/ObjectStoreFactory'
// import { plainToClass } from 'class-transformer'

class DataOpt {

  static readonly stateManagerPrimaryKey: string = "T3.stateManagerPrimary";
  static readonly objectStorePrimaryKey: string = "T3.objectStorePrimary";
  static readonly clipboardManagerKey: string = "T3.clipboardManager";
  static readonly CURRENT_SEQ_OBJECT_IDKey: string = "T3.CURRENT_SEQ_OBJECT_ID";
  // static readonly stateManagerKey: string = "T3.stateManager";
  // static readonly objectStoreKey: string = "T3.objectStore";

  // call this function to load data from localstorage after GPP is initialized
  static InitStateManagerFromLocal() {

    debugger

    // load stateManagePrimary
    const stateManagerPrimary = this.LoadData(this.stateManagerPrimaryKey);
    if (stateManagerPrimary) {

      const stm = new StateManager();
      stm.CurrentStateID = stateManagerPrimary.CurrentStateID;
      stm.HistoryState = stateManagerPrimary.HistoryState;
      stm.DroppedStates = stateManagerPrimary.DroppedStates;
      stm.States = stateManagerPrimary.States;

      GPP.stateManagerPrimary = stm;
    }

    // load objectStorePrimary
    const objectStorePrimary = this.LoadData(this.objectStorePrimaryKey);
    if (objectStorePrimary) {

      const osp = new ObjectStore();
      osp.StoredObjects = objectStorePrimary.StoredObjects;

      GPP.objectStorePrimary = osp;
    }

    // load clipboardManager
    const clipboardManager = this.LoadData(this.clipboardManagerKey);
    if (clipboardManager) {

      var clm = new ObjectStoreFactory().Create();

      GPP.clipboardManager = clm;
    }

    // load CURRENT_SEQ_OBJECT_ID
    const CURRENT_SEQ_OBJECT_ID = this.LoadData(this.CURRENT_SEQ_OBJECT_IDKey);
    if (CURRENT_SEQ_OBJECT_ID) {
      GPP.CURRENT_SEQ_OBJECT_ID_Primary = CURRENT_SEQ_OBJECT_ID;
    }

    /*
    // load stateManager
    const stateManager = this.LoadData(this.stateManagerKey);
    if (stateManager) {
      GPP.stateManager = stateManager;
    }

    // load objectStore
    const objectStore = this.LoadData(this.objectStoreKey);
    if (objectStore) {
      GPP.objectStore = objectStore;
    }
    */

    this.SDJS_select_primary_state_manager();

    GPP.stateManagerPrimary.RestoreObjectStoreFromState();
    GPP.stateManager.RestoreObjectStoreFromState();
  }

  static SaveToLocal() {
    // save stateManagePrimary
    this.SaveData(this.stateManagerPrimaryKey, GPP.stateManagerPrimary);

    // save objectStorePrimary
    this.SaveData(this.objectStorePrimaryKey, GPP.objectStorePrimary);

    // save clipboardManager
    this.SaveData(this.clipboardManagerKey, GPP.clipboardManager);

    /*
    // save stateManager
    this.SaveData(this.stateManagerKey, GPP.stateManager);

    // save objectStore
    this.SaveData(this.objectStoreKey, GPP.objectStore);
    */
  }

  static SaveToT3000() {

  }

  // load data from localstorage
  static LoadData(key: string) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // save data to localstorage
  static SaveData(key: string, data: any) {
    if (data) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  static SDJS_init_state_manager() {
    GPP.stateManagerPrimary = new StateManager();
    GPP.objectStorePrimary = new ObjectStore();
    this.SDJS_select_primary_state_manager();
    GPP.clipboardManager = new ObjectStoreFactory().Create();
    // SDJS.Editor.PatchArrayBufferSlice();
    GPP.CURRENT_SEQ_OBJECT_ID = 0;

    console.log('=== SDJS_init_state_manager -> GPP', GPP);
  }

  static SDJS_select_primary_state_manager() {
    GPP.stateManager = GPP.stateManagerPrimary;
    GPP.objectStore = GPP.objectStorePrimary;
    GPP.CURRENT_SEQ_OBJECT_ID = GPP.CURRENT_SEQ_OBJECT_ID_Primary;
    GPP.bIsPrimaryStateManager = true;
  }

}

export default DataOpt
