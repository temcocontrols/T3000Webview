

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
import ObjectUtil from "../Data/ObjectUtil";
import DSConstant from "../DS/DSConstant";
import ShapeUtil from '../Shape/ShapeUtil';
import DrawUtil from "./DrawUtil";
import OptCMUtil from "./OptCMUtil";
import SelectUtil from "./SelectUtil";
import SvgUtil from "./SvgUtil";
import PolyUtil from './PolyUtil';
import UIUtil from '../UI/UIUtil';
import HookUtil from './HookUtil';
import ToolActUtil from './ToolActUtil';

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
    let session = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
    let operationRequired = false;
    let messageData = { theTEWasResized: false };

    // Clear text entry timer if active
    if (T3Gv.opt.textEntryTimer != null) {
      clearTimeout(T3Gv.opt.textEntryTimer);
      T3Gv.opt.textEntryTimer = null;
      this.RegisterLastTEOp(NvConstant.TextElemLastOpt.Timeout);
    }

    // Process only if there's an active text editing object
    if (session.theActiveTextEditObjectID != -1) {
      session = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, true);

      let selectedRange;
      let isTextEmpty = false;
      let isTextOnlyObject = false;
      let textEditor = T3Gv.opt.svgDoc.GetActiveEdit();
      let runtimeText = null;
      let isNotInTable = session.theActiveTableObjectID < 0;
      let drawingObject = ObjectUtil.GetObjectPtr(session.theActiveTextEditObjectID, true);

      if (drawingObject) {
        drawingObject.TableID < 0 && (isNotInTable = true);

        const textDataId = drawingObject.DataID;

        // Handle resize flags
        if (session.theTEWasResized) {
          messageData.theTEWasResized = true;
          OptCMUtil.SetLinkFlag(
            session.theActiveTextEditObjectID,
            DSConstant.LinkFlags.Move
          );

          if (drawingObject.hooks.length) {
            OptCMUtil.SetLinkFlag(drawingObject.hooks[0].objid, DSConstant.LinkFlags.Move);
          }

          session.theTEWasResized = false;
          session.theTEWasEdited = true;

          if (session.theActiveTableObjectID < 0) {
            ObjectUtil.AddToDirtyList(session.theActiveTextEditObjectID);
          }
        }

        // Special handling for 3D symbols
        if (drawingObject instanceof Instance.Shape.D3Symbol) {
          isNotInTable = false;
        }
      }

      // Handle active editor state
      if (textEditor && (runtimeText = textEditor.GetRuntimeText())) {
        selectedRange = textEditor.GetSelectedRange();

        // Check if text is empty (only whitespace)
        isTextEmpty = textEditor.HasDataFields()
          ? 0 === textEditor.GetTextMinDimensions().width
          : 0 === textEditor.GetTextMinDimensions().width || textEditor.GetText() === ' ';

        // Get formatting style from the editor
        const formatStyle = textEditor.formatter.GetFormatAtOffset(0);

        // Apply style to the drawing object or table
        if (isNotInTable) {
          // Apply style directly to the object
          this.TextStyleToText(drawingObject.StyleRecord.Text, formatStyle.style);
        }

        isTextOnlyObject = !!(drawingObject.flags & NvConstant.ObjFlags.TextOnly);

        // Save text to the data object
        if (textDataId != -1) {
          let textDataObject = ObjectUtil.GetObjectPtr(textDataId, false);
          if (textDataObject) {
            textDataObject.runtimeText = runtimeText;
            textDataObject.selrange = selectedRange;
            textDataObject = ObjectUtil.GetObjectPtr(textDataId, true);

            // Mark the object as dirty if not in a table
            if (session.theActiveTableObjectID < 0) {
              ObjectUtil.AddToDirtyList(session.theActiveTextEditObjectID);
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
          ObjectUtil.DeleteObjects([session.theActiveTextEditObjectID], false);
          drawingObject = null;

          // Remove from selection list
          const selectedList = ObjectUtil.GetObjectPtr(T3Gv.opt.selectObjsBlockId, true);
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

          drawingObject = ObjectUtil.GetObjectPtr(session.theActiveTextEditObjectID, true);
          if (drawingObject) {
            drawingObject.SetTextObject(-1);
          }

          if (textDataBlock) {
            textDataBlock.Delete();
          }

          if (session.theActiveTableObjectID < 0) {
            ObjectUtil.AddToDirtyList(session.theActiveTextEditObjectID);
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

      this.RegisterLastTEOp(NvConstant.TextElemLastOpt.Init);

      // Complete operation if needed and not prevented
      if (operationRequired && !preventCompleteOperation) {
        DrawUtil.CompleteOperation(null);
      } else {
        ObjectUtil.PreserveUndoState(false);
        SvgUtil.RenderDirtySVGObjects();
      }
    }

    T3Util.Log("O.Opt DeactivateTextEdit - Output: Text edit deactivated");
  }

  /**
   * Registers the last text editor operation.
   * This function updates the internal state of the text editor session based on the given operation.
   * It preserves the undo state if necessary, manages collaboration messaging, and
   * controls the typing pause timer for handling text entry events.
   *
   * @param lastOp - The operation code representing the last text editor operation (CHAR, INIT, SELECT, TIMEOUT)
   */
  static RegisterLastTEOp(lastOp) {
    T3Util.Log("O.Opt RegisterLastTEOp - Input:", { lastOp });

    // Only proceed if not in note edit mode
    if (!T3Gv.opt.bInNoteEdit) {
      // Get the current text edit session
      const textEditSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
      const previousOp = textEditSession.theTELastOp;

      // If there's an active text entry timer and the current operation is not a character input,
      // clear the timer and register a timeout operation
      if (T3Gv.opt.textEntryTimer != null &&
        lastOp !== NvConstant.TextElemLastOpt.Char) {
        clearTimeout(T3Gv.opt.textEntryTimer);
        T3Gv.opt.textEntryTimer = null;
        this.RegisterLastTEOp(NvConstant.TextElemLastOpt.Timeout);
      }

      // Update the session with the current operation
      textEditSession.theTELastOp = lastOp;
      if (lastOp !== NvConstant.TextElemLastOpt.Init) {
        textEditSession.theTEWasEdited = true;
      }

      // Determine if we should process this operation based on the operation type and previous operation
      const shouldProcess = (prevOp) => {
        if (lastOp !== NvConstant.TextElemLastOpt.Init) {
          switch (lastOp) {
            case NvConstant.TextElemLastOpt.Char:
              if (prevOp !== lastOp) return true;
              break;
            case NvConstant.TextElemLastOpt.Select:
              return false;
            default:
              return true;
          }
        }
        return false;
      };

      // Process the operation if needed
      if (shouldProcess(previousOp)) {
        const activeEditor = T3Gv.opt.svgDoc.GetActiveEdit();
        let runtimeText = null;
        let selectedRange = null;
        const activeTextObject = ObjectUtil.GetObjectPtr(textEditSession.theActiveTextEditObjectID, false);

        if (activeTextObject && activeTextObject.DataID >= 0 && activeEditor) {
          const textDataId = activeTextObject.DataID;
          runtimeText = activeEditor.GetRuntimeText();
          selectedRange = activeEditor.GetSelectedRange();

          if (runtimeText) {
            // Preserve undo state before modifying objects
            ObjectUtil.PreserveUndoState(false);

            let textObject = ObjectUtil.GetObjectPtr(textDataId, false);
            if (textObject) {
              // Update runtime text and selection range
              textObject.runtimeText = runtimeText;
              textObject.selrange = selectedRange;

              // For non-timeout operations, update text parameters
              if (lastOp !== NvConstant.TextElemLastOpt.Timeout) {
                TextParams.minWidth = activeEditor.formatter.limits.minWidth;
                TextParams.maxWidth = activeEditor.formatter.limits.maxWidth;
                TextParams.minHeight = activeEditor.minHeight;

                // Get updated objects with changes preserved
                const updatedTextObject = ObjectUtil.GetObjectPtr(textEditSession.theActiveTextEditObjectID, true);
                textObject = ObjectUtil.GetObjectPtr(textDataId, true);
              }

              // Handle timeout operations - prepare message data
              if (lastOp === NvConstant.TextElemLastOpt.Timeout) {
                const messageData = {};
                messageData.BlockID = textEditSession.theActiveTextEditObjectID;

                const targetObject = ObjectUtil.GetObjectPtr(messageData.BlockID, false);
                if (targetObject && targetObject instanceof Instance.Shape.Connector) {
                  messageData.DataID = targetObject.DataID;
                }

                messageData.runtimeText = Utils1.DeepCopy(runtimeText);
                messageData.selrange = Utils1.DeepCopy(selectedRange);
                messageData.minWidth = TextParams.minWidth;
                messageData.maxWidth = TextParams.maxWidth;
                messageData.minHeight = TextParams.minHeight;

                // Reset parameter values
                TextParams.minWidth = null;
              }
            }
          }
        }
      }

      // Set up a timer for character input operations
      if (lastOp === NvConstant.TextElemLastOpt.Char) {
        clearTimeout(T3Gv.opt.textEntryTimer);
        T3Gv.opt.textEntryTimer = null;
        T3Gv.opt.textEntryTimer = setTimeout(T3Gv.opt.TextEdit_PauseTyping, 1000);
      }
    }

    T3Util.Log("O.Opt RegisterLastTEOp - Output: Completed");
  }

  /**
   * Updates the SD text object style based on the given text style settings.
   * @param sdText - The SD text object whose style will be updated.
   * @param textStyle - The text style parameters containing font, size, weight, style, baseOffset, decoration, color, and color transparency.
   */
  static TextStyleToText(sdText, textStyle) {
    T3Util.Log("O.Opt TextStyleToText - Input:", { sdText, textStyle });

    // Convert the font size from percentage to points (72 points per inch conversion)
    sdText.FontSize = Math.round(72 * textStyle.size / 100);
    sdText.FontId = -1;

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

    T3Util.Log("O.Opt TextStyleToText - Output:", sdText);
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

    const textEditSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
    const shape = ObjectUtil.GetObjectPtr(shapeId, false);

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

                  // Standard text growth
                  shape.TRectToFrame(minTextRect, false);

                  let widthChange = shape.Frame.width - newFrame.width;
                  if (Utils2.IsEqual(widthChange, 0)) widthChange = 0;

                  let heightChange = shape.Frame.height - newFrame.height;
                  if (Utils2.IsEqual(heightChange, 0)) heightChange = 0;

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
                        T3Gv.opt.header.MaxWorkDim.x,
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

                      let originalRotatedRect = ToolActUtil.RotateRect(
                        originalFrame,
                        rotationCenter,
                        shape.RotationAngle
                      );

                      rotationCenter = {
                        x: newFrame.x + newFrame.width / 2,
                        y: newFrame.y + newFrame.height / 2
                      };

                      let newRotatedRect = ToolActUtil.RotateRect(
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
                      HookUtil.ResizeSetLinkFlag(shapeId, DSConstant.LinkFlags.Move);
                    }
                  }
                }
                break;

              case NvConstant.TextGrowBehavior.Vertical:
              case NvConstant.TextGrowBehavior.ProPortional:
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

    const textEditSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

    if (textEditSession.theActiveTextEditObjectID !== -1) {
      const activeTextObject = ObjectUtil.GetObjectPtr(textEditSession.theActiveTextEditObjectID, false);

      if (!activeTextObject) {
        T3Util.Log("O.Opt: ActiveTextObject not found, aborting");
        return;
      }

      const dataId = activeTextObject.DataID;

      if (dataId !== -1) {
        const textDataObject = ObjectUtil.GetObjectPtr(dataId, false);

        if (textDataObject) {
          let runtimeText = textDataObject.runtimeText;
          const selectionRange = textDataObject.selrange;

          // Use the provided runtime text if available
          if (runtimeTextOverride) {
            runtimeText = runtimeTextOverride;
          }

          // Refresh the rendering if no override was provided
          if (!runtimeTextOverride) {
            ObjectUtil.AddToDirtyList(textEditSession.theActiveTextEditObjectID);
            SvgUtil.RenderDirtySVGObjects();
          }

          // Get and prepare the SVG element
          const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(textEditSession.theActiveTextEditObjectID);

          if (svgElement && svgElement.textElem) {
            this.TextRegisterEvents(svgElement.textElem);

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

  static TextRegisterEvents(textEditorWrapper, activationEvent?, additionalOptions?) {
    T3Util.Log("O.Opt TextRegisterEvents - Input:", { textEditorWrapper, activationEvent, additionalOptions });
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
    T3Util.Log("O.Opt TextRegisterEvents - Output: Registered events");
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
      const targetObject = ObjectUtil.GetObjectPtr(targetId, false);
      if (targetObject && targetObject.AllowTextEdit()) {

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
    const textEditSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

    if (textEditSession.theActiveTextEditObjectID != -1) {
      activeTextEditObjectId = textEditSession.theActiveTextEditObjectID;
    }

    T3Util.Log("O.Opt GetActiveTextEdit - Output:", activeTextEditObjectId);
    return activeTextEditObjectId;
  }

  /**
   * Activates text editing for the specified drawing object.
   * This function handles the setup and initialization of text editing mode for a drawing object,
   * including creating text objects if needed, setting up editor events, and managing collaboration.
   *
   * @param drawingElement - The SVG drawing element to edit text for
   * @param event - The event that triggered text editing (can be null for programmatic activation)
   * @param preventSelectionChange - If true, prevents changing the current selection state
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
    let textEditSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
    const objectsToSelect = [];
    let messageData = {};

    // Check if the object exists and is not locked
    if (!(drawingObject = ObjectUtil.GetObjectPtr(objectId, false)) ||
      !(drawingObject instanceof Instance.Shape.BaseDrawObject) ||
      (drawingObject.flags & NvConstant.ObjFlags.Lock)) {
      T3Util.Log('O.Opt ActivateTextEdit - Output: Object invalid or locked');
      return;
    }

    messageData.BlockID = objectId;

    if (textData == null) {
      // If already editing this object, return
      if (objectId == textEditSession.theActiveTextEditObjectID) {
        return;
      }

      // Close any existing text edit
      if (textEditSession.theActiveTextEditObjectID != -1) {
        T3Gv.opt.CloseEdit();
      }

      // Handle selection state
      const selectedList = ObjectUtil.GetObjectPtr(T3Gv.opt.selectObjsBlockId, false);
      if (selectedList.indexOf(objectId) === -1 || selectedList.length > 1) {
        objectsToSelect.push(objectId);
        SelectUtil.SelectObjects(objectsToSelect, false, true);
        targetSelectionId = selectedList[0];
      } else {
        targetSelectionId = objectId;
      }
    } else {
      messageData = textData.Data;
    }

    // Get a preserved copy of the object
    let preservedObject = ObjectUtil.GetObjectPtr(objectId, true);
    const textObjectId = preservedObject.GetTextObject(event, false, messageData);

    // Continue only if we got a valid text object
    if (textObjectId != null) {
      // Handle collaboration and session management
      if (textData == null) {
        // Local edit - create new preserved session
        textEditSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, true);
      }
      else {
        // External collaboration message - update editor ID
        const tempSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
        tempSession.EditorID = textData.EditorID;

        textEditSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, true);
      }

      // Get the SVG element for the object
      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(objectId);

      // Create a new text object if needed
      if (textObjectId == -1) {
        // Get updated object
        preservedObject = ObjectUtil.GetObjectPtr(objectId, true);

        // Create a new text object
        textObject = new TextObject({});
        textBlock = T3Gv.stdObj.CreateBlock(StateConstant.StoredObjectType.TextObject, textObject);

        if (textBlock === null) {
          T3Util.Log('O.Opt ActivateTextEdit - Output: Failed to create text block');
          return;
        }

        // Set the text object on the drawing object
        if (!preservedObject.SetTextObject(textBlock.ID)) {
          return;
        }

        // Add SVG text object to the drawing
        preservedObject.LMAddSVGTextObject(T3Gv.opt.svgDoc, svgElement);
        textObject = textBlock.Data;
      } else {
        // Use existing text object
        textObject = ObjectUtil.GetObjectPtr(textObjectId, true);

        // Create SVG text element if needed
        if (svgElement.textElem == null) {
          preservedObject.LMAddSVGTextObject(T3Gv.opt.svgDoc, svgElement);
        }
      }

      // Set up active text edit session if not a collab message
      if (textData == null) {
        textEditSession.theActiveTextEditObjectID = objectId;
        textEditSession.theTEWasResized = false;
        textEditSession.theTEWasEdited = false;
      }

      // Handle tables for local editing
      if (textData == null) {
        // Move element to front if not attached
        if (!(drawingObject.TextFlags & NvConstant.TextFlags.AttachA) &&
          !(drawingObject.TextFlags & NvConstant.TextFlags.AttachB)) {
          T3Gv.opt.svgObjectLayer.MoveElementToFront(svgElement);
        }
        // }
      }

      // Register events for local editing
      if (textData == null) {
        if (event && event.gesture) {
          this.TextRegisterEvents(svgElement.textElem, event.gesture.srcEvent, preventSelectionChange);
        } else {
          this.TextRegisterEvents(svgElement.textElem, event);
        }

        // Get selected range from active editor
        const activeEdit = T3Gv.opt.svgDoc.GetActiveEdit();
        selectedRange = activeEdit.GetSelectedRange();
        messageData.theSelectedRange = Utils1.DeepCopy(selectedRange);

        // If no event, select all text
        if (event == null) {
          const textLength = activeEdit.GetText().length;
          messageData.theSelectedRange.start = 0;
          messageData.theSelectedRange.anchor = 0;
          messageData.theSelectedRange.end = textLength;
        }
      } else if (textData && textData.EditorID === SDJS.Collab.EditorID) {
        // Use selected range from collab message data
        selectedRange = textData.Data.theSelectedRange;
      }

      // Get current text content
      const currentText = svgElement.textElem.GetText();

      // Handle empty text
      if (currentText === '') {
        // For new text objects, set up default styling
        if (textObjectId < 0) {
          // Create style parameters
          const paragraphStyle = {};
          const textDefault = preservedObject.GetTextDefault(paragraphStyle);

          // Store text style in message data
          messageData.TextStyle = Utils1.DeepCopy(textDefault);

          // Calculate default initial style
          const initialTextStyle = this.CalcDefaultInitialTextStyle(textDefault);
          messageData.theDefaultStyle = Utils1.DeepCopy(initialTextStyle);

          // Store vertical justification
          const verticalJustification = paragraphStyle.vjust;
          messageData.vjust = verticalJustification;

          // Get active editor and update selection range
          const activeEdit = T3Gv.opt.svgDoc.GetActiveEdit();
          messageData.theSelectedRange = selectedRange;

          // Set temporary space to apply formatting, then clear
          svgElement.textElem.SetText(' ');
          svgElement.textElem.SetFormat(initialTextStyle);
          svgElement.textElem.SetParagraphStyle(paragraphStyle);

          // Set vertical alignment for shapes
          if (preservedObject instanceof Instance.Shape.BaseShape) {
            svgElement.textElem.SetVerticalAlignment(verticalJustification);
          }

          // Clear text and save runtime state
          svgElement.textElem.SetText('');
          textObject.runtimeText = svgElement.textElem.GetRuntimeText();
        }

        // Remove "click here" flag
        preservedObject.TextFlags = Utils2.SetFlag(
          preservedObject.TextFlags,
          NvConstant.TextFlags.Clickhere,
          false
        );
      } else {
        // Replace standard text if needed
        const isLocalEdit = (textData == null );
        const isSelfCollabMessage = (textData != null);
      }

      // Update selection range in text object
      if (selectedRange) {
        textObject.selrange = selectedRange;
      }

      // Finalize local editing UI setup
      if (textData == null) {
        svgElement.SetCursor(CursorConstant.CursorType.Text);

        if (targetSelectionId) {
          SvgUtil.ShowSVGSelectionState(targetSelectionId, false);
        }

        this.RegisterLastTEOp(NvConstant.TextElemLastOpt.Init);
      }

      // Preserve undo state and send collaboration messages
      ObjectUtil.PreserveUndoState(false);
    }

    T3Util.Log('O.Opt ActivateTextEdit - Output: Text editing activated for object', objectId);
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

    // Get the text element
    const textElement = svgElement ? svgElement.textElem : null;

    if (!textElement) {
      T3Util.Log("O.Opt CheckTextHyperlinkHit - Output: false (no text element)");
      return false;
    }

    // Check for hyperlink at the click location
    const hyperlinkUrl = textElement.GetHyperlinkAtLocation(eventPosition);

    if (hyperlinkUrl) {
      return true;
    }

    T3Util.Log("O.Opt CheckTextHyperlinkHit - Output: false (no hyperlink found)");
    return false;
  }

  static NoteIsShowing(noteShapeId, noteTableCell) {
    T3Util.Log('O.Opt NoteIsShowing - Input:', { noteShapeId, noteTableCell });

    let isShowing = false;

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

  static UpdateFieldDataTooltipPos(e, t) { }

  static HandleDataTooltipClose(isCompleteOperation) { }

  static ClearFieldDataDatePicker() { }

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
      const targetObject = ObjectUtil.GetObjectPtr(targetId, true);
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

  /**
   * Automatically scrolls the document view to keep the text cursor visible during text editing.
   * This function finds the current cursor position and adjusts the document scroll position
   * to ensure the cursor remains in view.
   *
   * @param objectId - The ID of the text object being edited
   */
  static TextAutoScroll(objectId) {
    // Check if there's an active text edit session
    const textEditSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

    if (textEditSession.theActiveTextEditObjectID !== -1) {
      // Get the SVG element for the object
      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(objectId);

      if (svgElement && svgElement.textElem) {
        // Get the current cursor position
        const cursorPosition = svgElement.textElem.GetInputCursorPos();

        if (cursorPosition) {
          // Convert window coordinates to document coordinates
          const documentCoords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
            cursorPosition.x2,
            cursorPosition.y2
          );

          // Scroll to make the cursor position visible
          T3Gv.docUtil.ScrollToPosition(documentCoords.x, documentCoords.y);
        }
      }
    }
  }

  /**
   * Ensures that a text frame stays within the boundaries of the document.
   * This function checks if the given frame extends beyond document boundaries and
   * adjusts its position to keep it within bounds, while respecting minimum height requirements.
   *
   * @param frame - The rectangle frame to check and adjust
   * @param minimumHeight - The minimum height the frame must maintain
   * @returns True if the frame was successfully pinned within bounds, throws an error if impossible
   */
  static TextPinFrame(frame, minimumHeight) {
    const edgeSlop = OptConstant.Common.EdgeSlop;

    // Ensure the frame doesn't go beyond the left or top edge
    if (frame.x < edgeSlop) {
      frame.x = edgeSlop;
    }

    if (frame.y < edgeSlop) {
      frame.y = edgeSlop;
    }

    // Only check right/bottom boundaries if NoAuto flag is set
    if (T3Gv.opt.header.flags & OptConstant.HeaderFlags.NoAuto) {
      const documentData = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

      // Check if frame extends beyond right edge
      let overflow = frame.x + frame.width - documentData.dim.x + edgeSlop;
      if (overflow > 0 && frame.x >= overflow) {
        frame.x -= overflow;
      }

      // Check if frame extends beyond bottom edge
      overflow = frame.y + frame.height - documentData.dim.y + edgeSlop;
      if (overflow > 0) {
        // If we can't move the frame up due to minimum height constraints, throw an error
        if (!(frame.y - minimumHeight >= overflow)) {
          T3Util.Log("O.Opt TextPinFrame - Error: Frame cannot be pinned within bounds");
        }

        // Move the frame up to stay in bounds
        frame.y -= overflow;
      }
    }

    return true;
  }

  /**
   * Checks if the document page needs to be resized to accommodate text that extends beyond the current boundaries.
   * This function automatically expands the document dimensions when text content extends beyond the current page,
   * but only if the NoAuto flag is not set in the document header.
   *
   * @param drawingObject - The drawing object containing the text
   * @param newWidth - The new width that may extend beyond current page boundaries
   * @param newHeight - The new height that may extend beyond current page boundaries
   */
  static TextResizeNeedPageResize(drawingObject, newWidth, newHeight) {
    // Only resize if auto-resize is allowed (NoAuto flag is not set)
    if (!(T3Gv.opt.header.flags & OptConstant.HeaderFlags.NoAuto)) {
      let newDimensions;
      let documentData = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

      // Check if the width extends beyond current document width
      if (newWidth > documentData.dim.x) {
        // Calculate new document dimensions by adding a page width
        documentData = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, true);
        newDimensions = {
          x: documentData.dim.x + T3Gv.opt.header.Page.papersize.x -
            (T3Gv.opt.header.Page.margins.left + T3Gv.opt.header.Page.margins.right),
          y: documentData.dim.y
        };

        // Update edge layers and document dimensions
        T3Gv.opt.UpdateEdgeLayers([], documentData.dim, newDimensions);
        documentData.dim.x += T3Gv.opt.header.Page.papersize.x -
          (T3Gv.opt.header.Page.margins.left + T3Gv.opt.header.Page.margins.right);
        UIUtil.ResizeSVGDocument();
      }

      // Check if the height extends beyond current document height
      if (newHeight > documentData.dim.y) {
        // Calculate new document dimensions by adding a page height
        documentData = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, true);
        newDimensions = {
          x: documentData.dim.x,
          y: documentData.dim.y + T3Gv.opt.header.Page.papersize.y -
            (T3Gv.opt.header.Page.margins.top + T3Gv.opt.header.Page.margins.bottom)
        };

        // Update edge layers and document dimensions
        T3Gv.opt.UpdateEdgeLayers([], documentData.dim, newDimensions);
        documentData.dim.y += T3Gv.opt.header.Page.papersize.y -
          (T3Gv.opt.header.Page.margins.top + T3Gv.opt.header.Page.margins.bottom);
        UIUtil.ResizeSVGDocument();
      }
    }
  }

  /**
   * Initializes an empty text element with default formatting.
   * This function sets up text formatting for a newly created empty text object by:
   * 1. Getting the default text style from the drawing object
   * 2. Calculating the initial style parameters
   * 3. Setting and then clearing a space character to apply formatting
   *
   * @param drawingObject - The drawing object that will contain the text
   * @param svgElement - The SVG element representing the drawing object
   */
  static InitEmptyText(drawingObject, svgElement) {
    // Get default text parameters from the drawing object
    const paragraphStyle = {};
    const textDefault = drawingObject.GetTextDefault(paragraphStyle);
    const initialTextStyle = this.CalcDefaultInitialTextStyle(textDefault);
    const verticalAlignment = paragraphStyle.vjust;

    // Set a space character to apply formatting
    svgElement.textElem.SetText(" ");
    svgElement.textElem.SetFormat(initialTextStyle);
    svgElement.textElem.SetParagraphStyle(paragraphStyle);

    // Set vertical alignment for shapes
    if (drawingObject instanceof Instance.Shape.BaseShape) {
      svgElement.textElem.SetVerticalAlignment(verticalAlignment);
    }

    // Clear the text to leave an empty but formatted text field
    svgElement.textElem.SetText("");
  }
}

export default TextUtil
