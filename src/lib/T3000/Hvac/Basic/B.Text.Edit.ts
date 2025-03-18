

import $ from "jquery"
import Creator from './B.Path.Creator'
import T3Gv from '../Data/T3Gv'
import NvConstant from "../Data/Constant/NvConstant"
import OptConstant from "../Data/Constant/OptConstant"
import KeyboardConstant from "../Opt/Keyboard/KeyboardConstant"
import CursorConstant from "../Data/Constant/CursorConstant"

class Edit {

  public parent: any;
  public isActive: boolean;
  public selStart: number;
  public selEnd: number;
  public selAnchor: number;
  public inActiveSel: any;
  public activeSelPos: number;
  public cursorPos: number;
  public cursorLine: any;
  public curHit: any;
  public lastClickTime: number;
  public inWordSelect: boolean;
  public anchorWord: any;
  public savedCursorState: any;
  public TableDrag: boolean;
  public virtualKeyboardHook: any;
  public activateInit: any;
  public lastKeyProcessed: any;
  public textEntryField: any;
  public textEntrySelStart: number;
  public textEntrySelEnd: number;
  public inputFocusTimer: any;

  /**
   * Constructor for the Edit class
   * @param parentComponent - The parent component that owns this Edit instance
   */
  constructor(parentComponent: any) {
    this.parent = parentComponent;
    this.isActive = false;
    this.selStart = -1;
    this.selEnd = -1;
    this.selAnchor = -1;
    this.inActiveSel = false;
    this.activeSelPos = -1;
    this.cursorPos = -1;
    this.cursorLine = undefined;
    this.curHit = null;
    this.lastClickTime = 0;
    this.inWordSelect = false;
    this.anchorWord = null;
    this.savedCursorState = this.parent.cursorState;
    this.TableDrag = false;
  }

  /**
   * Begins the table drag operation
   * Disables cursor, clears selection, and prepares for drag operation
   */
  BeginTableDrag() {
    this.TableDrag = true;
    this.DeactivateCursor();
    this.ClearSelection();
    this.parent.SetSelectionVisible(false);
    this.parent.ClearDataFieldHilites();
    this.curHit = null;
  }

  /**
   * Sets the virtual keyboard hook and initializes text entry
   * @param virtualKeyboardHandler - The handler function for virtual keyboard events
   * @param textEntryFieldElement - The text entry field element to initialize
   */
  SetVirtualKeyboardHook(virtualKeyboardHandler: any, textEntryFieldElement: any) {
    this.virtualKeyboardHook = virtualKeyboardHandler;
    this.InitTextEntry(textEntryFieldElement);
  }

  /**
   * Activates the text edit functionality
   * @param eventData - The event that triggered the activation
   * @param shouldSpellCheck - Whether to perform spell checking after activation
   */
  Activate(eventData, shouldSpellCheck) {
    this.isActive = true;
    this.inActiveSel = false;
    this.lastClickTime = 0;
    this.selStart = -1;
    this.selEnd = -1;
    this.selAnchor = -1;
    this.parent.decorationAreaElem.attr('pointer-events', OptConstant.EventBehavior.None);
    this.parent.clickAreaElem.attr('pointer-events', OptConstant.EventBehavior.HiddenAll);
    this.parent.CallEditCallback('activate');
    this.savedCursorState = this.parent.cursorState;
    this.parent.cursorState = CursorConstant.CursorState.None;
    this.activateInit = true;
    this.lastKeyProcessed = false;

    setTimeout(() => {
      this.activateInit = false;
    }, 10);

    if (this.textEntryField) {
      this.InitTextEntry(this.textEntryField);
    }

    if (eventData) {
      eventData.gesture = {
        center: {
          clientX: eventData.clientX,
          clientY: eventData.clientY
        }
      };
      this.HandleMouseDown(eventData);
      if (shouldSpellCheck) {
        this.parent.DoSpellCheck();
      } else {
        this.HandleMouseUp(eventData);
      }
      if (this.virtualKeyboardHook) {
        this.virtualKeyboardHook(this.parent, true);
      }
    } else {
      this.SetInsertPos(this.parent.GetTextLength());
      if (this.virtualKeyboardHook) {
        this.virtualKeyboardHook(this.parent, true);
      }
      this.parent.DoSpellCheck();
    }

    this.parent.SetCursorState(CursorConstant.CursorState.EditLink);
    this.UpdateTextEntryField(false);
    this.parent.RenderDataFieldHilites();
  }

