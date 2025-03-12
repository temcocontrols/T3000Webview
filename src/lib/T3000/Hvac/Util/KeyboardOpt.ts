

import KeyboardUtil from "./KeyboardUtil"
import KeyboardConstant from "./KeyboardConstant"
import ToolUtil from "./ToolUtil"
import Utils3 from "../Helper/Utils3"
import T3Gv from "../Data/T3Gv"
import $ from "jquery"
import T3Constant from "../Data/T3Constant"
import DocUtil from "../Doc/DocUtil"

class KeyboardOpt {

  public KeyboardCommands: any;
  public toolUtil: ToolUtil;
  public keyboardUtil: KeyboardUtil;
  public keyConstants: any;
  public keyContext: any;
  public keyModifierKeys: any;
  public docUtil: DocUtil;

  constructor() {
    this.KeyboardCommands = { All: [], ReadOnly: [], Text: [], WallOpt: [], Automation: [], AutomationNoCtrl: [], Navigation: [] };
    this.toolUtil = new ToolUtil();
    this.keyboardUtil = new KeyboardUtil();
    this.docUtil = new DocUtil();
    this.keyConstants = KeyboardConstant;
    this.keyContext = this.keyConstants.Contexts;
    this.keyModifierKeys = this.keyConstants.ModifierKeys;
  }

  BuildCommands() {

    this.KeyboardCommands.All = [
      this.keyboardUtil.BuildCommand('Copy', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.C, this.toolUtil.Copy, this.toolUtil),
      this.keyboardUtil.BuildCommand('Cut', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.X, this.toolUtil.Cut, this.toolUtil),
      this.keyboardUtil.BuildCommand('Paste', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.V, this.toolUtil.Paste, this.toolUtil),
      this.keyboardUtil.BuildCommand('Undo', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.Z, this.toolUtil.Undo, this.toolUtil),
      this.keyboardUtil.BuildCommand('Redo', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.Y, this.toolUtil.Redo, this.toolUtil),
      this.keyboardUtil.BuildCommand('SelectAll', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.A, this.toolUtil.SelectAllObjects, this.toolUtil),
      this.keyboardUtil.BuildCommand('Delete', this.keyContext.All, this.keyModifierKeys.None, this.keyConstants.Keys.Delete, this.toolUtil.DeleteSelectedObjects, this.toolUtil),
      this.keyboardUtil.BuildCommand('Cancel', this.keyContext.All, this.keyModifierKeys.None, this.keyConstants.Keys.Escape, this.toolUtil.CancelModalOperation, this.toolUtil),
      this.keyboardUtil.BuildCommand('Group', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.G, this.toolUtil.GroupSelectedShapes, this.toolUtil),
      this.keyboardUtil.BuildCommand('Ungroup', this.keyContext.All, this.keyModifierKeys.Ctrl_Shift, this.keyConstants.Keys.G, this.toolUtil.UnGroupSelectedShapes, this.toolUtil),
      this.keyboardUtil.BuildCommand('Duplicate', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.D, this.toolUtil.Duplicate, this.toolUtil),
      this.keyboardUtil.BuildCommand('Save', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.S, this.toolUtil.Save, this.toolUtil),
      this.keyboardUtil.BuildCommand('ZoomIn', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.Add, this.docUtil.ZoomIn, this.docUtil),
      this.keyboardUtil.BuildCommand('ZoomOut', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.Subtract, this.docUtil.ZoomOut, this.docUtil),
      this.keyboardUtil.BuildCommand('ZoomIn', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.Equal_Sign, this.docUtil.ZoomIn, this.docUtil),
      this.keyboardUtil.BuildCommand('ZoomOut', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.Dash, this.docUtil.ZoomOut, this.docUtil)
    ];

    this.KeyboardCommands.ReadOnly = [
      this.keyboardUtil.BuildCommand('ZoomIn', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.Add, this.docUtil.ZoomIn, this.docUtil),
      this.keyboardUtil.BuildCommand('ZoomOut', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.Subtract, this.docUtil.ZoomOut, this.docUtil),
      this.keyboardUtil.BuildCommand('ZoomIn', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.Equal_Sign, this.docUtil.ZoomIn, this.docUtil),
      this.keyboardUtil.BuildCommand('ZoomOut', this.keyContext.All, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.Dash, this.docUtil.ZoomOut, this.docUtil)
    ];

    this.KeyboardCommands.Text = [
      this.keyboardUtil.BuildCommand('Copy', this.keyContext.Text, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.C, this.toolUtil.Copy, this.toolUtil),
      this.keyboardUtil.BuildCommand('Cut', this.keyContext.Text, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.X, this.toolUtil.Cut, this.toolUtil),
      this.keyboardUtil.BuildCommand('Paste', this.keyContext.Text, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.V, this.toolUtil.Paste, this.toolUtil),
      this.keyboardUtil.BuildCommand('Undo', this.keyContext.Text, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.Z, this.toolUtil.Undo, this.toolUtil),
      this.keyboardUtil.BuildCommand('Redo', this.keyContext.Text, this.keyModifierKeys.Ctrl, this.keyConstants.Keys.Y, this.toolUtil.Redo, this.toolUtil)
    ];

    this.KeyboardCommands.WallOpt = [];
    this.KeyboardCommands.Automation = [];
    this.KeyboardCommands.AutomationNoCtrl = [];
    this.KeyboardCommands.Navigation = [];
  }

