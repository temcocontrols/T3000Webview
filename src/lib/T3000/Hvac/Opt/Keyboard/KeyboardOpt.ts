

import KeyboardConstant from "./KeyboardConstant"
import ToolUtil from "../Tool/ToolUtil"
import Utils3 from "../../Util/Utils3"
import T3Gv from "../../Data/T3Gv"
import $ from "jquery"
import T3Constant from "../../Data/Constant/T3Constant"
import DocUtil from "../../Doc/DocUtil"
import KeyboardUtil from "./KeyboardUtil"
import T3Util from "../../Util/T3Util"
import SvgUtil from "../Opt/SvgUtil"

/**
 * Class that manages keyboard commands and event handling for the T3000 HVAC application.
 *
 * This class is responsible for:
 * - Building and organizing keyboard commands for different contexts
 * - Processing keyboard events (keydown, keyup, keypress)
 * - Executing appropriate commands based on the current context and key combinations
 * - Managing specialized behavior for text editing contexts
 *
 * @example
 * // Initialize keyboard commands
 * const keyboardManager = new KeyboardOpt();
 * keyboardManager.BuildCommands();
 *
 * // Get commands for a specific context
 * const allCommands = keyboardManager.GetCommandsInContext(KeyboardConstant.Contexts.All);
 *
 * // Register event handlers
 * document.addEventListener('keydown', KeyboardOpt.OnKeyDown);
 * document.addEventListener('keyup', KeyboardOpt.OnKeyUp);
 * document.addEventListener('keypress', KeyboardOpt.OnKeyPress);
 *
 * @example
 * // Adding a new keyboard command
 * this.KeyboardCommands.All.push(
 *   this.keyboardUtil.BuildCommand(
 *     'SaveAs',
 *     this.keyContext.All,
 *     KeyboardConstant.ModifierKeys.Ctrl_Shift,
 *     KeyboardConstant.Keys.S,
 *     this.toolUtil.SaveAs,
 *     this.toolUtil
 *   )
 * );
 */
class KeyboardOpt {

  constructor() {
  }

