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
  Checkbox,
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
  ArrowClockwiseRegular,
  ErrorCircleRegular,
  InfoRegular,
  ArrowResetRegular,
  PowerRegular,
  WarningRegular,
  BroomRegular,
  DeleteRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { SettingsRefreshApi, type DeviceSettings } from '../services/settingsRefreshApi';
import { SettingsUpdateApi } from '../services/settingsUpdateApi';
import { AdvancedSettingsDialog } from '../components/AdvancedSettingsDialog';
import cssStyles from './SettingsPage.module.css';

// Full T3000 C++ Baudrate_Array - com_baudrate0/1/2 stores an index 0-11 into this array
// UART_9600=5, UART_19200=6, UART_38400=7, UART_115200=9, UART_57600=11
const BAUDRATE_OPTIONS = [
  1200,   // 0
  2400,   // 1
  3600,   // 2
  4800,   // 3
  7200,   // 4
  9600,   // 5 UART_9600
  19200,  // 6 UART_19200
  38400,  // 7 UART_38400
  76800,  // 8
  115200, // 9 UART_115200
  921600, // 10 UART_921600
  57600,  // 11
];

// com_config index �?port mode label (from T3000 C++ Device_Serial_Port_Status[])
const COM_PORT_MODES = [
  'Unused',           // 0
  'BACnet MSTP Slave',// 1
  'Modbus Slave',     // 2
  'BACnet PTP',       // 3
  'GSM',              // 4
  'Main Zigbee',      // 5
  'Sub Zigbee',       // 6
  'Modbus Master',    // 7
  'RS232 Meter',      // 8
  'BACnet MSTP Master',// 9
];

// uart_parity: 0=None, 1=Odd, 2=Even
const PARITY_OPTIONS = ['None', 'Odd', 'Even'];

// uart_stopbit: 0=1 bit, 1=2 bits
const STOPBIT_OPTIONS = ['1 bit', '2 bits'];

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
  tabHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    paddingRight: '8px',
  },
  tabList: {
    padding: '0',
    borderBottom: 'none',
    backgroundColor: tokens.colorNeutralBackground1,
    fontSize: '5px',
    flex: 1,
    '& button': {
      fontSize: '5px',
    },
    '& .fui-Tab': {
      fontSize: '5px',
    },
  },
  refreshButton: {
    fontSize: '12px',
    height: '28px',
    minWidth: '28px',
    padding: '0 8px',
    fontWeight: 'normal',
  },
  tabContent: {
    flex: 1,
    padding: '8px 0 0 12px',
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
      '&:hover': {
        backgroundColor: '#a1a1a1',
      },
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
  // Basic Information Tab Styles
  basicTwoColumn: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px',
  },
  basicPanel: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    padding: '12px',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  basicPanelTitle: {
    fontSize: '13px',
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: '12px',
    color: tokens.colorNeutralForeground1,
  },
  basicField: {
    marginBottom: '10px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  basicFieldLabel: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    minWidth: '140px',
    flexShrink: 0,
  },
  basicFieldValue: {
    flex: 1,
    fontSize: '12px',
    padding: '6px 8px',
    backgroundColor: '#f5f5f5',
    borderRadius: '2px',
    color: tokens.colorNeutralForeground1,
  },
  horizontalField: {
    display: 'grid',
    gridTemplateColumns: '140px 1fr',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '14px',
    '& label': {
      fontSize: '12px',
      margin: 0,
    },
    '& input': {
      fontSize: '12px',
    },
  },
  lcdOptions: {
    marginTop: '16px',
    padding: '12px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  lcdRadioGroup: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  lcdButtons: {
    display: 'flex',
    gap: '8px',
  },
  tabContentWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
  },
  actionsSection: {
    marginTop: 'auto',
    padding: '12px 12px 0 12px',
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    flexShrink: 0,
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
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
  Zigbee_Pan_ID?: number;
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
  Hardware_Rev?: string;
  Firmware0_Rev_Main?: number;
  Firmware0_Rev_Sub?: number;
  Firmware1_Rev?: number;
  Firmware2_Rev?: number;
  Bootloader_Rev?: number;
  Mini_Type?: number;
  MiniTypeName?: string;  // Friendly name from API
  Panel_Type?: number;
  USB_Mode?: number;
  SD_Exist?: number;
}

interface FeatureFlags {
  User_Name_Enable?: number;
  Customer_Unite_Enable?: number;
  Enable_Panel_Name?: number;
  LCD_Display?: number; // 0=Always Off, 1=Always On, 2+=Delay off (value is seconds)
  LCD_Point_Type?: number; // 0=Output, 1=Input, 2=Variable
  LCD_Point_Number?: number; // 1-128
}

interface DeviceInfo {
  SerialNumber?: number;
  PanelId?: string; // Panel Name
  Panel_Number?: number;
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
  const [showAdvancedSettingsDialog, setShowAdvancedSettingsDialog] = useState(false);
  const [rebootCountdown, setRebootCountdown] = useState(0);

