
/**
 * Provides a centralized collection of constant values used throughout the application.
 *
 * This class aggregates various constant definitions including:
 * - Text editor operation codes and growth behavior.
 * - Ruler units, fill types, color definitions, and style defaults.
 * - Graph types, flags, and axis configurations for graphical representations.
 * - Dimensions and hop configurations for layout details.
 * - Layer flags, types, container arrangements, and editing states.
 * - Geometric constants, object and text flags along with image scaling modes.
 * - Additional configuration options such as list codes, hit testing, hook flags,
 *   session flags, and extra types for UI components.
 *
 * @remarks
 * The constants in this class are used to ensure consistency across various parts of the
 * application. They help standardize behaviors in text editing, graphic rendering, object
 * management, and UI layout by providing well-defined values.
 *
 * @example
 * // Accessing a text editor operation code:
 * const lastOp = NvConstant.TextElemLastOpt.Paste;
 *
 * // Setting a ruler unit for measurement:
 * const unit = NvConstant.RulerUnit.Inches;
 *
 * // Using a color to define a UI element:
 * const primaryColor = NvConstant.Colors.Hilite;
 *
 * // Enabling layer-related behavior:
 * const layerVisible = Boolean(NvConstant.LayerFlags.Visible);
 *
 * // Applying an object flag during a hit test:
 * if (hitCode === NvConstant.HitCodes.Inside) {
 *   console.log("User clicked inside the object");
 * }
 *
 * @public
 */
class NvConstant {

  /**
   * Text editor last operation codes
   * Tracks the last operation performed in text editing components
   */
  static TextElemLastOpt = {
    Init: -1,         // Initial state
    Char: 0,          // Character input
    BS: 1,            // Backspace
    DEL: 2,           // Delete
    Style: 3,         // Style change
    Cut: 4,           // Cut operation
    Copy: 5,          // Copy operation
    Paste: 6,         // Paste operation
    Select: 7,        // Selection made
    Timeout: 8        // Operation timeout
  }

  /**
   * Ruler unit types for measurement
   * Defines the units used for rulers and measurements
   */
  static RulerUnit = {
    None: 0,          // No units
    Inches: 1,        // Imperial inches
    Feet: 2,          // Imperial feet
    Mm: 3,            // Metric millimeters
    Cm: 4,            // Metric centimeters
    M: 5              // Metric meters
  }

  /**
   * Standard colors used in the application
   * Provides consistent color definitions across the UI
   */
  static Colors = {
    White: '#FFFFFF',
    Black: '#000000',
    Hilite: '#0099FF',   // Highlight color
    Select: '#00FF00',   // Selection color
    Trans: 4294967295,   // Transparent color (special value)
    Gray: '#C0C0C0'
  }

  /**
   * Fill types for shapes and backgrounds
   * Defines how shapes and areas are filled
   */
  static FillTypes = {
    Transparent: 0,      // No fill (transparent)
    Solid: 1,            // Solid color fill
    Gradient: 2,         // Gradient fill
    Texture: 3,          // Texture pattern fill
    Image: 4,            // Image as fill
    RichGradient: 5      // Advanced gradient fill
  }

  /**
   * Graph type definitions
   * Specifies the different types of graphs available
   */
  static GraphType = {
    Unset: -1,           // Not defined
    Bar: 0,              // Bar graph
    StackedBar: 1,       // Stacked bar graph
    Line: 2,             // Line graph
    Pie: 3,              // Pie chart
    LineArpie: 4,        // Combined line and pie chart
    StackedLine: 5       // Stacked line graph
  }

  /**
   * Graph configuration flags
   * Controls behavior and appearance of graphs
   */
  static GraphFlags = {
    SequenceByCategory: 4  // Order graph elements by category
  }

  /**
   * Axis configuration flags
   * Controls appearance and behavior of graph axes
   */
  static AxisFlags = {
    DaxHideMinorTicks: 4,       // Hide minor tick marks
    DaxShowGridLineMajor: 32    // Show major grid lines
  }

  /**
   * Legend type options
   * Defines how legends are displayed in graphs
   */
  static LegendType = {
    DaxLegendFull: 0,       // Complete legend
    DaxLegendNone: 1,       // No legend
    DaxLegendNames: 2,      // Only show names in legend
    DaxLegendSwatches: 3    // Only show color swatches in legend
  }

  /**
   * Horizontal hop dimensions
   * Defines size options for horizontal connection hops
   */
  static HopDimX = [6, 8, 10]

  /**
   * Vertical hop dimensions
   * Defines size options for vertical connection hops
   */
  static HopDimY = [4, 5, 6]

  /**
   * Hop style options
   * Controls the visual appearance of connection hops
   */
  static HopStyle = {
    Box: 0,    // Box-shaped hop
    Arc: 1     // Arc-shaped hop
  }

