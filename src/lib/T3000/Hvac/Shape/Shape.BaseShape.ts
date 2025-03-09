

import HvTimer from '../Helper/HvTimer'
import BaseDrawingObject from './Shape.BaseDrawingObject'
import GlobalData from '../Data/T3Gv'
import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import DefaultEvt from "../Event/EvtUtil";
import $ from 'jquery';
import Point from '../Model/Point';
import Document from '../Basic/Basic.Document'
import Element from '../Basic/Basic.Element';
import Instance from '../Data/Instance/Instance'
import ConstantData from '../Data/ConstantData'
import PolyList from '../Model/PolyList'
import PolySeg from '../Model/PolySeg'
import RightClickData from '../Model/RightClickData'
import Rectangle from '../Model/Rectangle'
import DynamicGuides from '../Model/DynamicGuides'
import ConstantData2 from '../Data/ConstantData2'
import Utils4 from '../Helper/Utils4';
import ShapeAttrUtil from '../Opt/ShapeAttrUtil';

class BaseShape extends BaseDrawingObject {

  public ShapeType: any;
  public shapeparam: any;
  public SVGDim: any;

  constructor(options: any) {
    console.log("= S.BaseShape - constructor input:", options);

    options = options || {};
    options.DrawingObjectBaseClass = ConstantData.DrawingObjectBaseClass.SHAPE;

    if (options.hookflags !== 0) {
      options.hookflags = ConstantData.HookFlags.SED_LC_Shape | ConstantData.HookFlags.SED_LC_AttachToLine;
    }

    if (options.targflags !== 0) {
      options.targflags = ConstantData.HookFlags.SED_LC_Shape | ConstantData.HookFlags.SED_LC_Line;
    }

    super(options);

    this.ShapeType = options.ShapeType;
    this.shapeparam = options.shapeparam || 0;
    this.SVGDim = options.SVGDim || {};

    console.log("= S.BaseShape - constructor output:", this);
  }

  CreateActionTriggers(svgDoc, triggerId, rotationProvider, extraParam) {
    console.log("= S.BaseShape - CreateActionTriggers input:", { svgDoc, triggerId, rotationProvider, extraParam });

    // Define default cursor types for knobs (8 directions)
    const defaultCursorTypes = [
      Element.CursorType.RESIZE_LT,
      Element.CursorType.RESIZE_T,
      Element.CursorType.RESIZE_RT,
      Element.CursorType.RESIZE_R,
      Element.CursorType.RESIZE_RB,
      Element.CursorType.RESIZE_B,
      Element.CursorType.RESIZE_LB,
      Element.CursorType.RESIZE_L
    ];

    // Check if the active table is this shape
    if (GlobalData.optManager.Table_GetActiveID() === this.BlockID) {
      console.log("= S.BaseShape - CreateActionTriggers output: null (Table Active)");
      return null;
    }

    let connectorInfo;
    const groupShape = svgDoc.CreateShape(ConstantData.CreateShapeType.GROUP);
    const knobSize = ConstantData.Defines.SED_KnobSize;
    const rKnobSize = ConstantData.Defines.SED_RKnobSize;
    let hasSideKnobs = ((this.extraflags & ConstantData.ExtraFlags.SEDE_SideKnobs &&
      this.dataclass === ConstantData.SDRShapeTypes.SED_S_Poly) > 0);
    const minSidePointLength = ConstantData.Defines.MinSidePointLength;
    let scale = svgDoc.docInfo.docToScreenScale;
    if (svgDoc.docInfo.docScale <= 0.5) {
      scale *= 2;
    }

    const adjustedKnobSize = knobSize / scale;
    const adjustedRKnobSize = rKnobSize / scale;
    const fillColor = 'black';
    const frame = this.Frame;
    let frameWidth = frame.width + adjustedKnobSize;
    let frameHeight = frame.height + adjustedKnobSize;

    // Expand the frame bounds for trigger display
    const adjustedFrame = $.extend(true, {}, frame);
    adjustedFrame.x -= adjustedKnobSize / 2;
    adjustedFrame.y -= adjustedKnobSize / 2;
    adjustedFrame.width += adjustedKnobSize;
    adjustedFrame.height += adjustedKnobSize;

    // Adjust rotation for proper cursor ordering
    let rotation = rotationProvider.GetRotation() + 22.5;
    if (rotation >= 360) {
      rotation = 0;
    }
    const rotationIndex = Math.floor(rotation / 45);
    // Reorder cursor types based on rotation offset
    const cursorTypes = defaultCursorTypes.slice(rotationIndex).concat(defaultCursorTypes.slice(0, rotationIndex));

    // Flags to determine which knob sets to use
    let drawCorners = true;
    let drawVerticalKnobs = !hasSideKnobs;
    let drawHorizontalKnobs = !hasSideKnobs;

    // Adjust based on grow behavior
    switch (this.ObjGrow) {
      case ConstantData.GrowBehavior.HCONSTRAIN:
        drawCorners = false;
        drawHorizontalKnobs = false;
        break;
      case ConstantData.GrowBehavior.VCONSTRAIN:
        drawCorners = false;
        drawVerticalKnobs = false;
        break;
      case ConstantData.GrowBehavior.PROPORTIONAL:
        drawCorners = true;
        drawVerticalKnobs = false;
        drawHorizontalKnobs = false;
        break;
    }

    // Prepare knob configuration object
    const knobConfig = {
      svgDoc: svgDoc,
      shapeType: ConstantData.CreateShapeType.RECT,
      x: 0,
      y: 0,
      knobSize: adjustedKnobSize,
      fillColor: fillColor,
      fillOpacity: 1,
      strokeSize: 1,
      strokeColor: '#777777',
      locked: false
    };

    // Adjust styling for triggers if not equal to triggerId
    if (triggerId !== extraParam) {
      knobConfig.fillColor = 'white';
      knobConfig.strokeSize = 1;
      knobConfig.strokeColor = 'black';
      knobConfig.fillOpacity = '0.0';
    }

    // Adjust style if shape is locked
    if (this.flags & ConstantData.ObjFlags.SEDO_Lock) {
      knobConfig.fillColor = 'gray';
      knobConfig.locked = true;
      hasSideKnobs = false;
    } else if (this.NoGrow()) {
      knobConfig.fillColor = 'red';
      hasSideKnobs = false;
      knobConfig.strokeColor = 'red';
      // Set all cursor types to default when growth is not allowed
      for (let i = 0; i < 8; i++) {
        cursorTypes[i] = Element.CursorType.DEFAULT;
      }
    }

    let knobElement;
    // Draw corner knobs if allowed (four corner triggers)
    if (drawCorners) {
      // Top Left knob
      knobConfig.knobID = ConstantData.ActionTriggerType.TOPLEFT;
      knobConfig.cursorType = cursorTypes[0];
      knobElement = this.GenericKnob(knobConfig);
      groupShape.AddElement(knobElement);

      // Top Right knob
      knobConfig.x = frameWidth - adjustedKnobSize;
      knobConfig.y = 0;
      knobConfig.cursorType = cursorTypes[2];
      knobConfig.knobID = ConstantData.ActionTriggerType.TOPRIGHT;
      knobElement = this.GenericKnob(knobConfig);
      groupShape.AddElement(knobElement);

      // Bottom Right knob
      knobConfig.x = frameWidth - adjustedKnobSize;
      knobConfig.y = frameHeight - adjustedKnobSize;
      knobConfig.cursorType = cursorTypes[4];
      knobConfig.knobID = ConstantData.ActionTriggerType.BOTTOMRIGHT;
      knobElement = this.GenericKnob(knobConfig);
      groupShape.AddElement(knobElement);

      // Bottom Left knob
      knobConfig.x = 0;
      knobConfig.y = frameHeight - adjustedKnobSize;
      knobConfig.cursorType = cursorTypes[6];
      knobConfig.knobID = ConstantData.ActionTriggerType.BOTTOMLEFT;
      knobElement = this.GenericKnob(knobConfig);
      groupShape.AddElement(knobElement);
    }

    // Draw vertical (top/bottom center) knobs if allowed
    if (drawHorizontalKnobs) {
      // Top Center knob
      knobConfig.x = frameWidth / 2 - adjustedKnobSize / 2;
      knobConfig.y = 0;
      knobConfig.cursorType = cursorTypes[1];
      knobConfig.knobID = ConstantData.ActionTriggerType.TOPCENTER;
      knobElement = this.GenericKnob(knobConfig);
      groupShape.AddElement(knobElement);

      // Bottom Center knob
      knobConfig.x = frameWidth / 2 - adjustedKnobSize / 2;
      knobConfig.y = frameHeight - adjustedKnobSize;
      knobConfig.cursorType = cursorTypes[5];
      knobConfig.knobID = ConstantData.ActionTriggerType.BOTTOMCENTER;
      knobElement = this.GenericKnob(knobConfig);
      groupShape.AddElement(knobElement);
    }

    // Draw horizontal (center left/right) knobs if allowed
    if (drawVerticalKnobs) {
      // Center Left knob
      knobConfig.x = 0;
      knobConfig.y = frameHeight / 2 - adjustedKnobSize / 2;
      knobConfig.cursorType = cursorTypes[7];
      knobConfig.knobID = ConstantData.ActionTriggerType.CENTERLEFT;
      knobElement = this.GenericKnob(knobConfig);
      groupShape.AddElement(knobElement);

      // Center Right knob
      knobConfig.x = frameWidth - adjustedKnobSize;
      knobConfig.y = frameHeight / 2 - adjustedKnobSize / 2;
      knobConfig.cursorType = cursorTypes[3];
      knobConfig.knobID = ConstantData.ActionTriggerType.CENTERRIGHT;
      knobElement = this.GenericKnob(knobConfig);
      groupShape.AddElement(knobElement);
    }

    // If connector information exists, add connector icons
    connectorInfo = (function (currentShape) {
      let info = null;
      if (currentShape.hooks.length) {
        const hookedObj = GlobalData.optManager.GetObjectPtr(currentShape.hooks[0].objid, false);
        if (hookedObj && (hookedObj.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR ||
          (hookedObj && hookedObj instanceof Instance.Shape.ShapeContainer))) {
          info = hookedObj.Pr_GetShapeConnectorInfo(currentShape.hooks[0]);
        }
      }
      return info;
    })(this);
    if (connectorInfo && connectorInfo.length) {
      const iconConfig = {
        svgDoc: svgDoc,
        iconSize: 14,
        imageURL: null,
        iconID: 0,
        userData: 0,
        cursorType: 0
      };
      for (let i = 0, len = connectorInfo.length; i < len; i++) {
        if (connectorInfo[i].position === 'right') {
          iconConfig.x = frameWidth - 14 - 1 - adjustedKnobSize;
        } else {
          iconConfig.x = adjustedKnobSize + 1;
        }
        if (connectorInfo[i].position === 'bottom') {
          iconConfig.y = frameHeight - 14 - 1 - adjustedKnobSize;
        } else {
          iconConfig.y = adjustedKnobSize + 1;
        }
        iconConfig.cursorType = connectorInfo[i].cursorType;
        iconConfig.iconID = connectorInfo[i].knobID;
        iconConfig.imageURL = (connectorInfo[i].polyType === 'vertical')
          ? ConstantData.Defines.Connector_Move_Vertical_Path
          : ConstantData.Defines.Connector_Move_Horizontal_Path;
        iconConfig.userData = connectorInfo[i].knobData;

        knobElement = this.GenericIcon(iconConfig);
        groupShape.AddElement(knobElement);
        iconConfig.x += 16;
      }
    }

    // Draw side knobs for polyline shapes if enabled
    if (hasSideKnobs) {
      const sideShape = Utils1.DeepCopy(this);
      sideShape.inside = $.extend(true, {}, sideShape.Frame);
      const polyPoints = GlobalData.optManager.ShapeToPolyLine(this.BlockID, false, true, sideShape)
        .GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, []);
      if (polyPoints) {
        knobConfig.shapeType = ConstantData.CreateShapeType.OVAL;
        knobConfig.knobID = ConstantData.ActionTriggerType.MOVEPOLYSEG;
        knobConfig.fillColor = 'green';
        knobConfig.strokeColor = 'green';
        for (let i = 1, len = polyPoints.length; i < len; i++) {
          const dx = polyPoints[i].x - polyPoints[i - 1].x;
          const dy = polyPoints[i].y - polyPoints[i - 1].y;
          if (Utils2.sqrt(dx * dx + dy * dy) > minSidePointLength) {
            knobConfig.cursorType = (dx * dx > dy * dy) ? Element.CursorType.RESIZE_TB : Element.CursorType.RESIZE_LR;
            knobConfig.x = polyPoints[i - 1].x + dx / 2;
            knobConfig.y = polyPoints[i - 1].y + dy / 2;
            knobElement = this.GenericKnob(knobConfig);
            knobElement.SetUserData(i);
            groupShape.AddElement(knobElement);
          }
        }
      }
    }

