

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
  static readonly stateManagerKey: string = "T3.stateManager";
  static readonly objectStoreKey: string = "T3.objectStore";

  // call this function to load data from localstorage after GPP is initialized

  static InitStoredData() {

    // init stateManagerPrimary
    this.InitStateManagerPrimary();

    this.InitObjectStorePrimary();

    this.InitClipboardManager();

    this.InitStateManager();
  }

  static InitStateManagerPrimary() {

    const stateManagerPrimaryStr = this.LoadData(this.stateManagerPrimaryKey);
    const stateManagerPrimaryJsonObj = JSON.parse(stateManagerPrimaryStr);

    const stateManagerPrimaryCls = plainToInstance(StateManager, stateManagerPrimaryJsonObj);

    for (let i = 0; i < stateManagerPrimaryCls.States.length; i++) {

      const stateCls = plainToInstance(State, stateManagerPrimaryCls.States[i]);

      for (let j = 0; j < stateCls.StoredObjects.length; j++) {

        const storedObjectCls = plainToInstance(StoredObject, stateCls.StoredObjects[j]);
        const storedObjectData = storedObjectCls.Data;

        if (storedObjectData.Type === 'SEDSession') {
          const sedSessionData = plainToInstance(SEDSession, storedObjectData);
          storedObjectCls.Data = sedSessionData;

          console.log('sedSessionData', sedSessionData);
        }

        if (storedObjectData.Type === 'LayersManager') {
          const layersManagerData = plainToInstance(LayersManager, storedObjectData);
          storedObjectCls.Data = layersManagerData;

          console.log('layersManagerData', layersManagerData);
        }

        if (storedObjectData.Type === 'TEDSession') {
          const tedSessionData = plainToInstance(TEDSession, storedObjectData);
          storedObjectCls.Data = tedSessionData;

          console.log('tedSessionData', tedSessionData);
        }

        if (storedObjectData.Type === 'BaseDrawingObject') {

          // SHAPE: 0, LINE: 1,  CONNECTOR: 3
          if (storedObjectData.DrawingObjectBaseClass === 1) {
            const lineData = plainToInstance(Instance.Shape.Line, storedObjectData);
            storedObjectCls.Data = lineData;

            console.log('lineData', lineData);
          }

          if (storedObjectData.DrawingObjectBaseClass === 0) {
            if (storedObjectData.ShapeType === 'Oval') {

              const ovalData = plainToInstance(Instance.Shape.Oval, storedObjectData);
              storedObjectCls.Data = ovalData;

              console.log('ovalData', ovalData);
            }

            if (storedObjectData.ShapeType === 'Rect') {

              const rectData = plainToInstance(Instance.Shape.Rect, storedObjectData);
              storedObjectCls.Data = rectData;

              console.log('rectData', rectData);
            }

            if (storedObjectData.ShapeType === 'Polygon') {

              const polygonData = plainToInstance(Instance.Shape.Polygon, storedObjectData);
              storedObjectCls.Data = polygon

            }

            const statesJsonObj = stateManagerPrimaryJsonObj.States;
            const statesCls = plainToInstance(State, statesJsonObj);

            for (let i = 0; i < statesJsonObj.length; i++) {
              const storedObjectsJsonObj = statesJsonObj[i].StoredObjects;

              for (let j = 0; j < storedObjectsJsonObj.length; j++) {

                const storedObjectCls = plainToInstance(StoredObject, storedObjectsJsonObj[j]);

                const storedObjectData = storedObjectsJsonObj[j].Data;

                if (storedObjectData.Type === 'SEDSession') {
                  const sedSessionData = plainToInstance(SEDSession, storedObjectData);
                  storedObjectCls.Data = sedSessionData;

                  console.log('sedSessionData', sedSessionData);
                }

                if (storedObjectData.Type === 'LayersManager') {
                  const layersManagerData = plainToInstance(LayersManager, storedObjectData);
                  storedObjectCls.Data = layersManagerData;

                  console.log('layersManagerData', layersManagerData);
                }

                if (storedObjectData.Type === 'TEDSession') {
                  const tedSessionData = plainToInstance(TEDSession, storedObjectData);
                  storedObjectCls.Data = tedSessionData;

                  console.log('tedSessionData', tedSessionData);
                }

                if (storedObjectData.Type === 'BaseDrawingObject') {

                  // SHAPE: 0, LINE: 1,  CONNECTOR: 3
                  if (storedObjectData.DrawingObjectBaseClass === 1) {
                    const lineData = plainToInstance(Instance.Shape.Line, storedObjectData);
                    storedObjectCls.Data = lineData;

                    console.log('lineData', lineData);
                  }

                  if (storedObjectData.DrawingObjectBaseClass === 0) {
                    if (storedObjectData.ShapeType === 'Oval') {

                      const ovalData = plainToInstance(Instance.Shape.Oval, storedObjectData);
                      storedObjectCls.Data = ovalData;

                      console.log('ovalData', ovalData);
                    }

                    if (storedObjectData.ShapeType === 'Rect') {

                      const rectData = plainToInstance(Instance.Shape.Rect, storedObjectData);
                      storedObjectCls.Data = rectData;

                      console.log('rectData', rectData);
                    }

                    if (storedObjectData.ShapeType === 'Polygon') {

                      const polygonData = plainToInstance(Instance.Shape.Polygon, storedObjectData);
                      storedObjectCls.Data = polygonData;

                      console.log('polygonData', polygonData);
                    }

                    if (storedObjectData.ShapeType === "PolyLineContainer") {
                      const polyLineContainerData = plainToInstance(Instance.Shape.PolyLineContainer, storedObjectData);
                      storedObjectCls.Data = polyLineContainerData;

                      console.log('polyLineContainerData', polyLineContainerData);
                    }
                  }

                  if (storedObjectData.DrawingObjectBaseClass === 3) {
                    const connectorData = plainToInstance(Instance.Shape.Connector, storedObjectData);
                    storedObjectCls.Data = connectorData;

                    console.log('connectorData', connectorData);
                  }
                }

                statesCls[i][j].StoredObjects.push(storedObjectCls);

                console.log('storedObjectCls');
              }

            }
          }
        }

        // stateCls.StoredObjects[j] = storedObjectCls;
      }
    }
  }

  static InitObjectStorePrimary() {

  }

  static InitClipboardManager() {

  }

  static InitStateManager() {

  }

  static InitObjectStore() {

  }

  static SaveToLocal() {

    debugger

    this.InitStateManagerPrimary();

    return;

    // save stateManagePrimary
    this.SaveData(this.stateManagerPrimaryKey, GPP.stateManagerPrimary);

    // save objectStorePrimary
    this.SaveData(this.objectStorePrimaryKey, GPP.objectStorePrimary);

    // save clipboardManager
    this.SaveData(this.clipboardManagerKey, GPP.clipboardManager);

    // save stateManager
    this.SaveData(this.stateManagerKey, GPP.stateManager);

    // save objectStore
    this.SaveData(this.objectStoreKey, GPP.objectStore);

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
