import type {
  BaseColor,
  FrameAssets,
  LayoutMasks,
} from "../schema/frameAssets.js";

export interface FrameCutoutInput {
  /** The mask set the face is drawn with. */
  masks: LayoutMasks | undefined;
  frameAssets: FrameAssets;
  useNoBorder: boolean;
  isLegendary: boolean;
  hasNickname: boolean;
  /** The base frame's color, after any fallback. */
  frameColor: BaseColor;
  /** The planeswalker 4+-ability ("tall") base frame is in use. */
  isTallFrame: boolean;
}

/**
 * The masks cut out of a face's combined frame — base art plus section
 * overlays — in the order the renderer applies them as `destination-in`, each
 * seeing the result of the one before:
 *
 * - `noBorder`, when "No Border" is on;
 * - `legendary`, on a legendary card;
 * - `extended`, whenever the layout ships it (the extended-art silhouette);
 * - the planeswalker colorless-nickname banner cutout, on a nicknamed
 *   colorless card.
 *
 * Crowns, nickname plates and PT boxes are drawn afterwards, over the result,
 * so none of these cut them.
 */
export function frameCutoutMasks(input: FrameCutoutInput): string[] {
  const {
    masks,
    frameAssets,
    useNoBorder,
    isLegendary,
    hasNickname,
    frameColor,
    isTallFrame,
  } = input;
  const nicknameMasks = frameAssets.planeswalker?.colorlessNicknameMasks;
  const colorlessNickname =
    frameColor === "c" && hasNickname
      ? isTallFrame
        ? nicknameMasks?.tall
        : nicknameMasks?.regular
      : undefined;
  return [
    useNoBorder ? masks?.noBorder : undefined,
    isLegendary ? masks?.legendary : undefined,
    masks?.extended,
    colorlessNickname,
  ].filter((url): url is string => Boolean(url));
}
