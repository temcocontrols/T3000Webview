#!/usr/bin/env node
/**
 * audit-docs.mjs
 * ---------------------------------------------------------------------------
 * Read-only audit of the Markdown that is folded into T3000_Help.chm
 * (docs/t3000 + docs/legacy), looking for anything that is not clean
 * technical documentation:
 *
 *   - emoji / decorative symbols in headings
 *   - "shouting" headings (ALL CAPS, trailing '!', '!!!')
 *   - status chatter in titles (SUCCESS / COMPLETE / FINAL / DONE / FIXED ...)
 *   - mojibake: CJK characters inside English text (a mis-encoded emoji/arrow,
 *     e.g. a '->' arrow or checkmark written through an ANSI pipeline)
 *   - structural problems: no H1, H1 not first, heading level jumps,
 *     duplicate H1s across the corpus, trailing whitespace in headings
 *   - authoring leftovers: date-stamped journal sections, TODO/FIXME markers
 *   - broken relative links to other .md files
 *
 * Usage:
 *   node scripts/audit-docs.mjs              # summary table
 *   node scripts/audit-docs.mjs --list       # every finding
 *   node scripts/audit-docs.mjs --list --top 20
 *   node scripts/audit-docs.mjs --json report.json
 *
 * Writes nothing unless --json is given.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = [
  path.join(REPO_ROOT, 'docs', 't3000'),
  path.join(REPO_ROOT, 'docs', 'legacy'),
];

const args = process.argv.slice(2);
const LIST = args.includes('--list');
const CHARS = args.includes('--chars');
const META = args.includes('--meta');
const jsonIdx = args.indexOf('--json');
const JSON_OUT = jsonIdx >= 0 ? args[jsonIdx + 1] : null;
const topIdx = args.indexOf('--top');
const TOP = topIdx >= 0 ? Number(args[topIdx + 1]) : 15;

/** Histogram of every non-ASCII character, to tell emoji from mojibake. */
const charHist = new Map();
function tallyChars(text) {
  for (const ch of text) {
    if (ch.charCodeAt(0) > 127) charHist.set(ch, (charHist.get(ch) || 0) + 1);
  }
}

// ── patterns ────────────────────────────────────────────────────────────────
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2705}\u{2713}\u{2714}\u{274C}\u{2B50}]/u;
const NON_ASCII = /[^\x00-\x7F]/;
const CJK = /[\u3000-\u303F\u4E00-\u9FFF\uFF00-\uFFEF]/; // mojibake signature in English docs
const STATUS_WORD = /\b(SUCCESS|SUCCESSFUL|COMPLETE|COMPLETED|DONE|FINAL|FINISHED|FIXED|RESOLVED|WORKING|IMPLEMENTED|VERIFIED|APPROVED|READY)\b/i;
const SHOUT_WORD = /\b(IMPORTANT|CRITICAL|WARNING|NOTE|BREAKING|MUST|NEVER|ALWAYS)\b/;
const JOURNAL = /^#{2,3}\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/;
const MARKER = /\b(TODO|FIXME|XXX|HACK|WIP)\b/;

/** Authoring/process metadata - not part of a technical document. */
const META_LABEL =
  /^\s*(?:[-*+]\s*)?(?:\*\*|__)?(author|authors|owner|assignee|assignees|reviewer|reviewers|reviewed by|approved by|approver|approvers|design(?:ed)? by|prepared by|written by|created by|maintained by|created|updated|last updated|date|version|status|priority|severity|labels?|milestone|sprint|epic|due date|estimate|parent|related|jira|bug id|ticket)(?:\*\*|__)?\s*[:\u2014-]/i;
const ATTRIBUTION =
  /^\s*(?:[-*+]\s*)?(?:design(?:ed)?|prepared|written|authored|maintained|reviewed|approved|created|documented|implemented)\s+by\s+[A-Z][^\n]{1,60}$/;
const TODO_LINE = /^\s*(?:[-*+]\s*)?(?:TODO|FIXME|XXX|HACK|WIP)\b\s*[:\u2014-]?/i;
const META_SECTION =
  /^(review|reviews|code review|approval|approvals|sign[- ]?off|change ?log|revision history|version history|document history|todo|to-do list|action items|next steps|open questions|questions|document (info|control|information)|metadata|authors?|reviewers?|approvers?|credits|acknowledge?ments?)\b/i;