  /**
   * Gets the keyboard commands associated with a specific context
   * @param context - The context for which to retrieve commands
   * @returns Array of keyboard commands for the specified context
   */
  GetCommandsInContext(context) {
    console.log('U.KeyboardUtil: Getting commands for context', context);

    let commands = [];

    switch (context) {
      case this.keyContext.All:
        commands = this.KeyboardCommands.All;
        break;
      case this.keyContext.ReadOnly:
        commands = this.KeyboardCommands.ReadOnly;
        break;
      case this.keyContext.Automation:
        commands = this.KeyboardCommands.Automation;
        break;
      case this.keyContext.AutomationNoCtrl:
        commands = this.KeyboardCommands.AutomationNoCtrl;
        break;
      case this.keyContext.WallOpt:
        commands = this.KeyboardCommands.WallOpt;
        break;
      case this.keyContext.Text:
      case this.KeyboardCommands.DimensionText:
        commands = this.KeyboardCommands.Text;
        break;
      case this.keyContext.Navigation:
        commands = this.KeyboardCommands.Navigation;
        break;
    }

    console.log('U.KeyboardUtil: Retrieved', commands?.length, 'commands for context', context);
    return commands;
  }

  /**
   * Handles key up events and updates document context accordingly
   * @param event - The keyboard event object
   */
  static OnKeyUp(event) {
    console.log('U.KeyboardUtil: Processing key up event', event.keyCode);

    if (event.keyCode === KeyboardConstant.Keys.Space) {
      console.log('U.KeyboardUtil: Space key released, updating spacebar state');
      T3Constant.DocContext.SpacebarDown = false;
    }
  }

