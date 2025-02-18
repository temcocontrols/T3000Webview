



import { Type } from 'class-transformer'
import 'reflect-metadata'
import Globals from "../Data/Globals"
import Utils1 from '../Helper/Utils1'
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import Global from '../Data/Globals'
import GPP from '../Data/GlobalData'
import DefaultStyle from '../Model/DefaultStyle'
import Point from '../Model/Point'
import $ from 'jquery'
import Document from '../Basic/Basic.Document'
import Element from '../Basic/Basic.Element';
import Effects from "../Basic/Basic.Element.Effects";
import Formatter from '../Basic/Basic.Text.Formatter'
import Utils4 from "../Helper/Utils3";
import ParagraphFormat from '../Model/ParagraphFormat'
import Instance from "../Data/Instance/Instance"
import ConstantData from "../Data/ConstantData"
import TextFormatData from "../Model/TextFormatData"
import QuickStyle from "../Model/QuickStyle"
import PolySeg from '../Model/PolySeg'
import RightClickData from '../Model/RightClickData'
import TextObject from '../Model/TextObject'
import Rectangle from '../Model/Rectangle'
import CRect from '../Model/CRect'
import ConstantData2 from '../Data/ConstantData2'
import PolyList from '../Model/PolyList'

class BaseDrawingObject {

  public Type: string;
  public Frame: Rectangle;
  public r: Point;
  public inside: Point;
  public trect: Point;
  public rtop: number;
  public rleft: number;
  public rbottom: number;
  public rright: number;
  public rwd: number;
  public rht: number;
  public rflags: number;
  public RotationAngle: number;
  public ShortRef: number;

  @Type(() => QuickStyle)
  public StyleRecord: QuickStyle;

  public Dimensions: number;
  public bOverrideDefaultStyleOnDraw: boolean;
  public UniqueID: number;
  public flags: number;
  public extraflags: number;
  public hookflags: any[];
  public targflags: any[];
  public hooks: any[];
  public maxhooks: number;
  public associd: number;
  public attachpoint: Point;

  public hookdisp: Point;
  public TextFlags: number;
  public DrawingObjectBaseClass: number;
  public objecttype: number;
  public subtype: number;
  public dataclass: number;
  public Layer: number;
  public SequenceNumber: number;
  public BusinessObjectID: number;
  public NoteID: number;
  public ExpandedViewID: number;
  public DataID: number;
  public tindent: Point;
  public TMargins: Point;
  public left_sindent: number;
  public right_sindent: number;
  public top_sindent: number;
  public bottom_sindent: number;
  public TableID: number;
  public GraphID: number;
  public GanttInfoID: number;
  public ImageID: number;
  public ContentType: number;
  public ContentID: number;
  public CommentID: number;
  public TextParams: any;
  public TextGrow: number;
  public TextAlign: number;
  public colorfilter: number;
  public colorchanges: number;
  public moreflags: number;
  public sizedim: Point;
  public ConnectPoints: any[];
  public ObjGrow: number;
  public datasetType: number;
  public datasetID: number;
  public datasetTableID: number;
  public datasetElemID: number;
  public fieldDataDatasetID: number;
  public fieldDataTableID: number;
  public fieldDataElemID: number;
  public dataStyleOverride: any;
  public SymbolURL: string;
  public ImageURL: string;
  public ImageDir: any;
  public BlobBytesID: number;
  public EMFHash: any;
  public EMFBlobBytesID: number;
  public OleBlobBytesID: number;
  public NativeID: number;
  public SymbolData: any;
  public nativeDataArrayBuffer: any;
  public EMFBuffer: any;
  public EMFBufferType: any;
  public SymbolID: any;
  public SVGFragment: any;
  public ShapesInGroup: any[];
  public InitialGroupBounds: Point;
  public ImageHeader: any;
  public OleHeader: any;
  public nIcons: number;
  public iconSize: number;
  public iconShapeBottomOffset: any;
  public iconShapeRightOffset: any;
  public HyperlinkText: string;
  public AttachmentInfo: string;
  public ResizeAspectConstrain: boolean;
  public ob: any;

  @Type(() => Point)
  public prevBBox: Point;

  public bInGroup: boolean;
  public LineTextX: number;
  public LineTextY: number;
  public VisioRotationDiff: number;
  public actionArrowHideTimerID: number;
  public FramezList: any;
  public ParentFrameID: number;

  @Type(() => Point)
  public StartPoint: Point;

  @Type(() => Point)
  public EndPoint: Point;

  public LineType: number;

  public BlockID: number;

  @Type(() => PolyList)
  public polylist: PolyList;

  public dimensionDeflectionH: number;
  public dimensionDeflectionV: number;


