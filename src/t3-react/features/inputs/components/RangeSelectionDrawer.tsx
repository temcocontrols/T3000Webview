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
      size="small"
    >
      <DrawerHeader>
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
          <span style={{ fontSize: '14px' }}>Select Range Number</span>
          {inputLabel && (
            <Text size={200} style={{ display: 'block', color: '#605e5c', fontWeight: 'normal', marginTop: '4px' }}>
              {inputLabel}
            </Text>
          )}
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody className={styles.drawerBody}>
        {/* Top section: Manual input */}
        <div className={styles.topSection}>
          <div className={styles.inputRow}>
            <Label htmlFor="rangeInput" className={styles.inputLabel}>
              Enter Units Number:
            </Label>
            <Input
              id="rangeInput"
              type="number"
              value={manualInput}
              onChange={(_, data) => handleManualInputChange(data.value)}
              className={styles.numberInput}
              min={0}
              max={64}
            />
            <Button appearance="primary" onClick={handleSave} className={styles.okButton}>
              OK
            </Button>
            <Button appearance="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <div className={styles.currentLabel}>
              {currentRangeLabel}
            </div>
          </div>
        </div>

        {/* Main content: 3-column layout */}
        <div className={styles.mainContent}>
          <RadioGroup
            value={selectedRange.toString()}
            onChange={(_, data) => setSelectedRange(Number(data.value))}
          >
            {/* Left column: Digital Units */}
            <div className={styles.column}>
              <Text weight="semibold" size={400} className={styles.sectionTitle}>
                Digital Units
              </Text>
              <div className={styles.rangeGroup}>
                {DIGITAL_RANGES.filter(r => r.value >= 0 && r.value <= 22).map((range) => (
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
              <Text weight="semibold" size={400} className={styles.sectionTitle}>
                Custom Digital Units
              </Text>
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
              <Button appearance="secondary" className={styles.editButton} style={{ marginTop: '8px' }}>
                Edit
              </Button>

              {/* Multi State section */}
              <div className={styles.multiStateSection}>
                <Text weight="semibold" size={400} className={styles.sectionTitle}>
                  Multi State
                </Text>
                <div className={styles.rangeGroup}>
                  {/* Placeholder for multi-state values */}
                  <Radio value="100" label="" disabled />
                  <Radio value="101" label="" disabled />
                  <Radio value="102" label="" disabled />
                  <Radio value="103" label="" disabled />
                </div>
                <Button appearance="secondary" className={styles.editButton} style={{ marginTop: '8px' }}>
                  Edit
                </Button>
              </div>
            </div>

            {/* Right spacer - will be filled by bottom section */}
            <div className={styles.column}>
            </div>
          </RadioGroup>

          {/* Bottom section: Input Analog Units (full width) */}
          <div className={styles.bottomSection}>
            <RadioGroup
              value={selectedRange.toString()}
              onChange={(_, data) => setSelectedRange(Number(data.value))}
            >
              <Text weight="semibold" size={400} className={styles.sectionTitle}>
                Input Analog Units
              </Text>

              {/* Temperature Sensors */}
              <div className={styles.analogGroup}>
                <Text weight="semibold" size={300} className={styles.subTitle}>
                  Temp Sensors
                </Text>
                <div className={styles.tempSensors}>
                  <div>
                    <Radio value="55" label="°C" />
                    <Radio value="56" label="°F" />
                  </div>
                  <div>
                    <Radio value="1" label="3K YSI 44005" />
                  </div>
                  <div>
                    <Radio value="3" label="10K Type2" />
                  </div>
                  <div>
                    <Radio value="7" label="10K Type3" />
                  </div>
                  <div>
                    <Radio value="5" label="3K Allerton/ASI" />
                  </div>
                </div>
              </div>

              {/* Voltage/Current ranges */}
              <div className={styles.analogGroup}>
                <div className={styles.rangeGrid}>
                  {INPUT_ANALOG_RANGES.filter(r => r.value >= 11 && r.value <= 14 || r.value === 19).map((range) => (
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
                </div>
              </div>

              {/* Custom Range */}
              <div className={styles.analogGroup}>
                <Text weight="semibold" size={300} className={styles.subTitle}>
                  Custom Range
                </Text>
                <div className={styles.rangeGrid}>
                  {INPUT_ANALOG_RANGES.filter(r => r.value >= 20 && r.value <= 24).map((range) => (
                    <div key={range.value} className={styles.rangeOption}>
                      <Radio
                        value={range.value.toString()}
                        label={`${range.value}. ${range.label}`}
                      />
                    </div>
                  ))}
                </div>
                <Button appearance="secondary" className={styles.editButton} style={{ marginTop: '8px' }}>
                  Edit
                </Button>
              </div>

              {/* Environmental sensors */}
              <div className={styles.analogGroup}>
                <div className={styles.rangeGrid}>
                  {INPUT_ANALOG_RANGES.filter(r => r.value >= 27 && r.value <= 34).map((range) => (
                    <div key={range.value} className={styles.rangeOption}>
                      <Radio
                        value={range.value.toString()}
                        label={`${range.value}. ${range.label}`}
                      />
                    </div>
                  ))}
                  <div className={styles.rangeOption}>
                    <Radio value="25" label="25. Pulse Count (Fast 100Hz)" disabled />
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
