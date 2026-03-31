/**
 * MobileRangeDrawer — full-screen bottom-sheet range selector for mobile.
 *
 * Layout:
 *   • Sticky header: title, manual input, current label, OK / Cancel
 *   • Scrollable body with collapsible accordion sections:
 *     – Default (Unused)
 *     – Digital Units (1-22)
 *     – Custom Digital (23-30)
 *     – Multi State (101-104)
 *     – Temp Sensors (1-10 analog, with °C/°F toggle)
 *     – Other Analog (11-39)
 *     – Custom Range / Tables (20-24 analog)
 *
 * Reuses rangeData.ts from the desktop inputs feature.
 */

import React, { useState, useCallback } from 'react';
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
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  Dismiss24Regular,
  ChevronDownRegular,
  ChevronRightRegular,
} from '@fluentui/react-icons';
import {
  INPUT_ANALOG_RANGES,
  DIGITAL_RANGES,
  getRangeLabel,
} from '../../../../t3-react/features/inputs/data/rangeData';

const ANALOG_DISPLAY_OFFSET = 30;

/* ────────────────────────────────────────────── Styles ── */

const useStyles = makeStyles({
  drawer: {
    width: '100vw',
    maxWidth: '100vw',
  },
  header: {
    padding: '8px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 600,
  },
  headerSubtitle: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    marginLeft: '8px',
  },
  /* Sticky controls bar */
  controlsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    position: 'sticky',
    top: 0,
    zIndex: 10,
    flexWrap: 'wrap',
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  numberInput: {
    width: '64px',
    flexShrink: 0,
  },
  currentLabel: {
    flex: 1,
    fontSize: '13px',
    color: tokens.colorNeutralForeground2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
    padding: '4px 8px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: '4px',
  },
  buttonsRow: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  body: {
    padding: '0',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },

  /* Accordion section */
  section: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 12px',
    cursor: 'pointer',
    userSelect: 'none',
    backgroundColor: '#fafafa',
    ':active': { backgroundColor: '#f0f0f0' },
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    flex: 1,
  },
  sectionChevron: {
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  sectionBody: {
    padding: '4px 8px 8px',
  },

  /* Radio grid — 2 columns */
  radioGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0',
  },
  radioItem: {
    padding: '2px 0',
  },
  radioLabel: {
    fontSize: '12px',
  },

  /* Temp toggle */
  tempToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '4px 8px 8px',
  },

  /* Default (Unused) row */
  defaultRow: {
    padding: '8px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

/* ────────────────────────────────────────────── Types ── */

interface MobileRangeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRange: number;
  digitalAnalog: number;
  onSave: (newRange: number, newDigitalAnalog: number) => void;
  inputLabel?: string;
}

/* ────────────────────────────────────── Accordion helper ── */

const AccordionSection: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, defaultOpen = false, children }) => {
  const styles = useStyles();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setOpen(o => !o)}>
        <span className={styles.sectionChevron}>
          {open ? <ChevronDownRegular fontSize={14} /> : <ChevronRightRegular fontSize={14} />}
        </span>
        <span className={styles.sectionTitle}>{title}</span>
      </div>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
};

/* ────────────────────────────────────── Main component ── */

