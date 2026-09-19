import { describe, expect, it } from "vitest";

import { getReadableTextColor, parseNormalizedCssColor } from "./color.js";

describe("parseNormalizedCssColor", () => {
  it("parses 6-digit hex", () => {
    expect(parseNormalizedCssColor("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses 3-digit hex", () => {
    expect(parseNormalizedCssColor("#f00")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses 8-digit hex (ignoring alpha)", () => {
    expect(parseNormalizedCssColor("#ff000080")).toEqual({
      r: 255,
      g: 0,
      b: 0,
    });
  });

  it("parses rgb()", () => {
    expect(parseNormalizedCssColor("rgb(0, 128, 255)")).toEqual({
      r: 0,
      g: 128,
      b: 255,
    });
  });

  it("parses rgba()", () => {
    expect(parseNormalizedCssColor("rgba(10, 20, 30, 0.5)")).toEqual({
      r: 10,
      g: 20,
      b: 30,
    });
  });

  it("parses modern space-separated rgb()", () => {
    expect(parseNormalizedCssColor("rgb(10 20 30)")).toEqual({
      r: 10,
      g: 20,
      b: 30,
    });
  });

  it("returns undefined for unrecognized input", () => {
    expect(parseNormalizedCssColor("not-a-color")).toBeUndefined();
  });
});

describe("getReadableTextColor", () => {
  it("picks white text on black", () => {
    expect(getReadableTextColor({ r: 0, g: 0, b: 0 })).toBe("white");
  });

  it("picks black text on white", () => {
    expect(getReadableTextColor({ r: 255, g: 255, b: 255 })).toBe("black");
  });

  it("picks black text on gold (light)", () => {
    expect(getReadableTextColor({ r: 212, g: 175, b: 55 })).toBe("black");
  });

  it("picks black text on silver", () => {
    expect(getReadableTextColor({ r: 192, g: 192, b: 192 })).toBe("black");
  });
});
