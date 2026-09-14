import { describe, expect, it } from "vitest";

import {
  type CardShape,
  LAYERS,
  familyFor,
  frameDetailsFor,
  orderColors,
  selectFrameLayers,
  splitTwoColor,
} from "./frameLayers.js";

const details = (shape: CardShape) => frameDetailsFor(shape);
const layersFor = (shape: CardShape) =>
  selectFrameLayers(frameDetailsFor(shape), { family: familyFor(shape) });
const base = (shape: CardShape) => layersFor(shape).baseFrame;

describe("orderColors", () => {
  it("normalises to WUBRG regardless of input order", () => {
    expect(orderColors(["g", "w", "u"])).toBe("WUG");
    expect(orderColors(["u", "w"])).toBe("WU");
    expect(orderColors([])).toBe("");
  });
});

describe("frameDetailsFor", () => {
  it("keeps a mono-colour card that colour throughout", () => {
    expect(details({ colors: ["u"] })).toMatchObject({
      background: "U",
      pinlines: "U",
      twins: "U",
      identity: "U",
      isColorless: false,
      isHybrid: false,
    });
  });

  it("gives a two-colour gold card gold plates and split pinlines", () => {
    expect(details({ colors: ["w", "u"] })).toMatchObject({
      background: LAYERS.GOLD,
      pinlines: "WU",
      twins: LAYERS.GOLD,
    });
  });

  it("collapses three or more colours to gold pinlines", () => {
    expect(details({ colors: ["w", "u", "b"] })).toMatchObject({
      background: LAYERS.GOLD,
      pinlines: LAYERS.GOLD,
      twins: LAYERS.GOLD,
    });
  });

  // A coloured artifact keeps the Artifact body and carries its colour in the
  // pinlines — the case the `hasPinlineMask` fallback exists for.
  it("puts an artifact body under coloured pinlines", () => {
    expect(details({ colors: ["r"], isArtifact: true })).toMatchObject({
      background: LAYERS.ARTIFACT,
      pinlines: "R",
      twins: "R",
    });
  });

  it("gives a colourless artifact artifact pinlines and plates", () => {
    expect(details({ isArtifact: true })).toMatchObject({
      background: LAYERS.ARTIFACT,
      pinlines: LAYERS.ARTIFACT,
      twins: LAYERS.ARTIFACT,
    });
  });

  it("overrides the body for a vehicle but keeps its colour", () => {
    expect(details({ colors: ["w"], isVehicle: true })).toMatchObject({
      background: LAYERS.VEHICLE,
      pinlines: "W",
      twins: "W",
    });
  });

  // Devoid: coloured by identity, framed colourless. Multicolour devoid keeps
  // gold plates over the colourless body.
  it("frames a mono devoid card colourless while staying coloured", () => {
    expect(details({ colors: ["b"], isDevoid: true })).toMatchObject({
      identity: "B",
      pinlines: "B",
      isColorless: true,
    });
  });

  it("gives multicolour devoid gold plates", () => {
    expect(details({ colors: ["u", "r"], isDevoid: true })).toMatchObject({
      background: LAYERS.GOLD,
      twins: LAYERS.GOLD,
      isColorless: true,
    });
  });

  it("makes a truly colourless card colourless throughout", () => {
    expect(details({ isColorless: true })).toMatchObject({
      background: LAYERS.COLORLESS,
      pinlines: LAYERS.COLORLESS,
      twins: LAYERS.COLORLESS,
      isColorless: true,
    });
  });

  it("gives a hybrid pair land-coloured twins", () => {
    expect(details({ colors: ["w", "u"], isHybrid: true })).toMatchObject({
      pinlines: "WU",
      twins: LAYERS.LAND,
      isHybrid: true,
    });
  });

  // Hybrid is only meaningful for exactly two colours.
  it("ignores the hybrid flag outside two colours", () => {
    expect(details({ colors: ["w"], isHybrid: true }).isHybrid).toBe(false);
    expect(details({ colors: ["w", "u", "b"], isHybrid: true }).isHybrid).toBe(
      false,
    );
  });

  it("carries a land's colour in its identity, not its background", () => {
    expect(details({ colors: ["g"], isLand: true })).toMatchObject({
      background: LAYERS.LAND,
      identity: "G",
    });
  });
});