  /**
   * Deactivates the text edit functionality and cleans up state
   * @param event - The event that triggered the deactivation (optional)
   */
  Deactivate(event: any) {
    this.isActive = false;
    this.inActiveSel = false;
    this.selStart = -1;
    this.selEnd = -1;
    this.selAnchor = -1;
    this.activateInit = false;

    if (!event) {
      this.parent.DoSpellCheck();
      this.parent.UpdateTextObject();
    }

    this.parent.clickAreaElem.node.removeAttribute('pointer-events');

    if (this.parent.cursorState === CursorConstant.CursorState.EditLink) {
      this.parent.SetCursorState(this.savedCursorState);
    }

    this.savedCursorState = this.parent.cursorState;
    this.DeactivateCursor();
    this.ClearSelection();
    this.parent.ClearDataFieldHilites();
    this.parent.CallEditCallback('deactivate');

    if (this.virtualKeyboardHook) {
      this.virtualKeyboardHook(this.parent, false);
    }

    if (this.textEntryField) {
      this.textEntryField.off('input');
    }
  }

  /**
   * Checks if the editor is currently active
   * @returns Boolean indicating if editor is active
   */
  IsActive() {
    return this.isActive;
  }

  /**
   * Sets the text selection range
   * @param start - The starting position of the selection
   * @param end - The ending position of the selection
   * @param line - The line information for the cursor (optional)
   * @param anchor - The anchor position for the selection (optional)
   * @param updateTextEntry - Whether to update the text entry field (optional)
   */
  SetSelection(start: number, end: number, line: any, anchor: number, updateTextEntry?: boolean) {
    if (start >= 0 && start === end) {
      this.SetInsertPos(start, { rLine: line });
    } else {
      this.selStart = start;
      this.selEnd = end;
      this.selAnchor = anchor !== undefined ? anchor : start;
      this.UpdateSelection();
    }

    if (!updateTextEntry) {
      this.UpdateTextEntryField(true);
    }
  }

  /**
   * Clears the current text selection
   */
  ClearSelection() {
    this.selStart = -1;
    this.selEnd = -1;
    this.selAnchor = -1;
    this.UpdateSelection();
  }

  /**
   * Gets the current text selection information
   * @returns Object containing selection details (start, end, line, anchor)
   */
  GetSelection() {
    const selection = {
      start: this.selStart,
      end: this.selEnd,
      line: this.cursorLine,
      anchor: this.selAnchor
    };
    return selection;
  }

  /**
   * Sets the insert position (cursor position) in the text
   * @param position - The position to place the cursor
   * @param lineInfo - Information about the line where the cursor is placed (optional)
   * @param updateTextEntry - Whether to update the text entry field (optional)
   */
  SetInsertPos(position: number, lineInfo?: any, updateTextEntry?: boolean) {
    this.selStart = position;
    this.selEnd = position;
    this.selAnchor = position;
    this.UpdateSelection();
    this.cursorPos = position;
    this.cursorLine = lineInfo ? lineInfo.rLine : undefined;
    this.UpdateCursor();
    if (!updateTextEntry) {
      this.UpdateTextEntryField(true);
    }
    this.parent.CallEditCallback('select');
  }

