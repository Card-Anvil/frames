import { CardBoxes, LayoutConfig } from "@cardanvil/frame-kit";

import {
  borderlessNormalBoxes,
  withTextlessOverrides,
} from "../regular/config";
import * as backCrownNyxInsert from "../regular/crowns/nyxInsert";
import * as crownNyxInsert from "../regular/crowns/nyxInsert";
import * as backCrownNyxInsertUb from "../regular/crowns/nyxInsert/ub";
import * as crownNyxInsertUb from "../regular/crowns/nyxInsert/ub";
// PT boxes and nickname banners are shared with the borderless regular layout.
import * as nickname from "../regular/nickname";
import * as pt from "../regular/pt";
// Transform DFC icons, keyed by `frame_effects` variant (e.g. "convertdfc",
// "sunmoondfc") — resolved per-card at render time.
import { backDfcIcons, frontDfcIcons, lessonIcon } from "./icons/dfcIconSets";
// Transform back-face base frames, land frames, crowns, and section masks.
import * as backBase from "./regular/back";
import * as backCrowns from "./regular/back/crowns";
import * as backCrownsNickname from "./regular/back/crowns/nickname";
import * as backCrownsNicknameUb from "./regular/back/crowns/nickname/ub";
import * as backCrownsUb from "./regular/back/crowns/ub";
import * as backLand from "./regular/back/land";
import * as backTransformMasks from "./regular/back/masks";
// Transform front-face base frames, land frames, crowns, and section masks.
import * as base from "./regular/front";
import * as crowns from "./regular/front/crowns";
import * as crownsNickname from "./regular/front/crowns/nickname";
import * as crownsNicknameUb from "./regular/front/crowns/nickname/ub";
import * as crownsUb from "./regular/front/crowns/ub";
import * as land from "./regular/front/land";
import * as transformMasks from "./regular/front/masks";

// Text box boundaries for borderless transform layout (3264x4440 canvas).
// Mirrors the regular borderless layout (art/mana/type/setSymbol/pt/ptImage/
// nicknameTitle are shared as-is), overriding title/rules and adding a
// `flipsidePt` box that shows the other face's power/toughness near the
// bottom-right of the rules area.
const boxes: CardBoxes = {
  ...borderlessNormalBoxes,
  title: {
    ...borderlessNormalBoxes.title,
    x: 640,
  },
  // The other face's power/toughness, shown in a small box near the bottom-right
  // of the rules area so the reader knows the transform stats without flipping.
  flipsidePt: {
    x: 2564,
    y: 3650,
    width: 324,
    height: 110,
    fontSize: 90,
    color: "white",
    textAlign: "right",
    opacity: 0.7,
  },
};

const frontCrown = {
  base: crowns,
  nyxInsert: crownNyxInsert,
  nyxInsertUb: crownNyxInsertUb,
  ub: crownsUb,
  nickname: crownsNickname,
  nicknameUb: crownsNicknameUb,
};

const backCrown = {
  base: backCrowns,
  nyxInsert: backCrownNyxInsert,
  nyxInsertUb: backCrownNyxInsertUb,
  ub: backCrownsUb,
  nickname: backCrownsNickname,
  nicknameUb: backCrownsNicknameUb,
};

export const borderlessTransformLayoutConfig: LayoutConfig = {
  boxes,
  frameAssets: {
    base,
    land,
    pt,
    crown: frontCrown,
    nickname,
    dfcIconSet: frontDfcIcons,
    lessonIcon,
  },
  masks: transformMasks,
  // Back-face assets used when rendering faceIndex === 1.
  backFrameAssets: {
    base: backBase,
    land: backLand,
    pt,
    crown: backCrown,
    nickname,
    dfcIconSet: backDfcIcons,
  },
  backMasks: backTransformMasks,
  // Back-face text box positions. Override the title (and any other boxes
  // that differ) here; the rest fall back to the shared `boxes` above.
  backBoxes: {
    ...boxes,
    title: {
      ...borderlessNormalBoxes.title,
      y: 382,
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

// "Use Textless Frame" variant, built with the same override helper the
// regular layout uses — swaps in the textless color frames/masks and drops
// the rules-text boxes for both faces while keeping the transform-specific
// crowns, nickname banners, PT boxes, DFC icons, and back-face layout intact.
export const borderlessTransformTextlessLayoutConfig = withTextlessOverrides(
  borderlessTransformLayoutConfig,
);
