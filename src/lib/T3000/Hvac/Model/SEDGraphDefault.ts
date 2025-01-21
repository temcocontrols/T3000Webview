
import { Type } from 'class-transformer'
import 'reflect-metadata'

import ConstantData from "../Data/ConstantData"
import QuickStyle from "./QuickStyle"

class SEDGraphDefault {

  public type: number;
  public flags: number;
  public pointflags: number;
  public catAxisflags: number;
  public magAxisflags: number;
  public legendType: number;
  public legendlayoutflags: number;
  public imagevaluerep: number;
  public quadrant: number;

  @Type(() => QuickStyle)
  public style: QuickStyle;

  @Type(() => QuickStyle)
  public areaStyle: QuickStyle;

  @Type(() => QuickStyle)
  public gridStyle: QuickStyle;

  @Type(() => QuickStyle)
  public titleStyle: QuickStyle;

  @Type(() => QuickStyle)
  public legendStyle: QuickStyle;

  @Type(() => QuickStyle)
  public legendTitleStyle: QuickStyle;

  @Type(() => QuickStyle)
  public catAxisStyle: QuickStyle;

  @Type(() => QuickStyle)
  public catAxisTitleStyle: QuickStyle;

  @Type(() => QuickStyle)
  public magAxisStyle: QuickStyle;

  @Type(() => QuickStyle)
  public magAxisTitleStyle: QuickStyle;

  @Type(() => QuickStyle)
  public pointStyle: QuickStyle;

  @Type(() => QuickStyle)
  public pointLabelStyle: QuickStyle;

  constructor() {
    this.type = ConstantData.GraphType.SDGRAPH_TYPE_BAR;
    this.flags = ConstantData.GraphFlags.SDAX_SEQUENCE_BY_CATEGORY;
    this.pointflags = 0;
    this.catAxisflags = ConstantData.AxisFlags.SDAX_SHOW_GRID_LINE_MAJOR | ConstantData.AxisFlags.SDAX_HIDE_MINOR_TICKS;
    this.magAxisflags = ConstantData.AxisFlags.SDAX_SHOW_GRID_LINE_MAJOR;
    this.legendType = ConstantData.LegendType.SDAX_LEGEND_FULL;
    this.legendlayoutflags = 0;
    this.imagevaluerep = - 1;
    this.quadrant = 0;
    this.style = new QuickStyle();
    this.areaStyle = new QuickStyle();
    this.gridStyle = new QuickStyle();
    this.titleStyle = new QuickStyle();
    this.legendStyle = new QuickStyle();
    this.legendTitleStyle = new QuickStyle();
    this.catAxisStyle = new QuickStyle();
    this.catAxisTitleStyle = new QuickStyle();
    this.magAxisStyle = new QuickStyle();
    this.magAxisTitleStyle = new QuickStyle();
    this.pointStyle = new QuickStyle();
    this.pointLabelStyle = new QuickStyle();
  }
}

export default SEDGraphDefault



