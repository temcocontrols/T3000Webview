

import { cloneDeep } from "lodash"
import MockData from "../../Data/MockData"
import PanelInfo from "./PanelInfo"
import DeviceItem from "./DeviceItem"

import { T3Data } from '../../Data/T3Data'
import { appState, emptyProject, deviceAppState, deviceModel, rulersGridVisible } from '../../Data/T3Data'
import LsOpt from "../Common/LsOpt"
import T3Util from "../../Util/T3Util"
import LogUtil from "../../Util/LogUtil"

class DeviceOpt {

  // Local storage operations
  private lsOpt: LsOpt;

  // mock data
  public mockDeviceList: {};
  public mockGraphicList: {};

  // the field used for ui rendering with QUASAR library
  public panelList: PanelInfo[];

  // should use T3Data's ref fields [deviceList & graphicList] for ui automatically refreshing
  // keep the 2 local fields here, just in case the value will be used for some other functions
  public deviceList: DeviceItem[];
  public graphicList: [];

  public currentDevice: {};

  constructor() {
    this.lsOpt = new LsOpt();
    this.mockDeviceList = MockData.DeviceList;
    this.mockGraphicList = MockData.GraphicList;
    this.panelList = [];
    this.deviceList = [];
    this.graphicList = [];
    this.currentDevice = {};
  }

  // init data with real panel list
  initPanelList(plList) {

    if (plList === undefined || plList === null) {
      return;
    }

    /*
    {
      "object_instance": 237219,
      "online_time": 1736432605,
      "panel_name": "T3-XX-ESP",
      "panel_number": 1,
      "pid": 88,
      "serial_number": 237219
    }
    */

    // const jsonData = JSON.parse(plList);

    const panelInfoList: PanelInfo[] = plList.map(panel => {
      const panelInfo = new PanelInfo();
      panelInfo.object_instance = panel.object_instance;
      panelInfo.online_time = panel.online_time;
      panelInfo.panel_name = panel.panel_name;
      panelInfo.panel_number = panel.panel_number;
      panelInfo.pid = panel.pid;
      panelInfo.serial_number = panel.serial_number;
      return panelInfo;
    });

    this.panelList = panelInfoList;
  }

  initDeviceList(plList) {
    this.initPanelList(plList);

    /*
    [
      {
        id: 0,
        label: 'All Devices',
        icon: 'devices',
        children:
        [
          {
            id: 1,
            label: 'T3-XX-ESP 1',
            icon: 'horizontal_rule',
          }
        ]
      }
    ]
    */

    const deviceItems = this.panelList.map(panel => {
      const deviceItem = new DeviceItem();
      deviceItem.initData(panel.panel_number, panel.panel_name, 'horizontal_rule', [], panel);
      return deviceItem;
    });

    const di = new DeviceItem();
    di.initData(-1, "All Devices", "devices", deviceItems, {});

    this.deviceList = [di];

    T3Data.deviceList.value = this.deviceList;
  }

  // init graphic list for ui rendering
  initGraphicList(gphList) {

    LogUtil.Debug('= Dvopt t3 graphic data', gphList);

    // load graphic list from GET_PANEL_DATA_RES
    // { command: "1GRP2", description: "Test2", id: "GRP2", index: 1, label: "TEST2", pid: 1 }
    // { id, fullLabel, label, elementCount}
    const graphicItems = gphList.filter(graphic => graphic.id.startsWith('GRP')).slice(0, 8);

    const transformedGraphicItems = graphicItems.map(graphic => ({
      id: graphic.id.includes('GRP') ? parseInt(graphic.id.replace('GRP', ''), 10) : parseInt(graphic.id, 10),
      fullLabel: graphic.description || '',
      label: graphic.label || '',
      elementCount: Number(graphic.count) || 0// this.calculateElementCount(graphic.id) || 0
    }));

    LogUtil.Debug('= Dvopt t3 transformedGraphicItems', transformedGraphicItems);

    this.graphicList = transformedGraphicItems;
    T3Data.graphicList.value = transformedGraphicItems;

    LogUtil.Debug('= Dvopt t3 graphicList', T3Data.graphicList.value);
  }

