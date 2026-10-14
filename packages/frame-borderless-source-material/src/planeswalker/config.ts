import {
  CardBoxes,
  LayoutConfig,
  PlaneswalkerRenderConfig,
  TextBox,
  omit,
} from "@cardanvil/frame-kit";

import { borderlessSourceMaterialLayoutConfig } from "../regular/config";

const {
  boxes: regularBoxes,
  frameAssets,
  masks,
} = borderlessSourceMaterialLayoutConfig;

// A planeswalker's abilities are a column of sections over the regular text
// column, each loyalty ability's cost in a column of its own on the left. This
// frame has no loyalty badges, ability bands or separators, so the cost and the
// starting loyalty are outlined text — the starting loyalty where the regular
// layout puts power and toughness, with the last ability wrapping around it.
// With no `frameAssets.planeswalker`, Card Anvil draws all of it through the
// same section stack as a Class or a Case.

/** The outlined white text every box on this frame shares. */
const outlinedText = {
  color: "white",
  outlineColor: "black",
  outlineWidth: 41,
} as const satisfies Partial<TextBox>;

const abilities = (y: number, fontSize: number): TextBox => ({
  x: 402,
  y,
  width: 2500,
  // Down to where the regular layout's rules end, over the band.
  height: 3928 - y,
  fontSize,
  ...outlinedText,
});

const planeswalkerBoxes = (
  typeY: number,
  abilitiesY: number,
  fontSize: number,
): CardBoxes =>
  omit(
    {
      ...regularBoxes,
      type: { ...regularBoxes.type, y: typeY },
      setSymbol: { ...regularBoxes.setSymbol, y: typeY - 37 },
      abilities: abilities(abilitiesY, fontSize),
      startingLoyalty: {
        x: 2402,
        y: 3770,
        width: 500,
        height: 230,
        // In pixels, as the starting loyalty is drawn: about the size of the
        // regular layout's power and toughness.
        fontSize: 170,
        ...outlinedText,
      },
    },
    // The abilities take the place of the rules box, and the starting loyalty
    // the power and toughness.
    ["rules", "pt"],
  );

// The type line where the regular layout's is, and the abilities where its
// rules are.
const boxes = planeswalkerBoxes(2525, 2700, 100);

// Two abilities have room to be drawn larger.
const twoAbilityBoxes = planeswalkerBoxes(2525, 2700, 110);

// Four abilities raise the type line to make room, as a tall planeswalker
// frame does.
const tallBoxes = planeswalkerBoxes(2245, 2420, 100);

/**
 * The cost column is `textPaddingX` wide: each loyalty ability's text starts
 * past it, and its cost is set right-aligned inside it. A static ability has
 * no cost and starts at the column's left edge.
 */
const planeswalkerConfig = {
  abilitySpacing: 0,
  separatorHeight: 0,
  textPaddingX: 300,
  staticTextPaddingX: 0,
} as const satisfies PlaneswalkerRenderConfig;

export const borderlessSourceMaterialPlaneswalkerLayoutConfig: LayoutConfig = {
  ...borderlessSourceMaterialLayoutConfig,
  boxes,
  twoAbilityBoxes,
  tallBoxes,
  planeswalkerConfig,
};

// A double-faced card is the regular layout on both faces: with no chrome to
// change between them, only the boxes could differ, and they don't. A transform
// front shows its back face's power and toughness, small, above its own.
const transformFrontBoxes: CardBoxes = {
  ...regularBoxes,
  flipsidePt: {
    x: 2564,
    y: 3650,
    width: 324,
    height: 110,
    fontSize: 90,
    textAlign: "right",
    opacity: 0.7,
    color: "white",
    outlineColor: "black",
    outlineWidth: 30,
  },
};

export const borderlessSourceMaterialTransformLayoutConfig: LayoutConfig = {
  ...borderlessSourceMaterialLayoutConfig,
  boxes: transformFrontBoxes,
  backBoxes: regularBoxes,
  backFrameAssets: frameAssets,
  backMasks: masks,
};

export const borderlessSourceMaterialModalDfcLayoutConfig: LayoutConfig = {
  ...borderlessSourceMaterialLayoutConfig,
  backBoxes: regularBoxes,
  backFrameAssets: frameAssets,
  backMasks: masks,
};

// A double-faced planeswalker's planeswalker face, on either side. Card Anvil
// routes a face that isn't a planeswalker to the plain `transform` or
// `modal_dfc` layout, so only the planeswalker face is drawn from these.
export const borderlessSourceMaterialDfcPlaneswalkerLayoutConfig: LayoutConfig =
  {
    ...borderlessSourceMaterialPlaneswalkerLayoutConfig,
    backBoxes: boxes,
    backFrameAssets: frameAssets,
    backMasks: masks,
  };
