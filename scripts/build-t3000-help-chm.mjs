#!/usr/bin/env node
/**
 * build-t3000-help-chm.mjs
 * ---------------------------------------------------------------------------
 * Folds the T3000Webview Markdown documentation (docs/t3000/**) into the
 * native T3000 Help file: T3000_Help.chm
 *
 * Why this exists
 * ---------------
 * The existing T3000_Help.chm is authored in Dr.Explain and compiled with
 * HTML Help Workshop (hhc.exe). The Dr.Explain project (.dxp) and the
 * intermediate HTML Help project (.hhp) are NOT kept in the source tree, so
 * we cannot simply "add files to the project" and recompile.
 *
 * Instead this script:
 *   1. Decompiles the shipped T3000_Help.chm into a working folder
 *      (hh.exe -decompile) - that recovers all 128 topics, the Contents tree
 *      (project.hhc), the Index (project.hhk) and every asset (css/js/images).
 *   2. Converts every Markdown file under docs/t3000/** into an .htm topic that
 *      reuses the Dr.Explain stylesheets, so the new pages match the manual.
 *   3. Appends the new topics to project.hhc (Contents) and project.hhk (Index).
 *   4. Writes a project.hhp (the missing project file) with [FILES], and
 *      [ALIAS]/[MAP] reconstructed from T3000_Help_Map.h so F1 context help
 *      (::HtmlHelp(..., HH_HELP_CONTEXT, IDH_TOPIC_*)) keeps working.
 *   5. Compiles the result with hhc.exe -> T3000_Help.chm
 *
 * Usage
 * -----
 *   node scripts/build-t3000-help-chm.mjs                 # build, keep original backed up
 *   node scripts/build-t3000-help-chm.mjs --out <file>     # custom output path
 *   node scripts/build-t3000-help-chm.mjs --docs <dir>     # custom Markdown root
 *   node scripts/build-t3000-help-chm.mjs --work <dir>     # custom working folder
 *   node scripts/build-t3000-help-chm.mjs --no-deploy      # write to build dir only
 *   node scripts/build-t3000-help-chm.mjs --keep-original  # never overwrite the source
 *
 * Environment overrides (same names, uppercase): T3000_HELP_CHM, T3000_HELP_MAP_H,
 * HHC_EXE, HH_EXE.
 *
 * Notes
 * -----
 * - New topics are written as UTF-8 with an explicit charset meta; the original
 *   Dr.Explain pages stay windows-1252 and are copied through byte-for-byte
 *   (latin1 round-trip) so nothing is corrupted.
 * - project.hhc / project.hhk are edited as latin1 (binary-safe) for the same
 *   reason.
 * - The Dr.Explain in-page "Menu" tab is populated by its own JS data index and
 *   cannot be extended here; the new pages appear in the CHM's native Contents
 *   and Index panes, which is what hhc compiles from .hhc/.hhk.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULTS = {
  chm: 'C:\\QN\\temcocontrols\\T3000_Building_Automation_System\\HelpDocs\\T3000_Help.chm',
  mapHeader: 'C:\\QN\\temcocontrols\\T3000_Building_Automation_System\\T3000\\T3000_Help_Map.h',
  hhc: 'C:\\Program Files (x86)\\HTML Help Workshop\\hhc.exe',
  hh: 'C:\\Windows\\hh.exe',
  docs: path.join(REPO_ROOT, 'docs', 't3000'),
  work: path.join(process.env.TEMP || REPO_ROOT, 't3000-help-chm'),
  out: null, // default: the source .chm location
};

// ─── CLI ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { deploy: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--out') args.out = next();
    else if (a === '--chm') args.chm = next();
    else if (a === '--docs') args.docs = next();
    else if (a === '--work') args.work = next();
    else if (a === '--map') args.mapHeader = next();
    else if (a === '--hhc') args.hhc = next();
    else if (a === '--section-name') args.sectionName = next();
    else if (a === '--no-deploy') args.deploy = false;
    else if (a === '--keep-original') args.keepOriginal = true;
    else if (a === '--help' || a === '-h') {
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 40).join('\n'));
      process.exit(0);
    }
  }
  return args;
}

const log = (...m) => console.log('  ', ...m);
const ok = (m) => console.log(`✓ ${m}`);
const warn = (m) => console.warn(`! ${m}`);

// ─── Small helpers ───────────────────────────────────────────────────────────
function run(exe, args, opts = {}) {
  return execFileSync(exe, args, { encoding: 'utf8', stdio: 'pipe', ...opts });
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(s) {
  return String(s)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Folder name -> human section title used in the Contents tree.
const SECTION_TITLES = {
  'api-reference': 'API Reference',
  appendix: 'Appendix',
  architecture: 'Architecture',
  'bacnet-api': 'Design Studio (Tstat11) API',
  'building-platform': 'Building Platform',
  components: 'Components',
  'data-points': 'Data Points',
  debugging: 'Debugging',
  'design-hub': 'Design Hub',
  'device-management': 'Device Management',
  features: 'Features',
  guides: 'Guides',
  haystack: 'Haystack & MCP',
  icons: 'Icons',
  'quick-start': 'Quick Start',
  releases: 'Releases',
  'shared-db': 'Shared DB',
  't3-eez-studio': 'Design Studio (Tstat11)',
  'tstat-lcd': 'Tstat LCD',
};
const sectionTitle = (folder) => SECTION_TITLES[folder] || titleCase(folder);

/**
 * Title of the top-level Contents book that holds the Markdown docs.
 * Override with --section-name "...".
 */
