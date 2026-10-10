# 02 — The DocFX engine (clone, build, pin, patch)

*Covers: Overall Architecture → Layer 2 · Recommended Technology Stack · Implementation Plan phase 1.*

The engine is not a black box we install and trust, and it is **not** a fork we maintain for its own sake.
It is a **pinned version** whose output we verify, with a documented escalation path to owning the source
if we ever need a change upstream will not make.

Policy in one line: **pin first, patch last.**

- DocFX grew out of Microsoft's documentation toolchain. The project's own README states that Microsoft
  Learn no longer uses DocFX and does not intend to support it (November 2022), and that DocFX continues as
  a community-driven .NET Foundation project (MIT). Community threads from that period also suggest parts
  of Microsoft's content pipeline still involved DocFX; the current Learn architecture is not public. None
  of that changes what we do — it only means **nobody owes us a fix**.
- Therefore: pin the version, keep our template thin, and keep the ability to patch as an option we have
  designed for but do not pay for on day one.

## 0. The two questions, answered plainly

### The clone, in short

```
engine (its own git repo, a sibling folder):

C:\QN\temcocontrols\
├─ T3000Webview-EEZ-Studio\        ← our repo: docs/docfx.json, docs/toc.yml, docs/templates/t3000/
└─ docfx\                          ← the engine clone: src/docfx (the CLI), templates/ (built here)

referenced at build time via DOCFX_REPO, never committed anywhere in our repo.
```

```powershell
git clone https://github.com/dotnet/docfx C:\QN\temcocontrols\docfx
git -C C:\QN\temcocontrols\docfx checkout v2.78.3            # a release tag
setx DOCFX_REPO "C:\QN\temcocontrols\docfx"

cd C:\QN\temcocontrols\docfx\templates ; npm install ; npm run build    # build it once
cd C:\QN\temcocontrols\docfx           ; dotnet build docfx.sln -c Release
```

Then our repo just calls it: `npm run docs:site` → `dist/docs`. Three rules:

1. **Never edit a file inside the clone.**
2. **Never put it inside the T3000 repo, and never add it as a submodule.**
3. **Only two things in T3000 mention it:** `tools/docfx.pin` (the version) and the `DOCFX_REPO` env var.

Everything we customise lives in our repo — `docs/docfx.json`, `docs/toc.yml`, `docs/templates/t3000/`.
The rest of this section explains why no engine code ever has to change.

**Do we have to change any DocFX code? No — expect zero modified files in the clone.**

| What we want to change | Where the change lives | Does the engine's code change? |
|---|---|---|
| Colours, layout, fonts, widgets | `docs/templates/t3000/public/{main.css,main.js}` in **our repo**, passed in as the last entry of `template` | no — DocFX reads it |
| Page chrome per area (hide the right rail, `noindex`, landing layout) | `docfx.json` → `globalMetadata` / `fileMetadata` in **our repo** | no — configuration |
| Navigation, chapters, ordering | generated `docs/toc.yml` in **our repo** | no — input data |
| Markdown features | `markdownEngineProperties` + Markdig extensions | no — configuration |
| Broken links, offline-asset rules | our `scripts/audit-docs.mjs` | no — our tooling |
| Something only the engine's C# can do | a commit on the engine branch → export to `tools/patches/*.patch` | **yes — last resort, expect ~never** |

**Do we "use it" or "reference it"? We *use the binary*, exactly like `hhc.exe`.**

```
T3000 repo (git)                              the engine (outside the repo)
  tools/docfx.pin         ──────────────►     mode / version / commit to verify   (10 lines of JSON)
  npm run docs:site       ──────────────►     dotnet tool run docfx …     (mode B: no source at all)
                                              dotnet <engine>\src\docfx\… (mode A: your checkout)
  docs/docfx.json, docs/toc.yml   ──────────►  read as build input
  docs/templates/t3000/**         ──────────►  read as the template layer
```

