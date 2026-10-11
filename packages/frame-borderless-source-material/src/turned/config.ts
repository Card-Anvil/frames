import { CardBoxes, LayoutConfig, SecondFaceBoxes } from "@cardanvil/frame-kit";

import { borderlessSourceMaterialLayoutConfig } from "../regular/config";

const {
  boxes: regularBoxes,
  frameAssets,
  masks,
} = borderlessSourceMaterialLayoutConfig;

// Battles, split cards, aftermath cards and flip cards print text that does
// not read upright. This frame has no chrome to turn with it — the bottom band
// and the collector line on it stay as printed on every one of these — so each
// layout is text over one art, with the sets that read turned saying so
// through `rotation`.
//
// A set turned 90 or 270 is measured on the sheet lying on its side: 4440 wide
// and 3264 tall. Turned 90, the band is the leftmost 440px of that and the
// card's top edge its left side, so the text column starts at x 700 and ends
// at 4076 — the regular layout's margins, the same distance in from the band
// and from the card's edge.

// Battle: read with the card turned a quarter turn clockwise. The title along
// the top, the type line and rules below, and the defense in the corner a
// creature's power and toughness take, with the rules wrapping around it.
const battleBoxes: CardBoxes = {
  rotation: 90,
  art: {
    x: 440,
    y: 0,
    width: 4000,
    height: 3264,
  },
  mana: {
    x: 686,
    y: 372,
    width: 3390,
    height: 177,
    fontSize: 45,
    color: "white",
    outlineColor: "black",
    outlineWidth: 44,
  },
  title: {
    x: 700,
    y: 386,
    width: 3410,
    height: 172,
    fontSize: 119,
    color: "white",
    outlineColor: "black",
    outlineWidth: 44,
  },
  type: {
    x: 698,
    y: 1990,
    width: 3370,
    height: 144,
    fontSize: 101,
    color: "white",
    outlineColor: "black",
    outlineWidth: 44,
  },
  setSymbol: {
    x: 3764,
    y: 1953,
    width: 300,
    height: 175,
  },
  rules: {
    x: 706,
    y: 2206,
    width: 3370,
    height: 700,
    fontSize: 100,
    color: "white",
    outlineColor: "black",
    outlineWidth: 41,
    verticalAlign: "top",
  },
  defense: {
    x: 3549,
    y: 2676,
    width: 500,
    height: 230,
    fontSize: 122,
    textAlign: "right",
    color: "white",
    outlineColor: "black",
    outlineWidth: 41,
  },
  nicknameTitle: {
    x: 684,
    y: 606,
    width: 2106,
    height: 140,
    fontSize: 70,
    color: "white",
    outlineColor: "black",
    outlineWidth: 30,
    textAlign: "left",
  },
};

// Split: both halves read turned a quarter turn clockwise, as two 1588px
// columns over one art — the first half on the left, which is the bottom of
// the sheet. The 200px gutter between them is wide for the reason the inset
// layouts' is: nothing but space keeps one half's mana cost off the other
// half's name. A Fuse card's Fuse line runs under both columns.
const splitBoxes: CardBoxes = {
  rotation: 90,
  art: {
    x: 440,
    y: 0,
    width: 4000,
    height: 3264,
  },
  mana: {
    x: 686,
    y: 374,
    width: 1602,
    height: 150,
    fontSize: 45,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
  },
  title: {
    x: 700,
    y: 386,
    width: 1600,
    height: 150,
    fontSize: 100,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
  },
  type: {
    x: 698,
    y: 1700,
    width: 1582,
    height: 126,
    fontSize: 86,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
  },
  setSymbol: {
    x: 2020,
    y: 1672,
    width: 260,
    height: 150,
  },
  rules: {
    x: 706,
    y: 1880,
    width: 1582,
    height: 820,
    fontSize: 86,
    color: "white",
    outlineColor: "black",
    outlineWidth: 36,
    verticalAlign: "top",
  },
  fuse: {
    x: 706,
    y: 2766,
    width: 3370,
    height: 140,
    fontSize: 80,
    color: "white",
    outlineColor: "black",
    outlineWidth: 34,
    verticalAlign: "top",
  },
};

const splitSecondFaceBoxes: SecondFaceBoxes = {
  rotation: 90,
  mana: {
    x: 2474,
    y: 374,
    width: 1602,
    height: 150,
    fontSize: 45,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
  },
  title: {
    x: 2488,
    y: 386,
    width: 1600,
    height: 150,
    fontSize: 100,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
  },
  type: {
    x: 2486,
    y: 1700,
    width: 1582,
    height: 126,
    fontSize: 86,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
  },
  setSymbol: {
    x: 3808,
    y: 1672,
    width: 260,
    height: 150,
  },
  rules: {
    x: 2494,
    y: 1880,
    width: 1582,
    height: 820,
    fontSize: 86,
    color: "white",
    outlineColor: "black",
    outlineWidth: 36,
    verticalAlign: "top",
  },
};

