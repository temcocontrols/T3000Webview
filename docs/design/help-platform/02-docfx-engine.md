# 02 — The DocFX engine (clone, build, pin, patch)

*Covers: Overall Architecture → Layer 2 · Recommended Technology Stack · Implementation Plan phase 1.*

The engine is not a black box we install and trust. It is a **checked-in pin to a clone we build
ourselves**, so the site renderer cannot change without us choosing to change it, and so a template or
engine fix is a local patch instead of an upstream wait.

Context that makes this the right call:

- DocFX powered Microsoft's own documentation platform, and **Microsoft Learn moved off it in November
  2022**; the project is now community-driven under the .NET Foundation (`dotnet/docfx`, MIT).
- It is still actively developed (releases, nightly builds published to GitHub Packages), but nobody owes
  us a fix. A clone + patch path is the difference between "we can adapt it" and "we hope".

---

## 1. Where the clone lives

```
<repo root>
├─ tools/
│  ├─ docfx/                ← git submodule: https://github.com/dotnet/docfx
│  ├─ docfx.pin             ← the exact commit + version + build notes (committed)
│  └─ patches/              ← our engine patches, one file per patch (committed)
├─ docs/
│  ├─ docfx.json            ← the site project (generated from the registry)
│  ├─ toc.yml               ← the top navigation bar (generated)
│  └─ templates/t3000/      ← our template layer (hand-written, committed)
└─ scripts/                 ← registry, generators, gates
```

Rules:

- `tools/docfx/` is a **submodule**: never commit its contents, never edit a file in it without a patch
  file in `tools/patches/`. `git status` inside the clone must be clean after every build.
- `tools/docfx.pin` is the contract. It is the only place the version is written down.
- `_site/` and any `tools/docfx/artifacts/` output are ignored by git.

### Submodule setup

```powershell
git submodule add https://github.com/dotnet/docfx tools/docfx
git -C tools/docfx fetch --tags
# pick the newest stable release tag, e.g.
git -C tools/docfx checkout v2.78.3
```

`tools/docfx.pin` content:

```json
{
  "repo": "https://github.com/dotnet/docfx",
  "tag": "v2.78.3",
  "commit": "0123456789abcdef0123456789abcdef01234567",
  "pinnedOn": "2026-10-10",
  "pinnedBy": "docs-platform",
  "dotnetSdk": "9.0.x",
  "node": "24.x",
  "patches": [],
  "notes": "PDF requires >= 2.73 with the modern template."
}
```

### Cloning a closed/air-gapped network

```powershell
git submodule add <mirror-url>/dotnet/docfx.git tools/docfx
```

Everything after that is identical — the site build never contacts the network.

---

## 2. Prerequisites

| Tool | Version | Why |
|---|---|---|
| .NET SDK | 8.x / 9.x / 10.x | the DocFX projects target these; MSBuild-driven build |
| Node.js | 24.x | DocFX's own `templates/` are built with `npm run build` |
| Visual Studio 2022 | optional | the DocFX solution is VS-shaped; the CLI build does not need it |
| `git-lfs` | optional | only for DocFX's snapshot tests (`git lfs checkout`) |

A machine with only .NET installed can *run* a pre-built DocFX, but **cannot build the templates**, which
we must do to build the engine from source. Install Node 24 on the site host.

---

## 3. Build the engine from source

```powershell
# 1. templates (site rendering assets)
cd tools/docfx/templates
npm install
npm run build

# 2. the CLI
cd ..\..
dotnet build tools/docfx/docfx.sln -c Release

# 3. verify
dotnet run --project tools/docfx/src/docfx -- --version
```

`src/` layout, for when a patch or a template question sends you into the engine:

