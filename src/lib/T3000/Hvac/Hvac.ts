
import App from './Page/Page.Main'
import * as Utils from './Helper/Helper.Utils'
import Models from './Data/Data.Constant'
import Doc from './Doc/DocHandler'
import UI from './Doc/UI'
import KeyCommand from './Opt/Opt.KeyCommand'

const Hvac = {
  App: new App(),
  Doc: new Doc(),
  UI: new UI(),
  KeyCommand: new KeyCommand(),
  Utils: Utils,
  Models: Models
}

export default Hvac;
