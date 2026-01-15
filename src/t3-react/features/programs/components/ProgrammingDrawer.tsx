/**
 * Programming Drawer Component
 *
 * Matches C++ BacnetProgramEdit window layout (BacnetProgramEdit.cpp)
 * - Code editor area (RichEdit control) - Using Monaco Editor
 * - Information/console window
 * - Memory statistics panel
 * - Action buttons (Send, Clear, Load, Save, Refresh, Help)
 *
 * C++ Reference: T3000-Source/T3000/BacnetProgramEdit.cpp
 * Dialog: IDD_DIALOG_BACNET_PROGRAM_EDIT
 */

import React, { useState } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Button,
  Text,
} from '@fluentui/react-components';
import {
  Dismiss24Regular,
  SaveRegular,
  FolderOpenRegular,
  ArrowClockwiseRegular,
  SendRegular,
  DeleteRegular,
  QuestionCircleRegular,
} from '@fluentui/react-icons';
import Editor from '@monaco-editor/react';

interface ProgramPoint {
  serialNumber: number;
  programId?: string;
  switchNode?: string;
  programLabel?: string;
  programList?: string;
  programSize?: string;
  programPointer?: string;
  programStatus?: string;
  autoManual?: string;
}

interface ProgrammingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProgram: ProgramPoint | null;
}