  calculateElementCount(graphicId) {

    const currentDevice = T3Data.currentDevice.value;
    if (!currentDevice) {
      return 0;
    }

    const deviceAppStateLS = this.lsOpt.loadDeviceAppStateLS();

    if (deviceAppStateLS) {
      const device = deviceAppStateLS.find(
        opt =>
          opt?.device?.deviceId === currentDevice?.deviceId &&
          opt?.device?.graphic === graphicId
      );

      if (device) {
        return device.appState.items.length;
      }
    }

    return 0;
  }

  // sync the t3 appstate data to ls [deviceAppState]
  syncTempAppStateToDeviceAppState() {
    const tempAppState = localStorage.getItem('tempAppState');
    const currentDevice = this.getCurrentDevice();

    if (!tempAppState || !currentDevice) return;

    const parsedTempAppState = JSON.parse(tempAppState);
    const deviceAppStateLS = this.lsOpt.loadDeviceAppStateLS() || [];

    const deviceIndex = deviceAppStateLS.findIndex(
      opt =>
        opt?.device?.device === currentDevice?.device &&
        opt?.device?.graphic === currentDevice?.graphic
    );

    if (deviceIndex !== -1) {
      deviceAppStateLS[deviceIndex].appState = parsedTempAppState;
    } else {
      deviceAppStateLS.push({ device: currentDevice, appState: parsedTempAppState });
    }

    localStorage.setItem('deviceAppState', JSON.stringify(deviceAppStateLS));
  }

  saveCurrentDevice(selectDevice) {
    localStorage.setItem('currentDevice', JSON.stringify(selectDevice))
  }

  getCurrentDevice() {
    const currentDevice = localStorage.getItem('currentDevice');

    if (currentDevice) {
      return JSON.parse(localStorage.getItem('currentDevice'))
    }
    else {
      return null;
    }
  }

  saveAppState(appstate) {
    localStorage.setItem('appState', JSON.stringify(appstate))
  }

