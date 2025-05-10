

import { notification } from 'ant-design-vue';

class AntdUtil {

 static ShowNotification(type: string, title: string, description: string) {
    notification[type]({
      message: title,
      description: description,
    });
  }
}

export default AntdUtil
