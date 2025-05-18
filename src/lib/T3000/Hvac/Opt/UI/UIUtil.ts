

import T3Gv from '../../Data/T3Gv';
import EvtUtil from "../../Event/EvtUtil";
import Utils1 from "../../Util/Utils1";
import Utils2 from "../../Util/Utils2";
import Instance from "../../Data/Instance/Instance";
import NvConstant from '../../Data/Constant/NvConstant';
import TextFmtData from "../../Model/TextFmtData";
import OptConstant from "../../Data/Constant/OptConstant";
import StyleConstant from "../../Data/Constant/StyleConstant";
import T3Util from "../../Util/T3Util";
import ObjectUtil from "../Data/ObjectUtil";
import RulerUtil from "../UI/RulerUtil";
import OptCMUtil from "../Opt/OptCMUtil";
import TextUtil from "../Opt/TextUtil";
import SelectUtil from "../Opt/SelectUtil";
import SvgUtil from "../Opt/SvgUtil";
import LayerUtil from '../Opt/LayerUtil';
import QuasarUtil from '../Quasar/QuasarUtil';
import '../../Util/T3Hammer';
import DataOpt from '../Data/DataOpt';

class UIUtil {

  /**
   * Shows a contextual menu at a specified position
   * @param element - The DOM element or selector for the contextual menu
   * @param positionX - The X position where to show the dropdown
   * @param positionY - The Y position where to show the dropdown
   * @returns void
   */
  static ShowContextMenu(isShow, element, positionX, positionY) {
    QuasarUtil.ShowContextMenu(isShow);
  }

  static ShowObjectConfig(isShow) {
    QuasarUtil.ShowObjectConfig(isShow);
  }

  static ShowFrame(isShowFrame: boolean) {
    T3Util.Log('= U.UIUtil: ShowFrame - Input:', { isShowFrame });

    const isShowRulers = T3Gv.docUtil.docConfig.showRulers;

    if (!isShowRulers) {
      T3Util.Log('= U.UIUtil: ShowFrame - Output: Rulers are not shown');
      return;
    }

    // Double show frame details
    T3Util.Log('= U.UIUtil: ShowFrame - Output: Frame visibility set to', isShowFrame);
  }