    // Check for object hooks; if present and not connectors, do not add rotate trigger
    const narrowShape = frame.width < 44;
    let hasValidHooks = this.hooks.length > 0;
    if (hasValidHooks) {
      const hookObj = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);
      if (hookObj && hookObj.DrawingObjectBaseClass !== ConstantData.DrawingObjectBaseClass.CONNECTOR) {
        hasValidHooks = false;
      }
    }

    // Add rotate trigger if allowed (and not locked, touch initiated, or narrow, and no valid hooks)
    if (!(this.NoRotate() || this.NoGrow() || GlobalData.optManager.bTouchInitiated || knobConfig.locked || narrowShape || hasValidHooks)) {
      const isTextAlignedLeft = (this.TextGrow === ConstantData.TextGrowBehavior.HORIZONTAL &&
        (this.flags & ConstantData.ObjFlags.SEDO_TextOnly) &&
        ShapeAttrUtil.TextAlignToWin(this.TextAlign).just === ConstantData2.TextJust.TA_LEFT);
      knobConfig.shapeType = ConstantData.CreateShapeType.OVAL;
      knobConfig.x = isTextAlignedLeft ? frameWidth + adjustedRKnobSize : frameWidth - 3 * adjustedRKnobSize;
      knobConfig.y = frameHeight / 2 - adjustedRKnobSize / 2;
      knobConfig.cursorType = Element.CursorType.ROTATE;
      knobConfig.knobID = ConstantData.ActionTriggerType.ROTATE;
      knobConfig.fillColor = 'white';
      knobConfig.fillOpacity = 0.001;
      knobConfig.strokeSize = 1.5;
      knobConfig.strokeColor = 'black';
      knobElement = this.GenericKnob(knobConfig);
      groupShape.AddElement(knobElement);
    }

    // Create dimension adjustment knobs if required
    if ((this.Dimensions & ConstantData.DimensionFlags.SED_DF_Standoff) &&
      this.CanUseStandOffDimensionLines()) {
      const shapeElem = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
      this.CreateDimensionAdjustmentKnobs(groupShape, shapeElem, knobConfig);
    }

    // Set size and position of the action triggers container
    groupShape.SetSize(frameWidth, frameHeight);
    groupShape.SetPos(adjustedFrame.x, adjustedFrame.y);
    groupShape.isShape = true;
    groupShape.SetID(ConstantData.Defines.Action + triggerId);

    console.log("= S.BaseShape - CreateActionTriggers output:", groupShape);
    return groupShape;
  }

  CreateConnectHilites(
    svgDoc: any,
    triggerId: any,
    targetParam: any,
    additionalParam: any,
    extraParam: any,
    connectionHint: any
  ) {
    console.log("= S.BaseShape - CreateConnectHilites input:", {
      svgDoc,
      triggerId,
      targetParam,
      additionalParam,
      extraParam,
      connectionHint
    });

    // Create the main group shape for the connection highlights
    const groupShape = svgDoc.CreateShape(ConstantData.CreateShapeType.GROUP);
    let screenScale = svgDoc.docInfo.docToScreenScale;
    if (svgDoc.docInfo.docScale <= 0.5) {
      screenScale *= 2;
    }

    // Calculate knob dimension based on scale
    const connectDim = ConstantData.Defines.CONNECTPT_DIM / screenScale;
    let targetPoints: any[] = [];
    // Using ConnectPoints if flag is set (though not used further)
    if (this.flags & ConstantData.ObjFlags.SEDO_UseConnect && this.ConnectPoints) {
      // Code intentionally left empty if only referenced for side-effect
    }

    // Determine if continuous connector flag is set or a connection hint exists
    const useContinuous = (this.flags & ConstantData.ObjFlags.SEDO_ContConn) || connectionHint != null;
    if (useContinuous) {
      targetPoints.push(targetParam);
    } else {
      targetPoints = this.GetTargetPoints(null, ConstantData.HookFlags.SED_LC_NoSnaps, null);
      if (targetPoints == null) return;
    }

    // Get perimeter points for connection highlights
    const perimeterPts = this.GetPerimPts(
      triggerId,
      targetPoints,
      null,
      !useContinuous,
      connectionHint,
      extraParam
    );

    // Expand the frame by connectDim
    const frame = this.Frame;
    let frameWidth = frame.width;
    let frameHeight = frame.height;
    const expandedFrame = $.extend(true, {}, frame);
    expandedFrame.x -= connectDim / 2;
    expandedFrame.y -= connectDim / 2;
    expandedFrame.width += connectDim;
    expandedFrame.height += connectDim;
    frameWidth += connectDim;
    frameHeight += connectDim;

    // Prepare knob configuration parameters
    const knobConfig = {
      svgDoc: svgDoc,
      shapeType: ConstantData.CreateShapeType.OVAL,
      x: 0,
      y: 0,
      knobSize: connectDim,
      fillColor: "black",
      fillOpacity: 1,
      strokeSize: 1,
      strokeColor: "#777777",
      KnobID: 0,
      cursorType: Element.CursorType.ANCHOR
    };

    let knobElement: any;
    // Depending on useContinuous, position the knob appropriately
    if (useContinuous) {
      expandedFrame.x = perimeterPts[0].x;
      expandedFrame.y = perimeterPts[0].y;
      expandedFrame.x -= connectDim;
      expandedFrame.y -= connectDim;
      knobConfig.x = connectDim / 2;
      knobConfig.y = connectDim / 2;
      knobElement = this.GenericKnob(knobConfig);
      groupShape.AddElement(knobElement);
      groupShape.SetSize(expandedFrame.width, expandedFrame.height);
      groupShape.SetPos(expandedFrame.x, expandedFrame.y);
    } else {
      // Create a knob at each perimeter point relative to the shape's Frame
      for (let i = 0; i < perimeterPts.length; i++) {
        knobConfig.x = perimeterPts[i].x - this.Frame.x;
        knobConfig.y = perimeterPts[i].y - this.Frame.y;
        knobElement = this.GenericKnob(knobConfig);
        groupShape.AddElement(knobElement);
      }
      groupShape.SetSize(frameWidth, frameHeight);
      groupShape.SetPos(expandedFrame.x, expandedFrame.y);
    }

    groupShape.isShape = true;
    groupShape.SetEventBehavior(Element.EventBehavior.NONE);
    groupShape.SetID("hilite_" + triggerId);

    console.log("= S.BaseShape - CreateConnectHilites output:", groupShape);
    return groupShape;
  }

  SetCursors() {
    console.log("= S.BaseShape - SetCursors input, BlockID:", this.BlockID);

    // Retrieve the main SVG element for this shape
    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    const isOneClickText = ((this.TextFlags & ConstantData.TextFlags.SED_TF_OneClick) > 0);
    const editMode = GlobalData.optManager.GetEditMode();

    switch (editMode) {
      case ConstantData.EditState.DEFAULT: {
        const activeTableId = GlobalData.optManager.Table_GetActiveID();
        const table = this.GetTable(false);

        if (table) {
          if (isOneClickText || this.BlockID === activeTableId) {
            console.log("= S.BaseShape - SetCursors: Using Table_SetCursors with disable editing");
            GlobalData.optManager.Table_SetCursors(svgElement, this, table, false);
          } else {
            console.log("= S.BaseShape - SetCursors: Using Table_SetCursors with enable editing");
            GlobalData.optManager.Table_SetCursors(svgElement, this, table, true);
            // Call parent SetCursors to handle default cursor settings
            super.SetCursors();

            if (isOneClickText) {
              const shapeElem = svgElement.GetElementByID(ConstantData.SVGElementClass.SHAPE);
              if (shapeElem) {
                shapeElem.SetCursor(Element.CursorType.TEXT);
              }
              // Optionally retrieve the "SLOP" element if needed
              const slopElem = svgElement.GetElementByID(ConstantData.SVGElementClass.SLOP);
            }
          }
        } else {
          // When no table exists, simply call the parent method
          super.SetCursors();
        }
        break;
      }
      case ConstantData.EditState.FORMATPAINT: {
        console.log("= S.BaseShape - SetCursors: FORMATPAINT mode");
        const shapeElem = svgElement.GetElementByID(ConstantData.SVGElementClass.SHAPE);
        if (shapeElem) {
          shapeElem.SetCursor(Element.CursorType.PAINT);
        }
        const slopElem = svgElement.GetElementByID(ConstantData.SVGElementClass.SLOP);
        if (slopElem) {
          slopElem.SetCursor(Element.CursorType.PAINT);
        }
        break;
      }
      default: {
        console.log("= S.BaseShape - SetCursors: Default mode, calling super.SetCursors()");
        // Default behavior: just call the parent's method
        super.SetCursors();
      }
    }

    console.log("= S.BaseShape - SetCursors output, BlockID:", this.BlockID);
  }

  GetTextObject(event: any, skipTableRelease: boolean) {
    console.log("= S.BaseShape - GetTextObject input:", { event, skipTableRelease });
    let dataId: number;
    const table = this.GetTable(false);
    const graph = this.GetGraph(false);

    if (table) {
      // When a table is present
      if (table.select >= 0) {
        if (!skipTableRelease) {
          GlobalData.optManager.Table_Release(true);
        }
        dataId = table.select;
        if (!GlobalData.optManager.Table_AllowCellTextEdit(table, dataId)) {
          dataId = GlobalData.optManager.Table_GetNextTextCell(table, dataId, ConstantData2.Keys.Right_Arrow);
          if (dataId < 0) {
            dataId = GlobalData.optManager.Table_GetNextTextCell(table, 0, ConstantData2.Keys.Right_Arrow);
          }
        }
        if (dataId >= 0) {
          table.select = dataId;
          this.DataID = table.cells[table.select].DataID;
        }
      } else {
        // When no selection exists in the table
        if (event) {
          dataId = GlobalData.optManager.Table_GetCellClicked(this, event);
          if (dataId >= 0) {
            if (!GlobalData.optManager.Table_AllowCellTextEdit(table, dataId)) {
              dataId = GlobalData.optManager.Table_GetNextTextCell(table, dataId, ConstantData2.Keys.Right_Arrow);
            }
          }
        } else {
          dataId = GlobalData.optManager.Table_GetFirstTextCell(table);
        }
        if (dataId >= 0) {
          table.select = dataId;
          this.DataID = table.cells[table.select].DataID;
        }
      }

      // Validate DataID exists
      if (this.DataID >= 0 && GlobalData.optManager.GetObjectPtr(this.DataID, false) == null) {
        this.DataID = -1;
        table.cells[table.select].DataID = -1;
      }

      // Update text element on the SVG layer
      const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
      if (svgElement) {
        svgElement.textElem = svgElement.GetElementByID(ConstantData.SVGElementClass.TEXT, this.DataID);
      }
    } else if (graph) {
      // When a graph is present
      this.DataID = graph.selectedText;
      const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
      if (svgElement) {
        svgElement.textElem = svgElement.GetElementByID(ConstantData.SVGElementClass.TEXT, this.DataID);
      }
    } else if (this.DataID >= 0 && GlobalData.optManager.GetObjectPtr(this.DataID, false) == null) {
      // When the DataID is invalid
      this.DataID = -1;
    }

    console.log("= S.BaseShape - GetTextObject output:", { DataID: this.DataID });
    return this.DataID;
  }

  UseTextBlockColor() {
    console.log("= S.BaseShape - UseTextBlockColor input:", {
      TextFlags: this.TextFlags,
      FillPaintType: this.StyleRecord.Fill.Paint.FillType,
      TextPaintColor: this.StyleRecord.Text.Paint.Color,
      FillColor: this.StyleRecord.Fill.Paint.Color
    });

    const hasAttachFlag =
      (this.TextFlags & ConstantData.TextFlags.SED_TF_AttachA) ||
      (this.TextFlags & ConstantData.TextFlags.SED_TF_AttachB);

    const isTransparent =
      this.StyleRecord.Fill.Paint.FillType === ConstantData.FillTypes.SDFILL_TRANSPARENT;

    const isSolidAndSameColor =
      this.StyleRecord.Fill.Paint.FillType === ConstantData.FillTypes.SDFILL_SOLID &&
      this.StyleRecord.Text.Paint.Color.toUpperCase() === this.StyleRecord.Fill.Paint.Color.toUpperCase();

    const result = hasAttachFlag || isTransparent || isSolidAndSameColor;
    console.log("= S.BaseShape - UseTextBlockColor output:", result);

    return result;
  }

  SetTextObject(inputDataID: number) {
    console.log("= S.BaseShape - SetTextObject input:", inputDataID);
    const table = this.GetTable(true);
    if (table) {
      if (table.select >= 0) {
        table.cells[table.select].DataID = inputDataID;
      }
    }
    if (this.UseTextBlockColor()) {
      const style = Utils4.FindStyle(ConstantData.Defines.TextBlockStyle);
      if (style) {
        this.StyleRecord.Text.Paint = Utils1.DeepCopy(style.Text.Paint);
      }
    }
    this.DataID = inputDataID;
    console.log("= S.BaseShape - SetTextObject output:", this.DataID);
    return true;
  }

  GetTextParams(event: any) {
    console.log("= S.BaseShape - GetTextParams input:", { event });

    let textParams: any = {};
    const table = this.GetTable(false);
    const graph = this.GetGraph(false);

    if (table && table.select >= 0) {
      textParams = GlobalData.optManager.Table_GetTRect(this, table, event);
    } else if (graph && graph.selectedText >= 0) {
      textParams = GlobalData.optManager.Graph_GetTRect(this, graph, event);
    } else {
      textParams.trect = Utils1.DeepCopy(this.trect);
      textParams.sizedim = Utils1.DeepCopy(this.sizedim);
      textParams.tsizedim = {
        width: this.sizedim.width - (this.Frame.width - this.trect.width),
        height: this.sizedim.height - (this.Frame.height - this.trect.height)
      };
    }

    console.log("= S.BaseShape - GetTextParams output:", textParams);
    return textParams;
  }

  GetTextDefault(eventParameter: any): any {
    console.log("= S.BaseShape - GetTextDefault input:", { eventParameter });
    const table = this.GetTable(false);
    let defaultText: any;

    if (table) {
      defaultText = GlobalData.optManager.Table_GetCellTextFormat(table, table.select, eventParameter);
    } else {
      defaultText = super.GetTextDefault(eventParameter);
    }

    console.log("= S.BaseShape - GetTextDefault output:", defaultText);
    return defaultText;
  }

  SetTableProperties(properties: any, option: any): any {
    console.log("= S.BaseShape - SetTableProperties input:", { properties, option });

    if (this.GetTable(false)) {
      const result = GlobalData.optManager.Table_SetProperties(this, properties, option, true);
      console.log("= S.BaseShape - SetTableProperties output:", result);
      return result;
    }

    console.log("= S.BaseShape - SetTableProperties output: no table found");
    return undefined;
  }

  SetTextGrow(textGrowBehavior: any): void {
    console.log("= S.BaseShape - SetTextGrow input:", textGrowBehavior);

    if (this.GetTable(false)) {
      GlobalData.optManager.Table_ChangeTextAttributes(this, null, null, null, null, null, textGrowBehavior, false);
      console.log("= S.BaseShape - SetTextGrow output: Table text attributes changed");
    } else {
      // Update the TextGrow property
      this.TextGrow = textGrowBehavior;

      if (this.DataID >= 0) {
        const shapeElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
        if (shapeElement) {
          const textElement = shapeElement.textElem;

          if (this.TextGrow === ConstantData.TextGrowBehavior.HORIZONTAL) {
            textElement.SetConstraints(
              GlobalData.optManager.theContentHeader.MaxWorkDim.x,
              this.trect.width,
              this.trect.height
            );
            console.log("= S.BaseShape - SetTextGrow applied HORIZONTAL constraints");
          } else {
            const shapeCopy = Utils1.DeepCopy(this);
            const frameCopy = Utils1.DeepCopy(this.Frame);
            frameCopy.width = this.sizedim.width;
            shapeCopy.UpdateFrame(frameCopy);
            textElement.SetConstraints(
              shapeCopy.trect.width,
              shapeCopy.trect.width,
              this.trect.height
            );
            console.log("= S.BaseShape - SetTextGrow applied VERTICAL constraints");
          }
        }
        GlobalData.optManager.TextResizeCommon(this.BlockID, true);
        console.log("= S.BaseShape - SetTextGrow: TextResizeCommon called");
      }
      console.log("= S.BaseShape - SetTextGrow output:", this.TextGrow);
    }
  }

  ChangeShape(newDataClass, newShapeType, getVertexArrayFunc, shapeParam, preserveAspect) {
    console.log("= S.BaseShape - ChangeShape input:", {
      newDataClass,
      newShapeType,
      shapeParam,
      preserveAspect
    });

    let newShape;
    let preservedBlock;
    let tableResult;
    let rectCopy;
    let resizedTable;
    const sessionBlock = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);

    if (this.SymbolURL && this.SymbolURL.length > 0) {
      console.log("= S.BaseShape - ChangeShape output: SymbolURL exists, returning false");
      return false;
    }

    if (newDataClass !== this.dataclass || newShapeType === ConstantData.SDRShapeTypes.SED_S_Rect) {
      // Create a deep copy of current properties
      const newShapeProps = $.extend(true, {}, this);

      // Enforce aspect ratio if required
      if (preserveAspect) {
        const centerX = newShapeProps.Frame.x + newShapeProps.Frame.width / 2;
        const centerY = newShapeProps.Frame.y + newShapeProps.Frame.height / 2;
        if (newShapeProps.Frame.width > newShapeProps.Frame.height) {
          newShapeProps.Frame.x = centerX - newShapeProps.Frame.height / 2;
          newShapeProps.Frame.width = newShapeProps.Frame.height;
        } else {
          newShapeProps.Frame.y = centerY - newShapeProps.Frame.width / 2;
          newShapeProps.Frame.height = newShapeProps.Frame.width;
        }
      }

      // Instantiate the correct shape based on newShapeType
      switch (newShapeType) {
        case ConstantData.SDRShapeTypes.SED_S_Rect:
        case ConstantData.SDRShapeTypes.SED_S_MeasureArea:
          newShape = new Instance.Shape.Rect(newShapeProps);
          break;
        case ConstantData.SDRShapeTypes.SED_S_RRect:
          newShapeProps.shapeparam = sessionBlock.def.rrectparam;
          newShape = new Instance.Shape.RRect(newShapeProps);
          newShape.moreflags = Utils2.SetFlag(newShape.moreflags, ConstantData.ObjMoreFlags.SED_MF_FixedRR, true);
          shapeParam = sessionBlock.def.rrectparam;
          break;
        case ConstantData.SDRShapeTypes.SED_S_Oval:
        case ConstantData.SDRShapeTypes.SED_S_Circ:
          newShape = new Instance.Shape.Oval(newShapeProps);
          break;
        case ConstantData.SDRShapeTypes.SED_S_Poly:
          const vertexArray = getVertexArrayFunc(this.Frame, shapeParam);
          newShapeProps.VertexArray = vertexArray;
          newShape = new Instance.Shape.Polygon(newShapeProps);
          newShape.NeedsSIndentCount = true;
          break;
      }

      // Preserve the block and update new shape properties
      preservedBlock = GlobalData.objectStore.PreserveBlock(this.BlockID);
      newShape.dataclass = newDataClass;
      newShape.shapeparam = shapeParam;
      newShape.ResizeAspectConstrain = preserveAspect;
      if (newShape.ImageURL === "") {
        newShape.extraflags = Utils2.SetFlag(
          newShape.extraflags,
          ConstantData.ExtraFlags.SEDE_FlipHoriz | ConstantData.ExtraFlags.SEDE_FlipVert,
          false
        );
      }
      newShape.ObjGrow = preserveAspect ? ConstantData.GrowBehavior.PROPORTIONAL : ConstantData.GrowBehavior.ALL;
      newShape.BlockID = preservedBlock.Data.BlockID;
      newShape.left_sindent = 0;
      newShape.top_sindent = 0;
      newShape.right_sindent = 0;
      newShape.bottom_sindent = 0;
      preservedBlock.Data = newShape;
      newShape.moreflags = Utils2.SetFlag(newShape.moreflags, ConstantData.ObjMoreFlags.SED_MF_FixedRR, false);

      // Handle table adjustments if a table exists for the new shape
      tableResult = newShape.GetTable(true);
      if (tableResult) {
        if (this.hookflags & ConstantData.HookFlags.SED_LC_TableRows) {
          newShape.hookflags = Utils2.SetFlag(newShape.hookflags, ConstantData.HookFlags.SED_LC_TableRows, true);
        }
        newShape.UpdateFrame(newShape.Frame);
        rectCopy = Utils1.DeepCopy(newShape.trect);
        newShape.sizedim.width = newShape.Frame.width;
        newShape.sizedim.height = newShape.Frame.height;
        GlobalData.optManager.theActionTable = Utils1.DeepCopy(tableResult);
        resizedTable = GlobalData.optManager.Table_Resize(
          newShape,
          tableResult,
          GlobalData.optManager.theActionTable,
          rectCopy.width,
          rectCopy.height
        );
        if (resizedTable.x > rectCopy.width + 0.1 || resizedTable.y > rectCopy.height + 0.1) {
          const aspectRatioOriginal = newShape.sizedim.width / newShape.sizedim.height;
          rectCopy.width = resizedTable.x;
          rectCopy.height = resizedTable.y;
          newShape.TRectToFrame(rectCopy);
          const currentAspectRatio = newShape.Frame.width / newShape.Frame.height;
          if (currentAspectRatio > aspectRatioOriginal) {
            newShape.Frame.height = newShape.Frame.width / aspectRatioOriginal;
            newShape.UpdateFrame(newShape.Frame);
            GlobalData.optManager.Table_Resize(
              newShape,
              tableResult,
              GlobalData.optManager.theActionTable,
              newShape.trect.width,
              newShape.trect.height
            );
          } else if (currentAspectRatio < aspectRatioOriginal) {
            newShape.Frame.width = newShape.Frame.height * aspectRatioOriginal;
            newShape.UpdateFrame(newShape.Frame);
            GlobalData.optManager.Table_Resize(
              newShape,
              tableResult,
              GlobalData.optManager.theActionTable,
              newShape.trect.width,
              newShape.trect.height
            );
          }
        }
        GlobalData.optManager.theActionTable = null;
      } else if (newShape.DataID >= 0) {
        // When there is no table, update based on text element sizing
        newShape.UpdateFrame(newShape.Frame);
        newShape.sizedim.width = newShape.Frame.width;
        newShape.sizedim.height = newShape.Frame.height;
        const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
        let textElement;
        if (svgElement) {
          textElement = svgElement.textElem;
        }
        rectCopy = Utils1.DeepCopy(newShape.trect);
        if (textElement) {
          let textFit = textElement.CalcTextFit(rectCopy.width);
          if (textFit.height > rectCopy.height) {
            textFit = GlobalData.optManager.FitProp(newShape, textElement, textFit.height - rectCopy.height, -1);
            newShape.Frame.width = textFit.x;
            newShape.Frame.height = textFit.y;
          } else {
            newShape.TRectToFrame(rectCopy, false);
          }
        }
      }

      newShape.SetSize(newShape.Frame.width, newShape.Frame.height, 0);
      console.log("= S.BaseShape - ChangeShape output:", { result: true, newShape });
      return true;
    }

    console.log("= S.BaseShape - ChangeShape output: condition not met, returning false");
    return false;
  }

  SetShapeProperties(properties: any) {
    console.log("= S.BaseShape - SetShapeProperties input:", properties);
    let changed = false;
    let widthAdjust = 0;
    let heightAdjust = 0;
    let flagUpdated = false;
    const currentTextFlags = this.TextFlags;
    const textFlagConstants = ConstantData.TextFlags;

    // Call parent implementation and check text flags condition
    if (
      // Calling parent's SetShapeProperties
      super.SetShapeProperties(properties) &&
      (changed = true,
        ((this.TextFlags & (textFlagConstants.SED_TF_AttachA + textFlagConstants.SED_TF_AttachB)) !== (currentTextFlags & (textFlagConstants.SED_TF_AttachA + textFlagConstants.SED_TF_AttachB)) &&
          this.DataID >= 0))
    ) {
      flagUpdated = true;
      let style;
      if (this.TextFlags & (textFlagConstants.SED_TF_AttachA + textFlagConstants.SED_TF_AttachB)) {
        style = Utils4.FindStyle(ConstantData.Defines.TextBlockStyle);
      } else {
        style = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false).def.style;
      }
      const newStyle = {
        StyleRecord: {
          Text: {
            Paint: {
              Color: style.Text.Paint.Color
            }
          }
        }
      };
      const oldColor = { Color: newStyle.StyleRecord.Text.Paint.Color };
      const styleConfig = { color: newStyle.StyleRecord.Text.Paint.Color };
      this.ChangeTextAttributes(styleConfig, oldColor);
    }

    // Update text margin if provided
    const table = this.GetTable(false);
    if (properties.tmargin != null) {
      if (table) {
        changed = GlobalData.optManager.Table_ChangeTextMargin(this, properties.tmargin);
      } else if (this.TMargins.left !== properties.tmargin) {
        this.TMargins.left = properties.tmargin;
        this.TMargins.right = properties.tmargin;
        this.TMargins.top = properties.tmargin;
        this.TMargins.bottom = properties.tmargin;
        changed = true;
        const frameCopy = $.extend(true, {}, this.Frame);
        this.UpdateFrame(frameCopy);
        if (this.trect.width < 0) {
          widthAdjust = -this.trect.width;
        }
        if (this.trect.height < 0) {
          heightAdjust = -this.trect.height;
        }
        if (widthAdjust || heightAdjust) {
          Utils2.InflateRect(this.trect, widthAdjust / 2, heightAdjust / 2);
          this.TRectToFrame(this.trect, true);
          GlobalData.optManager.AddToDirtyList(this.BlockID);
        }
        if (this.DataID >= 0) {
          flagUpdated = true;
        }
        changed = true;
      }
    }

    // Update side connection flag for polygon shapes
    if (
      properties.SideConn != null &&
      this.ShapeType === ConstantData.ShapeType.POLYGON &&
      properties.AdjSides !== ((this.extraflags & ConstantData.ExtraFlags.SEDE_SideKnobs) > 0)
    ) {
      this.extraflags = Utils2.SetFlag(
        this.extraflags,
        ConstantData.ExtraFlags.SEDE_SideKnobs,
        properties.SideConn
      );
      GlobalData.optManager.AddToDirtyList(this.BlockID);
      changed = true;
    }

    // Update container flag if needed
    if (
      properties.Container != null &&
      properties.Container !== ((this.moreflags & ConstantData.ObjMoreFlags.SED_MF_Container) > 0)
    ) {
      this.moreflags = Utils2.SetFlag(
        this.moreflags,
        ConstantData.ObjMoreFlags.SED_MF_Container,
        properties.Container
      );
      changed = true;
    }

    // Update grow behavior
    if (properties.ObjGrow != null && properties.ObjGrow !== this.ObjGrow) {
      this.ObjGrow = properties.ObjGrow;
      GlobalData.optManager.AddToDirtyList(this.BlockID);
      changed = true;
      this.ResizeAspectConstrain = this.ObjGrow === ConstantData.GrowBehavior.PROPORTIONAL;
    }

    // Update text grow property if changed
    if (properties.TextGrow != null && properties.TextGrow !== this.TextGrow) {
      this.SetTextGrow(properties.TextGrow);
      changed = true;
      flagUpdated = false;
    }

    if (flagUpdated) {
      this.SetTextGrow(this.TextGrow);
      changed = true;
    }

    console.log("= S.BaseShape - SetShapeProperties output:", changed);
    return changed;
  }

  ApplyStyle(style: any, options: any): void {
    console.log("= S.BaseShape - ApplyStyle input:", { style, options });

    let backupLine: any = null;

    // Only adjust style if not a swimlane or shape container
    if (!this.IsSwimlane() && this.objecttype !== ConstantData.ObjectTypes.SD_OBJT_SHAPECONTAINER) {
      if (style && style.Line && style.Border) {
        backupLine = Utils1.DeepCopy(style.Line);
        style.Line = Utils1.DeepCopy(style.Border);
      }

      // Call parent ApplyStyle method
      super.ApplyStyle(style, options);

      if (backupLine != null) {
        style.Line = Utils1.DeepCopy(backupLine);
      }
    }

    console.log("= S.BaseShape - ApplyStyle output:", { style, options });
  }

  SetObjectStyle(style: any): any {
    console.log("= S.BaseShape.SetObjectStyle input:", style);

    let originalLine: any = null;

    // Save original line style if available and replace with border style
    if (style.StyleRecord && style.StyleRecord.Line && style.StyleRecord.Border) {
      originalLine = Utils1.DeepCopy(style.StyleRecord.Line);
      style.StyleRecord.Line = Utils1.DeepCopy(style.StyleRecord.Border);
    }

    // Call parent SetObjectStyle
    const result = super.SetObjectStyle(style);

    // If there is a line thickness defined, update the size based on current frame dimensions
    if (result.StyleRecord && result.StyleRecord.Line && result.StyleRecord.Line.Thickness) {
      this.SetSize(
        this.Frame.width,
        this.Frame.height,
        ConstantData.ActionTriggerType.LINE_THICKNESS
      );
    }

    // Restore original line style if it was modified
    if (originalLine != null) {
      style.StyleRecord.Line = Utils1.DeepCopy(originalLine);
    }

    // Clear image and update text flags if necessary
    if (result.StyleRecord && result.StyleRecord.Fill && result.StyleRecord.Fill.FillType) {
      GlobalData.optManager.ClearImage(this.BlockID, false, true);

      if (
        (this.flags & ConstantData.ObjFlags.SEDO_TextOnly) &&
        this.StyleRecord.Fill.Paint.FillType !== ConstantData.FillTypes.SDFILL_TRANSPARENT
      ) {
        this.flags = Utils2.SetFlag(this.flags, ConstantData.ObjFlags.SEDO_TextOnly, false);
      }
    }

    console.log("= S.BaseShape.SetObjectStyle output:", result);
    return result;
  }

  SetShapeConnectionPoints(connectionType: any, connectionPoints: any, newAttachPoint: any) {
    console.log("= S.BaseShape - SetShapeConnectionPoints input:", { connectionType, connectionPoints, newAttachPoint });

    let changed = false;

    // Update attach point if different
    if (!(this.attachpoint.x === newAttachPoint.x && this.attachpoint.y === newAttachPoint.y)) {
      this.attachpoint.x = newAttachPoint.x;
      this.attachpoint.y = newAttachPoint.y;
      changed = true;
    }

    switch (connectionType) {
      case ConstantData.ObjFlags.SEDO_ContConn:
        if ((this.flags & connectionType) === 0) {
          this.flags = Utils2.SetFlag(this.flags, ConstantData.ObjFlags.SEDO_UseConnect, false);
          this.flags = Utils2.SetFlag(this.flags, ConstantData.ObjFlags.SEDO_ContConn, true);
          changed = true;
        }
        break;

      case ConstantData.ObjFlags.SEDO_UseConnect:
        this.flags = Utils2.SetFlag(this.flags, ConstantData.ObjFlags.SEDO_ContConn, false);
        this.flags = Utils2.SetFlag(this.flags, ConstantData.ObjFlags.SEDO_UseConnect, true);
        this.ConnectPoints = Utils1.DeepCopy(connectionPoints);
        changed = true;
        break;

      default:
        if (
          (this.flags & ConstantData.ObjFlags.SEDO_ContConn) ||
          (this.flags & ConstantData.ObjFlags.SEDO_UseConnect)
        ) {
          this.flags = Utils2.SetFlag(this.flags, ConstantData.ObjFlags.SEDO_UseConnect, false);
          this.flags = Utils2.SetFlag(this.flags, ConstantData.ObjFlags.SEDO_ContConn, false);
          changed = true;
        }
    }

    console.log("= S.BaseShape - SetShapeConnectionPoints output:", changed);
    return changed;
  }

  GetClosestConnectPoint(point: { x: number; y: number }): boolean {
    console.log("= S.BaseShape - GetClosestConnectPoint input:", point);

    const table = this.GetTable(false);
    const useTableRows = (this.hookflags & ConstantData.HookFlags.SED_LC_TableRows) && table;
    const useConnect = (this.flags & ConstantData.ObjFlags.SEDO_UseConnect) && this.ConnectPoints;
    let connectPoints: Array<{ x: number; y: number }> = [];
    const connectDimension = ConstantData.Defines.SED_CDim;

    if (useConnect) {
      // Create a rect with the connection dimension
      const rect = { x: 0, y: 0, width: connectDimension, height: connectDimension };
      connectPoints = Utils1.DeepCopy(this.ConnectPoints);
      GlobalData.optManager.FlipPoints(rect, this.extraflags, connectPoints);
      if (this.RotationAngle !== 0) {
        const rotationRadians = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
        Utils3.RotatePointsAboutCenter(rect, rotationRadians, connectPoints);
      }
    } else if (useTableRows) {
      connectPoints = GlobalData.optManager.Table_GetRowConnectPoints(this, table);
      if (point.x < 10) {
        point.x = connectPoints[2].x;
        point.y = connectPoints[2].y;
        console.log("= S.BaseShape - GetClosestConnectPoint output:", point);
        return true;
      }
      if (point.x > connectDimension - 10) {
        point.x = connectPoints[2 + table.rows.length].x;
        point.y = connectPoints[2 + table.rows.length].y;
        console.log("= S.BaseShape - GetClosestConnectPoint output:", point);
        return true;
      }
    }

    if (useConnect || useTableRows) {
      let bestDistanceSquared: number | undefined;
      let bestConnectPoint: { x: number; y: number };

      for (let i = 0; i < connectPoints.length; i++) {
        const cp = connectPoints[i];
        const dx = point.x - cp.x;
        const dy = point.y - cp.y;
        const currentDistanceSquared = dx * dx + dy * dy;
        if (bestDistanceSquared === undefined || currentDistanceSquared < bestDistanceSquared) {
          bestDistanceSquared = currentDistanceSquared;
          bestConnectPoint = cp;
        }
      }

      point.x = bestConnectPoint.x;
      point.y = bestConnectPoint.y;
      console.log("= S.BaseShape - GetClosestConnectPoint output:", point);
      return true;
    }

    console.log("= S.BaseShape - GetClosestConnectPoint output:", false);
    return false;
  }

  GetPolyList() {
    console.log("= S.BaseShape - GetPolyList input:", {});
    let seg: PolySeg;
    let polyList: PolyList = new PolyList();
    let tempValue: any;
    let frameParam: any;
    let cornerSize: any;
    const shapeTypes = ConstantData.SDRShapeTypes;
    const lineTypes = ConstantData.LineType;

    switch (this.dataclass) {
      case shapeTypes.SED_S_Rect:
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, this.inside.width, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, this.inside.width, this.inside.height);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, 0, this.inside.height);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.segs.push(seg);
        break;

      case shapeTypes.SED_S_RRect:
        tempValue = this.Frame.width;
        if (this.Frame.height < tempValue) {
          tempValue = this.Frame.height;
        }
        cornerSize = this.GetCornerSize();
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, this.inside.width - 2 * cornerSize, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - cornerSize, cornerSize);
        seg.ShortRef = ConstantData.ArcQuad.SD_PLA_TL;
        seg.param = Math.PI / 2;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, this.inside.width - cornerSize, this.inside.height - cornerSize);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - 2 * cornerSize, this.inside.height);
        polyList.segs.push(seg);
        seg.ShortRef = ConstantData.ArcQuad.SD_PLA_BR;
        seg = new PolySeg(lineTypes.LINE, 0, this.inside.height);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, -cornerSize, this.inside.height - cornerSize);
        seg.ShortRef = ConstantData.ArcQuad.SD_PLA_BL;
        seg.param = Math.PI / 2;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, -cornerSize, cornerSize);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, 0, 0);
        polyList.segs.push(seg);
        polyList.offset.x = cornerSize;
        polyList.offset.y = 0;
        break;

      case shapeTypes.SED_S_Oval:
      case shapeTypes.SED_S_Circ:
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width / 2, this.inside.height / 2);
        polyList.segs.push(seg);
        seg.ShortRef = ConstantData.ArcQuad.SD_PLA_BR;
        seg.param = -Math.PI / 2;
        seg = new PolySeg(lineTypes.ARCSEGLINE, 0, this.inside.height);
        seg.ShortRef = ConstantData.ArcQuad.SD_PLA_BL;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, -this.inside.width / 2, this.inside.height / 2);
        polyList.segs.push(seg);
        seg.ShortRef = ConstantData.ArcQuad.SD_PLA_TL;
        seg.param = -Math.PI / 2;
        seg = new PolySeg(lineTypes.ARCSEGLINE, 0, 0);
        polyList.segs.push(seg);
        seg.ShortRef = ConstantData.ArcQuad.SD_PLA_TL;
        polyList.offset.x = this.inside.width / 2;
        polyList.offset.y = 0;
        break;

      case shapeTypes.SED_S_Doc:
        cornerSize = this.shapeparam;
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, this.inside.width, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, this.inside.width, this.inside.height - cornerSize);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCLINE, this.inside.width / 2, this.inside.height - cornerSize);
        seg.param = cornerSize;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCLINE, 0, this.inside.height - cornerSize);
        seg.param = -cornerSize;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.segs.push(seg);
        break;

      case shapeTypes.SED_S_Term:
        if (this.inside.width > this.inside.height) {
          cornerSize = this.inside.height / 2;
          seg = new PolySeg(lineTypes.LINE, 0, 0);
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.LINE, this.inside.width - 2 * cornerSize, 0);
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - cornerSize, cornerSize);
          seg.ShortRef = ConstantData.ArcQuad.SD_PLA_TL;
          seg.param = Math.PI / 2;
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - 2 * cornerSize, this.inside.height);
          polyList.segs.push(seg);
          seg.ShortRef = ConstantData.ArcQuad.SD_PLA_BR;
          seg = new PolySeg(lineTypes.LINE, 0, this.inside.height);
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.ARCSEGLINE, -cornerSize, this.inside.height - cornerSize);
          seg.ShortRef = ConstantData.ArcQuad.SD_PLA_BL;
          seg.param = Math.PI / 2;
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.ARCSEGLINE, 0, 0);
          seg.ShortRef = ConstantData.ArcQuad.SD_PLA_TL;
          polyList.segs.push(seg);
        } else {
          cornerSize = this.inside.width / 2;
          seg = new PolySeg(lineTypes.LINE, 0, 0);
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - cornerSize, cornerSize);
          seg.ShortRef = ConstantData.ArcQuad.SD_PLA_TL;
          seg.param = Math.PI / 2;
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.LINE, this.inside.width - cornerSize, this.inside.height - cornerSize);
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - 2 * cornerSize, this.inside.height);
          polyList.segs.push(seg);
          seg.ShortRef = ConstantData.ArcQuad.SD_PLA_BR;
          seg = new PolySeg(lineTypes.ARCSEGLINE, -cornerSize, this.inside.height - cornerSize);
          seg.ShortRef = ConstantData.ArcQuad.SD_PLA_BL;
          seg.param = Math.PI / 2;
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.LINE, -cornerSize, cornerSize);
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.ARCSEGLINE, 0, 0);
          seg.ShortRef = ConstantData.ArcQuad.SD_PLA_TL;
          polyList.segs.push(seg);
        }
        polyList.offset.x = cornerSize;
        polyList.offset.y = 0;
        break;

      case shapeTypes.SED_S_Store:
        cornerSize = this.shapeparam;
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, this.inside.width - cornerSize, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - 2 * cornerSize, this.inside.height / 2);
        seg.ShortRef = ConstantData.ArcQuad.SD_PLA_TL;
        seg.param = -Math.PI / 2;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - cornerSize, this.inside.height);
        polyList.segs.push(seg);
        seg.ShortRef = ConstantData.ArcQuad.SD_PLA_BL;
        seg = new PolySeg(lineTypes.LINE, 0, this.inside.height);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, -cornerSize, this.inside.height / 2);
        seg.ShortRef = ConstantData.ArcQuad.SD_PLA_BL;
        seg.param = Math.PI / 2;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, 0, 0);
        seg.ShortRef = ConstantData.ArcQuad.SD_PLA_TL;
        polyList.segs.push(seg);
        polyList.offset.x = cornerSize;
        polyList.offset.y = 0;
        break;

      case shapeTypes.SED_S_Delay:
        cornerSize = this.shapeparam;
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, this.inside.width - cornerSize, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width, this.inside.height / 2);
        seg.ShortRef = ConstantData.ArcQuad.SD_PLA_TL;
        seg.param = Math.PI / 2;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - cornerSize, this.inside.height);
        polyList.segs.push(seg);
        seg.ShortRef = ConstantData.ArcQuad.SD_PLA_BR;
        seg = new PolySeg(lineTypes.LINE, 0, this.inside.height);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.offset.x = 0;
        polyList.offset.y = 0;
        break;

      case shapeTypes.SED_S_Disp:
        cornerSize = this.shapeparam;
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, this.inside.width - 2 * cornerSize, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - cornerSize, this.inside.height / 2);
        seg.ShortRef = ConstantData.ArcQuad.SD_PLA_TL;
        seg.param = Math.PI / 2;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - 2 * cornerSize, this.inside.height);
        polyList.segs.push(seg);
        seg.ShortRef = ConstantData.ArcQuad.SD_PLA_BR;
        seg = new PolySeg(lineTypes.LINE, 0, this.inside.height);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, -cornerSize, this.inside.height / 2);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.offset.x = cornerSize;
        polyList.offset.y = 0;
        break;

      default:
        // Default case: use poly points from GetPolyPoints
        const frameBackup = this.Frame;
        this.Frame = this.inside;
        const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
        this.Frame = frameBackup;
        if (polyPoints.length > 0) {
          polyList.offset.x = polyPoints[0].x;
          polyList.offset.y = polyPoints[0].y;
          for (let idx = 0; idx < polyPoints.length; idx++) {
            seg = new PolySeg(lineTypes.LINE, polyPoints[idx].x - polyList.offset.x, polyPoints[idx].y - polyList.offset.y);
            polyList.segs.push(seg);
          }
        }
    }
    polyList.closed = true;
    polyList.dim.x = this.inside.width;
    polyList.dim.y = this.inside.height;
    polyList.wasline = false;
    console.log("= S.BaseShape - GetPolyList output:", polyList);
    return polyList;
  }

  GetListOfEnclosedObjects(isRecursive: boolean) {
    console.log("= S.BaseShape - GetListOfEnclosedObjects input:", { isRecursive });
    let enclosedObjects: number[] = [];
    const containerFlag = ConstantData.ObjMoreFlags.SED_MF_Container;

    // Process only if this object is a container.
    if (this.moreflags & containerFlag) {
      if (this.IsSwimlane()) {
        if (this.FramezList == null) {
          this.FramezList = [];
        }
        console.log("= S.BaseShape - GetListOfEnclosedObjects output (Swimlane):", this.FramezList);
        return this.FramezList;
      }

      let tempVar: any;
      let visibleZList = GlobalData.optManager.VisibleZList();
      let polyRect: any = {};
      const visibleCount = visibleZList.length;
      let baseRect = this.trect;
      let basePoly = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);

      // If this shape is rotated, update the base polygon accordingly.
      if (this.RotationAngle !== 0) {
        const rotationRadians = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
        Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, basePoly);
      }

      // Determine if we need to adjust the base rect for the table cells.
      let fillIsTransparent = (this.StyleRecord.Fill.Paint.FillType === ConstantData.FillTypes.SDFILL_TRANSPARENT);
      // Override fill transparent check.
      fillIsTransparent = false;
      if (!fillIsTransparent) {
        const tableObj = this.GetTable(false);
        if (tableObj) {
          let cellCount = tableObj.cells.length;
          let transparentCellIndex = -1;
          for (let i = 0; i < cellCount; i++) {
            const cell = tableObj.cells[i];
            if (cell.fill.Paint.FillType === ConstantData.FillTypes.SDFILL_TRANSPARENT) {
              if (transparentCellIndex === -1) {
                transparentCellIndex = i;
              }
            } else if (transparentCellIndex >= 0) {
              transparentCellIndex = -2;
              break;
            }
          }
          if (transparentCellIndex >= 0) {
            // Adjust the base rectangle using the transparent cell's frame.
            const cellFrame = tableObj.cells[transparentCellIndex].frame;
            let newRect = {
              x: cellFrame.x,
              y: cellFrame.y,
              width: tableObj.wd - cellFrame.x,
              height: tableObj.ht - cellFrame.y
            };
            Utils2.OffsetRect(newRect, this.trect.x, this.trect.y);
            baseRect = newRect;
            if (this.RotationAngle !== 0) {
              const originalFrame = $.extend(true, {}, this.Frame);
              this.Frame = newRect;
              basePoly = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
              this.Frame = originalFrame;
              const rotationRadians = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
              Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, basePoly);
            }
          } else {
            fillIsTransparent = false;
          }
        }
      }

      // Determine the starting index based on this object's BlockID in the visible Z list.
      let startIndex = 0;
      if (!fillIsTransparent) {
        for (let i = 0; i < visibleCount; i++) {
          if (visibleZList[i] === this.BlockID) {
            startIndex = i + 1;
            break;
          }
        }
      }

      // Collection to hold candidates which might be containers.
      let containerCandidates: number[] = [];
      for (let i = startIndex; i < visibleCount; i++) {
        const candidateId = visibleZList[i];
        if (candidateId !== this.BlockID) {
          let candidateObj = GlobalData.optManager.GetObjectPtr(candidateId, false);
          let candidatePoly: any;
          let candidateRect: any;
          // If candidate is rotated, compute its polygon points.
          if (candidateObj.RotationAngle !== 0) {
            candidatePoly = candidateObj.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
            const candidateRotation = -candidateObj.RotationAngle / (180 / ConstantData.Geometry.PI);
            Utils3.RotatePointsAboutCenter(candidateObj.Frame, candidateRotation, candidatePoly);
            Utils2.GetPolyRect(polyRect, candidatePoly);
          } else {
            candidateRect = $.extend(true, {}, candidateObj.Frame);
            polyRect = candidateRect;
          }

          // Determine if the candidate is fully enclosed.
          let isInside = false;
          if (this.RotationAngle !== 0) {
            if (candidateObj.RotationAngle !== 0) {
              isInside = Utils2.IsAllPolyPointsInPoly(basePoly, candidatePoly);
            } else {
              isInside = Utils2.IsAllFrameCornersInPoly(basePoly, polyRect);
            }
          } else {
            if (candidateObj.RotationAngle !== 0) {
              isInside = Utils2.IsAllPolyPointsInPoly(basePoly, candidatePoly);
            } else {
              isInside = Utils2.RectInsideRect(baseRect, polyRect);
            }
          }
          if (isInside) {
            enclosedObjects.push(candidateId);
            if (candidateObj.hooks.length === 2) {
              containerCandidates.push(candidateId);
            }
            // If candidate is a container and we are recursing, then include its enclosed objects.
            if ((candidateObj.moreflags & containerFlag) && isRecursive) {
              const childList = candidateObj.GetListOfEnclosedObjects(true);
              if (childList.length) {
                enclosedObjects = enclosedObjects.concat(childList);
              }
            }
          }
        }
      }

      // Remove container candidates that do not meet full connection criteria.
      for (let i = 0; i < containerCandidates.length; i++) {
        const candidateObj = GlobalData.optManager.GetObjectPtr(containerCandidates[i], false);
        const hookId1 = candidateObj.hooks[0].objid;
        const hookId2 = candidateObj.hooks[1].objid;
        if ((enclosedObjects.indexOf(hookId1) < 0 || enclosedObjects.indexOf(hookId2) < 0) &&
          (enclosedObjects.indexOf(containerCandidates[i]) >= 0)) {
          const indexToRemove = enclosedObjects.indexOf(containerCandidates[i]);
          enclosedObjects.splice(indexToRemove, 1);
        }
      }

    }
    console.log("= S.BaseShape - GetListOfEnclosedObjects output:", enclosedObjects);
    return enclosedObjects;
  }

  PinProportional(actionRect: { x: number; y: number; width: number; height: number }): void {
    console.log("= S.BaseShape PinProportional - Input:", actionRect);

    // Define knob size from constants
    const knobSize = ConstantData.Defines.SED_KnobSize;
    let currentFrameRect: { x: number; y: number; width: number; height: number } = {} as any;

    // If the shape is rotated, compute the rotated bounding rectangle
    if (this.RotationAngle !== 0) {
      const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, true, null);
      const rotationRadians = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, polyPoints);
      Utils2.GetPolyRect(currentFrameRect, polyPoints);
    } else {
      currentFrameRect = this.Frame;
    }

    // Compute margins based on the current frame and the reference rectangle this.r
    const margins = {
      left: currentFrameRect.x - this.r.x + knobSize / 2,
      top: currentFrameRect.y - this.r.y + knobSize / 2,
      right: (this.r.x + this.r.width) - (currentFrameRect.x + currentFrameRect.width),
      bottom: (this.r.y + this.r.height) - (currentFrameRect.y + currentFrameRect.height)
    };

    // Adjust actionRect vertically if its y is less than the top margin.
    // Note: original code sets actionRect.y to margins.left; preserving as is.
    if (actionRect.y < margins.top) {
      const deltaY = margins.top - actionRect.y;
      const deltaWidth = deltaY * (GlobalData.optManager.theActionAspectRatioWidth / GlobalData.optManager.theActionAspectRatioHeight);
      actionRect.height -= deltaY;
      actionRect.width -= deltaWidth;
      actionRect.y = margins.left;
    }

    // Adjust actionRect horizontally if its x is less than the left margin.
    if (actionRect.x < margins.left) {
      const deltaX = margins.left - actionRect.x;
      const deltaHeight = deltaX * (GlobalData.optManager.theActionAspectRatioHeight / GlobalData.optManager.theActionAspectRatioWidth);
      actionRect.height -= deltaHeight;
      actionRect.width -= deltaX;
      actionRect.x = margins.left;
    }

    console.log("= S.BaseShape PinProportional - Output:", actionRect);
  }

  HandleActionTriggerDoAutoScroll() {
    GlobalData.optManager.autoScrollTimerID = GlobalData.optManager.autoScrollTimer.setTimeout('HandleActionTriggerDoAutoScroll', 100);
    var e = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(GlobalData.optManager.autoScrollXPos, GlobalData.optManager.autoScrollYPos);
    if (
      this.PinAction(e),
      e = GlobalData.optManager.DoAutoGrowDrag(e),
      GlobalData.docHandler.ScrollToPosition(e.x, e.y),
      GlobalData.optManager.theActionTriggerID != ConstantData.ActionTriggerType.ROTATE &&
      GlobalData.optManager.theRotateObjectRadians
    ) {
      var t,
        a = e.x,
        r = e.y,
        i = {},
        n = {},
        o = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theActionStoredObjectID, !1).Frame;
      i.x = a,
        i.y = r,
        n.x = o.x + o.width / 2,
        n.y = o.y + o.height / 2,
        a = (
          t = GlobalData.optManager.RotatePointAroundPoint(n, i, GlobalData.optManager.theRotateObjectRadians)
        ).x,
        r = t.y,
        e.x = a,
        e.y = r
    }
    this.HandleActionTriggerTrackCommon(e.x, e.y)
  }

  AutoScrollCommon(event, enableSnap, autoScrollCallback) {
    console.log("= S.BaseShape - AutoScrollCommon input:", { event, enableSnap, autoScrollCallback });

    let shouldAutoScroll = false;
    const overrideSnaps = GlobalData.optManager.OverrideSnaps(event);
    if (overrideSnaps) {
      enableSnap = false;
    }

    const clientX = event.gesture.center.clientX;
    const clientY = event.gesture.center.clientY;
    let scrollX = clientX;
    let scrollY = clientY;
    const docInfo = GlobalData.optManager.svgDoc.docInfo;

    if (clientX >= docInfo.dispX + docInfo.dispWidth - 4) {
      shouldAutoScroll = true;
      scrollX = docInfo.dispX + docInfo.dispWidth - 4 + 32;
    } else if (clientX < docInfo.dispX) {
      shouldAutoScroll = true;
      scrollX = docInfo.dispX - 32;
    }

    if (clientY >= docInfo.dispY + docInfo.dispHeight - 4) {
      shouldAutoScroll = true;
      scrollY = docInfo.dispY + docInfo.dispHeight - 4 + 32;
    } else if (clientY < docInfo.dispY) {
      shouldAutoScroll = true;
      scrollY = docInfo.dispY - 32;
    }

    if (shouldAutoScroll) {
      if (enableSnap && GlobalData.docHandler.documentConfig.enableSnap) {
        const snappedCoords = GlobalData.docHandler.SnapToGrid({ x: scrollX, y: scrollY });
        scrollX = snappedCoords.x;
        scrollY = snappedCoords.y;
      }

      GlobalData.optManager.autoScrollXPos = scrollX;
      GlobalData.optManager.autoScrollYPos = scrollY;

      if (GlobalData.optManager.autoScrollTimerID !== -1) {
        console.log("= S.BaseShape - AutoScrollCommon output: false (timer already set)");
        return false;
      }

      GlobalData.optManager.autoScrollTimer = new HvTimer(this);
      GlobalData.optManager.autoScrollTimerID = GlobalData.optManager.autoScrollTimer.setTimeout(autoScrollCallback, 0);
      console.log("= S.BaseShape - AutoScrollCommon output: false (timer started)");
      return false;
    }

    this.ResetAutoScrollTimer();
    console.log("= S.BaseShape - AutoScrollCommon output: true");
    return true;
  }

  PinAction(coords) {
    console.log("= S.BaseShape - PinAction input:", coords);

    const knobSize = ConstantData.Defines.SED_KnobSize;
    let frameRect = {};
    let rotatedRect = {};

    if (this.RotationAngle !== 0) {
      const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, true, null);
      const rotationRadians = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, polyPoints);
      Utils2.GetPolyRect(rotatedRect, polyPoints);
    } else {
      rotatedRect = this.Frame;
    }

    frameRect.left = rotatedRect.x - this.r.x + knobSize / 2;
    frameRect.top = rotatedRect.y - this.r.y + knobSize / 2;
    frameRect.right = this.r.x + this.r.width - (rotatedRect.x + rotatedRect.width) + knobSize / 2;
    frameRect.bottom = this.r.y + this.r.height - (rotatedRect.y + rotatedRect.height) + knobSize / 2;

    if (coords.x < frameRect.left) {
      coords.x = frameRect.left;
    }
    if (coords.y < frameRect.top) {
      coords.y = frameRect.top;
    }

    if (GlobalData.optManager.theContentHeader.flags & ConstantData.ContentHeaderFlags.CT_DA_NoAuto) {
      const sessionBlock = GlobalData.objectStore.GetObject(GlobalData.optManager.theSEDSessionBlockID).Data;
      if (coords.x > sessionBlock.dim.x - frameRect.right) {
        coords.x = sessionBlock.dim.x - frameRect.right;
      }
      if (coords.y > sessionBlock.dim.y - frameRect.bottom) {
        coords.y = sessionBlock.dim.y - frameRect.bottom;
      }
    }

    console.log("= S.BaseShape - PinAction output:", coords);
    return coords;
  }

  ActionApplySnaps(coords, triggerType) {
    console.log("= S.BaseShape - ActionApplySnaps input:", { coords, triggerType });

    let snapRect = this.GetSnapRect();
    let snapApplied = false;
    let snapGuides = [];
    let adjustedRect = {};
    let snapOffsets = { x: null, y: null };
    const actionTriggerType = ConstantData.ActionTriggerType;

    let dynamicGuides;

    const adjustBottom = (rect) => {
      adjustedRect.x = rect.x;
      adjustedRect.y = rect.y;
      adjustedRect.width = rect.width;
      adjustedRect.height = coords.y - rect.y;
      if (adjustedRect.height < 0) {
        adjustedRect.y = coords.y;
        adjustedRect.height = rect.y - coords.y;
        snapGuides.push('left_top', 'right_top');
      } else {
        snapGuides.push('left_bottom', 'right_bottom');
      }
      snapApplied = true;
    };

    const adjustTop = (rect) => {
      adjustedRect.x = rect.x;
      adjustedRect.y = coords.y;
      adjustedRect.width = rect.width;
      adjustedRect.height = rect.y + rect.height - coords.y;
      if (adjustedRect.height < 0) {
        adjustedRect.y = rect.y;
        adjustedRect.height = coords.y - rect.y;
        snapGuides.push('left_bottom', 'right_bottom');
      } else {
        snapGuides.push('left_top', 'right_top');
      }
      snapApplied = true;
    };

    const adjustRight = (rect) => {
      adjustedRect.y = rect.y;
      adjustedRect.x = coords.x;
      adjustedRect.height = rect.height;
      adjustedRect.width = rect.x + rect.width - coords.x;
      if (adjustedRect.width < 0) {
        adjustedRect.x = rect.x;
        adjustedRect.width = coords.x - rect.x;
        snapGuides.push('above_right', 'below_right');
      } else {
        snapGuides.push('above_left', 'below_left');
      }
      snapApplied = true;
    };

    const adjustLeft = (rect) => {
      adjustedRect.y = rect.y;
      adjustedRect.x = rect.x;
      adjustedRect.height = rect.height;
      adjustedRect.width = coords.x - rect.x;
      if (adjustedRect.width < 0) {
        adjustedRect.x = coords.x;
        adjustedRect.width = rect.x - coords.x;
        snapGuides.push('above_left', 'below_left');
      } else {
        snapGuides.push('above_right', 'below_right');
      }
      snapApplied = true;
    };

    if (GlobalData.optManager.AllowSnapToShapes()) {
      switch (triggerType) {
        case actionTriggerType.BOTTOMCENTER:
          adjustBottom(snapRect);
          break;
        case actionTriggerType.BOTTOMLEFT:
          adjustBottom(snapRect);
          adjustRight(Utils1.DeepCopy(adjustedRect));
          break;
        case actionTriggerType.BOTTOMRIGHT:
          adjustBottom(snapRect);
          adjustLeft(Utils1.DeepCopy(adjustedRect));
          break;
        case actionTriggerType.CENTERLEFT:
          adjustRight(snapRect);
          break;
        case actionTriggerType.CENTERRIGHT:
          adjustLeft(snapRect);
          break;
        case actionTriggerType.TOPCENTER:
          adjustTop(snapRect);
          break;
        case actionTriggerType.TOPRIGHT:
          adjustTop(snapRect);
          adjustLeft(Utils1.DeepCopy(adjustedRect));
          break;
        case actionTriggerType.TOPLEFT:
          adjustTop(snapRect);
          adjustRight(Utils1.DeepCopy(adjustedRect));
          break;
      }

      if (snapApplied) {
        dynamicGuides = new DynamicGuides();
        if (this.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
          snapOffsets = GlobalData.optManager.DynamicSnaps_GetSnapObjects(this.BlockID, adjustedRect, dynamicGuides, null, snapGuides);
          if (snapOffsets.x !== null) coords.x += snapOffsets.x;
          if (snapOffsets.y !== null) coords.y += snapOffsets.y;
        }
      }
    }

    if (GlobalData.docHandler.documentConfig.enableSnap) {
      const gridSnap = GlobalData.docHandler.SnapToGrid(coords);
      if (snapOffsets.x === null) coords.x = gridSnap.x;
      if (snapOffsets.y === null) coords.y = gridSnap.y;
    }

    console.log("= S.BaseShape - ActionApplySnaps output:", dynamicGuides);
    return dynamicGuides;
  }

  LM_ActionTrack(e) {
     if (
      Utils2.StopPropagationAndDefaults(e),
      - 1 == GlobalData.optManager.theActionStoredObjectID
    ) return !1;
    var t = null,
      a = ConstantData.ActionTriggerType;
    t = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theActionStoredObjectID, !1),
      GlobalData.optManager.theActionTriggerID != ConstantData.ActionTriggerType.ROTATE &&
      t.SetDimensionLinesVisibility(GlobalData.optManager.theActionSVGObject, !1);
    var r = t.Frame,
      i = (
        e.target,
        GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(e.gesture.center.clientX, e.gesture.center.clientY)
      );
    this.PinAction(i),
      i = GlobalData.optManager.DoAutoGrowDrag(i);
    var n = GlobalData.optManager.OverrideSnaps(e),
      o = !1;
    switch (GlobalData.optManager.theActionTriggerID) {
      case a.MODIFYSHAPE:
      case a.ROTATE:
        o = !0
    }
    if (!o && !n) var s = this.ActionApplySnaps(i, GlobalData.optManager.theActionTriggerID);
    var l = i.x,
      S = i.y,
      c = {},
      u = {},
      p = {};
    if (
      GlobalData.optManager.theActionTriggerID != ConstantData.ActionTriggerType.ROTATE &&
      GlobalData.optManager.theRotateObjectRadians &&
      (
        c.x = l,
        c.y = S,
        u.x = r.x + r.width / 2,
        u.y = r.y + r.height / 2,
        l = (
          p = GlobalData.optManager.RotatePointAroundPoint(u, c, GlobalData.optManager.theRotateObjectRadians)
        ).x,
        S = p.y,
        i.x = l,
        i.y = S
      ),
      this.AutoScrollCommon(e, !0, 'HandleActionTriggerDoAutoScroll') &&
      (
        i = this.LM_ActionDuringTrack(i),
        this.HandleActionTriggerTrackCommon(i.x, i.y, e),
        GlobalData.optManager.theActionTriggerID != ConstantData.ActionTriggerType.ROTATE &&
        t &&
        t.SetDimensionLinesVisibility(GlobalData.optManager.theActionSVGObject, !0),
        s
      )
    ) {
      var d = Utils1.DeepCopy(this.Frame);
      this.Frame = GlobalData.optManager.theActionNewBBox;
      var D = this.GetSnapRect();
      this.Frame = d,
        GlobalData.optManager.DynamicSnaps_UpdateGuides(s, this.BlockID, D)
    }
  }

  LM_ActionPreTrack(e, t) {
    // SDUI.Commands.MainController.Dropdowns.HideAllDropdowns(),
    // Doulbe === TODO
    this.rflags &&
      (
        this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, !1),
        this.rflags = Utils2.SetFlag(
          this.rflags,
          ConstantData.FloatingPointDim.SD_FP_Height,
          !1
        )
      )
  }

  LM_ActionDuringTrack(e) {
    return e
  }

  LM_ActionPostRelease(e) {
    var t = function () {
      if (
        GlobalData.optManager.currentModalOperation === Instance.Shape.ModalOperations.FORMATPAINTER
      ) {
        if (
          GlobalData.optManager.FormatPainterMode === Instance.Shape.FormatPainterModes.TABLE ||
          GlobalData.optManager.FormatPainterMode === Instance.Shape.FormatPainterModes.OBJECT
        ) {
          var e = GlobalData.optManager.Table_GetActiveID();
          GlobalData.optManager.Table_PasteFormat(e, GlobalData.optManager.FormatPainterStyle, !1)
        }
        !0 !== GlobalData.optManager.FormatPainterSticky &&
          GlobalData.optManager.SetFormatPainter(!0, !1)
      }
    };
    this.objecttype !== ConstantData.ObjectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER &&
      GlobalData.optManager.UpdateLinks(),
      GlobalData.optManager.LinkParams = null;
    var a = this.GetTable(!1);
    switch (
    GlobalData.optManager.SetEditMode(ConstantData.EditState.DEFAULT),
    GlobalData.optManager.theActionTriggerID
    ) {
      case ConstantData.ActionTriggerType.TABLE_ROW:
        GlobalData.optManager.theActionTable &&
          a &&
          GlobalData.optManager.theActionTable.ht != a.ht &&
          (this.sizedim.height = this.Frame.height),
          GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE),
          t();
        break;
      case ConstantData.ActionTriggerType.TABLE_COL:
        GlobalData.optManager.theActionTable &&
          a &&
          GlobalData.optManager.theActionTable.wd != a.wd &&
          (this.sizedim.width = this.Frame.width),
          GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE),
          t();
        break;
      case ConstantData.ActionTriggerType.TABLE_SELECT:
      case ConstantData.ActionTriggerType.TABLE_ROWSELECT:
      case ConstantData.ActionTriggerType.TABLE_COLSELECT:
        if (
          GlobalData.optManager.currentModalOperation === Instance.Shape.ModalOperations.FORMATPAINTER
        ) {
          if (
            GlobalData.optManager.FormatPainterMode === Instance.Shape.FormatPainterModes.TABLE ||
            GlobalData.optManager.FormatPainterMode === Instance.Shape.FormatPainterModes.OBJECT
          ) {
            var r = GlobalData.optManager.Table_GetActiveID();
            GlobalData.optManager.Table_PasteFormat(r, GlobalData.optManager.FormatPainterStyle, !1)
          }
          !0 !== GlobalData.optManager.FormatPainterSticky &&
            GlobalData.optManager.SetFormatPainter(!0, !1)
        }
        break;
      case ConstantData.ActionTriggerType.TABLE_EDIT:
        GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
        break;
      case ConstantData.ActionTriggerType.CENTERLEFT:
      case ConstantData.ActionTriggerType.CENTERRIGHT:
        this.sizedim.width = this.Frame.width;
        break;
      case ConstantData.ActionTriggerType.TOPCENTER:
      case ConstantData.ActionTriggerType.BOTTOMCENTER:
        this.sizedim.height = this.Frame.height,
          this.GetGanttInfo() &&
          GlobalData.optManager.GanttFormat(this.BlockID, !1, !1, !1, null);
        break;
      default:
        this.sizedim.width = this.Frame.width,
          this.sizedim.height = this.Frame.height,
          this.GetGanttInfo() &&
          GlobalData.optManager.GanttFormat(this.BlockID, !1, !1, !1, null)
    }
  }

  LM_SetupActionClick(e, t, a, r, i) {

    console.log('LM_SetupActionClick', e, t, a, r, i);

    GlobalData.optManager.theEventTimestamp = Date.now(),
      GlobalData.optManager.SetUIAdaptation(e);
    var n,
      o,
      s,
      l = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(e.gesture.center.clientX, e.gesture.center.clientY),
      S = (
        GlobalData.optManager.OverrideSnaps(e),
        (l = GlobalData.optManager.DoAutoGrowDrag(l)).x
      ),
      c = l.y;
    if (r) {
      n = a,
        o = r,
        s = i;
      var u = 0,
        p = !1;
      switch (
      obj = GlobalData.optManager.GetObjectPtr(a, !1),
      obj &&
      (
        (u = obj.RotationAngle) > 180 &&
        (u = 360 - u),
        u >= 90 &&
        (u = 180 - u),
        u > 45 &&
        (p = !0)
      ),
      r
      ) {
        case ConstantData.ActionTriggerType.TABLE_ROW:
          p ? GlobalData.optManager.SetEditMode(
            ConstantData.EditState.DRAGCONTROL,
            Element.CursorType.COL_RESIZE
          ) : GlobalData.optManager.SetEditMode(
            ConstantData.EditState.DRAGCONTROL,
            Element.CursorType.ROW_RESIZE
          );
          break;
        case ConstantData.ActionTriggerType.TABLE_COL:
          p ? GlobalData.optManager.SetEditMode(
            ConstantData.EditState.DRAGCONTROL,
            Element.CursorType.ROW_RESIZE
          ) : GlobalData.optManager.SetEditMode(
            ConstantData.EditState.DRAGCONTROL,
            Element.CursorType.COL_RESIZE
          )
      }
    } else {
      var d = GlobalData.optManager.svgOverlayLayer.FindElementByDOMElement(e.currentTarget);
      if (null === d) return !1;
      var D = d.GetID();
      n = parseInt(
        D.substring(ConstantData.Defines.Action.length, D.length),
        10
      );
      var g = d.GetTargetForEvent(e);
      if (null == g) return !1;
      o = g.GetID(),
        s = g.GetUserData(),
        GlobalData.optManager.SetControlDragMode(g)
    }
    GlobalData.optManager.theActionStoredObjectID = n;
    var h = GlobalData.optManager.GetObjectPtr(n, !0);
    GlobalData.optManager.theActionTriggerID = o,
      GlobalData.optManager.theActionTriggerData = s;
    var m = ConstantData.ActionTriggerType;
    switch (o) {
      case m.CONNECTOR_PERP:
      case m.CONNECTOR_ADJ:
      case m.CONNECTOR_HOOK:
      case m.LINESTART:
      case m.LINEEND:
        var C = function (e) {
          if (e.hooks.length) {
            var t = e.hooks[0].objid;
            return GlobalData.optManager.GetObjectPtr(t, !1)
          }
          return null
        }(this);
        return C &&
          (
            GlobalData.optManager.theActionStoredObjectID = C.BlockID,
            this.Connector_LM_ActionClick(e, !0)
          ),
          !1
    }
    o === ConstantData.ActionTriggerType.MOVEPOLYSEG &&
      (
        GlobalData.optManager.theActionTriggerData = {
          hitSegment: s,
          moveAngle: 9999
        }
      ),
      GlobalData.optManager.theActionSVGObject = GlobalData.optManager.svgObjectLayer.GetElementByID(n),
      h.SetDimensionLinesVisibility(GlobalData.optManager.theActionSVGObject, !1),
      this.LM_ActionPreTrack(n, o),
      (
        '' !== this.HyperlinkText ||
        - 1 != this.NoteID ||
        this.HasFieldData()
      ) &&
      this.HideAllIcons(GlobalData.optManager.svgDoc, GlobalData.optManager.theActionSVGObject),
      GlobalData.optManager.theActionLockAspectRatio = e.gesture.srcEvent.shiftKey,
      this.ResizeAspectConstrain &&
      (
        GlobalData.optManager.theActionLockAspectRatio = !GlobalData.optManager.theActionLockAspectRatio
      );
    var y = h.Frame;
    GlobalData.optManager.theActionLockAspectRatio &&
      (
        0 === y.height ? GlobalData.optManager.theActionLockAspectRatio = !1 : (
          GlobalData.optManager.theActionAspectRatioWidth = y.width,
          GlobalData.optManager.theActionAspectRatioHeight = y.height
        )
      ),
      GlobalData.optManager.theActionBBox = $.extend(!0, {
      }, y),
      GlobalData.optManager.theActionNewBBox = $.extend(!0, {
      }, y);
    var f = this.GetTable(!1);
    f &&
      (GlobalData.optManager.theActionTable = Utils1.DeepCopy(f)),
      GlobalData.optManager.HideOverlayLayer();
    var L = {},
      I = {},
      T = {};
    if (
      GlobalData.optManager.theRotateObjectRadians = - this.RotationAngle / (180 / ConstantData.Geometry.PI),
      GlobalData.optManager.theActionTriggerID == ConstantData.ActionTriggerType.CONTAINER_ADJ
    ) {
      L.x = S,
        L.y = c,
        GlobalData.optManager.theActionStartX = L.x,
        GlobalData.optManager.theActionStartY = L.y;
      var b = this.Pr_GetAdjustShapeList();
      if (!b) return !1;
      GlobalData.optManager.theMoveList = b.list,
        GlobalData.optManager.theDragElementList = b.svglist,
        GlobalData.optManager.theDragBBoxList = b.framelist,
        GlobalData.optManager.theActionTableLastY = 0,
        GlobalData.optManager.theActionOldExtra = b.oldextra,
        GlobalData.optManager.theActionContainerArrangement = b.arrangement
    } else GlobalData.optManager.theActionTriggerID == ConstantData.ActionTriggerType.ROTATE ? (
      GlobalData.optManager.theRotateKnobCenterDivisor = this.RotateKnobCenterDivisor(),
      GlobalData.optManager.theRotateStartRotation = this.RotationAngle,
      GlobalData.optManager.theRotateEndRotation = GlobalData.optManager.theRotateStartRotation,
      GlobalData.optManager.theRotatePivotX = y.x + y.width / GlobalData.optManager.theRotateKnobCenterDivisor.x,
      GlobalData.optManager.theRotatePivotY = y.y + y.height / GlobalData.optManager.theRotateKnobCenterDivisor.y,
      GlobalData.optManager.theActionStartX = S,
      GlobalData.optManager.theActionStartY = c
    ) : (
      L.x = S,
      L.y = c,
      I.x = y.x + y.width / 2,
      I.y = y.y + y.height / 2,
      T = GlobalData.optManager.RotatePointAroundPoint(I, L, GlobalData.optManager.theRotateObjectRadians),
      GlobalData.optManager.theActionStartX = T.x,
      GlobalData.optManager.theActionStartY = T.y,
      GlobalData.optManager.theActionTableLastX = T.x,
      GlobalData.optManager.theActionTableLastY = T.y
    );
    return !0
  }

  Connector_LM_ActionClick(event: any, triggerElement: any) {
    console.log("= S.BaseShape - Connector_LM_ActionClick input:", { event, triggerElement });
    // Call the base line action click handler using the provided event parameters
    this.BaseLine_LM_ActionClick(event, triggerElement);
    console.log("= S.BaseShape - Connector_LM_ActionClick output");
  }

  BaseLine_LM_ActionClick(event, triggerElement) {
    console.log("= S.BaseShape - BaseLine_LM_ActionClick input:", { event, triggerElement });
    try {
      const blockID = this.BlockID;
      const baseObject = GlobalData.optManager.GetObjectPtr(blockID, false);

      // Validate that the base object is a valid drawing object
      if (!(baseObject && baseObject instanceof BaseDrawingObject)) {
        console.log("= S.BaseShape - BaseLine_LM_ActionClick output: base object not valid");
        return false;
      }

      // Initialize auto grow drag for this block
      GlobalData.optManager.InitializeAutoGrowDrag(0, this.BlockID);

      // Setup action click, if this fails, abort the process
      if (!this.LM_SetupActionClick(event, triggerElement)) {
        console.log("= S.BaseShape - BaseLine_LM_ActionClick output: LM_SetupActionClick failed");
        return;
      }

      // Collab.BeginSecondaryEdit();
      const currentObject = GlobalData.optManager.GetObjectPtr(this.BlockID, false);

      GlobalData.optManager.WorkAreaHammer.on(
        "drag",
        DefaultEvt.Evt_ActionTrackHandlerFactory(currentObject)
      );

      GlobalData.optManager.WorkAreaHammer.on(
        "dragend",
        DefaultEvt.Evt_ActionReleaseHandlerFactory(currentObject)
      );

      console.log("= S.BaseShape - BaseLine_LM_ActionClick output: completed successfully");
    } catch (error) {
      this.LM_ActionClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }
  }

  LM_ActionClick_ExceptionCleanup(error: any): void {
    console.log("= S.BaseShape - LM_ActionClick_ExceptionCleanup input:", error);

    GlobalData.optManager.UnbindActionClickHammerEvents();
    this.ResetAutoScrollTimer();
    GlobalData.optManager.ob = {};
    GlobalData.optManager.LinkParams = null;
    GlobalData.optManager.theActionTriggerID = -1;
    GlobalData.optManager.theActionTriggerData = null;
    GlobalData.optManager.theActionStoredObjectID = -1;
    GlobalData.optManager.theActionSVGObject = null;
    GlobalData.optManager.HideOverlayLayer();

    console.log("= S.BaseShape - LM_ActionClick_ExceptionCleanup output: cleanup complete");
  }

  LM_ActionClick(event, triggerElement, additionalId, autoGrowParam, extraParam) {
    console.log("= S.BaseShape - LM_ActionClick input:", { event, triggerElement, additionalId, autoGrowParam, extraParam });
    Utils2.StopPropagationAndDefaults(event);
    try {
      const blockId = this.BlockID;
      const drawingObject = GlobalData.optManager.GetObjectPtr(blockId, false);
      if (!(drawingObject && drawingObject instanceof BaseDrawingObject)) {
        console.log("= S.BaseShape - LM_ActionClick output: Invalid drawing object");
        return false;
      }
      GlobalData.optManager.InitializeAutoGrowDrag(autoGrowParam);
      if (!this.LM_SetupActionClick(event, triggerElement, additionalId, autoGrowParam, extraParam)) {
        console.log("= S.BaseShape - LM_ActionClick output: LM_SetupActionClick failed");
        return;
      }
      // Collab.BeginSecondaryEdit();
      const currentObject = GlobalData.optManager.GetObjectPtr(this.BlockID, false);
      GlobalData.optManager.WorkAreaHammer.on('drag', DefaultEvt.Evt_ActionTrackHandlerFactory(currentObject));
      GlobalData.optManager.WorkAreaHammer.on('dragend', DefaultEvt.Evt_ActionReleaseHandlerFactory(currentObject));
      console.log("= S.BaseShape - LM_ActionClick output: completed successfully");
    } catch (error) {
      this.LM_ActionClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }
  }

  StartNewObjectDrawTrackCommon(currentX: number, currentY: number, event: any) {
    console.log("= S.BaseShape - StartNewObjectDrawTrackCommon input:", { currentX, currentY, event });

    // Calculate differences from the starting action point
    let deltaX = currentX - GlobalData.optManager.theActionStartX;
    let deltaY = currentY - GlobalData.optManager.theActionStartY;

    // Calculate new bounding box by copying the current action bounding box
    let newBBox = $.extend(true, {}, GlobalData.optManager.theActionBBox);
    // (The sqrt is computed but not used; kept for potential side-effect)
    Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Update dimensions by adding deltaX and deltaY
    newBBox.width = newBBox.width + deltaX;
    newBBox.height = newBBox.height + deltaY;

    // Calculate the snap point (bottom-right corner of the new bounding box)
    let snapPoint = {
      x: newBBox.x + newBBox.width,
      y: newBBox.y + newBBox.height
    };

    // Check if snapping is enabled and not overridden by the event
    let overrideSnap = GlobalData.optManager.OverrideSnaps(event);
    if (GlobalData.docHandler.documentConfig.enableSnap && !overrideSnap) {
      snapPoint = GlobalData.docHandler.SnapToGrid(snapPoint);
      newBBox.width = snapPoint.x - newBBox.x;
      newBBox.height = snapPoint.y - newBBox.y;
    }

    // Handle negative dimensions by adjusting x, y and taking the absolute value
    if (newBBox.width < 0) {
      newBBox.x = currentX;
      newBBox.width = -newBBox.width;
    }
    if (newBBox.height < 0) {
      newBBox.y = currentY;
      newBBox.height = -newBBox.height;
    }

    // Set the updated bounding box as the action's new bounding box
    GlobalData.optManager.theActionNewBBox = $.extend(true, {}, newBBox);

    // Update the shape's frame using the new bounding box and resize the SVG object
    this.UpdateFrame(GlobalData.optManager.theActionNewBBox);
    this.Resize(GlobalData.optManager.theActionSVGObject, newBBox, this);

    console.log("= S.BaseShape - StartNewObjectDrawTrackCommon output:", GlobalData.optManager.theActionNewBBox);
  }

  StartNewObjectDrawDoAutoScroll() {
    console.log("= S.BaseShape - StartNewObjectDrawDoAutoScroll input");

    GlobalData.optManager.autoScrollTimerID = GlobalData.optManager.autoScrollTimer.setTimeout(
      'StartNewObjectDrawDoAutoScroll', 100
    );

    let docCoordinates = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
      GlobalData.optManager.autoScrollXPos,
      GlobalData.optManager.autoScrollYPos
    );

    docCoordinates = GlobalData.optManager.DoAutoGrowDrag(docCoordinates);

    GlobalData.docHandler.ScrollToPosition(docCoordinates.x, docCoordinates.y);

    this.StartNewObjectDrawTrackCommon(docCoordinates.x, docCoordinates.y, null);

    console.log("= S.BaseShape - StartNewObjectDrawDoAutoScroll output:", docCoordinates);
  }

  LM_DrawTrack(mouseEvent) {
    console.log("= S.BaseShape - LM_DrawTrack input:", mouseEvent);

    // If no action stored object exists, exit early
    if (GlobalData.optManager.theActionStoredObjectID === -1) {
      console.log("= S.BaseShape - LM_DrawTrack output: No action stored object, returning false");
      return false;
    }

    // Convert window coordinates to document coordinates using the event
    let docCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
      mouseEvent.gesture.center.clientX,
      mouseEvent.gesture.center.clientY
    );

    // Check if snapping is overridden
    let overrideSnap = GlobalData.optManager.OverrideSnaps(mouseEvent);

    // Snap to grid if enabled and not overridden
    if (GlobalData.docHandler.documentConfig.enableSnap && !overrideSnap) {
      docCoords = GlobalData.docHandler.SnapToGrid(docCoords);
    }

    // Apply auto grow drag adjustments and extract x and y positions
    docCoords = GlobalData.optManager.DoAutoGrowDrag(docCoords);
    let posX = docCoords.x;
    let posY = docCoords.y;

    // If auto scroll is triggered, perform drawing tracking updates
    if (this.AutoScrollCommon(mouseEvent, true, 'StartNewObjectDrawDoAutoScroll')) {
      this.LM_DrawDuringTrack(posX, posY);
      this.StartNewObjectDrawTrackCommon(posX, posY, mouseEvent);
    }

    console.log("= S.BaseShape - LM_DrawTrack output:", { posX, posY });
  }

  LM_DrawRelease(eventObject: any) {
    console.log("= S.BaseShape - LM_DrawRelease input:", eventObject);

    // Unbind any active click/drag events and reset auto-scroll timer
    GlobalData.optManager.UnbindActionClickHammerEvents();
    this.ResetAutoScrollTimer();

    // Create a new bounding box object using the current new bounding box from the manager
    const newBoundingBox = {
      x: GlobalData.optManager.theActionNewBBox.x,
      y: GlobalData.optManager.theActionNewBBox.y,
      width: GlobalData.optManager.theActionNewBBox.width,
      height: GlobalData.optManager.theActionNewBBox.height,
    };

    // Update the object frame with the new bounding box
    GlobalData.optManager.SetObjectFrame(GlobalData.optManager.theActionStoredObjectID, newBoundingBox);

    // Call post-release logic for drawing
    this.LM_DrawPostRelease(GlobalData.optManager.theActionStoredObjectID);

    // Build collaboration message and post object draw event
    const collaborationData = {};
    GlobalData.optManager.BuildCreateMessage(collaborationData, true);
    GlobalData.optManager.PostObjectDraw();

    console.log("= S.BaseShape - LM_DrawRelease output:", { newBoundingBox, collaborationData });
  }

  LM_DrawPreTrack(): boolean {
    console.log("= S.BaseShape - LM_DrawPreTrack - Input:");
    const result = true;
    console.log("= S.BaseShape - LM_DrawPreTrack - Output:", result);
    return result;
  }

  LM_DrawDuringTrack(posX: number, posY: number) {
    console.log("= S.BaseShape - LM_DrawDuringTrack input:", { posX, posY });
    const resultCoordinates = { x: posX, y: posY };
    console.log("= S.BaseShape - LM_DrawDuringTrack output:", resultCoordinates);
    return resultCoordinates;
  }

  LM_DrawPostRelease() {
  }

  LM_DrawClick_ExceptionCleanup(exception: any) {
    console.log("= S.BaseShape - LM_DrawClick_ExceptionCleanup input:", exception);
    GlobalData.optManager.UnbindActionClickHammerEvents();
    this.ResetAutoScrollTimer();
    GlobalData.optManager.LinkParams = null;
    GlobalData.optManager.theActionStoredObjectID = -1;
    GlobalData.optManager.theActionSVGObject = null;
    GlobalData.optManager.WorkAreaHammer.on('dragstart', DefaultEvt.Evt_WorkAreaHammerDragStart);
    console.log("= S.BaseShape - LM_DrawClick_ExceptionCleanup output: cleanup complete");
  }

  LM_DrawClick(initialX: number, initialY: number) {
    console.log("= S.BaseShape - LM_DrawClick input:", { initialX, initialY });

    try {
      // Set the starting coordinates for the drawing object
      this.Frame.x = initialX;
      this.Frame.y = initialY;
      // Save a deep copy of the current frame as previous bounding box
      this.prevBBox = $.extend(true, {}, this.Frame);

      // Attach draggable event handlers for drawing tracking and release
      GlobalData.optManager.WorkAreaHammer.on('drag', DefaultEvt.Evt_DrawTrackHandlerFactory(this));
      GlobalData.optManager.WorkAreaHammer.on('dragend', DefaultEvt.Evt_DrawReleaseHandlerFactory(this));

      console.log("= S.BaseShape - LM_DrawClick output:", { Frame: this.Frame, prevBBox: this.prevBBox });
    } catch (error) {
      this.LM_DrawClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }
  }

  RotateKnobCenterDivisor(): { x: number; y: number } {
    console.log("= S.BaseShape - RotateKnobCenterDivisor input: no parameters");

    const knobCenterDivisor = {
      x: 2,
      y: 2,
    };

    console.log("= S.BaseShape - RotateKnobCenterDivisor output:", knobCenterDivisor);
    return knobCenterDivisor;
  }

  OffsetShape(offsetX: number, offsetY: number, childShapes: any[], linkFlags: any) {
    console.log("= S.BaseShape - OffsetShape input:", { offsetX, offsetY, childShapes, linkFlags });

    if (this.moreflags & ConstantData.ObjMoreFlags.SED_MF_Container && childShapes) {
      for (let i = 0; i < childShapes.length; i++) {
        const childShapeId = childShapes[i];
        const childShape = GlobalData.optManager.GetObjectPtr(childShapeId, true);
        if (childShape) {
          const childLinkFlag = linkFlags ? linkFlags[childShape.BlockID] : null;
          childShape.OffsetShape(offsetX, offsetY, childLinkFlag);
          GlobalData.optManager.SetLinkFlag(childShapeId, ConstantData.LinkFlags.SED_L_MOVE);
          GlobalData.optManager.AddToDirtyList(childShapeId);
        }
      }
    }

    this.Frame.x += offsetX;
    this.Frame.y += offsetY;
    this.r.x += offsetX;
    this.r.y += offsetY;
    this.inside.x += offsetX;
    this.inside.y += offsetY;
    this.trect.x += offsetX;
    this.trect.y += offsetY;

    if (this.GetGraph(true)) {
      GlobalData.optManager.GraphShift(this, offsetX, offsetY);
    }

    console.log("= S.BaseShape - OffsetShape output:", { Frame: this.Frame, r: this.r, inside: this.inside, trect: this.trect });
  }

  SetShapeOrigin(newX: number, newY: number, childShapes: any[]) {
    console.log("= S.BaseShape - SetShapeOrigin input:", { newX, newY, childShapes });

    let offsetX = 0;
    let offsetY = 0;

    if (newX != null) {
      offsetX = newX - this.Frame.x;
    }

    if (newY != null) {
      offsetY = newY - this.Frame.y;
    }

    this.OffsetShape(offsetX, offsetY, childShapes);

    console.log("= S.BaseShape - SetShapeOrigin output:", { offsetX, offsetY });
  }

  SetShapeIndent(applyIndents: boolean) {
    console.log("= S.BaseShape - SetShapeIndent input:", { applyIndents });

    let width = this.inside.width;
    let height = this.inside.height;
    let leftRatio = 1;
    let topRatio = 1;
    let rightRatio = 1;
    let bottomRatio = 1;

    if (applyIndents) {
      leftRatio = 1 - (this.left_sindent + this.right_sindent);
      topRatio = 1 - (this.bottom_sindent + this.top_sindent);
      rightRatio = 1 - (this.left_sindent + this.right_sindent);
      bottomRatio = 1 - (this.bottom_sindent + this.top_sindent);
    }

    this.tindent.left = this.left_sindent * width / leftRatio;
    this.tindent.top = this.top_sindent * height / topRatio;
    this.tindent.right = this.right_sindent * width / rightRatio;
    this.tindent.bottom = this.bottom_sindent * height / bottomRatio;

    console.log("= S.BaseShape - SetShapeIndent output:", this.tindent);
  }

  UpdateFrame(newFrame) {
    console.log("= S.BaseShape - UpdateFrame input:", newFrame);

    let lineThickness = 0;
    let halfLineThickness = 0;

    if (newFrame) {
      super.UpdateFrame(newFrame);
    }

    Utils2.CopyRect(this.r, this.Frame);

    if (this.StyleRecord) {
      if (this.objecttype !== ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
        this.StyleRecord.Line.BThick = 0;
      }

      if (this.StyleRecord.Line.BThick) {
        if (this.polylist == null) {
          lineThickness = 0;
        } else {
          halfLineThickness = this.StyleRecord.Line.Thickness / 2;
        }
      } else {
        halfLineThickness = lineThickness = this.StyleRecord.Line.Thickness / 2;
      }

      this.CalcEffectSettings(this.Frame, this.StyleRecord, false);
    }

    GlobalData.optManager.SetShapeR(this);

    Utils2.CopyRect(this.inside, this.Frame);
    Utils2.InflateRect(this.inside, -lineThickness, -lineThickness);

    Utils2.CopyRect(this.trect, this.Frame);
    Utils2.InflateRect(this.trect, -halfLineThickness, -halfLineThickness);

    this.SetShapeIndent(false);

    Utils2.SubRect(this.trect, this.tindent);

    if (this.GetTable(false) == null) {
      Utils2.SubRect(this.trect, this.TMargins);
    }

    console.log("= S.BaseShape - UpdateFrame output:", {
      r: this.r,
      inside: this.inside,
      trect: this.trect,
      Frame: this.Frame
    });
  }

  GetSVGFrame(frame = this.Frame) {
    console.log("= S.BaseShape - GetSVGFrame input:", frame);

    const svgFrame = {};
    Utils2.CopyRect(svgFrame, frame);

    if (this.StyleRecord.Line.BThick && this.polylist == null) {
      Utils2.InflateRect(svgFrame, this.StyleRecord.Line.BThick, this.StyleRecord.Line.BThick);
    }

    console.log("= S.BaseShape - GetSVGFrame output:", svgFrame);
    return svgFrame;
  }

  GetSnapRect() {
    console.log("= S.BaseShape - GetSnapRect input");

    const snapRect = {};

    if (this.RotationAngle !== 0) {
      const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, true, null);
      const rotationRadians = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, polyPoints);
      Utils2.GetPolyRect(snapRect, polyPoints);
    } else {
      Utils2.CopyRect(snapRect, this.Frame);
    }

    console.log("= S.BaseShape - GetSnapRect output:", snapRect);
    return snapRect;
  }

  CanSnapToShapes() {
    console.log("= S.BaseShape - CanSnapToShapes input");

    const objectTypes = ConstantData.ObjectTypes;
    let result;

    switch (this.objecttype) {
      case objectTypes.SD_OBJT_SWIMLANE_ROWS:
      case objectTypes.SD_OBJT_SWIMLANE_COLS:
      case objectTypes.SD_OBJT_SWIMLANE_GRID:
      case objectTypes.SD_OBJT_BPMN_POOL:
      case objectTypes.SD_OBJT_SHAPECONTAINER:
      case objectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER:
        result = -1;
        break;
      default:
        result = this.BlockID;
    }

    console.log("= S.BaseShape - CanSnapToShapes output:", result);
    return result;
  }

  IsSnapTarget() {
    console.log("= S.BaseShape - IsSnapTarget input");

    const objectTypes = ConstantData.ObjectTypes;
    let result;

    switch (this.objecttype) {
      case objectTypes.SD_OBJT_SWIMLANE_ROWS:
      case objectTypes.SD_OBJT_SWIMLANE_COLS:
      case objectTypes.SD_OBJT_SWIMLANE_GRID:
      case objectTypes.SD_OBJT_BPMN_POOL:
      case objectTypes.SD_OBJT_SHAPECONTAINER:
      case objectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER:
        result = false;
        break;
      default:
        result = !this.hooks.length && !(GlobalData.optManager.FindChildArray(this.BlockID, -1) >= 0);
    }

    console.log("= S.BaseShape - IsSnapTarget output:", result);
    return result;
  }

  GetAlignRect() {
    console.log("= S.BaseShape - GetAlignRect input");

    const alignRect = $.extend(true, {}, this.Frame);

    if (this.RotationAngle !== 0) {
      const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, true, null);
      const rotationRadians = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, polyPoints);
      Utils2.GetPolyRect(alignRect, polyPoints);
    }

    console.log("= S.BaseShape - GetAlignRect output:", alignRect);
    return alignRect;
  }

  GetCustomConnectPointsDirection(direction: number) {
    console.log("= S.BaseShape - GetCustomConnectPointsDirection input:", { direction });

    let closestIndex = -1;
    let closestDistance: number | null = null;
    let currentDistance: number;
    let connectPoints = this.flags & ConstantData.ObjFlags.SEDO_UseConnect && this.ConnectPoints;
    let targetPoints = this.GetTargetPoints(
      null,
      ConstantData.HookFlags.SED_LC_NoSnaps | ConstantData.HookFlags.SED_LC_ForceEnd,
      null
    );
    let topCount = 1, bottomCount = 1, leftCount = 1, rightCount = 1;
    const dimension = ConstantData.Defines.SED_CDim;
    let isSinglePoint = false;
    const ActionArrow = ConstantData.ActionArrow;
    let boundingRect = { x: 0, y: 0, width: dimension, height: dimension };

    if (this.RotationAngle) {
      const rotationRadians = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(boundingRect, rotationRadians, targetPoints);
    }

    const updateClosestIndex = (coordinate: number, index: number) => {
      if (closestDistance === null) {
        closestIndex = index;
        closestDistance = Math.abs(coordinate - dimension / 2);
      } else {
        currentDistance = Math.abs(coordinate - dimension / 2);
        if (currentDistance < closestDistance) {
          closestIndex = index;
          closestDistance = currentDistance;
        }
      }
    };

    if (targetPoints.length < 2) {
      isSinglePoint = true;
    }

    if (connectPoints) {
      topCount = bottomCount = leftCount = rightCount = 0;
      boundingRect = new Rectangle(0, 0, 0, 0);
      const pointCount = targetPoints.length;
      Utils2.GetPolyRect(boundingRect, targetPoints);

      for (let i = 0; i < pointCount; i++) {
        targetPoints[i].x -= boundingRect.x;
        targetPoints[i].y -= boundingRect.y;
      }

      if (boundingRect.width < 1000) {
        Utils2.InflateRect(boundingRect, 1000, 0);
      }
      if (boundingRect.height < 1000) {
        Utils2.InflateRect(boundingRect, 0, 1000);
      }

      if (boundingRect.height > boundingRect.width) {
        for (let i = 0; i < pointCount; i++) {
          if (targetPoints[i].y < boundingRect.height / 6) {
            topCount++;
            if (direction === ActionArrow.UP) updateClosestIndex(targetPoints[i].x, i);
          } else if (targetPoints[i].y >= 5 * boundingRect.height / 6) {
            bottomCount++;
            if (direction === ActionArrow.DOWN) updateClosestIndex(targetPoints[i].x, i);
          } else if (targetPoints[i].x < boundingRect.width / 6) {
            leftCount++;
            if (direction === ActionArrow.LEFT) updateClosestIndex(targetPoints[i].y, i);
          } else if (targetPoints[i].x >= 5 * boundingRect.width / 6) {
            rightCount++;
            if (direction === ActionArrow.RIGHT) updateClosestIndex(targetPoints[i].y, i);
          }
        }
      } else {
        for (let i = 0; i < pointCount; i++) {
          if (targetPoints[i].x < boundingRect.width / 6) {
            leftCount++;
            if (direction === ActionArrow.LEFT) updateClosestIndex(targetPoints[i].y, i);
          } else if (targetPoints[i].x >= 5 * boundingRect.width / 6) {
            rightCount++;
            if (direction === ActionArrow.RIGHT) updateClosestIndex(targetPoints[i].y, i);
          } else if (targetPoints[i].y < boundingRect.height / 6) {
            topCount++;
            if (direction === ActionArrow.UP) updateClosestIndex(targetPoints[i].x, i);
          } else if (targetPoints[i].y >= 5 * boundingRect.height / 6) {
            bottomCount++;
            if (direction === ActionArrow.DOWN) updateClosestIndex(targetPoints[i].x, i);
          }
        }
      }
    }

    const result = {
      left: leftCount,
      right: rightCount,
      top: topCount,
      bottom: bottomCount,
      index: closestIndex
    };

    console.log("= S.BaseShape - GetCustomConnectPointsDirection output:", result);
    return result;
  }

  AdjustAutoInsertShape(event, isVertical, isRotated) {
    console.log("= S.BaseShape - AdjustAutoInsertShape input:", { event, isVertical, isRotated });

    let connectPoints = this.flags & ConstantData.ObjFlags.SEDO_UseConnect && this.ConnectPoints;
    let topCount = 0, bottomCount = 0, leftCount = 0, rightCount = 0;
    let singlePoint = false;
    let targetPoints = this.GetTargetPoints(null, ConstantData.HookFlags.SED_LC_NoSnaps | ConstantData.HookFlags.SED_LC_ForceEnd, null);
    let isSinglePoint = targetPoints.length < 2;
    let shouldRotate = false;
    let blockIDs = [this.BlockID];

    if (isSinglePoint) {
      GlobalData.optManager.LinkParams && (GlobalData.optManager.LinkParams.AutoSinglePoint = true);
      singlePoint = true;
    } else {
      GlobalData.optManager.LinkParams && (GlobalData.optManager.LinkParams.AutoSinglePoint = false);
      singlePoint = false;
    }

    if (connectPoints) {
      let boundingRect = new Rectangle(0, 0, 0, 0);
      let pointCount = targetPoints.length;
      Utils2.GetPolyRect(boundingRect, targetPoints);

      for (let i = 0; i < pointCount; i++) {
        targetPoints[i].x -= boundingRect.x;
        targetPoints[i].y -= boundingRect.y;
      }

      if (boundingRect.width < 1000) {
        Utils2.InflateRect(boundingRect, 1000, 0);
      }
      if (boundingRect.height < 1000) {
        Utils2.InflateRect(boundingRect, 0, 1000);
      }

      if (boundingRect.height > boundingRect.width) {
        for (let i = 0; i < pointCount; i++) {
          if (targetPoints[i].y < boundingRect.height / 6) {
            topCount++;
          } else if (targetPoints[i].y >= 5 * boundingRect.height / 6) {
            bottomCount++;
          } else if (targetPoints[i].x < boundingRect.width / 6) {
            leftCount++;
          } else if (targetPoints[i].x >= 5 * boundingRect.width / 6) {
            rightCount++;
          }
        }
        if (leftCount === 0 && rightCount === 0 && topCount && bottomCount) {
          shouldRotate = true;
        } else if (leftCount === 0 && rightCount === 0 && singlePoint && (topCount || bottomCount)) {
          shouldRotate = true;
        }
      } else {
        for (let i = 0; i < pointCount; i++) {
          if (targetPoints[i].x < boundingRect.width / 6) {
            leftCount++;
          } else if (targetPoints[i].x >= 5 * boundingRect.width / 6) {
            rightCount++;
          } else if (targetPoints[i].y < boundingRect.height / 6) {
            topCount++;
          } else if (targetPoints[i].y >= 5 * boundingRect.height / 6) {
            bottomCount++;
          }
        }
        if (topCount === 0 && bottomCount === 0 && leftCount && rightCount) {
          shouldRotate = true;
        } else if (topCount === 0 && bottomCount === 0 && singlePoint && (leftCount || rightCount)) {
          shouldRotate = true;
        }
      }

      if (!singlePoint) {
        if (shouldRotate) {
          if (isVertical) {
            if (this.RotationAngle !== 0 && this.RotationAngle !== 180) {
              if (!isRotated) {
                GlobalData.optManager.RotateShapes(0, blockIDs);
                let svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
                svgElement && this.Rotate(svgElement, 0);
              }
              shouldRotate = true;
            }
          } else if (this.RotationAngle !== -90 && this.RotationAngle !== 90) {
            if (!isRotated) {
              GlobalData.optManager.RotateShapes(-90, blockIDs);
              let svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
              svgElement && this.Rotate(svgElement, -90);
            }
            shouldRotate = true;
          }
        } else if (isVertical) {
          if (this.RotationAngle !== -90 && this.RotationAngle !== 90) {
            if (!isRotated) {
              GlobalData.optManager.RotateShapes(-90, blockIDs);
              let svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
              svgElement && this.Rotate(svgElement, -90);
            }
            shouldRotate = true;
          }
        } else if (this.RotationAngle !== 0 && this.RotationAngle !== 180) {
          if (!isRotated) {
            GlobalData.optManager.RotateShapes(0, blockIDs);
            let svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
            svgElement && this.Rotate(svgElement, 0);
          }
          shouldRotate = true;
        }
      }
    }

    console.log("= S.BaseShape - AdjustAutoInsertShape output:", shouldRotate);
    return shouldRotate;
  }

  TRectToFrame(rect: any, maintainSize: boolean) {
    console.log("= S.BaseShape - TRectToFrame input:", { rect, maintainSize });

    let lineThickness = 0;
    let halfLineThickness = 0;
    let widthAdjustment = 0;
    let heightAdjustment = 0;

    if (this.StyleRecord.Line.BThick && this.polylist == null) {
      lineThickness = this.StyleRecord.Line.Thickness;
      halfLineThickness = 0;
    } else {
      halfLineThickness = this.StyleRecord.Line.Thickness / 2;
    }

    this.trect = Utils1.DeepCopy(rect);
    const originalFrame = Utils1.DeepCopy(this.Frame);
    this.inside = new Rectangle(rect.x, rect.y, rect.width, rect.height);

    if (this.GetTable(false) == null) {
      Utils2.Add2Rect(this.inside, this.TMargins);
    }

    this.SetShapeIndent(true);
    Utils2.Add2Rect(this.inside, this.tindent);
    this.Frame = Utils1.DeepCopy(this.inside);
    Utils2.InflateRect(this.Frame, halfLineThickness, halfLineThickness);

    if (!maintainSize) {
      if (this.Frame.width < this.sizedim.width) {
        widthAdjustment = this.sizedim.width - this.Frame.width;
        this.Frame.x = originalFrame.x;
      }
      if (this.Frame.height < this.sizedim.height) {
        heightAdjustment = this.sizedim.height - this.Frame.height;
        this.Frame.y = originalFrame.y;
      }
    }

    if (widthAdjustment > 0 || heightAdjustment > 0) {
      const adjustedFrame = Utils1.DeepCopy(this.Frame);
      adjustedFrame.width += widthAdjustment;
      adjustedFrame.height += heightAdjustment;
      this.UpdateFrame(adjustedFrame);
    } else {
      Utils2.CopyRect(this.r, this.Frame);
      GlobalData.optManager.SetShapeR(this);
    }

    console.log("= S.BaseShape - TRectToFrame output:", { Frame: this.Frame, r: this.r, inside: this.inside });
  }

  SetSize(newWidth: number, newHeight: number, actionType: number) {
    console.log("= S.BaseShape - SetSize input:", { newWidth, newHeight, actionType });

    let originalFrame = {
      x: this.Frame.x,
      y: this.Frame.y,
      width: this.Frame.width,
      height: this.Frame.height
    };

    const isGanttChart = this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_CHART;
    let sizeChanged = false;

    if (newWidth) {
      originalFrame.width = newWidth;
    }
    if (newHeight) {
      originalFrame.height = newHeight;
    }

    if (newWidth || newHeight) {
      const prevActionBBox = GlobalData.optManager.theActionBBox;
      const newActionBBox = GlobalData.optManager.theActionNewBBox;

      GlobalData.optManager.theActionBBox = Utils1.DeepCopy(this.Frame);
      GlobalData.optManager.theActionNewBBox = Utils1.DeepCopy(this.Frame);

      this.HandleActionTriggerCallResize(originalFrame, actionType, null);

      GlobalData.optManager.theActionBBox = prevActionBBox;
      GlobalData.optManager.theActionNewBBox = newActionBBox;

      if (actionType !== ConstantData.ActionTriggerType.TABLE_EDIT && actionType !== ConstantData.ActionTriggerType.LINE_THICKNESS) {
        if (newWidth) {
          this.sizedim.width = this.Frame.width;
          sizeChanged = true;
        }
        if (newHeight) {
          this.sizedim.height = this.Frame.height;
          sizeChanged = true;
        }
      }

      GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);

      if (sizeChanged && isGanttChart) {
        GlobalData.optManager.PlanningTableUpdateGeometry(this, true);
      }

      for (let i = 0; i < this.hooks.length; i++) {
        GlobalData.optManager.SetLinkFlag(this.hooks[i].objid, ConstantData.LinkFlags.SED_L_MOVE);
      }

      if (this instanceof Instance.Shape.Polygon) {
        const newVertexArray = this.RegenerateVectors(originalFrame.width, originalFrame.height);
        if (newVertexArray) {
          this.VertexArray = newVertexArray;
        }
        if (this.polylist && this.ShapeType === ConstantData.ShapeType.POLYGON) {
          this.ScaleObject(0, 0, 0, 0, 0, 0);
        }
      }

      GlobalData.optManager.AddToDirtyList(this.BlockID);
      GlobalData.optManager.theActionTable = null;

      if (this.rflags) {
        if (newWidth) {
          this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
        }
        if (newHeight) {
          this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
        }
      }
    }

    console.log("= S.BaseShape - SetSize output:", { Frame: this.Frame, sizedim: this.sizedim, rflags: this.rflags });
  }

  UpdateDimensions(newWidth: number, newHeight: number, maintainAspectRatio: boolean) {
    console.log("= S.BaseShape - UpdateDimensions input:", { newWidth, newHeight, maintainAspectRatio });

    const updatedFrame = {
      x: this.Frame.x,
      y: this.Frame.y,
      width: this.Frame.width,
      height: this.Frame.height
    };

    if (newWidth) {
      updatedFrame.width = newWidth;
    }

    if (newHeight) {
      updatedFrame.height = newHeight;
    }

    this.UpdateFrame(updatedFrame);

    console.log("= S.BaseShape - UpdateDimensions output:", updatedFrame);
  }

  GetHookFlags() {
    console.log("= S.BaseShape - GetHookFlags input");

    const hookFlags = ConstantData.HookFlags.SED_LC_Shape |
      ConstantData.HookFlags.SED_LC_ArrayMod |
      ConstantData.HookFlags.SED_LC_AttachToLine;

    console.log("= S.BaseShape - GetHookFlags output:", hookFlags);
    return hookFlags;
  }

  AllowLink() {
    console.log("= S.BaseShape - AllowLink input");

    let sessionObject = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
    let dropOnTableFlag = this.flags & ConstantData.ObjFlags.SEDO_DropOnTable;
    let result;

    if (sessionObject) {
      result = (sessionObject.flags & ConstantData.SessionFlags.SEDS_SLink) ||
        (sessionObject.flags & ConstantData.SessionFlags.SEDS_AttLink) ||
        dropOnTableFlag;
    }

    console.log("= S.BaseShape - AllowLink output:", result);
    return result;
  }

  IsSwimlane() {
    console.log("= S.BaseShape - IsSwimlane input");

    const objectTypes = ConstantData.ObjectTypes;
    let result;

    switch (this.objecttype) {
      case objectTypes.SD_OBJT_SWIMLANE_COLS:
      case objectTypes.SD_OBJT_SWIMLANE_ROWS:
      case objectTypes.SD_OBJT_SWIMLANE_GRID:
      case objectTypes.SD_OBJT_FRAME_CONTAINER:
        result = true;
        break;
      default:
        result = false;
    }

    console.log("= S.BaseShape - IsSwimlane output:", result);
    return result;
  }

  IsOKFlowChartShape(objectID: number): number {
    console.log("= S.BaseShape - IsOKFlowChartShape input:", { objectID });

    const object = GlobalData.optManager.GetObjectPtr(objectID, false);
    let result: number;

    if (object && (object.flags & ConstantData.ObjFlags.SEDO_TextOnly || object.IsSwimlane())) {
      result = 0;
    } else {
      result = objectID;
    }

    console.log("= S.BaseShape - IsOKFlowChartShape output:", { result });
    return result;
  }

  PreventLink() {
    console.log("= S.BaseShape - PreventLink input");

    const result = !!this.IsSwimlane();

    console.log("= S.BaseShape - PreventLink output:", result);
    return result;
  }

  GetHookPoints() {
    console.log("= S.BaseShape - GetHookPoints input");

    let connectPoints = this.flags & ConstantData.ObjFlags.SEDO_UseConnect && this.ConnectPoints;
    let table = this.GetTable(false);
    let isTableRows = this.hookflags & ConstantData.HookFlags.SED_LC_TableRows && table;

    if (connectPoints || isTableRows) {
      let points = connectPoints ? this.ConnectPoints : GlobalData.optManager.Table_GetRowConnectPoints(this, table);
      let hookPoints = [];

      for (let i = 0; i < points.length; i++) {
        hookPoints.push({
          x: points[i].x,
          y: points[i].y,
          id: ConstantData.HookPts.SED_CustomBase + i
        });
      }

      console.log("= S.BaseShape - GetHookPoints output:", hookPoints);
      return hookPoints;
    }

    let defaultHookPoints = [
      { x: ConstantData.Defines.SED_CDim / 2, y: 0, id: ConstantData.HookPts.SED_KTC },
      { x: ConstantData.Defines.SED_CDim, y: ConstantData.Defines.SED_CDim / 2, id: ConstantData.HookPts.SED_KRC },
      { x: ConstantData.Defines.SED_CDim / 2, y: ConstantData.Defines.SED_CDim, id: ConstantData.HookPts.SED_KBC },
      { x: 0, y: ConstantData.Defines.SED_CDim / 2, id: ConstantData.HookPts.SED_KLC }
    ];

    console.log("= S.BaseShape - GetHookPoints output:", defaultHookPoints);
    return defaultHookPoints;
  }

  SetHookAlign(hookPoint, alignType) {
    console.log("= S.BaseShape - SetHookAlign input:", { hookPoint, alignType });

    let childArrayIndex, childObject, isFlowConnection;

    switch (hookPoint) {
      case ConstantData.HookPts.SED_AKCL:
        childArrayIndex = GlobalData.optManager.FindChildArray(this.BlockID, -1);
        if (childArrayIndex >= 0) {
          childObject = GlobalData.optManager.GetObjectPtr(childArrayIndex, false);
          if (childObject) {
            isFlowConnection = childObject.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_FlowConn &&
              !(childObject.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Linear);
            if (childObject.hooks.length && childObject.hooks[0].connect.x === 0 && !isFlowConnection) {
              childObject._SetDirection(true, false, false);
            }
          }
        }
        break;

      case ConstantData.HookPts.SED_AKCR:
        childArrayIndex = GlobalData.optManager.FindChildArray(this.BlockID, -1);
        if (childArrayIndex >= 0) {
          childObject = GlobalData.optManager.GetObjectPtr(childArrayIndex, false);
          if (childObject) {
            isFlowConnection = childObject.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_FlowConn &&
              !(childObject.arraylist.styleflags & ConstantData.SEDA_Styles.SEDA_Linear);
            if (childObject.hooks.length && childObject.hooks[0].connect.x === ConstantData.Defines.SED_CDim && !isFlowConnection) {
              childObject._SetDirection(true, false, false);
            }
          }
        }
        break;
    }

    console.log("= S.BaseShape - SetHookAlign output");
  }

  IsCoManager(e: any): boolean {
    console.log("= S.BaseShape - IsCoManager input:", e);

    let isCoManager = false;
    if (this.hooks && this.hooks.length) {
      const hookedObject = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);
      if (hookedObject && hookedObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR) {
        isCoManager = hookedObject.IsCoManager(e);
      }
    }

    console.log("= S.BaseShape - IsCoManager output:", isCoManager);
    return isCoManager;
  }

  RRect_GetCornerSize(customSize) {
    console.log("= S.BaseShape - RRect_GetCornerSize input:", { customSize });

    let width = this.Frame.width;
    let height = this.Frame.height;
    let minDimension = width;

    if (height < minDimension) {
      minDimension = height;
    }

    if (customSize) {
      minDimension = customSize;
    }

    if (this.moreflags & ConstantData.ObjMoreFlags.SED_MF_FixedRR) {
      let fixedSize = ConstantData.Defines.RRectFixedDim * this.shapeparam;
      let maxSize = 0.4 * minDimension;

      if (fixedSize > maxSize) {
        fixedSize = maxSize;
      }

      console.log("= S.BaseShape - RRect_GetCornerSize output:", fixedSize);
      return fixedSize;
    }

    let result = minDimension * this.shapeparam;
    console.log("= S.BaseShape - RRect_GetCornerSize output:", result);
    return result;
  }

  GetPerimPts(points, targetPoints, hookId, rotate, table, needRotate) {
    console.log("= S.BaseShape - GetPerimPts input:", { points, targetPoints, hookId, rotate, table, needRotate });

    let cornerSize = 0;
    let perimeterPoints = [];
    let coManagerPoint = {};
    let isCoManager = false;
    let tablePoints = null;

    if (this.ShapeType === ConstantData.ShapeType.RECT) {
      cornerSize = this.RRect_GetCornerSize();
      if (cornerSize > 0) {
        return this.RRect_GetPerimPts(points, targetPoints, hookId, rotate, table, needRotate);
      }
    }

    if (targetPoints.length === 1 && targetPoints[0].y === -ConstantData.SEDA_Styles.SEDA_CoManager && this.IsCoManager(coManagerPoint)) {
      perimeterPoints.push(new Point(coManagerPoint.x, coManagerPoint.y));
      if (targetPoints[0].id != null) {
        perimeterPoints[0].id = targetPoints[0].id;
      }
      console.log("= S.BaseShape - GetPerimPts output:", perimeterPoints);
      return perimeterPoints;
    }

    const tableObject = this.GetTable(false);
    if (table != null && tableObject) {
      tablePoints = GlobalData.optManager.Table_GetPerimPts(this, tableObject, table, targetPoints);
      if (tablePoints) {
        perimeterPoints = tablePoints;
        isCoManager = true;
      }
    }

    if (!isCoManager) {
      for (let i = 0; i < targetPoints.length; i++) {
        perimeterPoints[i] = {
          x: targetPoints[i].x / ConstantData.Defines.SED_CDim * this.Frame.width + this.Frame.x,
          y: targetPoints[i].y / ConstantData.Defines.SED_CDim * this.Frame.height + this.Frame.y,
          id: targetPoints[i].id != null ? targetPoints[i].id : 0
        };
      }
    }

    if (!rotate) {
      const rotationRadians = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, perimeterPoints);
    }

    console.log("= S.BaseShape - GetPerimPts output:", perimeterPoints);
    return perimeterPoints;
  }

  RRect_GetPerimPts(e, targetPoints, hookId, rotate, table, needRotate) {
    console.log("= S.BaseShape - RRect_GetPerimPts input:", { e, targetPoints, hookId, rotate, table, needRotate });

    let cornerSize, polyPoints, intersectCount, intersectPoints = [0, 0];
    const dimension = ConstantData.Defines.SED_CDim;
    let perimeterPoints = [];
    let coManagerPoint = {};

    if (targetPoints.length === 1 && targetPoints[0].y === -ConstantData.SEDA_Styles.SEDA_CoManager && this.IsCoManager(coManagerPoint)) {
      perimeterPoints.push(new Point(coManagerPoint.x, coManagerPoint.y));
      if (targetPoints[0].id != null) {
        perimeterPoints[0].id = targetPoints[0].id;
      }
      console.log("= S.BaseShape - RRect_GetPerimPts output:", perimeterPoints);
      return perimeterPoints;
    }

    if (hookId === ConstantData.HookPts.SED_KAT && table == null) {
      perimeterPoints = new BaseDrawingObject(this).GetPerimPts(e, targetPoints, hookId, false, table, needRotate);
      console.log("= S.BaseShape - RRect_GetPerimPts output:", perimeterPoints);
      return perimeterPoints;
    }

    const tableObject = this.GetTable(false);
    if (table != null && tableObject) {
      const tablePerimPts = GlobalData.optManager.Table_GetPerimPts(this, tableObject, table, targetPoints);
      if (tablePerimPts) {
        perimeterPoints = tablePerimPts;
        if (!rotate) {
          const rotationRadians = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
          Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, perimeterPoints);
        }
        console.log("= S.BaseShape - RRect_GetPerimPts output:", perimeterPoints);
        return perimeterPoints;
      }
    }

    const useConnect = this.flags & ConstantData.ObjFlags.SEDO_UseConnect;
    const tableRows = this.hookflags & ConstantData.HookFlags.SED_LC_TableRows && tableObject;

    if (useConnect || tableRows) {
      for (let i = 0; i < targetPoints.length; i++) {
        perimeterPoints[i] = {
          x: targetPoints[i].x / dimension * this.Frame.width + this.Frame.x,
          y: targetPoints[i].y / dimension * this.Frame.height + this.Frame.y,
          id: targetPoints[i].id != null ? targetPoints[i].id : 0
        };
      }
    } else {
      perimeterPoints = new BaseDrawingObject(this).GetPerimPts(e, targetPoints, hookId, true, table, needRotate);
      cornerSize = this.GetCornerSize() * ConstantData.Defines.SED_RoundFactor;
      polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false, null);

      for (let i = 0; i < perimeterPoints.length; i++) {
        if (targetPoints[i].x === 0 && targetPoints[i].y === 0) {
          perimeterPoints[i].x += cornerSize;
          perimeterPoints[i].y += cornerSize;
        } else if (targetPoints[i].x === 0 && targetPoints[i].y === dimension) {
          perimeterPoints[i].x += cornerSize;
          perimeterPoints[i].y -= cornerSize;
        } else if (targetPoints[i].x === dimension && targetPoints[i].y === 0) {
          perimeterPoints[i].x -= cornerSize;
          perimeterPoints[i].y += cornerSize;
        } else if (targetPoints[i].x === dimension && targetPoints[i].y === dimension) {
          perimeterPoints[i].x -= cornerSize;
          perimeterPoints[i].y -= cornerSize;
        } else if (targetPoints[i].x < dimension / 4) {
          intersectCount = GlobalData.optManager.PolyGetIntersect(polyPoints, perimeterPoints[i].y, intersectPoints, null, false);
          if (intersectCount) {
            perimeterPoints[i].x = intersectPoints[0];
            if (intersectCount > 1 && intersectPoints[1] < perimeterPoints[i].x) {
              perimeterPoints[i].x = intersectPoints[1];
            }
          }
        } else if (targetPoints[i].x > 3 * dimension / 4) {
          intersectCount = GlobalData.optManager.PolyGetIntersect(polyPoints, perimeterPoints[i].y, intersectPoints, null, false);
          if (intersectCount) {
            perimeterPoints[i].x = intersectPoints[0];
            if (intersectCount > 1 && intersectPoints[1] > perimeterPoints[i].x) {
              perimeterPoints[i].x = intersectPoints[1];
            }
          }
        } else if (targetPoints[i].y < dimension / 4) {
          intersectCount = GlobalData.optManager.PolyGetIntersect(polyPoints, perimeterPoints[i].x, intersectPoints, null, true);
          if (intersectCount) {
            perimeterPoints[i].y = intersectPoints[0];
            if (intersectCount > 1 && intersectPoints[1] < perimeterPoints[i].y) {
              perimeterPoints[i].y = intersectPoints[1];
            }
          }
        } else if (targetPoints[i].y > 3 * dimension / 4) {
          intersectCount = GlobalData.optManager.PolyGetIntersect(polyPoints, perimeterPoints[i].x, intersectPoints, null, true);
          if (intersectCount) {
            perimeterPoints[i].y = intersectPoints[0];
            if (intersectCount > 1 && intersectPoints[1] > perimeterPoints[i].y) {
              perimeterPoints[i].y = intersectPoints[1];
            }
          }
        }
        if (targetPoints[i].id != null) {
          perimeterPoints[i].id = targetPoints[i].id;
        }
      }
    }

    if (!rotate) {
      const rotationRadians = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, perimeterPoints);
    }

    console.log("= S.BaseShape - RRect_GetPerimPts output:", perimeterPoints);
    return perimeterPoints;
  }

  ChangeTarget(eventType: number, targetID: number, additionalData: any, flag: number, coordinates: { x: number; y: number }, needChangeTarget: boolean) {
    console.log("= S.BaseShape - ChangeTarget input:", { eventType, targetID, additionalData, flag, coordinates, needChangeTarget });

    if (needChangeTarget) {
      let businessMgr = Business.GetSelectionBusinessManager(this.BlockID);

      if (businessMgr === null) {
        businessMgr = GlobalData.gBusinessManager;
      }

      // Double TODO
      // businessMgr.ChangeTarget(targetID);
    }

    console.log("= S.BaseShape - ChangeTarget output");
  }

  GetSegLFace(point: { x: number; y: number }, table: any, hookFlags: any) {
    console.log("= S.BaseShape - GetSegLFace input:", { point, table, hookFlags });

    const m = ConstantData.Defines.SED_CDim;
    const distanceSquared = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      return dx * dx + dy * dy;
    };

    let rotationAngle = this.RotationAngle;
    let rotatedPoint = { ...point };
    if (rotationAngle) {
      const rotationRadians = -rotationAngle / (180 / ConstantData.Geometry.PI);
      const frame = { x: 0, y: 0, width: m, height: m };
      Utils3.RotatePointsAboutCenter(frame, rotationRadians, [rotatedPoint]);
    }

    const useConnectPoints = this.flags & ConstantData.ObjFlags.SEDO_UseConnect;
    const isTableRows = this.hookflags & ConstantData.HookFlags.SED_LC_TableRows && table;
    let connectPoints = [];

    if (useConnectPoints || isTableRows) {
      connectPoints = useConnectPoints ? this.ConnectPoints : GlobalData.optManager.Table_GetRowConnectPoints(this, table);
      if (rotationAngle) {
        const rotationRadians = -rotationAngle / (180 / ConstantData.Geometry.PI);
        const frame = { x: 0, y: 0, width: m, height: m };
        Utils3.RotatePointsAboutCenter(frame, rotationRadians, connectPoints);
      }

      const boundingRect = new Rectangle(0, 0, 0, 0);
      Utils2.GetPolyRect(boundingRect, connectPoints);

      const defaultPoints = [
        { x: m / 2, y: 0 },
        { x: m / 2, y: m },
        { x: 0, y: m / 2 },
        { x: m, y: m / 2 }
      ];

      const extendedPoints = [
        { x: boundingRect.x + boundingRect.width / 2, y: boundingRect.y },
        { x: boundingRect.x + boundingRect.width / 2, y: boundingRect.y + boundingRect.height },
        { x: boundingRect.x, y: boundingRect.y + boundingRect.height / 2 },
        { x: boundingRect.x + boundingRect.width, y: boundingRect.y + boundingRect.height / 2 }
      ];

      const pointsToCheck = boundingRect.height < 1000 || boundingRect.width < 1000 ? defaultPoints : extendedPoints;

      let minDistance = m * m * m;
      let closestPointIndex = 0;
      for (let i = 0; i < pointsToCheck.length; i++) {
        const distance = distanceSquared(pointsToCheck[i], rotatedPoint);
        if (distance < minDistance) {
          minDistance = distance;
          closestPointIndex = i;
        }
      }

      const result = ConstantData.HookPts.SED_KTC + closestPointIndex;
      console.log("= S.BaseShape - GetSegLFace output:", result);
      return result;
    }

    const distances = {
      left: rotatedPoint.x,
      right: m - rotatedPoint.x,
      top: rotatedPoint.y,
      bottom: m - rotatedPoint.y
    };

    let result = ConstantData.SegLDir.SED_KLC;
    if (distances.right < distances.left) {
      result = ConstantData.SegLDir.SED_KRC;
      if (distances.top < distances.right) {
        result = ConstantData.SegLDir.SED_KTC;
        if (distances.bottom < distances.top) {
          result = ConstantData.SegLDir.SED_KBC;
        }
      } else if (distances.bottom < distances.right) {
        result = ConstantData.SegLDir.SED_KBC;
      }
    } else {
      if (distances.top < distances.left) {
        result = ConstantData.SegLDir.SED_KTC;
        if (distances.bottom < distances.top) {
          result = ConstantData.SegLDir.SED_KBC;
        }
      } else if (distances.bottom < distances.left) {
        result = ConstantData.SegLDir.SED_KBC;
      }
    }

    console.log("= S.BaseShape - GetSegLFace output:", result);
    return result;
  }

  Resize(element, newSize, drawingObject, actionType, previousBBox) {
    console.log('= S.BaseShape - Resize input:', { element, newSize, drawingObject, actionType, previousBBox });

    if (element != null) {
      drawingObject.SetDimensionLinesVisibility(element, false);
      const rotation = element.GetRotation();
      if (previousBBox == null) {
        previousBBox = this.prevBBox;
      }

      const eventDetails = {
        action: actionType,
        prevBBox: previousBBox,
        trect: $.extend(true, {}, this.trect)
      };

      // Double
      // Collab.SendSVGEvent(this.BlockID, ConstantData.CollabSVGEventTypes.Shape_Grow, newSize, eventDetails);

      const originalBBox = $.extend(true, {}, previousBBox);
      const updatedBBox = $.extend(true, {}, newSize);
      const inflatedBBox = $.extend(true, {}, newSize);
      const offset = GlobalData.optManager.svgDoc.CalculateRotatedOffsetForResize(originalBBox, updatedBBox, rotation);

      if (this.StyleRecord.Line.BThick && this.polylist == null) {
        Utils2.InflateRect(inflatedBBox, this.StyleRecord.Line.BThick, this.StyleRecord.Line.BThick);
      }

      if (actionType !== ConstantData.ActionTriggerType.MOVEPOLYSEG) {
        element.SetSize(inflatedBBox.width, inflatedBBox.height);
        element.SetPos(inflatedBBox.x + offset.x, inflatedBBox.y + offset.y);

        let cornerSize = 0;
        if (this.ShapeType === ConstantData.ShapeType.RECT) {
          cornerSize = this.RRect_GetCornerSize();
        }

        const shapeElement = element.GetElementByID(ConstantData.SVGElementClass.SHAPE);
        shapeElement.SetSize(inflatedBBox.width, inflatedBBox.height);

        const slopElement = element.GetElementByID(ConstantData.SVGElementClass.SLOP);
        if (slopElement) {
          slopElement.SetSize(inflatedBBox.width, inflatedBBox.height);
        }

        const hatchElement = element.GetElementByID(ConstantData.SVGElementClass.HATCH);
        if (hatchElement) {
          hatchElement.SetSize(inflatedBBox.width, inflatedBBox.height);
        }

        if (cornerSize > 0 && shapeElement.SetRRectSize) {
          shapeElement.SetRRectSize(inflatedBBox.width, inflatedBBox.height, cornerSize, cornerSize);
          if (slopElement && slopElement.SetRRectSize) {
            slopElement.SetRRectSize(inflatedBBox.width, inflatedBBox.height, cornerSize, cornerSize);
          }
          if (hatchElement && hatchElement.SetRRectSize) {
            hatchElement.SetRRectSize(inflatedBBox.width, inflatedBBox.height, cornerSize, cornerSize);
          }
        }
      }

      const table = this.GetTable(false);
      const graph = this.GetGraph(true);

      if (table) {
        GlobalData.optManager.Table_ResizeSVGTableObject(element, drawingObject, newSize);
      } else if (graph) {
        GlobalData.optManager.GraphFormat(this, graph, this.Frame, true);
        GlobalData.optManager.AddToDirtyList(this.BlockID);
        GlobalData.optManager.RenderDirtySVGObjects();
      } else {
        this.LM_ResizeSVGTextObject(element, drawingObject, newSize);
      }

      element.SetRotation(rotation);
      this.UpdateDimensionLines(element);

      console.log('= S.BaseShape - Resize output:', offset);
      return offset;
    }
  }

  ResizeInTextEdit(element, newSize) {
    console.log('= S.BaseShape - ResizeInTextEdit input:', { element, newSize });

    const rotation = element.GetRotation();
    this.SetDimensionLinesVisibility(element, false);

    const originalFrame = $.extend(true, {}, this.Frame);
    const updatedFrame = $.extend(true, {}, newSize);
    const inflatedFrame = $.extend(true, {}, newSize);

    const offset = GlobalData.optManager.svgDoc.CalculateRotatedOffsetForResize(originalFrame, updatedFrame, rotation);

    if (this.StyleRecord.Line.BThick && this.polylist == null) {
      Utils2.InflateRect(inflatedFrame, this.StyleRecord.Line.BThick, this.StyleRecord.Line.BThick);
    }

    element.SetSize(inflatedFrame.width, inflatedFrame.height);
    element.SetPos(inflatedFrame.x + offset.x, inflatedFrame.y + offset.y);

    let cornerSize = 0;
    if (this.ShapeType === ConstantData.ShapeType.RECT) {
      cornerSize = this.RRect_GetCornerSize();
    }

    const shapeElement = element.GetElementByID(ConstantData.SVGElementClass.SHAPE);
    if (shapeElement) {
      shapeElement.SetSize(inflatedFrame.width, inflatedFrame.height);
    }

    const slopElement = element.GetElementByID(ConstantData.SVGElementClass.SLOP);
    if (slopElement) {
      slopElement.SetSize(inflatedFrame.width, inflatedFrame.height);
    }

    const table = this.GetTable(false);
    if (table) {
      GlobalData.optManager.Table_ResizeSVGTableObject(element, this, newSize, true);
    }

    const hatchElement = element.GetElementByID(ConstantData.SVGElementClass.HATCH);
    if (hatchElement) {
      hatchElement.SetSize(newSize.width, newSize.height);
    }

    if (cornerSize > 0) {
      if (shapeElement && shapeElement.SetRRectSize) {
        shapeElement.SetRRectSize(inflatedFrame.width, inflatedFrame.height, cornerSize, cornerSize);
      }
      if (slopElement && slopElement.SetRRectSize) {
        slopElement.SetRRectSize(inflatedFrame.width, inflatedFrame.height, cornerSize, cornerSize);
      }
      if (hatchElement && hatchElement.SetRRectSize) {
        hatchElement.SetRRectSize(inflatedFrame.width, inflatedFrame.height, cornerSize, cornerSize);
      }
    }

    element.SetRotation(rotation);
    GlobalData.optManager.UpdateDisplayCoordinates(newSize, null, null, this);
    this.UpdateDimensionLines(element);

    console.log('= S.BaseShape - ResizeInTextEdit output:', offset);
    return offset;
  }

  Rotate(element, angle) {
    console.log("= S.BaseShape - Rotate input:", { element, angle });
    element.SetRotation(angle);
    console.log("= S.BaseShape - Rotate output");
  }

  ApplyStyles(element, styleRecord) {
    console.log("= S.BaseShape - ApplyStyles input:", { element, styleRecord });

    let fillType = styleRecord.Fill.Paint.FillType;
    let strokeType = styleRecord.Line.Paint.FillType;
    const hasImageURL = this.ImageURL !== '';
    let fillColor = styleRecord.Fill.Paint.Color;
    let strokeColor = styleRecord.Line.Paint.Color;
    const fieldDataStyleOverride = null;// this.GetFieldDataStyleOverride();

    if (fieldDataStyleOverride) {
      if (fieldDataStyleOverride.fillColor && fillType !== ConstantData.FillTypes.SDFILL_TRANSPARENT) {
        fillType = ConstantData.FillTypes.SDFILL_SOLID;
        fillColor = fieldDataStyleOverride.fillColor;
      }
      if (fieldDataStyleOverride.strokeColor) {
        strokeType = ConstantData.FillTypes.SDFILL_SOLID;
        strokeColor = fieldDataStyleOverride.strokeColor;
      }
    }

    if (!this.SymbolURL) {
      if (hasImageURL) {
        let scaleType = 'PROPFILL';
        const cropRect = { x: 0, y: 0, width: 0, height: 0 };

        if (this.ImageHeader) {
          if (this.ImageHeader.croprect) {
            cropRect.x = this.ImageHeader.croprect.left;
            cropRect.y = this.ImageHeader.croprect.top;
            cropRect.width = this.ImageHeader.croprect.right - this.ImageHeader.croprect.left;
            cropRect.height = this.ImageHeader.croprect.bottom - this.ImageHeader.croprect.top;
          }
          if (this.ImageHeader.imageflags !== undefined) {
            if (this.ImageHeader.imageflags === ConstantData.ImageScales.SDIMAGE_ALWAYS_FIT) {
              scaleType = 'NOPROP';
            } else if (this.ImageHeader.imageflags === ConstantData.ImageScales.SDIMAGE_PROP_FIT) {
              scaleType = 'PROPFIT';
            }
          }
        }

        if (this.BlobBytesID !== -1) {
          const blob = GlobalData.optManager.GetObjectPtr(this.BlobBytesID, false);
          if (blob && blob.ImageDir === ConstantData2.ImageDir.dir_svg) {
            if (this.SVGDim.width == null) {
              this.SVGDim = Utils2.ParseSVGDimensions(blob.Bytes);
            }
            element.SetImageFill(this.ImageURL, {
              scaleType,
              cropRect,
              imageWidth: this.SVGDim.width,
              imageHeight: this.SVGDim.height
            });
          } else {
            element.SetImageFill(this.ImageURL, { scaleType, cropRect });
          }
        } else {
          if (this.ImageURL.slice(-3).toUpperCase() === 'SVG') {
            element.SetImageFill(this.ImageURL, {
              scaleType,
              cropRect,
              imageWidth: this.SVGDim.width,
              imageHeight: this.SVGDim.height
            });
          } else {
            element.SetImageFill(this.ImageURL, { scaleType, cropRect });
          }
        }

        const flipHorizontally = (this.extraflags & ConstantData.ExtraFlags.SEDE_FlipHoriz) > 0;
        const flipVertically = (this.extraflags & ConstantData.ExtraFlags.SEDE_FlipVert) > 0;
        if (flipHorizontally) {
          element.SetMirror(flipHorizontally);
        }
        if (flipVertically) {
          element.SetFlip(flipVertically);
        }
        element.SetFillOpacity(styleRecord.Fill.Paint.Opacity);
      } else {
        switch (fillType) {
          case ConstantData.FillTypes.SDFILL_GRADIENT:
            element.SetGradientFill(this.CreateGradientRecord(
              styleRecord.Fill.Paint.GradientFlags,
              fillColor,
              styleRecord.Fill.Paint.Opacity,
              styleRecord.Fill.Paint.EndColor,
              styleRecord.Fill.Paint.EndOpacity
            ));
            break;
          case ConstantData.FillTypes.SDFILL_RICHGRADIENT:
            element.SetGradientFill(this.CreateRichGradientRecord(styleRecord.Fill.Paint.GradientFlags));
            break;
          case ConstantData.FillTypes.SDFILL_TEXTURE:
            const texture = {
              url: '',
              scale: 1,
              alignment: styleRecord.Fill.Paint.TextureScale.AlignmentScalar
            };
            const textureIndex = styleRecord.Fill.Paint.Texture;
            if (GlobalData.optManager.TextureList.Textures[textureIndex]) {
              texture.dim = GlobalData.optManager.TextureList.Textures[textureIndex].dim;
              texture.url = GlobalData.optManager.TextureList.Textures[textureIndex].ImageURL;
              texture.scale = GlobalData.optManager.CalcTextureScale(styleRecord.Fill.Paint.TextureScale, texture.dim.x);
              styleRecord.Fill.Paint.TextureScale.Scale = texture.scale;
              if (!texture.url) {
                texture.url = Constants.FilePath_CMSRoot + Constants.FilePath_Textures + GlobalData.optManager.TextureList.Textures[textureIndex].filename;
              }
              element.SetTextureFill(texture);
              element.SetFillOpacity(styleRecord.Fill.Paint.Opacity);
            }
            break;
          case ConstantData.FillTypes.SDFILL_TRANSPARENT:
            element.SetFillColor('none');
            break;
          default:
            if (styleRecord.Fill.Paint.Color.indexOf('#0102') === 0) {
              element.SetFillColor('none');
              GlobalData.optManager.Test3DGraph(element.parent, this.Frame.width, this.Frame.height, styleRecord.Fill.Paint.Color);
            } else {
              element.SetFillColor(fillColor);
              element.SetFillOpacity(styleRecord.Fill.Paint.Opacity);
            }
            break;
        }

        switch (strokeType) {
          case ConstantData.FillTypes.SDFILL_GRADIENT:
            element.SetGradientStroke(this.CreateGradientRecord(
              styleRecord.Line.Paint.GradientFlags,
              strokeColor,
              styleRecord.Line.Paint.Opacity,
              styleRecord.Line.Paint.EndColor,
              styleRecord.Line.Paint.EndOpacity
            ));
            break;
          case ConstantData.FillTypes.SDFILL_RICHGRADIENT:
            element.SetGradientStroke(this.CreateRichGradientRecord(styleRecord.Line.Paint.GradientFlags));
            break;
          case ConstantData.FillTypes.SDFILL_TEXTURE:
            const strokeTexture = {
              url: '',
              scale: styleRecord.Line.Paint.TextureScale.Scale,
              alignment: styleRecord.Line.Paint.TextureScale.AlignmentScalar
            };
            const strokeTextureIndex = styleRecord.Line.Paint.Texture;
            strokeTexture.dim = GlobalData.optManager.TextureList.Textures[strokeTextureIndex].dim;
            strokeTexture.url = GlobalData.optManager.TextureList.Textures[strokeTextureIndex].ImageURL;
            if (!strokeTexture.url) {
              strokeTexture.url = Constants.FilePath_CMSRoot + Constants.FilePath_Textures + GlobalData.optManager.TextureList.Textures[strokeTextureIndex].filename;
            }
            element.SetTextureStroke(strokeTexture);
            element.SetStrokeOpacity(styleRecord.Line.Paint.Opacity);
            break;
          default:
            element.SetStrokeColor(strokeColor);
            element.SetStrokeOpacity(styleRecord.Line.Paint.Opacity);
            break;
        }
      }
    }

    console.log("= S.BaseShape - ApplyStyles output");
  }

  SetFillHatch(element, hatchType, color) {
    console.log("= S.BaseShape - SetFillHatch input:", { element, hatchType, color });

    if (hatchType !== -1 && hatchType !== 0) {
      let hatchIndex = hatchType - 1;
      const texture = {};
      const effects = [];

      if (hatchIndex < 10) {
        hatchIndex = '0' + hatchIndex;
      }

      texture.url = Constants.FilePath_Hatches + Constants.HatchName + hatchIndex + '.png';
      texture.scale = 1;
      texture.alignment = 0;
      texture.dim = { x: 128, y: 128 };

      element.SetTextureFill(texture);

      let lineColor = this.StyleRecord.Line.Paint.Color;
      if (color) {
        lineColor = color;
      }

      effects.push({
        type: Effects.EffectType.RECOLOR,
        params: { color: lineColor }
      });

      element.Effects().SetEffects(effects, this.Frame);
    } else {
      element.SetFillColor('none');
    }

    console.log("= S.BaseShape - SetFillHatch output");
  }

  IsTransparent() {
    console.log("= S.BaseShape - IsTransparent input");

    const isTransparent = this.StyleRecord.Fill.Paint.FillType === ConstantData.FillTypes.SDFILL_TRANSPARENT;

    console.log("= S.BaseShape - IsTransparent output:", isTransparent);
    return isTransparent;
  }

  GetTargetRect() {
    console.log("= S.BaseShape - GetTargetRect input");

    const targetRect = {};
    Utils2.CopyRect(targetRect, this.Frame);

    console.log("= S.BaseShape - GetTargetRect output:", targetRect);
    return targetRect;
  }

  Hit(point, isBorderOnly, isTransparent, hitResult) {
    console.log("= S.BaseShape - Hit input:", { point, isBorderOnly, isTransparent, hitResult });

    let rotationRadians, polyPoints, hitCode;
    const transformedPoint = [{ x: point.x, y: point.y }];
    const frameWithThickness = {};
    const borderThickness = this.StyleRecord.Line.Thickness / 2;

    if (this.flags & ConstantData.ObjFlags.SEDO_UseConnect && this.ConnectPoints) {
      isBorderOnly = false;
    }

    if (this.RotationAngle !== 0) {
      rotationRadians = this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, transformedPoint);
    }

    const transformedCoords = { x: transformedPoint[0].x, y: transformedPoint[0].y };
    Utils2.CopyRect(frameWithThickness, this.Frame);
    Utils2.InflateRect(frameWithThickness, borderThickness, borderThickness);

    hitCode = Utils2.pointInRect(frameWithThickness, transformedCoords) ? ConstantData.HitCodes.SED_Border : 0;

    if (hitCode) {
      polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, true, null);
      if (GlobalData.optManager.FromOverlayLayer || GlobalData.optManager.PolyPtInPolygon(polyPoints, transformedCoords)) {
        hitCode = ConstantData.HitCodes.SED_Inside;
        if (this.IsTransparent() || isBorderOnly) {
          hitCode = 0;
          isBorderOnly = true;
        }
        polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false, null);
        if (isBorderOnly && Utils3.LineDStyleHit(polyPoints, transformedCoords, borderThickness, 0, null)) {
          hitCode = ConstantData.HitCodes.SED_Border;
        }
      } else {
        hitCode = 0;
      }
    }

    if (hitResult) {
      hitResult.hitcode = hitCode;
    }

    console.log("= S.BaseShape - Hit output:", hitCode);
    return hitCode;
  }

  AllowMaintainLink() {
    console.log("= S.BaseShape - AllowMaintainLink input");

    const result = !!(
      this instanceof Instance.Shape.Polygon &&
      this.hookflags & ConstantData.HookFlags.SED_LC_AttachToLine
    );

    console.log("= S.BaseShape - AllowMaintainLink output:", result);
    return result;
  }

  PolyGetTargetPointList(rotationAngle: number) {
    console.log("= S.BaseShape - PolyGetTargetPointList input:", { rotationAngle });

    let polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, true, null);
    let angleInRadians = 0;

    if (rotationAngle !== 0) {
      angleInRadians = -rotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, angleInRadians, polyPoints);
    }

    console.log("= S.BaseShape - PolyGetTargetPointList output:", polyPoints);
    return polyPoints;
  }

  PolyGetTargets(event, hookFlags, frame) {
    console.log("= S.BaseShape - PolyGetTargets input:", { event, hookFlags, frame });

    let closestPointIndex = -1;
    let minDistance = ConstantData.Defines.LongIntMax;
    const targetPoints = [{ x: 0, y: 0 }];
    const resultPoints = [];
    const rotatedEvent = { x: event.x, y: event.y };
    const rotatedFrame = { ...frame };
    const polyPoints = this.PolyGetTargetPointList(hookFlags);

    if (!event) return null;

    if (GlobalData.docHandler.documentConfig.enableSnap && !(hookFlags & ConstantData.HookFlags.SED_LC_NoSnaps)) {
      rotatedEvent.x = GlobalData.docHandler.SnapToGrid(rotatedEvent).x;
      rotatedEvent.y = GlobalData.docHandler.SnapToGrid(rotatedEvent).y;
      rotatedEvent.y = Math.max(rotatedEvent.y, frame.y);
      rotatedEvent.y = Math.min(rotatedEvent.y, frame.y + frame.height);
      rotatedEvent.x = Math.max(rotatedEvent.x, frame.x);
      rotatedEvent.x = Math.min(rotatedEvent.x, frame.x + frame.width);
    }

    for (let i = 1; i < polyPoints.length; i++) {
      const startPoint = polyPoints[i - 1];
      const endPoint = polyPoints[i];

      if (Utils2.EqualPt(startPoint, endPoint)) continue;

      const deltaX = endPoint.x - startPoint.x || 1;
      const deltaY = endPoint.y - startPoint.y || 1;

      let intersectionX, intersectionY, distance;

      if (Math.abs(deltaY / deltaX) > 1) {
        intersectionY = rotatedEvent.y;
        intersectionX = startPoint.x + (intersectionY - startPoint.y) * (deltaX / deltaY);
        distance = Math.abs(intersectionX - rotatedEvent.x);
      } else {
        intersectionX = rotatedEvent.x;
        intersectionY = startPoint.y + (intersectionX - startPoint.x) * (deltaY / deltaX);
        distance = Math.abs(intersectionY - rotatedEvent.y);
      }

      const boundingRect = Utils2.Pt2Rect(startPoint, endPoint);
      Utils2.InflateRect(boundingRect, 1, 1);

      if (Utils2.pointInRect(boundingRect, { x: intersectionX, y: intersectionY }) && distance < minDistance) {
        minDistance = distance;
        closestPointIndex = i;
        targetPoints[0].x = intersectionX;
        targetPoints[0].y = intersectionY;
      }
    }

    if (closestPointIndex >= 0) {
      if (this.RotationAngle !== 0) {
        const rotationRadians = this.RotationAngle / (180 / ConstantData.Geometry.PI);
        Utils3.RotatePointsAboutCenter(rotatedFrame, rotationRadians, targetPoints);
      }

      const normalizedX = (targetPoints[0].x - frame.x) / frame.width * ConstantData.Defines.SED_CDim;
      const normalizedY = (targetPoints[0].y - frame.y) / frame.height * ConstantData.Defines.SED_CDim;
      resultPoints.push(new Point(normalizedX, normalizedY));

      console.log("= S.BaseShape - PolyGetTargets output:", resultPoints);
      return resultPoints;
    }

    console.log("= S.BaseShape - PolyGetTargets output: null");
    return null;
  }

  LM_AddSVGTextObject(e, t) {
    var a,
      r = $.extend(!0, {
      }, this.Frame),
      i = Utils1.DeepCopy(this.trect),
      n = - 1,
      o = this.GetTable(!1);
    if (o) {
      if (!(o.select >= 0)) return;
      var s = o.cells[o.select];
      if (s.DataID !== this.DataID) {
        var l = GlobalData.optManager.Table_CellFromDataID(o, this.DataID);
        l >= 0 &&
          (s = o.cells[l])
      }
      a = s.trect,
        s.nextra &&
        (a = GlobalData.optManager.Table_GetJoinedCellFrame(o, o.select, !0, !1)),
        i.x = this.trect.x + a.x,
        i.y = this.trect.y + a.y,
        i.width = a.width,
        i.height = a.height,
        n = s.DataID
    }
    var S = GlobalData.objectStore.GetObject(this.DataID);
    if (null != S) {
      var c = e.CreateShape(ConstantData.CreateShapeType.TEXT);
      c.SetRenderingEnabled(!1),
        c.SetID(ConstantData.SVGElementClass.TEXT),
        c.SetUserData(n);
      var u = this.StyleRecord;
      u.Line.BThick &&
        null == this.polylist &&
        Utils2.InflateRect(r, u.Line.BThick, u.Line.BThick),
        c.SetSpellCheck(this.AllowSpell()),
        c.InitDataSettings(
          this.fieldDataTableID,
          this.fieldDataElemID,
          this.dataStyleOverride
        ),
        this.TextFlags & ConstantData.TextFlags.SED_TF_AttachA ||
        this.TextFlags & ConstantData.TextFlags.SED_TF_AttachB ||
        (c.SetPos(i.x - r.x, i.y - r.y), c.SetSize(i.width, i.height)),
        t &&
        (t.AddElement(c), t.isText = !0, t.textElem = c),
        S.Data.runtimeText ? c.SetRuntimeText(S.Data.runtimeText) : (
          c.SetText(''),
          c.SetParagraphAlignment(this.TextAlign),
          c.SetVerticalAlignment('middle')
        ),
        S.Data.runtimeText ||
        (S.Data.runtimeText = c.GetRuntimeText());
      var p = null;
      if (
        this.bInGroup &&
        c.DisableHyperlinks(!0),
        this.TextFlags & ConstantData.TextFlags.SED_TF_AttachA
      ) switch (
        c.SetRenderingEnabled(!0),
        c.SetConstraints(GlobalData.optManager.theContentHeader.MaxWorkDim.x, 0, 0),
        (p = c.GetTextMinDimensions()).width,
        p.height,
        this.TextAlign
        ) {
          case ConstantData.TextAlign.TOPLEFT:
          case ConstantData.TextAlign.LEFT:
          case ConstantData.TextAlign.BOTTOMLEFT:
            c.SetPos(0, - p.height - this.TMargins.top),
              c.SetParagraphAlignment(ConstantData.TextAlign.LEFT);
            break;
          case ConstantData.TextAlign.TOPRIGHT:
          case ConstantData.TextAlign.RIGHT:
          case ConstantData.TextAlign.BOTTOMRIGHT:
            c.SetPos(this.Frame.width - p.width, - p.height - this.TMargins.top),
              c.SetParagraphAlignment(ConstantData.TextAlign.RIGHT);
            break;
          default:
            c.SetPos(this.Frame.width / 2 - p.width / 2, - p.height - this.TMargins.top),
              c.SetParagraphAlignment(ConstantData.TextAlign.CENTER)
        } else if (this.TextFlags & ConstantData.TextFlags.SED_TF_AttachB) switch (
          c.SetRenderingEnabled(!0),
          c.SetConstraints(GlobalData.optManager.theContentHeader.MaxWorkDim.x, 0, 0),
          (p = c.GetTextMinDimensions()).width,
          this.TextAlign
        ) {
            case ConstantData.TextAlign.TOPLEFT:
            case ConstantData.TextAlign.LEFT:
            case ConstantData.TextAlign.BOTTOMLEFT:
              c.SetPos(0, this.Frame.height + this.TMargins.bottom),
                c.SetParagraphAlignment(ConstantData.TextAlign.LEFT);
              break;
            case ConstantData.TextAlign.TOPRIGHT:
            case ConstantData.TextAlign.RIGHT:
            case ConstantData.TextAlign.BOTTOMRIGHT:
              c.SetPos(
                this.Frame.width - p.width,
                this.Frame.height + this.TMargins.bottom
              ),
                c.SetParagraphAlignment(ConstantData.TextAlign.RIGHT);
              break;
            default:
              c.SetPos(
                this.Frame.width / 2 - p.width / 2,
                this.Frame.height + this.TMargins.bottom
              ),
                c.SetParagraphAlignment(ConstantData.TextAlign.CENTER)
          } else this.TextGrow == ConstantData.TextGrowBehavior.HORIZONTAL ? c.SetConstraints(GlobalData.optManager.theContentHeader.MaxWorkDim.x, i.width, i.height) : c.SetConstraints(i.width, i.width, i.height);
      c.SetRenderingEnabled(!0),
        c.SetEditCallback(GlobalData.optManager.TextCallback, t)
    }
  }

  LM_ResizeSVGTextObject(e, t, a) {
    if (- 1 != t.DataID) {
      var r = e.GetElementByID(ConstantData.SVGElementClass.TEXT);
      if (r) {
        var i = t.trect,
          n = null;
        if (this.TextFlags & ConstantData.TextFlags.SED_TF_AttachA) {
          switch ((n = r.GetTextMinDimensions()).width, n.height, this.TextAlign) {
            case ConstantData.TextAlign.TOPLEFT:
            case ConstantData.TextAlign.LEFT:
            case ConstantData.TextAlign.BOTTOMLEFT:
              r.SetPos(0, - n.height - this.TMargins.top),
                r.SetParagraphAlignment(ConstantData.TextAlign.LEFT);
              break;
            case ConstantData.TextAlign.TOPRIGHT:
            case ConstantData.TextAlign.RIGHT:
            case ConstantData.TextAlign.BOTTOMRIGHT:
              r.SetPos(a.width - n.width, - n.height - this.TMargins.top),
                r.SetParagraphAlignment(ConstantData.TextAlign.RIGHT);
              break;
            default:
              r.SetPos(a.width / 2 - n.width / 2, - n.height - this.TMargins.top),
                r.SetParagraphAlignment(ConstantData.TextAlign.CENTER)
          }
          r.SetConstraints(GlobalData.optManager.theContentHeader.MaxWorkDim.x, 0, 0)
        } else if (this.TextFlags & ConstantData.TextFlags.SED_TF_AttachB) {
          switch ((n = r.GetTextMinDimensions()).width, this.TextAlign) {
            case ConstantData.TextAlign.TOPLEFT:
            case ConstantData.TextAlign.LEFT:
            case ConstantData.TextAlign.BOTTOMLEFT:
              r.SetPos(0, a.height + this.TMargins.bottom),
                r.SetParagraphAlignment(ConstantData.TextAlign.LEFT);
              break;
            case ConstantData.TextAlign.TOPRIGHT:
            case ConstantData.TextAlign.RIGHT:
            case ConstantData.TextAlign.BOTTOMRIGHT:
              r.SetPos(a.width - n.width, a.height + this.TMargins.bottom),
                r.SetParagraphAlignment(ConstantData.TextAlign.RIGHT);
              break;
            default:
              r.SetPos(a.width / 2 - n.width / 2, a.height + this.TMargins.bottom),
                r.SetParagraphAlignment(ConstantData.TextAlign.CENTER)
          }
          r.SetConstraints(GlobalData.optManager.theContentHeader.MaxWorkDim.x, 0, 0)
        } else {
          r.SetPos(i.x - a.x, i.y - a.y);
          var o = i.width;
          this.TextGrow == ConstantData.TextGrowBehavior.HORIZONTAL &&
            (o = GlobalData.optManager.theContentHeader.MaxWorkDim.x),
            r.SetConstraints(o, i.width, i.height)
        }
      }
    }
  }

  GetIconShape() {
    var e = this.GetTable(!1);
    if (e) {
      var t = e.cells[e.cells.length - 1];
      if (t.childcontainer >= 0) return t.childcontainer
    }
    return this.BlockID
  }

  PostCreateShapeCallback(e, t, a, r) {

    console.log('= S.BaseShape PostCreateShapeCallback e,t,a,r', e, t, a, r)

    if (this.UpdateDimensionLines(t), this.HasIcons()) {
      var i = this.GetTable(!1);
      if (i) if (i.cells[i.cells.length - 1].childcontainer >= 0) return
    } else if
      (this instanceof Instance.Shape.ShapeContainer) {
      var n = GlobalData.optManager.ContainerIsInCell(this);
      if (n && n.cellindex === n.theTable.cells.length - 1) return void n.obj.AddIcons(e, t)
    }
    this.AddIcons(e, t)
  }

  GetDimensionPoints() {
    var e = [],
      t = 0;
    e.push(new Point(this.Frame.x, this.Frame.y)),
      this.Frame.width > 0 &&
      e.push(
        new Point(this.Frame.x + this.Frame.width, this.Frame.y)
      ),
      this.Frame.height > 0 &&
      e.push(
        new Point(this.Frame.x + this.Frame.width, this.Frame.y + this.Frame.height)
      );
    var a = 360 - this.RotationAngle;
    Math.PI;
    for (t = 0; t < e.length; t++) e[t].x -= this.Frame.x,
      e[t].y -= this.Frame.y;
    return e
  }

  GetDimensionLineDeflection(unusedSvgElement, pointX, pointY, deflectionConfig) {
    console.log("S.BaseShape - GetDimensionLineDeflection input:", {
      unusedSvgElement,
      pointX,
      pointY,
      deflectionConfig
    });

    let index,
      resultDifference,
      temp = 0,
      pointsArray = [],
      knobAdjustedPoint = new Point(0, 0),
      dimensionPoints = this.GetDimensionPoints();

    // Adjust each dimension point by the inner offset (this.inside)
    for (index = dimensionPoints.length, temp = 0; temp < index; temp++) {
      dimensionPoints[temp].x += this.inside.x;
      dimensionPoints[temp].y += this.inside.y;
    }

    // Calculate the adjusted knob position
    knobAdjustedPoint.x = deflectionConfig.knobPoint.x + this.Frame.x - deflectionConfig.adjustForKnob;
    knobAdjustedPoint.y = deflectionConfig.knobPoint.y + this.Frame.y - deflectionConfig.adjustForKnob;

    // Build the points array for deflection calculation
    pointsArray.push(dimensionPoints[deflectionConfig.segmentIndex - 1]);
    pointsArray.push(dimensionPoints[deflectionConfig.segmentIndex]);
    pointsArray.push(new Point(knobAdjustedPoint.x, knobAdjustedPoint.y));
    pointsArray.push(new Point(pointX, pointY));

    // Rotate points based on configuration
    Utils3.RotatePointsAboutCenter(this.Frame, -deflectionConfig.ccAngleRadians, pointsArray);
    Utils3.RotatePointsAboutCenter(this.Frame, Math.PI, pointsArray);

    resultDifference = pointsArray[3].y - pointsArray[2].y;
    const finalDeflection = deflectionConfig.originalDeflection + resultDifference;

    console.log("S.BaseShape - GetDimensionLineDeflection output:", finalDeflection);
    return finalDeflection;
  }

  DimensionLineDeflectionAdjust(
    svgElement: any,
    xCoord: number,
    yCoord: number,
    additionalParam: any,
    segmentInfo: any
  ): void {
    console.log("= S.BaseShape - DimensionLineDeflectionAdjust input:", {
      svgElement,
      xCoord,
      yCoord,
      additionalParam,
      segmentInfo
    });

    const deflection = this.GetDimensionLineDeflection(svgElement, xCoord, yCoord, segmentInfo);

    if (segmentInfo.segmentIndex === 1) {
      this.dimensionDeflectionH = deflection;
    } else {
      this.dimensionDeflectionV = deflection;
    }

    this.UpdateDimensionLines(svgElement);

    if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select) {
      this.HideOrShowSelectOnlyDimensions(true);
    }

    console.log("= S.BaseShape - DimensionLineDeflectionAdjust output:", {
      dimensionDeflectionH: this.dimensionDeflectionH,
      dimensionDeflectionV: this.dimensionDeflectionV
    });
  }

  MaintainProportions(newWidth: number | null, newHeight: number | null): number | null {
    console.log("= S.BaseShape - MaintainProportions input:", { newWidth, newHeight });
    const frameWidth = this.Frame.width;
    const frameHeight = this.Frame.height;
    let result: number | null = null;
    if (this.ResizeAspectConstrain) {
      if (newWidth != null && frameWidth > 0) {
        result = newWidth * (frameHeight / frameWidth);
        console.log("= S.BaseShape - MaintainProportions output:", result);
        return result;
      }
      if (newHeight != null && frameHeight > 0) {
        result = newHeight * (frameWidth / frameHeight);
        console.log("= S.BaseShape - MaintainProportions output:", result);
        return result;
      }
    }
    console.log("= S.BaseShape - MaintainProportions output:", result);
    return result;
  }

  UpdateDimensionFromTextObj(textComponent, textData) {
    console.log("= S.BaseShape - UpdateDimensionFromTextObj input:", { textComponent, textData });
    GlobalData.objectStore.PreserveBlock(this.BlockID);

    let segment;
    let dimensionValue;
    let dimensionLength = -1;
    let computedWidth = null;
    let computedHeight = null;
    let text;
    let userData;

    if (textData) {
      text = textData.text;
      userData = textData.userData;
    } else {
      text = textComponent.GetText();
      userData = textComponent.GetUserData();
    }

    // Get the segment index from the user data
    segment = userData.segment;

    // Get the numerical dimension value from the provided text for this segment
    dimensionValue = this.GetDimensionValueFromString(text, segment);

    if (dimensionValue >= 0) {
      dimensionLength = this.GetDimensionLengthFromValue(dimensionValue);
    }

    // If the calculated dimension length is invalid, mark the object as dirty and render updates
    if (dimensionLength < 0) {
      GlobalData.optManager.AddToDirtyList(this.BlockID);
      GlobalData.optManager.RenderDirtySVGObjects();
      console.log("= S.BaseShape - UpdateDimensionFromTextObj output: Invalid dimension length");
      return;
    }

    // For segment 1, adjust width; otherwise adjust height
    if (segment === 1) {
      computedWidth = this.MaintainProportions(dimensionLength, null);
      this.SetSize(dimensionLength, computedWidth, ConstantData.ActionTriggerType.LINELENGTH);
      if (this.GetDimensionsForDisplay().width === dimensionLength) {
        this.rwd = dimensionValue;
        this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, true);
      }
    } else {
      computedHeight = this.MaintainProportions(null, dimensionLength);
      this.SetSize(computedHeight, dimensionLength, ConstantData.ActionTriggerType.LINELENGTH);
      if (this.GetDimensionsForDisplay().height === dimensionLength) {
        this.rht = dimensionValue;
        this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, true);
      }
    }

    // Set link flags for this shape and all connected hook objects
    GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
    for (let i = 0, hooksCount = this.hooks.length; i < hooksCount; i++) {
      GlobalData.optManager.SetLinkFlag(this.hooks[i].objid, ConstantData.LinkFlags.SED_L_MOVE);
    }

    GlobalData.optManager.AddToDirtyList(this.BlockID);
    if (this.Frame.x < 0 || this.Frame.y < 0) {
      GlobalData.optManager.ScrollObjectIntoView(this.BlockID, false);
    }
    GlobalData.optManager.CompleteOperation(null);
    console.log("= S.BaseShape - UpdateDimensionFromTextObj output: update complete");
  }

  DimensionEditCallback(actionType: string, eventData: any, textObject: any, shapeObject: any): void {
    console.log("S.BaseShape - DimensionEditCallback input:", { actionType, eventData, textObject, shapeObject });

    // For clarity, assign the editable shape to a local variable.
    let editableShape = shapeObject;

    switch (actionType) {
      case 'edit': {
        // No additional processing for 'edit'
        break;
      }
      case 'keyend': {
        // On keyend, if Tab or Enter were pressed, close the edit mode.
        if (
          eventData.keyCode === ConstantData2.Keys.Tab ||
          eventData.keyCode === ConstantData2.Keys.Enter
        ) {
          GlobalData.optManager.CloseEdit();
          console.log("S.BaseShape - DimensionEditCallback output:", true);
          return;
        }
        break;
      }
      case 'charfilter': {
        // Filter allowed characters based on ruler settings.
        if (
          GlobalData.docHandler.rulerSettings.useInches &&
          GlobalData.docHandler.rulerSettings.units === ConstantData.RulerUnits.SED_Feet
        ) {
          if (eventData.search(/(\d|\.|'|"| )/) === -1) {
            console.log("S.BaseShape - DimensionEditCallback output:", false);
            return;
          }
        } else if (eventData.search(/(\d|\.)/) === -1) {
          console.log("S.BaseShape - DimensionEditCallback output:", false);
          return;
        }
        break;
      }
      case 'activate': {
        // When activating, adjust the text object position and rotation based on the shape's dimensions.
        let currentRotation = textObject.svgObj.SDGObj.svgObj.trans.rotation;
        // Add the editable shape's rotation
        currentRotation += editableShape.RotationAngle;
        if (currentRotation >= 360) {
          currentRotation -= 360;
        }
        // Only adjust if rotation is non-zero.
        if (currentRotation !== 0) {
          let dimensionPoints = editableShape.GetDimensionPoints();
          let textInfoPoints: Point[] = [];
          // Calculate the angle between dimension points for the segment being edited.
          let segmentIndex = textObject.userData.segment;
          let segmentAngle = Utils1.CalcAngleFromPoints(
            dimensionPoints[segmentIndex - 1],
            dimensionPoints[segmentIndex]
          );
          // Retrieve dimension text information.
          editableShape.GetDimensionTextInfo(
            dimensionPoints[segmentIndex - 1],
            dimensionPoints[segmentIndex],
            segmentAngle,
            textObject,
            segmentIndex,
            textInfoPoints,
            [],
            []
          );
          // Calculate the complementary rotation.
          let complementaryAngle = 360 - editableShape.RotationAngle;
          let rotationRadians = 2 * Math.PI * (complementaryAngle / 360);
          // Rotate text info points by the computed angle.
          Utils3.RotatePointsAboutCenter(editableShape.Frame, rotationRadians, textInfoPoints);
          // Determine the bounding rectangle for the rotated text.
          let boundingRect: any = {};
          Utils2.GetPolyRect(boundingRect, textInfoPoints);
          // Center the text within the bounding rectangle.
          let newPosition: any = {};
          let centerPoints: Point[] = [];
          newPosition.x = boundingRect.x + boundingRect.width / 2 - textObject.lastFmtSize.width / 2;
          newPosition.y = boundingRect.y + boundingRect.height / 2 - textObject.lastFmtSize.height / 2;
          centerPoints.push(new Point(newPosition.x, newPosition.y));
          // Rotate back the center point.
          Utils3.RotatePointsAboutCenter(editableShape.Frame, -rotationRadians, centerPoints);
          textObject.SetPos(centerPoints[0].x, centerPoints[0].y);
          // Set the text object's rotation opposite to the shape's rotation.
          textObject.SetRotation(-editableShape.RotationAngle, centerPoints[0].x, centerPoints[0].y);
        }
        break;
      }
      case 'deactivate': {
        // On deactivation, end dimension edit and send updated data if collaboration messages are allowed.
        GlobalData.optManager.bInDimensionEdit = false;
        if (/*Collab.AllowMessage()*/true) {
          // Collab.BeginSecondaryEdit();
          let userDataCopy = Utils1.DeepCopy(textObject.GetUserData());
          let messageData = {
            BlockID: editableShape.BlockID,
            text: textObject.GetText(),
            userData: userDataCopy
          };
          GlobalData.optManager.GetObjectPtr(editableShape.BlockID, true);
          // Collab.BuildMessage(ConstantData.CollabMessages.UpdateDimensionFromTextObj, messageData, false, false);
          editableShape = GlobalData.optManager.GetObjectPtr(editableShape.BlockID, false);
        }
        editableShape.UpdateDimensionFromTextObj(textObject);
        break;
      }
      default: {
        // No specific action; do nothing.
        break;
      }
    }

    console.log("S.BaseShape - DimensionEditCallback output: completed");
  }

  NoFlip(): boolean {
    console.log("= S.BaseShape - NoFlip input:");

    let canRotate: boolean;
    if (this.hooks.length) {
      // If there is at least one hook, check the hook point condition:
      // It returns true if the first hook's hook point is not SED_KAT and not greater than SED_AK.
      canRotate =
        this.hooks[0].hookpt !== ConstantData.HookPts.SED_KAT &&
        !(this.hooks[0].hookpt > ConstantData.HookPts.SED_AK);
    } else {
      // If there are no hooks, defer to the extra flags check
      canRotate = Boolean(this.extraflags & ConstantData.ExtraFlags.SEDE_NoRotate);
    }

    console.log("= S.BaseShape - NoFlip output:", canRotate);
    return canRotate;
  }

  Flip(flipFlags: number): void {
    console.log("= S.BaseShape - Flip input:", { flipFlags });

    // If both SymbolURL and ImageURL are empty, do nothing.
    if (this.SymbolURL === "" && this.ImageURL === "") {
      console.log("= S.BaseShape - Flip output: no symbol or image found, nothing flipped");
      return;
    }

    // If the flipFlags indicate a horizontal flip, flip horizontally.
    if (flipFlags & ConstantData.ExtraFlags.SEDE_FlipHoriz) {
      const isCurrentlyFlippedHoriz = (this.extraflags & ConstantData.ExtraFlags.SEDE_FlipHoriz) !== 0;
      this.extraflags = Utils2.SetFlag(
        this.extraflags,
        ConstantData.ExtraFlags.SEDE_FlipHoriz,
        !isCurrentlyFlippedHoriz
      );
    }

    // If the flipFlags indicate a vertical flip, flip vertically.
    if (flipFlags & ConstantData.ExtraFlags.SEDE_FlipVert) {
      const isCurrentlyFlippedVert = (this.extraflags & ConstantData.ExtraFlags.SEDE_FlipVert) !== 0;
      this.extraflags = Utils2.SetFlag(
        this.extraflags,
        ConstantData.ExtraFlags.SEDE_FlipVert,
        !isCurrentlyFlippedVert
      );
    }

    console.log("= S.BaseShape - Flip output:", { extraflags: this.extraflags });
  }

  NoRotate(): boolean {
    console.log("= S.BaseShape: NoRotate input: {}");
    // Find all child connectors for this shape.
    const childConnectors = GlobalData.optManager.FindAllChildConnectors(this.BlockID);
    let childObject: any;

    // If the shape is a swimlane, do not rotate.
    if (this.IsSwimlane()) {
      console.log("= S.BaseShape: NoRotate output: true (shape is a swimlane)");
      return true;
    }

    // If the shape is a table with a shape container, do not rotate.
    if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER) {
      console.log("= S.BaseShape: NoRotate output: true (object type is TABLE_WITH_SHAPECONTAINER)");
      return true;
    }

    // If the first hook's object is a shape container, do not rotate.
    if (this.hooks.length && (childObject = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false)) &&
      childObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_SHAPECONTAINER) {
      console.log("= S.BaseShape: NoRotate output: true (hook object is a SHAPECONTAINER)");
      return true;
    }

    // If extra flags indicate no rotation, do not rotate.
    if (this.extraflags & ConstantData.ExtraFlags.SEDE_NoRotate) {
      console.log("= S.BaseShape: NoRotate output: true (extraflags SEDE_NoRotate set)");
      return true;
    }

    // Check each child connector; if any child connector is not a flow chart connector and
    // has hooks beyond the skipped count, do not allow rotation.
    const connectorCount = childConnectors.length;
    for (let i = 0; i < connectorCount; i++) {
      childObject = GlobalData.optManager.GetObjectPtr(childConnectors[i], false);
      if (!childObject._IsFlowChartConnector() && (childObject.arraylist.hook.length - ConstantData.ConnectorDefines.SEDA_NSkip) > 0) {
        console.log("= S.BaseShape: NoRotate output: true (child connector condition met at index " + i + ")");
        return true;
      }
    }

    console.log("= S.BaseShape: NoRotate output: false");
    return false;
  }

  MaintainPoint(currentPoint, targetPoint, deltaValue, mode, extraFlag) {
    console.log("= S.BaseShape - MaintainPoint input:", { currentPoint, targetPoint, deltaValue, mode, extraFlag });
    const result = false;
    console.log("= S.BaseShape - MaintainPoint output:", result);
    return result;
  }

  AddIcon(iconData: any, containerElement: any, iconPosition: { x: number; y: number }): any {
    console.log("= S.BaseShape - AddIcon input:", { iconData, containerElement, iconPosition });
    if (containerElement) {
      let containerId = containerElement.GetID();
      // Use the container's frame if it is different from this shape, otherwise use this shape's frame.
      let targetFrame = this.Frame;
      if (containerId !== this.BlockID) {
        const containerObject = GlobalData.optManager.GetObjectPtr(containerId, false);
        if (containerObject) {
          targetFrame = containerObject.Frame;
        }
      }
      // Calculate the icon position based on the target frame and defined offsets.
      iconPosition.x = targetFrame.width - this.iconShapeRightOffset - this.iconSize - this.nIcons * this.iconSize;
      iconPosition.y = targetFrame.height - this.iconShapeBottomOffset - this.iconSize;
      // Create the icon using the updated coordinates.
      const iconElement = this.GenericIcon(iconPosition);
      // Increment the icon count and add the icon to the container.
      this.nIcons++;
      containerElement.AddElement(iconElement);
      console.log("= S.BaseShape - AddIcon output:", iconElement);
      return iconElement;
    }
    console.log("= S.BaseShape - AddIcon output:", null);
    return null;
  }

  GetActionButtons(): { left: boolean; right: boolean; up: boolean; down: boolean; custom: boolean } | null {
    console.log("= S.BaseShape - GetActionButtons input:", {});

    // Check if the session disallows action buttons
    const sessionBlock = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
    if (sessionBlock.moreflags & ConstantData.SessionMoreFlags.SEDSM_NoActionButton) {
      console.log("= S.BaseShape - GetActionButtons output:", null);
      return null;
    }

    // If the shape is locked, no action buttons are allowed
    if (this.flags & ConstantData.ObjFlags.SEDO_Lock) {
      console.log("= S.BaseShape - GetActionButtons output:", null);
      return null;
    }

    // Check active text/table/outline object conditions
    const tedSession = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theTEDSessionBlockID, false);
    if (
      this.BlockID === tedSession.theActiveTextEditObjectID ||
      this.BlockID === tedSession.theActiveTableObjectID ||
      this.BlockID === tedSession.theActiveOutlineObjectID
    ) {
      console.log("= S.BaseShape - GetActionButtons output:", null);
      return null;
    }

    // Check layer settings: if the active layer is using edges, no buttons should be available.
    const layersManager = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theLayersManagerBlockID, false);
    if (layersManager && (layersManager.layers[layersManager.activelayer].flags & ConstantData.LayerFlags.SDLF_UseEdges)) {
      console.log("= S.BaseShape - GetActionButtons output:", null);
      return null;
    }

    // Get the business manager controlling selection
    let selectionBusinessManager = Business.GetSelectionBusinessManager(this.BlockID);
    if (selectionBusinessManager == null) {
      selectionBusinessManager = GlobalData.gBusinessManager;
    }

    // Variables to hold allowed action buttons
    let allowedButtons: any = null;
    let upAllowed = false;
    let downAllowed = false;
    let leftAllowed = false;
    let rightAllowed = false;
    let customAllowed = false;

    // Determine if the shape can have action buttons
    if (selectionBusinessManager && !Business.ShapeCannotHaveActionButtons(this)) {
      allowedButtons = selectionBusinessManager.AllowActionButtons(this);

      if (allowedButtons) {
        upAllowed = allowedButtons.up;
        downAllowed = allowedButtons.down;
        leftAllowed = allowedButtons.left;
        rightAllowed = allowedButtons.right;
        if (allowedButtons.custom) {
          customAllowed = true;
        }
        if (allowedButtons.table) {
          customAllowed = true;
        }
      }
    }

    // If at least one button is allowed, return the readable result
    const result = (upAllowed || downAllowed || leftAllowed || rightAllowed || customAllowed)
      ? {
        left: leftAllowed,
        right: rightAllowed,
        up: upAllowed,
        down: downAllowed,
        custom: customAllowed
      }
      : null;

    console.log("= S.BaseShape - GetActionButtons output:", result);
    return result;
  }

  SetRolloverActions(svgEvent: any, rolloverElement: any, domEvent: any) {
    console.log("S.BaseShape - SetRolloverActions input:", { svgEvent, rolloverElement, domEvent });

    // Get the base object for this shape
    const baseShapeObj = GlobalData.optManager.GetObjectPtr(this.BlockID, false);

    if (baseShapeObj && baseShapeObj instanceof BaseDrawingObject) {
      const objectTypes = ConstantData.ObjectTypes;
      switch (this.objecttype) {
        case objectTypes.SD_OBJT_SWIMLANE_ROWS:
        case objectTypes.SD_OBJT_SWIMLANE_COLS:
        case objectTypes.SD_OBJT_SWIMLANE_GRID:
        case objectTypes.SD_OBJT_FRAME_CONTAINER:
          if (domEvent) {
            // Get the rollover target from the DOM event's currentTarget element
            const rolloverTarget = GlobalData.optManager.svgObjectLayer
              .FindElementByDOMElement(domEvent.currentTarget)
              .GetTargetForEvent(domEvent);
            if (rolloverTarget.GetID() === ConstantData.SVGElementClass.SLOP) {
              // Delegate to the parent method
              super.SetRolloverActions(svgEvent, rolloverTarget);
            }
          }
          // Always set cursors afterward
          this.SetCursors();
          console.log("S.BaseShape - SetRolloverActions output:", "Handled SWIMLANE/FRAME_CONTAINER rollover");
          return;

        case objectTypes.SD_OBJT_SHAPECONTAINER:
          // If the shape container is in a table cell, delegate rollover to the cell object
          const containerCell = GlobalData.optManager.ContainerIsInCell(this);
          if (containerCell) {
            const cellElement = GlobalData.optManager.svgObjectLayer.GetElementByID(containerCell.obj.BlockID);
            containerCell.obj.SetRolloverActions(svgEvent, cellElement);
            console.log("S.BaseShape - SetRolloverActions output:", "Delegated rollover to contained cell object");
            return;
          }
      }

      // Clear previously highlighted shape if different than current
      if (GlobalData.optManager.curHiliteShape !== -1 && GlobalData.optManager.curHiliteShape !== this.BlockID) {
        const prevHiliteObj = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.curHiliteShape, false);
        if (prevHiliteObj) {
          prevHiliteObj.SetRuntimeEffects(false);
          prevHiliteObj.ClearCursors();
        }
      }

      // Remove any existing action arrows for this shape
      const arrowGroupId = "actionArrow" + this.BlockID;
      if (this.actionArrowHideTimerID >= 0) {
        GlobalData.optManager.ClearActionArrowTimer(this.BlockID);
      }
      GlobalData.optManager.RemoveActionArrows(this.BlockID, true);

      // Obtain available action buttons for this shape
      const actionButtons = this.GetActionButtons();
      if (actionButtons) {

      } else {
        // If no custom action buttons available, delegate to base rollover method
        super.SetRolloverActions(svgEvent, rolloverElement);
      }
    }
    console.log("S.BaseShape - SetRolloverActions output:", "Completed rollover actions setup");
  }

  UseEdges(isHorizontalExplicit: boolean, isVerticalExplicit: boolean, horizontalCondition: boolean, verticalCondition: boolean, oldPoint: { x: number; y: number }, newPoint: { x: number; y: number }): boolean {
    console.log("S.ArcSegmentedLine - UseEdges input:", {
      isHorizontalExplicit,
      isVerticalExplicit,
      horizontalCondition,
      verticalCondition,
      oldPoint,
      newPoint
    });

    let frameCenter: number;
    let deltaXDirect = 0;
    let deltaYDirect = 0;
    let newWidth = 0;
    let newHeight = 0;
    let offsetX = 0;
    let offsetY = 0;
    let adjustmentApplied = false;

    // Calculate horizontal adjustment
    if (
      oldPoint.x !== newPoint.x &&
      (
        isHorizontalExplicit && horizontalCondition
          ? (deltaXDirect = newPoint.x - oldPoint.x, adjustmentApplied = true)
          : (
            frameCenter = this.Frame.x + this.Frame.width / 2,
            Math.abs(frameCenter - oldPoint.x / 2) < 100
              ? (offsetX = (newPoint.x - oldPoint.x) / 2, adjustmentApplied = true)
              : this.Frame.x > oldPoint.x / 2 && (offsetX = newPoint.x - oldPoint.x, adjustmentApplied = true)
          )
      )
    ) {
      // no additional block here
    }

    // Calculate vertical adjustment
    if (
      oldPoint.y !== newPoint.y &&
      (
        isVerticalExplicit && verticalCondition
          ? (deltaYDirect = newPoint.y - oldPoint.y, adjustmentApplied = true)
          : (
            frameCenter = this.Frame.y + this.Frame.height / 2,
            Math.abs(frameCenter - oldPoint.y / 2) < 100
              ? (offsetY = (newPoint.y - oldPoint.y) / 2, adjustmentApplied = true)
              : this.Frame.y > oldPoint.y / 2 && (offsetY = newPoint.y - oldPoint.y, adjustmentApplied = true)
          )
      )
    ) {
      // no additional block here
    }

    if (adjustmentApplied) {
      // Force re-read of the object for potential side effects
      GlobalData.optManager.GetObjectPtr(this.BlockID, true);
      if (offsetX || offsetY) {
        this.OffsetShape(offsetX, offsetY);
      }
      const frameBottom = this.Frame.y + this.Frame.height;
      if (deltaXDirect || deltaYDirect) {
        if (deltaXDirect) {
          newWidth = this.Frame.width + deltaXDirect;
        }
        if (deltaYDirect) {
          newHeight = this.Frame.height + deltaYDirect;
        }
        this.SetSize(newWidth, newHeight, ConstantData.ActionTriggerType.LINELENGTH);
        if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_ANNOTATION) {
          // For annotation, adjust the vertical offset
          offsetY = frameBottom - (this.Frame.y + this.Frame.height);
          offsetX = 0;
          if (offsetX || offsetY) {
            this.OffsetShape(offsetX, offsetY);
          }
        }
      }
      GlobalData.optManager.AddToDirtyList(this.BlockID);
      console.log("S.ArcSegmentedLine - UseEdges output:", true);
      return true;
    }
    console.log("S.ArcSegmentedLine - UseEdges output:", false);
    return false;
  }

  Pr_UpdateExtra(extraAmount: number): void {
    // Log input parameters with prefix "S.BaseShape"
    console.log("S.BaseShape - prUpdateExtra input:", { extraAmount, currentBlockId: this.BlockID });

    const currentBlockId = this.BlockID;
    const containerShape = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, true);

    if (containerShape && containerShape instanceof Instance.Shape.ShapeContainer) {
      const containerList = containerShape.ContainerList;

      // Only process if container list is not sparse
      if (!(containerList.flags & ConstantData.ContainerListFlags.Sparse)) {
        const listLength = containerList.List.length;

        for (let index = 0; index < listLength; index++) {
          if (containerList.List[index].id === currentBlockId) {
            // Update extra amount for the matching container entry
            containerList.List[index].extra += extraAmount;
            if (containerList.List[index].extra < 0) {
              containerList.List[index].extra = 0;
            }
            // Update link flag for containerShape and mark it as an object type
            GlobalData.optManager.SetLinkFlag(containerShape.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
            containerShape.flags = Utils2.SetFlag(containerShape.flags, ConstantData.ObjFlags.SEDO_Obj1, true);

            // Log output with updated extra value and return
            console.log("S.BaseShape - prUpdateExtra output:", { updatedExtra: containerList.List[index].extra });
            return;
          }
        }
      }
    }

    // Log if no update was performed
    console.log("S.BaseShape - prUpdateExtra output: no update performed");
  }

  Pr_GetAdjustShapeList(): { list: number[]; svglist: number[]; framelist: any[]; oldextra: number; arrangement: any } | null {
    console.log("S.ArcSegmentedLine - Pr_GetAdjustShapeList input:");

    let idList: number[] = [];
    let svgIdList: number[] = [];
    let frameList: any[] = [];
    let oldExtra = 0;
    let foundInList = false;

    const addShape = function (shapeId: number): void {
      const shapeObject = GlobalData.optManager.GetObjectPtr(shapeId, false);
      if (shapeObject) {
        const svgFrame = shapeObject.GetSVGFrame();
        frameList.push(svgFrame);
        idList.push(shapeId);
        svgIdList.push(shapeId);
      }
    };

    if (this.hooks.length > 0) {
      const currentBlockId = this.BlockID;
      let containerExtra = 0;
      const containerShape = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);

      // Check if containerShape is an instance of Instance.Shape.ShapeContainer
      if (containerShape && containerShape instanceof Instance.Shape.ShapeContainer) {
        const containerList = containerShape.ContainerList;
        if (!(containerList.flags & ConstantData.ContainerListFlags.Sparse)) {
          const listLength = containerList.List.length;
          for (let index = 0; index < listLength; index++) {
            if (containerList.List[index].id === currentBlockId) {
              containerExtra = containerList.List[index].extra;
              addShape(currentBlockId);
              foundInList = true;
            } else if (foundInList) {
              addShape(containerList.List[index].id);
            }
          }
          console.log("S.ArcSegmentedLine - Pr_GetAdjustShapeList output:", {
            list: idList,
            svglist: svgIdList,
            framelist: frameList,
            oldextra: containerExtra,
            arrangement: containerList.Arrangement
          });
          return {
            list: idList,
            svglist: svgIdList,
            framelist: frameList,
            oldextra: containerExtra,
            arrangement: containerList.Arrangement
          };
        }
      }
    }

    console.log("S.ArcSegmentedLine - Pr_GetAdjustShapeList output: null");
    return null;
  }

  OnDisconnect(
    elementId: string,
    container: Instance.Shape.ShapeContainer,
    disconnectData: any,
    reason: any
  ): void {
    console.log("S.ArcSegmentedLine - OnDisconnect input:", { elementId, container, disconnectData, reason });

    if (
      container instanceof Instance.Shape.ShapeContainer &&
      this.zListIndex != null &&
      this.zListIndex >= 0
    ) {
      const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(elementId);
      if (svgElement) {
        GlobalData.optManager.svgObjectLayer.RemoveElement(svgElement);
        GlobalData.optManager.svgObjectLayer.AddElement(svgElement, this.zListIndex);
        this.zListIndex = -1;
      }
    }

    console.log("S.ArcSegmentedLine - OnDisconnect output: completed");
  }

}

export default BaseShape
