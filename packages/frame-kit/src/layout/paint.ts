import type { RenderCondition } from "../schema/condition.js";
import type { CardBoxes, LayoutConfig } from "../schema/frame.js";
import type { FrameColor } from "../schema/frameAssets.js";
import type {
  CardColors,
  Gradient,
  OpacityStop,
  TintedImage,
} from "../schema/paint.js";
import { type OverrideState, overrideMatches } from "./boxOverrides.js";
import { type RgbColor, parseNormalizedCssColor } from "./color.js";
import {
  COLOR_LETTERS,
  type FrameDetails,
  LAYERS,
  colorToken,
  printedColorOrder,
} from "./frameLayers.js";

/** Whether `value` is two or three distinct mana colors, e.g. `UW`. */
function isColorCombo(value: string): boolean {
  return (
    (value.length === 2 || value.length === 3) &&
    new Set(value).size === value.length &&
    Array.from(value).every((letter) => COLOR_LETTERS.has(letter))
  );
}

/**
 * The colors a card paints side by side, at most `maxParts` of them; see
 * `CardColorsSchema`. Read from the pinlines, as Proxyshop's frames do, with
 * one difference: a three-color card's pinlines are gold, so its three come
 * from its identity.
 */
export function cardColorParts(
  details: FrameDetails,
  maxParts = 1,
): FrameColor[] {
  const combo = isColorCombo(details.pinlines)
    ? details.pinlines
    : details.pinlines === LAYERS.GOLD &&
        details.identity.length === 3 &&
        isColorCombo(details.identity)
      ? details.identity
      : undefined;
  if (combo === undefined) {
    return [colorToken(details.pinlines)];
  }
  if (combo.length > maxParts) {
    return ["m"];
  }
  return Array.from(printedColorOrder(combo), (letter) => colorToken(letter));
}

/** The palette's color for each of the card's parts, or none if any is missing. */
function paletteColors(colors: CardColors, details: FrameDetails): string[] {
  const hexes = cardColorParts(details, colors.maxParts).map(
    (part) => colors.palette[part],
  );
  return hexes.every((hex): hex is string => hex !== undefined) ? hexes : [];
}

function rgbOf(hex: string): RgbColor {
  return parseNormalizedCssColor(hex) ?? { r: 0, g: 0, b: 0 };
}

/** A gradient stop as a canvas takes it: a position, and a CSS color. */
export interface PaintStop {
  readonly at: number;
  readonly color: string;
}

/** Linear interpolation over stops sorted by `at`, held flat past either end. */
function interpolate<T>(
  stops: readonly { at: number; value: T }[],
  at: number,
  mix: (a: T, b: T, t: number) => T,
): T {
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) {
    throw new Error("interpolate: no stops");
  }
  if (at <= first.at) {
    return first.value;
  }
  for (let i = 1; i < stops.length; i++) {
    const before = stops[i - 1];
    const after = stops[i];
    if (before && after && at <= after.at) {
      const span = after.at - before.at;
      return mix(
        before.value,
        after.value,
        span > 0 ? (at - before.at) / span : 1,
      );
    }
  }
  return last.value;
}

const mixNumber = (a: number, b: number, t: number): number => a + (b - a) * t;

const mixRgb = (a: RgbColor, b: RgbColor, t: number): RgbColor => ({
  r: mixNumber(a.r, b.r, t),
  g: mixNumber(a.g, b.g, t),
  b: mixNumber(a.b, b.b, t),
});

/**
 * Where each color runs along a gradient split into equal parts, as color
 * stops: flat across its part, blending into the next over `blend` (0–1 of
 * the length) centered on where they meet.
 */
function partColorStops(
  colors: readonly RgbColor[],
  blend: number,
): { at: number; value: RgbColor }[] {
  const half = Math.min(blend, 1 / colors.length) / 2;
  return colors.flatMap((value, i) => {
    const start = i / colors.length + (i > 0 ? half : 0);
    const end = (i + 1) / colors.length - (i < colors.length - 1 ? half : 0);
    return [
      { at: start, value },
      { at: end, value },
    ];
  });
}

const round = (value: number, places: number): number =>
  Number(value.toFixed(places));

/**
 * A gradient's stops for one card, color and opacity merged into one list a
 * canvas can draw — a stop wherever either changes — or `undefined` when it
 * paints nothing (its palette has no color for the card).
 */
export function gradientStops(
  gradient: Gradient,
  details: FrameDetails,
): PaintStop[] | undefined {
  const hexes =
    typeof gradient.color === "string"
      ? [gradient.color]
      : paletteColors(gradient.color, details);
  if (hexes.length === 0) {
    return undefined;
  }
  const length =
    gradient.direction === "horizontal" ? gradient.width : gradient.height;
  const blend =
    typeof gradient.color === "string" || length <= 0
      ? 0
      : (gradient.color.blend ?? 0) / length;
  const colorStops = partColorStops(hexes.map(rgbOf), blend);
  const opacityStops = [...gradient.opacity]
    .sort((a: OpacityStop, b: OpacityStop) => a.at - b.at)
    .map(({ at, opacity }) => ({ at, value: opacity }));

  const positions = [
    ...new Set([...colorStops, ...opacityStops].map(({ at }) => at)),
  ].sort((a, b) => a - b);
  return positions.map((at) => {
    const { r, g, b } = interpolate(colorStops, at, mixRgb);
    const opacity = interpolate(opacityStops, at, mixNumber);
    const channels = [Math.round(r), Math.round(g), Math.round(b)];
    return {
      at,
      color: `rgba(${channels.join(", ")}, ${String(round(opacity, 4))})`,
    };
  });
}

/**
 * How far down from its own `y` a gradient is painted for a card drawn with
 * `boxes`, which a `rulesSlide` has moved `slideOffset`: its anchor box's top
 * if it has one, otherwise `slideOffset` if it `slides`, else 0.
 */
export function gradientOffsetY(
  gradient: Gradient,
  boxes: CardBoxes,
  slideOffset: number,
): number {
  if (gradient.anchor) {
    return boxes[gradient.anchor].y;
  }
  return gradient.slides === true ? slideOffset : 0;
}

/**
 * A layout as one render paints it: only the gradients and tinted images
 * whose `when` holds for `state`. Everything else passes through untouched.
 */
export function paintedFor<
  Config extends Pick<LayoutConfig, "gradients" | "tintedImages">,
>(config: Config, state: OverrideState): Config {
  const holds = ({ when }: { when?: RenderCondition | undefined }) =>
    when === undefined || overrideMatches(when, state);
  return {
    ...config,
    ...(config.gradients && { gradients: config.gradients.filter(holds) }),
    ...(config.tintedImages && {
      tintedImages: config.tintedImages.filter(holds),
    }),
  };
}

/** The color a tinted image is painted for one card, if its palette has one. */
export function tintColor(
  image: TintedImage,
  details: FrameDetails,
): string | undefined {
  if (typeof image.color === "string") {
    return image.color;
  }
  const hexes = paletteColors(image.color, details);
  return hexes[Math.min(image.color.part ?? 0, hexes.length - 1)];
}
