import { CardBoxes, LayoutConfig, TextBox, omit } from "@cardanvil/frame-kit";

import { borderlessSourceMaterialLayoutConfig } from "../regular/config";

const {
  boxes: regularBoxes,
  frameAssets,
  masks,
} = borderlessSourceMaterialLayoutConfig;

// Sagas, Classes and Cases print their text as a column of sections down one
// side of the card, with the art showing beside it and the type line across
// the bottom: a Saga's chapters on the left, a Class's levels and a Case's
// solve steps on the right. This frame has no chrome for any of it — no
// chapter badges, dividers or level bands — so each is text alone over the
// art, and the renderer draws what the chrome would have marked (a chapter's
// numeral, a level's cost) as outlined text.
//
// The column is the regular text column's left margin (x 402) and 1224px wide,
// mirrored across the sheet for the right-hand column: 3264 - 402 - 1224 is
// 1638. It runs from under the title down to the type line, which sits as low
// as it can over the band.

/** The outlined white text every box on this frame shares. */
const sectionText = {
  color: "white",
  outlineColor: "black",
  outlineWidth: 41,
} as const satisfies Partial<TextBox>;

const COLUMN_WIDTH = 1224;
const LEFT_COLUMN_X = 402;
const RIGHT_COLUMN_X = 3264 - LEFT_COLUMN_X - COLUMN_WIDTH;

const columnAbilities = (x: number): TextBox => ({
  x,
  y: 640,
  width: COLUMN_WIDTH,
  height: 3040,
  fontSize: 100,
  ...sectionText,
});

const columnBoxes = (x: number): CardBoxes =>
  omit(
    {
      ...regularBoxes,
      abilities: columnAbilities(x),
      type: {
        ...regularBoxes.type,
        y: 3770,
      },
      setSymbol: {
        ...regularBoxes.setSymbol,
        y: 3733,
      },
    },
    // The column takes the place of the rules box, so drop the inherited one
    // rather than leave it as an unused (but still debug-outlined) box.
    ["rules", "pt"],
  );

const sagaBoxes = columnBoxes(LEFT_COLUMN_X);

// A Saga creature keeps a keyword line and its power and toughness under the
// chapters, the way the regular layout's rules end in its PT box, so the
// column stops short to make room and the type line moves up above them.
const sagaCreatureBoxes: CardBoxes = {
  ...sagaBoxes,
  abilities: {
    ...columnAbilities(LEFT_COLUMN_X),
    height: 2640,
  },
  type: {
    ...regularBoxes.type,
    y: 3370,
  },
  setSymbol: {
    ...regularBoxes.setSymbol,
    y: 3333,
  },
  keyword: {
    x: 402,
    y: 3560,
    width: 2500,
    height: 370,
    fontSize: 90,
    textAlign: "center",
    verticalAlign: "top",
    ...sectionText,
  },
  pt: regularBoxes.pt,
};

const sectionedBoxes = columnBoxes(RIGHT_COLUMN_X);

/**
 * The chapter numerals stand in a column of their own at the left edge of the
 * text column, where the badges would be, and the chapters' text starts past
 * it. A numeral is drawn at a little over half its cell's height, so the
 * 230px cell sets it about the size of the chapter text, and `badgeOffsetX`
 * moves the cell from straddling the column's edge (where a badge image sits)
 * to lining its numerals up with the title above.
 */
const sagaConfig = {
  abilitySpacing: 0.01,
  dividerHeight: 0.015,
  textPaddingX: 60,
  badgeWidth: 230,
  badgeOffsetX: 60,
  // The column starts at chapter I, leaving out the reminder, as Borderless
  // does: on a card with no frame around its text it only crowds the art.
  skipReminder: true,
};

export const borderlessSourceMaterialSagaLayoutConfig: LayoutConfig = {
  ...borderlessSourceMaterialLayoutConfig,
  boxes: sagaBoxes,
  sagaConfig,
};

export const borderlessSourceMaterialSagaCreatureLayoutConfig: LayoutConfig = {
  ...borderlessSourceMaterialSagaLayoutConfig,
  boxes: sagaCreatureBoxes,
};

// A transforming Saga is a Saga on one face and an ordinary card on the other,
// and which face is the Saga varies per card. With no chrome to tell the two
// apart, the only difference is the boxes: the regular layout's for the plain
// face, the Saga's for the Saga.
export const borderlessSourceMaterialSagaTransformLayoutConfig: LayoutConfig = {
  ...borderlessSourceMaterialSagaLayoutConfig,
  boxes: regularBoxes,
  backBoxes: regularBoxes,
  backFrameAssets: frameAssets,
  backMasks: masks,
  sagaFrontBoxes: sagaBoxes,
  sagaBackBoxes: sagaBoxes,
};

export const borderlessSourceMaterialSagaTransformCreatureLayoutConfig: LayoutConfig =
  {
    ...borderlessSourceMaterialSagaTransformLayoutConfig,
    sagaFrontBoxes: sagaCreatureBoxes,
    sagaBackBoxes: sagaCreatureBoxes,
  };

// A Class's levels and a Case's steps are both a column of sections on the
// right, so the two share one set of boxes. A Class's column starts at level
// 1, leaving out its reminder the way a Saga's leaves out its own.
export const borderlessSourceMaterialSectionedLayoutConfig: LayoutConfig = {
  ...borderlessSourceMaterialLayoutConfig,
  boxes: sectionedBoxes,
  sectionConfig: { skipReminder: true },
};
