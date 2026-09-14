import { describe, expect, it } from "vitest";

import { CARD_INSET, snapBounds } from "./snapping.js";

const CANVAS = { width: 3264, height: 4440 };
const box = (x: number, y: number, width = 100, height = 50) => ({
  x,
  y,
  width,
  height,
});

describe("snapBounds", () => {
  it("catches the card-face edge", () => {
    const { bounds, guides } = snapBounds(
      box(CARD_INSET + 5, 1000),
      CANVAS,
      [],
    );
    expect(bounds.x).toBe(CARD_INSET);
    expect(guides).toContainEqual({ axis: "x", at: CARD_INSET });
  });

  it("catches the canvas centre with the box's own centre", () => {
    const width = 400;
    const { bounds } = snapBounds(
      box(CANVAS.width / 2 - width / 2 + 6, 1000, width),
      CANVAS,
      [],
    );
    expect(bounds.x + width / 2).toBe(CANVAS.width / 2);
  });

  it("aligns to a sibling's edge", () => {
    const sibling = box(800, 2000);
    const { bounds } = snapBounds(box(806, 3000), CANVAS, [sibling]);
    expect(bounds.x).toBe(800);
  });

  it("leaves a box alone when nothing is near", () => {
    const free = box(717, 1234);
    expect(snapBounds(free, CANVAS, []).bounds).toEqual(free);
    expect(snapBounds(free, CANVAS, []).guides).toEqual([]);
  });

  // Snapping must never resize: a drag keeps the box's dimensions, and the
  // transformer handles resizing on its own.
  it("never changes width or height", () => {
    const original = box(CARD_INSET + 3, CARD_INSET + 4, 321, 123);
    const { bounds } = snapBounds(original, CANVAS, []);
    expect(bounds.width).toBe(original.width);
    expect(bounds.height).toBe(original.height);
  });

  it("snaps each axis independently", () => {
    const { bounds } = snapBounds(box(CARD_INSET + 2, 1777), CANVAS, []);
    expect(bounds.x).toBe(CARD_INSET);
    expect(bounds.y).toBe(1777);
  });

  it("rounds to whole pixels", () => {
    const { bounds } = snapBounds(box(140.4, 1000.6), CANVAS, []);
    expect(Number.isInteger(bounds.x)).toBe(true);
  });
});
