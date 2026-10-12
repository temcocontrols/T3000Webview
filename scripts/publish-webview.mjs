#!/usr/bin/env node
/**
 * publish-webview.mjs - one pass that puts the product payload where T3000 runs it.
 *
 *   dist/spa        -> <webview>/www      the app
 *   dist/docs       -> <webview>/docs     the documentation site (served at /docs/)
 *   T3000_Help.chm  -> <install>/T3000.exe directory (F1)
 *
 * Usage:
 *   node scripts/publish-webview.mjs [--target <webview dir>] [--dry-run]
 *                                    [--skip-app] [--skip-docs] [--skip-chm]
 *
 * Target resolution: --target, else T3000_WEBVIEW_DIR, else the standard install path if it
 * exists, else ./ResourceFile/webview (repo-local, for testing).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d = null) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const DRY = flag('--dry-run');
const STANDARD = 'C:\\Program Files (x86)\\T3000\\ResourceFile\\webview';

function resolveTarget() {
  const explicit = opt('--target') ?? process.env.T3000_WEBVIEW_DIR;
  if (explicit) return path.resolve(explicit);
  if (fs.existsSync(STANDARD)) return STANDARD;
  return path.join(ROOT, 'ResourceFile', 'webview');
}

function findChm() {
  const candidates = ['T3000_Help.chm', 'HelpDocs/T3000_Help.chm', 'dist/T3000_Help.chm', 'dist/docs/T3000_Help.chm'];
  for (const c of candidates) {
    const p = path.join(ROOT, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function copyDir(from, to, label) {
  if (!fs.existsSync(from)) {
    console.log(`skip  ${label}: ${path.relative(ROOT, from)} does not exist`);
    return false;
  }
  if (DRY) {
    console.log(`would ${label}: ${path.relative(ROOT, from)} -> ${to}`);
    return true;
  }
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true, force: true });
  console.log(`${label}: ${path.relative(ROOT, from)} -> ${to}`);
  return true;
}

const target = resolveTarget();
const www = path.join(target, 'www');
const docs = path.join(target, 'docs');

console.log('publish-webview');
console.log(`  target : ${target}${DRY ? '   (dry run)' : ''}`);

let actions = 0;
if (!flag('--skip-app')) actions += copyDir(path.join(ROOT, 'dist', 'spa'), www, 'app ') ? 1 : 0;
if (!flag('--skip-docs')) actions += copyDir(path.join(ROOT, 'dist', 'docs'), docs, 'docs') ? 1 : 0;

if (!flag('--skip-chm')) {
  const chm = findChm();
  if (!chm) {
    console.log('skip  chm : no T3000_Help.chm found (run: npm run build:help)');
  } else {
    const exeDir = path.dirname(target);           // <install>/ResourceFile/webview -> <install>
    const dest = path.join(exeDir, 'T3000_Help.chm');
    if (DRY) {
      console.log(`would chm : ${path.relative(ROOT, chm)} -> ${dest}`);
    } else {
      try {
        fs.copyFileSync(chm, dest);
        console.log(`chm  : ${path.relative(ROOT, chm)} -> ${dest}`);
      } catch (e) {
        console.log(`FAIL chm : ${dest} (${e.code}) - run from an elevated shell to write next to T3000.exe`);
      }
    }
    actions++;
  }
}

if (!actions) {
  console.log('\nnothing to publish - build first: npm run build (app) and npm run docs:site (docs)');
} else {
  console.log(`\n${DRY ? 'dry run complete' : 'published'}: ${actions} target(s)`);
  console.log('T3000 serves it as:  http://localhost:9103/       (app)');
  console.log('                     http://localhost:9103/docs/  (documentation)');
  console.log('no restart needed for the docs folder; restart T3000 only if the app changed.');
}
