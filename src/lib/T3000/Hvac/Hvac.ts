
import App from './Page/P.Main';
import * as Utils from './Util/Utils1';
import Models from './Data/Constant/T3Constant';
import T3Opt from './Doc/T3Opt';
// import App from './Page/Page.Main'
// import * as Utils from './Util/Helper.Utils'
// import Models from './Data/Constant'
import Doc from './Doc/DocHandler'
import UI from './Doc/UI'
import KeyCommand from './Opt/Opt.KeyCommand'
import DeviceOpt from './Opt/Socket/DeviceOpt'
import WebSocketClient from './Opt/Socket/WebSocketClient'
import IdxPage from './Opt/IdxPage'
import WebViewClient from './Opt/Webview2/WebViewClient'
import T3Utils from './Util/T3Utils'
import LSUtils from './Util/LSUtils'
const Hvac = {
  App: new App(),
  // Doc: new Doc(),
  UI: new T3Opt(),
  Utils: Utils,
  Models: Models,
  // App: new App(),
  Doc: new Doc(),
  // UI: new UI(),
  KeyCommand: new KeyCommand(),
  // Utils: Utils,
  T3Utils: new T3Utils(),
  LSUtils: new LSUtils(),
  // Models: Models,
  DeviceOpt: new DeviceOpt(),
  WsClient: new WebSocketClient(),
  IdxPage: new IdxPage(),
  WebClient: new WebViewClient()}

export default Hvac;
