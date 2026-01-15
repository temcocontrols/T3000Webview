/**
 * Load Configuration Dialog
 *
 * Based on C++ OnLoadConfigFile() implementation
 * C++ Reference: MainFrm.cpp Line 15605-15693
 *
 * Opens file dialog for:
 * - *.prog files (Bacnet protocol)
 * - *.txt files (Modbus T-Stat devices)
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
  Text,
  Spinner,
} from '@fluentui/react-components';
import { FolderOpen24Regular, DocumentRegular, WarningRegular } from '@fluentui/react-icons';
import { loadConfigFile, openFileDialog, FileType } from '../services/fileOperations';

interface LoadConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoaded?: (filePath: string) => void;
  fileType?: FileType; // PROG for Bacnet, TXT for Modbus T-Stat
}

export const LoadConfigDialog: React.FC<LoadConfigDialogProps> = ({
  open,
  onOpenChange,
  onLoaded,
  fileType = FileType.PROG,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleSelectFile = async () => {
    const file = await openFileDialog(fileType);
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleLoad = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setError('');
    setStatus('');
    setLoading(true);
    setStatus('Loading configuration...');

    // C++ loads binary file via LoadBacnetBinaryFile() for Bacnet
    // Or Write_Modbus_10000 for Modbus devices
    const result = await loadConfigFile(selectedFile.name);

    setLoading(false);

    if (result.success) {
      setStatus('Configuration loaded successfully');
      onLoaded?.(selectedFile.name);
      setTimeout(() => {
        setSelectedFile(null);
        setStatus('');
        onOpenChange(false);
      }, 1000);
    } else {
      setError(result.message);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setError('');
    setStatus('');
    onOpenChange(false);
  };

  const getFileTypeDescription = () => {
    switch (fileType) {
      case FileType.PROG:
        return 'Bacnet protocol file (*.prog)';
      case FileType.TXT:
        return 'Modbus T-Stat configuration (*.txt)';
      default:
        return 'Configuration file';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            <FolderOpen24Regular style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Load Configuration
          </DialogTitle>
          <DialogContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <Button
                  appearance="secondary"
                  icon={<DocumentRegular />}
                  onClick={handleSelectFile}
                  disabled={loading}
                >
                  Browse...
                </Button>
                {selectedFile && (
                  <Text size={200} style={{ marginLeft: '12px' }}>
                    {selectedFile.name}
                  </Text>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DocumentRegular style={{ fontSize: '16px', color: '#605e5c' }} />
                <Text size={200} style={{ color: '#605e5c' }}>
                  {getFileTypeDescription()}
                </Text>
              </div>
              <div style={{
                padding: '12px',
                backgroundColor: '#fff4ce',
                borderRadius: '4px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}>
                <WarningRegular style={{ fontSize: '16px', color: '#8a8000', flexShrink: 0, marginTop: '2px' }} />
                <Text size={200} style={{ color: '#8a8000' }}>
                  Loading configuration will overwrite current device settings. Make sure to save current configuration before loading.
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
              onClick={handleLoad}
              disabled={loading || !selectedFile}
            >
              {loading ? 'Loading...' : 'Load'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
