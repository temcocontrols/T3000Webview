

import { plainToInstance } from 'class-transformer'
import 'reflect-metadata'
import T3Gv from '../../Data/T3Gv'
import StateOpt from '../../Data/State/StateOpt'
import DataStore from '../../Data/State/DataStore'
import DataStoreFactory from '../../Data/State/DataStoreFactory'
import State from '../../Data/State/State'
import DataObj from '../../Data/State/DataObj'
import SDData from '../../Model/SDData'
import LayersManager from '../../Model/LayersManager'
import TEData from '../../Model/TEData'
import Instance from '../../Data/Instance/Instance'
import LayerUtil from '../Opt/LayerUtil'
import { appStateV2, globalMsg, isBuiltInEdge, rulersGridVisible } from '../../Data/T3Data'
import { cloneDeep } from 'lodash'
import { toRaw } from 'vue'
import Hvac from '../../Hvac'
import Utils1 from '../../Util/Utils1'
import T3Util from '../../Util/T3Util'
import OptConstant from '../../Data/Constant/OptConstant'

/**
 * Class for managing data operations in T3000 HVAC system.
 *
 * This utility class handles persistent storage operations between the application
 * and localStorage, managing application state, clipboard content, object stores,
 * and sequence IDs. It provides methods for initializing, saving, and converting
 * stored data.
 *
 * @example
 * // Initialize all stored data from localStorage
 * DataOpt.InitStoredData();
 *
 * @example
 * // Save all application data to localStorage
 * DataOpt.SaveToLocalStorage();
 *
 * @example
 * // Initialize state and object store with default values
 * DataOpt.InitStateAndStore();
 *
 * @example
 * // Load and save specific data
 * const savedState = DataOpt.LoadData(DataOpt.STATE_KEY);
 * DataOpt.SaveData(DataOpt.STATE_KEY, newState);
 */
class DataOpt {

  //Constant key for storing clipboard data in localStorage
  static readonly CLIPBOARD_KEY: string = "t3.clipboard";

  //Constant key for storing state data in localStorage
  static readonly STATE_KEY: string = "t3.state";

  //Constant key for storing object store data in localStorage
  static readonly OBJECT_STORE_KEY: string = "t3.dataStore";

  //Constant key for storing current object sequence ID in localStorage
  static readonly CURRENT_OBJECT_SEQ_ID_KEY: string = "t3.currentObjSeqId";

  static readonly APP_STATE_V2: string = "t3.stateV2";
  static readonly DRAW_KEY: string = "t3.draw";

  /**
   * Initializes all stored data from localStorage after global data has been initialized
   * Loads state, clipboard, object store, and sequence ID data
   */
  static InitStoredData(): void {
    this.InitClipboard();
    this.InitState();
    this.InitDataStore();
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

    for (let i = 0; i < stateVal.states.length; i++) {
      const state = plainToInstance(State, stateVal.states[i]);

      for (let j = 0; j < state.storedObjects.length; j++) {
        const storedObject = this.ConvertStoredObject(state.storedObjects[j]);
        state.storedObjects[j] = storedObject as unknown as DataStore;
      }

      stateVal.states[i] = state;
    }

    T3Gv.state = stateVal;
  }

