import { CardBoxes, LayoutConfig, TextBox } from "@cardanvil/frame-kit";

import { withTextlessOverrides } from "../../regular/config";
// The plain (non-Saga) side of a transforming Saga reuses the borderless
// transform pack's own front/back assets/boxes as-is — it isn't a Saga.
import { borderlessTransformLayoutConfig } from "../../transform/config";
// Transform DFC icons, keyed by `frame_effects` variant — resolved per-card
// at render time.
import { backDfcIcons, frontDfcIcons } from "../../transform/icons/dfcIconSets";
// Boxes, crowns, nickname/pt boxes, saga badge/divider, and saga/crown/
// nickname render config are all shared with the regular (non-transform)
// saga layouts — spread below instead of redefining them here.
import {
  borderlessSagaLayoutConfig,
  borderlessSagaCreatureLayoutConfig,
} from "../config";
// Saga assets for when the Saga is face index 1 (the back face) — e.g.
// Clive, Ifrit's Dominant // Ifrit, Warden of Inferno.
import * as sagaBack from "./back";
import * as sagaBackMasks from "./back/masks";
import * as sagaCreatureBack from "./creature/back";
import * as sagaCreatureBackMasks from "./creature/back/masks";
import * as sagaCreatureFront from "./creature/front";
import * as sagaCreatureFrontMasks from "./creature/front/masks";
// Saga assets for when the Saga is face index 0 (the front face) — e.g.
// Fable of the Mirror-Breaker.
import * as sagaFront from "./front";
import * as sagaFrontMasks from "./front/masks";

// Saga-face boxes when the Saga is on the front — a `flipsidePt` box previews
// the transformed permanent's power/toughness (only ever read while
// rendering face 0, so it's harmless to omit from the back-face variants).
const sagaFrontBoxes: CardBoxes = {
  ...borderlessSagaLayoutConfig.boxes,
  // Shifted right to leave room for the DFC icon on the crown.
  title: {
    ...borderlessSagaLayoutConfig.boxes.title,
    x: 640,
  },
  flipsidePt: {
    x: 364,
    y: 3450,
    width: 370,
    height: 110,
    fontSize: 100,
    color: "white",
    textAlign: "left",
    opacity: 0.7,
  },
};

const sagaFrontAbilitiesBox: TextBox | undefined = sagaFrontBoxes.abilities;
if (!sagaFrontAbilitiesBox) {
  throw new Error("Saga layout is missing an abilities box");
}

// Used instead of `sagaFrontBoxes` when the flipside PT box will actually
// render (the back face has power/toughness) — shortens the abilities box a
// bit to leave more clearance above the flipside PT box.
const sagaFrontBoxesWithFlipsidePt: CardBoxes = {
  ...sagaFrontBoxes,
  abilities: {
    ...sagaFrontAbilitiesBox,
    height: sagaFrontAbilitiesBox.height - 140,
  },
};

const sagaCreatureFrontBoxes: CardBoxes = {
  ...borderlessSagaCreatureLayoutConfig.boxes,
  title: {
    ...borderlessSagaCreatureLayoutConfig.boxes.title,
    x: 640,
  },
  flipsidePt: sagaFrontBoxes.flipsidePt,
};

const sagaCreatureAbilitiesBox: TextBox | undefined =
  sagaCreatureFrontBoxes.abilities;
if (!sagaCreatureAbilitiesBox) {
  throw new Error("Saga creature layout is missing an abilities box");
}

// Used instead of `sagaCreatureFrontBoxes` when the flipside PT box will
// actually render (the back face has power/toughness) — shortens the
// abilities box a bit to leave more clearance above the flipside PT box.
const sagaCreatureFrontBoxesWithFlipsidePt: CardBoxes = {
  ...sagaCreatureFrontBoxes,
  abilities: {
    ...sagaCreatureAbilitiesBox,
    height: sagaCreatureAbilitiesBox.height - 140,
  },
};

// Saga-face boxes when the Saga is on the back — title shifted down to match
// the borderless transform back face convention (no DFC-icon x shift; that
// only ever applies to face 0).
const sagaBackBoxes: CardBoxes = {
  ...borderlessSagaLayoutConfig.boxes,
  title: {
    ...borderlessSagaLayoutConfig.boxes.title,
    y: 382,
  },
};

