# AGENTS.md

Guide for coding agents working in this repo. Read [README.md](README.md) first — it is the
authoring reference and this file does not repeat it.

## What this is

Frame templates for [Card Anvil](https://github.com/Card-Anvil), and `@cardanvil/frame-kit`, the
contract they are authored against. A pnpm workspace: one package per frame, plus the kit. Card
Anvil consumes this repo as a git submodule and compiles it from source.

| Task         | Command                |
| ------------ | ---------------------- |
| Install      | `pnpm install`         |
| Typecheck    | `pnpm typecheck`       |
| Test         | `pnpm test`            |
| Lint         | `pnpm lint`            |
| Format       | `pnpm format`          |
| Build kit    | `pnpm build`           |
| Check frames | `pnpm frames:validate` |
| Pack frames  | `pnpm frames:build`    |
| Watch frames | `pnpm frames:watch`    |

Node 24+, pnpm (both pinned).

## Where to look

| Question                                                 | File                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| How do I author a frame?                                 | [`README.md`](README.md)                                                      |
| What does a field in the schema mean?                    | `packages/frame-kit/src/schema/frame.ts` — commented, and the source of truth |
| What does the contract package expose?                   | [`packages/frame-kit/README.md`](packages/frame-kit/README.md)                |
| How does a frame reach a user? What can a browser fetch? | [`docs/distribution.md`](docs/distribution.md)                                |
| What happens once a bundle reaches the app?              | Card Anvil's `docs/third-party-frames.md`                                     |

## Card dimensions — be exact

**A Magic card face is 63 × 88 mm.**

Never write **2.5 × 3.5 inches**. That is the poker-card size and it is wrong: 0.5 mm too wide and
0.9 mm too tall, about 24 × 43 pixels at 1200 DPI. It has appeared in this codebase before and is
the kind of error that silently propagates into layout maths and documentation.

- Prefer **millimetres**. In inches the card is **2.48 × 3.46 in** — never round to 2.5 × 3.5.
- The **3264 × 4440 canvas is not the card face.** It is the full printed sheet _including bleed_:
  2.72 × 3.7 in (69.09 × 93.98 mm) at 1200 DPI, with roughly 3 mm of bleed per edge. Box
  coordinates are relative to that sheet, so `y: 0` is in the bleed, not the top of the card.
- Card Anvil holds the constants in `src/utils/print.ts` (`CARD_WIDTH_MM`, `CARD_HEIGHT_MM`,
  `PRINT_WIDTH_IN`, `PRINT_HEIGHT_IN`). Reference them rather than restating numbers, and when
  a number must be written in prose, state which of the two rectangles it describes.

## Conventions

- **Frames are data, not code.** A package exports one `Frame` object. Nothing in a frame runs at
  render time — that is what makes frames distributable.
- **A barrel is an asset set.** `export { default as w } from "./w.png"` plus
  `import * as base from "./base"`. A barrel must export _only_ keys the target field accepts:
  passing one wholesale type-checks even with extra exports, because excess property checks do not
  apply to namespace objects. See `frame-borderless/src/transform/icons/dfcIconSets.ts`.
- **Validate, do not just type.** `pnpm test` parses every frame against `FrameSchema`. Typing a
  config as `Frame` is weaker than the schema a loading app enforces.
- **frame-kit stays asset-free and bundler-free.** It is published to npm and must work under plain
  Node, which is why the Scryfall layout list is inlined rather than imported.
- **Relative imports:** extensionless inside frame packages (consumed as source); explicit `.js`
  inside `frame-kit` (compiled by `tsc` for publishing).
- Frame packages are **not** built. Vite must own the asset pipeline — asset URLs depend on the
  consuming app's base path and inline threshold, and emitted filenames are content hashes.

## Testing a frame change

Visual regression snapshots live in Card Anvil, not here, so this repo's CI cannot tell you whether
a change shifted pixels. A frame change is two pull requests: merge here, then in Card Anvil run
`git submodule update --remote frames`, `npm run test:e2e`, and commit snapshot updates separately.

## The watch loop

`build --watch` exists so a frame author can point Card Anvil at a folder and see a save land in
the preview. Two things in it are load-bearing and easy to break:

- **The Vite server is reused across rebuilds, and its SSR module cache must be invalidated every
  pass** (`invalidateFrameModules`). Without that a rebuild re-serves the module Vite loaded first,
  so an edited layout number rebuilds byte-identically and the watch silently does nothing. Starting
  a fresh server per rebuild is correct but costs a second or two per save, which is the whole
  point of the loop.
- **Bundles and the index are written atomically** (temp file plus rename). The consumer is
  watching the same directory, so a plain write hands it a truncated zip.

Rebuilds are debounced, and one already in flight finishes before the next starts — two builds
writing one bundle race. Anything the build itself produces is ignored, so a rebuild cannot
retrigger itself.

## Releasing frame-kit

**Actions → Release frame-kit → Run workflow → pick `patch`, `minor` or `major` → Run.**

That is the whole process. The workflow works out the next version from the one in
`packages/frame-kit/package.json`, checks the frames still pack, commits the bump, tags
`frame-kit-v<version>`, cuts a GitHub release, and publishes to npm with trusted publishing —
there is no NPM_TOKEN in this repository and there should never be one.

Deriving the version from the package rather than from tags is deliberate: 0.2.0 was published
before this repository tagged anything, so tags are not a complete history of what is on the
registry.

Pushing the bump needs `CROSS_REPO_PAT`, because the default `GITHUB_TOKEN` cannot push to a
protected branch. The workflow fails on its first step, with that reason, if the secret is missing.

The release is created with `--latest=false` on purpose: `releases/latest` in this repository is
reserved for frame bundles, which is the URL a marketplace reads. A package release must not take
that slot.

**There is no way to publish without cutting a release.** A version on npm that no tag points at
is a version nobody can check out.

Publishing runs as its own job, so a publish that fails after the tag is pushed can be re-run from
the Actions tab on its own, without cutting another version.

⚠ **Pack with pnpm, publish with npm.** `publishConfig.exports` is a pnpm feature: the package
resolves to TypeScript source in the workspace, and pnpm rewrites those entries to `dist` when it
packs. npm does not implement that rewrite, so `npm pack` here would produce a package whose entry
points aim at source files `files` does not ship. Publishing the _tarball_ with npm is what gets
OIDC, which pnpm does not implement. The workflow asserts the packed version matches the release
and that no export still points into `src` before it publishes.

`publishConfig` deliberately does **not** set `provenance`. Provenance needs a CI provider to
attest the build, so setting it fails a local publish outright with `provider: null` — and it is
unnecessary anyway, because trusted publishing generates attestations on its own.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), matching Card Anvil:
`<type>(<scope>): <description>`, imperative, lower case, no trailing period. Scopes follow the
package or area touched — `frame-kit`, `m15`, `borderless`, `extended`, `manifest`, `cli`,
`packaging`, `cicd`.

The default branch is **`trunk`**.
