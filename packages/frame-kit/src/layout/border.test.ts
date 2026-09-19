import { describe, expect, it } from "vitest";

import { borderStateFor, ringMaskFor } from "./border.js";

const ring = { border: "border.png" };
const partialRing = { border: "border.png", borderFull: "borderFull.png" };

describe("ringMaskFor", () => {
  it("recolors through the plain border mask by default", () => {
    expect(ringMaskFor(partialRing, false)).toBe("border.png");
  });

  it("swaps in the full ring under Color Entire Border", () => {
    expect(ringMaskFor(partialRing, true)).toBe("borderFull.png");
  });

  it("keeps a lone border mask whatever the setting says", () => {
    expect(ringMaskFor(ring, true)).toBe("border.png");
  });

  it("has nothing to recolor through without a ring mask", () => {
    expect(ringMaskFor(undefined, false)).toBeUndefined();
    expect(
      ringMaskFor({ borderFull: "borderFull.png" }, false),
    ).toBeUndefined();
  });
});

describe("borderStateFor", () => {
  it("names the border color's tone once it recolors the ring", () => {
    const input = { masks: ring, useNoBorder: false, useFullBorder: false };
    expect(borderStateFor({ ...input, borderColor: "#ffffff" })).toBe("light");
    expect(borderStateFor({ ...input, borderColor: "#000000" })).toBe("dark");
  });

  it("stays default without a border color", () => {
    expect(
      borderStateFor({
        borderColor: null,
        masks: ring,
        useNoBorder: false,
        useFullBorder: false,
      }),
    ).toBe("default");
  });

  // Frames with no ring mask — M15 planeswalkers, Borderless sagas — draw their
  // border exactly as shipped whatever color is picked.
  it("stays default when there is no ring mask to recolor", () => {
    const input = { borderColor: "#ffffff", useNoBorder: false };
    expect(
      borderStateFor({ ...input, masks: undefined, useFullBorder: false }),
    ).toBe("default");
    expect(
      borderStateFor({
        ...input,
        masks: { borderFull: "borderFull.png" },
        useFullBorder: false,
      }),
    ).toBe("default");
  });

  it("recolors with either ring mask when the frame ships both", () => {
    const input = { borderColor: "#ffffff", useNoBorder: false };
    expect(
      borderStateFor({ ...input, masks: partialRing, useFullBorder: false }),
    ).toBe("light");
    expect(
      borderStateFor({ ...input, masks: partialRing, useFullBorder: true }),
    ).toBe("light");
  });

  it("is none once a noBorder mask cuts the ring away, whatever the color", () => {
    expect(
      borderStateFor({
        borderColor: "#ffffff",
        masks: { ...ring, noBorder: "noBorder.png" },
        useNoBorder: true,
        useFullBorder: false,
      }),
    ).toBe("none");
  });

  it("ignores No Border on a layout with nothing to cut it away", () => {
    expect(
      borderStateFor({
        borderColor: "#ffffff",
        masks: ring,
        useNoBorder: true,
        useFullBorder: false,
      }),
    ).toBe("light");
  });

  it("stays default for a color it cannot read", () => {
    expect(
      borderStateFor({
        borderColor: "rebeccapurple",
        masks: ring,
        useNoBorder: false,
        useFullBorder: false,
      }),
    ).toBe("default");
  });
});
