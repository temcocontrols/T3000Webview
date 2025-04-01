

/**
 * Provides a collection of constants for cursor management in UI components.
 *
 * @remarks
 * This class defines constant mappings and configurations used to:
 * - Map logical cursor types to their corresponding CSS class names (CursorType).
 * - Group common cursor type identifiers into logical categories (CursorTypes).
 * - Set up file paths and filenames for knob-related cursor images (Knob).
 * - Represent various cursor interaction states (CursorState).
 *
 * Each static property in the class plays a role in standardizing cursor appearance and behavior across the application,
 * ensuring consistency and ease of maintenance.
 *
 * @example
 * Using the CursorConstant class to apply settings:
 *
 * // Applying a cursor CSS class to an HTML element for pointer functionality.
 * element.classList.add(CursorConstant.CursorType.Pointer);
 *
 * // Constructing the full path for a knob image:
 * const knobImagePath = `${CursorConstant.Knob.Path}${CursorConstant.Knob.DiagonLeft}`;
 *
 * // Implementing logic based on a specific cursor interaction state.
 * if (currentCursorState === CursorConstant.CursorState.EditLink) {
 *   // Enable link editing functionalities.
 * }
 *
 * @public
 */
class CursorConstant {

  /**
   * Contains mappings for cursor CSS class names
   * Maps logical cursor types to their corresponding CSS class names
   */
  static CursorType = {
    Default: 'cur-default',
    Pointer: 'cur-pointer',
    Cross: 'cur-cross',
    Text: 'cur-text',
    Move: 'cur-move',
    ResizeT: 'cur-n-resize',
    ResizeR: 'cur-e-resize',
    ResizeB: 'cur-s-resize',
    ResizeL: 'cur-w-resize',
    ResizeTB: 'cur-ns-resize',
    ResizeLR: 'cur-ew-resize',
    ResizeRT: 'cur-ne-resize',
    ResizeLT: 'cur-nw-resize',
    ResizeRB: 'cur-se-resize',
    ResizeLB: 'cur-sw-resize',
    NeswResize: 'cur-nesw-resize',
    NwseResize: 'cur-nwse-resize',
    Anchor: 'cur-anchor',
    Paint: 'cur-paint',
    Rotate: 'cur-rotate',
    Edit: 'cur-pencil',
    EditClose: 'cur-pencil-close',
    Add: 'cur-add',
    Stamp: 'cur-stamp',
    AddRight: 'cur-add-right',
    AddLeft: 'cur-add-left',
    AddUp: 'cur-add-up',
    AddDown: 'cur-add-down',
    AddPlus: 'cur-add-plus',
    Grab: 'cur-grab'
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
    Path: '../../../src/assets/img/knob/',
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