describe("selectFrameLayers", () => {
  it("renders a mono card as one base frame with no overlays", () => {
    const layers = layersFor({ colors: ["r"] });
    expect(layers.baseFrame).toEqual({ family: "base", color: "r" });
    expect(layers.overlays).toBeUndefined();
  });

  it("splits a two-colour gold card's pinlines and text box", () => {
    const layers = layersFor({ colors: ["w", "u"] });
    expect(layers.baseFrame).toEqual({ family: "base", color: "m" });
    expect(layers.overlays?.map((o) => [o.frame.color, o.mask])).toEqual([
      ["w", "pinlines"],
      ["u", "pinlines"],
      ["w", "rules"],
      ["u", "rules"],
    ]);
    // Only the right-hand colour is half-masked.
    expect(
      layers.overlays?.filter((o) => o.secondaryMask === "rightHalf"),
    ).toHaveLength(2);
  });

  it("renders a two-colour hybrid as two halves under a colourless wash", () => {
    const layers = layersFor({ colors: ["b", "g"], isHybrid: true });
    expect(layers.baseFrame).toEqual({ family: "base", color: "b" });
    expect(layers.overlays).toEqual([
      {
        frame: { family: "base", color: "g" },
        mask: "rightHalf",
        preserveAlpha: true,
      },
      {
        frame: { family: "base", color: "c2" },
        mask: "titleAndType",
        preserveAlpha: true,
      },
    ]);
  });

  it("honours a layout that only washes the title", () => {
    const layers = selectFrameLayers(
      frameDetailsFor({ colors: ["b", "g"], isHybrid: true }),
      { hybridTitleMask: "title" },
    );
    expect(layers.overlays?.[1]?.mask).toBe("title");
  });

  it("draws a land from the land family in its own colour", () => {
    expect(base({ colors: ["g"], isLand: true })).toEqual({
      family: "land",
      color: "g",
    });
  });

  // There is no colourless land in the land family; it lives in `base`.
  it("falls a colourless land back to the base family", () => {
    expect(base({ isLand: true })).toEqual({ family: "base", color: "l" });
  });

  it("draws an enchantment from the nyx family", () => {
    expect(base({ colors: ["w"], isEnchantment: true })).toEqual({
      family: "nyx",
      color: "w",
    });
  });

  // Nyx ships no vehicle art, so a nyx vehicle takes the artifact frame.
  it("substitutes artifact art for a nyx vehicle", () => {
    expect(
      base({ colors: ["w"], isVehicle: true, isEnchantment: true }),
    ).toEqual({
      family: "nyx",
      color: "a",
    });
  });

  it("keeps a coloured artifact on the artifact body by default", () => {
    expect(base({ colors: ["r"], isArtifact: true })).toEqual({
      family: "base",
      color: "a",
    });
  });

  // Without a pinlines mask the colour overlay can never draw, so the base
  // falls back to the colour rather than losing it.
  it("falls a coloured artifact back to its colour with no pinlines mask", () => {
    const layers = selectFrameLayers(
      frameDetailsFor({ colors: ["r"], isArtifact: true }),
      { hasPinlineMask: false },
    );
    expect(layers.baseFrame).toEqual({ family: "base", color: "r" });
  });
});

describe("splitTwoColor", () => {
  it("splits a two-colour combo", () => {
    expect(splitTwoColor("WU")).toEqual(["w", "u"]);
  });

  it("rejects anything that is not two colour letters", () => {
    for (const value of ["W", "WUB", "Gold", "Artifact", ""]) {
      expect(splitTwoColor(value)).toBeNull();
    }
  });
});

describe("familyFor", () => {
  it("prefers nyx over land for an enchantment land", () => {
    expect(familyFor({ isLand: true, isEnchantment: true })).toBe("nyx");
  });

  it("uses land when nyx borders are off", () => {
    expect(familyFor({ isLand: true, isEnchantment: true }, false)).toBe(
      "land",
    );
  });
});
