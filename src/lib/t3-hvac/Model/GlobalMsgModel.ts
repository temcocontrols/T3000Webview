
class GlobalMsgModel {
  /*
  {
    type: "error" | "warning" | "info" | "success"
    message:"Error message",
    isShow: true | false,
    msgType: "",
    extral:{}
  }
  */

  public type: string;
  public message: string;
  public isShow: boolean;
  public msgType: string;
  public extral: {};

  constructor(type?: string, message?: string, isShow?: boolean, msgType?: string, extral: {} = {}) {
    this.type = type || "info";
    this.message = message || "";
    this.isShow = isShow || false;
    this.msgType = msgType || "";
    this.extral = extral || {};
  }
}

export default GlobalMsgModel
