import { CardBoxes, LayoutConfig, omit } from "@cardanvil/frame-kit";

import {
  borderlessNormalBoxes,
  borderlessNormalLayoutConfig,
} from "../regular/config";
import * as base from "./base";
import * as storybookMasks from "./masks";

// Adventure cards print the adventure spell on the left page of an open book
// and the card's own rules on the right. Everything above the book — the
// title bar, type line, crowns, nickname banners — is the regular layout's.
//
// Left page (x 338–1631): a title band (y 2749–2930), a type band
// (y 2931–3119), then parchment down to 3979. Right page (x 1634–2927):
// parchment from 2749 to 3979.
const adventureBoxes: CardBoxes = {
  ...borderlessNormalBoxes,
  rules: {
    x: 1700,
    y: 2790,
    width: 1170,
    height: 1150,
    fontSize: 90,
    color: "black",
  },
  insetMana: {
    x: 400,
    y: 2775,
    width: 1170,
    height: 130,
    fontSize: 45,
  },
  insetTitle: {
    x: 400,
    y: 2770,
    width: 1170,
    height: 140,
    fontSize: 86,
    color: "white",
  },
  insetType: {
    x: 400,
    y: 2955,
    width: 1170,
    height: 140,
    fontSize: 78,
    color: "white",
  },
  insetRules: {
    x: 400,
    y: 3150,
    width: 1170,
    height: 790,
    fontSize: 90,
    color: "black",
  },
};

export const borderlessAdventureLayoutConfig: LayoutConfig = {
  ...borderlessNormalLayoutConfig,
  boxes: adventureBoxes,
  // The regular land frames have the regular rules box, so they are dropped:
  // a land falls back to the storybook frame of its colour instead.
  frameAssets: {
    ...omit(borderlessNormalLayoutConfig.frameAssets, ["land"]),
    base,
  },
  // The book has no pinline art, and leaving out a `pinlines` mask sends
  // coloured artifacts to their colour's frame.
  masks: storybookMasks,
};
