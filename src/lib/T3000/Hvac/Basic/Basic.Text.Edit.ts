

import $ from "jquery";
import HvacSVG from "../Helper/SVG.t2";
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import Creator from './Basic.Path.Creator'
import GlobalData from '../Data/GlobalData'
import ConstantData from "../Data/ConstantData"
import ConstantData2 from "../Data/ConstantData2";

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

  constructor(parent: any) {
    this.parent = parent;
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
    console.log('B.Text.Edit: Constructor initialized with parent:', parent);
  }

  BeginTableDrag() {
    console.log('B.Text.Edit: BeginTableDrag called');
    this.TableDrag = true;
    this.DeactivateCursor();
    this.ClearSelection();
    this.parent.SetSelectionVisible(false);
    this.parent.ClearDataFieldHilites();
    this.curHit = null;
  }

  SetVirtualKeyboardHook(virtualKeyboardHook: any, textEntryField: any) {
    console.log('B.Text.Edit: SetVirtualKeyboardHook called with virtualKeyboardHook:', virtualKeyboardHook, 'textEntryField:', textEntryField);
    this.virtualKeyboardHook = virtualKeyboardHook;
    this.InitTextEntry(textEntryField);
    console.log('B.Text.Edit: SetVirtualKeyboardHook completed');
  }

  Activate(event, shouldSpellCheck) {
    console.log('B.Text.Edit: Activate called with event:', event, 'shouldSpellCheck:', shouldSpellCheck);
    this.isActive = true;
    this.inActiveSel = false;
    this.lastClickTime = 0;
    this.selStart = -1;
    this.selEnd = -1;
    this.selAnchor = -1;
    this.parent.decorationAreaElem.attr('pointer-events', ConstantData.EventBehavior.NONE);
    this.parent.clickAreaElem.attr('pointer-events', ConstantData.EventBehavior.HIDDEN_ALL);
    this.parent.CallEditCallback('activate');
    this.savedCursorState = this.parent.cursorState;
    this.parent.cursorState = ConstantData.CursorState.NONE;
    this.activateInit = true;
    this.lastKeyProcessed = false;

    setTimeout(() => {
      this.activateInit = false;
    }, 10);

    if (this.textEntryField) {
      this.InitTextEntry(this.textEntryField);
    }

    if (event) {
      event.gesture = {
        center: {
          clientX: event.clientX,
          clientY: event.clientY
        }
      };
      this.HandleMouseDown(event);
      if (shouldSpellCheck) {
        this.parent.DoSpellCheck();
      } else {
        this.HandleMouseUp(event);
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

    this.parent.SetCursorState(ConstantData.CursorState.EDITLINK);
    this.UpdateTextEntryField(false);
    this.parent.RenderDataFieldHilites();
    console.log('B.Text.Edit: Activate completed');
  }

  Deactivate(event: any) {
    console.log('B.Text.Edit: Deactivate called with event:', event);
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

    if (this.parent.cursorState === ConstantData.CursorState.EDITLINK) {
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

    console.log('B.Text.Edit: Deactivate completed');
  }

  IsActive() {
    console.log('B.Text.Edit: IsActive called');
    return this.isActive;
  }

  SetSelection(start: number, end: number, line: any, anchor: number, updateTextEntry?: boolean) {
    console.log('B.Text.Edit: SetSelection called with start:', start, 'end:', end, 'line:', line, 'anchor:', anchor, 'updateTextEntry:', updateTextEntry);

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

    console.log('B.Text.Edit: SetSelection completed with selStart:', this.selStart, 'selEnd:', this.selEnd, 'selAnchor:', this.selAnchor);
  }

  ClearSelection() {
    console.log('B.Text.Edit: ClearSelection called');
    this.selStart = -1;
    this.selEnd = -1;
    this.selAnchor = -1;
    this.UpdateSelection();
    console.log('B.Text.Edit: ClearSelection completed');
  }

  GetSelection() {
    console.log('B.Text.Edit: GetSelection called');
    const selection = {
      start: this.selStart,
      end: this.selEnd,
      line: this.cursorLine,
      anchor: this.selAnchor
    };
    console.log('B.Text.Edit: GetSelection returning', selection);
    return selection;
  }

  SetInsertPos(position: number, lineInfo?: any, updateTextEntry?: boolean) {
    console.log('B.Text.Edit: SetInsertPos called with position:', position, 'lineInfo:', lineInfo, 'updateTextEntry:', updateTextEntry);
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
    console.log('B.Text.Edit: SetInsertPos completed');
  }

  UpdateSelection() {
    console.log('B.Text.Edit: UpdateSelection called');
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
    console.log('B.Text.Edit: UpdateSelection completed');
  }

  DeactivateCursor() {
    console.log('B.Text.Edit: DeactivateCursor called');
    this.parent.HideInputCursor();
    this.cursorPos = -1;
    this.cursorLine = undefined;
    console.log('B.Text.Edit: DeactivateCursor completed');
  }

  UpdateCursor() {
    console.log('B.Text.Edit: UpdateCursor called with cursorPos:', this.cursorPos);
    if (this.cursorPos < 0) {
      this.DeactivateCursor();
    } else {
      const charInfo = this.parent.formatter.GetRenderedCharInfo(this.cursorPos, this.cursorLine);
      this.parent.ShowInputCursor(charInfo.left, charInfo.top, charInfo.bottom);
    }
    console.log('B.Text.Edit: UpdateCursor completed');
  }

  HandleMouseDown(event) {
    console.log('B.Text.Edit: HandleMouseDown called with event:', event);
    const isShiftKey = event && (event.shiftKey || (event.gesture && event.gesture.srcEvent && event.gesture.srcEvent.shiftKey));
    const isRightClick = GlobalData.optManager.IsRightClick(event);
    const currentTime = Date.now();
    this.activateInit = false;

    if (this.isActive && !isRightClick) {
      const clientX = event.gesture.center.clientX;
      const clientY = event.gesture.center.clientY;
      const coords = this.parent.doc.ConvertWindowToElemCoords(clientX, clientY, this.parent.textElem.node);

      if (!this.parent.linksDisabled && (this.parent.cursorState === ConstantData.CursorState.EDITLINK || this.parent.cursorState === ConstantData.CursorState.LINKONLY)) {
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

  HandleMouseMove(event) {
    console.log('B.Text.Edit: HandleMouseMove called with event:', event);
    let hitInfo, wordInfo, dataField;
    const coords = {};

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
      console.log('B.Text.Edit: HandleMouseMove completed with selStart:', this.selStart, 'selEnd:', this.selEnd);
      return false;
    }
  }

  HandleMouseUp(event) {
    console.log('B.Text.Edit: HandleMouseUp called with event:', event);
    if (this.inActiveSel) {
      this.activateInit = false;
      if (this.TableDrag) {
        this.TableDrag = false;
        this.inActiveSel = false;
        this.parent.CallEditCallback('dragoutside_mouseup');
        console.log('B.Text.Edit: HandleMouseUp completed with TableDrag');
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
        console.log('B.Text.Edit: HandleMouseUp completed with selection');
        return false;
      }
    }
  }

  HandleKeyPress(event) {
    console.log('B.Text.Edit: HandleKeyPress called with event:', event);
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
      console.log('B.Text.Edit: HandleKeyPress completed with tab key');
      return true;
    }

    if (char === '\r' || char === '\n') {
      keyInfo.keyCode = ConstantData2.Keys.Enter;
      if (this.parent.CallEditCallback('keyend', keyInfo)) {
        this.lastKeyProcessed = true;
        console.log('B.Text.Edit: HandleKeyPress completed with enter key');
        return true;
      }
      if (!wasActivateInit) {
        if (isCtrlKey) {
          this.lastKeyProcessed = true;
          this.parent.Paste(char, false);
          console.log('B.Text.Edit: HandleKeyPress completed with paste');
          return true;
        }
      }
    }

    if (this.parent.CallEditCallback('charfilter', char) === false) {
      this.lastKeyProcessed = true;
      console.log('B.Text.Edit: HandleKeyPress completed with charfilter');
      return true;
    }

    if (wasActivateInit) {
      this.lastKeyProcessed = true;
      this.parent.Paste(char, false);
      console.log('B.Text.Edit: HandleKeyPress completed with paste on activateInit');
      return true;
    }

    console.log('B.Text.Edit: HandleKeyPress completed');
    return false;
  }

  HandleKeyDown(event) {
    console.log('B.Text.Edit: HandleKeyDown called with event:', event);
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
    console.log('B.Text.Edit: HandleKeyDown completed');
    return true;
  }

  HandleDeleteKey(keyCode) {
    console.log('B.Text.Edit: HandleDeleteKey called with keyCode:', keyCode);
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
    console.log('B.Text.Edit: HandleDeleteKey completed');
  }

  HandleCursorKey(keyCode, isShiftKey, isCtrlKey) {
    console.log('B.Text.Edit: HandleCursorKey called with keyCode:', keyCode, 'isShiftKey:', isShiftKey, 'isCtrlKey:', isCtrlKey);
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
      case ConstantData2.Keys.Tab:
        cursorInfo.index = -1;
        break;
      case ConstantData2.Keys.End:
        cursorInfo = this.parent.formatter.GetAdjacentChar(newIndex, this.cursorLine, 'end', keyInfo);
        isBoundaryKey = true;
        break;
      case ConstantData2.Keys.Home:
        cursorInfo = this.parent.formatter.GetAdjacentChar(newIndex, this.cursorLine, 'home', keyInfo);
        isBoundaryKey = true;
        break;
      case ConstantData2.Keys.Left_Arrow:
        if (hasSelection && !isShiftKey) {
          newIndex = this.selStart;
        }
        cursorInfo = !hasSelection || isShiftKey || isCtrlKey ? this.parent.formatter.GetAdjacentChar(newIndex, this.cursorLine, 'prev', keyInfo) : { index: newIndex };
        break;
      case ConstantData2.Keys.Up_Arrow:
        if (hasSelection && !isShiftKey) {
          newIndex = this.selStart;
        }
        cursorInfo = this.parent.formatter.GetAdjacentChar(newIndex, this.cursorLine, 'up', keyInfo);
        break;
      case ConstantData2.Keys.Right_Arrow:
        if (hasSelection && !isShiftKey) {
          newIndex = this.selEnd;
        }
        cursorInfo = !hasSelection || isShiftKey || isCtrlKey ? this.parent.formatter.GetAdjacentChar(newIndex, this.cursorLine, 'next', keyInfo) : { index: newIndex };
        break;
      case ConstantData2.Keys.Down_Arrow:
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
    console.log('B.Text.Edit: HandleCursorKey completed');
  }

  InitTextEntry(textEntryField) {
    console.log('B.Text.Edit: InitTextEntry called with textEntryField:', textEntryField);
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
    console.log('B.Text.Edit: InitTextEntry completed');
  }

  ResetTextEntry() {
    console.log('B.Text.Edit: ResetTextEntry called');
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
    console.log('B.Text.Edit: ResetTextEntry completed');
  }

  static SetInputSelection(inputElement, start, end) {
    console.log('B.Text.Edit: SetInputSelection called with start:', start, 'end:', end);
    inputElement.selectionStart = start;
    inputElement.selectionEnd = end;
    console.log('B.Text.Edit: SetInputSelection completed');
  }

  UpdateTextEntryField(updateText) {
    console.log('B.Text.Edit: UpdateTextEntryField called with updateText:', updateText);
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
    console.log('B.Text.Edit: UpdateTextEntryField completed');
  }

  ValidateEdit(newText, oldText, fullText) {
    console.log('B.Text.Edit: ValidateEdit called with newText:', newText, 'oldText:', oldText, 'fullText:', fullText);
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

    const isValid = combinedText === fullText;
    console.log('B.Text.Edit: ValidateEdit completed with isValid:', isValid);
    return isValid;
  }

  HandleTextEntryFieldUpdate() {
    console.log('B.Text.Edit: HandleTextEntryFieldUpdate called');
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
          console.log('B.Text.Edit: ValidateEdit passed');
        } else {
          diffResult = Basic.Text.DiffStrings(oldText, newText);
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
    console.log('B.Text.Edit: HandleTextEntryFieldUpdate completed');
  }

}

export default Edit
