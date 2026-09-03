/**
 * EezExampleCreateDialog — Configure a new LVGL project from a ready-made
 * example.
 *
 * Clicking "Use this example" in the EEZ Examples drawer opens this dialog to
 * collect the project settings (name / location / create directory — the same
 * fields as the LVGL "Create New" dialog), then hands off to the EEZ examples
 * wizard by navigating to:
 *   /t3000/eez?examples=1&type=…&name=…&location=…&createDirectory=…
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
} from '@fluentui/react-components';
import { InfoRegular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { designHubService } from '../services/designHubService';
import { HubIcon } from '../icons';
import type { ExampleItem } from './EezExamplesDrawer';
import styles from '../pages/DesignHubPage.module.css';

function typeLabel(t: string): string {
  if (t === 'LVGL with EEZ Flow') return 'LVGL + Flow 9.5';
  if (t === 'LVGL') return 'LVGL 9.5';
  return t;
}

// Turn an example name (may contain spaces/parens) into a valid project name
// matching the EEZ wizard's rule: /^[a-zA-Z_\-][a-zA-Z_\-0-9]*$/.
function sanitizeProjectName(raw: string): string {
  const cleaned = raw
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return /^[a-zA-Z_]/.test(cleaned) ? cleaned : `LVGL-${cleaned}`;
}

export const EezExampleCreateDialog: React.FC<{
  example: ExampleItem | null;
  onClose: () => void;
}> = ({ example, onClose }) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('project');
  const [createDirectory, setCreateDirectory] = useState(true);

  // Reset fields whenever a (different) example is opened.
  useEffect(() => {
    if (example) {
      setName(sanitizeProjectName(example.name) || 'LVGL-Example');
      setLocation('project');
      setCreateDirectory(true);
    }
  }, [example]);

  // ── Computed path (mirrors the LVGL "Create New" dialog / EEZ wizard) ──
  const projectFolderPath = useMemo(() => {
    const loc = location.trim();
    const nm = name.trim();
    if (!loc || !nm) return '';
    const trimmed = loc.endsWith('/') || loc.endsWith('\\') ? loc.slice(0, -1) : loc;
    return createDirectory ? `${trimmed}/${nm}` : trimmed;
  }, [location, name, createDirectory]);

  const projectFilePath = useMemo(() => {
    if (!projectFolderPath || !name.trim()) return '';
    return `${projectFolderPath}/${name.trim()}.eez-project`;
  }, [projectFolderPath, name]);

  if (!example) return null;

  const canCreate = !!name.trim() && !!location.trim();
  const isFlow = example.type === 'LVGL with EEZ Flow';

  const handleCreate = () => {
    if (!canCreate) return;
    const params = new URLSearchParams();
    // Create a project FROM the selected ready-made example (downloads its
    // content), then open it directly in the editor. EezStudioApp auto-creates
    // whenever name+location are present — no extra mode params needed.
    params.set('examples', '1');
    params.set('type', example.id);
    params.set('name', name.trim());
    params.set('location', location.trim());
    params.set('createDirectory', createDirectory ? 'true' : 'false');

    designHubService.recordActivity('created', `Started "${name.trim()}"`, {
      detail: `Example · ${example.name} · ${projectFilePath || location.trim()}`,
    });

    const target = `/t3000/eez?${params.toString()}`;
    // Close the dialog FIRST, then navigate on the next tick so the popup
    // can't survive the redirect.
    onClose();
    window.setTimeout(() => {
      try {
        navigate(target);
      } catch (err) {
        console.error('[EezExampleCreateDialog] navigate failed:', err, target);
      }
    }, 0);
  };

  return (
    <Dialog
      open
      onOpenChange={(_, d) => {
        if (!d.open) onClose();
      }}
    >
      <DialogSurface style={{ maxWidth: 560, width: 520 }}>
        <DialogBody>
          <DialogTitle>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
              <span style={{ display: 'flex', color: '#48627a' }}>
                <HubIcon icon={isFlow ? 'Toolbox' : 'DocumentText'} size={18} />
              </span>
              New LVGL Project from Example
            </span>
          </DialogTitle>
          <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className={styles.dialogInfoBar}>
              <InfoRegular style={{ fontSize: 14, flexShrink: 0 }} />
              <span>
                Create a new <b>LVGL 9.5</b> project from this example, then open
                it in the EEZ editor.
              </span>
            </div>

            {/* Selected example summary */}
            <div className={styles.examplesCard} style={{ cursor: 'default' }}>
              <div className={styles.examplesThumb}>
                {example.image ? (
                  <img src={example.image} alt="" className={styles.examplesThumbImg} />
                ) : (
                  <span className={styles.examplesThumbPh}>
                    <HubIcon icon="DocumentText" size={26} />
                  </span>
                )}
              </div>
              <div className={styles.examplesBody}>
                <div className={styles.examplesName}>{example.name}</div>
                <div className={styles.examplesDesc}>{example.description}</div>
                <div className={styles.examplesMeta}>
                  <span
                    className={`${styles.examplesBadge} ${
                      isFlow ? styles.examplesBadgeFlow : styles.examplesBadgeLvgl
                    }`}
                  >
                    {typeLabel(example.type)}
                  </span>
                  {example.width && example.height && (
                    <span className={styles.examplesBadgeSize}>
                      {example.width}×{example.height}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Field label={<span style={{ fontSize: 12, fontWeight: 600 }}>Name</span>} required>
              <Input
                size="medium"
                value={name}
                onChange={(_, d) => setName(d.value)}
                placeholder="LVGL-Example"
                style={{ fontSize: 13 }}
              />
            </Field>

            <Field
              label={<span style={{ fontSize: 12, fontWeight: 600 }}>Location</span>}
              required
              hint={<span style={{ fontSize: 11 }}>Folder inside the project data root</span>}
            >
              <Input
                size="medium"
                value={location}
                onChange={(_, d) => setLocation(d.value)}
                placeholder="project"
                style={{ fontSize: 13 }}
              />
            </Field>

            <div className={styles.createDirRow}>
              <Checkbox
                size="medium"
                checked={createDirectory}
                onChange={(_, d) => setCreateDirectory(!!d.checked)}
                label={<span style={{ fontSize: 12.5 }}>Create directory</span>}
              />
              <span className={styles.createDirHint}>
                Wrap the project in a folder named after it
              </span>
            </div>

            <Field label={<span style={{ fontSize: 12, fontWeight: 600 }}>Project file path</span>}>
              <div className={styles.pathPreview}>
                {projectFilePath || <span style={{ color: '#a5afbf' }}>—</span>}
              </div>
            </Field>
          </DialogContent>
          <DialogActions>
            <Button
              size="medium"
              appearance="secondary"
              onClick={onClose}
              style={{ fontWeight: 400, fontSize: 13 }}
            >
              Cancel
            </Button>
            <Button
              size="medium"
              appearance="primary"
              disabled={!canCreate}
              onClick={handleCreate}
              style={{ fontWeight: 400, fontSize: 13 }}
            >
              Create &amp; Open
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default EezExampleCreateDialog;
