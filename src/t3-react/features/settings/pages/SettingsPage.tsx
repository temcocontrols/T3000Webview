/**
 * SettingsPage Component
 *
 * Application and device settings
 */

import React, { useState } from 'react';
import {
  Button,
  Input,
  Field,
  Switch,
  Dropdown,
  Option,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { SaveRegular, SettingsRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    padding: '16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  content: {
    flex: 1,
    padding: '24px',
    overflow: 'auto',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: '16px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '24px',
  },
});

export const SettingsPage: React.FC = () => {
  const styles = useStyles();

  const [settings, setSettings] = useState({
    apiUrl: 'http://localhost:3000/api',
    autoRefresh: true,
    refreshInterval: 5000,
    theme: 'light',
    language: 'en',
    notifications: true,
  });

  const handleSave = async () => {
    try {
      // TODO: Save settings via API
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log('Settings saved successfully');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <SettingsRegular />
        <h2>Settings</h2>
      </div>

      <div className={styles.content}>
        {/* General Settings */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>General</div>
          <div className={styles.formGrid}>
            <Field label="API URL">
              <Input
                value={settings.apiUrl}
                onChange={(_, data) => handleChange('apiUrl', data.value)}
              />
            </Field>

            <Field label="Language">
              <Dropdown
                value={settings.language}
                onOptionSelect={(_, data) => handleChange('language', data.optionValue)}
              >
                <Option value="en">English</Option>
                <Option value="zh">Chinese</Option>
                <Option value="es">Spanish</Option>
              </Dropdown>
            </Field>
          </div>
        </div>

        {/* Appearance */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Appearance</div>
          <Field label="Theme">
            <Dropdown
              value={settings.theme}
              onOptionSelect={(_, data) => handleChange('theme', data.optionValue)}
            >
              <Option value="light">Light</Option>
              <Option value="dark">Dark</Option>
              <Option value="auto">Auto</Option>
            </Dropdown>
          </Field>
        </div>

        {/* Data Refresh */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Data Refresh</div>
          <Field label="Auto Refresh">
            <Switch
              checked={settings.autoRefresh}
              onChange={(_, data) => handleChange('autoRefresh', data.checked)}
            />
          </Field>

          {settings.autoRefresh && (
            <Field label="Refresh Interval (ms)">
              <Input
                type="number"
                value={String(settings.refreshInterval)}
                onChange={(_, data) =>
                  handleChange('refreshInterval', Number(data.value))
                }
              />
            </Field>
          )}
        </div>

        {/* Notifications */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Notifications</div>
          <Field label="Enable Notifications">
            <Switch
              checked={settings.notifications}
              onChange={(_, data) => handleChange('notifications', data.checked)}
            />
          </Field>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button appearance="primary" icon={<SaveRegular />} onClick={handleSave}>
            Save Settings
          </Button>
          <Button appearance="secondary">Reset to Defaults</Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
