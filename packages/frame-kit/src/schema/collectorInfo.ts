import { z } from "zod";

/**
 * A value the collector line can print. Each resolves from the card and the
 * user's field settings at render time, except `separator` and `artistSymbol`,
 * which are glyphs.
 */
export const CollectorInfoElementTypeSchema = z.enum([
  "rarity",
  "cardNumber",
  "creatorName",
  "setCode",
  /** Dot or star, per the user's separator setting (from the mana font). */
  "separator",
  "language",
  /** The paintbrush glyph (from the mana font). */
  "artistSymbol",
  "artist",
]);

export type CollectorInfoElementType = z.infer<
  typeof CollectorInfoElementTypeSchema
>;

export const CollectorInfoElementSchema = z.object({
  type: CollectorInfoElementTypeSchema,
  /** Draw in Manadings-Regular (for `separator` and `artistSymbol`). */
  useManaFont: z.boolean().optional(),
  /** The mana-font character to draw, e.g. `"a"` for the artist symbol. */
  manaSymbol: z.string().optional(),
  /** Multiplier on the box's font size. Default 1.0. */
  fontSizeMultiplier: z.number().optional(),
  /** `fontSizeMultiplier` for the dot separator only. */
  fontSizeMultiplierDot: z.number().optional(),
  /** `fontSizeMultiplier` for the star separator only. */
  fontSizeMultiplierStar: z.number().optional(),
  /** Vertical offset in px, positive down. */
  yOffset: z.number().optional(),
  /** `yOffset` for the dot separator only. */
  yOffsetDot: z.number().optional(),
  /** `yOffset` for the star separator only. */
  yOffsetStar: z.number().optional(),
  /** Space after this element in px, overriding the line's `spacing`. */
  spacingAfter: z.number().optional(),
  /**
   * Per-element letter spacing in px, overriding the collector box's
   * `letterSpacing` for this element's characters (e.g. tighten the artist
   * name while the rarity/number keep the box tracking). Absolute px like
   * `spacingAfter` — it does not scale with `fontSizeMultiplier`. Set `0` to
   * render this element untracked while the box has tracking.
   */
  letterSpacing: z.number().optional(),
  /**
   * When set, this element's x position is never less than the x position of
   * the referenced element type on another line. If the elements before this
   * one on the same line already extend past that position, this element
   * follows naturally. Used to align the creator name with the artist symbol.
   */
  minXFromElement: CollectorInfoElementTypeSchema.optional(),
  /**
   * Literal text prepended to the resolved value (e.g. "Illus. " before the
   * artist name). Omitted entirely if the value is empty.
   */
  prefix: z.string().optional(),
});

export type CollectorInfoElement = z.infer<typeof CollectorInfoElementSchema>;

/** One line of the collector box: elements drawn left to right. */
export const CollectorInfoLineSchema = z.object({
  elements: z.array(CollectorInfoElementSchema).readonly(),
  /** Space between elements in px. Default 10. */
  spacing: z.number().optional(),
  /**
   * Horizontal alignment within the box's width. Defaults to "left" (the
   * elements flow left-to-right from the box's left edge).
   */
  align: z.enum(["left", "center"]).optional(),
  /**
   * Multiplier applied to every element's font size on this line, stacking
   * with each element's own `fontSizeMultiplier`. Default 1.0.
   */
  fontSizeMultiplier: z.number().optional(),
  /**
   * Overrides the font family for every text element on this line (the
   * artist/creator-name/Gotham default otherwise used per element type).
   */
  fontFamily: z.string().optional(),
});

export type CollectorInfoLine = z.infer<typeof CollectorInfoLineSchema>;
