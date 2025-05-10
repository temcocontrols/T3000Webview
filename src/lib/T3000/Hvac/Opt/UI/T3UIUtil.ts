

import AntdUtil from "./AntdUtil";

class T3UIUtil {

  static ShowWebSocketError(errorMsg: string) {
    AntdUtil.ShowNotification("error", "WebSocket Error", errorMsg);
  }
}

export default T3UIUtil
