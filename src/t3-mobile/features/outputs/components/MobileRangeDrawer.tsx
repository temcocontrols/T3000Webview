/**
 * MobileRangeDrawer for Outputs — bottom-sheet range selector.
 *
 * Layout matches PC version:
 *   • Sticky controls: manual input, current label, OK / Cancel
 *   • Default (Unused) always visible
 *   • Digital section: Digital Units, Custom Digital, Multi State
 *   • Output Analog Units section: simple list (31–38)
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
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  Dismiss24Regular,
  ChevronDownRegular,
  ChevronRightRegular,
} from '@fluentui/react-icons';
import {
  OUTPUT_ANALOG_RANGES,
  OUTPUT_DIGITAL_RANGES,
  getRangeLabel,
} from '../../../../t3-react/features/outputs/data/rangeData';

/* ────────────────────────────────────────────── Styles ── */

const useStyles = makeStyles({
  drawer: { width: '100vw', maxWidth: '100vw' },
  header: { padding: '8px 12px', borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  headerTitle: { fontSize: '16px', fontWeight: 600 },
  headerSubtitle: { fontSize: '12px', color: tokens.colorNeutralForeground3, marginLeft: '8px' },
  controlsBar: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    position: 'sticky', top: 0, zIndex: 10, flexWrap: 'wrap',
  },
  controlsRow: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 },
  numberInput: { width: '64px', flexShrink: 0 },
  currentLabel: {
    flex: 1, fontSize: '13px', color: tokens.colorNeutralForeground2,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
    padding: '4px 8px', backgroundColor: tokens.colorNeutralBackground3, borderRadius: '4px',
  },
  buttonsRow: { display: 'flex', gap: '6px', flexShrink: 0 },
  body: { padding: '0', overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  section: { borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, width: '100%' },
  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 12px',
    cursor: 'pointer', userSelect: 'none', backgroundColor: '#f0f0f0',
    width: '100%', boxSizing: 'border-box' as const,
    ':active': { backgroundColor: '#e4e4e4' },
  },
  sectionTitle: { fontSize: '14px', fontWeight: 600, color: tokens.colorNeutralForeground1, flex: 1 },
  sectionChevron: { color: tokens.colorNeutralForeground3, flexShrink: 0 },
  sectionBody: { padding: '0' },
  subSectionHeader: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px',
    backgroundColor: '#fafafa', borderBottom: `1px solid #edebe9`,
    width: '100%', boxSizing: 'border-box' as const,
  },
  subSectionTitle: { fontSize: '12px', fontWeight: 600, color: tokens.colorNeutralForeground2, flex: 1 },
  editButton: { fontSize: '11px', minWidth: 'auto', padding: '2px 8px', height: '22px' },
  radioGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', padding: '4px 12px 8px', width: '100%' },
  radioItem: { padding: '2px 0' },
  defaultRow: { padding: '8px 12px', borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, width: '100%', boxSizing: 'border-box' as const },
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

/* ────────────────────────────────── Collapsible section ── */

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
    currentRange.toString()
  );

  const radioGroupValue = selectedRange === 0
    ? '0'
    : selectedSection === 'analog'
      ? 'a' + selectedRange
      : selectedRange.toString();

  const currentRangeLabel = getRangeLabel(selectedRange, selectedSection === 'analog' ? 1 : 0);

  // Reset when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedRange(currentRange);
      const section = digitalAnalog === 0 ? 'digital' : 'analog';
      setSelectedSection(section);
      setManualInput(currentRange.toString());
    }
  }, [isOpen, currentRange, digitalAnalog]);

  const handleRadioChange = useCallback((_: React.FormEvent<HTMLDivElement>, data: { value: string }) => {
    const v = data.value;
    if (v.startsWith('a')) {
      const num = parseInt(v.slice(1));
      setSelectedSection('analog');
      setSelectedRange(num);
      setManualInput(num.toString());
    } else {
      const num = parseInt(v);
      setSelectedSection('digital');
      setSelectedRange(num);
      setManualInput(num.toString());
    }
  }, []);

  const handleManualInputChange = useCallback((value: string) => {
    setManualInput(value);
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    if (num === 0) {
      setSelectedRange(0);
      setSelectedSection('digital');
    } else if (num >= 1 && num <= 30) {
      setSelectedRange(num);
      setSelectedSection('digital');
    } else if (num >= 31 && num <= 38) {
      setSelectedRange(num);
      setSelectedSection('analog');
    } else if (num >= 101 && num <= 104) {
      setSelectedRange(num);
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
    setManualInput(currentRange.toString());
    onClose();
  };

  const isDigitalCurrent = digitalAnalog === 0 && currentRange >= 1;
  const isAnalogCurrent = digitalAnalog === 1 && currentRange >= 1;

  const digitalStandard = OUTPUT_DIGITAL_RANGES.filter(r => r.value >= 1 && r.value <= 22);
  const digitalCustom = OUTPUT_DIGITAL_RANGES.filter(r => r.value >= 23 && r.value <= 30);
  const multiState = OUTPUT_DIGITAL_RANGES.filter(r => r.value >= 101 && r.value <= 104);
  const analogRanges = OUTPUT_ANALOG_RANGES.filter(r => r.value >= 31);

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
            <Button appearance="subtle" aria-label="Close" icon={<Dismiss24Regular />} onClick={handleCancel} />
          }
        >
          <span className={styles.headerTitle}>Select Range</span>
          {inputLabel && <span className={styles.headerSubtitle}>{inputLabel}</span>}
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody className={styles.body}>
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

        <RadioGroup value={radioGroupValue} onChange={handleRadioChange} style={{ width: '100%' }}>
          <div className={styles.defaultRow}>
            <Radio value="0" label={<Text size={200}>0. Unused</Text>} />
          </div>

          {/* ═══════ Digital ═══════ */}
          <CollapsibleSection title="Digital" defaultOpen={isDigitalCurrent}>
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

          {/* ═══════ Output Analog Units ═══════ */}
          <CollapsibleSection title="Output Analog Units" defaultOpen={isAnalogCurrent}>
            <div className={styles.subSectionHeader}>
              <span className={styles.subSectionTitle}>Analog Ranges</span>
            </div>
            <div className={styles.radioGrid}>
              {analogRanges.map(r => (
                <div key={r.value} className={styles.radioItem}>
                  <Radio value={'a' + r.value} label={<Text size={200}>{r.value}. {r.label}</Text>} />
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </RadioGroup>
      </DrawerBody>
    </Drawer>
  );
};
