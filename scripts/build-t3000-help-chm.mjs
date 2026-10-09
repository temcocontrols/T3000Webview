#!/usr/bin/env node
/**
 * build-t3000-help-chm.mjs
 * ---------------------------------------------------------------------------
 * Builds the native T3000 help files from the T3000Webview Markdown docs.
 *
 * What is built, and how it is decided
 * ------------------------------------
 * The help files are *declared* in docs/help/*.json. A manifest lists chapters
 * and points at existing Markdown (paths relative to docs/), so no page is ever
 * moved, renamed or copied - the web Documentation page and the MCP doc tools
 * keep working on docs/t3000/** and docs/legacy/** exactly as before.
 *
 *   docs/help/manual.json       -> T3000_Help.chm   ("manual": true)
 *   docs/help/reference.json    -> T3Web_Ref.chm
 *   docs/help/engineering.json  -> T3Web_Dev.chm
 *
 * The manual is the master: its .hhp gets a [MERGE FILES] section listing the
 * other help files, and its Contents gets a node per merged file, so the Help
 * viewer shows one book ("T3Web") plus one node per merged help file, with a
 * unified Contents, Index and full-text search.
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
 *   2. Converts every Markdown topic listed by the manifests into an .htm topic
 *      that reuses the Dr.Explain stylesheets, so the new pages match the manual.
 *   3. Appends the new topics to project.hhc (Contents) and project.hhk (Index).
 *   4. Writes a project.hhp (the missing project file) with [FILES], and
 *      [ALIAS]/[MAP] reconstructed from T3000_Help_Map.h so F1 context help
 *      (::HtmlHelp(..., HH_HELP_CONTEXT, IDH_TOPIC_*)) keeps working.
 *   5. Compiles the result with hhc.exe -> T3000_Help.chm
 *
 * Usage
 * -----
 *   node scripts/build-t3000-help-chm.mjs                    # build every help file
 *   node scripts/build-t3000-help-chm.mjs --collection manual # one collection only
 *   node scripts/build-t3000-help-chm.mjs --print-tree        # show the tree, build nothing
 *   node scripts/build-t3000-help-chm.mjs --out <file>        # custom output path
 *   node scripts/build-t3000-help-chm.mjs --docs <dir>        # docs base folder
 *   node scripts/build-t3000-help-chm.mjs --work <dir>        # custom working folder
 *   node scripts/build-t3000-help-chm.mjs --no-deploy         # write to build dir only
 *   node scripts/build-t3000-help-chm.mjs --keep-original     # never overwrite the source
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
  docs: path.join(REPO_ROOT, 'docs'), // base folder the manifests are relative to
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
    else if (a === '--collection') args.collection = next();
    else if (a === '--work') args.work = next();
    else if (a === '--map') args.mapHeader = next();
    else if (a === '--hhc') args.hhc = next();
    else if (a === '--section-name') args.sectionName = next();
    else if (a === '--print-tree') args.printTree = true;
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

/** Case-insensitive, separator-normalised key for absolute-path lookups. */
const normPath = (p) => path.resolve(p).replace(/\\/g, '/').toLowerCase();

// ─── Documentation sources & Contents-tree design ────────────────────────────
/**
 * Markdown roots folded into the help file. Each becomes a sub-book of the
 * single "T3Web" book, which is placed LAST in the Contents tree.
 */
const DOC_ROOTS = [
  { key: 't3000', dir: path.join(REPO_ROOT, 'docs', 't3000') },
  { key: 'legacy', dir: path.join(REPO_ROOT, 'docs', 'legacy') },
];

/** Display name of each docs root (depth 1 of the T3Web tree). */
const GROUP_TITLES = {
  t3000: 'T3000 Documentation',
  legacy: 'Engineering & Legacy Docs',
};