  /**
   * Handles key down events and processes keyboard commands
   * @param event - The keyboard event object
   */
  static OnKeyDown(event) {
    console.log('U.KeyboardUtil: Processing key down event', event.keyCode);

    const keyCode = event.keyCode;
    const modifierKeys = Utils3.GetModifierKeys(event);

    // Update spacebar state
    if (keyCode === KeyboardConstant.Keys.Space) {
      console.log('U.KeyboardUtil: Space key pressed, updating spacebar state');
      T3Constant.DocContext.SpacebarDown = true;
    }

    // Handle target element
    const targetElement = $(event.target || event.srcElement);

    // Prevent default backspace behavior unless in input field
    if (keyCode === 8 &&
      !(targetElement.is('input,[contenteditable="true"],textarea') &&
        targetElement.attr("type") !== "radio" &&
        targetElement.attr("type") !== "checkbox")) {
      console.log('U.KeyboardUtil: Preventing default backspace behavior');
      event.preventDefault();
    }

    try {
      // Check for dropdown text attribute
      let isDropdownText = false;
      if (targetElement && targetElement[0].attributes) {
        isDropdownText = targetElement[0].attributes.getNamedItem("dropDownText");
      }

      // Handle dropdowns and key commands
      if (!(isDropdownText != null && isDropdownText.value === "1") &&
        keyCode !== KeyboardConstant.Keys.Alt &&
        keyCode !== KeyboardConstant.Keys.Ctrl) {
        // Note: The following line was commented out in the original code
        // Commands.MainController.Dropdowns.HideAllDropdowns();
      }

      console.log('U.KeyboardUtil: Delegating key handling to MainController', {
        keyCode: keyCode,
        modifierKeys: modifierKeys
      });
      KeyboardOpt.HandleKeyDown(event, keyCode, modifierKeys);
    } catch (error) {
      console.error('U.KeyboardUtil: Error in key down handler', error);
      T3Gv.optManager.ExceptionCleanup(error);
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
    console.log('U.KeyboardUtil: Processing key down event', { keyCode, modifierKey });

    // Handle touch pan with space key
    if (T3Gv.optManager.touchPanStarted && keyCode == KeyboardConstant.Keys.Space) {
      event.stopPropagation();
      event.preventDefault();
      console.log('U.KeyboardUtil: Prevented default for space during touch pan');
      return;
    }

    let selectionObj;
    let isTextContext = false;
    let deferredTextEdit = false;
    let contexts = [];
    let contextCount = 0;
    let index = 0;
    let keyboardOpt = new KeyboardOpt();
    let toolUtil = new ToolUtil();

    // Check if arrows are used and shape insert should be disabled
    const disableArrowShapeInsert = (
      (keyCode == KeyboardConstant.Keys.Left_Arrow ||
        keyCode == KeyboardConstant.Keys.Right_Arrow ||
        keyCode == KeyboardConstant.Keys.Up_Arrow ||
        keyCode == KeyboardConstant.Keys.Down_Arrow) &&
      T3Gv.userSettings.DisableCtrlArrowShapeInsert
    );

    // Handle clipboard operations in Firefox
    if (modifierKey == 1 && (
      keyCode == 67 || keyCode == 99 ||  // 'C' or 'c'
      keyCode == 88 || keyCode == 120 || // 'X' or 'x'
      keyCode == 86 || keyCode == 118    // 'V' or 'v'
    )) {
      if (Clipboard.isFF) {
        Clipboard.FocusOnIEclipboardDiv();
        console.log('U.KeyboardUtil: Focusing on IE clipboard div for Firefox');
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
        const contextCommands = keyboardOpt.GetCommandsInContext(currentContext);
        const commandCount = contextCommands.length;

        // Try to find and execute a command matching the key combination
        for (index = 0; index < commandCount; index++) {
          const command = contextCommands[index];
          if (command.KeyCode === keyCode && command.ModifierKey === modifierKey) {
            if (disableArrowShapeInsert && isTextContext) {
              break;
            }

            if (!command.Execute()) {
              console.log('U.KeyboardUtil: Command executed and prevented default', { command: command.Name });
              event.stopPropagation();
              event.preventDefault();
              return;
            }
          }
        }

        // Check if typing in work area is disabled
        if (T3Constant.DocContext.CanTypeInWorkArea === false) {
          if (keyCode === KeyboardConstant.Keys.Escape) {
            T3Gv.optManager.Comment_Cancel();
            console.log('U.KeyboardUtil: Comment cancelled');
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
          T3Gv.optManager.DeactivateAllTextEdit(false);
          if (T3Gv.optManager.bInNoteEdit) {
            T3Gv.optManager.Note_CloseEdit();
          }
          T3Gv.optManager.RenderAllSVGSelectionStates();
          event.stopPropagation();
          event.preventDefault();
          console.log('U.KeyboardUtil: Text edit closed with Escape key');
        } else if (toolUtil.HandleKeyDown(event, keyCode, modifierKey)) {
          event.stopPropagation();
          event.preventDefault();
          console.log('U.KeyboardUtil: Key event handled by shapes controller');
        }
      }
    }

    console.log('U.KeyboardUtil: Key down handling complete');
  }

  /**
   * Handles key press events and forwards them to the main controller
   * @param event - The keyboard event object
   */
  static OnKeyPress(event) {
    console.log('U.KeyboardUtil: Processing key press event', event.charCode);

    const charCode = event.charCode;

    try {
      console.log('U.KeyboardUtil: Delegating key press handling to MainController', { charCode });
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
    console.log('U.KeyboardUtil: Handling key press event', { charCode });

    let isTextContext = false;
    let toolUtil = new ToolUtil();

    // Handle touch pan with space key
    if (T3Gv.optManager.touchPanStarted && charCode == KeyboardConstant.Keys.Space) {
      console.log('U.KeyboardUtil: Preventing default for space during touch pan');
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
          console.log('U.KeyboardUtil: Focusing on IE clipboard div for Firefox');
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

          console.log('U.KeyboardUtil: Delegating key press to shape handler in text context');
          if (toolUtil.HandleKeyPress(event, charCode)) {
            event.stopPropagation();
          }
        }
      }
    }

    console.log('U.KeyboardUtil: Key press handling complete');
  }
}

export default KeyboardOpt
