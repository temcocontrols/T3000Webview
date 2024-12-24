

import Container from "../../Basic/Basic.Container"
// import Document from "../../Basic/Basic.Document"
import Effect from "../../Basic/Basic.Element.Effects"
import Style from "../../Basic/Basic.Element.Style"
import Element from "../../Basic/Basic.Element"
import Group from "../../Basic/Basic.Group"
import Image from "../../Basic/Basic.Image"
import Layer from "../../Basic/Basic.Layer"
import Line from "../../Basic/Basic.Line"
import Oval from "../../Basic/Basic.Oval"
import Creator from "../../Basic/Basic.Path.Creator"
import Path from "../../Basic/Basic.Path"
import Polygon from "../../Basic/Basic.Polygon"
import PolyLine from "../../Basic/Basic.PolyLine"
import PolyPolyLine from "../../Basic/Basic.PolyPolyLine"
import Rect from "../../Basic/Basic.Rect"
import RRect from "../../Basic/Basic.RRect"
import ShapeContainer from "../../Basic/Basic.ShapeContainer"
import ShapeCopy from "../../Basic/Basic.ShapeCopy"
import Symbol from "../../Basic/Basic.Symbol"
// import Diff from "../../Basic/Basic.Text.Diff"
import Edit from "../../Basic/Basic.Text.Edit"
// import Formatter from "../../Basic/Basic.Text.Formatter"
// import Spell from "../../Basic/Basic.Text.Spell"
// import Text from "../../Basic/Basic.Text"

const Basic = {
  Container: null,
  // Document: null,
  Effect: null,
  Style: null,
  Element: null,
  Group: null,
  Image: null,
  Layer: null,
  Line: null,
  Oval: null,
  Creator: null,
  Path: null,
  Polygon: null,
  PolyLine: null,
  PolyPolyLine: null,
  Rect: null,
  RRect: null,
  ShapeContainer: null,
  ShapeCopy: null,
  Symbol: null,
  // Diff: null,
  Edit: null,
  // Formatter: null,
  // Spell: null,
  // Text: null
}

Basic.Container = Container;
// Basic.Document = Document;
Basic.Effect = Effect;
Basic.Style = Style;
Basic.Element = Element;
Basic.Group = Group;
Basic.Image = Image;
Basic.Layer = Layer;
Basic.Line = Line;
Basic.Oval = Oval;
Basic.Creator = Creator;
Basic.Path = Path;
Basic.Polygon = Polygon;
Basic.PolyLine = PolyLine;
Basic.PolyPolyLine = PolyPolyLine;
Basic.Rect = Rect;
Basic.RRect = RRect;
Basic.ShapeContainer = ShapeContainer;
Basic.ShapeCopy = ShapeCopy;
Basic.Symbol = Symbol;
// Basic.Diff = Diff;
Basic.Edit = Edit;
// Basic.Formatter = Formatter;
// Basic.Spell = Spell;
// Basic.Text = Text;

export default Basic
