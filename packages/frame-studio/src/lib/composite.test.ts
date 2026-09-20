import { describe, expect, it } from "vitest";

import type { FramePayload, FrameSlot } from "../api/types.js";
import { composite } from "./composite.js";

const slot = (kind: FrameSlot["kind"], key: string): FrameSlot => ({
  key,
  kind,
  required: false,
  variant: null,
  layout: "normal",
  path: ["config", "layouts", "normal", key],
});

const boxSlot = slot("boxes", "boxes");
const assetSlot = slot("assets", "frameAssets");
const maskSlot = slot("masks", "masks");

const payload = (overrides: Record<string, unknown> = {}): FramePayload => ({
  slug: "fixture",
  id: "com.example.fixture",
  name: "Fixture",
  revision: 1,
  canvas: { width: 3264, height: 4440 },
  slots: [boxSlot, assetSlot, maskSlot],
  sourceFiles: [],
  problems: [],
  stale: false,
  frame: {
    config: {
      layouts: {
        normal: {
          boxes: { ptImage: { x: 2441, y: 3847 } },
          frameAssets: {
            base: {
              w: "/w.png",
              u: "/u.png",
              b: "/b.png",
              g: "/g.png",
              m: "/m.png",
              a: "/a.png",
              c: "/c.png",
            },
            // `crown.base` is a colour set, like the other banner families.
            crown: { base: { w: "/crown.png" } },
            black: "/black.png",
            nickname: { w: "/nickname.png" },
            pt: { w: "/pt.png" },
          },
          masks: {
            pinlines: "/pinlines.png",
            rules: "/rules.png",
            titleAndType: "/twins.png",
            rightHalf: "/rightHalf.png",
          },
          crownConfig: { x: 192, y: 220 },
          nicknameConfig: { x: 378, y: 577 },
          ...overrides,
        },
      },
    },
  },
});

const run = (
  shape: Parameters<typeof composite>[0]["shape"],
  card: Parameters<typeof composite>[0]["card"] = {},
  overrides: Record<string, unknown> = {},
  settings: {
    useNyxInsert?: boolean;
    useUBCrowns?: boolean;
    borderColor?: string;
    useNoBorder?: boolean;
    useFullBorder?: boolean;
  } = {},
) =>
  composite({
    payload: payload(overrides),
    assetSlot,
    maskSlot,
    boxSlot,
    shape,
    card,
    useNyxBorder: true,
    useNyxInsert: settings.useNyxInsert ?? false,
    useUBCrowns: settings.useUBCrowns ?? false,
    borderColor: settings.borderColor ?? null,
    useNoBorder: settings.useNoBorder ?? false,
    useFullBorder: settings.useFullBorder ?? false,
    inspectMasks: new Set(),
  });

describe("frame body", () => {
  it("draws a mono card as a single centred base frame", () => {
    const { layers } = run({ colors: ["w"] });
    expect(layers).toHaveLength(1);
    expect(layers[0]?.url).toBe("/w.png");
    expect(layers[0]?.placement).toEqual({ kind: "center" });
  });

  it("gives a two-colour gold card split pinlines over a gold base", () => {
    const { layers } = run({ colors: ["w", "u"] });
    expect(layers[0]?.url).toBe("/m.png");
    expect(layers.slice(1).map((l) => [l.url, l.maskUrl])).toEqual([
      ["/w.png", "/pinlines.png"],
      ["/u.png", "/pinlines.png"],
      ["/w.png", "/rules.png"],
      ["/u.png", "/rules.png"],
    ]);
    // Only the right-hand colour carries the half mask.
    expect(layers.filter((l) => l.secondaryMaskUrl !== undefined)).toHaveLength(
      2,
    );
  });

  it("renders a hybrid pair as two halves under a colourless wash", () => {
    const { layers } = run({ colors: ["w", "u"], isHybrid: true });
    expect(layers.map((l) => l.url)).toEqual(["/w.png", "/u.png", "/c.png"]);
    expect(layers[1]?.maskUrl).toBe("/rightHalf.png");
    expect(layers[2]?.maskUrl).toBe("/twins.png");
  });

  it("keeps a coloured artifact on the artifact body", () => {
    expect(run({ colors: ["r"], isArtifact: true }).layers[0]?.url).toBe(
      "/a.png",
    );
  });

  // A frame with no gold art cannot draw the two-colour base the selection
  // asked for. The overlays were composed for that base, so the renderer drops
  // them rather than layering them onto the wrong frame — and so does this.
  it("drops overlays when the base frame falls back, and says so", () => {
    const result = run(
      { colors: ["w", "u"] },
      {},
      {
        frameAssets: {
          base: { w: "/w.png", u: "/u.png", c: "/c.png" },
        },
      },
    );
    expect(result.layers).toHaveLength(1);
    expect(result.layers[0]?.url).toBe("/w.png");
    expect(result.fallbackNote).toContain("overlays dropped");
    expect(result.fallbackNote).toContain('base "m"');
  });

  it("reports no fallback when the art is all there", () => {
    expect(run({ colors: ["w", "u"] }).fallbackNote).toBeUndefined();
  });

  it("skips an overlay whose mask the layout does not ship", () => {
    const { layers } = run(
      { colors: ["w", "u"] },
      {},
      {
        masks: { rightHalf: "/rightHalf.png" },
      },
    );
    // No pinlines/rules/twins masks, so only the base survives.
    expect(layers).toHaveLength(1);
  });
});

