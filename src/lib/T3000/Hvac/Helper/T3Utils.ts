
import { globalMsg } from "../Data/T3Data"

class T3Utils {

  /*
  {
    type: "error" | "warning" | "info" | "success"
    message:"Error message",
    isShow: true | false,
    msgType: ""
  }
  */

  public setGlobalMsg(type: string, message: string, isShow: boolean, msgType?: string) {
    console.log("= T3Util setGlobalMsg", type, message, isShow, msgType);

    globalMsg.value.type = type || "info";
    globalMsg.value.message = message || "";
    globalMsg.value.isShow = isShow || false;
    globalMsg.value.msgType = msgType || "";
  }

  public clearGlobalMsg() {
    globalMsg.value = { type: "info", message: "", isShow: false, msgType: "" };
    console.log("= T3Util clearGlobalMsg", globalMsg.value);
  }
}

export default T3Utils
