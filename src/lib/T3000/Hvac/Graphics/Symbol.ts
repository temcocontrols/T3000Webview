
import Models from '../Hvac.Models';
import Element from './Element';

class Symbol extends Element {
  constructor() {
    super();
  }

  ParsePlaceholder = function (placeholderString, placeholderType) {
    const equalsIndex = placeholderString.indexOf("=");
    const terminatorIndex = placeholderString.lastIndexOf(Models.Placeholder.Terminator);
    let placeholderValue = Models.PlaceholderDefaults[placeholderType];

    if (equalsIndex > 0 && terminatorIndex > equalsIndex) {
      placeholderValue = placeholderString.slice(equalsIndex + 1, terminatorIndex);
    }

    return placeholderValue;
  }
}

export default Symbol;
