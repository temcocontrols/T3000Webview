
import { Type } from 'class-transformer'
import 'reflect-metadata'
import NvConstant from "../Data/Constant/NvConstant"
import QuickStyle from "./QuickStyle"

/**
 * Class representing the default configuration settings for an SED graph.
 *
 * @remarks
 * The SDGraphDefault class encapsulates the default options for a graph, including graph type, flags for various aspects,
 * and styling configurations for different graph elements such as areas, grids, titles, legends, axes, and data points.
 *
 * The class leverages the @Type decorator to properly instantiate QuickStyle objects for the respective graphical components.
 * Key properties include:
 *
 * - type: Specifies the graph type (e.g., Bar) as defined in NvConstant.GraphType.
 * - flags: Graph flags that control graph behavior (e.g., SequenceByCategory).
 * - pointflags, catAxisflags, magAxisflags: Provide specific flag-based configurations for points and axes.
 * - legendType and legendlayoutflags: Determine the appearance and layout of the graph's legend.
 * - imagevaluerep: An image value representation, typically used to control how data is visually represented.
 * - quadrant: Denotes the quadrant settings for the graph.
 *
 * Each visual component (style, areaStyle, gridStyle, etc.) is instantiated as a new QuickStyle, allowing for individual styling.
 *
 * @example
 * // Example usage of SDGraphDefault:
 * import { SDGraphDefault } from './path/to/SDGraphDefault';
 *
 * const graphConfig = new SDGraphDefault();
 * console.log(graphConfig.type); // Expected to log the default graph type (NvConstant.GraphType.Bar)
 *
 * // Customizing the QuickStyle for the graph title:
 * graphConfig.titleStyle.fontSize = 16;
 * graphConfig.titleStyle.color = '#333';
 */
class SDGraphDefault {

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
    this.type = NvConstant.GraphType.Bar;
    this.flags = NvConstant.GraphFlags.SequenceByCategory;
    this.pointflags = 0;
    this.catAxisflags = NvConstant.AxisFlags.DaxShowGridLineMajor | NvConstant.AxisFlags.DaxHideMinorTicks;
    this.magAxisflags = NvConstant.AxisFlags.DaxShowGridLineMajor;
    this.legendType = NvConstant.LegendType.DaxLegendFull;
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

export default SDGraphDefault



