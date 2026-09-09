import { z } from "zod";

import { AssetUrlSchema } from "./assetUrl.js";
import {
  FrameAssetsSchema,
  FrameColorEnum,
  LayoutMasksSchema,
} from "./frameAssets.js";
import { LayoutEnum } from "./layout.js";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const BoundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const TextBoxSchema = BoundsSchema.extend({
  fontSize: z.number(),
  color: z.string().optional(),
  outlineColor: z.string().optional(),
  outlineWidth: z.number().optional(),
  verticalAlign: z.enum(["top", "center"]).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  /** Per-box font family override. When set, the renderer uses this instead
   * of the language-resolved default (e.g. title font). */
  fontFamily: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  /** Whether mana-cost symbols in this box get a drop-shadow. Defaults to
   * true when omitted (matches the original behavior). Set to false to
   * disable the shadow (e.g. flipside mana-cost badges on light backgrounds). */
  shadow: z.boolean().optional(),
});

export type TextBox = z.infer<typeof TextBoxSchema>;

export const CardBoxesSchema = z.object({
  art: BoundsSchema,
  mana: TextBoxSchema,
  title: TextBoxSchema,
  type: TextBoxSchema,
  setSymbol: BoundsSchema,
  rules: TextBoxSchema.optional(),
  abilities: TextBoxSchema.optional(),
  pt: TextBoxSchema.optional(),
  ptImage: z.object({ x: z.number(), y: z.number() }).optional(),
  collectorInfo: TextBoxSchema.optional(),
  startingLoyalty: TextBoxSchema.optional(),
  nicknameTitle: TextBoxSchema.optional(),
  keyword: TextBoxSchema.optional(),
  flipsidePt: TextBoxSchema.optional(),
  // Modal DFC cards show the other face's type line and mana cost in small
  // badges near the bottom of the rules area so the reader knows what the
  // back plays like without flipping. The badge art itself is resolved from
  // `frameAssets.flipside` (a per-color ColorSet) using the *other* face's
  // frame color — see `borderless/mdfc/config.ts`.
  flipsideType: TextBoxSchema.optional(),
  flipsideManaCost: TextBoxSchema.optional(),
  // The other face's oracle text (last paragraph, flavor stripped), shown
  // when the other face is a land — lands have no mana cost, so the
  // flipsideManaCost badge is empty and the rules text fills that space.
  flipsideRules: TextBoxSchema.optional(),
});

export type CardBoxes = z.infer<typeof CardBoxesSchema>;

/**
 * Configuration for planeswalker ability rendering.
 * Frame templates provide this via LayoutConfig.planeswalkerConfig.
 */
export const PlaneswalkerRenderConfigSchema = z.object({
  /** Spacing between abilities (normalized 0-1) */
  abilitySpacing: z.number(),
  /** Height of the separator image (normalized 0-1) */
  separatorHeight: z.number(),
  /** Left padding for loyalty ability text in pixels (clears the badge) */
  textPaddingX: z.number(),
  /** Left padding for static ability text in pixels (no badge, so smaller) */
  staticTextPaddingX: z.number(),
  /** Right padding for all ability text in pixels */
  textPaddingRight: z.number().optional(),
  /** Top padding before the first ability in pixels (background still fills from box top) */
  topPadding: z.number().optional(),
  /** Bottom padding after the last ability in pixels (background still fills to box bottom) */
  bottomPadding: z.number().optional(),
  /**
   * Fraction of the available height at which the shrink loop starts
   * shrinking the font. 1.0 = only shrink when text literally doesn't fit.
   * Set lower (e.g. 0.85) to shrink sooner when abilities have more text,
   * giving more breathing room between bands. Defaults to 1.0.
   */
  textFillThreshold: z.number().optional(),
});

export type PlaneswalkerRenderConfig = z.infer<
  typeof PlaneswalkerRenderConfigSchema
>;

/**
 * Default planeswalker render config values, used when a frame template
 * does not provide its own.
 */
export const defaultPlaneswalkerConfig: PlaneswalkerRenderConfig = {
  abilitySpacing: 0.005,
  separatorHeight: 0,
  textPaddingX: 150,
  staticTextPaddingX: 50,
  textPaddingRight: 10,
  topPadding: 0,
  bottomPadding: 0,
};

/**
 * Configuration for saga ability rendering.
 * Frame templates provide this via LayoutConfig.sagaConfig.
 */
export const SagaRenderConfigSchema = z.object({
  /** Spacing between abilities (normalized 0-1) */
  abilitySpacing: z.number(),
  /** Height of the divider image (normalized 0-1) */
  dividerHeight: z.number(),
  /** Left padding for ability text in pixels (after badges) */
  textPaddingX: z.number(),
  /** Width of the badge area */
  badgeWidth: z.number(),
  /** Skip rendering reminder text and start abilities at top of the abilities box */
  skipReminder: z.boolean().optional(),
  /** Horizontal offset applied to badge X position in pixels */
  badgeOffsetX: z.number().optional(),
});

