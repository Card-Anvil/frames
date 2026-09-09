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

Node 24+, pnpm (both pinned).

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

## Releasing frame-kit

Push a `frame-kit-v*` tag and `publish-frame-kit.yml` does the rest, using npm
trusted publishing — there is no NPM_TOKEN in this repository and there should
never be one.

⚠ **Pack with pnpm, publish with npm.** `publishConfig.exports` is a pnpm
feature: the package resolves to TypeScript source in the workspace, and pnpm
rewrites those entries to `dist` when it packs. npm does not implement that
rewrite, so `npm pack` here would produce a package whose entry points aim at
source files `files` does not ship. Publishing the _tarball_ with npm is what
gets OIDC, which pnpm does not implement. The workflow asserts no export still
points into `src` before it publishes.

If a package has never been published, trusted publishing has no settings page
to configure yet, so the first release goes out by hand:

```bash
npm login
cd packages/frame-kit
pnpm pack                                    # rewrites exports to dist
npm publish cardanvil-frame-kit-0.2.0.tgz --access public
```

Then add the trusted publisher on the package's npm settings page — org
`Card-Anvil`, repository `frames`, workflow `publish-frame-kit.yml` — and every
release after that is a tag push with no credential involved.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), matching Card Anvil:
`<type>(<scope>): <description>`, imperative, lower case, no trailing period. Scopes follow the
package or area touched — `frame-kit`, `m15`, `borderless`, `extended`, `manifest`, `cli`,
`packaging`, `cicd`.

The default branch is **`trunk`**.
