
/**
 * A comprehensive repository of constant definitions used for canvas drawing and object manipulation.
 *
 * @remarks
 * The OptConstant class serves as a centralized location for various enumerated constants
 * that govern the behavior of a drawing/graphic engine. It includes definitions such as:
 *
 * - Canvas shape type identifiers (via CSType and ShapeType) for distinguishing among different
 *   drawing elements like Rectangles, Circles, Text, and Images.
 * - Event behavior constants that determine how interaction events are propagated (e.g., Normal,
 *   Inside, Outside, Hidden, etc.).
 * - Export format types (PNG, SVG, JPEG) for saving or transferring drawings.
 * - Various line and segment type definitions (LineTypes, LineType, SVGPathSeg) that are essential
 *   for rendering different line styles and curves.
 * - System-wide measurement and layout parameters (Common) including maximum dimensions, conversion
 *   factors, and default styling properties.
 * - Flags and type identifiers for additional object behaviors (ObjMoreFlags, ExtraFlags, etc.).
 * - Connector, session, and action trigger identifiers that support manipulation and interactivity
 *   within diagrams.
 *
 * These constants are designed to ensure consistency in configuration and behavior, making it
 * easier to develop and maintain complex drawing applications.
 *
 * @example
 * Accessing and using some constants defined in the OptConstant class:
 *
 * // Retrieve a canvas shape type constant for a rectangle
 * const rectType = OptConstant.CSType.Rect;
 * console.log("Rectangle type identifier:", rectType);
 *
 * // Determine the event behavior for a shape
 * const eventBehavior = OptConstant.EventBehavior.Normal;
 * console.log("Normal event behavior:", eventBehavior);
 *
 * // Use an export format constant
 * const exportFormat = OptConstant.ExportType.PNG;
 * if (exportFormat === OptConstant.ExportType.PNG) {
 *   console.log("Exporting drawing as PNG image.");
 * }
 *
 * // Example: Using a system-wide measurement constant
 * const maxCanvasDimension = OptConstant.Common.DimMax;
 * console.log("Maximum canvas dimension allowed:", maxCanvasDimension);
 *
 * @public
 */
class OptConstant {

  /**
   * Canvas shape type identifiers
   * Used to identify different shape types in the rendering system
   */
  static CSType = {
    Rect: 1,               // Rectangle
    RRect: 2,              // Rounded Rectangle
    Oval: 3,               // Oval/Circle
    Line: 4,               // Line
    Polyline: 5,           // Multi-segment line
    Polygon: 6,            // Closed polygon
    Path: 7,               // SVG path
    Text: 8,               // Text element
    Image: 9,              // Image element
    Group: 10,             // Group of shapes
    Layer: 11,             // Layer container
    Symbol: 12,            // Symbol instance
    PolylineContainer: 13, // Container for polylines
    PolyPolyline: 14,      // Multiple polylines
    ShapeCopy: 15,         // Copy of another shape
    ShapeContainer: 16     // Container for shapes
  }

  /**
   * Shape type string identifiers
   * Used for shape creation and identification
   */
  static ShapeType = {
    Rect: 'Rect',                           // Rectangle shape
    RRect: 'RRect',                         // Rounded rectangle shape
    Oval: 'Oval',                           // Oval/Circle shape
    Polygon: 'Polygon',                     // Polygon shape
    VectorSymbol: 'VectorSymbol',           // Vector-based symbol
    BitmapSymbol: 'BitmapSymbol',           // Bitmap/raster symbol
    GroupSymbol: 'GroupSymbol',             // Group of symbols
    SVGFragmentSymbol: 'SVGFragmentSymbol', // SVG fragment as symbol
    D3Symbol: 'D3Symbol'                    // 3D symbol
  }

