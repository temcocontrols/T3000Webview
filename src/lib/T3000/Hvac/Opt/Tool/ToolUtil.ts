

import T3Gv from "../../Data/T3Gv"
import Utils1 from "../../Util/Utils1"
import Utils2 from "../../Util/Utils2"
import Utils3 from "../../Util/Utils3"
import Line from "../../Shape/S.Line"
import Rect from "../../Shape/S.Rect"
import $ from "jquery"
import Polygon from "../../Shape/S.Polygon"
import RRect from "../../Shape/S.RRect"
import Oval from "../../Shape/S.Oval"
import Clipboard from "../Clipboard/Clipboard"
import NvConstant from "../../Data/Constant/NvConstant"
import PolySeg from "../../Model/PolySeg"
import SVGFragmentSymbol from "../../Shape/S.SVGFragmentSymbol"
import QuickStyle from "../../Model/QuickStyle"
import Instance from "../../Data/Instance/Instance"
import PolyList from "../../Model/PolyList"
import ToolConstant from "../Tool/ToolConstant"
import DataOpt from "../Data/DataOpt"
import T3Constant from "../../Data/Constant/T3Constant"
import PolygonConstant from "../Polygon/PolygonConstant"
import OptConstant from "../../Data/Constant/OptConstant"
import T3Util from "../../Util/T3Util"
import TextConstant from "../../Data/Constant/TextConstant"
import DataUtil from "../Data/DataUtil"
import SelectUtil from "../Opt/SelectUtil"
import SvgUtil from "../Opt/SvgUtil"
import TextUtil from "../Opt/TextUtil"
import OptCMUtil from "../Opt/OptCMUtil"
import DrawUtil from "../Opt/DrawUtil"
import ToolActUtil from "../Opt/ToolActUtil"
import LMEvtUtil from "../Opt/LMEvtUtil"

class ToolUtil {

  /**
     * Sets the current selection tool and manages related states
     * @param toolType - The type of selection tool to set
     * @param isSticky - Whether the tool should be sticky
     */
  SetSelectionTool(toolType, isSticky) {
    T3Util.Log('O.ActiveSelection.SetSelectionTool - Input:', { toolType, isSticky });

    // Initial render of all SVG selection states
    SvgUtil.RenderAllSVGSelectionStates();

    // // Check if we're currently using the wall tool
    // const isCurrentlyWallTool = T3Constant.DocContext.SelectionTool === ToolConstant.Tools.Wall;

    // // Update context with new tool settings
    // T3Constant.DocContext.SelectionTool = toolType;
    // T3Constant.DocContext.SelectionToolSticky = isSticky;
    // T3Constant.DocContext.SelectionToolMultiple = false;

    // // Additional handling for wall tool transitions
    // if (toolType !== ToolConstant.Tools.Wall) {
    //   T3Constant.DocContext.UsingWallTool = false;

    //   // If we were previously using the wall tool, re-render all states
    //   if (isCurrentlyWallTool) {
    //     T3Gv.opt.RenderAllSVGSelectionStates();
    //   }
    // }

    // T3Util.Log('O.ActiveSelection.SetSelectionTool - Output:', {
    //   updatedTool: T3Constant.DocContext.SelectionTool,
    //   isSticky: T3Constant.DocContext.SelectionToolSticky,
    //   usingWallTool: T3Constant.DocContext.UsingWallTool
    // });
  }

  /**
     * Cancels the current modal operation
     * @param skipMessageHandling - If true, skips handling of collaboration messages
     * @returns false to indicate operation was cancelled
     */
  CancelOperation(skipMessageHandling?) {
    T3Util.Log("O.ToolOpt CancelOperation input:", skipMessageHandling);

    this.SetSelectionTool(ToolConstant.Tools.Select, false);
    OptCMUtil.CancelOperation();

    if (!skipMessageHandling) {
      // Collab.UnLockMessages();
      // Collab.UnBlockMessages();
    }

    T3Util.Log("O.ToolOpt CancelOperation output: false");
    return false;
  }

  /**
   * Sets the default wall thickness for the document
   * @param thickness - The wall thickness value
   * @param wallObj - Optional wall object containing thickness data
   * @returns void
   */
  SetDefaultWallThickness(thickness, wallObj) {
    T3Util.Log("O.ToolOpt SetDefaultWallThickness input:", thickness, wallObj);

    var conversionFactor = 1;
    if (!T3Gv.docUtil.rulerConfig.useInches) {
      conversionFactor = OptConstant.Common.MetricConv;
    }

    if (wallObj) {
      thickness = wallObj.Data.thick;
    }

    var wallThickness = thickness * T3Gv.docUtil.rulerConfig.major /
      (T3Gv.docUtil.rulerConfig.majorScale * conversionFactor);

    var sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    if (!Utils2.IsEqual(sessionBlock.def.wallThickness, wallThickness, 0.01) || wallObj) {
      T3Gv.opt.CloseEdit(true, true);
      sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, true);

      if (!wallObj) {
        sessionBlock.def.wallThickness = wallThickness;
      }

      var sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
      DrawUtil.CompleteOperation(null);
    }

