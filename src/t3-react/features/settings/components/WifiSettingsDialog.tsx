/**
 * WifiSettingsDialog
 *
 * Mirrors the C++ T3000 "Wifi Setting" dialog (IDD_DIALOG_WIFI_SETTING).
 * Fields map to the WIFI_SETTINGS table (DeviceWifiEntity / WifiSettings type).
 *
 * Left panel  : SSID, Key, IP mode radio (DHCP / Static), IP / Subnet / Gateway
 * Right panel : MAC (read-only), Modbus Port, BACnet Port, Wifi Status,
 *               Enable/Disable radio, "Load wifi module default" button
 * Footer      : Apply, Exit
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Input,
  Radio,
  RadioGroup,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { T3Database } from '../../../../lib/t3-database';
import { API_BASE_URL } from '../../../config/constants';
import type { WifiSettings } from '../../../../lib/t3-database/types/device.types';

// ─── Styles ─────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  surface: {
    width: '700px',
    maxWidth: '95vw',
    marginTop: '5vh',
    alignSelf: 'flex-start',
  },
  body: {
    padding: '0',
  },
  title: {
    fontSize: '14px',
    fontWeight: tokens.fontWeightSemibold,
  },
  content: {
    padding: '4px 0 4px 0',
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  panel: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    padding: '8px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '110px 1fr',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '5px',
  },
  label: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    textAlign: 'right',
    paddingRight: '4px',
  },
  ipRow: {
    display: 'grid',
    gridTemplateColumns: '110px 1fr',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '4px',
  },
  ipInputs: {
    display: 'grid',
    gridTemplateColumns: '1fr 8px 1fr 8px 1fr 8px 1fr',
    alignItems: 'center',
    gap: '0',
  },
  dot: {
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    color: tokens.colorNeutralForeground1,
  },
  groupBox: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    padding: '6px 8px',
    marginTop: '4px',
    marginBottom: '2px',
  },
  radioRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    marginTop: '2px',
  },
  statusInput: {
    '& input': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  loadDefaultBtn: {
    marginTop: '4px',
    width: '100%',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  errorText: {
    fontSize: '11px',
    color: tokens.colorPaletteRedForeground1,
    marginTop: '4px',
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Split "a.b.c.d" into 4 strings (pad with "" if short) */
function splitIp(ip: string | undefined): [string, string, string, string] {
  const parts = (ip ?? '').split('.');
  while (parts.length < 4) parts.push('');
  return parts.slice(0, 4) as [string, string, string, string];
}

/** Join 4 octet strings into "a.b.c.d" */
function joinIp(octets: [string, string, string, string]): string {
  return octets.join('.');
}

