

class OptHandler2 {

  /**
     * Checks if snap behavior should be overridden (based on Alt key)
     * @param inputEvent - The input event to check for Alt key state
     * @returns True if snapping should be overridden, false otherwise
     */
  OverrideSnaps(inputEvent) {
    console.log('O.Opt OverrideSnaps - Input:', inputEvent);

    // Early return if no event provided
    if (inputEvent == null) {
      console.log('O.Opt OverrideSnaps - Output: false (no event)');
      return false;
    }

    // Check for Alt key in either direct event or gesture event
    let altKeyIsPressed = inputEvent.altKey;

    if (inputEvent.gesture && inputEvent.gesture.srcEvent) {
      altKeyIsPressed = inputEvent.gesture.srcEvent.altKey;
    }

    console.log('O.Opt OverrideSnaps - Output:', altKeyIsPressed);
    return altKeyIsPressed === true;
  }


  UnbindRubberBandHammerEvents() {
    console.log('O.Opt UnbindRubberBandHammerEvents - Input');

    if (GlobalData.optManager.WorkAreaHammer) {
      GlobalData.optManager.WorkAreaHammer.off('drag');
      GlobalData.optManager.WorkAreaHammer.off('dragend');
    }

    console.log('O.Opt UnbindRubberBandHammerEvents - Output: done');
  }

  ResetAutoScrollTimer() {
    console.log('O.Opt ResetAutoScrollTimer - Input:');

    if (this.autoScrollTimerID !== -1) {
      this.autoScrollTimer.clearTimeout(this.autoScrollTimerID);
      this.autoScrollTimerID = -1;
    }

    console.log('O.Opt ResetAutoScrollTimer - Output: Timer reset');
  }

  RubberBandSelectMoveCommon(mouseX: number, mouseY: number) {
    console.log('O.Opt RubberBandSelectMoveCommon - Input:', { mouseX, mouseY });

    if (GlobalData.optManager.theRubberBand === null) {
      return;
    }

    const currentX = mouseX;
    const currentY = mouseY;
    const startX = GlobalData.optManager.theRubberBandStartX;
    const startY = GlobalData.optManager.theRubberBandStartY;

    if (currentX >= startX && currentY >= startY) {
      GlobalData.optManager.theRubberBand.SetSize(currentX - startX, currentY - startY);
      GlobalData.optManager.theRubberBandFrame = {
        x: startX,
        y: startY,
        width: currentX - startX,
        height: currentY - startY
      };
    } else if (currentY < startY) {
      if (currentX >= startX) {
        GlobalData.optManager.theRubberBand.SetSize(currentX - startX, startY - currentY);
        GlobalData.optManager.theRubberBand.SetPos(startX, currentY);
        GlobalData.optManager.theRubberBandFrame = {
          x: startX,
          y: currentY,
          width: currentX - startX,
          height: startY - currentY
        };
      } else {
        GlobalData.optManager.theRubberBand.SetSize(startX - currentX, startY - currentY);
        GlobalData.optManager.theRubberBand.SetPos(currentX, currentY);
        GlobalData.optManager.theRubberBandFrame = {
          x: currentX,
          y: currentY,
          width: startX - currentX,
          height: startY - currentY
        };
      }
    } else if (currentX < startX) {
      GlobalData.optManager.theRubberBand.SetSize(startX - currentX, currentY - startY);
      GlobalData.optManager.theRubberBand.SetPos(currentX, startY);
      GlobalData.optManager.theRubberBandFrame = {
        x: currentX,
        y: startY,
        width: startX - currentX,
        height: currentY - startY
      };
    }

    console.log('O.Opt RubberBandSelectMoveCommon - Output:', { rubberBandFrame: GlobalData.optManager.theRubberBandFrame });
  }

  ExceptionCleanup(error) {
    console.log('O.Opt ExceptionCleanup - Input:', error);

    try {
      this.TEUnregisterEvents();
      this.DeactivateAllTextEdit(true);
      this.CloseEdit(false, true);
      GlobalData.stateManager.ExceptionCleanup();
      this.ResizeSVGDocument();
      this.RenderAllSVGObjects();

      const sessionData = this.GetObjectPtr(this.theSEDSessionBlockID, false);
      const selectedList = this.GetObjectPtr(this.theSelectedListBlockID, false);
      this.UpdateSelectionAttributes(selectedList);

      console.log('O.Opt ExceptionCleanup - Output: done');
    } catch (cleanupError) {
      console.error('O.Opt ExceptionCleanup - Cleanup Error:', cleanupError);
      throw cleanupError;
    }

    throw error;
  }