  /**
   * Updates the visual representation of the text selection
   */
  UpdateSelection() {
    let renderedRange, pathCreator;
    pathCreator = new Creator();
    this.DeactivateCursor();
    if (this.selStart < 0 || this.selEnd < 0 || this.selStart === this.selEnd) {
      this.parent.HideSelection();
    } else {
      renderedRange = this.parent.formatter.GetRenderedRange(this.selStart, this.selEnd);
      if (renderedRange.length) {
        for (let i = 0; i < renderedRange.length; i++) {
          pathCreator.MoveTo(renderedRange[i].left, renderedRange[i].top);
          pathCreator.LineTo(renderedRange[i].right, renderedRange[i].top);
          pathCreator.LineTo(renderedRange[i].right, renderedRange[i].bottom);
          pathCreator.LineTo(renderedRange[i].left, renderedRange[i].bottom);
          pathCreator.ClosePath();
        }
        const pathString = pathCreator.ToString();
        this.parent.ShowSelection(pathString);
      } else {
        this.parent.HideSelection();
      }
    }
  }

  /**
   * Deactivates and hides the text cursor
   */
  DeactivateCursor() {
    this.parent.HideInputCursor();
    this.cursorPos = -1;
    this.cursorLine = undefined;
  }

  /**
   * Updates the visual representation and position of the cursor
   */
  UpdateCursor() {
    if (this.cursorPos < 0) {
      this.DeactivateCursor();
    } else {
      const charInfo = this.parent.formatter.GetRenderedCharInfo(this.cursorPos, this.cursorLine);
      this.parent.ShowInputCursor(charInfo.left, charInfo.top, charInfo.bottom);
    }
  }

  /**
   * Handles mouse down events for text selection
   * @param event - The mouse down event
   * @returns Boolean indicating if the event was handled
   */
  HandleMouseDown(event) {
    const isShiftKey = event && (event.shiftKey || (event.gesture && event.gesture.srcEvent && event.gesture.srcEvent.shiftKey));
    const isRightClick = T3Gv.opt.IsRightClick(event);
    const currentTime = Date.now();
    this.activateInit = false;

    if (this.isActive && !isRightClick) {
      const clientX = event.gesture.center.clientX;
      const clientY = event.gesture.center.clientY;
      const coords = this.parent.doc.ConvertWindowToElemCoords(clientX, clientY, this.parent.textElem.node);

      if (!this.parent.linksDisabled && (this.parent.cursorState === CursorConstant.CursorState.EditLink || this.parent.cursorState === CursorConstant.CursorState.LinkOnly)) {
        const hyperlink = this.parent.formatter.GetHyperlinkAtPoint(coords);
        if (hyperlink) {
          this.parent.CallEditCallback('hyperlink', hyperlink.url);
          return false;
        }
      }

      const hitInfo = this.parent.formatter.GetHitInfo(coords);
      this.DeactivateCursor();
      this.parent.activeEditStyle = -1;
      this.inActiveSel = true;
      this.activeSelPos = hitInfo.index;

      if (this.selStart >= 0 && this.selAnchor >= 0 && isShiftKey) {
        this.HandleMouseMove(event);
        this.parent.CallEditCallback('click');
        return false;
      } else {
        this.selStart = hitInfo.index;
        this.selEnd = hitInfo.index;
        this.selAnchor = hitInfo.index;
        this.curHit = hitInfo;

        if (this.lastClickTime + 300 < currentTime) {
          this.inWordSelect = false;
          this.anchorWord = null;
        } else {
          const wordAtIndex = this.parent.formatter.GetWordAtIndex(hitInfo.index);
          if (wordAtIndex.end > wordAtIndex.start) {
            this.inWordSelect = true;
            this.anchorWord = wordAtIndex;
            this.selStart = wordAtIndex.start;
            this.selEnd = wordAtIndex.end;
            this.selAnchor = wordAtIndex.start;
          }
        }

        if (this.inWordSelect) {
          let dataField = this.parent.formatter.GetDataField(this.selStart);
          if (dataField) {
            this.selStart = dataField.startPos;
            this.selAnchor = dataField.startPos;
          }
          dataField = this.parent.formatter.GetDataField(this.selEnd);
          if (dataField) {
            this.selEnd = dataField.endPos;
          }
        } else {
          const dataField = this.parent.formatter.GetDataField(this.selStart);
          if (dataField && dataField.startPos !== this.selStart) {
            this.selStart = dataField.startPos;
            this.selEnd = dataField.endPos;
            this.selAnchor = dataField.startPos;
          }
        }

        this.lastClickTime = currentTime;
        this.SetSelection(this.selStart, this.selEnd, undefined, this.selAnchor);
        this.parent.CallEditCallback('click');
        return false;
      }
    }
  }

