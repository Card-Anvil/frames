import { CardBoxes, LayoutConfig } from "@cardanvil/frame-kit";

// Import frame assets
import borderFrame from "./border.png";

// Text box boundaries for borderless source material frame (3264x4440 canvas)
const boxes: CardBoxes = {
  art: {
    x: 0,
    y: 0,
    width: 3264,
    height: 4000,
  },
  mana: {
    x: 382,
    y: 372,
    width: 2520,
    height: 177,
    fontSize: 45,
    color: "white",
    outlineColor: "black",
    outlineWidth: 44,
  },
  title: {
    x: 396,
    y: 386,
    width: 2540,
    height: 172,
    fontSize: 119,
    color: "white",
    outlineColor: "black",
    outlineWidth: 44,
  },
  type: {
    x: 394,
    y: 2525,
    width: 2500,
    height: 144,
    fontSize: 101,
    color: "white",
    outlineColor: "black",
    outlineWidth: 44,
  },
  setSymbol: {
    x: 2590,
    y: 2488,
    width: 300,
    height: 175,
  },
  rules: {
    x: 402,
    y: 2748,
    width: 2500,
    height: 1180,
    fontSize: 100,
    color: "white",
    outlineColor: "black",
    outlineWidth: 41,
    verticalAlign: "top",
  },
  pt: {
    x: 2375,
    y: 3770,
    width: 500,
    height: 230,
    fontSize: 122,
    textAlign: "right",
    color: "white",
    outlineColor: "black",
    outlineWidth: 41,
  },
  nicknameTitle: {
    x: 380,
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

export const borderlessSourceMaterialLayoutConfig: LayoutConfig = {
  boxes,
  // A single border image is shared across every base color (no colorless
  // variant — colorless cards fall back through the base chain to gold).
  frameAssets: {
    base: {
      m: borderFrame,
      w: borderFrame,
      u: borderFrame,
      b: borderFrame,
      r: borderFrame,
      g: borderFrame,
      a: borderFrame,
    },
  },
};
