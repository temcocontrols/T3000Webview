

import T3Svg from "../Util/T3Svg"
import $ from "jquery"
import Element from "./B.Element"
import Formatter from "./B.Text.Formatter"
import Edit from "./B.Text.Edit"
import T3Gv from "../Data/T3Gv"
import CursorConstant from "../Data/Constant/CursorConstant"
import T3Util from "../Util/T3Util"
import LogUtil from "../Util/LogUtil"

/**
 * Represents an advanced text editor element with SVG rendering, inline editing,
 * text formatting, hyperlink management, data field integration, and spell checking.
 *
 * This class provides a comprehensive set of methods to:
 * - Create and initialize a text element in an SVG container.
 * - Manage text content including setting, getting, deleting, pasting, and formatting text.
 * - Support rich text features such as paragraph alignment, vertical alignment, and text selection.
 * - Handle hyperlinks by setting, retrieving, and deleting them from selected text ranges.
 * - Integrate data fields for dynamic content display and update using external data sources.
 * - Monitor and update the UI via callbacks, cursor state management, and live spell checking.
 *
 * @example
 * // Create a new Text element and attach it to an SVG container.
 * const textEditor = new Text();
 * const options = { someOption: 'value' };
 * const svgContainer = textEditor.CreateElement(containerElement, options);
 *
 * // Set initial text content with formatting.
 * textEditor.SetText("Hello, world!", { fontSize: 16, fontWeight: "bold" });
 *
 * // Activate the text editor to allow inline editing.
 * textEditor.Activate(inputEvent, { additionalData: true });
 *
 * // Update selected text format to italic.
 * textEditor.SetSelectedFormat({ fontStyle: "italic" });
 *
 * // Paste new content and update the element.
 * textEditor.Paste("New content", false, true);
 *
 * // Retrieve the entire text after modifications.
 * const fullText = textEditor.GetText(0, textEditor.GetTextLength());
 *
 * @remarks
 * The Text class internally utilizes a Formatter for its text processing and an Edit
 * component for handling user interactions. It also supports dynamic resizing, data binding,
 * spell check integration, and customizable callbacks to reflect changes in the UI.
 *
 * @category Components
 */
class Text extends Element {

  public formatter: Formatter;
  public editor: Edit;
  public textElem: any;
  public selectElem: any;
  public cursorElem: any;
  public clickAreaElem: any;
  public decorationAreaElem: any;
  public cursorTimer: any;
  public cursorPos: any;
  public cursorState: any;
  public minHeight: any;
  public vAlign: any;
  public textElemOffset: any;
  public activeEditStyle: any;
  public selectHidden: any;
  public linksDisabled: any;
  public editCallback: any;
  public editCallbackData: any;
  public dataTableID: any;
  public dataRecordID: any;
  public dataStyleOverride: any;
  public lastFmtSize: any;

  constructor() {
    super()
  }

  CreateElement(container: any, options: any) {

    // Initialize formatter and editor
    this.formatter = new Formatter(this);
    this.editor = new Edit(this);

    // Create main SVG container element
    this.svgObj = new T3Svg.Container(T3Svg.create('g'));

    // Initialize the element with container and options
    this.InitElement(container, options);

    // Create SVG sub-elements
    this.textElem = new T3Svg.Container(T3Svg.create('text'));
    this.selectElem = new T3Svg.Path();
    this.cursorElem = new T3Svg.Line();
    this.clickAreaElem = new T3Svg.Rect();
    this.decorationAreaElem = new T3Svg.Container(T3Svg.create('g'));

    // Initialize cursor settings
    this.cursorTimer = undefined;
    this.cursorPos = undefined;
    this.cursorState = CursorConstant.CursorState.LinkOnly;

    // Configure click area element
    this.clickAreaElem.attr('stroke-width', 0);
    this.clickAreaElem.attr('fill', 'none');
    this.clickAreaElem.attr('visibility', 'hidden');
    this.clickAreaElem.node.setAttribute('no-export', '1');

    // Set no-export attribute for select and cursor elements
    this.selectElem.node.setAttribute('no-export', '1');
    this.cursorElem.node.setAttribute('no-export', '1');

    // Add elements to the main SVG container
    this.svgObj.add(this.clickAreaElem);
    this.svgObj.add(this.textElem);
    this.svgObj.add(this.decorationAreaElem);

    // Set initial properties
    this.minHeight = 0;
    this.vAlign = 'top';
    this.textElemOffset = 0;
    this.activeEditStyle = -1;
    this.selectHidden = false;
    this.linksDisabled = false;
    this.editCallback = null;
    this.editCallbackData = null;
    this.dataTableID = -1;
    this.dataRecordID = -1;
    this.dataStyleOverride = null;
    this.lastFmtSize = { width: 0, height: 0 };

    // Initialize text content
    this.SetText('');

    return this.svgObj;
  }

  SetText(newText, formatStyle?, startPos?, preserveFormatting?, updateTextEntry?) {
    LogUtil.Debug("B.Text: SetText input:", { newText, formatStyle, startPos, preserveFormatting, updateTextEntry });

    const insertPosition = startPos || 0;
    const textLength = newText.length;

    if (this.editor.IsActive()) {
      this.editor.ClearSelection();
    }

    if (!formatStyle && this.activeEditStyle >= 0) {
      formatStyle = this.activeEditStyle;
    }

    this.activeEditStyle = -1;
    this.formatter.SetText(newText, formatStyle, startPos, preserveFormatting);
    this.UpdateTextObject();

    if (this.editor.IsActive()) {
      if (!updateTextEntry) {
        this.editor.UpdateTextEntryField(false);
      }
      this.editor.SetInsertPos(insertPosition + textLength, null, updateTextEntry);
    }

    LogUtil.Debug("B.Text: SetText output: text updated successfully");
  }

  GetText(startIndex, textLength) {
    LogUtil.Debug("B.Text: GetText input:", { startIndex, textLength });
    const result = this.formatter.GetText(startIndex, textLength);
    LogUtil.Debug("B.Text: GetText output:", result);
    return result;
  }

  GetTextLength(): number {
    LogUtil.Debug("B.Text: GetTextLength input: none");
    const textLength = this.formatter.GetTextLength();
    LogUtil.Debug("B.Text: GetTextLength output:", textLength);
    return textLength;
  }