  /**
   * Dimension display flags
   * Controls how dimensions are displayed
   */
  static DimensionFlags = {
    EndPts: 1,                   // Show endpoint dimensions
    AllSeg: 2,                   // Show all segment dimensions
    Total: 4,                    // Show total dimensions
    Select: 8,                   // Show dimensions when selected
    Always: 16,                  // Always show dimensions
    Area: 32,                    // Show area dimensions
    AreaSel: 64,                 // Show area dimensions when selected
    Standoff: 128,               // Use dimension standoff
    Exterior: 256,               // Show exterior dimensions
    ShowFractionalInches: 512,   // Show fractional inches
    RectWithAndHeight: 1024,     // Show width and height for rectangles
    ShowLineAngles: 2048,        // Show angles for lines
    InteriorAngles: 4096,        // Show interior angles
    HideHookedObjDimensions: 8192, // Hide hooked object dimensions
    ShowFeetAsInches: 16384      // Display feet measurements as inches
  }

  /**
   * Text growth behavior options
   * Controls how text expands when content changes
   */
  static TextGrowBehavior = {
    ProPortional: 0,    // Grow proportionally
    Horizontal: 1,      // Grow horizontally
    Vertical: 2,        // Grow vertically
    FSize: 3            // Adjust font size
  }

  /**
   * Style defaults
   * Default styling options
   */
  static StyleDefaults = {
    Default: 'Style1',    // Default style name
    DefThick: 1,          // Default thickness
    DefFont: 'Arial'      // Default font
  }

  /**
   * Layer visibility and behavior flags
   * Controls how layers operate
   */
  static LayerFlags = {
    Visible: 1,           // Layer is visible
    Active: 2,            // Layer is active
    NoAdd: 4,             // Cannot add to layer
    AllowCellEdit: 8,     // Allow cell editing in layer
    UseEdges: 16          // Use edge snapping in layer
  }

  /**
   * Layer type definitions
   * Categorizes layers by their purpose
   */
  static LayerTypes = {
    None: 0,           // No special type
    WebPage: 4,        // Web page layer
    Background: 7      // Background layer
  }

  /**
   * Layer movement operation types
   * Defines positioning when moving layers
   */
  static LayerMoveType = {
    Bottom: 0,     // Move to bottom
    Before: 1,     // Move before reference
    After: 2,      // Move after reference
    Top: 3         // Move to top
  }

  /**
   * Container list arrangement options
   * Controls how items are arranged in containers
   */
  static ContainerListArrangements = {
    Row: 0,        // Arrange in rows
    Column: 1      // Arrange in columns
  }

  /**
   * Container list behavior flags
   * Controls container list operations
   */
  static ContainerListFlags = {
    AllowOnlyContainers: 1,     // Only container items allowed
    AllowOnlyNonContainers: 2,  // Only non-container items allowed
    Sparse: 4,                  // Allow sparse arrangement
    LeftChanged: 8,             // Left position has changed
    TopChanged: 16,             // Top position has changed
    Adjust: 32                  // Auto-adjust layout
  }

  /**
   * Editor state definitions
   * Tracks the current state of the editor
   */
  static EditState = {
    Default: 1,       // Default editing state
    Stamp: 2,         // Stamp tool active
    Text: 3,          // Text tool active
    FormatPaint: 4,   // Format painter active
    LinkConnect: 5,   // Link connection in progress
    LinkJoin: 6,      // Link join operation
    Edit: 7,          // Edit mode active
    DragControl: 8,   // Dragging control points
    DragShape: 9,     // Dragging shape
    Grab: 10          // Grab tool active
  }

  /**
   * Geometry constants
   * Mathematical constants for geometry calculations
   */
  static Geometry = {
    PI: 3.14159265358979  // Pi constant
  }

  /**
   * Object flags
   * Controls object behavior and appearance
   */
  static ObjFlags = {
    Select: 1,                // Object is selected
    Hide: 2,                  // Object is hidden
    Erase: 4,                 // Object can be erased
    EraseOnGrow: 8,           // Object erases when growing
    Lock: 16,                 // Object is locked
    Bounds: 128,              // Show object bounds
    ImageOnly: 256,           // Object is image only
    TextOnly: 512,            // Object is text only
    Assoc: 8192,              // Object has associations
    Obj1: 16384,              // Object is primary
    ContConn: 32768,          // Container connections
    UseConnect: 131072,       // Use connection points
    DropOnBorder: 262144,     // Allow dropping on border
    DropOnTable: 524288,      // Allow dropping on table
    LineHop: 1048576,         // Line has hops
    LineMod: 2097152,         // Line has modifications
    NoTableLink: 4194304,     // No table linking
    NoLinking: 16777216,      // Disable linking
    NotVisible: 268435456,    // Object is not visible
    NoMaintainLink: 536870912 // Don't maintain links
  }