const DOC_SECTION_TITLE = 'T3Web';

// ─── Step 1: decompile the shipped CHM ───────────────────────────────────────
function decompile(chm, work) {
  if (!fs.existsSync(chm)) throw new Error(`Source CHM not found: ${chm}`);
  if (fs.existsSync(work)) fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });

  run(DEFAULTS.hh, ['-decompile', work, chm]);

  const hhc = path.join(work, 'project.hhc');
  if (!fs.existsSync(hhc)) {
    throw new Error(
      `Decompile produced no project.hhc in ${work}. ` +
        `Check that hh.exe is available at ${DEFAULTS.hh}.`
    );
  }
  const topics = fs.readdirSync(work).filter((f) => f.toLowerCase().endsWith('.htm'));
  ok(`Decompiled CHM: ${topics.length} topics, TOC + Index recovered`);
  return topics;
}

// ─── Step 2: Markdown -> topic html ──────────────────────────────────────────
/** Recursively list .md files under root (sorted, stable). */
function collectMarkdown(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.name.toLowerCase().endsWith('.md')) out.push(abs);
    }
  };
  walk(root);
  return out;
}

/** First `# heading`, any level, used as the page title. */
function firstHeading(md) {
  const line = md.split(/\r?\n/).find((l) => l.trimStart().startsWith('#'));
  return line ? line.replace(/^#+\s*/, '').trim() : '';
}

/** Collect heading texts (for the Index) by level. */
function headings(md) {
  const res = [];
  for (const line of md.split(/\r?\n/)) {
    const m = /^(#{2,3})\s+(.*)$/.exec(line.trimStart());
    if (m) res.push(m[2].replace(/`/g, '').trim());
  }
  return res;
}

const EXTRA_CSS = `/* Extra rules so plain Markdown HTML sits well inside the Dr.Explain stylesheets */
.description_on_page h1, .description_on_page h2, .description_on_page h3,
.description_on_page h4, .description_on_page h5, .description_on_page h6 { margin-top: 1.1em; }
.description_on_page p { margin: 0.6em 0; }
.description_on_page img { max-width: 100%; height: auto; }
.description_on_page pre { background: #f6f8fa; border: 1px solid #d8dee4; border-radius: 4px;
  padding: 10px 12px; overflow-x: auto; }
.description_on_page code { font-family: Consolas, "Courier New", monospace; font-size: 92%; }
.description_on_page pre code { background: none; border: 0; padding: 0; }
.description_on_page table { border-collapse: collapse; margin: 0.8em 0; }
.description_on_page th, .description_on_page td { border: 1px solid #d0d7de; padding: 5px 9px; }
.description_on_page th { background: #f3f2f1; }
.description_on_page blockquote { margin: 0.8em 0; padding: 0.2em 1em; border-left: 3px solid #d0d7de;
  color: #5b5b5b; }
.description_on_page hr { border: 0; border-top: 1px solid #e1e1e1; margin: 1.4em 0; }
`;

/** Page shell reusing the manual's own stylesheets. */
function pageShell({ title, breadcrumb, fileName, content, prev, next }) {
  const navBtns = [];
  if (prev) {
    navBtns.push(
      `<li class="b-controlButtons__item m-controlButtons__item__prev">` +
        `<a href="${prev.file}" class="b-controlButtons__link" title="Previous page">` +
        `<span class="b-controlButtons__link_text">&#xa0;Previous page</span></a></li>`
    );
  }
  if (next) {
    navBtns.push(
      `<li class="b-controlButtons__item m-controlButtons__item__next">` +
        `<a href="${next.file}" class="b-controlButtons__link" title="Next page">` +
        `<span class="b-controlButtons__link_text">Next page&#xa0;</span></a></li>`
    );
  }
  const nav = navBtns.length
    ? `<div class="b-controlButtons"><ul class="b-controlButtons__items">${navBtns.join('')}</ul></div>`
    : '';

  // `top` added by addHeadingAnchors equivalent is not needed; Dr.Explain uses #top.
  return `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html;charset=utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script type="text/javascript">
//<![CDATA[
    drex_file_name = "${fileName}";
//]]>
</script>
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" type="text/css" href="css/all.stylesheet" media="all" />
<link rel="stylesheet" href="de_style.stylesheet" type="text/css" media="all" />
<link rel="stylesheet" href="custom.stylesheet" type="text/css" media="all" />
<link rel="stylesheet" href="css/docs-extra.stylesheet" type="text/css" media="all" />
</head>
<body class="b-body">
<div class="b-pageLayout" id="pageLayout">
  <div class="b-pageContent m-pageContent__withoutLeft m-pageContent__withoutRight" id="pageContent">
    <div class="b-workZone m-workZone__withoutSideNav" id="workZone">
      <table class="b-workZone__layout"><tr>
        <td class="b-workZone__side m-workZone__side__article" id="workZone_article">
          <div class="b-workZone__content" id="workZone_article__content">
            <div class="b-article" id="article">
              <div class="b-article__preWrapper">
                <table class="b-article__headerLayout" id="article__header"><tr>
                  <td id="headerSide__nav" class="b-article__headerSide m-article__headerSide__nav">
                    <div id="headerSide__nav__breadCrumbs" class="b-breadCrumbs">
                      <ul class="b-breadCrumbs__items"><li class="b-breadCrumbs__item">${escapeHtml(breadcrumb)}</li></ul>
                    </div>
                  </td>
                  <td class="b-article__headerSide m-article__headerSide__buttons">${nav}</td>
                </tr></table>
                <div class="b-article__wrapper">
                  <div class="b-article__innerWrapper" id="description_on_page_placeholder">
                    <a id="top" class="anchor"></a>
                    <div class="description_on_page">${content}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr></table>
    </div>
  </div>
</div>
</body>
</html>
`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Copy referenced images into the work tree and rewrite their src. */
function localiseImages(html, mdFile, work, slugDir) {
  return html.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/gi, (full, pre, src, post) => {
    if (/^(https?:|data:|\/)/i.test(src)) return full;
    const clean = src.split('#')[0];
    const abs = path.resolve(path.dirname(mdFile), decodeURIComponent(clean));
    if (!fs.existsSync(abs)) {
      warn(`missing image "${src}" referenced by ${path.basename(mdFile)}`);
      return full;
    }
    const destDir = path.join(work, 'images', 'docs', slugDir);
    fs.mkdirSync(destDir, { recursive: true });
    const destName = path.basename(abs);
    fs.copyFileSync(abs, path.join(destDir, destName));
    return `${pre}images/docs/${slugDir}/${destName}${post}`;
  });
}

/** Rewrite links to sibling docs so they resolve inside the CHM. */
function localiseLinks(html, mdFile, docsRoot, slugByRel) {
  return html.replace(/(<a\b[^>]*\bhref=")([^"]+)(")/gi, (full, pre, href, post) => {
    if (/^(https?:|mailto:|#|data:|\/)/i.test(href)) return full;
    const [target, frag = ''] = href.split('#');
    if (!/\.md$/i.test(target)) return full;
    const abs = path.resolve(path.dirname(mdFile), decodeURIComponent(target));
    const rel = path.relative(docsRoot, abs).replace(/\\/g, '/');
    const slug = slugByRel.get(rel);
    if (!slug) return full;
    return `${pre}${slug}.htm${frag ? '#' + frag : ''}${post}`;
  });
}

// ─── Step 3: Contents tree (.hhc) ────────────────────────────────────────────
function tocInsert(docs, sectionName = DOC_SECTION_TITLE) {
  // group -> [ {title, file} ]
  const groups = new Map();
  for (const d of docs) {
    const g = d.rel.split('/')[0];
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(d);
  }

  const li = (name, local, children = '') => `
<LI><OBJECT type="text/sitemap">
<param name="Name" value="${escapeHtml(name)}"/>
${local ? `<param name="Local" value="${local}"/>\n` : ''}</OBJECT>
<UL>
${children}
</UL>
</LI>`;

  let body = '';
  for (const [folder, items] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const leaves = items
      .sort((a, b) => a.rel.localeCompare(b.rel))
      .map((d) => li(d.title, `${d.slug}.htm`))
      .join('');
    body += li(sectionTitle(folder), '', leaves);
  }
  return li(sectionName, null, body);
}

// ─── Step 4: Index (.hhk) ────────────────────────────────────────────────────
function indexInsert(docs) {
  const seen = new Set();
  let out = '';
  for (const d of docs) {
    for (const kw of [d.title, ...d.headings]) {
      const key = kw.toLowerCase();
      if (!kw || seen.has(key)) continue;
      seen.add(key);
      out += `
<LI><OBJECT type="text/sitemap">
<param name="Name" value="${escapeHtml(kw)}" />
<param name="Local" value="${d.slug}.htm" />
</OBJECT>
<UL>
</UL>
</LI>`;
    }
  }
  return out;
}

// ─── Step 5: project.hhp ─────────────────────────────────────────────────────
function listFilesForHhp(work) {
  const exts = new Set(['.htm', '.html', '.css', '.stylesheet', '.javascript', '.png', '.gif', '.jpg', '.jpeg', '.svg', '.ico', '.bmp']);
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else if (exts.has(path.extname(e.name).toLowerCase())) {
        out.push(path.relative(work, abs).replace(/\\/g, '/'));
      }
    }
  };
  walk(work);
  return out.sort();
}

/**
 * Reconstruct [ALIAS]/[MAP] from T3000_Help_Map.h against the *pristine*
 * Contents tree (before our docs were appended) plus the topic file names.
 *
 * The original .hhp (which held the real map) is not in the source tree, so
 * this is a best-effort reconstruction:
 *  - topic-level IDs (IDH_TOPIC_*) resolve well because Dr.Explain titles and
 *    the topic file names mirror the symbols;
 *  - element-level IDs (IDH_CONTROL_*) point at anchors *inside* pages and
 *    cannot be recovered - they are reported in unmatched-context-ids.txt.
 */
function contextMap(mapHeaderPath, pristineHhc) {
  if (!mapHeaderPath || !fs.existsSync(mapHeaderPath)) {
    warn(`map header not found (${mapHeaderPath}) - F1 context help will be omitted`);
    return { alias: [], map: [], unmatched: [] };
  }
  const header = fs.readFileSync(mapHeaderPath, 'utf8');
  const symbols = [];
  for (const m of header.matchAll(/const\s+int\s+(IDH_\w+)\s*=\s*(\d+)\s*;/g)) {
    symbols.push({ symbol: m[1], id: Number(m[2]) });
  }

  // Candidates: (a) Contents entries (Name -> Local), (b) topic file names.
  const tocPairs = [];
  const re = /<param name="Name" value="([^"]*)"\s*\/?>[\s\S]*?<param name="Local" value="([^"]*)"\s*\/?>/gi;
  for (const m of pristineHhc.matchAll(re)) tocPairs.push({ name: m[1], local: m[2] });
  const pairs = [
    ...tocPairs,
    ...tocPairs.map((p) => ({
      name: path.basename(p.local).replace(/\.html?$/i, ''),
      local: p.local,
      fromFile: true,
    })),
  ];

  const STOP = new Set(['idh', 'topic', 'control', 'the', 'a', 'of', 'and', 'to']);
  const tokenize = (s) =>
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .map((t) => t.replace(/s$/, ''))
      .filter((t) => t && !STOP.has(t));

  // Precompute candidate token sets once (the naive version retokenized every
  // candidate for every symbol, which was needlessly expensive).
  const candidates = pairs
    .map((p) => ({ local: p.local, toks: tokenize(p.name), fromFile: !!p.fromFile }))
    .filter((c) => c.toks.length);

  const alias = [];
  const map = [];
  const unmatched = [];
  for (const { symbol, id } of symbols) {
    // Hand-mapped IDs whose Dr.Explain title/file name does not resemble the
    // symbol. Verified against the recovered Contents tree of the original CHM.
    const OVERRIDES = {
      IDH_TOPIC_DESIGN_LAYERS: 'layers.htm',
      IDH_TOPIC_3D_BOX_SHOT_AND_COVER_RENDERING: '3d-box-shot-rendering.htm',
      IDH_TOPIC_DESIGN_TEMPLATES: '3d-box-hsot-templates.htm',
      IDH_TOPIC_T3_8AO: 'module_5_5_1.htm',
    };
    if (OVERRIDES[symbol]) {
      alias.push(`${symbol}=${OVERRIDES[symbol]}`);
      map.push(`#define ${symbol} ${id}`);
      continue;
    }

    let base = symbol.replace(/^IDH_(TOPIC|CONTROL|DIALOG|DLG|MENU|SCREEN|WINDOW)_/, '');
    // Trailing _1/_2/_3 marks the 1st/2nd/3rd topic with an identical title.
    let occurrence = 0;
    const occ = /^(.*?)_(\d)$/.exec(base);
    if (occ) {
      base = occ[1];
      occurrence = Number(occ[2]);
    }
    const want = tokenize(base);
    if (!want.length) {
      unmatched.push(`${symbol} (${id})`);
      continue;
    }

    // Exact token-set matches first (then subset matches, best = fewest extras).
    const exact = [];
    let bestSubset = null;
    let bestExtra = Infinity;
    for (const c of candidates) {
      const have = c.toks;
      let present = 0;
      for (const t of want) if (have.includes(t)) present++;
      if (present !== want.length) continue;
      if (have.length === want.length) {
        exact.push(c);
      } else {
        const extra = have.length - want.length;
        if (extra < bestExtra || (extra === bestExtra && bestSubset && bestSubset.fromFile && !c.fromFile)) {
          bestExtra = extra;
          bestSubset = c;
        }
      }
    }
    const pick = exact.length ? exact[occurrence ? occurrence - 1 : 0] || exact[0] : bestSubset;

    if (pick) {
      alias.push(`${symbol}=${pick.local}`);
      map.push(`#define ${symbol} ${id}`);
    } else {
      unmatched.push(`${symbol} (${id})`);
    }
  }
  return { alias, map, unmatched };
}

function writeHhp(work, files, ctx) {
  const hhp = `${[
    '[OPTIONS]',
    'Compatibility=1.1 or later',
    'Compiled file=T3000_Help.chm',
    'Contents file=project.hhc',
    'Index file=project.hhk',
    'Default topic=index.htm',
    'Title=T3000 Help',
    'Language=0x409 English (United States)',
    'Display compile progress=No',
    'Full-text search=Yes',
    'Binary TOC=Yes',
    'Binary Index=Yes',
    '',
    '[FILES]',
    ...files,
    '',
    '[ALIAS]',
    ...ctx.alias,
    '',
    '[MAP]',
    ...ctx.map,
    '',
  ].join('\n')}\n`;
  fs.writeFileSync(path.join(work, 'project.hhp'), hhp, 'utf8');
  return hhp;
}

// ─── main ────────────────────────────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv.slice(2));
  const requestedChm = args.chm || process.env.T3000_HELP_CHM || DEFAULTS.chm;
  // Idempotency: a previous run may have replaced the help file. Always build
  // from the untouched baseline (the one-time `<name>.original.chm` backup).
  const backupChm = requestedChm.replace(/\.chm$/i, '.original.chm');
  const chm = !args.chm && fs.existsSync(backupChm) ? backupChm : requestedChm;
  const mapHeader = args.mapHeader || process.env.T3000_HELP_MAP_H || DEFAULTS.mapHeader;
  const hhcExe = args.hhc || process.env.HHC_EXE || DEFAULTS.hhc;
  const docsRoot = path.resolve(args.docs || process.env.T3000_HELP_DOCS || DEFAULTS.docs);
  const work = path.resolve(args.work || DEFAULTS.work);
  const out = path.resolve(args.out || path.join(path.dirname(requestedChm), 'T3000_Help.chm'));
  const sectionName = args.sectionName || DOC_SECTION_TITLE;

  console.log(`\nT3000 Help CHM build\n  source  : ${chm}\n  docs    : ${docsRoot}\n  work    : ${work}\n  output  : ${out}\n`);
  if (!fs.existsSync(hhcExe)) throw new Error(`hhc.exe not found: ${hhcExe}\nInstall "HTML Help Workshop" or pass --hhc <path>.`);
  if (!fs.existsSync(docsRoot)) throw new Error(`Markdown root not found: ${docsRoot}`);

  console.log('1) Decompiling the existing help file');
  decompile(chm, work);

  console.log('2) Converting Markdown topics');
  const mdFiles = collectMarkdown(docsRoot);
  if (!mdFiles.length) throw new Error(`No .md files under ${docsRoot}`);

  const docs = mdFiles.map((abs) => {
    const rel = path.relative(docsRoot, abs).replace(/\\/g, '/');
    const slug = 'docs-' + slugify(rel.replace(/\.md$/i, ''));
    const md = fs.readFileSync(abs, 'utf8');
    const title = firstHeading(md) || titleCase(path.basename(rel, '.md'));
    return { abs, rel, slug, title, md, headings: headings(md) };
  });
  const slugByRel = new Map(docs.map((d) => [d.rel, d.slug]));

  fs.mkdirSync(path.join(work, 'css'), { recursive: true });
  fs.writeFileSync(path.join(work, 'css', 'docs-extra.stylesheet'), EXTRA_CSS, 'utf8');

  marked.setOptions({ gfm: true, breaks: false });
  docs.forEach((d, i) => {
    let html = marked.parse(d.md);
    const slugDir = d.slug.replace(/^docs-/, '');
    html = localiseImages(html, d.abs, work, slugDir);
    html = localiseLinks(html, d.abs, docsRoot, slugByRel);

    const prev = i > 0 ? { title: docs[i - 1].title, file: `${docs[i - 1].slug}.htm` } : null;
    const next = i < docs.length - 1 ? { title: docs[i + 1].title, file: `${docs[i + 1].slug}.htm` } : null;
    const folder = d.rel.split('/')[0];
    const breadcrumb = `T3000 Docs › ${sectionTitle(folder)}`;

    fs.writeFileSync(
      path.join(work, `${d.slug}.htm`),
      pageShell({ title: d.title, breadcrumb, fileName: `${d.slug}.htm`, content: html, prev, next }),
      'utf8'
    );
  });
  ok(`${docs.length} Markdown pages converted`);

  console.log('3) Extending the Contents tree and Index');
  const hhcPath = path.join(work, 'project.hhc');
  const pristineHhc = fs.readFileSync(hhcPath, 'latin1'); // before our section is added
  let hhc = pristineHhc;
  const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`value="${escapedName}"`).test(hhc)) {
    // Insert as the FIRST top-level book so it is visible without scrolling.
    hhc = hhc.replace(/(<BODY>\s*<UL>)/i, `$1\n${tocInsert(docs, sectionName)}\n`);
    fs.writeFileSync(hhcPath, hhc, 'latin1');
    ok(`Contents tree extended (top-level book "${sectionName}")`);
  } else {
    warn(`Contents tree already contains a "${sectionName}" book - not re-adding`);
  }

  const hhkPath = path.join(work, 'project.hhk');
  let hhk = fs.readFileSync(hhkPath, 'latin1');
  hhk = hhk.replace(/<\/UL>\s*<\/BODY>/i, `${indexInsert(docs)}\n</UL>\n</BODY>`);
  fs.writeFileSync(hhkPath, hhk, 'latin1');
  ok('Index extended');

  console.log('4) Writing project.hhp (FILES + ALIAS + MAP)');
  const ctx = contextMap(mapHeader, pristineHhc);
  const files = listFilesForHhp(work);
  writeHhp(work, files, ctx);
  ok(`project.hhp written: ${files.length} files, ${ctx.alias.length} context IDs mapped`);
  if (ctx.unmatched.length) {
    const groups = {};
    for (const u of ctx.unmatched) {
      const m = /^(IDH_[A-Z]+)_/.exec(u);
      const k = m ? m[1] : 'other';
      groups[k] = (groups[k] || 0) + 1;
    }
    const summary = Object.entries(groups)
      .map(([k, n]) => `${k}=${n}`)
      .join(', ');
    const report = path.join(work, 'unmatched-context-ids.txt');
    fs.writeFileSync(
      report,
      `Context IDs that could not be auto-mapped (${ctx.unmatched.length}):\n` +
        `Broke down as: ${summary}\n\n` +
        `These are almost always element-level IDs (IDH_CONTROL_*) that point at an\n` +
        `anchor INSIDE a page. The original .hhp / Dr.Explain project is required to\n` +
        `recover them; topic-level IDs (IDH_TOPIC_*) are mapped.\n\n` +
        ctx.unmatched.join('\n') +
        '\n',
      'utf8'
    );
    warn(`${ctx.unmatched.length} context IDs not auto-mapped (${summary}) -> ${report}`);
  }

  console.log('5) Compiling with hhc.exe');
  // hhc.exe returns a non-zero exit code even on a clean compile, so success is
  // judged by the output file, not by the exit code.
  let hhcOut = '';
  try {
    hhcOut = run(hhcExe, ['project.hhp'], { cwd: work });
  } catch (e) {
    hhcOut = (e.stdout || '') + (e.stderr || '');
  }
  const compiled = path.join(work, 'T3000_Help.chm');
  if (!fs.existsSync(compiled)) {
    console.log(hhcOut);
    throw new Error('Compilation failed - no T3000_Help.chm produced.');
  }
  const errs = hhcOut.split(/\r?\n/).filter((l) => /^HHC\d+/i.test(l.trim()));
  if (errs.length) {
    warn(`hhc.exe reported ${errs.length} problem(s):`);
    errs.slice(0, 20).forEach((l) => console.log('     ' + l.trim()));
  }
  ok(`Compiled: ${(fs.statSync(compiled).size / 1048576).toFixed(1)} MB`);

  if (args.deploy && !args.keepOriginal) {
    if (fs.existsSync(out)) {
      const backup = out.replace(/\.chm$/i, '.original.chm');
      if (!fs.existsSync(backup)) {
        fs.copyFileSync(out, backup);
        ok(`Backed up the original to ${backup}`);
      }
    }
    fs.copyFileSync(compiled, out);
    ok(`Deployed to ${out}`);
  } else {
    const alt = path.join(REPO_ROOT, 'build', 'help-chm', 'T3000_Help.chm');
    fs.mkdirSync(path.dirname(alt), { recursive: true });
    fs.copyFileSync(compiled, alt);
    ok(`Not deployed - result copied to ${alt}`);
  }
  console.log('\nDone.\n');
}

main();
