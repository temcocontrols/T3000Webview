


import T3Gv from '../../Data/T3Gv';
import EvtUtil from "../../Event/EvtUtil";
import Utils1 from "../../Util/Utils1";
import Utils2 from "../../Util/Utils2";
import '../../Util/T3Hammer';
import Instance from "../../Data/Instance/Instance";
import NvConstant from '../../Data/Constant/NvConstant';
import TextFmtData from "../../Model/TextFmtData";
import OptConstant from "../../Data/Constant/OptConstant";
import StyleConstant from "../../Data/Constant/StyleConstant";
import T3Util from "../../Util/T3Util";
import DataUtil from "../Data/DataUtil";
import RulerUtil from "../UI/RulerUtil";
import OptCMUtil from "../Opt/OptCMUtil";
import TextUtil from "../Opt/TextUtil";
import SelectUtil from "../Opt/SelectUtil";
import SvgUtil from "../Opt/SvgUtil";
import LayerUtil from '../Opt/LayerUtil';

class UIUtil {

  /**
   * Shows a contextual menu at a specified position
   * @param element - The DOM element or selector for the contextual menu
   * @param positionX - The X position where to show the dropdown
   * @param positionY - The Y position where to show the dropdown
   * @returns void
   */
  static ShowContextMenu(element, positionX, positionY) {
    // const self = this;

    // // Hide all currently visible dropdowns
    // TODO.Dropdowns.HideAllDropdowns();

    // // Load the placeholder content
    // this.GetHtmlPartialLoader().LoadPlaceholder(element, false, (success) => {
    //   // If loading was successful, disable dropdown links
    //   if (success === true) {
    //     self.DisableDropdownLinks(element);
    //   }

    //   // Setup the dropdown
    //   self.RebuildDropdown(element);
    //   self.Selection.EnableDisableButtons(element);
    //   self.Selection.HighlightDropdownSelection(element);

    //   // Show the dropdown at the specified position
    //   self.Dropdowns.ShowDropdown(element, positionX, positionY);
    // });
  }

  static ShowFrame(isShowFrame: boolean) {
    T3Util.Log('O.Opt ShowFrame - Input:', { isShowFrame });

    const isShowRulers = T3Gv.docUtil.docConfig.showRulers;

    if (!isShowRulers) {
      T3Util.Log('O.Opt ShowFrame - Output: Rulers are not shown');
      return;
    }

    // Double show frame details

    T3Util.Log('O.Opt ShowFrame - Output: Frame visibility set to', isShowFrame);
  }

  static UpdateDisplayCoordinates(dimensions, position, cursorType, drawingObject) {
    // T3Util.Log("O.Opt UpdateDisplayCoordinates - Input:", {
    //   dimensions,
    //   position,
    //   cursorType,
    //   drawingObject: drawingObject ? drawingObject.BlockID : null
    // });

    // Set default cursor type if not provided
    if (cursorType == null) {
      // cursorType = CollabOverlayContoller.CursorTypes.Default;
      cursorType = "DEFAULT";
    }

    // // Handle collaboration cursor movement
    // if (Collab.IsCollaborating() && position) {
    //   const currentTime = Date.now();
    //   if (currentTime - Collab.MoveTimestamp > Collab.MoveDelay) {
    //     const message = {
    //       CursorType: cursorType
    //     };
    //     Collab.Animation_BuildMessage(
    //       position.x,
    //       position.y,
    //       NvConstant.Collab_AnimationMessages.CursorMove,
    //       message
    //     );
    //     Collab.MoveTimestamp = currentTime;
    //   }
    // }

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

        // // Update UI controls with the dimension values
        // const workArea = Resources.Controls.WorkArea;

        // const leftEdit = workArea.LeftEdit;
        // leftEdit.GetControl();
        // if (leftEdit.Control) {
        //   leftEdit.Control[0].value = formatValue(NumberToString(xLength, useFeet));
        // }

        // const topEdit = workArea.TopEdit;
        // topEdit.GetControl();
        // if (topEdit.Control) {
        //   topEdit.Control[0].value = formatValue(NumberToString(yLength, useFeet));
        // }

        // const widthEdit = workArea.WidthEdit;
        // widthEdit.GetControl();
        // if (widthEdit.Control) {
        //   widthEdit.Control[0].value = formatValue(NumberToString(width, useFeet));
        // }

        // const heightEdit = workArea.HeightEdit;
        // heightEdit.GetControl();
        // if (heightEdit.Control) {
        //   heightEdit.Control[0].value = formatValue(NumberToString(height, useFeet));
        // }
      }

