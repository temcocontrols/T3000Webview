
import App from './Page/Page.Main';
import * as Utils from './Helper/Helper.Utils';
import Models from './Data/Data.Constant';
import Doc from './Doc/DocHandler';
import UI from './Doc/UI';

const Hvac = {
  App: new App(),
  Doc: new Doc(),
  UI: new UI(),
  Utils: Utils,
  Models: Models
}

export default Hvac;