  static UpdateDisplayCoordinates(dimensions, position, cursorType, drawingObject) {

    // Set default cursor type if not provided
    if (cursorType == null) {
      cursorType = "DEFAULT";
    }

    // Update ruler displays if rulers are enabled
    if (T3Gv.docUtil.docConfig.showRulers) {
      let showFractionalInches = 0;
      let showFeetAsInches = 0;
      const useFeet = T3Gv.docUtil.rulerConfig.useInches &&
        T3Gv.docUtil.rulerConfig.units === NvConstant.RulerUnit.Feet;

      // Configure display options for feet/inch mode
      if (useFeet) {
        showFractionalInches = showFeetAsInches = NvConstant.DimensionFlags.ShowFractionalInches;
        if (drawingObject) {
          showFeetAsInches = Utils2.SetFlag(
            showFractionalInches,
            NvConstant.DimensionFlags.ShowFeetAsInches,
            (drawingObject.Dimensions & NvConstant.DimensionFlags.ShowFeetAsInches) > 0
          );
        }
      }

      // Update dimension display
      if (dimensions) {
        const xLength = RulerUtil.GetLengthInRulerUnits(dimensions.x, false, T3Gv.docUtil.rulerConfig.originx, showFractionalInches);
        const yLength = RulerUtil.GetLengthInRulerUnits(dimensions.y, false, T3Gv.docUtil.rulerConfig.originy, showFractionalInches);
        const width = RulerUtil.GetLengthInRulerUnits(dimensions.width, false, null, showFeetAsInches);
        const height = RulerUtil.GetLengthInRulerUnits(dimensions.height, false, null, showFeetAsInches);

        // Helper function to format number values for display (assuming it's defined elsewhere)
        const formatValue = (value) => value ? value : "";

        T3Util.Log('= U.UIUtil: Formatted Values: Origin x,y,w,h', xLength, yLength, width, height);
        T3Util.Log('= U.UIUtil: Formatted Values: Dimension x,y,w,h', dimensions.x, dimensions.y, dimensions.width, dimensions.height);

        const xVal = formatStringWithPadding(formatNumberToString(xLength, useFeet));
        const yVal = formatStringWithPadding(formatNumberToString(yLength, useFeet));
        const wVal = formatStringWithPadding(formatNumberToString(width, useFeet));
        const hVal = formatStringWithPadding(formatNumberToString(height, useFeet));

        T3Util.Log('= U.UIUtil: Formatted Values: After x,y,w,h', xVal, yVal, wVal, hVal);

        var objNewFrame = {
          translate: [dimensions.x, dimensions.y],
          width: dimensions.width,
          height: dimensions.height,
        };

        // if (T3Gv.refreshPosition) {
        //   QuasarUtil.UpdateCurrentObjectPos(objNewFrame);
        //   T3Util.Log('= U.UIUtil QuasarUtil.UpdateCurrentObjectPos', dimensions.x, dimensions.y, dimensions.width, dimensions.height);
        // }
      }

      // Constrain position to document bounds
      if (position) {
        position.x = Math.max(0, position.x);
        position.y = Math.max(0, position.y);

        const sessionBlock = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
        position.x = Math.min(sessionBlock?.dim?.x, position?.x);
        position.y = Math.min(sessionBlock?.dim?.y, position?.y);
      }
    }

    /**
     * Formats a number as a string based on ruler settings
     * @param value - The numeric value to format
     * @param useSpecialFormat - Whether to use special formatting for feet/inches
     * @returns Formatted string representation
     */
    function formatNumberToString(value, useSpecialFormat) {
      let result = value;
      let decimalPlaces = 2;

      decimalPlaces = T3Gv.docUtil.rulerConfig.dp;

      if (useSpecialFormat) return value;

      // If showing pixels, round to integers
      if (T3Gv.docUtil.rulerConfig.showpixels) {
        return value.toFixed(0);
      }

      // Format with specified decimal places if possible
      if (value.toFixed != null) {
        result = value.toFixed(decimalPlaces);
      }

      // Handle special formatting for feet/inches notation
      if (useSpecialFormat) {
        const inchIndex = result.indexOf('"');
        const feetIndex = result.indexOf("'");

        if (inchIndex < 0) {
          result += "    ";
        } else {
          for (let i = feetIndex - inchIndex; i < 4; i++) {
            result += " ";
          }
        }

        for (let i = feetIndex; i < 4; i++) {
          result += " ";
        }
      }
      // Handle decimal formatting
      else {
        let decimalIndex = result.indexOf(".");

        if (decimalIndex < 0) {
          result += ".";
          decimalIndex = result.length - 1;
        }

        if (decimalIndex >= 0) {
          // Pad with zeros to match decimal places
          for (let i = decimalPlaces, len = result.length - decimalIndex - 1; i < len; i++) {
            result += "0";
          }

          // Pad with spaces for alignment
          for (let i = decimalIndex; i < 4; i++) {
            result += " ";
          }
        }
      }

      return result;
    }

    /**
     * Formats a string with padding to maintain consistent width
     * @param text - The text to format
     * @returns Padded string with consistent width
     */
    function formatStringWithPadding(text) {
      const originalLength = text.length;
      let trimmedText = text.trim();

      // Add padding spaces to maintain original length
      for (let i = trimmedText.length; i < originalLength; i++) {
        trimmedText += " ";
      }

      return trimmedText;
    }

    T3Util.Log("= U.UIUtil: UpdateDisplayCoordinates - Output: Coordinates updated in UI");
  }

  static ShowXY(showCoordinates) {
    // T3Util.Log("= U.UIUtil: ShowXY - Input:", { showCoordinates });
    //Show the x and y coordinates of the mouse pointer
    // T3Util.Log("= U.UIUtil: ShowXY - Output: Coordinates display updated");
  }

  /**
   * Gets the current dirty state of the document
   * The dirty state indicates if the document has unsaved changes.
   * @returns True if the document has unsaved changes, false otherwise
   */
  static GetDocDirtyState(): boolean {
    T3Util.Log("= U.UIUtil: GetDocDirtyState - Input: no parameters");

    const isDirty = T3Gv.opt.header.DocIsDirty;

    T3Util.Log("= U.UIUtil: GetDocDirtyState - Output:", isDirty);
    return isDirty;
  }