There is **no submodule, no project reference, no library call, and no engine source inside T3000**. The
entire relationship is: a build-time executable invocation, plus a pin file that says which version to run.
`npm run build:help` has the same relationship with `hhc.exe`.

Maintenance, honestly: **none until we choose to upgrade.** Sitting on one engine version for years is a
legitimate strategy. Upgrading is `fetch` + `checkout <tag>` + rebuild + run the app-verify command; with an
unmodified checkout it is a checkout, and with our own commits it is a rebase.

## 1. Two supported modes (pin first, patch last)

| | **Mode B — pinned release (phase-1 default)** | **Mode A — cloned and built** |
|---|---|---|
| What it is | the official release binary, exact version, via the committed local tool manifest | `dotnet/docfx` cloned **outside this repository** (e.g. `C:\QN\temcocontrols\docfx`), templates + CLI built from source |
| Reproducibility | `dotnet tool restore` + `tools/docfx.pin` ⇒ byte-for-byte identical tool for everyone | build is a pure function of the pinned commit |
| Cost | near zero; no Node needed, no engine build in CI | you own a build: .NET SDK **and** Node 24, an engine checkout outside the repo, a rebuild after every upgrade |
| Patching | not possible | possible — commits on **your own fork** (mode A+, preferred) or `.patch` files |
| When to choose it | always, until a specific need appears | when we need behaviour a template override, a post-processor or a config option cannot reach — or when the site host cannot reach NuGet |
| Both modes | write the same `_site/` — the site build is identical either way | — |

`tools/docfx.pin` is the single source of truth in **both** modes; it records `mode`, and the scripts resolve
the engine from it. Moving from B to A is a change to one field plus a `git clone` **outside** the
repository — never a submodule, and never a second git repository nested inside this one.

Why mode B is the default: a fork of a 1000-file engine is maintenance you pay every upgrade, and our
actual needs (branding, layout, search, PDF, offline) are all reachable through template overrides, file
metadata, `markdownEngineProperties`, `postProcessors` and our own post-build scripts. Mode A stays
documented and testable — the project owner may still prefer it for on-premises reproducibility, and
`DOCFX_MODE=clone` must keep working.

### Mode A+ — your own fork (recommended when the engine must change)

Fork `dotnet/docfx` into your own GitHub org and clone **that** fork as a sibling folder
(`C:\QN\temcocontrols\docfx`, next to `T3000Webview-EEZ-Studio`). It is mode A in every mechanical sense —
outside the tree, referenced by `DOCFX_REPO`, still **not a submodule** — with the remote being yours.

| Benefit | Why it matters here |
|---|---|
| **Patches are commits, not `.patch` files** | a `t3000/main` branch rebases onto a new upstream tag in the normal way; conflicts are resolved once instead of re-deriving patch files |
| **Your own tags** | tag your builds `t3000-v2.78.3-1`; reproducible even if upstream moves, renames or deletes a tag |
| **CI can clone it directly** | no third-party checkout assumptions; a private fork needs a token or deploy key, a public/internal one needs nothing |
| **A durable pin** | `tools/docfx.pin` points at *your* fork URL + tag + commit, so the build survives upstream changing hands |
| **Audit trail** | engine changes are reviewable PRs in your org, like everything else |

Policy, kept this small:

```powershell
# once
gh repo fork dotnet/docfx --clone --org <your-org>        # or the GitHub UI + git clone
git remote -v            # expect origin = your fork, upstream = dotnet/docfx
git checkout -b t3000/main v2.78.3      # branch off the release tag we ship
git push -u origin t3000/main
setx DOCFX_REPO "C:\QN\temcocontrols\docfx"

# every upgrade
git fetch upstream --tags
git checkout t3000/main; git rebase v2.79.0
git push --force-with-lease origin t3000/main
git tag t3000-v2.79.0-1; git push origin t3000-v2.79.0-1     # then bump tools/docfx.pin
```

