#!/usr/bin/env node
/**
 * normalize-docs.mjs
 * ---------------------------------------------------------------------------
 * Turns the Markdown that feeds T3000_Help.chm (docs/t3000 + docs/legacy) into
 * clean technical documentation. Mechanical only - it never rewrites prose,
 * never renames files and never touches fenced code blocks (ASCII diagrams,
 * string literals and arrow examples inside ``` must stay byte-identical).
 *
 * Rules
 *   R1  strip a UTF-8 BOM
 *   R2  remove decorative emoji / dingbats / geometric bullet glyphs, and turn
 *       status symbols into words (✅ -> Yes, ❌ -> No, ⚠ -> Warning)
 *   R3  heading hygiene: collapse whitespace, drop leftover separators and
 *       trailing "!" / "!!", convert ALL-CAPS headings to Title Case while
 *       preserving technical acronyms (API, BACnet, SQL, LVGL, T3000, ...)
 *   R4  structure: exactly one H1 (first heading), no heading-level jumps
 *
 * Usage
 *   node scripts/normalize-docs.mjs                 # dry run (default, writes nothing)
 *   node scripts/normalize-docs.mjs --apply         # write the changes
 *   node scripts/normalize-docs.mjs --only-headings # R3 + R4 only, leave body text alone
 *   node scripts/normalize-docs.mjs --strip-status  # also drop status words from titles
 *   node scripts/normalize-docs.mjs --samples 12    # examples printed per rule
 *
 * Revert with:  git checkout -- docs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = [path.join(REPO_ROOT, 'docs', 't3000'), path.join(REPO_ROOT, 'docs', 'legacy')];

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const ONLY_HEADINGS = argv.includes('--only-headings');
const STRIP_STATUS = argv.includes('--strip-status');
const sIdx = argv.indexOf('--samples');
const SAMPLES = sIdx >= 0 ? Number(argv[sIdx + 1]) : 6;

// ── R2: symbol handling ─────────────────────────────────────────────────────
/** Symbols replaced by a word (meaning preserved). */
const WORD_MAP = [
  [/[\u2705\u2714\u2713\u2611]/gu, 'Yes'], //  check marks
  [/[\u274C\u2717\u2718\u2610]/gu, 'No'], //   cross marks / empty box
  [/[\u26A0]/gu, 'Warning'], //                 warning sign
  [/[\u{1F6A8}]/gu, 'Important'], //            police light
];
/** Purely decorative: deleted. */
const DROP_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{23F0}-\u{23FF}\u{25A0}-\u{25FF}\u{2B1B}\u{2B1C}\u{FE0F}\u{200D}\u{20E3}]/gu;

const ACRONYMS = new Map(
  [
    'API', 'APIs', 'BACnet', 'SQL', 'SQLite', 'USB', 'JSON', 'HTTP', 'HTTPS', 'REST', 'UI', 'UX',
    'HVAC', 'PID', 'LVGL', 'SVG', 'EEZ', 'MFC', 'DB', 'CPU', 'RAM', 'IP', 'TCP', 'UDP', 'FFI',
    'WASM', 'PNG', 'JPG', 'JPEG', 'CSV', 'MQTT', 'TOD', 'ASCII', 'UTF', 'ANSI', 'CHM', 'HTML',
    'CSS', 'JS', 'TS', 'OK', 'ID', 'UUID', 'GUID', 'T3000', 'T3', 'Tstat', 'FDD', 'MCP', 'AI',
    'GPU', 'SSD', 'LAN', 'WAN', 'VPN', 'DNS', 'DHCP', 'MAC', 'OS', 'PC', 'VM', 'IDE', 'CRUD',
    'JWT', 'CORS', 'SSE', 'WS', 'WSS', 'TLS', 'SSL', 'UART', 'RS485', 'RS232', 'AO', 'DI', 'DO',
    'AI', 'CO2', 'NTP', 'XML', 'YAML', 'TOML', 'INI', 'MD', 'JSX', 'TSX', 'NPM', 'YARN', 'GIT',
    'CI', 'CD', 'URL', 'URI', 'SDK', 'CLI', 'AWS', 'ARM', 'IIS', 'DLL', 'EXE', 'ADMIN', 'TODO',
    'FIXME', 'WIP', 'PII', 'UI', 'IoT', 'IDE', 'SPI', 'I2C', 'GUI', 'NIC', 'SSID', 'AP',
    'PWM', 'VAV', 'AHU', 'RTU', 'PLC', 'SSH', 'FTP', 'AES', 'SHA', 'ACL', 'RBAC', 'GPIO',
    'IEC', 'ISO', 'LON', 'BACnet/IP', 'SNMP', 'SMTP', 'POP3', 'IMAP', 'TCP/IP', 'UDP',
  ].map((a) => [a.toLowerCase(), a])
);

