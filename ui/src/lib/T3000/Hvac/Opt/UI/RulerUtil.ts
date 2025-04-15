

import T3Gv from '../../Data/T3Gv';
import '../../Util/T3Hammer';
import NvConstant from '../../Data/Constant/NvConstant';
import OptConstant from "../../Data/Constant/OptConstant";
import T3Util from "../../Util/T3Util";
import DataUtil from "../Data/DataUtil";

class RulerUtil {

  /**
   * Converts a length measurement to a formatted string using the current ruler units
   * @param lengthInUnits - The length measurement to convert
   * @param skipFeetConversion - Whether to skip conversion to feet
   * @param offset - An offset value to apply to the length measurement
   * @param displayFlags - Flags controlling how dimensions are displayed
   * @returns A formatted string representing the length in the appropriate units
   */
  static GetLengthInRulerUnits(
    lengthInUnits: number,
    skipFeetConversion: boolean,
    offset: number,
    displayFlags: number
  ): string {
    T3Util.Log("O.Opt GetLengthInRulerUnits - Input:", { lengthInUnits, skipFeetConversion, offset, displayFlags });

    const sessionData = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    let resultString = "";
    let feetPart = 0;
    let inchPart = 0;
    let fractionalInches = 0;
    let totalUnits = 0;
    let fractionalDisplay = 0;
    let denominator = 0;
    let fractionString = "";
    let sign = 1;

    // Determine display options based on flags
    const showFractionalInches = displayFlags ? (displayFlags & NvConstant.DimensionFlags.ShowFractionalInches) > 0 : false;
    const useFeetAsInches = displayFlags ? (displayFlags & NvConstant.DimensionFlags.ShowFeetAsInches) > 0 : false;

    // Apply offset if provided
    if (offset) {
      offset *= 100;
      if (!T3Gv.docUtil.rulerConfig.useInches) {
        offset /= OptConstant.Common.MetricConv;
      }
      lengthInUnits -= offset;
    }

    // Handle pixel display mode
    if (T3Gv.docUtil.rulerConfig.showpixels) {
      resultString = String(Math.round(lengthInUnits));
      T3Util.Log("O.Opt GetLengthInRulerUnits - Output:", resultString);
      return resultString;
    }

    // Get length in current display units
    totalUnits = this.GetLengthInUnits(lengthInUnits);

    // Process feet/inches conversion
    if (
      T3Gv.docUtil.rulerConfig.useInches &&
      T3Gv.docUtil.rulerConfig.units === NvConstant.RulerUnit.Feet &&
      !skipFeetConversion
    ) {
      // Handle negative values
      if (totalUnits < 0) {
        sign = -1;
        totalUnits = -totalUnits;
      }

      feetPart = Math.floor(totalUnits);
      inchPart = 12 * (totalUnits - feetPart);

      if (showFractionalInches) {
        fractionalInches = inchPart - Math.floor(inchPart);
        inchPart = Math.floor(inchPart);
      }

      // Adjust for full inches
      if (Number(inchPart).toFixed() === "12") {
        inchPart = 0;
        feetPart++;
      }

      // Convert feet to inches if needed
      if (useFeetAsInches) {
        inchPart += 12 * feetPart;
        feetPart = 0;
      }

      // Process fractional inches
      if (fractionalInches > 0) {
        denominator = this.GetFractionStringGranularity(sessionData);
        fractionalDisplay = Math.round(fractionalInches / denominator);

        if (fractionalDisplay >= 1) {
          fractionalDisplay = 0;
          if (++inchPart !== 12 || useFeetAsInches) {
            // No extra adjustment needed
          } else {
            feetPart++;
            inchPart = 0;
          }
        }

        if (fractionalDisplay > 0) {
          // Simplify the fraction
          let simplifiedNumerator = fractionalDisplay;
          let simplifiedDenominator = Math.floor(1 / denominator);

          while (simplifiedNumerator % 2 === 0 && simplifiedDenominator % 2 === 0) {
            simplifiedNumerator /= 2;
            simplifiedDenominator /= 2;
          }

          fractionString = simplifiedNumerator + '/' + simplifiedDenominator;
        }
      }

      // Apply sign to feet part
      feetPart *= sign;

      // Build the result string
      if (feetPart !== 0) {
        resultString = feetPart + "'";
      }

      if (fractionString.length > 0) {
        resultString += ' ' + Number(inchPart).toFixed();
        resultString += ' ' + fractionString;
        resultString += '"';
      } else if (inchPart > 0) {
        inchPart = Math.round(inchPart);
        resultString += ' ' + inchPart + '"';
      }
    }
    // Handle other unit types (inches, metric)
    else if (
      T3Gv.docUtil.rulerConfig.units === NvConstant.RulerUnit.Inches ||
      T3Gv.docUtil.rulerConfig.units === NvConstant.RulerUnit.M ||
      T3Gv.docUtil.rulerConfig.units === NvConstant.RulerUnit.Cm ||
      T3Gv.docUtil.rulerConfig.units === NvConstant.RulerUnit.Mm
    ) {
      resultString = totalUnits.toFixed(T3Gv.docUtil.rulerConfig.dp);
    }

    T3Util.Log("O.Opt GetLengthInRulerUnits - Output:", resultString);
    return resultString;
  }

