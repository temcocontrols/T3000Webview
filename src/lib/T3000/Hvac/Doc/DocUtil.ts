

import RulerConfig from '../Model/RulerConfig'
import $ from 'jquery'
import T3Gv from '../Data/T3Gv'
import EvtUtil from '../Event/EvtUtil'
import Document from '../Basic/B.Document'
import FileParser from '../Data/FileParser'
import '../Helper/T3Hammer'
import '../Helper/pathseg'
import Utils1 from '../Helper/Utils1'
import Utils2 from '../Helper/Utils2'
import ConstantData from '../Data/ConstantData'
import DocConfig from '../Model/DocConfig'

class DocUtil {

  // Document configuration properties
  public docConfig: DocConfig;
  public rulerConfig: RulerConfig;

  // DOM element IDs
  public workAreaID: string;
  public svgAreaID: string;
  public hRulerAreaID: string;
  public vRulerAreaID: string;
  public cRulerAreaID: string;

  // Document objects
  public svgDoc: Document;
  public hRulerDoc: Document;
  public vRulerDoc: Document;

  // Layer names
  public gridLayer: string = '_doc_grid';
  public pageDividerLayer: string = '_doc_page_divider';
  public backgroundLayer: string = '_background';
  public backgroundElem: any;

  // Visibility states
  public rulerVis: boolean = true;
  public gridVis: boolean = true;

  // Scaling properties
  public scaleToFit: boolean = false;
  public scaleToPage: boolean = false;
  public scrollWidth: number = 0;

  // Ruler guides
  public hRulerGuide: any = null;
  public vRulerGuide: any = null;
  public rulerGuideWinPos: { x: number; y: number } = { x: 0, y: 0 };
  public rulerGuideScrollTimer: number | null = null;
  public rulerInDrag: boolean = false;

  // Handler for print operations
  public printHandler: any = null;

  constructor() {
    this.InitDocConfig();
    this.rulerConfig = new RulerConfig();
  }

  /**
   * Initializes document configuration with default settings
   * Sets up properties like rulers, grid, snap settings, zoom controls, page dividers and spell check options
   * @returns void
   */
  InitDocConfig(): void {
    console.log("= U.DocUtil: InitDocConfig - Input: Initializing document configuration");

    // Create new document configuration
    this.docConfig = new DocConfig();

    // UI display settings
    this.docConfig.showRulers = true;
    this.docConfig.showGrid = true;
    this.docConfig.showPageDivider = true;

    // Snap settings
    this.docConfig.enableSnap = false;
    this.docConfig.centerSnap = true;
    this.docConfig.snapToShapes = false;

    // Zoom and scale controls
    this.docConfig.zoom = true;
    this.docConfig.zoomLevels = true;
    this.docConfig.scale = true;

    // Spell check settings
    this.docConfig.spellCheck = true;
    this.docConfig.spellDict = true;
    this.docConfig.spellFlags = true;

    console.log("= U.DocUtil: InitDocConfig - Output:", this.docConfig);
  }

  /**
   * Initializes the document work area with SVG components and rulers
   * Sets up event handlers, creates layers, and configures initial display settings
   * @param workAreaConfig - Configuration object for the work area
   * @returns void
   */
  InitializeWorkArea(workAreaConfig: any): void {
    console.log("= U.DocUtil: InitializeWorkArea - Input:", workAreaConfig);

    // Use provided configuration or defaults
    workAreaConfig = workAreaConfig || {};

    // Set up DOM element IDs with provided values or defaults
    this.workAreaID = workAreaConfig.workAreaID || '#document-area';
    this.svgAreaID = workAreaConfig.svgAreaID || '#svg-area';
    this.hRulerAreaID = workAreaConfig.hRulerAreaID || '#h-ruler';
    this.vRulerAreaID = workAreaConfig.vRulerAreaID || '#v-ruler';
    this.cRulerAreaID = workAreaConfig.cRulerAreaID || '#c-ruler';

    // Initialize document-related properties
    this.svgDoc = null;
    this.hRulerDoc = null;
    this.vRulerDoc = null;
    this.rulerVis = true;
    this.gridVis = true;
    this.gridLayer = '_doc_grid';
    this.pageDividerLayer = '_doc_page_divider';
    this.backgroundLayer = '_background';
    this.backgroundElem = null;
    this.scaleToFit = false;
    this.scaleToPage = false;
    this.scrollWidth = 0;
    this.printHandler = null;

    // Bind window resize event handler
    $(window).bind('resize', this, function (event) {
      event.data.HandleResizeEvent();
    });

    // Bind scroll event handler to SVG area
    $(this.svgAreaID).bind('scroll', this, function (event) {
      event.data.HandleScrollEvent();
    });

    // Initialize ruler configuration
    this.rulerConfig = new RulerConfig();
    this.rulerConfig.fractionaldenominator = T3Gv.optManager.GetFractionDenominator();
    this.UpdateRulerVisibility();

    // Bind mouse move event handler
    $(window).bind('mousemove', EvtUtil.Evt_MouseMove);

    // Initialize SVG area with the configuration
    this.InitSvgArea(workAreaConfig);

    // Initialize UI components visibility and content
    this.UpdateGridVisibility();
    this.UpdatePageDividerVisibility();
    this.SetupRulers();
    this.UpdateGrid();
    this.UpdatePageDivider();
    this.UpdateWorkArea();

    console.log("= U.DocUtil: InitializeWorkArea - Output:", {
      workAreaID: this.workAreaID,
      svgAreaID: this.svgAreaID,
      hRulerAreaID: this.hRulerAreaID,
      vRulerAreaID: this.vRulerAreaID,
      cRulerAreaID: this.cRulerAreaID,
      gridLayer: this.gridLayer,
      pageDividerLayer: this.pageDividerLayer,
      backgroundLayer: this.backgroundLayer,
      scaleToFit: this.scaleToFit,
      scaleToPage: this.scaleToPage
    });
  }

  /**
   * Initializes the SVG document area with essential layers and configuration
   * Creates background, grid, and page divider layers and configures document dimensions
   * @param configuration - Configuration object for SVG area setup
   * @returns void
   */
  InitSvgArea(configuration: any) {
    console.log("= U.DocUtil: InitSvgArea - Input:", configuration);

    // Use provided configuration or empty object as fallback
    configuration = configuration || {};

    // Initialize SVG document if not already created
    if (!this.svgDoc) {
      this.svgDoc = new Document(this.svgAreaID, [] /* Globals.WebFonts */);
    }

    // Set up background layer and shape
    let currentLayer = this.svgDoc.AddLayer(this.backgroundLayer);
    this.backgroundElem = this.svgDoc.CreateShape(ConstantData.CreateShapeType.RECT);
    currentLayer.AddElement(this.backgroundElem);
    this.backgroundElem.SetPos(0, 0);
    this.backgroundElem.SetStrokeWidth(0);
    this.backgroundElem.SetStrokeColor('none');
    this.backgroundElem.SetFillColor('none');
    this.backgroundElem.ExcludeFromExport(true);
    currentLayer.SetCustomAttribute('t3-background', '1');

    // Set up grid layer with scaling and export settings
    currentLayer = this.svgDoc.AddLayer(this.gridLayer);
    currentLayer.AllowScaling(false);
    currentLayer.ExcludeFromExport(true);
    currentLayer.SetCustomAttribute('t3-grid', '1');

    // Set up page divider layer with scaling and export settings
    currentLayer = this.svgDoc.AddLayer(this.pageDividerLayer);
    currentLayer.AllowScaling(false);
    currentLayer.ExcludeFromExport(true);

    // Add additional custom layers if provided in configuration
    if (configuration.layers && Array.isArray(configuration.layers)) {
      configuration.layers.forEach((layerName: string) => {
        this.svgDoc.AddLayer(layerName);
      });
    }

    // Set document dimensions if provided in configuration
    if (configuration.documentWidth && configuration.documentHeight) {
      this.svgDoc.SetDocumentSize(configuration.documentWidth, configuration.documentHeight);
    }

    // Set document DPI (dots per inch) if provided in configuration
    if (configuration.documentDPI) {
      this.svgDoc.SetDocumentDPI(configuration.documentDPI);
    }

    // Adjust background element size to match document dimensions
    this.backgroundElem.SetSize(this.svgDoc.docInfo.docWidth, this.svgDoc.docInfo.docHeight);

    // Reset image loading reference count
    this.svgDoc.ImageLoadResetRefCount();

    console.log("= U.DocUtil: InitSvgArea - Output:", {
      documentWidth: this.svgDoc.docInfo.docWidth,
      documentHeight: this.svgDoc.docInfo.docHeight,
      layers: [this.backgroundLayer, this.gridLayer, this.pageDividerLayer]
    });
  }

  /**
   * Checks if the document scale needs to be adjusted when scale-to-fit is enabled
   * Calculates whether the current document scale matches the scale required to fit within the work area
   * @returns boolean - True if scale adjustment is needed, false otherwise
   */
  CheckScaleToFit(): boolean {
    console.log("= U.DocUtil: CheckScaleToFit - Input: scaleToFit =", this.scaleToFit);

    if (!this.scaleToFit) {
      console.log("= U.DocUtil: CheckScaleToFit - Output: false (scaleToFit disabled)");
      return false;
    }

    const workAreaSize = this.GetWorkAreaSize();
    const verticalRulerWidth = $(this.vRulerAreaID).width();
    const horizontalRulerHeight = $(this.hRulerAreaID).height();

    let availableRect = {
      x: 0,
      y: 0,
      width: workAreaSize.width,
      height: workAreaSize.height
    };

    if (this.docConfig.showRulers) {
      availableRect.x += verticalRulerWidth;
      availableRect.width -= verticalRulerWidth;
      availableRect.y += horizontalRulerHeight;
      availableRect.height -= horizontalRulerHeight;
    }

    console.log("= U.DocUtil: CheckScaleToFit - Available rect:", availableRect);

    const scalingResult = this.svgDoc.CalcScaleToFit(availableRect.width - 20, availableRect.height - 20);
    console.log("= U.DocUtil: CheckScaleToFit - CalcScaleToFit result:", scalingResult);

    const result = (this.svgDoc.docInfo.docScale !== scalingResult.scale);
    console.log("= U.DocUtil: CheckScaleToFit - Output:", result);

    return result;
  }