      // Constrain position to document bounds
      if (position) {
        position.x = Math.max(0, position.x);
        position.y = Math.max(0, position.y);

        const sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
        position.x = Math.min(sessionBlock.dim.x, position.x);
        position.y = Math.min(sessionBlock.dim.y, position.y);
      }
    }

    // T3Util.Log("O.Opt UpdateDisplayCoordinates - Output: Coordinates updated in UI");
  }

  static ShowXY(showCoordinates) {
    // T3Util.Log("O.Opt ShowXY - Input:", { showCoordinates });
    // Show the x and y coordinates of the mouse pointer
    // T3Util.Log("O.Opt ShowXY - Output: Coordinates display updated");
  }

  /**
   * Gets the current dirty state of the document
   * The dirty state indicates if the document has unsaved changes.
   * @returns True if the document has unsaved changes, false otherwise
   */
  static GetDocDirtyState(): boolean {
    T3Util.Log("O.Opt GetDocDirtyState - Input: no parameters");

    const isDirty = T3Gv.opt.contentHeader.DocIsDirty;

    T3Util.Log("O.Opt GetDocDirtyState - Output:", isDirty);
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
    T3Util.Log("O.Opt SetDocDirtyState - Input:", { isDirty, allowReplaceWhenClean });

    // Set the document dirty state
    T3Gv.opt.contentHeader.DocIsDirty = isDirty;

    // Update the AllowReplace flag based on dirty state
    if (isDirty) {
      T3Gv.opt.contentHeader.AllowReplace = false;
    } else if (allowReplaceWhenClean === true) {
      T3Gv.opt.contentHeader.AllowReplace = true;
    }

    T3Util.Log("O.Opt SetDocDirtyState - Output: Document dirty state set to", isDirty);
  }

  static SetFormatPainter(shouldDisable: boolean, makeSticky: boolean) {
    T3Util.Log("O.Opt SetFormatPainter - Input:", { shouldDisable, makeSticky });

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
      T3Util.Log("O.Opt SetFormatPainter - Output: Format painter disabled");
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
          TextUtil.TextStyleToSDText(T3Gv.opt.formatPainterStyle.Text, T3Gv.opt.formatPainterText);
          OptCMUtil.SetEditMode(NvConstant.EditState.FormatPaint);
        }
      }
      // // CASE 2: If a table is active, set up table format painter
      // else if (activeTableId >= 0) {
      //   if ((tableObject = DataUtil.GetObjectPtr(activeTableId, false)) &&
      //     (tableCell = tableObject.GetTable(false))) {

      //     // If a cell is selected
      //     if (tableCell.select >= 0) {
      //       this.crtOpt = OptConstant.OptTypes.FormatPainter;
      //       this.formatPainterSticky = makeSticky;
      //       this.formatPainterMode = StyleConstant.FormatPainterModes.Table;
      //       this.formatPainterStyle = {
      //         StyleRecord: {}
      //       };

      //       const selectedCell = tableCell.cells[tableCell.select];
      //       this.formatPainterStyle.Text = Utils1.DeepCopy(selectedCell.Text);
      //       this.formatPainterStyle.hline = Utils1.DeepCopy(selectedCell.hline);
      //       this.formatPainterStyle.vline = Utils1.DeepCopy(selectedCell.vline);
      //       this.formatPainterStyle.Fill = Utils1.DeepCopy(selectedCell.fill);
      //       this.formatPainterStyle.vjust = selectedCell.vjust;
      //       this.formatPainterStyle.just = selectedCell.just;
      //       this.formatPainterText = TextUtil.CalcDefaultInitialTextStyle(this.formatPainterStyle.Text);

      //       const paraFormat = {};
      //       paraFormat.just = selectedCell.just;
      //       paraFormat.bullet = 'none';
      //       paraFormat.spacing = 0;

      //       const tableElement = this.svgObjectLayer.GetElementById(tableObject.BlockID);
      //       this.Table_GetTextParaFormat(tableCell, paraFormat, tableElement, false, false, tableCell.select);
      //       this.formatPainterParaFormat = paraFormat;
      //       OptCMUtil.SetEditMode(NvConstant.EditState.FormatPaint);
      //     }
      //     // If a row is selected
      //     else if (tableCell.rselect >= 0) {
      //       this.crtOpt = OptConstant.OptTypes.FormatPainter;
      //       this.formatPainterSticky = makeSticky;
      //       this.formatPainterMode = StyleConstant.FormatPainterModes.Table;
      //       this.formatPainterStyle = {
      //         StyleRecord: {}
      //       };

      //       tableRow = tableCell.rows[tableCell.rselect];
      //       const firstCell = tableCell.cells[tableRow.start + tableRow.segments[0].start];
      //       this.formatPainterStyle.hline = Utils1.DeepCopy(firstCell.hline);
      //       OptCMUtil.SetEditMode(NvConstant.EditState.FormatPaint);
      //     }
      //     // If a column is selected
      //     else if (tableCell.cselect >= 0) {
      //       this.crtOpt = OptConstant.OptTypes.FormatPainter;
      //       this.formatPainterSticky = makeSticky;
      //       this.formatPainterMode = StyleConstant.FormatPainterModes.Table;
      //       this.formatPainterStyle = {
      //         StyleRecord: {}
      //       };

      //       tableCol = tableCell.cols[tableCell.cselect];
      //       this.formatPainterStyle.vline = Utils1.DeepCopy(tableCol.vline);
      //       OptCMUtil.SetEditMode(NvConstant.EditState.FormatPaint);
      //     }
      //   }
      // }
      // CASE 3: If a shape/object is selected, set up object format painter
      else if ((targetObject = SelectUtil.GetTargetSelect()) >= 0 &&
        (tableObject = DataUtil.GetObjectPtr(targetObject, false))) {

        T3Gv.opt.crtOpt = OptConstant.OptTypes.FormatPainter;
        T3Gv.opt.formatPainterSticky = makeSticky;
        T3Gv.opt.formatPainterMode = StyleConstant.FormatPainterModes.Object;
        T3Gv.opt.formatPainterStyle = Utils1.DeepCopy(tableObject.StyleRecord);
        T3Gv.opt.formatPainterStyle.Border = Utils1.DeepCopy(tableObject.StyleRecord.Line);

        // Special handling for images, symbols, and groups
        if ((tableObject.ImageURL ||
          tableObject.SymbolURL ||
          tableObject instanceof Instance.Shape.GroupSymbol) &&
          !(tableObject instanceof Instance.Shape.SVGFragmentSymbol)) {

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

    T3Util.Log("O.Opt SetFormatPainter - Output:", {
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
  static InitSVGDocument() {
    // Get the session data from stored object
    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;

    // Get current screen dimensions
    const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const screenHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

    // Initialize the document work area
    T3Gv.docUtil.InitializeWorkArea({
      svgAreaID: T3Gv.opt.svgDocId,
      documentWidth: screenWidth,
      documentHeight: screenHeight,
      documentDPI: 100
    });

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
    T3Util.Log("O.Opt SetModalOperation - Input:", { operation });

    if (
      operation !== OptConstant.OptTypes.None &&
      T3Gv.opt.crtOpt !== OptConstant.OptTypes.None &&
      T3Gv.opt.crtOpt !== operation
    ) {
      OptCMUtil.CancelOperation();
    }
    T3Gv.opt.crtOpt = operation;

    T3Util.Log("O.Opt SetModalOperation - Output:", { crtOpt: operation });
  }

  /**
   * Resizes the SVG document based on session dimensions
   */
  static ResizeSVGDocument() {
    T3Util.Log("O.Opt ResizeSVGDocument - Input: No parameters");

    // Get the session data from stored object
    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;

    // Resize the document to the dimensions specified in session data
    T3Gv.docUtil.ResizeDocument(sessionData.dim.x, sessionData.dim.y);

    T3Util.Log("O.Opt ResizeSVGDocument - Output: Document resized to", sessionData.dim);
  }

  /**
  * Sets the background color of the document based on the current paint settings.
  * It evaluates the session background paint settings and delegates to the correct fill method.
  * Also marks objects from the visible object list as dirty.
  *
  * @returns void
  */
  static SetBackgroundColor(): void {
    T3Util.Log("O.Opt SetBackgroundColor - Input:", {});

    // Retrieve the session object background and the document background element.
    const sessionObject = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
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

        // // Check if the texture exists in the texture list.
        // if (T3Gv.opt.TextureList.Textures[textureId]) {
        //   const textureInfo = T3Gv.opt.TextureList.Textures[textureId];
        //   textureFill.dim = textureInfo.dim;
        //   textureFill.url = textureInfo.ImageURL;
        //   textureFill.scale = T3Gv.opt.CalcTextureScale(fillSettings.TextureScale, textureFill.dim.x);
        //   sessionObject.background.Paint.TextureScale.Scale = textureFill.scale;
        //   if (!textureFill.url) {
        //     textureFill.url = Constants.FilePath_CMSRoot + Constants.FilePath_Textures + textureInfo.filename;
        //   }
        //   backgroundElement.SetTextureFill(textureFill);
        // }
      } else {
        backgroundElement.SetFillColor('none');
      }
      backgroundElement.ExcludeFromExport(this.GetBackgroundTransparent());
    }

    // Mark each visible object as dirty.
    const visibleObjectList = LayerUtil.VisibleZList();
    for (let i = 0, len = visibleObjectList.length; i < len; i++) {
      const objectId = visibleObjectList[i];
      const currentObject = DataUtil.GetObjectPtr(objectId, false);
      if (currentObject && currentObject.DataID >= 0) {
        DataUtil.AddToDirtyList(objectId);
      }
    }

    T3Util.Log("O.Opt SetBackgroundColor - Output:", {});
  }

  /**
   * Gets whether the background should be considered transparent.
   * @returns True if the background is transparent, false otherwise.
   */
  static GetBackgroundTransparent(): boolean {
    T3Util.Log("O.Opt GetBackgroundTransparent - Input: no parameters");

    const session = DataUtil.GetObjectPtr(
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

    T3Util.Log("O.Opt GetBackgroundTransparent - Output:", isTransparent);
    return isTransparent;
  }

  static SetDocumentScale(scaleFactor, isAnimated?) {
    T3Util.Log('O.Opt SetDocumentScale: input', { scaleFactor, isAnimated });

    if (T3Gv.opt.svgDoc) {
      T3Gv.docUtil.SetZoomFactor(scaleFactor, isAnimated);
    }

    T3Util.Log('O.Opt SetDocumentScale: output');
  }

  static UpdateDocumentScale() {
    T3Util.Log('O.Opt UpdateDocumentScale: input');

    if (T3Gv.opt.svgDoc) {
      const activeEdit = T3Gv.opt.svgDoc.GetActiveEdit();

      if (!activeEdit) {
        SvgUtil.HideAllSVGSelectionStates();
        SvgUtil.RenderAllSVGSelectionStates();
      }

      // Double IdleZoomControls();
    }

    T3Util.Log('O.Opt UpdateDocumentScale: output');
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
    T3Util.Log("O.Opt GetUIAdaptation - Input:", event);

    let isTouchInterface = false;

    // // Check if we're already on a mobile platform
    // if (T3Gv.opt.isMobilePlatform) {
    //   isTouchInterface = true;
    // }
    // // Handle gesture events (from Hammer.js)
    // else

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

    T3Util.Log("O.Opt GetUIAdaptation - Output:", isTouchInterface);
    return isTouchInterface;
  }

  static FitDocumentWorkArea(preserveState, forceFlag, allowOverride, fitOptions) {
    T3Util.Log('O.Opt FitDocumentWorkArea - Input:', { preserveState, forceFlag, allowOverride, fitOptions });

    let objectEnclosingRect;
    let layerIndex;
    let layerCount;
    let isEdgeLayerVisible;
    let documentSizeChanged;
    let isUsingEdgeLayer = false;
    let shouldUseEdges = false;
    let needMinHeightEnforcement = false;
    let needMinWidthEnforcement = false;

    // Get the layers manager to check layer settings
    const layersManager = DataUtil.GetObjectPtr(T3Gv.opt.layersManagerBlockId, false);

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
    let sessionData = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    let paperSize = T3Gv.opt.contentHeader.Page.papersize;
    let margins = T3Gv.opt.contentHeader.Page.margins;
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
      if (newHeight < T3Gv.opt.contentHeader.Page.minsize.y) {
        newHeight = T3Gv.opt.contentHeader.Page.minsize.y;
        needMinHeightEnforcement = true;
      }
      if (newWidth < T3Gv.opt.contentHeader.Page.minsize.x) {
        newWidth = T3Gv.opt.contentHeader.Page.minsize.x;
        needMinWidthEnforcement = true;
      }
    }

    // Handle page-based layouts
    if (T3Gv.opt.contentHeader.flags & OptConstant.CntHeaderFlags.Pages && !isUsingEdgeLayer) {
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
        T3Util.Log('O.Opt FitDocumentWorkArea - Output: No resize needed');
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
      if (T3Gv.opt.contentHeader.flags & OptConstant.CntHeaderFlags.NoAuto) {
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

          if (!(T3Gv.opt.contentHeader.flags & OptConstant.CntHeaderFlags.NoAuto)) {
            T3Gv.opt.contentHeader.Page.minsize.y = newDocumentSize.y;
            T3Gv.opt.contentHeader.Page.minsize.x = newDocumentSize.x;
          }
        } else {
          T3Gv.opt.contentHeader.Page.minsize.x = pageWidth;
          T3Gv.opt.contentHeader.Page.minsize.y = pageHeight;
        }
      }

      // Apply minimum size constraints
      if (newDocumentSize.x < T3Gv.opt.contentHeader.Page.minsize.x) {
        newDocumentSize.x = T3Gv.opt.contentHeader.Page.minsize.x;
      }
      if (newDocumentSize.y < T3Gv.opt.contentHeader.Page.minsize.y) {
        newDocumentSize.y = T3Gv.opt.contentHeader.Page.minsize.y;
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
        T3Gv.opt.contentHeader.flags & OptConstant.CntHeaderFlags.NoAuto &&
        !allowOverride &&
        (!isGrowing || isExactPageMultiple(sessionData.dim, pageWidth, pageHeight))
      ) {
        if (isGrowing) {
          const error = new Error("bounds error");
          error.name = '1';
          throw error;
        }
        T3Util.Log('O.Opt FitDocumentWorkArea - Output: No resize needed (NoAuto constraint)');
        return;
      }

      let shouldPreserve = true;
      if (preserveState) {
        shouldPreserve = false;
      }

      sessionData = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, shouldPreserve);
      T3Gv.opt.UpdateEdgeLayers([], sessionData.dim, newDocumentSize);
      sessionData.dim.x = newDocumentSize.x;
      sessionData.dim.y = newDocumentSize.y;
      this.ResizeSVGDocument();
    }

    T3Util.Log('O.Opt FitDocumentWorkArea - Output:', {
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

  static ChangeBackgroundTextColor(e, t) {
    if (e !== t) {
      var a, r, i, n = LayerUtil.ZList();
      for (a = n.length,
        r = 0; r < a; r++)
        (i = DataUtil.GetObjectPtr(n[r], !1)) && i.ChangeBackgroundColor(e, t)
    }
  }

}

export default UIUtil