/** Words removed from headings when --strip-status is enabled. */
const STATUS_WORDS = /\b(success|successful|successfully|complete|completed|completion|done|final|finished|fixed|resolved|working|implemented|verified|approved|ready|all good|mega|rejoice)\b/gi;

const isAllCaps = (s) => {
  const words = s.replace(/`[^`]*`/g, ' ').replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter((w) => w.length > 1);
  if (words.length < 2) return false;
  const caps = words.filter((w) => w === w.toUpperCase()).length;
  return caps / words.length >= 0.7;
};

const titleCase = (s) =>
  s.replace(/([A-Za-z][A-Za-z'’\-]*\d*)/g, (w) => {
    if (/\d/.test(w)) return w; // identifiers: T3000, RS485, HV2
    const hit = ACRONYMS.get(w.toLowerCase());
    if (hit) return hit;
    if (w.length <= 3 && w === w.toUpperCase()) return w; // IO, NC, AC, DC, RX, TX
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

// ── R6: authoring / process metadata ────────────────────────────────────────
/**
 * Sections that are about the *documenting process*, not the technology.
 * One word per entry; matched against the heading text.
 */
const META_SECTION_RE =
  /^(reviews?|code review|approvals?|sign[- ]?off|change ?log|revision history|version history|document history|todos?|to-do list|action items|next steps?\b.*|open questions?\b.*|questions\b.*|document (info|control|information)|metadata|authors?|reviewers?|approvers?|approval required from|credits|acknowledge?ments?)$/i;

/**
 * Document-header metadata labels. Deliberately excludes `label` and `severity`
 * and plain `status` (those are usually technical field documentation); a
 * document-state status is handled by DOC_META_STATUS.
 */
const DOC_META_LABEL =
  /^\s*(?:[-*+]\s*)?(?:\*\*|__)?(authors?|owner|assignees?|reviewers?|reviewed by|approved by|approvers?|design(?:ed)? by|prepared by|written by|created by|maintained by|created|updated|last updated|document (?:info|control|information)|related|parent)(?:\*\*|__)?\s*[:\u2014-]\s*\S/i;
/** `Date:` / `Version:` / `Priority:` are removed only when the value is short (a header value, not a field description). */
const DOC_META_SHORT =
  /^\s*(?:[-*+]\s*)?(?:\*\*|__)?(date|version|priority|milestone|sprint|epic|estimate|jira|bug id|ticket)(?:\*\*|__)?\s*[:\u2014-]\s*(.{1,60})$/i;
/** A document state ("Draft", "Design only", "In progress") - not a technical status. */
const DOC_META_STATUS =
  /^\s*(?:[-*+]\s*)?(?:\*\*|__)?status(?:\*\*|__)?\s*[:\u2014-]\s*(draft|planning|not started|design only|wip|in progress|in review|under review|complete|completed|done|approved|deprecated|proposed|superseded|stale|final)\b/i;

const isDocMetaLine = (line) => {
  const t = line.trim();
  if (!t || /\|/.test(t)) return false;
  return DOC_META_LABEL.test(t) || DOC_META_SHORT.test(t) || DOC_META_STATUS.test(t);
};

/**
 * R6: drops non-technical sections (heading + body until the next heading of the
 * same or higher level) and document-header metadata lines. Fenced code is
 * never inspected.
 */
function stripMeta(text, changes, file) {
  const lines = text.split('\n');
  const kept = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (fenceRe.test(line)) inFence = !inFence;
    const h = !inFence && /^(#{1,6})\s+(.*)$/.exec(line);
    if (h && META_SECTION_RE.test(h[2].trim().replace(/\s*\(.*\)$/, ''))) {
      const level = h[1].length;
      // Find the end of the section. The scan must be fence-aware: a line that
      // looks like a heading INSIDE a code block is not a section boundary.
      let j = i + 1;
      let fenced = false;
      while (j < lines.length) {
        if (fenceRe.test(lines[j])) fenced = !fenced;
        const nh = !fenced && /^(#{1,6})\s+/.exec(lines[j]);
        if (nh && nh[1].length <= level) break;
        j++;
      }
      // Never remove a range that would leave an unclosed code fence behind -
      // that would render the rest of the document as code.
      const fencesInBody = lines.slice(i + 1, j).filter((l) => fenceRe.test(l)).length;
      if (fencesInBody % 2) {
        changes.push({
          rule: 'R6 section kept (would break a code fence)',
          from: line.trim(),
          to: `(kept - ${fencesInBody} fence marker(s) inside)`,
          line: i + 1,
          file,
        });
        kept.push(line);
        continue;
      }
      changes.push({
        rule: 'R6 meta section removed',
        from: line.trim(),
        to: `(removed with ${j - i - 1} body line(s))`,
        line: i + 1,
        file,
      });
      i = j - 1;
      continue;
    }
    kept.push(line);
  }

  // Document-header metadata: only in the block between the title and the first
  // sub-heading (or the first 15 lines when the file has no sub-headings).
  let headerEnd = kept.findIndex((l) => /^#{2,6}\s/.test(l));
  if (headerEnd === -1) headerEnd = Math.min(kept.length, 15);
  const out = [];
  let inFence2 = false;
  kept.forEach((line, i) => {
    if (fenceRe.test(line)) inFence2 = !inFence2;
    if (!inFence2 && i < headerEnd && isDocMetaLine(line)) {
      changes.push({ rule: 'R6 header metadata removed', from: line.trim(), to: '', line: i + 1, file });
      return;
    }
    out.push(line);
  });

  // Tidy the blank lines left behind (outside code fences).
  const tidy = [];
  let inFence3 = false;
  let blanks = 0;
  for (const line of out) {
    if (fenceRe.test(line)) inFence3 = !inFence3;
    if (!inFence3 && !line.trim()) {
      if (++blanks > 1) continue;
    } else {
      blanks = 0;
    }
    tidy.push(line);
  }
  return tidy.join('\n');
}

/** R5: fullwidth / mis-encoded punctuation produced by an IME, mapped back to ASCII. */const FULLWIDTH_MAP = {
  '\uFF0F': '/', '\uFF08': '(', '\uFF09': ')', '\uFF1A': ':', '\uFF0C': ',', '\uFF1B': ';',
  '\uFF01': '!', '\uFF1F': '?', '\uFF5C': '|', '\uFF0B': '+', '\uFF0D': '-', '\uFF3B': '[',
  '\uFF3D': ']', '\uFF02': '"', '\uFF07': "'", '\uFF1E': '>', '\uFF1C': '<', '\uFF05': '%',
  '\uFF06': '&', '\uFF20': '@', '\uFF03': '#', '\uFF0A': '*', '\uFF1D': '=', '\u3000': ' ',
};
const FULLWIDTH_RE = new RegExp(`[${Object.keys(FULLWIDTH_MAP).join('')}]`, 'g');

// ── helpers ─────────────────────────────────────────────────────────────────
const fenceRe = /^\s*(```|~~~)/;

