/**
 * McpServerPage — MCP Server & Examples
 *
 * Route: /#/t3000/ai-assistant/mcp
 * Lives under the AI Assistant menu. Shows how to connect LLM agents
 * (Claude Desktop, VS Code Copilot, Cursor, Cline, etc.) to the T3000
 * MCP server, plus a library of natural-language prompt examples.
 */
import React, { useState } from 'react';
import {
  Tab, TabList, Badge, Button,
} from '@fluentui/react-components';
import {
  SparkleRegular, SettingsRegular, TagRegular, CopyRegular,
  CheckmarkCircleRegular, LightbulbRegular, BookOpenRegular,
} from '@fluentui/react-icons';
import { useLocation } from 'react-router-dom';
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

const McpTab: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

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
              <li>Look for the 🔌 icon — you should see 50+ T3000 tools available</li>
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
          <TagRegular style={{ fontSize: 14 }} /> Available Tools (50+ across 16 categories)
        </div>
        <table className={styles.mcpToolTable}>
          <thead>
            <tr><th style={{width:'22%'}}>Tool</th><th style={{width:'36%'}}>Description</th><th style={{width:'42%'}}>Parameters</th></tr>
          </thead>
          <tbody>
            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Haystack Tagging</td></tr>
            <tr><td><code>t3000_haystack_list_tags</code></td><td>List all Haystack tags with categories, documentation, and usage counts</td><td>filter?: string</td></tr>
            <tr><td><code>t3000_haystack_get_point_tags</code></td><td>Get tags assigned to specific points by serial number</td><td>serial_numbers: int[]<br/>point_type?: INPUT|OUTPUT|VARIABLE</td></tr>
            <tr><td><code>t3000_haystack_search_points</code></td><td>Search for points matching specific tag filters</td><td>tags: string[]<br/>serial_numbers?: int[]<br/>point_types?: string[]</td></tr>
            <tr><td><code>t3000_haystack_auto_tag</code></td><td>Run auto-tagging on devices (range+regex rules)</td><td>serial_numbers: int[]</td></tr>
            <tr><td><code>t3000_haystack_preview_tags</code></td><td>Preview auto-tagging results without writing to DB</td><td>serial_numbers: int[]</td></tr>
            <tr><td><code>t3000_haystack_list_rules</code></td><td>List all auto-tagging rules with patterns and priorities</td><td>—</td></tr>
            <tr><td><code>t3000_haystack_get_brick_class</code></td><td>Get Brick ontology class for specified points</td><td>serial_numbers: int[]</td></tr>

            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Core</td></tr>
            <tr><td><code>t3000_ping</code></td><td>Health check — returns server status and timestamp</td><td>—</td></tr>
            <tr><td><code>t3000_get_version</code></td><td>Server name, version, protocol version, tool count</td><td>—</td></tr>
            <tr><td><code>t3000_describe_tool</code></td><td>Get full schema and description for any tool</td><td>tool_name: string</td></tr>

            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Data &amp; Metadata</td></tr>
            <tr><td><code>t3000_device_list</code></td><td>List all devices with serial, name, type, point counts</td><td>filter_name?: string</td></tr>
            <tr><td><code>t3000_device_get_points</code></td><td>Get all points for a device with tags and Brick class</td><td>serial_number: int<br/>point_type?: INPUT|OUTPUT|VARIABLE</td></tr>
            <tr><td><code>t3000_point_get_metadata</code></td><td>Full metadata: label, units, range, tags, Brick class</td><td>serial_number, point_type, point_index</td></tr>
            <tr><td><code>t3000_metadata_search</code></td><td>Search points across devices by label text</td><td>query: string<br/>serial_numbers?, point_types?, limit?</td></tr>
            <tr><td><code>t3000_point_search</code></td><td>Semantic search across points by tag, label, or Brick class</td><td>query: string<br/>serial_numbers?, point_types?, limit?</td></tr>

            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Operational</td></tr>
            <tr><td><code>t3000_point_read</code></td><td>Read current value of a single point</td><td>serial_number, point_type, point_index</td></tr>
            <tr><td><code>t3000_point_write</code></td><td>Write a value to a point (confirm:true required)</td><td>serial_number, point_type, point_index, value, confirm</td></tr>
            <tr><td><code>t3000_point_read_batch</code></td><td>Read multiple points in a single call</td><td>points: [&#123;serial_number, point_type, point_index&#125;]</td></tr>
            <tr><td><code>t3000_point_write_batch</code></td><td>Write values to multiple points (confirm:true required)</td><td>points: [&#123;...value&#125;], confirm</td></tr>
            <tr><td><code>t3000_point_batch_metadata</code></td><td>Get metadata for multiple points at once</td><td>points: [&#123;serial_number, point_type, point_index&#125;]</td></tr>

            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Analytics</td></tr>
            <tr><td><code>t3000_haystack_validate</code></td><td>Validate tagging against ontology rules</td><td>serial_numbers?: int[]</td></tr>
            <tr><td><code>t3000_haystack_export</code></td><td>Export semantic model as haystack-json, brick-ttl, or brick-jsonld</td><td>serial_numbers: int[]<br/>format: string</td></tr>

            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Rules Management</td></tr>
            <tr><td><code>t3000_rule_toggle</code></td><td>Enable or disable an auto-tagging rule by ID</td><td>rule_id: int, enabled: boolean</td></tr>
            <tr><td><code>t3000_rule_create</code></td><td>Create a new auto-tagging rule with regex pattern</td><td>rule_name, pattern, category<br/>haystack_tags?, brick_class?, etc.</td></tr>

            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Alarms &amp; Trends</td></tr>
            <tr><td><code>t3000_alarm_list</code></td><td>List alarms, optionally filtered to active-only</td><td>serial_numbers?: int[]<br/>active_only?: boolean</td></tr>
            <tr><td><code>t3000_alarm_acknowledge</code></td><td>Acknowledge an alarm by device serial and alarm ID</td><td>serial_number: int<br/>alarm_id: string</td></tr>
            <tr><td><code>t3000_trendlog_query</code></td><td>Query historical trend data for a point over a time range</td><td>serial_number, point_type, point_index, start<br/>end?, limit?</td></tr>

            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Device Operations</td></tr>
            <tr><td><code>t3000_trendlog_list</code></td><td>List available trend logs for a device</td><td>serial_number: int</td></tr>
            <tr><td><code>t3000_trendlog_export</code></td><td>Export trend log data as CSV/JSON file</td><td>serial_number: int<br/>format?: string</td></tr>
            <tr><td><code>t3000_device_refresh</code></td><td>Refresh device data from the controller</td><td>serial_number: int</td></tr>
            <tr><td><code>t3000_schedule_list</code></td><td>List all schedules for a device</td><td>serial_number: int</td></tr>

            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Settings</td></tr>
            <tr><td><code>t3000_settings_read</code></td><td>Read device settings and configuration</td><td>serial_number: int</td></tr>
            <tr><td><code>t3000_settings_write</code></td><td>Write device settings (confirm:true required)</td><td>serial_number: int<br/>settings: object<br/>confirm: boolean</td></tr>
            <tr><td><code>t3000_device_control</code></td><td>Send control commands to a device</td><td>serial_number: int<br/>command: string<br/>params?: object</td></tr>

            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Control Logic</td></tr>
            <tr><td><code>t3000_program_list</code></td><td>List PLC programs on a device</td><td>serial_number: int</td></tr>
            <tr><td><code>t3000_program_read</code></td><td>Read a PLC program source code</td><td>serial_number: int<br/>program_id: string</td></tr>
            <tr><td><code>t3000_alarm_settings_read</code></td><td>Read alarm configuration settings for a device</td><td>serial_number: int</td></tr>
            <tr><td><code>t3000_users_list</code></td><td>List users configured on a device</td><td>serial_number: int</td></tr>
            <tr><td><code>t3000_graphics_list</code></td><td>List graphics/visualization screens on a device</td><td>serial_number: int</td></tr>

            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Documentation</td></tr>
            <tr><td><code>t3000_doc_list</code></td><td>List available documentation articles</td><td>section?: string</td></tr>
            <tr><td><code>t3000_doc_read</code></td><td>Read a specific documentation article</td><td>path: string</td></tr>
            <tr><td><code>t3000_pid_list</code></td><td>List PID loops on a device</td><td>serial_number: int</td></tr>
            <tr><td><code>t3000_holiday_list</code></td><td>List holiday schedules on a device</td><td>serial_number: int</td></tr>
            <tr><td><code>t3000_building_summary</code></td><td>Get a summary overview of the building system</td><td>serial_numbers?: int[]</td></tr>

            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Task Management</td></tr>
            <tr><td><code>t3000_task_create</code></td><td>Create a workflow task for commissioning or maintenance</td><td>title: string<br/>description?, serial_number?, priority?</td></tr>
            <tr><td><code>t3000_task_list</code></td><td>List all tasks, filter by status or device</td><td>status?: pending|in_progress|completed<br/>serial_number?: int</td></tr>
            <tr><td><code>t3000_task_update</code></td><td>Update task status, title, or priority</td><td>task_id: string<br/>status?, title?, description?, priority?</td></tr>
            <tr><td><code>t3000_task_delete</code></td><td>Delete a task by ID</td><td>task_id: string</td></tr>

            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Site Memory</td></tr>
            <tr><td><code>t3000_memory_save</code></td><td>Save site-specific knowledge that persists across sessions</td><td>key: string, content: string<br/>category?: string</td></tr>
            <tr><td><code>t3000_memory_list</code></td><td>List all saved site memories, filter by category or search</td><td>category?, search?: string</td></tr>
            <tr><td><code>t3000_memory_delete</code></td><td>Delete a memory entry by key</td><td>key: string</td></tr>

            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Diagnostics</td></tr>
            <tr><td><code>t3000_device_diagnostics</code></td><td>Comprehensive device health check: firmware, alarms, points, programs, PIDs</td><td>serial_number: int</td></tr>
            <tr><td><code>t3000_device_diagnostics_batch</code></td><td>Diagnose multiple devices or all devices at once</td><td>serial_numbers?: int[]</td></tr>

            <tr><td colSpan={3} style={{background:'var(--colorNeutralBackground2)',fontWeight:600,fontSize:11}}>🔵 Navigation</td></tr>
            <tr><td><code>t3000_nav_list</code></td><td>List all T3000 web UI pages with paths and shortcuts</td><td>section?: points|control|monitoring|config|system|develop</td></tr>
            <tr><td><code>t3000_nav_search</code></td><td>Search T3000 pages by keyword (e.g., 'PID', 'alarm')</td><td>query: string</td></tr>
            <tr><td><code>t3000_nav_redirect</code></td><td>Get navigation URL for a page, optionally with device</td><td>page: string<br/>serial_number?: int</td></tr>
            <tr><td><code>t3000_page_info</code></td><td>Get detailed info about a page: features, related tools</td><td>page: string</td></tr>
            <tr><td><code>t3000_device_current</code></td><td>Get the currently selected device in the web UI</td><td>—</td></tr>
          </tbody>
        </table>
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
    name: 'Data & Discovery', tools: 5, items: [
      { prompt: 'List all T3000 devices', tool: 't3000_device_list', desc: 'Enumerate all devices with serials and point counts' },
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
    name: 'Device Operations', tools: 4, items: [
      { prompt: 'List trend logs on device 233626', tool: 't3000_trendlog_list', desc: 'Enumerate available trend logs' },
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
        <span>See the full <a href="#/t3000/documentation/t3000/haystack/mcp-api-examples" style={{ color: 'var(--colorBrandForeground1)' }}>MCP API Examples</a> doc for all 50+ tools with detailed descriptions.</span>
      </div>
    </div>
  );
};

export default McpServerPage;
