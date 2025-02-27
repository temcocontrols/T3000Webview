

import ArcLine from "../../Shape/Shape.ArcLine"
import ArcSegmentedLine from "../../Shape/Shape.ArcSegmentedLine"
import BaseDrawingObject from "../../Shape/Shape.BaseDrawingObject"
import BaseLine from "../../Shape/Shape.BaseLine"
import BaseShape from "../../Shape/Shape.BaseShape"
import BaseSymbol from "../../Shape/Shape.BaseSymbol"
import BitmapSymbol from "../../Shape/Shape.BitmapSymbol"
import Connector from "../../Shape/Shape.Connector"
import D3Symbol from "../../Shape/Shape.D3Symbol"
import FreehandLine from "../../Shape/Shape.FreehandLine"
import GroupSymbol from "../../Shape/Shape.GroupSymbol"
import Line from "../../Shape/Shape.Line"
import Oval from "../../Shape/Shape.Oval"
import Polygon from "../../Shape/Shape.Polygon"
import PolyLine from "../../Shape/Shape.PolyLine"
import PolyLineContainer from "../../Shape/Shape.PolyLineContainer"
import Rect from "../../Shape/Shape.Rect"
import RRect from "../../Shape/Shape.RRect"
import SegmentedLine from "../../Shape/Shape.SegmentedLine"
import ShapeContainer from "../../Shape/Shape.ShapeContainer"
import SVGFragmentSymbol from "../../Shape/Shape.SVGFragmentSymbol"

const Shape = {
  ArcLine: null,
  ArcSegmentedLine: null,
  BaseDrawingObject: null,
  BaseLine: null,
  BaseShape: null,
  BaseSymbol: null,
  BitmapSymbol: null,
  Connector: null,
  D3Symbol: null,
  FreehandLine: null,
  GroupSymbol: null,
  Line: null,
  Oval: null,
  Polygon: null,
  PolyLine: null,
  PolyLineContainer: null,
  Rect: null,
  RRect: null,
  SegmentedLine: null,
  ShapeContainer: null,
  SVGFragmentSymbol: null
}

Shape.ArcLine = ArcLine;
Shape.ArcSegmentedLine = ArcSegmentedLine;
Shape.BaseDrawingObject = BaseDrawingObject;
Shape.BaseLine = BaseLine;
Shape.BaseShape = BaseShape;
Shape.BaseSymbol = BaseSymbol;
Shape.BitmapSymbol = BitmapSymbol;
Shape.Connector = Connector;
Shape.D3Symbol = D3Symbol;
Shape.FreehandLine = FreehandLine;
Shape.GroupSymbol = GroupSymbol;
Shape.Line = Line;
Shape.Oval = Oval;
Shape.Polygon = Polygon;
Shape.PolyLine = PolyLine;
Shape.PolyLineContainer = PolyLineContainer;
Shape.Rect = Rect;
Shape.RRect = RRect;
Shape.SegmentedLine = SegmentedLine;
Shape.ShapeContainer = ShapeContainer;
Shape.SVGFragmentSymbol = SVGFragmentSymbol;

export default Shape
