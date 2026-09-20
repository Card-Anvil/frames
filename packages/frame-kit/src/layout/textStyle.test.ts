import { describe, expect, it } from "vitest";

import {
  TEXT_SHADOW_COLOR,
  textOutlineFor,
  textShadowFor,
} from "./textStyle.js";

const text = { fontSize: 100 };

describe("textOutlineFor", () => {
  it("needs both a color and a width", () => {
    expect(textOutlineFor({ ...text, outlineColor: "black" })).toBeUndefined();
    expect(textOutlineFor({ ...text, outlineWidth: 19 })).toBeUndefined();
    expect(
      textOutlineFor({ ...text, outlineColor: "black", outlineWidth: 19 }),
    ).toEqual({ color: "black", width: 19 });
  });
});

describe("textShadowFor", () => {
  it("draws no shadow unless the box asks for one", () => {
    expect(textShadowFor(text)).toBeUndefined();
    expect(textShadowFor({ ...text, shadow: false })).toBeUndefined();
  });

  it("derives the offsets from the font size", () => {
    const shadow = textShadowFor({ ...text, shadow: true });
    expect(shadow?.color).toBe(TEXT_SHADOW_COLOR);
    expect(shadow?.offsetX).toBeCloseTo(-2.9);
    expect(shadow?.offsetY).toBeCloseTo(7.5);
  });

  it("takes the box's own offsets over the derived ones", () => {
    expect(
      textShadowFor({
        ...text,
        shadow: true,
        shadowOffsetX: 4,
        shadowOffsetY: 6,
      }),
    ).toMatchObject({ offsetX: 4, offsetY: 6 });
  });

  it("gives way to an outline", () => {
    expect(
      textShadowFor({
        ...text,
        shadow: true,
        outlineColor: "black",
        outlineWidth: 19,
      }),
    ).toBeUndefined();
  });
});
