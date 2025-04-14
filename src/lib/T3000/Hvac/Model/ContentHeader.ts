
import { Type } from 'class-transformer'
import 'reflect-metadata'
import PageRecord from './PageRecord'
import Point from './Point';
import NvConstant from '../Data/Constant/NvConstant'
import DefaultStyle from './DefaultStyle'
import FontRecord from './FontRecord'
import LibList from './LibList'
import T3Constant from '../Data/Constant/T3Constant'
import OptConstant from '../Data/Constant/OptConstant';

/**
 * Represents the header configuration for HVAC-related content.
 *
 * This class encapsulates various settings and records that define the header behavior
 * and display properties for a content page. It includes information about the page layout,
 * work dimensions, font records, styles, clipboard configurations, and other relevant data.
 *
 * @remarks
 * The class is initialized with default parameters through the {@link ContentHeader#Initialize method}
 * invoked in the constructor. Key properties include:
 * - {@link ContentHeader#Page}: The record representing the content page.
 * - {@link ContentHeader#MaxWorkDim}: The maximum working dimensions, typically set using preset constants.
 * - {@link ContentHeader#DimensionFont} and {@link ContentHeader#DimensionFontStyle}: Font record and style for dimensions.
 * - Various configuration fields such as {@link ContentHeader#flags}, {@link ContentHeader#BusinessModule},
 *   {@link ContentHeader#dateformat}, etc., for controlling business logic and display details.
 * - {@link ContentHeader#lp_list}: Represents a list of libraries used in the content.
 *
 * @example
 * An example of creating and using a ContentHeader instance:
 *
 * ```typescript
 * // Create a new ContentHeader instance
 * const header = new ContentHeader();
 *
 * // Access the page record
 * console.log(header.Page);
 *
 * // Modify the presentation name
 * header.presentationName = "Main Presentation";
 *
 * // Check if the document is marked as dirty (modified)
 * if (header.DocIsDirty) {
 *   console.log("The document has unsaved changes.");
 * }
 * ```
 *
 * @category HVAC Model
 */
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
  // public nonworkingdays: number;
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
    this.MaxWorkDim = new Point(OptConstant.Common.MaxWorkDimX, OptConstant.Common.MaxWorkDimY);

    this.DimensionFont = new FontRecord();
    this.DimensionFontStyle = new DefaultStyle();
    this.flags = OptConstant.CntHeaderFlags.Pages;
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
    this.ClipboardType = T3Constant.ClipboardType.None;
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
