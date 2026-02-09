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
    maxWidth: '550px',
    marginTop: '5vh',
    alignSelf: 'flex-start',
  },
  dialogBody: {
    padding: '8px 12px 12px 12px',
  },
  section: {
    marginBottom: '8px',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  autoSaveRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
  },
  groupBox: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    padding: '8px 12px',
    marginTop: '8px',
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
  panelType: number; // panel_type
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
  panelType,
  firmwareVersion,
}) => {
  const styles = useStyles();

  const [fixRS485, setFixRS485] = useState(fixComConfig);
  const [autoSaveMinutes, setAutoSaveMinutes] = useState(String(writeFlashMinutes));
  const [inputCount, setInputCount] = useState(String(maxInput));
  const [outputCount, setOutputCount] = useState(String(maxOutput));
  const [variableCount, setVariableCount] = useState(String(maxVariable));
  const [validationError, setValidationError] = useState<string | null>(null);

  // PM_ESP32_T3_SERIES = 212, PM_MINIPANEL_ARM = 177
  const isESP32 = panelType === 212;
  const isMiniPanelARM = panelType === 177;

  // Feature availability based on firmware version
  const supportsAutoSave = (isESP32 && firmwareVersion >= 655) || (isMiniPanelARM && firmwareVersion >= 670);
  const supportsQuantityAdjust = isESP32 && firmwareVersion >= 664;

  useEffect(() => {
    setFixRS485(fixComConfig);
    setAutoSaveMinutes(String(writeFlashMinutes));
    setInputCount(String(maxInput));
    setOutputCount(String(maxOutput));
    setVariableCount(String(maxVariable));
    setValidationError(null);
  }, [fixComConfig, writeFlashMinutes, maxInput, maxOutput, maxVariable, isOpen]);

  const validateAndSave = () => {
    setValidationError(null);

    // Validate auto-save minutes
    const minutes = parseInt(autoSaveMinutes, 10);
    if (supportsAutoSave && minutes !== 0 && minutes < 5) {
      setValidationError('The value of save parameter must be greater than 5!');
      return;
    }

    // Validate quantity adjustments
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
          <DialogTitle>Advanced Settings</DialogTitle>
          <DialogContent>
            {/* Fix RS485 Settings */}
            <div className={styles.checkboxRow}>
              <Checkbox
                checked={fixRS485}
                onChange={(_, data) => setFixRS485(data.checked === true)}
                label="Fix RS485 Main and Sub Settings"
                disabled={!supportsAutoSave}
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
                disabled={!supportsAutoSave}
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
              <div className={styles.warningText} style={{ marginTop: '16px' }}>
                ⚠ {validationError}
              </div>
            )}

            {!supportsAutoSave && !supportsQuantityAdjust && (
              <div className={styles.warningText}>
                ⚠ Advanced settings require ESP32 (firmware ≥ 6.55) or MiniPanel ARM (firmware ≥ 6.70)
              </div>
            )}
          </DialogContent>
          <DialogActions className={styles.dialogActions}>
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
