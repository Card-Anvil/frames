import { CardBoxes, LayoutConfig } from "@cardanvil/frame-kit";

import fullBorder from "../masks/fullBorder.png";
import abilityZero from "./abilities/0.png";
import abilityMinus from "./abilities/minus.png";
import abilityPlus from "./abilities/plus.png";
import abilityStartingLoyalty from "./abilities/startingLoyalty.png";
// Regular frames (2- and 3-ability) + tall frames (4-ability)
import * as base from "./regular";
import * as masks from "./regular/masks";
import * as tall from "./tall";
import * as tallMasks from "./tall/masks";

// Text box boundaries for Japan Showcase planeswalkers (3264x4440 canvas). The
// title and mana cost sit where the normal layout's do, on both frames. The
// type line and abilities sit just under the frame's rule, which the regular
// frame draws 280px lower than the tall one.
//
// Every text box takes the normal layout's outline. There is no ability
// backing: the art shows through, so the outline is what makes it read.
const sharedBoxes = {
  art: {
    x: 0,
    y: 0,
    width: 3264,
    height: 3974,
  },
  mana: {
    x: 370,
    y: 373,
    width: 2536,
    height: 177,
    fontSize: 55,
    outlineColor: "black",
    outlineWidth: 38,
  },
  title: {
    x: 390,
    y: 385,
    width: 2540,
    height: 172,
    fontSize: 120,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
  },
  nicknameTitle: {
    x: 380,
    y: 590,
    width: 2106,
    height: 140,
    fontSize: 70,
    color: "white",
    outlineColor: "black",
    outlineWidth: 30,
    textAlign: "left" as const,
  },
  // Centered on the badge drawn into the frame art, which is
  // `abilities/startingLoyalty.png` (487 × 302) at (2469, 3788). The box sits
  // below the badge's notch so the number centers on the badge's body.
  startingLoyalty: {
    x: 2469,
    y: 3807,
    width: 484,
    height: 280,
    fontSize: 150,
  },
};

// The regular (2- and 3-ability) frame's type line and ability box.
const regularBoxes = {
  ...sharedBoxes,
  type: {
    x: 390,
    y: 2525,
    width: 2500,
    height: 144,
    fontSize: 106,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
  },
  setSymbol: {
    x: 2530,
    y: 2498,
    width: 300,
    height: 175,
    outlineColor: "black",
    outlineWidth: 38,
  },
};
const regularAbilities = {
  x: 482,
  y: 2755,
  width: 2418,
  height: 1136,
  color: "white",
  outlineColor: "black",
  outlineWidth: 38,
};

// Boxes for 2-ability planeswalkers (normal frame, larger ability font)
const boxes2: CardBoxes = {
  ...regularBoxes,
  abilities: { ...regularAbilities, fontSize: 110 },
};

// Boxes for 3-ability planeswalkers (normal frame)
const boxes3: CardBoxes = {
  ...regularBoxes,
  abilities: { ...regularAbilities, fontSize: 94 },
};

// Boxes for 4-ability planeswalkers (tall frame): the regular frame's, 280px
// higher.
const boxes4: CardBoxes = {
  ...sharedBoxes,
  type: {
    ...regularBoxes.type,
    y: 2245,
  },
  setSymbol: {
    ...regularBoxes.setSymbol,
    y: 2218,
  },
  abilities: {
    ...regularAbilities,
    y: 2475,
    height: 1416,
    fontSize: 94,
  },
};

export const japanShowcasePlaneswalkerLayoutConfig: LayoutConfig = {
  boxes: boxes3,
  tallBoxes: boxes4,
  twoAbilityBoxes: boxes2,
  frameAssets: {
    base,
    tall,
    fullBorder,
    planeswalker: {
      plus: abilityPlus,
      minus: abilityMinus,
      zero: abilityZero,
      startingLoyalty: abilityStartingLoyalty,
    },
  },
  masks,
  tallMasks,
  planeswalkerConfig: {
    abilitySpacing: 0.005,
    separatorHeight: 0,
    textPaddingX: 188,
    // Clears the frame's bar, which ends 42px into the abilities box.
    staticTextPaddingX: 90,
    textPaddingRight: 10,
    abilityBacking: false,
    // These badges' bodies are centered in their images, unlike M15's, so
    // none needs M15's drop to center it on its ability.
    plusBadgeOffsetY: -10,
    minusBadgeOffsetY: 12,
    zeroBadgeOffsetY: 0,
    plusCostOffsetY: 0,
    minusCostOffsetY: 0,
    zeroCostOffsetY: 0,
  },
};
