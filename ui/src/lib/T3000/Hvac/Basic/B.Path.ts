

import T3Svg from "../Util/T3Svg"
import "../Util/pathseg"
import Container from "./B.Container";
import Creator from "./B.Path.Creator";
import Utils1 from "../Util/Utils1"
import Instance from "../Data/Instance/Instance";
import BConstant from "./B.Constant";
import OptConstant from "../Data/Constant/OptConstant";

/**
 * Represents an SVG path with configurable stroke properties and optional arrowheads at either end.
 *
 * This class extends the Container class to provide functionality for drawing and manipulating
 * SVG paths. It supports the creation and updating of the path's geometry, the calculation and
 * placement of arrowheads based on specified metrics, and the adjustment of stroke attributes such
 * as width, color, and dash patterns.
 *
 * Key Features:
 * - Creation of SVG path and arrow containers.
 * - Configuration of arrowheads including the calculation of dimensions, rotation, and positioning.
 * - Ability to update the stroke width, stroke color, dash patterns, and gradients.
 * - Functionality to trim the path from either the start or the end.
 * - Computes the bounding box of the path geometry.
 *
 * Example Usage:
 *
 * const path = new Path();
 *
 * // Create the SVG elements and add them to a parent element
 * const svgContainer = path.CreateElement(svgDoc, parent);
 *
 * // Define SVG path data and set it on the path element
 * path.SetPath("M10,10 L100,100");
 *
 * // Configure arrowheads with custom definitions, sizes, and display options
 * path.SetArrowheads(startArrowDef, 5, endArrowDef, 5, true, true);
 *
 * // Update stroke properties: width, color and dash pattern
 * path.SetStrokeWidth(2);
 * path.SetStrokeColor("#FF0000");
 * path.SetStrokePattern("5,5");
 *
 * // The path now displays with the specified styling and arrowhead markers.
 */
class Path extends Container {

  public pathCreator: any;
  public pathElem: any;
  public arrowAreaElem: any;
  public arrowElems: any[];
  public sArrowRec: any;
  public eArrowRec: any;
  public origPathData: any;
  public sArrowSize: number;
  public eArrowSize: number;
  public sArrowDisp: boolean;
  public eArrowDisp: any;
  public sArrowMetrics: any;
  public eArrowMetrics: any;
  public arrowheadBounds: any;

  /**
   * Constructor for the Path class
   * Initializes the path properties and arrowhead related data
   */
  constructor() {
    super();
    this.pathCreator = null;
    this.svgObj = null;
    this.pathElem = null;
    this.arrowAreaElem = null;
    this.arrowElems = [];
    this.sArrowRec = null;
    this.eArrowRec = null;
    this.origPathData = null;
    this.strokeWidth = 0;
    this.sArrowSize = 0;
    this.eArrowSize = 0;
    this.sArrowDisp = false;
    this.eArrowDisp = false;
    this.sArrowMetrics = {};
    this.eArrowMetrics = {};
    this.arrowheadBounds = [];
  }

  /**
   * Creates SVG elements for the path and arrow container
   * @param svgDoc - The SVG document where the path will be created
   * @param parent - The parent element to which the path will be added
   * @returns The created SVG container object
   */
  CreateElement(svgDoc: any, parent: any) {
    this.svgObj = new T3Svg.Container(T3Svg.create('g'));
    this.pathElem = new T3Svg.Path();
    this.svgObj.add(this.pathElem);

    this.arrowAreaElem = new T3Svg.Container(T3Svg.create('g'));
    this.svgObj.add(this.arrowAreaElem);

    this.InitElement(svgDoc, parent);

    return this.svgObj;
  }

  /**
   * Sets arrowhead properties for the start and end of the path
   * @param startArrowRec - The record defining the start arrowhead
   * @param startArrowSize - The size of the start arrowhead
   * @param endArrowRec - The record defining the end arrowhead
   * @param endArrowSize - The size of the end arrowhead
   * @param startArrowDisplay - Whether to display the start arrowhead
   * @param endArrowDisplay - Whether to display the end arrowhead
   */
  SetArrowheads(
    startArrowRec: any,
    startArrowSize: number,
    endArrowRec: any,
    endArrowSize: number,
    startArrowDisplay: boolean,
    endArrowDisplay: boolean
  ) {
    if (!this.IsClosed()) {
      this.sArrowRec = startArrowRec;
      this.eArrowRec = endArrowRec;
      this.sArrowSize = startArrowSize;
      this.eArrowSize = endArrowSize;
      this.sArrowDisp = startArrowDisplay || false;
      this.eArrowDisp = endArrowDisplay || false;
      this.UpdateArrowheads();
    }
  }

