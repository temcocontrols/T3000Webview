

import T3Timer from '../Util/T3Timer'
import BaseDrawObject from './S.BaseDrawObject'
import T3Gv from '../Data/T3Gv'
import Utils1 from '../Util/Utils1';
import Utils2 from "../Util/Utils2";
import Utils3 from "../Util/Utils3";
import EvtUtil from "../Event/EvtUtil";
import $ from 'jquery';
import Point from '../Model/Point';
import OptAhUtil from '../Opt/Opt/OptAhUtil';
import ShapeUtil from '../Opt/Shape/ShapeUtil'
import Instance from '../Data/Instance/Instance'
import NvConstant from '../Data/Constant/NvConstant'
import PolyList from '../Model/PolyList'
import PolySeg from '../Model/PolySeg'
import Rectangle from '../Model/Rectangle'
import DynamicGuides from '../Model/DynamicGuides'
import T3Constant from '../Data/Constant/T3Constant';
import PolygonConstant from '../Opt/Polygon/PolygonConstant';
import DSConstant from '../Opt/DS/DSConstant';
import OptConstant from '../Data/Constant/OptConstant';
import BConstant from '../Basic/B.Constant';
import KeyboardConstant from '../Opt/Keyboard/KeyboardConstant';
import CursorConstant from '../Data/Constant/CursorConstant';
import TextConstant from '../Data/Constant/TextConstant';
import StyleConstant from '../Data/Constant/StyleConstant';
import T3Util from '../Util/T3Util';
import DataUtil from '../Opt/Data/DataUtil';
import UIUtil from '../Opt/UI/UIUtil';
import LayerUtil from '../Opt/Opt/LayerUtil';
import SelectUtil from '../Opt/Opt/SelectUtil';
import OptCMUtil from '../Opt/Opt/OptCMUtil';
import SvgUtil from '../Opt/Opt/SvgUtil';
import ActionUtil from '../Opt/Opt/ActionUtil';
import DrawUtil from '../Opt/Opt/DrawUtil';
import LMEvtUtil from '../Opt/Opt/LMEvtUtil';
import HookUtil from '../Opt/Opt/HookUtil';
import PolyUtil from '../Opt/Opt/PolyUtil';
import ToolActUtil from '../Opt/Opt/ToolActUtil';
import RightClickMd from '../Model/RightClickMd';
import TextUtil from '../Opt/Opt/TextUtil';
import DynamicUtil from '../Opt/Opt/DynamicUtil';
import { useQuasar } from 'quasar';
import QuasarUtil from '../Opt/Quasar/QuasarUtil';

/**
 * BaseShape is the foundation class for all shape types in the T3000 HVAC drawing system.
 * It extends BaseDrawObject with shape-specific properties and behavior for creating,
 * manipulating, and rendering various geometric shapes within the application.
 *
 * This class provides:
 * - Core shape properties and attributes (type, parameters, dimensions)
 * - Interactive resize/rotate controls and connection points
 * - Shape manipulation handling (resize, rotate, move)
 * - Text positioning and formatting within shapes
 * - Connection point management for line attachments
 * - Shape transformation and rendering behavior
 *
 * All specific shape types (Rectangle, Oval, Polygon, etc.) extend this base class
 * to inherit common shape behavior while implementing their specific geometry.
 *
 * @example
 * ```typescript
 * // Extend BaseShape to create a custom shape type
 * class CustomShape extends BaseShape {
 *   constructor(options) {
 *     // Configure as a shape with custom parameters
 *     options.ShapeType = 'Custom';
 *     options.shapeparam = 10; // Custom corner radius or other parameter
 *
 *     // Call parent constructor
 *     super(options);
 *
 *     // Add custom shape-specific properties
 *     this.customProperty = options.customProperty || 'default';
 *   }
 *
 *   // Override methods to customize shape behavior
 *   GetPolyList() {
 *     // Define custom shape geometry
 *     const polyList = super.GetPolyList();
 *     // Modify polyList for custom shape
 *     return polyList;
 *   }
 * }
 * ```
 */
class BaseShape extends BaseDrawObject {

  public ShapeType: any;
  public shapeparam: any;
  public SVGDim: any;
  public zListIndex: any;

  /**
   * Constructor for the BaseShape class that creates a basic shape object
   * This class serves as the foundation for all shape types in the application
   * and provides common properties and functionality for shapes
   *
   * @param options - Configuration options for creating the shape
   * @param options.ShapeType - The type of shape to create
   * @param options.shapeparam - Additional shape-specific parameters (like corner radius)
   * @param options.SVGDim - Dimensions for SVG shapes
   * @param options.hookflags - Flags that control hook behavior
   * @param options.targflags - Flags that control shape targeting behavior
   */
  constructor(shapeOptions: any) {
    T3Util.Log("= S.BaseShape - constructor input:", shapeOptions);

    // Initialize with default empty object if no options provided
    shapeOptions = shapeOptions || {};

    // Set the base class type to SHAPE
    shapeOptions.DrawingObjectBaseClass = OptConstant.DrawObjectBaseClass.Shape;

    // Configure hook flags if not explicitly set to zero
    if (shapeOptions.hookflags !== 0) {
      shapeOptions.hookflags = NvConstant.HookFlags.LcShape |
        NvConstant.HookFlags.LcAttachToLine;
    }

    // Configure target flags if not explicitly set to zero
    if (shapeOptions.targflags !== 0) {
      shapeOptions.targflags = NvConstant.HookFlags.LcShape |
        NvConstant.HookFlags.LcLine;
    }

    // Call parent constructor with configured options
    super(shapeOptions);

    // Store shape-specific properties
    this.ShapeType = shapeOptions.ShapeType;
    this.shapeparam = shapeOptions.shapeparam || 0;
    this.SVGDim = shapeOptions.SVGDim || {};

    T3Util.Log("= S.BaseShape - constructor output:", this);
  }

  /**
   * Creates action trigger elements (resize/rotate handles) around a shape
   *
   * This method generates interactive control points (knobs) that allow users to
   * manipulate the shape by resizing, rotating, or adjusting its properties.
   * The knobs will be positioned based on shape dimensions, display different cursors
   * based on rotation, and respect constraints like locked state or growth restrictions.
   *
   * @param svgDocument - The SVG document where the triggers will be created
   * @param triggerIdentifier - Unique identifier for the action trigger element
   * @param rotationProvider - Object that provides current rotation information
   * @param comparisonTrigger - Trigger ID to compare for styling decisions
   * @returns SVG group element containing all action triggers
   */
  CreateActionTriggers(svgDocument, triggerIdentifier, rotationProvider, comparisonTrigger) {
    T3Util.Log("= S.BaseShape - CreateActionTriggers input:", {
      svgDocument,
      triggerIdentifier,
      rotationProvider,
      comparisonTrigger
    });

    // Define default cursor types for knobs (8 directions)
    const defaultCursorTypes = [
      CursorConstant.CursorType.ResizeLT,
      CursorConstant.CursorType.ResizeT,
      CursorConstant.CursorType.ResizeRT,
      CursorConstant.CursorType.ResizeR,
      CursorConstant.CursorType.ResizeRB,
      CursorConstant.CursorType.ResizeB,
      CursorConstant.CursorType.ResizeLB,
      CursorConstant.CursorType.ResizeL
    ];

    // Create a container group for all triggers
    const triggerGroup = svgDocument.CreateShape(OptConstant.CSType.Group);

    // Configure knob dimensions based on document scale
    const knobSize = OptConstant.Common.KnobSize;
    const rotationKnobSize = OptConstant.Common.RKnobSize;
    let enableSideKnobs = (this.extraflags & OptConstant.ExtraFlags.SideKnobs &&
      this.dataclass === PolygonConstant.ShapeTypes.POLYGON);
    const minimumSidePointLength = OptConstant.Common.MinSidePointLength;

    // Adjust knob size based on current document scale
    let scaleFactor = svgDocument.docInfo.docToScreenScale;
    if (svgDocument.docInfo.docScale <= 0.5) {
      scaleFactor *= 2;
    }

    const scaledKnobSize = knobSize / scaleFactor;
    const scaledRotationKnobSize = rotationKnobSize / scaleFactor;

    // Get shape frame and calculate dimensions for knobs
    const shapeFrame = this.Frame;
    let frameWithKnobsWidth = shapeFrame.width + scaledKnobSize;
    let frameWithKnobsHeight = shapeFrame.height + scaledKnobSize;

    // Expand the frame bounds for trigger display
    const expandedFrame = $.extend(true, {}, shapeFrame);
    expandedFrame.x -= scaledKnobSize / 2;
    expandedFrame.y -= scaledKnobSize / 2;
    expandedFrame.width += scaledKnobSize;
    expandedFrame.height += scaledKnobSize;

    // Adjust rotation for proper cursor ordering
    let shapeDegrees = rotationProvider.GetRotation() + 22.5;
    if (shapeDegrees >= 360) {
      shapeDegrees = 0;
    }

    // Calculate rotation index (0-7) and reorder cursor types
    const rotationIndex = Math.floor(shapeDegrees / 45);
    const rotatedCursorTypes = defaultCursorTypes.slice(rotationIndex)
      .concat(defaultCursorTypes.slice(0, rotationIndex));

    // Determine which sets of knobs to display based on shape constraints
    let showCornerKnobs = true;
    let showVerticalKnobs = !enableSideKnobs;
    let showHorizontalKnobs = !enableSideKnobs;

    // Adjust which knobs to show based on growth behavior
    switch (this.ObjGrow) {
      case OptConstant.GrowBehavior.Horiz: // Horizontal constraint
        showCornerKnobs = false;
        showHorizontalKnobs = false;
        break;

      case OptConstant.GrowBehavior.Vertical: // Vertical constraint
        showCornerKnobs = false;
        showVerticalKnobs = false;
        break;

      case OptConstant.GrowBehavior.ProPortional: // Maintain aspect ratio
        showCornerKnobs = true;
        showVerticalKnobs = false;
        showHorizontalKnobs = false;
        break;
    }

    // Configure standard knob appearance
    const knobConfig = {
      svgDoc: svgDocument,
      shapeType: OptConstant.CSType.Rect,
      x: 0,
      y: 0,
      knobSize: scaledKnobSize,
      fillColor: 'black',
      fillOpacity: 1,
      strokeSize: 1,
      strokeColor: '#777777',
      locked: false
    };

    // Style triggers differently if not matching the comparison trigger
    if (triggerIdentifier !== comparisonTrigger) {
      knobConfig.fillColor = 'white';
      knobConfig.strokeSize = 1;
      knobConfig.strokeColor = 'black';
      knobConfig.fillOpacity = '0.0';
    }

    // Apply special styling for locked or no-grow shapes
    if (this.flags & NvConstant.ObjFlags.Lock) {
      knobConfig.fillColor = 'gray';
      knobConfig.locked = true;
      enableSideKnobs = false;
    } else if (this.NoGrow()) {
      knobConfig.fillColor = 'red';
      enableSideKnobs = false;
      knobConfig.strokeColor = 'red';

      // Set all cursor types to default when growth is not allowed
      for (let i = 0; i < 8; i++) {
        rotatedCursorTypes[i] = CursorConstant.CursorType.Default;
      }
    }

    let knobElement;

    // Create corner knobs if allowed
    if (showCornerKnobs) {
      // Top Left knob
      knobConfig.knobID = OptConstant.ActionTriggerType.TopLeft;
      knobConfig.cursorType = rotatedCursorTypes[0];
      knobElement = this.GenericKnob(knobConfig);
      triggerGroup.AddElement(knobElement);

      // Top Right knob
      knobConfig.x = frameWithKnobsWidth - scaledKnobSize;
      knobConfig.y = 0;
      knobConfig.cursorType = rotatedCursorTypes[2];
      knobConfig.knobID = OptConstant.ActionTriggerType.TopRight;
      knobElement = this.GenericKnob(knobConfig);
      triggerGroup.AddElement(knobElement);

      // Bottom Right knob
      knobConfig.x = frameWithKnobsWidth - scaledKnobSize;
      knobConfig.y = frameWithKnobsHeight - scaledKnobSize;
      knobConfig.cursorType = rotatedCursorTypes[4];
      knobConfig.knobID = OptConstant.ActionTriggerType.BottomRight;
      knobElement = this.GenericKnob(knobConfig);
      triggerGroup.AddElement(knobElement);

      // Bottom Left knob
      knobConfig.x = 0;
      knobConfig.y = frameWithKnobsHeight - scaledKnobSize;
      knobConfig.cursorType = rotatedCursorTypes[6];
      knobConfig.knobID = OptConstant.ActionTriggerType.BottomLeft;
      knobElement = this.GenericKnob(knobConfig);
      triggerGroup.AddElement(knobElement);
    }

    // Create top/bottom center knobs if allowed
    if (showHorizontalKnobs) {
      // Top Center knob
      knobConfig.x = frameWithKnobsWidth / 2 - scaledKnobSize / 2;
      knobConfig.y = 0;
      knobConfig.cursorType = rotatedCursorTypes[1];
      knobConfig.knobID = OptConstant.ActionTriggerType.TopCenter;
      knobElement = this.GenericKnob(knobConfig);
      triggerGroup.AddElement(knobElement);

      // Bottom Center knob
      knobConfig.x = frameWithKnobsWidth / 2 - scaledKnobSize / 2;
      knobConfig.y = frameWithKnobsHeight - scaledKnobSize;
      knobConfig.cursorType = rotatedCursorTypes[5];
      knobConfig.knobID = OptConstant.ActionTriggerType.BottomCenter;
      knobElement = this.GenericKnob(knobConfig);
      triggerGroup.AddElement(knobElement);
    }

    // Create left/right center knobs if allowed
    if (showVerticalKnobs) {
      // Center Left knob
      knobConfig.x = 0;
      knobConfig.y = frameWithKnobsHeight / 2 - scaledKnobSize / 2;
      knobConfig.cursorType = rotatedCursorTypes[7];
      knobConfig.knobID = OptConstant.ActionTriggerType.CenterLeft;
      knobElement = this.GenericKnob(knobConfig);
      triggerGroup.AddElement(knobElement);

      // Center Right knob
      knobConfig.x = frameWithKnobsWidth - scaledKnobSize;
      knobConfig.y = frameWithKnobsHeight / 2 - scaledKnobSize / 2;
      knobConfig.cursorType = rotatedCursorTypes[3];
      knobConfig.knobID = OptConstant.ActionTriggerType.CenterRight;
      knobElement = this.GenericKnob(knobConfig);
      triggerGroup.AddElement(knobElement);
    }

    // Add connector controls if the shape has connector attachments
    const connectorInfo = (function (targetShape) {
      let info = null;
      if (targetShape.hooks.length) {
        const hookedObject = DataUtil.GetObjectPtr(targetShape.hooks[0].objid, false);
        if (hookedObject && (hookedObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector ||
          (hookedObject && hookedObject instanceof Instance.Shape.ShapeContainer))) {
          info = hookedObject.PrGetShapeConnectorInfo(targetShape.hooks[0]);
        }
      }
      return info;
    })(this);

    if (connectorInfo && connectorInfo.length) {
      const iconConfig = {
        svgDoc: svgDocument,
        iconSize: 14,
        imageURL: null,
        iconID: 0,
        userData: 0,
        cursorType: 0
      };

      for (let i = 0, len = connectorInfo.length; i < len; i++) {
        // Position connector icon based on specified position
        if (connectorInfo[i].position === 'right') {
          iconConfig.x = frameWithKnobsWidth - 14 - 1 - scaledKnobSize;
        } else {
          iconConfig.x = scaledKnobSize + 1;
        }

        if (connectorInfo[i].position === 'bottom') {
          iconConfig.y = frameWithKnobsHeight - 14 - 1 - scaledKnobSize;
        } else {
          iconConfig.y = scaledKnobSize + 1;
        }

        iconConfig.cursorType = connectorInfo[i].cursorType;
        iconConfig.iconID = connectorInfo[i].knobID;

        // Choose icon based on connector orientation
        iconConfig.imageURL = (connectorInfo[i].polyType === 'vertical')
          ? OptConstant.Common.ConMoveVerticalPath
          : OptConstant.Common.ConMoveHorizontalPath;

        iconConfig.userData = connectorInfo[i].knobData;

        knobElement = this.GenericIcon(iconConfig);
        triggerGroup.AddElement(knobElement);
        iconConfig.x += 16;
      }
    }

    // Add side knobs for polygon shapes if enabled
    if (enableSideKnobs) {
      const polygonShape = Utils1.DeepCopy(this);
      polygonShape.inside = $.extend(true, {}, polygonShape.Frame);

      // Get polygon points from the shape
      const polyPoints = T3Gv.opt.ShapeToPolyLine(this.BlockID, false, true, polygonShape)
        .GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, true, false, []);

      if (polyPoints) {
        knobConfig.shapeType = OptConstant.CSType.Oval;
        knobConfig.knobID = OptConstant.ActionTriggerType.MovePolySeg;
        knobConfig.fillColor = 'green';
        knobConfig.strokeColor = 'green';

        // Create knobs at the midpoint of each polygon segment
        for (let i = 1, len = polyPoints.length; i < len; i++) {
          const deltaX = polyPoints[i].x - polyPoints[i - 1].x;
          const deltaY = polyPoints[i].y - polyPoints[i - 1].y;

          // Only add knob if segment is long enough
          if (Utils2.sqrt(deltaX * deltaX + deltaY * deltaY) > minimumSidePointLength) {
            // Choose cursor based on segment orientation
            knobConfig.cursorType = (deltaX * deltaX > deltaY * deltaY)
              ? CursorConstant.CursorType.ResizeTB
              : CursorConstant.CursorType.ResizeLR;

            // Position knob at segment midpoint
            knobConfig.x = polyPoints[i - 1].x + deltaX / 2;
            knobConfig.y = polyPoints[i - 1].y + deltaY / 2;

            knobElement = this.GenericKnob(knobConfig);
            knobElement.SetUserData(i);
            triggerGroup.AddElement(knobElement);
          }
        }
      }
    }

    // Determine if rotation knob should be displayed
    const isNarrowShape = shapeFrame.width < 44;
    let hasConnectorHooks = this.hooks.length > 0;

    if (hasConnectorHooks) {
      const hookObject = DataUtil.GetObjectPtr(this.hooks[0].objid, false);
      // Only count hooks that are connectors
      if (hookObject && hookObject.DrawingObjectBaseClass !== OptConstant.DrawObjectBaseClass.Connector) {
        hasConnectorHooks = false;
      }
    }

    // Add rotation knob if allowed and appropriate
    const canRotate = !(this.NoRotate() || this.NoGrow() || T3Gv.opt.touchInitiated ||
      knobConfig.locked || isNarrowShape || hasConnectorHooks);

    if (canRotate) {
      // Special positioning for left-aligned text
      const isTextAlignedLeft = (this.TextGrow === NvConstant.TextGrowBehavior.Horizontal &&
        (this.flags & NvConstant.ObjFlags.TextOnly) &&
        ShapeUtil.TextAlignToWin(this.TextAlign).just === TextConstant.TextJust.Left);

      knobConfig.shapeType = OptConstant.CSType.Oval;

      // Position rotation knob according to text alignment
      knobConfig.x = isTextAlignedLeft
        ? frameWithKnobsWidth + scaledRotationKnobSize
        : frameWithKnobsWidth - 3 * scaledRotationKnobSize;

      knobConfig.y = frameWithKnobsHeight / 2 - scaledRotationKnobSize / 2;
      knobConfig.cursorType = CursorConstant.CursorType.Rotate;
      knobConfig.knobID = OptConstant.ActionTriggerType.Rotate;
      knobConfig.fillColor = 'white';
      knobConfig.fillOpacity = 0.001;
      knobConfig.strokeSize = 1.5;
      knobConfig.strokeColor = 'black';

      knobElement = this.GenericKnob(knobConfig);
      triggerGroup.AddElement(knobElement);
    }

    // Add dimension adjustment controls if shape uses standoff dimension lines
    if ((this.Dimensions & NvConstant.DimensionFlags.Standoff) &&
      this.CanUseStandOffDimensionLines()) {
      const shapeElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
      this.CreateDimensionAdjustmentKnobs(triggerGroup, shapeElement, knobConfig);
    }

    // Set size and position of the action triggers container
    triggerGroup.SetSize(frameWithKnobsWidth, frameWithKnobsHeight);
    triggerGroup.SetPos(expandedFrame.x, expandedFrame.y);
    triggerGroup.isShape = true;
    triggerGroup.SetID(OptConstant.Common.Action + triggerIdentifier);