  /**
   * Sets the document's dirty state and updates related flags
   * This function marks whether the document has unsaved changes and
   * updates the AllowReplace flag which controls whether the document
   * can be replaced without warning.
   *
   * @param isDirty - Whether the document has unsaved changes
   * @param allowReplaceWhenClean - If true and isDirty is false, allows document replacement
   */
  static SetDocDirtyState(isDirty: boolean, allowReplaceWhenClean?: boolean): void {
    T3Util.Log("= U.UIUtil: SetDocDirtyState - Input:", { isDirty, allowReplaceWhenClean });

    // Set the document dirty state
    T3Gv.opt.header.DocIsDirty = isDirty;

    // Update the AllowReplace flag based on dirty state
    if (isDirty) {
      T3Gv.opt.header.AllowReplace = false;
    } else if (allowReplaceWhenClean === true) {
      T3Gv.opt.header.AllowReplace = true;
    }

    T3Util.Log("= U.UIUtil: SetDocDirtyState - Output: Document dirty state set to", isDirty);
  }

  static SetFormatPainter(shouldDisable: boolean, makeSticky: boolean) {
    T3Util.Log("= U.UIUtil: SetFormatPainter - Input:", { shouldDisable, makeSticky });

    let targetObject;
    let tableObject;
    // let activeTableId;
    let tableCell;
    let tableRow;
    let tableCol;

    // If format painter is already active, disable it
    if (T3Gv.opt.crtOpt === OptConstant.OptTypes.FormatPainter) {
      T3Gv.opt.crtOpt = OptConstant.OptTypes.None;
      OptCMUtil.SetEditMode(NvConstant.EditState.Default);
      T3Gv.opt.formatPainterSticky = false;
      T3Util.Log("= U.UIUtil: SetFormatPainter - Output: Format painter disabled");
      return;
    }

    // If not disabling, set up format painter based on current selection/context
    if (!shouldDisable) {
      // Cancel any existing modal operation
      OptCMUtil.CancelOperation();

      // Get current text edit and active table
      const activeTextEdit = TextUtil.GetActiveTextEdit();
      // activeTableId = T3Gv.opt.Table_GetActiveID();

      // CASE 1: If text is being edited, set up text format painter
      if (activeTextEdit != null) {
        T3Gv.opt.crtOpt = OptConstant.OptTypes.FormatPainter;
        T3Gv.opt.formatPainterMode = StyleConstant.FormatPainterModes.Text;
        T3Gv.opt.formatPainterSticky = makeSticky;

        const activeEdit = T3Gv.opt.svgDoc.GetActiveEdit();
        if (activeEdit) {
          T3Gv.opt.formatPainterText = activeEdit.GetSelectedFormat();
          T3Gv.opt.formatPainterStyle = { StyleRecord: {} };
          T3Gv.opt.formatPainterStyle.Text = new TextFmtData();
          TextUtil.TextStyleToText(T3Gv.opt.formatPainterStyle.Text, T3Gv.opt.formatPainterText);
          OptCMUtil.SetEditMode(NvConstant.EditState.FormatPaint);
        }
      }
      // CASE 3: If a shape/object is selected, set up object format painter
      else if ((targetObject = SelectUtil.GetTargetSelect()) >= 0 &&
        (tableObject = ObjectUtil.GetObjectPtr(targetObject, false))) {

        T3Gv.opt.crtOpt = OptConstant.OptTypes.FormatPainter;
        T3Gv.opt.formatPainterSticky = makeSticky;
        T3Gv.opt.formatPainterMode = StyleConstant.FormatPainterModes.Object;
        T3Gv.opt.formatPainterStyle = Utils1.DeepCopy(tableObject.StyleRecord);
        T3Gv.opt.formatPainterStyle.Border = Utils1.DeepCopy(tableObject.StyleRecord.Line);

        // Special handling for images, symbols, and groups
        if ((tableObject.ImageURL ||
          tableObject.SymbolURL ||
          tableObject instanceof Instance.Shape.GroupSymbol) &&
          !(tableObject instanceof Instance.Shape.SvgSymbol)) {

          delete T3Gv.opt.formatPainterStyle.Fill;
          delete T3Gv.opt.formatPainterStyle.Name;

          if (tableObject.StyleRecord.Line.Thickness === 0 ||
            tableObject instanceof Instance.Shape.GroupSymbol) {
            delete T3Gv.opt.formatPainterStyle.Line;
            delete T3Gv.opt.formatPainterStyle.Border;
          }
        }

        T3Gv.opt.formatPainterText = tableObject.GetTextFormat(false, null);

        if (T3Gv.opt.formatPainterText === null) {
          T3Gv.opt.formatPainterText = TextUtil.CalcDefaultInitialTextStyle(T3Gv.opt.formatPainterStyle.Text);
        }

        T3Gv.opt.formatPainterParaFormat = tableObject.GetTextParaFormat(false);
        T3Gv.opt.formatPainterArrows = tableObject.GetArrowheadFormat();
        OptCMUtil.SetEditMode(NvConstant.EditState.FormatPaint);
      }
    }

    T3Util.Log("= U.UIUtil: SetFormatPainter - Output:", {
      mode: T3Gv.opt.formatPainterMode,
      isSticky: T3Gv.opt.formatPainterSticky,
      crtOpt: T3Gv.opt.crtOpt
    });
  }