Rules that keep it cheap:

1. **Prefix our tags** (`t3000-*`). Reusing upstream tag names on a fork makes `git fetch upstream --tags`
   ambiguous.
2. **Rebase, never merge**, onto upstream tags, so the history reads as "upstream release + our N commits".
3. **Clone the fork in full** (not `--depth 1`): rebasing needs history.
4. **`tools/patches/` stays**, but becomes an export for machines that cannot clone your fork
   (`git format-patch <upstreamTag>..t3000/main`) rather than the primary mechanism.
5. **Keep the fork minimal.** Every engine commit is paid back at every upgrade. Template overrides, file
   metadata, `markdownEngineProperties` and post-processors still come first; a fork commit is the last
   resort — it is simply a *pleasant* last resort now.

## 2. Mode A — the engine lives outside the repository (never a submodule)

**A submodule is not required and is not used.** Cloning the engine *outside* the T3000 working tree gives
the same guarantee — a pinned commit we can read and patch — without nesting a second git repository in
this one: no `.gitmodules`, no `git submodule update` for every developer, no way to commit files into the
engine tree by accident, and the T3000 clone stays self-contained and clonable on its own.

```
engine (its own git repo, a sibling folder):

C:\QN\temcocontrols\
├─ T3000Webview-EEZ-Studio\        ← our repo: tools/docfx.pin, docs/, scripts/
└─ docfx\                          ← the engine: src/docfx (the CLI), templates/ (built here)

referenced at build time via DOCFX_REPO, never committed anywhere in our repo.
```

Rules:

- The engine is **never inside the repository**: `git status` in T3000 must never show engine files.
- `tools/docfx.pin` is the contract and the only place the version is written down.
- Patches are plain `.patch` files in `tools/patches/`, applied to the external checkout by
  `npm run docs:engine`. Keeping the checkout unmodified means a patch that no longer applies fails loudly
  instead of silently drifting.
- `_site/` (and the `dist/docs` target) are ignored by git; `tools/docfx/` is in `.gitignore` as a guard.

### Setting it up

```powershell
# 1. clone the engine as a sibling folder of the repo
 git clone https://github.com/dotnet/docfx C:\QN\temcocontrols\docfx
git -C C:\QN\temcocontrols\docfx fetch --tags
git -C C:\QN\temcocontrols\docfx checkout v2.78.3       # newest stable release tag

# 2. point the scripts at it (per machine; also set in CI)
$env:DOCFX_REPO = "C:\QN\temcocontrols\docfx"          # or: setx DOCFX_REPO "C:\QN\temcocontrols\docfx"
# 3. build it
cd $env:DOCFX_REPO\templates; npm install; npm run build
cd $env:DOCFX_REPO;           dotnet build docfx.sln -c Release
```

Air-gapped or mirrored networks: `git clone <mirror-url>/dotnet/docfx` — everything after that is identical,
and the site build itself never contacts the network.

Three ways to obtain the engine, none of which puts it in this repository:

| Way | Command | Notes |
|---|---|---|
| **Pinned tool (mode B)** | `dotnet tool install docfx --local --version <x.y.z>` | **no source at all** — the compiled tool lands in `%USERPROFILE%\.nuget\packages\docfx\<version>\`; only `.config/dotnet-tools.json` is committed |
| **Independent clone (mode A)** | `git clone https://github.com/dotnet/docfx C:\QN\temcocontrols\docfx` | its own git repository, in a sibling folder, **outside** the T3000 working tree; T3000 does not reference it, so there is no `.gitmodules` and no submodule entry |
| **Your own fork (mode A+, best when the engine must change)** | `gh repo fork dotnet/docfx --clone --org <your-org>` → `C:\QN\temcocontrols\docfx` | identical mechanics to an independent clone, but the remote is yours: patches are commits, tags are yours, CI can clone it, and the pin survives upstream changing hands |
| **Source archive (no git at all)** | download `…/archive/refs/tags/<tag>.zip`, extract to `C:\QN\temcocontrols\docfx-<tag>` | for machines that must not keep git metadata; identical build afterwards |