/** Folder name -> display name, at any depth of the tree. */
const TITLES = {
  // ── docs/t3000
  'api-reference': 'API Reference',
  appendix: 'Appendix',
  architecture: 'Architecture',
  'bacnet-api': 'Design Studio (Tstat11) API',
  'building-platform': 'Building Platform',
  components: 'Components',
  'control-messages': 'Control Messages',
  'data-points': 'Data Points',
  debugging: 'Debugging',
  'design-hub': 'Design Hub',
  designer: 'Designer',
  'device-management': 'Device Management',
  features: 'Features',
  guides: 'Guides',
  haystack: 'Haystack & MCP',
  'lvgl-svg': 'LVGL SVG',
  manual: 'Manual',
  pages: 'Pages',
  phases: 'Phases',
  'quick-start': 'Quick Start',
  releases: 'Releases',
  'shared-db': 'Shared DB',
  'sql-server-express': 'SQL Server Express',
  't3-eez-studio': 'Design Studio (Tstat11)',
  'tstat-lcd': 'Tstat LCD',
  // ── docs/legacy
  analysis: 'Analysis',
  api: 'API',
  bacnet: 'BACnet',
  bugs: 'Bug Investigations',
  'data-flow': 'Data Flow',
  'data-mnt': 'Data Maintenance',
  'data-splitting': 'Data Splitting',
  database: 'Database',
  develop: 'Developer Setup',
  development: 'Development',
  hvac: 'HVAC',
  implementations: 'Implementations',
  input: 'Input',
  layout: 'Layout',
  'left-panel': 'Left Panel',
  'legacy-code': 'Legacy Code',
  'new-ui': 'New UI',
  project: 'Project',
  revnotes: 'Release Notes',
  't3-bas-web': 'T3 BAS Web',
  't3-newui': 'T3 New UI',
  't3-vue': 'T3 Vue',
  t3000: 'T3000',
  'trend-log': 'Trend Log',
  v0: 'v0 (early design)',
};

/**
 * Preferred child order per tree path. Names not listed sort alphabetically
 * after the listed ones. '' orders the two top-level groups.
 */
const ORDER = {
  // The top-level chapter order is encoded in the manifest chapter ids
  // ("manual-01-..."), so there is no '' entry any more.
  t3000: [
    'quick-start', 'shared-db', 'architecture', 'design-hub', 'components',
    'device-management', 'data-points', 'features', 'guides', 'building-platform',
    'api-reference', 'haystack', 'tstat-lcd', 't3-eez-studio', 'bacnet-api', 'releases',
  ],
  legacy: ['development', 'implementations', 'legacy-code', 'releases'],
  'legacy/development': [
    'project', 'analysis', 'api', 'bacnet', 'database', 'data-mnt', 'data-flow',
    'develop', 'new-ui', 'bugs',
  ],
  'legacy/implementations': ['t3-bas-web', 't3-vue', 't3000', 'hvac', 'trend-log'],
};

/**
 * Title of the top-level Contents book that holds the Markdown docs.
 * Override with --section-name "...".
 */
const DOC_SECTION_TITLE = 'T3Web';

/** Slug (file name) of the T3Web landing page. */
const LANDING_SLUG = 'docs-index';

// ─── Collections: docs/help/*.json ───────────────────────────────────────────
/**
 * The help files are *defined* in docs/help/*.json. A manifest lists chapters and
 * points at existing Markdown (relative to docs/), so no page is ever moved or
 * copied - the web Documentation page and the MCP tools keep their paths.
 */
const HELP_DIR = path.join(REPO_ROOT, 'docs', 'help');
/** Base folder the manifest paths are relative to (override with --docs). */
let DOCS_BASE = path.join(REPO_ROOT, 'docs');
/** "01-getting-started" -> "Getting Started" (filled while resolving a manifest). */
const CHAPTER_TITLES = new Map();

function loadCollections() {
  if (!fs.existsSync(HELP_DIR)) return [];
  const cols = fs
    .readdirSync(HELP_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ ...JSON.parse(fs.readFileSync(path.join(HELP_DIR, f), 'utf8')), manifest: f }));
  // The collection folded into T3000_Help.chm is built last (it needs to know the
  // names of the files it merges).
  return cols.sort((a, b) => Number(!!a.manual) - Number(!!b.manual));
}

