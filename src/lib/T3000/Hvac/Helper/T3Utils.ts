
import { globalMsg } from "../Data/T3Data"
import GlobalMsgModel from "../Model/GlobalMsgModel"

class T3Utils {

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
}

export default T3Utils
