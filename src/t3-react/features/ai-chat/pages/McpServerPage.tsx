/**
 * McpServerPage — MCP Server & Examples
 *
 * Route: /#/t3000/ai-assistant/mcp
 * Lives under the AI Assistant menu. Shows how to connect LLM agents
 * (Claude Desktop, VS Code Copilot, Cursor, Cline, etc.) to the T3000
 * MCP server, plus a library of natural-language prompt examples.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Tab, TabList, Badge, Button,
} from '@fluentui/react-components';
import {
  SparkleRegular, SettingsRegular, TagRegular, CopyRegular,
  CheckmarkCircleRegular, LightbulbRegular, BookOpenRegular,
} from '@fluentui/react-icons';
import { useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../../../config/constants';
import styles from '../../haystack/pages/AutoTaggingMcpPage.module.css';

// ═══ Page Component ═══

const McpServerPage: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    location.hash === '#examples' ? 'examples' : 'mcp'
  );

  return (
    <div className={styles.container}>
      <style>{'[role="tooltip"],[role="tooltip"] *{max-width:none!important;white-space:nowrap!important;width:auto!important}'}</style>

      <TabList selectedValue={activeTab} onTabSelect={(_, d) => setActiveTab(d.value as string)}>
        <Tab value="mcp" icon={<SparkleRegular />}><span style={{fontSize:13}}>MCP Server</span></Tab>
        <Tab value="examples" icon={<LightbulbRegular />}><span style={{fontSize:13}}>Examples</span></Tab>
      </TabList>

      <div className={styles.tabContent}>
        {activeTab === 'mcp' && <McpTab />}
        {activeTab === 'examples' && <ExamplesTab />}
      </div>
    </div>
  );
};

// ═══ MCP Tab ═══

const MCP_CONFIG_CLAUDE = `{
  "mcpServers": {
    "T3000": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://<host>:9103/api/mcp",
        "--allow-http"
      ]
    }
  }
}`;

const MCP_CONFIG_VSCODE = `{
  "servers": {
    "T3000": {
      "type": "http",
      "url": "http://<host>:9103/api/mcp"
    }
  }
}`;

// ═══ Tool catalog (live from GET /api/ai/tools) ═══

interface McpTool {
  name: string;
  description: string;
  input_schema: {
    type?: string;
    required?: string[];
    properties?: Record<string, { type?: string; items?: { type?: string }; enum?: string[] }>;
  };
}

interface ToolSection {
  title: string;
  tools: McpTool[];
}

/**
 * Presentational grouping only. Every tool the server advertises is rendered:
 * names not listed here fall through to the "Other" section, so this list can
 * never make the page incomplete.
 */
const TOOL_SECTIONS: Array<{ title: string; tools: string[] }> = [
  { title: 'Haystack Tagging', tools: ['t3000_haystack_list_tags', 't3000_haystack_get_point_tags', 't3000_haystack_search_points', 't3000_haystack_auto_tag', 't3000_haystack_preview_tags', 't3000_haystack_list_rules', 't3000_haystack_get_brick_class'] },
  { title: 'Core', tools: ['t3000_ping', 't3000_get_version', 't3000_describe_tool'] },
  { title: 'Data & Metadata', tools: ['t3000_device_list', 't3000_device_get', 't3000_device_get_points', 't3000_point_get_metadata', 't3000_metadata_search', 't3000_point_search'] },
  { title: 'Discovery & Scan', tools: ['t3000_scan_network', 't3000_scan_all', 't3000_device_refresh'] },
  { title: 'Operational', tools: ['t3000_point_read', 't3000_point_write', 't3000_point_read_batch', 't3000_point_write_batch', 't3000_point_batch_metadata'] },
  { title: 'Analytics', tools: ['t3000_haystack_validate', 't3000_haystack_export'] },
  { title: 'Rules Management', tools: ['t3000_rule_toggle', 't3000_rule_create'] },
  { title: 'Alarms & Trends', tools: ['t3000_alarm_list', 't3000_alarm_acknowledge', 't3000_trendlog_query'] },
  { title: 'Device Operations', tools: ['t3000_trendlog_list', 't3000_trendlog_export', 't3000_device_delete', 't3000_schedule_list'] },
  { title: 'Settings', tools: ['t3000_settings_read', 't3000_settings_write', 't3000_device_control'] },
  { title: 'Control Logic', tools: ['t3000_program_list', 't3000_program_read', 't3000_alarm_settings_read', 't3000_users_list', 't3000_graphics_list'] },
  { title: 'Documentation', tools: ['t3000_doc_list', 't3000_doc_read', 't3000_pid_list', 't3000_holiday_list', 't3000_building_summary'] },
  { title: 'Task Management', tools: ['t3000_task_create', 't3000_task_list', 't3000_task_update', 't3000_task_delete'] },
  { title: 'Site Memory', tools: ['t3000_memory_save', 't3000_memory_list', 't3000_memory_delete'] },
  { title: 'Diagnostics', tools: ['t3000_device_diagnostics', 't3000_device_diagnostics_batch'] },
  { title: 'Fault Detection & Diagnostics (FDD)', tools: ['t3000_fdd_rules_list', 't3000_fdd_analyze', 't3000_fdd_rule_create', 't3000_fdd_rule_update', 't3000_fdd_rule_toggle', 't3000_fdd_rule_export', 't3000_fdd_rule_import', 't3000_fdd_faults'] },
  { title: 'Navigation', tools: ['t3000_nav_list', 't3000_nav_search', 't3000_nav_redirect', 't3000_page_info', 't3000_device_current', 't3000_set_chat_device'] },
  { title: 'Reports & Help', tools: ['t3000_report_self_check', 't3000_report_docs_search', 't3000_report_docs_page'] },
];