/**
 * Applies `fn` only to the parts of a line that are NOT inline `code spans`.
 * UI labels and commands are often quoted in backticks (`View ▸ Switch Theme`),
 * so those must survive untouched.
 */
function outsideCode(text, fn) {
  return text
    .split(/(`+[^`]*`+)/g)
    .map((part, i) => (i % 2 === 1 ? part : fn(part)))
    .join('');
}

const SENTINEL = '\u0001';

/**
 * Deletes decorative symbols. The deletion site is replaced by a sentinel first,
 * so only the whitespace around a removed symbol is collapsed - intentional
 * double spaces (Markdown hard line breaks, ASCII alignment) are left alone.
 */
function stripDecorative(text, removed) {
  return text
    .replace(DROP_RE, (ch) => {
      if (removed) removed.add(ch);
      return SENTINEL;
    })
    .replace(/\u0001+/g, SENTINEL) // collapse runs (emoji + variation selector)
    .replace(/\s*\u0001\s*/g, (m) => (m.includes(' ') ? ' ' : ''))
    .replace(/\u0001/g, '');
}

/**
 * R2: removes symbols from a chunk of text (never inside code spans).
 * `tableRow` matters: in a table cell `✅`/`❌` mean Yes/No, but as a bullet or
 * inline marker they are purely decorative and are deleted instead of becoming a
 * stray word ("- ✅ ALWAYS test" must not become "- Yes ALWAYS test").
 * Returns the new text plus the set of characters that were removed.
 */
function cleanSymbols(text, removed = new Set(), { tableRow = false } = {}) {
  let out = text;
  for (const [re, word] of WORD_MAP) {
    out = outsideCode(out, (t) =>
      t.replace(re, (ch) => {
        removed.add(ch);
        return tableRow ? word : SENTINEL;
      })
    );
  }
  return { text: outsideCode(out, (t) => stripDecorative(t, removed)), removed };
}

/** Renders removed characters as codes, since most are invisible in a console. */
const showRemoved = (set) =>
  [...set].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');

function normalizeHeadings(text, changes, relPath) {
  const lines = text.split('\n');
  const out = [];
  let inFence = false;
  const used = [];
  let firstHeadingIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (fenceRe.test(line)) inFence = !inFence;
    const m = !inFence && /^(#{1,6})(\s+)(.*)$/.exec(line);
    if (!m) {
      out.push(line);
      continue;
    }
    const level = m[1].length;
    let title = m[3];

    // R3: symbol + punctuation hygiene
    const hClean = cleanSymbols(title);
    title = hClean.text;
    title = outsideCode(title, (t) => t.replace(/\s{2,}/g, ' ')).trim();
    if (STRIP_STATUS) {
      title = outsideCode(title, (t) => t.replace(STATUS_WORDS, '').replace(/\s{2,}/g, ' ')).trim();
    }
    title = title.replace(/^[\s\-–—:•>|]+/, '').replace(/[\s\-–—:•|]+$/, '').trim();
    title = title.replace(/!{1,}$/, '').trim();
    if (isAllCaps(title)) title = outsideCode(title, titleCase);
    if (!title) title = '(untitled)';
    if (!title) title = '(untitled)';

    // R4: single H1 + no level jumps
    let newLevel = level;
    if (used.length === 0) {
      newLevel = 1;
      firstHeadingIdx = i;
    } else {
      const prev = used[used.length - 1];
      const cap = Math.min(prev + 1, 6);
      if (newLevel > cap) newLevel = cap;
      if (newLevel === 1) newLevel = 2; // only one H1 per file
    }
    used.push(newLevel);

    const rebuilt = `${'#'.repeat(newLevel)} ${title}`;
    if (rebuilt !== line) {
      changes.push({ rule: 'R3/R4 heading', from: line.trim(), to: rebuilt.trim(), line: i + 1 });
    }
    out.push(rebuilt);
  }

  // R4: ensure the H1 is the first content line
  if (firstHeadingIdx > 0) {
    const before = out.slice(0, firstHeadingIdx).filter((l) => l.trim());
    if (before.length) {
      const h1 = out[firstHeadingIdx];
      out.splice(firstHeadingIdx, 1);
      let insertAt = 0;
      while (insertAt < out.length && !out[insertAt].trim()) insertAt++;
      out.splice(insertAt, 0, h1, '');
      changes.push({ rule: 'R4 H1 moved to top', from: '(heading below content)', to: h1.trim(), line: 1 });
    }
  }

  // R4: a file with no heading at all gets a title taken from its file name.
  if (used.length === 0 && relPath) {
    const base = path.basename(relPath, '.md').replace(/^\d+[.\-]?\s*/, '');
    const title = titleCase(base.replace(/[-_]+/g, ' ').trim());
    if (title) {
      out.unshift(`# ${title}`, '');
      changes.push({ rule: 'R4 title added', from: '(no heading)', to: `# ${title}`, line: 1, file: relPath });
    }
  }
  return out.join('\n');
}

