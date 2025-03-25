

import $ from 'jquery';
import CursorConstant from "../../Data/Constant/CursorConstant";
import NvConstant from '../../Data/Constant/NvConstant';
import OptConstant from "../../Data/Constant/OptConstant";
import TextConstant from "../../Data/Constant/TextConstant";
import Instance from "../../Data/Instance/Instance";
import StateConstant from "../../Data/State/StateConstant";
import T3Gv from '../../Data/T3Gv';
import DefaultStyle from "../../Model/DefaultStyle";
import Rectangle from "../../Model/Rectangle";
import TextObject from "../../Model/TextObject";
import TextParams from "../../Model/TextParams";
import '../../Util/T3Hammer';
import T3Util from "../../Util/T3Util";
import Utils1 from "../../Util/Utils1";
import Utils2 from "../../Util/Utils2";
import DataUtil from "../Data/DataUtil";
import DSConstant from "../DS/DSConstant";
import ShapeUtil from '../Shape/ShapeUtil';
import DrawUtil from "./DrawUtil";
import OptCMUtil from "./OptCMUtil";
import SelectUtil from "./SelectUtil";
import SvgUtil from "./SvgUtil";
import PolyUtil from './PolyUtil';

class TextUtil {

  /**
   * Deactivates the text edit mode and saves any changes made to the text.
   * This function handles cleanup of text editing state, saving content changes,
   * and potentially deleting empty text objects.
   *
   * @param preventCompleteOperation - If true, prevents triggering a complete operation
   * @param shouldCloseTable - If true, closes the associated table after deactivation
   */
  static DeactivateTextEdit(preventCompleteOperation?, shouldCloseTable?) {
    T3Util.Log("O.Opt DeactivateTextEdit - Input:", { preventCompleteOperation, shouldCloseTable });

    let textDataId, objectIndex, cellCount;
    let session = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
    let operationRequired = false;
    // let tableSelectedIndex = null;
    let messageData = { theTEWasResized: false };

    // Clear text entry timer if active
    if (T3Gv.opt.textEntryTimer != null) {
      clearTimeout(T3Gv.opt.textEntryTimer);
      T3Gv.opt.textEntryTimer = null;

      // const wasMessagesLocked = Collab.AreMessagesLocked();
      // Collab.LockMessages();
      this.RegisterLastTEOp(NvConstant.TextElemLastOpt.Timeout);
      // if (!wasMessagesLocked) {
      //   // Collab.UnLockMessages();
      // }
    }

    // Process only if there's an active text editing object
    if (session.theActiveTextEditObjectID != -1) {
      // Collab.BeginSecondaryEdit();
      session = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, true);

      let selectedRange;
      let isTextEmpty = false;
      let isTextOnlyObject = false;
      let textEditor = T3Gv.opt.svgDoc.GetActiveEdit();
      let runtimeText = null;
      let isNotInTable = session.theActiveTableObjectID < 0;
      let drawingObject = DataUtil.GetObjectPtr(session.theActiveTextEditObjectID, true);

      if (drawingObject) {
        drawingObject.TableID < 0 && (isNotInTable = true);

        const textDataId = drawingObject.DataID;

        // Handle resize flags
        if (session.theTEWasResized) {
          messageData.theTEWasResized = true;
          OptCMUtil.SetLinkFlag(
            session.theActiveTextEditObjectID,
            DSConstant.LinkFlags.SED_L_MOVE
          );

          if (drawingObject.hooks.length) {
            OptCMUtil.SetLinkFlag(drawingObject.hooks[0].objid, DSConstant.LinkFlags.SED_L_MOVE);
          }

          session.theTEWasResized = false;
          session.theTEWasEdited = true;

          if (session.theActiveTableObjectID < 0) {
            DataUtil.AddToDirtyList(session.theActiveTextEditObjectID);
          }
        }

        // Special handling for 3D symbols
        if (drawingObject instanceof Instance.Shape.D3Symbol) {
          isNotInTable = false;
        }

        // // Check if object has a table
        // let tableData = drawingObject.GetTable(false);
        // if (tableData) {
        //   isNotInTable = false;
        // }
      }

      // Handle active editor state
      if (textEditor && (runtimeText = textEditor.GetRuntimeText())) {
        selectedRange = textEditor.GetSelectedRange();

        // Check if text is empty (only whitespace)
        isTextEmpty = textEditor.HasDataFields()
          ? 0 === textEditor.GetTextMinDimensions().width
          : 0 === textEditor.GetTextMinDimensions().width || textEditor.GetText() === ' ';

        // Handle reversal of standard text replacement
        if (isTextEmpty && this.ReverseReplaceStdText(drawingObject, textEditor)) {
          isTextEmpty = false;
          runtimeText = textEditor.GetRuntimeText();
          selectedRange = textEditor.GetSelectedRange();
        }

        // Get formatting style from the editor
        const formatStyle = textEditor.formatter.GetFormatAtOffset(0);

        // Apply style to the drawing object or table
        if (isNotInTable) {
          // Apply style directly to the object
          this.TextStyleToSDText(drawingObject.StyleRecord.Text, formatStyle.style);
        } else {
          // // Apply style to the table cell
          // let tableData = drawingObject.GetTable(true);
          // if (tableData) {
          //   tableSelectedIndex = tableData.select;

          //   // Find the cell index if not already selected
          //   if (tableData.select < 0 && drawingObject.DataID >= 0) {
          //     for (cellCount = tableData.cells.length, objectIndex = 0; objectIndex < cellCount; objectIndex++) {
          //       if (tableData.cells[objectIndex].DataID === drawingObject.DataID) {
          //         tableData.select = objectIndex;
          //         break;
          //       }
          //     }
          //   }

          //   this.Table_SaveTextStyle(tableData, formatStyle.style);
          // }
        }

        isTextOnlyObject = !!(drawingObject.flags & NvConstant.ObjFlags.TextOnly);

        // Save text to the data object
        if (textDataId != -1) {
          let textDataObject = DataUtil.GetObjectPtr(textDataId, false);
          if (textDataObject) {
            textDataObject.runtimeText = runtimeText;
            textDataObject.selrange = selectedRange;

            textDataObject = DataUtil.GetObjectPtr(textDataId, true);

            // Create collaboration message if enabled
            // if (Collab.AllowMessage()) {
            //   messageData.BlockID = drawingObject.BlockID;
            //   messageData.runtimeText = Utils1.DeepCopy(runtimeText);
            //   messageData.selrange = Utils1.DeepCopy(selectedRange);
            //   messageData.empty = isTextEmpty;
            //   messageData.isTextLabel = isTextOnlyObject;
            //   messageData.closetable = shouldCloseTable;

            //   // Add additional information for tables or connectors
            //   if (tableData) {
            //     messageData.TableSelect = tableData.select >= 0
            //       ? tableData.cells[tableData.select].uniqueid
            //       : -1;
            //   } else if (drawingObject && drawingObject instanceof SDJS.Connector) {
            //     messageData.DataID = drawingObject.DataID;
            //   }

            //   Collab.BuildMessage(NvConstant.CollabMessages.Text_End, messageData, false);
            // }

            // // Restore table selection
            // if (tableSelectedIndex != null) {
            //   tableData.select = tableSelectedIndex;
            // }

            // Mark the object as dirty if not in a table
            if (session.theActiveTableObjectID < 0) {
              DataUtil.AddToDirtyList(session.theActiveTextEditObjectID);
            }
          }
        }
      }

      // Unregister text editing events
      this.TEUnregisterEvents();

      // Handle empty text objects
      if (isTextEmpty) {
        if (isTextOnlyObject) {
          // Delete text-only objects that are empty
          DataUtil.DeleteObjects([session.theActiveTextEditObjectID], false);
          drawingObject = null;

          // Remove from selection list
          const selectedList = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, true);
          const indexInSelection = selectedList.indexOf(session.theActiveTextEditObjectID);

          if (indexInSelection >= 0) {
            selectedList.splice(indexInSelection, 1);

            // Reset target selection if needed
            if (SelectUtil.GetTargetSelect() === session.theActiveTextEditObjectID) {
              SelectUtil.SetTargetSelect(-1, true);
            }
          }

          session.theTEWasEdited = true;
        } else {
          // Remove text data from non-text-only objects
          const textDataBlock = T3Gv.stdObj.GetObject(textDataId);

          drawingObject = DataUtil.GetObjectPtr(session.theActiveTextEditObjectID, true);
          if (drawingObject) {
            drawingObject.SetTextObject(-1);
          }

          if (textDataBlock) {
            textDataBlock.Delete();
          }

          if (session.theActiveTableObjectID < 0) {
            DataUtil.AddToDirtyList(session.theActiveTextEditObjectID);
          }

          session.theTEWasEdited = true;
        }
      }

      // Mark if operation is required
      if (session.theTEWasEdited) {
        operationRequired = true;
      }

      // Reset session state
      session.theActiveTextEditObjectID = -1;
      session.theTEWasEdited = false;
      session.theTEWasResized = false;
      session.theTELastOp = NvConstant.TextElemLastOpt.Init;

      // // Handle table deactivation
      // if (drawingObject && drawingObject.GetTable) {
      //   let tableData = drawingObject.GetTable(true);
      //   if (tableData) {
      //     this.Table_DeActivateText(drawingObject, tableData);
      //     drawingObject.DataID = -1;
      //   }

      //   // Handle graph deactivation
      //   let graphData = drawingObject.GetGraph(true);
      //   if (graphData) {
      //     this.Graph_DeActivateText(drawingObject, graphData);
      //     drawingObject.DataID = -1;
      //   }

