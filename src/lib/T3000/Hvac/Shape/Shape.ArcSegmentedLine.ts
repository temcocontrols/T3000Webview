
import SegmentedLine from './Shape.SegmentedLine'
import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import GlobalData from '../Data/GlobalData'
import Document from '../Basic/Basic.Document'
import Element from '../Basic/Basic.Element';
import ConstantData from '../Data/ConstantData'
import PolySeg from '../Model/PolySeg'

class ArcSegmentedLine extends SegmentedLine {

  constructor(config: any) {
    console.log("= S.ArcSegmentedLine - constructor input:", config);

    // Ensure the input parameter is defined and set default properties if missing
    config = config || {};
    config.LineType = config.LineType || ConstantData.LineType.ARCSEGLINE;

    // Initialize the parent class with the modified parameters
    super(config);

    console.log("= S.ArcSegmentedLine - constructor output: instance created with parameters:", config);
  }

  CreateShape(context: any, flag: any) {
    console.log("= S.ArcSegmentedLine - CreateShape - Input:", { context, flag });

    let primaryShape: any; // Primary shape element
    let secondaryShape: any; // Secondary shape element
    let points: any[] = [];

    // Check if the object should be visible
    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) {
      console.log("= S.ArcSegmentedLine - CreateShape - Object not visible, returning null");
      return null;
    }

