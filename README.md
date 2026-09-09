# Card Anvil frames

The frame templates [Card Anvil](https://github.com/Card-Anvil) ships, and the
contract third-party frames are authored against.

Card Anvil consumes this repository as a git submodule and compiles the frame
packages from source. It is also the reference implementation: a frame here is
built exactly the way a frame anywhere else should be.

| Package                                                                                    | What it is                                                                                                 |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [`@cardanvil/frame-kit`](packages/frame-kit)                                               | The contract — schemas, types, authoring helpers, and the distributable manifest format. Published to npm. |
| [`@cardanvil/frame-m15`](packages/frame-m15)                                               | The Magic 2015 frame.                                                                                      |
| [`@cardanvil/frame-borderless`](packages/frame-borderless)                                 | The Borderless frame.                                                                                      |
| [`@cardanvil/frame-borderless-source-material`](packages/frame-borderless-source-material) | The Borderless Source Material frame.                                                                      |
| [`@cardanvil/frame-extended`](packages/frame-extended)                                     | Extended Art, derived from M15 and Borderless.                                                             |

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm lint
```

Node 24+ and pnpm (both pinned — `pnpm install` will tell you if you are off).

---

## What a frame is

**A frame is data, not code.** A package exports one `Frame` object: box
geometry, asset URLs, and a handful of render knobs. Nothing in a frame runs at
render time — Card Anvil's renderer reads the object and draws from it.

That constraint is what makes frames distributable. A frame can be serialized to
a `frame.json` plus a folder of images and loaded by an app that never compiled
it, precisely because there is no behaviour to carry across.

```ts
import { type Frame, withCollectorInfoDefaults } from "@cardanvil/frame-kit";

import preview from "./preview.jpg";
import { regularLayoutConfig } from "./regular/config";

export const myFrame = {
  name: "My Frame",
  description: "A frame",
  previewImage: preview,
  tags: ["Custom"],
  config: {
    layouts: {
      normal: withCollectorInfoDefaults(regularLayoutConfig, collectorBounds),
    },
  },
} as const satisfies Frame;
```

`as const satisfies Frame` is the idiom: `satisfies` type-checks the object
against the contract, `as const` keeps the literal types.

## The coordinate space

Every box is **absolute pixels** on a **3264 × 4440** canvas.

⚠ **A Magic card face is 63 × 88 mm.** It is _not_ 2.5 × 3.5 inches — that is the
poker-card size, and the difference is 0.5 mm across and 0.9 mm tall, roughly
24 × 43 pixels at 1200 DPI. Write millimetres. If you must write inches, the card
is 2.48 × 3.46 in.

The canvas is **not** the card face: it is the full printed sheet **including
bleed** — 2.72 × 3.7 in (69.09 × 93.98 mm) at 1200 DPI, leaving about 3 mm of
bleed on every edge. A box at `y: 0` therefore sits in the bleed, above the top
of the card.

Override the canvas per frame with `config.canvas` if your art is authored at a
different size.

`fontSize` is in **points**, not pixels; the renderer converts.

## Assets are barrels

An asset directory exports its images by name, and that barrel _is_ a valid
asset set:

```ts
// regular/base/index.ts
export { default as w } from "./w.png";
export { default as u } from "./u.png";
// …
```

```ts
import * as base from "./base";

export const regularLayoutConfig: LayoutConfig = {
  boxes,
  frameAssets: { base },
};
```

⚠ **A barrel must export only keys the field accepts.** Passing a whole barrel
type-checks even when it carries extra exports — excess property checks do not
apply to namespace objects — so the extra keys enter the frame silently. Where
the field is keyed by an enum this fails validation; where it is a plain object
the keys are quietly dropped when the frame is packaged. `frame-borderless`
narrows its DFC icon barrels for exactly this reason; see
[`transform/icons/dfcIconSets.ts`](packages/frame-borderless/src/transform/icons/dfcIconSets.ts).

### Colors

`w u b r g m a c l v` — WUBRG, gold (`m`), artifact (`a`), colorless (`c`),
land (`l`), vehicle (`v`). Land is always lowercase `l`.

Base frames additionally accept `c2`, the hybrid title/type wash used by
two-color split rendering. `c2` is valid only in the `base` family, and falls
back to `c` when absent.

## Layouts

`config.layouts` is keyed by layout name: every Scryfall layout, plus a
`<layout>_planeswalker` / `<layout>_case` cross-product for shapes Scryfall does
not distinguish but frames must, plus `saga_creature`, `saga_transform` and
`saga_transform_creature`. A frame only declares the layouts it supports;
unsupported ones show as disabled in the app.

`config.alternateLayouts` holds named variants selected by a template setting —
this is how Borderless offers its textless variants.

A `LayoutConfig` carries `boxes` and `frameAssets` (both required) plus optional
parallel sets the renderer picks between: `backBoxes` for the far face,
`creatureBoxes` when the card has power/toughness, `tallBoxes` for four-ability
planeswalkers, the `sagaFront*`/`sagaBack*` families for transforming sagas, and
so on. The commented schema in
[`packages/frame-kit/src/schema/frame.ts`](packages/frame-kit/src/schema/frame.ts)
is the reference for what each one does.

## Extending another frame

Frames may build on other frames. Depend on the package and import from its
`/extend` subpath:

```ts
import { regularLayoutConfig } from "@cardanvil/frame-m15/extend";
```

`/extend` is public API with a stability promise; a package's `src/extend.ts`
is the list of what it offers. The main entry point exports the `Frame` itself.
`frame-extended` is the worked example — it spreads M15's regular layout and
borrows Borderless's crowns.

Prefer copying a single asset over taking a dependency for one file:
`frame-borderless` keeps its own copy of the saga ability badge rather than
depending on `frame-m15` for one 30 KB image.

## Validate your frame

```bash
pnpm test
```

Every package asserts its frame against `FrameSchema`. Typing a config as
`Frame` is not enough — the schema is what a loading app enforces, and it
catches things the type system cannot.

## Testing against Card Anvil

Frame changes shift pixels, and the visual regression snapshots live in the app,
not here. So a frame change is two pull requests:

1. Merge the change here.
2. In Card Anvil, bump the submodule (`git submodule update --remote frames`),
   run `npm run test:e2e`, and commit any snapshot updates separately.

⚠ **Do not run `pnpm install` inside Card Anvil's `frames/` submodule
checkout.** The app resolves this source through path aliases; a `node_modules`
there would shadow the app's `zod` and produce two incompatible copies of every
schema type. Develop frames in a separate clone of this repository.

## Shipping a frame outside this repo

`@cardanvil/frame-kit/manifest` converts a `Frame` into a distributable package:
a `frame.json` with every asset URL rewritten to a package-relative path, plus
the files themselves. Asset positions are found by walking the schema, so a new
asset field in the contract is picked up automatically.

The manifest's `contractVersion` is `MAJOR.MINOR` and is independent of
frame-kit's own version. A differing major is refused; a newer minor loads with
a reduced-fidelity warning, because added fields are always optional.

Packaging preserves everything the contract defines and drops everything it does
not — keys outside the schema do not survive the round trip.

## Repository layout

```
packages/frame-kit/     the contract (published to npm)
packages/frame-*/       one package per frame
attic/                  art no package references; kept, not shipped
```

`attic/` exists so nothing was lost in the split from Card Anvil's
`src/templates/`. See [`attic/README.md`](attic/README.md).