  /**
   * Event behavior constants
   * Controls how events are processed for shapes
   */
  static EventBehavior = {
    Normal: 'visiblePainted',       // Normal event processing
    Inside: 'visibleFill',          // Events inside the shape
    Outside: 'visibleStroke',       // Events on the shape outline
    ALL: 'visible',                 // All events
    Hidden: 'painted',              // Events on hidden elements
    HiddenIn: 'fill',              // Events on hidden fills
    HiddenOut: 'stroke',           // Events on hidden strokes
    HiddenAll: 'all',              // All events including hidden
    None: 'none'                    // No events
  }

  /**
   * Export type formats
   * Used when exporting drawings to different formats
   */
  static ExportType = {
    None: 0,    // No export
    PNG: 2,     // PNG image format
    SVG: 3,     // SVG vector format
    JPEG: 13,   // JPEG image format
  }

  /**
   * Line type definitions
   * Specifies different types of lines
   */
  static LineTypes = {
    LsNone: 0,           // No line
    LsComm: 1,           // Common line
    LsDigi: 2,           // Digital line
    LsChord: 3,          // Chord line
    LsWall: 4,           // Wall line
    LsMeasuringTape: 5   // Measuring tape line
  }

  /**
   * SVG path segment types
   * Defines types of segments in SVG paths as per SVG spec
   */
  static SVGPathSeg = {
    PATHSEG_UNKNOWN: 0,                     // Unknown segment type
    PATHSEG_CLOSEPATH: 1,                   // Close path command (Z)
    PATHSEG_MOVETO_ABS: 2,                  // Move to absolute (M)
    PATHSEG_MOVETO_REL: 3,                  // Move to relative (m)
    PATHSEG_LINETO_ABS: 4,                  // Line to absolute (L)
    PATHSEG_LINETO_REL: 5,                  // Line to relative (l)
    PATHSEG_CURVETO_CUBIC_ABS: 6,           // Cubic bezier absolute (C)
    PATHSEG_CURVETO_CUBIC_REL: 7,           // Cubic bezier relative (c)
    PATHSEG_CURVETO_QUADRATIC_ABS: 8,       // Quadratic bezier absolute (Q)
    PATHSEG_CURVETO_QUADRATIC_REL: 9,       // Quadratic bezier relative (q)
    PATHSEG_ARC_ABS: 10,                    // Arc absolute (A)
    PATHSEG_ARC_REL: 11,                    // Arc relative (a)
    PATHSEG_LINETO_HORIZONTAL_ABS: 12,      // Horizontal line absolute (H)
    PATHSEG_LINETO_HORIZONTAL_REL: 13,      // Horizontal line relative (h)
    PATHSEG_LINETO_VERTICAL_ABS: 14,        // Vertical line absolute (V)
    PATHSEG_LINETO_VERTICAL_REL: 15,        // Vertical line relative (v)
    PATHSEG_CURVETO_CUBIC_SMOOTH_ABS: 16,   // Smooth cubic bezier absolute (S)
    PATHSEG_CURVETO_CUBIC_SMOOTH_REL: 17,   // Smooth cubic bezier relative (s)
    PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS: 18, // Smooth quadratic bezier absolute (T)
    PATHSEG_CURVETO_QUADRATIC_SMOOTH_REL: 19  // Smooth quadratic bezier relative (t)
  }

  /**
   * Line type identifiers
   * Defines various types of lines in the system
   */
  static LineType = {
    LINE: 1,                 // Simple line
    ARCLINE: 2,              // Arc line
    SEGLINE: 3,              // Segmented line
    ARCSEGLINE: 4,           // Arc segment line
    POLYLINE: 5,             // Multi-segment line
    PARABOLA: 6,             // Parabolic curve
    FREEHAND: 7,             // Freehand drawn line
    NURBS: 501,              // Non-uniform rational B-spline
    NURBSSEG: 502,           // NURBS segment
    ELLIPSE: 503,            // Elliptical line
    ELLIPSEEND: 504,         // Ellipse endpoint
    QUADBEZ: 505,            // Quadratic bezier curve
    QUADBEZCON: 506,         // Quadratic bezier connector
    CUBEBEZ: 507,            // Cubic bezier curve
    CUBEBEZCON: 508,         // Cubic bezier connector
    SPLINE: 509,             // Spline curve
    SPLINECON: 510,          // Spline connector
    MOVETO: 600,             // Move to point
    MOVETO_NEWPOLY: 601      // Move to start new polygon
  }

