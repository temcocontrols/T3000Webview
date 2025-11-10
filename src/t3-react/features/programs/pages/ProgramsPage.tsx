/**
 * ProgramsPage Component
 *
 * Display and edit BACnet programs
 */

import React, { useEffect, useState } from 'react';
import { Button, makeStyles, tokens, Textarea } from '@fluentui/react-components';
import { AddRegular, SaveRegular, PlayRegular, StopRegular } from '@fluentui/react-icons';
import { DataTable, Column, LoadingSpinner, EmptyState } from '@t3-react/components';
import { useBacnetApi, useDeviceData } from '@t3-react/hooks';
import { useBacnetStore } from '@t3-react/store';
import type { Program } from '@common/react/types/bacnet';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  toolbar: {
    padding: '16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    gap: '8px',
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  list: {
    width: '300px',
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
    overflow: 'auto',
  },
  editor: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
  },
  editorToolbar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  codeEditor: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: '14px',
  },
});

export const ProgramsPage: React.FC = () => {
  const styles = useStyles();
  const { selectedDevice } = useDeviceData();
  const { fetchPrograms } = useBacnetApi();
  const programs = useBacnetStore((state) => state.programs);
  const [loading, setLoading] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (selectedDevice) {
      loadPrograms();
    }
  }, [selectedDevice]);

  useEffect(() => {
    if (selectedProgram) {
      setCode(selectedProgram.code || '');
    }
  }, [selectedProgram]);

  const loadPrograms = async () => {
    if (!selectedDevice) return;

    setLoading(true);
    try {
      await fetchPrograms(selectedDevice.id);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedProgram) return;
    // TODO: Implement save via API
    console.log('Saving program:', { ...selectedProgram, code });
  };

  const columns: Column<Program>[] = [
    {
      key: 'index',
      label: '#',
      width: '50px',
    },
    {
      key: 'label',
      label: 'Name',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (row.status === 'running' ? '‚ñ?Running' : '‚è?Stopped'),
    },
  ];

  if (!selectedDevice) {
    return (
      <div className={styles.container}>
        <EmptyState
          title="No Device Selected"
          message="Please select a device from the tree to view programs"
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading programs..." />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Button appearance="primary" icon={<AddRegular />}>
          Add Program
        </Button>
      </div>

      <div className={styles.content}>
        <div className={styles.list}>
          {programs.length === 0 ? (
            <EmptyState
              title="No Programs"
              message="No programs found for this device"
            />
          ) : (
            <DataTable
              columns={columns}
              data={programs}
              keyField="index"
              onRowClick={(row) => setSelectedProgram(row)}
              searchable={false}
            />
          )}
        </div>

        {selectedProgram && (
          <div className={styles.editor}>
            <div className={styles.editorToolbar}>
              <h3>{selectedProgram.label}</h3>
              <div style={{ flex: 1 }} />
              <Button
                appearance="primary"
                icon={<SaveRegular />}
                onClick={handleSave}
              >
                Save
              </Button>
              <Button
                icon={selectedProgram.status === 'running' ? <StopRegular /> : <PlayRegular />}
              >
                {selectedProgram.status === 'running' ? 'Stop' : 'Run'}
              </Button>
            </div>
            <Textarea
              className={styles.codeEditor}
              value={code}
              onChange={(_, data) => setCode(data.value)}
              resize="vertical"
            />
          </div>
        )}
      </div>
    </div>
  );
};
