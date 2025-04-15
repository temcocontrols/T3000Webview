
import GlobalData from  '../Data/T3Gv'
import $ from 'jquery'

class DocOpt {

  public config: any;

  constructor() {
    this.config = {
      showRulers: true,
      showGrid: true,
      enableSnap: true,
      centerSnap: true,
      zoom: true,
      zoomLevels: 1,
      scale: 1,
      showPageDivider: 1,
      snapToShapes: false
    };
  }

  /**
   * Zooms in or out on the document by a factor of 0.25
   * @param isZoomIn - True to zoom in, false to zoom out
   * @param eventSource - The source of the event triggering the zoom
   * @returns void
   */
  static ZoomInAndOut = function (isZoomIn, eventSource) {
    console.log("O.DocOpt - ZoomInAndOut - Input:", { isZoomIn, eventSource });

    const zoomStep = 0.25;
    let newZoomFactor;
    const currentZoomFactor = GlobalData.docHandler.GetZoomFactor();

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
  static SetZoomLevel = function (zoomPercentage, eventSource) {
    console.log("O.DocOpt - SetZoomLevel - Input:", { zoomPercentage, eventSource });

    // Only proceed if zoom percentage is positive and we're not in idle state
    if (zoomPercentage > 0 && !this.inZoomIdle && GlobalData.optManager) {
      // Convert percentage to factor (e.g., 100% -> 1.0)
      GlobalData.optManager.SetDocumentScale(zoomPercentage / 100, eventSource);
      console.log("O.DocOpt - SetZoomLevel - Applied zoom factor:", zoomPercentage / 100);
    } else {
      console.log("O.DocOpt - SetZoomLevel - Zoom not applied. Conditions not met:", {
        validZoom: zoomPercentage > 0,
        notIdle: !this.inZoomIdle,
        optManagerExists: !!GlobalData.optManager
      });
    }
  }

  /**
   * Sets the zoom level based on the index in the zoomLevels array
   * @param zoomIndex - The index position in the zoomLevels array
   * @returns void
   */
  static SetZoomLevelByIndex = function (zoomIndex) {
    console.log("O.DocOpt - SetZoomLevelByIndex - Input:", { zoomIndex });

    // Validate the zoom index is within bounds
    if (zoomIndex < 0 || zoomIndex >= this.documentConfig.zoomLevels.length) {
      console.log("O.DocOpt - SetZoomLevelByIndex - Invalid zoom index, out of bounds");
      return;
    }

    // Set the current zoom index
    this.documentConfig.zoom = zoomIndex;

    // Apply zoom if optManager is available
    if (GlobalData.optManager) {
      const zoomFactor = this.documentConfig.zoomLevels[zoomIndex] / 100;
      console.log("O.DocOpt - SetZoomLevelByIndex - Setting zoom factor:", zoomFactor);
      GlobalData.optManager.SetDocumentScale(zoomFactor);
    } else {
      console.log("O.DocOpt - SetZoomLevelByIndex - OptManager not available, zoom not applied");
    }
  }

  /**
   * Updates zoom controls to reflect the current document zoom factor
   * Sets the zoom control value and handles the idle state during updates
   * @returns void
   */
  static IdleZoomCtls = function () {
    console.log("O.DocOpt - IdleZoomControls - Entering function");

    const zoomControl = $('#zoom-ctl-id');
    const zoomPercentage = Math.round(100 * GlobalData.docHandler.GetZoomFactor());

    console.log("O.DocOpt - IdleZoomControls - Current zoom percentage:", zoomPercentage);

    // Get the size to fit calculation from document handler
    GlobalData.docHandler.GetSizeToFit();

    // Set the zoom control value while in idle state
    this.inZoomIdle = true;
    zoomControl.val(zoomPercentage).change();
    this.inZoomIdle = false;

    console.log("O.DocOpt - IdleZoomControls - Zoom controls updated");
  }

}

export default DocOpt
