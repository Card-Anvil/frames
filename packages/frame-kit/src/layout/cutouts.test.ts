import { describe, expect, it } from "vitest";

import { type FrameCutoutInput, frameCutoutMasks } from "./cutouts.js";

const masks = {
  noBorder: "noBorder.png",
  legendary: "legendary.png",
  extended: "extended.png",
};
const frameAssets = {
  base: {},
  planeswalker: {
    plus: "plus.png",
    minus: "minus.png",
    zero: "zero.png",
    separator: "separator.png",
    startingLoyalty: "loyalty.png",
    colorlessNicknameMasks: { regular: "regular.png", tall: "tall.png" },
  },
};

const cutouts = (input: Partial<FrameCutoutInput> = {}) =>
  frameCutoutMasks({
    masks,
    frameAssets,
    useNoBorder: false,
    isLegendary: false,
    hasNickname: false,
    frameColor: "w",
    isTallFrame: false,
    ...input,
  });

describe("frameCutoutMasks", () => {
  it("always cuts the extended-art silhouette a layout ships", () => {
    expect(cutouts()).toEqual(["extended.png"]);
  });

  it("cuts the border away only under No Border", () => {
    expect(cutouts({ useNoBorder: true })).toEqual([
      "noBorder.png",
      "extended.png",
    ]);
  });

  it("cuts the crown's space only on a legendary card", () => {
    expect(cutouts({ isLegendary: true })).toEqual([
      "legendary.png",
      "extended.png",
    ]);
  });

  // The renderer composites each cutout against the result of the last.
  it("keeps the renderer's order", () => {
    expect(
      cutouts({
        useNoBorder: true,
        isLegendary: true,
        hasNickname: true,
        frameColor: "c",
      }),
    ).toEqual(["noBorder.png", "legendary.png", "extended.png", "regular.png"]);
  });

  it("cuts the colorless nickname banner at the frame's own size", () => {
    const nicknamed = { hasNickname: true, frameColor: "c" } as const;
    expect(cutouts(nicknamed)).toContain("regular.png");
    expect(cutouts({ ...nicknamed, isTallFrame: true })).toContain("tall.png");
    expect(cutouts({ hasNickname: true })).toEqual(["extended.png"]);
    expect(cutouts({ frameColor: "c" })).toEqual(["extended.png"]);
  });

  it("skips masks the layout does not ship", () => {
    expect(
      cutouts({ masks: undefined, useNoBorder: true, isLegendary: true }),
    ).toEqual([]);
  });
});