Whichever way: the tree must stay clean, so `tools/docfx/` is added to `.gitignore` as a guard — a mistaken
checkout *inside* the repo can then never be committed (git would only warn about an embedded repository).

`tools/docfx.pin`:

```json
{
  "mode": "clone",
  "repo": "https://github.com/<your-org>/docfx",
  "upstreamRepo": "https://github.com/dotnet/docfx",
  "tag": "t3000-v2.78.3-1",
  "upstreamTag": "v2.78.3",
  "branch": "t3000/main",
  "commit": "0123456789abcdef0123456789abcdef01234567",
  "enginePathEnvVar": "DOCFX_REPO",
  "enginePathExample": "C:/QN/temcocontrols/docfx",
  "pinnedOn": "2026-10-10",
  "pinnedBy": "docs-platform",
  "dotnetSdk": "10.0.x",
  "node": "24.x",
  "patches": [],
  "notes": "mode: tool | clone | global. PDF requires >= 2.73 with the modern template."
}
```

`mode` is the only field the scripts act on: `tool` = the pinned local tool (mode B, default), `clone` = the
external checkout above (mode A), `global` = a machine-wide `dotnet tool install -g docfx`. Switching modes
changes nothing about the site project or the output, so it is a one-field edit.

`enginePathEnvVar` wins over any recorded path, so the same repository works on a developer machine, a CI
runner and a build server with no edit to a tracked file.

---

## 3. Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| .NET SDK | 8.x / 9.x / 10.x | running DocFX in both modes; building it in mode A |
| Node.js | 24.x | **mode A only** — DocFX's own `templates/` are built with `npm run build` |
| Visual Studio 2022 | optional | mode A contributors only; the CLI build does not need it |
| `git-lfs` | optional | only for DocFX's snapshot tests (`git lfs checkout`) |

Mode B needs only the .NET SDK. Mode A additionally needs Node 24 on the site host, because the engine's
site templates must be built before the CLI can render anything.

---

## 4. Build the engine from source

```powershell
$engine = $env:DOCFX_REPO          # e.g. C:\QN\temcocontrols\docfx — the sibling clone

# 1. templates (site rendering assets)
cd $engine\templates
npm install
npm run build

# 2. the CLI
cd $engine
dotnet build docfx.sln -c Release

# 3. verify
dotnet run --project $engine\src\docfx -- --version
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

### Making the chosen engine the only `docfx` we use

Mode A — run the external checkout directly (simplest, no PATH ambiguity):

```powershell
dotnet run --project $env:DOCFX_REPO\src\docfx -- build docs/docfx.json
```

Mode A — or pack the checkout and install it as a local tool, which keeps one command name:

```powershell
dotnet pack $env:DOCFX_REPO\src\docfx -c Release -o $env:DOCFX_REPO\artifacts
dotnet new tool-manifest                                    # creates .config/dotnet-tools.json
dotnet tool install docfx --local --add-source $env:DOCFX_REPO\artifacts
dotnet tool run docfx -- --version
```

Mode B — the pinned release, no checkout at all:

```powershell
dotnet new tool-manifest
dotnet tool install docfx --local --version 2.78.3         # the version recorded in tools/docfx.pin
dotnet tool run docfx -- build docs/docfx.json
```

A globally installed `docfx` (`dotnet tool install -g docfx`) is acceptable for throwaway experiments only.
**Every build script resolves the engine through `tools/docfx.pin`**, and `npm run docs:site` must fail with
a clear message when the pinned engine is missing, is the wrong version, or does not match `tools/docfx.pin`.

---

## 5. The command surface we depend on

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

## 6. Version policy, upgrade procedure and rollback

Policy: **one pinned version at a time, upgraded deliberately, never automatically.** Upgrades happen when
we need a fix or a feature, or once per release cycle — not on every upstream release.

Upgrade procedure (a single PR, nothing else in it):

1. `git -C $env:DOCFX_REPO fetch --tags` (mode A) or read the tool's release notes (mode B), covering every
   version between the pin and the target.
2. Check the two things that break us: template/partial renames (our `templates/t3000` overrides) and
   changes under `src/Docfx.*` that invalidate a patch in `tools/patches/`.
3. Mode A: `git -C $env:DOCFX_REPO checkout <new tag>`; rebuild templates + CLI. Mode B:
   `dotnet tool update docfx --local --version <x.y.z>`. Then run the app-verify command below.
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

Rollback: revert the pin commit. Because the engine is pinned to an exact version and the site is a pure
function of (pages, registry, template, engine version), reverting the pin plus a rebuild restores the
previous site byte-for-byte modulo timestamps.

---

## 7. Patch policy

Create a patch only when a DocFX behaviour cannot be reached through configuration, metadata, template
overrides or a post-processor.

```powershell
# mode A only — the checkout is deliberately kept clean, patches are the record of our changes
git -C $env:DOCFX_REPO checkout -b t3000/patches
# ... edit ...
git -C $env:DOCFX_REPO commit -am "fix: <what and why>"
git -C $env:DOCFX_REPO format-patch <pinCommit> -o $pwd\tools\patches
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