  SelectAllInRect(selectionRect, allowMultipleSelection) {
    console.log("O.Opt SelectAllInRect - Input:", { selectionRect, allowMultipleSelection });

    // Get all visible objects and filter out objects flagged as not visible
    const visibleObjects = this.ActiveVisibleZList();
    const filteredObjects = this.RemoveNotVisible(visibleObjects);
    const objectCount = filteredObjects.length;
    const shapeContainerType = ConstantData.ObjectTypes.SD_OBJT_SHAPECONTAINER;

    if (objectCount !== 0) {
      // Create a clean copy of the selection rectangle
      const searchRect = {
        x: selectionRect.x,
        y: selectionRect.y,
        width: selectionRect.width,
        height: selectionRect.height
      };
      const selectedObjects = [];

      // Check each object against the selection rectangle
      for (let i = 0; i < objectCount; ++i) {
        const object = GlobalData.objectStore.GetObject(filteredObjects[i]);
        if (object != null) {
          const objectData = object.Data;

          // Skip shape containers that are in cells
          if (objectData.objecttype !== shapeContainerType || !this.ContainerIsInCell(objectData)) {
            let objectFrame = objectData.Frame;

            // If the object is rotated, calculate its actual bounding box
            if (objectData.RotationAngle) {
              const center = {
                x: objectFrame.x + objectFrame.width / 2,
                y: objectFrame.y + objectFrame.height / 2
              };
              objectFrame = GlobalData.optManager.RotateRectAboutCenter(
                objectFrame,
                center,
                objectData.RotationAngle
              );
            }

            // Add to selection if fully enclosed by the selection rectangle
            if (this.IsRectangleFullyEnclosed(searchRect, objectFrame)) {
              selectedObjects.push(filteredObjects[i]);
            }
          }
        }
      }

      // Handle the selection results
      if (selectedObjects.length === 0) {
        console.log("O.Opt SelectAllInRect - No objects found in selection rectangle");
        this.ClearSelectionClick();
      } else {
        console.log("O.Opt SelectAllInRect - Found objects:", selectedObjects.length);
        this.SelectObjects(selectedObjects, allowMultipleSelection, false);
      }
    } else {
      console.log("O.Opt SelectAllInRect - No visible objects to select");
    }

    console.log("O.Opt SelectAllInRect - Output: Selection processing completed");
  }

  RemoveNotVisible(objects) {
    console.log('O.Opt RemoveNotVisible - Input:', objects);

    const notVisibleFlag = ConstantData.ObjFlags.SEDO_NotVisible;
    const visibleObjects = [];

    for (let i = 0; i < objects.length; i++) {
      const objectId = objects[i];
      const object = this.GetObjectPtr(objectId, false);

      if (object && !(object.flags & notVisibleFlag)) {
        visibleObjects.push(objectId);
      }
    }

    console.log('O.Opt RemoveNotVisible - Output:', visibleObjects);
    return visibleObjects;
  }

  RemoveNotVisible(objects) {
    console.log('O.Opt RemoveNotVisible - Input:', objects);

    const notVisibleFlag = ConstantData.ObjFlags.SEDO_NotVisible;
    const visibleObjects = [];

    for (let i = 0; i < objects.length; i++) {
      const objectId = objects[i];
      const object = this.GetObjectPtr(objectId, false);

      if (object && !(object.flags & notVisibleFlag)) {
        visibleObjects.push(objectId);
      }
    }

    console.log('O.Opt RemoveNotVisible - Output:', visibleObjects);
    return visibleObjects;
  }

  IsCtrlClick(event) {
    console.log('O.Opt IsCtrlClick - Input:', event);

    let isCtrlClick = false;

    if (event.gesture) {
      event = event.gesture.srcEvent;
    }

    if (event instanceof MouseEvent) {
      isCtrlClick = event.ctrlKey;
    } else if ('onpointerdown' in window && event instanceof PointerEvent) {
      isCtrlClick = event.ctrlKey;
    }

    console.log('O.Opt IsCtrlClick - Output:', isCtrlClick);
    return isCtrlClick;
  }

  RubberBandSelectDoAutoScroll() {
    console.log("O.Opt RubberBandSelectDoAutoScroll - Input: starting auto scroll");

    // Schedule auto-scroll callback to run every 100ms
    GlobalData.optManager.autoScrollTimerID = this.autoScrollTimer.setTimeout("RubberBandSelectDoAutoScroll", 100);

    // Convert window coordinates (autoScrollXPos, autoScrollYPos) to document coordinates
    const documentCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
      GlobalData.optManager.autoScrollXPos,
      GlobalData.optManager.autoScrollYPos
    );
    console.log(`O.Opt RubberBandSelectDoAutoScroll - Converted Coordinates: x=${documentCoords.x}, y=${documentCoords.y}`);

    // Scroll the document to the computed position
    GlobalData.docHandler.ScrollToPosition(documentCoords.x, documentCoords.y);
    console.log(`O.Opt RubberBandSelectDoAutoScroll - Scrolled to position: x=${documentCoords.x}, y=${documentCoords.y}`);

