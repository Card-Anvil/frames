import { CardBoxes, LayoutConfig } from "@cardanvil/frame-kit";

import { borderlessSourceMaterialLayoutConfig } from "../regular/config";

const { boxes: regularBoxes } = borderlessSourceMaterialLayoutConfig;

// Adventure, Omen and Prepare cards print a second spell inset in the text
// box. This frame has no chrome to draw around it, so the inset is text alone:
// the regular layout's text column (x 402 to 2902) splits into two 1160px
// columns, one for the inset spell and one for the card's own rules. The 180px
// gutter is wide on purpose: with no frame between the columns, an inset mana
// cost any closer reads as a cost on the line of rules beside it. Everything
// above the text box is the regular layout's.

// Adventure and Omen: the spell on the left, the card's rules on the right,
// where they wrap around the PT box like the regular layout's do.
const adventureBoxes: CardBoxes = {
  ...regularBoxes,
  rules: {
    x: 1742,
    y: 2748,
    width: 1160,
    height: 1180,
    fontSize: 90,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
    verticalAlign: "top",
  },
  insetMana: {
    x: 402,
    y: 2750,
    width: 1160,
    height: 125,
    fontSize: 45,
    color: "white",
    outlineColor: "black",
    outlineWidth: 32,
  },
  insetTitle: {
    x: 396,
    y: 2748,
    width: 1166,
    height: 130,
    fontSize: 86,
    color: "white",
    outlineColor: "black",
    outlineWidth: 34,
  },
  insetType: {
    x: 394,
    y: 2890,
    width: 1168,
    height: 120,
    fontSize: 78,
    color: "white",
    outlineColor: "black",
    outlineWidth: 34,
  },
  insetRules: {
    x: 402,
    y: 3064,
    width: 1160,
    height: 864,
    fontSize: 90,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
    verticalAlign: "top",
  },
};

// Prepare: the mirror image, with the spell on the right. Its rules stop short
// of the PT box below them rather than wrapping around it.
const prepareBoxes: CardBoxes = {
  ...regularBoxes,
  rules: {
    x: 402,
    y: 2748,
    width: 1160,
    height: 1180,
    fontSize: 90,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
    verticalAlign: "top",
  },
  insetMana: {
    x: 1742,
    y: 2750,
    width: 1160,
    height: 125,
    fontSize: 45,
    color: "white",
    outlineColor: "black",
    outlineWidth: 32,
  },
  insetTitle: {
    x: 1736,
    y: 2748,
    width: 1166,
    height: 130,
    fontSize: 86,
    color: "white",
    outlineColor: "black",
    outlineWidth: 34,
  },
  insetType: {
    x: 1734,
    y: 2890,
    width: 1168,
    height: 120,
    fontSize: 78,
    color: "white",
    outlineColor: "black",
    outlineWidth: 34,
  },
  insetRules: {
    x: 1742,
    y: 3064,
    width: 1160,
    height: 686,
    fontSize: 90,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
    verticalAlign: "top",
  },
};

export const borderlessSourceMaterialAdventureLayoutConfig: LayoutConfig = {
  ...borderlessSourceMaterialLayoutConfig,
  boxes: adventureBoxes,
};

export const borderlessSourceMaterialPrepareLayoutConfig: LayoutConfig = {
  ...borderlessSourceMaterialLayoutConfig,
  boxes: prepareBoxes,
};
