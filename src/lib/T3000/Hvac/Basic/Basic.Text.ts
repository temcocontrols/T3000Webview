

import HvacSVG from "../Helper/SVG.t2"
import $ from "jquery";
import Element from "./Basic.Element"
import Formatter from "./Basic.Text.Formatter";
import Edit from "./Basic.Text.Edit";
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import ConstantData from "../Data/ConstantData"

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
    console.log("B.Text: createElement called with container:", container, "and options:", options);

    // Initialize formatter and editor
    this.formatter = new Formatter(this);
    this.editor = new Edit(this);

    // Create main SVG container element
    this.svgObj = new HvacSVG.Container(HvacSVG.create('g'));

    // Initialize the element with container and options
    this.InitElement(container, options);

    // Create SVG sub-elements
    this.textElem = new HvacSVG.Container(HvacSVG.create('text'));
    this.selectElem = new HvacSVG.Path();
    this.cursorElem = new HvacSVG.Line();
    this.clickAreaElem = new HvacSVG.Rect();
    this.decorationAreaElem = new HvacSVG.Container(HvacSVG.create('g'));

    // Initialize cursor settings
    this.cursorTimer = undefined;
    this.cursorPos = undefined;
    this.cursorState = ConstantData.CursorState.LINKONLY;

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
    this.lastFmtSize = {
      width: 0,
      height: 0
    };

    // Initialize text content
    this.SetText('');

    console.log("B.Text: createElement returning svgObj", this.svgObj);
    return this.svgObj;
  }

  SetText(newText, formatStyle?, startPos?, preserveFormatting?, updateTextEntry?) {
    console.log("B.Text: SetText input:", { newText, formatStyle, startPos, preserveFormatting, updateTextEntry });

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

    console.log("B.Text: SetText output: text updated successfully");
  }

  GetText(startIndex, textLength) {
    console.log("B.Text: GetText input:", { startIndex, textLength });
    const result = this.formatter.GetText(startIndex, textLength);
    console.log("B.Text: GetText output:", result);
    return result;
  }

  GetTextLength(): number {
    console.log("B.Text: GetTextLength input: none");
    const textLength = this.formatter.GetTextLength();
    console.log("B.Text: GetTextLength output:", textLength);
    return textLength;
  }

  SetRuntimeText(textData, startPos, textLength, preserveFormatting, updateTextEntry) {
    console.log("B.Text: SetRuntimeText input:", { textData, startPos, textLength, preserveFormatting, updateTextEntry });

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

    console.log("B.Text: SetRuntimeText output: text updated successfully");
  }

  GetRuntimeText(startIndex, textLength) {
    console.log("B.Text: GetRuntimeText input:", { startIndex, textLength });
    const runtimeText = this.formatter.GetRuntimeText(startIndex, textLength);
    console.log("B.Text: GetRuntimeText output:", runtimeText);
    return runtimeText;
  }

  DeleteText(startPosition, deleteLength, updateTextEntry) {
    console.log("B.Text: DeleteText input:", { startPosition, deleteLength, updateTextEntry });

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

    console.log("B.Text: DeleteText output:", { deletedCharacters: deleteLength, startPosition });
  }

  Copy(useRuntime: boolean): any {
    console.log("B.Text: Copy input:", { useRuntime });

    let selectionStart: number = 0;
    let selectionLength: number = 0;

    if (this.editor.IsActive()) {
      const selection = this.editor.GetSelection();
      if (selection.start === selection.end) {
        console.log("B.Text: Copy output: null (empty selection)");
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

    console.log("B.Text: Copy output:", result);
    return result;
  }

  Paste(inputText, useRuntime, updateTextEntry) {
    console.log("B.Text: Paste input:", { inputText, useRuntime, updateTextEntry });
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
    console.log("B.Text: Paste output: finished pasting");
  }

  Delete(updateTextEntry: any) {
    console.log("B.Text: Delete input:", { updateTextEntry });
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
    console.log("B.Text: Delete output:", { deletedCharacters: selectionLength, startPosition: selectionStart });
  }

  SetSelectedFormat(formatStyle) {
    console.log("B.Text: SetSelectedFormat input:", { formatStyle });
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
    console.log("B.Text: SetSelectedFormat output: completed");
  }

  GetSelectedFormat() {
    console.log("B.Text: GetSelectedFormat input: none");
    let selection, selectionStart, selectionLength;
    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        selectionStart = selection.start;
        selectionLength = selection.end - selection.start;
      }
    }
    const formatResult = this.GetFormat(selectionStart, selectionLength);
    console.log("B.Text: GetSelectedFormat output:", formatResult);
    return formatResult;
  }

  SetSelectedAlignment(alignment: string) {
    console.log("B.Text: SetSelectedAlignment input:", { alignment });
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
    console.log("B.Text: SetSelectedAlignment output:", { alignment, selectionStart, selectionLength });
  }

  GetSelectedAlignment() {
    console.log("B.Text: GetSelectedAlignment called");
    let selection, startIndex = 0;

    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        startIndex = selection.start;
      }
    }

    const alignment = this.GetParagraphAlignment(startIndex);
    console.log("B.Text: GetSelectedAlignment output:", alignment);
    return alignment;
  }

  SetSelectedParagraphStyle(paragraphStyle) {
    console.log("B.Text: SetSelectedParagraphStyle input:", { paragraphStyle });

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

    console.log("B.Text: SetSelectedParagraphStyle output:", { paragraphStyle, selectionStart, selectionLength });
  }

  GetSelectedParagraphStyle() {
    console.log("B.Text: GetSelectedParagraphStyle input: none");
    let selection;
    let startIndex = 0;

    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        startIndex = selection.start;
      }
    }

    const paragraphStyle = this.GetParagraphStyle(startIndex);
    console.log("B.Text: GetSelectedParagraphStyle output:", paragraphStyle);
    return paragraphStyle;
  }

  SetSelectedHyperlink(hyperlink) {
    console.log("B.Text: SetSelectedHyperlink input:", { hyperlink });

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

    console.log("B.Text: SetSelectedHyperlink output:", { hyperlink, startPosition, selectionLength });
  }

  GetSelectedHyperlink() {
    console.log("B.Text: GetSelectedHyperlink input: none");
    let selection = undefined;
    let startPosition = 0;

    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        startPosition = selection.start;
      }
    }

    const hyperlink = this.GetHyperlink(startPosition);
    console.log("B.Text: GetSelectedHyperlink output:", hyperlink);
    return hyperlink;
  }

  DeleteSelectedHyperlink() {
    console.log("B.Text: DeleteSelectedHyperlink input: no parameters; checking editor state");
    let selection, selectionStart = 0;
    if (this.editor.IsActive()) {
      selection = this.editor.GetSelection();
      if (selection.start >= 0) {
        selectionStart = selection.start;
      }
    }
    this.DeleteHyperlink(selectionStart);
    this.CallEditCallback("edit");
    console.log("B.Text: DeleteSelectedHyperlink output: Deleted hyperlink at position", selectionStart);
  }

  SetFormat(newFormat: any, selectionStart: any, selectionLength: any) {
    console.log("B.Text: SetFormat input:", { newFormat, selectionStart, selectionLength });
    const updatedActiveEditStyle = this.formatter.SetFormat(newFormat, selectionStart, selectionLength);
    this.activeEditStyle = updatedActiveEditStyle;
    this.UpdateTextObject();
    console.log("B.Text: SetFormat output:", { activeEditStyle: this.activeEditStyle });
  }

  GetFormat(startIndex, rangeLength) {
    console.log("B.Text: GetFormat input:", { startIndex, rangeLength });
    let activeStyle = this.activeEditStyle;
    let result;
    if (rangeLength === 0 && activeStyle >= 0) {
      result = this.formatter.GetFormatByID(activeStyle);
    } else {
      result = this.formatter.GetCommonFormatForRange(startIndex, rangeLength);
    }
    console.log("B.Text: GetFormat output:", result);
    return result;
  }

  SetVerticalAlignment(newAlignment) {
    console.log("B.Text: SetVerticalAlignment input:", newAlignment);
    this.vAlign = newAlignment;
    this.UpdateTextObject();
    console.log("B.Text: SetVerticalAlignment output: vAlign updated to", this.vAlign);
  }

  GetVerticalAlignment(): string {
    console.log("B.Text: GetVerticalAlignment input: none");
    const verticalAlignment = this.vAlign;
    console.log("B.Text: GetVerticalAlignment output:", verticalAlignment);
    return verticalAlignment;
  }

  SetParagraphAlignment(alignment: string, selectionStart: number, selectionLength: number) {
    console.log("B.Text: SetParagraphAlignment input:", { alignment, selectionStart, selectionLength });
    this.SetParagraphStyle({ just: alignment }, selectionStart, selectionLength);
    console.log("B.Text: SetParagraphAlignment output: completed", { alignment, selectionStart, selectionLength });
  }

  GetParagraphAlignment(paragraphIndex: number): string {
    console.log("B.Text: GetParagraphAlignment input:", { paragraphIndex });
    const paragraphStyle = this.GetParagraphStyle(paragraphIndex);
    const alignment = paragraphStyle.just;
    console.log("B.Text: GetParagraphAlignment output:", alignment);
    return alignment;
  }

  SetParagraphStyle(paragraphStyle, startPosition, selectionLength) {
    console.log("B.Text: SetParagraphStyle input:", { paragraphStyle, startPosition, selectionLength });
    this.formatter.SetParagraphStyle(paragraphStyle, startPosition, selectionLength);
    this.UpdateTextObject();
    console.log("B.Text: SetParagraphStyle output: completed");
  }

  GetParagraphStyle(paragraphIndex: number) {
    console.log("B.Text: GetParagraphStyle input:", { paragraphIndex });
    const paragraphStyle = this.formatter.GetParagraphStyle(paragraphIndex);
    console.log("B.Text: GetParagraphStyle output:", paragraphStyle);
    return paragraphStyle;
  }

  GetParagraphCount(): number {
    console.log("B.Text: GetParagraphCount input: none");
    const paragraphCount = this.formatter.GetParagraphCount();
    console.log("B.Text: GetParagraphCount output:", paragraphCount);
    return paragraphCount;
  }

  GetParagraphPosition(paragraphIndex: number) {
    console.log("B.Text: GetParagraphPosition input:", { paragraphIndex });
    const position = this.formatter.GetParagraphPosition(paragraphIndex);
    console.log("B.Text: GetParagraphPosition output:", position);
    return position;
  }

  SetHyperlink(url: string, startPos: number, selectionLength: number) {
    console.log("B.Text: SetHyperlink input:", { url, startPos, selectionLength });
    if (url && url.length) {
      this.formatter.SetHyperlink(url, startPos, selectionLength);
      this.UpdateTextObject();
      console.log("B.Text: SetHyperlink output: hyperlink set successfully");
    } else {
      this.DeleteHyperlink(startPos);
      console.log("B.Text: SetHyperlink output: hyperlink deleted");
    }
  }

  GetHyperlink(offset) {
    console.log("B.Text: GetHyperlink input:", offset);
    const hyperlink = this.formatter.GetHyperlinkAtOffset(offset);
    const result = hyperlink ? hyperlink.url : null;
    console.log("B.Text: GetHyperlink output:", result);
    return result;
  }

  DeleteHyperlink(hyperlinkStart: number) {
    console.log("B.Text: DeleteHyperlink input:", { hyperlinkStart });
    this.formatter.ClearHyperlink(hyperlinkStart);
    this.UpdateTextObject();
    console.log("B.Text: DeleteHyperlink output: Hyperlink removed at", hyperlinkStart);
  }

  GetHyperlinkAtLocation(gestureEvent: any) {
    console.log("B.Text: GetHyperlinkAtLocation input:", gestureEvent);
    const clientX = gestureEvent.gesture.center.clientX;
    const clientY = gestureEvent.gesture.center.clientY + $(window).scrollTop();
    const convertedCoords = this.doc.ConvertWindowToElemCoords(clientX, clientY, this.textElem.node);
    const hyperlink = this.formatter.GetHyperlinkAtPoint(convertedCoords);
    const result = hyperlink ? hyperlink.url : null;
    console.log("B.Text: GetHyperlinkAtLocation output:", result);
    return result;
  }

  SetConstraints(maxWidth: number, minWidth: number, minHeight: number) {
    console.log("B.Text: SetConstraints input:", { maxWidth, minWidth, minHeight });

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
    console.log("B.Text: SetConstraints output: Constraints updated");
  }

  SetEditCallback(callback, callbackData) {
    console.log("B.Text: SetEditCallback input:", { callback, callbackData });
    this.editCallback = callback;
    this.editCallbackData = callbackData;
    console.log("B.Text: SetEditCallback output: Callback set successfully");
  }

  CallEditCallback(actionType, callbackData?) {
    console.log("B.Text: CallEditCallback input:", { actionType, callbackData });
    if (this.editCallback) {
      const result = this.editCallback(actionType, callbackData, this, this.editCallbackData);
      console.log("B.Text: CallEditCallback output:", result);
      return result;
    }
    console.log("B.Text: CallEditCallback output:", "No editCallback defined");
  }

  GetTextSize() {
    console.log("B.Text: GetTextSize input: no parameters");
    let textSize = this.formatter.GetTextFormatSize();
    textSize.height = Math.max(textSize.height, this.minHeight);
    console.log("B.Text: GetTextSize output:", textSize);
    return textSize;
  }

  GetTextMinDimensions(): any {
    console.log("B.Text: GetTextMinDimensions input: none");
    const dimensions = this.formatter.GetFormatTextMinDimensions();
    console.log("B.Text: GetTextMinDimensions output:", dimensions);
    return dimensions;
  }

  SetSize(width: number, minHeight: number) {
    console.log("B.Text: SetSize input:", { width, minHeight });
    this.SetConstraints(width, width, minHeight);
    console.log("B.Text: SetSize output: constraints set with", { maxWidth: width, minWidth: width, minHeight });
  }

  CalcTextFit(inputDimensions: any): any {
    console.log("B.Text: CalcTextFit input:", inputDimensions);
    const result = this.formatter.CalcTextFit(inputDimensions);
    console.log("B.Text: CalcTextFit output:", result);
    return result;
  }

  CalcTextWrap(inputDimensions) {
    console.log("B.Text: CalcTextWrap input:", inputDimensions);
    const result = this.formatter.CalcTextWrap(inputDimensions);
    console.log("B.Text: CalcTextWrap output:", result);
    return result;
  }

  CalcFormatChange(changeData: any): any {
    console.log("B.Text: CalcFormatChange input:", changeData);
    const result = this.formatter.CalcFormatChange(changeData);
    console.log("B.Text: CalcFormatChange output:", result);
    return result;
  }

  SetRenderingEnabled(isEnabled: boolean) {
    console.log("B.Text: SetRenderingEnabled input:", { isEnabled });
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

    console.log("B.Text: SetRenderingEnabled output: rendering enabled set to", isEnabled);
  }

  IsRenderingEnabled(renderingFlag?: any): boolean {
    console.log("B.Text: IsRenderingEnabled input:", { renderingFlag });
    const isEnabled = this.formatter.renderingEnabled;
    console.log("B.Text: IsRenderingEnabled output:", isEnabled);
    return isEnabled;
  }

  GetContentVersion(): number {
    console.log("B.Text: GetContentVersion input: none");
    const contentVersion = this.formatter.GetContentVersion();
    console.log("B.Text: GetContentVersion output:", contentVersion);
    return contentVersion;
  }

  GetSpellCheck(): any {
    console.log("B.Text: GetSpellCheck input: none");
    const spellCheckStatus = this.formatter.GetSpellCheck();
    console.log("B.Text: GetSpellCheck output:", spellCheckStatus);
    return spellCheckStatus;
  }

  SetSpellCheck(isSpellCheckEnabled, updateImmediately) {
    console.log("B.Text: SetSpellCheck input:", { isSpellCheckEnabled, updateImmediately });

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

    console.log("B.Text: SetSpellCheck output: completed");
  }

  UpdateSpellCheck(isSpellCheckEnabled: boolean): void {
    console.log("B.Text: UpdateSpellCheck input:", isSpellCheckEnabled);
    this.formatter.UpdateSpellCheck(isSpellCheckEnabled);
    this.UpdateTextObject();
    console.log("B.Text: UpdateSpellCheck output: Spell check updated and text object refreshed");
  }

  GetSpellCheckList() {
    console.log("B.Text: GetSpellCheckList input: no parameters");
    const wordList = this.formatter.GetWordList();
    console.log("B.Text: GetSpellCheckList output:", wordList);
    return wordList;
  }

  DoSpellCheck(): void {
    console.log("B.Text: DoSpellCheck input: none");

    if (this.formatter.SpellCheckValid()) {
      this.doc.spellChecker.CheckSpellingForTextObj(this);
    } else {
      this.formatter.UpdateSpellCheckFormatting();
    }

    console.log("B.Text: DoSpellCheck output: completed");
  }

  GetSpellAtLocation(clientX: number, clientY: number) {
    console.log("B.Text: GetSpellAtLocation input:", { clientX, clientY });
    clientY += $(window).scrollTop();
    const elementCoordinates = this.doc.ConvertWindowToElemCoords(clientX, clientY, this.textElem.node);
    const spellResult = this.formatter.GetSpellAtPoint(elementCoordinates);
    console.log("B.Text: GetSpellAtLocation output:", spellResult);
    return spellResult;
  }

  UpdateTextObject() {
    console.log("B.Text: UpdateTextObject input:");

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
        (this.cursorState === ConstantData.CursorState.EDITLINK ||
          this.cursorState === ConstantData.CursorState.LINKONLY)
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

      console.log("B.Text: UpdateTextObject output:", newFormatSize);
    }
  }

  Activate(inputEvent, callbackData) {
    console.log("B.Text: Activate input:", { inputEvent, callbackData });

    // Reset active edit style and make selection visible
    this.activeEditStyle = -1;
    this.selectHidden = false;

    // Set the current text object as active in the document
    this.doc.SetActiveEdit(this);

    // Activate the editor with the provided input event and callback data
    this.editor.Activate(inputEvent, callbackData);

    console.log("B.Text: Activate output: Editor activated");
  }

  Deactivate(deactivationEvent: any): void {
    console.log("B.Text: Deactivate input:", { deactivationEvent });
    this.activeEditStyle = -1;
    this.doc.activeEdit = null;
    this.editor.Deactivate(deactivationEvent);
    console.log("B.Text: Deactivate output: Editor deactivated");
  }

  IsActive(): boolean {
    console.log("B.Text: IsActive input: none");
    const isActive = this.editor.IsActive();
    console.log("B.Text: IsActive output:", isActive);
    return isActive;
  }

  SetVirtualKeyboardHook(callback, hookData) {
    console.log("B.Text: SetVirtualKeyboardHook input:", { callback, hookData });
    this.editor.SetVirtualKeyboardHook(callback, hookData);
    console.log("B.Text: SetVirtualKeyboardHook output: hook set successfully");
  }

  GetSelectedRange(): { start: number; end: number } {
    console.log("B.Text: GetSelectedRange input: none");

    let selectionRange = { start: -1, end: -1 };

    if (this.editor.IsActive()) {
      selectionRange = this.editor.GetSelection();
    }

    console.log("B.Text: GetSelectedRange output:", selectionRange);
    return selectionRange;
  }

  SetSelectedRange(startIndex: number, endIndex: number, selectionExtra: any, updateFlag: any) {
    console.log("B.Text: SetSelectedRange input:", { startIndex, endIndex, selectionExtra, updateFlag });

    // If start index is invalid or editor is not active, exit early
    if (startIndex < 0 || !this.editor.IsActive()) {
      console.log("B.Text: SetSelectedRange output: Invalid start index or editor not active");
      return;
    }

    // If the selection range is not a single point, reset the active edit style
    if (startIndex !== endIndex) {
      this.activeEditStyle = -1;
    }

    // Update the editor's selection and notify callback
    this.editor.SetSelection(startIndex, endIndex, selectionExtra, updateFlag);
    this.CallEditCallback('select');

    console.log("B.Text: SetSelectedRange output:", { startIndex, endIndex });
  }

  HandleKeyPressEvent(event: any): boolean {
    console.log("B.Text: HandleKeyPressEvent input:", event);
    const isEditorActive = this.editor && this.editor.IsActive();
    const handled = !!isEditorActive && this.editor.HandleKeyPress(event);
    console.log("B.Text: HandleKeyPressEvent output:", handled);
    return handled;
  }

  HandleKeyDownEvent(event: any): boolean {
    console.log("B.Text: HandleKeyDownEvent input:", event);
    const isEditorActive = this.editor && this.editor.IsActive();
    const result = isEditorActive && this.editor.HandleKeyDown(event);
    console.log("B.Text: HandleKeyDownEvent output:", result);
    return result;
  }

  HideSelection(): void {
    console.log("B.Text: HideSelection input: none");
    this.selectElem.plot();
    this.svgObj.remove(this.selectElem);
    console.log("B.Text: HideSelection output: selection hidden");
  }

  ShowSelection(selectionData: any): void {
    console.log("B.Text: ShowSelection input:", selectionData);

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

    console.log("B.Text: ShowSelection output: selection displayed successfully");
  }

  SetSelectionVisible(isVisible: boolean) {
    console.log("B.Text: SetSelectionVisible input:", { isVisible });

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

    console.log("B.Text: SetSelectionVisible output: selection visibility set to", isVisible);
  }

  HideInputCursor(): void {
    console.log("B.Text: HideInputCursor input: no parameters");
    if (this.cursorTimer !== undefined) {
      clearInterval(this.cursorTimer);
      this.cursorTimer = undefined;
    }
    this.cursorElem.attr('visibility', 'hidden');
    this.svgObj.remove(this.cursorElem);
    this.cursorPos = undefined;
    console.log("B.Text: HideInputCursor output: Cursor hidden");
  }

  ShowInputCursor(x: number, startY: number, endY: number) {
    console.log("B.Text: ShowInputCursor input:", { x, startY, endY });

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

    console.log("B.Text: ShowInputCursor output: Cursor shown at", {
      x,
      y1: startY + this.textElemOffset,
      y2: endY + this.textElemOffset
    });
  }

  GetInputCursorPos(): { x1: number, y1: number, x2: number, y2: number } | null {
    console.log("B.Text: GetInputCursorPos input: none");

    if (this.cursorPos) {
      const startWindowCoords = this.doc.ConvertElemToWindowCoords(this.cursorPos.x, this.cursorPos.y1, this.svgObj.node);
      const endWindowCoords = this.doc.ConvertElemToWindowCoords(this.cursorPos.x, this.cursorPos.y2, this.svgObj.node);
      const cursorWindowPosition = {
        x1: startWindowCoords.x,
        y1: startWindowCoords.y,
        x2: endWindowCoords.x,
        y2: endWindowCoords.y
      };
      console.log("B.Text: GetInputCursorPos output:", cursorWindowPosition);
      return cursorWindowPosition;
    }

    console.log("B.Text: GetInputCursorPos output: cursor position is not defined");
    return null;
  }

  SetCursorState(newCursorState) {
    console.log("B.Text: SetCursorState input:", newCursorState);

    // Update the cursor state and clear all existing cursors
    this.cursorState = newCursorState;
    this.ClearAllCursors();

    // If the new cursor state indicates editing, set the text cursor
    if (
      newCursorState === ConstantData.CursorState.EDITONLY ||
      newCursorState === ConstantData.CursorState.EDITLINK
    ) {
      this.SetCursor(Element.CursorType.TEXT);
    }

    // If hyperlinks are enabled and the new state supports them, update the hyperlink cursor
    if (
      !this.linksDisabled &&
      (
        newCursorState === ConstantData.CursorState.EDITLINK ||
        newCursorState === ConstantData.CursorState.LINKONLY
      )
    ) {
      this.formatter.SetHyperlinkCursor();
    }

    console.log("B.Text: SetCursorState output: cursorState set to", newCursorState);
  }

  GetCursorState(): number {
    console.log("B.Text: GetCursorState input: none");
    const currentCursorState = this.cursorState;
    console.log("B.Text: GetCursorState output:", currentCursorState);
    return currentCursorState;
  }

  DisableHyperlinks(shouldDisableHyperlinks: boolean) {
    console.log("B.Text: DisableHyperlinks input:", { shouldDisableHyperlinks });

    this.linksDisabled = shouldDisableHyperlinks;
    this.SetCursorState(this.cursorState);
    this.UpdateTextObject();

    console.log("B.Text: DisableHyperlinks output:", { linksDisabled: this.linksDisabled });
  }

  InitDataSettings(tableId: number, recordId: number, styleOverride: any) {
    console.log("B.Text: InitDataSettings input:", { tableId, recordId, styleOverride });
    this.dataTableID = tableId;
    this.dataRecordID = recordId;
    this.dataStyleOverride = styleOverride;
    console.log("B.Text: InitDataSettings output:", {
      dataTableID: this.dataTableID,
      dataRecordID: this.dataRecordID,
      dataStyleOverride: this.dataStyleOverride
    });
  }

  IsDataInitialized(): boolean {
    console.log("B.Text: isDataInitialized input: no parameters");
    const initialized = this.dataTableID > 0 && this.dataRecordID > 0;
    console.log("B.Text: isDataInitialized output:", initialized);
    return initialized;
  }

  GetDataField(startPosition: number) {
    console.log("B.Text: GetDataField input:", { startPosition });
    const dataField = this.formatter.GetDataField(startPosition);
    console.log("B.Text: GetDataField output:", dataField);
    return dataField;
  }

  InsertDataField(fieldId: string, startPosition: number, preserveFormatting: boolean) {
    console.log("B.Text: InsertDataField input:", { fieldId, startPosition, preserveFormatting });
    const dataText = this.GetDataText(fieldId, this.formatter.GetDataNameDisplay());
    const dataFieldInfo = {
      dataField: BasicTextFormatter.FormatDataFieldID(fieldId, true)
    };
    this.SetText(dataText, dataFieldInfo, startPosition, preserveFormatting);
    console.log("B.Text: InsertDataField output: data field inserted", { fieldId, startPosition, preserveFormatting });
  }

  PasteDataField(dataFieldId: string): void {
    console.log("B.Text: PasteDataField input:", { dataFieldId });
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
    console.log("B.Text: PasteDataField output:", { dataFieldId, selectionStart, selectionLength });
  }

  HasDataFields(): boolean {
    console.log("B.Text: HasDataFields input: no parameters");
    const hasDataFields = this.formatter.HasDataFields();
    console.log("B.Text: HasDataFields output:", hasDataFields);
    return hasDataFields;
  }

  HasDataField(dataField: any) {
    console.log("B.Text: HasDataField input:", dataField);
    const result = this.formatter.HasDataField(dataField);
    console.log("B.Text: HasDataField output:", result);
    return result;
  }

  UpdateFromData(tableId?, recordId?) {
    console.log("B.Text: UpdateFromData input:", { tableId, recordId });

    if (tableId !== undefined && recordId !== undefined) {
      // If the provided table or record id is different, reset the style override
      if (tableId !== this.dataTableID || recordId !== this.dataRecordID) {
        this.dataStyleOverride = null;
      }
      this.InitDataSettings(tableId, recordId, this.dataStyleOverride);
    }

    this.formatter.RebuildFromData();
    this.UpdateTextObject();

    console.log("B.Text: UpdateFromData output:", "Data updated successfully");
  }

  SetDataNameDisplay(dataName: string) {
    console.log("B.Text: SetDataNameDisplay input:", { dataName });

    this.formatter.SetDataNameDisplay(dataName);
    this.UpdateFromData(this.dataTableID, this.dataRecordID);

    console.log("B.Text: SetDataNameDisplay output: Data name display updated");
  }

  GetDataNameDisplay(): string {
    console.log("B.Text: GetDataNameDisplay input: no parameters");
    const dataNameDisplay = this.formatter.GetDataNameDisplay();
    console.log("B.Text: GetDataNameDisplay output:", dataNameDisplay);
    return dataNameDisplay;
  }

  GetDataText(fieldId: string, useFieldName: boolean): string {
    console.log("B.Text: GetDataText input:", { fieldId, useFieldName });

    let result: string = ' ';

    if (this.dataTableID < 0 || this.dataRecordID < 0) {
      console.log("B.Text: GetDataText output:", result);
      return result;
    }

    // Format the field ID
    const formattedFieldId = BasicTextFormatter.FormatDataFieldID(fieldId, false);

    if (useFieldName) {
      result = ListManager.SDData.FieldedDataGetFieldName(this.dataTableID, formattedFieldId);
    } else {
      result = ListManager.SDData.FieldedDataGetFieldValue(this.dataTableID, this.dataRecordID, formattedFieldId);
      const fieldType = ListManager.SDData.FieldedDataGetFieldType(this.dataTableID, formattedFieldId);
      result = gListManager.ModifyFieldDataForDisplay(result, fieldType);
    }

    if (!result || result === "") {
      result = ' ';
    }

    console.log("B.Text: GetDataText output:", result);
    return result;
  }

  GetDataStyle(dataFieldId: string): any[] {
    console.log("B.Text: GetDataStyle input:", { dataFieldId });
    let styleArray: any[] = [];

    if (this.dataTableID < 0 || this.dataRecordID < 0) {
      console.log("B.Text: GetDataStyle output:", styleArray);
      return styleArray;
    }

    const formattedDataFieldId = BasicTextFormatter.FormatDataFieldID(dataFieldId, false);
    const fieldStyle = ListManager.SDData.FieldedDataGetFieldStyle(this.dataTableID, this.dataRecordID, formattedDataFieldId);

    if (fieldStyle) {
      styleArray = ListManager.SDData.FieldedDataParseStyle(fieldStyle);
    }

    console.log("B.Text: GetDataStyle output:", styleArray);
    return styleArray;
  }

  CheckDataExists(dataFieldId: string): boolean {
    console.log("B.Text: CheckDataExists input:", { dataFieldId });

    const tableIsValid = this.dataTableID >= 0;
    const recordIsValid = this.dataRecordID >= 0;
    let exists = false;

    if (tableIsValid && recordIsValid) {
      const formattedFieldId = BasicTextFormatter.FormatDataFieldID(dataFieldId, false);
      const record = ListManager.SDData.FieldedDataGetRecord(this.dataTableID, this.dataRecordID);
      exists = !!record[formattedFieldId];
    }

    console.log("B.Text: CheckDataExists output:", exists);
    return exists;
  }

  RenderDataFieldHilites(): void {
    console.log("B.Text: RenderDataFieldHilites input: no parameters");
    this.formatter.RenderDataFieldHilites(this.decorationAreaElem);
    console.log("B.Text: RenderDataFieldHilites output: Data field highlights rendered");
  }

  ClearDataFieldHilites() {
    console.log("B.Text: ClearDataFieldHilites input: no parameters");
    this.formatter.ClearDataFieldHilites(this.decorationAreaElem);
    console.log("B.Text: ClearDataFieldHilites output: Data field hilites cleared");
  }

  RemapDataFields(dataMapping: any) {
    console.log("B.Text: RemapDataFields input:", dataMapping);

    if (this.HasDataFields()) {
      this.formatter.RemapDataFields(dataMapping);
    }

    console.log("B.Text: RemapDataFields output: completed remapping");
  }

  static RemapDataFieldsInRuntimeText(runtimeText: any, mappingArray: any[]) {
    console.log("B.Text: RemapDataFieldsInRuntimeText input:", { runtimeText, mappingArray });

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

    console.log("B.Text: RemapDataFieldsInRuntimeText output:", runtimeText);
  }

  static CursorState = {
    NONE: 0,
    EDITONLY: 1,
    EDITLINK: 2,
    LINKONLY: 3
  }

  static ParagraphFormat() {
    console.log("B.Text: ParagraphFormat input: no parameters");

    // Set default paragraph formatting properties with readable names
    this.just = 'center';
    this.bullet = 'none';
    this.spacing = 0;
    this.lindent = 0;
    this.rindent = 0;
    this.pindent = 0;
    this.tabspace = 0;
    this.vjust = 'middle';

    const formatSettings = {
      justification: this.just,
      bullet: this.bullet,
      spacing: this.spacing,
      leftIndent: this.lindent,
      rightIndent: this.rindent,
      paragraphIndent: this.pindent,
      tabSpace: this.tabspace,
      verticalJustification: this.vjust
    };

    console.log("B.Text: ParagraphFormat output:", formatSettings);
    return formatSettings;
  }

}

export default Text
