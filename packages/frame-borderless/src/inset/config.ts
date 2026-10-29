import {
  CardBoxes,
  LayoutConfig,
  SectionDividerPlacement,
  TemplateSettingsConfig,
  TextBox,
} from "@cardanvil/frame-kit";

import {
  borderlessNormalBoxes,
  borderlessNormalLayoutConfig,
} from "../regular/config";
import sectionDivider from "../saga/abilities/divider.png";

// Adventure, Omen and Prepare cards drawn on the regular frame: the rules box
// splits into two columns, the second spell in one and the card's own rules in
// the other, with a divider between them. The spell's name and mana cost, its
// type line and its rules are each set off by a divider of their own.
//
// The regular rules box runs from x 365 to 2899 and y 2748 to 3979. Its text
// column (x 400 to 2870) splits about the sheet's centre, x 1632, where the
// upright divider stands.

const TOP = 2775;
const BOTTOM = 3940;
const LEFT_X = 400;
const LEFT_WIDTH = 1175;
const RIGHT_X = 1700;
const RIGHT_WIDTH = 1170;
const SPLIT_X = 1632;

/** Where the spell's two dividers fall, under its name and its type line. */
const UNDER_NAME_Y = 2935;
const UNDER_TYPE_Y = 3110;

/**
 * Every column is white like the regular rules, and centered in its height
 * like the storybook's pages.
 */
const columnText = {
  fontSize: 110,
  color: "white",
} as const satisfies Partial<TextBox>;

/** The spell's boxes, in the column starting at `x`. */
const insetBoxes = (x: number, width: number, rulesBottom: number) =>
  ({
    insetMana: { x, y: TOP + 8, width, height: 125, fontSize: 45 },
    insetTitle: {
      x,
      y: TOP,
      width,
      height: 140,
      fontSize: 92,
      color: "white",
    },
    insetType: {
      x,
      y: UNDER_NAME_Y + 25,
      width,
      height: 130,
      fontSize: 84,
      color: "white",
    },
    insetRules: {
      x,
      y: UNDER_TYPE_Y + 30,
      width,
      height: rulesBottom - (UNDER_TYPE_Y + 30),
      ...columnText,
    },
  }) satisfies Partial<CardBoxes>;

/** The dividers for a spell in the column starting at `x`. */
const insetDividers = (
  x: number,
  length: number,
): SectionDividerPlacement[] => [
  { x, y: UNDER_NAME_Y, length },
  { x, y: UNDER_TYPE_Y, length },
  { x: SPLIT_X, y: TOP, length: BOTTOM - TOP, orientation: "vertical" },
];

// Adventure and Omen: the spell on the left, the card's rules on the right,
// where they wrap around the PT box like the regular layout's do.
const leftInsetBoxes: CardBoxes = {
  ...borderlessNormalBoxes,
  ...insetBoxes(LEFT_X, LEFT_WIDTH, BOTTOM),
  rules: {
    x: RIGHT_X,
    y: TOP,
    width: RIGHT_WIDTH,
    height: BOTTOM - TOP,
    ...columnText,
  },
};

// Prepare: the mirror image, with the spell on the right. Its rules stop short
// of the PT box below them rather than wrapping around it.
const rightInsetBoxes: CardBoxes = {
  ...borderlessNormalBoxes,
  ...insetBoxes(RIGHT_X, RIGHT_WIDTH, 3800),
  rules: {
    x: LEFT_X,
    y: TOP,
    width: LEFT_WIDTH,
    height: BOTTOM - TOP,
    ...columnText,
  },
};

const insetFrameAssets = {
  ...borderlessNormalLayoutConfig.frameAssets,
  // The Saga's chapter divider, also between the sections of a Case.
  sectionDivider,
};

export const borderlessInsetLayoutConfig: LayoutConfig = {
  ...borderlessNormalLayoutConfig,
  boxes: leftInsetBoxes,
  frameAssets: insetFrameAssets,
  sectionDividers: insetDividers(LEFT_X, LEFT_WIDTH),
};

export const borderlessPrepareInsetLayoutConfig: LayoutConfig = {
  ...borderlessNormalLayoutConfig,
  boxes: rightInsetBoxes,
  frameAssets: insetFrameAssets,
  sectionDividers: insetDividers(RIGHT_X, RIGHT_WIDTH),
};

// Each layout's style: drawn in its storybook, or inset on the regular frame.
// The renderer looks the value up in the frame's `alternateLayouts`, so
// "inset" draws an Adventure from `alternateLayouts.inset.adventure`. Omen and
// Prepare have no storybook art yet, so inset is their only style.

export const adventureStyleSettings = {
  style: {
    type: "select",
    label: "Adventure",
    defaultValue: "storybook",
    options: ["storybook", "inset"],
  },
} as const satisfies TemplateSettingsConfig;

export const omenStyleSettings = {
  style: {
    type: "select",
    label: "Omen",
    helperText: "Official coming soon.",
    defaultValue: "inset",
    options: ["inset"],
  },
} as const satisfies TemplateSettingsConfig;

export const prepareStyleSettings = {
  style: {
    type: "select",
    label: "Prepare",
    helperText: "Official coming soon.",
    defaultValue: "inset",
    options: ["inset"],
  },
} as const satisfies TemplateSettingsConfig;
