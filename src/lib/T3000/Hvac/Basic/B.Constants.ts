
class BasicConstants {

  // Basic.Element.Style.ts

  static GradientStyle = {
    LINEAR: 'linear',
    RADIAL: 'radial',
    RADIALFILL: 'radialfill'
  }

  static GradientPos = {
    LEFTTOP: 'ltop',
    TOP: 'top',
    RIGHTTOP: 'rtop',
    RIGHT: 'right',
    RIGHTBOTTOM: 'rbottom',
    BOTTOM: 'bottom',
    LEFTBOTTOM: 'lbottom',
    LEFT: 'left',
    CENTER: 'center'
  }

  // Basic.Symbols.ts

  static Placeholder = {
    FillColor: '##FILLCOLOR',
    EndColor: '##ENDCOLOR',
    FillTrans: '##FILLTRANS',
    LineColor: '##LINECOLOR',
    LineTrans: '##LINETRANS',
    LineThick: '##LINETHICK',
    SolidFill: '##SOLIDFILL',
    Terminator: '##'
  }

  static PlaceholderDefaults = {
    '##FILLCOLOR': '#FFFFFF',
    '##ENDCOLOR': '#FFFFFF',
    '##FILLTRANS': 1,
    '##LINECOLOR': '#000',
    '##LINETRANS': 1,
    '##LINETHICK': 1,
    '##SOLIDFILL': '#000'
  }
}

export default BasicConstants
