

import DefaultStyle from './DefaultStyle';

/**
 * Represents a runtime text entity that manages textual content along with
 * its associated formatting and hyperlink information.
 *
 * This class maintains a string of text and arrays for character styles, style
 * runs, styles, and hyperlinks. It initializes with an empty text string, empty
 * arrays for character styles, style runs, and hyperlinks, and a default style in
 * the styles array.
 *
 * @remarks
 * - The text property holds the primary text content.
 * - The charStyles array may be used to capture character-level formatting details.
 * - The styleRuns array can be used for run-length formatting or to determine where styling changes occur.
 * - The styles array includes a default style (an instance of DefaultStyle) for fallback or initial styling.
 * - The hyperlinks array stores hyperlink details embedded within the text.
 *
 * @example
 * // Create a new runtime text object.
 * const runtimeText = new DefaultRtText();
 *
 * // Set the text content.
 * runtimeText.text = "Welcome to HVAC control.";
 *
 * // Update properties as needed.
 * runtimeText.charStyles.push({ fontWeight: 'bold' });
 * runtimeText.styleRuns.push({ start: 0, end: 6, styleId: 1 });
 * runtimeText.hyperlinks.push({ text: "Learn more", url: "https://example.com/hvac" });
 *
 * // Access the default style.
 * const defaultStyle = runtimeText.styles[0];
 */
class DefaultRtText {

  public text: string;
  public charStyles: any[];
  public styleRuns: any[];
  public styles: any[];
  public hyperlinks: any[];

  constructor() {
    this.text = '';
    this.charStyles = [];
    this.styleRuns = [];
    this.styles = [new DefaultStyle()];
    this.hyperlinks = [];
  }
}

export default DefaultRtText


