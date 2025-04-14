import { Dialog } from 'quasar';
import { useQuasar } from 'quasar';
import { contextMenuShow, objectConfigShow } from "../../Data/Constant/RefConstant";


class QuasarUtil {

  public static quasar: any;

  static ShowContextMenu(show: boolean) {
    // Clear the context menu
    contextMenuShow.value = show;
  }

  static ShowObjectConfig(show: boolean) {
    objectConfigShow.value = show;
  }
}

export default QuasarUtil