  findAllNodes(nodes, target) {
    for (const node of nodes) {
      if (node.label === target) {
        return node;
      }
      if (node.children) {
        const found = this.findAllNodes(node.children, target);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  setDeviceAndGraphicDefaultData(currentDevice) {
    const selectedNode = this.findAllNodes(T3Data.deviceList.value, currentDevice.device);
    if (selectedNode) {
      selectedNode.icon = 'check';
    }
  }

  // use "deviceModel" as a ref here, when do updating it's value, it will also update the ui component value
  saveDeviceAppState(deviceAppState, deviceModel, appState) {

    // deviceAppState.value = [{ device: {}, appState: {} }];
    let currentDevice = deviceModel.value.data;

    // load from local storage if not exist // TODO: why the passed currentDevice is empty?
    if (!currentDevice.device) {
      currentDevice = this.getCurrentDevice();

      if (currentDevice === null) {
        return;
      }
    }

    // check whether the deviceAppState exists in local storage
    const deviceAppStateLS = this.lsOpt.loadDeviceAppStateLS();

    if (deviceAppStateLS !== null) {
      deviceAppState.value = deviceAppStateLS;
    }

    const deviceExists = deviceAppState.value.some(
      opt =>
        opt?.device?.device === currentDevice?.device &&
        opt?.device?.graphic === currentDevice?.graphic
    )

    if (!deviceExists) {
      const newAppState = cloneDeep(appState);
      const dasItem = { device: currentDevice, appState: newAppState };
      deviceAppState.value.push(dasItem);
    }
    else {
      deviceAppState.value.forEach(opt => {
        const check = opt?.device?.device === currentDevice?.device && opt?.device?.graphic === currentDevice?.graphic;
        if (check) {
          const newAppState = cloneDeep(appState);
          opt.appState = newAppState;
        }
      });
    }

    // localStorage.setItem('deviceAppState', JSON.stringify(deviceAppState.value));
    this.lsOpt.saveDeviceAppState(deviceAppState.value);

    // load the element count
    this.refreshCurrentDeviceCount(deviceModel);
  }

  loadDeviceAppState(deviceAppState, currentDevice, appState) {

    // check whether the deviceAppState exists in local storage
    const deviceAppStateLS = this.lsOpt.loadDeviceAppStateLS();

    if (deviceAppStateLS !== null) {
      deviceAppState.value = deviceAppStateLS;
    }

    const device = deviceAppState.value.find(
      opt =>
        opt?.device?.device === currentDevice?.device &&
        opt?.device?.graphic === currentDevice?.graphic);

    if (device) {
      const newAppState = cloneDeep(device.appState);
      newAppState.selectedTarget = [];
      newAppState.selectedTargets = [];
      newAppState.activeItemIndex = -1;
      return newAppState;//device.appState;
    }
  }

  // rest the device count
  refreshCurrentDeviceCount(deviceModel) {

    // current device's element count
    const appStateLs = this.lsOpt.loadDeviceAppStateLS();
    const currentDevice = this.getCurrentDevice();

    if (appStateLs) {
      appStateLs.forEach(opt => {
        if (opt?.device?.device === currentDevice?.device && opt?.device?.graphic === currentDevice?.graphic) {
          const elementCount = opt?.appState?.items?.length ?? 0;

          //{"device":"T3-XX-ESP 1","graphic":1,"graphicFull":{"id":"1","fullLabel":"Graphic full label 1","label":"label 1","elementCount":"0"}}
          currentDevice.graphicFull.elementCount = elementCount;
          deviceModel.value.data = currentDevice;
          return;
        }
      });

      localStorage.setItem('currentDevice', JSON.stringify(currentDevice));
    }
  }

  // Refresh the graphic panel element count
  refreshGraphicPanelElementCount(currentDevice) {

    const appStateLs = this.lsOpt.loadDeviceAppStateLS();
    if (!appStateLs) return;

    /*
    const canRefresh = currentDevice?.device && appStateLs;

    if (!canRefresh) {
      this.clearGraphicPanelElementCount();
      return;
    }
    */

    const lsGraphic = appStateLs.filter(opt => opt?.device?.device === currentDevice?.device);

    // clear the value first, reset the element count base on the current device info
    // this.clearGraphicPanelElementCount();

    T3Data.graphicList.value.forEach(graphic => {
      const graphicValue = lsGraphic.find(opt => opt?.device?.graphic === graphic.id);

      if (graphicValue) {
        const elementCount = graphicValue?.appState?.items?.length ?? 0;
        graphic.elementCount = elementCount;
      }
    })

    LogUtil.Debug('= Dvopt refresh element count', T3Data.graphicList.value);
  }

  clearGraphicPanelElementCount() {
    T3Data.graphicList.value.forEach(graphic => {
      graphic.elementCount = 0;
    });
  }

  // clear dirty current device data, checked the device without save to local storage
  clearDirtyCurrentDevice() {
    const currentDevice = this.getCurrentDevice();

    if (T3Data.deviceList.value.length > 0) {
      T3Data.deviceList.value[0].children.forEach(device => {

        if (device.icon === 'check') {
          if (device.label !== currentDevice.device) {
            device.icon = 'horizontal_rule';
          }
        }
      });
    }
  }

  // load graphic panel data from hardware device（T3000)
  loadGraphicPanelData(currentDevice) {

    // TODO post message to 9104 to get the panel data (id, full label, label, picture file, element count)

    // temperary to set the mock data

    MockData.GraphicList.forEach(graphic => {
      graphic.fullLabel = `${currentDevice.device} mock real ${graphic.id}`;
      graphic.label = `mock real ${graphic.id}`;
      graphic.pictureFile = '';
      graphic.elementCount = 0;
    });
  }

  // get the serial number of the panel
  getSerialNumber(panelId) {

    let serialNumber = -1;

    if (T3Data.deviceList.value.length === 0) {
      const currentDevice = this.getCurrentDevice();
      serialNumber = currentDevice?.serialNumber ?? -1;
    }
    else {
      const device = T3Data.deviceList.value[0]?.children?.find(itx => itx.pl.panel_number === panelId);
      if (device) {
        serialNumber = device.pl.serial_number;
      }
    }

    return serialNumber;
  }

  // reset the ls deviceAppState related value
  refreshDeviceAppState() {

    LogUtil.Debug('= Dvopt: refreshDeviceAppState / start to refresh deviceAppState');

    const existAppState = this.loadDeviceAppState(deviceAppState, deviceModel.value.data, null);

    LogUtil.Debug('= Dvopt: refreshDeviceAppState / existAppState', existAppState);

    if (existAppState) {
      // appState.value = cloneDeep(existAppState);
      appState.value = existAppState;
    }
    else {
      appState.value = cloneDeep(emptyProject);
      appState.value.rulersGridVisible = rulersGridVisible.value;
    }

    LogUtil.Debug('= Dvopt: refreshDeviceAppState / appState.value', appState.value);

    // save or update the latest appState to local storage
    this.saveAppState(appState.value);

    // reset the rulersGridVisible value
    rulersGridVisible.value = appState.value?.rulersGridVisible ?? false;
  }

  /*
  // reset the ls deviceAppState related value
  refreshDeviceAppState() {
    this.saveDeviceAppState(deviceAppState, deviceModel, appState);
  }
  */

  refreshCurrentDevice() {
    const currentDevice = this.getCurrentDevice();

    const appStateElmCount = appState.value.items.length;
    const graphicElmCount = currentDevice.graphicFull.elementCount;
    const needRefresh = appStateElmCount !== graphicElmCount;

    if (needRefresh) {
      currentDevice.graphicFull.elementCount = appStateElmCount;
      this.saveCurrentDevice(currentDevice);
    }
  }

  // Set the appSate value to an empty project, and update the ls deviceAppState related value, and merge the responsed data
  // by checking action=GET_INITIAL_DATA_RES into this appState when the T3000 has a correct feedback
  addPresetsData() {

    // set the tempAppState to empty project
    const emptyAppState = cloneDeep(emptyProject);
    localStorage.setItem('tempAppState', JSON.stringify(emptyAppState));

    LogUtil.Debug('= Dvopt: addPresetsData / set the tempAppState to empty project', emptyAppState);

    // get the current device info
    const currentDevice = this.getCurrentDevice();
    const crtDeviceName = currentDevice?.device ?? "-";
    const crtDeviceId = currentDevice?.deviceId ?? -1;
    const crtGraphicId = currentDevice?.graphic ?? -1;

    LogUtil.Debug('= Dvopt: addPresetsData / currentDevice', currentDevice);

    // reset the element count
    currentDevice.graphicFull.elementCount = 0;
    this.saveCurrentDevice(currentDevice);

    // set the appState value to empty project
    appState.value = cloneDeep(emptyProject);
    rulersGridVisible.value = false;

    LogUtil.Debug('= Dvopt: addPresetsData / set the appState value to empty project', appState.value);

    // when user changed the device, we should reset the appState value to empty project, the value should be import from T3000 via ws socket.
    this.saveAppState(appState.value);

    LogUtil.Debug('= Dvopt: addPresetsData / save the appState value to local storage', appState.value);

    // set the ls deviceAppState related value
    const deviceAppStateLS = this.lsOpt.loadDeviceAppStateLS();

    LogUtil.Debug('= Dvopt: addPresetsData / load deviceAppStateLS', deviceAppStateLS);

    if (!deviceAppStateLS) return;

    const deviceIndex = deviceAppStateLS.findIndex(
      opt =>
        opt?.device?.device === crtDeviceName &&
        opt?.device?.graphic === crtGraphicId
    );

    if (deviceIndex !== -1) {
      deviceAppStateLS[deviceIndex].appState = cloneDeep(emptyProject);
    }

    localStorage.setItem('deviceAppState', JSON.stringify(deviceAppStateLS));

    LogUtil.Debug('= Dvopt: addPresetsData / save the deviceAppState to local storage', deviceAppStateLS);
  }

  // Merge the responsed AppState to current AppState
  mergeAppState(msgAppData) {
    /*
    {
      version: process.env.VERSION,
      items: [],
      selectedTargets: [],
      elementGuidelines: [],
      itemsCount: 0,
      groupCount: 0,
      activeItemIndex: null,
      viewportTransform: { x: 0, y: 0, scale: 1 },
      rulersGridVisible: false
    }
    */

    if (!appState.value && !msgAppData) return;

    const version = appState.value.version;

    // reset the items object's id
    const existsMaxId = msgAppData.items.length > 0 ? Math.max(...msgAppData.items.map(itx => itx.id)) : 0;

    appState.value.items.forEach(itx => {
      itx.id = existsMaxId + itx.id;
    });

    const items = [...msgAppData.items, ...appState.value.items];
    const selectedTargets = [];//[...appState.value.selectedTargets, ...msgAppData.selectedTargets];
    const elementGuidelines = [];// [...appState.value.elementGuidelines, ...msgAppData.elementGuidelines];
    const itemsCount = appState.value.itemsCount + msgAppData.itemsCount;
    const groupCount = appState.value.groupCount + msgAppData.groupCount;
    const activeItemIndex = -1;// appState.value.activeItemIndex;
    const viewportTransform = appState.value.viewportTransform;
    const rulersGridVisible = appState.value.rulersGridVisible || msgAppData.rulersGridVisible;

    const mergedProject = {
      version,
      items,
      selectedTargets,
      elementGuidelines,
      itemsCount,
      groupCount,
      activeItemIndex,
      viewportTransform,
      rulersGridVisible
    }

    appState.value = mergedProject;

    this.saveAppState(appState.value);

    LogUtil.Debug('= Dvopt mergeAppState', appState.value);
  }

  // check for boardcast message whether the current device is the same as the one in the message data
  // cause we do boardcast all messages to all clients, so we need to check the current device
  isCurrentDeviceMessage(msgData) {

    const panelId = msgData?.panelId ?? -1;
    const viewitem = msgData?.viewitem ?? -1;
    const serialNumber = msgData?.serialNumber ?? -1;

    LogUtil.Debug('= Dvopt: isCurrentDeviceMessage / msgData', msgData);
    LogUtil.Debug('= Dvopt: isCurrentDeviceMessage / panelId,viewitem,serialNumber', panelId, viewitem, serialNumber);

    if (!panelId || !viewitem || !serialNumber) {
      LogUtil.Error('= Dvopt: isCurrentDeviceMessage / Invalid message data');
      return false;
    }

    const currentDevice = this.getCurrentDevice();
    LogUtil.Debug('= Dvopt: isCurrentDeviceMessage / currentDevice', currentDevice);

    if (!currentDevice) {
      LogUtil.Error('= Dvopt: isCurrentDeviceMessage / No current device found');
      return false;
    }

    // msgData=> panelId:3 , serialNumber:237451 , viewitem:1
    // currentDeviceData=> deviceId:3 , serialNumber:237451 , graphic:2

    const crtDeviceName = currentDevice?.device ?? "-";
    const crtPanelId = currentDevice?.deviceId ?? -1;
    const crtGraphicId = currentDevice?.graphic ?? -1;
    const crtSerialNumber = currentDevice?.serialNumber ?? -1;

    LogUtil.Debug('= Dvopt: isCurrentDeviceMessage / crtPanelId,crtGraphicId,crtSerialNumber', crtPanelId, crtGraphicId, crtSerialNumber);

    const isSamePanel = crtPanelId === panelId;
    const isSameSerial = crtSerialNumber === serialNumber;

    // viewitem is 0-based index in T3000, so we need to add 1 to match the graphic id
    const isSameViewItem = crtGraphicId === viewitem+1;

    LogUtil.Debug('= Dvopt: isCurrentDeviceMessage / isSamePanel', isSamePanel, 'isSameSerial', isSameSerial, 'isSameViewItem', isSameViewItem);
    return isSamePanel && isSameSerial && isSameViewItem;
  }
}

export default DeviceOpt
