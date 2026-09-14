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
            crown: { base: "/crown.png" },
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
  extras: string[] = [],
  overrides: Record<string, unknown> = {},
) =>
  composite({
    payload: payload(overrides),
    assetSlot,
    maskSlot,
    boxSlot,
    shape,
    useNyxBorder: true,
    extras: new Set(extras),
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
    const result = run({ colors: ["w", "u"] }, [], {
      frameAssets: {
        base: { w: "/w.png", u: "/u.png", c: "/c.png" },
      },
    });
    expect(result.layers).toHaveLength(1);
    expect(result.layers[0]?.url).toBe("/w.png");
    expect(result.fallbackNote).toContain("overlays dropped");
    expect(result.fallbackNote).toContain('base "m"');
  });

  it("reports no fallback when the art is all there", () => {
    expect(run({ colors: ["w", "u"] }).fallbackNote).toBeUndefined();
  });

  it("skips an overlay whose mask the layout does not ship", () => {
    const { layers } = run({ colors: ["w", "u"] }, [], {
      masks: { rightHalf: "/rightHalf.png" },
    });
    // No pinlines/rules/twins masks, so only the base survives.
    expect(layers).toHaveLength(1);
  });
});

describe("decoration placement", () => {
  // The bug this guards: a crown drawn centred lands in the middle of the card
  // instead of along its top edge.
  it("places a crown from the layout's crown config, not centred", () => {
    const { layers } = run({ colors: ["w"] }, ["crown.base"]);
    const crown = layers.find((layer) => layer.id === "crown.base");
    expect(crown?.placement).toEqual({ kind: "at", at: { x: 192, y: 220 } });
  });

  it("places a nickname plate from the nickname config", () => {
    const { layers } = run({ colors: ["w"] }, ["nickname.w"]);
    expect(layers.find((l) => l.id === "nickname.w")?.placement).toEqual({
      kind: "at",
      at: { x: 378, y: 577 },
    });
  });

  it("places the PT plate from the box set's ptImage", () => {
    const { layers } = run({ colors: ["w"] }, ["pt.w"]);
    expect(layers.find((l) => l.id === "pt.w")?.placement).toEqual({
      kind: "at",
      at: { x: 2441, y: 3847 },
    });
  });

  it("moves the crown when a nickname plate is also on", () => {
    const { layers } = run({ colors: ["w"] }, ["crown.base", "nickname.w"], {
      crownConfig: { x: 192, y: 220, nicknameCrownX: 210, nicknameCrownY: 90 },
    });
    expect(layers.find((l) => l.id === "crown.base")?.placement).toEqual({
      kind: "at",
      at: { x: 210, y: 90 },
    });
  });

  it("ignores a decoration the frame does not ship", () => {
    const { layers } = run({ colors: ["w"] }, ["nickname.zzz"]);
    expect(layers.every((layer) => layer.id !== "nickname.zzz")).toBe(true);
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
      useNyxBorder: true,
      extras: new Set(),
      inspectMasks: new Set(["pinlines", "nope"]),
    });
    expect(result.cutoutUrls).toEqual(["/pinlines.png"]);
  });
});