  /**
   * Text flags
   * Controls text behavior and appearance
   */
  static TextFlags = {
    AttachB: 4,           // Attach bottom
    AttachA: 8,           // Attach all
    None: 16,             // No text flags
    AttachC: 32,          // Attach center
    HorizText: 128,       // Horizontal text
    OneClick: 512,        // One-click text
    FormCR: 2048,         // Form carriage return
    NoSpell: 4096,        // No spell check
    Clickhere: 8192,      // Clickable text
    AttachD: 16384,       // Attach dynamic
    TitleBlock: 32768     // Text is title block
  }

  /**
   * Session flags for additional behavior
   * Controls various session-specific behaviors
   */
  static SessionMoreFlags = {
    NoActionButton: 16,   // Hide action button
    HideLayerTabs: 1024,
  }

  /**
   * Hook flags for connection behavior
   * Controls how objects connect and interact
   */
  static HookFlags = {
    LcShape: 1,              // Hook to shape
    LcLine: 2,               // Hook to line
    LcHOnly: 4,              // Horizontal hooks only
    LcVOnly: 8,              // Vertical hooks only
    LcCHook: 16,             // Center hook
    LcArrayMod: 32,          // Array modification
    LcMoveTarget: 128,       // Move target when hooked
    LcAttachToLine: 256,     // Attach to line
    LcNoSnaps: 512,          // Disable snapping
    LcShapeOnLine: 1024,     // Shape placed on line
    LcAutoInsert: 8192,      // Auto insert on hook
    LcForceEnd: 16384,       // Force to end point
    LcHookNoExtra: 131072,   // No extra hooks
    LcHookReverse: 262144,   // Reverse hook direction
    LcNoContinuous: 524288   // Disable continuous connection
  }

  /**
   * List operation codes
   * Defines what elements to include in list operations
   */
  static ListCodes = {
    CircTarg: 1,             // Circular targets
    MoveTarg: 2,             // Movable targets
    MoveHook: 3,             // Movable hooks
    TargOnly: 4,             // Targets only
    ChildrenOnly: 5,         // Children only
    TopOnly: 6,              // Top level only
    LinesOnly: 7,            // Lines only
    MoveTargAndLines: 8      // Movable targets and lines
  }

  /**
   * Floating point dimension flags
   * Controls which dimensions use floating point precision
   */
  static FloatingPointDim = {
    Width: 16,       // Width uses floating point
    Height: 32       // Height uses floating point
  }

  /**
   * Hit testing codes
   * Identifies what was hit during mouse interaction
   */
  static HitCodes = {
    Border: 40,       // Object border hit
    Inside: 41,       // Inside object hit
    PLApp: 73,        // Application area hit
    InContainer: 101  // Container area hit
  }

  /**
   * Guide distance types
   * Defines measurement types for guides
   */
  static Guide_DistanceTypes = {
    Room: 1,                // Room distance
    Horizontal_Wall: 2,     // Horizontal wall distance
    Vertical_Wall: 3,       // Vertical wall distance
    PolyWall: 4             // Polygonal wall distance
  }

  /**
   * Segment line direction constants
   * Defines standard directions for line segments
   */
  static SegLDir = {
    Ktc: 5,      // Top center
    Kbc: 6,      // Bottom center
    Klc: 7,      // Left center
    Krc: 8       // Right center
  }

  /**
   * Object type definitions
   * Categorizes objects by their functional type
   */
  static FNObjectTypes = {
    None: 0,                  // No type
    PictContainer: 1,         // Picture container
    Frame: 2,                 // Frame object
    CauseEffectMain: 9,       // Cause-effect diagram main element
    FlWall: 16,               // Floor wall
    Annotation: 32,           // Annotation
    UiElement: 33,            // UI element
    NgEvent: 35,              // Event object
    NgEventLabel: 36,         // Event label
    D3Symbol: 37,             // 3D symbol
    Multiplicity: 39,         // Multiplicity indicator
    ShapeContainer: 55,       // Shape container
    FrameContainer: 75,       // Frame container
    ExtraTextLable: 80        // Extra text label
  }

  /**
   * Object subtype definitions
   * Further classifies objects within their main type
   */
  static ObjectSubTypes = {
    SubtMultiplicityFilpped: 80  // Flipped multiplicity indicator
  }

  /**
   * Image scaling modes
   * Controls how images are scaled when resized
   */
  static ImageScales = {
    AlwaysFit: 0,     // Always fit image to container
    CropToFit: 1,     // Crop image to fit container
    PropFit: 2        // Maintain proportions when fitting
  }

  /**
   * Shape class definitions
   * Categorizes shapes by their implementation type
   */
  static ShapeClass = {
    Plain: 1,               // Basic shape
    GroupSymbol: 2,         // Group of symbols
    SvgSymbol: 3,           // SVG symbol
    SvgFragmentSymbol: 4,   // SVG fragment
    MissingMf: 5            // Missing metadata format
  }
}

export default NvConstant
