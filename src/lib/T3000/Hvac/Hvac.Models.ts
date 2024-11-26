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

export enum LayerMoveType {
  BOTTOM = 0,
  BEFORE = 1,
  AFTER = 2,
  TOP = 3
}

export enum SVGPathSeg {
  PATHSEG_UNKNOWN = 0,
  PATHSEG_CLOSEPATH = 1,
  PATHSEG_MOVETO_ABS = 2,
  PATHSEG_MOVETO_REL = 3,
  PATHSEG_LINETO_ABS = 4,
  PATHSEG_LINETO_REL = 5,
  PATHSEG_CURVETO_CUBIC_ABS = 6,
  PATHSEG_CURVETO_CUBIC_REL = 7,
  PATHSEG_CURVETO_QUADRATIC_ABS = 8,
  PATHSEG_CURVETO_QUADRATIC_REL = 9,
  PATHSEG_ARC_ABS = 10,
  PATHSEG_ARC_REL = 11,
  PATHSEG_LINETO_HORIZONTAL_ABS = 12,
  PATHSEG_LINETO_HORIZONTAL_REL = 13,
  PATHSEG_LINETO_VERTICAL_ABS = 14,
  PATHSEG_LINETO_VERTICAL_REL = 15,
  PATHSEG_CURVETO_CUBIC_SMOOTH_ABS = 16,
  PATHSEG_CURVETO_CUBIC_SMOOTH_REL = 17,
  PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS = 18,
  PATHSEG_CURVETO_QUADRATIC_SMOOTH_REL = 19
}

export enum PlaceholderDefaults {
  "##FILLCOLOR" = "#FFFFFF",
  "##ENDCOLOR" = "#FFFFFF",
  "##FILLTRANS" = 1,
  "##LINECOLOR" = "#000",
  "##LINETRANS" = 1,
  "##LINETHICK" = 1,
  "##SOLIDFILL" = "#000"
}

export enum Placeholder {
  FillColor = "##FILLCOLOR",
  EndColor = "##ENDCOLOR",
  FillTrans = "##FILLTRANS",
  LineColor = "##LINECOLOR",
  LineTrans = "##LINETRANS",
  LineThick = "##LINETHICK",
  SolidFill = "##SOLIDFILL",
  Terminator = "##"
}

export default { Default, DocumentAreaModel, CreateShapeType, EventBehavior, LayerMoveType, SVGPathSeg, PlaceholderDefaults, Placeholder };
