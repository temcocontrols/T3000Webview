

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
 * The Shape object is a centralized registry for various shape and symbol implementations
 * used in HVAC diagramming. It aggregates classes that provide the functionality to draw,
 * render, and compose various graphical elements ranging from basic geometric shapes to
 * complex symbols. These elements are essential for representing HVAC components such as
 * pipes, ducts, equipment, and annotations in both 2D and 3D.
 *
 * The collection includes:
 * - ArcLine: For drawing smooth curved line segments, ideal for curved pipe sections.
 * - ArcSegmentedLine: Similar to ArcLine but composed of multiple segments, suitable for
 *   complex curves.
 * - BaseDrawObject: Provides common drawing functionality for all drawable elements.
 * - BaseLine: A foundational class for line-based shapes, ensuring consistent behavior
 *   across different line types.
 * - BaseShape: The abstract underpinning for all shapes, encapsulating shared attributes
 *   and methods.
 * - BaseSymbol: A base class for symbols used within HVAC diagrams, offering shared
 *   symbol-specific behavior.
 * - BitmapSymbol: Enables the inclusion of raster-based images within the diagrams.
 * - Connector: Represents a connecting element between different components in a diagram.
 * - D3Symbol: A three-dimensional symbol class for realistic representation of objects.
 * - FreehandLine: Supports the drawing of irregular and custom freehand paths.
 * - GroupSymbol: Allows multiple shapes to be grouped, making it easier to manage and render them as a single unit.
 * - Line: Implements a basic straight line between two points.
 * - Oval: Represents oval or elliptical shapes, common in HVAC schematics.
 * - Polygon: Provides support for multi-sided closed figures suitable for complex geometrical representations.
 * - PolyLine: Constructs open paths consisting of multiple connected segments.
 * - PolyLineContainer: Organizes and manages collections of polyline objects.
 * - Rect: A straightforward rectangular shape often used in equipment or duct representations.
 * - RRect: A variant of the rectangle that features rounded corners for enhanced aesthetics.
 * - SegmentedLine: Builds multi-segmented straight lines, useful for sectional representations.
 * - ShapeContainer: A container for grouping multiple shape objects together.
 * - SVGFragmentSymbol: Facilitates the inclusion of scalable vector graphics (SVG) into diagrams.
 *
 * @example
 * // Import the Shape registry.
 * import { Shape } from './Shape';
 *
 * // Example of creating and drawing a basic line:
 * const startPoint = { x: 0, y: 0 };
 * const endPoint = { x: 100, y: 100 };
 * const line = new Shape.Line(startPoint, endPoint);
 * line.draw();
 *
 * // Example of grouping shapes:
 * const rectangle = new Shape.Rect({ x: 10, y: 10, width: 200, height: 100 });
 * const oval = new Shape.Oval({ x: 50, y: 50, rx: 30, ry: 20 });
 * const groupSymbol = new Shape.GroupSymbol([rectangle, oval]);
 * groupSymbol.render();
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