/** Resolves one collection manifest into buildable topics. */
function docsForCollection(col) {
  const docs = [];
  const colKey = (col.manifest || 'docs').replace(/\.json$/, '');
  (col.chapters || []).forEach((ch, i) => {
    const prefix = `${colKey}-${String(i + 1).padStart(2, '0')}-${slugify(ch.title || `chapter-${i + 1}`)}`;
    const chapterFrom = [].concat(ch.from || [])[0] || null;
    const fromList = [].concat(ch.from || []);
    // A chapter that maps exactly one docs folder *is* that folder, so its pages
    // attach to the chapter node directly instead of repeating the folder name
    // ("Data Points > Data Points > Inputs"). With several source folders the
    // folder name stays, because it is what separates them ("Displays > Design
    // Studio", "Displays > Tstat LCD").
    const flatten = !ch.pages && fromList.length === 1;
    CHAPTER_TITLES.set(prefix, ch.title || `Chapter ${i + 1}`);

    const add = (abs) => {
      const relDocs = path.relative(DOCS_BASE, abs).replace(/\\/g, '/');
      const sub = path.dirname(relDocs);
      const segs = (sub === '.' ? '' : sub)
        .split('/')
        .slice(1) // drop the collection folder itself (t3000 / legacy)
        .filter((s) => s && !/^(images?|assets|img)$/i.test(s));
      if (flatten) segs.shift(); // drop the source folder the chapter maps
      const base = path.basename(relDocs, '.md');
      const isOverview = /^(readme|index)$/i.test(base);
      const md = fs.readFileSync(abs, 'utf8');
      docs.push({
        abs: path.resolve(abs),
        branch: segs.length ? `${prefix}/${segs.join('/')}` : prefix,
        chapterFrom,
        rel: relDocs,
        slug: 'docs-' + slugify(relDocs.replace(/\.md$/i, '')),
        title: isOverview ? 'Overview' : firstHeading(md) || titleCase(base),
        md,
        headings: headings(md),
        isOverview,
      });
    };

    for (const p of ch.pages || []) {
      const abs = path.join(DOCS_BASE, p);
      if (fs.existsSync(abs)) add(abs);
      else warn(`${col.manifest}: page not found - ${p}`);
    }
    for (const from of fromList) {
      const dir = path.join(DOCS_BASE, from);
      if (!fs.existsSync(dir)) {
        warn(`${col.manifest}: folder not found - ${from}`);
        continue;
      }
      for (const abs of collectMarkdown(dir)) add(abs);
    }
  });

  // Two files can slugify to the same topic name. CHM names are case-insensitive,
  // so disambiguate instead of silently overwriting a page.
  const used = new Set();
  for (const d of docs) {
    const base = d.slug;
    let n = 1;
    while (used.has(d.slug)) d.slug = `${base}-${++n}`;
    if (d.slug !== base) warn(`duplicate topic name "${base}" - ${d.rel} published as ${d.slug}.htm`);
    used.add(d.slug);
  }
  return docs;
}

/** Label for a folder node: a chapter uses its manifest title. */
const folderLabel = (key, pathPrefix) => {
  if (!pathPrefix && CHAPTER_TITLES.has(key)) return CHAPTER_TITLES.get(key);
  const name = key.replace(/^\d+[-_]/, '');
  return TITLES[name] || titleCase(name);
};

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

/**
 * Extra rules so plain Markdown HTML sits well inside the Dr.Explain stylesheets.
 *
 * IMPORTANT: the Dr.Explain theme contains `.b-article { background-color:#3f3f3f;
 * color:#ffffff; }` and re-colours its own text through private classes (.p, .deh1,
 * ...). Markdown produces plain <p>/<pre>/<table>, which inherit that WHITE text and
 * become invisible on the light page. Every element we emit therefore needs an
 * explicit colour.
 */
