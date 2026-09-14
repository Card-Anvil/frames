import { describe, expect, it } from "vitest";

import {
  CROWN_BLACK_BAR,
  DEFAULT_PT_IMAGE,
  placeAsset,
  placementOrigin,
} from "./assetPlacement.js";

const CANVAS = { width: 3264, height: 4440 };

describe("placeAsset", () => {
  it("centres full-sheet frame art", () => {
    for (const family of ["base", "land", "nyx", "tall", "creature"]) {
      expect(placeAsset(`${family}.w`)).toEqual({ kind: "center" });
    }
  });

  // The bug this exists to prevent: a crown centred on the sheet lands in the
  // middle of the card instead of along its top edge.
  it("places a crown from the layout's crown config", () => {
    expect(placeAsset("crown.base")).toEqual({
      kind: "at",
      at: { x: 192, y: 220 },
    });
    expect(
      placeAsset("crown.base", { crownConfig: { x: 300, y: 40 } }),
    ).toEqual({ kind: "at", at: { x: 300, y: 40 } });
  });

  it("moves the crown when the card has a nickname", () => {
    const crownConfig = {
      x: 192,
      y: 220,
      nicknameCrownX: 210,
      nicknameCrownY: 90,
    };
    expect(
      placeAsset("crown.nickname", { crownConfig, hasNickname: true }),
    ).toEqual({
      kind: "at",
      at: { x: 210, y: 90 },
    });
    // Without a nickname the plain position still applies.
    expect(placeAsset("crown.base", { crownConfig })).toEqual({
      kind: "at",
      at: { x: 192, y: 220 },
    });
  });

  it("tucks the nyx insert just inside its crown", () => {
    const placement = placeAsset("crown.nyxInsert", {
      crownConfig: { x: 192, y: 220 },
    });
    expect(placement).toEqual({ kind: "at", at: { x: 611, y: 222 } });
  });

  it("honours explicit nyx insert coordinates", () => {
    expect(
      placeAsset("crown.nyxInsert", {
        crownConfig: { x: 192, y: 220, nyxInsertX: 700, nyxInsertY: 250 },
      }),
    ).toEqual({ kind: "at", at: { x: 700, y: 250 } });
  });

  it("places a nickname plate from the nickname config", () => {
    expect(placeAsset("nickname.w")).toEqual({
      kind: "at",
      at: { x: 378, y: 577 },
    });
    expect(
      placeAsset("nickname.w", { nicknameConfig: { x: 10, y: 20 } }),
    ).toEqual({ kind: "at", at: { x: 10, y: 20 } });
  });

  it("places the PT plate from ptImage", () => {
    expect(placeAsset("pt.w")).toEqual({ kind: "at", at: DEFAULT_PT_IMAGE });
    expect(placeAsset("pt.w", { ptImage: { x: 1, y: 2 } })).toEqual({
      kind: "at",
      at: { x: 1, y: 2 },
    });
  });

  it("places the crown black bar at its fixed point", () => {
    expect(placeAsset("black")).toEqual({
      kind: "at",
      at: { x: CROWN_BLACK_BAR.x, y: CROWN_BLACK_BAR.y },
    });
  });

  // These are laid out from measurements a static preview does not have.
  it("reports dynamically placed families rather than guessing", () => {
    for (const family of ["planeswalker", "saga", "flipside"]) {
      const placement = placeAsset(`${family}.plus`);
      expect(placement.kind).toBe("dynamic");
      expect(placement.kind === "dynamic" && placement.reason).toBeTruthy();
    }
  });
});

describe("placementOrigin", () => {
  const image = { width: 3264, height: 4440 };

  it("centres by the image's own size", () => {
    expect(placementOrigin({ kind: "center" }, image, CANVAS)).toEqual({
      x: 0,
      y: 0,
    });
    expect(
      placementOrigin({ kind: "center" }, { width: 264, height: 440 }, CANVAS),
    ).toEqual({ x: 1500, y: 2000 });
  });

  it("passes a fixed point through", () => {
    expect(
      placementOrigin({ kind: "at", at: { x: 7, y: 9 } }, image, CANVAS),
    ).toEqual({ x: 7, y: 9 });
  });

  it("has no origin for a dynamic placement", () => {
    expect(
      placementOrigin({ kind: "dynamic", reason: "x" }, image, CANVAS),
    ).toBeUndefined();
  });
});