// Aftermath: the first half upright across the top of the card, like a short
// regular card. The aftermath half sits under it turned the other way from a
// split card's — a quarter turn counter-clockwise to read, so its text runs
// down the sheet — as one 1480px column between the first half and the band.
const aftermathBoxes: CardBoxes = {
  art: regularBoxes.art,
  mana: regularBoxes.mana,
  title: regularBoxes.title,
  type: {
    x: 394,
    y: 1330,
    width: 2500,
    height: 144,
    fontSize: 101,
    color: "white",
    outlineColor: "black",
    outlineWidth: 44,
  },
  setSymbol: {
    x: 2590,
    y: 1293,
    width: 300,
    height: 175,
  },
  rules: {
    x: 402,
    y: 1553,
    width: 2500,
    height: 700,
    fontSize: 100,
    color: "white",
    outlineColor: "black",
    outlineWidth: 41,
    verticalAlign: "top",
  },
  nicknameTitle: regularBoxes.nicknameTitle,
};

const aftermathSecondFaceBoxes: SecondFaceBoxes = {
  rotation: 270,
  mana: {
    x: 2426,
    y: 350,
    width: 1494,
    height: 150,
    fontSize: 45,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
  },
  title: {
    x: 2440,
    y: 362,
    width: 1480,
    height: 150,
    fontSize: 100,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
  },
  type: {
    x: 2438,
    y: 1250,
    width: 1482,
    height: 126,
    fontSize: 86,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
  },
  rules: {
    x: 2446,
    y: 1430,
    width: 1474,
    height: 1438,
    fontSize: 86,
    color: "white",
    outlineColor: "black",
    outlineWidth: 36,
    verticalAlign: "top",
  },
};

// Flip: each face is a block of name, rules, then type line and power and
// toughness, the way a flip card stacks them — the first upright at the top
// of the card, the second the same block upside down above the band, with the
// art showing between the two. The second block is measured on the sheet
// turned half way round, so it is the first one's numbers moved down to clear
// the band, which is then at the top.
const flipBoxes: CardBoxes = {
  art: regularBoxes.art,
  mana: regularBoxes.mana,
  title: regularBoxes.title,
  rules: {
    x: 402,
    y: 610,
    width: 2500,
    height: 580,
    fontSize: 100,
    color: "white",
    outlineColor: "black",
    outlineWidth: 41,
    verticalAlign: "top",
  },
  type: {
    x: 394,
    y: 1250,
    width: 2500,
    height: 144,
    fontSize: 101,
    color: "white",
    outlineColor: "black",
    outlineWidth: 44,
  },
  setSymbol: {
    x: 2060,
    y: 1213,
    width: 300,
    height: 175,
  },
  pt: {
    x: 2375,
    y: 1200,
    width: 500,
    height: 230,
    fontSize: 122,
    textAlign: "right",
    color: "white",
    outlineColor: "black",
    outlineWidth: 41,
  },
};

const flipSecondFaceBoxes: SecondFaceBoxes = {
  rotation: 180,
  title: {
    x: 396,
    y: 520,
    width: 2540,
    height: 172,
    fontSize: 119,
    color: "white",
    outlineColor: "black",
    outlineWidth: 44,
  },
  rules: {
    x: 402,
    y: 744,
    width: 2500,
    height: 580,
    fontSize: 100,
    color: "white",
    outlineColor: "black",
    outlineWidth: 41,
    verticalAlign: "top",
  },
  // Stops short of the power and toughness beside it: with no set symbol on
  // this face to shrink away from, the box's own width is the limit.
  type: {
    x: 394,
    y: 1384,
    width: 1950,
    height: 144,
    fontSize: 101,
    color: "white",
    outlineColor: "black",
    outlineWidth: 44,
  },
  pt: {
    x: 2375,
    y: 1334,
    width: 500,
    height: 230,
    fontSize: 122,
    textAlign: "right",
    color: "white",
    outlineColor: "black",
    outlineWidth: 41,
  },
};

// Only a battle's front is the battle; its back is an ordinary card, so it is
// the regular layout from boxes to border art.
export const borderlessSourceMaterialBattleLayoutConfig: LayoutConfig = {
  ...borderlessSourceMaterialLayoutConfig,
  boxes: battleBoxes,
  backBoxes: regularBoxes,
  backFrameAssets: frameAssets,
  backMasks: masks,
};

export const borderlessSourceMaterialSplitLayoutConfig: LayoutConfig = {
  ...borderlessSourceMaterialLayoutConfig,
  boxes: splitBoxes,
  secondFaceBoxes: splitSecondFaceBoxes,
};

export const borderlessSourceMaterialAftermathLayoutConfig: LayoutConfig = {
  ...borderlessSourceMaterialLayoutConfig,
  boxes: aftermathBoxes,
  secondFaceBoxes: aftermathSecondFaceBoxes,
};

export const borderlessSourceMaterialFlipLayoutConfig: LayoutConfig = {
  ...borderlessSourceMaterialLayoutConfig,
  boxes: flipBoxes,
  secondFaceBoxes: flipSecondFaceBoxes,
};