const sagaCreatureBackBoxes: CardBoxes = {
  ...borderlessSagaCreatureLayoutConfig.boxes,
  title: {
    ...borderlessSagaCreatureLayoutConfig.boxes.title,
    y: 382,
  },
};

// Saga on either the front or back face of a transform DFC (which physical
// side varies per card — resolved at render time, see `renderCardToCanvas`).
// `boxes`/`frameAssets`/`masks`/`backBoxes`/`backFrameAssets`/`backMasks`
// always describe the plain (non-Saga) permanent face, borrowed as-is from
// the plain borderless transform pack; `sagaFront*`/`sagaBack*` hold the
// Saga-shaped set for whichever physical side actually has it.
export const borderlessSagaTransformLayoutConfig: LayoutConfig = {
  ...borderlessSagaLayoutConfig,
  boxes: borderlessTransformLayoutConfig.boxes,
  frameAssets: borderlessTransformLayoutConfig.frameAssets,
  masks: borderlessTransformLayoutConfig.masks,
  backFrameAssets: borderlessTransformLayoutConfig.backFrameAssets,
  backMasks: borderlessTransformLayoutConfig.backMasks,
  backBoxes: borderlessTransformLayoutConfig.backBoxes,
  flipsidePtBoxes: sagaFrontBoxesWithFlipsidePt,
  sagaFrontBoxes,
  sagaFrontFrameAssets: {
    ...borderlessSagaLayoutConfig.frameAssets,
    base: sagaFront,
    // The saga pack's crown is shaped for single-faced cards; transform
    // crowns accommodate the DFC icon overlay.
    crown: borderlessTransformLayoutConfig.frameAssets.crown,
    dfcIconSet: frontDfcIcons,
  },
  sagaFrontMasks,
  sagaBackBoxes,
  sagaBackFrameAssets: {
    ...borderlessSagaLayoutConfig.frameAssets,
    base: sagaBack,
    crown: borderlessTransformLayoutConfig.backFrameAssets?.crown,
    dfcIconSet: backDfcIcons,
  },
  sagaBackMasks,
};

export const borderlessSagaTransformCreatureLayoutConfig: LayoutConfig = {
  ...borderlessSagaCreatureLayoutConfig,
  boxes: borderlessTransformLayoutConfig.boxes,
  frameAssets: borderlessTransformLayoutConfig.frameAssets,
  masks: borderlessTransformLayoutConfig.masks,
  backFrameAssets: borderlessTransformLayoutConfig.backFrameAssets,
  backMasks: borderlessTransformLayoutConfig.backMasks,
  backBoxes: borderlessTransformLayoutConfig.backBoxes,
  flipsidePtBoxes: sagaCreatureFrontBoxesWithFlipsidePt,
  sagaFrontBoxes: sagaCreatureFrontBoxes,
  sagaFrontFrameAssets: {
    ...borderlessSagaCreatureLayoutConfig.frameAssets,
    base: sagaCreatureFront,
    crown: borderlessTransformLayoutConfig.frameAssets.crown,
    dfcIconSet: frontDfcIcons,
  },
  sagaFrontMasks: sagaCreatureFrontMasks,
  sagaBackBoxes: sagaCreatureBackBoxes,
  sagaBackFrameAssets: {
    ...borderlessSagaCreatureLayoutConfig.frameAssets,
    base: sagaCreatureBack,
    crown: borderlessTransformLayoutConfig.backFrameAssets?.crown,
    dfcIconSet: backDfcIcons,
  },
  sagaBackMasks: sagaCreatureBackMasks,
};

// "Use Textless Frame" variants, built with the same override helper the
// regular layout uses — swaps in the textless color frames/masks and drops
// the rules-text boxes (here, `abilities`/`keyword`/`flipsidePt`) for both
// the plain and Saga-shaped sets, while keeping saga's crowns, nickname
// banners, ability badges, DFC icons, and back-face layout intact.
export const borderlessSagaTransformTextlessLayoutConfig =
  withTextlessOverrides(borderlessSagaTransformLayoutConfig);
export const borderlessSagaTransformCreatureTextlessLayoutConfig =
  withTextlessOverrides(borderlessSagaTransformCreatureLayoutConfig);
