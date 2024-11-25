// Global Constants

export const Default = {
  Environment: "dev",
};

export const DocumentAreaModel = {
  LEFT_PANEL_ID: "left-panel",
  LEFT_PANEL_WIDTH: 105,

  WORK_AREA_ID: "work-area",
  WORK_AREA_PADDING_LEFT: 105,
};

export enum CreateShapeType {
  RECT = 1,
  RRECT = 2,
  OVAL = 3,
  LINE = 4,
  POLYLINE = 5,
  POLYGON = 6,
  PATH = 7,
  TEXT = 8,
  IMAGE = 9,
  GROUP = 10,
  LAYER = 11,
  SYMBOL = 12,
  POLYLINECONTAINER = 13,
  POLYPOLYLINE = 14,
  SHAPECOPY = 15,
  SHAPECONTAINER = 16
}

export enum EventBehavior {
  NORMAL = 'visiblePainted',
  INSIDE = 'visibleFill',
  OUTSIDE = 'visibleStroke',
  ALL = 'visible',
  HIDDEN = 'painted',
  HIDDEN_IN = 'fill',
  HIDDEN_OUT = 'stroke',
  HIDDEN_ALL = 'all',
  NONE = 'none'
}

export default { Default, DocumentAreaModel, CreateShapeType, EventBehavior };