export const MobileRangeDrawer: React.FC<MobileRangeDrawerProps> = ({
  isOpen,
  onClose,
  currentRange,
  digitalAnalog,
  onSave,
  inputLabel,
}) => {
  const styles = useStyles();

  const [selectedRange, setSelectedRange] = useState<number>(currentRange);
  const [selectedSection, setSelectedSection] = useState<'digital' | 'analog'>(() =>
    digitalAnalog === 0 ? 'digital' : 'analog'
  );
  const [manualInput, setManualInput] = useState<string>(() =>
    digitalAnalog === 1 && currentRange > 0
      ? (currentRange + ANALOG_DISPLAY_OFFSET).toString()
      : currentRange.toString()
  );
  const [useFahrenheit, setUseFahrenheit] = useState<boolean>(() =>
    currentRange >= 1 && currentRange <= 10 ? currentRange % 2 === 0 : false
  );

  // Helpers
  const cppToDisplay = (cpp: number, isAnalog: boolean): string =>
    (isAnalog && cpp > 0 ? cpp + ANALOG_DISPLAY_OFFSET : cpp).toString();

  const isTempSensor = (r: number) => r >= 1 && r <= 10;
  const getTempBase = (r: number) => (r % 2 === 0 ? r - 1 : r);

  // Unified RadioGroup value
  const radioGroupValue = selectedRange === 0
    ? '0'
    : selectedSection === 'analog'
      ? (isTempSensor(selectedRange) ? 'a' + getTempBase(selectedRange) : 'a' + selectedRange)
      : selectedRange.toString();

  // Current label text
  const getDigitalAnalogForValue = (): number =>
    selectedSection === 'analog' ? 1 : 0;
  const currentRangeLabel = getRangeLabel(selectedRange, getDigitalAnalogForValue());

  // Reset when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedRange(currentRange);
      const section = digitalAnalog === 0 ? 'digital' : 'analog';
      setSelectedSection(section);
      setManualInput(cppToDisplay(currentRange, section === 'analog'));
      setUseFahrenheit(currentRange >= 1 && currentRange <= 10 ? currentRange % 2 === 0 : false);
    }
  }, [isOpen, currentRange, digitalAnalog]);

  // Radio change handler
  const handleRadioChange = useCallback((_: React.FormEvent<HTMLDivElement>, data: { value: string }) => {
    const v = data.value;
    if (v.startsWith('a')) {
      const cppValue = parseInt(v.slice(1));
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
  }, [useFahrenheit]);

  // Manual input handler
  const handleManualInputChange = useCallback((value: string) => {
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
  }, []);

  const handleSave = () => {
    onSave(selectedRange, selectedSection === 'analog' ? 1 : 0);
    onClose();
  };

  const handleCancel = () => {
    setSelectedRange(currentRange);
    const section = digitalAnalog === 0 ? 'digital' : 'analog';
    setSelectedSection(section);
    setManualInput(cppToDisplay(currentRange, section === 'analog'));
    setUseFahrenheit(currentRange >= 1 && currentRange <= 10 ? currentRange % 2 === 0 : false);
    onClose();
  };

  // Which section should default-open based on current value
  const isDigitalCurrent = digitalAnalog === 0 && currentRange >= 1 && currentRange <= 22;
  const isCustomDigitalCurrent = digitalAnalog === 0 && currentRange >= 23 && currentRange <= 30;
  const isMultiStateCurrent = digitalAnalog === 0 && currentRange >= 101 && currentRange <= 104;
  const isTempCurrent = digitalAnalog === 1 && currentRange >= 1 && currentRange <= 10;
  const isOtherAnalogCurrent = digitalAnalog === 1 && currentRange >= 11 && currentRange <= 39;

  // Filter ranges for each section
  const digitalStandard = DIGITAL_RANGES.filter(r => r.value >= 1 && r.value <= 22);
  const digitalCustom = DIGITAL_RANGES.filter(r => r.value >= 23 && r.value <= 30);
  const multiState = DIGITAL_RANGES.filter(r => r.value >= 101 && r.value <= 104);
  const tempSensors = INPUT_ANALOG_RANGES.filter(r => r.value >= 1 && r.value <= 10 && r.value % 2 === 1); // odd = °C base
  const otherAnalog = INPUT_ANALOG_RANGES.filter(r => r.value >= 11 && r.value <= 39);

  return (
    <Drawer
      type="overlay"
      separator
      open={isOpen}
      onOpenChange={(_, { open }) => !open && handleCancel()}
      position="bottom"
      size="large"
      className={styles.drawer}
      style={{ height: '90vh' }}
    >
      <DrawerHeader className={styles.header}>
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
          <span className={styles.headerTitle}>Select Range</span>
          {inputLabel && <span className={styles.headerSubtitle}>{inputLabel}</span>}
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody className={styles.body}>
        {/* Controls bar — sticky */}
        <div className={styles.controlsBar}>
          <div className={styles.controlsRow}>
            <Label style={{ fontSize: '12px', flexShrink: 0 }}>Range:</Label>
            <Input
              type="number"
              value={manualInput}
              onChange={(_, data) => handleManualInputChange(data.value)}
              className={styles.numberInput}
              size="small"
              min={0}
              max={104}
            />
            <div className={styles.currentLabel}>{currentRangeLabel}</div>
          </div>
          <div className={styles.buttonsRow}>
            <Button appearance="primary" size="small" onClick={handleSave}>OK</Button>
            <Button appearance="secondary" size="small" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>

        {/* Single RadioGroup wraps everything so only one radio can be selected */}
        <RadioGroup value={radioGroupValue} onChange={handleRadioChange}>
          {/* Default: Unused */}
          <div className={styles.defaultRow}>
            <Radio value="0" label={<Text size={200}>0. Unused</Text>} />
          </div>

          {/* Digital Units (1-22) */}
          <AccordionSection title="Digital Units (1-22)" defaultOpen={isDigitalCurrent}>
            <div className={styles.radioGrid}>
              {digitalStandard.map(r => (
                <div key={r.value} className={styles.radioItem}>
                  <Radio
                    value={r.value.toString()}
                    label={<Text size={200}>{r.value}. {r.label}</Text>}
                  />
                </div>
              ))}
            </div>
          </AccordionSection>

          {/* Custom Digital (23-30) */}
          <AccordionSection title="Custom Digital (23-30)" defaultOpen={isCustomDigitalCurrent}>
            <div className={styles.radioGrid}>
              {digitalCustom.map(r => (
                <div key={r.value} className={styles.radioItem}>
                  <Radio
                    value={r.value.toString()}
                    label={<Text size={200}>{r.value}. {r.label}</Text>}
                  />
                </div>
              ))}
            </div>
          </AccordionSection>

          {/* Multi State (101-104) */}
          <AccordionSection title="Multi State (101-104)" defaultOpen={isMultiStateCurrent}>
            <div className={styles.radioGrid}>
              {multiState.map(r => (
                <div key={r.value} className={styles.radioItem}>
                  <Radio
                    value={r.value.toString()}
                    label={<Text size={200}>{r.value}. {r.label}</Text>}
                  />
                </div>
              ))}
            </div>
          </AccordionSection>

          {/* Temp Sensors */}
          <AccordionSection title="Temp Sensors" defaultOpen={isTempCurrent}>
            <div className={styles.tempToggle}>
              <Checkbox
                checked={!useFahrenheit}
                onChange={(_, data) => {
                  setUseFahrenheit(!data.checked);
                  // Update selected range if currently on a temp sensor
                  if (isTempSensor(selectedRange) && selectedSection === 'analog') {
                    const base = getTempBase(selectedRange);
                    const actual = !data.checked ? base + 1 : base;
                    setSelectedRange(actual);
                    setManualInput((actual + ANALOG_DISPLAY_OFFSET).toString());
                  }
                }}
                label={<Text size={200}>°C</Text>}
              />
              <Checkbox
                checked={useFahrenheit}
                onChange={(_, data) => {
                  setUseFahrenheit(!!data.checked);
                  if (isTempSensor(selectedRange) && selectedSection === 'analog') {
                    const base = getTempBase(selectedRange);
                    const actual = data.checked ? base + 1 : base;
                    setSelectedRange(actual);
                    setManualInput((actual + ANALOG_DISPLAY_OFFSET).toString());
                  }
                }}
                label={<Text size={200}>°F</Text>}
              />
            </div>
            <div className={styles.radioGrid}>
              {tempSensors.map(r => {
                const displayNum = r.value + ANALOG_DISPLAY_OFFSET;
                return (
                  <div key={r.value} className={styles.radioItem}>
                    <Radio
                      value={'a' + r.value}
                      label={<Text size={200}>{displayNum}. {r.label}</Text>}
                    />
                  </div>
                );
              })}
            </div>
          </AccordionSection>

          {/* Other Analog Options (11-39) */}
          <AccordionSection title="Other Analog Options" defaultOpen={isOtherAnalogCurrent}>
            <div className={styles.radioGrid}>
              {otherAnalog.map(r => {
                const displayNum = r.value + ANALOG_DISPLAY_OFFSET;
                return (
                  <div key={r.value} className={styles.radioItem}>
                    <Radio
                      value={'a' + r.value}
                      label={<Text size={200}>{displayNum}. {r.label}</Text>}
                    />
                  </div>
                );
              })}
            </div>
          </AccordionSection>
        </RadioGroup>
      </DrawerBody>
    </Drawer>
  );
};
