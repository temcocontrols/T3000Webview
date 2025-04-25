
import PageMain from "./Page/P.Main";
import T3Opt from "./Doc/T3Opt";
import KeyInsertOpt from "./Opt/Common/KeyInsertOpt";
import DeviceOpt from "./Opt/Socket/DeviceOpt";
import WebSocketClient from "./Opt/Socket/WebSocketClient";
import IdxPage from "./Opt/Common/IdxPage";
import WebViewClient from "./Opt/Webview2/WebViewClient";
import QuasarUtil from "./Opt/Quasar/QuasarUtil";
import LsOpt from "./Opt/Common/LsOpt";
import DocUtil from "./Doc/DocUtil";
import IdxPage2 from "./Opt/Common/IdxPage2";

const Hvac = {
  PageMain: new PageMain(),
  UI: new T3Opt(),
  Doc: new DocUtil(),
  KiOpt: new KeyInsertOpt(),
  QuasarUtil: new QuasarUtil(),
  LsOpt: new LsOpt(),
  DeviceOpt: new DeviceOpt(),
  WsClient: new WebSocketClient(),
  IdxPage: new IdxPage(),
  WebClient: new WebViewClient(),
  IdxPage2: new IdxPage2(),
}

export default Hvac
