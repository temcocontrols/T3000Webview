

import { cloneDeep } from "lodash"
import MockData from "../../Data/MockData"
import PanelInfo from "./PanelInfo"
import DeviceItem from "./DeviceItem"

import T3Data from '../../Data/T3Data'
import { appState, emptyProject, deviceAppState, deviceModel, rulersGridVisible } from '../../Data/T3Data'

class DeviceOpt {

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

    console.log('= Dvopt t3 graphic data', gphList);

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

    console.log('= Dvopt t3 transformedGraphicItems', transformedGraphicItems);

    this.graphicList = transformedGraphicItems;
    T3Data.graphicList.value = transformedGraphicItems;

    console.log('= Dvopt t3 graphicList', T3Data.graphicList.value);
  }

  calculateElementCount(graphicId) {

    const currentDevice = T3Data.currentDevice.value;
    if (!currentDevice) {
      return 0;
    }

    const deviceAppStateLS = this.loadDeviceAppStateLS();

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

    if (!tempAppState || !currentDevice) {
      return;
    }

    const parsedTempAppState = JSON.parse(tempAppState);
    const deviceAppStateLS = this.loadDeviceAppStateLS() || [];

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

  loadDeviceAppStateLS() {
    const deviceAppStateLS = localStorage.getItem('deviceAppState');
    if (deviceAppStateLS) {
      return JSON.parse(deviceAppStateLS);
    }
    return null;
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
    const deviceAppStateLS = this.loadDeviceAppStateLS();

    if (deviceAppStateLS !== null) {
      deviceAppState.value = deviceAppStateLS;
    }

    const deviceExists = deviceAppState.value.some(
      opt =>
        opt?.device?.device === currentDevice?.device &&
        opt?.device?.graphic === currentDevice?.graphic
    );
    if (!deviceExists) {

      // clear the selected target
      const newAppState = cloneDeep(appState);
      // newAppState.value.selectedTarget = [];

      const dasItem = { device: currentDevice, appState: newAppState };
      deviceAppState.value.push(dasItem);
    }
    else {
      deviceAppState.value.forEach(opt => {
        const check = opt?.device?.device === currentDevice?.device && opt?.device?.graphic === currentDevice?.graphic;
        if (check) {

          const newAppState = cloneDeep(appState);
          // newAppState.value.selectedTarget = [];
          opt.appState = newAppState;
        }
      });
    }

    localStorage.setItem('deviceAppState', JSON.stringify(deviceAppState.value));

    // load the element count
    this.refreshCurrentDeviceCount(deviceModel);
  }

  loadDeviceAppState(deviceAppState, currentDevice, appState) {

    // check whether the deviceAppState exists in local storage
    const deviceAppStateLS = this.loadDeviceAppStateLS();

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
    const appStateLs = this.loadDeviceAppStateLS();
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

    const appStateLs = this.loadDeviceAppStateLS();

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

    console.log('= Dvopt refresh element count', T3Data.graphicList.value);
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

  refreshDeviceAppState() {
    const existAppState = this.loadDeviceAppState(deviceAppState, deviceModel.value.data, null);
    // console.log('=== indexPage.refreshDeviceAppState === existAppState', existAppState);

    if (existAppState) {
      // appState.value = cloneDeep(existAppState);
      appState.value = existAppState;
    }
    else {
      appState.value = cloneDeep(emptyProject);
      appState.value.rulersGridVisible = rulersGridVisible.value;
    }

    // save or update the latest appState to local storage
    this.saveAppState(appState.value);

    // reset the rulersGridVisible value
    rulersGridVisible.value = appState.value?.rulersGridVisible ?? false;
  }

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
}

export default DeviceOpt