  SetRuntimeText(textData, startPos, textLength, preserveFormatting, updateTextEntry) {
    LogUtil.Debug("B.Text: SetRuntimeText input:", { textData, startPos, textLength, preserveFormatting, updateTextEntry });

    const effectiveStartPos = startPos || 0;
    const newTextLength = textData.text.length;

    if (this.editor.IsActive()) {
      this.editor.ClearSelection();
    }

    this.activeEditStyle = -1;
    this.formatter.SetRuntimeText(textData, startPos, textLength, preserveFormatting);
    this.UpdateTextObject();

    if (this.editor.IsActive()) {
      if (!updateTextEntry) {
        this.editor.UpdateTextEntryField(false);
      }
      this.editor.SetInsertPos(effectiveStartPos + newTextLength, null, updateTextEntry);
    }

    LogUtil.Debug("B.Text: SetRuntimeText output: text updated successfully");
  }

  GetRuntimeText(startIndex, textLength) {
    LogUtil.Debug("B.Text: GetRuntimeText input:", { startIndex, textLength });
    const runtimeText = this.formatter.GetRuntimeText(startIndex, textLength);
    LogUtil.Debug("B.Text: GetRuntimeText output:", runtimeText);
    return runtimeText;
  }

  DeleteText(startPosition, deleteLength, updateTextEntry) {
    LogUtil.Debug("B.Text: DeleteText input:", { startPosition, deleteLength, updateTextEntry });

    startPosition = startPosition || 0;

    if (this.editor.IsActive()) {
      this.editor.ClearSelection();
    }

    let dataField = this.formatter.GetDataField(startPosition);
    if (dataField) {
      startPosition = dataField.startPos;
    }

    if (deleteLength) {
      let calculatedEnd = startPosition + deleteLength;
      dataField = this.formatter.GetDataField(calculatedEnd);
      if (dataField && dataField.startPos !== calculatedEnd) {
        calculatedEnd = dataField.endPos;
      }
      deleteLength = calculatedEnd - startPosition;
    }

    this.activeEditStyle = -1;
    this.formatter.DeleteText(startPosition, deleteLength);
    this.UpdateTextObject();

    if (this.editor.IsActive()) {
      if (!updateTextEntry) {
        this.editor.UpdateTextEntryField(false);
      }
      this.editor.SetInsertPos(startPosition, null, updateTextEntry);
    }

    LogUtil.Debug("B.Text: DeleteText output:", { deletedCharacters: deleteLength, startPosition });
  }

  Copy(useRuntime: boolean): any {
    LogUtil.Debug("B.Text: Copy input:", { useRuntime });

    let selectionStart: number = 0;
    let selectionLength: number = 0;

    if (this.editor.IsActive()) {
      const selection = this.editor.GetSelection();
      if (selection.start === selection.end) {
        LogUtil.Debug("B.Text: Copy output: null (empty selection)");
        return null;
      }
      if (selection.start >= 0 && selection.end > selection.start) {
        selectionStart = selection.start;
        selectionLength = selection.end - selection.start;
      }
    }

    const result = useRuntime
      ? this.GetRuntimeText(selectionStart, selectionLength)
      : this.GetText(selectionStart, selectionLength);

    LogUtil.Debug("B.Text: Copy output:", result);
    return result;
  }

  Paste(inputText, useRuntime, updateTextEntry) {
    LogUtil.Debug("B.Text: Paste input:", { inputText, useRuntime, updateTextEntry });
    let selectionStart = 0;
    let selectionLength = 0;
    let selection;

    if (this.editor.IsActive() && (selection = this.editor.GetSelection()).start >= 0) {
      selectionStart = selection.start;
      selectionLength = selection.end - selection.start;
    }

    if (useRuntime) {
      if (
        this.SetRuntimeText(inputText, selectionStart, selectionLength, true, updateTextEntry),
        this.dataTableID > 0 && this.dataRecordID > 0
      ) {
        let oldTextLength = this.formatter.GetTextLength();
        this.UpdateFromData();
        let newTextLength = this.formatter.GetTextLength();
        if (this.editor.IsActive()) {
          this.editor.UpdateTextEntryField(false);
          if (oldTextLength !== newTextLength) {
            const newInsertPos = this.editor.selStart + (newTextLength - oldTextLength);
            this.editor.SetInsertPos(newInsertPos);
          }
        }
      } else {
        this.formatter.ClearDataFieldRun();
        this.UpdateTextObject();
      }
    } else {
      this.SetText(inputText, null, selectionStart, selectionLength, updateTextEntry);
    }

    this.CallEditCallback("edit");
    LogUtil.Debug("B.Text: Paste output: finished pasting");
  }

