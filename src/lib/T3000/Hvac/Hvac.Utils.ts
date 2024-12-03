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

export const StopPropagationAndDefaults = (e: Event) => {
  e.preventDefault();
  // e.stopPropagation();
}

export const DeepCopy = (obj) => {
  if (obj === null || obj === undefined) return obj;

  let copy;

  if (Array.isArray(obj)) {
    copy = [];
    for (let i = 0; i < obj.length; i++) {
      copy[i] = DeepCopy(obj[i]);
    }
    return copy;
  }

  if (typeof obj === 'object') {
    copy = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        copy[key] = DeepCopy(obj[key]);
      }
    }
    return copy;
  }

  if (obj instanceof Blob) {
    return obj.slice();
  }

  if (obj instanceof Uint8Array) {
    return new Uint8Array(obj);
  }

  return obj;
}

export const RoundCoordLP = (number) => {
  const result = Math.round(10 * Number(number)) / 10;
  return isNaN(result) ? number : result;
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

export const CopyObj = (obj) => {
  if (!obj) return null;
  return JSON.parse(JSON.stringify(obj));
}

export const GenerateUUID = () => {
  let d = new Date().getTime();
  let d2 = (performance && performance.now && performance.now() * 1000) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}


export const GetPolyRect = (rect, points) => {
  if (points.length === 0) return;

  rect.x = points[0].x;
  rect.y = points[0].y;
  let maxX = rect.x;
  let maxY = rect.y;

  points.forEach(point => {
    if (point.x < rect.x) rect.x = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < rect.y) rect.y = point.y;
    if (point.y > maxY) maxY = point.y;
  });

  rect.width = maxX - rect.x;
  rect.height = maxY - rect.y;
}