  /**
   * Converts a raw length value to the current ruler units
   * @param length - The raw length to convert
   * @returns The length in the current ruler units
   */
  static GetLengthInUnits(length: number): number {
    T3Util.Log("O.Opt GetLengthInUnits - Input:", { length });
    const result = length * this.GetToUnits();
    T3Util.Log("O.Opt GetLengthInUnits - Output:", result);
    return result;
  }

  /**
   * Calculates the conversion factor for the current ruler settings
   * @returns The conversion factor from raw units to display units
   */
  static GetToUnits(): number {
    T3Util.Log("O.Opt GetToUnits - Input");
    const dpi = T3Gv.docUtil.rulerConfig.major;
    let conversionFactor = T3Gv.docUtil.rulerConfig.majorScale / dpi;

    if (!T3Gv.docUtil.rulerConfig.useInches) {
      conversionFactor *= T3Gv.docUtil.rulerConfig.metricConv;
    }

    T3Util.Log("O.Opt GetToUnits - Output:", conversionFactor);
    return conversionFactor;
  }

  /**
   * Determines the denominator for fractional inch displays based on ruler settings
   * @param sessionData - The session data containing ruler configuration
   * @returns The denominator value for fractional display
   */
  static GetFractionStringGranularity(sessionData: any): number {
    if (T3Gv.docUtil.rulerConfig.fractionaldenominator >= 1) {
      return 1 / T3Gv.docUtil.rulerConfig.fractionaldenominator;
    } else if (T3Gv.docUtil.rulerConfig.majorScale <= 1) {
      return 1 / 16;
    } else if (T3Gv.docUtil.rulerConfig.majorScale <= 2) {
      return 1 / 8;
    } else if (T3Gv.docUtil.rulerConfig.majorScale <= 4) {
      return 1 / 4;
    } else if (T3Gv.docUtil.rulerConfig.majorScale <= 8) {
      return 0.5;
    } else {
      return 1;
    }
  }

  /**
   * Determines the appropriate denominator for fractional inch measurements based on current ruler scale
   * This function calculates what denominator should be used when displaying measurements as fractions.
   * For smaller ruler scales (more zoomed in), it uses larger denominators for finer precision.
   * For larger scales (more zoomed out), it uses smaller denominators for simpler fractions.
   *
   * @returns The denominator to use for fractional measurements (1, 2, 4, 8, or 16)
   */
  static GetFractionDenominator() {
    let denominator;
    const rulerScale = T3Gv.docUtil.rulerConfig.majorScale;

    // Determine denominator based on ruler scale
    if (rulerScale <= 1) {
      denominator = 16;  // Use 16ths of an inch at smallest scale
    } else if (rulerScale <= 2) {
      denominator = 8;   // Use 8ths of an inch
    } else if (rulerScale <= 4) {
      denominator = 4;   // Use 4ths of an inch (quarters)
    } else if (rulerScale <= 8) {
      denominator = 2;   // Use halves of an inch
    } else {
      denominator = 1;   // Use whole inches at largest scale
    }

    return denominator;
  }

}

export default RulerUtil