const formatToolType = (prop?: { type?: string; items?: { type?: string }; enum?: string[] }): string => {
  if (!prop) return 'any';
  if (prop.type === 'array') return `${prop.items?.type ?? 'any'}[]`;
  const base = prop.type ?? 'any';
  return prop.enum?.length ? `${base} (${prop.enum.join('|')})` : base;
};

const formatToolParams = (schema?: McpTool['input_schema']): string => {
  const props = schema?.properties;
  const names = props ? Object.keys(props) : [];
  if (!names.length) return '—';
  const required = new Set(schema?.required ?? []);
  return names
    .map((name) => `${name}${required.has(name) ? '' : '?'}: ${formatToolType(props?.[name])}`)
    .join(', ');
};

const groupTools = (tools: McpTool[]): ToolSection[] => {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const grouped: ToolSection[] = [];
  const used = new Set<string>();

  for (const section of TOOL_SECTIONS) {
    const items = section.tools
      .map((name) => byName.get(name))
      .filter((tool): tool is McpTool => Boolean(tool));
    items.forEach((tool) => used.add(tool.name));
    if (items.length) grouped.push({ title: section.title, tools: items });
  }

  const remaining = tools.filter((tool) => !used.has(tool.name));
  if (remaining.length) grouped.push({ title: 'Other', tools: remaining });

  return grouped;
};

