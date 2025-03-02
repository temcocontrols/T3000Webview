
import { Type } from 'class-transformer'
import 'reflect-metadata'

import PageRecord from './PageRecord'
import Point from './Point';
import ConstantData from '../Data/ConstantData'
import DefaultStyle from './DefaultStyle'
import FontRecord from './FontRecord'
import LibList from './LibList'

class ContentHeader {

  @Type(() => PageRecord)
  public Page: PageRecord;

  @Type(() => Point)
  public MaxWorkDim: Point;

  @Type(() => FontRecord)
  public DimensionFont: FontRecord;

  @Type(() => DefaultStyle)
  public DimensionFontStyle: DefaultStyle;

  public flags: any;
  public BusinessModule: string;
  public dateformat: number;
  public originaltemplate: string;
  public orgcharttable: string;
  public exportpath: string;
  public presentationBackground: string;
  public presentationName: string;
  public importSourcePath: string;
  public defaultlibs: string;

  @Type(() => LibList)
  public lp_list: LibList;

  public ClipboardBuffer: any;
  public ClipboardType: any;
  public nonworkingdays: number;
  public holidaymask: number;
  public DocIsDirty: boolean;
  public AllowReplace: boolean;
  public FontList: any[];
  public SymbolSearchString: any;
  public Save_HistoryState: any;
  public ParentPageID: any;

  constructor() {
    this.Initialize();
  }

  Initialize() {
    this.Page = new PageRecord();

    // 320000
    this.MaxWorkDim = new Point(ConstantData.Defines.MaxWorkDimX, ConstantData.Defines.MaxWorkDimY);

    this.DimensionFont = new FontRecord();
    this.DimensionFontStyle = new DefaultStyle();
    this.flags = ConstantData.ContentHeaderFlags.CT_DA_Pages;
    this.BusinessModule = '';
    this.dateformat = - 1;
    this.originaltemplate = '';
    this.orgcharttable = '';
    this.exportpath = '';
    this.presentationBackground = '';
    this.presentationName = '';
    this.importSourcePath = '';
    this.defaultlibs = '';
    this.lp_list = new LibList();
    this.ClipboardBuffer = null;
    this.ClipboardType = ConstantData.ClipboardType.None;
    this.nonworkingdays = ConstantData.Defines.DEFAULT_NONWORKINGDAYS;
    this.holidaymask = 0;
    this.DocIsDirty = !1;
    this.AllowReplace = !0;
    this.FontList = [];
    this.SymbolSearchString = '';
    this.Save_HistoryState = - 1;
    this.ParentPageID = '';
  }
}

export default ContentHeader
