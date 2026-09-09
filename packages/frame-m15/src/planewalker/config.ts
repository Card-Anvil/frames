import { CardBoxes, LayoutConfig } from "@cardanvil/frame-kit";

import abilityZero from "./abilities/0.png";
import * as abilityMasks from "./abilities/masks";
// Import planeswalker ability assets
import abilityMinus from "./abilities/minus.png";
import abilityPlus from "./abilities/plus.png";
import abilitySeparator from "./abilities/separator.png";
import abilityStartingLoyalty from "./abilities/startingLoyalty.png";
import * as nickname from "./nickname";
// Regular frames (3-ability) + tall frames (4-ability)
import * as base from "./regular";
import * as colorlessNicknameRegularMask from "./regular/masks";
import * as tall from "./tall";
import * as colorlessNicknameTallMask from "./tall/masks";

// Shared non-ability box definitions (3264x4440 canvas)
const sharedBoxes = {
  art: {
    x: 340,
    y: 550,
    width: 2585,
    height: 3420,
  },
  mana: {
    x: 370,
    y: 310,
    width: 2539,
    height: 172,
    fontSize: 45,
  },
  title: {
    x: 370,
    y: 320,
    width: 2540,
    height: 172,
    fontSize: 120,
  },
  nicknameTitle: {
    x: 580,
    y: 536,
    width: 2106,
    height: 140,
    fontSize: 66,
    color: "white",
  },
  collectorInfo: {
    x: 333,
    y: 4039,
    width: 2200,
    height: 200,
    fontSize: 53,
    color: "white",
  },
};

// Boxes for 2-ability planeswalkers (normal frame, larger ability font)
const boxes2: CardBoxes = {
  ...sharedBoxes,
  type: {
    x: 370,
    y: 2537,
    width: 2500,
    height: 144,
    fontSize: 110,
  },
  setSymbol: {
    x: 2506,
    y: 2510,
    width: 374,
    height: 170,
  },
  abilities: {
    x: 490,
    y: 2755,
    width: 2415,
    height: 1210,
    fontSize: 110,
  },
  startingLoyalty: {
    x: 2540,
    y: 3820,
    width: 450,
    height: 293,
    fontSize: 150,
  },
};

// Boxes for 3-ability planeswalkers (normal frame)
const boxes3: CardBoxes = {
  ...sharedBoxes,
  type: {
    x: 370,
    y: 2537,
    width: 2500,
    height: 144,
    fontSize: 110,
  },
  setSymbol: {
    x: 2506,
    y: 2510,
    width: 374,
    height: 170,
  },
  abilities: {
    x: 490,
    y: 2755,
    width: 2415,
    height: 1210,
    fontSize: 94,
  },
  startingLoyalty: {
    x: 2540,
    y: 3820,
    width: 450,
    height: 293,
    fontSize: 150,
  },
};

// Boxes for 4-ability planeswalkers (tall frame)
const boxes4: CardBoxes = {
  ...sharedBoxes,
  type: {
    x: 370,
    y: 2245,
    width: 2500,
    height: 144,
    fontSize: 110,
  },
  setSymbol: {
    x: 2506,
    y: 2225,
    width: 374,
    height: 170,
  },
  abilities: {
    x: 490,
    y: 2475,
    width: 2415,
    height: 1490,
    fontSize: 94,
  },
  startingLoyalty: {
    x: 2540,
    y: 3820,
    width: 450,
    height: 293,
    fontSize: 150,
  },
};

export const planeswalkerLayoutConfig: LayoutConfig = {
  boxes: boxes3,
  tallBoxes: boxes4,
  twoAbilityBoxes: boxes2,
  frameAssets: {
    base,
    tall,
    nickname,
    planeswalker: {
      plus: abilityPlus,
      minus: abilityMinus,
      zero: abilityZero,
      separator: abilitySeparator,
      startingLoyalty: abilityStartingLoyalty,
      masks: abilityMasks,
      colorlessNicknameMasks: {
        ...colorlessNicknameRegularMask,
        ...colorlessNicknameTallMask,
      },
    },
  },
  planeswalkerConfig: {
    abilitySpacing: 0.005,
    separatorHeight: 61 / 4440, // SEPARATOR_PIXEL_HEIGHT (61px) normalized to card height (4440px)
    textPaddingX: 188,
    staticTextPaddingX: 50,
    textPaddingRight: 10,
    topPadding: 30,
    // The abilities box (bottom = y+height) overlaps the starting loyalty
    // badge (top = 3860) by ~105px. Reserve that as bottom padding so the
    // last ability's text doesn't clip into the loyalty badge.
    bottomPadding: 30,
    // Shrink the font sooner when abilities have more text, giving more
    // breathing room between bands.
    textFillThreshold: 0.85,
  },
  colorArtOverrides: {
    c: { x: 238, y: 240, width: 2784, height: 3800 }, // your colorless art bounds here
  },
  nicknameConfig: {
    x: 428,
    y: 528,
  },
};
