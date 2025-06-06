

import AntdUtil from "./AntdUtil";

class T3UIUtil {

  static ShowWebSocketError(errorMsg: string) {
    // AntdUtil.ShowNotification("error", "WebSocket Error", errorMsg);
    AntdUtil.ShowTopAlert("error", "WebSocket Error", errorMsg);
  }

  static ShowZoomInOutError(errorMsg: string) {
    // AntdUtil.ShowNotification("error", "Zoom In/Out Error", errorMsg);
    AntdUtil.ShowTopAlert("error", "Zoom In/Out Error", errorMsg);
  }
}

export default T3UIUtil
