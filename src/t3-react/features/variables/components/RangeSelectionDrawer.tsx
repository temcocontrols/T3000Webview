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
import { VARIABLE_ANALOG_RANGES, DIGITAL_RANGES, getRangeLabel, inferDigitalAnalog } from '../data/rangeData';
import styles from '../../inputs/components/RangeSelectionDrawer.module.css';

interface RangeSelectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRange: number;
  digitalAnalog: number;
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
  // Analog (1–33) and digital (1–30) codes overlap, so the mode cannot be derived
  // from the number — it comes from the section the user picked.
  const [mode, setMode] = useState<number>(digitalAnalog);

  const handleSave = () => {
    // A manually typed code that only one table defines overrides the radio choice
    // (e.g. 101 = MSV is digital-only, 32 = BTU is analog-only).
    onSave(selectedRange, inferDigitalAnalog(selectedRange) ?? mode);
    onClose();
  };

  const handleCancel = () => {
    setSelectedRange(currentRange);
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

  React.useEffect(() => {
    if (isOpen) {
      setSelectedRange(currentRange);
      setManualInput(currentRange.toString());
      setMode(digitalAnalog);
    }
  }, [isOpen, currentRange, digitalAnalog]);

  // Analog units are the firmware's 0-based indices 1..33 (`1 = °C`); digital
  // states are 1..30 and the MSV codes 101..104. The number alone is ambiguous,
  // so the label shown follows the mode the user is editing.
  const currentRangeLabel = getRangeLabel(selectedRange, mode);

  const handleRadioChange = (_: React.ChangeEvent<HTMLInputElement>, data: { value: string }) => {
    const num = parseInt(data.value);
    setSelectedRange(num);
    setManualInput(num.toString());
  };

  const handleDigitalChange = (ev: React.FormEvent<HTMLDivElement>, data: { value: string }) => {
    setMode(0);
    handleRadioChange(ev as unknown as React.ChangeEvent<HTMLInputElement>, data);
  };

  const handleAnalogChange = (ev: React.FormEvent<HTMLDivElement>, data: { value: string }) => {
    setMode(1);
    handleRadioChange(ev as unknown as React.ChangeEvent<HTMLInputElement>, data);
  };

  const digitalGroupValue = mode === 0 ? selectedRange.toString() : '';
  const analogGroupValue = mode === 1 ? selectedRange.toString() : '';

  // Split analog into two columns
  const analogLeft  = VARIABLE_ANALOG_RANGES.filter(r => r.value >= 1 && r.value <= 17);
  const analogRight = VARIABLE_ANALOG_RANGES.filter(r => r.value >= 18 && r.value <= 33);

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
              <Text size={200} className={styles.inputLabelHeader}>{inputLabel}</Text>
            )}
          </div>
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody className={styles.drawerBody}>
        {/* Top: Default + Selection */}
        <div className={styles.topCombinedSection}>
          <div className={styles.defaultColumn}>
            <div className={styles.sectionDivider}>
              <span className={styles.dividerText}>Default</span>
            </div>
            <div className={styles.defaultSection}>
              <RadioGroup value={selectedRange === 0 ? '0' : ''} onChange={handleDigitalChange}>
                <Radio value="0" label="0. Unused" />
              </RadioGroup>
            </div>
          </div>
          <div className={styles.selectionColumn}>
            <div className={styles.sectionDivider}>
              <span className={styles.dividerText}>Selection</span>
            </div>
            <div className={styles.topSection}>
              <Label className={styles.inputLabel}>Enter Range Number (0-104):</Label>
              <Input
                type="number"
                value={manualInput}
                onChange={(_, data) => handleManualInputChange(data.value)}
                className={styles.numberInput}
                min={0}
                max={104}
              />
              <div className={styles.currentLabel}>{currentRangeLabel}</div>
              <div className={styles.actionButtons}>
                <Button appearance="primary" onClick={handleSave} className={styles.saveButton}>OK</Button>
                <Button appearance="secondary" onClick={handleCancel}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Digital states (mode 0) and variable analog units (mode 1) are separate
            radio groups: the same code numbers exist in both tables. */}
        <div className={styles.sectionDivider}>
          <span className={styles.dividerText}>Digital</span>
        </div>
        <RadioGroup value={digitalGroupValue} onChange={handleDigitalChange}>
          <div className={styles.mainContent}>
            <div className={styles.digitalSection}>
              {/* Left: standard digital 1-22 */}
              <div className={styles.column}>
                <div className={styles.sectionHeader}>
                  <Text weight="semibold" size={300} className={styles.sectionTitle}>Digital Units</Text>
                </div>
                <div className={styles.rangeGroupTwoColumn}>
                  {DIGITAL_RANGES.filter(r => r.value >= 1 && r.value <= 22).map((range) => (
                    <div key={range.value} className={styles.rangeOption}>
                      <Radio value={range.value.toString()} label={`${range.value}. ${range.label}`} />
                    </div>
                  ))}
                </div>
              </div>
              {/* Middle: custom digital 23-30 */}
              <div className={styles.column}>
                <div className={styles.sectionHeader}>
                  <Text weight="semibold" size={300} className={styles.sectionTitle}>Custom Digital Units</Text>
                  <Button appearance="primary" className={styles.editButton}>Edit</Button>
                </div>
                <div className={styles.rangeGroup}>
                  {[23,24,25,26,27,28,29,30].map(v => (
                    <div key={v} className={styles.rangeOption}>
                      <Radio value={v.toString()} label={`${v}. /`} />
                    </div>
                  ))}
                </div>
              </div>
              {/* Right: Multi State — the state names live in the device's own MSV
                 objects, so they are only shown here (no editor yet). */}
              <div className={styles.column}>
                <div className={styles.sectionHeader}>
                  <Text weight="semibold" size={300} className={styles.sectionTitle}>Multi State</Text>
                </div>
                <div className={styles.rangeGroup}>
                  {[101,102,103,104].map(v => (
                    <div key={v} className={styles.rangeOption}>
                      <Radio value={v.toString()} label={`${v}. ${getRangeLabel(v, 0)}`} />
                    </div>
                  ))}
                </div>
                <Text size={100} className={styles.inputLabelHeader}>
                  State names come from the device&apos;s MSV objects; editing them needs a
                  T3000 FFI action that does not exist yet.
                </Text>
              </div>
            </div>
          </div>
        </RadioGroup>

        {/* Variable Analog Units — its own group: these codes set mode 1 */}
        <div className={styles.sectionDivider}>
          <span className={styles.dividerText}>Variable Analog Units</span>
        </div>
        <RadioGroup value={analogGroupValue} onChange={handleAnalogChange}>
          <div className={styles.analogSection}>
            <div className={styles.analogColumns} style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className={styles.column}>
                <div className={styles.sectionHeader}>
                  <Text weight="semibold" size={300} className={styles.sectionTitle}>
                    Temp / Power / Electrical / Time
                  </Text>
                </div>
                <div className={styles.rangeGroup}>
                  {analogLeft.map((range) => (
                    <div key={range.value} className={styles.rangeOption}>
                      <Radio value={range.value.toString()} label={`${range.value}. ${range.label}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.column}>
                <div className={styles.sectionHeader}>
                  <Text weight="semibold" size={300} className={styles.sectionTitle}>
                    Measurement / Flow / Custom
                  </Text>
                </div>
                <div className={styles.rangeGroup}>
                  {analogRight.map((range) => (
                    <div key={range.value} className={styles.rangeOption}>
                      <Radio value={range.value.toString()} label={`${range.value}. ${range.label}`} />
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
