import { z } from "zod";

import { AssetUrlSchema } from "./assetUrl.js";
import { RenderConditionSchema } from "./condition.js";
import { FrameColorEnum } from "./frameAssets.js";

/** A color written `#rrggbb`. */
export const HexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "expected a color written #rrggbb");

/**
 * A color taken from the card: its pinline colors, each looked up in
 * `palette`.
 *
 * A card with one pinline color paints that color. A two-color card paints
 * its two colors in their printed order (`WU`, `GW`…), and a three-color card
 * its three (`GWU`, `URW`…) — but only up to `maxParts`; a card with more
 * colors than that paints the palette's gold (`m`). Artifact, colorless, land
 * and vehicle pinlines paint `a`, `c`, `l` and `v`. A color the palette leaves
 * out paints nothing.
 */
export const CardColorsSchema = z.object({
  palette: z.partialRecord(FrameColorEnum, HexColorSchema),
  /**
   * The most colors painted side by side, 1–3. Defaults to 1, where any
   * multicolor card is gold.
   */
  maxParts: z.number().int().min(1).max(3).optional(),
});

export type CardColors = z.infer<typeof CardColorsSchema>;

/** One opacity along a gradient: `opacity` (0–1) at `at` (0 start, 1 end). */
export const OpacityStopSchema = z.object({
  at: z.number().min(0).max(1),
  opacity: z.number().min(0).max(1),
});

export type OpacityStop = z.infer<typeof OpacityStopSchema>;

/**
 * The boxes a `rulesSlide` can move, and a gradient can be anchored to: the
 * header above the rules text.
 */
export const SlidingBoxEnum = z.enum(["mana", "title", "type", "setSymbol"]);

export type SlidingBox = z.infer<typeof SlidingBoxEnum>;

/**
 * A rectangle painted on the sheet over the art and under the text, its
 * opacity changing along `direction` by `opacity`, which needs at least two
 * stops. Drawn in the order listed, above the frame art.
 *
 * `color` is one color, or the card's: for those, the rectangle is split
 * along `direction` into one equal part per color, blended over `blend` px
 * where two meet.
 */
export const GradientSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  /** Which way `opacity` runs: down the sheet, or across it. Defaults to vertical. */
  direction: z.enum(["vertical", "horizontal"]).optional(),
  color: z.union([
    HexColorSchema,
    CardColorsSchema.extend({
      /** Px over which two of the card's colors blend into each other. */
      blend: z.number().nonnegative().optional(),
    }),
  ]),
  opacity: z.array(OpacityStopSchema).min(2).readonly(),
  /**
   * The box the gradient moves with. Its `y` is then measured from that box's
   * top in the boxes the card is drawn with — whichever set the layout picks
   * for it (a planeswalker's by how many abilities it has) and wherever a
   * `rulesSlide` has moved them. Takes the place of `slides`, which it
   * ignores.
   */
  anchor: SlidingBoxEnum.optional(),
  /** Moves with the boxes when the layout's `rulesSlide` moves them. */
  slides: z.boolean().optional(),
  /** Drawn only on a render where this holds, e.g. a template setting's value. */
  when: RenderConditionSchema.optional(),
});

export type Gradient = z.infer<typeof GradientSchema>;

/**
 * An image whose own color is replaced, keeping its alpha — a shape the frame
 * ships once and paints per card. Drawn at its own size unless given one.
 */
export const TintedImageSchema = z.object({
  src: AssetUrlSchema,
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  /**
   * One color, or one of the card's (see `CardColorsSchema`): `part` 0 is
   * the first, and a card with fewer colors paints its last.
   */
  color: z.union([
    HexColorSchema,
    CardColorsSchema.extend({ part: z.number().int().min(0).optional() }),
  ]),
  /** Drawn only on a card with power and toughness, as the P/T is. */
  showWith: z.literal("powerToughness").optional(),
  /**
   * Placed beside a number of the layout's `powerToughnessRow`: the image's
   * right edge goes the row's `gap` left of that number, so it moves with
   * the number as it widens, and `x` only nudges it from there (usually 0).
   * Without a row, `x` places it as usual.
   */
  ptSlot: z.enum(["power", "toughness"]).optional(),
  /** Moves with the boxes when the layout's `rulesSlide` moves them. */
  slides: z.boolean().optional(),
  /**
   * Drawn only on a render where this holds — a frame offering two sets of
   * symbols lists both, each under the value of the setting that picks it.
   */
  when: RenderConditionSchema.optional(),
});

export type TintedImage = z.infer<typeof TintedImageSchema>;
