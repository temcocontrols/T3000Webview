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
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 30) {
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

  // Determine the type based on selected value
  const getDigitalAnalogForValue = (value: number): number => {
    // Digital ranges: 1-30
    if (value >= 1 && value <= 30) {
      return 1; // BAC_UNITS_DIGITAL
    }
    // Everything else is analog (0)
    return 0; // BAC_UNITS_ANALOG
  };

  // Get current range label with correct type
  const currentRangeLabel = getRangeLabel(selectedRange, getDigitalAnalogForValue(selectedRange));

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
                Enter Range Number (0-30):
              </Label>
              <Input
                type="number"
                value={manualInput}
                onChange={(_, data) => handleManualInputChange(data.value)}
                className={styles.numberInput}
                min={0}
                max={30}
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
          value={selectedRange.toString()}
          onChange={(_, data) => setSelectedRange(Number(data.value))}
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

              {/* Right column: Multi State section (placeholder for consistency) */}
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
        </RadioGroup>

        {/* Output Analog Units section divider */}
        <div className={styles.sectionDivider}>
          <span className={styles.dividerText}>Output Analog Units</span>
        </div>

        <RadioGroup
          value={selectedRange.toString()}
          onChange={(_, data) => setSelectedRange(Number(data.value))}
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
                      label={`${range.value}. ${range.label} ${range.unit}`}
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
