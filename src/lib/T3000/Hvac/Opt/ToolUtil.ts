

// import GlobalData from '../../Data/GlobalData'
// import Utils1 from '../../Helper/Utils1'
// import Utils3 from '../../Helper/Utils3'
// import Utils2 from '../../Helper/Utils2'
// import Resources from '../../Data/Resources'
// import Line from '../../Shape/Shape.Line'
// import Rect from '../../Shape/Shape.Rect'
// import $ from 'jquery'
// import Polygon from '../../Shape/Shape.Polygon'
// import RRect from '../../Shape/Shape.RRect'
// import Oval from '../../Shape/Shape.Oval'
// import Clipboard from './Clipboard'
// import ConstantData from '../../Data/ConstantData'
// import PolySeg from '../../Model/PolySeg'
// import ConstantData2 from '../../Data/ConstantData2'
// import SVGFragmentSymbol from '../../Shape/Shape.SVGFragmentSymbol'
// import QuickStyle from '../../Model/QuickStyle'
// import Instance from '../../Data/Instance/Instance'
// import PolyList from '../../Model/PolyList'
// import ToolConstant from './ToolConstant'

class ToolUtil {

  /**
     * Sets the current selection tool and manages related states
     * @param toolType - The type of selection tool to set
     * @param isSticky - Whether the tool should be sticky
     */
  SetSelectionTool(toolType, isSticky) {
    console.log('O.ActiveSelection.SetSelectionTool - Input:', { toolType, isSticky });

    // Initial render of all SVG selection states
    GlobalData.optManager.RenderAllSVGSelectionStates();

    // Check if we're currently using the wall tool
    const isCurrentlyWallTool = ConstantData.DocumentContext.SelectionTool === Resources.Tools.Tool_Wall;

    // Update context with new tool settings
    ConstantData.DocumentContext.SelectionTool = toolType;
    ConstantData.DocumentContext.SelectionToolSticky = isSticky;
    ConstantData.DocumentContext.SelectionToolMultiple = false;

    // Additional handling for wall tool transitions
    if (toolType !== Resources.Tools.Tool_Wall) {
      ConstantData.DocumentContext.UsingWallTool = false;

      // If we were previously using the wall tool, re-render all states
      if (isCurrentlyWallTool) {
        GlobalData.optManager.RenderAllSVGSelectionStates();
      }
    }

    console.log('O.ActiveSelection.SetSelectionTool - Output:', {
      updatedTool: ConstantData.DocumentContext.SelectionTool,
      isSticky: ConstantData.DocumentContext.SelectionToolSticky,
      usingWallTool: ConstantData.DocumentContext.UsingWallTool
    });
  }

  /**
     * Cancels the current modal operation
     * @param skipMessageHandling - If true, skips handling of collaboration messages
     * @returns false to indicate operation was cancelled
     */
  CancelModalOperation(skipMessageHandling?) {
    console.log("O.ToolOpt CancelModalOperation input:", skipMessageHandling);

    // Commands.MainController.Selection.SetSelectionTool(Resources.Tools.Tool_Select, false);
    this.SetSelectionTool(ToolConstant.Tools.Tool_Select, false);
    GlobalData.optManager.CancelModalOperation();

    if (!skipMessageHandling) {
      // Collab.UnLockMessages();
      // Collab.UnBlockMessages();
    }

    console.log("O.ToolOpt CancelModalOperation output: false");
    return false;
  }

  /**
   * Sets the default wall thickness for the document
   * @param thickness - The wall thickness value
   * @param wallObj - Optional wall object containing thickness data
   * @returns void
   */
  SetDefaultWallThickness(thickness, wallObj) {
    console.log("O.ToolOpt SetDefaultWallThickness input:", thickness, wallObj);

    var conversionFactor = 1;
    if (!GlobalData.docHandler.rulerSettings.useInches) {
      conversionFactor = ConstantData.Defines.MetricConv;
    }

    if (wallObj) {
      thickness = wallObj.Data.thick;
    }

    var wallThickness = thickness * GlobalData.docHandler.rulerSettings.major /
      (GlobalData.docHandler.rulerSettings.majorScale * conversionFactor);

    var sessionBlock = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);

    if (!Utils2.IsEqual(sessionBlock.def.wallThickness, wallThickness, 0.01) || wallObj) {
      GlobalData.optManager.CloseEdit(true, true);
      sessionBlock = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, true);

      if (!wallObj) {
        sessionBlock.def.wallThickness = wallThickness;
      }