## 8. Failure modes

| Failure | Detection | Response |
|---|---|---|
| Engine missing (mode A: no checkout; mode B: no local tool) | `npm run docs:site` precheck | mode A: fail with `git clone <repo> $env:DOCFX_REPO`; mode B: fail with `dotnet tool restore` |
| Engine version ≠ `tools/docfx.pin` | precheck (`--version`, or `git -C $env:DOCFX_REPO rev-parse HEAD` in mode A) | fail, printing both versions/commits |
| Engine files appear inside the repository | precheck: any tracked or untracked path under a known engine layout | fail — the engine is never vendored (mode A lives outside the tree) |
| .NET SDK missing or older than the pinned requirement | `dotnet --list-sdks` in the precheck | fail with the required band |
| Node missing (templates can't build) | `npm run` inside `templates/` fails | fail with "install Node 24 to build DocFX from source" |
| Port 8080 already in use | `--serve` exits | use `--port <n>`; document it in the npm script |
| Patch no longer applies after an upgrade | `git am`/`git apply` fails in `docs:engine` | stop; re-derive the patch against the new tag |
| Engine build succeeds but the site is empty | `_site/index.html` missing | check `build.content` globs are relative to `docfx.json` |
| PDF command reports no TOC | `docfx pdf` output | the site has not been built yet, or `pdf` metadata is not enabled (see `07`) |

---

## 9. Tasks (phase 1, in order)

1. Pin the engine: mode B (`dotnet new tool-manifest` + `dotnet tool install docfx --local --version <x.y.z>`),
   and — if wanted — mode A (clone **outside** the repo, set `DOCFX_REPO`). Either way write `tools/docfx.pin`.
2. Make `npm run docs:site` resolve the engine through the pin and fail with a clear message otherwise
   (`verifyEnginePin()`), including the "engine files inside the repo" check.
3. Add `tools/patches/` with its README and the apply step in `docs:engine` (mode A only).
4. Record the warning-count baseline for the current corpus (this becomes the CI budget).
5. Add the engine-upgrade checklist to `CONTRIBUTING`/the PR template.

**Acceptance:** on a clean clone, `dotnet tool restore; npm run docs:site` (mode B) — or `npm run docs:engine;
npm run docs:site` (mode A) — produces `_site/` with the homepage, both area TOCs, the search index and
`xrefmap.yml`, with zero broken-link warnings, and **no engine file anywhere inside the repository**
(`git status` shows only the intended changes).
