// // import { Dialog } from 'quasar';
// // import { useQuasar } from 'quasar';
// // import { contextMenuShow, objectConfigShow } from "../../Data/Constant/RefConstant";

// import { useMenuState } from "../../Data/Constant/RefConstant";

// class QuasarUtil {

//   public static quasar: any;

//   private static menuState = useMenuState();

//   static get contextMenuShow() {
//     return this.menuState.contextMenuShow;
//   }

//   static ShowContextMenu(show: boolean) {
//     this.menuState.setContextMenuShow(show);
//   }

//   static ShowObjectConfig(show: boolean) {
//     this.menuState.setObjectConfigShow(show);
//   }

//   //   static ShowContextMenu(show: boolean) {

//   //   // Clear the context menu
//   //   setContextMenuShow(show);// = show;
//   // }

//   //   static ShowObjectConfig(show: boolean) {
//   //   // objectConfigShow.value = show;
//   //   setObjectConfigShow(show);
//   // }
// }

// export default QuasarUtil

// import { contextMenuShow, objectConfigShow } from "../../Data/Constant/RefConstant";

import RefConstant from "../../Data/Constant/RefConstant";

class QuasarUtil {

  public static quasar: any;

  static ShowContextMenu(show: boolean) {
    // Clear the context menu
    RefConstant.contextMenuShow = show;
  }

  static ShowObjectConfig(show: boolean) {
    RefConstant.objectConfigShow = show;
  }
}

export default QuasarUtil
