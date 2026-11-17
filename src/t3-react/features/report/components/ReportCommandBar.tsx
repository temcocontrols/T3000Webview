/**
 * The report page's own top bar.
 *
 * This page deliberately has none of the application menus (File / Tools / View / …): the only
 * things you can do here are the ones below, so they sit in the bar itself. Labels collapse to
 * icons on narrow windows.
 */

import React from 'react';
import { Badge, Button, Tooltip } from '@fluentui/react-components';
import {
  CameraRegular,
  CopyRegular,
  DesktopRegular,
  DismissRegular,
  DocumentTextRegular,
  EditRegular,
  ErrorCircleRegular,
  GlobeRegular,
  InfoRegular,
} from '@fluentui/react-icons';

import { useReportCommands } from '../services/reportCommands';
import styles from './ReportCommandBar.module.css';

type CommandName = 'capture' | 'copyShot' | 'check' | 'draft' | 'clearShots' | 'toggleDetails';

export const ReportCommandBar: React.FC = () => {
  const { state, handlers } = useReportCommands();

  const run = (command: CommandName) => {
    handlers.current?.[command]();
  };

  return (
    <div className={styles.bar}>
      <div className={styles.title}>
        <ErrorCircleRegular className={styles.titleIcon} />
        <span className={styles.titleText}>Report an Issue</span>
      </div>

      <div className={styles.separator} />

      <div className={styles.commands}>
        <Button
          appearance="subtle"
          size="small"
          icon={<CameraRegular />}
          onClick={() => run('capture')}
          disabled={state.busy}
          title="Capture the T3000 window as a PNG"
        >
          <span className={styles.label}>Capture</span>
        </Button>

        <Button
          appearance="subtle"
          size="small"
          icon={<CopyRegular />}
          onClick={() => run('copyShot')}
          disabled={!state.hasScreenshots}
          title="Copy the captured screenshot so you can paste it into the issue"
        >
          <span className={styles.label}>Copy shot</span>
        </Button>

        <div className={styles.separator} />

        <Button
          appearance="subtle"
          size="small"
          icon={<DocumentTextRegular />}
          onClick={() => run('check')}
          disabled={state.busy}
          title="Check the documentation and the built-in rules before filing"
        >
          <span className={styles.label}>Check first</span>
        </Button>

        <Button
          appearance="subtle"
          size="small"
          icon={<EditRegular />}
          onClick={() => run('draft')}
          disabled={!state.canDraft || state.busy}
          title="Ask the local AI to draft the issue from what you wrote"
        >
          <span className={styles.label}>Draft with AI</span>
        </Button>

        <div className={styles.separator} />

        <Button
          appearance="subtle"
          size="small"
          icon={<DismissRegular />}
          onClick={() => run('clearShots')}
          disabled={!state.hasScreenshots}
          title="Remove every screenshot from this report"
        >
          <span className={styles.label}>Clear</span>
        </Button>
      </div>

      <div className={styles.right}>
        <Tooltip
          content={state.detailsOpen ? 'Hide the details panel' : 'Show the details panel'}
          relationship="label"
        >
          <Button
            appearance={state.detailsOpen ? 'outline' : 'subtle'}
            size="small"
            icon={<InfoRegular />}
            onClick={() => run('toggleDetails')}
            aria-label="Toggle the details panel"
          />
        </Tooltip>
        <Tooltip
          content={
            state.insideT3000
              ? 'Running inside the T3000 application — screen capture, the runtime log and the device details are available.'
              : 'Opened in a browser. Screen capture and the runtime log are read from the T3000 application, so they are unavailable here; everything you type still works.'
          }
          relationship="description"
        >
          <Badge
            className={styles.hostBadge}
            appearance="tint"
            color={state.insideT3000 ? 'success' : 'informative'}
            icon={state.insideT3000 ? <DesktopRegular /> : <GlobeRegular />}
          >
            {state.insideT3000 ? 'Inside T3000' : 'Browser preview'}
          </Badge>
        </Tooltip>
      </div>
    </div>
  );
};

export default ReportCommandBar;
