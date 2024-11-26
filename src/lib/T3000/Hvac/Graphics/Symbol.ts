
import Models from '../Hvac.Models';
import Element from './Element';

class Symbol extends Element {
  constructor() {
    super();
  }

  ParsePlaceholder = function (e, t) {
    const equalsIndex = e.indexOf("=");
    const terminatorIndex = e.lastIndexOf(Models.Placeholder.Terminator);
    let placeholderValue = Models.PlaceholderDefaults[t];

    if (equalsIndex > 0 && terminatorIndex > equalsIndex) {
      placeholderValue = e.slice(equalsIndex + 1, terminatorIndex);
    }

    return placeholderValue;
  }
}

export default Symbol;
