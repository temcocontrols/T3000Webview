

import ArcLine from "../../Shape/S.ArcLine"
import ArcSegmentedLine from "../../Shape/S.ArcSegmentedLine"
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
import BaseDrawObject from "../../Shape/S.BaseDrawObject"
import BitmapImporter from "../../Shape/S.BitmapImporter"
import SVGImporter from "../../Shape/S.SVGImporter"

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
   * Creates and manages arc lines for drawing curved segments
   * @param startPoint - The starting point of the arc
   * @param endPoint - The ending point of the arc
   * @param controlPoint - The point that controls the curve of the arc
   * @returns Arc line shape object
   */
  ArcLine,

  /**
   * Creates curved lines composed of multiple arc segments
   * @param points - Array of points defining the segmented arc line
   * @param controlPoints - Array of control points for each segment
   * @returns Arc segmented line shape object
   */
  ArcSegmentedLine,

  /**
   * Base drawing object that provides fundamental drawing capabilities
   * @param properties - Base properties for the drawing object
   * @returns Base drawing object
   */
  BaseDrawObject,

  /**
   * Provides common functionality for all line-based shapes
   * @param startPoint - The beginning point of the line
   * @param endPoint - The ending point of the line
   * @param properties - Additional line properties
   * @returns Base line object
   */
  BaseLine,

  /**
   * Fundamental building block for all shape types with shared attributes
   * @param properties - Common shape properties
   * @returns Base shape object
   */
  BaseShape,

  /**
   * Base class for all symbol types used in HVAC diagrams
   * @param properties - Symbol properties including position and style
   * @returns Base symbol object
   */
  BaseSymbol,

  /**
   * Handles raster images for including in HVAC diagrams
   * @param imageSource - Source URL or data for the bitmap
   * @param position - Position information for the image
   * @param dimensions - Width and height of the image
   * @returns Bitmap symbol object
   */
  BitmapSymbol,

  /**
   * Creates connection points between diagram elements
   * @param sourceElement - The element where connection begins
   * @param targetElement - The element where connection ends
   * @param connectionType - Type of connector to create
   * @returns Connector object
   */
  Connector,

  /**
   * Handles three-dimensional representations of HVAC components
   * @param modelData - 3D model information
   * @param position - Position coordinates for the 3D symbol
   * @param scale - Scaling factors for the 3D model
   * @returns 3D symbol object
   */
  D3Symbol,

  /**
   * Creates irregular hand-drawn paths for annotations
   * @param points - Array of points defining the freehand path
   * @param properties - Style and behavior properties
   * @returns Freehand line object
   */
  FreehandLine,

  /**
   * Combines multiple shapes into a single manageable unit
   * @param shapes - Array of shapes to include in the group
   * @param groupProperties - Properties for the entire group
   * @returns Group symbol object
   */
  GroupSymbol,

  /**
   * Creates a straight line between two points
   * @param startPoint - The beginning point of the line
   * @param endPoint - The ending point of the line
   * @param lineProperties - Style properties for the line
   * @returns Line object
   */
  Line,

  /**
   * Creates circular or elliptical shapes for representing components
   * @param center - Center point of the oval
   * @param radiusX - Horizontal radius of the oval
   * @param radiusY - Vertical radius of the oval
   * @returns Oval shape object
   */
  Oval,

  /**
   * Creates multi-sided closed shapes for complex geometrical forms
   * @param points - Array of points defining the polygon vertices
   * @param properties - Style and behavior properties
   * @returns Polygon shape object
   */
  Polygon,

  /**
   * Creates multi-segment open paths for complex piping or ducts
   * @param points - Array of points defining the polyline
   * @param properties - Style and behavior properties
   * @returns Polyline object
   */
  PolyLine,

  /**
   * Manages collections of polylines for organization
   * @param polylines - Array of polyline objects to contain
   * @param containerProperties - Properties for the container
   * @returns Polyline container object
   */
  PolyLineContainer,

  /**
   * Creates rectangular shapes for equipment or structural elements
   * @param position - Top-left corner position of the rectangle
   * @param width - Width of the rectangle
   * @param height - Height of the rectangle
   * @returns Rectangle shape object
   */
  Rect,

  /**
   * Creates rectangles with rounded corners for aesthetic presentation
   * @param position - Top-left corner position of the rounded rectangle
   * @param width - Width of the rounded rectangle
   * @param height - Height of the rounded rectangle
   * @param cornerRadius - Radius for the rounded corners
   * @returns Rounded rectangle shape object
   */
  RRect,

  /**
   * Creates multi-segment straight lines for complex paths
   * @param points - Array of points defining the line segments
   * @param properties - Style and behavior properties
   * @returns Segmented line object
   */
  SegmentedLine,

  /**
   * Manages collections of shapes as a single unit
   * @param shapes - Array of shapes to include in the container
   * @param containerProperties - Properties for the container
   * @returns Shape container object
   */
  ShapeContainer,

  /**
   * Incorporates vector graphics elements into HVAC diagrams
   * @param svgContent - SVG content as string or document fragment
   * @param position - Position information for the SVG
   * @param dimensions - Size information for the SVG
   * @returns SVG fragment symbol object
   */
  SVGFragmentSymbol,

  /**
   * Imports and processes bitmap images for use in diagrams
   * @param imageSource - Source URL or data for the bitmap
   * @param importOptions - Options for importing the image
   * @returns Bitmap importer object
   */
  BitmapImporter,

  /**
   * Imports and processes SVG graphics for use in diagrams
   * @param svgSource - Source URL or string content of the SVG
   * @param importOptions - Options for importing the SVG
   * @returns SVG importer object
   */
  SVGImporter
}

export default Shape
