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
  '': ['t3000', 'legacy'],
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

/** Label for a folder node: depth 1 uses the docs-root name, deeper uses TITLES. */
const folderLabel = (key, pathPrefix) =>
  (!pathPrefix ? GROUP_TITLES[key] : TITLES[key]) || titleCase(key);

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
 * Keys are folder segments of each document's branch, e.g.
 * "t3000/quick-start" or "legacy/implementations/t3-bas-web".
 */
function buildDocTree(docs) {
  const root = { children: new Map(), files: [] };
  for (const d of docs) {
    let node = root;
    for (const seg of d.branch.split('/')) {
      if (!node.children.has(seg)) node.children.set(seg, { children: new Map(), files: [] });
      node = node.children.get(seg);
    }
    node.files.push(d);
  }
  return root;
}

/** Ordered child keys: preferred order first (ORDER), then alphabetical. */
function sortedChildKeys(node, pathPrefix) {
  const order = ORDER[pathPrefix] || [];
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
  const docsRoots = args.docs
    ? [{ key: 't3000', dir: path.resolve(args.docs) }]
    : DOC_ROOTS.map((r) => ({ ...r }));
  const work = path.resolve(args.work || DEFAULTS.work);
  const out = path.resolve(args.out || path.join(path.dirname(requestedChm), 'T3000_Help.chm'));
  const sectionName = args.sectionName || DOC_SECTION_TITLE;

  console.log(
    `\nT3000 Help CHM build\n  source  : ${chm}\n  docs    : ${docsRoots
      .map((r) => `${r.dir}`)
      .join('\n            ')}\n  book    : ${sectionName} (placed last in Contents)\n  work    : ${work}\n  output  : ${out}\n`
  );
  if (!fs.existsSync(hhcExe)) throw new Error(`hhc.exe not found: ${hhcExe}\nInstall "HTML Help Workshop" or pass --hhc <path>.`);
  for (const r of docsRoots) {
    if (!fs.existsSync(r.dir)) throw new Error(`Markdown root not found: ${r.dir}`);
  }

  console.log('1) Scanning documentation sources');
  const docs = [];
  for (const root of docsRoots) {
    for (const abs of collectMarkdown(root.dir)) {
      const rel = path.relative(root.dir, abs).replace(/\\/g, '/');
      const relDir = path.dirname(rel);
      // `images`/`assets` folders are not books - their Markdown belongs to the
      // parent section (e.g. manual/images/README.md -> Manual > Overview).
      const dirSegs = (!relDir || relDir === '.' ? '' : relDir.replace(/\\/g, '/'))
        .split('/')
        .filter((s) => s && !/^(images?|assets|img)$/i.test(s));
      const dir = dirSegs.join('/');
      const slug = 'docs-' + slugify(`${root.key}/${rel.replace(/\.md$/i, '')}`);
      const md = fs.readFileSync(abs, 'utf8');
      const base = path.basename(rel, '.md');
      const isOverview = /^(readme|index)$/i.test(base);
      docs.push({
        abs: path.resolve(abs),
        branch: dir ? `${root.key}/${dir}` : root.key,
        rootKey: root.key,
        rel,
        slug,
        title: isOverview ? 'Overview' : firstHeading(md) || titleCase(base),
        md,
        headings: headings(md),
        isOverview,
      });
    }
  }
  if (!docs.length) throw new Error('No .md files found under the configured docs roots.');

  // Two Markdown files can slugify to the same topic name (they differ only by
  // case or punctuation, e.g. TRENDLOG_DATA_FLOW_ANALYSIS.md vs
  // TrendLog-Data-Flow-Analysis.md). CHM file names are case-insensitive, so
  // disambiguate with a numeric suffix instead of silently overwriting a page.
  const usedSlugs = new Set();
  for (const d of docs) {
    const base = d.slug;
    let n = 1;
    while (usedSlugs.has(d.slug)) d.slug = `${base}-${++n}`;
    if (d.slug !== base) {
      warn(
        `duplicate topic name "${base}" - ${path.relative(REPO_ROOT, d.abs)} published as ${d.slug}.htm`
      );
    }
    usedSlugs.add(d.slug);
  }

  const slugByAbs = new Map(docs.map((d) => [normPath(d.abs), d.slug]));

  if (args.printTree) {
    console.log(`\nContent tree preview (no build performed):\n`);
    console.log(previewTree(docs, sectionName));
    console.log('');
    return;
  }

  console.log(`\n2) Decompiling the existing help file`);
  decompile(chm, work);
  console.log('3) Converting Markdown topics');

  fs.mkdirSync(path.join(work, 'css'), { recursive: true });
  fs.writeFileSync(path.join(work, 'css', 'docs-extra.stylesheet'), EXTRA_CSS, 'utf8');

  // Landing page for the whole book. The Contents node "T3Web" points here, so
  // selecting the book opens a real sitemap instead of a bare branch.
  fs.writeFileSync(
    path.join(work, `${LANDING_SLUG}.htm`),
    pageShell({
      title: `${sectionName} Documentation`,
      breadcrumb: sectionName,
      fileName: `${LANDING_SLUG}.htm`,
      content: landingHtml(docs, sectionName),
      prev: null,
      next: null,
    }),
    'utf8'
  );
  ok(`Landing page written (${LANDING_SLUG}.htm - ${docs.length} pages listed)`);

  marked.setOptions({ gfm: true, breaks: false });
  docs.forEach((d, i) => {
    let html = marked.parse(d.md);
    const slugDir = d.slug.replace(/^docs-/, '');
    html = localiseImages(html, d.abs, work, slugDir);
    html = localiseLinks(html, d.abs, slugByAbs);

    const prev = i > 0 ? { title: docs[i - 1].title, file: `${docs[i - 1].slug}.htm` } : null;
    const next = i < docs.length - 1 ? { title: docs[i + 1].title, file: `${docs[i + 1].slug}.htm` } : null;
    const trail = d.branch.split('/').slice(1).map((s) => TITLES[s] || titleCase(s));
    const breadcrumb = [sectionName, GROUP_TITLES[d.rootKey] || titleCase(d.rootKey), ...trail]
      .filter(Boolean)
      .join(' › ');

    fs.writeFileSync(
      path.join(work, `${d.slug}.htm`),
      pageShell({ title: d.title, breadcrumb, fileName: `${d.slug}.htm`, content: html, prev, next }),
      'utf8'
    );
  });
  ok(`${docs.length} Markdown pages converted`);

  console.log('4) Extending the Contents tree and Index');
  const hhcPath = path.join(work, 'project.hhc');
  const pristineHhc = fs.readFileSync(hhcPath, 'latin1'); // before our section is added
  let hhc = pristineHhc;
  const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`value="${escapedName}"`).test(hhc)) {
    // Append as the LAST top-level book in the Contents tree.
    hhc = hhc.replace(/<\/UL>\s*<\/BODY>/i, `${tocInsert(docs, sectionName, LANDING_SLUG)}\n</UL>\n</BODY>`);
    fs.writeFileSync(hhcPath, hhc, 'latin1');
    ok(`Contents tree extended (top-level book "${sectionName}", placed last)`);
  } else {
    warn(`Contents tree already contains a "${sectionName}" book - not re-adding`);
  }

  const hhkPath = path.join(work, 'project.hhk');
  let hhk = fs.readFileSync(hhkPath, 'latin1');
  hhk = hhk.replace(
    /<\/UL>\s*<\/BODY>/i,
    `${indexInsert(docs, [
      { name: `${sectionName} Documentation`, local: `${LANDING_SLUG}.htm` },
    ])}\n</UL>\n</BODY>`
  );
  fs.writeFileSync(hhkPath, hhk, 'latin1');
  ok('Index extended');

  console.log('5) Writing project.hhp (FILES + ALIAS + MAP)');
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

  console.log('6) Compiling with hhc.exe');
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

  const altOut = path.join(REPO_ROOT, 'build', 'help-chm', 'T3000_Help.chm');
  if (args.deploy && !args.keepOriginal) {
    if (fs.existsSync(out)) {
      const backup = out.replace(/\.chm$/i, '.original.chm');
      if (!fs.existsSync(backup)) {
        fs.copyFileSync(out, backup);
        ok(`Backed up the original to ${backup}`);
      }
    }
    try {
      fs.copyFileSync(compiled, out);
      ok(`Deployed to ${out}`);
    } catch (e) {
      if (e && (e.code === 'EBUSY' || e.code === 'EPERM')) {
        fs.mkdirSync(path.dirname(altOut), { recursive: true });
        fs.copyFileSync(compiled, altOut);
        warn(`Could not overwrite ${out} - the file is open in the Help viewer.`);
        warn(`Close the help window and re-run, or copy it yourself from:\n     ${altOut}`);
      } else {
        throw e;
      }
    }
  } else {
    fs.mkdirSync(path.dirname(altOut), { recursive: true });
    fs.copyFileSync(compiled, altOut);
    ok(`Not deployed - result copied to ${altOut}`);
  }
  console.log('\nDone.\n');
}

main();
