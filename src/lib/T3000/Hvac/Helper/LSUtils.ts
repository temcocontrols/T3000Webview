
// local storage utils

class LSUtils {

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
}

export default LSUtils
