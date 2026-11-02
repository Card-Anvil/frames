import { describe, expect, it } from "vitest";

import type { CardBoxes, RulesSlide } from "../schema/frame.js";
import { rulesSlideOffset, slideBoxes } from "./rulesSlide.js";

const slide: RulesSlide = {
  padding: 90,
  step: 150,
  maxSteps: 4,
  boxes: ["mana", "title", "type"],
};

describe("rulesSlideOffset", () => {
  it("moves by whole steps of the room the text leaves", () => {
    // 1000 - 400 - 90 = 510 of room: three steps.
    expect(rulesSlideOffset(slide, 1000, 400)).toBe(450);
  });

  it("never moves more than maxSteps", () => {
    expect(rulesSlideOffset(slide, 1000, 0)).toBe(600);
  });

  it("does not move text that fills the box", () => {
    expect(rulesSlideOffset(slide, 1000, 900)).toBe(0);
    expect(rulesSlideOffset(slide, 1000, 1200)).toBe(0);
  });
});

describe("slideBoxes", () => {
  const box = (y: number) => ({
    x: 0,
    y,
    width: 100,
    height: 50,
    fontSize: 10,
  });
  const boxes: CardBoxes = {
    art: { x: 0, y: 0, width: 100, height: 100 },
    mana: box(100),
    title: box(200),
    type: box(300),
    setSymbol: { x: 0, y: 300, width: 10, height: 10 },
    rules: { ...box(400), height: 600 },
    pt: box(1100),
  };

  it("moves the listed boxes and the rules box's top", () => {
    const slid = slideBoxes(boxes, slide, 150);
    expect(slid.mana.y).toBe(250);
    expect(slid.title.y).toBe(350);
    expect(slid.type.y).toBe(450);
    expect(slid.rules).toMatchObject({ y: 550, height: 450 });
  });

  it("leaves everything else where it was", () => {
    const slid = slideBoxes(boxes, slide, 150);
    expect(slid.setSymbol).toBe(boxes.setSymbol);
    expect(slid.pt).toBe(boxes.pt);
    expect(slid.art).toBe(boxes.art);
  });

  it("returns the same boxes when nothing moves", () => {
    expect(slideBoxes(boxes, slide, 0)).toBe(boxes);
  });
});