  /**
   * Sets the stroke width for the path and updates related properties
   * @param strokeWidth - The width of the stroke to be applied
   */
  SetStrokeWidth(strokeWidth: any) {
    if (isNaN(strokeWidth) && typeof strokeWidth === 'string') {
      strokeWidth = Instance.Basic.Symbol.ParsePlaceholder(strokeWidth, BConstant.Placeholder.LineThick);
    }

    strokeWidth = Utils1.RoundCoord(strokeWidth);
    this.pathElem.attr('stroke-width', strokeWidth);
    this.strokeWidth = Number(strokeWidth);
    this.pathElem.attr('stroke-dasharray', this.GetStrokePatternForWidth());
    this.UpdateArrowheads();
  }

  /**
   * Sets the stroke color for the path and handles fill colors appropriately
   * @param strokeColor - The color to be applied to the stroke
   */
  SetStrokeColor(strokeColor: string) {
    this.svgObj.attr('stroke', strokeColor);
    if (!this.IsClosed()) {
      this.svgObj.attr('fill', strokeColor);
      this.pathElem.attr('fill', 'none');
    }
    this.ClearColorData(false);
  }

  /**
   * Updates the pattern for the path and adjusts fill/stroke properties
   * @param patternId - The ID of the pattern to apply
   * @param isFill - Whether to apply the pattern to the fill (true) or stroke (false)
   */
  UpdatePattern(patternId: any, isFill: boolean) {
    let strokeColor;
    Instance.Basic.Element.prototype.UpdatePattern.call(this, patternId, isFill);

    if (!isFill) {
      strokeColor = this.svgObj.attr('stroke');
      if (!this.IsClosed()) {
        this.svgObj.attr('fill', strokeColor);
        this.pathElem.attr('fill', 'none');
      }
    }
  }

  /**
   * Updates the gradient for the path and adjusts fill/stroke properties
   * @param gradientId - The ID of the gradient to apply
   * @param isFill - Whether to apply the gradient to the fill (true) or stroke (false)
   */
  UpdateGradient(gradientId: any, isFill: boolean) {
    let strokeColor;
    Instance.Basic.Element.prototype.UpdateGradient.call(this, gradientId, isFill);

    if (!isFill) {
      strokeColor = this.svgObj.attr('stroke');
      if (!this.IsClosed()) {
        this.svgObj.attr('fill', strokeColor);
        this.pathElem.attr('fill', 'none');
      }
    }
  }

  /**
   * Sets the stroke dash pattern for the path
   * @param dashArray - The dash array pattern to apply (e.g., "5,5" for dashed lines)
   */
  SetStrokePattern(dashArray: string) {
    this.strokeDashArray = dashArray;
    this.pathElem.attr('stroke-dasharray', this.GetStrokePatternForWidth());
  }

  /**
   * Sets the size of the path element
   * @param width - The width to set
   * @param height - The height to set
   */
  SetSize(width, height) {
  }

  /**
   * Gets the bounds of all arrowheads on the path
   * @returns Array containing bounding boxes for arrowheads
   */
  GetArrowheadBounds() {
    return [...this.arrowheadBounds];
  }

