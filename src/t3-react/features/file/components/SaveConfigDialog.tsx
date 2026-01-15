/**
 * Save Configuration Dialog
 *
 * Based on C++ SaveConfigFile() implementation
 * C++ Reference: MainFrm.cpp Line 15695-15770
 *
 * Shows file save dialog for *.prog files (Bacnet protocol)
 * Triggers device data refresh before saving
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Input,
  Label,
  Text,
  Spinner,
} from '@fluentui/react-components';
import { Save24Regular, DocumentRegular } from '@fluentui/react-icons';
import { saveConfigFile, saveFileDialog, FileType } from '../services/fileOperations';

interface SaveConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (filePath: string) => void;
}

export const SaveConfigDialog: React.FC<SaveConfigDialogProps> = ({
  open,
  onOpenChange,
  onSaved,
}) => {
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    setStatus('');

    const trimmedName = fileName.trim();
    if (!trimmedName) {
      setError('File name cannot be empty');
      return;
    }

    // Add .prog extension if not present (Bacnet protocol file)
    const fullFileName = trimmedName.endsWith('.prog') ? trimmedName : `${trimmedName}.prog`;

    setLoading(true);
    setStatus('Reading device data...');

    // C++ first reads all data via Show_Wait_Dialog_And_ReadBacnet()
    // Then saves the binary file
    const result = await saveConfigFile(fullFileName);

    setLoading(false);

    if (result.success) {
      setStatus('Configuration saved successfully');
      onSaved?.(result.filePath || fullFileName);
      setTimeout(() => {
        setFileName('');
        setStatus('');
        onOpenChange(false);
      }, 1000);
    } else {
      setError(result.message);
    }
  };

  const handleCancel = () => {
    setFileName('');
    setError('');
    setStatus('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            <Save24Regular style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Save Configuration
          </DialogTitle>
          <DialogContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <Label htmlFor="file-name">File Name</Label>
                <Input
                  id="file-name"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Enter file name..."
                  contentAfter={<Text size={200}>.prog</Text>}
                  style={{ width: '100%' }}
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSave();
                    }
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DocumentRegular style={{ fontSize: '16px', color: '#605e5c' }} />
                <Text size={200} style={{ color: '#605e5c' }}>
                  Bacnet protocol file (*.prog)
                </Text>
              </div>
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Spinner size="tiny" />
                  <Text size={200}>{status}</Text>
                </div>
              )}
              {error && (
                <Text size={200} style={{ color: '#d13438' }}>
                  {error}
                </Text>
              )}
              {status && !loading && !error && (
                <Text size={200} style={{ color: '#107c10' }}>
                  {status}
                </Text>
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <Button
              appearance="secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleSave}
              disabled={loading || !fileName.trim()}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
