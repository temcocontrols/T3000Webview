/**
 * SettingsPageMobile
 *
 * Mobile settings page — reuses all PC logic (state, API calls, sub-tab components)
 * from the existing SettingsPage, only replaces the layout/shell.
 *
 * Layout:
 *   - Tab bar: shows first 4 tabs inline, overflow (▼) opens a dropdown for the rest
 *   - Content: scrollable, single-column
 *   - Sticky footer: Identify / Clear / Clear Subnet / 🔴 Reboot / Done (all tabs)
 *   - Each data tab has its own inline 💾 Save button above the footer
 *
 * PC version (SettingsPage.tsx) is NOT touched.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  Option,
  Spinner,
  Text,
  tokens,
  makeStyles,
} from '@fluentui/react-components';
import {
  SaveRegular,
  PowerRegular,
  BroomRegular,
  DeleteRegular,
  InfoRegular,
  ChevronDownRegular,
  DismissRegular,
} from '@fluentui/react-icons';
import { useMobilePage } from '../../../layout/MobilePageContext';
import { useDeviceTreeStore } from '@t3-react/features/devices/store/deviceTreeStore';
import { SettingsRefreshApi, type DeviceSettings } from '@t3-react/features/settings/services/settingsRefreshApi';
import { SettingsUpdateApi } from '@t3-react/features/settings/services/settingsUpdateApi';
import { TimeSettingsTab, type TimeSettings } from '@t3-react/features/settings/components/TimeSettingsTab';
import { DyndnsSettingsTab, type DyndnsSettings } from '@t3-react/features/settings/components/DyndnsSettingsTab';
import { EmailSettingsTab, type EmailSettings } from '@t3-react/features/settings/components/EmailSettingsTab';
import { UserLoginTab, type UserLoginSettings } from '@t3-react/features/settings/components/UserLoginTab';
import { ExpansionIOTab, type ExpansionIOSettings } from '@t3-react/features/settings/components/ExpansionIOTab';
import { AdvancedSettingsDialog } from '@t3-react/features/settings/components/AdvancedSettingsDialog';
import { WifiSettingsDialog } from '@t3-react/features/settings/components/WifiSettingsDialog';
import { NetworkHealthDialog } from '@t3-react/features/settings/components/NetworkHealthDialog';

// ─── Constants (same as PC) ───────────────────────────────────────────────────

const BAUDRATE_OPTIONS = [1200,2400,3600,4800,7200,9600,19200,38400,76800,115200,921600,57600];
const COM_PORT_MODES   = ['Unused','BACnet MSTP Slave','Modbus Slave','BACnet PTP','GSM','Main Zigbee','Sub Zigbee','Modbus Master','RS232 Meter','BACnet MSTP Master'];
const PARITY_OPTIONS   = ['None','Odd','Even'];
const STOPBIT_OPTIONS  = ['1','0.5','2','1.5'];
const RS485_MODES_UNFIXED = [{ value: 0, label: 'Unused' },{ value: 1, label: 'Bacnet Mstp' },{ value: 2, label: 'Modbus' }];
const RS485_MODES_FIXED   = [{ value: 0, label: 'Unused' },{ value: 1, label: 'Bacnet Mstp' },{ value: 7, label: 'Modbus Master' },{ value: 2, label: 'Modbus Slave' }];

type TabValue = 'basic' | 'communication' | 'time' | 'dyndns' | 'email' | 'users' | 'expansion';

const TABS: { value: TabValue; label: string; short: string }[] = [
  { value: 'basic',         label: 'Basic Information', short: 'Basic'   },
  { value: 'communication', label: 'Communication',     short: 'Comms'   },
  { value: 'time',          label: 'Time',              short: 'Time'    },
  { value: 'dyndns',        label: 'Dyndns',            short: 'DNS'     },
  { value: 'email',         label: 'Email',             short: 'Email'   },
  { value: 'users',         label: 'User Login',        short: 'Login'   },
  { value: 'expansion',     label: 'Expansion IO',      short: 'Exp IO'  },
];

// How many tabs to show inline before the overflow ▼ button
const INLINE_TAB_COUNT = 3;

// ─── Interfaces (same as PC) ──────────────────────────────────────────────────

interface NetworkSettings   { IP_Address?: string; Subnet?: string; Gateway?: string; MAC_Address?: string; TCP_Type?: number; }
interface CommunicationSettings { COM0_Config?: number; COM1_Config?: number; COM2_Config?: number; COM_Baudrate0?: number; COM_Baudrate1?: number; COM_Baudrate2?: number; UART_Parity0?: number; UART_Parity1?: number; UART_Parity2?: number; UART_Stopbit0?: number; UART_Stopbit1?: number; UART_Stopbit2?: number; Fix_COM_Config?: number; Zigbee_Pan_ID?: number; Zigbee_Exist?: number; }
interface ProtocolSettings  { Modbus_ID?: number; Modbus_Port?: number; MSTP_ID?: number; MSTP_Network_Number?: number; Max_Master?: number; Object_Instance?: number; BBMD_Enable?: number; Network_Number?: number; }
interface HardwareInfo      { Hardware_Rev?: string; Firmware0_Rev_Main?: number; Firmware0_Rev_Sub?: number; Firmware1_Rev?: number; Firmware2_Rev?: number; Bootloader_Rev?: number; Mini_Type?: number; MiniTypeName?: string; Panel_Type?: number; USB_Mode?: number; SD_Exist?: number; }
interface FeatureFlags      { User_Name_Enable?: number; Customer_Unite_Enable?: number; Enable_Panel_Name?: number; LCD_Display?: number; }
interface DeviceInfo        { SerialNumber?: number; PanelId?: string; Panel_Number?: number; }

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
    position: 'relative',
  },

  // ── Tab bar ──────────────────────────────────────────────────────────────
  tabBar: {
    display: 'flex',
    alignItems: 'stretch',
    borderBottom: `1px solid #edebe9`,
    backgroundColor: '#fafafa',
    flexShrink: 0,
    position: 'relative',   // anchor for dropdown without clipping
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    padding: '10px 4px',
    border: 'none',
    borderBottom: '2px solid transparent',
    borderRadius: 0,
    boxShadow: 'none',
    outline: 'none',
    background: 'none',
    fontSize: '12px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground3,
    transition: 'color 0.15s, border-color 0.15s',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    ':hover': { color: tokens.colorNeutralForeground1 },
  },
  tabItemActive: {
    color: tokens.colorBrandForeground1,
    fontWeight: 600,
    borderBottomColor: tokens.colorBrandForeground1,
  },
  overflowBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    padding: '0 12px',
    border: 'none',
    borderBottom: '2px solid transparent',
    borderRadius: 0,
    boxShadow: 'none',
    outline: 'none',
    background: 'none',
    fontSize: '12px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
    alignSelf: 'stretch',
    ':hover': { color: tokens.colorNeutralForeground1, backgroundColor: '#f0f0f0' },
  },
  overflowBtnActive: {
    color: tokens.colorBrandForeground1,
    fontWeight: 600,
  },

  // ── Overflow dropdown ─────────────────────────────────────────────────────
  dropdownOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 199,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: '0',
    zIndex: 200,
    backgroundColor: '#ffffff',
    border: `1px solid #edebe9`,
    borderRadius: '4px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    minWidth: '180px',
    overflow: 'hidden',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
    fontSize: '13px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground1,
    ':hover': { backgroundColor: '#f5f5f5' },
  },
  dropdownItemActive: {
    color: tokens.colorBrandForeground1,
    fontWeight: 600,
  },
  checkmark: {
    fontSize: '11px',
    color: tokens.colorBrandForeground1,
  },

  // ── Content area ──────────────────────────────────────────────────────────
  content: {
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    padding: '0 0 8px 0',
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: { marginBottom: '0' },
  sectionHead: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: tokens.colorNeutralForeground3,
    backgroundColor: '#f5f5f5',
    padding: '8px 16px',
    borderTop: `1px solid #edebe9`,
    borderBottom: `1px solid #edebe9`,
    textTransform: 'uppercase',
  },

  // ── Field row (read-only) ─────────────────────────────────────────────────
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: `1px solid #f3f2f1`,
    fontSize: '13px',
  },
  fieldLabel: {
    color: tokens.colorNeutralForeground2,
    flexShrink: 0,
    marginRight: '12px',
  },
  fieldValue: {
    color: tokens.colorNeutralForeground1,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },

  // ── Editable field row ────────────────────────────────────────────────────
  editRow: {
    padding: '10px 16px',
    borderBottom: `1px solid #f3f2f1`,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  editLabel: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
  },

  // ── Checkbox row ──────────────────────────────────────────────────────────
  checkRow: {
    padding: '12px 16px',
    borderBottom: `1px solid #f3f2f1`,
    fontSize: '13px',
  },

  // ── Inline save ───────────────────────────────────────────────────────────
  inlineSave: {
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'flex-end',
    borderBottom: `1px solid #edebe9`,
  },

  // ── LCD Options ───────────────────────────────────────────────────────────
  lcdRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
    padding: '10px 16px',
    borderBottom: `1px solid #f3f2f1`,
  },
  lcdLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  lcdUnit: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },

  // ── Status / message banners ──────────────────────────────────────────────
  banner: {
    margin: '8px 16px',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  bannerError:   { backgroundColor: '#fef6f6', color: '#d13438' },
  bannerSuccess: { backgroundColor: '#f0f9ff', color: '#0078d4' },

  // ── Sticky footer ─────────────────────────────────────────────────────────
  footer: {
    flexShrink: 0,
    borderTop: `1px solid #edebe9`,
    backgroundColor: '#fafafa',
    padding: '10px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  footerRow: {
    display: 'flex',
    gap: '8px',
  },
  footerBtn: {
    flex: 1,
    fontSize: '12px',
  },

  // ── Loading / empty states ────────────────────────────────────────────────
  centered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    gap: '12px',
    textAlign: 'center',
  },

  // ── Wrapping for sub-tab components ──────────────────────────────────────
  subTabWrap: {
    padding: '0',
    '& > *': { fontSize: '13px' },
  },

  // ── Inner port tab bar (Serial Port Config) ───────────────────────────────
  portTabBar: {
    display: 'flex',
    borderBottom: `2px solid #edebe9`,
    margin: '0 16px',
    marginTop: '4px',
  },
  portTabItem: {
    flex: 1,
    padding: '8px 4px',
    border: 'none',
    borderBottom: '2px solid transparent',
    borderRadius: 0,
    boxShadow: 'none',
    outline: 'none',
    background: 'none',
    fontSize: '12px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    marginBottom: '-2px',
    ':hover': { color: tokens.colorNeutralForeground1 },
  },
  portTabItemActive: {
    color: tokens.colorBrandForeground1,
    fontWeight: 600,
    borderBottomColor: tokens.colorBrandForeground1,
  },
  portGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px 10px',
    padding: '12px 16px',
    borderBottom: `1px solid #f3f2f1`,
    overflow: 'hidden',
  },
  portGridCell: {
    minWidth: 0,
    overflow: 'hidden',
  },
  portGridLabel: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground2,
    marginBottom: '3px',
  },

  // ── Misc structural divs ──────────────────────────────────────────────────
  overflowAnchor: {
    position: 'relative',
    display: 'flex',
    alignItems: 'stretch',
  },
  loadingRow: {
    padding: '6px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  fieldsetReset: {
    border: 'none',
    margin: '0',
    padding: '0',
  },

  // ── Reboot dialog ─────────────────────────────────────────────────────────
  dialogBackdrop: {
    position: 'fixed',
    inset: '0',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: '300',
    display: 'flex',
    alignItems: 'flex-end',
  },
  dialogSheet: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: '12px 12px 0 0',
    padding: '24px 20px 32px',
  },
  dialogButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  dialogBtn: {
    flex: '1',
  },
  dialogBtnDanger: {
    flex: '1',
  },
  rebootBtnDanger: {
    flex: '1',
  },
});

// ─── Main component ───────────────────────────────────────────────────────────

export const SettingsPageMobile: React.FC = () => {
  const styles = useStyles();
  const { selectedDevice, devices, selectDevice, updateDevice } = useDeviceTreeStore();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabValue>(
    () => (localStorage.getItem('t3-settings-tab') as TabValue) ?? 'basic'
  );
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showRebootDialog, setShowRebootDialog] = useState(false);
  const [rebootCountdown, setRebootCountdown] = useState(0);
  const [showWifiDialog, setShowWifiDialog] = useState(false);
  const [portTab, setPortTab] = useState<'sub' | 'zigbee' | 'main'>('sub');
  const [showNetworkHealthDialog, setShowNetworkHealthDialog] = useState(false);
  const [showRS485WarnDialog, setShowRS485WarnDialog] = useState(false);
  const [rs485WarnCountdown, setRs485WarnCountdown] = useState(3);
  const pendingRS485Action = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  useEffect(() => {
    if (!showRS485WarnDialog) return;
    setRs485WarnCountdown(3);
    const interval = setInterval(() => {
      setRs485WarnCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowRS485WarnDialog(false);
          pendingRS485Action.current?.();
          pendingRS485Action.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showRS485WarnDialog]);

  // ── Settings state (mirrors PC SettingsPage) ───────────────────────────────
  const [settings, setSettings] = useState<DeviceSettings | null>(null);
  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>({});
  const [commSettings, setCommSettings] = useState<CommunicationSettings>({});
  const [protocolSettings, setProtocolSettings] = useState<ProtocolSettings>({});
  const [timeSettings, setTimeSettings] = useState<TimeSettings>({});
  const [dyndnsSettings, setDyndnsSettings] = useState<DyndnsSettings>({});
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({});
  const [userLoginSettings, setUserLoginSettings] = useState<UserLoginSettings>({ users: [], enable_user_list: 1 });
  const [expansionSettings, setExpansionSettings] = useState<ExpansionIOSettings>({ devices: [] });
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo>({});
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({ LCD_Display: 0 });
  const [lcdDelaySeconds, setLcdDelaySeconds] = useState<number>(30);
  const [showAdvancedSettingsDialog, setShowAdvancedSettingsDialog] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({});

  // Auto-select first device if none selected
  useEffect(() => {
    if (!selectedDevice && devices.length > 0) selectDevice(devices[0]);
  }, [selectedDevice, devices, selectDevice]);

  // ── External settings fetch (email / users / expansion) ───────────────────
  const fetchExternalSettings = useCallback(async (serialNumber: number) => {
    const base = 'http://localhost:9103/api/t3_device';
    try {
      const res = await fetch(`${base}/devices/${serialNumber}/settings/email`);
      if (res.ok) {
        const json = await res.json();
        const d = json?.data ?? json;
        setEmailSettings({
          smtp_domain: d.SmtpServer ?? d.smtp_domain ?? '',
          smtp_port: d.SmtpPort ?? d.smtp_port ?? 25,
          email_address: d.EmailAddress ?? d.email_address ?? '',
          user_name: d.UserName ?? d.user_name ?? '',
          password: d.Password ?? d.password ?? '',
          secure_connection_type: d.SecureConnectionType ?? d.secure_connection_type ?? 0,
          To1Addr: d.To1Addr ?? d.to1_addr ?? '',
          To2Addr: d.To2Addr ?? d.to2_addr ?? '',
          error_code: d.ErrorCode ?? d.error_code ?? 0,
        });
      }
    } catch {}
    try {
      const res = await fetch(`${base}/users/${serialNumber}`);
      if (res.ok) {
        const data = await res.json();
        setUserLoginSettings(prev => ({ ...prev, users: Array.isArray(data) ? data : [] }));
      }
    } catch {}
    try {
      const res = await fetch(`${base}/devices/${serialNumber}/settings/expansion-io`);
      if (res.ok) {
        const json = await res.json();
        const raw: any[] = Array.isArray(json) ? json : (json?.data ?? []);
        setExpansionSettings({ devices: raw.map((r: any) => ({
          product_id: r.ProductId ?? r.product_id ?? 0,
          port: r.Port ?? r.port ?? 0,
          modbus_id: r.ModbusId ?? r.modbus_id ?? 0,
          last_contact_time: r.LastContactTime ?? r.last_contact_time ?? 0,
          input_start: r.InputStart ?? r.input_start ?? 0,
          input_end: r.InputEnd ?? r.input_end ?? 0,
          output_start: r.OutputStart ?? r.output_start ?? 0,
          output_end: r.OutputEnd ?? r.output_end ?? 0,
        }))});
      }
    } catch {}
  }, []);

  // ── Main settings fetch ───────────────────────────────────────────────────
  const applySettings = (s: DeviceSettings) => {
    setSettings(s);
    setNetworkSettings({ IP_Address: s.ip_addr, Subnet: s.subnet, Gateway: s.gate_addr, MAC_Address: s.mac_addr, TCP_Type: s.tcp_type });
    setCommSettings({ COM0_Config: s.com0_config, COM1_Config: s.com1_config, COM2_Config: s.com2_config, COM_Baudrate0: s.com_baudrate0, COM_Baudrate1: s.com_baudrate1, COM_Baudrate2: s.com_baudrate2, UART_Parity0: s.uart_parity?.[0], UART_Parity1: s.uart_parity?.[1], UART_Parity2: s.uart_parity?.[2], UART_Stopbit0: s.uart_stopbit?.[0], UART_Stopbit1: s.uart_stopbit?.[1], UART_Stopbit2: s.uart_stopbit?.[2], Fix_COM_Config: s.fix_com_config, Zigbee_Pan_ID: s.zigbee_panid, Zigbee_Exist: s.zegbee_exsit });
    setProtocolSettings({ Modbus_ID: s.modbus_id, MSTP_ID: s.mstp_id, MSTP_Network_Number: s.mstp_network_number, Max_Master: s.max_master, Object_Instance: s.object_instance, Network_Number: s.network_number | (s.network_number_hi << 8) });
    setTimeSettings({ Time_Zone: s.time_zone, Time_Zone_Summer_Daytime: s.time_zone_summer_daytime, Enable_SNTP: s.en_sntp, SNTP_Server: s.sntp_server, Time_Sync_Auto_Manual: s.time_sync_auto_manual, Start_Month: s.start_month, Start_Day: s.start_day, End_Month: s.end_month, End_Day: s.end_day });
    setDyndnsSettings({ Enable_DynDNS: s.en_dyndns, DynDNS_Provider: s.dyndns_provider, DynDNS_User: s.dyndns_user, DynDNS_Pass: s.dyndns_pass, DynDNS_Domain: s.dyndns_domain, DynDNS_Update_Time: s.dyndns_update_time });
    setUserLoginSettings(prev => ({ ...prev, enable_user_list: s.user_name ?? 1 }));
    setHardwareInfo({ Mini_Type: s.mini_type, MiniTypeName: s.MiniTypeName, Panel_Type: s.panel_type, USB_Mode: s.usb_mode, SD_Exist: s.sd_exist, Hardware_Rev: String(s.harware_rev), Firmware0_Rev_Main: s.firmware0_rev_main, Firmware0_Rev_Sub: s.firmware0_rev_sub, Firmware1_Rev: s.frimware1_rev, Firmware2_Rev: s.frimware2_rev, Bootloader_Rev: s.bootloader_rev });
    setFeatureFlags({ User_Name_Enable: s.user_name, Customer_Unite_Enable: s.custmer_unite, Enable_Panel_Name: s.en_panel_name, LCD_Display: s.LCD_Display });
    if (s.LCD_Display > 0 && s.LCD_Display < 255) setLcdDelaySeconds(s.LCD_Display);
    setDeviceInfo({ SerialNumber: s.n_serial_number, PanelId: s.panel_name, Panel_Number: s.panel_number });
  };

  const fetchSettings = useCallback(async () => {
    if (!selectedDevice) return;
    setLoading(true);
    setError(null);
    try {
      let s = await SettingsRefreshApi.loadFromDB(selectedDevice.serialNumber);
      if (!s) {
        const result = await SettingsRefreshApi.refreshFromDevice(selectedDevice.serialNumber);
        if (!result.success || !result.data) throw new Error(result.message || 'Failed to load settings');
        s = result.data;
      }
      applySettings(s);
      void fetchExternalSettings(selectedDevice.serialNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, fetchExternalSettings]);

  const handleRefresh = useCallback(async () => {
    if (!selectedDevice) return;
    setLoading(true);
    setError(null);
    try {
      const result = await SettingsRefreshApi.refreshFromDevice(selectedDevice.serialNumber);
      if (!result.success || !result.data) throw new Error(result.message);
      applySettings(result.data);
      void fetchExternalSettings(selectedDevice.serialNumber);
      setSuccessMessage('Settings refreshed from device');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, fetchExternalSettings]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  useMobilePage({ title: 'Settings', onRefresh: handleRefresh });

  const updateSettings = (updates: Partial<DeviceSettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...updates });
  };

  // ── Tab selection ─────────────────────────────────────────────────────────
  const selectTab = (tab: TabValue) => {
    setActiveTab(tab);
    localStorage.setItem('t3-settings-tab', tab);
    setError(null);
    setSuccessMessage(null);
    setOverflowOpen(false);
  };

  const isOverflowActive = TABS.slice(INLINE_TAB_COUNT).some(t => t.value === activeTab);

  // ── Save handlers ─────────────────────────────────────────────────────────
  const runSave = async (fn: () => Promise<void>) => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try { await fn(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setLoading(false); }
  };

  const handleSaveBasic = async () => {
    if (!selectedDevice || !settings) return;
    await runSave(async () => {
      const networkNum = protocolSettings.Network_Number ?? 0;
      const merged: DeviceSettings = { ...settings, object_instance: protocolSettings.Object_Instance ?? settings.object_instance, modbus_id: protocolSettings.Modbus_ID ?? settings.modbus_id, mstp_id: protocolSettings.MSTP_ID ?? settings.mstp_id, mstp_network_number: protocolSettings.MSTP_Network_Number ?? settings.mstp_network_number, max_master: protocolSettings.Max_Master ?? settings.max_master, network_number: networkNum & 0xFF, network_number_hi: (networkNum >> 8) & 0xFF, mac_addr: networkSettings.MAC_Address ?? settings.mac_addr, panel_number: deviceInfo.Panel_Number ?? settings.panel_number, panel_name: deviceInfo.PanelId ?? settings.panel_name, LCD_Display: featureFlags.LCD_Display ?? settings.LCD_Display };
      const v = SettingsUpdateApi.validateSettings(merged);
      if (!v.valid) throw new Error(v.errors.join(', '));
      const result = await SettingsUpdateApi.updateDeviceSettings(merged);
      if (!result.success) throw new Error(result.error || 'Failed');
      setSettings(merged);
      setSuccessMessage('Basic information saved');
      if (merged.panel_name) { try { await updateDevice(selectedDevice.serialNumber, { showLabelName: merged.panel_name }); } catch {} }
    });
  };

  const handleSaveComm = async () => {
    if (!selectedDevice || !settings) return;
    await runSave(async () => {
      const v = SettingsUpdateApi.validateSettings(settings);
      if (!v.valid) throw new Error(v.errors.join(', '));
      const result = await SettingsUpdateApi.updateDeviceSettings(settings);
      if (!result.success) throw new Error(result.error || 'Failed');
      setSuccessMessage('Communication settings saved');
      await fetchSettings();
    });
  };

  const validateNetworkSettings = (): string | null => {
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (networkSettings.IP_Address && !ipRegex.test(networkSettings.IP_Address)) return 'Invalid IP Address format';
    if (networkSettings.Subnet && !ipRegex.test(networkSettings.Subnet)) return 'Invalid Subnet Mask format';
    if (networkSettings.Gateway && !ipRegex.test(networkSettings.Gateway)) return 'Invalid Gateway format';
    return null;
  };

  const handleSaveNetworkValidated = async () => {
    const err = validateNetworkSettings();
    if (err) { setError(err); return; }
    await runSave(async () => {
      if (!settings) return;
      const v = SettingsUpdateApi.validateSettings(settings);
      if (!v.valid) throw new Error(v.errors.join(', '));
      const result = await SettingsUpdateApi.updateDeviceSettings(settings);
      if (!result.success) throw new Error(result.error || 'Failed to update network settings');
      setSuccessMessage('Network settings saved');
      await fetchSettings();
    });
  };

  const handleAdvancedSettingsSave = async (data: { fixComConfig: boolean; writeFlashMinutes: number; maxInput: number; maxOutput: number; maxVariable: number }) => {
    if (!selectedDevice || !settings) return;
    await runSave(async () => {
      const updated: DeviceSettings = { ...settings, fix_com_config: data.fixComConfig ? 1 : 0, write_flash: data.writeFlashMinutes, max_in: data.maxInput, max_out: data.maxOutput, max_var: data.maxVariable };
      const result = await SettingsUpdateApi.updateDeviceSettings(updated);
      if (!result.success) throw new Error(result.error || 'Failed to update advanced settings');
      setSettings(updated);
      setSuccessMessage('Advanced settings updated');
    });
  };

  const handleSaveTime = async () => {
    if (!selectedDevice || !settings) return;
    await runSave(async () => {
      const v = SettingsUpdateApi.validateSettings(settings);
      if (!v.valid) throw new Error(v.errors.join(', '));
      const result = await SettingsUpdateApi.updateDeviceSettings(settings);
      if (!result.success) throw new Error(result.error || 'Failed');
      setSuccessMessage('Time settings saved');
    });
  };

  const handleSyncPC    = async () => { if (!settings) return; updateSettings({ time_update_since_1970: Math.floor(Date.now() / 1000), time_sync_auto_manual: 1 }); await handleSaveTime(); setSuccessMessage('Clock synced with local PC'); };
  const handleSyncNTP   = async () => { if (!settings) return; updateSettings({ reset_default: 99, time_sync_auto_manual: 0 }); await handleSaveTime(); setSuccessMessage('NTP sync command sent'); };
  const handleRefreshTime = async () => { await fetchSettings(); };

  const handleSaveDyndns = async () => {
    if (!selectedDevice || !settings) return;
    await runSave(async () => {
      const result = await SettingsUpdateApi.updateDeviceSettings(settings);
      if (!result.success) throw new Error(result.error || 'Failed');
      setSuccessMessage('Dyndns settings saved');
    });
  };

  const handleSaveEmail = async () => {
    if (!selectedDevice) return;
    await runSave(async () => {
      const body = { smtpServer: emailSettings.smtp_domain, smtpPort: emailSettings.smtp_port, emailAddress: emailSettings.email_address, userName: emailSettings.user_name, password: emailSettings.password, secureConnectionType: emailSettings.secure_connection_type, to1Addr: emailSettings.To1Addr, to2Addr: emailSettings.To2Addr, enable: 1 };
      const res = await fetch(`http://localhost:9103/api/t3_device/devices/${selectedDevice.serialNumber}/settings/email`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.message || 'Failed'); }
      setSuccessMessage('Email settings saved');
    });
  };

  const handleSaveUser = async (index: number, user: import('@t3-react/features/settings/components/UserLoginTab').UserEntry) => {
    if (!selectedDevice) throw new Error('No device selected');
    const res = await fetch(`http://localhost:9103/api/t3_device/users/${selectedDevice.serialNumber}/${index}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: user.name, password: user.password, accessLevel: user.access_level }) });
    if (!res.ok && res.status !== 501) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.message || 'Failed'); }
  };

  const handleDeleteUser = async (index: number) => {
    if (!selectedDevice) throw new Error('No device selected');
    const res = await fetch(`http://localhost:9103/api/t3_device/users/${selectedDevice.serialNumber}/${index}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '', password: '', accessLevel: 1 }) });
    if (!res.ok && res.status !== 501) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.message || 'Failed'); }
  };

  const handleSaveExpansion = async (s: ExpansionIOSettings) => {
    if (!selectedDevice) throw new Error('No device selected');
    const base = `http://localhost:9103/api/t3_device/devices/${selectedDevice.serialNumber}/settings/expansion-io`;
    for (let i = 0; i < s.devices.length; i++) {
      const d = s.devices[i];
      const res = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ extioId: i, productId: d.product_id, port: d.port, modbusId: d.modbus_id, lastContactTime: d.last_contact_time, inputStart: d.input_start, inputEnd: d.input_end, outputStart: d.output_start, outputEnd: d.output_end, enable: 1 }) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.message || `Failed for module ${i}`); }
    }
    setSuccessMessage('Expansion IO saved');
  };

  const handleReboot = async () => {
    if (!selectedDevice) return;
    setShowRebootDialog(false);
    try {
      setRebootCountdown(30);
      const id = setInterval(() => setRebootCountdown(p => { if (p <= 1) { clearInterval(id); return 0; } return p - 1; }), 1000);
      const res = await fetch(`http://localhost:9103/api/t3_device/devices/${selectedDevice.serialNumber}/reboot`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reboot');
      setSuccessMessage('Reboot command sent. Device will restart in 30s…');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reboot failed');
    }
  };

  // ── Loading / no-device states ────────────────────────────────────────────
  if (loading && !settings) {
    return <div className={styles.centered}><Spinner size="extra-tiny" label="Loading settings…" /></div>;
  }

  if (!selectedDevice) {
    return (
      <div className={styles.centered}>
        <Text size={300} weight="semibold">No Device Selected</Text>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Select a device to view settings</Text>
      </div>
    );
  }

  // ── Tab content renderers ─────────────────────────────────────────────────

  const renderBasic = () => (
    <>
      {/* Device Information — read-only */}
      <div className={styles.sectionHead}>Device Information</div>
      {[
        ['Module Number',       hardwareInfo.MiniTypeName ?? (hardwareInfo.Mini_Type != null ? String(hardwareInfo.Mini_Type) : '—')],
        ['Hardware Version',    hardwareInfo.Hardware_Rev ?? '—'],
        ['MCU Version',         hardwareInfo.Firmware0_Rev_Main != null ? `${hardwareInfo.Firmware0_Rev_Main}.${hardwareInfo.Firmware0_Rev_Sub ?? 0}` : '—'],
        ['PIC Version',         hardwareInfo.Firmware1_Rev != null ? String(hardwareInfo.Firmware1_Rev) : '—'],
        ['Top Version',         hardwareInfo.Firmware2_Rev != null ? String(hardwareInfo.Firmware2_Rev) : '—'],
        ['Bootloader Version',  hardwareInfo.Bootloader_Rev != null ? String(hardwareInfo.Bootloader_Rev) : '—'],
        ['MCU Type',            hardwareInfo.Panel_Type != null ? `0x${hardwareInfo.Panel_Type.toString(16).padStart(2,'0')}` : '—'],
        ['SD Card',             hardwareInfo.SD_Exist ? 'SD Card' : 'No SD Card'],
      ].map(([label, value]) => (
        <div key={label} className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{label}</span>
          <span className={styles.fieldValue}>{value}</span>
        </div>
      ))}

      {/* Panel Information — editable */}
      <div className={styles.sectionHead}>Panel Information</div>
      {/* Read-only fields */}
      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>Serial Number</span>
        <span className={styles.fieldValue}>{deviceInfo.SerialNumber ?? '—'}</span>
      </div>
      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>MAC Address</span>
        <span className={styles.fieldValue}>{networkSettings.MAC_Address ?? '—'}</span>
      </div>
      {/* Editable spinners */}
      {[
        { label: 'Bacnet Instance',  val: protocolSettings.Object_Instance ?? 0,       key: 'Object_Instance'     as keyof ProtocolSettings },
        { label: 'MSTP Network',     val: protocolSettings.MSTP_Network_Number ?? 0,   key: 'MSTP_Network_Number' as keyof ProtocolSettings },
        { label: 'Modbus RTU ID',    val: protocolSettings.Modbus_ID ?? 0,             key: 'Modbus_ID'           as keyof ProtocolSettings },
        { label: 'BIP Network',      val: protocolSettings.Network_Number ?? 0,        key: 'Network_Number'      as keyof ProtocolSettings },
        { label: 'Max Master',       val: protocolSettings.Max_Master ?? 127,          key: 'Max_Master'          as keyof ProtocolSettings },
        { label: 'Panel Number',     val: deviceInfo.Panel_Number ?? 0,               key: '_panelNum'           as any },
      ].map(({ label, val, key }) => (
        <div key={label} className={styles.editRow}>
          <span className={styles.editLabel}>{label}</span>
          <Input
            type="number"
            size="small"
            value={String(val)}
            style={{ fontSize: '13px' }}
            onChange={(_, d) => {
              const n = Number(d.value);
              if (key === '_panelNum') { setDeviceInfo(p => ({ ...p, Panel_Number: n })); updateSettings({ panel_number: n }); }
              else { setProtocolSettings(p => ({ ...p, [key]: n })); }
            }}
          />
        </div>
      ))}
      <div className={styles.editRow}>
        <span className={styles.editLabel}>Panel Name</span>
        <Input size="small" value={deviceInfo.PanelId ?? ''} style={{ fontSize: '13px' }} onChange={(_, d) => { setDeviceInfo(p => ({ ...p, PanelId: d.value })); updateSettings({ panel_name: d.value }); }} />
      </div>

      {/* LCD Options */}
      <div className={styles.sectionHead}>LCD Options</div>
      {(() => {
        const fw = (hardwareInfo.Firmware0_Rev_Main ?? 0) * 10 + (hardwareInfo.Firmware0_Rev_Sub ?? 0);
        const isOldFw = fw > 0 && fw < 519;
        const lcdVal = featureFlags.LCD_Display ?? 0;
        const isAlwaysOn  = lcdVal === 255 || (isOldFw && lcdVal === 1);
        const isAlwaysOff = lcdVal === 0;
        const isDelayOff  = !isAlwaysOn && !isAlwaysOff;
        return (
          <>
            <div className={styles.lcdRow}>
              <label className={styles.lcdLabel}>
                <input type="radio" name="lcdMode" checked={isAlwaysOn} onChange={() => setFeatureFlags(f => ({ ...f, LCD_Display: isOldFw ? 1 : 255 }))} />
                LCD Always On
              </label>
              <label className={styles.lcdLabel}>
                <input type="radio" name="lcdMode" checked={isAlwaysOff} onChange={() => setFeatureFlags(f => ({ ...f, LCD_Display: 0 }))} />
                LCD Always Off
              </label>
            </div>
            <div className={styles.lcdRow}>
              <label className={styles.lcdLabel}>
                <input type="radio" name="lcdMode" checked={isDelayOff} onChange={() => { const v = lcdDelaySeconds || 30; setLcdDelaySeconds(v); setFeatureFlags(f => ({ ...f, LCD_Display: v })); }} />
                LCD Delay off
              </label>
              <Input
                type="number"
                size="small"
                value={lcdDelaySeconds > 0 ? String(lcdDelaySeconds) : ''}
                disabled={!isDelayOff}
                style={{ width: '80px', fontSize: '13px' }}
                onChange={(_, d) => {
                  const v = Math.min(254, Math.max(1, Number(d.value) || 1));
                  setLcdDelaySeconds(v);
                  if (isDelayOff) setFeatureFlags(f => ({ ...f, LCD_Display: v }));
                }}
              />
              <span className={styles.lcdUnit}>(s)</span>
            </div>
            <div className={styles.lcdRow}>
              <Button size="small" appearance="secondary" disabled>Parameter</Button>
              <Button size="small" appearance="secondary" onClick={() => setShowAdvancedSettingsDialog(true)}>Advanced Settings</Button>
            </div>
          </>
        );
      })()}
    </>
  );

  const renderComm = () => {
    const fixed = (commSettings.Fix_COM_Config ?? 0) === 1;

    const PORT_TABS = [
      { value: 'sub'    as const, label: 'RS485 SUB'  },
      { value: 'zigbee' as const, label: 'Zigbee'     },
      { value: 'main'   as const, label: 'RS485 Main' },
    ];

    const portConfig = {
      sub:    { configKey: 'COM0_Config' as const, baudrateKey: 'COM_Baudrate0' as const, parityKey: 'UART_Parity0' as const, stopbitKey: 'UART_Stopbit0' as const, isZigbee: false },
      zigbee: { configKey: 'COM1_Config' as const, baudrateKey: 'COM_Baudrate1' as const, parityKey: 'UART_Parity1' as const, stopbitKey: 'UART_Stopbit1' as const, isZigbee: true  },
      main:   { configKey: 'COM2_Config' as const, baudrateKey: 'COM_Baudrate2' as const, parityKey: 'UART_Parity2' as const, stopbitKey: 'UART_Stopbit2' as const, isZigbee: false },
    };

    const { configKey, baudrateKey, parityKey, stopbitKey, isZigbee } = portConfig[portTab];
    const zigbeeDisabled = isZigbee && !commSettings.Zigbee_Exist;
    const rs485Modes = fixed ? RS485_MODES_FIXED : RS485_MODES_UNFIXED;
    const zigbeeModes = COM_PORT_MODES.map((l, i) => ({ value: i, label: l }));
    const modes = isZigbee ? zigbeeModes : rs485Modes;
    const rawVal   = (commSettings[configKey]   ?? 0) as number;
    const modeVal  = (!isZigbee && !fixed && (rawVal === 7 || rawVal === 2)) ? 2 : rawVal;
    const baudIdx  = (commSettings[baudrateKey] ?? 9) as number;
    const parIdx   = (commSettings[parityKey]   ?? 0) as number;
    const stopIdx  = (commSettings[stopbitKey]  ?? 0) as number;
    const modeLabel = modes.find(m => m.value === modeVal)?.label ?? 'Unused';

    const onModeChange = (v: number) => {
      if (isZigbee) {
        setCommSettings(p => ({ ...p, [configKey]: v }));
        updateSettings({ [configKey.toLowerCase()]: v } as any);
      } else {
        pendingRS485Action.current = () => { setCommSettings(p => ({ ...p, [configKey]: v })); updateSettings({ [configKey.toLowerCase()]: v } as any); };
        setShowRS485WarnDialog(true);
      }
    };
    const onBaudChange = (v: number) => {
      if (isZigbee) {
        setCommSettings(p => ({ ...p, [baudrateKey]: v }));
      } else {
        pendingRS485Action.current = () => { setCommSettings(p => ({ ...p, [baudrateKey]: v })); updateSettings({ [baudrateKey.toLowerCase()]: v } as any); };
        setShowRS485WarnDialog(true);
      }
    };

    return (
      <>
        {/* ── IP Address ─────────────────────────────────────────── */}
        <div className={styles.sectionHead}>IP Address</div>
        <div className={styles.checkRow}>
          <label className={styles.lcdLabel}>
            <input
              type="radio"
              name="tcpType"
              checked={(networkSettings.TCP_Type ?? 0) === 1}
              onChange={() => { setNetworkSettings(n => ({ ...n, TCP_Type: 1 })); updateSettings({ tcp_type: 1 }); }}
            />
            Obtain IP Address Automatically
          </label>
        </div>
        <div className={styles.checkRow}>
          <label className={styles.lcdLabel}>
            <input
              type="radio"
              name="tcpType"
              checked={(networkSettings.TCP_Type ?? 0) === 0}
              onChange={() => { setNetworkSettings(n => ({ ...n, TCP_Type: 0 })); updateSettings({ tcp_type: 0 }); }}
            />
            Use The Following IP Address
          </label>
        </div>
        <div className={styles.editRow}>
          <span className={styles.editLabel}>IP Address</span>
          <Input size="small" value={networkSettings.IP_Address ?? ''} disabled={networkSettings.TCP_Type === 1}
            onChange={(_, d) => { setNetworkSettings(n => ({ ...n, IP_Address: d.value })); updateSettings({ ip_addr: d.value }); }}
            placeholder="192.168.1.100" />
        </div>
        <div className={styles.editRow}>
          <span className={styles.editLabel}>Subnet Mask</span>
          <Input size="small" value={networkSettings.Subnet ?? ''} disabled={networkSettings.TCP_Type === 1}
            onChange={(_, d) => { setNetworkSettings(n => ({ ...n, Subnet: d.value })); updateSettings({ subnet: d.value }); }}
            placeholder="255.255.255.0" />
        </div>
        <div className={styles.editRow}>
          <span className={styles.editLabel}>Gateway Address</span>
          <Input size="small" value={networkSettings.Gateway ?? ''} disabled={networkSettings.TCP_Type === 1}
            onChange={(_, d) => { setNetworkSettings(n => ({ ...n, Gateway: d.value })); updateSettings({ gate_addr: d.value }); }}
            placeholder="192.168.1.1" />
        </div>
        <div className={styles.editRow}>
          <span className={styles.editLabel}>Modbus TCP Port</span>
          <Input size="small" type="number" value={String(protocolSettings.Modbus_Port ?? 502)}
            onChange={(_, d) => { const v = Number(d.value); setProtocolSettings(p => ({ ...p, Modbus_Port: v })); updateSettings({ modbus_port: v }); }} />
        </div>
        <div className={styles.lcdRow}>
          <Button size="small" appearance="primary" onClick={() => setShowWifiDialog(true)}>Wifi Configuration</Button>
          <Button size="small" appearance="secondary" onClick={handleSaveNetworkValidated} disabled={loading}>Change IP</Button>
        </div>

        {/* ── Device Serial Port Config ──────────────────────────── */}
        <div className={styles.sectionHead}>Device Serial Port Config</div>

        {/* Inner port tab bar */}
        <div className={styles.portTabBar}>
          {PORT_TABS.map(t => (
            <button
              key={t.value}
              className={`${styles.portTabItem}${portTab === t.value ? ` ${styles.portTabItemActive}` : ''}`}
              onClick={() => setPortTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 3-row × 2-col grid: Mode/Baudrate | DataBits/Parity | StopBits */}
        <div className={styles.portGrid}>
          {/* Row 1 */}
          <div className={styles.portGridCell}>
            <div className={styles.portGridLabel}>Mode</div>
            <Dropdown size="small" style={{ width: '100%', minWidth: 0 }} value={modeLabel} selectedOptions={[String(modeVal)]} disabled={zigbeeDisabled}
              onOptionSelect={(_, d) => onModeChange(Number(d.optionValue))}>
              {modes.map(m => <Option key={String(m.value)} value={String(m.value)}>{m.label}</Option>)}
            </Dropdown>
          </div>
          <div className={styles.portGridCell}>
            <div className={styles.portGridLabel}>Baudrate</div>
            <Dropdown size="small" style={{ width: '100%', minWidth: 0 }} value={String(BAUDRATE_OPTIONS[baudIdx] ?? 9600)} selectedOptions={[String(baudIdx)]} disabled={zigbeeDisabled}
              onOptionSelect={(_, d) => onBaudChange(Number(d.optionValue))}>
              {BAUDRATE_OPTIONS.map((b, i) => <Option key={i} value={String(i)}>{String(b)}</Option>)}
            </Dropdown>
          </div>
          {/* Row 2 */}
          <div className={styles.portGridCell}>
            <div className={styles.portGridLabel}>Data Bits</div>
            <Input size="small" style={{ width: '100%' }} value="8" disabled />
          </div>
          <div className={styles.portGridCell}>
            <div className={styles.portGridLabel}>Parity</div>
            <Dropdown size="small" style={{ width: '100%', minWidth: 0 }} value={PARITY_OPTIONS[parIdx] ?? 'None'} selectedOptions={[String(parIdx)]} disabled={zigbeeDisabled}
              onOptionSelect={(_, d) => { const v = Number(d.optionValue); setCommSettings(p => ({ ...p, [parityKey]: v })); }}>
              {PARITY_OPTIONS.map((label, i) => <Option key={i} value={String(i)}>{label}</Option>)}
            </Dropdown>
          </div>
          {/* Row 3 */}
          <div className={styles.portGridCell}>
            <div className={styles.portGridLabel}>Stop Bits</div>
            <Dropdown size="small" style={{ width: '100%', minWidth: 0 }} value={STOPBIT_OPTIONS[stopIdx] ?? '1'} selectedOptions={[String(stopIdx)]} disabled={zigbeeDisabled}
              onOptionSelect={(_, d) => { const v = Number(d.optionValue); setCommSettings(p => ({ ...p, [stopbitKey]: v })); }}>
              {STOPBIT_OPTIONS.map((label, i) => <Option key={i} value={String(i)}>{label}</Option>)}
            </Dropdown>
          </div>
        </div>

        {/* Fixed Serial Port Config — below dropdowns, global setting */}
        <div className={styles.checkRow}>
          <Checkbox
            label={{ style: { fontSize: '13px', fontWeight: 'normal' }, children: 'Fixed Serial Port Configuration' }}
            checked={fixed}
            onChange={(_, d) => { const v = d.checked ? 1 : 0; setCommSettings(p => ({ ...p, Fix_COM_Config: v })); updateSettings({ fix_com_config: v }); }}
          />
        </div>

        <div className={styles.editRow}>
          <span className={styles.editLabel}>Zigbee Pan ID</span>
          <Input size="small" type="number" value={String(commSettings.Zigbee_Pan_ID ?? 0)}
            disabled={!commSettings.Zigbee_Exist}
            onChange={(_, d) => { const v = Number(d.value); setCommSettings(p => ({ ...p, Zigbee_Pan_ID: v })); updateSettings({ zigbee_panid: v }); }} />
        </div>
        <div className={styles.lcdRow}>
          <Button size="small" appearance="secondary" disabled>Zigbee Information</Button>
          <Button size="small" appearance="secondary" onClick={() => setShowNetworkHealthDialog(true)}>Network Health</Button>
        </div>

        <div className={styles.inlineSave}>
          <Button appearance="primary" icon={<SaveRegular />} size="small" onClick={handleSaveComm} disabled={loading}>Save Communication</Button>
        </div>
      </>
    );
  };

  const renderTime = () => (
    <div className={styles.subTabWrap}>
      <TimeSettingsTab
        timeSettings={timeSettings}
        setTimeSettings={setTimeSettings}
        updateSettings={updateSettings}
        onSave={handleSaveTime}
        onSyncPC={handleSyncPC}
        onSyncTimeServer={handleSyncNTP}
        onRefreshTime={handleRefreshTime}
        loading={loading}
        deviceEpoch={settings?.time_update_since_1970}
      />
    </div>
  );

  const renderDyndns = () => (
    <div className={styles.subTabWrap}>
      <DyndnsSettingsTab
        dyndnsSettings={dyndnsSettings}
        setDyndnsSettings={setDyndnsSettings}
        updateSettings={updateSettings}
        onSave={handleSaveDyndns}
        loading={loading}
      />
    </div>
  );

  const renderEmail = () => (
    <div className={styles.subTabWrap}>
      <EmailSettingsTab
        emailSettings={emailSettings}
        setEmailSettings={setEmailSettings}
        onSave={handleSaveEmail}
        loading={loading}
      />
    </div>
  );

  const renderUsers = () => (
    <div className={styles.subTabWrap}>
      <UserLoginTab
        userLoginSettings={userLoginSettings}
        setUserLoginSettings={setUserLoginSettings}
        updateSettings={updateSettings}
        onSaveUser={handleSaveUser}
        onDeleteUser={handleDeleteUser}
        loading={loading}
      />
    </div>
  );

  const renderExpansion = () => (
    <div className={styles.subTabWrap}>
      <ExpansionIOTab
        expansionSettings={expansionSettings}
        setExpansionSettings={setExpansionSettings}
        onDone={handleSaveExpansion}
        loading={loading}
      />
    </div>
  );

  const tabContent: Record<TabValue, () => React.ReactNode> = {
    basic: renderBasic,
    communication: renderComm,
    time: renderTime,
    dyndns: renderDyndns,
    email: renderEmail,
    users: renderUsers,
    expansion: renderExpansion,
  };

  // ── Inline tabs (first INLINE_TAB_COUNT) and overflow tabs ───────────────
  const inlineTabs  = TABS.slice(0, INLINE_TAB_COUNT);
  const overflowTabs = TABS.slice(INLINE_TAB_COUNT);

  return (
    <div className={styles.wrapper}>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className={styles.tabBar}>
        {inlineTabs.map(t => (
          <button
            key={t.value}
            className={`${styles.tabItem}${activeTab === t.value ? ` ${styles.tabItemActive}` : ''}`}
            onClick={() => selectTab(t.value)}
          >
            {t.label}
          </button>
        ))}

        {/* Overflow button with dropdown */}
        <div ref={overflowRef} className={styles.overflowAnchor}>
          <button
            className={`${styles.overflowBtn}${isOverflowActive ? ` ${styles.overflowBtnActive}` : ''}`}
            onClick={() => setOverflowOpen(o => !o)}
            aria-label="More tabs"
          >
            {isOverflowActive ? TABS.find(t => t.value === activeTab)?.short : 'More'}
            <ChevronDownRegular fontSize={12} />
          </button>

          {overflowOpen && (
            <>
              {/* Click-away overlay */}
              <div className={styles.dropdownOverlay} onClick={() => setOverflowOpen(false)} />
              <div className={styles.dropdownMenu}>
                {overflowTabs.map(t => (
                  <button
                    key={t.value}
                    className={`${styles.dropdownItem}${activeTab === t.value ? ` ${styles.dropdownItemActive}` : ''}`}
                    onClick={() => selectTab(t.value)}
                  >
                    {t.label}
                    {activeTab === t.value && <span className={styles.checkmark}>✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Status banners ──────────────────────────────────────────────── */}
      {error && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <DismissRegular fontSize={14} />
          {error}
        </div>
      )}
      {successMessage && (
        <div className={`${styles.banner} ${styles.bannerSuccess}`}>
          {successMessage}
        </div>
      )}
      {loading && (
        <div className={styles.loadingRow}>
          <Spinner size="extra-tiny" />
          <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>Loading…</Text>
        </div>
      )}

      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <div className={styles.content}>
        <fieldset disabled={loading} className={styles.fieldsetReset}>
          {tabContent[activeTab]?.()}
        </fieldset>
      </div>

      {/* ── Sticky footer — all tabs ────────────────────────────────────── */}
      {!showRebootDialog && (
        <div className={styles.footer}>
          <div className={styles.footerRow}>
            <Button className={styles.footerBtn} appearance="secondary" icon={<InfoRegular />} size="small" disabled={loading}>Identify</Button>
            <Button className={styles.footerBtn} appearance="secondary" icon={<DeleteRegular />} size="small" disabled={loading}>Clear Dev</Button>
            <Button className={styles.footerBtn} appearance="secondary" icon={<BroomRegular />} size="small" disabled={loading}>Clear Subnet</Button>
          </div>
          <div className={styles.footerRow}>
            <Button
              className={`${styles.footerBtn} ${styles.rebootBtnDanger}`}
              appearance="secondary"
              icon={<PowerRegular />}
              size="small"
              disabled={loading}
              style={{ color: '#d13438', borderColor: '#d13438', fontWeight: 600 }}
              onClick={() => setShowRebootDialog(true)}
            >
              {rebootCountdown > 0 ? `Rebooting… ${rebootCountdown}s` : 'Reboot Device'}
            </Button>
            <Button
              className={styles.footerBtn}
              appearance="primary"
              size="small"
              disabled={loading}
              onClick={handleSaveBasic}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* ── Reboot confirm dialog ───────────────────────────────────────── */}
      {showRebootDialog && (
        <div className={styles.dialogBackdrop}>
          <div className={styles.dialogSheet}>
            <Text size={400} weight="semibold" block style={{ marginBottom: '8px' }}>Reboot Device?</Text>
            <Text size={200} block style={{ color: tokens.colorNeutralForeground3 }}>
              The device will restart. All unsaved changes may be lost.
            </Text>
            <div className={styles.dialogButtons}>
              <Button className={styles.dialogBtn} appearance="secondary" onClick={() => setShowRebootDialog(false)}>Cancel</Button>
              <Button className={styles.dialogBtnDanger} appearance="secondary" icon={<PowerRegular />} style={{ color: '#d13438', borderColor: '#d13438', fontWeight: 600 }} onClick={handleReboot}>Reboot</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Advanced Settings Dialog ─────────────────────────────────── */}
      <AdvancedSettingsDialog
        isOpen={showAdvancedSettingsDialog}
        onOpenChange={setShowAdvancedSettingsDialog}
        fixComConfig={settings?.fix_com_config === 1}
        writeFlashMinutes={settings?.write_flash ?? 0}
        maxInput={settings?.max_in || 64}
        maxOutput={settings?.max_out || 64}
        maxVariable={settings?.max_var || 128}
        onSave={handleAdvancedSettingsSave}
        miniType={hardwareInfo.Mini_Type ?? 0}
        firmwareVersion={((hardwareInfo.Firmware0_Rev_Main ?? 0) * 10) + (hardwareInfo.Firmware0_Rev_Sub ?? 0)}
      />

      {/* ── Wifi Settings Dialog ─────────────────────────────────────── */}
      <WifiSettingsDialog
        isOpen={showWifiDialog}
        onOpenChange={setShowWifiDialog}
        serialNumber={selectedDevice?.serialNumber ?? 0}
      />

      {/* ── Network Health Dialog ────────────────────────────────────── */}
      <NetworkHealthDialog
        isOpen={showNetworkHealthDialog}
        onClose={() => setShowNetworkHealthDialog(false)}
        serialNumber={selectedDevice?.serialNumber ?? 0}
      />

      {/* ── RS485 Warning Dialog ─────────────────────────────────────── */}
      {showRS485WarnDialog && (
        <div className={styles.dialogBackdrop} onClick={() => { setShowRS485WarnDialog(false); pendingRS485Action.current = null; }}>
          <div className={styles.dialogSheet} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0000dd', marginBottom: '12px' }}>
              Changing Subnet Baud Rate and Protocol
            </div>
            <div style={{ fontSize: '13px', marginBottom: '20px' }}>
              Make sure all subnet devices share these same settings
            </div>
            <div className={styles.dialogButtons}>
              <Button
                className={styles.dialogBtn}
                appearance="primary"
                onClick={() => { setShowRS485WarnDialog(false); pendingRS485Action.current?.(); pendingRS485Action.current = null; }}
              >
                OK ({rs485WarnCountdown})
              </Button>
              <Button
                className={styles.dialogBtn}
                appearance="secondary"
                onClick={() => { setShowRS485WarnDialog(false); pendingRS485Action.current = null; }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