  /**
   * Arc quadrant identifiers
   * Defines the quadrants for arc positioning
   */
  static ArcQuad = {
    PLA_TL: 0,       // Top-left quadrant
    PLA_BL: 1,       // Bottom-left quadrant
    PLA_BR: 2,       // Bottom-right quadrant
    PLA_TR: 3        // Top-right quadrant
  }

  /**
   * Additional object flags
   * Specifies extended behaviors for objects
   */
  static ObjMoreFlags = {
    FixedRR: 64,             // Fixed rounded rectangle
    Container: 128,          // Container object
    UseInfoNoteIcon: 256,    // Use information note icon
    ContainerChild: 512,     // Child of a container
    AutoContainer: 1024,     // Auto-container
    FrameAllowNesting: 2048, // Allow nested frames
    FrameGroup: 4096         // Frame group
  }

  /**
   * System-wide constants and definitions
   * Contains various measurement values, dimensions and default settings
   */
  static Common = {
    /**
     * Maximum canvas dimension in drawing units
     * Used as a bound for drawing space calculations
     */
    DimMax: 30000,

    /**
     * Metric conversion factor (inches to cm)
     * Used for converting between imperial and metric units
     */
    MetricConv: 2.54,

    /**
     * Dimensions for connection and join points
     * Defines the visual size of different connection elements
     */
    ConnPointDim: 7,
    ConnPointLineDim: 16,
    JoinPointLineDim: 32,

    /**
     * Minimum width for shapes and elements
     * Prevents creation of shapes that are too small to be usable
     */
    MinWidth: 1,

    /**
     * Maximum number of points allowed in a polygon
     * Limits resource usage for complex polygons
     */
    MaxPolyPoints: 100,

    /**
     * Rounding factor for corners and edges
     * Used in calculations for rounded corners
     */
    RoundFactor: 0.292893218,

    /**
     * Maximum value for long integers
     * Used as a boundary in calculations
     */
    LongIntMax: 2147483647,

    /**
     * Constraint flags for movement
     * Controls how objects can be moved or resized
     */
    HorizOnly: 1,
    VertOnly: 2,

    /**
     * Segment dimension constraints
     * Controls minimum sizes for line segments
     */
    SegMinLen: 4,
    SegMinSeg: 4,
    SegDefLen: 25,

    /**
     * Slop values for selection tolerance
     * Determines how close to an object the cursor must be to select it
     */
    Slop: 7,
    SlopShapeExtra: 10,
    ConnectorSlop: 25,
    FlowConnectorSlop: 75,
    FlowRadialSlop: 150,
    FlowConnectorDisp: 50,

    /**
     * Knob sizes for different control points
     * Defines the visual size of handles used to manipulate objects
     */
    KnobSize: 9,
    RKnobSize: 7,
    CKnobSize: 14,

    /**
     * Minimum dimension for shapes
     * Prevents creation of shapes that are too small to be visible
     */
    MinDim: 4,

    /**
     * Prefixes for special elements
     * Used to identify different types of elements in the DOM
     */
    Action: 'act_',
    HitAreas: 'hitareas_',
    GraphTextHit: 'graph_texthit',
    EllipseAxes: 'axes_',

    /**
     * Maximum limits for complex objects
     * Prevents performance issues with overly complex elements
     */
    MaxPolySegs: 500,
    MaxSteps: 100,

    /**
     * Dimension line parameters
     * Controls appearance and positioning of dimension lines
     */
    DimDefaultStandoff: 25,
    DimDefaultNonStandoff: 5,
    DimDefaultTextGap: 3,
    DimLineColor: '#000000',

    /**
     * Coordinate line parameters
     * Controls appearance and positioning of coordinate lines
     */
    CoordinateLineDefaultStandoff: -2.5,
    CoordinateLineDefaultNonStandoff: 0,
    CoordinateLineDefaultTextGap: 3,
    CoordinateLineColor: 'blue',

    /**
     * Object finding parameters
     * Controls sensitivity when searching for objects
     */
    FindObjectMinHitSpot: 5,

    /**
     * Default text margin
     * Defines spacing around text elements
     */
    DefTextMargin: 2,

    /**
     * Text block style identifier
     * Defines the style name for text blocks
     */
    TextBlockStyle: 'Text Block',

    /**
     * Default margin for elements
     * Defines standard margin around elements
     */
    DefMargin: 50,

    /**
     * Special null value for drawing operations
     * Used to represent null or invalid values
     */
    DNull: 4294967295,

    /**
     * Default rounded rectangle parameters
     * Controls roundness of rectangle corners
     */
    DefRRect: 0.2,
    DefFixedRRect: 0.05,

    /**
     * Default shape dimensions
     * Provides standard sizes for newly created shapes
     */
    ShapeWidth: 150,
    ShapeHeight: 75,
    ShapeSquare: 100,

    /**
     * Maximum hops for shape detection
     * Limits the depth of recursion when traversing shapes
     */
    MaxHops: 32,

    /**
     * Maximum working dimensions
     * Defines the bounds of the drawing canvas
     */
    MaxWorkDimX: 320000,
    MaxWorkDimY: 320000,

    /**
     * Tree spacing parameter
     * Controls spacing in tree-like structures
     */
    CITreeSpaceExtra: 16,

    /**
     * Connector icon paths
     * Defines file paths for connector icons
     */
    ConPlusPath: 'plus.svg',
    ConMinusPath: 'minus.svg',
    ConMoveVerticalPath: 'move-vertical.svg',
    ConMoveHorizontalPath: 'move-horizontal.svg',

    /**
     * Floorplan wall opening identifier
     * Unique ID for wall openings in floorplans
     */
    WallOpenId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',

    /**
     * Action arrow dimensions
     * Defines size parameters for action arrows
     */
    ActionArrowSizeH: 20,
    ActionArrowSizeV: 13,

    /**
     * Arrow slop parameters
     * Controls selection tolerance for arrows
     */
    BaseArrowSlop: 7,
    ConnectorArrowSlop: 25,

    /**
     * Minimum side point length
     * Defines minimum length for side points
     */
    MinSidePointLength: 40,

    /**
     * Default ruler major increment
     * Defines spacing for major tick marks on rulers
     */
    DefaultRulerMajor: 100,

    /**
     * Annotation hotspot distance
     * Defines distance for annotation interaction
     */
    AnnoHotDist: 200,

    /**
     * Rounded rectangle fixed dimension
     * Standard size for rounded rectangles
     */
    RRectFixedDim: 100,

    /**
     * Minimum line distance for orientation detection
     * Determines when a line's orientation can be calculated
     */
    MinLineDisDeterminOri: 0.2,

    /**
     * Icon shape offset parameters
     * Controls positioning of icons within shapes
     */
    IconShapeBottomOffset: 2,
    iconShapeRightOffset: 2,

    /**
     * Default layer name
     * Standard name for the first layer in drawings
     */
    DefaultLayerName: 'Layer-1',

    /**
     * Default pen styling parameters
     * Defines standard appearance for pen strokes
     */
    PenStylingDefault: {
      Line: {
        Thickness: 1,
        Paint: {
          Opacity: 1,
          Color: '#000000',
          FillType: 1
        }
      }
    },

    /**
     * Default highlighter styling parameters
     * Defines standard appearance for highlighter strokes
     */
    HighlighterStylingDefault: {
      Line: {
        Thickness: 5,
        Paint: {
          Opacity: 0.35,
          Color: '#FFE536',
          FillType: 1
        }
      }
    },

    MaxTotalLayers: 32
  }

