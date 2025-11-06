

/**
 * Provides constant definitions for keyboard interactions in the T3000 HVAC system.
 *
 * This class contains static mappings for keyboard contexts, modifier keys, key codes,
 * and special keys that are used throughout the application for handling keyboard events.
 *
 * @example
 * // Check if a key event is a navigation key
 * function isNavigationKey(event: KeyboardEvent): boolean {
 *   return KeyboardConstant.NonTextKeys.includes(event.keyCode);
 * }
 *
 * @example
 * // Handle keyboard shortcuts with modifiers
 * function handleKeyDown(event: KeyboardEvent, context: number): void {
 *   const isCtrlPressed = event.ctrlKey;
 *   const modifierKey = isCtrlPressed ? KeyboardConstant.ModifierKeys.Ctrl : KeyboardConstant.ModifierKeys.None;
 *
 *   if (context === KeyboardConstant.Contexts.Automation &&
 *       modifierKey === KeyboardConstant.ModifierKeys.Ctrl &&
 *       event.keyCode === KeyboardConstant.Keys.S) {
 *     // Handle Ctrl+S in Automation context
 *     event.preventDefault();
 *     saveAutomation();
 *   }
 * }
 */
class KeyboardConstant {
  /**
   * Defines different contexts for keyboard interactions
   * Used to determine which keyboard shortcuts are active in different application states
   */
  static Contexts = {
    None: -1,
    All: 0,
    Text: 1,
    Automation: 3,
    DimensionText: 4,
    WallOpt: 5,
    Note: 6,
    Navigation: 7,
    AutomationNoCtrl: 8,
    ReadOnly: 9
  };

  /**
   * Defines modifier key combinations
   * Used to create complex keyboard shortcuts
   */
  static ModifierKeys = {
    None: 0,
    Ctrl: 1,
    Shift: 2,
    Alt: 3,
    Ctrl_Alt: 4,
    Ctrl_Shift: 5,
    Shift_Alt: 6
  };

  /**
   * Maps keyboard key names to their corresponding key codes
   * Used for detecting specific keys in keyboard events
   */
  static Keys = {
    Backspace: 8,
    Tab: 9,
    Enter: 13,
    Shift: 16,
    Ctrl: 17,
    Alt: 18,
    Caps_Lock: 20,
    Escape: 27,
    Space: 32,
    Page_Up: 33,
    Page_Down: 34,
    End: 35,
    Home: 36,
    Left_Arrow: 37,
    Up_Arrow: 38,
    Right_Arrow: 39,
    Down_Arrow: 40,
    Insert: 45,
    Delete: 46,
    0: 48,
    1: 49,
    2: 50,
    3: 51,
    4: 52,
    5: 53,
    6: 54,
    7: 55,
    8: 56,
    9: 57,
    A: 65,
    B: 66,
    C: 67,
    D: 68,
    E: 69,
    F: 70,
    G: 71,
    H: 72,
    I: 73,
    J: 74,
    K: 75,
    L: 76,
    M: 77,
    N: 78,
    O: 79,
    P: 80,
    Q: 81,
    R: 82,
    S: 83,
    T: 84,
    U: 85,
    V: 86,
    W: 87,
    X: 88,
    Y: 89,
    Z: 90,
    Left_Window_Key: 91,
    Right_Window_Key: 92,
    Select_Key: 93,
    Numpad_0: 96,
    Numpad_1: 97,
    Numpad_2: 98,
    Numpad_3: 99,
    Numpad_4: 100,
    Numpad_5: 101,
    Numpad_6: 102,
    Numpad_7: 103,
    Numpad_8: 104,
    Numpad_9: 105,
    Multiply: 106, // Fixed typo from "Nultiply"
    Add: 107,
    Subtract: 109,
    Decimal_Point: 110,
    Divide: 111,
    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F9: 120,
    F10: 121,
    F11: 122,
    F12: 123,
    Num_Lock: 144,
    Scroll_Lock: 145,
    Semi_Colon: 186,
    Equal_Sign: 187,
    Comma: 188,
    Dash: 189,
    Period: 190,
    Forward_Slash: 191,
    Grave_Accent: 192,
    Open_Bracket: 219,
    Back_Slash: 220,
    Close_Bracket: 221, // Fixed typo from "Close_Braket"
    Single_Quote: 222
  };

  /**
   * List of special keys that are not considered text input
   * Used to filter keyboard events for text editing operations
   */
  static NonTextKeys = [
    KeyboardConstant.Keys.Backspace,
    KeyboardConstant.Keys.Tab,
    KeyboardConstant.Keys.Enter,
    KeyboardConstant.Keys.Left_Arrow,
    KeyboardConstant.Keys.Up_Arrow,
    KeyboardConstant.Keys.Right_Arrow,
    KeyboardConstant.Keys.Down_Arrow,
    KeyboardConstant.Keys.Delete,
    KeyboardConstant.Keys.Escape
  ];
}

export default KeyboardConstant;
