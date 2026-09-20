import { CollectorInfoLine } from "../schema/collectorInfo.js";

/**
 * Default collector info layout with two lines, left-aligned.
 * Line 1: rarity | cardNumber | creatorName
 * Line 2: setCode | separator | language | artistSymbol | artist
 *
 * `withCollectorInfoDefaults` gives these to collector info unless its bounds
 * bring their own `lines`, and the renderer falls back to them for a collector
 * box without any.
 */
export const defaultCollectorInfoLines: readonly CollectorInfoLine[] = [
  {
    elements: [
      { type: "rarity", spacingAfter: 34 }, // Extra space before card number
      { type: "cardNumber", spacingAfter: 40, letterSpacing: 8 }, // Extra space before creator name
      { type: "creatorName", minXFromElement: "artistSymbol" },
    ],
    spacing: 10, // Space between elements
  },
  {
    elements: [
      { type: "setCode", spacingAfter: 24, letterSpacing: 6 }, // Extra space before language
      {
        type: "separator",
        useManaFont: true,
        manaSymbol: "•",
        fontSizeMultiplierDot: 1.9,
        fontSizeMultiplierStar: 1.4,
        yOffsetDot: 5,
        yOffsetStar: 20,
        spacingAfter: 10,
      },
      { type: "language", spacingAfter: 38, letterSpacing: 4 }, // Extra space before artist symbol
      {
        type: "artistSymbol",
        useManaFont: true,
        manaSymbol: "a",
        fontSizeMultiplier: 1.24,
      },
      { type: "artist", fontSizeMultiplier: 1.1, letterSpacing: 0 },
    ],
    spacing: 10,
  },
];

/**
 * Retro collector info layout: just artist (top line) and creator name
 * (bottom line), both centered in the box instead of flowing from its left
 * edge like the default lines do.
 */
export const retroCollectorInfoLines: readonly CollectorInfoLine[] = [
  {
    elements: [{ type: "artist", prefix: "Illus. " }],
    align: "center",
    fontSizeMultiplier: 1.5,
    fontFamily: "MPlantin",
  },
  {
    elements: [{ type: "creatorName" }],
    align: "center",
    fontSizeMultiplier: 1.3,
    fontFamily: "MPlantin",
  },
];