  /**
   * Updates the document work area layout and dimensions
   * Calculates and applies sizes and positions for SVG area and rulers
   * Manages scrollbars, scaling, and document positioning within the available space
   * @returns void
   */
  UpdateWorkArea(): void {
    // Get input values
    const showRulers = this.docConfig.showRulers;
    const workAreaSize = this.GetWorkAreaSize();
    const verticalRulerWidth = $(this.vRulerAreaID).width();
    const horizontalRulerHeight = $(this.hRulerAreaID).height();

    console.log("= U.DocUtil: UpdateWorkArea - Input:",
      { workAreaSize, showRulers, verticalRulerWidth, horizontalRulerHeight });

    // Initialize scrollbar width if not already set
    if (!this.scrollWidth) {
      this.scrollWidth = this.GetScrollBarSize();
    }

    // Compute the available area after accounting for rulers
    let availableRect = {
      x: 0,
      y: 0,
      width: workAreaSize.width,
      height: workAreaSize.height
    };

    // Adjust for ruler dimensions if rulers are visible
    if (showRulers) {
      availableRect.x += verticalRulerWidth;
      availableRect.width -= verticalRulerWidth;
      availableRect.y += horizontalRulerHeight;
      availableRect.height -= horizontalRulerHeight;
    }

    // Determine target dimensions based on svgDoc scaling options
    let targetDimensions: { width: number; height: number } = { width: 0, height: 0 };
    let calculationResult: any = null;

    if (this.svgDoc) {
      if (this.scaleToFit) {
        if (T3Gv.optManager.bInAutoScroll) {
          calculationResult = this.svgDoc.GetWorkArea();
          targetDimensions = {
            width: calculationResult.docScreenWidth,
            height: calculationResult.docScreenHeight
          };
        } else if (availableRect.width > 0 && availableRect.height > 0) {
          calculationResult = this.svgDoc.CalcScaleToFit(availableRect.width - 20, availableRect.height - 20);
          targetDimensions = {
            width: calculationResult.width,
            height: calculationResult.height
          };

          if (this.svgDoc.docInfo.docScale !== calculationResult.scale) {
            this.svgDoc.SetDocumentScale(calculationResult.scale);
            this.IdleZoomUI();
            this.UpdateGrid();
            this.UpdatePageDivider();
            this.ResetRulers();
          }
        } else {
          calculationResult = this.svgDoc.GetWorkArea();
          targetDimensions = {
            width: calculationResult.docScreenWidth,
            height: calculationResult.docScreenHeight
          };
        }
      } else if (this.scaleToPage && availableRect.width > 0 && availableRect.height > 0) {
        const pageWidth = T3Gv.optManager.theContentHeader.Page.papersize.x -
          (T3Gv.optManager.theContentHeader.Page.margins.left + T3Gv.optManager.theContentHeader.Page.margins.right);
        const pageHeight = T3Gv.optManager.theContentHeader.Page.papersize.y -
          (T3Gv.optManager.theContentHeader.Page.margins.top + T3Gv.optManager.theContentHeader.Page.margins.bottom);

        calculationResult = this.svgDoc.CalcScaleToFit(availableRect.width - 20, availableRect.height - 20, pageWidth, pageHeight);
        targetDimensions = {
          width: calculationResult.width,
          height: calculationResult.height
        };

        if (!T3Gv.optManager.bInAutoScroll && this.svgDoc.docInfo.docScale !== calculationResult.scale) {
          this.svgDoc.SetDocumentScale(calculationResult.scale);
          this.IdleZoomUI();
          this.UpdateGrid();
          this.UpdatePageDivider();
          this.ResetRulers();
        }
      } else {
        calculationResult = this.svgDoc.GetWorkArea();
        targetDimensions = {
          width: calculationResult.docScreenWidth,
          height: calculationResult.docScreenHeight
        };
      }
    } else {
      targetDimensions = { width: availableRect.width, height: availableRect.height };
    }

    // Determine the final svg area size
    const finalSize = {
      width: Math.min(availableRect.width, targetDimensions.width),
      height: Math.min(availableRect.height, targetDimensions.height)
    };

    // Determine if scrollbars are needed
    let needHorizontalScroll = false;
    let needVerticalScroll = false;

    if (finalSize.width < targetDimensions.width) {
      needHorizontalScroll = true;
      finalSize.height += this.scrollWidth;
      if (finalSize.height > availableRect.height) {
        finalSize.height = availableRect.height;
        needVerticalScroll = true;
      }
    }

    if (finalSize.height < targetDimensions.height) {
      needVerticalScroll = true;
      finalSize.width += this.scrollWidth;
      if (finalSize.width > availableRect.width) {
        finalSize.width = availableRect.width;
        needHorizontalScroll = true;
      }
    }

    // Center the svg area within available area
    const finalPosition = {
      x: availableRect.x + (availableRect.width - finalSize.width) / 2,
      y: availableRect.y + (availableRect.height - finalSize.height) / 2
    };

    // Apply CSS to svg area
    $(this.svgAreaID).css({
      left: finalPosition.x,
      top: finalPosition.y,
      width: finalSize.width,
      height: finalSize.height,
      "overflow-x": needHorizontalScroll ? "scroll" : "hidden",
      "overflow-y": needVerticalScroll ? "scroll" : "hidden"
    });

    // Adjust ruler positions if rulers are visible
    if (showRulers) {
      $(this.hRulerAreaID).css({
        left: finalPosition.x,
        top: finalPosition.y - horizontalRulerHeight,
        width: finalSize.width,
        height: horizontalRulerHeight
      });
      $(this.vRulerAreaID).css({
        left: finalPosition.x - verticalRulerWidth,
        top: finalPosition.y,
        width: verticalRulerWidth,
        height: finalSize.height
      });
      $(this.cRulerAreaID).css({
        left: finalPosition.x - verticalRulerWidth,
        top: finalPosition.y - horizontalRulerHeight
      });
    }

    // Recalculate work area and adjust everything in svgDoc
    if (this.svgDoc) {
      this.svgDoc.CalcWorkArea();
      // AdjustScroll without parameters will internally re-calc based on svgDoc's state
      this.AdjustScroll();
      this.svgDoc.ApplyDocumentTransform(true);
    }

    console.log("= U.DocUtil: UpdateWorkArea - Output:", {
      finalPosition,
      finalSize,
      targetDimensions,
      needHorizontalScroll,
      needVerticalScroll
    });
  }

  /**
   * Gets the current size of the document work area
   * Returns the width and height of the DOM element specified by workAreaID
   * @returns Object containing width and height in pixels
   */
  GetWorkAreaSize(): { width: number; height: number } {
    console.log("= U.DocUtil: GetWorkAreaSize - Input:", { workAreaID: this.workAreaID });

    const width = $(this.workAreaID).width();
    const height = $(this.workAreaID).height();

    const result = { width, height };
    console.log("= U.DocUtil: GetWorkAreaSize - Output:", result);

    return result;
  }

  /**
   * Calculates the width of a browser's scrollbar by comparing element widths
   * Creates a temporary container, measures width difference when scrollbar appears
   * @returns Number representing scrollbar width in pixels
   */
  GetScrollBarSize(): number {
    console.log("= U.DocUtil: GetScrollBarSize - Input: Measuring scrollbar width");

    // Create a temporary container with overflow set to auto
    const container = $('<div style="width:50px;height:50px;overflow:auto"><div/></div>').appendTo('body');
    const innerElement = container.children();

    // Measure inner width without scrollbar
    const widthWithoutScrollbar = innerElement.innerWidth();

    // Force scrollbar to appear by making content taller than container
    innerElement.height(99);

    // Measure inner width with scrollbar present
    const widthWithScrollbar = innerElement.innerWidth();

    // Calculate scrollbar width by finding the difference
    const scrollbarWidth = widthWithoutScrollbar - widthWithScrollbar;

    // Remove the temporary elements from DOM
    container.remove();

    console.log("= U.DocUtil: GetScrollBarSize - Output:", { scrollbarWidth });
    return scrollbarWidth;
  }

  /**
   * Adjusts scroll position of the SVG document area
   * Ensures scroll values stay within maximum allowable bounds
   * Updates related UI elements like rulers to match the new scroll position
   * @param horizontalScroll - The horizontal scroll position to set (optional)
   * @param verticalScroll - The vertical scroll position to set (optional)
   * @returns void
   */
  AdjustScroll(horizontalScroll?: number, verticalScroll?: number): void {
    console.log("= U.DocUtil: AdjustScroll - Input:", { horizontalScroll, verticalScroll });

    const workArea = this.svgDoc.GetWorkArea();

    // Calculate target scroll positions, ensuring they don't exceed maximum scroll limits
    const targetHorizontalScroll = Math.min(
      horizontalScroll !== undefined ? horizontalScroll : workArea.scrollX,
      workArea.maxScrollX
    );
    const targetVerticalScroll = Math.min(
      verticalScroll !== undefined ? verticalScroll : workArea.scrollY,
      workArea.maxScrollY
    );

    // Apply scroll positions to the SVG area
    $(this.svgAreaID).scrollLeft(targetHorizontalScroll);
    $(this.svgAreaID).scrollTop(targetVerticalScroll);

    // Recalculate work area after scrolling to update internal state
    this.svgDoc.CalcWorkArea();

    // Synchronize rulers with the new scroll position
    this.SyncRulers();

    console.log("= U.DocUtil: AdjustScroll - Output:", {
      targetHorizontalScroll,
      targetVerticalScroll
    });
  }

  /**
   * Handles window resize events by updating the work area layout
   * Ensures the document display adjusts correctly when browser window is resized
   * @returns void
   */
  HandleResizeEvent(): void {
    console.log("= U.DocUtil: HandleResizeEvent - Input: Window resize detected");

    // Update work area dimensions and layout
    this.UpdateWorkArea();

    console.log("= U.DocUtil: HandleResizeEvent - Output: Work area updated");
  }

  /**
   * Handles scroll events from the SVG area
   * Updates work area calculations and synchronizes rulers with the current scroll position
   * Tracks changes in scroll position for potential use by other components
   * @returns void
   */
  HandleScrollEvent(): void {
    console.log("= U.DocUtil: HandleScrollEvent - Input: Handling scroll event");

    // Get initial work area to access current scroll positions
    const initialWorkArea = this.svgDoc.GetWorkArea();
    const initialScrollX = initialWorkArea.scrollX;
    const initialScrollY = initialWorkArea.scrollY;

    // Recalculate work area after scroll
    this.svgDoc.CalcWorkArea();

    // Synchronize rulers with new scroll position
    this.SyncRulers();

    // Calculate scroll deltas (difference between initial and current scroll positions)
    const updatedWorkArea = this.svgDoc.GetWorkArea();
    const deltaScrollX = initialScrollX - updatedWorkArea.scrollX;
    const deltaScrollY = initialScrollY - updatedWorkArea.scrollY;

    console.log("= U.DocUtil: HandleScrollEvent - Output:", {
      initialScroll: { x: initialScrollX, y: initialScrollY },
      currentScroll: { x: updatedWorkArea.scrollX, y: updatedWorkArea.scrollY },
      deltaScroll: { x: deltaScrollX, y: deltaScrollY }
    });
  }

  /**
   * Sets the document resolution (DPI - dots per inch)
   * Updates the work area to reflect the new resolution
   * @param resolution - The resolution value in DPI to set for the document
   * @returns void
   */
  SetResolution(resolution: number): void {
    console.log("= U.DocUtil: SetResolution - Input:", resolution);

    if (this.svgDoc) {
      this.svgDoc.SetDocumentDPI(resolution);
      this.UpdateWorkArea();
    }

    console.log("= U.DocUtil: SetResolution - Output: Resolution updated");
  }

  /**
   * Resizes the document to new dimensions and updates related UI components
   * Updates background element size and recalculates rulers, grid, and work area
   * @param width - The new document width
   * @param height - The new document height
   * @param skipUIUpdate - If true, skips updating UI components like rulers and grid
   * @returns void
   */
  ResizeDocument(width, height, skipUIUpdate): void {
    console.log("= U.DocUtil: ResizeDocument - Input:", { width, height, skipUIUpdate });

    if (this.svgDoc) {
      // Update the document size
      this.svgDoc.SetDocumentSize(width, height);

      // Adjust background element to match new document size
      this.backgroundElem.SetSize(width, height);

      // Update UI components unless skipUIUpdate is true
      if (!skipUIUpdate) {
        this.ResetRulers();
        this.UpdateGrid();
        this.UpdatePageDivider();
        this.UpdateWorkArea();
      }
    }

    console.log("= U.DocUtil: ResizeDocument - Output: Document resized to", { width, height });
  }

  /**
   * Gets the current document size dimensions
   * Returns the width and height of the document as set in the SVG document
   * @returns Object containing document width and height in document units
   */
  GetDocumentSize(): { width: number; height: number } {
    console.log("= U.DocUtil: GetDocumentSize - Input: Retrieving document dimensions");

    const documentSize = this.svgDoc.GetDocumentSize();

    console.log("= U.DocUtil: GetDocumentSize - Output:", documentSize);
    return documentSize;
  }

  /**
   * Updates document display when page size changes
   * Updates work area or page divider based on current scaling mode
   * @returns void
   */
  DocumentPageSizeChanged(): void {
    console.log("= U.DocUtil: DocumentPageSizeChanged - Input: Document page size changed");

    if (this.svgDoc) {
      if (this.scaleToPage) {
        this.UpdateWorkArea();
      } else {
        this.UpdatePageDivider();
      }
    }

    console.log("= U.DocUtil: DocumentPageSizeChanged - Output: Display updated");
  }