    T3Util.Log("= S.BaseShape - CreateActionTriggers output:", triggerGroup);
    return triggerGroup;
  }

  CreateConnectHilites(
    svgDoc: any,
    triggerId: any,
    targetParam: any,
    additionalParam: any,
    extraParam: any,
    connectionHint: any
  ) {
    T3Util.Log("= S.BaseShape - CreateConnectHilites input:", {
      svgDoc,
      triggerId,
      targetParam,
      additionalParam,
      extraParam,
      connectionHint
    });

    // Create the main group shape for the connection highlights
    const groupShape = svgDoc.CreateShape(OptConstant.CSType.Group);
    let screenScale = svgDoc.docInfo.docToScreenScale;
    if (svgDoc.docInfo.docScale <= 0.5) {
      screenScale *= 2;
    }

    // Calculate knob dimension based on scale
    const connectDim = OptConstant.Common.ConnPointDim / screenScale;
    let targetPoints: any[] = [];
    // Using ConnectPoints if flag is set (though not used further)
    if (this.flags & NvConstant.ObjFlags.UseConnect && this.ConnectPoints) {
      // Code intentionally left empty if only referenced for side-effect
    }

    // Determine if continuous connector flag is set or a connection hint exists
    const useContinuous = (this.flags & NvConstant.ObjFlags.ContConn) || connectionHint != null;
    if (useContinuous) {
      targetPoints.push(targetParam);
    } else {
      targetPoints = this.GetTargetPoints(null, NvConstant.HookFlags.LcNoSnaps, null);
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
      shapeType: OptConstant.CSType.Oval,
      x: 0,
      y: 0,
      knobSize: connectDim,
      fillColor: "black",
      fillOpacity: 1,
      strokeSize: 1,
      strokeColor: "#777777",
      KnobID: 0,
      cursorType: CursorConstant.CursorType.Anchor
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
    groupShape.SetEventBehavior(OptConstant.EventBehavior.None);
    groupShape.SetID("hilite_" + triggerId);

    T3Util.Log("= S.BaseShape - CreateConnectHilites output:", groupShape);
    return groupShape;
  }

  /**
   * Sets appropriate cursor types for the shape based on the current edit mode
   *
   * This method configures the cursor appearance when hovering over different parts of the shape.
   * It handles different behaviors based on the current edit mode (default, format painting, etc.)
   * and sets appropriate cursors for shape elements and their interactive areas.
   */
  SetCursors() {
    T3Util.Log("= S.BaseShape - SetCursors input, BlockID:", this.BlockID);

    // Retrieve the main SVG element for this shape
    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    const isOneClickText = ((this.TextFlags & NvConstant.TextFlags.OneClick) > 0);
    const currentEditMode = OptCMUtil.GetEditMode();

    switch (currentEditMode) {
      case NvConstant.EditState.Default: {
        // Standard case - no table present
        // Call parent implementation to set default cursors
        super.SetCursors();
        break;
      }

      case NvConstant.EditState.FormatPaint: {
        T3Util.Log("= S.BaseShape - SetCursors: FORMATPAINT mode");

        // For format painting mode, set the paint brush cursor
        const shapeElement = svgElement.GetElementById(OptConstant.SVGElementClass.Shape);
        if (shapeElement) {
          shapeElement.SetCursor(CursorConstant.CursorType.Paint);
        }

        // Also set paint cursor on the slop element (interactive area around the shape)
        const slopElement = svgElement.GetElementById(OptConstant.SVGElementClass.Slop);
        if (slopElement) {
          slopElement.SetCursor(CursorConstant.CursorType.Paint);
        }
        break;
      }

      default: {
        T3Util.Log("= S.BaseShape - SetCursors: Default mode, calling super.SetCursors()");
        // Default behavior: delegate to parent class implementation
        super.SetCursors();
      }
    }

    T3Util.Log("= S.BaseShape - SetCursors output, BlockID:", this.BlockID);
  }

  /**
   * Retrieves the text object associated with this shape
   *
   * This method determines the appropriate DataID to use for text editing
   * based on the shape's current state. It handles shapes with graphs and
   * validates that the referenced DataID is valid.
   *
   * @param clickEvent - The event that triggered this call (can be null)
   * @param skipTableRelease - Whether to skip releasing the table selection
   * @returns The DataID of the text object
   */
  GetTextObject(clickEvent: any, skipTableRelease: boolean) {
    T3Util.Log("= S.BaseShape - GetTextObject input:", { clickEvent, skipTableRelease });
    let dataId: number;
    const graph = this.GetGraph(false);

    if (graph) {
      // When a graph is present, use its selected text ID
      this.DataID = graph.selectedText;
      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
      if (svgElement) {
        svgElement.textElem = svgElement.GetElementById(OptConstant.SVGElementClass.Text, this.DataID);
      }
    } else if (this.DataID >= 0 && DataUtil.GetObjectPtr(this.DataID, false) == null) {
      // Reset DataID if it's invalid (doesn't exist in memory)
      this.DataID = -1;
    }

    T3Util.Log("= S.BaseShape - GetTextObject output:", { DataID: this.DataID });
    return this.DataID;
  }

  /**
   * Determines whether this shape should use the text block color
   *
   * This method checks various conditions to decide if the shape's text should
   * use the text block color rather than its own color settings. Text will use
   * the block color if it's attached to the shape, if the shape has a transparent
   * fill, or if the shape has the same solid fill color as the text color.
   *
   * @returns True if the shape should use the text block color, false otherwise
   */
  UseTextBlockColor() {
    T3Util.Log("= S.BaseShape - UseTextBlockColor input:", {
      TextFlags: this.TextFlags,
      FillPaintType: this.StyleRecord.Fill.Paint.FillType,
      TextPaintColor: this.StyleRecord.Text.Paint.Color,
      FillColor: this.StyleRecord.Fill.Paint.Color
    });

    const hasAttachFlag =
      (this.TextFlags & NvConstant.TextFlags.AttachA) ||
      (this.TextFlags & NvConstant.TextFlags.AttachB);

    const isTransparent =
      this.StyleRecord.Fill.Paint.FillType === NvConstant.FillTypes.Transparent;

    const isSolidAndSameColor =
      this.StyleRecord.Fill.Paint.FillType === NvConstant.FillTypes.Solid &&
      this.StyleRecord.Text.Paint.Color.toUpperCase() === this.StyleRecord.Fill.Paint.Color.toUpperCase();

    const result = hasAttachFlag || isTransparent || isSolidAndSameColor;
    T3Util.Log("= S.BaseShape - UseTextBlockColor output:", result);

    return result;
  }

  /**
   * Sets the text object ID for this shape
   *
   * This method assigns a new DataID to the shape and applies appropriate text styling.
   * If the shape should use text block color (determined by UseTextBlockColor), it will
   * update the text style accordingly.
   *
   * @param newDataId - The new DataID to set for the shape's text
   * @returns True if the operation was successful
   */
  SetTextObject(newDataId: number) {
    T3Util.Log("= S.BaseShape - SetTextObject input:", newDataId);

    if (this.UseTextBlockColor()) {
      const style = Utils3.FindStyle(OptConstant.Common.TextBlockStyle);
      if (style) {
        this.StyleRecord.Text.Paint = Utils1.DeepCopy(style.Text.Paint);
      }
    }

    this.DataID = newDataId;
    T3Util.Log("= S.BaseShape - SetTextObject output:", this.DataID);
    return true;
  }

  /**
   * Gets text parameters for this shape's text object
   *
   * This method calculates the text rectangle (trect) and dimension information
   * needed for text layout within the shape. It handles special cases for graphs
   * and returns a comprehensive set of parameters for text positioning and sizing.
   *
   * @param eventData - The event data, possibly containing positioning information
   * @returns Object containing text parameters (trect, sizedim, tsizedim)
   */
  GetTextParams(eventData: any) {
    T3Util.Log("= S.BaseShape - GetTextParams input:", { eventData });

    let textParams: any = {};
    const graph = this.GetGraph(false);

    if (graph && graph.selectedText >= 0) {
      // If this is a graph with selected text, get the specialized text rectangle
      textParams = T3Gv.opt.Graph_GetTRect(this, graph, eventData);
    } else {
      // Default case: use the shape's text rectangle and sizing dimensions
      textParams.trect = Utils1.DeepCopy(this.trect);
      textParams.sizedim = Utils1.DeepCopy(this.sizedim);
      textParams.tsizedim = {
        width: this.sizedim.width - (this.Frame.width - this.trect.width),
        height: this.sizedim.height - (this.Frame.height - this.trect.height)
      };
    }

    T3Util.Log("= S.BaseShape - GetTextParams output:", textParams);
    return textParams;
  }

  /**
   * Gets default text formatting for this shape
   *
   * This method retrieves the default text formatting settings that should be used
   * when adding or editing text within this shape. It delegates to the parent class
   * implementation for the standard behavior.
   *
   * @param eventData - Event data that may affect the default formatting
   * @returns Object containing default text formatting properties
   */
  GetTextDefault(eventData: any): any {
    T3Util.Log("= S.BaseShape - GetTextDefault input:", { eventData });

    // Use the parent implementation for default text formatting
    const defaultText = super.GetTextDefault(eventData);

    T3Util.Log("= S.BaseShape - GetTextDefault output:", defaultText);
    return defaultText;
  }

  // SetTableProperties(properties: any, option: any): any {
  //   T3Util.Log("= S.BaseShape - SetTableProperties input:", { properties, option });

  //   if (this.GetTable(false)) {
  //     const result = T3Gv.opt.Table_SetProperties(this, properties, option, true);
  //     T3Util.Log("= S.BaseShape - SetTableProperties output:", result);
  //     return result;
  //   }

  //   T3Util.Log("= S.BaseShape - SetTableProperties output: no table found");
  //   return undefined;
  // }

  SetTextGrow(textGrowBehavior: any): void {
    T3Util.Log("= S.BaseShape - SetTextGrow input:", textGrowBehavior);

    // if (this.GetTable(false)) {
    //   T3Gv.opt.Table_ChangeTextAttributes(this, null, null, null, null, null, textGrowBehavior, false);
    //   T3Util.Log("= S.BaseShape - SetTextGrow output: Table text attributes changed");
    // } else

    {
      // Update the TextGrow property
      this.TextGrow = textGrowBehavior;

      if (this.DataID >= 0) {
        const shapeElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
        if (shapeElement) {
          const textElement = shapeElement.textElem;

          if (this.TextGrow === NvConstant.TextGrowBehavior.Horizontal) {
            textElement.SetConstraints(
              T3Gv.opt.header.MaxWorkDim.x,
              this.trect.width,
              this.trect.height
            );
            T3Util.Log("= S.BaseShape - SetTextGrow applied Horizontal constraints");
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
            T3Util.Log("= S.BaseShape - SetTextGrow applied Vertical constraints");
          }
        }
        T3Gv.opt.TextResizeCommon(this.BlockID, true);
        T3Util.Log("= S.BaseShape - SetTextGrow: TextResizeCommon called");
      }
      T3Util.Log("= S.BaseShape - SetTextGrow output:", this.TextGrow);
    }
  }

  ChangeShape(newDataClass, newShapeType, getVertexArrayFunc, shapeParam, preserveAspect) {
    T3Util.Log("= S.BaseShape - ChangeShape input:", {
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
    const sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    if (this.SymbolURL && this.SymbolURL.length > 0) {
      T3Util.Log("= S.BaseShape - ChangeShape output: SymbolURL exists, returning false");
      return false;
    }

    if (newDataClass !== this.dataclass || newShapeType === PolygonConstant.ShapeTypes.RECTANGLE) {
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
        case PolygonConstant.ShapeTypes.RECTANGLE:
        case PolygonConstant.ShapeTypes.MEASURE_AREA:
          newShape = new Instance.Shape.Rect(newShapeProps);
          break;
        case PolygonConstant.ShapeTypes.ROUNDED_RECTANGLE:
          newShapeProps.shapeparam = sessionBlock.def.rrectparam;
          newShape = new Instance.Shape.RRect(newShapeProps);
          newShape.moreflags = Utils2.SetFlag(newShape.moreflags, OptConstant.ObjMoreFlags.FixedRR, true);
          shapeParam = sessionBlock.def.rrectparam;
          break;
        case PolygonConstant.ShapeTypes.OVAL:
        case PolygonConstant.ShapeTypes.CIRCLE:
          newShape = new Instance.Shape.Oval(newShapeProps);
          break;
        case PolygonConstant.ShapeTypes.POLYGON:
          const vertexArray = getVertexArrayFunc(this.Frame, shapeParam);
          newShapeProps.VertexArray = vertexArray;
          newShape = new Instance.Shape.Polygon(newShapeProps);
          newShape.NeedsSIndentCount = true;
          break;
      }

      // Preserve the block and update new shape properties
      preservedBlock = T3Gv.stdObj.PreserveBlock(this.BlockID);
      newShape.dataclass = newDataClass;
      newShape.shapeparam = shapeParam;
      newShape.ResizeAspectConstrain = preserveAspect;
      if (newShape.ImageURL === "") {
        newShape.extraflags = Utils2.SetFlag(
          newShape.extraflags,
          OptConstant.ExtraFlags.FlipHoriz | OptConstant.ExtraFlags.FlipVert,
          false
        );
      }
      newShape.ObjGrow = preserveAspect ? OptConstant.GrowBehavior.ProPortional : OptConstant.GrowBehavior.All;
      newShape.BlockID = preservedBlock.Data.BlockID;
      newShape.left_sindent = 0;
      newShape.top_sindent = 0;
      newShape.right_sindent = 0;
      newShape.bottom_sindent = 0;
      preservedBlock.Data = newShape;
      newShape.moreflags = Utils2.SetFlag(newShape.moreflags, OptConstant.ObjMoreFlags.FixedRR, false);

      // Handle table adjustments if a table exists for the new shape
      // tableResult = newShape.GetTable(true);
      // if (tableResult) {
      //   if (this.hookflags & NvConstant.HookFlags.LcTableRows) {
      //     newShape.hookflags = Utils2.SetFlag(newShape.hookflags, NvConstant.HookFlags.LcTableRows, true);
      //   }
      //   newShape.UpdateFrame(newShape.Frame);
      //   rectCopy = Utils1.DeepCopy(newShape.trect);
      //   newShape.sizedim.width = newShape.Frame.width;
      //   newShape.sizedim.height = newShape.Frame.height;
      //   T3Gv.opt.theActionTable = Utils1.DeepCopy(tableResult);
      //   resizedTable = T3Gv.opt.Table_Resize(
      //     newShape,
      //     tableResult,
      //     T3Gv.opt.theActionTable,
      //     rectCopy.width,
      //     rectCopy.height
      //   );
      //   if (resizedTable.x > rectCopy.width + 0.1 || resizedTable.y > rectCopy.height + 0.1) {
      //     const aspectRatioOriginal = newShape.sizedim.width / newShape.sizedim.height;
      //     rectCopy.width = resizedTable.x;
      //     rectCopy.height = resizedTable.y;
      //     newShape.TRectToFrame(rectCopy);
      //     const currentAspectRatio = newShape.Frame.width / newShape.Frame.height;
      //     if (currentAspectRatio > aspectRatioOriginal) {
      //       newShape.Frame.height = newShape.Frame.width / aspectRatioOriginal;
      //       newShape.UpdateFrame(newShape.Frame);
      //       T3Gv.opt.Table_Resize(
      //         newShape,
      //         tableResult,
      //         T3Gv.opt.theActionTable,
      //         newShape.trect.width,
      //         newShape.trect.height
      //       );
      //     } else if (currentAspectRatio < aspectRatioOriginal) {
      //       newShape.Frame.width = newShape.Frame.height * aspectRatioOriginal;
      //       newShape.UpdateFrame(newShape.Frame);
      //       T3Gv.opt.Table_Resize(
      //         newShape,
      //         tableResult,
      //         T3Gv.opt.theActionTable,
      //         newShape.trect.width,
      //         newShape.trect.height
      //       );
      //     }
      //   }
      //   T3Gv.opt.theActionTable = null;
      // } else

      if (newShape.DataID >= 0) {
        // When there is no table, update based on text element sizing
        newShape.UpdateFrame(newShape.Frame);
        newShape.sizedim.width = newShape.Frame.width;
        newShape.sizedim.height = newShape.Frame.height;
        const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
        let textElement;
        if (svgElement) {
          textElement = svgElement.textElem;
        }
        rectCopy = Utils1.DeepCopy(newShape.trect);
        if (textElement) {
          let textFit = textElement.CalcTextFit(rectCopy.width);
          if (textFit.height > rectCopy.height) {
            textFit = T3Gv.opt.FitProp(newShape, textElement, textFit.height - rectCopy.height, -1);
            newShape.Frame.width = textFit.x;
            newShape.Frame.height = textFit.y;
          } else {
            newShape.TRectToFrame(rectCopy, false);
          }
        }
      }

      newShape.SetSize(newShape.Frame.width, newShape.Frame.height, 0);
      T3Util.Log("= S.BaseShape - ChangeShape output:", { result: true, newShape });
      return true;
    }

    T3Util.Log("= S.BaseShape - ChangeShape output: condition not met, returning false");
    return false;
  }

  SetShapeProperties(properties: any) {
    T3Util.Log("= S.BaseShape - SetShapeProperties input:", properties);
    let changed = false;
    let widthAdjust = 0;
    let heightAdjust = 0;
    let flagUpdated = false;
    const currentTextFlags = this.TextFlags;
    const textFlagConstants = NvConstant.TextFlags;

    // Call parent implementation and check text flags condition
    if (
      // Calling parent's SetShapeProperties
      super.SetShapeProperties(properties) &&
      (changed = true,
        ((this.TextFlags & (textFlagConstants.AttachA + textFlagConstants.AttachB)) !== (currentTextFlags & (textFlagConstants.AttachA + textFlagConstants.AttachB)) &&
          this.DataID >= 0))
    ) {
      flagUpdated = true;
      let style;
      if (this.TextFlags & (textFlagConstants.AttachA + textFlagConstants.AttachB)) {
        style = Utils3.FindStyle(OptConstant.Common.TextBlockStyle);
      } else {
        style = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false).def.style;
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
    // const table = this.GetTable(false);
    if (properties.tmargin != null) {
      // if (table) {
      //   changed = T3Gv.opt.Table_ChangeTextMargin(this, properties.tmargin);
      // } else

      if (this.TMargins.left !== properties.tmargin) {
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
          DataUtil.AddToDirtyList(this.BlockID);
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
      this.ShapeType === OptConstant.ShapeType.Polygon &&
      properties.AdjSides !== ((this.extraflags & OptConstant.ExtraFlags.SideKnobs) > 0)
    ) {
      this.extraflags = Utils2.SetFlag(
        this.extraflags,
        OptConstant.ExtraFlags.SideKnobs,
        properties.SideConn
      );
      DataUtil.AddToDirtyList(this.BlockID);
      changed = true;
    }

    // Update container flag if needed
    if (
      properties.Container != null &&
      properties.Container !== ((this.moreflags & OptConstant.ObjMoreFlags.SED_MF_Container) > 0)
    ) {
      this.moreflags = Utils2.SetFlag(
        this.moreflags,
        OptConstant.ObjMoreFlags.SED_MF_Container,
        properties.Container
      );
      changed = true;
    }

    // Update grow behavior
    if (properties.ObjGrow != null && properties.ObjGrow !== this.ObjGrow) {
      this.ObjGrow = properties.ObjGrow;
      DataUtil.AddToDirtyList(this.BlockID);
      changed = true;
      this.ResizeAspectConstrain = this.ObjGrow === OptConstant.GrowBehavior.ProPortional;
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

    T3Util.Log("= S.BaseShape - SetShapeProperties output:", changed);
    return changed;
  }

  ApplyStyle(style: any, options: any): void {
    T3Util.Log("= S.BaseShape - ApplyStyle input:", { style, options });

    let backupLine: any = null;

    // Only adjust style if not a swimlane or shape container
    if (/*!this.IsSwimlane() && */this.objecttype !== NvConstant.FNObjectTypes.ShapeContainer) {
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

    T3Util.Log("= S.BaseShape - ApplyStyle output:", { style, options });
  }

  SetObjectStyle(style: any): any {
    T3Util.Log("= S.BaseShape.SetObjectStyle input:", style);

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
        OptConstant.ActionTriggerType.LineThickness
      );
    }

    // Restore original line style if it was modified
    if (originalLine != null) {
      style.StyleRecord.Line = Utils1.DeepCopy(originalLine);
    }

    // Clear image and update text flags if necessary
    if (result.StyleRecord && result.StyleRecord.Fill && result.StyleRecord.Fill.FillType) {
      T3Gv.opt.ClearImage(this.BlockID, false, true);

      if (
        (this.flags & NvConstant.ObjFlags.TextOnly) &&
        this.StyleRecord.Fill.Paint.FillType !== NvConstant.FillTypes.Transparent
      ) {
        this.flags = Utils2.SetFlag(this.flags, NvConstant.ObjFlags.TextOnly, false);
      }
    }

    T3Util.Log("= S.BaseShape.SetObjectStyle output:", result);
    return result;
  }

  SetShapeConnectionPoints(connectionType: any, connectionPoints: any, newAttachPoint: any) {
    T3Util.Log("= S.BaseShape - SetShapeConnectionPoints input:", { connectionType, connectionPoints, newAttachPoint });

    let changed = false;

    // Update attach point if different
    if (!(this.attachpoint.x === newAttachPoint.x && this.attachpoint.y === newAttachPoint.y)) {
      this.attachpoint.x = newAttachPoint.x;
      this.attachpoint.y = newAttachPoint.y;
      changed = true;
    }

    switch (connectionType) {
      case NvConstant.ObjFlags.ContConn:
        if ((this.flags & connectionType) === 0) {
          this.flags = Utils2.SetFlag(this.flags, NvConstant.ObjFlags.UseConnect, false);
          this.flags = Utils2.SetFlag(this.flags, NvConstant.ObjFlags.ContConn, true);
          changed = true;
        }
        break;

      case NvConstant.ObjFlags.UseConnect:
        this.flags = Utils2.SetFlag(this.flags, NvConstant.ObjFlags.ContConn, false);
        this.flags = Utils2.SetFlag(this.flags, NvConstant.ObjFlags.UseConnect, true);
        this.ConnectPoints = Utils1.DeepCopy(connectionPoints);
        changed = true;
        break;

      default:
        if (
          (this.flags & NvConstant.ObjFlags.ContConn) ||
          (this.flags & NvConstant.ObjFlags.UseConnect)
        ) {
          this.flags = Utils2.SetFlag(this.flags, NvConstant.ObjFlags.UseConnect, false);
          this.flags = Utils2.SetFlag(this.flags, NvConstant.ObjFlags.ContConn, false);
          changed = true;
        }
    }

    T3Util.Log("= S.BaseShape - SetShapeConnectionPoints output:", changed);
    return changed;
  }

  GetClosestConnectPoint(point: { x: number; y: number }): boolean {
    T3Util.Log("= S.BaseShape - GetClosestConnectPoint input:", point);

    // const table = this.GetTable(false);
    // const useTableRows = (this.hookflags & NvConstant.HookFlags.LcTableRows) && table;
    const useConnect = (this.flags & NvConstant.ObjFlags.UseConnect) && this.ConnectPoints;
    let connectPoints: Array<{ x: number; y: number }> = [];
    const connectDimension = OptConstant.Common.DimMax;

    if (useConnect) {
      // Create a rect with the connection dimension
      const rect = { x: 0, y: 0, width: connectDimension, height: connectDimension };
      connectPoints = Utils1.DeepCopy(this.ConnectPoints);
      T3Gv.opt.FlipPoints(rect, this.extraflags, connectPoints);
      if (this.RotationAngle !== 0) {
        const rotationRadians = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
        Utils3.RotatePointsAboutCenter(rect, rotationRadians, connectPoints);
      }
    }
    // else if (useTableRows) {
    //   // connectPoints = T3Gv.opt.Table_GetRowConnectPoints(this, table);
    //   if (point.x < 10) {
    //     point.x = connectPoints[2].x;
    //     point.y = connectPoints[2].y;
    //     T3Util.Log("= S.BaseShape - GetClosestConnectPoint output:", point);
    //     return true;
    //   }
    //   if (point.x > connectDimension - 10) {
    //     point.x = connectPoints[2 + table.rows.length].x;
    //     point.y = connectPoints[2 + table.rows.length].y;
    //     T3Util.Log("= S.BaseShape - GetClosestConnectPoint output:", point);
    //     return true;
    //   }
    // }

    if (useConnect /*|| useTableRows*/) {
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
      T3Util.Log("= S.BaseShape - GetClosestConnectPoint output:", point);
      return true;
    }

    T3Util.Log("= S.BaseShape - GetClosestConnectPoint output:", false);
    return false;
  }

  GetPolyList() {
    T3Util.Log("= S.BaseShape - GetPolyList input:", {});
    let seg: PolySeg;
    let polyList: PolyList = new PolyList();
    let tempValue: any;
    let frameParam: any;
    let cornerSize: any;
    const shapeTypes = PolygonConstant.ShapeTypes;
    const lineTypes = OptConstant.LineType;

    switch (this.dataclass) {
      case shapeTypes.RECTANGLE:
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

      case shapeTypes.ROUNDED_RECTANGLE:
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
        seg.ShortRef = OptConstant.ArcQuad.PLA_TL;
        seg.param = Math.PI / 2;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, this.inside.width - cornerSize, this.inside.height - cornerSize);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - 2 * cornerSize, this.inside.height);
        polyList.segs.push(seg);
        seg.ShortRef = OptConstant.ArcQuad.SD_PLA_BR;
        seg = new PolySeg(lineTypes.LINE, 0, this.inside.height);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, -cornerSize, this.inside.height - cornerSize);
        seg.ShortRef = OptConstant.ArcQuad.PLA_BL;
        seg.param = Math.PI / 2;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, -cornerSize, cornerSize);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, 0, 0);
        polyList.segs.push(seg);
        polyList.offset.x = cornerSize;
        polyList.offset.y = 0;
        break;

      case shapeTypes.OVAL:
      case shapeTypes.CIRCLE:
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width / 2, this.inside.height / 2);
        polyList.segs.push(seg);
        seg.ShortRef = OptConstant.ArcQuad.SD_PLA_BR;
        seg.param = -Math.PI / 2;
        seg = new PolySeg(lineTypes.ARCSEGLINE, 0, this.inside.height);
        seg.ShortRef = OptConstant.ArcQuad.PLA_BL;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, -this.inside.width / 2, this.inside.height / 2);
        polyList.segs.push(seg);
        seg.ShortRef = OptConstant.ArcQuad.PLA_TL;
        seg.param = -Math.PI / 2;
        seg = new PolySeg(lineTypes.ARCSEGLINE, 0, 0);
        polyList.segs.push(seg);
        seg.ShortRef = OptConstant.ArcQuad.PLA_TL;
        polyList.offset.x = this.inside.width / 2;
        polyList.offset.y = 0;
        break;

      case shapeTypes.DOCUMENT:
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

      case shapeTypes.TERMINAL:
        if (this.inside.width > this.inside.height) {
          cornerSize = this.inside.height / 2;
          seg = new PolySeg(lineTypes.LINE, 0, 0);
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.LINE, this.inside.width - 2 * cornerSize, 0);
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - cornerSize, cornerSize);
          seg.ShortRef = OptConstant.ArcQuad.PLA_TL;
          seg.param = Math.PI / 2;
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - 2 * cornerSize, this.inside.height);
          polyList.segs.push(seg);
          seg.ShortRef = OptConstant.ArcQuad.SD_PLA_BR;
          seg = new PolySeg(lineTypes.LINE, 0, this.inside.height);
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.ARCSEGLINE, -cornerSize, this.inside.height - cornerSize);
          seg.ShortRef = OptConstant.ArcQuad.PLA_BL;
          seg.param = Math.PI / 2;
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.ARCSEGLINE, 0, 0);
          seg.ShortRef = OptConstant.ArcQuad.PLA_TL;
          polyList.segs.push(seg);
        } else {
          cornerSize = this.inside.width / 2;
          seg = new PolySeg(lineTypes.LINE, 0, 0);
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - cornerSize, cornerSize);
          seg.ShortRef = OptConstant.ArcQuad.PLA_TL;
          seg.param = Math.PI / 2;
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.LINE, this.inside.width - cornerSize, this.inside.height - cornerSize);
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - 2 * cornerSize, this.inside.height);
          polyList.segs.push(seg);
          seg.ShortRef = OptConstant.ArcQuad.SD_PLA_BR;
          seg = new PolySeg(lineTypes.ARCSEGLINE, -cornerSize, this.inside.height - cornerSize);
          seg.ShortRef = OptConstant.ArcQuad.PLA_BL;
          seg.param = Math.PI / 2;
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.LINE, -cornerSize, cornerSize);
          polyList.segs.push(seg);
          seg = new PolySeg(lineTypes.ARCSEGLINE, 0, 0);
          seg.ShortRef = OptConstant.ArcQuad.PLA_TL;
          polyList.segs.push(seg);
        }
        polyList.offset.x = cornerSize;
        polyList.offset.y = 0;
        break;

      case shapeTypes.STORAGE:
        cornerSize = this.shapeparam;
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, this.inside.width - cornerSize, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - 2 * cornerSize, this.inside.height / 2);
        seg.ShortRef = OptConstant.ArcQuad.PLA_TL;
        seg.param = -Math.PI / 2;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - cornerSize, this.inside.height);
        polyList.segs.push(seg);
        seg.ShortRef = OptConstant.ArcQuad.PLA_BL;
        seg = new PolySeg(lineTypes.LINE, 0, this.inside.height);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, -cornerSize, this.inside.height / 2);
        seg.ShortRef = OptConstant.ArcQuad.PLA_BL;
        seg.param = Math.PI / 2;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, 0, 0);
        seg.ShortRef = OptConstant.ArcQuad.PLA_TL;
        polyList.segs.push(seg);
        polyList.offset.x = cornerSize;
        polyList.offset.y = 0;
        break;

      case shapeTypes.DELAY:
        cornerSize = this.shapeparam;
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, this.inside.width - cornerSize, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width, this.inside.height / 2);
        seg.ShortRef = OptConstant.ArcQuad.PLA_TL;
        seg.param = Math.PI / 2;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - cornerSize, this.inside.height);
        polyList.segs.push(seg);
        seg.ShortRef = OptConstant.ArcQuad.SD_PLA_BR;
        seg = new PolySeg(lineTypes.LINE, 0, this.inside.height);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.offset.x = 0;
        polyList.offset.y = 0;
        break;

      case shapeTypes.DISPLAY:
        cornerSize = this.shapeparam;
        seg = new PolySeg(lineTypes.LINE, 0, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.LINE, this.inside.width - 2 * cornerSize, 0);
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - cornerSize, this.inside.height / 2);
        seg.ShortRef = OptConstant.ArcQuad.PLA_TL;
        seg.param = Math.PI / 2;
        polyList.segs.push(seg);
        seg = new PolySeg(lineTypes.ARCSEGLINE, this.inside.width - 2 * cornerSize, this.inside.height);
        polyList.segs.push(seg);
        seg.ShortRef = OptConstant.ArcQuad.SD_PLA_BR;
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
        const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, true, false, null);
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
    T3Util.Log("= S.BaseShape - GetPolyList output:", polyList);
    return polyList;
  }

  GetListOfEnclosedObjects(isRecursive: boolean) {
    T3Util.Log("= S.BaseShape - GetListOfEnclosedObjects input:", { isRecursive });
    let enclosedObjects: number[] = [];
    const containerFlag = OptConstant.ObjMoreFlags.SED_MF_Container;

    // Process only if this object is a container.
    if (this.moreflags & containerFlag) {
      if (/*this.IsSwimlane()*/false) {
        if (this.FramezList == null) {
          this.FramezList = [];
        }
        T3Util.Log("= S.BaseShape - GetListOfEnclosedObjects output (Swimlane):", this.FramezList);
        return this.FramezList;
      }

      let tempVar: any;
      let visibleZList = LayerUtil.VisibleZList();
      let polyRect: any = {};
      const visibleCount = visibleZList.length;
      let baseRect = this.trect;
      let basePoly = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, null);

      // If this shape is rotated, update the base polygon accordingly.
      if (this.RotationAngle !== 0) {
        const rotationRadians = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
        Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, basePoly);
      }

      // Determine if we need to adjust the base rect for the table cells.
      let fillIsTransparent = (this.StyleRecord.Fill.Paint.FillType === NvConstant.FillTypes.Transparent);
      // Override fill transparent check.
      fillIsTransparent = false;
      if (!fillIsTransparent) {
        // const tableObj = this.GetTable(false);
        // if (tableObj) {
        //   let cellCount = tableObj.cells.length;
        //   let transparentCellIndex = -1;
        //   for (let i = 0; i < cellCount; i++) {
        //     const cell = tableObj.cells[i];
        //     if (cell.fill.Paint.FillType === NvConstant.FillTypes.Transparent) {
        //       if (transparentCellIndex === -1) {
        //         transparentCellIndex = i;
        //       }
        //     } else if (transparentCellIndex >= 0) {
        //       transparentCellIndex = -2;
        //       break;
        //     }
        //   }
        //   if (transparentCellIndex >= 0) {
        //     // Adjust the base rectangle using the transparent cell's frame.
        //     const cellFrame = tableObj.cells[transparentCellIndex].frame;
        //     let newRect = {
        //       x: cellFrame.x,
        //       y: cellFrame.y,
        //       width: tableObj.wd - cellFrame.x,
        //       height: tableObj.ht - cellFrame.y
        //     };
        //     Utils2.OffsetRect(newRect, this.trect.x, this.trect.y);
        //     baseRect = newRect;
        //     if (this.RotationAngle !== 0) {
        //       const originalFrame = $.extend(true, {}, this.Frame);
        //       this.Frame = newRect;
        //       basePoly = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, null);
        //       this.Frame = originalFrame;
        //       const rotationRadians = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
        //       Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, basePoly);
        //     }
        //   } else {
        //     fillIsTransparent = false;
        //   }
        // }
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
          let candidateObj = DataUtil.GetObjectPtr(candidateId, false);
          let candidatePoly: any;
          let candidateRect: any;
          // If candidate is rotated, compute its polygon points.
          if (candidateObj.RotationAngle !== 0) {
            candidatePoly = candidateObj.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, null);
            const candidateRotation = -candidateObj.RotationAngle / (180 / NvConstant.Geometry.PI);
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
        const candidateObj = DataUtil.GetObjectPtr(containerCandidates[i], false);
        const hookId1 = candidateObj.hooks[0].objid;
        const hookId2 = candidateObj.hooks[1].objid;
        if ((enclosedObjects.indexOf(hookId1) < 0 || enclosedObjects.indexOf(hookId2) < 0) &&
          (enclosedObjects.indexOf(containerCandidates[i]) >= 0)) {
          const indexToRemove = enclosedObjects.indexOf(containerCandidates[i]);
          enclosedObjects.splice(indexToRemove, 1);
        }
      }

    }
    T3Util.Log("= S.BaseShape - GetListOfEnclosedObjects output:", enclosedObjects);
    return enclosedObjects;
  }

  PinProportional(actionRect: { x: number; y: number; width: number; height: number }): void {
    T3Util.Log("= S.BaseShape PinProportional - Input:", actionRect);

    // Define knob size from constants
    const knobSize = OptConstant.Common.KnobSize;
    let currentFrameRect: { x: number; y: number; width: number; height: number } = {} as any;

    // If the shape is rotated, compute the rotated bounding rectangle
    if (this.RotationAngle !== 0) {
      const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, true, null);
      const rotationRadians = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
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
      const deltaWidth = deltaY * (T3Gv.opt.actionAspectRatioWidth / T3Gv.opt.actionAspectRatioHeight);
      actionRect.height -= deltaY;
      actionRect.width -= deltaWidth;
      actionRect.y = margins.left;
    }

    // Adjust actionRect horizontally if its x is less than the left margin.
    if (actionRect.x < margins.left) {
      const deltaX = margins.left - actionRect.x;
      const deltaHeight = deltaX * (T3Gv.opt.actionAspectRatioHeight / T3Gv.opt.actionAspectRatioWidth);
      actionRect.height -= deltaHeight;
      actionRect.width -= deltaX;
      actionRect.x = margins.left;
    }

    T3Util.Log("= S.BaseShape PinProportional - Output:", actionRect);
  }

  /**
   * Handles the tracking of action triggers during interactions like resizing, rotating, or moving shapes
   * @param mouseX - The current X-coordinate of the mouse/pointer
   * @param mouseY - The current Y-coordinate of the mouse/pointer
   * @param event - The interaction event object
   */
  HandleActionTriggerTrackCommon(mouseX, mouseY, event) {
    // Variables for calculations
    let newHeight, newWidth, widthOffset, heightOffset;
    let heightToWidthRatio, widthToHeightRatio;
    let cursorPosition = {
      x: mouseX,
      y: mouseY
    };

    // Calculate distance moved from action start point
    const startX = T3Gv.opt.actionStartX;
    const startY = T3Gv.opt.actionStartY;
    let deltaX = mouseX - startX;
    let deltaY = mouseY - startY;

    // Clone the original bounding box to preserve it
    const originalBBox = $.extend(true, {}, T3Gv.opt.actionBBox);
    const updatedBBox = $.extend(true, {}, T3Gv.opt.actionBBox);

    // Reference to current shape object
    const currentShape = this;
    const tableObject = null;//this.GetTable(false);
    const areSnapsOverridden = T3Gv.opt.OverrideSnaps(event);

    // Function to check if new box position is valid (not outside boundaries)
    const isBoxPositionInvalid = function (box) {
      let effectiveBox;

      // Handle rotation if needed
      if (currentShape.RotationAngle) {
        const rectPoints = Utils2.PolyFromRect(box);
        const rotationRadians = -currentShape.RotationAngle / (180 / NvConstant.Geometry.PI);
        effectiveBox = $.extend(true, {}, box);
        Utils3.RotatePointsAboutCenter(currentShape.Frame, rotationRadians, rectPoints);
        Utils2.GetPolyRect(effectiveBox, rectPoints);
      } else {
        effectiveBox = box;
      }

      // Check if box is outside document boundaries
      if (Math.floor(effectiveBox.x) < 0) return true;
      if (Math.floor(effectiveBox.y) < 0) return true;

      // Check if box exceeds document dimensions
      if (T3Gv.opt.header.flags & OptConstant.CntHeaderFlags.NoAuto) {
        const sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
        if (effectiveBox.x + effectiveBox.width > sessionBlock.dim.x) return true;
        if (effectiveBox.y + effectiveBox.height > sessionBlock.dim.y) return true;
      }

      return false;
    };

    // Process different actions based on the trigger type
    switch (T3Gv.opt.actionTriggerId) {
      case OptConstant.ActionTriggerType.TopLeft:
        // Handle top-left corner resize
        widthOffset = updatedBBox.x - mouseX;
        heightOffset = updatedBBox.y - mouseY;
        updatedBBox.x = mouseX;
        updatedBBox.y = mouseY;
        updatedBBox.width += widthOffset;
        updatedBBox.height += heightOffset;

        if (T3Gv.opt.actionLockAspectRatio) {
          // Maintain aspect ratio during resize
          if (updatedBBox.width < 0) {
            updatedBBox.x = T3Gv.opt.actionBBox.x + T3Gv.opt.actionBBox.width;
            updatedBBox.width = -updatedBBox.width;
          }

          heightToWidthRatio = updatedBBox.width * T3Gv.opt.actionAspectRatioHeight / T3Gv.opt.actionAspectRatioWidth;

          if (updatedBBox.height < 0) {
            updatedBBox.y = T3Gv.opt.actionBBox.y + T3Gv.opt.actionBBox.height;
            updatedBBox.height = heightToWidthRatio;
          } else {
            updatedBBox.y = T3Gv.opt.actionBBox.y + T3Gv.opt.actionBBox.height - heightToWidthRatio;
            updatedBBox.height = heightToWidthRatio;
          }

          this.PinProportional(updatedBBox);
        } else {
          // Regular resize - handle negative dimensions
          if (updatedBBox.width < 0) {
            updatedBBox.x = T3Gv.opt.actionBBox.x + T3Gv.opt.actionBBox.width;
            updatedBBox.width = -updatedBBox.width;
          }

          if (updatedBBox.height < 0) {
            updatedBBox.y = T3Gv.opt.actionBBox.y + T3Gv.opt.actionBBox.height;
            updatedBBox.height = -updatedBBox.height;
          }
        }

        if (isBoxPositionInvalid(updatedBBox)) break;

        T3Gv.opt.actionNewBBox = $.extend(true, {}, updatedBBox);
        this.HandleActionTriggerCallResize(T3Gv.opt.actionNewBBox, true, cursorPosition);
        break;

      case OptConstant.ActionTriggerType.TopCenter:
        // Handle top-center resize
        heightOffset = updatedBBox.y - mouseY;
        updatedBBox.y = mouseY;
        updatedBBox.height = updatedBBox.height + heightOffset;

        if (T3Gv.opt.actionLockAspectRatio) {
          if (updatedBBox.height < 0) {
            updatedBBox.y = T3Gv.opt.actionBBox.y + T3Gv.opt.actionBBox.height;
            updatedBBox.height = -updatedBBox.height;
          }

          widthToHeightRatio = updatedBBox.height * T3Gv.opt.actionAspectRatioWidth / T3Gv.opt.actionAspectRatioHeight;
          updatedBBox.x = T3Gv.opt.actionBBox.x + T3Gv.opt.actionBBox.width / 2 - widthToHeightRatio / 2;
          updatedBBox.width = widthToHeightRatio;
          this.PinProportional(updatedBBox);
        } else if (updatedBBox.height < 0) {
          updatedBBox.y = T3Gv.opt.actionBBox.y + T3Gv.opt.actionBBox.height;
          updatedBBox.height = -updatedBBox.height;
        }

        if (isBoxPositionInvalid(updatedBBox)) break;

        T3Gv.opt.actionNewBBox = $.extend(true, {}, updatedBBox);
        this.HandleActionTriggerCallResize(T3Gv.opt.actionNewBBox, true, cursorPosition);
        break;

      case OptConstant.ActionTriggerType.TopRight:
        // Handle top-right corner resize
        heightOffset = updatedBBox.y - mouseY;
        updatedBBox.y = mouseY;
        updatedBBox.height = updatedBBox.height + heightOffset;
        updatedBBox.width = mouseX - updatedBBox.x;

        if (T3Gv.opt.actionLockAspectRatio) {
          if (updatedBBox.width < 0) {
            updatedBBox.x = mouseX;
            updatedBBox.width = -updatedBBox.width;
          }

          heightToWidthRatio = updatedBBox.width * T3Gv.opt.actionAspectRatioHeight / T3Gv.opt.actionAspectRatioWidth;

          if (updatedBBox.height < 0) {
            updatedBBox.y = T3Gv.opt.actionBBox.y + T3Gv.opt.actionBBox.height;
            updatedBBox.height = heightToWidthRatio;
          } else {
            updatedBBox.y = T3Gv.opt.actionBBox.y + T3Gv.opt.actionBBox.height - heightToWidthRatio;
            updatedBBox.height = heightToWidthRatio;
          }

          this.PinProportional(updatedBBox);
        } else {
          if (updatedBBox.width < 0) {
            updatedBBox.x = mouseX;
            updatedBBox.width = -updatedBBox.width;
          }

          if (updatedBBox.height < 0) {
            updatedBBox.y = T3Gv.opt.actionBBox.y + T3Gv.opt.actionBBox.height;
            updatedBBox.height = -updatedBBox.height;
          }
        }

        if (isBoxPositionInvalid(updatedBBox)) break;

        T3Gv.opt.actionNewBBox = $.extend(true, {}, updatedBBox);
        this.HandleActionTriggerCallResize(T3Gv.opt.actionNewBBox, true, cursorPosition);
        break;

      case OptConstant.ActionTriggerType.CenterRight:
        // Handle center-right resize
        updatedBBox.width = mouseX - updatedBBox.x;

        if (T3Gv.opt.actionLockAspectRatio) {
          if (updatedBBox.width < 0) {
            updatedBBox.x = mouseX;
            updatedBBox.width = -updatedBBox.width;
          }

          heightToWidthRatio = updatedBBox.width * T3Gv.opt.actionAspectRatioHeight / T3Gv.opt.actionAspectRatioWidth;
          updatedBBox.y = T3Gv.opt.actionBBox.y + T3Gv.opt.actionBBox.height / 2 - heightToWidthRatio / 2;
          updatedBBox.height = heightToWidthRatio;
          this.PinProportional(updatedBBox);
        } else if (updatedBBox.width < 0) {
          updatedBBox.x = mouseX;
          updatedBBox.width = -updatedBBox.width;
        }

        if (isBoxPositionInvalid(updatedBBox)) break;

        T3Gv.opt.actionNewBBox = $.extend(true, {}, updatedBBox);
        this.HandleActionTriggerCallResize(T3Gv.opt.actionNewBBox, true, cursorPosition);
        break;

      case OptConstant.ActionTriggerType.BottomRight:
        // Handle bottom-right corner resize
        updatedBBox.width = mouseX - updatedBBox.x;
        updatedBBox.height = mouseY - updatedBBox.y;

        if (T3Gv.opt.actionLockAspectRatio) {
          if (updatedBBox.width < 0) {
            updatedBBox.x = mouseX;
            updatedBBox.width = -updatedBBox.width;
          }

          heightToWidthRatio = updatedBBox.width * T3Gv.opt.actionAspectRatioHeight / T3Gv.opt.actionAspectRatioWidth;

          if (updatedBBox.height < 0) {
            updatedBBox.y = originalBBox.y - heightToWidthRatio;
          }

          updatedBBox.height = heightToWidthRatio;
          this.PinProportional(updatedBBox);
        } else {
          if (updatedBBox.width < 0) {
            updatedBBox.x = mouseX;
            updatedBBox.width = -updatedBBox.width;
          }

          if (updatedBBox.height < 0) {
            updatedBBox.y = mouseY;
            updatedBBox.height = -updatedBBox.height;
          }
        }

        if (isBoxPositionInvalid(updatedBBox)) break;

        T3Gv.opt.actionNewBBox = $.extend(true, {}, updatedBBox);
        this.HandleActionTriggerCallResize(T3Gv.opt.actionNewBBox, true, cursorPosition);
        break;

      case OptConstant.ActionTriggerType.BottomCenter:
        // Handle bottom-center resize
        updatedBBox.height = mouseY - updatedBBox.y;

        if (T3Gv.opt.actionLockAspectRatio) {
          if (updatedBBox.height < 0) {
            updatedBBox.y = mouseY;
            updatedBBox.height = -updatedBBox.height;
          }

          widthToHeightRatio = updatedBBox.height * T3Gv.opt.actionAspectRatioWidth / T3Gv.opt.actionAspectRatioHeight;
          updatedBBox.x = T3Gv.opt.actionBBox.x + T3Gv.opt.actionBBox.width / 2 - widthToHeightRatio / 2;
          updatedBBox.width = widthToHeightRatio;
          this.PinProportional(updatedBBox);
        } else if (updatedBBox.height < 0) {
          updatedBBox.y = mouseY;
          updatedBBox.height = -updatedBBox.height;
        }

        if (isBoxPositionInvalid(updatedBBox)) break;

        T3Gv.opt.actionNewBBox = $.extend(true, {}, updatedBBox);
        this.HandleActionTriggerCallResize(T3Gv.opt.actionNewBBox, true, cursorPosition);
        break;

      case OptConstant.ActionTriggerType.MovePolySeg:
        // Handle polygon segment movement
        cursorPosition.x = mouseX;
        cursorPosition.y = mouseY;
        let shapeObject = DataUtil.GetObjectPtr(this.BlockID, false);
        const originalFrame = $.extend(true, {}, shapeObject.Frame);

        // Apply grid snapping if enabled and not overridden
        if (T3Gv.docUtil.docConfig.enableSnap && !areSnapsOverridden) {
          cursorPosition = T3Gv.docUtil.SnapToGrid(cursorPosition);
        }

        // Convert shape to polyline for manipulation
        OptCMUtil.ShapeToPolyLine(this.BlockID, true, true);
        shapeObject = DataUtil.GetObjectPtr(this.BlockID, false);

        // Move the polygon segment to the new position
        shapeObject.MovePolySeg(
          T3Gv.opt.actionSvgObject,
          cursorPosition.x,
          cursorPosition.y,
          T3Gv.opt.actionTriggerId,
          T3Gv.opt.actionTriggerData
        );

        // Convert back from polyline to shape
        T3Gv.opt.PolyLineToShape(shapeObject.BlockID, true);
        shapeObject = DataUtil.GetObjectPtr(this.BlockID, false);

        // Verify text fit after movement
        const textRect = shapeObject.trect;
        const textWidth = (this.TextGrow === NvConstant.TextGrowBehavior.Horizontal)
          ? T3Gv.opt.header.MaxWorkDim.x
          : textRect.width;

        if (T3Gv.opt.actionSvgObject && T3Gv.opt.actionSvgObject.textElem) {
          const textElement = T3Gv.opt.actionSvgObject.textElem;
          const minDimensions = textElement.CalcTextFit(textWidth);
          const textFitWidth = minDimensions.width;

          // If text doesn't fit, revert the movement
          if (minDimensions.height > textRect.height || textFitWidth > textRect.width) {
            OptCMUtil.ShapeToPolyLine(this.BlockID, true, true);
            const revertObject = DataUtil.GetObjectPtr(this.BlockID, false);
            cursorPosition.x = T3Gv.opt.actionTableLastX;
            cursorPosition.y = T3Gv.opt.actionTableLastY;
            revertObject.MovePolySeg(
              T3Gv.opt.actionSvgObject,
              cursorPosition.x,
              cursorPosition.y,
              T3Gv.opt.actionTriggerId,
              T3Gv.opt.actionTriggerData
            );
            T3Gv.opt.PolyLineToShape(this.BlockID, true);
            shapeObject = DataUtil.GetObjectPtr(this.BlockID, false);
          }
        }

        // Update the bounding box and resize the shape
        T3Gv.opt.actionNewBBox = $.extend(true, {}, shapeObject.Frame);
        shapeObject.HandleActionTriggerCallResize(
          T3Gv.opt.actionNewBBox,
          OptConstant.ActionTriggerType.MovePolySeg,
          cursorPosition
        );

        // Store last position for potential rollback
        T3Gv.opt.actionTableLastX = cursorPosition.x;
        T3Gv.opt.actionTableLastY = cursorPosition.y;

        // Handle rotation adjustments if needed
        if (shapeObject.RotationAngle) {
          const currentRotation = T3Gv.opt.actionSvgObject.GetRotation();
          const updatedFrame = $.extend(true, {}, shapeObject.Frame);
          const positionOffset = T3Gv.opt.svgDoc.CalculateRotatedOffsetForResize(
            originalFrame,
            updatedFrame,
            currentRotation
          );

          const currentPosition = T3Gv.opt.actionSvgObject.GetPos();
          currentPosition.x += positionOffset.x;
          currentPosition.y += positionOffset.y;
          T3Gv.opt.actionSvgObject.SetPos(currentPosition.x, currentPosition.y);

          // Update reference points
          T3Gv.opt.actionBBox.x += positionOffset.x;
          T3Gv.opt.actionBBox.y += positionOffset.y;
          T3Gv.opt.actionStartX += positionOffset.x;
          T3Gv.opt.actionStartY += positionOffset.y;
          shapeObject.Frame.x += positionOffset.x;
          shapeObject.Frame.y += positionOffset.y;
        }
        break;

      case OptConstant.ActionTriggerType.BottomLeft:
        // Handle bottom-left corner resize
        updatedBBox.height = mouseY - updatedBBox.y;
        widthOffset = updatedBBox.x - mouseX;
        updatedBBox.x = mouseX;
        updatedBBox.width += widthOffset;

        if (T3Gv.opt.actionLockAspectRatio) {
          if (updatedBBox.width < 0) {
            updatedBBox.x = T3Gv.opt.actionBBox.x + T3Gv.opt.actionBBox.width;
            updatedBBox.width = -updatedBBox.width;
          }

          heightToWidthRatio = updatedBBox.width * T3Gv.opt.actionAspectRatioHeight / T3Gv.opt.actionAspectRatioWidth;

          if (updatedBBox.height < 0) {
            updatedBBox.y = originalBBox.y - heightToWidthRatio;
          }

          updatedBBox.height = heightToWidthRatio;
          this.PinProportional(updatedBBox);
        } else {
          if (updatedBBox.width < 0) {
            updatedBBox.x = T3Gv.opt.actionBBox.x + T3Gv.opt.actionBBox.width;
            updatedBBox.width = -updatedBBox.width;
          }

          if (updatedBBox.height < 0) {
            updatedBBox.y = mouseY;
            updatedBBox.height = -updatedBBox.height;
          }
        }

        if (isBoxPositionInvalid(updatedBBox)) break;

        T3Gv.opt.actionNewBBox = $.extend(true, {}, updatedBBox);
        this.HandleActionTriggerCallResize(T3Gv.opt.actionNewBBox, true, cursorPosition);
        break;

      case OptConstant.ActionTriggerType.CenterLeft:
        // Handle center-left resize
        widthOffset = updatedBBox.x - mouseX;
        updatedBBox.x = mouseX;
        updatedBBox.width += widthOffset;

        if (T3Gv.opt.actionLockAspectRatio) {
          if (updatedBBox.width < 0) {
            updatedBBox.x = T3Gv.opt.actionBBox.x + T3Gv.opt.actionBBox.width;
            updatedBBox.width = -updatedBBox.width;
          }

          heightToWidthRatio = updatedBBox.width * T3Gv.opt.actionAspectRatioHeight / T3Gv.opt.actionAspectRatioWidth;
          updatedBBox.y = T3Gv.opt.actionBBox.y + T3Gv.opt.actionBBox.height / 2 - heightToWidthRatio / 2;
          updatedBBox.height = heightToWidthRatio;
          this.PinProportional(updatedBBox);
        } else if (updatedBBox.width < 0) {
          updatedBBox.x = T3Gv.opt.actionBBox.x + T3Gv.opt.actionBBox.width;
          updatedBBox.width = -updatedBBox.width;
        }

        if (isBoxPositionInvalid(updatedBBox)) break;

        T3Gv.opt.actionNewBBox = $.extend(true, {}, updatedBBox);
        this.HandleActionTriggerCallResize(T3Gv.opt.actionNewBBox, true, cursorPosition);
        break;

      case OptConstant.ActionTriggerType.ContainerAdj:
        // Handle container adjustment
        let elementCount, elementIndex, dragElement, dragBBox;

        elementCount = T3Gv.opt.dragElementList.length;

        if (T3Gv.opt.theActionContainerArrangement === NvConstant.ContainerListArrangements.Column) {
          // For column arrangement, limit vertical adjustment
          if (-deltaY > T3Gv.opt.actionOldExtra) {
            deltaY = -T3Gv.opt.actionOldExtra;
          }
          T3Gv.opt.actionTableLastY = deltaY;
          deltaX = 0;
        } else {
          // For row arrangement, limit horizontal adjustment
          if (-deltaX > T3Gv.opt.actionOldExtra) {
            deltaX = -T3Gv.opt.actionOldExtra;
          }
          T3Gv.opt.actionTableLastY = deltaX;
          deltaY = 0;
        }

        // Move all elements in the drag list
        for (elementIndex = 0; elementIndex < elementCount; elementIndex++) {
          dragBBox = T3Gv.opt.dragBBoxList[elementIndex];
          dragElement = SvgUtil.GetSVGDragElement(elementIndex);

          if (dragElement) {
            dragElement.SetPos(dragBBox.x + deltaX, dragBBox.y + deltaY);
          }
        }
        break;

      case OptConstant.ActionTriggerType.Rotate:
        // Handle shape rotation
        let rotationAngle = 0;
        const pivotX = T3Gv.opt.rotatePivotX;
        const pivotY = T3Gv.opt.rotatePivotY;
        const vectorX = mouseX - pivotX;
        const vectorY = mouseY - pivotY;

        // Calculate rotation angle based on vector from pivot to mouse position
        if (vectorX === 0 && vectorY === 0) {
          rotationAngle = 0;
        } else if (vectorX === 0) {
          rotationAngle = (vectorY > 0) ? 90 : 270;
        } else if (vectorX >= 0 && vectorY >= 0) {
          rotationAngle = Math.atan(vectorY / vectorX) * (180 / NvConstant.Geometry.PI);
        } else if (vectorX < 0 && (vectorY >= 0 || vectorY < 0)) {
          const radianAngle = Math.atan(vectorY / vectorX);
          rotationAngle = 180 + radianAngle * (180 / NvConstant.Geometry.PI);
        } else if (vectorX >= 0 && vectorY < 0) {
          const radianAngle = Math.atan(vectorY / vectorX);
          rotationAngle = 360 + radianAngle * (180 / NvConstant.Geometry.PI);
        }

        // Apply angle snapping if enabled
        if (T3Gv.docUtil.docConfig.enableSnap && !areSnapsOverridden) {
          const shouldEnhanceSnap = T3Gv.opt.EnhanceSnaps(event);
          const snapAngle = shouldEnhanceSnap ? T3Gv.opt.enhanceRotateSnap : T3Gv.opt.rotateSnap;
          rotationAngle = Math.round(rotationAngle / snapAngle) * snapAngle;
        }

        // Get shape bounds after rotation to check validity
        const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, true, null);
        const rotationRadians = -rotationAngle / (180 / NvConstant.Geometry.PI);
        const rotatedBounds = {};

        Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, polyPoints);
        Utils2.GetPolyRect(rotatedBounds, polyPoints);

        // Check if rotated shape is within valid document bounds
        if (rotatedBounds.x < 0) break;
        if (rotatedBounds.y < 0) break;

        if (T3Gv.opt.header.flags & OptConstant.CntHeaderFlags.NoAuto) {
          const sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
          if (rotatedBounds.x + rotatedBounds.width > sessionBlock.dim.x) break;
          if (rotatedBounds.y + rotatedBounds.height > sessionBlock.dim.y) break;
        }

        // Apply rotation to shape
        T3Gv.opt.rotateEndRotation = rotationAngle;
        this.Rotate(T3Gv.opt.actionSvgObject, rotationAngle);
        break;

      case OptConstant.ActionTriggerType.DimLineAdj:
        // Handle dimension line adjustment
        this.DimensionLineDeflectionAdjust(
          T3Gv.opt.actionSvgObject,
          mouseX,
          mouseY,
          T3Gv.opt.actionTriggerId,
          T3Gv.opt.actionTriggerData
        );
        break;
    }
  }


  /**
   * Handles the resize action for shapes when triggered by user interactions
   * This method updates the shape's dimensions and position while maintaining
   * constraints like minimum size, aspect ratio, and handling special cases
   * for tables, text objects, etc.
   *
   * @param newBoundingBox - The new bounding box/frame dimensions for the shape
   * @param actionType - Type of action triggering the resize (e.g., corner drag, line length change)
   * @param cursorPosition - Current cursor position during the resize operation
   * @param previousBoundingBox - Optional reference to the previous bounding box state
   */
  HandleActionTriggerCallResize(newBoundingBox, actionType, cursorPosition, previousBoundingBox) {
    let tableResizeResult;
    let adjustedTextRect;
    let resizedTableDimensions;
    let isLineThicknessAction = false;
    let isLineLengthAction = false;

    // Store the previous bounding box for reference
    this.prevBBox = previousBoundingBox
      ? $.extend(true, {}, previousBoundingBox)
      : $.extend(true, {}, this.Frame);

    // Save original frame in case we need to revert
    const originalFrame = $.extend(false, {}, this.Frame);

    // Enforce minimum dimensions
    if (newBoundingBox.width < OptConstant.Common.MinDim) {
      newBoundingBox.width = OptConstant.Common.MinDim;
    }
    if (newBoundingBox.height < OptConstant.Common.MinDim) {
      newBoundingBox.height = OptConstant.Common.MinDim;
    }

    // Update the frame with new dimensions
    this.UpdateFrame(newBoundingBox);

    // Handle special action types
    if (actionType === OptConstant.ActionTriggerType.LineLength) {
      actionType = 0;
      isLineLengthAction = true;
    }
    if (actionType === OptConstant.ActionTriggerType.LineThickness) {
      actionType = 0;
      isLineThicknessAction = true;
    }

    // Update display coordinates if this is the active object being resized
    if (T3Gv.opt.actionStoredObjectId === this.BlockID && cursorPosition) {
      UIUtil.UpdateDisplayCoordinates(
        newBoundingBox,
        cursorPosition,
        CursorConstant.CursorTypes.Grow,
        this
      );
    }

    // Determine if we should update the text frame
    let shouldUpdateTextFrame = true;
    const tableObject = null; // this.GetTable(false); - commented out in original code

    // Handle special cases for text frame updates
    if (actionType === -1) {
      shouldUpdateTextFrame = false;
      actionType = true;
    }

    // else if (actionType === OptConstant.ActionTriggerType.TABLE_EDIT) {
    //   shouldUpdateTextFrame = false;
    //   actionType = false;
    // }

    // Handle table resizing
    if (tableObject && shouldUpdateTextFrame) {
      const widthChange = newBoundingBox.width - T3Gv.opt.actionBBox.width;

      // Create a copy of the table for the resize operation if needed
      if (!actionType) {
        T3Gv.opt.theActionTable = Utils1.DeepCopy(tableObject);
      }

      // Handle width changes
      let targetWidth = null;
      if (Utils2.IsEqual(widthChange, 0) && !isLineThicknessAction) {
        // No width change, use existing table width
        targetWidth = null;
        this.trect.width = tableObject.wd;
        this.TRectToFrame(this.trect, actionType || isLineLengthAction);
      } else {
        targetWidth = this.trect.width;
      }

      // Handle height changes
      const heightChange = newBoundingBox.height - T3Gv.opt.actionBBox.height;
      let targetHeight = null;
      if (Utils2.IsEqual(heightChange, 0) && !isLineThicknessAction) {
        // No height change, use existing table height
        targetHeight = null;
        this.trect.height = tableObject.ht;
        this.TRectToFrame(this.trect, actionType || isLineLengthAction);
      } else {
        targetHeight = this.trect.height;
      }

      // // Adjust dimensions based on action type
      // switch (actionType) {
      //   case OptConstant.ActionTriggerType.TableRow:
      //     targetHeight = null;
      //     break;
      //   case OptConstant.ActionTriggerType.TableCol:
      //     targetWidth = null;
      // }

      // If either dimension needs updating, resize the table
      if (targetWidth || targetHeight) {
        // const originalTableHeight = T3Gv.opt.theActionTable.ht;
        // const updatedTableObject = null; // this.GetTable(true); - commented out in original code

        // // Resize the table with new dimensions
        // resizedTableDimensions = T3Gv.opt.Table_Resize(
        //   this,
        //   updatedTableObject,
        //   T3Gv.opt.theActionTable,
        //   targetWidth,
        //   targetHeight
        // );

        // // If the height changed and we are in a resize action, update bounding box
        // if (!Utils2.IsEqual(resizedTableDimensions.y, originalTableHeight) && (actionType || isLineThicknessAction)) {
        //   const updatedShape = Utils1.DeepCopy(this);
        //   updatedShape.trect.width = resizedTableDimensions.x;
        //   updatedShape.trect.height = resizedTableDimensions.y;
        //   updatedShape.TRectToFrame(updatedShape.trect, true);
        //   T3Gv.opt.actionNewBBox.height = updatedShape.Frame.height;
        // }

        // If the dimensions changed significantly or if this is a length action with height change
        const widthChanged = resizedTableDimensions.x - this.trect.width > 0.1;
        const heightChanged = resizedTableDimensions.y - this.trect.height > 0.1;
        const heightChangedInLengthAction = true;// !Utils2.IsEqual(resizedTableDimensions.y, originalTableHeight) && isLineLengthAction;

        if (widthChanged || heightChanged || heightChangedInLengthAction) {
          if (widthChanged && heightChanged && !actionType) {
            // Both dimensions changed significantly and not an explicit action
            adjustedTextRect = {
              x: this.trect.x,
              y: this.trect.y,
              width: resizedTableDimensions.x,
              height: resizedTableDimensions.y
            };

            this.TRectToFrame(adjustedTextRect, actionType || isLineLengthAction);
            newBoundingBox = $.extend(false, {}, this.Frame);
            return;
          } else if (actionType) {
            T3Gv.opt.actionNewBBox = $.extend(false, {}, this.Frame);
          }
        }
      }
    }
    // Handle text object resizing
    else if (this.DataID !== -1 &&
      !(this.TextFlags & NvConstant.TextFlags.AttachA ||
        this.TextFlags & NvConstant.TextFlags.AttachB)) {

      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);

      if (svgElement) {
        let textFitResult;
        const textElement = svgElement.textElem;
        adjustedTextRect = this.trect;

        // Calculate text fit based on growth constraints
        const maxTextWidth = (this.TextGrow === NvConstant.TextGrowBehavior.Horizontal)
          ? T3Gv.opt.header.MaxWorkDim.x
          : adjustedTextRect.width;

        textFitResult = textElement
          ? textElement.CalcTextFit(maxTextWidth)
          : { width: 0, height: 0 };

        // Trim decimal places based on ruler configuration
        const trimmedTextWidth = Utils2.TrimDP(textFitResult.width, T3Gv.docUtil.rulerConfig.dp);
        const trimmedTextHeight = Utils2.TrimDP(textFitResult.height, T3Gv.docUtil.rulerConfig.dp);
        const roundedTextWidth = Utils2.TrimDP(textFitResult.width, 0);
        const roundedTextHeight = Utils2.TrimDP(textFitResult.height, 0);
        const roundedRectHeight = Utils2.TrimDP(adjustedTextRect.height, 0);
        const roundedRectWidth = Utils2.TrimDP(adjustedTextRect.width, 0);

        // Adjust calculations for nearly equal values (within 1 unit)
        let effectiveTextHeight = roundedTextHeight;
        let effectiveTextWidth = roundedTextWidth;

        if (roundedTextHeight !== 0 && Math.abs(roundedRectHeight - roundedTextHeight) <= 1) {
          effectiveTextHeight = roundedRectHeight;
        }

        if (roundedTextWidth !== 0 && Math.abs(roundedRectWidth - roundedTextWidth) <= 1) {
          effectiveTextWidth = roundedRectWidth;
        }

        // If the text doesn't fit, adjust dimensions
        if (effectiveTextHeight > roundedRectHeight || effectiveTextWidth > roundedRectWidth) {
          if (!actionType) {
            // Not an action - recalculate the frame to fit the text
            adjustedTextRect = Utils1.DeepCopy(this.trect);

            if (trimmedTextHeight > adjustedTextRect.height) {
              adjustedTextRect.height = trimmedTextHeight;
            }

            if (trimmedTextWidth > adjustedTextRect.width) {
              adjustedTextRect.width = trimmedTextWidth;
            }

            this.TRectToFrame(adjustedTextRect, actionType);
          }

          // Revert to original frame
          this.UpdateFrame(originalFrame);
          return;
        }
      }
    }

    // Handle SVG element resizing when actionType is truthy and this is the active object
    if (actionType &&
      T3Gv.opt.actionSvgObject &&
      T3Gv.opt.actionStoredObjectId === this.BlockID) {

      // Resize SVG element and get position offset
      const positionOffset = this.Resize(
        T3Gv.opt.actionSvgObject,
        T3Gv.opt.actionNewBBox,
        this,
        actionType
      );

      // Apply position offset to all relevant coordinates
      T3Gv.opt.actionBBox.x += positionOffset.x;
      T3Gv.opt.actionBBox.y += positionOffset.y;
      T3Gv.opt.actionStartX += positionOffset.x;
      T3Gv.opt.actionStartY += positionOffset.y;
      this.Frame.x += positionOffset.x;
      this.Frame.y += positionOffset.y;
      this.inside.x += positionOffset.x;
      this.inside.y += positionOffset.y;
      this.trect.x += positionOffset.x;
      this.trect.y += positionOffset.y;
    }
  }

  /**
   * Handles auto-scrolling functionality when manipulating shapes (resizing, moving, etc.)
   * This function is called periodically via a timer to maintain continuous scrolling
   * while the cursor is near document edges during a drag operation.
   */
  HandleActionTriggerDoAutoScroll() {
    // Set timer to call this function again after 100ms for continuous scrolling
    T3Gv.opt.autoScrollTimerId = T3Gv.opt.autoScrollTimer.setTimeout('HandleActionTriggerDoAutoScroll', 100);

    // Convert window coordinates to document coordinates
    let documentCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      T3Gv.opt.autoScrollXPos,
      T3Gv.opt.autoScrollYPos
    );

    // Apply boundary constraints to prevent dragging outside allowed areas
    this.PinAction(documentCoordinates);

    // Apply any auto-grow adjustments to the coordinates
    documentCoordinates = DrawUtil.DoAutoGrowDrag(documentCoordinates);

    // Scroll the document to the calculated position
    T3Gv.docUtil.ScrollToPosition(documentCoordinates.x, documentCoordinates.y);

    // If we're not in rotation mode but the object has rotation applied,
    // transform the coordinates to account for object rotation
    if (T3Gv.opt.actionTriggerId !== OptConstant.ActionTriggerType.Rotate &&
      T3Gv.opt.rotateObjectRadians) {

      // Store original x and y coordinates
      let xPosition = documentCoordinates.x;
      let yPosition = documentCoordinates.y;

      // Calculate object center point
      const clickPoint = { x: xPosition, y: yPosition };
      const centerPoint = {};
      const objectFrame = DataUtil.GetObjectPtr(T3Gv.opt.actionStoredObjectId, false).Frame;

      centerPoint.x = objectFrame.x + objectFrame.width / 2;
      centerPoint.y = objectFrame.y + objectFrame.height / 2;

      // Rotate the point around the object's center
      const rotatedPoint = T3Gv.opt.RotatePointAroundPoint(
        centerPoint,
        clickPoint,
        T3Gv.opt.rotateObjectRadians
      );

      // Update coordinates with rotated values
      xPosition = rotatedPoint.x;
      yPosition = rotatedPoint.y;
      documentCoordinates.x = xPosition;
      documentCoordinates.y = yPosition;
    }

    // Continue the action tracking with the adjusted coordinates
    this.HandleActionTriggerTrackCommon(documentCoordinates.x, documentCoordinates.y);
  }

  AutoScrollCommon(event, enableSnap, autoScrollCallback) {
    T3Util.Log("= S.BaseShape - AutoScrollCommon input:", { event, enableSnap, autoScrollCallback });

    let shouldAutoScroll = false;
    const overrideSnaps = T3Gv.opt.OverrideSnaps(event);
    if (overrideSnaps) {
      enableSnap = false;
    }

    const clientX = event.gesture.center.clientX;
    const clientY = event.gesture.center.clientY;
    let scrollX = clientX;
    let scrollY = clientY;
    const docInfo = T3Gv.opt.svgDoc.docInfo;

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
      if (enableSnap && T3Gv.docUtil.docConfig.enableSnap) {
        const snappedCoords = T3Gv.docUtil.SnapToGrid({ x: scrollX, y: scrollY });
        scrollX = snappedCoords.x;
        scrollY = snappedCoords.y;
      }

      T3Gv.opt.autoScrollXPos = scrollX;
      T3Gv.opt.autoScrollYPos = scrollY;

      if (T3Gv.opt.autoScrollTimerId !== -1) {
        T3Util.Log("= S.BaseShape - AutoScrollCommon output: false (timer already set)");
        return false;
      }

      T3Gv.opt.autoScrollTimer = new T3Timer(this);
      T3Gv.opt.autoScrollTimerId = T3Gv.opt.autoScrollTimer.setTimeout(autoScrollCallback, 0);
      T3Util.Log("= S.BaseShape - AutoScrollCommon output: false (timer started)");
      return false;
    }

    this.ResetAutoScrollTimer();
    T3Util.Log("= S.BaseShape - AutoScrollCommon output: true");
    return true;
  }

  PinAction(coords) {
    T3Util.Log("= S.BaseShape - PinAction input:", coords);

    const knobSize = OptConstant.Common.KnobSize;
    let frameRect = {};
    let rotatedRect = {};

    if (this.RotationAngle !== 0) {
      const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, true, null);
      const rotationRadians = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
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

    if (T3Gv.opt.header.flags & OptConstant.CntHeaderFlags.NoAuto) {
      const sessionBlock = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;
      if (coords.x > sessionBlock.dim.x - frameRect.right) {
        coords.x = sessionBlock.dim.x - frameRect.right;
      }
      if (coords.y > sessionBlock.dim.y - frameRect.bottom) {
        coords.y = sessionBlock.dim.y - frameRect.bottom;
      }
    }

    T3Util.Log("= S.BaseShape - PinAction output:", coords);
    return coords;
  }

  ActionApplySnaps(coords, triggerType) {
    T3Util.Log("= S.BaseShape - ActionApplySnaps input:", { coords, triggerType });

    let snapRect = this.GetSnapRect();
    let snapApplied = false;
    let snapGuides = [];
    let adjustedRect = {};
    let snapOffsets = { x: null, y: null };
    const actionTriggerType = OptConstant.ActionTriggerType;

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

    if (DrawUtil.AllowSnapToShapes()) {
      switch (triggerType) {
        case actionTriggerType.BottomCenter:
          adjustBottom(snapRect);
          break;
        case actionTriggerType.BottomLeft:
          adjustBottom(snapRect);
          adjustRight(Utils1.DeepCopy(adjustedRect));
          break;
        case actionTriggerType.BottomRight:
          adjustBottom(snapRect);
          adjustLeft(Utils1.DeepCopy(adjustedRect));
          break;
        case actionTriggerType.CenterLeft:
          adjustRight(snapRect);
          break;
        case actionTriggerType.CenterRight:
          adjustLeft(snapRect);
          break;
        case actionTriggerType.TopCenter:
          adjustTop(snapRect);
          break;
        case actionTriggerType.TopRight:
          adjustTop(snapRect);
          adjustLeft(Utils1.DeepCopy(adjustedRect));
          break;
        case actionTriggerType.TopLeft:
          adjustTop(snapRect);
          adjustRight(Utils1.DeepCopy(adjustedRect));
          break;
      }

      if (snapApplied) {
        dynamicGuides = new DynamicGuides();
        if (this.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
          //DynamicSnapsGetSnapObjects(selectedObject, bounds, dynamicGuides, snapDistance, includeCenters, restrictToVisible)

          snapOffsets = DynamicUtil.DynamicSnapsGetSnapObjects(this.BlockID, adjustedRect, dynamicGuides, null, snapGuides);
          if (snapOffsets.x !== null) coords.x += snapOffsets.x;
          if (snapOffsets.y !== null) coords.y += snapOffsets.y;
        }
      }
    }

    if (T3Gv.docUtil.docConfig.enableSnap) {
      const gridSnap = T3Gv.docUtil.SnapToGrid(coords);
      if (snapOffsets.x === null) coords.x = gridSnap.x;
      if (snapOffsets.y === null) coords.y = gridSnap.y;
    }

    T3Util.Log("= S.BaseShape - ActionApplySnaps output:", dynamicGuides);
    return dynamicGuides;
  }

  /**
   * Handles the tracking (dragging) of actions like resizing, rotating, or moving shapes
   * This is called continuously as the user drags to update the shape's position/size
   *
   * @param mouseEvent - The mouse/touch event containing gesture information
   * @returns Boolean indicating whether tracking succeeded
   */
  LMActionTrack(mouseEvent) {
    // Stop event propagation and prevent default behaviors
    Utils2.StopPropagationAndDefaults(mouseEvent);

    // If no action object is being tracked, exit early
    if (T3Gv.opt.actionStoredObjectId == -1) {
      return false;
    }

    // Get the object being manipulated
    let targetObject = null;
    const actionTriggerType = OptConstant.ActionTriggerType;
    targetObject = DataUtil.GetObjectPtr(T3Gv.opt.actionStoredObjectId, false);

    // Hide dimension lines during drag if not rotating
    if (T3Gv.opt.actionTriggerId != OptConstant.ActionTriggerType.Rotate) {
      targetObject.SetDimensionLinesVisibility(T3Gv.opt.actionSvgObject, false);
    }

    // Get the current frame of the object
    const objectFrame = targetObject.Frame;

    // Convert window coordinates to document coordinates
    let documentCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      mouseEvent.gesture.center.clientX,
      mouseEvent.gesture.center.clientY
    );

    // Keep coordinates within valid boundaries
    this.PinAction(documentCoordinates);

    // Apply auto-growth to the coordinates
    documentCoordinates = DrawUtil.DoAutoGrowDrag(documentCoordinates);

    // Check if snaps are overridden by modifier keys
    const snapOverridden = T3Gv.opt.OverrideSnaps(mouseEvent);

    // Determine if snaps should be skipped based on action type
    let skipSnap = false;
    switch (T3Gv.opt.actionTriggerId) {
      case actionTriggerType.MODIFYSHAPE:
      case actionTriggerType.ROTATE:
        skipSnap = true;
        break;
    }

    // Apply snaps if not overridden or skipped
    let dynamicGuides = null;
    if (!skipSnap && !snapOverridden) {
      dynamicGuides = this.ActionApplySnaps(documentCoordinates, T3Gv.opt.actionTriggerId);
    }

    // Extract x and y coordinates
    let posX = documentCoordinates.x;
    let posY = documentCoordinates.y;

    // Transform coordinates if object is rotated and we're not in rotation mode
    if (T3Gv.opt.actionTriggerId != OptConstant.ActionTriggerType.Rotate && T3Gv.opt.rotateObjectRadians) {
      // Set up transformation points
      const clickPoint = { x: posX, y: posY };
      const centerPoint = { x: objectFrame.x + objectFrame.width / 2, y: objectFrame.y + objectFrame.height / 2 };

      // Rotate the coordinates around the object's center
      const rotatedPoint = T3Gv.opt.RotatePointAroundPoint(centerPoint, clickPoint, T3Gv.opt.rotateObjectRadians);

      // Update coordinates with rotated values
      posX = rotatedPoint.x;
      posY = rotatedPoint.y;
      documentCoordinates.x = posX;
      documentCoordinates.y = posY;
    }

    // Handle auto-scrolling and continue tracking if needed
    if (this.AutoScrollCommon(mouseEvent, true, 'HandleActionTriggerDoAutoScroll')) {
      // Process coordinates through action-specific tracking
      documentCoordinates = this.LMActionDuringTrack(documentCoordinates);

      // Perform the actual tracking update with processed coordinates
      this.HandleActionTriggerTrackCommon(documentCoordinates.x, documentCoordinates.y, mouseEvent);

      // Show dimension lines while tracking if not rotating
      if (T3Gv.opt.actionTriggerId != OptConstant.ActionTriggerType.Rotate && targetObject) {
        targetObject.SetDimensionLinesVisibility(T3Gv.opt.actionSvgObject, true);
      }

      // Update dynamic snap guides if they exist
      if (dynamicGuides) {
        // Save the current frame
        const originalFrame = Utils1.DeepCopy(this.Frame);

        // Temporarily set the frame to the action's new bounding box
        this.Frame = T3Gv.opt.actionNewBBox;

        // Get the snap rectangle based on the new frame
        const snapRect = this.GetSnapRect();

        // Restore the original frame
        this.Frame = originalFrame;

        // Update the dynamic guides with the snap rectangle
        DynamicUtil.DynamicSnapsUpdateGuides(dynamicGuides, this.BlockID, snapRect);
      }
    }
  }

  /**
   * Handles the release of an action trigger on a shape (like resize, rotate, etc.)
   * @param event - The event object that triggered the action release
   * @param additionalData - Any additional data related to the action
   */
  LMActionRelease(event, additionalData) {
    T3Util.Log("S.BasicShape - LMActionRelease input:", { event, additionalData });

    try {
      // const isNgTimeline = false;// this.objecttype === NvConstant.FNObjectTypes.SD_OBJT_NG_TIMELINE;
      let needUpdateWidth = false;
      let isTableOperation = false;

      // Get the object being manipulated
      const actionObject = DataUtil.GetObjectPtr(T3Gv.opt.actionStoredObjectId, false);
      if (actionObject == null) return;

      // Handle standard release (no additional data provided)
      if (additionalData == null) {
        // Unbind event handlers and reset timers
        LMEvtUtil.UnbindActionClickHammerEvents();
        this.ResetAutoScrollTimer();

        // Exit early if no action SVG object or invalid stored ID
        if (T3Gv.opt.actionSvgObject == null) return;
        if (T3Gv.opt.actionStoredObjectId < 0) return;

        // Prepare data for potential collaboration
        isTableOperation = false;
        let collaborationData;

        if (true) { // Previously Collab.AllowMessage()
          collaborationData = {
            BlockID: T3Gv.opt.actionStoredObjectId,
            ActionTriggerID: T3Gv.opt.actionTriggerId,
            ActionData: T3Gv.opt.actionTriggerData
          };
          collaborationData.Frame = Utils1.DeepCopy(actionObject.Frame);
          collaborationData.rotateEndRotation = T3Gv.opt.rotateEndRotation;
        }

        // Remove dynamic snap guides
        DynamicUtil.DynamicSnapsRemoveGuides(T3Gv.opt.dynamicGuides);
        T3Gv.opt.dynamicGuides = null;

        // Handle different action trigger types
        let tableObject;
        switch (T3Gv.opt.actionTriggerId) {
          // case OptConstant.ActionTriggerType.TableRow:
          //   tableObject = actionObject.GetTable(false);
          //   if (tableObject) {
          //     const rowInfo = T3Gv.opt.Table_GetRowAndSegment(T3Gv.opt.actionTriggerData);
          //     T3Gv.opt.Table_SelectRowDivider(actionObject, rowInfo.row, false);
          //   }
          //   isTableOperation = true;
          //   break;

          // case OptConstant.ActionTriggerType.TableCol:
          //   tableObject = actionObject.GetTable(false);
          //   if (tableObject) {
          //     const colInfo = T3Gv.opt.Table_GetColumnAndSegment(T3Gv.opt.actionTriggerData);
          //     let columnIndex = colInfo.column;

          //     if (this.objecttype === NvConstant.FNObjectTypes.SD_OBJT_SWIMLANE_COLS && this.RotationAngle) {
          //       colInfo.column++;
          //     }

          //     if (columnIndex >= 0) {
          //       T3Gv.opt.Table_SelectColDivider(actionObject, columnIndex, false);
          //     }

          //     if (true) { // Previously Collab.AllowMessage()
          //       collaborationData.ColumnWidth = tableObject.cols[colInfo.column].x;
          //       if (colInfo.column > 0) {
          //         collaborationData.ColumnWidth -= tableObject.cols[colInfo.column - 1].x;
          //       }
          //     }
          //   }
          //   isTableOperation = true;
          //   needUpdateWidth = true;
          //   break;

          // case OptConstant.ActionTriggerType.TABLE_SELECT:
          // case OptConstant.ActionTriggerType.TABLE_ROWSELECT:
          // case OptConstant.ActionTriggerType.TABLE_COLSELECT:
          //   isTableOperation = true;
          //   if (!false) { // Previously !Collab.IsPrimary()
          //     collaborationData = null;
          //   }
          //   break;

          case OptConstant.ActionTriggerType.MovePolySeg:
            isTableOperation = true;
            if (true) { // Previously Collab.AllowMessage()
              const shapeObject = DataUtil.GetObjectPtr(this.BlockID, false);
              collaborationData.left_sindent = shapeObject.left_sindent;
              collaborationData.right_sindent = shapeObject.right_sindent;
              collaborationData.top_sindent = shapeObject.top_sindent;
              collaborationData.bottom_sindent = shapeObject.bottom_sindent;
              collaborationData.tindent = {};
              collaborationData.tindent.left = shapeObject.tindent.left;
              collaborationData.tindent.right = shapeObject.tindent.right;
              collaborationData.tindent.top = shapeObject.tindent.top;
              collaborationData.tindent.bottom = shapeObject.tindent.bottom;

              if (shapeObject.polylist) {
                collaborationData.polylist = Utils1.DeepCopy(shapeObject.polylist);
              }

              if (shapeObject.VertexArray) {
                collaborationData.VertexArray = Utils1.DeepCopy(shapeObject.VertexArray);
              }
            }
            break;

          case OptConstant.ActionTriggerType.DimLineAdj:
            if (true) { // Previously Collab.AllowMessage()
              collaborationData.dimensionDeflectionH = this.dimensionDeflectionH;
              collaborationData.dimensionDeflectionV = this.dimensionDeflectionV;
            }
            break;

          case OptConstant.ActionTriggerType.ContainerAdj:
            if (true) { // Previously Collab.AllowMessage()
              collaborationData.actionTableLastY = T3Gv.opt.actionTableLastY;
            }
            break;
        }

        // Send collaboration message and hide dimension lines
        if (true && collaborationData != null) { // Previously Collab.AllowMessage()
          // Collab.BuildMessage(NvConstant.CollabMessages.Action_Shape, collaborationData, false);
        }
        actionObject.SetDimensionLinesVisibility(T3Gv.opt.actionSvgObject, false);
      } else if (T3Gv.opt.actionTriggerId === OptConstant.ActionTriggerType.MovePolySeg) {
        isTableOperation = true;
      }

      // Handle container adjustment
      if (T3Gv.opt.actionTriggerId === OptConstant.ActionTriggerType.ContainerAdj) {
        T3Gv.opt.moveList = [];
        T3Gv.opt.dragElementList.length = 0;
        T3Gv.opt.dragBBoxList.length = 0;
        T3Gv.opt.actionOldExtra = 0;
        this.PrUpdateExtra(T3Gv.opt.actionTableLastY);
      }
      // Handle rotation
      else if (T3Gv.opt.actionTriggerId === OptConstant.ActionTriggerType.Rotate) {
        // Normalize rotation angle to 0-360
        T3Gv.opt.rotateEndRotation = T3Gv.opt.rotateEndRotation % 360;

        // Set the rotation angle
        T3Gv.opt.SetObjectAttributes(
          T3Gv.opt.actionStoredObjectId,
          { RotationAngle: T3Gv.opt.rotateEndRotation }
        );

        // Update frame and dimension lines
        T3Gv.opt.SetObjectFrame(T3Gv.opt.actionStoredObjectId, actionObject.Frame);
        this.UpdateDimensionLines(T3Gv.opt.actionSvgObject);
      }
      // Handle other operations that aren't table or polygon operations
      else if (!isTableOperation) {
        // Update the object frame
        const newFrame = $.extend(true, {}, actionObject.Frame);
        T3Gv.opt.SetObjectFrame(T3Gv.opt.actionStoredObjectId, newFrame);

        // Scale polygon if needed
        if (this.polylist && this.ShapeType === OptConstant.ShapeType.Polygon) {
          this.ScaleObject(0, 0, 0, 0, 0, 0);
        }

        needUpdateWidth = true;
      }

      // Handle post-release operations
      this.LMActionPostRelease(T3Gv.opt.actionStoredObjectId);

      // Show dimension lines if needed
      if (additionalData == null) {
        actionObject.SetDimensionLinesVisibility(T3Gv.opt.actionSvgObject, true);
      }

      // Update dirty list if shape has hyperlink, note or field data
      if (this.HyperlinkText !== '' || this.NoteID !== -1 || this.HasFieldData()) {
        DataUtil.AddToDirtyList(T3Gv.opt.actionStoredObjectId);
      }

      // Clean up
      T3Gv.opt.actionStoredObjectId = -1;
      T3Gv.opt.actionSvgObject = null;
      // T3Gv.opt.theActionTable = null;
      LayerUtil.ShowOverlayLayer();
      DrawUtil.CompleteOperation(null);

      T3Util.Log("S.BasicShape - LMActionRelease output: completed");
    } catch (error) {
      this.LMActionClickExpCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }
  }

  /**
   * Performs preparation tasks before tracking an action like resize or move
   * This method resets floating point dimension flags to ensure accurate shape manipulation
   *
   * @param objectId - The ID of the object being manipulated
   * @param actionType - The type of action being performed
   */
  LMActionPreTrack(objectId, actionType) {
    // Reset width and height floating point dimension flags if they exist
    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
    }
  }

  /**
   * Processes coordinates during action tracking (like resize, move, etc.)
   * This is a hook method that subclasses can override to implement custom behavior
   *
   * @param coordinates - The current coordinates during the action tracking
   * @returns The processed coordinates (by default returns unchanged coordinates)
   */
  LMActionDuringTrack(coordinates) {
    return coordinates;
  }

  /**
   * Performs cleanup tasks after an action is released
   * Updates shape dimensions, formats, and link flags based on the action type
   *
   * @param objectId - The ID of the object that was manipulated
   */
  LMActionPostRelease(objectId) {
    // Handle format painter operations
    const applyFormatPainting = () => {
      if (T3Gv.opt.crtOpt === OptConstant.OptTypes.FormatPainter) {
        if (T3Gv.opt.formatPainterMode === TODO.formatPainterModes.OBJECT) {
          // Format painting logic for objects would go here
          // If table support is needed, uncomment:
          // var activeTableId = T3Gv.opt.Table_GetActiveID();
          // T3Gv.opt.Table_PasteFormat(activeTableId, T3Gv.opt.formatPainterStyle, false);
        }

        // If format painter is not sticky, disable it
        if (T3Gv.opt.formatPainterSticky !== true) {
          UIUtil.SetFormatPainter(true, false);
        }
      }
    };

    // // Skip update links for special container cases
    // if (this.objecttype !== NvConstant.FNObjectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER) {
    //   T3Gv.opt.UpdateLinks();
    // }

    // Clear link parameters
    T3Gv.opt.linkParams = null;

    // For table operations (commented out as table support is disabled)
    // const tableObject = this.GetTable(false);

    // Reset edit mode to default
    OptCMUtil.SetEditMode(NvConstant.EditState.Default);

    // Handle different actions based on trigger type
    switch (T3Gv.opt.actionTriggerId) {
      // Table-related cases (commented out as table support is disabled)
      // case OptConstant.ActionTriggerType.TableRow:
      //   if (T3Gv.opt.theActionTable && tableObject &&
      //       T3Gv.opt.theActionTable.ht != tableObject.ht) {
      //     this.sizedim.height = this.Frame.height;
      //   }
      //   T3Gv.opt.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.Move);
      //   applyFormatPainting();
      //   break;

      // case OptConstant.ActionTriggerType.TableCol:
      //   if (T3Gv.opt.theActionTable && tableObject &&
      //       T3Gv.opt.theActionTable.wd != tableObject.wd) {
      //     this.sizedim.width = this.Frame.width;
      //   }
      //   T3Gv.opt.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.Move);
      //   applyFormatPainting();
      //   break;

      // case OptConstant.ActionTriggerType.TABLE_SELECT:
      // case OptConstant.ActionTriggerType.TABLE_ROWSELECT:
      // case OptConstant.ActionTriggerType.TABLE_COLSELECT:
      //   if (T3Gv.opt.crtOpt === OptConstant.OptTypes.FormatPainter) {
      //     if (T3Gv.opt.formatPainterMode === OptConstant.formatPainterModes.OBJECT) {
      //       var activeTableId = T3Gv.opt.Table_GetActiveID();
      //       T3Gv.opt.Table_PasteFormat(activeTableId, T3Gv.opt.formatPainterStyle, false);
      //     }
      //     if (T3Gv.opt.formatPainterSticky !== true) {
      //      UIUtil.SetFormatPainter(true, false);
      //     }
      //   }
      //   break;

      // case OptConstant.ActionTriggerType.TABLE_EDIT:
      //   T3Gv.opt.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.Move);
      //   break;

      // Width adjustment cases
      case OptConstant.ActionTriggerType.CenterLeft:
      case OptConstant.ActionTriggerType.CenterRight:
        this.sizedim.width = this.Frame.width;
        break;

      // Height adjustment cases
      case OptConstant.ActionTriggerType.TopCenter:
      case OptConstant.ActionTriggerType.BottomCenter:
        this.sizedim.height = this.Frame.height;
        break;

      // Default case: update both width and height
      default:
        this.sizedim.width = this.Frame.width;
        this.sizedim.height = this.Frame.height;
    }
  }

  /**
   * Sets up an action click on a shape, preparing necessary data and state for subsequent operations
   * @param event - The click/touch event that triggered this action
   * @param triggerElement - The element that was clicked/touched
   * @param objectId - ID of the object being manipulated (optional)
   * @param actionType - Type of action to perform (optional)
   * @param additionalData - Extra data needed for the action (optional)
   * @returns Boolean indicating if the setup was successful
   */
  LMSetupActionClick(event, triggerElement, objectId, actionType, additionalData) {
    // Record timestamp and adapt UI for this event
    T3Gv.opt.eventTimestamp = Date.now();
    // T3Gv.opt.SetUIAdaptation(event);

    let userData;

    // Convert window coordinates to document coordinates
    const docCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      event.gesture.center.clientX,
      event.gesture.center.clientY
    );

    // Apply any auto-grow drag adjustments
    const adjustedCoords = DrawUtil.DoAutoGrowDrag(docCoordinates);
    const posX = adjustedCoords.x;
    const posY = adjustedCoords.y;

    // Handle case when action type is provided directly
    if (actionType) {
      objectId = objectId;
      let currentActionType = actionType;
      let userData = additionalData;

      // Set cursor based on object rotation and action type
      let rotationAngle = 0;
      let isRotated = false;

      const targetObject = DataUtil.GetObjectPtr(objectId, false);
      if (targetObject) {
        rotationAngle = targetObject.RotationAngle;

        // Normalize rotation angle for cursor determination
        if (rotationAngle > 180) rotationAngle = 360 - rotationAngle;
        if (rotationAngle >= 90) rotationAngle = 180 - rotationAngle;
        isRotated = rotationAngle > 45;
      }

      // Set appropriate cursor based on action type and rotation
      switch (actionType) {
        // case OptConstant.ActionTriggerType.TableRow:
        //   if (isRotated) {
        //     OptCMUtil.SetEditMode(
        //       NvConstant.EditState.DragControl,
        //       CursorConstant.CursorType.COL_RESIZE
        //     );
        //   } else {
        //     OptCMUtil.SetEditMode(
        //       NvConstant.EditState.DragControl,
        //       CursorConstant.CursorType.ROW_RESIZE
        //     );
        //   }
        //   break;

        // case OptConstant.ActionTriggerType.TableCol:
        //   if (isRotated) {
        //     OptCMUtil.SetEditMode(
        //       NvConstant.EditState.DragControl,
        //       CursorConstant.CursorType.ROW_RESIZE
        //     );
        //   } else {
        //     OptCMUtil.SetEditMode(
        //       NvConstant.EditState.DragControl,
        //       CursorConstant.CursorType.COL_RESIZE
        //     );
        //   }
        //   break;
      }
    } else {
      // Handle case when trigger element is provided
      const overlayElement = T3Gv.opt.svgOverlayLayer.FindElementByDOMElement(event.currentTarget);
      if (overlayElement === null) return false;

      // Extract object ID from element ID
      const elementId = overlayElement.GetID();
      objectId = parseInt(
        elementId.substring(OptConstant.Common.Action.length, elementId.length),
        10
      );

      // Get trigger target from event
      const triggerTarget = overlayElement.GetTargetForEvent(event);
      if (triggerTarget == null) return false;

      actionType = triggerTarget.GetID();
      userData = triggerTarget.GetUserData();
      T3Gv.opt.SetControlDragMode(triggerTarget);
    }

    // Store action data in global state
    T3Gv.opt.actionStoredObjectId = objectId;

    // Get a reference to the target object
    const targetObject = DataUtil.GetObjectPtr(objectId, true);

    // Store trigger ID and data
    T3Gv.opt.actionTriggerId = actionType;
    T3Gv.opt.actionTriggerData = userData;

    // Handle special connector actions
    const triggerTypes = OptConstant.ActionTriggerType;
    switch (actionType) {
      case triggerTypes.CONNECTOR_PERP:
      case triggerTypes.CONNECTOR_ADJ:
      case triggerTypes.CONNECTOR_HOOK:
      case triggerTypes.LINESTART:
      case triggerTypes.LINEEND:
        const connectorObject = this.getConnectedObject();
        if (connectorObject) {
          T3Gv.opt.actionStoredObjectId = connectorObject.BlockID;
          this.ConnectorLMActionClick(event, true);
        }
        return false;
    }

    // Special handling for polygon segment movement
    if (actionType === OptConstant.ActionTriggerType.MovePolySeg) {
      T3Gv.opt.actionTriggerData = {
        hitSegment: userData,
        moveAngle: 9999
      };
    }

    // Get SVG object and hide dimension lines
    T3Gv.opt.actionSvgObject = T3Gv.opt.svgObjectLayer.GetElementById(objectId);
    targetObject.SetDimensionLinesVisibility(T3Gv.opt.actionSvgObject, false);

    // Perform pre-tracking setup
    this.LMActionPreTrack(objectId, actionType);

    // Hide icons if object has hyperlinks, notes, or field data
    if (this.HyperlinkText !== '' || this.NoteID !== -1 || this.HasFieldData()) {
      this.HideAllIcons(T3Gv.opt.svgDoc, T3Gv.opt.actionSvgObject);
    }

    // Determine if aspect ratio should be locked
    T3Gv.opt.actionLockAspectRatio = event.gesture.srcEvent.shiftKey;

    // If the shape has fixed aspect ratio, invert the lock behavior
    if (this.ResizeAspectConstrain) {
      T3Gv.opt.actionLockAspectRatio = !T3Gv.opt.actionLockAspectRatio;
    }

    // Store the frame for aspect ratio calculations
    const objectFrame = targetObject.Frame;

    if (T3Gv.opt.actionLockAspectRatio) {
      // Disable aspect ratio lock if height is zero to avoid division by zero
      if (objectFrame.height === 0) {
        T3Gv.opt.actionLockAspectRatio = false;
      } else {
        T3Gv.opt.actionAspectRatioWidth = objectFrame.width;
        T3Gv.opt.actionAspectRatioHeight = objectFrame.height;
      }
    }

    // Store bounding box information for the action
    T3Gv.opt.actionBBox = $.extend(true, {}, objectFrame);
    T3Gv.opt.actionNewBBox = $.extend(true, {}, objectFrame);

    // // Handle tables if present
    // const tableObject = this.GetTable(false);
    // if (tableObject) {
    //   T3Gv.opt.theActionTable = Utils1.DeepCopy(tableObject);
    // }

    // Hide overlay layer during the action
    LayerUtil.HideOverlayLayer();

    // Calculate rotation radians for coordinate transformations
    T3Gv.opt.rotateObjectRadians = -this.RotationAngle / (180 / NvConstant.Geometry.PI);

    // Handle container adjustment
    if (T3Gv.opt.actionTriggerId === OptConstant.ActionTriggerType.ContainerAdj) {
      // Store starting position
      const startPoint = { x: posX, y: posY };
      T3Gv.opt.actionStartX = startPoint.x;
      T3Gv.opt.actionStartY = startPoint.y;

      // Get the list of shapes to adjust
      const shapesList = this.PrGetAdjustShapeList();
      if (!shapesList) return false;

      // Store shape lists and container information
      T3Gv.opt.moveList = shapesList.list;
      T3Gv.opt.dragElementList = shapesList.svglist;
      T3Gv.opt.dragBBoxList = shapesList.framelist;
      T3Gv.opt.actionTableLastY = 0;
      T3Gv.opt.actionOldExtra = shapesList.oldextra;
      T3Gv.opt.theActionContainerArrangement = shapesList.arrangement;
    }
    // Handle rotation
    else if (T3Gv.opt.actionTriggerId === OptConstant.ActionTriggerType.Rotate) {
      // Set up rotation parameters
      T3Gv.opt.rotateKnobCenterDivisor = this.RotateKnobCenterDivisor();
      T3Gv.opt.rotateStartRotation = this.RotationAngle;
      T3Gv.opt.rotateEndRotation = T3Gv.opt.rotateStartRotation;

      // Calculate pivot point for rotation
      T3Gv.opt.rotatePivotX = objectFrame.x + objectFrame.width / T3Gv.opt.rotateKnobCenterDivisor.x;
      T3Gv.opt.rotatePivotY = objectFrame.y + objectFrame.height / T3Gv.opt.rotateKnobCenterDivisor.y;

      // Store starting position
      T3Gv.opt.actionStartX = posX;
      T3Gv.opt.actionStartY = posY;
    }
    // Handle other actions
    else {
      // Apply rotation transformation to coordinates
      const clickPoint = { x: posX, y: posY };
      const centerPoint = {
        x: objectFrame.x + objectFrame.width / 2,
        y: objectFrame.y + objectFrame.height / 2
      };
      const transformedPoint = T3Gv.opt.RotatePointAroundPoint(
        centerPoint,
        clickPoint,
        T3Gv.opt.rotateObjectRadians
      );

      // Store starting and last positions
      T3Gv.opt.actionStartX = transformedPoint.x;
      T3Gv.opt.actionStartY = transformedPoint.y;
      T3Gv.opt.actionTableLastX = transformedPoint.x;
      T3Gv.opt.actionTableLastY = transformedPoint.y;
    }

    return true;
  }

  /**
   * Helper method to get the connected object (if this shape is part of a connector)
   * @returns The connected object or null if none exists
   * @private
   */
  getConnectedObject() {
    if (this.hooks.length) {
      const connectedObjectId = this.hooks[0].objid;
      return DataUtil.GetObjectPtr(connectedObjectId, false);
    }
    return null;
  }

  ConnectorLMActionClick(event: any, triggerElement: any) {
    T3Util.Log("= S.BaseShape - ConnectorLMActionClick input:", { event, triggerElement });
    // Call the base line action click handler using the provided event parameters
    this.BaseLineLMActionClick(event, triggerElement);
    T3Util.Log("= S.BaseShape - ConnectorLMActionClick output");
  }

  BaseLineLMActionClick(event, triggerElement) {
    T3Util.Log("= S.BaseShape - BaseLineLMActionClick input:", { event, triggerElement });
    try {
      const blockID = this.BlockID;
      const baseObject = DataUtil.GetObjectPtr(blockID, false);

      // Validate that the base object is a valid drawing object
      if (!(baseObject && baseObject instanceof BaseDrawObject)) {
        T3Util.Log("= S.BaseShape - BaseLineLMActionClick output: base object not valid");
        return false;
      }

      // Initialize auto grow drag for this block
      DrawUtil.InitializeAutoGrowDrag(0, this.BlockID);

      // Setup action click, if this fails, abort the process
      if (!this.LMSetupActionClick(event, triggerElement)) {
        T3Util.Log("= S.BaseShape - BaseLineLMActionClick output: LMSetupActionClick failed");
        return;
      }

      // Collab.BeginSecondaryEdit();
      const currentObject = DataUtil.GetObjectPtr(this.BlockID, false);

      T3Gv.opt.WorkAreaHammer.on(
        "drag",
        EvtUtil.Evt_ActionTrackHandlerFactory(currentObject)
      );

      T3Gv.opt.WorkAreaHammer.on(
        "dragend",
        EvtUtil.Evt_ActionReleaseHandlerFactory(currentObject)
      );

      T3Util.Log("= S.BaseShape - BaseLineLMActionClick output: completed successfully");
    } catch (error) {
      this.LMActionClickExpCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }
  }

  LMActionClickExpCleanup(error: any): void {
    T3Util.Log("= S.BaseShape - LMActionClickExpCleanup input:", error);

    LMEvtUtil.UnbindActionClickHammerEvents();
    this.ResetAutoScrollTimer();
    T3Gv.opt.ob = {};
    T3Gv.opt.linkParams = null;
    T3Gv.opt.actionTriggerId = -1;
    T3Gv.opt.actionTriggerData = null;
    T3Gv.opt.actionStoredObjectId = -1;
    T3Gv.opt.actionSvgObject = null;
    LayerUtil.HideOverlayLayer();

    T3Util.Log("= S.BaseShape - LMActionClickExpCleanup output: cleanup complete");
  }

  LMActionClick(event, triggerElement, additionalId, autoGrowParam, extraParam) {
    T3Util.Log("= S.BaseShape - LMActionClick input:", { event, triggerElement, additionalId, autoGrowParam, extraParam });
    Utils2.StopPropagationAndDefaults(event);
    try {
      const blockId = this.BlockID;
      const drawingObject = DataUtil.GetObjectPtr(blockId, false);
      if (!(drawingObject && drawingObject instanceof BaseDrawObject)) {
        T3Util.Log("= S.BaseShape - LMActionClick output: Invalid drawing object");
        return false;
      }
      DrawUtil.InitializeAutoGrowDrag(autoGrowParam);
      if (!this.LMSetupActionClick(event, triggerElement, additionalId, autoGrowParam, extraParam)) {
        T3Util.Log("= S.BaseShape - LMActionClick output: LMSetupActionClick failed");
        return;
      }
      // Collab.BeginSecondaryEdit();
      const currentObject = DataUtil.GetObjectPtr(this.BlockID, false);
      T3Gv.opt.WorkAreaHammer.on('drag', EvtUtil.Evt_ActionTrackHandlerFactory(currentObject));
      T3Gv.opt.WorkAreaHammer.on('dragend', EvtUtil.Evt_ActionReleaseHandlerFactory(currentObject));
      T3Util.Log("= S.BaseShape - LMActionClick output: completed successfully");
    } catch (error) {
      this.LMActionClickExpCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }
  }

  StartNewObjectDrawTrackCommon(currentX: number, currentY: number, event: any) {
    T3Util.Log("= S.BaseShape - StartNewObjectDrawTrackCommon input:", { currentX, currentY, event });

    // Calculate differences from the starting action point
    let deltaX = currentX - T3Gv.opt.actionStartX;
    let deltaY = currentY - T3Gv.opt.actionStartY;

    // Calculate new bounding box by copying the current action bounding box
    let newBBox = $.extend(true, {}, T3Gv.opt.actionBBox);
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
    let overrideSnap = T3Gv.opt.OverrideSnaps(event);
    if (T3Gv.docUtil.docConfig.enableSnap && !overrideSnap) {
      snapPoint = T3Gv.docUtil.SnapToGrid(snapPoint);
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
    T3Gv.opt.actionNewBBox = $.extend(true, {}, newBBox);

    // Update the shape's frame using the new bounding box and resize the SVG object
    this.UpdateFrame(T3Gv.opt.actionNewBBox);
    this.Resize(T3Gv.opt.actionSvgObject, newBBox, this);

    T3Util.Log("= S.BaseShape - StartNewObjectDrawTrackCommon output:", T3Gv.opt.actionNewBBox);
  }

  StartNewObjectDrawDoAutoScroll() {
    T3Util.Log("= S.BaseShape - StartNewObjectDrawDoAutoScroll input");

    T3Gv.opt.autoScrollTimerId = T3Gv.opt.autoScrollTimer.setTimeout(
      'StartNewObjectDrawDoAutoScroll', 100
    );

    let docCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      T3Gv.opt.autoScrollXPos,
      T3Gv.opt.autoScrollYPos
    );

    docCoordinates = DrawUtil.DoAutoGrowDrag(docCoordinates);

    T3Gv.docUtil.ScrollToPosition(docCoordinates.x, docCoordinates.y);

    this.StartNewObjectDrawTrackCommon(docCoordinates.x, docCoordinates.y, null);

    T3Util.Log("= S.BaseShape - StartNewObjectDrawDoAutoScroll output:", docCoordinates);
  }

  LMDrawTrack(mouseEvent) {
    T3Util.Log("= S.BaseShape - LMDrawTrack input:", mouseEvent);

    // If no action stored object exists, exit early
    if (T3Gv.opt.actionStoredObjectId === -1) {
      T3Util.Log("= S.BaseShape - LMDrawTrack output: No action stored object, returning false");
      return false;
    }

    // Convert window coordinates to document coordinates using the event
    let docCoords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      mouseEvent.gesture.center.clientX,
      mouseEvent.gesture.center.clientY
    );

    // Check if snapping is overridden
    let overrideSnap = T3Gv.opt.OverrideSnaps(mouseEvent);

    // Snap to grid if enabled and not overridden
    if (T3Gv.docUtil.docConfig.enableSnap && !overrideSnap) {
      docCoords = T3Gv.docUtil.SnapToGrid(docCoords);
    }

    // Apply auto grow drag adjustments and extract x and y positions
    docCoords = DrawUtil.DoAutoGrowDrag(docCoords);
    let posX = docCoords.x;
    let posY = docCoords.y;

    // If auto scroll is triggered, perform drawing tracking updates
    if (this.AutoScrollCommon(mouseEvent, true, 'StartNewObjectDrawDoAutoScroll')) {
      this.LMDrawDuringTrack(posX, posY);
      this.StartNewObjectDrawTrackCommon(posX, posY, mouseEvent);
    }

    T3Util.Log("= S.BaseShape - LMDrawTrack output:", { posX, posY });
  }

  LMDrawRelease(eventObject: any) {
    T3Util.Log("= S.BaseShape - LMDrawRelease input:", eventObject);

    // Unbind any active click/drag events and reset auto-scroll timer
    LMEvtUtil.UnbindActionClickHammerEvents();
    this.ResetAutoScrollTimer();

    // Create a new bounding box object using the current new bounding box from the manager
    const newBoundingBox = {
      x: T3Gv.opt.actionNewBBox.x,
      y: T3Gv.opt.actionNewBBox.y,
      width: T3Gv.opt.actionNewBBox.width,
      height: T3Gv.opt.actionNewBBox.height,
    };

    // Update the object frame with the new bounding box
    T3Gv.opt.SetObjectFrame(T3Gv.opt.actionStoredObjectId, newBoundingBox);

    // Call post-release logic for drawing
    this.LMDrawPostRelease(T3Gv.opt.actionStoredObjectId);

    // Build collaboration message and post object draw event
    const collaborationData = {};
    DrawUtil.PostObjectDraw();

    T3Util.Log("= S.BaseShape - LMDrawRelease output:", { newBoundingBox, collaborationData });
  }

  LMDrawPreTrack(): boolean {
    T3Util.Log("= S.BaseShape - LMDrawPreTrack - Input:");
    const result = true;
    T3Util.Log("= S.BaseShape - LMDrawPreTrack - Output:", result);
    return result;
  }

  LMDrawDuringTrack(posX: number, posY: number) {
    T3Util.Log("= S.BaseShape - LMDrawDuringTrack input:", { posX, posY });
    const resultCoordinates = { x: posX, y: posY };
    T3Util.Log("= S.BaseShape - LMDrawDuringTrack output:", resultCoordinates);
    return resultCoordinates;
  }

  LMDrawPostRelease() {
  }

  LMDrawClickExceptionCleanup(exception: any) {
    T3Util.Log("= S.BaseShape - LMDrawClickExceptionCleanup input:", exception);
    LMEvtUtil.UnbindActionClickHammerEvents();
    this.ResetAutoScrollTimer();
    T3Gv.opt.linkParams = null;
    T3Gv.opt.actionStoredObjectId = -1;
    T3Gv.opt.actionSvgObject = null;
    T3Gv.opt.WorkAreaHammer.on('dragstart', EvtUtil.Evt_WorkAreaHammerDragStart);
    T3Util.Log("= S.BaseShape - LMDrawClickExceptionCleanup output: cleanup complete");
  }

  LMDrawClick(initialX: number, initialY: number) {
    T3Util.Log("= S.BaseShape - LMDrawClick input:", { initialX, initialY });

    try {
      // Set the starting coordinates for the drawing object
      this.Frame.x = initialX;
      this.Frame.y = initialY;
      // Save a deep copy of the current frame as previous bounding box
      this.prevBBox = $.extend(true, {}, this.Frame);

      // Attach draggable event handlers for drawing tracking and release
      T3Gv.opt.WorkAreaHammer.on('drag', EvtUtil.Evt_DrawTrackHandlerFactory(this));
      T3Gv.opt.WorkAreaHammer.on('dragend', EvtUtil.Evt_DrawReleaseHandlerFactory(this));

      T3Util.Log("= S.BaseShape - LMDrawClick output:", { Frame: this.Frame, prevBBox: this.prevBBox });
    } catch (error) {
      this.LMDrawClickExceptionCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }
  }

  RotateKnobCenterDivisor(): { x: number; y: number } {
    T3Util.Log("= S.BaseShape - RotateKnobCenterDivisor input: no parameters");

    const knobCenterDivisor = {
      x: 2,
      y: 2,
    };

    T3Util.Log("= S.BaseShape - RotateKnobCenterDivisor output:", knobCenterDivisor);
    return knobCenterDivisor;
  }

  OffsetShape(offsetX: number, offsetY: number, childShapes?: any[], linkFlags?: any) {
    T3Util.Log("= S.BaseShape - OffsetShape input:", { offsetX, offsetY, childShapes, linkFlags });

    if (this.moreflags & OptConstant.ObjMoreFlags.Container && childShapes) {
      for (let i = 0; i < childShapes.length; i++) {
        const childShapeId = childShapes[i];
        const childShape = DataUtil.GetObjectPtr(childShapeId, true);
        if (childShape) {
          const childLinkFlag = linkFlags ? linkFlags[childShape.BlockID] : null;
          childShape.OffsetShape(offsetX, offsetY, childLinkFlag);
          OptCMUtil.SetLinkFlag(childShapeId, DSConstant.LinkFlags.Move);
          DataUtil.AddToDirtyList(childShapeId);
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
      T3Gv.opt.GraphShift(this, offsetX, offsetY);
    }

    T3Util.Log("= S.BaseShape - OffsetShape output:", { Frame: this.Frame, r: this.r, inside: this.inside, trect: this.trect });
  }

  SetShapeOrigin(newX: number, newY: number, childShapes: any[]) {
    T3Util.Log("= S.BaseShape - SetShapeOrigin input:", { newX, newY, childShapes });

    let offsetX = 0;
    let offsetY = 0;

    if (newX != null) {
      offsetX = newX - this.Frame.x;
    }

    if (newY != null) {
      offsetY = newY - this.Frame.y;
    }

    this.OffsetShape(offsetX, offsetY, childShapes);

    T3Util.Log("= S.BaseShape - SetShapeOrigin output:", { offsetX, offsetY });
  }

  SetShapeIndent(applyIndents: boolean) {
    T3Util.Log("= S.BaseShape - SetShapeIndent input:", { applyIndents });

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

    T3Util.Log("= S.BaseShape - SetShapeIndent output:", this.tindent);
  }

  UpdateFrame(newFrame) {
    T3Util.Log("= S.BaseShape - UpdateFrame input:", newFrame);

    let lineThickness = 0;
    let halfLineThickness = 0;

    if (newFrame) {
      super.UpdateFrame(newFrame);
    }

    Utils2.CopyRect(this.r, this.Frame);

    if (this.StyleRecord) {
      if (this.objecttype !== NvConstant.FNObjectTypes.FlWall) {
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

    T3Gv.opt.SetShapeR(this);

    Utils2.CopyRect(this.inside, this.Frame);
    Utils2.InflateRect(this.inside, -lineThickness, -lineThickness);

    Utils2.CopyRect(this.trect, this.Frame);
    Utils2.InflateRect(this.trect, -halfLineThickness, -halfLineThickness);

    this.SetShapeIndent(false);

    Utils2.SubRect(this.trect, this.tindent);

    // if (this.GetTable(false) == null) {
    //   Utils2.SubRect(this.trect, this.TMargins);
    // }

    T3Util.Log("= S.BaseShape - UpdateFrame output:", {
      r: this.r,
      inside: this.inside,
      trect: this.trect,
      Frame: this.Frame
    });
  }

  GetSVGFrame(frame = this.Frame) {
    T3Util.Log("= S.BaseShape - GetSVGFrame input:", frame);

    const svgFrame = {};
    Utils2.CopyRect(svgFrame, frame);

    if (this.StyleRecord.Line.BThick && this.polylist == null) {
      Utils2.InflateRect(svgFrame, this.StyleRecord.Line.BThick, this.StyleRecord.Line.BThick);
    }

    T3Util.Log("= S.BaseShape - GetSVGFrame output:", svgFrame);
    return svgFrame;
  }

  GetSnapRect() {
    T3Util.Log("= S.BaseShape - GetSnapRect input");

    const snapRect = {};

    if (this.RotationAngle !== 0) {
      const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, true, null);
      const rotationRadians = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, polyPoints);
      Utils2.GetPolyRect(snapRect, polyPoints);
    } else {
      Utils2.CopyRect(snapRect, this.Frame);
    }

    T3Util.Log("= S.BaseShape - GetSnapRect output:", snapRect);
    return snapRect;
  }

  CanSnapToShapes() {
    T3Util.Log("= S.BaseShape - CanSnapToShapes input");

    const objectTypes = NvConstant.FNObjectTypes;
    let result;

    switch (this.objecttype) {
      // case objectTypes.SwimLaneRows:
      // case objectTypes.SD_OBJT_SWIMLANE_COLS:
      // case objectTypes.SD_OBJT_SWIMLANE_GRID:
      // case objectTypes.SD_OBJT_BPMN_POOL:
      case objectTypes.ShapeContainer:
        // case objectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER:
        result = -1;
        break;
      default:
        result = this.BlockID;
    }

    T3Util.Log("= S.BaseShape - CanSnapToShapes output:", result);
    return result;
  }

  IsSnapTarget() {
    T3Util.Log("= S.BaseShape - IsSnapTarget input");

    const objectTypes = NvConstant.FNObjectTypes;
    let result;

    switch (this.objecttype) {
      // case objectTypes.SwimLaneRows:
      // case objectTypes.SD_OBJT_SWIMLANE_COLS:
      // case objectTypes.SD_OBJT_SWIMLANE_GRID:
      // case objectTypes.SD_OBJT_BPMN_POOL:
      case objectTypes.ShapeContainer:
        // case objectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER:
        result = false;
        break;
      default:
        result = !this.hooks.length && !(T3Gv.opt.FindChildArray(this.BlockID, -1) >= 0);
    }

    T3Util.Log("= S.BaseShape - IsSnapTarget output:", result);
    return result;
  }

  GetAlignRect() {
    T3Util.Log("= S.BaseShape - GetAlignRect input");

    const alignRect = $.extend(true, {}, this.Frame);

    if (this.RotationAngle !== 0) {
      const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, true, null);
      const rotationRadians = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, polyPoints);
      Utils2.GetPolyRect(alignRect, polyPoints);
    }

    T3Util.Log("= S.BaseShape - GetAlignRect output:", alignRect);
    return alignRect;
  }

  GetCustomConnectPointsDirection(direction: number) {
    T3Util.Log("= S.BaseShape - GetCustomConnectPointsDirection input:", { direction });

    let closestIndex = -1;
    let closestDistance: number | null = null;
    let currentDistance: number;
    let connectPoints = this.flags & NvConstant.ObjFlags.UseConnect && this.ConnectPoints;
    let targetPoints = this.GetTargetPoints(
      null,
      NvConstant.HookFlags.LcNoSnaps | NvConstant.HookFlags.LcForceEnd,
      null
    );
    let topCount = 1, bottomCount = 1, leftCount = 1, rightCount = 1;
    const dimension = OptConstant.Common.DimMax;
    let isSinglePoint = false;
    const ActionArrow = OptConstant.ActionArrow;
    let boundingRect = { x: 0, y: 0, width: dimension, height: dimension };

    if (this.RotationAngle) {
      const rotationRadians = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
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
            if (direction === ActionArrow.Up) updateClosestIndex(targetPoints[i].x, i);
          } else if (targetPoints[i].y >= 5 * boundingRect.height / 6) {
            bottomCount++;
            if (direction === ActionArrow.Down) updateClosestIndex(targetPoints[i].x, i);
          } else if (targetPoints[i].x < boundingRect.width / 6) {
            leftCount++;
            if (direction === ActionArrow.Left) updateClosestIndex(targetPoints[i].y, i);
          } else if (targetPoints[i].x >= 5 * boundingRect.width / 6) {
            rightCount++;
            if (direction === ActionArrow.Right) updateClosestIndex(targetPoints[i].y, i);
          }
        }
      } else {
        for (let i = 0; i < pointCount; i++) {
          if (targetPoints[i].x < boundingRect.width / 6) {
            leftCount++;
            if (direction === ActionArrow.Left) updateClosestIndex(targetPoints[i].y, i);
          } else if (targetPoints[i].x >= 5 * boundingRect.width / 6) {
            rightCount++;
            if (direction === ActionArrow.Right) updateClosestIndex(targetPoints[i].y, i);
          } else if (targetPoints[i].y < boundingRect.height / 6) {
            topCount++;
            if (direction === ActionArrow.Up) updateClosestIndex(targetPoints[i].x, i);
          } else if (targetPoints[i].y >= 5 * boundingRect.height / 6) {
            bottomCount++;
            if (direction === ActionArrow.Down) updateClosestIndex(targetPoints[i].x, i);
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

    T3Util.Log("= S.BaseShape - GetCustomConnectPointsDirection output:", result);
    return result;
  }

  AdjustAutoInsertShape(event, isVertical, isRotated) {
    T3Util.Log("= S.BaseShape - AdjustAutoInsertShape input:", { event, isVertical, isRotated });

    let connectPoints = this.flags & NvConstant.ObjFlags.UseConnect && this.ConnectPoints;
    let topCount = 0, bottomCount = 0, leftCount = 0, rightCount = 0;
    let singlePoint = false;
    let targetPoints = this.GetTargetPoints(null, NvConstant.HookFlags.LcNoSnaps | NvConstant.HookFlags.LcForceEnd, null);
    let isSinglePoint = targetPoints.length < 2;
    let shouldRotate = false;
    let blockIDs = [this.BlockID];

    if (isSinglePoint) {
      T3Gv.opt.linkParams && (T3Gv.opt.linkParams.AutoSinglePoint = true);
      singlePoint = true;
    } else {
      T3Gv.opt.linkParams && (T3Gv.opt.linkParams.AutoSinglePoint = false);
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
                ToolActUtil.RotateShapes(0, blockIDs);
                let svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
                svgElement && this.Rotate(svgElement, 0);
              }
              shouldRotate = true;
            }
          } else if (this.RotationAngle !== -90 && this.RotationAngle !== 90) {
            if (!isRotated) {
              ToolActUtil.RotateShapes(-90, blockIDs);
              let svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
              svgElement && this.Rotate(svgElement, -90);
            }
            shouldRotate = true;
          }
        } else if (isVertical) {
          if (this.RotationAngle !== -90 && this.RotationAngle !== 90) {
            if (!isRotated) {
              ToolActUtil.RotateShapes(-90, blockIDs);
              let svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
              svgElement && this.Rotate(svgElement, -90);
            }
            shouldRotate = true;
          }
        } else if (this.RotationAngle !== 0 && this.RotationAngle !== 180) {
          if (!isRotated) {
            ToolActUtil.RotateShapes(0, blockIDs);
            let svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
            svgElement && this.Rotate(svgElement, 0);
          }
          shouldRotate = true;
        }
      }
    }

    T3Util.Log("= S.BaseShape - AdjustAutoInsertShape output:", shouldRotate);
    return shouldRotate;
  }

  TRectToFrame(rect: any, maintainSize: boolean) {
    T3Util.Log("= S.BaseShape - TRectToFrame input:", { rect, maintainSize });

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

    // if (this.GetTable(false) == null) {
    //   Utils2.Add2Rect(this.inside, this.TMargins);
    // }

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
      T3Gv.opt.SetShapeR(this);
    }

    T3Util.Log("= S.BaseShape - TRectToFrame output:", { Frame: this.Frame, r: this.r, inside: this.inside });
  }

  SetSize(newWidth: number, newHeight: number, actionType: number) {
    T3Util.Log("= S.BaseShape - SetSize input:", { newWidth, newHeight, actionType });

    let originalFrame = {
      x: this.Frame.x,
      y: this.Frame.y,
      width: this.Frame.width,
      height: this.Frame.height
    };

    let sizeChanged = false;

    if (newWidth) {
      originalFrame.width = newWidth;
    }
    if (newHeight) {
      originalFrame.height = newHeight;
    }

    if (newWidth || newHeight) {
      const prevActionBBox = T3Gv.opt.actionBBox;
      const newActionBBox = T3Gv.opt.actionNewBBox;

      T3Gv.opt.actionBBox = Utils1.DeepCopy(this.Frame);
      T3Gv.opt.actionNewBBox = Utils1.DeepCopy(this.Frame);

      this.HandleActionTriggerCallResize(originalFrame, actionType, null);

      T3Gv.opt.actionBBox = prevActionBBox;
      T3Gv.opt.actionNewBBox = newActionBBox;

      if (/*actionType !== OptConstant.ActionTriggerType.TABLE_EDIT &&*/ actionType !== OptConstant.ActionTriggerType.LineThickness) {
        if (newWidth) {
          this.sizedim.width = this.Frame.width;
          sizeChanged = true;
        }
        if (newHeight) {
          this.sizedim.height = this.Frame.height;
          sizeChanged = true;
        }
      }

      OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.Move);

      for (let i = 0; i < this.hooks.length; i++) {
        OptCMUtil.SetLinkFlag(this.hooks[i].objid, DSConstant.LinkFlags.Move);
      }

      if (this instanceof Instance.Shape.Polygon) {
        const newVertexArray = this.RegenerateVectors(originalFrame.width, originalFrame.height);
        if (newVertexArray) {
          this.VertexArray = newVertexArray;
        }
        if (this.polylist && this.ShapeType === OptConstant.ShapeType.Polygon) {
          this.ScaleObject(0, 0, 0, 0, 0, 0);
        }
      }

      DataUtil.AddToDirtyList(this.BlockID);
      // T3Gv.opt.theActionTable = null;

      if (this.rflags) {
        if (newWidth) {
          this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
        }
        if (newHeight) {
          this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
        }
      }
    }

    T3Util.Log("= S.BaseShape - SetSize output:", { Frame: this.Frame, sizedim: this.sizedim, rflags: this.rflags });
  }

  UpdateDimensions(newWidth: number, newHeight: number, maintainAspectRatio: boolean) {
    T3Util.Log("= S.BaseShape - UpdateDimensions input:", { newWidth, newHeight, maintainAspectRatio });

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

    T3Util.Log("= S.BaseShape - UpdateDimensions output:", updatedFrame);
  }

  GetHookFlags() {
    T3Util.Log("= S.BaseShape - GetHookFlags input");

    const hookFlags = NvConstant.HookFlags.LcShape |
      NvConstant.HookFlags.LcArrayMod |
      NvConstant.HookFlags.LcAttachToLine;

    T3Util.Log("= S.BaseShape - GetHookFlags output:", hookFlags);
    return hookFlags;
  }

  AllowLink() {
    T3Util.Log("= S.BaseShape - AllowLink input");

    let sessionObject = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    let dropOnTableFlag = this.flags & NvConstant.ObjFlags.DropOnTable;
    let result;

    if (sessionObject) {
      result = (sessionObject.flags & OptConstant.SessionFlags.SLink) ||
        (sessionObject.flags & OptConstant.SessionFlags.AttLink) ||
        dropOnTableFlag;
    }

    T3Util.Log("= S.BaseShape - AllowLink output:", result);
    return result;
  }

  // IsSwimlane() {
  //   T3Util.Log("= S.BaseShape - IsSwimlane input");

  //   const objectTypes = NvConstant.FNObjectTypes;
  //   let result;

  //   switch (this.objecttype) {
  //     // case objectTypes.SD_OBJT_SWIMLANE_COLS:
  //     // case objectTypes.SwimLaneRows:
  //     // case objectTypes.SD_OBJT_SWIMLANE_GRID:
  //     case objectTypes.FrameContainer:
  //       result = true;
  //       break;
  //     default:
  //       result = false;
  //   }

  //   T3Util.Log("= S.BaseShape - IsSwimlane output:", result);
  //   return result;
  // }

  // IsOKFlowChartShape(objectID: number): number {
  //   T3Util.Log("= S.BaseShape - IsOKFlowChartShape input:", { objectID });

  //   const object = DataUtil.GetObjectPtr(objectID, false);
  //   let result: number;

  //   if (object && (object.flags & NvConstant.ObjFlags.TextOnly || object.IsSwimlane())) {
  //     result = 0;
  //   } else {
  //     result = objectID;
  //   }

  //   T3Util.Log("= S.BaseShape - IsOKFlowChartShape output:", { result });
  //   return result;
  // }

  // PreventLink() {
  //   T3Util.Log("= S.BaseShape - PreventLink input");

  //   const result = !!this.IsSwimlane();

  //   T3Util.Log("= S.BaseShape - PreventLink output:", result);
  //   return result;
  // }

  GetHookPoints() {
    T3Util.Log("= S.BaseShape - GetHookPoints input");

    let connectPoints = this.flags & NvConstant.ObjFlags.UseConnect && this.ConnectPoints;
    // let table = this.GetTable(false);
    // let isTableRows = this.hookflags & NvConstant.HookFlags.LcTableRows && table;

    if (connectPoints /*|| isTableRows*/) {
      let points = connectPoints ? this.ConnectPoints : this.ConnectPoints;//T3Gv.opt.Table_GetRowConnectPoints(this, table);
      let hookPoints = [];

      for (let i = 0; i < points.length; i++) {
        hookPoints.push({
          x: points[i].x,
          y: points[i].y,
          id: OptConstant.HookPts.CustomBase + i
        });
      }

      T3Util.Log("= S.BaseShape - GetHookPoints output:", hookPoints);
      return hookPoints;
    }

    let defaultHookPoints = [
      { x: OptConstant.Common.DimMax / 2, y: 0, id: OptConstant.HookPts.KTC },
      { x: OptConstant.Common.DimMax, y: OptConstant.Common.DimMax / 2, id: OptConstant.HookPts.KRC },
      { x: OptConstant.Common.DimMax / 2, y: OptConstant.Common.DimMax, id: OptConstant.HookPts.KBC },
      { x: 0, y: OptConstant.Common.DimMax / 2, id: OptConstant.HookPts.KLC }
    ];

    T3Util.Log("= S.BaseShape - GetHookPoints output:", defaultHookPoints);
    return defaultHookPoints;
  }

  SetHookAlign(hookPoint, alignType) {
    T3Util.Log("= S.BaseShape - SetHookAlign input:", { hookPoint, alignType });

    let childArrayIndex, childObject, isFlowConnection;

    switch (hookPoint) {
      case OptConstant.HookPts.AKCL:
        childArrayIndex = T3Gv.opt.FindChildArray(this.BlockID, -1);
        if (childArrayIndex >= 0) {
          childObject = DataUtil.GetObjectPtr(childArrayIndex, false);
          if (childObject) {
            isFlowConnection = childObject.arraylist.styleflags & OptConstant.AStyles.FlowConn &&
              !(childObject.arraylist.styleflags & OptConstant.AStyles.Linear);
            if (childObject.hooks.length && childObject.hooks[0].connect.x === 0 && !isFlowConnection) {
              childObject.SetDirection(true, false, false);
            }
          }
        }
        break;

      case OptConstant.HookPts.AKCR:
        childArrayIndex = T3Gv.opt.FindChildArray(this.BlockID, -1);
        if (childArrayIndex >= 0) {
          childObject = DataUtil.GetObjectPtr(childArrayIndex, false);
          if (childObject) {
            isFlowConnection = childObject.arraylist.styleflags & OptConstant.AStyles.FlowConn &&
              !(childObject.arraylist.styleflags & OptConstant.AStyles.Linear);
            if (childObject.hooks.length && childObject.hooks[0].connect.x === OptConstant.Common.DimMax && !isFlowConnection) {
              childObject.SetDirection(true, false, false);
            }
          }
        }
        break;
    }

    T3Util.Log("= S.BaseShape - SetHookAlign output");
  }

  HookToPoint(hookId: number, hookFlags: any) {
    T3Util.Log("= S.BaseShape - HookToPoint input:", { hookId, hookFlags });

    let hookPoints = [];
    let point = [{ x: 0, y: 0 }];
    let perimeterPoints = {};
    let hookIndex = -1;
    let isCustomHook = false;
    let connectionFlags = 0;
    const HookPts = OptConstant.HookPts;
    const SED_CDim = OptConstant.Common.DimMax;
    const HookFlags = NvConstant.HookFlags;

    if (this.flags & NvConstant.ObjFlags.Obj1 && this.PrFormat && this.PrFormat(this.BlockID)) {
      // Custom formatting logic
    }

    if (hookId === HookPts.KAT) {
      point[0].x = this.attachpoint.x;
      point[0].y = this.attachpoint.y;
      if (this.extraflags & OptConstant.ExtraFlags.FlipHoriz) {
        point[0].x = SED_CDim - point[0].x;
      }
      if (this.extraflags & OptConstant.ExtraFlags.FlipVert) {
        point[0].y = SED_CDim - point[0].y;
      }
    } else if (hookId === HookPts.KATD) {
      point[0].x = this.attachpoint.x;
      point[0].y = this.attachpoint.y;
    } else {
      switch (hookId) {
        case HookPts.KCTL:
          point[0].x = 0;
          point[0].y = 0;
          break;
        case HookPts.KCTR:
          point[0].x = SED_CDim;
          point[0].y = 0;
          break;
        case HookPts.KCBL:
          point[0].x = 0;
          point[0].y = SED_CDim;
          break;
        case HookPts.KCBR:
          point[0].x = SED_CDim;
          point[0].y = SED_CDim;
          break;
        case HookPts.KCT:
          point[0].x = SED_CDim / 2;
          point[0].y = 0;
          connectionFlags = HookFlags.LcVOnly;
          break;
        case HookPts.KCB:
          point[0].x = SED_CDim / 2;
          point[0].y = SED_CDim;
          connectionFlags = HookFlags.LcVOnly;
          break;
        case HookPts.KCL:
          point[0].x = 0;
          point[0].y = SED_CDim / 2;
          connectionFlags = HookFlags.LcHOnly;
          break;
        case HookPts.KCC:
          point[0].x = SED_CDim / 2;
          point[0].y = SED_CDim / 2;
          break;
        case HookPts.KCR:
          point[0].x = SED_CDim;
          point[0].y = SED_CDim / 2;
          connectionFlags = HookFlags.LcHOnly;
          break;
        default:
          hookPoints = this.GetHookPoints();
          if (!hookPoints) return null;
          for (let i = 0; i < hookPoints.length; i++) {
            if (hookId === hookPoints[i].id) {
              hookIndex = i;
              point[0].x = hookPoints[i].x;
              point[0].y = hookPoints[i].y;
              break;
            }
          }
          if (hookIndex < 0) {
            switch (hookId) {
              case 1:
                hookIndex = 1;
                point[0].x = SED_CDim / 2;
                point[0].y = 0;
                break;
              case 2:
                hookIndex = 1;
                point[0].x = SED_CDim;
                point[0].y = SED_CDim / 2;
                break;
              case 3:
                hookIndex = 1;
                point[0].x = SED_CDim / 2;
                point[0].y = SED_CDim;
                break;
              case 4:
                hookIndex = 1;
                point[0].x = 0;
                point[0].y = SED_CDim / 2;
                break;
            }
          }
          if (hookIndex < 0) return null;
      }
    }

    if (
      (this.RotationAngle || this.extraflags & (OptConstant.ExtraFlags.FlipHoriz | OptConstant.ExtraFlags.FlipVert)) &&
      isCustomHook
    ) {
      perimeterPoints = this.GetPerimPts(-1, point, hookId, true, null, -1);
      point = this.PolyGetTargets(perimeterPoints[0], connectionFlags, this.Frame);
      if (!point) return perimeterPoints[0];
    }

    perimeterPoints = this.GetPerimPts(-1, point, hookId, false, null, -1);

    if (hookId === HookPts.KATD) {
      {
        perimeterPoints[0].x -= this.hookdisp.x;
        perimeterPoints[0].y -= this.hookdisp.y;
      }
    }

    T3Util.Log("= S.BaseShape - HookToPoint output:", perimeterPoints[0]);
    return perimeterPoints[0];
  }

  IsCoManager(e: any): boolean {
    T3Util.Log("= S.BaseShape - IsCoManager input:", e);

    let isCoManager = false;
    if (this.hooks && this.hooks.length) {
      const hookedObject = DataUtil.GetObjectPtr(this.hooks[0].objid, false);
      if (hookedObject && hookedObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
        isCoManager = hookedObject.IsCoManager(e);
      }
    }

    T3Util.Log("= S.BaseShape - IsCoManager output:", isCoManager);
    return isCoManager;
  }

  RRectGetCornerSize(customSize) {
    T3Util.Log("= S.BaseShape - RRectGetCornerSize input:", { customSize });

    let width = this.Frame.width;
    let height = this.Frame.height;
    let minDimension = width;

    if (height < minDimension) {
      minDimension = height;
    }

    if (customSize) {
      minDimension = customSize;
    }

    if (this.moreflags & OptConstant.ObjMoreFlags.FixedRR) {
      let fixedSize = OptConstant.Common.RRectFixedDim * this.shapeparam;
      let maxSize = 0.4 * minDimension;

      if (fixedSize > maxSize) {
        fixedSize = maxSize;
      }

      T3Util.Log("= S.BaseShape - RRectGetCornerSize output:", fixedSize);
      return fixedSize;
    }

    let result = minDimension * this.shapeparam;
    T3Util.Log("= S.BaseShape - RRectGetCornerSize output:", result);
    return result;
  }

  GetPerimPts(points, targetPoints, hookId, rotate, table, needRotate) {
    T3Util.Log("= S.BaseShape - GetPerimPts input:", { points, targetPoints, hookId, rotate, table, needRotate });

    let cornerSize = 0;
    let perimeterPoints = [];
    let coManagerPoint = {};
    let isCoManager = false;
    let tablePoints = null;

    if (this.ShapeType === OptConstant.ShapeType.Rect) {
      cornerSize = this.RRectGetCornerSize();
      if (cornerSize > 0) {
        return this.RRectGetPerimPts(points, targetPoints, hookId, rotate, table, needRotate);
      }
    }

    if (targetPoints.length === 1 && targetPoints[0].y === -OptConstant.AStyles.CoManager && this.IsCoManager(coManagerPoint)) {
      perimeterPoints.push(new Point(coManagerPoint.x, coManagerPoint.y));
      if (targetPoints[0].id != null) {
        perimeterPoints[0].id = targetPoints[0].id;
      }
      T3Util.Log("= S.BaseShape - GetPerimPts output:", perimeterPoints);
      return perimeterPoints;
    }

    // const tableObject = this.GetTable(false);
    // if (table != null && tableObject) {
    //   tablePoints = T3Gv.opt.Table_GetPerimPts(this, tableObject, table, targetPoints);
    //   if (tablePoints) {
    //     perimeterPoints = tablePoints;
    //     isCoManager = true;
    //   }
    // }

    if (!isCoManager) {
      for (let i = 0; i < targetPoints.length; i++) {
        perimeterPoints[i] = {
          x: targetPoints[i].x / OptConstant.Common.DimMax * this.Frame.width + this.Frame.x,
          y: targetPoints[i].y / OptConstant.Common.DimMax * this.Frame.height + this.Frame.y,
          id: targetPoints[i].id != null ? targetPoints[i].id : 0
        };
      }
    }

    if (!rotate) {
      const rotationRadians = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, perimeterPoints);
    }

    T3Util.Log("= S.BaseShape - GetPerimPts output:", perimeterPoints);
    return perimeterPoints;
  }

  RRectGetPerimPts(e, targetPoints, hookId, rotate, table, needRotate) {
    T3Util.Log("= S.BaseShape - RRectGetPerimPts input:", { e, targetPoints, hookId, rotate, table, needRotate });

    let cornerSize, polyPoints, intersectCount, intersectPoints = [0, 0];
    const dimension = OptConstant.Common.DimMax;
    let perimeterPoints = [];
    let coManagerPoint = {};

    if (targetPoints.length === 1 && targetPoints[0].y === -OptConstant.AStyles.CoManager && this.IsCoManager(coManagerPoint)) {
      perimeterPoints.push(new Point(coManagerPoint.x, coManagerPoint.y));
      if (targetPoints[0].id != null) {
        perimeterPoints[0].id = targetPoints[0].id;
      }
      T3Util.Log("= S.BaseShape - RRectGetPerimPts output:", perimeterPoints);
      return perimeterPoints;
    }

    if (hookId === OptConstant.HookPts.KAT && table == null) {
      perimeterPoints = new BaseDrawObject(this).GetPerimPts(e, targetPoints, hookId, false, table, needRotate);
      T3Util.Log("= S.BaseShape - RRectGetPerimPts output:", perimeterPoints);
      return perimeterPoints;
    }

    // const tableObject = this.GetTable(false);
    // if (table != null && tableObject) {
    //   const tablePerimPts = T3Gv.opt.Table_GetPerimPts(this, tableObject, table, targetPoints);
    //   if (tablePerimPts) {
    //     perimeterPoints = tablePerimPts;
    //     if (!rotate) {
    //       const rotationRadians = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
    //       Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, perimeterPoints);
    //     }
    //     T3Util.Log("= S.BaseShape - RRectGetPerimPts output:", perimeterPoints);
    //     return perimeterPoints;
    //   }
    // }

    const useConnect = this.flags & NvConstant.ObjFlags.UseConnect;
    // const tableRows = this.hookflags & NvConstant.HookFlags.LcTableRows && tableObject;

    if (useConnect /*|| tableRows*/) {
      for (let i = 0; i < targetPoints.length; i++) {
        perimeterPoints[i] = {
          x: targetPoints[i].x / dimension * this.Frame.width + this.Frame.x,
          y: targetPoints[i].y / dimension * this.Frame.height + this.Frame.y,
          id: targetPoints[i].id != null ? targetPoints[i].id : 0
        };
      }
    } else {
      perimeterPoints = new BaseDrawObject(this).GetPerimPts(e, targetPoints, hookId, true, table, needRotate);
      cornerSize = this.GetCornerSize() * OptConstant.Common.RoundFactor;
      polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, false, null);

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
          intersectCount = PolyUtil.PolyGetIntersect(polyPoints, perimeterPoints[i].y, intersectPoints, null, false);
          if (intersectCount) {
            perimeterPoints[i].x = intersectPoints[0];
            if (intersectCount > 1 && intersectPoints[1] < perimeterPoints[i].x) {
              perimeterPoints[i].x = intersectPoints[1];
            }
          }
        } else if (targetPoints[i].x > 3 * dimension / 4) {
          intersectCount = PolyUtil.PolyGetIntersect(polyPoints, perimeterPoints[i].y, intersectPoints, null, false);
          if (intersectCount) {
            perimeterPoints[i].x = intersectPoints[0];
            if (intersectCount > 1 && intersectPoints[1] > perimeterPoints[i].x) {
              perimeterPoints[i].x = intersectPoints[1];
            }
          }
        } else if (targetPoints[i].y < dimension / 4) {
          intersectCount = PolyUtil.PolyGetIntersect(polyPoints, perimeterPoints[i].x, intersectPoints, null, true);
          if (intersectCount) {
            perimeterPoints[i].y = intersectPoints[0];
            if (intersectCount > 1 && intersectPoints[1] < perimeterPoints[i].y) {
              perimeterPoints[i].y = intersectPoints[1];
            }
          }
        } else if (targetPoints[i].y > 3 * dimension / 4) {
          intersectCount = PolyUtil.PolyGetIntersect(polyPoints, perimeterPoints[i].x, intersectPoints, null, true);
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
      const rotationRadians = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, perimeterPoints);
    }

    T3Util.Log("= S.BaseShape - RRectGetPerimPts output:", perimeterPoints);
    return perimeterPoints;
  }

  ChangeTarget(eventType: number, targetID: number, additionalData: any, flag: number, coordinates: { x: number; y: number }, needChangeTarget: boolean) {
    T3Util.Log("= S.BaseShape - ChangeTarget input:", { eventType, targetID, additionalData, flag, coordinates, needChangeTarget });

    if (needChangeTarget) {
      let businessMgr = OptAhUtil.GetGvSviOpt(this.BlockID);

      if (businessMgr === null) {
        businessMgr = T3Gv.wallOpt;
      }

      // Double TODO
      // businessMgr.ChangeTarget(targetID);
    }

    T3Util.Log("= S.BaseShape - ChangeTarget output");
  }

  GetTargetPoints(event, triggerType, objectID) {
    T3Util.Log("= S.BaseShape - GetTargetPoints input:", { event, triggerType, objectID });

    const defaultPoints = [
      { x: 0, y: 0 },
      { x: OptConstant.Common.DimMax / 4, y: 0 },
      { x: OptConstant.Common.DimMax / 2, y: 0 },
      { x: 3 * OptConstant.Common.DimMax / 4, y: 0 },
      { x: OptConstant.Common.DimMax, y: 0 },
      { x: OptConstant.Common.DimMax, y: OptConstant.Common.DimMax / 4 },
      { x: OptConstant.Common.DimMax, y: OptConstant.Common.DimMax / 2 },
      { x: OptConstant.Common.DimMax, y: 3 * OptConstant.Common.DimMax / 4 },
      { x: OptConstant.Common.DimMax, y: OptConstant.Common.DimMax },
      { x: 3 * OptConstant.Common.DimMax / 4, y: OptConstant.Common.DimMax },
      { x: OptConstant.Common.DimMax / 2, y: OptConstant.Common.DimMax },
      { x: OptConstant.Common.DimMax / 4, y: OptConstant.Common.DimMax },
      { x: 0, y: OptConstant.Common.DimMax },
      { x: 0, y: 3 * OptConstant.Common.DimMax / 4 },
      { x: 0, y: OptConstant.Common.DimMax / 2 },
      { x: 0, y: OptConstant.Common.DimMax / 4 }
    ];

    let targetPoints = [];
    const isContinuousConnection = this.flags & NvConstant.ObjFlags.ContConn && event !== null;
    const useConnectPoints = this.flags & NvConstant.ObjFlags.UseConnect && this.ConnectPoints;
    // const table = this.GetTable(false);
    // const isTableRows = this.hookflags & NvConstant.HookFlags.LcTableRows && table;
    let customTargetPoint = {};
    let hasCustomTargetPoint = false;
    const dimension = OptConstant.Common.DimMax;

    if (objectID >= 0) {
      const targetObject = DataUtil.GetObjectPtr(objectID, false);
    }

    if (hasCustomTargetPoint) {
      targetPoints.push(customTargetPoint);
      T3Util.Log("= S.BaseShape - GetTargetPoints output:", targetPoints);
      return targetPoints;
    }

    if (isContinuousConnection) {
      const polyTargets = this.PolyGetTargets(event, triggerType, this.Frame);
      T3Util.Log("= S.BaseShape - GetTargetPoints output:", polyTargets);
      return polyTargets;
    }

    if (useConnectPoints /*|| isTableRows*/) {
      const connectPoints = useConnectPoints ? this.ConnectPoints : this.ConnectPoints;// T3Gv.opt.Table_GetRowConnectPoints(this, table);
      for (let i = 0; i < connectPoints.length; i++) {
        targetPoints.push({ x: connectPoints[i].x, y: connectPoints[i].y });
      }

      if (this.extraflags & (OptConstant.ExtraFlags.FlipHoriz | OptConstant.ExtraFlags.FlipVert)) {
        const rect = new Rectangle(0, 0, dimension, dimension);
        T3Gv.opt.FlipPoints(rect, this.extraflags, targetPoints);
      }

      T3Util.Log("= S.BaseShape - GetTargetPoints output:", targetPoints);
      return targetPoints;
    }

    T3Util.Log("= S.BaseShape - GetTargetPoints output:", defaultPoints);
    return defaultPoints;
  }

  GetSegLFace(point: { x: number; y: number }, table: any, hookFlags: any) {
    T3Util.Log("= S.BaseShape - GetSegLFace input:", { point, table, hookFlags });

    const m = OptConstant.Common.DimMax;
    const distanceSquared = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      return dx * dx + dy * dy;
    };

    let rotationAngle = this.RotationAngle;
    let rotatedPoint = { ...point };
    if (rotationAngle) {
      const rotationRadians = -rotationAngle / (180 / NvConstant.Geometry.PI);
      const frame = { x: 0, y: 0, width: m, height: m };
      Utils3.RotatePointsAboutCenter(frame, rotationRadians, [rotatedPoint]);
    }

    const useConnectPoints = this.flags & NvConstant.ObjFlags.UseConnect;
    // const isTableRows = this.hookflags & NvConstant.HookFlags.LcTableRows && table;
    let connectPoints = [];

    if (useConnectPoints /*|| isTableRows*/) {
      connectPoints = useConnectPoints ? this.ConnectPoints : this.ConnectPoints;// T3Gv.opt.Table_GetRowConnectPoints(this, table);
      if (rotationAngle) {
        const rotationRadians = -rotationAngle / (180 / NvConstant.Geometry.PI);
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

      const result = OptConstant.HookPts.KTC + closestPointIndex;
      T3Util.Log("= S.BaseShape - GetSegLFace output:", result);
      return result;
    }

    const distances = {
      left: rotatedPoint.x,
      right: m - rotatedPoint.x,
      top: rotatedPoint.y,
      bottom: m - rotatedPoint.y
    };

    let result = NvConstant.SegLDir.Klc;
    if (distances.right < distances.left) {
      result = NvConstant.SegLDir.Krc;
      if (distances.top < distances.right) {
        result = NvConstant.SegLDir.Ktc;
        if (distances.bottom < distances.top) {
          result = NvConstant.SegLDir.Kbc;
        }
      } else if (distances.bottom < distances.right) {
        result = NvConstant.SegLDir.Kbc;
      }
    } else {
      if (distances.top < distances.left) {
        result = NvConstant.SegLDir.Ktc;
        if (distances.bottom < distances.top) {
          result = NvConstant.SegLDir.Kbc;
        }
      } else if (distances.bottom < distances.left) {
        result = NvConstant.SegLDir.Kbc;
      }
    }

    T3Util.Log("= S.BaseShape - GetSegLFace output:", result);
    return result;
  }

  Resize(element, newSize, drawingObject, actionType, previousBBox) {
    T3Util.Log('= S.BaseShape - Resize input:', { element, newSize, drawingObject, actionType, previousBBox });

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
      // Collab.SendSVGEvent(this.BlockID, OptConstant.CollabSVGEventTypes.ShapeGrow, newSize, eventDetails);

      const originalBBox = $.extend(true, {}, previousBBox);
      const updatedBBox = $.extend(true, {}, newSize);
      const inflatedBBox = $.extend(true, {}, newSize);
      const offset = T3Gv.opt.svgDoc.CalculateRotatedOffsetForResize(originalBBox, updatedBBox, rotation);

      if (this.StyleRecord.Line.BThick && this.polylist == null) {
        Utils2.InflateRect(inflatedBBox, this.StyleRecord.Line.BThick, this.StyleRecord.Line.BThick);
      }

      if (actionType !== OptConstant.ActionTriggerType.MovePolySeg) {
        element.SetSize(inflatedBBox.width, inflatedBBox.height);
        element.SetPos(inflatedBBox.x + offset.x, inflatedBBox.y + offset.y);

        let cornerSize = 0;
        if (this.ShapeType === OptConstant.ShapeType.Rect) {
          cornerSize = this.RRectGetCornerSize();
        }

        const shapeElement = element.GetElementById(OptConstant.SVGElementClass.Shape);
        shapeElement.SetSize(inflatedBBox.width, inflatedBBox.height);

        const slopElement = element.GetElementById(OptConstant.SVGElementClass.Slop);
        if (slopElement) {
          slopElement.SetSize(inflatedBBox.width, inflatedBBox.height);
        }

        const hatchElement = element.GetElementById(OptConstant.SVGElementClass.Hatch);
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

      // const table = this.GetTable(false);
      const graph = this.GetGraph(true);

      // if (table) {
      //   T3Gv.opt.Table_ResizeSVGTableObject(element, drawingObject, newSize);
      // } else

      if (graph) {
        T3Gv.opt.GraphFormat(this, graph, this.Frame, true);
        DataUtil.AddToDirtyList(this.BlockID);
        SvgUtil.RenderDirtySVGObjects();
      } else {
        this.LMResizeSVGTextObject(element, drawingObject, newSize);
      }

      element.SetRotation(rotation);
      this.UpdateDimensionLines(element);

      T3Util.Log('= S.BaseShape - Resize output:', offset);
      return offset;
    }
  }

  ResizeInTextEdit(element, newSize) {
    T3Util.Log('= S.BaseShape - ResizeInTextEdit input:', { element, newSize });

    const rotation = element.GetRotation();
    this.SetDimensionLinesVisibility(element, false);

    const originalFrame = $.extend(true, {}, this.Frame);
    const updatedFrame = $.extend(true, {}, newSize);
    const inflatedFrame = $.extend(true, {}, newSize);

    const offset = T3Gv.opt.svgDoc.CalculateRotatedOffsetForResize(originalFrame, updatedFrame, rotation);

    if (this.StyleRecord.Line.BThick && this.polylist == null) {
      Utils2.InflateRect(inflatedFrame, this.StyleRecord.Line.BThick, this.StyleRecord.Line.BThick);
    }

    element.SetSize(inflatedFrame.width, inflatedFrame.height);
    element.SetPos(inflatedFrame.x + offset.x, inflatedFrame.y + offset.y);

    let cornerSize = 0;
    if (this.ShapeType === OptConstant.ShapeType.Rect) {
      cornerSize = this.RRectGetCornerSize();
    }

    const shapeElement = element.GetElementById(OptConstant.SVGElementClass.Shape);
    if (shapeElement) {
      shapeElement.SetSize(inflatedFrame.width, inflatedFrame.height);
    }

    const slopElement = element.GetElementById(OptConstant.SVGElementClass.Slop);
    if (slopElement) {
      slopElement.SetSize(inflatedFrame.width, inflatedFrame.height);
    }

    // const table = this.GetTable(false);
    // if (table) {
    //   T3Gv.opt.Table_ResizeSVGTableObject(element, this, newSize, true);
    // }

    const hatchElement = element.GetElementById(OptConstant.SVGElementClass.Hatch);
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
    UIUtil.UpdateDisplayCoordinates(newSize, null, null, this);
    this.UpdateDimensionLines(element);

    T3Util.Log('= S.BaseShape - ResizeInTextEdit output:', offset);
    return offset;
  }

  Rotate(element, angle) {
    T3Util.Log("= S.BaseShape - Rotate input:", { element, angle });
    element.SetRotation(angle);
    T3Util.Log("= S.BaseShape - Rotate output");
  }

  ApplyStyles(element, styleRecord) {
    T3Util.Log("= S.BaseShape - ApplyStyles input:", { element, styleRecord });

    let fillType = styleRecord.Fill.Paint.FillType;
    let strokeType = styleRecord.Line.Paint.FillType;
    const hasImageURL = this.ImageURL !== '';
    let fillColor = styleRecord.Fill.Paint.Color;
    let strokeColor = styleRecord.Line.Paint.Color;
    const fieldDataStyleOverride = null;// this.GetFieldDataStyleOverride();

    if (fieldDataStyleOverride) {
      if (fieldDataStyleOverride.fillColor && fillType !== NvConstant.FillTypes.Transparent) {
        fillType = NvConstant.FillTypes.Solid;
        fillColor = fieldDataStyleOverride.fillColor;
      }
      if (fieldDataStyleOverride.strokeColor) {
        strokeType = NvConstant.FillTypes.Solid;
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
            if (this.ImageHeader.imageflags === NvConstant.ImageScales.AlwaysFit) {
              scaleType = 'NOPROP';
            } else if (this.ImageHeader.imageflags === NvConstant.ImageScales.PropFit) {
              scaleType = 'PROPFIT';
            }
          }
        }

        if (this.BlobBytesID !== -1) {
          const blob = DataUtil.GetObjectPtr(this.BlobBytesID, false);
          if (blob && blob.ImageDir === StyleConstant.ImageDir.Svg) {
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

        const flipHorizontally = (this.extraflags & OptConstant.ExtraFlags.FlipHoriz) > 0;
        const flipVertically = (this.extraflags & OptConstant.ExtraFlags.FlipVert) > 0;
        if (flipHorizontally) {
          element.SetMirror(flipHorizontally);
        }
        if (flipVertically) {
          element.SetFlip(flipVertically);
        }
        element.SetFillOpacity(styleRecord.Fill.Paint.Opacity);
      } else {
        switch (fillType) {
          case NvConstant.FillTypes.Gradient:
            element.SetGradientFill(this.CreateGradientRecord(
              styleRecord.Fill.Paint.GradientFlags,
              fillColor,
              styleRecord.Fill.Paint.Opacity,
              styleRecord.Fill.Paint.EndColor,
              styleRecord.Fill.Paint.EndOpacity
            ));
            break;
          case NvConstant.FillTypes.RichGradient:
            element.SetGradientFill(this.CreateRichGradientRecord(styleRecord.Fill.Paint.GradientFlags));
            break;
          case NvConstant.FillTypes.Texture:
            const texture = {
              url: '',
              scale: 1,
              alignment: styleRecord.Fill.Paint.TextureScale.AlignmentScalar
            };
            const textureIndex = styleRecord.Fill.Paint.Texture;
            if (T3Gv.opt.TextureList.Textures[textureIndex]) {
              texture.dim = T3Gv.opt.TextureList.Textures[textureIndex].dim;
              texture.url = T3Gv.opt.TextureList.Textures[textureIndex].ImageURL;
              texture.scale = T3Gv.opt.CalcTextureScale(styleRecord.Fill.Paint.TextureScale, texture.dim.x);
              styleRecord.Fill.Paint.TextureScale.Scale = texture.scale;
              if (!texture.url) {
                texture.url = Constants.FilePath_CMSRoot + Constants.FilePath_Textures + T3Gv.opt.TextureList.Textures[textureIndex].filename;
              }
              element.SetTextureFill(texture);
              element.SetFillOpacity(styleRecord.Fill.Paint.Opacity);
            }
            break;
          case NvConstant.FillTypes.Transparent:
            element.SetFillColor('none');
            break;
          default:
            if (styleRecord.Fill.Paint.Color.indexOf('#0102') === 0) {
              element.SetFillColor('none');
              T3Gv.opt.Test3DGraph(element.parent, this.Frame.width, this.Frame.height, styleRecord.Fill.Paint.Color);
            } else {
              element.SetFillColor(fillColor);
              element.SetFillOpacity(styleRecord.Fill.Paint.Opacity);
            }
            break;
        }

        switch (strokeType) {
          case NvConstant.FillTypes.Gradient:
            element.SetGradientStroke(this.CreateGradientRecord(
              styleRecord.Line.Paint.GradientFlags,
              strokeColor,
              styleRecord.Line.Paint.Opacity,
              styleRecord.Line.Paint.EndColor,
              styleRecord.Line.Paint.EndOpacity
            ));
            break;
          case NvConstant.FillTypes.RichGradient:
            element.SetGradientStroke(this.CreateRichGradientRecord(styleRecord.Line.Paint.GradientFlags));
            break;
          case NvConstant.FillTypes.Texture:
            const strokeTexture = {
              url: '',
              scale: styleRecord.Line.Paint.TextureScale.Scale,
              alignment: styleRecord.Line.Paint.TextureScale.AlignmentScalar
            };
            const strokeTextureIndex = styleRecord.Line.Paint.Texture;
            strokeTexture.dim = T3Gv.opt.TextureList.Textures[strokeTextureIndex].dim;
            strokeTexture.url = T3Gv.opt.TextureList.Textures[strokeTextureIndex].ImageURL;
            if (!strokeTexture.url) {
              strokeTexture.url = Constants.FilePath_CMSRoot + Constants.FilePath_Textures + T3Gv.opt.TextureList.Textures[strokeTextureIndex].filename;
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

    T3Util.Log("= S.BaseShape - ApplyStyles output");
  }

  SetFillHatch(element, hatchType, color?) {
    T3Util.Log("= S.BaseShape - SetFillHatch input:", { element, hatchType, color });

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
        type: BConstant.EffectType.RECOLOR,
        params: { color: lineColor }
      });

      element.Effects().SetEffects(effects, this.Frame);
    } else {
      element.SetFillColor('none');
    }

    T3Util.Log("= S.BaseShape - SetFillHatch output");
  }

  IsTransparent() {
    T3Util.Log("= S.BaseShape - IsTransparent input");

    const isTransparent = this.StyleRecord.Fill.Paint.FillType === NvConstant.FillTypes.Transparent;

    T3Util.Log("= S.BaseShape - IsTransparent output:", isTransparent);
    return isTransparent;
  }

  GetTargetRect() {
    T3Util.Log("= S.BaseShape - GetTargetRect input");

    const targetRect = {};
    Utils2.CopyRect(targetRect, this.Frame);

    T3Util.Log("= S.BaseShape - GetTargetRect output:", targetRect);
    return targetRect;
  }

  Hit(point, isBorderOnly, isTransparent, hitResult) {
    T3Util.Log("= S.BaseShape - Hit input:", { point, isBorderOnly, isTransparent, hitResult });

    let rotationRadians, polyPoints, hitCode;
    const transformedPoint = [{ x: point.x, y: point.y }];
    let frameWithThickness = {};
    const borderThickness = this.StyleRecord.Line.Thickness / 2;

    if (this.flags & NvConstant.ObjFlags.UseConnect && this.ConnectPoints) {
      isBorderOnly = false;
    }

    if (this.RotationAngle !== 0) {
      rotationRadians = this.RotationAngle / (180 / NvConstant.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, transformedPoint);
    }

    const transformedCoords = { x: transformedPoint[0].x, y: transformedPoint[0].y };
    Utils2.CopyRect(frameWithThickness, this.Frame);
    Utils2.InflateRect(frameWithThickness, borderThickness, borderThickness);

    hitCode = Utils2.pointInRect(frameWithThickness, transformedCoords) ? NvConstant.HitCodes.Border : 0;

    if (hitCode) {
      polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, true, null);
      if (T3Gv.opt.fromOverlayLayer || PolyUtil.PolyPtInPolygon(polyPoints, transformedCoords)) {
        hitCode = NvConstant.HitCodes.Inside;
        if (this.IsTransparent() || isBorderOnly) {
          hitCode = 0;
          isBorderOnly = true;
        }
        polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, false, null);
        if (isBorderOnly && Utils3.LineDStyleHit(polyPoints, transformedCoords, borderThickness, 0, null)) {
          hitCode = NvConstant.HitCodes.Border;
        }
      } else {
        hitCode = 0;
      }
    }

    if (hitResult) {
      hitResult.hitcode = hitCode;
    }

    T3Util.Log("= S.BaseShape - Hit output:", hitCode);
    return hitCode;
  }

  AllowMaintainLink() {
    T3Util.Log("= S.BaseShape - AllowMaintainLink input");

    const result = !!(
      this instanceof Instance.Shape.Polygon &&
      this.hookflags & NvConstant.HookFlags.LcAttachToLine
    );

    T3Util.Log("= S.BaseShape - AllowMaintainLink output:", result);
    return result;
  }

  PolyGetTargetPointList(rotationAngle: number) {
    T3Util.Log("= S.BaseShape - PolyGetTargetPointList input:", { rotationAngle });

    let polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, true, null);
    let angleInRadians = 0;

    if (rotationAngle !== 0) {
      angleInRadians = -rotationAngle / (180 / NvConstant.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, angleInRadians, polyPoints);
    }

    T3Util.Log("= S.BaseShape - PolyGetTargetPointList output:", polyPoints);
    return polyPoints;
  }

  PolyGetTargets(event, hookFlags, frame) {
    T3Util.Log("= S.BaseShape - PolyGetTargets input:", { event, hookFlags, frame });

    let closestPointIndex = -1;
    let minDistance = OptConstant.Common.LongIntMax;
    const targetPoints = [{ x: 0, y: 0 }];
    const resultPoints = [];
    const rotatedEvent = { x: event.x, y: event.y };
    const rotatedFrame = { ...frame };
    const polyPoints = this.PolyGetTargetPointList(hookFlags);

    if (!event) return null;

    if (T3Gv.docUtil.docConfig.enableSnap && !(hookFlags & NvConstant.HookFlags.LcNoSnaps)) {
      rotatedEvent.x = T3Gv.docUtil.SnapToGrid(rotatedEvent).x;
      rotatedEvent.y = T3Gv.docUtil.SnapToGrid(rotatedEvent).y;
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
        const rotationRadians = this.RotationAngle / (180 / NvConstant.Geometry.PI);
        Utils3.RotatePointsAboutCenter(rotatedFrame, rotationRadians, targetPoints);
      }

      const normalizedX = (targetPoints[0].x - frame.x) / frame.width * OptConstant.Common.DimMax;
      const normalizedY = (targetPoints[0].y - frame.y) / frame.height * OptConstant.Common.DimMax;
      resultPoints.push(new Point(normalizedX, normalizedY));

      T3Util.Log("= S.BaseShape - PolyGetTargets output:", resultPoints);
      return resultPoints;
    }

    T3Util.Log("= S.BaseShape - PolyGetTargets output: null");
    return null;
  }

  LMAddSVGTextObject(e, t) {
    var a,
      r = $.extend(!0, {
      }, this.Frame),
      i = Utils1.DeepCopy(this.trect),
      n = - 1,
      o = null;//this.GetTable(!1);
    if (o) {
      if (!(o.select >= 0)) return;
      var s = o.cells[o.select];
      if (s.DataID !== this.DataID) {
        var l = T3Gv.opt.Table_CellFromDataID(o, this.DataID);
        l >= 0 &&
          (s = o.cells[l])
      }
      a = s.trect,
        s.nextra &&
        (a = T3Gv.opt.Table_GetJoinedCellFrame(o, o.select, !0, !1)),
        i.x = this.trect.x + a.x,
        i.y = this.trect.y + a.y,
        i.width = a.width,
        i.height = a.height,
        n = s.DataID
    }
    var S = T3Gv.stdObj.GetObject(this.DataID);
    if (null != S) {
      var c = e.CreateShape(OptConstant.CSType.Text);
      c.SetRenderingEnabled(!1),
        c.SetID(OptConstant.SVGElementClass.Text),
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
        this.TextFlags & NvConstant.TextFlags.AttachA ||
        this.TextFlags & NvConstant.TextFlags.AttachB ||
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
        this.TextFlags & NvConstant.TextFlags.AttachA
      ) switch (
        c.SetRenderingEnabled(!0),
        c.SetConstraints(T3Gv.opt.header.MaxWorkDim.x, 0, 0),
        (p = c.GetTextMinDimensions()).width,
        p.height,
        this.TextAlign
        ) {
          case TextConstant.TextAlign.TopLeft:
          case TextConstant.TextAlign.Left:
          case TextConstant.TextAlign.BottomLeft:
            c.SetPos(0, - p.height - this.TMargins.top),
              c.SetParagraphAlignment(TextConstant.TextAlign.Left);
            break;
          case TextConstant.TextAlign.TopRight:
          case TextConstant.TextAlign.Right:
          case TextConstant.TextAlign.BottomRight:
            c.SetPos(this.Frame.width - p.width, - p.height - this.TMargins.top),
              c.SetParagraphAlignment(TextConstant.TextAlign.Right);
            break;
          default:
            c.SetPos(this.Frame.width / 2 - p.width / 2, - p.height - this.TMargins.top),
              c.SetParagraphAlignment(TextConstant.TextAlign.Center)
        } else if (this.TextFlags & NvConstant.TextFlags.AttachB) switch (
          c.SetRenderingEnabled(!0),
          c.SetConstraints(T3Gv.opt.header.MaxWorkDim.x, 0, 0),
          (p = c.GetTextMinDimensions()).width,
          this.TextAlign
        ) {
            case TextConstant.TextAlign.TopLeft:
            case TextConstant.TextAlign.Left:
            case TextConstant.TextAlign.BottomLeft:
              c.SetPos(0, this.Frame.height + this.TMargins.bottom),
                c.SetParagraphAlignment(TextConstant.TextAlign.Left);
              break;
            case TextConstant.TextAlign.TopRight:
            case TextConstant.TextAlign.Right:
            case TextConstant.TextAlign.BottomRight:
              c.SetPos(
                this.Frame.width - p.width,
                this.Frame.height + this.TMargins.bottom
              ),
                c.SetParagraphAlignment(TextConstant.TextAlign.Right);
              break;
            default:
              c.SetPos(
                this.Frame.width / 2 - p.width / 2,
                this.Frame.height + this.TMargins.bottom
              ),
                c.SetParagraphAlignment(TextConstant.TextAlign.Center)
          } else this.TextGrow == NvConstant.TextGrowBehavior.Horizontal ? c.SetConstraints(T3Gv.opt.header.MaxWorkDim.x, i.width, i.height) : c.SetConstraints(i.width, i.width, i.height);
      c.SetRenderingEnabled(!0),
        c.SetEditCallback(T3Gv.opt.TextCallback, t)
    }
  }

  LMResizeSVGTextObject(e, t, a) {
    if (- 1 != t.DataID) {
      var r = e.GetElementById(OptConstant.SVGElementClass.Text);
      if (r) {
        var i = t.trect,
          n = null;
        if (this.TextFlags & NvConstant.TextFlags.AttachA) {
          switch ((n = r.GetTextMinDimensions()).width, n.height, this.TextAlign) {
            case TextConstant.TextAlign.TopLeft:
            case TextConstant.TextAlign.Left:
            case TextConstant.TextAlign.BottomLeft:
              r.SetPos(0, - n.height - this.TMargins.top),
                r.SetParagraphAlignment(TextConstant.TextAlign.Left);
              break;
            case TextConstant.TextAlign.TopRight:
            case TextConstant.TextAlign.Right:
            case TextConstant.TextAlign.BottomRight:
              r.SetPos(a.width - n.width, - n.height - this.TMargins.top),
                r.SetParagraphAlignment(TextConstant.TextAlign.Right);
              break;
            default:
              r.SetPos(a.width / 2 - n.width / 2, - n.height - this.TMargins.top),
                r.SetParagraphAlignment(TextConstant.TextAlign.Center)
          }
          r.SetConstraints(T3Gv.opt.header.MaxWorkDim.x, 0, 0)
        } else if (this.TextFlags & NvConstant.TextFlags.AttachB) {
          switch ((n = r.GetTextMinDimensions()).width, this.TextAlign) {
            case TextConstant.TextAlign.TopLeft:
            case TextConstant.TextAlign.Left:
            case TextConstant.TextAlign.BottomLeft:
              r.SetPos(0, a.height + this.TMargins.bottom),
                r.SetParagraphAlignment(TextConstant.TextAlign.Left);
              break;
            case TextConstant.TextAlign.TopRight:
            case TextConstant.TextAlign.Right:
            case TextConstant.TextAlign.BottomRight:
              r.SetPos(a.width - n.width, a.height + this.TMargins.bottom),
                r.SetParagraphAlignment(TextConstant.TextAlign.Right);
              break;
            default:
              r.SetPos(a.width / 2 - n.width / 2, a.height + this.TMargins.bottom),
                r.SetParagraphAlignment(TextConstant.TextAlign.Center)
          }
          r.SetConstraints(T3Gv.opt.header.MaxWorkDim.x, 0, 0)
        } else {
          r.SetPos(i.x - a.x, i.y - a.y);
          var o = i.width;
          this.TextGrow == NvConstant.TextGrowBehavior.Horizontal &&
            (o = T3Gv.opt.header.MaxWorkDim.x),
            r.SetConstraints(o, i.width, i.height)
        }
      }
    }
  }


  GetIconShape() {
    return this.BlockID
  }

  /**
   * Handles operations to be performed after a shape is created, including dimension lines update and icon management
   * @param svgDocument - The SVG document context
   * @param svgElement - The SVG element representing this shape
   * @param shapePosition - The position of the shape
   * @param additionalParams - Additional parameters for shape creation
   */
  PostCreateShapeCallback(svgDocument, svgElement, shapePosition, additionalParams) {
    // Update dimension lines for the shape
    this.UpdateDimensionLines(svgElement);

    // Add icons to this shape
    this.AddIcons(svgDocument, svgElement);
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
    T3Util.Log("S.BaseShape - GetDimensionLineDeflection input:", {
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

    T3Util.Log("S.BaseShape - GetDimensionLineDeflection output:", finalDeflection);
    return finalDeflection;
  }

  DimensionLineDeflectionAdjust(
    svgElement: any,
    xCoord: number,
    yCoord: number,
    additionalParam: any,
    segmentInfo: any
  ): void {
    T3Util.Log("= S.BaseShape - DimensionLineDeflectionAdjust input:", {
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

    if (this.Dimensions & NvConstant.DimensionFlags.Select) {
      this.HideOrShowSelectOnlyDimensions(true);
    }

    T3Util.Log("= S.BaseShape - DimensionLineDeflectionAdjust output:", {
      dimensionDeflectionH: this.dimensionDeflectionH,
      dimensionDeflectionV: this.dimensionDeflectionV
    });
  }

  MaintainProportions(newWidth: number | null, newHeight: number | null): number | null {
    T3Util.Log("= S.BaseShape - MaintainProportions input:", { newWidth, newHeight });
    const frameWidth = this.Frame.width;
    const frameHeight = this.Frame.height;
    let result: number | null = null;
    if (this.ResizeAspectConstrain) {
      if (newWidth != null && frameWidth > 0) {
        result = newWidth * (frameHeight / frameWidth);
        T3Util.Log("= S.BaseShape - MaintainProportions output:", result);
        return result;
      }
      if (newHeight != null && frameHeight > 0) {
        result = newHeight * (frameWidth / frameHeight);
        T3Util.Log("= S.BaseShape - MaintainProportions output:", result);
        return result;
      }
    }
    T3Util.Log("= S.BaseShape - MaintainProportions output:", result);
    return result;
  }

  UpdateDimensionFromTextObj(textComponent, textData) {
    T3Util.Log("= S.BaseShape - UpdateDimensionFromTextObj input:", { textComponent, textData });
    T3Gv.stdObj.PreserveBlock(this.BlockID);

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
      DataUtil.AddToDirtyList(this.BlockID);
      SvgUtil.RenderDirtySVGObjects();
      T3Util.Log("= S.BaseShape - UpdateDimensionFromTextObj output: Invalid dimension length");
      return;
    }

    // For segment 1, adjust width; otherwise adjust height
    if (segment === 1) {
      computedWidth = this.MaintainProportions(dimensionLength, null);
      this.SetSize(dimensionLength, computedWidth, OptConstant.ActionTriggerType.LineLength);
      if (this.GetDimensionsForDisplay().width === dimensionLength) {
        this.rwd = dimensionValue;
        this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, true);
      }
    } else {
      computedHeight = this.MaintainProportions(null, dimensionLength);
      this.SetSize(computedHeight, dimensionLength, OptConstant.ActionTriggerType.LineLength);
      if (this.GetDimensionsForDisplay().height === dimensionLength) {
        this.rht = dimensionValue;
        this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, true);
      }
    }

    // Set link flags for this shape and all connected hook objects
    OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.Move);
    for (let i = 0, hooksCount = this.hooks.length; i < hooksCount; i++) {
      OptCMUtil.SetLinkFlag(this.hooks[i].objid, DSConstant.LinkFlags.Move);
    }

    DataUtil.AddToDirtyList(this.BlockID);
    if (this.Frame.x < 0 || this.Frame.y < 0) {
      T3Gv.opt.ScrollObjectIntoView(this.BlockID, false);
    }
    DrawUtil.CompleteOperation(null);
    T3Util.Log("= S.BaseShape - UpdateDimensionFromTextObj output: update complete");
  }

  DimensionEditCallback(actionType: string, eventData: any, textObject: any, shapeObject: any): void {
    T3Util.Log("S.BaseShape - DimensionEditCallback input:", { actionType, eventData, textObject, shapeObject });

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
          eventData.keyCode === KeyboardConstant.Keys.Tab ||
          eventData.keyCode === KeyboardConstant.Keys.Enter
        ) {
          T3Gv.opt.CloseEdit();
          T3Util.Log("S.BaseShape - DimensionEditCallback output:", true);
          return;
        }
        break;
      }
      case 'charfilter': {
        // Filter allowed characters based on ruler settings.
        if (
          T3Gv.docUtil.rulerConfig.useInches &&
          T3Gv.docUtil.rulerConfig.units === NvConstant.RulerUnit.Feet
        ) {
          if (eventData.search(/(\d|\.|'|"| )/) === -1) {
            T3Util.Log("S.BaseShape - DimensionEditCallback output:", false);
            return;
          }
        } else if (eventData.search(/(\d|\.)/) === -1) {
          T3Util.Log("S.BaseShape - DimensionEditCallback output:", false);
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
        T3Gv.opt.bInDimensionEdit = false;


        let userDataCopy = Utils1.DeepCopy(textObject.GetUserData());
        let messageData = {
          BlockID: editableShape.BlockID,
          text: textObject.GetText(),
          userData: userDataCopy
        };
        DataUtil.GetObjectPtr(editableShape.BlockID, true);
        editableShape = DataUtil.GetObjectPtr(editableShape.BlockID, false);

        editableShape.UpdateDimensionFromTextObj(textObject);
        break;
      }
      default: {
        // No specific action; do nothing.
        break;
      }
    }

    T3Util.Log("S.BaseShape - DimensionEditCallback output: completed");
  }

  NoFlip(): boolean {
    T3Util.Log("= S.BaseShape - NoFlip input:");

    let canRotate: boolean;
    if (this.hooks.length) {
      // If there is at least one hook, check the hook point condition:
      // It returns true if the first hook's hook point is not SED_KAT and not greater than SED_AK.
      canRotate =
        this.hooks[0].hookpt !== OptConstant.HookPts.KAT &&
        !(this.hooks[0].hookpt > OptConstant.HookPts.AK);
    } else {
      // If there are no hooks, defer to the extra flags check
      canRotate = Boolean(this.extraflags & OptConstant.ExtraFlags.NoRotate);
    }

    T3Util.Log("= S.BaseShape - NoFlip output:", canRotate);
    return canRotate;
  }

  Flip(flipFlags: number): void {
    T3Util.Log("= S.BaseShape - Flip input:", { flipFlags });

    // If both SymbolURL and ImageURL are empty, do nothing.
    if (this.SymbolURL === "" && this.ImageURL === "") {
      T3Util.Log("= S.BaseShape - Flip output: no symbol or image found, nothing flipped");
      return;
    }

    // If the flipFlags indicate a horizontal flip, flip horizontally.
    if (flipFlags & OptConstant.ExtraFlags.FlipHoriz) {
      const isCurrentlyFlippedHoriz = (this.extraflags & OptConstant.ExtraFlags.FlipHoriz) !== 0;
      this.extraflags = Utils2.SetFlag(
        this.extraflags,
        OptConstant.ExtraFlags.FlipHoriz,
        !isCurrentlyFlippedHoriz
      );
    }

    // If the flipFlags indicate a vertical flip, flip vertically.
    if (flipFlags & OptConstant.ExtraFlags.FlipVert) {
      const isCurrentlyFlippedVert = (this.extraflags & OptConstant.ExtraFlags.FlipVert) !== 0;
      this.extraflags = Utils2.SetFlag(
        this.extraflags,
        OptConstant.ExtraFlags.FlipVert,
        !isCurrentlyFlippedVert
      );
    }

    T3Util.Log("= S.BaseShape - Flip output:", { extraflags: this.extraflags });
  }

  NoRotate(): boolean {
    T3Util.Log("= S.BaseShape: NoRotate input: {}");
    // Find all child connectors for this shape.
    const childConnectors = HookUtil.FindAllChildConnectors(this.BlockID);
    let childObject: any;

    // If the shape is a swimlane, do not rotate.
    if (false/*this.IsSwimlane()*/) {
      T3Util.Log("= S.BaseShape: NoRotate output: true (shape is a swimlane)");
      return true;
    }

    // If the first hook's object is a shape container, do not rotate.
    if (this.hooks.length && (childObject = DataUtil.GetObjectPtr(this.hooks[0].objid, false)) &&
      childObject.objecttype === NvConstant.FNObjectTypes.ShapeContainer) {
      T3Util.Log("= S.BaseShape: NoRotate output: true (hook object is a SHAPECONTAINER)");
      return true;
    }

    // If extra flags indicate no rotation, do not rotate.
    if (this.extraflags & OptConstant.ExtraFlags.NoRotate) {
      T3Util.Log("= S.BaseShape: NoRotate output: true (extraflags SEDE_NoRotate set)");
      return true;
    }

    // Check each child connector; if any child connector is not a flow chart connector and
    // has hooks beyond the skipped count, do not allow rotation.
    const connectorCount = childConnectors.length;
    for (let i = 0; i < connectorCount; i++) {
      childObject = DataUtil.GetObjectPtr(childConnectors[i], false);
      if (!childObject.IsFlowChartConnector() && (childObject.arraylist.hook.length - OptConstant.ConnectorDefines.NSkip) > 0) {
        T3Util.Log("= S.BaseShape: NoRotate output: true (child connector condition met at index " + i + ")");
        return true;
      }
    }

    T3Util.Log("= S.BaseShape: NoRotate output: false");
    return false;
  }

  MaintainPoint(currentPoint, targetPoint, deltaValue, mode, extraFlag) {
    T3Util.Log("= S.BaseShape - MaintainPoint input:", { currentPoint, targetPoint, deltaValue, mode, extraFlag });
    const result = false;
    T3Util.Log("= S.BaseShape - MaintainPoint output:", result);
    return result;
  }

  AddIcon(iconData: any, containerElement: any, iconPosition: { x: number; y: number }): any {
    T3Util.Log("= S.BaseShape - AddIcon input:", { iconData, containerElement, iconPosition });
    if (containerElement) {
      let containerId = containerElement.GetID();
      // Use the container's frame if it is different from this shape, otherwise use this shape's frame.
      let targetFrame = this.Frame;
      if (containerId !== this.BlockID) {
        const containerObject = DataUtil.GetObjectPtr(containerId, false);
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
      T3Util.Log("= S.BaseShape - AddIcon output:", iconElement);
      return iconElement;
    }
    T3Util.Log("= S.BaseShape - AddIcon output:", null);
    return null;
  }

  GetActionButtons(): { left: boolean; right: boolean; up: boolean; down: boolean; custom: boolean } | null {
    T3Util.Log("= S.BaseShape - GetActionButtons input:", {});

    // Check if the session disallows action buttons
    const sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    if (sessionBlock.moreflags & NvConstant.SessionMoreFlags.NoActionButton) {
      T3Util.Log("= S.BaseShape - GetActionButtons output:", null);
      return null;
    }

    // If the shape is locked, no action buttons are allowed
    if (this.flags & NvConstant.ObjFlags.Lock) {
      T3Util.Log("= S.BaseShape - GetActionButtons output:", null);
      return null;
    }

    // Check active text/table/outline object conditions
    const teData = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
    if (
      this.BlockID === teData.theActiveTextEditObjectID ||
      this.BlockID === teData.theActiveTableObjectID ||
      this.BlockID === teData.theActiveOutlineObjectID
    ) {
      T3Util.Log("= S.BaseShape - GetActionButtons output:", null);
      return null;
    }

    // Check layer settings: if the active layer is using edges, no buttons should be available.
    const layersManager = DataUtil.GetObjectPtr(T3Gv.opt.layersManagerBlockId, false);
    if (layersManager && (layersManager.layers[layersManager.activelayer].flags & NvConstant.LayerFlags.UseEdges)) {
      T3Util.Log("= S.BaseShape - GetActionButtons output:", null);
      return null;
    }

    // Get the OptAhUtil controlling selection
    let selectionBusinessManager = OptAhUtil.GetGvSviOpt(this.BlockID);
    if (selectionBusinessManager == null) {
      selectionBusinessManager = T3Gv.wallOpt;
    }

    // Variables to hold allowed action buttons
    let allowedButtons: any = null;
    let upAllowed = false;
    let downAllowed = false;
    let leftAllowed = false;
    let rightAllowed = false;
    let customAllowed = false;

    // Determine if the shape can have action buttons
    if (selectionBusinessManager && !OptAhUtil.ShapeCannotHaveActionButtons(this)) {
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

    T3Util.Log("= S.BaseShape - GetActionButtons output:", result);
    return result;
  }

  SetRolloverActions(svgEvent: any, rolloverElement: any, domEvent: any) {
    T3Util.Log("S.BaseShape - SetRolloverActions input:", { svgEvent, rolloverElement, domEvent });

    // Get the base object for this shape
    const baseShapeObj = DataUtil.GetObjectPtr(this.BlockID, false);

    if (baseShapeObj && baseShapeObj instanceof BaseDrawObject) {
      const objectTypes = NvConstant.FNObjectTypes;
      switch (this.objecttype) {
        // case objectTypes.SwimLaneRows:
        // case objectTypes.SD_OBJT_SWIMLANE_COLS:
        // case objectTypes.SD_OBJT_SWIMLANE_GRID:
        case objectTypes.FrameContainer:
          if (domEvent) {
            // Get the rollover target from the DOM event's currentTarget element
            const rolloverTarget = T3Gv.opt.svgObjectLayer
              .FindElementByDOMElement(domEvent.currentTarget)
              .GetTargetForEvent(domEvent);
            if (rolloverTarget.GetID() === OptConstant.SVGElementClass.Slop) {
              // Delegate to the parent method
              super.SetRolloverActions(svgEvent, rolloverTarget);
            }
          }
          // Always set cursors afterward
          this.SetCursors();
          T3Util.Log("S.BaseShape - SetRolloverActions output:", "Handled SWIMLANE/FRAME_CONTAINER rollover");
          return;

        case objectTypes.ShapeContainer:
          // If the shape container is in a table cell, delegate rollover to the cell object
          const containerCell = T3Gv.opt.ContainerIsInCell(this);
          if (containerCell) {
            const cellElement = T3Gv.opt.svgObjectLayer.GetElementById(containerCell.obj.BlockID);
            containerCell.obj.SetRolloverActions(svgEvent, cellElement);
            T3Util.Log("S.BaseShape - SetRolloverActions output:", "Delegated rollover to contained cell object");
            return;
          }
      }

      // Clear previously highlighted shape if different than current
      if (T3Gv.opt.curHiliteShape !== -1 && T3Gv.opt.curHiliteShape !== this.BlockID) {
        const prevHiliteObj = DataUtil.GetObjectPtr(T3Gv.opt.curHiliteShape, false);
        if (prevHiliteObj) {
          prevHiliteObj.SetRuntimeEffects(false);
          prevHiliteObj.ClearCursors();
        }
      }

      // Remove any existing action arrows for this shape
      const arrowGroupId = "actionArrow" + this.BlockID;
      if (this.actionArrowHideTimerID >= 0) {
        T3Gv.opt.ClearActionArrowTimer(this.BlockID);
      }
      ActionUtil.RemoveActionArrows(this.BlockID, true);

      // Obtain available action buttons for this shape
      const actionButtons = this.GetActionButtons();
      if (actionButtons) {
        const noDirectionalButtons = !(actionButtons.up || actionButtons.left || actionButtons.down ||
          actionButtons.right || actionButtons.custom);
        // For text only objects or if no directional arrow buttons exist,
        // simply use the base rollover actions.
        if (this.flags & NvConstant.ObjFlags.TextOnly || noDirectionalButtons) {
          super.SetRolloverActions(svgEvent, rolloverElement);
        } else {
          const currentBlockId = this.BlockID;
          const self = this;
          this.SetRuntimeEffects(true);
          this.SetCursors();
          T3Gv.opt.curHiliteShape = this.BlockID;

          let arrowElements: any[] = [];
          let screenScale = svgEvent.docInfo.docToScreenScale;
          if (svgEvent.docInfo.docScale <= 0.5) {
            screenScale *= 2;
          }
          const baseArrowSlop = OptConstant.Common.BaseArrowSlop / screenScale;
          const connectorArrowSlop = OptConstant.Common.ConnectorArrowSlop / screenScale;
          let knobSizeOffset = 0;
          const selectedList = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, false);
          if (selectedList && selectedList.indexOf(currentBlockId) !== -1) {
            knobSizeOffset = OptConstant.Common.KnobSize / 2;
          }
          let horizontalOffset = 0;
          let verticalOffset = 0;

          // If there is an ongoing action (stored object, drag, or rubber band) then add a mouseout event
          if (T3Gv.opt.actionStoredObjectId !== -1 ||
            T3Gv.opt.dragBBoxList.length !== 0 ||
            T3Gv.opt.rubberBand) {
            // When mouse leaves, clear effects and cursors
            rolloverElement.svgObj.mouseout(() => {
              self.SetRuntimeEffects(false);
              self.ClearCursors();
              T3Gv.opt.curHiliteShape = -1;
            });
          } else {
            // Adjust arrow offsets based on connected child shapes if any
            let leftAdjustment = baseArrowSlop;
            let rightAdjustment = baseArrowSlop;
            let topAdjustment = baseArrowSlop;
            let bottomAdjustment = baseArrowSlop;
            let childObj: any = null;
            // Object to hold child hook info
            const childHookData = { lindex: -1, id: -1, hookpt: 0 };
            // Iterate as long as there are child hooks
            while (T3Gv.opt.FindChildArrayByIndex(this.BlockID, childHookData) > 0) {
              childObj = DataUtil.GetObjectPtr(childHookData.id, false);
              const isCoManager = ((childObj.arraylist.styleflags & OptConstant.AStyles.CoManager) > 0);
              const isAssistantChild = childObj.IsChildOfAssistant();
              const isFlowConnector = childObj.IsFlowChartConnector();
              let hookCount = childObj.arraylist.hook.length - OptConstant.ConnectorDefines.NSkip;
              if (hookCount < 0) {
                hookCount = 0;
              }
              if (hookCount !== 0 && !isFlowConnector && !isCoManager && !isAssistantChild && childHookData.hookpt) {
                switch (childHookData.hookpt) {
                  case OptConstant.HookPts.LL:
                    rightAdjustment = connectorArrowSlop;
                    horizontalOffset += connectorArrowSlop - baseArrowSlop;
                    break;
                  case OptConstant.HookPts.LR:
                    leftAdjustment = connectorArrowSlop;
                    horizontalOffset -= connectorArrowSlop - baseArrowSlop;
                    break;
                  case OptConstant.HookPts.LT:
                    bottomAdjustment = connectorArrowSlop;
                    verticalOffset += connectorArrowSlop - baseArrowSlop;
                    break;
                  case OptConstant.HookPts.LB:
                    topAdjustment = connectorArrowSlop;
                    verticalOffset -= connectorArrowSlop - baseArrowSlop;
                    break;
                }
              }
            }

            // Create a group element for the action arrows
            const arrowGroup = svgEvent.CreateShape(OptConstant.CSType.Group);
            arrowGroup.SetID(arrowGroupId);
            arrowGroup.SetUserData(currentBlockId);

            const arrowSizeVertical = OptConstant.Common.ActionArrowSizeV / screenScale;
            const arrowSizeHorizontal = OptConstant.Common.ActionArrowSizeH / screenScale;

            let parentFrame;
            // Expand parent frame to include arrow buttons and any knob offset
            parentFrame.x -= arrowSizeVertical + rightAdjustment + knobSizeOffset;
            parentFrame.y -= arrowSizeVertical + topAdjustment + knobSizeOffset;
            parentFrame.width += 2 * arrowSizeVertical + (rightAdjustment + leftAdjustment) + 2 * knobSizeOffset;
            parentFrame.height += 2 * arrowSizeVertical + (topAdjustment + bottomAdjustment) + 2 * knobSizeOffset;

            // Calculate center adjustment
            const centerX = parentFrame.width / 2 - horizontalOffset / 2;
            const centerY = parentFrame.height / 2 - verticalOffset / 2;
            let customActionButton: any = null;

            if (actionButtons.custom) {
              // Create custom action buttons via the operation controller
              const customButtons = gBusinessController.CreateCustomActionButtons(svgEvent, this, 0, this.BlockID);
              if (customButtons) {
                const frameClone = $.extend(true, {}, this.Frame);
                for (let idx = 0; idx < customButtons.length; idx++) {
                  const button = customButtons[idx];
                  button.SetID(OptConstant.ActionArrow.Custom + idx);
                  button.SetUserData(currentBlockId);
                  arrowGroup.AddElement(button);
                  arrowElements.push(button.DOMElement());
                }
              }
            }

            // For left arrow
            if (actionButtons.left) {
              let leftArrow = gBusinessController.CreateActionButton(svgEvent, rightAdjustment, centerY, this.BlockID);
              if (leftArrow == null) {
                // If not created, draw a simple path as fallback
                leftArrow = svgEvent.CreateShape(OptConstant.CSType.Path);
                const pathCreator = leftArrow.PathCreator();
                pathCreator.BeginPath();
                pathCreator.MoveTo(0, centerY);
                pathCreator.LineTo(arrowSizeVertical, centerY - arrowSizeHorizontal / 2);
                pathCreator.LineTo(arrowSizeVertical, centerY + arrowSizeHorizontal / 2);
                pathCreator.LineTo(0, centerY);
                pathCreator.ClosePath();
                pathCreator.Apply();
                leftArrow.SetFillColor("#FF0000");
                leftArrow.SetStrokeWidth(0);
                leftArrow.SetCursor(CursorConstant.CursorType.AddLeft);
              }
              leftArrow.SetID(OptConstant.ActionArrow.Left);
              leftArrow.SetUserData(currentBlockId);
              arrowGroup.AddElement(leftArrow);
              arrowElements.push(leftArrow.DOMElement());
            }
            // For up arrow
            if (actionButtons.up) {
              let upArrow = gBusinessController.CreateActionButton(svgEvent, centerX, topAdjustment, this.BlockID);
              if (upArrow == null) {
                upArrow = svgEvent.CreateShape(OptConstant.CSType.Path);
                const pathCreator = upArrow.PathCreator();
                pathCreator.BeginPath();
                pathCreator.MoveTo(centerX, 0);
                pathCreator.LineTo(centerX - arrowSizeHorizontal / 2, arrowSizeVertical);
                pathCreator.LineTo(centerX + arrowSizeHorizontal / 2, arrowSizeVertical);
                pathCreator.LineTo(centerX, 0);
                pathCreator.ClosePath();
                pathCreator.Apply();
                upArrow.SetFillColor("#FFD64A");
                upArrow.SetStrokeWidth(0);
                upArrow.SetCursor(CursorConstant.CursorType.AddUp);
              }
              upArrow.SetID(OptConstant.ActionArrow.Up);
              upArrow.SetUserData(currentBlockId);
              arrowGroup.AddElement(upArrow);
              arrowElements.push(upArrow.DOMElement());
            }
            // For right arrow
            if (actionButtons.right) {
              let rightArrow = gBusinessController.CreateActionButton(svgEvent, parentFrame.width - rightAdjustment, centerY, this.BlockID);
              if (rightArrow == null) {
                rightArrow = svgEvent.CreateShape(OptConstant.CSType.Path);
                const pathCreator = rightArrow.PathCreator();
                pathCreator.BeginPath();
                pathCreator.MoveTo(parentFrame.width, centerY);
                pathCreator.LineTo(parentFrame.width - arrowSizeVertical, centerY - arrowSizeHorizontal / 2);
                pathCreator.LineTo(parentFrame.width - arrowSizeVertical, centerY + arrowSizeHorizontal / 2);
                pathCreator.LineTo(parentFrame.width, centerY);
                pathCreator.ClosePath();
                pathCreator.Apply();
                rightArrow.SetFillColor("#FFD64A");
                rightArrow.SetStrokeWidth(0);
                rightArrow.SetCursor(CursorConstant.CursorType.ADD_RIGHT);
              }
              rightArrow.SetID(OptConstant.ActionArrow.Right);
              rightArrow.SetUserData(currentBlockId);
              arrowGroup.AddElement(rightArrow);
              arrowElements.push(rightArrow.DOMElement());
            }
            // For down arrow
            if (actionButtons.down) {
              let downArrow = gBusinessController.CreateActionButton(svgEvent, centerX, parentFrame.height - topAdjustment, this.BlockID);
              if (downArrow == null) {
                downArrow = svgEvent.CreateShape(OptConstant.CSType.Path);
                const pathCreator = downArrow.PathCreator();
                pathCreator.BeginPath();
                pathCreator.MoveTo(centerX, parentFrame.height);
                pathCreator.LineTo(centerX - arrowSizeHorizontal / 2, parentFrame.height - arrowSizeVertical);
                pathCreator.LineTo(centerX + arrowSizeHorizontal / 2, parentFrame.height - arrowSizeVertical);
                pathCreator.LineTo(centerX, parentFrame.height);
                pathCreator.ClosePath();
                pathCreator.Apply();
                downArrow.SetFillColor("#FFD64A");
                downArrow.SetStrokeWidth(0);
                downArrow.SetCursor(CursorConstant.CursorType.AddDown);
              }
              downArrow.SetID(OptConstant.ActionArrow.Down);
              downArrow.SetUserData(currentBlockId);
              arrowGroup.AddElement(downArrow);
              arrowElements.push(downArrow.DOMElement());
            }
            arrowGroup.SetSize(parentFrame.width, parentFrame.height);
            arrowGroup.SetPos(parentFrame.x, parentFrame.y);
            if (gBusinessController.RotateActionButtons()) {
              arrowGroup.SetRotation(this.RotationAngle);
            }
            T3Gv.opt.svgOverlayLayer.AddElement(arrowGroup);

            // Set up event handlers for the arrow elements
            const arrowClickHandler = function (evt: any) {
              Utils2.StopPropagationAndDefaults(evt);
              const overlayElement = T3Gv.opt.svgOverlayLayer.FindElementByDOMElement(evt.currentTarget);
              if (overlayElement) {
                const targetForEvt = overlayElement.GetTargetForEvent(evt);
                if (targetForEvt) {
                  const targetId = targetForEvt.GetID();
                  const userData = overlayElement.GetUserData();
                  const targetObj = DataUtil.GetObjectPtr(userData, false);
                  if (targetObj && targetObj instanceof BaseDrawObject && targetId != null && userData != null) {
                    gBusinessController.ActionClick(evt, userData, targetId, null);
                  }
                }
              }
            };
            const arrowDragstartHandler = function (evt: any) {
              if (LMEvtUtil.IsWheelClick(evt) || T3Constant.DocContext.SpacebarDown) {
                Evt_WorkAreaHammerDragStart(evt);
                Utils2.StopPropagationAndDefaults(evt);
                return false;
              }
              let temporaryElem;
              if (T3Constant.DocContext.HTMLFocusControl &&
                T3Constant.DocContext.HTMLFocusControl.blur) {
                T3Constant.DocContext.HTMLFocusControl.blur();
              }
              SDUI.Commands.MainController.Dropdowns.HideAllDropdowns();
              const overlayElement = T3Gv.opt.svgOverlayLayer.FindElementByDOMElement(evt.currentTarget);
              if (overlayElement) {
                const targetForEvt = overlayElement.GetTargetForEvent(evt);
                if (targetForEvt) {
                  const targetId = targetForEvt.GetID();
                  const userData = overlayElement.GetUserData();
                  const targetObj = DataUtil.GetObjectPtr(userData, false);
                  if (!(targetObj && targetObj instanceof BaseDrawObject)) return false;
                  switch (targetId) {
                    case OptConstant.ActionArrow.Up:
                      gBusinessController.AddAbove(evt, userData);
                      break;
                    case OptConstant.ActionArrow.Left:
                      gBusinessController.AddLeft(evt, userData);
                      break;
                    case OptConstant.ActionArrow.Down:
                      gBusinessController.AddBelow(evt, userData);
                      break;
                    case OptConstant.ActionArrow.Right:
                      gBusinessController.AddRight(evt, userData);
                      break;
                    default:
                      if (targetId >= OptConstant.ActionArrow.Custom) {
                        gBusinessController.AddCustom(evt, userData, targetId - OptConstant.ActionArrow.Custom);
                      }
                  }
                  return false;
                }
              }
            };
            const arrowMouseOutHandler = function (evt: any) {
              T3Gv.opt.SetActionArrowTimer(currentBlockId);
            };
            const arrowMouseOverHandler = function (evt: any) {
              T3Gv.opt.ClearActionArrowTimer(currentBlockId);
            };

            // Attach event handlers using Hammer.js to all arrow elements
            for (let idx = 0; idx < arrowElements.length; idx++) {
              const arrowDomElem = arrowElements[idx];
              const hammerInstance = Hammer(arrowDomElem);
              hammerInstance.on('dragstart', arrowDragstartHandler);
              hammerInstance.on('click', arrowClickHandler);
              arrowDomElem.onmouseout = arrowMouseOutHandler;
              arrowDomElem.onmouseover = arrowMouseOverHandler;
            }
            rolloverElement.svgObj.mouseout(() => {
              T3Gv.opt.SetActionArrowTimer(currentBlockId);
              self.SetRuntimeEffects(false);
              self.ClearCursors();
              T3Gv.opt.curHiliteShape = -1;
            });
          }
        }
      } else {
        // If no custom action buttons available, delegate to base rollover method
        super.SetRolloverActions(svgEvent, rolloverElement);
      }
    }
    T3Util.Log("S.BaseShape - SetRolloverActions output:", "Completed rollover actions setup");
  }

  UseEdges(isHorizontalExplicit: boolean, isVerticalExplicit: boolean, horizontalCondition: boolean, verticalCondition: boolean, oldPoint: { x: number; y: number }, newPoint: { x: number; y: number }): boolean {
    T3Util.Log("S.ArcSegmentedLine - UseEdges input:", {
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
      DataUtil.GetObjectPtr(this.BlockID, true);
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
        this.SetSize(newWidth, newHeight, OptConstant.ActionTriggerType.LineLength);
        if (this.objecttype === NvConstant.FNObjectTypes.Annotation) {
          // For annotation, adjust the vertical offset
          offsetY = frameBottom - (this.Frame.y + this.Frame.height);
          offsetX = 0;
          if (offsetX || offsetY) {
            this.OffsetShape(offsetX, offsetY);
          }
        }
      }
      DataUtil.AddToDirtyList(this.BlockID);
      T3Util.Log("S.ArcSegmentedLine - UseEdges output:", true);
      return true;
    }
    T3Util.Log("S.ArcSegmentedLine - UseEdges output:", false);
    return false;
  }

  PrUpdateExtra(extraAmount: number): void {
    // Log input parameters with prefix "S.BaseShape"
    T3Util.Log("S.BaseShape - prUpdateExtra input:", { extraAmount, currentBlockId: this.BlockID });

    const currentBlockId = this.BlockID;
    const containerShape = DataUtil.GetObjectPtr(this.hooks[0].objid, true);

    if (containerShape && containerShape instanceof Instance.Shape.ShapeContainer) {
      const containerList = containerShape.ContainerList;

      // Only process if container list is not sparse
      if (!(containerList.flags & NvConstant.ContainerListFlags.Sparse)) {
        const listLength = containerList.List.length;

        for (let index = 0; index < listLength; index++) {
          if (containerList.List[index].id === currentBlockId) {
            // Update extra amount for the matching container entry
            containerList.List[index].extra += extraAmount;
            if (containerList.List[index].extra < 0) {
              containerList.List[index].extra = 0;
            }
            // Update link flag for containerShape and mark it as an object type
            OptCMUtil.SetLinkFlag(containerShape.BlockID, DSConstant.LinkFlags.Move);
            containerShape.flags = Utils2.SetFlag(containerShape.flags, NvConstant.ObjFlags.Obj1, true);

            // Log output with updated extra value and return
            T3Util.Log("S.BaseShape - prUpdateExtra output:", { updatedExtra: containerList.List[index].extra });
            return;
          }
        }
      }
    }

    // Log if no update was performed
    T3Util.Log("S.BaseShape - prUpdateExtra output: no update performed");
  }

  PrGetAdjustShapeList(): { list: number[]; svglist: number[]; framelist: any[]; oldextra: number; arrangement: any } | null {
    T3Util.Log("S.ArcSegmentedLine - PrGetAdjustShapeList input:");

    let idList: number[] = [];
    let svgIdList: number[] = [];
    let frameList: any[] = [];
    let oldExtra = 0;
    let foundInList = false;

    const addShape = function (shapeId: number): void {
      const shapeObject = DataUtil.GetObjectPtr(shapeId, false);
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
      const containerShape = DataUtil.GetObjectPtr(this.hooks[0].objid, false);

      // Check if containerShape is an instance of Instance.Shape.ShapeContainer
      if (containerShape && containerShape instanceof Instance.Shape.ShapeContainer) {
        const containerList = containerShape.ContainerList;
        if (!(containerList.flags & NvConstant.ContainerListFlags.Sparse)) {
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
          T3Util.Log("S.ArcSegmentedLine - PrGetAdjustShapeList output:", {
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

    T3Util.Log("S.ArcSegmentedLine - PrGetAdjustShapeList output: null");
    return null;
  }

  OnDisconnect(
    elementId: string,
    container: any,
    disconnectData: any,
    reason: any
  ): void {
    T3Util.Log("S.ArcSegmentedLine - OnDisconnect input:", { elementId, container, disconnectData, reason });

    if (
      container instanceof Instance.Shape.ShapeContainer &&
      this.zListIndex != null &&
      this.zListIndex >= 0
    ) {
      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(elementId);
      if (svgElement) {
        T3Gv.opt.svgObjectLayer.RemoveElement(svgElement);
        T3Gv.opt.svgObjectLayer.AddElement(svgElement, this.zListIndex);
        this.zListIndex = -1;
      }
    }

    T3Util.Log("S.ArcSegmentedLine - OnDisconnect output: completed");
  }

  /**
   * Handles right-click events on shapes, showing the appropriate context menu based on shape type and state
   *
   * This method processes right-click events by:
   * 1. Converting window coordinates to document coordinates
   * 2. Identifying the clicked object
   * 3. Handling special cases for containers and text elements
   * 4. Selecting the appropriate context menu based on object type and state
   * 5. Displaying the context menu at the click position
   *
   * @param event - The mouse event that triggered the right-click
   * @returns {boolean} False if the event should not propagate further, undefined otherwise
   */
  RightClick(event) {
    T3Util.Log("= S.BaseShape - RightClick input:", event);

    // Convert window coordinates to document coordinates
    const documentCoords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      event.gesture.center.clientX,
      event.gesture.center.clientY
    );

    // Get references to constants and find the clicked SVG element
    const shapeTypes = OptConstant.ShapeType;
    const svgElement = T3Gv.opt.svgObjectLayer.FindElementByDOMElement(event.currentTarget);
    let elementId = svgElement.GetID();

    // Get the object that was clicked
    let clickedObject = DataUtil.GetObjectPtr(elementId, false);

    if (clickedObject && clickedObject instanceof BaseDrawObject) {
      // Special handling for shape containers
      if (clickedObject && clickedObject.objecttype === NvConstant.FNObjectTypes.ShapeContainer) {
        if (SDUI.AppSettings.Application === SDUI.Resources.Application.Builder) {
          SelectUtil.SelectObjectFromClick(event, svgElement);
          SDUI.Resources.DocumentContext.CurrentContainerList = clickedObject.ContainerList;

          // Setup right click parameters
          T3Gv.opt.rClickParam = new RightClickMd();
          T3Gv.opt.rClickParam.targetId = svgElement.GetID();
          T3Gv.opt.rClickParam.hitPoint.x = documentCoords.x;
          T3Gv.opt.rClickParam.hitPoint.y = documentCoords.y;
          T3Gv.opt.rClickParam.locked = (this.flags & NvConstant.ObjFlags.Lock) > 0;

          SDUI.Commands.MainController.ShowContextualMenu(
            SDUI.Resources.Controls.ContextMenus.BuilderSmartContainer.Id.toLowerCase(),
            event.gesture.center.clientX,
            event.gesture.center.clientY
          );


          return;
        }
      }

      // Try to select the object from click event
      if (!SelectUtil.SelectObjectFromClick(event, svgElement)) {
        return false;
      }

      // Handle read-only documents
      if (T3Gv.docUtil.IsReadOnly()) {
        T3Gv.opt.rClickParam = new RightClickMd();
        T3Gv.opt.rClickParam.targetId = svgElement.GetID();
        T3Gv.opt.rClickParam.hitPoint.x = documentCoords.x;
        T3Gv.opt.rClickParam.hitPoint.y = documentCoords.y;
        T3Gv.opt.rClickParam.locked = (this.flags & NvConstant.ObjFlags.Lock) > 0;

        QuasarUtil.ShowContextMenu(true);
        return false;
      }

      // Get active table and check if current shape has a table
      const currentElementId = svgElement.GetID();
      const targetElementId = svgElement.GetTargetForEvent(event).GetID();
      let isTableLocked = false;

      clickedObject = DataUtil.GetObjectPtr(currentElementId, false);

      if (clickedObject) {
        // Check if one-click text edit is enabled
        const isOneClickText = (clickedObject.TextFlags & NvConstant.TextFlags.OneClick) > 0 &&
          targetElementId !== OptConstant.SVGElementClass.Slop;

        let canEditText = isOneClickText;
        if (clickedObject.AllowTextEdit() || (canEditText = false)) {

          // Check if text object exists or one-click text is enabled
          if (clickedObject.GetTextObject(event, true) >= 0 || canEditText) {
            const textElement = svgElement.textElem;
            let spellCheckIndex = -1;

            if (textElement || canEditText) {
              if (textElement) {
                spellCheckIndex = textElement.GetSpellAtLocation(
                  event.gesture.center.clientX,
                  event.gesture.center.clientY
                );
              }

              if (spellCheckIndex >= 0 || canEditText) {
                TextUtil.ActivateTextEdit(svgElement, event, true);
              }
            }
          }
        }
      }

      // Setup right-click parameters
      T3Gv.opt.rClickParam = new RightClickMd();
      T3Gv.opt.rClickParam.targetId = svgElement.GetID();
      T3Gv.opt.rClickParam.hitPoint.x = documentCoords.x;
      T3Gv.opt.rClickParam.hitPoint.y = documentCoords.y;
      T3Gv.opt.rClickParam.locked = (this.flags & NvConstant.ObjFlags.Lock) > 0;

      // Handle active text editor
      const activeTextEdit = TextUtil.GetActiveTextEdit();
      if (activeTextEdit != null) {
        const textEditor = T3Gv.opt.svgDoc.GetActiveEdit();
        let spellCheckIndex = -1;
        const selectedRange = textEditor.GetSelectedRange();
        const contextMenu = this.HasFieldData() ?
          SDUI.Resources.Controls.ContextMenus.TextMenuData :
          SDUI.Resources.Controls.ContextMenus.TextMenu;

        if (textEditor) {
          spellCheckIndex = textEditor.GetSpellAtLocation(
            event.gesture.center.clientX,
            event.gesture.center.clientY
          );
        }

        // Show appropriate menu based on context
        if (spellCheckIndex >= 0) {
          T3Gv.opt.svgDoc.GetSpellCheck().ShowSpellMenu(
            textEditor,
            spellCheckIndex,
            event.gesture.center.clientX,
            event.gesture.center.clientY
          );
        } else if (selectedRange.end > selectedRange.start) {
          SDUI.Commands.MainController.ShowContextualMenu(
            contextMenu.Id.toLowerCase(),
            event.gesture.center.clientX,
            event.gesture.center.clientY
          );
        } else if (this.objecttype === NvConstant.FNObjectTypes.UIElement) {
          SDUI.Commands.MainController.ShowContextualMenu(
            SDUI.Resources.Controls.ContextMenus.Wireframe.Id.toLowerCase(),
            event.gesture.center.clientX,
            event.gesture.center.clientY
          );
        } else if (this.objecttype === NvConstant.FNObjectTypes.GanttChart) {
          SDUI.Commands.MainController.ShowContextualMenu(
            SDUI.Resources.Controls.ContextMenus.Gantt.Id.toLowerCase(),
            event.gesture.center.clientX,
            event.gesture.center.clientY
          );
        } else {
          SDUI.Commands.MainController.ShowContextualMenu(
            contextMenu.Id.toLowerCase(),
            event.gesture.center.clientX,
            event.gesture.center.clientY
          );
        }
      }
      else {
        T3Gv.opt.rClickParam.targetId = elementId;

        // Get the object associated with the element
        clickedObject = DataUtil.GetObjectPtr(elementId, false);

        // Show appropriate context menu based on object type
        switch (clickedObject.objecttype) {
          case NvConstant.FNObjectTypes.D3Symbol:
            switch (clickedObject.codeLibID) {
              case "RadialGauge":
              case "LinearGauge":
                SDUI.Commands.MainController.ShowContextualMenu(
                  SDUI.Resources.Controls.ContextMenus.Gauge.Id.toLowerCase(),
                  event.gesture.center.clientX,
                  event.gesture.center.clientY
                );
                break;
              case "BarChart":
              case "PieChart":
              case "LineChart":
              case "SankeyChart":
                SDUI.Commands.MainController.ShowContextualMenu(
                  SDUI.Resources.Controls.ContextMenus.Graph.Id.toLowerCase(),
                  event.gesture.center.clientX,
                  event.gesture.center.clientY
                );
                break;
            }
            break;
          case NvConstant.FNObjectTypes.UIElement:
            SDUI.Commands.MainController.ShowContextualMenu(
              SDUI.Resources.Controls.ContextMenus.Wireframe.Id.toLowerCase(),
              event.gesture.center.clientX,
              event.gesture.center.clientY
            );
            break;
          case NvConstant.FNObjectTypes.BPMNActivity:
            SDUI.Commands.MainController.ShowContextualMenu(
              SDUI.Resources.Controls.ContextMenus.BPMN_Activity.Id.toLowerCase(),
              event.gesture.center.clientX,
              event.gesture.center.clientY
            );
            break;
          case NvConstant.FNObjectTypes.BPMNEventStart:
          case NvConstant.FNObjectTypes.BPMNEventIntermediate:
          case NvConstant.FNObjectTypes.BPMNEventEnd:
          case NvConstant.FNObjectTypes.BPMNEventStartNI:
          case NvConstant.FNObjectTypes.BPMNEventIntermediateNI:
          case NvConstant.FNObjectTypes.BPMNEventIntermediateThrow:
            gLineDrawBPMNEventManager.GetLineRightClickMenuID(clickedObject.objecttype);
            SDUI.Commands.MainController.ShowContextualMenu(
              SDUI.Resources.Controls.ContextMenus.BPMN_Event.Id.toLowerCase(),
              event.gesture.center.clientX,
              event.gesture.center.clientY
            );
            break;
          case NvConstant.FNObjectTypes.BPMNGateway:
            SDUI.Commands.MainController.ShowContextualMenu(
              SDUI.Resources.Controls.ContextMenus.BPMN_Gateway.Id.toLowerCase(),
              event.gesture.center.clientX,
              event.gesture.center.clientY
            );
            break;
          case NvConstant.FNObjectTypes.BPMNDataObject:
            SDUI.Commands.MainController.ShowContextualMenu(
              SDUI.Resources.Controls.ContextMenus.BPMN_Data.Id.toLowerCase(),
              event.gesture.center.clientX,
              event.gesture.center.clientY
            );
            break;
          case NvConstant.FNObjectTypes.BPMNChoreography:
            SDUI.Commands.MainController.ShowContextualMenu(
              SDUI.Resources.Controls.ContextMenus.BPMN_Choreo.Id.toLowerCase(),
              event.gesture.center.clientX,
              event.gesture.center.clientY
            );
            break;
          case NvConstant.FNObjectTypes.SwimLaneCols:
          case NvConstant.FNObjectTypes.SwimLaneRows:
          case NvConstant.FNObjectTypes.SwimLaneGrid:
            SDUI.Commands.MainController.ShowContextualMenu(
              SDUI.Resources.Controls.ContextMenus.Swimlane.Id.toLowerCase(),
              event.gesture.center.clientX,
              event.gesture.center.clientY
            );
            break;
          case NvConstant.FNObjectTypes.FrameContainer:
            SDUI.Commands.MainController.ShowContextualMenu(
              SDUI.Resources.Controls.ContextMenus.Frame.Id.toLowerCase(),
              event.gesture.center.clientX,
              event.gesture.center.clientY
            );
            break;
          case NvConstant.FNObjectTypes.Multiplicity:
            SDUI.Commands.MainController.ShowContextualMenu(
              SDUI.Resources.Controls.ContextMenus.Multiplicity.Id.toLowerCase(),
              event.gesture.center.clientX,
              event.gesture.center.clientY
            );
            break;
          case NvConstant.FNObjectTypes.ShapeContainer:
            if (SDUI.AppSettings.Application === SDUI.Resources.Application.Builder) {
              SDUI.Commands.MainController.ShowContextualMenu(
                SDUI.Resources.Controls.ContextMenus.SmartContainer.Id.toLowerCase(),
                event.gesture.center.clientX,
                event.gesture.center.clientY
              );
              break;
            }
          default:
            // Handle specific shape types
            switch (clickedObject.ShapeType) {
              case shapeTypes.RECTANGLE:
              case shapeTypes.ROUNDED_RECTANGLE:
                if (clickedObject.ImageURL && clickedObject.ImageURL.length ||
                  clickedObject.EMFHash && clickedObject.EMFHash.length) {
                  SDUI.Commands.MainController.ShowContextualMenu(
                    SDUI.Resources.Controls.ContextMenus.Default.Id.toLowerCase(),
                    event.gesture.center.clientX,
                    event.gesture.center.clientY
                  );
                } else {
                  SDUI.Commands.MainController.ShowContextualMenu(
                    SDUI.Resources.Controls.ContextMenus.RectContextMenu.Id.toLowerCase(),
                    event.gesture.center.clientX,
                    event.gesture.center.clientY
                  );
                }
                break;
              default:
                UIUtil.ShowContextMenu(true, "default", event.gesture.center.clientX, event.gesture.center.clientY);

                // Log context menu display
                T3Util.Log("S.BaseShape - RightClick: Displayed Quasar context menu");
            }
        }
      }
    }
  }
}

export default BaseShape
