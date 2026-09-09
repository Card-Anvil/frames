import { CardBoxes, LayoutConfig } from "@cardanvil/frame-kit";

import {
  borderlessNormalBoxes,
  withTextlessOverrides,
} from "../regular/config";
import * as crownNyxInsert from "../regular/crowns/nyxInsert";
import * as crownNyxInsertUb from "../regular/crowns/nyxInsert/ub";
// PT boxes and nickname banners are shared with the borderless regular layout.
import * as nickname from "../regular/nickname";
import * as pt from "../regular/pt";
// Transform front-face base frames, land frames, and section masks — used as
// the *second* frame in a composited front face for transforming MDFC cards
// (e.g. King T'Challa). The MDFC front frame's top half is composited with the
// transform front frame's bottom half so the front reads as one frame built
// from both layouts. Only the front face composites; the back renders normally.
import * as transformFrontBase from "../transform/regular/front";
import * as crowns from "../transform/regular/front/crowns";
import * as crownsNickname from "../transform/regular/front/crowns/nickname";
import * as crownsNicknameUb from "../transform/regular/front/crowns/nickname/ub";
import * as crownsUb from "../transform/regular/front/crowns/ub";
import * as transformFrontLand from "../transform/regular/front/land";
import * as transformFrontMasks from "../transform/regular/front/masks";
// MDFC "flipside" badges — small per-color badge art drawn in the bottom
// corner of the rules area showing the *other* face's frame color. The
// `flipside/front` assets are the badges drawn on the front face (colored
// for the back face's color), and `flipside/back` are drawn on the back face
// (colored for the front face's color).
import * as backFlipsideBadge from "./flipside/back";
import * as frontFlipsideBadge from "./flipside/front";
// MDFC reuses the transform layout's crowns (legendary crown overlay). The
// DFC crown icons are per-color MDFC icons (not transform's single image) —
// resolved by the *other* face's color via `dfcIconColorSet`.
import * as backDfcIcons from "./icons/back";
import * as frontDfcIcons from "./icons/front";
// MDFC back-face base frames, land frames, and section masks.
import * as backBase from "./regular/back";
import * as backLand from "./regular/back/land";
import * as backMdfcMasks from "./regular/back/masks";
// MDFC front-face base frames, land frames, and section masks.
import * as base from "./regular/front";
import * as land from "./regular/front/land";
import * as mdfcMasks from "./regular/front/masks";

const frontCrown = {
  base: crowns,
  nyxInsert: crownNyxInsert,
  nyxInsertUb: crownNyxInsertUb,
  ub: crownsUb,
  nickname: crownsNickname,
  nicknameUb: crownsNicknameUb,
};

// Text box boundaries for borderless MDFC layout (3264x4440 canvas).
// Mirrors the regular borderless layout (art/mana/setSymbol/pt/ptImage/
// nicknameTitle are shared as-is), overriding title/type/rules and replacing
// transform's `flipsidePt` with `flipsideType` and `flipsideManaCost` badges
// that show the other face's type line and mana cost near the bottom-left of
// the rules area.
const boxes = {
  ...borderlessNormalBoxes,
  title: {
    ...borderlessNormalBoxes.title,
    x: 640,
    width: 2235,
  },
  // Shorter than the regular rules box to leave room for the flipside
  // type/mana-cost badges near the bottom of the rules area.
  rules: {
    ...borderlessNormalBoxes.rules,
    height: 1040,
  },
  // The other face's type line, shown in a small badge near the bottom-left of
  // the rules area. The badge art (per-color) is resolved from `frameAssets.
  // flipside` using the *other* face's frame color; the text sits on top of it.
  flipsideType: {
    x: 360,
    y: 3846,
    width: 1300,
    height: 160,
    fontSize: 70,
    color: "white",
  },
  // The other face's mana cost, shown as pips on the right side of the
  // flipside badge area. The pip size is driven by `height` (each symbol is
  // height * 0.75), not `fontSize`.
  flipsideManaCost: {
    x: 400,
    y: 3862,
    width: 1050,
    height: 110,
    fontSize: 20,
    color: "white",
    textAlign: "right",
    shadow: false,
  },
  // The other face's oracle text (last paragraph, flavor stripped), shown
  // in the same spot as the flipside mana cost but only when the other face
  // is a land — lands have no mana cost, so the rules text fills that space.
  flipsideRules: {
    x: 400,
    y: 3862,
    width: 1050,
    height: 110,
    fontSize: 70,
    color: "white",
    textAlign: "right",
  },
} satisfies CardBoxes;

export const borderlessMdfcLayoutConfig: LayoutConfig = {
  boxes,
  frameAssets: {
    base,
    land,
    pt,
    crown: frontCrown,
    nickname,
    dfcIconColorSet: frontDfcIcons,
    // Badges drawn on the front face (colored for the BACK face's color).
    flipside: frontFlipsideBadge,
  },
  masks: mdfcMasks,
  // Back-face assets used when rendering faceIndex === 1.
  backFrameAssets: {
    base: backBase,
    land: backLand,
    pt,
    // MDFC reuses the front-face crowns on the back (no separate back crowns).
    crown: frontCrown,
    nickname,
    dfcIconColorSet: backDfcIcons,
    // Badges drawn on the back face (colored for the FRONT face's color).
    flipside: backFlipsideBadge,
  },
  backMasks: backMdfcMasks,
  // Second frame for the composited front face of transforming MDFC cards
  // (e.g. King T'Challa). The front face's MDFC frame is trimmed to its top
  // half and composited with this transform front frame trimmed to its
  // bottom half. Only the front face (faceIndex 0) composites; the back face
  // renders normally from `backFrameAssets`/`backMasks` above.
  compositeFrameAssets: {
    base: transformFrontBase,
    land: transformFrontLand,
    pt,
    crown: frontCrown,
    nickname,
  },
  compositeMasks: transformFrontMasks,
  // Back-face text box positions. The rules/title positions are the same as
  // the front; the flipside badges still reference the *other* (front) face.
  // The back-face flipside badge has a light background, so its type text uses
  // black instead of the white used on the front-face badge.
  backBoxes: {
    ...boxes,
    flipsideType: {
      ...boxes.flipsideType,
      color: "black",
    },
    // The back-face flipside badge has a light background, so its rules text
    // uses black instead of the white used on the front-face badge.
    flipsideRules: {
      ...boxes.flipsideRules,
      color: "black",
    },
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
    y: 586,
  },
};

// "Use Textless Frame" variant — swaps in the textless color frames/masks and
// drops the rules-text boxes for both faces. The flipside type/mana-cost
// badges sit inside the rules area, so they are dropped along with it.
export const borderlessMdfcTextlessLayoutConfig = withTextlessOverrides(
  borderlessMdfcLayoutConfig,
);