| Project | Responsibility |
|---|---|
| `src/docfx` | the CLI (`build`, `serve`, `pdf`, `metadata`, `template`, `init`) |
| `src/Docfx.App` | command implementations and orchestration |
| `src/Docfx.Build`, `Docfx.Build.Common` | the build pipeline, file mappings, TOC handling |
| `src/Docfx.MarkdigEngine`, `…Extensions` | Markdown → HTML (Markdig), including the DocFX extensions |
| `src/Docfx.Plugins`, `Docfx.Common`, `Docfx.Glob` | plugin contracts, file/glob infrastructure |
| `src/Docfx.DataContracts.*` | the page/TOC models the templates receive |
| `src/Docfx.Build.ManagedReference`, `Docfx.Dotnet` | .NET API metadata + rendering (not used for T3000's C++/Rust/TS) |
| `src/Docfx.Build.RestApi`, `…OperationLevelRestApi`, `…TagLevelRestApi` | REST API docs from an OpenAPI/Swagger spec |
| `src/Docfx.YamlSerialization` | YAML I/O (TOC, metadata) |
| `templates/` | the built-in `default` and `modern` site templates + `src/options.d.ts` typings |

### Making the clone's build the only `docfx` we use

Either run it directly (simplest, no PATH ambiguity):

```powershell
dotnet run --project tools/docfx/src/docfx -- build docs/docfx.json
```

or pack it as a local tool so `docfx` resolves to the pinned build:

```powershell
dotnet pack tools/docfx/src/docfx -c Release -o tools/docfx/artifacts
dotnet new tool-manifest                                    # creates .config/dotnet-tools.json
dotnet tool install docfx --local --add-source tools/docfx/artifacts
dotnet tool run docfx -- --version
```

A globally installed `docfx` (`dotnet tool install -g docfx`) is acceptable for throwaway experiments
only. **The build scripts must resolve the pinned clone**, and `npm run docs:site` must fail with a clear
message if the clone is missing or does not match `tools/docfx.pin`.

---

## 4. The command surface we depend on

| Command | Used for |
|---|---|
| `docfx build docs/docfx.json` | the site, the search index and `xrefmap.yml` |
| `docfx build docs/docfx.json --serve` | local preview while editing pages or the template |
| `docfx pdf docs/docfx.json` | the PDF manual (site must be built first; see `07-offline-pdf-chm.md`) |
| `docfx template list` / `docfx template export modern` | dump an embedded template to learn or diff it |
| `docfx init -y` | scratch project, for testing a config idea in isolation |
| `docfx metadata` | .NET only — **not** for this repo's C++/Rust/TypeScript |

Wrapper scripts (see `03-site-project.md` and Appendix A of the plan):

```
npm run docs:site     # docfx build  → _site/
npm run docs:serve    # docfx build --serve (port 8080)
npm run docs:pdf      # docfx build && docfx pdf
npm run docs:engine   # rebuild the pinned engine from source
```

---

## 5. Version policy, upgrade procedure and rollback

Policy: **one pinned version at a time, upgraded deliberately, never automatically.** Upgrades happen when
we need a fix or a feature, or once per release cycle — not on every upstream release.

Upgrade procedure (a single PR, nothing else in it):

1. `git -C tools/docfx fetch --tags` and read the release notes for every version between the pin and the
   target.
2. Check the two things that break us: template/partial renames (our `templates/t3000` overrides) and
   changes under `src/Docfx.*` that invalidate a patch in `tools/patches/`.
3. `git -C tools/docfx checkout <new tag>`; rebuild templates + CLI; run the app-verify command below.
4. Update `tools/docfx.pin`, re-apply/re-export patches.
5. Commit the version bump **and** the regenerated `_site` summary artefact (page count, warning count,
   unlinked/broken link count) in the same PR so the diff is auditable.

App-verify command (the acceptance test for any engine change):

```powershell
npm run docs:site
# must hold:
#   _site/index.html exists                                  (homepage)
#   _site/toc.html + _site/t3000/toc.html + _site/legacy/toc.html
#   _site/index.json (search index) and _site/xrefmap.yml
#   page count == registry ship count
#   broken-link warnings == 0
#   total warnings <= the recorded baseline
#   no remote URL in any generated .html/.css/.js (offline rule, see 11-review-and-cicd.md)
```

Rollback: revert the pin commit. Because the engine is a submodule and the site is a pure function of
(pages, registry, template, engine commit), reverting the pin plus a rebuild restores the previous site
byte-for-byte modulo timestamps.

---

## 6. Patch policy

Create a patch only when a DocFX behaviour cannot be reached through configuration, metadata, template
overrides or a post-processor.

```powershell
git -C tools/docfx checkout -b t3000/patches
# ... edit ...
git -C tools/docfx commit -am "fix: <what and why>"
git -C tools/docfx format-patch <pinCommit> -o ../patches
```

- Patch files are named `NNNN-short-slug.patch` and committed under `tools/patches/`.
- `tools/docfx.pin#patches` lists them in order.
- `npm run docs:engine` applies patches after checkout and fails loudly if one no longer applies.
- Each patch keeps a link to the upstream issue/PR in its commit message, so a later upgrade can drop it
  once upstream ships the fix.

Likely first candidates, in order of probability:

| Symptom | Usual non-patch fix |
|---|---|
| A partial's markup needs a change | override the partial in `templates/t3000` |
| A page needs different chrome | `fileMetadata` → `_disableToc`, `_disableAffix`, `_layout`, `_noindex` |
| Markdown feature missing | `markdownEngineProperties.markdigExtensions` |
| Post-processing of generated HTML | `postProcessors` / our own Node step after the build |
| Search index behaviour | our `main.js` layer, or the Pagefind run (see `06-search.md`) |

---

## 7. Failure modes

| Failure | Detection | Response |
|---|---|---|
| `tools/docfx` missing (submodule not initialised) | `npm run docs:site` precheck | fail with `git submodule update --init tools/docfx` |
| Clone commit ≠ `tools/docfx.pin` | precheck compares `git -C tools/docfx rev-parse HEAD` | fail, print both commits |
| .NET SDK missing or older than the pinned requirement | `dotnet --list-sdks` in the precheck | fail with the required band |
| Node missing (templates can't build) | `npm run` inside `templates/` fails | fail with "install Node 24 to build DocFX from source" |
| Port 8080 already in use | `--serve` exits | use `--port <n>`; document it in the npm script |
| Patch no longer applies after an upgrade | `git am`/`git apply` fails in `docs:engine` | stop; re-derive the patch against the new tag |
| Engine build succeeds but the site is empty | `_site/index.html` missing | check `build.content` globs are relative to `docfx.json` |
| PDF command reports no TOC | `docfx pdf` output | the site has not been built yet, or `pdf` metadata is not enabled (see `07`) |

---

## 8. Tasks (phase 1, in order)

1. Add the submodule, check out a stable release tag, write `tools/docfx.pin`.
2. Build templates + CLI; record the exact commands in `scripts/docs-engine.mjs` (`npm run docs:engine`).
3. Add the precheck (`verifyEnginePin()`) used by every site script.
4. Add `tools/patches/` with its README and the apply step in `docs:engine`.
5. Record the warning-count baseline for the current corpus (this becomes the CI budget).
6. Add the engine-upgrade checklist to `CONTRIBUTING`/the PR template.

**Acceptance:** on a clean clone, `git submodule update --init tools/docfx; npm run docs:engine;
npm run docs:site` produces `_site/` with the homepage, both area TOCs, `index.json` and `xrefmap.yml`,
with zero broken-link warnings, without touching the network beyond the initial submodule clone.
