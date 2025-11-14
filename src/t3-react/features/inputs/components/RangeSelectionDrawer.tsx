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
        {/* Combined Default and Selection section */}
        <div className={styles.topCombinedSection}>
          {/* Column 1: Default */}
          <div className={styles.defaultColumn}>
            <div className={styles.sectionDivider}>
              <span className={styles.dividerText}>Default</span>
            </div>
            <div className={styles.defaultSection}>
              <RadioGroup
                value={selectedRange.toString()}
                onChange={(_, data) => setSelectedRange(Number(data.value))}
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
          <RadioGroup
            value={selectedRange.toString()}
            onChange={(_, data) => setSelectedRange(Number(data.value))}
          >
            <div className={styles.digitalSection}>
              {/* Left column: Digital Units */}
              <div className={styles.column}>
                <div className={styles.sectionHeader}>
                  <Text weight="semibold" size={300} className={styles.sectionTitle}>
                    Digital Units
                  </Text>
                  <Button appearance="secondary" className={styles.editButton}>
                    Edit
                  </Button>
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
                  <Button appearance="secondary" className={styles.editButton}>
                    Edit
                  </Button>
                </div>
                <div className={styles.rangeGroup}>
                  {DIGITAL_RANGES.filter(r => r.value >= 23 && r.value <= 30).map((range) => (
                    <div key={range.value} className={styles.rangeOption}>
                      <Radio
                        value={range.value.toString()}
                        label={`${range.value}. ${range.label}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column: Multi State section */}
              <div className={styles.column}>
                <div className={styles.sectionHeader}>
                  <Text weight="semibold" size={300} className={styles.sectionTitle}>
                    Multi State
                  </Text>
                  <Button appearance="secondary" className={styles.editButton}>
                    Edit
                  </Button>
                </div>
                <div className={styles.rangeGroup}>
                  {/* Placeholder for multi-state values */}
                  <div className={styles.rangeOption}>
                    <Radio value="100" label="Custom 1" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="101" label="Custom 2" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="102" label="Custom 3" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="103" label="Custom 4" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="104" label="Custom 5" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="105" label="Custom 6" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="106" label="Custom 7" />
                  </div>
                  <div className={styles.rangeOption}>
                    <Radio value="107" label="Custom 8" />
                  </div>
                </div>
              </div>
            </div>
          </RadioGroup>

        {/* Input Analog Units section divider */}
        <div className={styles.sectionDivider}>
          <span className={styles.dividerText}>Input Analog Units</span>
        </div>

        {/* Input Analog Units section - 3 columns like Digital */}
        <div className={styles.analogSection}>
          <RadioGroup
            value={selectedRange.toString()}
            onChange={(_, data) => setSelectedRange(Number(data.value))}
          >
            {/* Column 1: Temperature Sensors */}
            <div className={styles.column}>
              <div className={styles.sectionHeader}>
                <Text weight="semibold" size={300} className={styles.sectionTitle}>
                  Temp Sensors
                </Text>
                <Button appearance="secondary" className={styles.editButton}>
                  Edit
                </Button>
              </div>
              <div className={styles.tempSensorsColumn}>
                <RadioGroup
                  value={tempUnit}
                  onChange={(_, data) => setTempUnit(data.value)}
                >
                  <div className={styles.tempTypeRow}>
                    <Radio value="55" label="°C" />
                    <Radio value="56" label="°F" />
                  </div>
                </RadioGroup>
                <Radio value="1" label="3K YSI 44005" />
                <Radio value="3" label="10K Type2" />
                <Radio value="7" label="10K Type3" />
                <Radio value="5" label="3K Allerton/ASI" />
              </div>
            </div>

            {/* Column 2: Custom Range */}
            <div className={styles.column}>
              <div className={styles.sectionHeader}>
                <Text weight="semibold" size={300} className={styles.sectionTitle}>
                  Custom Range
                </Text>
                <Button appearance="secondary" className={styles.editButton}>
                  Edit
                </Button>
              </div>
              <div className={styles.rangeGroup}>
                {INPUT_ANALOG_RANGES.filter(r => r.value >= 20 && r.value <= 24).map((range) => (
                  <div key={range.value} className={styles.rangeOption}>
                    <Radio
                      value={range.value.toString()}
                      label={`${range.value}. ${range.label}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Other Options */}
            <div className={styles.column}>
              <div className={styles.sectionHeader}>
                <Text weight="semibold" size={300} className={styles.sectionTitle}>
                  Other Options
                </Text>
                <Button appearance="secondary" className={styles.editButton}>
                  Edit
                </Button>
              </div>
              <div className={styles.otherOptionsGrid}>
                {INPUT_ANALOG_RANGES.filter(r => (r.value >= 11 && r.value <= 14) || r.value === 19).map((range) => (
                  <div key={range.value} className={styles.rangeOption}>
                    <Radio
                      value={range.value.toString()}
                      label={`${range.value}. ${range.label}`}
                    />
                  </div>
                ))}
                <div className={styles.rangeOption}>
                  <Radio value="15" label="15. Pulse Count (Slow 1Hz)" />
                </div>
                {INPUT_ANALOG_RANGES.filter(r => r.value >= 27 && r.value <= 34).map((range) => (
                  <div key={range.value} className={styles.rangeOption}>
                    <Radio
                      value={range.value.toString()}
                      label={`${range.value}. ${range.label}`}
                    />
                  </div>
                ))}
                <div className={styles.rangeOption}>
                  <Radio value="25" label="25. Pulse Count (Fast 100Hz)" />
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>
        </div>
      </DrawerBody>
    </Drawer>
  );
};
