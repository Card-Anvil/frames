import { CardBoxes, LayoutConfig, TextBox } from "@cardanvil/frame-kit";
import type { LayoutMasks } from "@cardanvil/frame-kit";
import { omit } from "@cardanvil/frame-kit";

import * as textless from "../textless";
import * as textlessCreature from "../textless/creature";
import * as borderlessTextlessCreatureMasks from "../textless/creature/masks";
import * as borderlessTextlessMasks from "../textless/masks";
import * as base from "./base";
import * as crowns from "./crowns";
import * as crownsNickname from "./crowns/nickname";
import * as crownsNicknameUb from "./crowns/nickname/ub";
import * as crownNyxInsert from "./crowns/nyxInsert";
import * as crownNyxInsertUb from "./crowns/nyxInsert/ub";
import * as crownsUb from "./crowns/ub";
import * as land from "./land";
import * as borderlessRegularMasks from "./masks";
import * as nickname from "./nickname";
import * as pt from "./pt";
import * as shortBase from "./short";
import * as shortLand from "./short/land";
import * as borderlessShortMasks from "./short/masks";
import * as tokenTitle from "./tokenTitle";

// Text box boundaries for borderless normal layout (3264x4440 canvas).
// Exported (typed via `satisfies` rather than `: CardBoxes`) so sibling packs
// (transform, mdfc) can spread concretely-typed boxes off of it instead of
// redefining shared positions.
export const borderlessNormalBoxes = {
  art: {
    x: 0,
    y: 0,
    width: 3264,
    height: 3982,
  },
  mana: {
    x: 400,
    y: 373,
    width: 2505,
    height: 177,
    fontSize: 45,
  },
  title: {
    x: 400,
    y: 390,
    width: 2464,
    height: 172,
    fontSize: 120,
    color: "white",
  },
  type: {
    x: 400,
    y: 2532,
    width: 2500,
    height: 155,
    fontSize: 110,
    color: "white",
  },
  setSymbol: {
    x: 2501,
    y: 2511,
    width: 374,
    height: 170,
  },
  rules: {
    x: 400,
    y: 2780,
    width: 2470,
    height: 1160,
    fontSize: 110,
    color: "white",
  },
  pt: {
    x: 2450,
    y: 3823,
    width: 515,
    height: 265,
    fontSize: 120,
    color: "white",
  },
  ptImage: {
    x: 2432,
    y: 3818,
  },
  nicknameTitle: {
    x: 580,
    y: 604,
    width: 2106,
    height: 140,
    fontSize: 66,
    color: "white",
  },
} as const satisfies CardBoxes;

export const borderlessNormalLayoutConfig: LayoutConfig = {
  boxes: borderlessNormalBoxes,
  frameAssets: {
    base,
    land,
    pt,
    crown: {
      base: crowns,
      nyxInsert: crownNyxInsert,
      nyxInsertUb: crownNyxInsertUb,
      ub: crownsUb,
      nickname: crownsNickname,
      nicknameUb: crownsNicknameUb,
    },
    nickname,
    tokenTitle,
  },
  masks: borderlessRegularMasks,
  crownConfig: {
    x: 229,
    y: 219,
    nicknameCrownX: 229,
    nicknameCrownY: 219,
    nyxInsertY: 220,
    nyxInsertNicknameY: 222,
  },
  nicknameConfig: {
    x: 399,
    y: 586,
  },
  // Two-color hybrid cards: only wash the title box colorless, not the type box.
  hybridTitleMask: "title",
};

// Short variant of the borderless regular layout: swaps the base/land frame
// assets and section masks for the short-height versions and shifts the
// type/setSymbol/rules boxes down by 462px to match the shorter art area.
// Crowns, nickname banners, PT boxes, etc. are inherited unchanged.
// Spreads from `borderlessNormalBoxes` so only the repositioned text boxes need
// to be spelled out — shared positions stay in sync with the regular layout.
export const borderlessShortBoxes: CardBoxes = {
  ...borderlessNormalBoxes,
  type: {
    ...borderlessNormalBoxes.type,
    y: 2994,
  },
  setSymbol: {
    ...borderlessNormalBoxes.setSymbol,
    y: 2973,
  },
  rules: {
    ...borderlessNormalBoxes.rules,
    y: 3242,
    height: 698,
  },
};