  /**
   * Maintains the document view by adjusting scroll position to center on selected objects
   * If no objects are selected, centers on the entire document
   * @param skipSelection - If true, forces centering on the entire document (ignores selection)
   * @returns void
   */
  MaintainView(skipSelection: boolean): void {
    console.log("= U.DocUtil: MaintainView - Input:", { skipSelection });

    // Get current work area metrics
    const workArea = this.svgDoc.GetWorkArea();

    // Get selected objects
    const selectedObjects = T3Gv.optManager.GetObjectPtr(T3Gv.optManager.theSelectedListBlockID, false);

    // Calculate bounding rectangle for view centering
    let boundingRect = selectedObjects.length
      ? T3Gv.optManager.GetListSRect(selectedObjects)
      : T3Gv.optManager.CalcAllObjectEnclosingRect(false);

    // If bounding rect has no dimensions, use document dimensions
    if (!boundingRect.width || !boundingRect.height) {
      boundingRect.x = 0;
      boundingRect.y = 0;
      boundingRect.width = workArea.docWidth;
      boundingRect.height = workArea.docHeight;
    }

    // If skipSelection is true, ignore the selection and use full document view
    if (skipSelection) {
      boundingRect.width = 0;
      boundingRect.height = 0;
    }

    // Calculate scroll positions to center the bounding rectangle
    const horizontalScroll = (boundingRect.x + boundingRect.width / 2) * workArea.docToScreenScale - workArea.dispWidth / 2;
    const verticalScroll = (boundingRect.y + boundingRect.height / 2) * workArea.docToScreenScale - workArea.dispHeight / 2;

    // Apply scroll adjustment
    this.AdjustScroll(horizontalScroll, verticalScroll);

    console.log("= U.DocUtil: MaintainView - Output:", {
      horizontalScroll,
      verticalScroll,
      boundingRect
    });
  }

  /**
   * Sets the document zoom factor and updates the display
   * Adjusts document scale, centers view on selection, and updates UI components
   * @param zoomFactor - The zoom factor to set
   * @param skipCentering - If true, skip centering the view on selection
   * @returns boolean - True if zoom was changed, false otherwise
   */
  SetZoomFactor(zoomFactor: number, skipCentering?: boolean): boolean {
    console.log("= U.DocUtil: SetZoomFactor - Input:", { zoomFactor, skipCentering });

    // Return false if document doesn't exist
    if (!this.svgDoc) {
      console.log("= U.DocUtil: SetZoomFactor - Output: false (no svgDoc)");
      return false;
    }

    // Return false if not changing anything
    if (!this.scaleToFit && !this.scaleToPage && zoomFactor === this.GetZoomFactor()) {
      console.log("= U.DocUtil: SetZoomFactor - Output: false (zoom unchanged)");
      return false;
    }

    // Disable automatic scaling modes
    this.scaleToFit = false;
    this.scaleToPage = false;

    // Apply the requested zoom factor
    this.svgDoc.SetDocumentScale(zoomFactor);

    // Center view on content unless skipCentering is true
    if (!skipCentering) {
      const workArea = this.svgDoc.GetWorkArea();
      const selectedObjects = T3Gv.optManager.GetObjectPtr(T3Gv.optManager.theSelectedListBlockID, false);

      // Get bounding rectangle of selection or entire document
      let boundingRect = selectedObjects.length
        ? T3Gv.optManager.GetListSRect(selectedObjects)
        : T3Gv.optManager.CalcAllObjectEnclosingRect(false);

      // If bounding rect has no dimensions, use document dimensions
      if (!boundingRect.width || !boundingRect.height) {
        boundingRect = {
          x: 0,
          y: 0,
          width: workArea.docWidth,
          height: workArea.docHeight
        };
      }

      // Calculate scroll positions to center the view
      const horizontalScroll = (boundingRect.x + boundingRect.width / 2) * workArea.docToScreenScale - workArea.dispWidth / 2;
      const verticalScroll = (boundingRect.y + boundingRect.height / 2) * workArea.docToScreenScale - workArea.dispHeight / 2;

      // Apply scroll adjustment
      this.AdjustScroll(horizontalScroll, verticalScroll);
    }

    // Update the UI to reflect the zoom change
    this.IdleZoomUI();
    this.ResetRulers();
    this.UpdateGrid();
    this.UpdatePageDivider();
    this.UpdateWorkArea();

    console.log("= U.DocUtil: SetZoomFactor - Output: true (zoom updated)");
    return true;
  }

  /**
   * Gets the current document zoom factor
   * Returns the document's scale value from the work area, or 1 if not available
   * @returns number - The current zoom factor (scale) of the document
   */
  GetZoomFactor(): number {
    console.log("= U.DocUtil: GetZoomFactor - Input: Retrieving current zoom factor");

    let zoomFactor = 1;

    if (this.svgDoc) {
      zoomFactor = this.svgDoc.GetWorkArea().docScale;
    }

    console.log("= U.DocUtil: GetZoomFactor - Output:", zoomFactor);
    return zoomFactor;
  }

  /**
   * Sets whether the document should scale to fit the available view area
   * Updates work area to reflect the new scaling setting
   * @param enableScaleToFit - Whether scale-to-fit should be enabled
   * @returns void
   */
  SetSizeToFit(enableScaleToFit: boolean): void {
    console.log("= U.DocUtil: SetSizeToFit - Input:", enableScaleToFit);

    this.scaleToFit = enableScaleToFit;

    // If enabling scale to fit, disable scale to page
    if (enableScaleToFit) {
      this.scaleToPage = false;
    }

    // Update the work area to apply the new scaling setting
    this.UpdateWorkArea();

    console.log("= U.DocUtil: SetSizeToFit - Output:", {
      scaleToFit: this.scaleToFit,
      scaleToPage: this.scaleToPage
    });
  }

  /**
   * Gets the current scale-to-fit setting
   * @returns boolean - True if scale-to-fit is enabled, false otherwise
   */
  GetSizeToFit(): boolean {
    console.log("= U.DocUtil: GetSizeToFit - Input: Retrieving scale-to-fit setting");

    const result = this.scaleToFit;

    console.log("= U.DocUtil: GetSizeToFit - Output:", result);
    return result;
  }

  /**
   * Sets whether the document should scale to page dimensions
   * Updates work area to reflect the new scaling setting
   * @param enableScaleToPage - Whether scale-to-page should be enabled
   * @returns void
   */
  SetSizeToPage(enableScaleToPage: boolean): void {
    console.log("= U.DocUtil: SetSizeToPage - Input:", enableScaleToPage);

    this.scaleToPage = enableScaleToPage;

    // If enabling scale to page, disable scale to fit
    if (enableScaleToPage) {
      this.scaleToFit = false;
    }

    // Update the work area to apply the new scaling setting
    this.UpdateWorkArea();

    console.log("= U.DocUtil: SetSizeToPage - Output:", {
      scaleToPage: this.scaleToPage,
      scaleToFit: this.scaleToFit
    });
  }

  /**
   * Gets the current scale-to-page setting
   * @returns boolean - True if scale-to-page is enabled, false otherwise
   */
  GetSizeToPage(): boolean {
    console.log("= U.DocUtil: GetSizeToPage - Input: Retrieving scale-to-page setting");

    const result = this.scaleToPage;

    console.log("= U.DocUtil: GetSizeToPage - Output:", result);
    return result;
  }

  /**
   * Updates UI components that display zoom information
   * Calls OptManager's UpdateDocumentScale method to refresh zoom-related UI elements
   * @returns void
   */
  IdleZoomUI(): void {
    console.log("= U.DocUtil: IdleZoomUI - Input: Updating zoom UI");

    T3Gv.optManager.UpdateDocumentScale();

    console.log("= U.DocUtil: IdleZoomUI - Output: Zoom UI updated");
  }

  /**
   * Sets the scroll position of the document view
   * Wrapper for AdjustScroll that maintains parameter names
   * @param horizontalScroll - The horizontal scroll position to set
   * @param verticalScroll - The vertical scroll position to set
   * @returns void
   */
  SetScroll(horizontalScroll: number, verticalScroll: number): void {
    console.log("= U.DocUtil: SetScroll - Input:", { horizontalScroll, verticalScroll });

    this.AdjustScroll(horizontalScroll, verticalScroll);

    console.log("= U.DocUtil: SetScroll - Output: Scroll position updated");
  }

  /**
   * Scrolls document view to make the specified position visible
   * Calculates required scroll offsets and adjusts scroll position
   * @param xPosition - The x-coordinate to scroll to (in document units)
   * @param yPosition - The y-coordinate to scroll to (in document units)
   * @returns void
   */
  ScrollToPosition(xPosition: number, yPosition: number): void {
    console.log("= U.DocUtil: ScrollToPosition - Input:", { xPosition, yPosition });

    // Calculate required scroll offsets to make position visible
    const scrollOffsets = this.svgDoc.CalcScrollToVisible(xPosition, yPosition);

    // If valid offsets were calculated, adjust the scroll position
    if (scrollOffsets) {
      this.AdjustScroll(scrollOffsets.xOff, scrollOffsets.yOff);
    }

    console.log("= U.DocUtil: ScrollToPosition - Output:", {
      calculatedOffsets: scrollOffsets,
      scrollApplied: !!scrollOffsets
    });
  }

  /**
   * Compares two ruler configurations to check if they have different settings
   * Checks various ruler properties like units, scale, ticks, grid, origin, etc.
   * @param rulerConfig1 - The first ruler configuration to compare
   * @param rulerConfig2 - The second ruler configuration to compare
   * @returns boolean - True if configurations differ, false if they are the same
   */
  RulersNotEqual(rulerConfig1, rulerConfig2): boolean {
    console.log("= U.DocUtil: RulersNotEqual - Input:", { rulerConfig1, rulerConfig2 });

    // Initialize default configurations if not provided
    rulerConfig1 = rulerConfig1 || {};
    rulerConfig2 = rulerConfig2 || {};

    // Get origin values from second configuration or default to 0
    let originX = 0,
      originY = 0;

    if (rulerConfig2.originx) {
      originX = rulerConfig2.originx;
    }

    if (rulerConfig2.originy) {
      originY = rulerConfig2.originy;
    }

    // Compare all ruler properties for differences
    let configurationsDiffer = rulerConfig1.useInches != rulerConfig2.useInches ||
      rulerConfig1.units != rulerConfig2.units ||
      rulerConfig1.major != rulerConfig2.major ||
      rulerConfig1.majorScale != rulerConfig2.majorScale ||
      rulerConfig1.nTics != rulerConfig2.nTics ||
      rulerConfig1.nMid != rulerConfig2.nMid ||
      rulerConfig1.nGrid != rulerConfig2.nGrid ||
      rulerConfig1.dp != rulerConfig2.dp ||
      rulerConfig1.fractionaldenominator != rulerConfig2.fractionaldenominator ||
      rulerConfig1.originx != originX ||
      rulerConfig1.originy != originY;

    // Special case for major property
    if (rulerConfig1.major && rulerConfig2.major && rulerConfig1.major != rulerConfig2.major) {
      configurationsDiffer = true;
    }

    // Special case for showpixels property
    if (rulerConfig1.showpixels != null &&
      rulerConfig2.showpixels != null &&
      rulerConfig1.showpixels != rulerConfig2.showpixels) {
      configurationsDiffer = true;
    }

    console.log("= U.DocUtil: RulersNotEqual - Output:", configurationsDiffer);
    return configurationsDiffer;
  }

  /**
   * Compares two page configurations to check if they have different settings
   * Examines paper size, margins, and orientation properties
   * @param pageConfig1 - The first page configuration to compare
   * @param pageConfig2 - The second page configuration to compare
   * @returns boolean - True if configurations differ, false if they are the same
   */
  PagesNotEqual(pageConfig1, pageConfig2): boolean {
    console.log("= U.DocUtil: PagesNotEqual - Input:", { pageConfig1, pageConfig2 });

    // Check if either configuration is undefined or null
    const configurationsInvalid = pageConfig1 == undefined ||
      pageConfig1 == null ||
      pageConfig2 === undefined ||
      pageConfig2 === null;

    if (configurationsInvalid) {
      console.log("= U.DocUtil: PagesNotEqual - Output: false (invalid configs)");
      return false;
    }

    // Compare all page properties for differences
    const configurationsDiffer = pageConfig1.papersize.x != pageConfig2.papersize.x ||
      pageConfig1.papersize.y != pageConfig2.papersize.y ||
      pageConfig1.margins.left != pageConfig2.margins.left ||
      pageConfig1.margins.right != pageConfig2.margins.right ||
      pageConfig1.margins.top != pageConfig2.margins.top ||
      pageConfig1.margins.bottom != pageConfig2.margins.bottom ||
      pageConfig1.landscape != pageConfig2.landscape;

    console.log("= U.DocUtil: PagesNotEqual - Output:", configurationsDiffer);
    return configurationsDiffer;
  }