export type SagaRenderConfig = z.infer<typeof SagaRenderConfigSchema>;

/**
 * Default saga render config values.
 */
export const defaultSagaConfig: SagaRenderConfig = {
  abilitySpacing: 0.01,
  dividerHeight: 0.015,
  textPaddingX: 220,
  badgeWidth: 180,
};

const CrownRenderConfigSchema = z.object({
  x: z.number(),
  y: z.number(),
  nicknameCrownX: z.number().optional(),
  nicknameCrownY: z.number().optional(),
  /** Absolute canvas position of the nyx crown insert. When omitted, the
   * insert is centered horizontally on the crown and placed 2px below the
   * crown's top edge (matching the original m15 placement). */
  nyxInsertX: z.number().optional(),
  nyxInsertY: z.number().optional(),
  /** Override used in place of `nyxInsertY` when the card has a nickname
   * (the nickname crown sits at a different height, so the insert shifts). */
  nyxInsertNicknameY: z.number().optional(),
});

export type CrownRenderConfig = z.infer<typeof CrownRenderConfigSchema>;

export const defaultCrownConfig: CrownRenderConfig = {
  x: 192,
  y: 220,
};

const NicknameRenderConfigSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type NicknameRenderConfig = z.infer<typeof NicknameRenderConfigSchema>;

export const defaultNicknameConfig: NicknameRenderConfig = {
  x: 378,
  y: 577,
};

export const TemplateSettingConfigSchema = z.union([
  z.object({
    type: z.literal("boolean"),
    label: z.string(),
    defaultValue: z.boolean(),
  }),
  z.object({
    type: z.literal("string"),
    label: z.string(),
    defaultValue: z.string(),
  }),
  z.object({
    type: z.literal("number"),
    label: z.string(),
    defaultValue: z.string(),
  }),
  z.object({
    type: z.literal("select"),
    label: z.string(),
    defaultValue: z.string(),
    options: z.array(z.string()),
  }),
]);

export type TemplateSettingConfig = z.infer<typeof TemplateSettingConfigSchema>;

export const TemplateSettingsConfigSchema = z.record(
  z.string(),
  TemplateSettingConfigSchema,
);

export type TemplateSettingsConfig = Record<string, TemplateSettingConfig>;

export const LayoutConfigSchema = z.object({
  boxes: CardBoxesSchema,
  tallBoxes: CardBoxesSchema.optional(),
  /** Boxes for 2-ability planeswalkers (overrides `boxes` when set). */
  twoAbilityBoxes: CardBoxesSchema.optional(),
  frameAssets: FrameAssetsSchema,
  masks: LayoutMasksSchema.optional(),
  planeswalkerConfig: PlaneswalkerRenderConfigSchema.optional(),
  sagaConfig: SagaRenderConfigSchema.optional(),
  crownConfig: CrownRenderConfigSchema.optional(),
  nicknameConfig: NicknameRenderConfigSchema.optional(),
  templateSettings: TemplateSettingsConfigSchema.optional(),
  /** Per-color art box overrides (e.g. colorless planeswalkers need different art bounds). */
  colorArtOverrides: z.partialRecord(FrameColorEnum, BoundsSchema).optional(),
  /**
  /**
   * Which mask the two-color-hybrid colorless title/type wash overlay uses.
   * Defaults to "titleAndType" (recolors both the name and type boxes). Set
   * to "title" for templates (e.g. Borderless) whose type box shouldn't get
   * the colorless hybrid wash.
   */
  hybridTitleMask: z.enum(["title", "titleAndType"]).optional(),
  /**
   * Frame assets for the back face of double-faced cards (transform, modal
   * DFC). When present, the renderer swaps to these for `faceIndex === 1`.
   * Omitted for single-faced layouts.
   */
  backFrameAssets: FrameAssetsSchema.optional(),
  /** Section masks for the back face of double-faced cards. */
  backMasks: LayoutMasksSchema.optional(),
  /** Text box positions for the back face of double-faced cards. */
  backBoxes: CardBoxesSchema.optional(),
  /**
   * Boxes to use instead of `boxes`/`backBoxes` (or their saga-front/back
   * counterparts below) when the textless creature frame is in play — it
   * repositions the type/setSymbol/pt boxes. See `renderCardToCanvas.ts`.
   */
  creatureBoxes: CardBoxesSchema.optional(),
  backCreatureBoxes: CardBoxesSchema.optional(),
  /**
   * Masks to use instead of `masks`/`backMasks` (or their saga-front/back
   * counterparts below) when the textless creature frame is in play — its
   * baked-in PT plate changes the frame art's contours, so pinlines/border/
   * title masks shaped for the plain textless frame don't line up. See
   * `renderCardToCanvas.ts`.
   */
  creatureMasks: LayoutMasksSchema.optional(),
  backCreatureMasks: LayoutMasksSchema.optional(),
  /**
   * Boxes to use instead of `boxes` when the flipside PT box is present and
   * will actually render (the other face has power/toughness) — e.g. gives a
   * transforming Saga's abilities box a bit more clearance above it.
   */
  flipsidePtBoxes: CardBoxesSchema.optional(),
  /**
   * Saga-shaped boxes/assets/masks for a transform DFC's Saga face, keyed by
   * which physical side (front/back) that face happens to print on for a
   * given card — e.g. Fable of the Mirror-Breaker has its Saga on the front,
   * Clive, Ifrit's Dominant // Ifrit, Warden of Inferno has it on the back.
   * `boxes`/`frameAssets`/`masks` and `backBoxes`/`backFrameAssets`/`backMasks`
   * above always describe the OTHER (plain permanent) face for these layouts.
   * The renderer picks between these four sets per-face using `faceIndex`
   * plus whether that face's own (flattened) type line contains "Saga" —
   * see `renderCardToCanvas.ts`.
   */
  sagaFrontBoxes: CardBoxesSchema.optional(),
  sagaFrontFrameAssets: FrameAssetsSchema.optional(),
  sagaFrontMasks: LayoutMasksSchema.optional(),
  sagaFrontCreatureBoxes: CardBoxesSchema.optional(),
  sagaFrontCreatureMasks: LayoutMasksSchema.optional(),
  sagaBackBoxes: CardBoxesSchema.optional(),
  sagaBackFrameAssets: FrameAssetsSchema.optional(),
  sagaBackMasks: LayoutMasksSchema.optional(),
  sagaBackCreatureBoxes: CardBoxesSchema.optional(),
  sagaBackCreatureMasks: LayoutMasksSchema.optional(),
  /**
   * Frame assets for the *second* frame in a composited front face — used by
   * transforming MDFC cards (e.g. King T'Challa) whose front face is built
   * from the MDFC front frame's top half composited with the transform front
   * frame's bottom half. Only the front face (faceIndex 0) composites; the
   * back face renders normally from `backFrameAssets`. See
   * `drawCardToStage.ts`.
   */
  compositeFrameAssets: FrameAssetsSchema.optional(),
  /** Masks for the second frame in a composited front face (must ship
   * `bottomHalf`). See `compositeFrameAssets` above. */
  compositeMasks: LayoutMasksSchema.optional(),
});