const WIFI_STATUS_LABELS: Record<number, string> = {
  0: 'No Wifi Module',
  1: 'Disconnected',
  2: 'Connecting',
  3: 'Connected',
  4: 'Error',
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface WifiSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  serialNumber: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const WifiSettingsDialog: React.FC<WifiSettingsDialogProps> = ({
  isOpen,
  onOpenChange,
  serialNumber,
}) => {
  const styles = useStyles();
  const db = new T3Database(`${API_BASE_URL}/api`);

  // ── Local form state ──────────────────────────────────────────────────────
  const [ssid, setSsid]           = useState('');
  const [key, setKey]             = useState('');
  const [ipMode, setIpMode]       = useState<'dhcp' | 'static'>('dhcp');
  const [ipOctets, setIpOctets]   = useState<[string,string,string,string]>(['','','','']);
  const [subOctets, setSubOctets] = useState<[string,string,string,string]>(['','','','']);
  const [gwOctets, setGwOctets]   = useState<[string,string,string,string]>(['','','','']);
  const [mac, setMac]             = useState('');
  const [modbusPort, setModbusPort] = useState('');
  const [bacnetPort, setBacnetPort] = useState('');
  const [wifiStatus, setWifiStatus] = useState('No Wifi Module');
  const [wifiEnable, setWifiEnable] = useState<'enable' | 'disable'>('disable');

  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // ── Load data when dialog opens ───────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!isOpen || !serialNumber) return;
    setLoading(true);
    setError(null);
    try {
      const data: WifiSettings | null = await db.deviceWifi.get(serialNumber);
      if (data) {
        setSsid(data.Username ?? '');
        setKey(data.Password ?? '');
        setIpMode((data.IP_Auto_Manual ?? 0) === 1 ? 'static' : 'dhcp');
        setIpOctets(splitIp(data.IP_Address));
        setSubOctets(splitIp(data.Net_Mask));
        setGwOctets(splitIp(data.Gateway));
        setMac(data.Wifi_MAC ?? '');
        setModbusPort(String(data.Modbus_Port ?? ''));
        setBacnetPort(String(data.BACnet_Port ?? ''));
        const statusLabel = WIFI_STATUS_LABELS[data.IP_Wifi_Status ?? 0] ?? 'Unknown';
        setWifiStatus(statusLabel);
        setWifiEnable((data.Wifi_Enable ?? 0) === 1 ? 'enable' : 'disable');
      }
    } catch (e: any) {
      setError(`Failed to load wifi settings: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  }, [isOpen, serialNumber]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Apply / Save ─────────────────────────────────────────────────────────
  const handleApply = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<WifiSettings> = {
        Username:        ssid,
        Password:        key,
        IP_Auto_Manual:  ipMode === 'static' ? 1 : 0,
        IP_Address:      joinIp(ipOctets),
        Net_Mask:        joinIp(subOctets),
        Gateway:         joinIp(gwOctets),
        Modbus_Port:     modbusPort ? Number(modbusPort) : undefined,
        BACnet_Port:     bacnetPort ? Number(bacnetPort) : undefined,
        Wifi_Enable:     wifiEnable === 'enable' ? 1 : 0,
      };
      await db.deviceWifi.upsert(serialNumber, payload);
    } catch (e: any) {
      setError(`Failed to save wifi settings: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadDefault = async () => {
    setSaving(true);
    setError(null);
    try {
      await db.deviceWifi.upsert(serialNumber, { Load_Default: 1 });
      await loadData();
    } catch (e: any) {
      setError(`Failed to load default: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  // ── IP octet field helper ─────────────────────────────────────────────────
  const IpField = ({
    octets,
    onChange,
    disabled,
  }: {
    octets: [string,string,string,string];
    onChange: (v: [string,string,string,string]) => void;
    disabled?: boolean;
  }) => (
    <div className={styles.ipInputs}>
      {octets.map((oct, i) => (
        <React.Fragment key={i}>
          <Input
            size="small"
            disabled={disabled}
            value={oct}
            onChange={(_, d) => {
              const next = [...octets] as [string,string,string,string];
              next[i] = d.value;
              onChange(next);
            }}
            style={{ minWidth: 0, textAlign: 'center' }}
          />
          {i < 3 && <span className={styles.dot}>.</span>}
        </React.Fragment>
      ))}
    </div>
  );

  const isStatic = ipMode === 'static';

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface className={styles.surface}>
        <DialogBody className={styles.body} style={{ padding: 0 }}>
          <DialogTitle
            className={styles.title}
            action={
              <Button
                appearance="subtle"
                aria-label="close"
                icon={<Dismiss24Regular />}
                onClick={() => onOpenChange(false)}
              />
            }
          >
            Wifi Setting
          </DialogTitle>

          <DialogContent className={styles.content}>
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                <Spinner size="medium" label="Loading..." />
              </div>
            )}

            {!loading && (
              <div className={styles.twoCol}>
                {/* ── LEFT PANEL ──────────────────────────────────────── */}
                <div className={styles.panel}>
                  {/* SSID */}
                  <div className={styles.row}>
                    <span className={styles.label}>SSID:</span>
                    <Input size="small" value={ssid} onChange={(_, d) => setSsid(d.value)} />
                  </div>

                  {/* Key */}
                  <div className={styles.row}>
                    <span className={styles.label}>Key:</span>
                    <Input size="small" type="password" value={key} onChange={(_, d) => setKey(d.value)} />
                  </div>

                  {/* IP mode group box */}
                  <div className={styles.groupBox}>
                    <RadioGroup
                      value={ipMode}
                      onChange={(_, d) => setIpMode(d.value as 'dhcp' | 'static')}
                    >
                      <Radio value="dhcp" label="Obtain an IP address automatically" />
                      <Radio value="static" label="Use the following IP address" />
                    </RadioGroup>

                    {/* IP */}
                    <div className={styles.ipRow} style={{ marginTop: '8px' }}>
                      <span className={styles.label}>IP:</span>
                      <IpField octets={ipOctets} onChange={setIpOctets} disabled={!isStatic} />
                    </div>

                    {/* Subnet */}
                    <div className={styles.ipRow}>
                      <span className={styles.label}>Subnet</span>
                      <IpField octets={subOctets} onChange={setSubOctets} disabled={!isStatic} />
                    </div>

                    {/* Gateway */}
                    <div className={styles.ipRow} style={{ marginBottom: 0 }}>
                      <span className={styles.label}>Gateway:</span>
                      <IpField octets={gwOctets} onChange={setGwOctets} disabled={!isStatic} />
                    </div>
                  </div>
                </div>

                {/* ── RIGHT PANEL ─────────────────────────────────────── */}
                <div className={styles.panel}>
                  {/* MAC */}
                  <div className={styles.row}>
                    <span className={styles.label}>MAC:</span>
                    <Input size="small" value={mac} readOnly className={styles.statusInput} />
                  </div>

                  {/* Wifi Modbus Port */}
                  <div className={styles.row}>
                    <span className={styles.label}>Wifi Modbus Port :</span>
                    <Input
                      size="small"
                      type="number"
                      value={modbusPort}
                      onChange={(_, d) => setModbusPort(d.value)}
                    />
                  </div>

                  {/* Wifi BACnet Port */}
                  <div className={styles.row}>
                    <span className={styles.label}>Wifi Bacnet Port :</span>
                    <Input
                      size="small"
                      type="number"
                      value={bacnetPort}
                      onChange={(_, d) => setBacnetPort(d.value)}
                    />
                  </div>

                  {/* Wifi Status */}
                  <div className={styles.row}>
                    <span className={styles.label}>Wifi Status</span>
                    <Input
                      size="small"
                      value={wifiStatus}
                      readOnly
                      className={styles.statusInput}
                    />
                  </div>

                  {/* Enable / Disable */}
                  <RadioGroup
                    layout="horizontal"
                    value={wifiEnable}
                    onChange={(_, d) => setWifiEnable(d.value as 'enable' | 'disable')}
                    className={styles.radioRow}
                  >
                    <Radio value="enable" label="Enable Wifi" />
                    <Radio value="disable" label="Disable Wifi" />
                  </RadioGroup>

                  {/* Load default */}
                  <Button
                    size="small"
                    appearance="secondary"
                    className={styles.loadDefaultBtn}
                    onClick={handleLoadDefault}
                    disabled={saving}
                  >
                    Load wifi module default
                  </Button>
                </div>
              </div>
            )}

            {error && <div className={styles.errorText}>⚠ {error}</div>}
          </DialogContent>

          <DialogActions className={styles.actions}>
            <Button
              appearance="secondary"
              size="small"
              onClick={handleApply}
              disabled={saving || loading}
            >
              {saving ? <Spinner size="tiny" /> : 'Apply'}
            </Button>
            <Button
              appearance="secondary"
              size="small"
              onClick={() => onOpenChange(false)}
            >
              Exit
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
