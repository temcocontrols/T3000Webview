
class BConstant {

  // B.Element.Style.ts

  static GradientStyle = {
    Linear: 'linear',
    Radial: 'radial',
    Radialfill: 'radialfill'
  }

  static GradientPos = {
    LeftTop: 'ltop',
    Top: 'top',
    RightTop: 'rtop',
    Right: 'right',
    RightBottom: 'rbottom',
    Bottom: 'bottom',
    LeftBottom: 'lbottom',
    Left: 'left',
    Center: 'center'
  }

  // B.Symbols.ts

  static Placeholder = {
    FillColor: '##FillColor',
    EndColor: '##EndColor',
    FillTrans: '##FillTrans',
    LineColor: '##LineColor',
    LineTrans: '##LineTrans',
    LineThick: '##LineThick',
    SolidFill: '##SolidFill',
    Terminator: '##'
  }

  static PlaceholderDefault = {
    '##FillColor': '#FFFFFF',
    '##EndColor': '#FFFFFF',
    '##FillTrans': 1,
    '##LineColor': '#000',
    '##LineTrans': 1,
    '##LineThick': 1,
    '##SolidFill': '#000'
  }
}

export default BConstant