export const ProgrammingDrawer: React.FC<ProgrammingDrawerProps> = ({
  open,
  onOpenChange,
  selectedProgram,
}) => {
  const [programCode, setProgramCode] = useState('10 SET = TEMP\n20 REM IF CNT < 10 THEN CNT = CNT + 1 ELSE CNT = 0\n30 V3 = FFFFF\n');
  const [consoleOutput, setConsoleOutput] = useState('Ready. Use buttons above to compile, save, or load program code.');

  const handleSend = () => {
    setConsoleOutput('Compiling program...\nSending to device...');
    // TODO: Implement send to device functionality
  };

  const handleClear = () => {
    setProgramCode('');
    setConsoleOutput('Editor cleared.');
  };

  const handleLoad = () => {
    // TODO: Implement file load functionality
    setConsoleOutput('Load file functionality will be implemented.');
  };

  const handleSave = () => {
    // TODO: Implement file save functionality
    setConsoleOutput('Save file functionality will be implemented.');
  };

  const handleRefresh = () => {
    // TODO: Implement refresh from device functionality
    setConsoleOutput('Refreshing program from device...');
  };

  const handleHelp = () => {
    // TODO: Show programming help
    setConsoleOutput('Programming Help:\n- Use F2 to send\n- Use F3 to clear\n- Use F6 to save\n- Use F7 to load\n- Use F8 to refresh');
  };

  const programSize = selectedProgram?.programSize ? parseInt(selectedProgram.programSize) : 0;
  const poolSize = 2000;
  const freeMemory = poolSize - programSize;

  return (
    <Drawer
      type="overlay"
      separator
      open={open}
      onOpenChange={(_, { open }) => onOpenChange(open)}
      position="end"
      style={{ width: '700px' }}
    >
      <DrawerHeader style={{ minHeight: '40px', padding: '8px 16px' }}>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={() => onOpenChange(false)}
            />
          }
        >
          <Text size={300} weight="semibold">
            Bacnet Program IDE - Program {selectedProgram?.programId || ''}
          </Text>
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {selectedProgram && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px', padding: '8px' }}>
            {/* Toolbar with action buttons */}
            <div style={{ display: 'flex', gap: '8px', padding: '8px', borderBottom: '1px solid #e1dfdd' }}>
              <Button
                appearance="primary"
                icon={<SendRegular style={{ fontSize: '16px' }} />}
                size="small"
                title="Send (F2) - Compile and send to device"
                onClick={handleSend}
              >
                Send (F2)
              </Button>
              <Button
                appearance="secondary"
                icon={<DeleteRegular style={{ fontSize: '16px' }} />}
                size="small"
                title="Clear (F3) - Clear the editor"
                onClick={handleClear}
              >
                Clear (F3)
              </Button>
              <Button
                appearance="secondary"
                icon={<FolderOpenRegular style={{ fontSize: '16px' }} />}
                size="small"
                title="Load File (F7) - Load from file"
                onClick={handleLoad}
              >
                Load (F7)
              </Button>
              <Button
                appearance="secondary"
                icon={<SaveRegular style={{ fontSize: '16px' }} />}
                size="small"
                title="Save File (F6) - Save to file"
                onClick={handleSave}
              >
                Save (F6)
              </Button>
              <Button
                appearance="secondary"
                icon={<ArrowClockwiseRegular style={{ fontSize: '16px' }} />}
                size="small"
                title="Refresh (F8) - Refresh from device"
                onClick={handleRefresh}
              >
                Refresh (F8)
              </Button>
              <div style={{ flex: 1 }} />
              <Button
                appearance="secondary"
                icon={<QuestionCircleRegular style={{ fontSize: '16px' }} />}
                size="small"
                title="Help - Programming help"
                onClick={handleHelp}
              >
                Help
              </Button>
            </div>

            {/* Code Editor Area */}
            <div style={{ flex: '1 1 60%', minHeight: '300px', display: 'flex', flexDirection: 'column', border: '1px solid #d1d1d1', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#f8f8f8' }}>
              <Editor
                height="100%"
                defaultLanguage="vb"
                value={programCode}
                onChange={(value) => setProgramCode(value || '')}
                theme="vs"
                options={{
                  minimap: { enabled: false },
                  fontSize: 11,
                  lineHeight: 18,
                  fontFamily: 'Consolas, "Courier New", monospace',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  wrappingIndent: 'same',
                  lineNumbers: 'on',
                  glyphMargin: false,
                  folding: false,
                  lineDecorationsWidth: 10,
                  lineNumbersMinChars: 3,
                  renderLineHighlight: 'all',
                  scrollbar: {
                    vertical: 'visible',
                    horizontal: 'hidden',
                    verticalScrollbarSize: 6,
                    horizontalScrollbarSize: 6,
                  },
                }}
              />
            </div>

            {/* Bottom Section: Information Window + Statistics */}
            <div style={{ flex: '0 0 auto', display: 'flex', gap: '8px', minHeight: '150px' }}>
              {/* Information/Console Window */}
              <div style={{ flex: '1 1 60%', display: 'flex', flexDirection: 'column' }}>
                <Text size={200} weight="semibold" style={{ marginBottom: '4px' }}>
                  Information Window
                </Text>
                <div
                  style={{
                    flex: 1,
                    border: '1px solid #d1d1d1',
                    borderRadius: '4px',
                    padding: '8px',
                    backgroundColor: '#fafafa',
                    fontFamily: 'Consolas, "Courier New", monospace',
                    fontSize: '12px',
                    overflowY: 'auto',
                    minHeight: '120px',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <Text size={100} style={{ color: '#605e5c' }}>
                    {consoleOutput}
                  </Text>
                </div>
              </div>

              {/* Statistics Panel */}
              <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column' }}>
                <Text size={200} weight="semibold" style={{ marginBottom: '4px' }}>
                  Memory Statistics
                </Text>
                <div
                  style={{
                    flex: 1,
                    border: '1px solid #d1d1d1',
                    borderRadius: '4px',
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text size={200}>Programs pool size:</Text>
                    <Text size={200} weight="semibold" style={{ color: '#d13438' }}>
                      {poolSize}
                    </Text>
                  </div>
                  <div style={{ height: '1px', backgroundColor: '#e1dfdd' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text size={200}>Programs size:</Text>
                    <Text size={200} weight="semibold" style={{ color: '#d13438' }}>
                      {programSize}
                    </Text>
                  </div>
                  <div style={{ height: '1px', backgroundColor: '#e1dfdd' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text size={200}>Free memory:</Text>
                    <Text size={200} weight="semibold" style={{ color: '#d13438' }}>
                      {freeMemory}
                    </Text>
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                    <Text size={100} style={{ color: '#605e5c' }}>Bytes</Text>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DrawerBody>
    </Drawer>
  );
};
