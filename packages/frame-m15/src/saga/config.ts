import { CardBoxes, LayoutConfig } from "@cardanvil/frame-kit";

import * as crowns from "../regular/crowns";
import * as crownNyxInsert from "../regular/crowns/nyxInsert";
import blackOverlay from "../regular/misc/black.png";
// Crowns + nicknames are shared with the regular layout.
import * as nickname from "../regular/nickname";
import * as abilities from "./abilities";
// Saga ability assets
import * as banner from "./abilities/banner";
import * as bannerMasks from "./abilities/banner/masks";
import * as bannerTransform from "./abilities/banner/transform";
import * as bannerTransformMasks from "./abilities/banner/transform/masks";
import * as bannerReadAheadMasks from "./abilities/banner/transform/masks/readAhead";
// Base + nyx frames from the saga folder (nyx used for enchantments).
import * as base from "./regular";
import * as masks from "./regular/masks";
import * as nyx from "./regular/nyx";

// Text box boundaries for saga layout (3264x4440 canvas)
const boxes: CardBoxes = {
  art: {
    x: 1620,
    y: 600,
    width: 1270,
    height: 3030,
  },
  mana: {
    x: 370,
    y: 373,
    width: 2538,
    height: 177,
    fontSize: 55,
  },
  title: {
    x: 390,
    y: 385,
    width: 2540,
    height: 172,
    fontSize: 120,
  },
  type: {
    x: 390,
    y: 3710,
    width: 2500,
    height: 144,
    fontSize: 110,
  },
  setSymbol: {
    x: 2590,
    y: 3705,
    width: 300,
    height: 144,
  },
  // Saga uses a large abilities area for text + badges + dividers (per user spec)
  // Note: The provided dimensions may need tuning to avoid overlap with type line
  abilities: {
    x: 390,
    y: 660,
    width: 1224,
    height: 2945,
    fontSize: 85,
  },

  // PT not typically used for sagas (enchantments), but kept for compatibility
  pt: {
    x: 2650,
    y: 4050,
    width: 350,
    height: 200,
    fontSize: 160,
  },
  nicknameTitle: {
    x: 580,
    y: 606,
    width: 2106,
    height: 140,
    fontSize: 70,
    color: "white",
  },
};

export const sagaLayoutConfig = {
  boxes,
  frameAssets: {
    // Base includes a gold-aliased colorless (`c`); nyx has no artifact/land
    // frames and falls back to the base color frames — both baked into the
    // respective barrels.
    base,
    nyx,
    // Saga ships no colorless crown or colorless nyx-insert crown.
    crown: { base: crowns, nyxInsert: crownNyxInsert },
    nickname,
    black: blackOverlay,
    saga: {
      ...abilities,
      banner,
      bannerTransform,
      bannerMasks,
      bannerTransformMasks,
      bannerReadAheadMasks,
    },
  },
  masks,
  sagaConfig: {
    abilitySpacing: 0.01,
    dividerHeight: 0.015,
    textPaddingX: 40, // reduced to fill width before wrapping (badges centered left)
    badgeWidth: 180,
    badgeOffsetX: -20,
  },
  crownConfig: {
    x: 215,
    y: 221,
  },
  nicknameConfig: {
    x: 378,
    y: 577,
  },
} as const satisfies LayoutConfig;
