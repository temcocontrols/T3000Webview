

import StyleConstant from "../../Data/Constant/StyleConstant"
import TextConstant from "../../Data/Constant/TextConstant"
import T3DataStream from "../../Util/T3DataStream"
import DSUtil from "./DSUtil"


/**
 * @class DSConstant
 * @description A static utility class providing constants and structural definitions for the T3000 HVAC drawing system.
 *
 * This class contains various constants used throughout the drawing system, including:
 * - Line tool type definitions
 * - SDF (Standard Drawing Format) flags
 * - Line pattern data for different line styles
 * - Window line pattern styles
 * - Polygon flags and segment flags
 * - Context types for different drawing modes
 * - Link flags for connecting objects
 * - Library flags for managing symbol libraries
 * - Operation code mappings for file parsing
 * - Fill types, color indexes, and shadow styles
 * - Line direction flags and platform identifiers
 * - Font family definitions and print flags
 * - Binary structure definitions for various drawing elements
 *
 * These constants are used for parsing and rendering drawings, managing object properties,
 * and controlling the behavior of drawing tools and file operations.
 *
 * @example
 * // Access line pattern data for a dashed line
 * const dashedLinePattern = DSConstant.LinePatternData[3]; // '3,1,1,1'
 *
 * // Check if a code is a begin block using SDF flags
 * const isBeginBlock = (code & DSConstant.SDF_BEGIN) === DSConstant.SDF_BEGIN;
 *
 * // Look up an operation code name
 * const opName = DSConstant.OpCodeName[32770]; // 'cHeader'
 *
 * // Get structure definition for binary parsing
 * const drawObjStruct = DSConstant.DrawObj8Struct;
 */
class DSConstant {

  static LineToolTypes = {
    StraightLine: 'line',
    ArcLine: 'arcLine',
    ArcSegmentedLine: 'arcSegLine',
    SegmentedLine: 'segLine',
    PolyLine: 'polyLine',
    PolyLineContainer: 'polyLineContainer',
    MoveWall: 'moveWall',
    CommLine: 'commline',
    DigiLine: 'digiline',
    FreehandLine: 'freehandLine'
  }

  static SDF_BEGIN = 32768
  static SDF_MASK = -49153
  static SDF_END = 16384

  /**
   * Defines pattern data for different line styles
   * Each entry represents a pattern of dashes and spaces
   * The first value (0) represents a solid line
   * Other entries are comma-separated values indicating lengths of dashes and gaps in sequence
   * Used for rendering different line types in drawing applications
   */
  static LinePatternData = [
    0,
    '1,1',       // Dotted line (equal dash and gap lengths)
    '3,1',       // Dashed line (dash three times longer than gap)
    '3,1,1,1',   // Dash-dot line (long dash followed by short dash)
    '3,1,1,1,1,1' // Dash-dot-dot line (long dash followed by two short dashes)
  ]

  static WinLinePatterns = {
    SEP_None: 0,
    SEP_Solid: 1,
    SEP_Dotted: 2,
    SEP_Dashed: 3,
    SEP_DDashed: 4,
    SEP_DDDashed: 5,
    SEP_DoubleLine: 6,
    SEP_FilledLine: 7
  }

  static PolyListFlags = {
    SD_PLF_FreeHand: 1,
    SD_PLF_OneStep: 2,
    SD_PLF_NoMiddleControlPoints: 4,
    SD_PLF_TimelineControlPoint: 8,
    SD_PLF_NoControl: 16,
    SD_PLF_WasExplict: 32,
    SD_PLF_HasMoveTo: 64,
    SD_PLF_HasPolyPoly: 128
  }

  static PolySegFlags = {
    SD_PLS_Select: 1,
    SD_PLS_Hide: 2,
    SD_PLS_Temp: 4,
    SD_PLS_TempSave: 8,
    SD_PLS_VA: 16,
    SD_PLS_NVA: 32,
    SD_PLS_NoLine: 64,
    SD_PLS_NoFill: 128
  }

  static SDGHatchStyleTotal = 53

  static Contexts = {
    None: - 1,
    All: 0,
    Text: 1,
    Table: 2,
    Automation: 3,
    DimensionText: 4,
    FloorPlan: 5,
    Note: 6,
    Navigation: 7,
    AutomationNoCtrl: 8,
    ReadOnly: 9
  }

  static LinkFlags = {
    SED_L_DELT: 1,
    SED_L_DELL: 2,
    SED_L_CHANGE: 4,
    SED_L_BREAK: 8,
    SED_L_MOVE: 16,
    SED_L_WASMOVE: 32
  }

  static LibraryFlags = {
    SEDL_NoColor: 1,
    SEDL_Auto: 2,
    SEDL_NoSize: 4,
    SEDL_Scale: 8,
    SEDL_NoAttach: 16,
    SEDL_JPG: 32,
    SEDL_PNG: 64,
    SEDL_DropOnBorder: 128,
    SEDL_DropOnTable: 256,
    SEDL_Virtual: 512,
    SEDL_Bad: 1024,
    SEDL_NoLinking: 2048,
    SEDL_Planning: 4096,
    SEDL_NoTarget: 8192
  }

  static OpNameCode = {
    cVersion: 32769,
    cEndFile: 16385,
    cHeader: 32770,
    cHeaderEnd: 16386,
    cPage: 3,
    cWdeVMode: 4,
    cPrintErst: 5,
    cFontList: 32774,
    cFontListEnd: 16390,
    cFontName: 7,
    cColorTable: 8,
    cThumbnail: 9,
    cToolBarPath: 10,
    cLicense: 11,
    cAdvisor: 12,
    cPanelInfo: 13,
    cCThumbnail: 14,
    cKeyWords: 15,
    cAdvisorUrl: 16,
    cDocProperty: 17,
    cExportPath: 18,
    cProppWord: 19,
    cRunscriptPath: 20,
    cLibList7: 32789,
    cLibList7End: 16405,
    cLibList7Entry: 22,
    cLibList7Path: 23,
    cLibList: 32933,
    cLibListEnd: 16549,
    cLibListEntry: 166,
    cLibListPath: 167,
    cWizList: 32792,
    cWizListEnd: 16408,
    cWizListName: 25,
    cDimFont: 26,
    cOneStepFolder: 27,
    cTrialData: 28,
    cCmsData: 29,
    cDraw: 32800,
    cDrawEnd: 16416,
    cDrawGroup: 32801,
    cDrawGroupEnd: 16417,
    cDrawObj: 32802,
    cDrawObjEnd: 16418,
    cDrawFill: 35,
    cDrawBorder: 36,
    cDrawLine: 37,
    cDrawText: 38,
    cDrawSegl: 39,
    cDrawHook: 40,
    cDrawLink6: 41,
    cDrawJump: 48,
    cDrawPoly: 32817,
    cDrawPolyEnd: 16433,
    cDrawPolySeg: 50,
    cDrawArray: 32819,
    cDrawArrayEnd: 16435,
    cDrawArrayHook: 52,
    cDrawExtra: 53,
    cDrawObj5: 54,
    cDrawObj6: 55,
    cBeginLayer: 32824,
    cEndLayer: 16440,
    cLayerFlags: 57,
    cLayerName: 58,
    cDrawLink: 59,
    cDrawObj7: 60,
    cConnectPoint: 61,
    cDraw7: 62,
    cDrawTxScale: 63,
    cText: 32832,
    cTextEnd: 16448,
    cLongText: 32842,
    cLongTextEnd: 16448,
    cTextChar: 65,
    cTextRun: 66,
    cTextStyle: 67,
    cTextLink: 68,
    cTextData: 69,
    cDrawImage: 71,
    cDrawBitmap: 72,
    cDrawMeta: 73,
    cLayerType: 74,
    cDrawArrayText: 75,
    cArrowMeta: 80,
    cOleHeader: 81,
    cOleStorage: 82,
    cTable: 32851,
    cTableEnd: 16467,
    cTableRow: 84,
    cTableCell: 85,
    cInstSize: 86,
    cTLicense: 87,
    cDrawPng: 88,
    cDrawJpg: 89,
    cNativeStorage: 90,
    cTableCellProp: 91,
    cDrawBtxScale: 92,
    cDefLbtxScale: 93,
    cDefSbtxScale: 94,
    cDeftxScale: 95,
    cHiliteList: 32864,
    cHiliteListEnd: 16480,
    cHilite: 97,
    cProperty: 112,
    cBeginPrLang: 32881,
    cEndPrLang: 16497,
    cPrLangName: 114,
    cPrScript: 115,
    cPrfScript: 116,
    cPrInclude: 121,
    cPrExtra: 122,
    cPrPublic: 123,
    cPrExtra1: 124,
    cPrLangExt: 125,
    cPrLangRec: 126,
    cPrLangSchema: 127,
    cBeginPrField: 32885,
    cEndPrField: 16501,
    cPrFieldName: 118,
    cPrFieldValue: 119,
    cPrFieldHead: 120,
    cPrFieldVlist: 128,
    cBeginPhotoProp: 32896,
    cEndPhotoProp: 16512,
    cBeginFill: 32897,
    cEndFill: 16513,
    cBeginLine: 32898,
    cEndLine: 16514,
    cBeginTextf: 32899,
    cEndTextf: 16515,
    cBeginPaint: 32907,
    cEndPaint: 16523,
    cBeginStyleList: 32905,
    cEndStyleList: 16521,
    cBeginStyle: 32906,
    cEndStyle: 16522,
    cBeginTheme: 32908,
    cEndTheme: 16524,
    cGraphStyle: 151,
    cGradient: 132,
    cTexture: 133,
    cHatch: 134,
    cEffect1: 135,
    cOutSide1: 136,
    cFilledLine: 137,
    cThemeColor: 141,
    cThemeTexture: 142,
    cThemeFont: 143,
    cOutSide: 161,
    cThemeCat: 162,
    cEffect: 163,
    cDescription: 164,
    cDraw8: 32944,
    cDraw8End: 16560,
    cDrawObj8: 32945,
    cDrawObj8End: 16561,
    cDrawArrow: 178,
    cLongText8: 32947,
    cLongText8End: 16563,
    cComment: 32983,
    cCommentEnd: 16599,
    cTableCell8: 180,
    cDrawImage8: 185,
    cBeginHLine: 32949,
    cBeginVLine: 32950,
    cBeginNameTextf: 32951,
    cGuide: 184,
    cTaskPanel: 186,
    cTableCellExtRaold: 187,
    cHeadUiInfo: 188,
    cTableCellExtra: 189,
    cBeginOutSideList: 32958,
    cEndOutsideList: 16574,
    cBeginInsideList: 32959,
    cEndInsideList: 16575,
    cInsideEffect: 192,
    cBeginGradientList: 32967,
    cEndGradientList: 16583,
    cThemeGradient: 200,
    cInk: 193,
    cInkPenImage: 194,
    cInkHighlightImage: 195,
    cGraph: 32979,
    cGraphEnd: 16595,
    cGraphAxis: 212,
    cGraphTitle: 201,
    cGraphLabel: 202,
    cGraphLegendBegin: 32971,
    cGraphLegendEnd: 16587,
    cGraphLegend: 204,
    cGraphPoint: 205,
    cSdData: 209,
    cSdData64: 227,
    cDefaultLibs: 197,
    cOrigTemplate: 198,
    cOrgChartTable: 199,
    cObjData: 210,
    cCellStyleName: 213,
    cLeftPanelInfo: 214,
    cTimeLineInfo: 215,
    cPolySegExplicitPoints: 216,
    cMarkUp: 32985,
    cMarkUpEnd: 16601,
    cNativeEmbedStorage: 218,
    cFontName12: 219,
    cFontName15: 238,
    cBeginTheme12: 32988,
    cEndTheme12: 16604,
    cThemeFont12: 221,
    cGraphStyle12: 222,
    cDraw12: 32991,
    cDraw12End: 16607,
    cTableVp: 32993,
    cTableVpEnd: 16609,
    cTableRowVp: 226,
    cLayerList: 239,
    cNativeId: 240,
    cNativeBlock: 241,
    cNativeWinBlock: 242,
    cImageId: 243,
    cImageBlock: 244,
    cTableId: 245,
    cTableBlock: 246,
    cNoteId: 247,
    oRuler: 2049,
    cDrawSvg: 236,
    cEmfHash: 237,
    cSvgFragmentId: 248,
    cRichGradient: 249,
    cRichGradientStop: 250,
    cBlockDirectory: 251,
    cDrawPreviewPng: 252,
    cEmfId: 253,
    cEmfBlock: 254,
    cSymbolName: 258,
    cGanttInfo: 259,
    cOleStorageId: 255,
    cGraphId: 256,
    cGraphBlock: 257,
    cGanttInfoId: 260,
    cGanttInfoBlock: 261,
    cSdData64c: 262,
    cD3Settings: 263,
    cExpandedViewId: 264,
    cExpandedViewBlock: 265,
    cExpandedView: 266,
    cSvgImageId: 267,
    cLineDrawList: 268,
    cCloudCommentBlock: 270,
    cSymbolSearchString: 271,
    cSearchLib: 33040,
    cSearchLibEnd: 16656,
    cSearchLibId: 273,
    cSearchLibName: 274,
    cSearchLibSymbolId: 275,
    cSearchLibSymbolName: 276,
    cLibCollapsed: 277,
    cCurrentSymbolId: 278,
    cLibListSearchResultId: 279,
    cSearchLibCollapsed: 280,
    cDrawContainer: 33049,
    cDrawContainerEnd: 16665,
    cDrawContainerHook: 282,
    cImageUrl: 283,
    cBusinessModule: 284,
    cRecentSymbolsBegin: 33053,
    cRecentSymbolsEnd: 16669,
    cRecentSymbolId: 286,
    cRecentSymbolName: 287,
    cSearchLibHidden: 288,
    cToolPalettesBegin: 33057,
    cToolPalettesEnd: 16673,
    cToolPalettesName: 290,
    cToolPalettesCollapsed: 291,
    cRecentSymbolNoMenu: 292,
    cBusinessNameStr: 293,
    cLibListGuid: 294,
    cParentPageId: 295,
    cFreeHandLine: 296,
    oTextureList: 34934,
    oTextureListEnd: 17526,
    oTexture: 2167,
    oTextureName: 2168,
    oTextureData: 2169,
    oTextureCatName: 2177,
    oTextureExtra: 2178
  }

