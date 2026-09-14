import { describe, expect, it } from "vitest";

import type { FrameAssets } from "../schema/frameAssets.js";
import {
  crownColors,
  decorationsFor,
  nicknameColors,
  ptBoxColor,
  resolveCrownAsset,
} from "./decorations.js";
import { type CardShape, frameDetailsFor } from "./frameLayers.js";

const colorsFor = (
  fn: typeof crownColors,
  shape: CardShape,
): ReturnType<typeof crownColors> => fn(frameDetailsFor(shape), shape);

describe("banner colours", () => {
  it("matches a mono card's colour", () => {
    expect(colorsFor(crownColors, { colors: ["u"] })).toBe("u");
  });

  it("splits a two-colour card into halves", () => {
    expect(colorsFor(crownColors, { colors: ["w", "u"] })).toEqual(["w", "u"]);
  });

  it("collapses three or more colours to gold", () => {
    expect(colorsFor(crownColors, { colors: ["w", "u", "b"] })).toBe("m");
  });

  // A colourless artifact's crown has to match its artifact pinlines.
  it("gives a colourless artifact the artifact banner", () => {
    expect(colorsFor(crownColors, { isArtifact: true })).toBe("a");
  });

  it("gives a colourless non-artifact the colourless banner", () => {
    expect(colorsFor(crownColors, { isColorless: true })).toBe("c");
  });

  // A land with no colour has its own nickname art, unlike its crown.
  it("gives a colourless land the land nickname banner", () => {
    expect(colorsFor(nicknameColors, { isLand: true })).toBe("l");
    expect(colorsFor(nicknameColors, { colors: ["g"], isLand: true })).toBe(
      "g",
    );
  });
});

describe("ptBoxColor", () => {
  const pt = (shape: CardShape) => ptBoxColor(frameDetailsFor(shape), shape);

  it("takes the card's colour when mono", () => {
    expect(pt({ colors: ["r"] })).toBe("r");
  });

  it("goes gold for two or more colours", () => {
    expect(pt({ colors: ["r", "g"] })).toBe("m");
  });

  // A true two-colour hybrid takes the colourless plate.
  it("goes colourless for a true hybrid", () => {
    expect(pt({ colors: ["r", "g"], isHybrid: true })).toBe("c");
  });

  it("uses the vehicle plate whatever the colour", () => {
    expect(pt({ colors: ["w"], isVehicle: true })).toBe("v");
    expect(pt({ isVehicle: true })).toBe("v");
  });

  it("uses the artifact plate for a colourless artifact", () => {
    expect(pt({ isArtifact: true })).toBe("a");
  });
});

describe("decorationsFor", () => {
  it("draws a crown and its bar only for a legendary card", () => {
    expect(decorationsFor({ isLegendary: true })).toMatchObject({
      crown: true,
      crownBlackBar: true,
    });
    expect(decorationsFor({})).toMatchObject({
      crown: false,
      crownBlackBar: false,
    });
  });

  it("draws a nickname plate only with nickname text", () => {
    expect(decorationsFor({ nickname: "The Fallen" }).nickname).toBe(true);
    expect(decorationsFor({ nickname: "" }).nickname).toBe(false);
    expect(decorationsFor({}).nickname).toBe(false);
  });

  // Half a stat line is not a creature, so it gets no plate.
  it("needs both power and toughness for a PT plate", () => {
    expect(decorationsFor({ power: "4", toughness: "4" }).ptBox).toBe(true);
    expect(decorationsFor({ power: "0", toughness: "0" }).ptBox).toBe(true);
    expect(decorationsFor({ power: "4" }).ptBox).toBe(false);
    expect(decorationsFor({ toughness: "4" }).ptBox).toBe(false);
  });
});

describe("resolveCrownAsset", () => {
  const assets: FrameAssets = {
    base: { w: "/w.png" },
    crown: {
      base: { w: "/crown.png" },
      nickname: { w: "/crown-nick.png" },
      ub: { w: "/crown-ub.png" },
    },
  };

  it("prefers the combined crown for a nicknamed card", () => {
    expect(
      resolveCrownAsset(assets, "w", { nickname: true, useUBCrowns: false }),
    ).toBe("/crown-nick.png");
  });

  it("takes the UB crown when that setting is on", () => {
    expect(
      resolveCrownAsset(assets, "w", { nickname: false, useUBCrowns: true }),
    ).toBe("/crown-ub.png");
  });

  // A frame with no combined art still gets a crown.
  it("falls back to the plain crown", () => {
    const plain: FrameAssets = {
      base: { w: "/w.png" },
      crown: { base: { w: "/c.png" } },
    };
    expect(
      resolveCrownAsset(plain, "w", { nickname: true, useUBCrowns: true }),
    ).toBe("/c.png");
  });
});
