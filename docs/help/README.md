# `docs/help` — the help-file (CHM) manual system

This folder does **not** contain documentation pages. It contains the *definition*
of what goes into each compiled Windows help file, so that the pages themselves
can stay exactly where the web Documentation page and the MCP tools expect them.

```
docs/
├── t3000/            ← page content (unchanged — used by the web viewer + MCP)
├── legacy/           ← page content (unchanged)
├── help/             ← this folder: only the build definitions
│   ├── manual.json        → T3000_Help.chm   (the user manual)
│   ├── reference.json     → T3Web_Ref.chm    (API / integrator)
│   └── engineering.json   → T3Web_Dev.chm    (internal design notes)
└── todo/             ← working file, not part of any help file
```

Nothing is moved or copied: each manifest **points at existing `.md` files**.

## Manifest format

```json
{
  "book": "T3Web",                 // the top-level Contents book name
  "chm": "T3000_Help.chm",         // output file name
  "manual": true,                  // fold into T3000_Help.chm and merge the rest
  "chapters": [
    { "title": "Getting Started", "from": "t3000/quick-start" },
    { "title": "Displays",        "from": ["t3-eez-studio", "tstat-lcd"] },
    { "title": "Overview",        "pages": ["t3000/index.md"] }
  ]
}
```

* `"from"` — one or more folders, **relative to `docs/`**. Every `.md` inside is
  included; sub-folders become sub-books, files become pages. Files named
  `README.md` / `index.md` become the page **Overview**.
* `"pages"` — an explicit list of `.md` files (relative to `docs/`), for one-off pages.
* Chapters appear in the Contents tree in the order listed here.
* The first manifest with `"manual": true` is the one folded into the existing
  `T3000_Help.chm`; the others are compiled as their own `.chm` files and merged
  into it at run time (`[MERGE FILES]`).

## Building

```
npm run help:tree     # preview the three Contents trees (no build)
npm run build:help    # build all three .chm files and deploy them to ..\HelpDocs
npm run build:help:dry  # build without deploying (results go to build\help-chm)
node scripts/build-t3000-help-chm.mjs --collection manual   # just one collection
```

The three files must be shipped **in the same folder** as `T3000.exe` for the
merge to work; the T3000 build itself does not copy them.

## Editing

* Add a page to the manual: drop the `.md` anywhere under a folder that a chapter
  points at — no manifest change needed.
* Change the manual's chapter order or names: edit `manual.json` only.
* Move a page between collections: edit the `from`/`pages` entries; the page file
  itself never moves, so the web Documentation page keeps working.