  /**
   * Additional object flag constants
   * Controls special behaviors for objects
   */
  public static ExtraFlags = {
    NoColor: 1,                  // No color
    FlipHoriz: 8,                // Flip horizontally
    FlipVert: 16,                // Flip vertically
    NoRotate: 32,                // Prevent rotation
    SideKnobs: 1048576,          // Show side knobs
    ConnToConn: 2097152,         // Allow connector-to-connector
    NoDelete: 8388608,           // Prevent deletion
    CollapseConn: 134217728,     // Collapsible connector
    DeleteOnUnhook: 2147483648   // Delete when unhooked
  }

  /**
   * Base class identifiers for drawing objects
   * Specifies the fundamental type of a drawing object
   */
  static DrawObjectBaseClass = {
    Shape: 0,       // Basic shape
    Line: 1,        // Line
    Connector: 3    // Connector
  }

  /**
   * Action arrow types
   * Defines different types of action arrows in diagrams
   */
  static ActionArrow = {
    Up: 1,              // Upward arrow
    Left: 2,            // Left arrow
    Down: 3,            // Downward arrow
    Right: 4,           // Right arrow
    Slop: 5,            // Sloped arrow
    Custom: 6,          // Custom arrow
    Enter: 7,           // Enter arrow
    CoManger: 8,       // Co-manager arrow
    Assistant: 9,       // Assistant arrow
    AddParents: 10,     // Add parents arrow
    AddDescendants: 11  // Add descendants arrow
  }

