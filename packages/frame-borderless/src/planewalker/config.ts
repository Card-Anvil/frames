import { CardBoxes, LayoutConfig } from "@cardanvil/frame-kit";
import { planeswalkerAbilityIcons } from "@cardanvil/frame-m15/extend";

import * as abilityMasks from "./abilities/masks";
import * as nickname from "./nickname";
// Regular frames (3-ability) + tall frames (4-ability)
import * as base from "./regular";
import * as masks from "./regular/masks";
import * as tall from "./tall";
import * as tallMasks from "./tall/masks";

// Shared non-ability box definitions (3264x4440 canvas). The title, type and
// ability boxes sit where M15's do, so their text boxes carry over; collector
// info comes from the frame's defaults like every other Borderless layout.
const sharedBoxes = {
  // Full bleed: the art fills the whole sheet.
  art: {
    x: 0,
    y: 0,
    width: 3264,
    height: 4440,
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
};

// The regular (2- and 3-ability) frame's type line and ability box.
const regularBoxes = {
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
  startingLoyalty: {
    x: 2540,
    y: 3820,
    width: 450,
    height: 293,
    fontSize: 150,
  },
};
const regularAbilities = {
  x: 490,
  y: 2755,
  width: 2415,
  height: 1210,
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

// Boxes for 4-ability planeswalkers (tall frame)
const boxes4: CardBoxes = {
  ...regularBoxes,
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
};

export const borderlessPlaneswalkerLayoutConfig: LayoutConfig = {
  boxes: boxes3,
  tallBoxes: boxes4,
  twoAbilityBoxes: boxes2,
  frameAssets: {
    base,
    tall,
    nickname,
    planeswalker: {
      ...planeswalkerAbilityIcons,
      masks: abilityMasks,
    },
  },
  masks,
  tallMasks,
  // As on Borderless's other layouts, a hybrid's colorless wash covers only
  // the title.
  hybridTitleMask: "title",
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
  // The nickname banners are trimmed (`frame-kit trim --shared`); this is
  // where they sit on the sheet.
  nicknameConfig: {
    x: 379,
    y: 524,
  },
};
