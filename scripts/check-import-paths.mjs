#!/usr/bin/env node
/**
 * Fails when a relative import resolves only case-insensitively.
 *
 * Windows checkouts resolve `./TrendLogsPage` against `TrendlogsPage.tsx`, so a
 * wrong letter case passes locally and breaks the Linux (case-sensitive) build.
 * This check compares the import specifier with the on-disk spelling segment by
 * segment and reports every difference.
 *
 * Type-only imports are skipped: they are erased at build time, so a stale or
 * missing type module cannot break the bundle.
 *
 * Usage: node scripts/check-import-paths.mjs [--verbose]
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.vue']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'target']);

// Vite/TS resolution order; the empty entry keeps explicit specifiers exact.
const SUFFIXES = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.vue',
  '.css',
  '.scss',
  '.json',
  '/index.ts',
  '/index.tsx',
  '/index.js',
  '/index.vue',
];

const IMPORT_RE = /(?:from\s*|import\s*\(\s*|require\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
const TYPE_ONLY_RE = /^\s*(?:import|export)\s+type\b/;

const verbose = process.argv.includes('--verbose');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (CODE_EXT.has(path.extname(entry.name))) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/** Resolve `segments` under `startDir`, matching each segment case-insensitively. */
function resolveCaseInsensitive(startDir, segments) {
  let current = startDir;
  const resolved = [];
  for (const segment of segments) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      current = path.dirname(current);
      resolved.push('..');
      continue;
    }
    let entries;
    try {
      entries = fs.readdirSync(current);
    } catch {
      return null;
    }
    const match = entries.find((name) => name.toLowerCase() === segment.toLowerCase());
    if (!match) return null;
    current = path.join(current, match);
    resolved.push(match);
  }
  return { full: current, segments: resolved };
}

const problems = [];
let missing = 0;
let checked = 0;

for (const file of walk(SRC)) {
  const fileDir = path.dirname(file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

  for (const [index, line] of lines.entries()) {

    if (TYPE_ONLY_RE.test(line)) continue;

    for (const match of line.matchAll(IMPORT_RE)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) continue;

      const specPath = specifier.split('?')[0].split('#')[0].replace(/\\\\/g, '/');
      if (!specPath || specPath.endsWith('/')) continue;

      // `''`/`.` segments are dropped by the resolver, so drop them here too.
      const intendedSegments = specPath.split('/').filter((s) => s !== '' && s !== '.');

      let found = null;
      let usedSuffix = '';
      for (const suffix of SUFFIXES) {
        // The suffix belongs to the last specifier segment: `./Foo` -> `Foo.tsx`.
        const attempt = resolveCaseInsensitive(fileDir, (specPath + suffix).split('/'));
        if (attempt) {
          found = attempt;
          usedSuffix = suffix;
          break;
        }
      }

      checked += 1;
      if (!found) {
        missing += 1;
        if (verbose) {
          console.log(`missing (ignored): ${path.relative(ROOT, file)}:${index + 1}  ${specifier}`);
        }
        continue;
      }

      // Drop the suffix we added so the on-disk spelling can be compared with the specifier.
      const resolvedSegments = [...found.segments];
      if (usedSuffix === '') {
        // nothing to drop
      } else if (usedSuffix.startsWith('/')) {
        resolvedSegments.pop();
      } else {
        const last = resolvedSegments.length - 1;
        resolvedSegments[last] = resolvedSegments[last].slice(0, -usedSuffix.length);
      }

      for (let i = 0; i < intendedSegments.length; i += 1) {
        if (intendedSegments[i] !== resolvedSegments[i]) {
          problems.push({
            file: path.relative(ROOT, file),
            line: index + 1,
            specifier,
            expected: intendedSegments[i],
            onDisk: resolvedSegments[i],
            actualPath: path.relative(ROOT, found.full),
          });
          break;
        }
      }
    }
  }
}

if (problems.length === 0) {
  console.log(`import paths: ${checked} relative specifiers checked, all match on-disk case`);
  process.exit(0);
}

console.error(`import paths: ${problems.length} specifier(s) differ from the on-disk letter case\n`);
for (const problem of problems) {
  console.error(`  ${problem.file}:${problem.line}  ${problem.specifier}`);
  console.error(`      import says "${problem.expected}" but disk has "${problem.onDisk}"`);
  console.error(`      resolves to ${problem.actualPath}`);
}
console.error('\nWindows resolves these; Linux builds fail. Fix the import to match disk (or rename the file).');
process.exit(1);
