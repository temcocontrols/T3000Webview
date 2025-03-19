

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
 * Basic module that provides access to core HVAC UI components
 * Contains references to essential drawing and UI elements used throughout the application
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
