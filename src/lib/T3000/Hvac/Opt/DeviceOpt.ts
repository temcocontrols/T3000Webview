

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
    }

    // check whether the deviceAppState exists in local storage
    const deviceAppStateLS = this.loadDeviceAppStateLS();

    if (deviceAppStateLS !== null) {
      deviceAppState.value = deviceAppStateLS;
    }

    const deviceExists = deviceAppState.value.some(opt => opt.device.device === currentDevice.device);
    if (!deviceExists) {
      const dasItem = { device: currentDevice, appState };
      deviceAppState.value.push(dasItem);
    }
    else {
      deviceAppState.value.forEach(opt => {
        if (opt.device.device === currentDevice.device) {
          opt.appState = appState;
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

    const device = deviceAppState.value.find(opt => opt.device.device === currentDevice.device);
    if (device) {
      return device.appState;
    }
  }

}

export default DeviceOpt
