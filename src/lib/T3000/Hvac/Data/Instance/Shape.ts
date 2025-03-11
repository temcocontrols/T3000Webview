

import ArcLine from "../../Shape/S.ArcLine"
import ArcSegmentedLine from "../../Shape/S.ArcSegmentedLine"
import BaseDrawingObject from "../../Shape/S.BaseDrawingObject"
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
