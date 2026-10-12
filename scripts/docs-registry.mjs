#!/usr/bin/env node
/**
 * docs-registry.mjs - the registry is the single source of structure.
 *
 *   node scripts/docs-registry.mjs --seed    merge the file tree into docs/help/registry.json
 *                                            (existing entries win; new pages get defaults)
 *   node scripts/docs-registry.mjs           generate everything derived from the registry:
 *                                            docs/docfx.json, per-folder toc.yml,
 *                                            docs/help/index.json, docs/help/page-meta.json
 *   node scripts/docs-registry.mjs --check   same, but only report drift (exit 1) and run the
 *                                            CHM-manifest parity check
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const DOCS = path.join(ROOT, 'docs');
const REGISTRY_FILE = path.join(DOCS, 'help', 'registry.json');
const AREAS = ['t3000', 'legacy', 'design'];
const AUDIENCE = { t3000: 'user', legacy: 'developer', design: 'contributing' };
const NOINDEX_AREAS = ['design'];
const SKIP_DIRS = new Set(['media', 'images', 'uploads', 'img', 'node_modules', '.git']);
const CHM_MANIFESTS = ['manual.json', 'reference.json', 'engineering.json'];

const args = process.argv.slice(2);
const doSeed = args.includes('--seed');
const doCheck = args.includes('--check');

// ---------------------------------------------------------------- helpers
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function walkMd(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walkMd(p, out);
    } else if (e.name.toLowerCase().endsWith('.md')) {
      out.push(p);
    }
  }
  return out;
}

function firstH1(text) {
  for (const line of text.split(/\r?\n/)) {
    const m = /^#\s+(.+?)\s*$/.exec(line);
    if (m) return m[1].replace(/[*_`]/g, '').trim();
  }
  return null;
}

function headings(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^#{2,3}\s+(.+?)\s*$/.exec(line);
    if (m) out.push(m[1].replace(/[*_`]/g, '').trim());
  }
  return out;
}

function prettify(name) {
  return name
    .replace(/\.md$/i, '')
    .replace(/^\d+[\s._-]*/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function gitInfo(relPath) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%an|%h|%ad', '--date=short', '--', relPath], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!out) return null;
    const [author, sha, date] = out.split('|');
    return { author, sha, date };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- registry
function loadRegistry() {
  if (!fs.existsSync(REGISTRY_FILE)) return { version: 1, areas: {}, pages: {}, waivers: {} };
  return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
}

