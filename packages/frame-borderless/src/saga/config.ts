import { CardBoxes, LayoutConfig } from "@cardanvil/frame-kit";
import { omit } from "@cardanvil/frame-kit";

import {
  borderlessNormalLayoutConfig,
  withTextlessOverrides,
} from "../regular/config";
// Crowns, nicknames, and PT boxes are shared with the borderless regular layout.
import * as crowns from "../regular/crowns";
import * as crownsNickname from "../regular/crowns/nickname";
import * as crownsNicknameUb from "../regular/crowns/nickname/ub";
import * as crownNyxInsert from "../regular/crowns/nyxInsert";
import * as crownNyxInsertUb from "../regular/crowns/nyxInsert/ub";
import * as crownsUb from "../regular/crowns/ub";
import * as nickname from "../regular/nickname";
import * as pt from "../regular/pt";
// Saga ability badge is shared with the regular saga layout.
import abilityBadge from "./abilities/badge.png";
import abilityDivider from "./abilities/divider.png";
// Saga base + creature base frames.
import * as base from "./base";
import * as creature from "./creature";
import { borderlessSagaCreatureMasks } from "./creature/masks/masks";
import { borderlessSagaMasks } from "./masks/masks";

export const borderlessSagaLayoutConfig = {
  boxes: omit(
    {
      ...borderlessNormalLayoutConfig.boxes,
      type: {
        ...borderlessNormalLayoutConfig.boxes.type,
        y: 3705,
      },
      setSymbol: {
        ...borderlessNormalLayoutConfig.boxes.setSymbol,
        y: 3695,
      },
      abilities: {
        x: 400,
        y: 640,
        width: 1224,
        height: 2965,
        fontSize: 110,
        color: "white",
      },
    } satisfies CardBoxes,
    // Saga uses `abilities` instead of `rules` — drop the inherited `rules`
    // box so it doesn't linger as an unused (but still debug-outlined) box.
    ["rules"],
  ),
  frameAssets: {
    base,
    pt,
    nickname,
    crown: {
      base: crowns,
      nyxInsert: crownNyxInsert,
      nyxInsertUb: crownNyxInsertUb,
      ub: crownsUb,
      nickname: crownsNickname,
      nicknameUb: crownsNicknameUb,
    },
    saga: {
      badge: abilityBadge,
      divider: abilityDivider,
    },
  },
  masks: borderlessSagaMasks,
  sagaConfig: {
    abilitySpacing: 0.01,
    dividerHeight: 0.015,
    textPaddingX: 10,
    badgeWidth: 180,
    skipReminder: true,
    badgeOffsetX: -48,
  },
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
    y: 587,
  },
  // Two-color hybrid cards: only wash the title box colorless, not the type box.
  hybridTitleMask: "title",
} as const satisfies LayoutConfig;

export const borderlessSagaCreatureLayoutConfig = {
  ...borderlessSagaLayoutConfig,
  boxes: {
    ...borderlessSagaLayoutConfig.boxes,
    // Shorter abilities box to leave room for the keyword box below
    abilities: {
      ...borderlessSagaLayoutConfig.boxes.abilities,
      height: 2640,
    },
    keyword: {
      x: 400,
      y: 3600,
      width: 2470,
      height: 350,
      fontSize: 90,
      color: "white",
      textAlign: "center",
    },
    type: {
      ...borderlessSagaLayoutConfig.boxes.type,
      y: 3370,
      height: 144,
    },
    setSymbol: {
      x: 2570,
      y: 3360,
      width: 300,
      height: 156,
    },
  },
  frameAssets: {
    ...borderlessSagaLayoutConfig.frameAssets,
    base: creature,
  },
  masks: borderlessSagaCreatureMasks,
} as const satisfies LayoutConfig;

// "Use Textless Frame" variants for the saga packs, built with the same
// override helper the regular layout uses — swaps in the textless color
// frames/masks and drops the rules-text boxes (here, `abilities`/`keyword`)
// while keeping saga's crowns, nickname banners, ability badges, and
// saga/crown/nickname render config intact.
export const borderlessSagaTextlessLayoutConfig = withTextlessOverrides(
  borderlessSagaLayoutConfig,
);
export const borderlessSagaCreatureTextlessLayoutConfig = withTextlessOverrides(
  borderlessSagaCreatureLayoutConfig,
);