  static OpCodeName = {
    32769: 'cVersion',
    16385: 'cEndFile',
    32770: 'cHeader',
    16386: 'cHeaderEnd',
    3: 'cPage',
    4: 'cWdeVMode',
    5: 'cPrintErst',
    32774: 'cFontList',
    16390: 'cFontListEnd',
    7: 'cFontName',
    8: 'cColorTable',
    9: 'cThumbnail',
    10: 'cToolBarPath',
    11: 'cLicense',
    12: 'cAdvisor',
    13: 'cPanelInfo',
    14: 'cCThumbnail',
    15: 'cKeyWords',
    16: 'cAdvisorUrl',
    17: 'cDocProperty',
    18: 'cExportPath',
    19: 'cProppWord',
    20: 'cRunscriptPath',
    32789: 'cLibList7',
    16405: 'cLibList7End',
    22: 'cLibList7Entry',
    23: 'cLibList7Path',
    32933: 'cLibList',
    16549: 'cLibListEnd',
    166: 'cLibListEntry',
    167: 'cLibListPath',
    32792: 'cWizList',
    16408: 'cWizListEnd',
    25: 'cWizListName',
    26: 'cDimFont',
    27: 'cOneStepFolder',
    28: 'cTrialData',
    29: 'cCmsData',
    32800: 'cDraw',
    16416: 'cDrawEnd',
    32801: 'cDrawGroup',
    16417: 'cDrawGroupEnd',
    32802: 'cDrawObj',
    16418: 'cDrawObjEnd',
    35: 'cDrawFill',
    36: 'cDrawBorder',
    37: 'cDrawLine',
    38: 'cDrawText',
    39: 'cDrawSegl',
    40: 'cDrawHook',
    41: 'cDrawLink6',
    48: 'cDrawJump',
    32817: 'cDrawPoly',
    16433: 'cDrawPolyEnd',
    50: 'cDrawPolySeg',
    32819: 'cDrawArray',
    16435: 'cDrawArrayEnd',
    52: 'cDrawArrayHook',
    53: 'cDrawExtra',
    54: 'cDrawObj5',
    55: 'cDrawObj6',
    32824: 'cBeginLayer',
    16440: 'cEndLayer',
    57: 'cLayerFlags',
    58: 'cLayerName',
    59: 'cDrawLink',
    60: 'cDrawObj7',
    61: 'cConnectPoint',
    62: 'cDraw7',
    63: 'cDrawTxScale',
    32832: 'cText',
    16448: 'cTextEnd',
    32842: 'cLongText',
    65: 'cTextChar',
    66: 'cTextRun',
    67: 'cTextStyle',
    68: 'cTextLink',
    69: 'cTextData',
    71: 'cDrawImage',
    72: 'cDrawBitmap',
    73: 'cDrawMeta',
    74: 'cLayerType',
    75: 'cDrawArrayText',
    80: 'cArrowMeta',
    81: 'cOleHeader',
    82: 'cOleStorage',
    32851: 'cTable',
    16467: 'cTableEnd',
    84: 'cTableRow',
    85: 'cTableCell',
    86: 'cInstSize',
    87: 'cTLicense',
    88: 'cDrawPng',
    89: 'cDrawJpg',
    90: 'cNativeStorage',
    91: 'cTableCellProp',
    92: 'cDrawBtxScale',
    93: 'cDefLbtxScale',
    94: 'cDefSbtxScale',
    95: 'cDeftxScale',
    32864: 'cHiliteList',
    16480: 'cHiliteListEnd',
    97: 'cHilite',
    112: 'cProperty',
    32881: 'cBeginPrLang',
    16497: 'cEndPrLang',
    114: 'cPrLangName',
    115: 'cPrScript',
    116: 'cPrfScript',
    121: 'cPrInclude',
    122: 'cPrExtra',
    123: 'cPrPublic',
    124: 'cPrExtra1',
    125: 'cPrLangExt',
    126: 'cPrLangRec',
    127: 'cPrLangSchema',
    32885: 'cBeginPrField',
    16501: 'cEndPrField',
    118: 'cPrFieldName',
    119: 'cPrFieldValue',
    120: 'cPrFieldHead',
    128: 'cPrFieldVlist',
    32896: 'cBeginPhotoProp',
    16512: 'cEndPhotoProp',
    32897: 'cBeginFill',
    16513: 'cEndFill',
    32898: 'cBeginLine',
    16514: 'cEndLine',
    32899: 'cBeginTextf',
    16515: 'cEndTextf',
    32907: 'cBeginPaint',
    16523: 'cEndPaint',
    32905: 'cBeginStyleList',
    16521: 'cEndStyleList',
    32906: 'cBeginStyle',
    16522: 'cEndStyle',
    32908: 'cBeginTheme',
    16524: 'cEndTheme',
    151: 'cGraphStyle',
    132: 'cGradient',
    133: 'cTexture',
    134: 'cHatch',
    135: 'cEffect1',
    136: 'cOutSide1',
    137: 'cFilledLine',
    141: 'cThemeColor',
    142: 'cThemeTexture',
    143: 'cThemeFont',
    161: 'cOutSide',
    162: 'cThemeCat',
    163: 'cEffect',
    164: 'cDescription',
    32944: 'cDraw8',
    16560: 'cDraw8End',
    32945: 'cDrawObj8',
    16561: 'cDrawObj8End',
    178: 'cDrawArrow',
    32947: 'cLongText8',
    16563: 'cLongText8End',
    32983: 'cComment',
    16599: 'cCommentEnd',
    180: 'cTableCell8',
    185: 'cDrawImage8',
    32949: 'cBeginHLine',
    32950: 'cBeginVLine',
    32951: 'cBeginNameTextf',
    184: 'cGuide',
    186: 'cTaskPanel',
    187: 'cTableCellExtRaold',
    188: 'cHeadUiInfo',
    189: 'cTableCellExtra',
    32958: 'cBeginOutSideList',
    16574: 'cEndOutsideList',
    32959: 'cBeginInsideList',
    16575: 'cEndInsideList',
    192: 'cInsideEffect',
    32967: 'cBeginGradientList',
    16583: 'cEndGradientList',
    200: 'cThemeGradient',
    193: 'cInk',
    194: 'cInkPenImage',
    195: 'cInkHighlightImage',
    32979: 'cGraph',
    16595: 'cGraphEnd',
    212: 'cGraphAxis',
    201: 'cGraphTitle',
    202: 'cGraphLabel',
    32971: 'cGraphLegendBegin',
    16587: 'cGraphLegendEnd',
    204: 'cGraphLegend',
    205: 'cGraphPoint',
    209: 'cSdData',
    227: 'cSdData64',
    197: 'cDefaultLibs',
    198: 'cOrigTemplate',
    199: 'cOrgChartTable',
    210: 'cObjData',
    213: 'cCellStyleName',
    214: 'cLeftPanelInfo',
    215: 'cTimeLineInfo',
    216: 'cPolySegExplicitPoints',
    32985: 'cMarkUp',
    16601: 'cMarkUpEnd',
    218: 'cNativeEmbedStorage',
    219: 'cFontName12',
    32988: 'cBeginTheme12',
    16604: 'cEndTheme12',
    221: 'cThemeFont12',
    222: 'cGraphStyle12',
    32991: 'cDraw12',
    16607: 'cDraw12End',
    32993: 'cTableVp',
    16609: 'cTableVpEnd',
    226: 'cTableRowVp',
    2049: 'oRuler',
    236: 'cDrawSvg',
    237: 'cEmfHash',
    238: 'cFontName15',
    239: 'cLayerList',
    240: 'cNativeId',
    241: 'cNativeBlock',
    242: 'cNativeWinBlock',
    243: 'cImageId',
    244: 'cImageBlock',
    245: 'cTableId',
    246: 'cTableBlock',
    247: 'cNoteId',
    248: 'cSvgFragmentId',
    249: 'cRichGradient',
    250: 'cRichGradientStop',
    251: 'cBlockDirectory',
    252: 'cDrawPreviewPng',
    253: 'cEmfId',
    254: 'cEmfBlock',
    255: 'cOleStorageId',
    256: 'cGraphId',
    257: 'cGraphBlock',
    258: 'cSymbolName',
    259: 'cGanttInfo',
    260: 'cGanttInfoId',
    261: 'cGanttInfoBlock',
    262: 'cSdData64c',
    263: 'cD3Settings',
    264: 'cExpandedViewId',
    265: 'cExpandedViewBlock',
    266: 'cExpandedView',
    267: 'cSvgImageId',
    268: 'cLineDrawList',
    // 270: 'cCloudCommentBlock',
    271: 'cSymbolSearchString',
    33040: 'cSearchLib',
    16656: 'cSearchLibEnd',
    273: 'cSearchLibId',
    274: 'cSearchLibName',
    275: 'cSearchLibSymbolId',
    276: 'cSearchLibSymbolName',
    277: 'cLibCollapsed',
    278: 'cCurrentSymbolId',
    279: 'cLibListSearchResultId',
    280: 'cSearchLibCollapsed',
    33049: 'cDrawContainer',
    16665: 'cDrawContainerEnd',
    282: 'cDrawContainerHook',
    283: 'cImageUrl',
    284: 'cBusinessModule',
    33053: 'cRecentSymbolsBegin',
    16669: 'cRecentSymbolsEnd',
    286: 'cRecentSymbolId',
    287: 'cRecentSymbolName',
    288: 'cSearchLibHidden',
    33057: 'cToolPalettesBegin',
    16673: 'cToolPalettesEnd',
    290: 'cToolPalettesName',
    291: 'cToolPalettesCollapsed',
    292: 'cRecentSymbolNoMenu',
    293: 'cBusinessNameStr',
    294: 'cLibListGuid',
    295: 'cParentPageId',
    296: 'cFreeHandLine',
    34934: 'oTextureList',
    17526: 'oTextureListEnd',
    2167: 'oTexture',
    2168: 'oTextureName',
    2169: 'oTextureData',
    2177: 'oTextureCatName',
    2178: 'oTextureExtra'
  }

  static SDRFillTypes = {
    Transparent: 0,
    Solid: 1,
    Gradient: 2,
    Texture: 3,
    Image: 4
  }

  static v6ColorIndexes = {
    Std_BorderIndex: 0,
    Std_LineIndex: 1,
    Std_FillIndex: 2,
    Std_TextIndex: 3,
    Std_ShadowIndex: 4,
    Std_BackIndex: 5,
    Std_HiliteIndex: 6
  }

  static v6ShadowStyles = {
    SED_Sh_None: 0,
    SED_Sh_RLine: 1,
    SED_Sh_SLine: 2,
    SED_Sh_Cont: 3,
    SED_Sh_Drop: 4,
    SED_Sh_FDrop: 5
  }

  // static SDRObjectFlags = {
  //   Select: 1,
  //   Hide: 2,
  //   Erase: 4,
  //   EraseOnGrow: 8,
  //   Lock: 16,
  //   Spare: 32,
  //   ImageShape: 64,
  //   Bounds: 128,
  //   ImageOnly: 256,
  //   TextOnly: 512,
  //   NoPen: 1024,
  //   IsTarget: 2048,
  //   InList: 4096,
  //   Assoc: 8192,
  //   Obj1: 16384,
  //   ContConn: 32768,
  //   HUnGroup: 65536,
  //   UseConnect: 131072,
  //   DropOnBorder: 262144,
  //   DropOnTable: 524288,
  //   LineHop: 1048576,
  //   LineMod: 2097152,
  //   SEDO_LinkCenter: 4194304,
  //   MetaObject: 8388608,
  //   NoLinking: 16777216,
  //   PrintTrans: 33554432,
  //   HasTransImage: 67108864,
  //   AllowDropImage: 134217728,
  //   NotVisible: 268435456,
  //   NoMaintainLink: 536870912,
  //   AllowMetaColor: 1073741824,
  //   HideThumbnail: 2147483648
  // }

  // static ObjectTypes = {
  //   SED_Shape: 0,
  //   SED_LineD: 1,
  //   SED_SegL: 2,
  //   SED_Array: 3,
  //   SED_PolyL: 4,
  //   SED_NURBS: 501,
  //   SED_NURBSSEG: 502,
  //   SED_ELLIPSE: 503,
  //   SED_ELLIPSEEND: 504,
  //   SED_QUADBEZ: 505,
  //   SED_QUADBEZCON: 506,
  //   SED_CUBEBEZ: 507,
  //   SED_CUBEBEZCON: 508,
  //   SED_SPLINE: 509,
  //   SED_SPLINECON: 510,
  //   SED_MOVETO: 600,
  //   SED_MOVETO_NEWPOLY: 601,
  //   SED_Freehand: 7
  // }

  static v6FillTypes = {
    SEHollowIndex: 0,
    SEOpaqueIndex: 1
  }

  static LineDirFlags = {
    SED_LT_SLeft: 0,
    SED_LT_STop: 4,
    SED_LT_SRight: 8,
    SED_LT_SBottom: 12,
    SED_LT_ELeft: 0,
    SED_LT_ETop: 1,
    SED_LT_ERight: 2,
    SED_LT_EBottom: 3
  }

  static Platforms = {
    SDF_WIN31: 1,
    SDF_WIN32: 2,
    SDF_MAC68: 3,
    SDF_PREVIEWWIN32: 4,
    SDF_WIN32_VISIO: 5,
    SDF_SDJS: 6,
    SDF_SDJSBLOCK: 7,
    SDF_VISIO: 8,
    SDF_WIN32BLOCK: 9,
    SDF_VISIOLUCID: 10
  }

  static SDWFileDir = {
    dir_text: 114
  }

  static FontFamily = {
    FF_ROMAN: 16,
    FF_SWISS: 32,
    FF_MODERN: 48,
    FF_SCRIPT: 64,
    FF_DECORATIVE: 80
  }

  static PrintFlags = {
    SEP_Printing: 1,
    SEP_PrintInk: 2,
    SEP_Header: 4,
    SEP_OnePage: 8,
    SEP_Overlap: 16,
    SEP_PrintGrid: 32,
    SEP_ScaleUp: 64,
    SEP_MinMarg: 128,
    SEP_PrintAsBitmap: 256,
    SEP_PrintComments: 512,
    SEP_CustomPageSize: 1024,
    SEP_FitToScale: 2048
  }

  static GrowCodes = {
    SED_OG_All: 0,
    SED_OG_Horiz: 1,
    SED_OG_Vert: 2,
    SED_OG_Prop: 3
  }

  static ArrowMasks = {
    ARROW_T_MASK: 255,
    ARROW_DISP: 256
  }

  static SED_NParaPts = 100
  static SDF_MAXCONNECT = 20
  static Std_ONStyleColors = 7
  static Signature = '00000000'

  static PointStruct = [
    'x',        // X coordinate
    'int16',    // 16-bit signed integer
    'y',        // Y coordinate
    'int16'     // 16-bit signed integer
  ]

  /**
   * Structure definition for a 2D point with 32-bit integer coordinates
   * Used for storing coordinate data with higher precision than PointStruct
   * Each point consists of x and y integer values (32-bit)
   * This structure is typically used for positioning elements in large drawing spaces
   */
  static LPointStruct = [
    'x',        // X coordinate
    'int32',    // 32-bit signed integer
    'y',        // Y coordinate
    'int32'     // 32-bit signed integer
  ]

  static DPointStruct = [
    'x',
    'float64',
    'y',
    'float64'
  ]

  static RectStruct = [
    'left',
    'int16',
    'top',
    'int16',
    'right',
    'int16',
    'bottom',
    'int16'
  ]

  static LRectStruct = [
    'left',
    'int32',
    'top',
    'int32',
    'right',
    'int32',
    'bottom',
    'int32'
  ]

  static DRectStruct = [
    'left',
    'float64',
    'top',
    'float64',
    'right',
    'float64',
    'bottom',
    'float64'
  ]

  static DCRectStruct = [
    'x',
    'float64',
    'y',
    'float64',
    'width',
    'float64',
    'height',
    'float64'
  ]

  static LOGFontStruct = [
    'lfHeight',
    'int32',
    'lfWidth',
    'int32',
    'lfEscapement',
    'int32',
    'lfOrientation',
    'int32',
    'lfWeight',
    'int32',
    'lfItalic',
    'uint8',
    'lfUnderline',
    'uint8',
    'lfStrikeOut',
    'uint8',
    'lfCharSet',
    'uint8',
    'lfOutPrecision',
    'uint8',
    'lfClipPrecision',
    'uint8',
    'lfQuality',
    'uint8',
    'lfPitchAndFamily',
    'uint8',
    'lfFaceName',
    'u16stringle:64'
  ]

  static LOGFontStructPreV1 = [
    'lfHeight',
    'int32',
    'lfWidth',
    'int32',
    'lfEscapement',
    'int32',
    'lfOrientation',
    'int32',
    'lfWeight',
    'int32',
    'lfItalic',
    'uint8',
    'lfUnderline',
    'uint8',
    'lfStrikeOut',
    'uint8',
    'lfCharSet',
    'uint8',
    'lfOutPrecision',
    'uint8',
    'lfClipPrecision',
    'uint8',
    'lfQuality',
    'uint8',
    'lfPitchAndFamily',
    'uint8',
    'lfFaceName',
    'string:64'
  ]

  static VersionStruct = [
    'FVersion',
    'uint16',
    'PVersion',
    'uint16',
    'Platform',
    'uint16',
    'MinVer',
    'uint16',
    'printres',
    'uint16',
    'drawres',
    'uint16',
    'LongFormat',
    'uint16',
    'TrialVersion',
    'uint16',
    'Unicode',
    'uint16'
  ]

  static BlockHeaderStruct = [
    'state',
    'int32',
    'delta',
    'int32',
    'action',
    'int32',
    'blocktype',
    'int32',
    'blockid',
    'int32',
    'index',
    'int32',
    'nblocks',
    'int32'
  ]