    T3Util.Log("O.ToolOpt SetDefaultWallThickness output: void");
  }

  /**
     * Creates a new wall shape in the drawing
     * @param event - The drawing event
     * @param target - Target position or context
     * @returns The created wall object if isTargetValid is true
     */
  DrawNewWallShape(event, target) {
    T3Util.Log("O.ToolOpt DrawNewWallShape input:", event, target);

    var wallObject;
    var isTargetValid = target != null;
    var wallOpt = T3Gv.wallOpt;

    if (wallOpt && wallOpt.AddWall) {
      T3Gv.opt.CloseEdit();
      wallOpt.ToggleAddingWalls(true);
      wallObject = wallOpt.AddWall(isTargetValid, target);
    }

    if (isTargetValid) {
      T3Util.Log("O.ToolOpt DrawNewWallShape output:", wallObject);
      return wallObject;
    }
    T3Util.Log("O.ToolOpt DrawNewWallShape output: undefined");
  }

  /**
   * Handles initiating the process of stamping or drag-dropping a new shape
   * @param event - The UI event that triggered this action
   * @param shapeType - The type of shape to create
   */
  StampOrDragDropNewShape(event, shapeType) {
    T3Util.Log('U.ToolUtil.StampOrDragDropNewShape - Input:', event, shapeType);

    let context;
    let callbackFunction;

    // T3Gv.opt.SetUIAdaptation(event);

    // Initialize cancel flag
    let cancelOperation = false;

    // Prepare for drag-drop or stamp operation
    DrawUtil.PreDragDropOrStamp();

    // Set up the context and callback
    context = this;
    callbackFunction = this.StampOrDragDropCallback;

    // Set a timeout to execute the callback after a short delay
    T3Gv.opt.stampTimeout = window.setTimeout(callbackFunction, 200, context, shapeType);

    T3Util.Log('U.ToolUtil.StampOrDragDropNewShape - Output: stampTimeout set');
  }

  /**
    * Creates and draws a new line shape based on the specified type
    * @param lineType - The type of line to draw
    * @param targetPosition - The target position or context
    * @param eventObject - The event object for drawing
    * @param referenceObject - Reference object for line properties
    * @returns The created line shape object if in drawing mode
    */
  DrawNewLineShape(lineType, targetPosition, eventObject, referenceObject?) {
    T3Util.Log("O.ToolOpt DrawNewLineShape input:", lineType, targetPosition, eventObject, referenceObject);

    let isDrawing = false;
    let newShape = null;

    // Force line type to 'line'
    lineType = "line";

    switch (lineType) {
      case 'line':
        newShape = this.DrawNewLine(eventObject, 0, isDrawing, referenceObject);
        break;
      case 'commline':
        newShape = this.DrawNewLine(eventObject, 1, isDrawing, referenceObject);
        break;
      case 'digiline':
        newShape = this.DrawNewLine(eventObject, 2, isDrawing, referenceObject);
        break;
      case 'arcLine':
        newShape = this.DrawNewArcLine(isDrawing, eventObject, referenceObject);
        break;
      case 'segLine':
        newShape = this.DrawNewSegLine(isDrawing, eventObject, referenceObject);
        break;
      case 'arcSegLine':
        newShape = this.DrawNewArcSegLine(isDrawing, eventObject, referenceObject);
        break;
      case 'polyLine':
        newShape = this.DrawNewPolyLine(isDrawing, eventObject, referenceObject);
        break;
      case 'polyLineContainer':
        newShape = this.DrawNewPolyLineContainer(isDrawing, eventObject, referenceObject);
        break;
      case 'freehandLine':
        newShape = this.DrawNewFreehandLine(isDrawing, eventObject, referenceObject);
        break;
      case 'moveWall':
        if (T3Gv.wallOpt && T3Gv.wallOpt.AddWall) {
          newShape = T3Gv.wallOpt.AddWall(isDrawing, referenceObject);
        } else {
          newShape = this.DrawNewLine(eventObject, 0, isDrawing, referenceObject);
        }
        break;
    }

    T3Util.Log("O.ToolOpt DrawNewLineShape output:", newShape);

    if (isDrawing) {
      return newShape;
    }
  }

  /**
   * Creates and draws a new line based on specified parameters
   * @param event - The drawing event
   * @param lineType - The type of line to create (regular, communication, digital)
   * @param isDrawing - Whether in drawing mode
   * @param referenceObject - Optional reference object to copy properties from
   * @returns The created line object if in drawing mode
   */
  DrawNewLine(event, lineType, isDrawing, referenceObject) {
    T3Util.Log("O.ToolOpt DrawNewLine input:", event, lineType, isDrawing, referenceObject);

    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;
    const isVerticalText = 0 == (sessionData.def.textflags & NvConstant.TextFlags.HorizText);
    let startArrowID = sessionData.d_sarrow;
    let endArrowID = sessionData.d_earrow;
    let startArrowDisplay = sessionData.d_sarrowdisp;
    let endArrowDisplay = sessionData.d_earrowdisp;
    let shapeParameter = 0;

    // Set shape parameter based on line type
    switch (lineType) {
      case OptConstant.LineTypes.LsComm:
      case OptConstant.LineTypes.LsDigi:
        shapeParameter = 0.25;
        break;
    }

    // Make arrow settings consistent
    if ((startArrowID > 0) != (endArrowID > 0)) {
      if (endArrowID === 0) {
        endArrowID = startArrowID;
        endArrowDisplay = startArrowDisplay;
      }
      startArrowID = 0;
      startArrowDisplay = false;
    }

    // Create line attributes
    let lineAttributes;
    if (referenceObject) {
      lineAttributes = Utils1.DeepCopy(referenceObject.Data.attributes);
    } else {
      lineAttributes = {
        Frame: {
          x: 0,
          y: 0,
          width: 1,
          height: 1
        },
        StartPoint: {
          x: 0,
          y: 0
        },
        EndPoint: {
          x: 0,
          y: 0
        },
        StartArrowID: startArrowID,
        StartArrowDisp: startArrowDisplay,
        EndArrowID: endArrowID,
        EndArrowDisp: endArrowDisplay,
        ArrowSizeIndex: sessionData.d_arrowsize,
        TextGrow: NvConstant.TextGrowBehavior.Horizontal,
        TextAlign: T3Constant.DocContext.CurrentTextAlignment,
        TextDirection: isVerticalText,
        Dimensions: sessionData.dimensions,
        ShortRef: lineType,
        shapeparam: shapeParameter,
        bOverrideDefaultStyleOnDraw: true
      };
    }

    // Create the line shape
    const lineShape = new Line(lineAttributes);
    let lineStyle = Utils1.DeepCopy(sessionData.def.style);

    // Set style from reference object or defaults
    if (referenceObject && referenceObject.Data &&
      referenceObject.Data.attributes && referenceObject.Data.attributes.StyleRecord) {
      lineStyle = Utils1.DeepCopy(referenceObject.Data.attributes.StyleRecord);
    } else {
      const textBlockStyle = Utils3.FindStyle(OptConstant.Common.TextBlockStyle);
      lineStyle.Text.Paint.Color = '#000000';
    }

    lineShape.StyleRecord = lineStyle;

    // Set line hopping if allowed
    if (sessionData.flags & OptConstant.SessionFlags.AllowHops) {
      lineShape.flags = Utils2.SetFlag(lineShape.flags, NvConstant.ObjFlags.LineHop, true);
    }

    // Return shape if in drawing mode, otherwise draw it
    if (isDrawing) {
      T3Util.Log("O.ToolOpt DrawNewLine output:", lineShape);
      return lineShape;
    }

    DrawUtil.DrawNewObject(lineShape, event);
    T3Util.Log("O.ToolOpt DrawNewLine output: void");
  }

  /**
   * Callback function that processes shape stamping or drag-drop operations
   * @param context - The context object (typically 'this' reference)
   * @param shapeType - The type of shape to stamp or drag-drop
   * @returns void
   */
  StampOrDragDropCallback(context: ToolUtil, shapeType) {
    T3Util.Log("O.ToolOpt StampOrDragDropCallback input:", context, shapeType);

    var result;
    var shapeTypes = PolygonConstant.ShapeTypes;

    T3Gv.opt.stampTimeout = null;

    if (shapeType !== 'textLabel') {
      // NvConstant.DocumentContext.ShapeTool = shapeType;
    }

    var isDragDropMode = false;

    if (isDragDropMode) {
      result = false;
      T3Gv.opt.UnbindDragDropOrStamp();
    } else {
      result = true;
    }

    switch (shapeType) {
      case 'textLabel':
        context.StampTextLabel(false, false);
        break;
      case shapeTypes.RECTANGLE:
        context.StampRectangle(result, false);
        break;
      case shapeTypes.ROUNDED_RECTANGLE:
        context.StampRoundRect(result, false);
        break;
      case shapeTypes.CIRCLE:
        context.StampCircle(result, true);
        break;
      case shapeTypes.OVAL:
        context.StampCircle(result, false);
        break;
      default:
        context.StampShape(shapeType, result, false);
    }

    T3Util.Log("O.ToolOpt StampOrDragDropCallback output: void");
  }

  /**
   * Creates and stamps a rectangle shape onto the drawing
   * @param isDragDropMode - Whether to use drag-drop mode or mouse stamp mode
   * @param isSquare - Whether to create a square (true) or rectangle (false)
   * @returns void
   */
  StampRectangle(isDragDropMode, isSquare) {
    T3Util.Log("O.ToolOpt StampRectangle input:", isDragDropMode, isSquare);

    let width, height;
    const sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    // Set dimensions based on whether we want a square or rectangle
    if (isSquare) {
      width = OptConstant.Common.ShapeSquare;
      height = OptConstant.Common.ShapeSquare;
    } else {
      width = OptConstant.Common.ShapeWidth;
      height = OptConstant.Common.ShapeHeight;
    }

    // Create shape attributes
    const shapeAttributes = {
      Frame: {
        x: -1000,
        y: -1000,
        width: width,
        height: height
      },
      TextGrow: NvConstant.TextGrowBehavior.ProPortional,
      shapeparam: sessionBlock.def.rrectparam,
      moreflags: OptConstant.ObjMoreFlags.FixedRR,
      ObjGrow: OptConstant.GrowBehavior.All
    };

    // Add proportional growth behavior if it's a square
    if (isSquare) {
      shapeAttributes.ObjGrow = OptConstant.GrowBehavior.ProPortional;
    }

    // Create the rectangle shape
    const rectangleShape = new Rect(shapeAttributes);

    // Use mouse stamp method to place the shape
    DrawUtil.MouseStampNewShape(rectangleShape, true, true, true, null, null);

    T3Util.Log("O.ToolOpt StampRectangle output: void");
  }

  /**
   * Creates and stamps a round rectangle shape onto the drawing
   * @param isDragDropMode - Whether to use drag-drop mode or mouse stamp mode
   * @param isSquare - Whether to create a square (true) or rectangle (false)
   * @returns void
   */
  StampRoundRect(isDragDropMode, isSquare) {
    T3Util.Log("O.ToolOpt StampRoundRect input:", isDragDropMode, isSquare);

    let width, height;
    const sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    // Set dimensions based on whether we want a square or rectangle
    if (isSquare) {
      width = OptConstant.Common.ShapeSquare;
      height = OptConstant.Common.ShapeSquare;
    } else {
      width = OptConstant.Common.ShapeWidth;
      height = OptConstant.Common.ShapeHeight;
    }

    // Create shape attributes
    const shapeAttributes = {
      Frame: {
        x: -1000,
        y: -1000,
        width: width,
        height: height
      },
      TextGrow: NvConstant.TextGrowBehavior.ProPortional,
      shapeparam: sessionBlock.def.rrectparam,
      moreflags: OptConstant.ObjMoreFlags.FixedRR,
      ObjGrow: OptConstant.GrowBehavior.All
    };

    // Add proportional growth behavior if it's a square
    if (isSquare) {
      shapeAttributes.ObjGrow = OptConstant.GrowBehavior.ProPortional;
    }

    // Create the rounded rectangle shape
    const roundRectShape = new RRect(shapeAttributes);

    // Use mouse stamp method to place the shape
    DrawUtil.MouseStampNewShape(roundRectShape, true, true, true, null, null);

    T3Util.Log("O.ToolOpt StampRoundRect output: void");
  }

  /**
   * Creates and stamps a circle or oval shape onto the drawing
   * @param isDragDropMode - Whether to use drag-drop mode or mouse stamp mode
   * @param isCircle - Whether to create a circle (true) or oval (false)
   * @returns void
   */
  StampCircle(isDragDropMode, isCircle) {
    T3Util.Log("O.ToolOpt StampCircle input:", isDragDropMode, isCircle);

    let width, height;

    // Set dimensions based on whether we want a circle or oval
    if (isCircle) {
      width = OptConstant.Common.ShapeSquare;
      height = OptConstant.Common.ShapeSquare;
    } else {
      width = OptConstant.Common.ShapeWidth;
      height = OptConstant.Common.ShapeHeight;
    }

    // Initial position off-screen
    const initialX = -1000;
    const initialY = -1000;
    let shapeAttributes = null;

    // Configure shape attributes
    if (isCircle) {
      shapeAttributes = {
        Frame: {
          x: initialX,
          y: initialY,
          width: 100,
          height: 100
        },
        TextGrow: NvConstant.TextGrowBehavior.ProPortional,
        ObjGrow: OptConstant.GrowBehavior.ProPortional
      };
    } else {
      shapeAttributes = {
        Frame: {
          x: initialX,
          y: initialY,
          width: width,
          height: height
        },
        TextGrow: NvConstant.TextGrowBehavior.ProPortional
      };
    }

    // Create the oval shape
    const ovalShape = new Oval(shapeAttributes);

    // Use mouse stamp method to place the shape
    DrawUtil.MouseStampNewShape(ovalShape, true, true, true, null, null);

    T3Util.Log("O.ToolOpt StampCircle output: void");
  }

  /**
   * Creates and stamps a text label shape onto the drawing
   * @param isDragDropMode - Whether to use drag-drop mode
   * @param skipTargetCheck - Whether to skip target selection check
   * @returns void
   */
  StampTextLabel(isDragDropMode, skipTargetCheck) {
    T3Util.Log("O.ToolOpt StampTextLabel input:", isDragDropMode, skipTargetCheck);

    // Get the text edit session block
    var textEditSession = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

    // Check if we need to handle existing active text editing
    if (skipTargetCheck || textEditSession.theActiveTextEditObjectID == -1) {
      // If not skipping target check, try to activate text edit on selected object
      if (!skipTargetCheck) {
        var targetID = SelectUtil.GetTargetSelect();
        if (targetID >= 0) {
          var targetObject = DataUtil.GetObjectPtr(targetID, false);
          if (targetObject && targetObject.AllowTextEdit()) {
            var svgElement = T3Gv.opt.svgObjectLayer.GetElementById(targetID);
            TextUtil.ActivateTextEdit(svgElement);
            T3Util.Log("O.ToolOpt StampTextLabel output: void - activated edit on existing text");
            return;
          }
        }
      }
    } else {
      TextUtil.DeactivateTextEdit();
    }

    // Get session data and default text style
    var sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;
    var defaultTextStyle = Utils3.FindStyle(OptConstant.Common.TextBlockStyle);

    if (defaultTextStyle == null) {
      defaultTextStyle = sessionData.def.style;
    }

    // Create text shape attributes
    var textAttributes = {
      StyleRecord: $.extend(true, {}, defaultTextStyle),
      Frame: {
        x: 0,
        y: 0,
        width: 100,
        height: 100
      },
      TMargins: {
        top: 0,
        left: 0,
        bottom: 0,
        right: 0
      },
      TextGrow: NvConstant.TextGrowBehavior.Horizontal,
      TextAlign: TextConstant.TextAlign.Left,
      flags: NvConstant.ObjFlags.TextOnly
    };

    // Ensure Line style exists and set thickness to 0 (no border)
    if (textAttributes.StyleRecord.Line == null) {
      textAttributes.StyleRecord.Line = Utils1.DeepCopy(defaultTextStyle.Border);
    }
    textAttributes.StyleRecord.Line.Thickness = 0;

    // Create the text rectangle shape
    var textShape = new Rect(textAttributes);
    var textStyle = Utils1.DeepCopy(sessionData.def.style);
    textStyle.Text.Paint = Utils1.DeepCopy(defaultTextStyle.Text.Paint);
    textShape.StyleRecord.Text = textStyle.Text;

    // Calculate text metrics for proper sizing
    var initialTextStyle = TextUtil.CalcDefaultInitialTextStyle(textShape.StyleRecord.Text);
    var textMetrics = T3Gv.opt.svgDoc.CalcStyleMetrics(initialTextStyle);

    // Set shape offset and height
    T3Gv.opt.stampShapeOffsetX = 0;
    T3Gv.opt.stampShapeOffsetY = textMetrics.ascent;
    textShape.Frame.height = textMetrics.height;

    // Deactivate text edit if not in drag-drop mode
    if (!isDragDropMode) {
      TextUtil.DeactivateTextEdit(false);
    }

    // Stamp the text shape and activate text editing
    DrawUtil.StampNewTextShapeOnTap(
      textShape,
      false,
      false,
      false,
      isDragDropMode,
      this.StampCallback,
      { bActivateText: true }
    );

    T3Util.Log("O.ToolOpt StampTextLabel output: void");
  }

  StampCallback(e, t) {
    if (t.bActivateText) {
      var a = T3Gv.opt.svgObjectLayer.GetElementById(e);
      TextUtil.ActivateTextEdit(a)
    }
  }

  StampTextLabelV0(e, t) {
    SDUI.Commands.MainController.Selection.SetSelectionTool(SDUI.Resources.Tools.Tool_Text, e);
    var a = gListManager.GetObjectPtr(gListManager.theTEDSessionBlockID, !1);
    if (t || -1 == a.theActiveTextEditObjectID) {
      if (!t) {
        var r = gListManager.GetTargetSelect();
        if (r >= 0) {
          var i = gListManager.GetObjectPtr(r, !1);
          if (i && i.AllowTextEdit()) {
            var n = gListManager.svgObjectLayer.GetElementById(r);
            return gListManager.ActivateTextEdit(n),
              void gListManager.UpdateTools()
          }
        }
      }
    } else
      gListManager.DeactivateTextEdit();
    var o = objectStore.GetObject(gListManager.theSEDSessionBlockID).Data
      , s = SDUI.Resources.FindStyle(SDJS.ListManager.Defines.TextBlockStyle);
    null == s && (s = o.def.style);
    var l = {
      StyleRecord: $.extend(!0, {}, s),
      Frame: {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      },
      TMargins: {
        top: 0,
        left: 0,
        bottom: 0,
        right: 0
      },
      TextGrow: SDJS.ListManager.TextGrowBehavior.HORIZONTAL,
      TextAlign: SDJS.ListManager.TextAlign.LEFT,
      flags: SDJS.ListManager.ObjFlags.SEDO_TextOnly
    };
    null == l.StyleRecord.Line && (l.StyleRecord.Line = SDJS.Editor.DeepCopy(s.Border)),
      l.StyleRecord.Line.Thickness = 0;
    var S = new SDJS.ListManager.Rect(l)
      , c = SDJS.Editor.DeepCopy(o.def.style);
    c.Text.Paint = SDJS.Editor.DeepCopy(s.Text.Paint),
      S.StyleRecord.Text = c.Text;
    var u = gListManager.CalcDefaultInitialTextStyle(S.StyleRecord.Text)
      , p = gListManager.svgDoc.CalcStyleMetrics(u);
    gListManager.stampShapeOffsetX = 0,
      gListManager.stampShapeOffsetY = p.ascent,
      S.Frame.height = p.height,
      e || gListManager.DeactivateTextEdit(!1),
      gListManager.StampNewTextShapeOnTap(S, !1, !1, !1, e, this.StampCallback, {
        bActivateText: !0
      })
  }

  /**
   * Creates and stamps a shape based on the specified shape type
   * @param shapeType - The type of shape to stamp
   * @param isDragMode - Whether the shape is being dragged (vs. placed directly)
   * @returns void
   */
  StampShape(shapeType, isDragMode) {
    T3Util.Log("U.ToolUtil.StampShape - Input:", shapeType, isDragMode);

    let newShape;
    const shapeTypes = PolygonConstant.ShapeTypes;
    const defaultFrame = {
      x: -1000,
      y: -1000,
      width: OptConstant.Common.ShapeWidth,
      height: OptConstant.Common.ShapeHeight
    };

    // Get shape parameters for the specified shape type
    const shapeParams = T3Gv.opt.GetShapeParams(shapeType, defaultFrame);

    // Configure shape attributes
    const shapeAttributes = {
      Frame: defaultFrame,
      TextGrow: NvConstant.TextGrowBehavior.ProPortional,
      dataclass: shapeParams.dataclass,
      shapeparam: shapeParams.shapeparam
    };

    // If it's a square shape, set proportional grow behavior
    if (shapeParams.bIsSquare) {
      shapeAttributes.ObjGrow = OptConstant.GrowBehavior.ProPortional;
    }

    // Create the appropriate shape object based on dataclass
    switch (shapeParams.dataclass) {
      case shapeTypes.RECTANGLE:
        newShape = new Rect(shapeAttributes);
        break;

      case shapeTypes.ROUNDED_RECTANGLE:
        newShape = new RRect(shapeAttributes);
        break;

      case shapeTypes.OVAL:
        newShape = new Oval(shapeAttributes);
        break;

      default:
        // For polygons and other shape types
        const vertexArray = shapeParams.polyVectorMethod(defaultFrame, shapeParams.shapeparam);
        shapeAttributes.VertexArray = vertexArray;
        newShape = new Polygon(shapeAttributes);
        newShape.dataclass = shapeParams.dataclass;
    }

    // Stamp the shape onto the canvas
    DrawUtil.MouseStampNewShape(newShape, true, true, true, null, null);

    T3Util.Log("U.ToolUtil.StampShape - Output: Shape stamped successfully");
  }

  /**
   * Rotates the selected shapes by a specified angle
   * @param rotationAngle - The angle (in degrees) to rotate the selected shapes
   * @returns void
   */
  RotateShapes(rotationAngle) {
    T3Util.Log("O.ToolOpt RotateShapes input:", rotationAngle);

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.RotateShapes(parseInt(rotationAngle, 10));
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    T3Util.Log("O.ToolOpt RotateShapes output: void");
  }

  /**
   * Aligns selected shapes based on the specified alignment type
   * @param alignmentType - The type of alignment to apply to selected shapes
   * @returns void
   */
  AlignShapes(alignmentType) {
    T3Util.Log("O.ToolOpt AlignShapes input:", alignmentType);

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.AlignShapes(alignmentType);
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    T3Util.Log("O.ToolOpt AlignShapes output: void");
  }

  /**
   * Deletes the currently selected objects from the drawing
   * @returns void
   */
  DeleteSelectedObjects() {
    T3Util.Log("O.ToolOpt DeleteSelectedObjects input: no parameters");

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.DeleteSelectedObjects();
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    T3Util.Log("O.ToolOpt DeleteSelectedObjects output: void");
  }

  /**
   * Undoes the last operation in the drawing
   * @returns void
   */
  Undo() {
    T3Util.Log("O.ToolOpt Undo input: no parameters");

    try {
      ToolActUtil.Undo();
    } catch (error) {
      throw error;
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    T3Util.Log("O.ToolOpt Undo output: void");
  }

  /**
   * Redoes the last undone operation in the drawing
   * @returns void
   */
  Redo() {
    T3Util.Log("O.ToolOpt Redo input: no parameters");

    try {
      ToolActUtil.Redo();
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    T3Util.Log("O.ToolOpt Redo output: void");
  }

  /**
   * Copies the currently selected objects to the clipboard
   * @returns void
   */
  Copy() {
    T3Util.Log("O.ToolOpt Copy input: no parameters");

    try {
      let clipboardSuccess = false;

      try {
        clipboardSuccess = document.execCommand('copy');
      } catch (error) {
        throw error;
      }

      if (!clipboardSuccess) {
        T3Gv.opt.CopyObjects();
      }
    } catch (error) {
      T3Gv.opt.RestorePrimaryStateManager();
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    T3Util.Log("O.ToolOpt Copy output: void");
  }

  /**
   * Cuts the currently selected objects to the clipboard
   * @returns void
   */
  Cut() {
    T3Util.Log("O.ToolOpt Cut input: no parameters");

    try {
      let clipboardSuccess = false;

      try {
        clipboardSuccess = document.execCommand('cut');
      } catch (error) {
        throw error;
      }

      if (!clipboardSuccess) {
        ToolActUtil.CutObjects();
      }
    } catch (error) {
      T3Gv.opt.RestorePrimaryStateManager();
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    T3Util.Log("O.ToolOpt Cut output: void");
  }

  /**
   * Pastes previously copied objects from the clipboard to the drawing
   * @param eventData - Optional event data containing paste position information
   * @returns void
   */
  Paste(eventData) {
    T3Util.Log("O.ToolOpt Paste input:", eventData);

    try {
      T3Gv.opt.PastePoint = null;

      if (eventData && T3Gv.opt.rClickParam) {
        T3Gv.opt.PastePoint = T3Gv.opt.rClickParam.hitPoint;
      }

      Clipboard.PasteFromUIaction();
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    T3Util.Log("O.ToolOpt Paste output: void");
  }

  /**
   * Sends the selected objects to the back of the drawing order
   * @returns void
   */
  SendToBackOf() {
    T3Util.Log("O.ToolOpt SendToBackOf input: no parameters");

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.SendToBackOf();
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    T3Util.Log("O.ToolOpt SendToBackOf output: void");
  }

  /**
   * Brings the selected objects to the front of the drawing order
   * @returns void
   */
  BringToFrontOf() {
    T3Util.Log("O.ToolOpt BringToFrontOf input: no parameters");

    try {
      T3Gv.opt.CloseEdit();
      DrawUtil.BringToFrontOf();
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    T3Util.Log("O.ToolOpt BringToFrontOf output: void");
  }

  /**
   * Groups the currently selected shapes together
   * @returns void
   */
  GroupSelected() {
    T3Util.Log("O.ToolOpt GroupSelected input: no parameters");

    try {
      T3Gv.opt.CloseEdit();
      // Parameters: autoAddShapes, additionalObjects, createOuterFrame, preserveOriginals, createVisualGroup
      ToolActUtil.GroupSelected(false, null, false, false, true);
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    T3Util.Log("O.ToolOpt GroupSelected output: void");
  }

  /**
   * Ungroups the currently selected grouped shapes
   * @returns void
   */
  UnGroupSelected() {
    T3Util.Log("O.ToolOpt UnGroupSelected input: no parameters");

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.UnGroupSelected();
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    T3Util.Log("O.ToolOpt UnGroupSelected output: void");
  }

  /**
   * Flips the selected objects horizontally
   * @returns void
   */
  FlipHorizontal() {
    T3Util.Log("O.ToolOpt FlipHorizontal input: no parameters");

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.FlipShapes(OptConstant.ExtraFlags.FlipHoriz);
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    T3Util.Log("O.ToolOpt FlipHorizontal output: void");
  }

  /**
   * Flips the selected objects vertically
   * @returns void
   */
  FlipVertical() {
    T3Util.Log("O.ToolOpt FlipVertical input: no parameters");

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.FlipShapes(OptConstant.ExtraFlags.FlipVert);
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    T3Util.Log("O.ToolOpt FlipVertical output: void");
  }

  /**
   * Makes selected objects the same size according to specified dimension type
   * @param dimensionType - Integer specifying which dimension to make the same (width, height, or both)
   * @returns void
   */
  MakeSameSize(dimensionType) {
    T3Util.Log("O.ToolOpt MakeSameSize input:", dimensionType);

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.MakeSameSize(parseInt(dimensionType, 10));
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
    }

    T3Util.Log("O.ToolOpt MakeSameSize output: void");
  }

  /**
   * Gets the current selection context information
   * @returns Object containing information about the current selection state
   */
  GetSelectionContext() {
    T3Util.Log("O.ToolOpt GetSelectionContext input: no parameters");

    try {
      const context = SelectUtil.GetSelectionContext();
      T3Util.Log("O.ToolOpt GetSelectionContext output:", context);
      return context;
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Checks if text editing is currently active
   * @returns Boolean indicating whether text editing is active
   */
  IsActiveTextEdit() {
    T3Util.Log("O.ToolOpt IsActiveTextEdit input: no parameters");

    try {
      const textEditSession = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
      const isActive = textEditSession.theActiveTextEditObjectID !== -1;

      T3Util.Log("O.ToolOpt IsActiveTextEdit output:", isActive);
      return isActive;
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      T3Util.Log("O.ToolOpt IsActiveTextEdit output: undefined (error)");
    }
  }

  /**
   * Handles keyboard key down events
   * @param keyEvent - The keyboard event object
   * @param targetElement - The DOM element target
   * @param eventModifier - Additional event modifiers
   * @returns Result of the key down handling operation
   */
  HandleKeyDown(keyEvent, targetElement, eventModifier) {
    T3Util.Log("O.ToolOpt HandleKeyDown input:", keyEvent, targetElement, eventModifier);

    try {
      const result = LMEvtUtil.HandleKeyDown(keyEvent, targetElement, eventModifier);
      T3Util.Log("O.ToolOpt HandleKeyDown output:", result);
      return result;
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      T3Util.Log("O.ToolOpt HandleKeyDown output: undefined (error)");
    }
  }

  /**
   * Duplicates the currently selected objects
   * @returns void
   */
  Duplicate() {
    T3Util.Log("O.ToolOpt Duplicate input: no parameters");

    try {
      T3Gv.opt.DuplicateObjects();
      T3Util.Log("O.ToolOpt Duplicate output: void");
    } catch (error) {
      T3Gv.opt.RestorePrimaryStateManager();
      T3Gv.opt.ExceptionCleanup(error);
      T3Util.Log("O.ToolOpt Duplicate output: void (error)");
    }
  }

  /**
   * Handles keyboard key press events
   * @param keyEvent - The keyboard event object
   * @param targetElement - The DOM element target
   * @returns Result of the key press handling operation
   */
  HandleKeyPress(keyEvent, targetElement) {
    T3Util.Log("O.ToolOpt HandleKeyPress input:", keyEvent, targetElement);

    try {
      const result = LMEvtUtil.HandleKeyPress(keyEvent, targetElement);
      T3Util.Log("O.ToolOpt HandleKeyPress output:", result);
      return result;
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      T3Util.Log("O.ToolOpt HandleKeyPress output: undefined (error)");
    }
  }

  /**
   * Handles drag-drop operations for symbols
   * @param contextObject - The context object containing callback references
   * @param symbolData - The data for the symbol to be dragged/dropped
   * @returns void
   */
  DragDropSymbol(contextObject, symbolData) {
    T3Util.Log("U.ToolUtil.dragDropSymbol - Input:", contextObject, symbolData);

    this.StampOrDragDropNewSymbol(contextObject, symbolData);

    T3Util.Log("U.ToolUtil.dragDropSymbol - Output: void");
  }

  /**
   * Creates and handles stamping or drag-dropping of a new SVG symbol onto the drawing
   * @param symbolData - The symbol data or identifier
   * @param useDragDrop - Whether to use drag-drop mode (true) or stamp mode (false)
   * @returns void
   */
  StampOrDragDropNewSymbol(symbolData, useDragDrop) {
    T3Util.Log("O.ToolOpt StampOrDragDropNewSymbol input:", symbolData, useDragDrop);

    // Clear any previous replace symbol ID
    T3Gv.opt.ReplaceSymbolID = null;

    // SVG fragment definitions
    const pumpSymbolSVG = '<g><g fill="##FillColor=#7F7F7F##" transform="translate(0,0)"><g class="pump"> <circle stroke="##LineColor=#000000##" cy="16" cx="15.955" r="9.9609003" class="pump-background" /> <g transform="translate(16,16)"> <path d="M -5,8.1369 V -8.1191 L 9.078,0.0091 Z" class="rotating-middle" stroke="##LineColor=#000000##" stroke-width="##LineThick=1##"/></g></g></g></g>';
    const heatPumpSymbolSVG = '<g class="heat-pump" stroke-linejoin="round" stroke="#000" transform="translate(0,0)" fill="currentColor"> <rect class="inner" height="123.718" width="27.718" y="2.141" x="-36.859" stroke-width="1.0868"></rect> <g transform="matrix(1.0276 0 0 1.0276 -39.441 -.44130)" stroke-linecap="round" stroke-miterlimit="1" stroke-width="1.3509"> <path d="m16.234 16.944 8.6837-6.894-8.6837-6.894v3.447h-13.152v6.894h13.152z" fill="#ce2824"></path> <path d="m15.766 28.844-8.6837-6.894 8.6837-6.894v3.447h13.152v6.894h-13.152z" fill="#3238db"></path></g></g>';

    const test1 = `
    <g><g width="13.667" height="10.167" transform="scale(1,1) translate(0,20.833)"><g stroke="##LineColor=#000000##"
    opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none" width="13.667"
    height="10.167" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
    fill-opacity="1" stroke-opacity="1"><rect width="13.667" height="10.167"/></g></g>
    // <g width="13.667" height="10.167" transform="scale(1,1) translate(56.833,21.167)">
    // <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none" width="13.667"
    // height="10.167" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##" fill-opacity="1"
    // stroke-opacity="1"><rect width="13.667" height="10.167"/></g></g><g width="13.667" height="10.167"
    // transform="rotate(270,34.667,6.75) scale(1,1) translate(27.833,1.667)"><g stroke="##LineColor=#000000##"
    // opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none" width="13.667" height="10.167"
    // transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##" fill-opacity="1" stroke-opacity="1">
    // <rect width="13.667" height="10.167"/></g></g><g width="46.167" height="25.5" transform="scale(1,1)
    // translate(12,12.667)"><g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##"
    // stroke-dasharray="none" width="46.167" height="25.5" transform="scale(1,1) translate(0,0)"
    // fill="##FillColor=#FFFFFF##" fill-opacity="1" stroke-opacity="1"><rect width="46.167" height="25.5"/></g></g></g>
    `;

    const test2 = '<g><g width="13.667" height = "10.167" transform = "scale(1,1) translate(0,20.833)" > <g stroke="##LineColor=#000000##" opacity = "1" stroke-width="##LineThick=1##" stroke-dasharray="none" width = "13.667" height = "10.167" transform = "scale(1,1) translate(0,0)" fill = "##FillColor=#FFFFFF##" fill-opacity="1" stroke-opacity="1" > <rect width="13.667" height = "10.167" /> </g></g > <g width="13.667" height = "10.167" transform = "scale(1,1) translate(56.833,21.167)" > <g stroke="##LineColor=#000000##" opacity = "1" stroke-width="##LineThick=1##" stroke-dasharray="none" width = "13.667" height = "10.167" transform = "scale(1,1) translate(0,0)" fill = "##FillColor=#FFFFFF##" fill-opacity="1" stroke-opacity="1" > <rect width="13.667" height = "10.167" /> </g></g > <g width="13.667" height = "10.167" transform = "rotate(270,34.667,6.75) scale(1,1) translate(27.833,1.667)" > <g stroke="##LineColor=#000000##" opacity = "1" stroke-width="##LineThick=1##" stroke-dasharray="none" width = "13.667" height = "10.167" transform = "scale(1,1) translate(0,0)" fill = "##FillColor=#FFFFFF##" fill-opacity="1" stroke-opacity="1" > <rect width="13.667" height = "10.167" /> </g></g > <g width="46.167" height = "25.5" transform = "scale(1,1) translate(12,12.667)" > <g stroke="##LineColor=#000000##" opacity = "1" stroke-width="##LineThick=1##" stroke-dasharray="none" width = "46.167" height = "25.5" transform = "scale(1,1) translate(0,0)" fill = "##FillColor=#FFFFFF##" fill-opacity="1" stroke-opacity="1" > <rect width="46.167" height = "25.5" /> </g></g > </g>';

    // const boiler = `
    //   <path
    //     style="
    //       fill: ##FillColor=#28c3c6##;
    //       fill-opacity: 1;
    //       fill-rule: nonzero;
    //       stroke:##LineColor=#000000##;
    //       stroke-width: 1;
    //       stroke-linecap: butt;
    //       stroke-linejoin: miter;
    //       stroke-miterlimit: 4;
    //       stroke-dasharray: none;
    //       stroke-opacity: 1;
    //     "
    //     d="m 2,15 8,-7 0,-7 12,0 0,7 8,7 0,16 -28,0 z"
    //   ></path>
    // `;

    const boiler = `
      <path
        style="
          fill: ##FillColor=#28c3c6##;
          fill-opacity: 1;
          fill-rule: nonzero;
          stroke:##LineColor=#000000##;
          stroke-width: 1;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
        d="m 3.714,27.855 14.856,-12.999 0,-12.999 22.284,0 0,12.999 14.856,12.999 0,29.712 -51.996,0 z"
      ></path>
    `;

    let initialX = -1000;
    let initialY = -1000;

    // Create a new SVG Fragment Symbol
    const symbolObject = new SVGFragmentSymbol({
      Frame: { x: -1000, y: -1000, width: 60, height: 60 },
      hookflags: 257,
      moreflags: 64,
      targflags: 3,
      // SymbolData: {
      //   ScalingData: {
      //     Dimensions: { X: 159, Y: 161, x: 159, y: 161, },
      //     DimensionsFlags: 0
      //   },
      //   Height: 0.31,
      //   MetricUnits: 4,
      //   Metric_Height: 0,
      //   Metric_Width: 0,
      //   ObjectGrowFlags: 3,
      //   OriginalDimensions: {
      //     X: 159,
      //     Y: 161,
      //     x: 159,
      //     y: 161,
      //   },
      //   Scale: 0,
      //   ScaleType: 1,
      //   Width: 0.66
      // },
      // ShapeData: {
      //   AttachPoint: { X: 15000, Y: 15000, x: 15000, y: 15000, },
      //   ColorFilter: 0,
      //   DataClass: 9,
      //   ExtraAttributeFlags: 0,
      //   LayerName: "Default",
      //   ObjectAttributeFlags: 3,
      //   ObjectType: 0,
      //   UseFlags: 0,
      //   ConnectionPoints: [
      //     { X: 30000, Y: 7500, x: 30000, y: 7500, },
      //     { X: 29010, Y: 14347, x: 29010, y: 14347, },
      //     { X: 30000, Y: 22336, x: 30000, y: 22336, },
      //     { X: 30000, Y: 30000, x: 30000, y: 30000, },
      //     { X: 22385, Y: 30000, x: 22385, y: 30000, },
      //     { X: 14923, Y: 30000, x: 14923, y: 30000, },
      //     { X: 7538, Y: 30000, x: 7538, y: 30000, },
      //     { X: 76, Y: 30000, x: 76, y: 30000, },
      //     { X: 76, Y: 22336, x: 76, y: 22336, },
      //     { X: 609, Y: 14673, x: 609, y: 14673, },
      //     { X: 76, Y: 7500, x: 76, y: 7500, }
      //   ]
      // },
      InitialGroupBounds: { x: 0, y: 0, width: 30, height: 30 },

      // Frame: {
      //   x: -1000,// initialX,
      //   y: -1000,// initialY,
      //   width: 120, //OptConstant.Common.ShapeWidth,
      //   height: 120,// OptConstant.Common.ShapeHeight
      // },
      // TextGrow: NvConstant.TextGrowBehavior.ProPortional,
      // ObjGrow: OptConstant.GrowBehavior.ProPortional,
      // InitialGroupBounds: { x: 0, y: 0, width: 60, height: 60 },
    });
    symbolObject.StyleRecord = new QuickStyle();

    // Use the heat pump SVG fragment

    // Convert multiline SVG to a single line, removing newlines but preserving structure
    const testSvgString = boiler.replace(/\n\s*/g, ' ').trim();
    console.log("D.D testSvgString", testSvgString);

    const newTest1_inline = `
    <g><g width=\"13.667\" height=\"10.167\" transform=\"scale(1,1) translate(0,20.833)\"><g stroke=\"##LINECOLOR=#000000##\" opacity=\"1\" stroke-width=\"##LINETHICK=1##\" stroke-dasharray=\"none\" width=\"13.667\" height=\"10.167\" transform=\"scale(1,1) translate(0,0)\" fill=\"##FILLCOLOR=#FFFFFF##\" fill-opacity=\"1\" stroke-opacity=\"1\"><rect width=\"13.667\" height=\"10.167\"/></g></g><g width=\"13.667\" height=\"10.167\" transform=\"scale(1,1) translate(56.833,21.167)\"><g stroke=\"##LINECOLOR=#000000##\" opacity=\"1\" stroke-width=\"##LINETHICK=1##\" stroke-dasharray=\"none\" width=\"13.667\" height=\"10.167\" transform=\"scale(1,1) translate(0,0)\" fill=\"##FILLCOLOR=#FFFFFF##\" fill-opacity=\"1\" stroke-opacity=\"1\"><rect width=\"13.667\" height=\"10.167\"/></g></g><g width=\"13.667\" height=\"10.167\" transform=\"rotate(270,34.667,6.75) scale(1,1) translate(27.833,1.667)\"><g stroke=\"##LINECOLOR=#000000##\" opacity=\"1\" stroke-width=\"##LINETHICK=1##\" stroke-dasharray=\"none\" width=\"13.667\" height=\"10.167\" transform=\"scale(1,1) translate(0,0)\" fill=\"##FILLCOLOR=#FFFFFF##\" fill-opacity=\"1\" stroke-opacity=\"1\"><rect width=\"13.667\" height=\"10.167\"/></g></g><g width=\"46.167\" height=\"25.5\" transform=\"scale(1,1) translate(12,12.667)\"><g stroke=\"##LINECOLOR=#000000##\" opacity=\"1\" stroke-width=\"##LINETHICK=1##\" stroke-dasharray=\"none\" width=\"46.167\" height=\"25.5\" transform=\"scale(1,1) translate(0,0)\" fill=\"##FILLCOLOR=#FFFFFF##\" fill-opacity=\"1\" stroke-opacity=\"1\"><rect width=\"46.167\" height=\"25.5\"/></g></g></g>
    `;

    const newTest1 =
      `
        <g>
        <g width="13.667" height="10.167" transform="scale(1,1) translate(0,20.833)">
            <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
                width="13.667" height="10.167" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
                fill-opacity="1" stroke-opacity="1">
                <rect width="13.667" height="10.167" />
            </g>
        </g>
        <g width="13.667" height="10.167" transform="scale(1,1) translate(56.833,21.167)">
            <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
                width="13.667" height="10.167" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
                fill-opacity="1" stroke-opacity="1">
                <rect width="13.667" height="10.167" />
            </g>
        </g>
        <g width="13.667" height="10.167" transform="rotate(270,34.667,6.75) scale(1,1) translate(27.833,1.667)">
            <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
                width="13.667" height="10.167" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
                fill-opacity="1" stroke-opacity="1">
                <rect width="13.667" height="10.167" />
            </g>
        </g>
        <g width="46.167" height="25.5" transform="scale(1,1) translate(12,12.667)">
            <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
                width="46.167" height="25.5" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
                fill-opacity="1" stroke-opacity="1">
                <rect width="46.167" height="25.5" />
            </g>
        </g>
        </g>
    `;

    // symbolObject.Frame = { x: 30.416666666666742, y: 256.5, width: 72.5, height: 39.666666666666664 };

    // symbolObject.InitialGroupBounds = {
    //   "width": 71.5,
    //   "height": 39.167,
    //   "x": 351.16666666666663,
    //   "y": 528
    // };

    // symbolObject.Frame = { x: -1000, y: -1000, width: 72.5, height: 39.666666666666664 };

    // symbolObject.InitialGroupBounds = {
    //   "width": 71.5,
    //   "height": 39.167,
    //   "x": -1000,
    //   "y": -1000
    // };

    symbolObject.Frame = { x: -1000, y: -1000, width: 60, height: 60 };

    symbolObject.InitialGroupBounds = {
      width: 60,
      height: 60,
      x: -1000,
      y: -1000
    };

    // symbolObject.r = {
    //   x: 30.416666666666742,
    //   y: 256.5,
    //   width: 72.5,
    //   height: 39.666666666666664
    // };

    // symbolObject.inside = {
    //   x: 30.416666666666742,
    //   y: 256.5,
    //   width: 72.5,
    //   height: 39.666666666666664
    // };

    // symbolObject.trect = {
    //   "x": 30.416666666666742,
    //   "y": 256.5,
    //   "width": 72.5,
    //   "height": 39.666666666666664
    // };

    // symbolObject.rtop = 3168;
    // symbolObject.rleft = 2107;
    // symbolObject.rbottom = 3406;
    // symbolObject.rright = 2542;
    // symbolObject.rwd = 435;
    // symbolObject.rht = 238;

    // symbolObject.attachpoint = {
    //   "x": 14447,
    //   "y": 19411
    // };

    // symbolObject.sizedim = {
    //   "width": 72.5,
    //   "height": 39.666666666666664
    // };

    // symbolObject.ConnectPoints = [
    //   {
    //     "x": 276,
    //     "y": 19411
    //   },
    //   {
    //     "x": 14447,
    //     "y": 378
    //   },
    //   {
    //     "x": 29447,
    //     "y": 19411
    //   }
    // ];

    const RoomHumidity =
      `


 <g transform="translate(0,0)">
        <circle r="30" cy="30" cx="30"
        style="
                opacity: 1;
                fill: ##FillColor=#FFFFFF##;
                fill-opacity: 1;
                fill-rule: nonzero;
                stroke:##FillColor=#000000##;
                stroke-width: 0.764198;
                stroke-linecap: butt;
                stroke-linejoin: round;
                stroke-miterlimit: 4;
                stroke-dasharray: none;
                stroke-opacity: 1;
              "/>
        <g transform="matrix(1,0,0,1,46,43)"
        style="
                font-style: normal;
                font-weight: normal;
                font-size: 51px;
                line-height: 125%;
                font-family: Sans;
                letter-spacing: 0px;
                word-spacing: 0px;
                fill:##FillColor=#000000##;
                fill-opacity: 1;
                stroke: none;
                stroke-width: 1px;
                stroke-linecap: butt;
                stroke-linejoin: miter;
                stroke-opacity: 1;
              ">
            <path
                d="m -29.828843,-32.840076 h 5.075651 v 15.377717 h 18.4432096 v -15.377717 h 5.0756516 V 4.6745172 H -6.3099824 V -13.190771 H -24.753192 V 4.6745172 h -5.075651 z" />
        </g>
    </g>
      `;


    const RoomTemperature =
      `
    <g transform="matrix(0.76419842,0,0,0.76419842,-3.2187002,-3.2187002)">
      <circle
        r="11.288136"
        cy="16"
        cx="16"
        style="
          opacity: 1;
          fill:  ##FillColor=#FFFFFF##;
          fill-opacity: 1;
          fill-rule: nonzero;
          stroke:##FillColor=#000000##;
          stroke-width: 1;
          stroke-linecap: butt;
          stroke-linejoin: round;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
      />
      <g
        transform="translate(32.100664,13.086915)"
        style="
          font-style: normal;
          font-weight: normal;
          font-size: 20.2897px;
          line-height: 125%;
          font-family: Sans;
          letter-spacing: 0px;
          word-spacing: 0px;
          fill:##FillColor=#000000##;
          fill-opacity: 1;
          stroke: none;
          stroke-width: 1px;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-opacity: 1;
        "
      >
        <path
          d="m -22.356997,-4.4825641 h 12.5126658 v 1.6842067 H -15.095093 V 10.308734 h -2.011141 V -2.7983574 h -5.250763 z"
        />
      </g>
    </g>
    `;

    symbolObject.SVGFragment = RoomHumidity;

    // Add the symbol to the drawing using drag-drop mode
    if (symbolObject) {
      DrawUtil.DragDropNewShape(symbolObject, true, true, false, null, null);
      // T3Gv.opt.MouseStampNewShape(symbolObject, true, true, false, null, null);
    }

    T3Util.Log("O.ToolOpt StampOrDragDropNewSymbol output: void");
  }

  /**
   * Creates and draws a new segmented line shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for line properties
   * @returns The created segmented line shape if in drawing mode
   */
  DrawNewSegLine(isDrawing, eventObject, referenceObject) {
    T3Util.Log("O.ToolOpt DrawNewSegLine input:", isDrawing, eventObject, referenceObject);

    let attributes;
    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;
    const isVerticalText = 0 == (sessionData.def.textflags & NvConstant.TextFlags.HorizText);
    let startArrowID = sessionData.d_sarrow;
    let endArrowID = sessionData.d_earrow;
    let startArrowDisplay = sessionData.d_sarrowdisp;
    let endArrowDisplay = sessionData.d_earrowdisp;

    // Make arrow settings consistent
    if ((startArrowID > 0) != (endArrowID > 0)) {
      if (endArrowID === 0) {
        endArrowID = startArrowID;
        endArrowDisplay = startArrowDisplay;
      }
      startArrowID = 0;
      startArrowDisplay = false;
    }

    // Create line attributes
    if (referenceObject) {
      attributes = Utils1.DeepCopy(referenceObject.Data.attributes);
    } else {
      attributes = {
        Frame: {
          x: 0,
          y: 0,
          width: 1,
          height: 1
        },
        StartPoint: {
          x: 0,
          y: 0
        },
        EndPoint: {
          x: 0,
          y: 0
        },
        StartArrowID: startArrowID,
        EndArrowID: endArrowID,
        StartArrowDisp: startArrowDisplay,
        EndArrowDisp: endArrowDisplay,
        ArrowSizeIndex: sessionData.d_arrowsize,
        CurveAdjust: 7,
        TextGrow: NvConstant.TextGrowBehavior.Horizontal,
        TextAlign: T3Constant.DocContext.CurrentTextAlignment,
        TextDirection: isVerticalText,
        Dimensions: sessionData.dimensions,
        curveparam: sessionData.def.curveparam,
        bOverrideDefaultStyleOnDraw: true
      };
    }

    // Create the segmented line shape
    const segmentedLineShape = new Instance.Shape.SegmentedLine(attributes);
    let lineStyle = Utils1.DeepCopy(sessionData.def.style);

    // Set style from reference object or defaults
    if (referenceObject && referenceObject.Data &&
      referenceObject.Data.attributes && referenceObject.Data.attributes.StyleRecord) {
      lineStyle = Utils1.DeepCopy(referenceObject.Data.attributes.StyleRecord);
    } else {
      const textBlockStyle = Utils3.FindStyle(OptConstant.Common.TextBlockStyle);
      lineStyle.Text.Paint.Color = textBlockStyle.Text.Paint.Color;
    }

    segmentedLineShape.StyleRecord = lineStyle;

    // Set line hopping if allowed
    if (sessionData.flags & OptConstant.SessionFlags.AllowHops) {
      segmentedLineShape.flags = Utils2.SetFlag(segmentedLineShape.flags, NvConstant.ObjFlags.LineHop, true);
    }

    // Return shape if in drawing mode, otherwise draw it
    if (isDrawing) {
      T3Util.Log("O.ToolOpt DrawNewSegLine output:", segmentedLineShape);
      return segmentedLineShape;
    }

    DrawUtil.DrawNewObject(segmentedLineShape, eventObject);
    T3Util.Log("O.ToolOpt DrawNewSegLine output: void");
  }

  /**
   * Creates and draws a new arc segmented line shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for line properties
   * @returns The created arc segmented line shape if in drawing mode
   */
  DrawNewArcSegLine(isDrawing, eventObject, referenceObject) {
    T3Util.Log("O.ToolOpt DrawNewArcSegLine input:", isDrawing, eventObject, referenceObject);

    let attributes;
    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;
    const isVerticalText = 0 == (sessionData.def.textflags & NvConstant.TextFlags.HorizText);
    let startArrowID = sessionData.d_sarrow;
    let endArrowID = sessionData.d_earrow;
    let startArrowDisplay = sessionData.d_sarrowdisp;
    let endArrowDisplay = sessionData.d_earrowdisp;

    // Make arrow settings consistent
    if ((startArrowID > 0) != (endArrowID > 0)) {
      if (endArrowID === 0) {
        endArrowID = startArrowID;
        endArrowDisplay = startArrowDisplay;
      }
      startArrowID = 0;
      startArrowDisplay = false;
    }

    // Create line attributes
    if (referenceObject) {
      attributes = Utils1.DeepCopy(referenceObject.Data.attributes);
    } else {
      attributes = {
        Frame: {
          x: 0,
          y: 0,
          width: 1,
          height: 1
        },
        StartPoint: {
          x: 0,
          y: 0
        },
        EndPoint: {
          x: 0,
          y: 0
        },
        StartArrowID: startArrowID,
        EndArrowID: endArrowID,
        StartArrowDisp: startArrowDisplay,
        EndArrowDisp: endArrowDisplay,
        ArrowSizeIndex: sessionData.d_arrowsize,
        CurveAdjust: 7,
        TextGrow: NvConstant.TextGrowBehavior.Horizontal,
        TextAlign: T3Constant.DocContext.CurrentTextAlignment,
        TextDirection: isVerticalText,
        Dimensions: sessionData.dimensions,
        bOverrideDefaultStyleOnDraw: true
      };
    }

    // Create the arc segmented line shape
    const arcSegmentedLineShape = new Instance.Shape.ArcSegmentedLine(attributes);
    let lineStyle = Utils1.DeepCopy(sessionData.def.style);

    // Set style from reference object or defaults
    if (referenceObject && referenceObject.Data &&
      referenceObject.Data.attributes && referenceObject.Data.attributes.StyleRecord) {
      lineStyle = Utils1.DeepCopy(referenceObject.Data.attributes.StyleRecord);
    } else {
      const textBlockStyle = Utils3.FindStyle(OptConstant.Common.TextBlockStyle);
      lineStyle.Text.Paint.Color = textBlockStyle.Text.Paint.Color;
    }

    arcSegmentedLineShape.StyleRecord = lineStyle;

    // Set line hopping if allowed
    if (sessionData.flags & OptConstant.SessionFlags.AllowHops) {
      arcSegmentedLineShape.flags = Utils2.SetFlag(arcSegmentedLineShape.flags, NvConstant.ObjFlags.LineHop, true);
    }

    // Return shape if in drawing mode, otherwise draw it
    if (isDrawing) {
      T3Util.Log("O.ToolOpt DrawNewArcSegLine output:", arcSegmentedLineShape);
      return arcSegmentedLineShape;
    }

    DrawUtil.DrawNewObject(arcSegmentedLineShape, eventObject);
    T3Util.Log("O.ToolOpt DrawNewArcSegLine output: void");
  }

  /**
   * Creates and draws a new polyline shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for polyline properties
   * @returns The created polyline shape if in drawing mode
   */
  DrawNewPolyLine(isDrawing, eventObject, referenceObject) {
    T3Util.Log("O.ToolOpt DrawNewPolyLine input:", isDrawing, eventObject, referenceObject);

    let attributes;
    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;
    const isVerticalText = 0 == (sessionData.def.textflags & NvConstant.TextFlags.HorizText);
    let startArrowID = sessionData.d_sarrow;
    let endArrowID = sessionData.d_earrow;
    let startArrowDisplay = sessionData.d_sarrowdisp;
    let endArrowDisplay = sessionData.d_earrowdisp;

    // Make arrow settings consistent
    if ((startArrowID > 0) != (endArrowID > 0)) {
      if (endArrowID === 0) {
        endArrowID = startArrowID;
        endArrowDisplay = startArrowDisplay;
      }
      startArrowID = 0;
      startArrowDisplay = false;
    }

    // Create polyline attributes
    if (referenceObject) {
      attributes = Utils1.DeepCopy(referenceObject.Data.attributes);
    } else {
      attributes = {
        Frame: {
          x: 0,
          y: 0,
          width: 1,
          height: 1
        },
        StartPoint: {
          x: 0,
          y: 0
        },
        EndPoint: {
          x: 0,
          y: 0
        },
        StartArrowID: startArrowID,
        EndArrowID: endArrowID,
        StartArrowDisp: startArrowDisplay,
        EndArrowDisp: endArrowDisplay,
        ArrowSizeIndex: sessionData.d_arrowsize,
        CurveAdjust: 7,
        polylist: new PolyList(),
        TextGrow: NvConstant.TextGrowBehavior.Horizontal,
        TextAlign: T3Constant.DocContext.CurrentTextAlignment,
        TextDirection: isVerticalText,
        Dimensions: sessionData.dimensions,
        extraflags: OptConstant.ExtraFlags.SideKnobs,
        bOverrideDefaultStyleOnDraw: true
      };

      // Add initial line segments
      attributes.polylist.segs.push(
        new PolySeg(OptConstant.LineType.LINE, 0, 0)
      );
      attributes.polylist.segs.push(
        new PolySeg(OptConstant.LineType.LINE, 0, 0)
      );
    }

    // Create the polyline shape
    const polyLineShape = new Instance.Shape.PolyLine(attributes);
    let lineStyle = Utils1.DeepCopy(sessionData.def.style);

    // Set style from reference object or defaults
    if (referenceObject && referenceObject.Data &&
      referenceObject.Data.attributes && referenceObject.Data.attributes.StyleRecord) {
      lineStyle = Utils1.DeepCopy(referenceObject.Data.attributes.StyleRecord);
    } else {
      const textBlockStyle = Utils3.FindStyle(OptConstant.Common.TextBlockStyle);
      lineStyle.Text.Paint.Color = textBlockStyle.Text.Paint.Color;
    }

    polyLineShape.StyleRecord = lineStyle;

    // Return shape if in drawing mode, otherwise draw it
    if (isDrawing) {
      T3Util.Log("O.ToolOpt DrawNewPolyLine output:", polyLineShape);
      return polyLineShape;
    }

    DrawUtil.DrawNewObject(polyLineShape, eventObject);
    T3Util.Log("O.ToolOpt DrawNewPolyLine output: void");
  }

  /**
   * Creates and draws a new polyline container shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for polyline container properties
   * @returns The created polyline container shape if in drawing mode
   */
  DrawNewPolyLineContainer(isDrawing, eventObject, referenceObject) {
    T3Util.Log("O.ToolOpt DrawNewPolyLineContainer input:", isDrawing, eventObject, referenceObject);

    let attributes;
    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;
    const sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    const isVerticalText = 0 == (sessionData.def.textflags & NvConstant.TextFlags.HorizText);

    // Create attributes from reference or defaults
    if (referenceObject) {
      attributes = Utils1.DeepCopy(referenceObject.Data.attributes);
    } else {
      attributes = {
        Frame: {
          x: 0,
          y: 0,
          width: 1,
          height: 1
        },
        StartPoint: {
          x: 0,
          y: 0
        },
        EndPoint: {
          x: 0,
          y: 0
        },
        StartArrowID: sessionData.d_sarrow,
        EndArrowID: sessionData.d_earrow,
        StartArrowDisp: sessionData.d_sarrowdisp,
        EndArrowDisp: sessionData.d_earrowdisp,
        ArrowSizeIndex: sessionData.d_arrowsize,
        CurveAdjust: 7,
        polylist: new PolyList(),
        TextGrow: NvConstant.TextGrowBehavior.Horizontal,
        TextAlign: T3Constant.DocContext.CurrentTextAlignment,
        TextDirection: isVerticalText,
        Dimensions: sessionData.dimensions
      };

      // Add initial line segments
      attributes.polylist.segs.push(
        new PolySeg(OptConstant.LineType.LINE, 0, 0)
      );
      attributes.polylist.segs.push(
        new PolySeg(OptConstant.LineType.LINE, 0, 0)
      );
    }

    // Create the polyline container shape
    const polyLineContainerShape = new Instance.Shape.PolyLineContainer(attributes);

    // Return shape if in drawing mode, otherwise draw it
    if (isDrawing) {
      T3Util.Log("O.ToolOpt DrawNewPolyLineContainer output:", polyLineContainerShape);
      return polyLineContainerShape;
    }

    DrawUtil.DrawNewObject(polyLineContainerShape, eventObject);
    T3Util.Log("O.ToolOpt DrawNewPolyLineContainer output: void");
  }

  /**
   * Creates and draws a new freehand line shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for line properties
   * @returns The created freehand line shape if in drawing mode
   */
  DrawNewFreehandLine(isDrawing, eventObject, referenceObject) {
    T3Util.Log("O.ToolOpt DrawNewFreehandLine input:", isDrawing, eventObject, referenceObject);

    let attributes;
    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;

    if (referenceObject) {
      attributes = Utils1.DeepCopy(referenceObject.Data.attributes);
    } else {
      attributes = {
        Frame: {
          x: 0,
          y: 0,
          width: 1,
          height: 1
        },
        StartPoint: {
          x: 0,
          y: 0
        },
        EndPoint: {
          x: 0,
          y: 0
        },
        pointlist: [],
        bOverrideDefaultStyleOnDraw: true
      };

      attributes.pointlist.push({
        x: 0,
        y: 0
      });
    }

    const freehandLineShape = new Instance.Shape.FreehandLine(attributes);
    let lineStyle = Utils1.DeepCopy(sessionData.def.style);

    if (referenceObject &&
      referenceObject.Data &&
      referenceObject.Data.attributes &&
      referenceObject.Data.attributes.StyleRecord) {
      lineStyle = Utils1.DeepCopy(referenceObject.Data.attributes.StyleRecord);
    }

    freehandLineShape.StyleRecord = lineStyle;

    // Return shape if in drawing mode, otherwise draw it
    if (isDrawing) {
      T3Util.Log("O.ToolOpt DrawNewFreehandLine output:", freehandLineShape);
      return freehandLineShape;
    }

    DrawUtil.DrawNewObject(freehandLineShape, eventObject);
    T3Util.Log("O.ToolOpt DrawNewFreehandLine output: void");
  }

  /**
   * Creates and draws a new arc line shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for line properties
   * @returns The created arc line shape if in drawing mode
   */
  DrawNewArcLine(isDrawing, eventObject, referenceObject) {
    T3Util.Log("O.ToolOpt DrawNewArcLine input:", isDrawing, eventObject, referenceObject);

    let attributes;
    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;
    const isVerticalText = 0 == (sessionData.def.textflags & NvConstant.TextFlags.HorizText);
    let startArrowID = sessionData.d_sarrow;
    let endArrowID = sessionData.d_earrow;
    let startArrowDisplay = sessionData.d_sarrowdisp;
    let endArrowDisplay = sessionData.d_earrowdisp;

    // Make arrow settings consistent
    if ((startArrowID > 0) != (endArrowID > 0)) {
      if (endArrowID === 0) {
        endArrowID = startArrowID;
        endArrowDisplay = startArrowDisplay;
      }
      startArrowID = 0;
      startArrowDisplay = false;
    }

    // Create line attributes
    if (referenceObject) {
      attributes = Utils1.DeepCopy(referenceObject.Data.attributes);
    } else {
      attributes = {
        Frame: {
          x: 0,
          y: 0,
          width: 1,
          height: 1
        },
        StartPoint: {
          x: 0,
          y: 0
        },
        EndPoint: {
          x: 0,
          y: 0
        },
        StartArrowID: startArrowID,
        EndArrowID: endArrowID,
        StartArrowDisp: startArrowDisplay,
        EndArrowDisp: endArrowDisplay,
        ArrowSizeIndex: sessionData.d_arrowsize,
        CurveAdjust: 7,
        TextGrow: NvConstant.TextGrowBehavior.Horizontal,
        TextAlign: T3Constant.DocContext.CurrentTextAlignment,
        TextDirection: isVerticalText,
        Dimensions: sessionData.dimensions,
        bOverrideDefaultStyleOnDraw: true
      };
    }

    // Create the arc line shape
    const arcLineShape = new Instance.Shape.ArcLine(attributes);
    let lineStyle = Utils1.DeepCopy(sessionData.def.style);

    // Set style from reference object or defaults
    if (referenceObject && referenceObject.Data &&
      referenceObject.Data.attributes && referenceObject.Data.attributes.StyleRecord) {
      lineStyle = Utils1.DeepCopy(referenceObject.Data.attributes.StyleRecord);
    } else {
      const textBlockStyle = Utils3.FindStyle(OptConstant.Common.TextBlockStyle);
      lineStyle.Text.Paint.Color = textBlockStyle.Text.Paint.Color;
    }

    arcLineShape.StyleRecord = lineStyle;

    // Set line hopping if allowed
    if (sessionData.flags & OptConstant.SessionFlags.AllowHops) {
      arcLineShape.flags = Utils2.SetFlag(arcLineShape.flags, NvConstant.ObjFlags.LineHop, true);
    }

    // Return shape if in drawing mode, otherwise draw it
    if (isDrawing) {
      T3Util.Log("O.ToolOpt DrawNewArcLine output:", arcLineShape);
      return arcLineShape;
    }

    DrawUtil.DrawNewObject(arcLineShape, eventObject);
    T3Util.Log("O.ToolOpt DrawNewArcLine output: void");
  }

  /**
   * Selects all objects in the drawing
   * @returns void
   */
  SelectAllObjects() {
    T3Util.Log("O.ToolOpt SelectAllObjects input: no parameters");

    try {
      T3Gv.opt.SelectAllObjects();
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
    }

    T3Util.Log("O.ToolOpt SelectAllObjects output: void");
  }

  /**
   * Saves the current drawing to local storage
   * @returns void
   */
  SaveAs() {
    T3Util.Log("U.ToolUtil SaveAs input: no parameters");

    T3Gv.opt.CloseEdit();

    // save data to local storage
    DataOpt.SaveToLocalStorage();

    T3Util.Log("U.ToolUtil SaveAs output: void");
  }

  Save() {
    this.SaveAs();
  }
}

export default ToolUtil