  /**
   * Returns the SVG document object associated with this DocUtil instance
   * Provides access to the underlying document for direct manipulation
   * @returns Document - The SVG document object
   */
  DocObject() {
    console.log("= U.DocUtil: DocObject - Input: Getting document object");

    const documentObject = this.svgDoc;
    console.log("= U.DocUtil: DocObject - Output:", documentObject ? "Document object returned" : "No document object");

    return documentObject;
  }

  /**
   * Sets ruler configuration with provided settings
   * Updates ruler properties like units, scales, grid, and origin
   * Resets rulers and updates grid and page dividers to reflect new settings
   * @param rulerSettings - Object containing ruler configuration properties
   * @param shouldPropagate - Flag to determine if settings should be propagated to session
   * @returns void
   */
  SetRulers(rulerSettings: any, shouldPropagate?: boolean): void {
    console.log("= U.DocUtil: SetRulers - Input:", { rulerSettings, shouldPropagate });
    let sessionDataPointer;

    if (rulerSettings) {
      // Update ruler configuration properties with provided settings or keep existing values
      this.rulerConfig.useInches = rulerSettings.useInches !== undefined ? rulerSettings.useInches : this.rulerConfig.useInches;
      this.rulerConfig.units = rulerSettings.units !== undefined ? rulerSettings.units : this.rulerConfig.units;
      this.rulerConfig.major = rulerSettings.major !== undefined ? rulerSettings.major : this.rulerConfig.major;
      this.rulerConfig.majorScale = rulerSettings.majorScale !== undefined ? rulerSettings.majorScale : this.rulerConfig.majorScale;
      this.rulerConfig.nTics = rulerSettings.nTics !== undefined ? rulerSettings.nTics : this.rulerConfig.nTics;
      this.rulerConfig.nMid = rulerSettings.nMid !== undefined ? rulerSettings.nMid : this.rulerConfig.nMid;
      this.rulerConfig.nGrid = rulerSettings.nGrid !== undefined ? rulerSettings.nGrid : this.rulerConfig.nGrid;
      this.rulerConfig.originx = rulerSettings.originx !== undefined ? rulerSettings.originx : this.rulerConfig.originx;
      this.rulerConfig.originy = rulerSettings.originy !== undefined ? rulerSettings.originy : this.rulerConfig.originy;
      this.rulerConfig.dp = rulerSettings.dp !== undefined ? rulerSettings.dp : this.rulerConfig.dp;
      this.rulerConfig.fractionaldenominator = rulerSettings.fractionaldenominator !== undefined ? rulerSettings.fractionaldenominator : this.rulerConfig.fractionaldenominator;

      // Handle special case for showpixels property
      if (rulerSettings.showpixels != null) {
        this.rulerConfig.showpixels = rulerSettings.showpixels;
      }

      // Store settings in session data if not propagating
      if (!shouldPropagate) {
        sessionDataPointer = T3Gv.optManager.GetObjectPtr(T3Gv.optManager.theSEDSessionBlockID, true);
        sessionDataPointer.rulerConfig = Utils1.DeepCopy(this.rulerConfig);
      }

      // Update UI components with new ruler settings
      this.ResetRulers();
      this.UpdateGrid();
      this.UpdatePageDivider();
    }

    console.log("= U.DocUtil: SetRulers - Output:", { updatedRulerConfig: this.rulerConfig });
  }

  ShowCoordinates(show: boolean): boolean {
    // TODO
    // Show or hide the coordinates in the center ruler
    return false;
  }

  /**
   * Updates the visibility of rulers based on document configuration
   * Shows or hides horizontal, vertical and center rulers according to settings
   * Adjusts work area layout to account for ruler visibility changes
   * @returns boolean - Always returns true to indicate operation completed
   */
  UpdateRulerVisibility(): boolean {
    console.log("= U.DocUtil: UpdateRulerVisibility - Input:", {
      showRulers: this.docConfig.showRulers,
      currentVisibility: this.rulerVis
    });

    if (this.docConfig.showRulers !== this.rulerVis) {
      if (this.docConfig.showRulers) {
        $(this.hRulerAreaID).css("visibility", "visible");
        $(this.vRulerAreaID).css("visibility", "visible");
        $(this.cRulerAreaID).css("visibility", "visible");
        this.ShowCoordinates(true);
      } else {
        $(this.hRulerAreaID).css("visibility", "hidden");
        $(this.vRulerAreaID).css("visibility", "hidden");
        $(this.cRulerAreaID).css("visibility", "hidden");
        this.ShowCoordinates(false);
      }
      this.UpdateWorkArea();
      this.rulerVis = this.docConfig.showRulers;
    }

    console.log("= U.DocUtil: UpdateRulerVisibility - Output:", {
      updatedVisibility: this.rulerVis
    });

    return true;
  }

  /**
   * Sets up ruler documents and attaches event handlers for ruler interaction
   * Initializes horizontal and vertical ruler documents if they don't exist
   * Attaches event handlers for ruler interaction unless in read-only mode
   * @returns void
   */
  SetupRulers(): void {
    console.log("= U.DocUtil: SetupRulers - Input:", {
      horizontalRulerAreaID: this.hRulerAreaID,
      verticalRulerAreaID: this.vRulerAreaID,
      centerRulerAreaID: this.cRulerAreaID,
      isReadOnly: this.IsReadOnly()
    });

    // Initialize horizontal ruler document if not already set
    if (!this.hRulerDoc) {
      this.hRulerDoc = new Document(this.hRulerAreaID, [] /* Globals.WebFonts */);
    }

    // Initialize vertical ruler document if not already set
    if (!this.vRulerDoc) {
      this.vRulerDoc = new Document(this.vRulerAreaID, [] /* Globals.WebFonts */);
    }

    // Initialize ruler guides and state properties
    this.hRulerGuide = null;
    this.vRulerGuide = null;
    this.rulerGuideWinPos = { x: 0, y: 0 };
    this.rulerGuideScrollTimer = null;
    this.rulerInDrag = false;

    // Attach Hammer.js event handlers if not read-only
    if (!this.IsReadOnly()) {
      new Hammer($(this.hRulerAreaID)[0]).on('doubletap', this.RulerTopDoubleClick);
      new Hammer($(this.vRulerAreaID)[0]).on('doubletap', this.RulerLeftDoubleClick);
      new Hammer($(this.cRulerAreaID)[0]).on('doubletap', this.RulerCenterDoubleClick);

      new Hammer($(this.hRulerAreaID)[0]).on('dragstart', this.RulerDragStart);
      new Hammer($(this.vRulerAreaID)[0]).on('dragstart', this.RulerDragStart);
      new Hammer($(this.cRulerAreaID)[0]).on('dragstart', this.RulerDragStart);

      new Hammer($(this.hRulerAreaID)[0]).on('drag', this.RulerTopDrag);
      new Hammer($(this.vRulerAreaID)[0]).on('drag', this.RulerLeftDrag);
      new Hammer($(this.cRulerAreaID)[0]).on('drag', this.RulerCenterDrag);

      new Hammer($(this.hRulerAreaID)[0]).on('dragend', this.RulerDragEnd);
      new Hammer($(this.vRulerAreaID)[0]).on('dragend', this.RulerDragEnd);
      new Hammer($(this.cRulerAreaID)[0]).on('dragend', this.RulerDragEnd);
    }

    // Reset rulers to update display
    this.ResetRulers();

    console.log("= U.DocUtil: SetupRulers - Output:", {
      horizontalRulerDocInitialized: !!this.hRulerDoc,
      verticalRulerDocInitialized: !!this.vRulerDoc,
      rulerGuides: {
        horizontalRulerGuide: this.hRulerGuide,
        verticalRulerGuide: this.vRulerGuide
      },
      rulerInDrag: this.rulerInDrag
    });
  }

  /**
   * Resets the rulers by recreating ruler content for both horizontal and vertical rulers
   * Updates ruler document dimensions to match the current work area and refreshes ruler display
   * @returns void
   */
  ResetRulers(): void {
    console.log("= U.DocUtil: ResetRulers - Input: Resetting horizontal and vertical rulers");

    // Get current work area dimensions and ruler sizes
    const workArea = this.svgDoc.GetWorkArea();
    const verticalRulerWidth = $(this.vRulerAreaID).width();
    const horizontalRulerHeight = $(this.hRulerAreaID).height();

    // Set sizes for horizontal and vertical ruler documents
    this.hRulerDoc.SetDocumentSize(workArea.docScreenWidth + 100, horizontalRulerHeight);
    this.vRulerDoc.SetDocumentSize(verticalRulerWidth, workArea.docScreenHeight + 100);

    // Clear existing ruler content
    this.hRulerDoc.RemoveAll();
    this.vRulerDoc.RemoveAll();

    // Generate new ruler content for horizontal and vertical rulers
    this.SetRulerContent(this.hRulerDoc, true);
    this.SetRulerContent(this.vRulerDoc, false);

    console.log("= U.DocUtil: ResetRulers - Output: Rulers have been reset and redrawn");
  }

  /**
   * Calculates scale factor adjustments based on document scale
   * Adjusts the input scale value to account for document zoom level
   * @param conversionFactor - Base scale conversion factor (typically 1 or metric conversion value)
   * @returns number - Adjusted scale factor for ruler calculations
   */
  GetScaledRuler(conversionFactor: number): number {
    console.log("= U.DocUtil: GetScaledRuler - Input:", {
      conversionFactor,
      documentScale: this.svgDoc.docInfo.docScale
    });

    // Get the floor value of document scale
    let documentScaleFloor = Math.floor(this.svgDoc.docInfo.docScale);

    // Adjust conversion factor based on document scale
    if (documentScaleFloor === 0) {
      // Handle fractional document scale (zoom out)
      documentScaleFloor = Math.floor(1 / this.svgDoc.docInfo.docScale);
      if (documentScaleFloor > 1) {
        conversionFactor /= documentScaleFloor;
      }
    } else if (documentScaleFloor > 1) {
      // Handle document scale > 1 (zoom in)
      conversionFactor *= documentScaleFloor;
    }

    console.log("= U.DocUtil: GetScaledRuler - Output:", {
      adjustedFactor: conversionFactor
    });

    return conversionFactor;
  }

