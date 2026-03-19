/**
 * Advanced Settings Dialog
 *
 * Matches C++ BacnetSettingAdvParameter dialog (IDD_DIALOG_ADVANCED_SETTINGS)
 * Advanced device configuration including:
 * - Fix RS485 Main and Sub Settings
 * - Auto-save parameters interval
 * - Adjust Input/Output/Variable quantities (ESP32 only)
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Field,
  Input,
  Checkbox,
  makeStyles,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import { Info16Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  dialogSurface: {
    maxWidth: '500px',
    padding: '12px 16px 12px 16px',
    marginTop: '40px',
    alignSelf: 'flex-start',
  },
  dialogBody: {
    padding: '0',
    gap: '0',
  },
  dialogTitle: {
    padding: '0 0 8px 0',
    fontSize: '16px',
  },
  dialogContent: {
    padding: '0',
    overflowY: 'visible',
  },
  section: {
    marginBottom: '6px',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  autoSaveRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
  },
  groupBox: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    padding: '6px 10px',
    marginTop: '4px',
  },
  groupTitle: {
    fontSize: '13px',
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: '6px',
    color: tokens.colorNeutralForeground1,
  },
  quantityGrid: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    gap: '8px',
    alignItems: 'center',
    fontSize: '12px',
  },
  label: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    minWidth: '60px',
  },
  warningText: {
    fontSize: '11px',
    color: tokens.colorPaletteYellowForeground1,
    marginTop: '8px',
    padding: '6px 10px',
    backgroundColor: tokens.colorPaletteYellowBackground1,
    borderRadius: '4px',
    borderLeft: `3px solid ${tokens.colorPaletteYellowBorder1}`,
  },
  infoButton: {
    minWidth: '24px',
    padding: '4px',
  },
  dialogActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
});

interface AdvancedSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  fixComConfig: boolean;
  writeFlashMinutes: number;
  maxInput: number;
  maxOutput: number;
  maxVariable: number;
  onSave: (data: {
    fixComConfig: boolean;
    writeFlashMinutes: number;
    maxInput: number;
    maxOutput: number;
    maxVariable: number;
  }) => void;
  miniType: number; // mini_type byte[19]: 5-8=ARM MiniPanel, >=16=ESP32
  firmwareVersion: number; // firmware0_rev_main * 10 + firmware0_rev_sub
}

export const AdvancedSettingsDialog: React.FC<AdvancedSettingsDialogProps> = ({
  isOpen,
  onOpenChange,
  fixComConfig,
  writeFlashMinutes,
  maxInput,
  maxOutput,
  maxVariable,
  onSave,
  miniType,
  firmwareVersion,
}) => {
  const styles = useStyles();

  const [fixRS485, setFixRS485] = useState(fixComConfig);
  const [autoSaveMinutes, setAutoSaveMinutes] = useState(String(writeFlashMinutes));
  const [inputCount, setInputCount] = useState('');
  const [outputCount, setOutputCount] = useState('');
  const [variableCount, setVariableCount] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // mini_type >= 16 → ESP32-based devices (T3_ESP_TRANSDUCER=16, T3_ESP_TSTAT9=17, T3_ESP_SAUTER=18,
  // T3_ESP_RMC=19, T3_ESP_LW=21, T3_NG2_TYPE2=22, etc.)
  // mini_type 5-8 → MINIPANELARM series (ARM-based MiniPanel)
  const isESP32 = miniType >= 16;

  // Adjust quantity is ESP32-only, firmware >= 6.64
  const supportsQuantityAdjust = isESP32 && firmwareVersion >= 664;

  useEffect(() => {
    setFixRS485(fixComConfig);
    setAutoSaveMinutes(String(writeFlashMinutes));
    // Only populate quantity fields for ESP32 devices; leave blank for others (matching C++ behavior)
    setInputCount(supportsQuantityAdjust ? String(maxInput) : '');
    setOutputCount(supportsQuantityAdjust ? String(maxOutput) : '');
    setVariableCount(supportsQuantityAdjust ? String(maxVariable) : '');
    setValidationError(null);
  }, [fixComConfig, writeFlashMinutes, maxInput, maxOutput, maxVariable, isOpen, supportsQuantityAdjust]);

  const validateAndSave = () => {
    setValidationError(null);

    // Validate auto-save minutes (0 = disabled, otherwise min 5 minutes)
    const minutes = parseInt(autoSaveMinutes, 10) || 0;
    if (minutes !== 0 && minutes < 5) {
      setValidationError('The value of save parameter must be greater than 5!');
      return;
    }

    // Validate quantity adjustments (ESP32 only)
    if (supportsQuantityAdjust) {
      const inCount = parseInt(inputCount, 10);
      const outCount = parseInt(outputCount, 10);
      const varCount = parseInt(variableCount, 10);

      if (inCount < 64 || inCount > 256) {
        setValidationError('The value of input count must be between 64 and 256!');
        return;
      }
      if (outCount < 64 || outCount > 256) {
        setValidationError('The value of output count must be between 64 and 256!');
        return;
      }
      if (varCount < 128 || varCount > 256) {
        setValidationError('The value of variable count must be between 128 and 256!');
        return;
      }

      onSave({
        fixComConfig: fixRS485,
        writeFlashMinutes: minutes,
        maxInput: inCount,
        maxOutput: outCount,
        maxVariable: varCount,
      });
    } else {
      onSave({
        fixComConfig: fixRS485,
        writeFlashMinutes: minutes,
        maxInput: parseInt(inputCount, 10) || maxInput,
        maxOutput: parseInt(outputCount, 10) || maxOutput,
        maxVariable: parseInt(variableCount, 10) || maxVariable,
      });
    }

    onOpenChange(false);
  };

  const handleApply = () => {
    validateAndSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface className={styles.dialogSurface}>
        <DialogBody className={styles.dialogBody}>
          <DialogTitle className={styles.dialogTitle}>Advanced Settings</DialogTitle>
          <DialogContent className={styles.dialogContent}>
            {/* Fix RS485 Settings */}
            <div className={styles.checkboxRow}>
              <Checkbox
                checked={fixRS485}
                onChange={(_, data) => setFixRS485(data.checked === true)}
                label="Fix RS485 Main and Sub Settings"
              />
              <Tooltip
                content="After enabling this item, the Setting-Communication-Device Serial Port Config will be fixed."
                relationship="description"
              >
                <Button
                  appearance="subtle"
                  icon={<Info16Regular />}
                  size="small"
                  className={styles.infoButton}
                />
              </Tooltip>
            </div>

            {/* Auto-save parameters */}
            <div className={styles.autoSaveRow}>
              <span className={styles.label} style={{ minWidth: 'auto', whiteSpace: 'nowrap' }}>
                Automatically save the parameters of the program within
              </span>
              <Input
                type="number"
                size="small"
                value={autoSaveMinutes}
                onChange={(_, data) => setAutoSaveMinutes(data.value)}
                style={{ width: '70px', flexShrink: 0 }}
              />
              <span className={styles.label} style={{ whiteSpace: 'nowrap' }}>minutes</span>
              <Tooltip
                content="All parameters, input, output, variable, and the values run in the program are saved at regular intervals within the set time. Prevent data loss after an unexpected power outage. You can also modify this value through register 92 of modbus. When this value is set to 0, it means that this function is disabled."
                relationship="description"
              >
                <Button
                  appearance="subtle"
                  icon={<Info16Regular />}
                  size="small"
                  className={styles.infoButton}
                />
              </Tooltip>
            </div>

            {/* Adjust the quantity (ESP32 only) */}
            <div className={styles.groupBox}>
              <div className={styles.groupTitle}>Adjust the quantity</div>
              {!supportsQuantityAdjust && (
                <div className={styles.warningText}>
                  ⚠ This feature requires ESP32 device with firmware version ≥ 6.64
                </div>
              )}
              <div className={styles.quantityGrid}>
                <span className={styles.label}>Input:</span>
                <Input
                  type="number"
                  size="small"
                  value={inputCount}
                  onChange={(_, data) => setInputCount(data.value)}
                  disabled={!supportsQuantityAdjust}
                />
                <div style={{ width: '24px' }} /> {/* Spacer for OK button alignment */}

                <span className={styles.label}>Output:</span>
                <Input
                  type="number"
                  size="small"
                  value={outputCount}
                  onChange={(_, data) => setOutputCount(data.value)}
                  disabled={!supportsQuantityAdjust}
                />
                <div style={{ width: '24px' }} />

                <span className={styles.label}>Variable:</span>
                <Input
                  type="number"
                  size="small"
                  value={variableCount}
                  onChange={(_, data) => setVariableCount(data.value)}
                  disabled={!supportsQuantityAdjust}
                />
                <div style={{ width: '24px' }} />
              </div>
            </div>

            {/* Validation error */}
            {validationError && (
              <div className={styles.warningText} style={{ marginTop: '8px' }}>
                ⚠ {validationError}
              </div>
            )}
          </DialogContent>
          <DialogActions className={styles.dialogActions} style={{ paddingTop: '10px' }}>
            <Button appearance="secondary" size="small" onClick={handleApply}>
              Apply
            </Button>
            <Button appearance="primary" size="small" onClick={validateAndSave}>
              OK
            </Button>
            <Button appearance="secondary" size="small" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
