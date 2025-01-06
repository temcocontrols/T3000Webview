

import { cloneDeep } from "lodash";
import MockData from "../Data/MockData"

class DeviceOpt {

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
    const selectedNode = this.findAllNodes(MockData.DeviceList, currentDevice.device);
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

  saveDeviceAppState(deviceAppState, currentDevice, appState) {

    // deviceAppState.value = [{ device: {}, appState: {} }];

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

    const deviceExists = deviceAppState.value.some(opt => opt?.device?.device === currentDevice?.device);
    if (!deviceExists) {

      // clear the selected target
      const newAppState = cloneDeep(appState);
      // newAppState.value.selectedTarget = [];

      const dasItem = { device: currentDevice, appState: newAppState };
      deviceAppState.value.push(dasItem);
    }
    else {
      deviceAppState.value.forEach(opt => {
        if (opt?.device?.device === currentDevice?.device) {

          const newAppState = cloneDeep(appState);
          // newAppState.value.selectedTarget = [];
          opt.appState = newAppState;
        }
      });
    }

    localStorage.setItem('deviceAppState', JSON.stringify(deviceAppState.value));
  }

  loadDeviceAppState(deviceAppState, currentDevice, appState) {

    // check whether the deviceAppState exists in local storage
    const deviceAppStateLS = this.loadDeviceAppStateLS();

    if (deviceAppStateLS !== null) {
      deviceAppState.value = deviceAppStateLS;
    }

    const device = deviceAppState.value.find(opt => opt?.device?.device === currentDevice?.device);
    if (device) {
      const newAppState = cloneDeep(device.appState);
      newAppState.selectedTarget = [];
      newAppState.selectedTargets = [];
      return newAppState;//device.appState;
    }
  }

}

export default DeviceOpt
