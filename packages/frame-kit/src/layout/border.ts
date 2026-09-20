import type { BorderState } from "../schema/frame.js";
import type { LayoutMasks } from "../schema/frameAssets.js";
import { getReadableTextColor, parseNormalizedCssColor } from "./color.js";

/**
 * The mask a border color recolors the ring through: `borderFull` when
 * "Color Entire Border" is on and the layout ships one, else the plain
 * `border`. Undefined when the layout has no ring mask, so no border color
 * can reach it.
 */
export function ringMaskFor(
  masks: LayoutMasks | undefined,
  useFullBorder: boolean,
): string | undefined {
  return useFullBorder && masks?.borderFull ? masks.borderFull : masks?.border;
}

export interface BorderStateInput {
  /** The border color setting, when one is picked. */
  borderColor: string | null;
  /** The mask set the face is drawn with. */
  masks: LayoutMasks | undefined;
  useNoBorder: boolean;
  useFullBorder: boolean;
}

/**
 * The border as it is about to be drawn, which text boxes' `overrides` match
 * on (see `BorderStateSchema`).
 *
 * Only what the masks actually do counts: "No Border" without a `noBorder`
 * mask cuts nothing away, and a border color without a ring mask recolors
 * nothing — so a frame that cannot change its border always reads
 * `"default"`.
 */
export function borderStateFor({
  borderColor,
  masks,
  useNoBorder,
  useFullBorder,
}: BorderStateInput): BorderState {
  if (useNoBorder && masks?.noBorder) {
    return "none";
  }
  const rgb =
    borderColor && ringMaskFor(masks, useFullBorder)
      ? parseNormalizedCssColor(borderColor)
      : undefined;
  if (!rgb) {
    return "default";
  }
  return getReadableTextColor(rgb) === "black" ? "light" : "dark";
}
