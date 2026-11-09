import { describe, expect, it } from "vitest";

import type { Gradient, TintedImage } from "../schema/paint.js";
import { type FrameDetails, frameDetailsFor } from "./frameLayers.js";
import {
  cardColorParts,
  gradientOffsetY,
  gradientStops,
  paintedFor,
  tintColor,
} from "./paint.js";

const details = (overrides: Partial<FrameDetails>): FrameDetails => ({
  background: "",
  pinlines: "",
  twins: "",
  identity: "",
  isColorless: false,
  isHybrid: false,
  ...overrides,
});

const palette = {
  w: "#fff7d6",
  u: "#26c7ff",
  b: "#b164ff",
  r: "#f13e35",
  g: "#1cf4a6",
  m: "#ffdf8a",
  a: "#c0fffa",
  c: "#c0fffa",
  l: "#d9c272",
  v: "#6f533d",
} as const;

describe("cardColorParts", () => {
  it("paints a mono-color card its color", () => {
    expect(cardColorParts(frameDetailsFor({ colors: ["r"] }), 3)).toEqual([
      "r",
    ]);
  });

  it("splits a two-color card in printed order, up to maxParts", () => {
    const selesnya = details({ pinlines: "GW", identity: "WG" });
    expect(cardColorParts(selesnya, 2)).toEqual(["g", "w"]);
    expect(cardColorParts(selesnya, 1)).toEqual(["m"]);
  });

  it("takes a three-color card's colors from its identity", () => {
    const naya = frameDetailsFor({ colors: ["r", "g", "w"] });
    expect(naya.pinlines).toBe("Gold");
    expect(cardColorParts(naya, 3)).toEqual(["r", "g", "w"]);
    expect(cardColorParts(naya, 2)).toEqual(["m"]);
  });

  it("paints four or more colors gold", () => {
    expect(
      cardColorParts(frameDetailsFor({ colors: ["w", "u", "b", "r"] }), 3),
    ).toEqual(["m"]);
  });

  it("maps artifact, colorless, land and vehicle pinlines to their tokens", () => {
    expect(cardColorParts(details({ pinlines: "Artifact" }), 3)).toEqual(["a"]);
    expect(cardColorParts(details({ pinlines: "Colorless" }), 3)).toEqual([
      "c",
    ]);
    expect(cardColorParts(details({ pinlines: "Land" }), 3)).toEqual(["l"]);
  });
});

describe("gradientStops", () => {
  const fade: Gradient = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    color: "#000000",
    opacity: [
      { at: 0, opacity: 0 },
      { at: 1, opacity: 0.5 },
    ],
  };

  it("draws a fixed color at each opacity stop", () => {
    expect(gradientStops(fade, details({}))).toEqual([
      { at: 0, color: "rgba(0, 0, 0, 0)" },
      { at: 1, color: "rgba(0, 0, 0, 0.5)" },
    ]);
  });

  const hairline: Gradient = {
    x: 0,
    y: 0,
    width: 1000,
    height: 9,
    direction: "horizontal",
    color: { palette, maxParts: 3, blend: 100 },
    opacity: [
      { at: 0, opacity: 1 },
      { at: 1, opacity: 1 },
    ],
  };

  it("splits the card's colors along the gradient, blended where they meet", () => {
    const stops = gradientStops(
      hairline,
      details({ pinlines: "BR", identity: "BR" }),
    );
    expect(stops).toEqual([
      { at: 0, color: "rgba(177, 100, 255, 1)" },
      { at: 0.45, color: "rgba(177, 100, 255, 1)" },
      { at: 0.55, color: "rgba(241, 62, 53, 1)" },
      { at: 1, color: "rgba(241, 62, 53, 1)" },
    ]);
  });

  it("merges the opacity stops in between the color stops", () => {
    const stops = gradientStops(
      {
        ...hairline,
        opacity: [
          { at: 0, opacity: 0 },
          { at: 0.5, opacity: 1 },
          { at: 1, opacity: 0 },
        ],
      },
      details({ pinlines: "BR", identity: "BR" }),
    );
    expect(stops?.map(({ at }) => at)).toEqual([0, 0.45, 0.5, 0.55, 1]);
    // Halfway through the blend, halfway between the two colors.
    expect(stops?.[2]?.color).toBe("rgba(209, 81, 154, 1)");
  });

  it("paints nothing when the palette has no color for the card", () => {
    expect(
      gradientStops(
        { ...hairline, color: { palette: { w: "#ffffff" } } },
        details({ pinlines: "U" }),
      ),
    ).toBeUndefined();
  });
});

