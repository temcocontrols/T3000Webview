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
  OUTPUT_ANALOG_RANGES,
  OUTPUT_DIGITAL_RANGES,
  getRangeLabel,
  inferDigitalAnalog,
} from '../data/rangeData';
import styles from './RangeSelectionDrawer.module.css';

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
  const [selectedRange, setSelectedRange] = useState<number>(currentRange);
  const [manualInput, setManualInput] = useState<string>(currentRange.toString());
  // Analog (1-8) and digital (1-30) codes overlap, so the mode cannot be derived
  // from the number — it comes from the section the user picked.
  const [mode, setMode] = useState<number>(digitalAnalog);

  const handleSave = () => {
    // A manually typed code that only one table defines overrides the radio choice
    // (e.g. 101 = MSV is digital-only, 32 = BTU is analog-only).
    onSave(selectedRange, inferDigitalAnalog(selectedRange) ?? mode);
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
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 104) {
      setSelectedRange(numValue);
      // Keep the visible mode in step with a code only one table defines.
      const inferred = inferDigitalAnalog(numValue);
      if (inferred !== undefined) setMode(inferred);
    }
  };

  // Reset selection when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedRange(currentRange);
      setManualInput(currentRange.toString());
      setMode(digitalAnalog);
    }
  }, [isOpen, currentRange, digitalAnalog]);

  const handleRangeChange = (value: number) => {
    setSelectedRange(value);
    setManualInput(value.toString());
  };

  const handleDigitalChange = (_: unknown, data: { value: string }) => {
    setMode(0);
    handleRangeChange(Number(data.value));
  };

  const handleAnalogChange = (_: unknown, data: { value: string }) => {
    setMode(1);
    handleRangeChange(Number(data.value));
  };

  // Output analog ranges are the firmware's 0-based indices 1..8; digital states
  // are 1..30 plus the MSV codes 101..104. The number alone is ambiguous, so the
  // label follows the mode the user is editing.
  const currentRangeLabel = getRangeLabel(selectedRange, mode);

  const digitalGroupValue = mode === 0 ? selectedRange.toString() : '';
  const analogGroupValue = mode === 1 ? selectedRange.toString() : '';

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
                value={selectedRange === 0 ? '0' : ''}
                onChange={handleDigitalChange}
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
                Enter Range Number (0-104):
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
          value={digitalGroupValue}
          onChange={handleDigitalChange}
        >
        {/* Main content: 3-column layout for Digital section */}
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
                  {OUTPUT_DIGITAL_RANGES.filter(r => r.value >= 1 && r.value <= 22).map((range) => (
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

              {/* Right column: Multi State — the state names live in the device's
                  own MSV objects, so they are only shown here (no editor yet). */}
              <div className={styles.column}>
                <div className={styles.sectionHeader}>
                  <Text weight="semibold" size={300} className={styles.sectionTitle}>
                    Multi State
                  </Text>
                </div>
                <div className={styles.rangeGroup}>
                  {[101, 102, 103, 104].map(v => (
                    <div key={v} className={styles.rangeOption}>
                      <Radio value={v.toString()} label={`${v}. ${getRangeLabel(v, 0)}`} />
                    </div>
                  ))}
                </div>
                <Text size={100}>
                  State names come from the device&apos;s MSV objects; editing them needs a
                  T3000 FFI action that does not exist yet.
                </Text>
              </div>
            </div>

        </div>
        </RadioGroup>

        {/* Output Analog Units section divider */}
        <div className={styles.sectionDivider}>
          <span className={styles.dividerText}>Output Analog Units</span>
        </div>

        <RadioGroup
          value={analogGroupValue}
          onChange={handleAnalogChange}
        >
        {/* Output Analog Units section - 3 columns layout matching inputs pattern */}
        <div className={styles.analogSection}>
          <div className={styles.analogColumns}>
            {/* Single column for output analog ranges */}
            <div className={styles.column}>
              <div className={styles.sectionHeader}>
                <Text weight="semibold" size={300} className={styles.sectionTitle}>
                  Analog Ranges
                </Text>
              </div>
              <div className={styles.rangeGroup}>
                {OUTPUT_ANALOG_RANGES.filter(r => r.value >= 1 && r.value <= 8).map((range) => (
                  <div key={range.value} className={styles.rangeOption}>
                    <Radio
                      value={range.value.toString()}
                      label={`${range.value}. ${range.label}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        </RadioGroup>
      </DrawerBody>
    </Drawer>
  );
};
