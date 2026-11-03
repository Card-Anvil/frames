import { z } from "zod";

import { FrameColorEnum } from "./frameAssets.js";

/**
 * The frame's outer border as the renderer is about to draw it — what a
 * `RenderCondition` matches on through `border`:
 *
 * - `"default"`: the frame's own border art, untouched by any border setting.
 * - `"light"` / `"dark"`: a user border color recolors the ring, because the
 *   layout ships a `border` mask (or `borderFull`, under `useFullBorder`).
 *   `"light"` when black text reads better on the chosen color (WCAG
 *   contrast), `"dark"` when white does.
 * - `"none"`: "No Border" is on and the layout ships a `noBorder` mask, so the
 *   ring is cut away and whatever sat on it now sits over the art.
 *
 * Only a layout with those masks ever leaves `"default"`, so a condition on
 * any other state never fires for a frame whose border cannot be recolored or
 * removed.
 */
export const BorderStateSchema = z.enum(["default", "light", "dark", "none"]);

export type BorderState = z.infer<typeof BorderStateSchema>;

/**
 * What must hold for one render for something conditional to apply: a text
 * box's `overrides`, a gradient or a tinted image. Every condition named must
 * hold; a condition left out matches anything.
 */
export const RenderConditionSchema = z.object({
  /** The border state to match; an array matches any of its states. */
  border: z
    .union([BorderStateSchema, z.array(BorderStateSchema).readonly()])
    .optional(),
  /**
   * Template settings that must hold, each compared with `===` against the
   * value in effect for the layout — frame- and layout-level settings
   * merged, defaults included. E.g. `{ useFullBorder: true }`.
   */
  settings: z
    .record(z.string(), z.union([z.boolean(), z.string(), z.number()]))
    .optional(),
  /**
   * The card's frame color — its background, the color its base frame is
   * picked by: `w`/`u`/`b`/`r`/`g` for one color, `m` for gold and
   * two-color hybrids, `a`, `c`, `l` or `v` for artifacts, colorless cards,
   * lands and vehicles. An array matches any of its colors.
   */
  frameColor: z
    .union([FrameColorEnum, z.array(FrameColorEnum).readonly()])
    .optional(),
});

export type RenderCondition = z.infer<typeof RenderConditionSchema>;