describe("tintColor", () => {
  const sword: TintedImage = {
    src: "sword.svg",
    x: 0,
    y: 0,
    color: { palette, maxParts: 2, part: 0 },
  };
  const shield: TintedImage = {
    ...sword,
    color: { palette, maxParts: 2, part: 1 },
  };

  it("picks the card's color for its part", () => {
    const rakdos = details({ pinlines: "BR", identity: "BR" });
    expect(tintColor(sword, rakdos)).toBe(palette.b);
    expect(tintColor(shield, rakdos)).toBe(palette.r);
  });

  it("paints a card with fewer colors its last", () => {
    expect(tintColor(shield, details({ pinlines: "G" }))).toBe(palette.g);
  });

  it("takes a fixed color as it is", () => {
    expect(tintColor({ ...sword, color: "#123456" }, details({}))).toBe(
      "#123456",
    );
  });
});

describe("paintedFor", () => {
  const symbol = (set: string): TintedImage => ({
    src: `${set}.svg`,
    x: 0,
    y: 0,
    color: "#ffffff",
    when: { settings: { ptSymbols: set } },
  });
  const always: Gradient = {
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    color: "#000000",
    opacity: [
      { at: 0, opacity: 0 },
      { at: 1, opacity: 1 },
    ],
  };
  const layout = {
    gradients: [always, { ...always, when: { frameColor: "l" as const } }],
    tintedImages: [symbol("Trix"), symbol("Portal")],
  };

  it("keeps what the setting in effect picks", () => {
    const painted = paintedFor(layout, {
      border: "default",
      settings: { ptSymbols: "Portal" },
    });
    expect(painted.tintedImages.map(({ src }) => src)).toEqual(["Portal.svg"]);
  });

  it("keeps what has no condition, and drops what does not hold", () => {
    const painted = paintedFor(layout, {
      border: "default",
      settings: {},
      frameColor: "w",
    });
    expect(painted.gradients).toEqual([always]);
    expect(painted.tintedImages).toEqual([]);
  });

  it("leaves a layout without them alone", () => {
    expect(paintedFor({}, { border: "default", settings: {} })).toEqual({});
  });
});

describe("gradientOffsetY", () => {
  const rule: Gradient = {
    x: 0,
    y: 120,
    width: 10,
    height: 9,
    color: "#000000",
    opacity: [
      { at: 0, opacity: 0 },
      { at: 1, opacity: 1 },
    ],
  };
  const box = (y: number) => ({ x: 0, y, width: 10, height: 10, fontSize: 70 });
  const boxes = {
    art: { x: 0, y: 0, width: 10, height: 10 },
    mana: box(2544),
    title: box(2729),
    type: box(2885),
    setSymbol: { x: 0, y: 2880, width: 10, height: 10 },
  };

  it("moves an anchored gradient to its box, slid or not", () => {
    const anchored = { ...rule, anchor: "type" as const };
    expect(gradientOffsetY(anchored, boxes, 148)).toBe(2885);
    expect(gradientOffsetY({ ...anchored, slides: true }, boxes, 148)).toBe(
      2885,
    );
    expect(gradientOffsetY({ ...rule, anchor: "mana" }, boxes, 0)).toBe(2544);
  });

  it("moves an unanchored gradient only when it slides", () => {
    expect(gradientOffsetY(rule, boxes, 148)).toBe(0);
    expect(gradientOffsetY({ ...rule, slides: true }, boxes, 148)).toBe(148);
  });
});
