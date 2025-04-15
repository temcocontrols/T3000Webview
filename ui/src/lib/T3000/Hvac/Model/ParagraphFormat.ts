


/**
 * Represents the formatting details for a paragraph, including text alignment, bullet style,
 * spacing, and indentation configurations.
 *
 * @remarks
 * The ParagraphFormat class allows you to control various aspects of paragraph style:
 * - Horizontal alignment (just) such as 'center', 'left', 'right'.
 * - Bullet style (bullet) with values like 'none', 'disc', 'circle', etc.
 * - Spacing (spacing) which defines the space between lines.
 * - Left (lindent) and right indentations (rindent) that determine the margins.
 * - First-line paragraph indentation (pindent).
 * - Tab spacing (tabspace) for controlling the tab stops.
 * - Vertical justification (vjust) such as 'middle', 'top', or 'bottom'.
 *
 * The constructor initializes these properties to default values.
 *
 * @example
 * An example of creating a ParagraphFormat instance and customizing its properties:
 *
 * const format = new ParagraphFormat();
 * format.just = 'left';
 * format.bullet = 'disc';
 * format.spacing = 12;
 * format.lindent = 10;
 * format.rindent = 10;
 * format.pindent = 15;
 * format.tabspace = 8;
 * format.vjust = 'top';
 *
 * @category Formatting
 */
class ParagraphFormat {

  public just: string;
  public bullet: string;
  public spacing: number;
  public lindent: number;
  public rindent: number;
  public pindent: number;
  public tabspace: number;
  public vjust: string;

  constructor() {

    this.just = 'center';
    this.bullet = 'none';
    this.spacing = 0;
    this.lindent = 0;
    this.rindent = 0;
    this.pindent = 0;
    this.tabspace = 0;
    this.vjust = 'middle';
  }
}

export default ParagraphFormat
