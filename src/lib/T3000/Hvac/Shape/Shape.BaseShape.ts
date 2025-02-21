


import HvTimer from '../Helper/HvTimer'
import BaseDrawingObject from './Shape.BaseDrawingObject'
import GlobalData from '../Data/GlobalData'
import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import DefaultEvt from "../Event/DefaultEvt";
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
        SDF.TextAlignToWin(this.TextAlign).just === FileParser.TextJust.TA_LEFT);
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
          dataId = GlobalData.optManager.Table_GetNextTextCell(table, dataId, Resources.Keys.Right_Arrow);
          if (dataId < 0) {
            dataId = GlobalData.optManager.Table_GetNextTextCell(table, 0, Resources.Keys.Right_Arrow);
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
              dataId = GlobalData.optManager.Table_GetNextTextCell(table, dataId, Resources.Keys.Right_Arrow);
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
      const style = Resources.FindStyle(ConstantData.Defines.TextBlockStyle);
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

  GetTextDefault(e: any): any {
    console.log("= S.BaseShape - GetTextDefault input:", { event: e });
    const table = this.GetTable(false);
    let textDefault: any;

    if (table) {
      textDefault = GlobalData.optManager.Table_GetCellTextFormat(table, table.select, e);
    } else {
      textDefault = super.GetTextDefault(e);
    }

    console.log("= S.BaseShape - GetTextDefault output:", textDefault);
    return textDefault;
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
          newShape = new ListManager.Rect(newShapeProps);
          break;
        case ConstantData.SDRShapeTypes.SED_S_RRect:
          newShapeProps.shapeparam = sessionBlock.def.rrectparam;
          newShape = new ListManager.RRect(newShapeProps);
          newShape.moreflags = Utils2.SetFlag(newShape.moreflags, ConstantData.ObjMoreFlags.SED_MF_FixedRR, true);
          shapeParam = sessionBlock.def.rrectparam;
          break;
        case ConstantData.SDRShapeTypes.SED_S_Oval:
        case ConstantData.SDRShapeTypes.SED_S_Circ:
          newShape = new ListManager.Oval(newShapeProps);
          break;
        case ConstantData.SDRShapeTypes.SED_S_Poly:
          const vertexArray = getVertexArrayFunc(this.Frame, shapeParam);
          newShapeProps.VertexArray = vertexArray;
          newShape = new ListManager.Polygon(newShapeProps);
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
        style = Resources.FindStyle(ConstantData.Defines.TextBlockStyle);
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

  // InsertNewTable(e, t, a) {
  //   return this.GetTable(!1) ? GlobalData.optManager.Table_SetProperties(this, e, t) : null == this.ImageURL ||
  //     '' === this.ImageURL ? (
  //     GlobalData.optManager.Table_Create(this.BlockID, e, t, this.TextGrow, a),
  //     !0
  //   ) : void 0
  // }

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

  HandleActionTriggerTrackCommon(e, t, a) {
    var r,
      i,
      n,
      o,
      s,
      l,
      S,
      c,
      //Double ====
      enhance,
      u = GlobalData.optManager.theActionStartX,
      p = GlobalData.optManager.theActionStartY,
      d = e - u,
      D = t - p,
      g = {
        x: e,
        y: t
      },
      h = {},
      m = - 1,
      C = this.GetTable(!1),
      y = this,
      f = GlobalData.optManager.OverrideSnaps(a),
      L = $.extend(!0, {
      }, GlobalData.optManager.theActionBBox),
      I = $.extend(!0, {
      }, GlobalData.optManager.theActionBBox),
      T = function (e) {
        var t;
        if (y.RotationAngle) {
          var a = Utils2.PolyFromRect(e),
            r = - y.RotationAngle / (180 / ConstantData.Geometry.PI);
          t = $.extend(!0, {
          }, e),
            Utils3.RotatePointsAboutCenter(y.Frame, r, a),
            Utils2.GetPolyRect(t, a)
        } else t = e;
        if (Math.floor(t.x) < 0) return !0;
        if (Math.floor(t.y) < 0) return !0;
        if (
          GlobalData.optManager.theContentHeader.flags & ConstantData.ContentHeaderFlags.CT_DA_NoAuto
        ) {
          var i = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, !1);
          if (t.x + t.width > i.dim.x) return !0;
          if (t.y + t.height > i.dim.y) return !0
        }
        return !1
      };
    switch (GlobalData.optManager.theActionTriggerID) {
      case ConstantData.ActionTriggerType.TOPLEFT:
        if (
          S = I.x - e,
          c = I.y - t,
          I.x = e,
          I.y = t,
          I.width += S,
          I.height += c,
          GlobalData.docHandler.documentConfig.enableSnap,
          GlobalData.optManager.theActionLockAspectRatio ? (
            I.width < 0 &&
            (
              I.x = GlobalData.optManager.theActionBBox.x + GlobalData.optManager.theActionBBox.width,
              I.width = - I.width
            ),
            r = I.width * GlobalData.optManager.theActionAspectRatioHeight / GlobalData.optManager.theActionAspectRatioWidth,
            I.height < 0 ? (
              I.y = GlobalData.optManager.theActionBBox.y + GlobalData.optManager.theActionBBox.height,
              I.height = r
            ) : (
              I.y = GlobalData.optManager.theActionBBox.y + GlobalData.optManager.theActionBBox.height - r,
              I.height = r
            ),
            this.PinProportional(I)
          ) : (
            I.width < 0 &&
            (
              I.x = GlobalData.optManager.theActionBBox.x + GlobalData.optManager.theActionBBox.width,
              I.width = - I.width
            ),
            I.height < 0 &&
            (
              I.y = GlobalData.optManager.theActionBBox.y + GlobalData.optManager.theActionBBox.height,
              I.height = - I.height
            )
          ),
          T(I)
        ) break;
        GlobalData.optManager.theActionNewBBox = $.extend(!0, {
        }, I),
          this.HandleActionTriggerCallResize(GlobalData.optManager.theActionNewBBox, !0, g);
        break;
      case ConstantData.ActionTriggerType.TOPCENTER:
        if (
          c = I.y - t,
          I.y = t,
          I.height = I.height + c,
          GlobalData.docHandler.documentConfig.enableSnap,
          GlobalData.optManager.theActionLockAspectRatio ? (
            I.height < 0 &&
            (
              I.y = GlobalData.optManager.theActionBBox.y + GlobalData.optManager.theActionBBox.height,
              I.height = - I.height
            ),
            i = I.height * GlobalData.optManager.theActionAspectRatioWidth / GlobalData.optManager.theActionAspectRatioHeight,
            I.x = GlobalData.optManager.theActionBBox.x + GlobalData.optManager.theActionBBox.width / 2 - i / 2,
            I.width = i,
            this.PinProportional(I)
          ) : I.height < 0 &&
          (
            I.y = GlobalData.optManager.theActionBBox.y + GlobalData.optManager.theActionBBox.height,
            I.height = - I.height
          ),
          T(I)
        ) break;
        GlobalData.optManager.theActionNewBBox = $.extend(!0, {
        }, I),
          this.HandleActionTriggerCallResize(GlobalData.optManager.theActionNewBBox, !0, g);
        break;
      case ConstantData.ActionTriggerType.TOPRIGHT:
        if (
          c = I.y - t,
          I.y = t,
          I.height = I.height + c,
          I.width = e - I.x,
          GlobalData.docHandler.documentConfig.enableSnap,
          GlobalData.optManager.theActionLockAspectRatio ? (
            I.width < 0 &&
            (I.x = e, I.width = - I.width),
            r = I.width * GlobalData.optManager.theActionAspectRatioHeight / GlobalData.optManager.theActionAspectRatioWidth,
            I.height < 0 ? (
              I.y = GlobalData.optManager.theActionBBox.y + GlobalData.optManager.theActionBBox.height,
              I.height = r
            ) : (
              I.y = GlobalData.optManager.theActionBBox.y + GlobalData.optManager.theActionBBox.height - r,
              I.height = r
            ),
            I.height = r,
            this.PinProportional(I)
          ) : (
            I.width < 0 &&
            (I.x = e, I.width = - I.width),
            I.height < 0 &&
            (
              I.y = GlobalData.optManager.theActionBBox.y + GlobalData.optManager.theActionBBox.height,
              I.height = - I.height
            )
          ),
          T(I)
        ) break;
        GlobalData.optManager.theActionNewBBox = $.extend(!0, {
        }, I),
          this.HandleActionTriggerCallResize(GlobalData.optManager.theActionNewBBox, !0, g);
        break;
      case ConstantData.ActionTriggerType.CENTERRIGHT:
        if (
          I.width = e - I.x,
          GlobalData.docHandler.documentConfig.enableSnap,
          GlobalData.optManager.theActionLockAspectRatio ? (
            I.width < 0 &&
            (I.x = e, I.width = - I.width),
            r = I.width * GlobalData.optManager.theActionAspectRatioHeight / GlobalData.optManager.theActionAspectRatioWidth,
            I.y = GlobalData.optManager.theActionBBox.y + GlobalData.optManager.theActionBBox.height / 2 - r / 2,
            I.height = r,
            this.PinProportional(I)
          ) : I.width < 0 &&
          (I.x = e, I.width = - I.width),
          T(I)
        ) break;
        GlobalData.optManager.theActionNewBBox = $.extend(!0, {
        }, I),
          this.HandleActionTriggerCallResize(GlobalData.optManager.theActionNewBBox, !0, g);
        break;
      case ConstantData.ActionTriggerType.BOTTOMRIGHT:
        if (
          I.width = e - I.x,
          I.height = t - I.y,
          GlobalData.docHandler.documentConfig.enableSnap,
          GlobalData.optManager.theActionLockAspectRatio ? (
            I.width < 0 &&
            (I.x = e, I.width = - I.width),
            r = I.width * GlobalData.optManager.theActionAspectRatioHeight / GlobalData.optManager.theActionAspectRatioWidth,
            I.height < 0 &&
            (I.y = L.y - r),
            I.height = r,
            this.PinProportional(I)
          ) : (
            I.width < 0 &&
            (I.x = e, I.width = - I.width),
            I.height < 0 &&
            (I.y = t, I.height = - I.height)
          ),
          T(I)
        ) break;
        GlobalData.optManager.theActionNewBBox = $.extend(!0, {
        }, I),
          this.HandleActionTriggerCallResize(GlobalData.optManager.theActionNewBBox, !0, g);
        break;
      case ConstantData.ActionTriggerType.BOTTOMCENTER:
        if (
          I.height = t - I.y,
          GlobalData.docHandler.documentConfig.enableSnap,
          GlobalData.optManager.theActionLockAspectRatio ? (
            I.height < 0 &&
            (I.y = t, I.height = - I.height),
            i = I.height * GlobalData.optManager.theActionAspectRatioWidth / GlobalData.optManager.theActionAspectRatioHeight,
            I.x = GlobalData.optManager.theActionBBox.x + GlobalData.optManager.theActionBBox.width / 2 - i / 2,
            I.width = i,
            this.PinProportional(I)
          ) : I.height < 0 &&
          (I.y = t, I.height = - I.height),
          T(I)
        ) break;
        GlobalData.optManager.theActionNewBBox = $.extend(!0, {
        }, I),
          this.HandleActionTriggerCallResize(GlobalData.optManager.theActionNewBBox, !0, g);
        break;
      case ConstantData.ActionTriggerType.TABLE_SELECT:
      case ConstantData.ActionTriggerType.TABLE_ROWSELECT:
      case ConstantData.ActionTriggerType.TABLE_COLSELECT:
        if (null == C) break;
        C = this.GetTable(!0),
          C = this.GetTable(!0),
          g.x = e - this.trect.x,
          g.y = t - this.trect.y,
          GlobalData.optManager.Table_Select(this, C, g, !0, GlobalData.optManager.theActionTriggerID, !1);
        break;
      case ConstantData.ActionTriggerType.MOVEPOLYSEG:
        g.x = e,
          g.y = t,
          R = GlobalData.optManager.GetObjectPtr(this.BlockID, !1);
        var b = $.extend(!0, {
        }, R.Frame);
        GlobalData.docHandler.documentConfig.enableSnap &&
          !f &&
          (g = GlobalData.docHandler.SnapToGrid(g)),
          GlobalData.optManager.ShapeToPolyLine(this.BlockID, !0, !0),
          (R = GlobalData.optManager.GetObjectPtr(this.BlockID, !1)).MovePolySeg(
            GlobalData.optManager.theActionSVGObject,
            g.x,
            g.y,
            GlobalData.optManager.theActionTriggerID,
            GlobalData.optManager.theActionTriggerData
          ),
          GlobalData.optManager.PolyLineToShape(R.BlockID, !0);
        if (
          s = (R = GlobalData.optManager.GetObjectPtr(this.BlockID, !1)).trect,
          l = this.TextGrow === ConstantData.TextGrowBehavior.HORIZONTAL ? GlobalData.optManager.theContentHeader.MaxWorkDim.x : s.width,
          GlobalData.optManager.theActionSVGObject &&
          GlobalData.optManager.theActionSVGObject.textElem
        ) {
          var M = GlobalData.optManager.theActionSVGObject.textElem;
          theMinDim = M.CalcTextFit(l);
          var P = theMinDim.width;
          if (theMinDim.height > s.height || P > s.width) {
            GlobalData.optManager.ShapeToPolyLine(this.BlockID, !0, !0);
            var R = GlobalData.optManager.GetObjectPtr(this.BlockID, !1);
            g.x = GlobalData.optManager.theActionTableLastX,
              g.y = GlobalData.optManager.theActionTableLastY,
              R.MovePolySeg(
                GlobalData.optManager.theActionSVGObject,
                g.x,
                g.y,
                GlobalData.optManager.theActionTriggerID,
                GlobalData.optManager.theActionTriggerData
              ),
              GlobalData.optManager.PolyLineToShape(this.BlockID, !0),
              R = GlobalData.optManager.GetObjectPtr(this.BlockID, !1)
          }
        }
        if (
          GlobalData.optManager.theActionNewBBox = $.extend(!0, {
          }, R.Frame),
          R.HandleActionTriggerCallResize(
            GlobalData.optManager.theActionNewBBox,
            ConstantData.ActionTriggerType.MOVEPOLYSEG,
            g
          ),
          GlobalData.optManager.theActionTableLastX = g.x,
          GlobalData.optManager.theActionTableLastY = g.y,
          R.RotationAngle
        ) {
          var A = GlobalData.optManager.theActionSVGObject.GetRotation(),
            _ = $.extend(!0, {
            }, R.Frame),
            E = (
              h = GlobalData.optManager.svgDoc.CalculateRotatedOffsetForResize(b, _, A),
              GlobalData.optManager.theActionSVGObject.GetPos()
            );
          E.x += h.x,
            E.y += h.y,
            GlobalData.optManager.theActionSVGObject.SetPos(E.x, E.y),
            GlobalData.optManager.theActionBBox.x += h.x,
            GlobalData.optManager.theActionBBox.y += h.y,
            GlobalData.optManager.theActionStartX += h.x,
            GlobalData.optManager.theActionStartY += h.y,
            R.Frame.x += h.x,
            R.Frame.y += h.y
        }
        break;
      case ConstantData.ActionTriggerType.TABLE_COL:
        if (null == C) break;
        C = this.GetTable(!0),
          g.x = e,
          g.y = t,
          GlobalData.docHandler.documentConfig.enableSnap &&
          !f &&
          (g = GlobalData.docHandler.SnapToGrid(g)),
          d = g.x - u;
        var w = GlobalData.optManager.Table_GetColumnAndSegment(GlobalData.optManager.theActionTriggerData);
        this.objecttype === ConstantData.ObjectTypes.SD_OBJT_SWIMLANE_COLS &&
          this.RotationAngle &&
          (d = - d, w.column++),
          n = GlobalData.optManager.Table_GrowColumn(this, C, w.column, d, this.TextGrow, !1, !1, !1, this.IsSwimlane());
        $.extend(!0, {
        }, this.trect);
        var F = {
          column: w.column,
          theDeltaX: d
        };
        Collab.SendSVGEvent(
          this.BlockID,
          ConstantData.CollabSVGEventTypes.Table_GrowColumn,
          null,
          F
        ),
          (o = Utils1.DeepCopy(this)).trect.width = n.x,
          o.trect.height = n.y,
          o.TRectToFrame(o.trect, !0),
          n.x = o.Frame.width,
          n.y = o.Frame.height;
        var v = I.width;
        if (
          I.width = n.x,
          I.height = n.y,
          this.objecttype === ConstantData.ObjectTypes.SD_OBJT_SWIMLANE_COLS &&
          this.RotationAngle &&
          (I.x -= I.width - v),
          GlobalData.optManager.theActionLockAspectRatio ? (
            I.width < 0 &&
            (I.x = e, I.width = - I.width),
            r = I.width * GlobalData.optManager.theActionAspectRatioHeight / GlobalData.optManager.theActionAspectRatioWidth,
            I.y = GlobalData.optManager.theActionBBox.y + GlobalData.optManager.theActionBBox.height / 2 - r / 2,
            I.height = r,
            this.PinProportional(I),
            m = ConstantData.ActionTriggerType.TABLE_COL
          ) : I.width < 0 &&
          (I.x = e, I.width = - I.width),
          T(I)
        ) {
          d = GlobalData.optManager.theActionTableLastX - u,
            GlobalData.optManager.Table_GrowColumn(this, C, w.column, d, this.TextGrow, !1, !0, !1);
          break
        }
        GlobalData.optManager.theActionNewBBox = $.extend(!0, {
        }, I),
          GlobalData.optManager.theActionTableLastX = e,
          GlobalData.optManager.theActionTableLastY = t,
          this.HandleActionTriggerCallResize(GlobalData.optManager.theActionNewBBox, m, g);
        break;
      case ConstantData.ActionTriggerType.TABLE_ROW:
        if (null == C) break;
        C = this.GetTable(!0),
          g.x = e,
          g.y = t,
          GlobalData.docHandler.documentConfig.enableSnap &&
          !f &&
          (g = GlobalData.docHandler.SnapToGrid(g));
        var G = GlobalData.optManager.Table_GetRowAndSegment(GlobalData.optManager.theActionTriggerData);
        if (
          D = g.y - p,
          n = GlobalData.optManager.Table_GrowRow(C, G.row, D, !1),
          (o = Utils1.DeepCopy(this)).trect.width = n.x,
          o.trect.height = n.y,
          o.TRectToFrame(o.trect, !0),
          n.x = o.Frame.width,
          n.y = o.Frame.height,
          I.height = n.y,
          GlobalData.optManager.theActionLockAspectRatio ? (
            I.height < 0 &&
            (I.y = t, I.height = - I.height),
            i = I.height * GlobalData.optManager.theActionAspectRatioWidth / GlobalData.optManager.theActionAspectRatioHeight,
            I.x = GlobalData.optManager.theActionBBox.x + GlobalData.optManager.theActionBBox.width / 2 - i / 2,
            I.width = i,
            this.PinProportional(I),
            m = ConstantData.ActionTriggerType.TABLE_ROW
          ) : I.height < 0 &&
          (I.y = t, I.height = - I.height),
          T(I)
        ) {
          D = GlobalData.optManager.theActionTableLastY - p,
            GlobalData.optManager.Table_GrowRow(C, G.row, D, !1);
          break
        }
        GlobalData.optManager.theActionNewBBox = $.extend(!0, {
        }, I),
          GlobalData.optManager.theActionTableLastX = e,
          GlobalData.optManager.theActionTableLastY = t,
          this.HandleActionTriggerCallResize(GlobalData.optManager.theActionNewBBox, m, g);
        break;
      case ConstantData.ActionTriggerType.BOTTOMLEFT:
        if (
          I.height = t - I.y,
          S = I.x - e,
          I.x = e,
          I.width += S,
          GlobalData.docHandler.documentConfig.enableSnap,
          GlobalData.optManager.theActionLockAspectRatio ? (
            I.width < 0 &&
            (
              I.x = GlobalData.optManager.theActionBBox.x + GlobalData.optManager.theActionBBox.width,
              I.width = - I.width
            ),
            r = I.width * GlobalData.optManager.theActionAspectRatioHeight / GlobalData.optManager.theActionAspectRatioWidth,
            I.height < 0 &&
            (I.y = L.y - r),
            I.height = r,
            this.PinProportional(I)
          ) : (
            I.width < 0 &&
            (
              I.x = GlobalData.optManager.theActionBBox.x + GlobalData.optManager.theActionBBox.width,
              I.width = - I.width
            ),
            I.height < 0 &&
            (I.y = t, I.height = - I.height)
          ),
          T(I)
        ) break;
        GlobalData.optManager.theActionNewBBox = $.extend(!0, {
        }, I),
          this.HandleActionTriggerCallResize(GlobalData.optManager.theActionNewBBox, !0, g);
        break;
      case ConstantData.ActionTriggerType.CENTERLEFT:
        if (
          S = I.x - e,
          I.x = e,
          I.width += S,
          GlobalData.docHandler.documentConfig.enableSnap,
          GlobalData.optManager.theActionLockAspectRatio ? (
            I.width < 0 &&
            (
              I.x = GlobalData.optManager.theActionBBox.x + GlobalData.optManager.theActionBBox.width,
              I.width = - I.width
            ),
            r = I.width * GlobalData.optManager.theActionAspectRatioHeight / GlobalData.optManager.theActionAspectRatioWidth,
            I.y = GlobalData.optManager.theActionBBox.y + GlobalData.optManager.theActionBBox.height / 2 - r / 2,
            I.height = r,
            this.PinProportional(I)
          ) : I.width < 0 &&
          (
            I.x = GlobalData.optManager.theActionBBox.x + GlobalData.optManager.theActionBBox.width,
            I.width = - I.width
          ),
          T(I)
        ) break;
        GlobalData.optManager.theActionNewBBox = $.extend(!0, {
        }, I),
          this.HandleActionTriggerCallResize(GlobalData.optManager.theActionNewBBox, !0, g);
        break;
      case ConstantData.ActionTriggerType.CONTAINER_ADJ:
        var N,
          k,
          U,
          J;
        for (
          N = GlobalData.optManager.theDragElementList.length,
          GlobalData.optManager.theActionContainerArrangement === ConstantData.ContainerListArrangements.Column ? (
            - D > GlobalData.optManager.theActionOldExtra &&
            (D = - GlobalData.optManager.theActionOldExtra),
            GlobalData.optManager.theActionTableLastY = D,
            d = 0
          ) : (
            - d > GlobalData.optManager.theActionOldExtra &&
            (d = - GlobalData.optManager.theActionOldExtra),
            GlobalData.optManager.theActionTableLastY = d,
            D = 0
          ),
          k = 0;
          k < N;
          k++
        ) J = GlobalData.optManager.theDragBBoxList[k],
          (U = GlobalData.optManager.GetSVGDragElement(k)) &&
          U.SetPos(J.x + d, J.y + D);
        break;
      case ConstantData.ActionTriggerType.ROTATE:
        var x = e - GlobalData.optManager.theRotatePivotX,
          O = t - GlobalData.optManager.theRotatePivotY,
          B = 0;
        0 === x &&
          0 === O ? B = 0 : 0 === x ? B = O > 0 ? 90 : 270 : x >= 0 &&
            O >= 0 ? (B = Math.atan(O / x), B *= 180 / ConstantData.Geometry.PI) : x < 0 &&
              O >= 0 ||
              x < 0 &&
              O < 0 ? B = 180 + (B = Math.atan(O / x)) * (180 / ConstantData.Geometry.PI) : x >= 0 &&
              O < 0 &&
          (B = 360 + (B = Math.atan(O / x)) * (180 / ConstantData.Geometry.PI)),
          GlobalData.docHandler.documentConfig.enableSnap &&
          !f &&
          (
            enhance = GlobalData.optManager.EnhanceSnaps(a),
            B = enhance ? Math.round(B / GlobalData.optManager.enhanceRotateSnap) * GlobalData.optManager.enhanceRotateSnap : Math.round(B / GlobalData.optManager.theRotateSnap) * GlobalData.optManager.theRotateSnap
          );
        var H = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, !1, !1, !0, null),
          V = - B / (180 / ConstantData.Geometry.PI),
          j = {};
        if (
          Utils3.RotatePointsAboutCenter(this.Frame, V, H),
          Utils2.GetPolyRect(j, H),
          j.x < 0
        ) break;
        if (j.y < 0) break;
        if (
          GlobalData.optManager.theContentHeader.flags & ConstantData.ContentHeaderFlags.CT_DA_NoAuto
        ) {
          var z = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, !1);
          if (j.x + j.width > z.dim.x) break;
          if (j.y + j.height > z.dim.y) break
        }
        GlobalData.optManager.theRotateEndRotation = B,
          this.Rotate(GlobalData.optManager.theActionSVGObject, B);
        var W = GlobalData.optManager.SD_GetVisioTextChild(this.BlockID);
        if (W >= 0) {
          var q = GlobalData.optManager.GetObjectPtr(W, !0);
          if (q) {
            var K = GlobalData.optManager.svgObjectLayer.GetElementByID(q.BlockID);
            K &&
              (B -= q.VisioRotationDiff, q.Rotate(K, B))
          }
        }
        break;
      case ConstantData.ActionTriggerType.DIMENSION_LINE_ADJ:
        this.DimensionLineDeflectionAdjust(
          GlobalData.optManager.theActionSVGObject,
          e,
          t,
          GlobalData.optManager.theActionTriggerID,
          GlobalData.optManager.theActionTriggerData
        )
    }
  }

  HandleActionTriggerCallResize(newFrame, triggerType, event, prevFrame) {
    console.log("= S.BaseShape - HandleActionTriggerCallResize input:", { newFrame, triggerType, event, prevFrame });

    let table, newSize, textFit, textElem, visioTextChild, visioTextChildObj, visioTextChildElem;
    let isLineThickness = false;
    let isLineLength = false;
    this.prevBBox = prevFrame ? $.extend(true, {}, prevFrame) : $.extend(true, {}, this.Frame);
    const originalFrame = $.extend(false, {}, this.Frame);

    // Ensure minimum dimensions
    newFrame.width < ConstantData.Defines.SED_MinDim && (newFrame.width = ConstantData.Defines.SED_MinDim);
    newFrame.height < ConstantData.Defines.SED_MinDim && (newFrame.height = ConstantData.Defines.SED_MinDim);

    this.UpdateFrame(newFrame);

    if (triggerType === ConstantData.ActionTriggerType.LINELENGTH) {
      triggerType = 0;
      isLineLength = true;
    }

    if (triggerType === ConstantData.ActionTriggerType.LINE_THICKNESS) {
      triggerType = 0;
      isLineThickness = true;
    }

    if (GlobalData.optManager.theActionStoredObjectID === this.BlockID && event) {
      GlobalData.optManager.UpdateDisplayCoordinates(newFrame, event, ConstantData.CursorTypes.Grow, this);
    }

    let shouldResize = true;
    table = this.GetTable(false);

    if (triggerType === -1) {
      shouldResize = false;
      triggerType = true;
    } else if (triggerType === ConstantData.ActionTriggerType.TABLE_EDIT) {
      shouldResize = false;
      triggerType = false;
    }

    if (table && shouldResize) {
      let widthDiff = newFrame.width - GlobalData.optManager.theActionBBox.width;
      if (!triggerType) {
        GlobalData.optManager.theActionTable = Utils1.DeepCopy(table);
      }
      if (Utils2.IsEqual(widthDiff, 0) && !isLineThickness) {
        widthDiff = null;
        this.trect.width = table.wd;
        this.TRectToFrame(this.trect, triggerType || isLineLength);
      } else {
        widthDiff = this.trect.width;
      }

      let heightDiff = newFrame.height - GlobalData.optManager.theActionBBox.height;
      if (Utils2.IsEqual(heightDiff, 0) && !isLineThickness) {
        heightDiff = null;
        this.trect.height = table.ht;
        this.TRectToFrame(this.trect, triggerType || isLineLength);
      } else {
        heightDiff = this.trect.height;
      }

      switch (triggerType) {
        case ConstantData.ActionTriggerType.TABLE_ROW:
          heightDiff = null;
          break;
        case ConstantData.ActionTriggerType.TABLE_COL:
          widthDiff = null;
          break;
      }

      if (widthDiff || heightDiff) {
        const originalHeight = GlobalData.optManager.theActionTable.ht;
        table = this.GetTable(true);
        newSize = GlobalData.optManager.Table_Resize(this, table, GlobalData.optManager.theActionTable, widthDiff, heightDiff);

        if (!Utils2.IsEqual(newSize.y, originalHeight) && (triggerType || isLineThickness)) {
          const tempShape = Utils1.DeepCopy(this);
          tempShape.trect.width = newSize.x;
          tempShape.trect.height = newSize.y;
          tempShape.TRectToFrame(tempShape.trect, true);
          GlobalData.optManager.theActionNewBBox.height = tempShape.Frame.height;
        }

        if (newSize.x - this.trect.width > 0.1 || newSize.y - this.trect.height > 0.1 || (!Utils2.IsEqual(newSize.y, originalHeight) && isLineLength)) {
          const tempRect = {
            x: this.trect.x,
            y: this.trect.y,
            width: newSize.x,
            height: newSize.y
          };
          this.TRectToFrame(tempRect, triggerType || isLineLength);
          newFrame = $.extend(false, {}, this.Frame);

          if (newSize.x - this.trect.width > 0.1 && newSize.y - this.trect.height > 0.1 || !triggerType) {
            return;
          }
          GlobalData.optManager.theActionNewBBox = $.extend(false, {}, this.Frame);
        }
      }
    } else if (this.DataID !== -1 && !(this.TextFlags & ConstantData.TextFlags.SED_TF_AttachA || this.TextFlags & ConstantData.TextFlags.SED_TF_AttachB)) {
      const svgElem = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
      if (svgElem) {
        textElem = svgElem.textElem;
        const textRect = this.trect;
        const maxWidth = this.TextGrow === ConstantData.TextGrowBehavior.HORIZONTAL ? GlobalData.optManager.theContentHeader.MaxWorkDim.x : textRect.width;
        textFit = textElem ? textElem.CalcTextFit(maxWidth) : { width: 0, height: 0 };

        const trimmedWidth = Utils2.TrimDP(textFit.width, GlobalData.docHandler.rulerSettings.dp);
        const trimmedHeight = Utils2.TrimDP(textFit.height, GlobalData.docHandler.rulerSettings.dp);
        const roundedWidth = Utils2.TrimDP(textFit.width, 0);
        const roundedHeight = Utils2.TrimDP(textFit.height, 0);
        const roundedTextRectHeight = Utils2.TrimDP(textRect.height, 0);
        const roundedTextRectWidth = Utils2.TrimDP(textRect.width, 0);

        if (roundedHeight !== 0 && Math.abs(roundedTextRectHeight - roundedHeight) <= 1) {
          roundedHeight = roundedTextRectHeight;
        }
        if (roundedWidth !== 0 && Math.abs(roundedTextRectWidth - roundedWidth) <= 1) {
          roundedWidth = roundedTextRectWidth;
        }

        if (roundedHeight > roundedTextRectHeight || roundedWidth > roundedTextRectWidth) {
          if (!triggerType) {
            if (trimmedHeight > (textRect = Utils1.DeepCopy(this.trect)).height) {
              textRect.height = trimmedHeight;
            }
            if (trimmedWidth > textRect.width) {
              textRect.width = trimmedWidth;
            }
            this.TRectToFrame(textRect, triggerType);
          }
          this.UpdateFrame(originalFrame);
          return;
        }
      }
    }

    if (triggerType && GlobalData.optManager.theActionSVGObject && GlobalData.optManager.theActionStoredObjectID === this.BlockID) {
      const offset = this.Resize(GlobalData.optManager.theActionSVGObject, GlobalData.optManager.theActionNewBBox, this, triggerType);
      GlobalData.optManager.theActionBBox.x += offset.x;
      GlobalData.optManager.theActionBBox.y += offset.y;
      GlobalData.optManager.theActionStartX += offset.x;
      GlobalData.optManager.theActionStartY += offset.y;
      this.Frame.x += offset.x;
      this.Frame.y += offset.y;
      this.inside.x += offset.x;
      this.inside.y += offset.y;
      this.trect.x += offset.x;
      this.trect.y += offset.y;
    }

    visioTextChild = GlobalData.optManager.SD_GetVisioTextChild(this.BlockID);
    if (visioTextChild >= 0) {
      visioTextChildObj = GlobalData.optManager.GetObjectPtr(visioTextChild, true);
      if (visioTextChildObj && visioTextChildObj.hookdisp.x === 0 && visioTextChildObj.hookdisp.y === 0 && this.ShapeType !== ConstantData.ShapeType.GROUPSYMBOL) {
        visioTextChildObj.sizedim.width = this.trect.width;
        visioTextChildObj.sizedim.height = this.trect.height;
        visioTextChildObj.HandleActionTriggerCallResize(this.trect, 0, null);
        visioTextChildElem = GlobalData.optManager.svgObjectLayer.GetElementByID(visioTextChildObj.BlockID);
        if (visioTextChildElem) {
          visioTextChildObj.Resize(visioTextChildElem, visioTextChildObj.Frame, visioTextChildObj);
        }
      }
    }

    console.log("= S.BaseShape - HandleActionTriggerCallResize output:", { newFrame, triggerType, event, prevFrame });
  }

  HandleActionTriggerDoAutoScroll() {
    console.log("= S.BaseShape - HandleActionTriggerDoAutoScroll input");

    GlobalData.optManager.autoScrollTimerID = GlobalData.optManager.autoScrollTimer.setTimeout('HandleActionTriggerDoAutoScroll', 100);
    let coords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(GlobalData.optManager.autoScrollXPos, GlobalData.optManager.autoScrollYPos);

    this.PinAction(coords);
    coords = GlobalData.optManager.DoAutoGrowDrag(coords);
    GlobalData.docHandler.ScrollToPosition(coords.x, coords.y);

    if (GlobalData.optManager.theActionTriggerID !== ConstantData.ActionTriggerType.ROTATE && GlobalData.optManager.theRotateObjectRadians) {
      const frame = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theActionStoredObjectID, false).Frame;
      const center = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
      const rotatedPoint = GlobalData.optManager.RotatePointAroundPoint(center, coords, GlobalData.optManager.theRotateObjectRadians);
      coords.x = rotatedPoint.x;
      coords.y = rotatedPoint.y;
    }

    this.HandleActionTriggerTrackCommon(coords.x, coords.y);

    console.log("= S.BaseShape - HandleActionTriggerDoAutoScroll output", coords);
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
        const dynamicGuides = new ListManager.Dynamic_Guides();
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

  LM_ActionTrack(event) {
    console.log('= S.BaseShape - LM_ActionTrack input:', event);

    Utils2.StopPropagationAndDefaults(event);
    if (GlobalData.optManager.theActionStoredObjectID === -1) return false;

    const actionTriggerType = ConstantData.ActionTriggerType;
    const storedObject = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theActionStoredObjectID, false);

    if (GlobalData.optManager.theActionTriggerID !== actionTriggerType.ROTATE) {
      storedObject.SetDimensionLinesVisibility(GlobalData.optManager.theActionSVGObject, false);
    }

    const frame = storedObject.Frame;
    const coords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(event.gesture.center.clientX, event.gesture.center.clientY);
    this.PinAction(coords);
    const adjustedCoords = GlobalData.optManager.DoAutoGrowDrag(coords);
    const overrideSnaps = GlobalData.optManager.OverrideSnaps(event);
    let applySnaps = false;

    switch (GlobalData.optManager.theActionTriggerID) {
      case actionTriggerType.MODIFYSHAPE:
      case actionTriggerType.ROTATE:
        applySnaps = true;
        break;
    }

    let dynamicGuides = null;
    if (!applySnaps && !overrideSnaps) {
      dynamicGuides = this.ActionApplySnaps(adjustedCoords, GlobalData.optManager.theActionTriggerID);
    }

    let x = adjustedCoords.x;
    let y = adjustedCoords.y;
    const center = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
    let rotatedPoint = {};

    if (GlobalData.optManager.theActionTriggerID !== actionTriggerType.ROTATE && GlobalData.optManager.theRotateObjectRadians) {
      rotatedPoint = GlobalData.optManager.RotatePointAroundPoint(center, { x, y }, GlobalData.optManager.theRotateObjectRadians);
      x = rotatedPoint.x;
      y = rotatedPoint.y;
      adjustedCoords.x = x;
      adjustedCoords.y = y;
    }

    if (this.AutoScrollCommon(event, true, 'HandleActionTriggerDoAutoScroll')) {
      const duringTrackCoords = this.LM_ActionDuringTrack(adjustedCoords);
      this.HandleActionTriggerTrackCommon(duringTrackCoords.x, duringTrackCoords.y, event);

      if (GlobalData.optManager.theActionTriggerID !== actionTriggerType.ROTATE) {
        storedObject.SetDimensionLinesVisibility(GlobalData.optManager.theActionSVGObject, true);
      }

      if (dynamicGuides) {
        const originalFrame = Utils1.DeepCopy(this.Frame);
        this.Frame = GlobalData.optManager.theActionNewBBox;
        const snapRect = this.GetSnapRect();
        this.Frame = originalFrame;
        GlobalData.optManager.DynamicSnaps_UpdateGuides(dynamicGuides, this.BlockID, snapRect);
      }
    }

    console.log('= S.BaseShape - LM_ActionTrack output:', { adjustedCoords, dynamicGuides });
  }

  LM_ActionRelease(event, triggerData) {
    console.log('= S.BaseShape - LM_ActionRelease input:', { event, triggerData });

    try {
      const isGanttChart = this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_CHART;
      const isTimeline = this.objecttype === ConstantData.ObjectTypes.SD_OBJT_NG_TIMELINE;
      let shouldUpdateGeometry = false;
      let shouldUpdateTimeline = false;
      const storedObject = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theActionStoredObjectID, false);

      if (!storedObject) return;

      if (!triggerData) {
        GlobalData.optManager.unbindActionClickHammerEvents();
        this.ResetAutoScrollTimer();

        if (!GlobalData.optManager.theActionSVGObject || GlobalData.optManager.theActionStoredObjectID < 0) return;

        let collabMessage = null;
        let shouldSendCollabMessage = false;

        if (Collab.AllowMessage()) {
          collabMessage = {
            BlockID: GlobalData.optManager.theActionStoredObjectID,
            ActionTriggerID: GlobalData.optManager.theActionTriggerID,
            ActionData: GlobalData.optManager.theActionTriggerData,
            Frame: Utils1.DeepCopy(storedObject.Frame),
            theRotateEndRotation: GlobalData.optManager.theRotateEndRotation
          };
          shouldSendCollabMessage = true;
        }

        switch (GlobalData.optManager.theActionTriggerID) {
          case ConstantData.ActionTriggerType.TABLE_ROW:
            const tableRow = storedObject.GetTable(false);
            if (tableRow) {
              const rowSegment = GlobalData.optManager.Table_GetRowAndSegment(GlobalData.optManager.theActionTriggerData);
              GlobalData.optManager.Table_SelectRowDivider(storedObject, rowSegment.row, false);
            }
            shouldUpdateGeometry = true;
            break;

          case ConstantData.ActionTriggerType.TABLE_COL:
            const tableCol = storedObject.GetTable(false);
            if (tableCol) {
              const colSegment = GlobalData.optManager.Table_GetColumnAndSegment(GlobalData.optManager.theActionTriggerData);
              let column = colSegment.column;
              if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_SWIMLANE_COLS && this.RotationAngle) {
                column++;
              }
              if (column >= 0) {
                GlobalData.optManager.Table_SelectColDivider(storedObject, column, false);
                if (shouldSendCollabMessage) {
                  collabMessage.ColumnWidth = tableCol.cols[colSegment.column].x;
                  if (colSegment.column > 0) {
                    collabMessage.ColumnWidth -= tableCol.cols[colSegment.column - 1].x;
                  }
                }
              }
            }
            shouldUpdateGeometry = true;
            break;

          case ConstantData.ActionTriggerType.TABLE_SELECT:
          case ConstantData.ActionTriggerType.TABLE_ROWSELECT:
          case ConstantData.ActionTriggerType.TABLE_COLSELECT:
            shouldUpdateGeometry = true;
            if (!Collab.IsPrimary()) {
              collabMessage = null;
            }
            break;

          case ConstantData.ActionTriggerType.MOVEPOLYSEG:
            shouldUpdateGeometry = true;
            if (shouldSendCollabMessage) {
              const polyObject = GlobalData.optManager.GetObjectPtr(this.BlockID, false);
              collabMessage.left_sindent = polyObject.left_sindent;
              collabMessage.right_sindent = polyObject.right_sindent;
              collabMessage.top_sindent = polyObject.top_sindent;
              collabMessage.bottom_sindent = polyObject.bottom_sindent;
              collabMessage.tindent = Utils1.DeepCopy(polyObject.tindent);
              if (polyObject.polylist) {
                collabMessage.polylist = Utils1.DeepCopy(polyObject.polylist);
              }
              if (polyObject.VertexArray) {
                collabMessage.VertexArray = Utils1.DeepCopy(polyObject.VertexArray);
              }
            }
            break;

          case ConstantData.ActionTriggerType.DIMENSION_LINE_ADJ:
            if (shouldSendCollabMessage) {
              collabMessage.dimensionDeflectionH = this.dimensionDeflectionH;
              collabMessage.dimensionDeflectionV = this.dimensionDeflectionV;
            }
            break;

          case ConstantData.ActionTriggerType.CONTAINER_ADJ:
            if (shouldSendCollabMessage) {
              collabMessage.theActionTableLastY = GlobalData.optManager.theActionTableLastY;
            }
            break;
        }

        if (shouldSendCollabMessage && collabMessage) {
          Collab.BuildMessage(ConstantData.CollabMessages.Action_Shape, collabMessage, false);
        }

        storedObject.SetDimensionLinesVisibility(GlobalData.optManager.theActionSVGObject, false);
      } else if (GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.MOVEPOLYSEG) {
        shouldUpdateGeometry = true;
      }

      if (GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.CONTAINER_ADJ) {
        GlobalData.optManager.theMoveList = [];
        GlobalData.optManager.theDragElementList.length = 0;
        GlobalData.optManager.theDragBBoxList.length = 0;
        GlobalData.optManager.theActionOldExtra = 0;
        this.Pr_UpdateExtra(GlobalData.optManager.theActionTableLastY);
      } else if (GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.ROTATE) {
        GlobalData.optManager.theRotateEndRotation %= 360;
        GlobalData.optManager.SetObjectAttributes(GlobalData.optManager.theActionStoredObjectID, {
          RotationAngle: GlobalData.optManager.theRotateEndRotation
        });

        const visioTextChild = GlobalData.optManager.SD_GetVisioTextChild(this.BlockID);
        if (visioTextChild >= 0) {
          const visioTextChildObj = GlobalData.optManager.GetObjectPtr(visioTextChild, true);
          if (visioTextChildObj) {
            let rotationDiff = 0;
            if (visioTextChildObj.VisioRotationDiff) {
              rotationDiff = -visioTextChildObj.VisioRotationDiff;
            }
            GlobalData.optManager.SetObjectAttributes(visioTextChild, {
              RotationAngle: GlobalData.optManager.theRotateEndRotation + rotationDiff
            });
            GlobalData.optManager.SetObjectFrame(visioTextChild, visioTextChildObj.Frame);
          }
        }

        GlobalData.optManager.SetObjectFrame(GlobalData.optManager.theActionStoredObjectID, storedObject.Frame);
        this.UpdateDimensionLines(GlobalData.optManager.theActionSVGObject);
      } else if (!shouldUpdateGeometry) {
        const newFrame = $.extend(true, {}, storedObject.Frame);
        GlobalData.optManager.SetObjectFrame(GlobalData.optManager.theActionStoredObjectID, newFrame);

        if (this.polylist && this.ShapeType === ConstantData.ShapeType.POLYGON) {
          this.ScaleObject(0, 0, 0, 0, 0, 0);
        }
        shouldUpdateGeometry = true;
      }

      this.LM_ActionPostRelease(GlobalData.optManager.theActionStoredObjectID);

      if (shouldUpdateGeometry) {
        if (isGanttChart) {
          GlobalData.optManager.PlanningTableUpdateGeometry(this, true);
        } else if (isTimeline) {
          GlobalData.optManager.Timeline_SetScale(this);
        }
      }

      if (!triggerData) {
        storedObject.SetDimensionLinesVisibility(GlobalData.optManager.theActionSVGObject, true);
      }

      if (this.HyperlinkText || this.NoteID !== -1 || this.HasFieldData()) {
        GlobalData.optManager.AddToDirtyList(GlobalData.optManager.theActionStoredObjectID);
      }

      GlobalData.optManager.theActionStoredObjectID = -1;
      GlobalData.optManager.theActionSVGObject = null;
      GlobalData.optManager.theActionTable = null;
      GlobalData.optManager.ShowOverlayLayer();
      GlobalData.optManager.CompleteOperation(null);

      console.log('= S.BaseShape - LM_ActionRelease output');
    } catch (error) {
      this.LM_ActionClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }
  }

  LM_ActionPreTrack(e, t) {
    console.log("= S.BaseShape - LM_ActionPreTrack input:", { e, t });

    // Check and update rflags
    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    console.log("= S.BaseShape - LM_ActionPreTrack output:", { rflags: this.rflags });
  }

  LM_ActionDuringTrack(coords) {
    console.log("= S.BaseShape - LM_ActionDuringTrack input:", coords);
    const result = coords;
    console.log("= S.BaseShape - LM_ActionDuringTrack output:", result);
    return result;
  }

  LM_ActionPostRelease(event) {
    console.log("= S.BaseShape - LM_ActionPostRelease input:", event);

    const handleFormatPainter = () => {
      if (GlobalData.optManager.currentModalOperation === ListManager.ModalOperations.FORMATPAINTER) {
        if (
          GlobalData.optManager.FormatPainterMode === ListManager.FormatPainterModes.TABLE ||
          GlobalData.optManager.FormatPainterMode === ListManager.FormatPainterModes.OBJECT
        ) {
          const activeTableId = GlobalData.optManager.Table_GetActiveID();
          GlobalData.optManager.Table_PasteFormat(activeTableId, GlobalData.optManager.FormatPainterStyle, false);
        }
        if (GlobalData.optManager.FormatPainterSticky !== true) {
          GlobalData.optManager.SetFormatPainter(true, false);
        }
      }
    };

    if (this.objecttype !== ConstantData.ObjectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER) {
      GlobalData.optManager.UpdateLinks();
    }

    GlobalData.optManager.LinkParams = null;
    const table = this.GetTable(false);

    GlobalData.optManager.SetEditMode(ConstantData.EditState.DEFAULT);

    switch (GlobalData.optManager.theActionTriggerID) {
      case ConstantData.ActionTriggerType.TABLE_ROW:
        if (GlobalData.optManager.theActionTable && table && GlobalData.optManager.theActionTable.ht !== table.ht) {
          this.sizedim.height = this.Frame.height;
        }
        GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
        handleFormatPainter();
        break;

      case ConstantData.ActionTriggerType.TABLE_COL:
        if (GlobalData.optManager.theActionTable && table && GlobalData.optManager.theActionTable.wd !== table.wd) {
          this.sizedim.width = this.Frame.width;
        }
        GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
        handleFormatPainter();
        break;

      case ConstantData.ActionTriggerType.TABLE_SELECT:
      case ConstantData.ActionTriggerType.TABLE_ROWSELECT:
      case ConstantData.ActionTriggerType.TABLE_COLSELECT:
        handleFormatPainter();
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
        this.sizedim.height = this.Frame.height;
        if (this.GetGanttInfo()) {
          GlobalData.optManager.GanttFormat(this.BlockID, false, false, false, null);
        }
        break;

      default:
        this.sizedim.width = this.Frame.width;
        this.sizedim.height = this.Frame.height;
        if (this.GetGanttInfo()) {
          GlobalData.optManager.GanttFormat(this.BlockID, false, false, false, null);
        }
    }

    console.log("= S.BaseShape - LM_ActionPostRelease output:", {
      sizedim: this.sizedim,
      Frame: this.Frame,
      objecttype: this.objecttype,
      actionTriggerID: GlobalData.optManager.theActionTriggerID
    });
  }

  LM_SetupActionClick(event, triggerType, actionStoredObjectID, actionTriggerID, actionTriggerData) {
    console.log('= S.BaseShape - LM_SetupActionClick input:', { event, triggerType, actionStoredObjectID, actionTriggerID, actionTriggerData });

    GlobalData.optManager.theEventTimestamp = Date.now();
    GlobalData.optManager.SetUIAdaptation(event);

    let rotationAngle = 0;
    let isRotated = false;
    const coords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(event.gesture.center.clientX, event.gesture.center.clientY);
    const x = GlobalData.optManager.DoAutoGrowDrag(coords).x;
    const y = coords.y;

    if (triggerType) {
      const obj = GlobalData.optManager.GetObjectPtr(actionStoredObjectID, false);
      if (obj) {
        rotationAngle = obj.RotationAngle;
        if (rotationAngle > 180) rotationAngle = 360 - rotationAngle;
        if (rotationAngle >= 90) rotationAngle = 180 - rotationAngle;
        if (rotationAngle > 45) isRotated = true;
      }

      switch (triggerType) {
        case ConstantData.ActionTriggerType.TABLE_ROW:
          GlobalData.optManager.SetEditMode(
            ConstantData.EditState.DRAGCONTROL,
            isRotated ? Element.CursorType.COL_RESIZE : Element.CursorType.ROW_RESIZE
          );
          break;
        case ConstantData.ActionTriggerType.TABLE_COL:
          GlobalData.optManager.SetEditMode(
            ConstantData.EditState.DRAGCONTROL,
            isRotated ? Element.CursorType.ROW_RESIZE : Element.CursorType.COL_RESIZE
          );
          break;
      }
    } else {
      const overlayElement = GlobalData.optManager.svgOverlayLayer.FindElementByDOMElement(event.currentTarget);
      if (overlayElement === null) return false;

      const elementID = overlayElement.GetID();
      actionStoredObjectID = parseInt(elementID.substring(ConstantData.Defines.Action.length), 10);
      const targetElement = overlayElement.GetTargetForEvent(event);
      if (targetElement === null) return false;

      actionTriggerID = targetElement.GetID();
      actionTriggerData = targetElement.GetUserData();
      GlobalData.optManager.SetControlDragMode(targetElement);
    }

    GlobalData.optManager.theActionStoredObjectID = actionStoredObjectID;
    const storedObject = GlobalData.optManager.GetObjectPtr(actionStoredObjectID, true);
    GlobalData.optManager.theActionTriggerID = actionTriggerID;
    GlobalData.optManager.theActionTriggerData = actionTriggerData;

    const actionTriggerType = ConstantData.ActionTriggerType;
    switch (actionTriggerID) {
      case actionTriggerType.CONNECTOR_PERP:
      case actionTriggerType.CONNECTOR_ADJ:
      case actionTriggerType.CONNECTOR_HOOK:
      case actionTriggerType.LINESTART:
      case actionTriggerType.LINEEND:
        const connector = this.GetConnector();
        if (connector) {
          GlobalData.optManager.theActionStoredObjectID = connector.BlockID;
          this.Connector_LM_ActionClick(event, true);
        }
        return false;
    }

    if (actionTriggerID === actionTriggerType.MOVEPOLYSEG) {
      GlobalData.optManager.theActionTriggerData = {
        hitSegment: actionTriggerData,
        moveAngle: 9999
      };
    }

    GlobalData.optManager.theActionSVGObject = GlobalData.optManager.svgObjectLayer.GetElementByID(actionStoredObjectID);
    storedObject.SetDimensionLinesVisibility(GlobalData.optManager.theActionSVGObject, false);
    this.LM_ActionPreTrack(actionStoredObjectID, actionTriggerID);

    if (this.HasHyperlinkOrNoteOrFieldData()) {
      this.HideAllIcons(GlobalData.optManager.svgDoc, GlobalData.optManager.theActionSVGObject);
    }

    GlobalData.optManager.theActionLockAspectRatio = event.gesture.srcEvent.shiftKey;
    if (this.ResizeAspectConstrain) {
      GlobalData.optManager.theActionLockAspectRatio = !GlobalData.optManager.theActionLockAspectRatio;
    }

    const frame = storedObject.Frame;
    if (GlobalData.optManager.theActionLockAspectRatio) {
      if (frame.height === 0) {
        GlobalData.optManager.theActionLockAspectRatio = false;
      } else {
        GlobalData.optManager.theActionAspectRatioWidth = frame.width;
        GlobalData.optManager.theActionAspectRatioHeight = frame.height;
      }
    }

    GlobalData.optManager.theActionBBox = $.extend(true, {}, frame);
    GlobalData.optManager.theActionNewBBox = $.extend(true, {}, frame);

    const table = this.GetTable(false);
    if (table) {
      GlobalData.optManager.theActionTable = Utils1.DeepCopy(table);
    }

    GlobalData.optManager.HideOverlayLayer();

    const startCoords = {};
    const centerCoords = {};
    const rotatedCoords = {};

    GlobalData.optManager.theRotateObjectRadians = -this.RotationAngle / (180 / ConstantData.Geometry.PI);

    if (GlobalData.optManager.theActionTriggerID === actionTriggerType.CONTAINER_ADJ) {
      startCoords.x = x;
      startCoords.y = y;
      GlobalData.optManager.theActionStartX = startCoords.x;
      GlobalData.optManager.theActionStartY = startCoords.y;

      const adjustShapeList = this.Pr_GetAdjustShapeList();
      if (!adjustShapeList) return false;

      GlobalData.optManager.theMoveList = adjustShapeList.list;
      GlobalData.optManager.theDragElementList = adjustShapeList.svglist;
      GlobalData.optManager.theDragBBoxList = adjustShapeList.framelist;
      GlobalData.optManager.theActionTableLastY = 0;
      GlobalData.optManager.theActionOldExtra = adjustShapeList.oldextra;
      GlobalData.optManager.theActionContainerArrangement = adjustShapeList.arrangement;
    } else if (GlobalData.optManager.theActionTriggerID === actionTriggerType.ROTATE) {
      GlobalData.optManager.theRotateKnobCenterDivisor = this.RotateKnobCenterDivisor();
      GlobalData.optManager.theRotateStartRotation = this.RotationAngle;
      GlobalData.optManager.theRotateEndRotation = GlobalData.optManager.theRotateStartRotation;
      GlobalData.optManager.theRotatePivotX = frame.x + frame.width / GlobalData.optManager.theRotateKnobCenterDivisor.x;
      GlobalData.optManager.theRotatePivotY = frame.y + frame.height / GlobalData.optManager.theRotateKnobCenterDivisor.y;
      GlobalData.optManager.theActionStartX = x;
      GlobalData.optManager.theActionStartY = y;
    } else {
      startCoords.x = x;
      startCoords.y = y;
      centerCoords.x = frame.x + frame.width / 2;
      centerCoords.y = frame.y + frame.height / 2;
      rotatedCoords = GlobalData.optManager.RotatePointAroundPoint(centerCoords, startCoords, GlobalData.optManager.theRotateObjectRadians);
      GlobalData.optManager.theActionStartX = rotatedCoords.x;
      GlobalData.optManager.theActionStartY = rotatedCoords.y;
      GlobalData.optManager.theActionTableLastX = rotatedCoords.x;
      GlobalData.optManager.theActionTableLastY = rotatedCoords.y;
    }

    console.log('= S.BaseShape - LM_SetupActionClick output:', true);
    return true;
  }

  Connector_LM_ActionClick(event, triggerType) {
    console.log("= S.BaseShape - Connector_LM_ActionClick input:", { event, triggerType });

    try {
      this.BaseLine_LM_ActionClick(event, triggerType);
    } catch (error) {
      console.error("= S.BaseShape - Connector_LM_ActionClick error:", error);
      throw error;
    }

    console.log("= S.BaseShape - Connector_LM_ActionClick output");
  }

  BaseLine_LM_ActionClick(event, triggerType) {
    console.log("= S.BaseShape - BaseLine_LM_ActionClick input:", { event, triggerType });

    try {
      const blockID = this.BlockID;
      const storedObject = GlobalData.optManager.GetObjectPtr(blockID, false);

      if (!(storedObject && storedObject instanceof BaseDrawingObject)) {
        console.log("= S.BaseShape - BaseLine_LM_ActionClick output: false (invalid storedObject)");
        return false;
      }

      if (!GlobalData.optManager.DoAutoGrowDragInit(0, blockID) || !this.LM_SetupActionClick(event, triggerType)) {
        console.log("= S.BaseShape - BaseLine_LM_ActionClick output: false (setup failed)");
        return false;
      }

      Collab.BeginSecondaryEdit();
      const actionObject = GlobalData.optManager.GetObjectPtr(blockID, false);
      GlobalData.optManager.WorkAreaHammer.on('drag', DefaultEvt.Evt_ActionTrackHandlerFactory(actionObject));
      GlobalData.optManager.WorkAreaHammer.on('dragend', DefaultEvt.Evt_ActionReleaseHandlerFactory(actionObject));

      console.log("= S.BaseShape - BaseLine_LM_ActionClick output: true");
    } catch (error) {
      this.LM_ActionClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      console.error("= S.BaseShape - BaseLine_LM_ActionClick error:", error);
      throw error;
    }
  }

  LM_ActionClick_ExceptionCleanup(error) {
    console.log("= S.BaseShape - LM_ActionClick_ExceptionCleanup input:", error);

    GlobalData.optManager.unbindActionClickHammerEvents();
    this.ResetAutoScrollTimer();
    GlobalData.optManager.ob = {};
    GlobalData.optManager.LinkParams = null;
    GlobalData.optManager.theActionTriggerID = -1;
    GlobalData.optManager.theActionTriggerData = null;
    GlobalData.optManager.theActionStoredObjectID = -1;
    GlobalData.optManager.theActionSVGObject = null;
    GlobalData.optManager.HideOverlayLayer();

    console.log("= S.BaseShape - LM_ActionClick_ExceptionCleanup output");
  }

  LM_ActionClick(event, triggerType, actionStoredObjectID, actionTriggerID, actionTriggerData) {
    console.log("= S.BaseShape - LM_ActionClick input:", { event, triggerType, actionStoredObjectID, actionTriggerID, actionTriggerData });
    Utils2.StopPropagationAndDefaults(event);

    try {
      const blockID = this.BlockID;
      const storedObject = GlobalData.optManager.GetObjectPtr(blockID, false);

      if (!(storedObject && storedObject instanceof BaseDrawingObject)) {
        console.log("= S.BaseShape - LM_ActionClick output: false (invalid storedObject)");
        return false;
      }

      if (!GlobalData.optManager.DoAutoGrowDragInit(actionTriggerID) || !this.LM_SetupActionClick(event, triggerType, actionStoredObjectID, actionTriggerID, actionTriggerData)) {
        console.log("= S.BaseShape - LM_ActionClick output: false (setup failed)");
        return false;
      }

      Collab.BeginSecondaryEdit();
      const actionObject = GlobalData.optManager.GetObjectPtr(this.BlockID, false);
      GlobalData.optManager.WorkAreaHammer.on('drag', DefaultEvt.Evt_ActionTrackHandlerFactory(actionObject));
      GlobalData.optManager.WorkAreaHammer.on('dragend', DefaultEvt.Evt_ActionReleaseHandlerFactory(actionObject));

      console.log("= S.BaseShape - LM_ActionClick output: true");
      return true;
    } catch (error) {
      this.LM_ActionClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      console.error("= S.BaseShape - LM_ActionClick error:", error);
      throw error;
    }
  }

  StartNewObjectDrawTrackCommon(x: number, y: number, event: any) {
    console.log("= S.BaseShape - StartNewObjectDrawTrackCommon input:", { x, y, event });

    const deltaX = x - GlobalData.optManager.theActionStartX;
    const deltaY = y - GlobalData.optManager.theActionStartY;
    const newBBox = $.extend(true, {}, GlobalData.optManager.theActionBBox);

    newBBox.width += deltaX;
    newBBox.height += deltaY;

    let snappedPoint = { x: newBBox.x + newBBox.width, y: newBBox.y + newBBox.height };
    const overrideSnaps = GlobalData.optManager.OverrideSnaps(event);

    if (GlobalData.docHandler.documentConfig.enableSnap && !overrideSnaps) {
      snappedPoint = GlobalData.docHandler.SnapToGrid(snappedPoint);
      newBBox.width = snappedPoint.x - newBBox.x;
      newBBox.height = snappedPoint.y - newBBox.y;
    }

    if (newBBox.width < 0) {
      newBBox.x = x;
      newBBox.width = -newBBox.width;
    }

    if (newBBox.height < 0) {
      newBBox.y = y;
      newBBox.height = -newBBox.height;
    }

    GlobalData.optManager.theActionNewBBox = $.extend(true, {}, newBBox);
    this.UpdateFrame(GlobalData.optManager.theActionNewBBox);
    this.Resize(GlobalData.optManager.theActionSVGObject, newBBox, this);

    console.log("= S.BaseShape - StartNewObjectDrawTrackCommon output:", { newBBox });
  }

  StartNewObjectDrawDoAutoScroll() {
    console.log("= S.BaseShape - StartNewObjectDrawDoAutoScroll input");

    GlobalData.optManager.autoScrollTimerID = GlobalData.optManager.autoScrollTimer.setTimeout('StartNewObjectDrawDoAutoScroll', 100);
    let coords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(GlobalData.optManager.autoScrollXPos, GlobalData.optManager.autoScrollYPos);
    coords = GlobalData.optManager.DoAutoGrowDrag(coords);
    GlobalData.docHandler.ScrollToPosition(coords.x, coords.y);
    this.StartNewObjectDrawTrackCommon(coords.x, coords.y, null);

    console.log("= S.BaseShape - StartNewObjectDrawDoAutoScroll output", coords);
  }

  LM_DrawTrack(event) {
    console.log("= S.BaseShape - LM_DrawTrack input:", event);

    if (GlobalData.optManager.theActionStoredObjectID === -1) {
      console.log("= S.BaseShape - LM_DrawTrack output: false (invalid action stored object ID)");
      return false;
    }

    let coords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(event.gesture.center.clientX, event.gesture.center.clientY);
    const overrideSnaps = GlobalData.optManager.OverrideSnaps(event);

    if (GlobalData.docHandler.documentConfig.enableSnap && !overrideSnaps) {
      coords = GlobalData.docHandler.SnapToGrid(coords);
    }

    coords = GlobalData.optManager.DoAutoGrowDrag(coords);
    const x = coords.x;
    const y = coords.y;

    if (this.AutoScrollCommon(event, true, 'StartNewObjectDrawDoAutoScroll')) {
      this.LM_DrawDuringTrack(x, y);
      this.StartNewObjectDrawTrackCommon(x, y, event);
    }

    console.log("= S.BaseShape - LM_DrawTrack output");
  }

  LM_DrawRelease(event) {
    console.log("= S.BaseShape - LM_DrawRelease input:", event);

    GlobalData.optManager.unbindActionClickHammerEvents();
    this.ResetAutoScrollTimer();

    const newBBox = GlobalData.optManager.theActionNewBBox;
    const frame = {
      x: newBBox.x,
      y: newBBox.y,
      width: newBBox.width,
      height: newBBox.height
    };

    GlobalData.optManager.SetObjectFrame(GlobalData.optManager.theActionStoredObjectID, frame);
    this.LM_DrawPostRelease(GlobalData.optManager.theActionStoredObjectID);

    const collabData = {};
    GlobalData.optManager.BuildCreateMessage(collabData, true);
    GlobalData.optManager.PostObjectDraw();

    console.log("= S.BaseShape - LM_DrawRelease output:", { frame, collabData });
  }

  LM_DrawPreTrack() {
    console.log("= S.BaseShape - LM_DrawPreTrack input");

    const result = true;

    console.log("= S.BaseShape - LM_DrawPreTrack output:", result);
    return result;
  }

  LM_DrawDuringTrack(coords: { x: number; y: number }) {
    console.log("= S.BaseShape - LM_DrawDuringTrack input:", coords);

    // Perform any necessary operations with the coordinates
    const result = coords;

    console.log("= S.BaseShape - LM_DrawDuringTrack output:", result);
    return result;
  }

  LM_DrawPostRelease() {
  }

  LM_DrawClick_ExceptionCleanup(error) {
    console.log("= S.BaseShape - LM_DrawClick_ExceptionCleanup input:", error);

    GlobalData.optManager.unbindActionClickHammerEvents();
    this.ResetAutoScrollTimer();
    GlobalData.optManager.LinkParams = null;
    GlobalData.optManager.theActionStoredObjectID = -1;
    GlobalData.optManager.theActionSVGObject = null;
    GlobalData.optManager.WorkAreaHammer.on('dragstart', DefaultEvt.Evt_WorkAreaHammerDragStart);

    console.log("= S.BaseShape - LM_DrawClick_ExceptionCleanup output");
  }

  LM_DrawClick(event, triggerType) {
    console.log('= S.BaseShape - LM_DrawClick input:', { event, triggerType });

    try {
      this.Frame.x = event;
      this.Frame.y = triggerType;
      this.prevBBox = $.extend(true, {}, this.Frame);

      GlobalData.optManager.WorkAreaHammer.on('drag', DefaultEvt.Evt_DrawTrackHandlerFactory(this));
      GlobalData.optManager.WorkAreaHammer.on('dragend', DefaultEvt.Evt_DrawReleaseHandlerFactory(this));

      console.log('= S.BaseShape - LM_DrawClick output');
    } catch (error) {
      this.LM_DrawClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      console.error('= S.BaseShape - LM_DrawClick error:', error);
      throw error;
    }
  }

  RotateKnobCenterDivisor() {
    console.log("= S.BaseShape - RotateKnobCenterDivisor input");

    const result = {
      x: 2,
      y: 2
    };

    console.log("= S.BaseShape - RotateKnobCenterDivisor output:", result);
    return result;
  }
}

export default BaseShape
