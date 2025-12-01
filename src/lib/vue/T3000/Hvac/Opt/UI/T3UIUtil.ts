

import AntdUtil from "./AntdUtil";
import { topNavVisible, leftNavVisible, rightNavVisible } from "src/lib/vue/T3000/Hvac/Data/Constant/RefConstant";

class T3UIUtil {

  static ShowWebSocketError(errorMsg: string) {
    // AntdUtil.ShowNotification("error", "WebSocket Error", errorMsg);
    AntdUtil.ShowTopAlert("error", "WebSocket Error", errorMsg);
  }

  static ShowZoomInOutError(errorMsg: string) {
    // AntdUtil.ShowNotification("error", "Zoom In/Out Error", errorMsg);
    AntdUtil.ShowTopAlert("error", "Zoom In/Out Error", errorMsg);
  }

  static SetNavVisiblity(visibility: boolean) {
    // Set the visibility of the top, left, and right navigation bars
    topNavVisible.value = true;// visibility;
    leftNavVisible.value = true;// visibility;
    rightNavVisible.value = true;// visibility;
  }
}

export default T3UIUtil