const EXTRA_CSS = `/* Markdown pages folded into the Dr.Explain manual */

/* The Dr.Explain theme paints the article dark:
     .b-article { background-color:#3f3f3f; color:#ffffff; }
   and re-colours its own text with private classes (.p, .deh1, span.code, ...).
   Plain Markdown HTML inherits the white colour, so code blocks and tables came
   out white-on-light and unreadable. Our pages therefore ship a self-contained
   LIGHT theme: neutralise the article colours, then colour every element we emit
   explicitly. (Loaded after all.stylesheet, so !important wins.) */
html, body { background: #ffffff; }

.b-article,
.b-article__wrapper,
.b-article__innerWrapper { background-color: #ffffff !important; color: #24292f !important; }

.description_on_page,
.description_on_page p,
.description_on_page li,
.description_on_page dd,
.description_on_page dt,
.description_on_page blockquote,
.description_on_page strong,
.description_on_page em,
.description_on_page b,
.description_on_page i,
.description_on_page span,
.description_on_page div { color: #24292f !important; }

.description_on_page h1,
.description_on_page h2,
.description_on_page h3,
.description_on_page h4,
.description_on_page h5,
.description_on_page h6 { margin-top: 1.1em; }

.description_on_page a { color: #0b5cad !important; }

.description_on_page pre,
.description_on_page code,
.description_on_page code *,
.description_on_page kbd,
.description_on_page samp { color: #24292f !important; }

.description_on_page pre { background: #f6f8fa !important; border: 1px solid #d8dee4;
  border-radius: 4px; padding: 10px 12px; overflow-x: auto; }
.description_on_page code { font-family: Consolas, "Courier New", monospace; font-size: 92%; }
.description_on_page pre code { background: none !important; border: 0; padding: 0; }

.description_on_page table { border-collapse: collapse; margin: 0.8em 0; }
.description_on_page th, .description_on_page td { border: 1px solid #d0d7de; padding: 5px 9px;
  color: #24292f !important; }
.description_on_page th { background: #f3f2f1 !important; }

.description_on_page blockquote { margin: 0.8em 0; padding: 0.2em 1em; border-left: 3px solid #d0d7de; }
.description_on_page hr { border: 0; border-top: 1px solid #e1e1e1; margin: 1.4em 0; }
.description_on_page img { max-width: 100%; height: auto; }

/* T3Web landing page */
.description_on_page .t3web-count { font-weight: normal !important; font-size: 85%;
  color: #6a737d !important; }
.description_on_page .t3web-lead { color: #57606a !important; }
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

/**
 * project.hhc / project.hhk are ANSI files, so every name written into them must
 * be ASCII - legacy doc headings contain emoji and arrows (🚨, →, ✅, —) that
 * would otherwise be corrupted. Common symbols are transliterated first.
 */
function tocText(s) {
  return String(s)
    .replace(/[\u2192\u279C\u27A1]/g, '->')
    .replace(/[\u2190]/g, '<-')
    .replace(/[\u2194\u21C4\u21D4]/g, '<->')
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2022\u00B7]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2713\u2714\u2705]/g, '[ok]')
    .replace(/[\u26A0\uFE0F]/g, '[!]')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
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
function localiseLinks(html, mdFile, slugByAbs) {
  return html.replace(/(<a\b[^>]*\bhref=")([^"]+)(")/gi, (full, pre, href, post) => {
    if (/^(https?:|mailto:|#|data:|\/)/i.test(href)) return full;
    const [target, frag = ''] = href.split('#');
    if (!/\.md$/i.test(target)) return full;
    const abs = path.resolve(path.dirname(mdFile), decodeURIComponent(target));
    const slug = slugByAbs.get(normPath(abs));
    if (!slug) return full;
    return `${pre}${slug}.htm${frag ? '#' + frag : ''}${post}`;
  });
}

// ─── Step 3: Contents tree (.hhc) ────────────────────────────────────────────
/**
 * Builds the nested folder tree shared by the .hhc writer and --print-tree.
 * Keys are manifest chapter ids plus the document's own sub-folders, e.g.
 * "manual-03-devices/quick-start". `orderKey` keeps the docs-relative folder
 * path ("t3000/quick-start") because the curated ORDER table is written against
 * those names.
 */
function buildDocTree(docs) {
  const root = { children: new Map(), files: [], orderKey: '' };
  for (const d of docs) {
    let node = root;
    for (const seg of d.branch.split('/')) {
      if (!node.children.has(seg)) {
        node.children.set(seg, {
          children: new Map(),
          files: [],
          orderKey: node === root ? d.chapterFrom || seg : `${node.orderKey}/${seg}`,
        });
      }
      node = node.children.get(seg);
    }
    node.files.push(d);
  }
  return root;
}

/** Ordered child keys: preferred order first (ORDER), then alphabetical. */
function sortedChildKeys(node, pathPrefix) {
  const order = ORDER[node.orderKey || pathPrefix] || [];
  return [...node.children.keys()].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    const ra = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
    const rb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
    return ra - rb || a.localeCompare(b);
  });
}

/** Files of a node: the "Overview" page first, then alphabetical by title. */
function sortedFiles(node) {
  return [...node.files].sort((a, b) => {
    const oa = a.isOverview ? 0 : 1;
    const ob = b.isOverview ? 0 : 1;
    return oa - ob || a.title.localeCompare(b.title);
  });
}

const countDocs = (node) =>
  node.files.length + [...node.children.values()].reduce((n, c) => n + countDocs(c), 0);

/** First page of a subtree (used to link a book heading to its first topic). */
function firstDocOf(node, pathPrefix) {
  const own = sortedFiles(node)[0];
  if (own) return own;
  for (const key of sortedChildKeys(node, pathPrefix)) {
    const hit = firstDocOf(node.children.get(key), pathPrefix ? `${pathPrefix}/${key}` : key);
    if (hit) return hit;
  }
  return null;
}

/**
 * Builds the body of the T3Web landing page - a sitemap of every collection,
 * sub-book and page, so clicking the T3Web book in the Contents lands on a
 * real page instead of a bare node.
 */
function landingHtml(docs, sectionName) {
  const root = buildDocTree(docs);
  const out = [
    `<h1>${escapeHtml(sectionName)}</h1>`,
    `<p class="t3web-lead">T3000 documentation bundled into this help file: ` +
      `<b>${docs.length}</b> pages in <b>${root.children.size}</b> collections. ` +
      `Use the list below, or the Contents / Index / Search panes on the left.</p>`,
  ];

  const walk = (node, pathPrefix, depth) => {
    let html = '';
    const files = sortedFiles(node);
    if (files.length) {
      html += '<ul>';
      for (const f of files) html += `<li><a href="${f.slug}.htm">${escapeHtml(f.title)}</a></li>`;
      html += '</ul>';
    }
    for (const key of sortedChildKeys(node, pathPrefix)) {
      const child = node.children.get(key);
      const childPath = pathPrefix ? `${pathPrefix}/${key}` : key;
      const first = firstDocOf(child, childPath);
      const label = escapeHtml(folderLabel(key, pathPrefix));
      const head = first ? `<a href="${first.slug}.htm">${label}</a>` : label;
      const tag = depth === 0 ? 'h2' : depth === 1 ? 'h3' : 'h4';
      html +=
        `<${tag}>${head} <span class="t3web-count">(${countDocs(child)} pages)</span></${tag}>`;
      html += walk(child, childPath, depth + 1);
    }
    return html;
  };

  out.push(walk(root, '', 0));
  return out.join('\n');
}

/** Plain-text preview of the Contents tree (used by --print-tree). */
function previewTree(docs, sectionName) {
  const root = buildDocTree(docs);
  const lines = [`${sectionName}  (${docs.length} pages)`];
  const walk = (node, pathPrefix, indent) => {
    for (const key of sortedChildKeys(node, pathPrefix)) {
      const child = node.children.get(key);
      const childPath = pathPrefix ? `${pathPrefix}/${key}` : key;
      lines.push(`${indent}${folderLabel(key, pathPrefix)}  (${countDocs(child)})`);
      walk(child, childPath, indent + '   ');
    }
    for (const f of sortedFiles(node)) lines.push(`${indent}- ${f.title}`);
  };
  walk(root, '', '  ');
  return lines.join('\n');
}

/** Renders the book: folders become sub-books at any depth, files become leaves. */
function tocInsert(docs, sectionName = DOC_SECTION_TITLE, landingSlug = null) {
  const li = (name, local, children = '') => `
