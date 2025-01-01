

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

  saveCurrentDeviceToAppState(selectDevice) {
    localStorage.setItem('currentDeviceToAppState', JSON.stringify(selectDevice))
  }

}

export default DeviceOpt
