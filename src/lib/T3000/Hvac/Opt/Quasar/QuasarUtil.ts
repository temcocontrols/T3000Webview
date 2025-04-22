

import { contextMenuShow, currentObject, objectConfigShow } from "../../Data/Constant/RefConstant";
import { globalMsg, localSettings } from "../../Data/T3Data";
import T3Gv from "../../Data/T3Gv";
import GlobalMsgModel from "../../Model/GlobalMsgModel";

class QuasarUtil {

  $q: any;
  static quasar: any;

  initQuasar(quasar: any) {
    this.$q = quasar;
  }

  /*
  {
    type: "error" | "warning" | "info" | "success"
    message:"Error message",
    isShow: true | false,
    msgType: ""
    extral:{}
  }
  */

  setGlobalMsg(type: string, message: string, isShow: boolean, msgType: string, extral?: {}) {
    const existMsgId = globalMsg.value.findIndex((msg: GlobalMsgModel) => msg.msgType === msgType);

    if (existMsgId !== -1) {
      globalMsg.value[existMsgId].type = type;
      globalMsg.value[existMsgId].message = message;
      globalMsg.value[existMsgId].isShow = isShow;
      globalMsg.value[existMsgId].msgType = msgType;
      globalMsg.value[existMsgId].extral = extral || {};
    } else {
      const gmm = new GlobalMsgModel();
      gmm.type = type || "info";
      gmm.message = message || "";
      gmm.isShow = isShow || false;
      gmm.msgType = msgType || "";
      gmm.extral = extral || {};
      globalMsg.value.push(gmm);
    }

    console.log("= T3Util setGlobalMsg", { ...globalMsg.value });
  }

  clearGlobalMsg(msgType: string) {
    globalMsg.value = globalMsg.value.filter((msg: GlobalMsgModel) => msg.msgType !== msgType);
    console.log("= T3Util clearGlobalMsg", { ...globalMsg.value });
  }

  clearAllGlobalMsg() {
    globalMsg.value = [];
  }

  ShowLOAD_GRAPHIC_ENTRY_RESSuccess() {
    // this.$q.notify({
    //   message: "Graphic loaded successfully",
    //   color: "positive",
    //   icon: "check",
    //   actions: [
    //     {
    //       label: "Dismiss",
    //       color: "white",
    //       handler: () => {
    //         /* ... */
    //       },
    //     },
    //   ],
    // });

    console.log('= T3Utils Graphic loaded successfully');
  }

  ShowGET_INITIAL_DATA_RESSuccess() {
    // this.$q.notify({
    //   message: "Initial data loaded successfully",
    //   color: "positive",
    //   icon: "check",
    //   actions: [
    //     {
    //       label: "Dismiss",
    //       color: "white",
    //       handler: () => {
    //         /* ... */
    //       },
    //     },
    //   ],
    // });

    console.log('= T3Utils Initial data loaded successfully');
  }

  ShowWebSocketError(errorMsg: string) {
    this.$q.notify({
      message: errorMsg,
      color: "negative",
      icon: "error",
      actions: [
        {
          label: "Dismiss",
          color: "white",
          handler: () => {
            /* ... */
          },
        },
      ],
    });
  }

  setLocalSettings(key: string, value: any) {
    localSettings.value[key] = value;
    localStorage.setItem("localSettings", JSON.stringify(localSettings.value));
  }

  getLocalSettings(key: string) {
    const localSettings = localStorage.getItem("localSettings");

    if (localSettings) {
      return JSON.parse(localSettings)[key];
    }
  }

  static ShowContextMenu(show: boolean) {
    // Clear the context menu
    contextMenuShow.value = show;
  }

  static ShowObjectConfig(show: boolean) {
    T3Gv.refreshPosition = true;
    this.SetSeletedTool();
    objectConfigShow.value = true;///show;
  }

  static SetCurrentObject(currentObj: any) {
    T3Gv.refreshPosition = true;
    currentObject.value = currentObj;
  }

  static UpdateCurrentObjectPos(newPosFrame: any) {
    if (newPosFrame) {
      currentObject.value.translate = newPosFrame.translate;
      currentObject.value.width = newPosFrame.width;
      currentObject.value.height = newPosFrame.height;
    }
  }

  static SetSeletedTool() {
    const defaultItem: any = {
      active: false,
      cat: "General",
      group: {},
      height: 60,
      id: 1,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
      settings: {
        bgColor: "inherit",
        fillColor: "#659dc5",
        fontSize: 16,
        textColor: "inherit",
        titleColor: "inherit",
        t3EntryDisplayField: "none",
        justifyContent: ''
      },
      showDimensions: true,
      t3Entry: null,
      title: null,
      translate: [217, 49],
      type: "G_Circle",
      width: 60,
      zindex: 1
    };

    this.SetCurrentObject(defaultItem);
  }
}

export default QuasarUtil