  /**
   * Sets up ruler content with tick marks and numeric labels
   * Creates visual elements for rulers including major, mid, and minor tick marks
   * Calculates proper positioning based on document scale and ruler configuration
   * @param rulerDocument - The SVG document to draw ruler content on
   * @param isHorizontalRuler - True for horizontal ruler, false for vertical ruler
   * @returns void
   */
  SetRulerContent(rulerDocument, isHorizontalRuler): void {
    console.log("= U.DocUtil: SetRulerContent - Input:", { rulerDocument, isHorizontalRuler });

    // Get work area and ruler dimensions
    const workArea = this.svgDoc.GetWorkArea();
    const verticalRulerWidth = $(this.vRulerAreaID).width();
    const horizontalRulerHeight = $(this.hRulerAreaID).height();
    const rulerThickness = isHorizontalRuler ? horizontalRulerHeight : verticalRulerWidth;

    // Get scale factor adjusted for document zoom
    let unitConversionFactor = 1;
    const scaledRulerFactor = this.GetScaledRuler(unitConversionFactor);

    // Create a PATH shape used to draw tick marks
    const rulerPathElement = rulerDocument.CreateShape(ConstantData.CreateShapeType.PATH);
    let pathCommands = '';

    // Compute tick sizes for major, mid, and minor ticks
    const majorTickLength = Utils1.RoundCoordLP(Math.round(3 * rulerThickness / 4));
    const midTickLength = Utils1.RoundCoordLP(Math.round(rulerThickness / 2));
    const minorTickLength = Utils1.RoundCoordLP(Math.round(rulerThickness / 4));

    let majorTickCount = 0;

    // Adjust conversion factor for metric units if needed
    if (!this.rulerConfig.useInches) {
      unitConversionFactor *= ConstantData.Defines.MetricConv;
    }

    // Get ruler tick configuration
    const ticksPerMajor = this.rulerConfig.nTics;
    let midTicksEnabled = this.rulerConfig.nMid;
    if (ticksPerMajor % 2) {
      midTicksEnabled = 0;
    }
    const midTickInterval = Math.round(ticksPerMajor / (midTicksEnabled + 1));

    // Total available length in screen coordinates
    const visibleLength = isHorizontalRuler ? workArea.docScreenWidth : workArea.docScreenHeight;
    let majorTickSpacing = this.rulerConfig.major / unitConversionFactor;

    // Container for label data
    const tickLabels = [];

    // Calculate fractional origin adjustment
    let originValue = isHorizontalRuler ? this.rulerConfig.originx : this.rulerConfig.originy;
    let fractionalOrigin = originValue - Math.floor(originValue);
    if (fractionalOrigin) {
      fractionalOrigin -= 1;
    }
    fractionalOrigin *= majorTickSpacing;

    // Compute initial label offset
    let labelBaseValue = -Math.ceil(originValue) * this.rulerConfig.majorScale;

    // Adjust tick spacing by scale factor
    majorTickSpacing /= scaledRulerFactor;

    // Loop until the ticks generated cover the full available length
    let currentScreenPosition = 0;
    do {
      // Compute the starting coordinate for this major tick mark
      let majorTickValue = fractionalOrigin + majorTickCount * (this.rulerConfig.major / scaledRulerFactor / unitConversionFactor);
      let majorTickPosition = Utils1.RoundCoordLP(majorTickValue * workArea.docToScreenScale);

      // Compute label value based on the tick counter and major scale
      let labelValue = this.rulerConfig.showpixels
        ? 100 * (labelBaseValue + majorTickCount * (this.rulerConfig.majorScale / scaledRulerFactor))
        : (labelBaseValue + majorTickCount * (this.rulerConfig.majorScale / scaledRulerFactor));

      // Append label and add the major tick path command
      if (isHorizontalRuler) {
        tickLabels.push({ label: labelValue, x: majorTickPosition + 2, y: 1 });
        pathCommands += `M${majorTickPosition},${rulerThickness}v-${majorTickLength}`;
      } else {
        tickLabels.push({ label: labelValue, x: 3, y: majorTickPosition + 2 });
        pathCommands += `M${rulerThickness},${majorTickPosition}h-${majorTickLength}`;
      }

      // Draw intermediate ticks for this major interval
      for (let minorTickIndex = 1; minorTickIndex < ticksPerMajor; minorTickIndex++) {
        let minorTickValue = majorTickValue + minorTickIndex * (majorTickSpacing / ticksPerMajor);
        let minorTickPosition = Utils1.RoundCoordLP(minorTickValue * workArea.docToScreenScale);
        let tickSize = (minorTickIndex % midTickInterval) ? minorTickLength : midTickLength;

        if (isHorizontalRuler) {
          pathCommands += `M${minorTickPosition},${rulerThickness}v-${tickSize}`;
        } else {
          pathCommands += `M${rulerThickness},${minorTickPosition}h-${tickSize}`;
        }
      }

      // Update current screen position for loop termination check
      currentScreenPosition = Utils1.RoundCoordLP(
        (fractionalOrigin + (majorTickCount + 1) * (this.rulerConfig.major / scaledRulerFactor / unitConversionFactor))
        * workArea.docToScreenScale
      );
      majorTickCount++;
    } while (currentScreenPosition < visibleLength);

    // Set the generated path and style it
    rulerPathElement.SetPath(pathCommands);
    rulerPathElement.SetFillColor("none");
    rulerPathElement.SetStrokeColor("#000");
    rulerPathElement.SetStrokeWidth(".5");
    rulerDocument.AddElement(rulerPathElement);
    rulerDocument.SetCursor(ConstantData.CursorType.DEFAULT);

    // Determine if labels need decimal precision
    let requiresDecimalFormat = false;
    for (let i = 0; i < tickLabels.length; i++) {
      if (tickLabels[i].label !== parseInt(tickLabels[i].label.toString(), 10)) {
        requiresDecimalFormat = true;
        break;
      }
    }

    // Format labels with decimal if needed
    if (requiresDecimalFormat) {
      for (let i = 0; i < tickLabels.length; i++) {
        tickLabels[i].label = tickLabels[i].label.toFixed(1);
      }
    }

    // Define text style for labels
    const labelTextStyle = {
      size: 10,
      color: "#000"
    };

    // Add labels at intervals to avoid overcrowding
    const totalLabels = tickLabels.length;
    const labelDisplayInterval = Math.floor(totalLabels / 250) || 1;

    for (let i = 0; i < totalLabels; i += labelDisplayInterval) {
      const labelElement = rulerDocument.CreateShape(ConstantData.CreateShapeType.TEXT);
      labelElement.SetText(tickLabels[i].label, labelTextStyle);
      rulerDocument.AddElement(labelElement);
      labelElement.SetPos(tickLabels[i].x, tickLabels[i].y);
    }

    console.log("= U.DocUtil: SetRulerContent - Output:", {
      pathLength: pathCommands.length,
      labelCount: totalLabels,
      displayedLabels: Math.ceil(totalLabels / labelDisplayInterval)
    });
  }

  /**
   * Synchronizes ruler positions with the SVG document's scroll position
   * Updates the horizontal and vertical rulers to match the document view
   * Ensures rulers stay aligned with the content as the user scrolls
   * @returns void
   */
  SyncRulers(): void {
    // Get current scroll positions of the SVG area
    const horizontalScroll: number = $(this.svgAreaID).scrollLeft();
    const verticalScroll: number = $(this.svgAreaID).scrollTop();

    // Log input values
    console.log("= U.DocUtil: SyncRulers - Input:", { horizontalScroll, verticalScroll });

    // Sync horizontal and vertical rulers with the SVG area's scroll positions
    $(this.hRulerAreaID).scrollLeft(horizontalScroll);
    $(this.vRulerAreaID).scrollTop(verticalScroll);

    // Log output after synchronizing rulers
    console.log("= U.DocUtil: SyncRulers - Output: Rulers synchronized", { horizontalScroll, verticalScroll });
  }

  /**
   * Updates the visibility of the grid based on document configuration
   * Shows or hides the grid layer according to settings
   * @returns boolean - True if grid visibility was changed, false otherwise
   */
  UpdateGridVisibility(): boolean {
    console.log("= U.DocUtil: UpdateGridVisibility - Input:", {
      showGrid: this.docConfig.showGrid,
      currentGridVisibility: this.gridVis
    });

    const gridLayer = this.svgDoc ? this.svgDoc.GetLayer(this.gridLayer) : null;
    let visibilityChanged = false;

    if (!gridLayer) {
      console.log("= U.DocUtil: UpdateGridVisibility - Output: Grid layer not found.");
      return visibilityChanged;
    }

    if (this.docConfig.showGrid === this.gridVis) {
      console.log("= U.DocUtil: UpdateGridVisibility - Output: No change in grid visibility. Current value:", this.gridVis);
      return visibilityChanged;
    }

    gridLayer.SetVisible(this.docConfig.showGrid);
    this.gridVis = this.docConfig.showGrid;
    visibilityChanged = true;

    console.log("= U.DocUtil: UpdateGridVisibility - Output: Grid visibility updated to", this.gridVis);
    return visibilityChanged;
  }

  /**
   * Updates the grid display in the document
   * Creates visual grid lines based on ruler settings and document scale
   * Adds major and minor grid lines with appropriate styling
   * @returns void
   */
  UpdateGrid(): void {
    console.log("= U.DocUtil: UpdateGrid - Input:", {
      workArea: this.svgDoc.GetWorkArea(),
      gridLayer: this.gridLayer,
      rulerSettings: this.rulerConfig
    });

    const workArea = this.svgDoc.GetWorkArea();
    const gridLayer = this.svgDoc.GetLayer(this.gridLayer);
    let unitConversionFactor = 1;

    if (gridLayer) {
      // Get the scale factor based on the current conversion factor
      const scaleFactor = this.GetScaledRuler(unitConversionFactor);
      gridLayer.RemoveAll();

      const majorGridPath = this.svgDoc.CreateShape(ConstantData.CreateShapeType.PATH);
      const minorGridPath = this.svgDoc.CreateShape(ConstantData.CreateShapeType.PATH);

      // Update unitConversionFactor if not using inches
      if (!this.rulerConfig.useInches) {
        unitConversionFactor = ConstantData.Defines.MetricConv;
      }

      const majorUnitSize = this.rulerConfig.major / unitConversionFactor;
      const gridDivisions = this.rulerConfig.nGrid * scaleFactor;

      let majorPathCommands = "";
      let minorPathCommands = "";

      // Calculate margins and document boundaries
      const paperSize = T3Gv.optManager.theContentHeader.Page.papersize;
      const margins = T3Gv.optManager.theContentHeader.Page.margins;
      const paperMarginWidth =
        paperSize.x - (margins.left + margins.right) / 2;
      const paperMarginHeight =
        paperSize.y - (margins.top + margins.bottom) / 2;

      // Compute screen boundaries for the grid
      const endX = Utils1.RoundCoordLP(
        workArea.docScreenWidth + 2 * paperMarginWidth * workArea.docToScreenScale
      );
      const endY = Utils1.RoundCoordLP(
        workArea.docScreenHeight + 2 * paperMarginHeight * workArea.docToScreenScale
      );
      const startX = -Utils1.RoundCoordLP(
        paperMarginWidth * workArea.docToScreenScale
      );
      const startY = -Utils1.RoundCoordLP(
        paperMarginHeight * workArea.docToScreenScale
      );
      const maxX = startX + endX;
      const maxY = startY + endY;

      // Calculate horizontal grid lines (vertical lines in the grid)
      let horizontalOriginOffset = this.rulerConfig.originx - Math.floor(this.rulerConfig.originx);
      if (horizontalOriginOffset) {
        horizontalOriginOffset -= 1;
      }
      // Adjust the starting offset in document units
      horizontalOriginOffset *= majorUnitSize;

      // Start index for horizontal grid lines
      let horizontalGridIndex = -Math.ceil(paperMarginWidth / majorUnitSize);
      let currentXPosition = 0;
      let tempXValue = 0;
      do {
        // Calculate the current grid line position in document units
        tempXValue = horizontalOriginOffset + horizontalGridIndex * (this.rulerConfig.major / unitConversionFactor);
        currentXPosition = Utils1.RoundCoordLP(tempXValue * workArea.docToScreenScale);
        if (currentXPosition > maxX) break;

        // Append the major grid line (vertical line)
        majorPathCommands += `M${currentXPosition},${startY}v${endY}`;
        // Draw intermediate (minor) grid lines between major grid lines
        for (let divisionIndex = 1; divisionIndex < gridDivisions; divisionIndex++) {
          tempXValue =
            horizontalOriginOffset +
            horizontalGridIndex * (this.rulerConfig.major / unitConversionFactor) +
            divisionIndex * (majorUnitSize / gridDivisions);
          currentXPosition = Utils1.RoundCoordLP(tempXValue * workArea.docToScreenScale);
          if (currentXPosition > maxX) break;
          minorPathCommands += `M${currentXPosition},${startY}v${endY}`;
        }
        horizontalGridIndex++;
      } while (currentXPosition < maxX);

      // Calculate vertical grid lines (horizontal lines in the grid)
      let verticalOriginOffset = this.rulerConfig.originy - Math.floor(this.rulerConfig.originy);
      if (verticalOriginOffset) {
        verticalOriginOffset -= 1;
      }
      verticalOriginOffset *= majorUnitSize;

      // Start index for vertical grid lines
      let verticalGridIndex = -Math.ceil(paperMarginHeight / majorUnitSize);
      let currentYPosition = 0;
      let tempYValue = 0;
      do {
        tempYValue = verticalOriginOffset + verticalGridIndex * (this.rulerConfig.major / unitConversionFactor);
        currentYPosition = Utils1.RoundCoordLP(tempYValue * workArea.docToScreenScale);
        if (currentYPosition > maxY) break;

        // Append the major grid line (horizontal line)
        majorPathCommands += `M${startX},${currentYPosition}h${endX}`;
        // Draw intermediate (minor) grid lines between major lines
        for (let divisionIndex = 1; divisionIndex < gridDivisions; divisionIndex++) {
          tempYValue =
            verticalOriginOffset +
            verticalGridIndex * (this.rulerConfig.major / unitConversionFactor) +
            divisionIndex * (majorUnitSize / gridDivisions);
          currentYPosition = Utils1.RoundCoordLP(tempYValue * workArea.docToScreenScale);
          if (currentYPosition > maxY) break;
          minorPathCommands += `M${startX},${currentYPosition}h${endX}`;
        }
        verticalGridIndex++;
      } while (currentYPosition < maxY);

      // Set the path and styling for major grid lines
      majorGridPath.SetPath(majorPathCommands);
      majorGridPath.SetFillColor("none");
      majorGridPath.SetStrokeColor("#000");
      majorGridPath.SetStrokeOpacity(".4");
      majorGridPath.SetStrokeWidth(".5");

      // Set the path and styling for minor grid lines
      minorGridPath.SetPath(minorPathCommands);
      minorGridPath.SetFillColor("none");
      minorGridPath.SetStrokeColor("#000");
      minorGridPath.SetStrokeOpacity(".2");
      minorGridPath.SetStrokeWidth(".5");

      gridLayer.AddElement(minorGridPath);
      gridLayer.AddElement(majorGridPath);
      gridLayer.SetEventBehavior(ConstantData.EventBehavior.NONE);

      console.log("= U.DocUtil: UpdateGrid - Output:", {
        majorPathCommands,
        minorPathCommands,
        boundaries: { startX, startY, endX, endY, maxX, maxY }
      });
    }
  }

