/**
 * SettingsPage Component
 *
 * Device Settings with Tabbed Interface matching C++ T3000 layout
 * Tabs: Basic Information | Communication | Time | Dyndns | Email | User Login | Expansion IO
 *
 * Database Tables:
 * - NETWORK_SETTINGS: IP, subnet, gateway, MAC address
 * - COMMUNICATION_SETTINGS: COM port configs, baudrates, parity, stop bits
 * - PROTOCOL_SETTINGS: Modbus, BACnet, MSTP configuration
 * - TIME_SETTINGS: Time zone, SNTP, DST settings
 * - DYNDNS_SETTINGS: Dynamic DNS configuration
 * - HARDWARE_INFO: Hardware revision, firmware versions
 * - FEATURE_FLAGS: Feature enable/disable flags
 * - EMAIL_ALARMS: Email notification settings
 * - EXTIO_DEVICES: External I/O expansion modules
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tab,
  TabList,
  Button,
  Input,
  Field,
  Switch,
  Dropdown,
  Option,
  Text,
  Spinner,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  makeStyles,
  tokens,
  SelectTabData,
  SelectTabEvent,
} from '@fluentui/react-components';
import {
  SaveRegular,
  SettingsRegular,
  ArrowSyncRegular,
  ErrorCircleRegular,
  InfoRegular,
  ArrowResetRegular,
  PowerRegular,
  WarningRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import cssStyles from './SettingsPage.module.css';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    padding: '4px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
  },
  tabContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tabList: {
    padding: '0',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    fontSize: '5px',
    '& button': {
      fontSize: '5px',
    },
    '& .fui-Tab': {
      fontSize: '5px',
    },
  },
  tabContent: {
    flex: 1,
    padding: '8px 0 8px 12px',
    overflow: 'auto',
    backgroundColor: tokens.colorNeutralBackground1,
    scrollbarWidth: 'thin',
    scrollbarColor: '#c1c1c1 #f5f5f5',
    '&::-webkit-scrollbar': {
      width: '6px',
      height: '6px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: '#f5f5f5',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: '#c1c1c1',
      borderRadius: '3px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: '#a1a1a1',
    },
  },
  section: {
    marginBottom: '24px',
    fontSize: '12px',
    '& label': {
      fontSize: '12px',
    },
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: '12px',
    paddingLeft: '8px',
    borderLeft: `3px solid ${tokens.colorBrandForeground1}`,
    color: tokens.colorNeutralForeground1,
    lineHeight: '1',
    display: 'flex',
    alignItems: 'center',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    fontSize: '12px',
    '& label': {
      fontSize: '12px',
    },
    '& input': {
      fontSize: '12px',
    },
    '& select': {
      fontSize: '12px',
    },
    '& button[role="combobox"]': {
      fontSize: '12px',
    },
    '& [role="option"]': {
      fontSize: '12px',
    },
    '& .fui-Option': {
      fontSize: '12px',
    },
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  },
  errorMessage: {
    marginBottom: '12px',
    padding: '8px 12px',
    backgroundColor: '#fef6f6',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
  },
  successMessage: {
    marginBottom: '12px',
    padding: '8px 12px',
    backgroundColor: '#f0f9ff',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
  },
  infoMessage: {
    marginBottom: '12px',
    padding: '8px 12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
  },
  saveButton: {
    border: 'none !important',
    outline: 'none',
    fontSize: '12px',
    fontWeight: 'normal',
    color: '#ffffff',
    backgroundColor: tokens.colorBrandForeground1,
    ':hover': {
      backgroundColor: tokens.colorBrandForeground2,
      border: 'none !important',
    },
    ':active': {
      border: 'none !important',
    },
    ':focus': {
      border: 'none !important',
    },
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    gap: '12px',
  },
  noDevice: {
    textAlign: 'center',
    padding: '48px',
  },
  tab: {
    fontSize: '10px',
    padding: '8px 12px',
  },
});

type TabValue = 'basic' | 'communication' | 'time' | 'dyndns' | 'email' | 'users' | 'expansion';

interface NetworkSettings {
  IP_Address?: string;
  Subnet?: string;
  Gateway?: string;
  MAC_Address?: string;
  TCP_Type?: number; // 0=DHCP, 1=Static
}

interface CommunicationSettings {
  COM0_Config?: number;
  COM1_Config?: number;
  COM2_Config?: number;
  COM_Baudrate0?: number;
  COM_Baudrate1?: number;
  COM_Baudrate2?: number;
  UART_Parity0?: number;
  UART_Parity1?: number;
  UART_Parity2?: number;
  UART_Stopbit0?: number;
  UART_Stopbit1?: number;
  UART_Stopbit2?: number;
  Fix_COM_Config?: number;
}

interface ProtocolSettings {
  Modbus_ID?: number;
  Modbus_Port?: number;
  MSTP_ID?: number;
  MSTP_Network_Number?: number;
  Max_Master?: number;
  Object_Instance?: number;
  BBMD_Enable?: number;
  Network_Number?: number;
}

interface TimeSettings {
  Time_Zone?: number;
  Time_Zone_Summer_Daytime?: number;
  Enable_SNTP?: number;
  SNTP_Server?: string;
  Time_Sync_Auto_Manual?: number;
  Start_Month?: number;
  Start_Day?: number;
  End_Month?: number;
  End_Day?: number;
}

interface DyndnsSettings {
  Enable_DynDNS?: number;
  DynDNS_Provider?: number;
  DynDNS_User?: string;
  DynDNS_Pass?: string;
  DynDNS_Domain?: string;
  DynDNS_Update_Time?: number;
}

interface HardwareInfo {
  Hardware_Rev?: number;
  Firmware0_Rev_Main?: number;
  Firmware0_Rev_Sub?: number;
  Panel_Type?: number;
  USB_Mode?: number;
}

interface FeatureFlags {
  User_Name_Enable?: number;
  Customer_Unite_Enable?: number;
  Enable_Panel_Name?: number;
  LCD_Display?: number;
}

export const SettingsPage: React.FC = () => {
  const styles = useStyles();
  const { selectedDevice, devices, selectDevice } = useDeviceTreeStore();

  const [selectedTab, setSelectedTab] = useState<TabValue>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showRebootDialog, setShowRebootDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [rebootCountdown, setRebootCountdown] = useState(0);

  // Settings state for each tab
  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>({});
  const [commSettings, setCommSettings] = useState<CommunicationSettings>({});
  const [protocolSettings, setProtocolSettings] = useState<ProtocolSettings>({});
  const [timeSettings, setTimeSettings] = useState<TimeSettings>({});
  const [dyndnsSettings, setDyndnsSettings] = useState<DyndnsSettings>({});
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo>({});
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({});

  // Auto-select first device if none is selected
  useEffect(() => {
    if (!selectedDevice && devices.length > 0) {
      selectDevice(devices[0]);
    }
  }, [selectedDevice, devices, selectDevice]);

  // Fetch settings based on selected tab
  const fetchSettings = useCallback(async () => {
    if (!selectedDevice) return;

    setLoading(true);
    setError(null);

    try {
      const serial = selectedDevice.serialNumber;

      switch (selectedTab) {
        case 'basic':
          // Fetch protocol settings and hardware info
          const [protocolRes, hardwareRes, featuresRes] = await Promise.all([
            fetch(`/api/v1/devices/${serial}/settings/protocol`),
            fetch(`/api/v1/devices/${serial}/settings/hardware`),
            fetch(`/api/v1/devices/${serial}/settings/features`),
          ]);
          if (protocolRes.ok) setProtocolSettings(await protocolRes.json());
          if (hardwareRes.ok) setHardwareInfo(await hardwareRes.json());
          if (featuresRes.ok) setFeatureFlags(await featuresRes.json());
          break;

        case 'communication':
          // Fetch network and communication settings
          const [networkRes, commRes] = await Promise.all([
            fetch(`/api/v1/devices/${serial}/settings/network`),
            fetch(`/api/v1/devices/${serial}/settings/communication`),
          ]);
          if (networkRes.ok) setNetworkSettings(await networkRes.json());
          if (commRes.ok) setCommSettings(await commRes.json());
          break;

        case 'time':
          const timeRes = await fetch(`/api/v1/devices/${serial}/settings/time`);
          if (timeRes.ok) setTimeSettings(await timeRes.json());
          break;

        case 'dyndns':
          const dyndnsRes = await fetch(`/api/v1/devices/${serial}/settings/dyndns`);
          if (dyndnsRes.ok) setDyndnsSettings(await dyndnsRes.json());
          break;

        case 'email':
          // Email settings will be handled separately (EMAIL_ALARMS table)
          break;

        case 'users':
          // Users are managed in separate UsersPage
          break;

        case 'expansion':
          // Expansion IO devices will be handled separately (EXTIO_DEVICES table)
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, selectedTab]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value as TabValue);
    setError(null);
    setSuccessMessage(null);
  };

  const handleRefresh = () => {
    fetchSettings();
  };

  const handleSaveNetwork = async () => {
    if (!selectedDevice) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/v1/devices/${selectedDevice.serialNumber}/settings/network`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(networkSettings),
        }
      );

      if (!response.ok) throw new Error('Failed to save network settings');
      setSuccessMessage('Network settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCommunication = async () => {
    if (!selectedDevice) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/v1/devices/${selectedDevice.serialNumber}/settings/communication`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commSettings),
        }
      );

      if (!response.ok) throw new Error('Failed to save communication settings');
      setSuccessMessage('Communication settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTime = async () => {
    if (!selectedDevice) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/v1/devices/${selectedDevice.serialNumber}/settings/time`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(timeSettings),
        }
      );

      if (!response.ok) throw new Error('Failed to save time settings');
      setSuccessMessage('Time settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDyndns = async () => {
    if (!selectedDevice) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/v1/devices/${selectedDevice.serialNumber}/settings/dyndns`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dyndnsSettings),
        }
      );

      if (!response.ok) throw new Error('Failed to save DynDNS settings');
      setSuccessMessage('DynDNS settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleRebootDevice = async () => {
    if (!selectedDevice) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setShowRebootDialog(false);

    try {
      // Start countdown
      setRebootCountdown(30);
      const countdownInterval = setInterval(() => {
        setRebootCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const response = await fetch(
        `/api/v1/devices/${selectedDevice.serialNumber}/reboot`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) throw new Error('Failed to reboot device');
      setSuccessMessage('Device reboot command sent successfully. Device will restart in 30 seconds...');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reboot device');
      setRebootCountdown(0);
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!selectedDevice) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setShowResetDialog(false);

    try {
      const response = await fetch(
        `/api/v1/devices/${selectedDevice.serialNumber}/reset-defaults`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) throw new Error('Failed to reset device to defaults');
      setSuccessMessage('Device reset to factory defaults successfully. Please refresh to see changes.');

      // Refresh settings after a short delay
      setTimeout(() => {
        fetchSettings();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset device');
    } finally {
      setLoading(false);
    }
  };

  // IP address validation
  const validateIPAddress = (ip: string): boolean => {
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  // Validate network settings before saving
  const validateNetworkSettings = (): string | null => {
    if (networkSettings.IP_Address && !validateIPAddress(networkSettings.IP_Address)) {
      return 'Invalid IP Address format';
    }
    if (networkSettings.Subnet && !validateIPAddress(networkSettings.Subnet)) {
      return 'Invalid Subnet Mask format';
    }
    if (networkSettings.Gateway && !validateIPAddress(networkSettings.Gateway)) {
      return 'Invalid Gateway format';
    }
    return null;
  };

  // Enhanced network save with validation
  const handleSaveNetworkValidated = async () => {
    const validationError = validateNetworkSettings();
    if (validationError) {
      setError(validationError);
      return;
    }
    await handleSaveNetwork();
  };

  // Render tab content based on selected tab
  const renderTabContent = () => {
    if (!selectedDevice) {
      return (
        <div className={styles.noDevice}>
          <Text size={500} weight="semibold">No device selected</Text>
          <br />
          <Text size={300}>Please select a device from the tree to view settings</Text>
        </div>
      );
    }

    if (loading && Object.keys(networkSettings).length === 0) {
      return (
        <div className={styles.loadingContainer}>
          <Spinner size="small" />
          <Text>Loading settings...</Text>
        </div>
      );
    }

    switch (selectedTab) {
      case 'basic':
        return (
          <>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Protocol Configuration</div>
              <div className={styles.formGrid}>
                <Field label="Object Instance">
                  <Input
                    type="number"
                    value={String(protocolSettings.Object_Instance ?? '')}
                    onChange={(_, data) =>
                      setProtocolSettings({ ...protocolSettings, Object_Instance: Number(data.value) })
                    }
                  />
                </Field>
                <Field label="Modbus ID">
                  <Input
                    type="number"
                    value={String(protocolSettings.Modbus_ID ?? '')}
                    onChange={(_, data) =>
                      setProtocolSettings({ ...protocolSettings, Modbus_ID: Number(data.value) })
                    }
                  />
                </Field>
                <Field label="MSTP ID">
                  <Input
                    type="number"
                    value={String(protocolSettings.MSTP_ID ?? '')}
                    onChange={(_, data) =>
                      setProtocolSettings({ ...protocolSettings, MSTP_ID: Number(data.value) })
                    }
                  />
                </Field>
                <Field label="Max Master">
                  <Input
                    type="number"
                    value={String(protocolSettings.Max_Master ?? '')}
                    onChange={(_, data) =>
                      setProtocolSettings({ ...protocolSettings, Max_Master: Number(data.value) })
                    }
                  />
                </Field>
                <Field label="MSTP Network Number">
                  <Input
                    type="number"
                    value={String(protocolSettings.MSTP_Network_Number ?? '')}
                    onChange={(_, data) =>
                      setProtocolSettings({ ...protocolSettings, MSTP_Network_Number: Number(data.value) })
                    }
                  />
                </Field>
                <Field label="BACnet IP Network">
                  <Input
                    type="number"
                    value={String(protocolSettings.Network_Number ?? '')}
                    onChange={(_, data) =>
                      setProtocolSettings({ ...protocolSettings, Network_Number: Number(data.value) })
                    }
                  />
                </Field>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>Hardware Information</div>
              <div className={styles.formGrid}>
                <Field label="Hardware Revision">
                  <Input value={String(hardwareInfo.Hardware_Rev ?? 'N/A')} disabled />
                </Field>
                <Field label="Firmware Version">
                  <Input
                    value={`${hardwareInfo.Firmware0_Rev_Main ?? 0}.${hardwareInfo.Firmware0_Rev_Sub ?? 0}`}
                    disabled
                  />
                </Field>
                <Field label="Panel Type">
                  <Input value={String(hardwareInfo.Panel_Type ?? 'N/A')} disabled />
                </Field>
                <Field label="USB Mode">
                  <Input value={hardwareInfo.USB_Mode === 0 ? 'Device' : 'Host'} disabled />
                </Field>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>Features</div>
              <Field label="LCD Display">
                <Switch
                  checked={featureFlags.LCD_Display === 1}
                  onChange={(_, data) =>
                    setFeatureFlags({ ...featureFlags, LCD_Display: data.checked ? 1 : 0 })
                  }
                />
              </Field>
              <Field label="Enable Panel Name">
                <Switch
                  checked={featureFlags.Enable_Panel_Name === 1}
                  onChange={(_, data) =>
                    setFeatureFlags({ ...featureFlags, Enable_Panel_Name: data.checked ? 1 : 0 })
                  }
                />
              </Field>
            </div>
          </>
        );

      case 'communication':
        return (
          <>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Network Settings</div>
              <div className={styles.formGrid}>
                <Field
                  label="IP Address"
                  validationMessage={
                    networkSettings.IP_Address && !validateIPAddress(networkSettings.IP_Address)
                      ? 'Invalid IP address format (e.g., 192.168.1.100)'
                      : undefined
                  }
                  validationState={
                    networkSettings.IP_Address && !validateIPAddress(networkSettings.IP_Address)
                      ? 'error'
                      : 'none'
                  }
                >
                  <Input
                    value={networkSettings.IP_Address ?? ''}
                    onChange={(_, data) =>
                      setNetworkSettings({ ...networkSettings, IP_Address: data.value })
                    }
                    placeholder="192.168.1.100"
                  />
                </Field>
                <Field
                  label="Subnet Mask"
                  validationMessage={
                    networkSettings.Subnet && !validateIPAddress(networkSettings.Subnet)
                      ? 'Invalid subnet mask format (e.g., 255.255.255.0)'
                      : undefined
                  }
                  validationState={
                    networkSettings.Subnet && !validateIPAddress(networkSettings.Subnet)
                      ? 'error'
                      : 'none'
                  }
                >
                  <Input
                    value={networkSettings.Subnet ?? ''}
                    onChange={(_, data) =>
                      setNetworkSettings({ ...networkSettings, Subnet: data.value })
                    }
                    placeholder="255.255.255.0"
                  />
                </Field>
                <Field
                  label="Gateway"
                  validationMessage={
                    networkSettings.Gateway && !validateIPAddress(networkSettings.Gateway)
                      ? 'Invalid gateway format (e.g., 192.168.1.1)'
                      : undefined
                  }
                  validationState={
                    networkSettings.Gateway && !validateIPAddress(networkSettings.Gateway)
                      ? 'error'
                      : 'none'
                  }
                >
                  <Input
                    value={networkSettings.Gateway ?? ''}
                    onChange={(_, data) =>
                      setNetworkSettings({ ...networkSettings, Gateway: data.value })
                    }
                    placeholder="192.168.1.1"
                  />
                </Field>
                <Field label="MAC Address">
                  <Input value={networkSettings.MAC_Address ?? 'N/A'} disabled />
                </Field>
                <Field label="IP Configuration">
                  <Dropdown
                    value={networkSettings.TCP_Type === 0 ? 'DHCP' : 'Static'}
                    onOptionSelect={(_, data) =>
                      setNetworkSettings({
                        ...networkSettings,
                        TCP_Type: data.optionValue === 'DHCP' ? 0 : 1,
                      })
                    }
                  >
                    <Option value="DHCP">DHCP (Auto)</Option>
                    <Option value="Static">Static (Manual)</Option>
                  </Dropdown>
                </Field>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>Serial Port Configuration</div>
              <div className={styles.formGrid}>
                <Field label="COM0 Baudrate">
                  <Dropdown
                    value={String(commSettings.COM_Baudrate0 ?? 19200)}
                    onOptionSelect={(_, data) =>
                      setCommSettings({ ...commSettings, COM_Baudrate0: Number(data.optionValue) })
                    }
                  >
                    <Option value="9600">9600</Option>
                    <Option value="19200">19200</Option>
                    <Option value="38400">38400</Option>
                    <Option value="57600">57600</Option>
                    <Option value="115200">115200</Option>
                  </Dropdown>
                </Field>
                <Field label="COM1 Baudrate">
                  <Dropdown
                    value={String(commSettings.COM_Baudrate1 ?? 19200)}
                    onOptionSelect={(_, data) =>
                      setCommSettings({ ...commSettings, COM_Baudrate1: Number(data.optionValue) })
                    }
                  >
                    <Option value="9600">9600</Option>
                    <Option value="19200">19200</Option>
                    <Option value="38400">38400</Option>
                    <Option value="57600">57600</Option>
                    <Option value="115200">115200</Option>
                  </Dropdown>
                </Field>
                <Field label="COM2 Baudrate">
                  <Dropdown
                    value={String(commSettings.COM_Baudrate2 ?? 19200)}
                    onOptionSelect={(_, data) =>
                      setCommSettings({ ...commSettings, COM_Baudrate2: Number(data.optionValue) })
                    }
                  >
                    <Option value="9600">9600</Option>
                    <Option value="19200">19200</Option>
                    <Option value="38400">38400</Option>
                    <Option value="57600">57600</Option>
                    <Option value="115200">115200</Option>
                  </Dropdown>
                </Field>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <Button appearance="primary" icon={<SaveRegular />} onClick={handleSaveNetworkValidated} className={styles.saveButton}>
                Save Network Settings
              </Button>
              <Button appearance="primary" icon={<SaveRegular />} onClick={handleSaveCommunication} className={styles.saveButton}>
                Save Communication Settings
              </Button>
            </div>
          </>
        );

      case 'time':
        return (
          <>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Time Configuration</div>
              <div className={styles.formGrid}>
                <Field label="Time Zone">
                  <Input
                    type="number"
                    value={String(timeSettings.Time_Zone ?? 0)}
                    onChange={(_, data) =>
                      setTimeSettings({ ...timeSettings, Time_Zone: Number(data.value) })
                    }
                  />
                </Field>
                <Field label="SNTP Server">
                  <Input
                    value={timeSettings.SNTP_Server ?? ''}
                    onChange={(_, data) =>
                      setTimeSettings({ ...timeSettings, SNTP_Server: data.value })
                    }
                  />
                </Field>
                <Field label="Enable SNTP">
                  <Switch
                    checked={timeSettings.Enable_SNTP === 2}
                    onChange={(_, data) =>
                      setTimeSettings({ ...timeSettings, Enable_SNTP: data.checked ? 2 : 1 })
                    }
                  />
                </Field>
                <Field label="Enable DST">
                  <Switch
                    checked={timeSettings.Time_Zone_Summer_Daytime === 1}
                    onChange={(_, data) =>
                      setTimeSettings({ ...timeSettings, Time_Zone_Summer_Daytime: data.checked ? 1 : 0 })
                    }
                  />
                </Field>
              </div>
            </div>

            {timeSettings.Time_Zone_Summer_Daytime === 1 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Daylight Saving Time</div>
                <div className={styles.formGrid}>
                  <Field label="DST Start Month">
                    <Input
                      type="number"
                      value={String(timeSettings.Start_Month ?? 3)}
                      onChange={(_, data) =>
                        setTimeSettings({ ...timeSettings, Start_Month: Number(data.value) })
                      }
                    />
                  </Field>
                  <Field label="DST Start Day">
                    <Input
                      type="number"
                      value={String(timeSettings.Start_Day ?? 1)}
                      onChange={(_, data) =>
                        setTimeSettings({ ...timeSettings, Start_Day: Number(data.value) })
                      }
                    />
                  </Field>
                  <Field label="DST End Month">
                    <Input
                      type="number"
                      value={String(timeSettings.End_Month ?? 11)}
                      onChange={(_, data) =>
                        setTimeSettings({ ...timeSettings, End_Month: Number(data.value) })
                      }
                    />
                  </Field>
                  <Field label="DST End Day">
                    <Input
                      type="number"
                      value={String(timeSettings.End_Day ?? 1)}
                      onChange={(_, data) =>
                        setTimeSettings({ ...timeSettings, End_Day: Number(data.value) })
                      }
                    />
                  </Field>
                </div>
              </div>
            )}

            <Button appearance="primary" icon={<SaveRegular />} onClick={handleSaveTime} className={styles.saveButton}>
              Save Time Settings
            </Button>
          </>
        );

      case 'dyndns':
        return (
          <>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Dynamic DNS Configuration</div>
              <Field label="Enable DynDNS">
                <Switch
                  checked={dyndnsSettings.Enable_DynDNS === 2}
                  onChange={(_, data) =>
                    setDyndnsSettings({ ...dyndnsSettings, Enable_DynDNS: data.checked ? 2 : 1 })
                  }
                />
              </Field>

              {dyndnsSettings.Enable_DynDNS === 2 && (
                <div className={styles.formGrid}>
                  <Field label="Provider">
                    <Dropdown
                      value={String(dyndnsSettings.DynDNS_Provider ?? 0)}
                      onOptionSelect={(_, data) =>
                        setDyndnsSettings({ ...dyndnsSettings, DynDNS_Provider: Number(data.optionValue) })
                      }
                    >
                      <Option value="0">3322.org</Option>
                      <Option value="1">DynDNS.com</Option>
                      <Option value="2">No-IP.com</Option>
                    </Dropdown>
                  </Field>
                  <Field label="Update Interval (minutes)">
                    <Input
                      type="number"
                      value={String(dyndnsSettings.DynDNS_Update_Time ?? 60)}
                      onChange={(_, data) =>
                        setDyndnsSettings({ ...dyndnsSettings, DynDNS_Update_Time: Number(data.value) })
                      }
                    />
                  </Field>
                  <Field label="Username">
                    <Input
                      value={dyndnsSettings.DynDNS_User ?? ''}
                      onChange={(_, data) =>
                        setDyndnsSettings({ ...dyndnsSettings, DynDNS_User: data.value })
                      }
                    />
                  </Field>
                  <Field label="Password">
                    <Input
                      type="password"
                      value={dyndnsSettings.DynDNS_Pass ?? ''}
                      onChange={(_, data) =>
                        setDyndnsSettings({ ...dyndnsSettings, DynDNS_Pass: data.value })
                      }
                    />
                  </Field>
                  <Field label="Domain">
                    <Input
                      value={dyndnsSettings.DynDNS_Domain ?? ''}
                      onChange={(_, data) =>
                        setDyndnsSettings({ ...dyndnsSettings, DynDNS_Domain: data.value })
                      }
                    />
                  </Field>
                </div>
              )}
            </div>

            <Button appearance="primary" icon={<SaveRegular />} onClick={handleSaveDyndns} className={styles.saveButton}>
              Save DynDNS Settings
            </Button>
          </>
        );

      case 'email':
        return (
          <div className={styles.infoMessage}>
            <InfoRegular style={{ fontSize: '14px', color: '#0078d4' }} />
            <Text style={{ fontSize: '12px' }}>Email alarm configuration is managed through the Email Alarms page.</Text>
          </div>
        );

      case 'users':
        return (
          <div className={styles.infoMessage}>
            <InfoRegular style={{ fontSize: '14px', color: '#0078d4' }} />
            <Text style={{ fontSize: '12px' }}>User login configuration is managed through the Users page.</Text>
          </div>
        );

      case 'expansion':
        return (
          <div className={styles.infoMessage}>
            <InfoRegular style={{ fontSize: '14px', color: '#0078d4' }} />
            <Text style={{ fontSize: '12px' }}>Expansion I/O devices are managed through the dedicated Expansion IO page.</Text>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <SettingsRegular style={{ fontSize: '16px' }} />
          <Text size={400} weight="semibold">
            Device Settings
          </Text>
          {selectedDevice && (
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              {selectedDevice.nameShowOnTree} (SN: {selectedDevice.serialNumber})
            </Text>
          )}
        </div>
        <div className={styles.headerActions}>
          <Button
            appearance="subtle"
            icon={<ArrowResetRegular />}
            onClick={() => setShowResetDialog(true)}
            disabled={loading || !selectedDevice}
            style={{ fontWeight: 'normal', fontSize: '12px' }}
          >
            Reset to Defaults
          </Button>
          <Button
            appearance="subtle"
            icon={<PowerRegular />}
            onClick={() => setShowRebootDialog(true)}
            disabled={loading || !selectedDevice}
            style={{ fontWeight: 'normal', fontSize: '12px' }}
          >
            Reboot Device
          </Button>
          <Button
            appearance="subtle"
            icon={<ArrowSyncRegular />}
            onClick={handleRefresh}
            disabled={loading}
            style={{ fontWeight: 'normal', fontSize: '12px' }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Container */}
      <div className={styles.tabContainer}>
        {/* Tab List */}
        <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect} className={`${styles.tabList} ${cssStyles.customTabList}`} style={{ fontSize: '5px' }}>
          <Tab value="basic" style={{ fontSize: '5px' }}>Basic Information</Tab>
          <Tab value="communication" style={{ fontSize: '5px' }}>Communication</Tab>
          <Tab value="time" style={{ fontSize: '5px' }}>Time</Tab>
          <Tab value="dyndns" style={{ fontSize: '5px' }}>Dyndns</Tab>
          <Tab value="email" style={{ fontSize: '5px' }}>Email</Tab>
          <Tab value="users" style={{ fontSize: '5px' }}>User Login</Tab>
          <Tab value="expansion" style={{ fontSize: '5px' }}>Expansion IO</Tab>
        </TabList>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              <ErrorCircleRegular style={{ fontSize: '14px', color: '#d13438' }} />
              <Text style={{ color: '#d13438', fontSize: '12px' }}>{error}</Text>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className={styles.successMessage}>
              <InfoRegular style={{ fontSize: '14px', color: '#0078d4' }} />
              <Text style={{ color: '#0078d4', fontSize: '12px' }}>{successMessage}</Text>
            </div>
          )}

          {renderTabContent()}
        </div>
      </div>

      {/* Reboot Device Confirmation Dialog */}
      <Dialog open={showRebootDialog} onOpenChange={(_, data) => setShowRebootDialog(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Reboot Device</DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <WarningRegular style={{ fontSize: '24px', color: '#f7630c', marginTop: '2px' }} />
                <div>
                  <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
                    Are you sure you want to reboot this device?
                  </Text>
                  <Text size={300} style={{ display: 'block', marginBottom: '8px' }}>
                    Device: <strong>{selectedDevice?.nameShowOnTree}</strong>
                  </Text>
                  <Text size={300} style={{ display: 'block', color: '#605e5c' }}>
                    The device will restart and be offline for approximately 30 seconds. All unsaved changes will be lost.
                  </Text>
                  {rebootCountdown > 0 && (
                    <Text size={400} weight="semibold" style={{ display: 'block', marginTop: '12px', color: '#d13438' }}>
                      Rebooting in {rebootCountdown} seconds...
                    </Text>
                  )}
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setShowRebootDialog(false)} disabled={rebootCountdown > 0}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleRebootDevice} disabled={rebootCountdown > 0}>
                Reboot Now
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Reset to Defaults Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={(_, data) => setShowResetDialog(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Reset to Factory Defaults</DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <WarningRegular style={{ fontSize: '24px', color: '#d13438', marginTop: '2px' }} />
                <div>
                  <Text weight="semibold" style={{ display: 'block', marginBottom: '8px', color: '#d13438' }}>
                    WARNING: This action cannot be undone!
                  </Text>
                  <Text size={300} style={{ display: 'block', marginBottom: '8px' }}>
                    Device: <strong>{selectedDevice?.nameShowOnTree}</strong>
                  </Text>
                  <Text size={300} style={{ display: 'block', color: '#605e5c' }}>
                    This will reset all device settings to factory defaults, including:
                  </Text>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '13px', color: '#605e5c' }}>
                    <li>Network configuration (IP, subnet, gateway)</li>
                    <li>Communication settings (COM ports, baudrates)</li>
                    <li>Time and timezone settings</li>
                    <li>DynDNS and email configurations</li>
                    <li>All custom settings and preferences</li>
                  </ul>
                  <Text size={300} weight="semibold" style={{ display: 'block', marginTop: '12px', color: '#d13438' }}>
                    The device will need to be reconfigured after reset.
                  </Text>
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setShowResetDialog(false)}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleResetToDefaults} style={{ backgroundColor: '#d13438' }}>
                Reset to Defaults
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