<LI><OBJECT type="text/sitemap">
<param name="Name" value="${escapeHtml(tocText(name))}"/>
${local ? `<param name="Local" value="${local}"/>\n` : ''}</OBJECT>
<UL>
${children}
</UL>
</LI>`;

  const root = buildDocTree(docs);
  const render = (node, pathPrefix) => {
    let out = '';
    for (const key of sortedChildKeys(node, pathPrefix)) {
      const childPath = pathPrefix ? `${pathPrefix}/${key}` : key;
      out += li(folderLabel(key, pathPrefix), '', render(node.children.get(key), childPath));
    }
    for (const f of sortedFiles(node)) out += li(f.title, `${f.slug}.htm`);
    return out;
  };

  return li(sectionName, landingSlug ? `${landingSlug}.htm` : null, render(root, ''));
}

// ─── Step 4: Index (.hhk) ────────────────────────────────────────────────────
function indexInsert(docs, extra = []) {
  const seen = new Set();
  let out = '';
  for (const e of extra) {
    if (!e.name || !e.local) continue;
    seen.add(e.name.toLowerCase());
    out += `
<LI><OBJECT type="text/sitemap">
<param name="Name" value="${escapeHtml(tocText(e.name))}" />
<param name="Local" value="${e.local}" />
</OBJECT>
<UL>
</UL>
</LI>`;
  }
  for (const d of docs) {
    for (const kw of [d.title, ...d.headings]) {
      const key = kw.toLowerCase();
      if (!kw || seen.has(key)) continue;
      seen.add(key);
      out += `
