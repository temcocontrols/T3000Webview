
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
import IdxUtils from "./Opt/Common/IdxUtils";

const Hvac = {
  PageMain: new PageMain(),
  UI: new T3Opt(),
  // Doc: new DocUtil(),
  KiOpt: new KeyInsertOpt(),
  QuasarUtil: new QuasarUtil(),
  LsOpt: new LsOpt(),
  DeviceOpt: new DeviceOpt(),
  WsClient: new WebSocketClient(),
  IdxPage: new IdxPage(),
  WebClient: null as any, // Will be initialized after module loading
  IdxUtils: IdxUtils, // Static class reference
  IdxPage2: new IdxPage2(),
}

// Inject dependencies into WebSocketClient to break circular dependency
Hvac.WsClient.setDependencies(Hvac.DeviceOpt, Hvac.IdxPage, Hvac.QuasarUtil);

// Initialize WebViewClient after module loading to avoid circular dependency
Hvac.WebClient = new WebViewClient();

// Set up IdxUtils dependencies first (static class)
Hvac.IdxUtils.setDependencies(Hvac.WebClient, Hvac.DeviceOpt, Hvac.WsClient);

// Inject dependencies into WebViewClient to break circular dependency
Hvac.WebClient.setDependencies(Hvac.DeviceOpt, Hvac.IdxPage, Hvac.IdxUtils);

export default Hvac
