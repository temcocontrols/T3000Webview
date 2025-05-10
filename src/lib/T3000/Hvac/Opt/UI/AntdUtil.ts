

import { notification } from 'ant-design-vue';
import UIUtil from './UIUtil';
import { globalMsgShow } from '../../Data/Constant/RefConstant';

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

  static ShowTopAlert(type: string, title: string, description: string) {
    globalMsgShow.value = true;
    const fitOption = {};
    UIUtil.FitDocumentWorkArea(false, false, false, fitOption);
  }
}

export default AntdUtil
