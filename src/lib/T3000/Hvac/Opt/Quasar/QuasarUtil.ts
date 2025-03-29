import { Dialog } from 'quasar';
import { useQuasar } from 'quasar';
import { contextMenuShow } from "../../Data/Constant/RefConstant";


class QuasarUtil {

  public static quasar: any;

  static SetContextMenuVisible(visible: boolean) {
    // Clear the context menu
    contextMenuShow.value = visible;
  }
}

export default QuasarUtil