  /**
   * Updates the visibility of page dividers based on document configuration
   * Shows or hides page divider lines according to settings and print flags
   * Ensures consistent display across document views
   * @returns boolean - True if visibility was changed, false otherwise
   */
  UpdatePageDividerVisibility(): boolean {
    console.log("= U.DocUtil: UpdatePageDividerVisibility - Input:", {
      showPageDivider: this.docConfig.showPageDivider,
      printFlags: T3Gv.optManager.theContentHeader.Page.printflags,
      layerExists: !!(this.svgDoc && this.svgDoc.GetLayer(this.pageDividerLayer))
    });

    // Get the page divider layer from the SVG document
    const pageDividerLayer = this.svgDoc ? this.svgDoc.GetLayer(this.pageDividerLayer) : null;

    // Get print flags from the document configuration
    const documentPrintFlags = T3Gv.optManager.theContentHeader.Page.printflags;

    // Determine if page dividers should be shown based on print flags and config
    const shouldShowDividers =
      !(documentPrintFlags & FileParser.PrintFlags.SEP_OnePage) &&
      !(documentPrintFlags & FileParser.PrintFlags.SEP_CustomPageSize) &&
      this.docConfig.showPageDivider;

    // If page divider layer doesn't exist, exit with false
    if (!pageDividerLayer) {
      console.log("= U.DocUtil: UpdatePageDividerVisibility - Output:", {
        message: "Page divider layer not found."
      });
      return false;
    }

    // If visibility state is already correct, no change needed
    if (shouldShowDividers === pageDividerLayer.GetVisible()) {
      console.log("= U.DocUtil: UpdatePageDividerVisibility - Output:", {
        message: "Visibility unchanged.",
        currentVisibility: pageDividerLayer.GetVisible()
      });
      return false;
    } else {
      // Update visibility and return true to indicate change
      pageDividerLayer.SetVisible(shouldShowDividers);
      console.log("= U.DocUtil: UpdatePageDividerVisibility - Output:", {
        updatedVisibility: shouldShowDividers
      });
      return true;
    }
  }

  /**
   * Updates the page divider lines in the document
   * Draws horizontal and vertical lines to indicate page boundaries
   * Creates visual guides that show where pages will break during printing
   * @returns void
   */
  UpdatePageDivider(): void {
    console.log("= U.DocUtil: UpdatePageDivider - Input: Updating page dividers");

    // Retrieve current work area and page divider layer
    const workArea = this.svgDoc.GetWorkArea();
    const pageDividerLayer = this.svgDoc.GetLayer(this.pageDividerLayer);

    if (pageDividerLayer) {
      // Clear existing divider elements
      pageDividerLayer.RemoveAll();

      // Create a new path shape for the page divider
      const dividerPathShape = this.svgDoc.CreateShape(ConstantData.CreateShapeType.PATH);
      let pathCommands = '';

      // Get document page settings
      const pageSettings = T3Gv.optManager.theContentHeader.Page;
      const paperSize = pageSettings.papersize;
      const margins = pageSettings.margins;

      // Ensure margins don't exceed paper dimensions
      if (paperSize.x - (margins.left + margins.right) <= 0) {
        margins.left = 50;
        margins.right = 50;
      }
      if (paperSize.y - (margins.top + margins.bottom) <= 0) {
        margins.top = 50;
        margins.bottom = 50;
      }

      // Calculate effective paper width and height (accounting for margins)
      let effectivePaperWidth = paperSize.x - (margins.left + margins.right);
      let effectivePaperHeight = paperSize.y - (margins.top + margins.bottom);

      // Scale dimensions to screen coordinates
      const screenPaperWidth = effectivePaperWidth * workArea.docToScreenScale;
      const screenPaperHeight = effectivePaperHeight * workArea.docToScreenScale;

      // Draw vertical dividers along the width
      let horizontalPosition = screenPaperWidth;
      while (horizontalPosition < workArea.docScreenWidth) {
        pathCommands += 'M' + Utils1.RoundCoordLP(horizontalPosition) + ',0v' + workArea.docScreenHeight;
        horizontalPosition += screenPaperWidth;
      }

      // Draw horizontal dividers along the height
      let verticalPosition = screenPaperHeight;
      while (verticalPosition < workArea.docScreenHeight) {
        pathCommands += 'M0,' + Utils1.RoundCoordLP(verticalPosition) + 'h' + workArea.docScreenWidth;
        verticalPosition += screenPaperHeight;
      }

      // Apply path and styling settings to the shape
      dividerPathShape.SetPath(pathCommands);
      dividerPathShape.SetFillColor('none');
      dividerPathShape.SetStrokeColor('#000088');
      dividerPathShape.SetStrokeOpacity('.6');
      dividerPathShape.SetStrokePattern('10,4');
      dividerPathShape.SetStrokeWidth('.5');

      // Add the completed shape to the page divider layer
      pageDividerLayer.AddElement(dividerPathShape);

      console.log("= U.DocUtil: UpdatePageDivider - Output:", {
        screenPaperDimensions: { width: screenPaperWidth, height: screenPaperHeight },
        pathCommandLength: pathCommands.length
      });
    } else {
      console.log("= U.DocUtil: UpdatePageDivider - Output: No page divider layer found");
    }
  }

  /**
   * Snaps a point to the nearest grid intersection based on ruler configuration
   * Calculates grid positioning using ruler settings and document scale
   * Ensures precise alignment with the document grid for accurate placement
   * @param point - The coordinate point to snap to grid
   * @returns Object containing the snapped x and y coordinates
   */
  SnapToGrid(point: { x: number; y: number }): { x: number; y: number } {
    console.log("= U.DocUtil: SnapToGrid - Input:", point);

    // Ensure the work area is updated
    this.svgDoc.GetWorkArea();

    // Determine conversion factor based on units (inches or metric)
    let unitConversionFactor = 1;
    if (!this.rulerConfig.useInches) {
      unitConversionFactor = ConstantData.Defines.MetricConv;
    }

    // Get the scale adjustment for the current document zoom
    const scaleAdjustment = this.GetScaledRuler(unitConversionFactor);

    // Create copy of input coordinates to work with
    let remainingDistance = { x: point.x, y: point.y };
    let snappedCoordinates = { x: 0, y: 0 };

    // Calculate major grid unit size in document units
    const majorGridUnit = this.rulerConfig.major / unitConversionFactor;

    // Calculate snap step size (distance between grid points to snap to)
    const snapStepSize = majorGridUnit / (this.rulerConfig.nGrid * scaleAdjustment);

    // Process X coordinate snapping
    const majorGridCountX = Math.floor(remainingDistance.x / majorGridUnit);
    snappedCoordinates.x = majorGridCountX * majorGridUnit;
    remainingDistance.x -= snappedCoordinates.x;
    const snapStepCountX = Math.round(remainingDistance.x / snapStepSize);
    snappedCoordinates.x += snapStepCountX * snapStepSize;

    // Process Y coordinate snapping
    const majorGridCountY = Math.floor(remainingDistance.y / majorGridUnit);
    snappedCoordinates.y = majorGridCountY * majorGridUnit;
    remainingDistance.y -= snappedCoordinates.y;
    const snapStepCountY = Math.round(remainingDistance.y / snapStepSize);
    snappedCoordinates.y += snapStepCountY * snapStepSize;

    console.log("= U.DocUtil: SnapToGrid - Output:", snappedCoordinates);
    return snappedCoordinates;
  }

  /**
   * Handles double-click events on the top (horizontal) ruler
   * Stops event propagation and triggers the ruler double-click handler
   * @param event - The double-click event object
   * @returns void
   */
  RulerTopDoubleClick(event: any): void {
    console.log("= U.DocUtil: RulerTopDoubleClick - Input:", { event });

    Utils2.StopPropagationAndDefaults(event);
    T3Gv.docUtil.RulerHandleDoubleClick(event, false, true);

    console.log("= U.DocUtil: RulerTopDoubleClick - Output: Completed");
  }

  /**
   * Handles double-click events on the left (vertical) ruler
   * Stops event propagation and triggers the ruler double-click handler
   * @param event - The double-click event object
   * @returns void
   */
  RulerLeftDoubleClick(event: any): void {
    console.log("= U.DocUtil: RulerLeftDoubleClick - Input:", { event });

    Utils2.StopPropagationAndDefaults(event);
    T3Gv.docUtil.RulerHandleDoubleClick(event, true, false);

    console.log("= U.DocUtil: RulerLeftDoubleClick - Output: Completed");
  }

  /**
   * Handles double-click events on the center ruler intersection
   * Stops event propagation and triggers the ruler double-click handler
   * @param event - The double-click event object
   * @returns void
   */
  RulerCenterDoubleClick(event: any): void {
    console.log("= U.DocUtil: RulerCenterDoubleClick - Input:", { event });

    Utils2.StopPropagationAndDefaults(event);
    T3Gv.docUtil.RulerHandleDoubleClick(event, true, true);

    console.log("= U.DocUtil: RulerCenterDoubleClick - Output: Completed");
  }

  /**
   * Handles the start of a drag operation on a ruler
   * Checks if the document is read-only and handles right-click events
   * Sets the ruler drag state to enable subsequent drag processing
   * @param dragEvent - The event object containing drag start information
   * @returns void
   */
  RulerDragStart(dragEvent: any): void {
    console.log("= U.DocUtil: RulerDragStart - Input:", { dragEvent });

    if (!T3Gv.docUtil.IsReadOnly()) {
      if (T3Gv.optManager.IsRightClick(dragEvent)) {
        Utils2.StopPropagationAndDefaults(dragEvent);
        console.log("= U.DocUtil: RulerDragStart - Output: Right click detected, operation canceled");
        return;
      }
      T3Gv.docUtil.rulerInDrag = true;
    }

    console.log("= U.DocUtil: RulerDragStart - Output:", { rulerInDrag: T3Gv.docUtil.rulerInDrag });
  }

  /**
   * Handles drag events on the top (horizontal) ruler
   * Processes special cases like Ctrl+click to handle as double-click
   * Initiates ruler guides for horizontal positioning
   * @param dragEvent - The drag event object containing position information
   * @returns void
   */
  RulerTopDrag(dragEvent: any): void {
    console.log("= U.DocUtil: RulerTopDrag - Input:", { dragEvent });

    Utils2.StopPropagationAndDefaults(dragEvent);

    if (T3Gv.optManager.IsCtrlClick(dragEvent)) {
      Utils2.StopPropagationAndDefaults(dragEvent);
      T3Gv.docUtil.RulerHandleDoubleClick(dragEvent, false, true);
      console.log("= U.DocUtil: RulerTopDrag - Output: Handled as double click");
      return;
    }

    T3Gv.docUtil.RulerDragGuides(dragEvent, false, true);
    console.log("= U.DocUtil: RulerTopDrag - Output: Drag guides initiated");
  }