      //   // Special operation mng handling
      //   if (graphData == null && tableData == null) {
      //     const optMng = OptAhUtil.GetGvSviOpt(drawingObject.BlockID);
      //     if (optMng) {
      //       const textElement = T3Gv.opt.svgObjectLayer.GetElementById(drawingObject.BlockID).GetElementById(OptConstant.SVGElementClass.Text);
      //       optMng.ShapeSaveData(drawingObject, textElement);
      //     }
      //   }
      // }

      // Reset state and finalize operation
      // const wasMessagesLocked = Collab.AreMessagesLocked();
      // Collab.LockMessages();
      this.RegisterLastTEOp(NvConstant.TextElemLastOpt.Init);

      // if (!wasMessagesLocked) {
      //   Collab.UnLockMessages();
      // }

      // Handle table release if requested
      // if (shouldCloseTable) {
      //   this.Table_Release(false);
      // }

      // Complete operation if needed and not prevented
      if (operationRequired && !preventCompleteOperation) {
        DrawUtil.CompleteOperation(null);
      } else {
        DataUtil.PreserveUndoState(false);
        SvgUtil.RenderDirtySVGObjects();
      }

      // Collab.UnBlockMessages();
    }

    T3Util.Log("O.Opt DeactivateTextEdit - Output: Text edit deactivated");
  }

  /**
   * Registers the last text editor operation.
   * This function updates the internal state of the text editor session based on the given operation.
   * It preserves the undo state if necessary, sends out collaboration messages in case of a timeout,
   * and triggers a typing pause timer in case the operation is a character input.
   *
   * @param lastOp - The current text editor operation (e.g. CHAR, INIT, SELECT, TIMEOUT)
   */
  static RegisterLastTEOp(lastOp: number) {
    T3Util.Log("O.Opt RegisterLastTEOp - Input:", { lastOp });
    const opConstants = NvConstant.TextElemLastOpt;

    // Only proceed if not in note edit mode.
    if (!T3Gv.opt.bInNoteEdit) {
      // Collab.BeginSecondaryEdit();
      const session = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
      const previousOp = session.theTELastOp;

      // If there is an active text entry timer and the current operation is not a character,
      // clear the timer and register a TIMEOUT operation.
      if (
        T3Gv.opt.textEntryTimer != null &&
        lastOp !== opConstants.Char
      ) {
        clearTimeout(T3Gv.opt.textEntryTimer);
        T3Gv.opt.textEntryTimer = null;
        this.RegisterLastTEOp(opConstants.Timeout);
      }

      // Update the session with the current operation.
      session.theTELastOp = lastOp;
      if (lastOp !== opConstants.Init) {
        session.theTEWasEdited = true;
      }

      // Decide whether to process the operation based on the previous operation.
      const shouldProcess = (prevOp: number): boolean => {
        if (lastOp !== opConstants.Init) {
          switch (lastOp) {
            case opConstants.Char:
              if (prevOp !== lastOp) return true;
              break;
            case opConstants.Select:
              return false;
            default:
              return true;
          }
        }
        return false;
      };

      if (shouldProcess(previousOp)) {
        const activeEditor = T3Gv.opt.svgDoc.GetActiveEdit();
        let runtimeText: string | null = null;
        let selectedRange: any = null;
        const activeTextEditObj = DataUtil.GetObjectPtr(session.theActiveTextEditObjectID, false);

        // Proceed only if there is a valid active text edit object
        if (activeTextEditObj && activeTextEditObj.DataID >= 0 && activeEditor) {
          const textDataId = activeTextEditObj.DataID;
          runtimeText = activeEditor.GetRuntimeText();
          selectedRange = activeEditor.GetSelectedRange();

          if (runtimeText) {
            DataUtil.PreserveUndoState(false);
            let textObject = DataUtil.GetObjectPtr(textDataId, false);
            if (textObject) {
              // Update text object with the current content and selection range.
              textObject.runtimeText = runtimeText;
              textObject.selrange = selectedRange;

              if (lastOp !== opConstants.Timeout) {
                // Set text parameters based on the editor's formatter and minimum height.
                TextParams.minWidth = activeEditor.formatter.limits.minWidth;
                TextParams.maxWidth = activeEditor.formatter.limits.maxWidth;
                TextParams.minHeight = activeEditor.minHeight;

                // Retrieve updated objects
                const activeTextEditObjUpdated = DataUtil.GetObjectPtr(session.theActiveTextEditObjectID, true);
                textObject = DataUtil.GetObjectPtr(textDataId, true);
                // const tableObject = activeTextEditObjUpdated.GetTable(true);
                // Optionally process table related logic here if necessary.
              }

              if (lastOp === opConstants.Timeout /*&& Collab.AllowMessage()*/) {
                // Prepare collaboration message for text edit timeout.
                const messageData: any = {};
                messageData.BlockID = session.theActiveTextEditObjectID;
                const messageTarget = DataUtil.GetObjectPtr(messageData.BlockID, false);
                // let tableObj: any = messageTarget.GetTable(false);

                // if (tableObj) {
                //   messageData.TableSelect = tableObj.select >= 0 ? tableObj.cells[tableObj.select].uniqueid : -1;
                // } else
                if (messageTarget && messageTarget instanceof Instance.Shape.Connector) {
                  messageData.DataID = messageTarget.DataID;
                }

                messageData.runtimeText = Utils1.DeepCopy(runtimeText);
                messageData.selrange = Utils1.DeepCopy(selectedRange);
                messageData.minWidth = TextParams.minWidth;
                messageData.maxWidth = TextParams.maxWidth;
                messageData.minHeight = TextParams.minHeight;

                // Collab.BuildMessage(NvConstant.CollabMessages.Text_Edit, messageData, false);
                TextParams.minWidth = null;
                // Collab.UnBlockMessages();
              }
            }
          }
        }
      } else {
        // If processing is not needed, flag for unblocking messages.
        var shouldUnblock = true;
      }

      // If the current operation is a character input, reset the typing pause timeout.
      if (lastOp === opConstants.Char) {
        clearTimeout(T3Gv.opt.textEntryTimer);
        T3Gv.opt.textEntryTimer = null;
        T3Gv.opt.textEntryTimer = setTimeout(T3Gv.opt.TextEdit_PauseTyping, 1000);
      } else if (shouldUnblock) {
        // Collab.UnBlockMessages();
      }
    }
    T3Util.Log("O.Opt RegisterLastTEOp - Output: Completed");
  }

  /**
   * Attempts to reverse standard text replacement by pasting the original text into the target clipboard.
   * @param source - The source object containing text and table information.
   * @param clipboard - The target clipboard object which supports the Paste method.
   * @returns True if the reverse replacement occurred, otherwise false.
   */
  static ReverseReplaceStdText(source: any, clipboard: any): boolean {
    T3Util.Log("O.Opt ReverseReplaceStdText - Input:", { source, clipboard });
    let resultText: string;
    // let tableData: any;
    let replaceIndex = -1;

    // // Check if there is a table associated with the source object
    // if (tableData = source.GetTable(true)) {
    //   if (tableData.select >= 0) {
    //     const selectedCell = tableData.cells[tableData.select];
    //     if (selectedCell.flags & TODO.Table.CellFlags.SDT_F_Clickhere) {
    //       switch (selectedCell.celltype) {
    //         case TODO.Table.CellTypes.SDT_CT_PERSON:
    //           replaceIndex = TextConstant.ReplaceTextStrings.Indexes.PersonClick;
    //           break;
    //         default:
    //           replaceIndex = (source.TextFlags & NvConstant.TextFlags.OneClick)
    //             ? TextConstant.ReplaceTextStrings.Indexes.Click
    //             : TextConstant.ReplaceTextStrings.Indexes.DoubleClick;
    //       }
    //       resultText = TextConstant.ReplaceTextStrings[replaceIndex];
    //       clipboard.Paste(resultText);
    //       selectedCell.flags = Utils2.SetFlag(selectedCell.flags, TODO.Table.CellFlags.SDT_F_Clickhere, false);
    //       T3Util.Log("O.Opt ReverseReplaceStdText - Output:", true);
    //       return true;
    //     }
    //   }
    // } else
    // if (source.TextFlags & NvConstant.TextFlags.Clickhere) {
    //   resultText = (source.TextFlags & NvConstant.TextFlags.OneClick)
    //     ? TextConstant.ReplaceTextStrings[TextConstant.ReplaceTextStrings.Indexes.Click]
    //     : TextConstant.ReplaceTextStrings[TextConstant.ReplaceTextStrings.Indexes.DoubleClick];
    //   clipboard.Paste(resultText);
    //   source.TextFlags = Utils2.SetFlag(source.TextFlags, NvConstant.TextFlags.Clickhere, false);
    //   T3Util.Log("O.Opt ReverseReplaceStdText - Output:", true);
    //   return true;
    // }

    T3Util.Log("O.Opt ReverseReplaceStdText - Output:", false);
    return false;
  }

  /**
       * Updates the SD text object style based on the given text style settings.
       * @param sdText - The SD text object whose style will be updated.
       * @param textStyle - The text style parameters containing font, size, weight, style, baseOffset, decoration, color, and color transparency.
       */
  static TextStyleToSDText(sdText, textStyle) {
    T3Util.Log("O.Opt TextStyleToSDText - Input:", { sdText, textStyle });

    // Convert the font size from percentage to points (72 points per inch conversion)
    sdText.FontSize = Math.round(72 * textStyle.size / 100);

    // Determine the font identifier based on the font name provided in textStyle
    sdText.FontId = -1;//this.GetFontIdByName(textStyle.font);

    // Set font properties
    sdText.FontName = textStyle.font;
    sdText.Face = 0;

    // Update face flag for bold text
    if (textStyle.weight === 'bold') {
      sdText.Face += TextConstant.TextFace.Bold;
    }

    // Update face flag for italic text
    if (textStyle.style === 'italic') {
      sdText.Face += TextConstant.TextFace.Italic;
    }

    // Update face flag based on subscript or superscript offset
    if (textStyle.baseOffset === 'sub') {
      sdText.Face += TextConstant.TextFace.Subscript;
    } else if (textStyle.baseOffset === 'super') {
      sdText.Face += TextConstant.TextFace.Superscript;
    }

    // Update face flag for text decorations (underline or strike-through)
    if (textStyle.decoration === 'underline') {
      sdText.Face += TextConstant.TextFace.Underline;
    } else if (textStyle.decoration === 'line-through') {
      sdText.Face += TextConstant.TextFace.Strike;
    }

    // Set text color properties
    sdText.Paint.Color = textStyle.color;
    sdText.Paint.Opacity = textStyle.colorTrans;

    T3Util.Log("O.Opt TextStyleToSDText - Output:", sdText);
  }

  static TEUnregisterEvents(event?) {
    T3Util.Log('O.Opt TEUnregisterEvents - Input:', event);

    T3Gv.opt.svgDoc.ClearActiveEdit(event);

    if (T3Gv.opt.textEntryTimer != null) {
      clearTimeout(T3Gv.opt.textEntryTimer);
      T3Gv.opt.textEntryTimer = null;
    }

    if (T3Gv.opt.textHammer) {
      T3Gv.opt.textHammer.off('dragstart');
      T3Gv.opt.textHammer.dispose();
      T3Gv.opt.textHammer = null;
    }

    if (T3Gv.opt.clickAreaHammer) {
      T3Gv.opt.clickAreaHammer.off('dragstart');
      T3Gv.opt.clickAreaHammer.dispose();
      T3Gv.opt.clickAreaHammer = null;
    }

    if (T3Gv.opt.decAreaHammer) {
      T3Gv.opt.decAreaHammer.off('dragstart');
      T3Gv.opt.decAreaHammer.dispose();
      T3Gv.opt.decAreaHammer = null;
    }

    if (T3Gv.opt.TEWorkAreaHammer) {
      T3Gv.opt.TEWorkAreaHammer.off('drag');
      T3Gv.opt.TEWorkAreaHammer.off('dragend');
      T3Gv.opt.TEWorkAreaHammer.dispose();
      T3Gv.opt.TEWorkAreaHammer = null;
    }

    T3Util.Log('O.Opt TEUnregisterEvents - Output: done');
  }

  /**
     * Calculates the default initial text style based on the input style settings.
     * @param inputStyle - An object containing text style properties including:
     *                     FontName, FontSize, FontType, Face, and Paint properties.
     * @returns A DefaultStyle object with computed style properties.
     */
  static CalcDefaultInitialTextStyle(inputStyle) {
    T3Util.Log("O.Opt CalcDefaultInitialTextStyle - Input:", inputStyle);

    const defaultStyle = new DefaultStyle();
    const textFace = TextConstant.TextFace;

    defaultStyle.font = inputStyle.FontName;
    defaultStyle.size = ShapeUtil.PointSizeToFontSize(inputStyle.FontSize);
    defaultStyle.type = inputStyle.FontType;
    defaultStyle.color = inputStyle.Paint.Color;
    defaultStyle.colorTrans = inputStyle.Paint.Opacity;
    defaultStyle.weight = (inputStyle.Face & textFace.Bold) ? 'bold' : 'normal';
    defaultStyle.style = (inputStyle.Face & textFace.Italic) ? 'italic' : 'normal';
    defaultStyle.decoration = (inputStyle.Face & textFace.Underline) ? 'underline' : 'none';

    T3Util.Log("O.Opt CalcDefaultInitialTextStyle - Output:", defaultStyle);
    return defaultStyle;
  }

  /**
  * Handles text resizing for drawing objects
  * @param shapeId - ID of the shape to resize
  * @param constrainWidth - Whether to constrain width during resize
  * @param allowResize - Whether to allow resizing beyond minimum dimensions
  * @param svgElement - SVG element representing the shape
  * @param skipLinkFlagUpdate - Whether to skip updating link flags
  */
  static TextResizeCommon(shapeId, constrainWidth, allowResize, svgElement, skipLinkFlagUpdate) {
    T3Util.Log("O.Opt: TextResizeCommon inputs:", {
      shapeId,
      constrainWidth,
      allowResize,
      svgElementType: svgElement?.constructor?.name || "unknown",
      skipLinkFlagUpdate
    });

    const textEditSession = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
    const shape = DataUtil.GetObjectPtr(shapeId, false);

    // Handle BaseShape objects
    if (shape instanceof Instance.Shape.BaseShape) {
      // Get SVG element if not provided
      let element = svgElement || T3Gv.opt.svgObjectLayer.GetElementById(shapeId);

      if (element) {
        const textElement = element.textElem;

        if (textElement != null) {
          let shapeResized = false;
          let textTable = null;
          let tableSelectIndex = -1;
          let wasTableResize = false;

          // Get text parameters and dimensions
          let textParams = shape.GetTextParams(true);
          let textRect = textParams.trect;
          let minShapeWidth = shape.sizedim.width;
          let minShapeHeight = shape.sizedim.height;
          let textSizedWidth = textParams.tsizedim.width;
          let textSizedHeight = textParams.tsizedim.height;

          // Get minimum text dimensions
          let textMinDimensions = textElement.GetTextMinDimensions();
          let minTextWidth = textMinDimensions.width;

          if (minTextWidth < textSizedWidth) {
            minTextWidth = textSizedWidth;
          }

          let minTextHeight = textMinDimensions.height;
          if (minTextHeight < textSizedHeight) {
            minTextHeight = textSizedHeight;
          }

          // Create text rectangle with minimum dimensions
          let minTextRect = new Rectangle(
            textRect.x,
            textRect.y,
            minTextWidth,
            minTextHeight
          );

          // Handle text attachment positioning
          if (shape.TextFlags & NvConstant.TextFlags.AttachA ||
            shape.TextFlags & NvConstant.TextFlags.AttachB) {
            if (shape.TextFlags & NvConstant.TextFlags.AttachA) {
              switch (shape.TextAlign) {
                case TextConstant.TextAlign.TopLeft:
                case TextConstant.TextAlign.Left:
                case TextConstant.TextAlign.BottomLeft:
                  textElement.SetPos(0, -textMinDimensions.height - shape.TMargins.top);
                  break;
                case TextConstant.TextAlign.TopRight:
                case TextConstant.TextAlign.Right:
                case TextConstant.TextAlign.BottomRight:
                  textElement.SetPos(
                    shape.Frame.width - textMinDimensions.width,
                    -textMinDimensions.height - shape.TMargins.top
                  );
                  break;
                default:
                  textElement.SetPos(
                    shape.Frame.width / 2 - textMinDimensions.width / 2,
                    -textMinDimensions.height - shape.TMargins.top
                  );
              }
              T3Gv.opt.SetShapeR(shape);
            } else if (shape.TextFlags & NvConstant.TextFlags.AttachB) {
              switch (shape.TextAlign) {
                case TextConstant.TextAlign.TopLeft:
                case TextConstant.TextAlign.Left:
                case TextConstant.TextAlign.BottomLeft:
                  textElement.SetPos(0, shape.Frame.height);
                  break;
                case TextConstant.TextAlign.TopRight:
                case TextConstant.TextAlign.Right:
                case TextConstant.TextAlign.BottomRight:
                  textElement.SetPos(
                    shape.Frame.width - textMinDimensions.width,
                    shape.Frame.height
                  );
                  break;
                default:
                  textElement.SetPos(
                    shape.Frame.width / 2 - textMinDimensions.width / 2,
                    shape.Frame.height
                  );
              }
              T3Gv.opt.SetShapeR(shape);
            }
          } else {
            // Variables for positioning and sizing
            let centerX, centerY, growResult, targetShape;
            let originalFrame = $.extend(true, {}, shape.Frame);
            let newFrame = null;

            // Check if shape is in a group
            // const table = shape.GetTable(false);
            const graph = shape.GetGraph(false);
            const isInGroup = shape.bInGroup === true;

            if (isInGroup) {
              allowResize = true;
            }

            // Process based on the text growth behavior
            switch (shape.TextGrow) {
              case NvConstant.TextGrowBehavior.Horizontal:
                if (!Utils2.IsEqual(minTextWidth, textRect.width) ||
                  !Utils2.IsEqual(minTextHeight, textRect.height)) {

                  newFrame = $.extend(true, {}, shape.Frame);

                  // // Handle table text growth
                  // if (table && table.select >= 0) {
                  //   const updatedTable = shape.GetTable(false);
                  //   growResult = this.Table_TextGrow(
                  //     shape,
                  //     updatedTable,
                  //     updatedTable.select,
                  //     shape.TextGrow,
                  //     textMinDimensions,
                  //     null
                  //   );

                  //   textRect.width = growResult.x;
                  //   textRect.height = growResult.y;
                  //   shape.TRectToFrame(textRect, false);

                  //   let widthChange = shape.Frame.width - newFrame.width;
                  //   if (Utils2.IsEqual(widthChange, 0)) widthChange = 0;

                  //   let heightChange = shape.Frame.height - newFrame.height;
                  //   if (Utils2.IsEqual(heightChange, 0)) heightChange = 0;

                  //   wasTableResize = true;
                  // } else

                  {
                    // Standard text growth
                    shape.TRectToFrame(minTextRect, false);

                    let widthChange = shape.Frame.width - newFrame.width;
                    if (Utils2.IsEqual(widthChange, 0)) widthChange = 0;

                    let heightChange = shape.Frame.height - newFrame.height;
                    if (Utils2.IsEqual(heightChange, 0)) heightChange = 0;

                    // wasTableResize = false;
                  }

                  // Adjust position based on text alignment
                  if (widthChange) {
                    switch (shape.TextAlign) {
                      case TextConstant.TextAlign.TopLeft:
                      case TextConstant.TextAlign.Left:
                      case TextConstant.TextAlign.BottomLeft:
                        newFrame.width += widthChange;
                        break;
                      case TextConstant.TextAlign.TopCenter:
                      case TextConstant.TextAlign.Center:
                      case TextConstant.TextAlign.BottomCenter:
                        centerX = newFrame.x + newFrame.width / 2;
                        newFrame.width += widthChange;
                        centerX -= newFrame.width / 2;
                        if (isInGroup && shape.RotationAngle === 0) {
                          // No position adjustment
                        } else {
                          newFrame.x = centerX;
                        }
                        break;
                      case TextConstant.TextAlign.TopRight:
                      case TextConstant.TextAlign.Right:
                      case TextConstant.TextAlign.BottomRight:
                        newFrame.width += widthChange;
                        if (isInGroup && shape.RotationAngle === 0) {
                          // No position adjustment
                        } else {
                          newFrame.x -= widthChange;
                        }
                    }
                  }

                  // Apply height change if any
                  if (heightChange) {
                    newFrame.height += heightChange;
                  }

                  // Ensure minimum dimensions
                  if (allowResize || this.TextPinFrame(newFrame, textSizedHeight)) {
                    // Apply minimum dimensions for non-table shapes
                    if (wasTableResize === false) {
                      if (newFrame.width < minShapeWidth) {
                        newFrame.x = shape.Frame.x + shape.Frame.width / 2 - minShapeWidth / 2;
                        newFrame.width = minShapeWidth;
                      }
                      if (newFrame.height < minShapeHeight) {
                        newFrame.y = shape.Frame.y + shape.Frame.height / 2 - minShapeHeight / 2;
                        newFrame.height = minShapeHeight;
                      }
                    }

                    // Apply frame changes
                    if (widthChange || heightChange) {
                      shape.UpdateFrame(newFrame);
                      textEditSession.theTEWasResized = true;
                    }

                    // Update text position
                    if (textElement) {
                      textParams = shape.GetTextParams(false);
                      textRect = textParams.trect;
                      let svgFrame = shape.GetSVGFrame(newFrame);
                      textElement.SetPos(textRect.x - svgFrame.x, textRect.y - svgFrame.y);
                      textElement.SetConstraints(
                        T3Gv.opt.contentHeader.MaxWorkDim.x,
                        textRect.width,
                        textRect.height
                      );
                    }

                    // Perform additional resize operations
                    shape.ResizeInTextEdit(element, newFrame);
                    this.TextResizeNeedPageResize(shape, newFrame.x + newFrame.width, newFrame.y + newFrame.height);

                    // Handle rotation for grouped objects
                    if (isInGroup && shape.RotationAngle !== 0) {
                      let rotationCenter = {
                        x: originalFrame.x + originalFrame.width / 2,
                        y: originalFrame.y + originalFrame.height / 2
                      };

                      let originalRotatedRect = T3Gv.opt.RotateRect(
                        originalFrame,
                        rotationCenter,
                        shape.RotationAngle
                      );

                      rotationCenter = {
                        x: newFrame.x + newFrame.width / 2,
                        y: newFrame.y + newFrame.height / 2
                      };

                      let newRotatedRect = T3Gv.opt.RotateRect(
                        newFrame,
                        rotationCenter,
                        shape.RotationAngle
                      );

                      widthChange = originalRotatedRect.x - newRotatedRect.x;
                      heightChange = originalRotatedRect.y - newRotatedRect.y;
                      shape.OffsetShape(widthChange, heightChange);
                    }

                    // Update link flags
                    if (!skipLinkFlagUpdate) {
                      this.ResizeSetLinkFlag(shapeId, DSConstant.LinkFlags.SED_L_MOVE);
                    }
                  }
                }
                break;

              case NvConstant.TextGrowBehavior.Vertical:
              // Similar structure to Horizontal case but with vertical growth logic
              // ...

              case NvConstant.TextGrowBehavior.ProPortional:
              // Proportional resize logic
              // ...
            }
          }
        }
      }
    } else {
      // Handle non-BaseShape objects
      shape.AdjustTextEditBackground(shapeId, svgElement);
    }

    T3Util.Log("O.Opt: TextResizeCommon completed for shape:", shapeId);
  }

  /**
   * Resets the active text edit after an undo operation
   * @param runtimeTextOverride - Optional runtime text to use instead of the object's current text
   */
  static ResetActiveTextEditAfterUndo(runtimeTextOverride) {
    T3Util.Log("O.Opt: ResetActiveTextEditAfterUndo called with text override:",
      runtimeTextOverride ? "provided" : "none");

    const textEditSession = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

    if (textEditSession.theActiveTextEditObjectID !== -1) {
      const activeTextObject = DataUtil.GetObjectPtr(textEditSession.theActiveTextEditObjectID, false);

      if (!activeTextObject) {
        T3Util.Log("O.Opt: ActiveTextObject not found, aborting");
        return;
      }

      const dataId = activeTextObject.DataID;

      if (dataId !== -1) {
        const textDataObject = DataUtil.GetObjectPtr(dataId, false);

        if (textDataObject) {
          let runtimeText = textDataObject.runtimeText;
          const selectionRange = textDataObject.selrange;

          // Use the provided runtime text if available
          if (runtimeTextOverride) {
            runtimeText = runtimeTextOverride;
          }

          // Refresh the rendering if no override was provided
          if (!runtimeTextOverride) {
            DataUtil.AddToDirtyList(textEditSession.theActiveTextEditObjectID);
            SvgUtil.RenderDirtySVGObjects();
          }

          // Get and prepare the SVG element
          const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(textEditSession.theActiveTextEditObjectID);

          if (svgElement && svgElement.textElem) {
            this.TERegisterEvents(svgElement.textElem);

            const activeEdit = T3Gv.opt.svgDoc.GetActiveEdit();
            if (activeEdit) {
              activeEdit.SetRuntimeText(runtimeText);
              activeEdit.SetSelectedRange(
                selectionRange.start,
                selectionRange.end,
                selectionRange.line,
                selectionRange.anchor
              );
            }

            // Initialize empty text formatting if needed
            if (runtimeText.text === '') {
              T3Util.Log("O.Opt: Initializing empty text formatting");
              this.InitEmptyText(activeTextObject, svgElement);
            }
          }
        }
      }

      // Reset the text edit state
      textEditSession.TELastOp = NvConstant.TextElemLastOpt.Init;
      SvgUtil.ShowSVGSelectionState(textEditSession.theActiveTextEditObjectID, false);
    }

    T3Util.Log("O.Opt: ResetActiveTextEditAfterUndo complete");
  }

  /**
   * Calculates optimal text indentation values for text inside a polygon shape.
   * This function finds the largest rectangular area within the polygon and calculates
   * appropriate indentation ratios for each side (left, right, top, bottom).
   *
   * @param polygonPoints - Array of points defining the polygon shape
   * @param shapeFrame - Rectangle object representing the shape's frame with width and height properties
   * @returns Object containing indentation values for each side of the text (left, right, top, bottom)
   */
  static GuessTextIndents(polygonPoints, shapeFrame) {
    T3Util.Log("O.Opt GuessTextIndents - Input:", { polygonPoints, shapeFrame });

    // Initialize variables with descriptive names
    let shapeWidth, shapeHeight, frameWidth, frameHeight;
    let intersectionSegment, offsetStep, segmentPosition, endPosition;
    let topPosition, bottomPosition, leftPosition, rightPosition;
    let tempPosition, tempSegment, foundRectWidth, foundRectHeight;
    let rectangleArea, maxRectangleArea, bestRectangleHorizontal;
    let horizontalFound = false, verticalFound = false;
    let iterationCount = 10;
    let intersectionCount;

    // Create arrays to store intersection points
    let horizontalIntersectionPoints = [
      { x: 0, y: 0 },
      { x: 0, y: 0 }
    ];

    let verticalIntersectionPoints = [
      { x: 0, y: 0 },
      { x: 0, y: 0 }
    ];

    // Initialize result storage
    let rectangleResult = {};
    let horizontalRectangle = {};
    let indentationValues = {};

    // Ensure minimum dimensions
    shapeWidth = shapeFrame.width;
    if (shapeWidth < 1) {
      shapeWidth = 1;
    }

    shapeHeight = shapeFrame.height;
    if (shapeHeight < 1) {
      shapeHeight = 1;
    }

    frameWidth = shapeWidth;
    frameHeight = shapeHeight;

    // Create a frame rectangle
    let fullFrameRect = Utils2.SetRect(0, 0, shapeFrame.width, shapeFrame.height);

    // Calculate the step size for vertical search
    offsetStep = frameHeight / 20;

    // First pass: find best horizontal rectangle
    for (let i = 0; i < iterationCount; i++) {
      // Calculate the segment position as a percentage of the width
      segmentPosition = 0.8 * i * frameWidth / iterationCount;

      // Find intersections with the polygon at this position
      let intersectionCount = PolyUtil.PolyGetIntersect(polygonPoints, segmentPosition, horizontalIntersectionPoints, null, true);

      if (intersectionCount === 2) {
        // For each possible end position
        for (let j = 0; j < iterationCount - i; j++) {
          endPosition = (1 - j / iterationCount * 0.8) * frameWidth;

          // Find intersections at the end position
          intersectionCount = PolyUtil.PolyGetIntersect(polygonPoints, endPosition, verticalIntersectionPoints, null, true);

          if (intersectionCount === 2) {
            // Find the overlapping vertical range
            if (verticalIntersectionPoints[0] > horizontalIntersectionPoints[0]) {
              topPosition = verticalIntersectionPoints[0];
            } else {
              topPosition = horizontalIntersectionPoints[0];
            }

            if (verticalIntersectionPoints[1] < horizontalIntersectionPoints[1]) {
              bottomPosition = verticalIntersectionPoints[1];
            } else {
              bottomPosition = horizontalIntersectionPoints[1];
            }

            // If we have a valid vertical range
            if (topPosition < bottomPosition) {
              // Check the midpoint for further refinement
              tempPosition = topPosition;
              intersectionCount = PolyUtil.PolyGetIntersect(polygonPoints, tempPosition + 1, verticalIntersectionPoints, null, false);

              if (intersectionCount > 2) {
                tempPosition = topPosition += offsetStep;
                intersectionCount = PolyUtil.PolyGetIntersect(polygonPoints, tempPosition + 1, verticalIntersectionPoints, null, false);
              }

              tempPosition = bottomPosition;
              if (intersectionCount === 2) {
                intersectionCount = PolyUtil.PolyGetIntersect(polygonPoints, tempPosition - 1, verticalIntersectionPoints, null, false);

                if (intersectionCount > 2) {
                  tempPosition = bottomPosition -= offsetStep;
                  intersectionCount = PolyUtil.PolyGetIntersect(polygonPoints, tempPosition - 1, verticalIntersectionPoints, null, false);
                }
              }

              // If we still have a valid range
              if (intersectionCount === 2 && bottomPosition > topPosition) {
                tempPosition = topPosition + (bottomPosition - topPosition) / 2;
                leftPosition = segmentPosition;
                rightPosition = endPosition;

                // Check the midpoint
                intersectionCount = PolyUtil.PolyGetIntersect(polygonPoints, tempPosition - 1, verticalIntersectionPoints, null, false);

                if (intersectionCount === 2) {
                  if (verticalIntersectionPoints[0] > segmentPosition) {
                    leftPosition = verticalIntersectionPoints[0];
                  }

                  if (verticalIntersectionPoints[1] < endPosition) {
                    rightPosition = verticalIntersectionPoints[1];
                  }
                }

                // Calculate the area of this rectangle
                rectangleArea = (rightPosition - leftPosition) * (bottomPosition - topPosition);

                // Update the best rectangle if this is larger
                if (horizontalFound === false || maxRectangleArea < rectangleArea) {
                  horizontalFound = true;
                  maxRectangleArea = rectangleArea;
                  rectangleResult = Utils2.SetRect(leftPosition, topPosition, rightPosition, bottomPosition);
                }
              }
            }
          }
        }
      }
    }

    // Save the best horizontal rectangle if found
    if (horizontalFound) {
      bestRectangleHorizontal = maxRectangleArea;
      Utils2.CopyRect(horizontalRectangle, rectangleResult);
      verticalFound = true;
    }

    // Second pass: find best vertical rectangle
    offsetStep = frameWidth / 20;

    for (let i = 0; i < iterationCount; i++) {
      segmentPosition = 0.8 * i * frameHeight / iterationCount;
      intersectionCount = PolyUtil.PolyGetIntersect(polygonPoints, segmentPosition, horizontalIntersectionPoints, null, false);

      if (intersectionCount === 2) {
        for (let j = 0; j < iterationCount - i; j++) {
          endPosition = (1 - j / iterationCount * 0.8) * frameHeight;
          intersectionCount = PolyUtil.PolyGetIntersect(polygonPoints, endPosition, verticalIntersectionPoints, null, false);

          if (intersectionCount === 2) {
            if (verticalIntersectionPoints[0] > horizontalIntersectionPoints[0]) {
              topPosition = verticalIntersectionPoints[0];
            } else {
              topPosition = horizontalIntersectionPoints[0];
            }

            if (verticalIntersectionPoints[1] < horizontalIntersectionPoints[1]) {
              bottomPosition = verticalIntersectionPoints[1];
            } else {
              bottomPosition = horizontalIntersectionPoints[1];
            }

            if (topPosition < bottomPosition) {
              tempPosition = topPosition;
              intersectionCount = PolyUtil.PolyGetIntersect(polygonPoints, tempPosition + 1, verticalIntersectionPoints, null, true);

              if (intersectionCount > 2) {
                tempPosition = topPosition += offsetStep;
                intersectionCount = PolyUtil.PolyGetIntersect(polygonPoints, tempPosition + 1, verticalIntersectionPoints, null, true);
              }

              tempPosition = bottomPosition;
              if (intersectionCount === 2) {
                intersectionCount = PolyUtil.PolyGetIntersect(polygonPoints, tempPosition - 1, verticalIntersectionPoints, null, true);

                if (intersectionCount > 2) {
                  tempPosition = bottomPosition -= offsetStep;
                  intersectionCount = PolyUtil.PolyGetIntersect(polygonPoints, tempPosition - 1, verticalIntersectionPoints, null, true);
                }
              }

              if (intersectionCount === 2 && bottomPosition > topPosition) {
                tempPosition = topPosition + (bottomPosition - topPosition) / 2;
                leftPosition = segmentPosition;
                rightPosition = endPosition;

                intersectionCount = PolyUtil.PolyGetIntersect(polygonPoints, tempPosition - 1, verticalIntersectionPoints, null, true);

                if (intersectionCount === 2) {
                  if (verticalIntersectionPoints[0] > segmentPosition) {
                    leftPosition = verticalIntersectionPoints[0];
                  }

                  if (verticalIntersectionPoints[1] < endPosition) {
                    rightPosition = verticalIntersectionPoints[1];
                  }
                }

                rectangleArea = (rightPosition - leftPosition) * (bottomPosition - topPosition);

                if (horizontalFound === false || maxRectangleArea < rectangleArea) {
                  horizontalFound = true;
                  verticalFound = true;
                  maxRectangleArea = rectangleArea;
                  rectangleResult = Utils2.SetRect(topPosition, leftPosition, bottomPosition, rightPosition);
                }
              }
            }
          }
        }
      }
    }

    // Use the horizontal rectangle if it's better than the vertical one
    if (verticalFound && horizontalFound && bestRectangleHorizontal > maxRectangleArea) {
      Utils2.CopyRect(rectangleResult, horizontalRectangle);
    }

    // Calculate the indentation values
    if (horizontalFound) {
      indentationValues.left_sindent = (rectangleResult.x + 0) / shapeWidth;
      indentationValues.right_sindent = (fullFrameRect.x + fullFrameRect.width - (rectangleResult.x + rectangleResult.width) - 0) / shapeWidth;
      indentationValues.top_sindent = (rectangleResult.y + 0) / shapeHeight;
      indentationValues.bottom_sindent = (fullFrameRect.y + fullFrameRect.height - (rectangleResult.y + rectangleResult.height) - 0) / shapeHeight;
    } else {
      // Use default values if no good rectangle found
      indentationValues.left_sindent = 0.2;
      indentationValues.right_sindent = 0.2;
      indentationValues.top_sindent = 0.2;
      indentationValues.bottom_sindent = 0.2;
    }

    // Ensure indentation values aren't too large (total left+right indent shouldn't exceed 80%)
    while (indentationValues.left_sindent + indentationValues.right_sindent > 0.8) {
      if (indentationValues.left_sindent > 0.4) {
        indentationValues.left_sindent -= 0.1;
      }

      if (indentationValues.right_sindent > 0.4) {
        indentationValues.right_sindent -= 0.1;
      }
    }

    // Same for top/bottom indentation
    while (indentationValues.top_sindent + indentationValues.bottom_sindent > 0.8) {
      if (indentationValues.top_sindent > 0.4) {
        indentationValues.top_sindent -= 0.1;
      }

      if (indentationValues.bottom_sindent > 0.4) {
        indentationValues.bottom_sindent -= 0.1;
      }
    }

    T3Util.Log("O.Opt GuessTextIndents - Output:", indentationValues);
    return indentationValues;
  }

  /**
     * Converts a given font size value to points based on the document's DPI.
     * Logs the input value and output result using the prefix "O.Opt".
     *
     * @param fontSizeValue - The font size value to convert.
     * @returns The font size in points, or -1 if the input is invalid.
     */
  static FontSizeToPoints(fontSizeValue: number): number {
    T3Util.Log("O.Opt FontSizeToPoints - Input:", fontSizeValue);

    if (!fontSizeValue) {
      T3Util.Log("O.Opt FontSizeToPoints - Output:", -1);
      return -1;
    }

    const { rulerConfig, svgDoc } = T3Gv.docUtil;
    const docDpi = svgDoc.docInfo.docDpi;
    const points = rulerConfig.showpixels
      ? (72 * fontSizeValue) / docDpi
      : Math.round((72 * fontSizeValue) / docDpi);

    T3Util.Log("O.Opt FontSizeToPoints - Output:", points);
    return points;
  }

  static TERegisterEvents(textEditorWrapper, activationEvent, additionalOptions?) {
    T3Util.Log("O.Opt TERegisterEvents - Input:", { textEditorWrapper, activationEvent, additionalOptions });
    if (textEditorWrapper != null) {
      // Set up virtual keyboard for the text editor
      T3Gv.opt.SetVirtualKeyboardLifter(textEditorWrapper);
      // Activate the text editor with provided activation details
      textEditorWrapper.Activate(activationEvent, additionalOptions);

      // Initialize Hammer instances for various elements
      T3Gv.opt.textHammer = new Hammer(textEditorWrapper.editor.parent.textElem.node);
      T3Gv.opt.clickAreaHammer = new Hammer(textEditorWrapper.editor.parent.clickAreaElem.node);
      T3Gv.opt.decAreaHammer = new Hammer(textEditorWrapper.editor.parent.decorationAreaElem.node);
      T3Gv.opt.TEWorkAreaHammer = new Hammer(document.getElementById('svg-area'));

      // Register drag event listeners
      T3Gv.opt.textHammer.on("dragstart", this.TEDragStartFactory(textEditorWrapper.editor));
      T3Gv.opt.clickAreaHammer.on("dragstart", this.TEClickAreaDragStartFactory(textEditorWrapper.editor));
      T3Gv.opt.decAreaHammer.on("dragstart", this.TEClickAreaDragStartFactory(textEditorWrapper.editor));
      T3Gv.opt.TEWorkAreaHammer.on("drag", this.TEDragFactory(textEditorWrapper.editor));
      T3Gv.opt.TEWorkAreaHammer.on("dragend", this.TEDragEndFactory(textEditorWrapper.editor));
    }
    T3Util.Log("O.Opt TERegisterEvents - Output: Registered events");
  }

  static TargetPasteText(): boolean {
    T3Util.Log("O.Opt TargetPasteText - Input: no parameters");

    // Check if text clipboard exists and has text content
    if (!T3Gv.opt.textClipboard) {
      T3Util.Log("O.Opt TargetPasteText - Output: false (text clipboard does not exist)");
      return false;
    }
    if (T3Gv.opt.textClipboard.text == null) {
      T3Util.Log("O.Opt TargetPasteText - Output: false (text clipboard text is null)");
      return false;
    }

    // Get the target selection ID
    const targetId = SelectUtil.GetTargetSelect();
    if (targetId !== -1) {
      const targetObject = DataUtil.GetObjectPtr(targetId, false);
      if (targetObject && targetObject.AllowTextEdit()) {
        // Begin secondary edit operation
        // Collab.BeginSecondaryEdit();

        // Get the DOM element for the target text object and activate text edit mode
        const textElement = T3Gv.opt.svgObjectLayer.GetElementById(targetId);
        this.ActivateTextEdit(textElement);

        // Get the active text editor object and select its entire text
        const activeEditor = T3Gv.opt.svgDoc.GetActiveEdit();
        const currentTextLength = activeEditor.GetText().length;
        activeEditor.SetSelectedRange(0, currentTextLength);

        // Paste clipboard text and update the text edit state
        this.RegisterLastTEOp(NvConstant.TextElemLastOpt.Paste);
        activeEditor.Paste(T3Gv.opt.textClipboard, true);
        this.RegisterLastTEOp(NvConstant.TextElemLastOpt.Timeout);

        T3Util.Log("O.Opt TargetPasteText - Output: true (text pasted successfully)");
        return true;
      }
    }
    T3Util.Log("O.Opt TargetPasteText - Output: false (invalid target or text editing not allowed)");
    return false;
  }

  /**
     * Gets the ID of the object currently being edited for text
     * @returns The ID of the active text edit object, or null if none
     */
  static GetActiveTextEdit() {
    T3Util.Log("O.Opt GetActiveTextEdit - Input: No parameters");

    let activeTextEditObjectId = null;
    const textEditSession = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

    if (textEditSession.theActiveTextEditObjectID != -1) {
      activeTextEditObjectId = textEditSession.theActiveTextEditObjectID;
    }

    T3Util.Log("O.Opt GetActiveTextEdit - Output:", activeTextEditObjectId);
    return activeTextEditObjectId;
  }

  /**
     * Activates text editing for the specified drawing object
     * @param drawingElement - The SVG drawing element
     * @param event - The event that triggered activation (can be null)
     * @param preventSelectionChange - Flag to prevent selection change
     * @param textData - Optional data for collaborative text editing
     */
  static ActivateTextEdit(drawingElement, event?, preventSelectionChange?, textData?) {
    T3Util.Log('O.Opt ActivateTextEdit - Input:', {
      drawingElementId: drawingElement?.ID,
      hasEvent: !!event,
      preventSelectionChange,
      hasTextData: !!textData
    });

    let targetSelectionId;
    let textBlock;
    let textObject;
    let drawingObject;
    let selectedRange;

    const objectId = drawingElement.ID;
    const textEditSession = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
    const objectsToSelect = [];
    let eventData = {};

    // Check if the object exists and is not locked
    drawingObject = DataUtil.GetObjectPtr(objectId, false);
    if (!drawingObject || !(drawingObject instanceof Instance.Shape.BaseDrawObject) ||
      (drawingObject.flags & NvConstant.ObjFlags.Lock)) {
      T3Util.Log('O.Opt ActivateTextEdit - Output: Object invalid or locked');
      return;
    }

    // // Handle tables
    // const table = drawingObject.GetTable(false);
    // if (table && event) {
    //   const cellIndex = T3Gv.opt.Table_GetCellClicked(drawingObject, event);
    //   if (cellIndex >= 0 && !T3Gv.opt.Table_AllowCellTextEdit(table, cellIndex)) {
    //     T3Util.Log('O.Opt ActivateTextEdit - Output: Cell text editing not allowed');
    //     return;
    //   }
    // } else if (table && this.Table_GetFirstTextCell(table) < 0) {
    //   T3Util.Log('O.Opt ActivateTextEdit - Output: No text cells available in table');
    //   return;
    // }

    eventData.BlockID = objectId;

    // Handle case when no text data is provided
    if (!textData) {
      // If the object is already being edited, just return
      if (objectId == textEditSession.theActiveTextEditObjectID) {
        T3Util.Log('O.Opt ActivateTextEdit - Output: Object already being edited');
        return;
      }

      // Close any existing text edit
      if (textEditSession.theActiveTextEditObjectID != -1) {
        T3Gv.opt.CloseEdit();
      }

      // Handle selection state
      const selectedList = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, false);
      if (selectedList.indexOf(objectId) === -1 || selectedList.length > 1) {
        objectsToSelect.push(objectId);
        SelectUtil.SelectObjects(objectsToSelect, false, true);
        targetSelectionId = selectedList[0];
      } else {
        targetSelectionId = objectId;
      }
    } else {
      eventData = textData.Data;
    }

    // // Begin collaborative editing session
    // Collab.BeginSecondaryEdit();

    // Get a preserved copy of the object
    const preservedObject = DataUtil.GetObjectPtr(objectId, true);
    const textObjectId = preservedObject.GetTextObject(event, false, eventData);
    let preservedTextEditSession;

    if (textObjectId != null) {
      // Prepare the text edit session
      if (!textData) {
        preservedTextEditSession = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, true);
      } else if (textData.EditorID === Collab.EditorID) {
        const tempSession = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
        tempSession.theActiveTextEditObjectID = -1;

        const activeTableId = tempSession.theActiveTableObjectID;
        tempSession.theTEWasResized = false;
        tempSession.theTEWasEdited = false;

        preservedTextEditSession = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, true);
        preservedTextEditSession.theActiveTextEditObjectID = objectId;
        preservedTextEditSession.theActiveTableObjectID = activeTableId;
      } else {
        const tempSession = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
        tempSession.EditorID = textData.EditorID;

        preservedTextEditSession = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, true);
        preservedTextEditSession.EditorID = Collab.EditorID;
      }

      // Get the SVG element for the object
      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(objectId);

      // Create a new text object if needed
      if (textObjectId == -1) {
        const updatedObject = DataUtil.GetObjectPtr(objectId, true);

        // Create a new text object
        const newTextObject = new TextObject({});
        const newTextBlock = T3Gv.stdObj.CreateBlock(
          StateConstant.StoredObjectType.TextObject,
          newTextObject
        );

        if (newTextBlock === null) {
          T3Util.Log('O.Opt ActivateTextEdit - Output: Failed to create text block');
          throw new Error('ActivateTextEdit got a null new text block allocation');
        }

        if (!updatedObject.SetTextObject(newTextBlock.ID)) {
          T3Util.Log('O.Opt ActivateTextEdit - Output: Failed to set text object');
          return;
        }

        updatedObject.LMAddSVGTextObject(T3Gv.opt.svgDoc, svgElement);
        textObject = newTextBlock.Data;
      } else {
        textObject = DataUtil.GetObjectPtr(textObjectId, true);
        if (!svgElement.textElem) {
          preservedObject.LMAddSVGTextObject(T3Gv.opt.svgDoc, svgElement);
        }
      }

      // Set up text editing session
      if (!textData) {
        preservedTextEditSession.theActiveTextEditObjectID = objectId;
        preservedTextEditSession.theTEWasResized = false;
        preservedTextEditSession.theTEWasEdited = false;
      }

      // // Handle table selection
      // if (table) {
      //   if (table.select >= 0) {
      //     eventData.TableSelect = table.cells[table.select].uniqueid;
      //   } else {
      //     eventData.TableSelect = -1;
      //   }
      // }

      // Configure editing environment based on whether it's a table
      if (!textData) {
        // if (table) {
        //   this.Table_Load(objectId);
        // } else {
        //   this.Table_Release(false);

        //   // Move text element to front if not attached to something
        //   if ((drawingObject.TextFlags & NvConstant.TextFlags.AttachA) == 0 &&
        //     (drawingObject.TextFlags & NvConstant.TextFlags.AttachB) == 0) {
        //     T3Gv.opt.svgObjectLayer.MoveElementToFront(svgElement);
        //   }
        // }
      }

      // Register events and handle text selection
      if (!textData) {
        if (event && event.gesture) {
          this.TERegisterEvents(svgElement.textElem, event.gesture.srcEvent, preventSelectionChange);
        } else {
          this.TERegisterEvents(svgElement.textElem, event);
        }

        const activeEdit = T3Gv.opt.svgDoc.GetActiveEdit();
        selectedRange = activeEdit.GetSelectedRange();
        eventData.theSelectedRange = Utils1.DeepCopy(selectedRange);

        // If no event, select all text
        if (event == null) {
          const textLength = activeEdit.GetText().length;
          eventData.theSelectedRange.start = 0;
          eventData.theSelectedRange.anchor = 0;
          eventData.theSelectedRange.end = textLength;
        }
      } else if (textData && textData.EditorID === Collab.EditorID) {
        selectedRange = textData.Data.theSelectedRange;
      }

      // Handle empty text
      const currentText = svgElement.textElem.GetText();
      if (currentText === '') {
        if (textObjectId < 0) {
          // Set up default text styles
          const textStyleParams = {};
          const defaultTextStyle = preservedObject.GetTextDefault(textStyleParams);
          eventData.TextStyle = Utils1.DeepCopy(defaultTextStyle);

          const initialTextStyle = TextUtil.CalcDefaultInitialTextStyle(defaultTextStyle);
          eventData.theDefaultStyle = Utils1.DeepCopy(initialTextStyle);

          const verticalAlignment = textStyleParams.vjust;
          eventData.vjust = verticalAlignment;

          // Apply styles to the text element
          const activeEdit = T3Gv.opt.svgDoc.GetActiveEdit();
          eventData.theSelectedRange = selectedRange;

          // Initialize the text element with a space, apply styles, then clear it
          svgElement.textElem.SetText(' ');
          svgElement.textElem.SetFormat(initialTextStyle);
          svgElement.textElem.SetParagraphStyle(textStyleParams);

          if (preservedObject instanceof Instance.Shape.BaseShape) {
            svgElement.textElem.SetVerticalAlignment(verticalAlignment);
          }

          svgElement.textElem.SetText('');
          textObject.runtimeText = svgElement.textElem.GetRuntimeText();
        }

        // Clear the click-here flag
        preservedObject.TextFlags = Utils2.SetFlag(
          preservedObject.TextFlags,
          NvConstant.TextFlags.Clickhere,
          false
        );
      } else {
        // Replace standard placeholder text if needed
        if ((!textData /*&& !Collab.IsSecondary()*/) ||
          (textData /*&& textData.EditorID === Collab.EditorID*/)) {
          // this.ReplaceStdText(preservedObject, currentText, svgElement.textElem);
        }
      }

      // Update selection range
      if (selectedRange) {
        textObject.selrange = selectedRange;
      }

      // Finalize UI setup
      if (!textData) {
        svgElement.SetCursor(CursorConstant.CursorType.TEXT);

        if (targetSelectionId) {
          SvgUtil.ShowSVGSelectionState(targetSelectionId, false);
        }

        this.RegisterLastTEOp(NvConstant.TextElemLastOpt.Init);
      }

      // Preserve undo state and send collaboration message
      DataUtil.PreserveUndoState(false);

      // if (Collab.AllowMessage()) {
      //   Collab.BuildMessage(NvConstant.CollabMessages.Text_Init, eventData, false);
      // }

      // if ((event && event.type !== 'dragstart') || event == null) {
      //   Collab.UnBlockMessages();
      // }

      T3Util.Log('O.Opt ActivateTextEdit - Output: Text editing activated for object', objectId);
    } else {
      T3Util.Log('O.Opt ActivateTextEdit - Output: Failed to get text object');
    }
  }

  /**
   * Checks if a text hyperlink was clicked
   * @param drawingObject - The drawing object containing the text
   * @param eventPosition - Position of the click event
   * @returns True if a hyperlink was clicked, false otherwise
   */
  static CheckTextHyperlinkHit(drawingObject, eventPosition) {
    T3Util.Log("O.Opt CheckTextHyperlinkHit - Input:", {
      drawingObject: drawingObject.BlockID,
      eventPosition
    });

    // Return false if object has no text data or is locked
    if (drawingObject.DataID === -1 && drawingObject.TableID === -1) {
      T3Util.Log("O.Opt CheckTextHyperlinkHit - Output: false (no text data)");
      return false;
    }

    if (drawingObject.flags & NvConstant.ObjFlags.Lock) {
      T3Util.Log("O.Opt CheckTextHyperlinkHit - Output: false (object locked)");
      return false;
    }

    // Return false if not in default edit mode
    if (OptCMUtil.GetEditMode() !== NvConstant.EditState.Default) {
      T3Util.Log("O.Opt CheckTextHyperlinkHit - Output: false (not in default edit mode)");
      return false;
    }

    // Get SVG element for the object
    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(drawingObject.tag);

    // Find the text element to check
    if (DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false).theActiveTextEditObjectID !== drawingObject.BlockID) {
      // const table = drawingObject.GetTable(false);

      // if (table) {
      //   const cellIndex = T3Gv.opt.Table_GetCellClicked(drawingObject, eventPosition);

      //   if (cellIndex >= 0) {
      //     const cell = table.cells[cellIndex];
      //     if (cell.DataID >= 0 && svgElement) {
      //       svgElement.textElem = svgElement.GetElementById(
      //         OptConstant.SVGElementClass.Text,
      //         cell.DataID
      //       );
      //     }
      //   }
      // }
    }

    // Get the text element
    const textElement = svgElement ? svgElement.textElem : null;

    if (!textElement) {
      T3Util.Log("O.Opt CheckTextHyperlinkHit - Output: false (no text element)");
      return false;
    }

    // Check for hyperlink at the click location
    const hyperlinkUrl = textElement.GetHyperlinkAtLocation(eventPosition);

    if (hyperlinkUrl) {
      // Handle hyperlink click - commented out as it references SDUI
      // SDUI.Commands.MainController.Hyperlinks.FollowHyperlink(hyperlinkUrl);

      T3Util.Log("O.Opt CheckTextHyperlinkHit - Output: true (hyperlink found)");
      return true;
    }

    T3Util.Log("O.Opt CheckTextHyperlinkHit - Output: false (no hyperlink found)");
    return false;
  }

  static NoteIsShowing(noteShapeId, noteTableCell) {
    T3Util.Log('O.Opt NoteIsShowing - Input:', { noteShapeId, noteTableCell });

    let isShowing = false;

    if (T3Gv.opt.curNoteShape === noteShapeId) {
      // if (noteTableCell) {
      //   if (this.curNoteTableCell && this.curNoteTableCell.uniqueid === noteTableCell.uniqueid) {
      //     isShowing = true;
      //   }
      // } else if (this.curNoteTableCell == null) {
      //   isShowing = true;
      // }
    }

    T3Util.Log('O.Opt NoteIsShowing - Output:', isShowing);
    return isShowing;
  }

  /**
   * Creates a text block for a drawing object and associates it with the appropriate text style and formatting
   * @param drawingObject - The drawing object that will contain the text
   * @param textContent - The text content to be added to the block
   * @param outputDimensions - Optional output parameter to receive calculated text dimensions
   * @param unused - Unused parameter (kept for compatibility)
   * @returns The ID of the newly created text block, or -1 if creation failed
   */
  static CreateTextBlock(drawingObject, textContent, outputDimensions?, unused?) {
    // Initialize paragraph style object
    const paragraphStyle = {};

    // Get text default settings from drawing object
    const textDefault = drawingObject.GetTextDefault(paragraphStyle);
    if (!textDefault) {
      return -1;
    }

    // Calculate default text style and create text shape
    const textStyle = TextUtil.CalcDefaultInitialTextStyle(textDefault);
    const textShape = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Text);

    // Configure the text shape
    textShape.SetText(textContent);
    textShape.SetFormat(textStyle);
    textShape.SetParagraphStyle(paragraphStyle);

    // Handle vertical justification for shapes
    if (drawingObject instanceof Instance.Shape.BaseShape) {
      if (drawingObject.vjust === null) {
        const justification = ShapeUtil.TextAlignToJust(drawingObject.TextAlign);
        drawingObject.vjust = justification.vjust;
      }
      textShape.SetVerticalAlignment(drawingObject.vjust);
    }

    // Calculate and output text dimensions if requested
    if (outputDimensions) {
      const textFit = textShape.CalcTextFit(32000);
      outputDimensions.height = textFit.height;
      outputDimensions.width = textFit.width;
    }

    // Get runtime text and selection range
    const runtimeText = textShape.GetRuntimeText();
    const selectionRange = textShape.GetSelectedRange();

    // Create text object and store in block
    const textObject = new TextObject({});
    textObject.runtimeText = runtimeText;
    textObject.selrange = selectionRange;

    // Create block and return its ID
    return T3Gv.stdObj.CreateBlock(StateConstant.StoredObjectType.TextObject, textObject).ID;
  }

  static UpdateFieldDataTooltipPos(e, t) {
    // if (this.FieldedDataTooltipVisible() && (e || t)) {
    //   var a = SDUI.Commands.MainController.Dropdowns.GetDropdown(Resources.Controls.Dropdowns.EditDataValues.Id);
    //   if (a && a.Control) {
    //     var r = a.Control.css('left').replace('px', ''),
    //       i = a.Control.css('top').replace('px', '');
    //     r = parseFloat(r),
    //       i = parseFloat(i),
    //       isNaN(r) ||
    //       isNaN(i) ||
    //       (
    //         r += e,
    //         i += t,
    //         a.Control.css('left', r + 'px'),
    //         a.Control.css('top', i + 'px')
    //       )
    //   }
    // }
  }

  static HandleDataTooltipClose(isCompleteOperation) {
    // T3Util.Log('O.Opt HandleDataTooltipClose - Input:', { isCompleteOperation });

    // this.ClearFieldDataDatePicker();

    // if (this.ActiveDataTT && this.ActiveDataTT.dataChanged) {
    //   this.CompleteOperation(null, isCompleteOperation);
    //   this.ActiveDataTT.dataChanged = false;
    // }

    // T3Util.Log('O.Opt HandleDataTooltipClose - Output: done');
  }

  static ClearFieldDataDatePicker() {
    // T3Util.Log('O.Opt ClearFieldDataDatePicker - Input:');

    // if (this._curDatePickerElem && this._curDatePickerElem.datepicker) {
    //   this._curDatePickerElem.datepicker('hide');
    // }

    // this._curDatePickerElem = null;

    // T3Util.Log('O.Opt ClearFieldDataDatePicker - Output: DatePicker cleared');
  }

  static HandleTextFormatAttributes(textObject, objectIndex) {
    T3Util.Log('O.Opt HandleTextFormatAttributes - Input:', { textObject, objectIndex });

    const TEXT_FACE = TextConstant.TextFace;
    const textData = { hasText: false };

    const textFormat = textObject.GetTextFormat(true, textData);
    if (textData.hasText) {
      T3Gv.opt.selectionState.selectionhastext = true;
    }

    if (objectIndex === 0) {
      // First object sets the initial values
      T3Gv.opt.selectionState.fontid = textFormat.FontId;
      T3Gv.opt.selectionState.fontsize = textFormat.FontSize;
      T3Gv.opt.selectionState.bold = (textFormat.Face & TEXT_FACE.Bold) > 0;
      T3Gv.opt.selectionState.italic = (textFormat.Face & TEXT_FACE.Italic) > 0;
      T3Gv.opt.selectionState.underline = (textFormat.Face & TEXT_FACE.Underline) > 0;
      T3Gv.opt.selectionState.superscript = (textFormat.Face & TEXT_FACE.Superscript) > 0;
      T3Gv.opt.selectionState.subscript = (textFormat.Face & TEXT_FACE.Subscript) > 0;
    } else {
      // Subsequent objects may cause values to be cleared if they differ
      if (T3Gv.opt.selectionState.fontid !== textFormat.FontId) {
        T3Gv.opt.selectionState.fontid = -1;
      }
      if (T3Gv.opt.selectionState.fontsize !== textFormat.FontSize) {
        T3Gv.opt.selectionState.fontsize = -1;
      }
      if (T3Gv.opt.selectionState.bold !== ((textFormat.Face & TEXT_FACE.Bold) > 0)) {
        T3Gv.opt.selectionState.bold = false;
      }
      if (T3Gv.opt.selectionState.italic !== ((textFormat.Face & TEXT_FACE.Italic) > 0)) {
        T3Gv.opt.selectionState.italic = false;
      }
      if (T3Gv.opt.selectionState.underline !== ((textFormat.Face & TEXT_FACE.Underline) > 0)) {
        T3Gv.opt.selectionState.underline = false;
      }
      if (T3Gv.opt.selectionState.superscript !== ((textFormat.Face & TEXT_FACE.Superscript) > 0)) {
        T3Gv.opt.selectionState.superscript = false;
      }
      if (T3Gv.opt.selectionState.subscript !== ((textFormat.Face & TEXT_FACE.Subscript) > 0)) {
        T3Gv.opt.selectionState.subscript = false;
      }
    }

    T3Util.Log('O.Opt HandleTextFormatAttributes - Output: Text format attributes processed');
  }

  /**
   * Returns a handler function for drag start events.
   * This factory logs the provided drag handler and returns a function that handles mouse down events.
   * @param mouseDragHandler - The drag handler object with a method HandleMouseDown.
   * @returns A function to handle the mouse down event.
   */
  static TEDragStartFactory(mouseDragHandler: any) {
    T3Util.Log("O.Opt TEDragStartFactory - Input:", { mouseDragHandler });
    return function (pointerEvent: any) {
      T3Util.Log("O.Opt TEDragStartHandler - Input:", { pointerEvent });
      pointerEvent.preventDefault();
      pointerEvent.stopPropagation();
      pointerEvent.gesture.preventDefault();
      pointerEvent.gesture.stopPropagation();
      // Call the handler's mouse down method.
      mouseDragHandler.HandleMouseDown(pointerEvent);
      T3Util.Log("O.Opt TEDragStartHandler - Output: Mouse down handled");
      return false;
    };
  }

  /**
   * Returns a handler function for click area drag start events.
   * This factory logs the provided click area handler and returns a function that handles mouse down events in the click area.
   * @param clickAreaHandler - The click area handler object with a method HandleMouseDown.
   * @returns A function to handle the mouse down event for the click area.
   */
  static TEClickAreaDragStartFactory(clickAreaHandler: any) {
    T3Util.Log("O.Opt TEClickAreaDragStartFactory - Input:", { clickAreaHandler });
    return function (pointerEvent: any) {
      T3Util.Log("O.Opt TEClickAreaDragStartHandler - Input:", { pointerEvent });
      pointerEvent.preventDefault();
      pointerEvent.stopPropagation();
      pointerEvent.gesture.preventDefault();
      pointerEvent.gesture.stopPropagation();
      // Call the handler's mouse down method.
      clickAreaHandler.HandleMouseDown(pointerEvent);
      T3Util.Log("O.Opt TEClickAreaDragStartHandler - Output: Mouse down handled");
      return false;
    };
  }

  /**
   * Returns a handler function for drag move events.
   * This factory logs the provided move handler and returns a function that handles mouse move events.
   * @param dragMoveHandler - The drag move handler object with a method HandleMouseMove.
   * @returns A function to handle the mouse move event.
   */
  static TEDragFactory(dragMoveHandler: any) {
    T3Util.Log("O.Opt TEDragFactory - Input:", { dragMoveHandler });
    return function (pointerEvent: any) {
      T3Util.Log("O.Opt TEDragHandler - Input:", { pointerEvent });
      pointerEvent.preventDefault();
      pointerEvent.stopPropagation();
      pointerEvent.gesture.preventDefault();
      pointerEvent.gesture.stopPropagation();
      // Call the handler's mouse move method.
      dragMoveHandler.HandleMouseMove(pointerEvent);
      T3Util.Log("O.Opt TEDragHandler - Output: Mouse move handled");
      return false;
    };
  }

  /**
   * Returns a handler function for drag end events.
   * This factory logs the provided end handler and returns a function that handles mouse up events.
   * After the mouse up event is processed, it calls Collab.UnBlockMessages to unblock collaborator messages.
   * @param dragEndHandler - The drag end handler object with a method HandleMouseUp.
   * @returns A function to handle the mouse up event.
   */
  static TEDragEndFactory(dragEndHandler: any) {
    T3Util.Log("O.Opt TEDragEndFactory - Input:", { dragEndHandler });
    return function (pointerEvent: any) {
      T3Util.Log("O.Opt TEDragEndHandler - Input:", { pointerEvent });
      pointerEvent.preventDefault();
      pointerEvent.stopPropagation();
      pointerEvent.gesture.preventDefault();
      pointerEvent.gesture.stopPropagation();
      // Call the handler's mouse up method.
      dragEndHandler.HandleMouseUp(pointerEvent);
      T3Util.Log("O.Opt TEDragEndHandler - Calling Collab.UnBlockMessages()");
      // Collab.UnBlockMessages();
      T3Util.Log("O.Opt TEDragEndHandler - Output: Mouse up handled and messages unblocked");
      return false;
    };
  }

  /**
   * Deletes the text object associated with the target object.
   * If no target is provided, it uses the currently selected target.
   * This function removes the text data from the object and deletes the text data block.
   *
   * @param targetId - The ID of the target object whose text should be deleted, defaults to current target if null
   */
  static DeleteTargetTextObject(targetId) {
    // If no target ID provided, get the currently selected target
    if (targetId == null) {
      targetId = SelectUtil.GetTargetSelect();
    }

    // Only proceed if we have a valid target ID
    if (targetId >= 0) {
      // Get a modifiable reference to the target object
      const targetObject = DataUtil.GetObjectPtr(targetId, true);
      const textDataId = targetObject.DataID;

      // If the object has associated text data
      if (textDataId != -1) {
        // Get the text data block
        const textDataBlock = T3Gv.stdObj.GetObject(textDataId);

        // Remove the association between the object and text data
        targetObject.SetTextObject(-1);

        // Delete the text data block if it exists
        if (textDataBlock) {
          textDataBlock.Delete();
        }
      }
    }
  }
}

export default TextUtil
