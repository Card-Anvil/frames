import { describe, expect, it } from "vitest";

import { opacityStopsFrom } from "./opacityStops.js";

describe("opacityStopsFrom", () => {
  it("samples the curve at evenly spaced stops", () => {
    expect(opacityStopsFrom((t) => t / 2, 3)).toEqual([
      { at: 0, opacity: 0 },
      { at: 0.5, opacity: 0.25 },
      { at: 1, opacity: 0.5 },
    ]);
  });

  it("clamps the curve to 0–1", () => {
    expect(opacityStopsFrom((t) => t * 3 - 1, 2)).toEqual([
      { at: 0, opacity: 0 },
      { at: 1, opacity: 1 },
    ]);
  });

  it("takes at least two stops", () => {
    expect(opacityStopsFrom(() => 1, 1)).toHaveLength(2);
  });
});
