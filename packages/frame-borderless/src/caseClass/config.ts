import { CardBoxes, LayoutConfig, omit } from "@cardanvil/frame-kit";

import {
  borderlessNormalBoxes,
  borderlessNormalLayoutConfig,
} from "../regular/config";
import sectionDivider from "../saga/abilities/divider.png";
import * as base from "./base";
import * as caseClassMasks from "./masks";

// Cases print their text as a column of sections down the right of the card —
// the opening ability, then To solve and Solved — with the art showing beside
// it and the type line in a bar across the bottom. The title bar, crowns and
// nickname banners are the regular layout's.
//
// The column (x 1628–2900, y 612–3630) takes the place of the rules box; the
// type bar runs from y 3650 to 3898. The type line and set symbol sit as far
// into that bar as they do into the regular layout's (y 2477–2725).
const caseBoxes: CardBoxes = omit(
  {
    ...borderlessNormalBoxes,
    abilities: {
      x: 1690,
      y: 650,
      width: 1150,
      height: 2940,
      fontSize: 100,
      color: "white",
    },
    type: {
      ...borderlessNormalBoxes.type,
      y: 3705,
    },
    setSymbol: {
      ...borderlessNormalBoxes.setSymbol,
      y: 3684,
    },
  },
  // The column replaces the rules box, and a Case has no power and toughness.
  ["rules", "pt", "ptImage"],
);

export const borderlessCaseLayoutConfig: LayoutConfig = {
  ...borderlessNormalLayoutConfig,
  boxes: caseBoxes,
  // The regular land frames have the regular rules box, so they are dropped:
  // a land falls back to the case frame of its colour instead.
  frameAssets: {
    ...omit(borderlessNormalLayoutConfig.frameAssets, ["land", "pt"]),
    base,
    // The Saga's chapter divider, between the column's sections.
    sectionDivider,
  },
  masks: caseClassMasks,
};