export const borderlessShortLayoutConfig: LayoutConfig = {
  ...borderlessNormalLayoutConfig,
  boxes: borderlessShortBoxes,
  frameAssets: {
    ...borderlessNormalLayoutConfig.frameAssets,
    base: shortBase,
    land: shortLand,
  },
  masks: borderlessShortMasks,
};

// Token layout: spreads from the normal layout but centers the title and
// uses Beleren Small Caps. Tokens have no mana cost, so the title can sit
// centered rather than left-aligned. The width/x are inherited from the
// normal title box (which matches the token width).
export const borderlessTokenBoxes: CardBoxes = {
  ...borderlessNormalBoxes,
  title: {
    ...borderlessNormalBoxes.title,
    textAlign: "center",
    fontFamily: "Beleren Small Caps",
  },
};

export const borderlessTokenLayoutConfig: LayoutConfig = {
  ...borderlessNormalLayoutConfig,
  boxes: borderlessTokenBoxes,
};

export const borderlessTokenShortLayoutConfig: LayoutConfig = {
  ...borderlessShortLayoutConfig,
  boxes: {
    ...borderlessShortBoxes,
    title: borderlessTokenBoxes.title,
  },
};

// These are merged over a resolved layout's `boxes` when "Use Textless Frame"
// is enabled, so layout-specific boxes (e.g. saga `abilities`/`keyword`) are
// preserved while the standard text positions adopt the textless placements.
// Spreads from `borderlessNormalBoxes` so only the repositioned text boxes need
// to be spelled out — shared positions (art, mana, title, pt, nickname, etc.)
// stay in sync with the regular layout automatically.
export const textlessBoxes: CardBoxes = {
  ...borderlessNormalBoxes,
  type: {
    ...borderlessNormalBoxes.type,
    y: 3705,
  },
  setSymbol: {
    ...borderlessNormalBoxes.setSymbol,
    y: 3695,
  },
};

// Repositions the type/setSymbol/pt boxes for the textless creature frame's
// baked-in PT plate — see `renderCardToCanvas.ts`'s `isTextlessCreatureFrame`
// swap.
const textlessPtBox: TextBox | undefined = textlessBoxes.pt;
if (!textlessPtBox) {
  throw new Error("Textless layout is missing a pt box");
}

const textlessCreatureBoxOverrides: Pick<
  CardBoxes,
  "type" | "setSymbol" | "pt"
> = {
  type: {
    ...textlessBoxes.type,
    y: 3650,
  },
  setSymbol: {
    ...textlessBoxes.setSymbol,
    y: 3628,
  },
  pt: {
    ...textlessPtBox,
    y: 3838,
  },
};

/**
 * Builds a pack's "Use Textless Frame" variant: swaps the base + land color
 * frames and section masks for the textless assets and drops the rules/ability/
 * keyword text boxes (textless frames never render rules text), while preserving
 * everything else from the base layout — crowns, nickname banners, PT boxes,
 * saga ability badges, saga/crown/nickname render config, etc. Exported so other
 * borderless packs (e.g. saga) can build their own textless variant the same way.
 */
/** Strips rules-area-only boxes for the textless treatment (shared by
 * `boxes`, `backBoxes`, and the merged saga-transform `sagaFront`/`sagaBack`
 * variants below). */