  static HeaderStruct = [
    'flags',
    'uint16',
    'worigin',
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.PointStruct)
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.PointStruct, value)
      }
    },
    'wscale',
    'uint16',
    'wflags',
    'uint16',
    'oleback',
    'int32',
    'lworigin',
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LPointStruct)
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LPointStruct, value)
      }
    },
    'longflags',
    'uint32',
    'dateformat',
    'int16'
  ]

  static HeaderStruct810 = [
    'flags',
    'uint16',
    'worigin',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'wscale',
    'uint16',
    'wflags',
    'uint16',
    'oleback',
    'int32',
    'lworigin',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'longflags',
    'uint32'
  ]

  static HeaderStruct22 = [
    'flags',
    'uint16',
    'worigin',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'wscale',
    'uint16',
    'wflags',
    'uint16',
    'oleback',
    'int32',
    'lworigin',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    }
  ]

  static HeaderStruct14 = [
    'flags',
    'uint16',
    'worigin',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'wscale',
    'uint16',
    'wflags',
    'uint16',
    'oleback',
    'int32'
  ]

  static LineDrawListStruct6 = [
    'n',
    'int32',
    'symbol1',
    'string:36',
    'symbol2',
    'string:36',
    'symbol3',
    'string:36',
    'symbol4',
    'string:36',
    'symbol5',
    'string:36',
    'symbol6',
    'string:36'
  ]

  static UIInfoStruct = [
    'linetoolindex',
    'int32',
    'shapetoolindex',
    'int32',
    'datetime2007',
    'uint32',
    'holidaymask',
    'uint32',
    'datetime1',
    'uint32',
    'datetime2',
    'uint32',
    // 'nonworkingdays',
    // 'uint32'
  ]

  static UIInfoStruct36 = [
    'linetoolindex',
    'int32',
    'shapetoolindex',
    'int32',
    'datetime2007',
    'uint32',
    'holidaymask',
    'uint32',
    'datetime1',
    'uint32',
    'datetime2',
    'uint32',
    // 'nonworkingdays',
    // 'uint32',
    'swimlaneformat',
    'uint32',
    'autocontainer',
    'uint32'
  ]

  static UIInfoStruct40 = [
    'linetoolindex',
    'int32',
    'shapetoolindex',
    'int32',
    'datetime2007',
    'uint32',
    'holidaymask',
    'uint32',
    'datetime1',
    'uint32',
    'datetime2',
    'uint32',
    // 'nonworkingdays',
    // 'uint32',
    'swimlaneformat',
    'uint32',
    'autocontainer',
    'uint32',
    'actascontainer',
    'uint32'
  ]

  static UIInfoStruct52 = [
    'linetoolindex',
    'int32',
    'shapetoolindex',
    'int32',
    'datetime2007',
    'uint32',
    'holidaymask',
    'uint32',
    'datetime1',
    'uint32',
    'datetime2',
    'uint32',
    // 'nonworkingdays',
    // 'uint32',
    'swimlaneformat',
    'uint32',
    'autocontainer',
    'uint32',
    'actascontainer',
    'uint32',
    'swimlanenlanes',
    'uint32',
    'swimlanenvlanes',
    'uint32',
    'swimlanerotate',
    'uint32'
  ]

  static UIInfoStruct56 = [
    'linetoolindex',
    'int32',
    'shapetoolindex',
    'int32',
    'datetime2007',
    'uint32',
    'holidaymask',
    'uint32',
    'datetime1',
    'uint32',
    'datetime2',
    'uint32',
    // 'nonworkingdays',
    // 'uint32',
    'swimlaneformat',
    'uint32',
    'autocontainer',
    'uint32',
    'actascontainer',
    'uint32',
    'swimlanenlanes',
    'uint32',
    'swimlanenvlanes',
    'uint32',
    'swimlanerotate',
    'uint32',
    'swimlanetitle',
    'uint32'
  ]

  static UIInfoStruct60 = [
    'linetoolindex',
    'int32',
    'shapetoolindex',
    'int32',
    'datetime2007',
    'uint32',
    'holidaymask',
    'uint32',
    'datetime1',
    'uint32',
    'datetime2',
    'uint32',
    // 'nonworkingdays',
    // 'uint32',
    'swimlaneformat',
    'uint32',
    'autocontainer',
    'uint32',
    'actascontainer',
    'uint32',
    'swimlanenlanes',
    'uint32',
    'swimlanenvlanes',
    'uint32',
    'swimlanerotate',
    'uint32',
    'swimlanetitle',
    'uint32',
    'collapsetools',
    'uint32'
  ]

  static LibListStruct = [
    'selected',
    'int32',
    'nacross',
    'int32'
  ]

  static TextureExtraStruct = [
    'categoryindex',
    'int32',
    'units',
    'int32',
    'scale',
    'float64',
    'rwidth',
    'float64',
    'alignment',
    'int32',
    'flags',
    'int32'
  ]

  static TextureStruct = [
    'textureindex',
    'int32'
  ]

  static HatchStruct = [
    'hatch',
    'int32'
  ]

  /**
   * Structure definition for DrawObj8 with 448 byte size
   * Contains properties for a drawing object including position, dimensions, appearance settings and metadata
   * Used for binary data serialization/deserialization
   */
  static DrawObj8Struct448 = [
    'otype',
    'uint32',
    'r',
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.DRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.DRectStruct, value);
      }
    },
    'frame',
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.DRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.DRectStruct, value);
      }
    },
    'inside',
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.DRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.DRectStruct, value);
      }
    },
    'dataclass',
    'uint32',
    'flags',
    'uint32',
    'extraflags',
    'uint32',
    'fixedpoint',
    'float64',
    'shapeparam',
    'float64',
    'objgrow',
    'uint32',
    'sizedim',
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.DPointStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.DPointStruct, value);
      }
    },
    'hookflags',
    'uint32',
    'targflags',
    'uint32',
    'maxhooks',
    'uint32',
    'associd',
    {
      get: function (reader) {
        var associationId = reader.readInt16();
        reader.readInt16(); // Skip padding
        return associationId;
      },
      set: function (writer, value) {
        writer.writeInt16(value);
        writer.writeInt16(0); // Add padding
      }
    },
    'associndex',
    'int32',
    'uniqueid',
    'int32',
    'ShortRef',
    'uint32',
    'gframe',
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.DRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.DRectStruct, value);
      }
    },
    'gflags',
    'uint32',
    'attachpoint_x',
    'float64',
    'attachpoint_y',
    'float64',
    'rleft',
    'float64',
    'rtop',
    'float64',
    'rright',
    'float64',
    'rbottom',
    'float64',
    'rwd',
    'float64',
    'rht',
    'float64',
    'rflags',
    'uint32',
    'hgframe',
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.DRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.DRectStruct, value);
      }
    },
    'layer',
    'uint32',
    'breverse',
    'uint32',
    'dimensions',
    'uint32',
    'hiliter',
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'styleindex',
    'uint32',
    'objecttype',
    'uint32',
    'colorfilter',
    'uint32',
    'perspective',
    'uint32',
    'extendedSnapRect',
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.DRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.DRectStruct, value);
      }
    },
    'dimensionDeflectionH',
    'float64',
    'dimensionDeflectionV',
    'float64',
    'commentdir',
    'uint32',
    'sequence',
    'uint32',
    'hookdisp_x',
    'float64',
    'hookdisp_y',
    'float64',
    'pptLayout',
    'uint32',
    'subtype',
    'uint32',
    'colorchanges',
    'uint32',
    'moreflags',
    'uint32',
    'objclass',
    'uint32'
  ]

  /**
   * Standard drawing object structure definition for version 8 format
   * Contains geometry, appearance, and behavioral properties for drawing objects
   */
  static DrawObj8Struct = [
    'otype',                     // Object type
    'uint32',
    'r',                         // Rectangle bounds
    {
      /**
       * Reads rectangle bounds from binary data
       * @param reader - Binary reader instance
       * @returns Rectangle structure representing object bounds
       */
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      /**
       * Writes rectangle bounds to binary data
       * @param writer - Binary writer instance
       * @param value - Rectangle structure to write
       */
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'frame',                     // Frame rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'inside',                    // Inside rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dataclass',                 // Data classification
    'uint32',
    'flags',                     // Object flags
    'uint32',
    'extraflags',                // Additional flags
    'uint32',
    'fixedpoint',                // Fixed point anchor
    'int32',
    'shapeparam',                // Shape-specific parameter
    'float64',
    'objgrow',                   // Object growth behavior
    'uint32',
    'sizedim',                   // Size dimensions
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LPointStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LPointStruct, value);
      }
    },
    'hookflags',                 // Connection hook flags
    'uint32',
    'targflags',                 // Target flags
    'uint32',
    'maxhooks',                  // Maximum number of hooks
    'uint32',
    'associd',                   // Association ID
    {
      /**
       * Reads association ID with padding handling
       * @param reader - Binary reader instance
       * @returns Association ID value
       */
      get: function (reader) {
        const associationId = reader.readInt16();
        reader.readInt16(); // Skip padding
        return associationId;
      },
      /**
       * Writes association ID with padding
       * @param writer - Binary writer instance
       * @param value - Association ID to write
       */
      set: function (writer, value) {
        writer.writeInt16(value);
        writer.writeInt16(0); // Add padding
      }
    },
    'associndex',                // Association index
    'int32',
    'uniqueid',                  // Unique identifier
    'int32',
    'ShortRef',                  // Short reference
    'uint32',
    'gframe',                    // Group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'gflags',                    // Group flags
    'uint32',
    'attachpoint_x',             // Attachment point X coordinate
    'int32',
    'attachpoint_y',             // Attachment point Y coordinate
    'int32',
    'rleft',                     // Real left coordinate
    'float64',
    'rtop',                      // Real top coordinate
    'float64',
    'rright',                    // Real right coordinate
    'float64',
    'rbottom',                   // Real bottom coordinate
    'float64',
    'rwd',                       // Real width
    'float64',
    'rht',                       // Real height
    'float64',
    'rflags',                    // Real coordinate flags
    'uint32',
    'hgframe',                   // Host group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'layer',                     // Layer index
    'uint32',
    'breverse',                  // Reverse flag for borders
    'uint32',
    'dimensions',                // Dimensioning flags
    'uint32',
    'hiliter',                   // Highlighter rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'styleindex',                // Style index
    'uint32',
    'objecttype',                // Specific object type
    'uint32',
    'colorfilter',               // Color filtering options
    'uint32',
    'perspective',               // Perspective view settings
    'uint32',
    'extendedSnapRect',          // Extended snap rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dimensionDeflectionH',      // Horizontal dimension deflection
    'int32',
    'dimensionDeflectionV',      // Vertical dimension deflection
    'int32',
    'commentdir',                // Comment direction
    'uint32',
    'sequence',                  // Sequence number
    'uint32',
    'hookdisp_x',                // Hook display X coordinate
    'int32',
    'hookdisp_y',                // Hook display Y coordinate
    'int32',
    'pptLayout',                 // Presentation layout
    'uint32',
    'subtype',                   // Object subtype
    'uint32'
  ]

  /**
   * Extended drawing object structure definition for version 8 format with 316 bytes
   * Contains all base properties plus additional fields for advanced rendering and behavior
   */
  static DrawObj8Struct316 = [
    'otype',                     // Object type
    'uint32',
    'r',                         // Rectangle bounds
    {
      /**
       * Reads rectangle bounds from binary data
       * @param reader - Binary reader instance
       * @returns Rectangle structure representing object bounds
       */
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      /**
       * Writes rectangle bounds to binary data
       * @param writer - Binary writer instance
       * @param value - Rectangle structure to write
       */
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'frame',                     // Frame rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'inside',                    // Inside rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dataclass',                 // Data classification
    'uint32',
    'flags',                     // Object flags
    'uint32',
    'extraflags',                // Additional flags
    'uint32',
    'fixedpoint',                // Fixed point anchor
    'int32',
    'shapeparam',                // Shape-specific parameter
    'float64',
    'objgrow',                   // Object growth behavior
    'uint32',
    'sizedim',                   // Size dimensions
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LPointStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LPointStruct, value);
      }
    },
    'hookflags',                 // Connection hook flags
    'uint32',
    'targflags',                 // Target flags
    'uint32',
    'maxhooks',                  // Maximum number of hooks
    'uint32',
    'associd',                   // Association ID
    {
      /**
       * Reads association ID with padding handling
       * @param reader - Binary reader instance
       * @returns Association ID value
       */
      get: function (reader) {
        const associationId = reader.readInt16();
        reader.readInt16(); // Skip padding
        return associationId;
      },
      /**
       * Writes association ID with padding
       * @param writer - Binary writer instance
       * @param value - Association ID to write
       */
      set: function (writer, value) {
        writer.writeInt16(value);
        writer.writeInt16(0); // Add padding
      }
    },
    'associndex',                // Association index
    'int32',
    'uniqueid',                  // Unique identifier
    'int32',
    'ShortRef',                  // Short reference
    'uint32',
    'gframe',                    // Group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'gflags',                    // Group flags
    'uint32',
    'attachpoint_x',             // Attachment point X coordinate
    'int32',
    'attachpoint_y',             // Attachment point Y coordinate
    'int32',
    'rleft',                     // Real left coordinate
    'float64',
    'rtop',                      // Real top coordinate
    'float64',
    'rright',                    // Real right coordinate
    'float64',
    'rbottom',                   // Real bottom coordinate
    'float64',
    'rwd',                       // Real width
    'float64',
    'rht',                       // Real height
    'float64',
    'rflags',                    // Real coordinate flags
    'uint32',
    'hgframe',                   // Host group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'layer',                     // Layer index
    'uint32',
    'breverse',                  // Reverse flag for borders
    'uint32',
    'dimensions',                // Dimensioning flags
    'uint32',
    'hiliter',                   // Highlighter rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'styleindex',                // Style index
    'uint32',
    'objecttype',                // Specific object type
    'uint32',
    'colorfilter',               // Color filtering options
    'uint32',
    'perspective',               // Perspective view settings
    'uint32',
    'extendedSnapRect',          // Extended snap rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dimensionDeflectionH',      // Horizontal dimension deflection
    'int32',
    'dimensionDeflectionV',      // Vertical dimension deflection
    'int32',
    'commentdir',                // Comment direction
    'uint32',
    'sequence',                  // Sequence number
    'uint32',
    'hookdisp_x',                // Hook display X coordinate
    'int32',
    'hookdisp_y',                // Hook display Y coordinate
    'int32',
    'pptLayout',                 // Presentation layout
    'uint32',
    'subtype',                   // Object subtype
    'uint32',
    'colorchanges',              // Color change flags
    'uint32',
    'moreflags',                 // Additional flags
    'uint32',
    'objclass',                  // Object classification
    'uint32'
  ]

  /**
   * Structure definition for DrawObj8 with 312 bytes
   * Used for binary serialization/deserialization of drawing objects in version 8 format
   * Contains properties like position, dimensions, behavior flags, and style information
   */
  static DrawObj8Struct312 = [
    'otype',                     // Object type
    'uint32',
    'r',                         // Rectangle bounds
    {
      /**
       * Reads rectangle bounds from binary data
       * @param reader - Binary reader instance
       * @returns Rectangle structure representing object bounds
       */
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      /**
       * Writes rectangle bounds to binary data
       * @param writer - Binary writer instance
       * @param value - Rectangle structure to write
       */
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'frame',                     // Frame rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'inside',                    // Inside rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dataclass',                 // Data classification
    'uint32',
    'flags',                     // Object flags
    'uint32',
    'extraflags',                // Additional flags
    'uint32',
    'fixedpoint',                // Fixed point anchor
    'int32',
    'shapeparam',                // Shape-specific parameter
    'float64',
    'objgrow',                   // Object growth behavior
    'uint32',
    'sizedim',                   // Size dimensions
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LPointStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LPointStruct, value);
      }
    },
    'hookflags',                 // Connection hook flags
    'uint32',
    'targflags',                 // Target flags
    'uint32',
    'maxhooks',                  // Maximum number of hooks
    'uint32',
    'associd',                   // Association ID
    {
      /**
       * Reads association ID with padding handling
       * @param reader - Binary reader instance
       * @returns Association ID value
       */
      get: function (reader) {
        const associationId = reader.readInt16();
        reader.readInt16(); // Skip padding
        return associationId;
      },
      /**
       * Writes association ID with padding
       * @param writer - Binary writer instance
       * @param value - Association ID to write
       */
      set: function (writer, value) {
        writer.writeInt16(value);
        writer.writeInt16(0); // Add padding
      }
    },
    'associndex',                // Association index
    'int32',
    'uniqueid',                  // Unique identifier
    'int32',
    'ShortRef',                  // Short reference
    'uint32',
    'gframe',                    // Group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'gflags',                    // Group flags
    'uint32',
    'attachpoint_x',             // Attachment point X coordinate
    'int32',
    'attachpoint_y',             // Attachment point Y coordinate
    'int32',
    'rleft',                     // Real left coordinate
    'float64',
    'rtop',                      // Real top coordinate
    'float64',
    'rright',                    // Real right coordinate
    'float64',
    'rbottom',                   // Real bottom coordinate
    'float64',
    'rwd',                       // Real width
    'float64',
    'rht',                       // Real height
    'float64',
    'rflags',                    // Real coordinate flags
    'uint32',
    'hgframe',                   // Host group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'layer',                     // Layer index
    'uint32',
    'breverse',                  // Reverse flag for borders
    'uint32',
    'dimensions',                // Dimensioning flags
    'uint32',
    'hiliter',                   // Highlighter rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'styleindex',                // Style index
    'uint32',
    'objecttype',                // Specific object type
    'uint32',
    'colorfilter',               // Color filtering options
    'uint32',
    'perspective',               // Perspective view settings
    'uint32',
    'extendedSnapRect',          // Extended snap rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dimensionDeflectionH',      // Horizontal dimension deflection
    'int32',
    'dimensionDeflectionV',      // Vertical dimension deflection
    'int32',
    'commentdir',                // Comment direction
    'uint32',
    'sequence',                  // Sequence number
    'uint32',
    'hookdisp_x',                // Hook display X coordinate
    'int32',
    'hookdisp_y',                // Hook display Y coordinate
    'int32',
    'pptLayout',                 // Presentation layout
    'uint32',
    'subtype',                   // Object subtype
    'uint32',
    'colorchanges',              // Color change flags
    'uint32',
    'moreflags',                  // Additional flags
    'uint32'
  ]

  /**
   * Structure definition for DrawObj8 with 848 bytes size
   * Extended version of the DrawObj8 structure used for more complex objects
   * Supports additional metadata and rendering information
   */
  static DrawObj8Struct848 = [
    'otype',                     // Object type
    'uint32',
    'r',                         // Rectangle bounds
    {
      /**
       * Reads rectangle bounds from binary data
       * @param reader - Binary reader instance
       * @returns Rectangle structure representing object bounds
       */
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      /**
       * Writes rectangle bounds to binary data
       * @param writer - Binary writer instance
       * @param value - Rectangle structure to write
       */
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'frame',                     // Frame rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'inside',                    // Inside rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dataclass',                 // Data classification
    'uint32',
    'flags',                     // Object flags
    'uint32',
    'extraflags',                // Additional flags
    'uint32',
    'fixedpoint',                // Fixed point anchor
    'int32',
    'shapeparam',                // Shape-specific parameter
    'float64',
    'objgrow',                   // Object growth behavior
    'uint32',
    'sizedim',                   // Size dimensions
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LPointStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LPointStruct, value);
      }
    },
    'hookflags',                 // Connection hook flags
    'uint32',
    'targflags',                 // Target flags
    'uint32',
    'maxhooks',                  // Maximum number of hooks
    'uint32',
    'associd',                   // Association ID
    {
      /**
       * Reads association ID with padding handling
       * @param reader - Binary reader instance
       * @returns Association ID value
       */
      get: function (reader) {
        const associationId = reader.readInt16();
        reader.readInt16(); // Skip padding
        return associationId;
      },
      /**
       * Writes association ID with padding
       * @param writer - Binary writer instance
       * @param value - Association ID to write
       */
      set: function (writer, value) {
        writer.writeInt16(value);
        writer.writeInt16(0); // Add padding
      }
    },
    'associndex',                // Association index
    'int32',
    'uniqueid',                  // Unique identifier
    'int32',
    'ShortRef',                  // Short reference
    'uint32',
    'gframe',                    // Group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'gflags',                    // Group flags
    'uint32',
    'attachpoint_x',             // Attachment point X coordinate
    'int32',
    'attachpoint_y',             // Attachment point Y coordinate
    'int32',
    'rleft',                     // Real left coordinate
    'float64',
    'rtop',                      // Real top coordinate
    'float64',
    'rright',                    // Real right coordinate
    'float64',
    'rbottom',                   // Real bottom coordinate
    'float64',
    'rwd',                       // Real width
    'float64',
    'rht',                       // Real height
    'float64',
    'rflags',                    // Real coordinate flags
    'uint32',
    'hgframe',                   // Host group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'layer',                     // Layer index
    'uint32',
    'breverse',                  // Reverse flag for borders
    'uint32',
    'dimensions',                // Dimensioning flags
    'uint32',
    'hiliter',                   // Highlighter rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'styleindex',                // Style index
    'uint32',
    'objecttype',                // Specific object type
    'uint32',
    'colorfilter',               // Color filtering options
    'uint32',
    'perspective',               // Perspective view settings
    'uint32',
    'extendedSnapRect',          // Extended snap rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dimensionDeflectionH',      // Horizontal dimension deflection
    'int32',
    'dimensionDeflectionV',      // Vertical dimension deflection
    'int32',
    'commentdir',                // Comment direction
    'uint32',
    'sequence',                  // Sequence number
    'uint32',
    'hookdisp_x',                // Hook display X coordinate
    'int32',
    'hookdisp_y',                // Hook display Y coordinate
    'int32',
    'pptLayout',                 // Presentation layout
    'uint32',
    'subtype',                   // Object subtype
    'uint32',
    'colorchanges',               // Color change flags
    'uint32'
  ]

  /**
   * Structure definition for DrawObj8 with 837 byte size
   * Used for binary serialization/deserialization of drawing objects in version 8 format
   * Contains properties for a drawing object including geometry, appearance settings, and behavioral flags
   */
  static DrawObj8Struct837 = [
    'otype',                     // Object type
    'uint32',
    'r',                         // Rectangle bounds
    {
      /**
       * Reads rectangle bounds from binary data
       * @param reader - Binary reader instance
       * @returns Rectangle structure representing object bounds
       */
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      /**
       * Writes rectangle bounds to binary data
       * @param writer - Binary writer instance
       * @param value - Rectangle structure to write
       */
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'frame',                     // Frame rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'inside',                    // Inside rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dataclass',                 // Data classification
    'uint32',
    'flags',                     // Object flags
    'uint32',
    'extraflags',                // Additional flags
    'uint32',
    'fixedpoint',                // Fixed point anchor
    'int32',
    'shapeparam',                // Shape-specific parameter
    'float64',
    'objgrow',                   // Object growth behavior
    'uint32',
    'sizedim',                   // Size dimensions
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LPointStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LPointStruct, value);
      }
    },
    'hookflags',                 // Connection hook flags
    'uint32',
    'targflags',                 // Target flags
    'uint32',
    'maxhooks',                  // Maximum number of hooks
    'uint32',
    'associd',                   // Association ID
    {
      /**
       * Reads association ID with padding handling
       * @param reader - Binary reader instance
       * @returns Association ID value
       */
      get: function (reader) {
        const associationId = reader.readInt16();
        reader.readInt16(); // Skip padding
        return associationId;
      },
      /**
       * Writes association ID with padding
       * @param writer - Binary writer instance
       * @param value - Association ID to write
       */
      set: function (writer, value) {
        writer.writeInt16(value);
        writer.writeInt16(0); // Add padding
      }
    },
    'associndex',                // Association index
    'int32',
    'uniqueid',                  // Unique identifier
    'int32',
    'ShortRef',                  // Short reference
    'uint32',
    'gframe',                    // Group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'gflags',                    // Group flags
    'uint32',
    'attachpoint_x',             // Attachment point X coordinate
    'int32',
    'attachpoint_y',             // Attachment point Y coordinate
    'int32',
    'rleft',                     // Real left coordinate
    'float64',
    'rtop',                      // Real top coordinate
    'float64',
    'rright',                    // Real right coordinate
    'float64',
    'rbottom',                   // Real bottom coordinate
    'float64',
    'rwd',                       // Real width
    'float64',
    'rht',                       // Real height
    'float64',
    'rflags',                    // Real coordinate flags
    'uint32',
    'hgframe',                   // Host group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'layer',                     // Layer index
    'uint32',
    'breverse',                  // Reverse flag for borders
    'uint32',
    'dimensions',                // Dimensioning flags
    'uint32',
    'hiliter',                   // Highlighter rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'styleindex',                // Style index
    'uint32',
    'objecttype',                // Specific object type
    'uint32',
    'colorfilter',               // Color filtering options
    'uint32',
    'perspective',               // Perspective view settings
    'uint32',
    'extendedSnapRect',          // Extended snap rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dimensionDeflectionH',      // Horizontal dimension deflection
    'uint32',
    'dimensionDeflectionV',      // Vertical dimension deflection
    'uint32',
    'commentdir',                // Comment direction
    'uint32',
    'sequence',                  // Sequence number
    'uint32',
    'hookdisp_x',                // Hook display X coordinate
    'int32',
    'hookdisp_y',                // Hook display Y coordinate
    'int32',
    'pptLayout',                 // Presentation layout
    'uint32'
  ]

  /**
   * Structure definition for DrawObj8 with 824 byte size
   * Similar to 837 byte version but without the pptLayout field
   * Used for serialization/deserialization of drawing objects in earlier version 8 formats
   */
  static DrawObj8Struct824 = [
    'otype',                     // Object type
    'uint32',
    'r',                         // Rectangle bounds
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'frame',                     // Frame rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'inside',                    // Inside rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dataclass',                 // Data classification
    'uint32',
    'flags',                     // Object flags
    'uint32',
    'extraflags',                // Additional flags
    'uint32',
    'fixedpoint',                // Fixed point anchor
    'int32',
    'shapeparam',                // Shape-specific parameter
    'float64',
    'objgrow',                   // Object growth behavior
    'uint32',
    'sizedim',                   // Size dimensions
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LPointStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LPointStruct, value);
      }
    },
    'hookflags',                 // Connection hook flags
    'uint32',
    'targflags',                 // Target flags
    'uint32',
    'maxhooks',                  // Maximum number of hooks
    'uint32',
    'associd',                   // Association ID
    {
      get: function (reader) {
        const associationId = reader.readInt16();
        reader.readInt16(); // Skip padding
        return associationId;
      },
      set: function (writer, value) {
        writer.writeInt16(value);
        writer.writeInt16(0); // Add padding
      }
    },
    'associndex',                // Association index
    'int32',
    'uniqueid',                  // Unique identifier
    'int32',
    'ShortRef',                  // Short reference
    'uint32',
    'gframe',                    // Group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'gflags',                    // Group flags
    'uint32',
    'attachpoint_x',             // Attachment point X coordinate
    'int32',
    'attachpoint_y',             // Attachment point Y coordinate
    'int32',
    'rleft',                     // Real left coordinate
    'float64',
    'rtop',                      // Real top coordinate
    'float64',
    'rright',                    // Real right coordinate
    'float64',
    'rbottom',                   // Real bottom coordinate
    'float64',
    'rwd',                       // Real width
    'float64',
    'rht',                       // Real height
    'float64',
    'rflags',                    // Real coordinate flags
    'uint32',
    'hgframe',                   // Host group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'layer',                     // Layer index
    'uint32',
    'breverse',                  // Reverse flag for borders
    'uint32',
    'dimensions',                // Dimensioning flags
    'uint32',
    'hiliter',                   // Highlighter rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'styleindex',                // Style index
    'uint32',
    'objecttype',                // Specific object type
    'uint32',
    'colorfilter',               // Color filtering options
    'uint32',
    'perspective',               // Perspective view settings
    'uint32',
    'extendedSnapRect',          // Extended snap rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dimensionDeflectionH',      // Horizontal dimension deflection
    'uint32',
    'dimensionDeflectionV',      // Vertical dimension deflection
    'uint32',
    'commentdir',                // Comment direction
    'uint32',
    'sequence',                  // Sequence number
    'uint32'
  ]

  /**
   * Structure definition for DrawObj8 with 830 bytes
   * Defines the binary layout for drawing objects with full attributes
   * Used for serialization/deserialization of complex shapes
   */
  static DrawObj8Struct830 = [
    'objectType',                  // Object type code
    'uint32',
    'rectangle',                   // Main rectangle bounds
    {
      /**
       * Reads rectangle bounds from binary data
       * @param reader - Binary reader instance
       * @returns Rectangle structure representing object bounds
       */
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      /**
       * Writes rectangle bounds to binary data
       * @param writer - Binary writer instance
       * @param value - Rectangle structure to write
       */
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'frameRectangle',              // Frame rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'insideRectangle',             // Inside rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dataClass',                   // Data classification
    'uint32',
    'flags',                       // Object flags
    'uint32',
    'extraFlags',                  // Additional flags
    'uint32',
    'fixedPoint',                  // Fixed point anchor
    'int32',
    'shapeParameter',              // Shape-specific parameter
    'float64',
    'objectGrow',                  // Object growth behavior
    'uint32',
    'sizeDimensions',              // Size dimensions
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LPointStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LPointStruct, value);
      }
    },
    'hookFlags',                   // Connection hook flags
    'uint32',
    'targetFlags',                 // Target flags
    'uint32',
    'maxHooks',                    // Maximum number of hooks
    'uint32',
    'associationId',               // Association ID
    {
      /**
       * Reads association ID with padding handling
       * @param reader - Binary reader instance
       * @returns Association ID value
       */
      get: function (reader) {
        const associationId = reader.readInt16();
        reader.readInt16(); // Skip padding
        return associationId;
      },
      /**
       * Writes association ID with padding
       * @param writer - Binary writer instance
       * @param value - Association ID to write
       */
      set: function (writer, value) {
        writer.writeInt16(value);
        writer.writeInt16(0); // Add padding
      }
    },
    'associationIndex',            // Association index
    'int32',
    'uniqueId',                    // Unique identifier
    'int32',
    'shortReference',              // Short reference
    'uint32',
    'groupFrame',                  // Group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'groupFlags',                  // Group flags
    'uint32',
    'attachPointX',                // Attachment point X coordinate
    'int32',
    'attachPointY',                // Attachment point Y coordinate
    'int32',
    'realLeft',                    // Real left coordinate
    'float64',
    'realTop',                     // Real top coordinate
    'float64',
    'realRight',                   // Real right coordinate
    'float64',
    'realBottom',                  // Real bottom coordinate
    'float64',
    'realWidth',                   // Real width
    'float64',
    'realHeight',                  // Real height
    'float64',
    'realFlags',                   // Real coordinate flags
    'uint32',
    'hostGroupFrame',              // Host group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'layer',                       // Layer index
    'uint32',
    'borderReverse',               // Reverse flag for borders
    'uint32',
    'dimensions',                  // Dimensioning flags
    'uint32',
    'highlighterRect',             // Highlighter rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'styleIndex',                  // Style index
    'uint32',
    'objectTypeSpecific',          // Specific object type
    'uint32',
    'colorFilter',                 // Color filtering options
    'uint32',
    'perspective',                 // Perspective view settings
    'uint32',
    'extendedSnapRect',            // Extended snap rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dimensionDeflectionH',        // Horizontal dimension deflection
    'uint32',
    'dimensionDeflectionV',        // Vertical dimension deflection
    'uint32',
    'commentDirection',            // Comment direction
    'uint32',
    'sequence',                    // Sequence number
    'uint32',
    'hookDisplayX',                // Hook display X coordinate
    'int32',
    'hookDisplayY',                // Hook display Y coordinate
    'int32'
  ]

  /**
   * Structure definition for DrawObj8 with 814 bytes
   * Defines the binary layout for drawing objects with basic attributes
   * Used for serialization/deserialization of simpler shapes
   */
  static DrawObj8Struct814 = [
    'objectType',                  // Object type code
    'uint32',
    'rectangle',                   // Main rectangle bounds
    {
      /**
       * Reads rectangle bounds from binary data
       * @param reader - Binary reader instance
       * @returns Rectangle structure representing object bounds
       */
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      /**
       * Writes rectangle bounds to binary data
       * @param writer - Binary writer instance
       * @param value - Rectangle structure to write
       */
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'frameRectangle',              // Frame rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'insideRectangle',             // Inside rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dataClass',                   // Data classification
    'uint32',
    'flags',                       // Object flags
    'uint32',
    'extraFlags',                  // Additional flags
    'uint32',
    'fixedPoint',                  // Fixed point anchor
    'int32',
    'shapeParameter',              // Shape-specific parameter
    'float64',
    'objectGrow',                  // Object growth behavior
    'uint32',
    'sizeDimensions',              // Size dimensions
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LPointStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LPointStruct, value);
      }
    },
    'hookFlags',                   // Connection hook flags
    'uint32',
    'targetFlags',                 // Target flags
    'uint32',
    'maxHooks',                    // Maximum number of hooks
    'uint32',
    'associationId',               // Association ID
    {
      /**
       * Reads association ID with padding handling
       * @param reader - Binary reader instance
       * @returns Association ID value
       */
      get: function (reader) {
        const associationId = reader.readInt16();
        reader.readInt16(); // Skip padding
        return associationId;
      },
      /**
       * Writes association ID with padding
       * @param writer - Binary writer instance
       * @param value - Association ID to write
       */
      set: function (writer, value) {
        writer.writeInt16(value);
        writer.writeInt16(0); // Add padding
      }
    },
    'associationIndex',            // Association index
    'int32',
    'uniqueId',                    // Unique identifier
    'int32',
    'shortReference',              // Short reference
    'uint32',
    'groupFrame',                  // Group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'groupFlags',                  // Group flags
    'uint32',
    'attachPointX',                // Attachment point X coordinate
    'int32',
    'attachPointY',                // Attachment point Y coordinate
    'int32',
    'realLeft',                    // Real left coordinate
    'float64',
    'realTop',                     // Real top coordinate
    'float64',
    'realRight',                   // Real right coordinate
    'float64',
    'realBottom',                  // Real bottom coordinate
    'float64',
    'realWidth',                   // Real width
    'float64',
    'realHeight',                  // Real height
    'float64',
    'realFlags',                   // Real coordinate flags
    'uint32',
    'hostGroupFrame',              // Host group frame
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'layer',                       // Layer index
    'uint32',
    'borderReverse',               // Reverse flag for borders
    'uint32',
    'dimensions',                  // Dimensioning flags
    'uint32',
    'highlighterRect',             // Highlighter rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'styleIndex',                  // Style index
    'uint32',
    'objectTypeSpecific',          // Specific object type
    'uint32',
    'colorFilter',                 // Color filtering options
    'uint32',
    'perspective',                 // Perspective view settings
    'uint32',
    'extendedSnapRect',            // Extended snap rectangle
    {
      get: function (reader) {
        return reader.readStruct(DSConstant.LRectStruct);
      },
      set: function (writer, value) {
        writer.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'dimensionDeflectionH',        // Horizontal dimension deflection
    'uint32',
    'dimensionDeflectionV',         // Vertical dimension deflection
    'uint32'
  ]

  static DrawObj8Struct810 = [
    'otype',
    'uint32',
    'r',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'frame',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'inside',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'dataclass',
    'uint32',
    'flags',
    'uint32',
    'extraflags',
    'uint32',
    'fixedpoint',
    'int32',
    'shapeparam',
    'float64',
    'objgrow',
    'uint32',
    'sizedim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'hookflags',
    'uint32',
    'targflags',
    'uint32',
    'maxhooks',
    'uint32',
    'associd',
    {
      get: function (e) {
        var t = e.readInt16();
        e.readInt16();
        return t
      },
      set: function (e, t) {
        e.writeInt16(t),
          e.writeInt16(0)
      }
    },
    'associndex',
    'int32',
    'uniqueid',
    'int32',
    'ShortRef',
    'uint32',
    'gframe',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'gflags',
    'uint32',
    'attachpoint_x',
    'int32',
    'attachpoint_y',
    'int32',
    'rleft',
    'float64',
    'rtop',
    'float64',
    'rright',
    'float64',
    'rbottom',
    'float64',
    'rwd',
    'float64',
    'rht',
    'float64',
    'rflags',
    'uint32',
    'hgframe',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'layer',
    'uint32',
    'breverse',
    'uint32',
    'dimensions',
    'uint32',
    'hiliter',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'styleindex',
    'uint32',
    'objecttype',
    'uint32',
    'colorfilter',
    'uint32'
  ]

  static DrawObjStruct = [
    'otype',
    'uint16',
    'r',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'frame',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'inside',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'dataclass',
    'uint16',
    'flags',
    'uint16',
    'extraflags',
    'uint16',
    'fixedpoint',
    'int16',
    'shapeparam',
    'float64',
    'objgrow',
    'uint16',
    'sizedim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'hookflags',
    'uint16',
    'targflags',
    'uint16',
    'maxhooks',
    'uint16',
    'associd',
    'uint16',
    'associndex',
    'int16',
    'uniqueid',
    'int16',
    'ShortRef',
    'uint16',
    'gframe',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'gflags',
    'uint16'
  ]

  static DrawObjStruct148 = [
    'otype',
    'uint16',
    'r',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'frame',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'inside',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'dataclass',
    'uint16',
    'flags',
    'uint16',
    'extraflags',
    'uint16',
    'fixedpoint',
    'int16',
    'shapeparam',
    'float64',
    'objgrow',
    'uint16',
    'sizedim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'hookflags',
    'uint16',
    'targflags',
    'uint16',
    'maxhooks',
    'uint16',
    'associd',
    'uint16',
    'associndex',
    'int16',
    'uniqueid',
    'uint16',
    'ShortRef',
    'int16',
    'gframe',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'gflags',
    'uint16',
    'lr',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'lframe',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'linside',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'lfixedpoint',
    'int32',
    'lsizedim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'lgframe',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    }
  ]

  static DrawObj6Struct = [
    'hgframe',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'layer',
    'int32',
    'extraflags',
    'uint32'
  ]

  static DrawObj6Struct20 = [
    'hgframe',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'layer',
    'int32'
  ]

  static DrawObj7Struct48 = [
    'bfillcolor',
    'uint32',
    'bpatindex',
    'uint32',
    'bthick',
    'uint32',
    'breverse',
    'uint32',
    'flags',
    'uint32',
    'dimensions',
    'uint32',
    'hiliter',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'dbthick',
    'float64'
  ]

  static DrawObj7Struct20 = [
    'bfillcolor',
    'uint32',
    'bpatindex',
    'uint32',
    'bthick',
    'uint32',
    'breverse',
    'uint32',
    'flags',
    'uint32'
  ]

  static PageStruct126 = [
    'margins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DRectStruct, t)
      }
    },
    'minmarg',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DRectStruct, t)
      }
    },
    'landscape',
    'uint16',
    'printflags',
    'uint32',
    'lPadDim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DPointStruct, t)
      }
    },
    'lpapersize',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DPointStruct, t)
      }
    },
    'MinSize',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DPointStruct, t)
      }
    },
    'printscale',
    'float64'
  ]

  static PageStruct62 = [
    'PadDim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'papersize',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'margins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'minmarg',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'landscape',
    'uint16',
    'wpapersize',
    'uint16',
    'overlap',
    'uint16',
    'printflags',
    'uint32',
    'lPadDim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'lpapersize',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'MinSize',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'printscale',
    'uint32'
  ]

  static PageStruct34 = [
    'PadDim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'papersize',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'margins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'minmarg',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'landscape',
    'uint16',
    'wpapersize',
    'uint16',
    'overlap',
    'uint16',
    'printflags',
    'uint32'
  ]

  static PageStruct30 = [
    'PadDim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'papersize',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'margins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'minmarg',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'landscape',
    'uint16',
    'wpapersize',
    'uint16',
    'overlap',
    'uint16'
  ]

  static FontNameStruct = [
    'id',
    'int16',
    'lfCharSet',
    'uint16',
    'lfFaceName',
    'string:64',
    'lfHeight',
    'uint16',
    'lfWidth',
    'uint16',
    'lfEscapement',
    'uint16',
    'lfOrientation',
    'uint16',
    'lfWeight',
    'uint16',
    'lfItalic',
    'uint8',
    'lfUnderline',
    'uint8',
    'lfStrikeOut',
    'uint8',
    'lfOutPrecision',
    'uint8',
    'lfClipPrecision',
    'uint8',
    'lfQuality',
    'uint8',
    'lfPitchAndFamily',
    'uint8'
  ]

  static FontName12Struct = [
    'id',
    'int16',
    'lfCharSet',
    'uint16',
    'lfFaceName',
    'u16stringle:16',
    'lfHeight',
    'uint16',
    'lfWidth',
    'uint16',
    'lfEscapement',
    'uint16',
    'lfOrientation',
    'uint16',
    'lfWeight',
    'uint16',
    'lfItalic',
    'uint8',
    'lfUnderline',
    'uint8',
    'lfStrikeOut',
    'uint8',
    'lfOutPrecision',
    'uint8',
    'lfClipPrecision',
    'uint8',
    'lfQuality',
    'uint8',
    'lfPitchAndFamily',
    'uint8',
    'dummy',
    'uint8'
  ]

  static FontName15Struct = [
    'id',
    'int16',
    'lfCharSet',
    'uint16',
    'lfFaceName',
    'u16stringle:64',
    'lfHeight',
    'uint16',
    'lfWidth',
    'uint16',
    'lfEscapement',
    'uint16',
    'lfOrientation',
    'uint16',
    'lfWeight',
    'uint16',
    'lfItalic',
    'uint8',
    'lfUnderline',
    'uint8',
    'lfStrikeOut',
    'uint8',
    'lfOutPrecision',
    'uint8',
    'lfClipPrecision',
    'uint8',
    'lfQuality',
    'uint8',
    'lfPitchAndFamily',
    'uint8',
    'dummy',
    'uint8'
  ]

  static CDraw12Struct420 = [
    'nobjects',
    'int32',
    'ngroups',
    'int32',
    'nlinks',
    'int32',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DPointStruct, t)
      }
    },
    'flags',
    'int32',
    'tselect',
    'int32',
    'unique',
    'int32',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DPointStruct, t)
      }
    },
    'just',
    'int32',
    'vjust',
    'int32',
    'd_sarrow',
    'int32',
    'd_earrow',
    'int32',
    'd_arrowsize',
    'int32',
    'snapalign',
    'int32',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStruct, t)
      }
    },
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DPointStruct, t)
      }
    },
    'defflags',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'activelayer',
    'int32',
    'tmargins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DRectStruct, t)
      }
    },
    'textgrow',
    'int32',
    'textflags',
    'int32',
    'fsize_min',
    'int32',
    'styleindex',
    'int32',
    'h_arraywidth',
    'float64',
    'v_arraywidth',
    'float64',
    'lastcommand',
    'int32',
    'graphtype',
    'int32',
    'graphflags',
    'int32',
    'graphpointflags',
    'int32',
    'graphcataxisflags',
    'int32',
    'graphmagaxisflags',
    'int32',
    'graphlegendtype',
    'int32',
    'graphlegendlayoutflags',
    'int32',
    'graphimagevaluerep',
    'int32',
    'graphquadrant',
    'int32',
    'arraywd',
    'float64',
    'arrayht',
    'float64',
    'sequenceflags',
    'int32',
    'chartdirection',
    'int32',
    'copyPasteTrialVers',
    'int32',
    'taskmanagementflags',
    'int32',
    'taskdays',
    'int32',
    'moreflags',
    'int32',
    'fieldmask',
    'int32'
  ]

  static CDraw12Struct440 = [
    'nobjects',
    'int32',
    'ngroups',
    'int32',
    'nlinks',
    'int32',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DPointStruct, t)
      }
    },
    'flags',
    'int32',
    'tselect',
    'int32',
    'unique',
    'int32',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DPointStruct, t)
      }
    },
    'just',
    'int32',
    'vjust',
    'int32',
    'd_sarrow',
    'int32',
    'd_earrow',
    'int32',
    'd_arrowsize',
    'int32',
    'snapalign',
    'int32',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStruct, t)
      }
    },
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DPointStruct, t)
      }
    },
    'defflags',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'activelayer',
    'int32',
    'tmargins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DRectStruct, t)
      }
    },
    'textgrow',
    'int32',
    'textflags',
    'int32',
    'fsize_min',
    'int32',
    'styleindex',
    'int32',
    'h_arraywidth',
    'float64',
    'v_arraywidth',
    'float64',
    'lastcommand',
    'int32',
    'graphtype',
    'int32',
    'graphflags',
    'int32',
    'graphpointflags',
    'int32',
    'graphcataxisflags',
    'int32',
    'graphmagaxisflags',
    'int32',
    'graphlegendtype',
    'int32',
    'graphlegendlayoutflags',
    'int32',
    'graphimagevaluerep',
    'int32',
    'graphquadrant',
    'int32',
    'arraywd',
    'float64',
    'arrayht',
    'float64',
    'sequenceflags',
    'int32',
    'chartdirection',
    'int32',
    'copyPasteTrialVers',
    'int32',
    'taskmanagementflags',
    'int32',
    'taskdays',
    'int32',
    'moreflags',
    'int32',
    'fieldmask',
    'int32',
    'wallThickness',
    'float64',
    'curveparam',
    'int32',
    'rrectparam',
    'float64'
  ]

  static CDraw12Struct364 = [
    'nobjects',
    'int32',
    'ngroups',
    'int32',
    'nlinks',
    'int32',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'flags',
    'int32',
    'tselect',
    'int32',
    'unique',
    'int32',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'just',
    'int32',
    'vjust',
    'int32',
    'd_sarrow',
    'int32',
    'd_earrow',
    'int32',
    'd_arrowsize',
    'int32',
    'snapalign',
    'int32',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStruct, t)
      }
    },
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'defflags',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'activelayer',
    'int32',
    'tmargins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'textgrow',
    'int32',
    'textflags',
    'int32',
    'fsize_min',
    'int32',
    'styleindex',
    'int32',
    'h_arraywidth',
    'int32',
    'v_arraywidth',
    'int32',
    'lastcommand',
    'int32',
    'graphtype',
    'int32',
    'graphflags',
    'int32',
    'graphpointflags',
    'int32',
    'graphcataxisflags',
    'int32',
    'graphmagaxisflags',
    'int32',
    'graphlegendtype',
    'int32',
    'graphlegendlayoutflags',
    'int32',
    'graphimagevaluerep',
    'int32',
    'graphquadrant',
    'int32',
    'arraywd',
    'int32',
    'arrayht',
    'int32',
    'sequenceflags',
    'int32',
    'chartdirection',
    'int32',
    'copyPasteTrialVers',
    'int32',
    'taskmanagementflags',
    'int32',
    'taskdays',
    'int32',
    'moreflags',
    'int32',
    'fieldmask',
    'int32'
  ]

  static CDraw12Struct356 = [
    'nobjects',
    'int32',
    'ngroups',
    'int32',
    'nlinks',
    'int32',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'flags',
    'int32',
    'tselect',
    'int32',
    'unique',
    'int32',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'just',
    'int32',
    'vjust',
    'int32',
    'd_sarrow',
    'int32',
    'd_earrow',
    'int32',
    'd_arrowsize',
    'int32',
    'snapalign',
    'int32',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStruct, t)
      }
    },
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'defflags',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'activelayer',
    'int32',
    'tmargins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'textgrow',
    'int32',
    'textflags',
    'int32',
    'fsize_min',
    'int32',
    'styleindex',
    'int32',
    'h_arraywidth',
    'int32',
    'v_arraywidth',
    'int32',
    'lastcommand',
    'int32',
    'graphtype',
    'int32',
    'graphflags',
    'int32',
    'graphpointflags',
    'int32',
    'graphcataxisflags',
    'int32',
    'graphmagaxisflags',
    'int32',
    'graphlegendtype',
    'int32',
    'graphlegendlayoutflags',
    'int32',
    'graphimagevaluerep',
    'int32',
    'graphquadrant',
    'int32',
    'arraywd',
    'int32',
    'arrayht',
    'int32',
    'sequenceflags',
    'int32',
    'chartdirection',
    'int32',
    'copyPasteTrialVers',
    'int32',
    'taskmanagementflags',
    'int32',
    'taskdays',
    'int32'
  ]

  static CDraw12Struct835 = [
    'nobjects',
    'int32',
    'ngroups',
    'int32',
    'nlinks',
    'int32',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'flags',
    'int32',
    'tselect',
    'int32',
    'unique',
    'int32',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'just',
    'int32',
    'vjust',
    'int32',
    'd_sarrow',
    'int32',
    'd_earrow',
    'int32',
    'd_arrowsize',
    'int32',
    'snapalign',
    'int32',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStruct, t)
      }
    },
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'defflags',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'activelayer',
    'int32',
    'tmargins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'textgrow',
    'int32',
    'textflags',
    'int32',
    'fsize_min',
    'int32',
    'styleindex',
    'int32',
    'h_arraywidth',
    'int32',
    'v_arraywidth',
    'int32',
    'lastcommand',
    'int32',
    'graphtype',
    'int32',
    'graphflags',
    'int32',
    'graphpointflags',
    'int32',
    'graphcataxisflags',
    'int32',
    'graphmagaxisflags',
    'int32',
    'graphlegendtype',
    'int32',
    'graphlegendlayoutflags',
    'int32',
    'graphimagevaluerep',
    'int32',
    'graphquadrant',
    'int32',
    'arraywd',
    'int32',
    'arrayht',
    'int32'
  ]

  static CDraw12Struct836 = [
    'nobjects',
    'int32',
    'ngroups',
    'int32',
    'nlinks',
    'int32',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'flags',
    'int32',
    'tselect',
    'int32',
    'unique',
    'int32',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'just',
    'int32',
    'vjust',
    'int32',
    'd_sarrow',
    'int32',
    'd_earrow',
    'int32',
    'd_arrowsize',
    'int32',
    'snapalign',
    'int32',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStruct, t)
      }
    },
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'defflags',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'activelayer',
    'int32',
    'tmargins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'textgrow',
    'int32',
    'textflags',
    'int32',
    'fsize_min',
    'int32',
    'styleindex',
    'int32',
    'h_arraywidth',
    'int32',
    'v_arraywidth',
    'int32',
    'lastcommand',
    'int32',
    'graphtype',
    'int32',
    'graphflags',
    'int32',
    'graphpointflags',
    'int32',
    'graphcataxisflags',
    'int32',
    'graphmagaxisflags',
    'int32',
    'graphlegendtype',
    'int32',
    'graphlegendlayoutflags',
    'int32',
    'graphimagevaluerep',
    'int32',
    'graphquadrant',
    'int32',
    'arraywd',
    'int32',
    'arrayht',
    'int32',
    'sequenceflags',
    'int32'
  ]

  static CDraw12Struct841 = [
    'nobjects',
    'int32',
    'ngroups',
    'int32',
    'nlinks',
    'int32',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'flags',
    'int32',
    'tselect',
    'int32',
    'unique',
    'int32',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'just',
    'int32',
    'vjust',
    'int32',
    'd_sarrow',
    'int32',
    'd_earrow',
    'int32',
    'd_arrowsize',
    'int32',
    'snapalign',
    'int32',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStruct, t)
      }
    },
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'defflags',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'activelayer',
    'int32',
    'tmargins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'textgrow',
    'int32',
    'textflags',
    'int32',
    'fsize_min',
    'int32',
    'styleindex',
    'int32',
    'h_arraywidth',
    'int32',
    'v_arraywidth',
    'int32',
    'lastcommand',
    'int32',
    'graphtype',
    'int32',
    'graphflags',
    'int32',
    'graphpointflags',
    'int32',
    'graphcataxisflags',
    'int32',
    'graphmagaxisflags',
    'int32',
    'graphlegendtype',
    'int32',
    'graphlegendlayoutflags',
    'int32',
    'graphimagevaluerep',
    'int32',
    'graphquadrant',
    'int32',
    'arraywd',
    'int32',
    'arrayht',
    'int32',
    'sequenceflags',
    'int32',
    'chartdirection',
    'int32'
  ]

  static CDraw12Struct842 = [
    'nobjects',
    'int32',
    'ngroups',
    'int32',
    'nlinks',
    'int32',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'flags',
    'int32',
    'tselect',
    'int32',
    'unique',
    'int32',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'just',
    'int32',
    'vjust',
    'int32',
    'd_sarrow',
    'int32',
    'd_earrow',
    'int32',
    'd_arrowsize',
    'int32',
    'snapalign',
    'int32',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStruct, t)
      }
    },
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'defflags',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'activelayer',
    'int32',
    'tmargins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'textgrow',
    'int32',
    'textflags',
    'int32',
    'fsize_min',
    'int32',
    'styleindex',
    'int32',
    'h_arraywidth',
    'int32',
    'v_arraywidth',
    'int32',
    'lastcommand',
    'int32',
    'graphtype',
    'int32',
    'graphflags',
    'int32',
    'graphpointflags',
    'int32',
    'graphcataxisflags',
    'int32',
    'graphmagaxisflags',
    'int32',
    'graphlegendtype',
    'int32',
    'graphlegendlayoutflags',
    'int32',
    'graphimagevaluerep',
    'int32',
    'graphquadrant',
    'int32',
    'arraywd',
    'int32',
    'arrayht',
    'int32',
    'sequenceflags',
    'int32',
    'chartdirection',
    'int32',
    'copyPasteTrialVers',
    'int32'
  ]

  static CDraw12Struct847 = [
    'nobjects',
    'int32',
    'ngroups',
    'int32',
    'nlinks',
    'int32',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'flags',
    'int32',
    'tselect',
    'int32',
    'unique',
    'int32',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'just',
    'int32',
    'vjust',
    'int32',
    'd_sarrow',
    'int32',
    'd_earrow',
    'int32',
    'd_arrowsize',
    'int32',
    'snapalign',
    'int32',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStruct, t)
      }
    },
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'defflags',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'activelayer',
    'int32',
    'tmargins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'textgrow',
    'int32',
    'textflags',
    'int32',
    'fsize_min',
    'int32',
    'styleindex',
    'int32',
    'h_arraywidth',
    'int32',
    'v_arraywidth',
    'int32',
    'lastcommand',
    'int32',
    'graphtype',
    'int32',
    'graphflags',
    'int32',
    'graphpointflags',
    'int32',
    'graphcataxisflags',
    'int32',
    'graphmagaxisflags',
    'int32',
    'graphlegendtype',
    'int32',
    'graphlegendlayoutflags',
    'int32',
    'graphimagevaluerep',
    'int32',
    'graphquadrant',
    'int32',
    'arraywd',
    'int32',
    'arrayht',
    'int32',
    'sequenceflags',
    'int32',
    'chartdirection',
    'int32',
    'copyPasteTrialVers',
    'int32',
    'taskmanagementflags',
    'int32',
    'taskdays',
    'int32',
    'moreflags',
    'int32'
  ]

  static CDraw8Struct = [
    'nobjects',
    'int32',
    'ngroups',
    'int32',
    'nlinks',
    'int32',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'flags',
    'int32',
    'tselect',
    'int32',
    'unique',
    'int32',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'just',
    'int32',
    'vjust',
    'int32',
    'd_sarrow',
    'int32',
    'd_earrow',
    'int32',
    'd_arrowsize',
    'int32',
    'snapalign',
    'int32',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStructPreV1)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStructPreV1, t)
      }
    },
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'defflags',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'activelayer',
    'int32',
    'tmargins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'textgrow',
    'int32',
    'textflags',
    'int32',
    'fsize_min',
    'int32',
    'styleindex',
    'int32',
    'h_arraywidth',
    'int32',
    'v_arraywidth',
    'int32',
    'lastcommand',
    'int32',
    'graphtype',
    'int32',
    'graphflags',
    'int32',
    'graphpointflags',
    'int32',
    'graphcataxisflags',
    'int32',
    'graphmagaxisflags',
    'int32',
    'graphlegendtype',
    'int32',
    'graphlegendlayoutflags',
    'int32',
    'graphimagevaluerep',
    'int32',
    'graphquadrant',
    'int32',
    'arraywd',
    'int32',
    'arrayht',
    'int32'
  ]

  static CDraw8Struct825 = [
    'nobjects',
    'int32',
    'ngroups',
    'int32',
    'nlinks',
    'int32',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'flags',
    'int32',
    'tselect',
    'int32',
    'unique',
    'int32',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'just',
    'int32',
    'vjust',
    'int32',
    'd_sarrow',
    'int32',
    'd_earrow',
    'int32',
    'd_arrowsize',
    'int32',
    'snapalign',
    'int32',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStructPreV1)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStructPreV1, t)
      }
    },
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'defflags',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'activelayer',
    'int32',
    'tmargins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'textgrow',
    'int32',
    'textflags',
    'int32',
    'fsize_min',
    'int32',
    'styleindex',
    'int32',
    'h_arraywidth',
    'int32',
    'v_arraywidth',
    'int32',
    'lastcommand',
    'int32',
    'graphtype',
    'int32',
    'graphflags',
    'int32',
    'graphpointflags',
    'int32',
    'graphcataxisflags',
    'int32',
    'graphmagaxisflags',
    'int32',
    'graphlegendtype',
    'int32',
    'graphlegendlayoutflags',
    'int32',
    'graphimagevaluerep',
    'int32',
    'graphquadrant',
    'int32'
  ]

  static CDraw8Struct810 = [
    'nobjects',
    'int32',
    'ngroups',
    'int32',
    'nlinks',
    'int32',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'flags',
    'int32',
    'tselect',
    'int32',
    'unique',
    'int32',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'just',
    'int32',
    'vjust',
    'int32',
    'd_sarrow',
    'int32',
    'd_earrow',
    'int32',
    'd_arrowsize',
    'int32',
    'snapalign',
    'int32',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStructPreV1)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStructPreV1, t)
      }
    },
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'defflags',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'activelayer',
    'int32',
    'tmargins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'textgrow',
    'int32',
    'textflags',
    'int32',
    'fsize_min',
    'int32',
    'styleindex',
    'int32',
    'h_arraywidth',
    'int32',
    'v_arraywidth',
    'int32',
    'lastcommand',
    'int32'
  ]

  static CDraw8Struct224 = [
    'nobjects',
    'int32',
    'ngroups',
    'int32',
    'nlinks',
    'int32',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'flags',
    'int32',
    'tselect',
    'int32',
    'unique',
    'int32',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'just',
    'int32',
    'vjust',
    'int32',
    'd_sarrow',
    'int32',
    'd_earrow',
    'int32',
    'd_arrowsize',
    'int32',
    'snapalign',
    'int32',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStructPreV1)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStructPreV1, t)
      }
    },
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'defflags',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'activelayer',
    'int32',
    'tmargins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'textgrow',
    'int32',
    'textflags',
    'int32',
    'fsize_min',
    'int32',
    'styleindex',
    'int32',
    'h_arraywidth',
    'int32',
    'v_arraywidth',
    'int32'
  ]

  static CDraw8Struct800 = [
    'nobjects',
    'int32',
    'ngroups',
    'int32',
    'nlinks',
    'int32',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'flags',
    'int32',
    'tselect',
    'int32',
    'unique',
    'int32',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'just',
    'int32',
    'vjust',
    'int32',
    'd_sarrow',
    'int32',
    'd_earrow',
    'int32',
    'd_arrowsize',
    'int32',
    'snapalign',
    'int32',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStructPreV1)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStructPreV1, t)
      }
    },
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'defflags',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'activelayer',
    'int32',
    'tmargins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'textgrow',
    'int32',
    'textflags',
    'int32',
    'fsize_min',
    'int32',
    'styleindex',
    'int32'
  ]

  static CDrawStruct236 = [
    'nobjects',
    'int16',
    'ngroups',
    'int16',
    'nlinks',
    'int16',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'flags',
    'int16',
    'tselect',
    'int16',
    'unique',
    'int16',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'colors',
    {
      get: function (e) {
        var t,
          a,
          r = [];
        for (t = 0; t < DSConstant.Std_ONStyleColors; ++t) a = e.readUint32(),
          r.push(a);
        return r
      }
    },
    'shaddisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      }
    },
    'shadowstyle',
    'int16',
    'styleflags',
    'int16',
    'sname',
    'string:32',
    'bord',
    'int16',
    'lbord',
    'int16',
    'fsize',
    'int16',
    'face',
    'int16',
    'just',
    'int16',
    'vjust',
    'int16',
    'fname',
    'string:32',
    'CharSet',
    'uint16',
    'd_fpatindex',
    'int16',
    'd_sarrow',
    'int16',
    'd_earrow',
    'int16',
    'd_arrowsize',
    'int16',
    'snapalign',
    'int16',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStructPreV1)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStructPreV1, t)
      }
    }
  ]

  static CDrawStruct252 = [
    'nobjects',
    'int16',
    'ngroups',
    'int16',
    'nlinks',
    'int16',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'flags',
    'int16',
    'tselect',
    'int16',
    'unique',
    'int16',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'colors',
    {
      get: function (e) {
        var t,
          a,
          r = [];
        for (t = 0; t < DSConstant.Std_ONStyleColors; ++t) a = e.readUint32(),
          r.push(a);
        return r
      }
    },
    'shaddisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      }
    },
    'shadowstyle',
    'int16',
    'styleflags',
    'int16',
    'sname',
    'string:32',
    'bord',
    'int16',
    'lbord',
    'int16',
    'fsize',
    'int16',
    'face',
    'int16',
    'just',
    'int16',
    'vjust',
    'int16',
    'fname',
    'string:32',
    'CharSet',
    'uint16',
    'd_fpatindex',
    'int16',
    'd_sarrow',
    'int16',
    'd_earrow',
    'int16',
    'd_arrowsize',
    'int16',
    'snapalign',
    'int16',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStructPreV1)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStructPreV1, t)
      }
    },
    'ecolor',
    'uint32',
    'gradientflags',
    'int32',
    'd_bpatindex',
    'uint32',
    'd_lpatindex',
    'uint32'
  ]

  static CDrawStruct268 = [
    'nobjects',
    'int16',
    'ngroups',
    'int16',
    'nlinks',
    'int16',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'flags',
    'int16',
    'tselect',
    'int16',
    'unique',
    'int16',
    'dupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'colors',
    {
      get: function (e) {
        var t,
          a,
          r = [];
        for (t = 0; t < DSConstant.Std_ONStyleColors; ++t) a = e.readUint32(),
          r.push(a);
        return r
      }
    },
    'shaddisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      }
    },
    'shadowstyle',
    'int16',
    'styleflags',
    'int16',
    'sname',
    'string:32',
    'bord',
    'int16',
    'lbord',
    'int16',
    'fsize',
    'int16',
    'face',
    'int16',
    'just',
    'int16',
    'vjust',
    'int16',
    'fname',
    'string:32',
    'CharSet',
    'uint16',
    'd_fpatindex',
    'int16',
    'd_sarrow',
    'int16',
    'd_earrow',
    'int16',
    'd_arrowsize',
    'int16',
    'snapalign',
    'int16',
    'lf',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LOGFontStructPreV1)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LOGFontStructPreV1, t)
      }
    },
    'ecolor',
    'uint32',
    'gradientflags',
    'int32',
    'd_bpatindex',
    'uint32',
    'd_lpatindex',
    'uint32',
    'ldim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'ldupdisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    }
  ]

  static CDraw7Struct52 = [
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'flags',
    'int32',
    'lbpatindex',
    'int32',
    'bfillcolor',
    'int32',
    'bthick',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'dbthick',
    'float64',
    'sbpatindex',
    'int32',
    'activelayer',
    'int32'
  ]

  static CDraw7Struct48 = [
    'hopstyle',
    'int32',
    'hopdim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'flags',
    'int32',
    'lbpatindex',
    'int32',
    'bfillcolor',
    'int32',
    'bthick',
    'int32',
    'dimensions',
    'int32',
    'shapedimensions',
    'int32',
    'dbthick',
    'float64',
    'sbpatindex',
    'int32'
  ]

  static CDrawExtraStruct14 = [
    'tmargins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'textgrow',
    'int16',
    'textflags',
    'int16',
    'fsize_min',
    'int16'
  ]

  static CDrawObj5Struct60 = [
    'attachpoint_x',
    'int32',
    'attachpoint_y',
    'int32',
    'rleft',
    'float64',
    'rtop',
    'float64',
    'rright',
    'float64',
    'rbottom',
    'float64',
    'rwd',
    'float64',
    'rht',
    'float64',
    'rflags',
    'int32'
  ]

  static DrawTextStruct182 = [
    'left_sindent',
    'float64',
    'top_sindent',
    'float64',
    'right_sindent',
    'float64',
    'bottom_sindent',
    'float64',
    'tindent',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DRectStruct, t)
      }
    },
    'tmargin',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DRectStruct, t)
      }
    },
    'textid',
    'int16',
    'textflags',
    'uint16',
    'ascent',
    'uint16',
    'vjust',
    'uint16',
    'just',
    'uint16',
    'textgrow',
    'uint16',
    'tangle',
    'float64',
    'ltrect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DRectStruct, t)
      }
    },
    'commentid',
    'int16',
    'textwrapwidth',
    'float64',
    'linetextx',
    'float64',
    'linetexty',
    'float64',
    'visiorotationdiff',
    'float64'
  ]

  static DrawTextStruct110 = [
    'trect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'left_sindent',
    'float64',
    'top_sindent',
    'float64',
    'right_sindent',
    'float64',
    'bottom_sindent',
    'float64',
    'tindent',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'tmargin',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'textid',
    'int16',
    'textflags',
    'uint16',
    'ascent',
    'uint16',
    'vjust',
    'uint16',
    'just',
    'uint16',
    'textgrow',
    'uint16',
    'tangle',
    'int16',
    'gtangle',
    'int16',
    'ltrect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'commentid',
    'int16',
    'textwrapwidth',
    'int32',
    'linetextx',
    'float64',
    'linetexty',
    'int32',
    'visiorotationdiff',
    'int32'
  ]

  static DrawTextStruct106 = [
    'trect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'left_sindent',
    'float64',
    'top_sindent',
    'float64',
    'right_sindent',
    'float64',
    'bottom_sindent',
    'float64',
    'tindent',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'tmargin',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'textid',
    'int16',
    'textflags',
    'uint16',
    'ascent',
    'uint16',
    'vjust',
    'uint16',
    'just',
    'uint16',
    'textgrow',
    'uint16',
    'tangle',
    'int16',
    'gtangle',
    'int16',
    'ltrect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'commentid',
    'int16',
    'textwrapwidth',
    'int32',
    'linetextx',
    'float64',
    'linetexty',
    'int32'
  ]

  static DrawTextStruct94 = [
    'trect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'left_sindent',
    'float64',
    'top_sindent',
    'float64',
    'right_sindent',
    'float64',
    'bottom_sindent',
    'float64',
    'tindent',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'tmargin',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'textid',
    'int16',
    'textflags',
    'uint16',
    'ascent',
    'uint16',
    'vjust',
    'uint16',
    'just',
    'uint16',
    'textgrow',
    'uint16',
    'tangle',
    'int16',
    'gtangle',
    'int16',
    'ltrect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'commentid',
    'int16',
    'textwrapwidth',
    'int32'
  ]

  static DrawTextStruct = [
    'trect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'left_sindent',
    'float64',
    'top_sindent',
    'float64',
    'right_sindent',
    'float64',
    'bottom_sindent',
    'float64',
    'tindent',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'tmargin',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'textid',
    'int16',
    'textflags',
    'uint16',
    'ascent',
    'uint16',
    'vjust',
    'uint16',
    'just',
    'uint16',
    'textgrow',
    'uint16',
    'tangle',
    'int16',
    'gtangle',
    'int16',
    'ltrect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'commentid',
    'int16'
  ]

  static DrawTextStruct810 = [
    'trect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'left_sindent',
    'float64',
    'top_sindent',
    'float64',
    'right_sindent',
    'float64',
    'bottom_sindent',
    'float64',
    'tindent',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'tmargin',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'textid',
    'int16',
    'textflags',
    'uint16',
    'ascent',
    'uint16',
    'vjust',
    'uint16',
    'just',
    'uint16',
    'textgrow',
    'uint16',
    'tangle',
    'int16',
    'gtangle',
    'int16',
    'ltrect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    }
  ]

  static DrawTextStruct300 = [
    'trect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'left_sindent',
    'float64',
    'top_sindent',
    'float64',
    'right_sindent',
    'float64',
    'bottom_sindent',
    'float64',
    'tindent',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'tmargin',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'textid',
    'int16',
    'textflags',
    'uint16',
    'ascent',
    'uint16',
    'vjust',
    'uint16',
    'just',
    'uint16',
    'textgrow',
    'uint16',
    'tangle',
    'int16',
    'gtangle',
    'int16'
  ]

  static LonText8Struct8 = [
    'InstID',
    'int32',
    'nstyles',
    'int32'
  ]

  static LongText8Struct = [
    'InstID',
    'int32',
    'nruns',
    'int32',
    'nstyles',
    'int32',
    'nchar',
    'int32',
    'flags',
    'int32',
    'margins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'nlinks',
    'int32',
    'nlinkchar',
    'int32',
    'markupobjid',
    'int32'
  ]

  static SDF_LONGTEXT8_Struct_8 = ["InstID", "int32", "nstyles", "int32"]
  static SDF_TEXTRUNS_Header = ["nruns", "uint16"]
  static SDF_TEXTSTYLE_Header = ["index", "uint16", "ncodes", "uint16"]

  static LongTextStruct = [
    'InstID',
    'int16',
    'nruns',
    'int16',
    'nstyles',
    'int16',
    'nchar',
    'uint32',
    'flags',
    'uint16',
    'margins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'shaddisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'shadowstyle',
    'int16',
    'scolor',
    'uint32',
    'hcolor',
    'uint32',
    'nlinks',
    'uint32',
    'nlinkchar',
    'uint32'
  ]

  static TextStruct = [
    'InstID',
    'int16',
    'nruns',
    'int16',
    'nstyles',
    'int16',
    'nchar',
    'uint16',
    'flags',
    'uint16',
    'margins',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'shaddisp',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'shadowstyle',
    'int16',
    'scolor',
    'uint32',
    'hcolor',
    'uint32'
  ]

  static TextCodeStruct = [
    'code',
    'uint16',
    'value',
    'uint32'
  ]

  static TextCodeStructFloat = [
    'code',
    'uint16',
    'value',
    'float64'
  ]

  static TextCodeStructCode = [
    'code',
    'uint16'
  ]

  static TextCodeStructValue = [
    'value',
    'uint32'
  ]

  static TextCodeStructValueFloat = [
    'value',
    'float64'
  ]

  static TextRunsHeader = [
    'nruns',
    'uint16'
  ]

  static TextChangeHeader = [
    'ncodes',
    'uint16',
    'offset',
    'uint32'
  ]

  static StyleCodeStruct = [
    'code',
    'uint16',
    'value',
    'int16'
  ]

  static TextStyleHeader = [
    'index',
    'uint16',
    'ncodes',
    'uint16'
  ]

  static TextLinkHeader = [
    'index',
    'uint16',
    'type',
    'uint16'
  ]

  static PolyListStruct24 = [
    'InstID',
    'int16',
    'n',
    'int16',
    'flags',
    'uint32',
    'ldim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DPointStruct, t)
      }
    }
  ]

  static PolyListStruct20 = [
    'InstID',
    'int16',
    'n',
    'int16',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'flags',
    'uint32',
    'ldim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    }
  ]

  static PolyListStruct8 = [
    'InstID',
    'int16',
    'n',
    'int16',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    }
  ]

  static PolyListStruct12 = [
    'InstID',
    'int16',
    'n',
    'int16',
    'dim',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'flags',
    'uint32'
  ]

  static PolySegStruct18 = [
    'otype',
    'int16',
    'dataclass',
    'int16',
    'ShortRef',
    'int16',
    'param',
    'float64',
    'lpt',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    }
  ]

  static PolySegStruct26 = [
    'otype',
    'int16',
    'dataclass',
    'int16',
    'ShortRef',
    'int16',
    'param',
    'float64',
    'pt',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'lpt',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    }
  ]

  static PolySegStruct = [
    'otype',
    'int16',
    'dataclass',
    'int16',
    'ShortRef',
    'int16',
    'param',
    'float64',
    'pt',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'lpt',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'dimDeflection',
    'int16'
  ]

  static PolySegStruct847 = [
    'otype',
    'int16',
    'dataclass',
    'int16',
    'ShortRef',
    'int16',
    'param',
    'float64',
    'pt',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'lpt',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'dimDeflection',
    'int16',
    'flags',
    'int32'
  ]

  static PolySegStruct50 = [
    'otype',
    'int16',
    'dataclass',
    'int16',
    'ShortRef',
    'int16',
    'param',
    'float64',
    'lpt',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DPointStruct, t)
      }
    },
    'dimDeflection',
    'float64',
    'flags',
    'int32',
    'weight',
    'float64'
  ]

  static PolySegStruct40 = [
    'otype',
    'int16',
    'dataclass',
    'int16',
    'ShortRef',
    'int16',
    'param',
    'float64',
    'pt',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'lpt',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LPointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LPointStruct, t)
      }
    },
    'dimDeflection',
    'int16',
    'flags',
    'int32',
    'weight',
    'float64'
  ]

  static PolySegExplicitPointStruct = [
    'npts',
    'int16',
    'pt',
    {
      get: function (e) {
        var t,
          a,
          r = [];
        for (t = 0; t < DSConstant.SED_NParaPts; ++t) a = e.readStruct(DSConstant.LPointStruct),
          r.push(a);
        return r
      },
      set: function (e, t) {
        var a;
        for (a = 0; a < DSConstant.SED_NParaPts; ++a) e.writeStruct(DSConstant.LPointStruct, t[a])
      }
    }
  ]

  static FreehandLineStruct = [
    'InstID',
    'int16',
    'npts',
    'int16',
    'pts',
    {
      get: function (e, t) {
        var a,
          r,
          i = [];
        for (a = 0; a < t.npts; a++) r = e.readStruct(DSConstant.DPointStruct),
          i.push(r);
        return i
      },
      set: function (e, t, a) {
        var r;
        for (r = 0; r < a.npts; ++r) e.writeStruct(DSConstant.DPointStruct, t[r])
      }
    }
  ]

  static ConnectPointStruct = [
    'nconnect',
    'int32',
    'connect',
    {
      get: function (e, t) {
        var a,
          r,
          i = [];
        for (a = 0; a < t.nconnect; ++a) r = e.readStruct(DSConstant.LPointStruct),
          i.push(r);
        return i
      },
      set: function (e, t, a) {
        var r;
        for (r = 0; r < a.nconnect; ++r) e.writeStruct(DSConstant.LPointStruct, t[r])
      }
    }
  ]

  static LinkStruct = [
    'targetid',
    'uint16',
    'tindex',
    'int16',
    'hookid',
    'uint16',
    'hindex',
    'int16',
    'flags',
    'uint16',
    'cellid',
    'uint32'
  ]

  static Link6Struct = [
    'targetid',
    'uint16',
    'tindex',
    'int16',
    'hookid',
    'uint16',
    'hindex',
    'int16',
    'flags',
    'uint16'
  ]

  static LinkListStruct = [
    'n',
    'int16',
    'size',
    'int16',
    'links',
    {
      get: function (e, t) {
        var a,
          r,
          i = [];
        for (a = 0; a < t.n; ++a) r = e.readStruct(DSConstant.LinkStruct),
          i.push(r);
        return i
      },
      set: function (e, t, a) {
        var r;
        for (r = 0; r < a.n; ++r) e.writeStruct(DSConstant.LinkStruct, t[r])
      }
    }
  ]

  static LinkList6Struct = [
    'n',
    'int16',
    'size',
    'int16',
    'links',
    {
      get: function (e, t) {
        var a,
          r,
          i = [];
        for (a = 0; a < t.n; ++a) r = e.readStruct(DSConstant.Link6Struct),
          i.push(r);
        return i
      },
      set: function (e, t, a) {
        var r;
        for (r = 0; r < a.n; ++r) e.writeStruct(DSConstant.Link6Struct, t[r])
      }
    }
  ]

  static ArrayHookTextStruct = [
    'tindex',
    'int32',
    'tuniqueid',
    'uint32'
  ]

  static SegLineStruct210 = [
    'InstId',
    'int16',
    'firstdir',
    'int16',
    'lastdir',
    'int16',
    'curveparam',
    'int16',
    'nsegs',
    'int16',
    'lsegr',
    {
      get: function (e) {
        var t,
          a,
          r = [];
        for (t = 0; t < 5; ++t) a = e.readStruct(DSConstant.DRectStruct),
          r.push(a);
        return r
      },
      set: function (e, t) {
        var a;
        for (a = 0; a < 5; ++a) e.writeStruct(DSConstant.DRectStruct, t[a])
      }
    },
    'llengths',
    {
      get: function (e) {
        var t,
          a,
          r = [];
        for (t = 0; t < 5; ++t) a = e.readFloat64(),
          r.push(a);
        return r
      },
      set: function (e, t) {
        var a;
        for (a = 0; a < 5; ++a) e.writeFloat64(t[a])
      }
    }
  ]

  static SegLineStruct208 = [
    'InstId',
    'int16',
    'firstdir',
    'int16',
    'lastdir',
    'int16',
    'nsegs',
    'int16',
    'lsegr',
    {
      get: function (e) {
        var t,
          a,
          r = [];
        for (t = 0; t < 5; ++t) a = e.readStruct(DSConstant.DRectStruct),
          r.push(a);
        return r
      },
      set: function (e, t) {
        var a;
        for (a = 0; a < 5; ++a) e.writeStruct(DSConstant.DRectStruct, t[a])
      }
    },
    'llengths',
    {
      get: function (e) {
        var t,
          a,
          r = [];
        for (t = 0; t < 5; ++t) a = e.readFloat64(),
          r.push(a);
        return r
      },
      set: function (e, t) {
        var a;
        for (a = 0; a < 5; ++a) e.writeFloat64(t[a])
      }
    }
  ]

  static SegLineStruct = [
    'InstId',
    'int16',
    'firstdir',
    'int16',
    'lastdir',
    'int16',
    'nsegs',
    'int16',
    'segr',
    {
      get: function (e) {
        var t,
          a,
          r = [];
        for (t = 0; t < 5; ++t) a = e.readStruct(DSConstant.RectStruct),
          r.push(a);
        return r
      },
      set: function (e, t) {
        var a;
        for (a = 0; a < 5; ++a) e.writeStruct(DSConstant.RectStruct, t[a])
      }
    },
    'lengths',
    {
      get: function (e) {
        var t,
          a,
          r = [];
        for (t = 0; t < 5; ++t) a = e.readInt16(),
          r.push(a);
        return r
      },
      set: function (e, t) {
        var a;
        for (a = 0; a < 5; ++a) e.writeInt16(t[a])
      }
    },
    'lsegr',
    {
      get: function (e) {
        var t,
          a,
          r = [];
        for (t = 0; t < 5; ++t) a = e.readStruct(DSConstant.LRectStruct),
          r.push(a);
        return r
      },
      set: function (e, t) {
        var a;
        for (a = 0; a < 5; ++a) e.writeStruct(DSConstant.LRectStruct, t[a])
      }
    },
    'llengths',
    {
      get: function (e) {
        var t,
          a,
          r = [];
        for (t = 0; t < 5; ++t) a = e.readInt32(),
          r.push(a);
        return r
      },
      set: function (e, t) {
        var a;
        for (a = 0; a < 5; ++a) e.writeInt32(t[a])
      }
    }
  ]

  static SegLineStruct58 = [
    'InstId',
    'int16',
    'firstdir',
    'int16',
    'lastdir',
    'int16',
    'nsegs',
    'int16',
    'segr',
    {
      get: function (e) {
        var t,
          a,
          r = [];
        for (t = 0; t < 5; ++t) a = e.readStruct(DSConstant.RectStruct),
          r.push(a);
        return r
      },
      set: function (e, t) {
        var a;
        for (a = 0; a < 5; ++a) e.writeStruct(DSConstant.RectStruct, t[a])
      }
    },
    'lengths',
    {
      get: function (e) {
        var t,
          a,
          r = [];
        for (t = 0; t < 5; ++t) a = e.readInt16(),
          r.push(a);
        return r
      },
      set: function (e, t) {
        var a;
        for (a = 0; a < 5; ++a) e.writeInt16(t[a])
      }
    }
  ]

  static ArrayStruct30 = [
    'InstID',
    'int16',
    'styleflags',
    'uint16',
    'tilt',
    'int16',
    'nshapes',
    'int16',
    'nlines',
    'int16',
    'lht',
    'float64',
    'lwd',
    'float64',
    'angle',
    'int32'
  ]

  static ArrayStruct34 = [
    'InstID',
    'int16',
    'styleflags',
    'uint16',
    'tilt',
    'int16',
    'nshapes',
    'int16',
    'nlines',
    'int16',
    'lht',
    'float64',
    'lwd',
    'float64',
    'angle',
    'int32',
    'curveparam',
    'int32'
  ]

  static ArrayStruct = [
    'InstID',
    'int16',
    'styleflags',
    'uint16',
    'tilt',
    'int16',
    'ht',
    'int16',
    'wd',
    'int16',
    'nshapes',
    'int16',
    'nlines',
    'int16',
    'lht',
    'int32',
    'lwd',
    'int32',
    'profile',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'angle',
    'int32'
  ]

  static ArrayStruct38 = [
    'InstID',
    'int16',
    'styleflags',
    'uint16',
    'tilt',
    'int16',
    'ht',
    'int16',
    'wd',
    'int16',
    'nshapes',
    'int16',
    'nlines',
    'int16',
    'lht',
    'int32',
    'lwd',
    'int32',
    'profile',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    }
  ]

  static ArrayStruct14 = [
    'InstID',
    'int16',
    'styleflags',
    'uint16',
    'tilt',
    'int16',
    'ht',
    'int16',
    'wd',
    'int16',
    'nshapes',
    'int16',
    'nlines',
    'int16'
  ]

  static ArrayHookStruct50 = [
    'uniqueid',
    'uint16',
    'extra',
    'float64',
    'lliner',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DRectStruct, t)
      }
    },
    'lgap',
    'float64'
  ]

  static ArrayHookStruct38 = [
    'liner',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'uniqueid',
    'uint16',
    'index',
    'int16',
    'gap',
    'int16',
    'extra',
    'int32',
    'lliner',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'lgap',
    'int32'
  ]

  static ArrayHookStruct18 = [
    'liner',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'uniqueid',
    'uint16',
    'index',
    'int16',
    'gap',
    'int16',
    'extra',
    'int32'
  ]

  static ArrayHookStruct14 = [
    'liner',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'uniqueid',
    'uint16',
    'index',
    'int16',
    'gap',
    'int16'
  ]

  static ContainerListStruct100 = [
    'Arrangement',
    'int32',
    'HorizontalSpacing',
    'float64',
    'VerticalSpacing',
    'float64',
    'AlignH',
    'string:8',
    'AlignV',
    'string:8',
    'Wrap',
    'int32',
    'height',
    'float64',
    'width',
    'float64',
    'MinWidth',
    'float64',
    'MinHeight',
    'float64',
    'flags',
    'int32',
    'nacross',
    'int32',
    'ndown',
    'int32',
    'childwidth',
    'float64',
    'childheight',
    'float64'
  ]

  static ContainerListStruct92 = [
    'Arrangement',
    'int32',
    'HorizontalSpacing',
    'int32',
    'VerticalSpacing',
    'int32',
    'AlignH',
    'string:8',
    'AlignV',
    'string:8',
    'Wrap',
    'int32',
    'height',
    'float64',
    'width',
    'float64',
    'MinWidth',
    'float64',
    'MinHeight',
    'float64',
    'flags',
    'int32',
    'nacross',
    'int32',
    'ndown',
    'int32',
    'childwidth',
    'float64',
    'childheight',
    'float64'
  ]

  static ContainerHookStruct20 = [
    'x',
    'float64',
    'y',
    'float64',
    'id',
    'int32'
  ]

  static ContainerHookStruct28 = [
    'x',
    'float64',
    'y',
    'float64',
    'id',
    'int32',
    'extra',
    'float64'
  ]

  static ObjDataStruct16 = [
    'datasetID',
    'int32',
    'datasetElemID',
    'int32',
    'datasetType',
    'int32',
    'datasetTableID',
    'int32'
  ]

  static ObjDataStruct32 = [
    'datasetID',
    'int32',
    'datasetElemID',
    'int32',
    'datasetType',
    'int32',
    'datasetTableID',
    'int32',
    'fieldDataDatasetID',
    'int32',
    'fieldDataElemID',
    'int32',
    'fieldDataTableID',
    'int32',
    'fieldDataDatasetID',
    'int32'
  ]

  static RulerStruct = [
    'show',
    'int16',
    'inches',
    'int16',
    'Major',
    'float64',
    'MinorDenom',
    'int16',
    'MajorScale',
    'float64',
    'units',
    'int16',
    'dp',
    'int32',
    'originx',
    'float64',
    'originy',
    'float64'
  ]

  static RulerStruct24 = [
    'show',
    'int16',
    'inches',
    'int16',
    'Major',
    'float64',
    'MinorDenom',
    'int16',
    'MajorScale',
    'float64',
    'units',
    'int16'
  ]

  static RulerStruct48 = [
    'show',
    'int16',
    'inches',
    'int16',
    'Major',
    'float64',
    'MinorDenom',
    'int16',
    'MajorScale',
    'float64',
    'units',
    'int16',
    'dp',
    'int32',
    'originx',
    'float64',
    'originy',
    'float64',
    'showpixels',
    'int32'
  ]

  static RulerStruct52 = [
    'show',
    'int16',
    'inches',
    'int16',
    'Major',
    'float64',
    'MinorDenom',
    'int16',
    'MajorScale',
    'float64',
    'units',
    'int16',
    'dp',
    'int32',
    'originx',
    'float64',
    'originy',
    'float64',
    'showpixels',
    'int32',
    'fractionaldenominator',
    'int32'
  ]

  static DrawImage8Struct82 = [
    'mr',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DCRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DCRectStruct, t)
      }
    },
    'croprect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DRectStruct, t)
      }
    },
    'imageflags',
    'int32',
    'scale',
    'float64',
    'uniqueid',
    'uint32',
    'iconid',
    'uint16'
  ]

  static DrawImage8Struct50 = [
    'mr',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'croprect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'imageflags',
    'int32',
    'scale',
    'float64',
    'uniqueid',
    'uint32',
    'iconid',
    'uint16'
  ]

  static DrawImage8Struct48 = [
    'mr',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'croprect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.LRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.LRectStruct, t)
      }
    },
    'imageflags',
    'int32',
    'scale',
    'float64',
    'uniqueid',
    'uint32'
  ]

  static BeginTheme12Struct = [
    'name',
    'u16stringle:32',
    'ncolorrows',
    'int32',
    'ncolorcols',
    'int32',
    'EffectStyleIndex',
    'int32'
  ]

  static BeginTextfStruct = [
    'fontid',
    'int32',
    'fsize',
    'int32',
    'face',
    'int32'
  ]

  static OutSideEffectStruct = [
    'outsidetype',
    'int32',
    'extent',
    {
      get: function (e) {
        return e.readStruct(DSConstant.DRectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.DRectStruct, t)
      }
    },
    'color',
    'uint32',
    'lparam',
    'int32',
    'wparam',
    'int32'
  ]

  static ThemeFont12Struct = [
    'fontname',
    'u16stringle:32',
    'charset',
    'int32'
  ]

  static BeginLineStruct8 = [
    'thickness',
    'int32',
    'pattern',
    'int32'
  ]

  static BeginLineStruct12 = [
    'thickness',
    'int32',
    'pattern',
    'float64'
  ]

  static BeginLineStruct14 = [
    'thickness',
    'float64',
    'pattern',
    'int32',
    'dummy',
    'int16'
  ]

  static BeginPaintStruct = [
    'filltype',
    'uint32',
    'color',
    'uint32'
  ]

  static GradientStruct = [
    'gradientflags',
    'uint32',
    'ecolor',
    'uint32'
  ]

  static RichGradientStruct = [
    'gradienttype',
    'uint32',
    'angle',
    'uint32',
    'nstops',
    'uint32'
  ]

  static RichGradientStopStruct = [
    'color',
    'uint32',
    'stop',
    'uint32'
  ]

  static EffectStruct = [
    'effecttype',
    'int32',
    'effectcolor',
    'uint32',
    'wparam',
    'int32',
    'lparam',
    'int32'
  ]

  static FilledLineStruct = [
    'bthick',
    'float64',
    'color',
    'uint32'
  ]

  static DrawArrowStruct = [
    'arrowsize',
    'uint32',
    'sarrow',
    'uint32',
    'earrow',
    'uint32',
    'sarrowid',
    'uint32',
    'earrowid',
    'uint32'
  ]

  static DrawHookStruct = [
    'objid',
    'uint16',
    'index',
    'int16',
    'connectx',
    'int16',
    'connecty',
    'int16',
    'hookpt',
    'int16',
    'cellid',
    'uint32'
  ]

  static DrawHookStruct10 = [
    'objid',
    'uint16',
    'index',
    'int16',
    'connectx',
    'int16',
    'connecty',
    'int16',
    'hookpt',
    'int16'
  ]

  static DrawHookVisioStruct = [
    'objid',
    'uint16',
    'index',
    'int16',
    'connectx',
    'int16',
    'connecty',
    'int16',
    'hookpt',
    'int16',
    'cellid',
    'uint32',
    'lconnectx',
    'int32',
    'lconnecty',
    'int32'
  ]

  static LongValueStruct = [
    'value',
    'uint32'
  ]

  static LongValue2Struct = [
    'value',
    'uint32',
    'type',
    'uint32'
  ]

  static DrawBOrderStruct = [
    'bord',
    'uint16',
    'patindex',
    'int16',
    'color',
    'uint32'
  ]

  static GanttinfoStruct = [
    'timeScale',
    'uint32',
    'flags',
    'uint32',
    'configuredStart1',
    'uint32',
    'configuredStart2',
    'uint32',
    'configuredEnd1',
    'uint32',
    'configuredEnd2',
    'uint32',
    'start1',
    'uint32',
    'start2',
    'uint32',
    'end1',
    'uint32',
    'end2',
    'uint32',
    'scrollStart1',
    'uint32',
    'scrollStart2',
    'uint32',
    'scrollEnd1',
    'uint32',
    'scrollEnd2',
    'uint32'
  ]

  static DrawLineStruct = [
    'bord',
    'uint16',
    'patindex',
    'int16',
    'color',
    'uint32',
    'arrowsize',
    'uint16',
    'sarrow',
    'uint16',
    'earrow',
    'uint16',
    'sarrowid',
    'uint16',
    'earrowid',
    'uint16'
  ]

  static DrawFillStruct = [
    'fpatindex',
    'uint16',
    'color',
    'uint32',
    'gradientflags',
    'int32',
    'ecolor',
    'uint32'
  ]

  static DrawFillStruct6 = [
    'fpatindex',
    'uint16',
    'color',
    'uint32'
  ]

  static GraphStruct = [
    'stackScale',
    'uint16',
    'pointflags',
    'uint16',
    'valuePrecision',
    'uint16',
    'pieChartCategory',
    'uint16',
    'pieOriginTangle',
    'uint16',
    'flags',
    'uint16',
    'prefixChar',
    'uint16',
    'graphtype',
    'uint16',
    'quadrant',
    'uint16',
    'barAreaAmount',
    'float64',
    'barAreaAmountStacked',
    'float64',
    'npoints',
    'uint16',
    'imageValueRep',
    'uint16',
    'graphLegendType',
    'uint16',
    'perspectiveView3D',
    'float64',
    'effectLightDirection3D',
    'uint16',
    'suffixChar',
    'uint16'
  ]

  static GraphAxisStruct = [
    'orientation',
    'uint16',
    'flags',
    'uint16',
    'lflags',
    'uint16',
    'fixedpoint',
    'uint16',
    'frame',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'margin',
    'uint16',
    'startpref',
    'float64',
    'endpref',
    'float64',
    'start',
    'float64',
    'end',
    'float64',
    'major',
    'float64',
    'majorscale',
    'float64',
    'minor',
    'float64',
    'minorscale',
    'float64',
    'tickstyles',
    'uint16',
    'labelformat',
    'uint16',
    'summaryflags',
    'uint32',
    'majorpref',
    'float64',
    'minorpref',
    'float64'
  ]

  static GraphPointStruct = [
    'dataid',
    'uint16',
    'seriesid',
    'uint16',
    'categoryid',
    'uint16',
    'value',
    'float64',
    'frame',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'tangle',
    'uint16',
    'flags',
    'uint16',
    'labelformat',
    'uint16',
    'explodeAmt',
    'uint16',
    'labelstyle',
    'uint16',
    'imagescale',
    'float64',
    'imagerect',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'labelTextId',
    'uint16',
    'labelTangle',
    'uint16',
    'labelFrame',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'labelCenter',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    }
  ]

  static GraphAxisTitleStruct = [
    'lflags',
    'uint16',
    'just',
    'uint16',
    'margin',
    'uint16',
    'frame',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'tangle',
    'uint16',
    'drawpt',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'center',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    }
  ]

  static GraphAxisLabelStruct = [
    'categoryid',
    'uint16',
    'lflags',
    'uint16',
    'frame',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'tangle',
    'uint16',
    'center',
    {
      get: function (e) {
        return e.readStruct(DSConstant.PointStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.PointStruct, t)
      }
    },
    'textid',
    'uint16',
    'just',
    'uint16',
    'vjust',
    'uint16'
  ]

  static GraphLegendEntryStruct = [
    'seriesid',
    'uint16',
    'lflags',
    'uint16',
    'textid',
    'uint16',
    'imgIndx',
    'uint16',
    'textFrame',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'swatchFrame',
    {
      get: function (e) {
        return e.readStruct(DSConstant.RectStruct)
      },
      set: function (e, t) {
        e.writeStruct(DSConstant.RectStruct, t)
      }
    },
    'flags',
    'uint16'
  ]

  static LayerListStruct = [
    'n',
    'int32',
    'zList',
    {
      get: function (e, t) {
        var a,
          r,
          i = [];
        for (a = 0; a < t.n; ++a) r = e.readInt32(e.endianness),
          i.push(r);
        return i
      },
      set: function (e, t, a) {
        var r;
        for (r = 0; r < a.n; ++r) e.writeInt32(t[r], e.endianness)
      }
    }
  ]

  static OleHeaderStruct = [
    'dva',
    'uint32',
    'linked',
    'int16',
    'scale',
    'float64'
  ]


  /**
   * Definition of Texture structure for parsing texture data
   * Contains dimension, rectangle, image type and flags
   */
  static TextureStructA = [
    'dim',
    {
      get: function (stream) {
        return stream.readStruct(DSConstant.LPointStruct);
      },
      set: function (stream, value) {
        stream.writeStruct(DSConstant.LPointStruct, value);
      }
    },
    'mr',
    {
      get: function (stream) {
        return stream.readStruct(DSConstant.LRectStruct);
      },
      set: function (stream, value) {
        stream.writeStruct(DSConstant.LRectStruct, value);
      }
    },
    'imagetype',
    'int32',
    'flags',
    'int32'
  ]


  /**
   * Flag indicating whether to read Unicode strings
   * Used during parsing to determine string encoding format
   */
  static ReadUnicode = true;

  /**
   * Current texture format detected during parsing
   * Set by parseOTexture based on the image type
   */
  static TextureFormat = '';
  static SDF_PVERSION861 = 861
  static SDF_MINFVERSION = 3
  static SDF_MINSVERSION = 5
  static SDF_FVERSION = 41
  static FVERSIONVSM = 37
  static SDF_FVERSION2022 = 41
  static SDF_PVERSION859 = 859
}

export default DSConstant
