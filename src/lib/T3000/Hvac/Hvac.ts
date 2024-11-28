
import App from './App/App';
import * as Utils from './Hvac.Utils';
import Models from './Hvac.Models';
import Doc from './Document/DocHandler';
import UI from './UI/UI';

const Hvac = {
  App: new App(),
  Doc: new Doc(),
  UI: new UI(),
  Utils: Utils,
  Models: Models
}

export default Hvac;
