import {
  type CardShape,
  familyFor,
  frameDetailsFor,
  selectFrameLayers,
} from "@cardanvil/frame-kit/layout";

/** The five frame colours a card's identity is picked from. */
export type FrameColor = "w" | "u" | "b" | "r" | "g";

export const DEFAULT_SHAPE: CardShape = { colors: ["w"] };

/**
 * A one-line account of what the current shape selects.
 *
 * Frame selection has enough special cases that "white artifact vehicle" and
 * the art it actually picks are not obviously the same thing; saying so out
 * loud is what makes the panel a teaching tool rather than a guessing game.
 */
export function describeSelection(
  shape: CardShape,
  useNyxBorder: boolean,
): string {
  const family = familyFor(shape, useNyxBorder);
  const details = frameDetailsFor(shape);
  const layers = selectFrameLayers(details, { family });
  const base = `${layers.baseFrame.family}/${layers.baseFrame.color}`;
  const overlays = layers.overlays ?? [];

  const sections =
    overlays.length === 0
      ? "no section overlays"
      : `${String(overlays.length)} overlay${overlays.length === 1 ? "" : "s"}: ` +
        [...new Set(overlays.map((overlay) => overlay.mask))].join(", ");

  return `base ${base} · ${sections}`;
}