/** Build the page map the tree implies, merged with whatever the registry already says. */
function buildPages(existing) {
  const pages = {};
  for (const area of AREAS) {
    const areaDir = path.join(DOCS, area);
    if (!fs.existsSync(areaDir)) continue;
    for (const file of walkMd(areaDir)) {
      const relDoc = rel(file);                        // docs/t3000/features/x.md
      const id = relDoc.replace(/^docs\//, '').replace(/\.md$/i, '');
      const parts = id.split('/');                     // [area, chapter?, ...]
      const chapter = parts.length > 2 ? parts[1] : '(root)';
      const text = fs.readFileSync(file, 'utf8');
      const prev = existing[id] ?? {};
      pages[id] = {
        title: prev.title ?? firstH1(text) ?? prettify(path.basename(file)),
        area,
        chapter: prev.chapter ?? chapter,
        order: prev.order ?? 0,
        audience: prev.audience ?? AUDIENCE[area] ?? 'contributing',
        ship: prev.ship ?? area === 't3000',
        owner: prev.owner ?? 'docs',
        tags: prev.tags ?? [],
        keywords: prev.keywords ?? [],
        help_ids: prev.help_ids ?? [],
        code: prev.code ?? [],
        reviewed: prev.reviewed ?? null,
      };
    }
  }
  // order: keep curated values, otherwise 10,20,30... inside each chapter
  const byChapter = new Map();
  for (const id of Object.keys(pages).sort()) {
    const key = `${pages[id].area}/${pages[id].chapter}`;
    if (!byChapter.has(key)) byChapter.set(key, []);
    byChapter.get(key).push(id);
  }
  for (const ids of byChapter.values()) {
    let n = 0;
    for (const id of ids) {
      n += 10;
      const curated = existing[id]?.order;
      if (curated === undefined) pages[id].order = n;
      else pages[id].order = curated;
    }
  }
  return pages;
}

// ---------------------------------------------------------------- generators
function genDocfxJson() {
  const content = [{ files: ['index.md', 'toc.yml'] }];
  // asset folders are not page folders: keep the built site identical to the registry
  const assetExclude = ['**/images/**', '**/media/**', '**/uploads/**', '**/img/**'];
  for (const area of AREAS) content.push({ files: [`${area}/**/*.{md,yml}`], src: '.', dest: '.', exclude: assetExclude });
  content.push({ files: ['_admin/**/*.md'], src: '.', dest: '.', exclude: assetExclude });
  const noindex = {};
  for (const a of NOINDEX_AREAS) noindex[`${a}/**`] = true;
  noindex['todo/**'] = true;
  noindex['_admin/**'] = true;
  return {
    build: {
      content,
      resource: [
        { files: ['**/*.{png,jpg,jpeg,gif,svg,webp,ico}', '**/*.pdf', '**/*.zip'], exclude: ['todo/**'] },
        // runtime data the template layer reads (page-meta bar); tooling reads index.json
        { files: ['help/index.json', 'help/page-meta.json'] },
      ],
      dest: '../dist/docs',
      template: ['default', 'modern', 'templates/t3000'],
      globalMetadata: {
        _appName: 'T3000',
        _appTitle: 'T3000 Documentation',
        _appFooter: 'Temco Controls - T3000 documentation',
        _enableSearch: true,
        _lang: 'en',
      },
      fileMetadata: { _noindex: noindex },
      disableGitFeatures: false,
    },
  };
}

function genNavbar() {
  const lines = [
    '# T3000 documentation - top navigation bar (generated by scripts/docs-registry.mjs)',
    'items:',
    '- { name: Home, href: index.md }',
    '- name: T3000',
    '  href: t3000/',
    '- name: Legacy / Engineering',
    '  href: legacy/',
    '- name: Contributing',
    '  href: design/',
  ];
  return lines.join('\n') + '\n';
}

/** toc.yml for every folder that holds pages: files first (registry order), then child folders. */
function genTocs(pages) {
  const files = new Map();      // folder -> [pageId]
  const childDirs = new Map();  // folder -> Set(childFolder)
  for (const [id, p] of Object.entries(pages)) {
    const folder = path.posix.dirname(id);           // t3000/features
    if (!files.has(folder)) files.set(folder, []);
    files.get(folder).push(id);
    const parents = folder.split('/');
    for (let i = 1; i < parents.length; i++) {
      const parent = parents.slice(0, i).join('/');
      const child = parents.slice(0, i + 1).join('/');
      if (!childDirs.has(parent)) childDirs.set(parent, new Set());
      childDirs.get(parent).add(child);
    }
  }

  const out = new Map(); // docs-relative toc path -> content
  for (const [folder, ids] of files) {
    const lines = [`# generated by scripts/docs-registry.mjs - do not edit`, 'items:'];
    for (const id of ids.sort((a, b) => pages[a].order - pages[b].order || a.localeCompare(b))) {
      lines.push(`- name: ${JSON.stringify(pages[id].title)}`);
      lines.push(`  href: ${path.posix.basename(id)}.md`);
    }
    for (const child of [...(childDirs.get(folder) ?? [])].sort()) {
      lines.push(`- name: ${JSON.stringify(prettify(path.posix.basename(child)))}`);
      lines.push(`  href: ${path.posix.basename(child)}/toc.yml`);
    }
    out.set(`${folder}/toc.yml`, lines.join('\n') + '\n');
  }
  return out;
}

function genIndexJson(pages) {
  const list = Object.keys(pages).sort().map((id) => {
    const p = pages[id];
    const file = path.join(DOCS, `${id}.md`);
    const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    return {
      id,
      url: `/docs/${id}.html`,
      title: p.title,
      area: p.area,
      chapter: p.chapter,
      order: p.order,
      audience: p.audience,
      ship: p.ship,
      owner: p.owner,
      tags: p.tags,
      keywords: p.keywords,
      git: gitInfo(rel(file)),
      reviewed: p.reviewed,
      stale: false,
      headings: headings(text),
      code: p.code,
    };
  });
  return {
    generated: new Date().toISOString().slice(0, 10),
    pages: list,
    counts: { total: list.length, ship: list.filter((p) => p.ship).length },
  };
}

function genPageMeta(index) {
  const meta = {};
  for (const p of index.pages) {
    meta[p.id] = { updated: p.git?.date ?? null, sha: p.git?.sha ?? null, owner: p.owner, stale: p.stale, t: p.title };
  }
  return meta;
}

// ---------------------------------------------------------------- CHM parity
function chmParity(pages) {
  const problems = [];
  const claimed = new Set();
  for (const name of CHM_MANIFESTS) {
    const file = path.join(DOCS, 'help', name);
    if (!fs.existsSync(file)) continue;
    const man = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const ch of man.chapters ?? []) {
      const froms = Array.isArray(ch.from) ? ch.from : [ch.from];
      for (const from of froms) {
        const dir = path.join(DOCS, from);
        if (!fs.existsSync(dir)) { problems.push(`${name}: chapter "${ch.title}" points at missing folder ${from}`); continue; }
        for (const f of walkMd(dir)) {
          const id = rel(f).replace(/^docs\//, '').replace(/\.md$/i, '');
          claimed.add(id);
          if (!pages[id]) problems.push(`${name}: "${id}" is in the CHM but not in the registry`);
        }
      }
    }
  }
  const shippedNotClaimed = Object.entries(pages).filter(([id, p]) => p.ship && !claimed.has(id)).map(([id]) => id);
  return { problems, claimed: claimed.size, shippedNotClaimed };
}

/** The authoring dashboard, rendered as a normal page at /docs/_admin/ (noindex). */
function genDashboard(pages, index, parity) {
  const byChapter = new Map();
  for (const p of index.pages) {
    const key = `${p.area}/${p.chapter}`;
    byChapter.set(key, (byChapter.get(key) ?? 0) + 1);
  }
  const unowned = index.pages.filter((p) => p.owner === 'docs').length;
  const rows = [...byChapter.entries()]
    .sort()
    .map(([k, n]) => `| ${k} | ${n} |`)
    .join('\n');

  return `# Documentation dashboard

> Generated by \`scripts/docs-registry.mjs\` on ${index.generated}. Do not edit by hand.

| Metric | Value |
|---|---|
| pages | ${index.pages.length} |
| shipped in the CHM | ${index.counts.ship} |
| claimed by a CHM manifest | ${parity.claimed} |
| owned by a real owner | ${index.pages.length - unowned} |
| still on the placeholder owner (\`docs\`) | ${unowned} |
| pages with \`code\` ownership globs | ${index.pages.filter((p) => p.code.length).length} |
| CHM parity problems | ${parity.problems.length} |

## Pages per area / chapter

| area / chapter | pages |
|---|---|
${rows}

## What the numbers mean

- **owned by a real owner** - \`owner: \"docs\"\` is the seed value; replace it with the team or role
  that owns the page (\`trendlog\`, \`bacnet\`, \`ui\`, ...). Unowned pages are the ones that go stale first.
- **pages with \`code\` globs** - a page that claims code can be marked stale automatically and can fail
  the \`docs-owed\` gate. Today none do.
- **CHM parity problems** - a page referenced by the shipped help file that the site cannot serve.
`;
}

// ---------------------------------------------------------------- main
function main() {
  const existing = loadRegistry();
  const pages = buildPages(existing.pages ?? {});
  const parity = chmParity(pages);

  if (doSeed) {
    const registry = {
      version: 1,
      $comment: 'Structure of the documentation set. Generated skeleton + curated edits.',
      areas: Object.fromEntries(AREAS.map((a) => [a, { title: a, audience: AUDIENCE[a], noindex: NOINDEX_AREAS.includes(a) }])),
      pages,
      exclude: existing.exclude ?? {},
      waivers: existing.waivers ?? {},
    };
    fs.mkdirSync(path.dirname(REGISTRY_FILE), { recursive: true });
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2) + '\n', 'utf8');
    console.log(`seeded ${Object.keys(pages).length} pages -> ${rel(REGISTRY_FILE)}`);
  }

  // keep registry.json in step with the tree: new pages are added, curated fields preserved
  if (!doCheck && !doSeed) {
    const stored = existing.pages ?? {};
    const needsSync = Object.keys(pages).some((id) => !stored[id]);
    if (needsSync) {
      const registry = {
        version: 1,
        $comment: 'Structure of the documentation set. Generated skeleton + curated edits.',
        areas: Object.fromEntries(AREAS.map((a) => [a, { title: a, audience: AUDIENCE[a], noindex: NOINDEX_AREAS.includes(a) }])),
        pages,
        exclude: existing.exclude ?? {},
        waivers: existing.waivers ?? {},
      };
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2) + '\n', 'utf8');
      console.log(`registry.json synced: ${Object.keys(stored).length} -> ${Object.keys(pages).length} pages`);
    }
  }

  const indexPath = path.join(DOCS, 'help', 'index.json');
  const index = genIndexJson(pages);
  const targets = new Map();
  targets.set('docs/docfx.json', JSON.stringify(genDocfxJson(), null, 2) + '\n');
  targets.set('docs/toc.yml', genNavbar());
  for (const [p, text] of genTocs(pages)) targets.set(`docs/${p}`, text);
  targets.set('docs/help/index.json', JSON.stringify(index, null, 2) + '\n');
  targets.set('docs/help/page-meta.json', JSON.stringify(genPageMeta(index), null, 2) + '\n');
  targets.set('docs/_admin/index.md', genDashboard(pages, index, parity));

  let drift = 0;
  for (const [p, text] of targets) {
    const full = path.join(ROOT, p);
    const same = fs.existsSync(full) && fs.readFileSync(full, 'utf8') === text;
    if (doCheck) {
      if (!same) { console.log(`DRIFT ${p}`); drift++; }
    } else if (!same) {
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, text, 'utf8');
      console.log(`wrote ${p}`);
    }
  }

  console.log(`\npages ${index.pages.length} (ship ${index.counts.ship}) | CHM claims ${parity.claimed}`);
  for (const p of parity.problems) console.log(`  parity: ${p}`);
  if (parity.shippedNotClaimed.length) console.log(`  ship:true but unclaimed by any CHM manifest: ${parity.shippedNotClaimed.length}`);
  if (doCheck) {
    console.log(drift ? `\n${drift} file(s) out of date - run: npm run docs:registry` : '\nregistry outputs are up to date');
    if (drift || parity.problems.length) process.exitCode = 1;
  }
}

main();