  /**
   * Initializes the SVG document structure by creating necessary layers and setting up event handlers
   * This function sets up the main document structure with multiple layers for different purposes:
   * - Object layer for the main content
   * - Overlay layer for UI elements (not exported)
   * - Highlight layer for selection highlights
   * - Collaboration layer for multi-user functionality
   * It also configures event handlers for user interactions.
   */
  static InitSvgDocument() {
    // Get the session data from stored object
    const sdData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;
    T3Util.Log("InitSvgDoc dim from T3Gv.stdObj without load storage data", T3Gv.opt.sdDataBlockId, T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data);

    const storedDim = DataOpt.GetSDDataDimensions();
    T3Util.Log("InitSvgDoc dim from storage data", storedDim);

    const screenDim = this.GetScreenDimensions();

    // Set the session data with previous saved dimensions
    sdData.dim.x = storedDim.x;
    sdData.dim.y = storedDim.y;

    T3Util.Log("InitSvgDoc set the block data with previous dim", T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data);

    // var width=screenDim.width;
    // var height=screenDim.height;

    var width = sdData.dim.x;
    var height = sdData.dim.y;

    // Initialize the document work area
    T3Gv.docUtil.InitializeWorkArea({
      svgAreaId: T3Gv.opt.svgDocId,
      documentWidth: width,
      documentHeight: height,
      documentDPI: 100
    });
  }

  static InitT3GvOpt() {
    // Get document object and initialize layers
    T3Gv.opt.svgDoc = T3Gv.docUtil.DocObject();

    // Add and configure the object layer (main content layer)
    T3Gv.opt.svgObjectLayer = T3Gv.opt.svgDoc.AddLayer('svg-object-layer');
    T3Gv.opt.svgDoc.SetDocumentLayer('svg-object-layer');

    // Add and configure the overlay layer (for UI elements)
    T3Gv.opt.svgOverlayLayer = T3Gv.opt.svgDoc.AddLayer('svg-overlay-layer');
    T3Gv.opt.svgOverlayLayer.ExcludeFromExport(true);

    // Add and configure the highlight layer (for highlighting elements)
    T3Gv.opt.svgHighlightLayer = T3Gv.opt.svgDoc.AddLayer('svg-highlight-layer');
    T3Gv.opt.svgHighlightLayer.ExcludeFromExport(true);

    // Add and configure the collaboration layer
    T3Gv.opt.svgCollabLayer = T3Gv.opt.svgDoc.AddLayer('svg-collab-layer');
    T3Gv.opt.svgCollabLayer.ExcludeFromExport(true);
    T3Gv.opt.svgCollabLayer.AllowScaling(false);

    // Get DOM elements
    T3Gv.opt.mainAppElement = document.getElementById('main-app');
    T3Gv.opt.workAreaElement = document.getElementById('svg-area');
    T3Gv.opt.documentElement = document.getElementById('document-area');

    // Initialize Hammer.js for touch/gesture events
    T3Gv.opt.WorkAreaHammer = new Hammer(T3Gv.opt.workAreaElement);
    T3Gv.opt.documentElementHammer = new Hammer(T3Gv.opt.documentElement);

    // Bind event handlers
    T3Gv.opt.WorkAreaHammer.on('tap', EvtUtil.Evt_WorkAreaHammerClick);
    T3Gv.opt.WorkAreaHammer.on('wheel', EvtUtil.Evt_WorkAreaMouseWheel);
    T3Gv.opt.documentElementHammer.on('wheel', EvtUtil.Evt_WorkAreaMouseWheel);
    T3Gv.opt.WorkAreaHammer.on('dragstart', EvtUtil.Evt_WorkAreaHammerDragStart);
  }