  /**
   * SVG element class identifiers
   * Classifies different types of SVG elements
   */
  static SVGElementClass = {
    Shape: 1,                  // Generic shape
    Slop: 2,                   // Sloped element
    Hatch: 3,                  // Hatching pattern
    Text: 4,                   // Text element
    TextBackground: 5,         // Background for text
    DimText: 6,                // Dimension text
    DimLine: 7,                // Dimension line
    BackgroundImage: 8,        // Background image
    Icon: 9,                   // Icon
    NoteText: 10,              // Note text
    ActionArrow: 11,           // Action arrow
    DimTextNoEdit: 12,         // Non-editable dimension text
    AreaDimLine: 13,           // Area dimension line
    // GraphLine: 14,             // Graph line
    CoordinateLine: 21         // Coordinate line
  }

  /**
   * Content type identifiers
   * Specifies types of content objects
   */
  static ContentType = {
    None: 1,    // No content
    Text: 2,    // Text content
    Table: 3,   // Table content
    // Graph: 4    // Graph content
  }

  /**
   * Growth behavior constants
   * Controls how objects resize
   */
  static GrowBehavior = {
    All: 0,           // Grow in all directions
    Horiz: 1,         // Constrain horizontal growth
    Vertical: 2,      // Constrain vertical growth
    ProPortional: 3   // Maintain proportions
  }

  /**
   * Line orientation constants
   * Defines possible orientations for lines
   */
  static LineOrientation = {
    None: 1,              // No specific orientation
    Horizontal: 2,        // Horizontal line
    Vertical: 3,          // Vertical line
    DiagonalTLRB: 4,      // Diagonal from top-left to bottom-right
    DiagonalTRBL: 5       // Diagonal from top-right to bottom-left
  }

  /**
   * Hit area type constants
   * Defines types of interactive hit areas
   */
  static HitAreaType = {
    ConnCollapse: 1,    // Area to collapse connector
    ConnExpand: 2,      // Area to expand connector
    EditDimText: 3      // Area to edit dimension text
  }

  /**
   * Shape icon type identifiers
   * Defines types of icons that can appear on shapes
   */
  static ShapeIconType = {
    HyperLink: 'HYPERLINK',         // Hyperlink icon
    Notes: 'NOTES',                 // Notes icon
    Attachment: 'ATTACHMENT',       // Attachment icon
    FieldData: 'FIELDDATA',         // Field data icon
    ExpandTable: 'EXPANDTABLE',     // Expand table icon
    CollapseTable: 'COLLAPSETABLE', // Collapse table icon
    DataAction: 'DATAACTION',       // Data action icon
    ExpandedView: 'EXPANDEDVIEW',   // Expanded view icon
    Comment: 'COMMENT'              // Comment icon
  }

