import { z } from "zod";

/**
 * Mirrors `ScryfallLayout` from `@scryfall/api-types`.
 *
 * Inlined as a literal on purpose: that package ships TypeScript source rather
 * than compiled JavaScript (`"main": "index.ts"`) and exports a runtime enum,
 * so depending on it would make this package unusable outside a bundler that
 * transpiles `node_modules`. Card Anvil's `src/models/layout.sync.test.ts`
 * fails if the two ever drift.
 */
export const SCRYFALL_LAYOUTS = [
  "normal",
  "split",
  "flip",
  "transform",
  "modal_dfc",
  "meld",
  "leveler",
  "class",
  "saga",
  "adventure",
  "mutate",
  "prototype",
  "battle",
  "planar",
  "scheme",
  "vanguard",
  "token",
  "double_faced_token",
  "emblem",
  "augment",
  "host",
  "art_series",
  "reversible_card",
] as const;

export type ScryfallLayoutName = (typeof SCRYFALL_LAYOUTS)[number];

/**
 * Card shapes that Scryfall does not distinguish but frames must: a
 * planeswalker and a Case are `normal`/`class` to Scryfall, yet need their own
 * box geometry. Crossed with every Scryfall layout to form `<layout>_<special>`.
 */
export const specialLayouts = ["planeswalker", "case"] as const;

const customLayouts = SCRYFALL_LAYOUTS.flatMap((layout) =>
  specialLayouts.map((special) => `${layout}_${special}` as const),
);

/**
 * Explicit additional layouts not covered by the `specialLayouts` cross-product.
 * `saga_transform`/`saga_transform_creature` cover a transform DFC where EITHER
 * face is a Saga — which physical side it is on varies per card and is resolved
 * at render time, not by separate keys.
 */
export const additionalLayouts = [
  "saga_creature",
  "saga_transform",
  "saga_transform_creature",
] as const;

export const layouts = [
  ...SCRYFALL_LAYOUTS,
  ...customLayouts,
  ...additionalLayouts,
] as const;

export const LayoutEnum = z.enum(layouts);

export type Layout = z.infer<typeof LayoutEnum>;
