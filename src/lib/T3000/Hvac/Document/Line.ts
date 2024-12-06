
import Models from '../Model/Hvac.Models';
import * as Utils from '../Helper/Hvac.Utils';
import Point from '../Data/Point';

class Line {

  public StartPoint: { x: number; y: number };
  public EndPoint: { x: number; y: number };
  public FixedPoint: [number, number];
  public LineOrientation: any;
  public hoplist: { nhops: number; hops: any[] };
  public ArrowheadData: any[];
  public ShortRef: number;
  public shapeparam: number;
  public StartArrowID: number;
  public EndArrowID: number;
  public StartArrowDisp: boolean;
  public EndArrowDisp: boolean;
  public ArrowSizeIndex: number;
  public TextDirection: boolean;

  constructor(e: any = {}) {

    this.StartPoint = e.StartPoint || { x: 0, y: 0 };
    this.EndPoint = e.EndPoint || { x: 0, y: 0 };
    this.FixedPoint = e.FixedPoint || [0, 0];
    this.LineOrientation = e.LineOrientation;
    this.hoplist = e.hoplist || { nhops: 0, hops: [] };
    this.ArrowheadData = e.ArrowheadData || [];
    this.ShortRef = e.ShortRef || 0;
    this.shapeparam = e.shapeparam || 0;
    this.StartArrowID = e.StartArrowID || 0;
    this.EndArrowID = e.EndArrowID || 0;
    this.StartArrowDisp = e.StartArrowDisp || false;
    this.EndArrowDisp = e.EndArrowDisp || false;
    this.ArrowSizeIndex = e.ArrowSizeIndex || 0;
    this.TextDirection = e.TextDirection || false;
  }

  CreateShape = (shapeFactory, shapeParams) => {
    const shapeContainer = shapeFactory.CreateShape(Models.CreateShapeType.SHAPECONTAINER);

    const lineColor = '#000';
    const lineWidth = 1;
    const lineOpacity = '0.5';

    shapeContainer.SetSize(shapeParams.width, shapeParams.height);
    shapeContainer.SetPos(shapeParams.x, shapeParams.y);

    const lineShape = shapeFactory.CreateShape(Models.CreateShapeType.LINE);
    lineShape.SetSize(shapeParams.width, shapeParams.height);
    lineShape.SetPoints(
      this.StartPoint.x - shapeParams.x,
      this.StartPoint.y - shapeParams.y,
      this.EndPoint.x - shapeParams.x,
      this.EndPoint.y - shapeParams.y
    );

    lineShape.SetFillColor('none');
    lineShape.SetStrokeColor(lineColor);
    lineShape.SetStrokeOpacity(lineOpacity);
    lineShape.SetStrokeWidth(lineWidth);

    shapeContainer.AddElement(lineShape);

    return shapeContainer;
  }
}

export default Line;
