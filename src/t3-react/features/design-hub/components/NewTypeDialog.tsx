/**
 * NewTypeDialog — register a new drawing type (pluggable type registry).
 * Phase 6: lets users add new drawing engines without touching source.
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
  Field,
  Select,
} from '@fluentui/react-components';
import type { DrawingEngine, DrawingType } from '../types';
import { DRAWING_TYPES } from '../drawingTypes';

const ENGINES: { value: DrawingEngine; label: string }[] = [
  { value: 'hvac', label: 'HVAC (SVG engine)' },
  { value: 'eez', label: 'EEZ Studio' },
  { value: 'simulator', label: 'Simulator' },
  { value: 'symbols', label: 'Symbols / Library' },
];

const ACCENTS = ['#0078d4', '#038387', '#8764b8', '#ca5010', '#498205', '#c4314b', '#3b6ea5', '#6b69d6'];

export const NewTypeDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onRegister: (type: Omit<DrawingType, 'importFormats' | 'deviceAware'> & { importFormats?: string[]; deviceAware?: boolean }) => void;
}> = ({ open, onClose, onRegister }) => {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [engine, setEngine] = useState<DrawingEngine>('hvac');
  const [openPath, setOpenPath] = useState('/t3000/hvac-designer');
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [deviceAware, setDeviceAware] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setId('');
    setName('');
    setDescription('');
    setEngine('hvac');
    setOpenPath('/t3000/hvac-designer');
    setAccent(ACCENTS[0]);
    setDeviceAware(false);
    setError(null);
  };

  const save = () => {
    const slug = id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    if (!slug || !name.trim()) {
      setError('An ID and Name are required.');
      return;
    }
    if (DRAWING_TYPES.some((t) => t.id === slug)) {
      setError(`The type id "${slug}" already exists.`);
      return;
    }
    onRegister({
      id: slug,
      name: name.trim(),
      description: description.trim(),
      engine,
      openPath: openPath.trim() || '/t3000/hvac-designer',
      accent,
      icon: engine === 'eez' ? 'DocumentText' : engine === 'simulator' ? 'DeveloperBoard' : 'Flow',
      template: { width: 1600, height: 1000, backgroundColor: '#ffffff' },
      importFormats: ['svg', 'json'],
      deviceAware,
    });
    reset();
    onClose();
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
          <DialogTitle>Register a New Drawing Type</DialogTitle>
          <DialogContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Type ID (slug)" required>
                <Input value={id} onChange={(_, d) => setId(d.value)} placeholder="e.g. cad-floorplan" />
              </Field>
              <Field label="Name" required>
                <Input value={name} onChange={(_, d) => setName(d.value)} placeholder="e.g. CAD Floor Plan" />
              </Field>
              <Field label="Description">
                <Input value={description} onChange={(_, d) => setDescription(d.value)} placeholder="What this engine does" />
              </Field>
              <Field label="Engine">
                <Select value={engine} onChange={(_, d) => setEngine(d.value as DrawingEngine)}>
                  {ENGINES.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Open path">
                <Input value={openPath} onChange={(_, d) => setOpenPath(d.value)} placeholder="/t3000/hvac-designer" />
              </Field>
              <Field label="Accent color">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAccent(c)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: accent === c ? '3px solid #1c2b3a' : '2px solid transparent',
                        background: c,
                        cursor: 'pointer',
                      }}
                      aria-label={`Accent ${c}`}
                    />
                  ))}
                </div>
              </Field>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={deviceAware} onChange={(e) => setDeviceAware(e.target.checked)} />
                Device-aware (can be bound to a device)
              </label>
              {error && <div style={{ color: '#c50f1f', fontSize: 12 }}>{error}</div>}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button appearance="primary" onClick={save}>Register Type</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
