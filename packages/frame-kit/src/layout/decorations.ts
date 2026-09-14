import type { FrameAssets, FrameColor } from "../schema/frameAssets.js";
import { type FrameDetails, splitTwoColor } from "./frameLayers.js";

/**
 * The type-line facts the decoration colours turn on.
 *
 * A `CardShape` satisfies this structurally, and so does a card the app has
 * already read a type line from.
 */
export interface DecorationFacts {
  readonly isLand?: boolean;
  readonly isArtifact?: boolean;
  readonly isVehicle?: boolean;
}

/** One colour, or the two halves of a two-colour banner. */
export type BannerColors = FrameColor | [FrameColor, FrameColor];

/**
 * The colour a card's banners take.
 *
 * Driven by the resolved identity rather than the background, so a crown, a
 * nickname plate and a PT box on the same card always agree with each other
 * and with the pinlines.
 */
export function identityColors(
  details: FrameDetails,
  facts: DecorationFacts = {},
): BannerColors {
  const split = splitTwoColor(details.identity);
  if (split) {
    return split;
  }
  if (details.identity.length === 1) {
    return details.identity.toLowerCase() as FrameColor;
  }
  if (details.identity.length > 1) {
    return "m";
  }
  // No identity: a colourless artifact takes the artifact token so its crown
  // matches its artifact pinlines; anything else stays colourless.
  return facts.isArtifact === true ? "a" : "c";
}

/** Legendary crown colour(s). */
export function crownColors(
  details: FrameDetails,
  facts: DecorationFacts = {},
): BannerColors {
  return identityColors(details, facts);
}

/**
 * Nickname banner colour(s).
 *
 * A land with no resolved identity uses the dedicated land nickname art rather
 * than the colourless one.
 */
export function nicknameColors(
  details: FrameDetails,
  facts: DecorationFacts = {},
): BannerColors {
  if (facts.isLand === true && !details.identity) {
    return "l";
  }
  return identityColors(details, facts);
}

/**
 * PT box colour.
 *
 * Only a true two-colour hybrid takes the colourless box. A card built from
 * monocoloured-hybrid pips in three or more colours is an ordinary gold card
 * and must resolve by identity length instead.
 */
export function ptBoxColor(
  details: FrameDetails,
  facts: DecorationFacts = {},
): FrameColor {
  if (facts.isVehicle === true) {
    return "v"; // vehicles use the dedicated plate whatever their colour
  }
  if (details.isHybrid) {
    return "c";
  }
  if (details.identity.length === 1) {
    return details.identity.toLowerCase() as FrameColor;
  }
  if (details.identity.length > 1) {
    return "m";
  }
  return facts.isArtifact === true ? "a" : "c";
}

/** Combined crown + nickname banner; the UB variant falls back to the plain one. */
export function resolveCrownNicknameAsset(
  assets: FrameAssets,
  color: FrameColor,
  useUBCrowns: boolean,
): string | undefined {
  return (
    (useUBCrowns ? assets.crown?.nicknameUb?.[color] : undefined) ??
    assets.crown?.nickname?.[color]
  );
}

/**
 * Legendary crown art.
 *
 * A nicknamed card prefers the combined crown+nickname asset, and falls back
 * to the plain crown when a frame does not ship one.
 */
export function resolveCrownAsset(
  assets: FrameAssets,
  color: FrameColor,
  opts: { nickname: boolean; useUBCrowns: boolean },
): string | undefined {
  if (opts.nickname) {
    const combined = resolveCrownNicknameAsset(assets, color, opts.useUBCrowns);
    if (combined !== undefined) {
      return combined;
    }
  }
  return (
    (opts.useUBCrowns ? assets.crown?.ub?.[color] : undefined) ??
    assets.crown?.base?.[color]
  );
}

export function resolveNicknameAsset(
  assets: FrameAssets,
  color: FrameColor,
): string | undefined {
  return assets.nickname?.[color];
}

export function resolvePtBoxAsset(
  assets: FrameAssets,
  color: FrameColor,
): string | undefined {
  return assets.pt?.[color];
}

export function resolveNyxInsertAsset(
  assets: FrameAssets,
  color: FrameColor,
  useUBCrowns = false,
): string | undefined {
  return (
    (useUBCrowns ? assets.crown?.nyxInsertUb?.[color] : undefined) ??
    assets.crown?.nyxInsert?.[color]
  );
}

/** What a card is, for deciding which banners it gets. */
export interface DecorationCard {
  readonly isLegendary?: boolean;
  /** The nickname text; a card has a nickname when this is non-empty. */
  readonly nickname?: string;
  readonly power?: string;
  readonly toughness?: string;
}

export interface DecorationState {
  readonly crown: boolean;
  /** The bar behind the crown, drawn on the same condition. */
  readonly crownBlackBar: boolean;
  readonly nickname: boolean;
  readonly ptBox: boolean;
}

/**
 * Which banners a card draws.
 *
 * Mirrors the renderer's conditions: crowns are legendary-only, the nickname
 * plate needs nickname text, and the PT box needs *both* a power and a
 * toughness — a card with only one is not a creature and gets no plate.
 */
export function decorationsFor(card: DecorationCard): DecorationState {
  const legendary = card.isLegendary === true;
  return {
    crown: legendary,
    crownBlackBar: legendary,
    nickname: (card.nickname ?? "") !== "",
    ptBox: (card.power ?? "") !== "" && (card.toughness ?? "") !== "",
  };
}