  /**
   * Handles drag events on the left (vertical) ruler
   * Processes special cases like Ctrl+click to handle as double-click
   * Initiates ruler guides for vertical positioning
   * @param dragEvent - The drag event object containing position information
   * @returns void
   */
  RulerLeftDrag(dragEvent: any): void {
    console.log("= U.DocUtil: RulerLeftDrag - Input:", { dragEvent });

    // Stop event propagation and defaults
    Utils2.StopPropagationAndDefaults(dragEvent);

    if (T3Gv.optManager.IsCtrlClick(dragEvent)) {
      console.log("= U.DocUtil: RulerLeftDrag - Ctrl click detected");
      Utils2.StopPropagationAndDefaults(dragEvent);
      T3Gv.docUtil.RulerHandleDoubleClick(dragEvent, true, false);
      console.log("= U.DocUtil: RulerLeftDrag - Output: Handled as double click");
      return;
    }

    T3Gv.docUtil.RulerDragGuides(dragEvent, true, false);
    console.log("= U.DocUtil: RulerLeftDrag - Output: Drag guides initiated");
  }

  /**
   * Handles drag events on the center ruler intersection
   * Processes special cases like Ctrl+click to handle as double-click
   * Initiates ruler guides for both horizontal and vertical positioning
   * @param event - The drag event object containing position information
   * @returns void
   */
  RulerCenterDrag(event: any): void {
    console.log("= U.DocUtil: RulerCenterDrag - Input:", { event });

    // Stop event propagation and defaults
    Utils2.StopPropagationAndDefaults(event);

    // Check if Ctrl-click is detected
    if (T3Gv.optManager.IsCtrlClick(event)) {
      console.log("= U.DocUtil: RulerCenterDrag - Ctrl click detected, invoking double click handler");
      Utils2.StopPropagationAndDefaults(event);
      T3Gv.docUtil.RulerHandleDoubleClick(event, true, true);
      console.log("= U.DocUtil: RulerCenterDrag - Output: Double click action completed");
      return;
    }

    // Initiate ruler drag guides for center ruler
    T3Gv.docUtil.RulerDragGuides(event, true, true);
    console.log("= U.DocUtil: RulerCenterDrag - Output: Drag guides initiated");
  }

  /**
   * Handles the end of a drag operation on a ruler
   * Stops event propagation and terminates any active ruler guides
   * Resets the ruler drag state to prevent further drag processing
   * @param event - The drag end event object
   * @returns void
   */
  RulerDragEnd(event) {
    console.log("= U.DocUtil: RulerDragEnd - Input:", { event });

    Utils2.StopPropagationAndDefaults(event);
    T3Gv.docUtil.RulerEndGuides();

    console.log("= U.DocUtil: RulerDragEnd - Output: Completed");
  }

  /**
   * Handles double-click events on rulers to set origin points
   * Processes clicks differently based on whether it's the horizontal, vertical or center ruler
   * Updates ruler origins and refreshes related UI components
   * @param clickEvent - The double-click event object
   * @param isVerticalRuler - Whether the click is on the vertical ruler
   * @param isIntersectionPoint - Whether the click is at the ruler intersection point
   * @returns void
   */
  RulerHandleDoubleClick(clickEvent: any, isVerticalRuler: boolean, isIntersectionPoint: boolean): void {
    console.log("= U.DocUtil: RulerHandleDoubleClick - Input:", { clickEvent, isVerticalRuler, isIntersectionPoint });

    // Check if the event is not a right-click
    if (!T3Gv.optManager.IsRightClick(clickEvent)) {
      // Initialize new origin values using current ruler settings
      let originUpdates = {
        originx: this.rulerConfig.originx,
        originy: this.rulerConfig.originy
      };

      // Convert window coordinates to document coordinates
      const documentCoordinates = this.svgDoc.ConvertWindowToDocCoords(
        clickEvent.gesture.center.clientX,
        clickEvent.gesture.center.clientY
      );
      this.svgDoc.GetWorkArea();

      // End any ongoing ruler drag
      this.rulerInDrag = false;

      if (!this.IsReadOnly()) {
        if (isVerticalRuler && isIntersectionPoint) {
          // If both vertical and center are true, reset both origins to zero.
          originUpdates.originx = 0;
          originUpdates.originy = 0;
        } else if (isIntersectionPoint) {
          // If only center is active, update the horizontal origin.
          originUpdates.originx = documentCoordinates.x / this.rulerConfig.major;
          if (!this.rulerConfig.useInches) {
            originUpdates.originx *= ConstantData.Defines.MetricConv;
          }
        } else if (isVerticalRuler) {
          // If only vertical is active, update the vertical origin.
          originUpdates.originy = documentCoordinates.y / this.rulerConfig.major;
          if (!this.rulerConfig.useInches) {
            originUpdates.originy *= ConstantData.Defines.MetricConv;
          }
        } else {
          console.log("= U.DocUtil: RulerHandleDoubleClick - Early Exit: No valid direction specified.");
          return;
        }

        // Update rulers with the new origin values and show coordinates
        this.SetRulers(originUpdates);
        this.ShowCoordinates(true);

        // Update selection attributes for the currently selected object(s)
        const selectedObjects = T3Gv.optManager.GetObjectPtr(T3Gv.optManager.theSelectedListBlockID, false);
        T3Gv.optManager.UpdateSelectionAttributes(selectedObjects);

        console.log("= U.DocUtil: RulerHandleDoubleClick - Output:", { updatedOrigins: originUpdates, selectedObjects });
      }
    }
  }

  /**
   * Creates and manages guide lines when dragging from rulers
   * Handles positioning, appearance, and scrolling behavior of ruler guides
   * Supports both horizontal and vertical guides based on drag direction
   * @param dragEvent - The drag event containing position and gesture data
   * @param isVerticalRuler - Whether the drag originated from the vertical ruler
   * @param isHorizontalRuler - Whether the drag originated from the horizontal ruler
   * @returns void
   */
  RulerDragGuides(dragEvent: any, isVerticalRuler: boolean, isHorizontalRuler: boolean): void {
    console.log("= U.DocUtil: RulerDragGuides - Input:", { dragEvent, isVerticalRuler, isHorizontalRuler });

    const workArea = this.svgDoc.GetWorkArea();
    const scaleFactor = 1 / workArea.docScale;
    const dashPattern = `${4 * scaleFactor},${2 * scaleFactor}`;

    if (this.rulerInDrag) {
      // Reset guides if the current state doesn't match what we need for this drag
      if (
        (this.hRulerGuide && !isHorizontalRuler) ||
        (this.vRulerGuide && !isVerticalRuler) ||
        (isHorizontalRuler && !this.hRulerGuide) ||
        (isVerticalRuler && !this.vRulerGuide)
      ) {
        this.RulerEndGuides();
        this.rulerInDrag = true;
      }

      // Create horizontal guide line if needed
      if (isVerticalRuler && !this.hRulerGuide) {
        this.hRulerGuide = this.svgDoc.CreateShape(ConstantData.CreateShapeType.LINE);
        this.hRulerGuide.SetFillColor('none');
        this.hRulerGuide.SetStrokeColor('black');
        this.hRulerGuide.SetStrokeWidth(scaleFactor);
        this.hRulerGuide.SetStrokePattern(dashPattern);
        T3Gv.optManager.svgOverlayLayer.AddElement(this.hRulerGuide);
      }

      // Create vertical guide line if needed
      if (isHorizontalRuler && !this.vRulerGuide) {
        this.vRulerGuide = this.svgDoc.CreateShape(ConstantData.CreateShapeType.LINE);
        this.vRulerGuide.SetFillColor('none');
        this.vRulerGuide.SetStrokeColor('black');
        this.vRulerGuide.SetStrokeWidth(scaleFactor);
        this.vRulerGuide.SetStrokePattern(dashPattern);
        T3Gv.optManager.svgOverlayLayer.AddElement(this.vRulerGuide);
      }

      // Update guide position from cursor coordinates
      this.rulerGuideWinPos.x = dragEvent.gesture.center.clientX;
      this.rulerGuideWinPos.y = dragEvent.gesture.center.clientY;

      // For vertical ruler only, position guide horizontally at the center
      if (!isHorizontalRuler) {
        this.rulerGuideWinPos.x = workArea.dispX + workArea.dispWidth / 2;
      }

      // For horizontal ruler only, position guide vertically at the center
      if (!isVerticalRuler) {
        this.rulerGuideWinPos.y = workArea.dispY + workArea.dispHeight / 2;
      }

      // Draw the guides at calculated positions
      this.RulerDrawGuides();

      // Start auto-scrolling timer if needed
      const shouldStartAutoScroll = !this.rulerGuideScrollTimer && (
        !(isVerticalRuler && isHorizontalRuler) ||
        (this.rulerGuideWinPos.x > workArea.dispX && this.rulerGuideWinPos.y > workArea.dispY)
      );

      if (shouldStartAutoScroll) {
        this.rulerGuideScrollTimer = setInterval(() => {
          T3Gv.docUtil.RulerAutoScrollGuides();
        }, 100);
      }
    }

    console.log("= U.DocUtil: RulerDragGuides - Output:", {
      horizontalGuide: this.hRulerGuide ? "exists" : "null",
      verticalGuide: this.vRulerGuide ? "exists" : "null",
      guidePosition: this.rulerGuideWinPos,
      autoScrollTimer: this.rulerGuideScrollTimer ? "active" : "inactive"
    });
  }

  /**
   * Automatically scrolls the document when ruler guides are dragged beyond visible boundaries
   * Checks if the ruler guide position is outside the visible work area and scrolls if needed
   * Updates guide display after scrolling to maintain proper visual feedback
   * @returns void
   */
  RulerAutoScrollGuides(): void {
    console.log("= U.DocUtil: RulerAutoScrollGuides - Input:", {
      rulerGuideWinPos: this.rulerGuideWinPos,
      workArea: this.svgDoc.GetWorkArea()
    });

    const workArea = this.svgDoc.GetWorkArea();
    let requiresAutoScroll = false;
    const documentCoordinates = this.svgDoc.ConvertWindowToDocCoords(
      this.rulerGuideWinPos.x,
      this.rulerGuideWinPos.y
    );

    // Check if the ruler guide window position is outside of the visible work area
    if (
      this.rulerGuideWinPos.x < workArea.dispX ||
      this.rulerGuideWinPos.x > workArea.dispX + workArea.dispWidth ||
      this.rulerGuideWinPos.y < workArea.dispY ||
      this.rulerGuideWinPos.y > workArea.dispY + workArea.dispHeight
    ) {
      requiresAutoScroll = true;
    }

    if (requiresAutoScroll) {
      this.ScrollToPosition(documentCoordinates.x, documentCoordinates.y);
      this.RulerDrawGuides();
    }

    console.log("= U.DocUtil: RulerAutoScrollGuides - Output:", {
      autoScrollPerformed: requiresAutoScroll,
      documentCoordinates: documentCoordinates
    });
  }

