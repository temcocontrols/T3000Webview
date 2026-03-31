import React, { useState } from 'react';
import {
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Button,
  Input,
  Radio,
  RadioGroup,
  Text,
  Label,
  Checkbox,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import {
  INPUT_ANALOG_RANGES,
  DIGITAL_RANGES,
  getRangeLabel,
} from '../data/rangeData';
import styles from './RangeSelectionDrawer.module.css';

// Display offset: analog display number = C++ value + 30 (so digital 1-30 and analog 31+ don't overlap visually)
const ANALOG_DISPLAY_OFFSET = 30;

interface RangeSelectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRange: number;
  digitalAnalog: number; // BAC_UNITS_DIGITAL (0) or BAC_UNITS_ANALOG (1)
  onSave: (newRange: number, newDigitalAnalog: number) => void;
  inputLabel?: string;
}

export const RangeSelectionDrawer: React.FC<RangeSelectionDrawerProps> = ({
  isOpen,
  onClose,
  currentRange,
  digitalAnalog,
  onSave,
  inputLabel,
}) => {
  // selectedRange holds the C++ value (0-30 digital, 0-39 analog)
  const [selectedRange, setSelectedRange] = useState<number>(currentRange);
  // manualInput shows the DISPLAY number (analog = C++ value + 30)
  const [manualInput, setManualInput] = useState<string>(() =>
    digitalAnalog === 1 && currentRange > 0
      ? (currentRange + ANALOG_DISPLAY_OFFSET).toString()
      : currentRange.toString()
  );
  // Track which section (digital vs analog) the selection belongs to, since range numbers
  // overlap between digital (0-30) and analog (0-39) namespaces in C++
  const [selectedSection, setSelectedSection] = useState<'digital' | 'analog'>(() =>
    digitalAnalog === 0 ? 'digital' : 'analog'
  );
  // Temp sensors: C++ native indices — odd = °C, even = °F (values 1-10)
  const [useFahrenheit, setUseFahrenheit] = useState<boolean>(() =>
    currentRange >= 1 && currentRange <= 10 ? currentRange % 2 === 0 : false
  );

  // Convert C++ value to display number
  const cppToDisplay = (cppValue: number, isAnalog: boolean): string =>
    (isAnalog && cppValue > 0 ? cppValue + ANALOG_DISPLAY_OFFSET : cppValue).toString();

  const handleSave = () => {
    const newDigitalAnalog = selectedSection === 'analog' ? 1 : 0;
    onSave(selectedRange, newDigitalAnalog);
    onClose();
  };

  const handleCancel = () => {
    setSelectedRange(currentRange);
    const section = digitalAnalog === 0 ? 'digital' : 'analog';
    setManualInput(cppToDisplay(currentRange, section === 'analog'));
    setSelectedSection(section);
    setUseFahrenheit(currentRange >= 1 && currentRange <= 10 ? currentRange % 2 === 0 : false);
    onClose();
  };

  // Manual input accepts DISPLAY numbers: 0=unused, 1-30=digital, 31-69=analog (cpp=display-30), 101-104=MSV
  const handleManualInputChange = (value: string) => {
    setManualInput(value);
    const displayNum = parseInt(value, 10);
    if (isNaN(displayNum) || displayNum < 0) return;
    if (displayNum === 0) {
      setSelectedRange(0);
      setSelectedSection('digital');
    } else if (displayNum >= 1 && displayNum <= 30) {
      setSelectedRange(displayNum);
      setSelectedSection('digital');
    } else if (displayNum >= 31 && displayNum <= 69) {
      setSelectedRange(displayNum - ANALOG_DISPLAY_OFFSET);
      setSelectedSection('analog');
    } else if (displayNum >= 101 && displayNum <= 104) {
      setSelectedRange(displayNum);
      setSelectedSection('digital');
    }
  };

  // Reset selection when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedRange(currentRange);
      const section = digitalAnalog === 0 ? 'digital' : 'analog';
      setManualInput(cppToDisplay(currentRange, section === 'analog'));
      setSelectedSection(section);
      setUseFahrenheit(currentRange >= 1 && currentRange <= 10 ? currentRange % 2 === 0 : false);
    }
  }, [isOpen, currentRange, digitalAnalog]);

  // Determine the type based on selected value and current section
  const getDigitalAnalogForValue = (value: number): number => {
    // Use the selected section to disambiguate overlapping ranges
    if (selectedSection === 'analog') return 1; // BAC_UNITS_ANALOG
    if (selectedSection === 'digital') return 0; // BAC_UNITS_DIGITAL
    return digitalAnalog;
  };

  // Get current range label with correct type
  const currentRangeLabel = getRangeLabel(selectedRange, getDigitalAnalogForValue(selectedRange));

  // Temp sensor helpers — C++ native: odd = °C, even = °F, range 1–10
  const isTempSensorRange = (range: number) => range >= 1 && range <= 10;
  const getTempBase = (range: number) => range % 2 === 0 ? range - 1 : range;

  // Unified RadioGroup value: analog values use 'a' prefix to avoid collision with
  // digital values 1–30 within the shared RadioGroup (e.g. 'a1' = 3K YSI, 'a3' = 10K Type2)
  const radioGroupValue = selectedSection === 'analog'
    ? (isTempSensorRange(selectedRange) ? 'a' + getTempBase(selectedRange) : 'a' + selectedRange)
    : selectedRange.toString();

  // Single onChange handler for the unified RadioGroup
  const handleRadioChange = (_: React.ChangeEvent<HTMLInputElement>, data: { value: string }) => {
    const v = data.value;
    if (v.startsWith('a')) {
      // Analog value — 'a' prefix with C++ value
      const cppValue = parseInt(v.slice(1));
      // Temp sensors (1-10): apply °C/°F based on useFahrenheit
      if (cppValue >= 1 && cppValue <= 10) {
        const base = cppValue % 2 === 0 ? cppValue - 1 : cppValue;
        const actual = useFahrenheit ? base + 1 : base;
        setSelectedSection('analog');
        setSelectedRange(actual);
        setManualInput((actual + ANALOG_DISPLAY_OFFSET).toString());
      } else {
        setSelectedSection('analog');
        setSelectedRange(cppValue);
        setManualInput((cppValue + ANALOG_DISPLAY_OFFSET).toString());
      }
    } else {
      const num = parseInt(v);
      setSelectedSection('digital');
      setSelectedRange(num);
      setManualInput(num.toString());
    }
  };

  return (
    <Drawer
      type="overlay"
      separator
      open={isOpen}
      onOpenChange={(_, { open }) => !open && handleCancel()}
      position="end"
      size="large"
      style={{ width: '1000px', maxWidth: '90vw' }}
    >
      <DrawerHeader className={styles.drawerHeader}>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={handleCancel}
            />
          }
        >
          <div className={styles.headerContent}>
            <Text size={300} weight="semibold" className={styles.drawerTitle}>Select Range Number</Text>
            {inputLabel && (
              <Text size={200} className={styles.inputLabelHeader}>
                {inputLabel}
              </Text>
            )}
          </div>
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody className={styles.drawerBody}>
        {/* Combined Default and Selection section */}
        <div className={styles.topCombinedSection}>
          {/* Column 1: Default */}
          <div className={styles.defaultColumn}>
            <div className={styles.sectionDivider}>
              <span className={styles.dividerText}>Default</span>
            </div>
            <div className={styles.defaultSection}>
              <RadioGroup
                value={radioGroupValue}
                onChange={handleRadioChange}
              >
                <Radio value="0" label="0. Unused" />
              </RadioGroup>
            </div>
          </div>

          {/* Column 2: Selection */}
          <div className={styles.selectionColumn}>
            <div className={styles.sectionDivider}>
              <span className={styles.dividerText}>Selection</span>
            </div>
            <div className={styles.topSection}>
              <Label className={styles.inputLabel}>
                Enter Range Number (0-64):
              </Label>
              <Input
                type="number"
                value={manualInput}
                onChange={(_, data) => handleManualInputChange(data.value)}
                className={styles.numberInput}
                min={0}
                max={104}
              />
              <div className={styles.currentLabel}>
                {currentRangeLabel}
              </div>
              <div className={styles.actionButtons}>
                <Button appearance="primary" onClick={handleSave} className={styles.saveButton}>
                  OK
                </Button>
                <Button appearance="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Digital section divider */}
        <div className={styles.sectionDivider}>
          <span className={styles.dividerText}>Digital</span>
        </div>

        <RadioGroup
          value={radioGroupValue}
          onChange={handleRadioChange}
        >
        {/* Main content: 3-column layout — digital AND analog are in one group so
            selecting a digital range deselects any analog range and vice versa */}
        <div className={styles.mainContent}>
            <div className={styles.digitalSection}>
              {/* Left column: Digital Units */}
              <div className={styles.column}>
                <div className={styles.sectionHeader}>
                  <Text weight="semibold" size={300} className={styles.sectionTitle}>
                    Digital Units
                  </Text>
                </div>
                <div className={styles.rangeGroupTwoColumn}>
                  {DIGITAL_RANGES.filter(r => r.value >= 1 && r.value <= 22).map((range) => (
                    <div key={range.value} className={styles.rangeOption}>
                      <Radio
                        value={range.value.toString()}
                        label={`${range.value}. ${range.label}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Middle column: Custom Digital Units */}
              <div className={styles.column}>
                <div className={styles.sectionHeader}>
                  <Text weight="semibold" size={300} className={styles.sectionTitle}>
                    Custom Digital Units
                  </Text>
                  <Button appearance="primary" className={styles.editButton}>
                    Edit
                  </Button>
                </div>
                <div className={styles.rangeGroup}>
                  <div className={styles.rangeOption}>
                    <Radio value="23" label="23. 9/9" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="24" label="24. /" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="25" label="25. /" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="26" label="26. /" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="27" label="27. /" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="28" label="28. /" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="29" label="29. /" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="30" label="30. /" />
                  </div>
                </div>
              </div>

              {/* Right column: Multi State section */}
              <div className={styles.column}>
                <div className={styles.sectionHeader}>
                  <Text weight="semibold" size={300} className={styles.sectionTitle}>
                    Multi State
                  </Text>
                  <Button appearance="primary" className={styles.editButton}>
                    Edit
                  </Button>
                </div>
                <div className={styles.rangeGroup}>
                  {/* Placeholder for multi-state values */}
                  <div className={styles.rangeOption}>
                    <Radio value="100" label="" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="101" label="" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="102" label="" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="103" label="" />
                  </div>
                </div>
              </div>
            </div>

        </div>
        {/* Input Analog Units section divider */}
        <div className={styles.sectionDivider}>
          <span className={styles.dividerText}>Input Analog Units</span>
        </div>
        {/* Input Analog Units section - 3 columns like Digital */}
        <div className={styles.analogSection}>
          <div className={styles.analogColumns}>
            {/* Column 1: Temperature Sensors */}
            <div className={styles.column}>
              <div className={styles.sectionHeader}>
                <Text weight="semibold" size={300} className={styles.sectionTitle}>
                  Temp Sensors
                </Text>
              </div>
              <div className={styles.tempSensorsColumn}>
                <div className={styles.tempTypeRow}>
                  <Checkbox
                    checked={!useFahrenheit}
                    onChange={() => {
                      if (useFahrenheit && selectedSection === 'analog' && isTempSensorRange(selectedRange)) {
                        const base = getTempBase(selectedRange);
                        setSelectedRange(base);
                        setManualInput((base + ANALOG_DISPLAY_OFFSET).toString());
                      }
                      setUseFahrenheit(false);
                    }}
                    label="°C"
                    className={styles.tempCheckbox}
                  />
                  <Checkbox
                    checked={useFahrenheit}
                    onChange={() => {
                      if (!useFahrenheit && selectedSection === 'analog' && isTempSensorRange(selectedRange)) {
                        const base = getTempBase(selectedRange);
                        const f = base + 1;
                        setSelectedRange(f);
                        setManualInput((f + ANALOG_DISPLAY_OFFSET).toString());
                      }
                      setUseFahrenheit(true);
                    }}
                    label="°F"
                    className={styles.tempCheckbox}
                  />
                </div>
                {/* 'a' prefix distinguishes analog from digital values within the shared RadioGroup.
                    C++ stores: 1=3K YSI °C, 2=°F | 3=10K Type2 °C, 4=°F | 5=3K Allerton °C, 6=°F
                              | 7=10K Type3 °C, 8=°F | 9=PT 1K °C, 10=°F
                    Display: C++ value + 30 (°C: 31,33,35,37,39  °F: 32,34,36,38,40) */}
                <Radio value="a1" label={`${useFahrenheit ? 32 : 31}. 3K YSI 44005`} />
                <Radio value="a3" label={`${useFahrenheit ? 34 : 33}. 10K Type2`} />
                <Radio value="a5" label={`${useFahrenheit ? 36 : 35}. 3K Allerton/ASI`} />
                <Radio value="a7" label={`${useFahrenheit ? 38 : 37}. 10K Type3`} />
                <Radio value="a9" label={`${useFahrenheit ? 40 : 39}. PT 1K`} />
              </div>
            </div>

            {/* Column 2: Other Options */}
            <div className={styles.column}>
              <div className={styles.sectionHeader}>
                <Text weight="semibold" size={300} className={styles.sectionTitle}>
                  Other Options
                </Text>
              </div>
              <div className={styles.otherOptionsGrid}>
                <div className={styles.rangeOption}>
                  <Radio value="a11" label="41. 0.0 to 5.0 Volts" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a12" label="42. 0.0 to 100 Amps" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a13" label="43. 4.0 to 20 ma" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a14" label="44. 0.0 to 20 psi" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a15" label="45. Pulse Count (Slow 1Hz)" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a16" label="46. 0 to 100 % (0-10V)" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a17" label="47. 0 to 100 % (0-5V)" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a18" label="48. 0 to 100 % (4-20ma)" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a19" label="49. 0.0 to 10.0 Volts" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a35" label="65. Reserved" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a25" label="55. Pulse Count (Fast 100Hz)" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a26" label="56. Frequency" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a27" label="57. Humidity %" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a28" label="58. CO2 PPM" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a29" label="59. Revolutions Per Minute" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a30" label="60. TVOC PPB" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a31" label="61. ug/m3" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a32" label="62. #/cm3" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a33" label="63. dB" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a34" label="64. Lux" />
                </div>
              </div>
            </div>

            {/* Column 3: Custom Range */}
            <div className={styles.column}>
              <div className={styles.sectionHeader}>
                <Text weight="semibold" size={300} className={styles.sectionTitle}>
                  Custom Range
                </Text>
              </div>
              <div className={styles.rangeGroup}>
                <div className={styles.rangeOption}>
                  <Radio value="a20" label="50. Table 1" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a21" label="51. Table 2" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a22" label="52. Table 3" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a23" label="53. Table 4" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="a24" label="54. Table 5" />
                </div>
              </div>
            </div>
          </div>
        </div>
        </RadioGroup>
      </DrawerBody>
    </Drawer>
  );
};
