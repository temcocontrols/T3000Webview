

 import Point from "../Model/Point"
 import BaseLine from "./Shape.BaseLine"

class Line extends BaseLine {

  public StartPoint: Point;
  public EndPoint: Point;
  public FixedPoint: number[];
  public LineOrientation: number;
  public hoplist: any;
  public ArrowheadData: any[];
  public ShortRef: number;
  public shapeparam: number;
  public StartArrowID: number;
  public EndArrowID: number;
  public StartArrowDisp: boolean;
  public EndArrowDisp: boolean;
  public ArrowSizeIndex: number;
  public TextDirection: boolean;

}

export default Line
