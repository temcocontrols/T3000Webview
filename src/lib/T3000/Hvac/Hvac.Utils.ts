// Common functions for HVAC module

import HvacModels from './Hvac.Models';

const Utils = {
  Log: console.log,
};

export const Log = (e, ...t) => {
  if ("prd" !== HvacModels.Default.Environment.toLowerCase()) {
    if (t == null || t.length === 0) {
      Utils.Log.apply(console, [e]);
    } else {
      Utils.Log.apply(console, [e].concat(t));
    }
  }
};

export const UtilsTest = (a, b) => {
  console.log('This is a test function', a, b);
}