describe("decorations are derived from the card", () => {
  // The renderer draws a crown only on legendary cards; so does this.
  it("draws no crown on a card that is not legendary", () => {
    const { layers } = run({ colors: ["w"] });
    expect(layers.some((layer) => layer.id.startsWith("crown"))).toBe(false);
  });

  it("draws a colour-matched crown on a legendary card", () => {
    const { layers } = run({ colors: ["w"], isLegendary: true });
    const crown = layers.find((layer) => layer.id.startsWith("crown"));
    expect(crown?.url).toBe("/crown.png");
    // The bug this guards: a crown centred on the sheet lands mid-card.
    expect(crown?.placement).toEqual({ kind: "at", at: { x: 192, y: 220 } });
  });

  it("draws the crown's black bar with the crown", () => {
    const { layers } = run({ colors: ["w"], isLegendary: true });
    expect(layers.find((layer) => layer.id === "black")?.placement).toEqual({
      kind: "at",
      at: { x: 220, y: 200 },
    });
  });

  it("needs nickname text before it draws a nickname plate", () => {
    expect(
      run({ colors: ["w"] }).layers.some((l) => l.id.startsWith("nickname")),
    ).toBe(false);
    const named = run({ colors: ["w"] }, { nickname: "The Fallen" });
    expect(named.layers.find((l) => l.id === "nickname.w")?.placement).toEqual({
      kind: "at",
      at: { x: 378, y: 577 },
    });
  });

  // A PT plate means the card is a creature, which needs both halves.
  it("needs both power and toughness before it draws a PT plate", () => {
    const hasPt = (card: Parameters<typeof run>[1]) =>
      run({ colors: ["w"] }, card).layers.some((l) => l.id.startsWith("pt."));
    expect(hasPt({ power: "4", toughness: "4" })).toBe(true);
    expect(hasPt({ power: "4" })).toBe(false);
    expect(hasPt({ toughness: "4" })).toBe(false);
    expect(hasPt({})).toBe(false);
  });

  it("colour-matches the PT plate to the card", () => {
    const { layers } = run({ colors: ["w"] }, { power: "4", toughness: "4" });
    expect(layers.find((l) => l.id.startsWith("pt."))?.id).toBe("pt.w");
  });

  // Vehicles take the dedicated plate whatever colour they are.
  it("gives a vehicle the vehicle PT plate", () => {
    const { layers } = run(
      { colors: ["w"], isVehicle: true },
      { power: "4", toughness: "4" },
      {
        frameAssets: {
          base: { w: "/w.png" },
          pt: { w: "/pt.png", v: "/ptv.png" },
        },
      },
    );
    expect(layers.find((l) => l.id.startsWith("pt."))?.id).toBe("pt.v");
  });

  it("splits a two-colour crown into both halves", () => {
    const { layers } = run(
      { colors: ["w", "u"], isLegendary: true },
      {},
      {
        frameAssets: {
          base: { w: "/w.png", u: "/u.png", m: "/m.png" },
          crown: { base: { w: "/crown-w.png", u: "/crown-u.png" } },
        },
      },
    );
    expect(
      layers.filter((l) => l.id.startsWith("crown")).map((l) => l.url),
    ).toEqual(["/crown-w.png", "/crown-u.png"]);
  });

  it("adds the nyx insert only when the setting is on", () => {
    const assets = {
      base: { w: "/w.png" },
      crown: { base: { w: "/crown.png" }, nyxInsert: { w: "/insert.png" } },
    };
    const off = run(
      { colors: ["w"], isLegendary: true },
      {},
      { frameAssets: assets },
    );
    expect(off.layers.some((l) => l.id.includes("nyxInsert"))).toBe(false);

    const on = run(
      { colors: ["w"], isLegendary: true },
      {},
      { frameAssets: assets },
      { useNyxInsert: true },
    );
    const insert = on.layers.find((l) => l.id.includes("nyxInsert"));
    expect(insert?.url).toBe("/insert.png");
    expect(insert?.placement).toEqual({ kind: "at", at: { x: 611, y: 222 } });
  });

  // A frame whose crown art already carries the nickname needs no plate.
  it("skips the nickname plate when the crown includes it", () => {
    const { layers } = run(
      { colors: ["w"], isLegendary: true },
      { nickname: "The Fallen" },
      {
        frameAssets: {
          base: { w: "/w.png" },
          crown: {
            base: { w: "/crown.png" },
            nickname: { w: "/crown-nick.png" },
          },
          nickname: { w: "/nickname.png" },
        },
      },
    );
    expect(layers.find((l) => l.id.startsWith("crown"))?.url).toBe(
      "/crown-nick.png",
    );
    expect(layers.some((l) => l.id.startsWith("nickname"))).toBe(false);
  });

  it("moves the crown when the card is nicknamed", () => {
    const { layers } = run(
      { colors: ["w"], isLegendary: true },
      { nickname: "The Fallen" },
      {
        crownConfig: {
          x: 192,
          y: 220,
          nicknameCrownX: 210,
          nicknameCrownY: 90,
        },
      },
    );
    expect(layers.find((l) => l.id.startsWith("crown"))?.placement).toEqual({
      kind: "at",
      at: { x: 210, y: 90 },
    });
  });
});

