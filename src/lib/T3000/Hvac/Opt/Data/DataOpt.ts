

import { plainToInstance } from 'class-transformer'
import 'reflect-metadata'
import T3Gv from '../../Data/T3Gv'
import StateOpt from '../../Data/State/StateOpt'
import ObjectStore from '../../Data/State/ObjectStore'
import ObjectStoreFactory from '../../Data/State/ObjectStoreFactory'
import State from '../../Data/State/State'
import StoredObject from '../../Data/State/StoredObject'
import SEDSession from '../../Model/SEDSession'
import LayersManager from '../../Model/LayersManager'
import TEDSession from '../../Model/TEDSession'
import Instance from '../../Data/Instance/Instance'

class DataOpt {

  /**
   * Constant key for storing clipboard data in localStorage
   */
  static readonly CLIPBOARD_KEY: string = "T3.clipboard";

  /**
   * Constant key for storing state data in localStorage
   */
  static readonly STATE_KEY: string = "T3.state";

  /**
   * Constant key for storing object store data in localStorage
   */
  static readonly OBJECT_STORE_KEY: string = "T3.objectStore";

  /**
   * Constant key for storing current object sequence ID in localStorage
   */
  static readonly CURRENT_OBJECT_SEQ_ID_KEY: string = "T3.currentObjSeqId";

  /**
   * Initializes all stored data from localStorage after global data has been initialized
   * Loads state, clipboard, object store, and sequence ID data
   */
  static InitStoredData(): void {
    this.InitClipboard();
    this.InitState();
    this.InitObjectStore();
    this.InitCurrentSequenceId();
  }

  /**
   * Initializes the clipboard
   * Currently empty implementation placeholder
   */
  static InitClipboard(): void {
    // Implementation not yet provided
  }

  /**
   * Initializes the state by loading state data from localStorage
   * Converts JSON objects to their appropriate class instances
   */
  static InitState(): void {
    const stateJson = this.LoadData(this.STATE_KEY);

    if (stateJson === null) {
      return;
    }

    const stateVal = plainToInstance(StateOpt, stateJson);

    for (let i = 0; i < stateVal.States.length; i++) {
      const state = plainToInstance(State, stateVal.States[i]);

      for (let j = 0; j < state.StoredObjects.length; j++) {
        const storedObject = this.ConvertStoredObject(state.StoredObjects[j]);
        state.StoredObjects[j] = storedObject as unknown as ObjectStore;
      }

      stateVal.States[i] = state;
    }

    T3Gv.state = stateVal;
  }

  /**
   * Initializes the object store by loading data from localStorage
   * Converts stored JSON objects to their appropriate class instances
   */
  static InitObjectStore(): void {
    const objectStoreJson = this.LoadData(this.OBJECT_STORE_KEY);

    if (objectStoreJson === null) {
      return;
    }

    const objectStore = plainToInstance(ObjectStore, objectStoreJson);

    for (let i = 0; i < objectStore.StoredObjects.length; i++) {
      const storedObject = this.ConvertStoredObject(objectStore.StoredObjects[i]);
      objectStore.StoredObjects[i] = storedObject as unknown as ObjectStore;
    }

    T3Gv.stdObj = objectStore;
  }

  /**
   * Initializes the current sequence object ID from localStorage
   */
  static InitCurrentSequenceId(): void {
    const currentSequenceIdJson = this.LoadData(this.CURRENT_OBJECT_SEQ_ID_KEY);

    if (currentSequenceIdJson === null) {
      return;
    }

    T3Gv.currentObjSeqId = currentSequenceIdJson;
  }

  /**
   * Converts stored object JSON to appropriate class instances based on type
   * @param storedObjectJson - The stored object in JSON format
   * @returns The converted stored object instance
   */
  static ConvertStoredObject(storedObjectJson: any): StoredObject {
    const storedObject = plainToInstance(StoredObject, storedObjectJson);
    const objectData = storedObject.Data;

    if (objectData.Type === 'SEDSession') {
      const sedSessionData = plainToInstance(SEDSession, objectData);
      storedObject.Data = sedSessionData;
      storedObject.Data.dimensions = 146;
    }

    if (objectData.Type === 'LayersManager') {
      const layersManagerData = plainToInstance(LayersManager, objectData);
      storedObject.Data = layersManagerData;
    }

    if (objectData.Type === 'TEDSession') {
      const tedSessionData = plainToInstance(TEDSession, objectData);
      storedObject.Data = tedSessionData;
    }

    if (objectData.Type === 'BaseDrawingObject') {
      // SHAPE: 0, LINE: 1, CONNECTOR: 3
      if (objectData.DrawingObjectBaseClass === 1) {
        if (objectData?.T3Type === "PolyLineContainer") {
          const polyLineContainerData = plainToInstance(Instance.Shape.PolyLineContainer, objectData);
          storedObject.Data = polyLineContainerData;
        } else {
          const lineData = plainToInstance(Instance.Shape.Line, objectData);
          storedObject.Data = lineData;
        }
      }

      if (objectData.DrawingObjectBaseClass === 0) {
        if (objectData.ShapeType === 'Oval') {
          const ovalData = plainToInstance(Instance.Shape.Oval, objectData);
          storedObject.Data = ovalData;
        }

        if (objectData.ShapeType === 'Rect') {
          const rectData = plainToInstance(Instance.Shape.Rect, objectData);
          storedObject.Data = rectData;
        }

        if (objectData.ShapeType === 'Polygon') {
          const polygonData = plainToInstance(Instance.Shape.Polygon, objectData);
          storedObject.Data = polygonData;
        }
      }

      if (objectData.DrawingObjectBaseClass === 3) {
        const connectorData = plainToInstance(Instance.Shape.Connector, objectData);
        storedObject.Data = connectorData;
      }
    }

    return storedObject;
  }

  /**
   * Saves all current application data to localStorage
   * Includes clipboard, state, object store and current object sequence ID
   */
  static SaveToLocalStorage(): void {
    const visibleZList = T3Gv.opt.VisibleZList();

    // Save clipboard
    this.SaveData(this.CLIPBOARD_KEY, T3Gv.clipboard);

    // Save state
    this.SaveData(this.STATE_KEY, T3Gv.state);

    // Save object store
    this.SaveData(this.OBJECT_STORE_KEY, T3Gv.stdObj);

    // Save current object sequence ID
    this.SaveData(this.CURRENT_OBJECT_SEQ_ID_KEY, T3Gv.currentObjSeqId);
  }

  /**
   * Saves data to T3000 system
   * Currently empty implementation placeholder
   */
  static SaveToT3000(): void {
    // Implementation not yet provided
  }

  /**
   * Loads data from localStorage by key
   * @param key - The storage key to retrieve data from
   * @returns The parsed data or null if not found
   */
  static LoadData(key: string): any {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Saves data to localStorage by key
   * @param key - The storage key to save data under
   * @param data - The data to be stored
   */
  static SaveData(key: string, data: any): void {
    if (data) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  /**
   * Initializes state and object store with default values
   * Creates new instances of state, object store, and clipboard
   */
  static InitStateAndStore(): void {
    T3Gv.state = new StateOpt();
    T3Gv.stdObj = new ObjectStore();
    T3Gv.currentObjSeqId = 0;
    T3Gv.clipboard = new ObjectStoreFactory().Create();
  }
}

export default DataOpt
