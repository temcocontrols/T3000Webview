

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
  /** Container component for grouping elements */
  Container,

  /** Provides visual effects for elements */
  Effect,

  /** Handles styling properties for elements */
  Style,

  /** Base element class for UI components */
  Element,

  /** Component for grouping related elements */
  Group,

  /** Component for displaying images */
  Image,

  /** Layer component for z-index management */
  Layer,

  /** Component for drawing lines */
  Line,

  /** Component for drawing oval/circle shapes */
  Oval,

  /** Utility for creating paths */
  Creator,

  /** Component for drawing custom paths */
  Path,

  /** Component for drawing polygons */
  Polygon,

  /** Component for drawing connected line segments */
  PolyLine,

  /** Component for drawing multiple polylines */
  PolyPolyLine,

  /** Component for drawing rectangles */
  Rect,

  /** Component for drawing rounded rectangles */
  RRect,

  /** Container specifically for shapes */
  ShapeContainer,

  /** Utility for copying shapes */
  ShapeCopy,

  /** Component for reusable symbol elements */
  Symbol,

  /** Component for editable text fields */
  Edit
};

export default Basic