  /**
   * Handles mouse move events for text selection
   * @param event - The mouse move event
   * @returns Boolean indicating if the event was handled
   */
  HandleMouseMove(event) {
    let hitInfo, wordInfo, dataField;
    const coords = { x: 0, y: 0 };

    if (this.inActiveSel) {
      this.activateInit = false;
      const clientX = event.gesture.center.clientX;
      const clientY = event.gesture.center.clientY;
      const convertedCoords = this.parent.doc.ConvertWindowToElemCoords(clientX, clientY, this.parent.textElem.node);
      coords.x = convertedCoords.x;
      coords.y = convertedCoords.y;

      const transX = this.parent.textElem.trans.x;
      const transY = this.parent.textElem.trans.y;
      coords.x += transX;
      coords.y += transY;

      const parentPos = this.parent.GetPos();
      if (coords.x < 0 || coords.x > this.parent.geometryBBox.width || coords.y < 0 || coords.y > this.parent.geometryBBox.height) {
        const dragOutsideCoords = {
          x: parentPos.x + coords.x,
          y: parentPos.y + coords.y
        };
        this.parent.CallEditCallback('dragoutside', dragOutsideCoords);
      }

      hitInfo = this.parent.formatter.GetHitInfo(convertedCoords);
      this.curHit = hitInfo;
      this.activeSelPos = Math.max(hitInfo.index, 0);

      if (this.inWordSelect) {
        wordInfo = this.parent.formatter.GetWordAtIndex(this.activeSelPos);
        if (this.activeSelPos >= this.anchorWord.start) {
          this.selStart = this.anchorWord.start;
          this.selEnd = wordInfo.end;
        } else {
          this.selStart = wordInfo.start;
          this.selEnd = this.anchorWord.end;
        }
      } else {
        if (this.selAnchor <= this.activeSelPos) {
          this.selStart = this.selAnchor;
          this.selEnd = this.activeSelPos;
        } else {
          this.selStart = this.activeSelPos;
          this.selEnd = this.selAnchor;
        }
      }

      dataField = this.parent.formatter.GetDataField(this.selStart);
      if (dataField) {
        this.selStart = dataField.startPos;
      }
      dataField = this.parent.formatter.GetDataField(this.selEnd);
      if (dataField && dataField.startPos !== this.selEnd) {
        this.selEnd = dataField.endPos;
      }

      this.SetSelection(this.selStart, this.selEnd, undefined, this.selAnchor);
      return false;
    }
  }

  /**
   * Handles mouse up events for text selection
   * @param event - The mouse up event
   * @returns Boolean indicating if the event was handled
   */
  HandleMouseUp(event) {
    if (this.inActiveSel) {
      this.activateInit = false;
      if (this.TableDrag) {
        this.TableDrag = false;
        this.inActiveSel = false;
        this.parent.CallEditCallback('dragoutside_mouseup');
        return false;
      } else {
        this.inActiveSel = false;
        if (this.selStart === this.selEnd) {
          this.SetInsertPos(this.selStart, this.curHit);
          this.parent.DoSpellCheck();
        } else {
          this.parent.CallEditCallback('select');
          this.parent.CallEditCallback('selectrange');
        }
        this.curHit = null;
        return false;
      }
    }
  }

