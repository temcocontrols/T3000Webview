
import StateConstant from "../Data/State/StateConstant";

/**
 * Represents a text object used to store runtime text along with its selection range.
 *
 * @remarks
 * The TextObject class encapsulates data related to a textual element, including:
 * - The type of the object, which is set to a constant value defined by StateConstant.
 * - The text content to be displayed or processed at runtime.
 * - The selection range, which is an object containing:
 *   - start: The starting index of the text selection.
 *   - end: The ending index of the text selection.
 *   - line: The line number associated with the selection.
 *
 * The constructor accepts an object to initialize these values. If no object is provided,
 * default values are used: the runtime text is null and the selection range is set with zeros.
 *
 * @example
 * ```typescript
 * // Example usage of TextObject:
 * const sampleData = {
 *   runtimeText: "Sample HVAC Text",
 *   selrange: { start: 0, end: 16, line: 1 }
 * };
 * const textObj = new TextObject(sampleData);
 *
 * console.log(textObj.Type);         // Outputs the constant for TextObject type
 * console.log(textObj.runtimeText);  // "Sample HVAC Text"
 * console.log(textObj.selrange);     // { start: 0, end: 16, line: 1 }
 * ```
 *
 * @public
 */
class TextObject {

  public Type: string;
  public runtimeText: string;
  public selrange: { start: number; end: number; line: number; };

  constructor(txtObj: any) {
    txtObj = txtObj || {};
    this.Type = StateConstant.StoredObjectType.TextObject;
    this.runtimeText = txtObj.runtimeText || null;
    this.selrange = txtObj.selrange || { start: 0, end: 0, line: 0 };
  }
}

export default TextObject