function stripTextlessBoxes(boxes: CardBoxes): CardBoxes {
  // Transform/DFC layouts show the other face's power/toughness in a small
  // `flipsidePt` box inside the rules area; textless frames drop the rules
  // area, so the flipside PT has nowhere to sit and should be hidden.
  // Modal DFC layouts show the other face's type line and mana cost in
  // `flipsideType`/`flipsideManaCost` badges inside the rules area; those
  // are dropped along with the rules area on textless frames.
  // `textlessBoxes` only repositions `type`/`setSymbol` for the textless
  // frame — it spreads from `borderlessNormalBoxes`, which resets `title` to
  // x: 400. Configs that shift the title (MDFC, transform) need to keep
  // their shifted x in the textless variant, so preserve the original title
  // instead of letting `textlessBoxes.title` overwrite it.
  const stripped: CardBoxes = {
    ...boxes,
    ...textlessBoxes,
    title: boxes.title,
  };
  return omit(stripped, [
    "rules",
    "abilities",
    "keyword",
    "flipsidePt",
    "flipsideType",
    "flipsideManaCost",
    "flipsideRules",
  ]);
}

/** Applies `textlessCreatureBoxOverrides` and drops `ptImage` — the textless
 * creature frame has a baked-in PT plate, so the overlay image isn't needed. */
function buildCreatureBoxes(boxes: CardBoxes): CardBoxes {
  return omit({ ...boxes, ...textlessCreatureBoxOverrides }, ["ptImage"]);
}

/** Strips `rules` from a (possibly undefined) masks object — textless masks
 * intentionally omit `rules` (no rules area), so the stale base mask must not
 * leak through the merge. */
function stripRulesMask(masks: LayoutMasks | undefined): LayoutMasks {
  return masks ? omit(masks, ["rules"]) : {};
}

/** Strips masks that only apply to composited-frame layouts (topHalf,
 * bottomHalf, legendaryTransform, noBorderTransform) — textless frames never
 * composite two frame halves, so these must not leak through into the textless
 * masks. */
function stripCompositeMasks(masks: LayoutMasks | undefined): LayoutMasks {
  return masks
    ? omit(masks, [
        "topHalf",
        "bottomHalf",
        "legendaryTransform",
        "noBorderTransform",
      ])
    : {};
}