  /**
   * Action trigger type constants
   * Defines different types of interaction triggers
   */
  static ActionTriggerType = {
    TopLeft: 1,               // Top-left handle
    TopCenter: 2,             // Top-center handle
    TopRight: 3,              // Top-right handle
    CenterRight: 4,           // Center-right handle
    BottomRight: 5,           // Bottom-right handle
    BottomCenter: 6,          // Bottom-center handle
    BottomLeft: 7,            // Bottom-left handle
    CenterLeft: 8,            // Center-left handle
    Rotate: 9,                // Rotate handle
    ModifyShape: 10,          // Shape modification
    LineStart: 11,            // Line start point
    LineEnd: 12,              // Line end point
    AttachPoint: 13,          // Attachment point
    SeglOne: 14,              // Segment line point 1
    SeglTwo: 15,              // Segment line point 2
    SeglThree: 16,            // Segment line point 3
    PolyNode: 17,             // Polyline node
    PolyAdj: 18,              // Polyline adjustment
    PolyEnd: 19,              // Polyline end
    ConnectorHook: 20,        // Connector hook point
    ConnectorRerp: 21,        // Connector perpendicular
    ConnectorAdj: 22,         // Connector adjustment
    MovePolySeg: 23,          // Move polygon segment
    Flip: 24,                 // Flip action
    LineLength: 31,           // Line length adjustment
    SeglPreserve: 32,         // Preserve segment line
    LineThickness: 33,        // Line thickness adjustment
    DimLineAdj: 34,           // Dimension line adjustment
    UpdateLinks: 35,          // Update links
    ContainerAdj: 36          // Container adjustment
  }

  /**
   * Collaborative SVG event type constants
   * Defines events for collaborative editing
   */
  static CollabSVGEventTypes = {
    ObjectMove: 1,        // Object movement
    ShapeGrow: 2,         // Shape resizing
    TableGrowColumn: 3,   // Table column resize
    TextEntry: 4           // Text entry
  }

  /**
   * Line angle dimension definition constants
   * Specifies dimensions for line angle measurements
   */
  static LineAngleDimensionDefs = {
    ArrowHeadSize: 10,              // Size of angle dimension arrowhead
    ArrowHeadWidth: 4,              // Width of angle dimension arrowhead
    PreferredArrowStemMin: 4,  // Minimum arrow stem length
    PreferredBisectorLen: 75       // Preferred bisector length
  }

  /**
   * Array flags
   * Controls behavior of arrays
   */
  static ArrayFlags = {
    LeaveACl: 1,  // Leave array class
    LeaveACr: 1   // Leave array create
  }

  /**
   * Style flags for SEDA objects
   * Controls styling and behavior of SEDA elements
   */
  static AStyles = {
    StartLeft: 1,        // Start from left
    BothSides: 2,        // Apply to both sides
    Stagger: 4,          // Staggered layout
    PerpConn: 8,         // Perpendicular connector
    Linear: 16,          // Linear layout
    Radial: 32,          // Radial layout
    ReverseCol: 64,      // Reverse column order
    EndConn: 128,        // End connector
    MinZero: 256,        // Minimum zero
    CoManager: 512,      // Co-manager
    FlowConn: 1024,      // Flow connector
    GenoConn: 2048,      // Genome connector
    MatchSize: 4096,     // Match size
    MinInvisible: 8192,  // Minimum invisible
    MinOne: 16384,       // Minimum one
    Timeline: 32768      // Timeline layout
  }

  /**
   * Connector definitions and constants
   * Specifies dimensions and behaviors for connectors
   */
  static ConnectorDefines = {
    DefaultHt: 25,         // Default connector height
    DefaultWd: 25,         // Default connector width
    ABk: 0,               // Back alignment
    ACl: 1,               // Center-left alignment
    ACr: 2,               // Center-right alignment
    NSkip: 3,         // Skip nodes
    StubHookPt: -3,        // Stub hook point
    Normal: 0,       // Normal connector
    Above: -2,       // Above connector
    Below: -3,       // Below connector
    Parent: -4       // Parent connector
  }