<LI><OBJECT type="text/sitemap">
<param name="Name" value="${escapeHtml(tocText(kw))}" />
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

function writeHhp(work, files, ctx, opts = {}) {
  const {
    compiledName = 'T3000_Help.chm',
    title = 'T3000 Help',
    defaultTopic = 'index.htm',
    mergeFiles = [],
  } = opts;
  const hhp = `${[
    '[OPTIONS]',
    'Compatibility=1.1 or later',
    `Compiled file=${compiledName}`,
    'Contents file=project.hhc',
    'Index file=project.hhk',
    `Default topic=${defaultTopic}`,
    `Title=${title}`,
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
    ...(mergeFiles.length ? ['', '[MERGE FILES]', ...mergeFiles] : []),
    '',
  ].join('\n')}\n`;
  fs.writeFileSync(path.join(work, 'project.hhp'), hhp, 'utf8');
  return hhp;
}

/** Runs hhc.exe and returns the compiled file (hhc exits non-zero even on success). */
function compileIn(workDir, hhcExe, chmName) {
  let out = '';
  try {
    out = run(hhcExe, ['project.hhp'], { cwd: workDir });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
  }
  const compiled = path.join(workDir, chmName);
  if (!fs.existsSync(compiled)) {
    console.log(out);
    throw new Error(`Compilation failed - no ${chmName} produced.`);
  }
  const errs = out.split(/\r?\n/).filter((l) => /^HHC\d+/i.test(l.trim()));
  if (errs.length) {
    warn(`hhc.exe reported ${errs.length} problem(s):`);
    errs.slice(0, 10).forEach((l) => console.log('     ' + l.trim()));
  }
  ok(`${chmName} compiled: ${(fs.statSync(compiled).size / 1048576).toFixed(1)} MB`);
  return compiled;
}

/** Renders the landing page and every topic into `work`. */
function writePages(docs, work, bookName) {
  fs.mkdirSync(path.join(work, 'css'), { recursive: true });
  fs.writeFileSync(path.join(work, 'css', 'docs-extra.stylesheet'), EXTRA_CSS, 'utf8');

  // The book node in the Contents points here, so selecting the book opens a real
  // sitemap instead of a bare branch.
  fs.writeFileSync(
    path.join(work, `${LANDING_SLUG}.htm`),
    pageShell({
      title: `${bookName} Documentation`,
      breadcrumb: bookName,
      fileName: `${LANDING_SLUG}.htm`,
      content: landingHtml(docs, bookName),
      prev: null,
      next: null,
    }),
    'utf8'
  );

  const slugByAbs = new Map(docs.map((d) => [normPath(d.abs), d.slug]));
  marked.setOptions({ gfm: true, breaks: false });
  docs.forEach((d, i) => {
    let html = marked.parse(d.md);
    html = localiseImages(html, d.abs, work, d.slug.replace(/^docs-/, ''));
    html = localiseLinks(html, d.abs, slugByAbs);

    const prev = i > 0 ? { title: docs[i - 1].title, file: `${docs[i - 1].slug}.htm` } : null;
    const next = i < docs.length - 1 ? { title: docs[i + 1].title, file: `${docs[i + 1].slug}.htm` } : null;
    const trail = d.branch ? d.branch.split('/').map((s) => folderLabel(s, '')) : [];
    const breadcrumb = [bookName, ...trail].filter(Boolean).join(' › ');

    fs.writeFileSync(
      path.join(work, `${d.slug}.htm`),
      pageShell({ title: d.title, breadcrumb, fileName: `${d.slug}.htm`, content: html, prev, next }),
      'utf8'
    );
  });
  ok(`${bookName}: ${docs.length} pages + landing page`);
}

/**
 * Builds a standalone help file (reference / engineering) from scratch, reusing
 * the manual's compiled theme so all three help files look identical.
 */
