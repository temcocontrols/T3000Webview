

import { notification } from 'ant-design-vue';
import UIUtil from './UIUtil';
import { commonMsg, globalMsgShow } from '../../Data/Constant/RefConstant';
import Hvac from '../../Hvac';

class AntdUtil {

  static ShowNotification(type: string, title: string, description: string) {
    notification[type]({
      message: title,
      description: description,
      style: { fontSize: '12px' },
      duration: 730,
      placement: 'bottomLeft',
      onClick: () => {
        console.log('Notification Clicked!');
      }
    });
  }

  static ShowTopAlert(type: string, title: string, messgage: string) {
    globalMsgShow.value = true;
    const fitOption = {};
    commonMsg.value = messgage;
    // Hvac.QuasarUtil.setGlobalMsg('error', messgage, true, "common", null);
    UIUtil.FitDocumentWorkArea(false, false, false, fitOption);
  }
}

export default AntdUtil
