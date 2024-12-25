

import GPP from '../Data/GlobalData'
import StateManager from '../Data/State/StateManager'
import ObjectStore from '../Data/State/ObjectStore'
import ObjectStoreFactory from '../Data/State/ObjectStoreFactory'
import { plainToClass, classToPlain, serialize, deserialize, plainToInstance, instanceToPlain } from 'class-transformer'
import 'reflect-metadata'
import State from './State/State'
import StoredObject from './State/StoredObject'
import SEDSession from '../Model/SEDSession'
import LayersManager from '../Model/LayersManager'
import TEDSession from '../Model/TEDSession'
import Instance from './Instance/Instance'


class DataOpt {

  static readonly stateManagerPrimaryKey: string = "T3.stateManagerPrimary";
  static readonly objectStorePrimaryKey: string = "T3.objectStorePrimary";
  static readonly clipboardManagerKey: string = "T3.clipboardManager";
  static readonly CURRENT_SEQ_OBJECT_IDKey: string = "T3.CURRENT_SEQ_OBJECT_ID";
  // static readonly stateManagerKey: string = "T3.stateManager";
  // static readonly objectStoreKey: string = "T3.objectStore";

  // call this function to load data from localstorage after GPP is initialized
  static InitStateManagerFromLocal() {

    return

    debugger

    // const t1 = serialize(GPP.stateManagerPrimary);
    // const t2 = deserialize(StateManager, t1);



    const testJson = localStorage.getItem(this.stateManagerPrimaryKey);
    const testObj = JSON.parse(testJson);
    const testInstance = plainToClass(StateManager, testObj);



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

    // GPP.stateManagerPrimary.RestoreObjectStoreFromState();
    // GPP.stateManager.RestoreObjectStoreFromState();
  }

  static SaveToLocal() {

    debugger

    // const ii1 = instanceToPlain(GPP.stateManagerPrimary);
    // const ii2 = plainToInstance(StateManager, ii1);

    const stateManagerPrimaryStr = JSON.stringify(GPP.stateManagerPrimary);

    const stateManagerPrimaryJsonObj = JSON.parse(stateManagerPrimaryStr);
    const stateManagerPrimaryCls = plainToInstance(StateManager, stateManagerPrimaryJsonObj);

    const statesJsonObj = stateManagerPrimaryJsonObj.States;
    const statesCls = plainToInstance(State, statesJsonObj);

    for (let i = 0; i < statesJsonObj.length; i++) {
      const storedObjectsJsonObj = statesJsonObj[i].StoredObjects;

      for (let j = 0; j < storedObjectsJsonObj.length; j++) {

        // const t1 = new StoredObject();

        const storedObjectCls = plainToInstance(StoredObject, storedObjectsJsonObj[j]);

        const storedObjectData = storedObjectsJsonObj[j].Data;

        if (storedObjectData.Type === 'SEDSession') {
          const sedSessionData = plainToInstance(SEDSession, storedObjectData);

          console.log('sedSessionData', sedSessionData);
        }

        if (storedObjectData.Type === 'LayersManager') {
          const layersManagerData = plainToInstance(LayersManager, storedObjectData);

          console.log('layersManagerData', layersManagerData);
        }

        if (storedObjectData.Type === 'TEDSession') {
          const tedSessionData = plainToInstance(TEDSession, storedObjectData);

          console.log('tedSessionData', tedSessionData);
        }

        if (storedObjectData.Type === 'BaseDrawingObject') {

          // SHAPE: 0, LINE: 1,  CONNECTOR: 3
          if (storedObjectData.DrawingObjectBaseClass === 1) {
            const lineData = plainToInstance(Instance.Shape.Line, storedObjectData);
            console.log('lineData', lineData);
          }

          if (storedObjectData.DrawingObjectBaseClass === 0) {
            if (storedObjectData.ShapeType === 'Oval') {

              const ovalData = plainToInstance(Instance.Shape.Oval, storedObjectData);

              console.log('ovalData', ovalData);
            }

            if (storedObjectData.ShapeType === 'Rect') {

              const rectData = plainToInstance(Instance.Shape.Rect, storedObjectData);

              console.log('rectData', rectData);
            }

            if (storedObjectData.ShapeType === 'Polygon') {

              const polygonData = plainToInstance(Instance.Shape.Polygon, storedObjectData);

              console.log('polygonData', polygonData);
            }


          }

          if (storedObjectData.DrawingObjectBaseClass === 3) {
            const connectorData = plainToInstance(Instance.Shape.Connector, storedObjectData);
            console.log('connectorData', connectorData);
          }
        }

        console.log('storedObjectCls');
      }
      // const storedObjectsCls = plainToInstance(StoredObject, storedObjectsJsonObj);

    }


    const m1 = JSON.stringify(GPP.stateManagerPrimary);
    const m2 = JSON.parse(m1);





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