  /**
   * Initializes the object store by loading data from localStorage
   * Converts stored JSON objects to their appropriate class instances
   */
  static InitDataStore(): void {
    const dataStoreJson = this.LoadData(this.OBJECT_STORE_KEY);

    if (dataStoreJson === null) {
      return;
    }

    const dataStore = plainToInstance(DataStore, dataStoreJson);

    for (let i = 0; i < dataStore.storedObjects.length; i++) {
      const storedObject = this.ConvertStoredObject(dataStore.storedObjects[i]);
      dataStore.storedObjects[i] = storedObject as unknown as DataStore;
    }

    T3Gv.stdObj = dataStore;
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
  static ConvertStoredObject(storedObjectJson: any): DataObj {
    const storedObject = plainToInstance(DataObj, storedObjectJson);
    const objectData = storedObject.Data;

    //SelectedList / Links

    if (objectData.Type === 'SDData') {
      const sdDataData = plainToInstance(SDData, objectData);
      storedObject.Data = sdDataData;

      // Do not show the dimensions
      // storedObject.Data.dimensions = 146;
    }

    if (objectData.Type === 'LayersManager') {
      const layersManagerData = plainToInstance(LayersManager, objectData);
      storedObject.Data = layersManagerData;
    }

    if (objectData.Type === 'TEData') {
      const tDataData = plainToInstance(TEData, objectData);
      storedObject.Data = tDataData;
    }

    if (objectData.Type === 'BaseDrawObject') {
      // SHAPE: 0, LINE: 1, CONNECTOR: 3
      if (objectData.DrawingObjectBaseClass === 1) {
        if (objectData?.T3Type === "PolyLineContainer") {
          const polyLineContainerData = plainToInstance(Instance.Shape.PolyLineContainer, objectData);
          storedObject.Data = polyLineContainerData;
        } else {
          const lineType = objectData.LineType;

          if (lineType == OptConstant.LineType.LINE) {
            //1
            const lineData = plainToInstance(Instance.Shape.Line, objectData);
            storedObject.Data = lineData;
          }

          if (lineType == OptConstant.LineType.ARCLINE) {
            //2
            const lineData = plainToInstance(Instance.Shape.ArcLine, objectData);
            storedObject.Data = lineData;
          }

          if (lineType == OptConstant.LineType.SEGLINE) {
            //3
            const lineData = plainToInstance(Instance.Shape.SegmentedLine, objectData);
            storedObject.Data = lineData;
          }

          if (lineType == OptConstant.LineType.ARCSEGLINE) {
            //4
            const lineData = plainToInstance(Instance.Shape.ArcSegmentedLine, objectData);
            storedObject.Data = lineData;
          }

          if (lineType == OptConstant.LineType.POLYLINE) {
            //5
            const lineData = plainToInstance(Instance.Shape.PolyLine, objectData);
            storedObject.Data = lineData;
          }

          if (lineType == OptConstant.LineType.FREEHAND) {
            const lineData = plainToInstance(Instance.Shape.FreehandLine, objectData);
            storedObject.Data = lineData;
          }
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

        if (objectData.ShapeType === "GroupSymbol") {
          const groupSymbolData = plainToInstance(Instance.Shape.GroupSymbol, objectData);
          storedObject.Data = groupSymbolData;
        }

        if (objectData.ShapeType === "SvgSymbol") {
          const svgSymbolData = plainToInstance(Instance.Shape.SvgSymbol, objectData);
          storedObject.Data = svgSymbolData;
        }

        if (objectData.ShapeType === "ForeignObject") {
          const svgForeignObjectData = plainToInstance(Instance.Shape.ForeignObject, objectData);
          storedObject.Data = svgForeignObjectData;
        }
      }

      if (objectData.DrawingObjectBaseClass === 3) {
        const connectorData = plainToInstance(Instance.Shape.Connector, objectData);
        storedObject.Data = connectorData;
      }
    }

    return storedObject;
  }

  static ConvertPlanObjectToShape(dataObj: any) {

    let shapeData;

    if (dataObj.Type === 'BaseDrawObject') {
      // SHAPE: 0, LINE: 1, CONNECTOR: 3
      if (dataObj.DrawingObjectBaseClass === 1) {
        if (dataObj?.T3Type === "PolyLineContainer") {
          const polyLineContainerData = plainToInstance(Instance.Shape.PolyLineContainer, dataObj);
          shapeData = polyLineContainerData;
        } else {

          const lineType = dataObj.LineType;

          if (lineType == OptConstant.LineType.LINE) {
            //1
            const lineData = plainToInstance(Instance.Shape.Line, dataObj);
            shapeData = lineData;
          }

          if (lineType == OptConstant.LineType.ARCLINE) {
            //2
            const lineData = plainToInstance(Instance.Shape.ArcLine, dataObj);
            shapeData = lineData;
          }

          if (lineType == OptConstant.LineType.SEGLINE) {
            //3
            const lineData = plainToInstance(Instance.Shape.SegmentedLine, dataObj);
            shapeData = lineData;
          }

          if (lineType == OptConstant.LineType.ARCSEGLINE) {
            //4
            const lineData = plainToInstance(Instance.Shape.ArcSegmentedLine, dataObj);
            shapeData = lineData;
          }

          if (lineType == OptConstant.LineType.POLYLINE) {
            //5
            const lineData = plainToInstance(Instance.Shape.PolyLine, dataObj);
            shapeData = lineData;
          }

          if (lineType == OptConstant.LineType.FREEHAND) {
            const lineData = plainToInstance(Instance.Shape.FreehandLine, dataObj);
            shapeData = lineData;
          }
        }
      }

      if (dataObj.DrawingObjectBaseClass === 0) {
        if (dataObj.ShapeType === 'Oval') {
          const ovalData = plainToInstance(Instance.Shape.Oval, dataObj);
          shapeData = ovalData;
        }

        if (dataObj.ShapeType === 'Rect') {
          const rectData = plainToInstance(Instance.Shape.Rect, dataObj);
          shapeData = rectData;
        }

        if (dataObj.ShapeType === 'Polygon') {
          const polygonData = plainToInstance(Instance.Shape.Polygon, dataObj);
          shapeData = polygonData;
        }

        if (dataObj.ShapeType === "GroupSymbol") {
          const groupSymbolData = plainToInstance(Instance.Shape.GroupSymbol, dataObj);
          shapeData = groupSymbolData;
        }

        if (dataObj.ShapeType === "SvgSymbol") {
          const svgSymbolData = plainToInstance(Instance.Shape.SvgSymbol, dataObj);
          shapeData = svgSymbolData;
        }

        if (dataObj.ShapeType === "ForeignObject") {
          const svgForeignObjectData = plainToInstance(Instance.Shape.ForeignObject, dataObj);
          shapeData = svgForeignObjectData;
        }
      }

      if (dataObj.DrawingObjectBaseClass === 3) {
        const connectorData = plainToInstance(Instance.Shape.Connector, dataObj);
        shapeData = connectorData;
      }
    }

    return shapeData;
  }

  /**
   * Saves all current application data to localStorage
   * Includes clipboard, state, object store and current object sequence ID
   */
  static SaveToLocalStorage(): void {
    const visibleZList = LayerUtil.VisibleZList();

    // Save clipboard
    this.SaveData(this.CLIPBOARD_KEY, T3Gv.clipboard);

    // Save state
    this.SaveData(this.STATE_KEY, T3Gv.state);

    // Save object store
    this.SaveData(this.OBJECT_STORE_KEY, T3Gv.stdObj);

    // Save current object sequence ID
    this.SaveData(this.CURRENT_OBJECT_SEQ_ID_KEY, T3Gv.currentObjSeqId);

    this.SaveAppStateV2();
  }

  static PrepareSaveData() {
    const data = cloneDeep(toRaw(appStateV2.value));

    // Recalculate the items count
    data.itemsCount = data.items.filter(item => item.width !== 0).length;

    data.selectedTargets = [];
    data.elementGuidelines = [];
    data.rulersGridVisible = rulersGridVisible.value;

    return data;
  }

  /**
   * Saves data to T3000 system
   * Currently empty implementation placeholder
   */
  static SaveToT3000(): void {
    // Prepare data
    T3Util.Log('= O.DataOpt save to T3000');
    const data = this.PrepareSaveData();

    if (isBuiltInEdge.value) {
      Hvac.WebClient.SaveGraphicData(null, null, data);
    }
    else {
      const msgType = globalMsg.value.find((msg) => msg.msgType === "get_initial_data");
      if (msgType) {
        T3Util.Log('= O.DataOpt save to T3000 with initial data status error, cancel auto save');
        return;
      }

      // Post a save action to T3
      const currentDevice = Hvac.DeviceOpt.getCurrentDevice();
      const panelId = currentDevice?.deviceId;
      const graphicId = currentDevice?.graphic;

      if (panelId && graphicId) {
        Hvac.WsClient.SaveGraphic(panelId, graphicId, data);
      }
      else {
        T3Util.Log('= O.DataOpt save to T3000 current device is null');
      }
    }
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
    T3Gv.stdObj = new DataStore();
    T3Gv.currentObjSeqId = 0;
    T3Gv.clipboard = new DataStoreFactory().Create();
  }

  static SaveAppStateV2(): void {
    const stateV2 = appStateV2.value;
    this.SaveData(this.APP_STATE_V2, stateV2);
  }

  static LoadAppStateV2(): void {
    const stateV2 = this.LoadData(this.APP_STATE_V2);
    if (stateV2) {
      appStateV2.value = stateV2;
    }
  }

  static ClearT3LocalStorage(): void {
    localStorage.removeItem(this.CLIPBOARD_KEY);
    localStorage.removeItem(this.STATE_KEY);
    localStorage.removeItem(this.OBJECT_STORE_KEY);
    localStorage.removeItem(this.CURRENT_OBJECT_SEQ_ID_KEY);
    localStorage.removeItem(this.APP_STATE_V2);
    localStorage.removeItem(this.DRAW_KEY);
  }
}

export default DataOpt