  /**
   * Session flags
   * Controls behavior of editing session
   */
  static SessionFlags = {
    LLink: 8,                    // Line link
    SLink: 16,                   // Shape link
    AttLink: 256,                // Attachment link
    FreeHand: 1024,              // Freehand drawing mode
    NoTreeOverlap: 2048,         // Prevent tree overlapping
    AllowHops: 4096,             // Allow connector hops
    AutoFormat: 524288,          // Auto-format
    HideConnExpand: 1048576,     // Hide connector expand
    IsFlowChart: 2097152,        // Flowchart mode
    NoStepFormatting: 1073741824 // No step formatting
  }

  /**
   * Content header flags
   * Controls display and behavior of content headers
   */
  static CntHeaderFlags = {
    Pages: 1024,            // Pages with direct access
    NoAuto: 4096,           // No auto direct access
    ShowRulers: 65536,         // Show rulers
    ShowGrid: 131072,          // Show grid
    SnapToGridTL: 262144,      // Snap to grid top-left
    SnapToGridC: 524288,       // Snap to grid center
    SnapToShapesOff: 1048576, // Turn off snap to shapes
    ShowPageDividers: 2097152  // Show page dividers
  }

  /**
   * Hook point identifiers
   * Defines attachment points on shapes
   */
  static HookPts = {
    KTL: 1,         // Top-left knob
    KTR: 2,         // Top-right knob
    KTC: 5,         // Top-center knob
    KBC: 6,         // Bottom-center knob
    KLC: 7,         // Left-center knob
    KRC: 8,         // Right-center knob
    LL: 20,         // Line left
    LR: 21,         // Line right
    LT: 22,         // Line top
    LB: 23,         // Line bottom
    KCTL: 201,      // Center-top-left knob
    KCTR: 202,      // Center-top-right knob
    KCBL: 203,      // Center-bottom-left knob
    KCBR: 204,      // Center-bottom-right knob
    KCT: 205,       // Center-top knob
    KCB: 206,       // Center-bottom knob
    KCL: 207,       // Center-left knob
    KCR: 208,       // Center-right knob
    KCC: 209,       // Center-center knob
    KAT: 220,       // Attach-top knob
    KATD: 221,      // Attach-top-down knob
    AK: 300,        // Auto knob
    AKCT: 305,      // Auto knob center-top
    AKCB: 306,      // Auto knob center-bottom
    AKCL: 307,      // Auto knob center-left
    AKCR: 308,      // Auto knob center-right
    WTL: 321,       // Wall top-left
    WTR: 322,       // Wall top-right
    WBL: 323,       // Wall bottom-left
    WBR: 324,       // Wall bottom-right
    CustomBase: 500 // Base for custom hook points
  }

  /**
   * Line subclass identifiers
   * Specifies different subclasses of lines
   */
  static LineSubclass = {
    LCH: 0,  // Line class horizontal
    LCD: 1,  // Line class diagonal
    LCV: 2   // Line class vertical
  }

  /**
   * Segment line types
   * Defines types of line segments
   */
  static SeglTypes = {
    Line: 0,  // Straight line segment
    Arc: 1    // Arc line segment
  }

  /**
   * Operation types
   * Defines different operation states
   */
  static OptTypes = {
    None: 0,             // No modal operation
    Stamp: 1,            // Stamp operation
    Draw: 2,             // Draw operation
    DragDrop: 3,         // Drag and drop
    StampTextOnTap: 4,   // Stamp text on tap
    AddCorner: 5,        // Add corner
    DrawPolyline: 6,     // Draw polyline
    FormatPainter: 7,    // Format painter
  }

  static GuideDistanceTypes = {
    Room: 1,
    Horizontal_Wall: 2,
    Vertical_Wall: 3,
    PolyWall: 4
  }
}

export default OptConstant
