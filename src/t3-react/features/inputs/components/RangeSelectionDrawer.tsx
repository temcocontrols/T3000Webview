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

interface RangeSelectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRange: number;
  digitalAnalog: number; // BAC_UNITS_ANALOG (0) or BAC_UNITS_DIGITAL (1)
  onSave: (newRange: number) => void;
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
  const [selectedRange, setSelectedRange] = useState<number>(currentRange);
  const [manualInput, setManualInput] = useState<string>(currentRange.toString());
  const [tempUnit, setTempUnit] = useState<string>('55'); // Default to °C

  const handleSave = () => {
    onSave(selectedRange);
    onClose();
  };

  const handleCancel = () => {
    setSelectedRange(currentRange); // Reset to original
    setManualInput(currentRange.toString());
    onClose();
  };

  const handleManualInputChange = (value: string) => {
    setManualInput(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 64) {
      setSelectedRange(numValue);
    }
  };

  // Reset selection when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedRange(currentRange);
      setManualInput(currentRange.toString());
    }
  }, [isOpen, currentRange]);

  // Get current range label
  const currentRangeLabel = getRangeLabel(selectedRange, digitalAnalog);

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
        <RadioGroup
          value={selectedRange.toString()}
          onChange={(_, data) => setSelectedRange(Number(data.value))}
        >
        {/* Combined Default and Selection section */}
        <div className={styles.topCombinedSection}>
          {/* Column 1: Default */}
          <div className={styles.defaultColumn}>
            <div className={styles.sectionDivider}>
              <span className={styles.dividerText}>Default</span>
            </div>
            <div className={styles.defaultSection}>
              <Radio value="0" label="0. Unused" />
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
                max={64}
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

        {/* Main content: 3-column layout */}
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
                    checked={tempUnit === '55'}
                    onChange={() => setTempUnit('55')}
                    label="°C"
                    className={styles.tempCheckbox}
                  />
                  <Checkbox
                    checked={tempUnit === '56'}
                    onChange={() => setTempUnit('56')}
                    label="°F"
                    className={styles.tempCheckbox}
                  />
                </div>
                <Radio value="1" label="3K YSI 44005" />
                <Radio value="3" label="10K Type2" />
                <Radio value="7" label="10K Type3" />
                <Radio value="5" label="3K Allerton/ASI" />
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
                  <Radio value="41" label="41. 0.0 to 5.0 Volts" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="42" label="42. 0.0 to 100 Amps" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="43" label="43. 4.0 to 20 ma" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="44" label="44. 0.0 to 20 psi" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="45" label="45. Pulse Count (Slow 1Hz)" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="46" label="46. 0 to 100 % (0-10V)" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="47" label="47. 0 to 100 % (0-5V)" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="48" label="48. 0 to 100 % (4-20ma)" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="49" label="49. 0.0 to 10.0 Volts" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="65" label="65. Reserved" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="55" label="55. Pulse Count (Fast 100Hz)" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="56" label="56. Hz" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="57" label="57. Humidity %" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="58" label="58. CO2 PPM" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="59" label="59. Revolutions Per Minute" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="60" label="60. TVOC PPB" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="61" label="61. ug/m3" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="62" label="62. #/cm3" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="63" label="63. dB" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="64" label="64. Lux" />
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
                  <Radio value="50" label="50. Table 1" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="51" label="51. Table 2" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="52" label="52. Table 3" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="53" label="53. Table 4" />
                </div>
                <div className={styles.rangeOption}>
                  <Radio value="54" label="54. Table 5" />
                </div>
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
