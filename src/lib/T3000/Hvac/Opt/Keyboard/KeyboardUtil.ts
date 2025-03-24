

import KeyboardConstant from "./KeyboardConstant"
import T3Util from "../../Util/T3Util";

/**
 * Utility class for creating and managing keyboard commands in the T3000 application.
 *
 * This class provides functionality to build keyboard commands with specific contexts,
 * modifier keys, and actions, allowing for customizable keyboard shortcuts throughout
 * the application.
 *
 * @example
 * ```typescript
 * // Create a keyboard utility
 * const keyboardUtil = new KeyboardUtil();
 *
 * // Build a simple command
 * keyboardUtil.BuildCommand(
 *   'save',
 *   KeyboardConstant.Contexts.Editor,
 *   KeyboardConstant.ModifierKeys.Ctrl,
 *   'S',
 *   function() { this.saveDocument(); },
 *   documentManager
 * );
 *
 * // Execute the command
 * keyboardUtil.Execute();
 *
 * // Build a command with parameters
 * keyboardUtil.BuildCommand(
 *   'openFile',
 *   KeyboardConstant.Contexts.Main,
 *   KeyboardConstant.ModifierKeys.Ctrl,
 *   'O',
 *   function(filename, readOnly) { this.openFile(filename, readOnly); },
 *   fileManager,
 *   ['example.txt', true]
 * );
 * ```
 */
class KeyboardUtil {

  public Name: string;
  public Context: string;
  public ModifierKey: string;
  public KeyCode: string;
  public Command: string;
  public CommandParent: string;
  public CommandParams: string;
  Execute: () => any;

  constructor() {
  }

  /**
   * Creates a keyboard command with the specified properties
   * @param name - Name of the keyboard command
   * @param context - Context in which the command is active
   * @param modifierKey - Modifier key required for the command (e.g. Ctrl, Alt)
   * @param keyCode - Key code that triggers the command
   * @param commandFunction - Function to execute when command is triggered
   * @param commandParent - Parent object on which to call the command function
   * @param commandParams - Parameters to pass to the command function
   */
  BuildCommand(name, context, modifierKey, keyCode, commandFunction, commandParent, commandParams?) {
    T3Util.Log('U.KeyboardUtil: Creating keyboard command', name, context, modifierKey, keyCode);

    this.Name = name !== null ? name : null;
    this.Context = context !== null ? context : KeyboardConstant.Contexts.None;
    this.ModifierKey = modifierKey !== null ? modifierKey : KeyboardConstant.ModifierKeys.None;
    this.KeyCode = keyCode !== null ? keyCode : null;

    this.Command = typeof commandFunction === 'function' ? commandFunction : function () {
      alert('Keyboard command \'' + this.Name + '\' (' + this.ModifierKey + ' + ' + this.KeyCode + ') is unbound.');
    };

    this.CommandParent = commandParent !== null ? commandParent : this;
    this.CommandParams = commandParams !== null ? commandParams : [];

    /**
     * Executes the keyboard command with its defined parameters
     * @returns Result of the command execution
     */
    this.Execute = function () {
      T3Util.Log('U.KeyboardUtil: Executing command', this.Name);
      const result = this.Command.apply(this.CommandParent, this.CommandParams);
      T3Util.Log('U.KeyboardUtil: Command execution complete', this.Name);
      return result;
    };

    return this;
  }
}

export default KeyboardUtil