  // Settings state for each tab
  const [settings, setSettings] = useState<DeviceSettings | null>(null); // Unified settings for save operations
  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>({});
  const [commSettings, setCommSettings] = useState<CommunicationSettings>({});
  const [protocolSettings, setProtocolSettings] = useState<ProtocolSettings>({});
  const [timeSettings, setTimeSettings] = useState<TimeSettings>({});
  const [dyndnsSettings, setDyndnsSettings] = useState<DyndnsSettings>({});
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo>({});
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
    LCD_Display: 0, // Default to LCD Always Off
  });
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({});

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

      // Use SettingsRefreshApi to get device settings
      // Try loading from DB first (fast), fall back to device refresh if needed
      let settings: DeviceSettings | undefined = await SettingsRefreshApi.loadFromDB(serial);

      if (!settings) {
        // No cached data - fetch from device
        console.log('[SettingsPage] No cached settings, refreshing from device...');
        const result = await SettingsRefreshApi.refreshFromDevice(serial);

        if (!result.success || !result.data) {
          throw new Error(result.message || 'Failed to refresh settings from device');
        }

        settings = result.data;
      }

      // Map DeviceSettings to component state
      setSettings(settings); // Store unified settings for save operations

      setNetworkSettings({
        IP_Address: settings.ip_addr,
        Subnet: settings.subnet,
        Gateway: settings.gate_addr,
        MAC_Address: settings.mac_addr,
        TCP_Type: settings.tcp_type,
      });

      setCommSettings({
        COM0_Config: settings.com0_config,
        COM1_Config: settings.com1_config,
        COM2_Config: settings.com2_config,
        COM_Baudrate0: settings.com_baudrate0,
        COM_Baudrate1: settings.com_baudrate1,
        COM_Baudrate2: settings.com_baudrate2,
        UART_Parity0: settings.uart_parity?.[0],
        UART_Parity1: settings.uart_parity?.[1],
        UART_Parity2: settings.uart_parity?.[2],
        UART_Stopbit0: settings.uart_stopbit?.[0],
        UART_Stopbit1: settings.uart_stopbit?.[1],
        UART_Stopbit2: settings.uart_stopbit?.[2],
        Fix_COM_Config: settings.fix_com_config,
        Zigbee_Pan_ID: settings.zigbee_panid,
      });

      setProtocolSettings({
        Modbus_ID: settings.modbus_id,
        Modbus_Port: settings.modbus_port,
        MSTP_ID: settings.mstp_id,
        MSTP_Network_Number: settings.mstp_network_number,
        Max_Master: settings.max_master,
        Object_Instance: settings.object_instance,
        BBMD_Enable: settings.BBMD_EN,
        // BIP Network is a 16-bit split across two uint8 fields:
        // low byte = network_number (offset 50), high byte = network_number_hi (offset 264)
        Network_Number: settings.network_number | (settings.network_number_hi << 8),
      });

      setTimeSettings({
        Time_Zone: settings.time_zone,
        Time_Zone_Summer_Daytime: settings.time_zone_summer_daytime,
        Enable_SNTP: settings.en_sntp,
        SNTP_Server: settings.sntp_server,
        Time_Sync_Auto_Manual: settings.time_sync_auto_manual,
        Start_Month: settings.start_month,
        Start_Day: settings.start_day,
        End_Month: settings.end_month,
        End_Day: settings.end_day,
      });

      setDyndnsSettings({
        Enable_DynDNS: settings.en_dyndns,
        DynDNS_Provider: settings.dyndns_provider,
        DynDNS_User: settings.dyndns_user,
        DynDNS_Pass: settings.dyndns_pass,
        DynDNS_Domain: settings.dyndns_domain,
        DynDNS_Update_Time: settings.dyndns_update_time,
      });

      setHardwareInfo({
        Mini_Type: settings.mini_type,
        MiniTypeName: settings.MiniTypeName,  // Friendly name from refresh API
        Panel_Type: settings.panel_type,
        USB_Mode: settings.usb_mode,
        SD_Exist: settings.sd_exist,
        Hardware_Rev: String(settings.harware_rev),
        Firmware0_Rev_Main: settings.firmware0_rev_main,
        Firmware0_Rev_Sub: settings.firmware0_rev_sub,
        Firmware1_Rev: settings.frimware1_rev,
        Firmware2_Rev: settings.frimware2_rev,
        Bootloader_Rev: settings.bootloader_rev,
      });

      setFeatureFlags({
        User_Name_Enable: settings.user_name,
        Customer_Unite_Enable: settings.custmer_unite,
        Enable_Panel_Name: settings.en_panel_name,
        LCD_Display: settings.LCD_Display,
        LCD_Point_Type: settings.lcd_point_type,
        LCD_Point_Number: settings.lcd_point_number,
      });

      setDeviceInfo({
        SerialNumber: settings.n_serial_number,
        PanelId: settings.panel_name,
        Panel_Number: settings.panel_number,
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      console.error('[SettingsPage] Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  // Refresh from device (force fresh data)
  const handleRefresh = useCallback(async () => {
    if (!selectedDevice) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await SettingsRefreshApi.refreshFromDevice(selectedDevice.serialNumber);

      if (!result.success) {
        throw new Error(result.message);
      }

      // Use the refreshed data directly instead of calling fetchSettings again
      if (result.data) {
        const settings = result.data;

        // Update all state with the refreshed settings
        setNetworkSettings({
          IP_Address: settings.ip_addr,
          Subnet: settings.subnet,
          Gateway: settings.gate_addr,
          MAC_Address: settings.mac_addr,
          TCP_Type: settings.tcp_type,
        });

        setCommSettings({
          COM0_Config: settings.com0_config,
          COM1_Config: settings.com1_config,
          COM2_Config: settings.com2_config,
          COM_Baudrate0: settings.com_baudrate0,
          COM_Baudrate1: settings.com_baudrate1,
          COM_Baudrate2: settings.com_baudrate2,
          UART_Parity0: settings.uart_parity?.[0],
          UART_Parity1: settings.uart_parity?.[1],
          UART_Parity2: settings.uart_parity?.[2],
          UART_Stopbit0: settings.uart_stopbit?.[0],
          UART_Stopbit1: settings.uart_stopbit?.[1],
          UART_Stopbit2: settings.uart_stopbit?.[2],
          Fix_COM_Config: settings.fix_com_config,
          Zigbee_Pan_ID: settings.zigbee_panid,
        });

        setProtocolSettings({
          Modbus_ID: settings.modbus_id,
          Modbus_Port: settings.modbus_port,
          MSTP_ID: settings.mstp_id,
          MSTP_Network_Number: settings.mstp_network_number,
          Max_Master: settings.max_master,
          Object_Instance: settings.object_instance,
          BBMD_Enable: settings.BBMD_EN,
          Network_Number: settings.network_number | (settings.network_number_hi << 8),
        });

        setTimeSettings({
          Time_Zone: settings.time_zone,
          Time_Zone_Summer_Daytime: settings.time_zone_summer_daytime,
          Enable_SNTP: settings.en_sntp,
          SNTP_Server: settings.sntp_server,
          Start_Month: settings.start_month,
          Start_Day: settings.start_day,
          End_Month: settings.end_month,
          End_Day: settings.end_day,
        });

        setDyndnsSettings({
          Enable_DynDNS: settings.en_dyndns,
          DynDNS_Provider: settings.dyndns_provider,
          DynDNS_User: settings.dyndns_user,
          DynDNS_Pass: settings.dyndns_pass,
          DynDNS_Domain: settings.dyndns_domain,
          DynDNS_Update_Time: settings.dyndns_update_time,
        });

        setHardwareInfo({
          Mini_Type: settings.mini_type,
          Panel_Type: settings.panel_type,
          USB_Mode: settings.usb_mode,
          SD_Exist: settings.sd_exist,
          Hardware_Rev: String(settings.harware_rev),
          Firmware0_Rev_Main: settings.firmware0_rev_main,
          Firmware0_Rev_Sub: settings.firmware0_rev_sub,
          Firmware1_Rev: settings.frimware1_rev,
          Firmware2_Rev: settings.frimware2_rev,
          Bootloader_Rev: settings.bootloader_rev,
        });

        setFeatureFlags({
          User_Name_Enable: settings.user_name,
          Customer_Unite_Enable: settings.custmer_unite,
          Enable_Panel_Name: settings.en_panel_name,
          LCD_Display: settings.LCD_Display,
        });

        setDeviceInfo({
          SerialNumber: settings.n_serial_number,
          PanelId: settings.panel_name,
          PanelNumber: settings.panel_number,
        });
      }

      setSuccessMessage('Settings refreshed successfully from device');

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      console.error('[SettingsPage] Failed to refresh settings:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]); // Removed fetchSettings from dependencies

  // Load settings when device changes
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value as TabValue);
    setError(null);
    setSuccessMessage(null);
  };

  // Helper to update unified settings object
  const updateSettings = (updates: Partial<DeviceSettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...updates });
  };

  const handleSaveNetwork = async () => {
    if (!selectedDevice || !settings) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Validate settings before update
      const validation = SettingsUpdateApi.validateSettings(settings);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Update device settings via FFI (action 16)
      const result = await SettingsUpdateApi.updateDeviceSettings(settings);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update device');
      }

      setSuccessMessage('Network settings saved to device successfully');

      // Refresh settings to confirm
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCommunication = async () => {
    if (!selectedDevice || !settings) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const validation = SettingsUpdateApi.validateSettings(settings);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      const result = await SettingsUpdateApi.updateDeviceSettings(settings);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update device');
      }

      setSuccessMessage('Communication settings saved to device successfully');
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTime = async () => {
    if (!selectedDevice || !settings) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const validation = SettingsUpdateApi.validateSettings(settings);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      const result = await SettingsUpdateApi.updateDeviceSettings(settings);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update device');
      }

      setSuccessMessage('Time settings saved to device successfully');
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDyndns = async () => {
    if (!selectedDevice || !settings) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const validation = SettingsUpdateApi.validateSettings(settings);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      const result = await SettingsUpdateApi.updateDeviceSettings(settings);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update device');
      }

      setSuccessMessage('DynDNS settings saved to device successfully');
      await fetchSettings();
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

  // Handle advanced settings save
  const handleAdvancedSettingsSave = async (data: {
    fixComConfig: boolean;
    writeFlashMinutes: number;
    maxInput: number;
    maxOutput: number;
    maxVariable: number;
  }) => {
    if (!selectedDevice || !settings) return;

    try {
      setLoading(true);
      setError(null);

      // Update settings object
      const updatedSettings: DeviceSettings = {
        ...settings,
        fix_com_config: data.fixComConfig ? 1 : 0,
        write_flash: data.writeFlashMinutes,
        max_in: data.maxInput,
        max_out: data.maxOutput,
        max_var: data.maxVariable,
      };

      // Send to device
      const result = await SettingsUpdateApi.updateDeviceSettings(
        selectedDevice.serialNumber,
        updatedSettings
      );

      if (!result.success) {
        throw new Error(result.message || 'Failed to update advanced settings');
      }

      setSuccessMessage('Advanced settings updated successfully');
      setSettings(updatedSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update advanced settings');
    } finally {
      setLoading(false);
    }
  };

  // Render tab content based on selected tab
  const renderTabContent = () => {
    if (!selectedDevice) {
      return (
        <div className={styles.noDevice}>
          <Text size={400} weight="semibold">No device selected</Text>
          <br />
          <Text size={200}>Please select a device from the tree to view settings</Text>
        </div>
      );
    }

    if (loading && Object.keys(networkSettings).length === 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', marginBottom: '12px' }}>
          <Spinner size="extra-tiny" style={{ fontSize: '12px' }} />
          <Text style={{ color: '#0078d4', fontSize: '12px' }}>Loading settings...</Text>
        </div>
      );
    }

    switch (selectedTab) {
      case 'basic':
        return (
          <>
            {/* Two-Column Layout: Device Info | Panel Info */}
            <div className={styles.basicTwoColumn}>
              {/* Left Panel - Device Information (Read-Only) */}
              <div className={styles.basicPanel}>
                <div className={styles.basicPanelTitle}>Device Information</div>
                <div className={styles.basicField}>
                  <label className={styles.basicFieldLabel}>Module Number:</label>
                  <span className={styles.basicFieldValue}>{hardwareInfo.MiniTypeName ?? 'N/A'}</span>
                </div>
                <div className={styles.basicField}>
                  <label className={styles.basicFieldLabel}>Hardware Version:</label>
                  <span className={styles.basicFieldValue}>{hardwareInfo.Hardware_Rev ?? 'N/A'}</span>
                </div>
                <div className={styles.basicField}>
                  <label className={styles.basicFieldLabel}>MCU Version:</label>
                  <span className={styles.basicFieldValue}>
                    {hardwareInfo.Firmware0_Rev_Main ?? 0}.{hardwareInfo.Firmware0_Rev_Sub ?? 0}
                  </span>
                </div>
                <div className={styles.basicField}>
                  <label className={styles.basicFieldLabel}>PIC Version:</label>
                  <span className={styles.basicFieldValue}>{hardwareInfo.Firmware1_Rev ?? 'N/A'}</span>
                </div>
                <div className={styles.basicField}>
                  <label className={styles.basicFieldLabel}>Top Version:</label>
                  <span className={styles.basicFieldValue}>{hardwareInfo.Firmware2_Rev ?? 'N/A'}</span>
                </div>
                <div className={styles.basicField}>
                  <label className={styles.basicFieldLabel}>Bootloader Version:</label>
                  <span className={styles.basicFieldValue}>{hardwareInfo.Bootloader_Rev ?? 'N/A'}</span>
                </div>
                <div className={styles.basicField}>
                  <label className={styles.basicFieldLabel}>MCU Type:</label>
                  <span className={styles.basicFieldValue}>
                    {hardwareInfo.Mini_Type !== undefined
                      ? `0x${((hardwareInfo.Mini_Type & 0xC0) >>> 0).toString(16).toUpperCase().padStart(2, '0')}`
                      : 'N/A'}
                  </span>
                </div>
                <div className={styles.basicField}>
                  <label className={styles.basicFieldLabel}>SD Card:</label>
                  <span className={styles.basicFieldValue}>
                    {hardwareInfo.SD_Exist === 1 ? 'Present' : 'No SD Card'}
                  </span>
                </div>
              </div>

              {/* Right Panel - Panel Information (Editable) */}
              <div className={styles.basicPanel}>
                <div className={styles.basicPanelTitle}>Panel Information</div>
                <Field label="Bacnet Instance" size="small" className={styles.horizontalField}>
                  <Input
                    type="number"
                    size="small"
                    value={String(protocolSettings.Object_Instance ?? '')}
                    onChange={(_, data) =>
                      setProtocolSettings({ ...protocolSettings, Object_Instance: Number(data.value) })
                    }
                  />
                </Field>
                <Field label="Serial Number" size="small" className={styles.horizontalField}>
                  <Input
                    type="number"
                    size="small"
                    value={String(deviceInfo.SerialNumber ?? selectedDevice?.serialNumber ?? '')}
                    disabled
                  />
                </Field>
                <Field label="MAC Address" size="small" className={styles.horizontalField}>
                  <Input
                    size="small"
                    value={networkSettings.MAC_Address ?? ''}
                    onChange={(_, data) =>
                      setNetworkSettings({ ...networkSettings, MAC_Address: data.value })
                    }
                    placeholder="00:11:22:33:44:55"
                  />
                </Field>
                <Field label="MSTP Network" size="small" className={styles.horizontalField}>
                  <Input
                    type="number"
                    size="small"
                    value={String(protocolSettings.MSTP_Network_Number ?? '')}
                    onChange={(_, data) =>
                      setProtocolSettings({ ...protocolSettings, MSTP_Network_Number: Number(data.value) })
                    }
                  />
                </Field>
                <Field size="small" className={styles.horizontalField}>
                  <label style={{ fontSize: '12px', lineHeight: '1.3' }}>Modbus RTU ID /<br/>BACnet MSTP MAC</label>
                  <Input
                    type="number"
                    size="small"
                    value={String(protocolSettings.Modbus_ID ?? '')}
                    onChange={(_, data) => {
                      const value = Number(data.value);
                      setProtocolSettings({
                        ...protocolSettings,
                        Modbus_ID: value,
                        MSTP_ID: value
                      });
                    }}
                  />
                </Field>
                <Field label="BIP Network" size="small" className={styles.horizontalField}>
                  <Input
                    type="number"
                    size="small"
                    value={String(protocolSettings.Network_Number ?? '')}
                    onChange={(_, data) => {
                      const v = Number(data.value) & 0xFFFF;
                      setProtocolSettings({ ...protocolSettings, Network_Number: v });
                      // Split 16-bit value back into two uint8 bytes for device
                      updateSettings({ network_number: v & 0xFF, network_number_hi: (v >> 8) & 0xFF });
                    }}
                  />
                </Field>
                <Field label="Max Master" size="small" className={styles.horizontalField}>
                  <Input
                    type="number"
                    size="small"
                    value={String(protocolSettings.Max_Master ?? '')}
                    onChange={(_, data) =>
                      setProtocolSettings({ ...protocolSettings, Max_Master: Number(data.value) })
                    }
                  />
                </Field>
                <Field label="Panel Number" size="small" className={styles.horizontalField}>
                  <Input
                    type="number"
                    size="small"
                    value={String(deviceInfo.Panel_Number ?? '')}
                    onChange={(_, data) =>
                      setDeviceInfo({ ...deviceInfo, Panel_Number: Number(data.value) })
                    }
                  />
                </Field>
                <Field label="Panel Name" size="small" className={styles.horizontalField}>
                  <Input
                    size="small"
                    value={deviceInfo.PanelId ?? ''}
                    onChange={(_, data) =>
                      setDeviceInfo({ ...deviceInfo, PanelId: data.value })
                    }
                  />
                </Field>
              </div>
            </div>

            {/* LCD Options */}
            <div className={styles.lcdOptions}>
              <div className={styles.basicPanelTitle}>LCD Options</div>
              <div className={styles.lcdRadioGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <input
                    type="radio"
                    name="lcdMode"
                    checked={featureFlags.LCD_Display === 1}
                    onChange={() => setFeatureFlags({ ...featureFlags, LCD_Display: 1 })}
                  />
                  LCD Always On
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <input
                    type="radio"
                    name="lcdMode"
                    checked={featureFlags.LCD_Display === 0}
                    onChange={() => setFeatureFlags({ ...featureFlags, LCD_Display: 0 })}
                  />
                  LCD Always Off
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <input
                    type="radio"
                    name="lcdMode"
                    checked={featureFlags.LCD_Display !== undefined && featureFlags.LCD_Display > 1}
                    onChange={() => setFeatureFlags({ ...featureFlags, LCD_Display: 30 })}
                  />
                  LCD Delay off
                  <Input
                    type="number"
                    size="small"
                    value={featureFlags.LCD_Display !== undefined && featureFlags.LCD_Display > 1 ? String(featureFlags.LCD_Display) : ''}
                    onChange={(_, data) =>
                      setFeatureFlags({ ...featureFlags, LCD_Display: Number(data.value) || 2 })
                    }
                    disabled={featureFlags.LCD_Display === undefined || featureFlags.LCD_Display <= 1}
                    style={{ width: '100px', marginLeft: '4px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#605e5c' }}>(s)</span>
                </label>
                <div className={styles.lcdButtons}>
                  <Button size="small" appearance="secondary">Parameter</Button>
                  <Button
                    size="small"
                    appearance="secondary"
                    onClick={() => setShowAdvancedSettingsDialog(true)}
                  >
                    Advanced Settings
                  </Button>
                </div>
              </div>
            </div>

            {/* Advanced Settings Dialog */}
            <AdvancedSettingsDialog
              isOpen={showAdvancedSettingsDialog}
              onOpenChange={setShowAdvancedSettingsDialog}
              fixComConfig={settings?.fix_com_config === 1}
              writeFlashMinutes={settings?.write_flash ?? 0}
              maxInput={settings?.max_in ?? 64}
              maxOutput={settings?.max_out ?? 64}
              maxVariable={settings?.max_var ?? 128}
              onSave={handleAdvancedSettingsSave}
              panelType={hardwareInfo.Panel_Type ?? 0}
              firmwareVersion={
                ((hardwareInfo.Firmware0_Rev_Main ?? 0) * 10) +
                (hardwareInfo.Firmware0_Rev_Sub ?? 0)
              }
            />
          </>
        );

      case 'communication':
        return (
          <>
            <div className={styles.basicTwoColumn} style={{ gridTemplateColumns: '0.7fr 1fr' }}>
              {/* LEFT PANEL: IP Address */}
              <div className={styles.basicPanel}>
                <div className={styles.basicPanelTitle}>IP Address</div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="tcpType"
                      checked={networkSettings.TCP_Type === 0}
                      onChange={() => {
                        setNetworkSettings({ ...networkSettings, TCP_Type: 0 });
                        updateSettings({ tcp_type: 0 });
                      }}
                    />
                    Obtain IP Address Automatically
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="tcpType"
                      checked={(networkSettings.TCP_Type ?? 0) !== 0}
                      onChange={() => {
                        setNetworkSettings({ ...networkSettings, TCP_Type: 1 });
                        updateSettings({ tcp_type: 1 });
                      }}
                    />
                    Use The Following IP Address
                  </label>
                </div>

                <div className={styles.horizontalField}>
                  <label>IP Address :</label>
                  <Input
                    size="small"
                    value={networkSettings.IP_Address ?? ''}
                    disabled={networkSettings.TCP_Type === 0}
                    onChange={(_, data) => {
                      setNetworkSettings({ ...networkSettings, IP_Address: data.value });
                      updateSettings({ ip_addr: data.value });
                    }}
                    placeholder="192.168.1.100"
                  />
                </div>
                <div className={styles.horizontalField}>
                  <label>Subnet Mask</label>
                  <Input
                    size="small"
                    value={networkSettings.Subnet ?? ''}
                    disabled={networkSettings.TCP_Type === 0}
                    onChange={(_, data) => {
                      setNetworkSettings({ ...networkSettings, Subnet: data.value });
                      updateSettings({ subnet: data.value });
                    }}
                    placeholder="255.255.255.0"
                  />
                </div>
                <div className={styles.horizontalField}>
                  <label>Gateway Address :</label>
                  <Input
                    size="small"
                    value={networkSettings.Gateway ?? ''}
                    disabled={networkSettings.TCP_Type === 0}
                    onChange={(_, data) => {
                      setNetworkSettings({ ...networkSettings, Gateway: data.value });
                      updateSettings({ gate_addr: data.value });
                    }}
                    placeholder="192.168.1.1"
                  />
                </div>
                <div className={styles.horizontalField}>
                  <label>Modbus TCP Port :</label>
                  <Input
                    size="small"
                    type="number"
                    value={String(protocolSettings.Modbus_Port ?? 502)}
                    onChange={(_, data) => {
                      const v = Number(data.value);
                      setProtocolSettings({ ...protocolSettings, Modbus_Port: v });
                      updateSettings({ modbus_port: v });
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <Button size="small" appearance="primary" className={styles.saveButton}>
                    Wifi Configuration
                  </Button>
                  <Button size="small" appearance="secondary" onClick={handleSaveNetworkValidated}>
                    Change IP
                  </Button>
                </div>
              </div>

              {/* RIGHT PANEL: Device Serial Port Config */}
              <div className={styles.basicPanel}>
                <div className={styles.basicPanelTitle}>Device Serial Port Config</div>

                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 72px 58px 60px 42px', gap: '4px', alignItems: 'center', marginBottom: '4px', fontSize: '11px', color: '#605e5c', fontWeight: 600 }}>
                  <div />
                  <div />
                  <div>Baudrate</div>
                  <div>Data Bits</div>
                  <div>Parity Bit</div>
                  <div>Stop Bit</div>
                </div>

                {/* RS485 SUB row */}
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 72px 58px 60px 42px', gap: '4px', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>RS485 SUB</span>
                  <Dropdown
                    size="small"
                    value={String(commSettings.COM0_Config ?? 0)}
                    onOptionSelect={(_, data) => {
                      const v = Number(data.optionValue);
                      setCommSettings({ ...commSettings, COM0_Config: v });
                      updateSettings({ com0_config: v });
                    }}
                  >
                    {COM_PORT_MODES.map((label, idx) => (
                      <Option key={idx} value={String(idx)}>{label}</Option>
                    ))}
                  </Dropdown>
                  <Dropdown
                    size="small"
                    style={{ width: '100%', minWidth: 0 }}
                    value={String(commSettings.COM_Baudrate0 ?? 9)}
                    onOptionSelect={(_, data) => {
                      const v = Number(data.optionValue);
                      setCommSettings({ ...commSettings, COM_Baudrate0: v });
                      updateSettings({ com_baudrate0: v });
                    }}
                  >
                    {BAUDRATE_OPTIONS.map((baud, idx) => (
                      <Option key={idx} value={String(idx)} text={String(baud)}>{baud}</Option>
                    ))}
                  </Dropdown>
                  <Input size="small" value="8" disabled />
                  <Dropdown
                    size="small"
                    style={{ width: '100%', minWidth: 0 }}
                    value={String(commSettings.UART_Parity0 ?? 0)}
                    onOptionSelect={(_, data) => {
                      const v = Number(data.optionValue);
                      const parity = [v, commSettings.UART_Parity1 ?? 0, commSettings.UART_Parity2 ?? 0];
                      setCommSettings({ ...commSettings, UART_Parity0: v });
                      updateSettings({ uart_parity: parity });
                    }}
                  >
                    {PARITY_OPTIONS.map((label, idx) => (
                      <Option key={idx} value={String(idx)}>{label}</Option>
                    ))}
                  </Dropdown>
                  <Dropdown
                    size="small"
                    style={{ width: '100%', minWidth: 0 }}
                    value={String(commSettings.UART_Stopbit0 ?? 0)}
                    onOptionSelect={(_, data) => {
                      const v = Number(data.optionValue);
                      const stopbit = [v, commSettings.UART_Stopbit1 ?? 0, commSettings.UART_Stopbit2 ?? 0];
                      setCommSettings({ ...commSettings, UART_Stopbit0: v });
                      updateSettings({ uart_stopbit: stopbit });
                    }}
                  >
                    {STOPBIT_OPTIONS.map((label, idx) => (
                      <Option key={idx} value={String(idx)}>{label}</Option>
                    ))}
                  </Dropdown>
                </div>

                {/* Zigbee row �?mode is configurable but baudrate/parity/stopbit are hardware-fixed */}
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 72px 58px 60px 42px', gap: '4px', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Zigbee :</span>
                  <Dropdown
                    size="small"
                    value={String(commSettings.COM1_Config ?? 0)}
                    disabled
                    onOptionSelect={(_, data) => {
                      const v = Number(data.optionValue);
                      setCommSettings({ ...commSettings, COM1_Config: v });
                      updateSettings({ com1_config: v });
                    }}
                  >
                    {COM_PORT_MODES.map((label, idx) => (
                      <Option key={idx} value={String(idx)}>{label}</Option>
                    ))}
                  </Dropdown>
                  <Input size="small" value="19200" disabled />
                  <Input size="small" value="8" disabled />
                  <Dropdown size="small" style={{ width: '100%', minWidth: 0 }} value={String(commSettings.UART_Parity1 ?? 0)} disabled>
                    {PARITY_OPTIONS.map((label, idx) => (
                      <Option key={idx} value={String(idx)}>{label}</Option>
                    ))}
                  </Dropdown>
                  <Dropdown size="small" style={{ width: '100%', minWidth: 0 }} value={String(commSettings.UART_Stopbit1 ?? 0)} disabled>
                    {STOPBIT_OPTIONS.map((label, idx) => (
                      <Option key={idx} value={String(idx)}>{label}</Option>
                    ))}
                  </Dropdown>
                </div>

                {/* RS485 Main row */}
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 72px 58px 60px 42px', gap: '4px', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>RS485 Main</span>
                  <Dropdown
                    size="small"
                    value={String(commSettings.COM2_Config ?? 0)}
                    onOptionSelect={(_, data) => {
                      const v = Number(data.optionValue);
                      setCommSettings({ ...commSettings, COM2_Config: v });
                      updateSettings({ com2_config: v });
                    }}
                  >
                    {COM_PORT_MODES.map((label, idx) => (
                      <Option key={idx} value={String(idx)}>{label}</Option>
                    ))}
                  </Dropdown>
                  <Dropdown
                    size="small"
                    style={{ width: '100%', minWidth: 0 }}
                    value={String(commSettings.COM_Baudrate2 ?? 9)}
                    onOptionSelect={(_, data) => {
                      const v = Number(data.optionValue);
                      setCommSettings({ ...commSettings, COM_Baudrate2: v });
                      updateSettings({ com_baudrate2: v });
                    }}
                  >
                    {BAUDRATE_OPTIONS.map((baud, idx) => (
                      <Option key={idx} value={String(idx)} text={String(baud)}>{baud}</Option>
                    ))}
                  </Dropdown>
                  <Input size="small" value="8" disabled />
                  <Dropdown
                    size="small"
                    style={{ width: '100%', minWidth: 0 }}
                    value={String(commSettings.UART_Parity2 ?? 0)}
                    onOptionSelect={(_, data) => {
                      const v = Number(data.optionValue);
                      const parity = [commSettings.UART_Parity0 ?? 0, commSettings.UART_Parity1 ?? 0, v];
                      setCommSettings({ ...commSettings, UART_Parity2: v });
                      updateSettings({ uart_parity: parity });
                    }}
                  >
                    {PARITY_OPTIONS.map((label, idx) => (
                      <Option key={idx} value={String(idx)}>{label}</Option>
                    ))}
                  </Dropdown>
                  <Dropdown
                    size="small"
                    style={{ width: '100%', minWidth: 0 }}
                    value={String(commSettings.UART_Stopbit2 ?? 0)}
                    onOptionSelect={(_, data) => {
                      const v = Number(data.optionValue);
                      const stopbit = [commSettings.UART_Stopbit0 ?? 0, commSettings.UART_Stopbit1 ?? 0, v];
                      setCommSettings({ ...commSettings, UART_Stopbit2: v });
                      updateSettings({ uart_stopbit: stopbit });
                    }}
                  >
                    {STOPBIT_OPTIONS.map((label, idx) => (
                      <Option key={idx} value={String(idx)}>{label}</Option>
                    ))}
                  </Dropdown>
                </div>

                <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                  <Checkbox
                    label="Fixed Serial Port Configuration"
                    size="medium"
                    checked={(commSettings.Fix_COM_Config ?? 0) !== 0}
                    onChange={(_, data) => {
                      const v = data.checked ? 1 : 0;
                      setCommSettings({ ...commSettings, Fix_COM_Config: v });
                      updateSettings({ fix_com_config: v });
                    }}
                  />
                </div>

                <div className={styles.horizontalField}>
                  <label>Zigbee Pan ID :</label>
                  <Input
                    size="small"
                    type="number"
                    value={String(commSettings.Zigbee_Pan_ID ?? 0)}
                    onChange={(_, data) => {
                      const v = Number(data.value);
                      setCommSettings({ ...commSettings, Zigbee_Pan_ID: v });
                      updateSettings({ zigbee_panid: v });
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <Button size="small" appearance="secondary" disabled>
                    Zigbee Information
                  </Button>
                  <Button size="small" appearance="secondary">
                    Network Health
                  </Button>
                </div>
              </div>
            </div>

            <div className={styles.actionsSection}>
              <div className={styles.actionButtons}>
                <Button appearance="primary" icon={<SaveRegular />} onClick={handleSaveNetworkValidated} className={styles.saveButton}>
                  Save Network Settings
                </Button>
                <Button appearance="primary" icon={<SaveRegular />} onClick={handleSaveCommunication} className={styles.saveButton}>
                  Save Communication Settings
                </Button>
              </div>
            </div>
          </>
        );

      case 'time':
        return (
          <>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Time Configuration</div>
              <div className={styles.formGrid}>
                <Field label="Time Zone (minutes offset)">
                  <Input
                    type="number"
                    value={String(timeSettings.Time_Zone ?? 0)}
                    onChange={(_, data) => {
                      const v = Number(data.value);
                      setTimeSettings({ ...timeSettings, Time_Zone: v });
                      updateSettings({ time_zone: v });
                    }}
                  />
                </Field>
                <Field label="SNTP Server">
                  <Input
                    value={timeSettings.SNTP_Server ?? ''}
                    onChange={(_, data) => {
                      setTimeSettings({ ...timeSettings, SNTP_Server: data.value });
                      updateSettings({ sntp_server: data.value });
                    }}
                  />
                </Field>
                <Field label="Enable SNTP">
                  <Switch
                    checked={timeSettings.Enable_SNTP === 2}
                    onChange={(_, data) => {
                      const v = data.checked ? 2 : 1;
                      setTimeSettings({ ...timeSettings, Enable_SNTP: v });
                      updateSettings({ en_sntp: v });
                    }}
                  />
                </Field>
                <Field label="Time Sync Source">
                  <Dropdown
                    value={String(timeSettings.Time_Sync_Auto_Manual ?? 0)}
                    onOptionSelect={(_, data) => {
                      const v = Number(data.optionValue);
                      setTimeSettings({ ...timeSettings, Time_Sync_Auto_Manual: v });
                      updateSettings({ time_sync_auto_manual: v });
                    }}
                  >
                    <Option value="0">NTP Server (Auto)</Option>
                    <Option value="1">PC Sync (Manual)</Option>
                  </Dropdown>
                </Field>
                <Field label="Enable DST">
                  <Switch
                    checked={timeSettings.Time_Zone_Summer_Daytime === 1}
                    onChange={(_, data) => {
                      const v = data.checked ? 1 : 0;
                      setTimeSettings({ ...timeSettings, Time_Zone_Summer_Daytime: v });
                      updateSettings({ time_zone_summer_daytime: v });
                    }}
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
                      onChange={(_, data) => {
                        const v = Number(data.value);
                        setTimeSettings({ ...timeSettings, Start_Month: v });
                        updateSettings({ start_month: v });
                      }}
                    />
                  </Field>
                  <Field label="DST Start Day">
                    <Input
                      type="number"
                      value={String(timeSettings.Start_Day ?? 1)}
                      onChange={(_, data) => {
                        const v = Number(data.value);
                        setTimeSettings({ ...timeSettings, Start_Day: v });
                        updateSettings({ start_day: v });
                      }}
                    />
                  </Field>
                  <Field label="DST End Month">
                    <Input
                      type="number"
                      value={String(timeSettings.End_Month ?? 11)}
                      onChange={(_, data) => {
                        const v = Number(data.value);
                        setTimeSettings({ ...timeSettings, End_Month: v });
                        updateSettings({ end_month: v });
                      }}
                    />
                  </Field>
                  <Field label="DST End Day">
                    <Input
                      type="number"
                      value={String(timeSettings.End_Day ?? 1)}
                      onChange={(_, data) => {
                        const v = Number(data.value);
                        setTimeSettings({ ...timeSettings, End_Day: v });
                        updateSettings({ end_day: v });
                      }}
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
                  onChange={(_, data) => {
                    const v = data.checked ? 2 : 1;
                    setDyndnsSettings({ ...dyndnsSettings, Enable_DynDNS: v });
                    updateSettings({ en_dyndns: v });
                  }}
                />
              </Field>

              {dyndnsSettings.Enable_DynDNS === 2 && (
                <div className={styles.formGrid}>
                  <Field label="Provider">
                    <Dropdown
                      value={String(dyndnsSettings.DynDNS_Provider ?? 0)}
                      onOptionSelect={(_, data) => {
                        const v = Number(data.optionValue);
                        setDyndnsSettings({ ...dyndnsSettings, DynDNS_Provider: v });
                        updateSettings({ dyndns_provider: v });
                      }}
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
                      onChange={(_, data) => {
                        const v = Number(data.value);
                        setDyndnsSettings({ ...dyndnsSettings, DynDNS_Update_Time: v });
                        updateSettings({ dyndns_update_time: v });
                      }}
                    />
                  </Field>
                  <Field label="Username">
                    <Input
                      value={dyndnsSettings.DynDNS_User ?? ''}
                      onChange={(_, data) => {
                        setDyndnsSettings({ ...dyndnsSettings, DynDNS_User: data.value });
                        updateSettings({ dyndns_user: data.value });
                      }}
                    />
                  </Field>
                  <Field label="Password">
                    <Input
                      type="password"
                      value={dyndnsSettings.DynDNS_Pass ?? ''}
                      onChange={(_, data) => {
                        setDyndnsSettings({ ...dyndnsSettings, DynDNS_Pass: data.value });
                        updateSettings({ dyndns_pass: data.value });
                      }}
                    />
                  </Field>
                  <Field label="Domain">
                    <Input
                      value={dyndnsSettings.DynDNS_Domain ?? ''}
                      onChange={(_, data) => {
                        setDyndnsSettings({ ...dyndnsSettings, DynDNS_Domain: data.value });
                        updateSettings({ dyndns_domain: data.value });
                      }}
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
      {/* Tab Container */}
      <div className={styles.tabContainer}>
        {/* Tab Header with Refresh Button */}
        <div className={styles.tabHeader}>
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

          {/* Refresh Button */}
          {selectedDevice && (
            <Button
              appearance="subtle"
              icon={<ArrowClockwiseRegular />}
              onClick={handleRefresh}
              disabled={loading}
              className={styles.refreshButton}
              title="Refresh settings from device"
            >
              Refresh
            </Button>
          )}
        </div>

        {/* Tab Content Wrapper */}
        <div className={styles.tabContentWrapper}>
          {/* Tab Content - Scrollable Area */}
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

            {/* Loading Message */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', marginBottom: '12px' }}>
                <Spinner size="extra-tiny" style={{ fontSize: '12px' }} />
                <Text style={{ color: '#0078d4', fontSize: '12px' }}>Refreshing settings from device...</Text>
              </div>
            )}

            {/* Disable all fields when loading */}
            <fieldset disabled={loading} style={{ border: 'none', margin: 0, padding: 0 }}>
              {renderTabContent()}
            </fieldset>
          </div>

          {/* Actions Section - Sticky Bottom */}
          {selectedDevice && selectedTab === 'basic' && (
            <div className={styles.actionsSection}>
              <div className={styles.actionButtons}>
                <Button appearance="secondary" icon={<InfoRegular />} disabled={loading} style={{ fontWeight: 'normal', fontSize: '12px' }}>
                  Identify Device
                </Button>
                <Button appearance="secondary" icon={<DeleteRegular />} disabled={loading} style={{ fontWeight: 'normal', fontSize: '12px' }}>
                  Clear Device
                </Button>
                <Button appearance="secondary" icon={<BroomRegular />} disabled={loading} style={{ fontWeight: 'normal', fontSize: '12px' }}>
                  Clear Subnet Database
                </Button>
                <Button
                  appearance="secondary"
                  icon={<PowerRegular />}
                  onClick={() => setShowRebootDialog(true)}
                  disabled={loading || !selectedDevice}
                  style={{ fontWeight: '600', color: '#d13438', borderColor: '#d13438' }}
                >
                  Reboot Device
                </Button>
                <Button appearance="secondary" icon={<SaveRegular />} disabled={loading} style={{ fontWeight: 'normal', fontSize: '12px' }}>
                  Done
                </Button>
              </div>
            </div>
          )}
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
                  <Text style={{ display: 'block', marginBottom: '8px', color: '#d13438' }}>
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
              <Button size="small" appearance="secondary" onClick={() => setShowRebootDialog(false)} disabled={rebootCountdown > 0} style={{ fontWeight: 'normal', fontSize: '13px' }}>
                Cancel
              </Button>
              <Button size="small" appearance="primary" onClick={handleRebootDevice} disabled={rebootCountdown > 0} style={{ fontWeight: 'normal', fontSize: '13px' }}>
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