  /**
   * Handles key press events for character input
   * @param event - The key press event
   * @returns Boolean indicating if the event was handled
   */
  HandleKeyPress(event) {
    const charCode = event.charCode ? event.charCode : event.keyCode;
    let char = String.fromCharCode(charCode);
    const isShiftKey = event && (event.shiftKey || (event.gesture && event.gesture.srcEvent && event.gesture.srcEvent.shiftKey));
    const isCtrlKey = event && (event.ctrlKey || (event.gesture && event.gesture.srcEvent && event.gesture.srcEvent.ctrlKey));
    const keyInfo = {
      keyCode: char,
      shiftKey: isShiftKey,
      ctrlKey: isCtrlKey
    };
    const wasActivateInit = this.activateInit;

    this.activateInit = false;
    this.lastKeyProcessed = false;

    if (char !== event.key && event.key && event.key.length === 1) {
      char = event.key;
    }

    if (char === '\t') {
      this.parent.CallEditCallback('keyend', keyInfo);
      this.lastKeyProcessed = true;
      return true;
    }

    if (char === '\r' || char === '\n') {
      keyInfo.keyCode = KeyboardConstant.Keys.Enter;
      if (this.parent.CallEditCallback('keyend', keyInfo)) {
        this.lastKeyProcessed = true;
        return true;
      }
      if (!wasActivateInit) {
        if (isCtrlKey) {
          this.lastKeyProcessed = true;
          this.parent.Paste(char, false);
          return true;
        }
      }
    }

    if (this.parent.CallEditCallback('charfilter', char) === false) {
      this.lastKeyProcessed = true;
      return true;
    }

    if (wasActivateInit) {
      this.lastKeyProcessed = true;
      this.parent.Paste(char, false);
      return true;
    }

    return false;
  }

  /**
   * Handles key down events for navigation and special keys
   * @param event - The key down event
   * @returns Boolean indicating if the event was handled
   */
  HandleKeyDown(event) {
    const isShiftKey = event && (event.shiftKey || (event.gesture && event.gesture.srcEvent && event.gesture.srcEvent.shiftKey));
    const isCtrlKey = event && (event.ctrlKey || (event.gesture && event.gesture.srcEvent && event.gesture.srcEvent.ctrlKey));

    this.activateInit = false;
    this.lastKeyProcessed = false;

    switch (event.keyCode) {
      case 8: // Backspace
      case 46: // Delete
        this.lastKeyProcessed = true;
        this.HandleDeleteKey(event.keyCode);
        break;
      case 9: // Tab
      case 35: // End
      case 36: // Home
      case 37: // Left Arrow
      case 38: // Up Arrow
      case 39: // Right Arrow
      case 40: // Down Arrow
        this.lastKeyProcessed = true;
        this.HandleCursorKey(event.keyCode, isShiftKey, isCtrlKey);
        break;
      case 13: // Enter
      case 32: // Space
        return this.HandleKeyPress(event);
      default:
        return false;
    }
    return true;
  }

  /**
   * Handles delete and backspace key operations
   * @param keyCode - The key code (8 for backspace, 46 for delete)
   */
  HandleDeleteKey(keyCode) {
    const start = this.selStart;
    const length = this.selEnd - this.selStart;

    if (start < 0) return;

    if (length > 0) {
      this.parent.Delete();
    } else if (keyCode === 46) { // Delete
      if (start < this.parent.GetTextLength()) {
        this.selEnd = start + 1;
        this.parent.Delete();
      }
    } else if (keyCode === 8) { // Backspace
      if (start > 0) {
        this.selStart--;
        this.parent.Delete();
      }
    }
  }

