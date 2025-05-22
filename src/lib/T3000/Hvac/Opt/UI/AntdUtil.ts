

import { notification, message } from 'ant-design-vue';
import UIUtil from './UIUtil';
import { commonMsg, globalMsgShow } from '../../Data/Constant/RefConstant';
import { AdjustVlScrollHeight } from '../../Data/T3Data';
import Hvac from '../../Hvac';
import DocUtil from '../../Doc/DocUtil';
import T3Gv from '../../Data/T3Gv';
import T3Util from '../../Util/T3Util';
import LogUtil from '../../Util/LogUtil';

class AntdUtil {

  static ShowNotification(type: string, title: string, description: string) {
    notification[type]({
      message: title,
      description: description,
      style: { fontSize: '12px' },
      duration: 730,
      placement: 'topRight',
      onClick: () => {
        LogUtil.Debug('= u.AntdUtil: ShowNotification/ Message callback clicked');
      }
    });
  }

  static ShowTopAlert(type: string, title: string, messgage: string) {
    globalMsgShow.value = true;
    const fitOption = {};
    commonMsg.value = messgage;
    // Hvac.QuasarUtil.setGlobalMsg('error', messgage, true, "common", null);
    // UIUtil.FitDocumentWorkArea(false, false, false, fitOption);

    const vlScrollHeight = globalMsgShow.value ? AdjustVlScrollHeight : 0;
    if (T3Gv.docUtil) {
      T3Gv.docUtil.UpdateWorkArea(vlScrollHeight);
    }
  }

  // clear the global message
  static CloseGlobalMsg() {
    globalMsgShow.value = false;
    const vlScrollHeight = globalMsgShow.value ? AdjustVlScrollHeight : 0;
    if (T3Gv.docUtil) {
      T3Gv.docUtil.UpdateWorkArea(vlScrollHeight);
    }
  }

  static ShowMessage(type: string, msg: string) {
    switch (type) {
      case 'error':
        message.error(msg);
        break;
      case 'warning':
        message.warning(msg);
        break;
      case 'success':
        message.success(msg);
        break;
    }
  }
}

export default AntdUtil