function normalizeBody(text, changes, file) {
  const lines = text.split('\n');
  let inFence = false;
  const out = lines.map((line, i) => {
    if (fenceRe.test(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line;
    const cleaned = cleanSymbols(line, new Set(), { tableRow: line.includes('|') });
    let next = cleaned.text;
    const repaired = outsideCode(next, (t) => t.replace(FULLWIDTH_RE, (ch) => FULLWIDTH_MAP[ch] ?? ch));
    if (repaired !== next) {
      changes.push({
        rule: 'R5 fullwidth punctuation',
        from: next.trim().slice(0, 100),
        to: repaired.trim().slice(0, 100),
        line: i + 1,
        file,
      });
      next = repaired;
    }
    if (cleaned.text !== line) {
      changes.push({
        rule: 'R2 symbols',
        from: line.trim().slice(0, 100),
        to: cleaned.text.trim().slice(0, 100),
        removed: showRemoved(cleaned.removed),
        line: i + 1,
        file,
      });
    }
    return next;
  });
  return out.join('\n');
}

// ── walk ────────────────────────────────────────────────────────────────────
function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, acc);
    else if (e.name.toLowerCase().endsWith('.md')) acc.push(abs);
  }
  return acc;
}

const files = ROOTS.flatMap((r) => walk(r));
const allChanges = [];
let touched = 0;
let bomCount = 0;