  Delete(updateTextEntry: any) {
    LogUtil.Debug("B.Text: Delete input:", { updateTextEntry });
    let selectionStart: number;
    let selectionLength: number;
    let selection: any;

    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        selectionStart = selection.start;
        selectionLength = selection.end - selection.start;
      }
    }

    this.DeleteText(selectionStart, selectionLength, updateTextEntry);
    this.CallEditCallback('edit');
    LogUtil.Debug("B.Text: Delete output:", { deletedCharacters: selectionLength, startPosition: selectionStart });
  }

  SetSelectedFormat(formatStyle) {
    LogUtil.Debug("B.Text: SetSelectedFormat input:", { formatStyle });
    let selectionStart;
    let selectionLength;

    if (this.editor.IsActive()) {
      const selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        selectionStart = selection.start;
        selectionLength = selection.end - selection.start;
      }
    }

    this.SetFormat(formatStyle, selectionStart, selectionLength);
    this.CallEditCallback('edit');
    LogUtil.Debug("B.Text: SetSelectedFormat output: completed");
  }

  GetSelectedFormat() {
    LogUtil.Debug("B.Text: GetSelectedFormat input: none");
    let selection, selectionStart, selectionLength;
    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        selectionStart = selection.start;
        selectionLength = selection.end - selection.start;
      }
    }
    const formatResult = this.GetFormat(selectionStart, selectionLength);
    LogUtil.Debug("B.Text: GetSelectedFormat output:", formatResult);
    return formatResult;
  }

  SetSelectedAlignment(alignment: string) {
    LogUtil.Debug("B.Text: SetSelectedAlignment input:", { alignment });
    let selectionStart = 0;
    let selectionLength = 0;
    if (this.editor.IsActive()) {
      const selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        selectionStart = selection.start;
        selectionLength = selection.end - selection.start;
      }
    }
    this.SetParagraphAlignment(alignment, selectionStart, selectionLength);
    this.CallEditCallback('edit');
    LogUtil.Debug("B.Text: SetSelectedAlignment output:", { alignment, selectionStart, selectionLength });
  }

  GetSelectedAlignment() {
    LogUtil.Debug("B.Text: GetSelectedAlignment called");
    let selection, startIndex = 0;

    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        startIndex = selection.start;
      }
    }

    const alignment = this.GetParagraphAlignment(startIndex);
    LogUtil.Debug("B.Text: GetSelectedAlignment output:", alignment);
    return alignment;
  }

  SetSelectedParagraphStyle(paragraphStyle) {
    LogUtil.Debug("B.Text: SetSelectedParagraphStyle input:", { paragraphStyle });

    let selectionStart;
    let selectionLength;

    if (this.editor.IsActive()) {
      const selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        selectionStart = selection.start;
        selectionLength = selection.end - selection.start;
      }
    }

    this.SetParagraphStyle(paragraphStyle, selectionStart, selectionLength);
    this.CallEditCallback('edit');

    LogUtil.Debug("B.Text: SetSelectedParagraphStyle output:", { paragraphStyle, selectionStart, selectionLength });
  }

  GetSelectedParagraphStyle() {
    LogUtil.Debug("B.Text: GetSelectedParagraphStyle input: none");
    let selection;
    let startIndex = 0;

    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        startIndex = selection.start;
      }
    }

    const paragraphStyle = this.GetParagraphStyle(startIndex);
    LogUtil.Debug("B.Text: GetSelectedParagraphStyle output:", paragraphStyle);
    return paragraphStyle;
  }

  SetSelectedHyperlink(hyperlink) {
    LogUtil.Debug("B.Text: SetSelectedHyperlink input:", { hyperlink });

    let selection;
    let startPosition = 0;
    let selectionLength = this.GetTextLength();

    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        startPosition = selection.start;
        selectionLength = selection.end - selection.start;
      }
    }

    this.SetHyperlink(hyperlink, startPosition, selectionLength);
    this.CallEditCallback('edit');

    LogUtil.Debug("B.Text: SetSelectedHyperlink output:", { hyperlink, startPosition, selectionLength });
  }

  GetSelectedHyperlink() {
    LogUtil.Debug("B.Text: GetSelectedHyperlink input: none");
    let selection = undefined;
    let startPosition = 0;

    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        startPosition = selection.start;
      }
    }

    const hyperlink = this.GetHyperlink(startPosition);
    LogUtil.Debug("B.Text: GetSelectedHyperlink output:", hyperlink);
    return hyperlink;
  }

  DeleteSelectedHyperlink() {
    LogUtil.Debug("B.Text: DeleteSelectedHyperlink input: no parameters; checking editor state");
    let selection, selectionStart = 0;
    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        selectionStart = selection.start;
      }
    }
    this.DeleteHyperlink(selectionStart);
    this.CallEditCallback("edit");
    LogUtil.Debug("B.Text: DeleteSelectedHyperlink output: Deleted hyperlink at position", selectionStart);
  }

  SetFormat(newFormat: any, selectionStart: any, selectionLength: any) {
    LogUtil.Debug("B.Text: SetFormat input:", { newFormat, selectionStart, selectionLength });
    const updatedActiveEditStyle = this.formatter.SetFormat(newFormat, selectionStart, selectionLength);
    this.activeEditStyle = updatedActiveEditStyle;
    this.UpdateTextObject();
    LogUtil.Debug("B.Text: SetFormat output:", { activeEditStyle: this.activeEditStyle });
  }

  GetFormat(startIndex, rangeLength) {
    LogUtil.Debug("B.Text: GetFormat input:", { startIndex, rangeLength });
    let activeStyle = this.activeEditStyle;
    let result;
    if (rangeLength === 0 && activeStyle >= 0) {
      result = this.formatter.GetFormatByID(activeStyle);
    } else {
      result = this.formatter.GetCommonFormatForRange(startIndex, rangeLength);
    }
    LogUtil.Debug("B.Text: GetFormat output:", result);
    return result;
  }

  SetVerticalAlignment(newAlignment) {
    LogUtil.Debug("B.Text: SetVerticalAlignment input:", newAlignment);
    this.vAlign = newAlignment;
    this.UpdateTextObject();
    LogUtil.Debug("B.Text: SetVerticalAlignment output: vAlign updated to", this.vAlign);
  }

  GetVerticalAlignment(): string {
    LogUtil.Debug("B.Text: GetVerticalAlignment input: none");
    const verticalAlignment = this.vAlign;
    LogUtil.Debug("B.Text: GetVerticalAlignment output:", verticalAlignment);
    return verticalAlignment;
  }

  SetParagraphAlignment(alignment: string, selectionStart: number, selectionLength: number) {
    LogUtil.Debug("B.Text: SetParagraphAlignment input:", { alignment, selectionStart, selectionLength });
    this.SetParagraphStyle({ just: alignment }, selectionStart, selectionLength);
    LogUtil.Debug("B.Text: SetParagraphAlignment output: completed", { alignment, selectionStart, selectionLength });
  }

  GetParagraphAlignment(paragraphIndex: number): string {
    LogUtil.Debug("B.Text: GetParagraphAlignment input:", { paragraphIndex });
    const paragraphStyle = this.GetParagraphStyle(paragraphIndex);
    const alignment = paragraphStyle.just;
    LogUtil.Debug("B.Text: GetParagraphAlignment output:", alignment);
    return alignment;
  }

  SetParagraphStyle(paragraphStyle, startPosition, selectionLength) {
    LogUtil.Debug("B.Text: SetParagraphStyle input:", { paragraphStyle, startPosition, selectionLength });
    this.formatter.SetParagraphStyle(paragraphStyle, startPosition, selectionLength);
    this.UpdateTextObject();
    LogUtil.Debug("B.Text: SetParagraphStyle output: completed");
  }

  GetParagraphStyle(paragraphIndex: number) {
    LogUtil.Debug("B.Text: GetParagraphStyle input:", { paragraphIndex });
    const paragraphStyle = this.formatter.GetParagraphStyle(paragraphIndex);
    LogUtil.Debug("B.Text: GetParagraphStyle output:", paragraphStyle);
    return paragraphStyle;
  }

  GetParagraphCount(): number {
    LogUtil.Debug("B.Text: GetParagraphCount input: none");
    const paragraphCount = this.formatter.GetParagraphCount();
    LogUtil.Debug("B.Text: GetParagraphCount output:", paragraphCount);
    return paragraphCount;
  }

  GetParagraphPosition(paragraphIndex: number) {
    LogUtil.Debug("B.Text: GetParagraphPosition input:", { paragraphIndex });
    const position = this.formatter.GetParagraphPosition(paragraphIndex);
    LogUtil.Debug("B.Text: GetParagraphPosition output:", position);
    return position;
  }

  SetHyperlink(url: string, startPos: number, selectionLength: number) {
    LogUtil.Debug("B.Text: SetHyperlink input:", { url, startPos, selectionLength });
    if (url && url.length) {
      this.formatter.SetHyperlink(url, startPos, selectionLength);
      this.UpdateTextObject();
      LogUtil.Debug("B.Text: SetHyperlink output: hyperlink set successfully");
    } else {
      this.DeleteHyperlink(startPos);
      LogUtil.Debug("B.Text: SetHyperlink output: hyperlink deleted");
    }
  }

  GetHyperlink(offset) {
    LogUtil.Debug("B.Text: GetHyperlink input:", offset);
    const hyperlink = this.formatter.GetHyperlinkAtOffset(offset);
    const result = hyperlink ? hyperlink.url : null;
    LogUtil.Debug("B.Text: GetHyperlink output:", result);
    return result;
  }

  DeleteHyperlink(hyperlinkStart: number) {
    LogUtil.Debug("B.Text: DeleteHyperlink input:", { hyperlinkStart });
    this.formatter.ClearHyperlink(hyperlinkStart);
    this.UpdateTextObject();
    LogUtil.Debug("B.Text: DeleteHyperlink output: Hyperlink removed at", hyperlinkStart);
  }

  GetHyperlinkAtLocation(gestureEvent: any) {
    LogUtil.Debug("B.Text: GetHyperlinkAtLocation input:", gestureEvent);
    const clientX = gestureEvent.gesture.center.clientX;
    const clientY = gestureEvent.gesture.center.clientY + $(window).scrollTop();
    const convertedCoords = this.doc.ConvertWindowToElemCoords(clientX, clientY, this.textElem.node);
    const hyperlink = this.formatter.GetHyperlinkAtPoint(convertedCoords);
    const result = hyperlink ? hyperlink.url : null;
    LogUtil.Debug("B.Text: GetHyperlinkAtLocation output:", result);
    return result;
  }

  SetConstraints(maxWidth: number, minWidth: number, minHeight: number) {
    LogUtil.Debug("B.Text: SetConstraints input:", { maxWidth, minWidth, minHeight });

    if (maxWidth !== undefined || minWidth !== undefined) {
      this.formatter.SetLimits({
        maxWidth: maxWidth,
        minWidth: minWidth
      });
    }

    if (minHeight !== undefined) {
      this.minHeight = minHeight;
    }

    this.UpdateTextObject();
    LogUtil.Debug("B.Text: SetConstraints output: Constraints updated");
  }

  SetEditCallback(callback, callbackData) {
    LogUtil.Debug("B.Text: SetEditCallback input:", { callback, callbackData });
    this.editCallback = callback;
    this.editCallbackData = callbackData;
    LogUtil.Debug("B.Text: SetEditCallback output: Callback set successfully");
  }

  CallEditCallback(actionType, callbackData?) {
    LogUtil.Debug("B.Text: CallEditCallback input:", { actionType, callbackData });
    if (this.editCallback) {
      const result = this.editCallback(actionType, callbackData, this, this.editCallbackData);
      LogUtil.Debug("B.Text: CallEditCallback output:", result);
      return result;
    }
    LogUtil.Debug("B.Text: CallEditCallback output:", "No editCallback defined");
  }

  GetTextSize() {
    LogUtil.Debug("B.Text: GetTextSize input: no parameters");
    let textSize = this.formatter.GetTextFormatSize();
    textSize.height = Math.max(textSize.height, this.minHeight);
    LogUtil.Debug("B.Text: GetTextSize output:", textSize);
    return textSize;
  }

  GetTextMinDimensions(): any {
    LogUtil.Debug("B.Text: GetTextMinDimensions input: none");
    const dimensions = this.formatter.GetFormatTextMinDimensions();
    LogUtil.Debug("B.Text: GetTextMinDimensions output:", dimensions);
    return dimensions;
  }

  SetSize(width: number, minHeight: number) {
    LogUtil.Debug("B.Text: SetSize input:", { width, minHeight });
    this.SetConstraints(width, width, minHeight);
    LogUtil.Debug("B.Text: SetSize output: constraints set with", { maxWidth: width, minWidth: width, minHeight });
  }

  CalcTextFit(inputDimensions: any): any {
    LogUtil.Debug("B.Text: CalcTextFit input:", inputDimensions);
    const result = this.formatter.CalcTextFit(inputDimensions);
    LogUtil.Debug("B.Text: CalcTextFit output:", result);
    return result;
  }

  CalcTextWrap(inputDimensions) {
    LogUtil.Debug("B.Text: CalcTextWrap input:", inputDimensions);
    const result = this.formatter.CalcTextWrap(inputDimensions);
    LogUtil.Debug("B.Text: CalcTextWrap output:", result);
    return result;
  }

  CalcFormatChange(changeData: any): any {
    LogUtil.Debug("B.Text: CalcFormatChange input:", changeData);
    const result = this.formatter.CalcFormatChange(changeData);
    LogUtil.Debug("B.Text: CalcFormatChange output:", result);
    return result;
  }

  SetRenderingEnabled(isEnabled: boolean) {
    LogUtil.Debug("B.Text: SetRenderingEnabled input:", { isEnabled });
    const deferredRenderWasNeeded = this.formatter.deferredRenderNeeded;

    if (isEnabled === undefined) {
      isEnabled = true;
    }

    if (this.formatter.renderingEnabled !== isEnabled) {
      this.formatter.SetRenderingEnabled(isEnabled);
      if (isEnabled && deferredRenderWasNeeded) {
        this.UpdateTextObject();
      }
    }

    LogUtil.Debug("B.Text: SetRenderingEnabled output: rendering enabled set to", isEnabled);
  }

  IsRenderingEnabled(renderingFlag?: any): boolean {
    LogUtil.Debug("B.Text: IsRenderingEnabled input:", { renderingFlag });
    const isEnabled = this.formatter.renderingEnabled;
    LogUtil.Debug("B.Text: IsRenderingEnabled output:", isEnabled);
    return isEnabled;
  }

  GetContentVersion(): number {
    LogUtil.Debug("B.Text: GetContentVersion input: none");
    const contentVersion = this.formatter.GetContentVersion();
    LogUtil.Debug("B.Text: GetContentVersion output:", contentVersion);
    return contentVersion;
  }

  GetSpellCheck(): any {
    LogUtil.Debug("B.Text: GetSpellCheck input: none");
    const spellCheckStatus = this.formatter.GetSpellCheck();
    LogUtil.Debug("B.Text: GetSpellCheck output:", spellCheckStatus);
    return spellCheckStatus;
  }

  SetSpellCheck(isSpellCheckEnabled, updateImmediately) {
    LogUtil.Debug("B.Text: SetSpellCheck input:", { isSpellCheckEnabled, updateImmediately });

    // Set the spell check state in the formatter
    this.formatter.SetSpellCheck(isSpellCheckEnabled);

    // If an immediate update is requested, perform the appropriate action based on the spell check state
    if (updateImmediately) {
      if (isSpellCheckEnabled) {
        if (this.doc.spellChecker) {
          this.doc.spellChecker.CheckSpellingForTextObj(this);
        }
      } else {
        this.UpdateTextObject();
      }
    }

    LogUtil.Debug("B.Text: SetSpellCheck output: completed");
  }

  UpdateSpellCheck(isSpellCheckEnabled: boolean): void {
    LogUtil.Debug("B.Text: UpdateSpellCheck input:", isSpellCheckEnabled);
    this.formatter.UpdateSpellCheck(isSpellCheckEnabled);
    this.UpdateTextObject();
    LogUtil.Debug("B.Text: UpdateSpellCheck output: Spell check updated and text object refreshed");
  }

  GetSpellCheckList() {
    LogUtil.Debug("B.Text: GetSpellCheckList input: no parameters");
    const wordList = this.formatter.GetWordList();
    LogUtil.Debug("B.Text: GetSpellCheckList output:", wordList);
    return wordList;
  }

  DoSpellCheck(): void {
    LogUtil.Debug("B.Text: DoSpellCheck input: none");

    if (this.formatter.SpellCheckValid()) {
      this.doc.spellChecker.CheckSpellingForTextObj(this);
    } else {
      this.formatter.UpdateSpellCheckFormatting();
    }

    LogUtil.Debug("B.Text: DoSpellCheck output: completed");
  }

  GetSpellAtLocation(clientX: number, clientY: number) {
    LogUtil.Debug("B.Text: GetSpellAtLocation input:", { clientX, clientY });
    clientY += $(window).scrollTop();
    const elementCoordinates = this.doc.ConvertWindowToElemCoords(clientX, clientY, this.textElem.node);
    const spellResult = this.formatter.GetSpellAtPoint(elementCoordinates);
    LogUtil.Debug("B.Text: GetSpellAtLocation output:", spellResult);
    return spellResult;
  }

  UpdateTextObject() {
    LogUtil.Debug("B.Text: UpdateTextObject input:");

    const formatSize = this.formatter.GetTextFormatSize();
    let isResized = false;
    let verticalOffset = 0;

    if (this.formatter.renderingEnabled) {
      const textHeight = formatSize.height;
      const minHeight = this.minHeight;
      const newHeight = Math.max(textHeight, minHeight);

      switch (this.vAlign) {
        case 'top':
          verticalOffset = 0;
          break;
        case 'middle':
          verticalOffset = (newHeight - textHeight) / 2;
          break;
        case 'bottom':
          verticalOffset = newHeight - textHeight;
          break;
      }

      const newFormatSize = {
        width: formatSize.width,
        height: newHeight
      };

      if (
        newFormatSize.width !== this.lastFmtSize.width ||
        newFormatSize.height !== this.lastFmtSize.height
      ) {
        this.CallEditCallback('willresize', newFormatSize);
        isResized = true;
      }

      this.svgObj.size(formatSize.width, newHeight);
      this.clickAreaElem.transform({ x: 0, y: 0 });
      this.clickAreaElem.size(formatSize.width, newHeight);
      this.textElem.size(formatSize.width, textHeight);
      this.textElem.transform({ x: 0, y: verticalOffset });
      this.decorationAreaElem.size(formatSize.width, textHeight);
      this.decorationAreaElem.transform({ x: 0, y: verticalOffset });
      this.textElemOffset = verticalOffset;
      this.geometryBBox.width = formatSize.width;
      this.geometryBBox.height = newHeight;

      this.RefreshPaint();
      this.formatter.RenderFormattedText(this.textElem, this.decorationAreaElem);

      if (
        !this.linksDisabled &&
        (this.cursorState === CursorConstant.CursorState.EditLink ||
          this.cursorState === CursorConstant.CursorState.LinkOnly)
      ) {
        this.formatter.SetHyperlinkCursor();
      }

      if (this.editor.IsActive()) {
        if (this.editor.cursorPos >= 0) {
          this.editor.UpdateCursor();
        } else if (this.editor.selStart >= 0) {
          this.editor.UpdateSelection();
        }
      }

      if (isResized) {
        this.CallEditCallback('didresize', newFormatSize);
      }
      this.lastFmtSize = newFormatSize;

      LogUtil.Debug("B.Text: UpdateTextObject output:", newFormatSize);
    }
  }

  Activate(inputEvent, callbackData) {
    LogUtil.Debug("B.Text: Activate input:", { inputEvent, callbackData });

    // Reset active edit style and make selection visible
    this.activeEditStyle = -1;
    this.selectHidden = false;

    // Set the current text object as active in the document
    this.doc.SetActiveEdit(this);

    // Activate the editor with the provided input event and callback data
    this.editor.Activate(inputEvent, callbackData);

    LogUtil.Debug("B.Text: Activate output: Editor activated");
  }

  Deactivate(deactivationEvent: any): void {
    LogUtil.Debug("B.Text: Deactivate input:", { deactivationEvent });
    this.activeEditStyle = -1;
    this.doc.activeEdit = null;
    this.editor.Deactivate(deactivationEvent);
    LogUtil.Debug("B.Text: Deactivate output: Editor deactivated");
  }

  IsActive(): boolean {
    LogUtil.Debug("B.Text: IsActive input: none");
    const isActive = this.editor.IsActive();
    LogUtil.Debug("B.Text: IsActive output:", isActive);
    return isActive;
  }

  SetVirtualKeyboardHook(callback, hookData) {
    LogUtil.Debug("B.Text: SetVirtualKeyboardHook input:", { callback, hookData });
    this.editor.SetVirtualKeyboardHook(callback, hookData);
    LogUtil.Debug("B.Text: SetVirtualKeyboardHook output: hook set successfully");
  }

  GetSelectedRange(): { start: number; end: number } {
    LogUtil.Debug("B.Text: GetSelectedRange input: none");

    let selectionRange = { start: -1, end: -1 };

    if (this.editor.IsActive()) {
      selectionRange = this.editor.GetSelection();
    }

    LogUtil.Debug("B.Text: GetSelectedRange output:", selectionRange);
    return selectionRange;
  }

  SetSelectedRange(startIndex: number, endIndex: number, selectionExtra: any, updateFlag: any) {
    LogUtil.Debug("B.Text: SetSelectedRange input:", { startIndex, endIndex, selectionExtra, updateFlag });

    // If start index is invalid or editor is not active, exit early
    if (startIndex < 0 || !this.editor.IsActive()) {
      LogUtil.Debug("B.Text: SetSelectedRange output: Invalid start index or editor not active");
      return;
    }

    // If the selection range is not a single point, reset the active edit style
    if (startIndex !== endIndex) {
      this.activeEditStyle = -1;
    }

    // Update the editor's selection and notify callback
    this.editor.SetSelection(startIndex, endIndex, selectionExtra, updateFlag);
    this.CallEditCallback('select');

    LogUtil.Debug("B.Text: SetSelectedRange output:", { startIndex, endIndex });
  }

  HandleKeyPressEvent(event: any): boolean {
    LogUtil.Debug("B.Text: HandleKeyPressEvent input:", event);
    const isEditorActive = this.editor && this.editor.IsActive();
    const handled = !!isEditorActive && this.editor.HandleKeyPress(event);
    LogUtil.Debug("B.Text: HandleKeyPressEvent output:", handled);
    return handled;
  }

  HandleKeyDownEvent(event: any): boolean {
    LogUtil.Debug("B.Text: HandleKeyDownEvent input:", event);
    const isEditorActive = this.editor && this.editor.IsActive();
    const result = isEditorActive && this.editor.HandleKeyDown(event);
    LogUtil.Debug("B.Text: HandleKeyDownEvent output:", result);
    return result;
  }

  HideSelection(): void {
    LogUtil.Debug("B.Text: HideSelection input: none");
    this.selectElem.plot();
    this.svgObj.remove(this.selectElem);
    LogUtil.Debug("B.Text: HideSelection output: selection hidden");
  }

  ShowSelection(selectionData: any): void {
    LogUtil.Debug("B.Text: ShowSelection input:", selectionData);

    this.selectElem.attr('fill', '#8888FF');
    this.selectElem.attr('stroke-width', 0);
    this.selectElem.attr('fill-opacity', 0.4);
    this.selectElem.attr('pointer-events', 'none');
    this.selectElem.transform({ y: this.textElemOffset });

    if (this.selectHidden) {
      this.selectElem.attr('visibility', 'hidden');
    } else {
      this.selectElem.attr('visibility', 'visible');
    }

    if (selectionData) {
      this.selectElem.plot(selectionData);
    }

    this.svgObj.add(this.selectElem);

    LogUtil.Debug("B.Text: ShowSelection output: selection displayed successfully");
  }

  SetSelectionVisible(isVisible: boolean) {
    LogUtil.Debug("B.Text: SetSelectionVisible input:", { isVisible });

    this.selectHidden = !isVisible;

    if (this.IsActive()) {
      if (this.selectHidden) {
        this.cursorElem.attr('visibility', 'hidden');
        this.selectElem.attr('visibility', 'hidden');
      } else {
        this.cursorElem.attr('visibility', 'visible');
        this.selectElem.attr('visibility', 'visible');
      }
    }

    LogUtil.Debug("B.Text: SetSelectionVisible output: selection visibility set to", isVisible);
  }

  HideInputCursor(): void {
    LogUtil.Debug("B.Text: HideInputCursor input: no parameters");
    if (this.cursorTimer !== undefined) {
      clearInterval(this.cursorTimer);
      this.cursorTimer = undefined;
    }
    this.cursorElem.attr('visibility', 'hidden');
    this.svgObj.remove(this.cursorElem);
    this.cursorPos = undefined;
    LogUtil.Debug("B.Text: HideInputCursor output: Cursor hidden");
  }

  ShowInputCursor(x: number, startY: number, endY: number) {
    LogUtil.Debug("B.Text: ShowInputCursor input:", { x, startY, endY });

    const strokeWidth = this.doc.ConverWindowToDocLength(1);
    if (this.cursorTimer !== undefined) {
      clearInterval(this.cursorTimer);
    }
    this.cursorElem.attr('fill', 'none');
    this.cursorElem.attr('stroke-width', strokeWidth);
    this.cursorElem.attr('stroke', '#000');
    this.cursorElem.attr('pointer-events', 'none');
    this.cursorElem.attr({
      x1: x,
      y1: startY + this.textElemOffset,
      x2: x,
      y2: endY + this.textElemOffset
    });
    if (this.selectHidden) {
      this.cursorElem.attr('visibility', 'hidden');
    } else {
      this.cursorElem.attr('visibility', 'visible');
    }
    this.svgObj.add(this.cursorElem);
    this.cursorPos = {
      x: x,
      y1: startY + this.textElemOffset,
      y2: endY + this.textElemOffset
    };

    this.cursorTimer = setInterval(() => {
      this.cursorElem.attr('visibility', 'hidden');
      setTimeout(() => {
        if (!this.selectHidden) {
          this.cursorElem.attr('visibility', 'visible');
        }
      }, 250);
    }, 1000);

    if (this.editor.IsActive() && this.editor.virtualKeyboardHook) {
      this.editor.virtualKeyboardHook(this, true);
    }

    LogUtil.Debug("B.Text: ShowInputCursor output: Cursor shown at", {
      x,
      y1: startY + this.textElemOffset,
      y2: endY + this.textElemOffset
    });
  }

  GetInputCursorPos(): { x1: number, y1: number, x2: number, y2: number } | null {
    LogUtil.Debug("B.Text: GetInputCursorPos input: none");

    if (this.cursorPos) {
      const startWindowCoords = this.doc.ConvertElemToWindowCoords(this.cursorPos.x, this.cursorPos.y1, this.svgObj.node);
      const endWindowCoords = this.doc.ConvertElemToWindowCoords(this.cursorPos.x, this.cursorPos.y2, this.svgObj.node);
      const cursorWindowPosition = {
        x1: startWindowCoords.x,
        y1: startWindowCoords.y,
        x2: endWindowCoords.x,
        y2: endWindowCoords.y
      };
      LogUtil.Debug("B.Text: GetInputCursorPos output:", cursorWindowPosition);
      return cursorWindowPosition;
    }

    LogUtil.Debug("B.Text: GetInputCursorPos output: cursor position is not defined");
    return null;
  }

  SetCursorState(newCursorState) {
    LogUtil.Debug("B.Text: SetCursorState input:", newCursorState);

    // Update the cursor state and clear all existing cursors
    this.cursorState = newCursorState;
    this.ClearAllCursors();

    // If the new cursor state indicates editing, set the text cursor
    if (
      newCursorState === CursorConstant.CursorState.EditOnly ||
      newCursorState === CursorConstant.CursorState.EditLink
    ) {
      this.SetCursor(CursorConstant.CursorType.Text);
    }

    // If hyperlinks are enabled and the new state supports them, update the hyperlink cursor
    if (
      !this.linksDisabled &&
      (
        newCursorState === CursorConstant.CursorState.EditLink ||
        newCursorState === CursorConstant.CursorState.LinkOnly
      )
    ) {
      this.formatter.SetHyperlinkCursor();
    }

    LogUtil.Debug("B.Text: SetCursorState output: cursorState set to", newCursorState);
  }

  GetCursorState(): number {
    LogUtil.Debug("B.Text: GetCursorState input: none");
    const currentCursorState = this.cursorState;
    LogUtil.Debug("B.Text: GetCursorState output:", currentCursorState);
    return currentCursorState;
  }

  DisableHyperlinks(shouldDisableHyperlinks: boolean) {
    LogUtil.Debug("B.Text: DisableHyperlinks input:", { shouldDisableHyperlinks });

    this.linksDisabled = shouldDisableHyperlinks;
    this.SetCursorState(this.cursorState);
    this.UpdateTextObject();

    LogUtil.Debug("B.Text: DisableHyperlinks output:", { linksDisabled: this.linksDisabled });
  }

  InitDataSettings(tableId: number, recordId: number, styleOverride: any) {
    LogUtil.Debug("B.Text: InitDataSettings input:", { tableId, recordId, styleOverride });
    this.dataTableID = tableId;
    this.dataRecordID = recordId;
    this.dataStyleOverride = styleOverride;
    LogUtil.Debug("B.Text: InitDataSettings output:", {
      dataTableID: this.dataTableID,
      dataRecordID: this.dataRecordID,
      dataStyleOverride: this.dataStyleOverride
    });
  }

  IsDataInitialized(): boolean {
    LogUtil.Debug("B.Text: isDataInitialized input: no parameters");
    const initialized = this.dataTableID > 0 && this.dataRecordID > 0;
    LogUtil.Debug("B.Text: isDataInitialized output:", initialized);
    return initialized;
  }

  GetDataField(startPosition: number) {
    LogUtil.Debug("B.Text: GetDataField input:", { startPosition });
    const dataField = this.formatter.GetDataField(startPosition);
    LogUtil.Debug("B.Text: GetDataField output:", dataField);
    return dataField;
  }

  InsertDataField(fieldId: string, startPosition: number, preserveFormatting: boolean) {
    LogUtil.Debug("B.Text: InsertDataField input:", { fieldId, startPosition, preserveFormatting });
    const dataText = this.GetDataText(fieldId, this.formatter.GetDataNameDisplay());
    const dataFieldInfo = {
      dataField: Formatter.FormatDataFieldID(fieldId, true)
    };
    this.SetText(dataText, dataFieldInfo, startPosition, preserveFormatting);
    LogUtil.Debug("B.Text: InsertDataField output: data field inserted", { fieldId, startPosition, preserveFormatting });
  }

  PasteDataField(dataFieldId: string): void {
    LogUtil.Debug("B.Text: PasteDataField input:", { dataFieldId });
    let selectionStart = 0;
    let selectionLength = 0;
    let selection;

    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        selectionStart = selection.start;
        selectionLength = selection.end - selection.start;
      }
    }

    this.InsertDataField(dataFieldId, selectionStart, selectionLength);
    this.CallEditCallback('edit');
    LogUtil.Debug("B.Text: PasteDataField output:", { dataFieldId, selectionStart, selectionLength });
  }

  HasDataFields(): boolean {
    LogUtil.Debug("B.Text: HasDataFields input: no parameters");
    const hasDataFields = this.formatter.HasDataFields();
    LogUtil.Debug("B.Text: HasDataFields output:", hasDataFields);
    return hasDataFields;
  }

  HasDataField(dataField: any) {
    LogUtil.Debug("B.Text: HasDataField input:", dataField);
    const result = this.formatter.HasDataField(dataField);
    LogUtil.Debug("B.Text: HasDataField output:", result);
    return result;
  }

  UpdateFromData(tableId?, recordId?) {
    LogUtil.Debug("B.Text: UpdateFromData input:", { tableId, recordId });

    if (tableId !== undefined && recordId !== undefined) {
      // If the provided table or record id is different, reset the style override
      if (tableId !== this.dataTableID || recordId !== this.dataRecordID) {
        this.dataStyleOverride = null;
      }
      this.InitDataSettings(tableId, recordId, this.dataStyleOverride);
    }

    this.formatter.RebuildFromData();
    this.UpdateTextObject();

    LogUtil.Debug("B.Text: UpdateFromData output:", "Data updated successfully");
  }

  SetDataNameDisplay(dataName: string) {
    LogUtil.Debug("B.Text: SetDataNameDisplay input:", { dataName });

    this.formatter.SetDataNameDisplay(dataName);
    this.UpdateFromData(this.dataTableID, this.dataRecordID);

    LogUtil.Debug("B.Text: SetDataNameDisplay output: Data name display updated");
  }

  GetDataNameDisplay(): string {
    LogUtil.Debug("B.Text: GetDataNameDisplay input: no parameters");
    const dataNameDisplay = this.formatter.GetDataNameDisplay();
    LogUtil.Debug("B.Text: GetDataNameDisplay output:", dataNameDisplay);
    return dataNameDisplay;
  }

  GetDataText(fieldId: string, useFieldName: boolean): string {
    LogUtil.Debug("B.Text: GetDataText input:", { fieldId, useFieldName });

    let result: string = ' ';

    if (this.dataTableID < 0 || this.dataRecordID < 0) {
      LogUtil.Debug("B.Text: GetDataText output:", result);
      return result;
    }

    // Format the field ID
    const formattedFieldId = Formatter.FormatDataFieldID(fieldId, false);

    if (useFieldName) {
      result = TData.FieldedDataGetFieldName(this.dataTableID, formattedFieldId);
    } else {
      result = TData.FieldedDataGetFieldValue(this.dataTableID, this.dataRecordID, formattedFieldId);
      const fieldType = TData.FieldedDataGetFieldType(this.dataTableID, formattedFieldId);
      result = T3Gv.opt.ModifyFieldDataForDisplay(result, fieldType);
    }

    if (!result || result === "") {
      result = ' ';
    }

    LogUtil.Debug("B.Text: GetDataText output:", result);
    return result;
  }

  GetDataStyle(dataFieldId: string): any[] {
    LogUtil.Debug("B.Text: GetDataStyle input:", { dataFieldId });
    let styleArray: any[] = [];

    if (this.dataTableID < 0 || this.dataRecordID < 0) {
      LogUtil.Debug("B.Text: GetDataStyle output:", styleArray);
      return styleArray;
    }

    const formattedDataFieldId = Formatter.FormatDataFieldID(dataFieldId, false);
    const fieldStyle = TData.FieldedDataGetFieldStyle(this.dataTableID, this.dataRecordID, formattedDataFieldId);

    if (fieldStyle) {
      styleArray = TData.FieldedDataParseStyle(fieldStyle);
    }

    LogUtil.Debug("B.Text: GetDataStyle output:", styleArray);
    return styleArray;
  }

  CheckDataExists(dataFieldId: string): boolean {
    LogUtil.Debug("B.Text: CheckDataExists input:", { dataFieldId });

    const tableIsValid = this.dataTableID >= 0;
    const recordIsValid = this.dataRecordID >= 0;
    let exists = false;

    if (tableIsValid && recordIsValid) {
      const formattedFieldId = Formatter.FormatDataFieldID(dataFieldId, false);
      const record = TData.FieldedDataGetRecord(this.dataTableID, this.dataRecordID);
      exists = !!record[formattedFieldId];
    }

    LogUtil.Debug("B.Text: CheckDataExists output:", exists);
    return exists;
  }

  RenderDataFieldHilites(): void {
    LogUtil.Debug("B.Text: RenderDataFieldHilites input: no parameters");
    this.formatter.RenderDataFieldHilites(this.decorationAreaElem);
    LogUtil.Debug("B.Text: RenderDataFieldHilites output: Data field highlights rendered");
  }

  ClearDataFieldHilites() {
    LogUtil.Debug("B.Text: ClearDataFieldHilites input: no parameters");
    this.formatter.ClearDataFieldHilites(this.decorationAreaElem);
    LogUtil.Debug("B.Text: ClearDataFieldHilites output: Data field hilites cleared");
  }

  RemapDataFields(dataMapping: any) {
    LogUtil.Debug("B.Text: RemapDataFields input:", dataMapping);

    if (this.HasDataFields()) {
      this.formatter.RemapDataFields(dataMapping);
    }

    LogUtil.Debug("B.Text: RemapDataFields output: completed remapping");
  }

  static RemapDataFieldsInRuntimeText(runtimeText: any, mappingArray: any[]) {
    LogUtil.Debug("B.Text: RemapDataFieldsInRuntimeText input:", { runtimeText, mappingArray });

    function transformDataField(dataField: string): string {
      const parts = dataField.split('_');
      let srcFieldId = parts[0];
      const suffix = parts[1];

      for (let i = 0; i < mappingArray.length; i++) {
        if (mappingArray[i].srcFieldID === srcFieldId) {
          srcFieldId = mappingArray[i].dstFieldID;
          break;
        }
      }
      return srcFieldId + '_' + suffix;
    }

    for (let i = 0; i < runtimeText.styles.length; i++) {
      const currentDataField = runtimeText.styles[i].dataField;
      if (currentDataField) {
        runtimeText.styles[i].dataField = transformDataField(currentDataField);
      }
    }

    LogUtil.Debug("B.Text: RemapDataFieldsInRuntimeText output:", runtimeText);
  }
}

export default Text