function useMcpToolCatalog() {
  const [tools, setTools] = useState<McpTool[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/tools`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setTools(Array.isArray(body?.tools) ? body.tools : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
      setTools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tools, error, loading, reload };
}

const McpTab: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);
  const { tools, error: toolError, loading: toolsLoading, reload: reloadTools } = useMcpToolCatalog();
  const toolSections = React.useMemo(() => groupTools(tools), [tools]);
  const toolCount = toolsLoading || toolError ? null : tools.length;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      {/* ── What is MCP ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <SparkleRegular style={{ color: '#0078d4', fontSize: 20, marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--colorNeutralForeground2)' }}>
          <strong style={{ fontSize: 13, color: 'var(--colorNeutralForeground1)' }}>Model Context Protocol (MCP) Server — Streamable HTTP</strong>
          <br />
          The T3000 MCP server lets LLM agents (Claude Desktop, VS Code Copilot, Cursor, Cline, etc.) query devices, read/write points, manage Haystack tags, and run analytics via MCP Streamable HTTP on port 9103.
          Runs <strong>inside the T3000 API</strong>.
        </div>
      </div>

      {/* ── How to Connect ── */}
      <div className={styles.mcpSection}>
        <div className={styles.sectionTitle}>
          <SettingsRegular style={{ fontSize: 14 }} /> How to Connect
        </div>
        <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground2)', marginBottom: 10, lineHeight: 1.6 }}>
          Copy the config below into your MCP client. Replace <code>&lt;host&gt;</code> with <code>localhost</code> (local) or the machine's LAN IP (remote). The T3000 API must be running on port <code>9103</code>.
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'stretch' }}>
          {/* Claude / Cursor config */}
          <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--colorNeutralForeground1)' }}>Claude Desktop / Cursor (via mcp-remote)</div>
            <pre style={{
              background: 'var(--colorNeutralBackground2, #f5f5f5)',
              border: '1px solid var(--colorNeutralStroke1)',
              borderRadius: 4,
              padding: '10px 36px 10px 10px',
              fontSize: 11,
              overflowX: 'auto',
              margin: 0,
              lineHeight: 1.5,
              flex: 1,
            }}>
              <code>{MCP_CONFIG_CLAUDE}</code>
            </pre>
            <Button
              size="small" appearance="subtle"
              icon={copied === 'claude' ? <CheckmarkCircleRegular style={{ color: '#1e7e34' }} /> : <CopyRegular />}
              style={{ position: 'absolute', top: 22, right: 2, minHeight: 22, height: 22 }}
              onClick={() => handleCopy(MCP_CONFIG_CLAUDE, 'claude')}
            >{copied === 'claude' ? 'Copied' : ''}</Button>
          </div>

          {/* VS Code config */}
          <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--colorNeutralForeground1)' }}>VS Code Copilot</div>
            <pre style={{
              background: 'var(--colorNeutralBackground2, #f5f5f5)',
              border: '1px solid var(--colorNeutralStroke1)',
              borderRadius: 4,
              padding: '10px 36px 10px 10px',
              fontSize: 11,
              overflowX: 'auto',
              margin: 0,
              lineHeight: 1.5,
              flex: 1,
            }}>
              <code>{MCP_CONFIG_VSCODE}</code>
            </pre>
            <Button
              size="small" appearance="subtle"
              icon={copied === 'vscode' ? <CheckmarkCircleRegular style={{ color: '#1e7e34' }} /> : <CopyRegular />}
              style={{ position: 'absolute', top: 22, right: 2, minHeight: 22, height: 22 }}
              onClick={() => handleCopy(MCP_CONFIG_VSCODE, 'vscode')}
            >{copied === 'vscode' ? 'Copied' : ''}</Button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12, lineHeight: 1.6, marginTop: 10 }}>
          {/* Claude Desktop */}
          <div style={{ padding: '10px 12px', background: 'var(--colorNeutralBackground2)', borderRadius: 4 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, borderLeft: '3px solid var(--colorBrandForeground1, #0078d4)', paddingLeft: 8 }}>
              Claude Desktop
              <a href="#/t3000/documentation/t3000/haystack/mcp-claude-desktop" style={{ fontSize: 11, color: 'var(--colorBrandForeground1, #0078d4)', textDecoration: 'none', marginLeft: 8, fontWeight: 400 }}>Full Details →</a>
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--colorNeutralForeground2)' }}>
              <li>Open <code>Claude</code> → Settings → Developer → Edit Config</li>
              <li>Paste the <strong>Claude Desktop</strong> config (left) into <code>claude_desktop_config.json</code></li>
              <li>Make sure <code>npx</code> is installed (<code>npm install -g npx</code> if needed)</li>
              <li>Restart Claude Desktop — first run will download <code>mcp-remote</code> automatically</li>
              <li>Look for the 🔌 icon — you should see all {toolCount ?? '…'} T3000 tools available</li>
            </ol>
          </div>

          {/* VS Code Copilot */}
          <div style={{ padding: '10px 12px', background: 'var(--colorNeutralBackground2)', borderRadius: 4 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, borderLeft: '3px solid var(--colorBrandForeground1, #0078d4)', paddingLeft: 8 }}>
              VS Code Copilot
              <a href="#/t3000/documentation/t3000/haystack/mcp-vscode-copilot" style={{ fontSize: 11, color: 'var(--colorBrandForeground1, #0078d4)', textDecoration: 'none', marginLeft: 8, fontWeight: 400 }}>Full Details →</a>
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--colorNeutralForeground2)' }}>
              <li>In your project, create <code>.vscode/mcp.json</code></li>
              <li>Paste the <strong>VS Code Copilot</strong> config (right)</li>
              <li>Reload VS Code (<code>Ctrl+Shift+P</code> → Reload Window)</li>
              <li>In Copilot Chat, verify tools appear by asking "list available tools"</li>
            </ol>
          </div>

          {/* Cursor / Cline / Continue.dev */}
          <div style={{ padding: '10px 12px', background: 'var(--colorNeutralBackground2)', borderRadius: 4 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, borderLeft: '3px solid var(--colorBrandForeground1, #0078d4)', paddingLeft: 8 }}>
              Cursor / Cline / Continue.dev
              <a href="#/t3000/documentation/t3000/haystack/mcp-claude-desktop" style={{ fontSize: 11, color: 'var(--colorBrandForeground1, #0078d4)', textDecoration: 'none', marginLeft: 8, fontWeight: 400 }}>Full Details →</a>
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--colorNeutralForeground2)' }}>
              <li>Open your MCP settings (Cursor: <code>.cursor/mcp.json</code>, Cline: MCP Servers view, Continue: <code>config.json</code>)</li>
              <li>Use the <strong>Claude Desktop</strong> config (left) — same <code>mcp-remote</code> approach</li>
              <li>Restart or reload the extension</li>
              <li>Verify: ask "list T3000 devices" — it should call <code>t3000_device_list</code></li>
            </ol>
          </div>
        </div>
      </div>

      {/* ── Available Tools ── */}
      <div className={styles.mcpSection} style={{ marginTop: 20 }}>
        <div className={styles.sectionTitle}>
          <TagRegular style={{ fontSize: 14 }} /> Available Tools ({toolCount ?? '…'})
          <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 8, color: 'var(--colorNeutralForeground3)' }}>
            live from GET /api/ai/tools
          </span>
        </div>
        {toolError ? (
          <div style={{ padding: '10px 12px', borderRadius: 4, background: 'var(--colorNeutralBackground2)', color: 'var(--colorPaletteRedForeground1)', fontSize: 12 }}>
            Could not load the tool list from the API: {toolError}
            <Button appearance="subtle" size="small" onClick={reloadTools} style={{ marginLeft: 8 }}>Retry</Button>
          </div>
        ) : (
          <table className={styles.mcpToolTable}>
            <thead>
              <tr><th style={{width:'24%'}}>Tool</th><th style={{width:'40%'}}>Description</th><th style={{width:'36%'}}>Parameters</th></tr>
            </thead>
            <tbody>
              {toolSections.map((section) => (
                <React.Fragment key={section.title}>
                  <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 {section.title} ({section.tools.length})</td></tr>
                  {section.tools.map((tool) => (
                    <tr key={tool.name}>
                      <td><code>{tool.name}</code></td>
                      <td>{tool.description || '—'}</td>
                      <td>{formatToolParams(tool.input_schema)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ═══ Examples Tab ═══

const MCP_URL = `http://<host>:9103/api/mcp`;

interface PromptExample {
  prompt: string;
  tool: string;
  desc: string;
}

interface PromptCategory {
  name: string;
  tools: number;
  items: PromptExample[];
}

const promptCategories: PromptCategory[] = [
  {
    name: 'Haystack Tagging', tools: 7, items: [
      { prompt: 'What Haystack tags are available?', tool: 't3000_haystack_list_tags', desc: 'List all tag definitions with categories and docs' },
      { prompt: 'What tags are assigned to device 233626?', tool: 't3000_haystack_get_point_tags', desc: 'Get all tags for a device\'s points' },
      { prompt: 'Search for all temperature sensors', tool: 't3000_haystack_search_points', desc: 'Find points with temp and sensor tags' },
      { prompt: 'Auto-tag device 233626', tool: 't3000_haystack_auto_tag', desc: 'Run auto-tagging on a single device' },
      { prompt: 'Preview what tags would be assigned to device 240488', tool: 't3000_haystack_preview_tags', desc: 'Dry-run without writing to DB' },
      { prompt: 'List the Haystack auto-tagging rules', tool: 't3000_haystack_list_rules', desc: 'Show all regex rules with status' },
      { prompt: 'What Brick class does input 8 on device 237219 have?', tool: 't3000_haystack_get_brick_class', desc: 'Check Brick ontology assignments' },
    ]
  },
  {
    name: 'Core', tools: 3, items: [
      { prompt: 'Is the T3000 server running?', tool: 't3000_ping', desc: 'Server health check' },
      { prompt: 'What version is the T3000 API?', tool: 't3000_get_version', desc: 'Server version and tool count' },
      { prompt: 'What parameters does point_read accept?', tool: 't3000_describe_tool', desc: 'Get full schema for any tool' },
    ]
  },
  {
    name: 'Data & Discovery', tools: 6, items: [
      { prompt: 'List all T3000 devices', tool: 't3000_device_list', desc: 'Enumerate all devices with serials and point counts' },
      { prompt: 'Get the full details for device 233626', tool: 't3000_device_get', desc: 'Query a single device record' },
      { prompt: 'Show me the input points for device T3-NB-ESP', tool: 't3000_device_get_points', desc: 'Get all inputs on a device' },
      { prompt: 'Get full metadata for input 0 on device 240488', tool: 't3000_point_get_metadata', desc: 'Label, units, range, tags, Brick class' },
      { prompt: 'Search for points labeled temperature', tool: 't3000_metadata_search', desc: 'Cross-device label search' },
      { prompt: 'Find all supply air temperature sensors', tool: 't3000_point_search', desc: 'Semantic search by tag or Brick class' },
    ]
  },
  {
    name: 'Operational', tools: 5, items: [
      { prompt: 'Read input point 0 on device 233626', tool: 't3000_point_read', desc: 'Read a single point value' },
      { prompt: 'Set output 5 on device 233626 to 72.5', tool: 't3000_point_write', desc: 'Write a value (requires confirm)' },
      { prompt: 'Read inputs 0, 1, and 2 on device 240488 all at once', tool: 't3000_point_read_batch', desc: 'Batch read multiple points' },
      { prompt: 'Set outputs 0 through 3 on device 237219 to 100', tool: 't3000_point_write_batch', desc: 'Batch write (requires confirm)' },
      { prompt: 'Get metadata for inputs 0-4 on device 240488', tool: 't3000_point_batch_metadata', desc: 'Batch metadata for multiple points' },
    ]
  },
  {
    name: 'Analytics & Export', tools: 2, items: [
      { prompt: 'Validate the Haystack tags on device 237219', tool: 't3000_haystack_validate', desc: 'Check for missing tags, conflicts' },
      { prompt: 'Export device 233626 as Brick Turtle RDF', tool: 't3000_haystack_export', desc: 'Export semantic model in brick-ttl format' },
    ]
  },
  {
    name: 'Rules Management', tools: 2, items: [
      { prompt: 'Disable auto-tagging rule 5', tool: 't3000_rule_toggle', desc: 'Enable or disable a tagging rule' },
      { prompt: 'Create a rule that tags CO2 labels as air, co2, sensor', tool: 't3000_rule_create', desc: 'Create a new auto-tagging rule' },
    ]
  },
  {
    name: 'Alarms & Trends', tools: 3, items: [
      { prompt: 'List all active alarms', tool: 't3000_alarm_list', desc: 'Get unacknowledged alarms' },
      { prompt: 'Acknowledge alarm 42 on device 233626', tool: 't3000_alarm_acknowledge', desc: 'Acknowledge an alarm by ID' },
      { prompt: 'Get trend data for input 8 on device 237219 for the last hour', tool: 't3000_trendlog_query', desc: 'Query historical trend data' },
    ]
  },
  {
    name: 'Device Operations', tools: 5, items: [
      { prompt: 'List trend logs on device 233626', tool: 't3000_trendlog_list', desc: 'Enumerate available trend logs' },
      { prompt: 'Delete device 233626 from the project', tool: 't3000_device_delete', desc: 'Remove a device record (confirm required)' },
      { prompt: 'Export trend log data from device 240488', tool: 't3000_trendlog_export', desc: 'Export trend data as CSV/JSON' },
      { prompt: 'Refresh data from device 237219', tool: 't3000_device_refresh', desc: 'Re-sync device data from controller' },
      { prompt: 'Show me the schedules on device 233626', tool: 't3000_schedule_list', desc: 'List all schedules for a device' },
    ]
  },
  {
    name: 'Settings', tools: 3, items: [
      { prompt: 'Read the settings on device 233626', tool: 't3000_settings_read', desc: 'Read device configuration' },
      { prompt: 'Update the device name on 240488', tool: 't3000_settings_write', desc: 'Write device settings (confirm required)' },
      { prompt: 'Restart device 237219', tool: 't3000_device_control', desc: 'Send control commands to a device' },
    ]
  },
  {
    name: 'Control Logic', tools: 5, items: [
      { prompt: 'List programs on device 233626', tool: 't3000_program_list', desc: 'Enumerate PLC programs' },
      { prompt: 'Show me the source code for program 3', tool: 't3000_program_read', desc: 'Read a PLC program' },
      { prompt: 'What alarm thresholds are set on device 240488?', tool: 't3000_alarm_settings_read', desc: 'Read alarm configuration' },
      { prompt: 'List users on device 233626', tool: 't3000_users_list', desc: 'Show device user accounts' },
      { prompt: 'Show graphics screens on device 237219', tool: 't3000_graphics_list', desc: 'List visualization screens' },
    ]
  },
  {
    name: 'Documentation', tools: 5, items: [
      { prompt: 'What documentation is available?', tool: 't3000_doc_list', desc: 'List all documentation articles' },
      { prompt: 'Show me the quick start guide', tool: 't3000_doc_read', desc: 'Read a specific doc article' },
      { prompt: 'List PID loops on device 233626', tool: 't3000_pid_list', desc: 'Enumerate PID controllers' },
      { prompt: 'Show holiday schedules on device 240488', tool: 't3000_holiday_list', desc: 'List holiday exceptions' },
      { prompt: 'Give me a summary of the building system', tool: 't3000_building_summary', desc: 'Overview of all devices and points' },
    ]
  },
  {
    name: 'Task Management', tools: 4, items: [
      { prompt: 'Create a task list for commissioning AHU-1', tool: 't3000_task_create', desc: 'Create a workflow task' },
      { prompt: 'Show me all pending tasks', tool: 't3000_task_list', desc: 'List tasks by status' },
      { prompt: 'Mark task "Configure AHU-1 network" as completed', tool: 't3000_task_update', desc: 'Update task status' },
      { prompt: 'Delete the completed commissioning tasks', tool: 't3000_task_delete', desc: 'Clean up completed tasks' },
    ]
  },
  {
    name: 'Site Memory', tools: 3, items: [
      { prompt: 'Remember that AHU-3 is the main unit and AHU-2 is decommissioned', tool: 't3000_memory_save', desc: 'Save site knowledge' },
      { prompt: 'What do we know about this site?', tool: 't3000_memory_list', desc: 'List saved memories' },
      { prompt: 'Forget the old AHU layout notes', tool: 't3000_memory_delete', desc: 'Remove outdated memory' },
    ]
  },
  {
    name: 'Diagnostics', tools: 2, items: [
      { prompt: 'Run diagnostics on device 233626', tool: 't3000_device_diagnostics', desc: 'Single device health check' },
      { prompt: 'Check the health of all devices', tool: 't3000_device_diagnostics_batch', desc: 'Batch diagnostics across building' },
    ]
  },
  {
    name: 'Fault Detection (FDD)', tools: 8, items: [
      { prompt: 'What FDD rules are available?', tool: 't3000_fdd_rules_list', desc: 'List all fault-detection rules' },
      { prompt: 'Check AHU-1 on device 233626 for faults over the last day', tool: 't3000_fdd_analyze', desc: 'Run FDD rules over trendlog history' },
      { prompt: 'Add a rule that alarms when the return air temp exceeds 80F', tool: 't3000_fdd_rule_create', desc: 'Create a new FDD rule' },
      { prompt: 'Tighten ECON-4 to require 20% outdoor air and raise severity to critical', tool: 't3000_fdd_rule_update', desc: 'Update an FDD rule' },
      { prompt: 'Disable the FAN-RUNTIME rule for now', tool: 't3000_fdd_rule_toggle', desc: 'Toggle an FDD rule' },
      { prompt: 'Export all chw rules as JSON', tool: 't3000_fdd_rule_export', desc: 'Export FDD rules' },
      { prompt: 'Import this rule catalog into the system', tool: 't3000_fdd_rule_import', desc: 'Bulk import FDD rules' },
      { prompt: 'Show me recent fault findings for device 233626', tool: 't3000_fdd_faults', desc: 'List persisted FDD findings' },
    ]
  },
  {
    name: 'Navigation', tools: 5, items: [
      { prompt: 'What pages are available in the T3000?', tool: 't3000_nav_list', desc: 'List all UI pages' },
      { prompt: 'Where do I configure PID loops?', tool: 't3000_nav_search', desc: 'Search pages by keyword' },
      { prompt: 'Open the outputs page for device 233626', tool: 't3000_nav_redirect', desc: 'Get navigation URL' },
      { prompt: 'What can I do on the Alarms page?', tool: 't3000_page_info', desc: 'Page details and features' },
      { prompt: 'Which device am I currently working with?', tool: 't3000_device_current', desc: 'Get current device' },
    ]
  },
];

const ExamplesTab: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleCategory = (name: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const totalPrompts = promptCategories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <LightbulbRegular style={{ color: '#0078d4', fontSize: 20, marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--colorNeutralForeground2)', flex: 1 }}>
          <strong style={{ fontSize: 13, color: 'var(--colorNeutralForeground1)' }}>Natural Language Prompts</strong>
          <br />
          {totalPrompts} prompts across {promptCategories.length} categories. Click any prompt to copy, then paste into Copilot Chat or Claude.
          The MCP endpoint is at <code>{MCP_URL}</code>.
        </div>
        <a
          href="#/t3000/documentation/t3000/haystack/mcp-api-examples"
          style={{ fontSize: 11, color: 'var(--colorBrandForeground1, #0078d4)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}
        >
          Full Docs →
        </a>
      </div>

      {/* ── Prompt Categories ── */}
      {promptCategories.map((cat) => {
        const isCollapsed = collapsedCategories.has(cat.name);
        return (
          <div key={cat.name} style={{ marginBottom: 12 }}>
            {/* Category Header */}
            <div
              onClick={() => toggleCategory(cat.name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                cursor: 'pointer', userSelect: 'none',
                borderBottom: '1px solid var(--colorNeutralStroke2)',
                marginBottom: isCollapsed ? 0 : 8,
              }}
            >
              <span style={{
                fontSize: 11, transition: 'transform 0.15s',
                transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                color: 'var(--colorNeutralForeground3)',
              }}>▼</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--colorNeutralForeground1)' }}>{cat.name}</span>
              <Badge appearance="outline" size="small" style={{ fontSize: 10 }}>{cat.tools} tools</Badge>
              <span style={{ fontSize: 11, color: 'var(--colorNeutralForeground3)', marginLeft: 'auto' }}>{cat.items.length} prompts</span>
            </div>

            {/* Prompt Cards */}
            {!isCollapsed && (
              <div className={styles.promptGrid}>
                {cat.items.map((item, idx) => {
                  const key = `${cat.name}-${idx}`;
                  return (
                    <div
                      key={key}
                      className={styles.promptCard}
                      onClick={() => handleCopy(item.prompt, key)}
                      title="Click to copy prompt"
                    >
                      <div className={styles.promptText}>{item.prompt}</div>
                      <div className={styles.promptMeta}>
                        <code style={{ fontSize: 10, color: 'var(--colorNeutralForeground3)' }}>{item.tool}</code>
                        <span style={{ fontSize: 10, color: 'var(--colorNeutralForeground4)' }}>{item.desc}</span>
                      </div>
                      <div className={styles.promptCopyIcon}>
                        {copied === key
                          ? <CheckmarkCircleRegular style={{ color: '#1e7e34', fontSize: 14 }} />
                          : <CopyRegular style={{ color: 'var(--colorNeutralForeground3)', fontSize: 12 }} />
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Footer ── */}
      <div style={{
        marginTop: 20, paddingTop: 12,
        borderTop: '1px solid var(--colorNeutralStroke2)',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 11,
        color: 'var(--colorNeutralForeground3)',
      }}>
        <BookOpenRegular style={{ fontSize: 14 }} />
        <span>See the full <a href="#/t3000/documentation/t3000/haystack/mcp-api-examples" style={{ color: 'var(--colorBrandForeground1)' }}>MCP API Examples</a> doc for prompt examples across the tool categories.</span>
      </div>
    </div>
  );
};

export default McpServerPage;
