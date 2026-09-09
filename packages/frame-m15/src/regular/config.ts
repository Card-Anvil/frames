import { CardBoxes, LayoutConfig } from "@cardanvil/frame-kit";

import * as base from "./base";
import * as crowns from "./crowns";
import * as crownNyxInsert from "./crowns/nyxInsert";
import * as land from "./land";
import * as masks from "./masks";
import black from "./misc/black.png";
import * as nickname from "./nickname";
import * as nyx from "./nyx";
import * as pt from "./pt";

// Text box boundaries for normal M15 frame (3264x4440 canvas)
const boxes: CardBoxes = {
  art: {
    x: 376,
    y: 610,
    width: 2512,
    height: 1839,
  },
  mana: {
    x: 370,
    y: 373,
    width: 2536,
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
    y: 2532,
    width: 2500,
    height: 144,
    fontSize: 106,
  },
  setSymbol: {
    x: 2590,
    y: 2505,
    width: 300,
    height: 175,
  },
  rules: {
    x: 390,
    y: 2766,
    width: 2471,
    height: 1180,
    fontSize: 116,
  },
  pt: {
    x: 2446,
    y: 3826,
    width: 530,
    height: 260,
    fontSize: 116,
  },
  ptImage: {
    x: 2429,
    y: 3826,
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

export const regularLayoutConfig: LayoutConfig = {
  boxes,
  frameAssets: {
    base,
    land,
    nyx,
    pt,
    crown: { base: crowns, nyxInsert: crownNyxInsert },
    nickname,
    black,
  },
  masks,
  crownConfig: {
    x: 217,
    y: 221,
  },
  nicknameConfig: {
    x: 377,
    y: 575,
  },
};
