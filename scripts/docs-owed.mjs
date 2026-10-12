#!/usr/bin/env node
/**
 * docs-owed.mjs - "a claimed feature changed and its page did not".
 *
 *   node scripts/docs-owed.mjs --base <sha>     check commits <sha>..HEAD
 *   node scripts/docs-owed.mjs --staged         check staged changes
 *
 * A page claims code with `code: [globs]` in docs/help/registry.json. If a changed file matches a
 * page's globs and that page (or its registry entry) did not change in the same range, the page is
 * owed. Waivers live in the registry: { until: 'YYYY-MM-DD', reason: '...' }.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const baseIdx = argv.indexOf('--base');
const base = baseIdx >= 0 ? argv[baseIdx + 1] : null;
const staged = argv.includes('--staged');

const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/help/registry.json'), 'utf8'));
const waivers = registry.waivers ?? {};

function gitLines(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

const changed = staged
  ? gitLines(['diff', '--name-only', '--cached'])
  : gitLines(['diff', '--name-only', `${base ?? 'HEAD~1'}..HEAD`]);

if (!changed.length) {
  console.log('docs-owed: no changed files in range');
  process.exit(0);
}

const changedDocs = new Set(changed.filter((f) => f.startsWith('docs/')).map((f) => f.replace(/^docs\//, '')));
const changedRegistry = changedDocs.has('help/registry.json');
const codeChanges = changed.filter((f) => !f.startsWith('docs/'));

// tiny glob -> regexp (only ** and * are used in the registry)
function globToRe(glob) {
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + esc.replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');
}

const today = new Date().toISOString().slice(0, 10);
const owed = [];

for (const [id, page] of Object.entries(registry.pages ?? {})) {
  const globs = page.code ?? [];
  if (!globs.length) continue;
  const hits = codeChanges.filter((f) => globs.some((g) => globToRe(g).test(f)));
  if (!hits.length) continue;

  const pageTouched = changedDocs.has(`${id}.md`) || changedRegistry;
  if (pageTouched) continue;
  if (hits.some((f) => changedDocs.has(f))) continue;

  const waiver = waivers[id];
  const waived = waiver && waiver.until && waiver.until >= today;
  owed.push({ id, hits: hits.slice(0, 5), waived, waiver });
}

if (!owed.length) {
  console.log(`docs-owed: OK - ${codeChanges.length} changed code file(s), no page owed`);
  process.exit(0);
}

let blocking = 0;
for (const o of owed) {
  console.log(`owed: ${o.id}`);
  for (const h of o.hits) console.log(`      changed: ${h}`);
  if (o.waived) {
    console.log(`      waiver until ${o.waiver.until}: ${o.waiver.reason ?? ''}`);
  } else {
    blocking++;
  }
}

if (blocking) {
  console.log(`\nFAIL: ${blocking} page(s) claim code that changed without them`);
  process.exitCode = 1;
} else {
  console.log('\nOK: every claim is waived');
}
