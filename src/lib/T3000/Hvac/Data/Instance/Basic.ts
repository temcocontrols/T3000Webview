

import Container from "../../Basic/B.Container"
import Effect from "../../Basic/B.Element.Effects"
import Style from "../../Basic/B.Element.Style"
import Element from "../../Basic/B.Element"
import Group from "../../Basic/B.Group"
import Image from "../../Basic/B.Image"
import Layer from "../../Basic/B.Layer"
import Line from "../../Basic/B.Line"
import Oval from "../../Basic/B.Oval"
import Creator from "../../Basic/B.Path.Creator"
import Path from "../../Basic/B.Path"
import Polygon from "../../Basic/B.Polygon"
import PolyLine from "../../Basic/B.PolyLine"
import PolyPolyLine from "../../Basic/B.PolyPolyLine"
import Rect from "../../Basic/B.Rect"
import RRect from "../../Basic/B.RRect"
import ShapeContainer from "../../Basic/B.ShapeContainer"
import ShapeCopy from "../../Basic/B.ShapeCopy"
import Symbol from "../../Basic/B.Symbol"
import Edit from "../../Basic/B.Text.Edit"


/**
 * The Basic object groups together a set of UI component functions that facilitate the creation and manipulation
 * of various graphical elements. Each property serves a distinct role in rendering, styling, and managing UI elements.
 *
 * @remarks
 * The properties in Basic include:
 * - Container: A component used to group child elements together.
 * - Effect: Provides visual effects to enhance element appearance.
 * - Style: Manages styling properties applied to UI elements.
 * - Element: Serves as a base class for core UI component functionality.
 * - Group: Organizes related UI elements into a cohesive group.
 * - Image: Handles the display and management of image elements.
 * - Layer: Manages stacking context and z-index for proper element layering.
 * - Line: Facilitates drawing straight lines.
 * - Oval: Supports drawing oval or circular shapes.
 * - Creator: A utility for building paths for custom graphic elements.
 * - Path: Allows drawing custom SVG-like paths.
 * - Polygon: Enables drawing of polygon shapes.
 * - PolyLine: Used for drawing connected line segments.
 * - PolyPolyLine: Renders multiple sets of polyline sequences.
 * - Rect: Provides the capability to draw rectangular shapes.
 * - RRect: Handles drawing of rounded rectangles.
 * - ShapeContainer: Specializes in the organization of shape elements.
 * - ShapeCopy: A utility for duplicating shapes with ease.
 * - Symbol: Creates reusable symbol elements within the UI.
 * - Edit: Manages editable text fields within components.
 *
 * @example
 * // Import the Basic module (adjust the path as necessary)
 * import { Basic } from './path/to/Basic';
 *
 * // Create a new container for UI elements
 * const container = new Basic.Container();
 *
 * // Create an image element and add it to the container
 * const image = new Basic.Image();
 * container.addChild(image);
 *
 * // Apply an effect to the image for enhanced appearance
 * const effect = new Basic.Effect();
 * effect.applyTo(image);
 *
 * // Utilize other components as needed to build your UI layout...
 *
 * @public
 */
const Basic = {
  /**
   * Container component for grouping elements together
   * Creates a structured container to hold and organize child UI elements
   * @returns Container instance that can be used to group UI components
   */
  Container,

  /**
   * Visual effects provider for enhancing element appearance
   * Applies various effects like shadows, glows, and filters to elements
   * @returns Effect instance that can be applied to UI elements
   */
  Effect,

  /**
   * Styling manager for UI elements
   * Handles colors, borders, fills, and other visual properties
   * @returns Style instance to control element appearance
   */
  Style,

  /**
   * Base element class providing core UI component functionality
   * Serves as the foundation for other specialized UI elements
   * @returns Element instance with basic rendering capabilities
   */
  Element,

  /**
   * Logical grouping component for related UI elements
   * Allows collective operations on multiple elements at once
   * @returns Group instance for organizing related elements
   */
  Group,

  /**
   * Image display and management component
   * Handles loading, rendering, and manipulating image assets
   * @returns Image instance for displaying visual content
   */
  Image,

  /**
   * Layer management for controlling element stacking
   * Controls z-index and rendering order of elements
   * @returns Layer instance for proper element layering
   */
  Layer,

  /**
   * Component for drawing straight lines
   * Creates vector line segments with configurable properties
   * @returns Line instance for rendering line elements
   */
  Line,

  /**
   * Component for drawing oval or circular shapes
   * Creates elliptical shapes with customizable dimensions
   * @returns Oval instance for circular/oval rendering
   */
  Oval,

  /**
   * Utility for building custom graphic paths
   * Provides methods to construct complex vector paths
   * @returns Creator instance for path generation
   */
  Creator,

  /**
   * Component for drawing custom SVG-like paths
   * Renders complex vector shapes using path commands
   * @returns Path instance for custom shape rendering
   */
  Path,

  /**
   * Component for drawing closed polygon shapes
   * Creates multi-point closed shapes with straight edges
   * @returns Polygon instance for rendering polygon elements
   */
  Polygon,

  /**
   * Component for drawing connected line segments
   * Creates open shapes with multiple connected points
   * @returns PolyLine instance for multi-segment lines
   */
  PolyLine,

  /**
   * Component for rendering multiple polyline sequences
   * Manages and draws collections of polylines as a single unit
   * @returns PolyPolyLine instance for complex line structures
   */
  PolyPolyLine,

  /**
   * Component for drawing rectangular shapes
   * Creates four-sided shapes with right angles
   * @returns Rect instance for rectangle rendering
   */
  Rect,

  /**
   * Component for drawing rounded rectangles
   * Creates rectangles with customizable corner radii
   * @returns RRect instance for rounded rectangle rendering
   */
  RRect,

  /**
   * Specialized container for organizing shape elements
   * Provides optimized management for shape-based components
   * @returns ShapeContainer instance for shape organization
   */
  ShapeContainer,

  /**
   * Utility for duplicating shapes and their properties
   * Creates identical copies of existing shape elements
   * @returns ShapeCopy instance for element duplication
   */
  ShapeCopy,

  /**
   * Component for creating reusable symbol elements
   * Defines elements that can be instantiated multiple times
   * @returns Symbol instance for reusable graphics
   */
  Symbol,

  /**
   * Component for managing editable text fields
   * Handles text input, formatting, and interaction
   * @returns Edit instance for text editing capabilities
   */
  Edit
};

export default Basic
