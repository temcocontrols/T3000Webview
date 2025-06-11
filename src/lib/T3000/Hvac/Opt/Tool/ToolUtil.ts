
import T3Gv from "../../Data/T3Gv"
import Utils1 from "../../Util/Utils1"
import Utils2 from "../../Util/Utils2"
import Utils3 from "../../Util/Utils3"
import Line from "../../Shape/S.Line"
import Rect from "../../Shape/S.Rect"
import Polygon from "../../Shape/S.Polygon"
import RRect from "../../Shape/S.RRect"
import Oval from "../../Shape/S.Oval"
import T3Clipboard from "../Clipboard/T3Clipboard"
import NvConstant from "../../Data/Constant/NvConstant"
import PolySeg from "../../Model/PolySeg"
import SvgSymbol from "../../Shape/S.SvgSymbol"
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
import ObjectUtil from "../Data/ObjectUtil"
import SelectUtil from "../Opt/SelectUtil"
import SvgUtil from "../Opt/SvgUtil"
import TextUtil from "../Opt/TextUtil"
import OptCMUtil from "../Opt/OptCMUtil"
import DrawUtil from "../Opt/DrawUtil"
import ToolActUtil from "../Opt/ToolActUtil"
import LMEvtUtil from "../Opt/LMEvtUtil"
import ToolSvgData from "./ToolSvgData"
import VueCircle from "src/components/Basic/Circle.vue";
import ObjectType2 from "src/components/NewUI/ObjectType2.vue";
import AntdTest from "src/components/NewUI/AntdTest.vue";
import ObjectType from "src/components/ObjectType.vue"
import QuasarUtil from "../Quasar/QuasarUtil"
import LogUtil from "../../Util/LogUtil"

class ToolUtil {

  /**
   * Sets the current selection tool and manages related states
   * @param toolType - The type of selection tool to set
   * @param isSticky - Whether the tool should be sticky
   */
  SetSelectionTool(toolType, isSticky) {
    LogUtil.Debug('O.ActiveSelection.SetSelectionTool - Input:', { toolType, isSticky });

    // Initial render of all SVG selection states
    SvgUtil.RenderAllSVGSelectionStates();
  }

  /**
   * Cancels the current modal operation
   * @param skipMessageHandling - If true, skips handling of collaboration messages
   * @returns false to indicate operation was cancelled
   */
  CancelOperation(skipMessageHandling?) {
    LogUtil.Debug("O.ToolOpt CancelOperation input:", skipMessageHandling);

    this.SetSelectionTool(ToolConstant.Tools.Select, false);
    OptCMUtil.CancelOperation();
    LogUtil.Debug("O.ToolOpt CancelOperation output: false");
    return false;
  }

  /**
   * Sets the default wall thickness for the document
   * @param thickness - The wall thickness value
   * @param wallObj - Optional wall object containing thickness data
   * @returns void
   */
  SetDefaultWallThickness(thickness, wallObj) {
    LogUtil.Debug("O.ToolOpt SetDefaultWallThickness input:", thickness, wallObj);

    var conversionFactor = 1;
    if (!T3Gv.docUtil.rulerConfig.useInches) {
      conversionFactor = OptConstant.Common.MetricConv;
    }

    if (wallObj) {
      thickness = wallObj.Data.thick;
    }

    var wallThickness = thickness * T3Gv.docUtil.rulerConfig.major /
      (T3Gv.docUtil.rulerConfig.majorScale * conversionFactor);

    var sessionBlock = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    if (!Utils2.IsEqual(sessionBlock.def.wallThickness, wallThickness, 0.01) || wallObj) {
      T3Gv.opt.CloseEdit(true, true);
      sessionBlock = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, true);

      if (!wallObj) {
        sessionBlock.def.wallThickness = wallThickness;
      }

      var sessionBlock = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
      DrawUtil.CompleteOperation(null);
    }

