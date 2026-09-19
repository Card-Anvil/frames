import { describe, expect, it } from "vitest";

import type { CardBoxes, LayoutConfig, TextBox } from "../schema/frame.js";
import {
  onBorderTextOverrides,
  withCollectorInfoDefaults,
} from "./layoutDefaults.js";

const bounds = { x: 0, y: 0, width: 10, height: 10 };
const text = { ...bounds, fontSize: 12 } satisfies TextBox;
const boxes: CardBoxes = {
  art: bounds,
  mana: text,
  title: text,
  type: text,
  setSymbol: bounds,
};
const layout: LayoutConfig = {
  boxes,
  backBoxes: boxes,
  frameAssets: { base: {} },
};
const collectorBounds = { ...bounds, fontSize: 50, color: "white" };

describe("withCollectorInfoDefaults", () => {
  it("fills in collector info that sits on the border ring", () => {
    const config = withCollectorInfoDefaults(layout, collectorBounds);
    const expected = { ...collectorBounds, overrides: onBorderTextOverrides };
    expect(config.boxes.collectorInfo).toEqual(expected);
    expect(config.backBoxes?.collectorInfo).toEqual(expected);
  });

  it("keeps the overrides the bounds bring, including none", () => {
    const own = [
      { when: { border: "dark" }, style: { color: "red" } },
    ] satisfies TextBox["overrides"];
    expect(
      withCollectorInfoDefaults(layout, { ...collectorBounds, overrides: own })
        .boxes.collectorInfo?.overrides,
    ).toBe(own);
    expect(
      withCollectorInfoDefaults(layout, { ...collectorBounds, overrides: [] })
        .boxes.collectorInfo?.overrides,
    ).toEqual([]);
  });

  it("leaves a collector box the layout defines as written", () => {
    const collectorInfo = { ...text, color: "black" };
    const config = withCollectorInfoDefaults(
      { ...layout, boxes: { ...boxes, collectorInfo } },
      collectorBounds,
    );
    expect(config.boxes.collectorInfo).toBe(collectorInfo);
  });
});
