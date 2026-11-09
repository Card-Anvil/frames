import { describe, expect, it } from "vitest";

import type { PowerToughnessRow } from "../schema/frame.js";
import { powerToughnessRow } from "./powerToughnessRow.js";

const row: PowerToughnessRow = { right: 2900, gap: 20, spacing: 60 };

describe("powerToughnessRow", () => {
  it("lays the row out leftward from its right edge", () => {
    expect(
      powerToughnessRow(row, {
        power: 70,
        toughness: 70,
        powerSymbol: 110,
        toughnessSymbol: 100,
      }),
    ).toEqual({
      toughness: 2830,
      toughnessSymbol: 2810,
      // 2810 - 100 (symbol) - 60 (spacing) - 70 (power)
      power: 2580,
      powerSymbol: 2560,
    });
  });

  it("moves everything left of a wider number", () => {
    const one = powerToughnessRow(row, { power: 70, toughness: 70 });
    const three = powerToughnessRow(row, { power: 210, toughness: 210 });
    expect(three.toughness).toBe(one.toughness - 140);
    expect(three.toughnessSymbol).toBe(one.toughnessSymbol - 140);
    expect(three.power).toBe(one.power - 280);
    expect(three.powerSymbol).toBe(one.powerSymbol - 280);
  });

  it("keeps the gap with no symbols", () => {
    expect(powerToughnessRow(row, { power: 70, toughness: 70 })).toEqual({
      toughness: 2830,
      toughnessSymbol: 2810,
      power: 2680,
      powerSymbol: 2660,
    });
  });
});