const CHAR_NAMES = {
  '\u2026': 'ellipsis', '\u2014': 'em dash', '\u2013': 'en dash',
  '\u2019': 'right single quote', '\u2018': 'left single quote',
  '\u201C': 'left double quote', '\u201D': 'right double quote',
  '\u2192': 'rightwards arrow', '\u2190': 'leftwards arrow', '\u2194': 'left right arrow',
  '\u2022': 'bullet', '\u00B7': 'middle dot', '\u00A0': 'non-breaking space',
  '\u00B0': 'degree sign', '\u00B5': 'micro sign', '\u00B2': 'superscript two',
  '\u00A9': 'copyright', '\u00AE': 'registered', '\u00D7': 'multiplication sign',
  '\u2264': 'less-or-equal', '\u2265': 'greater-or-equal', '\u00A7': 'section sign',
  '\u2713': 'check mark', '\u2714': 'heavy check mark', '\u2705': 'white heavy check mark',
  '\u26A0': 'warning sign', '\u274C': 'cross mark', '\u2B50': 'star', '\u2728': 'sparkles',
};

function charName(ch) {
  if (CHAR_NAMES[ch]) return CHAR_NAMES[ch];
  const cp = ch.codePointAt(0);
  if (cp >= 0x1f000) return 'emoji (pictograph)';
  if (cp >= 0x4e00 && cp <= 0x9fff) return 'CJK ideograph   <-- mojibake?';
  if (cp >= 0xff00) return 'fullwidth form  <-- mojibake?';
  if (cp >= 0x3000 && cp <= 0x303f) return 'CJK punctuation <-- mojibake?';
  if (cp >= 0x2190 && cp <= 0x21ff) return 'arrow';
  if (cp >= 0x2600 && cp <= 0x27bf) return 'dingbat/symbol';
  if (cp >= 0x2b00 && cp <= 0x2bff) return 'misc symbol';
  return 'latin/symbol';
}

const isAllCaps = (s) => {  const words = s.replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter((w) => w.length > 1);
  if (words.length < 3) return false;
  const caps = words.filter((w) => w === w.toUpperCase()).length;
  return caps / words.length >= 0.7;
};

/** Strips fenced code blocks so prose checks do not fire on code samples. */
function stripFences(text) {
  return text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, (m) => '\n'.repeat(m.split('\n').length - 1));
}

function headings(text) {
  const out = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const m = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
    if (m) out.push({ level: m[1].length, text: m[2], line: i + 1 });
  });
  return out;
}