  /**
   * Updates the arrowheads at the start and/or end of the path
   * Creates and positions arrowhead elements based on current settings
   */
  UpdateArrowheads() {
    const startArrowRecord = this.sArrowRec;
    const endArrowRecord = this.eArrowRec;
    const startArrowSize = this.sArrowSize;
    const endArrowSize = this.eArrowSize;
    let startArrowElement = null;
    let endArrowElement = null;

    while (this.arrowAreaElem.children().length) {
      this.arrowAreaElem.removeAt(0);
    }

    this.arrowElems.length = 0;
    this.arrowheadBounds = [];

    if (!this.IsClosed() && this.origPathData) {
      this.pathElem.plot(this.origPathData);

      const startArrow = startArrowRecord || this.EmptyArrowhead();
      const endArrow = endArrowRecord || this.EmptyArrowhead();

      if (startArrow) {
        this.sArrowMetrics = this.CalcArrowheadDim(startArrow, startArrowSize, this.sArrowDisp);
      }

      if (endArrow) {
        this.eArrowMetrics = this.CalcArrowheadDim(endArrow, endArrowSize, this.eArrowDisp);
      }

      this.CalcArrowheadPlacement(startArrow, endArrow);

      if (startArrow) {
        startArrowElement = this.CreateArrowheadElem(startArrow, this.sArrowMetrics, true, this.arrowheadBounds);
      }

      if (endArrow) {
        endArrowElement = this.CreateArrowheadElem(endArrow, this.eArrowMetrics, false, this.arrowheadBounds);
      }

      if (startArrow && this.sArrowMetrics.trimAmount) {
        this.TrimPath('start', this.sArrowMetrics.trimAmount);
      }

      if (endArrow && this.eArrowMetrics.trimAmount) {
        this.TrimPath('end', this.eArrowMetrics.trimAmount);
      }

      if (startArrowElement) {
        this.arrowElems.push(startArrowElement);
        this.arrowAreaElem.add(startArrowElement);
      }

      if (endArrowElement) {
        this.arrowElems.push(endArrowElement);
        this.arrowAreaElem.add(endArrowElement);
      }
    }
  }

  /**
   * Calculates the dimensions and metrics for an arrowhead
   * @param arrowRecord - The arrow record containing geometry and attachment data
   * @param arrowSize - The size factor to apply to the arrow
   * @param displayArrow - Whether the arrow should be displayed
   * @returns Object containing calculated arrow metrics (dimensions, scale, attachment points)
   */
  CalcArrowheadDim(arrowRecord: any, arrowSize: number, displayArrow: boolean) {
    let scaleFactor, arrowWidth, arrowHeight;
    const metrics = {
      width: 0,
      height: 0,
      scaleFactor: 0,
      attachX: 0,
      attachY: 0,
      endX: 0,
      endY: 0,
      trimAmount: 0
    };

    arrowHeight = 2 * (this.strokeWidth + arrowSize);
    if (arrowRecord.fixedSizeScale) {
      arrowHeight = this.strokeWidth * arrowRecord.fixedSizeScale;
    }

    scaleFactor = arrowHeight / arrowRecord.defArea.height;
    metrics.width = arrowRecord.defArea.width * scaleFactor;
    metrics.height = arrowHeight;
    metrics.scaleFactor = scaleFactor;
    metrics.attachX = arrowRecord.attachPt.x * scaleFactor;
    metrics.attachY = arrowRecord.attachPt.y * scaleFactor;
    metrics.endX = arrowRecord.endPt.x * scaleFactor;
    metrics.endY = arrowRecord.endPt.y * scaleFactor;

    if (arrowRecord.centered) {
      metrics.endX = metrics.attachX;
      metrics.endY = metrics.attachY;
    }

    metrics.trimAmount = metrics.endX - metrics.attachX;
    if (displayArrow && !arrowRecord.centered) {
      metrics.trimAmount += 10;
    }

    return metrics;
  }

