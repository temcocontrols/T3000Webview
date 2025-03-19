

class CursorConstant {

  /**
   * Contains mappings for cursor CSS class names
   * Maps logical cursor types to their corresponding CSS class names
   */
  static CursorType = {
    AUTO: 'cur-auto',
    DEFAULT: 'cur-default',
    NONE: 'cur-none',
    CONTEXT_MENU: 'cur-context-menu',
    HELP: 'cur-help',
    POINTER: 'cur-pointer',
    PROGRESS: 'cur-progress',
    BUSY: 'cur-wait',
    CELL: 'cur-cell',
    CROSSHAIR: 'cur-crosshair',
    TEXT: 'cur-text',
    VERTICAL_TEXT: 'cur-vertical-text',
    ALIAS: 'cur-alias',
    COPY: 'cur-copy',
    MOVE: 'cur-move',
    NO_DROP: 'cur-no-drop',
    NOT_ALLOWED: 'cur-not-allowed',
    ALL_SCROLL: 'cur-all-scroll',
    COL_RESIZE: 'cur-col-resize',
    ROW_RESIZE: 'cur-row-resize',
    RESIZE_T: 'cur-n-resize',
    RESIZE_R: 'cur-e-resize',
    RESIZE_B: 'cur-s-resize',
    RESIZE_L: 'cur-w-resize',
    RESIZE_TB: 'cur-ns-resize',
    RESIZE_LR: 'cur-ew-resize',
    RESIZE_RT: 'cur-ne-resize',
    RESIZE_LT: 'cur-nw-resize',
    RESIZE_RB: 'cur-se-resize',
    RESIZE_LB: 'cur-sw-resize',
    NESW_RESIZE: 'cur-nesw-resize',
    NWSE_RESIZE: 'cur-nwse-resize',
    ZOOM_IN: 'cur-zoom-in',
    ZOOM_OUT: 'cur-zoom-out',
    ZOOM_GRAB: 'cur-zoom-grab',
    ZOOM_GRABBING: 'cur-zoom-grabbing',
    ANCHOR: 'cur-anchor',
    PAINT: 'cur-paint',
    ROTATE: 'cur-rotate',
    DROPLIB: 'cur-droplib',
    EDIT_X: 'cur-pencil-x',
    EDIT: 'cur-pencil',
    EDIT_CLOSE: 'cur-pencil-close',
    ADD: 'cur-add',
    STAMP: 'cur-stamp',
    ARR_DOWN: 'cur-arr-down',
    ARR_RIGHT: 'cur-arr-right',
    BRUSH: 'cur-brush',
    BRUSH_EDIT: 'cur-brush-edit',
    BRUSH_CELL: 'cur-brush-cell',
    BRUSH_TABLE: 'cur-brush-table',
    ADD_RIGHT: 'cur-add-right',
    ADD_LEFT: 'cur-add-left',
    ADD_UP: 'cur-add-up',
    ADD_DOWN: 'cur-add-down',
    ADD_PLUS: 'cur-add-plus',
    GRAB: 'cur-grab'
  }

  /**
   * Groups cursor types into logical categories
   * Provides easier access to commonly used cursor type groups
   */
  static CursorTypes = {
    Default: 'DEFAULT',
    Plus: 'PLUS',
    Move: 'MOVE',
    Grow: 'GROW'
  }

  /**
   * Defines paths and filenames for knob-related cursor images
   * Used for displaying different directional knob controls
   */
  static Knob = {
    Path: '../../../style/img/knob/',
    DiagonLeft: 'diagon_left.svg',
    DiagonRight: 'diagon_right.svg',
    ExpandHoriz: 'expand_horiz.svg',
    ExpandVert: 'expand_vert.svg',
  }

  /**
   * Defines possible cursor interaction states
   * Used to determine what operations are available in the current context
   */
  static CursorState = {
    None: 0,
    EditOnly: 1,
    EditLink: 2,
    LinkOnly: 3
  }
}

export default CursorConstant
