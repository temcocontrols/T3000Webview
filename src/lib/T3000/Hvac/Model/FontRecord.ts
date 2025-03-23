

/**
 * Represents a font record with basic information about text appearance.
 *
 * This class encapsulates font data including the font name, type, size, and face.
 * By default, it initializes with a common configuration:
 * - fontName is set to "Arial".
 * - fontType is set to "sanserif".
 * - fontSize is set to 10.
 * - face is set to 0.
 *
 * @example
 * // Create a new FontRecord instance
 * const fontRecord = new FontRecord();
 *
 * // Access default properties
 * console.log(fontRecord.fontName);  // Output: "Arial"
 * console.log(fontRecord.fontSize);  // Output: 10
 *
 * // Modify font properties as needed
 * fontRecord.fontName = "Courier New";
 * fontRecord.fontSize = 12;
 */
class FontRecord {

  public fontName: string;
  public fontType: string;
  public fontSize: number;
  public face: number;

  constructor() {
    this.fontName = 'Arial';
    this.fontType = 'sanserif';
    this.fontSize = 10;
    this.face = 0;
  }
}

export default FontRecord