  /**
   * Handles cursor navigation keys (arrows, home, end)
   * @param keyCode - The key code for the pressed key
   * @param isShiftKey - Whether shift key is pressed
   * @param isCtrlKey - Whether control key is pressed
   */
  HandleCursorKey(keyCode, isShiftKey, isCtrlKey) {
    let cursorInfo = { index: -1, line: undefined };
    let newIndex = -1;
    let isBoundaryKey = false;
    const hasSelection = this.selStart !== this.selEnd;
    const keyInfo = {
      keyCode: keyCode,
      shiftKey: isShiftKey,
      ctrlKey: isCtrlKey
    };

    if (isShiftKey && !this.inWordSelect) {
      newIndex = this.selAnchor === this.selStart ? this.selEnd : this.selStart;
    } else {
      newIndex = this.selEnd;
      this.selAnchor = this.selStart;
      this.inWordSelect = false;
    }

    switch (keyCode) {
      case KeyboardConstant.Keys.Tab:
        cursorInfo.index = -1;
        break;
      case KeyboardConstant.Keys.End:
        cursorInfo = this.parent.formatter.GetAdjacentChar(newIndex, this.cursorLine, 'end', keyInfo);
        isBoundaryKey = true;
        break;
      case KeyboardConstant.Keys.Home:
        cursorInfo = this.parent.formatter.GetAdjacentChar(newIndex, this.cursorLine, 'home', keyInfo);
        isBoundaryKey = true;
        break;
      case KeyboardConstant.Keys.Left_Arrow:
        if (hasSelection && !isShiftKey) {
          newIndex = this.selStart;
        }
        cursorInfo = !hasSelection || isShiftKey || isCtrlKey ? this.parent.formatter.GetAdjacentChar(newIndex, this.cursorLine, 'prev', keyInfo) : { index: newIndex };
        break;
      case KeyboardConstant.Keys.Up_Arrow:
        if (hasSelection && !isShiftKey) {
          newIndex = this.selStart;
        }
        cursorInfo = this.parent.formatter.GetAdjacentChar(newIndex, this.cursorLine, 'up', keyInfo);
        break;
      case KeyboardConstant.Keys.Right_Arrow:
        if (hasSelection && !isShiftKey) {
          newIndex = this.selEnd;
        }
        cursorInfo = !hasSelection || isShiftKey || isCtrlKey ? this.parent.formatter.GetAdjacentChar(newIndex, this.cursorLine, 'next', keyInfo) : { index: newIndex };
        break;
      case KeyboardConstant.Keys.Down_Arrow:
        if (hasSelection && !isShiftKey) {
          newIndex = this.selEnd;
        }
        cursorInfo = this.parent.formatter.GetAdjacentChar(newIndex, this.cursorLine, 'down', keyInfo);
        break;
      default:
        return;
    }

    if (cursorInfo.index !== newIndex || isBoundaryKey || hasSelection) {
      if (isShiftKey) {
        if (newIndex === this.selStart) {
          this.selStart = cursorInfo.index;
        } else {
          this.selEnd = cursorInfo.index;
        }
        if (this.selStart > this.selEnd) {
          [this.selStart, this.selEnd] = [this.selEnd, this.selStart];
        }
      } else {
        this.selStart = cursorInfo.index;
        this.selEnd = cursorInfo.index;
        this.selAnchor = cursorInfo.index;
      }
      this.parent.activeEditStyle = -1;
      this.SetSelection(this.selStart, this.selEnd, cursorInfo.line, this.selAnchor);
      this.parent.CallEditCallback('select');
      this.parent.DoSpellCheck();
    } else {
      this.parent.CallEditCallback('keyend', keyInfo);
    }
  }

  /**
   * Initializes the text entry field for input handling
   * @param textEntryField - The DOM element to use as a text entry field
   */
  InitTextEntry(textEntryField) {
    this.textEntryField = $(textEntryField);
    this.textEntrySelStart = 0;
    this.textEntrySelEnd = 0;
    this.textEntryField.off('input');
    this.textEntryField.on('input', this, (event) => {
      const context = event.data;
      if (context) {
        context.HandleTextEntryFieldUpdate();
      }
      return false;
    });
    this.ResetTextEntry();
  }

  /**
   * Ensures the text entry field has focus when needed
   */
  ResetTextEntry() {
    if (this.isActive && this.textEntryField && this.textEntryField.css('visibility') !== 'hidden') {
      if (this.inputFocusTimer == null) {
        this.inputFocusTimer = setInterval(() => {
          this.ResetTextEntry();
        }, 10);
      }
      if (!this.textEntryField.is(':focus')) {
        const activeElement = document.activeElement;
        if (activeElement == null || activeElement === document.body || activeElement === window || activeElement === document || activeElement === $('#_clipboardInput')[0] || activeElement === $('#_IEclipboardDiv')[0]) {
          this.textEntryField.focus();
        }
      }
    } else if (this.inputFocusTimer != null) {
      clearInterval(this.inputFocusTimer);
      this.inputFocusTimer = undefined;
    }
  }