export function withTextlessOverrides(config: LayoutConfig): LayoutConfig {
  const assets = config.frameAssets;

  const result: LayoutConfig = {
    ...config,
    boxes: stripTextlessBoxes(config.boxes),
    frameAssets: {
      ...assets,
      base: { ...assets.base, ...textless },
      land: { ...assets.land, ...textless },
      creature: { ...assets.creature, ...textlessCreature },
    },
    // Textless masks intentionally omit `rules` (no rules area), so strip
    // the stale `rules` mask from the base config before merging — otherwise
    // it leaks through and emits a color overlay for a textbox region that
    // doesn't exist on textless frames. Composite-frame masks (topHalf,
    // bottomHalf, legendaryTransform, noBorderTransform) are also stripped
    // — textless frames never composite two frame halves.
    masks: {
      ...stripCompositeMasks(stripRulesMask(config.masks)),
      ...borderlessTextlessMasks,
    },
  };
  result.creatureBoxes = buildCreatureBoxes(result.boxes);
  // The creature frame's baked-in PT plate changes the frame art's contours,
  // so it needs its own pinlines/border/title/etc. masks rather than the
  // plain textless ones (which don't line up, especially on multicolor cards).
  result.creatureMasks = {
    ...stripCompositeMasks(stripRulesMask(config.masks)),
    ...borderlessTextlessCreatureMasks,
  };

  // Double-faced layouts (transform, modal DFC) carry back-face assets, masks,
  // and boxes that also need the textless treatment so the back face matches.
  if (config.backFrameAssets) {
    const backAssets = config.backFrameAssets;
    result.backFrameAssets = {
      ...backAssets,
      base: { ...backAssets.base, ...textless },
      land: { ...backAssets.land, ...textless },
      creature: { ...backAssets.creature, ...textlessCreature },
    };
  }
  if (config.backMasks) {
    result.backMasks = {
      ...stripCompositeMasks(stripRulesMask(config.backMasks)),
      ...borderlessTextlessMasks,
    };
    result.backCreatureMasks = {
      ...stripCompositeMasks(stripRulesMask(config.backMasks)),
      ...borderlessTextlessCreatureMasks,
    };
  }
  if (config.backBoxes) {
    result.backBoxes = stripTextlessBoxes(config.backBoxes);
    result.backCreatureBoxes = buildCreatureBoxes(result.backBoxes);
  }

  // Merged saga-transform layouts (`saga_transform`/`saga_transform_creature`)
  // carry a second Saga-shaped box/asset/mask pair per physical position —
  // process those the same way as the plain boxes/backBoxes above.
  if (config.sagaFrontFrameAssets) {
    const sagaFrontAssets = config.sagaFrontFrameAssets;
    result.sagaFrontFrameAssets = {
      ...sagaFrontAssets,
      base: { ...sagaFrontAssets.base, ...textless },
      land: { ...sagaFrontAssets.land, ...textless },
      creature: { ...sagaFrontAssets.creature, ...textlessCreature },
    };
  }
  if (config.sagaBackFrameAssets) {
    const sagaBackAssets = config.sagaBackFrameAssets;
    result.sagaBackFrameAssets = {
      ...sagaBackAssets,
      base: { ...sagaBackAssets.base, ...textless },
      land: { ...sagaBackAssets.land, ...textless },
      creature: { ...sagaBackAssets.creature, ...textlessCreature },
    };
  }
  if (config.sagaFrontMasks) {
    result.sagaFrontMasks = {
      ...stripRulesMask(config.sagaFrontMasks),
      ...borderlessTextlessMasks,
    };
    result.sagaFrontCreatureMasks = {
      ...stripRulesMask(config.sagaFrontMasks),
      ...borderlessTextlessCreatureMasks,
    };
  }
  if (config.sagaBackMasks) {
    result.sagaBackMasks = {
      ...stripRulesMask(config.sagaBackMasks),
      ...borderlessTextlessMasks,
    };
    result.sagaBackCreatureMasks = {
      ...stripRulesMask(config.sagaBackMasks),
      ...borderlessTextlessCreatureMasks,
    };
  }
  if (config.sagaFrontBoxes) {
    result.sagaFrontBoxes = stripTextlessBoxes(config.sagaFrontBoxes);
    result.sagaFrontCreatureBoxes = buildCreatureBoxes(result.sagaFrontBoxes);
  }
  if (config.sagaBackBoxes) {
    result.sagaBackBoxes = stripTextlessBoxes(config.sagaBackBoxes);
    result.sagaBackCreatureBoxes = buildCreatureBoxes(result.sagaBackBoxes);
  }

  // Textless frames drop the abilities box entirely, so there's nothing for
  // `flipsidePtBoxes` (a shorter abilities-box variant) to apply to. They also
  // drop the composited-frame fields — textless frames never composite two
  // frame halves (the rules area is gone, so the half-frame split has no
  // reason to apply).
  return omit(result, [
    "flipsidePtBoxes",
    "compositeFrameAssets",
    "compositeMasks",
  ]);
}

export const borderlessNormalTextlessLayoutConfig = withTextlessOverrides(
  borderlessNormalLayoutConfig,
);

// Textless variant of the token layout — spreads from the textless config so
// the textless art/masks/box overrides apply, then layers only the token's
// centered/widened title on top (not the full borderlessTokenBoxes, which
// would undo the textless stripping of rules/type/setSymbol positions).
// Both `boxes.title` and `creatureBoxes.title` are overridden so the token
// title style applies whether or not the card uses the creature frame swap.
export const borderlessTokenTextlessLayoutConfig: LayoutConfig = {
  ...borderlessNormalTextlessLayoutConfig,
  boxes: {
    ...borderlessNormalTextlessLayoutConfig.boxes,
    title: borderlessTokenBoxes.title,
  },
  creatureBoxes: borderlessNormalTextlessLayoutConfig.creatureBoxes
    ? {
        ...borderlessNormalTextlessLayoutConfig.creatureBoxes,
        title: borderlessTokenBoxes.title,
      }
    : borderlessNormalTextlessLayoutConfig.creatureBoxes,
};
