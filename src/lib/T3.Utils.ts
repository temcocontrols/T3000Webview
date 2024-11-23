import T3Models from "./T3.Models";

const Models = {
  Log: console.log,
};

const Log = (e, ...t) => {
  if ("prd" !== T3Models.Default.Environment.toLowerCase()) {
    if (t == null || t.length === 0) {
      Models.Log.apply(console, [e]);
    } else {
      Models.Log.apply(console, [e].concat(t));
    }
  }
};

export default { Log };