describe("the frame body and what is drawn over it", () => {
  it("keeps the base and overlays apart from the decorations", () => {
    const { layers } = run(
      { colors: ["w", "u"], isLegendary: true },
      { power: "4", toughness: "4" },
    );
    const parts = layers.map((layer) => layer.part);
    expect(parts.slice(0, 5)).toEqual(Array(5).fill("frame"));
    expect(parts.slice(5).every((part) => part === "decoration")).toBe(true);
  });
});

describe("border settings", () => {
  const borderMasks = {
    masks: {
      border: "/border.png",
      borderFull: "/borderFull.png",
      noBorder: "/noBorder.png",
      legendary: "/legendary.png",
    },
  };

  it("cuts nothing from a plain card", () => {
    expect(run({ colors: ["w"] }, {}, borderMasks).frameCutoutUrls).toEqual([]);
  });

  // The same cutouts, in the same order, as `frameCutoutMasks` gives Card Anvil.
  it("cuts the frame body the way the renderer does", () => {
    const result = run({ colors: ["w"], isLegendary: true }, {}, borderMasks, {
      useNoBorder: true,
    });
    expect(result.frameCutoutUrls).toEqual(["/noBorder.png", "/legendary.png"]);
  });

  it("recolors the ring only once a border color is picked", () => {
    expect(run({ colors: ["w"] }, {}, borderMasks).ring).toBeUndefined();
    expect(
      run({ colors: ["w"] }, {}, borderMasks, { borderColor: "#ffffff" }).ring,
    ).toEqual({ maskUrl: "/border.png", color: "#ffffff" });
  });

  it("recolors the whole ring under Color Entire Border", () => {
    const result = run({ colors: ["w"] }, {}, borderMasks, {
      borderColor: "#ffffff",
      useFullBorder: true,
    });
    expect(result.ring?.maskUrl).toBe("/borderFull.png");
  });

  it("has no ring to recolor on a layout without a ring mask", () => {
    expect(
      run({ colors: ["w"] }, {}, {}, { borderColor: "#ffffff" }).ring,
    ).toBeUndefined();
  });

  // The strip is its own art over the frame, so the ring recolor misses it;
  // the renderer recolors it separately, even where there is no ring mask.
  it("paints the crown's black strip the border color", () => {
    const strip = (settings: Parameters<typeof run>[3]) =>
      run({ colors: ["w"], isLegendary: true }, {}, {}, settings).layers.find(
        (layer) => layer.id === "black",
      );
    expect(strip({})?.recolor).toBeUndefined();
    expect(strip({ borderColor: "#ffffff" })?.recolor).toBe("#ffffff");
  });
});

describe("inspection masks", () => {
  it("returns the switched-on masks as cutouts", () => {
    const result = composite({
      payload: payload(),
      assetSlot,
      maskSlot,
      boxSlot,
      shape: { colors: ["w"] },
      card: {},
      useNyxBorder: true,
      useNyxInsert: false,
      useUBCrowns: false,
      borderColor: null,
      useNoBorder: false,
      useFullBorder: false,
      inspectMasks: new Set(["pinlines", "nope"]),
    });
    expect(result.cutoutUrls).toEqual(["/pinlines.png"]);
  });
});