  static SetModalOperation(operation) {
    T3Util.Log("= U.UIUtil: SetModalOperation - Input:", { operation });

    if (
      operation !== OptConstant.OptTypes.None &&
      T3Gv.opt.crtOpt !== OptConstant.OptTypes.None &&
      T3Gv.opt.crtOpt !== operation
    ) {
      OptCMUtil.CancelOperation();
    }
    T3Gv.opt.crtOpt = operation;

    T3Util.Log("= U.UIUtil: SetModalOperation - Output:", { crtOpt: operation });
  }

  /**
   * Resizes the SVG document based on session dimensions
   */
  static ResizeSVGDocument() {
    T3Util.Log("= U.UIUtil: ResizeSVGDocument - Input: No parameters");

    // Get the session data from stored object
    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;

    // Resize the document to the dimensions specified in session data
    T3Gv.docUtil.ResizeDocument(sessionData.dim.x, sessionData.dim.y);

    T3Util.Log("= U.UIUtil: ResizeSVGDocument - Output: Document resized to", sessionData.dim);
  }

  /**
  * Sets the background color of the document based on the current paint settings.
  * It evaluates the session background paint settings and delegates to the correct fill method.
  * Also marks objects from the visible object list as dirty.
  *
  * @returns void
  */
  static SetBackgroundColor(): void {
    T3Util.Log("= U.UIUtil: SetBackgroundColor - Input:", {});

    // Retrieve the session object background and the document background element.
    const sessionObject = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    const backgroundElement = T3Gv.docUtil.GetBackground();

    if (sessionObject && backgroundElement) {
      const fillSettings = sessionObject.background.Paint;

      // Process according to the fill type.
      if (fillSettings.FillType === NvConstant.FillTypes.Solid) {
        // For solid fill, if the color is white or opacity is zero, set fill to 'none'.
        if (fillSettings.Color === NvConstant.Colors.White || fillSettings.Opacity === 0) {
          backgroundElement.SetFillColor('none');
        } else {
          backgroundElement.SetFillColor(fillSettings.Color);
        }
      } else if (fillSettings.FillType === NvConstant.FillTypes.Gradient) {
        // For gradient fill, create a gradient record and apply it.
        const baseShape = new Instance.Shape.BaseShape();
        backgroundElement.SetGradientFill(
          baseShape.CreateGradientRecord(fillSettings.GradientFlags, fillSettings.Color, fillSettings.Opacity, fillSettings.EndColor, fillSettings.EndOpacity)
        );
      } else if (fillSettings.FillType === NvConstant.FillTypes.RichGradient) {
        // For rich gradient fill, create a rich gradient record and apply it.
        const baseShape = new Instance.Shape.BaseShape();
        backgroundElement.SetGradientFill(baseShape.CreateRichGradientRecord(fillSettings.GradientFlags));
      } else if (fillSettings.FillType === NvConstant.FillTypes.Texture) {
        // For texture fill, prepare the texture fill settings.
        const textureFill = {
          url: '',
          scale: 1,
          alignment: fillSettings.TextureScale.AlignmentScalar,
          dim: undefined as { x: number; y: number } | undefined
        };
        const textureId = fillSettings.Texture;
      } else {
        backgroundElement.SetFillColor('none');
      }
      backgroundElement.ExcludeFromExport(this.GetBackgroundTransparent());
    }

    // Mark each visible object as dirty.
    const visibleObjectList = LayerUtil.VisibleZList();
    for (let i = 0, len = visibleObjectList.length; i < len; i++) {
      const objectId = visibleObjectList[i];
      const currentObject = ObjectUtil.GetObjectPtr(objectId, false);
      if (currentObject && currentObject.DataID >= 0) {
        ObjectUtil.AddToDirtyList(objectId);
      }
    }

    T3Util.Log("= U.UIUtil: SetBackgroundColor - Output:", {});
  }

  /**
   * Gets whether the background should be considered transparent.
   * @returns True if the background is transparent, false otherwise.
   */
  static GetBackgroundTransparent(): boolean {
    T3Util.Log("= U.UIUtil: GetBackgroundTransparent - Input: no parameters");

    const session = ObjectUtil.GetObjectPtr(
      T3Gv.opt.sdDataBlockId,
      false
    );
    const backgroundElement = T3Gv.docUtil.GetBackground();
    let isTransparent = true;

    if (session && backgroundElement) {
      const paintSettings = session.background.Paint;
      switch (paintSettings.FillType) {
        case NvConstant.FillTypes.Solid:
          isTransparent =
            paintSettings.Color === NvConstant.Colors.White ||
            paintSettings.Opacity === 0;
          break;
        case NvConstant.FillTypes.Gradient:
        case NvConstant.FillTypes.RichGradient:
        case NvConstant.FillTypes.Texture:
          isTransparent = false;
          break;
        default:
          isTransparent = true;
      }
    }

    T3Util.Log("= U.UIUtil: GetBackgroundTransparent - Output:", isTransparent);
    return isTransparent;
  }

