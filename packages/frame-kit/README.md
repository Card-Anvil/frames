# @cardanvil/frame-kit

The contract [Card Anvil](https://github.com/Card-Anvil) frames are authored against: the schemas that
define what a frame is, the helpers you author one with, and the format frames are distributed in.

```sh
pnpm add -D @cardanvil/frame-kit zod
```

`zod` is a peer dependency — the frame types are inferred from zod schemas, so you and this package
must share one copy.

> **Building a frame?** Start from
> [Card-Anvil/frame-template](https://github.com/Card-Anvil/frame-template) instead of wiring this up
> by hand. This package is the contract underneath it.

## A frame is data

A frame is one plain object: box geometry, asset URLs, and a few render knobs. Nothing in it runs at
render time. That constraint is the whole reason frames are distributable — a frame can be serialized
to a `frame.json` plus a folder of images and loaded by an app that never compiled it, precisely
because there is no behaviour to carry across.

```ts
import { type Frame, withCollectorInfoDefaults } from "@cardanvil/frame-kit";

import preview from "./preview.jpg";
import { regularLayoutConfig } from "./regular/config";

export const myFrame = {
  name: "Parchment",
  description: "A hand-inked parchment frame.",
  previewImage: preview,
  tags: ["Custom"],
  config: {
    layouts: {
      normal: withCollectorInfoDefaults(regularLayoutConfig, collectorBounds),
    },
  },
} as const satisfies Frame;
```

`as const satisfies Frame` is the idiom: `satisfies` checks the object against the contract, `as const`
keeps the literal types.

## Entry points

| Import                           | What it gives you                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@cardanvil/frame-kit`           | The schemas (`FrameSchema`, `LayoutConfigSchema`, `FrameAssetsSchema`, …), the inferred types (`Frame`, `LayoutConfig`, `CardBoxes`, `TextBox`, `Layout`), and the authoring helpers |
| `@cardanvil/frame-kit/manifest`  | The distributable format: `frameToManifest`, `manifestToFrame`, `walkAssets`, `FrameManifestSchema`, `isContractCompatible`, `assertDeclarative`                                     |
| `@cardanvil/frame-kit/packaging` | The packaging tools the CLI is built on: `validateFrames`, `buildFrames`, `FrameIndexSchema`. Needs Node and Vite, so it is deliberately not on the main entry point                 |

## The `frame-kit` command

```bash
frame-kit validate                # check every frame, write nothing
frame-kit build --out dist        # check, then pack each one
frame-kit schema meta             # a format as JSON Schema
frame-kit --help
```

A frame is any directory holding a `frame.meta.json`, so this works both in a
workspace of packages and in a flat repository.

`validate` loads every frame through Vite, parses it against `FrameSchema`,
resolves every asset to a file that exists, and round-trips it through the
manifest in memory. Problems are collected rather than thrown, so one run
reports everything; under GitHub Actions they become inline annotations.

`build` adds hashing, zipping and the release index. Each frame becomes a
`<slug>-<version>.cardframe`, and `frame-index.json` describes the set.

Exit codes: `0` clean, `1` one or more frames failed, `2` used wrongly.

Packaging needs Vite — it is what turns `import w from "./w.png"` into a file —
so it is an **optional** peer dependency, loaded only when packaging runs. The
schemas above work under plain Node and in a browser without it.

## Type it, then validate it

Typing a config as `Frame` is weaker than the schema a loading app enforces. The clearest example:
passing a whole asset barrel to a typed field type-checks even when the barrel exports extra keys,
because excess property checks do not apply to namespace objects — and those extra keys then enter the
frame contract where nothing can resolve them.

```ts
import { FrameSchema } from "@cardanvil/frame-kit";

const result = FrameSchema.safeParse(myFrame);
expect(result.error?.issues ?? []).toEqual([]);
```

## The coordinate space

Boxes are **absolute pixels** on a **3264 × 4440** canvas.

⚠ **A Magic card face is 63 × 88 mm** — _not_ 2.5 × 3.5 inches, which is the poker-card size and is
wrong by 0.5 mm across and 0.9 mm tall, roughly 24 × 43 pixels at 1200 DPI. In inches the card is
2.48 × 3.46.

The canvas is **not** the card face: it is the full printed sheet **including bleed** — 2.72 × 3.7 in
(69.09 × 93.98 mm) at 1200 DPI, about 3 mm of bleed per edge. A box at `y: 0` sits in the bleed, above
the top of the card. Override the canvas per frame with `config.canvas`.

`fontSize` is in **points**, not pixels; the renderer converts.

## The distributable format

`@cardanvil/frame-kit/manifest` converts a `Frame` into something an app can install: a `frame.json`
with every asset URL rewritten to a package-relative path, plus the files themselves.

Asset positions are found by **walking the schema**, not from a hard-coded list of field paths, so a
new asset field in the contract is picked up automatically.

```ts
import { frameToManifest } from "@cardanvil/frame-kit/manifest";

const manifest = frameToManifest(myFrame, {
  id: "com.example.parchment",
  version: "1.0.0",
  resolveAsset: (url) => ({ path: `assets/${hashOf(url)}.png` }),
});
```

`manifestToFrame` reverses it, turning package-relative paths back into URLs the renderer can load —
an object URL for a zip, an `asset://` URL for a directory on disk, an absolute URL for a remote
package.

A manifest carries a `contractVersion` of the form `MAJOR.MINOR`, independent of this package's
version. A differing major is refused; a newer minor loads with a reduced-fidelity warning, because
added fields are always optional. Packaging preserves everything the contract defines and drops
everything it does not — keys outside the schema do not survive the round trip.

## Licence

MIT. See [LICENSE](https://github.com/Card-Anvil/frames/blob/trunk/LICENSE).
