

// local storage utils

class LsOpt {

  public saveAppState(data: any) {
    localStorage.setItem('appState', JSON.stringify(data));
  }

  public saveDeviceAppState(data: any) {
    localStorage.setItem('deviceAppState', JSON.stringify(data));
  }

  public loadDeviceAppStateLS() {
    const deviceAppStateLS = localStorage.getItem('deviceAppState');
    if (deviceAppStateLS) {
      return JSON.parse(deviceAppStateLS);
    }
    return null;
  }

  public loadAppStateLS() {
    const appState = localStorage.getItem("appState");
    return appState ?? null;
  }

  public loadParsedAppStateLS() {
    const localState = localStorage.getItem("appState");
    return localState ? JSON.parse(localState) : null;
  }
}

export default LsOpt
