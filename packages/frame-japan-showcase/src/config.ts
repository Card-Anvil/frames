import { CardBoxes, LayoutConfig } from "@cardanvil/frame-kit";

import * as base from "./base";
import * as masks from "./masks";
import fullBorder from "./masks/fullBorder.png";
import * as pt from "./pt";

// Text box boundaries for the Japan Showcase frame (3264x4440 canvas). They
// start as M15's, with Extended Art's window, and are written out rather than
// spread so the studio edits them here and not in M15's source.
//
// Every text box takes Borderless Source Material's outline.
const boxes: CardBoxes = {
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
  type: {
    x: 390,
    y: 2732,
    width: 2500,
    height: 144,
    fontSize: 106,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
  },
  setSymbol: {
    x: 2530,
    y: 2705,
    width: 300,
    height: 175,
    outlineColor: "black",
    outlineWidth: 38,
  },
  rules: {
    x: 390,
    y: 2966,
    width: 2490,
    height: 964,
    fontSize: 116,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
  },
  pt: {
    x: 2446,
    y: 3826,
    width: 530,
    height: 260,
    fontSize: 116,
    color: "white",
    outlineColor: "black",
    outlineWidth: 38,
  },
  // Where the trimmed P/T images sit on the sheet, as `frame-kit trim
  // --shared` reported it. Re-trim and update this when the art changes.
  ptImage: {
    x: 2419,
    y: 3828,
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
    textAlign: "left",
  },
};

// Only the art this package ships: base frames, P/T boxes and masks. Nothing is
// inherited from M15, so there is no nyx, land, crown or nickname art.
export const japanShowcaseLayoutConfig: LayoutConfig = {
  boxes,
  frameAssets: {
    base,
    pt,
    // Art, not a mask, though it lives beside them: drawn under the base
    // frame while "Full Border" is on, and so left out of the masks barrel.
    fullBorder,
  },
  masks,
};