  /**
   * Creates an SVG arrowhead element based on the provided specifications
   * @param arrowRecord - Definition of the arrowhead geometry and properties
   * @param metrics - Calculated metrics for the arrowhead (dimensions, positioning, etc.)
   * @param isStart - Whether this is a start arrowhead (true) or end arrowhead (false)
   * @param arrowBounds - Array to store the calculated bounds of the arrowhead
   * @returns SVG Container element representing the arrowhead
   */
  CreateArrowheadElem(
    arrowRecord: any,
    metrics: any,
    isStart: boolean,
    arrowBounds: any[]
  ) {
    // Get strokeWidth and strokeOpacity with fallbacks
    let strokeWidth = this.pathElem.attr("stroke-width");
    if (isNaN(strokeWidth)) {
      strokeWidth = Number(Instance.Basic.Symbol.ParsePlaceholder(strokeWidth, Instance.Basic.Symbol.Placeholder.LineThick));
    }
    let strokeOpacity = this.svgObj.attr("stroke-opacity");
    if (isNaN(strokeOpacity)) {
      strokeOpacity = 1;
    }

    // Define offset and transformation values from metrics
    const offset = {
      x: metrics.offsetX,
      y: metrics.offsetY,
    };
    const rotatePoint = metrics.rotatePt;
    const angle = metrics.angle;
    const scaleFactor = metrics.scaleFactor;
    const geometryParts = arrowRecord.geometry;

    // Create a container group for the arrow head parts
    const container = new T3Svg.Container(T3Svg.create("g"));
    container.parts = [];

    // If the arrowRecord provides a flipped geometry and isStart is true, use it
    let partsGeometry = geometryParts;
    if (isStart && arrowRecord.flippedGeometry) {
      partsGeometry = arrowRecord.flippedGeometry;
    }

    // Iterate through each part of the arrow geometry
    for (let i = 0; i < partsGeometry.length; i++) {
      let hasFill = false;
      let pathElement: any = null;
      let pathCommand = "";
      const geomPart = partsGeometry[i];

      switch (geomPart.type) {
        case "RECT": {
          pathElement = new T3Svg.Path();
          pathCommand = "M";
          const posX = geomPart.pathData.x * scaleFactor + offset.x;
          const posY = geomPart.pathData.y * scaleFactor + offset.y;
          const rectWidth = geomPart.pathData.width * scaleFactor;
          const rectHeight = geomPart.pathData.height * scaleFactor;

          let rotatedPoint = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY }, angle);
          pathCommand += Utils1.RoundCoord(rotatedPoint.x) + "," + Utils1.RoundCoord(rotatedPoint.y) + "L";
          rotatedPoint = Utils1.RotatePoint(rotatePoint, { x: posX + rectWidth, y: posY }, angle);
          pathCommand += Utils1.RoundCoord(rotatedPoint.x) + "," + Utils1.RoundCoord(rotatedPoint.y) + "L";
          rotatedPoint = Utils1.RotatePoint(rotatePoint, { x: posX + rectWidth, y: posY + rectHeight }, angle);
          pathCommand += Utils1.RoundCoord(rotatedPoint.x) + "," + Utils1.RoundCoord(rotatedPoint.y) + "L";
          rotatedPoint = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY + rectHeight }, angle);
          pathCommand += Utils1.RoundCoord(rotatedPoint.x) + "," + Utils1.RoundCoord(rotatedPoint.y) + "z";
          pathElement.plot(pathCommand);
          hasFill = true;
          break;
        }
        case "OVAL": {
          pathElement = new T3Svg.Path();
          pathCommand = "M";
          let posX = geomPart.pathData.x * scaleFactor + offset.x;
          let posY = geomPart.pathData.y * scaleFactor + offset.y;
          const halfWidth = (geomPart.pathData.width * scaleFactor) / 2;
          const halfHeight = (geomPart.pathData.height * scaleFactor) / 2;

          // Adjust posY for a slight offset
          posY += halfHeight - 0.5;
          let rotatedCenter = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY }, angle);
          pathCommand += Utils1.RoundCoord(rotatedCenter.x) + "," + Utils1.RoundCoord(rotatedCenter.y) + "A";
          pathCommand +=
            Utils1.RoundCoord(halfWidth) +
            "," +
            Utils1.RoundCoord(halfHeight) +
            " " +
            Utils1.RoundCoord(angle) +
            " 1 1 ";
          rotatedCenter = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY + 1 }, angle);
          pathCommand += Utils1.RoundCoord(rotatedCenter.x) + "," + Utils1.RoundCoord(rotatedCenter.y) + "z";
          pathElement.plot(pathCommand);
          hasFill = true;
          break;
        }
        case "PATH": {
          pathElement = new T3Svg.Path();
          pathCommand = "";
          const subPaths = geomPart.pathData;
          if (!Array.isArray(subPaths)) {
            continue;
          }
          for (let j = 0; j < subPaths.length; j++) {
            const segment = subPaths[j];
            if (!Array.isArray(segment) || segment.length < 1) {
              pathCommand = "";
              break;
            }
            switch (segment[0]) {
              case "M":
              case "L": {
                if (segment.length < 3) break;
                const posX = segment[1] * scaleFactor + offset.x;
                const posY = segment[2] * scaleFactor + offset.y;
                const rotatedPoint = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY }, angle);
                pathCommand += segment[0] + Utils1.RoundCoord(rotatedPoint.x) + "," + Utils1.RoundCoord(rotatedPoint.y);
                break;
              }
              case "A": {
                if (segment.length < 8) break;
                const posX = segment[6] * scaleFactor + offset.x;
                const posY = segment[7] * scaleFactor + offset.y;
                const arcWidth = segment[1] * scaleFactor;
                const arcHeight = segment[2] * scaleFactor;
                let rotatedPoint = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY }, angle);
                pathCommand +=
                  "A" +
                  Utils1.RoundCoord(arcWidth) +
                  "," +
                  Utils1.RoundCoord(arcHeight) +
                  " " +
                  Utils1.RoundCoord(segment[3] + angle) +
                  " " +
                  segment[4] +
                  " " +
                  segment[5] +
                  " " +
                  Utils1.RoundCoord(rotatedPoint.x) +
                  "," +
                  Utils1.RoundCoord(rotatedPoint.y);
                break;
              }
              case "z": {
                pathCommand += "z";
                hasFill = true;
                break;
              }
            }
          }
          pathElement.plot(pathCommand);
          break;
        }
        default: {
          pathElement = null;
        }
      }

      // If no white fill is specified, then filled is false
      if (geomPart.noWhiteFill) {
        hasFill = false;
      }

      if (pathElement) {
        container.add(pathElement);
        container.parts.push({ elem: pathElement, filled: geomPart.filled });
        if (geomPart.filled) {
          pathElement.attr("stroke", "none");
          pathElement.attr("fill-opacity", strokeOpacity);
        } else {
          pathElement.attr("stroke-width", strokeWidth * geomPart.stroke);
          if (hasFill) {
            pathElement.attr("fill-opacity", 1);
            pathElement.attr("fill", "#FFFFFF");
          } else {
            pathElement.attr("fill", "none");
          }
        }
      }
    }

    // Set stroke-dasharray to none
    container.attr("stroke-dasharray", "none");

    if (arrowBounds && arrowRecord.desc !== "empty") {
      // Calculate bounds based on the arrowRecord's defined area
      let posX = offset.x;
      let posY = offset.y;
      let defWidth = arrowRecord.defArea.width * scaleFactor;
      let defHeight = arrowRecord.defArea.height * scaleFactor;

      if (angle) {
        let rotated = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY }, angle);
        let minX = rotated.x;
        let maxX = rotated.x;
        let minY = rotated.y;
        let maxY = rotated.y;

        rotated = Utils1.RotatePoint(rotatePoint, { x: posX + defWidth, y: posY }, angle);
        minX = rotated.x < minX ? rotated.x : minX;
        maxX = rotated.x > maxX ? rotated.x : maxX;
        minY = rotated.y < minY ? rotated.y : minY;
        maxY = rotated.y > maxY ? rotated.y : maxY;

        rotated = Utils1.RotatePoint(rotatePoint, { x: posX, y: posY + defHeight }, angle);
        minX = rotated.x < minX ? rotated.x : minX;
        maxX = rotated.x > maxX ? rotated.x : maxX;
        minY = rotated.y < minY ? rotated.y : minY;
        maxY = rotated.y > maxY ? rotated.y : maxY;

        rotated = Utils1.RotatePoint(rotatePoint, { x: posX + defWidth, y: posY + defHeight }, angle);
        minX = rotated.x < minX ? rotated.x : minX;
        maxX = rotated.x > maxX ? rotated.x : maxX;
        minY = rotated.y < minY ? rotated.y : minY;
        maxY = rotated.y > maxY ? rotated.y : maxY;

        posX = minX;
        posY = minY;
        defWidth = maxX - minX;
        defHeight = maxY - minY;
      }

      arrowBounds.push({
        x: posX,
        y: posY,
        width: defWidth,
        height: defHeight,
      });
    }

    return container;
  }

  /**
   * Calculates placement and rotation for arrowheads at the start and/or end of a path
   * @param startArrowRecord - Arrow record for the start of the path
   * @param endArrowRecord - Arrow record for the end of the path
   */
  CalcArrowheadPlacement(startArrowRecord, endArrowRecord) {
    if (!startArrowRecord && !endArrowRecord) {
      return;
    }

    const totalLength = this.pathElem.node.getTotalLength();
    let startPoint = this.pathElem.node.getPointAtLength(0);
    let endPoint = this.pathElem.node.getPointAtLength(totalLength);
    let startTrimAmount = startArrowRecord ? this.sArrowMetrics.trimAmount : 0;
    let endTrimAmount = endArrowRecord ? this.eArrowMetrics.trimAmount : 0;

    // Handle case where arrows would overlap
    if (startTrimAmount + endTrimAmount >= totalLength) {
      const midPoint = this.pathElem.node.getPointAtLength(totalLength / 2);
      if (startTrimAmount && endTrimAmount) {
        this.sArrowMetrics.trimAmount = totalLength / 2;
        this.eArrowMetrics.trimAmount = totalLength / 2;
        startTrimAmount = endTrimAmount = totalLength / 2;
      } else if (startTrimAmount) {
        this.sArrowMetrics.trimAmount = totalLength;
        startTrimAmount = totalLength;
      } else {
        this.eArrowMetrics.trimAmount = totalLength;
        endTrimAmount = totalLength;
      }
      startPoint = midPoint;
      endPoint = midPoint;
    }

    // Determine points for arrows
    let startArrowPoint = startArrowRecord ? (startArrowRecord.centered ?
      this.pathElem.node.getPointAtLength(totalLength / 2) :
      this.pathElem.node.getPointAtLength(startTrimAmount)) : null;

    let endArrowPoint = endArrowRecord ? (endArrowRecord.centered ?
      this.pathElem.node.getPointAtLength(totalLength / 2) :
      this.pathElem.node.getPointAtLength(totalLength - endTrimAmount)) : null;

    // Calculate start arrow position and rotation
    if (startArrowRecord) {
      let startArrowAnglePoint = startArrowPoint.x === startPoint.x && startArrowPoint.y === startPoint.y ?
        (totalLength < 2 ? { x: startPoint.x + 2, y: startPoint.y } : this.pathElem.node.getPointAtLength(2)) :
        startArrowPoint;

      if (startArrowRecord.centered && totalLength >= 4) {
        startPoint = this.pathElem.node.getPointAtLength(totalLength / 2 - 2);
      }

      this.sArrowMetrics.angle = startArrowRecord.noRotate ? 0 : Utils1.CalcAngleFromPoints(startArrowAnglePoint, startPoint);
      this.sArrowMetrics.rotatePt = startArrowPoint;
      this.sArrowMetrics.offsetX = startArrowPoint.x - this.sArrowMetrics.attachX;
      this.sArrowMetrics.offsetY = startArrowPoint.y - this.sArrowMetrics.attachY;
    }

    // Calculate end arrow position and rotation
    if (endArrowRecord) {
      let endArrowAnglePoint = endArrowPoint.x === endPoint.x && endArrowPoint.y === endPoint.y ?
        (totalLength < 2 ? { x: endPoint.x - 2, y: endPoint.y } : this.pathElem.node.getPointAtLength(totalLength - 2)) :
        endArrowPoint;

      if (endArrowRecord.centered && totalLength >= 4) {
        endPoint = this.pathElem.node.getPointAtLength(totalLength / 2 + 2);
      }

      this.eArrowMetrics.angle = endArrowRecord.noRotate ? 0 : Utils1.CalcAngleFromPoints(endArrowAnglePoint, endPoint);
      this.eArrowMetrics.rotatePt = endArrowPoint;
      this.eArrowMetrics.offsetX = endArrowPoint.x - this.eArrowMetrics.attachX;
      this.eArrowMetrics.offsetY = endArrowPoint.y - this.eArrowMetrics.attachY;
    }
  }

  /**
   * Creates and returns a default empty arrowhead object
   * @returns Object containing empty arrowhead definition
   */
  EmptyArrowhead() {
    const emptyArrowhead = {
      id: 0,
      desc: 'empty',
      defArea: {
        width: 10,
        height: 10
      },
      endPt: {
        x: 5,
        y: 5
      },
      attachPt: {
        x: 5,
        y: 5
      },
      centered: false,
      noRotate: true,
      geometry: [
        {
          type: 'RECT',
          filled: false,
          noWhiteFill: true,
          stroke: 0,
          pathData: {
            x: 0,
            y: 0,
            width: 10,
            height: 10
          }
        }
      ]
    };

    return emptyArrowhead;
  }

  /**
   * Trims the path from either start or end by the specified length
   * @param position - Position to trim from ('start' or 'end')
   * @param trimLength - Amount to trim from the path
   */
  TrimPath(position: string, trimLength: number) {
    const totalSegments = this.pathElem.node.pathSegList.numberOfItems;
    const totalLength = this.pathElem.node.getTotalLength();
    let currentPoint = { x: 0, y: 0 };

    if (trimLength) {
      if (trimLength >= totalLength) {
        // Path would be completely trimmed, so clear it
        this.pathElem.plot();
      } else {
        const trimPosition = position === 'start' ? trimLength : totalLength - trimLength;
        const segmentIndex = this.pathElem.node.getPathSegAtLength(trimPosition);
        let pointAtTrim = this.pathElem.node.getPointAtLength(trimPosition);
        pointAtTrim = {
          x: Utils1.RoundCoord(pointAtTrim.x),
          y: Utils1.RoundCoord(pointAtTrim.y)
        };
        const segment = this.pathElem.node.pathSegList.getItem(segmentIndex);

        // Trim from start
        if (position === 'start') {
          const isAbsolute = this.IsSegmentAbs(segment);
          if (!isAbsolute) {
            currentPoint = this.CalcSegEndpoint(this.pathElem, segmentIndex);
            currentPoint.x = Utils1.RoundCoord(currentPoint.x);
            currentPoint.y = Utils1.RoundCoord(currentPoint.y);
          }

          // Remove segments between first and target segment
          for (let i = 1; i < segmentIndex; i++) {
            this.pathElem.node.pathSegList.removeItem(1);
          }

          // Replace first segment with move to trim point
          const moveToSegment = this.pathElem.node.createSVGPathSegMovetoAbs(pointAtTrim.x, pointAtTrim.y);
          this.pathElem.node.pathSegList.replaceItem(moveToSegment, 0);

          // Handle relative coordinates
          if (!isAbsolute) {
            let newSegment;
            switch (segment.pathSegType) {
              case OptConstant.SVGPathSeg.PATHSEG_LINETO_ABS:
              case OptConstant.SVGPathSeg.PATHSEG_LINETO_REL:
              case OptConstant.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
              case OptConstant.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL:
              case OptConstant.SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
              case OptConstant.SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL:
                newSegment = this.pathElem.node.createSVGPathSegLinetoAbs(currentPoint.x, currentPoint.y);
                break;
              case OptConstant.SVGPathSeg.PATHSEG_ARC_ABS:
              case OptConstant.SVGPathSeg.PATHSEG_ARC_REL:
                newSegment = this.pathElem.node.createSVGPathSegArcAbs(
                  currentPoint.x,
                  currentPoint.y,
                  segment.r1,
                  segment.r2,
                  segment.angle,
                  segment.largeArcFlag,
                  segment.sweepFlag
                );
                break;
              default:
                newSegment = null;
            }
            if (newSegment) {
              this.pathElem.node.pathSegList.replaceItem(newSegment, 1);
            }
          }
        }
        // Trim from end
        else {
          // Remove segments after trim point
          for (let i = segmentIndex + 1; i < totalSegments; i++) {
            this.pathElem.node.pathSegList.removeItem(segmentIndex + 1);
          }

          // Replace segment at trim point with appropriate segment type
          let newSegment;
          switch (segment.pathSegType) {
            case OptConstant.SVGPathSeg.PATHSEG_LINETO_ABS:
            case OptConstant.SVGPathSeg.PATHSEG_LINETO_REL:
            case OptConstant.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
            case OptConstant.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_REL:
            case OptConstant.SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
            case OptConstant.SVGPathSeg.PATHSEG_LINETO_VERTICAL_REL:
              newSegment = this.pathElem.node.createSVGPathSegLinetoAbs(pointAtTrim.x, pointAtTrim.y);
              break;
            case OptConstant.SVGPathSeg.PATHSEG_ARC_ABS:
            case OptConstant.SVGPathSeg.PATHSEG_ARC_REL:
              newSegment = this.pathElem.node.createSVGPathSegArcAbs(
                pointAtTrim.x,
                pointAtTrim.y,
                segment.r1,
                segment.r2,
                segment.angle,
                segment.largeArcFlag,
                segment.sweepFlag
              );
              break;
            default:
              newSegment = null;
          }
          if (newSegment) {
            this.pathElem.node.pathSegList.replaceItem(newSegment, segmentIndex);
          }
        }
      }
    }
  }

  /**
   * Calculates the endpoint coordinates of a path segment
   * @param pathElement - The SVG path element
   * @param targetSegmentIndex - Index of the segment to calculate endpoint for
   * @returns Object containing x and y coordinates of the endpoint
   */
  CalcSegEndpoint(pathElement, targetSegmentIndex) {
    let endpoint = { x: 0, y: 0 };
    for (let i = 0; i <= targetSegmentIndex; i++) {
      const segment = pathElement.node.pathSegList.getItem(i);
      switch (segment.pathSegType) {
        case OptConstant.SVGPathSeg.PATHSEG_MOVETO_ABS:
        case OptConstant.SVGPathSeg.PATHSEG_LINETO_ABS:
        case OptConstant.SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
        case OptConstant.SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS:
        case OptConstant.SVGPathSeg.PATHSEG_ARC_ABS:
        case OptConstant.SVGPathSeg.PATHSEG_LINETO_HORIZONTAL_ABS:
        case OptConstant.SVGPathSeg.PATHSEG_LINETO_VERTICAL_ABS:
        case OptConstant.SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS:
        case OptConstant.SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS:
          if (segment.x !== undefined) endpoint.x = segment.x;
          if (segment.y !== undefined) endpoint.y = segment.y;
          break;
        case OptConstant.SVGPathSeg.PATHSEG_MOVETO_REL:
          if (i === 0) {
            endpoint.x = segment.x;
            endpoint.y = segment.y;
          } else {
            endpoint.x += segment.x;
            endpoint.y += segment.y;
          }
          break;
        default:
          if (segment.x !== undefined) endpoint.x += segment.x;
          if (segment.y !== undefined) endpoint.y += segment.y;
      }
    }
    return endpoint;
  }

  /**
   * Gets the bounding box of the path geometry
   * Calculates a new bounding box if the current one is invalid
   * @returns Object containing x, y, width, and height of the bounding box
   */
  GetGeometryBBox() {
    if (this.geometryBBox.width < 0 || this.geometryBBox.height < 0) {
      const formattingLayer = this.doc.GetFormattingLayer();
      const tempPath = new T3Svg.Path();
      tempPath.plot(this.origPathData);
      formattingLayer.svgObj.add(tempPath);

      const bbox = tempPath.node.getBBox();
      formattingLayer.svgObj.remove(tempPath);

      this.geometryBBox.x = bbox.x;
      this.geometryBBox.y = bbox.y;
      this.geometryBBox.width = bbox.width;
      this.geometryBBox.height = bbox.height;
    }

    return this.geometryBBox;
  }

  /**
   * Determines if a path segment uses absolute coordinates
   * @param segment - The SVG path segment to check
   * @returns Boolean indicating whether the segment uses absolute coordinates
   */
  IsSegmentAbs(segment) {
    let isAbsolute = false;
    switch (segment.pathSegType) {
      case OptConstant.SVGPathSeg.PATHSEG_MOVETO_ABS:
      case OptConstant.SVGPathSeg.PATHSEG_LINETO_ABS:
      case OptConstant.SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
      case OptConstant.SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_ABS:
      case OptConstant.SVGPathSeg.PATHSEG_ARC_ABS:
      case OptConstant.SVGPathSeg.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS:
      case OptConstant.SVGPathSeg.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS:
        isAbsolute = true;
        break;
    }
    return isAbsolute;
  }

  /**
   * Determines if the path is closed (ends with a closepath command)
   * @returns Boolean indicating whether the path is closed
   */
  IsClosed() {
    const numberOfItems = this.pathElem.node.pathSegList.numberOfItems;

    if (numberOfItems < 1) {
      return false;
    }

    const lastSegment = this.pathElem.node.pathSegList.getItem(numberOfItems - 1);
    return lastSegment.pathSegType === OptConstant.SVGPathSeg.PATHSEG_CLOSEPATH;
  }

  /**
   * Sets the path data and updates related properties
   * @param pathData - The SVG path data to set
   * @param boundingBox - Optional bounding box for the path
   */
  SetPath(pathData: any, boundingBox?: any) {
    this.origPathData = pathData;
    this.pathElem.plot(pathData);
    this.UpdateArrowheads();
    this.UpdateTransform();

    if (boundingBox) {
      this.geometryBBox.x = boundingBox.x;
      this.geometryBBox.y = boundingBox.y;
      this.geometryBBox.width = boundingBox.width;
      this.geometryBBox.height = boundingBox.height;
    } else {
      this.geometryBBox.width = -1;
      this.geometryBBox.height = -1;
    }

    this.RefreshPaint();
  }

  /**
   * Gets or creates the path creator instance for this path
   * @returns Path creator instance associated with this path
   */
  PathCreator() {
    if (!this.pathCreator) {
      this.pathCreator = new Creator(this);
    }
    return this.pathCreator;
  }

}

export default Path
