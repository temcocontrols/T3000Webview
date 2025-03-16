

import KeyboardConstant from "./KeyboardConstant"

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
    console.log('U.KeyboardUtil: Creating keyboard command', name, context, modifierKey, keyCode);

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
      console.log('U.KeyboardUtil: Executing command', this.Name);
      const result = this.Command.apply(this.CommandParent, this.CommandParams);
      console.log('U.KeyboardUtil: Command execution complete', this.Name);
      return result;
    };
  }
}

export default KeyboardUtil
