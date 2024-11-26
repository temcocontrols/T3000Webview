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

export const RoundCoord = function (number) {
  var result = Math.round(1000 * Number(number)) / 1000;
  return isNaN(result) ? number : result
}

export const StopPropagationAndDefaults = (e) => {
  console.log('StopPropagationAndDefaults', e);
  e.preventDefault();
  e.stopPropagation();

  if (e.gesture) {
    e.gesture.preventDefault();
    e.gesture.stopPropagation();
  }
}

export const DeepCopy = (e) => {
  var t,
    a;
  if (null == e) return null;
  var r = typeof e;
  if (e instanceof Array) {
    t = [];
    var i = e.length;
    for (a = 0; a < i; a++) t.push(DeepCopy(e[a]));
    return t
  }
  if ('string' === r || 'number' === r || 'boolean' === r || 'function' === r) return e;
  if (e instanceof Blob) return e.slice();
  if (e instanceof Uint8Array) return e;
  if ('object' === r) {
    for (var n in t = new e.constructor, e) {
      var o = e[n],
        s = typeof o;
      if (null == o) t[n] = o;
      else if ('string' === s || 'number' === s || 'boolean' === s) t[n] = o;
      else if (o instanceof Array) {
        null == t[n] &&
          (t[n] = []);
        var l = o.length;
        for (a = 0; a < l; a++) t[n].push(DeepCopy(o[a]))
      } else 'function' !== s &&
        (t[n] = DeepCopy(o))
    }
    return t
  }
  return null
}

export const RoundCoordLP = (e) => {
  var t = Math.round(10 * Number(e)) / 10;
  return isNaN(t) ? e : t
}


export const CalcAngleFromPoints = (point1, point2) => {
  const deltaX = point2.x - point1.x;
  const deltaY = point2.y - point1.y;
  let angle;

  if (deltaX === 0) {
    angle = deltaY > 0 ? 90 : 270;
  } else {
    angle = Math.atan(deltaY / deltaX) * (180 / Math.PI);
    if (deltaX < 0) {
      angle += 180;
    } else if (deltaY < 0) {
      angle += 360;
    }
  }

  return angle;
}


export const CopyObj = function (e) {
  return e ? JSON.parse(JSON.stringify(e)) : null
}
