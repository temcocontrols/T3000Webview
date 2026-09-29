

// local storage utils
//
// Keys come from `Data/Constant/StorageKeys.ts` — the legacy Vue drawer keeps the historical
// `appState` / `deviceAppState` strings, this tree uses its own namespace.

import StorageKeys from "../../Data/Constant/StorageKeys";

class LsOpt {

  public saveAppState(data: any) {
    localStorage.setItem(StorageKeys.APP_STATE, JSON.stringify(data));
  }

  public saveDeviceAppState(data: any) {
    localStorage.setItem(StorageKeys.DEVICE_APP_STATE, JSON.stringify(data));
  }

  public loadDeviceAppStateLS() {
    const deviceAppStateLS = localStorage.getItem(StorageKeys.DEVICE_APP_STATE);
    if (deviceAppStateLS) {
      return JSON.parse(deviceAppStateLS);
    }
    return null;
  }

  public loadAppStateLS() {
    const appState = localStorage.getItem(StorageKeys.APP_STATE);
    return appState ?? null;
  }

  public loadParsedAppStateLS() {
    const localState = localStorage.getItem(StorageKeys.APP_STATE);
    return localState ? JSON.parse(localState) : null;
  }
}

export default LsOpt