    // Move the rubber band selection rectangle based on the new coordinates
    GlobalData.optManager.RubberBandSelectMoveCommon(documentCoords.x, documentCoords.y);
    console.log("O.Opt RubberBandSelectDoAutoScroll - Output: Rubber band selection moved");
  }


  CompleteOperation(
    selectionObjects: any,
    preserveUndoState: boolean,
    fitOption: any,
    unusedParameter: any
  ) {
    console.log("O.Opt CompleteOperation - Input:", { selectionObjects, preserveUndoState, fitOption, unusedParameter });

    if (!Collab.NoRedrawFromSameEditor) {
      this.HideAllSVGSelectionStates();
    }

    this.DynamicSnapsRemoveGuides(this.dynamicGuides);
    this.dynamicGuides = null;
    this.UpdateLinks();
    this.UpdateLineHops(true);

    const noRedraw = Collab.NoRedrawFromSameEditor;
    this.RenderDirtySVGObjects();
    this.FitDocumentWorkArea(false, false, false, fitOption);

    if (GlobalData.gTestException) {
      const error = new Error(Resources.Strings.Error_InComplete);
      error.name = '1';
      throw error;
    }

    if (selectionObjects && Collab.AllowSelectionChange()) {
      this.SelectObjects(selectionObjects, false, true);
    } else if (!noRedraw) {
      this.RenderAllSVGSelectionStates();
    }

    if (!preserveUndoState) {
      this.PreserveUndoState(false);
    }

    const selectedList = this.GetObjectPtr(this.theSelectedListBlockID, false);
    GlobalData.docHandler.ShowCoordinates(true);

    if (Collab.AllowSelectionChange()) {
      this.UpdateSelectionAttributes(selectedList);
    }

    this.LastOpDuplicate = false;
    this.ScrollObjectIntoView(-1, false);

    if (Clipboard && Clipboard.FocusOnClipboardInput) {
      Clipboard.FocusOnClipboardInput();
    }

    console.log("O.Opt CompleteOperation - Output: Operation completed.");
  }

  DrawNewObject(newShape, clearExistingSection) {
    console.log("O.Opt DrawNewObject - Input:", { newShape, clearExistingSection });

    this.SetModalOperation(ConstantData2.ModalOperations.DRAW);
    this.GetObjectPtr(this.theTEDSessionBlockID, false);
    this.CloseEdit();

    this.LineDrawID = -1;
    this.theDrawShape = newShape;
    this.ClearAnySelection(!clearExistingSection);
    this.SetEditMode(ConstantData.EditState.EDIT);
    this.WorkAreaHammer.on('dragstart', DefaultEvt.Evt_WorkAreaHammerDrawStart);

    console.log("O.Opt DrawNewObject - Output: Draw new object initialized");
  }

  SetModalOperation(operation) {
    console.log("O.Opt SetModalOperation - Input:", { operation });

    if (
      operation !== ConstantData2.ModalOperations.NONE &&
      this.currentModalOperation !== ConstantData2.ModalOperations.NONE &&
      this.currentModalOperation !== operation
    ) {
      this.CancelModalOperation();
    }
    this.currentModalOperation = operation;

    console.log("O.Opt SetModalOperation - Output:", { currentModalOperation: operation });
  }

  StartNewObjectDraw(inputEvent) {
    console.log("O.Opt StartNewObjectDraw - Input:", inputEvent);

    // Abort drawing if LineStamp is active
    if (GlobalData.optManager.LineStamp) {
      console.log("O.Opt StartNewObjectDraw - Output: LineStamp active, aborting draw");
      return;
    }

    // Convert client coordinates to document coordinates
    let docCoords = this.svgDoc.ConvertWindowToDocCoords(
      inputEvent.gesture.center.clientX,
      inputEvent.gesture.center.clientY
    );
    console.log("O.Opt StartNewObjectDraw: Client coords and Doc coords", inputEvent.gesture.center.clientX, inputEvent.gesture.center.clientY, docCoords);

    // Set the starting point for drawing
    this.theDrawStartX = docCoords.x;
    this.theDrawStartY = docCoords.y;
    console.log("O.Opt StartNewObjectDraw: Draw start coordinates set", this.theDrawStartX, this.theDrawStartY);

    // Pre-track check before drawing
    const preTrackCheck = this.theDrawShape.LM_DrawPreTrack(docCoords);
    if (!preTrackCheck) {
      console.log("O.Opt StartNewObjectDraw - Output: Pre-track check failed");
      return;
    }

    // Determine if snapping should be enabled
    let hasLinkParam = this.LinkParams && this.LinkParams.SConnectIndex >= 0;
    let needOverrideSnaps = this.OverrideSnaps(inputEvent);
    hasLinkParam = hasLinkParam || needOverrideSnaps;
    const isSnapEnabled = GlobalData.docHandler.documentConfig.enableSnap && !hasLinkParam;

    if (isSnapEnabled) {
      let snapRect = this.theDrawShape.GetSnapRect();
      let dragRectCopy = this.theDragEnclosingRect ? Utils1.DeepCopy(this.theDragEnclosingRect) : snapRect;
      let actionBBoxCopy = Utils1.DeepCopy(this.theActionBBox);
      let offsetX = dragRectCopy.x - actionBBoxCopy.x;
      let offsetY = dragRectCopy.y - actionBBoxCopy.y;

      // Reposition the drag rectangle to center around the document coordinates
      dragRectCopy.x = docCoords.x - dragRectCopy.width / 2;
      dragRectCopy.y = docCoords.y - dragRectCopy.height / 2;

      // Calculate the adjusted offset for custom snap
      let adjustedOffset = {
        x: dragRectCopy.x - offsetX,
        y: dragRectCopy.y - offsetY
      };

      if (!this.theDrawShape.CustomSnap(adjustedOffset.x, adjustedOffset.y, 0, 0, false, docCoords)) {
        if (GlobalData.docHandler.documentConfig.centerSnap) {
          let snapPoint = GlobalData.docHandler.SnapToGrid(docCoords);
          docCoords.x = snapPoint.x;
          docCoords.y = snapPoint.y;
        } else {
          let tempSnapRect = $.extend(true, {}, snapRect);
          tempSnapRect.x = docCoords.x - snapRect.width / 2;
          tempSnapRect.y = docCoords.y - snapRect.height / 2;
          let snapAdjustment = GlobalData.docHandler.SnapRect(tempSnapRect);
          docCoords.x += snapAdjustment.x;
          docCoords.y += snapAdjustment.y;
        }
      }
    }

    // Set action coordinates based on document coordinates
    let docX = docCoords.x;
    let docY = docCoords.y;
    this.ClearAnySelection(true);
    this.theActionStartX = docX;
    this.theActionStartY = docY;
    this.theActionBBox = { x: docX, y: docY, width: 1, height: 1 };
    this.theActionNewBBox = { x: docX, y: docY, width: 1, height: 1 };

    // Begin drawing the new shape
    let drawShape = this.theDrawShape;
    this.InitializeAutoGrowDrag();
    this.ShowFrame(true);
    drawShape.LM_DrawClick(docX, docY);
    this.AddNewObject(drawShape, !drawShape.bOverrideDefaultStyleOnDraw, false);

    // Retrieve the new object's ID from the active layer
    let layerZList = this.ActiveLayerZList();
    let layerCount = layerZList.length;
    this.theActionStoredObjectID = layerZList[layerCount - 1];

    // If a circular link list exists, add the new object to it
    if (this.LinkParams && this.LinkParams.lpCircList) {
      this.LinkParams.lpCircList.push(this.theActionStoredObjectID);
    }

    // Get the corresponding SVG object for the new object
    this.theActionSVGObject = this.svgObjectLayer.GetElementByID(this.theActionStoredObjectID);

    // Handle connection highlights if there is a connect index
    if (this.LinkParams && this.LinkParams.SConnectIndex >= 0) {
      this.HiliteConnect(this.LinkParams.SConnectIndex, this.LinkParams.SConnectPt, true, false, drawShape.BlockID, this.LinkParams.SConnectInside);
      this.LinkParams.SHiliteConnect = this.LinkParams.SConnectIndex;
      this.LinkParams.SHiliteInside = this.LinkParams.SConnectInside;
    }

    // Handle join highlights if there is a join index
    if (this.LinkParams && this.LinkParams.SJoinIndex >= 0) {
      this.HiliteConnect(this.LinkParams.SJoinIndex, this.LinkParams.SConnectPt, true, true, drawShape.BlockID, null);
      this.LinkParams.SHiliteJoin = this.LinkParams.SJoinIndex;
    }

    console.log("O.Opt StartNewObjectDraw - Output: New object drawn with ID", this.theActionStoredObjectID);
  }


  FindConnect(targetObjectId, drawingObject, hookPoints, showVisuals, isAttachMode, allowJoin, eventPosition) {
    console.log("O.Opt FindConnect - Input:", {
      targetObjectId,
      drawingObject: drawingObject ? drawingObject.BlockID : null,
      hookPointsCount: hookPoints ? hookPoints.length : 0,
      showVisuals,
      isAttachMode,
      allowJoin,
      eventPosition
    });

    // Variables for tracking state during connection finding
    let hitCode = 0;
    let deltaX, deltaY, distance;
    let hookIndex, bestIndex, bestDistance;
    let foundConnection = false;
    let hitResult = {};
    let connectionPoints = [];
    let targetPoints = [];
    let minDistance = 1e+30;
    let hookFlags = 0;
    let previousPoint = { x: 0, y: 0 };
    let currentPoint = {};
    let classFilters = [];
    let lineClassFilters = [];
    let objectClassesToFind = null;
    let sessionFlags = 0;
    let connectHookFlag = ConstantData.HookFlags.SED_LC_HookNoExtra;
    let hookPointTypes = ConstantData.HookPts;
    let isContainerHit = false;
    let targetObject;

    // Helper function to check if a hook point is a center type
    const isCenterHookPoint = (hookType) => {
      switch (hookType) {
        case hookPointTypes.SED_KTC:
        case hookPointTypes.SED_KBC:
        case hookPointTypes.SED_KRC:
        case hookPointTypes.SED_KLC:
          return true;
        default:
          if (hookType >= hookPointTypes.SED_CustomBase &&
            hookType < hookPointTypes.SED_CustomBase + 100) {
            return true;
          }
      }
      return false;
    };

    // Check if object is a line (but not a Gantt bar)
    const isLineObject = drawingObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.LINE &&
      drawingObject.objecttype !== ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR;

    // Input validation
    if (hookPoints == null) {
      console.log("O.Opt FindConnect - Output: false (No hook points)");
      return false;
    }

    // Get list of objects to check for connections
    const circularList = this.LinkParams.lpCircList;
    if (circularList == null) {
      console.log("O.Opt FindConnect - Output: false (No circular list)");
      return false;
    }

    // Store the previous connection point
    previousPoint.x = this.LinkParams.ConnectPt.x;
    previousPoint.y = this.LinkParams.ConnectPt.y;

    // Get hook flags and clear attachment flag
    hookFlags = drawingObject.hookflags;
    hookFlags = Utils2.SetFlag(hookFlags, ConstantData.HookFlags.SED_LC_AttachToLine, false);

    // Get session data and flags
    const sessionData = this.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
    if (sessionData) {
      sessionFlags = sessionData.flags;
    }

    // Set up class filters based on mode
    if (isAttachMode) {
      // In attach mode, only consider line objects
      classFilters.push(ConstantData.DrawingObjectBaseClass.LINE);
      objectClassesToFind = classFilters;
    } else if (this.LinkParams.ArraysOnly) {
      // In arrays-only mode, filter based on object type
      if (drawingObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR) {
        classFilters.push(ConstantData.DrawingObjectBaseClass.SHAPE);
        objectClassesToFind = classFilters;
      } else if (drawingObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
        classFilters.push(ConstantData.DrawingObjectBaseClass.CONNECTOR);

        if (sessionFlags & ConstantData.SessionFlags.SEDS_LLink) {
          classFilters.push(ConstantData.DrawingObjectBaseClass.LINE);
        }

        objectClassesToFind = classFilters;
      } else {
        objectClassesToFind = classFilters;
      }
    }

    // In join mode, include line objects in the filter
    if (allowJoin) {
      lineClassFilters.push(ConstantData.DrawingObjectBaseClass.LINE);
    }

    // When drawing from overlay layer, include shapes in the filter
    if (GlobalData.optManager.FromOverlayLayer) {
      classFilters.push(ConstantData.DrawingObjectBaseClass.SHAPE);
      objectClassesToFind = classFilters;
    }

    // Reset join index for new search
    this.LinkParams.JoinIndex = -1;

    // For each hook point, look for potential connections
    for (let pointIndex = 0; pointIndex < hookPoints.length; pointIndex++) {
      hitCode = 0;

      // Check for polygon closing if join is allowed
      if (allowJoin ||
        (hitResult = new HitResult(-1, 0, null),
          drawingObject.ClosePolygon(targetObjectId, hookPoints, hitResult) &&
          (allowJoin = true))) {

        // Try to find a polygon join point
        if (allowJoin &&
          (hitResult = new HitResult(-1, 0, null),
            drawingObject.ClosePolygon(targetObjectId, hookPoints, hitResult) ||
            (hitResult = this.FindObject(hookPoints[pointIndex], circularList, lineClassFilters, false, true, null)),
            hitResult && hitResult.hitcode === ConstantData.HitCodes.SED_PLApp)) {

          // Found a valid polygon join point
          this.LinkParams.JoinIndex = hitResult.objectid;
          this.LinkParams.JoinData = hitResult.segment;
          this.LinkParams.JoinSourceData = hookPoints[pointIndex].id;

          // Calculate position offset
          deltaX = hitResult.pt.x - hookPoints[pointIndex].x;
          deltaY = hitResult.pt.y - hookPoints[pointIndex].y;
          this.theDragDeltaX = deltaX;
          this.theDragDeltaY = deltaY;

          // Set connection point based on join data
          if (this.LinkParams.JoinData === ConstantData.HookPts.SED_KTL) {
            this.LinkParams.ConnectPt.x = 0;
            this.LinkParams.ConnectPt.y = 0;
          } else {
            this.LinkParams.ConnectPt.x = ConstantData.Defines.SED_CDim;
            this.LinkParams.ConnectPt.y = ConstantData.Defines.SED_CDim;
          }

          break;
        }
      }

      // Check for previous connection if available
      if (this.LinkParams.PrevConnect >= 0) {
        const prevConnectObject = this.GetObjectPtr(this.LinkParams.PrevConnect, false);
        if (prevConnectObject) {
          // Check if object is a container
          const containerPoint = Utils1.DeepCopy(GlobalData.optManager.LinkParams.ContainerPt[0]);
          if (prevConnectObject.IsShapeContainer(drawingObject, containerPoint)) {
            const hitTestFrame = prevConnectObject.GetHitTestFrame(drawingObject);
            if (Utils2.pointInRect(hitTestFrame, containerPoint)) {
              hitResult.objectid = this.LinkParams.PrevConnect;
              hitResult.hitcode = ConstantData.HitCodes.SED_InContainer;
              hitResult.cellid = null;
            }
          }
          // Check if point is inside object
          else if (Utils2.pointInRect(prevConnectObject.r, hookPoints[pointIndex])) {
            hitCode = prevConnectObject.Hit(hookPoints[pointIndex], isLineObject, false, null);
            if (hitCode) {
              if (hitResult == null) {
                hitResult = { cellid: null };
              }
              hitResult.objectid = this.LinkParams.PrevConnect;
              hitResult.hitcode = hitCode;
              hitResult.cellid = null;
            }
          }
        }
      }

      // If no hit yet, find an object at this point
      if (hitCode === 0) {
        hitResult = this.FindObject(
          hookPoints[pointIndex],
          circularList,
          objectClassesToFind,
          isLineObject,
          false,
          drawingObject
        );
      }

      // Process the hit if found
      if (hitResult && hitResult.hitcode) {
        targetObject = this.GetObjectPtr(hitResult.objectid, false);
        if (targetObject == null) {
          console.log("O.Opt FindConnect - Output: false (Target object not found)");
          return false;
        }

        // Handle container hit
        if (hitResult.hitcode === ConstantData.HitCodes.SED_InContainer) {
          isContainerHit = true;
          containerPoint = hitResult.theContainerPt;
        }

        // Process non-container hits
        if (!isContainerHit) {
          // In attach mode, check if auto-insert is allowed
          if (isAttachMode) {
            if (this.LinkParams.AutoInsert) {
              // Only shapes can be auto-inserted
              if (drawingObject.DrawingObjectBaseClass !== ConstantData.DrawingObjectBaseClass.SHAPE) {
                continue;
              }

              // Skip if already hooked
              let alreadyHooked = false;
              for (let h = 0; h < targetObject.hooks.length; h++) {
                if (targetObject.hooks[h].objid == drawingObject.BlockID) {
                  alreadyHooked = true;
                  break;
                }
              }
              if (alreadyHooked) {
                continue;
              }

              // Only segmented lines can have objects auto-inserted
              if (targetObject.LineType !== ConstantData.LineType.SEGLINE) {
                continue;
              }
            }

            // Only allow attaching to lines with the proper flag
            if ((targetObject.targflags & ConstantData.HookFlags.SED_LC_AttachToLine) === 0) {
              continue;
            }
          }
          // Not in attach mode, check compatibility
          else {
            let targetFlags = targetObject.targflags;

            // Adjust flags based on mode
            if (this.LinkParams.ArraysOnly ||
              (sessionFlags & ConstantData.SessionFlags.SEDS_SLink) !== 0) {
              // In arrays-only mode, allow attaching shapes to lines
              if (this.LinkParams.ArraysOnly &&
                targetObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.LINE) {
                targetFlags = Utils2.SetFlag(targetFlags, ConstantData.HookFlags.SED_LC_Shape, true);
              }
            } else {
              // In normal mode, don't allow attaching shapes to other objects
              targetFlags = Utils2.SetFlag(targetFlags, ConstantData.HookFlags.SED_LC_Shape, false);
            }

            // Check if hook flags are compatible
            if ((hookFlags & targetFlags) === 0) {
              continue;
            }
          }
        }

        // Set up the appropriate flags for target points calculation
        hookFlags = Utils2.SetFlag(hookFlags, ConstantData.HookFlags.SED_LC_ShapeOnLine, isAttachMode);

        // Special handling for floorplan walls
        if (drawingObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
          hookFlags = Utils2.SetFlag(hookFlags, ConstantData.HookFlags.SED_LC_NoSnaps, true);
        }

        // Get target connection points
        targetPoints = targetObject.GetTargetPoints(
          hookPoints[pointIndex],
          hookFlags | connectHookFlag,
          targetObjectId
        );

        if (!targetPoints || targetPoints.length === 0) {
          console.log("O.Opt FindConnect - Output: false (No target points)");
          return false;
        }

        // Get perimeter points
        connectionPoints = targetObject.GetPerimPts(
          hitResult.objectid,
          targetPoints,
          null,
          false,
          targetPoints[0].cellid,
          targetObjectId
        );

        // Determine which point to use
        let currentPt = hookPoints[pointIndex];

        // Use container point if applicable
        if (isContainerHit) {
          currentPoint = currentPt = containerPoint;
          hookIndex = containerPoint.id;
        }

        // Find closest connection point
        for (let j = 0; j < connectionPoints.length; j++) {
          const dx = connectionPoints[j].x - currentPt.x;
          const dy = connectionPoints[j].y - currentPt.y;
          distance = dx * dx + dy * dy;

          if (distance < minDistance) {
            minDistance = distance;
            bestIndex = j;
          }
        }

        // For polygons, ensure segment consistency
        if (targetObject.polylist && hitResult.segment >= 0) {
          const segmentCheck = this.FindObject(
            connectionPoints[bestIndex],
            circularList,
            objectClassesToFind,
            false,
            false,
            drawingObject
          );

          if (!segmentCheck) {
            console.log("O.Opt FindConnect - Output: false (Segment check failed)");
            return false;
          }

          if (segmentCheck.segment != hitResult.segment) {
            console.log("O.Opt FindConnect - Output: false (Segment mismatch)");
            return false;
          }
        }

        // Get best hook point
        if (!isContainerHit) {
          hookIndex = hookPoints[pointIndex].id;
          hookIndex = targetObject.GetBestHook(targetObjectId, hookPoints[pointIndex].id, targetPoints[bestIndex]);

          if (hookIndex != hookPoints[pointIndex].id) {
            currentPoint = drawingObject.HookToPoint(hookIndex, null);
            currentPoint.x += eventPosition.x - this.theDragStartX;
            currentPoint.y += eventPosition.y - this.theDragStartY;
          } else {
            currentPoint = hookPoints[pointIndex];
          }
        }

        // Check hook permission
        const hookDistanceSq = (deltaX = connectionPoints[bestIndex].x - currentPoint.x) * deltaX +
          (deltaY = connectionPoints[bestIndex].y - currentPoint.y) * deltaY;

        if (!targetObject.AllowHook(hookPoints[pointIndex], targetObjectId, hookDistanceSq)) {
          continue;
        }

        // Set position offsets
        this.theDragDeltaX = deltaX;
        this.theDragDeltaY = deltaY;

        // Handle auto-insert for lines
        if (isAttachMode && this.LinkParams.AutoInsert) {
          this.LinkParams.AutoPoints = [];
          let frameRect = $.extend(true, {}, drawingObject.Frame);

          // Adjust frame for rotation
          const rotationQuadrant = Math.floor((drawingObject.RotationAngle + 45) / 90);
          if (rotationQuadrant) {
            const radians = 90 / (180 / ConstantData.Geometry.PI);
            const corners = [];

            corners.push(new Point(frameRect.x, frameRect.y));
            corners.push(new Point(frameRect.x + frameRect.width, frameRect.y + frameRect.height));
            Utils3.RotatePointsAboutCenter(frameRect, radians, corners);
            frameRect = Utils2.Pt2Rect(corners[0], corners[1]);
          }

          // Apply position offset
          frameRect.x += deltaX;
          frameRect.y += deltaY;

          // Check for intersections
          if (!targetObject.GetFrameIntersects(
            frameRect,
            drawingObject,
            this.LinkParams.AutoPoints,
            this.LinkParams)) {
            continue;
          }
        }

        // Connection found
        foundConnection = true;
        this.LinkParams.ConnectIndex = hitResult.objectid;

        // Track connection history
        if (this.LinkParams.ConnectIndex >= 0 &&
          this.LinkParams.ConnectIndexHistory.indexOf(this.LinkParams.ConnectIndex) < 0) {
          this.LinkParams.ConnectIndexHistory.push(this.LinkParams.ConnectIndex);
        }

        // Store connection details
        this.LinkParams.ConnectPt.x = targetPoints[bestIndex].x;
        this.LinkParams.ConnectPt.y = targetPoints[bestIndex].y;
        this.LinkParams.ConnectInside = targetPoints[bestIndex].cellid;
        this.LinkParams.HookIndex = hookIndex;

        // Set appropriate hook flag
        if (this.LinkParams.AutoInsert && isAttachMode && !GlobalData.optManager.LinkParams.AutoSinglePoint) {
          this.LinkParams.ConnectHookFlag = ConstantData.HookFlags.SED_LC_AutoInsert;
        } else if (this.LinkParams.ArraysOnly &&
          targetObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.LINE &&
          drawingObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE &&
          isCenterHookPoint(hookIndex)) {
          this.LinkParams.ConnectHookFlag = ConstantData.HookFlags.SED_LC_HookReverse;
        } else {
          this.LinkParams.ConnectHookFlag = 0;
        }

        break;
      }
    }

    // Update connection state if no connection found
    if (!foundConnection) {
      // Add current connect index to history if not already there
      if (this.LinkParams.ConnectIndex >= 0 &&
        this.LinkParams.ConnectIndexHistory.indexOf(this.LinkParams.ConnectIndex) < 0) {
        this.LinkParams.ConnectIndexHistory.push(this.LinkParams.ConnectIndex);
      }

      // Reset current connection
      this.LinkParams.ConnectIndex = -1;
    }

    // Update visuals for join mode
    if (this.LinkParams.JoinIndex != this.LinkParams.HiliteJoin && showVisuals) {
      // Hide any current connection highlight
      if (this.LinkParams.HiliteConnect >= 0) {
        this.HiliteConnect(
          this.LinkParams.HiliteConnect,
          this.LinkParams.ConnectPt,
          false,
          false,
          targetObjectId,
          this.LinkParams.HiliteInside
        );
        this.LinkParams.HiliteConnect = -1;
        this.LinkParams.HiliteInside = null;
        this.UndoEditMode();
      }

      // Update join highlights
      if (this.LinkParams.JoinIndex >= 0 && this.LinkParams.HiliteJoin < 0) {
        // Show join mode if not already active
        if (this.GetEditMode() != ConstantData.EditState.LINKJOIN) {
          this.SetEditMode(ConstantData.EditState.LINKJOIN, null, true);
        }
      } else if (this.LinkParams.JoinIndex < 0 && this.LinkParams.HiliteJoin >= 0) {
        this.UndoEditMode();
      }

      // Hide old join highlight if any
      if (this.LinkParams.HiliteJoin >= 0) {
        this.HiliteConnect(
          this.LinkParams.HiliteJoin,
          this.LinkParams.ConnectPt,
          false,
          true,
          targetObjectId,
          null
        );
        this.LinkParams.HiliteJoin = -1;
        this.UndoEditMode();
      }

      // Show new join highlight if available
      if (this.LinkParams.JoinIndex >= 0) {
        this.HiliteConnect(
          this.LinkParams.JoinIndex,
          this.LinkParams.ConnectPt,
          true,
          true,
          targetObjectId,
          null
        );
        this.LinkParams.HiliteJoin = this.LinkParams.JoinIndex;

        // Set edit mode to join if not already
        if (this.GetEditMode() != ConstantData.EditState.LINKJOIN) {
          this.SetEditMode(ConstantData.EditState.LINKJOIN, null, true);
        }
      }
    }

    // Update visuals for connect mode
    if (this.LinkParams.HiliteConnect == this.LinkParams.ConnectIndex &&
      this.LinkParams.HiliteInside == this.LinkParams.ConnectInside ||
      !showVisuals) {
      // If connection already highlighted, just update position if needed
      if (foundConnection &&
        showVisuals &&
        this.LinkParams.HiliteConnect === this.LinkParams.ConnectIndex &&
        this.LinkParams.HiliteInside === this.LinkParams.ConnectInside &&
        connectionPoints.length === 1) {

        if (previousPoint.x != this.LinkParams.ConnectPt.x ||
          previousPoint.y != this.LinkParams.ConnectPt.y) {
          this.MoveConnectHilite(
            this.LinkParams.ConnectIndex,
            this.LinkParams.ConnectPt,
            this.LinkParams.ConnectInside
          );
        }
      }
    } else {
      // Hide join highlight if any
      if (this.LinkParams.HiliteJoin >= 0) {
        this.HiliteConnect(
          this.LinkParams.HiliteJoin,
          this.LinkParams.ConnectPt,
          false,
          true,
          targetObjectId,
          null
        );
        this.LinkParams.HiliteJoin = -1;
        this.UndoEditMode();
      }

      // Update connection mode based on current state
      if (this.LinkParams.ConnectIndex >= 0 && this.LinkParams.HiliteConnect < 0) {
        // Show connect mode if not already active
        if (this.GetEditMode() != ConstantData.EditState.LINKCONNECT) {
          this.SetEditMode(ConstantData.EditState.LINKCONNECT, null, true);
        }
      } else if (this.LinkParams.ConnectIndex < 0 && this.LinkParams.HiliteConnect >= 0) {
        // Handle disconnection if needed
        const prevConnect = this.GetObjectPtr(this.LinkParams.HiliteConnect, false);
        drawingObject.OnDisconnect(
          targetObjectId,
          prevConnect,
          this.LinkParams.HookIndex,
          connectionPoints[bestIndex]
        );
        this.UndoEditMode();
      }

      // Hide old connection highlight if any
      if (this.LinkParams.HiliteConnect >= 0) {
        this.HiliteConnect(
          this.LinkParams.HiliteConnect,
          this.LinkParams.ConnectPt,
          false,
          false,
          targetObjectId,
          this.LinkParams.HiliteInside
        );
        this.LinkParams.HiliteConnect = -1;
        this.LinkParams.HiliteInside = null;
        this.UndoEditMode();
      }

      // Show new connection highlight if available
      if (this.LinkParams.ConnectIndex >= 0) {
        this.HiliteConnect(
          this.LinkParams.ConnectIndex,
          this.LinkParams.ConnectPt,
          true,
          false,
          targetObjectId,
          this.LinkParams.ConnectInside
        );
        this.LinkParams.HiliteConnect = this.LinkParams.ConnectIndex;
        this.LinkParams.HiliteInside = this.LinkParams.ConnectInside;

        // Notify object of connection
        drawingObject.OnConnect(
          targetObjectId,
          targetObject,
          this.LinkParams.HookIndex,
          connectionPoints[bestIndex],
          eventPosition
        );

        // Set edit mode to connect if not already
        if (this.GetEditMode() != ConstantData.EditState.LINKCONNECT) {
          this.SetEditMode(ConstantData.EditState.LINKCONNECT, null, true);
        }
      }
    }

    console.log("O.Opt FindConnect - Output:", foundConnection);
    return foundConnection;
  }

  FindObject(
    point: { x: number; y: number },
    objectIdFilter?: number[],
    classFilter?: any[],
    hitTestOptions?: any,
    usePreciseHitTest?: boolean,
    containerObject?: any
  ) {
    console.log("O.Opt FindObject - Input:", {
      point,
      objectIdFilter,
      classFilter,
      hitTestOptions,
      usePreciseHitTest,
      containerObject,
    });

    let currentObject: any;
    let isFiltered: boolean;
    let hitFrame: any;
    let result: any = {};
    const hitResult = new HitResult(-1, 0, null);
    const visibleObjects = this.ActiveVisibleZList();

    if (visibleObjects == null) {
      console.log("O.Opt FindObject - Output: no visible objects");
      return -1;
    }

    // Loop through the visible objects from topmost (end) to bottom
    for (let idx = visibleObjects.length - 1; idx >= 0; idx--) {
      // Check if an object filter is provided and if the current object's ID is in the filter.
      if (!(isFiltered = objectIdFilter && objectIdFilter.indexOf(visibleObjects[idx]) !== -1)) {
        currentObject = this.GetObjectPtr(visibleObjects[idx], false);
        if (currentObject != null) {
          // If containerObject is provided and is a ShapeContainer type, skip connectors.
          if (
            containerObject &&
            (containerObject instanceof ShapeContainer ||
              containerObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER) &&
            currentObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR
          ) {
            continue;
          }
          // Skip locked, non-linkable, or VisioText objects.
          if (
            currentObject.flags & ConstantData.ObjFlags.SEDO_Lock ||
            currentObject.flags & ConstantData.ObjFlags.SEDO_NoLinking ||
            (currentObject.moreflags & ConstantData.ObjMoreFlags.SED_MF_VisioText)
          ) {
            currentObject = null;
          }
        }

        if (currentObject != null) {
          // Skip if the object is not visible or is not meant for connection‐to‐connection linking.
          if (currentObject.flags & ConstantData.ObjFlags.SEDO_NotVisible) continue;
          if (currentObject.extraflags & ConstantData.ExtraFlags.SEDE_ConnToConn) continue;
          if (
            containerObject &&
            containerObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR &&
            GlobalData.optManager.FindChildArray(visibleObjects[idx], -1) >= 0
          ) {
            continue;
          }

          // If a class filter array is provided, check if the object's class is excluded.
          if (classFilter) {
            isFiltered = classFilter.indexOf(currentObject.DrawingObjectBaseClass) === -1;
          }

          // Get and adjust the hit-test frame for the object.
          const hitTestFrame = currentObject.GetHitTestFrame(containerObject);
          if (hitTestFrame.width < ConstantData.Defines.FindObjectMinHitSpot) {
            hitTestFrame.width = ConstantData.Defines.FindObjectMinHitSpot;
            hitTestFrame.x -= ConstantData.Defines.FindObjectMinHitSpot / 2;
          }
          if (hitTestFrame.height < ConstantData.Defines.FindObjectMinHitSpot) {
            hitTestFrame.height = ConstantData.Defines.FindObjectMinHitSpot;
            hitTestFrame.y -= ConstantData.Defines.FindObjectMinHitSpot / 2;
          }

          // If the object is a ShapeContainer, check if the point is inside its container point.
          if (currentObject instanceof ShapeContainer) {
            const containerPoint = Utils1.DeepCopy(GlobalData.optManager.LinkParams.ContainerPt[0]);
            if (currentObject.IsShapeContainer(containerObject, containerPoint) && Utils2.pointInRect(hitTestFrame, containerPoint)) {
              hitResult.objectid = visibleObjects[idx];
              hitResult.hitcode = ConstantData.HitCodes.SED_InContainer;
              hitResult.theContainerPt = containerPoint;
              console.log("O.Opt FindObject - Output:", hitResult);
              return hitResult;
            }
            continue;
          }

          // For swimlanes, if the point is inside the hit frame, return null.
          if (currentObject.IsSwimlane() && Utils2.pointInRect(hitTestFrame, point)) {
            console.log("O.Opt FindObject - Output: found swimlane containment is null");
            return null;
          }

          // If the point is within the hit frame and passes the filter, perform precise hit testing.
          if (!isFiltered && Utils2.pointInRect(hitTestFrame, point)) {
            hitResult.objectid = visibleObjects[idx];
            hitResult.hitcode = currentObject.Hit(point, hitTestOptions, usePreciseHitTest, hitResult);
            if (hitResult.hitcode) {
              console.log("O.Opt FindObject - Output:", hitResult);
              return hitResult;
            }
          }
        }
      }
    }

    console.log("O.Opt FindObject - Output: result null");
    return null;
  }


  InitializeAutoGrowDrag(actionType, shouldCloseEdit) {
    console.log('O.Opt InitializeAutoGrowDrag - Input:', { actionType, shouldCloseEdit });

    this.theDragGotAutoResizeRight = false;
    this.theDragGotAutoResizeBottom = false;
    this.theDragGotAutoResizeOldX = [];
    this.theDragGotAutoResizeOldY = [];

    console.log('O.Opt InitializeAutoGrowDrag - Output: Auto grow drag initialized');
  }

}

export default OptHandler2