  /**
   * Updates the text entry field with current selection
   * @param updateText - Whether to update the text content in addition to selection
   */
  UpdateTextEntryField(updateText?) {
    if (this.isActive && this.textEntryField && this.textEntryField[0] !== undefined) {
      const inputElement = this.textEntryField[0];
      this.ResetTextEntry();
      if (!updateText && inputElement.value !== this.parent.formatter.rtData.text) {
        this.textEntryField.val(this.parent.formatter.rtData.text);
      }
      const textLength = inputElement.value.length;
      const start = Math.min(Math.max(this.selStart, 0), textLength);
      const end = Math.min(Math.max(this.selEnd, start), textLength);
      if (inputElement.selectionStart !== start || inputElement.selectionEnd !== end) {
        Edit.SetInputSelection(inputElement, start, end);
      }
      this.textEntrySelStart = start;
      this.textEntrySelEnd = end;
    }
  }

  /**
   * Validates if an edit operation results in the expected text
   * @param newText - The text being inserted
   * @param oldText - The original text before edit
   * @param fullText - The expected resulting text
   * @returns Boolean indicating if the edit is valid
   */
  ValidateEdit(newText, oldText, fullText) {
    const start = this.selStart;
    const length = this.selEnd - this.selStart;
    let before = '';
    let after = '';
    let combinedText = '';

    if (start >= oldText.length) {
      combinedText = oldText + newText;
    } else {
      if (start > 0) {
        before = oldText.slice(0, start);
      }
      if (start + length < oldText.length) {
        after = oldText.slice(start + length);
      }
      combinedText = before + newText + after;
    }

    return combinedText === fullText;
  }

  /**
   * Handles updates to the text entry field when text is input
   */
  HandleTextEntryFieldUpdate() {
    if (this.isActive && this.textEntryField) {
      this.activateInit = false;
      if (this.lastKeyProcessed) {
        this.UpdateTextEntryField();
      } else {
        const inputElement = this.textEntryField[0];
        const newText = inputElement.value;
        const oldText = this.parent.formatter.rtData.text;
        let selectionStart = inputElement.selectionStart;
        let selectionEnd = inputElement.selectionEnd;
        let insertedText = '';

        this.selStart = this.textEntrySelStart;
        this.selEnd = this.textEntrySelEnd;
        selectionStart = Math.min(selectionStart, newText.length);
        selectionEnd = Math.min(selectionEnd, newText.length);

        if (selectionEnd > 0) {
          insertedText = selectionEnd > this.selStart ? newText.slice(this.selStart, selectionEnd) : newText.slice(selectionEnd - 1, selectionEnd);
        }

        let diffResult = null;
        if (this.ValidateEdit(insertedText, oldText, newText)) {
          // Valid edit
        } else {
          diffResult = false;
          this.selStart = diffResult.pos;
          this.selEnd = diffResult.pos + diffResult.replace;
          insertedText = diffResult.str;
        }

        if (insertedText) {
          if (this.parent.CallEditCallback('charfilter', insertedText) === false) {
            if (inputElement.value !== this.parent.formatter.rtData.text) {
              this.textEntryField.val(this.parent.formatter.rtData.text);
            }
            if (inputElement.selectionStart !== this.textEntrySelStart || inputElement.selectionEnd !== this.textEntrySelEnd) {
              Edit.SetInputSelection(inputElement, this.textEntrySelStart, this.textEntrySelEnd);
            }
            return;
          }
          this.parent.Paste(insertedText, false, true);
        } else if (diffResult && diffResult.replace) {
          this.parent.Delete(true);
        }

        this.SetSelection(selectionEnd, selectionEnd, undefined, selectionEnd, true);
        Edit.SetInputSelection(inputElement, selectionStart, selectionEnd);
        this.textEntrySelStart = selectionStart;
        this.textEntrySelEnd = selectionEnd;
      }
    }
  }

  /**
   * Sets the selection range in an input element
   * @param inputElement - The DOM input element
   * @param start - The start position of the selection
   * @param end - The end position of the selection
   */
  static SetInputSelection(inputElement, start, end) {
    inputElement.selectionStart = start;
    inputElement.selectionEnd = end;
  }
}

export default Edit
