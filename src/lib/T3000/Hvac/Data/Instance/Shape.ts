

import ArcLine from "../../Shape/S.ArcLine"
import ArcSegmentedLine from "../../Shape/S.ArcSegmentedLine"
import BaseDrawObject from "../../Shape/S.BaseDrawObject"
import BaseLine from "../../Shape/S.BaseLine"
import BaseShape from "../../Shape/S.BaseShape"
import BaseSymbol from "../../Shape/S.BaseSymbol"
import BitmapSymbol from "../../Shape/S.BitmapSymbol"
import Connector from "../../Shape/S.Connector"
import D3Symbol from "../../Shape/S.D3Symbol"
import FreehandLine from "../../Shape/S.FreehandLine"
import GroupSymbol from "../../Shape/S.GroupSymbol"
import Line from "../../Shape/S.Line"
import Oval from "../../Shape/S.Oval"
import Polygon from "../../Shape/S.Polygon"
import PolyLine from "../../Shape/S.PolyLine"
import PolyLineContainer from "../../Shape/S.PolyLineContainer"
import Rect from "../../Shape/S.Rect"
import RRect from "../../Shape/S.RRect"
import SegmentedLine from "../../Shape/S.SegmentedLine"
import ShapeContainer from "../../Shape/S.ShapeContainer"
import SVGFragmentSymbol from "../../Shape/S.SVGFragmentSymbol"

/**
 * Collection of shape classes for HVAC visualization
 */
const Shape = {
  /**
   * Arc line shape for drawing curved lines
   * Useful for representing curved pipe sections or ducts
   */
  ArcLine,

  /**
   * Arc segmented line shape for drawing curved lines with segments
   * Useful for representing complex curved paths with multiple points
   */
  ArcSegmentedLine,

  /**
   * Base drawing object that provides common functionality for all drawable elements
   * Serves as the foundation for other shape classes
   */
  BaseDrawObject,

  /**
   * Base line shape that provides common functionality for line-based shapes
   * Serves as the foundation for specialized line classes
   */
  BaseLine,

  /**
   * Base shape providing common functionality for all shapes
   * The fundamental building block for all shape types
   */
  BaseShape,

  /**
   * Base symbol class for all symbol types
   * Provides common functionality for symbols used in HVAC diagrams
   */
  BaseSymbol,

  /**
   * Bitmap symbol for including raster images in diagrams
   * Used for incorporating photos or pre-rendered graphics
   */
  BitmapSymbol,

  /**
   * Connector shape for joining elements in diagrams
   * Used to create connections between components in HVAC systems
   */
  Connector,

  /**
   * 3D symbol for representing three-dimensional objects
   * Allows for more realistic representation of equipment
   */
  D3Symbol,

  /**
   * Freehand line for drawing irregular paths
   * Useful for annotations or custom paths that don't follow geometric patterns
   */
  FreehandLine,

  /**
   * Group symbol for combining multiple shapes into a single unit
   * Allows for organizing and manipulating collections of shapes
   */
  GroupSymbol,

  /**
   * Basic line shape connecting two points
   * Fundamental element for creating straight connections
   */
  Line,

  /**
   * Oval shape for representing circular or elliptical elements
   * Used for various HVAC components like dampers or round ducts
   */
  Oval,

  /**
   * Polygon shape for creating multi-sided closed shapes
   * Used for representing complex geometrical forms
   */
  Polygon,

  /**
   * Polyline shape for creating multi-segment open paths
   * Used for representing complex piping or duct runs
   */
  PolyLine,

  /**
   * Container for polylines to manage multiple paths
   * Helps organize and manipulate collections of polylines
   */
  PolyLineContainer,

  /**
   * Rectangle shape for representing rectangular elements
   * Common shape for representing equipment, ducts, or rooms
   */
  Rect,

  /**
   * Rounded rectangle shape for representing elements with rounded corners
   * Provides a more aesthetically pleasing alternative to standard rectangles
   */
  RRect,

  /**
   * Segmented line for creating multi-segment straight lines
   * Used for creating paths with multiple straight sections
   */
  SegmentedLine,

  /**
   * Container for shapes to manage multiple elements
   * Helps organize and manipulate collections of shapes
   */
  ShapeContainer,

  /**
   * SVG fragment symbol for including vector graphics in diagrams
   * Allows for scalable vector elements to be included in drawings
   */
  SVGFragmentSymbol
}

export default Shape
