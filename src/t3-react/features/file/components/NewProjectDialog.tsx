/**
 * New Project Dialog
 *
 * Based on C++ CBacnetMessageInput dialog used in OnFileNewproject()
 * C++ Reference: MainFrm.cpp Line 15972-15997
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Input,
  Label,
  Text,
} from '@fluentui/react-components';
import { FolderAdd24Regular } from '@fluentui/react-icons';
import { createNewProject } from '../services/fileOperations';

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (projectName: string) => void;
}

export const NewProjectDialog: React.FC<NewProjectDialogProps> = ({
  open,
  onOpenChange,
  onProjectCreated,
}) => {
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setError('');

    const trimmedName = projectName.trim();
    if (!trimmedName) {
      setError('Project name cannot be empty');
      return;
    }

    setLoading(true);
    const result = await createNewProject(trimmedName);
    setLoading(false);

    if (result.success) {
      onProjectCreated?.(trimmedName);
      setProjectName('');
      onOpenChange(false);
    } else {
      setError(result.message);
    }
  };

  const handleCancel = () => {
    setProjectName('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            <FolderAdd24Regular style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            New Project
          </DialogTitle>
          <DialogContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name..."
                  style={{ width: '100%' }}
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreate();
                    }
                  }}
                />
              </div>
              {error && (
                <Text size={200} style={{ color: '#d13438' }}>
                  {error}
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
              onClick={handleCreate}
              disabled={loading || !projectName.trim()}
            >
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
