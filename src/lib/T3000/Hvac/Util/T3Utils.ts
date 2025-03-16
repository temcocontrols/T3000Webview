
import { globalMsg, localSettings } from "../Data/T3Data"
import GlobalMsgModel from "../Model/GlobalMsgModel"

class T3Utils {

  public $q: any;

  public initQuasar(quasar: any) {
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

  public setGlobalMsg(type: string, message: string, isShow: boolean, msgType: string, extral?: {}) {
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

  public clearGlobalMsg(msgType: string) {
    globalMsg.value = globalMsg.value.filter((msg: GlobalMsgModel) => msg.msgType !== msgType);
    console.log("= T3Util clearGlobalMsg", { ...globalMsg.value });
  }

  public clearAllGlobalMsg() {
    globalMsg.value = [];
  }

  public ShowLOAD_GRAPHIC_ENTRY_RESSuccess() {
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

  public ShowGET_INITIAL_DATA_RESSuccess() {
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

  public ShowWebSocketError(errorMsg: string) {
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

  public setLocalSettings(key: string, value: any) {
    localSettings.value[key] = value;
    localStorage.setItem("localSettings", JSON.stringify(localSettings.value));
  }

  public getLocalSettings(key: string) {
    const localSettings = localStorage.getItem("localSettings");

    if (localSettings) {
      return JSON.parse(localSettings)[key];
    }
  }
}

export default T3Utils
