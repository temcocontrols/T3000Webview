/**
 * MobileRangeDrawer — full-screen bottom-sheet range selector for mobile.
 *
 * Matches PC version layout:
 *   • Sticky header: title, manual input, current label, OK / Cancel
 *   • Default (Unused) always visible
 *   • Digital section: Digital Units, Custom Digital Units, Multi State
 *   • Input Analog Units section: Temp Sensors (°C/°F), Other Options, Custom Range
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

  /* Main section (Digital / Analog) — collapsible */
  section: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    width: '100%',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 12px',
    cursor: 'pointer',
    userSelect: 'none',
    backgroundColor: '#f0f0f0',
    width: '100%',
    boxSizing: 'border-box' as const,
    ':active': { backgroundColor: '#e4e4e4' },
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    flex: 1,
  },
  sectionChevron: {
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  sectionBody: {
    padding: '0',
  },

  /* Sub-section header (e.g. "Digital Units", "Temp Sensors") */
  subSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 16px',
    backgroundColor: '#fafafa',
    borderBottom: `1px solid #edebe9`,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  subSectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
    flex: 1,
  },
  editButton: {
    fontSize: '11px',
    minWidth: 'auto',
    padding: '2px 8px',
    height: '22px',
  },

  /* Radio grid — 2 columns, full width */
  radioGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0',
    padding: '4px 12px 8px',
    width: '100%',
  },
  radioItem: {
    padding: '2px 0',
  },

  /* Temp toggle */
  tempToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '4px 16px 4px',
  },

  /* Default (Unused) row */
  defaultRow: {
    padding: '8px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    width: '100%',
    boxSizing: 'border-box' as const,
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

/* ────────────────────────────────────── Collapsible section ── */

const CollapsibleSection: React.FC<{
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

  // Which main section should default-open based on current value
  const isDigitalCurrent = digitalAnalog === 0 && currentRange >= 1;
  const isAnalogCurrent = digitalAnalog === 1 && currentRange >= 1;

  // Filter ranges for sub-sections
  const digitalStandard = DIGITAL_RANGES.filter(r => r.value >= 1 && r.value <= 22);
  const digitalCustom = DIGITAL_RANGES.filter(r => r.value >= 23 && r.value <= 30);
  const multiState = DIGITAL_RANGES.filter(r => r.value >= 101 && r.value <= 104);
  const tempSensors = INPUT_ANALOG_RANGES.filter(r => r.value >= 1 && r.value <= 10 && r.value % 2 === 1);
  const customRange = INPUT_ANALOG_RANGES.filter(r => r.value >= 20 && r.value <= 24);

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

        {/* Single RadioGroup wraps everything */}
        <RadioGroup value={radioGroupValue} onChange={handleRadioChange} style={{ width: '100%' }}>
          {/* Default: Unused */}
          <div className={styles.defaultRow}>
            <Radio value="0" label={<Text size={200}>0. Unused</Text>} />
          </div>

          {/* ═══════ Digital ═══════ */}
          <CollapsibleSection title="Digital" defaultOpen={isDigitalCurrent}>
            {/* Digital Units */}
            <div className={styles.subSectionHeader}>
              <span className={styles.subSectionTitle}>Digital Units</span>
            </div>
            <div className={styles.radioGrid}>
              {digitalStandard.map(r => (
                <div key={r.value} className={styles.radioItem}>
                  <Radio value={r.value.toString()} label={<Text size={200}>{r.value}. {r.label}</Text>} />
                </div>
              ))}
            </div>

            {/* Custom Digital Units */}
            <div className={styles.subSectionHeader}>
              <span className={styles.subSectionTitle}>Custom Digital Units</span>
              <Button appearance="primary" size="small" className={styles.editButton}>Edit</Button>
            </div>
            <div className={styles.radioGrid}>
              {digitalCustom.map(r => (
                <div key={r.value} className={styles.radioItem}>
                  <Radio value={r.value.toString()} label={<Text size={200}>{r.value}. {r.label}</Text>} />
                </div>
              ))}
            </div>

            {/* Multi State */}
            <div className={styles.subSectionHeader}>
              <span className={styles.subSectionTitle}>Multi State</span>
              <Button appearance="primary" size="small" className={styles.editButton}>Edit</Button>
            </div>
            <div className={styles.radioGrid}>
              {multiState.map(r => (
                <div key={r.value} className={styles.radioItem}>
                  <Radio value={r.value.toString()} label={<Text size={200}>{r.value}. {r.label}</Text>} />
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* ═══════ Input Analog Units ═══════ */}
          <CollapsibleSection title="Input Analog Units" defaultOpen={isAnalogCurrent}>
            {/* Temp Sensors */}
            <div className={styles.subSectionHeader}>
              <span className={styles.subSectionTitle}>Temp Sensors</span>
            </div>
            <div className={styles.tempToggle}>
              <Checkbox
                checked={!useFahrenheit}
                onChange={(_, data) => {
                  setUseFahrenheit(!data.checked);
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
                    <Radio value={'a' + r.value} label={<Text size={200}>{displayNum}. {r.label}</Text>} />
                  </div>
                );
              })}
            </div>

            {/* Other Options */}
            <div className={styles.subSectionHeader}>
              <span className={styles.subSectionTitle}>Other Options</span>
            </div>
            <div className={styles.radioGrid}>
              <div className={styles.radioItem}><Radio value="a11" label={<Text size={200}>41. 0.0 to 5.0 Volts</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a12" label={<Text size={200}>42. 0.0 to 100 Amps</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a13" label={<Text size={200}>43. 4.0 to 20 ma</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a14" label={<Text size={200}>44. 0.0 to 20 psi</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a15" label={<Text size={200}>45. Pulse Count (Slow 1Hz)</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a16" label={<Text size={200}>46. 0 to 100 % (0-10V)</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a17" label={<Text size={200}>47. 0 to 100 % (0-5V)</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a18" label={<Text size={200}>48. 0 to 100 % (4-20ma)</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a19" label={<Text size={200}>49. 0.0 to 10.0 Volts</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a25" label={<Text size={200}>55. Pulse Count (Fast 100Hz)</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a26" label={<Text size={200}>56. Frequency</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a27" label={<Text size={200}>57. Humidity %</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a28" label={<Text size={200}>58. CO2 PPM</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a29" label={<Text size={200}>59. RPM</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a30" label={<Text size={200}>60. TVOC PPB</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a31" label={<Text size={200}>61. ug/m3</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a32" label={<Text size={200}>62. #/cm3</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a33" label={<Text size={200}>63. dB</Text>} /></div>
              <div className={styles.radioItem}><Radio value="a34" label={<Text size={200}>64. Lux</Text>} /></div>
            </div>

            {/* Custom Range */}
            <div className={styles.subSectionHeader}>
              <span className={styles.subSectionTitle}>Custom Range</span>
            </div>
            <div className={styles.radioGrid}>
              {customRange.map(r => {
                const displayNum = r.value + ANALOG_DISPLAY_OFFSET;
                return (
                  <div key={r.value} className={styles.radioItem}>
                    <Radio value={'a' + r.value} label={<Text size={200}>{displayNum}. {r.label}</Text>} />
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        </RadioGroup>
      </DrawerBody>
    </Drawer>
  );
};
