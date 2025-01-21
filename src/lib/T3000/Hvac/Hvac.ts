
import App from './Page/Page.Main'
import * as Utils from './Helper/Helper.Utils'
import Models from './Data/Data.Constant'
import Doc from './Doc/DocHandler'
import UI from './Doc/UI'
import KeyCommand from './Opt/Opt.KeyCommand'
import DeviceOpt from './Opt/Socket/DeviceOpt'
import WebSocketClient from './Opt/Socket/WebSocketClient'
import IdxPage from './Opt/IdxPage'
import WebViewClient from './Opt/Webview2/WebViewClient'
import T3Utils from './Helper/T3Utils'
import LSUtils from './Helper/LSUtils'

const Hvac = {
  App: new App(),
  Doc: new Doc(),
  UI: new UI(),
  KeyCommand: new KeyCommand(),
  Utils: Utils,
  T3Utils: new T3Utils(),
  LSUtils: new LSUtils(),
  Models: Models,
  DeviceOpt: new DeviceOpt(),
  WsClient: new WebSocketClient(),
  IdxPage: new IdxPage(),
  WebClient: new WebViewClient()
}

export default Hvac;
