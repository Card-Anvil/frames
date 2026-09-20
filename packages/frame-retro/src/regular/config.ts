import { CardBoxes, LayoutConfig } from "@cardanvil/frame-kit";

import * as base from "./base";
import * as land from "./land";
import * as masks from "./masks";

// Text box boundaries for the normal Retro frame (3264x4440 canvas).
//
// Copied from M15's boxes as a starting point — the retro art was authored
// against the same canvas size, but these coordinates have not been tuned to
// its actual pinlines/text windows yet.
const boxes: CardBoxes = {
  art: {
    x: 486,
    y: 553,
    width: 2296,
    height: 1842,
  },
  mana: {
    x: 450,
    y: 332,
    width: 2443,
    height: 180,
    fontSize: 55,
    shadow: false,
  },
  title: {
    x: 470,
    y: 349,
    width: 2540,
    height: 172,
    fontFamily: "Goudy Medieval",
    color: "white",
    fontSize: 124,
    shadow: true,
    shadowOffsetX: 5,
    shadowOffsetY: 7,
    letterSpacing: 1.8,
  },
  type: {
    x: 458,
    y: 2458,
    width: 2500,
    height: 144,
    fontFamily: "MPlantin",
    color: "white",
    fontSize: 98,
    shadow: true,
    shadowOffsetX: 5,
    shadowOffsetY: 7,
  },
  setSymbol: {
    x: 2510,
    y: 2446,
    width: 300,
    height: 158,
  },
  rules: {
    x: 520,
    y: 2680,
    width: 2230,
    height: 1110,
    fontSize: 116,
  },
  pt: {
    x: 2310,
    y: 3826,
    width: 530,
    height: 260,
    color: "white",
    fontSize: 130,
    shadow: true,
    shadowOffsetX: 7,
    shadowOffsetY: 7,
    textAlign: "right",
    letterSpacing: 6,
  },
  ptImage: {
    x: 2429,
    y: 3826,
  },
};

export const regularLayoutConfig: LayoutConfig = {
  boxes,
  frameAssets: {
    base,
    land,
  },
  masks,
};