      var sessionBlock = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
      GlobalData.optManager.CompleteOperation(null);
    }

    console.log("O.ToolOpt SetDefaultWallThickness output: void");
  }

  /**
     * Creates a new wall shape in the drawing
     * @param event - The drawing event
     * @param target - Target position or context
     * @returns The created wall object if isTargetValid is true
     */
  DrawNewWallShape(event, target) {
    console.log("O.ToolOpt DrawNewWallShape input:", event, target);

    var wallObject;
    var isTargetValid = target != null;
    var businessManager = null;

    if (businessManager == null) {
      businessManager = GlobalData.gBusinessManager;
    }

    if (businessManager && businessManager.AddWall) {
      GlobalData.optManager.CloseEdit();
      businessManager.ToggleAddingWalls(true);
      wallObject = businessManager.AddWall(isTargetValid, target);
      // ConstantData.DocumentContext.UsingWallTool = true;
    }

    if (isTargetValid) {
      console.log("O.ToolOpt DrawNewWallShape output:", wallObject);
      return wallObject;
    }
    console.log("O.ToolOpt DrawNewWallShape output: undefined");
  }

  /**
   * Handles initiating the process of stamping or drag-dropping a new shape
   * @param event - The UI event that triggered this action
   * @param shapeType - The type of shape to create
   */
  StampOrDragDropNewShape(event, shapeType) {
    console.log('U.ToolUtil.StampOrDragDropNewShape - Input:', event, shapeType);

    let context;
    let callbackFunction;

    GlobalData.optManager.SetUIAdaptation(event);

    // Initialize cancel flag
    let cancelOperation = false;

    // Prepare for drag-drop or stamp operation
    GlobalData.optManager.PreDragDropOrStamp();

    // Set up the context and callback
    context = this;
    callbackFunction = this.StampOrDragDropCallback;

    // Set a timeout to execute the callback after a short delay
    GlobalData.optManager.StampTimeout = window.setTimeout(callbackFunction, 200, context, shapeType);

    console.log('U.ToolUtil.StampOrDragDropNewShape - Output: StampTimeout set');
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
    console.log("O.ToolOpt DrawNewLineShape input:", lineType, targetPosition, eventObject, referenceObject);

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
        if (GlobalData.gBusinessManager && GlobalData.gBusinessManager.AddWall) {
          newShape = GlobalData.gBusinessManager.AddWall(isDrawing, referenceObject);
        } else {
          newShape = this.DrawNewLine(eventObject, 0, isDrawing, referenceObject);
        }
        break;
    }

    console.log("O.ToolOpt DrawNewLineShape output:", newShape);

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
    console.log("O.ToolOpt DrawNewLine input:", event, lineType, isDrawing, referenceObject);

    const sessionData = GlobalData.objectStore.GetObject(GlobalData.optManager.theSEDSessionBlockID).Data;
    const isVerticalText = 0 == (sessionData.def.textflags & ConstantData.TextFlags.SED_TF_HorizText);
    let startArrowID = sessionData.d_sarrow;
    let endArrowID = sessionData.d_earrow;
    let startArrowDisplay = sessionData.d_sarrowdisp;
    let endArrowDisplay = sessionData.d_earrowdisp;
    let shapeParameter = 0;

    // Set shape parameter based on line type
    switch (lineType) {
      case ConstantData2.LineTypes.SED_LS_Comm:
      case ConstantData2.LineTypes.SED_LS_Digi:
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
        TextGrow: ConstantData.TextGrowBehavior.HORIZONTAL,
        TextAlign: ConstantData.DocumentContext.CurrentTextAlignment,
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
      const textBlockStyle = Utils4.FindStyle(ConstantData.Defines.TextBlockStyle);
      lineStyle.Text.Paint.Color = '#000000';
    }

    lineShape.StyleRecord = lineStyle;

    // Set line hopping if allowed
    if (sessionData.flags & ConstantData.SessionFlags.SEDS_AllowHops) {
      lineShape.flags = Utils2.SetFlag(lineShape.flags, ConstantData.ObjFlags.SEDO_LineHop, true);
    }

    // Return shape if in drawing mode, otherwise draw it
    if (isDrawing) {
      console.log("O.ToolOpt DrawNewLine output:", lineShape);
      return lineShape;
    }

    GlobalData.optManager.DrawNewObject(lineShape, event);
    console.log("O.ToolOpt DrawNewLine output: void");
  }

  /**
   * Callback function that processes shape stamping or drag-drop operations
   * @param context - The context object (typically 'this' reference)
   * @param shapeType - The type of shape to stamp or drag-drop
   * @returns void
   */
  StampOrDragDropCallback(context, shapeType) {
    console.log("O.ToolOpt StampOrDragDropCallback input:", context, shapeType);

    var result;
    var shapeTypes = ConstantData.SDRShapeTypes;

    GlobalData.optManager.StampTimeout = null;

    if (shapeType !== 'textLabel') {
      // ConstantData.DocumentContext.ShapeTool = shapeType;
    }

    var isDragDropMode = false;

    if (isDragDropMode) {
      result = false;
      GlobalData.optManager.UnbindDragDropOrStamp();
    } else {
      result = true;
    }

    switch (shapeType) {
      case 'textLabel':
        context.StampTextLabel(false, false);
        break;
      case shapeTypes.SED_S_Rect:
        context.StampRectangle(result, false);
        break;
      case shapeTypes.SED_S_RRect:
        context.StampRoundRect(result, false);
        break;
      case shapeTypes.SED_S_Circ:
        context.StampCircle(result, true);
        break;
      case shapeTypes.SED_S_Oval:
        context.StampCircle(result, false);
        break;
      default:
        context.StampShape(shapeType, result, false);
    }

    console.log("O.ToolOpt StampOrDragDropCallback output: void");
  }

  /**
   * Creates and stamps a rectangle shape onto the drawing
   * @param isDragDropMode - Whether to use drag-drop mode or mouse stamp mode
   * @param isSquare - Whether to create a square (true) or rectangle (false)
   * @returns void
   */
  StampRectangle(isDragDropMode, isSquare) {
    console.log("O.ToolOpt StampRectangle input:", isDragDropMode, isSquare);

    let width, height;
    const sessionBlock = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);

    // Set dimensions based on whether we want a square or rectangle
    if (isSquare) {
      width = ConstantData.Defines.Shape_Square;
      height = ConstantData.Defines.Shape_Square;
    } else {
      width = ConstantData.Defines.Shape_Width;
      height = ConstantData.Defines.Shape_Height;
    }

    // Create shape attributes
    const shapeAttributes = {
      Frame: {
        x: -1000,
        y: -1000,
        width: width,
        height: height
      },
      TextGrow: ConstantData.TextGrowBehavior.PROPORTIONAL,
      shapeparam: sessionBlock.def.rrectparam,
      moreflags: ConstantData.ObjMoreFlags.SED_MF_FixedRR,
      ObjGrow: ConstantData.GrowBehavior.ALL
    };

    // Add proportional growth behavior if it's a square
    if (isSquare) {
      shapeAttributes.ObjGrow = ConstantData.GrowBehavior.PROPORTIONAL;
    }

    // Create the rectangle shape
    const rectangleShape = new Rect(shapeAttributes);

    // Use mouse stamp method to place the shape
    GlobalData.optManager.MouseStampNewShape(rectangleShape, true, true, true, null, null);

    console.log("O.ToolOpt StampRectangle output: void");
  }

  /**
   * Creates and stamps a round rectangle shape onto the drawing
   * @param isDragDropMode - Whether to use drag-drop mode or mouse stamp mode
   * @param isSquare - Whether to create a square (true) or rectangle (false)
   * @returns void
   */
  StampRoundRect(isDragDropMode, isSquare) {
    console.log("O.ToolOpt StampRoundRect input:", isDragDropMode, isSquare);

    let width, height;
    const sessionBlock = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);

    // Set dimensions based on whether we want a square or rectangle
    if (isSquare) {
      width = ConstantData.Defines.Shape_Square;
      height = ConstantData.Defines.Shape_Square;
    } else {
      width = ConstantData.Defines.Shape_Width;
      height = ConstantData.Defines.Shape_Height;
    }

    // Create shape attributes
    const shapeAttributes = {
      Frame: {
        x: -1000,
        y: -1000,
        width: width,
        height: height
      },
      TextGrow: ConstantData.TextGrowBehavior.PROPORTIONAL,
      shapeparam: sessionBlock.def.rrectparam,
      moreflags: ConstantData.ObjMoreFlags.SED_MF_FixedRR,
      ObjGrow: ConstantData.GrowBehavior.ALL
    };

    // Add proportional growth behavior if it's a square
    if (isSquare) {
      shapeAttributes.ObjGrow = ConstantData.GrowBehavior.PROPORTIONAL;
    }

    // Create the rounded rectangle shape
    const roundRectShape = new RRect(shapeAttributes);

    // Use mouse stamp method to place the shape
    GlobalData.optManager.MouseStampNewShape(roundRectShape, true, true, true, null, null);

    console.log("O.ToolOpt StampRoundRect output: void");
  }

  /**
   * Creates and stamps a circle or oval shape onto the drawing
   * @param isDragDropMode - Whether to use drag-drop mode or mouse stamp mode
   * @param isCircle - Whether to create a circle (true) or oval (false)
   * @returns void
   */
  StampCircle(isDragDropMode, isCircle) {
    console.log("O.ToolOpt StampCircle input:", isDragDropMode, isCircle);

    let width, height;

    // Set dimensions based on whether we want a circle or oval
    if (isCircle) {
      width = ConstantData.Defines.Shape_Square;
      height = ConstantData.Defines.Shape_Square;
    } else {
      width = ConstantData.Defines.Shape_Width;
      height = ConstantData.Defines.Shape_Height;
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
        TextGrow: ConstantData.TextGrowBehavior.PROPORTIONAL,
        ObjGrow: ConstantData.GrowBehavior.PROPORTIONAL
      };
    } else {
      shapeAttributes = {
        Frame: {
          x: initialX,
          y: initialY,
          width: width,
          height: height
        },
        TextGrow: ConstantData.TextGrowBehavior.PROPORTIONAL
      };
    }

    // Create the oval shape
    const ovalShape = new Oval(shapeAttributes);

    // Use mouse stamp method to place the shape
    GlobalData.optManager.MouseStampNewShape(ovalShape, true, true, true, null, null);

    console.log("O.ToolOpt StampCircle output: void");
  }

  /**
   * Creates and stamps a text label shape onto the drawing
   * @param isDragDropMode - Whether to use drag-drop mode
   * @param skipTargetCheck - Whether to skip target selection check
   * @returns void
   */
  StampTextLabel(isDragDropMode, skipTargetCheck) {
    console.log("O.ToolOpt StampTextLabel input:", isDragDropMode, skipTargetCheck);

    // Get the text edit session block
    var textEditSession = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theTEDSessionBlockID, false);

    // Check if we need to handle existing active text editing
    if (skipTargetCheck || textEditSession.theActiveTextEditObjectID == -1) {
      // If not skipping target check, try to activate text edit on selected object
      if (!skipTargetCheck) {
        var targetID = GlobalData.optManager.GetTargetSelect();
        if (targetID >= 0) {
          var targetObject = GlobalData.optManager.GetObjectPtr(targetID, false);
          if (targetObject && targetObject.AllowTextEdit()) {
            var svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(targetID);
            GlobalData.optManager.ActivateTextEdit(svgElement);
            console.log("O.ToolOpt StampTextLabel output: void - activated edit on existing text");
            return;
          }
        }
      }
    } else {
      GlobalData.optManager.DeactivateTextEdit();
    }

    // Get session data and default text style
    var sessionData = GlobalData.objectStore.GetObject(GlobalData.optManager.theSEDSessionBlockID).Data;
    var defaultTextStyle = Utils4.FindStyle(ConstantData.Defines.TextBlockStyle);

    if (defaultTextStyle == null) {
      defaultTextStyle = sessionData.def.style;
    }

    // Create text shape attributes
    var textAttributes = {
      StyleRecord: $.extend(true, {}, defaultTextStyle),
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
      TextGrow: ConstantData.TextGrowBehavior.HORIZONTAL,
      TextAlign: ConstantData.TextAlign.LEFT,
      flags: ConstantData.ObjFlags.SEDO_TextOnly
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
    var initialTextStyle = GlobalData.optManager.CalcDefaultInitialTextStyle(textShape.StyleRecord.Text);
    var textMetrics = GlobalData.optManager.svgDoc.CalcStyleMetrics(initialTextStyle);

    // Set shape offset and height
    GlobalData.optManager.stampShapeOffsetX = 0;
    GlobalData.optManager.stampShapeOffsetY = textMetrics.ascent;
    textShape.Frame.height = textMetrics.height;

    // Deactivate text edit if not in drag-drop mode
    if (!isDragDropMode) {
      GlobalData.optManager.DeactivateTextEdit(false);
    }

    // Stamp the text shape and activate text editing
    GlobalData.optManager.StampNewTextShapeOnTap(
      textShape,
      false,
      false,
      false,
      isDragDropMode,
      this.StampCallback,
      { bActivateText: true }
    );

    console.log("O.ToolOpt StampTextLabel output: void");
  }

  /**
   * Creates and stamps a shape based on the specified shape type
   * @param shapeType - The type of shape to stamp
   * @param isDragMode - Whether the shape is being dragged (vs. placed directly)
   * @returns void
   */
  StampShape(shapeType, isDragMode) {
    console.log("U.ToolUtil.StampShape - Input:", shapeType, isDragMode);

    let newShape;
    const shapeTypes = ConstantData.SDRShapeTypes;
    const defaultFrame = {
      x: -1000,
      y: -1000,
      width: ConstantData.Defines.Shape_Width,
      height: ConstantData.Defines.Shape_Height
    };

    // Get shape parameters for the specified shape type
    const shapeParams = GlobalData.optManager.GetShapeParams(shapeType, defaultFrame);

    // Configure shape attributes
    const shapeAttributes = {
      Frame: defaultFrame,
      TextGrow: ConstantData.TextGrowBehavior.PROPORTIONAL,
      dataclass: shapeParams.dataclass,
      shapeparam: shapeParams.shapeparam
    };

    // If it's a square shape, set proportional grow behavior
    if (shapeParams.bIsSquare) {
      shapeAttributes.ObjGrow = ConstantData.GrowBehavior.PROPORTIONAL;
    }

    // Create the appropriate shape object based on dataclass
    switch (shapeParams.dataclass) {
      case shapeTypes.SED_S_Rect:
        newShape = new Rect(shapeAttributes);
        break;

      case shapeTypes.SED_S_RRect:
        newShape = new RRect(shapeAttributes);
        break;

      case shapeTypes.SED_S_Oval:
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
    GlobalData.optManager.MouseStampNewShape(newShape, true, true, true, null, null);

    console.log("U.ToolUtil.StampShape - Output: Shape stamped successfully");
  }

  /**
   * Rotates the selected shapes by a specified angle
   * @param rotationAngle - The angle (in degrees) to rotate the selected shapes
   * @returns void
   */
  RotateShapes(rotationAngle) {
    console.log("O.ToolOpt RotateShapes input:", rotationAngle);

    try {
      GlobalData.optManager.CloseEdit();
      GlobalData.optManager.RotateShapes(parseInt(rotationAngle, 10));
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }

    console.log("O.ToolOpt RotateShapes output: void");
  }

  /**
   * Aligns selected shapes based on the specified alignment type
   * @param alignmentType - The type of alignment to apply to selected shapes
   * @returns void
   */
  AlignShapes(alignmentType) {
    console.log("O.ToolOpt AlignShapes input:", alignmentType);

    try {
      GlobalData.optManager.CloseEdit();
      GlobalData.optManager.AlignShapes(alignmentType);
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }

    console.log("O.ToolOpt AlignShapes output: void");
  }

  /**
   * Deletes the currently selected objects from the drawing
   * @returns void
   */
  DeleteSelectedObjects() {
    console.log("O.ToolOpt DeleteSelectedObjects input: no parameters");

    try {
      GlobalData.optManager.CloseEdit();
      GlobalData.optManager.DeleteSelectedObjects();
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }

    console.log("O.ToolOpt DeleteSelectedObjects output: void");
  }

  /**
   * Undoes the last operation in the drawing
   * @returns void
   */
  Undo() {
    console.log("O.ToolOpt Undo input: no parameters");

    try {
      GlobalData.optManager.Undo();
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }

    console.log("O.ToolOpt Undo output: void");
  }

  /**
   * Redoes the last undone operation in the drawing
   * @returns void
   */
  Redo() {
    console.log("O.ToolOpt Redo input: no parameters");

    try {
      GlobalData.optManager.Redo();
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }

    console.log("O.ToolOpt Redo output: void");
  }

  /**
   * Copies the currently selected objects to the clipboard
   * @returns void
   */
  Copy() {
    console.log("O.ToolOpt Copy input: no parameters");

    try {
      let clipboardSuccess = false;

      try {
        clipboardSuccess = document.execCommand('copy');
      } catch (error) {
        throw error;
      }

      if (!clipboardSuccess) {
        GlobalData.optManager.CopyObjects();
      }
    } catch (error) {
      GlobalData.optManager.RestorePrimaryStateManager();
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }

    console.log("O.ToolOpt Copy output: void");
  }

  /**
   * Cuts the currently selected objects to the clipboard
   * @returns void
   */
  Cut() {
    console.log("O.ToolOpt Cut input: no parameters");

    try {
      let clipboardSuccess = false;

      try {
        clipboardSuccess = document.execCommand('cut');
      } catch (error) {
        throw error;
      }

      if (!clipboardSuccess) {
        GlobalData.optManager.CutObjects();
      }
    } catch (error) {
      GlobalData.optManager.RestorePrimaryStateManager();
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }

    console.log("O.ToolOpt Cut output: void");
  }

  /**
   * Pastes previously copied objects from the clipboard to the drawing
   * @param eventData - Optional event data containing paste position information
   * @returns void
   */
  Paste(eventData) {
    console.log("O.ToolOpt Paste input:", eventData);

    try {
      GlobalData.optManager.PastePoint = null;

      if (eventData && GlobalData.optManager.RightClickParams) {
        GlobalData.optManager.PastePoint = GlobalData.optManager.RightClickParams.HitPt;
      }

      Clipboard.PasteFromUIaction();
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }

    console.log("O.ToolOpt Paste output: void");
  }

  /**
   * Sends the selected objects to the back of the drawing order
   * @returns void
   */
  SendToBackOf() {
    console.log("O.ToolOpt SendToBackOf input: no parameters");

    try {
      GlobalData.optManager.CloseEdit();
      GlobalData.optManager.SendToBackOf();
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }

    console.log("O.ToolOpt SendToBackOf output: void");
  }

  /**
   * Brings the selected objects to the front of the drawing order
   * @returns void
   */
  BringToFrontOf() {
    console.log("O.ToolOpt BringToFrontOf input: no parameters");

    try {
      GlobalData.optManager.CloseEdit();
      GlobalData.optManager.BringToFrontOf();
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }

    console.log("O.ToolOpt BringToFrontOf output: void");
  }

  /**
   * Groups the currently selected shapes together
   * @returns void
   */
  GroupSelectedShapes() {
    console.log("O.ToolOpt GroupSelectedShapes input: no parameters");

    try {
      GlobalData.optManager.CloseEdit();
      // Parameters: autoAddShapes, additionalObjects, createOuterFrame, preserveOriginals, createVisualGroup
      GlobalData.optManager.GroupSelectedShapes(false, null, false, false, true);
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }

    console.log("O.ToolOpt GroupSelectedShapes output: void");
  }

  /**
   * Ungroups the currently selected grouped shapes
   * @returns void
   */
  UngroupSelectedShapes() {
    console.log("O.ToolOpt UngroupSelectedShapes input: no parameters");

    try {
      GlobalData.optManager.CloseEdit();
      GlobalData.optManager.UngroupSelectedShapes();
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }

    console.log("O.ToolOpt UngroupSelectedShapes output: void");
  }

  /**
   * Flips the selected objects horizontally
   * @returns void
   */
  FlipHorizontal() {
    console.log("O.ToolOpt FlipHorizontal input: no parameters");

    try {
      GlobalData.optManager.CloseEdit();
      GlobalData.optManager.FlipShapes(ConstantData.ExtraFlags.SEDE_FlipHoriz);
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }

    console.log("O.ToolOpt FlipHorizontal output: void");
  }

  /**
   * Flips the selected objects vertically
   * @returns void
   */
  FlipVertical() {
    console.log("O.ToolOpt FlipVertical input: no parameters");

    try {
      GlobalData.optManager.CloseEdit();
      GlobalData.optManager.FlipShapes(ConstantData.ExtraFlags.SEDE_FlipVert);
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }

    console.log("O.ToolOpt FlipVertical output: void");
  }

  /**
   * Makes selected objects the same size according to specified dimension type
   * @param dimensionType - Integer specifying which dimension to make the same (width, height, or both)
   * @returns void
   */
  MakeSameSize(dimensionType) {
    console.log("O.ToolOpt MakeSameSize input:", dimensionType);

    try {
      GlobalData.optManager.CloseEdit();
      GlobalData.optManager.MakeSameSize(parseInt(dimensionType, 10));
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
    }

    console.log("O.ToolOpt MakeSameSize output: void");
  }

  /**
   * Gets the current selection context information
   * @returns Object containing information about the current selection state
   */
  GetSelectionContext() {
    console.log("O.ToolOpt GetSelectionContext input: no parameters");

    try {
      const context = GlobalData.optManager.GetSelectionContext();
      console.log("O.ToolOpt GetSelectionContext output:", context);
      return context;
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
    }
  }

  /**
   * Checks if text editing is currently active
   * @returns Boolean indicating whether text editing is active
   */
  IsActiveTextEdit() {
    console.log("O.ToolOpt IsActiveTextEdit input: no parameters");

    try {
      const textEditSession = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theTEDSessionBlockID, false);
      const isActive = textEditSession.theActiveTextEditObjectID !== -1;

      console.log("O.ToolOpt IsActiveTextEdit output:", isActive);
      return isActive;
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
      console.log("O.ToolOpt IsActiveTextEdit output: undefined (error)");
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
    console.log("O.ToolOpt HandleKeyDown input:", keyEvent, targetElement, eventModifier);

    try {
      const result = GlobalData.optManager.HandleKeyDown(keyEvent, targetElement, eventModifier);
      console.log("O.ToolOpt HandleKeyDown output:", result);
      return result;
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
      console.log("O.ToolOpt HandleKeyDown output: undefined (error)");
    }
  }

  /**
   * Duplicates the currently selected objects
   * @returns void
   */
  Duplicate() {
    console.log("O.ToolOpt Duplicate input: no parameters");

    try {
      GlobalData.optManager.DuplicateObjects();
      console.log("O.ToolOpt Duplicate output: void");
    } catch (error) {
      GlobalData.optManager.RestorePrimaryStateManager();
      GlobalData.optManager.ExceptionCleanup(error);
      console.log("O.ToolOpt Duplicate output: void (error)");
    }
  }

  /**
   * Handles keyboard key press events
   * @param keyEvent - The keyboard event object
   * @param targetElement - The DOM element target
   * @returns Result of the key press handling operation
   */
  HandleKeyPress(keyEvent, targetElement) {
    console.log("O.ToolOpt HandleKeyPress input:", keyEvent, targetElement);

    try {
      const result = GlobalData.optManager.HandleKeyPress(keyEvent, targetElement);
      console.log("O.ToolOpt HandleKeyPress output:", result);
      return result;
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
      console.log("O.ToolOpt HandleKeyPress output: undefined (error)");
    }
  }

  /**
   * Handles drag-drop operations for symbols
   * @param contextObject - The context object containing callback references
   * @param symbolData - The data for the symbol to be dragged/dropped
   * @returns void
   */
  DragDropSymbol(contextObject, symbolData) {
    console.log("U.ToolUtil.dragDropSymbol - Input:", contextObject, symbolData);

    this.StampOrDragDropNewSymbol(contextObject, symbolData);

    console.log("U.ToolUtil.dragDropSymbol - Output: void");
  }

  /**
   * Creates and handles stamping or drag-dropping of a new SVG symbol onto the drawing
   * @param symbolData - The symbol data or identifier
   * @param useDragDrop - Whether to use drag-drop mode (true) or stamp mode (false)
   * @returns void
   */
  StampOrDragDropNewSymbol(symbolData, useDragDrop) {
    console.log("O.ToolOpt StampOrDragDropNewSymbol input:", symbolData, useDragDrop);

    // Clear any previous replace symbol ID
    GlobalData.optManager.ReplaceSymbolID = null;

    // SVG fragment definitions
    const pumpSymbolSVG = '<g><g fill="##FILLCOLOR=#7F7F7F##" transform="translate(0,0)"><g class="pump"> <circle stroke="##LINECOLOR=#000000##" cy="16" cx="15.955" r="9.9609003" class="pump-background" /> <g transform="translate(16,16)"> <path d="M -5,8.1369 V -8.1191 L 9.078,0.0091 Z" class="rotating-middle" stroke="##LINECOLOR=#000000##" stroke-width="##LINETHICK=1##"/></g></g></g></g>';
    const heatPumpSymbolSVG = '<g class="heat-pump" stroke-linejoin="round" stroke="#000" transform="translate(39 -2.3842e-7)" fill="currentColor"> <rect class="inner" height="27.718" width="27.718" y="2.141" x="-36.859" stroke-width="1.0868"></rect> <g transform="matrix(1.0276 0 0 1.0276 -39.441 -.44130)" stroke-linecap="round" stroke-miterlimit="1" stroke-width="1.3509"> <path d="m16.234 16.944 8.6837-6.894-8.6837-6.894v3.447h-13.152v6.894h13.152z" fill="#ce2824"></path> <path d="m15.766 28.844-8.6837-6.894 8.6837-6.894v3.447h13.152v6.894h-13.152z" fill="#3238db"></path></g></g>';

    // Create a new SVG Fragment Symbol
    const symbolObject = new SVGFragmentSymbol(null);
    symbolObject.StyleRecord = new QuickStyle();

    // Use the heat pump SVG fragment
    symbolObject.SVGFragment = heatPumpSymbolSVG;

    // Add the symbol to the drawing using drag-drop mode
    if (symbolObject) {
      GlobalData.optManager.DragDropNewShape(symbolObject, true, true, false, null, null);
    }

    console.log("O.ToolOpt StampOrDragDropNewSymbol output: void");
  }

  /**
   * Creates and draws a new segmented line shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for line properties
   * @returns The created segmented line shape if in drawing mode
   */
  DrawNewSegLine(isDrawing, eventObject, referenceObject) {
    console.log("O.ToolOpt DrawNewSegLine input:", isDrawing, eventObject, referenceObject);

    let attributes;
    const sessionData = GlobalData.objectStore.GetObject(GlobalData.optManager.theSEDSessionBlockID).Data;
    const isVerticalText = 0 == (sessionData.def.textflags & ConstantData.TextFlags.SED_TF_HorizText);
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
        TextGrow: ConstantData.TextGrowBehavior.HORIZONTAL,
        TextAlign: ConstantData.DocumentContext.CurrentTextAlignment,
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
      const textBlockStyle = Utils4.FindStyle(ConstantData.Defines.TextBlockStyle);
      lineStyle.Text.Paint.Color = textBlockStyle.Text.Paint.Color;
    }

    segmentedLineShape.StyleRecord = lineStyle;

    // Set line hopping if allowed
    if (sessionData.flags & ConstantData.SessionFlags.SEDS_AllowHops) {
      segmentedLineShape.flags = Utils2.SetFlag(segmentedLineShape.flags, ConstantData.ObjFlags.SEDO_LineHop, true);
    }

    // Return shape if in drawing mode, otherwise draw it
    if (isDrawing) {
      console.log("O.ToolOpt DrawNewSegLine output:", segmentedLineShape);
      return segmentedLineShape;
    }

    GlobalData.optManager.DrawNewObject(segmentedLineShape, eventObject);
    console.log("O.ToolOpt DrawNewSegLine output: void");
  }

  /**
   * Creates and draws a new arc segmented line shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for line properties
   * @returns The created arc segmented line shape if in drawing mode
   */
  DrawNewArcSegLine(isDrawing, eventObject, referenceObject) {
    console.log("O.ToolOpt DrawNewArcSegLine input:", isDrawing, eventObject, referenceObject);

    let attributes;
    const sessionData = GlobalData.objectStore.GetObject(GlobalData.optManager.theSEDSessionBlockID).Data;
    const isVerticalText = 0 == (sessionData.def.textflags & ConstantData.TextFlags.SED_TF_HorizText);
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
        TextGrow: ConstantData.TextGrowBehavior.HORIZONTAL,
        TextAlign: ConstantData.DocumentContext.CurrentTextAlignment,
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
      const textBlockStyle = Utils4.FindStyle(ConstantData.Defines.TextBlockStyle);
      lineStyle.Text.Paint.Color = textBlockStyle.Text.Paint.Color;
    }

    arcSegmentedLineShape.StyleRecord = lineStyle;

    // Set line hopping if allowed
    if (sessionData.flags & ConstantData.SessionFlags.SEDS_AllowHops) {
      arcSegmentedLineShape.flags = Utils2.SetFlag(arcSegmentedLineShape.flags, ConstantData.ObjFlags.SEDO_LineHop, true);
    }

    // Return shape if in drawing mode, otherwise draw it
    if (isDrawing) {
      console.log("O.ToolOpt DrawNewArcSegLine output:", arcSegmentedLineShape);
      return arcSegmentedLineShape;
    }

    GlobalData.optManager.DrawNewObject(arcSegmentedLineShape, eventObject);
    console.log("O.ToolOpt DrawNewArcSegLine output: void");
  }

  /**
   * Creates and draws a new polyline shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for polyline properties
   * @returns The created polyline shape if in drawing mode
   */
  DrawNewPolyLine(isDrawing, eventObject, referenceObject) {
    console.log("O.ToolOpt DrawNewPolyLine input:", isDrawing, eventObject, referenceObject);

    let attributes;
    const sessionData = GlobalData.objectStore.GetObject(GlobalData.optManager.theSEDSessionBlockID).Data;
    const isVerticalText = 0 == (sessionData.def.textflags & ConstantData.TextFlags.SED_TF_HorizText);
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
        TextGrow: ConstantData.TextGrowBehavior.HORIZONTAL,
        TextAlign: ConstantData.DocumentContext.CurrentTextAlignment,
        TextDirection: isVerticalText,
        Dimensions: sessionData.dimensions,
        extraflags: ConstantData.ExtraFlags.SEDE_SideKnobs,
        bOverrideDefaultStyleOnDraw: true
      };

      // Add initial line segments
      attributes.polylist.segs.push(
        new PolySeg(ConstantData.LineType.LINE, 0, 0)
      );
      attributes.polylist.segs.push(
        new PolySeg(ConstantData.LineType.LINE, 0, 0)
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
      const textBlockStyle = Utils4.FindStyle(ConstantData.Defines.TextBlockStyle);
      lineStyle.Text.Paint.Color = textBlockStyle.Text.Paint.Color;
    }

    polyLineShape.StyleRecord = lineStyle;

    // Return shape if in drawing mode, otherwise draw it
    if (isDrawing) {
      console.log("O.ToolOpt DrawNewPolyLine output:", polyLineShape);
      return polyLineShape;
    }

    GlobalData.optManager.DrawNewObject(polyLineShape, eventObject);
    console.log("O.ToolOpt DrawNewPolyLine output: void");
  }

  /**
   * Creates and draws a new polyline container shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for polyline container properties
   * @returns The created polyline container shape if in drawing mode
   */
  DrawNewPolyLineContainer(isDrawing, eventObject, referenceObject) {
    console.log("O.ToolOpt DrawNewPolyLineContainer input:", isDrawing, eventObject, referenceObject);

    let attributes;
    const sessionData = GlobalData.objectStore.GetObject(GlobalData.optManager.theSEDSessionBlockID).Data;
    const sessionBlock = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
    const isVerticalText = 0 == (sessionData.def.textflags & ConstantData.TextFlags.SED_TF_HorizText);

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
        TextGrow: ConstantData.TextGrowBehavior.HORIZONTAL,
        TextAlign: ConstantData.DocumentContext.CurrentTextAlignment,
        TextDirection: isVerticalText,
        Dimensions: sessionData.dimensions
      };

      // Add initial line segments
      attributes.polylist.segs.push(
        new PolySeg(ConstantData.LineType.LINE, 0, 0)
      );
      attributes.polylist.segs.push(
        new PolySeg(ConstantData.LineType.LINE, 0, 0)
      );
    }

    // Create the polyline container shape
    const polyLineContainerShape = new Instance.Shape.PolyLineContainer(attributes);

    // Return shape if in drawing mode, otherwise draw it
    if (isDrawing) {
      console.log("O.ToolOpt DrawNewPolyLineContainer output:", polyLineContainerShape);
      return polyLineContainerShape;
    }

    GlobalData.optManager.DrawNewObject(polyLineContainerShape, eventObject);
    console.log("O.ToolOpt DrawNewPolyLineContainer output: void");
  }

  /**
   * Creates and draws a new freehand line shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for line properties
   * @returns The created freehand line shape if in drawing mode
   */
  DrawNewFreehandLine(isDrawing, eventObject, referenceObject) {
    console.log("O.ToolOpt DrawNewFreehandLine input:", isDrawing, eventObject, referenceObject);

    let attributes;
    const sessionData = GlobalData.objectStore.GetObject(GlobalData.optManager.theSEDSessionBlockID).Data;

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
      console.log("O.ToolOpt DrawNewFreehandLine output:", freehandLineShape);
      return freehandLineShape;
    }

    GlobalData.optManager.DrawNewObject(freehandLineShape, eventObject);
    console.log("O.ToolOpt DrawNewFreehandLine output: void");
  }

  /**
   * Creates and draws a new arc line shape
   * @param isDrawing - Whether in drawing mode
   * @param eventObject - The event object for drawing
   * @param referenceObject - Reference object for line properties
   * @returns The created arc line shape if in drawing mode
   */
  DrawNewArcLine(isDrawing, eventObject, referenceObject) {
    console.log("O.ToolOpt DrawNewArcLine input:", isDrawing, eventObject, referenceObject);

    let attributes;
    const sessionData = GlobalData.objectStore.GetObject(GlobalData.optManager.theSEDSessionBlockID).Data;
    const isVerticalText = 0 == (sessionData.def.textflags & ConstantData.TextFlags.SED_TF_HorizText);
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
        TextGrow: ConstantData.TextGrowBehavior.HORIZONTAL,
        TextAlign: ConstantData.DocumentContext.CurrentTextAlignment,
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
      const textBlockStyle = Utils4.FindStyle(ConstantData.Defines.TextBlockStyle);
      lineStyle.Text.Paint.Color = textBlockStyle.Text.Paint.Color;
    }

    arcLineShape.StyleRecord = lineStyle;

    // Set line hopping if allowed
    if (sessionData.flags & ConstantData.SessionFlags.SEDS_AllowHops) {
      arcLineShape.flags = Utils2.SetFlag(arcLineShape.flags, ConstantData.ObjFlags.SEDO_LineHop, true);
    }

    // Return shape if in drawing mode, otherwise draw it
    if (isDrawing) {
      console.log("O.ToolOpt DrawNewArcLine output:", arcLineShape);
      return arcLineShape;
    }

    GlobalData.optManager.DrawNewObject(arcLineShape, eventObject);
    console.log("O.ToolOpt DrawNewArcLine output: void");
  }

  /**
   * Selects all objects in the drawing
   * @returns void
   */
  SelectAllObjects() {
    console.log("O.ToolOpt SelectAllObjects input: no parameters");

    try {
      GlobalData.optManager.SelectAllObjects();
    } catch (error) {
      GlobalData.optManager.ExceptionCleanup(error);
    }

    console.log("O.ToolOpt SelectAllObjects output: void");
  }

  /**
   * Saves the current drawing to local storage
   * @returns void
   */
  SaveAs() {
    console.log("U.ToolUtil SaveAs input: no parameters");

    GlobalData.optManager.CloseEdit();

    // save data to local storage
    DataOpt.SaveToLocal();

    console.log("U.ToolUtil SaveAs output: void");
  }

}

export default ToolUtil

