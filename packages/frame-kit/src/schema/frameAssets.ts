import { z } from "zod";

import { AssetUrlSchema } from "./assetUrl.js";

/**
 * Canonical frame color codes: WUBRG, gold (m), artifact (a), colorless (c),
 * land (l), vehicle (v). Land is always the lowercase "l" — some legacy configs
 * also shipped an uppercase "L" alias pointing at the same art, but the nested
 * configs standardize on "l".
 */
export const FRAME_COLORS = [
  "w",
  "u",
  "b",
  "r",
  "g",
  "m",
  "a",
  "c",
  "l",
  "v",
] as const;
export const FrameColorEnum = z.enum(FRAME_COLORS);
export type FrameColor = z.infer<typeof FrameColorEnum>;

/** Image URLs keyed by frame color. Every frame family is a (partial) color set. */
export const ColorSetSchema = z.partialRecord(FrameColorEnum, AssetUrlSchema);
export type ColorSet = z.infer<typeof ColorSetSchema>;

/**
 * Scryfall `frame_effects` values that name a specific transform-DFC icon
 * variant (mirrors `ScryfallFrameEffect`'s `*Dfc` members, plus `fandfc`).
 */
export const DFC_ICON_EFFECTS = [
  "convertdfc",
  "sunmoondfc",
  "compasslanddfc",
  "originpwdfc",
  "mooneldrazidfc",
  "waxingandwaningmoondfc",
  "fandfc",
  "upsidedowndfc",
] as const;
export const DfcIconEffectEnum = z.enum(DFC_ICON_EFFECTS);
export type DfcIconEffect = z.infer<typeof DfcIconEffectEnum>;

/** DFC icon image URLs keyed by which `frame_effects` variant they render. */
export const DfcIconSetSchema = z.partialRecord(
  DfcIconEffectEnum,
  AssetUrlSchema,
);
export type DfcIconSet = z.infer<typeof DfcIconSetSchema>;

/**
 * Base frames additionally allow "c2" — the hybrid title/type wash used by the
 * two-color hybrid split rendering. "c2" only ever exists in the base family.
 */
export const BASE_COLORS = [...FRAME_COLORS, "c2"] as const;
export const BaseColorEnum = z.enum(BASE_COLORS);
export type BaseColor = z.infer<typeof BaseColorEnum>;
export const BaseColorSetSchema = z.partialRecord(
  BaseColorEnum,
  AssetUrlSchema,
);
export type BaseColorSet = z.infer<typeof BaseColorSetSchema>;

/** Legendary-crown asset sets, grouped by variant. */
export const CrownAssetsSchema = z.object({
  base: ColorSetSchema.optional(),
  ub: ColorSetSchema.optional(),
  nickname: ColorSetSchema.optional(),
  nicknameUb: ColorSetSchema.optional(),
  nyxInsert: ColorSetSchema.optional(),
  nyxInsertUb: ColorSetSchema.optional(),
});
export type CrownAssets = z.infer<typeof CrownAssetsSchema>;

/** Mask pair keyed by frame size (regular = 3-ability, tall = 4-ability). */
const PlaneswalkerMasksSchema = z.object({
  regular: AssetUrlSchema.optional(),
  tall: AssetUrlSchema.optional(),
});

/** Planeswalker ability-icon assets. */
export const PlaneswalkerAssetConfigSchema = z.object({
  plus: AssetUrlSchema,
  minus: AssetUrlSchema,
  zero: AssetUrlSchema,
  separator: AssetUrlSchema,
  startingLoyalty: AssetUrlSchema,
  /** Ability box masks. */
  masks: PlaneswalkerMasksSchema.optional(),
  /** Colorless-frame overlay masks (nickname banner cutout). */
  colorlessNicknameMasks: PlaneswalkerMasksSchema.optional(),
});
export type PlaneswalkerAssetConfig = z.infer<
  typeof PlaneswalkerAssetConfigSchema
>;

const BannerMasksSchema = z.object({
  right: AssetUrlSchema,
  stripe: AssetUrlSchema,
});

/**
 * Saga ability badge/divider + per-color chapter banners. Read-ahead cards use
 * the `bannerTransform`/`bannerTransformMasks` variants. Banner masks live here
 * (not in `masks`) because they are per-banner-variant art wired straight into
 * the saga node, never resolved through the layout-mask path.
 */
export const SagaAssetConfigSchema = z.object({
  badge: AssetUrlSchema,
  divider: AssetUrlSchema,
  banner: ColorSetSchema.optional(),
  bannerTransform: ColorSetSchema.optional(),
  bannerMasks: BannerMasksSchema.optional(),
  bannerTransformMasks: BannerMasksSchema.optional(),
  bannerReadAheadMasks: BannerMasksSchema.optional(),
});
export type SagaAssetConfig = z.infer<typeof SagaAssetConfigSchema>;