export type LayoutConfig = z.infer<typeof LayoutConfigSchema>;

/**
 * The canvas a frame's boxes are measured against when it declares none.
 *
 * The full printed sheet including bleed — 2.72 x 3.7 in at 1200 DPI, or
 * 69.09 x 93.98 mm. The card face inside it is 63 x 88 mm, leaving roughly 3 mm
 * of bleed per edge.
 */
export const DEFAULT_CANVAS_WIDTH = 3264;
export const DEFAULT_CANVAS_HEIGHT = 4440;

export const TemplateConfigSchema = z.object({
  /**
   * Native pixel size this frame's box coordinates are authored in.
   *
   * Defaults to 3264 x 4440 when omitted: the full printed sheet *including*
   * bleed, 2.72 x 3.7 in (69.09 x 93.98 mm) at 1200 DPI. The card face inside
   * it is 63 x 88 mm, leaving roughly 3 mm of bleed on every edge — so box
   * coordinates are relative to the sheet, not to the card.
   */
  canvas: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional(),
  layouts: z.partialRecord(LayoutEnum, LayoutConfigSchema),
  // Alternate per-layout configs used instead of `layouts` when a non-default
  // frame variant is selected. Each key is a variant name (e.g. "textless",
  // "short") whose value is a map of layout → full `LayoutConfig`, the same
  // shape as `layouts`. Kept separate from `layouts` so UI that enumerates
  // supported card layouts (e.g. FrameSelection) isn't polluted with these
  // opt-in variants — each entry is a full `LayoutConfig` for a layout that
  // already exists in `layouts`, the same way `saga_creature` is a full
  // standalone config. The active variant is chosen by the `frameVariant`
  // template setting; see `getLayoutConfig`.
  alternateLayouts: z
    .record(z.string(), z.partialRecord(LayoutEnum, LayoutConfigSchema))
    .optional(),
  disabledFields: z.array(z.enum(["setSymbol", "collectorInfo"])).optional(),
});

export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;

export const FrameSchema = z.object({
  name: z.string(),
  description: z.string(),
  previewImage: AssetUrlSchema,
  tags: z.array(z.string()),
  disabled: z.boolean().optional(),
  templateSettings: TemplateSettingsConfigSchema.optional(),
  config: TemplateConfigSchema,
});

export type Frame = z.infer<typeof FrameSchema>;

/** Whether a frame exposes any template settings (frame-level or per-layout). */
export function frameHasTemplateSettings(frame: Frame): boolean {
  const frameLevel = Boolean(
    frame.templateSettings && Object.keys(frame.templateSettings).length > 0,
  );
  const layoutLevel = Object.values(frame.config.layouts).some((l) =>
    Boolean(l.templateSettings),
  );
  return frameLevel || layoutLevel;
}