  /**
   * Updates the position and visibility of ruler guide lines during drag operations
   * Converts window coordinates to document coordinates and applies snapping if enabled
   * Ensures guides stay within the visible document boundaries
   * @returns void
   */
  RulerDrawGuides(): void {
    console.log("= U.DocUtil: RulerDrawGuides - Input:", {
      mouseWindowPosition: this.rulerGuideWinPos,
      hRulerGuide: this.hRulerGuide ? "exists" : "null",
      vRulerGuide: this.vRulerGuide ? "exists" : "null"
    });

    // Get current work area dimensions and constraints
    const workArea = this.svgDoc.GetWorkArea();

    // Convert window coordinates to document coordinates
    let documentCoordinates = this.svgDoc.ConvertWindowToDocCoords(
      this.rulerGuideWinPos.x,
      this.rulerGuideWinPos.y
    );

    // Apply grid snapping if enabled in document configuration
    if (this.docConfig.enableSnap) {
      documentCoordinates = this.SnapToGrid(documentCoordinates);
    }

    // Update vertical ruler guide position (if it exists)
    if (this.vRulerGuide) {
      // Constrain x coordinate to visible document boundaries
      if (documentCoordinates.x < workArea.docVisX) {
        documentCoordinates.x = workArea.docVisX;
      } else if (documentCoordinates.x > workArea.docVisX + workArea.docVisWidth) {
        documentCoordinates.x = workArea.docVisX + workArea.docVisWidth;
      }

      // Set the line coordinates from top to bottom of document
      this.vRulerGuide.SetPoints(
        documentCoordinates.x, 0,
        documentCoordinates.x, workArea.docHeight
      );
    }

    // Update horizontal ruler guide position (if it exists)
    if (this.hRulerGuide) {
      // Constrain y coordinate to visible document boundaries
      if (documentCoordinates.y < workArea.docVisY) {
        documentCoordinates.y = workArea.docVisY;
      } else if (documentCoordinates.y > workArea.docVisY + workArea.docVisHeight) {
        documentCoordinates.y = workArea.docVisY + workArea.docVisHeight;
      }

      // Set the line coordinates from left to right of document
      this.hRulerGuide.SetPoints(
        0, documentCoordinates.y,
        workArea.docWidth, documentCoordinates.y
      );
    }

    console.log("= U.DocUtil: RulerDrawGuides - Output:", {
      constrainedCoordinates: documentCoordinates,
      workAreaBounds: {
        horizontal: { min: workArea.docVisX, max: workArea.docVisX + workArea.docVisWidth },
        vertical: { min: workArea.docVisY, max: workArea.docVisY + workArea.docVisHeight }
      }
    });
  }

  /**
   * Terminates ruler guides by clearing timers and removing guide elements
   * Cleans up any active ruler guide elements and resets drag state
   * @returns void
   */
  RulerEndGuides(): void {
    console.log("= U.DocUtil: RulerEndGuides - Input:", {
      rulerGuideScrollTimer: this.rulerGuideScrollTimer,
      horizontalRulerGuide: this.hRulerGuide,
      verticalRulerGuide: this.vRulerGuide,
      rulerInDrag: this.rulerInDrag
    });

    // Clear auto-scroll timer if active
    if (this.rulerGuideScrollTimer) {
      clearInterval(this.rulerGuideScrollTimer);
      this.rulerGuideScrollTimer = null;
    }

    // Remove horizontal ruler guide if it exists
    if (this.hRulerGuide) {
      T3Gv.optManager.svgOverlayLayer.RemoveElement(this.hRulerGuide);
      this.hRulerGuide = null;
    }

    // Remove vertical ruler guide if it exists
    if (this.vRulerGuide) {
      T3Gv.optManager.svgOverlayLayer.RemoveElement(this.vRulerGuide);
      this.vRulerGuide = null;
    }

    // Reset ruler drag state
    this.rulerInDrag = false;

    console.log("= U.DocUtil: RulerEndGuides - Output:", {
      rulerGuideScrollTimer: this.rulerGuideScrollTimer,
      horizontalRulerGuide: this.hRulerGuide,
      verticalRulerGuide: this.vRulerGuide,
      rulerInDrag: this.rulerInDrag
    });
  }

  /**
   * Snaps a rectangle to the nearest grid points by calculating optimal snap offsets
   * Determines whether to snap based on top-left or bottom-right corners
   * Returns the x and y offsets needed to move the rectangle to the nearest grid position
   * @param rectangle - The rectangle to snap with x, y, width, and height properties
   * @returns Object containing x and y offsets to apply for snapping
   */
  SnapRect(rectangle: { x: number; y: number; width: number; height: number }): { x: number; y: number } {
    console.log("= U.DocUtil: SnapRect - Input:", rectangle);

    // Calculate the original top-left and bottom-right coordinates
    const topLeftCorner = { x: rectangle.x, y: rectangle.y };
    const bottomRightCorner = { x: rectangle.x + rectangle.width, y: rectangle.y + rectangle.height };

    // Snap the top-left and bottom-right coordinates to the grid
    const snappedTopLeft = this.SnapToGrid(topLeftCorner);
    const snappedBottomRight = this.SnapToGrid(bottomRightCorner);

    // Calculate the difference for the x coordinate
    const xOffsetFromTopLeft = snappedTopLeft.x - topLeftCorner.x;
    const xOffsetFromBottomRight = snappedBottomRight.x - bottomRightCorner.x;
    const optimalXOffset = Math.abs(xOffsetFromTopLeft) > Math.abs(xOffsetFromBottomRight)
      ? xOffsetFromBottomRight
      : xOffsetFromTopLeft;

    // Calculate the difference for the y coordinate
    const yOffsetFromTopLeft = snappedTopLeft.y - topLeftCorner.y;
    const yOffsetFromBottomRight = snappedBottomRight.y - bottomRightCorner.y;
    const optimalYOffset = Math.abs(yOffsetFromTopLeft) > Math.abs(yOffsetFromBottomRight)
      ? yOffsetFromBottomRight
      : yOffsetFromTopLeft;

    const snapOffsets = { x: optimalXOffset, y: optimalYOffset };
    console.log("= U.DocUtil: SnapRect - Output:", snapOffsets);
    return snapOffsets;
  }

  /**
   * Updates the document configuration with new settings and refreshes UI components
   * Updates visibility of rulers, grid, and page dividers based on new configuration
   * @param documentConfiguration - Configuration object containing document display settings
   * @returns void
   */
  UpdateConfig(documentConfiguration: any): void {
    console.log("= U.DocUtil: UpdateConfig - Input:", documentConfiguration);
    this.docConfig = documentConfiguration;
    this.UpdateRulerVisibility();
    this.UpdateGridVisibility();
    this.UpdatePageDividerVisibility();
    console.log("= U.DocUtil: UpdateConfig - Output: Updated docConfig", this.docConfig);
  }

  /**
   * Gets the background element of the document
   * Returns the SVG element that represents the document background
   * @returns SVG element for the document background
   */
  GetBackground(): any {
    console.log("= U.DocUtil: GetBackground - Input: Getting background element");

    const backgroundElement = this.backgroundElem;

    console.log("= U.DocUtil: GetBackground - Output:", backgroundElement ? "Background element retrieved" : "No background element");
    return backgroundElement;
  }

  /**
   * Checks if the document is in read-only mode
   * Returns a boolean value indicating document's read-only state
   * @returns boolean - False if document is editable, true if read-only
   */
  IsReadOnly(): boolean {
    console.log("= U.DocUtil: IsReadOnly - Input: Checking document read-only state");

    const readOnlyState = false;

    console.log("= U.DocUtil: IsReadOnly - Output:", readOnlyState);
    return readOnlyState;
  }

  /**
   * Zooms in or out on the document by a factor of 0.25
   * @param isZoomIn - True to zoom in, false to zoom out
   * @param eventSource - The source of the event triggering the zoom
   * @returns void
   */
  ZoomInAndOut(isZoomIn, eventSource?) {
    console.log("O.DocOpt - ZoomInAndOut - Input:", { isZoomIn, eventSource });

    const zoomStep = 0.25;
    let newZoomFactor;
    const currentZoomFactor = T3Gv.docUtil.GetZoomFactor();

    console.log("O.DocOpt - ZoomInAndOut - Current zoom factor:", currentZoomFactor);

    if (isZoomIn) {
      // Zoom in logic
      if (currentZoomFactor >= 4) {
        console.log("O.DocOpt - ZoomInAndOut - Already at maximum zoom (4x), exiting");
        return;
      }

      // Calculate new zoom factor
      newZoomFactor = Math.ceil(currentZoomFactor / zoomStep) * zoomStep;

      // If current zoom is already at a multiple of zoomStep, increase by one step
      if (newZoomFactor === currentZoomFactor) {
        newZoomFactor = currentZoomFactor + zoomStep;
      }

      // Ensure we don't exceed maximum zoom
      if (newZoomFactor > 4) {
        newZoomFactor = 4;
      }
    } else {
      // Zoom out logic
      if (currentZoomFactor <= 0.25) {
        console.log("O.DocOpt - ZoomInAndOut - Already at minimum zoom (0.25x), exiting");
        return;
      }

      // Calculate new zoom factor
      newZoomFactor = Math.floor(currentZoomFactor / zoomStep) * zoomStep;

      // If current zoom is already at a multiple of zoomStep, decrease by one step
      if (newZoomFactor === currentZoomFactor) {
        newZoomFactor = currentZoomFactor - zoomStep;
      }

      // Ensure we don't go below minimum zoom
      if (newZoomFactor < 0.25) {
        newZoomFactor = 0.25;
      }
    }

    console.log("O.DocOpt - ZoomInAndOut - Setting new zoom factor:", newZoomFactor);

    // Convert zoom factor to percentage and apply it
    this.SetZoomLevel(100 * newZoomFactor, eventSource);
  }

  /**
   * Sets the zoom level of the document
   * @param zoomPercentage - The zoom level as a percentage (e.g., 100 for 100%)
   * @param eventSource - The source of the event triggering the zoom change
   * @returns void
   */
  SetZoomLevel(zoomPercentage, eventSource?) {
    console.log("O.DocOpt - SetZoomLevel - Input:", { zoomPercentage, eventSource });

    // Only proceed if zoom percentage is positive and we're not in idle state
    if (zoomPercentage > 0 && !this.inZoomIdle && T3Gv.optManager) {
      // Convert percentage to factor (e.g., 100% -> 1.0)
      T3Gv.optManager.SetDocumentScale(zoomPercentage / 100, eventSource);
      console.log("O.DocOpt - SetZoomLevel - Applied zoom factor:", zoomPercentage / 100);
    } else {
      console.log("O.DocOpt - SetZoomLevel - Zoom not applied. Conditions not met:", {
        validZoom: zoomPercentage > 0,
        notIdle: !this.inZoomIdle,
        optManagerExists: !!T3Gv.optManager
      });
    }
  }

  /**
   * Sets the zoom level based on the index in the zoomLevels array
   * @param zoomIndex - The index position in the zoomLevels array
   * @returns void
   */
  SetZoomLevelByIndex(zoomIndex) {
    console.log("O.DocOpt - SetZoomLevelByIndex - Input:", { zoomIndex });

    // Validate the zoom index is within bounds
    if (zoomIndex < 0 || zoomIndex >= this.docConfig.zoomLevels.length) {
      console.log("O.DocOpt - SetZoomLevelByIndex - Invalid zoom index, out of bounds");
      return;
    }

    // Set the current zoom index
    this.docConfig.zoom = zoomIndex;

    // Apply zoom if optManager is available
    if (T3Gv.optManager) {
      const zoomFactor = this.docConfig.zoomLevels[zoomIndex] / 100;
      console.log("O.DocOpt - SetZoomLevelByIndex - Setting zoom factor:", zoomFactor);
      T3Gv.optManager.SetDocumentScale(zoomFactor);
    } else {
      console.log("O.DocOpt - SetZoomLevelByIndex - OptManager not available, zoom not applied");
    }
  }

  /**
   * Updates zoom controls to reflect the current document zoom factor
   * Sets the zoom control value and handles the idle state during updates
   * @returns void
   */
  IdleZoomCtls() {
    console.log("O.DocOpt - IdleZoomControls - Entering function");

    const zoomControl = $('#zoom-ctl-id');
    const zoomPercentage = Math.round(100 * T3Gv.docUtil.GetZoomFactor());

    console.log("O.DocOpt - IdleZoomControls - Current zoom percentage:", zoomPercentage);

    // Get the size to fit calculation from document handler
    T3Gv.docUtil.GetSizeToFit();

    // Set the zoom control value while in idle state
    this.inZoomIdle = true;
    zoomControl.val(zoomPercentage).change();
    this.inZoomIdle = false;

    console.log("O.DocOpt - IdleZoomControls - Zoom controls updated");
  }

  ZoomIn() {
    this.ZoomInAndOut(true)
  }

  ZoomOut() {
    this.ZoomInAndOut(false)
  }
}

export default DocUtil