  constructor(config) {
    config = config || {};
    this.Type = ConstantData.StoredObjectType.BASE_LM_DRAWING_OBJECT;
    this.Frame = config.Frame || { x: 0, y: 0, width: 0, height: 0 };
    this.r = config.r || { x: 0, y: 0, width: 0, height: 0 };
    this.inside = config.inside || { x: 0, y: 0, width: 0, height: 0 };
    this.trect = config.trect || { x: 0, y: 0, width: 0, height: 0 };
    this.rtop = config.rtop || 0;
    this.rleft = config.rleft || 0;
    this.rbottom = config.rbottom || 0;
    this.rright = config.rright || 0;
    this.rwd = config.rwd || 0;
    this.rht = config.rht || 0;
    this.rflags = config.rflags || 0;
    this.RotationAngle = config.RotationAngle || 0;
    this.ShortRef = config.ShortRef || 0;
    this.StyleRecord = config.StyleRecord || null;
    this.Dimensions = config.Dimensions || 0;
    this.bOverrideDefaultStyleOnDraw = config.bOverrideDefaultStyleOnDraw || false;
    this.UniqueID = config.UniqueID == null ? -1 : config.UniqueID;
    this.flags = config.flags || 0;
    this.extraflags = config.extraflags || 0;
    this.hookflags = config.hookflags || [];
    this.targflags = config.targflags || [];
    this.hooks = config.hooks || [];
    this.maxhooks = config.maxhooks || 1;
    this.associd = config.associd || -1;
    this.attachpoint = config.attachpoint || { x: ConstantData.Defines.SED_CDim / 2, y: ConstantData.Defines.SED_CDim / 2 };
    this.hookdisp = { x: 0, y: 0 };
    this.TextFlags = config.TextFlags || 0;
    this.DrawingObjectBaseClass = config.DrawingObjectBaseClass || ConstantData.DrawingObjectBaseClass.SHAPE;
    this.objecttype = config.objecttype || 0;
    this.subtype = config.subtype || 0;
    this.dataclass = config.dataclass || 0;
    this.Layer = config.Layer || 0;
    this.SequenceNumber = config.SequenceNumber || -1;
    this.BusinessObjectID = config.BusinessObjectId || -1;
    this.NoteID = config.NoteID || -1;
    this.ExpandedViewID = config.ExpandedViewID || -1;
    this.DataID = config.DataID || -1;
    this.tindent = config.tindent || { top: 0, left: 0, bottom: 0, right: 0 };
    this.TMargins = config.TMargins || { top: 0, left: 0, bottom: 0, right: 0 };
    this.left_sindent = config.left_sindent || 0;
    this.right_sindent = config.right_sindent || 0;
    this.top_sindent = config.top_sindent || 0;
    this.bottom_sindent = config.bottom_sindent || 0;
    this.TableID = config.TableID || -1;
    this.GraphID = config.GraphID || -1;
    this.GanttInfoID = config.GanttInfoID || -1;
    this.ImageID = config.ImageID || -1;
    this.ContentType = config.ContentType || ConstantData.ContentType.NONE;
    this.ContentID = config.ContentID || -1;
    this.CommentID = config.CommentID || -1;
    this.TextParams = config.TextParams || null;
    this.TextGrow = config.TextGrow || ConstantData.TextGrowBehavior.PROPORTIONAL;
    this.TextAlign = config.TextAlign || ConstantData.TextAlign.CENTER;
    this.colorfilter = config.colorfilter || 0;
    this.colorchanges = config.colorchanges || 0;
    this.moreflags = config.moreflags || 0;
    this.sizedim = config.sizedim || { width: 0, height: 0 };
    this.ConnectPoints = config.ConnectPoints || [];
    this.ObjGrow = config.ObjGrow || ConstantData.GrowBehavior.ALL;
    if (this.ObjGrow === ConstantData.GrowBehavior.PROPORTIONAL) {
      config.ResizeAspectConstrain = true;
    }
    this.datasetType = config.datasetType || -1;
    this.datasetID = config.datasetID || -1;
    this.datasetTableID = config.datasetTableID || -1;
    this.datasetElemID = config.datasetElemID || -1;
    this.fieldDataDatasetID = config.fieldDataDatasetID || -1;
    this.fieldDataTableID = config.fieldDataTableID || -1;
    this.fieldDataElemID = config.fieldDataElemID || -1;
    this.dataStyleOverride = null;
    this.SymbolURL = config.SymbolURL || '';
    this.ImageURL = config.ImageURL || '';
    this.ImageDir = config.ImageDir || null;
    this.BlobBytesID = config.BlobBytesID || -1;
    this.EMFHash = config.EMFHash || null;
    this.EMFBlobBytesID = config.EMFBlobBytesID || -1;
    this.OleBlobBytesID = config.OleBlobBytesID || -1;
    this.NativeID = config.NativeID || -1;
    this.SymbolData = null;
    this.nativeDataArrayBuffer = null;
    this.EMFBuffer = null;
    this.EMFBufferType = config.EMFBufferType || null;
    this.SymbolID = config.SymbolID;
    this.SVGFragment = config.SVGFragment || null;
    this.ShapesInGroup = config.ShapesInGroup || [];
    this.InitialGroupBounds = config.InitialGroupBounds || { x: 0, y: 0, width: 0, height: 0 };
    this.ImageHeader = config.ImageHeader || null;
    this.OleHeader = config.OleHeader || null;
    this.nIcons = config.nIcons || 0;
    this.iconSize = config.iconSize || 18;
    this.iconShapeBottomOffset = config.iconShapeBottomOffset || ConstantData.Defines.IconShapeBottomOffset;
    this.iconShapeRightOffset = config.iconShapeRightOffset || ConstantData.Defines.iconShapeRightOffset;
    this.HyperlinkText = config.HyperlinkText || '';
    this.AttachmentInfo = config.AttachmentInfo || '';
    this.ResizeAspectConstrain = config.ResizeAspectConstrain || false;
    this.ob = {};
    this.prevBBox = config.prevBBox || { x: 0, y: 0, width: 0, height: 0 };
    this.bInGroup = false;
    this.LineTextX = config.LineTextX || 0;
    this.LineTextY = config.LineTextX || 0;
    this.VisioRotationDiff = 0;
    this.actionArrowHideTimerID = -1;
    this.FramezList = null;
    this.ParentFrameID = -1;
  }
}

export default BaseDrawingObject
