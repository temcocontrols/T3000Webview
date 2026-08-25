/**
 * ImportDialog — import an SVG (Inkscape) / JSON drawing file.
 * Phase 6: SVG interchange + file import.
 */
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Spinner,
} from '@fluentui/react-components';
import { ArrowUploadRegular } from '@fluentui/react-icons';
import { useDesignHubStore } from '../store/designHubStore';

const ACCEPT = '.svg,.json,.dxf';

export const ImportDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const importFile = useDesignHubStore((s) => s.importFile);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const doImport = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await importFile(file);
      reset();
      onClose();
      navigate(result.openPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(_, d) => {
        if (!d.open) {
          reset();
          onClose();
        }
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Import Drawing</DialogTitle>
          <DialogContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: '#5b6b7c', lineHeight: 1.5 }}>
                Import an <strong>SVG</strong> (including Inkscape files) or a <strong>JSON</strong> drawing.
                The file is converted into a new HVAC drawing and opened in the editor.
              </div>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setFile(f ?? null);
                  setError(null);
                }}
                style={{ fontSize: 13 }}
              />
              {file && (
                <div style={{ fontSize: 12, color: '#1c2b3a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowUploadRegular style={{ fontSize: 14 }} />
                  {file.name} ({Math.round(file.size / 1024)} KB)
                </div>
              )}
              {busy && <Spinner size="small" label="Importing…" />}
              {error && <div style={{ color: '#c50f1f', fontSize: 12 }}>{error}</div>}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button appearance="primary" onClick={doImport} disabled={!file || busy}>
              Import & Open
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