    // Create the shape container and primary/secondary shapes based on shape complexity
    const shapeContainer = context.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER);
    const isSimpleShape = this.hoplist.nhops === 0;

    if (isSimpleShape) {
      primaryShape = context.CreateShape(ConstantData.CreateShapeType.PATH);
      secondaryShape = context.CreateShape(ConstantData.CreateShapeType.PATH);
    } else {
      primaryShape = context.CreateShape(ConstantData.CreateShapeType.POLYLINE);
      secondaryShape = context.CreateShape(ConstantData.CreateShapeType.POLYLINE);
    }

    primaryShape.SetID(ConstantData.SVGElementClass.SHAPE);
    secondaryShape.SetID(ConstantData.SVGElementClass.SLOP);
    secondaryShape.ExcludeFromExport(true);

    // Calculate frame and rectangle bounds
    this.CalcFrame();
    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    console.log("= S.ArcSegmentedLine - CreateShape - Calculated Rect:", rect);

    const styleRecord = this.StyleRecord;
    const styledStyle = this.SVGTokenizerHook(styleRecord);
    const strokeColor = styledStyle.Line.Paint.Color;
    let strokeWidth = styledStyle.Line.Thickness;
    const strokeOpacity = styledStyle.Line.Paint.Opacity;
    const strokePattern = styledStyle.Line.LinePattern;

    // Adjust stroke width if it's too thin
    if (strokeWidth > 0 && strokeWidth < 1) {
      strokeWidth = 1;
    }

    const containerWidth = rect.width;
    const containerHeight = rect.height;

    // Set container and shape dimensions and position
    shapeContainer.SetSize(containerWidth, containerHeight);
    shapeContainer.SetPos(rect.x, rect.y);
    primaryShape.SetSize(containerWidth, containerHeight);

    let pathData: string;

    if (isSimpleShape) {
      points = ListManager.SegmentedLine.prototype.GetPolyPoints.call(
        this,
        ConstantData.Defines.NPOLYPTS,
        true,
        true,
        null
      );
      console.log("= S.ArcSegmentedLine - CreateShape - PolyPoints for simple shape:", points);

      pathData = this.UpdateSVG(primaryShape, points);
      console.log("= S.ArcSegmentedLine - CreateShape - Generated Path Data:", pathData);
    } else {
      points = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true);
      console.log("= S.ArcSegmentedLine - CreateShape - PolyPoints:", points);

      if (this.hoplist.nhops !== 0) {
        const hopData = GlobalData.optManager.InsertHops(this, points, points.length);
        points = points.slice(0, hopData.npts);
        console.log("= S.ArcSegmentedLine - CreateShape - Adjusted PolyPoints after hops:", points);
      }
      primaryShape.SetPoints(points);
    }

    // Apply styling to the primary shape
    primaryShape.SetFillColor("none");
    primaryShape.SetStrokeColor(strokeColor);
    primaryShape.SetStrokeOpacity(strokeOpacity);
    primaryShape.SetStrokeWidth(strokeWidth);
    if (containerWidth !== 0) {
      primaryShape.SetStrokePattern(strokePattern);
    }

    // Apply styling to the secondary shape
    secondaryShape.SetSize(containerWidth, containerHeight);
    if (isSimpleShape) {
      secondaryShape.SetPath(pathData);
    } else {
      secondaryShape.SetPoints(points);
    }
    secondaryShape.SetStrokeColor("white");
    secondaryShape.SetFillColor("none");
    secondaryShape.SetOpacity(0);
    if (flag) {
      secondaryShape.SetEventBehavior(Element.EventBehavior.HIDDEN_OUT);
    } else {
      secondaryShape.SetEventBehavior(Element.EventBehavior.NONE);
    }
    secondaryShape.SetStrokeWidth(strokeWidth + ConstantData.Defines.SED_Slop);

    // Assemble the shape container
    shapeContainer.AddElement(primaryShape);
    shapeContainer.AddElement(secondaryShape);
    this.ApplyStyles(primaryShape, styledStyle);
    this.ApplyEffects(shapeContainer, false, true);
    shapeContainer.isShape = true;
    this.AddIcons(context, shapeContainer);

    console.log("= S.ArcSegmentedLine - CreateShape - Output:", shapeContainer);
    return shapeContainer;
  }

  UpdateSVG(shape: any, points: any[]): string {
    console.log("= S.ArcSegmentedLine - UpdateSVG - Input:", { shape, points });

    const pathCreator = shape.PathCreator();
    pathCreator.BeginPath();
    pathCreator.MoveTo(points[0].x, points[0].y);

    // Initialize current point
    let currentX = points[0].x;
    let currentY = points[0].y;
    const totalPoints = points.length;

    // If there are only two points, draw a straight line
    if (totalPoints === 2) {
      pathCreator.LineTo(points[1].x, points[1].y);
    }

    // Process arcs for remaining points
    for (let index = 2; index < totalPoints; index++) {
      // Save the starting point before calculating new coordinates
      const prevX = currentX;
      const prevY = currentY;
      let arcRadiusX: number;
      let arcRadiusY: number;
      let sweepFlag: boolean;
      let diff: number;

      // If the previous segment is vertical
      if (points[index - 1].x === points[index].x) {
        if (index < totalPoints - 1) {
          currentY = (points[index - 1].y + points[index].y) / 2;
          arcRadiusY = Math.abs(points[index - 1].y - points[index].y) / 2;
        } else {
          arcRadiusY = Math.abs(currentY - points[index].y);
          currentY = points[index].y;
        }
        arcRadiusX = Math.abs(currentX - points[index].x);
        diff = currentY - prevY;
        // Update currentX to the new x coordinate
        currentX = points[index].x;
        const deltaX = currentX - prevX;
        sweepFlag = !((deltaX >= 0 && diff < 0) || (deltaX < 0 && diff >= 0));
      } else {
        // If the previous segment is not vertical
        if (index < totalPoints - 1) {
          arcRadiusX = Math.abs(points[index - 1].x - points[index].x) / 2;
          currentX = (points[index - 1].x + points[index].x) / 2;
        } else {
          arcRadiusX = Math.abs(currentX - points[index].x);
          currentX = points[index].x;
        }
        arcRadiusY = Math.abs(currentY - points[index].y);
        // Update currentY to the new y coordinate
        currentY = points[index].y;
        diff = currentY - prevY;
        const deltaX = currentX - prevX;
        sweepFlag = !((deltaX < 0 && diff < 0) || (deltaX >= 0 && diff >= 0));
      }

      pathCreator.ArcTo(currentX, currentY, arcRadiusX, arcRadiusY, 0, sweepFlag, false, false);
    }

    const pathData = pathCreator.ToString();
    shape.SetPath(pathData);
    console.log("= S.ArcSegmentedLine - UpdateSVG - Output:", { pathData });
    return pathData;
  }

  GetPolyPoints(
    numPoints: number,
    alreadyOffset: boolean,
    includeStart: boolean,
    flag: any,
    additional?: any
  ): Point[] {
    console.log("= S.ArcSegmentedLine - GetPolyPoints - Input:", {
      numPoints,
      alreadyOffset,
      includeStart,
      flag,
      additional,
    });

    let basePoints: Point[] = ListManager.SegmentedLine.prototype.GetPolyPoints.call(
      this,
      ConstantData.Defines.NPOLYPTS,
      true,
      true,
      false,
      null
    );
    const containerRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    let resultPoints: Point[] = [];

    // If the object is a simple line with no direction changes and has zero height/width
    if (
      this.segl.firstdir === 0 &&
      this.segl.lastdir === 0 &&
      (Utils2.IsEqual(containerRect.height, 0) || Utils2.IsEqual(containerRect.width, 0))
    ) {
      resultPoints = basePoints;
      if (!alreadyOffset) {
        for (let i = 0, len = resultPoints.length; i < len; i++) {
          resultPoints[i].x += containerRect.x;
          resultPoints[i].y += containerRect.y;
        }
      }
      console.log("= S.ArcSegmentedLine - GetPolyPoints - Output (early return):", resultPoints);
      return resultPoints;
    }

    if (this.segl && this.segl.pts.length) {
      let currentX = basePoints[0].x;
      let currentY = basePoints[0].y;
      const total = basePoints.length;
      if (includeStart) {
        resultPoints.push(new Point(currentX, currentY));
      }

      // Process points starting from the 3rd point
      for (let index = 2; index < total; index++) {
        const prevX = currentX;
        const prevY = currentY;
        let tempX = currentX;
        let tempY = currentY;
        let delta: number;
        let diff: number;
        let notClockwise: boolean;

        // If previous segment is vertical
        if (basePoints[index - 1].x === basePoints[index].x) {
          if (index < total - 1) {
            tempY = (basePoints[index - 1].y + basePoints[index].y) / 2;
            const arcRadiusY = Math.abs(basePoints[index - 1].y - basePoints[index].y) / 2;
          } else {
            const unused = Math.abs(tempY - basePoints[index].y);
            tempY = basePoints[index].y;
          }
          const arcRadiusX = Math.abs(currentX - basePoints[index].x);
          diff = tempY - prevY;
          currentX = basePoints[index].x;
          delta = currentX - prevX;
          notClockwise = !((delta >= 0 && diff < 0) || (delta < 0 && diff >= 0));
        } else {
          // If previous segment is not vertical
          if (index < total - 1) {
            const arcRadiusX = Math.abs(basePoints[index - 1].x - basePoints[index].x) / 2;
            tempX = (basePoints[index - 1].x + basePoints[index].x) / 2;
          } else {
            const unused = Math.abs(currentX - basePoints[index].x);
            tempX = basePoints[index].x;
          }
          const arcRadiusY = Math.abs(currentY - basePoints[index].y);
          diff = (currentY = basePoints[index].y) - prevY;
          currentX = tempX;
          delta = currentX - prevX;
          notClockwise = !((delta < 0 && diff < 0) || (delta >= 0 && diff >= 0));
        }

        // Depending on the includeStart flag, process the point differently
        if (includeStart) {
          const newPoint = new Point(currentX, currentY);
          newPoint.notclockwise = !notClockwise;
          resultPoints.push(newPoint);
        } else {
          GlobalData.optManager.EllipseToPoints(
            resultPoints,
            numPoints / 2,
            prevX,
            currentX,
            prevY,
            currentY,
            notClockwise
          );
        }
      }

      if (!alreadyOffset) {
        for (let i = 0, len = resultPoints.length; i < len; i++) {
          resultPoints[i].x += containerRect.x;
          resultPoints[i].y += containerRect.y;
        }
      }
    } else {
      resultPoints = ListManager.BaseLine.prototype.GetPolyPoints.call(this, numPoints, alreadyOffset, true, null);
    }

    console.log("= S.ArcSegmentedLine - GetPolyPoints - Output:", resultPoints);
    return resultPoints;
  }

  GetTextOnLineParams(event: any) {
    console.log("= S.ArcSegmentedLine - GetTextOnLineParams - input:", { event, segptsLength: this.segl.pts.length });

    // If the segmented line does not have exactly three points, fall back to parent implementation
    if (this.segl.pts.length !== 3) {
      const fallback = ListManager.SegmentedLine.prototype.GetTextOnLineParams.call(this, event);
      console.log("= S.ArcSegmentedLine - GetTextOnLineParams - output (fallback):", fallback);
      return fallback;
    }

    switch (this.TextAlign) {
      case ConstantData.TextAlign.TOPCENTER:
      case ConstantData.TextAlign.CENTER:
      case ConstantData.TextAlign.BOTTOMCENTER: {
        // Get poly points with formatted parameters
        const polyPoints = this.GetPolyPoints(22, false, false, false, null);

        // Initialize an array to hold text-related points
        const textPoints: Point[] = [];

        // Prepare parameters object for text positioning
        const params: {
          Frame: ListManager.Rect;
          StartPoint: Point;
          EndPoint: Point;
          CenterProp?: number;
        } = {
          Frame: new ListManager.Rect(),
          StartPoint: new Point(),
          EndPoint: new Point()
        };

        // Calculate the frame using two of the poly points
        params.Frame = Utils2.Pt2Rect(polyPoints[0], polyPoints[9]);

        // Calculate the angle between points[0] and points[9]
        const angle = GlobalData.optManager.SD_GetClockwiseAngleBetween2PointsInRadians(polyPoints[0], polyPoints[9]);

        // Collect the necessary points
        textPoints.push(new Point(polyPoints[0].x, polyPoints[0].y));
        textPoints.push(new Point(polyPoints[9].x, polyPoints[9].y));
        textPoints.push(new Point(polyPoints[7].x, polyPoints[7].y));

        // Rotate points about the frame center by the calculated angle
        Utils3.RotatePointsAboutCenter(params.Frame, angle, textPoints);

        // Adjust the y coordinates to be equal
        textPoints[0].y = textPoints[2].y;
        textPoints[1].y = textPoints[2].y;

        // Rotate points back by the negative angle
        Utils3.RotatePointsAboutCenter(params.Frame, -angle, textPoints);

        // Set start and end points for the text line
        params.StartPoint.x = textPoints[0].x;
        params.StartPoint.y = textPoints[0].y;
        params.EndPoint.x = textPoints[1].x;
        params.EndPoint.y = textPoints[1].y;
        params.CenterProp = 0.3;

        console.log("= S.ArcSegmentedLine - GetTextOnLineParams - output:", params);
        return params;
      }
      default: {
        const defaultResult = ListManager.SegmentedLine.prototype.GetTextOnLineParams.call(this, event);
        console.log("= S.ArcSegmentedLine - GetTextOnLineParams - output (default):", defaultResult);
        return defaultResult;
      }
    }
  }
}

export default ArcSegmentedLine
