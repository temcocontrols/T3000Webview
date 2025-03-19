

import T3Svg from "../Util/T3Svg"
import $ from "jquery"
import Element from "./B.Element"
import Formatter from "./B.Text.Formatter"
import Edit from "./B.Text.Edit"
import T3Gv from "../Data/T3Gv"
import CursorConstant from "../Data/Constant/CursorConstant"
import T3Util from "../Util/T3Util"

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
    T3Util.Log("B.Text: SetText input:", { newText, formatStyle, startPos, preserveFormatting, updateTextEntry });

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

    T3Util.Log("B.Text: SetText output: text updated successfully");
  }

  GetText(startIndex, textLength) {
    T3Util.Log("B.Text: GetText input:", { startIndex, textLength });
    const result = this.formatter.GetText(startIndex, textLength);
    T3Util.Log("B.Text: GetText output:", result);
    return result;
  }

  GetTextLength(): number {
    T3Util.Log("B.Text: GetTextLength input: none");
    const textLength = this.formatter.GetTextLength();
    T3Util.Log("B.Text: GetTextLength output:", textLength);
    return textLength;
  }

  SetRuntimeText(textData, startPos, textLength, preserveFormatting, updateTextEntry) {
    T3Util.Log("B.Text: SetRuntimeText input:", { textData, startPos, textLength, preserveFormatting, updateTextEntry });

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

    T3Util.Log("B.Text: SetRuntimeText output: text updated successfully");
  }

  GetRuntimeText(startIndex, textLength) {
    T3Util.Log("B.Text: GetRuntimeText input:", { startIndex, textLength });
    const runtimeText = this.formatter.GetRuntimeText(startIndex, textLength);
    T3Util.Log("B.Text: GetRuntimeText output:", runtimeText);
    return runtimeText;
  }

  DeleteText(startPosition, deleteLength, updateTextEntry) {
    T3Util.Log("B.Text: DeleteText input:", { startPosition, deleteLength, updateTextEntry });

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

    T3Util.Log("B.Text: DeleteText output:", { deletedCharacters: deleteLength, startPosition });
  }

  Copy(useRuntime: boolean): any {
    T3Util.Log("B.Text: Copy input:", { useRuntime });

    let selectionStart: number = 0;
    let selectionLength: number = 0;

    if (this.editor.IsActive()) {
      const selection = this.editor.GetSelection();
      if (selection.start === selection.end) {
        T3Util.Log("B.Text: Copy output: null (empty selection)");
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

    T3Util.Log("B.Text: Copy output:", result);
    return result;
  }

  Paste(inputText, useRuntime, updateTextEntry) {
    T3Util.Log("B.Text: Paste input:", { inputText, useRuntime, updateTextEntry });
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
    T3Util.Log("B.Text: Paste output: finished pasting");
  }

  Delete(updateTextEntry: any) {
    T3Util.Log("B.Text: Delete input:", { updateTextEntry });
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
    T3Util.Log("B.Text: Delete output:", { deletedCharacters: selectionLength, startPosition: selectionStart });
  }

  SetSelectedFormat(formatStyle) {
    T3Util.Log("B.Text: SetSelectedFormat input:", { formatStyle });
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
    T3Util.Log("B.Text: SetSelectedFormat output: completed");
  }

  GetSelectedFormat() {
    T3Util.Log("B.Text: GetSelectedFormat input: none");
    let selection, selectionStart, selectionLength;
    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        selectionStart = selection.start;
        selectionLength = selection.end - selection.start;
      }
    }
    const formatResult = this.GetFormat(selectionStart, selectionLength);
    T3Util.Log("B.Text: GetSelectedFormat output:", formatResult);
    return formatResult;
  }

  SetSelectedAlignment(alignment: string) {
    T3Util.Log("B.Text: SetSelectedAlignment input:", { alignment });
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
    T3Util.Log("B.Text: SetSelectedAlignment output:", { alignment, selectionStart, selectionLength });
  }

  GetSelectedAlignment() {
    T3Util.Log("B.Text: GetSelectedAlignment called");
    let selection, startIndex = 0;

    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        startIndex = selection.start;
      }
    }

    const alignment = this.GetParagraphAlignment(startIndex);
    T3Util.Log("B.Text: GetSelectedAlignment output:", alignment);
    return alignment;
  }

  SetSelectedParagraphStyle(paragraphStyle) {
    T3Util.Log("B.Text: SetSelectedParagraphStyle input:", { paragraphStyle });

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

    T3Util.Log("B.Text: SetSelectedParagraphStyle output:", { paragraphStyle, selectionStart, selectionLength });
  }

  GetSelectedParagraphStyle() {
    T3Util.Log("B.Text: GetSelectedParagraphStyle input: none");
    let selection;
    let startIndex = 0;

    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        startIndex = selection.start;
      }
    }

    const paragraphStyle = this.GetParagraphStyle(startIndex);
    T3Util.Log("B.Text: GetSelectedParagraphStyle output:", paragraphStyle);
    return paragraphStyle;
  }

  SetSelectedHyperlink(hyperlink) {
    T3Util.Log("B.Text: SetSelectedHyperlink input:", { hyperlink });

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

    T3Util.Log("B.Text: SetSelectedHyperlink output:", { hyperlink, startPosition, selectionLength });
  }

  GetSelectedHyperlink() {
    T3Util.Log("B.Text: GetSelectedHyperlink input: none");
    let selection = undefined;
    let startPosition = 0;

    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        startPosition = selection.start;
      }
    }

    const hyperlink = this.GetHyperlink(startPosition);
    T3Util.Log("B.Text: GetSelectedHyperlink output:", hyperlink);
    return hyperlink;
  }

  DeleteSelectedHyperlink() {
    T3Util.Log("B.Text: DeleteSelectedHyperlink input: no parameters; checking editor state");
    let selection, selectionStart = 0;
    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        selectionStart = selection.start;
      }
    }
    this.DeleteHyperlink(selectionStart);
    this.CallEditCallback("edit");
    T3Util.Log("B.Text: DeleteSelectedHyperlink output: Deleted hyperlink at position", selectionStart);
  }

  SetFormat(newFormat: any, selectionStart: any, selectionLength: any) {
    T3Util.Log("B.Text: SetFormat input:", { newFormat, selectionStart, selectionLength });
    const updatedActiveEditStyle = this.formatter.SetFormat(newFormat, selectionStart, selectionLength);
    this.activeEditStyle = updatedActiveEditStyle;
    this.UpdateTextObject();
    T3Util.Log("B.Text: SetFormat output:", { activeEditStyle: this.activeEditStyle });
  }

  GetFormat(startIndex, rangeLength) {
    T3Util.Log("B.Text: GetFormat input:", { startIndex, rangeLength });
    let activeStyle = this.activeEditStyle;
    let result;
    if (rangeLength === 0 && activeStyle >= 0) {
      result = this.formatter.GetFormatByID(activeStyle);
    } else {
      result = this.formatter.GetCommonFormatForRange(startIndex, rangeLength);
    }
    T3Util.Log("B.Text: GetFormat output:", result);
    return result;
  }

  SetVerticalAlignment(newAlignment) {
    T3Util.Log("B.Text: SetVerticalAlignment input:", newAlignment);
    this.vAlign = newAlignment;
    this.UpdateTextObject();
    T3Util.Log("B.Text: SetVerticalAlignment output: vAlign updated to", this.vAlign);
  }

  GetVerticalAlignment(): string {
    T3Util.Log("B.Text: GetVerticalAlignment input: none");
    const verticalAlignment = this.vAlign;
    T3Util.Log("B.Text: GetVerticalAlignment output:", verticalAlignment);
    return verticalAlignment;
  }

  SetParagraphAlignment(alignment: string, selectionStart: number, selectionLength: number) {
    T3Util.Log("B.Text: SetParagraphAlignment input:", { alignment, selectionStart, selectionLength });
    this.SetParagraphStyle({ just: alignment }, selectionStart, selectionLength);
    T3Util.Log("B.Text: SetParagraphAlignment output: completed", { alignment, selectionStart, selectionLength });
  }

  GetParagraphAlignment(paragraphIndex: number): string {
    T3Util.Log("B.Text: GetParagraphAlignment input:", { paragraphIndex });
    const paragraphStyle = this.GetParagraphStyle(paragraphIndex);
    const alignment = paragraphStyle.just;
    T3Util.Log("B.Text: GetParagraphAlignment output:", alignment);
    return alignment;
  }

  SetParagraphStyle(paragraphStyle, startPosition, selectionLength) {
    T3Util.Log("B.Text: SetParagraphStyle input:", { paragraphStyle, startPosition, selectionLength });
    this.formatter.SetParagraphStyle(paragraphStyle, startPosition, selectionLength);
    this.UpdateTextObject();
    T3Util.Log("B.Text: SetParagraphStyle output: completed");
  }

  GetParagraphStyle(paragraphIndex: number) {
    T3Util.Log("B.Text: GetParagraphStyle input:", { paragraphIndex });
    const paragraphStyle = this.formatter.GetParagraphStyle(paragraphIndex);
    T3Util.Log("B.Text: GetParagraphStyle output:", paragraphStyle);
    return paragraphStyle;
  }

  GetParagraphCount(): number {
    T3Util.Log("B.Text: GetParagraphCount input: none");
    const paragraphCount = this.formatter.GetParagraphCount();
    T3Util.Log("B.Text: GetParagraphCount output:", paragraphCount);
    return paragraphCount;
  }

  GetParagraphPosition(paragraphIndex: number) {
    T3Util.Log("B.Text: GetParagraphPosition input:", { paragraphIndex });
    const position = this.formatter.GetParagraphPosition(paragraphIndex);
    T3Util.Log("B.Text: GetParagraphPosition output:", position);
    return position;
  }

  SetHyperlink(url: string, startPos: number, selectionLength: number) {
    T3Util.Log("B.Text: SetHyperlink input:", { url, startPos, selectionLength });
    if (url && url.length) {
      this.formatter.SetHyperlink(url, startPos, selectionLength);
      this.UpdateTextObject();
      T3Util.Log("B.Text: SetHyperlink output: hyperlink set successfully");
    } else {
      this.DeleteHyperlink(startPos);
      T3Util.Log("B.Text: SetHyperlink output: hyperlink deleted");
    }
  }

  GetHyperlink(offset) {
    T3Util.Log("B.Text: GetHyperlink input:", offset);
    const hyperlink = this.formatter.GetHyperlinkAtOffset(offset);
    const result = hyperlink ? hyperlink.url : null;
    T3Util.Log("B.Text: GetHyperlink output:", result);
    return result;
  }

  DeleteHyperlink(hyperlinkStart: number) {
    T3Util.Log("B.Text: DeleteHyperlink input:", { hyperlinkStart });
    this.formatter.ClearHyperlink(hyperlinkStart);
    this.UpdateTextObject();
    T3Util.Log("B.Text: DeleteHyperlink output: Hyperlink removed at", hyperlinkStart);
  }

  GetHyperlinkAtLocation(gestureEvent: any) {
    T3Util.Log("B.Text: GetHyperlinkAtLocation input:", gestureEvent);
    const clientX = gestureEvent.gesture.center.clientX;
    const clientY = gestureEvent.gesture.center.clientY + $(window).scrollTop();
    const convertedCoords = this.doc.ConvertWindowToElemCoords(clientX, clientY, this.textElem.node);
    const hyperlink = this.formatter.GetHyperlinkAtPoint(convertedCoords);
    const result = hyperlink ? hyperlink.url : null;
    T3Util.Log("B.Text: GetHyperlinkAtLocation output:", result);
    return result;
  }

  SetConstraints(maxWidth: number, minWidth: number, minHeight: number) {
    T3Util.Log("B.Text: SetConstraints input:", { maxWidth, minWidth, minHeight });

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
    T3Util.Log("B.Text: SetConstraints output: Constraints updated");
  }

  SetEditCallback(callback, callbackData) {
    T3Util.Log("B.Text: SetEditCallback input:", { callback, callbackData });
    this.editCallback = callback;
    this.editCallbackData = callbackData;
    T3Util.Log("B.Text: SetEditCallback output: Callback set successfully");
  }

  CallEditCallback(actionType, callbackData?) {
    T3Util.Log("B.Text: CallEditCallback input:", { actionType, callbackData });
    if (this.editCallback) {
      const result = this.editCallback(actionType, callbackData, this, this.editCallbackData);
      T3Util.Log("B.Text: CallEditCallback output:", result);
      return result;
    }
    T3Util.Log("B.Text: CallEditCallback output:", "No editCallback defined");
  }

  GetTextSize() {
    T3Util.Log("B.Text: GetTextSize input: no parameters");
    let textSize = this.formatter.GetTextFormatSize();
    textSize.height = Math.max(textSize.height, this.minHeight);
    T3Util.Log("B.Text: GetTextSize output:", textSize);
    return textSize;
  }

  GetTextMinDimensions(): any {
    T3Util.Log("B.Text: GetTextMinDimensions input: none");
    const dimensions = this.formatter.GetFormatTextMinDimensions();
    T3Util.Log("B.Text: GetTextMinDimensions output:", dimensions);
    return dimensions;
  }

  SetSize(width: number, minHeight: number) {
    T3Util.Log("B.Text: SetSize input:", { width, minHeight });
    this.SetConstraints(width, width, minHeight);
    T3Util.Log("B.Text: SetSize output: constraints set with", { maxWidth: width, minWidth: width, minHeight });
  }

  CalcTextFit(inputDimensions: any): any {
    T3Util.Log("B.Text: CalcTextFit input:", inputDimensions);
    const result = this.formatter.CalcTextFit(inputDimensions);
    T3Util.Log("B.Text: CalcTextFit output:", result);
    return result;
  }

  CalcTextWrap(inputDimensions) {
    T3Util.Log("B.Text: CalcTextWrap input:", inputDimensions);
    const result = this.formatter.CalcTextWrap(inputDimensions);
    T3Util.Log("B.Text: CalcTextWrap output:", result);
    return result;
  }

  CalcFormatChange(changeData: any): any {
    T3Util.Log("B.Text: CalcFormatChange input:", changeData);
    const result = this.formatter.CalcFormatChange(changeData);
    T3Util.Log("B.Text: CalcFormatChange output:", result);
    return result;
  }

  SetRenderingEnabled(isEnabled: boolean) {
    T3Util.Log("B.Text: SetRenderingEnabled input:", { isEnabled });
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

    T3Util.Log("B.Text: SetRenderingEnabled output: rendering enabled set to", isEnabled);
  }

  IsRenderingEnabled(renderingFlag?: any): boolean {
    T3Util.Log("B.Text: IsRenderingEnabled input:", { renderingFlag });
    const isEnabled = this.formatter.renderingEnabled;
    T3Util.Log("B.Text: IsRenderingEnabled output:", isEnabled);
    return isEnabled;
  }

  GetContentVersion(): number {
    T3Util.Log("B.Text: GetContentVersion input: none");
    const contentVersion = this.formatter.GetContentVersion();
    T3Util.Log("B.Text: GetContentVersion output:", contentVersion);
    return contentVersion;
  }

  GetSpellCheck(): any {
    T3Util.Log("B.Text: GetSpellCheck input: none");
    const spellCheckStatus = this.formatter.GetSpellCheck();
    T3Util.Log("B.Text: GetSpellCheck output:", spellCheckStatus);
    return spellCheckStatus;
  }

  SetSpellCheck(isSpellCheckEnabled, updateImmediately) {
    T3Util.Log("B.Text: SetSpellCheck input:", { isSpellCheckEnabled, updateImmediately });

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

    T3Util.Log("B.Text: SetSpellCheck output: completed");
  }

  UpdateSpellCheck(isSpellCheckEnabled: boolean): void {
    T3Util.Log("B.Text: UpdateSpellCheck input:", isSpellCheckEnabled);
    this.formatter.UpdateSpellCheck(isSpellCheckEnabled);
    this.UpdateTextObject();
    T3Util.Log("B.Text: UpdateSpellCheck output: Spell check updated and text object refreshed");
  }

  GetSpellCheckList() {
    T3Util.Log("B.Text: GetSpellCheckList input: no parameters");
    const wordList = this.formatter.GetWordList();
    T3Util.Log("B.Text: GetSpellCheckList output:", wordList);
    return wordList;
  }

  DoSpellCheck(): void {
    T3Util.Log("B.Text: DoSpellCheck input: none");

    if (this.formatter.SpellCheckValid()) {
      this.doc.spellChecker.CheckSpellingForTextObj(this);
    } else {
      this.formatter.UpdateSpellCheckFormatting();
    }

    T3Util.Log("B.Text: DoSpellCheck output: completed");
  }

  GetSpellAtLocation(clientX: number, clientY: number) {
    T3Util.Log("B.Text: GetSpellAtLocation input:", { clientX, clientY });
    clientY += $(window).scrollTop();
    const elementCoordinates = this.doc.ConvertWindowToElemCoords(clientX, clientY, this.textElem.node);
    const spellResult = this.formatter.GetSpellAtPoint(elementCoordinates);
    T3Util.Log("B.Text: GetSpellAtLocation output:", spellResult);
    return spellResult;
  }

  UpdateTextObject() {
    T3Util.Log("B.Text: UpdateTextObject input:");

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

      T3Util.Log("B.Text: UpdateTextObject output:", newFormatSize);
    }
  }

  Activate(inputEvent, callbackData) {
    T3Util.Log("B.Text: Activate input:", { inputEvent, callbackData });

    // Reset active edit style and make selection visible
    this.activeEditStyle = -1;
    this.selectHidden = false;

    // Set the current text object as active in the document
    this.doc.SetActiveEdit(this);

    // Activate the editor with the provided input event and callback data
    this.editor.Activate(inputEvent, callbackData);

    T3Util.Log("B.Text: Activate output: Editor activated");
  }

  Deactivate(deactivationEvent: any): void {
    T3Util.Log("B.Text: Deactivate input:", { deactivationEvent });
    this.activeEditStyle = -1;
    this.doc.activeEdit = null;
    this.editor.Deactivate(deactivationEvent);
    T3Util.Log("B.Text: Deactivate output: Editor deactivated");
  }

  IsActive(): boolean {
    T3Util.Log("B.Text: IsActive input: none");
    const isActive = this.editor.IsActive();
    T3Util.Log("B.Text: IsActive output:", isActive);
    return isActive;
  }

  SetVirtualKeyboardHook(callback, hookData) {
    T3Util.Log("B.Text: SetVirtualKeyboardHook input:", { callback, hookData });
    this.editor.SetVirtualKeyboardHook(callback, hookData);
    T3Util.Log("B.Text: SetVirtualKeyboardHook output: hook set successfully");
  }

  GetSelectedRange(): { start: number; end: number } {
    T3Util.Log("B.Text: GetSelectedRange input: none");

    let selectionRange = { start: -1, end: -1 };

    if (this.editor.IsActive()) {
      selectionRange = this.editor.GetSelection();
    }

    T3Util.Log("B.Text: GetSelectedRange output:", selectionRange);
    return selectionRange;
  }

  SetSelectedRange(startIndex: number, endIndex: number, selectionExtra: any, updateFlag: any) {
    T3Util.Log("B.Text: SetSelectedRange input:", { startIndex, endIndex, selectionExtra, updateFlag });

    // If start index is invalid or editor is not active, exit early
    if (startIndex < 0 || !this.editor.IsActive()) {
      T3Util.Log("B.Text: SetSelectedRange output: Invalid start index or editor not active");
      return;
    }

    // If the selection range is not a single point, reset the active edit style
    if (startIndex !== endIndex) {
      this.activeEditStyle = -1;
    }

    // Update the editor's selection and notify callback
    this.editor.SetSelection(startIndex, endIndex, selectionExtra, updateFlag);
    this.CallEditCallback('select');

    T3Util.Log("B.Text: SetSelectedRange output:", { startIndex, endIndex });
  }

  HandleKeyPressEvent(event: any): boolean {
    T3Util.Log("B.Text: HandleKeyPressEvent input:", event);
    const isEditorActive = this.editor && this.editor.IsActive();
    const handled = !!isEditorActive && this.editor.HandleKeyPress(event);
    T3Util.Log("B.Text: HandleKeyPressEvent output:", handled);
    return handled;
  }

  HandleKeyDownEvent(event: any): boolean {
    T3Util.Log("B.Text: HandleKeyDownEvent input:", event);
    const isEditorActive = this.editor && this.editor.IsActive();
    const result = isEditorActive && this.editor.HandleKeyDown(event);
    T3Util.Log("B.Text: HandleKeyDownEvent output:", result);
    return result;
  }

  HideSelection(): void {
    T3Util.Log("B.Text: HideSelection input: none");
    this.selectElem.plot();
    this.svgObj.remove(this.selectElem);
    T3Util.Log("B.Text: HideSelection output: selection hidden");
  }

  ShowSelection(selectionData: any): void {
    T3Util.Log("B.Text: ShowSelection input:", selectionData);

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

    T3Util.Log("B.Text: ShowSelection output: selection displayed successfully");
  }

  SetSelectionVisible(isVisible: boolean) {
    T3Util.Log("B.Text: SetSelectionVisible input:", { isVisible });

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

    T3Util.Log("B.Text: SetSelectionVisible output: selection visibility set to", isVisible);
  }

  HideInputCursor(): void {
    T3Util.Log("B.Text: HideInputCursor input: no parameters");
    if (this.cursorTimer !== undefined) {
      clearInterval(this.cursorTimer);
      this.cursorTimer = undefined;
    }
    this.cursorElem.attr('visibility', 'hidden');
    this.svgObj.remove(this.cursorElem);
    this.cursorPos = undefined;
    T3Util.Log("B.Text: HideInputCursor output: Cursor hidden");
  }

  ShowInputCursor(x: number, startY: number, endY: number) {
    T3Util.Log("B.Text: ShowInputCursor input:", { x, startY, endY });

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

    T3Util.Log("B.Text: ShowInputCursor output: Cursor shown at", {
      x,
      y1: startY + this.textElemOffset,
      y2: endY + this.textElemOffset
    });
  }

  GetInputCursorPos(): { x1: number, y1: number, x2: number, y2: number } | null {
    T3Util.Log("B.Text: GetInputCursorPos input: none");

    if (this.cursorPos) {
      const startWindowCoords = this.doc.ConvertElemToWindowCoords(this.cursorPos.x, this.cursorPos.y1, this.svgObj.node);
      const endWindowCoords = this.doc.ConvertElemToWindowCoords(this.cursorPos.x, this.cursorPos.y2, this.svgObj.node);
      const cursorWindowPosition = {
        x1: startWindowCoords.x,
        y1: startWindowCoords.y,
        x2: endWindowCoords.x,
        y2: endWindowCoords.y
      };
      T3Util.Log("B.Text: GetInputCursorPos output:", cursorWindowPosition);
      return cursorWindowPosition;
    }

    T3Util.Log("B.Text: GetInputCursorPos output: cursor position is not defined");
    return null;
  }

  SetCursorState(newCursorState) {
    T3Util.Log("B.Text: SetCursorState input:", newCursorState);

    // Update the cursor state and clear all existing cursors
    this.cursorState = newCursorState;
    this.ClearAllCursors();

    // If the new cursor state indicates editing, set the text cursor
    if (
      newCursorState === CursorConstant.CursorState.EditOnly ||
      newCursorState === CursorConstant.CursorState.EditLink
    ) {
      this.SetCursor(CursorConstant.CursorType.TEXT);
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

    T3Util.Log("B.Text: SetCursorState output: cursorState set to", newCursorState);
  }

  GetCursorState(): number {
    T3Util.Log("B.Text: GetCursorState input: none");
    const currentCursorState = this.cursorState;
    T3Util.Log("B.Text: GetCursorState output:", currentCursorState);
    return currentCursorState;
  }

  DisableHyperlinks(shouldDisableHyperlinks: boolean) {
    T3Util.Log("B.Text: DisableHyperlinks input:", { shouldDisableHyperlinks });

    this.linksDisabled = shouldDisableHyperlinks;
    this.SetCursorState(this.cursorState);
    this.UpdateTextObject();

    T3Util.Log("B.Text: DisableHyperlinks output:", { linksDisabled: this.linksDisabled });
  }

  InitDataSettings(tableId: number, recordId: number, styleOverride: any) {
    T3Util.Log("B.Text: InitDataSettings input:", { tableId, recordId, styleOverride });
    this.dataTableID = tableId;
    this.dataRecordID = recordId;
    this.dataStyleOverride = styleOverride;
    T3Util.Log("B.Text: InitDataSettings output:", {
      dataTableID: this.dataTableID,
      dataRecordID: this.dataRecordID,
      dataStyleOverride: this.dataStyleOverride
    });
  }

  IsDataInitialized(): boolean {
    T3Util.Log("B.Text: isDataInitialized input: no parameters");
    const initialized = this.dataTableID > 0 && this.dataRecordID > 0;
    T3Util.Log("B.Text: isDataInitialized output:", initialized);
    return initialized;
  }

  GetDataField(startPosition: number) {
    T3Util.Log("B.Text: GetDataField input:", { startPosition });
    const dataField = this.formatter.GetDataField(startPosition);
    T3Util.Log("B.Text: GetDataField output:", dataField);
    return dataField;
  }

  InsertDataField(fieldId: string, startPosition: number, preserveFormatting: boolean) {
    T3Util.Log("B.Text: InsertDataField input:", { fieldId, startPosition, preserveFormatting });
    const dataText = this.GetDataText(fieldId, this.formatter.GetDataNameDisplay());
    const dataFieldInfo = {
      dataField: Formatter.FormatDataFieldID(fieldId, true)
    };
    this.SetText(dataText, dataFieldInfo, startPosition, preserveFormatting);
    T3Util.Log("B.Text: InsertDataField output: data field inserted", { fieldId, startPosition, preserveFormatting });
  }

  PasteDataField(dataFieldId: string): void {
    T3Util.Log("B.Text: PasteDataField input:", { dataFieldId });
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
    T3Util.Log("B.Text: PasteDataField output:", { dataFieldId, selectionStart, selectionLength });
  }

  HasDataFields(): boolean {
    T3Util.Log("B.Text: HasDataFields input: no parameters");
    const hasDataFields = this.formatter.HasDataFields();
    T3Util.Log("B.Text: HasDataFields output:", hasDataFields);
    return hasDataFields;
  }

  HasDataField(dataField: any) {
    T3Util.Log("B.Text: HasDataField input:", dataField);
    const result = this.formatter.HasDataField(dataField);
    T3Util.Log("B.Text: HasDataField output:", result);
    return result;
  }

  UpdateFromData(tableId?, recordId?) {
    T3Util.Log("B.Text: UpdateFromData input:", { tableId, recordId });

    if (tableId !== undefined && recordId !== undefined) {
      // If the provided table or record id is different, reset the style override
      if (tableId !== this.dataTableID || recordId !== this.dataRecordID) {
        this.dataStyleOverride = null;
      }
      this.InitDataSettings(tableId, recordId, this.dataStyleOverride);
    }

    this.formatter.RebuildFromData();
    this.UpdateTextObject();

    T3Util.Log("B.Text: UpdateFromData output:", "Data updated successfully");
  }

  SetDataNameDisplay(dataName: string) {
    T3Util.Log("B.Text: SetDataNameDisplay input:", { dataName });

    this.formatter.SetDataNameDisplay(dataName);
    this.UpdateFromData(this.dataTableID, this.dataRecordID);

    T3Util.Log("B.Text: SetDataNameDisplay output: Data name display updated");
  }

  GetDataNameDisplay(): string {
    T3Util.Log("B.Text: GetDataNameDisplay input: no parameters");
    const dataNameDisplay = this.formatter.GetDataNameDisplay();
    T3Util.Log("B.Text: GetDataNameDisplay output:", dataNameDisplay);
    return dataNameDisplay;
  }

  GetDataText(fieldId: string, useFieldName: boolean): string {
    T3Util.Log("B.Text: GetDataText input:", { fieldId, useFieldName });

    let result: string = ' ';

    if (this.dataTableID < 0 || this.dataRecordID < 0) {
      T3Util.Log("B.Text: GetDataText output:", result);
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

    T3Util.Log("B.Text: GetDataText output:", result);
    return result;
  }

  GetDataStyle(dataFieldId: string): any[] {
    T3Util.Log("B.Text: GetDataStyle input:", { dataFieldId });
    let styleArray: any[] = [];

    if (this.dataTableID < 0 || this.dataRecordID < 0) {
      T3Util.Log("B.Text: GetDataStyle output:", styleArray);
      return styleArray;
    }

    const formattedDataFieldId = Formatter.FormatDataFieldID(dataFieldId, false);
    const fieldStyle = TData.FieldedDataGetFieldStyle(this.dataTableID, this.dataRecordID, formattedDataFieldId);

    if (fieldStyle) {
      styleArray = TData.FieldedDataParseStyle(fieldStyle);
    }

    T3Util.Log("B.Text: GetDataStyle output:", styleArray);
    return styleArray;
  }

  CheckDataExists(dataFieldId: string): boolean {
    T3Util.Log("B.Text: CheckDataExists input:", { dataFieldId });

    const tableIsValid = this.dataTableID >= 0;
    const recordIsValid = this.dataRecordID >= 0;
    let exists = false;

    if (tableIsValid && recordIsValid) {
      const formattedFieldId = Formatter.FormatDataFieldID(dataFieldId, false);
      const record = TData.FieldedDataGetRecord(this.dataTableID, this.dataRecordID);
      exists = !!record[formattedFieldId];
    }

    T3Util.Log("B.Text: CheckDataExists output:", exists);
    return exists;
  }

  RenderDataFieldHilites(): void {
    T3Util.Log("B.Text: RenderDataFieldHilites input: no parameters");
    this.formatter.RenderDataFieldHilites(this.decorationAreaElem);
    T3Util.Log("B.Text: RenderDataFieldHilites output: Data field highlights rendered");
  }

  ClearDataFieldHilites() {
    T3Util.Log("B.Text: ClearDataFieldHilites input: no parameters");
    this.formatter.ClearDataFieldHilites(this.decorationAreaElem);
    T3Util.Log("B.Text: ClearDataFieldHilites output: Data field hilites cleared");
  }

  RemapDataFields(dataMapping: any) {
    T3Util.Log("B.Text: RemapDataFields input:", dataMapping);

    if (this.HasDataFields()) {
      this.formatter.RemapDataFields(dataMapping);
    }

    T3Util.Log("B.Text: RemapDataFields output: completed remapping");
  }

  static RemapDataFieldsInRuntimeText(runtimeText: any, mappingArray: any[]) {
    T3Util.Log("B.Text: RemapDataFieldsInRuntimeText input:", { runtimeText, mappingArray });

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

    T3Util.Log("B.Text: RemapDataFieldsInRuntimeText output:", runtimeText);
  }
}

export default Text