    LogUtil.Debug("O.ToolOpt SetDefaultWallThickness output: void");
  }

  /**
     * Creates a new wall shape in the drawing
     * @param event - The drawing event
     * @param target - Target position or context
     * @returns The created wall object if isTargetValid is true
     */
  DrawNewWallShape(event, target) {
    LogUtil.Debug("O.ToolOpt DrawNewWallShape input:", event, target);

    var wallObject;
    var isTargetValid = target != null;
    var wallOpt = T3Gv.wallOpt;

    if (wallOpt && wallOpt.AddWall) {
      T3Gv.opt.CloseEdit();
      wallOpt.ToggleAddingWalls(true);
      wallObject = wallOpt.AddWall(isTargetValid, target);
    }

    if (isTargetValid) {
      LogUtil.Debug("O.ToolOpt DrawNewWallShape output:", wallObject);
      return wallObject;
    }
    LogUtil.Debug("O.ToolOpt DrawNewWallShape output: undefined");
  }

  /**
   * Handles initiating the process of stamping or drag-dropping a new shape
   * @param event - The UI event that triggered this action
   * @param shapeType - The type of shape to create
   */
  StampOrDragDropNewShape(event, shapeType, uniShapeType) {
    LogUtil.Debug('U.ToolUtil.StampOrDragDropNewShape - Input:', event, shapeType);

    // Initialize cancel flag
    let cancelOperation = false;

    // Prepare for drag-drop or stamp operation
    DrawUtil.PreDragDropOrStamp();

    // Set up the context and callback
    let context = this;
    let callbackFunction = this.StampOrDragDropCallback;

    // Set a timeout to execute the callback after a short delay
    T3Gv.opt.stampTimeout = window.setTimeout(callbackFunction, 200, context, shapeType, uniShapeType);

    LogUtil.Debug('U.ToolUtil.StampOrDragDropNewShape - Output: stampTimeout set');
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
    LogUtil.Debug("O.ToolOpt DrawNewLineShape input:", lineType, targetPosition, eventObject, referenceObject);

    let isDrawing = false;
    let newShape = null;

    // Force line type to 'line'
    // lineType = "line";

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

    LogUtil.Debug("O.ToolOpt DrawNewLineShape output:", newShape);

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
    LogUtil.Debug("O.ToolOpt DrawNewLine input:", event, lineType, isDrawing, referenceObject);

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
      LogUtil.Debug("O.ToolOpt DrawNewLine output:", lineShape);
      return lineShape;
    }

    DrawUtil.DrawNewObject(lineShape, event);
    LogUtil.Debug("O.ToolOpt DrawNewLine output: void");
  }

  /**
   * Callback function that processes shape stamping or drag-drop operations
   * @param context - The context object (typically 'this' reference)
   * @param shapeType - The type of shape to stamp or drag-drop
   * @returns void
   */
  StampOrDragDropCallback(context: ToolUtil, shapeType, uniShapeType) {
    LogUtil.Debug("O.ToolOpt StampOrDragDropCallback input:", context, shapeType);

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
      case shapeTypes.ForeignObject:
        context.StampVueComponent(result, uniShapeType);
        break;
      default:
        context.StampShape(shapeType, result);
    }

    LogUtil.Debug("O.ToolOpt StampOrDragDropCallback output: void");
  }

  /**
   * Creates and stamps a rectangle shape onto the drawing
   * @param isDragDropMode - Whether to use drag-drop mode or mouse stamp mode
   * @param isSquare - Whether to create a square (true) or rectangle (false)
   * @returns void
   */
  StampRectangle(isDragDropMode, isSquare) {
    LogUtil.Debug("O.ToolOpt StampRectangle input:", isDragDropMode, isSquare);

    let width, height;
    const sessionBlock = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    // Set dimensions based on whether we want a square or rectangle
    if (isSquare) {
      width = OptConstant.Common.ShapeSquare;
      height = OptConstant.Common.ShapeSquare;
    } else {
      width = OptConstant.Common.ShapeWidth;
      height = 60;// OptConstant.Common.ShapeHeight;
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
      shapeparam: 0,// sessionBlock.def.rrectparam,
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

    LogUtil.Debug("O.ToolOpt StampRectangle output: void");
  }

  /**
   * Creates and stamps a round rectangle shape onto the drawing
   * @param isDragDropMode - Whether to use drag-drop mode or mouse stamp mode
   * @param isSquare - Whether to create a square (true) or rectangle (false)
   * @returns void
   */
  StampRoundRect(isDragDropMode, isSquare) {
    LogUtil.Debug("O.ToolOpt StampRoundRect input:", isDragDropMode, isSquare);

    let width, height;
    const sessionBlock = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

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

    LogUtil.Debug("O.ToolOpt StampRoundRect output: void");
  }

  /**
   * Creates and stamps a circle or oval shape onto the drawing
   * @param isDragDropMode - Whether to use drag-drop mode or mouse stamp mode
   * @param isCircle - Whether to create a circle (true) or oval (false)
   * @returns void
   */
  StampCircle(isDragDropMode, isCircle) {
    LogUtil.Debug("O.ToolOpt StampCircle input:", isDragDropMode, isCircle);

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
        Frame: { x: initialX, y: initialY, width: 100, height: 100 },
        TextGrow: NvConstant.TextGrowBehavior.ProPortional,
        // ObjGrow: OptConstant.GrowBehavior.ProPortional
        ObjGrow: OptConstant.GrowBehavior.All

      };
    } else {
      shapeAttributes = {
        Frame: { x: initialX, y: initialY, width: width, height: height },
        TextGrow: NvConstant.TextGrowBehavior.ProPortional
      };
    }

    // Create the oval shape
    const ovalShape = new Oval(shapeAttributes);

    LogUtil.Info("= u.ToolUtil StampCircle / Oval data", ovalShape);

    // Use mouse stamp method to place the shape
    DrawUtil.MouseStampNewShape(ovalShape, true, true, true, null, null);

    LogUtil.Debug("O.ToolOpt StampCircle output: void");
  }

  StampVueComponent(isDragDropMode, uniShapeType) {

    LogUtil.Debug("U.ToolUtil StampVueComponent:", isDragDropMode, uniShapeType);

    let width, height;

    width = OptConstant.Common.ShapeWidth;
    height = OptConstant.Common.ShapeHeight;

    // Initial position off-screen
    const initialX = -1000;
    const initialY = -1000;
    let shapeAttributes = null;

    // Configure shape attributes
    shapeAttributes = {
      Frame: {
        x: initialX,
        y: initialY,
        width: width,
        height: height
      },
      TextGrow: NvConstant.TextGrowBehavior.ProPortional,
      uniType: uniShapeType
    };

    // Create the foreign object shape
    const pumpItemWithLink =
    {
      "title": "==== Test Pump ====",
      "active": false,
      "type": "Pump",
      "translate": [
        284,
        72
      ],
      "width": 60,
      "height": 60,
      "rotate": 0,
      "scaleX": 1,
      "scaleY": 1,
      "settings": {
        "fillColor": "#659dc5",
        "active": true,
        "inAlarm": true,
        "titleColor": "inherit",
        "bgColor": "inherit",
        "textColor": "inherit",
        "fontSize": 16,
        "t3EntryDisplayField": "description"
      },
      "zindex": 1,
      "t3Entry": {
        "auto_manual": 1,
        "calibration_h": 0,
        "calibration_l": 0,
        "calibration_sign": 1,
        "command": "199IN1",
        "control": 1,
        "decom": 1,
        "description": "Volts",
        "digital_analog": 1,
        "filter": 5,
        "id": "IN1",
        "index": 0,
        "label": "IN1",
        "pid": 199,
        "range": 19,
        "type": "INPUT",
        "unit": 19,
        "value": 30
      },
      "showDimensions": true,
      "cat": "Pipe",
      "id": 2
    };

    var props = {
      item: pumpItemWithLink,
      showArrows: true,
    };

    var apsItem = QuasarUtil.GetItemFromAPSV2(uniShapeType);
    LogUtil.Debug("apsItem", apsItem);
    // props = {
    //   item: apsItem,
    //   showArrows: true,
    // };

    // var fiObShape = this.CreateForeignObjectWithVue(T3Gv.opt.svgDoc, ObjectType2, props, shapeAttributes);
    var fiObShape = this.CreateForeignObjectWithVue(T3Gv.opt.svgDoc, ObjectType, props, shapeAttributes);

    // Use mouse stamp method to place the shape
    DrawUtil.MouseStampNewShape(fiObShape, true, true, true, null, null);

    LogUtil.Debug("U.ToolUtil StampVueComponent output: void");

    /*
    // Get your document instance
    const doc = T3Gv.opt.svgDoc;
    const layer = doc.GetDocumentLayer();

    // Create a foreignObject with Vue component
    const foreignObj = doc.CreateVueComponent(50, 50, VueCircle, {
      message: 'Hello from SVG!',
      color: 'blue'
    });

    // Position the foreign object

    // Add it to a layer
    const shapeContainer = doc.CreateShape(OptConstant.CSType.ShapeContainer);
    shapeContainer.AddElement(foreignObj);

    shapeContainer.SetID('0000-000000-0000-0000');
    shapeContainer.SetSize(100, 100);
    shapeContainer.SetPos(300, 100);

    layer.AddElement(shapeContainer);
    */
  }

  CreateForeignObjectWithVue(doc, vueComponent, props, shapeAttributes) {
    // const foreignObject = doc.CreateShape(OptConstant.CSType.ShapeContainer);
    const shape = new Instance.Shape.ForeignObject({
      vueComponent: vueComponent,
      vueProps: props,
      ...shapeAttributes
    });

    LogUtil.Debug("ToolUtil->CreateForeignObjectWithVue After", shape);

    /*
    // Set size and position
    shape.SetSize(300, 200);
    shape.SetPos(100, 100);

    // Add to document
    doc.GetDocumentLayer().AddElement(shape);
    */

    return shape;
  };

  /**
   * Creates and stamps a text label shape onto the drawing
   * @param isDragDropMode - Whether to use drag-drop mode
   * @param skipTargetCheck - Whether to skip target selection check
   * @returns void
   */
  StampTextLabel(isDragDropMode, skipTargetCheck) {
    LogUtil.Debug("O.ToolOpt StampTextLabel input:", isDragDropMode, skipTargetCheck);

    // Get the text edit session block
    const textEditSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

    // Check if we need to handle existing active text editing
    if (skipTargetCheck || textEditSession.theActiveTextEditObjectID == -1) {
      // If not skipping target check, try to activate text edit on selected object
      if (!skipTargetCheck) {
        const targetID = SelectUtil.GetTargetSelect();
        if (targetID >= 0) {
          const targetObject = ObjectUtil.GetObjectPtr(targetID, false);
          if (targetObject && targetObject.AllowTextEdit()) {
            const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(targetID);
            return TextUtil.ActivateTextEdit(svgElement);
          }
        }
      }
    } else {
      TextUtil.DeactivateTextEdit();
    }

    // Get session data and default text style
    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;
    let defaultTextStyle = Utils3.FindStyle(OptConstant.Common.TextBlockStyle);

    if (defaultTextStyle == null) {
      defaultTextStyle = sessionData.def.style;
    }

    // Create text shape attributes
    const textAttributes = {
      // StyleRecord: $.extend(true, {}, defaultTextStyle),
      StyleRecord: Utils1.DeepCopy(defaultTextStyle),
      Frame: { x: 0, y: 0, width: 0, height: 0 },
      TMargins: { top: 0, left: 0, bottom: 0, right: 0 },
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
    const textShape = new Instance.Shape.Rect(textAttributes);
    const textStyle = Utils1.DeepCopy(sessionData.def.style);

    textStyle.Text.Paint = Utils1.DeepCopy(defaultTextStyle.Text.Paint);
    textShape.StyleRecord.Text = textStyle.Text;

    // Calculate text metrics for proper sizing
    const initialTextStyle = TextUtil.CalcDefaultInitialTextStyle(textShape.StyleRecord.Text);
    const textMetrics = T3Gv.opt.svgDoc.CalcStyleMetrics(initialTextStyle);

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

    LogUtil.Debug("O.ToolOpt StampTextLabel output: void");
  }

  /**
   * Callback function executed after a shape is stamped onto the drawing
   * @param objectId - ID of the stamped object
   * @param options - Options for post-stamp processing
   * @param options.bActivateText - Whether to activate text editing for the stamped object
   * @returns void
   */
  StampCallback(objectId, options) {
    if (options.bActivateText) {
      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(objectId);
      TextUtil.ActivateTextEdit(svgElement);
    }
  }

  /**
   * Creates and stamps a shape based on the specified shape type
   * @param shapeType - The type of shape to stamp
   * @param isDragMode - Whether the shape is being dragged (vs. placed directly)
   * @returns void
   */
  StampShape(shapeType, isDragMode) {
    LogUtil.Debug("U.ToolUtil.StampShape - Input:", shapeType, isDragMode);

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

    LogUtil.Debug("U.ToolUtil.StampShape - Output: Shape stamped successfully");
  }

  /**
   * Rotates the selected shapes by a specified angle
   * @param rotationAngle - The angle (in degrees) to rotate the selected shapes
   * @returns void
   */
  RotateShapes(rotationAngle) {
    LogUtil.Debug("O.ToolOpt RotateShapes input:", rotationAngle);

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.RotateShapes(parseInt(rotationAngle, 10));
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    LogUtil.Debug("O.ToolOpt RotateShapes output: void");
  }

  /**
   * Aligns selected shapes based on the specified alignment type
   * @param alignmentType - The type of alignment to apply to selected shapes
   * @returns void
   */
  AlignShapes(alignmentType) {
    LogUtil.Debug("O.ToolOpt AlignShapes input:", alignmentType);

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.AlignShapes(alignmentType);
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    LogUtil.Debug("O.ToolOpt AlignShapes output: void");
  }

  /**
   * Deletes the currently selected objects from the drawing
   * @returns void
   */
  DeleteSelectedObjects() {
    LogUtil.Debug("O.ToolOpt DeleteSelectedObjects input: no parameters");

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.DeleteSelectedObjects();
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    LogUtil.Debug("O.ToolOpt DeleteSelectedObjects output: void");
  }

  /**
   * Undoes the last operation in the drawing
   * @returns void
   */
  Undo() {
    LogUtil.Debug("O.ToolOpt Undo input: no parameters");

    try {
      ToolActUtil.Undo();
    } catch (error) {
      throw error;
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    LogUtil.Debug("O.ToolOpt Undo output: void");
  }

  /**
   * Redoes the last undone operation in the drawing
   * @returns void
   */
  Redo() {
    LogUtil.Debug("O.ToolOpt Redo input: no parameters");

    try {
      ToolActUtil.Redo();
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    LogUtil.Debug("O.ToolOpt Redo output: void");
  }

  /**
   * Copies the currently selected objects to the clipboard
   * @returns void
   */
  Copy() {
    LogUtil.Debug("O.ToolOpt Copy input: no parameters");

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

    LogUtil.Debug("O.ToolOpt Copy output: void");
  }

  /**
   * Cuts the currently selected objects to the clipboard
   * @returns void
   */
  Cut() {
    LogUtil.Debug("O.ToolOpt Cut input: no parameters");

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

    LogUtil.Debug("O.ToolOpt Cut output: void");
  }

  /**
   * Pastes previously copied objects from the clipboard to the drawing
   * @param eventData - Optional event data containing paste position information
   * @returns void
   */
  Paste(isRightClick) {
    LogUtil.Debug("= u.ToolUtil: Paste/ input isRightClick:", isRightClick);

    try {
      T3Gv.opt.PastePoint = null;

      if (isRightClick && T3Gv.opt.rClickParam) {
        T3Gv.opt.PastePoint = T3Gv.opt.rClickParam.hitPoint;
      }

      T3Clipboard.PasteFromUIaction();
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }
  }

  /**
   * Sends the selected objects to the back of the drawing order
   * @returns void
   */
  SendToBackOf() {
    LogUtil.Debug("O.ToolOpt SendToBackOf input: no parameters");

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.SendToBackOf();
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    LogUtil.Debug("O.ToolOpt SendToBackOf output: void");
  }

  /**
   * Brings the selected objects to the front of the drawing order
   * @returns void
   */
  BringToFrontOf() {
    LogUtil.Debug("O.ToolOpt BringToFrontOf input: no parameters");

    try {
      T3Gv.opt.CloseEdit();
      DrawUtil.BringToFrontOf();
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    LogUtil.Debug("O.ToolOpt BringToFrontOf output: void");
  }

  /**
   * Groups the currently selected shapes together
   * @returns void
   */
  GroupSelected() {
    LogUtil.Debug("O.ToolOpt GroupSelected input: no parameters");

    try {
      T3Gv.opt.CloseEdit();
      // Parameters: autoAddShapes, additionalObjects, createOuterFrame, preserveOriginals, createVisualGroup
      ToolActUtil.GroupSelected(false, null, false, false, true);
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    LogUtil.Debug("O.ToolOpt GroupSelected output: void");
  }

  /**
   * Ungroups the currently selected grouped shapes
   * @returns void
   */
  UnGroupSelected() {
    LogUtil.Debug("O.ToolOpt UnGroupSelected input: no parameters");

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.UnGroupSelected();
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    LogUtil.Debug("O.ToolOpt UnGroupSelected output: void");
  }

  /**
   * Flips the selected objects horizontally
   * @returns void
   */
  FlipHorizontal() {
    LogUtil.Debug("O.ToolOpt FlipHorizontal input: no parameters");

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.FlipShapes(OptConstant.ExtraFlags.FlipHoriz);
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    LogUtil.Debug("O.ToolOpt FlipHorizontal output: void");
  }

  /**
   * Flips the selected objects vertically
   * @returns void
   */
  FlipVertical() {
    LogUtil.Debug("O.ToolOpt FlipVertical input: no parameters");

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.FlipShapes(OptConstant.ExtraFlags.FlipVert);
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }

    LogUtil.Debug("O.ToolOpt FlipVertical output: void");
  }

  /**
   * Makes selected objects the same size according to specified dimension type
   * @param dimensionType - Integer specifying which dimension to make the same (width, height, or both)
   * @returns void
   */
  MakeSameSize(dimensionType) {
    LogUtil.Debug("O.ToolOpt MakeSameSize input:", dimensionType);

    try {
      T3Gv.opt.CloseEdit();
      ToolActUtil.MakeSameSize(parseInt(dimensionType, 10));
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
    }

    LogUtil.Debug("O.ToolOpt MakeSameSize output: void");
  }

  /**
   * Gets the current selection context information
   * @returns Object containing information about the current selection state
   */
  GetSelectionContext() {
    LogUtil.Debug("O.ToolOpt GetSelectionContext input: no parameters");

    try {
      const context = SelectUtil.GetSelectionContext();
      LogUtil.Debug("O.ToolOpt GetSelectionContext output:", context);
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
    LogUtil.Debug("O.ToolOpt IsActiveTextEdit input: no parameters");

    try {
      const textEditSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
      const isActive = textEditSession.theActiveTextEditObjectID !== -1;

      LogUtil.Debug("O.ToolOpt IsActiveTextEdit output:", isActive);
      return isActive;
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      LogUtil.Debug("O.ToolOpt IsActiveTextEdit output: undefined (error)");
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
    LogUtil.Debug("O.ToolOpt HandleKeyDown input:", keyEvent, targetElement, eventModifier);

    try {
      const result = LMEvtUtil.HandleKeyDown(keyEvent, targetElement, eventModifier);
      LogUtil.Debug("O.ToolOpt HandleKeyDown output:", result);
      return result;
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      LogUtil.Debug("O.ToolOpt HandleKeyDown output: undefined (error)");
    }
  }

  /**
   * Duplicates the currently selected objects
   * @returns void
   */
  Duplicate() {
    LogUtil.Debug("O.ToolOpt Duplicate input: no parameters");

    try {
      ToolActUtil.DuplicateObjects();
      LogUtil.Debug("O.ToolOpt Duplicate output: void");
    } catch (error) {
      T3Gv.opt.RestorePrimaryStateManager();
      T3Gv.opt.ExceptionCleanup(error);
      LogUtil.Debug("O.ToolOpt Duplicate output: void (error)");
    }
  }

  /**
   * Handles keyboard key press events
   * @param keyEvent - The keyboard event object
   * @param targetElement - The DOM element target
   * @returns Result of the key press handling operation
   */
  HandleKeyPress(keyEvent, targetElement) {
    LogUtil.Debug("O.ToolOpt HandleKeyPress input:", keyEvent, targetElement);

    try {
      const result = LMEvtUtil.HandleKeyPress(keyEvent, targetElement);
      LogUtil.Debug("O.ToolOpt HandleKeyPress output:", result);
      return result;
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      LogUtil.Debug("O.ToolOpt HandleKeyPress output: undefined (error)");
    }
  }

  /**
   * Handles drag-drop operations for symbols
   * @param contextObject - The context object containing callback references
   * @param symbolData - The data for the symbol to be dragged/dropped
   * @returns void
   */
  DragDropSymbol(contextObject, symbolData) {
    LogUtil.Debug("U.ToolUtil.dragDropSymbol - Input:", contextObject, symbolData);

    this.StampOrDragDropNewSymbol(contextObject, symbolData);

    LogUtil.Debug("U.ToolUtil.dragDropSymbol - Output: void");
  }

  /**
   * Creates and handles stamping or drag-dropping of a new SVG symbol onto the drawing
   * @param symbolData - The symbol data or identifier
   * @param useDragDrop - Whether to use drag-drop mode (true) or stamp mode (false)
   * @returns void
   */
  StampOrDragDropNewSymbol(symbolData, useDragDrop) {
    LogUtil.Debug("O.ToolOpt StampOrDragDropNewSymbol input:", symbolData, useDragDrop);

    // SVG fragment definitions
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
    const symbolObject = new SvgSymbol({
      Frame: { x: -1000, y: -1000, width: 60, height: 60 },
      hookflags: 257,
      moreflags: 64,
      targflags: 3,
      InitialGroupBounds: { x: 0, y: 0, width: 30, height: 30 },
    });

    symbolObject.StyleRecord = new QuickStyle();

    // Convert multiline SVG to a single line, removing newlines but preserving structure
    const testSvgString = boiler.replace(/\n\s*/g, ' ').trim();
    LogUtil.Debug("D.D testSvgString", testSvgString);

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

    symbolObject.Frame = { x: -1000, y: -1000, width: 60, height: 60 };

    symbolObject.InitialGroupBounds = {
      width: 60,
      height: 60,
      x: -1000,
      y: -1000
    };

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
    }

    LogUtil.Debug("O.ToolOpt StampOrDragDropNewSymbol output: void");
  }

  ToolDragDropSymbol(symbolType, useDragDrop) {
    // Prepare symbol data
    var symbolObject = ToolSvgData.GetSvgData(symbolType);
    this.ToolDragDropNewSymbol(symbolObject, useDragDrop);
    LogUtil.Debug("= U.ToolUtil.dragDropSymbol - Input/Output:", symbolType, useDragDrop);
  }

  ToolDragDropNewSymbol(symbolObject, useDragDrop) {
    DrawUtil.DragDropNewShape(symbolObject, true, true, false, null, null);
    LogUtil.Debug("= U.ToolUtil ToolDragDropNewSymbol input/output:", symbolObject, useDragDrop);
  }

  /**
   * Creates and draws a new segmented line shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for line properties
   * @returns The created segmented line shape if in drawing mode
   */
  DrawNewSegLine(isDrawing, eventObject, referenceObject) {
    LogUtil.Debug("O.ToolOpt DrawNewSegLine input:", isDrawing, eventObject, referenceObject);

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
      LogUtil.Debug("O.ToolOpt DrawNewSegLine output:", segmentedLineShape);
      return segmentedLineShape;
    }

    DrawUtil.DrawNewObject(segmentedLineShape, eventObject);
    LogUtil.Debug("O.ToolOpt DrawNewSegLine output: void");
  }

  /**
   * Creates and draws a new arc segmented line shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for line properties
   * @returns The created arc segmented line shape if in drawing mode
   */
  DrawNewArcSegLine(isDrawing, eventObject, referenceObject) {
    LogUtil.Debug("O.ToolOpt DrawNewArcSegLine input:", isDrawing, eventObject, referenceObject);

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
      LogUtil.Debug("O.ToolOpt DrawNewArcSegLine output:", arcSegmentedLineShape);
      return arcSegmentedLineShape;
    }

    DrawUtil.DrawNewObject(arcSegmentedLineShape, eventObject);
    LogUtil.Debug("O.ToolOpt DrawNewArcSegLine output: void");
  }

  /**
   * Creates and draws a new polyline shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for polyline properties
   * @returns The created polyline shape if in drawing mode
   */
  DrawNewPolyLine(isDrawing, eventObject, referenceObject) {
    LogUtil.Debug("O.ToolOpt DrawNewPolyLine input:", isDrawing, eventObject, referenceObject);

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
      LogUtil.Debug("O.ToolOpt DrawNewPolyLine output:", polyLineShape);
      return polyLineShape;
    }

    DrawUtil.DrawNewObject(polyLineShape, eventObject);
    LogUtil.Debug("O.ToolOpt DrawNewPolyLine output: void");
  }

  /**
   * Creates and draws a new polyline container shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for polyline container properties
   * @returns The created polyline container shape if in drawing mode
   */
  DrawNewPolyLineContainer(isDrawing, eventObject, referenceObject) {
    LogUtil.Debug("O.ToolOpt DrawNewPolyLineContainer input:", isDrawing, eventObject, referenceObject);

    let attributes;
    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;
    const sessionBlock = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
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
      LogUtil.Debug("O.ToolOpt DrawNewPolyLineContainer output:", polyLineContainerShape);
      return polyLineContainerShape;
    }

    DrawUtil.DrawNewObject(polyLineContainerShape, eventObject);
    LogUtil.Debug("O.ToolOpt DrawNewPolyLineContainer output: void");
  }

  /**
   * Creates and draws a new freehand line shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for line properties
   * @returns The created freehand line shape if in drawing mode
   */
  DrawNewFreehandLine(isDrawing, eventObject, referenceObject) {
    LogUtil.Debug("O.ToolOpt DrawNewFreehandLine input:", isDrawing, eventObject, referenceObject);

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
      LogUtil.Debug("O.ToolOpt DrawNewFreehandLine output:", freehandLineShape);
      return freehandLineShape;
    }

    DrawUtil.DrawNewObject(freehandLineShape, eventObject);
    LogUtil.Debug("O.ToolOpt DrawNewFreehandLine output: void");
  }

  /**
   * Creates and draws a new arc line shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for line properties
   * @returns The created arc line shape if in drawing mode
   */
  DrawNewArcLine(isDrawing, eventObject, referenceObject) {
    LogUtil.Debug("O.ToolOpt DrawNewArcLine input:", isDrawing, eventObject, referenceObject);

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
      LogUtil.Debug("O.ToolOpt DrawNewArcLine output:", arcLineShape);
      return arcLineShape;
    }

    DrawUtil.DrawNewObject(arcLineShape, eventObject);
    LogUtil.Debug("O.ToolOpt DrawNewArcLine output: void");
  }

  /**
   * Selects all objects in the drawing
   * @returns void
   */
  SelectAllObjects() {
    LogUtil.Debug("O.ToolOpt SelectAllObjects input: no parameters");

    try {
      SelectUtil.SelectAllObjects();
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
    }

    LogUtil.Debug("O.ToolOpt SelectAllObjects output: void");
  }

  /**
  * Save the current drawing to local storage
  * @returns void
  */
  Save() {
    T3Gv.opt.CloseEdit();

    // save data to local storage
    DataOpt.SaveToLocalStorage();
  }

  VueForeignObject() {
    this.tul.StampOrDragDropNewShape(event, shapeType);
  }

  ClearAndRest() {
    DataOpt.ClearT3LocalStorage();
    // Hvac.UI.Reload();
  }
}

export default ToolUtil