function relLinks(text) {
  const out = [];
  const re = /\[[^\]]*\]\(([^)\s]+\.md)(#[^)\s]*)?\)/g;
  let m;
  while ((m = re.exec(text))) {
    // only *relative* links; absolute URLs are valid external references
    if (/^[a-z][a-z0-9+.-]*:/i.test(m[1]) || m[1].startsWith('/')) continue;
    out.push(m[1]);
  }
  return out;
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
const findings = [];
const h1Index = new Map();
let totals = { headings: 0, emoji: 0, shout: 0, status: 0, mojibake: 0, nonAscii: 0, journal: 0, markers: 0, brokenLinks: 0 };

for (const abs of files) {
  const rel = path.relative(REPO_ROOT, abs).replace(/\\/g, '/');
  const raw = fs.readFileSync(abs, 'utf8');
  const prose = stripFences(raw);
  const hs = headings(prose);
  totals.headings += hs.length;
  tallyChars(prose);

  const push = (kind, detail) => findings.push({ kind, file: rel, detail });

  // ── structure
  const h1s = hs.filter((h) => h.level === 1);
  const firstLine = prose.split(/\r?\n/).find((l) => l.trim());
  if (!h1s.length) push('no-h1', firstLine ? firstLine.slice(0, 70) : '(empty file)');
  else if (!/^#\s/.test(firstLine || '')) push('h1-not-first', h1s[0].text.slice(0, 70));
  if (h1s.length > 1) push('multiple-h1', `${h1s.length}: ` + h1s.map((h) => h.text).join(' | ').slice(0, 90));
  if (h1s.length) {
    const t = h1s[0].text;
    if (!h1Index.has(t)) h1Index.set(t, []);
    h1Index.get(t).push(rel);
  }
  for (let i = 1; i < hs.length; i++) {
    if (hs[i].level - hs[i - 1].level > 1) {
      push('level-jump', `H${hs[i - 1].level} -> H${hs[i].level} at line ${hs[i].line}: ${hs[i].text.slice(0, 60)}`);
    }
  }

  // ── heading hygiene
  for (const h of hs) {
    if (EMOJI.test(h.text)) push('emoji-heading', `H${h.level} ${h.text.slice(0, 80)}`);
    if (isAllCaps(h.text)) push('caps-heading', `H${h.level} ${h.text.slice(0, 80)}`);
    if (/!+\s*$/.test(h.text)) push('bang-heading', `H${h.level} ${h.text.slice(0, 80)}`);
    if (STATUS_WORD.test(h.text) && (isAllCaps(h.text) || /!+$/.test(h.text) || h.text.split(/\s+/).length <= 6)) {
      push('status-heading', `H${h.level} ${h.text.slice(0, 80)}`);
    }
    if (SHOUT_WORD.test(h.text) && h.text.split(/\s+/).length <= 4) {
      push('shout-heading', `H${h.level} ${h.text.slice(0, 80)}`);
    }
    if (h.text.length > 90) push('long-heading', `H${h.level} (${h.text.length}) ${h.text.slice(0, 70)}...`);
  }

  // ── encoding
  if (EMOJI.test(prose)) {
    const n = (prose.match(new RegExp(EMOJI.source, 'gu')) || []).length;
    totals.emoji += n;
    push('emoji-body', `${n} emoji/symbols`);
  }
  if (NON_ASCII.test(prose)) totals.nonAscii++;
  if (CJK.test(prose)) {
    const sample = prose.match(/[\u4E00-\u9FFF\uFF00-\uFFEF]{1,6}/g) || [];
    totals.mojibake++;
    push('mojibake', `${sample.length} CJK run(s), e.g. ${sample.slice(0, 4).join(' ')}`);
  }

  // ── authoring leftovers
  for (const h of hs) if (JOURNAL.test(`## ${h.text}`)) { totals.journal++; push('journal-heading', `line ${h.line}: ${h.text.slice(0, 60)}`); break; }
  const mk = prose.match(new RegExp(MARKER, 'g'));
  if (mk) { totals.markers++; push('marker', mk.slice(0, 6).join(', ')); }

  // ── code fences must be balanced or the rest of the page renders as code
  const fenceCount = (raw.match(/^\s*(```|~~~)/gm) || []).length;
  if (fenceCount % 2) push('unbalanced-fence', `${fenceCount} fence delimiter(s) - odd`);

  // ── authoring/process metadata
  const metaLabel = [];
  const attribution = [];
  const todoLines = [];
  const metaSections = [];
  for (const h of hs) if (META_SECTION.test(h.text)) metaSections.push(`H${h.level} ${h.text.slice(0, 60)}`);
  prose.split(/\r?\n/).forEach((l, i) => {
    const t = l.trim();
    if (!t) return;
    if (TODO_LINE.test(t)) todoLines.push(`line ${i + 1}: ${t.slice(0, 70)}`);
    else if (META_LABEL.test(t) && !/\|/.test(t)) metaLabel.push(`line ${i + 1}: ${t.slice(0, 70)}`);
    else if (ATTRIBUTION.test(t)) attribution.push(`line ${i + 1}: ${t.slice(0, 70)}`);
  });
  for (const [kind, arr] of [
    ['meta-section', metaSections],
    ['meta-label', metaLabel],
    ['attribution', attribution],
    ['todo-line', todoLines],
  ]) {
    if (arr.length) {
      totals[kind.replace('-', '')] = true;
      push(kind, `${arr.length}x  e.g. ${arr[0]}`);
    }
  }

  // ── links
  for (const t of relLinks(raw)) {
    const target = path.resolve(path.dirname(abs), decodeURIComponent(t));
    if (!fs.existsSync(target)) { totals.brokenLinks++; push('broken-link', t); }
  }
}

// ── duplicate H1s
for (const [title, list] of h1Index) {
  if (list.length > 1) findings.push({ kind: 'duplicate-h1', file: list.join(' , '), detail: title });
}

// ── report
const byKind = new Map();
for (const f of findings) byKind.set(f.kind, (byKind.get(f.kind) || 0) + 1);

const ORDER = [
  ['no-h1', 'no H1 title'],
  ['h1-not-first', 'H1 not the first line'],
  ['multiple-h1', 'more than one H1'],
  ['duplicate-h1', 'duplicate H1 across files'],
  ['level-jump', 'heading level jump'],
  ['mojibake', 'mojibake (CJK in English text)'],
  ['emoji-heading', 'emoji in heading'],
  ['emoji-body', 'emoji in body text'],
  ['caps-heading', 'ALL-CAPS heading'],
  ['bang-heading', 'heading ends with "!"'],
  ['status-heading', 'status word in heading'],
  ['shout-heading', 'SHOUT word in short heading'],
  ['long-heading', 'heading longer than 90 chars'],
  ['journal-heading', 'date-stamped journal heading'],
  ['marker', 'TODO/FIXME/WIP marker'],
  ['meta-section', 'non-technical section (review/approval/changelog/todo/...)'],
  ['meta-label', 'authoring metadata line (Author/Status/Reviewer/...)'],
  ['attribution', 'byline ("Design by ...", "Reviewed by ...")'],
  ['todo-line', 'TODO/FIXME line'],
  ['unbalanced-fence', 'unbalanced code fence (rest of page renders as code)'],
  ['broken-link', 'broken relative .md link'],
];

console.log(`\nDocs audit - ${files.length} Markdown files, ${(files.reduce((n, f) => n + fs.statSync(f).size, 0) / 1048576).toFixed(2)} MB, ${totals.headings} headings\n`);
console.log('  count  issue');
console.log('  -----  ' + '-'.repeat(48));
for (const [kind, label] of ORDER) {
  const n = byKind.get(kind) || 0;
  console.log(`  ${String(n).padStart(5)}  ${label}`);
  void label;
}
const other = [...byKind.keys()].filter((k) => !ORDER.some(([o]) => o === k));
if (other.length) console.log(`  ${String(other.reduce((n, k) => n + byKind.get(k), 0)).padStart(5)}  (other: ${other.join(', ')})`);

const filesWithIssues = new Set(findings.map((f) => f.file.split(' , ')[0]));
console.log(`\n  ${filesWithIssues.size} of ${files.length} files have at least one finding\n`);

// worst offenders
const perFile = new Map();
for (const f of findings) {
  const k = f.file.split(' , ')[0];
  perFile.set(k, (perFile.get(k) || 0) + 1);
}
const worst = [...perFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP);
if (worst.length) {
  console.log(`  Top ${worst.length} files by finding count:`);
  for (const [f, n] of worst) console.log(`   ${String(n).padStart(4)}  ${f}`);
  console.log('');
}

if (CHARS) {
  const rows = [...charHist.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\n─── non-ASCII characters (${rows.length} distinct) ───`);
  console.log('  code   count  char   name');
  for (const [ch, n] of rows.slice(0, 40)) {
    const code = 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    console.log(`  ${code}  ${String(n).padStart(5)}  ${ch}      ${charName(ch)}`);
  }
  if (rows.length > 40) console.log(`  ... and ${rows.length - 40} more`);
  console.log('');
}

if (META) {
  const secTitles = new Map();
  const labels = new Map();
  for (const abs of files) {
    const prose = stripFences(fs.readFileSync(abs, 'utf8'));
    let inF = false;
    for (const line of fs.readFileSync(abs, 'utf8').split(/\r?\n/)) {
      if (/^\s*(```|~~~)/.test(line)) inF = !inF;
      if (inF) continue;
      const h = /^#{1,6}\s+(.*)$/.exec(line);
      if (h && META_SECTION.test(h[1].trim())) secTitles.set(h[1].trim(), (secTitles.get(h[1].trim()) || 0) + 1);
    }
    for (const line of prose.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || /\|/.test(t)) continue;
      const m = /^(?:[-*+]\s*)?(?:\*\*|__)?([A-Za-z][A-Za-z /]{1,24})(?:\*\*|__)?\s*[:\u2014-]/.exec(t);
      if (m && META_LABEL.test(t)) labels.set(m[1].trim().toLowerCase(), (labels.get(m[1].trim().toLowerCase()) || 0) + 1);
    }
  }
  const dump = (title, map) => {
    console.log(`\n─── ${title} (${map.size} distinct) ───`);
    for (const [t, n] of [...map.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${t}`);
  };
  dump('non-technical section titles', secTitles);
  dump('metadata labels', labels);
  console.log('');
}

if (LIST) {
  console.log('\n─── findings ───');
  for (const [kind, label] of ORDER) {
    const items = findings.filter((f) => f.kind === kind);
    if (!items.length) continue;
    console.log(`\n## ${label} (${items.length})`);
    for (const f of items) console.log(`   ${f.file}\n      ${f.detail}`);
  }
}

if (JSON_OUT) {
  fs.writeFileSync(JSON_OUT, JSON.stringify({ totals, findings }, null, 2), 'utf8');
  console.log(`\nJSON written to ${JSON_OUT}`);
}