  /**
   * Gets the keyboard commands associated with a specific context
   * @param context - The context for which to retrieve commands
   * @returns Array of keyboard commands for the specified context
   */
  static GetCommandsInContext(context, kybUtil, toolUtil, docUtil) {
    T3Util.Log('U.KeyboardUtil: Getting commands for context', context);

    let commands = [];

    switch (context) {
      case KeyboardConstant.Contexts.All:
        commands.push(new KeyboardUtil().BuildCommand('Copy', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.C, toolUtil.Copy, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('Cut', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.X, toolUtil.Cut, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('Paste', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.V, toolUtil.Paste, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('Undo', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.Z, toolUtil.Undo, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('Redo', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.Y, toolUtil.Redo, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('SelectAll', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.A, toolUtil.SelectAllObjects, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('Delete', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.None, KeyboardConstant.Keys.Delete, toolUtil.DeleteSelectedObjects, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('Cancel', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.None, KeyboardConstant.Keys.Escape, toolUtil.CancelOperation, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('Group', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.G, toolUtil.GroupSelected, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('Ungroup', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl_Shift, KeyboardConstant.Keys.G, toolUtil.UnGroupSelected, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('Duplicate', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.D, toolUtil.Duplicate, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('Save', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.S, toolUtil.Save, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('ZoomIn', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.Add, docUtil.ZoomIn, docUtil));
        commands.push(new KeyboardUtil().BuildCommand('ZoomOut', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.Subtract, docUtil.ZoomOut, docUtil));
        commands.push(new KeyboardUtil().BuildCommand('ZoomIn', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.Equal_Sign, docUtil.ZoomIn, docUtil));
        commands.push(new KeyboardUtil().BuildCommand('ZoomOut', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.Dash, docUtil.ZoomOut, docUtil));
        break;
      case KeyboardConstant.Contexts.ReadOnly:
        commands.push(new KeyboardUtil().BuildCommand('ZoomIn', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.Add, docUtil.ZoomIn, docUtil));
        commands.push(new KeyboardUtil().BuildCommand('ZoomOut', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.Subtract, docUtil.ZoomOut, docUtil));
        commands.push(new KeyboardUtil().BuildCommand('ZoomIn', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.Equal_Sign, docUtil.ZoomIn, docUtil));
        commands.push(new KeyboardUtil().BuildCommand('ZoomOut', KeyboardConstant.Contexts.All, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.Dash, docUtil.ZoomOut, docUtil));
        break;
      case KeyboardConstant.Contexts.Automation:
        break;
      case KeyboardConstant.Contexts.AutomationNoCtrl:
        break;
      case KeyboardConstant.Contexts.WallOpt:
        break;
      case KeyboardConstant.Contexts.Text:
      case KeyboardConstant.Contexts.DimensionText:
        commands.push(new KeyboardUtil().BuildCommand('Copy', KeyboardConstant.Contexts.Text, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.C, toolUtil.Copy, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('Cut', KeyboardConstant.Contexts.Text, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.X, toolUtil.Cut, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('Paste', KeyboardConstant.Contexts.Text, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.V, toolUtil.Paste, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('Undo', KeyboardConstant.Contexts.Text, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.Z, toolUtil.Undo, toolUtil));
        commands.push(new KeyboardUtil().BuildCommand('Redo', KeyboardConstant.Contexts.Text, KeyboardConstant.ModifierKeys.Ctrl, KeyboardConstant.Keys.Y, toolUtil.Redo, toolUtil));
        break;
      case KeyboardConstant.Contexts.Navigation:
        break;
    }

    T3Util.Log('U.KeyboardUtil: Retrieved', commands?.length, 'commands for context', context);
    return commands;
  }

  /**
   * Handles key up events and updates document context accordingly
   * @param event - The keyboard event object
   */
  static OnKeyUp(event) {
    T3Util.Log('U.KeyboardUtil: Processing key up event', event.keyCode);

    if (event.keyCode === KeyboardConstant.Keys.Space) {
      T3Util.Log('U.KeyboardUtil: Space key released, updating spacebar state');
      T3Constant.DocContext.SpacebarDown = false;
    }
  }

  /**
   * Handles key down events and processes keyboard commands
   * @param event - The keyboard event object
   */
  static OnKeyDown(event) {
    T3Util.Log('U.KeyboardUtil: Processing key down event', event.keyCode);

    const keyCode = event.keyCode;
    const modifierKeys = Utils3.GetModifierKeys(event);

    // Update spacebar state
    if (keyCode === KeyboardConstant.Keys.Space) {
      T3Util.Log('U.KeyboardUtil: Space key pressed, updating spacebar state');
      T3Constant.DocContext.SpacebarDown = true;
    }

    // Handle target element
    const targetElement = $(event.target || event.srcElement);

    // Prevent default backspace behavior unless in input field
    if (keyCode === 8 &&
      !(targetElement.is('input,[contenteditable="true"],textarea') &&
        targetElement.attr("type") !== "radio" &&
        targetElement.attr("type") !== "checkbox")) {
      T3Util.Log('U.KeyboardUtil: Preventing default backspace behavior');
      event.preventDefault();
    }

    try {
      KeyboardOpt.HandleKeyDown(event, keyCode, modifierKeys);
    } catch (error) {
      console.error('U.KeyboardUtil: Error in key down handler', error);
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }
  }

  /**
   * Handles key down events and executes appropriate commands based on context
   * @param event - The keyboard event object
   * @param keyCode - The code of the key pressed
   * @param modifierKey - The modifier key that was pressed with the key
   */
  static HandleKeyDown(event, keyCode, modifierKey) {
    T3Util.Log('U.KeyboardUtil: Processing key down event', { keyCode, modifierKey });

    // Handle touch pan with space key
    if (T3Gv.opt.touchPanStarted && keyCode == KeyboardConstant.Keys.Space) {
      event.stopPropagation();
      event.preventDefault();
      T3Util.Log('U.KeyboardUtil: Prevented default for space during touch pan');
      return;
    }

    let selectionObj;
    let isTextContext = false;
    let deferredTextEdit = false;
    let contexts = [];
    let contextCount = 0;
    let index = 0;
    let toolUtil = new ToolUtil();
    let kybUtil = new KeyboardUtil();
    let docUtil = new DocUtil();

    // Check if arrows are used and shape insert should be disabled
    const disableArrowShapeInsert = (
      (keyCode == KeyboardConstant.Keys.Left_Arrow ||
        keyCode == KeyboardConstant.Keys.Right_Arrow ||
        keyCode == KeyboardConstant.Keys.Up_Arrow ||
        keyCode == KeyboardConstant.Keys.Down_Arrow) &&
      T3Gv.userSetting.DisableCtrlArrowShapeInsert
    );

    // Handle clipboard operations in Firefox
    if (modifierKey == 1 && (
      keyCode == 67 || keyCode == 99 ||  // 'C' or 'c'
      keyCode == 88 || keyCode == 120 || // 'X' or 'x'
      keyCode == 86 || keyCode == 118    // 'V' or 'v'
    )) {
      if (Clipboard.isFF) {
        Clipboard.FocusOnIEclipboardDiv();
        T3Util.Log('U.KeyboardUtil: Focusing on IE clipboard div for Firefox');
      }
    } else {
      // Get the current selection context
      if (selectionObj != null) {
        contexts.push(selectionObj);
      }

      let selectionContext = toolUtil.GetSelectionContext();

      // Handle title input specifically
      if (event.target.id === "titleInput") {
        selectionContext = KeyboardConstant.Contexts.Text;
      }

      // Process multiple contexts if available
      if (selectionContext instanceof Array) {
        contextCount = selectionContext.length;
        for (index = 0; index < contextCount; index++) {
          contexts.push(selectionContext[index]);
        }
      } else {
        contexts.push(selectionContext);
      }

      // Add default contexts
      const nullContext = null;
      if (contexts.indexOf(nullContext) < 0) {
        contexts.push(nullContext);
      }
      contexts.push(KeyboardConstant.Contexts.All);
      contextCount = contexts.length;

      // Override with ReadOnly context if document is read-only
      if (T3Gv.docUtil.IsReadOnly()) {
        contexts = [KeyboardConstant.Contexts.ReadOnly];
        contextCount = contexts.length;
      }

      // Process each context to find matching keyboard commands
      for (let contextIndex = 0; contextIndex < contextCount; contextIndex++) {
        const currentContext = contexts[contextIndex];
        const contextCommands = KeyboardOpt.GetCommandsInContext(currentContext, kybUtil, toolUtil, docUtil);
        const commandCount = contextCommands.length;

        // Try to find and execute a command matching the key combination
        for (index = 0; index < commandCount; index++) {
          const command = contextCommands[index];
          if (command.KeyCode === keyCode && command.ModifierKey === modifierKey) {
            if (disableArrowShapeInsert && isTextContext) {
              break;
            }

            if (!command.Execute()) {
              T3Util.Log('U.KeyboardUtil: Command executed and prevented default', { command: command.Name });
              event.stopPropagation();
              event.preventDefault();
              return;
            }
          }
        }

        // Check if typing in work area is disabled
        if (T3Constant.DocContext.CanTypeInWorkArea === false) {
          if (keyCode === KeyboardConstant.Keys.Escape) {
            T3Gv.opt.Comment_Cancel();
            T3Util.Log('U.KeyboardUtil: Comment cancelled');
          }
          return;
        }

        // Handle text contexts specially
        if (currentContext === KeyboardConstant.Contexts.DimensionText) {
          isTextContext = true;
        }

        if (currentContext === KeyboardConstant.Contexts.Text &&
          (modifierKey === KeyboardConstant.ModifierKeys.None ||
            modifierKey === KeyboardConstant.ModifierKeys.Shift ||
            modifierKey === KeyboardConstant.ModifierKeys.Ctrl ||
            modifierKey === KeyboardConstant.ModifierKeys.Ctrl_Shift)) {

          if (toolUtil.IsActiveTextEdit() === false &&
            event.target.id != "titleInput") {
            if (KeyboardConstant.NonTextKeys.indexOf(keyCode) != -1) {
              continue;
            }
            if (modifierKey != KeyboardConstant.ModifierKeys.Ctrl) {
              isTextContext = true;
            }
          } else {
            isTextContext = true;
          }
        }

        // Break out of context loop if we're in a text context and not using Ctrl
        if (isTextContext && modifierKey != KeyboardConstant.ModifierKeys.Ctrl) {
          break;
        }
      }

      // Handle text context key events
      if (isTextContext) {
        if (keyCode === KeyboardConstant.Keys.Escape) {
          T3Gv.opt.DeactivateAllTextEdit(false);
          if (T3Gv.opt.bInNoteEdit) {
            T3Gv.opt.Note_CloseEdit();
          }
          SvgUtil.RenderAllSVGSelectionStates();
          event.stopPropagation();
          event.preventDefault();
          T3Util.Log('U.KeyboardUtil: Text edit closed with Escape key');
        } else if (toolUtil.HandleKeyDown(event, keyCode, modifierKey)) {
          event.stopPropagation();
          event.preventDefault();
          T3Util.Log('U.KeyboardUtil: Key event handled by shapes controller');
        }
      }
    }

    T3Util.Log('U.KeyboardUtil: Key down handling complete');
  }

  /**
   * Handles key press events and forwards them to the main controller
   * @param event - The keyboard event object
   */
  static OnKeyPress(event) {
    T3Util.Log('U.KeyboardUtil: Processing key press event', event.charCode);

    const charCode = event.charCode;

    try {
      T3Util.Log('U.KeyboardUtil: Delegating key press handling to MainController', { charCode });
      KeyboardOpt.HandleKeyPress(event, charCode);
    } catch (error) {
      console.error('U.KeyboardUtil: Error in key press handler', error);
      throw error;
    }
  }

  /**
   * Handles key press events in the document
   * @param event - The key press event
   * @param charCode - The character code of the pressed key
   */
  static HandleKeyPress(event, charCode) {
    T3Util.Log('U.KeyboardUtil: Handling key press event', { charCode });

    let isTextContext = false;
    let toolUtil = new ToolUtil();

    // Handle touch pan with space key
    if (T3Gv.opt.touchPanStarted && charCode == KeyboardConstant.Keys.Space) {
      T3Util.Log('U.KeyboardUtil: Preventing default for space during touch pan');
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    // Check if modals are not visible (using true instead of the original modal check)
    if (true) {
      // Handle clipboard operations in Firefox
      if (Utils3.GetModifierKeys(event) == 1 &&
        (charCode == 67 || charCode == 99 || // 'C' or 'c'
          charCode == 88 || charCode == 120 || // 'X' or 'x'
          charCode == 86 || charCode == 118)) { // 'V' or 'v'
        if (Clipboard.isFF) {
          T3Util.Log('U.KeyboardUtil: Focusing on IE clipboard div for Firefox');
          Clipboard.FocusOnIEclipboardDiv();
        }
      } else if (T3Constant.DocContext.CanTypeInWorkArea !== false && !T3Gv.docUtil.IsReadOnly()) {
        // Check if we're in a text editing context
        const selectionContext = toolUtil.GetSelectionContext();

        if (selectionContext instanceof Array) {
          isTextContext = selectionContext.indexOf(KeyboardConstant.Contexts.Text) >= 0;
        }

        if (isTextContext ||
          selectionContext === KeyboardConstant.Contexts.Text ||
          selectionContext === KeyboardConstant.Contexts.DimensionText) {

          T3Util.Log('U.KeyboardUtil: Delegating key press to shape handler in text context');
          if (toolUtil.HandleKeyPress(event, charCode)) {
            event.stopPropagation();
          }
        }
      }
    }

    T3Util.Log('U.KeyboardUtil: Key press handling complete');
  }
}

export default KeyboardOpt
