#!/usr/bin/env node
/**
 * audit-media.mjs - image hygiene for the docs tree.
 *
 *   node scripts/audit-media.mjs            report everything
 *   node scripts/audit-media.mjs --check    exit 1 when a *missing* image is referenced from
 *                                           user-audience docs (docs/t3000/**)
 *
 * Reports: missing (referenced, not on disk), unused (on disk, referenced by nothing),
 * oversized (> 2 MB or reported by --max-bytes), duplicates (same bytes, different names).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const DOCS = path.join(ROOT, 'docs');
const CHECK = process.argv.includes('--check');
const MAX_BYTES = 2 * 1024 * 1024;
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'todo']);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

const all = walk(DOCS);
const mdFiles = all.filter((f) => f.toLowerCase().endsWith('.md'));
const imgFiles = all.filter((f) => IMG_EXT.has(path.extname(f).toLowerCase()));

const referenced = new Set();
const missing = [];

for (const md of mdFiles) {
  const text = fs.readFileSync(md, 'utf8');
  const refs = new Set();
  for (const m of text.matchAll(/!\[[^\]]*\]\(\s*([^)\s]+)/g)) refs.add(m[1]);
  for (const m of text.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) refs.add(m[1]);
  for (const raw of refs) {
    if (/^(https?:|data:|mailto:|#)/i.test(raw)) continue;
    if (/^[@{$]/.test(raw)) continue; // framework aliases (@/…, ${…}) are not doc-relative paths
    const clean = raw.split('#')[0].split('?')[0];
    if (!clean) continue;
    const abs = path.resolve(path.dirname(md), decodeURIComponent(clean));
    referenced.add(abs);
    if (!fs.existsSync(abs)) {
      missing.push({ page: path.relative(ROOT, md).split(path.sep).join('/'), ref: clean, userAudience: md.includes(`${path.sep}t3000${path.sep}`) });
    }
  }
}

const unused = imgFiles.filter((f) => !referenced.has(f));
const oversized = imgFiles
  .map((f) => ({ f, size: fs.statSync(f).size }))
  .filter((x) => x.size > MAX_BYTES)
  .sort((a, b) => b.size - a.size);

const byHash = new Map();
for (const f of imgFiles) {
  const h = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  if (!byHash.has(h)) byHash.set(h, []);
  byHash.get(h).push(f);
}
const duplicates = [...byHash.values()].filter((g) => g.length > 1);

const show = (p) => path.relative(ROOT, p).split(path.sep).join('/');

console.log(`media audit - ${mdFiles.length} pages, ${imgFiles.length} images`);
console.log(`  missing   : ${missing.length}`);
for (const m of missing.slice(0, 20)) console.log(`      ${m.page} -> ${m.ref}`);
console.log(`  unused    : ${unused.length}`);
for (const f of unused.slice(0, 20)) console.log(`      ${show(f)}`);
console.log(`  oversized : ${oversized.length} (> ${Math.round(MAX_BYTES / 1024 / 1024)} MB)`);
for (const o of oversized.slice(0, 10)) console.log(`      ${(o.size / 1024 / 1024).toFixed(1)} MB  ${show(o.f)}`);
console.log(`  duplicates: ${duplicates.length} group(s)`);
for (const g of duplicates.slice(0, 10)) console.log(`      ${g.map(show).join('  ==  ')}`);

if (CHECK) {
  const blocking = missing.filter((m) => m.userAudience);
  if (blocking.length) {
    console.log(`\nFAIL: ${blocking.length} missing image(s) referenced from docs/t3000/**`);
    process.exitCode = 1;
  } else {
    console.log('\nOK: no missing images in user-audience docs');
  }
}