for (const abs of files) {
  const rel = path.relative(REPO_ROOT, abs).replace(/\\/g, '/');
  const original = fs.readFileSync(abs, 'utf8');
  const before = [];
  const hadBom = original.charCodeAt(0) === 0xfeff;
  let text = original;

  if (hadBom) {
    text = text.slice(1);
    bomCount++;
    before.push({ rule: 'R1 BOM stripped', from: '(BOM)', to: '', line: 1 });
  }

  const crlf = original.includes('\r\n');
  text = text.replace(/\r\n/g, '\n');
  const originalNorm = (hadBom ? original.slice(1) : original).replace(/\r\n/g, '\n');

  const changes = [];
  text = normalizeHeadings(text, changes, rel);
  if (!ONLY_HEADINGS) {
    text = normalizeBody(text, changes, rel);
    text = stripMeta(text, changes, rel);
  }

  // Compare against the original *after* BOM/newline normalisation - otherwise a
  // file whose only problem is a BOM would never be rewritten.
  if (hadBom || text !== originalNorm) {
    touched++;
    for (const c of [...before, ...changes]) allChanges.push({ ...c, file: rel });
    if (APPLY) fs.writeFileSync(abs, crlf ? text.replace(/\n/g, '\r\n') : text, 'utf8');
  }
}

// ── report ──────────────────────────────────────────────────────────────────
const byRule = new Map();
for (const c of allChanges) byRule.set(c.rule, (byRule.get(c.rule) || 0) + 1);

console.log(
  `\nDocs normalization ${APPLY ? '(APPLIED)' : '(dry run - nothing written)'}` +
    `${ONLY_HEADINGS ? ' [headings only]' : ''}${STRIP_STATUS ? ' [strip status words]' : ''}\n`
);
console.log(`  files scanned : ${files.length}`);
console.log(`  files changed : ${touched}`);
console.log(`  edits         : ${allChanges.length}\n`);
for (const [rule, n] of [...byRule.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${rule}`);
}

for (const rule of [...byRule.keys()]) {
  const items = allChanges.filter((c) => c.rule === rule);
  console.log(`\n─── ${rule} (${items.length}) — examples ───`);
  for (const c of items.slice(0, SAMPLES)) {
    console.log(`  ${c.file}:${c.line ?? ''}${c.removed ? `   [removed ${c.removed}]` : ''}`);
    console.log(`    - ${c.from}`);
    console.log(`    + ${c.to}`);
  }
}

if (!APPLY) console.log('\nRe-run with --apply to write these changes.\n');
