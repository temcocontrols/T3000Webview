

/**
 * Represents a container for formatted text data.
 *
 * @remarks
 * This class encapsulates the basic properties required for handling text and its formatting,
 * including dimensions, raw text content, and associated metadata such as paragraph definitions,
 * style configurations, and hyperlinks. It serves as a simple model for text formatting in HVAC control
 * interfaces or similar systems.
 *
 * @example
 * Here's how to create and initialize an instance of DefaultFmtText:
 *
 * ```typescript
 * const defaultText = new DefaultFmtText();
 * defaultText.width = 200;
 * defaultText.height = 100;
 * defaultText.fmtWidth = 150;
 * defaultText.text = "Sample formatted text";
 *
 * // Optionally add formatting details
 * defaultText.paragraphs.push({ index: 0, alignment: "left" });
 * defaultText.styles.push({ styleId: 1, fontWeight: "bold" });
 * defaultText.hyperlinks.push({ url: "https://example.com", label: "Example Site" });
 * ```
 */
class DefaultFmtText {
  width: number;
  height: number;
  fmtWidth: number;
  text: string;
  paragraphs: any[];
  styles: any[];
  hyperlinks: any[];

  constructor() {
    this.width = 0;
    this.height = 0;
    this.fmtWidth = 0;
    this.text = '';
    this.paragraphs = [];
    this.styles = [];
    this.hyperlinks = [];
  }
}

export default DefaultFmtText