  static SetDocumentScale(scaleFactor, skipCentering?) {
    T3Util.Log('= U.UIUtil: SetDocumentScale: input', { scaleFactor, skipCentering });

    if (T3Gv.opt.svgDoc) {
      T3Gv.docUtil.SetZoomFactor(scaleFactor, skipCentering);
    }

    T3Util.Log('= U.UIUtil: SetDocumentScale: output');
  }

  static UpdateDocumentScale() {
    T3Util.Log('= U.UIUtil: UpdateDocumentScale: input');

    if (T3Gv.opt.svgDoc) {
      const activeEdit = T3Gv.opt.svgDoc.GetActiveEdit();

      if (!activeEdit) {
        SvgUtil.HideAllSVGSelectionStates();
        SvgUtil.RenderAllSVGSelectionStates();
      }

      // Double IdleZoomControls();
    }

    T3Util.Log('= U.UIUtil: UpdateDocumentScale: output');
  }

  static IsPlanningDocument() {
    return false;
  }

  /**
  * Determines if UI adaptations for touch input should be applied
  * @param event - The input event to analyze
  * @returns True if touch-based UI adaptations should be applied, false otherwise
  */
  static GetUIAdaptation(event) {
    T3Util.Log("= U.UIUtil: GetUIAdaptation - Input:", event);

    let isTouchInterface = false;

    if (event.gesture) {
      // Check for pointer events
      if ('onpointerdown' in window) {
        if (event.gesture.srcEvent instanceof PointerEvent && event.gesture.srcEvent.pointerType == 'touch') {
          isTouchInterface = true;
        }
      }
      // Check for touch events
      else if ('ontouchstart' in window && event.gesture.srcEvent.type.indexOf('touch') != -1) {
        isTouchInterface = true;
      }
      // Mouse events don't trigger touch adaptations
      else if (event.gesture.srcEvent.type == 'mousedown') {
        isTouchInterface = false;
      }
    }
    // Handle direct events (not from Hammer.js)
    else {
      // Check for pointer events
      if ('onpointerdown' in window) {
        if (event instanceof PointerEvent && event.pointerType == 'touch') {
          isTouchInterface = true;
        }
      }
      // Check for touch events
      else if ('ontouchstart' in window && event.type.indexOf('touch') != -1) {
        isTouchInterface = true;
      }
      // Mouse events don't trigger touch adaptations
      else if (event.type == 'mousedown') {
        isTouchInterface = false;
      }
    }

    T3Util.Log("= U.UIUtil: GetUIAdaptation - Output:", isTouchInterface);
    return isTouchInterface;
  }