function buildStandaloneCollection(col, themeDir, hhcExe, workBase) {
  console.log(`\n-- ${col.book} (${col.manifest}) --`);
  const w = path.join(workBase, `chm-${slugify(col.book)}`);
  fs.rmSync(w, { recursive: true, force: true });
  fs.mkdirSync(w, { recursive: true });

  for (const d of ['css', 'js']) {
    const from = path.join(themeDir, d);
    if (fs.existsSync(from)) fs.cpSync(from, path.join(w, d), { recursive: true });
  }
  for (const f of ['de_style.stylesheet', 'custom.stylesheet', 'printed.stylesheet']) {
    const from = path.join(themeDir, f);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(w, f));
  }

  const docs = docsForCollection(col);
  if (!docs.length) {
    warn(`${col.manifest}: no pages - skipped`);
    return null;
  }
  writePages(docs, w, col.book);

  const header =
    `<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML//EN">\n<HTML>\n<HEAD>\n` +
    `<meta name="GENERATOR" content="T3Web docs build"/>\n<!-- Sitemap 1.0 -->\n</HEAD>\n<BODY>\n`;
  fs.writeFileSync(path.join(w, 'project.hhc'), `${header}<UL>\n${tocInsert(docs, col.book, LANDING_SLUG)}\n</UL>\n</BODY>\n</HTML>\n`, 'latin1');
  fs.writeFileSync(
    path.join(w, 'project.hhk'),
    `${header}<UL>\n${indexInsert(docs, [{ name: col.book, local: `${LANDING_SLUG}.htm` }])}\n</UL>\n</BODY>\n</HTML>\n`,
    'latin1'
  );

  writeHhp(w, listFilesForHhp(w), { alias: [], map: [] }, {
    compiledName: col.chm,
    title: col.book,
    defaultTopic: `${LANDING_SLUG}.htm`,
  });

  return compileIn(w, hhcExe, col.chm);
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
  if (args.docs) DOCS_BASE = path.resolve(args.docs);
  const allCollections = loadCollections();
  if (!allCollections.length) {
    throw new Error(`No collection manifests (*.json) found in ${HELP_DIR}`);
  }
  const stem = (c) => (c.manifest || '').replace(/\.json$/, '');
  const wanted =
    args.collection && args.collection !== 'all'
      ? allCollections.filter((c) => stem(c) === args.collection)
      : allCollections;
  if (!wanted.length) {
    throw new Error(`--collection ${args.collection} matched no manifest (have: ${allCollections.map(stem).join(', ')})`);
  }
  const manualCol = wanted.find((c) => c.manual) || null;
  const others = wanted.filter((c) => c !== manualCol);
  const work = path.resolve(args.work || DEFAULTS.work);
  const out = path.resolve(
    args.out || path.join(path.dirname(requestedChm), manualCol ? manualCol.chm : 'T3000_Help.chm')
  );
  const sectionName = args.sectionName || (manualCol ? manualCol.book : DOC_SECTION_TITLE);

  console.log(
    `\nT3Web help build\n` +
      `  master chm  : ${chm}\n` +
      `  collections : ${wanted.map((c) => `${c.manifest} -> ${c.chm}`).join('\n                ')}\n` +
      `  manual book : ${manualCol ? `${sectionName} (appended last in the manual's Contents)` : '(none)'}\n` +
      `  merged into : ${manualCol ? others.map((c) => c.chm).join(', ') || '(nothing)' : '-'}\n` +
      `  work        : ${work}\n  output      : ${out}\n`
  );
  if (!fs.existsSync(hhcExe)) throw new Error(`hhc.exe not found: ${hhcExe}\nInstall "HTML Help Workshop" or pass --hhc <path>.`);

  console.log('1) Resolving collection manifests');
  const docs = manualCol ? docsForCollection(manualCol) : [];
  if (manualCol && !docs.length) {
    throw new Error(`${manualCol.manifest}: no pages resolved - check the chapter paths.`);
  }
  for (const c of others) ok(`${c.book}: ${docsForCollection(c).length} pages (${c.manifest})`);

  if (args.printTree) {
    console.log('\nContent tree preview (no build performed):\n');
    if (manualCol) console.log(previewTree(docs, sectionName));
    for (const c of others) {
      console.log(`\n${'-'.repeat(58)}\n`);
      console.log(previewTree(docsForCollection(c), c.book));
    }
    console.log('');
    return;
  }

  console.log('\n2) Decompiling the master help file (theme + context map)');
  decompile(chm, work);

  let pristineHhc = null;
  if (manualCol) {
    console.log('3) Converting Markdown topics');
    writePages(docs, work, sectionName);

    console.log('4) Extending the Contents tree and Index');
    const hhcPath = path.join(work, 'project.hhc');
    pristineHhc = fs.readFileSync(hhcPath, 'latin1'); // before our section is added
    let hhc = pristineHhc;
    const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // A merged help file only shows up in the unified Contents if the parent's
    // own .hhc contains an entry that points at the child's topic tree.
    const mergeToc = others
      .map(
        (c) =>
          `<LI><OBJECT type="text/sitemap"><param name="Name" value="${tocText(c.book)}">\n` +
          `<param name="Local" value="${c.chm}::/project.hhc"></OBJECT>`
      )
      .join('\n');
    if (!new RegExp(`value="${escapedName}"`).test(hhc)) {
      // Append as the LAST top-level book in the Contents tree.
      const book = tocInsert(docs, sectionName, LANDING_SLUG) + (mergeToc ? `\n${mergeToc}` : '');
      hhc = hhc.replace(/<\/UL>\s*<\/BODY>/i, `${book}\n</UL>\n</BODY>`);
      fs.writeFileSync(hhcPath, hhc, 'latin1');
      ok(
        `Contents tree extended (book "${sectionName}" placed last${
          others.length ? ` + ${others.length} merged help file(s)` : ''
        })`
      );
    } else {
      warn(`Contents tree already contains a "${sectionName}" book - not re-adding`);
    }

    const hhkPath = path.join(work, 'project.hhk');
    let hhk = fs.readFileSync(hhkPath, 'latin1');
    hhk = hhk.replace(
      /<\/UL>\s*<\/BODY>/i,
      `${indexInsert(docs, [
        { name: `${sectionName} Documentation`, local: `${LANDING_SLUG}.htm` },
        ...others.map((c) => ({ name: c.book, local: `${c.chm}::/${LANDING_SLUG}.htm` })),
      ])}\n</UL>\n</BODY>`
    );
    fs.writeFileSync(hhkPath, hhk, 'latin1');
    ok('Index extended');
  }

  if (manualCol) {
    console.log('5) Writing project.hhp (FILES + ALIAS + MAP)');
    const ctx = contextMap(mapHeader, pristineHhc);
    const files = listFilesForHhp(work);
    writeHhp(work, files, ctx, {
      compiledName: manualCol.chm,
      title: manualCol.book,
      defaultTopic: 'index.htm',
      mergeFiles: others.map((c) => c.chm),
    });
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
  }

  // ─── Delivery ──────────────────────────────────────────────────────────────
  const deployed = [];
  const altDir = path.join(REPO_ROOT, 'build', 'help-chm');
  const destDir = path.dirname(out);
  const deliver = (src, name, label) => {
    const dest = path.join(destDir, name);
    if (args.deploy && !args.keepOriginal) {
      if (fs.existsSync(dest)) {
        const backup = dest.replace(/\.chm$/i, '.original.chm');
        if (!fs.existsSync(backup)) {
          fs.copyFileSync(dest, backup);
          ok(`Backed up the existing ${name} -> ${path.basename(backup)}`);
        }
      }
      try {
        fs.copyFileSync(src, dest);
        ok(`Deployed ${label} to ${dest}`);
        deployed.push(dest);
        return;
      } catch (e) {
        if (!e || (e.code !== 'EBUSY' && e.code !== 'EPERM')) throw e;
        warn(`Could not overwrite ${dest} - the file is open in the Help viewer.`);
      }
    }
    fs.mkdirSync(altDir, { recursive: true });
    const alt = path.join(altDir, name);
    fs.copyFileSync(src, alt);
    ok(`${label} copied to ${alt}`);
    deployed.push(alt);
  };

  if (manualCol) {
    console.log('6) Compiling the manual with hhc.exe');
    deliver(compileIn(work, hhcExe, manualCol.chm), manualCol.chm, manualCol.book);
  }

  // The reference / engineering help files are standalone: the manual's Contents
  // links them, and [MERGE FILES] unifies Contents, Index and search at runtime.
  for (const c of others) {
    const built = buildStandaloneCollection(c, work, hhcExe, work);
    if (built) deliver(built, c.chm, c.book);
  }

  console.log(
    `\nDone. ${deployed.length} help file(s) written` +
      `${args.deploy && !args.keepOriginal ? '' : ' (deploy disabled)'}.\n`
  );
}

main();