/** The full frame-asset tree for a layout. */
export const FrameAssetsSchema = z.object({
  base: BaseColorSetSchema,
  /** Planeswalker 4+-ability ("tall") variants of the base color frames. */
  tall: ColorSetSchema.optional(),
  land: ColorSetSchema.optional(),
  nyx: ColorSetSchema.optional(),
  /**
   * Textless creature variant of the base frames — has a baked-in PT plate
   * notch, used instead of `base` when the card has power/toughness (see
   * `renderCardToCanvas`).
   */
  creature: ColorSetSchema.optional(),
  pt: ColorSetSchema.optional(),
  crown: CrownAssetsSchema.optional(),
  nickname: ColorSetSchema.optional(),
  /** Token name-plate banner, drawn over the frame in place of the normal title. */
  tokenTitle: ColorSetSchema.optional(),
  /** Crown black backing strip. */
  black: AssetUrlSchema.optional(),
  planeswalker: PlaneswalkerAssetConfigSchema.optional(),
  saga: SagaAssetConfigSchema.optional(),
  /** Extended-art overlay drawn on top of the masked frame. */
  extendedOverlay: AssetUrlSchema.optional(),
  /**
   * Legacy single DFC icon overlaid on the crown of transform cards. Superseded
   * by `dfcIconSet` (resolved from the card's actual `frame_effects`); kept as
   * a fallback for any layout that hasn't shipped the full icon set.
   */
  dfcIcon: AssetUrlSchema.optional(),
  /**
   * Transform DFC icons keyed by `frame_effects` variant (e.g. "sunmoondfc",
   * "convertdfc") — the icon actually drawn is whichever variant the card's
   * own `frame_effects` names, so every transform card gets its correct mark
   * (not just legendary ones, and not always the "convertdfc" mark).
   */
  dfcIconSet: DfcIconSetSchema.optional(),
  /**
   * Per-color DFC icons (modal DFC) — keyed by the *other* face's frame color,
   * so the front face shows the back's indicator and vice versa. Used instead
   * of the single `dfcIcon` image when the layout ships per-color icons.
   */
  dfcIconColorSet: ColorSetSchema.optional(),
  /**
   * Modal DFC "flipside" badges — small per-color badge art drawn in the
   * bottom corner of the rules area showing the *other* face's frame color.
   * The front face uses the badge for the back face's color, and vice versa.
   * Keyed by frame color (w/u/b/r/g/m/a/c/l).
   */
  flipside: ColorSetSchema.optional(),
  /**
   * Crown icon drawn on Lesson cards (rendered as a Transform front face —
   * see `getCardLayout`) in place of the usual `dfcIconSet`/`dfcIcon` mark.
   */
  lessonIcon: AssetUrlSchema.optional(),
});
export type FrameAssets = z.infer<typeof FrameAssetsSchema>;

/**
 * Section masks the renderer actually reads. `rightHalf` overrides the global
 * default (`globalMasks.rightHalf`) when a layout ships its own. The legacy
 * `frame`/`border` mask keys are intentionally absent — nothing reads them.
 */
export const LayoutMasksSchema = z.object({
  pinlines: AssetUrlSchema.optional(),
  titleAndType: AssetUrlSchema.optional(),
  rules: AssetUrlSchema.optional(),
  noBorder: AssetUrlSchema.optional(),
  legendary: AssetUrlSchema.optional(),
  /** Legendary crown mask variant for transforming MDFC front faces — the
   * composited top-half frame uses a different legendary crown cutout than
   * the regular MDFC legendary mask. See `drawCardToStage.ts`. */
  legendaryTransform: AssetUrlSchema.optional(),
  /** No-border mask variant for transforming MDFC front faces — the
   * composited top-half frame uses a different no-border cutout than the
   * regular MDFC no-border mask. See `drawCardToStage.ts`. */
  noBorderTransform: AssetUrlSchema.optional(),
  rightHalf: AssetUrlSchema.optional(),
  title: AssetUrlSchema.optional(),
  type: AssetUrlSchema.optional(),
  keyword: AssetUrlSchema.optional(),
  /** Extended-art cutout mask applied to the combined frame. */
  extended: AssetUrlSchema.optional(),
  /**
   * Half-frame cutouts for compositing two faces into one frame: the front
   * face's frame is trimmed to its top half and composited with the back
   * face's frame trimmed to its bottom half, so a single-face layout reads
   * as one frame built from both faces. See `getCardLayout` and
   * `drawCardToStage`.
   */
  topHalf: AssetUrlSchema.optional(),
  bottomHalf: AssetUrlSchema.optional(),
});
export type LayoutMasks = z.infer<typeof LayoutMasksSchema>;

/** Mask names an overlay may reference. `rightHalf` falls back to globalMasks. */
export type OverlayMaskName =
  "pinlines" | "titleAndType" | "rules" | "rightHalf" | "title" | "type";

/**
 * A structured reference to one frame image. "c2" is valid only in the base
 * family; land/nyx/tall families use plain frame colors.
 */
export type FrameRef =
  | { family: "base"; color: FrameColor | "c2" }
  | { family: "land" | "nyx" | "tall" | "creature"; color: FrameColor };