  static FitDocumentWorkArea(preserveState, forceFlag, allowOverride, fitOptions) {
    T3Util.Log('= U.UIUtil: FitDocumentWorkArea - Input:', { preserveState, forceFlag, allowOverride, fitOptions });

    let objectEnclosingRect;
    let layerIndex;
    let layerCount;
    let isEdgeLayerVisible;
    let documentSizeChanged;
    let isUsingEdgeLayer = false;
    let shouldUseEdges = false;
    let needMinHeightEnforcement = false;
    let needMinWidthEnforcement = false;

    if (!T3Gv.opt) {
      return;
    }

    // Get the layers manager to check layer settings
    const layersManager = ObjectUtil.GetObjectPtr(T3Gv.opt.layersManagerBlockId, false);

    // Check for edge layers and their visibility
    if (layersManager.layers[layersManager.activelayer].flags & NvConstant.LayerFlags.UseEdges) {
      isUsingEdgeLayer = true;
      isEdgeLayerVisible = layersManager.layers[layersManager.activelayer].flags & NvConstant.LayerFlags.Visible;
    }

    // Check if any visible layer uses edges
    layerCount = layersManager.nlayers;
    for (layerIndex = 0; layerIndex < layerCount; layerIndex++) {
      if ((layersManager.layers[layerIndex].flags & NvConstant.LayerFlags.UseEdges) &&
        (layersManager.layers[layerIndex].flags & NvConstant.LayerFlags.Visible) ||
        isUsingEdgeLayer) {
        shouldUseEdges = true;
        break;
      }
    }

    // Calculate the enclosing rectangle for all objects
    objectEnclosingRect = T3Gv.opt.CalcAllObjectEnclosingRect(shouldUseEdges && !isUsingEdgeLayer, fitOptions);

    let newWidth;
    let newHeight;
    let sessionData = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    let paperSize = T3Gv.opt.header.Page.papersize;
    let margins = T3Gv.opt.header.Page.margins;
    let pageWidth = paperSize.x - (margins.left + margins.right);
    let pageHeight = paperSize.y - (margins.top + margins.bottom);
    let newDocumentSize = { x: 0, y: 0 };

    // Ensure non-negative coordinates
    if (objectEnclosingRect.x < 0) {
      objectEnclosingRect.x = 0;
    }
    if (objectEnclosingRect.y < 0) {
      objectEnclosingRect.y = 0;
    }

    // Calculate new dimensions
    newWidth = Math.floor(objectEnclosingRect.x + objectEnclosingRect.width);
    newHeight = Math.floor(objectEnclosingRect.y + objectEnclosingRect.height);

    // Apply minimum size constraints if using edges but not on edge layer
    if (shouldUseEdges && !isUsingEdgeLayer) {
      if (newHeight < T3Gv.opt.header.Page.minsize.y) {
        newHeight = T3Gv.opt.header.Page.minsize.y;
        needMinHeightEnforcement = true;
      }
      if (newWidth < T3Gv.opt.header.Page.minsize.x) {
        newWidth = T3Gv.opt.header.Page.minsize.x;
        needMinWidthEnforcement = true;
      }
    }

    // Handle page-based layouts
    if (T3Gv.opt.header.flags & OptConstant.HeaderFlags.Pages && !isUsingEdgeLayer) {
      let widthInPages = Math.ceil(newWidth / pageWidth);
      let heightInPages = Math.ceil(newHeight / pageHeight);

      if (widthInPages < 1) widthInPages = 1;
      if (heightInPages < 1) heightInPages = 1;

      let currentWidthInPages, currentHeightInPages;

      if (shouldUseEdges) {
        currentWidthInPages = Math.ceil(sessionData.dim.x / pageWidth);
        currentHeightInPages = Math.ceil(sessionData.dim.y / pageHeight);
      } else {
        currentWidthInPages = Math.round(sessionData.dim.x / pageWidth);
        currentHeightInPages = Math.round(sessionData.dim.y / pageHeight);
      }

      if (currentWidthInPages < 1) currentWidthInPages = 1;
      if (currentHeightInPages < 1) currentHeightInPages = 1;

      // Check if we need to resize
      if (
        newWidth <= sessionData.dim.x &&
        newHeight <= sessionData.dim.y &&
        !forceFlag &&
        widthInPages >= currentWidthInPages &&
        heightInPages >= currentHeightInPages &&
        currentWidthInPages === 1 &&
        currentHeightInPages === 1
      ) {
        T3Util.Log('= U.UIUtil: FitDocumentWorkArea - Output: No resize needed');
        return;
      }

      // Calculate new document size in pages
      newDocumentSize = {
        x: widthInPages * pageWidth,
        y: heightInPages * pageHeight
      };

      if (needMinWidthEnforcement) {
        newDocumentSize.x = newWidth;
      }
      if (needMinHeightEnforcement) {
        newDocumentSize.y = newHeight;
      }

      // Honor no-auto-grow flag
      if (T3Gv.opt.header.flags & OptConstant.HeaderFlags.NoAuto) {
        if (newDocumentSize.x < sessionData.dim.x) newDocumentSize.x = sessionData.dim.x;
        if (newDocumentSize.y < sessionData.dim.y) newDocumentSize.y = sessionData.dim.y;
      }
    } else {
      // Handle non-page based layouts
      if (isUsingEdgeLayer) {
        objectEnclosingRect.width += 12;
        objectEnclosingRect.height += 12;
      }

      newDocumentSize.x = objectEnclosingRect.x + objectEnclosingRect.width;
      newDocumentSize.y = objectEnclosingRect.y + objectEnclosingRect.height;

      // Special handling for edge layers
      if (isUsingEdgeLayer &&
        (!Utils2.IsEqual(newDocumentSize.x, sessionData.dim.x, 2) ||
          !Utils2.IsEqual(newDocumentSize.y, sessionData.dim.y, 2))) {

        if (isEdgeLayerVisible) {
          if (newDocumentSize.x < pageWidth) {
            newDocumentSize.x = pageWidth;
          }
          if (newDocumentSize.y < pageHeight) {
            newDocumentSize.y = pageHeight;
          }

          if (!(T3Gv.opt.header.flags & OptConstant.HeaderFlags.NoAuto)) {
            T3Gv.opt.header.Page.minsize.y = newDocumentSize.y;
            T3Gv.opt.header.Page.minsize.x = newDocumentSize.x;
          }
        } else {
          T3Gv.opt.header.Page.minsize.x = pageWidth;
          T3Gv.opt.header.Page.minsize.y = pageHeight;
        }
      }

      // Apply minimum size constraints
      if (newDocumentSize.x < T3Gv.opt.header.Page.minsize.x) {
        newDocumentSize.x = T3Gv.opt.header.Page.minsize.x;
      }
      if (newDocumentSize.y < T3Gv.opt.header.Page.minsize.y) {
        newDocumentSize.y = T3Gv.opt.header.Page.minsize.y;
      }
    }

    // Check if dimensions actually changed
    documentSizeChanged = Utils2.IsEqual(newDocumentSize.x, sessionData.dim.x) &&
      Utils2.IsEqual(newDocumentSize.y, sessionData.dim.y);

    const isGrowing = newDocumentSize.x > sessionData.dim.x ||
      newDocumentSize.y > sessionData.dim.y;

    // Handle document resize
    if (documentSizeChanged) {
      if (T3Gv.docUtil.CheckScaleToFit()) {
        this.ResizeSVGDocument();
      }
    } else {
      // Handle no-auto-grow constraint
      if (
        T3Gv.opt.header.flags & OptConstant.HeaderFlags.NoAuto &&
        !allowOverride &&
        (!isGrowing || isExactPageMultiple(sessionData.dim, pageWidth, pageHeight))
      ) {
        if (isGrowing) {
          const error = new Error("bounds error");
          error.name = '1';
          throw error;
        }
        T3Util.Log('= U.UIUtil: FitDocumentWorkArea - Output: No resize needed (NoAuto constraint)');
        return;
      }

      let shouldPreserve = true;
      if (preserveState) {
        shouldPreserve = false;
      }

      sessionData = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, shouldPreserve);
      T3Gv.opt.UpdateEdgeLayers([], sessionData.dim, newDocumentSize);
      sessionData.dim.x = newDocumentSize.x;
      sessionData.dim.y = newDocumentSize.y;
      this.ResizeSVGDocument();
    }

    T3Util.Log('= U.UIUtil: FitDocumentWorkArea - Output:', {
      newSize: newDocumentSize,
      documentSizeChanged,
      isGrowing
    });

    // Helper function to check if a dimension is an exact page multiple
    function isExactPageMultiple(dimension, pageW, pageH) {
      const widthRemainder = dimension.x % pageW;
      return Utils2.IsEqual(widthRemainder, 0);
    }
  }

  /**
   * Changes the background color of all objects in the document
   * This function iterates through all objects in the Z-order list and
   * updates their background colors from the old color to the new color.
   * The change is only applied if the old and new colors are different.
   *
   * @param oldColor - The original background color to be replaced
   * @param newColor - The new background color to apply
   * @returns void
   */
  static ChangeBackgroundTextColor(oldColor, newColor) {
    // Only proceed if colors are actually different
    if (oldColor !== newColor) {
      // Get all objects in the document's Z-order list
      const objectList = LayerUtil.ZList();
      const objectCount = objectList.length;

      // Iterate through each object and update its background color
      for (let i = 0; i < objectCount; i++) {
        const currentObject = ObjectUtil.GetObjectPtr(objectList[i], false);

        // If object exists, call its ChangeBackgroundColor method
        if (currentObject) {
          currentObject.ChangeBackgroundColor(oldColor, newColor);
        }
      }
    }
  }

  static GetScreenDimensions() {
    // Get current screen dimensions
    const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const screenHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    const screenDimensions = {
      width: screenWidth,
      height: screenHeight
    };
    T3Util.Log('= U.UIUtil: GetScreenDimensions - Output:', screenDimensions);
    return screenDimensions;
  }
}

export default UIUtil
